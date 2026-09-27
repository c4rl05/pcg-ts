/**
 * The Eiffel demo's lift machinery, moved the page's way.
 *
 * `demos/eiffel/lifts.ts` builds the machinery that moves with a car — the
 * Roux chains and wheels, the Otis carriage and counterweight truck, the
 * Edoux counterweight car, pistons, pulleys and cables — and publishes how
 * each moves (`LIFT_CHAINS`, `LIFT_FOLLOWERS`); the page (`main.ts`) moves
 * them from the same clock as the cars. This file holds that contract
 * against what the graph COOKS:
 *
 * - every Roux link sits on its circuit, a pitch apart, and the circuit
 *   moves with the car: the cabin's joint stays under the car at every
 *   moment of the round, and the loop closes on the book's pieces;
 * - the Otis counterweight truck moves against its car at the tackle's
 *   ratio, on its own track;
 * - the Edoux cars move in opposition, the sum of their heights constant,
 *   and the cables and pistons keep hold of them;
 * - slid their whole runs, none of it enters the tower's members, read
 *   back from the cooked legs, shaft and floors (a census of their
 *   surfaces, not a table restated);
 * - the same seed cooks the same machinery.
 *
 * Every comparison that should read zero is first shown to read non-zero
 * on a deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { quadrants } from "../demos/eiffel/lattice.js";
import {
  type CarRun,
  type Follower,
  LIFT_CARS,
  LIFT_CHAINS,
  LIFT_FOLLOWERS,
  buildLifts,
  carPose,
  chainShift,
  placeChain,
} from "../demos/eiffel/lifts.js";
import { buildFirstFloor } from "../demos/eiffel/firstFloor.js";
import { buildLegs } from "../demos/eiffel/legs.js";
import { buildPlatforms } from "../demos/eiffel/platforms.js";
import { buildShaft } from "../demos/eiffel/shaft.js";
import { buildSummit } from "../demos/eiffel/summit.js";
import { FLOORS } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);

// ------------------------------------------------------------------ //
// The page's clock, restated (main.ts `carPhase`, `moveCars`).
// ------------------------------------------------------------------ //

const ease = (x: number): number => x * x * (3 - 2 * x);

/** Where a run's car stands at `t` seconds, as an arc length: main.ts `carPhase`, restated. */
function runArc(run: CarRun, t: number): number {
  const cycle = 2 * (run.trip + run.dwell);
  const rise = run.trip / cycle;
  const wait = run.dwell / cycle;
  let p = (((t / cycle + run.phase) % 1) + 1) % 1;
  let u: number;
  if (p < rise) u = ease(p / rise);
  else {
    p -= rise;
    if (p < wait) u = 1;
    else {
      p -= wait;
      u = p < rise ? ease(1 - p / rise) : 0;
    }
  }
  return run.from + (run.to - run.from) * u;
}

/** Sample times: every 1.7 s over the longest cycle, so every phase of every round is visited. */
const TIMES = Array.from({ length: 200 }, (_, i) => i * 1.7);

const runOf = (name: string): CarRun => {
  const r = LIFT_CARS.find((c) => c.name === name);
  if (r === undefined) throw new Error(`no run ${name}`);
  return r;
};
const followerOf = (name: string): Follower => {
  const f = LIFT_FOLLOWERS.find((x) => x.name === name);
  if (f === undefined) throw new Error(`no follower ${name}`);
  return f;
};

/** A follower's travel at `t`: its lead's arc less the lead's `at`, or its chain's shift. */
function travelOf(f: Follower, t: number): number {
  const lead = runOf(f.lead);
  const s = runArc(lead, t);
  if (f.chain === undefined) return s - lead.at;
  const chain = LIFT_CHAINS.find((c) => c.name === f.chain);
  if (chain === undefined) throw new Error(`no chain ${f.chain}`);
  return chainShift(chain, s);
}

/** Move a built point the follower's way at travel τ (main.ts `moveCars`, restated). */
function follow(f: Follower, tau: number, p: Vec3): Vec3 {
  if (f.slide !== undefined) return add3(p, mul3(f.slide, tau));
  if (f.spin !== undefined) {
    const { centre, axis, rate } = f.spin;
    const a = rate * tau;
    const v = sub3(p, centre);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x: Vec3 = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
    return add3(centre, add3(add3(mul3(v, c), mul3(x, s)), mul3(axis, dot3(axis, v) * (1 - c))));
  }
  if (f.stretch !== undefined) {
    const { anchor, along, length, rate } = f.stretch;
    const k = (length + rate * tau) / length;
    const d = dot3(sub3(p, anchor), along);
    return add3(p, mul3(along, d * (k - 1)));
  }
  throw new Error(`${f.name} moves no way`);
}

// ------------------------------------------------------------------ //
// Cooked geometry, read back.
// ------------------------------------------------------------------ //

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const out: Vec3[] = [];
  for (let i = 0; i < geo.pointCount; i++) {
    out.push([P.data[3 * i] as number, P.data[3 * i + 1] as number, P.data[3 * i + 2] as number]);
  }
  return out;
}

/** An oriented box read back from a `blocks` mesh: centre, unit axes and half sizes. */
interface Obb {
  readonly c: Vec3;
  readonly axes: readonly [Vec3, Vec3, Vec3];
  readonly half: readonly [number, number, number];
}

/** A `blocks` mesh's boxes: 24 points each, faces of 4 in the order +x, -x, +y, -y, +z, -z. */
function obbs(geo: Geometry): Obb[] {
  const P = points(geo);
  if (P.length % 24 !== 0) throw new Error(`${P.length} points is not a whole number of boxes`);
  const out: Obb[] = [];
  for (let b = 0; b < P.length; b += 24) {
    const face = (f: number): Vec3 => {
      let c: Vec3 = [0, 0, 0];
      for (let v = 0; v < 4; v++) c = add3(c, P[b + 4 * f + v] as Vec3);
      return mul3(c, 0.25);
    };
    const c = mul3(add3(face(0), face(1)), 0.5);
    const ax = [sub3(face(0), c), sub3(face(2), c), sub3(face(4), c)];
    const half = ax.map(len3) as [number, number, number];
    out.push({ c, axes: ax.map((a, i) => mul3(a, 1 / (half[i] as number))) as [Vec3, Vec3, Vec3], half });
  }
  return out;
}

/** How far inside `box` the point is (positive inside, by the least margin to a face). */
function depthIn(box: Obb, p: Vec3): number {
  const d = sub3(p, box.c);
  let m = Infinity;
  for (let i = 0; i < 3; i++) m = Math.min(m, (box.half[i] as number) - Math.abs(dot3(d, box.axes[i] as Vec3)));
  return m;
}

/** A region: every point within `r` of the segment ab. */
interface Region {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly r: number;
}

/** Is p within the region? */
function within(g: Region, x: number, y: number, z: number): boolean {
  const ab = sub3(g.b, g.a);
  const ap: Vec3 = [x - g.a[0], y - g.a[1], z - g.a[2]];
  const u = Math.min(1, Math.max(0, dot3(ap, ab) / dot3(ab, ab)));
  const d = sub3(ap, mul3(ab, u));
  return dot3(d, d) <= g.r * g.r;
}

/**
 * A census of surfaces: points over every polygon of `geos` that touches
 * one of `regions`, about `step` apart (corners, edges and a fan over the
 * face), kept flat in a uniform grid of `cell` so the tower's millions fit.
 * Returns the lookup "every point in [lo, hi]" and the count.
 */
