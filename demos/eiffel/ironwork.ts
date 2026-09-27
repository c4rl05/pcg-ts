/**
 * The decorative arches' ironwork: what dresses each panel of the band
 * between the arch's two chords, on the decorated faces only.
 *
 * WHAT THE PLATE DRAWS. "Sur les faces intérieures et extérieures ...
 * chacun des panneaux des arcs est ornementé sur ces mêmes faces par un
 * motif formé de cornières et de volutes avec macarons en fonte (pl. XI).
 * Les panneaux restent sans aucune décoration sur les autres faces"
 * [sourced E1900-TXT p. 80]. PL-XI Fig. 14, "Panneau décoré des faces 1 et
 * 4", draws one panel at 1:50, and every piece of it is named [sourced
 * PL-XI Fig. 14, Fig. 16 (section CD) and the "Volute et macaron" detail at
 * 1:10; readings in SOURCES.md §28]:
 * - a round-headed FRAME, "Ame 160 x 7" on "Corn. 80 x 45 x 7": two legs
 *   standing on the intrados against the montants and a semicircular head;
 * - three BARS, "Corn. 100 x 45 x 6" on the panel's axis and "x 8" either
 *   side of it, rising together from the middle of the intrados, the axis
 *   one to the extrados and the other two to the extrados' corners at the
 *   montants, crossing the frame's head: the "fan";
 * - four cast-iron VOLUTES, "Volute en fonte 80 x 45": C-scrolls, each
 *   riveted along one of the two outer bars over a packing ("Fourr.") and
 *   curling away from it, two above the frame's head toward the axis bar
 *   and two inside the frame toward its legs;
 * - a MACARON (the rosette) in each volute's eye: a cast disc 125 across
 *   with a raised cross [measured on the 1:10 detail].
 * PL-XI Fig. 1 draws the same motif in every band panel from the crown to
 * montant 14 (thirteen a half), on "Face 1, ornementée"; at 1:200 its fans
 * read as four or five spokes, which the 1:50 figure, member by member,
 * settles at three. Fig. 18 is the undecorated panel of faces 2 and 3.
 *
 * THE RULE. Fig. 14 is a panel of the crown, where the band is the
 * concentric annulus between the chords and every panel is the same shape:
 * its numbers are read there, in the panel's own frame (s across, v up the
 * panel's axis from the intrados' face; 241 px/m on the scan, from the
 * 2.7173 clear depth the figure prints on its axis bar, the 0.60 chords and
 * the 0.40 montants, which agree to 4%). The motif is placed rigidly in
 * each panel, and where upright b cuts the band below the extrados (panels
 * 12|13 and 13|14) the bars and the frame are cut at b's face and a volute
 * that no longer fits is left out, as Fig. 1 draws those panels: the same
 * motif cut by the arbalétrier, not a squeezed one [sourced drawing PL-XI
 * Fig. 1, Fig. 13].
 *
 * THE GRAMMAR. A curve is a turtle program: a pose (point, heading) and
 * strokes, `line`, `arc` and `spiral`, each continuing tangent from the
 * last. The frame is line, arc, line. A volute is `kissingScroll`: a
 * straight tail laid along its host bar, then a logarithmic spiral leaving
 * it tangent and winding in to the eye, where the macaron sits. The fit is
 * closed form: the eye is placed (measured), and the spiral's start radius
 * follows from the eye's distance to the host, so the scroll touches the
 * bar exactly where the plate rivets it, whatever the host's slope. No
 * randomness: the same panel gives the same ironwork, bit for bit.
 *
 * THE SECTIONS. Every piece is a flat bar lying on the rib's face: its
 * width in the face, `IRON_DEPTH` out of it. This file draws only the
 * centrelines; `ironworkSolid` sweeps each with a rectangular section,
 * mitred at every bend, so a scroll has no notch at one.
 *
 * Pure geometry apart from `ironworkSolid`; no pcg-ts node knows about
 * panels.
 */
