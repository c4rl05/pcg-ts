// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSchedule, checkSandboxRoot, contaminationRate, finishedSlots, firstUnfinished, makeRng, msUntilWindow, renderPrompt } from "./run.mjs";

const HARNESS = fileURLToPath(new URL(".", import.meta.url));

test("schedule is deterministic in its seed and interleaves arms within (task, run) blocks", () => {
  const args = { tasks: ["b", "a", "c"], arms: ["A", "A-prime", "stripped"], runsPerTask: 3, seed: 20260915 };
  const s1 = buildSchedule(args);
  const s2 = buildSchedule({ ...args, tasks: ["c", "a", "b"] });
  assert.deepEqual(s1, s2, "input order does not matter, the seed does");
  assert.notDeepEqual(s1.map((s) => s.slotId), buildSchedule({ ...args, seed: 7 }).map((s) => s.slotId));
  assert.equal(s1.length, 27);
  assert.equal(new Set(s1.map((s) => s.slotId)).size, 27);
  for (let b = 0; b < 9; b++) {
    const block = s1.filter((s) => s.block === b);
    assert.equal(block.length, 3);
    assert.equal(new Set(block.map((s) => s.task)).size, 1);
    assert.equal(new Set(block.map((s) => s.runIndex)).size, 1);
    assert.deepEqual(block.map((s) => s.arm).sort(), ["A", "A-prime", "stripped"]);
  }
  // every task gets run r before any gets run r + 1
  const runIdx = s1.map((s) => s.runIndex);
  assert.deepEqual(runIdx, [...runIdx].sort((x, y) => x - y));
  // arm order is actually shuffled somewhere
  assert.ok(new Set(s1.filter((s) => s.slotIndex % 3 === 0).map((s) => s.arm)).size > 1);
  assert.throws(() => buildSchedule({ ...args, seed: 1.5 }), /integer/);
});

test("the PRNG is a fixed sequence (a changed generator would silently reshuffle campaigns)", () => {
  const r = makeRng(1);
  // mulberry32(1) begins 0.6270739405881613, the generator's published first value.
  assert.deepEqual([r(), r(), r()].map((x) => Math.round(x * 1e9)), [627073941, 2735721, 527447040]);
});

test("resume starts at the first slot whose last record is not final", () => {
  const schedule = buildSchedule({ tasks: ["t"], arms: ["A", "B"], runsPerTask: 2, seed: 3 });
  const [s0, s1, s2] = schedule;
  assert.equal(firstUnfinished(schedule, []), 0);
  assert.equal(firstUnfinished(schedule, [{ slotId: s0.slotId, final: true }]), 1);
  const contaminatedOnce = [{ slotId: s0.slotId, final: true }, { slotId: s1.slotId, final: false, contaminated: true }];
  assert.equal(firstUnfinished(schedule, contaminatedOnce), 1, "a contaminated first attempt is re-run");
  const retried = [...contaminatedOnce, { slotId: s1.slotId, final: true }];
  assert.equal(firstUnfinished(schedule, retried), 2);
  assert.equal(firstUnfinished(schedule, [...retried, { slotId: s2.slotId }, { slotId: schedule[3].slotId, final: true }]), -1);
  assert.equal(finishedSlots(retried).size, 2);
});

test("window: always open, same-day and overnight windows", () => {
  assert.equal(msUntilWindow("always"), 0);
  const at = (h, m) => new Date(2026, 8, 15, h, m, 0);
  assert.equal(msUntilWindow({ start: "22:00", end: "07:00" }, at(23, 0)), 0);
  assert.equal(msUntilWindow({ start: "22:00", end: "07:00" }, at(3, 0)), 0);
  assert.equal(msUntilWindow({ start: "22:00", end: "07:00" }, at(21, 0)), 60 * 60_000);
  assert.equal(msUntilWindow({ start: "09:00", end: "17:00" }, at(18, 0)), 15 * 60 * 60_000);
  assert.throws(() => msUntilWindow({ start: "9am", end: "17:00" }), /HH:MM/);
});

