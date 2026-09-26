/**
 * The creeper cranes of the erection (« grues de montage », PL-XXIV Figs
 * 2–7; text pp. 103–107, 110–111, 115–118; SOURCES.md §32.8): the four
 * that rode the lift girders up the legs to the 2nd floor, the two that
 * then climbed the central guide post to the 3rd, and the one left over
 * the 3rd floor.
 *
 * THE GRAPH BUILDS EACH CRANE ONCE, where it first stands; THE PAGE MOVES
 * IT, day by day, as it climbed (scrub.ts), from {@link cranePose}: a pure
 * function of the crane and the day, off the erection front
 * (chronology.ts). The same division as the lifts' cars.
 */
import type { Graph } from "pcg-ts";
import { FRONT, MILESTONES, dayOf } from "./chronology.js";
import { SAG } from "./chord.js";
import { type Block, type Prism, blockPrism, cylinder, flatsSides, prisms } from "./ground.js";
import type { Vec3 } from "./lattice.js";
import { RAIL_OFFSET } from "./lifts.js";
import type { Parts } from "./parts.js";
import { NODES, PILES, profileAt, tableAt } from "./spec.js";

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / len3(p));
const cross3 = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const UP: Vec3 = [0, 1, 0];

/**
 * THE CRANE, PL-XXIV Figs 2–4 (« Grue de 3.000 kilogr. de force pour le
 * montage de la partie inférieure », 1:100) and the text: « une grue ...
 * d'une force de 3.000 kg » (p. 105), « 13.000 kg » empty (p. 115)
 * [sourced]. Read on the plate [sourced where printed, else measured at
 * 1:100, ±0.1]: the platform (U) 4.60 across; the pivot (J) a mast from
 * 3.85 under the platform to « 4.535 » over it; the jib (L), « Flèche en
 * tôle et cornière articulée sur le pivot, pouvant ainsi s'abaisser ou se
 * relever », at « Portée maximum 12m00 » and « Hauteur sous flèche
 * 10m40 »; its ties (M) from the mast's head; the winch (S) on the jib's
 * heel, about 1.2 from the pivot [measured]; the « hotte » (D), an inverted
 * truncated pyramid hanging under the platform to the chassis (C) that
 * clasps the lift girders (B), « 3.80 » apart, over « 6.535 » of their
 * length, its hinge « 2.00 » up the track from the pivot.
 */
export const CRANE = {
  platform: 4.6,
  mastBelow: 3.85,
  mastAbove: 4.535,
  reach: 12.0,
  underJib: 10.4,
  /** The winch's drum from the pivot, on the jib's heel [measured]. */
  winch: 1.2,
  /** The chassis' hinge up the track from the pivot [sourced « 2.00 »]. */
  hinge: 2.0,
  /**
   * The jib's working reach in a leg: raised from its 12.00 so that it
   * stays inside the leg's square as the leg leans in over it
   * [estimated: « pouvant ainsi s'abaisser ou se relever »].
   */
  legReach: 9.0,
  gauge: 3.8,
  chassis: 6.535,
  /** Member sizes [estimated: the plate draws plate-and-angle boxes about these]. */
  mast: 0.4,
  jib: 0.35,
  frame: 0.16,
  /** The two upper cranes stood « D'axe en axe des grues 6.30 » either side of the guide post (Fig. 7) [sourced]. */
  upperApart: 6.3,
} as const;

/** A member from p to q, `w` square, its width across `side`. */
function member(p: Vec3, q: Vec3, w: number, side: Vec3 = UP): Block {
  const x = unit3(sub3(q, p));
  let y = sub3(side, mul3(x, side[0] * x[0] + side[1] * x[1] + side[2] * x[2]));
  if (len3(y) < 1e-6) y = cross3(x, [1, 0, 0]);
  return { at: mul3(add3(p, q), 0.5), x, y: unit3(y), size: [len3(sub3(q, p)), w, w] };
}

/**
 * One crane in its own frame: the pivot on the platform at the origin, the
 * jib out along +u (horizontal), v across, y up, and the track it rides
 * along `track` (a unit vector in the u-y plane, up the track). Blocks and
 * the winch's drum.
 */