import {
  type Graph,
  type NodeHandle,
  attribute,
  extrudePolygon,
  pointsToPath,
  removeAttribute,
  sweepProfile,
} from "pcg-ts";
import { SAG, smoothed } from "./chord.js";
import { type TableColumn, type TableType, type Vec3, copyToQuadrants, merge, pointTable } from "./lattice.js";

/** A point in the arch's plane, or in a panel's frame. */
export type Pt = readonly [number, number];

// ---------------------------------------------------------------- numbers

/** The frame's flat, "Ame 160 x 7" [sourced PL-XI Fig. 14, Fig. 16]. */
export const FRAME_WIDTH = 0.16;
/**
 * The frame's head: its centreline's crown 2.10 up the panel's axis from
 * the intrados' face, of the 2.7173 clear [measured Fig. 14: 506 px at 241
 * px/m]. With the legs' outer edges on the montants' faces at the foot
 * (below), the head is a semicircle springing 1.09 up: the drawing's head
 * passes within 1 cm of it at 45° [measured].
 */
export const FRAME_CROWN = 2.1;
/** The three bars, "Corn. 100 x 45 x 6" and "x 8" [sourced Fig. 14]. */
export const BAR_WIDTH = 0.1;
/**
 * The two outer bars' feet, either side of the axis bar's, on the gusset
 * "Entretoise 120 x 6", the three nearly touching [measured Fig. 14 twice,
 * blind: 0.14 / 0.21 and 0.21 / 0.19 off the axis; 0.19, their mean,
 * symmetric].
 */
export const BAR_FOOT = 0.19;
/** The volutes, "Volute en fonte 80 x 45" [sourced Fig. 14, Fig. 16]. */
export const VOLUTE_WIDTH = 0.08;
/**
 * Every section's leg out of the face: the 45 of "100 x 45", "80 x 45" and
 * the frame's "80 x 45" angles [sourced]; the frame's flat on them taken
 * the same [estimated].
 */
export const IRON_DEPTH = 0.045;
/**
 * The packing between a volute's tail and its bar ("Fourr.", drawn
 * hatched where each volute meets its bar) [sourced drawing Fig. 14;
 * thickness estimated].
 */
export const PACKING = 0.005;
/** The macaron, 125 across on the 1:10 detail [measured: 150 px at 1205 px/m]. */
export const MACARON_R = 0.0625;
/**
 * How far the macaron's disc stands off the rib's face: through the
 * volute's 45 and 30 proud of it, as the Coupe EF draws the boss over the
 * volute's eye [estimated from the section].
 */
export const MACARON_DEPTH = 0.075;
/** Its cross: two ribs across the disc, standing proud of it [estimated from the detail]. */
export const CROSS_WIDTH = 0.018;
export const CROSS_LENGTH = 0.11;
export const CROSS_DEPTH = 0.012;

/**
 * The four volutes of a panel, in its frame [measured Fig. 14]: each eye's
 * place, the side it hangs on (-1 toward the lower montant's side, as the
 * figure is drawn: its left), its turn (+1 anticlockwise seen from the
 * decorated face, the upper ones curling over toward the axis bar, the
 * lower ones toward the frame's legs), its spiral's growth (the radius
 * falls by e^(-2 pi k) a turn: 0.17 above, measured 0.14-0.19 off the upper
 * scroll's four extremes; 0.13 below, which gives the lower scrolls the
 * turn and a third the figure draws), and the tail laid along the bar
 * before it (0.35 above, the hatched packing's length; 0.15 below).
 * Mirror pairs: the figure's two sides agree to 3 cm.
 */
export const VOLUTES = [
  { eye: [-0.45, 2.34], side: -1, turn: -1, k: 0.19, tail: 0.35 },
  { eye: [0.45, 2.34], side: 1, turn: 1, k: 0.19, tail: 0.35 },
  { eye: [-0.65, 0.34], side: -1, turn: 1, k: 0.13, tail: 0.15 },
  { eye: [0.65, 0.34], side: 1, turn: -1, k: 0.13, tail: 0.15 },
] as const;

