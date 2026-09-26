/**
 * The Eiffel demo's stairs, held clear of everything else in the tower
 * (`demos/eiffel/stairs.ts`, skinned and placed by `lifts.ts`).
 *
 * The stairs are built as data — boxes (treads, frame, landings) and hand
 * rail centre lines — so they are read here straight from `stairRuns()`,
 * each leg run turned onto every leg it is copied to the way `lifts.ts`
 * copies it, and held against what the graph COOKS for every other part:
 *
 * - AGAINST THE STATIC STEEL AND STONE: every stair box (and every rail
 *   segment, as the 0.05 square box `lifts.ts` skins it into), shrunk a
 *   millimetre a side so that touching is not a clash, is tested exactly —
 *   the separating-axis test of a box against a triangle — against every
 *   triangle of the legs, the shaft, the 1st floor, the summit, the
 *   platforms and the lifts' tracks, guides and machinery. The stairs
 *   themselves (`liftStairs`, `liftRailSkin`), the moving cars, and the
 *   instanced dressings (rivets, fittings, chains) are left out.
 * - AGAINST THE LIFTS AS THEY RUN: every car `LIFT_CARS` publishes, and
 *   every body that slides with one (`LIFT_FOLLOWERS` with a `slide`: the
 *   Edoux counterweight car and pistons, the Otis carriages and trucks),
 *   is sampled over its surface and moved the page's way over its whole
 *   run; the path each sample travels between two poses must enter no
 *   stair box. Bodies that turn or stretch in place (wheels, pulleys,
 *   cable drops) and the Roux chains are not swept here.
 *
 * NOTHING STATIC IS EXEMPT: any box meeting any other part reports.
 *
 * ONE SWEPT EXEMPTION, bounded and open (SOURCES.md §11.10): e1's last
 * flight, `e1.top`, runs up the leg's diagonal inward to the 2nd floor, as
 * PL-XX Fig. 3's section draws it, and the Otis car's outer end reaches
 * over its last metre at the car's 2nd-floor station. The section projects
 * onto the diagonal plane, so the real flight stands to one side of the
 * car's line; where, the plates read so far do not settle (e1's plan
 * position is [estimated] since §11.6), and the model has had the flight
 * on the diagonal since §21. So the Otis cars (piles 1 and 3) may meet
 * that flight's boxes, and only there, at the top of their run (s beyond
 * `E1_TOP_FROM`). Nothing else that moves may meet a stair.
 *
 * Every zero-check is paired with a control that proves the comparator can
 * say "different". Diagnostics (every hit, grouped) are written to
 * `node_modules/.cache/eiffel-next/stairs/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildFirstFloor } from "../demos/eiffel/firstFloor.js";
import { quadrants } from "../demos/eiffel/lattice.js";
import { buildLegs } from "../demos/eiffel/legs.js";
import { type CarRun, LIFT_CARS, LIFT_FOLLOWERS, buildLifts, carPose } from "../demos/eiffel/lifts.js";
import type { Parts } from "../demos/eiffel/parts.js";
import { buildPlatforms } from "../demos/eiffel/platforms.js";
import { buildShaft } from "../demos/eiffel/shaft.js";
import { PILES } from "../demos/eiffel/spec.js";
import { type Block, type Flight, type StairRun, stairRuns } from "../demos/eiffel/stairs.js";
import { buildSummit } from "../demos/eiffel/summit.js";

type Vec3 = readonly [number, number, number];

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / len3(p));

const OUT_DIR = "node_modules/.cache/eiffel-next/stairs";

/** What a stair box may lose on each side before a meeting counts: touching is not a clash. */
const SHRINK = 0.001;
/** The hand rails' skin: a square of half-width 0.025 (lifts.ts `skin(g, "liftRailSkin", rails, 0.025)`). */
const RAIL_HALF = 0.025;
/** The swept exemption: the flight, the Otis cars, and the arc length along their run it starts at (their top station is at 128.83). */
const E1_TOP = "e1.top";
const OTIS = new Set(["otis.sud", "otis.nord"]);
const E1_TOP_FROM = 127.0;
/** The stair classes of `lifts.ts` (its `platforms` class): the stairs themselves. */
const STAIR_IDS = new Set(["liftStairs", "liftRailSkin"]);

// ------------------------------------------------------------ the stair boxes

type List = "treads" | "frame" | "landings" | "rails";

