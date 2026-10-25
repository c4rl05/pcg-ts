/**
 * `boxContact`'s `pairs` output: one point per (query, target) pair that
 * met, its shared region, and the face frame of a one-face contact.
 *
 * The expected pairs here come from a reference written in THIS file and
 * sharing no code with the node: per axis, two closed intervals and the
 * mode's comparison, the region as [max of the mins, min of the maxes],
 * and "flush" as the two intervals meeting at exactly one end. The node
 * argues from centres and half-extents instead (|d| = ha + hb), so the two
 * agree only if both are right. The along table is shellSplit's, and one
 * test checks it against shellSplit itself rather than against a comment.
 * Hand-built layouts state their shared walls as numbers worked out by
 * hand; nothing is recorded from a run.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { Graph, cook, makeGeometryItem, type DataCollection, type NodeHandle } from "../graph/index.js";
import { Pcg32 } from "../random/index.js";
import { boxContact, type BoxContactParams } from "./boxContact.js";
import {
  deserializeGraph,
  fieldFromJson,
  filterByExpression,
  placeBox,
  pointGrid,
  serializeGraph,
  setBounds,
  shellSplit,
  splitBox,
} from "./index.js";
import { firstGeo, permutePoints, runNode, shuffledOrder, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

interface BoxSpec {
  lo: number[];
  hi: number[];
  P?: number[];
  rot?: number[];
  scale?: number[];
  id?: number;
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
    if (s.id !== undefined) (pts.get("id") ?? pts.add("id", "i32", 1, 0)).setTuple(i, [s.id]);
  });
  return geo;
}

async function run(
  q: Geometry,
  t: Geometry,
  params: Record<string, unknown> = {},
  seed = 1,
): Promise<{ out: Geometry; pairs: Geometry }> {
  const o = await runNode(boxContact, params, { in: [makeGeometryItem(q)], targets: [makeGeometryItem(t)] }, seed);
  return { out: firstGeo(o.out), pairs: firstGeo(o.pairs) };
}

async function rejection(p: Promise<unknown>): Promise<string> {
  const err: unknown = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

/** One pair as the tests compare it; the frame fields only where written. */
interface Pair {
  q: number;
  t: number;
  lo: number[];
  hi: number[];
  P: number[];
  outward?: number[];
  outAxis?: number;
  alongAxis?: number;
  alongSign?: number;
}

function readPairs(geo: Geometry): Pair[] {
  const pts = geo.attrs.point;
  const n = pts.count;
  const q = col(geo, "queryIndex");
  const t = col(geo, "targetIndex");
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  const P = col(geo, "P");
  const frame = pts.get("outward") !== undefined;
  const ow = frame ? col(geo, "outward") : [];
  const oa = frame ? col(geo, "outAxis") : [];
  const aa = frame ? col(geo, "alongAxis") : [];
  const as = frame ? col(geo, "alongSign") : [];
  const out: Pair[] = [];
  for (let k = 0; k < n; k++) {
    const p: Pair = {
      q: q[k],
      t: t[k],
      lo: lo.slice(k * 3, k * 3 + 3),
      hi: hi.slice(k * 3, k * 3 + 3),
      P: P.slice(k * 3, k * 3 + 3),
    };
    if (frame) {
      p.outward = ow.slice(k * 3, k * 3 + 3);
      p.outAxis = oa[k];
      p.alongAxis = aa[k];
      p.alongSign = as[k];
    }
    out.push(p);
  }
  return out;
}

const f = Math.fround;

/**
 * shellSplit's along for a face whose outward normal is the key, from its
 * `alongAxisAttr` / `alongSignAttr` descriptions: x for south, north, floor
 * and ceiling; z for west and east; signed so that along x up = outward.
 * The test "the face frame is shellSplit's" holds this table to the node.
 */
const ALONG: Record<string, [number, number]> = {
  "0,0,-1": [0, -1], // south
  "0,0,1": [0, 1], // north
  "-1,0,0": [2, 1], // west
  "1,0,0": [2, -1], // east
  "0,-1,0": [0, 1], // floor
  "0,1,0": [0, 1], // ceiling
};

// ---------------------------------------------------------------------------
// The reference: intervals, world frame only.

interface Margins {
  sym?: number[];
  min?: number[];
  max?: number[];
}

