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
 * Masonry pedestals ("soubassements", decorative): 25 m square, 4 m high
 * [sourced], one per leg. Plate I's ground chain 25.334 + 74.238 + 25.334
 * puts their faces at 37.119 and 62.453 from the axis [derived].
 */
export const PEDESTAL = { inner: 37.119, outer: 62.453, height: 4 } as const;

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
   * The lattice bars of the legs' belts (the base ties, panel 5, panel
   * 10's base band and panel 11): single angles, 70 x 70 x 8 in the ties
   * and 80 x 80 x 8/10 in the belts [sourced PL-VII Figs 1, 2, 5], drawn
   * 0.10-0.17 m wide at 1:200. A 0.10 m square [estimated].
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
   * Base tie A, on each leg's two outer faces: "2,987" between its chords'
   * 200 x 8 plates and "3,387" over them [sourced PL-VII Fig. 1], so 3.187
   * axis to axis [derived; the drawn chords are 255 px apart at 79.7 px/m,
   * 3.20]. The earlier 2 m was B's depth read off the wrong figure.
   */
  tieOuterDepth: 3.187,
  /** Base tie B, on the two inner faces: "2.000" [sourced PL-VII Fig. 5]. */
  tieInnerDepth: 2.0,
  /**
   * The ties are Warren girders of single 70 x 70 x 8 angles with a bottom
   * chord and no posts but the leg's central one [sourced PL-VII Figs 1,
   * 5]: A's bottom-chord joints fall about 3.75 m apart, four V's across
   * the face [estimated], and B is drawn alike. Bars 47-60 degrees off the
   * chord (A's alternate about 37 and 63 on the plate).
   */
  tieOuterBays: 4,
  tieInnerBays: 4,
  /**
   * Panel 5: posts every 3.000 (5 bays in the 15.000 face), and a double
   * lattice of 80 x 80 x 8 angles crossing at square gussets at each
   * post's mid-height, each bar spanning two bays over the belt's depth,
   * about 50 degrees off the chord [sourced PL-VII Fig. 1, panel 5 detail;
   * the pattern read off the drawing].
   */
  belt1Bays: 5,
  /**
   * Panel 11: posts "3,36268" apart, about 3 bays [sourced PL-VII Fig. 2],
   * and a diamond lattice of 80 x 80 angles: bars crossing at square
   * gussets at the posts' mid-heights and meeting the chords at mid-bay
   * [the pattern read off the drawing], each bar spanning one bay over the
   * belt's depth, about 55 degrees off the chord (an angle of 53°49'43"
   * is printed at one of them) [derived].
   */
  belt2Bays: 3,
  /**
   * Panel 10's base band: "3,6071" deep [sourced PL-VII Fig. 2], a double
   * lattice of 300 x 5 flats and 30 x 30 x 4 angles at 45 degrees, about
   * 0.93 m apart [estimated], under a 600 top chord ("600" printed on it)
   * [sourced]. Above it, "6,564325": two X's per leg face either side of
   * a central post, all 600 [sourced].
   */
  band10Depth: 3.6071,
  band10TopChord: 0.3,
  /** Bars and levels of the band's lattice [estimated, from its 0.93 m]. */
  band10Bays: 12,
  band10Levels: 4,
} as const;

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
  /** Flat bars' widths, drawn about 0.3-0.4 (posts, upper X's) and 0.2 (lower lattice) [estimated]. */
  post: 0.32,
  bar: 0.3,
  lowerBar: 0.2,
  /** The lower lattice's bars, 45 degrees, every half post pitch along the chord [estimated]. */
  lowerPitch: 3.8825 / 2,
  /** The bars' thickness [estimated]. */
  barThickness: 0.01,
} as const;

/** Headline counts (Eiffel, and the operating company). */
export const COUNTS = { parts: 18038, rivets: 2_500_000, ironTonnes: 7300 } as const;
