/**
 * THE CENSUS: what of the rest of the tower touches the lower uprights,
 * measured against the uprights AS BUILT rather than against whatever box
 * the model draws. Used by tests/eiffelBuiltup.test.ts.
 *
 * The box is modelled HERE, from the node table and the section table's
 * printed constants alone, and not read from demos/eiffel/builtup.ts: the
 * census was run on the tower from before the built-up section existed
 * (when nothing of it was in the tree), so that it could be seen to report
 * "different" before it was trusted to report "fixed". Keep it independent.
 *
 * The box [sourced PL-XXXI text]: a constant 0.877 m square IN PLAN from the
 * supports to XVII, its faces in the tower's face planes, thicker plates
 * growing inward. Every lower upright is straight within a panel, so at a
 * point's own height its axis is `profileAt(y)` and "inside the box" is
 * simply |dx|, |dz| < 0.4385 from it. What stands OUT of the webs, at the
 * laced depth and up (section table, §1a-1b and §2b):
 *   - panels 1-5 (the base stretch too), montant-EXTERIOR faces: a C.J.
 *     205 x 12 on the face centre line, two angles 100 x 100 x 12 back to
 *     back on it, their flat legs 200 wide over it and their outstanding
 *     legs a fin 24 thick standing 100 proud of the C.J.;
 *   - panels 1-5, montant-INTERIOR faces: a C.J. 200 x 12, and two angles
 *     with their heels 385 apart, flat legs on the web turned out, the
 *     outstanding legs 100 proud of the web (PL-IX: 207.5 | 385 | 207.5);
 *   - panels 6-11: one C.J. 200 wide, as thick as the table says, on every
 *     face.
 */
import { type Geometry, firstGeometry } from "pcg-ts";
import { NODES, profileAt } from "../../demos/eiffel/spec.js";

export type Vec3 = readonly [number, number, number];

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sc = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit = (p: Vec3): Vec3 => sc(p, 1 / len(p));
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const proj = (v: Vec3, T: Vec3): Vec3 => sub(v, sc(T, dot(v, T)));

/** Half the plan square [sourced: "877 mm mesurés extérieurement"]. */
export const H = 0.4385;
/** The lower box's top: node XVII. */
const TOP = NODES.find((n) => n.name === "XVII")!.y;
const BOTTOM = NODES[0]!.y;

/** The leg's four uprights in the +x+z quadrant, as (x, z) picks. */
export const MEMBERS4 = [
  ["c", "outer", "outer"],
  ["b", "inner", "outer"],
  ["a", "inner", "inner"],
  ["d", "outer", "inner"],
] as const;
export type Name = (typeof MEMBERS4)[number][0];

/** Each member's two montant-interior faces, as plan directions [sourced PL-XXXI key]. */
const INTERIOR: Record<Name, ReadonlyArray<readonly [number, number]>> = {
  c: [[-1, 0], [0, -1]],
  b: [[1, 0], [0, -1]],
  a: [[1, 0], [0, 1]],
  d: [[0, 1], [-1, 0]],
};

/**
 * The C.J. thickness in panels 6-11 (sections XXIII-XVIII), mm, by member,
 * exterior / interior [sourced PL-XXXI, section-table §1b]. XVIII c alone
 * differs by face.
 */
const CJ_UPPER: Record<Name, ReadonlyArray<readonly [number, number]>> = {
  a: [[10, 10], [10, 10], [10, 10], [10, 10], [10, 10], [8, 8]],
  b: [[14, 14], [14, 14], [12, 12], [11, 11], [11, 11], [11, 11]],
  d: [[14, 14], [14, 14], [12, 12], [11, 11], [11, 11], [11, 11]],
  c: [[14, 14], [14, 14], [12, 12], [12, 12], [13, 13], [12, 8]],
};

/** A protruding piece in a face's own (s across, o out of the web) coordinates. */
export interface Piece {
  readonly what: "cj" | "finFlat" | "fin" | "channelFlat" | "channelLeg";
  readonly s0: number;
  readonly s1: number;
  readonly o0: number;
  readonly o1: number;
}

