/**
 * boxesToMesh against the cell-to-instance tail, measured on a graph IN
 * MEMORY. The graph is tests/support/splitBoxCopyTail.json:
 * graphs/basics-split-box.json as it stood before the corpus adopted
 * boxesToMesh (frozen from fb047adb, byte for byte). The file is kept as
 * it was, as THE OLD IDIOM, and both sides below are built from it in
 * memory.
 *
 * The old idiom, and why it is not run as it stands. Its `blocks` wrote
 * WORLD corners from position() (P - [4, 0, 0.25] .. P + [4, h, 0.25]),
 * and its tail ran `centre` (P = box("center")), `size` (scale = the box
 * less 0.08, z cut to 0.2 on openings), a unit meshPrimitive box and a
 * copyToPoints topology "keep". A box is now an extent in its point's own
 * frame (world = P + rot * (scale * x)), so those corners count P twice,
 * and so does P = box("center") whenever P is not 0. Both sides therefore
 * start from the same LOCAL blocks: `blocks` with position() replaced by
 * [0, 0, 0], the box about the row point — exactly what setBounds anchor
 * "baseCenter" writes.
 *
 * - The INSTANCE side, the tail as it is written now: the cells after
 *   `jambs`, then pivotBox (P to each piece's centre, its box about it),
 *   the fixture's `size`, the unit box, copyToPoints "keep".
 * - The MESH side: the same cells, a placeBox `shrunk` that states the same
 *   shrink as a BOX (size = the `size` expression, anchor 0.5, fit "allow"
 *   because the 0.01 floor can exceed a sliver), and boxesToMesh, which
 *   builds every face through the cell's P.
 *
 * What is pinned, over 20 seeds: the topology is byte-identical (the point
 * and triangle layout is meshPrimitive's box laid on each cell, the default
 * faces in its order); the uv is the face frame shellSplit writes (u along,
 * v up, unmirrored seen from outside), checked point by point against the
 * stored box; every mesh vertex is EXACTLY f32(P + the stored face
 * coordinate) — the stored face mapped through the cell's transform and
 * rounded once; and the instance side's vertices, rebuilt from a pivoted
 * centre and a size, agree with them to within one f32 ulp and miss them
 * by that ulp on some coordinates (counted below). A control (the shrink
 * off by 0.001) shows the comparison can fail. With the shrink removed
 * (scale = box("size") on the instance side, the cells themselves on the
 * node) the instance side misses the cells' own stored faces on some
 * coordinates and the node on none.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cook, deserializeGraph } from "../src/index.js";
import type { Geometry } from "../src/data/index.js";
import type { DataCollection } from "../src/graph/index.js";

const FILE = fileURLToPath(new URL("./support/splitBoxCopyTail.json", import.meta.url));

type Json = Record<string, unknown>;
interface G {
  seed: number;
  nodes: Json[];
  connections: { from: [string, string]; to: [string, string] }[];
  outputs: Json[];
}

const load = (): G => JSON.parse(readFileSync(FILE, "utf8"));

/** Every {fn: "position"} in a field spec replaced by the constant [0, 0, 0]. */
function unplace(spec: unknown): unknown {
  if (Array.isArray(spec)) return spec.map(unplace);
  if (spec !== null && typeof spec === "object") {
    const o = spec as Json;
    if (o.fn === "position") return { fn: "vec", args: [0, 0, 0] };
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, unplace(v)]));
  }
  return spec;
}

/** The fixture with LOCAL blocks; returns the graph and the `size` expression. */
function localBlocks(seed: number, sizeExpr?: unknown): { g: G; size: unknown } {
  const g = load();
  g.seed = seed;
  const blocks = g.nodes.find((n) => n.id === "blocks") as { params: Json };
  blocks.params = unplace(blocks.params) as Json;
  const size = g.nodes.find((n) => n.id === "size") as { params: { value: unknown } };
  if (sizeExpr !== undefined) size.params.value = sizeExpr;
  return { g, size: size.params.value };
}

/** The instance side: `centre` replaced by pivotBox; the rest of the tail as frozen. */
function instanceSide(g: G): G {
  const out = structuredClone(g);
  out.nodes = out.nodes.filter((n) => n.id !== "centre");
  out.nodes.push({ id: "pivot", type: "pivotBox", params: {} });
  out.connections = out.connections.filter((c) => c.to[0] !== "centre" && c.from[0] !== "centre");
  out.connections.push({ from: ["jambs", "out"], to: ["pivot", "in"] }, { from: ["pivot", "out"], to: ["size", "in"] });
  return out;
}

