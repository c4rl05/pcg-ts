/**
 * Panel 29, the 3rd floor, and the 1889 campanile above it.
 *
 * Bottom to top, every level chained from the 3rd floor (PL-VII Fig. 4,
 * PL-XIX Figs 3-13, PL-XIV Fig. 2 and Plate I; tags as in `spec.ts`; the
 * readings are in SOURCES.md, "The campanile re-read" and "The summit
 * re-read"):
 *
 * 1. PANEL 29 [sourced]: a prismatic box 10.00 m axis to axis, 11.23 m
 *    tall, from the top of panel 28 (y 264.90) to the 3rd floor (276.13),
 *    4 bays of 2.50 m per face. Its rows are a lattice BAND 3.173 at the
 *    base, then 8.057 in three X rows [sourced PL-VII], split by two light
 *    horizontals 3.22 and 5.66 below the floor [sourced PL-XIV Fig. 2's
 *    chain, 0.25 + 2.970 + 2.440 + 2.670 + 2.900 = 11.230]. On
 *    `squareRing(4)` the four corners are the uprights that continue the
 *    shaft's c; the other twelve columns (the merged b/d among them) are
 *    POSTS, 0.50 m wide ["500" printed three times]. The web is flat bars
 *    0.15 wide [measured PL-XIV], each running between the corners of its
 *    clear panel: one X per cell in the rows; in the band an X and a
 *    diamond through the cell's side mid-points [PL-XIV, PL-VII].
 *    Horizontals: 0.60 m plate girders ("600 x 6", "600 x 7") hang from
 *    the band's top node and under the floor's 0.25 build-up ("850" = 0.25
 *    + 0.60) [sourced PL-VII]; the base is the shaft's own 0.60 horizontal
 *    at its top node; the light horizontals are 0.16 [measured PL-XIV]. The
 *    corner uprights and the b/d posts run on up through the glazed gallery
 *    to the balcony's beam [PL-VII Fig. 4], and on inside the pavilion's
 *    walls.
 * 2. THE GALLERY: a glazed octagon ("paroi vitrée") 16.56 m across the
 *    flats with 10.90 m straight sides and 45-degree chamfers [sourced
 *    PL-XIX Fig. 9], closed to Eiffel's BALCONY, whose deck top is 2.430
 *    over the floor [sourced PL-VII 1.200 + 1.030 + 0.200, PL-XIV Fig. 2,
 *    PL-XIX Fig. 3] on "Fer I 120" joists: 24 "croisées anglaises", four
 *    bays a straight side and two a chamfer, over a solid 1.20 parapet with
 *    its 40 x 40 lattice outside, 0.50 solid piers at the corners, the
 *    1.030 window and the 0.200 sablière [sourced, `GALLERY_POSTS`,
 *    `GALLERY_WALL`]; the panes are `summitGlass`'s. The balcony is 17.6
 *    m across [estimated: PL-VII draws it about 0.5 proud of the glass],
 *    its railing three round bars on the window posts continued [sourced
 *    PL-XIV Fig. 7, `BALCONY_RAILS`]. Its deck is open for the Edoux, the
 *    cables, the little stair and the contrefiches (`ROOM_WELLS`).
 * 3. EIFFEL'S PAVILION: a timber pavilion 10.50 m square and 2.27 m tall
 *    [sourced E1900-TXT p. 216; PL-XIX Fig. 3], its floor 2.58 over the 3rd
 *    floor, a step of 0.15 above the balcony [sourced PL-XIX Fig. 3,
 *    "Niveau du plancher (312.21) du logement"], its 10.680 roof on the
 *    girders' foot [sourced PL-XIX Fig. 5]: 2.58 + 2.27 closes on the
 *    chain's printed 4.850 to y 280.98 [derived]. Inside, on PL-XIX Fig. 6's
 *    plan, the salon, cabinet de toilette, cuisine, water-closet, office,
 *    coffre, the four laboratories and the Edoux's cage, with four windows
 *    and two doors a face (`PAVILION`, `pavilionPlan`). Four CONTREFICHES
 *    prop the girders' ends through its corners (`CONTREFICHE`).
 * 4. THE TWO GRANDES POUTRES DIAGONALES, 4.500 deep [sourced PL-XIX
 *    Fig. 3: "Parties droites des poutres en diagonale 4.50"] to y 285.48.
 *    In plan they are an X [PL-XIX Fig. 5, coupe GH, and Fig. 8, coupe EF]:
 *    two lattice girders on the diagonals, 14.870 end to end and 1.130
 *    broad over the flanges, with webs 0.770 apart [sourced], crossing on
 *    the tower's axis. Nothing runs along the square's sides. The one that
 *    carries the Edoux pulleys is continuous and the other butts against
 *    it [sourced PL-XIX Figs 5, 8: "Gde poutre diagonale continue" /
 *    "discontinue"]; the continuous one lies on the N-S diagonal, the Edoux
 *    cars' line (lifts.ts), since PL-XIV Fig. 4 names the cars' spaces
 *    under it. Each web, in its own plane [PL-XIV Fig. 4, 1:50]: chords
 *    "Âme 400 x 10" under 360 flanges, a diamond mesh of angles between
 *    them, a plain end plate "750" wide, a light vertical, and on the
 *    continuous girder a pulley post "1.250" wide 4.064 from the centre
 *    and a plate at the centre, both with windows. At each end the tower's
 *    corner upright (arbalétrier c) stands between the webs, "364" in from
 *    the end, and an X-laced end frame ("Plats 50 x 8" at "884") closes
 *    them [PL-XIV Figs 2, 3]. The top is plated over ("Tôle 540 x 4"
 *    between the flanges), the bottom open with cross angles [PL-XIV
 *    Figs 5, 5 bis]. The dome's arches are these girders' upper parts. Seen
 *    face-on at 45 degrees, the end plates, uprights and end frames are
 *    PL-VII's "corner columns" and the webs its diamond mesh.
 *    On the tower's axis the LADDER CYLINDER, a sheet-iron tube 0.70 m
 *    across [sourced PL-XIX Figs 5, 13], stands on the girders' crossing
 *    and rises through the dome's opening to the lantern terrace [PL-VII
 *    Fig. 4 draws it from the girders' top up, not inside them, where
 *    PL-XIV Fig. 1 puts the Edoux pulleys between the continuous girder's
 *    webs].
 * 5. THE DOME: four half-arches along the diagonals, two full SEMICIRCLES
 *    crossing over the axis: 7.435 m out in plan on each half-diagonal
 *    ("14.870" across) and 7.435 m high [sourced PL-XIX Fig. 5, PL-VII:
 *    "11,935" = 4.500 + 7.435], so the extrados is a semicircle of radius
 *    7.435 about the box's top, crown at y 292.915 [derived]. Each rib is a
 *    box 1.300 deep radially, its two trusses 0.77 apart in the
 *    girders' webs' planes [sourced E1900-TXT p. 79, PL-XV Fig. 2: 7.435 /
 *    6.135], 9 panels a quarter [measured PL-XV Fig. 2] (`DOME`). Round the
 *    axis, the stair core, a 0.70 sheet tube from the girders' top to the
 *    lantern's floor [sourced PL-XV], and room left for its spiral stair
 *    (`LADDER`, `STAIR_ENVELOPE`).
 * 6. THE LANTERN TERRACE, floor at 293.215 [sourced]; the chain's 0.250
 *    would put it at 293.165, the 0.05 m the spec leaves open, so the
 *    deck runs from the crown and is 0.300 thick. A square 4.615 m with
 *    0.776 chamfers [derived: "5.750" across the chamfers on PL-XV Fig. 2,
 *    PL-XIX Fig. 13 and PL-VII, and "776" on a chamfer], railed 1.090
 *    [sourced p. 79, PL-XV Fig. 2].
 * 7. THE LANTERN ("phare"), a decagon of 0.80 sides [sourced p. 79], on
 *    PL-XV Fig. 1's chain (`LANTERN`, `lanternLevels`): the 3.980
 *    soubassement with the lantern's floor 2.305 up, the balcony at +3.08
 *    on ten 0.775 consoles, "3.611" across, with a 0.900 parapet; the
 *    1.140 glazing; the spherical cupola, Ø 2.686, 2.180 from the sablière
 *    to the Ø 1.70 top platform at 300.515; on it the 1.20 railing, five of
 *    its angles bent in to the socket at 3.05 [sourced p. 80, PL-XV Fig. 1,
 *    PL-XIX Fig. 4].
 * 8. THE ROD, the lightning conductor that carried the flag: 10.790 on a
 *    1.000 tripod, a 60 mm bar ending in three 1.50 points [sourced p. 80,
 *    PL-XV Fig. 1], its tip at PL-I's 312.275, its foot seated 0.030 into
 *    the tripod's head (`ROD`).
 *
 * Panel 29 is sorted like the shaft (uprights, bracing, horizontals);
 * everything from the gallery up is the "summit" class, but for the two
 * gussets over the girders' crossing, which are "gussets" with every
 * other crossing plate in the tower.
 *
 * DETAIL, as for the legs and the shaft (`Detail`). With `lacedWeb` panel
 * 29's posts become laced struts (`webMembers`). The flat bars stay flat
 * bars, and the diagonal girders have no member that `lacedWeb` changes:
 * their end frames are laced at every detail, as the plates draw them. It
 * does add the crossing's "2 Goussets 1.130 x 10", top and bottom, by the
 * legs' crossing rule (see `diagonalGirders`), because the class that rule
 * builds into is a laced-depth one. With `rivets`: seam rows on the corner
 * uprights, in panel 29 and inside the girders' ends (the uprights' pitch
 * and inset, strut.ts); the laced members' lacing and joint rivets; two
 * rivets through each end of every flat bar of panel 29 and of the girders'
 * mesh, just clear of the post, plate or chord it lands on; two rows along
 * each face of panel 29's band plate girder, between the posts, and of
 * every girder chord; one rivet at each node of the end frames' lacing; the
 * gussets' edge rows; and on the dome, seam rows along every chord and one
 * rivet on each OUTER face of a chord at every node its lacing meets
 * [estimated]. Every rivet set is its own output, `rivets.summit.<part>`.
 * The defaults build solid members and no rivets.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  attribute,
  component,
  extrudePolygon,
  mul,
  orientAlongVector,
  pathResample,
  pointGrid,
  pointsToPath,
  position,
  ramp,
  setAttribute,
  sweepProfile,
  vec,
} from "pcg-ts";
import {
  FACE_NORMAL,
  type Lattice,
  type StationMask,
  type Vec3,
  chains,
  edges,
  indexTable,
  merge,
  placedLattice,
  segmentMembers,
  skin,
  squareRing,
  stationLattice,
  stationRows,
} from "./lattice.js";
import { CROSS_RIVETS, CROSS_THICK, type Crossing, crossPlateSets } from "./crossing.js";
import { CROSS_PLATE_AT, type Detail, type Parts, joinParts } from "./parts.js";
import { GLAZING } from "./platforms.js";
import { FLOORS, MEMBERS, PANEL29 } from "./spec.js";
import {
  UPRIGHT_SEAMS,
  type WebMembers,
  faceSkin,
  flatBars,
  lineRivets,
  rivetOutputs,
  rivetSpawn,
  seamRivets,
  webMembers,
} from "./strut.js";

/** Panel 29's base band, in-plane = vertical (the panel is prismatic) [sourced PL-VII "3,173"]. */
const PANEL29_BAND = 3.173;
/**
 * The light horizontals' centrelines, down from the floor [sourced PL-XIV
 * Fig. 2's chain: "250" to the top girder's top, then "2.970" and "2.440";
 * the chain goes on "2.670" to the band girder's centreline and "2.900" to
 * the base's, 0.25 + 2.97 + 2.44 + 2.67 + 2.90 = 11.230]. So 3.22 and 5.66
 * below the floor, y 272.91 and 270.47; PL-VII draws them at 272.93 and
 * 270.52 [measured].
 */
const PANEL29_LIGHTS = [0.25 + 2.97, 0.25 + 2.97 + 2.44] as const;
/** Panel 29's members, as half-widths. */
const P29 = {
  /** The posts: "500" [sourced PL-VII Fig. 4]. */
  post: 0.25,
  /**
   * The flat bars of the X and the band [measured PL-XIV Fig. 2, 1:50:
   * the flats 0.15-0.16 across, the built rising bars 0.18; PL-VII's 1:200
   * double lines, 0.08-0.09 apart, are the thinner reading and yield to the
   * detail plate].
   */
  bar: 0.075,
  /** The light horizontals between the X rows [measured PL-XIV Fig. 2: 0.15-0.16]. */
  light: 0.08,
  /** The plate girders, "600 x 6" and "600 x 7": depth [sourced]; half-thickness with flange angles [estimated]. */
  plateDepth: 0.6,
  plateHalf: 0.1,
  /** The floor's structure under its level, "850" [sourced PL-VII, PL-XIX Fig. 3]. */
  floorDepth: 0.85,
} as const;

/**
 * The glazed gallery [sourced PL-XIX Figs 3, 9]: half across the flats,
 * half its straight side, the apartment's floor over the 3rd floor
 * ("312.21" - "309.63"), the parapet.
 */
const GALLERY = { flat: 8.28, straight: 5.45, height: 2.58, parapet: 1.2 } as const;
/** Its frame, as half-widths [estimated]: mullions and sills, the parapet's 40 x 40 lattice. */
const GALLERY_MEMBERS = { frame: 0.05, lattice: 0.02 } as const;
/**
 * Eiffel's balcony: its deck's top over the 3rd floor [sourced 2.430 on
 * PL-VII, PL-XIV Fig. 2 and PL-XIX Fig. 3; PL-XIX's "312.21", 2.58, is
 * the APARTMENT's floor, a step higher]; the deck overhangs the glass
 * [estimated; PL-VII and PL-XIV draw 0.45-0.6]; its depth, the joists
 * [sourced PL-VII "Fer I 120"; PL-XIV draws 0.12 at the mullion]; its
 * railing, on the glass line [sourced PL-VII "1.000"].
 */
const BALCONY = { level: 2.43, overhang: 0.52, deck: 0.12, railing: 1.0, member: 0.03 } as const;

/** The apartment [sourced PL-XIX: 10.680 square roof, 2.270 tall]. */
const APARTMENT = { side: 10.68, height: 2.27 } as const;


/**
 * The two diagonal girders' sections, in a girder's own frame: `d` along
 * it from the tower's axis, `w` across it (PL-XIV Figs 1-5, 1:50; PL-XIX
 * Figs 3, 5, 8, 1:200).
 */
const GIRDER = {
  /** Depth [sourced "4.500"]. */
  height: 4.5,
  /** Half the length, axis to end [sourced "14.870", "7.435"]. */
  half: 7.435,
  /** Each web's plane off the girder's axis [sourced "770" between them; PL-XIV Fig. 5 "385" + "385"]. */
  web: 0.385,
  /** Over the flanges [sourced "1.130"]. */
  breadth: 1.13,
  /**
   * The chords' depth: "Âme 400 x 10" under its flange [sourced]; PL-XIV
   * Fig. 4 draws them 0.41 and 0.38 to the "4.500" datum lines, 0.44 and
   * 0.43 overall [measured; PL-VII's 1:200 draws the head and foot bands
   * 0.34-0.35].
   */
  chord: 0.4,
  /** A chord across its web: the web and its two "Corn. 90 x 90 x 10" [derived 0.19; 0.20 estimated]. */
  chordThick: 0.2,
  /** The flanges, "Semelle 360 x 10" [sourced]. */
  flange: 0.36,
  /** The top's plating (the flanges and the "Tôle 540 x 4" between them) and the bottom flanges: thickness [estimated]. */
  cover: 0.02,
  /** The web's plates ("Âme de 6 m/m") with their edge angles: thickness [estimated]. */
  webPlate: 0.03,
} as const;

/** Where the members stand along a girder, as distances `d` from the tower's axis or from the girder's end. */
const GIRDER_AT = {
  /**
   * The web's end plate, "Âme de 750 x 6", its width in from the end
   * [sourced "750"]; the mesh runs on across it [PL-XIV Fig. 4].
   */
  endPlate: 0.75,
  /** The bottom flanges start this far in from the end [sourced "464", PL-XIV Fig. 5 bis]. */
  flangeIn: 0.464,
  /** The light vertical, "Corn. 70 x 70 x 8", in from the end [measured PL-XIV Fig. 4: 1.25]. */
  light: 1.25,
  /**
   * The continuous girder's pulley posts: axis from the tower's axis
   * [sourced "4.064", "3.371" in from the end], width [sourced "1.250"],
   * windows over its foot, the upper one open to the top chord [measured
   * PL-XIV Fig. 4, +-0.05; 0.50 wide, sourced "500"].
   */
  pulley: { at: 4.064, width: 1.25, windows: [[2.04, 2.62], [3.47, 4.11]] },
  /**
   * Its central plate, where the discontinuous girder's webs land: width
   * [measured PL-XIV Fig. 4: 1.36], windows [sourced "500" x "600", "800"
   * apart], round the pulleys' centres "650" and "650" + "1.370" over the
   * foot [sourced; heights measured]. The lower one reaches down to 0.32,
   * into the bottom chord's depth; the model stops it at the chord.
   */
  centre: { width: 1.36, windows: [[0.32, 0.93], [1.72, 2.32]] },
  /** The windows' width [sourced "500"]. */
  window: 0.5,
  /** The bottom's cross angles, "70 x 70 x 8", in from the end [measured PL-XIV Fig. 5 bis: 1.94]. */
  cross: 1.94,
  /** The angles (light verticals, end frames' posts, cross angles), as square members: half-width [sourced 70 mm legs; 0.08 estimated]. */
  angle: 0.04,
  /**
   * The end frame's lacing, "Plats 50 x 8" [sourced PL-XIV Fig. 3], over
   * the whole depth in panels of about "884" [sourced; five on the plate].
   */
  lacing: { width: 0.05, thick: 0.008, panel: 0.884 },
} as const;