/** The pieces standing out of one face of `member` in panel segment k (0 = supports-XXVIII). */
export function facePieces(member: Name, k: number, d: readonly [number, number]): Piece[] {
  const interior = INTERIOR[member].some(([x, z]) => x === d[0] && z === d[1]);
  if (k <= 5) {
    if (!interior) {
      return [
        { what: "cj", s0: -0.1025, s1: 0.1025, o0: 0, o1: 0.012 },
        { what: "finFlat", s0: -0.1, s1: 0.1, o0: 0.012, o1: 0.024 },
        { what: "fin", s0: -0.012, s1: 0.012, o0: 0.024, o1: 0.112 },
      ];
    }
    return [
      { what: "cj", s0: -0.1, s1: 0.1, o0: 0, o1: 0.012 },
      ...[-1, 1].flatMap((g): Piece[] => [
        { what: "channelFlat", s0: g > 0 ? 0.1925 : -0.2925, s1: g > 0 ? 0.2925 : -0.1925, o0: 0, o1: 0.012 },
        { what: "channelLeg", s0: g > 0 ? 0.1925 : -0.2045, s1: g > 0 ? 0.2045 : -0.1925, o0: 0.012, o1: 0.1 },
      ]),
    ];
  }
  const t = CJ_UPPER[member]![k - 6]![interior ? 1 : 0]! / 1000;
  return [{ what: "cj", s0: -0.1, s1: 0.1, o0: 0, o1: t }];
}

/** The panel segment holding height y: NODES[k] to NODES[k + 1], k <= 11. */
function segmentAt(y: number): number {
  let k = 0;
  while (k < 11 && NODES[k + 1]!.y <= y) k++;
  return k;
}

/** A face's frame on a panel segment: its centre-line offset, across (e) and out (n). */
export function faceFrame(
  member: Name,
  k: number,
  d: readonly [number, number],
): { T: Vec3; A: Vec3; Q: Vec3; mid: Vec3; e: Vec3; n: Vec3 } {
  const m = MEMBERS4.find((x) => x[0] === member)!;
  const p = NODES[k]!;
  const q = NODES[k + 1]!;
  const A: Vec3 = [p[m[1]], p.y, p[m[2]]];
  const Q: Vec3 = [q[m[1]], q.y, q[m[2]]];
  const T = unit(sub(Q, A));
  const dv: Vec3 = [d[0], 0, d[1]];
  const h: Vec3 = [Math.abs(d[1]), 0, Math.abs(d[0])];
  const mid = proj(sc(dv, H), T);
  const e = unit(proj(h, T));
  let n = unit(cross(T, e));
  if (dot(n, dv) < 0) n = sc(n, -1);
  return { T, A, Q, mid, e, n };
}

/** Where a point stands against one upright: plan depth into the box, and the face it is nearest. */
interface Where {
  readonly member: Name;
  readonly depth: number;
  readonly d: readonly [number, number];
  readonly k: number;
}

/** The upright (of the +x+z leg) a point is near, within `reach` of its plan box; undefined if none. */
export function near(p: Vec3, reach = 0.25): Where | undefined {
  if (p[1] < BOTTOM || p[1] > TOP || p[0] <= 0 || p[2] <= 0) return undefined;
  const pr = profileAt(p[1]);
  let best: Where | undefined;
  for (const [name, xs, zs] of MEMBERS4) {
    const dx = p[0] - pr[xs];
    const dz = p[2] - pr[zs];
    const m = Math.max(Math.abs(dx), Math.abs(dz));
    if (m > H + reach) continue;
    const depth = H - m;
    if (best !== undefined && best.depth >= depth) continue;
    const d: [number, number] = Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
    best = { member: name, depth, d, k: segmentAt(p[1]) };
  }
  return best;
}

