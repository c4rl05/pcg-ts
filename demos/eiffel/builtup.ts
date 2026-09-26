/**
 * THE UPRIGHTS AS BUILT: supports to XVII, the sixteen arbalétriers of the
 * four legs as PL-XXXI's sections make them (`UPRIGHT_SECTIONS`,
 * `UPRIGHT_BOX` in spec.ts), and the one place anything reads where a
 * lower upright's steel is; and above XVII (at the end of this file) the
 * legs' c, b and d and the shaft's eight, from its upper sections
 * (`UPPER_SECTIONS`, `UPPER_BOX`).
 *
 * THE BOX. A constant 0.877 m square IN PLAN, its faces in the tower's face
 * planes, the plates growing inward as they thicken [sourced text]. Square
 * to the leaning axis that is a lozenge, not a square: 101 38' / 78 22' in
 * panels 1-4, the angle PL-IX fig. 28 prints [derived: 101.64 deg from the
 * node table]. So no square section swept along the axis can be it — the
 * swept skin this replaces was 0.82 square below the 1st floor and rolled
 * 11.6 degrees off the x-facing faces there — and it is built instead as
 * what it is: four web PLATES per panel, each a flat box in its face,
 * straight within the panel as the uprights are.
 *
 * A face (plan direction d, one of +-x, +-z) on panel segment k: its centre
 * line is the axis offset 0.4385 along d in plan, taken square to the axis
 * T, so every plate end lies in its node's normal plane (a tronçon is cut
 * square to its axis [sourced text]); e runs across the face, in its plane
 * and square to T; n is its outward normal. Across the face the plate is W
 * = 0.877 |h projected off T| wide (h the face's horizontal), which is the
 * web width PL-XXXI prints: 800 in panels 1-4, 822 in 5, 832-868 in 6-11
 * [derived, within 2 mm of every printed width from XXVIII to XIX; XVIII's
 * printed widths are XIX's, see SOURCES.md]. Laid out in the face as (s
 * along e from its centre line, o along n out of the web's outer surface),
 * a web is s in +-W/2, o in [-t, 0]: the outer skin never moves.
 *
 * WHERE THE COLUMN TURNS (XXIV-XVIII) the two panels' faces meet on the
 * node's HORIZONTAL line: both boxes have the node's plan square there, so
 * each face plane holds that line [derived]. It crosses a plate's square
 * end at up to 24 degrees (the angle between h and e: panels 1-4), so a
 * box, whose ends are square to its axis, cannot mitre on it. Each plate
 * therefore ends where its own centre line crosses the node's horizontal
 * plane, run on by `KINK_CLOSE` to close the sliver its end and the next
 * panel's leave between them. Sampled over the true faces round every
 * turn, 5 mm in from their corners, no point of the skin is left
 * uncovered, and what shows is at worst a plate standing 21 mm proud of,
 * or 14 mm short of, the true face at the end of its run-on (up to 0.21 m
 * along the axis where the crease is most oblique) [measured on the cooked
 * plates; running each end on to the plane bisecting the two panels'
 * normal sections instead left 304 of 1.74 M samples uncovered and steps
 * of 28-32 mm]. At the corners themselves a notch under 10 mm wide stays
 * open 10-40 mm above the node, up to 7.3 mm deep at XXIV and XXIII (2.8
 * at XXII, under 1.5 above): the upper panel's face is wider there than
 * the lower plate, and its own plate starts above [measured by the
 * independent check; a longer run-on narrows it slowly, 90 mm halves it,
 * at 7 mm more proud]. The real tronçons are
 * spliced there under cover plates ("ils s'infléchissent dans le joint" at
 * XXIV [sourced text]); the splices (at the end of this file) cover the
 * bends XXIV and XXIII in two halves, each clear of the fold.
 *
 * THICKNESS steps at the node (section k governs panel k whole): Eiffel's
 * joints, where a step can only fall, are about 2.25 m either side of it,
 * which side unstated [sourced text / ?]; since the plates grow inward the
 * step cannot be seen from outside.
 *
 * WHAT STANDS OUT OF THE WEBS, at the laced depth and up:
 *   - on every face a C.J., the strip over the butt of the two half plates
 *     on the face's centre line (205 x 12 on a montant-exterior face and
 *     200 x 12 on an interior one in panels 1-5; 200 wide and as thick as
 *     the table says in 6-11);
 *   - panels 1-5, exterior faces: two angles back to back on the C.J., their
 *     flat legs 200 over it, their outstanding legs a fin 24 thick standing
 *     100 proud of the C.J. [sourced D28, Z28, PL-IX figs 23-24];
 *   - panels 1-5, interior faces: a channel, two angles on the web with
 *     their heels 385 apart and their flat legs turned out [sourced PL-IX
 *     fig. 21], the seat of the montant's lattice gussets.
 * The plain depth draws the webs alone: the envelope is the same at every
 * depth, so nothing that is fitted to it sees two different boxes. Inside
 * the box (the corner angles, the diaphragms) nothing is drawn: a closed
 * box shows none of it.
 */
import type { Vec3 } from "./lattice.js";
import {
  NODES,
  SPLICE,
  UPPER_BOX,
  UPPER_SECTIONS,
  UPRIGHT_BOX,
  UPRIGHT_SECTIONS,
  type UpperMakeup,
  type UpperSection,
  type UprightMakeup,
  type UprightSection,
} from "./spec.js";
import { UPRIGHT_SEAMS } from "./strut.js";

/** A lower upright's name: a (inner corner), b, c (outer corner), d. */
export type UprightName = "a" | "b" | "c" | "d";

/** A leg's four uprights in the +x+z quadrant, ring order c, b, a, d, as (x, z) picks off the profile. */
export const LEG_UPRIGHTS: ReadonlyArray<readonly [UprightName, "outer" | "inner", "outer" | "inner"]> = [
  ["c", "outer", "outer"],
  ["b", "inner", "outer"],
  ["a", "inner", "inner"],
  ["d", "outer", "inner"],
];

/** A face's plan direction: [1, 0] is the +x face, [0, -1] the -z one. */
export type PlanDir = readonly [number, number];
/** The four faces of a box. */
export const BOX_FACES: readonly PlanDir[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * The lower box's panel segments: k runs NODES[k] -> NODES[k + 1], from
 * the supports -> XXVIII (k = 0) to XVIII -> XVII (k = 11), where the
 * section steps to the upper chains' 0.50 box.
 */
export const LOWER_SEGMENTS = 12;

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (...vs: Vec3[]): Vec3 => vs.reduce<Vec3>((p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]], [0, 0, 0]);
const scale = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const unit = (p: Vec3): Vec3 => scale(p, 1 / Math.hypot(p[0], p[1], p[2]));
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** v made square to the unit T. */
const squareTo = (v: Vec3, T: Vec3): Vec3 => sub(v, scale(T, dot(v, T)));

/** The section governing panel segment k: its bottom node's, XXVIII's for the base stretch [derived]. */
export function sectionOf(k: number): UprightSection {
  const name = k === 0 ? "XXVIII" : NODES[k]!.name;
  const s = UPRIGHT_SECTIONS.find((x) => x.section === name);
  if (s === undefined) throw new Error(`eiffel builtup: no section governs segment ${k} (node ${name})`);
  return s;
}

/** One upright's makeup on panel segment k. */
export function makeupOf(name: UprightName, k: number): UprightMakeup {
  const s = sectionOf(k);
  return name === "a" ? s.a : name === "c" ? s.c : s.bd;
}

/** Whether face d of upright `name` is montant-interior (toward a neighbour in the leg). */
export function isInterior(name: UprightName, d: PlanDir): boolean {
  return UPRIGHT_BOX.interior[name].some(([x, z]) => x === d[0] && z === d[1]);
}

/** An upright's axis over panel segment k: its two nodes and unit direction. */
export interface SegmentAxis {
  readonly A: Vec3;
  readonly Q: Vec3;
  readonly T: Vec3;
}

export function segmentAxis(name: UprightName, k: number): SegmentAxis {
  const [, xs, zs] = LEG_UPRIGHTS.find((u) => u[0] === name)!;
  const p = NODES[k]!;
  const q = NODES[k + 1]!;
  const A: Vec3 = [p[xs], p.y, p[zs]];
  const Q: Vec3 = [q[xs], q.y, q[zs]];
  return { A, Q, T: unit(sub(Q, A)) };
}

/** A face's frame square to an axis T, of a plan square 2H: its centre-line offset from the axis, across (e), out (n), and width. */
export interface FaceFrame {
  readonly mid: Vec3;
  readonly e: Vec3;
  readonly n: Vec3;
  readonly W: number;
}

export function faceFrame(T: Vec3, d: PlanDir, H: number = UPRIGHT_BOX.planHalf): FaceFrame {
  const dv: Vec3 = [d[0], 0, d[1]];
  const h: Vec3 = [Math.abs(d[1]), 0, Math.abs(d[0])];
  const hp = squareTo(h, T);
  const e = unit(hp);
  let n = unit(cross(T, e));
  if (dot(n, dv) < 0) n = scale(n, -1);
  return { mid: squareTo(scale(dv, H), T), e, n, W: 2 * H * Math.hypot(hp[0], hp[1], hp[2]) };
}

/** The web's and the C.J.'s thickness on face d of `name` on segment k (m). */
export function faceMakeup(name: UprightName, k: number, d: PlanDir): { web: number; cj: number; cjWidth: number } {
  const m = makeupOf(name, k);
  const side = isInterior(name, d) ? m.int : m.ext;
  const cjWidth =
    k <= 5 ? (isInterior(name, d) ? UPRIGHT_BOX.cjInterior.width : UPRIGHT_BOX.cjExterior.width) : UPRIGHT_BOX.cjUpperWidth;
  return { web: side.web / 1000, cj: side.cj / 1000, cjWidth };
}

/**
 * What of the steel outside the webs a depth draws: the C.J.s (`cj`) and
 * panels 1-5's fins and channels (`angles`). The plain depth draws
 * neither; the laced depth and up both.
 */
