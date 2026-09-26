/**
 * The tower's numbers, as Eiffel printed them.
 *
 * Almost everything here comes from one plate: XXXI of Eiffel's 1900 album
 * "La Tour de trois cents mètres", a dimensioned elevation of all 29 panels
 * giving every node's height and the outer width, inner width and leg side
 * at each node. Its height chain closes on the printed floor levels to the
 * centimetre, and an independent transcription of Eiffel's documents
 * agrees with it. Plate I (general elevation) gives the floors and the
 * summit, plates VII and XI the first-floor girders and the arch.
 *
 * CONVENTIONS. y is height above the ground at the tower's centre (the
 * datum of the official floor heights; the plates measure from the support
 * centres, 2.50 m higher). A "half-width" is the distance from the tower's
 * axis to a member's axis measured perpendicular to a tower FACE, so a
 * corner on the diagonal sits at (w, w). All lengths in metres.
 *
 * Tags: [sourced] printed on a plate; [derived] computed from sourced
 * numbers; [estimated] read off a drawing. Unmarked numbers are sourced.
 * `SOURCES.md` beside this file is the research behind every number: the
 * source keys, the plate readings, the arithmetic, and where sources
 * disagree.
 */

/** One structural node level: the bottom of a panel, or the supports. */
export interface NodeLevel {
  /** Plate XXXI's name for the node (the bottom of panel 29 - n is node n). */
  readonly name: string;
  /** Height above the ground at the tower's centre. */
  readonly y: number;
  /** Half-width to the OUTER corner upright (c). */
  readonly outer: number;
  /**
   * Half-width to the INNER uprights: a and b/d below the 2nd floor, b/d
   * alone to node XI, and 0 above it, where b/d have merged on the face
   * centre line.
   */
  readonly inner: number;
}

/**
 * The profile, supports to the top of panel 28 (Plate XXXI; half of each
 * printed full width). Every upright is straight within a panel and turns
 * only at these nodes: the famous curve is a 29-sided polyline.
 */
export const NODES: readonly NodeLevel[] = [
  // [derived] panel 1's line extended down 3.90 m to the support centres.
  { name: "supports", y: 2.5, outer: 58.2041, inner: 43.2041 },
  // Panels 1-5: parallel legs, each a 15.00 x 15.00 m square prism.
  { name: "XXVIII", y: 6.4, outer: 56.2435, inner: 41.2435 },
  { name: "XXVII", y: 17.4, outer: 50.7135, inner: 35.7135 },
  { name: "XXVI", y: 28.4, outer: 45.184, inner: 30.184 },
  { name: "XXV", y: 39.4, outer: 39.6545, inner: 24.6545 },
  { name: "XXIV", y: 50.4, outer: 34.125, inner: 19.125 },
  // The 1st floor's structural node, 0.23 m below the floor.
  { name: "XXIII", y: 57.4, outer: 31.3476, inner: 16.3476 },
  // Panels 6-11: the legs taper, 15.00 -> 10.412 m.
  { name: "XXII", y: 68.4, outer: 27.65, inner: 13.55 },
  { name: "XXI", y: 79.4, outer: 24.475, inner: 11.325 },
  { name: "XX", y: 90.4, outer: 21.6, inner: 9.4 },
  { name: "XIX", y: 100.6, outer: 19.16, inner: 7.84 },
  { name: "XVIII", y: 110.6, outer: 16.8134, inner: 6.3558 },
  // The 2nd floor's structural node. The inner upright a ends here.
  { name: "XVII", y: 115.5, outer: 15.852, inner: 5.44 },
  // Panels 12-17: b and d converge on the face centre lines.
  { name: "XVI", y: 126.8, outer: 14.3358, inner: 4.4436 },
  { name: "XV", y: 137.5, outer: 12.9, inner: 3.5 },
  { name: "XIV", y: 148.1, outer: 11.8, inner: 2.5686 },
  { name: "XIII", y: 158.6, outer: 10.8, inner: 1.6468 },
  { name: "XII", y: 169.1, outer: 10.0061, inner: 0.9314 },
  // The legs merge: b of one leg and d of the next sit 0.50 m apart.
  { name: "XI", y: 179.1, outer: 9.25, inner: 0.25 },
  // Panels 19-28: one straight frustum, each panel a 0.94612 copy of the
  // one below it (height / bottom width 0.55193 throughout) [derived].
  { name: "X", y: 189.1, outer: 8.7, inner: 0 },
  // IX's half-width is printed 8.28122 or 8.23122; the printed total
  // 16.46244 settles it [derived].
  { name: "IX", y: 198.704, outer: 8.2312, inner: 0 },
  { name: "VIII", y: 207.79, outer: 7.7877, inner: 0 },
  { name: "VII", y: 216.386, outer: 7.3681, inner: 0 },
  { name: "VI", y: 224.52, outer: 6.9711, inner: 0 },
  { name: "V", y: 232.215, outer: 6.5955, inner: 0 },
  { name: "IV", y: 239.496, outer: 6.2401, inner: 0 },
  { name: "III", y: 246.384, outer: 5.9039, inner: 0 },
  { name: "II", y: 252.901, outer: 5.5857, inner: 0 },
  { name: "I", y: 259.067, outer: 5.2848, inner: 0 },
  // The bottom of panel 29: a prismatic 10 m box up to the 3rd floor.
  { name: "top28", y: 264.9, outer: 5.0, inner: 0 },
];

/** Look a node up by its plate name. */
export function node(name: string): NodeLevel {
  const n = NODES.find((x) => x.name === name);
  if (n === undefined) throw new Error(`eiffel spec: no node named "${name}"`);
  return n;
}

/**
 * The node table read at height y: linear between nodes, exact at them,
 * because every upright is straight within a panel. Below the supports and
 * above the last node it extends the end panels' lines.
 */
export function profileAt(y: number): { outer: number; inner: number } {
  let i = 0;
  while (i < NODES.length - 2 && (NODES[i + 1] as NodeLevel).y < y) i++;
  const a = NODES[i] as NodeLevel;
  const b = NODES[i + 1] as NodeLevel;
  if (y === b.y) return { outer: b.outer, inner: b.inner };
  const t = (y - a.y) / (b.y - a.y);
  return { outer: a.outer + (b.outer - a.outer) * t, inner: a.inner + (b.inner - a.inner) * t };
}

/** Floor levels (Plate I), 0.23 m above their structural nodes. */
export const FLOORS = {
  first: 57.63,
  second: 115.73,
  /** The lift-transfer landing, between nodes IX and X. */
  landing: 195.93,
  third: 276.13,
  /** The lantern terrace (326.715 altitude). */
  lanternTerrace: 293.215,
  /** The top terrace (334.015 altitude): the "300 m". */
  topTerrace: 300.515,
  /** The flagpole's top, 11.760 above the top terrace: 312.275. */
  flagTop: 312.275,
} as const;

/**
 * Plate altitudes ("cotes") are metres above sea level; the ground at the
 * tower's centre is "(33.50)" [sourced PL-I], so y = cote - 33.50 and
 * every FLOORS entry is its printed cote less this [derived]. A number
 * quoted without its datum ("caissons to 22 m") is an altitude until shown
 * otherwise.
 */
export const GROUND_ALTITUDE = 33.5;

/** Height above the ground at the tower's centre, from a plate's cote. */
export const yOfCote = (cote: number): number => cote - GROUND_ALTITUDE;

/** The four legs' ("piles'") names, by the plates' numbering. */
export type PileName = "Nord" | "Est" | "Sud" | "Ouest";

/**
 * THE PILES, one compass for every part that depends on a leg or a face.
 *
 * The book numbers them two ways. Its text once prints « 2 ou Ouest … 4 ou
 * Est », but the plates (PL-I Fig. 3, PL-XVIII Fig. 3, PL-XXXI's plan),
 * the text's own clockwise order and the compressed-air caissons (Seine
 * side, under the North and West legs) all give n°1 Nord, n°2 Est, n°3
 * Sud, n°4 Ouest, clockwise seen from above [sourced]. The plates win.
 *
 * The model has no compass of its own: it lays PL-XVIII Fig. 3 out as the
 * render's top view, x right and z down, which puts pile 2 top left, 3 top
 * right, 1 bottom left and 4 bottom right, as the figure does. A part
 * built in the +x+z quadrant is pile 4's, and quadrant target k (k quarter
 * turns about +y, +z onto +x: see `quadrants` in lattice.ts) carries it to
 * the pile listed at k [derived]. `corner` is the sign of (x, z) at the
 * pile. tests/eiffelConventions.test.ts holds this table to the plates.
 *
 * - `lift`: Otis in piles 1 and 3, Roux, Combaluzier et Lepape in 2 and 4
 *   [sourced PL-XX, PL-XXI].
 * - `groundStair`: « un dans la pile 2 et un dans la pile 4; les piles 1 et
 *   3 n'ont pas d'escalier partant du rez-de-chaussée » [sourced PL-XX Nota].
 * - `caissons`: foundations sunk by compressed air, under the two legs on
 *   the Seine side, North and West [sourced TS-FR; SOURCES.md §3.3].
 */
export const PILES: ReadonlyArray<{
  readonly n: 1 | 2 | 3 | 4;
  readonly name: PileName;
  readonly quadrant: 0 | 1 | 2 | 3;
  readonly corner: readonly [1 | -1, 1 | -1];
  readonly lift: "otis" | "roux";
  readonly groundStair: boolean;
  readonly caissons: boolean;
}> = [
  { n: 4, name: "Ouest", quadrant: 0, corner: [1, 1], lift: "roux", groundStair: true, caissons: true },
  { n: 3, name: "Sud", quadrant: 1, corner: [1, -1], lift: "otis", groundStair: false, caissons: false },
  { n: 2, name: "Est", quadrant: 2, corner: [-1, -1], lift: "roux", groundStair: true, caissons: false },
  { n: 1, name: "Nord", quadrant: 3, corner: [-1, 1], lift: "otis", groundStair: false, caissons: true },
];

