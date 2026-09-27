/**
 * The stairs of 1889, ground to summit: all 1,710 steps.
 *
 * E1900-TXT p. 304 (Hénocque's « Tableau des données relatives à la
 * montée à pied ») counts the climb a man made on foot, level by level
 * [sourced]:
 *
 * | from → to                          | rise   | steps | cumulative |
 * |------------------------------------|--------|-------|------------|
 * | ground (35.08) → 1st floor (91.13) | 56.05  | 347   | 347        |
 * | 1st → 2nd floor (149.23)           | 58.10  | 327   | 674        |
 * | 2nd → intermediate (229.43)        | 80.20  | 456   | 1,130      |
 * | intermediate → 3rd (« 312.21 »)    | 82.78  | 455   | 1,585      |
 * | 3rd → summit (334.01)              | 21.80  | 125   | 1,710      |
 *
 * (The rises are the table's. The model reads the 455 to the 3rd floor,
 * 309.63, an 80.20 climb like the row before it, and the 125 from there,
 * 24.385: see `SHAFT_STAIRS.e3`.)
 *
 * A STEP here is one rise of the foot: a riser on a stair, a rung's pitch
 * on a ladder. That is the reading the book's own flights bear out: PL-XXVIII
 * Fig. 5 prints T3 as « 23 marches de 0.15933 » plus a 0.172 step onto its
 * landing, and the text gives e1's joining flights as « dix marches … et
 * onze contremarches », so a « marche » on the plates is a tread and a
 * climber's step is a riser [derived]. Counted by risers, the plates'
 * running part of the ground stair is 276 of its 347 (below).
 *
 * The counts are the invariant: each run below is built to its row, and
 * where the plates fix a flight's risers the run keeps them and the others
 * close on the count. Every riser is a TREAD in the model — a box at its
 * top — except where the riser lands on a slab the model builds (a landing
 * or a floor), which is then that step's tread. So a run's `steps` is its
 * risers, and its `treads` the boxes: `steps` less the flights that end on
 * a slab.
 *
 * THE FIVE RUNS (each section below carries its sources):
 * 1. ground → 1st, straight flights in piles 2 (up) and 4 (down),
 *    PL-XXVIII (`groundToFirst`);
 * 2. 1st → 2nd, e1, a helix per panel in every leg joined by straight
 *    flights, E1900-TXT p. 81 and PL-XX Figs 3-4 (`firstToSecond`);
 * 3. 2nd → intermediate landing, e2, the service helix, PL-XX Fig. 2 and
 *    PL-XIX Fig. 14 (`secondToLanding`);
 * 4. intermediate → 3rd, e3 and its raccord (`landingToThird`);
 * 5. 3rd → summit: the little stair to Eiffel's apartment, the stair on
 *    the gallery and the one beside the continuous girder, the campanile's
 *    spiral round the 690 core, then ladders: in the core to the lantern,
 *    and in the lantern to the top platform, PL-XIX Figs 3, 5, 6 and PL-XV
 *    Figs 1-2 (`thirdToSummit`).
 *
 * THE RULE. Three parameterised builders make every run: `straight`, a
 * straight flight between two points; `spiral`, a helix round a vertical
 * axis with optional landings every so many steps; `ladder`, rungs between
 * two stiles, plumb or leaning. Each returns plain data (boxes, rails and
 * the step record), in any frame, for any graph to place: nothing in them
 * knows the tower.
 *
 * Frames: the leg stairs are built in the +x+z leg (pile 4 Ouest, quadrant
 * target 0: r out along its diagonal, l across it) and copied onto the
 * other legs by the caller; the shaft and summit stairs are in the world,
 * in the diagonals' frame (s toward pile 3 Sud, +x −z; t toward pile 4
 * Ouest, +x +z), as `lifts.ts` and `summit.ts` use it.
 */
import type { Vec3 } from "./lattice.js";
import { FLOORS, NODES, profileAt } from "./spec.js";
import { STAIR_ENVELOPE, coreDoorArc, lanternLevels } from "./summit.js";

// ---------------------------------------------------------------------------
// Vectors and frames

const SQ2 = Math.SQRT2;
const UP: Vec3 = [0, 1, 0];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / Math.hypot(p[0], p[1], p[2]));

/** Out along the +x+z leg's diagonal, horizontal. */
const U: Vec3 = [1 / SQ2, 0, 1 / SQ2];
/** Across that diagonal, horizontal. */
const E: Vec3 = [1 / SQ2, 0, -1 / SQ2];
/** A point of the +x+z leg: r out along its diagonal, y up, l across it. */
const onDiag = (r: number, y: number, l = 0): Vec3 => [(r + l) / SQ2, y, (r - l) / SQ2];
/** The outer corner c, as a distance along the diagonal. */
const cornerC = (y: number): number => SQ2 * profileAt(y).outer;

/** Along the N–S diagonal, toward pile 3 (Sud) at +x −z. */
export const S_HAT: Vec3 = [1 / SQ2, 0, -1 / SQ2];
/** Across it, toward pile 4 (Ouest) at +x +z. */
export const T_HAT: Vec3 = [1 / SQ2, 0, 1 / SQ2];
/** A world point from the diagonals' frame. */
export const inShaft = (s: number, y: number, t = 0): Vec3 => add3(add3(mul3(S_HAT, s), mul3(T_HAT, t)), [0, y, 0]);
/** The horizontal direction at angle `a` in the diagonals' frame: 0 toward +s, a quarter turn toward +t. */
const dirST = (a: number): Vec3 => add3(mul3(S_HAT, Math.cos(a)), mul3(T_HAT, Math.sin(a)));

// ---------------------------------------------------------------------------
// The data a stair is

/**
 * A box by its frame: centre, the directions of its local x and y (unit,
 * perpendicular; z is x × y), and its size along each. The same shape as
 * `lifts.ts`'s, which places them.
 */
export interface Block {
  readonly at: Vec3;
  readonly x: Vec3;
  readonly y: Vec3;
  readonly size: Vec3;
}

/**
 * A point of a flight's walking line: where a climber's foot stands, and
 * the flight's steps climbed on reaching it.
 */
export interface WalkPoint {
  readonly at: Vec3;
  readonly step: number;
}

/** One flight, stair or ladder, as the tests and the step count read it. */
export interface Flight {
  readonly name: string;
  readonly kind: "straight" | "spiral" | "ladder";
  /** Its steps: risers, or a ladder's rung pitches. */
  readonly risers: number;
  /** Each riser's height. */
  readonly rise: number;
  /** Each step's going on the walking line (a ladder's: 0 plumb, its lean's otherwise). */
  readonly going: number;
  /** The walking line's first point (the floor it leaves) and its last (the level it reaches). */
  readonly foot: Vec3;
  readonly head: Vec3;
  /** The horizontal direction of travel as it leaves its foot and reaches its head (a ladder's: the way the climber faces). */
  readonly enter: Vec3;
  readonly leave: Vec3;
  /** True where the last riser lands on a slab the model builds, which is then its tread. */
  readonly slab: boolean;
  /** Width between stringers (a spiral's: its tread, radially). */
  readonly width: number;
  /** A spiral's axis at its foot and its outer diameter. */
  readonly axis?: Vec3;
  readonly diameter?: number;
  /**
   * The walking line, as the walk (`walk.ts`) follows it: the foot, the
   * middle of every tread at its top (a spiral's at its walking radius,
   * with the middle of every landing slot between; a ladder's rungs), then
   * the head. Built with the treads from the same numbers, so the path a
   * climber takes is the stair's own and not a copy of it.
   */
  readonly line: readonly WalkPoint[];
}

/** A stair's pieces: the treads (one per riser, less those a slab takes), frame, landings, rails. */
export interface StairParts {
  readonly treads: Block[];
  /** Stringers, newels, rail posts, ladder stiles. */
  readonly frame: Block[];
  readonly landings: Block[];
  /** Hand-rail centre lines. */
  readonly rails: Vec3[][];
  readonly flights: Flight[];
}

const empty = (): StairParts => ({ treads: [], frame: [], landings: [], rails: [], flights: [] });

/** Several stairs' pieces as one. */
export function joinStairs(...all: StairParts[]): StairParts {
  const out = empty();
  for (const p of all) {
    out.treads.push(...p.treads);
    out.frame.push(...p.frame);
    out.landings.push(...p.landings);
    out.rails.push(...p.rails);
    out.flights.push(...p.flights);
  }
  return out;
}

/** The steps a set of flights climbs. */
export const stepsOf = (p: Pick<StairParts, "flights">): number => p.flights.reduce((n, f) => n + f.risers, 0);

// ---------------------------------------------------------------------------
// The rule

/** A tread's thickness, a landing's, a ladder rung's section [estimated]. */
export const TREAD = 0.05;
export const LANDING = 0.1;
const RUNG = 0.025;
/** A rail post's section and the most a post stands from the next [estimated]. */
const POST = 0.035;
const POST_SPACING = 1.2;

/** A straight member of square section `w` from p to q; `hint` rolls it. */
function member(p: Vec3, q: Vec3, w: number, hint: Vec3 = UP): Block {
  const d = sub3(q, p);
  const x = unit3(d);
  let y = sub3(hint, mul3(x, dot3(hint, x)));
  if (Math.hypot(y[0], y[1], y[2]) < 1e-6) y = sub3(E, mul3(x, dot3(E, x)));
  return { at: mul3(add3(p, q), 0.5), x, y: unit3(y), size: [Math.hypot(d[0], d[1], d[2]), w, w] };
}

/** A landing: its top at `at`, `along` on the horizontal `x`, `across` beside it. */
export function pad(at: Vec3, x: Vec3, along: number, across: number): Block {
  return { at: [at[0], at[1] - LANDING / 2, at[2]], x, y: UP, size: [along, LANDING, across] };
}

export interface StraightSpec {
  readonly name: string;
  /** The foot of the first riser and the top of the last, on the flight's centre line. */
  readonly foot: Vec3;
  readonly head: Vec3;
  readonly risers: number;
  /** Between the stringers. */
  readonly width: number;
  /** The last riser lands on a slab the model builds: no tread of its own. */
  readonly slab: boolean;
  /** Hand rails' height over the nosing line, both sides; 0 for none. */
  readonly rail?: number;
  /** The stringers' depth and thickness [estimated where not given]. */
  readonly stringer?: { readonly depth: number; readonly thick: number };
  /**
   * The risers the stringers start above: 0, from the foot, where it stands
   * on a landing of the stair's own; 1 on a floor, which a stringer's
   * square-cut end would otherwise dip into; "floor", from where its lower
   * corner comes down onto the foot's level, resting on that floor.
   */
  readonly stringerFoot?: number | "floor";
  /**
   * The risers under the head the stringers stop short of: 0, to the head;
   * 1 where the head lands on a deck's edge, which a stringer's square-cut
   * end would otherwise run into.
   */
  readonly stringerHead?: number;
}

