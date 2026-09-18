/**
 * Campaign runner: arms x tasks x runs, unattended and resumable.
 *
 *   node evals/harness/run.mjs --campaign <name>
 *       [--config evals/eval.config.json] [--scorer <path>] [--agent <adapter module>]
 *       [--results-dir evals/results] [--runs-dir evals/runs]
 *       [--max-slots N] [--sleep-cap-ms N] [--dry-run]
 *
 * Before the first slot: the API-key guard, then the selftest (`selftest.mjs`);
 * the runner refuses to start on either. Then, slot by slot, in a seeded,
 * interleaved schedule recorded in the manifest:
 *
 *   sandbox → launch → classify → (discard + sleep + retry | score in a new
 *   process → append to runs.jsonl) → cleanup
 *
 * - A usage-limit (or auth) stop is discarded unscored to `discarded.jsonl`,
 *   the runner sleeps until the reported reset or backs off and probes, then
 *   retries the SAME slot, so interleaving survives a limit. Blocked for more
 *   than `limits.wakeAfterBlockedHours`, or told of a reset beyond it: wake.
 * - Infrastructure failures (API overload/5xx/network, a session that died
 *   before the agent's first turn, a sandbox that would not build, a CLI that
 *   will not report its version) are discarded and retried the same way on a
 *   short backoff, and never finalize a slot: an outage must not burn the
 *   schedule on records the report excludes. Past
 *   `limits.wakeAfterInfraHours` of nothing else: wake.
 * - A run whose transcript shows reads outside the sandbox is recorded with
 *   `contaminated: true, final: false` and re-run once; the retry's record
 *   supersedes it (see report.mjs, "which record counts").
 * - A run that hits its own turn, wall or token cap is a normal, scored,
 *   final record: a failure class, never retried.
 * - Every slot finished is one appended line, so killing the runner loses at
 *   most the slot in flight; a restart resumes at the first unfinished slot
 *   and refuses to continue if the campaign's identity (arms, tasks, model,
 *   harness files, scorer, schedule) changed underneath it.
 *
 * `STATUS.json` is rewritten at every step:
 *   { state: "running"|"sleeping-limit"|"sleeping-window"|"done"|"wake", completed, total, wakeReasons, ... }
 *
 * Exit codes: 0 done, 10 wake the owner (reasons in STATUS.json and stderr),
 * 2 usage or configuration error, 1 an unexpected crash (safe to restart:
 * the runner resumes). Wake reasons: isolation leak detected, API key present,
 * usage limit blocking > N h, selftest failure, infrastructure failing > N h,
 * pilot gate failed twice after task replacement (a campaign with `retryOf`).
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { billingEnvViolations } from "./agents/claude-code.mjs";
import { INFRA_KINDS, RETRY_KINDS, sleepPlan } from "./limits.mjs";
import { parseJsonl, writeReport } from "./report.mjs";
import {
  ConfigError,
  detectLeak,
  hashTaskDir,
  isolationProbe,
  loadAdapter,
  loadConfig,
  probeOptions,
  resolveArms,
  resolveFromRepo,
  runScorer,
  runSelftest,
  selectTasks,
} from "./selftest.mjs";
import {
  EVALS_DIR,
  HARNESS_DIR,
  REPO_ROOT,
  copyAgentFiles,
  createSandbox,
  defaultSandboxRoot,
  findEnclosingRepo,
  isInside,
  toBashPath,
  harnessGitState,
  listAgentFiles,
  readJson,
  readJsonOr,
  removeClaudeProjectDir,
  removeDir,
  sha256,
  sha256File,
  writeJson,
} from "./sandbox.mjs";

export const EXIT = { DONE: 0, CRASH: 1, USAGE: 2, WAKE: 10 };
const HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/** mulberry32: a small seeded PRNG. Only the schedule uses it; never Math.random. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Interleaved schedule. Rounds by run index (every task gets run 0 before
 * any gets run 1, so drift over the campaign lands on every task alike);
 * task order shuffled per round; arm order shuffled within each
 * (task, runIndex) block. Deterministic in (tasks, arms, runsPerTask, seed).
 */
export function buildSchedule({ tasks, arms, runsPerTask, seed }) {
  if (!Number.isInteger(seed)) throw new ConfigError(`scheduleSeed must be an integer; got ${seed}`);
  const rng = makeRng(seed);
  const slots = [];
  let block = 0;
  for (let runIndex = 0; runIndex < runsPerTask; runIndex++) {
    for (const task of shuffle([...tasks].sort(), rng)) {
      for (const arm of shuffle(arms, rng)) {
        slots.push({ slotIndex: slots.length, slotId: `r${runIndex}.${task}.${arm}`, runIndex, task, arm, block });
      }
      block++;
    }
  }
  return slots;
}

/** Slot ids whose last record is final. */
export function finishedSlots(records) {
  const last = new Map();
  for (const r of records) last.set(r.slotId, r);
  return new Set([...last.values()].filter((r) => r.final !== false).map((r) => r.slotId));
}

