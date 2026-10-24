/**
 * `boxContact`: per-query contact with a second set of boxes.
 *
 * Every answer here is checked against a reference written in THIS file
 * and sharing no code with the node: an interval test for axis-aligned
 * boxes, and for oriented boxes a corner-and-edge test (two convex
 * polytopes meet exactly when a corner of one lies in the other or an edge
 * of one crosses the other), which is a different argument from the
 * node's separating axes. Nothing is recorded from a run.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { Graph, cook, makeGeometryItem } from "../graph/index.js";
import { Pcg32 } from "../random/index.js";
import { boxContact } from "./boxContact.js";
import { deserializeGraph, fieldFromJson, pointGrid, serializeGraph, setBounds } from "./index.js";
import { firstGeo, permutePoints, runNode, shuffledOrder, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

interface BoxSpec {
  lo: number[];
  hi: number[];
  P?: number[];
  rot?: number[];
  scale?: number[];
}

const MODES = ["overlap", "touch", "contain", "inside"] as const;
type Mode = (typeof MODES)[number];

function cloud(specs: BoxSpec[]): Geometry {
  const geo = createPointCloud(specs.length);
  const pts = geo.attrs.point;
  specs.forEach((s, i) => {
    pts.require("boundsMin").setTuple(i, s.lo);
    pts.require("boundsMax").setTuple(i, s.hi);
    if (s.P) pts.require("P").setTuple(i, s.P);
    if (s.rot) pts.require("rot").setTuple(i, s.rot);
    if (s.scale) pts.require("scale").setTuple(i, s.scale);
  });
  return geo;
}

async function contact(q: Geometry, t: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(boxContact, params, { in: [makeGeometryItem(q)], targets: [makeGeometryItem(t)] }, seed);
  return firstGeo(outputs.out);
}

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count));
}

/** f32-exact: the node reads stored f32 bounds, so the reference must too. */
const f = Math.fround;

// ---------------------------------------------------------------------------
// Reference 1: axis-aligned boxes as intervals (world frame)

interface Answer {
  hit: number[];
  count: number[];
  target: number[];
}

function aabbReference(qs: BoxSpec[], ts: BoxSpec[], mode: Mode, margins: number[][], skip?: (i: number, j: number) => boolean): Answer {
  const hit: number[] = [];
  const count: number[] = [];
  const target: number[] = [];
  qs.forEach((q, i) => {
    const m = margins[i];
    const qlo = q.lo.map((v, k) => f(v) - m[k]);
    const qhi = q.hi.map((v, k) => f(v) + m[k]);
    const empty = [0, 1, 2].some((k) => qhi[k] < qlo[k]);
    let c = 0;
    let best = -1;
    let bestD = Infinity;
    ts.forEach((t, j) => {
      if (empty || skip?.(i, j)) return;
      const tlo = t.lo.map(f);
      const thi = t.hi.map(f);
      let ok = true;
      for (let k = 0; k < 3; k++) {
        if (mode === "overlap") ok &&= qlo[k] < thi[k] && tlo[k] < qhi[k];
        else if (mode === "touch") ok &&= qlo[k] <= thi[k] && tlo[k] <= qhi[k];
        else if (mode === "contain") ok &&= qlo[k] <= tlo[k] && thi[k] <= qhi[k];
        else ok &&= tlo[k] <= qlo[k] && qhi[k] <= thi[k];
      }
      if (!ok) return;
      c++;
      let d = 0;
      for (let k = 0; k < 3; k++) {
        const e = (tlo[k] + thi[k]) / 2 - (f(q.lo[k]) + f(q.hi[k])) / 2;
        d += e * e;
      }
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    hit.push(c > 0 ? 1 : 0);
    count.push(c);
    target.push(best);
  });
  return { hit, count, target };
}

// ---------------------------------------------------------------------------
// Reference 2: oriented boxes by corners and edges

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Rotation matrix columns of a quaternion (normalized here, zero = identity). */
function rotColumns(q: number[] | undefined): [V, V, V] {
  let [x, y, z, w] = q ?? [0, 0, 0, 1];
  const len = Math.hypot(x, y, z, w);
  if (len > 0) [x, y, z, w] = [x / len, y / len, z / len, w / len];
  else [x, y, z, w] = [0, 0, 0, 1];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w)],
    [2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w)],
    [2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/** A box as a corner, three unit directions and three lengths. */
interface Obb {
  o: V;
  d: [V, V, V];
  len: V;
  empty: boolean;
}

function obbOf(s: BoxSpec, local: boolean, margin: number[] = [0, 0, 0]): Obb {
  const lo = s.lo.map(f) as V;
  const hi = s.hi.map(f) as V;
  let o: V;
  let d: [V, V, V];
  let len: V;
  if (!local) {
    o = lo;
    d = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    len = sub(hi, lo);
  } else {
    const R = rotColumns(s.rot?.map(f));
    const sc = (s.scale ?? [1, 1, 1]).map(f);
    const P = (s.P ?? [0, 0, 0]).map(f) as V;
    const place = (x: V): V => add(P, add(add(mul(R[0], sc[0] * x[0]), mul(R[1], sc[1] * x[1])), mul(R[2], sc[2] * x[2])));
    o = place(lo);
    d = [R[0], R[1], R[2]];
    len = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const far = [...lo] as V;
      far[k] = hi[k];
      const e = sub(place(far), o);
      // The edge runs along +R_k or -R_k (a negative scale); keep the
      // direction it actually runs.
      const signed = dot(e, R[k]);
      d[k] = signed < 0 ? mul(R[k], -1) : R[k];
      len[k] = Math.abs(signed);
    }
  }
  let empty = false;
  for (let k = 0; k < 3; k++) {
    o = sub(o, mul(d[k], margin[k]));
    len[k] += 2 * margin[k];
    if (len[k] < 0) empty = true;
  }
  return { o, d, len, empty };
}