/** A pile by its plate number. */
export function pile(n: 1 | 2 | 3 | 4): (typeof PILES)[number] {
  return PILES.find((p) => p.n === n) as (typeof PILES)[number];
}

/**
 * THE FACES, each between two piles, as the quadrant targets turn a part
 * built on the +z face: target 0 is +z, 1 +x, 2 -z, 3 -x [derived]. A face
 * between piles at compass points faces the intercardinal between them.
 * `pavilion` is the 1889 building on its three central first-floor bays
 * [sourced PL-XVIII Fig. 3 and Nota, E1900-TXT; SOURCES.md §10.2]; the
 * Flamand became a theatre after 1889.
 */
export const FACES: ReadonlyArray<{
  readonly quadrant: 0 | 1 | 2 | 3;
  /** The face's outward normal in the render, (x, z). */
  readonly normal: readonly [number, number];
  readonly compass: "NW" | "SW" | "SE" | "NE";
  readonly piles: readonly [1 | 2 | 3 | 4, 1 | 2 | 3 | 4];
  readonly pavilion: "Restaurant flamand" | "Bar anglo-américain" | "Restaurant français" | "Restaurant russe";
}> = [
  { quadrant: 0, normal: [0, 1], compass: "NW", piles: [1, 4], pavilion: "Restaurant flamand" },
  { quadrant: 1, normal: [1, 0], compass: "SW", piles: [3, 4], pavilion: "Bar anglo-américain" },
  { quadrant: 2, normal: [0, -1], compass: "SE", piles: [2, 3], pavilion: "Restaurant français" },
  { quadrant: 3, normal: [-1, 0], compass: "NE", piles: [1, 2], pavilion: "Restaurant russe" },
];

/** Platform plans (Plate I, 1900): outside side and area. */
export const PLATFORMS = {
  first: { side: 70.695, area: 4200 },
  // Plate I's "37m63" has an ambiguous second digit [estimated]; 37.63^2
  // matches the printed 1400 m^2 where 31.63 would sit inside the iron.
  second: { side: 37.63, area: 1400 },
  third: { side: 18.65, area: 350 },
} as const;

/** Panel 29: a prismatic box under the 3rd floor. */
export const PANEL29 = { half: 5.0, bottom: 264.9, top: 276.13, baysPerFace: 4 } as const;

/**
 * One tier of a pedestal's profile, from `y0` up to `y1`: its outer faces'
 * and its inner faces' distances from the tower's axis, measured square to
 * a face, at its foot and at its head (equal where the tier stands upright).
 */
export interface PedestalTier {
  readonly y0: number;
  readonly y1: number;
  readonly outer: readonly [number, number];
  readonly inner: readonly [number, number];
}

/**
 * Masonry pedestals ("soubassements", decorative), one per leg: a hollow
 * skirt round the leg's foot, not a block (SOURCES.md §24). The leg's cast
 * shoes stand on the foundations INSIDE it, at the supports' 2.50; its top
 * is only where the uprights come out of the masonry [sourced drawing
 * PL-VII Fig. 1: the « Fermes du Soubassement » cut on either side of the
 * face plane, base tie A drawn between them, below the top]. Heights read
 * on each plate's own vertical dimensions, not its horizontal scale [§24:
 * PL-I 15.27 px/m on its « 39m40 », 15.08 on « 57,63 », against 16.14
 * across; PL-VII 89.05 px per vertical metre on the leg's node lines]:
 *
 * - the TOP, where the uprights emerge: 5.55 [measured: PL-I 5.45 / 5.53 at
 *   the two feet, PL-VII 5.65-5.74; the fin audit 5.4-5.8]. The 4.00 it
 *   replaces is WP-FR's figure, which no plate draws;
 * - a battered block to 2.00, its outer face falling 1.62 to the ground
 *   [measured: PL-I 1.96-2.01, the face 1.49-1.67 out over ≈1.75, about
 *   45°; PL-VII H1 2.07, 1.62 out], its inner face from the arch's pier's
 *   base, 38.17 at the ground [derived: 37.419 + 0.75, as before], to 39.05
 *   [measured PL-VII: 38.47 at 1.16, 39.07 at 2.34];
 * - a cornice to 2.72 [measured PL-I 2.72-2.73], its nose 60.96 out [PL-I
 *   1.49 inside the ground chain's 62.453; PL-VII's torus nose 1.48 inside
 *   the batter's foot: 60.97] and 38.90 in [PL-VII's torus, 38.88];
 * - then the « gorge », the cement cornice « traînée » on the fermettes'
 *   hoops that runs up « presque au contact des faces des arbalétriers »
 *   [sourced E1900-TXT p. 95]: a stretched cavetto, nearly level where it
 *   leaves the fillet and steepening to 45 degrees, a bead, then a nosing
 *   to the top [sourced drawing PL-V Figs 15-18; traced on Fig. 17, « Coupe
 *   IJ », 1:100, the set-back from the foot at heights over the plinth's
 *   foot: 1.98 at 3.33, 2.30 at 3.36, 2.64 at 3.44, 2.97 at 3.55, 3.31 at
 *   3.70, 3.65 at 3.90, 3.99 at 4.14, 4.33 at 4.44, 4.66 at 5.00, 4.83 at
 *   5.13, 5.00 at 5.32, « 2,088 + 2,965 » = 5.05 at the top, 5.40; the
 *   inner faces « 1,022 + 1,281 » = 2.30, Fig. 18; PL-VII draws the same
 *   concave sweep under a cyma, §24]. It replaces PL-I's five steps (§24),
 *   which are that plate's schematic of it. Its heights are PL-V's scaled
 *   to this plinth's 3.14-5.55 (×1.164), its set-backs PL-V's from 3.70
 *   up, run in from the fillet's 2.13 below that; the inner faces recede
 *   in proportion, 1.03 to 2.30 [derived]. The bead's 0.3 at 4.45-4.9 is
 *   left out, and the sweep carried smooth across it (4.60 at 4.82, 4.83
 *   at 5.18 in the model's heights) so it stays concave. At the top the plinth stops 0.16 outside the model upright's
 *   horizontal section.
 * - the INNER CORNER, the one nearest the tower's centre, follows an arc
 *   with a bench along it [sourced p. 95, on the page image: « l'angle le
 *   plus près du centre de la Tour est disposé suivant une courbe, le
 *   long de laquelle règne un banc »]: the bench's front, the « Banc »
 *   line, radius 3.29 and tangent to both inner faces' foot, concentric
 *   above as the faces recede, the « Seuil » 0.70 in front of it [measured
 *   PL-V Fig. 12 at 58.6 px/m, the arcs concentric to about 1 px; « 0.70 »,
 *   « 0.10 », « 0.48 », Fig. 19] (`corner`).
 *
 * Plate I's ground chain 25.334 + 74.238 + 25.334 puts the outer faces'
 * FOOT at 62.453 [derived]; its 74.238 ticks are the arch's own feet
 * (`ARCH`, 37.119), not the masonry, which stands back from the pier.
 */
export const PEDESTAL = {
  outer: 62.453,
  height: 5.55,
  innerFoot: 38.17,
  tiers: [
    { y0: 0, y1: 2.0, outer: [62.453, 60.83], inner: [38.17, 39.05] },
    { y0: 2.0, y1: 2.72, outer: [60.96, 60.96], inner: [38.9, 38.9] },
    { y0: 2.72, y1: 3.14, outer: [60.32, 60.32], inner: [39.2, 39.2] },
    // The gorge.
    { y0: 3.14, y1: 3.175, outer: [60.32, 60.015], inner: [39.2, 39.334] },
    { y0: 3.175, y1: 3.268, outer: [60.015, 59.708], inner: [39.334, 39.468] },
    { y0: 3.268, y1: 3.396, outer: [59.708, 59.422], inner: [39.468, 39.593] },
    { y0: 3.396, y1: 3.571, outer: [59.422, 59.143], inner: [39.593, 39.714] },
    { y0: 3.571, y1: 3.804, outer: [59.143, 58.803], inner: [39.714, 39.863] },
    { y0: 3.804, y1: 4.083, outer: [58.803, 58.463], inner: [39.863, 40.011] },
    { y0: 4.083, y1: 4.432, outer: [58.463, 58.123], inner: [40.011, 40.159] },
    { y0: 4.432, y1: 4.82, outer: [58.123, 57.853], inner: [40.159, 40.277] },
    { y0: 4.82, y1: 5.18, outer: [57.853, 57.623], inner: [40.277, 40.377] },
    { y0: 5.18, y1: 5.457, outer: [57.623, 57.453], inner: [40.377, 40.451] },
    { y0: 5.457, y1: 5.55, outer: [57.453, 57.403], inner: [40.451, 40.473] },
  ] as readonly PedestalTier[],
  /**
   * The curved inner corner: its centre on the diagonal, 3.29 in from both
   * inner faces' foot, so the arc's radius is 3.29 at the foot and the
   * centre's distance to the inner faces above; drawn in `segments` over
   * its quarter turn, and so is the bench round it [derived: the fewest
   * whose chords stand at most 3 mm (`chord.ts` `SAG.eye`, the visitor
   * sitting on it) off the widest arc drawn in them, the bench sill's
   * front at 3.29 + 0.70: 21, where 12 stood 8.5 mm off].
   */
  corner: {
    radius: 3.29,
    segments: Math.ceil(Math.PI / 2 / (2 * Math.acos(1 - 0.003 / (3.29 + 0.7)))),
  },
} as const;

