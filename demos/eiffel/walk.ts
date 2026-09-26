/**
 * The walk: the climb of 1889 on foot, ground to summit, as one path.
 *
 * E1900-TXT p. 304 counts « la montée à pied » at 1,710 steps, and
 * `stairs.ts` builds every one of them. This module strings those stairs
 * into the path a visitor's feet took: up the ground stair of pile 2
 * (« L'escalier de la pile 2 sert à la montée, l'autre à la descente »
 * [sourced E1900-TXT p. 81]), on up e1 in the same leg, across the 2nd
 * floor to e2 in the shaft, across the intermediate landing to e3, and from
 * the 3rd floor by the little stair, through Eiffel's apartment onto the
 * terrace, up its stairs, the campanile and the ladders to the top platform.
 *
 * NOTHING ON A STAIR IS A HAND-PLACED WAYPOINT. Every point on a flight is
 * the flight's own walking line (`Flight.line`), built by the same rule and
 * from the same numbers as its treads; the leg runs are turned onto pile 2
 * exactly as `lifts.ts` copies them. What this module adds is what lies
 * BETWEEN two flights:
 *
 * - a turn on a landing: a short step onto it (`LANDING_IN`), across, and
 *   off onto the next flight;
 * - a walk across a floor between two runs (`DECK_WALKS`): the points were
 *   found by a clearance search over the cooked deck (a 0.10 grid, a body
 *   0.25 clear from 0.6 to 1.6 over the floor, the floor found by casting
 *   down), straightened, and are re-checked by the test against the cooked
 *   tower, feet on a floor and eye clear;
 * - round a stair core: from the campanile's head along its landing to the
 *   core's door and in, and from the core's top round the lantern's floor to
 *   the mobile ladder's back, both from the stairs' own numbers.
 *
 * The eye is 1.60 over the feet [estimated, a standing adult's eye]; on a
 * ladder the climber stands behind its rungs (`LADDER_BACK`) and leans with
 * it. Under the cupola, where the floor is 1.655 under the platform
 * [sourced PL-XV Fig. 1], nobody stands up: the eye keeps `CROUCH` under the
 * dome's shell (`crouch`). tests/eiffelWalk.test.ts holds the path to the
 * stairs and to the cooked tower: the flights in order, the steps to
 * 1,710, the height never falling, and the eye clear.
 */
import type { Vec3 } from "./lattice.js";
import { PILES } from "./spec.js";
import { type Flight, type StairRun, stairRuns, summitLevels } from "./stairs.js";
import { CORE_DOOR } from "./summit.js";

/** The eye over the feet [estimated]. */
export const EYE = 1.6;
/** On a ladder, how far behind the rung line the climber's feet and eye are [estimated]. */
export const LADDER_BACK = 0.25;
/** How far onto a landing a walker steps before turning to the next flight [estimated]. */
export const LANDING_IN = 0.125;
/** How far the eye keeps under the cupola's shell where the climber crouches [estimated]. */
export const CROUCH = 0.25;
/** How far the walk goes on from the last ladder's head onto the top platform, away from the ladder [estimated]. */
export const ARRIVE = 0.3;
/** The pile whose ground stair is the way up [sourced E1900-TXT p. 81]. */
export const WALK_PILE = 2;
/**
 * The cupola the lantern's ladders climb inside: « de 2,686 m de diamètre »
 * [sourced E1900-TXT p. 79, restated from `summit.ts`], a sphere whose crown
 * is the platform's underside, 0.125 under it [sourced PL-XV Fig. 1].
 */
const CUPOLA = { radius: 2.686 / 2, deck: 0.125 } as const;

/** What a point of the walk stands on. */
export type WalkKind = "stair" | "landing" | "ladder" | "deck";

/** One point of the walk. */
export interface WalkVertex {
  /** Where the feet stand, in the world. */
  readonly at: Vec3;
  /** Where the eye is. */
  readonly eye: Vec3;
  /** The steps climbed from the ground on reaching it (0 … 1,710). */
  readonly step: number;
  /** The run and flight it belongs to (between flights: the one it leaves). */
  readonly run: StairRun["key"];
  readonly flight: string;
  readonly kind: WalkKind;
  /** The distance walked to it along the path, in metres. */
  readonly dist: number;
  /** On a ladder, the way the climber faces (horizontal, unit). */
  readonly look?: Vec3;
}