function census(
  geos: readonly Geometry[],
  regions: readonly Region[],
  step: number,
  cell = 1,
): { near: (lo: Vec3, hi: Vec3, visit: (x: number, y: number, z: number) => void) => void; count: number } {
  const map = new Map<number, number[]>();
  const key = (i: number, j: number, k: number) => (i + 512) * 1e6 + (j + 512) * 1e3 + (k + 512);
  let count = 0;
  /** The regions the polygon in hand can reach. */
  let near_: Region[] = [];
  const put = (x: number, y: number, z: number) => {
    if (!near_.some((g) => within(g, x, y, z))) return;
    const k = key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell));
    let l = map.get(k);
    if (l === undefined) map.set(k, (l = []));
    l.push(x, y, z);
    count++;
  };
  /**
   * A triangle's points, `step` apart in rows along its edge op: about its
   * area over step², however thin it is, and its three edges.
   */
  const triangle = (o: Vec3, p: Vec3, q: Vec3) => {
    const a = sub3(p, o);
    const b = sub3(q, o);
    const la = len3(a);
    if (la < 1e-9) return;
    const e1 = mul3(a, 1 / la);
    const bu = dot3(b, e1);
    const perp = sub3(b, mul3(e1, bu));
    const bv = len3(perp);
    const e2 = bv < 1e-9 ? e1 : mul3(perp, 1 / bv);
    const rows = Math.max(1, Math.ceil(bv / step));
    for (let r = 0; r <= rows; r++) {
      const v = (bv * r) / rows;
      const u0 = (bu * r) / rows;
      const u1 = la + ((bu - la) * r) / rows;
      const cols = Math.max(1, Math.ceil(Math.abs(u1 - u0) / step));
      for (let c = 0; c <= cols; c++) {
        const u = u0 + ((u1 - u0) * c) / cols;
        put(o[0] + e1[0] * u + e2[0] * v, o[1] + e1[1] * u + e2[1] * v, o[2] + e1[2] * u + e2[2] * v);
      }
    }
    // The edge oq, which the rows only reach at their ends.
    const lb = len3(b);
    const nb = Math.max(1, Math.ceil(lb / step));
    for (let i = 1; i < nb; i++) put(o[0] + (b[0] * i) / nb, o[1] + (b[1] * i) / nb, o[2] + (b[2] * i) / nb);
  };
  for (const geo of geos) {
    const P = geo.attrs.point.get("P")?.data;
    if (P === undefined) continue;
    const at = (v: number): Vec3 => {
      const j = geo.vertexToPoint[v] as number;
      return [P[3 * j] as number, P[3 * j + 1] as number, P[3 * j + 2] as number];
    };
    for (let p = 0; p < geo.primVertexStart.length; p++) {
      const s = geo.primVertexStart[p] as number;
      const n = geo.primVertexCount[p] as number;
      const poly: Vec3[] = [];
      for (let k = 0; k < n; k++) poly.push(at(s + k));
      const lo = [0, 1, 2].map((i) => Math.min(...poly.map((q) => q[i] as number)));
      const hi = [0, 1, 2].map((i) => Math.max(...poly.map((q) => q[i] as number)));
      near_ = regions.filter((g) =>
        [0, 1, 2].every(
          (i) => (lo[i] as number) <= Math.max(g.a[i], g.b[i]) + g.r && (hi[i] as number) >= Math.min(g.a[i], g.b[i]) - g.r,
        ),
      );
      if (near_.length === 0) continue;
      const o = poly[0] as Vec3;
      for (let k = 1; k + 1 < n; k++) triangle(o, poly[k] as Vec3, poly[k + 1] as Vec3);
    }
  }
  const near = (lo: Vec3, hi: Vec3, visit: (x: number, y: number, z: number) => void) => {
    for (let i = Math.floor(lo[0] / cell); i <= Math.floor(hi[0] / cell); i++) {
      for (let j = Math.floor(lo[1] / cell); j <= Math.floor(hi[1] / cell); j++) {
        for (let k = Math.floor(lo[2] / cell); k <= Math.floor(hi[2] / cell); k++) {
          const l = map.get(key(i, j, k));
          if (l === undefined) continue;
          for (let q = 0; q < l.length; q += 3) visit(l[q] as number, l[q + 1] as number, l[q + 2] as number);
        }
      }
    }
  };
  return { near, count };
}

type Near = ReturnType<typeof census>["near"];

/** The deepest any census point reaches inside any of `boxes` (each moved by `move` first), with where. */
function deepest(
  boxes: readonly Obb[],
  move: (p: Vec3) => Vec3,
  near: Near,
  skip: (x: number, y: number, z: number) => boolean = () => false,
): { depth: number; at: Vec3 | undefined } {
  let depth = -Infinity;
  let at: Vec3 | undefined;
  for (const b0 of boxes) {
    // The box moved: its centre, and each axis moved and measured, so a
    // stretch scales the half size along it.
    const c = move(b0.c);
    const moved = b0.axes.map((a) => sub3(move(add3(b0.c, a)), c));
    const scale = moved.map(len3);
    const axes = moved.map((a, i) => mul3(a, 1 / (scale[i] as number))) as unknown as [Vec3, Vec3, Vec3];
    const half = b0.half.map((h, i) => h * (scale[i] as number)) as unknown as [number, number, number];
    const b: Obb = { c, axes, half };
    const r = Math.hypot(...b.half);
    near(sub3(c, [r, r, r]), add3(c, [r, r, r]), (x, y, z) => {
      if (skip(x, y, z)) return;
      const d = depthIn(b, [x, y, z]);
      if (d > depth) {
        depth = d;
        at = [x, y, z];
      }
    });
  }
  return { depth, at };
}

// ------------------------------------------------------------------ //
// The cook.
// ------------------------------------------------------------------ //

let outputs: Record<string, unknown[]>;
const geo = (key: string): Geometry => {
  const got = firstGeometry((outputs[key] ?? []) as never);
  if (got === undefined) throw new Error(`${key} produced no geometry`);
  return got;
};
/** The tower's own members and floors, as a census of their surfaces where the machinery moves. */
let tower: Near;
let towerCount = 0;
/** The machinery that stands still, as a census of its own surfaces. */
let gear: Near;

/**
 * Where the machinery moves: the shaft from the 2nd floor to the girder
 * over the 3rd (the Edoux), and round every leg car's run and circuit.
 */
function regions(): Region[] {
  const out: Region[] = [{ a: [0, 110, 0], b: [0, 290, 0], r: 8.5 }];
  // Round every still box of machinery as cooked, and every box that moves
  // along the whole way it moves (a slide's; a spin stays about its centre).
  for (const id of ["liftRouxGear", "liftOtisGear", "liftEdouxGear"]) {
    for (const b of obbs(geo(`machinery.${id}`))) out.push({ a: b.c, b: b.c, r: Math.hypot(...b.half) + 0.5 });
  }
  for (const f of LIFT_FOLLOWERS) {
    if (f.name === "edoux.pistons") continue;
    const run = runOf(f.lead);
    for (const b of obbs(geo(`car.${f.name}`))) {
      const r = Math.hypot(...b.half) + 0.5;
      if (f.slide === undefined) out.push({ a: b.c, b: b.c, r });
      else out.push({ a: follow(f, run.from - run.at, b.c), b: follow(f, run.to - run.at, b.c), r });
    }
  }
  const along = (path: readonly Vec3[], r: number) => {
    for (let i = 0; i + 1 < path.length; i++) out.push({ a: path[i] as Vec3, b: path[i + 1] as Vec3, r });
  };
  for (const run of LIFT_CARS) if (!run.name.startsWith("edoux")) along(run.path, 6.5);
  for (const c of LIFT_CHAINS) along(c.loop.path, 3);
  return out;
}