export interface Protrusions {
  readonly cj: boolean;
  readonly angles: boolean;
}
/** Nothing out of the webs: the plain depth. */
export const WEBS_ONLY: Protrusions = { cj: false, angles: false };
/** Everything the section table puts outside the webs: the laced depth and up. */
export const AS_BUILT: Protrusions = { cj: true, angles: true };

/** A rectangle of steel in a face's (s across, o out of the web) coordinates, running the panel's length. */
export interface FacePiece {
  readonly what: "web" | "cj" | "finFlat" | "fin" | "channelFlat" | "channelLeg" | "flange" | "stem" | "angle" | "closure";
  readonly s0: number;
  readonly s1: number;
  readonly o0: number;
  readonly o1: number;
}

/**
 * The steel of face d of `name` on segment k: its web, and what `show`
 * asks of what stands out of it (see the header). The fin's two
 * outstanding legs lie back to back as one 24 mm stem; the angles' flat
 * legs, 2 x 100 over the 205 C.J., as one 200 strip on it [derived from
 * D28 and PL-IX fig. 23 at their scale; the few mm between the flats are
 * not drawn].
 */
export function facePieces(name: UprightName, k: number, d: PlanDir, show: Protrusions): FacePiece[] {
  const { web, cj, cjWidth } = faceMakeup(name, k, d);
  const W = faceFrame(segmentAxis(name, k).T, d).W;
  const out: FacePiece[] = [{ what: "web", s0: -W / 2, s1: W / 2, o0: -web, o1: 0 }];
  if (!show.cj) return out;
  out.push({ what: "cj", s0: -cjWidth / 2, s1: cjWidth / 2, o0: 0, o1: cj });
  if (k > 5 || !show.angles) return out;
  const { leg, t } = UPRIGHT_BOX.angle;
  if (!isInterior(name, d)) {
    out.push(
      { what: "finFlat", s0: -leg, s1: leg, o0: cj, o1: cj + t },
      { what: "fin", s0: -t, s1: t, o0: cj + t, o1: cj + leg },
    );
    return out;
  }
  const heel = UPRIGHT_BOX.channelHeels / 2;
  for (const g of [-1, 1]) {
    const lo = (a: number, b: number) => Math.min(g * a, g * b);
    const hi = (a: number, b: number) => Math.max(g * a, g * b);
    out.push(
      { what: "channelFlat", s0: lo(heel, heel + leg), s1: hi(heel, heel + leg), o0: 0, o1: t },
      { what: "channelLeg", s0: lo(heel, heel + t), s1: hi(heel, heel + t), o0: t, o1: leg },
    );
  }
  return out;
}

/** How far the steel stands out of a web at most, by what the depth draws: a face's protrusions' top. */
export function standOut(name: UprightName, k: number, d: PlanDir, show: Protrusions): number {
  return Math.max(0, ...facePieces(name, k, d, show).map((p) => p.o1));
}

/**
 * The half-width of the box in a plane through the axis that holds the
 * horizontal h: 0.4385 |h projected off T|. It is half the width of the
 * box's face PARALLEL to that plane, and what a member lying in a leg face
 * meets: the leg's face through c and b holds x, so at c it meets the
 * strip |dx| <= 0.4385, whose half-width square to the axis is this.
 */
export function inPlaneHalf(T: Vec3, h: Vec3): number {
  const hp = squareTo(h, T);
  return UPRIGHT_BOX.planHalf * Math.hypot(hp[0], hp[1], hp[2]);
}

/**
 * Over panel segment k, the least and greatest of every lower upright's
 * in-plane half-widths (both horizontals, all four members), and the most
 * any face that takes a member stands out of its web as built.
 * Every web member of a leg face lands on a montant-INTERIOR face (the
 * face's two uprights face each other), so that is the channel's 100 in
 * panels 1-5 and the C.J. in 6-11.
 */
export function segmentEnvelope(k: number): { min: number; max: number; landing: number } {
  let min = Infinity;
  let max = -Infinity;
  let landing = 0;
  for (const [name] of LEG_UPRIGHTS) {
    const { T } = segmentAxis(name, k);
    for (const h of [
      [1, 0, 0],
      [0, 0, 1],
    ] as const) {
      const r = inPlaneHalf(T, h);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    // Measured in the member's plane, square to the axis: the face's
    // normal is off that plane by the lozenge's skew (11.6 deg in panels
    // 1-4), so a stand-out o reaches o / cos of it there.
    for (const d of UPRIGHT_BOX.interior[name]) {
      const u = unit(squareTo([d[0], 0, d[1]], T));
      landing = Math.max(landing, standOut(name, k, d, AS_BUILT) / dot(faceFrame(T, d).n, u));
    }
  }
  return { min, max, landing };
}

/**
 * A (y, value) table over the lower segments, stepping at every node and
 * taking `atNode` of the two panels' values AT the node (a member ending
 * there meets both), then `above` from XVII up (a table that starts at
 * XVII, as `MEMBERS.uprightAbove` does).
 */
function segmentTable(
  value: (k: number) => number,
  atNode: (a: number, b: number) => number,
  above: ReadonlyArray<readonly [number, number]>,
): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let k = 0; k < LOWER_SEGMENTS; k++) {
    const y0 = NODES[k]!.y;
    const y1 = NODES[k + 1]!.y;
    const v = value(k);
    out.push([y0, k === 0 ? v : atNode(value(k - 1), v)], [y0 + 0.01, v], [y1 - 0.01, v]);
  }
  // XVII, where the upper chains start on the 0.50 box: the lower box's
  // value AT the node (a member there clears both), then a step.
  const top = NODES[LOWER_SEGMENTS]!.y;
  out.push([top, value(LOWER_SEGMENTS - 1)], [top + 0.01, above[0]![1]]);
  for (const [y, v] of above) if (y > top + 0.01) out.push([y, v]);
  return out;
}

/**
 * THE JOINT RULE'S UPRIGHT, for `JointOpts.upright`: how far a web member's
 * strut must stay from a lower upright's axis, in its own plane, square to
 * the axis: the box's in-plane half-width (the greatest of the panel's)
 * plus what stands out of the landing face (the channel's 100 in panels
 * 1-5, where the strut's near face would otherwise run into its legs; the
 * C.J. in 6-11). Above XVII, `above` (the 0.50 boxes). The section AS
 * BUILT, whatever a depth draws of it: a joint exists only at the laced
 * depth and up, which draws all of it.
 */
export function jointUpright(above: ReadonlyArray<readonly [number, number]>): Array<readonly [number, number]> {
  return segmentTable(
    (k) => {
      const env = segmentEnvelope(k);
      return env.max + env.landing;
    },
    Math.max,
    above,
  );
}

/**
 * Where a joint's gusset plates meet a lower upright, for `JointOpts.face`:
 * the web itself, the least in-plane half-width of the panel's (so no plate
 * corner stands off a narrower face). On the face its member lands on, the
 * channel stands between a joint's two plates, 0.40 off the member's plane
 * either side; PL-IX seats the real gussets on the channel's legs, 0.19
 * off it, which the model does not (D3 of the design study, SOURCES.md
 * §27). So the plates lap the upright's two OTHER faces, 8 mm off their
 * webs, and there a C.J. or a flat leg meets them and a channel's or fin's
 * outstanding leg stands through them [measured: tests/eiffelBuiltup.test.ts].
 */
export function jointFace(above: ReadonlyArray<readonly [number, number]>): Array<readonly [number, number]> {
  return segmentTable((k) => segmentEnvelope(k).min, Math.min, above);
}

/** One flat box: its centre line, the normal its thickness runs along, and its size. */
export interface UprightPlate {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly n: Vec3;
  readonly width: number;
  readonly thickness: number;
  readonly what: FacePiece["what"] | "cover" | "coverAngle" | "filler";
}

/**
 * How far past its node's crease (where its centre line crosses the node's
 * horizontal plane) a plate runs on at a turn [measured: sampled over the
 * true faces 5 mm in from their corners, 20 mm leaves 34 points of 1.74 M
 * uncovered, 30 mm none, and each 10 mm more stands another 1.3 mm proud].
 */
export const KINK_CLOSE = 0.03;

/**
 * A piece's ends along its panel's axis, from the panel's lower node A: 0
 * and L where the column runs straight on, and at a node where it turns,
 * where the piece's centre line (`off` from the axis, square to T) crosses
 * the node's horizontal plane, run on by KINK_CLOSE.
 */
function pieceEnds(off: Vec3, T: Vec3, L: number, kinkLo: boolean, kinkHi: boolean): readonly [number, number] {
  const crease = -off[1] / T[1];
  return [kinkLo ? crease - KINK_CLOSE : 0, kinkHi ? L + crease + KINK_CLOSE : L];
}

/**
 * Whether the column turns at the lower and upper node of segment k of
 * `name` (the supports' node, extended from panel 1's line, is straight to
 * within the table's rounding: 1e-9 in the cosine is a 45 microradian turn).
 */
function turns(name: UprightName, k: number): { lo: boolean; hi: boolean } {
  const { T } = segmentAxis(name, k);
  const lo = k > 0 && dot(T, segmentAxis(name, k - 1).T) < 1 - 1e-9;
  const hi = k + 1 < LOWER_SEGMENTS && dot(T, segmentAxis(name, k + 1).T) < 1 - 1e-9;
  return { lo, hi };
}

/**
 * The lower box's plates, one leg's four uprights, every panel segment:
 * the webs, and what `show` asks of the C.J.s, fins and channels. In the
 * +x+z leg; the caller copies them onto the quadrants.
 */
