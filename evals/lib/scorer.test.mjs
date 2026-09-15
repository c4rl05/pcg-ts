// node --test evals/lib/scorer.test.mjs   with PCG_EVAL_PKG set (skipped otherwise).
//
// Proves score.mjs's determinism and partition verdicts can say "different":
// a wrapper package re-exports the real one but perturbs one float of every
// second plain cook (or of every budgetMs 0 cook), and the scorer must notice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scoreGraph } from "../harness/score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = process.env.PCG_EVAL_PKG;
const needsPkg = PKG ? {} : { skip: "set PCG_EVAL_PKG to an installed pcg-ts directory" };
const TASK = join(HERE, "..", "tasks", "riverbank");
const REFERENCE = join(TASK, "reference.graph.json");

function wrapperPackage(mode) {
  const dir = mkdtempSync(join(tmpdir(), `pcg-eval-wrap-${mode}-`));
  const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
  const rel = (e) => (typeof e === "string" ? e : e.import);
  const root = pathToFileURL(join(PKG, rel(pkg.exports["."]))).href;
  const prims = pathToFileURL(join(PKG, rel(pkg.exports["./primitives"]))).href;
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "pcg-ts", type: "module", exports: { ".": "./index.mjs", "./primitives": "./primitives.mjs" } }),
  );
  writeFileSync(join(dir, "primitives.mjs"), `export * from ${JSON.stringify(prims)};\n`);
  writeFileSync(
    join(dir, "index.mjs"),
    `export * from ${JSON.stringify(root)};
import * as real from ${JSON.stringify(root)};
const MODE = ${JSON.stringify(mode)};
let plain = 0;
function nudge(outputs) {
  for (const coll of Object.values(outputs)) {
    for (const item of coll) {
      if (item.kind === "instances" && item.batches.length > 0 && item.batches[0].count > 0) {
        const t = item.batches[0].transforms;
        const f = new Float32Array([t[12]]);
        new Uint32Array(f.buffer)[0] += 1;
        t[12] = f[0];
        return;
      }
    }
  }
}
export async function cook(graph, opts = {}) {
  const r = await real.cook(graph, opts);
  if (MODE === "nondeterministic" && opts.budgetMs === undefined && ++plain % 2 === 0) nudge(r.outputs);
  if (MODE === "partition" && opts.budgetMs === 0) nudge(r.outputs);
  return r;
}
`,
  );
  return dir;
}

test("the real package: reference solved, deterministic, partition-safe", needsPkg, async () => {
  const r = await scoreGraph({ taskDir: TASK, graphPath: REFERENCE, pcgDir: PKG });
  assert.equal(r.solved, true, r.error);
  assert.equal(r.deterministic, true);
  assert.equal(r.partitionSafe, true);
  assert.equal(r.score, 1);
});

test("a cook that differs on re-run is reported non-deterministic and unsolved", needsPkg, async () => {
  const dir = wrapperPackage("nondeterministic");
  try {
    const r = await scoreGraph({ taskDir: TASK, graphPath: REFERENCE, pcgDir: dir });
    assert.equal(r.cooks, true);
    assert.equal(r.deterministic, false);
    assert.equal(r.partitionSafe, true);
    assert.equal(r.solved, false);
    assert.match(r.error, /two identical cooks produced different outputs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a budgetMs 0 cook that differs is reported partition-unsafe and unsolved", needsPkg, async () => {
  const dir = wrapperPackage("partition");
  try {
    const r = await scoreGraph({ taskDir: TASK, graphPath: REFERENCE, pcgDir: dir });
    assert.equal(r.deterministic, true);
    assert.equal(r.partitionSafe, false);
    assert.equal(r.solved, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing graph, bad JSON, invalid graph, missing output", needsPkg, async () => {
  const dir = mkdtempSync(join(tmpdir(), "pcg-eval-graphs-"));
  try {
    const none = await scoreGraph({ taskDir: TASK, graphPath: join(dir, "absent.json"), pcgDir: PKG });
    assert.equal(none.graphProduced, false);
    assert.equal(none.score, 0);

    writeFileSync(join(dir, "bad.json"), "{ not json");
    const bad = await scoreGraph({ taskDir: TASK, graphPath: join(dir, "bad.json"), pcgDir: PKG });
    assert.equal(bad.graphProduced, true);
    assert.equal(bad.validates, false);

    const ref = JSON.parse(readFileSync(REFERENCE, "utf8"));
    writeFileSync(join(dir, "unknown.json"), JSON.stringify({ ...ref, nodes: [...ref.nodes, { id: "x", type: "noSuchNode" }] }));
    const unknown = await scoreGraph({ taskDir: TASK, graphPath: join(dir, "unknown.json"), pcgDir: PKG });
    assert.equal(unknown.validates, false);
    assert.match(unknown.error, /noSuchNode/);

    writeFileSync(join(dir, "noout.json"), JSON.stringify({ ...ref, outputs: ref.outputs.filter((o) => o.name !== "driftwood") }));
    const noout = await scoreGraph({ taskDir: TASK, graphPath: join(dir, "noout.json"), pcgDir: PKG });
    assert.equal(noout.validates, false);
    assert.match(noout.error, /"driftwood"/);
    assert.equal(noout.solved, false);

    // An output declared under the right name but of the wrong kind cooks
    // nothing the contract asked for.
    const swapped = { ...ref, outputs: ref.outputs.map((o) => (o.name === "trees" ? { ...o, id: "treeSpecies", pin: "out" } : o)) };
    writeFileSync(join(dir, "kind.json"), JSON.stringify(swapped));
    const kind = await scoreGraph({ taskDir: TASK, graphPath: join(dir, "kind.json"), pcgDir: PKG });
    assert.equal(kind.validates, true);
    assert.equal(kind.cooks, false);
    assert.match(kind.error, /output "trees" holds no instances item/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