/**
 * The webs' diamond mesh, in the web's own plane: bars 1.21 apart along
 * the girder, at 43 degrees, so diamonds 1.13 tall [measured PL-XIV Fig. 4
 * by 2D autocorrelation and by a blind second reading: 1.21, 42.9-43.2
 * degrees]. Seen face-on at 45 degrees that is 0.856 x 1.13 at 52.9
 * degrees [derived]: PL-VII's mesh (52.6-52.9 degrees; read 0.825 and
 * 0.846 wide) and PL-XIV Fig. 2's hidden lines (0.83) are these webs. The
 * bars are angles ("Corn. 60 x 60 x 7"), built square [0.09 estimated].
 */
const GIRDER_MESH = { spacing: 1.21, rise: 1.21 * Math.tan((43 * Math.PI) / 180), bar: 0.045 } as const;

/**
 * The dome, the "quatre grands arceaux à jour" (E1900-TXT p. 12): two
 * semicircular arches at right angles, "d'une largeur de 1,300 m; le rayon
 * de leur extrados est de 7,435 m. Leur section suivant un plan diamétral
 * est un caisson de 1,300 m sur 0,77 m", two trusses "dans le plan de ces
 * poutres" (the diagonal girders', whose webs are "espacées de 0,77 m d'axe
 * en axe"), each of "quatre cornières de 50x50x6" with posts and a lattice
 * of the same angles, joined by "quatre cadres à croisillons et par un
 * contreventement en fers plats de 50 x 8" [sourced p. 79].
 *
 * - `radius`: the extrados, also the rise and the plan's half-diagonal
 *   [sourced 7.435; PL-XIX Fig. 5, PL-VII "11,935" = 4.500 + 7.435].
 * - `chord`: a chord's half-width, two 50 x 50 x 6 angles back to back,
 *   built square [derived 0.10].
 * - `depth`: the chords' axes apart radially, 1.300 over them less a chord
 *   [derived 1.30 - 0.10].
 * - `breadth`: the chords' axes apart across the rib. Each truss's plane is
 *   its chords' inner face, on the girder's web at +-0.385, the angles'
 *   outstanding legs outward, so the axes stand a half-chord out [derived
 *   0.77 + 0.10]. It leaves the crown's "carré" 0.77 clear, which the 0.70
 *   ladder cylinder passes (below).
 * - `lacing`: the angles and flats, half 50 mm [derived]; `segments`, a
 *   quarter arch's panels, one every 10 degrees with a radial post at each
 *   node [measured PL-XV Fig. 2; 12 until 2026-09-26, estimated].
 *
 * Until 2026-09-26 the rib was 0.95 x 1.02 on 0.18 chords (1.20 deep, 1.13
 * broad, [estimated] from PL-VII and the girders' flanges), which the text
 * does not bear out: 1.300 deep, and 0.77 in the webs' planes.
 */
const DOME = { radius: 7.435, depth: 1.2, breadth: 0.87, chord: 0.05, lacing: 0.025, segments: 9 } as const;

/**
 * The campanile's stair core, "le cylindre en tôle de 690 mm de diamètre
 * intérieur servant de noyau à l'escalier tournant du phare", fixed "au
 * moyen de collerettes" inside the "carré" the arches form at their crown,
 * with "une échelle verticale en fer" inside it [sourced E1900-TXT p. 79];
 * "Diam. ext. 700" and "Hauteur totale du cylindre 10m035", from the
 * girders' top (318.985) to the lantern's floor (329.020), which it
 * carries "en son milieu" [sourced PL-XV Figs 1, 2; p. 79]; the prism's
 * sides [estimated]. The spiral stair round it, 1.980 across [sourced PL-XV
 * Fig. 2, PL-XIX Fig. 5 "1.98"], is the stairs' item: `STAIR_ENVELOPE`
 * keeps its room.
 */
const LADDER = { diameter: 0.7, sides: 16, height: 10.035 } as const;

/**
 * The room the campanile's spiral stair needs round the core: 1.980
 * across, from the girders' top 22 steps of 178 to its landing at about
 * 322.90 [sourced PL-XV Fig. 2: "1.980", 22 x 178 = 3.916], and the
 * landing's 1.200 railing over it [sourced]. Nothing but the core stands
 * in it.
 */
export const STAIR_ENVELOPE = { radius: 0.99, rise: 22 * 0.178, railing: 1.2 } as const;

/**
 * The lantern stack. Its heights are the chain PL-XV Fig. 1 prints (1:50,
 * 236-240 px/m; readings in SOURCES.md §29): terrace 326.715, +2.305 the
 * lantern's floor 329.020, +1.675 the "sablière inférieure" 330.695 (so the
 * soubassement is 3.980, as PL-VII and the text give), +1.140 the glass to
 * the "sablière supérieure" 331.835, +0.525 the cupola's floor 332.360,
 * +1.655 the top platform 334.015 [sourced].
 */
const LANTERN = {
  /**
   * The terrace: square side, chamfer [derived from the "5.750" printed
   * across the chamfers on PL-XV Fig. 2, PL-XIX Fig. 13 and PL-VII, and the
   * "776" (PL-XIX) / "770" (PL-XVI Fig. 22) chamfer that faces an arch].
   * The text's "grands côtés 3,40 … petits côtés 0,70" gives 4.39 across;
   * the plates are followed (§29). Its railing posts rise "1,090 m
   * au-dessus du plancher" [sourced p. 79; PL-XV Fig. 2: 150 + 300 + 300 +
   * 300 + 40]. Before 2026-09-26 the railing was 1.00.
   */
  terrace: 4.615,
  chamfer: 0.776,
  railing: 1.09,
  /**
   * The lantern's floor over the terrace [sourced "2.305"], and its depth
   * [estimated]: the soubassement's "chambre de service" closes on it,
   * and the core carries it.
   */
  floorAt: 2.305,
  floorDepth: 0.1,
  /**
   * The soubassement: height [sourced 3.980], and the decagon's side,
   * "un prisme décagonal … dont le côté a 0,80 m" [sourced p. 79], so
   * 2.589 across the corners and 2.462 across the flats [derived]: PL-XIX
   * Fig. 13's "2.60" is across the corners and PL-XVI Fig. 24's "1.25" an
   * apothem, both rounded [sourced]. Until 2026-09-26 the model read 2.60
   * across the flats (a 0.845 side).
   */
  baseHeight: 3.98,
  side: 0.8,
  /**
   * The balcony ("balcon de la lanterne", 329.795): its floor above the
   * terrace (2.305 + 0.775) [sourced], on "10 consoles pareilles" 0.775
   * tall [sourced PL-XV Fig. 33]; its 0.900 parapet [sourced]; across the
   * flats "3.611" [sourced PL-XIX Fig. 12, its first digit half hidden].
   */
  balconyAt: 3.08,
  console: 0.775,
  parapet: 0.9,
  balconyFlats: 3.611,
  /** The glazed lantern, "sur une hauteur de 1,14 m" [sourced]. */
  lanternHeight: 1.14,
  /**
   * The cupola, "la coupole sphérique, de 2,686 m de diamètre … de 2,180 m
   * de hauteur" [sourced p. 79], from the sablière supérieure to the
   * platform: a drum 0.755 to the springing ("Naissance"), then 1.300 of
   * sphere to its crown ring, Ø 0.600, then 0.125 of the platform's
   * structure [sourced PL-XV Fig. 1]. A sphere of radius 1.343 on the drum
   * rises 1.309 to the Ø 0.600 ring [derived], the printed 1.300 within
   * 9 mm. Until 2026-09-26 it was a bulb, straight 0.9 [estimated] and
   * rounding in to a 1.80 deck, as wide as the decagon.
   */
  cupolaDiameter: 2.686,
  cupolaDrum: 0.755,
  crownRing: 0.6,
  cupolaSides: 24,
  /**
   * The top platform: "plancher circulaire en tôle striée, de 1,70 m de
   * diamètre" [sourced p. 79; PL-XV Fig. 1 "1.700"], 0.125 deep to the
   * cupola's crown [sourced PL-XV Fig. 1, PL-VII].
   */
  topDeck: 0.125,
  topDiameter: 1.7,
  /**
   * Its railing, "de 1,20 m de hauteur, … formé par des cornières de 60 x
   * 60 x 8. Cinq de celles-ci sont cintrées de manière à venir s'assembler
   * sur une douille pentagonale qui maintient le paratonnerre à 2,05 m
   * au-dessus de sa base" [sourced p. 80]. On PL-XV Fig. 1 [sourced]: the
   * posts on the rim (radius 0.85), from 0.275 under the platform; rails at
   * 0.230, 0.530, 0.830, 1.130 and the top at 1.200; the five bent ones go
   * on plumb to +1.800, then curve in over 1.000 (two R 500 arcs with a
   * 262.5 straight between) into the socket, 0.250 tall from +2.800 to
   * +3.050, PL-XIX Fig. 4's "Soutien du paratonnerre 3.05". The five others
   * stop at the rail [estimated: PL-XVI Fig. 27 draws about ten]. Angles
   * built square, 0.06 [derived].
   */
  postsBelow: 0.275,
  rails: [0.23, 0.53, 0.83, 1.13, 1.2],
  bentPlumb: 1.8,
  socket: [2.8, 3.05],
  socketRadius: 0.06,
  angle: 0.03,
} as const;

/**
 * The lightning rod that doubled as flagpole: "fixé, sur un trépied, le
 * paratonnerre, dont la longueur totale est de 10,790 m. C'est un fer rond
 * de 60 mm à la base, terminé par trois pointes inclinées de 1,50 m et qui
 * porte le pavillon national" [sourced p. 80; PL-XV Fig. 1 "Hauteur du
 * paratonnerre 10.790", PL-XIX Fig. 4 "10m790"]. Its base, the tripod's
 * apex, is 1.000 above the platform [sourced PL-XV Fig. 1, PL-XIX Fig. 4,
 * PL-VII], and 1.000 + 2.05 = 3.050, the socket's top [derived]. PL-VII's
 * "10.760" over that base and PL-I's "11m760" over the platform put the tip
 * at 312.275 (altitude 345.775), the spec's `flagTop`; a 10.790 rod on the
 * 1.000 apex would stand 0.030 higher. The rod is built 10.790 long with its
 * tip at `flagTop`, its foot seated 0.030 into the tripod's head [derived,
 * the reading that closes all five figures; SOURCES.md §29]. The points,
 * « inclinées de 1,50 m », are 1.50 long, leaning 18 degrees [measured
 * PL-VII Fig. 4, the only one drawn to scale; low confidence]. The tripod's
 * three legs foot on the Ø 0.600 crown ring [sourced PL-XV detail D], 0.32
 * out [measured]. The rod's head and the points' tips, and the legs'
 * section [estimated].
 */
export const ROD = {
  base: 1.0,
  length: 10.79,
  foot: 0.03,
  head: 0.02,
  points: 1.5,
  lean: (18 * Math.PI) / 180,
  tip: 0.008,
  legFoot: 0.32,
  leg: 0.025,
} as const;

/**
 * A rivet head's radius: strut.ts's (38 mm across for a 22 mm rivet
 * [estimated]), which that module does not export.
 */
const RIVET_HEAD = 0.019;

/**
 * How far short of a whole number of pitches a seam run stops. A resample
 * by spacing always lands on its path's end, so a run whole to the float
 * could end on a hairline last step, two heads on top of each other; a
 * millimetre short, its last step is a millimetre shy of the pitch.
 */
const RUN_SHORT = 0.001;

/** How far a flat bar's end rivet keeps clear of the member it lands on, head included [estimated]. */
const END_CLEAR = 0.05 + RIVET_HEAD;
/** The two rivets through a flat bar's end, this far apart along it [estimated]. */
const END_PITCH = 0.08;

/** A named rivet spawner, as `Parts.rivets` holds them. */
type RivetSet = { name: string; spawn: NodeHandle };

/** A (height, half-width) table holding one value at every height. */
function flat(w: number): ReadonlyArray<readonly [number, number]> {
  return [
    [0, w],
    [FLOORS.flagTop, w],
  ];
}

/** Whether the web is built as laced struts: `rivets` implies the lacing. */
const isLaced = (detail: Detail) => detail.lacedWeb === true || detail.rivets === true;

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * One of the tower's four faces, for members laid out in the face's own
 * coordinates: `u` along it (t) and `y` up, the face plane `half` out
 * along n. Face order is +z, +x, -z, -x, each turned 90 degrees from the
 * last, so `u` runs the same way round every face.
 */
interface Face {
  readonly n: Vec3;
  readonly t: Vec3;
}
const FACES: readonly Face[] = [
  { n: [0, 0, 1], t: [1, 0, 0] },
  { n: [1, 0, 0], t: [0, 0, -1] },
  { n: [0, 0, -1], t: [-1, 0, 0] },
  { n: [-1, 0, 0], t: [0, 0, 1] },
];
/** A point in a face's coordinates, `off` out of the face plane. */
function onFace(f: Face, half: number, u: number, y: number, off = 0): Vec3 {
  return [f.n[0] * (half + off) + f.t[0] * u, y, f.n[2] * (half + off) + f.t[2] * u];
}

/** A straight member in a face's coordinates. */
interface FaceBar {
  readonly f: Face;
  readonly u0: number;
  readonly y0: number;
  readonly u1: number;
  readonly y1: number;
}

/** A rectangle in a face's coordinates: something a rivet has to keep off. */
interface Rect {
  readonly u0: number;
  readonly u1: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * Write one face normal per path onto paths that came out of `chains`: one
 * per kept station, in ascending station order (pointsToPath emits its
 * groups by ascending key), so `normals[i]` is the i-th kept station's. A
 * strut or a seam row then squares itself to it as to an edge rule's.
 */
function withFaces(g: Graph, id: string, paths: NodeHandle, normals: readonly Vec3[]): NodeHandle {
  const faces = g.add(
    setAttribute,
    {
      name: FACE_NORMAL,
      domain: "primitive",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(normals.map((n) => n[0])),
        indexTable(normals.map((n) => n[1])),
        indexTable(normals.map((n) => n[2])),
      ),
    },
    id,
  );
  g.connect(paths, "out", faces, "in");
  return faces;
}

/** Explicit two-point members, one path each, carrying a face normal apiece when given. */
function members(
  g: Graph,
  id: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  faces?: readonly Vec3[],
): NodeHandle {
  const lat = placedLattice(g, id, [pieces.map((p) => p[0]), pieces.map((p) => p[1])]);
  const paths = chains(lat, "Paths");
  return faces === undefined ? paths : withFaces(g, `${id}Faces`, paths, faces);
}

/** Closed rings through explicit points, all rings with the same point count. */
function loops(g: Graph, id: string, rings: ReadonlyArray<ReadonlyArray<Vec3>>): NodeHandle {
  const n = rings[0]?.length ?? 0;
  const lat = placedLattice(
    g,
    id,
    Array.from({ length: n }, (_, k) => rings.map((r) => r[k]!)),
  );
  const paths = g.add(pointsToPath, { groupAttr: "s", closed: true }, `${id}Loops`);
  g.connect(lat.stations, "out", paths, "in");
  return paths;
}

/** Square members of half-width `half` along face bars, squared to their faces. */
function faceBars(g: Graph, id: string, half: number, bars: readonly FaceBar[], planeHalf: number): NodeHandle {
  return faceSkin(
    g,
    id,
    members(
      g,
      `${id}Paths`,
      bars.map((b) => [onFace(b.f, planeHalf, b.u0, b.y0), onFace(b.f, planeHalf, b.u1, b.y1)] as const),
      bars.map((b) => b.f.n),
    ),
    half,
  );
}

/**
 * Plates and other flat-sided members as boxes that carry a `normal`
 * (`flatBars`): one box per piece, `from` to `to` its length, `thick`
 * along the piece's face normal `n` and `width` across it. meshPrimitive's
 * box writes no normal, and a merge with the swept members zero-fills it
 * (the trap that drew the apartment and the decks black).
 */
function plates(
  g: Graph,
  id: string,
  pieces: ReadonlyArray<{ readonly from: Vec3; readonly to: Vec3; readonly n: Vec3 }>,
  width: number,
  thick: number,
): NodeHandle {
  const paths = members(
    g,
    `${id}Paths`,
    pieces.map((p) => [p.from, p.to] as const),
    pieces.map((p) => p.n),
  );
  return flatBars(g, id, paths, width, thick);
}

/**
 * Level boxes that carry a `normal`: each `size` = [length along `along`
 * (a level unit vector), height, width across], centred on `c`. Boxes of
 * one height and width share a `plates` call.
 */
function levelBoxes(
  g: Graph,
  id: string,
  boxes: ReadonlyArray<{ readonly c: Vec3; readonly along: Vec3; readonly size: Vec3 }>,
): NodeHandle {
  const groups = new Map<string, Array<(typeof boxes)[number]>>();
  for (const b of boxes) {
    const key = `${b.size[1]}|${b.size[2]}`;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }
  const parts = [...groups.values()].map((list, i) =>
    plates(
      g,
      `${id}${i}`,
      list.map(({ c, along, size }) => {
        const h = size[0] / 2;
        return {
          from: [c[0] - along[0] * h, c[1], c[2] - along[2] * h] as Vec3,
          to: [c[0] + along[0] * h, c[1], c[2] + along[2] * h] as Vec3,
          n: [0, 1, 0] as Vec3,
        };
      }),
      list[0]!.size[2],
      list[0]!.size[1],
    ),
  );
  return parts.length === 1 ? parts[0]! : merge(g, id, parts);
}

/** Rivets at explicit points, each aimed (its +y) along its own direction. */
function aimedPoints(g: Graph, id: string, at: readonly Vec3[], dirs: readonly Vec3[]): NodeHandle {
  const lat = placedLattice(g, id, [at]);
  const dir = g.add(
    setAttribute,
    {
      name: "rivetDir",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(dirs.map((d) => d[0])),
        indexTable(dirs.map((d) => d[1])),
        indexTable(dirs.map((d) => d[2])),
      ),
    },
    `${id}Dir`,
  );
  const aim = g.add(
    orientAlongVector,
    { direction: attribute("rivetDir", 3), up: [0, 1, 0], axis: "+y" },
    `${id}Aim`,
  );
  g.connect(lat.stations, "out", dir, "in");
  g.connect(dir, "out", aim, "in");
  return aim;
}

/**
 * Seam runs over pieces of members' axes: each piece [a, b] cut to a whole
 * number of seam pitches, centred on it, so its rows keep at least half a
 * pitch clear of either end — off a floor the member passes through, off
 * the kink of a curved rib, where the mitred skin's concave faces meet a
 * centimetre short of the node. With `faces`, each run carries its piece's
 * face normal (`FACE_NORMAL`).
 */