function reference(
  qs: BoxSpec[],
  ts: BoxSpec[],
  mode: Mode,
  margins: Margins = {},
  skip?: (i: number, j: number) => boolean,
): Pair[] {
  const sym = margins.sym ?? [0, 0, 0];
  const mn = margins.min ?? [0, 0, 0];
  const mx = margins.max ?? [0, 0, 0];
  const out: Pair[] = [];
  qs.forEach((qb, i) => {
    const a0 = qb.lo.map((v, k) => f(v) - (sym[k] + mn[k]));
    const a1 = qb.hi.map((v, k) => f(v) + (sym[k] + mx[k]));
    if ([0, 1, 2].some((k) => a1[k] < a0[k])) return;
    ts.forEach((tb, j) => {
      if (skip?.(i, j)) return;
      const b0 = tb.lo.map(f);
      const b1 = tb.hi.map(f);
      for (let k = 0; k < 3; k++) {
        const ok =
          mode === "overlap"
            ? a0[k] < b1[k] && b0[k] < a1[k]
            : mode === "touch"
              ? a0[k] <= b1[k] && b0[k] <= a1[k]
              : mode === "contain"
                ? a0[k] <= b0[k] && b1[k] <= a1[k]
                : b0[k] <= a0[k] && a1[k] <= b1[k];
        if (!ok) return;
      }
      const lo: number[] = [];
      const hi: number[] = [];
      const flush: number[] = [];
      for (let k = 0; k < 3; k++) {
        const bothFlat = a0[k] === a1[k] && b0[k] === b1[k];
        if (a1[k] === b0[k] && !bothFlat) {
          flush.push(k, 1);
          lo.push(b0[k]);
          hi.push(b0[k]);
        } else if (b1[k] === a0[k] && !bothFlat) {
          flush.push(k, -1);
          lo.push(b1[k]);
          hi.push(b1[k]);
        } else {
          lo.push(Math.max(a0[k], b0[k]));
          hi.push(Math.min(a1[k], b1[k]));
        }
      }
      const p: Pair = { q: i, t: j, lo: lo.map(f), hi: hi.map(f), P: lo.map((v, k) => f(0.5 * (f(v) + f(hi[k])))) };
      if (mode === "touch") {
        if (flush.length === 2) {
          const ow = [0, 0, 0];
          ow[flush[0]] = flush[1];
          p.outward = ow;
          p.outAxis = flush[0];
          [p.alongAxis, p.alongSign] = ALONG[ow.join(",")];
        } else {
          p.outward = [0, 0, 0];
          p.outAxis = -1;
          p.alongAxis = -1;
          p.alongSign = 0;
        }
      }
      out.push(p);
    });
  });
  return out;
}

function box(lo: number[], size: number[], id?: number): BoxSpec {
  return { lo, hi: lo.map((v, k) => v + size[k]), ...(id !== undefined ? { id } : {}) };
}

// ---------------------------------------------------------------------------