export function lowerPlates(show: Protrusions): UprightPlate[] {
  const out: UprightPlate[] = [];
  for (const [name] of LEG_UPRIGHTS) {
    for (let k = 0; k < LOWER_SEGMENTS; k++) {
      const { A, Q, T } = segmentAxis(name, k);
      const L = Math.hypot(...sub(Q, A));
      const turn = turns(name, k);
      for (const d of BOX_FACES) {
        const f = faceFrame(T, d);
        for (const p of facePieces(name, k, d, show)) {
          const s = (p.s0 + p.s1) / 2;
          const o = (p.o0 + p.o1) / 2;
          const lying = p.s1 - p.s0 >= p.o1 - p.o0;
          const off = add(f.mid, scale(f.e, s), scale(f.n, o));
          const [lo, hi] = pieceEnds(off, T, L, turn.lo, turn.hi);
          out.push({
            a: add(A, off, scale(T, lo)),
            b: add(A, off, scale(T, hi)),
            n: lying ? f.n : f.e,
            width: lying ? p.s1 - p.s0 : p.o1 - p.o0,
            thickness: lying ? p.o1 - p.o0 : p.s1 - p.s0,
            what: p.what,
          });
        }
      }
    }
  }
  // The covers over the tronçons' joints go with the C.J.s (the splices, below).
  if (show.cj) out.push(...lowerCoverPlates());
  return out;
}

/**
 * The lower box's seam rows, one leg: on every face of every panel, a row
 * `inset` in from each of its two corners on the web's outer surface, a
 * head every `pitch`, the rows centred on their stretch and at least half
 * a pitch short of each end of it: a node where the column runs straight,
 * and where it turns, whichever comes first of the row's own crossing of
 * the node's horizontal plane (the face's fold), its plate's end, and the
 * end of the next panel's plate, which runs on over it there. So two
 * panels' heads never meet at a node, and none stands under a plate. Each row carries its face's
 * outward normal, for `lineRivets` with no offset. The rows are today's
 * rule (`UPRIGHT_SEAMS`: the middle of a 100 angle's leg in from the
 * corner), re-seated on the true faces; the rows as built are rivets25's.
 * A row stops half a pitch short of the cover over it at each tronçon
 * joint (`lowerCornerCuts`), and runs on over the cover as its own column.
 */
export function lowerSeamRows(pitch: number, inset: number): Array<{ a: Vec3; b: Vec3; n: Vec3 }> {
  const out: Array<{ a: Vec3; b: Vec3; n: Vec3 }> = [];
  // A web's two ends, as points on its centre line, and its panel's axis.
  const webEnds = (name: UprightName, k: number, d: PlanDir) => {
    const { A, Q, T } = segmentAxis(name, k);
    const f = faceFrame(T, d);
    const web = facePieces(name, k, d, WEBS_ONLY)[0]!;
    const off = add(f.mid, scale(f.n, (web.o0 + web.o1) / 2));
    const turn = turns(name, k);
    const [lo, hi] = pieceEnds(off, T, Math.hypot(...sub(Q, A)), turn.lo, turn.hi);
    return { T, lo: add(A, off, scale(T, lo)), hi: add(A, off, scale(T, hi)) };
  };
  for (const [name] of LEG_UPRIGHTS) {
    for (let k = 0; k < LOWER_SEGMENTS; k++) {
      const { A, Q, T } = segmentAxis(name, k);
      const L = Math.hypot(...sub(Q, A));
      const turn = turns(name, k);
      for (const d of BOX_FACES) {
        const f = faceFrame(T, d);
        const own = webEnds(name, k, d);
        const below = turn.lo ? webEnds(name, k - 1, d) : undefined;
        const above = turn.hi ? webEnds(name, k + 1, d) : undefined;
        for (const g of [-1, 1]) {
          const off = add(f.mid, scale(f.e, g * (f.W / 2 - inset)));
          // Where the row, A + off + T a, meets the plane square to a
          // plate's axis through its end point.
          const meets = (p: Vec3, U: Vec3) => dot(sub(p, add(A, off)), U) / dot(T, U);
          const crease = -off[1] / T[1];
          // At a turn: the fold, its own plate's end, and the next panel's
          // plate's end, which runs on over this one.
          const lo =
            (below === undefined ? 0 : Math.max(crease, meets(own.lo, T), meets(below.hi, below.T))) + pitch / 2;
          const hi =
            (above === undefined ? L : Math.min(L + crease, meets(own.hi, T), meets(above.lo, above.T))) - pitch / 2;
          if (hi < lo) continue;
          // Each stretch the tronçons' covers leave it (the splices, below).
          for (const [s0, s1] of subtract(lo, hi, lowerCornerCuts(name, k, d, off, pitch, inset))) {
            if (s1 < s0) continue;
            const n = Math.floor((s1 - s0) / pitch + 1e-9) + 1;
            const from = (s0 + s1 - (n - 1) * pitch) / 2;
            // 0.1 mm short of (n - 1) pitches: spacing mode then lands exactly
            // n heads (legs.ts `rowMembers`); a row of one is a point.
            const to = from + Math.max(0, (n - 1) * pitch - 1e-4);
            out.push({ a: add(A, off, scale(T, from)), b: add(A, off, scale(T, to)), n: f.n });
          }
        }
      }
    }
  }
  return out;
}

/*
 * ===========================================================================
 * THE UPPER UPRIGHTS, XVII to the top of panel 28 (`UPPER_SECTIONS`,
 * `UPPER_BOX` in spec.ts): the legs' c, b and d above the 2nd floor
 * (panels 12-17, closed 500 boxes) and the shaft's eight from XI (panel 18:
 * c a box, the merged bd a T 1,000 wide; panels 19-28: c an open L, closed
 * over its nodes' attachments, and bd a T 500 x 500).
 *
 * Built as the lower box is: a flat box per plate per panel in the face it
 * lies in, the 500 square IN PLAN about the axis with its faces in the
 * tower's face planes, the plies growing inward, the thickness stepping at
 * the node, each plate ending where its centre line crosses the node's
 * horizontal plane (+ KINK_CLOSE) where the column turns. It turns at XV,
 * XIV and XIII, at XI (where the legs' b and d end on the T and the corner
 * c runs on into the shaft) and at X; panels 19-28 are one straight
 * frustum.
 *
 * AT XI the legs' b and d, 0.50 apart axis to axis, touch in the face's
 * centre plane; above it their two facing heavy faces go on as the T's
 * stem (two plies of 10) and their two faces in the tower's face as its
 * flange: their plates end on the node's horizontal line and the T's begin
 * on it. No seam head is laid on those facing faces where they stand
 * closer than two heads' rise apart (the last 0.195 below XI, and half a
 * pitch more).
 *
 * Canonical members (the +x+z leg; bd on the +z face): c (outer, outer), b
 * (inner, outer), d (outer, inner), bd (0, outer). The legs' are copied
 * onto the quadrants by the caller; the shaft's are turned here.
 * ===========================================================================
 */

/** An upper upright, canonical: the corner c, the legs' b and d, the shaft's merged bd. */
export type UpperName = "c" | "b" | "d" | "bd";

const nodeIndex = (name: string): number => NODES.findIndex((n) => n.name === name);
/** Segment k runs NODES[k] -> NODES[k + 1]: the legs' upper chains k in [XVII, XI), the shaft's in [XI, top28). */
export const UPPER_FROM = nodeIndex("XVII");
export const SHAFT_FROM = nodeIndex("XI");
export const UPPER_TO = nodeIndex("top28");

/**
 * The faces of an upper box that carry its heavy plies [sourced PL-XXXI
 * UP3, UP4]: c's two in the tower's faces; b's and d's in the tower's face
 * and toward the face's centre line (away from c).
 */
const HEAVY: Readonly<Record<"c" | "b" | "d", readonly PlanDir[]>> = {
  c: [
    [1, 0],
    [0, 1],
  ],
  b: [
    [0, 1],
    [-1, 0],
  ],
  d: [
    [1, 0],
    [0, -1],
  ],
};
/** b's and d's faces toward the next leg's d and b, which they touch at XI. */
const FACING: Readonly<Record<"b" | "d", PlanDir>> = { b: [-1, 0], d: [0, -1] };

const same = (p: PlanDir, q: PlanDir): boolean => p[0] === q[0] && p[1] === q[1];

/** An upper upright's axis over segment k, canonical. */
export function upperAxis(name: UpperName, k: number): SegmentAxis {
  const at = (n: (typeof NODES)[number]): Vec3 =>
    name === "c"
      ? [n.outer, n.y, n.outer]
      : name === "b"
        ? [n.inner, n.y, n.outer]
        : name === "d"
          ? [n.outer, n.y, n.inner]
          : [0, n.y, n.outer];
  const A = at(NODES[k]!);
  const Q = at(NODES[k + 1]!);
  return { A, Q, T: unit(sub(Q, A)) };
}

/** `name`'s makeup in the upper section governing segment k. */
export function upperMakeupOf(name: UpperName, k: number): UpperMakeup {
  const s: UpperSection | undefined = UPPER_SECTIONS.find((x) => x.section === NODES[k]!.name);
  if (s === undefined) throw new Error(`eiffel builtup: no upper section governs segment ${k} (node ${NODES[k]!.name})`);
  return name === "c" ? s.c : s.bd;
}

/** The segments an upper upright has, [from, to). */
function upperRange(name: UpperName): readonly [number, number] {
  if (name === "c") return [UPPER_FROM, UPPER_TO];
  if (name === "bd") return [SHAFT_FROM, UPPER_TO];
  return [UPPER_FROM, SHAFT_FROM];
}

/**
 * Whether upper upright `name` turns at segment k's lower and upper node:
 * its axis changes direction there, or (b and d at XI, bd at XI) it hands
 * over to the other member, whose faces meet its own on the node's
 * horizontal line all the same (both have the node's plan squares there).
 */
function upperTurns(name: UpperName, k: number): { lo: boolean; hi: boolean } {
  const [k0, k1] = upperRange(name);
  const { T } = upperAxis(name, k);
  const bends = (j: number) => dot(T, upperAxis(name, j).T) < 1 - 1e-9;
  return {
    lo: (k > k0 && bends(k - 1)) || (name === "bd" && k === SHAFT_FROM),
    hi: (k + 1 < k1 && bends(k + 1)) || ((name === "b" || name === "d") && k + 1 === SHAFT_FROM),
  };
}

