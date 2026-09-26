/**
 * The erection, 1887–89: when each piece of the tower went up.
 *
 * THE DATE IS A PURE FUNCTION OF THE PIECE. Nothing here is drawn from a
 * random stream and nothing is keyed on a cook order: a piece's date comes
 * from where it stands (its box), which class it belongs to, and the
 * book's timeline ({@link MILESTONES}, SOURCES.md §32). So the same tower
 * dates the same way in every cook, and a frame at any date is
 * reproducible.
 *
 * WHAT A PIECE IS. The graph hands back one merged mesh per class, and a
 * piece is a connected component of its index buffer ({@link
 * stageTriangles}): a whole member where the module welds one (a box, a
 * gusset, a baluster), one flat face of it where the module gives every
 * face its own points (a prism's walls, most of the lattice), and all of
 * it appears on one day. A member's faces share its top, so they agree;
 * its foot, a face of its own, may go up a little before it. A long
 * component of many triangles — a sweep: a rail, a helical stair — is
 * dated triangle by triangle, so it grows with the erection ({@link
 * LONG_PIECE}); a long flat face is not, since half a face would show.
 *
 * THE PAGE SETTLES WHEN, ONCE, AT LOAD (the pattern of `heads.ts`): it
 * reorders each mesh's triangles and each batch's instances by date and
 * then shows a date by drawing a PREFIX — `drawRange` on a mesh, `count`
 * on an instanced one. No shader, no per-frame work, nothing in the cook:
 * the graph is the same graph byte for byte, and the default page never
 * runs any of this.
 *
 * Days are counted from {@link EPOCH}, 26 January 1887, the day the
 * works were begun.
 */
import { NODES, PEDESTAL, PILES, SPLICE, profileAt } from "./spec.js";

/** Day 0: the works begun, 26 January 1887 (SOURCES.md §32.1). */
export const EPOCH = "1887-01-26";

const EPOCH_MS = Date.UTC(1887, 0, 26);
const DAY_MS = 86_400_000;

/** Days from {@link EPOCH} to an ISO date (`"1887-10-10"`). */
export function dayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_MS) / DAY_MS);
}

/** The ISO date of a day count (the whole day it falls in). */
export function isoOf(day: number): string {
  return new Date(EPOCH_MS + Math.floor(day) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The book's timeline, as days from {@link EPOCH}: the §10 table of the
 * erection (text pp. 112-113) and the dates round it. Every entry is
 * quoted with its page in SOURCES.md §32.1; the ones the book does not
 * print are marked estimated.
 */
export const MILESTONES = {
  /** « Les travaux furent inaugurés, le 26 janvier 1887 » (p. 86). */
  foundationsBegun: dayOf("1887-01-26"),
  /** The foundations finished, « le 30 juin suivant » (p. 94). */
  foundationsDone: dayOf("1887-06-30"),
  /** « C'est le 1er juillet 1887 que commença ce montage » (p. 102), on all four piles. */
  metalBegun: dayOf("1887-07-01"),
  /** Photograph 3: pile 4's first three tronçons, past mid-panel 1 (p. 103). */
  firstTroncons: dayOf("1887-07-18"),
  /** The first creeper crane, at pile 3 (p. 103). */
  firstCrane: dayOf("1887-09-02"),
  /** 28 m, « l'entretoise limitant le panneau 2 », reached (p. 103). */
  at28m: dayOf("1887-10-10"),
  /** « Fin du montage des quatre premiers panneaux » (p. 112). */
  fourPanels: dayOf("1887-12-04"),
  /** « Commencement du montage des poutres horizontales » (p. 112). */
  girdersBegun: dayOf("1887-12-18"),
  /** Photograph 5, « prise du 1er étage »: the legs at the 1st floor [the day sourced, the height it implies estimated]. */
  legsAtFirst: dayOf("1888-01-14"),
  /** « Fin du montage des poutres du premier étage » (p. 112). */
  girdersClosed: dayOf("1888-03-01"),
  /** « Achèvement de la première plate-forme » (p. 112). */
  firstPlatform: dayOf("1888-04-01"),
  /** « c. Commencement du montage au-dessus du premier étage. 1er avril 1888 » (p. 112). */
  upperLegsBegun: dayOf("1888-04-01"),
  /** « Le montage des arcs décoratifs s'est fait du 7 mai au 31 août » (p. 112). */
  archesBegun: dayOf("1888-05-07"),
  /**
   * The pylons and the girders' scaffolds taken down, once the 2nd floor's
   * girders were levelled and the sand boxes out (pp. 115, 117): standing
   * on 15 May, gone on 21 Aug (photographs 7, 8) [estimated].
   */
  scaffoldsDown: dayOf("1888-08-01"),
  /** « Fin du montage du deuxième étage » (p. 112). */
  secondPlatform: dayOf("1888-08-14"),
  /** The arches finished (p. 112). */
  archesDone: dayOf("1888-08-31"),
  /** The soubassements' ironwork begun (p. 95). */
  soubassementsBegun: dayOf("1888-09-23"),
  /** « Fin du montage de la plate-forme intermédiaire » (p. 112). */
  intermediate: dayOf("1888-11-30"),
  /** « Fin du montage du troisième étage » (p. 112). */
  thirdPlatform: dayOf("1889-02-24"),
  /** « Arrivée au sommet » (p. 112); the flag hoisted the same day (p. 311). */
  flag: dayOf("1889-03-31"),
  /** « Fin du montage » (p. 112). */
  erected: dayOf("1889-04-15"),
  /** The first visitors, « Du 15 au 31 mai 1889 » (p. 228). */
  opened: dayOf("1889-05-15"),
  /** « 15 avril au 1er juin 1889 (achèvement de la rivure) » (p. 113). */
  riveted: dayOf("1889-06-01"),
  /** The last lift into service, Otis by the South pile (p. 118). */
  lastLift: dayOf("1889-06-19"),
} as const;

/**
 * THE ERECTION FRONT: the day the top of the placed iron reached height
 * y, as (y, day) stops read linearly between. The book's own diagram
 * (Fig. 123, p. 112) puts every period's end on a node of Plate XXXI —
 * 50.40 on 4 Dec 1887, 115.50 on 14 Aug 1888, 195.70 on 30 Nov, 276.12 on
 * 24 Feb 1889, 300.50 on 31 Mar — and its per-panel pace (40 days a panel
 * below the 1st floor, 30 to the 2nd, 15 to the landing, 7 above, p. 113)
 * is what a steady rise between those stops gives. Photographs 3 and 5
 * pin two stretches the table spans in one step. SOURCES.md §32.2.
 */
export const FRONT: ReadonlyArray<readonly [number, number]> = [
  // The shoes' tops: the iron begun on all four piles.
  [NODES[0]!.y, MILESTONES.metalBegun],
  // Three tronçons, « dont la hauteur dépassait le milieu du premier panneau » (mid-panel 1: 11.9).
  [11.9, MILESTONES.firstTroncons],
  // The top of panel 2 (XXVI): the most the legs stood free.
  [28.4, MILESTONES.at28m],
  // The top of panel 4 (XXIV).
  [50.4, MILESTONES.fourPanels],
  // The top of panel 5 (XXIII): the legs at the 1st floor.
  [57.4, MILESTONES.legsAtFirst],
  // Nothing rose above the floor until the upper legs were begun, the day
  // the 1st platform was finished.
  [57.63, MILESTONES.upperLegsBegun],
  // The 2nd floor's node (XVII).
  [115.5, MILESTONES.secondPlatform],
  // The landing, between nodes IX and X.
  [195.93, MILESTONES.intermediate],
  // The 3rd floor.
  [276.13, MILESTONES.thirdPlatform],
  // The top terrace, « la Tour ayant atteint la hauteur de 300 m » (p. 311)...
  [300.515, MILESTONES.flag],
  // ...and the rod the flag went up on, the same day.
  [312.275, MILESTONES.flag],
];

/** Which of `PILES` (by array index, = quadrant) stands at (x, z). */
export function pileAt(x: number, z: number): number {
  const sx = x >= 0 ? 1 : -1;
  const sz = z >= 0 ? 1 : -1;
  return PILES.findIndex((p) => p.corner[0] === sx && p.corner[1] === sz);
}

/** Which of `FACES` (by array index, = quadrant) a point at (x, z) looks out of: +z, +x, -z, -x. */
export function faceAt(x: number, z: number): number {
  if (Math.abs(z) >= Math.abs(x)) return z >= 0 ? 0 : 2;
  return x >= 0 ? 1 : 3;
}

/** A linear read of (y, day) stops, clamped at both ends. */
function read(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y1, d1] = stops[i]!;
    if (y <= y1) {
      const [y0, d0] = stops[i - 1]!;
      return d0 + ((y - y0) / (y1 - y0)) * (d1 - d0);
    }
  }
  return stops[stops.length - 1]![1];
}