export function craneParts(track: Vec3, reach: number = CRANE.reach): { blocks: Block[]; drum: Prism } {
  const C = CRANE;
  const out: Block[] = [];
  const u: Vec3 = [1, 0, 0];
  const v: Vec3 = [0, 0, 1];
  const h = C.platform / 2;
  // The platform: a plank floor on four edge beams, and a hand rail.
  out.push({ at: [0, -0.04, 0], x: u, y: UP, size: [C.platform, 0.08, C.platform] });
  for (const s of [-1, 1]) {
    out.push(member([-h, -0.2, s * h], [h, -0.2, s * h], C.frame, UP));
    out.push(member([s * h, -0.2, -h], [s * h, -0.2, h], C.frame, UP));
    // The rail on three sides, open where the jib swings out.
    out.push(member([-h, 1.0, s * h], [h * 0.4, 1.0, s * h], 0.05, UP));
  }
  out.push(member([-h, 1.0, -h], [-h, 1.0, h], 0.05, UP));
  for (const [a, b] of [
    [-h, -h],
    [-h, h],
    [h * 0.4, -h],
    [h * 0.4, h],
  ] as const) {
    out.push(member([a, 0, b], [a, 1.0, b], 0.05, u));
  }
  // The mast (J), through the platform.
  out.push(member([0, -C.mastBelow, 0], [0, C.mastAbove, 0], C.mast, u));
  // The hotte (D): four corners from the platform's inner square to a small
  // one under it, and two rings.
  const top = 1.4;
  const foot = 0.5;
  const ring = (y: number, r: number) => [
    [r, y, r],
    [r, y, -r],
    [-r, y, -r],
    [-r, y, r],
  ] as Vec3[];
  const t0 = ring(-0.25, top);
  const t1 = ring(-C.mastBelow + 0.3, foot);
  for (let k = 0; k < 4; k++) out.push(member(t0[k]!, t1[k]!, C.frame, UP));
  for (const r of [ring(-1.4, top - ((top - foot) * 1.15) / (C.mastBelow - 0.55)), t1]) {
    for (let k = 0; k < 4; k++) out.push(member(r[k]!, r[(k + 1) % 4]!, C.frame * 0.8, UP));
  }
  // The chassis (C): two frames along the track, either side, the girders'
  // gauge apart, 6.535 long, hung from the platform's edge beams.
  // Drawn from the hotte's foot up the track to under the platform: the
  // plate's 6.535 runs on down the track past the foot, where the model's
  // struts inside the leg leave it no room (SOURCES.md §32.8).
  const low = -C.mastBelow + 0.3;
  for (const s of [-1, 1]) {
    const z = s * (C.gauge / 2 - 0.35);
    const a: Vec3 = [0, low + 0.1, z];
    const reachUp = Math.min(C.chassis / 2, (-0.3 - a[1]) / Math.max(track[1], 0.3));
    const b = add3(a, mul3(track, reachUp));
    out.push(member(a, b, C.frame * 1.3, v));
    out.push(member(b, [b[0], -0.2, z], C.frame, u));
    out.push(member(a, [a[0], -0.2, z], C.frame, u));
  }
  // The jib (L) at `reach`, its length the plate's at full reach, and its
  // ties (M) from the mast's head.
  const heel: Vec3 = [0.3, 0.6, 0];
  const length = Math.hypot(C.reach - heel[0], C.underJib + 0.4 - heel[1]);
  const tip: Vec3 = [reach, heel[1] + Math.sqrt(length * length - (reach - heel[0]) ** 2), 0];
  out.push(member(heel, tip, C.jib, v));
  for (const s of [-1, 1]) out.push(member([0, C.mastAbove, s * 0.12], [tip[0] - 0.2, tip[1] + 0.2, s * 0.12], 0.04, v));
  // The hook's fall and block.
  out.push(member([tip[0], tip[1] - 0.2, 0], [tip[0], tip[1] - 3.5, 0], 0.03, u));
  out.push({ at: [tip[0], tip[1] - 3.75, 0], x: u, y: UP, size: [0.3, 0.5, 0.2] });
  // The winch (S) on the jib's heel, under it.
  // The crane works up the tower, seen from well under it: `SAG.near`.
  const drum = cylinder([C.winch, 0.55, -0.45], [C.winch, 0.55, 0.45], 0.8, flatsSides(0.8, SAG.near));
  return { blocks: out, drum };
}