describe("boxContact pairs: hand-built room layouts", () => {
  // A 2x2 plan, rooms 4 x 3 x 4: A south-west, B south-east, C north-west,
  // D north-east (north is +z).
  const plan = [box([0, 0, 0], [4, 3, 4]), box([4, 0, 0], [4, 3, 4]), box([0, 0, 4], [4, 3, 4]), box([4, 0, 4], [4, 3, 4])];

  it("a 2x2 grid: four shared walls seen from both sides, four corner edges, nothing else", async () => {
    const g = cloud(plan);
    const { out, pairs } = await run(g, g, { mode: "touch", excludeSelf: true, countAttr: "n" });
    const got = readPairs(pairs);
    // Every room touches the other three: two walls and one edge.
    expect(col(out, "n")).toEqual([3, 3, 3, 3]);
    expect(got.map((p) => [p.q, p.t])).toEqual([
      [0, 1], [0, 2], [0, 3],
      [1, 0], [1, 2], [1, 3],
      [2, 0], [2, 1], [2, 3],
      [3, 0], [3, 1], [3, 2],
    ]);
    const at = (q: number, t: number) => got.find((p) => p.q === q && p.t === t)!;
    // A|B: the wall x = 4, the full 3 x 4 of it, east of A.
    expect(at(0, 1)).toMatchObject({ lo: [4, 0, 0], hi: [4, 3, 4], P: [4, 1.5, 2], outward: [1, 0, 0], outAxis: 0, alongAxis: 2, alongSign: -1 });
    // The same wall from B: west of B.
    expect(at(1, 0)).toMatchObject({ lo: [4, 0, 0], hi: [4, 3, 4], outward: [-1, 0, 0], outAxis: 0, alongAxis: 2, alongSign: 1 });
    // A|C: z = 4, north of A; C sees it to its south.
    expect(at(0, 2)).toMatchObject({ lo: [0, 0, 4], hi: [4, 3, 4], P: [2, 1.5, 4], outward: [0, 0, 1], outAxis: 2, alongAxis: 0, alongSign: 1 });
    expect(at(2, 0)).toMatchObject({ outward: [0, 0, -1], outAxis: 2, alongAxis: 0, alongSign: -1 });
    // B|D and C|D.
    expect(at(1, 3)).toMatchObject({ lo: [4, 0, 4], hi: [8, 3, 4], outward: [0, 0, 1] });
    expect(at(2, 3)).toMatchObject({ lo: [4, 0, 4], hi: [4, 3, 8], outward: [1, 0, 0] });
    // A and D share only the vertical edge x = 4, z = 4: a segment, no face.
    expect(at(0, 3)).toMatchObject({ lo: [4, 0, 4], hi: [4, 3, 4], P: [4, 1.5, 4], outward: [0, 0, 0], outAxis: -1, alongAxis: -1, alongSign: 0 });
    expect(at(1, 2)).toMatchObject({ lo: [4, 0, 4], hi: [4, 3, 4], outAxis: -1 });
    expect(got).toEqual(reference(plan, plan, "touch", {}, (i, j) => i === j));
  });

  it('"overlap" on the same plan: neighbouring rooms do not overlap, so there are no pairs', async () => {
    const g = cloud(plan);
    const { pairs } = await run(g, g, { mode: "overlap", excludeSelf: true });
    expect(pairs.pointCount).toBe(0);
  });

  it("an L: the arm shares only part of the long room's north wall, and that part is the region", async () => {
    // Long room 6 x 3 x 3 along x; the arm 3 x 3 x 4 north of its west half;
    // a third room east of the arm, north of the long room's east half.
    const rooms = [box([0, 0, 0], [6, 3, 3]), box([0, 0, 3], [3, 3, 4]), box([3, 0, 3], [3, 3, 2])];
    const g = cloud(rooms);
    const got = readPairs((await run(g, g, { mode: "touch", excludeSelf: true })).pairs);
    const at = (q: number, t: number) => got.find((p) => p.q === q && p.t === t);
    expect(at(0, 1)).toMatchObject({ lo: [0, 0, 3], hi: [3, 3, 3], P: [1.5, 1.5, 3], outward: [0, 0, 1], outAxis: 2 });
    expect(at(0, 2)).toMatchObject({ lo: [3, 0, 3], hi: [6, 3, 3], outward: [0, 0, 1], outAxis: 2 });
    // Arm | third room: x = 3, z from 3 to 5 — the third room is the shorter.
    expect(at(1, 2)).toMatchObject({ lo: [3, 0, 3], hi: [3, 3, 5], P: [3, 1.5, 4], outward: [1, 0, 0], alongAxis: 2, alongSign: -1 });
    expect(got).toHaveLength(6);
    expect(got).toEqual(reference(rooms, rooms, "touch", {}, (i, j) => i === j));
  });

  it("a corner-only touch counts under touch, as the node's touch does, and is a point with no face", async () => {
    const a = cloud([box([0, 0, 0], [1, 1, 1])]);
    const b = cloud([box([1, 1, 1], [1, 1, 1])]);
    const touch = await run(a, b, { mode: "touch" });
    expect(col(touch.out, "contact")).toEqual([1]);
    expect(readPairs(touch.pairs)).toEqual([
      { q: 0, t: 0, lo: [1, 1, 1], hi: [1, 1, 1], P: [1, 1, 1], outward: [0, 0, 0], outAxis: -1, alongAxis: -1, alongSign: 0 },
    ]);
    expect((await run(a, b, { mode: "overlap" })).pairs.pointCount).toBe(0);
  });

  it("flat rooms (a plan with no height): the walls are still faces, flat on two axes", async () => {
    const rooms = [box([0, 0, 0], [4, 0, 4]), box([4, 0, 0], [4, 0, 4])];
    const g = cloud(rooms);
    const got = readPairs((await run(g, g, { mode: "touch", excludeSelf: true })).pairs);
    // y is flat on both, so it is not a touching axis: one face, across x.
    expect(got[0]).toMatchObject({ q: 0, t: 1, lo: [4, 0, 0], hi: [4, 0, 4], outward: [1, 0, 0], outAxis: 0 });
    expect(got).toEqual(reference(rooms, rooms, "touch", {}, (i, j) => i === j));
  });

  it("a floor and a ceiling: rooms stacked in y touch across y", async () => {
    const rooms = [box([0, 0, 0], [4, 3, 4]), box([1, 3, 1], [2, 3, 2])];
    const g = cloud(rooms);
    const got = readPairs((await run(g, g, { mode: "touch", excludeSelf: true })).pairs);
    expect(got[0]).toMatchObject({ q: 0, t: 1, lo: [1, 3, 1], hi: [3, 3, 3], outward: [0, 1, 0], outAxis: 1, alongAxis: 0, alongSign: 1 });
    expect(got[1]).toMatchObject({ q: 1, t: 0, outward: [0, -1, 0], outAxis: 1, alongAxis: 0, alongSign: 1 });
  });
});