function seamRuns(
  g: Graph,
  id: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  faces?: readonly Vec3[],
): NodeHandle {
  const pitch = UPRIGHT_SEAMS.pitch;
  const runs = pieces.map(([a, b], i) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const steps = Math.floor((len - pitch) / pitch);
    if (steps < 1) {
      throw new Error(
        `eiffel summit "${id}": piece ${i} is ${len.toFixed(3)} m long, too short for a seam run ` +
          `of pitch ${pitch} with half a pitch clear at each end; a piece needs at least ${2 * pitch} m`,
      );
    }
    const at = (d: number): Vec3 => {
      const t = d / len;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    };
    const from = (len - steps * pitch) / 2;
    return [at(from), at(from + steps * pitch - RUN_SHORT)] as const;
  });
  return members(g, id, runs, faces);
}

/** A point's distance outside a rectangle (0 inside). */
function outside(u: number, y: number, r: Rect): number {
  const du = Math.max(r.u0 - u, 0, u - r.u1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  return Math.hypot(du, dy);
}

/**
 * The rivets through the ends of flat bars: at each end, the first point
 * along the bar at least END_CLEAR outside every rectangle it could hide
 * in (the post, upright or girder the end lands on), and one END_PITCH
 * further; a head on each face of the bar, aimed out of it (`sides`: +1
 * the face out along the face normal, -1 the other). With `apart`, a head
 * closer than that to one already placed is left out: where two bars end
 * across each other, one rivet takes both.
 */
function barEndRivets(
  g: Graph,
  id: string,
  bars: readonly FaceBar[],
  planeHalf: number,
  barHalf: number,
  keepOff: readonly Rect[],
  apart = 0,
  sides: readonly number[] = [1, -1],
): NodeHandle | undefined {
  const at: Vec3[] = [];
  const dirs: Vec3[] = [];
  for (const b of bars) {
    const len = Math.hypot(b.u1 - b.u0, b.y1 - b.y0);
    const du = (b.u1 - b.u0) / len;
    const dy = (b.y1 - b.y0) / len;
    for (const [u0, y0, s] of [
      [b.u0, b.y0, 1],
      [b.u1, b.y1, -1],
    ] as const) {
      const clear = (a: number) =>
        keepOff.every((r) => outside(u0 + s * du * a, y0 + s * dy * a, r) >= END_CLEAR);
      let a = 0;
      while (a < len / 2 && !clear(a)) a += 0.005;
      for (const d of [a, a + END_PITCH]) {
        if (d + RIVET_HEAD > len / 2 || !clear(d)) continue;
        for (const side of sides) {
          const p = onFace(b.f, planeHalf, u0 + s * du * d, y0 + s * dy * d, side * barHalf);
          if (apart > 0 && at.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < apart)) continue;
          at.push(p);
          dirs.push([b.f.n[0] * side, 0, b.f.n[2] * side]);
        }
      }
    }
  }
  return at.length === 0 ? undefined : aimedPoints(g, id, at, dirs);
}

/**
 * One row of rivets along each run, on a plate's face: the runs already
 * sit on the face and carry its outward normal (`FACE_NORMAL`), which the
 * heads are aimed along.
 */
function faceRows(g: Graph, id: string, runs: NodeHandle): NodeHandle {
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: UPRIGHT_SEAMS.pitch },
    `${id}Samples`,
  );
  const aim = g.add(
    orientAlongVector,
    { direction: attribute(FACE_NORMAL, 3), up: [0, 1, 0], axis: "+y" },
    `${id}Aim`,
  );
  g.connect(runs, "out", samples, "in");
  g.connect(samples, "out", aim, "in");
  return aim;
}

/** A square box lattice of half-width `half` over the given levels. */
function boxLattice(g: Graph, id: string, half: number, ys: readonly number[]): Lattice {
  const levels = ys.map((y) => ({ y, x0: -half, x1: half, z0: -half, z1: half }));
  return stationLattice(g, { id, ring: squareRing(4), closed: true, levels });
}

/** The square ring's corners: squareRing(4) puts one at every 4th station. */
const isCorner = (s: number) => s % 4 === 0;

/**
 * Posts: one member up a lattice's non-corner columns (over the levels
 * `keep` allows), solid or laced [estimated: the laced post runs through
 * the nodes, as the solid one does]. A chain carries no face normal, which
 * a laced strut squares itself to, so each post is given its face's: the
 * ring segment from its station crossed with the vertical. A post meets
 * no upright, so it has no joint.
 */
function posts(
  g: Graph,
  lat: Lattice,
  id: string,
  half: number,
  detail: Detail,
  keep: StationMask = (s) => !isCorner(s),
): WebMembers {
  const paths = chains(lat, "Posts", keep);
  if (!isLaced(detail)) return { meshes: [skin(g, `${id}Skin`, paths, half, [1, 0, 0])] };
  const ring = lat.positions[0]!;
  // One normal per path: `chains` makes a path of every station `keep`
  // holds at two levels or more, and skips the rest.
  const hasPath = (s: number) => lat.positions.filter((_, k) => keep(s, k)).length >= 2;
  const normals = ring.flatMap((a, s): Vec3[] => {
    if (!hasPath(s)) return [];
    const b = ring[(s + 1) % ring.length]!;
    // (b - a) x +y: the segment is level.
    const x = a[2] - b[2];
    const z = b[0] - a[0];
    const l = Math.hypot(x, z);
    return [[x / l, 0, z / l]];
  });
  return webMembers(g, id, withFaces(g, `${id}Faces`, paths, normals), flat(half), detail);
}

/** Seam rows on the given pieces of corner columns, squared to the tower's faces like the uprights. */
function cornerSeams(
  g: Graph,
  id: string,
  name: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  detail: Detail,
): RivetSet[] {
  if (detail.rivets !== true) return [];
  const runs = seamRuns(g, `${id}Seam`, pieces);
  return [{ name, spawn: seamRivets(g, id, runs, halfWidth, [1, 0, 0], UPRIGHT_SEAMS) }];
}

/** The apartment's floor, 2.58 over the 3rd floor, where the core's columns stop. */
const apartmentFloor = FLOORS.third + GALLERY.height;
/** The balcony deck's top and underside; the glazing runs from the floor to the underside. */
const balconyTop = FLOORS.third + BALCONY.level;
const balconyUnder = balconyTop - BALCONY.deck;
/** The pavilion's roof, on the diagonal girders' foot: 2.58 + 2.27 = 4.850 over the 3rd floor [sourced PL-VII]. */
const roomTop = apartmentFloor + APARTMENT.height;

/** Panel 29: the shaft's last panel, a braced 10 m box, and its core carried up through the gallery. */
function panel29(g: Graph, detail: Detail): Parts {
  const { half, bottom, top } = PANEL29;
  const bandTop = bottom + PANEL29_BAND;
  const lightYs = PANEL29_LIGHTS.map((d) => top - d);
  const riveted = detail.rivets === true;

  // The core's columns, three levels: the panel, then on up through the
  // gallery to the balcony's beam [PL-VII Fig. 4]. The corners are the
  // uprights; the posts at the face centres (the merged b/d) go up with
  // them, the others stop at the floor. Above the deck both run on inside
  // the pavilion's walls, the corners boxed at its corners (`PAVILION`);
  // until 2026-09-26 the b/d went through the deck to the apartment's
  // floor, into the solid apartment block.
  const core = boxLattice(g, "p29", half, [bottom, top, balconyUnder]);
  const isMid = (s: number) => s % 4 === 2;
  const corners = chains(core, "Corners", (s) => isCorner(s));
  const postWeb = posts(g, core, "p29Post", P29.post, detail, (s, k) => !isCorner(s) && (isMid(s) || k < 2));

  // The web, face by face in the face's own coordinates: node columns at
  // u = -5, -2.5, 0, 2.5, 5. Every flat bar runs between the corners (and
  // the band's diamond between the side mid-points) of its CLEAR panel,
  // from post face to post face and girder to girder [PL-XIV Fig. 2, PL-VII
  // Fig. 4: the gussets sit in those corners, so the X's lean about 50
  // degrees, not the 43-47 an axis-to-axis X would].
  const bays = [-half, -half / 2, 0, half / 2, half];
  const [lightHigh, lightLow] = [lightYs[0]!, lightYs[1]!];
  // The clear panels' heights, bottom to top: the band between the shaft's
  // top horizontal and the band's plate girder, then the three X rows
  // between that girder, the light horizontals and the floor's top girder.
  const bandClear = [bottom + MEMBERS.horizontal[3]![1], bandTop - P29.plateDepth] as const;
  const rows: Array<readonly [number, number]> = [
    [bandTop, lightLow - P29.light],
    [lightLow + P29.light, lightHigh - P29.light],
    [lightHigh + P29.light, top - P29.floorDepth],
  ];
  const crosses: FaceBar[] = [];
  const band: FaceBar[] = [];
  const lights: FaceBar[] = [];
  for (const f of FACES) {
    for (let b = 0; b < 4; b++) {
      const ua = bays[b]! + P29.post;
      const ub = bays[b + 1]! - P29.post;
      // The band [PL-XIV Fig. 2, PL-VII]: an X, and a diamond through the
      // side mid-points, its sides parallel to the X's, five crossings a bay.
      const [b0, b1] = bandClear;
      const um = (ua + ub) / 2;
      const ym = (b0 + b1) / 2;
      band.push(
        { f, u0: ua, y0: b0, u1: ub, y1: b1 },
        { f, u0: ub, y0: b0, u1: ua, y1: b1 },
        { f, u0: um, y0: b0, u1: ub, y1: ym },
        { f, u0: ub, y0: ym, u1: um, y1: b1 },
        { f, u0: um, y0: b1, u1: ua, y1: ym },
        { f, u0: ua, y0: ym, u1: um, y1: b0 },
      );
      for (const [r0, r1] of rows) {
        crosses.push({ f, u0: ua, y0: r0, u1: ub, y1: r1 });
        crosses.push({ f, u0: ub, y0: r0, u1: ua, y1: r1 });
      }
      for (const y of lightYs) lights.push({ f, u0: bays[b]!, y0: y, u1: bays[b + 1]!, y1: y });
    }
  }
  const bracing = merge(g, "p29Bracing", [
    faceBars(g, "p29Cross", P29.bar, crosses, half),
    faceBars(g, "p29Band", P29.bar, band, half),
  ]);
  const lightSkin = faceBars(g, "p29Light", P29.light, lights, half);

  // The plate girders: hanging from the band's top node, and under the
  // floor's 0.25 build-up ("850" = 0.25 + "600 x 7") [PL-VII Fig. 4]. The
  // base's is the shaft's own top horizontal.
  const plates: Array<readonly [number, number]> = [
    [bandTop - P29.plateDepth, bandTop],
    [top - P29.floorDepth, top - P29.floorDepth + P29.plateDepth],
  ];
  const plateBoxes = [
    levelBoxes(
      g,
      "p29Plate",
      plates.flatMap(([y0, y1]) =>
        FACES.map((f) => ({
          c: onFace(f, half, 0, (y0 + y1) / 2),
          along: f.t,
          size: [2 * half, y1 - y0, 2 * P29.plateHalf] as Vec3,
        })),
      ),
    ),
  ];

  const rivets: RivetSet[] = [];
  if (riveted) {
    // What a flat bar's end rivet keeps off: the node columns, the plate
    // girders, the shaft's 0.60 horizontal at the base, the light angles.
    const heavy: Rect[] = [
      ...bays.map((u) => ({ u0: u - P29.post, u1: u + P29.post, y0: bottom - 1, y1: apartmentFloor })),
      ...plates.map(([y0, y1]) => ({ u0: -half, u1: half, y0, y1 })),
      { u0: -half, u1: half, y0: bottom - MEMBERS.horizontal[3]![1], y1: bottom + MEMBERS.horizontal[3]![1] },
    ];
    const lightRects: Rect[] = lights.map((b) => ({
      u0: -half,
      u1: half,
      y0: b.y0 - P29.light,
      y1: b.y0 + P29.light,
    }));
    const barRivets = [
      barEndRivets(g, "p29CrossEnds", crosses, half, P29.bar, [...heavy, ...lightRects]),
      barEndRivets(g, "p29BandEnds", band, half, P29.bar, heavy),
    ].filter((h): h is NodeHandle => h !== undefined);
    rivets.push({ name: "summit.p29.bracing", spawn: rivetSpawn(g, "p29Bar", barRivets) });
    const lightRivets = barEndRivets(g, "p29LightEnds", lights, half, P29.light, heavy);
    if (lightRivets !== undefined) {
      rivets.push({ name: "summit.p29.horizontals", spawn: rivetSpawn(g, "p29LightR", [lightRivets]) });
    }
    // The band's plate girder (the floor's is inside the floor): two rows
    // on each face, between the posts, clear of them.
    const clear = P29.post + END_CLEAR;
    const spans = [0, 1, 2, 3].map((b) => [bays[b]! + clear, bays[b + 1]! - clear] as const);
    const [py0, py1] = plates[0]!;
    const pieces: Array<readonly [Vec3, Vec3]> = [];
    const normals: Vec3[] = [];
    for (const f of FACES) {
      for (const side of [1, -1]) {
        for (const y of [py0 + 0.06, py1 - 0.06]) {
          for (const [ua, ub] of spans) {
            pieces.push([
              onFace(f, half, ua, y, side * P29.plateHalf),
              onFace(f, half, ub, y, side * P29.plateHalf),
            ]);
            normals.push([f.n[0] * side, 0, f.n[2] * side]);
          }
        }
      }
    }
    rivets.push({
      name: "summit.p29.girders",
      spawn: rivetSpawn(g, "p29Plate", [faceRows(g, "p29PlateRow", seamRuns(g, "p29PlateSeam", pieces, normals))]),
    });
  }

  // The uprights' seams, off the floor they pass through (the deck from
  // platforms.ts) and off the balcony deck they end in.
  const cornerAt = (y: number) =>
    [0, 4, 8, 12].map((s) => core.positions[0]![s]!).map((p) => [p[0], y, p[2]] as Vec3);
  // platforms.ts's deck is 0.60 thick under the floor level.
  const floorUnder = top - 0.6;
  const uprightPieces = [
    ...cornerAt(bottom).map((p, i) => [p, cornerAt(floorUnder)[i]!] as const),
    ...cornerAt(top).map((p, i) => [p, cornerAt(balconyUnder)[i]!] as const),
  ];

  return {
    uprights: [skin(g, "p29UprightSkin", corners, MEMBERS.upright, [1, 0, 0])],
    bracing: [...postWeb.meshes, bracing],
    horizontals: [lightSkin, ...plateBoxes],
    rivets: [
      ...cornerSeams(g, "p29Upright", "summit.p29.uprights", uprightPieces, MEMBERS.upright, detail),
      ...rivetOutputs({ "summit.p29.posts": postWeb }),
      ...rivets,
    ],
  };
}

/**
 * An octagon's vertices, from the +x face's -z end: round anticlockwise in
 * the plane's own (x, z) axes, so a side's outward normal is its direction
 * turned by (dx, dz) -> (dz, -dx) (`sideNormal`).
 */
function octagon(flatHalf: number, straightHalf: number, y: number): Vec3[] {
  const F = flatHalf;
  const S = straightHalf;
  return [
    [F, y, -S],
    [F, y, S],
    [S, y, F],
    [-S, y, F],
    [-F, y, S],
    [-F, y, -S],
    [-S, y, -F],
    [S, y, -F],
  ];
}

/** Points round a polygon's sides, `bays[i]` to side i, from each vertex (vertex included). */
function bayPoints(poly: readonly Vec3[], bays: (side: number) => number): Array<{ p: Vec3; side: number }> {
  const out: Array<{ p: Vec3; side: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const n = bays(i);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t], side: i });
    }
  }
  return out;
}

/** A polygon side's outward normal, for a polygon round the same way as `octagon`'s. */
function sideNormal(poly: readonly Vec3[], i: number): Vec3 {
  const a = poly[i]!;
  const b = poly[(i + 1) % poly.length]!;
  return unit([b[2] - a[2], 0, a[0] - b[0]]);
}

/**
 * A solid slab whose plan is an octagon — a square `2 flatHalf` wide with
 * its corners cut at 45 degrees to straight sides of `2 straightHalf`:
 * two crossed boxes, and one box on each chamfer that reaches in past the
 * cross, all carrying normals (`levelBoxes`).
 */
function octagonSlab(
  g: Graph,
  id: string,
  flatHalf: number,
  straightHalf: number,
  y0: number,
  height: number,
): NodeHandle {
  const yc = y0 + height / 2;
  const cut = flatHalf + straightHalf; // |x| + |z| on a chamfer
  const depth = (2 * flatHalf - cut) / Math.SQRT2;
  const length = Math.SQRT2 * (flatHalf - straightHalf);
  const r = cut / Math.SQRT2 - depth / 2;
  const s = Math.SQRT1_2;
  return levelBoxes(g, id, [
    { c: [0, yc, 0], along: [1, 0, 0], size: [2 * flatHalf, height, 2 * straightHalf] },
    { c: [0, yc, 0], along: [0, 0, 1], size: [2 * flatHalf, height, 2 * straightHalf] },
    // Each chamfer's box: `depth` out along its diagonal, `length` along it.
    ...[
      [s, s],
      [-s, s],
      [-s, -s],
      [s, -s],
    ].map(([dx, dz]) => ({
      c: [dx! * r, yc, dz! * r] as Vec3,
      along: [-dz!, 0, dx!] as Vec3,
      size: [length, height, depth] as Vec3,
    })),
  ]);
}

/**
 * A convex outline on a level, wound anticlockwise seen from above, to be
 * extruded up by `depth`: a slab, a wall, a partition, a post.
 */
export interface Slab {
  readonly outline: readonly Vec3[];
  readonly depth: number;
}

/** An axis-aligned box as a `Slab`: x0..x1, z0..z1, y0 up to y1. */
function boxSlab(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): Slab {
  if (!(x1 > x0 && z1 > z0 && y1 > y0)) {
    throw new Error(`summit: boxSlab [${x0}, ${x1}] x [${z0}, ${z1}] x [${y0}, ${y1}]: every extent must be positive`);
  }
  return {
    outline: [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y0, z0],
      [x0, y0, z0],
    ],
    depth: y1 - y0,
  };
}