beforeAll(async () => {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  const lifts = buildLifts(g, quads);
  for (const { name, mesh } of lifts.cars ?? []) g.output(mesh, "out", `car.${name}`);
  for (const { name, spawn } of lifts.chains ?? []) g.output(spawn, "instances", `chain.${name}`);
  for (const m of lifts.machinery ?? []) g.output(m, "out", `machinery.${m.id}`);
  // The tower's own members and floors, and the lifts' tracks, posts and
  // stairs: everything the machinery must keep out of.
  const others = [buildLegs(g, quads), buildShaft(g), buildFirstFloor(g, quads), buildPlatforms(g, quads), buildSummit(g)];
  let n = 0;
  for (const parts of [...others, { girders: lifts.girders, platforms: lifts.platforms }]) {
    for (const [cls, list] of Object.entries(parts)) {
      if (!Array.isArray(list) || cls === "rivets" || cls === "cars" || cls === "chains" || cls === "fittings") continue;
      for (const node of list as NodeHandle[]) g.output(node, "out", `tower.${n++}`);
    }
  }
  outputs = (await cook(g)).outputs as unknown as Record<string, unknown[]>;
  const geos: Geometry[] = [];
  for (let i = 0; i < n; i++) {
    const got = firstGeometry((outputs[`tower.${i}`] ?? []) as never);
    if (got !== undefined) geos.push(got);
  }
  const c = census(geos, regions(), 0.1);
  towerCount = c.count;
  tower = c.near;
  const still = (lifts.machinery ?? []).map((m) => firstGeometry((outputs[`machinery.${m.id}`] ?? []) as never));
  gear = census(still.filter((x): x is Geometry => x !== undefined), regions(), 0.05).near;
}, 600_000);

// ------------------------------------------------------------------ //
// The Edoux.
// ------------------------------------------------------------------ //

describe("eiffel lift machinery: the Edoux pair", () => {
  /** A car's floor height as cooked: its first box, the floor frame, its top face. */
  const floorOf = (name: string): number => {
    const b = obbs(geo(`car.${name}`))[0] as Obb;
    return b.c[1] + (b.half[1] as number);
  };

  it("moves the two cars in opposition: the sum of their floors is twice the landing's at every moment", () => {
    const nord = runOf("edoux.nord");
    const sud = followerOf("edoux.sud");
    const a0 = floorOf("edoux.nord");
    const b0 = floorOf("edoux.sud");
    // As built, each 40.1 from the landing (lifts.ts EDOUX.travel).
    expect(a0 + b0).toBeCloseTo(2 * FLOORS.landing, 3);
    const worst = (slide: Vec3) => {
      let err = 0;
      let lo = Infinity;
      let hi = -Infinity;
      for (const t of TIMES) {
        const tau = runArc(nord, t) - nord.at;
        const a = a0 + tau;
        const b = follow({ ...sud, slide }, tau, [0, b0, 0])[1];
        err = Math.max(err, Math.abs(a + b - 2 * FLOORS.landing));
        lo = Math.min(lo, a, b);
        hi = Math.max(hi, a, b);
      }
      return { err, lo, hi };
    };
    // Control: a counterweight that ran 1% short would show.
    expect(worst([0, -0.99, 0]).err).toBeGreaterThan(0.3);
    const { err, lo, hi } = worst(sud.slide as Vec3);
    expect(err).toBeLessThan(1e-3);
    // Each car rides its own half, the lower one down to the 2nd floor,
    // the upper up to the 3rd: « 80,20 » each.
    expect(lo).toBeCloseTo(FLOORS.second, 1);
    expect(hi).toBeCloseTo(FLOORS.third, 1);
    // And they meet at the landing, where the passengers changed cars.
    const meets = TIMES.some((t) => Math.abs(runArc(nord, t) - nord.from) < 1e-9);
    expect(meets).toBe(true);
  });

  it("holds each car by its cables at every moment: every drop ends on its car, and the cable's length is constant", () => {
    const nord = runOf("edoux.nord");
    const drops = LIFT_FOLLOWERS.filter((f) => f.name.startsWith("edoux.cable."));
    expect(drops).toHaveLength(8);
    const a0 = floorOf("edoux.nord");
    const b0 = floorOf("edoux.sud");
    const lowest = (f: Follower, tau: number): number => {
      const pts = points(geo(`car.${f.name}`)).map((p) => follow(f, tau, p));
      return Math.min(...pts.map((p) => p[1]));
    };
    for (const letter of ["a", "b", "c", "d"]) {
      const n = followerOf(`edoux.cable.${letter}.nord`);
      const s = followerOf(`edoux.cable.${letter}.sud`);
      // The drop's foot stands on its car as built: its offset from the
      // floor is the attachment's, and it keeps that offset as the car
      // moves.
      const offA = lowest(n, 0) - a0;
      const offB = lowest(s, 0) - b0;
      let err = 0;
      let control = 0;
      let length = -Infinity;
      let lengthLo = Infinity;
      for (const t of TIMES) {
        const tau = runArc(nord, t) - nord.at;
        err = Math.max(err, Math.abs(lowest(n, tau) - (a0 + tau) - offA), Math.abs(lowest(s, tau) - (b0 - tau) - offB));
        // Control: a drop that stretched at the wrong rate would part from its car.
        control = Math.max(control, Math.abs(lowest({ ...n, stretch: { ...n.stretch!, rate: -0.98 } }, tau) - (a0 + tau) - offA));
        const total = (n.stretch?.length ?? 0) + (n.stretch?.rate ?? 0) * tau + (s.stretch?.length ?? 0) + (s.stretch?.rate ?? 0) * tau;
        length = Math.max(length, total);
        lengthLo = Math.min(lengthLo, total);
      }
      expect(control, `cable ${letter}: control`).toBeGreaterThan(0.2);
      expect(err, `cable ${letter}`).toBeLessThan(2e-3);
      expect(length - lengthLo, `cable ${letter}: length`).toBeLessThan(1e-9);
    }
  });

  it("carries the pistons with the upper car, their heads 0.58 under its floor", () => {
    const nord = runOf("edoux.nord");
    const f = followerOf("edoux.pistons");
    const a0 = floorOf("edoux.nord");
    const top0 = Math.max(...points(geo("car.edoux.pistons")).map((p) => p[1]));
    expect(a0 - top0).toBeCloseTo(0.58, 2);
    for (const t of TIMES.slice(0, 40)) {
      const tau = runArc(nord, t) - nord.at;
      expect(follow(f, tau, [0, top0, 0])[1] - (a0 + tau)).toBeCloseTo(-0.58, 2);
    }
  });

  it("turns each pulley as fast as its cable runs, in the cable's sense", () => {
    // The cables' centre lines wrap the pulleys at half the distance between
    // a cable's two strands, less the pairs' « 8.128 »: « 9.424 » over the
    // upper pulleys, « 9.304 » over the lower [PL-XXIII quater Fig. 2].
    const wrap = { upper: (9.424 - 8.128) / 2, lower: (9.304 - 8.128) / 2 };
    const nord = runOf("edoux.nord");
    for (const f of LIFT_FOLLOWERS.filter((x) => x.name.startsWith("edoux.pulley."))) {
      const r = f.name.endsWith(".upper") ? wrap.upper : wrap.lower;
      expect((f.spin?.rate as number) * r, f.name).toBeCloseTo(1, 9);
      // Over the top the cable runs from the upper car's side to the lower's
      // (Nord to Sud, +s) as the upper car rises: the rim's top moves +s.
      const centre = f.spin?.centre as Vec3;
      const top = add3(centre, [0, r, 0]);
      const moved = follow(f, 0.01, top);
      const s = (p: Vec3) => (p[0] - p[2]) / Math.SQRT2;
      expect(s(moved) - s(top), f.name).toBeGreaterThan(0.0099);
      // Control: the opposite turn would run it -s.
      expect(s(follow({ ...f, spin: { ...(f.spin as NonNullable<Follower["spin"]>), rate: -(f.spin?.rate as number) } }, 0.01, top)) - s(top)).toBeLessThan(0);
      void nord;
    }
  });
});

