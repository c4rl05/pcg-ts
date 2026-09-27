/**
 * Independent verification of copyToPoints' `mirrorAware`: expectations
 * derived here from the transform P = tP + R * (S * sP), not from the
 * implementation. A mirrored closed solid must keep a POSITIVE signed
 * volume (divergence theorem over its faces' own winding), and a
 * `rotateAttrs` direction must come out as R * sign(S) * n on every domain.
 */
import { describe, expect, it } from "vitest";
import { Geometry, PRIMTYPE_ATTR, createPointCloud } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { copyToPoints } from "./index.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";

type V3 = [number, number, number];
type Q = [number, number, number, number];

const sub = (a: readonly number[], b: readonly number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: readonly number[], b: readonly number[]): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: readonly number[]): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Unit quaternion from an axis and an angle. */
function quat(axis: V3, angle: number): Q {
  const a = unit(axis);
  const s = Math.sin(angle / 2);
  return [a[0] * s, a[1] * s, a[2] * s, Math.cos(angle / 2)];
}

/** Rotate by a unit quaternion through its matrix (independent of the node's rotateVec). */
function rotate(q: readonly number[], v: readonly number[]): V3 {
  const [x, y, z, w] = q;
  const m = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
}

/** Newell area vector of a polygon (valid for non-convex planar polygons). */
function areaVector(pts: number[][]): V3 {
  const a: V3 = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const c = cross(pts[i], pts[(i + 1) % pts.length]);
    a[0] += c[0] / 2;
    a[1] += c[1] / 2;
    a[2] += c[2] / 2;
  }
  return a;
}

/**
 * Build a geometry from explicit polygons: a P column, topology through the
 * public setTopology, a per-primitive `primtype` (null = no column at all),
 * a vertex `cid` naming each corner's point, and a primitive `fn` and
 * vertex `vn` holding the face's unit Newell normal.
 */
function build(
  pts: number[][],
  faces: number[][],
  types: (string | undefined)[] | null,
  layout?: { v2p: number[]; start: number[]; count: number[] },
): Geometry {
  const geo = new Geometry();
  const P = geo.attrs.point.add("P", "f32", 3);
  geo.attrs.point.resize(pts.length);
  pts.forEach((p, i) => P.setTuple(i, p));
  const v2p = layout ? layout.v2p : faces.flat();
  const start: number[] = [];
  const count: number[] = [];
  if (layout) {
    start.push(...layout.start);
    count.push(...layout.count);
  } else {
    let s = 0;
    for (const f of faces) {
      start.push(s);
      count.push(f.length);
      s += f.length;
    }
  }
  geo.setTopology(Uint32Array.from(v2p), Uint32Array.from(start), Uint32Array.from(count));
  if (types) {
    const tag = geo.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "");
    types.forEach((t, p) => {
      if (t !== undefined) tag.setString(p, t);
    });
  }
  const cid = geo.attrs.vertex.add("cid", "f32", 1, -1);
  const vn = geo.attrs.vertex.add("vn", "f32", 3, [0, 0, 0]);
  const fn = geo.attrs.primitive.add("fn", "f32", 3, [0, 0, 0]);
  for (let v = 0; v < geo.vertexCount; v++) cid.set(v, 99); // gap slots keep a sentinel
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p];
    const n = geo.primVertexCount[p];
    const ids = Array.from({ length: n }, (_, i) => geo.vertexToPoint[s + i]);
    const g = n >= 3 ? unit(areaVector(ids.map((i) => pts[i]))) : ([1, 0, 0] as V3);
    fn.setTuple(p, g);
    for (let i = 0; i < n; i++) {
      cid.set(s + i, ids[i]);
      vn.setTuple(s + i, g);
    }
  }
  return geo;
}

/**
 * A NON-CONVEX closed solid: an L-shaped hexagon (area 3) extruded by 1,
 * with hexagonal caps and quad sides, wound outward. Volume 3.
 */
function lPrism(offset: V3 = [0.3, -0.7, 0.2]): { pts: number[][]; faces: number[][] } {
  const ring = [
    [0, 0],
    [2, 0],
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 2],
  ];
  const pts: number[][] = [];
  for (const z of [0, 1]) for (const [x, y] of ring) pts.push([x + offset[0], y + offset[1], z + offset[2]]);
  const faces: number[][] = [
    [6, 7, 8, 9, 10, 11], // top, +z
    [0, 5, 4, 3, 2, 1], // bottom, -z
  ];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    faces.push([i, j, j + 6, i + 6]);
  }
  return { pts, faces };
}

