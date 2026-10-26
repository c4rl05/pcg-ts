/**
 * `pivotBox`: every cell's P moved to a point of its box, the box
 * re-expressed about it, the WORLD box kept.
 *
 * Expectations are derived BY HAND from the description, or checked
 * against an ORACLE written here from it: the world box of a cell is its
 * eight corners mapped through P + R * (S * x), R the rotation MATRIX of
 * the normalized quaternion (built here from the quaternion's entries, not
 * through the library's rotateVec), all in f64. The oracle never reads the
 * node's output to decide what it should be.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import { Pcg32 } from "../random/index.js";
import { deserializeGraph, fieldFromJson, parseFieldText, pointGrid, serializeGraph, setBounds } from "./index.js";
import "../spawn/index.js";
import { pivotBox } from "./pivotBox.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

type V3 = [number, number, number];
type Q = [number, number, number, number];
interface Cell {
  P: V3;
  rot: Q;
  scale: V3;
  lo: V3;
  hi: V3;
}

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

async function pivot(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  return firstGeo((await runNode(pivotBox, params, { in: [makeGeometryItem(geo)] }, seed)).out);
}

const f = (text: string) => fieldFromJson(parseFieldText(text));

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

/** Cells as stored: every number rounded to f32 first, as the columns hold it. */
function cloud(list: Cell[]): Geometry {
  const geo = createPointCloud(list.length);
  const pts = geo.attrs.point;
  const cell = pts.add("cell", "i32", 1, -1);
  const tag = pts.add("tag", "string", 1, "");
  list.forEach((c, i) => {
    pts.require("P").setTuple(i, c.P);
    pts.require("rot").setTuple(i, c.rot);
    pts.require("scale").setTuple(i, c.scale);
    pts.require("boundsMin").setTuple(i, c.lo);
    pts.require("boundsMax").setTuple(i, c.hi);
    pts.require("seed").set(i, 100 + i);
    cell.set(i, i);
    tag.setString(i, `c${i}`);
  });
  return geo;
}

function readCells(geo: Geometry): Cell[] {
  const P = col(geo, "P");
  const r = col(geo, "rot");
  const s = col(geo, "scale");
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  const t3 = (a: number[], i: number): V3 => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
  return Array.from({ length: geo.pointCount }, (_, i) => ({
    P: t3(P, i),
    rot: [r[i * 4], r[i * 4 + 1], r[i * 4 + 2], r[i * 4 + 3]] as Q,
    scale: t3(s, i),
    lo: t3(lo, i),
    hi: t3(hi, i),
  }));
}

/** The rotation matrix (rows) of the quaternion, normalized; zero is the identity. */
function matrix(q: Q): number[][] {
  const len = Math.hypot(...q);
  const [x, y, z, w] = len === 0 ? [0, 0, 0, 1] : q.map((c) => c / len);
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}

/** The eight world corners of a cell, in f64. */
function world(c: Cell): V3[] {
  const R = matrix(c.rot);
  const out: V3[] = [];
  for (let k = 0; k < 8; k++) {
    const x = [0, 1, 2].map((a) => ((k >> a) & 1 ? c.hi[a] : c.lo[a]) * c.scale[a]);
    out.push([0, 1, 2].map((r) => c.P[r] + R[r][0] * x[0] + R[r][1] * x[1] + R[r][2] * x[2]) as V3);
  }
  return out;
}

const f32bits = new Float32Array(1);
const u32bits = new Uint32Array(f32bits.buffer);
/** The spacing of f32 at |x| (the gap to the next f32 away from zero). */
function ulp(x: number): number {
  f32bits[0] = Math.abs(Math.fround(x));
  const a = f32bits[0];
  u32bits[0] += 1;
  return f32bits[0] - a;
}

/** A random f32 in [-r, r], spread over many binades. */
function spread(rng: Pcg32, r: number): number {
  const mag = r * Math.pow(2, -Math.floor(rng.nextF32() * 12));
  return Math.fround((rng.nextF32() * 2 - 1) * mag);
}