/** The first-floor girders between the legs, in the tower's face plane. */
export const FIRST_FLOOR = {
  /**
   * "Grande poutre du 1er étage": a lattice girder panel 5 deep, spanning
   * the inner uprights of adjacent legs (top 32.6952, bottom 38.25 axis to
   * axis), bays 3.8825 with 3.595 end bays at the bottom chord.
   */
  mainBays: 10,
  /**
   * "Poutre de l'arc" (decorative), directly below: y 43.40 -> 50.40,
   * top 38.25, bottom 45.287 [sourced], same bay rhythm.
   */
  decorativeBottomY: 43.4,
  /**
   * The arcade between the decorative girder and the arch: round-headed
   * openings between the band's radial montants, SEVEN per half-face
   * (between montants 4|5 ... 10|11), the spandrels solid over the crown
   * (montants 1-4) [sourced PL-XI Fig. 1 and Nota; PL-VII Fig. 1]. Per
   * half: the other half mirrors it (SOURCES.md §14.1).
   */
  arcadeOpenings: 7,
  /** Radial montants per half-face, numbered 1-14 from the crown [sourced PL-XI Fig. 1]. */
  montants: 14,
} as const;

/**
 * The four decorative arches (non-structural), in the face plane
 * (SOURCES.md §14.1). The band runs between two CONCENTRIC circles: the
 * intrados, R 36.4064 with its crown 39.40 above the ground, and the
 * extrados, R 40.32373, both to the members' outer faces, so the band is
 * 3.9173 deep outer to outer ["3m,9173" printed at the crown, PL-VII
 * Fig. 1]. 2.5488 (printed twice along the intrados near the haunch) is
 * the radial montants' PITCH along the intrados, not the band's depth.
 * Below the band the intrados comes closest to arbalétrier b's axis where
 * it runs parallel to it, 1.00 off at y 20.20 [sourced "1.00", PL-XI
 * Fig. 10]; there it turns, tangent, onto R 44.5258 [sourced "R=44.5258"],
 * which is vertical at x 37.1188, y 3.90: the pedestal's inner face
 * [derived; PL-I 37.119].
 */
export const ARCH = {
  radius: 36.4064,
  crownY: 39.4,
  /** The band's depth, outer face to outer face in the plane [sourced]. */
  band: 3.9173,
  /** The extrados, concentric with the intrados [sourced]. */
  extradosRadius: 40.32373,
  /** The radial montants' pitch along the intrados [sourced "2,5488"]. */
  montantPitch: 2.5488,
  /** The intrados below its junction with b [sourced PL-XI Fig. 10]. */
  lowerRadius: 44.5258,
  /** Where the intrados changes to `lowerRadius`, tangent [derived]. */
  lowerFromY: 20.2,
  /** Where `lowerRadius` turns vertical, on the pedestal face [derived]. */
  footX: 37.1188,
} as const;

/**
 * Member sizes, as HALF-widths of a square section (Plate XXXI's section
 * tables). Uprights: below the 2nd floor the 0.877 plan square of
 * `UPRIGHT_BOX` (0.800-0.868 square to their axes), above it the 0.50 plan
 * square of `UPPER_BOX`, a closed box to XI and the open L and the T of
 * `UPPER_SECTIONS` above. Web bars are 0.80 m square
 * lattice struts in panels 1-9, 0.60 m in panel 10 and 0.50 m in panels
 * 12-28; horizontals 0.80 m below the 2nd floor and 0.60 m above.
 */
export const MEMBERS = {
  /**
   * The uprights' half-width by height, for anything that READS the size
   * at a height (joint clearances, platform fits): 0.41 below the 1st
   * floor, 0.435 to the 2nd, 0.25 above. The 2nd floor's change is a STEP
   * at node XVII [sourced PL-XXXI: sections XII-XVII are "500", sections
   * XVIII-XXIII "au-dessous du 2e Étage" about 0.87], so the value AT
   * 115.5 is the lower box's, the larger (a member at the node clears
   * both). The 1st floor's change is spread over panel 6, XXIII -> XXII
   * [estimated: the sections step from 822 to 866/854 at XXIII, and
   * PL-VII prints 822.8, 864.879 and 876.99 up panel 6].
   *
   * A SKIN cannot read this table across XVII: a swept chain has one ring
   * per node and interpolates between them, so a chain through XVII would
   * taper 0.87 -> 0.50 over panel 12 while its seam rivets, sampled every
   * pitch, stepped a centimetre above the node — the two disagreeing
   * about where the steel is. The uprights are therefore split at XVII
   * into two chains, and both are now built up plate by plate: the lower
   * from `UPRIGHT_SECTIONS`, the upper from `UPPER_SECTIONS`
   * (`builtup.ts`).
   *
   * ABOVE XVII 0.25 is the 500 square's plan half, `UPPER_BOX.planHalf`:
   * what the joint rule clears (nothing stands out of the upper webs; the
   * T's flange is 0.25 either side of its centre line above X, 0.50 over
   * panel 18, which `shaft.ts` reads as the merge) and what the plan
   * bracing's corner stops and panel 29's corners (`summit.ts`) read.
   *
   * BELOW XVII THIS IS NOT WHERE THE STEEL IS. The legs' lower uprights are
   * built as PL-XXXI builds them (`UPRIGHT_SECTIONS`, `builtup.ts`): a
   * 0.877 square IN PLAN, its faces in the tower's faces, which no square
   * half-width describes (0.41 is neither its plan half, 0.4385, nor its
   * half-side square to the axis, 0.400 in panels 1-4). The legs read the
   * section through builtup.ts; the lower rows here are kept for the
   * readers outside the legs that were measured against the old square
   * skin (`firstFloor.ts`'s b face, `platforms.ts`' pedestal and cross
   * girders), until each is re-measured.
   */
  upright: [
    [2.5, 0.41],
    [57.4, 0.41],
    [68.4, 0.435],
    [115.5, 0.435],
    [115.51, 0.25],
    [276.13, 0.25],
  ],
  /** The upright table from XVII up (the upper chains): 0.25 at XVII itself. */
  uprightAbove: [
    [115.5, 0.25],
    [276.13, 0.25],
  ],
  /**
   * Web struts: 800 in panels 1-9 [sourced PL-XXXI table; PL-IX Fig. 8],
   * 600 in panel 10 [sourced PL-VII Fig. 2 prints "600" on each of its
   * diagonals and on its post], 500 above XVII [sourced PL-XXXI]. The
   * steps sit where no member reads them: panel 9's diagonals end at XIX
   * (100.6), panel 10's begin above its base band, and panel 11 is a belt.
   */
  web: [
    [0, 0.4],
    [100.6, 0.4],
    [100.61, 0.3],
    [110.6, 0.3],
    [115.5, 0.25],
    [276.13, 0.25],
  ],
  /**
   * Horizontal struts: built of 80 x 80 angles [sourced], as heavy as the
   * web or heavier: 800 below the 2nd floor [sourced PL-IX Fig. 8 prints
   * "800" on the node and mid horizontals of panels 1-4; PL-VII Fig. 2
   * measures about 0.77 in panels 6-11] and 600 above it [sourced PL-VII
   * Fig. 3 prints "600" on the shaft horizontal at IX; panels 15-16 and
   * node X measure 0.58-0.60] — heavier than the 500 diagonals there.
   */
  horizontal: [
    [0, 0.4],
    [115.5, 0.4],
    [115.51, 0.3],
    [276.13, 0.3],
  ],
  /** Chords and lattice bars of the girder bands [estimated]. */
  girderChord: 0.25,
  girderBar: 0.12,
  /**
   * The base ties' lattice bars: single angles, "70 x 70 x 8" [sourced
   * PL-VII Figs 1, 5], drawn 0.095-0.115 wide at 1:200. A 0.10 m square
   * (half-width) [estimated]. Panels 5 and 11 take their own flats
   * (`LEG_BELTS.belt1Bar` ...), drawn wider.
   */
  beltBar: 0.05,
} as const;

/**
 * THE LOWER UPRIGHTS AS BUILT, supports to XVII: the arbalétriers' own
 * sections, read off PL-XXXI's tables and drawings with PL-IX's joint
 * details and Eiffel's text (SOURCES.md, "The built-up uprights"). What
 * `builtup.ts` draws, and every rule that needs to know where a lower
 * upright's steel is reads it through there.
 *
 * The box is a constant 0.877 m square IN PLAN, "mesurés extérieurement",
 * its faces in the tower's face planes; "la dimension extérieure du tronçon
 * restât constante", so a thicker plate grows INWARD [sourced text]. Square
 * to the leaning axis that square is a lozenge (101 38' / 78 22' in panels
 * 1-4, PL-IX fig. 28), and the web widths the plate prints are the
 * lozenge's sides: 877 times the sine of the angle between the axis and the
 * face's horizontal [derived, within 2 mm of every printed width from
 * XXVIII to XIX].
 */
export const UPRIGHT_BOX = {
  /** Half the plan square outside the webs [sourced text: "877 mm mesurés extérieurement"]. */
  planHalf: 0.4385,
  /** The angles, all 100 x 100 x 12 below XVII [sourced PL-XXXI]. */
  angle: { leg: 0.1, t: 0.012 },
  /**
   * Panels 1-5: the C.J. over a montant-EXTERIOR face's butt, 205 x 12, and
   * over an INTERIOR face's, 200 x 12 [sourced PL-XXXI, "2 C.J. 205 x 12,
   * 2 C.J. 200 x 12"; which is which from the drawing D28, PL-IX figs 21,
   * 23].
   */
  cjExterior: { width: 0.205, t: 0.012 },
  cjInterior: { width: 0.2, t: 0.012 },
  /** Panels 6-11: one C.J. on every face, 200 wide and as thick as the table gives [sourced PL-XXXI]. */
  cjUpperWidth: 0.2,
  /**
   * Panels 1-5, an interior face: two angles on the web, flat legs turned
   * out, their heels "385" apart, "207.5" in from each edge of the 800
   * [sourced PL-IX fig. 21, "coupe courante AB"]: a channel, where the
   * montant's lattice gussets seat.
   */
  channelHeels: 0.385,
  /**
   * A member's two montant-INTERIOR faces, those toward its neighbours in
   * the leg, as plan directions in the +x+z leg: c's toward b (-x) and d
   * (-z), and so round [sourced PL-XXXI's montant key M1/M2: interior faces
   * 3, 4 (c); 5, 8 (d); 9, 10 (a); 14, 15 (b)]. The other two are exterior.
   */
  interior: {
    a: [[1, 0], [0, 1]],
    b: [[1, 0], [0, -1]],
    c: [[-1, 0], [0, -1]],
    d: [[0, 1], [-1, 0]],
  } as Readonly<Record<"a" | "b" | "c" | "d", ReadonlyArray<readonly [number, number]>>>,
} as const;

