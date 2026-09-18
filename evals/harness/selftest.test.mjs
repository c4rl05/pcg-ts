// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ConfigError, collectCanaries, detectLeak, judgeNegative, lintBrief, loadConfig, resolveArms, resolveFromRepo, selectTasks, validateTaskDir } from "./selftest.mjs";

const FIXTURE = fileURLToPath(new URL("fixtures/tasks/fixture-grid", import.meta.url));
const NAMES = {
  nodeTypes: ["pointScatterInBounds", "subgraph", "filterByExpression"],
  fieldFns: ["distance", "step", "atan2", "perlinNoise"],
  primitives: ["shape/disc", "fill/scatter-even"],
};

test("brief lint flags identifier-shaped names anywhere", () => {
  const hits = lintBrief("Use pointScatterInBounds to place them.\nThen atan2 the angle; try fill/scatter-even or just scatter-even.", NAMES);
  assert.deepEqual(hits.map((h) => h.name).sort(), ["atan2", "fill/scatter-even", "pointScatterInBounds", "scatter-even"]);
});

test("brief lint allows plain words in prose but flags them as code", () => {
  assert.deepEqual(lintBrief("Keep a distance of two units from the road; each step is small. A disc of trees.", NAMES), []);
  const hits = lintBrief('Compute `distance` to the path, then `fn: "step"`, or step(x). Also a subgraph and `disc`.', NAMES);
  assert.deepEqual(hits.map((h) => h.name).sort(), ["disc", "distance", "step"], "prose between two code spans is not code");
  assert.deepEqual(lintBrief("Wrap it in a `subgraph`.\nUse step (x) here.", NAMES).map((h) => [h.name, h.line]), [["subgraph", 1], ["step", 2]]);
});

test("brief lint: curly quotes count as quotes, identifier names match in any case", () => {
  assert.deepEqual(lintBrief("Shape it like a “disc”.", NAMES).map((h) => h.name), ["disc"]);
  assert.deepEqual(lintBrief("Use a PointScatterInBounds pass.", NAMES).map((h) => h.name), ["pointScatterInBounds"]);
  assert.deepEqual(lintBrief("Subgraph thinking is fine in prose.", NAMES), []);
});

test("brief lint does not match inside longer identifiers", () => {
  assert.deepEqual(lintBrief("pointScatterInBoundsExtra and myatan2 and shape/discs", NAMES), []);
});

test("the fixture task is valid and a broken one names its problems", () => {
  assert.deepEqual(validateTaskDir(FIXTURE).problems, []);
  const dir = join(mkdtempSync(join(tmpdir(), "pcg-selftest-")), "fixture-grid");
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    writeFileSync(join(dir, "negatives", "too-few.expect.json"), JSON.stringify({ failsCheck: "unit-spacing" }));
    writeFileSync(join(dir, "negatives", "orphan.expect.json"), JSON.stringify({ failsCheck: "count" }));
    rmSync(join(dir, "check.mjs"));
    const { problems } = validateTaskDir(dir);
    assert.ok(problems.some((p) => /missing check\.mjs/.test(p)), problems.join("\n"));
    assert.ok(problems.some((p) => /"unit-spacing" is not a hard check/.test(p)), problems.join("\n"));
    assert.ok(problems.some((p) => /orphan\.expect\.json has no matching/.test(p)), problems.join("\n"));
  } finally {
    rmSync(join(dir, ".."), { recursive: true, force: true });
  }
});

/** A tasks dir of bare task.json files: all selectTasks reads to choose. */
function tasksDir(spec) {
  const dir = mkdtempSync(join(tmpdir(), "pcg-tasksel-"));
  for (const [id, task] of Object.entries(spec)) {
    mkdirSync(join(dir, id), { recursive: true });
    writeFileSync(join(dir, id, "task.json"), JSON.stringify({ id, ...task }));
  }
  return dir;
}

