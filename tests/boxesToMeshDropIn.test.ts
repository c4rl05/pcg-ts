/**
 * boxesToMesh as a drop-in for the hand-built cell-to-mesh tail, measured on
 * a corpus graph IN MEMORY (the corpus file is not edited here).
 *
 * graphs/basics-split-box.json ends in the four-node tail: `centre`
 * (P = box("center")), `size` (scale = the box less 0.08, z cut to 0.2 on
 * openings), a unit meshPrimitive box `unitBox`, and `panels`, a
 * copyToPoints topology "keep" of the unit box onto the cells. `centre` and
 * `size` also feed the `pieces` output, so they stay; the copy is replaced
 * by a placeBox that states the same shrink as a BOX (size = the same
 * expression, anchor 0.5, fit "allow" because the 0.01 floor can exceed a
 * sliver) and a boxesToMesh on it.
 *
 * What is pinned, over 20 seeds: the topology and the uv are byte-identical
 * (the layout is meshPrimitive's box laid on each cell, the default faces in
 * its order); every new vertex lies EXACTLY on the placed box's stored faces;
 * the tail's vertices, rebuilt as f32(c + s * +-0.5), agree with them to
 * within one f32 ulp, and on some boxes miss them by that ulp (measured:
 * 7056 of 193320 coordinates over seeds 1-20, every one by exactly one
 * ulp). A control (the shrink off by 0.001) shows the comparison can fail.
 * With the shrink removed (scale = box("size") on the tail, the cells
 * themselves on the node) the tail misses the cells' own stored faces on
 * 17424 of 193320 coordinates and the node on none.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cook, deserializeGraph } from "../src/index.js";
import type { Geometry } from "../src/data/index.js";
import type { DataCollection } from "../src/graph/index.js";

const FILE = fileURLToPath(new URL("../graphs/basics-split-box.json", import.meta.url));

type Json = Record<string, unknown>;
interface G {
  seed: number;
  nodes: Json[];
  connections: { from: [string, string]; to: [string, string] }[];
  outputs: Json[];
}

const load = (): G => JSON.parse(readFileSync(FILE, "utf8"));

/** The tail replaced: unitBox and panels out, placeBox `shrunk` and boxesToMesh `panels` in. */
function dropIn(g: G, sizeExpr?: unknown): G {
  const out = structuredClone(g);
  const size = out.nodes.find((n) => n.id === "size") as { params: { value: unknown } };
  out.nodes = out.nodes.filter((n) => n.id !== "unitBox" && n.id !== "panels");
  out.nodes.push(
    { id: "shrunk", type: "placeBox", params: { size: sizeExpr ?? size.params.value, anchor: [0.5, 0.5, 0.5], fit: "allow" } },
    { id: "panels", type: "boxesToMesh", params: {} },
  );
  out.connections = out.connections.filter((c) => c.to[0] !== "panels");
  out.connections.push({ from: ["tint", "out"], to: ["shrunk", "in"] }, { from: ["shrunk", "out"], to: ["panels", "in"] });
  out.outputs.push({ id: "shrunk", pin: "out", name: "shrunk" });
  return out;
}

function geo(c: DataCollection | undefined): Geometry {
  const item = (c ?? []).find((i) => i.kind === "geometry");
  if (item === undefined || item.kind !== "geometry") throw new Error("no geometry");
  return item.geo;
}

const f32Ulp = (x: number): number => {
  const a = Math.abs(Math.fround(x));
  if (a === 0) return 2 ** -149;
  const e = Math.floor(Math.log2(a));
  return 2 ** (Math.max(e, -126) - 23);
};

interface Measure {
  points: number;
  coords: number;
  differ: number;
  maxUlps: number;
  offFace: number;
}

