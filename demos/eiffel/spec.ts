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
 * puts their plinth lines at 37.119 and 62.453 from the axis [derived].
 * The inner face does not stand on that line: it batters back from the
 * arch's pier, 38.17 at the ground to 40.3 at the top [measured on PL-VII,
 * PL-XI; SOURCES.md §18], clear of the arch's foot; the outer face stands
 * upright at 62.453.
 */
export const PEDESTAL = {
  inner: 37.119,
  outer: 62.453,
  height: 4,
  innerFoot: 38.17,
  innerTop: 40.3,
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
   * Base tie A, on each leg's two outer faces: its bottom chord's axis
   * "2,987" in the plane below node XXVIII [sourced PL-VII Fig. 1: the
   * dimension's upper arrow sits ON the XXVIII dash-dot line, 16 px under
   * the top chord's top edge at 1:200], so y 3.73. "3,387" is the same
   * chord measured from the top chord's top edge, 0.40 above XXVIII — the
   * top edge of the 0.80 node horizontal the model uses as the tie's top
   * chord [derived]. (The earlier 3.187 took the two numbers for the two
   * chords' faces, and hung the bottom chord 0.18 m low.)
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
   * Panel 5: chords "500 x 10" plates, solid on the plate, their outer
   * edges on XXIV and XXIII [sourced PL-VII Fig. 1]; posts square to the
   * chords on the grande poutre's 3.8825 grid from the tower's axis, four
   * a face with end bays about 1.7 (drawn 324 px apart at 83 px/m, 3.90)
   * [sourced 3.8825; the positions read off the drawing]; and a double
   * lattice of 80 x 80 x 8 angles, each bar from a post's foot through the
   * next post's mid-height to the top of the one after, about 42 degrees
   * [the pattern read off the drawing].
   */
  belt1PostPitch: 3.8825,
  belt1Chord: 0.5,
  belt1ChordThickness: 0.01,
  /**
   * Panel 11: chords "450 x 8" plates, printed on both, drawn 0.45-0.49
   * and solid, their outer edges on XVIII and XVII [sourced PL-VII Fig. 2];
   * posts square to the chords every "3,36268" from the tower's axis
   * (printed twice), three a leg face at 2, 3 and 4 pitches; and a double
   * lattice of 80 x 80 angles every half pitch, each bar spanning one
   * pitch over the depth between the chords: bars from a post's foot to
   * the next post's top (an X in every bay) and from mid-bay to mid-bay
   * through the posts' mid-heights (the diamond) [the pattern read off the
   * drawing; "53°49'43"" printed at one bar].
   */
  belt2PostPitch: 3.36268,
  belt2Chord: 0.45,
  belt2ChordThickness: 0.008,
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
 * The plan bracing ("contreventements", PL-VIII Figs 13-22, 1:1000): a
 * horizontal truss of lattice girders at every node from XVI up, joining
 * the face-centre uprights (b and d of adjacent legs up to XII, the merged
 * bd above). Up to XII: four long girders, each from b (or d) on one face
 * across to d (or b) on the next, on the lines x +- z = +-(W - w), whose
 * crossings make a diamond w inside the face centres; four short ones
 * across each leg's corner, from its own b to its own d (x +- z =
 * +-(W + w)); and girder A along one diagonal inside the diamond [sourced
 * Figs 13-15, the pattern; the Nota: XII is like XIII]. From XI to II the
 * diamond joins the bd's and A crosses it [Figs 18-21; X is like XI]; at I
 * and under the 3rd floor (top28) only A, corner to corner [Fig. 22].
 * H' and H, the members from A's middle toward the diamond's sides, are
 * not built: they cross the Edoux lift's run, which this model places
 * there. Every girder stops short of the Edoux (`EDOUX_PLAN`): A frames
 * into its central guide post from both sides, as Fig. 21 marks a joint
 * at the centre and draws the girders on the car line as stubs from the
 * corners. Girders B-F: "une corn. haut et bas et un treillis /\ avec
 * cornières" [sourced text]; drawn about as deep as the 600 face
 * horizontals in elevation (PL-VIII Fig. 17, "599,3") [estimated].
 */
export const PLAN_BRACING = {
  from: "XVI",
  /** Chord axis to chord axis [estimated, PL-VIII Fig. 17]. */
  depth: 0.6,
  /** The chords' and the web's half-widths: angles [estimated]. */
  chord: 0.045,
  web: 0.03,
  /** Nodes that carry A alone, corner to corner [sourced PL-VIII Fig. 22]. */
  aOnly: ["I", "top28"],
} as const;

/**
 * The "entretoise diagonale" inside each leg (PL-VIII Fig. 1, "Plan de
 * l'entretoise diagonale des panneaux 1, 2, 3"): a lattice girder in plan
 * from d to b, "21.2132" long (15.000 x sqrt 2) and "600" wide, "715.6"
 * deep in elevation [sourced PL-VIII Figs 1, 8]. PL-VIII Fig. 8 draws it
 * at the tops of panels 1, 2 and 3 (XXVII, XXVI, XXV) and again at XXII
 * and XXI ("14.100", "13.150": the leg's width there) [sourced].
 */
export const ENTRETOISE = {
  nodes: ["XXVII", "XXVI", "XXV", "XXII", "XXI"],
  width: 0.6,
  depth: 0.7156,
  /**
   * Where the leg's lift passes through it, the entretoise stops either
   * side of the car's run: at XXVII-XXV the Otis and Roux cars (lifts.ts),
   * slid along their tracks, sweep the leg's diagonal out past its centre,
   * ±1.56-1.61 across it (the Roux cabin 3.27 wide, the Otis 3.169). So an
   * opening ±1.75 about the diagonal, and each half ends free on its side
   * of the run [estimated: PL-VIII Fig. 1 draws the girder whole in plan;
   * PL-XX, the section along the diagonal, projects it onto b and d and
   * cannot show an opening]. At XXII and XXI the runs stay clear of it.
   */
  openAt: ["XXVII", "XXVI", "XXV"],
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
   * Flat bars' widths [estimated, PL-VII Fig. 6 at 79.7 px/m]: the posts
   * 35-38 px between their outer outlines, 0.44-0.47, drawn as two strips
   * with a double line between (one flat here); the upper X's 0.31-0.33;
   * the lower lattice 24-26 px, 0.30-0.32, as heavy as the upper bars.
   */
  post: 0.45,
  bar: 0.3,
  lowerBar: 0.31,
  /** The lower lattice's bars, 45 degrees, every half post pitch along the chord [estimated]. */
  lowerPitch: 3.8825 / 2,
  /** The bars' thickness [estimated]. */
  barThickness: 0.01,
} as const;

/** Headline counts (Eiffel, and the operating company). */
export const COUNTS = { parts: 18038, rivets: 2_500_000, ironTonnes: 7300 } as const;