/**
 * A straight flight from `foot` to `head`: a tread at each riser's top, the
 * last level with `head` (left out where a slab takes it), two stringers,
 * and a hand rail on each side on posts.
 */
export function straight(o: StraightSpec): StairParts {
  const out = empty();
  const h: Vec3 = [o.head[0] - o.foot[0], 0, o.head[2] - o.foot[2]];
  const x = unit3(h);
  const across = cross3(x, UP);
  const run = Math.hypot(h[0], h[2]);
  const going = run / o.risers;
  const rise = (o.head[1] - o.foot[1]) / o.risers;
  const last = o.slab ? o.risers - 1 : o.risers;
  const line: WalkPoint[] = [{ at: o.foot, step: 0 }];
  for (let i = 1; i <= o.risers; i++) {
    const c = add3(o.foot, mul3(h, (i - 0.5) / o.risers));
    const y = o.foot[1] + rise * i;
    line.push({ at: [c[0], y, c[2]], step: i });
    if (i <= last) out.treads.push({ at: [c[0], y - TREAD / 2, c[2]], x, y: UP, size: [going + 0.03, TREAD, o.width] });
  }
  line.push({ at: o.head, step: o.risers });
  const st = o.stringer ?? { depth: 0.25, thick: 0.06 };
  // The pitch's cosine: a stringer's section, square to the pitch, stands
  // depth / cos over and under its centre line, plumb.
  const cos = going / Math.hypot(going, rise);
  // "floor": the risers up the pitch where the stringer's lower corner,
  // square-cut, comes to 2 mm over the foot's level: so it rests on that
  // floor [derived].
  const sFoot = o.stringerFoot === "floor" ? (0.1 + (st.depth / 2) * cos + 0.002) / rise : (o.stringerFoot ?? 0);
  const from = add3(o.foot, mul3(sub3(o.head, o.foot), sFoot / o.risers));
  const to = add3(o.foot, mul3(sub3(o.head, o.foot), 1 - (o.stringerHead ?? 0) / o.risers));
  for (const side of [-1, 1]) {
    const off = add3(mul3(across, (side * (o.width + st.thick)) / 2), [0, -0.1, 0]);
    const s = member(add3(from, off), add3(to, off), st.thick, UP);
    out.frame.push({ ...s, size: [s.size[0], st.depth, st.thick] });
  }
  const railH = o.rail ?? 0;
  if (railH > 0) {
    for (const side of [-1, 1]) {
      const off = mul3(across, (side * (o.width + st.thick)) / 2);
      const a = add3(o.foot, off);
      const b = add3(o.head, off);
      out.rails.push([add3(a, [0, railH, 0]), add3(b, [0, railH, 0])]);
      const n = Math.max(1, Math.ceil(run / POST_SPACING));
      // Each post stands on its stringer, its foot 0.02 into the
      // stringer's top edge: until 2026-09-26 it stopped at the stringer's
      // centre line, buried inside it and touching nothing [derived]. The
      // last, at the head, where the stringer's square-cut end leans back
      // from its top edge, still runs down to that centre line, across the
      // end.
      const seat = -0.1 + st.depth / 2 / cos - 0.02;
      for (let j = 0; j <= n; j++) {
        const p = add3(a, mul3(sub3(b, a), j / n));
        out.frame.push(member(add3(p, [0, j === n ? -0.1 : seat, 0]), add3(p, [0, railH, 0]), POST, x));
      }
    }
  }
  out.flights.push({ name: o.name, kind: "straight", risers: o.risers, rise, going, foot: o.foot, head: o.head, enter: x, leave: x, slab: o.slab, width: o.width, line });
  return out;
}

export interface SpiralSpec {
  readonly name: string;
  /** The axis at a height, and the frame angles are read in (0 along `frameX`, a quarter turn along `frameZ`). */
  readonly axis: (y: number) => Vec3;
  readonly frameX: Vec3;
  readonly frameZ: Vec3;
  readonly y0: number;
  readonly y1: number;
  readonly risers: number;
  /** Outer diameter and the treads' radial width. */
  readonly diameter: number;
  readonly tread: number;
  /** The angle of the first riser's edge and the turns to the last's. */
  readonly start: number;
  readonly turns: number;
  /** A landing after every `every` risers, `span` treads' angle wide, rising nothing (see `landingSteps`). */
  readonly landings?: Landings;
  readonly slab: boolean;
  /** The outer rail's height over the treads; 0 for none. */
  readonly rail?: number;
  /**
   * The outer rail left open over this angle at the foot and at the head,
   * where a flight joins the helix across its outer edge and the walker
   * steps over it (radians; 0, the default, for a rail that runs the whole
   * helix). Rail posts in an opening are left out too.
   */
  readonly railOpen?: { readonly foot: number; readonly head: number };
  /** The newel's reach below the foot and above the head; null for none (a core the caller builds). */
  readonly newel?: { readonly below: number; readonly above: number } | null;
}

/**
 * A helix's landings: one after every `every` risers, `span` treads' angle
 * wide; none within `headClear` risers of the head, where the flight that
 * leaves the helix crosses over its last turn (see `SERVICE_LANDINGS`).
 */
export interface Landings {
  readonly every: number;
  readonly span: number;
  readonly headClear?: number;
}

/** The risers a helix of `risers` has a landing after, in order. */
export function landingSteps(risers: number, landings?: Landings): number[] {
  if (landings === undefined) return [];
  const out: number[] = [];
  for (let k = landings.every; k < risers; k += landings.every) if (risers - k >= (landings.headClear ?? 0)) out.push(k);
  return out;
}

/** The angular slots a spiral of `risers` with `landings` needs. */
export function spiralSlots(risers: number, landings?: Landings): number {
  return risers + (landings === undefined ? 0 : landings.span * landingSteps(risers, landings).length);
}

/**
 * The most a helix's hand rail may stand off its true circle between two
 * vertices, 5 mm: at eye level, from the next turn, a rail drawn one chord
 * per tread (24° on the service helices) reads as a polygon [estimated].
 * Each tread's arc is cut into as many chords as its radius needs, so a
 * wider helix gets more.
 */
export const RAIL_SAG = 0.005;

/** The chords an arc of `angle` at radius `r` needs to stand within `RAIL_SAG` of it. */
export function railChords(angle: number, r: number): number {
  const most = 2 * Math.acos(Math.max(-1, 1 - RAIL_SAG / r));
  return Math.max(1, Math.ceil(Math.abs(angle) / most - 1e-9));
}

/**
 * The turns of a spiral of `slots` treads' angle, about `perTurn` (15) to
 * the turn, that starts at the angle `start` and must end at the angle
 * `end`.
 */
export function turnsBetween(slots: number, start: number, end: number, perTurn = 15): number {
  const frac = ((((end - start) / (2 * Math.PI)) % 1) + 1) % 1;
  return Math.max(frac === 0 ? 1 : frac, Math.round(slots / perTurn - frac) + frac);
}

/**
 * A landing round a vertical axis, as a sector: from the angle `from` on
 * `angle` further (counter-clockwise from `frameX` toward `frameZ`),
 * between the radii `inner` and `outer`, its top at `y`. Built of boxes
 * no wider than `most` of angle each, every one square to the sector's
 * radius at its FORWARD edge and reaching back from it: so no box stands
 * past the sector's forward edge, where the helix below climbs toward it
 * (a box centred on its slot overhangs that edge near the newel, and there
 * the turn below is a riser nearer), and the backward overhang lies over
 * the landing's own pieces and the tread before it, at their level or
 * lower [derived].
 */
export function sectorLanding(
  axis: Vec3,
  frameX: Vec3,
  frameZ: Vec3,
  y: number,
  from: number,
  angle: number,
  inner: number,
  outer: number,
  most: number,
): Block[] {
  const dir = (phi: number): Vec3 => add3(mul3(frameX, Math.cos(phi)), mul3(frameZ, Math.sin(phi)));
  const n = Math.max(1, Math.ceil(angle / most - 1e-9));
  const d = angle / n;
  const back = outer * Math.sin(d);
  const out: Block[] = [];
  for (let j = 1; j <= n; j++) {
    const edge = from + j * d;
    const r = dir(edge);
    // Backward: a quarter turn against the direction of travel.
    const b = dir(edge - Math.PI / 2);
    // In from `inner` a little, so the piece's back corner still reaches
    // the inner circle at the slot's back edge.
    const from0 = inner * Math.cos(d);
    const at = add3(add3(axis, mul3(r, (from0 + outer) / 2)), mul3(b, back / 2));
    out.push({ at: [at[0], y - LANDING / 2, at[2]], x: r, y: UP, size: [outer - from0, LANDING, back] });
  }
  return out;
}

/**
 * A spiral stair round a vertical axis: wedge treads (boxes a little wider
 * than the wedge at mid radius, so they overlap), landings of `span`
 * treads' angle where asked (`sectorLanding`, a box a tread), a newel, the
 * outer hand rail on posts every fourth tread, cut into chords by
 * `railChords`.
 */