/** The day the erection front reached height `y`: the same in all four legs (the book dates none apart). */
export function frontDay(y: number): number {
  return read(FRONT, y);
}

/** `t` in [0, 1] of the way through a window of days. */
function within(w: readonly [number, number], t: number): number {
  return w[0] + Math.min(1, Math.max(0, t)) * (w[1] - w[0]);
}

/** An axis-aligned box: min x, y, z then max x, y, z. */
export type Box6 = readonly [number, number, number, number, number, number];

/**
 * How far a point stands outside the legs' squares at its height, in the
 * horizontal: 0 inside a leg, the distance to the nearest leg's inner
 * corner between them. A leg at height y is the square from its inner to
 * its outer uprights on both axes (spec.ts `NODES`).
 */
export function outsideLegs(x: number, y: number, z: number): number {
  const { inner } = profileAt(y);
  const dx = Math.max(0, inner - Math.abs(x));
  const dz = Math.max(0, inner - Math.abs(z));
  return Math.hypot(dx, dz);
}

/** The node the legs merge at (XI): above it there are no legs, only the shaft. */
const MERGE_Y = 179.1;

/** How far out from its leg a piece between the legs lies, as a fraction of the half-span: 0 at the leg, 1 at the face's middle. */
function reach(b: Box6): number {
  const cx = (b[0] + b[3]) / 2;
  const cy = Math.min((b[1] + b[4]) / 2, MERGE_Y);
  const cz = (b[2] + b[5]) / 2;
  const inner = profileAt(cy).inner;
  return inner > 0 ? Math.min(1, outsideLegs(cx, cy, cz) / inner) : 0;
}

/** The height band the 1st floor's girders fill between the legs: the decorative girder's foot to the floor. */
const FIRST_BAND = [43.0, 60.0] as const;

/**
 * The structural iron's date: the erection front at the piece's TOP, since
 * a piece is placed once the iron under it is up and the front is then
 * where its top is — so on the day the front reaches y nothing above y
 * stands. Between the legs at the 1st floor the girders were built out
 * from the legs on the scaffolds from 18 Dec 1887 and finished on 1 Mar
 * 1888, « Poutres de l'arc » first (Fig. 123); a piece there is dated by
 * how far out it lies, the middle of the face last, and never before the
 * leg beside it reached its height [dates sourced; the order out from the
 * legs estimated].
 */