/** A plan point (s, t) of the diagonals' frame (s toward pile 3, +x -z; t toward pile 4, +x +z) on (x, z). */
const fromST = (s: number, t: number): [number, number] => [(s + t) * Math.SQRT1_2, (t - s) * Math.SQRT1_2];

/** A rectangular opening in the diagonals' frame: s0..s1 along the N-S diagonal, t0..t1 across it. */
export interface Well {
  readonly s: readonly [number, number];
  readonly t: readonly [number, number];
}

/** A convex polygon (s, t) clipped to the box s0..s1, t0..t1 (Sutherland-Hodgman). */
function clipST(poly: ReadonlyArray<readonly [number, number]>, s0: number, s1: number, t0: number, t1: number): Array<[number, number]> {
  let out = poly.map((p): [number, number] => [p[0], p[1]]);
  const planes: Array<[0 | 1, number, 1 | -1]> = [
    [0, s0, 1],
    [0, s1, -1],
    [1, t0, 1],
    [1, t1, -1],
  ];
  for (const [k, v, sign] of planes) {
    const inside = (p: [number, number]) => sign * (p[k] - v) >= -1e-9;
    const next: Array<[number, number]> = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i]!;
      const b = out[(i + 1) % out.length]!;
      if (inside(a)) next.push(a);
      if (inside(a) !== inside(b)) {
        const f = (v - a[k]) / (b[k] - a[k]);
        next.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
    }
    out = next;
    if (out.length === 0) break;
  }
  return out;
}

/**
 * A slab over a convex plan (x, z points) less rectangular wells in the
 * diagonals' frame, as convex pieces (platforms.ts's `floorWithWells`,
 * which that module keeps to itself): the plan cut into bands at the
 * wells' edges across the diagonal, each band into the spans between the
 * wells it crosses. Every piece is wound anticlockwise seen from above.
 */
function slabWithWells(
  plan: ReadonlyArray<readonly [number, number]>,
  wells: readonly Well[],
  y0: number,
  y1: number,
): Slab[] {
  const big = 1e3;
  const st = plan.map(([x, z]): [number, number] => [(x - z) * Math.SQRT1_2, (x + z) * Math.SQRT1_2]);
  const ts = [-big, big, ...wells.flatMap((w) => [w.t[0], w.t[1]])].sort((a, b) => a - b);
  const out: Slab[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const [ta, tb] = [ts[i]!, ts[i + 1]!];
    if (tb - ta < 1e-9) continue;
    const mid = (ta + tb) / 2;
    const cut = wells
      .filter((w) => mid > w.t[0] && mid < w.t[1])
      .map((w) => w.s)
      .sort((a, b) => a[0] - b[0]);
    const spans: Array<[number, number]> = [];
    let from = -big;
    for (const [c0, c1] of cut) {
      if (c0 > from) spans.push([from, c0]);
      from = Math.max(from, c1);
    }
    spans.push([from, big]);
    for (const [sa, sb] of spans) {
      const piece = clipST(st, sa, sb, ta, tb);
      if (piece.length < 3) continue;
      const xz = piece.map(([s, t]) => fromST(s, t));
      let area = 0;
      for (let k = 0; k < xz.length; k++) {
        const [x0, z0] = xz[k]!;
        const [x1, z1] = xz[(k + 1) % xz.length]!;
        area += x0 * z1 - x1 * z0;
      }
      if (Math.abs(area) < 1e-6) continue;
      if (area > 0) xz.reverse();
      out.push({ outline: xz.map(([x, z]): Vec3 => [x, y0, z]), depth: y1 - y0 });
    }
  }
  return out;
}

/** An octagon's plan (x, z), a square `2 flatHalf` across with 45-degree chamfers to straight sides `2 straightHalf`. */
function octagonPlan(flatHalf: number, straightHalf: number): Array<[number, number]> {
  return octagon(flatHalf, straightHalf, 0).map(([x, , z]): [number, number] => [x, z]);
}

/**
 * Slabs as one mesh, each outline a closed path extruded straight up by its
 * depth: every wall and cap gets its own points and a flat `normal`, which
 * the summit class needs (a merge with the swept members zero-fills a
 * missing one). Cooked in runs of at most 1024 points, as platforms.ts's
 * `prisms` are, since an index table's lookup scans its stops.
 */
function slabs(g: Graph, id: string, list: readonly Slab[]): NodeHandle {
  const runs: Slab[][] = [[]];
  let count = 0;
  for (const p of list) {
    if (count + p.outline.length > 1024 && runs[runs.length - 1]!.length > 0) {
      runs.push([]);
      count = 0;
    }
    runs[runs.length - 1]!.push(p);
    count += p.outline.length;
  }
  const meshes = runs.map((run, r) => {
    const rid = runs.length === 1 ? id : `${id}Run${r}`;
    const pts = run.flatMap((p) => p.outline);
    const slots = g.add(
      pointGrid,
      { countX: pts.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
      `${rid}Slots`,
    );
    const place = g.add(
      setAttribute,
      {
        name: "P",
        type: "f32",
        tupleSize: 3,
        value: vec(
          indexTable(pts.map((p) => p[0])),
          indexTable(pts.map((p) => p[1])),
          indexTable(pts.map((p) => p[2])),
        ),
      },
      `${rid}Place`,
    );
    const key = g.add(
      setAttribute,
      { name: "slab", type: "i32", value: indexTable(run.flatMap((p, i) => p.outline.map(() => i))) },
      `${rid}Key`,
    );
    const len = g.add(
      setAttribute,
      { name: "depth", type: "f32", value: indexTable(run.flatMap((p) => p.outline.map(() => p.depth))) },
      `${rid}Depth`,
    );
    const paths = g.add(pointsToPath, { groupAttr: "slab", closed: true }, `${rid}Paths`);
    const solid = g.add(extrudePolygon, { direction: "+y", distance: attribute("depth"), caps: "both" }, rid);
    g.connect(slots, "out", place, "in");
    g.connect(place, "out", key, "in");
    g.connect(key, "out", len, "in");
    g.connect(len, "out", paths, "in");
    g.connect(paths, "out", solid, "in");
    return solid;
  });
  return meshes.length === 1 ? meshes[0]! : merge(g, id, meshes);
}

// ---------------------------------------------------------------- the gallery

/**
 * The gallery's bays, "croisées anglaises" [sourced E1900-TXT's cost table,
 * « Croisées anglaises (Lepage) … 250 la pièce … 6.000,00 »: 24 at 250 fr;
 * the OCR's "21" is a misread, and 24 is what the plans draw]. Along a
 * 10.90 straight side the posts stand 0.200 / 0.700 from each vertex, a
 * 0.50 solid corner pier between them, then at 2.950, 5.450 (the face's
 * axis), 7.950 and 10.200 [sourced PL-XIV Figs 8, 10], so four glazed bays
 * of 2.25 / 2.50 / 2.50 / 2.25; a chamfer has one post at its middle
 * [sourced "1.9796" on a 3.9592 chamfer], two bays. 4 x 4 + 4 x 2 = 24
 * [derived]. The pier is built solid from the vertex, the 0.20 at the
 * vertex being the chamfer's corner post [estimated]. Each bay is one sash
 * window of two lights, its sashes meeting at mid-height, « des glaces
 * mobiles que l'on peut élever ou abaisser » [sourced p. 216; PL-XIX Fig. 3
 * draws two lights a bay].
 */
const GALLERY_POSTS = { straight: [0.7, 2.95, 5.45, 7.95, 10.2], pier: 0.7 } as const;

/**
 * The gallery's heights over the 3rd floor [sourced PL-XIV Fig. 7, PL-VII
 * Fig. 4: the parapet "Tôle de 1.200 x 3" with "Corn. 40 x 40 x 4" riveted
 * on it, the window "1.030", the "sablière" 0.200 (a U of 200 x 4) under
 * the balcony's deck, 1.20 + 1.03 + 0.20 = 2.43]. The parapet is solid —
 * « une paroi en bois et fer, formant un garde-corps de 1,20 m de hauteur
 * », the « paroi pleine du garde-corps » [sourced pp. 79, 215] — with its
 * lattice on the outside; built 0.05 thick with its lining [estimated].
 */
const GALLERY_WALL = { window: 1.03, sablière: 0.2, sheet: 0.05, sash: 0.02 } as const;

/**
 * The upper terrace's railing (the balcony): « trois fers ronds formant les
 * lisses du garde-corps de la terrasse » on the window posts continued
 * [sourced p. 79], "Rond de 25 mm" at the top and "Rond de 20 mm" below, at
 * 1.000, 0.600 and 0.150 over the sablière's top [sourced PL-XIV Fig. 7,
 * the last digit read from the total]. Until 2026-09-26: two rails.
 */
const BALCONY_RAILS = [
  { at: 0.15, half: 0.01 },
  { at: 0.6, half: 0.01 },
  { at: 1.0, half: 0.0125 },
] as const;

/** A post round the gallery's octagon: its point on the glass line, its side, and whether it is a vertex. */
interface GalleryPost {
  readonly p: Vec3;
  readonly side: number;
  readonly u: number;
}

/**
 * The gallery's posts on an octagon at height y (`octagon`'s order: even
 * sides straight, odd sides chamfers), and its glazed bays as [from, to]
 * along each side, `u` measured from the side's first vertex.
 */
export function galleryLayout(y = FLOORS.third): {
  readonly posts: GalleryPost[];
  readonly bays: Array<{ side: number; u0: number; u1: number }>;
  readonly piers: Array<{ side: number; u0: number; u1: number }>;
} {
  const poly = octagon(GALLERY.flat, GALLERY.straight, y);
  const posts: GalleryPost[] = [];
  const bays: Array<{ side: number; u0: number; u1: number }> = [];
  const piers: Array<{ side: number; u0: number; u1: number }> = [];
  for (let i = 0; i < 8; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % 8]!;
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const at = (u: number): Vec3 => [a[0] + ((b[0] - a[0]) * u) / L, y, a[2] + ((b[2] - a[2]) * u) / L];
    const us = i % 2 === 0 ? [0, ...GALLERY_POSTS.straight] : [0, L / 2];
    for (const u of us) posts.push({ p: at(u), side: i, u });
    if (i % 2 === 0) {
      piers.push({ side: i, u0: 0, u1: GALLERY_POSTS.pier }, { side: i, u0: L - GALLERY_POSTS.pier, u1: L });
      const s = GALLERY_POSTS.straight;
      for (let k = 0; k + 1 < s.length; k++) bays.push({ side: i, u0: s[k]!, u1: s[k + 1]! });
    } else {
      bays.push({ side: i, u0: 0, u1: L / 2 }, { side: i, u0: L / 2, u1: L });
    }
  }
  return { posts, bays, piers };
}

/** Eiffel's balcony's deck: the gallery's octagon grown by the overhang, less `ROOM_WELLS`. */
export function balconyDeckSlabs(): Slab[] {
  const grow = BALCONY.overhang;
  const bFlat = GALLERY.flat + grow;
  const bStraight = GALLERY.straight + grow * Math.tan(Math.PI / 8);
  return slabWithWells(octagonPlan(bFlat, bStraight), ROOM_WELLS, balconyUnder, balconyTop);
}

/** A point `u` along side `i` of an octagon, `off` out of its line (outward positive). */
function onSide(poly: readonly Vec3[], i: number, u: number, y: number, off = 0): Vec3 {
  const a = poly[i]!;
  const b = poly[(i + 1) % poly.length]!;
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = sideNormal(poly, i);
  return [a[0] + ((b[0] - a[0]) * u) / L + n[0] * off, y, a[2] + ((b[2] - a[2]) * u) / L + n[2] * off];
}

/** A vertical panel along side `i` of an octagon, u0..u1, y0..y1, between `in0` and `in1` inside its line. */
function sidePanel(poly: readonly Vec3[], i: number, u0: number, u1: number, y0: number, y1: number, in0: number, in1: number): Slab {
  const ring = [onSide(poly, i, u0, y0, -in0), onSide(poly, i, u1, y0, -in0), onSide(poly, i, u1, y0, -in1), onSide(poly, i, u0, y0, -in1)];
  return anticlockwise({ outline: ring, depth: y1 - y0 });
}

/** A slab with its outline wound anticlockwise seen from above (+y), whichever way it was given. */
function anticlockwise(s: Slab): Slab {
  let area = 0;
  const o = s.outline;
  for (let k = 0; k < o.length; k++) {
    const p = o[k]!;
    const q = o[(k + 1) % o.length]!;
    area += p[0] * q[2] - q[0] * p[2];
  }
  // (x, z) with y up: x cross z is -y, so an anticlockwise ring seen from
  // above has a negative x-z area.
  return area > 0 ? { outline: [...o].reverse(), depth: s.depth } : s;
}

/**
 * The glazed gallery round the 3rd floor and Eiffel's balcony on its roof
 * (header, items 2-3): the posts, the solid corner piers, the parapet's
 * sheet with its lattice outside it, the sill, the sablière, each bay's
 * sash bars (the panes are `summitGlass`'s), and the balcony's deck and
 * railing.
 */
function gallery(g: Graph): NodeHandle[] {
  const y0 = FLOORS.third;
  const deckUnder = balconyUnder;
  const glass = octagon(GALLERY.flat, GALLERY.straight, y0);
  const { posts, bays, piers } = galleryLayout(y0);
  const frame = GALLERY_MEMBERS.frame;
  const sill = y0 + GALLERY.parapet;
  const head = sill + GALLERY_WALL.window;

  // The posts, floor to the balcony's deck.
  const mullions = faceSkin(
    g,
    "galleryMullion",
    members(
      g,
      "galleryMullionPaths",
      posts.map(({ p }) => [p, [p[0], deckUnder, p[2]]] as const),
      posts.map(({ side }) => sideNormal(glass, side)),
    ),
    frame,
  );
  // The floor rail, the sill on the parapet, and the sablière under the
  // deck, which is the windows' head.
  const rails = merge(g, "galleryRails", [
    skin(g, "galleryRailSkin", loops(g, "galleryRailLoops", [y0 + frame, sill].map((y) => glass.map((p) => [p[0], y, p[2]] as Vec3))), frame, [0, 1, 0]),
    skin(g, "gallerySabliereSkin", loops(g, "gallerySabliereLoop", [glass.map((p) => [p[0], (head + deckUnder) / 2, p[2]] as Vec3)]), (deckUnder - head) / 2, [0, 1, 0]),
  ]);

  // The parapet's sheet in every bay and the piers' full height, just
  // inside the posts and rails; the lattice on the sheet's outer face.
  const sIn0 = frame;
  const sIn1 = frame + GALLERY_WALL.sheet;
  const sheets: Slab[] = [
    ...bays.map((b) => sidePanel(glass, b.side, b.u0 + frame, b.u1 - frame, y0, sill, sIn0, sIn1)),
    ...piers.map((b) => sidePanel(glass, b.side, b.u0 + frame, b.u1 - frame, y0, head, sIn0, sIn1)),
  ];
  const latticeIn = frame - GALLERY_MEMBERS.lattice;
  const lattice: Array<readonly [Vec3, Vec3]> = [];
  const latticeN: Vec3[] = [];
  const ya = y0 + 2 * frame;
  const yb = sill - frame;
  for (const b of bays) {
    const n = sideNormal(glass, b.side);
    const [p0, p1] = [b.u0 + frame, b.u1 - frame];
    lattice.push(
      [onSide(glass, b.side, p0, ya, -latticeIn), onSide(glass, b.side, p1, yb, -latticeIn)],
      [onSide(glass, b.side, p1, ya, -latticeIn), onSide(glass, b.side, p0, yb, -latticeIn)],
    );
    latticeN.push(n, n);
  }
  const parapet = faceSkin(g, "galleryLattice", members(g, "galleryLatticePaths", lattice, latticeN), GALLERY_MEMBERS.lattice);

  // Each croisée: the two lights' bar and the sashes' meeting rail, on the
  // glass line between the sill and the sablière.
  const sashBars: Array<readonly [Vec3, Vec3]> = [];
  const sashN: Vec3[] = [];
  const meet = (sill + frame + head) / 2;
  for (const b of bays) {
    const n = sideNormal(glass, b.side);
    const mid = (b.u0 + b.u1) / 2;
    sashBars.push(
      [onSide(glass, b.side, mid, sill + frame), onSide(glass, b.side, mid, head)],
      [onSide(glass, b.side, b.u0 + frame, meet), onSide(glass, b.side, b.u1 - frame, meet)],
    );
    sashN.push(n, n);
  }
  const sash = faceSkin(g, "gallerySash", members(g, "gallerySashPaths", sashBars, sashN), GALLERY_WALL.sash);

  // The balcony: the deck overhanging the glass, open where the Edoux, the
  // cables, the little stair and the contrefiches pass (`ROOM_WELLS`), and
  // its railing on the window posts continued [PL-XIV Fig. 2: the rail post
  // continues the mullion; PL-VII draws the rail's ends at +-8.2-8.3].
  const deck = slabs(g, "balconyDeck", balconyDeckSlabs());
  const m = BALCONY.member;
  const railPosts = faceSkin(
    g,
    "balconyPost",
    members(
      g,
      "balconyPostPaths",
      posts.map(({ p }) => [[p[0], balconyTop, p[2]], [p[0], balconyTop + BALCONY.railing, p[2]]] as const),
      posts.map(({ side }) => sideNormal(glass, side)),
    ),
    m,
  );
  const railRails = merge(
    g,
    "balconyRails",
    BALCONY_RAILS.map((r, i) =>
      skin(
        g,
        `balconyRailSkin${i}`,
        loops(g, `balconyRailLoop${i}`, [glass.map((p) => [p[0], balconyTop + r.at, p[2]] as Vec3)]),
        r.half,
        [0, 1, 0],
      ),
    ),
  );
  return [mullions, rails, slabs(g, "galleryParapet", sheets), parapet, sash, deck, railPosts, railRails];
}

// ---------------------------------------------------------------- the pavilion