/** One face of an upper upright on a segment: its plan direction, its steel in its frame, and (a closing plate) how far from each end it runs. */
export interface UpperFace {
  readonly d: PlanDir;
  readonly pieces: FacePiece[];
  readonly near?: number;
}

/**
 * The steel of upper upright `name` on segment k, face by face (the header,
 * `UPPER_SECTIONS`): the webs, the L's closing plates, the T's flange and
 * stem at every depth; from the laced depth up (`show.angles`), with the
 * lower protrusions, the angles the open L and the T show.
 */
export function upperFaces(name: UpperName, k: number, show: Protrusions): UpperFace[] {
  const m = upperMakeupOf(name, k);
  const { T } = upperAxis(name, k);
  const H = UPPER_BOX.planHalf;
  if (m.shape === "T") {
    const d: PlanDir = [0, 1];
    const f = faceFrame(T, d, H);
    const F = (f.W / 2) * ((m.flange ?? 500) / 500);
    const tf = m.heavy / 1000;
    const S = m.light / 2000;
    // The stem runs in to the plan square's inner face, 2H in plan: along n, 2H n_z.
    const D = 2 * H * Math.abs(f.n[2]);
    const pieces: FacePiece[] = [
      { what: "flange", s0: -F, s1: F, o0: -tf, o1: 0 },
      { what: "stem", s0: -S, s1: S, o0: -D, o1: -tf },
    ];
    if (show.angles) {
      const a = m.angles[0]![1] / 1000;
      const t = m.angles[0]![2] / 1000;
      for (const g of [-1, 1]) {
        const s = (p: number, q: number) => ({ s0: Math.min(g * p, g * q), s1: Math.max(g * p, g * q) });
        pieces.push(
          // The flange's tip: flat leg on it, the other turned inward.
          { what: "angle", ...s(F - a, F), o0: -tf - t, o1: -tf },
          { what: "angle", ...s(F - t, F), o0: -tf - a, o1: -tf - t },
          // The stem's root, either side.
          { what: "angle", ...s(S, S + a), o0: -tf - t, o1: -tf },
          { what: "angle", ...s(S, S + t), o0: -tf - a, o1: -tf - t },
          // The stem's tip, back to back, turned out.
          { what: "angle", ...s(S, S + t), o0: -D + t, o1: -D + a },
          { what: "angle", ...s(S, S + a), o0: -D, o1: -D + t },
        );
      }
    }
    return [{ d, pieces }];
  }
  const heavy = HEAVY[name === "bd" ? "b" : name];
  const out: UpperFace[] = [];
  for (const d of BOX_FACES) {
    const f = faceFrame(T, d, H);
    const isHeavy = heavy.some((h) => same(h, d));
    if (m.shape === "L" && !isHeavy) {
      // Closed over the node's attachments [sourced text], by an 8 mm plate.
      out.push({
        d,
        pieces: [{ what: "closure", s0: -f.W / 2, s1: f.W / 2, o0: -UPPER_BOX.light, o1: 0 }],
        near: UPPER_BOX.closure,
      });
      continue;
    }
    const t = (isHeavy ? m.heavy : m.light) / 1000;
    const pieces: FacePiece[] = [{ what: "web", s0: -f.W / 2, s1: f.W / 2, o0: -t, o1: 0 }];
    if (m.shape === "L" && show.angles) {
      // In each exterior face's frame e runs toward the other exterior
      // face: the corner is at s = +W/2, the free edge at -W/2.
      const { leg: a, t: ta } = UPPER_BOX.angle;
      const w = f.W / 2;
      pieces.push(
        // The heel's leg on this plate, inside the corner.
        { what: "angle", s0: w - t - a, s1: w - t, o0: -t - ta, o1: -t },
        // The free edge's angle: flat leg on the plate, the other turned inward.
        { what: "angle", s0: -w, s1: -w + a, o0: -t - ta, o1: -t },
        { what: "angle", s0: -w, s1: -w + ta, o0: -t - a, o1: -t - ta },
      );
    }
    out.push({ d, pieces });
  }
  return out;
}

/** A quarter turn about the tower's axis, `q` times: (x, z) -> (z, -x). */
function turnQ(p: Vec3, q: number): Vec3 {
  let r = p;
  for (let i = 0; i < q; i++) r = [r[2], r[1], -r[0]];
  return r;
}

/** The plates of the given upper uprights over segments [k0, k1) (clipped to each one's own), canonical. */
function upperPlatesOf(names: readonly UpperName[], k0: number, k1: number, show: Protrusions): UprightPlate[] {
  const out: UprightPlate[] = [];
  for (const name of names) {
    const [r0, r1] = upperRange(name);
    for (let k = Math.max(k0, r0); k < Math.min(k1, r1); k++) {
      const { A, Q, T } = upperAxis(name, k);
      const L = Math.hypot(...sub(Q, A));
      const turn = upperTurns(name, k);
      for (const face of upperFaces(name, k, show)) {
        const f = faceFrame(T, face.d, UPPER_BOX.planHalf);
        for (const p of face.pieces) {
          const s = (p.s0 + p.s1) / 2;
          const o = (p.o0 + p.o1) / 2;
          const lying = p.s1 - p.s0 >= p.o1 - p.o0;
          const off = add(f.mid, scale(f.e, s), scale(f.n, o));
          const [lo, hi] = pieceEnds(off, T, L, turn.lo, turn.hi);
          const runs: ReadonlyArray<readonly [number, number]> =
            face.near === undefined ? [[lo, hi]] : [[lo, lo + face.near], [hi - face.near, hi]];
          for (const [a, b] of runs) {
            out.push({
              a: add(A, off, scale(T, a)),
              b: add(A, off, scale(T, b)),
              n: lying ? f.n : f.e,
              width: lying ? p.s1 - p.s0 : p.o1 - p.o0,
              thickness: lying ? p.o1 - p.o0 : p.s1 - p.s0,
              what: p.what,
            });
          }
        }
      }
    }
  }
  return out;
}

/** The legs' upper uprights' plates, XVII to XI, one leg (c, b, d); the caller copies them onto the quadrants. */
export function upperLegPlates(show: Protrusions): UprightPlate[] {
  const out = upperPlatesOf(["c", "b", "d"], UPPER_FROM, SHAFT_FROM, show);
  // With the protrusions, the covers over the joints (the splices, below).
  if (show.cj) out.push(...upperLegCoverPlates());
  return out;
}

/** The shaft's eight uprights' plates, XI to the top of panel 28, all four quarters. */
export function shaftPlates(show: Protrusions): UprightPlate[] {
  const one = upperPlatesOf(["c", "bd"], SHAFT_FROM, UPPER_TO, show);
  const out = [0, 1, 2, 3].flatMap((q) => one.map((p) => ({ ...p, a: turnQ(p.a, q), b: turnQ(p.b, q), n: turnQ(p.n, q) })));
  if (show.cj) out.push(...shaftCoverPlates());
  return out;
}

/** A seam row on an upper upright: across its face (s), out of it (o), and which way its heads face. */
interface RowSpec {
  readonly s: number;
  readonly o: number;
  /** Heads facing across the face (on a T's stem, through its angles), this way along e; else out along n. */
  readonly across?: 1 | -1;
}

/**
 * The seam rows of upper upright `name` on segment k: today's rule (a row
 * `inset` in from each edge a corner angle is riveted along, on the plate's
 * outer surface) laid on the steel as built. A box's four faces, two rows
 * each; the L's two plates, at its heel and at its free edges; the T's
 * flange at its tips and either side of the stem, and the stem through the
 * angles at its root and its tip, heads on their legs.
 */
function upperRows(name: UpperName, k: number, inset: number): Array<{ d: PlanDir; rows: RowSpec[] }> {
  const m = upperMakeupOf(name, k);
  const faces = upperFaces(name, k, WEBS_ONLY);
  if (m.shape === "T") {
    const f = faces[0]!;
    const F = f.pieces[0]!.s1;
    const stem = f.pieces[1]!;
    const S = stem.s1;
    const ta = m.angles[0]![2] / 1000;
    const rows: RowSpec[] = [];
    for (const g of [-1, 1] as const) {
      rows.push(
        { s: g * (F - inset), o: 0 },
        { s: g * (S + inset), o: 0 },
        { s: g * (S + ta), o: stem.o1 - inset, across: g },
        { s: g * (S + ta), o: stem.o0 + inset, across: g },
      );
    }
    return [{ d: f.d, rows }];
  }
  return faces
    .filter((face) => face.near === undefined)
    .map((face) => {
      const w = face.pieces[0]!.s1;
      return { d: face.d, rows: [{ s: w - inset, o: 0 }, { s: -(w - inset), o: 0 }] };
    });
}

/**
 * The seam rows of the given upper uprights over segments [k0, k1),
 * canonical: every row a head every `pitch`, centred on its stretch and at
 * least half a pitch short of each end of it, which at a turn is the first
 * of its own crossing of the node's horizontal plane, its face's plate's
 * end and the next panel's on that face (as `lowerSeamRows`). On b's and
 * d's faces toward the next leg a row stops where the two facing faces
 * close to two `head` rises apart. A row on a plate's outer face stops
 * half a pitch short of each joint's cover (the splices).
 */