/**
 * One arbalétrier's makeup at a section, as PL-XXXI prints it, in its own
 * units: plates as [count, width, thickness] mm (a web's width is the
 * lozenge's side, NORMAL to the axis), angles by count (all 100 x 100 x
 * 12), and the printed area in mm^2. `ext` and `int` say which thickness
 * goes on the montant-exterior and -interior faces; they differ only at
 * XVIII c ("2 x 854 x 15 + 2 x 854 x 8", the heavy plates on the two
 * exterior faces, D18).
 */
export interface UprightMakeup {
  readonly webs: ReadonlyArray<readonly [number, number, number]>;
  readonly cj: ReadonlyArray<readonly [number, number, number]>;
  readonly angles: number;
  readonly area: number;
  readonly ext: { readonly web: number; readonly cj: number };
  readonly int: { readonly web: number; readonly cj: number };
}

/** A section of all three arbalétriers (b and d are alike) and the printed leg total. */
export interface UprightSection {
  /** The node it is printed at; it governs the panel ABOVE that node [sourced text: "[panneau 5] ... celle portant le numéro XXIV"]. */
  readonly section: string;
  readonly a: UprightMakeup;
  readonly bd: UprightMakeup;
  readonly c: UprightMakeup;
  /** Omega, the four arbalétriers of ONE leg, mm^2 [sourced PL-XXXI's Nota]. */
  readonly omega: number;
}

/** Panels 1-5's makeup: four webs, 12 angles, the two pairs of C.J. 12 thick. */
const lowerMakeup = (w: number, t: number, area: number): UprightMakeup => ({
  webs: [[4, w, t]],
  cj: [
    [2, 205, 12],
    [2, 200, 12],
  ],
  angles: 12,
  area,
  ext: { web: t, cj: 12 },
  int: { web: t, cj: 12 },
});
/** Panels 6-11's: webs of one or two widths, four C.J. 200 as thick as them, the four corner angles. */
const upperMakeup = (webs: ReadonlyArray<readonly [number, number, number]>, area: number): UprightMakeup => {
  const t = webs[0]![2];
  return { webs, cj: [[4, 200, t]], angles: 4, area, ext: { web: t, cj: t }, int: { web: t, cj: t } };
};

/**
 * PL-XXXI's arbalétrier sections XXVIII-XVIII [sourced; read off the
 * e-rara scan crops U1-U4, T1-T5, D18, D28 and checked by rebuilding every
 * area from its parts: all 33 member areas and all 11 Omegas close exactly
 * except XX b, where the plate writes 2 x 866 x 11 = 19,054 for 19,052 and
 * prints 55,622, carried into its Omega]. Each governs the panel above its
 * node; the base stretch below XXVIII takes XXVIII's [derived].
 */
export const UPRIGHT_SECTIONS: readonly UprightSection[] = [
  {
    section: "XXVIII",
    a: lowerMakeup(800, 18.5, 95_992),
    bd: lowerMakeup(800, 17, 91_192),
    c: lowerMakeup(800, 16, 87_992),
    omega: 366_368,
  },
  {
    section: "XXVII",
    a: lowerMakeup(800, 16, 87_992),
    bd: lowerMakeup(800, 17, 91_192),
    c: lowerMakeup(800, 16, 87_992),
    omega: 358_368,
  },
  {
    section: "XXVI",
    a: lowerMakeup(800, 15, 84_792),
    bd: lowerMakeup(800, 16, 87_992),
    c: lowerMakeup(800, 16, 87_992),
    omega: 348_768,
  },
  {
    section: "XXV",
    a: lowerMakeup(800, 13.5, 79_992),
    bd: lowerMakeup(800, 15, 84_792),
    c: lowerMakeup(800, 15, 84_792),
    omega: 334_368,
  },
  {
    section: "XXIV",
    a: lowerMakeup(822, 14, 82_824),
    bd: lowerMakeup(822, 12.5, 77_892),
    c: lowerMakeup(822, 12.5, 77_892),
    omega: 316_500,
  },
  {
    section: "XXIII",
    a: upperMakeup([[4, 850, 10]], 51_024),
    bd: upperMakeup([[2, 852, 14], [2, 832, 14]], 67_376),
    c: upperMakeup([[4, 834, 14]], 66_928),
    omega: 252_704,
  },
  {
    section: "XXII",
    a: upperMakeup([[4, 860, 10]], 51_424),
    bd: upperMakeup([[2, 860, 14], [2, 843, 14]], 67_908),
    c: upperMakeup([[4, 845, 14]], 67_544),
    omega: 254_784,
  },
  {
    section: "XXI",
    a: upperMakeup([[4, 864, 10]], 51_584),
    bd: upperMakeup([[2, 864, 12], [2, 849, 12]], 59_736),
    c: upperMakeup([[4, 850, 12]], 59_424),
    omega: 230_480,
  },
  {
    section: "XX",
    // a "comme a section XIX".
    a: upperMakeup([[4, 866, 10]], 51_664),
    bd: upperMakeup([[2, 866, 11], [2, 852, 11]], 55_622),
    c: upperMakeup([[4, 854, 12]], 59_616),
    omega: 222_524,
  },
  {
    section: "XIX",
    a: upperMakeup([[4, 866, 10]], 51_664),
    bd: upperMakeup([[2, 866, 11], [2, 854, 11]], 55_664),
    c: upperMakeup([[4, 854, 13]], 63_832),
    omega: 226_824,
  },
  {
    section: "XVIII",
    a: upperMakeup([[4, 866, 8]], 43_136),
    bd: upperMakeup([[2, 854, 11], [2, 866, 11]], 55_664),
    c: {
      webs: [
        [2, 854, 15],
        [2, 854, 8],
      ],
      cj: [
        [2, 200, 12],
        [2, 200, 8],
      ],
      angles: 4,
      area: 56_308,
      ext: { web: 15, cj: 12 },
      int: { web: 8, cj: 8 },
    },
    omega: 210_772,
  },
];

/**
 * THE UPPER UPRIGHTS AS BUILT, XVII to the top of panel 28: PL-XXXI's upper
 * sections I-XVII (its "Partie supérieure"), read off the scan crops UP1-UP4
 * (e-rara 8976398) and checked by rebuilding every printed area from its
 * parts (tests/eiffelBuiltup.test.ts). Section k governs the panel above
 * node k, as below.
 *
 * Every face is "500" [sourced]. The model takes that square IN PLAN, as
 * the 877 below is, its faces in the tower's face planes, the plies growing
 * inward [derived: at XI the legs' b and d stand 0.50 apart axis to axis
 * (PL-VII Fig. 3 "250 250", the node table's 0.25), and panel 18's merged T
 * is "500 x 500" = 1,000 wide on the face: two 500 boxes touching in the
 * face's centre plane. Square to the axis a face is then 495.7-500 wide,
 * the lean being at most 0.08 up here].
 *
 * What the drawings put where, in plan with the tower's exterior at the
 * bottom and left [sourced UP3, UP4]:
 *   - c, a closed box (panels 12-18): the heavy plies on its two
 *     tower-exterior faces, 8 on the two inside, a 90 x 90 x 9 angle in the
 *     corner where the two 8's meet, three 100 x 100 x 12 in the others;
 *   - b or d, a closed box (panels 12-17): the heavy plies on the face in
 *     the tower's face AND on the face toward the face's centre line (away
 *     from c; b's toward d of the next leg), 8 on the other two, the 90 x 90
 *     where the 8's meet. So at XI the two facing heavy faces become the
 *     merged T's stem, and the two faces in the tower face its flange;
 *   - bd, panel 18: the T, "4 Ames 4 x 500 x 10": two flange plates side by
 *     side in the face, 1,000 wide, the stem two plies of 10; six angles
 *     100 x 100 x 12 (the flange's two tips turned inward, the stem's root
 *     either side, its tip back to back and turned out);
 *   - c, panels 19-28: an open L, only the two heavy exterior plates, the
 *     heel angle inside the corner and one at each free edge, turned
 *     inward ("l'arêtier c prend la forme d'un angle droit" [sourced text]),
 *     "complété et fermé sur ses quatre faces" over the height of each
 *     bracing attachment [sourced text]: closed by 8 mm plates there;
 *   - bd, panels 19-28: a T, flange 500 x 10 on the face, stem 500 x 8
 *     inward, six angles 100 x 100 x 10 placed as panel 18's; the bracing's
 *     gussets "sur la branche intérieure du simple T" [sourced text].
 * The ply splits (12 + 12 + 12 + 13 ...) are read off small labels, in
 * their drawn order [?]; the totals are printed (XII-XIII's c labels add
 * to 48 against the table's 49: the table is kept).
 */
export const UPPER_BOX = {
  /** Half the 500 plan square [sourced "500"; in plan, derived: the XI merge]. */
  planHalf: 0.25,
  /** The closed boxes', the L's and panel 18's T's angles, 100 x 100 x 12 [sourced]. */
  angle: { leg: 0.1, t: 0.012 },
  /** The T's angles above XI, 100 x 100 x 10 [sourced]. */
  angleT: { leg: 0.1, t: 0.01 },
  /** The 8 mm inside faces, and the L's closing plates [sourced: the boxes' "2 Ames 2 x 500 x 8"]. */
  light: 0.008,
  /**
   * How far either side of a node the L stands closed: over its
   * attachments, which the face lattice's joint plates span (-0.99 to
   * +1.04 about every node from X up, within 0.35 of the box) [measured on
   * the cooked shaft; the text gives no figure].
   */
  closure: 1.05,
} as const;