/** The mesh side: the cells after `jambs`, shrunk as a box (unless `shrink` is false), then boxesToMesh. */
function meshSide(g: G, size: unknown, shrink = true): G {
  const out = structuredClone(g);
  out.nodes = out.nodes.filter((n) => !["centre", "size", "tint", "unitBox", "panels"].includes(n.id as string));
  out.connections = out.connections.filter((c) => !["centre", "size", "tint", "panels"].includes(c.to[0]));
  out.nodes.push({ id: "panels", type: "boxesToMesh", params: {} });
  if (shrink) {
    out.nodes.push({ id: "shrunk", type: "placeBox", params: { size, anchor: [0.5, 0.5, 0.5], fit: "allow" } });
    out.connections.push({ from: ["jambs", "out"], to: ["shrunk", "in"] }, { from: ["shrunk", "out"], to: ["panels", "in"] });
    out.outputs = [
      { id: "shrunk", pin: "out", name: "boxes" },
      { id: "panels", pin: "out", name: "panels" },
    ];
  } else {
    out.connections.push({ from: ["jambs", "out"], to: ["panels", "in"] });
    out.outputs = [
      { id: "jambs", pin: "out", name: "boxes" },
      { id: "panels", pin: "out", name: "panels" },
    ];
  }
  return out;
}

function geo(c: DataCollection | undefined): Geometry {
  const item = (c ?? []).find((i) => i.kind === "geometry");
  if (item === undefined || item.kind !== "geometry") throw new Error("no geometry");
  return item.geo;
}

/** shellSplit's face frame per face code, from its description: [axis, sign] of along and up. */
const FRAME: Record<number, { along: [number, number]; up: [number, number] }> = {
  0: { along: [0, 1], up: [2, 1] },
  1: { along: [0, -1], up: [1, 1] },
  2: { along: [0, 1], up: [1, 1] },
  3: { along: [2, 1], up: [1, 1] },
  4: { along: [2, -1], up: [1, 1] },
  5: { along: [0, 1], up: [2, -1] },
};

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
  tailOffFace: number;
  sameTopology: boolean;
  uvFrame: boolean;
  uvChanged: number;
}

async function measure(seed: number, sizeExpr?: unknown, shrink = true): Promise<Measure> {
  const { g, size } = localBlocks(seed, sizeExpr);
  const tail = geo((await cook(deserializeGraph(instanceSide(g)))).outputs.panels);
  const res = await cook(deserializeGraph(meshSide(g, size, shrink)));
  const mesh = geo(res.outputs.panels);
  const boxes = geo(res.outputs.boxes);

  const sameTopology =
    tail.pointCount === mesh.pointCount &&
    Array.from(tail.vertexToPoint).join() === Array.from(mesh.vertexToPoint).join() &&
    Array.from(tail.primVertexStart).join() === Array.from(mesh.primVertexStart).join() &&
    Array.from(tail.primVertexCount).join() === Array.from(mesh.primVertexCount).join();
  const pa = tail.attrs.point.require("P").data;
  const pb = mesh.attrs.point.require("P").data;
  const lo = boxes.attrs.point.require("boundsMin").data;
  const hi = boxes.attrs.point.require("boundsMax").data;
  const cellP = boxes.attrs.point.require("P").data;
  // The stored faces in the world: f32(P + the stored coordinate). The
  // cells are unrotated and unscaled, so that is the whole transform.
  const wLo = (cell: number, k: number) => Math.fround(cellP[cell * 3 + k] + lo[cell * 3 + k]) + 0;
  const wHi = (cell: number, k: number) => Math.fround(cellP[cell * 3 + k] + hi[cell * 3 + k]) + 0;

  // The uv is the face frame (u along, v up — shellSplit's): unsubdivided,
  // each component is 1 at the corner the frame axis runs TO and 0 at the
  // one it runs from.
  const uvA = tail.attrs.point.require("uv").data;
  const uvB = mesh.attrs.point.require("uv").data;
  const side = mesh.attrs.point.require("boxSide").data;
  let uvFrame = true;
  let uvChanged = 0;
  for (let p = 0; p < mesh.pointCount; p++) {
    const cell = Math.floor(p / 24);
    const fr = FRAME[side[p]];
    for (const [c, [axis, sign]] of [fr.along, fr.up].entries()) {
      if (lo[cell * 3 + axis] === hi[cell * 3 + axis]) continue;
      const atMax = pb[p * 3 + axis] === wHi(cell, axis);
      if (uvB[p * 2 + c] !== (sign > 0 ? (atMax ? 1 : 0) : atMax ? 0 : 1)) uvFrame = false;
    }
    if (uvA[p * 2] !== uvB[p * 2] || uvA[p * 2 + 1] !== uvB[p * 2 + 1]) uvChanged++;
  }
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
      const l = wLo(cell, k);
      const h = wHi(cell, k);
      if (b !== l && b !== h) offFace++;
      if (a !== l && a !== h) tailOffFace++;
      if (a !== b) {
        differ++;
        maxUlps = Math.max(maxUlps, Math.abs(a - b) / f32Ulp(b));
      }
    }
  }
  return { points: mesh.pointCount, coords: mesh.pointCount * 3, differ, maxUlps, offFace, tailOffFace, sameTopology, uvFrame, uvChanged };
}