export function spiral(o: SpiralSpec): StairParts {
  const out = empty();
  const rise = (o.y1 - o.y0) / o.risers;
  const slots = spiralSlots(o.risers, o.landings);
  const dPhi = (o.turns * 2 * Math.PI) / slots;
  const outer = o.diameter / 2;
  const mid = outer - o.tread / 2;
  const dir = (phi: number): Vec3 => add3(mul3(o.frameX, Math.cos(phi)), mul3(o.frameZ, Math.sin(phi)));
  const wide = Math.max(0.2, mid * dPhi * 1.4);
  // The slot each riser's tread takes, and the landings between.
  const after = landingSteps(o.risers, o.landings);
  const span = o.landings?.span ?? 0;
  const slotOf = (i: number) => (i - 1) + span * after.filter((k) => k < i).length;
  const last = o.slab ? o.risers - 1 : o.risers;
  const railH = o.rail ?? 0;
  // The rail's open arcs, in slots from each end.
  const openFoot = (o.railOpen?.foot ?? 0) / dPhi;
  const openHead = slots - (o.railOpen?.head ?? 0) / dPhi;
  // The walking line's height at a slot boundary u (0 … slots).
  const heightAt = (u: number): number => {
    let risers = 0;
    for (let i = 1; i <= o.risers; i++) if (slotOf(i) < u - 1e-9) risers = i;
    return o.y0 + risers * rise;
  };
  // The hand rail's height over the treads at u: over each tread's slot it
  // climbs from its tread's height to the next one's (at a slot boundary,
  // the tread it starts).
  const railY = (u: number): number => {
    const a = Math.min(Math.floor(u), slots);
    const f = u - a;
    const ya = heightAt(a + 0.5);
    return f < 1e-12 ? ya : ya + (heightAt(a + 1.5) - ya) * f;
  };
  // The newel: the core tube, the diameter less two treads [derived], drawn
  // as the square inside its circle.
  const core = Math.max(0.16, o.diameter - 2 * o.tread);
  const nb = o.newel === undefined ? { below: 0.5, above: 0.5 } : o.newel;
  // The treads' inner ends: 0.01 inside the newel's square, so each tread
  // is fixed to it whatever its angle [derived]; where the caller builds
  // the core, the tread's own inner edge. Until 2026-09-26 they stopped at
  // the tube's circle, 1-6 cm short of the square, and hung in the air.
  // Only the treads' reach toward the axis changes: their walking line
  // (`mid`) and going stay the tread's.
  const inner = nb === null ? outer - o.tread : Math.min(outer - o.tread, 0.35 * core - 0.01);
  for (let i = 1; i <= last; i++) {
    const u = slotOf(i) + 0.5;
    const phi = o.start + u * dPhi;
    const y = o.y0 + i * rise;
    out.treads.push({ at: add3(o.axis(y - TREAD / 2), mul3(dir(phi), (inner + outer) / 2)), x: dir(phi), y: UP, size: [outer - inner, TREAD, wide] });
    if (railH > 0 && i % 4 === 0 && u > openFoot && u < openHead) {
      // Up to the rail's centre line where it passes: at the middle of the
      // slot it stands half a riser over the tread (`railY`), so a post
      // cut at the tread's height + railH stopped 0.06-0.09 under the
      // rail's underside and the rail hung in the air [derived].
      const foot = add3(o.axis(y), mul3(dir(phi), outer - 0.03));
      out.frame.push(member(add3(foot, [0, -TREAD, 0]), add3(foot, [0, railY(u) + railH - y, 0]), POST, dir(phi)));
    }
  }
  for (const k of after) {
    const s0 = slotOf(k) + 1;
    out.landings.push(...sectorLanding(o.axis(o.y0 + k * rise), o.frameX, o.frameZ, o.y0 + k * rise, o.start + s0 * dPhi, span * dPhi, outer - o.tread, outer, dPhi));
  }
  if (nb !== null) {
    const a0 = o.axis(o.y0);
    const n0 = o.y0 - nb.below;
    const n1 = o.y1 + nb.above;
    out.frame.push({ at: [a0[0], (n0 + n1) / 2, a0[2]], x: o.frameX, y: UP, size: [core * 0.7, n1 - n0, core * 0.7] });
  }
  if (railH > 0 && openHead > openFoot) {
    // The rail at `railY`, each slot cut into `railChords` chords, and the
    // ends into the open arcs.
    const per = railChords(dPhi, outer);
    const us: number[] = [openFoot];
    for (let k = Math.ceil(openFoot * per + 1e-9); k / per < openHead - 1e-9; k++) us.push(k / per);
    us.push(openHead);
    out.rails.push(us.map((u) => add3(o.axis(railY(u) + railH), mul3(dir(o.start + u * dPhi), outer))));
  }
  const foot = add3(o.axis(o.y0), mul3(dir(o.start), mid));
  const head = add3(o.axis(o.y1), mul3(dir(o.start + slots * dPhi), mid));
  const on = (slot: number, y: number): Vec3 => add3(o.axis(y), mul3(dir(o.start + slot * dPhi), mid));
  const line: WalkPoint[] = [{ at: foot, step: 0 }];
  for (let i = 1; i <= o.risers; i++) {
    const y = o.y0 + i * rise;
    line.push({ at: on(slotOf(i) + 0.5, y), step: i });
    if (after.includes(i)) {
      for (let s = 1; s <= span; s++) line.push({ at: on(slotOf(i) + 0.5 + s, y), step: i });
    }
  }
  line.push({ at: head, step: o.risers });
  out.flights.push({
    name: o.name,
    kind: "spiral",
    risers: o.risers,
    rise,
    going: mid * dPhi,
    foot,
    head,
    // Walking counter-clockwise from frameX toward frameZ.
    enter: dir(o.start + Math.PI / 2),
    leave: dir(o.start + slots * dPhi + Math.PI / 2),
    slab: o.slab,
    width: o.tread,
    axis: o.axis(o.y0),
    diameter: o.diameter,
    line,
  });
  return out;
}

export interface LadderSpec {
  readonly name: string;
  /** Its foot and head on the ladder's centre line (a leaning ladder's head is further along `facing`). */
  readonly foot: Vec3;
  readonly head: Vec3;
  readonly risers: number;
  /** Between the stiles' axes. */
  readonly width: number;
  /** The horizontal direction the climber faces. */
  readonly facing: Vec3;
  readonly slab: boolean;
  /** The stiles' reach above the head (below it, negative): by default 0.9, or under a slab's 0.10. */
  readonly above?: number;
  /**
   * Rungs the ladder goes on down with below its foot, at its pitch, and
   * its stiles with them: a ladder the walk joins part way up. They are
   * frame, not steps.
   */
  readonly down?: number;
  /** The level its stiles stand on, where it is not its lowest rung's (a ladder run on down to a deck). */
  readonly floor?: number;
}

/** A ladder: a rung at every pitch (the last left out where a slab takes it) between two flat stiles. */
export function ladder(o: LadderSpec): StairParts {
  const out = empty();
  const across = unit3(cross3(o.facing, UP));
  const rise = (o.head[1] - o.foot[1]) / o.risers;
  const last = o.slab ? o.risers - 1 : o.risers;
  const line: WalkPoint[] = [{ at: o.foot, step: 0 }];
  for (let i = 1; i <= o.risers; i++) {
    const c = add3(o.foot, mul3(sub3(o.head, o.foot), i / o.risers));
    line.push({ at: c, step: i });
    if (i <= last) out.treads.push({ at: c, x: o.facing, y: UP, size: [RUNG, RUNG, o.width] });
  }
  const top = o.above ?? (o.slab ? -LANDING : 0.9);
  const lift = sub3(o.head, o.foot);
  const toTop = mul3(lift, 1 + top / lift[1]);
  const down = o.down ?? 0;
  const step = mul3(lift, 1 / o.risers);
  for (let k = 0; k < down; k++) out.frame.push({ at: sub3(o.foot, mul3(step, k)), x: o.facing, y: UP, size: [RUNG, RUNG, o.width] });
  const low = down > 0 ? sub3(o.foot, mul3(step, down)) : o.foot;
  const base: Vec3 = o.floor === undefined ? low : [low[0], o.floor, low[2]];
  const toTopFromBase = add3(toTop, sub3(o.foot, base));
  for (const side of [-1, 1]) {
    // A few millimetres off the floor they stand on.
    const a = add3(add3(base, mul3(across, (side * (o.width + 0.012)) / 2)), [0, 0.005, 0]);
    const s = member(a, add3(a, toTopFromBase), 0.012, o.facing);
    out.frame.push({ ...s, size: [s.size[0], 0.06, 0.012] });
  }
  const going = Math.hypot(lift[0], lift[2]) / o.risers;
  out.flights.push({ name: o.name, kind: "ladder", risers: o.risers, rise, going, foot: o.foot, head: o.head, enter: o.facing, leave: o.facing, slab: o.slab, width: o.width, line });
  return out;
}

// ---------------------------------------------------------------------------
// 1. Ground → 1st floor

/**
 * The ground → 1st floor stair of piles 2 and 4, PL-XXVIII [sourced unless
 * noted], built in pile 4's frame; pile 2's is the same, turned (the
 * Nota, « La disposition dans la pile 4 est la même, le départ au
 * Rez-de-Chée diffère seul (Voir fig 5 planche XVIII) », sends pile 4's
 * start to PL-XVIII Fig. 5, not read here: its start is pile 2's
 * [estimated]).
 * « L'escalier de la pile 2 sert à la montée, l'autre à la descente »
 * [sourced E1900-TXT p. 81]: the count is one of them.
 *
 * Each 11.00 panel of the leg, node to node, holds one repeat of Fig. 5:
 * the landing P4 at the node, 1.300; T3, « 23 marches de 0.15933 » and a
 * 0.172 step onto its landing, so 24 risers in « 3.8366 », its run
 * « 6.020 » (« 23 marches de 250 », « 5.750 », and « 270 »); the landing
 * Pm, 1.00; T3 again; the landing Pa, 1.300; then T4, « 19 marches de
 * 0.15933 » and two steps of 0.1498, so 21 risers in « 3.3268 », back out
 * « 5.220 » (« 0.235 », « 4.75 », « 0.235 ») to the next node's P4, 7.820
 * further in (Fig. 1). The running part is « comprise entre … (39.90) et …
 * (83.90) », nodes XXVIII to XXIV: 4 × 69 = 276 risers [sourced].
 *
 * The start, 4.82 from « Sol du Rez-de-Chaussée (35.08) » to the first P4
 * [sourced], and the arrival, the 7.23 of panel 5 to the 1st floor
 * [sourced E1900-TXT p. 81], carry the rest of the count: 347 − 276 = 71
 * [derived]. The start is ONE flight at 45° to the diagonal in plan (Fig.
 * 37), on the stair's 0.250 treads. The arrival is modelled as a T3 to a
 * Pm and one flight on inward to the floor (Fig. 2's turns, T2, T and T1
 * about the landings pl and pl1, are not built): 24 risers, then 19 of
 * 0.1786 on 0.250 treads [derived: the count].
 *
 * THE PLATES AND THE BOOK DISAGREE BY FOUR STEPS HERE. Fig. 37 prints the
 * start « 7.50 » long [sourced], 30 treads of 0.250, 5.30 in the diagonal
 * elevation (Fig. 1 draws 4.96-5.3 [measured]), and at the plates' own
 * riser the arrival takes 24 + 21: 351 in all, against p. 304's 347. The
 * model keeps the book's count and takes the four out of the two flights
 * no plate counts, two each: the start 28 of 0.1721, 7.00 long (4.95 in
 * the elevation), and the last 19 of 0.1786, both 8-12% over the 0.15933
 * [open decision; until 2026-09-26 they were 30 and 21, the 351].
 *
 * WHERE IN THE LEG. Along the diagonal each P4's outer end stands « 2.05 »
 * in from c's axis (Fig. 1, Fig. 5 « 2.050 »; « 12.642 » closes on it).
 * Across it the lanes straddle the diagonal (Fig. 1 bis, the section RS at
 * 1:200, 77.9 px/m on its « 3.927 »): T3's axis 1.05 to one side, T4's
 * 0.92 to the other, 1.00 wide each, over the car's path [measured]. Which
 * side is which follows the section read as a plan from above with c to
 * the left, pile 2 Est: T3 toward pile 3 Sud, T4 toward pile 1 Nord
 * [estimated hand]. The innermost landing Pa then stands 3.8 above the
 * rail line, square to it (3.71 under its plate), and the car reaches 3.30.
 * The start lands on P4's inner edge in T4's lane, from the T4 side
 * [estimated side]. Its foot is the rez-de-chaussée, 1.58, inside the
 * leg; the masonry pedestal of `platforms.ts` stands clear of it.
 *
 * Its frame: stringers « U de 350 mm » [sourced text], hand rails 1.00
 * over the nosing line [sourced PL-XXVIII Figs 30, 33, « 1.000 »] on posts.
 */
