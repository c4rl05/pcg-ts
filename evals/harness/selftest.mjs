/**
 * The harness proves itself before it measures anything.
 *
 *   node evals/harness/selftest.mjs [--campaign pilot] [--config evals/eval.config.json]
 *                                   [--scorer <path>] [--agent <adapter>] [--force-probe] [--json]
 *
 * 1. Task shape: every selected task dir holds brief.md, task.json (valid
 *    against the shared contract), reference.graph.json, check.mjs, and
 *    negatives in <name>.graph.json / <name>.expect.json pairs whose
 *    `failsCheck` names a declared HARD check.
 * 2. Scoring, for every arm tarball: installed into a sandbox, the reference
 *    scores `solved`, and every negative fails EXACTLY its named hard check:
 *    that check fails, every other hard check passes, and the run is not
 *    solved. A negative that fails for a second reason proves nothing about
 *    the check it names.
 * 3. Brief lint: no brief names a registered node type, field fn or
 *    primitive, taken from THAT arm's `pcg nodes --json`, `pcg fields --json`
 *    and docs/primitives.json (a stripped arm's primitives come from the
 *    tarball it was derived from). See `lintBrief` for the matching rule.
 * 4. Isolation probe: a session launched through the adapter in a sandbox is
 *    asked to report any instructions, memory, skills, plugins or MCP
 *    servers it holds; it must come back clean. The same probe launched with
 *    isolation disabled from the repository root must DETECT a leak, which
 *    proves the check can fail. Results are cached per (CLI version, adapter
 *    file hash, probe prompt, model), so a restart does not spend allowance.
 *
 * Exit 0 pass, 1 fail, 2 usage/config error.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RETRY_KINDS } from "./limits.mjs";
import { readManifest, readTgzFile } from "./pack.mjs";
import {
  EVALS_DIR,
  HARNESS_DIR,
  REPO_ROOT,
  createSandbox,
  readJson,
  readJsonOr,
  removeClaudeProjectDir,
  removeDir,
  sha256,
  sha256File,
  writeJson,
} from "./sandbox.mjs";

export const GATE_FIELDS = ["graphProduced", "validates", "cooks", "deterministic", "partitionSafe"];

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Resolve a config path: absolute stays, relative is from the repo root. */
export function resolveFromRepo(p, root = REPO_ROOT) {
  if (!p) return p;
  return resolve(root, p);
}

/**
 * Load eval.config.json and merge one campaign over the defaults.
 * Throws ConfigError with a named problem.
 */
export class ConfigError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ConfigError";
  }
}

export function loadConfig(configPath = join(EVALS_DIR, "eval.config.json"), campaign) {
  if (!existsSync(configPath)) throw new ConfigError(`config not found: ${configPath}`);
  const raw = readJson(configPath);
  const { campaigns = {}, ...defaults } = raw;
  let merged = { ...defaults };
  if (campaign) {
    if (!campaigns[campaign]) {
      throw new ConfigError(`campaign "${campaign}" is not in ${configPath}; configured campaigns: ${Object.keys(campaigns).join(", ") || "(none)"}`);
    }
    const c = campaigns[campaign];
    merged = {
      ...defaults,
      ...c,
      caps: { ...defaults.caps, ...c.caps },
      limits: { ...defaults.limits, ...c.limits },
      gate: { ...defaults.gate, ...c.gate },
      selftest: { ...defaults.selftest, ...c.selftest },
    };
  }
  merged.campaign = campaign ?? null;
  merged.configPath = resolve(configPath);
  merged.configSha256 = sha256File(configPath);
  if (!merged.model) throw new ConfigError(`${configPath}: "model" is required`);
  if (merged.concurrency !== undefined && merged.concurrency !== 1) {
    throw new ConfigError(`${configPath}: concurrency must be 1 (runs share one subscription allowance and one machine); got ${merged.concurrency}`);
  }
  return merged;
}