/** Where a volute ends: its bar's inner edge on the macaron's rim [derived]. */
export const VOLUTE_END = MACARON_R + VOLUTE_WIDTH / 2;
/**
 * Turtle steps on arcs and spirals: never coarser than 18° a step
 * [estimated: drawing resolution], and finer wherever the radius asks for
 * it, so no chord stands more than {@link CURVE_SAG} off its curve.
 */
export const CURVE_STEP = Math.PI / 10;
/**
 * The most a traced chord may stand off its arc or spiral, in metres:
 * `chord.ts`' `near`, the arches' ironwork being read from the ground and
 * the 1st floor, a few metres off at the nearest.
 */
export const CURVE_SAG = SAG.near;

/**
 * The step, in radians, a chord may turn through on a curve of radius of
 * curvature `rho` and stand at most `sag` off it — rho (1 − cos(θ/2)) ≤
 * sag — capped at {@link CURVE_STEP}.
 */
export function curveStep(rho: number, sag: number): number {
  return Math.min(CURVE_STEP, sag >= rho ? Math.PI : 2 * Math.acos(1 - sag / rho));
}
/** Sides of a macaron's disc [estimated]. */
export const MACARON_SIDES = 12;

// ---------------------------------------------------------------- vectors

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const unit = (a: Pt): Pt => scale(a, 1 / Math.hypot(a[0], a[1]));
const rot = (a: Pt, t: number): Pt => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)];
const dir = (t: number): Pt => [Math.cos(t), Math.sin(t)];

/** The distance from p to the segment ab. */
export function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return Math.hypot(...sub(p, add(a, scale(ab, t))));
}

// ---------------------------------------------------------------- grammar

/** A turtle stroke; each continues tangent from where the last ended. */
export type Stroke =
  | { readonly op: "line"; readonly length: number }
  /** An arc of `radius`, turning by `turn` radians (+ anticlockwise). */
  | { readonly op: "arc"; readonly radius: number; readonly turn: number }
  /**
   * A logarithmic spiral winding in, `turn` +1 anticlockwise: it leaves
   * tangent to the heading at radius `r0` from its eye and closes at a
   * constant angle atan(k) off the circle, to radius `rEnd`.
   */
  | { readonly op: "spiral"; readonly r0: number; readonly k: number; readonly rEnd: number; readonly turn: 1 | -1 };

/** A pose: where the turtle stands and which way it heads (radians from +s). */
export interface Pose {
  readonly p: Pt;
  readonly heading: number;
}

/** Where a spiral leaving pose `at` has its eye. */
export function spiralEye(at: Pose, s: { r0: number; k: number; turn: 1 | -1 }): Pt {
  const beta = Math.atan(s.k);
  const ur = rot(dir(at.heading), -s.turn * (Math.PI / 2 + beta));
  return sub(at.p, scale(ur, s.r0));
}

/**
 * Run a turtle program: the polyline it draws, from the start pose's point
 * on. Arcs and spirals are cut so no chord stands more than `sag` off the
 * curve (see {@link curveStep}): an arc in equal steps, a spiral in steps
 * that lengthen as it winds in, each set by the radius where it starts.
 * `halfWidth` is the bar's, drawn round the line: its outer edge, on the
 * larger radius, is the one held to `sag`.
 */