export function structureDay(b: Box6, cls = ""): number {
  const cx = (b[0] + b[3]) / 2;
  const cy = (b[1] + b[4]) / 2;
  const cz = (b[2] + b[5]) / 2;
  const top = datedHeight(cls, b);
  let s = frontDay(top);
  // In a leg or the shaft, nothing goes up before the upright beside it:
  // the upright's piece that covers this one's foot is dated by its own
  // first tronçon (datedHeight), so wait for that.
  if (cls !== "uprights" && (b[4] > MERGE_Y || outsideLegs(cx, cy, cz) === 0)) s = Math.max(s, frontDay(coveringUpright(b[1])));
  // The 1st floor's girders (and, in the legs, the belt they run through):
  // their window, from the legs out; held to it, since the front's last
  // 0.23 m to the floor waits for the platform.
  if (top <= MERGE_Y && cy >= FIRST_BAND[0] && cy <= FIRST_BAND[1] && (outsideLegs(cx, cy, cz) > 0.5 || cls === "girders")) {
    const inLeg = outsideLegs(cx, cy, cz) === 0;
    const legs = Math.max(frontDay(top), inLeg ? frontDay(coveringUpright(b[1])) : -Infinity);
    return Math.min(MILESTONES.girdersClosed, Math.max(legs, within([MILESTONES.girdersBegun, MILESTONES.girdersClosed], reach(b))));
  }
  // Under the girders, between the legs, there is only the arches' work:
  // what the model hangs there (the ties at the arches' crowns) goes up
  // with them, the middle last.
  if (cy > 5 && cy < FIRST_BAND[0] && outsideLegs(cx, cy, cz) > 0.5) {
    return Math.max(s, within([MILESTONES.archesBegun, MILESTONES.archesDone], reach(b)));
  }
  return s;
}

/**
 * THE UPRIGHTS WENT UP IN TRONÇONS: « les tronçons successifs », 4.50 long
 * below the 2nd floor and 6.00 above it (spec.ts `SPLICE`), each placed
 * as the front reached its top. The model draws an upright a panel at a
 * time (up to 13.5 m), so an upright's piece is dated as the tronçon at
 * its foot: the front at its foot plus a tronçon, or its top if lower.
 * Dated by its top instead, a whole panel's upright would wait for the
 * panel's end while the struts at mid-panel hung in the air beside it
 * [derived].
 */
export function datedHeight(cls: string, b: Box6): number {
  if (cls !== "uprights") return b[4];
  return Math.min(b[4], b[1] + (b[1] < 115.5 ? SPLICE.troncon : SPLICE.tronconUpper));
}

/**
 * The dated height of the upright piece that covers height y: the node
 * below y plus a tronçon, or the node above if that is lower — the most
 * {@link datedHeight} gives any upright piece that starts at or below
 * that node [derived].
 */
function coveringUpright(y: number): number {
  // A foot within 0.3 m over a node rests on the node: the upright under
  // it is the one below the node, which is up.
  const foot = y - 0.3;
  let i = 0;
  while (i < NODES.length - 1 && NODES[i + 1]!.y <= foot) i++;
  const below = NODES[i]!.y;
  // Over the last node (the foot of panel 29) the upright runs on to the 3rd floor.
  const above = i + 1 < NODES.length ? NODES[i + 1]!.y : 276.13;
  return Math.min(above, below + (below < 115.5 ? SPLICE.troncon : SPLICE.tronconUpper));
}

/** The floors: their level and the day each platform was finished (p. 112). */
const FLOOR_DAYS: ReadonlyArray<readonly [number, number]> = [
  [57.63, MILESTONES.firstPlatform],
  [115.73, MILESTONES.secondPlatform],
  [195.93, MILESTONES.intermediate],
  [276.13, MILESTONES.thirdPlatform],
];

/**
 * THE FIT-OUT: what stands on a deck rather than holds it. On the 1st
 * floor, by face, from the gallery's arcades (not up on 21 Aug 1888, up
 * and unroofed on 26 Dec 1888: photographs 8, 9) to the restaurant,
 * « montés à partir du mois de janvier 1889. On commença par ceux des
 * faces Paris et Grenelle ; on continua par celui du Trocadéro ; puis, le
 * 15 avril ... celui du côté de l'École Militaire » (p. 118, read on the
 * image; the OCR has « 13 »). Faces by
 * quadrant (spec.ts `FACES`): 0 NW Trocadéro, 1 SW Grenelle, 2 SE École
 * Militaire, 3 NE Paris. The windows' other ends, and the 2nd, landing's
 * and 3rd floors' windows, are estimated (SOURCES.md §32.3).
 */
export const FITOUT = {
  first: [
    [dayOf("1888-10-01"), dayOf("1889-04-30")],
    [dayOf("1888-10-01"), dayOf("1889-04-15")],
    [dayOf("1889-04-15"), MILESTONES.opened],
    [dayOf("1888-10-01"), dayOf("1889-04-15")],
  ],
  second: [MILESTONES.secondPlatform, MILESTONES.erected],
  intermediate: [MILESTONES.intermediate, MILESTONES.erected],
  third: [MILESTONES.thirdPlatform, MILESTONES.opened],
} as const;

/** The floor a piece belongs to (index into FLOOR_DAYS), if its box sits on or just under a deck. */
function floorOf(b: Box6): number {
  for (let i = 0; i < FLOOR_DAYS.length; i++) {
    const f = FLOOR_DAYS[i]![0];
    if (b[1] >= f - 3 && b[1] <= f + 12) return i;
  }
  return -1;
}