function corners(b: Obb): V[] {
  const out: V[] = [];
  for (let m = 0; m < 8; m++) {
    let p = b.o;
    for (let k = 0; k < 3; k++) if (m & (1 << k)) p = add(p, mul(b.d[k], b.len[k]));
    out.push(p);
  }
  return out;
}

function pointIn(b: Obb, x: V): boolean {
  const r = sub(x, b.o);
  for (let k = 0; k < 3; k++) {
    const u = dot(r, b.d[k]);
    if (!(u >= 0 && u <= b.len[k])) return false;
  }
  return true;
}

function segmentHits(b: Obb, p: V, q: V): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const u0 = dot(sub(p, b.o), b.d[k]);
    const u1 = dot(sub(q, b.o), b.d[k]);
    const du = u1 - u0;
    if (du === 0) {
      if (!(u0 >= 0 && u0 <= b.len[k])) return false;
      continue;
    }
    let a = (0 - u0) / du;
    let c = (b.len[k] - u0) / du;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}

function edges(b: Obb): [V, V][] {
  const cs = corners(b);
  const out: [V, V][] = [];
  for (let m = 0; m < 8; m++) for (let k = 0; k < 3; k++) if (!(m & (1 << k))) out.push([cs[m], cs[m | (1 << k)]]);
  return out;
}

function obbMeet(a: Obb, b: Obb): boolean {
  if (corners(a).some((c) => pointIn(b, c))) return true;
  if (corners(b).some((c) => pointIn(a, c))) return true;
  if (edges(a).some(([p, q]) => segmentHits(b, p, q))) return true;
  return edges(b).some(([p, q]) => segmentHits(a, p, q));
}

function obbReference(qs: BoxSpec[], qLocal: boolean, ts: BoxSpec[], tLocal: boolean, mode: Mode, margins: number[][]): Answer {
  const T = ts.map((t) => obbOf(t, tLocal));
  const centre = (b: Obb): V => {
    let p = b.o;
    for (let k = 0; k < 3; k++) p = add(p, mul(b.d[k], b.len[k] / 2));
    return p;
  };
  const hit: number[] = [];
  const count: number[] = [];
  const target: number[] = [];
  qs.forEach((qs_, i) => {
    const Q = obbOf(qs_, qLocal, margins[i]);
    const qc = centre(obbOf(qs_, qLocal));
    let c = 0;
    let best = -1;
    let bestD = Infinity;
    T.forEach((t, j) => {
      if (Q.empty) return;
      const ok =
        mode === "contain"
          ? corners(t).every((x) => pointIn(Q, x))
          : mode === "inside"
            ? corners(Q).every((x) => pointIn(t, x))
            : obbMeet(Q, t);
      if (!ok) return;
      c++;
      const e = sub(centre(t), qc);
      const dd = dot(e, e);
      if (dd < bestD) {
        bestD = dd;
        best = j;
      }
    });
    hit.push(c > 0 ? 1 : 0);
    count.push(c);
    target.push(best);
  });
  return { hit, count, target };
}

// ---------------------------------------------------------------------------
// Random boxes

function rng(seed: number): () => number {
  const r = new Pcg32(seed);
  return () => r.nextF32();
}

function latticeBoxes(rand: () => number, n: number, span: number, maxSize: number): BoxSpec[] {
  return Array.from({ length: n }, () => {
    const lo = [0, 1, 2].map(() => Math.floor(rand() * span));
    const hi = lo.map((v) => v + Math.floor(rand() * (maxSize + 1)));
    return { lo, hi };
  });
}

function randomQuat(rand: () => number): number[] {
  // Uniform on the 3-sphere (Shoemake), from three uniforms.
  const u1 = rand();
  const u2 = rand() * 2 * Math.PI;
  const u3 = rand() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
}

function orientedBoxes(rand: () => number, n: number, minSize: number, maxSize: number): BoxSpec[] {
  return Array.from({ length: n }, () => {
    const lo = [0, 1, 2].map(() => -rand() * maxSize);
    const hi = lo.map((v) => v + minSize + rand() * (maxSize - minSize));
    const P = [0, 1, 2].map(() => (rand() - 0.5) * 10);
    const scale = [0, 1, 2].map(() => (0.6 + rand() * 1.2) * (rand() < 0.15 ? -1 : 1));
    return { lo, hi, P, rot: randomQuat(rand), scale };
  });
}

function setMargin(geo: Geometry, margins: number[][]): Geometry {
  const a = geo.attrs.point.add("m", "f32", 3, [0, 0, 0]);
  margins.forEach((m, i) => a.setTuple(i, m));
  return geo;
}

const marginField = fieldFromJson({ fn: "attribute", name: "m", tupleSize: 3 });

async function answer(q: Geometry, t: Geometry, params: Record<string, unknown>): Promise<Answer> {
  const out = await contact(q, t, { hitAttr: "hit", countAttr: "count", targetAttr: "target", ...params });
  return { hit: col(out, "hit"), count: col(out, "count"), target: col(out, "target") };
}

// ---------------------------------------------------------------------------

describe("boxContact: axis-aligned boxes against the interval reference", () => {
  // A lattice makes faces, edges and corners MEET all the time, which is
  // where overlap and touch differ and where a sloppy test is caught. The
  // sizes include 0 (a point-box), and a few huge targets land in the
  // linear tier rather than the grid.
  const rand = rng(7);
  const qs = latticeBoxes(rand, 300, 14, 4);
  const ts = [...latticeBoxes(rand, 300, 14, 3), ...latticeBoxes(rand, 6, 4, 25)];
  const margins = qs.map(() => [0, 1, 2].map(() => [0, 0, 0.5, 1, -0.5][Math.floor(rand() * 5)]));

  for (const mode of MODES) {
    it(`${mode}: hit, count and nearest target match brute force (per-axis margins, ties to the lowest index)`, async () => {
      const got = await answer(setMargin(cloud(qs), margins), cloud(ts), { mode, margin: marginField });
      const want = aabbReference(qs, ts, mode, margins);
      expect(got).toEqual(want);
      // Not vacuous: something hits, and not everything.
      const hits = want.hit.reduce((a, b) => a + b, 0);
      expect(hits).toBeGreaterThan(5);
      expect(hits).toBeLessThan(qs.length);
    });
  }

  it("touch counts what overlap does not: shared faces, edges and corners", async () => {
    const t = await answer(cloud(qs), cloud(ts), { mode: "touch" });
    const o = await answer(cloud(qs), cloud(ts), { mode: "overlap" });
    let more = 0;
    for (let i = 0; i < qs.length; i++) {
      expect(t.count[i]).toBeGreaterThanOrEqual(o.count[i]);
      if (t.count[i] > o.count[i]) more++;
    }
    expect(more).toBeGreaterThan(20);
  });
});