/** A flight as the walk visits it. */
export interface WalkFlight {
  readonly run: StairRun["key"];
  readonly name: string;
  readonly kind: Flight["kind"];
  /** The range of `points` its walking line covers, foot to head. */
  readonly first: number;
  readonly last: number;
  readonly risers: number;
}

/** The walk. */
export interface WalkRoute {
  readonly points: readonly WalkVertex[];
  /** Every flight in climbing order. */
  readonly flights: readonly WalkFlight[];
  /** Its total steps and length. */
  readonly steps: number;
  readonly length: number;
}

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);

/** Quadrant k's copy of a point or direction: k quarter turns about +y, +z onto +x (`lifts.ts` `onLeg`). */
function onLeg(k: number, p: Vec3): Vec3 {
  if (k === 0) return p;
  if (k === 1) return [p[2], p[1], -p[0]];
  if (k === 2) return [-p[0], p[1], -p[2]];
  return [-p[2], p[1], p[0]];
}

/**
 * The walks across the floors between one run and the next, keyed
 * "<last flight>><next flight>": the points the walker passes after
 * stepping off the one and before stepping onto the other, in the world
 * (for the leg runs, pile 2's). Found by the clearance search above, over
 * the plain-depth cook of 2026-09-26, and held by the test.
 */
export const DECK_WALKS: Readonly<Record<string, readonly Vec3[]>> = {
  // The 1st floor, in pile 2: off the ground stair's landing, round its
  // opening and out along the leg to e1's first helix, whose foot faces out.
  "ground.arrival.last>e1.helix1": [
    [-22.29, 57.63, -23.79],
    [-21.99, 57.63, -24.59],
    [-22.89, 57.63, -25.59],
    [-24.94, 57.63, -27.29],
    [-25.89, 57.63, -26.59],
  ],
  // The 2nd floor: from the head of e1 in pile 2 in across the deck, by
  // the buildings on it, to e2's foot in the shaft.
  "e1.top>e2.helix": [
    [-10.38, 115.73, -10.38],
    [-8.78, 115.73, -4.48],
    [-6.58, 115.73, -1.98],
    [-2.78, 115.73, 1.82],
    [-0.73, 115.73, 1.87],
    [-0.38, 115.73, 2.92],
  ],
  // The intermediate landing: from e2's dog-leg across to e3.
  "e2.back>e3.lower": [
    [0.9, 195.93, 3.22],
    [4.35, 195.93, 0.92],
  ],
  // The apartment: off the little stair's well, through the room, out by
  // the +x wall's door at u -2.57 (`summit.ts` PAVILION_OPENINGS) onto the
  // terrace, 0.15 lower (`summit.ts` balcony 2.43 against the floor's
  // 2.58), to the terrace stair's foot.
  "summit.little>summit.gallery": [
    // Off the floor that closes the stair's circle on the tower's side
    // (`stairs.ts`), across the well's -s edge, and round it; until
    // 2026-09-26 the stair ended in the open well and the walk left it by
    // its (-s, +t) corner, 0.45 of well.
    [1.17, 278.71, 0.6],
    [1.76, 278.71, 1.21],
    [3.0, 278.71, 1.55],
    [3.6, 278.71, 2.4],
    [4.9, 278.71, 2.52],
    [5.36, 278.56, 2.52],
    [5.66, 278.56, 2.01],
  ],
};

/** Points on a circle round `axis` (horizontal), radius r, from angle a0 to a1 the short way, at height y. */
function arc(axis: Vec3, r: number, a0: number, a1: number, y: number): Vec3[] {
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 12)));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (d * i) / n;
    return [axis[0] + r * Math.cos(a), y, axis[2] + r * Math.sin(a)] as Vec3;
  });
}

const angleOf = (axis: Vec3, p: Vec3): number => Math.atan2(p[2] - axis[2], p[0] - axis[0]);

/**
 * The eye over the feet at `at`: EYE up, or under the cupola, as high as
 * the dome's shell leaves `CROUCH` of room (the platform's underside is its
 * crown, `CUPOLA.deck` under the platform).
 */
function crouch(at: Vec3, eye: Vec3, platform: number): Vec3 {
  const r = Math.hypot(eye[0], eye[2]);
  const crown = platform - CUPOLA.deck;
  const centre = crown - CUPOLA.radius;
  // Below the dome's reach, or standing on the platform: upright.
  if (r >= CUPOLA.radius || at[1] < centre - EYE || at[1] >= crown) return eye;
  const shell = centre + Math.sqrt(CUPOLA.radius * CUPOLA.radius - r * r);
  return [eye[0], Math.max(at[1] + 0.9, Math.min(eye[1], shell - CROUCH)), eye[2]];
}