// ------------------------------------------------------------------ //
// The Roux chains.
// ------------------------------------------------------------------ //

/** A chain output's instance batches, by asset id: each instance's translation and x column. */
function pieces(name: string): Record<string, Array<{ p: Vec3; x: Vec3; m: Float32Array }>> {
  const item = (outputs[`chain.${name}`] ?? [])[0] as
    | { kind: string; batches: Array<{ assetId: string; count: number; transforms: Float32Array }> }
    | undefined;
  if (item?.kind !== "instances") throw new Error(`chain.${name} cooked no instances`);
  const out: Record<string, Array<{ p: Vec3; x: Vec3; m: Float32Array }>> = {};
  for (const b of item.batches) {
    const list = (out[b.assetId] ??= []);
    for (let i = 0; i < b.count; i++) {
      const m = b.transforms.subarray(16 * i, 16 * i + 16);
      list.push({ p: [m[12] as number, m[13] as number, m[14] as number], x: [m[0] as number, m[1] as number, m[2] as number], m });
    }
  }
  return out;
}

/** Distance from p to a polyline. */
function toLine(p: Vec3, path: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i] as Vec3;
    const ab = sub3(path[i + 1] as Vec3, a);
    const u = Math.min(1, Math.max(0, dot3(sub3(p, a), ab) / dot3(ab, ab)));
    best = Math.min(best, len3(sub3(p, add3(a, mul3(ab, u)))));
  }
  return best;
}

/** The chain's joints, placed for `shift` by the module's own `placeChain`: each axle's point. */
function joints(chain: (typeof LIFT_CHAINS)[number], shift: number): Vec3[] {
  const n = chain.joints.length;
  const axles = new Float64Array(16 * n);
  placeChain(chain, shift, axles, new Float64Array(16 * n), new Float64Array(16 * chain.weights.length));
  return Array.from({ length: n }, (_, j): Vec3 => [axles[16 * j + 12] as number, axles[16 * j + 13] as number, axles[16 * j + 14] as number]);
}