/** One oriented box of a stair, placed on its leg, shrunk. */
interface SBox {
  run: StairRun["key"];
  /** The pile it stands in, or 0 for a run built once in the world. */
  pile: number;
  list: List;
  index: number;
  flight: string;
  c: Vec3;
  u: [Vec3, Vec3, Vec3];
  h: [number, number, number];
  lo: Vec3;
  hi: Vec3;
}

/** Quadrant k's copy of a point: k quarter turns about +y, +z to +x (lifts.ts `onLeg`). */
function onLeg(k: number, p: Vec3): Vec3 {
  if (k === 0) return p;
  if (k === 1) return [p[2], p[1], -p[0]];
  if (k === 2) return [-p[0], p[1], -p[2]];
  return [-p[2], p[1], p[0]];
}

/** A rail segment as the box its skin fills: along the segment, its roll by the up hint (lattice.ts `skin`). */
function railBox(a: Vec3, b: Vec3): Block {
  const d = sub3(b, a);
  const x = unit3(d);
  let y = sub3([0, 1, 0], mul3(x, x[1]));
  if (len3(y) < 1e-6) y = sub3([1, 0, 0], mul3(x, x[0]));
  return { at: mul3(add3(a, b), 0.5), x, y: unit3(y), size: [len3(d), 2 * RAIL_HALF, 2 * RAIL_HALF] };
}

/** The distance from p to the segment ab. */
function toSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub3(b, a);
  const L = dot3(ab, ab);
  const u = L > 0 ? Math.min(1, Math.max(0, dot3(sub3(p, a), ab) / L)) : 0;
  return len3(sub3(p, add3(a, mul3(ab, u))));
}

/** The flight whose walking line (foot to head) passes nearest a point of its run: a label, not a rule. */
function nearestFlight(flights: readonly Flight[], p: Vec3): string {
  let best = "";
  let d = Infinity;
  for (const f of flights) {
    const e = toSegment(p, f.foot, f.head);
    if (e < d) {
      d = e;
      best = f.name;
    }
  }
  return best;
}

/** A block, placed and shrunk, as an SBox. */
function sbox(b: Block, k: number, meta: Omit<SBox, "c" | "u" | "h" | "lo" | "hi">, shrink = SHRINK): SBox {
  const c = onLeg(k, b.at);
  const x = onLeg(k, b.x);
  const y = onLeg(k, b.y);
  const z = cross3(x, y);
  const u: [Vec3, Vec3, Vec3] = [x, y, z];
  const h: [number, number, number] = [
    Math.max(0, b.size[0] / 2 - shrink),
    Math.max(0, b.size[1] / 2 - shrink),
    Math.max(0, b.size[2] / 2 - shrink),
  ];
  const ext = [0, 1, 2].map((a) => h[0] * Math.abs(x[a]!) + h[1] * Math.abs(y[a]!) + h[2] * Math.abs(z[a]!));
  return {
    ...meta,
    c,
    u,
    h,
    lo: [c[0] - ext[0]!, c[1] - ext[1]!, c[2] - ext[2]!],
    hi: [c[0] + ext[0]!, c[1] + ext[1]!, c[2] + ext[2]!],
  };
}

/** Every stair box of every run, on every leg it is copied to. */
function stairBoxes(): SBox[] {
  const out: SBox[] = [];
  for (const r of stairRuns()) {
    const legs: Array<{ pile: number; k: number }> =
      r.legs === "world" ? [{ pile: 0, k: 0 }] : r.legs.map((n) => ({ pile: n, k: PILES.find((p) => p.n === n)!.quadrant }));
    const lists: Array<[List, Block[]]> = [
      ["treads", r.parts.treads],
      ["frame", r.parts.frame],
      ["landings", r.parts.landings],
      ["rails", r.parts.rails.flatMap((line) => line.slice(1).map((q, i) => railBox(line[i]!, q)))],
    ];
    for (const [list, blocks] of lists) {
      blocks.forEach((b, index) => {
        const flight = list === "landings" ? `landing(${nearestFlight(r.parts.flights, b.at)})` : nearestFlight(r.parts.flights, b.at);
        for (const { pile, k } of legs) out.push(sbox(b, k, { run: r.key, pile, list, index, flight }));
      });
    }
  }
  return out;
}

// ------------------------------------------------------------ a grid over the boxes