// ---------------------------------------------------------------------------
// End to end, with the stub agent and stub scorer (no allowance spent)
// ---------------------------------------------------------------------------

const BASELINE = "D:/Projects/JS/pcg-ts/evals/tarballs/baseline-0.17.0-0ad6998.tgz";
const skip = !existsSync(BASELINE) && "baseline tarball not on this machine";
const root = mkdtempSync(join(tmpdir(), "pcg-runtest-"));
after(() => rmSync(root, { recursive: true, force: true }));
const sharedRuns = join(root, "runs");

function setup(name, outcomes, { probeOutcomes, auditOutcomes, taskBudgets } = {}) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const config = {
    model: "claude-sonnet-5",
    prompt: "You are in {{cwd}} ({{cwdBash}}). Read brief.md and do what it asks.",
    sandboxRoot: join(dir, "sandboxes"),
    concurrency: 1,
    window: "always",
    caps: { turns: 10, wallMinutes: 2 },
    limits: { wakeAfterBlockedHours: 48, wakeAfterInfraHours: 12, maxContaminatedReschedules: 1 },
    campaigns: {
      e2e: {
        arms: [
          { label: "A", tarball: BASELINE },
          { label: "B", tarball: BASELINE },
        ],
        tasks: { include: ["fixture-grid"], dirs: [join(HARNESS, "fixtures", "tasks")] },
        runsPerTask: 1,
        scheduleSeed: 11,
        ...(taskBudgets ? { taskBudgets } : {}),
      },
    },
  };
  writeFileSync(join(dir, "config.json"), JSON.stringify(config));
  const script = {
    outcomes,
    probeOutcomes: probeOutcomes ?? ["ok"],
    auditOutcomes: auditOutcomes ?? ["ok"],
    graph: join(HARNESS, "fixtures", "tasks", "fixture-grid", "reference.graph.json"),
    badGraph: join(HARNESS, "fixtures", "tasks", "fixture-grid", "negatives", "too-few.graph.json"),
    stateFile: join(dir, "stub-state.json"),
    version: "9.9.9",
  };
  writeFileSync(join(dir, "script.json"), JSON.stringify(script));
  return dir;
}