/**
 * Eiffel's pavilion, the « pavillon carré en bois, de 10,50 m de côté » on
 * the 4th platform [sourced E1900-TXT p. 216; PL-XIX Fig. 6 "10.500"]:
 * « un salon de réception avec cabinet de toilette, cuisine et
 * water-closet, ainsi que quatre petits laboratoires … d'électricité, de
 * météorologie, de physique et de physiologie », with « l'emplacement de la
 * cage d'ascenseur prolongée »; « La hauteur est de 2,27 m; la toiture,
 * presque horizontale, est garnie de plomb. Les parois sont doubles et
 * munies à l'intérieur de coton minéral » [sourced p. 216]. The plan is
 * PL-XIX Fig. 6, « Plan du logement de Monsieur Eiffel » (1:200, read at
 * 60 px/m on its printed 10.00 and 10.500; SOURCES.md §29): its Seine side
 * is +z, as for PL-XIX Fig. 8 (§23.1), and its cage lands on the upper
 * car's line, s = -2.65, which is the check that the plan is turned right.
 *
 * - `side`: outside the walls [sourced]; they stand on the corner uprights'
 *   outer faces (5.00 + 0.25, [derived]), so the four uprights, and the
 *   « poutre double à treillis … logée dans l'intérieur des parois en bois
 *   … hauteur de 2,56 m » that ties them [sourced p. 79], are inside the
 *   walls.
 * - `wall`: the double wall's thickness [estimated: the plate draws its
 *   line weight, 0.08-0.10, and the girder in it needs more].
 * - `casing`: the corner upright (0.50 square) boxed in [derived].
 * - `roof`, `roofDepth`: the roof's square, "Toiture du logement … 10.680"
 *   [sourced PL-XIX Fig. 5], 0.09 over the walls; its depth, « des fers de
 *   100 mm qui s'attachent sur la membrure inférieure des grandes poutres
 *   diagonales et reçoivent un lambrissage recouvert de plomb » [sourced
 *   p. 79], its top on the girders' underside, "314.48" [sourced PL-VII].
 * - `partition`: a partition's thickness [estimated].
 * - `window`: a two-light window, 0.87 wide, sill 1.06 and head 1.92 over
 *   the floor [measured PL-XIX Fig. 3]; `door`, a full-height opening 0.89
 *   wide, 1.95 tall [measured PL-XIX Fig. 3, read as a glazed door]; the
 *   inner doors [estimated].
 */
export const PAVILION = {
  side: 10.5,
  wall: 0.25,
  casing: 0.5,
  roof: 10.68,
  roofDepth: 0.1,
  partition: 0.08,
  window: { width: 0.87, sill: 1.06, head: 1.92 },
  door: { width: 0.89, head: 1.95 },
  innerDoor: 2.0,
  sash: 0.02,
} as const;

/**
 * Each outer wall's openings, as (centre along the face's `u`, W window or
 * D door), in `FACES` order (+z, +x, -z, -x). Measured on PL-XIX Fig. 6,
 * ±0.15 [measured, 60 px/m]: six a wall, window-door-window either side of
 * a solid centre panel, which PL-XIX Fig. 3's elevation confirms (four
 * two-light windows and two doors a face). On the -x wall the last window
 * is set at 3.70 against the plan's 3.825, 0.125 in, to clear the cabinet
 * de toilette's partition, which meets the wall there [estimated]. The
 * extra opening the +x wall draws at 4.46-4.91 from its end (likely the
 * door onto the terrace) is not built.
 */
const PAVILION_OPENINGS: ReadonlyArray<ReadonlyArray<readonly [number, "W" | "D"]>> = [
  [[-3.555, "W"], [-2.46, "D"], [-1.325, "W"], [1.4, "W"], [2.55, "D"], [3.7, "W"]],
  [[3.485, "W"], [2.46, "D"], [1.47, "W"], [-1.36, "W"], [-2.57, "D"], [-3.755, "W"]],
  [[3.61, "W"], [2.5, "D"], [1.31, "W"], [-1.25, "W"], [-2.455, "D"], [-3.505, "W"]],
  [[-3.595, "W"], [-2.385, "D"], [-1.285, "W"], [1.41, "W"], [2.66, "D"], [3.7, "W"]],
];

/**
 * The openings the 4th platform's deck and the pavilion's floor leave, in
 * the diagonals' frame (s toward pile 3, t toward pile 4):
 *
 * - THE EDOUX. At its top stop the upper car's floor is the 3rd floor and
 *   its body stands 3.52 over it, to 279.65 (lifts.ts, cooked: body s
 *   -4.435 to -0.865, t +-1.95; its roof frame and tensioners, |t| <= 0.3,
 *   to s -4.79 and -0.51 up to 278.66), so the floors open over it, 0.05
 *   clear [derived]. PL-XIX Fig. 6 prints the cage round it "3.90" by
 *   "4.210" [sourced]: 4.21 along the car's line, 3.90 across, which is the
 *   car's own width; the model's cage clears the car's cables and rods by
 *   0.02-0.05 and its body by 0.05, so it is 4.20 x 4.00 clear.
 * - THE LOWER CAR'S CABLES, from the pulleys in the continuous girder at s
 *   +0.57-0.66 and +4.64-4.73, t +-0.10 (lifts.ts): a slot 0.05 clear; the
 *   outer pair drop beside the « Poteau-guide des câbles 390 x 580 » that
 *   runs up to the girder's foot at s +4.682 (lifts.ts; PL-XX Figs 1-2),
 *   whose opening takes them too, and the inner pair beside the light guide
 *   at s +0.49-0.75, t +-0.13 (lifts.ts), each 0.05 clear.
 * - THE LITTLE STAIR from the 3rd floor, « un petit escalier tournant »
 *   [sourced p. 216], "1.60" across [sourced PL-XIX Fig. 6], centred 1.85
 *   out on the +x axis [measured PL-XIX Figs 6, 9: +1.83, +1.87]: the
 *   stairs' item builds it; its square well is here.
 * - THE CONTREFICHES (`CONTREFICHE`), where each crosses the deck and the
 *   floor [derived from their line, 0.07 clear].
 */
export const ROOM_WELLS: readonly Well[] = [
  { s: [-4.75, -0.55], t: [-2.0, 2.0] },
  { s: [-4.86, -0.44], t: [-0.35, 0.35] },
  { s: [0.438, 0.798], t: [-0.18, 0.18] },
  { s: [4.437, 4.927], t: [-0.34, 0.34] },
  { s: [1.308 - 0.85, 1.308 + 0.85], t: [1.308 - 0.85, 1.308 + 0.85] },
  { s: [5.4, 6.45], t: [-0.45, 0.45] },
  { s: [-6.45, -5.4], t: [-0.45, 0.45] },
  { s: [-0.45, 0.45], t: [5.4, 6.45] },
  { s: [-0.45, 0.45], t: [-6.45, -5.4] },
];

/**
 * The openings in the pavilion's roof, which the girders stand on: the
 * contrefiches' heads [derived, 0.1 clear] and the cables' middle pairs,
 * which drop from the pulleys to both cars, the Sud pair beside its light
 * guide [lifts.ts; 0.05 clear]. The outer pairs, and the Sud guide post,
 * rise inside the contrefiches' openings.
 */
const ROOF_WELLS: readonly Well[] = [
  { s: [4.3, 5.25], t: [-0.45, 0.45] },
  { s: [-5.25, -4.3], t: [-0.45, 0.45] },
  { s: [-0.45, 0.45], t: [4.3, 5.25] },
  { s: [-0.45, 0.45], t: [-5.25, -4.3] },
  { s: [0.438, 0.798], t: [-0.18, 0.18] },
  { s: [-0.71, -0.52], t: [-0.15, 0.15] },
];

/**
 * The partitions, in the diagonals' frame or square to the faces, and the
 * inner doors in them. From PL-XIX Fig. 6 [measured, 60 px/m, ±0.15],
 * straightened to the plan's two directions, each clipped to the walls'
 * inner faces:
 *
 * - THE CAGE round the Edoux, its walls outside `ROOM_WELLS`' first
 *   opening (4.20 x 4.00 clear against the printed 4.21 x 3.90; above).
 * - SALON | CUISINE and OFFICE, s = 3.43 from the -z wall (where it meets
 *   the wall at x -0.15, in its solid centre panel) to the office's wall,
 *   and SALON | PHYSIOLOGIE, t = -0.45 from the cage [the plan's two walls
 *   (5.16, 0.47)-(7.28, 2.43) and (7.28, 2.43)-(4.66, 5.43), which meet
 *   the cage's side].
 * - CUISINE | OFFICE, t = -2.23 to the -z wall at x 1.85, between its
 *   openings [the plan's kitchen, x 5.2-7.3 along that wall].
 * - OFFICE | W.C. and COFFRE, t = 0.66 to the +x wall at z -4.12, and the
 *   W.C. and the coffre, s 2.30-3.40 and 3.40-4.60, t 0.66-1.80 [the
 *   plan's W.C. at x 7.5-8.8, y 3.0-4.0, the coffre at x 9-10, y 3.3-4.0].
 * - PHYSIOLOGIE | the two unnamed rooms, z = 1.96 from the cage to the +x
 *   wall, and between those two, x = 1.97 to the +z wall [the plan's 7.3
 *   and 7.0, and its "3.50" from the cage's corner; both set between the
 *   walls' openings].
 * - CABINET DE TOILETTE | OPTIQUE, t = -0.55 beyond the cage's end, clear
 *   of the contrefiche [the plan's "Cabinet de toilette" strip along the -x
 *   wall and "Optique" in the corner].
 *
 * The text's four laboratories are électricité, météorologie, physique
 * and physiologie; the plate names only "Physiologie" and "Optique". So
 * optique is read as physique, and the two unnamed rooms as électricité
 * and météorologie, in no known order [inference].
 */
export function pavilionPlan(): {
  readonly partitions: Array<{ readonly name: string; readonly outline: Array<[number, number]>; readonly doors: Array<{ readonly from: Vec3; readonly to: Vec3 }>; readonly top?: number }>;
  readonly rooms: Array<{ readonly name: string; readonly at: readonly [number, number] }>;
} {
  const th = PAVILION.partition / 2;
  const inner = PAVILION.side / 2 - PAVILION.wall;
  const square: Array<[number, number]> = [
    [inner, -inner],
    [inner, inner],
    [-inner, inner],
    [-inner, -inner],
  ];
  const clip = (poly: Array<[number, number]>): Array<[number, number]> => clipXZ(poly, square);
  const st = (s0: number, s1: number, t0: number, t1: number) =>
    clip(([[s0, t0], [s1, t0], [s1, t1], [s0, t1]] as const).map(([s, t]) => fromST(s, t)));
  const xz = (x0: number, x1: number, z0: number, z1: number): Array<[number, number]> =>
    clip([
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ]);
  // A door in a wall along s (at t) or along t (at s), or square to the
  // faces: its centre along the wall, and its width.
  const along = (axis: "s" | "t" | "x" | "z", fixed: number, c: number, w: number) => {
    const pt = (v: number): Vec3 => {
      if (axis === "s") {
        const [x, z] = fromST(v, fixed);
        return [x, 0, z];
      }
      if (axis === "t") {
        const [x, z] = fromST(fixed, v);
        return [x, 0, z];
      }
      return axis === "x" ? [v, 0, fixed] : [fixed, 0, v];
    };
    return { from: pt(c - w / 2), to: pt(c + w / 2) };
  };
  const partitions: Array<{ name: string; outline: Array<[number, number]>; doors: Array<{ from: Vec3; to: Vec3 }>; top?: number }> = [
    // The cage: its two ends across the car's line, its two sides along it.
    // The Nord end stops under the contrefiche's head, which passes over it
    // into the cage (`CONTREFICHE`: its underside at 280.24-280.28 there).
    { name: "cage.nord", outline: st(-4.75 - 2 * th, -4.75, -2.0 - 2 * th, -0.45), doors: [] },
    { name: "cage.nord", outline: st(-4.75 - 2 * th, -4.75, 0.45, 2.0 + 2 * th), doors: [] },
    { name: "cage.nord.under", outline: st(-4.75 - 2 * th, -4.75, -0.45, 0.45), doors: [], top: cageUnderStrut() },
    { name: "cage.sud", outline: st(-0.55, -0.55 + 2 * th, -2.0 - 2 * th, 2.0 + 2 * th), doors: [] },
    { name: "cage.ouest", outline: st(-4.75, -0.55, 2.0, 2.0 + 2 * th), doors: [] },
    { name: "cage.est", outline: st(-4.75, -0.55, -2.0 - 2 * th, -2.0), doors: [] },
    {
      name: "salon|cuisine,office",
      outline: st(3.43 - th, 3.43 + th, -8, 0.66 + th),
      doors: [along("t", 3.43, -2.95, 0.8), along("t", 3.43, -1.35, 0.8), along("t", 3.43, 0.105, 0.7)],
    },
    { name: "salon|physiologie", outline: st(-0.55, 3.43 - th, -0.45 - th, -0.45 + th), doors: [along("s", -0.45, 1.2, 0.8)] },
    { name: "cuisine|office", outline: st(3.43 + th, 8, -2.23 - th, -2.23 + th), doors: [along("s", -2.23, 4.1, 0.7)] },
    { name: "office|wc,coffre", outline: st(2.3 - th, 8, 0.66 - th, 0.66 + th), doors: [] },
    { name: "wc", outline: st(2.3 - th, 2.3 + th, 0.66 + th, 1.8 - th), doors: [] },
    { name: "wc|coffre", outline: st(3.4 - th, 3.4 + th, 0.66 + th, 1.8 - th), doors: [] },
    { name: "coffre", outline: st(4.6 - th, 4.6 + th, 0.66 + th, 1.8 - th), doors: [] },
    {
      name: "physiologie|wc,coffre",
      outline: st(2.3 - th, 4.6 + th, 1.8 - th, 1.8 + th),
      doors: [along("s", 1.8, 2.85, 0.6), along("s", 1.8, 4.0, 0.6)],
    },
    {
      name: "physiologie|laboratoires",
      outline: xz(0.9, inner, 1.96 - th, 1.96 + th),
      doors: [along("x", 1.96, 1.47, 0.7), along("x", 1.96, 3.3, 0.8)],
    },
    { name: "laboratoires", outline: xz(1.97 - th, 1.97 + th, 1.96 + th, inner), doors: [along("z", 1.97, 3.5, 0.8)] },
    { name: "toilette|optique", outline: st(-8, -4.75 - 2 * th, -0.55 - th, -0.55 + th), doors: [along("s", -0.55, -5.6, 0.6)] },
  ];
  const rooms = (
    [
      ["salon", fromST(1.5, -2.5)],
      ["cuisine", fromST(3.9, -2.9)],
      ["office", fromST(5.0, -1.0)],
      ["water-closet", fromST(2.85, 1.2)],
      ["coffre", fromST(4.0, 1.2)],
      ["physiologie", fromST(1.0, 3.0)],
      ["électricité", [0.5, 3.5]],
      ["météorologie", [3.5, 3.5]],
      ["physique (optique)", fromST(-5.8, 0.8)],
      ["cabinet de toilette", fromST(-5.6, -1.2)],
      ["cage d'ascenseur", fromST(-2.65, 0)],
    ] as const
  ).map(([name, at]) => ({ name, at: [at[0], at[1]] as const }));
  return { partitions, rooms };
}

/**
 * How high the cage's Nord end stands under the contrefiche's head: the
 * strut's underside over the wall's outer face, less 0.05 [derived from
 * `CONTREFICHE`: about 280.08].
 */
function cageUnderStrut(): number {
  const C = CONTREFICHE;
  const [dh, yh] = C.head;
  const [df, yf] = C.foot;
  const L = Math.hypot(df - dh, yf - yh);
  const u = [(df - dh) / L, (yf - yh) / L];
  // The box's lower face, half its depth under the axis along its normal
  // (-u_y, u_x).
  const lo = [dh + u[1]! * (C.depth / 2), yh - u[0]! * (C.depth / 2)];
  const at = 4.75 + PAVILION.partition;
  return lo[1]! + ((at - lo[0]!) / u[0]!) * u[1]! - 0.05;
}