export const GROUND_STAIR = {
  p4: 1.3,
  pm: 1.0,
  pa: 1.3,
  t3: { risers: 24, rise: 3.8366, run: 6.02 },
  t4: { risers: 21, rise: 3.3268, run: 5.22 },
  fromC: 2.05,
  laneT3: -1.05,
  laneT4: 0.92,
  width: 1.0,
  ground: 1.58,
  start: { risers: 28, going: 0.25 },
  last: { risers: 19, going: 0.25 },
  rail: 1.0,
  stringer: { depth: 0.35, thick: 0.06 },
  arrivalWidth: 1.2,
} as const;

export function groundToFirst(): StairParts {
  const S = GROUND_STAIR;
  const parts: StairParts[] = [];
  const l0 = Math.min(S.laneT3, S.laneT4) - S.width / 2;
  const l1 = Math.max(S.laneT3, S.laneT4) + S.width / 2;
  const landings: Block[] = [];
  // A landing from rOut inward by `along`, over both lanes or T3's alone.
  // Near c the leg's faces close in at 45°, and at a node their horizontal
  // struts with them: 0.80 square on the faces' planes, leaning with the
  // face, they reach 0.44 in from the plane at a landing's top. A landing
  // keeps 0.50 clear of those planes (in plan, square to them), so a P4
  // loses the two corners the faces take, 0.08 of T4's lane and 0.21 of
  // T3's at its outer end [derived]; the plate's P4 hangs from its own
  // « Poutre P4 » there.
  const FACE = 0.5 * SQ2;
  const box2 = (rIn: number, rOut: number, y: number, lo: number, hi: number) => {
    if (rOut - rIn > 1e-6 && hi - lo > 1e-6) {
      landings.push(pad(onDiag((rIn + rOut) / 2, y, (lo + hi) / 2), U, rOut - rIn, hi - lo));
    }
  };
  const landing = (rOut: number, y: number, along: number, both: boolean) => {
    const lo = both ? l0 : S.laneT3 - S.width / 2;
    const hi = both ? l1 : S.laneT3 + S.width / 2;
    const c = cornerC(y);
    const room = (r: number) => c - r - FACE;
    const rIn = rOut - along;
    const w = room(rOut);
    box2(rIn, rOut, y, Math.max(lo, -w), Math.min(hi, w));
    if (lo < -w) box2(rIn, Math.min(rOut, c - FACE + lo), y, lo, -w);
    if (hi > w) box2(rIn, Math.min(rOut, c - FACE - hi), y, w, hi);
  };
  const flight = (name: string, r0: number, y0: number, r1: number, y1: number, l: number, risers: number) =>
    parts.push(
      straight({
        name,
        foot: onDiag(r0, y0, l),
        head: onDiag(r1, y1, l),
        risers,
        width: S.width,
        slab: true,
        rail: S.rail,
        stringer: S.stringer,
      }),
    );
  const nodes = NODES.map((n) => n.y).filter((y) => y >= 6.4 - 1e-6 && y <= 50.4 + 1e-6);
  const first = nodes[0] as number;
  // The start: one flight at 45° in plan, up and out onto the first P4's
  // inner edge in T4's lane.
  const rLand = cornerC(first) - S.fromC - S.p4;
  const reach = (S.start.risers * S.start.going) / SQ2;
  const lSide = Math.sign(S.laneT4);
  parts.push(
    straight({
      name: "ground.start",
      foot: onDiag(rLand - reach, S.ground, S.laneT4 + lSide * reach),
      head: onDiag(rLand, first, S.laneT4),
      risers: S.start.risers,
      width: S.width,
      slab: true,
      rail: S.rail,
      stringer: S.stringer,
    }),
  );
  // The running part: one repeat per panel.
  for (let k = 0; k < nodes.length; k++) {
    const y = nodes[k] as number;
    const r0 = cornerC(y) - S.fromC;
    landing(r0, y, S.p4, true);
    if (k === nodes.length - 1) break;
    const rPm = r0 - S.p4 - S.t3.run;
    flight(`ground.p${k + 1}.t3a`, r0 - S.p4, y, rPm, y + S.t3.rise, S.laneT3, S.t3.risers);
    landing(rPm, y + S.t3.rise, S.pm, false);
    const rPa = rPm - S.pm - S.t3.run;
    flight(`ground.p${k + 1}.t3b`, rPm - S.pm, y + S.t3.rise, rPa, y + 2 * S.t3.rise, S.laneT3, S.t3.risers);
    landing(rPa, y + 2 * S.t3.rise, S.pa, true);
    flight(`ground.p${k + 1}.t4`, rPa, y + 2 * S.t3.rise, rPa + S.t4.run, y + 2 * S.t3.rise + S.t4.rise, S.laneT4, S.t4.risers);
  }
  // The arrival: a T3 to a Pm, then straight on to the 1st floor.
  const yTop = nodes[nodes.length - 1] as number;
  const rTop = cornerC(yTop) - S.fromC - S.p4;
  const rPm = rTop - S.t3.run;
  flight("ground.arrival.t3", rTop, yTop, rPm, yTop + S.t3.rise, S.laneT3, S.t3.risers);
  landing(rPm, yTop + S.t3.rise, S.pm, false);
  const rEnd = rPm - S.pm - S.last.risers * S.last.going;
  flight("ground.arrival.last", rPm - S.pm, yTop + S.t3.rise, rEnd, FLOORS.first, S.laneT3, S.last.risers);
  // The landing it arrives on at the 1st floor fills the deck's opening
  // (`platforms.ts` STAIR_OPENINGS.ground): T3's lane and its rails, 0.60
  // either side of the lane's axis, the P4's 1.300 long.
  landings.push(pad(onDiag(rEnd - S.p4 / 2, FLOORS.first, S.laneT3), U, S.p4, S.arrivalWidth));
  return joinStairs(...parts, { ...empty(), landings });
}

// ---------------------------------------------------------------------------
// 2. 1st → 2nd floor: e1

/** e1's joining flights: 11 risers of 0.207, treads 0.255 [sourced E1900-TXT p. 81]. */
export const E1_FLIGHT = { risers: 11, riser: 0.207, tread: 0.255 } as const;
/**
 * e1's last helix runs through panels 10 and 11 to about 112.3 (PL-XX Fig.
 * 3), and a straight flight takes it on inward to the 2nd floor, drawn
 * 3.2-3.4 high and about 5 long at 81.5 px/m [measured]: 19 risers of
 * 0.178, 3.38, on the joining flights' 0.255 treads, 4.85.
 */
export const E1_TOP = { risers: 19, riser: 0.178 } as const;
/**
 * The helices: « de 0,60 m de largeur », « Escalier tournant de 1m60 de
 * diamètre », treads « de 640 mm », « marches d'une hauteur de 178 mm »
 * [sourced E1900-TXT p. 81, PL-XX legend]. With the joining flights and
 * the last flight as printed, the helices carry 327 − 4 × 11 − 19 = 264 of
 * the count, 0.1728 each, 3% under the printed 178 [derived: the count;
 * at 0.178 they were 257, the run 320]. Hand rails « trois lisses en
 * fer rond » [sourced p. 81]: the model's one rail stands 0.90 over the
 * treads [estimated].
 */
export const E1 = { diameter: 1.6, tread: 0.64, helixRisers: 264, rail: 0.9 } as const;

/** Share `total` among parts in proportion to `weights`, largest remainders first. */
function share(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    out[i] = (out[i] as number) + 1;
  }
  return out;
}

/**
 * The 1st → 2nd floor stair in one leg (e1, the same in all four): a helix
 * of Ø 1.60 per panel 6-9 and one through panels 10-11 (PL-XX Fig. 3), set
 * in from the outer corner c by 2.4 along the diagonal where the leg is
 * narrowest, at the top of the helix's panel [estimated], each at least
 * 3.0 inside the one below it. Straight flights of 11 risers join them,
 * inward along the diagonal, with treads of 0.255 [sourced counts]: where
 * two axes are nearer than the flight's run plus a diameter, it leaves the
 * lower helix and meets the upper one off the diagonal, at the angle that
 * makes its run 2.805 [derived].
 */