interface Target {
  P: V3;
  rot?: Q;
  scale: V3;
  want?: number;
}

function targetCloud(list: Target[], opts: { noRot?: boolean; noScale?: boolean } = {}): Geometry {
  const geo = createPointCloud(list.length);
  const P = geo.attrs.point.require("P");
  list.forEach((t, i) => P.setTuple(i, t.P));
  if (opts.noRot) geo.attrs.point.remove("rot");
  else list.forEach((t, i) => geo.attrs.point.require("rot").setTuple(i, t.rot ?? [0, 0, 0, 1]));
  if (opts.noScale) geo.attrs.point.remove("scale");
  else list.forEach((t, i) => geo.attrs.point.require("scale").setTuple(i, t.scale));
  if (list.some((t) => t.want !== undefined)) {
    const w = geo.attrs.point.add("want", "i32", 1, 0);
    list.forEach((t, i) => w.set(i, t.want ?? 0));
  }
  return geo;
}

async function cook(source: Geometry, target: Geometry, params: Record<string, unknown> = {}): Promise<Geometry> {
  const out = await runNode(
    copyToPoints,
    { topology: "keep", rotateAttrs: ["fn", "vn"], targetIndexAttr: "tIdx", ...params },
    { source: [makeGeometryItem(source)], target: [makeGeometryItem(target)] },
  );
  return firstGeo(out.out);
}

interface Face {
  prim: number;
  target: number;
  pts: number[][];
  cids: number[];
  fn: number[];
  vns: number[][];
}

/** Every output primitive, with its corners' positions in its own winding order. */
function facesOf(out: Geometry): Face[] {
  const P = out.attrs.point.require("P");
  const tIdx = out.attrs.point.require("tIdx");
  const cid = out.attrs.vertex.require("cid");
  const vn = out.attrs.vertex.require("vn");
  const fn = out.attrs.primitive.require("fn");
  const faces: Face[] = [];
  for (let p = 0; p < out.primitiveCount; p++) {
    const s = out.primVertexStart[p];
    const n = out.primVertexCount[p];
    const ids = Array.from({ length: n }, (_, i) => out.vertexToPoint[s + i]);
    faces.push({
      prim: p,
      target: tIdx.get(ids[0]),
      pts: ids.map((i) => P.getTuple(i)),
      cids: Array.from({ length: n }, (_, i) => cid.get(s + i)),
      fn: fn.getTuple(p),
      vns: Array.from({ length: n }, (_, i) => vn.getTuple(s + i)),
    });
    // Every corner of one primitive must sit in ONE target block.
    for (const i of ids) expect(tIdx.get(i)).toBe(tIdx.get(ids[0]));
  }
  return faces;
}

/** Signed volume of a closed polygon mesh by the divergence theorem (fan tetrahedra). */
function signedVolume(faces: Face[]): number {
  let vol = 0;
  for (const f of faces) {
    for (let i = 1; i + 1 < f.pts.length; i++) vol += dot(f.pts[0], cross(f.pts[i], f.pts[i + 1])) / 6;
  }
  return vol;
}

const sgn = (x: number) => (x < 0 ? -1 : 1);
const expectedDir = (t: Target, n: number[]): V3 =>
  rotate(t.rot ?? [0, 0, 0, 1], [n[0] * sgn(t.scale[0]), n[1] * sgn(t.scale[1]), n[2] * sgn(t.scale[2])]);
const isMirror = (t: Target) => sgn(t.scale[0]) * sgn(t.scale[1]) * sgn(t.scale[2]) < 0;
const uniformMag = (t: Target) =>
  Math.abs(t.scale[0]) === Math.abs(t.scale[1]) && Math.abs(t.scale[1]) === Math.abs(t.scale[2]);
const reversed = (c: number[]) => [c[0], ...c.slice(1).reverse()];

function expectClose(a: number[], b: number[], tol = 1e-5, msg = ""): void {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i]), `${msg} [${a}] vs [${b}]`).toBeLessThan(tol);
}

/**
 * The whole contract for a closed solid: per target block, the signed
 * volume is +V0 * |det S|, each face's corners come in source or reversed
 * order as its target mirrors, and every rotated direction is R sign(S) n,
 * lies in the outward hemisphere of the face's actual winding, and is
 * exactly parallel to it under a uniform scale.
 */
