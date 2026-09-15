// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { collectCanaries, detectLeak, judgeNegative, lintBrief, validateTaskDir } from "./selftest.mjs";

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
