/**
 * The crossing plates on the first floor and over the summit's girders.
 *
 * The legs and the shaft carry a pair of plates at every place two laced
 * struts cross (`demos/eiffel/crossing.ts`; held in
 * `tests/eiffelSkeleton.test.ts`). The first floor's girders between the
 * legs and panel 10's X over them are laced struts too, and so crossed
 * bare; the summit's two diagonal girders cross on the tower's axis under
 * PL-XIV Fig. 5 bis's "2 Goussets 1.130 x 10". This file holds the same
 * rule where it now reaches them.
 *
 * The crossings are derived HERE, from the cooked member axes after the
 * quadrant copy, not taken from the module's own list, and the counts are
 * derived by hand from the girders' layout (see the first test). Every
 * measurement that should read zero is first shown to read non-zero on a
 * deliberately displaced plate, so a comparator that cannot say
 * "different" cannot pass.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry, serializeGraph } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { JITTER } from "../demos/eiffel/parts.js";
import { SWEPT_BOX_POINTS, isSweptBox, sweptBoxCorners } from "./support/sweptBox.js";

type Vec3 = readonly [number, number, number];

/** How far a jittered OUTPUT may sit from where the rule put it (as in eiffelSkeleton.test.ts). */
const SETTLE = (JITTER + 2e-5) * Math.sqrt(3);

/**
 * The rule's numbers, restated rather than imported so a change to the
 * module has to be a change here too: a plate 10 mm thick, set 0.015 under
 * an 800's angles and as wide as its strut, both scaled by w / 0.4; edge
 * rows 0.04 in at 0.1. The summit's gusset is 1.130 x 10 mm [PL-XIV Fig. 5
 * bis], square by inference, set on the girders' plating.
 */
const CROSS = { thick: 0.01, set: 0.015, edge: 0.4, at: 0.4, pitch: 0.1, inset: 0.04 } as const;
const GUSSET = 1.13;
/**
 * The first floor's crossing-plate heads as the rule lays them
 * (`plateHeads`). Panel 10's 600 X crosses at 88.7 degrees: rows 0.520 and
 * 0.320 long, cut to 5 and 3 pitches, 6 + 6 + 4 + 4 = 20 heads a plate,
 * 16 plates.
 */
const WANT_360 = 5568;
const WANT_600 = 320;
/** The first floor's laced sections: the girders' 360s and panel 10's 600s (firstFloor.ts). */
const W = { bars: 0.18, web10: 0.3, cross: 0.2 } as const;

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

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      line.push([P.data[3 * i] as number, P.data[3 * i + 1] as number, P.data[3 * i + 2] as number]);
    }
    out.push(line);
  }
  return out;
}

/** A geometry's primitive face normals (`faceN`, what an edge rule writes). */
function faceNormals(geo: Geometry): Vec3[] {
  const d = geo.attrs.primitive.get("faceN");
  if (d === undefined) throw new Error("no faceN");
  const out: Vec3[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    out.push([d.data[3 * p] as number, d.data[3 * p + 1] as number, d.data[3 * p + 2] as number]);
  }
  return out;
}

/**
 * A flat-bar mesh's boxes, as each box's corner points and their mean. Two
 * layouts reach it, both 24 points. `flatBars` sweeps each member's two
 * ends with a 'rect' section, in the layout tests/support/sweptBox.ts
 * states (its caps' 8 points are the corners, once each). A member's joint
 * plates (strut.ts) copy a unit box: three points at each corner. Either
 * way the corner points weight each corner alike, so their mean is the
 * box's centre.
 */
function flatBoxes(geo: Geometry): Array<{ centre: Vec3; points: Vec3[] }> {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const n = geo.attrs.point.count;
  const at = (k: number): Vec3 => [P.data[3 * k] as number, P.data[3 * k + 1] as number, P.data[3 * k + 2] as number];
  const out: Array<{ centre: Vec3; points: Vec3[] }> = [];
  let i = 0;
  while (i < n) {
    const pts: Vec3[] = [];
    if (isSweptBox(P.data, i, n)) pts.push(...sweptBoxCorners(P.data, i));
    else for (let k = i; k < i + SWEPT_BOX_POINTS && k < n; k++) pts.push(at(k));
    out.push({ centre: mul3(pts.reduce((a, p) => add3(a, p), [0, 0, 0] as Vec3), 1 / pts.length), points: pts });
    i += SWEPT_BOX_POINTS;
  }
  expect(i, "not a whole number of flat-bar boxes").toBe(n);
  return out;
}

/** Instance translations and +y axes of a rivet output. */
function rivetFrames(item: { kind: string } | undefined): Array<{ at: Vec3; axis: Vec3 }> {
  if (item === undefined || item.kind !== "instances") throw new Error("no rivets");
  const out: Array<{ at: Vec3; axis: Vec3 }> = [];
  for (const b of (item as unknown as { batches: { count: number; transforms: Float32Array }[] }).batches) {
    for (let k = 0; k < b.count; k++) {
      const t = b.transforms;
      out.push({
        at: [t[16 * k + 12]!, t[16 * k + 13]!, t[16 * k + 14]!],
        axis: unit3([t[16 * k + 4]!, t[16 * k + 5]!, t[16 * k + 6]!]),
      });
    }
  }
  return out;
}

// ------------------------------------------------ the crossings, re-derived