function checkSolid(
  out: Geometry,
  list: Target[],
  srcFaces: number[][],
  srcFn: number[][],
  v0: number,
  expectFaces: (t: number) => number[] | null, // source face indices expected per target, in order
): void {
  const faces = facesOf(out);
  list.forEach((t, ti) => {
    const mine = faces.filter((f) => f.target === ti);
    const want = expectFaces(ti);
    if (want === null) {
      expect(mine.length, `target ${ti}`).toBe(0);
      return;
    }
    expect(mine.length, `target ${ti} face count`).toBe(want.length);
    const det = Math.abs(t.scale[0] * t.scale[1] * t.scale[2]);
    const vol = signedVolume(mine);
    expect(vol, `target ${ti} signed volume`).toBeGreaterThan(0);
    expect(Math.abs(vol - v0 * det) / (v0 * det), `target ${ti} volume magnitude`).toBeLessThan(1e-4);
    mine.forEach((f, k) => {
      const sf = want[k];
      const order = srcFaces[sf];
      expect(f.cids, `target ${ti} face ${k} corner order`).toEqual(isMirror(t) ? reversed(order) : order);
      const g = unit(areaVector(f.pts));
      const e = expectedDir(t, srcFn[sf]);
      expectClose(f.fn, e, 1e-5, `target ${ti} face ${k} fn`);
      expect(dot(f.fn, g), `target ${ti} face ${k} fn hemisphere`).toBeGreaterThan(0);
      if (uniformMag(t)) expect(dot(f.fn, g)).toBeGreaterThan(0.99999);
      for (const n of f.vns) {
        expectClose(n, e, 1e-5, `target ${ti} face ${k} vn`);
        expect(dot(n, g)).toBeGreaterThan(0);
      }
    });
  });
}

/**
 * Exact bits of a numeric column: widening to f64 is lossless for every
 * f32/i32/u32 value and keeps -0 distinct, which `toEqual` on plain
 * numbers would not guarantee.
 */
const bytes = (a: ArrayLike<number>): number[] => Array.from(new Uint8Array(Float64Array.from(a).buffer));

const HALF = Math.PI / 2;
const MANY: Target[] = [
  { P: [0, 0, 0], scale: [1, 1, 1] },
  { P: [10, 0, 0], scale: [-1, 1, 1] },
  { P: [0, 10, 0], rot: quat([0, 0, 1], HALF), scale: [1, -1, 1] },
  { P: [0, 0, 10], rot: quat([1, 2, 3], 1.1), scale: [1, 1, -1] },
  { P: [5, 5, 5], rot: quat([-1, 0.5, 2], 2.7), scale: [-1, -1, -1] }, // point reflection: a mirror
  { P: [-5, 5, 5], rot: quat([0, 1, 0], 0.4), scale: [-1, -1, 1] }, // half turn, NOT a mirror
  { P: [-5, -5, 5], rot: quat([3, -1, 1], 1.9), scale: [-2, 0.5, 3] }, // non-uniform mirror
  { P: [5, -5, -5], rot: quat([0, 1, 1], -0.8), scale: [2, -3, -0.5] }, // non-uniform, not a mirror
  { P: [7, 7, -7], rot: quat([1, 1, 1], 2), scale: [-3, -3, -3] }, // uniform, scaled mirror
];

