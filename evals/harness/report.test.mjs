// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  bootstrapCi,
  buildReport,
  calibrationTable,
  EFFORT_METRICS,
  effectiveBudgets,
  effortMetrics,
  evaluateGate,
  hasCalibrationShape,
  isCalibration,
  latestBySlot,
  overBudget,
  pairedDelta,
  pairedEffort,
  parseJsonl,
  renderCalibration,
  renderMarkdown,
  seedFor,
  signTest,
  summarize,
  wilson,
  writeReport,
} from "./report.mjs";

const close = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("Wilson 95% intervals match published values", () => {
  const w = wilson(5, 10);
  close(w.lo, 0.2366);
  close(w.hi, 0.7634);
  const zero = wilson(0, 18);
  assert.equal(zero.lo, 0);
  close(zero.hi, 0.1759);
  const all = wilson(18, 18);
  close(all.lo, 0.8241);
  assert.equal(all.hi, 1);
  const w2 = wilson(81, 263); // Newcombe (1998) example set
  close(w2.lo, 0.2553, 5e-4);
  close(w2.hi, 0.3662, 5e-4);
  assert.deepEqual(wilson(0, 0), { p: null, lo: 0, hi: 1 });
});

test("sign test is exact and two-sided", () => {
  assert.equal(signTest(0, 0), 1);
  close(signTest(6, 0), 2 / 64);
  close(signTest(5, 1), (2 * 7) / 64);
  assert.equal(signTest(3, 3), 1);
});

/** Records for arms with given per-task solved counts out of `runs`. */
function records(spec, runs = 3) {
  const out = [];
  for (const [arm, perTask] of Object.entries(spec)) {
    for (const [task, solved] of Object.entries(perTask)) {
      for (let r = 0; r < runs; r++) out.push({ slotId: `r${r}.${task}.${arm}`, task, arm, final: true, solved: r < solved });
    }
  }
  return out;
}

const TASKS = ["t1", "t2", "t3", "t4", "t5", "t6"];
const ARMS = ["A", "A-prime", "stripped"];
const GATE = { baselineArms: ["A", "A-prime"], strippedArm: "stripped", aaMaxGap: 0.28, strippedMinMargin: 0.17 };
const perTask = (xs) => Object.fromEntries(TASKS.map((t, i) => [t, xs[i]]));

test("gate says GO on a clear documentation effect with a quiet A/A pair", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) });
  const s = summarize(recs, ARMS, TASKS);
  const g = evaluateGate(s, TASKS, GATE, { complete: true });
  assert.equal(g.decision, "go", g.reasons.join("; "));
  assert.equal(g.a.aaGap, 0);
});

test("gate says STOP when the stripped arm is not worse (the eval cannot see docs)", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([2, 2, 1, 1, 2, 1]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.equal(g.decision, "stop");
  assert.equal(g.a.pass, false);
  assert.equal(g.b.pass, true);
  assert.equal(g.c.pass, true);
});

test("gate says STOP when the A/A gap is too wide, even if stripped is far below", () => {
  const recs = records({ A: perTask([3, 3, 3, 2, 2, 2]), "A-prime": perTask([1, 1, 1, 1, 1, 1]), stripped: perTask([0, 0, 0, 0, 0, 1]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.equal(g.decision, "stop");
  assert.equal(g.b.pass, false);
  close(g.b.aaGap, 15 / 18 - 6 / 18);
});

test("stripped must clear the A/A gap against EACH baseline, not their mean", () => {
  // A 12/18, A' 8/18 (gap 4/18); stripped 6/18: 6/18 below A but only 2/18 below A'
  const recs = records({ A: perTask([2, 2, 2, 2, 2, 2]), "A-prime": perTask([2, 2, 1, 1, 1, 1]), stripped: perTask([1, 1, 1, 1, 1, 1]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.equal(g.a.pass, false);
});

test("a zero A/A gap does not let a one-run difference pass (a)", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 1, 1]), "A-prime": perTask([2, 2, 2, 1, 1, 1]), stripped: perTask([2, 2, 1, 1, 1, 1]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.equal(g.a.pass, false);
  assert.equal(g.decision, "stop");
});

test("an exact tie with the A/A gap is not 'more than' it (floating-point review repro)", () => {
  // A 14/18, A' 10/18, S 6/18: A' - S equals A - A' = 4/18, so (a) must fail.
  const recs = records({ A: perTask([3, 3, 2, 2, 2, 2]), "A-prime": perTask([2, 2, 2, 2, 1, 1]), stripped: perTask([1, 1, 1, 1, 1, 1]) });
  const s = summarize(recs, ARMS, TASKS);
  assert.deepEqual([s.byArm.A.solved, s.byArm["A-prime"].solved, s.byArm.stripped.solved], [14, 10, 6]);
  const g = evaluateGate(s, TASKS, GATE, { complete: true });
  assert.equal(g.a.pass, false);
  assert.equal(g.decision, "stop");
  // and a gap exactly at aaMaxGap is within it: 5/18 = 0.2777... <= 0.28, 0.2777... computed two ways
  const exact = evaluateGate(s, TASKS, { ...GATE, aaMaxGap: 4 / 18 }, { complete: true });
  assert.equal(exact.b.pass, true);
});

test("a task with no countable runs fails (c) as no-data, and the report proposes reserve tasks", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) }).map((r) => (r.task === "t6" ? { ...r, contaminated: true } : r));
  const s = summarize(recs, ARMS, TASKS);
  const g = evaluateGate(s, TASKS, GATE, { complete: true });
  assert.deepEqual(g.c.replaceTasks.map((x) => [x.task, x.at]), [["t6", "no-data"]]);
  const report = buildReport({ manifest: { campaign: "t", model: "m", claudeVersion: "1", arms: ARMS.map((label) => ({ label })), tasks: TASKS.map((id) => ({ id })), reserveTasks: ["r1", "r2"], schedule: recs.map((r) => ({ slotId: r.slotId })), gate: GATE }, records: recs });
  assert.deepEqual(report.proposedReplacement, { drop: ["t6"], add: ["r1"], short: 0 });
});

test("floor and ceiling tasks are listed for replacement and stop the gate", () => {
  const recs = records({ A: perTask([3, 0, 2, 2, 2, 1]), "A-prime": perTask([3, 0, 2, 2, 2, 2]), stripped: perTask([3, 0, 0, 0, 1, 0]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.equal(g.decision, "stop");
  assert.deepEqual(g.c.replaceTasks.map((x) => [x.task, x.at]), [["t1", "ceiling"], ["t2", "floor"]]);
});

test("an incomplete campaign is pending, never go", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) });
  assert.equal(evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: false }).decision, "pending");
});