function run(dir, extra = [], env = {}, runsDir = sharedRuns) {
  const r = spawnSync(
    process.execPath,
    [join(HARNESS, "run.mjs"), "--campaign", "e2e", "--config", join(dir, "config.json"), "--agent", join(HARNESS, "fixtures", "stub-agent.mjs"), "--scorer", join(HARNESS, "fixtures", "stub-score.mjs"), "--results-dir", join(dir, "results"), "--runs-dir", runsDir, "--sleep-cap-ms", "5", ...extra],
    { encoding: "utf8", env: { ...process.env, PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT: "1", STUB_AGENT_SCRIPT: join(dir, "script.json"), ...env }, timeout: 300_000 },
  );
  const cdir = join(dir, "results", "e2e");
  const jsonl = (f) => (existsSync(join(cdir, f)) ? readFileSync(join(cdir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  return {
    status: r.status,
    stderr: r.stderr,
    runs: jsonl("runs.jsonl"),
    discarded: jsonl("discarded.jsonl"),
    status_: existsSync(join(cdir, "STATUS.json")) ? JSON.parse(readFileSync(join(cdir, "STATUS.json"), "utf8")) : null,
    cdir,
  };
}

test("e2e: a limit hit is discarded and retried; contamination re-runs once; the campaign finishes", { skip, timeout: 300_000 }, () => {
  const dir = setup("limits", ["limit", "ok", "contaminated", "fail"]);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.discarded.length, 1);
  assert.equal(r.discarded[0].outcome, "usage-limit");
  assert.ok(r.discarded[0].resetAt, "the reset time was parsed from the limit message");
  assert.equal(r.runs.length, 3);
  const [first, contaminated, retry] = r.runs;
  assert.equal(first.attempt, 2, "the retry of a discarded session is attempt 2");
  assert.equal(first.solved, true);
  assert.deepEqual(first.pcgCommands, { validate: 1 });
  assert.deepEqual(first.pcgFailures, { validate: 1 });
  assert.equal(first.readCounts.llms, 1);
  assert.equal(first.probeGraphsWritten, 1);
  assert.equal(contaminated.contaminated, true);
  assert.equal(contaminated.final, false);
  assert.equal(retry.slotId, contaminated.slotId);
  assert.equal(retry.final, true);
  assert.equal(retry.solved, false, "the retry wrote a graph that fails its checks");
  assert.equal(retry.score.checks.count.pass, false);
  assert.equal(r.status_.state, "done");
  assert.equal(r.status_.completed, 2);
  assert.ok(existsSync(join(r.cdir, "report.md")));
  const manifest = JSON.parse(readFileSync(join(r.cdir, "manifest.json"), "utf8"));
  assert.equal(manifest.schedule.length, 2);
  assert.equal(manifest.scheduleSeed, 11);
  assert.ok(manifest.tasks[0].files["brief.md"]);
  assert.ok(existsSync(join(sharedRuns, "e2e", `${first.slotId}-a2`, "graph.json")));
});

test("e2e: killed after one slot, a restart resumes; a changed campaign refuses to resume", { skip, timeout: 300_000 }, () => {
  const dir = setup("resume", ["ok", "none"]);
  const a = run(dir, ["--max-slots", "1"]);
  assert.equal(a.status, 0, a.stderr);
  assert.equal(a.runs.length, 1);
  const b = run(dir);
  assert.equal(b.status, 0, b.stderr);
  assert.equal(b.runs.length, 2);
  assert.equal(b.runs[1].graphProduced, false);
  assert.equal(b.runs[1].solved, false);
  const cfg = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
  cfg.campaigns.e2e.runsPerTask = 2;
  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg));
  const c = run(dir);
  assert.equal(c.status, 2);
  assert.match(c.stderr, /changed since it started \(runsPerTask\)/);
});

test("e2e: a limit with no reset time backs off and probes until clear; infra errors retry without finalizing", { skip, timeout: 300_000 }, () => {
  const dir = setup("probe", ["limit-noreset", "ok", "api-error", "crash", "fail"], { probeOutcomes: ["limit-noreset", "ok"] });
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  const state = JSON.parse(readFileSync(join(dir, "stub-state.json"), "utf8"));
  assert.deepEqual(
    state.calls.filter((c) => c.kind !== "audit").map((c) => `${c.kind}:${c.outcome}`),
    ["task:limit-noreset", "probe:limit-noreset", "probe:ok", "task:ok", "task:api-error", "task:crash", "task:fail"],
  );
  assert.deepEqual(r.discarded.map((d) => d.outcome), ["usage-limit", "api-error", "cli-error"]);
  assert.equal(r.runs.length, 2, "no slot was finalized by an infrastructure error");
  assert.equal(r.runs[0].solved, true);
  assert.equal(r.runs[1].attempt, 3);
  assert.equal(r.runs[1].solved, false);
  assert.equal(r.status_.infraSince, null, "a session that ran clears the outage clock");
});

test("e2e: an outage that outlasts wakeAfterInfraHours wakes the owner", { skip, timeout: 300_000 }, () => {
  const dir = setup("outage", ["api-error"]);
  const cfg = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
  cfg.limits.wakeAfterInfraHours = 0;
  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg));
  const r = run(dir);
  assert.equal(r.status, 10, r.stderr);
  assert.deepEqual(r.status_.wakeReasons, ["infrastructure failing > 0 h"]);
  assert.equal(r.runs.length, 0);
});