/** A block or prism carried from a crane's own frame to the world: u, v, y onto `u`, `v`, UP, then to `at`. */
function place(b: Block, u: Vec3, v: Vec3, at: Vec3): Block {
  const w = (p: Vec3): Vec3 => add3(at, add3(add3(mul3(u, p[0]), mul3(UP, p[1])), mul3(v, p[2])));
  const d = (p: Vec3): Vec3 => add3(add3(mul3(u, p[0]), mul3(UP, p[1])), mul3(v, p[2]));
  return { at: w(b.at), x: d(b.x), y: d(b.y), size: b.size };
}
function placePrism(p: Prism, u: Vec3, v: Vec3, at: Vec3): Prism {
  const w = (q: Vec3): Vec3 => add3(at, add3(add3(mul3(u, q[0]), mul3(UP, q[1])), mul3(v, q[2])));
  return { outline: p.outline.map(w), depth: p.depth };
}

/** Pile `n`'s leg: its quadrant's plan directions, out along the diagonal and across it. */
function legFrame(n: 1 | 2 | 3 | 4): { out: Vec3; across: Vec3 } {
  const p = PILES.find((x) => x.n === n)!;
  const out: Vec3 = [p.corner[0] / Math.SQRT2, 0, p.corner[1] / Math.SQRT2];
  return { out, across: cross3(UP, out) };
}

/** The lift girders' line in a leg (lifts.ts `RAIL_OFFSET`): its distance out along the diagonal at height y. */
function railOut(y: number): number {
  return Math.SQRT2 * profileAt(y).inner + tableAt(RAIL_OFFSET, y);
}

/** The erection front's height on `day`: FRONT read the other way (where two stops share a day, the higher). */
export function frontHeight(day: number): number {
  let h = FRONT[0]![0];
  for (let i = 1; i < FRONT.length; i++) {
    const [y0, d0] = FRONT[i - 1]!;
    const [y1, d1] = FRONT[i]!;
    if (day >= d1) h = y1;
    else if (day > d0) h = Math.max(h, y0 + ((day - d0) / (d1 - d0)) * (y1 - y0));
  }
  return h;
}

/** The highest node of PL-XXXI (or the 3rd floor, over the last) at or under y. */
function nodeUnder(y: number): number {
  let best = NODES[0]!.y;
  for (const n of [...NODES.map((n) => n.y), 276.13]) if (n <= y) best = Math.max(best, n);
  return best;
}

/**
 * THE CRANES AND THEIR DAYS [SOURCES.md §32.8; sourced as tagged]:
 * - « la première grue de montage qui nous fut livrée » at pile 3 on
 *   2 Sep 1887 (p. 103); « Pour le montage des pièces à partir de la base
 *   pour la pile 3 et à partir du deuxième panneau pour les autres, on se
 *   servit de grues spéciales » (p. 105), the shear legs having taken the
 *   others to the top of panel 2 (p. 103): theirs from 10 Oct [estimated].
 * - Each over the last finished node under the front, its platform
 *   {@link OVER_NODE} over the node so the hotte hangs clear of the node's
 *   struts; « L'opération du relevage de la grue durait environ 18
 *   heures » (p. 107), so a panel a day at most [the rule estimated].
 * - Over the 2nd floor, for panel 13 and part of 14, « en hissant
 *   celles-ci au sommet des poutres d'ascenseurs qui dépassaient le niveau
 *   de la plate-forme » (p. 117): on the Otis girders' tops, 9.9 over the
 *   floor (lifts.ts), about the 10 m PL-XXIV Fig. 1 draws [sourced; the
 *   height measured].
 * - Then « à l'aide des grues des piles 2 et 4, qui s'arrêtaient à cette
 *   hauteur, les deux grues qui devaient monter jusqu'au sommet » went onto
 *   the Édoux lift's central post (p. 117): so piles 1 and 3's, whose
 *   chassis fitted the 3.80 Otis girders (p. 110), climbed on, and PL-XXIV
 *   Fig. 7 sets them on the 1–3 diagonal [sourced; the plate's orientation
 *   read from its « Seine » arrow; the day, 15 Sep 1888, estimated]. Piles
 *   2 and 4's, « les deux grues inutiles », taken down after (p. 115), on
 *   1 Oct [estimated; p. 115 has that team go on to the arches, which
 *   p. 112 dates 7 May – 31 Aug: the book does not agree with itself].
 * - « Au-dessus du troisième étage, les grues ne pouvant plus orienter,
 *   l'une d'elles fut démolie et, avec celle qui restait, on monta les fers
 *   de la partie supérieure » (pp. 117–118): pile 3's side taken down on
 *   24 Feb 1889, pile 1's left at the 3rd floor to the end of the erection,
 *   15 Apr [estimated].
 */
export interface CraneRun {
  readonly name: string;
  /** Leg cranes ride their pile's lift girders; upper ones the guide post, on the side of their pile. */
  readonly pile: 1 | 2 | 3 | 4;
  readonly from: number;
  readonly until: number;
  /** On the guide post (the upper cranes). */
  readonly upper?: true;
}