async function measure(
  seed: number,
  sizeExpr?: unknown,
  tailToo = false,
): Promise<Measure & { sameTopology: boolean; sameUv: boolean; tailOffFace: number }> {
  const base = load();
  base.seed = seed;
  if (tailToo) (base.nodes.find((n) => n.id === "size") as { params: { value: unknown } }).params.value = sizeExpr;
  const tail = geo((await cook(deserializeGraph(base))).outputs.panels);
  const next = dropIn(base, sizeExpr);
  const res = await cook(deserializeGraph(next));
  const mesh = geo(res.outputs.panels);
  const boxes = geo(res.outputs.shrunk);

  const sameTopology =
    tail.pointCount === mesh.pointCount &&
    Array.from(tail.vertexToPoint).join() === Array.from(mesh.vertexToPoint).join() &&
    Array.from(tail.primVertexStart).join() === Array.from(mesh.primVertexStart).join() &&
    Array.from(tail.primVertexCount).join() === Array.from(mesh.primVertexCount).join();
  const uvA = tail.attrs.point.require("uv").data;
  const uvB = mesh.attrs.point.require("uv").data;
  let sameUv = uvA.length >= tail.pointCount * 2;
  for (let i = 0; i < mesh.pointCount * 2; i++) if (uvA[i] !== uvB[i]) sameUv = false;

  const pa = tail.attrs.point.require("P").data;
  const pb = mesh.attrs.point.require("P").data;
  const lo = boxes.attrs.point.require("boundsMin").data;
  const hi = boxes.attrs.point.require("boundsMax").data;
  let differ = 0;
  let maxUlps = 0;
  let offFace = 0;
  let tailOffFace = 0;
  const per = 24; // points per cell: six unsubdivided faces
  for (let p = 0; p < Math.min(tail.pointCount, mesh.pointCount); p++) {
    const cell = Math.floor(p / per);
    for (let k = 0; k < 3; k++) {
      const a = pa[p * 3 + k];
      const b = pb[p * 3 + k];
      const l = lo[cell * 3 + k];
      const h = hi[cell * 3 + k];
      if (b !== l && b !== h) offFace++;
      if (a !== l && a !== h) tailOffFace++;
      if (a !== b) {
        differ++;
        maxUlps = Math.max(maxUlps, Math.abs(a - b) / f32Ulp(b));
      }
    }
  }
  return { points: mesh.pointCount, coords: mesh.pointCount * 3, differ, maxUlps, offFace, tailOffFace, sameTopology, sameUv };
}

describe("the unshrunk tail (scale = box(\"size\")) against boxesToMesh on the cells themselves", () => {
  it("the tail's faces miss the stored box on some cells; the node's never do", async () => {
    let tailOff = 0;
    let coords = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = await measure(seed, { fn: "box", name: "size" }, true);
      expect(m.sameTopology).toBe(true);
      expect(m.offFace).toBe(0);
      expect(m.maxUlps).toBeLessThanOrEqual(1);
      tailOff += m.tailOffFace;
      coords += m.coords;
    }
    // eslint-disable-next-line no-console
    console.log(`unshrunk tail: ${tailOff}/${coords} coordinates off the stored box`);
    expect(tailOff).toBeGreaterThan(0);
  }, 60_000);
});

describe("boxesToMesh drops in for basics-split-box's copyToPoints tail", () => {
  it("same topology and uv on 20 seeds; every new vertex on its stored box; the tail within one ulp of it", async () => {
    const rows: string[] = [];
    let totalDiffer = 0;
    let totalCoords = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = await measure(seed);
      expect(m.sameTopology).toBe(true);
      expect(m.sameUv).toBe(true);
      expect(m.offFace).toBe(0);
      expect(m.maxUlps).toBeLessThanOrEqual(1);
      totalDiffer += m.differ;
      totalCoords += m.coords;
      rows.push(`seed ${seed}: ${m.points} points, ${m.differ}/${m.coords} coordinates differ, max ${m.maxUlps} ulp`);
    }
    // eslint-disable-next-line no-console
    console.log(`basics-split-box drop-in:\n${rows.join("\n")}\ntotal ${totalDiffer}/${totalCoords}`);
    expect(totalCoords).toBeGreaterThan(0);
  }, 60_000);

  it("the control: a shrink 0.001 off moves vertices by far more than an ulp", async () => {
    const expr = {
      fn: "vec",
      args: [
        { fn: "max", args: [{ fn: "sub", args: [{ fn: "box", name: "sx" }, 0.081] }, 0.01] },
        { fn: "max", args: [{ fn: "sub", args: [{ fn: "box", name: "sy" }, 0.08] }, 0.01] },
        { fn: "mul", args: [{ fn: "box", name: "sz" }, { fn: "select", args: [{ fn: "attributeIs", name: "piece", value: "opening" }, 0.2, 1] }] },
      ],
    };
    const m = await measure(1, expr);
    expect(m.sameTopology).toBe(true);
    expect(m.maxUlps).toBeGreaterThan(100);
  });
});