test("tasks.campaign selects the task files that carry that campaign", () => {
  const dir = tasksDir({
    "a-v2": { campaign: "v2" },
    "b-v2": { campaign: "v2" },
    "c-pilot": { campaign: "pilot" },
    "d-plain": {},
    "e-v2-reserve": { campaign: "v2", reserve: true },
    "f-reserve": { reserve: true },
  });
  try {
    const sel = { campaign: "v2", dirs: [dir] };
    assert.deepEqual(selectTasks({ tasks: sel }).tasks.map((t) => t.id), ["a-v2", "b-v2", "e-v2-reserve"], "the campaign field selects, reserve does not filter it");
    // run.mjs finds the reserve pool by re-selecting over the same object with
    // include: "reserve" — which must keep meaning every reserve task.
    assert.deepEqual(selectTasks({ tasks: { ...sel, include: "reserve" } }).tasks.map((t) => t.id), ["e-v2-reserve", "f-reserve"]);
    assert.deepEqual(selectTasks({ tasks: { ...sel, include: ["c-pilot"] } }).tasks.map((t) => t.id), ["c-pilot"], "an explicit include list wins");
    // The default pool must not grow when another campaign's tasks are authored.
    assert.deepEqual(selectTasks({ tasks: { dirs: [dir] } }).tasks.map((t) => t.id), ["d-plain"], "a campaign-tagged task is not in the default pool");
    assert.deepEqual(selectTasks({ tasks: { include: "non-reserve", dirs: [dir] } }).tasks.map((t) => t.id), ["d-plain"]);
    assert.deepEqual(selectTasks({ tasks: { include: "all", dirs: [dir] } }).tasks.map((t) => t.id), ["a-v2", "b-v2", "c-pilot", "d-plain", "e-v2-reserve", "f-reserve"], '"all" still means all');
    assert.throws(() => selectTasks({ campaign: "v3", tasks: { campaign: "v3", dirs: [dir] } }), (err) => err instanceof ConfigError && /no task\.json carries "campaign": "v3"/.test(err.message));
    assert.throws(() => selectTasks({ campaign: "v2", expectTaskCount: 8, tasks: sel }), /expects 8 tasks and found 3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a task's campaign field must be a non-empty string", () => {
  const dir = join(mkdtempSync(join(tmpdir(), "pcg-selftest-")), "fixture-grid");
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    const task = JSON.parse(readFileSync(join(dir, "task.json"), "utf8"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({ ...task, campaign: "v2" }));
    assert.deepEqual(validateTaskDir(dir).problems, [], "a campaign field is allowed");
    writeFileSync(join(dir, "task.json"), JSON.stringify({ ...task, campaign: 2 }));
    assert.ok(validateTaskDir(dir).problems.some((p) => /campaign must be a non-empty string/.test(p)));
  } finally {
    rmSync(join(dir, ".."), { recursive: true, force: true });
  }
});

const CONFIG = fileURLToPath(new URL("../eval.config.json", import.meta.url));
const PILOT_MANIFEST = new URL("../results/pilot/manifest.json", import.meta.url);

test("the shipped config's campaigns are shaped the way the runner needs", () => {
  const v2 = loadConfig(CONFIG, "v2");
  assert.deepEqual(v2.arms.map((a) => a.label), ["A", "A-prime", "candidate-U1", "stripped-all"]);
  assert.equal(v2.arms[0].tarball, v2.arms[1].tarball, "A and A-prime must be the SAME tarball: that is the noise floor");
  assert.match(v2.arms[3].tarball, /stripped-all-/);
  assert.deepEqual(v2.tasks, { campaign: "v2" });
  assert.equal(v2.runsPerTask, 3);
  assert.equal(v2.expectTaskCount, 8);
  assert.equal(v2.gate.strippedArm, "stripped-all");
  assert.ok(v2.gate.strippedEffortMinMargin > v2.gate.aaMaxEffortGap, "an effect must have to clear the A/A allowance");
  assert.ok(v2.gate.effortMetric === "turns" && v2.gate.effortCiMustExcludeZero === true);
  assert.ok(Number.isInteger(v2.scheduleSeed));

  const cal = loadConfig(CONFIG, "calibration");
  assert.equal(cal.arms.length, 1);
  assert.equal(cal.arms[0].tarball, v2.arms[0].tarball, "calibration runs the baseline arm");
  assert.equal(cal.runsPerTask, 1);
  assert.deepEqual(cal.tasks, { campaign: "v2" });
  assert.equal(cal.gate.mode, "calibration");

  // The pilot's gate must not have picked up v2's effort thresholds, its
  // reference arm, or the calibration mode.
  const pilot = loadConfig(CONFIG, "pilot");
  assert.equal(pilot.gate.strippedArm, "stripped");
  assert.equal(pilot.gate.strippedEffortMinMargin, undefined);
  assert.equal(pilot.gate.strippedRefArm, undefined);
  assert.equal(pilot.gate.mode, undefined);
  // stripped-all was CUT FROM candidate-U1, so that is what limb (a) measures
  // it against; against a baseline off another commit the strip and the
  // library change would be one effect.
  assert.equal(v2.gate.strippedRefArm, "candidate-U1");
  assert.ok(v2.arms.some((a) => a.label === v2.gate.strippedRefArm), "the reference arm has to be in the campaign");
});

// The whole point of strippedRefArm: the reference has to be the tarball the
// stripped arm was actually cut from, or limb (a) measures two changes at once.
test("v2's reference arm IS the tarball stripped-all was derived from", { skip: !existsSync(resolveFromRepo(loadConfig(CONFIG, "v2").arms[0].tarball)) && "tarballs not on this machine" }, () => {
  const v2 = loadConfig(CONFIG, "v2");
  const resolved = resolveArms(v2);
  const stripped = resolved.find((a) => a.label === v2.gate.strippedArm);
  const parent = resolved.find((a) => a.label === v2.gate.strippedRefArm);
  assert.ok(stripped && parent, "both arms are in the campaign");
  assert.equal(stripped.manifest.derivedFrom.sha256, parent.sha256);
  assert.deepEqual(stripped.manifest.stripSets, ["docs", "graphs"]);
});

test("a calibration mode on a campaign that is not shaped like one is refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-calcfg-"));
  try {
    const tasks = tasksDir({ "a-v2": { campaign: "v2" } });
    const base = {
      model: "m",
      prompt: "x",
      publicTasksDir: tasks,
      gate: { baselineArms: ["A", "A-prime"], strippedArm: "stripped", aaMaxGap: 0.28, strippedMinMargin: 0.17 },
      campaigns: {
        // The trap: `gate` is merged, so one stray key reaches a full campaign.
        bad: { arms: [{ label: "A", tarball: "x" }, { label: "B", tarball: "y" }], runsPerTask: 3, gate: { mode: "calibration" } },
        good: { arms: [{ label: "A", tarball: "x" }], runsPerTask: 1, gate: { mode: "calibration" } },
        plain: { arms: [{ label: "A", tarball: "x" }], runsPerTask: 3 },
      },
    };
    const cfg = join(dir, "eval.config.json");
    writeFileSync(cfg, JSON.stringify(base));
    assert.throws(
      () => loadConfig(cfg, "bad"),
      (err) => err instanceof ConfigError && /gate\.mode is "calibration" but the campaign has 2 arms and 3 runs per task/.test(err.message),
    );
    assert.equal(loadConfig(cfg, "good").gate.mode, "calibration");
    assert.equal(loadConfig(cfg, "plain").gate.mode, undefined);
    rmSync(tasks, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("adding campaigns did not change the pilot's identity", { skip: !existsSync(PILOT_MANIFEST) && "pilot results not in this checkout" }, () => {
  const manifest = JSON.parse(readFileSync(PILOT_MANIFEST, "utf8"));
  const pilot = loadConfig(CONFIG, "pilot");
  // Everything identityParts() in run.mjs derives from the CONFIG. (The
  // harness code hash is not one of these: it changes when the harness
  // changes, which is what it is for.)
  assert.equal(pilot.model, manifest.model);
  assert.equal(pilot.effort ?? null, manifest.effort ?? null);
  assert.equal(pilot.runsPerTask, manifest.runsPerTask);
  assert.equal(pilot.scheduleSeed, manifest.scheduleSeed);
  assert.equal(pilot.prompt, manifest.prompt);
  assert.deepEqual(pilot.caps, manifest.caps);
  assert.deepEqual(pilot.arms.map((a) => a.label), manifest.arms.map((a) => a.label));
  assert.deepEqual(pilot.arms.map((a) => a.tarball.replace(/\\/g, "/")), manifest.arms.map((a) => a.tarball));
  // The task list is identity too, and v2's tasks live in the same dirs: they
  // must not have joined the pilot's selection.
  assert.deepEqual(selectTasks(pilot).tasks.map((t) => t.id), manifest.tasks.map((t) => t.id));
});

const TASK = { checks: [{ id: "count", hard: true }, { id: "square", hard: true }, { id: "soft", hard: false }] };
const score = (checks, extra = {}) => ({ graphProduced: true, validates: true, cooks: true, deterministic: true, partitionSafe: true, solved: false, checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { pass: v }])), ...extra });