/** A point in a face's (s, o) coordinates, o out of the web's outer surface. */
function faceLocal(p: Vec3, w: Where): { s: number; o: number } {
  const f = faceFrame(w.member, w.k, w.d);
  const t = (p[1] - f.A[1]) / (f.Q[1] - f.A[1]);
  const X = add(f.A, sc(sub(f.Q, f.A), t));
  const v = sub(sub(p, X), f.mid);
  return { s: dot(v, f.e), o: dot(v, f.n) };
}

/** The protruding piece a point stands in, by more than `margin`, if any. */
export function inPiece(p: Vec3, w: Where, margin = 0.001): Piece | undefined {
  if (w.depth > -margin) return undefined;
  const { s, o } = faceLocal(p, w);
  return facePieces(w.member, w.k, w.d).find(
    (q) => s > q.s0 + margin && s < q.s1 - margin && o > q.o0 + margin && o < q.o1 - margin,
  );
}

/** Rivet bases of an instances output. */
export function rivetBases(item: unknown): Vec3[] {
  const it = item as { kind: string; batches: { count: number; transforms: Float32Array }[] };
  if (it?.kind !== "instances") return [];
  const out: Vec3[] = [];
  for (const b of it.batches)
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      out.push([m[12]!, m[13]!, m[14]!]);
    }
  return out;
}

/** A thin box of a box-mesh class: centre, three unit axes, half-extents (t the thinnest). */
export interface Slab {
  readonly c: Vec3;
  readonly axes: readonly [Vec3, Vec3, Vec3];
  readonly half: readonly [number, number, number];
}

/** Every box of a box-mesh geometry (24- or 8-point runs); a run that is not a box is skipped. */
export function slabs(geo: Geometry): Slab[] {
  const P = geo.attrs.point.get("P")!.data;
  const n = geo.attrs.point.count;
  const run = n % 24 === 0 ? 24 : 8;
  const out: Slab[] = [];
  for (let i = 0; i + run <= n; i += run) {
    const pts: Vec3[] = [];
    for (let k = i; k < i + run; k++) {
      const q: Vec3 = [P[3 * k]!, P[3 * k + 1]!, P[3 * k + 2]!];
      if (!pts.some((r) => len(sub(q, r)) < 1e-5)) pts.push(q);
    }
    if (pts.length !== 8) continue;
    const c = pts.reduce<Vec3>((a, q) => [a[0] + q[0] / 8, a[1] + q[1] / 8, a[2] + q[2] / 8], [0, 0, 0]);
    // A box's three edges from a corner are the offsets to the other
    // corners that are not the sum of two others. (Taking the shortest
    // roughly-square ones instead can take a long edge PLUS the thickness
    // for the long edge, all but parallel to it: on a 10 m plate 10 mm
    // thick that tilted the axis enough to misplace a far corner by 5 mm.)
    const p0 = pts[0]!;
    const vs = pts.slice(1).map((q) => sub(q, p0));
    const e = vs
      .filter((v) => !vs.some((a) => vs.some((b) => a !== b && len(sub(add(a, b), v)) < 1e-4)))
      .sort((x, y) => len(x) - len(y));
    if (e.length !== 3) continue;
    // The thinnest edge's DIRECTION is the least certain: f32 coordinates
    // at 45 m are 4 um apart, which on a 16 mm edge tilts it 0.24 mrad, 1.6
    // mm at a 6.6 m plate's end. Its normal is taken from the two long
    // edges instead (as tests/eiffelRivetClash.test.ts does).
    const n = unit(cross(e[1]!, e[2]!));
    out.push({ c, axes: [n, unit(e[1]!), unit(e[2]!)], half: [Math.abs(dot(e[0]!, n)) / 2, len(e[1]!) / 2, len(e[2]!) / 2] });
  }
  return out;
}