interface Crossing {
  readonly family: "bars" | "web10" | "cross";
  readonly at: Vec3;
  /** The members' shared plane's unit normal. */
  readonly n: Vec3;
  /** The strut's outer half-width. */
  readonly w: number;
  /** The two members' axes, unit: the struts the plate's edges must run on. */
  readonly arms: readonly [Vec3, Vec3];
}

/**
 * Where two cooked member axes of one set cross, strictly inside both (a
 * millimetre off either end), in one plane. Solved in the plane's own 2D
 * basis with cross products, a different formulation from the module's
 * normal equations.
 */
function crossingsIn(lines: readonly Vec3[][], ns: readonly Vec3[], family: Crossing["family"], w: number): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const n = unit3(ns[i]!);
      if (Math.abs(dot3(n, unit3(ns[j]!))) < 1 - 1e-6) continue;
      const [a, b] = [lines[i]![0]!, lines[i]![lines[i]!.length - 1]!];
      const [c, d] = [lines[j]![0]!, lines[j]![lines[j]!.length - 1]!];
      if (Math.abs(dot3(sub3(c, a), n)) > 1e-4) continue;
      const U = unit3(sub3(b, a));
      const V = cross3(n, U);
      const to2 = (p: Vec3): [number, number] => [dot3(sub3(p, a), U), dot3(sub3(p, a), V)];
      const [p, q] = [to2(a), to2(b)];
      const [r, s] = [to2(c), to2(d)];
      const cr = (x: [number, number], y: [number, number]) => x[0] * y[1] - x[1] * y[0];
      const e: [number, number] = [q[0] - p[0], q[1] - p[1]];
      const f: [number, number] = [s[0] - r[0], s[1] - r[1]];
      const den = cr(e, f);
      if (Math.abs(den) < 1e-9) continue;
      const rp: [number, number] = [r[0] - p[0], r[1] - p[1]];
      const t = cr(rp, f) / den;
      const u = cr(rp, e) / den;
      const le = Math.hypot(...e);
      const lf = Math.hypot(...f);
      if (t * le <= 1e-3 || (1 - t) * le <= 1e-3 || u * lf <= 1e-3 || (1 - u) * lf <= 1e-3) continue;
      out.push({ family, at: add3(a, mul3(U, t * le)), n, w, arms: [U, unit3(sub3(d, c))] });
    }
  }
  return out;
}

/** Which tower face a point is on: 0 +z, 1 +x, 2 -z, 3 -x. */
const faceOf = (p: Vec3): number =>
  Math.abs(p[2]) >= Math.abs(p[0]) ? (p[2] > 0 ? 0 : 2) : p[0] > 0 ? 1 : 3;

// --------------------------------------------------------- the plates, cooked

/** A half-plane `a d + b e <= c` in a plate's (D, B) frame, (a, b) unit: one edge of its outline. */
type Bound = readonly [number, number, number];

/**
 * One plate: the parallelogram `o ± hu u ± hv v` on its mid-plane, `thick`
 * through along its own outward normal. A rectangle is the case `u . v = 0`;
 * an X's plate is a rhombus whose edges run along its two struts.
 */
interface Plate {
  /** Its mid-plane centre and its own outward normal. */
  readonly o: Vec3;
  readonly n: Vec3;
  /** Its corners on the mid-plane, in ring order. */
  readonly corners: readonly Vec3[];
  /** Its two edge directions (unit, in its plane) and half its edge lengths. */
  readonly u: Vec3;
  readonly v: Vec3;
  readonly hu: number;
  readonly hv: number;
  /** An orthonormal frame in its plane (D = u), and its outline as half-planes in that frame. */
  readonly D: Vec3;
  readonly B: Vec3;
  readonly bounds: readonly Bound[];
  /** How far its farthest corner stands from its centre. */
  readonly R: number;
}

/** A plate from its four mid-plane corners, in ring order, and its outward normal. */
function plateOf(corners: readonly Vec3[], n: Vec3): Plate {
  const [c0, c1, , c3] = corners as [Vec3, Vec3, Vec3, Vec3];
  const o = mul3(corners.reduce((a, p) => add3(a, p), [0, 0, 0] as Vec3), 1 / corners.length);
  const u = unit3(sub3(c1, c0));
  const v = unit3(sub3(c3, c0));
  const hu = len3(sub3(c1, c0)) / 2;
  const hv = len3(sub3(c3, c0)) / 2;
  const D = u;
  const B = cross3(n, D);
  // Each edge pair's in-plane normal and how far it stands from the centre.
  const bounds: Bound[] = [];
  for (const [dir, other, h] of [
    [u, v, hv],
    [v, u, hu],
  ] as const) {
    const m = unit3(cross3(n, dir));
    const a = dot3(m, D);
    const b = dot3(m, B);
    const c = h * Math.abs(dot3(other, m));
    bounds.push([a, b, c], [-a, -b, c]);
  }
  return { o, n, corners, u, v, hu, hv, D, B, bounds, R: Math.max(...corners.map((p) => len3(sub3(p, o)))) };
}

/**
 * The plates an outline set describes (`outlinePlates` in strut.ts): each
 * closed four-point polyline is a plate's INNER face, wound counter-
 * clockwise about its outward normal, so its Newell normal IS that normal
 * and the mid-plane is half the thickness out along it.
 */