/** Index of the first schedule slot not finished, or -1. */
export function firstUnfinished(schedule, records) {
  const done = finishedSlots(records);
  return schedule.findIndex((s) => !done.has(s.slotId));
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

/** ms until the window opens (0 when open). `window` is "always" or { start: "HH:MM", end: "HH:MM" } local. */
export function msUntilWindow(window, now = new Date()) {
  if (!window || window === "always") return 0;
  const parse = (s) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? "");
    if (!m) throw new ConfigError(`window times must be "HH:MM"; got ${JSON.stringify(s)}`);
    return +m[1] * 60 + +m[2];
  };
  const start = parse(window.start);
  const end = parse(window.end);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = start <= end ? cur >= start && cur < end : cur >= start || cur < end;
  if (open) return 0;
  let wait = start - cur;
  if (wait <= 0) wait += 24 * 60;
  return wait * 60_000 - now.getSeconds() * 1000;
}

// ---------------------------------------------------------------------------
// Identity and records
// ---------------------------------------------------------------------------

function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (filter(full)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Hash of the code that decides a run's record: harness modules, scorer,
 * evals/lib. Not report.mjs (it only reads records, and a report fix must not
 * strand a running campaign) and not pack.mjs (tarballs are pinned by hash).
 */
export function harnessCodeHash({ scorer, adapterPath }) {
  const notIdentity = new Set(["report.mjs", "pack.mjs"].map((f) => join(HARNESS_DIR, f)));
  const files = [
    ...listFiles(HARNESS_DIR, (f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs") && !f.startsWith(join(HARNESS_DIR, "fixtures")) && !notIdentity.has(f)),
    ...listFiles(join(EVALS_DIR, "lib"), (f) => f.endsWith(".mjs")),
    scorer,
    adapterPath,
  ].filter((f, i, a) => existsSync(f) && a.indexOf(f) === i);
  const entries = files.sort().map((f) => [relative(REPO_ROOT, f).replace(/\\/g, "/"), sha256File(f)]);
  return { sha256: sha256(JSON.stringify(entries)), files: Object.fromEntries(entries) };
}

function identityParts(m) {
  return {
    model: m.model,
    effort: m.effort ?? null,
    arms: m.arms.map((a) => [a.label, a.sha256]),
    tasks: m.tasks.map((t) => [t.id, t.sha256]),
    runsPerTask: m.runsPerTask,
    scheduleSeed: m.scheduleSeed,
    harness: m.harnessCode.sha256,
    prompt: m.promptSha256,
    budgets: m.caps,
    sandboxRoot: m.sandboxRoot ?? null,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

class Wake extends Error {
  constructor(reasons, detail) {
    super(`wake the owner: ${reasons.join("; ")}${detail ? ` (${detail})` : ""}`);
    this.reasons = reasons;
    this.detail = detail;
  }
}

function parseArgs(argv) {
  const get = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    campaign: get("--campaign"),
    config: get("--config"),
    scorer: get("--scorer"),
    agent: get("--agent"),
    resultsDir: get("--results-dir"),
    runsDir: get("--runs-dir"),
    maxSlots: get("--max-slots") ? Number(get("--max-slots")) : Infinity,
    sleepCapMs: get("--sleep-cap-ms") ? Number(get("--sleep-cap-ms")) : Infinity,
    dryRun: argv.includes("--dry-run"),
    forceProbe: argv.includes("--force-probe"),
  };
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}

/** Process start time (epoch ms) on Windows, or null. */
function processStartMs(pid) {
  if (process.platform !== "win32") return null;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${Number(pid)} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`], { encoding: "utf8", windowsHide: true, timeout: 30_000 });
  const t = Date.parse(String(r.stdout ?? "").trim());
  return Number.isFinite(t) ? t : null;
}

/** Whether `pid` is still the process that started at `startedAtIso` (unknowable off Windows: assume yes). */
function sameProcess(pid, startedAtIso) {
  if (process.platform !== "win32") return true;
  const started = processStartMs(pid);
  if (started === null) return true; // cannot tell: refuse rather than run two runners
  if (!startedAtIso) return false;
  return Math.abs(started - Date.parse(startedAtIso)) <= 10_000;
}

/**
 * Kill an agent session a crashed runner left behind — only if the pid still
 * belongs to THAT process. Windows reuses pids, and the owner's own
 * interactive Claude Code is a process with the same image name.
 */
function killStaleChild(lock, log) {
  const pid = lock?.childPid;
  if (!pid || !pidAlive(pid)) return;
  if (process.platform === "win32") {
    const started = processStartMs(pid);
    if (started === null || !lock.childStartedAt || Math.abs(started - Date.parse(lock.childStartedAt)) > 10_000) {
      log(`pid ${pid} from the old lock is alive but is not the session the lock recorded; leaving it alone`);
      return;
    }
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
  log(`killed a stale agent process ${pid} left by a previous runner`);
}

/**
 * Fill the prompt template's working-directory placeholders: `{{cwd}}` (the
 * native absolute path) and `{{cwdBash}}` (its Git Bash spelling). An agent
 * that does not know where it is guesses (`cd /tmp`), and a guess outside the
 * sandbox reads as contamination.
 */
export function renderPrompt(template, dir) {
  return String(template).replaceAll("{{cwd}}", resolve(dir)).replaceAll("{{cwdBash}}", toBashPath(dir));
}

/** The contamination guard: over the last `window` finished attempts, more than `max` contaminated trips it. */
export function contaminationRate(records, limits = {}) {
  const window = limits.contaminationRateWindow ?? 6;
  const max = limits.contaminationRateMax ?? 0.5;
  const recent = records.filter((r) => r.outcome !== undefined || r.contaminated !== undefined).slice(-window);
  const hits = recent.filter((r) => r.contaminated);
  return { window, max, contaminated: hits.length, tripped: recent.length >= window && hits.length / window > max, slots: hits.map((r) => `${r.slotId}#${r.attempt}`) };
}

/**
 * The sandbox root must be a dedicated directory: not inside the OS temp dir
 * (the orchestrator's scratchpad lives there), the home directory, or a git
 * repository. Tests may opt out of the first two with
 * PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT=1.
 */
export function checkSandboxRoot(root) {
  const repo = findEnclosingRepo(root);
  if (repo) throw new ConfigError(`sandboxRoot ${root} is inside the git repository ${repo}; point it at a dedicated directory such as ${defaultSandboxRoot()}`);
  if (process.env.PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT === "1") return;
  for (const [what, dir] of [["the OS temp dir", tmpdir()], ["the home directory", homedir()]]) {
    if (isInside(root, dir)) throw new ConfigError(`sandboxRoot ${root} is inside ${what} (${dir}), which holds files an agent must not find; use a dedicated directory such as ${defaultSandboxRoot()}`);
  }
}

export async function runCampaign(argv, { log = (m) => console.error(`[run ${new Date().toISOString()}] ${m}`) } = {}) {
  const args = parseArgs(argv);
  if (!args.campaign) {
    console.error("usage: node evals/harness/run.mjs --campaign <name> [--config F] [--scorer F] [--agent F] [--max-slots N] [--sleep-cap-ms N] [--dry-run]");
    return EXIT.USAGE;
  }
  let config;
  let campaignDir;
  let statusPath;
  let status = { state: "running", completed: 0, total: 0, wakeReasons: [] };
  const writeStatus = (patch = {}) => {
    status = { ...status, ...patch, updatedAt: new Date().toISOString(), pid: process.pid };
    if (statusPath) writeJson(statusPath, status);
  };
  let lockPath;
  try {
    const resultsDir = resolve(args.resultsDir ?? join(EVALS_DIR, "results"));
    campaignDir = join(resultsDir, args.campaign);
    statusPath = join(campaignDir, "STATUS.json");
    const previous = readJsonOr(statusPath, null);
    if (previous) status = { ...previous, wakeReasons: [], wakeDetail: null };

    // The billing guard runs before anything else can go wrong or be read.
    const billingFirst = billingEnvViolations(process.env);
    if (billingFirst.length) {
      mkdirSync(campaignDir, { recursive: true });
      throw new Wake(["API key present"], `${billingFirst.join(", ")} set in the runner's environment`);
    }

    config = loadConfig(resolve(args.config ?? join(EVALS_DIR, "eval.config.json")), args.campaign);
    const scorer = resolve(args.scorer ?? resolveFromRepo(config.scorer ?? "evals/harness/score.mjs"));
    const adapterPath = resolve(args.agent ?? resolveFromRepo(config.agent ?? "evals/harness/agents/claude-code.mjs"));
    const runsRoot = resolve(args.runsDir ?? join(EVALS_DIR, "runs"));
    const runsDir = join(runsRoot, args.campaign);
    const runsPath = join(campaignDir, "runs.jsonl");
    const discardedPath = join(campaignDir, "discarded.jsonl");
    const manifestPath = join(campaignDir, "manifest.json");
    lockPath = join(campaignDir, ".lock.json");

    const adapter = await loadAdapter(adapterPath);
    mkdirSync(campaignDir, { recursive: true });
    const billing = adapter.billingEnvViolations(process.env);
    if (billing.length) throw new Wake(["API key present"], `${billing.join(", ")} set in the runner's environment`);

    if (!existsSync(scorer)) throw new ConfigError(`scorer not found: ${scorer} (pass --scorer to use another)`);
    const arms = resolveArms(config);
    const { tasks } = selectTasks(config);
    if (!tasks.length) throw new ConfigError(`campaign "${args.campaign}" selects no tasks`);
    let reserveTasks = [];
    try {
      reserveTasks = selectTasks({ ...config, expectTaskCount: undefined, tasks: { ...(config.tasks ?? {}), include: "reserve" } }).tasks.map((t) => t.id);
    } catch {
      /* explicit task lists name no reserve */
    }
    const runsPerTask = config.runsPerTask;
    if (!Number.isInteger(runsPerTask) || runsPerTask < 1) throw new ConfigError(`runsPerTask must be a positive integer; got ${runsPerTask}`);
    const schedule = buildSchedule({ tasks: tasks.map((t) => t.id), arms: arms.map((a) => a.label), runsPerTask, seed: config.scheduleSeed });
    const sandboxRoot = resolveFromRepo(config.sandboxRoot ?? defaultSandboxRoot());
    checkSandboxRoot(sandboxRoot);
    const prompt = config.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) throw new ConfigError(`${config.configPath}: "prompt" must be a non-empty string`);
    const graphFile = config.graphFile ?? "graph.json";

    if (args.dryRun) {
      console.log(JSON.stringify({ campaign: args.campaign, arms: arms.map((a) => ({ label: a.label, tarball: a.tarball, sha256: a.sha256 })), tasks: tasks.map((t) => t.id), reserveTasks, schedule }, null, 2));
      return EXIT.DONE;
    }

    // One runner per campaign.
    if (existsSync(lockPath)) {
      const lock = readJsonOr(lockPath, {}); // a torn lock is no lock
      if (lock.pid !== process.pid && pidAlive(lock.pid) && sameProcess(lock.pid, lock.processStartedAt)) {
        throw new ConfigError(`another runner (pid ${lock.pid}) holds ${lockPath}`);
      }
      killStaleChild(lock, log);
    }
    const lockBase = { pid: process.pid, processStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString() };
    writeJson(lockPath, lockBase);

    let claudeVersion;
    try {
      claudeVersion = adapter.cliVersion();
    } catch (err) {
      claudeVersion = null;
      log(`agent CLI version unavailable at start (${err.message}); retried before the first slot`);
    }
    const taskEntries = tasks.map((t) => {
      const h = hashTaskDir(t.dir);
      return { id: t.id, tier: t.task.tier, reserve: t.task.reserve === true, source: t.dir.startsWith(resolve(REPO_ROOT)) ? relative(REPO_ROOT, t.dir).replace(/\\/g, "/") : "private", sha256: h.sha256, files: h.files, budgets: t.task.budgets };
    });
    const fresh = {
      campaign: args.campaign,
      createdAt: new Date().toISOString(),
      model: config.model,
      effort: config.effort ?? null,
      agent: adapter.id ?? relative(REPO_ROOT, adapterPath),
      claudeVersion,
      arms: arms.map((a) => ({ label: a.label, tarball: a.tarball.replace(/\\/g, "/"), sha256: a.sha256, manifest: a.manifest })),
      tasks: taskEntries,
      reserveTasks,
      retryOf: config.retryOf ?? null,
      runsPerTask,
      scheduleSeed: config.scheduleSeed,
      schedule,
      caps: config.caps ?? {},
      limits: config.limits ?? {},
      window: config.window ?? "always",
      gate: config.gate ?? null,
      prompt,
      promptSha256: sha256(prompt),
      graphFile,
      sandboxRoot: sandboxRoot.replace(/\\/g, "/"),
      harnessGit: harnessGitState(),
      harnessCode: harnessCodeHash({ scorer, adapterPath }),
      configPath: relative(REPO_ROOT, config.configPath).replace(/\\/g, "/"),
    };
    let manifest;
    if (existsSync(manifestPath)) {
      manifest = readJson(manifestPath);
      const was = identityParts(manifest);
      const now = identityParts(fresh);
      const diffs = Object.keys(now).filter((k) => JSON.stringify(was[k]) !== JSON.stringify(now[k]));
      if (diffs.length) {
        throw new ConfigError(`campaign "${args.campaign}" changed since it started (${diffs.join(", ")}); a campaign cannot change mid-run. Start a new campaign name, or restore the recorded inputs.`);
      }
    } else {
      manifest = fresh;
      writeJson(manifestPath, manifest);
    }

    for (const p of [runsPath, discardedPath]) {
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8");
      if (text.length && !text.endsWith("\n")) {
        const keep = text.slice(0, text.lastIndexOf("\n") + 1);
        writeFileSync(`${p}.torn-${Date.now()}`, text.slice(keep.length));
        writeFileSync(p, keep);
        log(`${p}: removed a torn final line left by a crash (kept beside it as .torn-*)`);
      }
    }
    const readRecords = () => (existsSync(runsPath) ? parseJsonl(readFileSync(runsPath, "utf8"), { tolerant: true, onSkip: (n) => log(`runs.jsonl line ${n} is not JSON; ignored`) }) : []);
    const readDiscarded = () => (existsSync(discardedPath) ? parseJsonl(readFileSync(discardedPath, "utf8"), { tolerant: true }) : []);
    const completedCount = () => finishedSlots(readRecords()).size;

    // Two clocks survive restarts in STATUS.json: time blocked by the usage
    // limit, and time during which nothing but infrastructure errors happened.
    // Each is cleared only by a session that actually ran.
    let blockedSince = previous?.blockedSince ? Date.parse(previous.blockedSince) : null;
    let infraSince = previous?.infraSince ? Date.parse(previous.infraSince) : null;
    let blockAttempt = 0;
    let infraAttempt = 0;
    const wakeAfterMs = (config.limits?.wakeAfterBlockedHours ?? 48) * HOUR;
    const infraWakeMs = (config.limits?.wakeAfterInfraHours ?? 12) * HOUR;
    const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
    writeStatus({ state: "running", campaign: args.campaign, completed: completedCount(), total: schedule.length, sleepUntil: null, blockedSince: iso(blockedSince), infraSince: iso(infraSince) });

    const sleep = async (ms, patch) => {
      const capped = Math.min(ms, args.sleepCapMs);
      const until = Date.now() + capped;
      writeStatus({ ...patch, sleepUntil: new Date(Date.now() + ms).toISOString() });
      while (Date.now() < until) await new Promise((r) => setTimeout(r, Math.min(60_000, Math.max(0, until - Date.now()))));
      writeStatus({ state: "running", sleepUntil: null });
    };

    /** Sleep through a limit or infrastructure failure, waking the owner when it has lasted too long. */
    const sleepThrough = async (classification, what) => {
      if (INFRA_KINDS.has(classification.kind)) {
        infraSince = infraSince ?? Date.now();
        writeStatus({ infraSince: iso(infraSince) });
        if (Date.now() - infraSince > infraWakeMs) {
          throw new Wake([`infrastructure failing > ${config.limits?.wakeAfterInfraHours ?? 12} h`], `since ${iso(infraSince)}: ${what}: ${classification.kind} ${classification.evidence}`);
        }
        const plan = sleepPlan(classification, infraAttempt++, {});
        log(`${what}: ${classification.kind} (${String(classification.evidence).slice(0, 200)}); sleeping ${Math.round(plan.sleepMs / 60_000)} min`);
        await sleep(plan.sleepMs, { state: "running", lastInfra: classification });
        return;
      }
      // A limit answer proves the API and the CLI are reachable: the outage clock stops.
      infraSince = null;
      infraAttempt = 0;
      blockedSince = blockedSince ?? Date.now();
      writeStatus({ blockedSince: iso(blockedSince) });
      const reset = classification.resetAt ? Date.parse(classification.resetAt) : NaN;
      if (Date.now() - blockedSince > wakeAfterMs || (Number.isFinite(reset) && reset - blockedSince > wakeAfterMs)) {
        throw new Wake([`usage limit blocking > ${config.limits?.wakeAfterBlockedHours ?? 48} h`], `blocked since ${iso(blockedSince)}${Number.isFinite(reset) ? `, reset reported for ${classification.resetAt}` : ""}: ${classification.kind} ${classification.evidence}`);
      }
      const plan = sleepPlan(classification, blockAttempt++, { maxSleepMs: wakeAfterMs });
      log(`${what}: ${classification.kind} (${String(classification.evidence).slice(0, 200)}); sleeping ${Math.round(plan.sleepMs / 60_000)} min — ${plan.reason}`);
      await sleep(plan.sleepMs, { state: "sleeping-limit", lastLimit: classification });
      // Without a reported reset time, a one-turn probe decides when to spend a real run again.
      if (plan.probe) {
        const jail = join(sandboxRoot, `pcg-eval-limitprobe-${process.pid}`);
        mkdirSync(join(jail, "project"), { recursive: true });
        let pr;
        try {
          pr = await adapter.launch({ cwd: join(jail, "project"), prompt: "Reply with the single word OK.", model: config.model, budgets: { turns: 1, wallMinutes: 3 }, tools: [], transcriptPath: join(runsDir, "_limit-probe", `${Date.now()}.jsonl`) });
        } catch (err) {
          if (err?.name === "BillingEnvError") throw new Wake(["API key present"], err.message);
          pr = { classification: { kind: "cli-error", evidence: `limit probe launch: ${err.message}` } };
        } finally {
          removeDir(jail);
          removeClaudeProjectDir(join(jail, "project"));
        }
        const kind = pr.classification?.kind;
        if (RETRY_KINDS.has(kind)) await sleepThrough(pr.classification, "limit probe");
      }
    };
    const sessionRan = () => {
      blockedSince = null;
      infraSince = null;
      blockAttempt = 0;
      infraAttempt = 0;
      writeStatus({ blockedSince: null, infraSince: null });
    };
    const probeOpts = { ...probeOptions(config, arms), sandboxRoot, adapter, runsDir: runsRoot, log };

    // Selftest gates the start: tasks, scoring and lint once, then the
    // isolation probe, which a limit or an outage may have to wait for.
    log("selftest");
    const st = await runSelftest({ config, scorer, adapterPath, runsDir: runsRoot, probe: false, log });
    if (!st.ok) {
      writeJson(join(campaignDir, "selftest.json"), { at: new Date().toISOString(), ok: false, problems: st.problems });
      throw new Wake(st.wake.length ? st.wake : ["selftest failure"], st.problems.join(" | "));
    }
    let probedVersion = null;
    const ensureProbed = async () => {
      for (;;) {
        let version;
        try {
          version = adapter.cliVersion();
        } catch (err) {
          await sleepThrough({ kind: "cli-error", evidence: err.message }, "agent CLI version");
          continue;
        }
        if (version === probedVersion) return version;
        let probe;
        try {
          probe = await isolationProbe({ ...probeOpts, force: args.forceProbe && probedVersion === null });
        } catch (err) {
          if (err?.name === "BillingEnvError") throw new Wake(["API key present"], err.message);
          await sleepThrough({ kind: "cli-error", evidence: `isolation probe: ${err.message}` }, "isolation probe");
          continue;
        }
        writeJson(join(campaignDir, "selftest.json"), { at: new Date().toISOString(), ok: probe.ok, problems: probe.problems, version, probe: { cached: probe.cached, key: probe.key, at: probe.at, cleanHits: probe.clean?.hits, controlHitCount: probe.control?.hits?.length ?? null }, limited: probe.limited ?? null });
        if (probe.limited) {
          await sleepThrough(probe.limited, "isolation probe");
          continue;
        }
        if (!probe.ok) throw new Wake([probe.problems.some((p) => p.startsWith("isolation leak")) ? "isolation leak detected" : "selftest failure"], probe.problems.join(" | "));
        if (!manifest.claudeVersion) {
          manifest.claudeVersion = version; // first known version, when the start-up call failed
          writeJson(manifestPath, manifest);
        }
        if (probedVersion !== null) log(`agent CLI version changed ${probedVersion} → ${version}; isolation re-probed clean`);
        probedVersion = version;
        return version;
      }
    };

    let slotsRun = 0;
    const armBy = new Map(arms.map((a) => [a.label, a]));
    const taskBy = new Map(tasks.map((t) => [t.id, t]));

    for (;;) {
      const records = readRecords();
      const idx = firstUnfinished(schedule, records);
      if (idx < 0) break;
      if (slotsRun >= args.maxSlots) {
        log(`--max-slots ${args.maxSlots} reached; stopping with ${completedCount()}/${schedule.length} done`);
        writeStatus({ state: "running", completed: completedCount(), note: "stopped at --max-slots" });
        return EXIT.DONE;
      }
      const slot = schedule[idx];
      const arm = armBy.get(slot.arm);
      const task = taskBy.get(slot.task);

      const waitWindow = msUntilWindow(config.window ?? "always");
      if (waitWindow > 0) {
        await sleep(waitWindow, { state: "sleeping-window" });
        continue;
      }
      const bill = adapter.billingEnvViolations(process.env);
      if (bill.length) throw new Wake(["API key present"], bill.join(", "));
      const version = await ensureProbed();

      const priorAttempts = records.filter((r) => r.slotId === slot.slotId).length + readDiscarded().filter((r) => r.slotId === slot.slotId).length;
      const attempt = priorAttempts + 1;
      const attemptDir = join(runsDir, `${slot.slotId}-a${attempt}`);
      rmSync(attemptDir, { recursive: true, force: true });
      mkdirSync(attemptDir, { recursive: true });
      writeStatus({ state: "running", currentSlot: slot.slotId, attempt, completed: completedCount() });
      log(`slot ${slot.slotIndex + 1}/${schedule.length} ${slot.slotId} attempt ${attempt}`);

      // A task's own budgets REPLACE the campaign caps, and the campaign may
      // in turn override a task's, by id, in `taskBudgets`. That last hop
      // exists because the held-out tasks live in another repository: a budget
      // that has to change for THIS campaign is set where the campaign is
      // defined, and is visible in the public config beside the thresholds.
      const override = config.taskBudgets?.[slot.task] ?? {};
      const budgets = {
        turns: override.turns ?? task.task.budgets?.turns ?? config.caps?.turns,
        wallMinutes: override.wallMinutes ?? task.task.budgets?.wallMinutes ?? config.caps?.wallMinutes,
        outputTokens: override.outputTokens ?? task.task.budgets?.outputTokens ?? config.caps?.outputTokens ?? undefined,
      };
      const base = {
        campaign: args.campaign,
        slotId: slot.slotId,
        slotIndex: slot.slotIndex,
        task: slot.task,
        tier: task.task.tier,
        arm: slot.arm,
        runIndex: slot.runIndex,
        attempt,
        tarballSha256: arm.sha256,
        model: config.model,
        claudeVersion: version,
        budgets,
      };
      const discard = (extra) => appendFileSync(discardedPath, JSON.stringify({ ...base, finishedAt: new Date().toISOString(), ...extra }) + "\n");

      // A sandbox that cannot be built is the machine's problem: discard, back off, retry the slot.
      let sb;
      try {
        sb = createSandbox({ tarball: arm.tarball, taskDir: task.dir, baseDir: sandboxRoot, installTimeoutMs: (config.caps?.installMinutes ?? 10) * 60_000 });
      } catch (err) {
        discard({ outcome: "sandbox-error", evidence: err.message });
        await sleepThrough({ kind: "cli-error", evidence: `sandbox: ${err.message}` }, slot.slotId);
        continue;
      }

      let result;
      const startedAt = new Date().toISOString();
      try {
        result = await adapter.launch({
          cwd: sb.dir,
          tmpDir: sb.tmpDir,
          prompt: renderPrompt(prompt, sb.dir),
          model: config.model,
          effort: config.effort ?? undefined,
          budgets,
          transcriptPath: join(attemptDir, "transcript.jsonl"),
          onSpawn: (childPid) => writeJson(lockPath, { ...lockBase, slot: slot.slotId, childPid, childStartedAt: new Date().toISOString() }),
        });
      } catch (err) {
        sb.cleanup();
        if (err?.name === "BillingEnvError") throw new Wake(["API key present"], err.message);
        discard({ outcome: "launch-error", evidence: err.message });
        await sleepThrough({ kind: "cli-error", evidence: `launch: ${err.message}` }, slot.slotId);
        continue;
      } finally {
        writeJson(lockPath, lockBase);
      }

      try {
        // Isolation and billing, re-checked on every real session.
        if (result.init?.apiKeySource && result.init.apiKeySource !== "none") {
          discard({ startedAt, outcome: "api-key-source", apiKeySource: result.init.apiKeySource });
          throw new Wake(["API key present"], `session reported apiKeySource ${result.init.apiKeySource}`);
        }
        const leak = detectLeak(result, { phrases: [], names: [] });
        if (leak.leak) {
          discard({ startedAt, outcome: "isolation-leak", hits: leak.hits });
          throw new Wake(["isolation leak detected"], `${slot.slotId}: ${leak.hits.map((h) => `${h.where} ${h.what}`).join("; ")}`);
        }

        const cls = result.classification ?? { kind: "other" };
        if (RETRY_KINDS.has(cls.kind)) {
          discard({ startedAt, outcome: cls.kind, evidence: cls.evidence, resetAt: cls.resetAt, usage: pickUsage(result.usage), transcript: relative(REPO_ROOT, result.transcriptPath).replace(/\\/g, "/") });
          await sleepThrough(cls, slot.slotId);
          continue;
        }
        sessionRan();

        // Keep what the agent made, then score it in its own process.
        const bestEffort = (what, fn, fallback) => {
          try {
            return fn();
          } catch (err) {
            log(`${slot.slotId}: ${what} failed: ${err.message}`);
            return fallback;
          }
        };
        const agentFiles = bestEffort("listing the agent's files", () => listAgentFiles(sb.dir), []);
        const copied = bestEffort("copying the agent's files", () => copyAgentFiles(sb.dir, join(attemptDir, "workspace")), { copied: [], skipped: ["(copy failed)"] });
        const graphSrc = join(sb.dir, graphFile);
        const graphProduced = existsSync(graphSrc);
        let graphRef = null;
        if (graphProduced) {
          graphRef = bestEffort("keeping the graph", () => {
            copyFileSync(graphSrc, join(attemptDir, "graph.json"));
            return { path: relative(REPO_ROOT, join(attemptDir, "graph.json")).replace(/\\/g, "/"), sha256: sha256File(graphSrc) };
          }, null);
        }
        const scored = await runScorer({ scorer, taskDir: task.dir, graphPath: graphSrc, pcgDir: sb.pcgDir, timeoutMs: (config.caps?.scorerMinutes ?? 10) * 60_000 });
        const contaminated = (result.readPaths?.contaminating ?? []).length > 0;
        const contaminatedBefore = records.filter((r) => r.slotId === slot.slotId && r.contaminated).length;
        const reschedule = contaminated && contaminatedBefore < (config.limits?.maxContaminatedReschedules ?? 1);
        const rp = result.readPaths ?? {};
        const record = {
          ...base,
          final: !reschedule,
          startedAt,
          finishedAt: new Date().toISOString(),
          wallMs: result.wallMs,
          installedOffline: sb.installedOffline,
          outcome: cls.kind,
          outcomeEvidence: cls.kind === "ok" ? undefined : cls.evidence,
          exitCode: result.exitCode,
          turns: result.turns,
          toolCalls: result.toolCalls,
          toolCallsByName: result.toolCallsByName,
          usage: pickUsage(result.usage),
          capsHit: result.capsHit ?? [],
          permissionDenials: (result.permissionDenials ?? []).length,
          contaminated,
          outsideContaminating: rp.contaminating ?? [],
          outsideBenign: (rp.outsideSandbox ?? []).filter((p) => !(rp.contaminating ?? []).includes(p)),
          outsideWrites: result.outsideWrites ?? [],
          // A read is a FILE opened. A directory the agent only listed is
          // recorded beside it, never counted as a read.
          readCounts: { llms: rp.llms?.length ?? 0, docs: rp.docs?.length ?? 0, skills: rp.skills?.length ?? 0, graphs: rp.graphs?.length ?? 0, pkg: rp.pkg?.length ?? 0 },
          readPaths: { llms: rp.llms ?? [], docs: rp.docs ?? [], skills: rp.skills ?? [], graphs: rp.graphs ?? [], pkg: rp.pkg ?? [] },
          listedPaths: result.listedPaths ?? {},
          networkAttempts: result.networkAttempts ?? [],
          pcgCommands: result.pcgCommands ?? {},
          pcgFailures: result.pcgFailures ?? {},
          filesWritten: agentFiles.map((f) => f.path),
          probeGraphsWritten: agentFiles.filter((f) => f.path.endsWith(".json") && f.path !== graphFile).length,
          graphProduced,
          graph: graphRef,
          transcript: { path: relative(REPO_ROOT, result.transcriptPath).replace(/\\/g, "/"), sha256: bestEffort("hashing the transcript", () => sha256File(result.transcriptPath), null) },
          workspaceSkipped: copied.skipped,
          // A scorer that times out or dies on the agent's graph scores that
          // graph as unsolved: excluding it would favour the arm whose agents
          // write pathological graphs. The reference graphs passed selftest.
          solved: scored.ok ? scored.result.solved === true && !contaminated : false,
          score: scored.ok ? scored.result : null,
          scorerError: scored.ok ? undefined : `${scored.error} ${String(scored.stderr ?? "").slice(-300)}`,
        };
        appendFileSync(runsPath, JSON.stringify(record) + "\n");
        // Stop before a broken classifier (or a sandbox that invites escapes) burns the allowance.
        const rate = contaminationRate(readRecords(), config.limits);
        if (rate.tripped) {
          throw new Wake(["contamination-rate"], `${rate.contaminated} of the last ${rate.window} finished attempts were contaminated (limit ${rate.max * 100}%): ${rate.slots.join(", ")}`);
        }
        slotsRun++;
        log(`${slot.slotId}: ${record.outcome}, solved=${record.solved}${contaminated ? `, CONTAMINATED (${reschedule ? "re-running once" : "final"})` : ""}${record.scorerError ? `, scorer error: ${record.scorerError.slice(0, 120)}` : ""}`);
        writeStatus({ state: "running", completed: completedCount(), lastSlot: slot.slotId });
        try {
          writeReport(campaignDir); // a running report, so progress is readable without waiting for the end
        } catch (err) {
          log(`report: ${err.message}`);
        }
      } finally {
        if (!config.keepSandboxes) sb.cleanup();
      }
    }

    let report;
    try {
      report = writeReport(campaignDir);
    } catch (err) {
      log(`report: ${err.message}`);
      report = { gate: null };
    }
    writeStatus({ state: "done", completed: completedCount(), currentSlot: null, gate: report.gate ? { decision: report.gate.decision, reasons: report.gate.reasons, replaceTasks: report.gate.c?.replaceTasks ?? [], proposedReplacement: report.proposedReplacement ?? null } : null });
    log(`campaign ${args.campaign} done; gate ${report.gate?.decision ?? "n/a"}`);
    // The plan's second wake condition: the gate failing again after its tasks were replaced.
    if (report.gate?.decision === "stop" && config.retryOf) {
      const prior = join(resultsDir, config.retryOf, "report.json");
      if (existsSync(prior) && readJson(prior).gate?.decision === "stop") {
        throw new Wake(["pilot gate failed twice after task replacement"], `${config.retryOf} and ${args.campaign} both STOP: ${report.gate.reasons.join(" | ")}`);
      }
    }
    return EXIT.DONE;
  } catch (err) {
    if (err instanceof Wake) {
      if (statusPath) {
        mkdirSync(dirname(statusPath), { recursive: true });
        writeStatus({ state: "wake", wakeReasons: err.reasons, wakeDetail: err.detail ?? null });
      }
      console.error(`run: ${err.message}`);
      return EXIT.WAKE;
    }
    if (err instanceof ConfigError) {
      console.error(`run: ${err.message}`);
      return EXIT.USAGE;
    }
    console.error(`run: ${err.stack ?? err.message}`);
    if (statusPath && existsSync(dirname(statusPath))) writeStatus({ state: "error", lastError: String(err.message ?? err) });
    return EXIT.CRASH;
  } finally {
    if (lockPath && existsSync(lockPath)) {
      try {
        const lock = readJson(lockPath);
        if (lock.pid === process.pid) rmSync(lockPath, { force: true });
      } catch {
        /* leave it */
      }
    }
  }
}

function pickUsage(u = {}) {
  return {
    input_tokens: u.input_tokens ?? null,
    output_tokens: u.output_tokens ?? null,
    cache_creation_input_tokens: u.cache_creation_input_tokens ?? null,
    cache_read_input_tokens: u.cache_read_input_tokens ?? null,
    thinking_tokens: u.output_tokens_details?.thinking_tokens ?? null,
    cost_usd_equivalent: u.total_cost_usd_equivalent ?? null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await runCampaign(process.argv.slice(2)));
}