test("a negative must fail exactly its named hard check", () => {
  assert.equal(judgeNegative(TASK, { failsCheck: "count" }, score({ count: false, square: true, soft: false })).ok, true);
  const two = judgeNegative(TASK, { failsCheck: "count" }, score({ count: false, square: false, soft: true }));
  assert.equal(two.ok, false);
  assert.match(two.why, /also fails hard check\(s\) square/);
  assert.equal(judgeNegative(TASK, { failsCheck: "count" }, score({ count: true, square: true })).ok, false);
  assert.equal(judgeNegative(TASK, { failsCheck: "count" }, score({ count: false, square: true }, { solved: true })).ok, false);
  assert.match(judgeNegative(TASK, { failsCheck: "count" }, score({ count: false, square: true }, { cooks: false })).why, /fails cooks/);
  assert.equal(judgeNegative(TASK, { failsCheck: "deterministic" }, score({ count: true, square: true }, { deterministic: false })).ok, true);
  // review repro: a gate-field negative that also fails earlier gates proves nothing
  assert.equal(judgeNegative(TASK, { failsCheck: "partitionSafe" }, score({}, { validates: false, cooks: false, partitionSafe: false })).ok, false);
  assert.equal(judgeNegative(TASK, { failsCheck: "partitionSafe" }, score({ count: false, square: true }, { partitionSafe: false })).ok, false);
  assert.equal(judgeNegative(TASK, { failsCheck: "partitionSafe" }, score({ count: true, square: true }, { partitionSafe: false, deterministic: false })).ok, false);
  assert.equal(judgeNegative(TASK, { failsCheck: "cooks" }, score({}, { cooks: false, deterministic: false, partitionSafe: false })).ok, true);
  assert.equal(judgeNegative(TASK, { failsCheck: "cooks" }, score({}, { validates: false, cooks: false })).ok, false);
  assert.equal(judgeNegative(TASK, { failsCheck: "deterministic" }, score({ count: true, square: true }, { deterministic: false, partitionSafe: undefined })).ok, false, "an unreported partitionSafe is not a pass");
  assert.equal(judgeNegative(TASK, { failsCheck: "count" }, score({ count: false, square: true }, { partitionSafe: null })).ok, false, "nor for a check-id negative");
});