function platesFrom(geo: Geometry): Plate[] {
  return polylines(geo).map((l) => {
    const ring = l.length === 5 && len3(sub3(l[0]!, l[4]!)) < 1e-9 ? l.slice(0, 4) : l;
    expect(ring, "a crossing plate's outline is four corners").toHaveLength(4);
    let N: Vec3 = [0, 0, 0];
    for (let i = 0; i < 4; i++) N = add3(N, cross3(ring[i]!, ring[(i + 1) % 4]!));
    const n = unit3(N);
    // A parallelogram, and flat.
    expect(len3(sub3(add3(ring[0]!, ring[2]!), add3(ring[1]!, ring[3]!)))).toBeLessThan(5e-5);
    for (const p of ring) expect(Math.abs(dot3(sub3(p, ring[0]!), n))).toBeLessThan(5e-5);
    return plateOf(
      ring.map((p) => add3(p, mul3(n, CROSS.thick / 2))),
      n,
    );
  });
}

/** Whether (d, e) in a plate's frame is inside its outline, with `slack` to spare. */
const insideBounds = (bounds: readonly Bound[], d: number, e: number, slack = 0) =>
  bounds.every(([a, b, c]) => a * d + b * e <= c + slack);

/** A plate's eight corners: its mid-plane outline half the thickness either side. */
const solidCorners = (p: Plate): Vec3[] =>
  [-1, 1].flatMap((s) => p.corners.map((c) => add3(c, mul3(p.n, (s * CROSS.thick) / 2))));

/** A geometry's points in a hash of 1 cm cells, for "is there a point within r of here". */
function pointHash(pts: Float64Array | Float32Array): (q: Vec3) => number {
  const cell = 0.01;
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const map = new Map<string, number[]>();
  for (let i = 0; i < pts.length; i += 3) {
    const k = key(Math.floor(pts[i]! / cell), Math.floor(pts[i + 1]! / cell), Math.floor(pts[i + 2]! / cell));
    const list = map.get(k);
    if (list === undefined) map.set(k, [i]);
    else list.push(i);
  }
  return (q) => {
    const [x, y, z] = q.map((t) => Math.floor(t / cell)) as [number, number, number];
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of map.get(key(x + dx, y + dy, z + dz)) ?? []) {
            best = Math.min(best, Math.hypot(pts[i]! - q[0], pts[i + 1]! - q[1], pts[i + 2]! - q[2]));
          }
        }
      }
    }
    return best;
  };
}

/**
 * The SOLID the outlines extrude to (`extrudePolygon`, the node with the
 * set's own id): every one of its points is a corner of one of the plates,
 * and every corner of every plate is one of its points — each outline
 * swept `thick` along its own outward normal, nothing more and nothing
 * missing. Returns the worst miss either way.
 */
function solidMiss(geo: Geometry, plates: readonly Plate[]): number {
  const corners = plates.flatMap(solidCorners);
  const cornerAt = pointHash(Float64Array.from(corners.flat()));
  const P = geo.attrs.point.get("P")!.data;
  const solidAt = pointHash(P as Float32Array);
  let worst = 0;
  for (let i = 0; i < P.length; i += 3) worst = Math.max(worst, cornerAt([P[i]!, P[i + 1]!, P[i + 2]!]));
  for (const c of corners) worst = Math.max(worst, solidAt(c));
  return worst;
}

/**
 * THE RULE FOR AN X: the plate's edges run along its two struts, each edge
 * on a strut's side, `w` from the crossing measured square to it. Returns
 * the worst |u x arm| over the pairing of edge directions to struts that
 * fits best, and the worst |distance - w| over the four edges.
 */
function onStruts(q: Plate, arms: readonly [Vec3, Vec3], at: Vec3, w: number): { parallel: number; side: number } {
  const par = (a: Vec3, b: Vec3) => len3(cross3(a, b));
  const parallel = Math.min(
    Math.max(par(q.u, arms[0]), par(q.v, arms[1])),
    Math.max(par(q.u, arms[1]), par(q.v, arms[0])),
  );
  // The crossing dropped onto the plate's plane, and each edge's line.
  const c = sub3(at, mul3(q.n, dot3(sub3(at, q.o), q.n)));
  let side = 0;
  for (let i = 0; i < 4; i++) {
    const a = q.corners[i]!;
    const b = q.corners[(i + 1) % 4]!;
    side = Math.max(side, Math.abs(len3(cross3(unit3(sub3(b, a)), sub3(c, a))) - w));
  }
  return { parallel, side };
}

/** A plate turned `by` radians about its own normal through its centre: the control for {@link onStruts}. */
function turned(q: Plate, by: number): Plate {
  const rot = (p: Vec3): Vec3 => {
    const r = sub3(p, q.o);
    return add3(q.o, add3(mul3(r, Math.cos(by)), mul3(cross3(q.n, r), Math.sin(by))));
  };
  return plateOf(q.corners.map(rot), q.n);
}

/** Faces of a skin, indexed by mean height, for clipping to a plate's footprint. */
interface Faces {
  readonly n: number;
  readonly cy: Float64Array;
  readonly fn: Float64Array;
  readonly order: Int32Array;
  readonly start: Int32Array;
  readonly count: Int32Array;
  readonly p: Float64Array;
}