export function trace(start: Pose, strokes: readonly Stroke[], halfWidth = 0, sag = CURVE_SAG): Pt[] {
  const out: Pt[] = [start.p];
  let p = start.p;
  let h = start.heading;
  for (const s of strokes) {
    if (s.op === "line") {
      p = add(p, scale(dir(h), s.length));
      out.push(p);
    } else if (s.op === "arc") {
      const side = Math.sign(s.turn);
      const c = add(p, scale(rot(dir(h), side * (Math.PI / 2)), s.radius));
      const from = sub(p, c);
      const n = Math.max(1, Math.ceil(Math.abs(s.turn) / curveStep(s.radius + halfWidth, sag)));
      for (let i = 1; i <= n; i++) out.push(add(c, rot(from, (s.turn * i) / n)));
      p = out[out.length - 1]!;
      h += s.turn;
    } else {
      const eye = spiralEye({ p, heading: h }, s);
      const ur = unit(sub(p, eye));
      const total = Math.log(s.r0 / s.rEnd) / s.k;
      // A log spiral's radius of curvature is its radius times √(1 + k²);
      // winding in, a step's largest is at its start.
      const phis: number[] = [];
      for (let phi = 0; phi < total - 1e-12; ) {
        phi = Math.min(total, phi + curveStep(s.r0 * Math.exp(-s.k * phi) * Math.hypot(1, s.k) + halfWidth, sag));
        phis.push(phi);
      }
      if (phis.length === 0) phis.push(total);
      for (const phi of phis) out.push(add(eye, scale(rot(ur, s.turn * phi), s.r0 * Math.exp(-s.k * phi))));
      p = out[out.length - 1]!;
      // The heading at the end: the circle's tangent turned atan(k) inward.
      const t = rot(unit(sub(p, eye)), s.turn * (Math.PI / 2 + Math.atan(s.k)));
      h = Math.atan2(t[1], t[0]);
    }
  }
  return out;
}

/** A host line for a scroll: a point on it and its direction of travel. */
export interface Host {
  readonly at: Pt;
  readonly along: Pt;
}

/** A scroll fitted to its host: the program, and where its eye lands. */
export interface Scroll {
  readonly start: Pose;
  readonly strokes: readonly Stroke[];
  readonly eye: Pt;
  readonly r0: number;
}

/**
 * The C-scroll whose eye is `eye` and which leaves its host bar tangent,
 * `offset` off the bar's axis, after a tail of `tail` laid along it; `turn`
 * is the way it curls (+1 anticlockwise). The eye's distance from the
 * offset line is r0 cos(atan k), which fixes r0; the start is where the
 * spiral's radius meets that line. Undefined where no such scroll exists:
 * the eye on the far side of the bar, or too near it to wind in.
 */
export function kissingScroll(
  host: Host,
  offset: number,
  eye: Pt,
  turn: 1 | -1,
  k: number,
  rEnd: number,
  tail: number,
): Scroll | undefined {
  const d0 = unit(host.along);
  const beta = Math.atan(k);
  const ur = rot(d0, -turn * (Math.PI / 2 + beta));
  // The eye must lie on the side the spiral curls to, and far enough off
  // the packing for the spiral to wind in at all; where a panel's bar has
  // swung so neither holds, there is no such scroll.
  const across = cross(d0, sub(eye, host.at));
  const r0 = (Math.abs(across) - offset) / Math.cos(beta);
  if (Math.sign(across) !== turn || !(r0 > rEnd)) return undefined;
  const p0 = add(eye, scale(ur, r0));
  const heading = Math.atan2(d0[1], d0[0]);
  return {
    start: { p: sub(p0, scale(d0, tail)), heading },
    strokes: [
      { op: "line", length: tail },
      { op: "spiral", r0, k, rEnd, turn },
    ],
    eye,
    r0,
  };
}

// ------------------------------------------------------------ the panel

/** One edge of a panel's clear opening; the clearance is positive inside. */
export type Edge =
  /** A circle: inside when within it (`within` true) or outside it. */
  | { readonly kind: "circle"; readonly c: Pt; readonly r: number; readonly within: boolean }
  /** A line n . p = d, inside where n . p <= d (n unit). */
  | { readonly kind: "line"; readonly n: Pt; readonly d: number };

/** A point's clearance from an edge: its distance to it, positive inside. */
export function clearance(e: Edge, p: Pt): number {
  if (e.kind === "line") return e.d - dot(e.n, p);
  const r = Math.hypot(...sub(p, e.c));
  return e.within ? e.r - r : r - e.r;
}