/**
 * THE SPLICES: where an arbalétrier's tronçons butt, and the cover plates
 * (couvre-joints) and rivets over each joint (`builtup.ts`, SOURCES.md
 * §27.2). Lengths along the axis, in m; widths across the face.
 *
 * WHERE. "La longueur d'arbalétrier comprise entre les axes des
 * entretoises est en nombre rond de 13,50 m et a été divisée en trois
 * parties de 4,50 m ... il existe trois joints dans chaque panneau ; celui
 * du milieu correspond à l'entretoise intermédiaire ... les deux autres
 * sont à des distances égales de l'entretoise principale" [sourced text
 * p. 75]: joints at L/6, L/2 and 5L/6 of a panel, a node in the middle of
 * its tronçon. The rule is kept for every lower panel (a panel of length L
 * takes round(L / 4.5) joints at (i + 1/2) L / n) [sourced for panels 1-4;
 * derived for the base stretch and panels 6-11, "analogues à ceux du
 * premier étage", p. 77, whose joint places the text does not give]. Panel
 * 5 bends "dans le joint qui existe en ce point" at XXIV [sourced text
 * p. 76], and PL-X fig. 19 dimensions its next joint "4.01335" up of
 * "8.0267 entre les deux coudes": a joint at XXIV and one at mid-panel
 * [sourced PL-X fig. 19]; PL-X figs. 15 and 18 section the upper bend,
 * XXIII, through its covers ("C.J. Sem. 200 x 12", "C.J. d'âme 12 m/m",
 * "Corn. C.j. 80 x 80 x 15"): a joint there too [sourced]. The other bends
 * (XXII-XVIII, and above XVII) fall inside a tronçon here: the text does
 * not place a joint at them [?]. Above XVII: "Les joints sont distants de
 * 5 à 7 mètres" [sourced text p. 77]: round(L / 6) a panel, placed as
 * below [the 6 estimated, the middle of the printed range].
 *
 * WHAT. "Toutes les pièces qui constituent le tronçon viennent s'arrêter
 * dans un même plan normal à l'axe" [sourced text p. 75]: every ply of a
 * tronçon ends in ONE plane, so no ply is staggered past another; what is
 * staggered is the covers, of three lengths, whose ends step along the
 * face (PL-IX figs. 21-24). Outside the box, as PL-IX draws them:
 *   - a montant-EXTERIOR face (figs. 23-24): a web cover "290 x 15" (fig.
 *     24: "295 x 15") either side of the fin, "0.94" long; over the fin, an
 *     angle "80 x 80 x 15" either side in the fin's angles, "1.34" long;
 *   - a montant-INTERIOR face (figs. 21-22): "C.j. 380 x 12" over the C.J.
 *     between the channel's legs, on 12 mm fillers ("Fourr. ép. 12") beside
 *     it, "0.54 + 0.54" = 1.08 long; an angle "85 x 85 x 15" in each
 *     channel angle, "1.34"; a flat "85 x 12" over each corner angle's row,
 *     "1.02" (fig. 22 prints both lengths, 1.08 on the centre cover's
 *     extension lines, 1.02 on the strip's; the strips are drawn about 4 cm
 *     off the joint's centre, here centred on it [simplified]).
 * Inside the box the "590 x 15", "70 x 13" and the corner angles' own
 * covers are not drawn (nothing inside is), nor fig. 21's "100 x 12",
 * whose seat this reading cannot place [?]. Figs. 25-26 draw faces 3, 8,
 * 9 and 15, the manhole faces, with a longer cover round the "345 x 520"
 * hole: drawn here as fig. 21's, since no box is cut [simplified].
 * Panels 6-11 (PL-X figs. 15, 18): a 12 mm web cover each side of the C.J.
 * and a "200 x 12" over it [sourced]; their lengths are panels 1-4's
 * [estimated]. Above XVII, a 12 mm cover over each outer plate, 0.94 long
 * [estimated: no figure of the upper joints is read].
 * AT A BEND the covers run further down than up: at XXIV PL-X fig. 19
 * dimensions "380" and "510" into panel 5 and "765" and "965" into panel 4
 * (which cover each belongs to read off the drawing [estimated]); XXIII is
 * taken as its mirror, the short side in panel 5 [estimated].
 */
export const SPLICE = {
  /** A lower tronçon, "4,50 m en nombre rond" [sourced text p. 75]. */
  troncon: 4.5,
  /** An upper one, "5 à 7 mètres" [sourced text p. 77; 6 estimated]. */
  tronconUpper: 6.0,
  /** The nodes where a lower column bends IN a joint [sourced PL-X figs. 15, 18, 19]. */
  bentJoints: ["XXIV", "XXIII"],
  /** Montant-exterior faces, panels 1-5 [sourced PL-IX figs. 23-24]. */
  exterior: {
    web: { width: 0.29, t: 0.015, length: 0.94 },
    angle: { leg: 0.08, t: 0.015, length: 1.34 },
  },
  /** Montant-interior faces, panels 1-5 [sourced PL-IX figs. 21-22]. */
  interior: {
    centre: { width: 0.38, t: 0.012, length: 1.08 },
    filler: 0.012,
    angle: { leg: 0.085, t: 0.015, length: 1.34 },
    corner: { width: 0.085, t: 0.012, length: 1.02 },
  },
  /** Panels 6-11 [sourced PL-X figs. 15, 18 for the sizes; lengths estimated as panels 1-4's]. */
  plain: {
    web: { t: 0.012, length: 0.94 },
    strip: { width: 0.2, t: 0.012, length: 1.34 },
  },
  /** Above XVII: one 12 mm cover over each outer plate [estimated]. */
  upper: { t: 0.012, length: 0.94 },
  /**
   * How far a web cover stops short of its web's edge: fig. 23's 290 on
   * the 297.5 of web a 205 C.J. leaves each side [derived].
   */
  edge: 0.0075,
  /** At a bent joint, a web-class and an angle-class cover's run [long side, short side] [PL-X fig. 19; estimated which is which]. */
  bent: { web: [0.765, 0.38], angle: [0.965, 0.51] },
  /**
   * The rivet field on a web cover (fig. 23): the corner angle's row runs
   * on over the cover at its own pitch; inward of it, columns 0.067 apart
   * staggered a half pitch, every 0.076, the first and last heads 0.035
   * off the joint and the cover's ends [measured on PL-IX fig. 23 at its
   * scale, 290 px/m, twice: 66-67, 74-78 and 33-41 mm].
   */
  field: { across: 0.067, pitch: 0.076, end: 0.035 },
  /**
   * The interior cover's field (fig. 21): two columns 0.055 either side of
   * the face's centre line, two more at 0.158, in step, a rectangular grid,
   * every 0.064 [measured on PL-IX fig. 21 at 291 px/m, twice: 0.055-0.058,
   * 0.155-0.158, 0.060-0.066].
   */
  interiorField: { inner: 0.055, outer: 0.158, pitch: 0.064 },
} as const;

/** One upper arbalétrier's makeup: its shape, plates (mm) and angles, and the printed area (mm^2). */
export interface UpperMakeup {
  /** A closed box, the open L (c above XI) or the T (bd from XI up). */
  readonly shape: "box" | "L" | "T";
  /** The heavy plates: a box's or L's heavy faces, a T's flange. */
  readonly heavy: number;
  /** Its plies as the drawing labels them [?]. */
  readonly plies: readonly number[];
  /** A box's two light faces (8); a T's stem, all plies. */
  readonly light: number;
  /** A T's flange, across the face (mm). */
  readonly flange?: number;
  /** Angles as [count, leg, thickness] mm. */
  readonly angles: ReadonlyArray<readonly [number, number, number]>;
  readonly area: number;
}

/** An upper section: c, and b or d (b and d apart below XI, merged bd from XI up), and Omega, the whole tower's. */
export interface UpperSection {
  readonly section: string;
  readonly c: UpperMakeup;
  readonly bd: UpperMakeup;
  /** Omega: the tower's twelve (XII-XVII: 4 c + 8 b|d) or eight (4 c + 4 bd) arbalétriers, mm^2 [sourced]. */
  readonly omega: number;
}

const ANGLES_BOX: ReadonlyArray<readonly [number, number, number]> = [
  [3, 100, 12],
  [1, 90, 9],
];
const upperBox = (heavy: number, plies: readonly number[], area: number): UpperMakeup => ({
  shape: "box",
  heavy,
  plies,
  light: 8,
  angles: ANGLES_BOX,
  area,
});
const upperL = (heavy: number, plies: readonly number[], area: number): UpperMakeup => ({
  shape: "L",
  heavy,
  plies,
  light: 0,
  angles: [[3, 100, 12]],
  area,
});
const T500: UpperMakeup = { shape: "T", heavy: 10, plies: [10], light: 8, flange: 500, angles: [[6, 100, 10]], area: 20_400 };

/**
 * PL-XXXI's upper sections, XVII down to I (the table is printed I-XVII)
 * [sourced UP1-UP4; every c, b|d and Omega rebuilds from its parts].
 */