/** A piece of the fit-out on a floor, spread over the floor's window by height (a pavilion's walls before its roof). */
function fitoutDay(b: Box6, floor: number): number {
  const f = FLOOR_DAYS[floor]![0];
  const t = (b[4] - f) / 12;
  if (floor === 0) return within(FITOUT.first[faceAt((b[0] + b[3]) / 2, (b[2] + b[5]) / 2)]!, t);
  return within(floor === 1 ? FITOUT.second : floor === 2 ? FITOUT.intermediate : FITOUT.third, t);
}

/**
 * THE LIFTS' MACHINERY, by line, erected bottom up over the book's windows
 * (pp. 113, 118): Otis in piles 1 and 3 « du 5 janvier au 13 juin 1889 »,
 * Roux, Combaluzier et Lepape in piles 2 and 4 « du 19 janvier au 8 juin »
 * (p. 113; p. 118 has « au 2 juin »),
 * Édoux in the shaft from 20 Feb to 2 Jun, and the machines and pumps
 * below ground « du 11 février 1889 au 10 avril ».
 */
export const LIFT_WORKS = {
  otis: [dayOf("1889-01-05"), dayOf("1889-06-13")],
  roux: [dayOf("1889-01-19"), dayOf("1889-06-08")],
  edoux: [dayOf("1889-02-20"), dayOf("1889-06-02")],
  machines: [dayOf("1889-02-11"), dayOf("1889-04-10")],
} as const;

/**
 * Each lift on the day it went into service (p. 118): the Roux,
 * « Mise en service les 26 mai et 2 juin » (which pile first is not said:
 * Ouest taken first [estimated]); Otis « le 4 juin par le pilier Nord, et
 * le 19 juin par le pilier Sud »; Édoux on 13 June.
 */
export const LIFT_SERVICE: ReadonlyArray<readonly [string, number]> = [
  ["roux.ouest", dayOf("1889-05-26")],
  ["roux.est", dayOf("1889-06-02")],
  ["otis.nord", dayOf("1889-06-04")],
  ["otis.sud", dayOf("1889-06-19")],
  ["edoux", dayOf("1889-06-13")],
];

function machineryDay(b: Box6): number {
  const cx = (b[0] + b[3]) / 2;
  const cy = (b[1] + b[4]) / 2;
  const cz = (b[2] + b[5]) / 2;
  if (b[4] <= 0.5) return within(LIFT_WORKS.machines, (b[1] + 15) / 15);
  if (cy > MERGE_Y || (cy > 110 && outsideLegs(cx, cy, cz) > 0)) return within(LIFT_WORKS.edoux, (b[4] - 115) / 165);
  const pile = PILES[pileAt(cx, cz)]!;
  return within(pile.lift === "otis" ? LIFT_WORKS.otis : LIFT_WORKS.roux, b[4] / 116);
}

/**
 * The foundations, pile by pile, bottom up (pp. 86-93): pile 2 excavated
 * from 26 Jan 1887, its masonry « commencée le 4 mars et terminée le
 * 10 avril »; pile 3 from 29 Jan, its masonry « commencées le 9 mars et
 * terminées fin avril »; pile 4, on compressed-air caissons, from « les
 * premiers jours de février », « L'ensemble du travail fut terminé le
 * 16 juin 1887 »; pile 1 on caissons too, its masonry done « dans les
 * derniers jours de juin ». Pile 1's start is estimated with pile 4's.
 */
const FOUNDATIONS: Record<1 | 2 | 3 | 4, readonly [number, number]> = {
  1: [dayOf("1887-02-01"), MILESTONES.foundationsDone],
  2: [MILESTONES.foundationsBegun, dayOf("1887-04-10")],
  3: [dayOf("1887-01-29"), dayOf("1887-04-30")],
  4: [dayOf("1887-02-01"), dayOf("1887-06-16")],
};

function foundationDay(b: Box6): number {
  const pile = PILES[pileAt((b[0] + b[3]) / 2, (b[2] + b[5]) / 2)]!;
  return within(FOUNDATIONS[pile.n], (b[4] + 15) / 18);
}

/**
 * THE SOUBASSEMENTS, the masonry-faced skirts round the legs' feet: their
 * iron « commencé le 23 septembre 1888 et ... terminé ... le 4 janvier
 * 1889 » (p. 95), their facing « terminé seulement en mai 1889 » (p. 96);
 * bottom up over the whole [the order estimated].
 */
const SOUBASSEMENTS = [MILESTONES.soubassementsBegun, dayOf("1889-05-15")] as const;

/**
 * The stairs from the ground to the 1st floor: « ne furent montés que
 * vers le mois de novembre » (p. 118), the year not printed [1888
 * estimated: the legs reached the floor in January 1888].
 */
const GROUND_STAIRS = [dayOf("1888-11-01"), dayOf("1888-11-30")] as const;