test("the last record per slot counts; contaminated finals are excluded from rates", () => {
  const recs = [
    { slotId: "r0.t1.A", task: "t1", arm: "A", final: false, contaminated: true, solved: false },
    { slotId: "r0.t1.A", task: "t1", arm: "A", final: true, contaminated: false, solved: true },
    { slotId: "r1.t1.A", task: "t1", arm: "A", final: true, contaminated: true, solved: false },
  ];
  const finals = [...latestBySlot(recs).values()];
  const s = summarize(finals, ["A"], ["t1"]);
  assert.equal(s.cell.t1.A.n, 1);
  assert.equal(s.cell.t1.A.solved, 1);
  assert.equal(s.cell.t1.A.contaminated, 1);
});

// ---------------------------------------------------------------------------
// Effort
// ---------------------------------------------------------------------------

/**
 * Synthetic runs with effort attached. `turnsBy` is a map arm -> turns, or
 * arm -> (task) => turns, so a test can make one arm cost more per task.
 */
function effortRecords({ arms, tasks, runs = 3, turnsBy, solvedBy = () => runs, extra = () => ({}) }) {
  const out = [];
  for (const arm of arms) {
    for (const task of tasks) {
      const t = typeof turnsBy[arm] === "function" ? turnsBy[arm](task) : turnsBy[arm];
      const turnsPerRun = Array.isArray(t) ? t : [t, t, t].slice(0, runs);
      for (let r = 0; r < runs; r++) {
        const turns = turnsPerRun[r % turnsPerRun.length];
        out.push({
          slotId: `r${r}.${task}.${arm}`,
          task,
          arm,
          final: true,
          solved: r < solvedBy(arm, task),
          turns,
          toolCalls: turns + 2,
          wallMs: turns * 10_000,
          usage: { output_tokens: turns * 700 },
          pcgCommands: { validate: 2 },
          pcgFailures: { validate: 1 },
          probeGraphsWritten: 1,
          capsHit: [],
          readCounts: { llms: 1, docs: 1, skills: 0, graphs: 1 },
          graphProduced: true,
          ...extra(arm, task, r),
        });
      }
    }
  }
  return out;
}

const E_TASKS = ["t1", "t2", "t3", "t4", "t5", "t6"];
const E_ARMS = ["A", "A-prime", "stripped-all"];
const V2_GATE = {
  label: "v2 gate",
  baselineArms: ["A", "A-prime"],
  strippedArm: "stripped-all",
  aaMaxGap: 0.28,
  strippedMinMargin: 0.17,
  effortMetric: "turns",
  strippedEffortMinMargin: 0.25,
  aaMaxEffortGap: 0.15,
  effortCiMustExcludeZero: true,
};

test("effort is summarised as medians with an IQR, and caps/reads as rates", () => {
  const recs = effortRecords({
    arms: ["A"],
    tasks: ["t1"],
    turnsBy: { A: [10, 20, 90] }, // a capped run must not drag the median
    extra: (_a, _t, r) => (r === 2 ? { capsHit: ["turns"] } : {}),
  });
  const e = effortMetrics(recs, ["A"], ["t1"]);
  const m = e.byArm.A.metrics;
  assert.equal(m.turns.median, 20);
  close(m.turns.mean, 40);
  assert.deepEqual([m.turns.p25, m.turns.p75], [10, 90]);
  assert.equal(m.toolCalls.median, 22);
  assert.equal(m.outputTokens.median, 14_000);
  close(e.byArm.A.validateFailureRate, 0.5);
  assert.deepEqual(e.byArm.A.capsHit, { turns: 1 });
  close(e.byArm.A.capsHitRate, 1 / 3);
  assert.deepEqual(e.byArm.A.readShare, { llms: 1, docs: 1, skills: 0, graphs: 1 });
  assert.equal(e.cell.t1.A.metrics.turns.median, 20);
});

test("contaminated and infrastructure runs are excluded from effort as they are from rates", () => {
  const recs = effortRecords({ arms: ["A"], tasks: ["t1"], turnsBy: { A: [10, 20, 30] } });
  recs[2] = { ...recs[2], contaminated: true, turns: 999 };
  const e = effortMetrics(recs, ["A"], ["t1"]);
  assert.equal(e.byArm.A.runs, 2);
  assert.equal(e.byArm.A.metrics.turns.median, 15);
});

test("the bootstrap is seeded, brackets the mean, and reports nothing for a sample of one", () => {
  const xs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  const a = bootstrapCi(xs);
  const b = bootstrapCi(xs);
  assert.deepEqual(a, b, "the same values must always give the same interval");
  assert.ok(a.lo < 0.35 && a.hi > 0.35, `${a.lo}–${a.hi} should bracket the mean 0.35`);
  assert.ok(a.lo > 0, "an all-positive sample has an interval clear of zero");
  assert.equal(a.samples, 2000);
  const wide = bootstrapCi([-0.5, -0.4, 0.4, 0.5, 0.45, -0.45]);
  assert.ok(wide.lo < 0 && wide.hi > 0, "a sample straddling zero must not claim a sign");
  assert.deepEqual(bootstrapCi([0.3]), { lo: null, hi: null, samples: 0, b: 2000, alpha: 0.05 });
  assert.deepEqual(bootstrapCi([]).lo, null);
});

test("effort is paired by task: per-task median differences, absolute and relative", () => {
  const recs = effortRecords({
    arms: ["A", "stripped-all"],
    tasks: ["t1", "t2"],
    turnsBy: { A: (t) => (t === "t1" ? 20 : 40), "stripped-all": (t) => (t === "t1" ? 30 : 50) },
  });
  const e = effortMetrics(recs, ["A", "stripped-all"], ["t1", "t2"]);
  const p = pairedEffort(e, ["t1", "t2"], "stripped-all", "A").metrics.turns;
  assert.deepEqual(p.perTask.t1, { arm: 30, ref: 20, delta: 10, relative: 0.5 });
  assert.deepEqual(p.perTask.t2, { arm: 50, ref: 40, delta: 10, relative: 0.25 });
  assert.equal(p.meanDelta, 10);
  close(p.meanRelative, 0.375);
  assert.deepEqual([p.higher, p.lower, p.ties], [2, 0, 0]);
  // A task with no countable run on either arm drops out rather than counting as zero.
  const withGap = pairedEffort(e, ["t1", "t2", "t3"], "stripped-all", "A").metrics.turns;
  assert.equal(withGap.tasks, 2);
});

