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
 * XXIV [sourced text]), which the splice item will draw over these ends.
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
  UPPER_BOX,
  UPPER_SECTIONS,
  UPRIGHT_BOX,
  UPRIGHT_SECTIONS,
  type UpperMakeup,
  type UpperSection,
  type UprightMakeup,
  type UprightSection,
} from "./spec.js";

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
  readonly what: FacePiece["what"];
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
          const n = Math.floor((hi - lo) / pitch + 1e-9) + 1;
          const from = (lo + hi - (n - 1) * pitch) / 2;
          // 0.1 mm short of (n - 1) pitches: spacing mode then lands exactly
          // n heads (legs.ts `rowMembers`); a row of one is a point.
          const to = from + Math.max(0, (n - 1) * pitch - 1e-4);
          out.push({ a: add(A, off, scale(T, from)), b: add(A, off, scale(T, to)), n: f.n });
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
  return upperPlatesOf(["c", "b", "d"], UPPER_FROM, SHAFT_FROM, show);
}

/** The shaft's eight uprights' plates, XI to the top of panel 28, all four quarters. */
export function shaftPlates(show: Protrusions): UprightPlate[] {
  const one = upperPlatesOf(["c", "bd"], SHAFT_FROM, UPPER_TO, show);
  return [0, 1, 2, 3].flatMap((q) => one.map((p) => ({ ...p, a: turnQ(p.a, q), b: turnQ(p.b, q), n: turnQ(p.n, q) })));
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
 * close to two `head` rises apart.
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
          const n = Math.floor((hi - lo) / pitch + 1e-9) + 1;
          const from = (lo + hi - (n - 1) * pitch) / 2;
          // 0.1 mm short of (n - 1) pitches: spacing mode lands exactly n heads.
          const to = from + Math.max(0, (n - 1) * pitch - 1e-4);
          out.push({ a: add(A, off, scale(T, from)), b: add(A, off, scale(T, to)), n: r.across === undefined ? f.n : scale(f.e, r.across) });
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