test("e2e: a limit whose reset lies beyond the blocked-hours bound wakes at once", { skip, timeout: 300_000 }, () => {
  const dir = setup("weekly", ["limit"]);
  const cfg = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
  cfg.limits.wakeAfterBlockedHours = 0;
  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg));
  const r = run(dir);
  assert.equal(r.status, 10, r.stderr);
  assert.deepEqual(r.status_.wakeReasons, ["usage limit blocking > 0 h"], "the reason names the configured bound");
  assert.ok(r.status_.blockedSince, "the blocked clock is persisted for a restart");
});

test("e2e: an isolation probe stopped by a limit sleeps and retries instead of waking the owner", { skip, timeout: 300_000 }, () => {
  const dir = setup("auditlimit", ["ok", "ok"], { auditOutcomes: ["limit", "ok"] });
  const r = run(dir, [], {}, join(dir, "own-runs")); // its own runs dir: no cached probe
  assert.equal(r.status, 0, r.stderr);
  const state = JSON.parse(readFileSync(join(dir, "stub-state.json"), "utf8"));
  assert.deepEqual(state.calls.filter((c) => c.kind === "audit").map((c) => c.outcome), ["limit", "ok", "ok"], "clean probe limited, then clean and control");
  assert.equal(r.runs.length, 2);
});

test("e2e: a torn final line in runs.jsonl (a crash mid-append) is set aside, not fatal", { skip, timeout: 300_000 }, () => {
  const dir = setup("torn", ["ok", "ok"]);
  const a = run(dir, ["--max-slots", "1"]);
  assert.equal(a.status, 0, a.stderr);
  appendFileSync(join(a.cdir, "runs.jsonl"), '{"slotId":"r0.fixture-grid.B","fin');
  const b = run(dir);
  assert.equal(b.status, 0, b.stderr);
  assert.equal(b.runs.length, 2);
  assert.ok(readdirSync(b.cdir).some((f) => f.startsWith("runs.jsonl.torn-")));
});

test("e2e: torn STATUS.json and .lock.json from a crash do not block a restart", { skip, timeout: 300_000 }, () => {
  const dir = setup("tornstate", ["ok", "ok"]);
  const a = run(dir, ["--max-slots", "1"]);
  assert.equal(a.status, 0, a.stderr);
  writeFileSync(join(a.cdir, "STATUS.json"), '{"state":"runn');
  writeFileSync(join(a.cdir, ".lock.json"), '{"pid":12');
  const b = run(dir);
  assert.equal(b.status, 0, b.stderr);
  assert.equal(b.runs.length, 2);
  assert.equal(b.status_.state, "done");
});

test("e2e: taskBudgets in the campaign override the task's own budgets", { skip, timeout: 300_000 }, () => {
  // A task's budgets REPLACE the campaign caps, so the cap is often not the
  // number a run was measured against; the campaign may in turn override the
  // task, which is how a budget for a task defined in another repository is
  // set — and recorded — where the campaign lives.
  const plain = run(setup("budget-plain", ["ok"]));
  assert.equal(plain.status, 0, plain.stderr);
  const taskTurns = plain.runs[0].budgets.turns;
  assert.ok(Number.isFinite(taskTurns), "the record carries the effective budget");

  const overridden = run(setup("budget-override", ["ok"], { taskBudgets: { "fixture-grid": { turns: 137, wallMinutes: 7 } } }));
  assert.equal(overridden.status, 0, overridden.stderr);
  assert.equal(overridden.runs[0].budgets.turns, 137);
  assert.equal(overridden.runs[0].budgets.wallMinutes, 7);
  assert.notEqual(overridden.runs[0].budgets.turns, taskTurns, "the override has to change something to be worth having");
  // A task the override does not name keeps its own budget.
  const other = run(setup("budget-other", ["ok"], { taskBudgets: { "some-other-task": { turns: 999 } } }));
  assert.equal(other.runs[0].budgets.turns, taskTurns);
});

