/**
 * copyToPoints under a MIRRORING target (`mirrorAware`): a target whose
 * scale has an odd number of negative components must reverse each
 * copied face's winding and reflect the `rotateAttrs` directions, so a
 * mirrored solid still faces outward with normals that agree with it.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, createPointCloud, createPolyline, createTriangleMesh } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { copyToPoints } from "./index.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

/**
 * A unit cube centred on the origin: 24 points (4 per face), a point
 * `normal` pointing out of each face, triangles wound counter-clockwise
 * seen from outside, and a vertex attribute naming each corner's point.
 */
function cube(): Geometry {
  const faces: { n: [number, number, number]; u: [number, number, number]; v: [number, number, number] }[] = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  const tris: number[] = [];
  faces.forEach((f, k) => {
    // u x v = n, so (c, c+u, c+u+v, c+v) is counter-clockwise seen along -n.
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      for (let i = 0; i < 3; i++) pos.push(0.5 * (f.n[i] + a * f.u[i] + b * f.v[i]));
      nrm.push(...f.n);
    }
    const o = k * 4;
    tris.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const geo = createTriangleMesh(pos, tris);
  const N = geo.attrs.point.add("normal", "f32", 3, [0, 0, 0]);
  N.writable().set(nrm);
  const corner = geo.attrs.vertex.add("corner", "f32", 1, -1);
  for (let v = 0; v < geo.vertexCount; v++) corner.set(v, geo.vertexToPoint[v]);
  return geo;
}

interface Target {
  readonly P: [number, number, number];
  readonly rot?: [number, number, number, number];
  readonly scale: [number, number, number];
}

function targets(list: readonly Target[]): Geometry {
  const geo = createPointCloud(list.length);
  const P = geo.attrs.point.require("P");
  const rot = geo.attrs.point.require("rot");
  const scale = geo.attrs.point.require("scale");
  list.forEach((t, i) => {
    P.setTuple(i, t.P);
    rot.setTuple(i, t.rot ?? [0, 0, 0, 1]);
    scale.setTuple(i, t.scale);
  });
  return geo;
}

async function copy(source: Geometry, target: Geometry, params: Record<string, unknown> = {}): Promise<Geometry> {
  const out = await runNode(copyToPoints, { topology: "keep", rotateAttrs: ["normal"], ...params }, {
    source: [makeGeometryItem(source)],
    target: [makeGeometryItem(target)],
  });
  return firstGeo(out.out);
}

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: number[]) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Per triangle of the copy on target `t` (24 source points per block, 12
 * triangles per block): does its WINDING face away from the copy's centre,
 * and does every corner's `normal` agree with that winding?
 */
function faceReport(out: Geometry, t: number, centre: number[]): { outward: boolean[]; agree: boolean[] } {
  const P = out.attrs.point.require("P");
  const N = out.attrs.point.require("normal");
  const outward: boolean[] = [];
  const agree: boolean[] = [];
  for (let k = 0; k < 12; k++) {
    const p = t * 12 + k;
    const s = out.primVertexStart[p];
    const ids = [0, 1, 2].map((i) => out.vertexToPoint[s + i]);
    const [a, b, c] = ids.map((i) => P.getTuple(i));
    const g = unit(cross(sub(b, a), sub(c, a)));
    const centroid = [0, 1, 2].map((i) => (a[i] + b[i] + c[i]) / 3);
    outward.push(dot(sub(centroid, centre), g) > 0);
    agree.push(ids.every((i) => dot(unit(N.getTuple(i)), g) > 0.999));
  }
  return { outward, agree };
}

const S = Math.SQRT1_2;
const ALL = Array<boolean>(12).fill(true);
const NONE = Array<boolean>(12).fill(false);