describe('the unshrunk tail (scale = box("size")) against boxesToMesh on the cells themselves', () => {
  it("the pivoted tail's faces miss the stored box on some cells; the node's never do", async () => {
    let tailOff = 0;
    let coords = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = await measure(seed, { fn: "box", name: "size" }, false);
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

describe("boxesToMesh against basics-split-box's cell-to-instance tail, pivotBox first", () => {
  it("same topology on 20 seeds; every vertex on its stored box mapped through P; the tail within one ulp of it; uv the face frame", async () => {
    const rows: string[] = [];
    let totalDiffer = 0;
    let totalCoords = 0;
    let totalUvChanged = 0;
    let totalPoints = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const m = await measure(seed);
      expect(m.sameTopology).toBe(true);
      expect(m.uvFrame).toBe(true);
      expect(m.offFace).toBe(0);
      expect(m.maxUlps).toBeLessThanOrEqual(1);
      totalDiffer += m.differ;
      totalCoords += m.coords;
      totalUvChanged += m.uvChanged;
      totalPoints += m.points;
      rows.push(`seed ${seed}: ${m.points} points, ${m.differ}/${m.coords} coordinates differ, max ${m.maxUlps} ulp, ${m.uvChanged} uv changed`);
    }
    // eslint-disable-next-line no-console
    console.log(`basics-split-box drop-in:\n${rows.join("\n")}\ntotal ${totalDiffer}/${totalCoords}; uv changed on ${totalUvChanged}/${totalPoints} points`);
    expect(totalCoords).toBeGreaterThan(0);
    // The box primitive's uv is mirrored on three sides and upright on two:
    // the frame uv differs from it on a share of the points, not all.
    expect(totalUvChanged).toBeGreaterThan(0);
    expect(totalUvChanged).toBeLessThan(totalPoints);
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
    // The mesh side keeps the fixture's shrink; only the tail's is off.
    const { g, size } = localBlocks(1);
    const tail = geo((await cook(deserializeGraph(instanceSide(localBlocks(1, expr).g)))).outputs.panels);
    const mesh = geo((await cook(deserializeGraph(meshSide(g, size)))).outputs.panels);
    const pa = tail.attrs.point.require("P").data;
    const pb = mesh.attrs.point.require("P").data;
    let maxUlps = 0;
    expect(tail.pointCount).toBe(mesh.pointCount);
    for (let i = 0; i < mesh.pointCount * 3; i++) maxUlps = Math.max(maxUlps, Math.abs(pa[i] - pb[i]) / f32Ulp(pb[i]));
    expect(maxUlps).toBeGreaterThan(100);
  });

  it("the frozen idiom, run as it stands, now counts P twice: its world corners land 2P out", async () => {
    // The reason the sides above start from local blocks. The middle block
    // sits at P = 0, so it is the outer two that move.
    const g = load();
    g.nodes = g.nodes.filter((n) => !["centre", "size", "tint", "unitBox", "panels"].includes(n.id as string));
    g.connections = g.connections.filter((c) => !["centre", "size", "tint", "panels"].includes(c.to[0]));
    g.nodes.push({ id: "panels", type: "boxesToMesh", params: {} });
    g.connections.push({ from: ["jambs", "out"], to: ["panels", "in"] });
    g.outputs = [{ id: "panels", pin: "out", name: "panels" }];
    const p = geo((await cook(deserializeGraph(g))).outputs.panels).attrs.point.require("P").data;
    let xMax = -Infinity;
    for (let i = 0; i < p.length; i += 3) xMax = Math.max(xMax, p[i]);
    // The east block's box runs to 8 + 4; read twice through P, to 2 * 8 + 4.
    expect(xMax).toBe(20);
  });
});