function upperRowsOf(
  names: readonly UpperName[],
  k0: number,
  k1: number,
  pitch: number,
  inset: number,
  head: number,
): Array<{ a: Vec3; b: Vec3; n: Vec3 }> {
  const out: Array<{ a: Vec3; b: Vec3; n: Vec3 }> = [];
  // A face's first plate's two ends as points on its centre line, and its axis.
  const hostEnds = (name: UpperName, k: number, d: PlanDir) => {
    const [r0, r1] = upperRange(name);
    if (k < r0 || k >= r1) return undefined;
    const face = upperFaces(name, k, WEBS_ONLY).find((f) => same(f.d, d) && f.near === undefined);
    if (face === undefined) return undefined;
    const { A, Q, T } = upperAxis(name, k);
    const f = faceFrame(T, d, UPPER_BOX.planHalf);
    const p = face.pieces[0]!;
    const off = add(f.mid, scale(f.e, (p.s0 + p.s1) / 2), scale(f.n, (p.o0 + p.o1) / 2));
    const turn = upperTurns(name, k);
    const [lo, hi] = pieceEnds(off, T, Math.hypot(...sub(Q, A)), turn.lo, turn.hi);
    return { T, lo: add(A, off, scale(T, lo)), hi: add(A, off, scale(T, hi)) };
  };
  for (const name of names) {
    const [r0, r1] = upperRange(name);
    for (let k = Math.max(k0, r0); k < Math.min(k1, r1); k++) {
      const { A, Q, T } = upperAxis(name, k);
      const L = Math.hypot(...sub(Q, A));
      const turn = upperTurns(name, k);
      for (const { d, rows } of upperRows(name, k, inset)) {
        const f = faceFrame(T, d, UPPER_BOX.planHalf);
        const own = hostEnds(name, k, d);
        const below = turn.lo ? hostEnds(name, k - 1, d) : undefined;
        const above = turn.hi ? hostEnds(name, k + 1, d) : undefined;
        for (const r of rows) {
          const off = add(f.mid, scale(f.e, r.s), scale(f.n, r.o));
          const meets = (p: Vec3, U: Vec3) => dot(sub(p, add(A, off)), U) / dot(T, U);
          const crease = -off[1] / T[1];
          const lo =
            (turn.lo
              ? Math.max(crease, own === undefined ? -Infinity : meets(own.lo, T), below === undefined ? -Infinity : meets(below.hi, below.T))
              : 0) +
            pitch / 2;
          let hi =
            (turn.hi
              ? Math.min(L + crease, own === undefined ? Infinity : meets(own.hi, T), above === undefined ? Infinity : meets(above.lo, above.T))
              : L) -
            pitch / 2;
          if ((name === "b" || name === "d") && same(d, FACING[name])) {
            // The facing face stands (inner - H) off the face's centre
            // plane in plan, the next leg's (inner - H) the other side, and
            // inner is linear on the panel: stop where the gap is two rises.
            const p0 = NODES[k]!;
            const p1 = NODES[k + 1]!;
            if (p1.inner < p0.inner) {
              const yStop = p0.y + ((UPPER_BOX.planHalf + head - p0.inner) / (p1.inner - p0.inner)) * (p1.y - p0.y);
              hi = Math.min(hi, (yStop - A[1] - off[1]) / T[1] - pitch / 2);
            }
          }
          if (hi < lo) continue;
          // A row on a plate's outer face stops half a pitch short of each
          // joint's cover over it (the splices, below).
          const cuts =
            r.across === undefined && r.o === 0
              ? upperJoints(name)
                  .filter((j) => j.k === k)
                  .map((j) => [j.t - SPLICE.upper.length / 2 - pitch / 2, j.t + SPLICE.upper.length / 2 + pitch / 2] as const)
              : [];
          for (const [s0, s1] of subtract(lo, hi, cuts)) {
            if (s1 < s0) continue;
            const n = Math.floor((s1 - s0) / pitch + 1e-9) + 1;
            const from = (s0 + s1 - (n - 1) * pitch) / 2;
            // 0.1 mm short of (n - 1) pitches: spacing mode lands exactly n heads.
            const to = from + Math.max(0, (n - 1) * pitch - 1e-4);
            out.push({ a: add(A, off, scale(T, from)), b: add(A, off, scale(T, to)), n: r.across === undefined ? f.n : scale(f.e, r.across) });
          }
        }
      }
    }
  }
  return out;
}

/** The legs' upper seam rows, one leg; the caller copies them onto the quadrants. `head` is a rivet head's rise. */
export function upperLegSeamRows(pitch: number, inset: number, head: number): Array<{ a: Vec3; b: Vec3; n: Vec3 }> {
  return upperRowsOf(["c", "b", "d"], UPPER_FROM, SHAFT_FROM, pitch, inset, head);
}

/** The shaft's seam rows, all four quarters. */
export function shaftSeamRows(pitch: number, inset: number, head: number): Array<{ a: Vec3; b: Vec3; n: Vec3 }> {
  const one = upperRowsOf(["c", "bd"], SHAFT_FROM, UPPER_TO, pitch, inset, head);
  return [0, 1, 2, 3].flatMap((q) => one.map((r) => ({ a: turnQ(r.a, q), b: turnQ(r.b, q), n: turnQ(r.n, q) })));
}

/*
 * ===========================================================================
 * THE SPLICES (`SPLICE` in spec.ts, SOURCES.md §27.2): where each upright's
 * tronçons butt, and the cover plates (couvre-joints) over every joint,
 * each with its own rivet field.
 *
 * A tronçon ends square to its axis with every one of its plies in the
 * same plane ("toutes les pièces ... viennent s'arrêter dans un même plan
 * normal à l'axe" [sourced text p. 75]), so a joint is one station along
 * the axis and no ply is staggered past another. What steps along the face
 * is the covers' ends: three lengths on a panel 1-5 face (PL-IX figs.
 * 21-24). Every cover is centred on its joint, except at a joint in a bend
 * (XXIV, XXIII), where it runs further into the long panel than into
 * panel 5 (PL-X fig. 19); there each half lies on its own panel's face and
 * ends on the node's fold as the webs do (run on by `KINK_CLOSE`).
 *
 * What is drawn is what shows OUTSIDE the box (the covers inside it are
 * not, as nothing inside is), from the laced depth up, with the C.J.s. The
 * corner angles' seam rows stop half a pitch short of the cover over them
 * and run on over it, on its face, at their own pitch; inward of them the
 * cover's own field. The rivet fields are the riveted depth's.
 * ===========================================================================
 */

/**
 * A tronçon joint: on segment k, `t` along its axis from NODES[k]. `bent`
 * when it is the node itself (t = 0) and the column bends in it; the cover
 * then lies half on segment k - 1.
 */
export interface TronconJoint {
  readonly k: number;
  readonly t: number;
  readonly bent: boolean;
}

/** A panel of axis length L in tronçons about `troncon` long: round(L / troncon) joints, at least one, at (i + 1/2) L / n. */
function stations(L: number, troncon: number): number[] {
  const n = Math.max(1, Math.round(L / troncon));
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * L) / n);
}

const isBent = (node: string): boolean => (SPLICE.bentJoints as readonly string[]).includes(node);

/**
 * A lower upright's joints, supports to XVII: round(L / 4.5) a panel (L/6,
 * L/2, 5L/6 in panels 1-4, as the text puts them), and in panel 5 one at
 * each bend and one between them (`SPLICE`).
 */
export function lowerJoints(name: UprightName): TronconJoint[] {
  const out: TronconJoint[] = [];
  for (let k = 0; k < LOWER_SEGMENTS; k++) {
    const { A, Q } = segmentAxis(name, k);
    const L = Math.hypot(...sub(Q, A));
    const lo = isBent(NODES[k]!.name);
    if (lo) out.push({ k, t: 0, bent: true });
    const ts = lo && isBent(NODES[k + 1]!.name) ? [L / 2] : stations(L, SPLICE.troncon);
    for (const t of ts) out.push({ k, t, bent: false });
  }
  return out;
}

/** An upper upright's joints over its own segments: round(L / 6) a panel (`SPLICE`). */
export function upperJoints(name: UpperName): TronconJoint[] {
  const [k0, k1] = upperRange(name);
  const out: TronconJoint[] = [];
  for (let k = k0; k < k1; k++) {
    const { A, Q } = upperAxis(name, k);
    for (const t of stations(Math.hypot(...sub(Q, A)), SPLICE.tronconUpper)) out.push({ k, t, bent: false });
  }
  return out;
}

/**
 * How far a neighbouring web's inner edge may stand out of a face before a
 * cover keeps off it: the jitter's 1 mm, under which the classes already
 * interpenetrate (parts.ts). It stands 3.3-3.6 mm out in panels 1-5 (the
 * covers keep off), 0.6-1.4 mm in 6-11 and under 1 mm on the 500 boxes
 * [measured on the plates as built].
 */
const SLIVER = 0.001;

/** A cover's length class: a web cover, or an angle's (the longer, at a bend too). */
type CoverClass = "web" | "angle";

/** One cover piece in its face's (s, o) frame, with its length centred on a straight joint. */
interface CoverSpec {
  readonly what: "cover" | "coverAngle" | "filler";
  readonly s0: number;
  readonly s1: number;
  readonly o0: number;
  readonly o1: number;
  readonly cls: CoverClass;
  readonly length: number;
}

/**
 * One column of a cover's rivet field: at s across the face, its heads'
 * bases at o (the cover's outer face), facing out along n, or (`across`)
 * across the face along +-e with a second head at `s2` facing back, every
 * `pitch` from `end` off the joint (shifted by `phase` pitches) to `end`
 * short of the cover's end.
 */
interface FieldColumn {
  readonly s: number;
  readonly o: number;
  readonly pitch: number;
  readonly phase: 0 | 0.5;
  readonly cls: CoverClass;
  readonly length: number;
  readonly across?: 1 | -1;
  readonly s2?: number;
}

/** A face's covers and its field; `corner` is the cover over the corner angle's row, which that row stops short of. */
interface FaceCover {
  readonly pieces: CoverSpec[];
  readonly cols: FieldColumn[];
  readonly corner: { readonly cls: CoverClass; readonly length: number };
}

/** Field columns inward of a seam line at `from`, every `across` toward `to` while at least `stop` short of it, the first a half pitch out of phase. */
function fieldInward(from: number, toward: 1 | -1, stop: number, o: number, length: number): FieldColumn[] {
  const out: FieldColumn[] = [];
  for (let j = 1; ; j++) {
    const s = from + toward * j * SPLICE.field.across;
    if (toward * (stop - s) < 0) break;
    out.push({ s, o, pitch: SPLICE.field.pitch, phase: j % 2 === 1 ? 0.5 : 0, cls: "web", length });
  }
  return out;
}