/** 2-D convex hull (monotone chain). */
function hull(pts: Array<readonly [number, number]>): Array<readonly [number, number]> {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<readonly [number, number]> = [];
  for (const q of p) {
    while (lower.length >= 2 && x(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Array<readonly [number, number]> = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && x(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * How deep a slab and a protruding piece interpenetrate, if they do: the
 * slab's corners taken into the face's (s, o) plane (a piece is a prism
 * along the upright's axis, so only its section matters), a separating-
 * axis test between that outline and the piece's rectangle, and the least
 * overlap over the axes. The slab must also reach the segment along T.
 */
function slabInPiece(
  sl: Slab,
  member: Name,
  k: number,
  d: readonly [number, number],
  q: Piece,
): { overlap: number; through: number } {
  const f = faceFrame(member, k, d);
  const corners: Vec3[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
    corners.push(add(sl.c, add(sc(sl.axes[0], a * sl.half[0]), add(sc(sl.axes[1], b * sl.half[1]), sc(sl.axes[2], c * sl.half[2])))));
  }
  // Along the axis: the slab must overlap the segment.
  const along = corners.map((p) => dot(sub(p, f.A), f.T));
  const L = len(sub(f.Q, f.A));
  if (Math.max(...along) < 0 || Math.min(...along) > L) return { overlap: 0, through: 0 };
  const pts2 = corners.map((p): readonly [number, number] => {
    const t = dot(sub(p, f.A), f.T);
    const v = sub(sub(p, add(f.A, sc(f.T, t))), f.mid);
    return [dot(v, f.e), dot(v, f.n)];
  });
  const poly = hull(pts2);
  const rect: Array<readonly [number, number]> = [
    [q.s0, q.o0],
    [q.s1, q.o0],
    [q.s1, q.o1],
    [q.s0, q.o1],
  ];
  const axes: Array<readonly [number, number]> = [
    [1, 0],
    [0, 1],
  ];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const l = Math.hypot(ex, ey);
    if (l > 1e-9) axes.push([-ey / l, ex / l]);
  }
  let least = Infinity;
  for (const ax of axes) {
    const pa = poly.map((p) => p[0] * ax[0] + p[1] * ax[1]);
    const ra = rect.map((p) => p[0] * ax[0] + p[1] * ax[1]);
    const ov = Math.min(Math.max(...pa), Math.max(...ra)) - Math.max(Math.min(...pa), Math.min(...ra));
    if (ov <= 0) return { overlap: 0, through: 0 };
    least = Math.min(least, ov);
  }
  // How far the piece stands out past the slab's outermost point: through it.
  return { overlap: least, through: q.o1 - Math.max(...poly.map((p) => p[1])) };
}

/** The census's result: counts by what and by kind of contact. */
export interface Census {
  /** Rivet heads (not the uprights' own seams) whose base is inside the box by more than 2 mm, by output. */
  readonly buriedHeads: Record<string, number>;
  /** Rivet heads whose base stands in a protruding piece, by output. */
  readonly headsInPieces: Record<string, number>;
  /** Mesh vertices inside the box by more than 2 mm, by class. */
  readonly swallowed: Record<string, number>;
  /** Mesh vertices standing in a protruding piece, by class. */
  readonly vertsInPieces: Record<string, number>;
  /** Plates of the `gussets` class interpenetrating a protruding piece by more than 1 mm, by piece. */
  readonly platesInPieces: Record<string, number>;
  /** The deepest such interpenetration, by piece (m). */
  readonly platesDeepest: Record<string, number>;
  /** Of those, the plates a piece stands right through (out past the plate's outer face), by piece. */
  readonly platesPierced: Record<string, number>;
  /** How far past a plate's outer face a piece stands at most, by piece (m). */
  readonly pierceDeepest: Record<string, number>;
  /** The nearest mesh vertex OUTSIDE the box, by class and panel segment: the gap to the web (m). */
  readonly gap: Record<string, number>;
}

/**
 * Take the census of a cooked riveted tower's outputs, over the +x+z leg's
 * lower uprights (supports to XVII); every quadrant is a turned copy of it.
 * `classes` are the mesh outputs whose vertices are read.
 */
export function census(
  outputs: Record<string, unknown>,
  classes: readonly string[] = ["gussets", "bracing", "horizontals", "girders", "arches", "platforms", "masonry"],
): Census {
  const bump = (r: Record<string, number>, k: string, by = 1) => {
    r[k] = (r[k] ?? 0) + by;
  };
  const buriedHeads: Record<string, number> = {};
  const headsInPieces: Record<string, number> = {};
  const swallowed: Record<string, number> = {};
  const vertsInPieces: Record<string, number> = {};
  const platesInPieces: Record<string, number> = {};
  const platesDeepest: Record<string, number> = {};
  const platesPierced: Record<string, number> = {};
  const pierceDeepest: Record<string, number> = {};
  const gap: Record<string, number> = {};
  for (const [key, val] of Object.entries(outputs)) {
    if (!key.startsWith("rivets.") || key.startsWith("rivets.leg.uprights")) continue;
    for (const p of rivetBases((val as unknown[])[0])) {
      const w = near(p, 0.15);
      if (w === undefined) continue;
      if (w.depth > 0.002) bump(buriedHeads, key.slice(7));
      else {
        const q = inPiece(p, w);
        if (q !== undefined) bump(headsInPieces, `${key.slice(7)}|${q.what}`);
      }
    }
  }
  for (const cls of classes) {
    const geo = firstGeometry((outputs[cls] ?? []) as never) as Geometry | undefined;
    const P = geo?.attrs.point.get("P")?.data;
    if (geo === undefined || P === undefined) continue;
    for (let i = 0; i < geo.attrs.point.count; i++) {
      const p: Vec3 = [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
      const w = near(p, 0.15);
      if (w === undefined) continue;
      if (w.depth > 0.002) bump(swallowed, cls);
      else {
        const k = `${cls}|${w.k}`;
        gap[k] = Math.min(gap[k] ?? Infinity, -w.depth);
        const q = inPiece(p, w);
        if (q !== undefined) bump(vertsInPieces, `${cls}|${q.what}`);
      }
    }
    if (cls !== "gussets") continue;
    // The plates BEFORE the class's jitter, which splits a box's shared
    // corners (tests/eiffelRivetClash.test.ts reads them the same way).
    const pre = firstGeometry((outputs["probe:gussetsOut"] ?? []) as never) as Geometry | undefined;
    if (pre === undefined) throw new Error("census: cook with probe:gussetsOut");
    for (const sl of slabs(pre)) {
      if (sl.c[0] <= 0 || sl.c[2] <= 0 || sl.c[1] < BOTTOM - 1 || sl.c[1] > TOP + 1) continue;
      const r = Math.hypot(...sl.half);
      const hit = new Map<string, number>();
      const pierce = new Map<string, number>();
      for (const [name, xs, zs] of MEMBERS4) {
        const pr = profileAt(Math.min(TOP, Math.max(BOTTOM, sl.c[1])));
        if (Math.max(Math.abs(sl.c[0] - pr[xs]), Math.abs(sl.c[2] - pr[zs])) > H + 0.2 + r) continue;
        const k0 = segmentAt(Math.max(BOTTOM, sl.c[1] - r));
        const k1 = segmentAt(Math.min(TOP - 1e-6, sl.c[1] + r));
        for (let k = k0; k <= k1; k++)
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
            for (const q of facePieces(name, k, d)) {
              const { overlap, through } = slabInPiece(sl, name, k, d, q);
              if (overlap <= 0.001) continue;
              hit.set(q.what, Math.max(hit.get(q.what) ?? 0, overlap));
              if (through > 0.001) pierce.set(q.what, Math.max(pierce.get(q.what) ?? 0, through));
            }
      }
      for (const [what, ov] of hit) {
        bump(platesInPieces, what);
        platesDeepest[what] = Math.max(platesDeepest[what] ?? 0, ov);
      }
      for (const [what, t] of pierce) {
        bump(platesPierced, what);
        pierceDeepest[what] = Math.max(pierceDeepest[what] ?? 0, t);
      }
    }
  }
  return {
    buriedHeads,
    headsInPieces,
    swallowed,
    vertsInPieces,
    platesInPieces,
    platesDeepest,
    platesPierced,
    pierceDeepest,
    gap,
  };
}