/** A convex polygon (x, z) clipped to a convex window (Sutherland-Hodgman, both anticlockwise or both clockwise). */
function clipXZ(poly: ReadonlyArray<readonly [number, number]>, window: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  let out = poly.map((p): [number, number] => [p[0], p[1]]);
  // The window's own winding decides which side is inside.
  let area = 0;
  for (let k = 0; k < window.length; k++) {
    const a = window[k]!;
    const b = window[(k + 1) % window.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = Math.sign(area);
  for (let k = 0; k < window.length; k++) {
    const a = window[k]!;
    const b = window[(k + 1) % window.length]!;
    const side = (p: readonly [number, number]) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const next: Array<[number, number]> = [];
    for (let i = 0; i < out.length; i++) {
      const p = out[i]!;
      const q = out[(i + 1) % out.length]!;
      const sp = side(p);
      const sq = side(q);
      if (sp >= -1e-9) next.push(p);
      if ((sp >= -1e-9) !== (sq >= -1e-9)) {
        const f = sp / (sp - sq);
        next.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
      }
    }
    out = next;
    if (out.length === 0) break;
  }
  return out;
}

/**
 * A vertical wall piece along a straight line a -> b (plan points) as
 * slabs from y0 to y1, `thick` about the line, less its openings: each
 * `[u0, u1]` along the line from a, open from `sill` over y0 to `head` over
 * y0 (a sill of 0 is a door).
 */
function wallSlabs(
  a: readonly [number, number],
  b: readonly [number, number],
  thick: number,
  y0: number,
  y1: number,
  openings: ReadonlyArray<{ readonly u0: number; readonly u1: number; readonly sill: number; readonly head: number }>,
): Slab[] {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const n = [-d[1]!, d[0]!];
  const piece = (u0: number, u1: number, ya: number, yb: number): Slab =>
    anticlockwise({
      outline: [
        [a[0] + d[0]! * u0 + (n[0]! * thick) / 2, ya, a[1] + d[1]! * u0 + (n[1]! * thick) / 2],
        [a[0] + d[0]! * u1 + (n[0]! * thick) / 2, ya, a[1] + d[1]! * u1 + (n[1]! * thick) / 2],
        [a[0] + d[0]! * u1 - (n[0]! * thick) / 2, ya, a[1] + d[1]! * u1 - (n[1]! * thick) / 2],
        [a[0] + d[0]! * u0 - (n[0]! * thick) / 2, ya, a[1] + d[1]! * u0 - (n[1]! * thick) / 2],
      ],
      depth: yb - ya,
    });
  const out: Slab[] = [];
  const sorted = [...openings].sort((p, q) => p.u0 - q.u0);
  let from = 0;
  for (const o of sorted) {
    if (o.u0 > from + 1e-9) out.push(piece(from, o.u0, y0, y1));
    if (o.sill > 1e-9) out.push(piece(o.u0, o.u1, y0, y0 + o.sill));
    if (y0 + o.head < y1 - 1e-9) out.push(piece(o.u0, o.u1, y0 + o.head, y1));
    from = o.u1;
  }
  if (from < L - 1e-9) out.push(piece(from, L, y0, y1));
  return out;
}

/** The pavilion's floor, outer walls with their openings, casings, partitions and roof, as slabs; and its windows' bars. */
export function pavilionSolids(): {
  readonly floor: Slab[];
  readonly walls: Slab[];
  readonly casings: Slab[];
  readonly partitions: Slab[];
  readonly roof: Slab[];
  readonly sashes: Array<readonly [Vec3, Vec3]>;
  readonly sashN: Vec3[];
  readonly windows: number;
  readonly doors: number;
} {
  const P = PAVILION;
  const half = P.side / 2;
  const inner = half - P.wall;
  const floorY = apartmentFloor;
  const ceiling = roomTop - P.roofDepth;
  const square = (h: number): Array<[number, number]> => [
    [h, -h],
    [h, h],
    [-h, h],
    [-h, -h],
  ];
  const floor = slabWithWells(square(half), ROOM_WELLS, balconyTop, floorY);
  const roof = slabWithWells(square(P.roof / 2), ROOF_WELLS, ceiling, roomTop);
  const c = half - P.casing;
  const casings = [
    boxSlab(c, half, c, half, floorY, ceiling),
    boxSlab(-half, -c, c, half, floorY, ceiling),
    boxSlab(-half, -c, -half, -c, floorY, ceiling),
    boxSlab(c, half, -half, -c, floorY, ceiling),
  ];
  // The outer walls, between the casings, on each face's line.
  const walls: Slab[] = [];
  const sashes: Array<readonly [Vec3, Vec3]> = [];
  const sashN: Vec3[] = [];
  let windows = 0;
  let doors = 0;
  FACES.forEach((f, i) => {
    const mid = (half + inner) / 2;
    const at = (u: number): [number, number] => [f.n[0] * mid + f.t[0] * u, f.n[2] * mid + f.t[2] * u];
    const u0 = -c;
    const openings = PAVILION_OPENINGS[i]!.map(([u, kind]) => {
      const w = kind === "W" ? P.window.width : P.door.width;
      if (kind === "W") {
        windows++;
        // The two lights' bar, in the wall's middle.
        sashes.push([onFace(f, mid, u, floorY + P.window.sill), onFace(f, mid, u, floorY + P.window.head)]);
        sashN.push(f.n);
      } else {
        doors++;
      }
      return { u0: u - w / 2 - u0, u1: u + w / 2 - u0, sill: kind === "W" ? P.window.sill : 0, head: kind === "W" ? P.window.head : P.door.head };
    });
    walls.push(...wallSlabs(at(u0), at(c), P.wall, floorY, ceiling, openings));
  });
  // The partitions, each less its doors.
  const partitions: Slab[] = [];
  for (const part of pavilionPlan().partitions) {
    if (part.outline.length < 3) continue;
    if (part.doors.length === 0) {
      partitions.push(anticlockwise({ outline: part.outline.map(([x, z]): Vec3 => [x, floorY, z]), depth: (part.top ?? ceiling) - floorY }));
      continue;
    }
    // A partition with doors is a straight wall: its line from its door's
    // direction, its extent from its outline.
    const d0 = part.doors[0]!;
    const dir = unit([d0.to[0] - d0.from[0], 0, d0.to[2] - d0.from[2]]);
    const us = part.outline.map(([x, z]) => x * dir[0] + z * dir[2]);
    const vs = part.outline.map(([x, z]) => -x * dir[2] + z * dir[0]);
    const [lo, hi] = [Math.min(...us), Math.max(...us)];
    const v = (Math.min(...vs) + Math.max(...vs)) / 2;
    const thick = Math.max(...vs) - Math.min(...vs);
    const base = (u: number): [number, number] => [dir[0] * u - dir[2] * v, dir[2] * u + dir[0] * v];
    const openings = part.doors.map((d) => {
      const a = d.from[0] * dir[0] + d.from[2] * dir[2];
      const b = d.to[0] * dir[0] + d.to[2] * dir[2];
      return { u0: Math.min(a, b) - lo, u1: Math.max(a, b) - lo, sill: 0, head: P.innerDoor };
    });
    partitions.push(...wallSlabs(base(lo), base(hi), thick, floorY, ceiling, openings));
  }
  return { floor, walls, casings, partitions, roof, sashes, sashN, windows, doors };
}

/** Eiffel's pavilion, its floor to its roof (header, item 3). */
function pavilion(g: Graph): NodeHandle[] {
  const p = pavilionSolids();
  return [
    slabs(g, "pavilionFloor", p.floor),
    slabs(g, "pavilionWalls", [...p.walls, ...p.casings]),
    slabs(g, "pavilionPartitions", p.partitions),
    slabs(g, "pavilionRoof", p.roof),
    faceSkin(g, "pavilionSash", members(g, "pavilionSashPaths", p.sashes, p.sashN), PAVILION.sash),
  ];
}

// ------------------------------------------------------------------ the glass

/**
 * The glass of the 3rd-floor gallery and of Eiffel's pavilion (SOURCES.md
 * §10.11), as slabs in the planes of their frames, each light cut to its
 * frame's clear opening and run `GLAZING.rebate` into the members round
 * it, `GLAZING.pane` thick [estimated, as on the 1st floor]:
 *
 * - THE CROISÉES: « des glaces mobiles que l'on peut élever ou abaisser »
 *   [sourced p. 216], each bay's two sashes meeting at mid-height, each
 *   sash of two lights either side of the bar `gallery` builds (PL-XIX
 *   Fig. 3 draws two lights a bay), so four panes a bay, 96 in the 24
 *   bays, on the glass line between the posts, over the sill rail and
 *   under the sablière.
 * - THE PAVILION: each two-light window's two panes either side of its
 *   bar, sill to head, and each door glazed from the floor to its head as
 *   PL-XIX Fig. 3 is read (`PAVILION`), in the wall's middle plane: 32 + 8,
 *   each stopping at the wall's reveal (see below).
 */
export function summitGlass(): { gallery: Slab[]; pavilion: Slab[] } {
  const t = GLAZING.pane;
  const e = GLAZING.rebate;
  const y0 = FLOORS.third;
  const line = octagon(GALLERY.flat, GALLERY.straight, y0);
  const { bays } = galleryLayout(y0);
  const frame = GALLERY_MEMBERS.frame;
  const bar = GALLERY_WALL.sash;
  const sill = y0 + GALLERY.parapet;
  const head = sill + GALLERY_WALL.window;
  const meet = (sill + frame + head) / 2;
  const gallery: Slab[] = [];
  for (const b of bays) {
    const mid = (b.u0 + b.u1) / 2;
    // A chamfer's second bay ends on the next straight side's vertex post,
    // square to that side, so turned 45 degrees to this one: it reaches
    // frame √2 along the chamfer, not frame.
    const L = Math.hypot(line[(b.side + 1) % 8]![0] - line[b.side]![0], line[(b.side + 1) % 8]![2] - line[b.side]![2]);
    const end = b.side % 2 === 1 && Math.abs(b.u1 - L) < 1e-9 ? frame * Math.SQRT2 : frame;
    for (const [u0, u1] of [
      [b.u0 + frame, mid - bar],
      [mid + bar, b.u1 - end],
    ] as const) {
      for (const [ya, yb] of [
        [sill + frame, meet - bar],
        [meet + bar, head],
      ] as const) {
        gallery.push(sidePanel(line, b.side, u0 - e, u1 + e, ya - e, yb + e, -t / 2, t / 2));
      }
    }
  }
  const P = PAVILION;
  const half = P.side / 2;
  const mid = (half + (half - P.wall)) / 2;
  const floorY = apartmentFloor;
  const pavilion: Slab[] = [];
  const pane = (f: Face, u0: number, u1: number, ya: number, yb: number): Slab => {
    const ring = [onFace(f, mid, u0, ya, -t / 2), onFace(f, mid, u1, ya, -t / 2), onFace(f, mid, u1, ya, t / 2), onFace(f, mid, u0, ya, t / 2)];
    return anticlockwise({ outline: ring, depth: yb - ya });
  };
  // The pavilion's panes stop AT its walls' reveals rather than in them:
  // the walls are the rooms' solids, which nothing may enter by a
  // millimetre (tests/eiffelSummitRooms.test.ts). Into the bar, as ever.
  FACES.forEach((f, i) => {
    for (const [u, kind] of PAVILION_OPENINGS[i]!) {
      if (kind === "W") {
        const w = P.window.width / 2;
        const [ya, yb] = [floorY + P.window.sill, floorY + P.window.head];
        pavilion.push(pane(f, u - w, u - P.sash + e, ya, yb), pane(f, u + P.sash - e, u + w, ya, yb));
      } else {
        const w = P.door.width / 2;
        pavilion.push(pane(f, u - w, u + w, floorY, floorY + P.door.head));
      }
    }
  });
  return { gallery, pavilion };
}

// ------------------------------------------------------------ the contrefiches

/**
 * The four contrefiches, « des contrefiches inclinées venant prendre un
 * nouvel appui sur l'arbalétrier d'angle au niveau de la galerie du
 * troisième étage … formées par un caisson, dont les parois verticales
 * sont constituées par une âme de 600 x 8 raidie, haut et bas, par des
 * cornières de 70 x 70 x 8 » [sourced E1900-TXT p. 79]; "4 Contrefiches des
 * poutres en diagonale" [sourced PL-XIX Fig. 3], one under each end of each
 * girder, "Contrefiche 600 x 762" [sourced PL-VII Fig. 4]. In a girder's
 * frame (`d` from the axis, heights):
 *
 * - `head`: the axis's top, under the girder's foot, 4.42-5.04 out
 *   [measured PL-XIV Fig. 4, 239 px/m], just outboard of the pulley post,
 *   set 0.145 under the foot so the box's square end stays under it
 *   [derived].
 * - `foot`: on the corner upright's gusset, 309.63 to about 310.9, the
 *   axis at about 310.3 [measured PL-XIV Fig. 2], built at d 6.90, flanking
 *   the upright (the box is 0.762 wide, the upright 0.707 across the
 *   diagonal) [derived]. The line leans 27.5 degrees [derived; measured
 *   24-30].
 * - `depth` 0.600, `width` 0.762 over the walls [sourced]; each wall with
 *   its angles 0.04 thick [estimated]. The box is two walls: the Edoux
 *   cables drop between them.
 */
export const CONTREFICHE = { head: [4.8, 280.835], foot: [6.9, 276.8], depth: 0.6, width: 0.762, wall: 0.04 } as const;

/** The contrefiches' walls: two per strut, four struts. */
function contrefiches(g: Graph): NodeHandle {
  const C = CONTREFICHE;
  const pieces: Array<{ from: Vec3; to: Vec3; n: Vec3 }> = [];
  for (const D of DIAGONALS) {
    for (const sign of [1, -1]) {
      for (const w of [C.width / 2 - C.wall / 2, -(C.width / 2 - C.wall / 2)]) {
        pieces.push({
          from: inGirder(D, sign * C.head[0], w, C.head[1]),
          to: inGirder(D, sign * C.foot[0], w, C.foot[1]),
          n: D.p,
        });
      }
    }
  }
  return plates(g, "contrefiche", pieces, C.depth, C.wall);
}

/**
 * One of the two diagonal girders: `a` along it, `p` across it (level unit
 * vectors). The continuous one, which carries the Edoux pulleys, runs on
 * the N-S diagonal, the Edoux cars' line in lifts.ts (+x -z toward pile 3):
 * PL-XIV Fig. 4 draws the cars' spaces under it. The discontinuous one
 * crosses it at right angles and butts against its webs.
 */
interface Diagonal {
  readonly id: string;
  readonly continuous: boolean;
  readonly a: Vec3;
  readonly p: Vec3;
}
const DIAGONALS: readonly Diagonal[] = [
  { id: "girderNS", continuous: true, a: [Math.SQRT1_2, 0, -Math.SQRT1_2], p: [Math.SQRT1_2, 0, Math.SQRT1_2] },
  { id: "girderEW", continuous: false, a: [Math.SQRT1_2, 0, Math.SQRT1_2], p: [-Math.SQRT1_2, 0, Math.SQRT1_2] },
];

/** A point in a girder's frame: `d` along it from the tower's axis, `w` across it, at height `y`. */
function inGirder(G: Diagonal, d: number, w: number, y: number): Vec3 {
  return [G.a[0] * d + G.p[0] * w, y, G.a[2] * d + G.p[2] * w];
}

const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]];

/** A span along a girder and its mirror across the tower's axis. */
const both = (lo: number, hi: number): Array<readonly [number, number]> => [
  [lo, hi],
  [-hi, -lo],
];

/**
 * A vertical plate in a web, [d0, d1] along the girder and [y0, y1] high,
 * as pieces round its windows: the windows are `GIRDER_AT.window` wide on
 * the plate's centre line, each [from, to] over the girder's foot `foot`.
 */
function platePieces(
  d0: number,
  d1: number,
  y0: number,
  y1: number,
  foot: number,
  windows: ReadonlyArray<readonly [number, number]> = [],
): Array<{ d: number; width: number; y0: number; y1: number }> {
  if (windows.length === 0) return [{ d: (d0 + d1) / 2, width: d1 - d0, y0, y1 }];
  const m = (d0 + d1) / 2;
  const hw = GIRDER_AT.window / 2;
  const out = [
    { d: (d0 + m - hw) / 2, width: m - hw - d0, y0, y1 },
    { d: (m + hw + d1) / 2, width: d1 - m - hw, y0, y1 },
  ];
  let from = y0;
  for (const [a, b] of windows) {
    out.push({ d: m, width: 2 * hw, y0: from, y1: Math.max(y0, foot + a) });
    from = Math.min(y1, foot + b);
  }
  out.push({ d: m, width: 2 * hw, y0: from, y1 });
  // A window open to the plate's edge leaves no piece there.
  return out.filter((p) => p.y1 - p.y0 > 1e-6);
}

/**
 * The two grandes poutres diagonales, from the apartment's roof `y0` up
 * (header, item 4); their meshes are all "summit".
 */
