/**
 * The plates over the crossings.
 *
 * Wherever two laced struts cross in a lattice face, the tower rivets a
 * plate over them, one either side: PL-VII Fig. 2 names the one at the gap
 * X's centre, PL-XIV Fig. 5 bis prints "2 Goussets 1.130 x 10" where the
 * summit's two diagonal girders cross. The legs and the shaft are full of
 * such crossings — a post landing on a horizontal, a panel's two diagonals
 * bisecting each other, both at once — and they are all the same joint, so
 * they are all built here rather than four times over.
 *
 * WHAT A PLATE IS. A box, `CROSS_THICK` thick, lying in the members'
 * shared face plane, set {@link CrossPlate.set} UNDER the corner angles'
 * outer face rather than over them, so the angles of every arm run over
 * the plate's edges while the plate covers the lacing between them. That
 * is what a gusset in a box section does and what the photographs show.
 * The depth is bounded by the lacing, which is nearer the surface than the
 * section table suggests — 0.0174 in, measured, not the 0.0225 `CHORD -
 * LACE` implies; see {@link CrossPlate.set}, where the measurement is.
 *
 * Across its member a plate is `2 * CrossPlate.edge` wide at an 800 strut
 * and scales with a narrower one, so at the default its long edges land on
 * the strut's own sides and its rivet rows, 0.04 in, fall within 5 mm of
 * the chords' axes — where a plate's rivets belong, fastening it to the
 * angles rather than to air. Along its member it is square unless the
 * caller asks for more, which one family does: a post landing on a
 * horizontal has a cut end to cover and reaches past it.
 *
 * Both of those are the only numbers in the tower settled by eye rather
 * than read off a plate, which is why they are the only ones the page can
 * override ({@link CrossPlate}).
 */
import type { Lattice, SegmentMember, Vec3 } from "./lattice.js";
import { CROSS_PLATE_AT, type CrossPlate } from "./parts.js";

// The vector three-liners, per this demo's standing habit of keeping them
// local: `lattice.ts`, `legs.ts` and `lifts.ts` each carry their own set,
// none of them exported, and a module that needed them has always written
// them out rather than reached across.
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const scale3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const unit3 = (p: Vec3): Vec3 => scale3(p, 1 / Math.hypot(p[0], p[1], p[2]));

/**
 * A crossing plate's thickness [sourced PL-XIV Fig. 5 bis prints "2
 * Goussets 1.130 x 10" at the summit girders' crossing; the joints' own
 * plates are 8 to 10 mm].
 */
export const CROSS_THICK = 0.01;

/**
 * The rows round a crossing plate's edge: a rivet every `pitch`, `inset`
 * in from the edge [estimated; PL-IX's Gousset A draws its edge rows about
 * a rivet's own diameter in].
 */
export const CROSS_RIVETS = { pitch: 0.1, inset: 0.04 } as const;

/** One crossing that takes a pair of plates. */
export interface Crossing {
  /** The crossing point, on the members' shared face plane. */
  readonly at: Vec3;
  /** Unit, in that plane: the plate's long axis. */
  readonly along: Vec3;
  /** The plane's unit normal. */
  readonly n: Vec3;
  /** The struts' half-width there, which sets both the plate's depth and its width. */
  readonly w: number;
  /**
   * Half the plate's length along `along`. Omitted, the plate is square:
   * an X of two diagonals cuts nothing, so there is nothing to reach past
   * and a square is what the drawings show. The post-on-horizontal family
   * passes one, because it has a cut cap to cover.
   */
  readonly half?: number;
}

/**
 * A family of crossing plates that share a strut section, and so one
 * width: `flatBars` takes one width for a whole set, and 800s, 600s and
 * 500s cannot ride together or the 500s get 0.80 plates.
 */
export interface CrossPlateSet {
  /** The section this set is for, in millimetres — "800", "600", "500" — for a stable node id. */
  readonly key: string;
  readonly members: SegmentMember[];
  readonly rivetLines: SegmentMember[];
  readonly width: number;
}