const QUARTER: Q[] = [
  [0, Math.SQRT1_2, 0, Math.SQRT1_2],
  [0, 1, 0, 0],
  [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
  [0, 0, 0, -1],
];

function randomCell(rng: Pcg32): Cell {
  const pick = (n: number) => Math.floor(rng.nextF32() * n);
  const P: V3 = pick(3) === 0 ? [0, 0, 0] : [spread(rng, 1000), spread(rng, 1000), spread(rng, 1000)];
  const rk = pick(4);
  const rot: Q =
    rk === 0
      ? [0, 0, 0, 1]
      : rk === 1
        ? QUARTER[pick(QUARTER.length)]
        : rk === 2
          ? [rng.nextF32() - 0.5, rng.nextF32() - 0.5, rng.nextF32() - 0.5, rng.nextF32() - 0.5] // NOT unit: normalized by the node
          : (() => {
              const v = [rng.nextF32() - 0.5, rng.nextF32() - 0.5, rng.nextF32() - 0.5, rng.nextF32() - 0.5];
              const l = Math.hypot(...v) || 1;
              return v.map((c) => c / l) as Q;
            })();
  const sk = pick(4);
  // Mirrors (a negative component) and a zero component included.
  const scale: V3 =
    sk === 0
      ? [1, 1, 1]
      : sk === 1
        ? [[-1, 0.5, 2][pick(3)], [1, -2, 0.25][pick(3)], [-1, 1, 4][pick(3)]]
        : sk === 2
          ? [spread(rng, 10) || 1, spread(rng, 10) || 1, spread(rng, 10) || 1]
          : [0, -3, 1];
  const lo: V3 = [spread(rng, 100), spread(rng, 100), spread(rng, 100)];
  const hi = lo.map((l) => Math.fround(l + Math.abs(spread(rng, 50)))) as V3;
  return { P, rot, scale, lo, hi };
}

/** Rounded to the f32 the columns hold. */
function stored(c: Cell): Cell {
  const r = (v: number[]) => v.map(Math.fround);
  return { P: r(c.P) as V3, rot: r(c.rot) as Q, scale: r(c.scale) as V3, lo: r(c.lo) as V3, hi: r(c.hi) as V3 };
}

// ---------------------------------------------------------------------------

describe("pivotBox: hand-derived", () => {
  it("at the identity, P moves to the box's centre and the box runs about it", async () => {
    const geo = cloud([{ P: [0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [2, 0, -1], hi: [6, 4, 1] }]);
    const [c] = readCells(await pivot(geo));
    expect(c.P).toEqual([4, 2, 0]);
    expect(c.lo).toEqual([-2, -2, -1]);
    expect(c.hi).toEqual([2, 2, 1]);
  });

  it("[0.5, 0, 0.5] puts P at the middle of the floor; [0, 0, 0] at the min corner; 1 at the max face", async () => {
    const base: Cell = { P: [10, 0, -4], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [2, 1, -1], hi: [6, 4, 1] };
    const [a] = readCells(await pivot(cloud([base]), { pivot: [0.5, 0, 0.5] }));
    expect(a.P).toEqual([14, 1, -4]);
    expect(a.lo).toEqual([-2, 0, -1]);
    expect(a.hi).toEqual([2, 3, 1]);
    const [b] = readCells(await pivot(cloud([base]), { pivot: [0, 0, 0] }));
    expect(b.P).toEqual([12, 1, -5]);
    expect(b.lo).toEqual([0, 0, 0]);
    expect(b.hi).toEqual([4, 3, 2]);
    const [c] = readCells(await pivot(cloud([base]), { pivot: [1, 1, 1] }));
    expect(c.P).toEqual([16, 4, -3]);
    expect(c.lo).toEqual([-4, -3, -2]);
    expect(c.hi).toEqual([0, 0, 0]);
  });

  it("a quarter turn about y with scale 2: P moves to P + R(S c), rot and scale kept", async () => {
    // R (+90 about y) maps x -> -z and z -> x. c = (4, 2, 0), S c = (8, 4, 0),
    // R S c = (0, 4, -8).
    const q: Q = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    const geo = cloud([{ P: [10, 0, 0], rot: q, scale: [2, 2, 2], lo: [2, 0, -1], hi: [6, 4, 1] }]);
    const [c] = readCells(await pivot(geo));
    // EXACT, though the quaternion holds SQRT1_2 rounded to f32: the
    // rotation's matrix is snapped to the signed permutation it is.
    expect(c.P).toEqual([10, 4, -8]);
    expect(c.lo).toEqual([-2, -2, -1]);
    expect(c.hi).toEqual([2, 2, 1]);
    expect(c.rot).toEqual(q.map(Math.fround));
    expect(c.scale).toEqual([2, 2, 2]);
  });

  it("a mirrored scale moves P to the MIRRORED point, so the world box is kept", async () => {
    // scale x = -1: c.x = 4 lands at P.x - 4.
    const geo = cloud([{ P: [0, 0, 0], rot: [0, 0, 0, 1], scale: [-1, 1, 1], lo: [2, 0, -1], hi: [6, 4, 1] }]);
    const [c] = readCells(await pivot(geo));
    expect(c.P).toEqual([-4, 2, 0]);
    expect(c.lo).toEqual([-2, -2, -1]);
    expect(c.scale).toEqual([-1, 1, 1]);
  });

  it("a -0 is written +0 (P and corners)", async () => {
    // c.x = 0 (box -1..1 at P.x = -0): P.x = -0 + 0 and the corners -1, 1.
    const geo = cloud([{ P: [-0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [-1, -0, 0], hi: [1, 0, 0] }]);
    const out = await pivot(geo);
    for (const name of ["P", "boundsMin", "boundsMax"]) for (const v of col(out, name)) expect(Object.is(v, -0)).toBe(false);
  });
});

describe("pivotBox: the world box is kept (oracle)", () => {
  it.each([
    ["random fractions in -0.5..1.5", false],
    ["the centre", true],
  ] as const)("rotated, mirrored, non-unit and zero-scale cells keep every world corner to the stated rounding (pivot: %s)", async (_, centre) => {
    const rng = new Pcg32(0x9b0c5, 3);
    const list = Array.from({ length: 4000 }, () => stored(randomCell(rng)));
    const pivots = list.map(() =>
      centre ? [0.5, 0.5, 0.5] : [rng.nextF32() * 2 - 0.5, rng.nextF32() * 2 - 0.5, rng.nextF32() * 2 - 0.5].map(Math.fround),
    );
    let worstUlps = 0;
    const geo = cloud(list);
    geo.attrs.point.add("pv", "f32", 3, 0);
    pivots.forEach((p, i) => geo.attrs.point.require("pv").setTuple(i, p));
    const out = readCells(await pivot(geo, { pivot: f('attribute("pv", 3)') }));
    let worst = 0;
    let exactBoxes = 0;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const b = out[i];
      // rot and scale are KEPT, bit for bit.
      expect(b.rot).toEqual(a.rot);
      expect(b.scale).toEqual(a.scale);
      // The box about P' is the stored box shifted by one f32 c per axis.
      const R = matrix(a.rot);
      let shiftExact = true;
      for (let k = 0; k < 3; k++) {
        const c = Math.fround((1 - pivots[i][k]) * a.lo[k] + pivots[i][k] * a.hi[k]);
        expect(b.lo[k]).toBe(Math.fround(a.lo[k] - c) + 0);
        expect(b.hi[k]).toBe(Math.fround(a.hi[k] - c) + 0);
        if (b.lo[k] !== a.lo[k] - c || b.hi[k] !== a.hi[k] - c) shiftExact = false;
      }
      if (shiftExact) exactBoxes++;
      // Every world corner within: P' rounding (half an f32 ulp at P') plus
      // the corners' own rounding carried through |R S|, plus f64 noise.
      const wa = world(a);
      const wb = world(b);
      for (let k = 0; k < 8; k++) {
        for (let r = 0; r < 3; r++) {
          let lim = 0.5 * ulp(b.P[r]);
          let mag = Math.abs(a.P[r]) + Math.abs(b.P[r]);
          for (let j = 0; j < 3; j++) {
            const m = Math.abs(R[r][j] * a.scale[j]);
            lim += m * 0.5 * Math.max(ulp(b.lo[j]), ulp(b.hi[j])) * (shiftExact ? 0 : 1);
            // f64 noise scales with the vector's length, not with this row's
            // entry of R: a quarter turn's ~0 entries still carry 1e-16 of it.
            mag += Math.abs(a.scale[j]) * (Math.abs(a.lo[j]) + Math.abs(a.hi[j]) + Math.abs(b.lo[j]) + Math.abs(b.hi[j]));
          }
          lim += 1e-15 * mag;
          const err = Math.abs(wb[k][r] - wa[k][r]);
          expect(err).toBeLessThanOrEqual(lim);
          worst = Math.max(worst, err / (lim || 1));
          // In f32 ulps of the cell's largest world coordinate.
          const big = Math.max(...wa.map((w) => Math.abs(w[r])), ...wa.map((w) => Math.abs(w[(r + 1) % 3])), ...wa.map((w) => Math.abs(w[(r + 2) % 3])));
          worstUlps = Math.max(worstUlps, err / ulp(big));
        }
      }
    }
    // The measurement this suite states: c held as f32 makes the shift
    // exact on most cells (Sterbenz), so the world box moves by P's rounding.
    // The measurement (seeded, so stable). The shift lo - c is exact on
    // 1143 of 4000 cells with random fractions and 1600 at the centre (these
    // boxes are spread over 12 binades, so c is often far from a corner;
    // grammar cells, whose corners sit within a factor of two of c or on 0,
    // shift exactly). Every corner is within the limit — the worst ratio is
    // just under 1, so the half ulp of P' is reached — and within 1.70 f32
    // ulps of the cell's largest world coordinate (0.73 at the centre).
    expect(worst).toBeLessThanOrEqual(1);
    expect(worstUlps).toBeLessThanOrEqual(2);
    expect(exactBoxes).toBe(centre ? 1600 : 1143);
  });

  it("dyadic boxes at dyadic P under quarter and half turns (f32 quaternions) and dyadic scales keep the world box EXACTLY", async () => {
    // Each turn with its matrix written out by hand (rows), so the oracle
    // here is exact and owes nothing to a quaternion formula.
    const h = Math.fround(Math.SQRT1_2);
    const turns: [Q, number[][]][] = [
      [[0, 0, 0, 1], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
      [[0, 0, 0, -1], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
      [[0, 1, 0, 0], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]]],
      [[0, h, 0, h], [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]], // +90 about y: x -> -z
      [[0, -h, 0, h], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]],
      [[h, 0, 0, h], [[1, 0, 0], [0, 0, -1], [0, 1, 0]]], // +90 about x: y -> z
      [[0, 0, h, h], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], // +90 about z: x -> y
      [[0, 0, 2 * h, 2 * h], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], // not unit: normalized
    ];
    const exact = (c: Cell, R: number[][]): V3[] => {
      const out: V3[] = [];
      for (let k = 0; k < 8; k++) {
        const x = [0, 1, 2].map((a) => ((k >> a) & 1 ? c.hi[a] : c.lo[a]) * c.scale[a]);
        out.push([0, 1, 2].map((r) => c.P[r] + R[r][0] * x[0] + R[r][1] * x[1] + R[r][2] * x[2]) as V3);
      }
      return out;
    };
    const rng = new Pcg32(0xd1a, 1);
    const dy = (r: number) => Math.round((rng.nextF32() * 2 - 1) * r * 8) / 8;
    const list: Cell[] = Array.from({ length: 800 }, (_, i) => {
      const lo: V3 = [dy(40), dy(40), dy(40)];
      return {
        P: [dy(500), dy(500), dy(500)],
        rot: turns[i % turns.length][0],
        scale: [[1, 2, -0.5][i % 3], [0.25, 1, -1][(i >> 1) % 3], [4, -2, 1][(i >> 2) % 3]],
        lo,
        hi: lo.map((l) => l + Math.abs(dy(20))) as V3,
      };
    });
    const out = readCells(await pivot(cloud(list), { pivot: [0.5, 0, 0.25] }));
    list.forEach((a, i) => {
      const R = turns[i % turns.length][1];
      expect(exact(out[i], R)).toEqual(exact(a, R));
    });
    // CONTROL: the hand matrix is the rotation the node applies (a wrong
    // one, x -> +z for the +90 about y, reports a difference).
    const wrong = [[0, 0, -1], [0, 1, 0], [1, 0, 0]];
    expect(exact(out[3], wrong)).not.toEqual(exact(list[3], wrong));
  });

  it("CONTROL: the oracle reports a moved world box as different", async () => {
    const a: Cell = { P: [3, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [2, 0, -1], hi: [6, 4, 1] };
    const [b] = readCells(await pivot(cloud([a])));
    expect(world(b)).toEqual(world(a));
    const moved = { ...b, P: [Math.fround(b.P[0] + ulp(b.P[0])), b.P[1], b.P[2]] as V3 };
    expect(world(moved)).not.toEqual(world(a));
    // And the bound would catch a corner a whole ulp of P' off.
    const err = Math.abs(world(moved)[0][0] - world(a)[0][0]);
    expect(err).toBeGreaterThan(0.5 * ulp(b.P[0]));
  });
});

describe("pivotBox: what is carried", () => {
  it("same points, order, seeds, strings, topology and detail; only P and the box are written", async () => {
    const geo = createPolyline([0, 0, 0, 1, 0, 0, 2, 0, 0]);
    const pts = geo.attrs.point;
    pts.add("boundsMin", "f32", 3, [0, 0, 0]);
    pts.add("boundsMax", "f32", 3, [1, 1, 1]);
    pts.add("name", "string", 1, "").setString(1, "door");
    geo.attrs.detail.resize(1);
    geo.attrs.detail.add("lot", "i32", 1, 7);
    const out = await pivot(geo);
    expect(out.attrs.point.names()).toEqual(geo.attrs.point.names());
    expect(out.attrs.point.require("name").getString(1)).toBe("door");
    expect(Array.from(out.vertexToPoint)).toEqual(Array.from(geo.vertexToPoint));
    expect(out.attrs.detail.require("lot").data[0]).toBe(7);
    expect(col(out, "P")).toEqual([0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 2.5, 0.5, 0.5]);
    for (const name of pts.names()) {
      if (name === "P" || name === "boundsMin" || name === "boundsMax") continue;
      expect(col(out, name)).toEqual(col(geo, name));
    }
    // The input is not touched.
    expect(col(geo, "P")).toEqual([0, 0, 0, 1, 0, 0, 2, 0, 0]);
  });

  it("a missing rot or scale column reads as the identity and is not created", async () => {
    const geo = cloud([{ P: [1, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [0, 0, 0], hi: [2, 2, 2] }]);
    geo.attrs.point.remove("rot");
    geo.attrs.point.remove("scale");
    const out = await pivot(geo);
    expect(col(out, "P")).toEqual([2, 1, 1]);
    expect(out.attrs.point.get("rot")).toBeUndefined();
    expect(out.attrs.point.get("scale")).toBeUndefined();
  });

  it("where 0 passes a cell through exactly, an inside-out one included", async () => {
    const geo = cloud([
      { P: [1, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [0, 0, 0], hi: [2, 2, 2] },
      { P: [5, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [3, 0, 0], hi: [1, 2, 2] },
    ]);
    const out = readCells(await pivot(geo, { where: f("eq(attribute(\"cell\"), 0)") }));
    expect(out[0].P).toEqual([2, 1, 1]);
    expect(out[1]).toEqual(readCells(geo)[1]);
  });

  it("a field pivot reads the INPUT box through box names; a scalar broadcasts", async () => {
    const geo = cloud([{ P: [0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [0, 0, 0], hi: [4, 8, 2] }]);
    // fraction = 1 / size.x on every axis: 0.25 here.
    const [a] = readCells(await pivot(geo, { pivot: f('div(1, box("sx"))') }));
    expect(a.P).toEqual([1, 2, 0.5]);
    const [b] = readCells(await pivot(geo, { pivot: [0.25, 0.25, 0.25] }));
    expect(b).toEqual(a);
  });
});

describe("pivotBox: refusals", () => {
  const one = (c: Partial<Cell> = {}) =>
    cloud([{ P: [0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1], lo: [0, 0, 0], hi: [1, 1, 1], ...c }]);

  it("an inside-out or non-finite box, naming the cell", async () => {
    expect(await rejection(pivot(one({ lo: [2, 0, 0] })))).toMatch(/cell 0's box ARRIVED inside out along x/);
    expect(await rejection(pivot(one({ hi: [Infinity, 1, 1] })))).toMatch(/cell 0's box is not finite along x/);
  });

  it("a non-finite P, rot or scale, naming the cell", async () => {
    expect(await rejection(pivot(one({ P: [NaN, 0, 0] })))).toMatch(/cell 0 has a non-finite P/);
    expect(await rejection(pivot(one({ rot: [Infinity, 0, 0, 1] })))).toMatch(/cell 0 has a non-finite "rot"/);
    expect(await rejection(pivot(one({ scale: [1, NaN, 1] })))).toMatch(/cell 0 has a non-finite P .* or scale/);
  });

  it("a pivot that is not finite, or that f32 cannot hold, by name", async () => {
    expect(await rejection(pivot(one(), { pivot: [0.5, Infinity, 0.5] }))).toMatch(/pivot/);
    expect(await rejection(pivot(one(), { pivot: [1e39, 0.5, 0.5] }))).toMatch(/param "pivot" component 0 \(x\) is 1e\+39/);
  });

  it("a new P past f32's range, naming the cell", async () => {
    expect(await rejection(pivot(one({ P: [3e38, 0, 0], hi: [1e38, 1, 1] }), { pivot: [1, 0, 0] }))).toMatch(/cell 0's new P is past what f32 holds/);
  });

  it("a mistyped rot column, by name", async () => {
    const geo = one();
    geo.attrs.point.remove("rot");
    geo.attrs.point.add("rot", "f32", 3, 0);
    expect(await rejection(pivot(geo))).toMatch(/"rot" on pin "in" is f32 tupleSize 3/);
  });
});

describe("pivotBox: graphs", () => {
  function build(order: "forward" | "reverse"): Graph {
    const g = new Graph(5);
    const add = {
      grid: () => g.add(pointGrid, { countX: 3, countY: 1, countZ: 3, spacing: [5, 1, 5] }, "grid"),
      box: () => g.add(setBounds, { boundsMin: [0, 0, 0], boundsMax: [2, 3, 1] }, "box"),
      pivot: () => g.add(pivotBox, { pivot: fieldFromJson(parseFieldText('vec(0.5, randomField("f"), 0.5)')) }, "pivot"),
    };
    const ids = order === "forward" ? ["grid", "box", "pivot"] : ["pivot", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.pivot, "in");
    g.output(h.pivot, "out", "cells");
    return g;
  }

  it("round-trips through JSON and cooks the same bytes in any insertion order", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.cells);
    const b = firstGeo((await cook(build("reverse"))).outputs.cells);
    const c = firstGeo((await cook(back)).outputs.cells);
    expect(a.pointCount).toBe(9);
    for (const name of a.attrs.point.names()) {
      expect(col(b, name)).toEqual(col(a, name));
      expect(col(c, name)).toEqual(col(a, name));
    }
    // x and z: centred, about the box's own centre.
    expect(col(a, "boundsMin")[0]).toBe(-1);
    expect(col(a, "boundsMax")[2]).toBe(0.5);
  });
});