test("v2 gate says GO on an arm that solves as often but costs much more", () => {
  const recs = effortRecords({
    arms: E_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 30, "A-prime": 30, "stripped-all": 45 },
    solvedBy: () => 2, // 2/3 everywhere: no task at floor or ceiling, no solved signal
  });
  const s = summarize(recs, E_ARMS, E_TASKS);
  const e = effortMetrics(recs, E_ARMS, E_TASKS);
  const g = evaluateGate(s, E_TASKS, V2_GATE, { complete: true, effort: e });
  assert.equal(g.decision, "go", g.reasons.join("; "));
  assert.equal(g.a.firedBy, "effort");
  assert.equal(g.a.solvedPass, false, "solved rates are identical: only effort can fire");
  close(g.a.effort.perReference.A.relative, 0.5);
  assert.ok(g.a.effort.perReference.A.ci.lo > 0);
  assert.equal(g.a.effort.aaEffortGap, 0);
  assert.equal(g.b.pass, true);
  assert.equal(g.c.pass, true);
  assert.equal(g.label, "v2 gate");
});

test("v2 gate still says GO on a solved-rate effect, and names which limb fired", () => {
  const recs = effortRecords({
    arms: E_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 30, "A-prime": 30, "stripped-all": 30 },
    solvedBy: (arm) => (arm === "stripped-all" ? 0 : 2),
  });
  const g = evaluateGate(summarize(recs, E_ARMS, E_TASKS), E_TASKS, V2_GATE, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  assert.equal(g.decision, "go", g.reasons.join("; "));
  assert.equal(g.a.firedBy, "solved");
  assert.equal(g.a.effort.pass, false, "effort is identical; the solved limb carried it");
});

test("v2 gate says STOP when the stripped arm costs only a little more", () => {
  const recs = effortRecords({
    arms: E_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 30, "A-prime": 30, "stripped-all": 33 }, // +10%, under the 25% margin
    solvedBy: () => 2,
  });
  const g = evaluateGate(summarize(recs, E_ARMS, E_TASKS), E_TASKS, V2_GATE, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  assert.equal(g.decision, "stop");
  assert.equal(g.a.firedBy, null);
  assert.equal(g.a.effort.perReference.A.okMargin, false);
  assert.ok(g.reasons.some((r) => /nor does it cost more/.test(r)), g.reasons.join("; "));
  assert.ok(g.reasons.some((r) => r.startsWith("fix:")), "a STOP must say what to change");
});

test("v2 gate says STOP when a big mean effort difference is only noise across tasks", () => {
  // Three tasks +150%, three -30%: the mean clears 25%, the bootstrap does not clear zero.
  const recs = effortRecords({
    arms: E_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 20, "A-prime": 20, "stripped-all": (t) => (["t1", "t2", "t3"].includes(t) ? 50 : 14) },
    solvedBy: () => 2,
  });
  const g = evaluateGate(summarize(recs, E_ARMS, E_TASKS), E_TASKS, V2_GATE, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  const c = g.a.effort.perReference.A;
  assert.equal(c.okMargin, true, `relative ${c.relative} should clear the margin`);
  assert.equal(c.okCi, false, `interval ${c.ci.lo}–${c.ci.hi} should straddle zero`);
  assert.ok(c.ci.lo < 0 && c.ci.hi > 0);
  assert.equal(g.decision, "stop");
});

test("v2 gate (b) fails when the same tarball under two labels already differs on effort", () => {
  const recs = effortRecords({
    arms: E_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 30, "A-prime": 40, "stripped-all": 60 }, // A/A gap 33% > aaMaxEffortGap 15%
    solvedBy: () => 2,
  });
  const g = evaluateGate(summarize(recs, E_ARMS, E_TASKS), E_TASKS, V2_GATE, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  assert.equal(g.b.effortPass, false);
  assert.equal(g.b.solvedPass, true, "the solved A/A gap is fine; effort is what failed");
  assert.equal(g.decision, "stop");
  assert.ok(g.reasons.some((r) => /A\/A effort gap/.test(r)), g.reasons.join("; "));
});

test("the effort limb reports itself unavailable rather than silently passing", () => {
  const recs = effortRecords({ arms: E_ARMS, tasks: E_TASKS, turnsBy: { A: 30, "A-prime": 30, "stripped-all": 60 }, solvedBy: () => 2 });
  const s = summarize(recs, E_ARMS, E_TASKS);
  const noData = evaluateGate(s, E_TASKS, V2_GATE, { complete: true });
  assert.equal(noData.a.effort.pass, false);
  assert.match(noData.a.effort.unavailable, /no effort data/);
  const badMetric = evaluateGate(s, E_TASKS, { ...V2_GATE, effortMetric: "vibes" }, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  assert.match(badMetric.a.effort.unavailable, /"vibes" is not one of/);
  assert.equal(badMetric.decision, "stop");
});

test("the A/A effort gap does not depend on which baseline is named first", () => {
  // A relative difference is asymmetric: 40 is 33% above 30, 30 is 25% below 40.
  const recs = effortRecords({ arms: E_ARMS, tasks: E_TASKS, turnsBy: { A: 30, "A-prime": 40, "stripped-all": 80 }, solvedBy: () => 2 });
  const s = summarize(recs, E_ARMS, E_TASKS);
  const e = effortMetrics(recs, E_ARMS, E_TASKS);
  const forward = evaluateGate(s, E_TASKS, V2_GATE, { complete: true, effort: e });
  const reversed = evaluateGate(s, E_TASKS, { ...V2_GATE, baselineArms: ["A-prime", "A"] }, { complete: true, effort: e });
  close(forward.b.aaEffortGap, 1 / 3);
  assert.equal(forward.b.aaEffortGap, reversed.b.aaEffortGap, "the larger magnitude, whichever way round");
  assert.equal(forward.b.effortPass, reversed.b.effortPass);
  assert.equal(forward.decision, reversed.decision);
});

test("aaMaxEffortGap is checked even when no effort limb is configured, and fails closed", () => {
  const bOnly = { ...V2_GATE, strippedEffortMinMargin: undefined };
  const recs = effortRecords({ arms: E_ARMS, tasks: E_TASKS, turnsBy: { A: 30, "A-prime": 60, "stripped-all": 30 }, solvedBy: (arm) => (arm === "stripped-all" ? 0 : 2) });
  const s = summarize(recs, E_ARMS, E_TASKS);
  const g = evaluateGate(s, E_TASKS, bOnly, { complete: true, effort: effortMetrics(recs, E_ARMS, E_TASKS) });
  assert.equal(g.a.effort, null, "no limb without strippedEffortMinMargin");
  assert.equal(g.a.pass, true, "the solved limb still carries (a)");
  assert.equal(g.b.effortPass, false, "but the A/A effort gap is still checked");
  assert.equal(g.decision, "stop");
  // Configured and unmeasurable is a failure, not a pass.
  const noData = evaluateGate(s, E_TASKS, bOnly, { complete: true });
  assert.equal(noData.b.effortPass, false);
  assert.ok(noData.reasons.some((r) => /could not be measured/.test(r)), noData.reasons.join("; "));
});

test("a gate with no effort thresholds is the pilot gate, unchanged", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) });
  const s = summarize(recs, ARMS, TASKS);
  const g = evaluateGate(s, TASKS, GATE, { complete: true, effort: effortMetrics(recs, ARMS, TASKS) });
  assert.equal(g.decision, "go");
  assert.equal(g.a.effort, null, "no strippedEffortMinMargin means no effort limb at all");
  assert.equal(g.b.effortPass, null);
  assert.equal(g.label, "Pilot gate");
});