describe("boxContact pairs: what each mode's box is", () => {
  const q = [box([0, 0, 0], [4, 4, 4])];
  it("overlap: the shared volume", async () => {
    const t = [box([3, 1, -1], [2, 2, 2])];
    const got = readPairs((await run(cloud(q), cloud(t), { mode: "overlap" })).pairs);
    expect(got).toEqual([{ q: 0, t: 0, lo: [3, 1, 0], hi: [4, 3, 1], P: [3.5, 2, 0.5] }]);
    // No face frame outside "touch".
    expect((await run(cloud(q), cloud(t), { mode: "overlap" })).pairs.attrs.point.get("outward")).toBeUndefined();
  });

  it("contain: the target's box; inside: the query's as tested", async () => {
    const inner = [box([1, 1, 1], [1, 2, 1])];
    expect(readPairs((await run(cloud(q), cloud(inner), { mode: "contain" })).pairs)).toEqual([
      { q: 0, t: 0, lo: [1, 1, 1], hi: [2, 3, 2], P: [1.5, 2, 1.5] },
    ]);
    // The query grown by 0.5 lies inside a 6-box: the region is the grown query.
    const outer = [box([-1, -1, -1], [6, 6, 6])];
    expect(readPairs((await run(cloud(q), cloud(outer), { mode: "inside", margin: [0.5, 0.5, 0.5] })).pairs)).toEqual([
      { q: 0, t: 0, lo: [-0.5, -0.5, -0.5], hi: [4.5, 4.5, 4.5], P: [2, 2, 2] },
    ]);
  });

  it("every mode against the reference on one mixed scene", async () => {
    const qs = [box([0, 0, 0], [4, 4, 4]), box([4, 0, 0], [2, 4, 4]), box([1, 1, 1], [1, 1, 1])];
    const ts = [box([1, 1, 1], [1, 1, 1]), box([4, 4, 4], [1, 1, 1]), box([-1, -1, -1], [6, 6, 6]), box([2, 0, 0], [4, 4, 0])];
    for (const mode of MODES) {
      expect(readPairs((await run(cloud(qs), cloud(ts), { mode })).pairs), mode).toEqual(reference(qs, ts, mode));
    }
  });
});

describe("boxContact pairs: the face frame is shellSplit's", () => {
  it("for each of the six faces, the pair's (outward, alongAxis, alongSign) is what shellSplit writes on that face", async () => {
    const cell = cloud([box([0, 0, 0], [4, 4, 4])]);
    const shell = firstGeo((await runNode(shellSplit, { thickness: [1] }, { in: [makeGeometryItem(cell)] })).out);
    const ow = col(shell, "outward");
    const aa = col(shell, "alongAxis");
    const as = col(shell, "alongSign");
    const fromShell = new Map<string, [number, number]>();
    for (let k = 0; k < shell.pointCount; k++) fromShell.set(ow.slice(k * 3, k * 3 + 3).join(","), [aa[k], as[k]]);
    expect(fromShell.size).toBe(6);
    // A unit query at the origin and a neighbour across each of its faces.
    const qb = cloud([box([0, 0, 0], [1, 1, 1])]);
    for (const [key, [axis, sign]] of fromShell) {
      const n = key.split(",").map(Number);
      const t = cloud([box(n, [1, 1, 1])]);
      const [p] = readPairs((await run(qb, t, { mode: "touch" })).pairs);
      expect(p.outward!.join(","), key).toBe(key);
      expect([p.alongAxis, p.alongSign], key).toEqual([axis, sign]);
      expect(ALONG[key], key).toEqual([axis, sign]);
    }
  });
});