describe("eiffel lift machinery: the Roux chains", () => {
  it("cooks two circuits a lift, each of the book's 177 pieces, every joint on its loop", () => {
    // Piles 4 Ouest and 2 Est, « une de chaque côté » [E1900-TXT p. 155].
    expect(LIFT_CHAINS.map((c) => c.name).sort()).toEqual([
      "roux.est.left",
      "roux.est.right",
      "roux.ouest.left",
      "roux.ouest.right",
    ]);
    for (const c of LIFT_CHAINS) {
      const got = pieces(c.name);
      // 1 special + 81 + 11 counterweights + 81 + 2 tensioners + the cabin's.
      expect(got.chainAxle).toHaveLength(177);
      expect(got.chainBar).toHaveLength(177);
      expect(got.chainWeight).toHaveLength(11);
      const path = c.loop.path;
      const off = Math.max(...(got.chainAxle ?? []).map((a) => toLine(a.p, path)));
      expect(off, `${c.name}: farthest cooked axle from its loop`).toBeLessThan(2e-4);
      // Control: the same axles 5 cm along the axle's own axis are off it.
      const moved = Math.max(...(got.chainAxle ?? []).map((a) => toLine(add3(a.p, mul3(c.across, 0.05)), path)));
      expect(moved).toBeGreaterThan(0.049);
      // And the cooked pieces are the module's own placement, as built.
      const mine = joints(c, 0);
      const worst = Math.max(...(got.chainAxle ?? []).map((a, j) => len3(sub3(a.p, mine[j] as Vec3))));
      expect(worst).toBeLessThan(1e-4);
    }
  });

  it("lays the pieces a metre apart, axle to axle, round the loop: the loop closes on the book's 180.90 m", () => {
    for (const c of LIFT_CHAINS) {
      const a = (pieces(c.name).chainAxle ?? []).map((x) => x.p);
      const L = c.loop.arc[c.loop.arc.length - 1] as number;
      // « 180,90 m en moyenne » [E1900-TXT p. 156, read on the page], the
      // tensioners taking up 1.725-2.225 each round the 176.90 of the rest.
      expect(L).toBeGreaterThan(176.9 + 2 * 1.725);
      expect(L).toBeLessThan(176.9 + 2 * 2.225);
      const chords = a.map((p, i) => len3(sub3(a[(i + 1) % a.length] as Vec3, p)));
      // Every piece is rigid, its axles its length apart as the crow flies,
      // round the wheels too: 174 of a metre (the special piston, 162
      // ordinary, 11 counterweights), the cabin's of 2.90 [E1900-TXT p. 156].
      const metre = chords.filter((d) => Math.abs(d - 1) < 2e-4);
      expect(metre).toHaveLength(174);
      expect(chords.filter((d) => Math.abs(d - 2.9) < 2e-4)).toHaveLength(1);
      // The two tensioners take the rest, inside their screws' 1.725-2.225.
      const t = [chords[174] as number, chords[175] as number];
      for (const d of t) {
        expect(d).toBeGreaterThan(1.725);
        expect(d).toBeLessThan(2.225);
      }
      // Control: one axle 3 cm out of place breaks two pitches.
      const bent = a.map((p, i) => (i === 40 ? add3(p, [0.03, 0, 0]) : p));
      const bentChords = bent.map((p, i) => len3(sub3(bent[(i + 1) % bent.length] as Vec3, p)));
      expect(bentChords.filter((d) => Math.abs(d - 1) < 2e-4)).toHaveLength(172);
      // The counterweights' boxes sit on the bars 82 to 92 down from the cabin.
      const bars = pieces(c.name).chainBar ?? [];
      const boxes = pieces(c.name).chainWeight ?? [];
      boxes.forEach((w, i) => expect(len3(sub3(w.p, (bars[82 + i] as { p: Vec3 }).p))).toBeLessThan(1e-4));
    }
  });

  it("wraps each wheel on its pitch circle: the driving wheel 3.864, the pulley 3.646", () => {
    for (const c of LIFT_CHAINS) {
      for (const [which, pitch] of [
        ["wheel", 3.864],
        ["pulley", 3.646],
      ] as const) {
        const f = followerOf(`${c.name}.${which}`);
        const centre = f.spin?.centre as Vec3;
        // The cooked wheel's hub: the last box of its mesh, at its centre.
        const hub = obbs(geo(`car.${f.name}`)).at(-1) as Obb;
        expect(len3(sub3(hub.c, centre))).toBeLessThan(2e-4);
        // Every joint round it sits on the pitch circle, in the wheel's plane.
        const on = joints(c, 0).filter((p) => Math.abs(len3(sub3(p, centre)) - pitch / 2) < 5e-3);
        expect(on.length, `${c.name} ${which}: joints on the wrap`).toBeGreaterThan(4);
        for (const p of on) expect(Math.abs(dot3(sub3(p, centre), c.across))).toBeLessThan(1e-9);
        // A metre of chain turns it by the angle a piece subtends on it: 30°
        // on the driving wheel, « 12m00 par tour de roue » [PL-XXIII Fig. 3].
        const rate = f.spin?.rate as number;
        expect(rate).toBeCloseTo(2 * Math.asin(1 / pitch), 12);
        if (which === "wheel") expect((2 * Math.PI) / rate).toBeCloseTo(12, 2);
        // So the pins ride it without drifting: shifted δ and turned back by
        // the wheel's own turn, every pin on the wrap lands on a pin as built.
        const axis = f.spin?.axis as Vec3;
        const back = (p: Vec3, a: number): Vec3 => {
          const v = sub3(p, centre);
          const cs = Math.cos(a);
          const sn = Math.sin(a);
          const x: Vec3 = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
          return add3(centre, add3(add3(mul3(v, cs), mul3(x, sn)), mul3(axis, dot3(axis, v) * (1 - cs))));
        };
        const onWheel = (p: Vec3) => Math.abs(len3(sub3(p, centre)) - pitch / 2) < 5e-3;
        const built = joints(c, 0);
        const drift = (turn: number) => {
          let worst = 0;
          for (const delta of [0.37, 1.9, 5.2]) {
            // Pin by pin: each on the wheel both as built and shifted.
            joints(c, delta).forEach((p, j) => {
              const b = built[j] as Vec3;
              if (onWheel(p) && onWheel(b)) worst = Math.max(worst, len3(sub3(back(p, -turn * delta), b)));
            });
          }
          return worst;
        };
        expect(drift(rate), `${c.name} ${which}: pins off the wheel's own`).toBeLessThan(0.02);
        // Control: turning a radian per pitch radius drifts them.
        expect(drift(2 / pitch)).toBeGreaterThan(0.02);
      }
      // The centres « 82m305 » apart [E1900-TXT Fig. 144]: the check that the
      // rail line stands where the plates draw it.
      const R = followerOf(`${c.name}.wheel`).spin?.centre as Vec3;
      const Rp = followerOf(`${c.name}.pulley`).spin?.centre as Vec3;
      expect(Math.abs(len3(sub3(R, Rp)) - 82.305)).toBeLessThan(0.15);
    }
  });

  it("keeps the cabin's piston under the car at every moment of the round", () => {
    for (const c of LIFT_CHAINS) {
      const run = runOf(c.lead);
      const pose = new Float64Array(4);
      const side = c.name.endsWith(".right") ? 1 : -1;
      /** How far the cabin's piston stands from its place under the car, at arc s, with the shift scaled by k. */
      const gap = (s: number, k: number): number => {
        carPose(run, s, pose);
        // The Roux car's pose rides its running wheels' centres, 0.45 over
        // the rail line up the chord's normal (lifts.ts `CarBody.ride`: the
        // rail heads 0.15 over it, the « galets … de 600 mm »): the car's
        // axle line is that far under it.
        const slope = pose[3] as number;
        // Out along the leg's diagonal: across × up.
        const out: Vec3 = [-c.across[2], 0, c.across[0]];
        const n = add3(mul3(out, Math.sin(slope)), [0, Math.cos(slope), 0]);
        const P: Vec3 = sub3([pose[0] as number, pose[1] as number, pose[2] as number], mul3(n, 0.15 + 0.6 / 2));
        const js = joints(c, chainShift(c, s) * k);
        // The cabin's piston: the last piece, from the last joint to the first.
        const mid = mul3(add3(js[0] as Vec3, js[js.length - 1] as Vec3), 0.5);
        return len3(sub3(mid, add3(P, mul3(c.across, side * 2.04))));
      };
      let worst = 0;
      let control = 0;
      let slackLo = Infinity;
      let slackHi = -Infinity;
      for (const time of TIMES) {
        const s = runArc(run, time);
        worst = Math.max(worst, gap(s, 1));
        control = Math.max(control, gap(s, 1.02));
        // The tensioners stay inside their screws' range the whole round,
        // however many pieces are on the wheels.
        const js = joints(c, chainShift(c, s));
        for (const i of [174, 175]) {
          const d = len3(sub3(js[i + 1] as Vec3, js[i] as Vec3));
          slackLo = Math.min(slackLo, d);
          slackHi = Math.max(slackHi, d);
        }
        // And every other piece keeps its length.
        const off = Math.max(...js.slice(0, 174).map((p, i) => Math.abs(len3(sub3(js[i + 1] as Vec3, p)) - 1)));
        expect(off).toBeLessThan(1e-8);
      }
      expect(slackLo).toBeGreaterThan(1.725);
      expect(slackHi).toBeLessThan(2.225);
      // The piston rides the lower strand, 0.243 over the rail line, so it
      // stands about that far off the car's axle line and no further (the
      // car's chord cuts a bend by a few cm).
      expect(control, `${c.name}: control`).toBeGreaterThan(0.6);
      expect(worst, `${c.name}: the cabin's piston's furthest from its place under the car`).toBeLessThan(0.3);
    }
  });

  it("moves the counterweight pistons against the car: down as it rises", () => {
    for (const c of LIFT_CHAINS) {
      const run = runOf(c.lead);
      const w = (s: number) => {
        const js = joints(c, chainShift(c, s));
        return ((js[82] as Vec3)[1] + (js[93] as Vec3)[1]) / 2;
      };
      // Over the car's 68 m the counterweights run the other way, round the
      // pulley and down: most of it in height.
      expect(w(run.from) - w(run.to)).toBeGreaterThan(40);
    }
  });
});

// ------------------------------------------------------------------ //
// The Otis machinery.
// ------------------------------------------------------------------ //