export const UPPER_SECTIONS: readonly UpperSection[] = [
  ...(["XVII", "XVI", "XV"] as const).map((section) => ({
    section,
    c: upperBox(49, [12, 12, 12, 13], 65_307),
    bd: upperBox(25, [12, 13], 41_307),
    omega: 591_684,
  })),
  { section: "XIV", c: upperBox(49, [12, 12, 12, 13], 65_307), bd: upperBox(20, [10, 10], 36_307), omega: 551_684 },
  ...(["XIII", "XII"] as const).map((section) => ({
    section,
    c: upperBox(49, [12, 12, 12, 13], 65_307),
    bd: upperBox(10, [10], 26_307),
    omega: 471_684,
  })),
  {
    section: "XI",
    c: upperBox(51, [12, 13, 13, 13], 67_307),
    bd: { shape: "T", heavy: 10, plies: [10], light: 20, flange: 1000, angles: [[6, 100, 12]], area: 33_536 },
    omega: 403_372,
  },
  { section: "X", c: upperL(51, [12, 13, 13, 13], 57_768), bd: T500, omega: 312_672 },
  ...(["IX", "VIII"] as const).map((section) => ({ section, c: upperL(48, [11, 12, 12, 13], 54_768), bd: T500, omega: 300_672 })),
  ...(["VII", "VI", "V", "IV", "III", "II"] as const).map((section) => ({
    section,
    c: upperL(32, [7, 12, 13], 38_768),
    bd: T500,
    omega: 236_672,
  })),
  { section: "I", c: upperL(25, [12, 13], 31_768), bd: T500, omega: 208_672 },
];

/**
 * The legs' lattice belts and bands (PL-VII). Depths are printed IN THE
 * FACE PLANE (the plate is a rabattement), so a vertical depth is the
 * printed one over sqrt(1 + s^2), s the face's slope there.
 */
export const LEG_BELTS = {
  /**
   * Base tie A, on each leg's two outer faces: its bottom chord's axis
   * "2,987" in the plane below node XXVIII [sourced PL-VII Fig. 1: the
   * dimension's upper arrow sits ON the XXVIII dash-dot line, 16 px under
   * the top chord's top edge at 1:200], so y 3.73. "3,387" is the same
   * chord measured from the top chord's top edge, 0.40 above XXVIII
   * [derived]. (The earlier 3.187 took the two numbers for the two chords'
   * faces, and hung the bottom chord 0.18 m low.)
   */
  tieOuterDepth: 2.987,
  /**
   * Base tie B, on the two inner faces: "2.000" from the same top edge to
   * the bottom chord, whose axis is "2,765" over the support line
   * [sourced PL-VII Fig. 5], so y 4.97 and 1.600 in the plane below XXVIII
   * [derived: 2.000 - 0.40]. (2.000 below XXVIII hung it 0.36 m low.)
   */
  tieInnerDepth: 1.6,
  /**
   * The ties are X-braced [sourced PL-VII Figs 1, 5, "70 x 70 x 8"]: the
   * joints of both chords fall on one pitch measured from the face's
   * centre line (the central post) at each chord's height, and every bay
   * between two joints (and the short end bays against the uprights)
   * carries an X. The face is a parallelogram (the leg leans in it), so
   * the X's read skewed on the plate, one bar about 62 degrees off the
   * chord and its partner about 36. Pitch 240 px at 78.7 px/m in A, 3.05,
   * and 164-171 px at 83 px/m in B, 2.0 [estimated, measured on PL-VII].
   */
  tieOuterPitch: 3.05,
  tieInnerPitch: 2.0,
  /**
   * Tie A's joints do not fall on the face's centre line, where the "877"
   * central post runs: they flank it, 0.55 either side, then every 3.05
   * (top joints at 0.55, 3.6 and 6.6 from the centre line at 79.7 px/m),
   * and the bay across the post carries no X; nor does A have a bar up any
   * joint (a line profile finds none on those lines) [measured, PL-VII
   * Fig. 1].
   */
  tieOuterPhase: 0.55,
  /**
   * The ties' chords are plain plates, "200 x 8" (A) and "200 x 9" (B) with
   * an 80 x 80 x 10 angle, drawn 0.22 deep [sourced PL-VII Figs 1, 5;
   * measured 17-18 px at 78-80 px/m], not the 0.80 laced horizontal: there
   * is none at XXVIII on any face of the leg. The top chord lies wholly
   * above XXVIII, its top edge the "3,387" / "2.000" datum 0.40 above it in
   * the plane (drawn +0.21 to +0.41), so its axis 0.29 above [derived:
   * 0.40 - 0.22 / 2]. The plates' thickness out of the face, the angle's
   * leg [estimated].
   */
  tieChord: 0.22,
  tieChordThickness: 0.08,
  tieTopChordAxis: 0.29,
  /**
   * Panel 5: chords "500 x 10" plates, solid on the plate, their outer
   * edges on XXIV and XXIII [sourced PL-VII Fig. 1]; posts square to the
   * chords on the grande poutre's 3.8825 grid from the tower's axis, four
   * a face with end bays about 1.7 (drawn 324 px apart at 83 px/m, 3.90)
   * [sourced 3.8825; the positions read off the drawing]; and a double
   * lattice of 80 x 80 x 8 angles, each bar from a post's foot through the
   * next post's mid-height to the top of the one after, its working line
   * node line to node line: atan(7.5309 / (2 x 3.8825)) = 44.1 degrees
   * (drawn 44.0 ± 1) [the pattern read off the drawing].
   */
  belt1PostPitch: 3.8825,
  belt1Chord: 0.5,
  belt1ChordThickness: 0.01,
  /**
   * Panel 5's bars and posts, "80 x 80 x 8" angles, drawn 0.15 and 0.14
   * wide in the face (three lines 12.0 and 11.5 px apart at 83 px/m), and
   * a gusset plate at each post's mid-height, 0.62-0.70 wide by 0.86-0.90
   * tall ("Ep. 10") [measured, PL-VII Fig. 1]. The bars and posts are
   * flats that wide, an angle's leg thick [estimated].
   */
  belt1Bar: 0.15,
  belt1Post: 0.14,
  belt1Gusset: [0.66, 0.88],
  /**
   * Panel 11: chords "450 x 8" plates, printed on both, drawn 0.45-0.49
   * and solid, their outer edges on XVIII and XVII [sourced PL-VII Fig. 2];
   * posts square to the chords every "3,36268" from the tower's axis
   * (printed twice), three a leg face at 2, 3 and 4 pitches; and a double
   * lattice of 80 x 80 angles every half pitch, each bar spanning one
   * pitch over the depth between the chords: bars from a post's foot to
   * the next post's top (an X in every bay) and from mid-bay to mid-bay
   * through the posts' mid-heights (the diamond) [the pattern read off the
   * drawing]. The working lines run node line to node line: "55°49'49""
   * printed near b is exactly atan(4.95368 / 3.36268) [sourced; the
   * "53°49'4x"" in bay 1 reads as the same angle misdrawn].
   */
  belt2PostPitch: 3.36268,
  belt2Chord: 0.45,
  belt2ChordThickness: 0.008,
  /**
   * Panel 11's bars, "C: 80 x 80 x 8/10", drawn 0.13-0.14; its posts, "C:
   * 70 x 70 x 8", drawn 0.155; a gusset at each post's mid-height, 0.64-0.72
   * by 0.97-1.06 [measured, PL-VII Fig. 2 at 79.8 px/m].
   */
  belt2Bar: 0.135,
  belt2Post: 0.155,
  belt2Gusset: [0.68, 1.01],
  /** The belts' bars and posts out of the face: an 80 mm angle's leg [estimated]. */
  beltFlatThickness: 0.08,
  /** Their gussets' thickness, "Ep. 10" [sourced PL-VII Fig. 1]. */
  beltGussetThickness: 0.01,
  /**
   * Panel 10's base band: "3,6071" deep [sourced PL-VII Fig. 2], a double
   * lattice of "300 x 5" flats between its chords, each family every 1.59
   * along the chords (a row autocorrelates at 127 px at 79.7 px/m), V's at
   * both chords, so each flat spans two pitches over the depth, about 43
   * degrees [estimated]; the 30 x 30 x 4 angles between them are not
   * built. A 600 top chord ("600" printed on it) [sourced]. Above it,
   * "6,564325": two X's per leg face either side of a central post, all
   * 600 [sourced].
   */
  band10Depth: 3.6071,
  band10TopChord: 0.3,
  band10Pitch: 1.59,
  band10Flat: 0.3,
  band10FlatThickness: 0.005,
} as const;

/**
 * The legs' 500 diagonals in panels 12-17 are laced more openly than the
 * shaft's 500s (0.68): the step read on PL-VII, both diagonals of the
 * outer face averaged, at 78.2-78.4 px/m [estimated, measured]: panel 12
 * 0.69 (Fig. 2: 51-56 px), 13 1.01 (72-84 px), 14 0.98 (75-80), 15 0.82
 * (Fig. 3: 63-66), 16 0.96 (72-76), 17 0.91 (66-77; the two diagonals are
 * drawn 0.85 and 0.98). By panel, as (panel's bottom node, top node, step).
 */
export const LEG_LACING_500: ReadonlyArray<readonly [string, string, number]> = [
  ["XVII", "XVI", 0.69],
  ["XVI", "XV", 1.01],
  ["XV", "XIV", 0.98],
  ["XIV", "XIII", 0.82],
  ["XIII", "XII", 0.96],
  ["XII", "XI", 0.91],
];

/**
 * The gap X's between adjacent legs, panels 12-16, laced as openly as the
 * legs' own 500s, not at the shaft's 0.68: the X-centre spacing along each
 * arm on PL-VII (Fig. 2 at 78.25 px/m, Fig. 3 at 78.29; both arms, each
 * side of the crossing plate, by template and by autocorrelation) is
 * panel 12 0.70 / 0.76, 13 0.92 / 1.11, 14 1.00 / 1.13, 15 0.98 / 0.98
 * [estimated, measured]; the arms' means. Panel 16's arms show at most two
 * laced bays between their gussets and the central plate, too few to read:
 * panel 15's step [estimated]. By panel, as (bottom node, top node, step).
 */
export const LEG_GAP_LACING_500: ReadonlyArray<readonly [string, string, number]> = [
  ["XVII", "XVI", 0.73],
  ["XVI", "XV", 1.01],
  ["XV", "XIV", 1.06],
  ["XIV", "XIII", 0.98],
  ["XIII", "XII", 0.98],
];