/** Arms with absolute tarball paths and their manifests. */
export function resolveArms(config) {
  const arms = config.arms ?? [];
  if (!arms.length) throw new ConfigError(`campaign "${config.campaign}": "arms" is empty`);
  const labels = new Set();
  return arms.map((a) => {
    if (!a.label || !a.tarball) throw new ConfigError(`campaign "${config.campaign}": every arm needs { label, tarball }; got ${JSON.stringify(a)}`);
    if (labels.has(a.label)) throw new ConfigError(`campaign "${config.campaign}": duplicate arm label "${a.label}"`);
    labels.add(a.label);
    const tarball = resolveFromRepo(a.tarball);
    if (!existsSync(tarball)) throw new ConfigError(`arm "${a.label}": tarball not found: ${tarball}`);
    const manifest = readManifest(tarball);
    const sha = sha256File(tarball);
    if (manifest && manifest.sha256 !== sha) {
      throw new ConfigError(`arm "${a.label}": ${tarball} hashes to ${sha} but its manifest says ${manifest.sha256}; the tarball changed after packing`);
    }
    return { label: a.label, tarball, sha256: sha, manifest };
  });
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

const TIERS = new Set(["corpus-adjacent", "held-out"]);

/** Validate a task dir against the shared contract. Returns problem strings. */
export function validateTaskDir(dir) {
  const problems = [];
  const need = (f) => {
    if (!existsSync(join(dir, f))) problems.push(`${basename(dir)}: missing ${f}`);
  };
  ["brief.md", "task.json", "reference.graph.json", "check.mjs"].forEach(need);
  let task = null;
  if (existsSync(join(dir, "task.json"))) {
    try {
      task = readJson(join(dir, "task.json"));
    } catch (err) {
      problems.push(err.message);
    }
  }
  if (task) {
    const id = basename(dir);
    if (task.id !== id) problems.push(`${id}: task.json id "${task.id}" does not match its directory name`);
    if (!TIERS.has(task.tier)) problems.push(`${id}: tier must be "corpus-adjacent" or "held-out"; got ${JSON.stringify(task.tier)}`);
    if (typeof task.title !== "string" || !task.title) problems.push(`${id}: title must be a non-empty string`);
    if (!Array.isArray(task.outputs) || !task.outputs.length || task.outputs.some((o) => !o?.name || !o?.kind)) {
      problems.push(`${id}: outputs must be a non-empty array of { name, kind }`);
    }
    if (!Array.isArray(task.seeds) || !task.seeds.length || task.seeds.some((s) => !Number.isFinite(s))) {
      problems.push(`${id}: seeds must be a non-empty array of numbers`);
    }
    if (!(task.budgets?.turns > 0) || !(task.budgets?.wallMinutes > 0)) problems.push(`${id}: budgets must be { turns > 0, wallMinutes > 0 }`);
    if (!Array.isArray(task.checks) || !task.checks.length) problems.push(`${id}: checks must be a non-empty array`);
    const ids = new Set();
    for (const c of task.checks ?? []) {
      if (!c?.id || typeof c.hard !== "boolean" || typeof c.description !== "string") {
        problems.push(`${id}: every check needs { id, hard: boolean, description }; got ${JSON.stringify(c)}`);
      }
      if (ids.has(c?.id)) problems.push(`${id}: duplicate check id "${c.id}"`);
      ids.add(c?.id);
    }
    if (task.reserve !== undefined && typeof task.reserve !== "boolean") problems.push(`${id}: reserve must be a boolean when present`);
    if (task.campaign !== undefined && (typeof task.campaign !== "string" || !task.campaign)) {
      problems.push(`${id}: campaign must be a non-empty string when present (it is what tasks.campaign selects on); got ${JSON.stringify(task.campaign)}`);
    }
    for (const neg of listNegatives(dir)) {
      if (!neg.expect) {
        problems.push(`${id}: negatives/${neg.name}.graph.json has no ${neg.name}.expect.json`);
        continue;
      }
      const fc = neg.expect.failsCheck;
      const hard = (task.checks ?? []).find((c) => c.id === fc && c.hard);
      if (!hard && !GATE_FIELDS.includes(fc)) {
        problems.push(`${id}: negatives/${neg.name}.expect.json failsCheck "${fc}" is not a hard check of this task (hard checks: ${(task.checks ?? []).filter((c) => c.hard).map((c) => c.id).join(", ")})`);
      }
    }
    if (existsSync(join(dir, "negatives"))) {
      for (const f of readdirSync(join(dir, "negatives"))) {
        if (f.endsWith(".expect.json") && !existsSync(join(dir, "negatives", f.replace(/\.expect\.json$/, ".graph.json")))) {
          problems.push(`${id}: negatives/${f} has no matching .graph.json`);
        }
      }
    }
  }
  return { task, problems };
}

export function listNegatives(dir) {
  const nd = join(dir, "negatives");
  if (!existsSync(nd)) return [];
  return readdirSync(nd)
    .filter((f) => f.endsWith(".graph.json"))
    .sort()
    .map((f) => {
      const name = f.replace(/\.graph\.json$/, "");
      const ep = join(nd, `${name}.expect.json`);
      return { name, graph: join(nd, f), expect: existsSync(ep) ? readJson(ep) : null };
    });
}

/**
 * Discover and select tasks. `config.tasks` is
 * `{ include: "non-reserve" | "all" | "reserve" | string[], campaign?: string, dirs?: string[] }`;
 * dirs default to [publicTasksDir, privateTasksDir]. A task id present in two
 * dirs is a config error.
 *
 * `campaign` selects the tasks whose `task.json` carries that `"campaign"`
 * field — how a campaign takes a set of held-out tasks it does not have to
 * name one by one. `include` wins when both are given, because the reserve
 * lookup in run.mjs re-selects over the same `tasks` object with
 * `include: "reserve"` and must still find every reserve task.
 *
 * A task that names a campaign is NOT in the default (`"non-reserve"`) pool,
 * the way a reserve task is not: it belongs to the campaign that claimed it.
 * Without that, authoring one campaign's tasks changes what every other
 * campaign selects.
 */
export function selectTasks(config) {
  const sel = config.tasks ?? { include: "non-reserve" };
  const dirs = (sel.dirs ?? [config.publicTasksDir, config.privateTasksDir]).filter(Boolean).map((d) => resolveFromRepo(d));
  const found = new Map();
  const missingDirs = [];
  for (const d of dirs) {
    if (!existsSync(d)) {
      missingDirs.push(d);
      continue;
    }
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (!existsSync(join(full, "task.json"))) continue;
      if (found.has(name)) throw new ConfigError(`task "${name}" exists in both ${found.get(name)} and ${full}`);
      found.set(name, full);
    }
  }
  const all = [...found.entries()].map(([id, dir]) => {
    const task = readJson(join(dir, "task.json"));
    return { id, dir, task };
  });
  let chosen;
  if (Array.isArray(sel.include)) {
    const missing = sel.include.filter((id) => !found.has(id));
    if (missing.length) throw new ConfigError(`tasks not found: ${missing.join(", ")} (searched ${dirs.join(", ")})`);
    chosen = sel.include.map((id) => all.find((t) => t.id === id));
  } else if (sel.include === "all") chosen = all;
  else if (sel.include === "reserve") chosen = all.filter((t) => t.task.reserve === true);
  else if (sel.include === undefined && typeof sel.campaign === "string") {
    chosen = all.filter((t) => t.task.campaign === sel.campaign);
    if (!chosen.length) {
      throw new ConfigError(
        `campaign "${config.campaign}": no task.json carries "campaign": ${JSON.stringify(sel.campaign)} (searched ${dirs.join(", ")}` +
          (missingDirs.length ? `; missing: ${missingDirs.join(", ")}` : "") +
          `). Add the field to the tasks that belong to it, or select them by id with tasks.include.`,
      );
    }
  } else {
    // The default pool. A task that names a campaign belongs to THAT campaign
    // and is not in it: otherwise authoring v2's tasks would silently enlarge
    // every other campaign and trip its expectTaskCount. `include: "all"` and
    // an explicit id list still reach them.
    chosen = all.filter((t) => t.task.reserve !== true && t.task.campaign === undefined);
  }
  if (config.expectTaskCount !== undefined && chosen.length !== config.expectTaskCount) {
    throw new ConfigError(
      `campaign "${config.campaign}" expects ${config.expectTaskCount} tasks and found ${chosen.length} (${chosen.map((t) => t.id).join(", ") || "none"})` +
        (missingDirs.length ? `; missing task dirs: ${missingDirs.join(", ")}` : ""),
    );
  }
  return { tasks: chosen.sort((a, b) => (a.id < b.id ? -1 : 1)), missingDirs };
}