const CELL = 1;
const cellOf = (v: number) => Math.floor(v / CELL);
const key = (i: number, j: number, k: number) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);

interface BoxGrid {
  boxes: SBox[];
  cells: Map<number, number[]>;
  /** The occupied cells' indices, for a triangle too big to walk cell by cell. */
  occupied: Array<{ i: number; j: number; k: number; list: number[] }>;
  stamp: Int32Array;
  tick: number;
  lo: Vec3;
  hi: Vec3;
}

function boxGrid(boxes: SBox[]): BoxGrid {
  const cells = new Map<number, number[]>();
  const occupied: BoxGrid["occupied"] = [];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  boxes.forEach((b, n) => {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a]!, b.lo[a]!);
      hi[a] = Math.max(hi[a]!, b.hi[a]!);
    }
    for (let i = cellOf(b.lo[0]); i <= cellOf(b.hi[0]); i++) {
      for (let j = cellOf(b.lo[1]); j <= cellOf(b.hi[1]); j++) {
        for (let k = cellOf(b.lo[2]); k <= cellOf(b.hi[2]); k++) {
          const q = key(i, j, k);
          let list = cells.get(q);
          if (list === undefined) {
            list = [];
            cells.set(q, list);
            occupied.push({ i, j, k, list });
          }
          list.push(n);
        }
      }
    }
  });
  return { boxes, cells, occupied, stamp: new Int32Array(boxes.length), tick: 0, lo: lo as unknown as Vec3, hi: hi as unknown as Vec3 };
}

/** Visit, once each, the boxes whose cells an axis-aligned range meets. */
function eachNear(grid: BoxGrid, lo: Vec3, hi: Vec3, visit: (n: number) => void): void {
  if ([0, 1, 2].some((a) => hi[a]! < grid.lo[a]! || lo[a]! > grid.hi[a]!)) return;
  const tick = ++grid.tick;
  const i0 = cellOf(lo[0]);
  const i1 = cellOf(hi[0]);
  const j0 = cellOf(lo[1]);
  const j1 = cellOf(hi[1]);
  const k0 = cellOf(lo[2]);
  const k1 = cellOf(hi[2]);
  const take = (list: number[]) => {
    for (const n of list) {
      if (grid.stamp[n] === tick) continue;
      grid.stamp[n] = tick;
      visit(n);
    }
  };
  if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > grid.occupied.length) {
    for (const c of grid.occupied) {
      if (c.i >= i0 && c.i <= i1 && c.j >= j0 && c.j <= j1 && c.k >= k0 && c.k <= k1) take(c.list);
    }
    return;
  }
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (let k = k0; k <= k1; k++) {
        const list = grid.cells.get(key(i, j, k));
        if (list !== undefined) take(list);
      }
    }
  }
}

// ------------------------------------------------------------ box against triangle

/**
 * The separating-axis test of an oriented box against a triangle, exact:
 * the triangle is carried into the box's frame, and the box's three axes,
 * the triangle's normal and the nine cross products of the two sets' edges
 * are tried. Returns the penetration (the least push along any of the 13
 * axes that parts them), or 0 where one of them separates.
 */
function boxTriangle(b: SBox, a: Vec3, bb: Vec3, cc: Vec3): number {
  const loc = (p: Vec3): Vec3 => {
    const d = sub3(p, b.c);
    return [dot3(d, b.u[0]), dot3(d, b.u[1]), dot3(d, b.u[2])];
  };
  const v = [loc(a), loc(bb), loc(cc)];
  const [h0, h1, h2] = b.h;
  let depth = Infinity;
  const axis = (L: Vec3): boolean => {
    const n = len3(L);
    if (n < 1e-12) return true;
    const p0 = dot3(v[0]!, L);
    const p1 = dot3(v[1]!, L);
    const p2 = dot3(v[2]!, L);
    const r = h0 * Math.abs(L[0]) + h1 * Math.abs(L[1]) + h2 * Math.abs(L[2]);
    const over = Math.min(r - Math.min(p0, p1, p2), Math.max(p0, p1, p2) + r);
    if (over <= 0) return false;
    depth = Math.min(depth, over / n);
    return true;
  };
  const E: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const e of E) if (!axis(e)) return 0;
  const f = [sub3(v[1]!, v[0]!), sub3(v[2]!, v[1]!), sub3(v[0]!, v[2]!)];
  if (!axis(cross3(f[0]!, f[1]!))) return 0;
  for (const e of E) for (const g of f) if (!axis(cross3(e, g))) return 0;
  return depth === Infinity ? 0 : depth;
}