/** Build the walk. */
export function walkRoute(runs: readonly StairRun[] = stairRuns()): WalkRoute {
  const quadrant = (PILES.find((p) => p.n === WALK_PILE) as (typeof PILES)[number]).quadrant;
  const platform = summitLevels().platform;
  const points: WalkVertex[] = [];
  const flights: WalkFlight[] = [];
  let base = 0;
  let dist = 0;
  /** Add a point; a walk's point where the walker already stands is left out. */
  const push = (at: Vec3, eye: Vec3, step: number, run: StairRun["key"], flight: string, kind: WalkKind, always = false, look?: Vec3): void => {
    const prev = points[points.length - 1];
    if (prev !== undefined) {
      const d = len3(sub3(at, prev.at));
      if (d < 1e-6 && !always) return;
      dist += d;
    }
    const v: WalkVertex = { at, eye: crouch(at, eye, platform), step, run, flight, kind, dist };
    points.push(look === undefined ? v : { ...v, look });
  };
  const stand = (at: Vec3): Vec3 => add3(at, [0, EYE, 0]);
  /** Walk on the level from the last point to `to`. */
  const walkTo = (to: Vec3, run: StairRun["key"], flight: string, kind: WalkKind): void => {
    const prev = points[points.length - 1];
    push(to, stand(to), prev?.step ?? base, run, flight, kind);
  };
  let last: { flight: Flight; run: StairRun["key"]; place: (p: Vec3) => Vec3; head: Vec3 } | undefined;
  for (const run of runs) {
    const place = run.legs === "world" ? (p: Vec3) => p : (p: Vec3) => onLeg(quadrant, p);
    for (const f of run.parts.flights) {
      const ladder = f.kind === "ladder";
      const facing = place(f.enter);
      // A ladder's climber stands behind its rungs, and leans as it leans.
      const lift = sub3(place(f.head), place(f.foot));
      const lean: Vec3 = ladder ? [(lift[0] / lift[1]) * EYE, EYE, (lift[2] / lift[1]) * EYE] : [0, EYE, 0];
      const back = ladder ? mul3(facing, -LADDER_BACK) : ([0, 0, 0] as Vec3);
      const line = f.line.map((w) => {
        const at = add3(place(w.at), back);
        return { at, eye: add3(at, lean), step: w.step };
      });
      const foot = (line[0] as { at: Vec3 }).at;
      if (last !== undefined) {
        const lf = last.flight;
        const head = last.head;
        const leave = last.place(lf.leave);
        const key = `${lf.name}>${f.name}`;
        const via = DECK_WALKS[key];
        const flat = Math.abs(foot[1] - head[1]) < 0.02;
        if (via !== undefined) {
          for (const p of via) walkTo(p, last.run, lf.name, "deck");
        } else if (lf.kind === "spiral" && ladder && lf.axis !== undefined && lf.diameter !== undefined) {
          // Off a spiral's head along its landing to the core's door
          // (`summit.ts` CORE_DOOR, its middle; the diagonals' frame's
          // angle less an eighth of a turn in the world), then in.
          const axis = last.place(lf.axis);
          const r = Math.hypot(head[0] - axis[0], head[2] - axis[2]);
          const door = CORE_DOOR.angle - Math.PI / 4;
          for (const p of arc(axis, r, angleOf(axis, head), door, head[1]).slice(1)) walkTo(p, last.run, lf.name, "landing");
        } else if (lf.kind === "ladder" && ladder && flat) {
          // Out of one ladder's head and round the floor to the next one's
          // back: forward off the rungs onto the floor, then round the axis
          // as far out as the next climber's eye will be, outside its
          // ladder where that leans in, and back onto its foot.
          const off = add3(head, mul3(leave, 0.5 + LADDER_BACK));
          const axis: Vec3 = [0, head[1], 0];
          const eye0 = (line[0] as { eye: Vec3 }).eye;
          const R = Math.hypot(eye0[0], eye0[2]);
          walkTo(off, last.run, lf.name, "deck");
          for (const p of arc(axis, R, angleOf(axis, off), angleOf(axis, foot), head[1])) walkTo(p, last.run, lf.name, "deck");
        } else if (flat && len3(sub3(foot, head)) > 0.45 && leave[0] * facing[0] + leave[2] * facing[2] < 0.5) {
          // A turn on a landing: onto it, across, and off onto the next flight.
          walkTo(add3(head, mul3(leave, LANDING_IN)), run.key, lf.name, "landing");
          walkTo(sub3(foot, mul3(facing, LANDING_IN)), run.key, lf.name, "landing");
        }
      }
      const first = points.length;
      // Every point of the line, the foot too where the flight before ended on it.
      for (const w of line) push(w.at, w.eye, base + w.step, run.key, f.name, ladder ? "ladder" : "stair", true, ladder ? facing : undefined);
      flights.push({ run: run.key, name: f.name, kind: f.kind, first, last: points.length - 1, risers: f.risers });
      base += f.risers;
      last = { flight: f, run: run.key, place, head: (points[points.length - 1] as WalkVertex).at };
    }
  }
  // Off the last ladder onto the top platform: a pace back from its hatch,
  // standing, facing out.
  if (last !== undefined && last.flight.kind === "ladder") {
    const facing = last.place(last.flight.enter);
    walkTo(add3(last.head, mul3(facing, -ARRIVE)), last.run, last.flight.name, "deck");
  }
  return { points, flights, steps: base, length: dist };
}