/**
 * THE TEMPORARY WORKS (`erection.ts`), by kind: the window its pieces went
 * up in, bottom up between `base` and `top`, and the day it came down (it
 * shows through the day before). SOURCES.md §32.7.
 *
 * - The pylons, « élevés » while the legs were built out to 27 m (PL-XXIV
 *   text), from August 1887 [estimated] to the landing; the bearings on
 *   them with the tronçon they are riveted under, the one from node XXVI
 *   (28.40), up when the front passed 32.90 (the uprights' dating,
 *   `datedHeight`), 22 Oct 1887 [estimated]; all of it down once « les poutres
 *   du deuxième étage furent assemblées et les boîtes à sable enlevées »
 *   (p. 115): standing on photograph 7 (15 May 1888), gone on photograph 8
 *   (21 Aug) [the order sourced; the days estimated].
 * - The scaffolds, « élevés en même temps que les pylônes » yet still going
 *   up on photograph 4 (7 Dec 1887), finished for the girders begun on
 *   them on 18 Dec [the end sourced; the start estimated]; the deck came
 *   off on 7 May 1888, when the arches were begun: in the model the
 *   arches' crowns pass where the deck stood [derived from the model; the
 *   book dates no deck coming off, and has the crowns built on the
 *   scaffold itself, p. 117]; the rest down with the pylons.
 */
const wholeDayOf = (day: number): number => Math.ceil(day - 1e-9);

/** The pylons' top, (60.91) on PL-XXV (erection.ts `PYLON`). */
const PYLON_TOP = 27.41;

export const WORKS: Readonly<Record<string, { readonly up: readonly [number, number]; readonly base: number; readonly top: number; readonly down: number }>> = {
  pylons: { up: [dayOf("1887-08-01"), dayOf("1887-10-05")], base: 0, top: 27.41, down: dayOf("1888-08-10") },
  bearings: { up: [wholeDayOf(frontDay(28.4 + 4.5)), wholeDayOf(frontDay(28.4 + 4.5))], base: 27, top: 30, down: dayOf("1888-08-01") },
  scaffolds: { up: [dayOf("1887-10-01"), dayOf("1887-12-17")], base: 0, top: 42.6, down: dayOf("1888-08-20") },
  decks: { up: [dayOf("1887-12-15"), dayOf("1887-12-17")], base: 42, top: 42.6, down: MILESTONES.archesBegun },
};

/** The day a kind of temporary works came down, from its output's name (`works.<kind>`). */
export function worksDown(output: string): number | undefined {
  return WORKS[output.slice("works.".length)]?.down;
}

/**
 * The class a piece belongs to, then its box: the piece's day. A class
 * this file does not name is dated as structure, never before the iron
 * under it; a `works.<kind>` piece by its kind's window in {@link WORKS}.
 */
export function pieceDay(cls: string, b: Box6): number {
  const s = structureDay(b, cls);
  const cx = (b[0] + b[3]) / 2;
  const cy = (b[1] + b[4]) / 2;
  const cz = (b[2] + b[5]) / 2;
  if (cls.startsWith("works.")) {
    const w = WORKS[cls.slice("works.".length)];
    // By its FOOT: a post goes up whole from the ground (the pylons' and
    // scaffolds' posts are spliced at their joints, so an upper length
    // waits for the lower), and a moise or a cross on the posts after them.
    if (w !== undefined) return within(w.up, (b[1] - w.base) / (w.top - w.base));
  }
  switch (cls) {
    case "foundations":
      // Under the ground, the foundations; above it, the machine room's
      // chimney and walls, with the machines they house [estimated].
      return b[4] <= 0.5 ? foundationDay(b) : within(LIFT_WORKS.machines, b[1] / 20);
    case "masonry": {
      // The support stones under the shoes are the foundations': under a
      // leg's own square, not the plinth's skirt round it.
      const foot = profileAt(0);
      const under = outsideLegs(cx, cy, cz) === 0 && Math.max(Math.abs(cx), Math.abs(cz)) <= foot.outer + 1;
      if (b[4] <= NODES[0]!.y + 0.2 && under) return foundationDay(b);
      return within(SOUBASSEMENTS, b[1] / PEDESTAL.height);
    }
    case "arches": {
      // Out from the legs, the middle last: « La partie des arcs placée
      // entre les grands échafaudages et les pylônes, a été montée en porte
      // à faux », the middle on the scaffold (p. 117).
      const day = Math.max(s, within([MILESTONES.archesBegun, MILESTONES.archesDone], reach(b)));
      // Where the inner arches meet at a, over the double pylon's top, the
      // model's arch iron stands where the pylon did: it waits for the
      // pylons to come down [derived from the geometry; the book dates the
      // arches to 31 Aug, after them].
      const a = profileAt(PYLON_TOP + 2).inner;
      if (b[1] < PYLON_TOP + 2 && Math.hypot(Math.abs(cx) - a, Math.abs(cz) - a) < 3.5) return Math.max(day, WORKS.pylons!.down);
      return day;
    }
    case "names":
      return Math.max(s, fitoutDay(b, 0));
    case "machinery":
      return Math.max(s, machineryDay(b));
    case "platforms":
    case "glass":
    case "silvered": {
      const floor = floorOf(b);
      if (floor < 0) {
        // Round the legs' feet, in the plinths' ring: their dress (the
        // grilles) and the stairs' first steps, with the soubassements.
        if (cls === "platforms" && b[4] <= PEDESTAL.height + 0.2 && Math.max(Math.abs(cx), Math.abs(cz)) >= PEDESTAL.innerFoot - 1) {
          return Math.max(s, within(SOUBASSEMENTS, b[1] / PEDESTAL.height));
        }
        if (cls === "platforms" && b[4] < 57 && outsideLegs(cx, cy, cz) === 0) return Math.max(s, within(GROUND_STAIRS, b[4] / 57));
        return s;
      }
      const deck = FLOOR_DAYS[floor]![1];
      // The deck and what holds it: up to 0.5 m over the floor.
      if (cls === "platforms" && b[4] <= FLOOR_DAYS[floor]![0] + 0.5) return Math.max(s, deck);
      return Math.max(s, deck, fitoutDay(b, floor));
    }
    default:
      return s;
  }
}