/** A point of the box near a triangle: its centroid carried into the box and clamped there. */
function nearPoint(b: SBox, a: Vec3, bb: Vec3, cc: Vec3): Vec3 {
  const g = mul3(add3(add3(a, bb), cc), 1 / 3);
  const d = sub3(g, b.c);
  let p = b.c;
  for (let k = 0; k < 3; k++) {
    const t = Math.max(-b.h[k]!, Math.min(b.h[k]!, dot3(d, b.u[k]!)));
    p = add3(p, mul3(b.u[k]!, t));
  }
  return p;
}

/** One stair box meeting one part: how many of its triangles, how deep the deepest, and near where. */
interface Hit {
  box: number;
  part: string;
  tris: number;
  depth: number;
  at: Vec3;
}

/** Every polygon of a geometry fanned into triangles, streamed. */
function eachTriangle(geo: Geometry, visit: (a: Vec3, b: Vec3, c: Vec3) => void): void {
  const P = geo.attrs.point.get("P")!.data;
  const pt = (i: number): Vec3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    if (n < 3) continue;
    const a = pt(geo.vertexToPoint[start]!);
    for (let k = 1; k + 1 < n; k++) visit(a, pt(geo.vertexToPoint[start + k]!), pt(geo.vertexToPoint[start + k + 1]!));
  }
}

/** Every stair box of the grid that a part's triangles enter. */
function hitsOf(grid: BoxGrid, part: string, geo: Geometry): Hit[] {
  const found = new Map<number, Hit>();
  eachTriangle(geo, (a, b, c) => {
    const lo: Vec3 = [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.min(a[2], b[2], c[2])];
    const hi: Vec3 = [Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]), Math.max(a[2], b[2], c[2])];
    eachNear(grid, lo, hi, (n) => {
      const s = grid.boxes[n]!;
      if ([0, 1, 2].some((k) => hi[k]! < s.lo[k]! || lo[k]! > s.hi[k]!)) return;
      const d = boxTriangle(s, a, b, c);
      if (d <= 0) return;
      const h = found.get(n);
      if (h === undefined) found.set(n, { box: n, part, tris: 1, depth: d, at: nearPoint(s, a, b, c) });
      else {
        h.tris++;
        if (d > h.depth) {
          h.depth = d;
          h.at = nearPoint(s, a, b, c);
        }
      }
    });
  });
  return [...found.values()];
}

// ------------------------------------------------------------ point and segment against the boxes

/** Whether the segment pq enters the box (a slab test in its frame); p = q is a point test. */
function segmentInBox(b: SBox, p: Vec3, q: Vec3): boolean {
  let t0 = 0;
  let t1 = 1;
  const dp = sub3(p, b.c);
  const d = sub3(q, p);
  for (let k = 0; k < 3; k++) {
    const o = dot3(dp, b.u[k]!);
    const v = dot3(d, b.u[k]!);
    const h = b.h[k]!;
    if (Math.abs(v) < 1e-15) {
      if (o <= -h || o >= h) return false;
      continue;
    }
    let a = (-h - o) / v;
    let c = (h - o) / v;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 >= t1) return false;
  }
  return true;
}

/** How deep a point stands in a box: the least of its distances to the faces, 0 outside. */
function depthIn(b: SBox, p: Vec3): number {
  const d = sub3(p, b.c);
  return Math.max(0, Math.min(...[0, 1, 2].map((k) => b.h[k]! - Math.abs(dot3(d, b.u[k]!)))));
}

/** The first stair box the segment pq enters, or -1. */
function segmentHit(grid: BoxGrid, p: Vec3, q: Vec3): number {
  const lo: Vec3 = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])];
  const hi: Vec3 = [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])];
  let got = -1;
  eachNear(grid, lo, hi, (n) => {
    if (got < 0 && segmentInBox(grid.boxes[n]!, p, q)) got = n;
  });
  return got;
}

// ------------------------------------------------------------ the moving bodies

/** Turn p about the unit axis a by `angle`, right-handed: Rodrigues, restated here. */
function turn(p: Vec3, a: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add3(add3(mul3(p, c), mul3(cross3(a, p), s)), mul3(a, dot3(a, p) * (1 - c)));
}