function faceIndex(geo: Geometry): Faces {
  const total = geo.primitiveCount;
  let verts = 0;
  for (let p = 0; p < total; p++) verts += geo.primVertexCount[p] as number;
  const cy = new Float64Array(total);
  const fn = new Float64Array(3 * total);
  const start = new Int32Array(total);
  const count = new Int32Array(total);
  const pts = new Float64Array(3 * verts);
  const P = geo.attrs.point.get("P")!.data;
  let vk = 0;
  for (let p = 0; p < total; p++) {
    const s = geo.primVertexStart[p] as number;
    const c = geo.primVertexCount[p] as number;
    start[p] = vk;
    count[p] = c;
    let ay = 0;
    for (let v = s; v < s + c; v++) {
      const i = geo.vertexToPoint[v] as number;
      pts[3 * vk] = P[3 * i] as number;
      pts[3 * vk + 1] = P[3 * i + 1] as number;
      pts[3 * vk + 2] = P[3 * i + 2] as number;
      ay += P[3 * i + 1] as number;
      vk++;
    }
    cy[p] = ay / c;
    const b = start[p] as number;
    const q = (k: number): Vec3 => [pts[3 * (b + k)]!, pts[3 * (b + k) + 1]!, pts[3 * (b + k) + 2]!];
    const f = unit3(cross3(sub3(q(1), q(0)), sub3(q(2), q(0))));
    fn[3 * p] = f[0];
    fn[3 * p + 1] = f[1];
    fn[3 * p + 2] = f[2];
  }
  const order = Int32Array.from(
    Array.from({ length: total }, (_, i) => i).sort((a, b) => (cy[a] as number) - (cy[b] as number)),
  );
  return { n: total, cy, fn, order, start, count, p: pts };
}

function fromHeight(f: Faces, y: number): number {
  let a = 0;
  let b = f.n;
  while (a < b) {
    const m = (a + b) >> 1;
    if ((f.cy[f.order[m] as number] as number) < y) a = m + 1;
    else b = m;
  }
  return a;
}

/** Clip a convex (d, e) polygon to a plate's outline, its half-planes in turn (Sutherland-Hodgman). */
function clipToFootprint(poly: number[][], bounds: readonly Bound[]): number[][] {
  let out = poly;
  for (const [a, b, c] of bounds) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const q = inp[i]!;
      const r = inp[(i + 1) % inp.length]!;
      const dq = a * q[0]! + b * q[1]! - c;
      const dr = a * r[0]! + b * r[1]! - c;
      if (dq <= 0) out.push(q);
      if (dq * dr < 0) {
        const t = dq / (dq - dr);
        out.push([q[0]! + (r[0]! - q[0]!) * t, q[1]! + (r[1]! - q[1]!) * t]);
      }
    }
    if (out.length === 0) return [];
  }
  return out;
}

/**
 * How far the steel of `f` stands above the plate's INNER face, read over
 * the plate's own footprint: every face turned along the plate's normal,
 * clipped to the footprint and evaluated on its plane at what is left. On
 * the plate's own strut's chords this is its depth under the angles.
 */
function overPlate(f: Faces, p: Plate): number[] {
  const R = p.R + 1.4;
  const out: number[] = [];
  for (let i = fromHeight(f, p.o[1] - R); i < fromHeight(f, p.o[1] + R); i++) {
    const j = f.order[i] as number;
    const F: Vec3 = [f.fn[3 * j]!, f.fn[3 * j + 1]!, f.fn[3 * j + 2]!];
    const Fn = dot3(F, p.n);
    if (Fn < 0.999) continue;
    const poly: number[][] = [];
    let d0 = 0;
    let e0 = 0;
    let h0 = 0;
    const s = f.start[j] as number;
    const n = f.count[j] as number;
    for (let v = 0; v < n; v++) {
      const q: Vec3 = sub3([f.p[3 * (s + v)]!, f.p[3 * (s + v) + 1]!, f.p[3 * (s + v) + 2]!], p.o);
      const d = dot3(q, p.D);
      const e = dot3(q, p.B);
      d0 += d / n;
      e0 += e / n;
      h0 += dot3(q, p.n) / n;
      poly.push([d, e]);
    }
    if (Math.abs(h0) > 0.12) continue;
    const kept = clipToFootprint(poly, p.bounds);
    if (kept.length < 3) continue;
    const ds = kept.map((q) => q[0]!);
    const es = kept.map((q) => q[1]!);
    if (Math.max(...ds) - Math.min(...ds) < 0.02 || Math.max(...es) - Math.min(...es) < 0.02) continue;
    const Fd = dot3(F, p.D);
    const Fe = dot3(F, p.B);
    for (const q of kept) out.push(h0 - (Fd * (q[0]! - d0) + Fe * (q[1]! - e0)) / Fn + CROSS.thick / 2);
  }
  return out;
}

/** The highest any POINT of `geo` reaches above the plate's inner face inside its footprint (-Infinity if none). */
function pointsOverPlate(pts: Float64Array, p: Plate): number {
  let best = -Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    const q = sub3([pts[i]!, pts[i + 1]!, pts[i + 2]!], p.o);
    if (Math.abs(q[1]) > p.R + 0.2) continue;
    const h = dot3(q, p.n);
    if (h > 0.1 || h < -0.25) continue;
    if (!insideBounds(p.bounds, dot3(q, p.D), dot3(q, p.B))) continue;
    best = Math.max(best, h + CROSS.thick / 2);
  }
  return best;
}

const pointsOf = (geo: Geometry): Float64Array => Float64Array.from(geo.attrs.point.get("P")!.data);

/** A plate moved along its own normal: the displaced control every zero check is tried on first. */
const moved = (p: Plate, by: number): Plate => plateOf(p.corners.map((c) => add3(c, mul3(p.n, by))), p.n);