describe("boxContact pairs: order, duplicates and determinism", () => {
  function scatter(n: number, seed: number, sizes = [0, 0.25, 0.5, 1, 2, 4, 8]): BoxSpec[] {
    // On a quarter lattice, so faces coincide often and every number is
    // exact in f32 and f64: the reference and the node must agree to the bit.
    const rng = new Pcg32(seed);
    const out: BoxSpec[] = [];
    for (let i = 0; i < n; i++) {
      const lo = [0, 1, 2].map(() => Math.floor(rng.nextF32() * 64) * 0.25);
      const size = [0, 1, 2].map(() => sizes[Math.floor(rng.nextF32() * sizes.length)]);
      out.push(box(lo, size, Math.floor(rng.nextF32() * 5)));
    }
    return out;
  }

  it("sorted by query and then target index, and as many as countAttr counts", async () => {
    const qs = scatter(150, 3);
    const ts = scatter(150, 4);
    const { out, pairs } = await run(cloud(qs), cloud(ts), { mode: "touch", countAttr: "n", targetAttr: "who" });
    const got = readPairs(pairs);
    for (let k = 1; k < got.length; k++) {
      const a = got[k - 1];
      const b = got[k];
      expect(a.q < b.q || (a.q === b.q && a.t < b.t)).toBe(true);
    }
    const n = col(out, "n");
    expect(got.length).toBe(n.reduce((s, v) => s + v, 0));
    // The nearest target is one of the query's pairs.
    col(out, "who").forEach((w, i) => {
      if (w >= 0) expect(got.some((p) => p.q === i && p.t === w)).toBe(true);
    });
  });

  it("one cloud, excludeSelf: every unordered pair exactly twice, mirrored, and lt() keeps each once", async () => {
    const bs = scatter(200, 5);
    const g = cloud(bs);
    const got = readPairs((await run(g, g, { mode: "touch", excludeSelf: true })).pairs);
    const key = (p: Pair) => `${p.q},${p.t}`;
    const all = new Map(got.map((p) => [key(p), p]));
    expect(all.size).toBe(got.length);
    for (const p of got) {
      expect(p.q).not.toBe(p.t);
      const back = all.get(`${p.t},${p.q}`)!;
      expect(back, key(p)).toBeDefined();
      // The same region from the other side, the normal turned round.
      expect(back.lo).toEqual(p.lo);
      expect(back.hi).toEqual(p.hi);
      expect(back.outward!.map((v) => -v + 0)).toEqual(p.outward!.map((v) => v + 0));
    }
    expect(got.filter((p) => p.q < p.t)).toHaveLength(got.length / 2);
  });

  it("shuffling either input permutes the pairs with it and changes no region", async () => {
    const qs = scatter(120, 6);
    const ts = scatter(140, 7);
    const base = readPairs((await run(cloud(qs), cloud(ts), { mode: "touch" })).pairs);
    const qOrder = shuffledOrder(qs.length, 11);
    const tOrder = shuffledOrder(ts.length, 12);
    const shuffled = await run(permutePoints(cloud(qs), qOrder), permutePoints(cloud(ts), tOrder), { mode: "touch" });
    const got = readPairs(shuffled.pairs);
    // Still sorted in the NEW indices...
    for (let k = 1; k < got.length; k++) {
      expect(got[k - 1].q < got[k].q || (got[k - 1].q === got[k].q && got[k - 1].t < got[k].t)).toBe(true);
    }
    // ...and, mapped back to the old ones, the same pairs with the same boxes.
    const mapped = got
      .map((p) => ({ ...p, q: qOrder[p.q], t: tOrder[p.t] }))
      .sort((a, b) => a.q - b.q || a.t - b.t);
    expect(mapped).toEqual(base);
  });

  it("cooks byte-identically twice, and a pair's seed is hashed from (node seed, query, target)", async () => {
    const qs = scatter(80, 8);
    const ts = scatter(80, 9);
    const a = await run(cloud(qs), cloud(ts), { mode: "touch" }, 5);
    const b = await run(cloud(qs), cloud(ts), { mode: "touch" }, 5);
    expect(snapshotGeometry(b.pairs)).toEqual(snapshotGeometry(a.pairs));
    // One more target at the END renumbers nothing: every old pair keeps its
    // seed, though new pairs now sit between them.
    const more = await run(cloud(qs), cloud([...ts, box([0, 0, 0], [16, 16, 16])]), { mode: "touch" }, 5);
    const seedOf = (geo: Geometry) => {
      const q = col(geo, "queryIndex");
      const t = col(geo, "targetIndex");
      const s = col(geo, "seed");
      return new Map(q.map((v, k) => [`${v},${t[k]}`, s[k]]));
    };
    const before = seedOf(a.pairs);
    const after = seedOf(more.pairs);
    expect(after.size).toBeGreaterThan(before.size);
    for (const [k, s] of before) expect(after.get(k), k).toBe(s);
    // A different node seed moves every seed.
    const c = await run(cloud(qs), cloud(ts), { mode: "touch" }, 6);
    const other = col(c.pairs, "seed");
    expect(col(a.pairs, "seed").every((s, k) => s !== other[k])).toBe(true);
  });
});

describe("boxContact pairs: the randomized cross-check against brute force", () => {
  function scatter(n: number, seed: number): BoxSpec[] {
    // Sizes over five decades on a 1/16 lattice, points included, so the
    // targets fall in many size classes and many faces coincide exactly.
    const sizes = [0, 0.0625, 0.25, 1, 4, 16, 64];
    const rng = new Pcg32(seed);
    const out: BoxSpec[] = [];
    for (let i = 0; i < n; i++) {
      const lo = [0, 1, 2].map(() => Math.floor(rng.nextF32() * 1600) * 0.0625 - 50);
      const s = sizes[Math.floor(rng.nextF32() * sizes.length)];
      const size = [0, 1, 2].map(() => (rng.nextF32() < 0.3 ? 0 : s) * (1 + Math.floor(rng.nextF32() * 3)));
      out.push(box(lo, size, Math.floor(rng.nextF32() * 4)));
    }
    return out;
  }

  const qs = scatter(400, 21);
  const ts = scatter(500, 22);

  for (const mode of MODES) {
    it(`${mode}: every pair, region and frame, in order`, async () => {
      const got = readPairs((await run(cloud(qs), cloud(ts), { mode })).pairs);
      const want = reference(qs, ts, mode);
      expect(want.length).toBeGreaterThan(mode === "contain" || mode === "inside" ? 5 : 100);
      expect(got).toEqual(want);
    });
  }

  it("touch with one-sided margins (lattice values, so exact) and an exclusion", async () => {
    const margins = { sym: [0.0625, 0, 0], min: [0, 0.25, -0.0625], max: [0.125, -0.0625, 0.5] };
    const got = readPairs(
      (
        await run(cloud(qs), cloud(ts), {
          mode: "touch",
          margin: margins.sym,
          marginMin: margins.min,
          marginMax: margins.max,
          excludeAttr: "id",
        })
      ).pairs,
    );
    const want = reference(qs, ts, "touch", margins, (i, j) => qs[i].id === ts[j].id);
    expect(want.length).toBeGreaterThan(100);
    expect(want.some((p) => p.outAxis! >= 0)).toBe(true);
    expect(got).toEqual(want);
  });

  it("one cloud on both pins, excludeSelf", async () => {
    const g = cloud(qs);
    expect(readPairs((await run(g, g, { mode: "touch", excludeSelf: true })).pairs)).toEqual(
      reference(qs, qs, "touch", {}, (i, j) => i === j),
    );
  });
});