export function firstToSecond(): StairParts {
  const ys = NODES.map((n) => n.y).filter((y) => y >= 57.4 && y <= 100.6 + 1e-6);
  const RISE = E1_FLIGHT.risers * E1_FLIGHT.riser;
  const RUN = E1_FLIGHT.risers * E1_FLIGHT.tread;
  const top = FLOORS.second - E1_TOP.risers * E1_TOP.riser;
  const OUTER = E1.diameter / 2;
  // Each helix's rise, and the height where the leg is narrowest for it.
  const spans: Array<readonly [number, number, number]> = [];
  for (let k = 0; k + 1 < ys.length; k++) {
    const y0 = k === 0 ? FLOORS.first : (ys[k] as number) + RISE / 2;
    spans.push([y0, (ys[k + 1] as number) - RISE / 2, ys[k + 1] as number]);
  }
  spans.push([(ys[ys.length - 1] as number) + RISE / 2, top, top]);
  const risers = share(E1.helixRisers, spans.map(([y0, y1]) => y1 - y0));
  const axes: number[] = [];
  for (let k = 0; k < spans.length; k++) {
    const want = cornerC((spans[k] as readonly [number, number, number])[2]) - 2.4;
    axes.push(k === 0 ? want : Math.min(want, (axes[k - 1] as number) - 3.0));
  }
  // The angle off the diagonal at which each joining flight leaves and
  // meets the helices: 0 when the axes are far enough apart.
  const beta = axes.slice(1).map((r, k) => {
    const gap = (axes[k] as number) - r;
    return Math.acos(Math.min(1, Math.max(0, (gap - RUN) / (2 * OUTER))));
  });
  const parts: StairParts[] = [];
  const last = axes.length - 1;
  // The helices, and the flight that leaves each (the last's, `e1.top`).
  const helices: StairParts[] = [];
  const flights: StairParts[] = [];
  // Every helix is entered and left across its outer edge: from the floor
  // at the first one's foot, by a joining flight or the last flight
  // otherwise, each running along the diagonal and meeting the edge at the
  // angle b off it. Its rail stops where the flight's band, its half width
  // and a stringer either side of its centre line, crosses the edge
  // [derived].
  const band = (E1.tread / 2 + 0.06) / OUTER;
  const open = (b: number) => Math.asin(Math.min(1, Math.sin(b) + band)) - b;
  for (let k = 0; k <= last; k++) {
    const r = axes[k] as number;
    const [y0, y1] = spans[k] as readonly [number, number, number];
    const start = k === 0 ? 0 : (beta[k - 1] as number);
    const end = k === last ? Math.PI : Math.PI - (beta[k] as number);
    const n = risers[k] as number;
    helices.push(
      spiral({
        name: `e1.helix${k + 1}`,
        axis: (y) => onDiag(r, y),
        frameX: U,
        frameZ: E,
        y0,
        y1,
        risers: n,
        diameter: E1.diameter,
        tread: E1.tread,
        start,
        turns: turnsBetween(n, start, end),
        slab: false,
        rail: E1.rail,
        railOpen: { foot: open(start), head: open(Math.PI - end) },
        // The first stands on the 1st floor; the others from the underside
        // of the pad at their foot (below), which the flight arriving
        // carries: until 2026-09-26 they hung 0.5 under it in the air.
        newel: k === 0 ? { below: 0, above: 0.5 } : { below: LANDING, above: 0.5 },
      }),
    );
    // Where a flight arrives at a helix, a pad at the flight's level,
    // square to the helix's radius at the angle it is met, from the newel
    // out to the arriving flight's last nosing and as wide as the flight's
    // band: the flight's stringers and last tread are fixed to it, and it
    // to the newel, which stands on it; the walker steps onto it and up
    // the helix's first tread [estimated: the plates read do not draw the
    // joins; until 2026-09-26 there was nothing there, the walking line's
    // foot was in the air, and every helix but the first and every joining
    // flight hung in the air].
    if (k > 0) {
      const d = add3(mul3(U, Math.cos(start)), mul3(E, Math.sin(start)));
      const reach = OUTER - 0.015;
      parts.push({ ...empty(), landings: [pad(add3(onDiag(r, y0), mul3(d, reach / 2)), d, reach, E1.tread + 2 * 0.06)] });
    }
    if (k < last) {
      const b = beta[k] as number;
      const rNext = axes[k + 1] as number;
      const l = OUTER * Math.sin(b);
      flights.push(
        straight({
          name: `e1.flight${k + 1}`,
          foot: onDiag(r - OUTER * Math.cos(b), y1, l),
          head: onDiag(rNext + OUTER * Math.cos(b), y1 + RISE, l),
          risers: E1_FLIGHT.risers,
          width: E1.tread,
          slab: false,
          rail: E1.rail,
        }),
      );
    }
  }
  // Off the last helix's inner side, straight on to the 2nd floor.
  const rTop = (axes[last] as number) - OUTER;
  flights.push(
    straight({
      name: "e1.top",
      foot: onDiag(rTop, top),
      head: onDiag(rTop - E1_TOP.risers * E1_FLIGHT.tread, FLOORS.second),
      risers: E1_TOP.risers,
      width: E1.tread,
      slab: true,
      rail: E1.rail,
    }),
  );
  // Its last riser lands on a landing at the deck's level that fills the
  // deck's opening from that riser in to the opening's inner end,
  // `platforms.ts` STAIR_OPENINGS.e1 restated: t 17.105 − 3.97 / 2, 0.40
  // either side of the diagonal. Until 2026-09-26 the last riser landed on
  // the open well, 0.38 short of the deck, and the flight's stringers,
  // inside the well, touched nothing [derived].
  const wellIn = 17.105 - 3.97 / 2;
  const lastRiser = rTop - (E1_TOP.risers - 1) * E1_FLIGHT.tread;
  parts.push({ ...empty(), landings: [pad(onDiag((lastRiser + wellIn) / 2, FLOORS.second), U, lastRiser - wellIn, 0.8)] });
  // Each helix's hand rail runs on to the post the flight either side of
  // it starts or ends its own rail on, on the side of the flight's centre
  // line the helix's rail ends on: it stopped where the flight's band
  // crosses the helix's edge (`railOpen`), 0.10-0.85 short of that post
  // (the further the more the flight meets the helix off its radius) and
  // level with its top, so helix and flight held nothing of one another,
  // and a flight left a helix in the air [derived]. The rail is then one
  // from flight to helix to flight, and never crosses the flight's band.
  const sameSide = (p: Vec3, f: StairParts, end: 0 | 1): Vec3 => {
    const { foot, head } = f.flights[0] as Flight;
    const side = (q: Vec3) => Math.sign((head[0] - foot[0]) * (q[2] - foot[2]) - (head[2] - foot[2]) * (q[0] - foot[0]));
    const ends = f.rails.map((x) => x[end === 0 ? 0 : x.length - 1] as Vec3);
    return ends.find((q) => side(q) === side(p)) as Vec3;
  };
  helices.forEach((h, k) => {
    const rail = h.rails[0] as Vec3[];
    rail.push(sameSide(rail[rail.length - 1] as Vec3, flights[k] as StairParts, 0));
    if (k > 0) rail.unshift(sameSide(rail[0] as Vec3, flights[k - 1] as StairParts, 1));
  });
  return joinStairs(...helices.flatMap((h, k) => [h, flights[k] as StairParts]), ...parts);
}

// ---------------------------------------------------------------------------
// 3 and 4. The service stairs in the shaft: e2 and e3

/**
 * « De distance en distance de petits paliers correspondant à trois
 * marches facilitent la montée » [sourced E1900-TXT p. 81]: a landing is
 * three treads' angle, rising nothing. How far apart is not printed; the
 * sections sold when the stair was cut up in 1983 were « 2.60 » to a
 * landing, « 14 marches » [sourced, secondary AUC-ARTC], so a landing
 * every 14 risers [estimated for 1889].
 *
 * None in the last turn: the flight that leaves each helix at its head
 * (e2's dog-leg, e3's raccord) and the pad it starts from cross over that
 * turn, and a turn with a landing in it climbs three treads' angle less, so
 * under them it gave 1.3 m of headroom (the walk found it, frame 06). With
 * a whole turn of treads, 15 slots, the last turn stands 14 risers, 2.46,
 * under the head [derived; the landings' spacing is the estimate above,
 * and where the plates put the last one is not read].
 *
 * And a turn to each landing: 14 risers and the landing's three treads'
 * angle, 17 slots, where the helices without landings take about 15. Read
 * as one turn, the 1983 sections' « 2.60 » with « 14 marches » is that
 * pitch [inference]; at 15 slots a turn, a turn with a landing in it
 * climbed 12 risers, 2.1, and the tread above and behind the walker came
 * to 1.76 over his feet (the walk's clearance, every turn). At 17 each
 * turn climbs 14 risers, 2.46, and the landings stand one above the other
 * (e3's upper helix, which must end where the little stair starts, takes
 * a little more, 18.2, never less).
 */
export const SERVICE_LANDINGS = { every: 14, span: 3, headClear: 15, perTurn: 17 } as const;

/**
 * The service stairs in the shaft, placed from the plans (PL-XIX Fig. 14,
 * the landing, 1:200 at 81.3 px/m on its printed 11.337; Fig. 7, the 2nd
 * floor; Fig. 9, the 3rd floor at 79 px/m on its 16.560), as (s, t): s
 * toward pile 3 Sud, t toward pile 4 Ouest.
 */
export const SHAFT_STAIRS = {
  /**
   * e2, Ø 1.600 with 0.600 treads [sourced PL-XX Figs 2-3], at (-2.8, 1.3):
   * under the upper car's berth, between its cylinders, the same on three
   * plans within 0.3 [measured]. Its helix stops at (225.60), 3.83 under
   * the landing, where « 16 marches 2.92 » and « 5 marches 0.91 » take over
   * [sourced PL-XX Fig. 2]. PL-XX draws the first flight end-on, so it runs
   * across the car line, Ouest; Fig. 14 has the landing open there, « 2.62 »
   * × « 2.45 », at s -2.73 … -0.11, t 3.40 … 5.85, labelled « Escalier de
   * l'étage intermédiaire au 2e étage » [sourced; measured]. So the 16 run
   * Ouest under the floor, turn on a landing by the edge girder, and the 5
   * come back up into that opening [the dog-leg and the 16's 0.184 treads
   * estimated]. The 16 start where the helix's walking line, run on
   * straight from its head, leaves its circle, 0.62 on, with a pad from
   * the head to there over the last turn (2.18 of headroom under it, the
   * last turn having no landing: `SERVICE_LANDINGS`); started on the
   * walking line (until 2026-09-26, 0.15 on) their first 0.65 and
   * stringers stood 1.3 over the last turn, and they passed the deck's
   * edge 0.12 from the eye. They turn on a landing as deep as a lane is
   * wide, 0.60 (0.90 until 2026-09-26), which stops 0.08 short of the edge
   * girder facing pile 4 [estimated], and the 5, on 0.20 goings
   * [estimated], land on a landing at the deck's level that runs on to the
   * opening's near edge, t 3.22 (`platforms.ts` LANDING.wells, restated):
   * 0.85 of it, inside the opening. The helix carries the rest of the
   * row's 456: 435
   * risers of 0.1756 in its 76.37, 1.4% under the helices' 0.178 [derived:
   * the count]. Its foot, « 11 marches 1.974 » up to a platform at (151.16)
   * [sourced PL-XX Fig. 2], is not built: the helix starts on the floor.
   */
  e2: { s: -2.8, t: 1.3, diameter: 1.6, tread: 0.6, top: FLOORS.landing - 3.83, helixRisers: 435, rail: 0.9 },
  e2Flights: { up: 16, upRise: 2.92, upGoing: 0.184, back: 5, backGoing: 0.2, turn: 0.6, width: 0.6, opening: 4.4435 - 2.45 / 2 },
  /**
   * e3, Ø 1.680 [sourced PL-XX Figs 1-2], at (3.0, 3.3) on the landing,
   * beside the lower car's well and 0.36 clear of it [measured, Fig. 14;
   * PL-XX's section draws it over the car only because it projects onto the
   * car line]. Built at t 3.2, inside the reading's ±0.1: at node III the
   * plan bracing's diamond side stands at t 4.175, and 3.3 would put its
   * hand rail on the chord [derived]. « 314 marches sur une hauteur de
   * 54m88 » to the « escalier de raccord (Panneau 26-27) », « 13 marches »,
   * « 2.327 » [sourced PL-XX Figs 1-2], which shifts it toward the axis:
   * to u 1.3 on PL-XX Fig. 1, and on the 3rd floor's plan the helix stands
   * at (1.36, 1.29) [measured; Fig. 9 labels that helix for the stair on up
   * to the apartment, and the model takes e3's upper helix to stand under
   * it]. The upper helix carries the rest of the row's 455 to the 3rd
   * floor: 128 risers of 0.1796 [derived: the count]. The row prints the
   * level as « 312.21 », the apartment's and the gallery's, 2.58 higher;
   * closing there, those 128 would be 0.1998, 14% over the rest of the
   * stair, where to the 3rd floor they sit on the helices' 0.178. So the
   * 455 is read to the 3rd floor, and the 2.58 above it is the 125's
   * [inference].
   */
  e3: { s: 3.0, t: 3.2, diameter: 1.68, tread: 0.64, steps: 314, rise: 54.88, rail: 0.9 },
  e3Raccord: { risers: 13, rise: 2.327 },
  e3Upper: { s: 1.36, t: 1.29, risers: 128 },
} as const;