/**
 * The covers of face d of lower upright `name` on segment k and their
 * fields, as PL-IX draws a panel 1-5 face and PL-X a panel 6-11 one (the
 * `SPLICE` header). `seamPitch` and `inset` are the corner rows'.
 */
function lowerCover(name: UprightName, k: number, d: PlanDir, seamPitch: number, inset: number): FaceCover {
  const { cj, cjWidth } = faceMakeup(name, k, d);
  const { T } = segmentAxis(name, k);
  const face = faceFrame(T, d);
  const W = face.W;
  const corner = W / 2 - inset;
  const { t } = UPRIGHT_BOX.angle;
  // How far out toward the edge on side g a cover may run: SPLICE.edge
  // short of it, and at an ACUTE corner of the lozenge short of where the
  // neighbouring web's inner edge stands out of this face (its thickness
  // times cos 78.36 deg out, 18 mm in from the edge in panels 1-4: the
  // header's sliver), with 2 mm to spare, where it stands out more than
  // `SLIVER` [derived].
  const room = (g: 1 | -1): number => {
    const nd: PlanDir = [g * Math.abs(d[1]), g * Math.abs(d[0])];
    const fn = faceFrame(T, nd);
    const tn = faceMakeup(name, k, nd).web;
    const standsOut = -tn * dot(fn.n, face.n);
    return standsOut > SLIVER ? W / 2 - tn * Math.abs(dot(fn.n, face.e)) - 0.002 : W / 2 - SPLICE.edge;
  };
  const pieces: CoverSpec[] = [];
  const cols: FieldColumn[] = [];
  const both = (f: (g: 1 | -1) => void) => {
    f(1);
    f(-1);
  };
  const span = (g: number, a: number, b: number) => ({ s0: Math.min(g * a, g * b), s1: Math.max(g * a, g * b) });
  if (k > 5) {
    // Panels 6-11: a web cover either side of the C.J., one over it.
    const web = SPLICE.plain.web;
    const strip = SPLICE.plain.strip;
    pieces.push({ what: "cover", s0: -strip.width / 2, s1: strip.width / 2, o0: cj, o1: cj + strip.t, cls: "angle", length: strip.length });
    both((g) => {
      pieces.push({ what: "cover", ...span(g, cjWidth / 2, room(g)), o0: 0, o1: web.t, cls: "web", length: web.length });
      cols.push({ s: g * corner, o: web.t, pitch: seamPitch, phase: 0, cls: "web", length: web.length });
      cols.push(...fieldInward(g * corner, g === 1 ? -1 : 1, g * (cjWidth / 2 + SPLICE.field.end), web.t, web.length));
      // Two rows through the strip's cover [estimated: the C.J.'s own rows].
      cols.push({ s: (g * strip.width) / 4, o: cj + strip.t, pitch: SPLICE.field.pitch, phase: 0, cls: "angle", length: strip.length });
    });
    return { pieces, cols, corner: { cls: "web", length: web.length } };
  }
  if (!isInterior(name, d)) {
    // PL-IX figs. 23-24: web covers beside the fin, angles in its angles.
    const web = SPLICE.exterior.web;
    const ang = SPLICE.exterior.angle;
    const top = cj + t;
    both((g) => {
      pieces.push(
        { what: "cover", ...span(g, cjWidth / 2, Math.min(cjWidth / 2 + web.width, room(g))), o0: 0, o1: web.t, cls: "web", length: web.length },
        { what: "coverAngle", ...span(g, t, t + ang.leg), o0: top, o1: top + ang.t, cls: "angle", length: ang.length },
        { what: "coverAngle", ...span(g, t, t + ang.t), o0: top + ang.t, o1: top + ang.leg, cls: "angle", length: ang.length },
      );
      cols.push({ s: g * corner, o: web.t, pitch: seamPitch, phase: 0, cls: "web", length: web.length });
      cols.push(...fieldInward(g * corner, g === 1 ? -1 : 1, g * (cjWidth / 2 + SPLICE.field.end), web.t, web.length));
      // Through the angle cover's flat leg and the fin's flat, and through
      // its outstanding leg and the fin: a head either side of the fin.
      cols.push(
        { s: g * (t + ang.t + (ang.leg - ang.t) / 2), o: top + ang.t, pitch: seamPitch, phase: 0, cls: "angle", length: ang.length },
        {
          s: g * (t + ang.t),
          o: top + ang.t + (ang.leg - ang.t) / 2,
          pitch: seamPitch,
          phase: 0.5,
          cls: "angle",
          length: ang.length,
          across: g,
        },
      );
    });
    return { pieces, cols, corner: { cls: "web", length: web.length } };
  }
  // PL-IX figs. 21-22: the centre cover on fillers, the channel's angles
  // covered, a flat over each corner angle's row.
  const c = SPLICE.interior.centre;
  const ang = SPLICE.interior.angle;
  const cor = SPLICE.interior.corner;
  const heel = UPRIGHT_BOX.channelHeels / 2;
  const f = SPLICE.interiorField;
  pieces.push({ what: "cover", s0: -c.width / 2, s1: c.width / 2, o0: cj, o1: cj + c.t, cls: "web", length: c.length });
  both((g) => {
    pieces.push(
      { what: "filler", ...span(g, cjWidth / 2, c.width / 2), o0: 0, o1: SPLICE.interior.filler, cls: "web", length: c.length },
      { what: "cover", ...span(g, corner - cor.width / 2, Math.min(corner + cor.width / 2, room(g))), o0: 0, o1: cor.t, cls: "web", length: cor.length },
      { what: "coverAngle", ...span(g, heel + t, heel + t + ang.leg), o0: t, o1: t + ang.t, cls: "angle", length: ang.length },
      { what: "coverAngle", ...span(g, heel + t, heel + t + ang.t), o0: t + ang.t, o1: t + ang.leg, cls: "angle", length: ang.length },
    );
    cols.push(
      { s: g * f.inner, o: cj + c.t, pitch: f.pitch, phase: 0, cls: "web", length: c.length },
      { s: g * f.outer, o: cj + c.t, pitch: f.pitch, phase: 0, cls: "web", length: c.length },
      { s: g * corner, o: cor.t, pitch: seamPitch, phase: 0, cls: "web", length: cor.length },
      { s: g * (heel + t + ang.t + (ang.leg - ang.t) / 2), o: t + ang.t, pitch: seamPitch, phase: 0, cls: "angle", length: ang.length },
      // Through the angle cover's outstanding leg and the channel's: a
      // head on the cover and one on the channel leg's inner face.
      {
        s: g * (heel + t + ang.t),
        o: t + ang.t + (ang.leg - ang.t) / 2,
        pitch: seamPitch,
        phase: 0.5,
        cls: "angle",
        length: ang.length,
        across: g,
        s2: g * heel,
      },
    );
  });
  return { pieces, cols, corner: { cls: "web", length: cor.length } };
}

/**
 * The run of a cover of class `cls` either side of a bent joint at node j,
 * [below, above]: the long side into the long panel, the short into panel
 * 5 (the segment both of whose ends bend) [PL-X fig. 19; `SPLICE.bent`].
 */
function bentRun(j: number, cls: CoverClass): readonly [number, number] {
  const [long, short] = SPLICE.bent[cls];
  const panel5 = (k: number) => k >= 0 && isBent(NODES[k]!.name) && isBent(NODES[k + 1]!.name);
  return [panel5(j - 1) ? short : long, panel5(j) ? short : long];
}

/** A splice's heads grouped by pitch: each group's rows for `lineRivets` at that pitch. */
export interface SpliceHeads {
  readonly pitch: number;
  readonly rows: Array<{ a: Vec3; b: Vec3; n: Vec3 }>;
}

/** Collects rows by pitch. */
class HeadSets {
  private readonly by = new Map<number, Array<{ a: Vec3; b: Vec3; n: Vec3 }>>();
  add(pitch: number, a: Vec3, b: Vec3, n: Vec3): void {
    const l = this.by.get(pitch);
    if (l === undefined) this.by.set(pitch, [{ a, b, n }]);
    else l.push({ a, b, n });
  }
  out(): SpliceHeads[] {
    return [...this.by.entries()].sort((p, q) => p[0] - q[0]).map(([pitch, rows]) => ({ pitch, rows }));
  }
}

/**
 * The heads of one column on one side of its joint: from `u0` (the joint,
 * or the fold) along `dir` (+-1 along T), `end` in and every pitch to `end`
 * short of `run`, as a row of n heads (a line (n - 1) pitches less 0.1 mm,
 * for `lineRivets`' spacing mode, as the seam rows).
 */
function halfRow(
  heads: HeadSets,
  A: Vec3,
  T: Vec3,
  off: Vec3,
  u0: number,
  dir: 1 | -1,
  run: number,
  c: FieldColumn,
  n: Vec3,
): void {
  const first = SPLICE.field.end + c.phase * c.pitch;
  const last = run - SPLICE.field.end;
  if (last < first - 1e-9) return;
  const count = Math.floor((last - first) / c.pitch + 1e-9) + 1;
  const a = u0 + dir * first;
  const b = a + dir * Math.max(0, (count - 1) * c.pitch - 1e-4);
  heads.add(c.pitch, add(A, off, scale(T, a)), add(A, off, scale(T, b)), n);
}

/** One flat box of a cover, from `lo` to `hi` along T from A, off the axis by its piece's centre in face frame f. */
function coverPlate(A: Vec3, T: Vec3, f: FaceFrame, p: CoverSpec, lo: number, hi: number): UprightPlate {
  const s = (p.s0 + p.s1) / 2;
  const o = (p.o0 + p.o1) / 2;
  const lying = p.s1 - p.s0 >= p.o1 - p.o0;
  const off = add(f.mid, scale(f.e, s), scale(f.n, o));
  return {
    a: add(A, off, scale(T, lo)),
    b: add(A, off, scale(T, hi)),
    n: lying ? f.n : f.e,
    width: lying ? p.s1 - p.s0 : p.o1 - p.o0,
    thickness: lying ? p.o1 - p.o0 : p.s1 - p.s0,
    what: p.what,
  };
}