describe("boxContact: oriented boxes against the corner-and-edge reference", () => {
  const rand = rng(11);
  // Two populations so the containment modes have something to find:
  // large queries over small targets, and the other way round.
  const qs = [...orientedBoxes(rand, 60, 0.4, 2.5), ...orientedBoxes(rand, 30, 3, 6)];
  const ts = [...orientedBoxes(rand, 60, 0.4, 2.5), ...orientedBoxes(rand, 30, 0.1, 0.6), ...orientedBoxes(rand, 10, 4, 8)];
  // Stored f32 by the attribute the field reads, so the reference reads them f32 too.
  const margins = qs.map(() => [0, 1, 2].map(() => f(-0.05 + rand() * 0.4)));
  const minHits: Record<Mode, number> = { overlap: 20, touch: 20, contain: 3, inside: 3 };

  for (const mode of MODES) {
    it(`${mode}, both local: matches the reference exactly`, async () => {
      const got = await answer(setMargin(cloud(qs), margins), cloud(ts), {
        mode,
        margin: marginField,
        queryFrame: "local",
        targetFrame: "local",
      });
      const want = obbReference(qs, true, ts, true, mode, margins);
      expect(got).toEqual(want);
      expect(want.hit.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(minHits[mode]);
    });
  }

  it("world queries against local targets: the frames are chosen per input", async () => {
    const aabbs = latticeBoxes(rand, 80, 10, 4).map((b) => ({ lo: b.lo.map((v) => v - 5), hi: b.hi.map((v) => v - 5) }));
    for (const mode of MODES) {
      const got = await answer(cloud(aabbs), cloud(ts), { mode, targetFrame: "local" });
      const want = obbReference(aabbs, false, ts, true, mode, aabbs.map(() => [0, 0, 0]));
      expect(got).toEqual(want);
    }
  });

  it("a rotated pair the axis-aligned boxes of their corners would wrongly report", async () => {
    // Two slabs turned 45 degrees about y, side by side along their own x
    // (which is world (1, 0, -1) / sqrt 2): their world AABBs overlap
    // widely, the slabs themselves are 0.2 apart along that axis.
    const s = Math.sin(Math.PI / 8);
    const c = Math.cos(Math.PI / 8);
    const slab = (x: number): BoxSpec => ({
      lo: [-0.5, -1, -2],
      hi: [0.5, 1, 2],
      P: [x * Math.SQRT1_2, 0, -x * Math.SQRT1_2],
      rot: [0, s, 0, c],
    });
    const a = cloud([slab(0)]);
    const b = cloud([slab(1.2)]);
    const local = { queryFrame: "local", targetFrame: "local" };
    expect((await answer(a, b, { ...local, mode: "touch" })).hit).toEqual([0]);
    expect((await answer(a, b, { mode: "touch" })).hit).toEqual([1]); // as world AABBs they would
    expect((await answer(a, b, { ...local, mode: "touch", margin: [0.21, 0, 0] })).hit).toEqual([1]);
    expect((await answer(a, b, { ...local, mode: "touch", margin: [0.19, 0, 0] })).hit).toEqual([0]);
    expect(obbMeet(obbOf(slab(0), true), obbOf(slab(1.2), true))).toBe(false);
  });
});

describe("boxContact: exact contact under a shared rotation", () => {
  // A rigid motion keeps a shared face shared, so a box, its face
  // neighbour and a box flush inside it, all under ONE P and rot, must
  // read the same under every rotation as they do unrotated. Each centre
  // is rotated on its own and picks up rounding; before the boundary band
  // this decided about a third of the overlaps and half the touches.
  const rand = rng(41);
  const N = 500;
  const frames = Array.from({ length: N }, (_, i) => ({ P: [i * 20, Math.floor(rand() * 7), -3], rot: randomQuat(rand) }));
  const at = (lo: number[], hi: number[]): Geometry => cloud(frames.map((fr) => ({ lo, hi, ...fr })));
  const big = (): Geometry => at([0, 0, 0], [2, 1, 1]);
  const neighbour = (): Geometry => at([2, 0, 0], [3, 1, 1]);
  const flush = (): Geometry => at([0, 0.25, 0.25], [1, 0.75, 0.75]);
  const local = { queryFrame: "local", targetFrame: "local" };
  const ones = Array(N).fill(1);
  const zeros = Array(N).fill(0);

  it("a shared face: never an overlap, always a touch", async () => {
    expect((await answer(big(), neighbour(), { ...local, mode: "overlap" })).hit).toEqual(zeros);
    expect((await answer(big(), neighbour(), { ...local, mode: "touch" })).hit).toEqual(ones);
  });

  it("a box flush inside: always contained, and always inside", async () => {
    expect((await answer(big(), flush(), { ...local, mode: "contain" })).hit).toEqual(ones);
    expect((await answer(flush(), big(), { ...local, mode: "inside" })).hit).toEqual(ones);
    expect((await answer(big(), flush(), { ...local, mode: "overlap" })).hit).toEqual(ones);
  });

  it("the band is narrow: a real gap of 1e-6 is still apart, a real overlap of 1e-6 still overlaps", async () => {
    const apart = at([2 + 1e-6 * 2, 0, 0], [3, 1, 1]);
    const into = at([2 - 1e-6 * 2, 0, 0], [3, 1, 1]);
    expect((await answer(big(), apart, { ...local, mode: "touch" })).hit).toEqual(zeros);
    expect((await answer(big(), into, { ...local, mode: "overlap" })).hit).toEqual(ones);
  });
});

describe("boxContact: near-parallel edges", () => {
  // Two bars on edge (45 degrees about x), the upper one twisted by theta
  // about z, stacked ridge on ridge: only the cross axis of the two ridges
  // separates them, and that axis has length sin(theta). The band must be a
  // DISTANCE on it too, or near parallel it widens to band / sin theta and
  // touch reports real gaps of ~1e-6 as contact. The upper bar is swept
  // over consecutive f32 heights through the contact at sqrt(2); every
  // answer must match the corner-and-edge reference.
  const qmul = (a: number[], b: number[]): number[] => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
  const rx = [Math.sin(Math.PI / 8), 0, 0, Math.cos(Math.PI / 8)];
  const bar = (P: number[], rot: number[]): BoxSpec => ({ lo: [-1, -0.5, -0.5], hi: [1, 0.5, 0.5], P, rot });
  const nextF32 = (x: number, steps: number): number => {
    const buf = new Float32Array([x]);
    new Int32Array(buf.buffer)[0] += steps;
    return buf[0];
  };
  const local = { queryFrame: "local", targetFrame: "local" };

  for (const theta of [1e-3, 1e-5, 3e-6, 1.2e-6]) {
    it(`twisted by ${theta} rad: touch and overlap match the reference on every f32 step through contact`, async () => {
      const rotB = qmul([0, 0, Math.sin(theta / 2), Math.cos(theta / 2)], rx);
      const lower = bar([0, 0, 0], rx);
      const heights = Array.from({ length: 24 }, (_, s) => nextF32(f(Math.SQRT2), s - 12));
      const want = heights.map((H) => (obbMeet(obbOf(lower, true), obbOf(bar([0, 0, H], rotB), true)) ? 1 : 0));
      expect(new Set(want)).toEqual(new Set([0, 1]));
      for (const mode of ["touch", "overlap"] as const) {
        const got: number[] = [];
        for (const H of heights) got.push((await answer(cloud([lower]), cloud([bar([0, 0, H], rotB)]), { ...local, mode })).hit[0]);
        expect([mode, got]).toEqual([mode, want]);
      }
    });
  }
});

describe("boxContact: nearest-target ties under rotation", () => {
  // Four targets on the four sides of a query, all under the query's own P
  // and rot: their true centre distances are equal under every rotation,
  // and only rounding tells them apart. The lowest index must win.
  const rand = rng(51);
  const cases = 200;
  const frames = Array.from({ length: cases }, (_, i) => ({ P: [i * 50 + 0.37, 1.5, -2.25], rot: randomQuat(rand) }));
  const sides: [number[], number[]][] = [
    [[2, 0, 0], [3, 2, 2]],
    [[-1, 0, 0], [0, 2, 2]],
    [[0, 0, 2], [2, 2, 3]],
    [[0, 0, -1], [2, 2, 0]],
  ];

  it("count 4, and the nearest is the case's first target, for 200 random rotations and every order of the four", async () => {
    const q = cloud(frames.map((fr) => ({ lo: [0, 0, 0], hi: [2, 2, 2], ...fr })));
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1]]) {
      const t = cloud(frames.flatMap((fr) => order.map((k) => ({ lo: sides[k][0], hi: sides[k][1], ...fr }))));
      const got = await answer(q, t, { mode: "touch", queryFrame: "local", targetFrame: "local" });
      expect(got.count).toEqual(Array(cases).fill(4));
      expect(got.target).toEqual(frames.map((_, i) => i * 4));
    }
  });
});