/**
 * A band panel in the arch's plane: its frame (the intrados' face on its
 * axis, the axis, across it toward montant k + 1) and its clear opening's
 * edges, the members' faces: the intrados below, the montants either side
 * (`low` toward the crown, `high` toward the foot), and above it the
 * extrados' or, where b cuts in, b's face.
 */
export interface Panel {
  readonly origin: Pt;
  readonly up: Pt;
  readonly across: Pt;
  readonly bottom: Edge;
  readonly low: Edge;
  readonly high: Edge;
  readonly top: readonly Edge[];
}

/** The panel's ironwork as centrelines in the arch's plane. */
export interface PanelIronwork {
  /** The frame, cut at the top edge where b cuts it: one piece, or more. */
  readonly frame: Pt[][];
  /** The three bars: the lower side's, the axis one, the upper side's. */
  readonly bars: Pt[][];
  /** The volutes that fit, and each one's eye. */
  readonly volutes: Pt[][];
  readonly eyes: Pt[];
  /** Which of `VOLUTES` each kept volute is. */
  readonly which: number[];
}

const topClear = (panel: Panel, p: Pt) => Math.min(...panel.top.map((e) => clearance(e, p)));
/** A point's clearance from every edge of the panel's opening. */
export function panelClearance(panel: Panel, p: Pt): number {
  return Math.min(topClear(panel, p), clearance(panel.bottom, p), clearance(panel.low, p), clearance(panel.high, p));
}

