// node --test evals/lib/geometry.test.mjs evals/lib/digest.test.mjs evals/lib/scorer.test.mjs
// The package-backed tests need PCG_EVAL_PKG = an installed pcg-ts directory
// (e.g. a temp project with the U0 baseline tarball installed); without it
// they are skipped, and the fake-item tests still run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { digestOutputs } from "./digest.mjs";
import { instanceFrame, instancesOf, polylinesOf, trianglesOf } from "./items.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = process.env.PCG_EVAL_PKG;
const needsPkg = PKG ? {} : { skip: "set PCG_EVAL_PKG to an installed pcg-ts directory" };

function fakeInstances() {
  const transforms = new Float32Array(32);
  for (let k = 0; k < 2; k++) {
    transforms[k * 16] = 1;
    transforms[k * 16 + 5] = 1;
    transforms[k * 16 + 10] = 1;
    transforms[k * 16 + 15] = 1;
    transforms[k * 16 + 12] = k * 3;
  }
  return { kind: "instances", tags: new Set(), batches: [{ assetId: "pine", count: 2, transforms }] };
}

test("digest: identical fake items agree; any changed byte, id or order disagrees", () => {
  const base = digestOutputs({ trees: [fakeInstances()] });
  assert.equal(digestOutputs({ trees: [fakeInstances()] }), base);

  const nudged = fakeInstances();
  // The smallest possible change: one float32 ULP.
  const v = new Float32Array([nudged.batches[0].transforms[28]]);
  const bits = new Uint32Array(v.buffer);
  bits[0] += 1;
  nudged.batches[0].transforms[28] = v[0];
  assert.notEqual(digestOutputs({ trees: [nudged] }), base);

  const renamed = fakeInstances();
  renamed.batches[0].assetId = "birch";
  assert.notEqual(digestOutputs({ trees: [renamed] }), base);

  assert.notEqual(digestOutputs({ forest: [fakeInstances()] }), base, "output name is part of the digest");
  assert.notEqual(digestOutputs({ trees: [fakeInstances(), fakeInstances()] }), base, "item count");

  const zero = fakeInstances();
  zero.batches[0].transforms[12] = -0; // -0 and +0 are different bytes
  assert.notEqual(digestOutputs({ trees: [zero] }), base);

  // Spare capacity past `count` is not output.
  const spare = fakeInstances();
  const longer = new Float32Array(48);
  longer.set(spare.batches[0].transforms);
  longer[40] = 99;
  spare.batches[0].transforms = longer;
  assert.equal(digestOutputs({ trees: [spare] }), base);
});

test("instanceFrame decomposes a composed transform", () => {
  // Yaw 90 deg about +Y, scale (2, 3, 4), translate (5, 6, 7), column-major.
  // R_y(90): x -> (0, 0, -1), z -> (1, 0, 0).
  const m = new Float64Array(16);
  m.set([0, 0, -2, 0], 0);
  m.set([0, 3, 0, 0], 4);
  m.set([4, 0, 0, 0], 8);
  m.set([5, 6, 7, 1], 12);
  const f = instanceFrame(m, 0);
  assert.deepEqual(f.position, [5, 6, 7]);
  assert.deepEqual(f.scale, [2, 3, 4]);
  assert.deepEqual(f.axisX, [0, 0, -1]);
  assert.deepEqual(f.axisZ, [1, 0, 0]);
});

async function loadPkg() {
  const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
  const rel = (e) => (typeof e === "string" ? e : e.import);
  const pcg = await import(pathToFileURL(join(PKG, rel(pkg.exports["."]))).href);
  await import(pathToFileURL(join(PKG, rel(pkg.exports["./primitives"]))).href);
  return pcg;
}

const RIVERBANK = join(HERE, "..", "tasks", "riverbank", "reference.graph.json");

test("digest over a real cook: same cook agrees, perturbed cook disagrees", needsPkg, async () => {
  const pcg = await loadPkg();
  const json = JSON.parse(readFileSync(RIVERBANK, "utf8"));
  const cookAt = async (seed, opts = {}) => {
    const g = pcg.deserializeGraph(json);
    g.setSeed(seed);
    return (await pcg.cook(g, opts)).outputs;
  };
  const a = await cookAt(1);
  const b = await cookAt(1);
  const c = await cookAt(1, { budgetMs: 0 });
  const da = digestOutputs(a);
  assert.equal(digestOutputs(b), da, "two cooks at one seed");
  assert.equal(digestOutputs(c), da, "a budgetMs 0 cook");

  assert.notEqual(digestOutputs(await cookAt(2)), da, "another seed moves the trees");

  // One ULP on one tree's X.
  const t = [...b.trees][0].batches[0].transforms;
  const cell = new Float32Array([t[12]]);
  new Uint32Array(cell.buffer)[0] += 1;
  t[12] = cell[0];
  assert.notEqual(digestOutputs(b), da, "one float32 ULP in one instance transform");

  // One ULP in the river polyline's first point.
  const river = [...c.river][0].geo.attrs.point.get("P").data;
  const p = new Float32Array([river[0]]);
  new Uint32Array(p.buffer)[0] += 1;
  river[0] = p[0];
  assert.notEqual(digestOutputs(c), da, "one float32 ULP in a geometry point");
});

test("items read a real cook", needsPkg, async () => {
  const pcg = await loadPkg();
  const g = pcg.deserializeGraph(JSON.parse(readFileSync(RIVERBANK, "utf8")));
  const out = (await pcg.cook(g)).outputs;
  const trees = instancesOf(out.trees);
  assert.equal(trees.count, 1425);
  assert.equal(new Set(trees.assetIds).size, 3);
  const lines = polylinesOf(out.river);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].vertexCount, 48);
  assert.equal(polylinesOf(out.ground).length, 0, "a mesh holds no polyline");
  assert.equal(trianglesOf(out.ground).length / 9, 1152);
  assert.equal(trianglesOf(out.river).length, 0, "a polyline holds no triangle");
});