describe("boxContact: one-sided margins", () => {
  // A wall along x whose outside is -z: a box in front of it, one behind it
  // (inside the house), and one off its +x end.
  const wall = (): Geometry => cloud([{ lo: [0, 0, 0], hi: [4, 3, 1] }]);
  const front = { lo: [1, 0, -1.5], hi: [2, 1, -0.5] };
  const behind = { lo: [1, 0, 1.5], hi: [2, 1, 2.5] };
  const end = { lo: [4.5, 0, 0], hi: [5, 1, 1] };
  const targets = (): Geometry => cloud([front, behind, end]);

  it("margin grows both faces; marginMin and marginMax one face each", async () => {
    const both = await contact(wall(), targets(), { mode: "touch", margin: [0, 0, 0.5], targetAttr: "who", countAttr: "n" });
    expect(col(both, "n")).toEqual([2]);
    const out = await contact(wall(), targets(), { mode: "touch", marginMin: [0, 0, 0.5], targetAttr: "who" });
    expect(col(out, "who")).toEqual([0]);
    const inside = await contact(wall(), targets(), { mode: "touch", marginMax: [0, 0, 0.5], targetAttr: "who" });
    expect(col(inside, "who")).toEqual([1]);
    expect(col(await contact(wall(), targets(), { mode: "touch", marginMax: [0.5, 0, 0], targetAttr: "who" }), "who")).toEqual([2]);
    expect(col(await contact(wall(), targets(), { mode: "touch", marginMin: [0.5, 0, 0] }), "contact")).toEqual([0]);
  });

  it("they add to margin, and a min/max pair of opposite signs SHIFTS the box", async () => {
    // margin 0.25 + marginMin 0.25 reaches the front box; 0.25 alone does not.
    expect(col(await contact(wall(), targets(), { mode: "touch", margin: [0, 0, 0.25] }), "contact")).toEqual([0]);
    const reach = await contact(wall(), targets(), { mode: "touch", margin: [0, 0, 0.25], marginMin: [0, 0, 0.25], targetAttr: "who" });
    expect(col(reach, "who")).toEqual([0]);
    // Moved 1.5 out of the front face (and flattened to the wall's depth):
    // the moved box [-1.5, -0.5] in z sits exactly on the front box.
    const moved = await contact(wall(), targets(), {
      mode: "overlap",
      marginMin: [0, 0, 1.5],
      marginMax: [0, 0, -1.5],
      targetAttr: "who",
    });
    expect(col(moved, "who")).toEqual([0]);
  });

  it("can carve a zero-thickness probe out of the box without touching its bounds", async () => {
    // The window probe: the front face pushed half a unit out, the back
    // face pulled to meet it, height pulled to one line at y = 0.5.
    const q = wall();
    const probe = { mode: "touch", marginMin: [0, -0.5, 0.5], marginMax: [0, -2.5, -1.5] };
    const blocker = cloud([{ lo: [3, 0, -1], hi: [5, 1, 0] }]);
    const low = cloud([{ lo: [3, 0, -1], hi: [5, 0.25, 0] }]);
    const out = await contact(q, blocker, probe);
    expect(col(out, "contact")).toEqual([1]);
    expect(col(await contact(q, low, probe), "contact")).toEqual([0]);
    expect(col(out, "boundsMin")).toEqual([0]);
    expect(Array.from(out.attrs.point.require("boundsMax").data.slice(0, 3))).toEqual([4, 3, 1]);
  });

  it('"local": the min side is the boundsMin side in the box\'s own frame, a negative scale included', async () => {
    // Local x mirrored: the box spans world x [-1, 0], and its boundsMin
    // face (local x = 0) is the world face at x = 0.
    const q = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1], scale: [-1, 1, 1] }]);
    const right = cloud([{ lo: [0.3, 0, 0], hi: [1, 1, 1] }]);
    const left = cloud([{ lo: [-2, 0, 0], hi: [-1.3, 1, 1] }]);
    const p = { mode: "touch", queryFrame: "local", marginMin: [0.5, 0, 0] };
    expect(col(await contact(q, right, p), "contact")).toEqual([1]);
    expect(col(await contact(q, left, p), "contact")).toEqual([0]);
    const pm = { mode: "touch", queryFrame: "local", marginMax: [0.5, 0, 0] };
    expect(col(await contact(q, right, pm), "contact")).toEqual([0]);
    expect(col(await contact(q, left, pm), "contact")).toEqual([1]);
  });

  it("the nearest target is measured from the moved box", async () => {
    // Unshifted, the two are equally near the wall's centre; with the box
    // moved out of the front face, the front box is the nearer.
    const all = cloud([front, behind]);
    const shifted = await contact(wall(), all, { mode: "touch", margin: [0, 0, 3], marginMin: [0, 0, 1], marginMax: [0, 0, -1], targetAttr: "who" });
    expect(col(shifted, "who")).toEqual([0]);
  });
});