/**
 * The page's move (main.ts `moveCars`), restated: the built mesh turned
 * about the run's axis by the chord's slope at `s` less its slope at `at`,
 * about the built pose's point, and carried onto the pose at `s`.
 */
function mover(run: CarRun, s: number): (p: Vec3) => Vec3 {
  const home = new Float64Array(4);
  const now = new Float64Array(4);
  carPose(run, run.at, home);
  carPose(run, s, now);
  const h: Vec3 = [home[0]!, home[1]!, home[2]!];
  const n: Vec3 = [now[0]!, now[1]!, now[2]!];
  const d = now[3]! - home[3]!;
  return (p) => add3(n, turn(sub3(p, h), run.axis, d));
}

/** A follower slid with its lead: by `slide` per metre of the lead's travel from where it was built. */
function slider(run: CarRun, slide: Vec3, s: number): (p: Vec3) => Vec3 {
  const d = mul3(slide, s - run.at);
  return (p) => add3(p, d);
}

/** A body the test sweeps: its node id, the run that drives it, and how it moves. */
interface Mover {
  name: string;
  id: string;
  run: CarRun;
  move: (s: number) => (p: Vec3) => Vec3;
}

/** A car's node id from its name (lifts.ts `carId`): `roux.ouest` -> `liftCarRouxOuest`. */
const carId = (name: string): string =>
  `liftCar${name
    .split(".")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("")}`;

const MOVERS: Mover[] = [
  ...LIFT_CARS.map((run) => ({ name: run.name, id: carId(run.name), run, move: (s: number) => mover(run, s) })),
  ...LIFT_FOLLOWERS.filter((f) => f.slide !== undefined).map((f) => {
    const run = LIFT_CARS.find((r) => r.name === f.lead)!;
    return { name: f.name, id: carId(f.name), run, move: (s: number) => slider(run, f.slide!, s) };
  }),
];