/**
 * A piece is up at the END of the day it is dated in: its day rounded up
 * to a whole day. The scrubber moves a day at a time, and whole days keep
 * a mesh's table to one entry per day on which anything of it went up
 * (under 900) rather than one per piece.
 */
export function wholeDay(day: number): number {
  return Math.ceil(day - 1e-9);
}

/**
 * A component longer than this on any axis, and of more than
 * {@link LONG_TRIANGLES} triangles (a sweep, not a flat face), is dated
 * triangle by triangle (see the file comment).
 */
export const LONG_PIECE = 15;
export const LONG_TRIANGLES = 16;

/** A mesh or a batch reordered by date: draw the first `ends[k]` to show everything dated `days[k]` or earlier. */
export interface Staged {
  /** The distinct days, ascending. */
  readonly days: Float64Array;
  /** Index count (mesh) or instance count (batch) drawn through `days[k]`. */
  readonly ends: Uint32Array;
}

/** How much of a staged mesh or batch to draw on `day`: a binary search. */
export function shownThrough(staged: Staged, day: number): number {
  let lo = 0;
  let hi = staged.days.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (staged.days[mid]! <= day) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 ? 0 : staged.ends[lo - 1]!;
}

/** Group sorted per-item days into a {@link Staged}; `stride` items of the buffer per item. */
function group(sortedDays: Float64Array, stride: number): Staged {
  const days: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < sortedDays.length; i++) {
    const d = sortedDays[i]!;
    if (days.length > 0 && days[days.length - 1] === d) ends[ends.length - 1] = (i + 1) * stride;
    else {
      days.push(d);
      ends.push((i + 1) * stride);
    }
  }
  return { days: Float64Array.from(days), ends: Uint32Array.from(ends) };
}

/** The connected pieces of an indexed triangle mesh: a component id per vertex. */
export function components(vertexCount: number, index: ArrayLike<number>): Int32Array {
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]!]!;
      a = parent[a]!;
    }
    return a;
  };
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = find(index[t]!);
    const b = find(index[t + 1]!);
    const c = find(index[t + 2]!);
    if (b !== a) parent[b] = a;
    if (c !== a && c !== b) parent[find(c)] = a;
  }
  for (let i = 0; i < vertexCount; i++) parent[i] = find(i);
  return parent;
}

/**
 * Date every triangle of one class' mesh and reorder the index by date
 * (stably, so pieces of one day keep the cook's order). Returns the new
 * index and its {@link Staged} table. A pure function of the positions,
 * the index and the class.
 */
export function stageTriangles(
  cls: string,
  position: ArrayLike<number>,
  index: ArrayLike<number>,
): Staged & { readonly index: Uint32Array; readonly triDays: Float64Array } {
  const nv = position.length / 3;
  const comp = components(nv, index);
  // Each component's box.
  const box = new Map<number, number[]>();
  for (let v = 0; v < nv; v++) {
    const x = position[3 * v]!;
    const y = position[3 * v + 1]!;
    const z = position[3 * v + 2]!;
    const b = box.get(comp[v]!);
    if (b === undefined) box.set(comp[v]!, [x, y, z, x, y, z]);
    else {
      if (x < b[0]!) b[0] = x;
      if (y < b[1]!) b[1] = y;
      if (z < b[2]!) b[2] = z;
      if (x > b[3]!) b[3] = x;
      if (y > b[4]!) b[4] = y;
      if (z > b[5]!) b[5] = z;
    }
  }
  const nt = Math.floor(index.length / 3);
  const tris = new Map<number, number>();
  for (let t = 0; t < nt; t++) tris.set(comp[index[3 * t]!]!, (tris.get(comp[index[3 * t]!]!) ?? 0) + 1);
  const compDay = new Map<number, number>();
  for (const [c, b] of box) {
    const long = b[3]! - b[0]! > LONG_PIECE || b[4]! - b[1]! > LONG_PIECE || b[5]! - b[2]! > LONG_PIECE;
    if (!long || (tris.get(c) ?? 0) <= LONG_TRIANGLES) compDay.set(c, wholeDay(pieceDay(cls, b as unknown as Box6)));
  }
  const triDay = new Float64Array(nt);
  const tb = [0, 0, 0, 0, 0, 0];
  for (let t = 0; t < nt; t++) {
    const a = index[3 * t]!;
    const d = compDay.get(comp[a]!);
    if (d !== undefined) {
      triDay[t] = d;
      continue;
    }
    // A long piece: this triangle's own box.
    for (let k = 0; k < 3; k++) {
      const v = index[3 * t + k]!;
      for (let e = 0; e < 3; e++) {
        const p = position[3 * v + e]!;
        if (k === 0 || p < tb[e]!) tb[e] = p;
        if (k === 0 || p > tb[e + 3]!) tb[e + 3] = p;
      }
    }
    triDay[t] = wholeDay(pieceDay(cls, tb as unknown as Box6));
  }
  const order = sortedOrder(triDay);
  const out = new Uint32Array(3 * nt);
  const sorted = new Float64Array(nt);
  for (let i = 0; i < nt; i++) {
    const t = order[i]!;
    out[3 * i] = index[3 * t]!;
    out[3 * i + 1] = index[3 * t + 1]!;
    out[3 * i + 2] = index[3 * t + 2]!;
    sorted[i] = triDay[t]!;
  }
  return { index: out, triDays: triDay, ...group(sorted, 3) };
}

/** A stable ascending order of `days`: the permutation, ties in index order. */
export function sortedOrder(days: Float64Array): Uint32Array {
  const order = new Uint32Array(days.length);
  for (let i = 0; i < order.length; i++) order[i] = i;
  order.sort((a, b) => days[a]! - days[b]! || a - b);
  return order;
}

