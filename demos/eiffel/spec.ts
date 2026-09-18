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
  /** An arcade of 14 small round-headed openings between it and the arch. */
  arcadeOpenings: 14,
} as const;

/**
 * The four decorative arches (non-structural). A circle in the face plane
 * of radius 36.4064 with its crown 39.40 above the ground [sourced]; the
 * plate prints two more radii (40.32, 44.53) whose segments are only
 * estimated, so this uses the single circle. The band is 2.5488 deep in
 * the face plane.
 */
export const ARCH = { radius: 36.4064, crownY: 39.4, band: 2.5488 } as const;

/**
 * Member sizes, as HALF-widths of a square section (Plate XXXI's section
 * tables). Uprights are closed boxes 0.80-0.82 m square below the 1st
 * floor, about 0.87 m to the 2nd, 0.50 m above. Web bars are 0.80 m square
 * lattice struts in panels 1-9 and 0.50 m in panels 12-28.
 */
export const MEMBERS = {
  // A section changes at a panel node, but a swept member has one ring
  // per node and interpolates between them, so a step placed a centimetre
  // past a node would be a step in anything else that reads this table
  // (the rivets) and an 11 m taper in the skin. The stops sit ON nodes,
  // and the change is spread over the panel above: XXIII -> XXII for the
  // 1st floor's, XVII -> XVI for the 2nd's [estimated].
  upright: [
    [2.5, 0.41],
    [57.4, 0.41],
    [68.4, 0.435],
    [115.5, 0.435],
    [126.8, 0.25],
    [276.13, 0.25],
  ],
  web: [
    [0, 0.4],
    [110.6, 0.4],
    [115.5, 0.25],
    [276.13, 0.25],
  ],
  /** Horizontal struts: built of 80 x 80 angles [sourced]; depth [estimated]. */
  horizontal: [
    [0, 0.3],
    [115.5, 0.3],
    [115.51, 0.2],
    [276.13, 0.2],
  ],
  /** Chords and lattice bars of the girder bands [estimated]. */
  girderChord: 0.25,
  girderBar: 0.12,
} as const;

/** Headline counts (Eiffel, and the operating company). */
export const COUNTS = { parts: 18038, rivets: 2_500_000, ironTonnes: 7300 } as const;