/** A face's side of a joint, as its covers and heads need it. */
interface SpliceSide {
  /** The segment this side lies on, its axis and the face's frame. */
  readonly k: number;
  readonly A: Vec3;
  readonly T: Vec3;
  readonly f: FaceFrame;
  readonly cover: FaceCover;
  /** Where a piece starts on this side, along T from A: the joint, or at a bend the first station clear of the fold and of the other panel's steel. */
  readonly from: (p: CoverSpec) => number;
  /** +1: the cover runs up T from there; -1: down. */
  readonly dir: 1 | -1;
  /** A straight joint's one box (drawn by its +1 side), or a bend's half. */
  readonly draw: "whole" | "half" | "none";
  /** The run of a class on this side. */
  readonly run: (cls: CoverClass, length: number) => number;
}

/** The cover piece a field column lies on: its top under the heads, or (across) the leg face they stand on. */
function pieceOf(cover: FaceCover, c: FieldColumn): CoverSpec {
  const e = 1e-9;
  const p = cover.pieces.find((q) =>
    c.across === undefined
      ? q.what !== "filler" && Math.abs(q.o1 - c.o) < e && q.s0 - e <= c.s && c.s <= q.s1 + e
      : (Math.abs(q.s0 - c.s) < e || Math.abs(q.s1 - c.s) < e) && q.o0 - e <= c.o && c.o <= q.o1 + e,
  );
  if (p === undefined) throw new Error(`eiffel builtup: a splice field column at s ${c.s}, o ${c.o} lies on no cover`);
  return p;
}

/** Lays one side of a joint: its cover pieces and its heads. */
function laySide(side: SpliceSide, plates: UprightPlate[] | undefined, heads: HeadSets | undefined): void {
  const { A, T, f, cover, dir } = side;
  if (plates !== undefined && side.draw !== "none") {
    for (const p of cover.pieces) {
      const u0 = side.from(p);
      const run = side.run(p.cls, p.length);
      const [lo, hi] = side.draw === "whole" ? [u0 - run, u0 + run] : [Math.min(u0, u0 + dir * run), Math.max(u0, u0 + dir * run)];
      plates.push(coverPlate(A, T, f, p, lo, hi));
    }
  }
  if (heads !== undefined) {
    for (const c of cover.cols) {
      const p = pieceOf(cover, c);
      const u0 = side.from(p);
      const run = side.run(p.cls, p.length);
      const n1 = c.across === undefined ? f.n : scale(f.e, c.across);
      halfRow(heads, A, T, add(f.mid, scale(f.e, c.s), scale(f.n, c.o)), u0, dir, run, c, n1);
      if (c.s2 !== undefined && c.across !== undefined) {
        halfRow(heads, A, T, add(f.mid, scale(f.e, c.s2), scale(f.n, c.o)), u0, dir, run, c, scale(f.e, -c.across));
      }
    }
  }
}

/** A box: centre, axes (along, out, across) and half-extents. */
interface Box {
  readonly c: Vec3;
  readonly axes: readonly [Vec3, Vec3, Vec3];
  readonly half: readonly [number, number, number];
}

/** A face piece laid from `lo` to `hi` along T from A, in face frame f, as a box. */
function boxOf(A: Vec3, T: Vec3, f: FaceFrame, p: { s0: number; s1: number; o0: number; o1: number }, lo: number, hi: number): Box {
  const off = add(f.mid, scale(f.e, (p.s0 + p.s1) / 2), scale(f.n, (p.o0 + p.o1) / 2));
  return {
    c: add(A, off, scale(T, (lo + hi) / 2)),
    axes: [T, f.n, f.e],
    half: [(hi - lo) / 2, (p.o1 - p.o0) / 2, (p.s1 - p.s0) / 2],
  };
}

/** How deep two boxes interpenetrate along their least-separating axis; <= 0 when apart [separating axes]. */
function boxOverlap(a: Box, b: Box): number {
  const axes: Vec3[] = [...a.axes, ...b.axes];
  for (const u of a.axes)
    for (const v of b.axes) {
      const c = cross(u, v);
      const l = Math.hypot(c[0], c[1], c[2]);
      if (l > 1e-6) axes.push(scale(c, 1 / l));
    }
  const d = sub(b.c, a.c);
  let least = Infinity;
  for (const L of axes) {
    const ra = a.half[0] * Math.abs(dot(a.axes[0], L)) + a.half[1] * Math.abs(dot(a.axes[1], L)) + a.half[2] * Math.abs(dot(a.axes[2], L));
    const rb = b.half[0] * Math.abs(dot(b.axes[0], L)) + b.half[1] * Math.abs(dot(b.axes[1], L)) + b.half[2] * Math.abs(dot(b.axes[2], L));
    least = Math.min(least, ra + rb - Math.abs(dot(d, L)));
    if (least <= 0) return least;
  }
  return least;
}

/** `lowerSides` is asked again for every seam row it cuts: its answers, kept. */
const SIDES = new Map<string, SpliceSide[]>();

/**
 * Both sides of a lower upright's joint, face d. At a straight joint the
 * cover is one box centred on it. At a bend each half lies on its own
 * panel's face and starts where the whole of it is clear of the fold (the
 * fold crosses a face obliquely, up to 24 degrees in panels 1-4, so a
 * square end cannot follow it) and of the other panel's plates, which run
 * on past the fold (`KINK_CLOSE`): a V of web shows between the halves,
 * where the real covers were bent to the angle [derived].
 */
function lowerSides(name: UprightName, j: TronconJoint, d: PlanDir, seamPitch: number, inset: number): SpliceSide[] {
  const key = `${name}|${j.k}|${j.t}|${d[0]},${d[1]}|${seamPitch}|${inset}`;
  const known = SIDES.get(key);
  if (known !== undefined) return known;
  const sides = lowerSidesOf(name, j, d, seamPitch, inset);
  SIDES.set(key, sides);
  return sides;
}

function lowerSidesOf(name: UprightName, j: TronconJoint, d: PlanDir, seamPitch: number, inset: number): SpliceSide[] {
  const frameOf = (k: number) => {
    const { A, Q, T } = segmentAxis(name, k);
    return { k, A, T, L: Math.hypot(...sub(Q, A)), f: faceFrame(T, d), cover: lowerCover(name, k, d, seamPitch, inset) };
  };
  if (!j.bent) {
    const s = frameOf(j.k);
    const run = (_: CoverClass, length: number) => length / 2;
    return ([1, -1] as const).map(
      (dir): SpliceSide => ({ k: s.k, A: s.A, T: s.T, f: s.f, cover: s.cover, from: () => j.t, dir, draw: dir === 1 ? "whole" : "none", run }),
    );
  }
  const up = frameOf(j.k);
  const down = frameOf(j.k - 1);
  const tLo = turns(name, j.k).lo;
  const side = (own: ReturnType<typeof frameOf>, other: ReturnType<typeof frameOf>, dir: 1 | -1): SpliceSide => {
    // The other panel's steel on this face as built, and its webs on the
    // two faces beside it (whose edges stand out of this face at an acute
    // corner), each as the box `lowerPlates` lays.
    const oTurn = turns(name, other.k);
    const beside: PlanDir[] = [1, -1].map((g) => [g * Math.abs(d[1]), g * Math.abs(d[0])] as const);
    const theirs = [
      ...facePieces(name, other.k, d, AS_BUILT).map((q) => ({ q, fd: d })),
      ...beside.map((fd) => ({ q: facePieces(name, other.k, fd, WEBS_ONLY)[0]!, fd })),
    ].map(({ q, fd }) => {
      const f = faceFrame(other.T, fd);
      const off = add(f.mid, scale(f.e, (q.s0 + q.s1) / 2), scale(f.n, (q.o0 + q.o1) / 2));
      const [lo, hi] = pieceEnds(off, other.T, other.L, oTurn.lo, oTurn.hi);
      return boxOf(other.A, other.T, f, q, lo, hi);
    });
    // A piece starts at the last of its four long edges' folds (so the
    // whole of it is on its own side of the node's plane), moved on until
    // it is clear of every one of those boxes: the least move, found by
    // bisection over 0.6 m, to 0.5 mm [derived].
    const memo = new Map<CoverSpec, number>();
    const from = (p: CoverSpec) => {
      const hit = memo.get(p);
      if (hit !== undefined) return hit;
      let u0 = dir === 1 ? -Infinity : Infinity;
      for (const s of [p.s0, p.s1])
        for (const o of [p.o0, p.o1]) {
          const off = add(own.f.mid, scale(own.f.e, s), scale(own.f.n, o));
          const base = dir === 1 ? 0 : own.L;
          const fold = tLo ? base - off[1] / own.T[1] : base;
          u0 = dir === 1 ? Math.max(u0, fold) : Math.min(u0, fold);
        }
      const run = bentRun(j.k, p.cls)[dir === 1 ? 1 : 0];
      const clear = (u: number) => {
        const mine = boxOf(own.A, own.T, own.f, p, Math.min(u, u + dir * run), Math.max(u, u + dir * run));
        return theirs.every((q) => boxOverlap(mine, q) <= 2e-4);
      };
      let u = u0;
      if (!clear(u0)) {
        if (!clear(u0 + dir * 0.6)) {
          throw new Error(
            `eiffel builtup: a ${p.what} over the joint at ${NODES[j.k]!.name} on ${name}'s face ${d} is still in the other panel's steel 0.6 m off the fold`,
          );
        }
        let [ok, bad] = [0.6, 0];
        for (let i = 0; i < 12; i++) {
          const mid = (ok + bad) / 2;
          if (clear(u0 + dir * mid)) ok = mid;
          else bad = mid;
        }
        u = u0 + dir * ok;
      }
      memo.set(p, u);
      return u;
    };
    const run = (cls: CoverClass) => bentRun(j.k, cls)[dir === 1 ? 1 : 0];
    return { k: own.k, A: own.A, T: own.T, f: own.f, cover: own.cover, from, dir, draw: "half", run };
  };
  return [side(up, down, 1), side(down, up, -1)];
}