test("contamination guard: more than half of the last six finished attempts", () => {
  const rec = (i, contaminated) => ({ slotId: `s${i}`, attempt: 1, outcome: "ok", contaminated });
  assert.equal(contaminationRate([1, 2, 3, 4, 5].map((i) => rec(i, true))).tripped, false, "fewer than six attempts never trips");
  assert.equal(contaminationRate([rec(1, true), rec(2, true), rec(3, true), rec(4, false), rec(5, false), rec(6, false)]).tripped, false, "exactly half does not trip");
  const r = contaminationRate([rec(0, false), rec(1, true), rec(2, true), rec(3, true), rec(4, true), rec(5, false), rec(6, false)]);
  assert.equal(r.tripped, true);
  assert.equal(r.contaminated, 4);
  assert.equal(contaminationRate([rec(1, true), rec(2, true), rec(3, false)], { contaminationRateWindow: 3, contaminationRateMax: 0.5 }).tripped, true);
});

test("prompt placeholders and the sandbox root check", () => {
  const dir = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes\\pcg-eval-AB12\\project" : "/var/tmp/pcg-eval/sandboxes/pcg-eval-AB12/project";
  const text = renderPrompt("at {{cwd}} (in Git Bash: {{cwdBash}})", dir);
  assert.ok(text.includes(dir));
  if (process.platform === "win32") assert.ok(text.includes("/c/pcg-eval/sandboxes/pcg-eval-AB12/project"));
  const saved = process.env.PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT;
  delete process.env.PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT;
  try {
    assert.throws(() => checkSandboxRoot(join(tmpdir(), "sandboxes")), /inside the OS temp dir/);
    assert.throws(() => checkSandboxRoot(fileURLToPath(new URL("../", import.meta.url))), /inside the git repository/);
  } finally {
    if (saved !== undefined) process.env.PCG_EVAL_ALLOW_SHARED_SANDBOX_ROOT = saved;
  }
});

test("e2e: a contamination rate above the limit stops the runner with contamination-rate", { skip, timeout: 300_000 }, () => {
  const dir = setup("contamrate", ["contaminated"]);
  const cfg = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
  cfg.campaigns.e2e.runsPerTask = 3;
  writeFileSync(join(dir, "config.json"), JSON.stringify(cfg));
  const r = run(dir);
  assert.equal(r.status, 10, r.stderr);
  assert.deepEqual(r.status_.wakeReasons, ["contamination-rate"]);
  assert.equal(r.runs.length, 6, "stopped at the sixth contaminated attempt, not after the whole schedule");
  const state = JSON.parse(readFileSync(join(dir, "stub-state.json"), "utf8"));
  assert.ok(state.calls.some((c) => c.kind === "task"));
  assert.deepEqual(readdirSync(join(dir, "sandboxes")).filter((n) => !n.startsWith("pcg-eval-limitprobe")), [], "every sandbox under the dedicated root was cleaned up");
});

test("e2e: an isolation leak in a run wakes the owner with exit 10", { skip, timeout: 300_000 }, () => {
  const dir = setup("leak", ["leak"]);
  const r = run(dir);
  assert.equal(r.status, 10, r.stderr);
  assert.deepEqual(r.status_.wakeReasons, ["isolation leak detected"]);
  assert.equal(r.runs.length, 0);
});

test("e2e: an API key in the environment wakes the owner before anything runs", { skip, timeout: 60_000 }, () => {
  const dir = setup("apikey", ["ok"]);
  const r = run(dir, [], { ANTHROPIC_API_KEY: "sk-ant-test" });
  assert.equal(r.status, 10);
  assert.deepEqual(r.status_.wakeReasons, ["API key present"]);
  assert.equal(r.runs.length, 0);
  assert.ok(!existsSync(join(dir, "stub-state.json")), "no session was launched");
});

test("e2e: usage errors exit 2", { timeout: 60_000 }, () => {
  const dir = setup("usage", ["ok"]);
  const r = spawnSync(process.execPath, [join(HARNESS, "run.mjs"), "--campaign", "nope", "--config", join(dir, "config.json")], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /campaign "nope" is not in/);
});