describe("boxContact: frames", () => {
  it('"world" ignores P, rot and scale entirely', async () => {
    const rand = rng(3);
    const qs = latticeBoxes(rand, 40, 8, 3);
    const ts = latticeBoxes(rand, 40, 8, 3);
    const plain = await answer(cloud(qs), cloud(ts), { mode: "touch" });
    const noisy = (bs: BoxSpec[]): BoxSpec[] => bs.map((b) => ({ ...b, P: [rand() * 100, 3, -7], rot: randomQuat(rand), scale: [2, -3, 0.5] }));
    expect(await answer(cloud(noisy(qs)), cloud(noisy(ts)), { mode: "touch" })).toEqual(plain);
  });

  it('"local" at the identity transform is "world"', async () => {
    const rand = rng(4);
    const qs = latticeBoxes(rand, 40, 8, 3);
    const ts = latticeBoxes(rand, 40, 8, 3);
    for (const mode of MODES) {
      const w = await answer(cloud(qs), cloud(ts), { mode });
      const l = await answer(cloud(qs), cloud(ts), { mode, queryFrame: "local", targetFrame: "local" });
      expect(l).toEqual(w);
    }
  });

  it('"local" places the box by P and scale: a unit box at P = (10, 0, 0) scaled 2', async () => {
    const q = cloud([{ lo: [-0.5, -0.5, -0.5], hi: [0.5, 0.5, 0.5], P: [10, 0, 0], scale: [2, 2, 2] }]);
    const near = cloud([{ lo: [11, -1, -1], hi: [12, 1, 1] }]); // touches the face at x = 11
    const far = cloud([{ lo: [11.01, -1, -1], hi: [12, 1, 1] }]);
    expect((await answer(q, near, { mode: "touch", queryFrame: "local" })).hit).toEqual([1]);
    expect((await answer(q, near, { mode: "overlap", queryFrame: "local" })).hit).toEqual([0]);
    expect((await answer(q, far, { mode: "touch", queryFrame: "local" })).hit).toEqual([0]);
  });
});

describe("boxContact: the boundary cases each mode names", () => {
  const unit: BoxSpec = { lo: [0, 0, 0], hi: [1, 1, 1] };
  const cases: [string, BoxSpec, Record<Mode, number>][] = [
    ["sharing a face", { lo: [1, 0, 0], hi: [2, 1, 1] }, { overlap: 0, touch: 1, contain: 0, inside: 0 }],
    ["sharing an edge", { lo: [1, 1, 0], hi: [2, 2, 1] }, { overlap: 0, touch: 1, contain: 0, inside: 0 }],
    ["sharing a corner", { lo: [1, 1, 1], hi: [2, 2, 2] }, { overlap: 0, touch: 1, contain: 0, inside: 0 }],
    ["apart by 0.25", { lo: [1.25, 0, 0], hi: [2, 1, 1] }, { overlap: 0, touch: 0, contain: 0, inside: 0 }],
    ["crossing", { lo: [0.5, 0.5, 0.5], hi: [2, 2, 2] }, { overlap: 1, touch: 1, contain: 0, inside: 0 }],
    ["the same box", { lo: [0, 0, 0], hi: [1, 1, 1] }, { overlap: 1, touch: 1, contain: 1, inside: 1 }],
    ["inside it, flush with a face", { lo: [0, 0.25, 0.25], hi: [0.5, 0.75, 0.75] }, { overlap: 1, touch: 1, contain: 1, inside: 0 }],
    ["around it", { lo: [-1, -1, -1], hi: [2, 2, 2] }, { overlap: 1, touch: 1, contain: 0, inside: 1 }],
    ["a flat sheet through its middle", { lo: [-1, 0.5, -1], hi: [2, 0.5, 2] }, { overlap: 1, touch: 1, contain: 0, inside: 0 }],
    ["a flat sheet lying on its top face", { lo: [-1, 1, -1], hi: [2, 1, 2] }, { overlap: 0, touch: 1, contain: 0, inside: 0 }],
    ["a point at its centre", { lo: [0.5, 0.5, 0.5], hi: [0.5, 0.5, 0.5] }, { overlap: 1, touch: 1, contain: 1, inside: 0 }],
    ["a point on a corner", { lo: [1, 1, 1], hi: [1, 1, 1] }, { overlap: 0, touch: 1, contain: 1, inside: 0 }],
  ];
  for (const [name, target, want] of cases) {
    it(`the unit box against a box ${name}`, async () => {
      for (const mode of MODES) {
        const got = await answer(cloud([unit]), cloud([target]), { mode });
        expect([mode, got.hit[0]]).toEqual([mode, want[mode]]);
      }
    });
  }
});