/** Where f changes sign between a (f >= 0) and b (f < 0): bisection, fixed count, so deterministic. */
function root(f: (p: Pt) => number, a: Pt, b: Pt): Pt {
  let lo = a;
  let hi = b;
  for (let i = 0; i < 60; i++) {
    const mid: Pt = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
    if (f(mid) >= 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The runs of a polyline where f >= 0, cut where it crosses zero; f also
 * reads the direction of the segment it is asked about.
 */
export function clip(line: readonly Pt[], f: (p: Pt, d: Pt) => number): Pt[][] {
  const out: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[i]!;
    if (i === 0) {
      if (f(p, unit(sub(line[1] ?? p, p))) >= 0) run.push(p);
      continue;
    }
    const q = line[i - 1]!;
    const d = unit(sub(p, q));
    const g = (x: Pt) => f(x, d);
    const was = g(q) >= 0;
    const inside = g(p) >= 0;
    if (was && !inside) {
      run.push(root(g, q, p));
      if (run.length >= 2) out.push(run);
      run = [];
    } else if (!was && inside) {
      run = [root(g, p, q)];
    }
    if (inside) run.push(p);
  }
  if (run.length >= 2) out.push(run);
  return out;
}

/**
 * How far a bar `half` wide, heading `d` and cut square at p, stands clear
 * of the given edges at its worse corner: the end's own clearance less the
 * half-width's reach toward each edge. Zero where the corner meets the face.
 */
export function squareEndClearance(edges: readonly Edge[], p: Pt, d: Pt, half: number): number {
  const across: Pt = [-d[1], d[0]];
  return Math.min(
    ...edges.map((e) => {
      const n = e.kind === "line" ? e.n : unit(sub(p, e.c));
      return clearance(e, p) - half * Math.abs(dot(n, across));
    }),
  );
}

/** The ironwork of one band panel [the rule: see the file's comment]. */
export function panelIronwork(panel: Panel): PanelIronwork {
  const at = ([s, v]: Pt): Pt => add(panel.origin, add(scale(panel.across, s), scale(panel.up, v)));
  const heading = Math.atan2(panel.up[1], panel.up[0]);
  const top = (p: Pt) => topClear(panel, p);
  const bottom = (p: Pt) => clearance(panel.bottom, p);
  // A vertical of the panel's frame from below the intrados to above the band.
  const upright = (s: number): [Pt, Pt] => [at([s, -0.5]), at([s, 4])];
  /** Where the vertical at s meets the intrados' face. */
  const foot = (s: number) => root((p) => -bottom(p), ...upright(s));
  /** Where a montant's face meets the top edge: the opening's top corner. */
  const corner = (side: Edge) => {
    const onFace = (v: number): Pt => {
      // The face's point at height v of the panel's frame.
      const e = side as Extract<Edge, { kind: "line" }>;
      const o = at([0, v]);
      const s = (e.d - dot(e.n, o)) / dot(e.n, panel.across);
      return at([s, v]);
    };
    return root(top, onFace(0), onFace(4));
  };

  // The clear half-width at the foot: the montants' faces on the intrados.
  const lowFoot = root((p) => clearance(panel.low, p), foot(0), at([-3, 0]));
  const halfFoot = dot(sub(foot(0), lowFoot), panel.across);
  const a = halfFoot - FRAME_WIDTH / 2;
  const spring = FRAME_CROWN - a;
  const legFoot = foot(-a);
  const rise = dot(sub(at([-a, spring]), legFoot), panel.up);
  const frameLine = trace({ p: legFoot, heading }, [
    { op: "line", length: rise },
    { op: "arc", radius: a, turn: -Math.PI },
    { op: "line", length: rise },
  ], FRAME_WIDTH / 2);
  // Every piece is cut square where its corner meets the face it ends on:
  // the frame at the top edge (b's face, where b cuts it), the axis bar at
  // the extrados, the two outer bars in the opening's top corners, aimed at
  // the corner and stopping where their edge meets the montant or the chord
  // (Fig. 14 ends them 0.10 inboard of the corner, measured).
  const frame = clip(frameLine, (p, d) => squareEndClearance(panel.top, p, d, FRAME_WIDTH / 2));
  const bar = (s: number, end: Pt, edges: readonly Edge[]): Pt[] => {
    const f = foot(s);
    return clip([f, end], (p, d) => squareEndClearance(edges, p, d, BAR_WIDTH / 2))[0] ?? [f, f];
  };
  const barLow = bar(-BAR_FOOT, corner(panel.low), [...panel.top, panel.low]);
  const barAxis = bar(0, at([0, 4]), panel.top);
  const barHigh = bar(BAR_FOOT, corner(panel.high), [...panel.top, panel.high]);
  const bars = [barLow, barAxis, barHigh];

  const volutes: Pt[][] = [];
  const eyes: Pt[] = [];
  const which: number[] = [];
  const offset = BAR_WIDTH / 2 + VOLUTE_WIDTH / 2 + PACKING;
  const others = [...frame.map((line) => ({ line, width: FRAME_WIDTH })), ...bars.map((line) => ({ line, width: BAR_WIDTH }))];
  VOLUTES.forEach((v, i) => {
    const host = v.side < 0 ? barLow : barHigh;
    const eye = at(v.eye as Pt);
    // A turn is read in the panel's frame (across, up); where that frame is
    // mirrored in the plane, so is the turn.
    const hand = (Math.sign(cross(panel.across, panel.up)) * v.turn) as 1 | -1;
    const scroll = (tail: number) =>
      kissingScroll({ at: host[0]!, along: sub(host[host.length - 1]!, host[0]!) }, offset, eye, hand, v.k, VOLUTE_END, tail);
    // The tail runs back down its bar as far as the drawing's, or until it
    // butts on the frame's head over its packing (the upper ones do, Fig.
    // 14): the longest tail whose end stands clear of the frame.
    const hosts = others.filter((o) => o.line !== host);
    const clearAt = (tail: number) => {
      const p = scroll(tail)?.start.p;
      return p !== undefined && isClear(p, hosts, PACKING);
    };
    let tail: number = v.tail;
    if (!clearAt(tail)) {
      let lo = 0;
      for (let n = 0; n < 40; n++) {
        const mid = (lo + tail) / 2;
        if (clearAt(mid)) lo = mid;
        else tail = mid;
      }
      tail = lo;
    }
    const sc = scroll(tail);
    if (sc === undefined) return;
    const line = trace(sc.start, sc.strokes, VOLUTE_WIDTH / 2);
    if (fits(panel, line, eye, others)) {
      volutes.push(line);
      eyes.push(eye);
      which.push(i);
    }
  });
  return { frame, bars, volutes, eyes, which };
}

/**
 * Whether a volute fits its panel: its bar clear of every edge of the
 * opening, and of the frame and the bars except where it lies on its
 * packing; its macaron inside too.
 */
function fits(
  panel: Panel,
  line: readonly Pt[],
  eye: Pt,
  others: ReadonlyArray<{ line: readonly Pt[]; width: number }>,
): boolean {
  if (panelClearance(panel, eye) < MACARON_R) return false;
  return line.every((p) => panelClearance(panel, p) >= VOLUTE_WIDTH / 2 && isClear(p, others, -1e-9));
}

/** Whether a volute's centreline point clears the frame's and the bars' edges by `gap`. */
function isClear(p: Pt, others: ReadonlyArray<{ line: readonly Pt[]; width: number }>, gap: number): boolean {
  for (const o of others) {
    for (let i = 1; i < o.line.length; i++) {
      if (segmentDistance(p, o.line[i - 1]!, o.line[i]!) < VOLUTE_WIDTH / 2 + o.width / 2 + gap) return false;
    }
  }
  return true;
}

// ------------------------------------------------------------ the sections

/** A disc as a regular polygon, anticlockwise. */
export function disc(c: Pt, r: number, sides = MACARON_SIDES): Pt[] {
  return Array.from({ length: sides }, (_, i) => add(c, scale(dir((2 * Math.PI * i) / sides), r)));
}

/** A macaron's cross: two ribs square to the panel's axis and along it. */
export function macaronCross(c: Pt, up: Pt): Pt[][] {
  const across: Pt = [up[1], -up[0]];
  const rib = (d: Pt, n: Pt): Pt[] => [
    add(c, add(scale(d, -CROSS_LENGTH / 2), scale(n, -CROSS_WIDTH / 2))),
    add(c, add(scale(d, CROSS_LENGTH / 2), scale(n, -CROSS_WIDTH / 2))),
    add(c, add(scale(d, CROSS_LENGTH / 2), scale(n, CROSS_WIDTH / 2))),
    add(c, add(scale(d, -CROSS_LENGTH / 2), scale(n, CROSS_WIDTH / 2))),
  ];
  return [rib(up, across), rib(across, up)];
}

/** Twice the signed area of a polygon: positive anticlockwise. */
export function signedArea(p: readonly Pt[]): number {
  return p.reduce((s, q, i) => s + cross(q, p[(i + 1) % p.length]!), 0);
}

// ------------------------------------------------------------ the graph

/**
 * A flat bar on the face: its centreline, lifted to where the bar's back
 * lies, its width in the face, and the face's normal pointing off the
 * rib's decorated face, which it stands {@link IRON_DEPTH} along.
 */
export interface BarPiece {
  readonly line: readonly Vec3[];
  readonly width: number;
  readonly up: Vec3;
}

/**
 * A convex solid on the face: its boundary, and how far it stands along
 * its own normal. Wind it so that normal points off the rib's decorated
 * face.
 */
export interface Piece {
  readonly outline: readonly Vec3[];
  readonly depth: number;
}

/** The pieces a set's points belong to: the key pointsToPath groups by. */
const PIECE = "piece";
const WIDTH = "ironWidth";
const UP = "ironUp";
const DEPTH = "ironDepth";

/**
 * Point lists as points, one path each, carrying each piece's `attrs` (f32
 * tuples; a table over the point index collapses a run of one value),
 * copied onto the four faces with `turn` turned by each face's rotation.
 */
function paths(
  g: Graph,
  id: string,
  lines: ReadonlyArray<readonly Vec3[]>,
  closed: boolean,
  attrs: Readonly<Record<string, ReadonlyArray<readonly number[]>>>,
  quads: NodeHandle,
  turn?: readonly string[],
): NodeHandle {
  // Each column holds its line's value at every point of the line.
  const each = <T>(per: readonly T[]) => lines.flatMap((l, i) => l.map(() => per[i]!));
  const columns: Record<string, TableColumn> = {
    [PIECE]: ["i32", each(lines.map((_, i) => i))],
  };
  for (const [name, per] of Object.entries(attrs)) {
    const size = per[0]!.length;
    columns[name] = [size === 1 ? "f32" : (`vec${size}` as TableType), each(per)];
  }
  const slots = pointTable(g, `${id}Slots`, lines.flat(), columns);
  const path = g.add(pointsToPath, { groupAttr: PIECE, closed }, `${id}Paths`);
  const bare = g.add(removeAttribute, { names: [PIECE], domain: "point" }, `${id}Bare`);
  g.connect(slots, "out", path, "in");
  g.connect(path, "out", bare, "in");
  return copyToQuadrants(g, `${id}4`, bare, quads, turn);
}

/**
 * Solids, copied onto the four faces. A bar is its centreline swept with a
 * 'rect' section, `width` across and IRON_DEPTH up its face's normal,
 * standing on the line and capped, mitred where the line bends, so a
 * scroll has no notch at a bend; the bars are sorted by width and face, so
 * the tables their sizes ride on collapse to a few runs. A convex piece is
 * its boundary extruded by its own depth along its own normal. Both are
 * smoothed by the crease angle (`chord.ts`): a scroll's edges and a
 * macaron's rim shade as the bent bar and the disc they are, their tips and
 * faces (90 degrees off every wall) keep their edges. The `normal` is kept,
 * as the arcade's plates keep theirs (a class merge fills a missing one
 * with zeros, which the page shades black); the size attributes are
 * dropped.
 */
export function ironworkSolid(
  g: Graph,
  id: string,
  pieces: { readonly bars: readonly BarPiece[]; readonly solids: readonly Piece[] },
  quads: NodeHandle,
): NodeHandle {
  const out: NodeHandle[] = [];
  const drop: string[] = [];
  if (pieces.bars.length > 0) {
    const bars = [...pieces.bars].sort(
      (a, b) => a.width - b.width || a.up[0] - b.up[0] || a.up[1] - b.up[1] || a.up[2] - b.up[2],
    );
    const attrs = { [WIDTH]: bars.map((b) => [b.width]), [UP]: bars.map((b) => b.up) };
    const lines = paths(g, `${id}Line`, bars.map((b) => b.line), false, attrs, quads, [UP]);
    const swept = g.add(
      sweepProfile,
      { profile: "rect", width: attribute(WIDTH), height: IRON_DEPTH, anchor: "bottom", up: attribute(UP, 3) },
      `${id}Bars`,
    );
    g.connect(lines, "out", swept, "in");
    out.push(swept);
    drop.push(WIDTH, UP);
  }
  if (pieces.solids.length > 0) {
    const attrs = { [DEPTH]: pieces.solids.map((p) => [p.depth]) };
    const rims = paths(g, `${id}Rim`, pieces.solids.map((p) => p.outline), true, attrs, quads);
    const solids = g.add(
      extrudePolygon,
      { direction: "polygonNormal", distance: attribute(DEPTH), caps: "both", sides: true },
      `${id}Solids`,
    );
    g.connect(rims, "out", solids, "in");
    out.push(solids);
    drop.push(DEPTH);
  }
  if (out.length === 0) throw new Error(`ironwork: piece set "${id}" is empty`);
  const both = smoothed(g, `${id}Smooth`, out.length === 1 ? out[0]! : merge(g, `${id}Solid`, out));
  const done = g.add(removeAttribute, { names: drop, domain: "point" }, id);
  g.connect(both, "out", done, "in");
  return done;
}