// ---------------------------------------------------------------------------
// What limb (a) is measured against
// ---------------------------------------------------------------------------

const V2_ARMS = ["A", "A-prime", "candidate-U1", "stripped-all"];
const V2_REF_GATE = { ...V2_GATE, strippedRefArm: "candidate-U1" };

test("the stripped arm is judged against the tarball it was cut from, not a different build", () => {
  // The confounded case: candidate-U1 is BETTER than the baselines (it is a
  // later build), and stripped-all costs 40% more turns than its own parent
  // but only 12% more than the baselines. Against the baselines the effect is
  // buried by the library change; against its parent it is plain.
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 32, "stripped-all": 44.8 },
    solvedBy: () => 2,
  });
  const s = summarize(recs, V2_ARMS, E_TASKS);
  const e = effortMetrics(recs, V2_ARMS, E_TASKS);
  const againstBaselines = evaluateGate(s, E_TASKS, { ...V2_GATE, strippedArm: "stripped-all" }, { complete: true, effort: e });
  close(againstBaselines.a.effort.perReference.A.relative, 0.12);
  assert.equal(againstBaselines.a.effort.pass, false, "12% against the wrong reference is under the margin");
  assert.equal(againstBaselines.decision, "stop");

  const againstParent = evaluateGate(s, E_TASKS, V2_REF_GATE, { complete: true, effort: e });
  assert.deepEqual(againstParent.a.refArms, ["candidate-U1"]);
  close(againstParent.a.effort.perReference["candidate-U1"].relative, 0.4);
  assert.equal(againstParent.a.effort.pass, true);
  assert.equal(againstParent.decision, "go", againstParent.reasons.join("; "));
  assert.equal(againstParent.a.firedBy, "effort");
  // The A/A pair is still the noise floor, which is its job.
  assert.equal(againstParent.b.aaEffortGap, 0);
  assert.deepEqual(Object.keys(againstParent.a.baseline), ["candidate-U1"]);
});

test("both contrasts are computed in the report body, not only inside the gate", () => {
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 32, "stripped-all": 44.8 },
    solvedBy: () => 2,
  });
  const manifest = {
    campaign: "v2",
    model: "m",
    claudeVersion: "1",
    arms: V2_ARMS.map((label) => ({ label })),
    tasks: E_TASKS.map((id) => ({ id })),
    runsPerTask: 3,
    schedule: recs.map((r) => ({ slotId: r.slotId })),
    gate: V2_REF_GATE,
  };
  const report = buildReport({ manifest, records: recs });
  const pairs = report.effortPaired.map((p) => `${p.arm} vs ${p.ref}`);
  assert.ok(pairs.includes("candidate-U1 vs A"), pairs.join(", "));
  assert.ok(pairs.includes("stripped-all vs candidate-U1"), "the clean contrast must be in the body");
  assert.deepEqual(report.pairedDeltas.map((d) => `${d.arm} vs ${d.ref}`), pairs);
  const md = renderMarkdown(report);
  assert.match(md, /\| stripped-all \| candidate-U1 \| turns \|/);
  assert.match(md, /\| candidate-U1 \| A \| turns \|/);
});

// ---------------------------------------------------------------------------
// Absent thresholds must not pass
// ---------------------------------------------------------------------------

test("an absent strippedMinMargin does not let a one-run difference through", () => {
  // 8 tasks x 3 runs: references 24/24, stripped 23/24, A/A gap 0.
  const tasks = [...E_TASKS, "t7", "t8"];
  const recs = [];
  for (const arm of ARMS) {
    for (const t of tasks) {
      for (let r = 0; r < 3; r++) {
        const miss = arm === "stripped" && t === "t1" && r === 0;
        recs.push({ slotId: `r${r}.${t}.${arm}`, task: t, arm, final: true, solved: !miss });
      }
    }
  }
  const s = summarize(recs, ARMS, tasks);
  assert.deepEqual([s.byArm.A.solved, s.byArm.stripped.solved], [24, 23]);
  assert.equal(evaluateGate(s, tasks, GATE, { complete: true }).a.pass, false, "with the threshold present it already fails");
  const noMargin = { ...GATE, strippedMinMargin: undefined };
  const g = evaluateGate(s, tasks, noMargin, { complete: true });
  assert.equal(g.a.pass, false, "and an ABSENT threshold is not a threshold of zero");
  assert.equal(g.a.requiredMargin, null);
  assert.ok(g.reasons.some((r) => /strippedMinMargin is not configured/.test(r)), g.reasons.join("; "));
  assert.equal(g.decision, "stop");
  assert.equal(evaluateGate(s, tasks, { ...GATE, strippedMinMargin: null }, { complete: true }).a.pass, false, "null is absent too");
});

test("a null aaMaxGap is not a bound of zero", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) });
  const s = summarize(recs, ARMS, TASKS);
  assert.equal(evaluateGate(s, TASKS, GATE, { complete: true }).decision, "go", "the baseline case passes with a real bound");
  for (const bad of [null, undefined, "0.28"]) {
    const g = evaluateGate(s, TASKS, { ...GATE, aaMaxGap: bad }, { complete: true });
    assert.equal(g.b.pass, false, `aaMaxGap ${JSON.stringify(bad)} must not pass`);
    assert.equal(g.decision, "stop");
    assert.ok(g.reasons.some((r) => /aaMaxGap is not a number/.test(r)), g.reasons.join("; "));
  }
});

// ---------------------------------------------------------------------------
// Limb (c) over the reference arms
// ---------------------------------------------------------------------------