/** 3. e2: the service helix from the 2nd floor to the landing, and its dog-leg. */
export function secondToLanding(): StairParts {
  const { e2, e2Flights: f } = SHAFT_STAIRS;
  const start = Math.PI / 2;
  const slots = spiralSlots(e2.helixRisers, SERVICE_LANDINGS);
  const helix = spiral({
    name: "e2.helix",
    axis: (y) => inShaft(e2.s, y, e2.t),
    frameX: S_HAT,
    frameZ: T_HAT,
    y0: FLOORS.second,
    y1: e2.top,
    risers: e2.helixRisers,
    diameter: e2.diameter,
    tread: e2.tread,
    start,
    turns: turnsBetween(slots, start, 0, SERVICE_LANDINGS.perTurn),
    landings: SERVICE_LANDINGS,
    slab: false,
    rail: e2.rail,
    newel: { below: 0, above: 0.5 },
  });
  const walk = e2.diameter / 2 - e2.tread / 2;
  const laneUp = e2.s + walk;
  const laneBack = laneUp + f.width;
  // Straight on from the head, over a pad, to where the walking line
  // leaves the helix's circle.
  const tFoot = e2.t + Math.sqrt((e2.diameter / 2) ** 2 - walk ** 2);
  const tTurn = tFoot + f.up * f.upGoing;
  const onPad = pad(inShaft(laneUp, e2.top, (e2.t + tFoot) / 2), T_HAT, tFoot - e2.t, f.width);
  const yTurn = e2.top + f.upRise;
  const up = straight({
    name: "e2.up",
    foot: inShaft(laneUp, e2.top, tFoot),
    head: inShaft(laneUp, yTurn, tTurn),
    risers: f.up,
    width: f.width,
    slab: true,
  });
  const turn: StairParts = { ...empty(), landings: [onPad, pad(inShaft((laneUp + laneBack) / 2, yTurn, tTurn + f.turn / 2), T_HAT, f.turn, 2 * f.width)] };
  const tBack = tTurn - f.back * f.backGoing;
  const back = straight({
    name: "e2.back",
    foot: inShaft(laneBack, yTurn, tTurn),
    head: inShaft(laneBack, FLOORS.landing, tBack),
    risers: f.back,
    width: f.width,
    slab: true,
    stringerHead: 1,
  });
  // Their last riser lands on a landing at the deck's level, from its
  // last going on to the opening's near edge.
  const arrive: StairParts = {
    ...empty(),
    landings: [pad(inShaft(laneBack, FLOORS.landing, (f.opening + tBack + f.backGoing) / 2), T_HAT, tBack + f.backGoing - f.opening, f.width)],
  };
  return joinStairs(helix, up, turn, back, arrive);
}

/**
 * The angle e3's lower helix leaves by and its upper helix starts at: the
 * raccord runs straight along the line of the two axes, tangent to both on
 * their walking line. Walking counter-clockwise, the tangent at angle a is
 * (-sin a, cos a): the angle whose tangent runs from the lower axis toward
 * the upper.
 */
/**
 * The angle the little stair starts at, where e3's upper helix arrives:
 * the far edge of the sector the apartment's floor closes, which its head
 * steps onto. PL-XIX Fig. 6 draws that sector from 146° to 229° round the
 * stair's axis in the world's plan (atan2(z, x), toward the tower's axis,
 * -x) [measured], so in the diagonals' frame from 191°
 * (`SUMMIT_STAIRS.little.closed`) on 83° (`arrival`).
 */
function littleFoot(): number {
  const lt = SUMMIT_STAIRS.little;
  return lt.closed + lt.arrival;
}

function e3Toward(): number {
  const { e3, e3Upper } = SHAFT_STAIRS;
  return Math.atan2(-(e3Upper.s - e3.s), e3Upper.t - e3.t);
}

/** 4. e3: up from the landing, entering on its -s side, to the raccord, and its upper helix on to the 3rd floor. */
export function landingToThird(): StairParts {
  const { e3, e3Raccord: rc, e3Upper } = SHAFT_STAIRS;
  const riser = e3.rise / e3.steps;
  const yRaccord = FLOORS.landing + e3.rise;
  const yUpper = yRaccord + rc.rise;
  const toward = e3Toward();
  const start = Math.PI;
  const lowerSlots = spiralSlots(e3.steps, SERVICE_LANDINGS);
  const lower = spiral({
    name: "e3.lower",
    axis: (y) => inShaft(e3.s, y, e3.t),
    frameX: S_HAT,
    frameZ: T_HAT,
    y0: FLOORS.landing,
    y1: yRaccord,
    risers: e3.steps,
    diameter: e3.diameter,
    tread: e3.tread,
    start,
    turns: turnsBetween(lowerSlots, start, toward, SERVICE_LANDINGS.perTurn),
    landings: SERVICE_LANDINGS,
    slab: false,
    rail: e3.rail,
    newel: { below: 0, above: 0.5 },
  });
  const mid = e3.diameter / 2 - e3.tread / 2;
  const side = mul3(dirST(toward), mid);
  const raccord = straight({
    name: "e3.raccord",
    foot: add3(inShaft(e3.s, yRaccord, e3.t), side),
    head: add3(inShaft(e3Upper.s, yUpper, e3Upper.t), side),
    risers: rc.risers,
    width: e3.tread,
    slab: false,
    rail: e3.rail,
  });
  const upperSlots = spiralSlots(e3Upper.risers, SERVICE_LANDINGS);
  const frac = ((((littleFoot() - toward) / (2 * Math.PI)) % 1) + 1) % 1;
  const upperTurns = Math.max(1, Math.floor(upperSlots / SERVICE_LANDINGS.perTurn - frac)) + frac;
  const upper = spiral({
    name: "e3.upper",
    axis: (y) => inShaft(e3Upper.s, y, e3Upper.t),
    frameX: S_HAT,
    frameZ: T_HAT,
    y0: yUpper,
    y1: FLOORS.third,
    risers: e3Upper.risers,
    diameter: e3.diameter,
    tread: e3.tread,
    start: toward,
    // It ends where the little stair starts (`littleFoot`), a turn to
    // every landing or a little more.
    turns: upperTurns,
    landings: SERVICE_LANDINGS,
    // It arrives inside the 3rd floor's well, where the little stair
    // starts from its last tread (`thirdToSummit`): no slab, and the newel
    // stops at the floor.
    slab: false,
    rail: e3.rail,
    newel: { below: 0.5, above: 0 },
  });
  return joinStairs(lower, raccord, upper);
}

// ---------------------------------------------------------------------------
// 5. 3rd floor → summit