/** The lower uprights' covers, one leg (the caller copies them onto the quadrants), from the laced depth up. */
export function lowerCoverPlates(): UprightPlate[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const out: UprightPlate[] = [];
  for (const [name] of LEG_UPRIGHTS)
    for (const j of lowerJoints(name))
      for (const d of BOX_FACES) for (const s of lowerSides(name, j, d, seamPitch, inset)) laySide(s, out, undefined);
  return out;
}

/**
 * Whether a lower joint's covers can lie under a joint plate: at a bend
 * (the 1st floor's plates), and mid-panel in panels 1-4, where the
 * intermediate entretoise lands ("celui du milieu correspond à
 * l'entretoise intermédiaire" [sourced text p. 75]). The others lie at
 * least 1.9 m from a node, the middle of a tronçon whose node carries its
 * attachments: every head of theirs was measured at least 12 cm clear of
 * every joint plate [measured on the cooked tower, all heads asked, and
 * re-measured independently]. Only
 * the heads of these are asked about the plates (`offJointPlates` in
 * strut.ts), which costs about 9 microseconds a head [measured: 2.7 s for
 * all 290,000].
 */
export function nearJointPlates(name: UprightName, j: TronconJoint): boolean {
  if (j.bent) return true;
  const { A, Q } = segmentAxis(name, j.k);
  const panels14 = j.k >= nodeIndex("XXVIII") && j.k < nodeIndex("XXIV");
  return panels14 && Math.abs(j.t - Math.hypot(...sub(Q, A)) / 2) < 1e-6;
}

/**
 * The lower covers' rivet fields, one leg, grouped by pitch: those of the
 * joints that can lie under a joint plate (`nearJointPlates`), the rest, or
 * all.
 */
export function lowerSpliceHeads(which: "near" | "clear" | "all" = "all"): SpliceHeads[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const heads = new HeadSets();
  for (const [name] of LEG_UPRIGHTS)
    for (const j of lowerJoints(name)) {
      if (which !== "all" && nearJointPlates(name, j) !== (which === "near")) continue;
      for (const d of BOX_FACES) for (const s of lowerSides(name, j, d, seamPitch, inset)) laySide(s, undefined, heads);
    }
  return heads.out();
}

/**
 * Where a lower face's corner row must not run on segment k: under the
 * cover over it, and half a pitch clear of its ends, as [t0, t1] along
 * that row (`off` its offset off the axis).
 */
function lowerCornerCuts(name: UprightName, k: number, d: PlanDir, off: Vec3, pitch: number, inset: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  const f = faceFrame(segmentAxis(name, k).T, d);
  const s = dot(sub(off, f.mid), f.e);
  for (const j of lowerJoints(name)) {
    if (j.k !== k && j.k !== k + 1) continue;
    for (const side of lowerSides(name, j, d, pitch, inset)) {
      if (side.k !== k || side.draw === "none") continue;
      const p = side.cover.pieces.find((q) => q.what === "cover" && q.o0 === 0 && q.s0 <= s && s <= q.s1);
      if (p === undefined) continue;
      const u0 = side.from(p);
      const run = side.run(p.cls, p.length);
      if (side.draw === "whole") out.push([u0 - run - pitch / 2, u0 + run + pitch / 2]);
      else if (side.dir === 1) out.push([-Infinity, u0 + run + pitch / 2]);
      else out.push([u0 - run - pitch / 2, Infinity]);
    }
  }
  return out;
}

/** [lo, hi] less the cut intervals: what is left, in order. */
function subtract(lo: number, hi: number, cuts: ReadonlyArray<readonly [number, number]>): Array<readonly [number, number]> {
  let left: Array<readonly [number, number]> = [[lo, hi]];
  for (const [c0, c1] of cuts) {
    left = left.flatMap(([a, b]): Array<readonly [number, number]> => {
      if (c1 <= a || c0 >= b) return [[a, b]];
      const parts: Array<readonly [number, number]> = [];
      if (c0 > a) parts.push([a, c0]);
      if (c1 < b) parts.push([c1, b]);
      return parts;
    });
  }
  return left;
}

/** The upper covers of `name` on segment k, face by face: a 12 mm cover over each outer plate, and its field (`SPLICE.upper`). */
function upperCover(name: UpperName, k: number, inset: number, seamPitch: number): Array<{ d: PlanDir; cover: FaceCover }> {
  const up = SPLICE.upper;
  const rowsBy = upperRows(name, k, inset);
  const { T } = upperAxis(name, k);
  const faces = upperFaces(name, k, WEBS_ONLY);
  return faces
    .filter((face) => face.near === undefined)
    .map((face) => {
      const w = face.pieces[0]!.s1;
      // Short of each edge as below (`lowerCover`'s room): at an acute
      // corner, of the neighbouring plate's inner edge.
      const f = faceFrame(T, face.d, UPPER_BOX.planHalf);
      const room = (g: 1 | -1): number => {
        const nd: PlanDir = [g * Math.abs(face.d[1]), g * Math.abs(face.d[0])];
        const nb = faces.find((x) => same(x.d, nd));
        if (nb === undefined) return w - SPLICE.edge;
        const fn = faceFrame(T, nd, UPPER_BOX.planHalf);
        const tn = -nb.pieces[0]!.o0;
        return -tn * dot(fn.n, f.n) > SLIVER ? f.W / 2 - tn * Math.abs(dot(fn.n, f.e)) - 0.002 : w - SPLICE.edge;
      };
      const lines = (rowsBy.find((r) => same(r.d, face.d))?.rows ?? [])
        .filter((r) => r.across === undefined && r.o === 0)
        .map((r) => r.s)
        .sort((p, q) => p - q);
      const cols: FieldColumn[] = lines.map((s) => ({ s, o: up.t, pitch: seamPitch, phase: 0 as const, cls: "web" as const, length: up.length }));
      // Between each pair of seam lines, columns about `across` apart,
      // staggered; not across a T's stem (its root's two lines).
      const stem = upperMakeupOf(name, k).shape === "T";
      for (let i = 0; i + 1 < lines.length; i++) {
        const [a, b] = [lines[i]!, lines[i + 1]!];
        if (stem && a < 0 && b > 0) continue;
        const m = Math.max(0, Math.round((b - a) / SPLICE.field.across) - 1);
        for (let j = 1; j <= m; j++) {
          cols.push({ s: a + ((b - a) * j) / (m + 1), o: up.t, pitch: SPLICE.field.pitch, phase: j % 2 === 1 ? 0.5 : 0, cls: "web", length: up.length });
        }
      }
      return {
        d: face.d,
        cover: {
          pieces: [{ what: "cover" as const, s0: -Math.min(w - SPLICE.edge, room(-1)), s1: Math.min(w - SPLICE.edge, room(1)), o0: 0, o1: up.t, cls: "web" as const, length: up.length }],
          cols,
          corner: { cls: "web" as const, length: up.length },
        },
      };
    });
}

/** Both sides of every face of an upper upright's joint (all straight): one box, centred on it. */
function upperSides(name: UpperName, j: TronconJoint, inset: number, seamPitch: number): SpliceSide[] {
  const { A, T } = upperAxis(name, j.k);
  return upperCover(name, j.k, inset, seamPitch).flatMap(({ d, cover }) =>
    ([1, -1] as const).map(
      (dir): SpliceSide => ({
        k: j.k,
        A,
        T,
        f: faceFrame(T, d, UPPER_BOX.planHalf),
        cover,
        from: () => j.t,
        dir,
        draw: dir === 1 ? "whole" : "none",
        run: (_: CoverClass, length: number) => length / 2,
      }),
    ),
  );
}

function upperSplices(names: readonly UpperName[], k0: number, k1: number, inset: number, seamPitch: number, plates?: UprightPlate[], heads?: HeadSets): void {
  for (const name of names)
    for (const j of upperJoints(name)) if (j.k >= k0 && j.k < k1) for (const s of upperSides(name, j, inset, seamPitch)) laySide(s, plates, heads);
}

/** The legs' upper covers, XVII to XI, one leg; the caller copies them onto the quadrants. */
export function upperLegCoverPlates(): UprightPlate[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const out: UprightPlate[] = [];
  upperSplices(["c", "b", "d"], UPPER_FROM, SHAFT_FROM, inset, seamPitch, out);
  return out;
}

/** The legs' upper covers' fields, one leg, by pitch. */
export function upperLegSpliceHeads(): SpliceHeads[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const heads = new HeadSets();
  upperSplices(["c", "b", "d"], UPPER_FROM, SHAFT_FROM, inset, seamPitch, undefined, heads);
  return heads.out();
}

/** The shaft's covers, all four quarters. */
export function shaftCoverPlates(): UprightPlate[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const one: UprightPlate[] = [];
  upperSplices(["c", "bd"], SHAFT_FROM, UPPER_TO, inset, seamPitch, one);
  return [0, 1, 2, 3].flatMap((q) => one.map((p) => ({ ...p, a: turnQ(p.a, q), b: turnQ(p.b, q), n: turnQ(p.n, q) })));
}

/** The shaft's covers' fields, all four quarters, by pitch. */
export function shaftSpliceHeads(): SpliceHeads[] {
  const { pitch: seamPitch, inset } = UPRIGHT_SEAMS;
  const heads = new HeadSets();
  upperSplices(["c", "bd"], SHAFT_FROM, UPPER_TO, inset, seamPitch, undefined, heads);
  return heads.out().map(({ pitch, rows }) => ({
    pitch,
    rows: [0, 1, 2, 3].flatMap((q) => rows.map((r) => ({ a: turnQ(r.a, q), b: turnQ(r.b, q), n: turnQ(r.n, q) }))),
  }));
}