/**
 * The plan bracing ("contreventements", PL-VIII Figs 13-22 at 1:1000, their
 * elevations Figs 16, 17 and 24 at 1:200): a horizontal truss of lattice
 * girders at every node from XVI up but IX, joining the columns: c at the
 * corners, the face-centre b and d of adjacent legs up to XII, the merged
 * bd above. Every figure draws the whole tower's square, and in every one
 * girder A runs CORNER TO CORNER, c to c along one tower diagonal, drawn
 * thin but "1.000" deep between its outer chords where every other girder
 * is "594.6"-"599.3" [sourced Figs 16, 17, 24; measured 79 px against 46
 * at 78.9 px/m]. The members on the OTHER diagonal leave one half of it
 * open at every node, the half the Edoux car runs through:
 * - XVI-XII (Figs 13-15; the Nota: XII is like XIII): four long girders,
 *   each from b (or d) on one face across to d (or b) on the next, on the
 *   lines x +- z = +-(W - w), their crossings a diamond just inside the face
 *   centres; four short ones across each leg's corner, its own b to its own
 *   d (x +- z = +-(W + w)); H' from the middle of one long girder to A's
 *   centre; on the opposite long girder H, a stub toward the centre,
 *   tinted as H' is, ending at the Edoux's guides, and the K bracket, two
 *   struts parallel to the faces from H's end back to the girder (the
 *   dashed curve beside H is its letter's leader; `shaft.ts`); and,
 *   between each corner girder and its parallel long girder, the
 *   "contreventements des poutres en haut et en bas": a grid of light
 *   angles parallel to the tower's faces in the planes of the chords
 *   (Fig. 13 a sparse net, Fig. 14 a grid, Fig. 15 dense) [sourced].
 * - XI and X (Fig. 18): the lozenge on the four bd's; H' from one corner c
 *   to A's centre; H from the opposite c through the lozenge's side to the
 *   K bracket just inside it [sourced].
 * - VIII-VI (Figs 19, 20): the lozenge; E from c to its side and F on to
 *   the centre; H from the opposite c to the opposite side [sourced].
 * - V-II (Fig. 21): the lozenge; E from c to the centre; H as above.
 * - I and top28 (Fig. 22): no lozenge; E from c to the centre; at the
 *   opposite corner a frame of two G members, one off each face, and H
 *   from c to the frame's corner [sourced].
 * - IX: none; Fig. 17 draws the "Plancher intermédiaire (229.43)" there,
 *   on its struts [sourced].
 * The plates' open half is NE (toward c_TR) up to X and SW above it: the
 * Edoux's lower car runs 2nd floor -> landing on one side of the axis, its
 * upper car landing -> 3rd floor on the other. The model reads A along
 * x = z and the plates' NE half as s > 0 (toward pile 3, Sud, where
 * `lifts.ts` runs the lower car): plate (X, Y) -> model (x, -z) [derived].
 * So from VIII up the open half is the upper car's, s < 0. Whatever still
 * meets a post, a cylinder or a car's run is cut at it (`EDOUX_PLAN`): A
 * frames into the central guide post from both sides, and H', F and E end
 * on it. Girders B-H: "une corn. haut et bas et un treillis /\ avec
 * cornières"; A: "Corn. et Semelle" top and bottom and an X lattice
 * [sourced, Fig. 13's details].
 */
export const PLAN_BRACING = {
  from: "XVI",
  /** Girders B-K, chord axis to chord axis: "594.6"-"599.3" printed, drawn 0.58 [sourced PL-VIII Figs 16, 17, 24]. */
  depth: 0.6,
  /** Girder A, chord axis to chord axis: "1.000" printed, drawn 1.00 [sourced PL-VIII Figs 16, 17, 24]. */
  depthA: 1.0,
  /** The chords' and the web's half-widths: angles [estimated]. */
  chord: 0.045,
  web: 0.03,
  /** The bands' angles ("une âme et une cornière", Figs 13-14; "simples cornières", Fig. 15), half-width [estimated]. */
  band: 0.035,
  /** Nodes with no plan bracing: IX, the plancher intermédiaire [sourced PL-VIII Fig. 17]. */
  skip: ["IX"],
  /** The pattern by node [sourced PL-VIII Figs 13-22 and their captions]. */
  hash: ["XVI", "XV", "XIV", "XIII", "XII"],
  lozengeH: ["XI", "X"],
  lozengeEF: ["VIII", "VII", "VI"],
  lozengeE: ["V", "IV", "III", "II"],
  corner: ["I", "top28"],
  /**
   * The K bracket's apex, in along the diagonal from the girder it hangs
   * on: 1.7-2.2 in Figs 13-15 and 1.3 in Fig. 18 [measured at 16.4-16.7
   * and 15.7 px/m].
   */
  kReach: 1.9,
  kReachLozenge: 1.3,
  /** The G frame's members, each off its face at the corner [measured Fig. 22: 31-32 px at 16.5 px/m]. */
  gFrame: 1.9,
  /**
   * The bands' grid, in cells across the band: about 1.6 in Fig. 14 (3.63
   * wide, lines 2.3 apart) and 1.55 in Fig. 15 (2.33 wide, 1.5 apart), so a
   * pitch of the band's width over 1.55, rounded to whole cells along the
   * corner girder [measured].
   */
  bandCells: 1.55,
} as const;

/**
 * The "entretoise diagonale" inside each leg (PL-VIII Fig. 1, "Plan de
 * l'entretoise diagonale des panneaux 1, 2, 3"): a lattice girder in plan
 * from d to b, "21.2132" long (15.000 x sqrt 2), printed "600" and "600"
 * either side of a central spine, so 1.20 wide (drawn 1.24), and "715.6"
 * deep in elevation (drawn 0.68-0.70 between the chords' lines) [sourced
 * PL-VIII Figs 1, 8]. PL-VIII Fig. 8 draws it at the tops of panels 1, 2
 * and 3 (XXVII, XXVI, XXV) and again at XXII and XXI ("14.100", "13.150":
 * the leg's width there) [sourced]. Its section is an open N, a web and
 * two inclined wings; the model takes the N's bounding box, 1.20 x 0.7156,
 * laced on its four faces [the form estimated].
 */
export const ENTRETOISE = {
  nodes: ["XXVII", "XXVI", "XXV", "XXII", "XXI"],
  /** "600" + "600" [sourced PL-VIII Fig. 1]. */
  width: 1.2,
  /** "715.6" [sourced PL-VIII Fig. 8]. */
  depth: 0.7156,
  /**
   * The lacing's step, X-centre to X-centre along the girder as for every
   * strut: Fig. 8 draws the crossings every 0.556 and a vertical at every
   * other one (1.112; 88.5 px at 79.6 px/m, and 124 px on a x1.4 crop),
   * but it is a face-plane view that foreshortens the diagonal girder by
   * cos 45 degrees (its own "15.000 (suivant la diagonale 21.2132)"), so
   * along the girder 0.79 and 1.57. Fig. 1's plan, at true length, has its
   * transverse struts every 1.54 (49-50.5 px at 31.9 px/m), an X in each
   * half between them [measured].
   */
  step: 0.79,
  /**
   * Where something of lifts.ts passes through its line, the entretoise
   * stops either side of it, ±1.75 about the leg's diagonal, each half
   * ending free [derived from lifts.ts; PL-VIII Figs 1 and 8 draw it whole,
   * and PL-XX, the section along the diagonal, projects it onto b and d and
   * cannot show an opening]. Only the Otis car reaches it: slid along its
   * whole run it clips the 1.20 girder at XXVII-XXV (its upper deck's
   * outer top corner, 0.02 into it) and at XXI (0.15, where its track bends
   * above the 1st floor), ±1.58 across the diagonal. In the Roux legs the
   * girder is whole: their car clears it by 1.11 at least, their tracks by
   * 4.2, and their ground stair by 2.97 (its flights cross the girder's
   * line in plan 3.3 above it). Nothing reaches it at XXII. So `openAt`
   * holds in the Otis legs (piles 3 and 1) only.
   */
  openAt: ["XXVII", "XXVI", "XXV", "XXI"],
  openHalf: 1.75,
} as const;

/**
 * What the plan bracing must leave room for in the shaft: the Edoux lift
 * (its numbers are `lifts.ts`'s, which owns them; sourced there from
 * PL-XX and PL-XXIII ter), as rectangles in the shaft frame: s along the
 * N-S diagonal toward pile 3 (Sud), (x - z) / sqrt 2; t across it toward
 * pile 4 (Ouest), (x + z) / sqrt 2; with the heights each stands over. A
 * plan girder stops at each one it would cross: at a post or a column it
 * frames into it, at a car's run it ends free beside it.
 */
export const EDOUX_PLAN: ReadonlyArray<{
  readonly what: string;
  readonly s: readonly [number, number];
  readonly t: readonly [number, number];
  readonly y: readonly [number, number];
}> = [
  // The central guide post "890 x 600", 2nd floor to 3rd.
  { what: "central post", s: [-0.445, 0.445], t: [-0.3, 0.3], y: [115.73, 276.13] },
  // The outboard guide posts "500 x 600", 5.15 out.
  { what: "outboard post N", s: [-5.4, -4.9], t: [-0.3, 0.3], y: [115.73, 276.13] },
  { what: "outboard post S", s: [4.9, 5.4], t: [-0.3, 0.3], y: [115.73, 276.13] },
  // NORD: the upper car's cylinders to the landing, its piston columns above.
  { what: "cylinder N1", s: [-4.882, -4.482], t: [-0.2, 0.2], y: [115.73, 276.13] },
  { what: "cylinder N2", s: [-0.818, -0.418], t: [-0.2, 0.2], y: [115.73, 276.13] },
  // SUD: the lower car's guide columns, 2nd floor to the landing.
  { what: "guide S1", s: [0.448, 0.788], t: [-0.17, 0.17], y: [115.73, 195.93] },
  { what: "guide S2", s: [4.512, 4.852], t: [-0.17, 0.17], y: [115.73, 195.93] },
  // The cars' runs, 3.57 along the diagonal on axes 2.65 out, 3.90 across.
  { what: "upper car run", s: [-4.435, -0.865], t: [-1.95, 1.95], y: [195.93, 276.13] },
  { what: "lower car run", s: [0.865, 4.435], t: [-1.95, 1.95], y: [115.73, 198.83] },
];