describe("boxContact pairs: margins and exclusion", () => {
  it("a one-face reach lands the region ON the target's face, flat", async () => {
    // A 1-box reaching 0.5 out of its +x face meets a target 0.5 away.
    const q = cloud([box([0, 0, 0], [1, 1, 1])]);
    const t = cloud([box([1.5, 0, 0], [1, 1, 1])]);
    const [p] = readPairs((await run(q, t, { mode: "touch", marginMax: [0.5, 0, 0] })).pairs);
    expect(p).toMatchObject({ lo: [1.5, 0, 0], hi: [1.5, 1, 1], outward: [1, 0, 0], outAxis: 0 });
    // The symmetric reach of 0.25 does not get there: no pair.
    expect((await run(q, t, { mode: "touch", margin: [0.25, 0.25, 0.25] })).pairs.pointCount).toBe(0);
  });

  it("the region sits on the target's STORED face even when its two bounds are far apart in magnitude", async () => {
    // tc - hb rebuilt from [1e-7, 1000] in f64 is 9.999996564e-8, not the
    // stored fround(1e-7): the region must read the stored corner.
    const q = cloud([{ lo: [-1, 0, 0], hi: [1e-7, 1, 1] }]);
    const t = cloud([{ lo: [1e-7, 0, 0], hi: [1000, 1, 1] }]);
    const [p] = readPairs((await run(q, t, { mode: "touch" })).pairs);
    expect(p.outAxis).toBe(0);
    expect(p.lo[0]).toBe(f(1e-7));
    expect(p.hi[0]).toBe(f(1e-7));
  });

  it('"contain" on one cloud is one-way: (i, j) without (j, i), unless the boxes are equal', async () => {
    const g = cloud([box([0, 0, 0], [4, 4, 4]), box([1, 1, 1], [1, 1, 1]), box([0, 0, 0], [4, 4, 4])]);
    const got = readPairs((await run(g, g, { mode: "contain", excludeSelf: true })).pairs);
    expect(got.map((p) => [p.q, p.t])).toEqual([[0, 1], [0, 2], [2, 0], [2, 1]]);
  });

  it("an excluded target is no pair, and a shrunk-to-nothing query has none", async () => {
    const q = cloud([box([0, 0, 0], [1, 1, 1], 7), box([0, 0, 0], [1, 1, 1], 8)]);
    const t = cloud([box([1, 0, 0], [1, 1, 1], 7)]);
    const got = readPairs((await run(q, t, { mode: "touch", excludeAttr: "id" })).pairs);
    expect(got.map((p) => [p.q, p.t])).toEqual([[1, 0]]);
    expect((await run(q, t, { mode: "touch", margin: [-0.6, 0, 0] })).pairs.pointCount).toBe(0);
  });
});

describe("boxContact pairs: oriented boxes (a \"local\" frame)", () => {
  function rotY(theta: number): number[] {
    return [0, Math.sin(theta / 2), 0, Math.cos(theta / 2)];
  }
  function rotated(n: number, seed: number): BoxSpec[] {
    const rng = new Pcg32(seed);
    const out: BoxSpec[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        lo: [-0.5, -0.5, -0.5],
        hi: [0.5, 0.5, 0.5],
        P: [rng.nextF32() * 6, rng.nextF32() * 2, rng.nextF32() * 6],
        rot: rotY(rng.nextF32() * Math.PI),
        scale: [1 + rng.nextF32(), 1, 1 + rng.nextF32()],
      });
    }
    return out;
  }

  it("the pairs are exactly the hits, one target at a time, and carry no region", async () => {
    const qs = rotated(40, 31);
    const ts = rotated(40, 32);
    const params = { mode: "touch", queryFrame: "local", targetFrame: "local", countAttr: "n" };
    const { out, pairs } = await run(cloud(qs), cloud(ts), params);
    const got = readPairs(pairs);
    // The brute-force set: the node's own exact test, asked of ONE target at
    // a time, so no grid is involved and the pairs must equal it.
    const want: number[][] = [];
    const single = await Promise.all(ts.map((tb) => run(cloud(qs), cloud([tb]), params)));
    qs.forEach((_, i) => ts.forEach((__, j) => col(single[j].out, "contact")[i] === 1 && want.push([i, j])));
    expect(got.map((p) => [p.q, p.t])).toEqual(want);
    expect(want.length).toBeGreaterThan(10);
    expect(got.length).toBe(col(out, "n").reduce((s, v) => s + v, 0));
    // No region: a zero box at P, the midpoint of the two centres (the
    // centre of a box symmetric about its point is that point, P).
    expect(pairs.attrs.point.get("outward")).toBeUndefined();
    for (const p of got) {
      expect(p.lo).toEqual(p.P);
      expect(p.hi).toEqual(p.P);
      const mid = [0, 1, 2].map((k) => f(0.5 * (f(qs[p.q].P![k]) + f(ts[p.t].P![k]))));
      for (let k = 0; k < 3; k++) expect(p.P[k]).toBeCloseTo(mid[k], 5);
    }
  });

  it("one local side is enough to write no region, rotation or not", async () => {
    const q = cloud([box([0, 0, 0], [1, 1, 1])]);
    const t = cloud([{ lo: [0, 0, 0], hi: [1, 1, 1], P: [1, 0, 0] }]);
    const { pairs } = await run(q, t, { mode: "touch", targetFrame: "local" });
    expect(readPairs(pairs)).toEqual([{ q: 0, t: 0, lo: [1, 0.5, 0.5], hi: [1, 0.5, 0.5], P: [1, 0.5, 0.5] }]);
  });
});