/** Points over a mesh's surface no further apart than `h`: each triangle halved on its longest edge until short enough. */
function surfaceSamples(geo: Geometry, h: number): Vec3[] {
  const out: Vec3[] = [];
  const walk = (a: Vec3, b: Vec3, c: Vec3): void => {
    const [lab, lbc, lca] = [len3(sub3(a, b)), len3(sub3(b, c)), len3(sub3(c, a))];
    if (Math.max(lab, lbc, lca) <= h) {
      out.push(a, b, c, mul3(add3(add3(a, b), c), 1 / 3));
      return;
    }
    if (lab >= lbc && lab >= lca) {
      const m = mul3(add3(a, b), 0.5);
      walk(a, m, c);
      walk(m, b, c);
    } else if (lbc >= lca) {
      const m = mul3(add3(b, c), 0.5);
      walk(a, b, m);
      walk(a, m, c);
    } else {
      const m = mul3(add3(c, a), 0.5);
      walk(a, b, m);
      walk(m, b, c);
    }
  };
  eachTriangle(geo, walk);
  // Drop the repeats the shared corners make.
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Where a swept body first enters a stair box: per stair box, the first arc length and point. */
interface SweepHit {
  body: string;
  box: number;
  s: number;
  at: Vec3;
  samples: number;
  /** The deepest any sample stood inside the box at a pose: the least of its distances to the box's faces. */
  depth: number;
}

/**
 * Slide a body's samples over its run from `from` to `to` in `step`s and
 * test the segment each travels between two poses against the stair boxes:
 * a thin tread cannot pass between two samples of the motion.
 */
function sweep(grid: BoxGrid, m: Mover, samples: readonly Vec3[], step = 0.25): SweepHit[] {
  const found = new Map<number, SweepHit>();
  const { from, to } = m.run;
  const steps = Math.ceil((to - from) / step);
  // The samples in clusters of a metre's cell, each with its centre and
  // radius: a rigid move carries the cluster's sphere with its centre, and
  // the segment each sample travels lies in the hull of the sphere's two
  // places, so a cluster whose two spheres' box meets no stair box's box is
  // skipped whole — exactly, not by a tolerance.
  const byCell = new Map<string, Vec3[]>();
  for (const p of samples) {
    const k = `${Math.floor(p[0])},${Math.floor(p[1])},${Math.floor(p[2])}`;
    let l = byCell.get(k);
    if (l === undefined) byCell.set(k, (l = []));
    l.push(p);
  }
  const clusters = [...byCell.values()].map((pts) => {
    const c = mul3(pts.reduce<Vec3>((a, p) => add3(a, p), [0, 0, 0]), 1 / pts.length);
    const r = Math.max(...pts.map((p) => len3(sub3(p, c)))) + 1e-6;
    return { c, r, pts };
  });
  const anyNear = (lo: Vec3, hi: Vec3): boolean => {
    let hit = false;
    eachNear(grid, lo, hi, (n) => {
      const b = grid.boxes[n]!;
      if (!hit && [0, 1, 2].every((k) => hi[k]! >= b.lo[k]! && lo[k]! <= b.hi[k]!)) hit = true;
    });
    return hit;
  };
  let before = m.move(from);
  for (let i = 1; i <= steps; i++) {
    const s = Math.min(to, from + i * step);
    const after = m.move(s);
    for (const cl of clusters) {
      const a = before(cl.c);
      const b = after(cl.c);
      const lo: Vec3 = [Math.min(a[0], b[0]) - cl.r, Math.min(a[1], b[1]) - cl.r, Math.min(a[2], b[2]) - cl.r];
      const hi: Vec3 = [Math.max(a[0], b[0]) + cl.r, Math.max(a[1], b[1]) + cl.r, Math.max(a[2], b[2]) + cl.r];
      if (!anyNear(lo, hi)) continue;
      for (const q of cl.pts) {
        const now = after(q);
        const n = segmentHit(grid, before(q), now);
        if (n < 0) continue;
        const h = found.get(n);
        const d = depthIn(grid.boxes[n]!, now);
        if (h === undefined) found.set(n, { body: m.name, box: n, s, at: now, samples: 1, depth: d });
        else {
          h.samples++;
          h.depth = Math.max(h.depth, d);
        }
      }
    }
    before = after;
  }
  return [...found.values()];
}

// ------------------------------------------------------------ the cook

interface Cooked {
  /** Every static part, by node id. */
  parts: Array<{ id: string; cls: string; geo: Geometry }>;
  /** Every moving body's mesh, by name. */
  bodies: Map<string, Geometry>;
}

async function cookTower(): Promise<Cooked> {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  const built: Array<[string, Parts]> = [
    ["legs", buildLegs(g, quads)],
    ["shaft", buildShaft(g)],
    ["firstFloor", buildFirstFloor(g, quads)],
    ["summit", buildSummit(g)],
    ["platforms", buildPlatforms(g, quads)],
    ["lifts", buildLifts(g, quads)],
  ];
  const names: Array<{ name: string; id: string; cls: string }> = [];
  let n = 0;
  const bodyNames: Array<{ name: string; out: string }> = [];
  for (const [module, parts] of built) {
    for (const [cls, list] of Object.entries(parts)) {
      // Instances (rivets, fittings, chains) and cloth are not solids here;
      // cars move, and are swept below.
      if (["rivets", "fittings", "chains", "cloth"].includes(cls) || !Array.isArray(list)) continue;
      if (cls === "cars") {
        for (const c of list as Array<{ name: string; mesh: NodeHandle }>) {
          if (!MOVERS.some((m) => m.name === c.name)) continue;
          const out = `body:${c.name}`;
          g.output(c.mesh, "out", out);
          bodyNames.push({ name: c.name, out });
        }
        continue;
      }
      for (const h of list as NodeHandle[]) {
        if (module === "lifts" && STAIR_IDS.has(h.id)) continue;
        const name = `s${n++}`;
        g.output(h, "out", name);
        names.push({ name, id: h.id, cls: `${module}.${cls}` });
      }
    }
  }
  const { outputs } = await cook(g);
  const parts: Cooked["parts"] = [];
  for (const { name, id, cls } of names) {
    const geo = firstGeometry((outputs as Record<string, never>)[name] ?? []);
    if (geo !== undefined) parts.push({ id, cls, geo });
  }
  const bodies = new Map<string, Geometry>();
  for (const { name, out } of bodyNames) {
    const geo = firstGeometry((outputs as Record<string, never>)[out] ?? []);
    if (geo !== undefined) bodies.set(name, geo);
  }
  return { parts, bodies };
}

/** A box's label for a report. */
const label = (b: SBox): string => `${b.run}${b.pile ? ` P${b.pile}` : ""} ${b.list}[${b.index}] (${b.flight})`;
const fmt = (p: Vec3): string => `(${p.map((v) => v.toFixed(3)).join(", ")})`;

/** Whether a swept hit is the one the file exempts: an Otis car on e1's last flight, at the top of its run. */
const exempt = (h: SweepHit, b: SBox): boolean => OTIS.has(h.body) && b.flight === E1_TOP && h.s >= E1_TOP_FROM;

function writeReport(file: string, body: unknown): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/${file}`, typeof body === "string" ? body : JSON.stringify(body, null, 1), "utf8");
}

/** Hits grouped by run, pile, flight and part, for a reader: count, deepest, and the span of their points. */
function groupHits(boxes: SBox[], hits: Hit[]): string {
  const groups = new Map<string, { n: number; tris: number; depth: number; lo: number[]; hi: number[]; worst: string }>();
  for (const h of hits) {
    const b = boxes[h.box]!;
    const k = `${b.run}${b.pile ? ` P${b.pile}` : ""} | ${b.flight} | ${b.list} | ${h.part}`;
    let e = groups.get(k);
    if (e === undefined) {
      e = { n: 0, tris: 0, depth: 0, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity], worst: "" };
      groups.set(k, e);
    }
    e.n++;
    e.tris += h.tris;
    for (let a = 0; a < 3; a++) {
      e.lo[a] = Math.min(e.lo[a]!, h.at[a]!);
      e.hi[a] = Math.max(e.hi[a]!, h.at[a]!);
    }
    if (h.depth > e.depth) {
      e.depth = h.depth;
      e.worst = `${label(b)} at ${fmt(h.at)}`;
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(
      ([k, e]) =>
        `${k}: ${e.n} boxes, ${e.tris} triangles, deepest ${e.depth.toFixed(4)} m (${e.worst}); points span ${fmt(e.lo as unknown as Vec3)} - ${fmt(e.hi as unknown as Vec3)}`,
    )
    .join("\n");
}

describe("Eiffel stairs, clear of the tower", () => {
  let tower: Cooked;
  let boxes: SBox[];
  let grid: BoxGrid;

  beforeAll(async () => {
    boxes = stairBoxes();
    grid = boxGrid(boxes);
    tower = await cookTower();
  }, 600_000);

  it("cooks every part and every swept body the test reads", () => {
    // The pedestal the ground stair starts beside is among the parts.
    expect(tower.parts.some((p) => p.id === "pedestals")).toBe(true);
    // No stair node slipped into the static set, and the stairs are there to test.
    for (const p of tower.parts) expect(p.id.startsWith("liftStair") || p.id.startsWith("liftRails"), p.id).toBe(false);
    expect(boxes.length).toBeGreaterThan(1000);
    expect(boxes.some((b) => b.flight === E1_TOP)).toBe(true);
    // Every car LIFT_CARS publishes is cooked as a mesh.
    for (const run of LIFT_CARS) expect(tower.bodies.has(run.name), run.name).toBe(true);
  });

  it(
    "keeps every stair box out of every other part",
    () => {
      const t0 = performance.now();
      const all: Hit[] = [];
      const perPart: Record<string, number> = {};
      for (const p of tower.parts) {
        const hs = hitsOf(grid, p.id, p.geo);
        perPart[p.id] = hs.length;
        all.push(...hs);
      }
      let triangleCount = 0;
      for (const p of tower.parts) eachTriangle(p.geo, () => void triangleCount++);
      const bad = [...all].sort((a, b) => b.depth - a.depth);
      writeReport(
        "static.txt",
        [
          `stair boxes ${boxes.length}, parts ${tower.parts.length}, triangles ${triangleCount}, ${((performance.now() - t0) / 1000).toFixed(1)} s`,
          `hits: ${bad.length}`,
          "",
          "== grouped ==",
          groupHits(boxes, bad),
          "",
          "== every hit, deepest first ==",
          ...bad.map((h) => `${label(boxes[h.box]!)} x ${h.part}: ${h.tris} tris, depth ${h.depth.toFixed(4)} at ${fmt(h.at)}`),
        ].join("\n"),
      );
      const list = bad
        .slice(0, 30)
        .map((h) => `  ${label(boxes[h.box]!)} x ${h.part}: depth ${h.depth.toFixed(4)} at ${fmt(h.at)}`)
        .join("\n");
      expect(bad.length, `${bad.length} stair boxes meet other parts (deepest first):\n${list}`).toBe(0);
    },
    300_000,
  );

  it("the static comparator can say different: a tread moved into a leg member is reported, and far off it is not", () => {
    const legs = tower.parts.find((p) => p.cls === "legs.girders" || p.cls.startsWith("legs."))!;
    // A triangle of the legs, and a tread centred on its centroid.
    let tri: [Vec3, Vec3, Vec3] | undefined;
    eachTriangle(legs.geo, (a, b, c) => {
      if (tri === undefined && a[1] > 20) tri = [a, b, c];
    });
    const [a, b, c] = tri!;
    const g = mul3(add3(add3(a, b), c), 1 / 3);
    const tread = stairRuns()[0]!.parts.treads[0]!;
    const meta = { run: "ground" as const, pile: 4, list: "treads" as const, index: 0, flight: "control" };
    const inside = boxGrid([sbox({ ...tread, at: g }, 0, meta)]);
    const hits = hitsOf(inside, legs.id, legs.geo);
    expect(hits.length).toBe(1);
    expect(hits[0]!.depth).toBeGreaterThan(0);
    // The same tread 1 km out meets nothing.
    const far = boxGrid([sbox({ ...tread, at: add3(g, [1000, 0, 0]) }, 0, meta)]);
    expect(hitsOf(far, legs.id, legs.geo)).toHaveLength(0);
  });

  it(
    "runs every lift car, and every body that slides with one, its whole run clear of the stairs",
    () => {
      const t0 = performance.now();
      const all: SweepHit[] = [];
      const counts: Record<string, { samples: number; steps: number; seconds: number }> = {};
      for (const m of MOVERS) {
        const geo = tower.bodies.get(m.name);
        if (geo === undefined) continue;
        const t1 = performance.now();
        const samples = surfaceSamples(geo, 0.1);
        all.push(...sweep(grid, m, samples));
        counts[m.name] = {
          samples: samples.length,
          steps: Math.ceil((m.run.to - m.run.from) / 0.25),
          seconds: Math.round((performance.now() - t1) / 100) / 10,
        };
        writeReport("swept.progress.json", counts);
      }
      const line = (h: SweepHit) =>
        `${h.body} x ${label(boxes[h.box]!)}: first at s ${h.s.toFixed(2)}, ${fmt(h.at)}, ${h.samples} sample steps, deepest ${h.depth.toFixed(3)} m`;
      const exempted = all.filter((h) => exempt(h, boxes[h.box]!));
      const bad = all.filter((h) => !exempt(h, boxes[h.box]!));
      const report = bad.map(line);
      writeReport(
        "swept.txt",
        [
          `${((performance.now() - t0) / 1000).toFixed(1)} s`,
          JSON.stringify(counts, null, 1),
          `hits: ${bad.length}`,
          ...report,
          `exempt (the Otis cars on ${E1_TOP} past s ${E1_TOP_FROM}): ${exempted.length}`,
          ...exempted.map(line),
        ].join("\n"),
      );
      // Every leg car and the Edoux were swept.
      for (const run of LIFT_CARS) expect(counts[run.name], run.name).toBeDefined();
      // The exemption is what it says: the Otis legs, piles 1 and 3, only.
      for (const h of exempted) expect([1, 3], label(boxes[h.box]!)).toContain(boxes[h.box]!.pile);
      expect(bad.length, `${bad.length} stair boxes in a lift's path:\n${report.slice(0, 30).join("\n")}`).toBe(0);
    },
    300_000,
  );

  it("the swept comparator can say different: a point in a tread, and a path through one, are reported", () => {
    const b = boxes.find((x) => x.list === "treads")!;
    // A point: the tread's centre.
    expect(segmentHit(grid, b.c, b.c)).toBeGreaterThanOrEqual(0);
    // A path from above the tread to below it, both ends outside every box.
    const up = b.u[1];
    const p = add3(b.c, mul3(up, 0.2));
    const q = add3(b.c, mul3(up, -0.2));
    expect(segmentInBox(b, p, p)).toBe(false);
    expect(segmentInBox(b, q, q)).toBe(false);
    expect(segmentInBox(b, p, q)).toBe(true);
    // And a point 1 km out is in nothing.
    expect(segmentHit(grid, add3(b.c, [1000, 0, 0]), add3(b.c, [1000, 0, 0]))).toBe(-1);
  });
});