describe("boxContact: margin", () => {
  const q = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
  const t = cloud([{ lo: [1.5, 0, 0], hi: [2, 1, 1] }]);

  it("grows the query on both sides along each axis: 0.5 in x reaches a box 0.5 away, 0.49 does not", async () => {
    expect((await answer(q, t, { mode: "touch", margin: [0.5, 0, 0] })).hit).toEqual([1]);
    expect((await answer(q, t, { mode: "touch", margin: [0.49, 0, 0] })).hit).toEqual([0]);
    // Growing along y and z reaches nothing in x.
    expect((await answer(q, t, { mode: "touch", margin: [0, 5, 5] })).hit).toEqual([0]);
    // The far side grows too.
    const behind = cloud([{ lo: [-2, 0, 0], hi: [-0.5, 1, 1] }]);
    expect((await answer(q, behind, { mode: "touch", margin: [0.5, 0, 0] })).hit).toEqual([1]);
  });

  it("is a box-shaped reach, not a rounded one: a target diagonally off a corner is reached", async () => {
    const diag = cloud([{ lo: [1.4, 1.4, 0], hi: [2, 2, 1] }]);
    expect((await answer(q, diag, { mode: "touch", margin: 0.4 })).hit).toEqual([1]);
  });

  it("a scalar field broadcasts to all three axes, resolved per query point", async () => {
    const qs = cloud([
      { lo: [0, 0, 0], hi: [1, 1, 1] },
      { lo: [0, 0, 0], hi: [1, 1, 1] },
    ]);
    qs.attrs.point.add("reach", "f32", 1, 0).set(1, 0.5);
    const got = await answer(qs, t, { mode: "touch", margin: fieldFromJson({ fn: "attribute", name: "reach" }) });
    expect(got.hit).toEqual([0, 1]);
  });

  it("negative shrinks: a slight overhang passes 'inside' with a tolerance, and a query shrunk past nothing meets nothing", async () => {
    const room = cloud([{ lo: [0, 0, 0], hi: [1.01, 1, 1] }]);
    const lot = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    expect((await answer(room, lot, { mode: "inside" })).hit).toEqual([0]);
    expect((await answer(room, lot, { mode: "inside", margin: -0.02 })).hit).toEqual([1]);
    const huge = cloud([{ lo: [-100, -100, -100], hi: [100, 100, 100] }]);
    for (const mode of MODES) {
      expect((await answer(room, huge, { mode, margin: [0, -0.6, 0] })).hit).toEqual([0]);
    }
  });

  it("refuses a non-finite plain margin", async () => {
    expect(await rejection(contact(q, t, { margin: [0, Number.NaN, 0] }))).toMatch(/param "margin" \(component 1\) is NaN/);
  });
});