test("(c) catches a task the references already ace, which pooling hides", () => {
  const tasks = [...E_TASKS, "t7", "t8"];
  const recs = [];
  for (const arm of V2_ARMS) {
    for (const t of tasks) {
      for (let r = 0; r < 3; r++) {
        // Every reference arm solves everything; the stripped arm misses one
        // run per task. Pooled that is 11/12 per task — nowhere near a floor
        // or a ceiling — but no reference has any room to fall.
        const solved = arm === "stripped-all" ? r > 0 : true;
        recs.push({ slotId: `r${r}.${t}.${arm}`, task: t, arm, final: true, solved });
      }
    }
  }
  const s = summarize(recs, V2_ARMS, tasks);
  assert.deepEqual([s.byTask.t1.solved, s.byTask.t1.n], [11, 12], "pooled, the task looks fine");
  const g = evaluateGate(s, tasks, V2_REF_GATE, { complete: true });
  assert.equal(g.c.pass, false, "but the reference arms are at the ceiling on every task");
  assert.deepEqual(g.c.replaceTasks.map((x) => x.task), tasks);
  assert.equal(g.c.replaceTasks[0].at, "ceiling-in-reference");
  assert.deepEqual(g.c.replaceTasks[0].scope, ["candidate-U1", "A", "A-prime"]);
  assert.deepEqual([g.c.replaceTasks[0].solved, g.c.replaceTasks[0].n], [9, 9], "counted over the reference arms, not pooled");
  assert.equal(g.decision, "stop");
  // A task with real spread in the references is not listed.
  const spread = recs.map((r) => (r.task === "t3" && r.arm !== "stripped-all" && r.slotId.startsWith("r0.") ? { ...r, solved: false } : r));
  const g2 = evaluateGate(summarize(spread, V2_ARMS, tasks), tasks, V2_REF_GATE, { complete: true });
  assert.ok(!g2.c.replaceTasks.some((x) => x.task === "t3"), g2.c.replaceTasks.map((x) => x.task).join(", "));
});

test("a task already caught by the pooled check is not listed twice", () => {
  const recs = records({ A: perTask([3, 0, 2, 2, 2, 1]), "A-prime": perTask([3, 0, 2, 2, 2, 2]), stripped: perTask([3, 0, 0, 0, 1, 0]) });
  const g = evaluateGate(summarize(recs, ARMS, TASKS), TASKS, GATE, { complete: true });
  assert.deepEqual(g.c.replaceTasks.map((x) => x.task), ["t1", "t2"]);
  assert.deepEqual(g.c.replaceTasks.map((x) => x.at), ["ceiling", "floor"], "the pooled verdict wins");
});

test("(c) asks about the dimension the gate is using, not always about solved", () => {
  // Every arm solves everything — calibration measured 10 solves in 10
  // attempts, so this is the case v2 will actually be in — but the stripped
  // arm costs 45% more turns on every task. The verdict rests on effort, so
  // solved saturation must not veto it.
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 40, "stripped-all": 58 },
    solvedBy: () => 3,
  });
  const s = summarize(recs, V2_ARMS, E_TASKS);
  const e = effortMetrics(recs, V2_ARMS, E_TASKS);
  const g = evaluateGate(s, E_TASKS, V2_REF_GATE, { complete: true, effort: e });
  assert.equal(g.a.firedBy, "effort");
  assert.equal(g.c.dimension, "effort");
  assert.deepEqual(g.c.blocking, [], "spread on effort, so every task can discriminate");
  assert.equal(g.c.pass, true);
  assert.equal(g.decision, "go", g.reasons.join("; "));
  // Saturated tasks are still named for replacement — they just do not veto.
  assert.deepEqual(g.c.replaceTasks.map((x) => x.task), E_TASKS);
  assert.ok(g.c.replaceTasks.every((x) => x.at === "ceiling"));

  // The same campaign where the effort difference is inside the A/A noise:
  // now the tasks ARE uninformative in the dimension the gate is reading.
  const flat = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 40, "stripped-all": 40 },
    solvedBy: () => 3,
  });
  const gf = evaluateGate(summarize(flat, V2_ARMS, E_TASKS), E_TASKS, V2_REF_GATE, { complete: true, effort: effortMetrics(flat, V2_ARMS, E_TASKS) });
  assert.equal(gf.a.firedBy, null);
  assert.equal(gf.c.dimension, "solved", "no limb fired, so (c) falls back to the solved question");
  assert.deepEqual(gf.c.blocking, E_TASKS, "saturated on solved AND flat on effort discriminates in neither");
  assert.equal(gf.decision, "stop");
});

test("everything that blocks (c) is also listed for replacement", () => {
  // t1's stripped runs are all contaminated, so its effort is not measurable
  // while its reference arms are healthy. It blocks in the effort dimension —
  // and must therefore be the FIRST thing proposed for replacement, not
  // silently dropped while three sound tasks are swapped out instead.
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 40, "stripped-all": 58 },
    solvedBy: (arm, task) => (task === "t1" && arm !== "stripped-all" ? 2 : 3),
  }).map((r) => (r.task === "t1" && r.arm === "stripped-all" ? { ...r, contaminated: true } : r));
  const s = summarize(recs, V2_ARMS, E_TASKS);
  const g = evaluateGate(s, E_TASKS, V2_REF_GATE, { complete: true, effort: effortMetrics(recs, V2_ARMS, E_TASKS) });
  assert.equal(g.c.dimension, "effort");
  assert.deepEqual(g.c.blocking, ["t1"]);
  const named = g.c.replaceTasks.map((x) => x.task);
  for (const t of g.c.blocking) assert.ok(named.includes(t), `${t} blocks but is not listed for replacement`);
  assert.equal(g.c.replaceTasks.find((x) => x.task === "t1").at, "no-effort-data");
  assert.equal(named.filter((t) => t === "t1").length, 1, "and not listed twice");
  const report = buildReport({
    manifest: { campaign: "v2", model: "m", claudeVersion: "1", arms: V2_ARMS.map((label) => ({ label })), tasks: E_TASKS.map((id) => ({ id })), runsPerTask: 3, reserveTasks: ["r1", "r2"], schedule: recs.map((r) => ({ slotId: r.slotId })), gate: V2_REF_GATE },
    records: recs,
  });
  assert.equal(report.proposedReplacement.drop[0], "t1", "the task that stopped the gate is proposed first");
});