describe("boxContact pairs: on demand", () => {
  function build(declarePairs: boolean): Graph {
    const g = new Graph(3);
    const grid = g.add(pointGrid, { countX: 3, countY: 1, countZ: 3, spacing: [2, 2, 2] }, "grid");
    const rooms = g.add(
      setBounds,
      {
        boundsMin: fieldFromJson({ fn: "position" }),
        boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [2, 3, 2]] }),
      },
      "rooms",
    );
    const probe = g.add(boxContact, { mode: "touch", excludeSelf: true, countAttr: "n" }, "probe");
    g.connect(grid, "out", rooms, "in");
    g.connect(rooms, "out", probe, "in");
    g.connect(rooms, "out", probe, "targets");
    g.output(probe, "out", "probed");
    if (declarePairs) g.output(probe, "pairs", "pairs");
    return g;
  }

  it("unwired, the pairs are not built; declared, they are; and `out` is the same bytes either way", async () => {
    const lazy = build(false);
    const r0 = await cook(lazy);
    expect(lazy.require("probe").cache?.outputs.pairs).toEqual([]);
    const eager = build(true);
    const r1 = await cook(eager);
    const pairs = firstGeo(r1.outputs.pairs);
    // 3x3 rooms of 2 x 3 x 2: 12 shared walls and 8 edges, each seen twice.
    expect(pairs.pointCount).toBe(40);
    expect(snapshotGeometry(firstGeo(r1.outputs.probed))).toEqual(snapshotGeometry(firstGeo(r0.outputs.probed)));
    // Declaring the output later on the SAME graph recooks the node.
    lazy.output({ id: "probe" }, "pairs", "pairs");
    const r2 = await cook(lazy);
    expect(r2.stats.cooked).toBeGreaterThan(0);
    expect(snapshotGeometry(firstGeo(r2.outputs.pairs))).toEqual(snapshotGeometry(pairs));
  });

  it("a connection reads it too", async () => {
    const g = build(false);
    const keep = g.add(filterByExpression, { predicate: fieldFromJson({ fn: "ge", args: [{ fn: "attribute", name: "outAxis" }, 0] }) }, "walls");
    g.connect({ id: "probe" }, "pairs", keep, "in");
    g.output(keep, "out", "walls");
    const r = await cook(g);
    expect(firstGeo(r.outputs.walls).pointCount).toBe(24);
  });

  it("round-trips through the serialized format with the pair names and the pairs output", async () => {
    const g = build(true);
    const probe = { id: "probe" } as NodeHandle<BoxContactParams>;
    g.setParam(probe, "pairQueryAttr", "room");
    g.setParam(probe, "pairTargetAttr", "other");
    g.setParam(probe, "pairAlongSignAttr", "");
    const text = JSON.stringify(serializeGraph(g));
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(g)).outputs.pairs);
    const b = firstGeo((await cook(back)).outputs.pairs);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(a.attrs.point.get("room")?.type).toBe("i32");
    expect(a.attrs.point.get("other")?.type).toBe("i32");
    expect(a.attrs.point.get("alongSign")).toBeUndefined();
    expect(a.attrs.point.get("alongAxis")?.type).toBe("i32");
  });

  it("the pair ceiling is a refusal only when the pairs are read", async () => {
    // 1025 x 1024 boxes all overlapping: 1,049,600 pairs, past the ceiling.
    const qs = cloud(Array.from({ length: 1025 }, () => box([0, 0, 0], [1, 1, 1])));
    const ts = cloud(Array.from({ length: 1024 }, () => box([0, 0, 0], [1, 1, 1])));
    const msg = await rejection(run(qs, ts, { mode: "overlap" }));
    expect(msg).toMatch(/more than 1048576 \(query, target\) pairs/);
    expect(msg).toMatch(/"margin"/);
    // Unread (the executor hands an empty set), the same cook succeeds.
    const o = await boxContact.execute({
      inputs: { in: [makeGeometryItem(qs)], targets: [makeGeometryItem(ts)] },
      params: { ...boxContact.defaultParams, mode: "overlap" },
      seed: 1,
      checkCancelled() {},
      readOutputs: new Set<string>(),
    });
    expect((o as Record<string, DataCollection>).pairs).toEqual([]);
  }, 60_000);
});