/**
 * Where a lattice bay's two diagonals cross, and which way the plate over
 * them runs.
 *
 * A bay is a planar trapezoid: `p0`-`q0` along the lower level, `p1`-`q1`
 * along the upper. A trapezoid's diagonals meet ON the line joining the
 * midpoints of its two parallel sides, at the fraction `w0 / (w0 + w1)` of
 * the way up, where w is the side's length. So the crossing is always on
 * the bay's own midline — which for a leg face's single bay is the central
 * post's line, and that is why panels 1-4, whose legs are a parallel
 * prism, put their crossing exactly on the mid-panel horizontal: there
 * w0 = w1 and the fraction is a half. Above panel 5 the leg tapers and the
 * crossing rises to 0.502-0.519.
 *
 * The plate runs along that midline, which is the one direction every
 * crossing has whether or not a post happens to lie on it.
 */
export function bayCrossing(
  p0: Vec3,
  q0: Vec3,
  p1: Vec3,
  q1: Vec3,
  /** The struts' half-width, read from the section table at the crossing's own height. */
  halfWidth: (y: number) => number,
): Crossing | undefined {
  const w0 = Math.hypot(...sub3(q0, p0));
  const w1 = Math.hypot(...sub3(q1, p1));
  if (!(w0 + w1 > 1e-9)) return undefined;
  const mid = (a: Vec3, b: Vec3): Vec3 => scale3(add3(a, b), 0.5);
  const m0 = mid(p0, q0);
  const m1 = mid(p1, q1);
  const rise = sub3(m1, m0);
  if (!(Math.hypot(...rise) > 1e-9)) return undefined;
  const along = unit3(rise);
  const n = unit3(cross3(unit3(sub3(q0, p0)), along));
  const at = add3(m0, scale3(rise, w0 / (w0 + w1)));
  return { at, along, n, w: halfWidth(at[1]) };
}

/**
 * Turn crossings into the plate segments and the rivet rows round their
 * edges, a pair at each crossing, one either side of the lattice, grouped
 * into one set per strut section (widest first, so a set's key is stable
 * against another section being added later).
 *
 * Each plate carries its OWN outward normal, not the face's: the pair
 * cannot share one, or the inner plate's heads would point into the
 * lattice.
 */
export function crossPlateSets(
  list: readonly Crossing[],
  tune: CrossPlate,
): CrossPlateSet[] {
  // Both knobs are quoted at an 800 strut and scale with the section, so a
  // 500's plate is the same plate at 5/8 scale rather than an 800's plate
  // on a smaller member. The depth could have been absolute — the angles
  // and the lacing are the same sections on every strut, so the 0.0225 a
  // plate must stay inside of is a constant — but a set that scales only
  // ever goes SHALLOWER on a smaller strut, which is the safe direction,
  // and one rule for both knobs is one rule to tune.
  const scale = (v: number, w: number) => (v * w) / CROSS_PLATE_AT;
  const sets = new Map<string, { w: number; members: SegmentMember[]; rivetLines: SegmentMember[] }>();
  for (const c of list) {
    const key = String(Math.round(c.w * 2000));
    const set = sets.get(key) ?? { w: c.w, members: [], rivetLines: [] };
    sets.set(key, set);
    const B = unit3(cross3(c.n, c.along));
    const halfAcross = scale(tune.edge, c.w);
    const half = c.half ?? halfAcross;
    for (const side of [1, -1]) {
      const n = scale3(c.n, side);
      const o = add3(c.at, scale3(c.n, side * (c.w - scale(tune.set, c.w) + CROSS_THICK / 2)));
      const at = (t: number, b: number) => add3(add3(o, scale3(c.along, t)), scale3(B, b));
      set.members.push({ a: at(-half, 0), b: at(half, 0), n });
      // Four rows round the edge, on the plate's mid-plane; the end rows
      // stop a pitch short of the long ones so no two heads coincide.
      const t = half - CROSS_RIVETS.inset;
      const b = halfAcross - CROSS_RIVETS.inset;
      if (!(t > 0 && b > 0)) continue;
      set.rivetLines.push(
        { a: at(-t, b), b: at(t, b), n },
        { a: at(-t, -b), b: at(t, -b), n },
        { a: at(t, -b + CROSS_RIVETS.pitch), b: at(t, b - CROSS_RIVETS.pitch), n },
        { a: at(-t, -b + CROSS_RIVETS.pitch), b: at(-t, b - CROSS_RIVETS.pitch), n },
      );
    }
  }
  return [...sets.entries()]
    .map(([key, s]) => ({ key, members: s.members, rivetLines: s.rivetLines, width: 2 * scale(tune.edge, s.w) }))
    .sort((a, b) => b.width - a.width);
}