test("with no limb fired, (c) is the solved question it has always asked", () => {
  // The trap: the effort floor is the MEASURED A/A gap. Two baselines with
  // identical medians make it 0, and a floor of 0 calls every non-identical
  // task informative — which would pass (c) on a campaign the old rule failed.
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 40, "stripped-all": 44 }, // +10%: under the 25% margin, so nothing fires
    solvedBy: () => 3,
  });
  const s = summarize(recs, V2_ARMS, E_TASKS);
  const g = evaluateGate(s, E_TASKS, V2_REF_GATE, { complete: true, effort: effortMetrics(recs, V2_ARMS, E_TASKS) });
  assert.equal(g.a.firedBy, null, "neither limb fired");
  assert.equal(g.b.aaEffortGap, 0, "and the measured effort floor is zero");
  assert.equal(g.c.dimension, "solved");
  assert.deepEqual(g.c.blocking, E_TASKS, "every task is at the ceiling, exactly as the old rule said");
  assert.equal(g.decision, "stop");
});

test("(c) still fails a solved-saturated task when the verdict rests on solved", () => {
  const recs = effortRecords({
    arms: V2_ARMS,
    tasks: E_TASKS,
    turnsBy: { A: 40, "A-prime": 40, "candidate-U1": 40, "stripped-all": 40 },
    solvedBy: (arm) => (arm === "stripped-all" ? 0 : 3),
  });
  const g = evaluateGate(summarize(recs, V2_ARMS, E_TASKS), E_TASKS, V2_REF_GATE, { complete: true, effort: effortMetrics(recs, V2_ARMS, E_TASKS) });
  assert.equal(g.a.firedBy, "solved");
  assert.equal(g.c.dimension, "solved");
  assert.deepEqual(g.c.blocking, E_TASKS, "the references have no room to fall");
  assert.equal(g.decision, "stop");
});

// ---------------------------------------------------------------------------
// Budgets: an effort figure is unreadable without the budget it is against
// ---------------------------------------------------------------------------

test("the effective budget comes from the records, and every effort figure is shown over it", () => {
  const recs = effortRecords({ arms: ["A"], tasks: ["t1", "t2"], turnsBy: { A: (t) => (t === "t1" ? 83 : 31) } }).map((r) => ({
    ...r,
    // A task's own budgets replace the campaign caps; t2 keeps the default.
    budgets: r.task === "t1" ? { turns: 100, wallMinutes: 50 } : { turns: 120, wallMinutes: 60 },
  }));
  const b = effectiveBudgets(recs, ["t1", "t2"]);
  assert.deepEqual([b.t1.turns, b.t2.turns], [100, 120]);
  assert.equal(b.t1.varied, false);
  assert.equal(overBudget(83, 100), "83/100");
  assert.equal(overBudget(83, null), "83", "no budget known, no fraction invented");
  assert.equal(overBudget(null, 100), "n/a");
  // A slot whose runs disagree on their budget is flagged, not averaged away.
  const mixed = effectiveBudgets([...recs, { ...recs[0], budgets: { turns: 130 } }], ["t1", "t2"]);
  assert.equal(mixed.t1.varied, true);
  assert.deepEqual(mixed.t1.values, [100, 130]);
});

test("calibration.md prints turns over the budget the run actually had, and warns on thin headroom", () => {
  const tasks = ["quarry-terraces", "canopy-gaps"];
  const recs = [
    { slotId: "r0.quarry-terraces.A", task: "quarry-terraces", arm: "A", final: true, attempt: 1, solved: true, turns: 83, toolCalls: 90, wallMs: 1_800_000, usage: { output_tokens: 60_000 }, pcgCommands: { validate: 2 }, capsHit: [], graphProduced: true, budgets: { turns: 100, wallMinutes: 50 } },
    { slotId: "r0.canopy-gaps.A", task: "canopy-gaps", arm: "A", final: true, attempt: 1, solved: true, turns: 31, toolCalls: 34, wallMs: 300_000, usage: { output_tokens: 20_000 }, pcgCommands: { validate: 1 }, capsHit: [], graphProduced: true, budgets: { turns: 100, wallMinutes: 50 } },
  ];
  const manifest = {
    campaign: "calibration",
    model: "m",
    claudeVersion: "1",
    arms: [{ label: "A" }],
    tasks: tasks.map((id) => ({ id, tier: "held-out" })),
    runsPerTask: 1,
    schedule: recs.map((r) => ({ slotId: r.slotId })),
    gate: { mode: "calibration" },
  };
  const report = buildReport({ manifest, records: recs });
  assert.equal(report.calibration.rows[0].turnsBudget, 100);
  const md = renderCalibration(report);
  assert.match(md, /\| quarry-terraces \| held-out \| yes \| 83\/100 \|/, "the budget is printed beside the count");
  assert.match(md, /\| canopy-gaps \| held-out \| yes \| 31\/100 \|/);
  assert.match(md, /turns \/ budget/, "and the column says so");
  // 83 of 100 is under 50% spare; 31 of 100 is not.
  assert.match(md, /\*\*Headroom\.\*\*[^\n]*quarry-terraces used 83 of 100/);
  assert.ok(!/canopy-gaps used/.test(md), "a task with room is not warned about");
});

test("the record that counts is the latest ATTEMPT, not merely the last line", () => {
  // A re-ordered runs.jsonl must not retire the clean retry in favour of the
  // contaminated attempt it superseded.
  const a1 = { slotId: "r0.t1.A", task: "t1", arm: "A", attempt: 1, final: false, contaminated: true, solved: false };
  const a2 = { slotId: "r0.t1.A", task: "t1", arm: "A", attempt: 2, final: true, contaminated: false, solved: true };
  for (const order of [[a1, a2], [a2, a1]]) {
    const chosen = latestBySlot(order).get("r0.t1.A");
    assert.equal(chosen.attempt, 2, `order ${order.map((r) => r.attempt).join(",")}`);
    assert.equal(chosen.solved, true);
  }
  // Records with no attempt number still fall back to position.
  const noAttempt = [{ slotId: "s", solved: false }, { slotId: "s", solved: true }];
  assert.equal(latestBySlot(noAttempt).get("s").solved, true);
});

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const CAL_TASKS = ["t1", "t2", "t3"];
function calibrationManifest(extra = {}) {
  return {
    campaign: "calibration",
    model: "m",
    claudeVersion: "1",
    arms: [{ label: "A" }],
    tasks: CAL_TASKS.map((id) => ({ id, tier: "held-out" })),
    runsPerTask: 1,
    schedule: CAL_TASKS.map((t) => ({ slotId: `r0.${t}.A` })),
    gate: { mode: "calibration", baselineArms: ["A", "A-prime"], strippedArm: "stripped", aaMaxGap: 0.28, strippedMinMargin: 0.17 },
    ...extra,
  };
}