/** sha256 of every file in a task dir, plus an aggregate. */
export function hashTaskDir(dir) {
  const files = {};
  const walk = (d, rel) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(d, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, r);
      else files[r] = sha256File(full);
    }
  };
  walk(dir, "");
  return { files, sha256: sha256(JSON.stringify(files)) };
}

// ---------------------------------------------------------------------------
// Scoring through the scorer CLI, in its own process
// ---------------------------------------------------------------------------

/** Run the scorer CLI. Resolves `{ ok, result?, error?, stderr }`. */
export function runScorer({ scorer, taskDir, graphPath, pcgDir, timeoutMs = 10 * 60_000 }) {
  return new Promise((res) => {
    let child;
    try {
      child = spawn(process.execPath, [scorer, "--task", taskDir, "--graph", graphPath, "--pcg", pcgDir], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      res({ ok: false, error: `scorer could not start: ${e.message}`, stderr: "", result: null, timedOut: false });
      return;
    }
    let out = "";
    let err = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      err += `\nscorer killed after ${timeoutMs} ms`;
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      else child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err = (err + c).slice(-20_000)));
    child.on("error", (e) => {
      clearTimeout(timer);
      res({ ok: false, error: `scorer could not start: ${e.message}`, stderr: err, result: null, timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      let result = null;
      try {
        result = JSON.parse(text);
      } catch {
        const last = text.split(/\r?\n/).filter(Boolean).pop();
        try {
          result = last ? JSON.parse(last) : null;
        } catch {
          result = null;
        }
      }
      if (code === 0 && result && typeof result === "object" && "solved" in result) res({ ok: true, result, stderr: err, timedOut });
      else res({ ok: false, error: timedOut ? `scorer timed out after ${timeoutMs} ms` : `scorer exited ${code}${result ? "" : " without a JSON object"}`, stderr: err, result, timedOut });
    });
  });
}

/** Judge one negative's score against its expectation. */
export function judgeNegative(task, expect, score) {
  const fc = expect.failsCheck;
  const hard = task.checks.filter((c) => c.hard);
  if (score.solved) return { ok: false, why: `negative scored solved; it must fail "${fc}"` };
  if (GATE_FIELDS.includes(fc)) {
    // Gate fields are ordered: each presupposes the ones before it.
    if (score[fc] !== false) return { ok: false, why: `negative expected ${fc}=false, got ${score[fc]}` };
    const before = GATE_FIELDS.slice(0, GATE_FIELDS.indexOf(fc)).filter((g) => score[g] !== true);
    if (before.length) return { ok: false, why: `negative fails ${before.join(", ")} before "${fc}"; it must fail exactly "${fc}"` };
    // Past `cooks`, the checks are computed, so they must all pass.
    if (GATE_FIELDS.indexOf(fc) > GATE_FIELDS.indexOf("cooks")) {
      const failing = hard.filter((c) => score.checks?.[c.id]?.pass !== true).map((c) => c.id);
      const otherGate = ["deterministic", "partitionSafe"].filter((g) => g !== fc && score[g] !== true);
      if (failing.length || otherGate.length) return { ok: false, why: `negative also fails ${[...otherGate, ...failing].join(", ")}; it must fail exactly "${fc}"` };
    }
    return { ok: true };
  }
  const named = score.checks?.[fc];
  if (!named) return { ok: false, why: `scorer returned no result for check "${fc}"` };
  if (named.pass !== false) return { ok: false, why: `negative passes "${fc}", which it exists to fail` };
  const gateFailures = GATE_FIELDS.filter((g) => score[g] !== true);
  if (gateFailures.length) return { ok: false, why: `negative fails ${gateFailures.join(", ")} before "${fc}" is even meaningful` };
  const others = hard.filter((c) => c.id !== fc && score.checks?.[c.id]?.pass !== true).map((c) => c.id);
  if (others.length) return { ok: false, why: `negative also fails hard check(s) ${others.join(", ")}; it must fail exactly "${fc}"` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Brief lint
// ---------------------------------------------------------------------------

/**
 * Names a brief must not contain.
 *
 * Matching rule (documented because it decides what a brief may say):
 * - A name that is identifier-shaped — it has an uppercase letter, a digit,
 *   a slash or a hyphen (`pointScatterInBounds`, `atan2`, `fill/scatter-even`,
 *   `scatter-even`) — is flagged on any whole-token, case-sensitive match.
 * - A name that is a plain lowercase word (`distance`, `step`, `ring`) is
 *   flagged only where the brief uses it AS CODE: inside backticks, in
 *   quotes, or directly followed by `(`. Otherwise "distance to the road" would
 *   be unwritable, and a brief in world terms has to say it.
 * - Primitive names are checked whole (`shape/disc`) and by leaf (`disc`),
 *   under the same two rules.
 */
export function lintBrief(text, names) {
  const hits = [];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
  const identifierShaped = (n) => /[A-Z0-9/-]/.test(n);
  const candidates = new Map();
  const addName = (n, source) => {
    if (!n || n.length < 2) return;
    if (!candidates.has(n)) candidates.set(n, new Set());
    candidates.get(n).add(source);
  };
  for (const n of names.nodeTypes ?? []) addName(n, "node type");
  for (const n of names.fieldFns ?? []) addName(n, "field fn");
  for (const n of names.primitives ?? []) {
    addName(n, "primitive");
    const leaf = n.split("/").pop();
    if (leaf !== n) addName(leaf, "primitive leaf");
  }
  // Code spans, paired left to right (so the prose BETWEEN two spans is not code).
  const spans = [...text.matchAll(/`[^`\n]+`/g)].map((m) => ({ start: m.index, text: m[0] }));
  const seen = new Set();
  const record = (name, sources, index, match) => {
    const line = text.slice(0, index).split("\n").length;
    const key = `${name}@${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ name, sources: [...sources], line, match: match.slice(0, 80) });
  };
  for (const [name, sources] of candidates) {
    const token = `(?<![A-Za-z0-9_/-])${esc(name)}(?![A-Za-z0-9_/-])`;
    if (identifierShaped(name)) {
      // Case-insensitive: `PointGrid` names `pointGrid` as surely as the exact spelling.
      for (const m of text.matchAll(new RegExp(token, "gi"))) record(name, sources, m.index, m[0]);
      continue;
    }
    for (const s of spans) for (const m of s.text.matchAll(new RegExp(token, "g"))) record(name, sources, s.start + m.index, s.text);
    for (const m of text.matchAll(new RegExp(`["'‘“]${esc(name)}["'’”]|${token}\\s*\\(`, "g"))) record(name, sources, m.index, m[0]);
  }
  return hits.sort((a, b) => a.line - b.line || (a.name < b.name ? -1 : 1));
}

/** Registered names from an installed package (and a baseline tarball for primitives). */
export function namesFromInstall(pcgDir, { primitivesFallbackTgz } = {}) {
  const bin = join(pcgDir, "bin", "pcg.mjs");
  const cli = (args) => {
    const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`pcg ${args.join(" ")} exited ${r.status}: ${r.stderr.slice(-400)}`);
    return JSON.parse(r.stdout);
  };
  const nodeTypes = cli(["nodes", "--json"]).map((n) => n.type);
  const fieldFns = cli(["fields", "--json"]).map((f) => f.fn);
  let primitives = [];
  let primitivesFrom = null;
  const local = join(pcgDir, "docs", "primitives.json");
  if (existsSync(local)) {
    primitives = readJson(local).map((p) => p.name);
    primitivesFrom = "docs/primitives.json";
  } else if (primitivesFallbackTgz) {
    const bytes = readTgzFile(primitivesFallbackTgz, "docs/primitives.json");
    if (bytes) {
      primitives = JSON.parse(bytes.toString("utf8")).map((p) => p.name);
      primitivesFrom = `${basename(primitivesFallbackTgz)}:docs/primitives.json`;
    }
  }
  return { nodeTypes, fieldFns, primitives, primitivesFrom };
}

// ---------------------------------------------------------------------------
// Isolation probe
// ---------------------------------------------------------------------------

export const PROBE_PROMPT = [
  "Automated configuration audit. Do not use any tools; answer only from what is already in your context.",
  "Report everything that reached this session beyond Claude Code's built-in default system prompt, under these numbered headings:",
  "1. Instruction files (any CLAUDE.md, CLAUDE.local.md, AGENTS.md, rules, or other project or user instructions): quote every markdown heading line verbatim, and the first sentence under each.",
  "2. Memory (any memory file or memory index): quote every index line verbatim.",
  "3. Skills: their exact names.",
  "4. Plugins: their exact names.",
  "5. MCP servers or connectors, including deferred tools: their exact names.",
  "6. Hooks or output styles: their exact names.",
  "7. Custom agents: their exact names, excluding the built-in ones.",
  "Write NONE under a heading with nothing to report. Quote exactly; do not summarize or paraphrase.",
].join("\n");

function mdHeadings(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s+\S/.test(l))
    .map((l) => l.replace(/^#{1,6}\s+/, "").replace(/[*_`]/g, "").trim())
    .filter((h) => h.length >= 12);
}

function linkTexts(text) {
  return [...text.matchAll(/\[([^\]]{12,})\]\(/g)].map((m) => m[1].trim());
}

function projectSlug(p) {
  return resolve(p).replace(/[^A-Za-z0-9]/g, "-");
}

/**
 * Canary strings that can only appear in a session if this machine's
 * configuration reached it: headings of every CLAUDE.md in scope, memory
 * index entries, and the names of user skills, custom agents, plugins and
 * MCP servers.
 */
export function collectCanaries({ leakCwd, home = homedir() } = {}) {
  const phrases = new Set();
  const names = new Set();
  const sources = [];
  const readIf = (p) => {
    if (!existsSync(p)) return null;
    sources.push(p);
    return readFileSync(p, "utf8");
  };
  const claudeDir = process.env.CLAUDE_CONFIG_DIR ? resolve(process.env.CLAUDE_CONFIG_DIR) : join(home, ".claude");
  const instructionFiles = [join(claudeDir, "CLAUDE.md")];
  if (leakCwd) instructionFiles.push(join(leakCwd, "CLAUDE.md"), join(leakCwd, "CLAUDE.local.md"), join(leakCwd, "AGENTS.md"), join(leakCwd, ".claude", "CLAUDE.md"));
  for (const f of instructionFiles) {
    const t = readIf(f);
    if (t) mdHeadings(t).slice(0, 60).forEach((h) => phrases.add(h));
  }
  for (const rulesDir of [join(claudeDir, "rules"), leakCwd && join(leakCwd, ".claude", "rules")].filter(Boolean)) {
    if (!existsSync(rulesDir)) continue;
    for (const f of readdirSync(rulesDir).filter((n) => n.endsWith(".md"))) {
      const t = readIf(join(rulesDir, f));
      if (t) mdHeadings(t).forEach((h) => phrases.add(h));
    }
  }
  if (leakCwd) {
    const mem = readIf(join(claudeDir, "projects", projectSlug(leakCwd), "memory", "MEMORY.md"));
    if (mem) {
      linkTexts(mem).forEach((h) => phrases.add(h));
      mdHeadings(mem).forEach((h) => phrases.add(h));
    }
  }
  const dirNames = (d) => (existsSync(d) ? readdirSync(d).map((n) => n.replace(/\.md$/, "").replace(/@$/, "")) : []);
  dirNames(join(claudeDir, "skills")).forEach((n) => n.length >= 4 && names.add(n));
  dirNames(join(claudeDir, "agents")).forEach((n) => n.length >= 4 && names.add(n));
  const plugins = join(claudeDir, "plugins", "installed_plugins.json");
  if (existsSync(plugins)) {
    sources.push(plugins);
    for (const key of Object.keys(readJson(plugins).plugins ?? {})) names.add(key.split("@")[0]);
  }
  const appState = join(home, ".claude.json");
  if (existsSync(appState)) {
    try {
      const j = readJson(appState);
      Object.keys(j.mcpServers ?? {}).forEach((n) => names.add(n));
      for (const proj of Object.values(j.projects ?? {})) Object.keys(proj?.mcpServers ?? {}).forEach((n) => names.add(n));
    } catch {
      /* unreadable app state contributes no canaries */
    }
  }
  return { phrases: [...phrases], names: [...names], sources };
}

/** Decide whether a probe session saw configuration it should not have. */
export function detectLeak(result, canaries) {
  const hits = [];
  const init = result.init ?? {};
  for (const key of ["mcp_servers", "plugins", "skills", "slash_commands"]) {
    const v = init[key];
    if (Array.isArray(v) && v.length) hits.push({ where: `init.${key}`, what: JSON.stringify(v).slice(0, 300) });
  }
  if (init.output_style && init.output_style !== "default") hits.push({ where: "init.output_style", what: init.output_style });
  if (init.apiKeySource && init.apiKeySource !== "none") hits.push({ where: "init.apiKeySource", what: init.apiKeySource });
  const text = String(result.finalText ?? "").toLowerCase();
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ");
  const flatText = norm(text);
  for (const p of canaries.phrases) if (flatText.includes(norm(p))) hits.push({ where: "reply", what: p });
  for (const n of canaries.names) {
    const re = new RegExp(`(?<![A-Za-z0-9_-])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_-])`, "i");
    if (re.test(text)) hits.push({ where: "reply", what: n });
    for (const key of ["agents"]) if ((init[key] ?? []).some((a) => String(a).toLowerCase() === n.toLowerCase())) hits.push({ where: `init.${key}`, what: n });
  }
  return { leak: hits.length > 0, hits };
}

/** The main worktree root of the repo holding the harness (not a linked worktree). */
export function mainRepoRoot(root = REPO_ROOT) {
  const r = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) return root;
  return dirname(String(r.stdout ?? "").trim());
}

export async function loadAdapter(adapterPath) {
  const mod = await import(pathToFileURL(resolve(adapterPath)).href);
  for (const fn of ["launch", "cliVersion", "adapterHash", "billingEnvViolations"]) {
    if (typeof mod[fn] !== "function") throw new ConfigError(`agent adapter ${adapterPath} does not export ${fn}()`);
  }
  return mod;
}

/** The probe's configuration for a campaign: model, budgets, leak cwd, and the first arm's tarball. */
export function probeOptions(config, arms) {
  const p = config.selftest?.isolationProbe ?? {};
  return {
    model: config.model,
    leakCwd: p.leakCwd ? resolveFromRepo(p.leakCwd) : undefined,
    tarball: arms?.[0]?.tarball,
    sandboxRoot: config.sandboxRoot ? resolveFromRepo(config.sandboxRoot) : undefined,
    budgets: { turns: p.turns ?? 2, wallMinutes: p.wallMinutes ?? 5 },
  };
}

/**
 * Run (or read from cache) the isolation probe pair.
 * Returns `{ ok, cached, key, clean, control, problems }`.
 */
export async function isolationProbe({ adapter, model, runsDir, leakCwd, tarball, sandboxRoot, force = false, budgets = { turns: 2, wallMinutes: 5 }, log = () => {} }) {
  const version = adapter.cliVersion();
  // The machine's own configuration is part of the key (user instructions,
  // rules, skills, agents, plugins, MCP servers): a newly installed plugin is
  // exactly what the probe exists to catch. The repo CLAUDE.md and memory are
  // not, because they churn and the flags that exclude them do not change.
  const machine = collectCanaries({});
  const adapterKey = typeof adapter.isolationFingerprint === "function" ? adapter.isolationFingerprint() : adapter.adapterHash();
  const key = sha256(JSON.stringify({ version, adapter: adapterKey, prompt: PROBE_PROMPT, model, id: adapter.id ?? null, sandboxRoot: sandboxRoot ?? null, machine: sha256(JSON.stringify([machine.phrases.sort(), machine.names.sort()])) }));
  const cacheFile = join(runsDir, ".isolation-probe-cache.json");
  const cache = readJsonOr(cacheFile, {});
  if (!force && cache[key]?.ok) return { ...cache[key], cached: true, key };
  const canaryCwd = leakCwd ?? mainRepoRoot();
  const canaries = collectCanaries({ leakCwd: canaryCwd });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const probeDir = join(runsDir, "_probe", stamp);
  const problems = [];

  // The clean session runs where a real run does: a sandbox with the package installed.
  let cleanDir;
  let cleanup;
  if (tarball) {
    const sb = createSandbox({ tarball, copyBrief: false, ...(sandboxRoot ? { baseDir: sandboxRoot } : {}) });
    cleanDir = sb.dir;
    cleanup = sb.cleanup;
  } else {
    const jail = mkdtempSync(join(sandboxRoot ?? tmpdir(), "pcg-eval-"));
    cleanDir = join(jail, "project");
    mkdirSync(cleanDir);
    cleanup = () => {
      removeDir(jail);
      removeClaudeProjectDir(cleanDir);
    };
  }
  let clean;
  let control;
  try {
    log(`isolation probe: clean session in ${cleanDir}`);
    const r = await adapter.launch({ cwd: cleanDir, prompt: PROBE_PROMPT, model, budgets, tools: [], transcriptPath: join(probeDir, "clean.jsonl") });
    clean = { ...detectLeak(r, canaries), classification: r.classification, init: r.init, finalText: r.finalText, transcript: r.transcriptPath };
    // A probe stopped by a usage limit proves nothing either way; the caller sleeps and asks again.
    if (!clean.leak && RETRY_KINDS.has(r.classification?.kind)) {
      return { ok: false, limited: r.classification, cached: false, key, problems: [`isolation probe stopped by ${r.classification.kind}: ${r.classification.evidence}`] };
    }
    if (r.classification && r.classification.kind !== "ok") problems.push(`clean probe did not finish normally: ${r.classification.kind} ${r.classification.evidence}`);
    if (clean.leak) problems.push(`isolation leak: the sandboxed probe saw ${clean.hits.map((h) => `${h.where}: ${h.what}`).join("; ")}`);
  } finally {
    cleanup();
  }
  if (!problems.length) {
    log(`isolation probe: control session with isolation disabled in ${canaryCwd}`);
    const r = await adapter.launch({ cwd: canaryCwd, prompt: PROBE_PROMPT, model, budgets, tools: [], isolation: false, transcriptPath: join(probeDir, "control.jsonl") });
    control = { ...detectLeak(r, canaries), classification: r.classification, init: r.init, finalText: r.finalText, transcript: r.transcriptPath };
    if (!control.leak && RETRY_KINDS.has(r.classification?.kind)) {
      return { ok: false, limited: r.classification, cached: false, key, problems: [`isolation control probe stopped by ${r.classification.kind}: ${r.classification.evidence}`] };
    }
    if (!control.leak) problems.push(`the leak check cannot fail: the control probe ran from ${canaryCwd} with isolation disabled and no leak was detected`);
  }
  const entry = {
    ok: problems.length === 0,
    at: new Date().toISOString(),
    version,
    model,
    canarySources: canaries.sources,
    canaryCounts: { phrases: canaries.phrases.length, names: canaries.names.length },
    clean,
    control,
    problems,
  };
  if (entry.ok) {
    cache[key] = entry;
    writeJson(cacheFile, cache);
  }
  writeJson(join(probeDir, "result.json"), entry);
  return { ...entry, cached: false, key };
}

// ---------------------------------------------------------------------------
// Selftest
// ---------------------------------------------------------------------------

/**
 * Run the full selftest. Returns `{ ok, problems, wake, details, limited? }`.
 * `wake` lists owner-wake reasons (isolation leak, API key present, selftest
 * failure). `limited` is set instead when the isolation probe was stopped by
 * a usage limit or transient error: not a failure, a reason to sleep and retry.
 */
export async function runSelftest({ config, scorer, adapterPath, runsDir, forceProbe = false, probe: withProbe = true, log = () => {} }) {
  const problems = [];
  const wake = [];
  const details = { tasks: {}, arms: {}, lint: {}, probe: null };
  const adapter = await loadAdapter(adapterPath);

  const billing = adapter.billingEnvViolations(process.env);
  if (billing.length) {
    const msg = `API key or provider variable present: ${billing.join(", ")}`;
    return { ok: false, problems: [msg], wake: [msg], details };
  }

  const arms = resolveArms(config);
  const { tasks } = selectTasks(config);
  if (!tasks.length) problems.push("no tasks selected");
  for (const t of tasks) {
    const v = validateTaskDir(t.dir);
    details.tasks[t.id] = { dir: t.dir, problems: v.problems };
    problems.push(...v.problems);
  }
  if (!existsSync(scorer)) problems.push(`scorer not found: ${scorer}`);

  if (!problems.length) {
    const baselineByFile = new Map(arms.map((a) => [basename(a.tarball), a.tarball]));
    for (const arm of arms) {
      log(`selftest: installing arm ${arm.label}`);
      const armDetail = { reference: {}, negatives: {} };
      details.arms[arm.label] = armDetail;
      let sb;
      try {
        sb = createSandbox({ tarball: arm.tarball, copyBrief: false, baseDir: join(tmpdir(), "pcg-selftest") });
        let fallback = null;
        if (arm.manifest?.derivedFrom?.file) {
          const beside = join(dirname(arm.tarball), arm.manifest.derivedFrom.file);
          fallback = existsSync(beside) ? beside : baselineByFile.get(arm.manifest.derivedFrom.file) ?? null;
        }
        const names = namesFromInstall(sb.pcgDir, { primitivesFallbackTgz: fallback });
        if (!names.primitives.length) problems.push(`arm ${arm.label}: no primitive names (no docs/primitives.json and no derivedFrom tarball to take them from)`);
        for (const t of tasks) {
          const hits = lintBrief(readFileSync(join(t.dir, "brief.md"), "utf8"), names);
          details.lint[`${arm.label}/${t.id}`] = hits;
          if (hits.length) problems.push(`brief lint (${arm.label}): ${t.id}/brief.md names ${hits.map((h) => `${h.sources.join("/")} "${h.name}" at line ${h.line}`).join(", ")}`);

          const ref = await runScorer({ scorer, taskDir: t.dir, graphPath: join(t.dir, "reference.graph.json"), pcgDir: sb.pcgDir });
          armDetail.reference[t.id] = ref.ok ? { solved: ref.result.solved, score: ref.result.score } : { error: ref.error, stderr: ref.stderr.slice(-800) };
          if (!ref.ok) problems.push(`scorer failed on ${t.id}/reference.graph.json with arm ${arm.label}: ${ref.error} ${ref.stderr.slice(-400)}`);
          else if (!ref.result.solved) problems.push(`${t.id}/reference.graph.json does not score solved with arm ${arm.label}: ${JSON.stringify(ref.result).slice(0, 600)}`);

          for (const neg of listNegatives(t.dir)) {
            const s = await runScorer({ scorer, taskDir: t.dir, graphPath: neg.graph, pcgDir: sb.pcgDir });
            if (!s.ok) {
              problems.push(`scorer failed on ${t.id}/negatives/${neg.name} with arm ${arm.label}: ${s.error}`);
              armDetail.negatives[`${t.id}/${neg.name}`] = { error: s.error };
              continue;
            }
            const j = judgeNegative(t.task, neg.expect, s.result);
            armDetail.negatives[`${t.id}/${neg.name}`] = j;
            if (!j.ok) problems.push(`${t.id}/negatives/${neg.name} (arm ${arm.label}): ${j.why}`);
          }
        }
      } catch (err) {
        problems.push(`arm ${arm.label}: ${err.message}`);
      } finally {
        sb?.cleanup();
      }
    }
  }

  if (!problems.length && withProbe) {
    try {
      const probe = await isolationProbe({ ...probeOptions(config, arms), adapter, runsDir, force: forceProbe, log });
      details.probe = { ok: probe.ok, cached: probe.cached, key: probe.key, at: probe.at, problems: probe.problems, cleanHits: probe.clean?.hits, controlHits: probe.control?.hits?.slice(0, 10) };
      if (probe.limited) return { ok: false, limited: probe.limited, problems: probe.problems, wake: [], details };
      if (!probe.ok) {
        problems.push(...probe.problems);
        if (probe.problems.some((p) => p.startsWith("isolation leak"))) wake.push("isolation leak detected");
      }
    } catch (err) {
      if (err?.name === "BillingEnvError") wake.push("API key present");
      problems.push(`isolation probe failed to run: ${err.message}`);
    }
  }

  if (problems.length && !wake.length) wake.push("selftest failure");
  return { ok: problems.length === 0, problems, wake, details };
}

async function main(argv) {
  const get = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  let config;
  try {
    config = loadConfig(resolve(get("--config") ?? join(EVALS_DIR, "eval.config.json")), get("--campaign") ?? "pilot");
  } catch (err) {
    console.error(`selftest: ${err.message}`);
    return 2;
  }
  const scorer = resolve(get("--scorer") ?? resolveFromRepo(config.scorer ?? "evals/harness/score.mjs"));
  const adapterPath = resolve(get("--agent") ?? resolveFromRepo(config.agent ?? "evals/harness/agents/claude-code.mjs"));
  const runsDir = resolve(get("--runs-dir") ?? join(EVALS_DIR, "runs"));
  try {
    const r = await runSelftest({ config, scorer, adapterPath, runsDir, forceProbe: argv.includes("--force-probe"), log: (m) => console.error(m) });
    if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(r.ok ? "selftest: PASS" : "selftest: FAIL");
      for (const p of r.problems) console.log(`  - ${p}`);
      if (r.details.probe) console.log(`  isolation probe: ${r.details.probe.ok ? "clean, and the control detected a leak" : "FAILED"}${r.details.probe.cached ? " (cached)" : ""}`);
    }
    return r.ok ? 0 : 1;
  } catch (err) {
    console.error(`selftest: ${err.message}`);
    return err instanceof ConfigError ? 2 : 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await main(process.argv.slice(2)));
}