test("leak detection: init lists, canary phrases and names; a clean reply passes", () => {
  const canaries = { phrases: ["Unattended build protocol"], names: ["kanban-code"] };
  const cleanInit = { mcp_servers: [], plugins: [], skills: [], slash_commands: [], output_style: "default", apiKeySource: "none", agents: ["claude", "Explore"] };
  assert.equal(detectLeak({ init: cleanInit, finalText: "1. NONE\n2. NONE" }, canaries).leak, false);
  assert.equal(detectLeak({ init: cleanInit, finalText: "## Unattended  build protocol\n..." }, canaries).leak, true);
  assert.equal(detectLeak({ init: cleanInit, finalText: "3. Skills: kanban-code" }, canaries).leak, true);
  assert.equal(detectLeak({ init: { ...cleanInit, mcp_servers: [{ name: "x" }] }, finalText: "NONE" }, canaries).leak, true);
  assert.equal(detectLeak({ init: { ...cleanInit, apiKeySource: "ANTHROPIC_API_KEY" }, finalText: "NONE" }, canaries).leak, true);
  assert.equal(detectLeak({ init: { ...cleanInit, agents: ["claude", "kanban-code"] }, finalText: "NONE" }, canaries).leak, true);
});

test("canaries come from a repo CLAUDE.md in scope", () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-canary-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# Tiny\n\n## A distinctive heading here\n\ntext\n### short\n");
    const c = collectCanaries({ leakCwd: dir, home: dir });
    assert.ok(c.phrases.includes("A distinctive heading here"));
    assert.ok(!c.phrases.includes("short"), "short headings are too generic to be canaries");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