test("a calibration campaign is one arm at one run per task, declared or inferred", () => {
  assert.equal(isCalibration(calibrationManifest()), true);
  assert.equal(isCalibration({ arms: [{ label: "A" }], runsPerTask: 1 }), true, "one arm, one run: that IS a calibration");
  assert.equal(isCalibration({ arms: [{ label: "A" }, { label: "B" }], runsPerTask: 1 }), false);
  assert.equal(isCalibration({ arms: [{ label: "A" }], runsPerTask: 3 }), false);
  assert.equal(isCalibration({ arms: ARMS.map((label) => ({ label })), runsPerTask: 3, gate: GATE }), false, "the pilot is not a calibration");
});

test("calibration mode on a real campaign is refused, not honoured", () => {
  // The trap: gate is MERGED from the config defaults, so one stray key
  // reaches a full campaign, voids its gate, and prints a per-task table
  // claiming to be one run of one arm over 36 runs of three.
  const tasks = ["t1", "t2", "t3", "t4"];
  const recs = [];
  for (const arm of ARMS) {
    for (const t of tasks) for (let r = 0; r < 3; r++) recs.push({ slotId: `r${r}.${t}.${arm}`, task: t, arm, final: true, solved: arm !== "stripped" });
  }
  const manifest = {
    campaign: "v2",
    model: "m",
    claudeVersion: "1",
    arms: ARMS.map((label) => ({ label })),
    tasks: tasks.map((id) => ({ id })),
    runsPerTask: 3,
    schedule: recs.map((r) => ({ slotId: r.slotId })),
    gate: { ...GATE, mode: "calibration" },
  };
  assert.equal(hasCalibrationShape(manifest), false);
  assert.throws(() => isCalibration(manifest), /gate\.mode is "calibration" but the campaign has 3 arms and 3 runs per task/);
  assert.throws(() => buildReport({ manifest, records: recs }), /Remove gate\.mode/);
  // Without the stray key the same data is a normal, gated campaign.
  const ok = buildReport({ manifest: { ...manifest, gate: GATE }, records: recs });
  assert.equal(ok.calibration, null);
  assert.equal(ok.gate.decision, "stop", "stripped 0/12 vs 12/12, but every task is at a ceiling or floor");
  assert.equal(ok.summary.byArm.stripped.solved, 0);
});

/**
 * An `effortMetrics`-shaped object where EVERY metric has the same median,
 * so every metric hands the bootstrap bit-identical input. Built directly
 * rather than from records, because deriving one metric from another
 * (wall ms = turns x 10000) leaves float noise that would hide the bug.
 */
function effortFixture(perTask) {
  const cell = {};
  for (const [t, byArm] of Object.entries(perTask)) {
    cell[t] = {};
    for (const [arm, v] of Object.entries(byArm)) {
      const metrics = {};
      for (const m of EFFORT_METRICS) metrics[m.key] = { n: 3, mean: v, median: v, p25: v, p75: v };
      cell[t][arm] = { runs: 3, metrics };
    }
  }
  return { byArm: {}, cell };
}

test("the bootstrap draws a different resample per metric, and stays deterministic", () => {
  const e = effortFixture(Object.fromEntries(E_TASKS.map((t, i) => [t, { A: 20, "stripped-all": 20 + i * 4 }])));
  const p = pairedEffort(e, E_TASKS, "stripped-all", "A");
  // Premise: every metric's input to the bootstrap is the same array of
  // numbers, so one shared seed would draw the same task indices and give
  // six identical intervals. That is the bug this test exists for.
  const relOf = (k) => E_TASKS.map((t) => p.metrics[k].perTask[t].relative);
  for (const k of ["toolCalls", "wallMinutes", "outputTokens", "validateCalls", "probeGraphs"]) {
    assert.deepEqual(relOf(k), relOf("turns"), `premise: ${k} has identical input`);
  }
  const ci = (k) => [p.metrics[k].relativeCi.lo, p.metrics[k].relativeCi.hi];
  assert.ok(p.metrics.turns.relativeCi.lo !== null);
  // One seed for all six draws the SAME task indices, so identical inputs
  // give six byte-identical intervals. Separate seeds need not give six
  // DISTINCT ones — a bootstrap percentile is an order statistic that
  // converges, and two draws landing on the same value is the estimator
  // working — but they must not all be the one draw.
  const seen = new Set(EFFORT_METRICS.map((m) => JSON.stringify(ci(m.key))));
  assert.ok(seen.size > 1, `identical inputs gave one interval ${[...seen][0]} for all ${EFFORT_METRICS.length} metrics: that is one draw shown six times`);
  // A metric's delta and relative draws are separate too: the reference
  // median is 20 on every task, so delta = 20 x relative exactly, and one
  // seed would make deltaCi exactly 20 x relativeCi.
  assert.notEqual(p.metrics.turns.deltaCi.lo, p.metrics.turns.relativeCi.lo * 20);
  // Deterministic: same input, same intervals, every time.
  const again = pairedEffort(effortFixture(Object.fromEntries(E_TASKS.map((t, i) => [t, { A: 20, "stripped-all": 20 + i * 4 }]))), E_TASKS, "stripped-all", "A");
  for (const m of EFFORT_METRICS) assert.deepEqual(again.metrics[m.key].relativeCi, p.metrics[m.key].relativeCi, m.key);
  // The seed is a function of (arm, ref, metric, kind) and nothing else.
  assert.notEqual(seedFor(0x5eed, "stripped-all|A|turns|relative"), seedFor(0x5eed, "stripped-all|A|wallMinutes|relative"));
  assert.notEqual(seedFor(0x5eed, "stripped-all|A|turns|relative"), seedFor(0x5eed, "stripped-all|candidate|turns|relative"));
  assert.equal(seedFor(0x5eed, "x|y|turns|relative"), seedFor(0x5eed, "x|y|turns|relative"));
});

test("the relative CI reports the tasks that actually contributed to it", () => {
  // t1's reference median is 0, so no relative difference is defined there:
  // the delta pairing has 3 tasks, the relative one has 2.
  const recs = effortRecords({
    arms: ["A", "stripped-all"],
    tasks: ["t1", "t2", "t3"],
    turnsBy: { A: (t) => (t === "t1" ? 0 : 20), "stripped-all": (t) => (t === "t1" ? 5 : 30) },
  });
  const m = pairedEffort(effortMetrics(recs, ["A", "stripped-all"], ["t1", "t2", "t3"]), ["t1", "t2", "t3"], "stripped-all", "A").metrics.turns;
  assert.equal(m.tasks, 3, "three tasks were paired");
  assert.equal(m.relativeTasks, 2, "but only two could give a relative difference");
  assert.equal(m.perTask.t1.relative, null);
  close(m.meanRelative, 0.5);
});