/** The samples a spacing resample lays on a row of length L at the pitch (as eiffelSkeleton.test.ts counts them). */
const heads = (L: number) => {
  const whole = Math.floor(L / CROSS.pitch + 1e-6);
  return whole + 1 + (L - whole * CROSS.pitch > 1e-4 ? 1 : 0);
};

/**
 * The heads the rule lays round one plate: two rows along `u` and two along
 * `v`, each `inset` in from its own edge measured SQUARE to it (so `inset /
 * sin` along the other edge direction, sin the angle between them), the
 * rows along `v` stopping a pitch short of the others. For a rectangle
 * that is `half - inset` and `across - inset - pitch`, as it always was.
 *
 * An X's rhombus (`x`) has rows of any length, and a spacing resample puts
 * a head every pitch from a row's start AND one on its end, so each of its
 * rows is cut to the longest whole number of pitches that fits, centred: k
 * pitches, k + 1 heads.
 */
const plateHeads = (q: Plate, x: boolean) => {
  const sin = len3(cross3(q.u, q.v));
  const t = q.hu - CROSS.inset / sin;
  const b = q.hv - CROSS.inset / sin;
  if (!x) return 2 * heads(2 * t) + 2 * heads(2 * (b - CROSS.pitch));
  const whole = (L: number) => Math.floor(L / CROSS.pitch + 1e-9) + 1;
  return 2 * whole(2 * t) + 2 * whole(2 * (b - CROSS.pitch));
};

/** The closest any two of a set of points stand. */
function closestPair(pts: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) best = Math.min(best, len3(sub3(pts[i]!, pts[j]!)));
  }
  return best;
}

/**
 * How far a point stands off a plate's rivet rows: off its outer face, and
 * outside the outline shrunk `inset` square to each edge (one figure per
 * edge pair, as the rows run along them).
 */
function offRows(q: Plate, at: Vec3): number {
  const v = sub3(at, q.o);
  const d = dot3(v, q.D);
  const e = dot3(v, q.B);
  const out = [0, 2].map((k) => {
    const [a, b, c] = q.bounds[k]!;
    return Math.max(0, Math.abs(a * d + b * e) - (c - CROSS.inset));
  });
  return Math.hypot(dot3(v, q.n) - CROSS.thick / 2, out[0]!, out[1]!);
}

const FF_PROBES = {
  bars: "ffBars4RotDone",
  web10: "ffWeb104RotDone",
  cross: "ffCross4RotDone",
  plates360: "ffCrossPlates3604",
  plates600: "ffCrossPlates6004",
  solid360: "ffCrossPlates360",
  solid600: "ffCrossPlates600",
  chords360: "ffWebChordSkin",
  lace360: "ffWebLaceSkin",
  chords600: "ffPanel10ChordSkin",
  lace600: "ffPanel10LaceSkin",
  gusset: "girderCrossPlates4500Bare",
  gussetSolid: "girderCrossPlates4500",
  cover: "girderCoverLit",
  flange: "girderFlangeLit",
} as const;

type Probed = { outputs: Record<string, unknown>; geo: (k: keyof typeof FF_PROBES) => Geometry };

async function cookProbed(detail: { lacedWeb?: boolean; rivets?: boolean }): Promise<Probed> {
  const g = buildEiffel(1889, detail);
  for (const id of Object.values(FF_PROBES)) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  return {
    outputs: outputs as Record<string, unknown>,
    geo: (k) => {
      const geo = firstGeometry((outputs as Record<string, never>)[`probe:${FF_PROBES[k]}`] ?? []);
      if (geo === undefined) throw new Error(`probe ${FF_PROBES[k]} produced no geometry`);
      return geo;
    },
  };
}

/** The first floor's crossings, re-derived from the cooked member axes. */
function derivedCrossings(p: Probed): Crossing[] {
  const of = (k: "bars" | "web10" | "cross") => crossingsIn(polylines(p.geo(k)), faceNormals(p.geo(k)), k, W[k]);
  return [...of("bars"), ...of("web10"), ...of("cross")];
}

let laced: Promise<Probed> | undefined;
const lacedProbe = () => (laced ??= cookProbed({ lacedWeb: true }));