/** A pose on the walk: the eye, the feet, the heading along the path, the step count. */
export interface WalkPose {
  readonly eye: Vec3;
  readonly at: Vec3;
  /** The horizontal direction the path runs over the next `ahead` metres (unit). */
  readonly heading: Vec3;
  /** The path's climb per metre walked there. */
  readonly slope: number;
  readonly step: number;
  readonly index: number;
  readonly flight: string;
}

/** The index of the segment holding the distance `d`: points[i].dist <= d < points[i + 1].dist. */
export function segmentAt(route: WalkRoute, d: number): number {
  const pts = route.points;
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((pts[mid] as WalkVertex).dist <= d) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The point at the distance `d` along the walk (clamped to it). */
export function pointAt(route: WalkRoute, d: number): { eye: Vec3; at: Vec3; index: number } {
  const x = Math.min(Math.max(d, 0), route.length);
  const i = segmentAt(route, x);
  const a = route.points[i] as WalkVertex;
  const b = (route.points[i + 1] ?? a) as WalkVertex;
  const span = b.dist - a.dist;
  const u = span > 1e-9 ? (x - a.dist) / span : 0;
  const lerp = (p: Vec3, q: Vec3): Vec3 => add3(p, mul3(sub3(q, p), u));
  return { eye: lerp(a.eye, b.eye), at: lerp(a.at, b.at), index: i };
}

/** The pose at the distance `d`, heading along the next `ahead` metres of path. */
export function poseAt(route: WalkRoute, d: number, ahead = 0.6): WalkPose {
  const here = pointAt(route, d);
  let there = pointAt(route, d + ahead);
  let dir = sub3(there.at, here.at);
  const on = route.points[here.index] as WalkVertex;
  if (on.look !== undefined && (route.points[here.index + 1] as WalkVertex | undefined)?.look !== undefined) {
    // On a ladder: facing its rungs.
    dir = on.look;
  } else if (Math.hypot(dir[0], dir[2]) < 0.1) {
    // On a ladder, or at the end: the way the path last ran on the level.
    for (let back = ahead; back < 20 && Math.hypot(dir[0], dir[2]) < 0.1; back += ahead) {
      there = here;
      dir = sub3(here.at, pointAt(route, d - back).at);
    }
  }
  const h = Math.hypot(dir[0], dir[2]);
  const heading: Vec3 = h > 1e-6 ? [dir[0] / h, 0, dir[2] / h] : [1, 0, 0];
  const walked = Math.max(1e-6, Math.min(d + ahead, route.length) - Math.max(0, Math.min(d, route.length)));
  const slope = (pointAt(route, d + ahead).at[1] - here.at[1]) / walked;
  const a = route.points[here.index] as WalkVertex;
  return { eye: here.eye, at: here.at, heading, slope, step: a.step, index: here.index, flight: a.flight };
}

/** The distance at which the walk reaches step `n` (its first point with that count). */
export function distOfStep(route: WalkRoute, n: number): number {
  const pts = route.points;
  if (n <= 0) return 0;
  let lo = 0;
  let hi = pts.length - 1;
  if ((pts[hi] as WalkVertex).step < n) return route.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((pts[mid] as WalkVertex).step < n) lo = mid;
    else hi = mid;
  }
  return (pts[hi] as WalkVertex).dist;
}