/**
 * What a crossing's pair of plates covers, as the struts under it see it:
 * a rectangle on the members' shared face plane, centred on the crossing,
 * `half` along `along` and `halfAcross` along `across`, the pair either
 * side of the plane along `n`. The lacing's rivets must stay out of it
 * (`WebOpts.covers` in strut.ts): the plate is set under the corner angles'
 * outer face, so a lacing head on that face within the rectangle stands in
 * the plate, and next to the plate's own edge rows.
 */
export interface PlateFootprint {
  readonly at: Vec3;
  readonly along: Vec3;
  readonly across: Vec3;
  readonly n: Vec3;
  readonly half: number;
  readonly halfAcross: number;
}

/** The footprints {@link crossPlateSets} lays its plates over, one per crossing, sized as it sizes them. */
export function crossFootprints(list: readonly Crossing[], tune: CrossPlate): PlateFootprint[] {
  return list.map((c) => {
    const halfAcross = (tune.edge * c.w) / CROSS_PLATE_AT;
    return {
      at: c.at,
      along: c.along,
      across: unit3(cross3(c.n, c.along)),
      n: c.n,
      half: c.half ?? halfAcross,
      halfAcross,
    };
  });
}

/**
 * The same footprints turned k quarter turns about +y, as the quadrant
 * targets turn a part built in the +x+z quadrant (+z onto +x): for parts
 * whose crossings are listed once and copied onto all four legs.
 */
export function turnFootprints(list: readonly PlateFootprint[], k: number): PlateFootprint[] {
  const turn = ([x, y, z]: Vec3): Vec3 =>
    k % 4 === 0 ? [x, y, z] : k % 4 === 1 ? [z, y, -x] : k % 4 === 2 ? [-x, y, -z] : [-z, y, x];
  return list.map((f) => ({
    at: turn(f.at),
    along: turn(f.along),
    across: turn(f.across),
    n: turn(f.n),
    half: f.half,
    halfAcross: f.halfAcross,
  }));
}

/**
 * The crossings of a lattice's OWN X's: one per bay that carries a cross,
 * found from the stations rather than from the members. A bay is a
 * trapezoid and {@link bayCrossing} solves it exactly, so this asks the
 * same table the edge rules ask and does not re-derive the lattice.
 *
 * `on(s, k)` is the same predicate the two cross rules are masked with,
 * read on the FACE the pair lies in: rule A at station s and rule B at
 * station s + 1 both lie in face s, so a face carries an X exactly when
 * the predicate holds there.
 */
export function latticeCrossings(
  lat: Lattice,
  span: number,
  on: (s: number, k: number) => boolean,
  /** The struts' half-width at a height: the section table this lattice is built to. */
  halfWidth: (y: number) => number,
): Crossing[] {
  const out: Crossing[] = [];
  const P = lat.positions;
  for (let k = 0; k + span < P.length; k++) {
    for (let s = 0; s < lat.ringSize; s++) {
      const s1 = s + 1;
      if (s1 >= lat.ringSize && !lat.closed) continue;
      const t = s1 % lat.ringSize;
      if (!on(s, k)) continue;
      const rows = [P[k], P[k + span]] as const;
      const c = bayCrossing(
        rows[0]?.[s] as Vec3,
        rows[0]?.[t] as Vec3,
        rows[1]?.[s] as Vec3,
        rows[1]?.[t] as Vec3,
        halfWidth,
      );
      if (c !== undefined) out.push(c);
    }
  }
  return out;
}