test("the calibration table is one row per task, and the gate is skipped", () => {
  const recs = [
    { slotId: "r0.t1.A", task: "t1", arm: "A", final: true, solved: true, turns: 12, toolCalls: 14, wallMs: 180_000, usage: { output_tokens: 8000 }, pcgCommands: { validate: 1 }, capsHit: [], graphProduced: true, outcome: "ok" },
    { slotId: "r0.t2.A", task: "t2", arm: "A", final: true, solved: false, turns: 80, toolCalls: 90, wallMs: 1_800_000, usage: { output_tokens: 90_000 }, pcgCommands: { validate: 6 }, capsHit: ["turns"], graphProduced: true, outcome: "ok" },
    { slotId: "r0.t3.A", task: "t3", arm: "A", final: true, solved: false, turns: 30, toolCalls: 31, wallMs: 400_000, usage: { output_tokens: 20_000 }, pcgCommands: { validate: 0 }, capsHit: [], graphProduced: false, outcome: "ok" },
  ];
  const manifest = calibrationManifest();
  const report = buildReport({ manifest, records: recs });
  assert.equal(report.gate, null, "one run per task decides nothing");
  assert.equal(report.calibration.arm, "A");
  assert.deepEqual(
    report.calibration.rows.map((r) => [r.task, r.solved, r.turns, r.capsHit]),
    [["t1", 1, 12, []], ["t2", 0, 80, ["turns"]], ["t3", 0, 30, []]],
  );
  assert.deepEqual(report.calibration.totals.solved, 1);
  assert.deepEqual(report.calibration.totals.capsHit, ["turns"]);
  close(report.calibration.totals.wallMinutesTotal, 3 + 30 + 400 / 60);
  const md = renderCalibration(report);
  assert.match(md, /# Calibration: calibration/);
  assert.match(md, /\| t2 \| held-out \| no \| 80 \| 90 \| 30\.0 \| 90000 \| 6 \| turns \| – \|/);
  assert.match(md, /\| t3 \| held-out \| no graph \|/, "a task that produced no graph must say so");
  assert.match(renderMarkdown(report), /## No gate/);
  // A contaminated run is excluded here exactly as it is from a rate.
  const contaminated = calibrationTable([{ ...recs[0], contaminated: true }], manifest, ["A"], CAL_TASKS);
  assert.equal(contaminated.rows[0].runs, 0);
  assert.equal(contaminated.rows[0].solved, null);
  assert.equal(contaminated.rows[0].contaminated, 1);
});

test("writeReport writes calibration.md beside report.md, and only for a calibration", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-cal-"));
  try {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(calibrationManifest()));
    writeFileSync(
      join(dir, "runs.jsonl"),
      CAL_TASKS.map((t, i) => JSON.stringify({ slotId: `r0.${t}.A`, task: t, arm: "A", final: true, solved: i === 0, turns: 10 + i, toolCalls: 10, wallMs: 60_000, usage: { output_tokens: 100 }, capsHit: [], graphProduced: true })).join("\n") + "\n",
    );
    const r = writeReport(dir);
    assert.ok(existsSync(join(dir, "calibration.md")));
    assert.match(readFileSync(join(dir, "calibration.md"), "utf8"), /\| t1 \| held-out \| yes \| 10 \|/);
    assert.equal(r.progress.complete, true);
    assert.equal(r.gate, null);

    // The same directory with three arms and three runs is a normal campaign.
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ ...calibrationManifest(), arms: ARMS.map((label) => ({ label })), runsPerTask: 3, gate: GATE, schedule: [{ slotId: "r0.t1.A" }] }));
    rmSync(join(dir, "calibration.md"));
    const r2 = writeReport(dir);
    assert.equal(existsSync(join(dir, "calibration.md")), false);
    assert.ok(r2.gate, "a three-arm campaign is gated");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// The committed pilot must still read the same way
// ---------------------------------------------------------------------------

const PILOT = new URL("../results/pilot/", import.meta.url);
test("the committed pilot still reports the same gate and the same counts", { skip: !existsSync(new URL("manifest.json", PILOT)) && "pilot results not in this checkout" }, () => {
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", PILOT), "utf8"));
  const records = parseJsonl(readFileSync(new URL("runs.jsonl", PILOT), "utf8"), { tolerant: true });
  const committed = JSON.parse(readFileSync(new URL("report.json", PILOT), "utf8"));
  const fresh = buildReport({ manifest, records });
  assert.equal(fresh.gate.decision, committed.gate.decision);
  assert.equal(fresh.gate.decision, "stop");
  assert.deepEqual(fresh.progress, committed.progress);
  for (const arm of fresh.arms) {
    assert.deepEqual([fresh.summary.byArm[arm].solved, fresh.summary.byArm[arm].n], [committed.summary.byArm[arm].solved, committed.summary.byArm[arm].n], arm);
  }
  assert.deepEqual(fresh.gate.c.replaceTasks, committed.gate.c.replaceTasks);
  assert.equal(fresh.gate.a.effort, null, "the pilot's gate configures no effort thresholds, so it must keep the pilot's meaning");
  assert.equal(fresh.calibration, null);
  // What is NEW is the effort reporting, which the pilot's records already carry.
  assert.ok(fresh.effort.byArm.A.metrics.turns.median > 0);
  assert.equal(fresh.effortPaired.length, fresh.arms.length - 1);
});

test("paired deltas and a full report render", () => {
  const recs = records({ A: perTask([2, 2, 2, 1, 2, 1]), "A-prime": perTask([2, 1, 2, 2, 2, 1]), stripped: perTask([1, 0, 1, 0, 1, 0]) });
  const s = summarize(recs, ARMS, TASKS);
  const d = pairedDelta(s, TASKS, "stripped", "A");
  assert.equal(d.losses, 6);
  close(d.meanDelta, -(1 + 2 + 1 + 1 + 1 + 1) / 18);
  const schedule = recs.map((r) => ({ slotId: r.slotId }));
  const report = buildReport({ manifest: { campaign: "t", model: "m", claudeVersion: "1", arms: ARMS.map((label) => ({ label })), tasks: TASKS.map((id) => ({ id })), schedule, gate: GATE }, records: recs });
  assert.equal(report.progress.complete, true);
  assert.equal(report.gate.decision, "go");
  const md = renderMarkdown(report);
  assert.match(md, /Pilot gate: \*\*GO\*\*/);
  assert.match(md, /n = 18 runs per arm/);
});