describe("boxContact: exclusion", () => {
  // Three walls in a row, each split into two bays that carry their wall's
  // id. A bay always touches its own wall; only the neighbours' count.
  const walls: BoxSpec[] = [0, 1, 2].map((w) => ({ lo: [w * 4, 0, 0], hi: [w * 4 + 4, 3, 1] }));
  const bays: BoxSpec[] = [0, 1, 2].flatMap((w) => [
    { lo: [w * 4, 0, 0], hi: [w * 4 + 2, 3, 1] },
    { lo: [w * 4 + 2, 0, 0], hi: [w * 4 + 4, 3, 1] },
  ]);
  const ids = (geo: Geometry, type: "i32" | "f32" | "string", values: (number | string)[]): Geometry => {
    const a = geo.attrs.point.add("wallId", type, 1, type === "string" ? "" : 0);
    values.forEach((v, i) => (type === "string" ? a.setString(i, v as string) : a.set(i, v as number)));
    return geo;
  };

  it("an id on both inputs: a bay does not count its own wall, only the neighbour it touches", async () => {
    const got = await answer(ids(cloud(bays), "i32", [0, 0, 1, 1, 2, 2]), ids(cloud(walls), "i32", [0, 1, 2]), {
      mode: "touch",
      excludeAttr: "wallId",
    });
    expect(got.count).toEqual([0, 1, 1, 1, 1, 0]);
    expect(got.target).toEqual([-1, 1, 0, 2, 1, -1]);
    const without = await answer(cloud(bays), cloud(walls), { mode: "touch" });
    expect(without.count).toEqual([1, 2, 2, 2, 2, 1]);
  });

  it("numbers compare by value across numeric types; NaN never equals", async () => {
    const got = await answer(ids(cloud(bays), "i32", [0, 0, 1, 1, 2, 2]), ids(cloud(walls), "f32", [0, 1, Number.NaN]), {
      mode: "touch",
      excludeAttr: "wallId",
    });
    // bay 3 (id 1) still skips wall 1; wall 2's NaN matches no bay.
    expect(got.count).toEqual([0, 1, 1, 1, 2, 1]);
  });

  it("strings compare by text, whatever order the two string tables were built in", async () => {
    const q = ids(cloud(bays), "string", ["c", "a", "a", "b", "b", "c"]);
    const t = ids(cloud(walls), "string", ["a", "b", "c"]);
    // Bays 0..5 sit in walls 0,0,1,1,2,2 and touch the neighbour across a
    // shared end. Bay 0 ("c") skips nothing; bays 1 and 2 ("a") skip wall
    // 0, bays 3 and 4 ("b") wall 1, bay 5 ("c") wall 2.
    const got = await answer(q, t, { mode: "touch", excludeAttr: "wallId" });
    expect(got.count).toEqual([1, 1, 1, 1, 1, 0]);
    // A label the targets never hold excludes nothing.
    const none = await answer(ids(cloud(bays), "string", ["z", "z", "z", "z", "z", "z"]), t, { mode: "touch", excludeAttr: "wallId" });
    expect(none.count).toEqual([1, 2, 2, 2, 2, 1]);
  });

  it("excludeSelf: one cloud on both pins asks about the OTHER boxes of its set", async () => {
    const set = cloud(walls);
    expect((await answer(set, set, { mode: "touch" })).count).toEqual([2, 3, 2]);
    expect((await answer(set, set, { mode: "touch", excludeSelf: true })).count).toEqual([1, 2, 1]);
    expect((await answer(set, set, { mode: "overlap", excludeSelf: true })).count).toEqual([0, 0, 0]);
  });

  it("refuses excludeSelf across clouds of different sizes, naming both counts", async () => {
    const msg = await rejection(contact(cloud(bays), cloud(walls), { excludeSelf: true }));
    expect(msg).toMatch(/"in" has 6 point\(s\) and "targets" has 3/);
  });

  it("refuses an exclusion attribute one side lacks, naming the pin and what it has", async () => {
    const msg = await rejection(contact(ids(cloud(bays), "i32", [0, 0, 1, 1, 2, 2]), cloud(walls), { excludeAttr: "wallId" }));
    expect(msg).toMatch(/pin "targets" has no such point attribute \(it has: P, rot/);
  });

  it("refuses a string on one side and a number on the other", async () => {
    const msg = await rejection(
      contact(ids(cloud(bays), "string", ["a", "a", "b", "b", "c", "c"]), ids(cloud(walls), "i32", [0, 1, 2]), { excludeAttr: "wallId" }),
    );
    expect(msg).toMatch(/is string on pin "in" but i32 on pin "targets"/);
  });
});

describe("boxContact: empty sets", () => {
  it("no targets: every query is clear, its count 0 and its target -1", async () => {
    const got = await answer(cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }, { lo: [2, 2, 2], hi: [3, 3, 3] }]), cloud([]), {});
    expect(got).toEqual({ hit: [0, 0], count: [0, 0], target: [-1, -1] });
  });

  it("no targets, and the empty target cloud has no bounds columns at all: still accepted", async () => {
    const bare = new Geometry();
    const got = await answer(cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]), bare, {});
    expect(got.hit).toEqual([0]);
  });

  it("no queries: an empty cloud comes back, with the report columns on it", async () => {
    const out = await contact(cloud([]), cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]), { countAttr: "n" });
    expect(out.pointCount).toBe(0);
    expect(out.attrs.point.get("contact")?.type).toBe("bool");
    expect(out.attrs.point.get("n")?.type).toBe("i32");
  });
});

describe("boxContact: what passes through", () => {
  it("adds its columns and changes nothing else", async () => {
    const q = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1], P: [3, 4, 5] }]);
    q.attrs.point.add("label", "string", 1, "").setString(0, "bay");
    const before = snapshotGeometry(q);
    const out = await contact(q, cloud([{ lo: [0, 0, 0], hi: [2, 2, 2] }]));
    expect(snapshotGeometry(q)).toEqual(before);
    type Snap = { point: { count: number; attrs: { name: string }[] } };
    const snap = snapshotGeometry(out) as unknown as Snap;
    const orig = before as unknown as Snap;
    expect(snap.point.count).toBe(1);
    expect(snap.point.attrs.slice(0, orig.point.attrs.length)).toEqual(orig.point.attrs);
    expect(snap.point.attrs.map((a) => a.name).slice(orig.point.attrs.length)).toEqual(["contact"]);
    expect(col(out, "contact")).toEqual([1]);
  });

  it("reuses a same-shape report column and refuses one of another shape", async () => {
    const q = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    q.attrs.point.add("contact", "bool", 1, 1);
    expect(col(await contact(q, cloud([])), "contact")).toEqual([0]);
    const bad = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    bad.attrs.point.add("contact", "f32", 1, 0);
    expect(await rejection(contact(bad, cloud([])))).toMatch(/hitAttr "contact" already exists .* as f32.*e\.g\. "contactHit"/s);
  });
});