/**
 * "Masque placé sur le panneau 4" (PL-VII Fig. 6): a decorative lattice
 * screen over the whole of panel 4 of a leg face, 15.000 wide and 12.311
 * tall in the plane [sourced], standing in front of the panel's own web.
 * It carries the decorative girder's band across the legs, so its posts
 * keep that girder's rhythm, 3.8825 from the tower's axis [derived: the
 * drawn posts fall 3.86 apart, the one nearest c cut short by the leaning
 * upright]. Distances are in the face plane, from panel 4's foot.
 */
export const MASQUE = {
  /**
   * The bottom chord's lower edge above the panel's foot: clear of the
   * node horizontal there, 24 px over the node line at 50.8 px/m, and an
   * independent reading 0.43-0.47 [estimated].
   */
  lowLift: 0.45,
  /** The bottom chord, "630 × 4" [sourced]. */
  lowChord: 0.63,
  /** The middle chord, "750 × 4" [sourced]. */
  midChord: 0.75,
  /** Clear between the two chords, "2,746" [sourced; drawn 2.68]. */
  lowClear: 2.746,
  /** The top band, its top edge on node XXIV, drawn 0.52-0.59 deep [estimated]. */
  topBand: 0.55,
  /** The plates' thickness, "× 4" [sourced]. */
  plate: 0.004,
  /** Post pitch from the tower's axis: the decorative girder's bay [sourced 3.8825]. */
  postPitch: 3.8825,
  /**
   * The upper X's: bars through each post's mid-height, at 47.5 degrees to
   * the chords in the face plane: a projection of the upper zone's dark
   * pixels is sharpest at 48.5 ("\") and 46.5 ("/"), a split that is the
   * scan's own 1.1-degree rotation (its chords fit at +1.0 to +1.2); taken
   * out, both families read 47.0-47.25. So each bar spans about 1.7 post
   * pitches, not 2 [measured, PL-VII Fig. 6 at 79.7 / 79.1 px/m].
   */
  upperAngle: 47.5,
  /**
   * The lower lattice's V's meet at BOTH chords, and the 750 chord's fall
   * on the post grid (under the posts and at mid-bay: 1098, 1250, 1405,
   * 1556, 1711, 1866 px, 153.6 apart; the post over 1400), the 630's half
   * a pitch off them (1010, 1172, 1325, 1623 px), so each bar spans 1.5
   * of its pitches. The bars' centre lines meet about 18 px (0.23) inside
   * the 750 chord's lower edge, and about 4 px (0.05) short of the 630's
   * upper edge, where the bars' edges meet on it [measured, PL-VII Fig. 6]:
   * 45.1 degrees over the resulting 2.93.
   */
  lowerApexTop: 0.23,
  lowerApexBottom: -0.05,
  /**
   * The rounded top corners: the frame fills each corner between the top
   * band and the uprights, its inner edge an arc about 1.0 in radius
   * (0.8-1.2 read) [estimated, PL-VII Fig. 6].
   */
  fillet: 1.0,
  /**
   * Flat bars' widths [estimated, PL-VII Fig. 6 at 79.7 px/m]: the posts
   * 35-38 px between their outer outlines, 0.44-0.47, drawn as two strips
   * with a double line between (one flat here); the upper X's 0.31-0.33;
   * the lower lattice 24-26 px, 0.30-0.32, as heavy as the upper bars.
   */
  post: 0.45,
  bar: 0.3,
  lowerBar: 0.31,
  /** The lower lattice's V's, every half post pitch along each chord (153.6 px, 1.93) [measured]. */
  lowerPitch: 3.8825 / 2,
  /** The bars' thickness [estimated]. */
  barThickness: 0.01,
} as const;

/**
 * The lower uprights' rows as built besides the corner angles' (PL-IX
 * figs. 21-24, PL-X figs. 15, 18; `builtup.ts`, SOURCES.md §27.3), at the
 * `fullRivets` depth. The C.J.'s two rows lie 0.055 either side of the
 * face's centre line: the interior cover's inner columns carry on the
 * same lines over a joint [measured on PL-IX figs. 21-22, 0.052-0.058]; the
 * fin's and the channel's rows run down the middle of the free leg
 * (fig. 23 measures the flats' at 0.056-0.057 off the centre line)
 * [derived]; panels 6-11's C.J. rows as panels 1-5's [estimated].
 */
export const SEAMS_AS_BUILT = { cjRow: 0.055 } as const;

/**
 * Headline counts (Eiffel, and the operating company).
 *
 * THE RIVETS. The text prints one total, and it is not the tower's: "Le
 * nombre total des rivets posés sur place, a été de 1.050.846" [sourced
 * text p. 113], the rivets driven ON SITE, by period of the erection
 * [sourced, same page; the periods sum to it], and 98,000 of them when the
 * four legs stood 28 m high, panel 2's top entretoise [sourced text
 * p. 103]. The rest were driven at Levallois-Perret: the pieces "arrivaient
 * ... préparées jusqu'à l'extrême limite ... la plupart des rivets étaient
 * posés" [sourced text p. 100], and the 6,360 t the shop delivered do "not
 * include the weight of the rivets driven on site" [p. 101]. **No shop
 * count is printed.** The 2,500,000 often quoted for the whole tower is a
 * secondary figure the text never prints [flagged: SOURCES.md §7]; if it
 * holds, the shop drove about 1.45 M.
 */
export const COUNTS = {
  parts: 18038,
  /** The tower's rivets, shop and site [flagged: secondary, never printed in the text]. */
  rivets: 2_500_000,
  /** Driven on the Champ de Mars [sourced text p. 113]. */
  rivetsSite: 1_050_846,
  /** The same, by period of the erection, as the text splits it, with the height each period finished at [sourced text p. 113; the heights estimated from what each period finished: XXIV, the 1st floor's gallery, the 2nd floor's, the intermediate floor mid-panel 19, the 3rd floor]. */
  rivetsSiteByPeriod: [
    { period: "a", until: "4 Dec 1887", what: "the four first panels", upTo: 50.4, n: 189_580 },
    { period: "b", until: "1 Apr 1888", what: "the first platform", upTo: 65, n: 235_809 },
    { period: "c", until: "14 Aug 1888", what: "the second platform", upTo: 122, n: 283_898 },
    { period: "d", until: "30 Nov 1888", what: "the intermediate floor", upTo: 194, n: 162_184 },
    { period: "e", until: "24 Feb 1889", what: "the third platform", upTo: 280, n: 100_739 },
    { period: "f", until: "15 Apr 1889", what: "the erection finished", upTo: Infinity, n: 50_868 },
    { period: "", until: "1 Jun 1889", what: "the riveting finished", upTo: Infinity, n: 27_768 },
  ],
  /** Driven when the four legs stood 28 m high, the top of panel 2 (10 Oct 1887) [sourced text p. 103]. */
  rivetsSiteAt28m: 98_000,
  ironTonnes: 7300,
} as const;

/**
 * Which of the model's rivets were driven on site, by rivet output (the
 * name after "rivets."), for the count against `COUNTS.rivetsSite` and
 * for tagging shop and field later. A rivet joining two pieces that came
 * to the Champ de Mars separately is a site rivet; one within a piece is a
 * shop rivet [derived from the text's "la plupart des rivets étaient
 * posés", p. 100]. What was a piece: a tronçon, with the gussets "rivés
 * sur les cornières" [sourced text p. 75]; a laced bar or entretoise; a
 * chord flat with its angles. `share` is the site fraction taken, `low`
 * and `high` the fractions the sources leave open.
 */
export interface RivetClass {
  readonly what: string;
  readonly share: number;
  readonly low: number;
  readonly high: number;
}

export function rivetClass(output: string): RivetClass {
  const name = output.startsWith("rivets.") ? output.slice("rivets.".length) : output;
  // A strut's end on its gusset: the bar and the tronçon came apart.
  if (name.endsWith(".joints")) return { what: "a member's end on its gusset", share: 1, low: 1, high: 1 };
  // A tronçon's joint: "un trou d'homme ... au droit de chacun des joints
  // ... permet d'effectuer la rivure" [sourced text p. 75], the holder-on
  // inside; a cover may have come shop-riveted to one tronçon [?].
  if (name.endsWith(".splices")) return { what: "a tronçon's joint", share: 1, low: 0.5, high: 1 };
  // Two bars crossing, fastened through their plate; one bar may have run
  // through, its half of the plate riveted at the shop [?].
  if (name.includes(".crossings")) return { what: "two bars' crossing", share: 1, low: 0.5, high: 1 };
  // A bar or post lapping a belt's or tie's chord flat.
  if (name.endsWith("Lap")) return { what: "a bar on a chord flat", share: 1, low: 1, high: 1 };
  // Along one member: a box's seams, a strut's lacing, a flat's rows.
  return { what: "along one member", share: 0, low: 0, high: 0 };
}

/**
 * Linear read of a (y, w) table, clamped: what `ramp` does, before the
 * cook. The tables above are the graph's and this reader's two readings of
 * the same numbers, so anything laid out in JS lands where the field puts
 * the steel.
 */
export function tableAt(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y0, v0] = stops[i - 1]!;
    const [y1, v1] = stops[i]!;
    if (y <= y1) return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return stops[stops.length - 1]![1];
}