function diagonalGirders(g: Graph, y0: number, detail: Detail): Parts {
  const G = GIRDER;
  const A = GIRDER_AT;
  const y1 = y0 + G.height;
  const half = G.half;
  const web = G.web;
  // The clear web, between the chords.
  const ya = y0 + G.chord;
  const yb = y1 - G.chord;
  const endIn = half - A.endPlate;
  const up: Vec3 = [0, 1, 0];
  // The corner upright's axis, "364" in from the end: 7.435 - 0.364 =
  // 7.071, panel 29's corner at (+-5, +-5) [derived].
  const uprightAt = PANEL29.half * Math.SQRT2;
  // Where the discontinuous girder meets the continuous one: its webs land
  // on the continuous girder's web plates, its chords on that girder's
  // chords, its cover plate at the edge of that girder's.
  const meetWeb = web + G.webPlate / 2;
  const meetChord = web + G.chordThick / 2;
  const meetCover = G.breadth / 2;
  const innerEnd = meetWeb + 2 * A.angle;
  const pulley0 = A.pulley.at - A.pulley.width / 2;
  const pulley1 = A.pulley.at + A.pulley.width / 2;
  const centreHalf = A.centre.width / 2;

  const webFaces = (D: Diagonal): Face[] => [
    { n: D.p, t: D.a },
    { n: neg(D.p), t: D.a },
  ];
  // Spans along a girder: the chords', the cover's, the clear mesh panels.
  const chordSpans = (D: Diagonal) => (D.continuous ? [[-half, half] as const] : both(meetChord, half));
  const coverSpans = (D: Diagonal) => (D.continuous ? [[-half, half] as const] : both(meetCover, half));
  const panels = (D: Diagonal) =>
    D.continuous ? [...both(centreHalf, pulley0), ...both(pulley1, endIn)] : both(innerEnd, endIn);
  // The mesh runs on across the end plates, on their outer faces, to the
  // end frame's posts [PL-XIV Fig. 4].
  const L = A.lacing;
  const endStop = half - L.thick - 2 * A.angle;
  const endPlane = web + G.webPlate / 2 + GIRDER_MESH.bar;
  const flangeEnd = half - A.flangeIn;

  const chords: Array<{ from: Vec3; to: Vec3; n: Vec3 }> = [];
  const covers: Array<{ from: Vec3; to: Vec3; n: Vec3 }> = [];
  const flanges: Array<{ from: Vec3; to: Vec3; n: Vec3 }> = [];
  const webPlates = new Map<string, Array<{ from: Vec3; to: Vec3; n: Vec3 }>>();
  const angles: Array<readonly [Vec3, Vec3]> = [];
  const angleN: Vec3[] = [];
  const mesh: FaceBar[] = [];
  const endMesh: FaceBar[] = [];
  const lacing: Array<{ from: Vec3; to: Vec3; n: Vec3 }> = [];
  const lacingNodes: Vec3[] = [];
  const lacingDirs: Vec3[] = [];

  const s = GIRDER_MESH.spacing;
  const run = s / GIRDER_MESH.rise; // along the girder per unit of height
  const kMax = Math.ceil((half + G.height * run) / s) + 1;

  for (const D of DIAGONALS) {
    // The top's plating, over the whole breadth, and the chords under it.
    for (const [da, db] of coverSpans(D)) {
      covers.push({ from: inGirder(D, da, 0, y1 - G.cover / 2), to: inGirder(D, db, 0, y1 - G.cover / 2), n: up });
    }
    // The cross angles at the bottom, between the chords' inner faces.
    for (const d of [half - A.cross, -(half - A.cross)]) {
      const w = web - G.chordThick / 2;
      const y = y0 + G.cover + A.angle;
      angles.push([inGirder(D, d, -w, y), inGirder(D, d, w, y)]);
      angleN.push(up);
    }
    for (const f of webFaces(D)) {
      const w = f.n === D.p ? web : -web;
      const chordMid = (G.chord - G.cover) / 2 + G.cover;
      for (const [da, db] of chordSpans(D)) {
        for (const y of [y1 - chordMid, y0 + chordMid]) {
          chords.push({ from: inGirder(D, da, w, y), to: inGirder(D, db, w, y), n: f.n });
        }
      }
      for (const [da, db] of D.continuous ? [[-flangeEnd, flangeEnd] as const] : both(meetCover, flangeEnd)) {
        flanges.push({ from: inGirder(D, da, w, y0 + G.cover / 2), to: inGirder(D, db, w, y0 + G.cover / 2), n: up });
      }
      // The web's plates: the end plates, and on the continuous girder the
      // pulley posts and the central plate, round their windows.
      const pieces = [
        ...both(endIn, half).flatMap(([p0, p1]) => platePieces(p0, p1, ya, yb, y0)),
        ...(D.continuous
          ? [
              ...both(pulley0, pulley1).flatMap(([p0, p1]) => platePieces(p0, p1, ya, yb, y0, A.pulley.windows)),
              ...platePieces(-centreHalf, centreHalf, ya, yb, y0, A.centre.windows),
            ]
          : []),
      ];
      for (const pc of pieces) {
        const key = pc.width.toFixed(4);
        const list = webPlates.get(key) ?? [];
        list.push({ from: inGirder(D, pc.d, w, pc.y0), to: inGirder(D, pc.d, w, pc.y1), n: f.n });
        webPlates.set(key, list);
      }
      // The light verticals, and the discontinuous girder's end angles where
      // it lands on the continuous one.
      const verticals = [half - A.light, -(half - A.light), ...(D.continuous ? [] : [innerEnd - A.angle, -(innerEnd - A.angle)])];
      for (const d of verticals) {
        angles.push([inGirder(D, d, w, ya), inGirder(D, d, w, yb)]);
        angleN.push(f.n);
      }
      // The diamond mesh: lines d = c +- run t, t = y - y0, through the foot
      // at c = (k + 1/2) s, so a diamond's centre sits on the tower's axis
      // at the foot (PL-VII's phase, and PL-XIV Fig. 4's: its nodes on the
      // foot straddle the axis) and the pattern mirrors about the axis.
      // Each line is clipped to each clear panel, and to the end plates.
      for (const dir of [1, -1]) {
        for (let k = -kMax; k <= kMax; k++) {
          const c = (k + 0.5) * s;
          for (const [spans, into, min] of [
            [panels(D), mesh, 0.25],
            [both(endIn, endStop), endMesh, 0.1],
          ] as const) {
            for (const [da, db] of spans) {
              const ta = (da - c) / (dir * run);
              const tb = (db - c) / (dir * run);
              const t0 = Math.max(G.chord, Math.min(ta, tb));
              const t1 = Math.min(G.height - G.chord, Math.max(ta, tb));
              if (t1 <= t0) continue;
              const dAt = (t: number) => c + dir * run * t;
              if (Math.hypot(dAt(t1) - dAt(t0), t1 - t0) < min) continue;
              into.push({ f, u0: dAt(t0), y0: y0 + t0, u1: dAt(t1), y1: y0 + t1 });
            }
          }
        }
      }
    }
    // The end frames [PL-XIV Fig. 3, "Vue par bout"]: a post on each web's
    // end, the whole depth, and an X of flats in each panel between them, on
    // the posts' outer faces, so the flats' outer face is the girder's end.
    // The nodes keep an angle and half a flat off the bottom and the plating,
    // so the flats, which run past them, stay inside the girder's depth.
    const lo0 = y0 + A.angle + L.width / 2;
    const hi0 = y1 - G.cover - A.angle - L.width / 2;
    const panelsUp = Math.max(1, Math.round((hi0 - lo0) / L.panel));
    const step = (hi0 - lo0) / panelsUp;
    for (const sign of [1, -1]) {
      const n: Vec3 = sign > 0 ? D.a : neg(D.a);
      const post = half - L.thick - A.angle;
      for (const w of [web, -web]) {
        angles.push([inGirder(D, sign * post, w, y0), inGirder(D, sign * post, w, y1 - G.cover)]);
        angleN.push(n);
      }
      // Each flat runs a little past its two nodes, over the posts, so the
      // node's rivet sits on it.
      const plane = sign * (half - L.thick / 2);
      const past = A.angle / Math.hypot(2 * web, step);
      for (let k = 0; k < panelsUp; k++) {
        const lo = lo0 + k * step;
        const hi = lo + step;
        for (const s0 of [-1, 1]) {
          const [w0, w1] = [s0 * web * (1 + 2 * past), -s0 * web * (1 + 2 * past)];
          const [l0, l1] = [lo - step * past, hi + step * past];
          lacing.push({ from: inGirder(D, plane, w0, l0), to: inGirder(D, plane, w1, l1), n });
        }
      }
      for (let k = 0; k <= panelsUp; k++) {
        for (const w of [web, -web]) {
          lacingNodes.push(inGirder(D, sign * half, w, lo0 + k * step));
          lacingDirs.push(n);
        }
      }
    }
  }

  // The corner uprights inside the girders' ends, square to the tower's faces.
  const corners: Array<readonly [Vec3, Vec3]> = DIAGONALS.flatMap((D) =>
    [uprightAt, -uprightAt].map((d) => [inGirder(D, d, 0, y0), inGirder(D, d, 0, y1 - G.cover)] as const),
  );
  const summit: NodeHandle[] = [
    skin(g, "girderUprightSkin", members(g, "girderUprights", corners), MEMBERS.upright, [1, 0, 0]),
    plates(g, "girderChord", chords, G.chord - G.cover, G.chordThick),
    plates(g, "girderCover", covers, G.breadth, G.cover),
    plates(g, "girderFlange", flanges, G.flange, G.cover),
    ...[...webPlates.entries()].map(([key, list], i) => plates(g, `girderPlate${i}`, list, Number(key), G.webPlate)),
    faceSkin(g, "girderAngle", members(g, "girderAnglePaths", angles, angleN), A.angle),
    faceBars(g, "girderMesh", GIRDER_MESH.bar, mesh, web),
    faceBars(g, "girderEndMesh", GIRDER_MESH.bar, endMesh, endPlane),
    plates(g, "girderLacing", lacing, A.lacing.width, A.lacing.thick),
  ];

  // THE CROSSING'S GUSSETS: "2 Goussets 1.130 x 10" where the girders cross
  // [sourced PL-XIV Fig. 5 bis; SOURCES.md §23.1]: 1.130 and 10 mm are
  // printed, the plate being square is inferred [estimated] from the one
  // size given and the 1.130 plating it lies on — the plate the legs'
  // crossing rule quotes. It is that rule's joint —
  // two members crossing in a plane, a plate either side of it — with the
  // plane turned flat: the girders cross in PLAN, so the shared plane is
  // the level one through the crossing at mid-depth, its normal is up, and
  // "either side" is the top and the bottom. `crossPlateSets` builds it
  // unchanged; what changes is what it is fed, because a laced strut is
  // square and this section is not:
  // - `w`, which places the pair, is half the DEPTH, so the plates land on
  //   the girders' outer faces: the top one on the cover plating, which
  //   runs through the crossing on the continuous girder, the bottom one
  //   under the bottom flanges;
  // - `set` is 0. A strut's plate is set under its corner angles to lie
  //   among them over the lacing; here the outer faces ARE plating, the
  //   cover and the flanges, with nothing to lie among, and a plate set
  //   under them would be inside the girder;
  // - `edge` carries the breadth. The rule makes a plate as wide as its
  //   strut, `edge` at an 800 scaled by w / 0.4, and since `w` is the depth
  //   here the breadth goes in through `edge`: 0.4 x 1.130 / 4.500. Read
  //   against the girder's own breadth, the default CROSS_PLATE (edge 0.4
  //   at 0.4, a plate exactly as wide as what it covers) gives 1.130 — the
  //   printed size, so the rule and the plate agree; read against the
  //   depth that places the pair it would give a 4.50 plate set 84 mm into
  //   the girder. The page's by-eye knobs do not reach this one: nothing
  //   about it is by eye.
  // Square, it is exactly the crossing's footprint in plan, laid square to
  // the continuous girder, which runs through [the orientation estimated:
  // the callout gives a size]. Laced depth and up, with the other crossing
  // plates, so `gussets` stays a class the plain depth does not have.
  //
  // The bottom plate is under the flanges at the girders' foot, and the
  // foot stands on the apartment's roof: it and its heads are inside that
  // solid box, 10 mm and a head deep — built because the plate is drawn,
  // hidden because the model's pavilion is solid. The ladder cylinder's
  // foot stands 10 mm into the top one, which is what a tube standing on a
  // plate looks like; its 0.70 clears the plate's rivet rows by 0.17.
  const continuous = DIAGONALS.find((D) => D.continuous) as Diagonal;
  const crossing: Crossing = { at: [0, (y0 + y1) / 2, 0], along: continuous.a, n: up, w: G.height / 2 };
  const crossSets =
    detail.lacedWeb === true || detail.rivets === true
      ? crossPlateSets([crossing], { set: 0, edge: (CROSS_PLATE_AT * G.breadth) / G.height })
      : [];
  const gussets = crossSets.map((set) =>
    flatBars(
      g,
      `girderCrossPlates${set.key}`,
      segmentMembers(g, `girderCrossPlates${set.key}`, set.members),
      set.width,
      CROSS_THICK,
    ),
  );
  if (detail.rivets !== true) return { summit, gussets };

  // RIVETS. The mesh bars' ends, clear of the chords, the plates and the
  // verticals they land on or pass.
  const all = { y0: y0 - 1, y1: y1 + 1 };
  const chordRects: Rect[] = [
    { u0: -half - 1, u1: half + 1, y0: y0 - 1, y1: ya },
    { u0: -half - 1, u1: half + 1, y0: yb, y1: y1 + 1 },
  ];
  const commonRects: Rect[] = [
    ...chordRects,
    ...both(endIn, half + 1).map(([u0, u1]) => ({ u0, u1, ...all })),
    ...both(half - A.light - A.angle, half - A.light + A.angle).map(([u0, u1]) => ({ u0, u1, ...all })),
  ];
  const keepOff = (D: Diagonal): Rect[] =>
    D.continuous
      ? [
          ...commonRects,
          { u0: -centreHalf, u1: centreHalf, ...all },
          ...both(pulley0, pulley1).map(([u0, u1]) => ({ u0, u1, ...all })),
        ]
      : [...commonRects, { u0: -innerEnd, u1: innerEnd, ...all }];
  const barRivets = DIAGONALS.map((D) =>
    barEndRivets(
      g,
      `${D.id}BarEnds`,
      mesh.filter((b) => b.f.t === D.a),
      web,
      GIRDER_MESH.bar,
      keepOff(D),
      2 * RIVET_HEAD,
    ),
  ).filter((h): h is NodeHandle => h !== undefined);
  // The bars on the end plates: the outer head only (the inner one would be
  // in the plate), clear of the chords, the end frame's post and the jog
  // where the bar leaves the web's plane for the plate's face.
  const endRects: Rect[] = [
    ...chordRects,
    { u0: -endIn, u1: endIn, ...all },
    ...both(endStop, half + 1).map(([u0, u1]) => ({ u0, u1, ...all })),
  ];
  for (const D of DIAGONALS) {
    const h = barEndRivets(
      g,
      `${D.id}EndBarEnds`,
      endMesh.filter((b) => b.f.t === D.a),
      endPlane,
      GIRDER_MESH.bar,
      endRects,
      2 * RIVET_HEAD,
      [1],
    );
    if (h !== undefined) barRivets.push(h);
  }

  // Two rows along each face of every chord [estimated, as panel 29's plate
  // girder], clear of the discontinuous girder's chords where they land, of
  // the corner upright inside the end, and of the end frame.
  const clear = END_CLEAR;
  const rowPieces: Array<readonly [Vec3, Vec3]> = [];
  const rowNormals: Vec3[] = [];
  const outerStop = half - A.lacing.thick - 2 * A.angle - clear;
  // The upright's section is square to the tower's faces, so it reaches
  // across the girder its half-diagonal, and meets a chord's inner face
  // that much short of its axis.
  const uprightHalf = MEMBERS.upright[MEMBERS.upright.length - 1]![1];
  const innerStop = uprightAt - (uprightHalf * Math.SQRT2 - (web - G.chordThick / 2)) - clear;
  for (const D of DIAGONALS) {
    for (const f of webFaces(D)) {
      const w = f.n === D.p ? web : -web;
      for (const side of [1, -1]) {
        const offW = w + Math.sign(w) * side * (G.chordThick / 2);
        const n: Vec3 = side > 0 ? f.n : neg(f.n);
        const spans: Array<readonly [number, number]> = D.continuous
          ? side > 0
            ? [
                ...both(meetChord + clear, outerStop),
                [-(web - G.chordThick / 2) + clear, web - G.chordThick / 2 - clear] as const,
              ]
            : [[-innerStop, innerStop] as const]
          : both(meetChord + clear, side > 0 ? outerStop : innerStop);
        const chordMid = (G.chord - G.cover) / 2 + G.cover;
        for (const yc of [y1 - chordMid, y0 + chordMid]) {
          for (const y of [yc - 0.08, yc + 0.08]) {
            for (const [da, db] of spans) {
              rowPieces.push([inGirder(D, da, offW, y), inGirder(D, db, offW, y)]);
              rowNormals.push(n);
            }
          }
        }
      }
    }
  }
  // The uprights' seams, between the chords.
  const seamPieces = corners.map(([a, b]) => [[a[0], ya, a[2]] as Vec3, [b[0], yb, b[2]] as Vec3] as const);
  return {
    summit,
    gussets,
    rivets: [
      // The rows round the gussets' edges, on their outer faces: on the
      // top one, over the cover; on the bottom one, pointing down.
      ...crossSets.map((set) => ({
        name: crossSets.length === 1 ? "summit.crossings" : `summit.crossings.${set.key}`,
        spawn: lineRivets(
          g,
          `girderCrossRivets${set.key}`,
          segmentMembers(g, `girderCrossRivets${set.key}`, set.rivetLines),
          CROSS_THICK / 2,
          CROSS_RIVETS.pitch,
        ),
      })),
      ...cornerSeams(g, "girderUpright", "summit.diagonals.uprights", seamPieces, MEMBERS.upright, detail),
      { name: "summit.diagonals.bars", spawn: rivetSpawn(g, "girderBar", barRivets) },
      {
        name: "summit.diagonals.chords",
        spawn: rivetSpawn(g, "girderChordR", [
          faceRows(g, "girderChordRow", seamRuns(g, "girderChordSeam", rowPieces, rowNormals)),
        ]),
      },
      {
        name: "summit.diagonals.lacing",
        spawn: rivetSpawn(g, "girderLacingR", [aimedPoints(g, "girderLacingNodes", lacingNodes, lacingDirs)]),
      },
    ],
  };
}

/**
 * The dome's four half-arches as one lattice of box girders: arch a has
 * stations 4a..4a+3, its chords in ring order round the section (intrados
 * and extrados on the -l side, then extrados and intrados on the +l side,
 * l the arch plane's normal), and level k runs from the springing (k = 0)
 * round the quarter circle to the crown over the axis (k = n). Returns the
 * skinned ribs, the crown's height, and the ribs' rivets when
 * `detail.rivets` asks.
 */