describe("copyToPoints mirrorAware", () => {
  it("a mirrored copy of a cube keeps outward winding and outward normals that agree with it", async () => {
    const tgt = targets([
      { P: [0, 0, 0], scale: [1, 1, 1] },
      { P: [5, 0, 0], rot: [0, S, 0, S], scale: [-1, 1, 1] }, // mirror, then a quarter turn
      { P: [0, 5, 0], scale: [1, -1, -1] }, // a half turn, NOT a mirror
      { P: [0, 0, 5], rot: [S, 0, 0, S], scale: [-2, -2, -2] }, // uniform point reflection, scaled
      { P: [9, 9, 9], rot: [0.5, 0.5, 0.5, 0.5], scale: [1, -3, 1] }, // non-uniform mirror
    ]);
    const out = await copy(cube(), tgt);
    const centres = [
      [0, 0, 0],
      [5, 0, 0],
      [0, 5, 0],
      [0, 0, 5],
      [9, 9, 9],
    ];
    centres.forEach((c, t) => {
      const r = faceReport(out, t, c);
      expect(r.outward, `target ${t} winding`).toEqual(ALL);
      expect(r.agree, `target ${t} normals`).toEqual(ALL);
    });
  });

  it("vertex attributes follow their corners through the reversal; polylines keep their order", async () => {
    const out = await copy(cube(), targets([{ P: [0, 0, 0], scale: [-1, 1, 1] }]));
    const corner = out.attrs.vertex.require("corner");
    for (let v = 0; v < out.vertexCount; v++) expect(corner.get(v)).toBe(out.vertexToPoint[v]);
    // The fan root stays first: triangle (o, o+1, o+2) becomes (o, o+2, o+1).
    expect([0, 1, 2].map((i) => out.vertexToPoint[i])).toEqual([0, 2, 1]);

    const path = createPolyline([0, 0, 0, 1, 0, 0, 2, 0, 1]);
    const copied = await copy(path, targets([{ P: [0, 0, 0], scale: [-1, 1, 1] }]), { rotateAttrs: [] });
    expect(Array.from(copied.vertexToPoint)).toEqual([0, 1, 2]);
  });

  it("off, a mirrored copy is inside out — the behaviour before the param existed", async () => {
    const out = await copy(cube(), targets([{ P: [5, 0, 0], scale: [-1, 1, 1] }]), { mirrorAware: false });
    const r = faceReport(out, 0, [5, 0, 0]);
    expect(r.outward).toEqual(NONE);
  });

  it("with no negative scale anywhere the output is byte-identical either way", async () => {
    const tgt = targets([
      { P: [1, 2, 3], rot: [0, S, 0, S], scale: [2, 1, 0.5] },
      { P: [0, 0, 0], scale: [1, 1, 1] },
    ]);
    const on = await copy(cube(), tgt);
    const off = await copy(cube(), tgt, { mirrorAware: false });
    expect(snapshotGeometry(on)).toEqual(snapshotGeometry(off));
  });

  it("under per-target selection, mirrored and unmirrored blocks each keep their primitives", async () => {
    const src = cube();
    const key = src.attrs.point.add("part", "i32", 1, 0);
    for (let i = 0; i < src.pointCount; i++) key.set(i, i < 12 ? 0 : 1);
    const tgt = targets([
      { P: [0, 0, 0], scale: [1, 1, 1] },
      { P: [5, 0, 0], scale: [-1, 1, 1] },
    ]);
    const ask = tgt.attrs.point.add("want", "i32", 1, 0);
    ask.set(0, 0);
    ask.set(1, 0);
    const out = await copy(src, tgt, { sourceGroupAttr: "part", targetGroupAttr: "want" });
    // Faces 0..2 (points 0..11) survive per target: 6 triangles each.
    expect(out.primitiveCount).toBe(12);
    const P = out.attrs.point.require("P");
    for (let p = 6; p < 12; p++) {
      const s = out.primVertexStart[p];
      const [a, b, c] = [0, 1, 2].map((i) => P.getTuple(out.vertexToPoint[s + i]));
      const g = cross(sub(b, a), sub(c, a));
      const centroid = [0, 1, 2].map((i) => (a[i] + b[i] + c[i]) / 3);
      expect(dot(sub(centroid, [5, 0, 0]), g)).toBeGreaterThan(0);
    }
  });
});