describe("eiffel lift machinery: the Otis counterweight and motor", () => {
  const OTIS = ["otis.sud", "otis.nord"] as const;
  /** A run's unit direction at its foot, world: where its 54.6° run points up. */
  const runFoot = (run: CarRun): Vec3 => {
    const d = sub3(run.path[1] as Vec3, run.path[0] as Vec3);
    return mul3(d, 1 / len3(d));
  };

  it("runs each truck against its car, a third of its way, down its own track parallel to the car's", () => {
    for (const name of OTIS) {
      const run = runOf(name);
      const f = followerOf(`${name}.truck`);
      const slide = f.slide as Vec3;
      // « Le contrepoids se déplace du tiers de la course de la cabine » [PL-XXII quater Fig. 3].
      expect(len3(slide)).toBeCloseTo(1 / 3, 12);
      // Opposite the car, down the track parallel to the car's straight run.
      expect(dot3(slide, runFoot(run)) / len3(slide)).toBeCloseTo(-1, 6);
      // Control: a truck riding with the car would read +1.
      expect(dot3(mul3(slide, -1), runFoot(run)) / len3(slide)).toBeCloseTo(1, 6);
    }
  });

  it("keeps each truck's wheels on its cooked rails, and the truck on its track, over the car's whole round", () => {
    for (const name of OTIS) {
      const run = runOf(name);
      const f = followerOf(`${name}.truck`);
      const truck = obbs(geo(`car.${f.name}`));
      // The wheels: the 0.5 boxes, six of them.
      const wheels = truck.filter((b) => Math.abs((b.half[0] as number) - 0.25) < 1e-3 && Math.abs((b.half[1] as number) - 0.25) < 1e-3);
      expect(wheels).toHaveLength(6);
      // The cooked counterweight rails: the 0.24-deep, 0.07-wide boxes of the Otis gear, long.
      const rails = obbs(geo("machinery.liftOtisGear")).filter(
        (b) => Math.abs((b.half[1] as number) - 0.12) < 1e-3 && Math.abs((b.half[2] as number) - 0.035) < 1e-3 && (b.half[0] as number) > 20,
      );
      expect(rails).toHaveLength(4);
      // A wheel on a rail: its centre a wheel's radius over the rail's head,
      // over it across, and between its ends along it.
      const onRail = (c: Vec3): number => {
        let best = Infinity;
        for (const r of rails) {
          const d = sub3(c, r.c);
          const along = dot3(d, r.axes[0]);
          const out = dot3(d, r.axes[1]) - (r.half[1] as number) - 0.25;
          const across = dot3(d, r.axes[2]);
          const past = Math.max(0, Math.abs(along) - (r.half[0] as number));
          best = Math.min(best, Math.hypot(out, across, past));
        }
        return best;
      };
      let worst = 0;
      let control = 0;
      for (const t of TIMES) {
        const tau = runArc(run, t) - run.at;
        for (const w of wheels) {
          worst = Math.max(worst, onRail(follow(f, tau, w.c)));
          // Control: moved at half the ratio the truck leaves the track's ends.
          control = Math.max(control, onRail(follow({ ...f, slide: mul3(f.slide as Vec3, 1.5) }, tau, w.c)));
        }
      }
      expect(control, `${name}: control`).toBeGreaterThan(1);
      expect(worst, `${name}: the truck's wheels' furthest from its rails`).toBeLessThan(2e-3);
    }
  });

  it("keeps the counterweight cables on the truck, a metre longer for every three the car rises", () => {
    for (const name of OTIS) {
      const run = runOf(name);
      const truck = followerOf(`${name}.truck`);
      for (const which of ["a", "b", "c"]) {
        const f = followerOf(`${name}.cable.${which}`);
        const box = obbs(geo(`car.${f.name}`))[0] as Obb;
        // The strand's lower end, as built, and where the truck carries that point.
        const end0 = sub3(box.c, mul3(box.axes[0], box.half[0] as number));
        const endA = add3(box.c, mul3(box.axes[0], box.half[0] as number));
        const low = dot3(sub3(end0, endA), f.stretch?.along as Vec3) > 0 ? end0 : endA;
        let worst = 0;
        let control = 0;
        const wrong: Follower = { ...f, stretch: { ...(f.stretch as NonNullable<Follower["stretch"]>), rate: 0.3 } };
        for (const t of TIMES) {
          const tau = runArc(run, t) - run.at;
          worst = Math.max(worst, len3(sub3(follow(f, tau, low), follow(truck, tau, low))));
          control = Math.max(control, len3(sub3(follow(wrong, tau, low), follow(truck, tau, low))));
        }
        // Control: a strand paid out at 0.3 for 1/3 parts from the truck.
        expect(control).toBeGreaterThan(1);
        // To the cooked f32's resolution at 50 m.
        expect(worst, `${f.name}: its foot's furthest from the truck`).toBeLessThan(1e-4);
        expect(f.stretch?.rate).toBeCloseTo(1 / 3, 12);
      }
    }
  });

  it("moves each carriage down its 61°20′ girders a twelfth of the car's way, between the cylinder and the fixed pulleys", () => {
    for (const name of OTIS) {
      const run = runOf(name);
      const f = followerOf(`${name}.carriage`);
      const slide = f.slide as Vec3;
      // « palan à 12 brins » [E1900-TXT p. 127; PL-XX: 10.83 × 12].
      expect(len3(slide)).toBeCloseTo(1 / 12, 12);
      // Down the girders: 61°20′ below the horizontal.
      expect(Math.asin(-slide[1] / len3(slide)) * (180 / Math.PI)).toBeCloseTo(61 + 20 / 60, 6);
      // Its lower pulley group at z 12.4 with the car at the 2nd floor, where
      // PL-XX Fig. 4 draws it, and 10.7 m of girder higher with the car on the ground.
      const boxes = obbs(geo(`car.${f.name}`));
      const hubs = boxes.filter((b) => Math.abs((b.half[0] as number) - 0.1) < 1e-6 && Math.abs((b.half[1] as number) - 0.1) < 1e-6);
      const lowest = (tau: number) => Math.min(...hubs.map((b) => follow(f, tau, b.c)[1]));
      expect(lowest(run.to - run.at)).toBeCloseTo(12.4, 2);
      // Control: at an eleventh it would stand 0.8 lower there.
      const eleventh: Follower = { ...f, slide: mul3(slide, 12 / 11) };
      expect(Math.abs(Math.min(...hubs.map((b) => follow(eleventh, run.to - run.at, b.c)[1])) - 12.4)).toBeGreaterThan(0.5);
      expect(lowest(run.from - run.at) - lowest(run.to - run.at)).toBeCloseTo(((run.to - run.from) / 12) * Math.sin(((61 + 20 / 60) * Math.PI) / 180), 6);
    }
  });
});

// ------------------------------------------------------------------ //
// Clearances: everything that moves, slid its whole run, against the
// tower's cooked surfaces.
// ------------------------------------------------------------------ //

/**
 * What `platforms.ts` has still to open for the machinery, excluded from
 * the census until it does (it is another module's; the openings are
 * reported, not made here). Each in the shaft frame: s along the N–S
 * diagonal toward pile 3, t toward pile 4.
 * - The landing's deck under the upper Edoux car's berth: the car stands
 *   at the landing with its floor flush with the deck's, its floor frame
 *   0.20 under it, its palonnier to 0.90 under it and its pistons rising
 *   through the deck into the columns Co1; the deck needs the car's well,
 *   s -4.435 to -0.865, t ±1.95, as the lower car has, and a slot on to
 *   s -4.93 and -0.37, t ±0.25, for the palonnier's ends and the pistons
 *   (the 0.22 deck, z 195.71-195.93).
 * - The lower car's well in the same deck is 3.67 along s, shorter than
 *   the palonnier on the car's roof (4.1, spanning its brake columns),
 *   which rises through the deck as the car arrives, and than its brake
 *   columns, which end in it: s 0.39 to 4.91 over t ±0.26.
 * - The 2nd floor under the lower car's berth: the car stops with its
 *   floor on the deck's, its brake frame to 1.91 and its walkway to 2.15
 *   under it, into the pit « sous l'Ascenseur Edoux » 3.3 down [PL-XXIII
 *   ter Figs 17-18], its brake columns running on down into the pit: the
 *   deck needs the car's well with the columns, s 0.35 to 4.95, t ±2.0;
 *   and holes for the upper car's cylinders, which start 1.73 under it,
 *   and the pistons in them: s -4.9 to -0.4, t ±0.25.
 * - The 3rd floor's well for the same car, 3.67 along s, is shorter than
 *   the car's roof frame (4.28, spanning the columns' lines) and its
 *   tensioner rods, which rise through the deck as the car arrives, and
 *   than the piston columns Co1 (Ø 0.44) which run up through it: it
 *   needs to reach s -4.93 to -0.37 over t ±0.25 (the 0.85 deck, z
 *   275.27-276.13).
 */
