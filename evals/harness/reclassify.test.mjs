// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { RECLASSIFIED_FIELDS, applyRewrite, planRewrite, reclassifiedRecord } from "./reclassify.mjs";

const SANDBOX = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes\\pcg-eval-T1\\project" : "/var/tmp/pcg-eval/sandboxes/pcg-eval-T1/project";

/** A campaign directory with one slot per command, and its transcripts. */
function campaign(slots, { state = "done", dropTranscript = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), "pcg-reclass-"));
  const results = join(root, "results", "c");
  const runs = join(root, "runs", "c");
  mkdirSync(results, { recursive: true });
  const records = slots.map((s, i) => {
    const dir = join(runs, `${s.slotId}-a${s.attempt ?? 1}`);
    if (!dropTranscript.includes(s.slotId)) {
      mkdirSync(dir, { recursive: true });
      const events = [
        { type: "system", subtype: "init", cwd: SANDBOX, session_id: "sid" },
        ...s.commands.map((command, j) => ({ type: "assistant", message: { id: `m${j}`, content: [{ type: "tool_use", id: `t${j}`, name: "Bash", input: { command } }] } })),
      ];
      writeFileSync(join(dir, "transcript.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    }
    return {
      campaign: "c",
      slotId: s.slotId,
      slotIndex: i,
      task: s.task ?? "t1",
      arm: s.arm ?? "A",
      runIndex: 0,
      attempt: s.attempt ?? 1,
      final: s.final !== false,
      turns: 10,
      toolCalls: 4,
      wallMs: 60_000,
      usage: { output_tokens: 100 },
      capsHit: [],
      contaminated: s.contaminated ?? false,
      outsideContaminating: s.outsideContaminating ?? [],
      outsideBenign: [],
      outsideWrites: [],
      readCounts: { llms: 0, docs: 0, skills: 0, graphs: 0, pkg: 0 },
      readPaths: { llms: [], docs: [], skills: [], graphs: [], pkg: [] },
      networkAttempts: [],
      graphProduced: true,
      solved: s.solved ?? true,
      score: { solved: s.scoreSolved ?? true },
      transcript: { path: "nowhere/transcript.jsonl" },
    };
  });
  writeFileSync(join(results, "runs.jsonl"), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(join(results, "STATUS.json"), JSON.stringify({ state, pid: 4242 }));
  writeFileSync(
    join(results, "manifest.json"),
    JSON.stringify({
      campaign: "c",
      model: "m",
      claudeVersion: "1",
      arms: [{ label: "A" }],
      tasks: [...new Set(records.map((r) => r.task))].map((id) => ({ id })),
      runsPerTask: 1,
      schedule: records.map((r) => ({ slotId: r.slotId })),
      gate: { mode: "calibration" },
    }),
  );
  return { root, results, runs };
}

test("a rewrite re-derives only what the classifier owns", () => {
  const c = campaign([
    // Recorded contaminated over its own scratch file; the classifier now
    // sees the write that created it.
    { slotId: "r0.t1.A", contaminated: true, outsideContaminating: ["/tmp/a.svg"], solved: false, commands: ["npx pcg render graph.json --out /tmp/a.svg && cmp /tmp/a.svg /tmp/a.svg"] },
    { slotId: "r0.t2.A", task: "t2", commands: ["cat node_modules/pcg-ts/llms.txt"] },
  ]);
  try {
    const plan = planRewrite({ resultsDir: c.results, runsDir: c.runs });
    assert.equal(plan.ok, true, plan.refusals.join("; "));
    const moved = plan.changes.filter((x) => x.verdictMoved);
    assert.deepEqual(moved.map((x) => x.slotId), ["r0.t1.A"]);
    assert.equal(moved[0].before.contaminated, true);
    assert.equal(moved[0].after.contaminated, false);
    // The write is now recorded where it was invisible.
    const rewritten = plan.records.find((r) => r.slotId === "r0.t1.A");
    assert.equal(rewritten.outsideWrites.length, 1);
    // The second slot gains its read statistics.
    assert.equal(plan.records.find((r) => r.slotId === "r0.t2.A").readCounts.llms, 1);
    // Scores, solved, timings: untouched, on purpose.
    for (const key of ["solved", "score", "turns", "toolCalls", "wallMs", "usage", "final"]) {
      assert.deepEqual(rewritten[key], JSON.parse(readFileSync(join(c.results, "runs.jsonl"), "utf8").split("\n")[0])[key], key);
    }
    // ...which leaves solved disagreeing with the score, and that is REPORTED.
    assert.deepEqual(plan.inconsistent.map((x) => x.slotId), ["r0.t1.A"]);
    assert.ok(RECLASSIFIED_FIELDS.includes("contaminated") && !RECLASSIFIED_FIELDS.includes("solved"));
  } finally {
    rmSync(c.root, { recursive: true, force: true });
  }
});

test("a rewrite refuses a running campaign and a missing transcript, and writes nothing", () => {
  const running = campaign([{ slotId: "r0.t1.A", commands: ["ls"] }], { state: "running" });
  try {
    const plan = planRewrite({ resultsDir: running.results, runsDir: running.runs });
    assert.equal(plan.ok, false);
    assert.match(plan.refusals.join(" "), /RUNNING/);
    assert.throws(() => applyRewrite(plan), /refusing to write/);
  } finally {
    rmSync(running.root, { recursive: true, force: true });
  }

  const partial = campaign(
    [
      { slotId: "r0.t1.A", commands: ["ls"] },
      { slotId: "r0.t2.A", task: "t2", commands: ["ls"] },
    ],
    { dropTranscript: ["r0.t2.A"] },
  );
  try {
    const before = readFileSync(join(partial.results, "runs.jsonl"), "utf8");
    const plan = planRewrite({ resultsDir: partial.results, runsDir: partial.runs });
    assert.equal(plan.ok, false);
    assert.match(plan.refusals.join(" "), /r0\.t2\.A a1/);
    assert.match(plan.refusals.join(" "), /half in one classifier/);
    assert.throws(() => applyRewrite(plan), /refusing to write/);
    assert.equal(readFileSync(join(partial.results, "runs.jsonl"), "utf8"), before, "a refused rewrite writes nothing at all");
  } finally {
    rmSync(partial.root, { recursive: true, force: true });
  }
});

test("a written rewrite records its provenance in the report, not just the commit", () => {
  const c = campaign([
    { slotId: "r0.t1.A", contaminated: true, outsideContaminating: ["/tmp/a.svg"], solved: false, commands: ["npx pcg render graph.json --out /tmp/a.svg && cmp /tmp/a.svg /tmp/a.svg"] },
  ]);
  try {
    const plan = planRewrite({ resultsDir: c.results, runsDir: c.runs });
    const { provenance } = applyRewrite(plan, { now: new Date("2026-09-18T12:00:00Z"), harness: { sha: "abcdef1234567890", dirty: false } });
    assert.equal(provenance.verdictsMoved.length, 1);
    // runs.jsonl really changed...
    const rec = readFileSync(join(c.results, "runs.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))[0];
    assert.equal(rec.contaminated, false);
    assert.equal(rec.solved, false, "solved is still the scorer's, untouched");
    // ...and the sidecar plus the report say so.
    assert.ok(existsSync(join(c.results, "reclassified.json")));
    const md = readFileSync(join(c.results, "report.md"), "utf8");
    assert.match(md, /## Reclassified/);
    assert.match(md, /RE-DERIVED from their transcripts on 2026-09-18T12:00:00/);
    assert.match(md, /harness commit `abcdef1`/);
    assert.match(md, /\| r0\.t1\.A \| 1 \| contaminated \| clean \|/);
    assert.match(md, /solved.*deliberately not recomputed|not recomputed here/);
    // The note survives a later regeneration, because it is read from disk.
    const again = readFileSync(join(c.results, "report.json"), "utf8");
    assert.match(again, /"reclassified"/);
  } finally {
    rmSync(c.root, { recursive: true, force: true });
  }
});

test("a record whose classification did not move is left byte-identical", () => {
  const c = campaign([{ slotId: "r0.t1.A", commands: ["cat node_modules/pcg-ts/llms.txt"] }]);
  try {
    const first = planRewrite({ resultsDir: c.results, runsDir: c.runs });
    applyRewrite(first, { harness: { sha: "a".repeat(40), dirty: false } });
    const after = readFileSync(join(c.results, "runs.jsonl"), "utf8");
    // Running it again changes nothing: the rewrite is idempotent.
    const second = planRewrite({ resultsDir: c.results, runsDir: c.runs });
    assert.deepEqual(second.changes, [], "nothing left to change");
    applyRewrite(second, { harness: { sha: "a".repeat(40), dirty: false } });
    assert.equal(readFileSync(join(c.results, "runs.jsonl"), "utf8"), after);
  } finally {
    rmSync(c.root, { recursive: true, force: true });
  }
});

test("reclassifiedRecord touches exactly the classifier's fields", () => {
  const record = { slotId: "s", solved: true, score: { solved: true }, turns: 9, contaminated: true, outsideContaminating: ["/x"] };
  const parsed = {
    readPaths: { contaminating: [], outsideSandbox: ["/y"], llms: ["llms.txt"], docs: [], skills: [], graphs: [], pkg: [] },
    listedPaths: { llms: [], docs: ["docs"], skills: [], graphs: [], pkg: [] },
    outsideWrites: ["/y"],
    networkAttempts: [],
  };
  const next = reclassifiedRecord(record, parsed);
  assert.equal(next.contaminated, false);
  assert.deepEqual(next.outsideWrites, ["/y"]);
  assert.equal(next.readCounts.llms, 1);
  assert.deepEqual(next.listedPaths.docs, ["docs"]);
  // everything else is carried through untouched
  assert.equal(next.solved, true);
  assert.equal(next.turns, 9);
  assert.deepEqual(next.score, { solved: true });
});
