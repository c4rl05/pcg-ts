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
 * - then five steps and a top slab, receding 3.51 on the outer faces and
 *   1.55 on the inner [measured PL-I: step lines at 3.14, 3.55, 4.16-4.22,
 *   4.75-4.81, 5.21-5.27, set back 0.71 / 1.67 / 2.4-3.0 / 3.10 / 3.50 /
 *   4.15 from the nose at 16.13 px/m; PL-VII draws the same recession, 3.7
 *   outer and 1.5 inner, as a concave sweep under a cyma]. The top slab
 *   ends where PL-VII's lip does, at the upright: 57.45, 0.23 outside the
 *   model upright's horizontal section at the top and 0.08 at the slab's
 *   foot, and 40.45 inside [PL-VII 40.42]. PL-I draws its upright about 0.7
 *   further in than the node table puts it, so its set-backs are kept in
 *   proportion (×0.90) between the nose and that lip [estimated].
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
    { y0: 3.14, y1: 3.55, outer: [59.46, 59.46], inner: [39.3, 39.3] },
    { y0: 3.55, y1: 4.2, outer: [58.81, 58.27], inner: [39.35, 39.8] },
    { y0: 4.2, y1: 4.75, outer: [58.18, 58.18], inner: [39.9, 39.9] },
    { y0: 4.75, y1: 5.25, outer: [57.82, 57.82], inner: [40.1, 40.1] },
    { y0: 5.25, y1: 5.55, outer: [57.45, 57.45], inner: [40.45, 40.45] },
  ] as readonly PedestalTier[],
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
 * tables). Uprights are closed boxes 0.80-0.82 m square below the 1st
 * floor, about 0.87 m to the 2nd, 0.50 m above. Web bars are 0.80 m square
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
   * into two chains, each skinned AND riveted with its own part of this
   * table: `uprightBelow` and `uprightAbove`.
   */
  upright: [
    [2.5, 0.41],
    [57.4, 0.41],
    [68.4, 0.435],
    [115.5, 0.435],
    [115.51, 0.25],
    [276.13, 0.25],
  ],
  /** The upright table from the supports to XVII (the lower chains). */
  uprightBelow: [
    [2.5, 0.41],
    [57.4, 0.41],
    [68.4, 0.435],
    [115.5, 0.435],
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
 *   centre; on the opposite long girder the K bracket, a stub toward the
 *   centre and two struts parallel to the faces back to the girder; and,
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

/** Headline counts (Eiffel, and the operating company). */
export const COUNTS = { parts: 18038, rivets: 2_500_000, ironTonnes: 7300 } as const;

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