function PENDING_PLATFORMS(x: number, y: number, z: number): boolean {
  const s = (x - z) / Math.SQRT2;
  const t = (x + z) / Math.SQRT2;
  // spec.ts `EDOUX_PLAN` (the shaft's plan girders stop at what it lists):
  // above the landing, on the lower car's side, the cable guides the plan
  // does not list yet — « Poteau-guide des câbles 390 × 580 » at s 4.682
  // and the light guide at s 0.618 — from the landing to the girder over
  // the 3rd floor: s 4.487 to 4.877, t ±0.29, and s 0.488 to 0.748, t
  // ±0.13 (a hollow box 0.26 square), y 195.93 to 280.98.
  if (y > 195.9 && y < 281 && ((s > 4.48 && s < 4.89 && Math.abs(t) < 0.3) || (s > 0.48 && s < 0.76 && Math.abs(t) < 0.14))) {
    return true;
  }
  // And below the landing, the lower car's brake columns Co2 are Ø 0.43
  // where it lists « guide S1 », « guide S2 » ±0.17: s 0.403-0.833 and
  // 4.467-4.897, t ±0.215, z 112.4-195.93.
  if (y > 112.3 && y < 196 && Math.abs(t) < 0.22 && [0.618, 4.682].some((c) => Math.abs(s - c) < 0.22)) return true;
  if (y > 195.7 && y < 195.94 && s > -4.93 && s < -0.37 && Math.abs(t) < 0.25) return true;
  if (y > 195.7 && y < 195.94 && s > -4.44 && s < -0.86 && Math.abs(t) < 1.96) return true;
  if (y > 195.7 && y < 195.94 && s > 0.39 && s < 4.91 && Math.abs(t) < 0.26) return true;
  if (y > 114.5 && y < 115.74 && s > 0.35 && s < 4.95 && Math.abs(t) < 2.0) return true;
  if (y > 114.5 && y < 115.74 && s > -4.9 && s < -0.4 && Math.abs(t) < 0.25) return true;
  return y > 275.26 && y < 276.14 && s > -4.93 && s < -0.37 && Math.abs(t) < 0.25;
}

describe("eiffel lift machinery: clearances", () => {
  it("reads a census of the tower's surfaces", () => {
    expect(towerCount).toBeGreaterThan(1_000_000);
  });

  it("slides the Edoux cars and pistons their whole runs clear of the shaft, floors and girders", () => {
    const nord = runOf("edoux.nord");
    const found: Record<string, { depth: number; at: Vec3 | undefined; tau: number }> = {};
    for (const [name, f] of [
      ["edoux.nord", undefined],
      ["edoux.sud", followerOf("edoux.sud")],
    ] as const) {
      const boxes = obbs(geo(`car.${name}`));
      let worst = { depth: -Infinity, at: undefined as Vec3 | undefined, tau: 0 };
      for (let tau = -nord.at; tau <= nord.to - nord.at + 1e-9; tau += 0.5) {
        const move = (p: Vec3): Vec3 => (f === undefined ? add3(p, [0, tau, 0]) : follow(f, tau, p));
        const d = deepest(boxes, move, tower, PENDING_PLATFORMS);
        if (d.depth > worst.depth) worst = { ...d, tau };
      }
      found[name] = worst;
    }
    // Control: the census can say "inside": the upper car moved onto the central post.
    const post = deepest(obbs(geo("car.edoux.nord")), (p) => add3(p, [1.87, 0, -1.87]), tower);
    expect(post.depth).toBeGreaterThan(0.005);
    for (const [name, w] of Object.entries(found)) {
      // Touching is allowed (a car's floor on its landing's), to the 1 mm
      // the page's jitter moves a point.
      expect(w.depth, `${name}: deepest tower point inside it, at ${w.at?.map((x) => x.toFixed(2))} (travel ${w.tau})`).toBeLessThan(0.002);
    }
  });
  it("stands every still piece of machinery clear: the Roux ducts, shafts' bearings and frames, the Edoux gear", () => {
    for (const id of ["liftRouxGear", "liftOtisGear", "liftEdouxGear"]) {
      const d = deepest(obbs(geo(`machinery.${id}`)), (p) => p, tower, PENDING_PLATFORMS);
      expect(d.depth, `${id}: deepest tower point inside it, at ${d.at?.map((x) => x.toFixed(2))}`).toBeLessThan(0.002);
    }
    // Control: the Roux gear moved a metre toward the tower's axis meets the leg.
    const moved = deepest(obbs(geo("machinery.liftRouxGear")), (p) => [p[0] * 0.9, p[1], p[2] * 0.9], tower);
    expect(moved.depth).toBeGreaterThan(0.01);
  });

  it("turns every wheel and pulley a whole turn clear, and runs every truck, carriage and cable its whole way clear", () => {
    for (const f of LIFT_FOLLOWERS) {
      // The Edoux counterweight car has its own test above; the pistons are
      // tubes inside their cylinders and columns.
      if (f.name === "edoux.sud" || f.name === "edoux.pistons") continue;
      const lead = runOf(f.lead);
      const boxes = obbs(geo(`car.${f.name}`));
      let worst = { depth: -Infinity, at: undefined as Vec3 | undefined, tau: 0 };
      // A spinning wheel: a turn in 24 steps; the rest: the lead's whole run.
      const rate = f.spin?.rate ?? 1;
      const taus =
        f.spin !== undefined
          ? Array.from({ length: 24 }, (_, i) => (i * 2 * Math.PI) / 24 / rate)
          : Array.from({ length: 41 }, (_, i) => lead.from - lead.at + ((lead.to - lead.from) * i) / 40);
      for (const tau of taus) {
        const d = deepest(boxes, (p) => follow(f, tau, p), tower, PENDING_PLATFORMS);
        if (d.depth > worst.depth) worst = { ...d, tau };
      }
      expect(worst.depth, `${f.name}: deepest tower point inside it, at ${worst.at?.map((x) => x.toFixed(2))} (travel ${worst.tau.toFixed(2)})`).toBeLessThan(0.002);
    }
  }, 180_000);

  it("moves every moving part clear of the still machinery, and every car clear of it", () => {
    // Touching is allowed (a roller on its girder, a wheel on its rail), to
    // 2 mm. The Edoux cables are left out: they run INSIDE their guides, «
    // léger caisson en tôle », which the model draws solid; the pistons run
    // inside their cylinders and columns.
    const moving = [
      ...LIFT_FOLLOWERS.filter((f) => !f.name.startsWith("edoux.cable.") && f.name !== "edoux.pistons"),
      ...LIFT_CARS.map((r): Follower => ({ name: r.name, lead: r.name })),
    ];
    for (const f of moving) {
      const lead = runOf(f.lead);
      // The Otis carriage's piston rods (14 long, Ø 0.108) run into the
      // cylinder through its glands: they are meant to be inside it.
      const rods = (b: Obb) => Math.abs((b.half[0] as number) - 7) < 1e-3 && Math.abs((b.half[1] as number) - 0.054) < 1e-3;
      const boxes = obbs(geo(`car.${f.name}`)).filter((b) => !(f.name.endsWith(".carriage") && rods(b)));
      const rate = f.spin?.rate ?? 1;
      const taus =
        f.spin !== undefined
          ? Array.from({ length: 24 }, (_, i) => (i * 2 * Math.PI) / 24 / rate)
          : Array.from({ length: 41 }, (_, i) => lead.from - lead.at + ((lead.to - lead.from) * i) / 40);
      let worst = { depth: -Infinity, at: undefined as Vec3 | undefined, tau: 0 };
      for (const tau of taus) {
        let move: (p: Vec3) => Vec3;
        if (f.slide !== undefined || f.spin !== undefined || f.stretch !== undefined) move = (p) => follow(f, tau, p);
        else {
          // A car: the page's turn and move (main.ts `moveCars`).
          const home = new Float64Array(4);
          const now = new Float64Array(4);
          carPose(lead, lead.at, home);
          carPose(lead, lead.at + tau, now);
          const turned: Follower = {
            name: f.name,
            lead: f.lead,
            spin: { centre: [home[0] as number, home[1] as number, home[2] as number], axis: lead.axis, rate: 1 },
          };
          const d = (now[3] as number) - (home[3] as number);
          const shift = sub3([now[0] as number, now[1] as number, now[2] as number], [home[0] as number, home[1] as number, home[2] as number]);
          move = (p) => add3(follow(turned, d, p), shift);
        }
        // A wheel turns on its shaft or axle: what lies on its axis, within
        // the hub, is that, not a clash.
        const onAxle = (x: number, y: number, z: number): boolean => {
          // A strand wraps its pulley at its top: it lies in the groove there.
          if (f.stretch !== undefined) return len3(sub3([x, y, z], f.stretch.anchor)) < 0.6;
          if (f.spin === undefined) return false;
          const v = sub3([x, y, z], f.spin.centre);
          const along = dot3(v, f.spin.axis);
          const r = len3(sub3(v, mul3(f.spin.axis, along)));
          // And a still cable lies in its groove, at the radius it turns it by.
          return r < 0.32 || Math.abs(r - 1 / f.spin.rate) < 0.04;
        };
        const got = deepest(boxes, move, gear, onAxle);
        if (got.depth > worst.depth) worst = { ...got, tau };
      }
      expect(worst.depth, `${f.name}: deepest still machinery inside it, at ${worst.at?.map((x) => x.toFixed(2))} (travel ${worst.tau.toFixed(2)})`).toBeLessThan(0.002);
    }
  });

  it("stands the Edoux cylinders and glands, and runs the pistons their whole stroke, clear of the tower", () => {
    // Restated [PL-XXIII ter Fig. 19, E1900-TXT pp. 172, 191]: the cylinders
    // Ø 0.380 on the pistons' axes, s -4.682 and -0.618, from z 114.00 to
    // 195.06, their glands the last 0.30 (Ø 0.54; the inner drawn 0.43); the
    // pistons Ø 0.320, their top 0.875 under the upper car's floor, 80.96
    // long, the car's floor from the landing to the 3rd floor.
    const at = (sv: number): Vec3 => [sv / Math.SQRT2, 0, -sv / Math.SQRT2];
    const tubes = [
      { s: -4.682, r: 0.19, y: [114.0, 194.76] },
      { s: -0.618, r: 0.19, y: [114.0, 194.76] },
      { s: -4.682, r: 0.27, y: [194.76, 195.06] },
      { s: -0.618, r: 0.215, y: [194.76, 195.06] },
      { s: -4.682, r: 0.16, y: [FLOORS.landing - 0.875 - 80.96, FLOORS.third - 0.875] },
      { s: -0.618, r: 0.16, y: [FLOORS.landing - 0.875 - 80.96, FLOORS.third - 0.875] },
    ];
    const depth = (tb: (typeof tubes)[number], grow: number): { depth: number; at: Vec3 | undefined } => {
      const c = at(tb.s);
      const r = tb.r + grow;
      let d = -Infinity;
      let where: Vec3 | undefined;
      tower([c[0] - r, tb.y[0] as number, c[2] - r], [c[0] + r, tb.y[1] as number, c[2] + r], (x, y, z) => {
        if (y < (tb.y[0] as number) || y > (tb.y[1] as number) || PENDING_PLATFORMS(x, y, z)) return;
        const inside = r - Math.hypot(x - c[0], z - c[2]);
        if (inside > d) {
          d = inside;
          where = [x, y, z];
        }
      });
      return { depth: d, at: where };
    };
    for (const tb of tubes) {
      const got = depth(tb, 0);
      expect(got.depth, `tube at s ${tb.s}, r ${tb.r}: deepest tower point in it, at ${got.at?.map((x) => x.toFixed(2))}`).toBeLessThan(0.002);
    }
    // Control: grown to 0.45 the inner cylinder reaches the central post.
    expect(depth({ s: -0.618, r: 0.45, y: [150, 190] }, 0).depth).toBeGreaterThan(0.01);
  });

  it("runs every Roux chain clear: nothing of the tower within a piece's reach of its loop", () => {
    // A piece reaches 0.133 off the loop: its rollers, 0.070 in radius, on
    // an axle 0.093 either side [lifts.ts CHAIN_PIECES]; the counterweight
    // boxes 0.092. The chain covers its whole loop at every moment, so the
    // loop is the swept envelope.
    const reach = Math.hypot(0.093 + 0.02, 0.07);
    for (const c of LIFT_CHAINS) {
      let near = Infinity;
      let at: Vec3 | undefined;
      const L = c.loop.arc[c.loop.arc.length - 1] as number;
      for (let u = 0; u < L; u += 0.05) {
        // pathPoint via the published loop: straight between its vertices.
        let i = 0;
        while (i + 2 < c.loop.arc.length && (c.loop.arc[i + 1] as number) < u) i++;
        const a = c.loop.path[i] as Vec3;
        const b = c.loop.path[i + 1] as Vec3;
        const w = (u - (c.loop.arc[i] as number)) / ((c.loop.arc[i + 1] as number) - (c.loop.arc[i] as number));
        const p = add3(a, mul3(sub3(b, a), w));
        tower(sub3(p, [0.5, 0.5, 0.5]), add3(p, [0.5, 0.5, 0.5]), (x, y, z) => {
          const d = Math.hypot(x - p[0], y - p[1], z - p[2]);
          if (d < near) {
            near = d;
            at = [x, y, z];
          }
        });
      }
      expect(near, `${c.name}: nearest tower surface to its loop, at ${at?.map((x) => x.toFixed(2))}`).toBeGreaterThan(reach);
    }
  });
});

