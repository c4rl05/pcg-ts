// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, evaluateGate, latestBySlot, pairedDelta, renderMarkdown, signTest, summarize, wilson } from "./report.mjs";

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