describe("boxContact: determinism and scale", () => {
  const rand = rng(21);
  const qs = orientedBoxes(rand, 400, 0.2, 1.5).map((b) => ({ ...b, P: b.P!.map((v) => v * 3) }));
  const ts = orientedBoxes(rand, 500, 0.2, 1.5).map((b) => ({ ...b, P: b.P!.map((v) => v * 3) }));
  const params = { mode: "touch", margin: 0.1, queryFrame: "local", targetFrame: "local", countAttr: "n", targetAttr: "who" };

  it("cooks byte-identically twice, and whatever the node seed", async () => {
    const a = await contact(cloud(qs), cloud(ts), params, 1);
    const b = await contact(cloud(qs), cloud(ts), params, 1);
    const c = await contact(cloud(qs), cloud(ts), params, 987);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("shuffling the targets changes no flag or count, and the nearest target is the same box", async () => {
    const a = await contact(cloud(qs), cloud(ts), params);
    const order = shuffledOrder(ts.length, 5);
    const b = await contact(cloud(qs), permutePoints(cloud(ts), order), params);
    expect(col(b, "contact")).toEqual(col(a, "contact"));
    expect(col(b, "n")).toEqual(col(a, "n"));
    expect(col(b, "who").map((k) => (k < 0 ? -1 : order[k]))).toEqual(col(a, "who"));
    expect(col(a, "n").reduce((s, v) => s + v, 0)).toBeGreaterThan(50);
  });

  it("shuffling the queries permutes the answers with them", async () => {
    const a = await contact(cloud(qs), cloud(ts), params);
    const order = shuffledOrder(qs.length, 9);
    const b = await contact(permutePoints(cloud(qs), order), cloud(ts), params);
    const n = col(a, "n");
    expect(col(b, "n")).toEqual(Array.from(order, (k) => n[k]));
  });

  it("the grid agrees with brute force at a few thousand boxes of mixed sizes", async () => {
    const r = rng(33);
    const big = [...latticeBoxes(r, 2500, 60, 3), ...latticeBoxes(r, 20, 50, 40)];
    const qq = latticeBoxes(r, 1500, 60, 2);
    const got = await answer(cloud(qq), cloud(big), { mode: "touch", margin: 1 });
    expect(got).toEqual(aabbReference(qq, big, "touch", qq.map(() => [1, 1, 1])));
  });

  it("one grid per size class: sizes spread over four decades, points included, still match brute force", async () => {
    const r = rng(34);
    const wide = (n: number): BoxSpec[] =>
      Array.from({ length: n }, (_, i) => {
        const c = [0, 1, 2].map(() => f(r() * 80));
        const h = i % 17 === 0 ? 0 : f(0.005 * Math.pow(10, r() * 4)); // 0.005 .. 50, and some points
        return { lo: c.map((v) => f(v - h)), hi: c.map((v) => f(v + h)) };
      });
    const ts = wide(2000);
    const qs = wide(1200);
    for (const mode of ["touch", "contain"] as const) {
      const got = await answer(cloud(qs), cloud(ts), { mode, margin: 0.5 });
      expect(got).toEqual(aabbReference(qs, ts, mode, qs.map(() => [0.5, 0.5, 0.5])));
    }
  });
});

describe("boxContact: in a graph", () => {
  function build(): Graph {
    const g = new Graph(17);
    const qGrid = g.add(pointGrid, { countX: 4, countY: 1, countZ: 4, spacing: [2, 2, 2] }, "queries");
    const qBox = g.add(
      setBounds,
      {
        boundsMin: fieldFromJson({ fn: "position" }),
        boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [1, 1, 1]] }),
      },
      "queryBox",
    );
    const tGrid = g.add(pointGrid, { countX: 2, countY: 1, countZ: 2, spacing: [3, 3, 3], origin: [1.5, 0, 1.5] }, "targets");
    const tBox = g.add(
      setBounds,
      {
        boundsMin: fieldFromJson({ fn: "position" }),
        boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [0.5, 1, 0.5]] }),
      },
      "targetBox",
    );
    const probe = g.add(
      boxContact,
      {
        mode: "touch",
        // A per-query reach drawn from the node seed: the JSON has to carry
        // the field and the cook has to reproduce the draw.
        margin: fieldFromJson({ fn: "mul", args: [{ fn: "randomField" }, 0.6] }),
        countAttr: "n",
        targetAttr: "who",
      },
      "probe",
    );
    g.connect(qGrid, "out", qBox, "in");
    g.connect(tGrid, "out", tBox, "in");
    g.connect(qBox, "out", probe, "in");
    g.connect(tBox, "out", probe, "targets");
    g.output(probe, "out", "probed");
    return g;
  }

  it("round-trips through the serialized format, a field margin included, and cooks the same", async () => {
    const json = serializeGraph(build());
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build())).outputs.probed);
    const b = firstGeo((await cook(back)).outputs.probed);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    const n = col(a, "n");
    expect(n.some((v) => v > 0)).toBe(true);
    expect(n.some((v) => v === 0)).toBe(true);
  });

  it("loads from hand-written JSON with the defaults filled in", async () => {
    const json = serializeGraph(build());
    const node = json.nodes.find((x) => x.id === "probe")!;
    (node as { params: unknown }).params = { mode: "overlap" };
    const out = firstGeo((await cook(deserializeGraph(JSON.parse(JSON.stringify(json))))).outputs.probed);
    expect(out.attrs.point.get("contact")?.type).toBe("bool");
    expect(out.attrs.point.get("n")).toBeUndefined();
  });
});

describe("boxContact: refusals", () => {
  const one = (): Geometry => cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);

  it("an inside-out box, naming the pin, the point and the axis", async () => {
    const bad = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }, { lo: [0, 2, 0], hi: [1, 1, 1] }]);
    expect(await rejection(contact(one(), bad))).toMatch(/point 1 on pin "targets" has an inside-out box along y/);
  });

  it("a non-finite box", async () => {
    const bad = cloud([{ lo: [0, 0, Number.POSITIVE_INFINITY], hi: [1, 1, 1] }]);
    expect(await rejection(contact(bad, one()))).toMatch(/point 0 on pin "in" has a box that is not finite along z/);
  });

  it("a cloud with points but no bounds pair", async () => {
    const bare = one();
    bare.attrs.point.remove("boundsMax");
    expect(await rejection(contact(one(), bare))).toMatch(/pin "targets" has no "boundsMax" point attribute.*setBounds/);
  });

  it('"local" on points with no P', async () => {
    const bare = one();
    bare.attrs.point.remove("P");
    expect(await rejection(contact(bare, one(), { queryFrame: "local" }))).toMatch(/"queryFrame" is "local".*no P attribute/);
  });

  it("nothing to write, and two reports on one name", async () => {
    expect(await rejection(contact(one(), one(), { hitAttr: "" }))).toMatch(/nothing to write/);
    expect(await rejection(contact(one(), one(), { countAttr: "contact" }))).toMatch(/"hitAttr" and "countAttr" are both "contact"/);
  });

  it("an unknown mode or frame, listing the valid ones", async () => {
    expect(await rejection(contact(one(), one(), { mode: "intersect" }))).toMatch(/valid: overlap, touch, contain, inside/);
    expect(await rejection(contact(one(), one(), { targetFrame: "object" }))).toMatch(/valid: world, local/);
  });
});