/**
 * Order a batch's items by date: the permutation to apply to its
 * instances, and its {@link Staged} table.
 */
export function stageItems(raw: Float64Array): Staged & { readonly order: Uint32Array } {
  const days = raw.map(wholeDay);
  const order = sortedOrder(days);
  const sorted = new Float64Array(days.length);
  for (let i = 0; i < order.length; i++) sorted[i] = days[order[i]!]!;
  return { order, ...group(sorted, 1) };
}

/**
 * THE SITE RIVETS BY THE BOOK'S SCHEDULE. The book counts the rivets
 * driven on the Champ de Mars period by period (spec.ts
 * `COUNTS.rivetsSiteByPeriod`, text p. 113) and at 28 m (p. 103). The
 * model's site rivets are taken in the order their iron went up, and the
 * k-th of N is driven on the day the book's running total reached k/N of
 * 1,050,846 — but never before its iron was up. So the model's site
 * riveting keeps the book's pace, whatever its own count.
 */
export const SITE_RIVETING: ReadonlyArray<readonly [number, number]> = [
  [MILESTONES.metalBegun, 0],
  [MILESTONES.at28m, 98_000],
  [MILESTONES.fourPanels, 189_580],
  [MILESTONES.firstPlatform, 425_389],
  [MILESTONES.secondPlatform, 709_287],
  [MILESTONES.intermediate, 871_471],
  [MILESTONES.thirdPlatform, 972_210],
  [MILESTONES.erected, 1_023_078],
  [MILESTONES.riveted, 1_050_846],
];

/** The day the book's running site-rivet total reached `n`. */
export function sitePaceDay(n: number): number {
  const s = SITE_RIVETING;
  if (n <= 0) return s[0]![0];
  for (let i = 1; i < s.length; i++) {
    const [d1, n1] = s[i]!;
    if (n <= n1) {
      const [d0, n0] = s[i - 1]!;
      return d0 + ((n - n0) / (n1 - n0)) * (d1 - d0);
    }
  }
  return s[s.length - 1]![0];
}

/** Site rivets' days from their iron's days (see {@link SITE_RIVETING}). */
export function siteRivetDays(ironDays: Float64Array): Float64Array {
  const order = sortedOrder(ironDays);
  const total = SITE_RIVETING[SITE_RIVETING.length - 1]![1];
  const out = new Float64Array(ironDays.length);
  const n = ironDays.length;
  for (let k = 0; k < n; k++) {
    const i = order[k]!;
    out[i] = Math.max(ironDays[i]!, sitePaceDay(((k + 0.5) / n) * total));
  }
  return out;
}

/**
 * THE IRON UNDER EACH RIVET: the day the last of the surfaces within
 * `reach` of a point went up — the plate a head sits on and whatever it
 * fastens — or NaN where no surface is that near. A rivet comes with its
 * iron, so this is a shop rivet's day and a site rivet's earliest. The
 * search is a grid of 0.6 m cells holding the points; the triangles go
 * latest first, each visiting only the cells its plane (grown by `reach`)
 * passes through inside its box, and a head's first hit is its answer.
 */