describe("boxContact pairs: refusals", () => {
  const q = cloud([box([0, 0, 0], [1, 1, 1])]);
  it("an empty index name, naming the param and its default", async () => {
    expect(await rejection(run(q, q, { pairQueryAttr: "" }))).toMatch(/param "pairQueryAttr" is empty.*"queryIndex"/);
    expect(await rejection(run(q, q, { pairTargetAttr: "" }))).toMatch(/param "pairTargetAttr" is empty.*"targetIndex"/);
  });
  it("a standard column, and two pair params on one name", async () => {
    expect(await rejection(run(q, q, { pairTargetAttr: "P" }))).toMatch(/"pairTargetAttr" is "P", one of the standard point columns/);
    expect(await rejection(run(q, q, { pairOutAxisAttr: "queryIndex" }))).toMatch(/"pairQueryAttr" and "pairOutAxisAttr" both name "queryIndex"/);
  });
});

describe("boxContact pairs: a door on every shared wall", () => {
  it("rooms from a subdivision -> pairs -> one door centred on each wall, at the floor, through it", async () => {
    // A 12 x 3 x 8 footprint cut into three strips along x (5, 4, 3) and each
    // strip into two rooms along z (3, 5): a 3 x 2 plan of unequal rooms.
    const g = new Graph(9);
    const site = g.add(pointGrid, { countX: 1, countY: 1, countZ: 1 }, "site");
    const lot = g.add(setBounds, { boundsMin: [0, 0, 0], boundsMax: [12, 3, 8] }, "lot");
    const strips = g.add(splitBox, { axis: "x", labels: ["a", "b", "c"], sizes: [5, 4, 3], units: ["absolute", "absolute", "absolute"] }, "strips");
    const rooms = g.add(splitBox, { axis: "z", labels: ["front", "back"], sizes: [3, 5], units: ["absolute", "absolute"] }, "rooms");
    const contact = g.add(boxContact, { mode: "touch", excludeSelf: true }, "contact");
    // Each wall once (q < t), walls only: one face, not across y.
    const walls = g.add(
      filterByExpression,
      {
        predicate: fieldFromJson({
          fn: "mul",
          args: [
            { fn: "lt", args: [{ fn: "attribute", name: "queryIndex" }, { fn: "attribute", name: "targetIndex" }] },
            { fn: "mul", args: [{ fn: "ge", args: [{ fn: "attribute", name: "outAxis" }, 0] }, { fn: "ne", args: [{ fn: "attribute", name: "outAxis" }, 1] }] },
          ],
        }),
      },
      "walls",
    );
    // A door 0.9 wide, 2.1 tall, through a 0.2 wall: centred along the wall,
    // standing on the floor, centred on the wall's plane.
    const doors = g.add(
      placeBox,
      { frame: "face", size: [0.9, 2.1, 0.2], anchor: [0.5, 0, 0.5], fit: "allow" },
      "doors",
    );
    g.connect(site, "out", lot, "in");
    g.connect(lot, "out", strips, "in");
    g.connect(strips, "out", rooms, "in");
    g.connect(rooms, "out", contact, "in");
    g.connect(rooms, "out", contact, "targets");
    g.connect(contact, "pairs", walls, "in");
    g.connect(walls, "out", doors, "in");
    g.output(doors, "out", "doors");
    g.output(rooms, "out", "rooms");
    const r = await cook(g);
    expect(firstGeo(r.outputs.rooms).pointCount).toBe(6);
    const d = firstGeo(r.outputs.doors);
    const lo = col(d, "boundsMin");
    const hi = col(d, "boundsMax");
    const got = Array.from({ length: d.pointCount }, (_, k) =>
      [...lo.slice(k * 3, k * 3 + 3), ...hi.slice(k * 3, k * 3 + 3)].map((v) => Math.round(v * 1000) / 1000).join(" "),
    ).sort();
    // The seven shared walls, worked out from the cuts (x at 5 and 9, z at
    // 3), and the door each one gets.
    const want = [
      // z = 3 walls: along x, door centred on the wall's x span.
      "2.05 0 2.9 2.95 2.1 3.1", // a: x 0..5
      "6.55 0 2.9 7.45 2.1 3.1", // b: x 5..9
      "10.05 0 2.9 10.95 2.1 3.1", // c: x 9..12
      // x = 5 and x = 9 walls: along z, centred on the front (0..3) or back (3..8) span.
      "4.9 0 1.05 5.1 2.1 1.95",
      "4.9 0 5.05 5.1 2.1 5.95",
      "8.9 0 1.05 9.1 2.1 1.95",
      "8.9 0 5.05 9.1 2.1 5.95",
    ].sort();
    expect(got).toEqual(want);
  });
});