function dome(
  g: Graph,
  springY: number,
  detail: Detail,
): { mesh: NodeHandle; crownY: number; rivets: RivetSet[] } {
  const n = DOME.segments;
  const exR = DOME.radius - DOME.chord;
  const inR = exR - DOME.depth;
  const side = DOME.breadth / 2;
  // Arch a runs along the diagonal d = (+-1, +-1), turning 90 degrees per
  // arch; l = (-dz, dx) is its plane's normal.
  const diag = (a: number): Vec3 => unit([[1, -1, -1, 1][a]!, 0, [1, 1, -1, -1][a]!]);
  const normalOf = (a: number): Vec3 => {
    const d = diag(a);
    return [-d[2], 0, d[0]];
  };
  const chordOf = (s: number) => {
    const j = s % 4;
    return { a: Math.floor(s / 4), rho: j === 0 || j === 3 ? inR : exR, lam: j < 2 ? -side : side };
  };
  const at = (s: number, k: number): Vec3 => {
    const { a, rho, lam } = chordOf(s);
    const d = diag(a);
    const l = normalOf(a);
    const th = (k / n) * (Math.PI / 2);
    const r = k === n ? 0 : rho * Math.cos(th);
    return [r * d[0] + lam * l[0], springY + rho * Math.sin(th), r * d[2] + lam * l[2]];
  };
  const rows = stationRows(16, n + 1, at);
  const ribs = placedLattice(g, "dome", rows);
  // Each station carries its arch's plane normal, which squares its
  // chord's section: a normal read off the position (the old rib's) turns
  // near the crown, where the chords sit off the arch's plane.
  const perPoint = rows.flatMap((row) => row.map((_, s) => normalOf(Math.floor(s / 4))));
  const planeN = g.add(
    setAttribute,
    {
      name: "archN",
      type: "f32",
      tupleSize: 3,
      value: vec(indexTable(perPoint.map((v) => v[0])), 0, indexTable(perPoint.map((v) => v[2]))),
    },
    "domePlaneN",
  );
  g.connect(ribs.stations, "out", planeN, "in");
  const chordLat: Lattice = { ...ribs, stations: planeN };
  const chords = chains(chordLat, "Chords");
  const chordSkin = g.add(
    sweepProfile,
    { profile: "square", radius: DOME.chord, frame: "upHint", up: attribute("archN", 3) },
    "domeChordSkin",
  );
  g.connect(chords, "out", chordSkin, "in");
  // The lacing on all four faces of each girder: a rung at every node and
  // an X in every panel. Round the section, station j meets j + 1 (the -l
  // side, the extrados, the +l side) and 3 meets 0 (the intrados).
  const j = (s: number) => s % 4;
  // At the crown the extrados' and intrados' rungs would cross the axis,
  // where the stair's core rises through the « carré » the arches leave
  // round it [sourced p. 79]: none there.
  const lacing = merge(g, "domeLacing", [
    edges(ribs, "Rungs", 1, 0, (s, k) => j(s) < 3 && !(k === n && j(s) === 1)),
    edges(ribs, "RungsIn", -3, 0, (s, k) => j(s) === 3 && k !== n),
    edges(ribs, "LaceA", 1, 1, (s) => j(s) < 3),
    edges(ribs, "LaceB", -1, 1, (s) => j(s) > 0),
    edges(ribs, "LaceInA", 3, 1, (s) => j(s) === 0),
    edges(ribs, "LaceInB", -3, 1, (s) => j(s) === 3),
  ]);
  const mesh = merge(g, "domeRibs", [chordSkin, faceSkin(g, "domeLacing", lacing, DOME.lacing)]);
  const crownY = springY + DOME.radius;
  if (detail.rivets !== true) return { mesh, crownY, rivets: [] };

  // Both kinds stop at the last node below the crown (level n - 1): the
  // crown's own segment is where the four arches run into one another.
  //
  // SEAMS: a chord is a box member like an upright, so it takes the
  // uprights' seam rows [estimated], one run per segment between nodes,
  // squared, like its skin, to the arch's plane.
  const pieces: Array<readonly [Vec3, Vec3]> = [];
  const faces: Vec3[] = [];
  for (let s = 0; s < 16; s++) {
    for (let k = 0; k < n - 1; k++) {
      pieces.push([rows[k]![s]!, rows[k + 1]![s]!]);
      faces.push(normalOf(Math.floor(s / 4)));
    }
  }
  const seams = seamRivets(
    g,
    "domeChord",
    seamRuns(g, "domeSeam", pieces, faces),
    DOME.chord,
    attribute(FACE_NORMAL, 3),
    UPRIGHT_SEAMS,
  );
  // LACING: at every node of a chord two lacing planes meet it — its side
  // of the girder and its extrados or intrados face — and a rivet takes
  // each through the chord, on its centre line: a head on the chord's
  // two OUTER faces, the ones on the girder's outside (the inner heads are
  // under the lacing bars themselves). On a node the mitred section is
  // stretched along the bend, radially, by 1 / cos(half the turn).
  const stretch = 1 / Math.cos(Math.PI / (4 * n));
  const nodeAt: Vec3[] = [];
  const nodeDir: Vec3[] = [];
  for (let s = 0; s < 16; s++) {
    const { a, rho, lam } = chordOf(s);
    const d = diag(a);
    const l = normalOf(a);
    for (let k = 1; k < n; k++) {
      const p = rows[k]![s]!;
      const th = (k / n) * (Math.PI / 2);
      const radial: Vec3 = [Math.cos(th) * d[0], Math.sin(th), Math.cos(th) * d[2]];
      const outL = Math.sign(lam);
      const outR = rho === exR ? 1 : -1;
      for (const [dir, off] of [
        [[l[0] * outL, 0, l[2] * outL] as Vec3, DOME.chord],
        [[radial[0] * outR, radial[1] * outR, radial[2] * outR] as Vec3, DOME.chord * stretch],
      ] as const) {
        nodeAt.push([p[0] + dir[0] * off, p[1] + dir[1] * off, p[2] + dir[2] * off]);
        nodeDir.push(dir);
      }
    }
  }
  return {
    mesh,
    crownY,
    rivets: [
      { name: "summit.dome.chords", spawn: seams },
      { name: "summit.dome.lacing", spawn: rivetSpawn(g, "domeNode", [aimedPoints(g, "domeNodes", nodeAt, nodeDir)]) },
    ],
  };
}

/** A regular polygon's vertices, the first on +x, round the same way as `octagon`'s. */
function polygon(sides: number, radius: number, y: number): Vec3[] {
  return Array.from({ length: sides }, (_, i) => {
    const t = (2 * Math.PI * i) / sides;
    return [radius * Math.cos(t), y, radius * Math.sin(t)] as Vec3;
  });
}

/** Circumradius of a regular polygon from its width across the flats. */
const circum = (flats: number, sides: number) => flats / 2 / Math.cos(Math.PI / sides);

/**
 * A prism on the axis: a vertical path swept as a `sides`-gon of
 * circumradius `radius` (a number, or a table over height), capped or
 * open. With an up hint of +x the sweep puts a vertex on +z; the roll
 * turns it back a quarter turn, so a vertex sits on +x, as `polygon`'s
 * first does (for the decagons: flats to +-z, the Seine side of PL-XIX
 * Fig. 12, and corners to +-x).
 */
function prism(
  g: Graph,
  id: string,
  sides: number,
  heights: readonly number[],
  radius: number | ReadonlyArray<readonly [number, number]>,
  caps = true,
): NodeHandle {
  const axis = placedLattice(g, id, heights.map((y) => [[0, y, 0] as Vec3]));
  const node = g.add(
    sweepProfile,
    {
      profile: "circle",
      sides,
      radius: typeof radius === "number" ? radius : ramp(component(position(), 1), radius),
      caps,
      frame: "upHint",
      up: [1, 0, 0],
      roll: 0.25,
    },
    `${id}Skin`,
  );
  g.connect(chains(axis, "Axis"), "out", node, "in");
  return node;
}

/** The lantern's levels, from the terrace up (`LANTERN`; PL-XV Fig. 1's chain). */
export function lanternLevels(): {
  readonly terrace: number;
  readonly lanternFloor: number;
  readonly balcony: number;
  readonly glass: readonly [number, number];
  readonly springing: number;
  readonly crown: number;
  readonly platform: number;
  /** The tripod's apex, 1.000 over the platform, and the rod's seated foot. */
  readonly tripod: number;
  readonly rodBase: number;
  readonly pointsFrom: number;
  readonly rodTip: number;
} {
  const L = LANTERN;
  const terrace = FLOORS.lanternTerrace;
  const glass0 = terrace + L.baseHeight;
  const glass1 = glass0 + L.lanternHeight;
  const platform = FLOORS.topTerrace;
  const rodTip = FLOORS.flagTop;
  const rodBase = rodTip - ROD.length;
  return {
    terrace,
    lanternFloor: terrace + L.floorAt,
    balcony: terrace + L.balconyAt,
    glass: [glass0, glass1],
    springing: glass1 + L.cupolaDrum,
    crown: platform - L.topDeck,
    platform,
    tripod: platform + ROD.base,
    rodBase,
    pointsFrom: rodTip - ROD.points * Math.cos(ROD.lean),
    rodTip,
  };
}

/**
 * The lantern terrace, the lantern, the cupola, the top platform with its
 * railing and socket, the tripod and the rod (header, items 6-8).
 */
function lantern(g: Graph, crownY: number): NodeHandle[] {
  const L = LANTERN;
  const lv = lanternLevels();
  const deckTop = lv.terrace;
  const baseTop = lv.glass[0];
  const cupolaY = lv.glass[1];
  const topY = lv.platform;
  // The normal of the vertical plane through the axis and a point.
  const tangential = vec(mul(component(position(), 2), -1), 0, component(position(), 0));
  const out: NodeHandle[] = [];

  // The terrace: a chamfered square round the stair core's "carré" (770,
  // sourced PL-XV Fig. 1, PL-XVI Fig. 22), and its railing just inside the
  // edge.
  const tHalf = L.terrace / 2;
  const tStraight = tHalf - L.chamfer / Math.SQRT2;
  const core = 0.385;
  out.push(slabs(g, "lanternTerrace", slabWithWells(octagonPlan(tHalf, tStraight), [{ s: [-core, core], t: [-core, core] }], crownY, deckTop)));
  const m = 0.025;
  const rail = octagon(tHalf - m, tStraight - m * Math.tan(Math.PI / 8), deckTop);
  const railAt = bayPoints(rail, (i) => (i % 2 === 0 ? 3 : 1));
  out.push(
    faceSkin(
      g,
      "terracePost",
      members(
        g,
        "terracePostPaths",
        railAt.map(({ p }) => [p, [p[0], deckTop + L.railing - m, p[2]]] as const),
        railAt.map(({ side }) => sideNormal(rail, side)),
      ),
      m,
    ),
    skin(
      g,
      "terraceRailSkin",
      loops(
        g,
        "terraceRails",
        [deckTop + L.railing / 2, deckTop + L.railing - m].map((y) => rail.map((p) => [p[0], y, p[2]] as Vec3)),
      ),
      m,
      [0, 1, 0],
    ),
  );

  // The soubassement, its sheet walls open inside to the lantern's floor,
  // which the core carries; and the balcony on its ten consoles.
  const rBase = L.side / 2 / Math.sin(Math.PI / 10);
  const rBalcony = circum(L.balconyFlats, 10);
  const balconyY = lv.balcony;
  const consoleY = balconyY - L.console;
  out.push(prism(g, "lanternBase", 10, [deckTop, baseTop], rBase, false));
  // The floor round the core's head, which carries it [sourced p. 80].
  const floorPlan = polygon(10, rBase - 0.01, 0).map(([x, , z]): [number, number] => [x, z]);
  out.push(slabs(g, "lanternFloor", slabWithWells(floorPlan, [{ s: [-0.36, 0.36], t: [-0.36, 0.36] }], lv.lanternFloor - L.floorDepth, lv.lanternFloor)));
  // The balcony's deck is a ring from the soubassement's wall out: inside
  // it the lantern's room rises from its own floor, 0.775 lower, where the
  // ladders go on up (`stairs.ts`). Until 2026-09-26 a full decagon closed
  // the room at the balcony's level.
  const ring = (r0: number, r1: number): Slab[] => {
    const i0 = polygon(10, r0, 0);
    const o0 = polygon(10, r1, 0);
    return i0.map((_, k) => {
      const k1 = (k + 1) % 10;
      const xz: Array<[number, number]> = [i0[k]!, o0[k]!, o0[k1]!, i0[k1]!].map((p) => [p[0], p[2]]);
      let area = 0;
      for (let j = 0; j < 4; j++) area += xz[j]![0] * xz[(j + 1) % 4]![1] - xz[(j + 1) % 4]![0] * xz[j]![1];
      if (area > 0) xz.reverse();
      return { outline: xz.map(([x, z]): Vec3 => [x, balconyY - 0.1, z]), depth: 0.1 };
    });
  };
  out.push(slabs(g, "balconyFloor", ring(rBase, rBalcony)));
  out.push(prism(g, "balconyParapet", 10, [balconyY, balconyY + L.parapet], rBalcony, false));
  const arcSteps = 8;
  const consoles = placedLattice(
    g,
    "lanternConsoles",
    stationRows(10, arcSteps + 1, (s, k) => {
      const t = (k / arcSteps) * (Math.PI / 2);
      const r = rBase + (rBalcony - rBase) * (1 - Math.cos(t));
      const v = polygon(10, 1, 0)[s]!;
      return [v[0] * r, consoleY + L.console * Math.sin(t), v[2] * r];
    }),
  );
  out.push(skin(g, "lanternConsoleSkin", chains(consoles, "Paths"), 0.04, tangential));

  // The glazed lantern: rings, posts at the corners, and the zigzag of its
  // glazing bars from each foot corner to the head of its side [PL-VII].
  const foot = polygon(10, rBase, baseTop);
  const head = polygon(10, rBase, cupolaY);
  const bars: Array<readonly [Vec3, Vec3]> = [];
  const barN: Vec3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = foot[i]!;
    const b = foot[(i + 1) % 10]!;
    const mid: Vec3 = [(head[i]![0] + head[(i + 1) % 10]![0]) / 2, cupolaY, (head[i]![2] + head[(i + 1) % 10]![2]) / 2];
    const nrm = sideNormal(foot, i);
    bars.push([a, head[i]!], [a, mid], [mid, b]);
    barN.push(nrm, nrm, nrm);
  }
  out.push(
    faceSkin(g, "lanternGlazing", members(g, "lanternGlazingPaths", bars, barN), 0.03),
    skin(g, "lanternRingSkin", loops(g, "lanternRings", [foot, head]), 0.04, [0, 1, 0]),
  );

  // The cupola: the drum, then the sphere on it to the crown ring. The
  // polygon's circumradius is the sphere's, so its sides stand a little
  // inside it.
  const R = L.cupolaDiameter / 2;
  const rRing = L.crownRing / 2;
  const top = lv.crown;
  const rise = Math.sqrt(R * R - rRing * rRing);
  const profile: Array<readonly [number, number]> = [
    [cupolaY, R],
    ...Array.from({ length: 11 }, (_, i) => {
      const a = (i / 10) * Math.asin(rise / R);
      return [lv.springing + R * Math.sin(a), R * Math.cos(a)] as const;
    }),
  ];
  // The sphere ends at the ring; the platform's structure stands on it.
  const cupola = profile.map(([y, r]) => [Math.min(y, top), r] as const);
  out.push(
    // Open at both ends: the lantern's ladders rise through it to the
    // crown ring (`stairs.ts`), and the platform's deck closes the top.
    prism(
      g,
      "cupola",
      L.cupolaSides,
      cupola.map(([y]) => y),
      cupola,
      false,
    ),
  );

  // The top platform, Ø 1.70, on the crown ring.
  const rTop = L.topDiameter / 2;
  out.push(prism(g, "topDeck", L.cupolaSides, [top, topY], rTop));

  // Its railing: ten posts on the rim from 0.275 under the platform, the
  // five bent ones on to the socket; the rails round the posts' line.
  const a = L.angle;
  const rPost = rTop - a;
  const postFoot = topY - L.postsBelow;
  const railTop = topY + L.rails[L.rails.length - 1]!;
  const straightPosts: Array<readonly [Vec3, Vec3]> = [];
  const straightN: Vec3[] = [];
  for (let i = 0; i < 5; i++) {
    const t = ((2 * i + 1) * Math.PI) / 5;
    const dir: Vec3 = [Math.cos(t), 0, Math.sin(t)];
    straightPosts.push([[dir[0] * rPost, postFoot, dir[2] * rPost], [dir[0] * rPost, railTop, dir[2] * rPost]]);
    straightN.push(dir);
  }
  out.push(faceSkin(g, "topRailPost", members(g, "topRailPostPaths", straightPosts, straightN), a));
  const socketR = L.socketRadius;
  const bendFrom = topY + L.bentPlumb;
  const bendTo = topY + L.socket[0];
  const steps = 8;
  const bent = placedLattice(
    g,
    "topBent",
    [
      ...[postFoot, bendFrom].map((y) => Array.from({ length: 5 }, (_, i) => [rPost * Math.cos((2 * i * Math.PI) / 5), y, rPost * Math.sin((2 * i * Math.PI) / 5)] as Vec3)),
      ...Array.from({ length: steps }, (_, k) => {
        const f = (k + 1) / steps;
        // Two reversed arcs: in along a smooth S, plumb again at the socket.
        const e = f * f * (3 - 2 * f);
        const r = rPost + (socketR + a - rPost) * e;
        const y = bendFrom + (bendTo - bendFrom) * f;
        return Array.from({ length: 5 }, (_, i) => [r * Math.cos((2 * i * Math.PI) / 5), y, r * Math.sin((2 * i * Math.PI) / 5)] as Vec3);
      }),
    ],
  );
  out.push(skin(g, "topBentSkin", chains(bent, "Paths"), a, tangential));
  out.push(
    skin(
      g,
      "topRailSkin",
      loops(g, "topRails", L.rails.map((h) => polygon(20, rPost, topY + h))),
      0.015,
      [0, 1, 0],
    ),
  );
  // The socket, a pentagonal sleeve round the rod.
  out.push(prism(g, "topSocket", 5, [topY + L.socket[0], topY + L.socket[1]], socketR + 0.005, false));

  // The tripod, from the crown ring to the rod's foot, and the rod, a
  // round bar tapering to its three points.
  const legs: Array<readonly [Vec3, Vec3]> = [];
  for (let i = 0; i < 3; i++) {
    const t = (2 * i * Math.PI) / 3 + Math.PI / 2;
    legs.push([[ROD.legFoot * Math.cos(t), topY, ROD.legFoot * Math.sin(t)], [0, lv.tripod, 0]]);
  }
  out.push(skin(g, "rodTripod", members(g, "rodTripodPaths", legs), ROD.leg, [0, 1, 0]));
  out.push(
    prism(
      g,
      "rod",
      12,
      [lv.rodBase, lv.pointsFrom],
      [
        [lv.rodBase, ROD.foot],
        [lv.pointsFrom, ROD.head],
      ],
    ),
  );
  const points: Array<readonly [Vec3, Vec3]> = [];
  const out3 = ROD.points * Math.sin(ROD.lean);
  for (let i = 0; i < 3; i++) {
    const t = (2 * i * Math.PI) / 3;
    points.push([[0, lv.pointsFrom, 0], [out3 * Math.cos(t), lv.rodTip, out3 * Math.sin(t)]]);
  }
  out.push(skin(g, "rodPoints", members(g, "rodPointPaths", points), ROD.tip, [0, 1, 0]));
  return out;
}

/** Build panel 29, the 3rd-floor gallery and Eiffel's pavilion, and the campanile, at the given detail. */
export function buildSummit(g: Graph, detail: Detail = {}): Parts {
  const girderTop = roomTop + GIRDER.height;
  const { mesh: ribs, crownY, rivets: ribRivets } = dome(g, girderTop, detail);
  const girders = diagonalGirders(g, roomTop, detail);

  // The stair core, from the girders' crossing up through the dome's crown
  // and the terrace to the lantern's floor, which it carries.
  // Open at both ends: its ladder comes out at the top into the lantern
  // (`stairs.ts`), and its foot stands on the girders' plated top.
  const ladder = prism(
    g,
    "ladderCylinder",
    LADDER.sides,
    [girderTop, lanternLevels().lanternFloor],
    circum(LADDER.diameter, LADDER.sides),
    false,
  );
  const summit: NodeHandle[] = [
    ...gallery(g),
    ...pavilion(g),
    contrefiches(g),
    ...(girders.summit ?? []),
    ribs,
    ladder,
    ...lantern(g, crownY),
  ];
  const glazed = summitGlass();
  return joinParts(panel29(g, detail), {
    summit,
    glass: [slabs(g, "galleryGlass", glazed.gallery), slabs(g, "pavilionGlass", glazed.pavilion)],
    gussets: girders.gussets ?? [],
    rivets: [...(girders.rivets ?? []), ...ribRivets],
  });
}