/**
 * The climb from the 3rd floor to the top platform, 125 steps [sourced
 * E1900-TXT p. 304], by the stairs PL-XIX Fig. 3 names on the elevation
 * [sourced labels] and the plans place:
 *
 * 1. « Escalier conduisant au logement de M. Eiffel »: « un petit
 *    escalier tournant » [sourced p. 216], "1.60" across [sourced PL-XIX
 *    Fig. 6], centred 1.85 out on the +x axis [measured PL-XIX Figs 6, 9]
 *    (`summit.ts` ROOM_WELLS opens the balcony and the pavilion's floor for
 *    it), from the 3rd floor to the apartment's floor, « Niveau du plancher
 *    (312.21) du logement », 2.58 [sourced]. Fig. 6 draws the apartment's
 *    floor closing 83° of its circle on the tower's axis side (146° to
 *    229° round its axis in the world's plan) [measured, 63.5 px/m at full
 *    resolution]: the stair turns the other 277°, from that sector's far
 *    edge, where e3's upper helix now arrives (`littleFoot`), round to its
 *    near edge, and its head steps onto it (`arrival`, `closed`); until
 *    2026-09-26 it turned a whole turn from e3's raccord's line and ended
 *    in the open well, 0.45 from the floor. Figs 6, 9 and 3 may turn it
 *    the other way round [low-medium confidence]; the model keeps e3's
 *    hand.
 * 2. « Escalier établi sur la Terrasse du logement de M. Eiffel », from the
 *    gallery (« Cette galerie à ciel ouvert, placée à la cote + 312,21 »,
 *    the terrace) up to the roof and over it toward the girder: PL-XIX
 *    Fig. 8 (the section EF at the roof, 60 px/m on its « 10.680 »),
 *    « Escaliers d'accès au Campanile », draws a flight on the gallery
 *    along the +x wall, « 2.420 » long [sourced] and « 54 » wide [sourced,
 *    the digit read as 0.54], at x 5.37-5.95, z +1.50 to −0.92, climbing
 *    toward −z [measured]; at its head a landing outside the roof's edge;
 *    and a second flight from there over the roof, diagonally inward, to
 *    the foot of stair 3 beside the continuous girder [measured; its rise
 *    estimated]. Fig. 6's 0.62 × 1.00 on the gallery is the part of the
 *    first flight under Fig. 6's cutting plane. The model: the wall
 *    flight from the balcony's deck (2.43, `summit.ts`) to the roof's top
 *    (4.85) over 2.42, its stringer 0.06 clear of the roof's edge; the landing at
 *    its head; the diagonal flight on up to a landing at stair 3's foot.
 * 3. « Escalier établi sur le côté de la poutre en diagonale continue »:
 *    PL-XIX Fig. 5 (the section GH, 59.9 px/m on its « 10.680 ») draws it
 *    hatched beside the continuous girder, « Escalier conduisant à
 *    l'escalier du campanile », « 2.85 » long, its centre line 0.98 off the
 *    girder's axis toward pile 4 Ouest (+t), s about 1.0 to 3.8 [measured]:
 *    up and inward from the landing at its foot to the girders' top.
 * 4. « Escalier du Campanile », round the core: « 22 marches de 178 =
 *    3.916 » from the girders' top to the « Palier », "1.980" across, the
 *    landing's railing « 1.200 » [sourced PL-XV Fig. 2], and « Porte
 *    d'entrée dans le cylindre de l'escalier 2.00 » at the landing [sourced
 *    ibid.]. Treads 0.633 radially: the 0.99 envelope less 0.357, the
 *    core's 16-sided prism to its corners (`summit.ts` LADDER, round the
 *    0.70 across its flats), so every tread's inner end comes to within
 *    7 mm of the sheet whatever its angle, and never into it: the core
 *    carries them [derived; until 2026-09-26 0.62, 0.02 off the sheet, and
 *    the treads hung in the air]. The landing keeps the 0.37 it had
 *    (`landingIn`): its pieces, square to their forward edges, reach in to
 *    0.355 at their back corners (`sectorLanding`), onto the sheet. Read on PL-XV Fig. 2 (which faces -t:
 *    its treads cross in front of the core going down and behind it going
 *    up, the extremities 0.62 and 2.51 up), it turns once, in the other
 *    stairs' hand, from +z, the Seine side (-s + t), round to the Palier
 *    over its first step [measured; until 2026-09-26 1.5 turns from +x,
 *    [estimated]]. The landing is a sector of the treads' reach from the
 *    last riser's slot to past the door's far jamb: the door, edge-on at
 *    the core's -s silhouette on Fig. 2 with its near jamb over the
 *    arrival, is `summit.ts` CORE_DOOR, cut in the core. The walk goes
 *    along the landing to it and in.
 * 5. « une échelle verticale en fer » inside the 690 core « permettant
 *    d'accéder au phare » [sourced p. 79], "300" wide in the "700" [sourced
 *    PL-XV Fig. 2]: from the landing's door to the lantern's floor, which
 *    the core carries. Its rungs run along s and it faces +t, toward the
 *    core's foot opening (« Ouverture dans le cylindre de l'escalier
 *    2.000 », sill 0.130 [sourced], not cut in the model), drawn face-on
 *    there on PL-XV Figs 1-2 [measured]; the model hangs it 0.2 off the
 *    axis toward -t, the climber on its +t side (until 2026-09-26 it faced
 *    the door). It runs on down to the girders' deck, as Fig. 2 draws its
 *    rungs the whole height: those below the landing are frame, not steps.
 * 6. « Échelle mobile » in the lantern, from its floor (329.020) to the
 *    cupola's floor (332.360), and the « Échelle » from there up through
 *    the top platform (334.015) through the "600" [sourced PL-XV Fig. 1
 *    labels and chain]; the first leaning 0.35 over its height 0.55-0.9
 *    off the axis toward -s [estimated], the second plumb, drawn 0.21-0.28
 *    off it toward +s, its rungs along t, at most 0.36 wide inside the Ø
 *    0.60 ring [measured], built 0.21 off and 0.30 wide, its stiles inside
 *    the model's ring. The « 600 » is a sheet collar flush with the
 *    platform's deck, which PL-XIX Fig. 10 draws open over it: the manhole
 *    (`summit.ts` opens it; until 2026-09-26 the deck was whole and the
 *    last rung was the deck's). Its stiles run on up inside the collar to
 *    0.02 under the deck's top, each bolted to the collar's face by a flat
 *    (`collarLugs`) [estimated]. The cupola's floor, 0.792 × 2.44
 *    [SOURCES.md §29], is the two ladders' landing.
 *
 * THE COUNT. The campanile's 22 are printed. The little stair takes 15 of
 * the 2.58, 0.172 each, on the tower's other helices' riser [derived]. The
 * other five are steep stairs and ladders the plates give no pitch for:
 * 125 − 22 − 15 = 88 over their 18.04, 0.205 each [derived: the count],
 * shared per flight by its height: 12 up the wall, 9 over the roof, 13
 * beside the girder, 30, 16 and 8.
 */
export const SUMMIT_STAIRS = {
  little: { s: 1.308, t: 1.308, diameter: 1.6, tread: 0.6, risers: 15, rail: 0.9, arrival: (83 * Math.PI) / 180, closed: ((146 + 45) * Math.PI) / 180 },
  /** The wall flight: its axis x, its width, its foot and head z; the landing at its head, along z. */
  gallery: { x: 5.7, width: 0.5, z: [1.5, -0.92] as const, risers: 12, landing: 0.58 },
  /** Over the roof: its risers, to a 0.60 square landing whose centre is the girder flight's foot plus `landing` / 2 along it. */
  roofFlight: { risers: 9, width: 0.5 },
  girder: { t: 0.98, s: [3.8, 0.95] as const, width: 0.6, risers: 13, landing: 0.6 },
  /** The girders' plated tops reach this far off their axes: half their « 1.130 » over the flanges (`summit.ts` GIRDER.breadth, restated). */
  girderPlate: 1.13 / 2,
  campanile: { risers: 22, riser: 0.178, tread: 0.633, landingIn: 0.37, start: (3 * Math.PI) / 4, turns: 1 },
  core: { width: 0.3, off: 0.2, risers: 30, facing: -Math.PI / 2 },
  mobile: { foot: 0.9, head: 0.55, width: 0.4, risers: 16 },
  /**
   * The last ladder; `collar` the manhole it comes up through, the crown
   * ring's « 600 » as `summit.ts` cuts it in the deck (LANTERN.crownRing,
   * a `cupolaSides`-gon with a corner on +x, restated); `below` how far
   * under the deck's top its stiles stop, inside the collar; `lug` a
   * stile's flat to the collar's face, its height and thickness.
   */
  top: { off: 0.21, width: 0.3, risers: 8, collar: { diameter: 0.6, sides: 24 }, below: 0.02, lug: [0.06, 0.012] as const },
  cupolaFloor: { along: 2.44, across: 0.792 },
} as const;

/** The 3rd floor → summit levels the plates print, as y (cote − 33.50). */
export function summitLevels(): {
  readonly third: number;
  readonly apartment: number;
  readonly balcony: number;
  readonly roof: number;
  readonly girderTop: number;
  readonly campanileLanding: number;
  readonly lanternFloor: number;
  readonly cupolaFloor: number;
  readonly platform: number;
} {
  const lv = lanternLevels();
  const third = FLOORS.third;
  // `summit.ts`: the apartment 2.58 over the 3rd floor, the balcony's deck
  // 2.43, the roof 2.27 over the apartment's floor, the girders 4.50
  // [sourced PL-XIX Fig. 3, PL-VII].
  const apartment = third + 2.58;
  const roof = apartment + 2.27;
  const girderTop = roof + 4.5;
  return {
    third,
    apartment,
    balcony: third + 2.43,
    roof,
    girderTop,
    campanileLanding: girderTop + STAIR_ENVELOPE.rise,
    lanternFloor: lv.lanternFloor,
    // « Niveau du plancher de la coupole (332.36) » [sourced PL-XV Fig. 1].
    cupolaFloor: 332.36 - 33.5,
    platform: lv.platform,
  };
}