export function hostDays(
  points: ArrayLike<number>,
  meshes: ReadonlyArray<{ readonly position: ArrayLike<number>; readonly index: ArrayLike<number>; readonly triDays: ArrayLike<number> }>,
  reach = 0.02,
): Float64Array {
  const n = Math.floor(points.length / 3);
  const out = new Float64Array(n).fill(Number.NaN);
  // Cells of 0.6 m, keyed as small integers (the tower's box fits).
  const C = 0.6;
  const key = (i: number, j: number, k: number): number => ((i + 150) * 700 + (j + 110)) * 300 + (k + 150);
  const cells = new Map<number, number[]>();
  for (let p = 0; p < n; p++) {
    const kk = key(Math.floor(points[3 * p]! / C), Math.floor(points[3 * p + 1]! / C), Math.floor(points[3 * p + 2]! / C));
    const list = cells.get(kk);
    if (list === undefined) cells.set(kk, [p]);
    else list.push(p);
  }
  const r2 = reach * reach;
  // The triangles LATEST FIRST, across all the meshes (each is sorted by
  // day already): a head's first hit is then its answer, and every earlier
  // surface near it is passed over at a comparison.
  const next = meshes.map((m) => Math.floor(m.index.length / 3) - 1);
  for (;;) {
    let mi = -1;
    let best = -Infinity;
    for (let i = 0; i < meshes.length; i++) {
      const t = next[i]!;
      if (t >= 0 && meshes[i]!.triDays[t]! > best) {
        best = meshes[i]!.triDays[t]!;
        mi = i;
      }
    }
    if (mi < 0) break;
    // Run this mesh down to the next mesh's day, in one go.
    const m = meshes[mi]!;
    let floor = -Infinity;
    for (let i = 0; i < meshes.length; i++) if (i !== mi && next[i]! >= 0) floor = Math.max(floor, meshes[i]!.triDays[next[i]!]!);
    const P = m.position;
    const I = m.index;
    let t = next[mi]!;
    for (; t >= 0 && m.triDays[t]! >= floor; t--) {
      const day = m.triDays[t]!;
      const a = 3 * I[3 * t]!;
      const b = 3 * I[3 * t + 1]!;
      const c = 3 * I[3 * t + 2]!;
      const ax = P[a]!, ay = P[a + 1]!, az = P[a + 2]!;
      const bx = P[b]!, by = P[b + 1]!, bz = P[b + 2]!;
      const cx = P[c]!, cy = P[c + 1]!, cz = P[c + 2]!;
      // The plane, for a cheap first test.
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nn = Math.hypot(nx, ny, nz);
      // The cells the triangle's plane passes through (grown by `reach`),
      // inside its box: over the two axes the normal leans least on, and
      // along the third only the plane's own span over each cell. A box's
      // worth of cells would be the volume; this is the area.
      const lo = [Math.min(ax, bx, cx) - reach, Math.min(ay, by, cy) - reach, Math.min(az, bz, cz) - reach];
      const hi = [Math.max(ax, bx, cx) + reach, Math.max(ay, by, cy) + reach, Math.max(az, bz, cz) + reach];
      const nv = [nx, ny, nz];
      const an = [Math.abs(nx), Math.abs(ny), Math.abs(nz)];
      const d = an[0]! >= an[1]! && an[0]! >= an[2]! ? 0 : an[1]! >= an[2]! ? 1 : 2;
      const e1 = (d + 1) % 3;
      const e2 = (d + 2) % 3;
      const A = [ax, ay, az];
      const grow = nn > 0 ? (reach * nn) / an[d]! : Infinity;
      const cell = [0, 0, 0];
      for (let c1 = Math.floor(lo[e1]! / C); c1 <= Math.floor(hi[e1]! / C); c1++) {
        const x10 = Math.max(lo[e1]!, c1 * C);
        const x11 = Math.min(hi[e1]!, (c1 + 1) * C);
        for (let c2 = Math.floor(lo[e2]! / C); c2 <= Math.floor(hi[e2]! / C); c2++) {
          const x20 = Math.max(lo[e2]!, c2 * C);
          const x21 = Math.min(hi[e2]!, (c2 + 1) * C);
          let dlo = lo[d]!;
          let dhi = hi[d]!;
          if (nn > 0) {
            // The plane along d over this cell's rectangle: its extremes are at the corners.
            const at = (u: number, w: number): number => A[d]! - (nv[e1]! * (u - A[e1]!) + nv[e2]! * (w - A[e2]!)) / nv[d]!;
            const q0 = at(x10, x20);
            const q1 = at(x11, x20);
            const q2 = at(x10, x21);
            const q3 = at(x11, x21);
            dlo = Math.max(dlo, Math.min(q0, q1, q2, q3) - grow);
            dhi = Math.min(dhi, Math.max(q0, q1, q2, q3) + grow);
            if (dlo > dhi) continue;
          }
          cell[e1] = c1;
          cell[e2] = c2;
          for (let cd = Math.floor(dlo / C); cd <= Math.floor(dhi / C); cd++) {
            cell[d] = cd;
            const kk = key(cell[0]!, cell[1]!, cell[2]!);
            const list = cells.get(kk);
            if (list === undefined) continue;
            let alive = 0;
            for (const p of list) {
              if (!Number.isNaN(out[p]!)) continue;
              const px = points[3 * p]!, py = points[3 * p + 1]!, pz = points[3 * p + 2]!;
              if ((nn === 0 || Math.abs((px - ax) * nx + (py - ay) * ny + (pz - az) * nz) <= reach * nn) && distanceSq(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) <= r2) out[p] = day;
              else alive++;
            }
            // A cell whose heads are all found is done with.
            if (alive === 0) cells.delete(kk);
          }
        }
      }
    }
    next[mi] = t;
  }
  return out;
}

/** The squared distance from a point to a triangle (the closest-point regions of Ericson, *Real-Time Collision Detection* §5.1.5). */
function distanceSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let qx: number, qy: number, qz: number;
  const sq = (x: number, y: number, z: number): number => (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
  if (d1 <= 0 && d2 <= 0) return sq(ax, ay, az);
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return sq(bx, by, bz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3 || 1);
    return sq(ax + v * abx, ay + v * aby, az + v * abz);
  }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return sq(cx, cy, cz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6 || 1);
    return sq(ax + w * acx, ay + w * acy, az + w * acz);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6) || 1);
    return sq(bx + w * (cx - bx), by + w * (cy - by), bz + w * (cz - bz));
  }
  const den = 1 / (va + vb + vc || 1);
  const v = vb * den;
  const w = vc * den;
  qx = ax + abx * v + acx * w;
  qy = ay + aby * v + acy * w;
  qz = az + abz * v + acz * w;
  return sq(qx, qy, qz);
}

/**
 * One instance's day where no surface is found under it ({@link hostDays}),
 * from its output's name and where it stands: a rivet as the iron at its
 * height, a fitting (a globe, a cabochon, a baluster) as the floor's
 * fit-out.
 */
export function instanceDay(output: string, x: number, y: number, z: number): number {
  const b: Box6 = [x, y, z, x, y, z];
  if (output.startsWith("fittings.")) return pieceDay("glass", b);
  return structureDay(b);
}

/**
 * What the graph puts out whole, by output name: the lifts' cars, chains
 * and moving machinery on the day their line went into service
 * ({@link LIFT_SERVICE}), and the flag on the day it was hoisted.
 */
export function outputDay(name: string): number | undefined {
  if (name.startsWith("cloth.")) return MILESTONES.flag;
  if (!name.startsWith("car.") && !name.startsWith("chain.")) return undefined;
  for (const [line, day] of LIFT_SERVICE) if (name.includes(line)) return day;
  return MILESTONES.lastLift;
}

/** The scrubber's range: the works begun to the last lift in service. */
export const SPAN = [MILESTONES.foundationsBegun, MILESTONES.lastLift] as const;