describe("eiffel lift machinery: determinism", () => {
  it("cooks the same machinery twice over, bit for bit", async () => {
    const once = async () => {
      const g = new Graph(1889);
      const lifts = buildLifts(g, quadrants(g, "quad"));
      for (const { name, mesh } of lifts.cars ?? []) g.output(mesh, "out", `car.${name}`);
      for (const { name, spawn } of lifts.chains ?? []) g.output(spawn, "instances", `chain.${name}`);
      for (const m of lifts.machinery ?? []) g.output(m, "out", `machinery.${m.id}`);
      return (await cook(g)).outputs as unknown as Record<string, unknown[]>;
    };
    const a = await once();
    const b = await once();
    const keys = Object.keys(a).sort();
    expect(keys).toEqual(Object.keys(b).sort());
    expect(keys.filter((k) => k.startsWith("chain.")).length).toBe(4);
    const bytes = (o: Record<string, unknown[]>, k: string): Float32Array[] => {
      const item = (o[k] ?? [])[0] as { kind: string; batches?: Array<{ transforms: Float32Array }> };
      if (item.kind === "instances") return (item.batches ?? []).map((x) => x.transforms);
      const got = firstGeometry((o[k] ?? []) as never);
      return got === undefined ? [] : [got.attrs.point.get("P")?.data as Float32Array];
    };
    for (const k of keys) {
      const x = bytes(a, k);
      const y = bytes(b, k);
      expect(x.length, k).toBe(y.length);
      x.forEach((arr, i) => expect(Buffer.compare(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), Buffer.from((y[i] as Float32Array).buffer, (y[i] as Float32Array).byteOffset, (y[i] as Float32Array).byteLength)), k).toBe(0));
    }
    // Control: the comparison can say "different": the chain placed a
    // centimetre on is not the cooked one.
    const c = LIFT_CHAINS[0] as (typeof LIFT_CHAINS)[number];
    const moved = joints(c, 0.01);
    const cooked = (pieces(c.name).chainAxle ?? []).map((x) => x.p);
    expect(Math.max(...cooked.map((p, j) => len3(sub3(p, moved[j] as Vec3))))).toBeGreaterThan(0.009);
    // And placing a chain is a pure function of its shift.
    expect(joints(c, 12.5)).toEqual(joints(c, 12.5));
  }, 120_000);
});