/** 5. The 3rd floor to the top platform. */
export function thirdToSummit(): StairParts {
  const S = SUMMIT_STAIRS;
  const lv = summitLevels();
  const parts: StairParts[] = [];
  // 1. The little stair, continuing e3's turn from where e3 arrives.
  const lt = S.little;
  parts.push(
    spiral({
      name: "summit.little",
      axis: (y) => inShaft(lt.s, y, lt.t),
      frameX: S_HAT,
      frameZ: T_HAT,
      y0: lv.third,
      y1: lv.apartment,
      risers: lt.risers,
      diameter: lt.diameter,
      tread: lt.tread,
      start: littleFoot(),
      turns: 1 - lt.arrival / (2 * Math.PI),
      // It arrives in the pavilion's floor's well: its last tread is the floor.
      slab: false,
      rail: lt.rail,
      // Its rail stops a walker's width short of the head, where he steps
      // off across the well's -s edge onto the floor [estimated].
      railOpen: { foot: 0, head: Math.asin(0.35 / (lt.diameter / 2)) },
      newel: { below: 0, above: 0.9 },
    }),
  );
  // The floor that closes its circle between its head and its foot, which
  // the head steps onto (PL-XIX Fig. 6).
  const headAt = lt.closed;
  parts.push({
    ...empty(),
    landings: sectorLanding(inShaft(lt.s, 0, lt.t), S_HAT, T_HAT, lv.apartment, headAt, lt.arrival, lt.diameter / 2 - lt.tread, lt.diameter / 2, lt.arrival / 6),
  });
  // 2. The gallery's stairs: up the pavilion's side to a landing at the
  // roof's level, then over the roof to a landing at stair 3's foot. The
  // three steep flights share one pitch (the count's): the roof to the
  // girders' top in 9 + 13.
  const gs = S.gallery;
  const rf = S.roofFlight;
  const gd = S.girder;
  const pitch = (lv.girderTop - lv.roof) / (rf.risers + gd.risers);
  const yJoin = lv.roof + rf.risers * pitch;
  parts.push(
    straight({
      name: "summit.gallery",
      foot: [gs.x, lv.balcony, gs.z[0]],
      head: [gs.x, lv.roof, gs.z[1]],
      risers: gs.risers,
      width: gs.width,
      slab: true,
      stringer: { depth: 0.2, thick: 0.05 },
      // Its stringers rest on the balcony's deck: until 2026-09-26 they
      // started a riser up, 0.03 over it, and the flight and the landing at
      // its head hung in the air.
      stringerFoot: "floor",
    }),
  );
  const wallLanding: Vec3 = [gs.x, lv.roof, gs.z[1] - gs.landing / 2];
  const toGirder = unit3(S_HAT);
  const girderFoot = inShaft(gd.s[0], yJoin, gd.t);
  const joinLanding = add3(girderFoot, mul3(toGirder, gd.landing / 2));
  const across = sub3(joinLanding, wallLanding);
  const dir = unit3([across[0], 0, across[2]]);
  parts.push({
    ...empty(),
    landings: [
      pad(wallLanding, [0, 0, -1], gs.landing, gs.width + 0.1),
      pad(joinLanding, S_HAT, gd.landing, gd.landing),
    ],
  });
  // 3a. Over the roof, from landing to landing.
  parts.push(
    straight({
      name: "summit.roof",
      foot: add3(wallLanding, mul3(dir, gs.landing / 2)),
      head: sub3(joinLanding, mul3(dir, gd.landing / 2)),
      risers: rf.risers,
      width: rf.width,
      slab: true,
      stringer: { depth: 0.2, thick: 0.05 },
      // It leaves its landing at the roof's edge and rises over the roof:
      // its stringers start a riser up, clear of the lead, and just under
      // the first tread's back edge, which they carry (two risers up until
      // 2026-09-26, and that tread hung in the air).
      stringerFoot: 1.05,
    }),
  );
  // It arrives square to its own line, at an angle to the girder stair's
  // landing, and its stringers' ends stood outside that square: a landing
  // of its own at its head, from there to the square's middle, which the
  // square overlaps (until 2026-09-26 the flight touched neither landing).
  parts.push({ ...empty(), landings: [pad(sub3(joinLanding, mul3(dir, gd.landing / 4)), dir, gd.landing / 2, rf.width + 0.1)] });
  // 3. Beside the continuous girder, up to its top.
  parts.push(
    straight({
      name: "summit.girder",
      foot: girderFoot,
      head: inShaft(gd.s[1], lv.girderTop, gd.t),
      risers: gd.risers,
      width: gd.width - 0.1,
      slab: false,
      stringer: { depth: 0.2, thick: 0.05 },
    }),
  );
  // Its head is beside the continuous girder, outside both girders'
  // plated tops, and the campanile's first step is round at +z over their
  // crossing (PL-XIX Fig. 5, PL-XV Fig. 2 [measured]); nothing is drawn
  // between (the plates are too small to show plating). The model lays a
  // plate from the flight's head to the flanges' edges, in the corner the
  // two girders leave, so the step across is not over the void
  // [estimated; PL-XIX Fig. 3 may put the head 0.35 under the girders'
  // top, low confidence, not followed].
  const flange = S.girderPlate;
  const padS: readonly [number, number] = [flange, gd.s[1]];
  const padT: readonly [number, number] = [flange, gd.t + gd.width / 2];
  parts.push({
    ...empty(),
    landings: [pad(inShaft((padS[0] + padS[1]) / 2, lv.girderTop, (padT[0] + padT[1]) / 2), S_HAT, padS[1] - padS[0], padT[1] - padT[0])],
  });
  // 4. The campanile's spiral round the core, and its landing.
  const cp = S.campanile;
  const outer = STAIR_ENVELOPE.radius;
  const core = cp.landingIn;
  const spiralParts = spiral({
    name: "summit.campanile",
    axis: (y) => [0, y, 0],
    frameX: S_HAT,
    frameZ: T_HAT,
    y0: lv.girderTop,
    y1: lv.campanileLanding,
    risers: cp.risers,
    diameter: 2 * outer,
    tread: cp.tread,
    start: cp.start,
    turns: cp.turns,
    slab: true,
    rail: 0.9,
    // The core is `summit.ts`'s (its ladder cylinder).
    newel: null,
  });
  parts.push(spiralParts);
  const end = cp.start + cp.turns * 2 * Math.PI;
  const dPhi = (cp.turns * 2 * Math.PI) / cp.risers;
  // The door in the core (`summit.ts` CORE_DOOR), its jambs brought round
  // to the landing's turn.
  const near = (a: number): number => end + ((((a - end) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const jambs = coreDoorArc().map(near);
  // The landing: a sector round the core, of the spiral's own treads'
  // reach, from the last riser's slot (the landing is its tread) on past
  // the door's far jamb by a hand's breadth at the core.
  const from = end - dPhi;
  const to = (jambs[1] as number) + 0.1 / core;
  const railN = railChords(to - end, outer - 0.03);
  const railPosts = Math.ceil(((to - end) * (outer - 0.03)) / POST_SPACING);
  parts.push({
    ...empty(),
    landings: sectorLanding([0, 0, 0], S_HAT, T_HAT, lv.campanileLanding, from, to - from, core, outer, dPhi),
    // The landing's railing, « 1.200 », round its outer edge.
    rails: [
      Array.from({ length: railN + 1 }, (_, i) => {
        const a = end + (i / railN) * (to - end);
        return add3([0, lv.campanileLanding + STAIR_ENVELOPE.railing, 0], mul3(dirST(a), outer - 0.03));
      }),
    ],
    // On posts from the landing's underside, no further apart than the
    // stairs' others, the first where the helix's rail arrives, which it
    // crosses (until 2026-09-26 the railing had none and hung in the air).
    frame: Array.from({ length: railPosts + 1 }, (_, i) => {
      const p = mul3(dirST(end + (i / railPosts) * (to - end)), outer - 0.03);
      const y = lv.campanileLanding;
      return member(add3(p, [0, y - LANDING, 0]), add3(p, [0, y + STAIR_ENVELOPE.railing, 0]), POST, dirST(end));
    }),
  });
  // 5. The ladder in the core, from the landing's door to the lantern's floor.
  const cl = S.core;
  // Its rungs run along s and it faces +t, toward the core's foot opening
  // (PL-XV Figs 1-2, drawn face-on there): the climber, in by the landing's
  // door, stands on its +t side facing -t. It runs on down to the girders'
  // deck, rungs the walk does not climb.
  const facing = dirST(cl.facing);
  const back = mul3(facing, cl.off);
  const corePitch = (lv.lanternFloor - lv.campanileLanding) / cl.risers;
  parts.push(
    ladder({
      name: "summit.core",
      foot: add3([0, lv.campanileLanding, 0], back),
      head: add3([0, lv.lanternFloor, 0], back),
      risers: cl.risers,
      width: cl.width,
      facing,
      // It comes up inside the core's top, where the lantern's floor is
      // open round it: the last rung is its own.
      slab: false,
      above: 0,
      down: Math.floor((lv.campanileLanding - lv.girderTop) / corePitch - 1e-9),
      // Its stiles on down to the deck, under its lowest rung by less than a
      // pitch (until 2026-09-26 they stopped at that rung, 0.04 over it).
      floor: lv.girderTop,
    }),
  );
  // 6. The lantern's ladders: the mobile one leaning, then the plumb one.
  const mb = S.mobile;
  parts.push(
    ladder({
      name: "summit.mobile",
      foot: inShaft(-mb.foot, lv.lanternFloor),
      head: inShaft(-mb.head, lv.cupolaFloor),
      risers: mb.risers,
      width: mb.width,
      facing: mul3(S_HAT, 1),
      // It arrives beside the cupola's floor (below), its stiles on up as
      // hand holds.
      slab: false,
    }),
  );
  // The cupola's floor, « Niveau du plancher de la coupole (332.36) », a
  // plate 0.792 × 2.44 [sourced PL-XV Fig. 1, SOURCES.md §29] the two
  // ladders share, centred and long across s, so the mobile ladder comes up
  // at its edge and the plumb one stands on it [estimated].
  parts.push({ ...empty(), landings: [pad(inShaft(0, lv.cupolaFloor), T_HAT, S.cupolaFloor.along, S.cupolaFloor.across)] });
  const tp = S.top;
  parts.push(
    ladder({
      name: "summit.top",
      foot: inShaft(tp.off, lv.cupolaFloor),
      head: inShaft(tp.off, lv.platform),
      risers: tp.risers,
      width: tp.width,
      facing: mul3(S_HAT, 1),
      slab: true,
      // Its stiles on up inside the collar, short of the deck's top (the
      // stiles stand 5 mm over the level they start from, `ladder`).
      above: -tp.below - 0.005,
    }),
  );
  parts.push({ ...empty(), frame: collarLugs(inShaft(tp.off, lv.platform), mul3(S_HAT, 1), tp.width) });
  return joinStairs(...parts);
}

/**
 * The last ladder's hold on the manhole: each stile, where it stands inside
 * the collar, bolted to it by a flat run square out from the stile's axis
 * to the collar's nearest face and flush on it [estimated: the plates draw
 * the ladder up through the « 600 » and no fixing; a ladder through a
 * manhole is fixed at its rim]. The collar is the deck's inner face, a
 * polygon, so the flat's end lies in one of its facets. Until 2026-09-27
 * the stiles stopped under the deck, 8 mm inside the ring's corner at the
 * nearest, bearing on nothing.
 */
function collarLugs(head: Vec3, facing: Vec3, width: number): Block[] {
  const { collar, below, lug } = SUMMIT_STAIRS.top;
  const across = unit3(cross3(facing, UP));
  const half = Math.PI / collar.sides;
  const apothem = (collar.diameter / 2) * Math.cos(half);
  const y = head[1] - below - lug[0] / 2;
  return [-1, 1].map((side) => {
    // The stile's axis, on the ladder's head level.
    const p = add3(head, mul3(across, (side * (width + 0.012)) / 2));
    // The facet nearest it: the one whose plane it is least far inside.
    let n: Vec3 = [1, 0, 0];
    let d = Infinity;
    for (let k = 0; k < collar.sides; k++) {
      const a = (2 * k + 1) * half;
      const nk: Vec3 = [Math.cos(a), 0, Math.sin(a)];
      const dk = apothem - dot3(nk, p);
      if (dk < d) [n, d] = [nk, dk];
    }
    return { at: add3([p[0], y, p[2]], mul3(n, d / 2)), x: n, y: UP, size: [d, lug[0], lug[1]] };
  });
}

// ---------------------------------------------------------------------------
// The runs

/** A run of the climb: the book's row, the pieces that make it, and where it is copied. */
export interface StairRun {
  readonly key: "ground" | "e1" | "e2" | "e3" | "summit";
  /** The book's step count for the row [sourced E1900-TXT p. 304]. */
  readonly steps: number;
  /** The levels the row climbs between, as y. */
  readonly from: number;
  readonly to: number;
  /** Built in pile 4's leg and copied to these piles (by number), or in the world once. */
  readonly legs: readonly number[] | "world";
  readonly parts: StairParts;
}

/** The book's rows [sourced E1900-TXT p. 304], in climbing order. */
export const STEP_COUNTS = { ground: 347, e1: 327, e2: 456, e3: 455, summit: 125 } as const;

/** Every run, built. */
export function stairRuns(): StairRun[] {
  const lv = summitLevels();
  return [
    { key: "ground", steps: STEP_COUNTS.ground, from: GROUND_STAIR.ground, to: FLOORS.first, legs: [2, 4], parts: groundToFirst() },
    { key: "e1", steps: STEP_COUNTS.e1, from: FLOORS.first, to: FLOORS.second, legs: [1, 2, 3, 4], parts: firstToSecond() },
    { key: "e2", steps: STEP_COUNTS.e2, from: FLOORS.second, to: FLOORS.landing, legs: "world", parts: secondToLanding() },
    { key: "e3", steps: STEP_COUNTS.e3, from: FLOORS.landing, to: FLOORS.third, legs: "world", parts: landingToThird() },
    { key: "summit", steps: STEP_COUNTS.summit, from: FLOORS.third, to: lv.platform, legs: "world", parts: thirdToSummit() },
  ];
}