export const CRANE_RUNS: readonly CraneRun[] = [
  { name: "pile3", pile: 3, from: MILESTONES.firstCrane, until: dayOf("1888-09-15") },
  { name: "pile1", pile: 1, from: MILESTONES.at28m, until: dayOf("1888-09-15") },
  { name: "pile2", pile: 2, from: MILESTONES.at28m, until: dayOf("1888-10-01") },
  { name: "pile4", pile: 4, from: MILESTONES.at28m, until: dayOf("1888-10-01") },
  { name: "upper3", pile: 3, from: dayOf("1888-09-15"), until: MILESTONES.thirdPlatform, upper: true },
  { name: "upper1", pile: 1, from: dayOf("1888-09-15"), until: MILESTONES.erected, upper: true },
];

/** How high over the last finished node a crane's platform stands: its hotte's depth and the node's struts' half-depth [estimated]. */
export const OVER_NODE = CRANE.mastBelow + 0.45;

/** Over the shaft's nodes the plan bracing is deeper (up to 1.00, spec.ts `PLAN_BRACING`): the upper cranes stand higher [estimated]. */
export const OVER_NODE_UPPER = CRANE.mastBelow + 1.1;

/** The Otis girders' tops over the 2nd floor (lifts.ts `OTIS.top`, the floor + 9.9), where the leg cranes stood for panels 13–14. */
const OVER_SECOND = 115.73 + 9.9;

/**
 * Where a crane's platform stands on `day`: its pivot, its jib's direction
 * `u` and `v` across, and whether it stands at all. In a leg the crane
 * rides ON its girders, the chassis' hinge « 2.00 » up the track from the
 * pivot (PL-XXIV Fig. 2), so the pivot stands 2.00 out from the rail line,
 * its jib toward the tower's axis; on the post it faces out.
 */
export function cranePose(run: CraneRun, day: number): { shown: boolean; at: Vec3; u: Vec3; v: Vec3 } {
  const shown = day >= run.from && day < run.until;
  const d = Math.min(Math.max(day, run.from), run.until - 1);
  const front = frontHeight(d);
  const { out, across } = legFrame(run.pile);
  if (run.upper !== true) {
    const y = d >= MILESTONES.secondPlatform ? OVER_SECOND : Math.min(115.5, nodeUnder(front)) + OVER_NODE;
    const r = railOut(Math.min(y, 115.5)) + CRANE.hinge;
    return { shown, at: [out[0] * r, y, out[2] * r], u: mul3(out, -1), v: across };
  }
  const y = Math.min(276.13, nodeUnder(front)) + OVER_NODE_UPPER;
  const r = CRANE.upperApart / 2;
  return { shown, at: [out[0] * r, y, out[2] * r], u: out, v: across };
}

/** The lift girders' slope in a leg, up the track, in the crane's frame (u toward the axis). */
function legTrack(y: number): Vec3 {
  const dr = railOut(y + 1) - railOut(y - 1);
  // Up the track the girders come IN toward the axis: +u in the crane's frame.
  return unit3([-dr, 2, 0]);
}

/**
 * A crane as the graph builds it, where it stands on `day` (its home is
 * its first day): its blocks in the world, and its drum. The page moves
 * the home mesh by the difference of the poses, which carries these.
 */
export function craneAt(run: CraneRun, day: number): { blocks: Block[]; drum: Prism } {
  const home = cranePose(run, run.from);
  const pose = cranePose(run, day);
  const track: Vec3 = run.upper !== true ? legTrack(home.at[1]) : [0, 1, 0];
  const { blocks, drum } = craneParts(track, run.upper !== true ? CRANE.legReach : CRANE.reach);
  return { blocks: blocks.map((b) => place(b, pose.u, pose.v, pose.at)), drum: placePrism(drum, pose.u, pose.v, pose.at) };
}

/** Each crane's mesh, built where it first stands, as `works.crane.<name>`. */
export function buildCranes(g: Graph): Parts {
  const works: Array<{ name: string; mesh: ReturnType<typeof prisms> }> = [];
  for (const run of CRANE_RUNS) {
    const { blocks, drum } = craneAt(run, run.from);
    const list: Prism[] = [...blocks.map(blockPrism), drum];
    works.push({ name: `crane.${run.name}`, mesh: prisms(g, `crane_${run.name}`, list) });
  }
  return { works };
}