describe("eiffel crossing plates: first floor and summit", () => {
  it("builds nothing new at the plain depth", async () => {
    const g = buildEiffel();
    const ids = serializeGraph(g).nodes.map((n) => n.id);
    expect(ids.filter((id) => /^(ffCrossPlates|ffCrossRivets|girderCross)/.test(id))).toEqual([]);
    const { outputs } = await cook(g);
    expect(outputs.gussets).toBeUndefined();
    expect(Object.keys(outputs).filter((k) => k.includes("crossings"))).toEqual([]);
  });

  it("finds 60 laced-strut crossings a face on the first floor, 240 round the tower", async () => {
    const p = await lacedProbe();
    const all = derivedCrossings(p);
    // BY HAND, a face, from the girders' layout (firstFloor.ts `girders`,
    // `secondFloor`): the grande poutre's two diagonal sets cross twice in
    // each of its 4 bays a half and once in the end bay (9), twice (18),
    // plus the X on the axis: 19 a plane. The decorative girder's X per
    // bay: 10 a plane. Both girders stand in two planes; panel 10's X
    // stands in the face plane only, one each side of its post: 2. The
    // entretoises' cross members are parallel pairs: 0.
    // 2 x (19 + 10) + 2 = 60 a face — the backlog's "60" — and x 4.
    const byFamily = (f: Crossing["family"]) => all.filter((c) => c.family === f).length;
    expect(byFamily("cross")).toBe(0);
    expect(byFamily("web10")).toBe(4 * 2);
    expect(byFamily("bars")).toBe(4 * 2 * (19 + 10));
    for (let f = 0; f < 4; f++) expect(all.filter((c) => faceOf(c.at) === f), `face ${f}`).toHaveLength(60);
    // The grande poutre's (panel 5, 50.4-57.4) against the decorative
    // girder's (panel 4, below 50.4).
    expect(all.filter((c) => c.family === "bars" && c.at[1] > 50.4)).toHaveLength(4 * 2 * 19);
    expect(all.filter((c) => c.family === "bars" && c.at[1] < 50.4)).toHaveLength(4 * 2 * 10);
    expect(all).toHaveLength(240);
  });

  it("puts one pair at each crossing, centred on it, square to the members' face, sized by the rule", async () => {
    const p = await lacedProbe();
    const all = derivedCrossings(p);
    const plates360 = platesFrom(p.geo("plates360"));
    const plates600 = platesFrom(p.geo("plates600"));
    expect(plates360).toHaveLength(2 * 232);
    expect(plates600).toHaveLength(2 * 8);
    const plates = [...plates360, ...plates600];
    const taken = new Set<number>();
    /** The plate nearest where the rule puts the pair's `side` plate of crossing c, and how far off. */
    const nearest = (c: Crossing, side: number) => {
      const set = (CROSS.set * c.w) / CROSS.at;
      const want = add3(c.at, mul3(c.n, side * (c.w - set + CROSS.thick / 2)));
      let best = Infinity;
      let bi = -1;
      plates.forEach((q, i) => {
        const d = len3(sub3(q.o, want));
        if (d < best) {
          best = d;
          bi = i;
        }
      });
      return { best, bi };
    };
    // The matcher can say "no": a crossing a millimetre off finds nothing.
    const c0 = all[0]!;
    expect(nearest({ ...c0, at: add3(c0.at, [1e-3, 0, 0]) }, 1).best).toBeGreaterThan(1e-4);
    // And the strut rule can: the first plate turned a milliradian about
    // its own normal is off both struts' axes by that much, and slid a
    // millimetre in its plane its edges are off the struts' sides by that.
    {
      const q = plates[nearest(c0, 1).bi]!;
      expect(onStruts(turned(q, 1e-3), c0.arms, c0.at, c0.w).parallel).toBeGreaterThan(9e-4);
      const slid = plateOf(q.corners.map((c) => add3(c, mul3(q.B, 1e-3))), q.n);
      expect(onStruts(slid, c0.arms, c0.at, c0.w).side).toBeGreaterThan(9e-4);
    }
    let worstCentre = 0;
    let worstNormal = 0;
    let worstParallel = 0;
    let worstSide = 0;
    for (const c of all) {
      for (const side of [1, -1]) {
        const { best, bi } = nearest(c, side);
        expect(best, `plate at y=${c.at[1].toFixed(3)}`).toBeLessThan(1e-4);
        taken.add(bi);
        const q = plates[bi]!;
        // CENTRED: the plate's centre, dropped onto the members' plane, is the crossing.
        const off = sub3(q.o, c.at);
        worstCentre = Math.max(worstCentre, len3(sub3(off, mul3(c.n, dot3(off, c.n)))));
        // SQUARE TO THE FACE, with its own outward normal (the pair cannot share one).
        worstNormal = Math.max(worstNormal, 1 - dot3(q.n, mul3(c.n, side)));
        expect(Math.abs(dot3(q.u, c.n))).toBeLessThan(5e-5);
        expect(Math.abs(dot3(q.v, c.n))).toBeLessThan(5e-5);
        // ALONG ITS STRUTS: each edge parallel to one of the two members'
        // cooked axes and on that strut's side, `w` from the crossing
        // square to it at the default edge — the rhombus the two struts
        // overlap in, edges `w / sin` long (`hu = hv`).
        const on = onStruts(q, c.arms, c.at, c.w);
        worstParallel = Math.max(worstParallel, on.parallel);
        worstSide = Math.max(worstSide, on.side);
        expect(q.hu).toBeCloseTo(q.hv, 4);
        expect(q.hu).toBeCloseTo(c.w / len3(cross3(c.arms[0], c.arms[1])), 4);
      }
    }
    expect(taken.size).toBe(plates.length);
    expect(worstCentre).toBeLessThan(1e-4);
    expect(worstNormal).toBeLessThan(1e-9);
    // MEASURED: 6.9 microradians and 3.4 microns at worst, the f32 the
    // cooked axes and outlines are stored in at 57 m.
    expect(worstParallel, "an edge off its strut's axis").toBeLessThan(2e-5);
    expect(worstSide, "an edge off its strut's side").toBeLessThan(1e-5);

    // The solids the outlines extrude to, and IN the gussets class.
    const gussets = pointHash(firstGeometry(p.outputs.gussets as never)!.attrs.point.get("P")!.data as Float32Array);
    for (const [solid, list] of [
      ["solid360", plates360],
      ["solid600", plates600],
    ] as const) {
      expect(solidMiss(p.geo(solid), list), solid).toBeLessThan(5e-5);
      // The control: the same plates 1 mm out miss by 1 mm.
      expect(solidMiss(p.geo(solid), list.map((q) => moved(q, 0.001))), solid).toBeGreaterThan(9e-4);
      for (const q of list) for (const c of solidCorners(q)) expect(gussets(c), solid).toBeLessThan(SETTLE);
    }
  });

  it("sets every first-floor plate under its struts' angles and outside their lacing", async () => {
    const p = await lacedProbe();
    const sets = [
      { plates: platesFrom(p.geo("plates360")), chords: faceIndex(p.geo("chords360")), lace: p.geo("lace360"), w: W.bars },
      { plates: platesFrom(p.geo("plates600")), chords: faceIndex(p.geo("chords600")), lace: p.geo("lace600"), w: W.web10 },
    ];
    const report: Record<string, { depth: [number, number]; clear: number }> = {};
    for (const s of sets) {
      const set = (CROSS.set * s.w) / CROSS.at;
      const lacePts = pointsOf(s.lace);
      const laceFaces = faceIndex(s.lace);
      // The controls first: 5 mm out, the depth reads 5 mm off; 25 mm in,
      // the lacing comes through.
      const q0 = s.plates[0]!;
      const out5 = overPlate(s.chords, moved(q0, 0.005));
      expect(out5.length).toBeGreaterThan(0);
      expect(Math.min(...out5.map((h) => Math.abs(h - set)))).toBeGreaterThan(0.004);
      expect(
        Math.max(pointsOverPlate(lacePts, moved(q0, -0.025)), ...overPlate(laceFaces, moved(q0, -0.025))),
      ).toBeGreaterThan(0);
      let lo = Infinity;
      let hi = -Infinity;
      let clear = Infinity;
      for (const q of s.plates) {
        // ON THE STEEL: the strut's corner angles stand over the plate's
        // footprint, their outer faces `set` above its inner face, read at
        // every corner of every clipped face — not floating off the chords.
        const hits = overPlate(s.chords, q);
        expect(hits.length, `no steel over the plate at y=${q.o[1].toFixed(3)}`).toBeGreaterThan(0);
        for (const h of hits) {
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        // OUTSIDE THE LACING, read on its mitred vertices and its faces.
        const top = Math.max(pointsOverPlate(lacePts, q), ...overPlate(laceFaces, q));
        expect(Number.isFinite(top), `no lacing under the plate at y=${q.o[1].toFixed(3)}`).toBe(true);
        clear = Math.min(clear, -top);
      }
      expect(Math.abs(lo - set), `depth under the angles (${s.w})`).toBeLessThan(1e-4);
      expect(Math.abs(hi - set), `depth under the angles (${s.w})`).toBeLessThan(1e-4);
      expect(clear, `lacing clearance (${s.w})`).toBeGreaterThan(0.001);
      report[String(s.w)] = { depth: [lo, hi], clear };
    }
    // MEASURED: the 360s' plates 6.74-6.76 mm under the angles, the 600s'
    // 11.25 (the rule's 0.015 scaled by w / 0.4), to f32; the lacing's
    // highest point under any of them 6.43 and 1.93 mm below the plate's
    // inner face — the 600s' close to the legs' tightest clean plate
    // (1.57 mm), and none through.
    expect(1000 * report["0.18"]!.clear).toBeCloseTo(6.43, 1);
    expect(1000 * report["0.3"]!.clear).toBeCloseTo(1.93, 1);
  });

  it("lays the summit's two gussets on the girders' crossing: 1.130 square, flush on the plating", async () => {
    const p = await lacedProbe();
    const plates = platesFrom(p.geo("gusset"));
    expect(plates).toHaveLength(2);
    const covers = flatBoxes(p.geo("cover")).flatMap((b) => b.points);
    const flanges = flatBoxes(p.geo("flange")).flatMap((b) => b.points);
    const coverTop = Math.max(...covers.map((q) => q[1]));
    const flangeFoot = Math.min(...flanges.map((q) => q[1]));
    const [top, bottom] = [...plates].sort((a, b) => b.o[1] - a.o[1]) as [Plate, Plate];
    // The continuous (N-S) girder's axis, and across it in plan.
    const girder: Vec3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    const athwart: Vec3 = [Math.SQRT1_2, 0, Math.SQRT1_2];
    for (const q of plates) {
      // On the tower's axis, where the girders cross; flat; a SQUARE (the
      // summit's crossing has no struts of its own to run along, so it
      // keeps the rectangle), one edge pair along the continuous girder.
      expect(Math.hypot(q.o[0], q.o[2])).toBeLessThan(1e-4);
      expect(Math.abs(q.n[1])).toBeCloseTo(1, 9);
      expect(Math.abs(dot3(q.u, q.v))).toBeLessThan(1e-6);
      expect(Math.max(Math.abs(dot3(q.u, girder)), Math.abs(dot3(q.v, girder)))).toBeCloseTo(1, 6);
      expect(q.hu).toBeCloseTo(GUSSET / 2, 5);
      expect(q.hv).toBeCloseTo(GUSSET / 2, 5);
    }
    expect(top.n[1]).toBeGreaterThan(0);
    expect(bottom.n[1]).toBeLessThan(0);
    // FLUSH: the top one's inner face on the cover plating's top, the
    // bottom one's on the flanges' underside. The control: 2 mm off reads 2 mm.
    const inner = (q: Plate) => q.o[1] - (q.n[1] * CROSS.thick) / 2;
    const gapTop = inner(top) - coverTop;
    const gapBottom = flangeFoot - inner(bottom);
    expect(Math.abs(inner(moved(top, 0.002)) - coverTop)).toBeGreaterThan(0.0019);
    expect(Math.abs(gapTop)).toBeLessThan(1e-4);
    expect(Math.abs(gapBottom)).toBeLessThan(1e-4);
    // The solids: those squares 10 mm through, and in the gussets class.
    expect(solidMiss(p.geo("gussetSolid"), plates)).toBeLessThan(1e-4);
    expect(solidMiss(p.geo("gussetSolid"), plates.map((q) => moved(q, 0.001)))).toBeGreaterThan(9e-4);
    const gussets = pointHash(firstGeometry(p.outputs.gussets as never)!.attrs.point.get("P")!.data as Float32Array);
    for (const q of plates) for (const c of solidCorners(q)) expect(gussets(c)).toBeLessThan(SETTLE);
    // All of the top one's footprint is over the cover, which is the
    // continuous girder's, 1.130 broad and running through the crossing.
    const coverBoxes = flatBoxes(p.geo("cover"));
    const under = coverBoxes.filter((b) => {
      const v = sub3(b.centre, top.o);
      return Math.abs(dot3(v, athwart)) < 1e-3 && Math.abs(v[1]) < 0.05;
    });
    expect(under.length).toBeGreaterThan(0);
    const reach = Math.max(
      ...under.flatMap((b) => b.points.map((r) => Math.abs(dot3(sub3(r, top.o), girder)))),
    );
    expect(reach).toBeGreaterThan(GUSSET / 2);
  });

  it("rivets every new plate round its own edges: on the outer face, inside the outline, pointing out", async () => {
    const p = await cookProbed({ rivets: true });
    const sets = [
      ["rivets.ff.crossings.360", platesFrom(p.geo("plates360")), WANT_360, true],
      ["rivets.ff.crossings.600", platesFrom(p.geo("plates600")), WANT_600, true],
      ["rivets.summit.crossings", platesFrom(p.geo("gusset")), 88, false],
    ] as const;
    let total = 0;
    let closestX = Infinity;
    for (const [name, plates, want, x] of sets) {
      // Four rows round the edge, each `inset` in from its own edge square
      // to it, the end rows stopping a pitch clear of the long ones: what
      // that lays on each plate, from the plate's own outline.
      expect(plates.reduce((n, q) => n + plateHeads(q, x), 0), name).toBe(want);
      const frames = rivetFrames((p.outputs[name] as Array<{ kind: string }> | undefined)?.[0]);
      expect(frames, name).toHaveLength(want);
      total += frames.length;
      const count = new Map<number, Vec3[]>();
      for (const { at, axis } of frames) {
        let best = Infinity;
        let bi = -1;
        plates.forEach((q, i) => {
          const d = offRows(q, at);
          if (d < best) [best, bi] = [d, i];
        });
        expect(best, name).toBeLessThan(SETTLE);
        expect(dot3(axis, plates[bi]!.n), name).toBeCloseTo(1, 5);
        count.set(bi, [...(count.get(bi) ?? []), at]);
      }
      expect(count.size, name).toBe(plates.length);
      // Each plate carries exactly its own rows' heads, no more and no fewer.
      plates.forEach((q, i) => {
        const own = count.get(i)!;
        expect(own, `${name} at y=${q.o[1].toFixed(3)}`).toHaveLength(plateHeads(q, x));
        if (x) closestX = Math.min(closestX, closestPair(own));
      });
    }
    expect(total).toBe(WANT_360 + WANT_600 + 88);
    // NO TWO HEADS ON AN X's PLATE CLOSER THAN 45 mm: each rhombus row is
    // cut to whole pitches (above), so no short last step puts two 38 mm
    // heads on each other. The control: a head added 30 mm from another
    // reads 30 mm.
    expect(closestPair([[0, 0, 0], [1, 0, 0], [0.03, 0, 0]])).toBeCloseTo(0.03, 9);
    expect(closestX, "the closest heads on a first-floor X plate").toBeGreaterThan(0.045);

    // AND NO LACING HEAD UNDER A PLATE. The plate is set under the angles'
    // outer face, so a lacing rivet on the face it covers would stand in
    // it: the struts are told the footprints (`WebOpts.covers`) and drop
    // those heads. Read on every head turned along a plate's normal and
    // within 30 mm of its plane, inside its outline. The control: the same
    // footprints slid 0.6 m along one of their struts catch plenty.
    for (const [name, plates] of [
      ["rivets.ff.girders.web", platesFrom(p.geo("plates360"))],
      ["rivets.ff.second.web", platesFrom(p.geo("plates600"))],
    ] as const) {
      const frames = rivetFrames((p.outputs[name] as Array<{ kind: string }> | undefined)?.[0]);
      const inside = (list: readonly Plate[]) =>
        frames.filter(({ at, axis }) =>
          list.some((q) => {
            const v = sub3(at, q.o);
            return (
              dot3(axis, q.n) > 0.99 &&
              Math.abs(dot3(v, q.n)) < 0.03 &&
              insideBounds(q.bounds, dot3(v, q.D), dot3(v, q.B))
            );
          }),
        ).length;
      const slid = plates.map((q) => plateOf(q.corners.map((c) => add3(c, mul3(q.u, 0.6))), q.n));
      expect(inside(slid), name).toBeGreaterThan(0);
      expect(inside(plates), name).toBe(0);
    }
  });
});