describe("copyToPoints mirrorAware — independent verification", () => {
  it("a non-convex closed solid keeps a positive signed volume and agreeing normals under every mirror", async () => {
    const { pts, faces } = lPrism();
    const src = build(pts, faces, faces.map(() => "poly"));
    const srcFn = faces.map((f) => unit(areaVector(f.map((i) => pts[i]))));
    // Sanity on the fixture itself: outward, volume 3.
    const srcFaces = facesOf(await cook(src, targetCloud([{ P: [0, 0, 0], scale: [1, 1, 1] }])));
    expect(signedVolume(srcFaces)).toBeCloseTo(3, 5);

    const out = await cook(src, targetCloud(MANY));
    checkSolid(out, MANY, faces, srcFn, 3, () => faces.map((_, i) => i));
  });

  it("the check can FAIL: with mirrorAware off the mirrored blocks come out with negative volume", async () => {
    const { pts, faces } = lPrism();
    const src = build(pts, faces, faces.map(() => "poly"));
    const out = await cook(src, targetCloud(MANY), { mirrorAware: false });
    const all = facesOf(out);
    MANY.forEach((t, ti) => {
      const vol = signedVolume(all.filter((f) => f.target === ti));
      expect(Math.sign(vol), `target ${ti}`).toBe(isMirror(t) ? -1 : 1);
    });
  });

  it("a mirrored tetrahedron built from triangles, on a target with no rot column", async () => {
    const pts = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const faces = [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ];
    const src = build(pts, faces, faces.map(() => "poly"));
    const srcFn = faces.map((f) => unit(areaVector(f.map((i) => pts[i]))));
    const list: Target[] = [
      { P: [0, 0, 0], scale: [1, -1, 1] },
      { P: [3, 0, 0], scale: [1, 1, 1] },
      { P: [6, 0, 0], scale: [-4, -4, 1] },
    ];
    const out = await cook(src, targetCloud(list, { noRot: true }));
    checkSolid(out, list, faces, srcFn, 1 / 6, () => faces.map((_, i) => i));
  });

  it("a target cloud with no scale column mirrors nothing", async () => {
    const { pts, faces } = lPrism();
    const src = build(pts, faces, faces.map(() => "poly"));
    const out = await cook(src, targetCloud([{ P: [1, 0, 0], rot: quat([0, 1, 0], 1), scale: [1, 1, 1] }], { noScale: true }));
    expect(Array.from(out.vertexToPoint)).toEqual(faces.flat());
  });

  it("mixed mirrored and unmirrored targets under per-target selection; a straddling face goes nowhere", async () => {
    const a = lPrism([0, 0, 0]);
    const b = lPrism([5, 0, 0]);
    const pts = [...a.pts, ...b.pts];
    const faces = [...a.faces, ...b.faces.map((f) => f.map((i) => i + 12)), [0, 12, 13]]; // last one straddles
    const src = build(pts, faces, faces.map(() => "poly"));
    const part = src.attrs.point.add("part", "i32", 1, 0);
    for (let i = 0; i < pts.length; i++) part.set(i, i < 12 ? 0 : 1);
    const srcFn = faces.map((f) => unit(areaVector(f.map((i) => pts[i]))));
    const list: Target[] = [
      { P: [0, 0, 0], scale: [1, 1, 1], want: 0 },
      { P: [20, 0, 0], rot: quat([0, 0, 1], 0.7), scale: [-1, 1, 1], want: 1 },
      { P: [0, 20, 0], scale: [1, 1, -2], want: 0 },
      { P: [0, 0, 20], rot: quat([1, 0, 0], 1.3), scale: [-1, -1, 1], want: 1 },
      { P: [9, 9, 9], scale: [-1, 1, 1], want: 7 }, // matches nothing
      { P: [-9, 9, 9], rot: quat([1, 1, 0], 2.2), scale: [-1, 1, 1], want: 0 }, // second mirrored target on group 0
      { P: [-9, -9, 9], scale: [1, 1, 1], want: 1 },
    ];
    const out = await cook(src, targetCloud(list), { sourceGroupAttr: "part", targetGroupAttr: "want" });
    const g0 = a.faces.map((_, i) => i);
    const g1 = b.faces.map((_, i) => i + 8);
    checkSolid(out, list, faces, srcFn, 3, (t) => (list[t].want === 0 ? g0 : list[t].want === 1 ? g1 : null));
    // cid is a SOURCE point index; with selection the block's local numbering must still land on it.
    const P = out.attrs.point.require("P");
    const cid = out.attrs.vertex.require("cid");
    const tIdx = out.attrs.point.require("tIdx");
    for (let v = 0; v < out.vertexCount; v++) {
      const pt = out.vertexToPoint[v];
      const t = list[tIdx.get(pt)];
      const sp = pts[cid.get(v)];
      const e = rotate(t.rot ?? [0, 0, 0, 1], [sp[0] * t.scale[0], sp[1] * t.scale[1], sp[2] * t.scale[2]]);
      expectClose(P.getTuple(pt), [e[0] + t.P[0], e[1] + t.P[1], e[2] + t.P[2]], 1e-4, `vertex ${v}`);
    }
  });

  it("only 'poly' turns: polylines and untagged primitives keep their order in a mixed source", async () => {
    const pts = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [2, 0, 0],
      [3, 0, 1],
      [4, 1, 1],
    ];
    const faces = [
      [0, 1, 2, 3], // poly quad
      [4, 5, 6], // polyline
      [0, 4, 5, 6], // untagged ("" — the column default)
      [3, 2, 1, 0, 4], // poly pentagon (degenerate is fine for ordering)
      [6, 5], // polyline, two vertices
    ];
    const src = build(pts, faces, ["poly", "polyline", undefined, "poly", "polyline"]);
    const tgt = targetCloud([
      { P: [0, 0, 0], scale: [-1, 1, 1] },
      { P: [0, 0, 0], scale: [1, 1, 1] },
    ]);
    const out = await cook(src, tgt, { rotateAttrs: [] });
    const f = facesOf(out);
    expect(f.map((x) => x.cids)).toEqual([
      reversed(faces[0]),
      faces[1],
      faces[2],
      reversed(faces[3]),
      faces[4],
      ...faces,
    ]);
    // primtype rides along with the right words.
    const tag = out.attrs.primitive.require(PRIMTYPE_ATTR);
    expect(Array.from({ length: out.primitiveCount }, (_, p) => tag.getString(p))).toEqual(
      [..."a", ..."b"].flatMap(() => ["poly", "polyline", "", "poly", "polyline"]),
    );
    // A source whose topology carries no primtype column at all is never reversed.
    const bare = build(pts, faces, null);
    const bareOut = await cook(bare, tgt, { rotateAttrs: [] });
    expect(facesOf(bareOut).map((x) => x.cids)).toEqual([...faces, ...faces]);
  });

  it("a non-tiling source (gaps, out-of-order and SHARED vertex ranges) under a mirrored target", async () => {
    const pts = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
    ];
    // prim 0 at [6,10), prim 1 at [0,3), prim 2 SHARES [0,3); slots 3..5 and 10..11 are gaps.
    const v2p = [0, 1, 2, 5, 5, 5, 3, 2, 1, 4, 0, 0];
    const layout = { v2p, start: [6, 0, 0], count: [4, 3, 3] };
    const faces = [
      [3, 2, 1, 4],
      [0, 1, 2],
      [0, 1, 2],
    ];
    const src = build(pts, faces, ["poly", "poly", "poly"], layout);
    const list: Target[] = [
      { P: [0, 0, 0], rot: quat([0, 0, 1], 0.5), scale: [1, 1, -1] },
      { P: [4, 0, 0], rot: quat([0, 1, 0], 0.5), scale: [1, 1, 1] },
      { P: [8, 0, 0], rot: quat([1, 0, 0], 0.5), scale: [-2, 2, 2] },
    ];
    const out = await cook(src, targetCloud(list));
    // Mirrored blocks compact to 10 vertices; the unmirrored block is verbatim (12).
    expect(out.vertexCount).toBe(10 + 12 + 10);
    expect(out.primitiveCount).toBe(9);
    const f = facesOf(out);
    const srcFn = faces.map((x) => unit(areaVector(x.map((i) => pts[i]))));
    f.forEach((face, k) => {
      const ti = Math.floor(k / 3);
      const t = list[ti];
      const sf = k % 3;
      expect(face.target).toBe(ti);
      expect(face.cids, `face ${k}`).toEqual(isMirror(t) ? reversed(faces[sf]) : faces[sf]);
      const e = expectedDir(t, srcFn[sf]);
      expectClose(face.fn, e, 1e-5, `fn ${k}`);
      for (const n of face.vns) expectClose(n, e, 1e-5, `vn ${k}`);
    });
    // Every vertex's corner id matches the point it references (block base + source index).
    const cid = out.attrs.vertex.require("cid");
    const tIdx = out.attrs.point.require("tIdx");
    for (let p = 0; p < out.primitiveCount; p++) {
      const s = out.primVertexStart[p];
      for (let i = 0; i < out.primVertexCount[p]; i++) {
        const pt = out.vertexToPoint[s + i];
        expect(cid.get(s + i)).toBe(pt - tIdx.get(pt) * pts.length);
      }
    }
  });

  it("point-domain directions reflect under topology 'drop' too", async () => {
    const src = createPointCloud(3);
    const N = src.attrs.point.add("dir", "f32", 3, [0, 0, 0]);
    const dirs = [
      [1, 0, 0],
      [0.3, -0.4, 0.866],
      [-0, 0, -1],
    ];
    dirs.forEach((d, i) => N.setTuple(i, d));
    const list: Target[] = [
      { P: [0, 0, 0], rot: quat([1, 2, 0], 0.9), scale: [-1, 2, 3] },
      { P: [0, 0, 0], scale: [1, -1, -1] },
      { P: [0, 0, 0], rot: quat([0, 0, 1], 0.2), scale: [4, 4, 4] },
    ];
    const out = firstGeo(
      (
        await runNode(copyToPoints, { rotateAttrs: ["dir"] }, {
          source: [makeGeometryItem(src)],
          target: [makeGeometryItem(targetCloud(list))],
        })
      ).out,
    );
    const D = out.attrs.point.require("dir");
    list.forEach((t, ti) =>
      dirs.forEach((d, i) => expectClose(D.getTuple(ti * 3 + i), expectedDir(t, d), 1e-6, `t${ti} p${i}`)),
    );
  });

  it("mirrorAware off keeps the pre-param bytes: winding and directions as the |scale| cook, rotation only", async () => {
    const { pts, faces } = lPrism();
    const src = build(pts, faces, faces.map(() => "poly"));
    const abs = MANY.map((t) => ({ ...t, scale: t.scale.map(Math.abs) as V3 }));
    const off = await cook(src, targetCloud(MANY), { mirrorAware: false });
    const ref = await cook(src, targetCloud(abs));
    expect(bytes(off.vertexToPoint)).toEqual(bytes(ref.vertexToPoint));
    expect(bytes(off.primVertexStart)).toEqual(bytes(ref.primVertexStart));
    expect(bytes(off.primVertexCount)).toEqual(bytes(ref.primVertexCount));
    for (const [domain, name] of [
      ["vertex", "vn"],
      ["vertex", "cid"],
      ["primitive", "fn"],
    ] as const) {
      const x = off.attrs[domain].require(name);
      const y = ref.attrs[domain].require(name);
      const n = off.attrs[domain].count * x.tupleSize;
      expect(bytes(x.data.subarray(0, n)), `${domain} ${name}`).toEqual(bytes(y.data.subarray(0, n)));
    }
  });

  it("with no negative scale, on and off are byte-identical — including -0 components and identity targets", async () => {
    const { pts, faces } = lPrism();
    const src = build(pts, faces, faces.map(() => "poly"));
    // Plant -0 in a direction: an identity target must pass it through untouched.
    src.attrs.primitive.require("fn").setTuple(0, [-0, -0, 1]);
    const list: Target[] = [
      { P: [0, 0, 0], scale: [1, 1, 1] },
      { P: [1, 2, 3], rot: quat([1, 1, 0], 0.3), scale: [2, 1, 0.5] },
      { P: [1, 2, 3], scale: [0, 1, 1] },
    ];
    const on = await cook(src, targetCloud(list));
    const off = await cook(src, targetCloud(list), { mirrorAware: false });
    const fnOn = on.attrs.primitive.require("fn");
    expect(Object.is(fnOn.get(0, 0), -0)).toBe(true);
    for (const geo of [on, off]) expect(geo.vertexCount).toBe(on.vertexCount);
    for (const domain of ["point", "vertex", "primitive"] as const) {
      for (const name of on.attrs[domain].names()) {
        const x = on.attrs[domain].require(name);
        const y = off.attrs[domain].require(name);
        const n = on.attrs[domain].count * x.tupleSize;
        expect(bytes(x.data.subarray(0, n)), `${domain} ${name}`).toEqual(bytes(y.data.subarray(0, n)));
      }
    }
    expect(Array.from(on.vertexToPoint)).toEqual(Array.from(off.vertexToPoint));
    expect(Array.from(on.primVertexStart)).toEqual(Array.from(off.primVertexStart));
  });

  it("is deterministic: two cooks of a mirrored, selected cook are byte-identical", async () => {
    const { pts, faces } = lPrism();
    const run = async () => {
      const src = build(pts, faces, faces.map(() => "poly"));
      return cook(src, targetCloud(MANY));
    };
    const [x, y] = [await run(), await run()];
    for (const domain of ["point", "vertex", "primitive"] as const) {
      for (const name of x.attrs[domain].names()) {
        const a = x.attrs[domain].require(name);
        const b = y.attrs[domain].require(name);
        expect(Array.from(a.data.subarray(0, x.attrs[domain].count * a.tupleSize))).toEqual(
          Array.from(b.data.subarray(0, y.attrs[domain].count * b.tupleSize)),
        );
      }
    }
    expect(Array.from(x.vertexToPoint)).toEqual(Array.from(y.vertexToPoint));
  });
});
