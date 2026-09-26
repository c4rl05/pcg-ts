/**
 * The floor platforms, the lift-transfer landing, and the masonry pedestals,
 * with the 1st and 2nd floors fitted out as they stood in 1889.
 *
 * Every deck is a slab whose TOP is the printed floor level (Plate I; the
 * structural nodes sit 0.23 m below), 0.60 m thick [estimated] unless the
 * plates give its depth:
 *
 * - 1ST FLOOR, y 57.63: "côté extérieur 70m695, surface 4200 m²"
 *   [sourced]. 70.695² is 4,998 m², so the middle is open: the central
 *   void, inside the inner uprights (32.70 m apart at node XXIII), so the
 *   ring spans the legs. The void is not a square: a 29.00 square with
 *   its corners cut at 45 degrees and a bowed balcony on every face
 *   [sourced PL-XVIII, PL-XVI, Eiffel's text; see `VOID`], which leaves
 *   4,250 m² against the printed 4,200. The slab is cut into convex quads
 *   between the void's edge and the step to the gallery, laid out on the
 *   +z face between the diagonals and turned onto the other three
 *   (`firstDeck`), less the ground stair's arrivals in piles 4 and 2
 *   (`STAIR_OPENINGS`). The ring's outer 2.60 m is the promenade gallery,
 *   1.23 m LOWER than the rest (below), a second ring of four pinwheel
 *   slabs; the platform proper stops 2.60 inside the edge, where its edge
 *   girder closes the step (`STEP`).
 * - 2ND FLOOR, y 115.73: 37.63 m square [estimated reading of a smudged
 *   digit; see `PLATFORMS`]. 37.63² = 1,416 m² against the printed 1,400,
 *   which is inside the rounding the 3rd floor shows (18.65² = 348 m²
 *   against a printed 350), so no hole is inferred: a solid deck, less the
 *   openings of e1's last flights (`STAIR_OPENINGS`).
 * - LANDING, y 195.93 [sourced], inside the shaft between nodes X and IX:
 *   a square turned 45 degrees, 11.337 on its girders' axes, its vertices
 *   on the face centre lines, the corner triangles of the shaft left open
 *   [sourced PL-XVI Fig. 14, PL-XIX Fig. 14]. A 0.22 floor over lattice
 *   girders 2.30 deep round its edge, less the well of the lower Edoux car
 *   and the opening of the stair from the 2nd floor (see `LANDING`).
 * - 3RD FLOOR, y 276.13: the glazed gallery's octagon, 16.56 across the
 *   flats, 0.85 deep, flush with the glass [sourced PL-XIX Figs 3, 9],
 *   less the wells of the upper Edoux car and the stair from the landing;
 *   on two curved consoles a face (see `THIRD`, `CONSOLE`). Plate I's
 *   "côté extérieur 18m65" is carried by no element: the text closes the
 *   floor at 16.56 (see `THIRD`), so no deck is 18.65 wide.
 * - PEDESTALS: the four decorative masonry "soubassements", hollow skirts
 *   round the legs' feet, 5.55 high to where the uprights come out of them
 *   [measured PL-I, PL-VII; SOURCES.md §24]: a battered block, a cornice at
 *   2.00-2.72, five steps and a top slab, their outer faces' foot 62.453
 *   from the axis on both x and z [derived from Plate I's ground chain
 *   25.334 + 74.238 + 25.334], their inner faces' foot 38.17, at the arch's
 *   pier, where the chain's 74.238 is the arch's own feet (see `PEDESTAL`,
 *   `PEDESTAL_SKIRT`). One per leg, copied onto the quadrant targets.
 *
 * THE 1889 FIT-OUT (SOURCES.md §10; Plates XIII, XVI, XVIII, XIX, XXIX,
 * XXX of Eiffel's album, and his text volume). Everything below is laid
 * out ONCE in a face frame — `a` along the face, `y` up, `r` out from the
 * tower's axis, so the +z face is (a, y, r) — and turned onto the four
 * faces by the quadrant targets' turns (0, 90, 180, 270 degrees about +y).
 *
 * - THE GALLERY ("galerie promenade"): the platform's outer 2.60 m
 *   [sourced PL-XVIII], its floor at altitude 89.90, 1.23 below the
 *   platform's 91.13 [sourced PL-XIX], so y 56.40 [derived]. The 70.69
 *   side is measured on the arcade's column axis and the floor gutter runs
 *   0.50 beyond it, 71.69 overall [sourced, Eiffel's text], so the gallery
 *   ring reaches 0.50 past the platform's printed side.
 * - THE ARCADE along its outer edge, 9 bays of 7.765 per face [sourced
 *   PL-XIII, PL-XVIII "8.16 | 7.76 × 7 | 8.16"]. Each bay: a pier of two
 *   cast-iron columns 0.800 apart at each end, a single column mid-bay,
 *   and two small round arches between them, intrados radius 1.538
 *   springing 0.30 above the 3.80 m columns, rib 0.20 [sourced PL-XIII];
 *   over each pier a 2.25 m plate pier up to the valley gutter, 6.05 above
 *   the gallery floor [sourced, derived]. Every bay is roofed by its own
 *   vault running back from the face, its axis perpendicular to it, 4.1875
 *   deep to an inner arcade of pilasters [sourced PL-XIII]; crown 8.70
 *   above the gallery floor [sourced PL-XIX], the vault a semi-ellipse on
 *   the 7.035 m between the 0.73 m valley gutters [estimated fit, PL-XIII].
 *   Its gable is a crescent between that arc and an inner arc crowned at
 *   6.95 [sourced PL-XIX], glazed between rays, so built as its ribs and
 *   rays; the lunette under the inner arc is a wooden trellis [sourced],
 *   built as its laths; the vault behind is a shell (see `GABLE`,
 *   `bayRoof`). It ends on the INNER ARCADE, iron pilasters one to a pier
 *   under an open braced arch, and a valley gutter over every pier back
 *   from the face (PL-XIII Figs 2, 21, 26-39; see `INNER_ARCADE`); the
 *   corner bays' ends, where two faces' vaults cross, are not drawn on the
 *   plates read and left open. Every pier carries an 8.00 m flag mast
 *   [sourced text] topping out about 12.2 above the gallery floor
 *   [estimated]; every arcade its dressing, drawn once and placed on all
 *   36 (`ARCADE_DRESS`): the palmette crest to 9.97 [measured PL-XIX], a
 *   yellow glass cabochon in each of the crescent's 12 cells [sourced text;
 *   counted PL-XIX], and a frosted gas globe [sourced text] hung over the
 *   gallery [estimated].
 * - THE FOUR PAVILIONS, one per face on its 3 central bays, of one plan
 *   [sourced text: "les mêmes dimensions en plan"]: 23.295 along the face
 *   by 14.9975 deep [sourced PL-XXIX, PL-XXX], their gallery façade
 *   2.600 + 1.6865 = 4.2865 inside the column axis [sourced PL-XXX]. The
 *   model has no compass; on Plate XVIII's own layout, which the render's
 *   top view reproduces (x right, z down), they are the RESTAURANT
 *   FRANÇAIS on -z (piles 2 Est and 3 Sud), the RESTAURANT RUSSE on -x
 *   (piles 2 and 1 Nord), the BAR ANGLO-AMÉRICAIN on +x (piles 3 and 4
 *   Ouest) and the RESTAURANT FLAMAND on +z (piles 1 and 4), a theatre
 *   after 1889 [sourced PL-XVIII Nota]. Their roof IS the arcade's: « la
 *   toiture de chaque arceau se prolonge sur toute la profondeur du
 *   bâtiment » [sourced text], so each of the 3 bays' vaults runs on from
 *   the arcade to the building's back, a shell over a glazed tympanum at
 *   either end (`tympanum`). The rear 3.35 m is an annex that
 *   rises full height only in the centre bay; in the outer bays it stops at
 *   2.95 as a roof terrace [sourced text, PL-XXX], and those vaults stop
 *   there. The walls rise to the gallery's valley gutters, 4.82 above the
 *   restaurant floor [derived: 56.40 + 6.05 − 57.63], within the 4.61 to
 *   5.03 the pavilion plates print for their own [sourced]; the hall is its
 *   walls, the gallery façade two glazed doors a bay between piers
 *   (`FACADE`), glazed (`glazing`). Each vault
 *   carries a glazed ridge lantern: 2.65 wide, a gable 3.80 eave to eave
 *   rising 0.70 to a ridge at altitude 99.37 [sourced PL-XXX; the others
 *   print 99.39 and 99.40], its length [estimated from the roof plan].
 *   In front of each, along the terrace's edge to the mid-bay columns at
 *   ±15.53, the terrace balustrade, open over the centre bay on the
 *   Français and the Russe (`TERRACE_RAIL`), where a pair of quarter-turn
 *   flights comes up from the gallery to a landing pushed out over it,
 *   cut into the terrace (`ENTRANCE`).
 * - BALUSTRADES: rails and posts. The gallery's: 1.150 tall, cast-iron
 *   pilasters every 1.74125, mid-arch, where the columns do not stand
 *   [sourced PL-XIII], its infill five glazed stoneware balusters to an
 *   interval, 720 [sourced PL-XIII, the ledger; the text's 560 disagrees],
 *   as instances (`BALUSTER`); the others' infill (X panels) left out.
 *   Round the central void ("Balcon") the same, following its edge, which
 *   no plate read prints [estimated]. The 2nd floor's: 1.150 [sourced
 *   13bis].
 * - THE 2nd-FLOOR GALLERY ("galerie couverte"): posts every 3.36268, 3.62
 *   tall [sourced 13bis], on two lines 2.096 clear apart [sourced, one
 *   digit ambiguous], under a pitched roof whose ridge runs along the face,
 *   eaves about 3.0 and ridge about 3.6 [estimated], behind a 0.62 attic
 *   band on the outer posts [sourced height]. A flag mast stands on each
 *   outer post (`SECOND_MAST`). Inside it, what stood on the platform in
 *   1889 as PL-XIX Fig. 7 places it and the text describes it — the lifts'
 *   two reservoirs, Le Figaro's printing pavilion, the ticket office and
 *   water-closets, two boutiques, three tents — as massing at the plate's
 *   places (`SECOND_FITOUT`, which says what is left out and why).
 *   Under the deck's edge hangs its SKIRT, a curved plate 5.15 deep
 *   [sourced PL-XIX Fig. 2] leaning in 1.3 to its foot at node XVIII,
 *   unbroken across the faces, which hides panel 11's belt (see
 *   `SECOND_SKIRT`), panelled with ribs and consoles every 3.36268
 *   (`SECOND_SKIRT_RELIEF`).
 * - THE SKIRT below the 1st-floor gallery: 0.50 of cornice and 5.50 of
 *   plate panels down to altitude 83.90 [sourced PL-XIX], the plate leaning
 *   in 0.62-0.93 at the foot [measured PL-XIII], here a plane leaning in
 *   0.60 (see `SKIRT`), with its consoles, cresting, pilasters and
 *   mouldings (`SKIRT_ORNAMENT`). The gallery slab's own edge stands for the
 *   cornice. Its names band, 0.80 tall [sourced], carries the 72 names of
 *   French scientists and engineers, 18 to a face [sourced PL-XIX's list]:
 *   18 plaques per face on the panel's outer face, 4.02 to 4.82 below the
 *   gallery floor [measured PL-XIX], one to each 3.8825 console bay, each
 *   lettered with its name in raised gilt capitals 0.60 tall (see `NAMES`,
 *   `namesLettering`, `savants.ts`, `letters.ts`). The plaques are painted
 *   iron with the skirt; only the letters are gilt.
 * - THE UNDERSIDE: cross girders 4.00 deep every 3.8825 [sourced PL-XVI],
 *   tops 0.23 under the floor [sourced], spanning between the main girders
 *   on the outer and inner uprights' lines between the legs (the inner one
 *   is `firstFloor.ts`'s inner grande poutre, which their inner ends meet
 *   at the chord). They lean with the legs (panel 5's parallel prisms), so
 *   each is a parallelogram; its lattice (4 panels, one diagonal each) and
 *   sections are [estimated]. Inboard of the inner girder, the consoles
 *   that carry the void's balconies, and the cut corners' edge girders
 *   (`BALCONY`).
 * - THE 3rd FLOOR gets no balustrade: its gallery is INSIDE the glazed room
 *   (`summit.ts`), whose 1.200 plate parapet is the railing [sourced PL-XIV].
 *
 * NORMALS. Everything in the platforms class is a closed convex outline
 * extruded along its own normal — the boxes too, each a rectangle
 * extruded by its depth (`blockPrism`) — and keeps the flat `normal` the
 * extrusion writes, wall by wall and cap by cap. It has to: the class also
 * holds `lifts.ts`'s rail skin, which carries normals, and a class merge
 * fills a part that has none with zeros, which the page shades black —
 * which is what made these floors read as black masses (measured
 * 2026-09-19 on the model before this was done: 139,800 of the class's
 * 152,652 points; those left are `lifts.ts`'s cars and stairs, which write
 * none). Nothing here is copied by the quadrant targets, whose
 * copies would not turn a normal: every part is laid out on the +z face
 * and turned in TypeScript. The pedestals (masonry) and the names keep no
 * normals, as their classes carry none and the page computes them.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  attribute,
  copyToPoints,
  extrudePolygon,
  mergePrimitives,
  pointGrid,
  pointsToPath,
  removeAttribute,
  setAttribute,
  spawnInstances,
  vec,
} from "pcg-ts";
import { type Vec3, copyToQuadrants, indexTable } from "./lattice.js";
import { archPierBases } from "./firstFloor.js";
import { ALPHABET, glyph, setLine } from "./letters.js";
import { type Parts, jitter } from "./parts.js";
import { SAVANTS } from "./savants.js";
import { FACES, FLOORS, MEMBERS, PANEL29, PEDESTAL, PLATFORMS, profileAt } from "./spec.js";

/** Every deck's thickness [estimated]. */
const DECK = 0.6;

/**
 * The 1st floor's outer gallery and its arcade (heights above the gallery
 * floor; tags as in the file comment).
 */
const GALLERY = {
  /** Altitude 89.90 [sourced PL-XIX] less the ground's 33.50. */
  floor: 56.4,
  /** Column axis to the raised platform [sourced PL-XVIII]. */
  width: 2.6,
  /** The floor gutter outboard of the column axis [sourced text: 71.69 − 70.69, halved]. */
  gutter: 0.5,
  /** One bay: 2 × 3.8825 [sourced]. */
  module: 7.765,
  /** The two columns of a pier, centre to centre [sourced]. */
  pair: 0.8,
  /** Column shaft, square [sourced], and height [sourced]. */
  column: 0.18,
  columnHeight: 3.8,
  /** Small arches: intrados radius, springing above the column tops, rib depth [sourced]. */
  archRadius: 1.538,
  archSpring: 0.3,
  archRib: 0.2,
  /** The plate pier over each pair, up to the valley gutter [sourced]. */
  pierHeight: 2.25,
  /** Valley gutter between two bays' vaults [sourced]. */
  valley: 0.73,
  /** Vault crown at the face [sourced]. */
  crown: 8.7,
  /** Column axis to the inner arcade, where a vault ends [sourced]. */
  depth: 4.1875,
  /**
   * The gable's inner arc: its crown [sourced PL-XIX "6.95", 1.75 under
   * the outer], and its radius [sourced PL-XIII Fig. 26 "R 3.3675"; that it
   * is this arc's, estimated].
   */
  innerCrown: 6.95,
  innerRadius: 3.3675,
} as const;

/** The arcade's lesser members [estimated: thicknesses, crest and mast sections]. */
const ARCADE = {
  /** Plate pier and arch rib thickness through the face. */
  plate: 0.15,
  /** Facets per small arch. */
  archFacets: 6,
  /** Segments of each vault's half-ellipse. */
  vaultSegments: 12,
  /** The vault's roof (zinc on boarding and purlins), as a shell. */
  shell: 0.1,
  /** Flag mast: 8.00 long [sourced text], foot 4.2 above the gallery floor, section. */
  mast: { length: 8, foot: 4.2, size: 0.12 },
} as const;

/**
 * The inner arcade, « Arcades des Pilastres en fer » (PL-XIII Figs 2, 21,
 * 26-32, 37, 39; heights above the gallery floor, tags as in the file
 * comment). Every vault's inner end rests on it, 4.1875 from the column
 * axis to the pilasters' inboard face [sourced Fig. 21: 0.6725 + 3.515,
 * measured there from the face member's inner face, 0.095 inside the axis,
 * so 4.2825 from the axis itself; Fig. 31's frame, 4.2745 overall, less
 * its 0.18 column head, gives 4.185-4.20, derived: 4.1875 is kept, within
 * both readings' spread], which is where the
 * vault shells already end (`GALLERY.depth`).
 *
 * - PILASTERS, one per pier, every 7.765, single, none mid-bay [sourced
 *   Figs 26, 27]: a built-up plate member 0.497 deep square to the face
 *   [sourced Fig. 32 "497"], 0.130 across it [sourced Fig. 32 "130/5";
 *   drawn 0.15-0.16 with its cover plates, measured]. Each stands on the platform (the terrace, 1.23 above the
 *   gallery [sourced Figs 2, 6 "1.230"]) up to a head 0.980 wide and 1.600
 *   tall whose underside is 0.438 above the column tops, 4.238 [sourced
 *   Fig. 26 "487.5 + 5 + 487.5", "1.600", "438"; sum derived], rounded
 *   into the shaft by two quarters of R 0.500 [sourced], drawn finishing
 *   0.25-0.27 up the shaft [measured], here a chamfer over 0.26
 *   [estimated]. Fig. 26 tops the head at 5.838 [derived],
 *   the gutter line PL-XIX prints "5.84"; the model springs its vaults
 *   from the face's 6.05 (`SPRING_Y`), so the head stops under the
 *   gutter, which spans the 0.21 [derived].
 * - Where a pier stands in front of a leg, Figs 2 and 28-30 move the
 *   pilaster out to the platform's edge, "2.420", "2.427", "2.600" from
 *   the columns, and carry the frame on to the leg by a 2.265 bracket,
 *   4.947 overall [sourced] — the leg's face is 4.08 inside the column
 *   axis at the platform (its outer uprights' line 31.27 from the axis),
 *   so a pilaster at 4.1875 would stand in the leg's belt [inference: the
 *   model's leg leaves that spot open]. Here it stands on the gallery
 *   floor against the step's face, 2.35 from the column axis [derived:
 *   the step is at 2.60, the pilaster 0.497 deep; the plates' 2.420 runs
 *   to its outboard face, which with the drawn stem puts its axis near
 *   2.67, measured, 0.32 further in, where the model's step stands], and the gutter over it
 *   runs the 4.947 [sourced] back to the leg. Which piers those are is a
 *   rule, not a list: a pier whose station along the face lies within the
 *   leg's width at the gallery floor (`profileAt`), with a pilaster's
 *   clearance to spare.
 * - THE ARCH between two pilasters' heads, Fig. 26 [sourced]: two ribs
 *   0.200 deep, braced by radial angles (50 × 50 × 5, 40 × 40 × 5), its
 *   lunette open — no trellis, no glazing [sourced drawing]. The outer rib
 *   lies under the vault's arc (here under its shell, which it carries),
 *   crowned 2.862 above the gutter line, 8.70
 *   above the floor as at the face [sourced Figs 26, 28, 31 "4.900" above
 *   the column tops; PL-XIII's 8.940 is the same crown on a datum 0.24
 *   lower, so the vault is level, derived]. The inner rib crowns 1.950
 *   under the outer crown, 6.75 [sourced "1.950"; derived], as an arc of
 *   R 3.5675 [the printed R read 3.5675 and 3.0675 by two readers; a fit
 *   to the drawn curve gives 3.62, measured], where the face gable's is
 *   R 3.3675 at 6.95 (`GALLERY.innerCrown`). Fig. 26 draws each half from
 *   its own centre, 0.325 off the axis (« 325 », « 3.3925 »), running down
 *   past the gutter line to about 5.0-5.2 at ±3.39 [sourced; measured];
 *   the model makes it one circle cut at its 6.05 springing, 2.12 either
 *   side of the middle against the drawn 2.35-2.44 [simplified]. Rays as the face gable's; the thickness
 *   through the plane as the face's plate [estimated].
 * - THE VALLEY GUTTER over each pier, the top of the transverse frame
 *   from the column head back to the pilaster (Figs 28-31, 37, 39):
 *   0.940 overall, 0.730 clear, the valley between two bays' vault feet
 *   [sourced Fig. 39], the frame's top chord 0.350 deep [sourced Fig. 37
 *   "200 + 150"], under the springing line.
 * - NOT BUILT: the corner square, where two faces' corner bays meet over
 *   the leg's corner upright and their vaults cross at the crown — the
 *   « arcades avec caisson d'angle » of the accounts [sourced E1900-TXT
 *   p. 218], which no plate read draws. So the corner piers get no
 *   pilaster or gutter, and the corner bays no inner arch: their vaults
 *   end open where the neighbouring face's corner vault crosses them (the
 *   gable "drawn as the outer one" that closed them before ran through
 *   that vault). Nor the leg zone's shell running on past the arch to the
 *   leg (Figs 28-30): the gutter carries the arch's foot there.
 */
const INNER_ARCADE = {
  /** Column axis to the pilasters' inboard face [sourced]. */
  depth: 4.1875,
  /** Pilaster: across the face, square to it [sourced]. */
  width: 0.13,
  deep: 0.497,
  /** Head: width along the face, underside and top (the gutter line) [sourced]. */
  headWidth: 0.98,
  headFoot: 4.238,
  headTop: 5.838,
  /** The R 0.500 quarters at the head's foot, as a chamfer's height [measured, chamfer estimated]. */
  flare: 0.26,
  /** In front of a leg: column axis to the pilaster's axis [derived], and the frame's reach [sourced]. */
  legAxis: 2.35,
  legReach: 4.947,
  /** The inner rib's arc: radius and the crown of its underside [sourced; derived]. */
  innerRadius: 3.5675,
  innerCrown: 6.75,
  /** Both ribs' depth [sourced]. */
  rib: 0.2,
  /** Valley gutter: overall width [sourced], depth [sourced]. */
  gutter: 0.94,
  gutterDepth: 0.35,
} as const;

/** The four pavilions (face frame; tags as in the file comment). */
const PAVILION = {
  /** Along the face, the 3 central bays [sourced]. */
  length: 23.295,
  /** Gallery façade to interior façade [sourced]. */
  depth: 14.9975,
  /** Column axis to the gallery façade: 2.600 + 1.6865 [sourced]. */
  front: 4.2865,
  /** The rear annex's depth, and its height in the outer bays [sourced]. */
  annex: 3.35,
  annexHeight: 2.95,
  /** Lantern: glazed body width, eave-to-eave width, rise to the ridge [sourced]. */
  lanternBody: 2.65,
  lanternWidth: 3.8,
  lanternRise: 0.7,
  /** Lantern eave: 7.537 above the restaurant floor [sourced PL-XXX]. */
  lanternEave: FLOORS.first + 7.537,
  /**
   * Lantern extents [estimated, PL-XXX roof plan]: the centre bay's from 0.7
   * inside the interior façade to 1.0 short of the gallery façade; the
   * outer bays' 10.4 long, ending 0.4 short of it.
   */
  centreLantern: { back: 0.7, front: 1.0 },
  outerLantern: { length: 10.4, front: 0.4 },
  /** Lantern roof slab and body sink below the vault crown [estimated]. */
  roofSlab: 0.06,
  bodySink: 0.25,
} as const;

/** A balustrade's section: height, plinth and top rail heights, rail width, post width. */
interface RailSpec {
  readonly height: number;
  readonly plinth: number;
  readonly cap: number;
  readonly rail: number;
  readonly post: number;
}

/**
 * The 1st-floor gallery's balustrade [sourced PL-XIII]: 1.150 tall, a 0.150
 * plinth, the channel and wooden handrail on top from 1.040 [derived: 0.150
 * + 0.890], "Fer en U 140" rails, cast-iron pilasters 180 wide.
 */
const GALLERY_RAIL: RailSpec = { height: 1.15, plinth: 0.15, cap: 0.11, rail: 0.14, post: 0.18 };
/** Its pilasters stand mid-arch, every 1.74125 [sourced]. */
const GALLERY_RAIL_PITCH = 1.74125;

/** The 2nd floor's balustrade: 0.150 + 0.900 + 0.100 [sourced 13bis]. */
const SECOND_RAIL: RailSpec = { height: 1.15, plinth: 0.15, cap: 0.1, rail: 0.14, post: 0.18 };

/** The 2nd floor's covered gallery (heights above its floor). */
const SECOND_GALLERY = {
  /** Post pitch and height [sourced 13bis]; section, two 160 channels [sourced]. */
  pitch: 3.36268,
  postHeight: 3.62,
  post: 0.16,
  /** Clear width between the post lines [sourced; the digit may read 2.996]. */
  clear: 2.096,
  /** The outer post line's inset from the deck edge [estimated]. */
  inset: 0.15,
  /** Eaves, ridge, the inner eave's overhang and the roof's thickness [estimated]. */
  eave: 3.0,
  ridge: 3.6,
  overhang: 0.2,
  roof: 0.08,
  /**
   * The attic band between the eaves and the post tops, 0.62 [sourced
   * 13bis], on the outer post line, where it hides the roof [estimated];
   * its thickness [estimated]. The inner posts stop at the eaves.
   */
  attic: 0.1,
} as const;

/**
 * The skirt's foot [sourced: altitude 83.90], and its lean. PL-XIII's
 * section through a pier (Fig. 2, 1:50) draws the plate starting on the
 * column axis just under the 0.50 cornice and leaning in straight, 0.93 at
 * the foot; its elevation of the corner (Fig. 1) draws 0.62 [measured,
 * both]. The panel is a plane mitred at the corners, so it takes one
 * lean: 0.60, which lands its inner face at the foot, node XXIV, 34.67
 * from the axis: 0.01 off the grande poutre's bottom chord (34.66), where
 * the plate is fixed, and 0.09 clear of the legs' outer uprights (34.58)
 * [measured on the cooked mesh]. Thickness [estimated].
 */
const SKIRT = { bottom: 83.9 - 33.5, lean: 0.6, thickness: 0.08 } as const;

/**
 * The names band on the skirt: 0.80 tall [sourced PL-XIX], its top 4.02
 * below the gallery floor [measured PL-XIX Fig. 1, 1:200, and checked on
 * both halves of the plate], under the cove of volute brackets and the
 * lattice cresting, 1.18 above the skirt's foot. One plaque to each
 * console bay, 3.8825 [sourced PL-XVI; PL-XIX "3.88"]: the consoles stand
 * under the column positions, a multiple of 3.8825 from the face's middle
 * out to the corner piers, so the 18 bays between them are the 18 names a
 * face carries [sourced PL-XIX's list, 18 a face]. The pilasters between
 * them (`SKIRT_ORNAMENT`) leave each cartouche about 3.28 [measured PL-XIX
 * Fig. 1], so the plaques are 3.2825, 0.60 apart; their thickness
 * [estimated].
 */
const NAMES = {
  perFace: 18,
  top: 4.02,
  height: 0.8,
  pitch: 3.8825,
  gap: 0.6,
  thickness: 0.03,
} as const;

/**
 * The names' letters (see `savants.ts` for the text and `letters.ts` for
 * the glyphs): capitals 0.60 tall [sourced secondary: Barral 1892 p. 19;
 * measured 0.60 on the S.E. face's photograph, scaled by the 3.8825 pilaster
 * pitch], in relief on the plaques, gilt. How far they stand proud is not
 * recorded: 0.025 [estimated], seated 0.005 into the plaque so no seam
 * shows. Each name is centred on its plaque and set within 0.06 of its ends
 * [estimated]: at 0.20 of the cap height between letters, tracked tighter
 * down to 0.08 for a long name and then condensed, as the tower's long names
 * are (LE CHATELIER and GAY-LUSSAC fill their panels on the S.W. face's
 * photograph), never below 0.70 across. The widest of the 72, LE
 * CHATELIER, is condensed to 0.778, and seven are condensed at all.
 */
const LETTERING = {
  height: 0.6,
  relief: 0.025,
  embed: 0.005,
  margin: 0.06,
  tracking: 0.2,
  minTracking: 0.08,
  minCondense: 0.7,
} as const;

/** The skirt plate's drop from the gallery slab's underside to its foot, and its length. */
const SKIRT_DROP = GALLERY.floor - DECK - SKIRT.bottom;
const SKIRT_LEN = Math.hypot(SKIRT_DROP, SKIRT.lean);
/** The plate's outward normal, as (y, r): it looks slightly down. */
const SKIRT_OUT: readonly [number, number] = [-SKIRT.lean / SKIRT_LEN, SKIRT_DROP / SKIRT_LEN];
/** The plate's tilt about the face's a axis (the names band's). */
const SKIRT_TILT = Math.atan2(SKIRT.lean, SKIRT_DROP);

/**
 * The skirt's ornament, top down (PL-XIX Fig. 1, 1:200, 80.84 px/m on its
 * printed "0.50", "5.50" and "8.70"; depths below the gallery floor; tags
 * as in the file comment). What the model had was a bare plate, which
 * faces slightly down and so reads as one dark sheet; the plate's relief
 * is what the 1889 photographs show on it.
 * - VOLUTE CONSOLES in the cove under the cornice, « 1.50 » tall
 *   [sourced], here 0.60 -> 2.10 (the gallery slab stands for the 0.50
 *   cornice), one under every column position, so every 3.8825 from the
 *   face's middle, 19 a face [sourced drawing; PL-XVI Fig. 9 puts the
 *   gallery's brackets at the same stations]. Their outer profile is a
 *   quarter ellipse from 0.40 beyond the column axis at the top into the
 *   plate at the foot: the cove the elevation's ends draw bulging past the
 *   axis [measured]. 0.30 wide [estimated]; the scrolls and leaf pendants
 *   are left out.
 * - the CRESTING between them, 2.17 -> 3.61 [measured]: a console bay of
 *   four diamond-lattice panels under a rail, a diamond over each [sourced
 *   drawing; the bars' sizes estimated].
 * - MOULDINGS 3.61 -> 4.03 over the names and 4.82 -> 4.95 under them, and
 *   the bottom fascia 5.62 -> 6.00 [measured], standing proud of the plate
 *   [estimated]. The two that frame the names stop on the plaques' own
 *   edges, 4.02 and 4.82 (`NAMES`), 0.01 inside the reading, so a plaque
 *   meets its mouldings rather than running into them.
 * - PILASTERS between the names, under the consoles, over the plaques'
 *   height [sourced drawing], 0.40 wide [measured: 0.4-0.6 with their bases].
 */
const SKIRT_ORNAMENT = {
  console: { top: 0.6, foot: 2.1, reach: 0.4, width: 0.3, segments: 5 },
  cresting: {
    top: 2.17,
    rail: 2.68,
    bottom: 3.61,
    panels: 4,
    bar: 0.05,
    diamond: 0.26,
    proud: 0.04,
  },
  mouldings: [
    [3.61, NAMES.top, 0.05],
    [NAMES.top + NAMES.height, 4.95, 0.05],
    [5.62, 6.0, 0.07],
  ],
  pilaster: { top: NAMES.top, bottom: NAMES.top + NAMES.height, width: 0.4, proud: 0.07 },
} as const;

/** The plaque in the console bay centred at a on the +z face (see `NAMES`). */
function namePlaque(a: number): Block {
  const up = SKIRT_LEN / SKIRT_DROP;
  return onSkirt(a, NAMES.top + NAMES.height / 2, NAMES.pitch - NAMES.gap, NAMES.height * up, NAMES.thickness);
}

/** One lettered plaque: its face, its place in the row and its name, and its solids in the world. */
export interface NamePanel {
  readonly compass: (typeof FACES)[number]["compass"];
  readonly quadrant: 0 | 1 | 2 | 3;
  /** 0 to 17, left to right seen from outside the face. */
  readonly index: number;
  readonly text: string;
  /** How the name was set (`setLine`): its width, tracking and condense. */
  readonly width: number;
  readonly tracking: number;
  readonly condense: number;
  /** The plaque, as the prism the skirt's ornament cooks. */
  readonly plaque: Prism;
  /** The letters' convex pieces, each extruded out of the plaque. */
  readonly letters: readonly Prism[];
  /**
   * The same letters as glyphs placed, which is how the graph builds them
   * (`namesLetters`): each glyph at cap height 1 and 1 deep, scaled by
   * `scale`, turned by `rot` and moved to `at`, its ink's origin on the
   * baseline in the letters' seat. Spaces are left out.
   */
  readonly glyphs: ReadonlyArray<{ readonly ch: string; readonly at: Vec3 }>;
  readonly rot: Quat;
  readonly scale: Vec3;
}

/**
 * The 72 lettered plaques, face by face (`FACES`, `SAVANTS`): each name set
 * on the plaque of its console bay, left to right as seen from outside, so
 * along +a in the face frame. A letter's piece is laid on the plaque's
 * outer face less `LETTERING.embed`, wound counter-clockwise seen from
 * outside (a right, up the plate up), so it extrudes outward. The plaques
 * cook with the skirt's ornament (platforms); the letters are the names
 * class, and keep no normals.
 */
export function namesLettering(): NamePanel[] {
  const L = LETTERING;
  const up = SKIRT_LEN / SKIRT_DROP;
  const middle = NAMES.top + NAMES.height / 2;
  const seat = NAMES.thickness - L.embed;
  const fit = {
    height: L.height,
    width: NAMES.pitch - NAMES.gap - 2 * L.margin,
    tracking: L.tracking,
    minTracking: L.minTracking,
    minCondense: L.minCondense,
  };
  const out: NamePanel[] = [];
  for (const face of FACES) {
    const names = SAVANTS[face.compass];
    if (names.length !== NAMES.perFace) {
      throw new Error(
        `platforms.ts namesLettering: face ${face.compass} lists ${names.length} names; ` +
          `the frieze has ${NAMES.perFace} a face (savants.ts SAVANTS.${face.compass})`,
      );
    }
    names.forEach((text, i) => {
      const a = (i - (NAMES.perFace - 1) / 2) * NAMES.pitch;
      const set = setLine(text, fit);
      // Up the plate from the band's middle, v, is a depth v / up higher.
      const at = ([u, v]: readonly [number, number]): Vec3 => {
        const [y, r] = skirtAt(middle - (v - L.height / 2) / up);
        return onFace(face.quadrant, [a + u, y + SKIRT_OUT[0] * seat, r + SKIRT_OUT[1] * seat]);
      };
      out.push({
        compass: face.compass,
        quadrant: face.quadrant,
        index: i,
        text,
        width: set.width,
        tracking: set.tracking,
        condense: set.condense,
        plaque: blockPrism(allFaces([namePlaque(a)], [face.quadrant])[0] as Block),
        letters: set.pieces.map((piece) => ({ outline: piece.map(at), depth: L.relief + L.embed })),
        glyphs: set.placed.filter((x) => x.ch !== " ").map((x) => ({ ch: x.ch, at: at([x.x, 0]) })),
        // Local x along the face, y up the plate, z out of it: the skirt's tilt, then the face's turn.
        rot: qmul(turn(1, (face.quadrant * Math.PI) / 2), turn(0, SKIRT_TILT)),
        scale: [set.condense * L.height, L.height, L.relief + L.embed],
      });
    });
  }
  return out;
}

/**
 * The names class: every glyph the alphabet draws, built once at cap height
 * 1 and extruded 1 along +z, its points keyed by the glyph's place in
 * `ALPHABET`, and one copy of it per letter of the 72 names, each target
 * asking for its own glyph (`sourceGroupAttr` / `targetGroupAttr`) and
 * carrying its panel's `rot` and `scale` (`namesLettering`). The same
 * solids as the panels' `letters`, point for point [measured by
 * tests/eiffelNames.test.ts], at a fraction of the cook: the letters'
 * 17,844 outline points built as prisms added about 250 ms to the plain
 * depth's cook (755 to 1,004 ms), the alphabet's 27 glyphs and 491 copies
 * nothing measurable (586 against 571 ms, medians of 5 interleaved runs)
 * [measured 2026-09-26]. Keeps no normals (the class has none; the page
 * computes them).
 */
function namesLetters(g: Graph): NodeHandle {
  const shapes: Array<{ outline: Vec3[]; glyph: number }> = [];
  [...ALPHABET].forEach((ch, k) => {
    for (const piece of glyph(ch).pieces) shapes.push({ outline: piece.map(([x, y]): Vec3 => [x, y, 0]), glyph: k });
  });
  const pts = shapes.flatMap((s) => s.outline);
  const slots = g.add(
    pointGrid,
    { countX: pts.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    "namesGlyphSlots",
  );
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(indexTable(pts.map((p) => p[0])), indexTable(pts.map((p) => p[1])), indexTable(pts.map((p) => p[2]))),
    },
    "namesGlyphPlace",
  );
  const key = g.add(
    setAttribute,
    { name: "prism", type: "i32", value: indexTable(shapes.flatMap((s, i) => s.outline.map(() => i))) },
    "namesGlyphKey",
  );
  const which = g.add(
    setAttribute,
    { name: "glyph", type: "i32", value: indexTable(shapes.flatMap((s) => s.outline.map(() => s.glyph))) },
    "namesGlyphWhich",
  );
  const paths = g.add(pointsToPath, { groupAttr: "prism", closed: true }, "namesGlyphPaths");
  const solid = g.add(extrudePolygon, { direction: "polygonNormal", distance: 1, caps: "both" }, "namesGlyphSolid");
  const bare = g.add(removeAttribute, { names: ["normal"], domain: "point" }, "namesGlyphs");
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", which, "in");
  g.connect(which, "out", paths, "in");
  g.connect(paths, "out", solid, "in");
  g.connect(solid, "out", bare, "in");
  // One target per letter.
  const letters = namesLettering().flatMap((p) =>
    p.glyphs.map((x) => ({ at: x.at, rot: p.rot, scale: p.scale, glyph: ALPHABET.indexOf(x.ch) })),
  );
  const col = (pick: (x: (typeof letters)[number]) => number) => indexTable(letters.map(pick));
  const targets = g.add(
    pointGrid,
    { countX: letters.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    "namesLetterSlots",
  );
  const at = g.add(
    setAttribute,
    { name: "P", type: "f32", tupleSize: 3, value: vec(col((x) => x.at[0]), col((x) => x.at[1]), col((x) => x.at[2])) },
    "namesLetterPlace",
  );
  const rot = g.add(
    setAttribute,
    {
      name: "rot",
      type: "f32",
      tupleSize: 4,
      value: vec(col((x) => x.rot[0]), col((x) => x.rot[1]), col((x) => x.rot[2]), col((x) => x.rot[3])),
    },
    "namesLetterTurn",
  );
  const size = g.add(
    setAttribute,
    {
      name: "scale",
      type: "f32",
      tupleSize: 3,
      value: vec(col((x) => x.scale[0]), col((x) => x.scale[1]), col((x) => x.scale[2])),
    },
    "namesLetterSize",
  );
  const ask = g.add(setAttribute, { name: "glyph", type: "i32", value: col((x) => x.glyph) }, "namesLetterGlyph");
  const copies = g.add(
    copyToPoints,
    { topology: "keep", sourceGroupAttr: "glyph", targetGroupAttr: "glyph" },
    "namesLetters",
  );
  g.connect(targets, "out", at, "in");
  g.connect(at, "out", rot, "in");
  g.connect(rot, "out", size, "in");
  g.connect(size, "out", ask, "in");
  g.connect(bare, "out", copies, "source");
  g.connect(ask, "out", copies, "target");
  return copies;
}

/**
 * The 2nd floor's skirt (PL-XIX Fig. 2, 1:200; tags as in the file
 * comment): « une tôle courbée de 3 mm … formant corniche décorative »
 * [sourced text], hanging 5.150 below the floor [sourced], so to altitude
 * 144.08, node XVIII, the foot of panel 11's belt, which it hides. It runs
 * unbroken over the legs and across the gap between them, with no consoles
 * under it [sourced drawing]. Its profile, from the silhouette the
 * perpendicular faces' skirts cut at the ends of the elevation, as
 * [depth below the floor, half-width] [measured at 78.95 px/m, the two ends
 * averaged]: steep in under the cornice, then nearly straight, 1.45 in
 * all. The plate's cornice line stands at 18.95, the moulding proud of the
 * printed 37.63; the model's skirt starts at the deck's edge. Thickness
 * [estimated].
 */
const SECOND_SKIRT = {
  profile: [
    [DECK, PLATFORMS.second.side / 2],
    [1.18, PLATFORMS.second.side / 2],
    [1.95, 18.35],
    [2.72, 17.98],
    [4.06, 17.71],
    [5.15, 17.5],
  ],
  thickness: 0.08,
} as const;

/**
 * The 2nd-floor skirt's panelling (PL-XIX Fig. 2, 1:200; the 1889
 * photographs show the same rhythm): a pilaster rib under every gallery
 * post, 3.36268 apart [sourced drawing: « its ornaments stand every
 * 3.36 »], a leaf console on each under the cornice, down to 1.60
 * [measured], the panels between divided in four by thin muntins, a rail
 * under the consoles at 1.18 -> 1.30 and a bottom band 4.85 -> 5.15
 * [measured]. Widths and projections [estimated].
 */
const SECOND_SKIRT_RELIEF = {
  rib: 0.3,
  ribProud: 0.1,
  console: { foot: 1.6, reach: 0.3, width: 0.45, segments: 4 },
  muntins: 3,
  muntin: 0.06,
  muntinProud: 0.03,
  /** The muntins' extent: from the rail's foot to the bottom band. */
  panelTop: 1.3,
  panelFoot: 4.85,
  bands: [
    [1.18, 1.3, 0.06],
    [4.85, 5.15, 0.08],
  ],
} as const;

/**
 * The 2nd floor's flag masts (PL-XIX Fig. 2, 1:200, 78 px/m; PL-I): one
 * on each of the gallery's outer posts, standing from the post's head at
 * 3.62 to 7.80 above the floor [measured], of the 1st floor's section
 * [estimated]. The 1889 photographs taken from the Champ de Mars show no
 * masts here, and no roofed gallery either; the plates, of 1900, show
 * both, and the model follows the plates (SOURCES.md §18.2).
 */
const SECOND_MAST = { top: 7.8, size: 0.12 } as const;

/**
 * What stood on the 2nd platform in 1889, as massing. « Pendant
 * l'Exposition de 1889, la plate-forme était occupée (Pl. XIX, fig. 2 et
 * 7) par » the Otis lifts' upper framing and their queues, « les grands
 * réservoirs cylindriques alimentant ces ascenseurs », the unused Roux
 * girders of piles 2 and 4 « auxquelles on avait relié deux plates-formes
 * polygonales » (a shelter below; above, Neurdein's photographic studio
 * and an observation deck), the Edoux's approaches in the middle, the
 * four helical stairs from the 1st floor and the one on up; and in what
 * room was left « un pavillon en bois servant d'imprimerie au Figaro et
 * transformé depuis en buffet », « un bar affecté à la boulangerie
 * Viennoise », « un bâtiment compris entre l'un des réservoirs et
 * l'ascenseur Edoux » of ticket offices and water-closets, « quelques
 * boutiques et bars, et enfin des tentes-abris » [sourced E1900-TXT
 * pp. 214-215]. So PL-XIX Fig. 7, « Plan du deuxième étage » (1:200), is
 * the 1889 platform, the Figaro's pavilion labelled by its later use,
 * « Buffet ». It is drawn as PL-XVIII is, piles 2 and 3 at the top, so its
 * x right and z down are the render's top view [sourced]. Read on the
 * e-rara scan at 59.15 px/m against the printed 3.36 post pitch (eight
 * pitches of 3.36268, 1,591 px) and centred on the gallery's middle
 * posts [measured]; the positions below are world (x, z), or (s, t) in
 * the diagonals' frame, ±0.3 [measured]. The same figure's gallery posts
 * stand on a square 36.80 on their axes (« 36m80 »), its corners cut 1.21
 * back [sourced], and the text's « 57,90 » outside the gutter is 37,90 in
 * the OCR's commonest slip (36.80 + 2 × 0.55, « deux chéneaux de 0,55 »)
 * [derived], against the model's 37.63 deck (`PLATFORMS`); the massing
 * keeps the plate's places, all of it inside the gallery.
 *
 * - THE TWO RESERVOIRS, horizontal cylinders « de 3 m de diamètre et 7 m
 *   de longueur … 46,339 m³ » [sourced E1900-TXT p. 199], drawn "3.00"
 *   across and "6.00" along with « 45 m³ » [sourced Fig. 7]: 6.00 is
 *   built, the plate's shell between its dished ends [estimated]. One on
 *   the Roux legs' diagonal each side of the middle, piles 2 and 4, their
 *   axes square to it, at t ±7.9, s 0.25 [measured: 7.76 and 8.03, 0.2
 *   and 0.3]; their underside 0.6 above the floor [measured PL-XIX Fig. 2,
 *   where the pile-4 tank's end shows 3.07 across], on two saddles each
 *   (« Fers et supports des réservoirs cylindriques », sourced p. 327;
 *   their place and size estimated).
 * - THE FIGARO'S PAVILION (« Buffet »), timber [sourced]: the hatched
 *   hexagon on the Russe's side between piles 2 and 1, near the North
 *   pile's Otis as the text has it [sourced p. 321], (-15.8, -6.0),
 *   (-12.3, -6.0), (-8.2, -1.85), (-8.2, 1.0), (-13.3, 5.83), (-15.8,
 *   5.83) [measured]. Its wall wraps round the uprights b of piles 2 and 1
 *   on the plate; the massing stops at x -15.0, inside them [derived:
 *   their inner faces lean in to -15.19 at the eaves]. Its height is not
 *   printed: 3.00, the gallery's eaves [estimated].
 * - THE TICKETS AND WATER-CLOSETS, between the pile-2 reservoir and the
 *   Edoux's cage (« Urinoirs et Water-closets », « Téléphone », « Billets
 *   pour le 3e »): s -2.95 to 4.10, t -6.3 to -2.55 [measured; its back
 *   set 0.1 clear of the reservoir, derived], 2.84 tall, the height PL-XIX
 *   Fig. 2 prints for the boutique beside it, which draws the W.C. to the
 *   same line [sourced "2.840"; measured].
 * - TWO BOUTIQUES flanking the Edoux's approach on its pile-4 side, s 3.23
 *   to 5.29 and s -4.65 to -2.62, t 2.57 to 3.58 and 2.52 to 3.52
 *   [measured, re-read on a 3x crop],
 *   2.84 tall [sourced Fig. 2, the second of them, seen from the Seine].
 * - THE TENTS: two « Tente-abri pour les consommateurs », decagons 3.7 to
 *   a corner [measured 3.58-3.76] about centre poles at (12.56, -0.11) on
 *   the Bar's side and (0.05, 12.22) on the Flamand's, a corner on the
 *   face's normal, a post at every corner [sourced drawing]; and « Tente-
 *   abri pour les visiteurs du 3e étage », the Edoux's queue, 7.2 along s
 *   by 4.6 [measured] about (0.87, -11.18) on the Français's side, its
 *   ridge along s [sourced drawing]. Their heights, eaves 2.2 and apex 3.4
 *   (the queue's ridge 3.2), and every section, are [estimated]: canvas
 *   left no printed height.
 *
 * Not built, each for a reason: the two polygonal shelters with their
 * decks at « (151.85) », 2.62 up [sourced Fig. 7], stand on the plate
 * where the model brings e1 up the leg's diagonal (`STAIR_OPENINGS`,
 * estimated), which Fig. 7 draws instead beside each pile's corner
 * upright; they wait on the stairs' arrivals being moved, and the studio
 * and the deck over them on the Roux girders' unused extensions, which
 * the model does not carry above the 1st floor. The Viennese bakery's
 * bar is named but not drawn, so it has no place. The 6 m³ fresh-water
 * tank, the fountain, the « Cabinet pour l'étude de la résistance de
 * l'air » and the benches are in or against the Edoux's central block,
 * which is the Edoux's head. The Otis framing, the Edoux and the stairs
 * are their own parts.
 */
const SECOND_FITOUT = {
  tank: { diameter: 3.0, length: 6.0, foot: 0.6, facets: 16, s: 0.25, t: 7.9 },
  saddle: { at: 2.0, along: 0.3, across: 2.4 },
  figaro: {
    plan: [
      [-15.0, -6.0],
      [-12.3, -6.0],
      [-8.2, -1.85],
      [-8.2, 1.0],
      [-13.3, 5.83],
      [-15.0, 5.83],
    ] as ReadonlyArray<readonly [number, number]>,
    height: 3.0,
  },
  /** Rectangles in the diagonals' frame: [s0, s1, t0, t1]. */
  tickets: [-2.95, 4.1, -6.3, -2.55] as readonly [number, number, number, number],
  boutiques: [
    [3.23, 5.29, 2.57, 3.58],
    [-4.65, -2.62, 2.52, 3.52],
  ] as ReadonlyArray<readonly [number, number, number, number]>,
  booth: 2.84,
  tents: {
    at: [
      [12.56, -0.11],
      [0.05, 12.22],
    ] as ReadonlyArray<readonly [number, number]>,
    radius: 3.7,
    sides: 10,
    eave: 2.2,
    apex: 3.4,
    pole: 0.12,
    post: 0.08,
    canvas: 0.03,
  },
  /** The queue's tent about (s, t), world (0.87, -11.18). */
  queue: { s: 8.52, t: -7.29, along: 7.2, across: 4.6, ridge: 3.2 },
} as const;

/**
 * The Edoux lift's two cars run on the N-S diagonal, their axes 2.650 out
 * either side of the tower's axis [sourced PL-XX], the lower car toward
 * pile 3 (+x -z), the upper toward pile 1. A floor a car rises through, or
 * a stair comes up through, has a well there, where `lifts.ts` puts the
 * stair (SOURCES.md §20): e3's upper helix, Ø 1.680, arrives at the 3rd
 * floor at (1.36, 1.29) in the diagonals' frame (s toward pile 3, t toward
 * pile 4) [measured PL-XIX Fig. 9, re-read at (1.36, 1.37)], in a square
 * 0.90 either side of its axis, room for its rail [estimated].
 */
const CAR_AXIS = 2.65;
const STAIR_HALF = 0.9;

/**
 * A rectangular well in the diagonals' frame (s toward pile 3, +x -z; t
 * toward pile 4, +x +z): centred at `s` and `t` (0, on the N-S diagonal,
 * when left out), `along` s and `across` t.
 */
interface Well {
  readonly s: number;
  readonly t?: number;
  readonly along: number;
  readonly across: number;
}

/**
 * The 3rd floor's structure (PL-XIX Figs 3, 9; PL-VII Fig. 4; PL-XIV Figs
 * 2, 13; tags as in the file comment). The floor's edge beams, « poutres de
 * rive … de 850 mm de hauteur » [sourced text, PL-XIX "850"], stand flush
 * with the glazed octagon over them: 16.56 across the flats, 10.90 straight
 * sides [sourced PL-XIX Fig. 9], so the floor is that octagon, 0.85 deep.
 *
 * PL-I's "côté extérieur 18m65, Surface 350 mètres carrés" is carried by
 * no element, and nothing is built at it. The text describes the floor
 * twice, and both close it inside 16.56:
 * - « un carré de 16,56 m de côté à angles abattus », long sides 10,90
 *   [sourced E1900-TXT p. 79]; its gallery « de 3,00 m de largeur libre …
 *   au-dessus des consoles », which the top horizontal carries « sur
 *   3,00 m de longueur » out from the corner uprights to the edge beams,
 *   and they carry the 1.20 plate parapet [sourced ibid.]: from the
 *   uprights' outer faces at 5.25, 8.25 out, the 16.56's 8.28 within 0.03
 *   [derived];
 * - « une galerie-promenade en encorbellement … de 3,23 m de largeur … La
 *   largeur est de 16,30 m et la surface de 231 m² » [sourced E1900-TXT
 *   p. 215].
 * Neither names anything outboard of the parapet. The 4th platform above
 * is « un carré de 16,60 m » on posts riveted to that parapet [sourced
 * ibid. p. 79]; Eiffel's balcony, 0.52 proud (`summit.ts`), is PL-I's
 * widest stroke at this level, 17.6-17.7 [measured, SOURCES.md §15.1;
 * 16.56 + 2 x 0.52 = 17.60, derived]. On the 1st floor PL-I's "côté
 * extérieur 70m695" is the text's « 70,69 m de côté, mesuré dans l'axe
 * des colonnes extérieures » (71.69 « à l'extérieur du chéneau ») [sourced
 * p. 212]; read the same way the 3rd floor's is 16.56. 18.65 is 2.09
 * wider than the floor and 1.05 wider than the balcony. The text's own
 * areas are 270 m², « avec les consoles extérieures » (fully covered,
 * glazed), and 272 m² for visitors [sourced E1900-TXT], against the
 * octagon's 258 [derived] and an 18.65 square's 348: PL-I's 350 fits the
 * square, not the floor. Whence PL-I took 18.65 is not recorded; an
 * earlier scheme's side is a guess [weak inference].
 */
const THIRD = {
  across: 16.56,
  straight: 10.9,
  depth: 0.85,
  wells: [
    // The upper car's, arriving from the landing, as the landing's.
    { s: -CAR_AXIS, along: 3.67, across: 4.2 },
    // The service stair e3's upper helix, from the landing.
    { s: 1.36, t: 1.29, along: 2 * STAIR_HALF, across: 2 * STAIR_HALF },
  ],
} as const;

/**
 * The consoles under it: « des consoles de 7,207 m de hauteur fixées sur
 * les faces extérieures des arbalétriers d'angle » [sourced text, PL-XIX
 * "7.207"], so two to a face, one on each corner upright's outer face,
 * and none on the 2.50 bays between [sourced drawings]. Each is a box of
 * two webs 0.50 apart under a curved « semelle 500 × 6 », the webs
 * « découpées suivant un arc de cercle de 9,280 m de rayon » [sourced text;
 * three plates fit 9.0-9.5, and PL-VII's "R: 2,980" fits none]. The arc
 * is concave outward: it leaves the upright tangentially about 5.5 from
 * the axis [measured 5.3-5.5] and meets the edge beam's underside flush
 * with the 16.56 wall [measured 8.16-8.24], so the top strut runs 3.0 out
 * from the upright's face [sourced PL-VII "3,000"]; below the tangent
 * point the flange runs straight down to the foot. Flange thickness, web
 * bars and their layout [estimated].
 */
const CONSOLE = {
  height: 7.207,
  radius: 9.28,
  /** The flange's outer face where it leaves the upright [measured]. */
  foot: 5.5,
  /** The consoles' positions along a face: the corner uprights. */
  at: [-PANEL29.half, PANEL29.half],
  /** Width (the webs' spacing) and the flange's thickness; web bars; flange segments. */
  width: 0.5,
  flange: 0.12,
  bar: 0.15,
  segments: 8,
} as const;

/**
 * The landing (PL-XIX Fig. 14, PL-XVI Figs 14-15; tags as in the file
 * comment). A square turned 45 degrees whose sides, on their girders'
 * axes, are 11.337 [sourced, printed on all four sides of PL-XVI Fig. 14
 * and twice on PL-XIX; half-side "5.669"], so its vertices sit on the face
 * centre lines 8.016 from the axis [derived], against the merged b/d
 * uprights. The well of the lower Edoux car, "Cage de la Cabine Edoux du
 * 2ème étage à l'étage intermédiaire", is 3.67 along the diagonal toward
 * pile 3 [sourced] by about 4.2 across it [measured, PL-XIX at 79.8 px/m],
 * centred 2.650 out along that diagonal [sourced: the cars' axes, which the
 * well's measured centre, 2.7 out, matches]. The floor is 0.22 deep, down
 * to the girders' tops [sourced PL-XVI Fig. 15 "220"]. The girders round
 * the edge ("poutres" H, D, B) are 2.300 deep [sourced], the fourth, G,
 * facing pile 1, 1.300 deep with its top 0.430 down [sourced]: lattice
 * girders, as Plate I cross-hatches the band [the form estimated]. The
 * inner beams A and C are left out. There is no well under the upper car.
 * The service stair e2 from the 2nd floor comes up through the opening
 * PL-XIX Fig. 14 labels « Escalier de l'étage intermédiaire au 2e étage »,
 * « 2.62 » along the diagonal by « 2.45 » across it [sourced], against the
 * edge girder facing pile 4, s -2.73 to -0.11 [measured, §20]: the 2.45 taken
 * in from that girder's axis, the floor's edge, t 3.22 to 5.67 [derived;
 * the drawing, re-read, puts its inner edge 2.3-2.5 in]. `lifts.ts`'s
 * last five risers rise through it at t 3.31 to 3.81 (§20).
 */
const LANDING = {
  side: 11.337,
  floor: 0.22,
  wells: [
    // The lower car's, toward pile 3.
    { s: CAR_AXIS, along: 3.67, across: 4.2 },
    // e2's opening, 2.45 in from the edge girder facing pile 4: 11.337 / 2 - 2.45 / 2.
    { s: -1.42, t: 4.4435, along: 2.62, across: 2.45 },
  ],
  /** Each side's girder, depth and drop, facing piles 4 (+x +z), 3 (+x -z), 2 and 1 in turn. */
  girders: [
    { depth: 2.3, drop: 0.22 },
    { depth: 2.3, drop: 0.22 },
    { depth: 2.3, drop: 0.22 },
    { depth: 1.3, drop: 0.43 },
  ],
  /** Lattice panels per side, chord and bar sections [estimated]. */
  panels: 5,
  chord: 0.25,
  bar: 0.12,
} as const;

/**
 * Where `lifts.ts`'s stairs come up through the 1st and 2nd floors
 * (SOURCES.md §21), as wells in the diagonals' frame on pile 4's leg (+t),
 * turned onto the others by `turnWell`. e1's last flight, up the diagonal
 * in every leg to 115.73, passes through the 2nd floor's deck at t 15.23
 * to 19.09, 0.35 either side of it; opened from 15.12 and 0.40 either
 * side, since its stringers start at 15.18 and graze 0.35 (§24). The
 * ground stair's last flight, in piles 4 and 2, straddling the diagonal,
 * through the 1st floor's at t 31.84 to 36.91, s -1.65 to -0.45: its
 * arrival's landing, 1.30 long, and the flight's treads, stringers, posts
 * and 1.00 rails 0.60 either side of T3's lane (`stairs.ts`; SOURCES.md
 * §11.10; until 2026-09-26 t 31.34, s -1.58 to -0.52, for a flight of 21
 * risers without rails). Neither is on the plates read.
 */
const STAIR_OPENINGS = {
  e1: { s: 0, t: 17.105, along: 0.8, across: 3.97 },
  ground: { s: -1.05, t: 34.375, along: 1.2, across: 5.07 },
} as const satisfies Record<string, Well>;

/** A well centred on pile 4's diagonal, from t0 to t1 along it, `half` either side. */
const slot = (t0: number, t1: number, half: number): Well => ({
  s: 0,
  t: (t0 + t1) / 2,
  along: 2 * half,
  across: t1 - t0,
});

/**
 * Where the inclined lifts pass through the decks (SOURCES.md §24), as
 * wells on pile 4's diagonal, turned onto the others by `turnWell`; t runs
 * out along the diagonal from the tower's axis. Each opening is a run of
 * rectangles inside its framed outline on the plates:
 *
 * - 1ST DECK, every leg: « plancher entre les arbalétriers » (PL-XVI Fig. 9,
 *   1:500, on its printed 16.35 to corner a; Fig. 10's joists) leaves a slot
 *   on the diagonal from the V where the leg's two inner faces meet at a,
 *   its edges on t - |s| = 23.9, 0.8 past a's axis, out to an end member at
 *   32.25 ± 0.3, 1.5 short of the leg's centre; its sides girders on ±2.70
 *   (5.24 clear) from 26.6 to 31.3, chamfered to ±1.9 at the end [measured].
 *   PL-XVIII Fig. 3 (1:250) puts every lift station there, the Roux's and
 *   the Otis's alike: t 24.5-32.5, the car within ±2.2 [measured]. The V is
 *   stepped in three, the chamfers left decked. The end stands at 32.4,
 *   within both readings of it: the rigid Otis car, tipped at its station
 *   (`lifts.ts`), sweeps its outer end to 32.30 [measured].
 * - 2ND DECK, the Otis legs (quadrant targets 1 and 3) only: PL-XVI Fig. 12
 *   (1:200, on its printed column chain) marks piles 1 and 3 « Ascenseur
 *   inférieur » and leaves them open, piles 2 and 4 joisted: a neck 3.800
 *   wide between the track's girders from a header « 2.8048 » past a
 *   (10.765) to 12.117, 45° struts out to girders 5.500 apart (5.33 clear)
 *   from 12.9, chamfers « 0.9017 × 0.526 » to ±2.1, and the end girder at
 *   10.765 + « 6.1452 » = 16.910 [sourced; measured]. The model's track
 *   crosses this floor from 10.38, 0.4 nearer a than the plate's header
 *   (its rail line is itself estimated there, `lifts.ts`), so the neck runs
 *   on into the triangle between the header and a, which the plate leaves
 *   without joists, and stands ±2.02, clear of the girders' flanges
 *   (±1.985) where the plate's deck meets their webs [derived].
 */
const LIFT_OPENINGS = {
  first: [
    slot(24.6, 25.3, 0.7),
    slot(25.3, 26.0, 1.4),
    slot(26.0, 26.52, 2.1),
    slot(26.52, 31.3, 2.62),
    slot(31.3, 32.4, 1.9),
  ],
  second: [slot(10.3, 12.55, 2.02), slot(12.55, 12.97, 2.33), slot(12.97, 16.25, 2.665), slot(16.25, 16.83, 2.1)],
} as const satisfies Record<string, readonly Well[]>;

/** The 1st floor's cross girders [sourced pitch, depth, drop; the rest estimated]. */
const CROSS_GIRDER = {
  pitch: 3.8825,
  depth: 4.0,
  drop: 0.23,
  panels: 4,
  chord: 0.3,
  bar: 0.2,
} as const;

/**
 * The central void (PL-XVIII Fig. 3, 1:250, 62.6 px/m on its printed
 * "70.69"; PL-XVI Fig. 9; E1900-TXT; tags as in the file comment). Each
 * face's inner edge is:
 * - a straight edge 14.50 from the axis: « un carré de 29,00 m » [sourced
 *   E1900-TXT; PL-XVIII traced 14.52-14.83];
 * - cut at the corners at 45 degrees on |x| + |z| = 24.0 [measured
 *   PL-XVIII, 23.7-24.1 on all eight cuts; PL-XVI Fig. 9's corner
 *   « Balcon » between the two inner girders reads 23.8-24.0], a line that
 *   meets each inner grande poutre (16.35) at 7.65, by its post at 7.765;
 * - bowed in the middle into the « Balcon », its apex 3.00 inside the
 *   inner grande poutre's 16.35 [sourced PL-XVI Fig. 9], so 13.35 from the
 *   axis (PL-XVIII traces 13.08-13.31), leaving the straight edge 7.2 either
 *   side of the face's middle [measured PL-XVIII, 7.0-7.3]: the circle
 *   through those three points (R 23.1) follows PL-XVIII's traced edge
 *   within 0.15 [measured].
 * PL-XVI's « Consoles du balcon int. » draw a half-ellipse on the 15.53
 * between the girder's posts at ±7.765: the structure under the bow, not
 * the floor's edge. The ring left is 4,250 m² against Plate I's printed
 * 4,200 [derived], where the plain 28.245 square this replaces was
 * derived from that 4,200.
 */
const VOID = { half: 14.5, chamfer: 24.0, apex: 13.35, bowEnd: 7.2, bowSegments: 12 } as const;

/**
 * The step from the gallery up to the platform, at the gallery's inner
 * edge: the platform's edge girder, « Axe de la poutre » 2.600 inside the
 * column axis [sourced PL-XIII Fig. 2], closing the rise between the
 * gallery's floor and the platform slab's underside, the 0.63 the slabs
 * leave open [derived]; its thickness [estimated]. It stops at the
 * gallery's floor: below it the legs' outer uprights come within 0.2 of
 * its line.
 */
const STEP = { thickness: 0.3 } as const;

/**
 * The restaurants' terrace balustrade (PL-XXIX Figs 15-17, « Balustrade
 * des Terrasses des Restaurants », 1:40): 0.90 tall [sourced]; posts 0.10
 * square every 0.7765 [sourced "0.7765", "10/10"], a 0.10 plinth, a rail
 * at 0.43 and a 0.08 handrail [sourced], the balusters between left out.
 * It stands on the terrace's edge, over the step: PL-XVIII Fig. 3 prints
 * « 2.60 » from it to the gallery's column axis on every face [sourced;
 * measured 2.52-2.70, SOURCES.md §24], and « 1.52 » from the pavilion's
 * front, which is PL-XXIX's 1.524 in front of the Russe's 4.124 front; the
 * Bar's 4.2865 front would set it 0.16 back. Its outer face is flush with
 * the step's. It runs past each pavilion's side walls (±11.648) to the
 * gallery's mid-bay single columns at ±15.53, two bays from the face's
 * middle, on all four faces [measured PL-XVIII: ends at ±15.48-15.67]. On
 * the Français (face 2, -z) and the Russe (face 3, -x) it breaks over the
 * centre bay, ±3.8825, the « Entrée », where paired curved flights come up
 * from the gallery (`ENTRANCE`), its end posts standing on the terrace
 * beside the flights' outer strings [derived]; on the
 * Bar (face 1, +x) it runs unbroken from -15.53 to +15.53, and so on the
 * +z face, which PL-XVIII draws as the Théâtre that replaced the Flamand
 * after 1889 [measured; the Flamand's own 1889 front estimated from it].
 */
const TERRACE_RAIL = {
  spec: { height: 0.9, plinth: 0.1, cap: 0.08, rail: 0.1, post: 0.1 } satisfies RailSpec,
  mid: 0.43,
  pitch: 0.7765,
  /** Where it ends, either side of the face's middle: two bays out, 2 × 7.765. */
  end: 15.53,
  /** The faces with the centre-bay entrance, and those without. */
  entrance: [2, 3],
  closed: [0, 1],
} as const;

/**
 * The entrance flights on the Français and the Russe (PL-XVIII Fig. 3,
 * 1:250, « Entrée »; PL-XXIX Figs 4, 10, 1:200; PL-XIX Fig. 1). A mirrored
 * pair in the centre bay, one either side of its middle, each a
 * quarter-turn about a newel at its front inner corner: up from the
 * gallery square to the face, round 90 degrees, and off toward the bay's
 * middle onto a landing at the terrace's level [sourced drawings]. In the
 * face frame, u along the face from the bay's middle toward the flight's
 * own pier, v out from the terrace's edge (the step's face, 2.60 inside
 * the column axis) [tags per number]:
 *
 * - The outer string on the pier's axis, u 3.8825 [sourced: the balustrade
 *   ends there, PL-XXIX Fig. 10's jog between its printed 3.8825s]; the
 *   back string cut into the terrace, -0.88 on Fig. 4 and -0.77 to -0.86
 *   on XVIII [measured], here -0.72: the model's grande poutre stands
 *   under the terrace with its top chord's outer face 0.74 inside the
 *   step's (32.01 from the axis, measured on the cooked girder), and a
 *   flight cut deeper would run through it [derived]; the newel at u 2.33, v +0.45 [measured
 *   Fig. 4 2.27-2.37, XVIII 2.20-2.37; XIX Fig. 1's tall posts at ±2.39],
 *   0.13 square [measured].
 * - 7 risers, 6 treads [counted, Fig. 4]: two rounded bottom steps, u
 *   2.06-4.17 to v +0.98 and u 2.31-3.93 to v +0.66 [measured], their
 *   round ends squared [estimated]; then 4 winders about the newel, their
 *   risers on rays 22, 46 and 63 degrees below the face's line [measured
 *   Fig. 4 by two readers: 22-22.5, 45.8-46, 62-63.2], the first along the
 *   face (drawn at about 7.5) and the last square to it (drawn as a curve
 *   ending at about 79-81) [estimated, straightened]; the newel read at
 *   u 2.33 and 2.44 on Fig. 4, 2.32 on XVIII [measured]. No riser is printed; the model's 1.23 [sourced PL-XIX; PL-XVIII
 *   prints 89.93 and 91.13, 1.20] in 7 is 0.176 [derived]. Each tread is
 *   solid to the gallery floor [estimated: no soffit is drawn].
 * - The landing between the newels, pushed 0.43 out over the gallery
 *   [measured Figs 4, 10: 0.41-0.44; XVIII 0.60-0.66], on its own edge
 *   girder, as the step's [estimated].
 * - Balustrades [estimated: none is printed for the flights]: the terrace
 *   balustrade's section (`TERRACE_RAIL`), level at the terrace along the
 *   flights' outer and back strings, where the terrace stands above them,
 *   and across the landing's front between the newels, where PL-XIX Fig. 1
 *   draws it unbroken [sourced drawing]; a handrail raking down the outer
 *   string over the gallery, from the terrace balustrade's end post to a
 *   post at its front corner, u 3.8825, v +0.45 [measured], at the rail's
 *   height over the tread beside it at either end. The
 *   newels stand 0.20 over the rails [estimated: « taller posts »].
 *
 * The Bar and the Flamand's front have no flights and no break [sourced
 * PL-XVIII, PL-XXX Figs 4, 16]. PL-XXIX Fig. 10 draws the Russe's centre
 * front pushed out the same 0.44 but closed, with no flights: perhaps
 * another state [open, SOURCES.md §10.10]; PL-XVIII is followed.
 */
const ENTRANCE = {
  outer: 3.8825,
  back: -0.72,
  newel: [2.33, 0.45] as readonly [number, number],
  newelPost: 0.13,
  newelProud: 0.2,
  /** The bottom steps, outer first: [u0, u1, front v]; each reaches back to the next. */
  bottom: [
    [2.06, 4.17, 0.98],
    [2.31, 3.93, 0.66],
  ] as ReadonlyArray<readonly [number, number, number]>,
  /** The winders' risers, degrees below the face's line, from the newel; the first is its front. */
  rays: [0, 22, 46, 63, 90],
  risers: 7,
  landing: 0.43,
} as const;

/**
 * The consoles under the inner balconies (PL-XVI, « Console des balcons
 * intérieurs », 1:100, and Fig. 9's ω consoles): curved brackets on the
 * inner grande poutre's posts, carrying the deck's edge inboard of it. Top
 * at the girder's top, 0.23 under the floor [sourced] (inside the model's
 * 0.60 deck [estimated], which hides the top bar); 0.590 deep at the tip
 * [sourced], the curved flange falling to 3.730
 * under the floor at the girder [sourced]; one on each post the deck
 * overhangs, at 0 and ±3.8825 under the bow and ±7.765 where the
 * straight edge meets the cut corner [sourced stations PL-XVI Fig. 9; the
 * last two estimated]. The cut corner's edge is a girder from post 7.765
 * on one face to post 7.765 on the next, the corner's joists spanning
 * between the two inner girders [sourced drawing PL-XVI Fig. 9]. Member
 * sections, web, and the edge girder's depth [estimated].
 */
const BALCONY = {
  at: [0, 3.8825, 7.765],
  drop: 0.23,
  tip: 0.59,
  foot: 3.73,
  /** The tip's set-back from the deck's edge. */
  setback: 0.1,
  width: 0.2,
  flange: 0.12,
  bar: 0.1,
  segments: 6,
  edge: { depth: 0.6, width: 0.25 },
} as const;

/**
 * The gables, opened (PL-XIX Fig. 1; PL-XIII Fig. 26; E1900-TXT): the
 * crescent between the vault's arc and the inner arc is ribs with glass
 * between, « glazed and gilt in the cells between its rays » [sourced], so
 * it is built as its two arc ribs and the rays, its silvered glass
 * `glazing`'s; rib and ray widths [estimated]. Under the inner
 * arc the lunette is « un treillis de bois » [sourced]: laths on both
 * diagonals, 0.40 apart [estimated from PL-XIX's diamonds], over the small
 * arches between the plate piers, with the three rays PL-XIX draws from
 * the middle column's head to the inner arc [sourced drawing].
 */
const GABLE = {
  outerRib: 0.25,
  innerRib: 0.2,
  ray: 0.1,
  trellis: { pitch: 0.4, lath: 0.04, ray: 0.08, step: 0.02, clear: 0.03 },
} as const;

/**
 * A pavilion's gallery façade (PL-XXIX Fig. 3, « Élévation du côté de la
 * Galerie », 1:100, 162.7 px/m on its printed "4.61"): per bay a pier
 * 0.85 either end, a glazed door 2.60 wide, a 0.86 pier, a second door
 * [sourced]; each door from the floor to an arched head springing at 2.43
 * and rising 1.12 [measured], the wall over it solid to the gutter. The
 * doors' glass and bars are `francaisDoors`'. The walls' thickness
 * [estimated]. The tympanum over the wall under each vault is glazed
 * trellis on a post and rays [estimated: PL-XXIX draws an ornamental
 * lunette there, SOURCES.md §10.11], built as the post, the rays and a rib
 * along the vault; so is the one at each vault's end, on the void side, as the Français had them
 * « pendant l'Exposition de 1889 » [sourced PL-XXIX Fig. 1; the Bar's on
 * PL-XXX Fig. 1 are boarded, with windows, perhaps later].
 */
const FACADE = {
  pier: 0.85,
  mid: 0.865,
  door: 2.6,
  spring: 2.43,
  rise: 1.12,
  wall: 0.25,
  headSegments: 8,
} as const;

/** A unit quaternion [x, y, z, w]. */
type Quat = readonly [number, number, number, number];

/** A box: its centre, its size along its own axes, and its turn. */
interface Block {
  readonly at: Vec3;
  readonly size: Vec3;
  readonly rot?: Quat;
}

/** A closed planar outline extruded `depth` along its own normal (right-hand rule). */
interface Prism {
  readonly outline: readonly Vec3[];
  readonly depth: number;
}

/** A turn of `angle` radians about axis 0 (x), 1 (y) or 2 (z). */
function turn(axis: 0 | 1 | 2, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [axis === 0 ? s : 0, axis === 1 ? s : 0, axis === 2 ? s : 0, Math.cos(angle / 2)];
}

/** The Hamilton product a b: b's turn, then a's. */
function qmul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * A face-frame point (a, y, r) on face f, turned f quarter turns about +y
 * as the quadrant targets are: +z, +x, -z, -x. Exact, no trigonometry.
 */
function onFace(f: number, [a, y, r]: Vec3): Vec3 {
  if (f === 0) return [a, y, r];
  if (f === 1) return [r, y, -a];
  if (f === 2) return [-a, y, -r];
  return [-r, y, a];
}

/** Face-frame blocks, turned onto all four faces (or onto the `faces` given). */
function allFaces(list: readonly Block[], faces: readonly number[] = [0, 1, 2, 3]): Block[] {
  const out: Block[] = [];
  for (const f of faces) {
    const yaw = turn(1, (f * Math.PI) / 2);
    for (const b of list) {
      out.push({ at: onFace(f, b.at), size: b.size, rot: qmul(yaw, b.rot ?? [0, 0, 0, 1]) });
    }
  }
  return out;
}

/** Face-frame prisms, turned onto all four faces (or onto the `faces` given). */
function allFacesPrisms(list: readonly Prism[], faces: readonly number[] = [0, 1, 2, 3]): Prism[] {
  const out: Prism[] = [];
  for (const f of faces) {
    for (const p of list) out.push({ outline: p.outline.map((q) => onFace(f, q)), depth: p.depth });
  }
  return out;
}

/** An axis-aligned face-frame block between two corners. */
function span(a0: number, a1: number, y0: number, y1: number, r0: number, r1: number): Block {
  return {
    at: [(a0 + a1) / 2, (y0 + y1) / 2, (r0 + r1) / 2],
    size: [Math.abs(a1 - a0), Math.abs(y1 - y0), Math.abs(r1 - r0)],
  };
}

/** A band `t` thick centred on the line r, from a0 to a1 and y0 to y1. */
function onLine(a0: number, a1: number, y0: number, y1: number, r: number, t: number): Block {
  return span(a0, a1, y0, y1, r - t / 2, r + t / 2);
}

/** A square post `w` wide centred on (a, r), from y0 to y1. */
function post(a: number, r: number, w: number, y0: number, y1: number): Block {
  return onLine(a - w / 2, a + w / 2, y0, y1, r, w);
}

/**
 * A straight member of square section `w` from p to q, both in the plane
 * a = const: a box along its own z, turned about the a axis onto p→q.
 */
function member(p: Vec3, q: Vec3, w: number): Block {
  const dy = q[1] - p[1];
  const dr = q[2] - p[2];
  return {
    at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2],
    size: [w, w, Math.hypot(dy, dr)],
    rot: turn(0, Math.atan2(-dy, dr)),
  };
}

/** v turned by the unit quaternion q. */
function rotateBy([x, y, z, w]: Quat, [vx, vy, vz]: Vec3): Vec3 {
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

/**
 * A block as a prism: its face on its own -z, turned and placed, extruded
 * along its own +z by its depth (the corners run counter-clockwise seen
 * from +z, so that is the way the outline's normal points).
 */
function blockPrism(b: Block): Prism {
  const [sx, sy, sz] = b.size;
  const q = b.rot ?? [0, 0, 0, 1];
  const corners: Vec3[] = [
    [-sx / 2, -sy / 2, -sz / 2],
    [sx / 2, -sy / 2, -sz / 2],
    [sx / 2, sy / 2, -sz / 2],
    [-sx / 2, sy / 2, -sz / 2],
  ];
  return {
    outline: corners.map((c): Vec3 => {
      const [x, y, z] = rotateBy(q, c);
      return [b.at[0] + x, b.at[1] + y, b.at[2] + z];
    }),
    depth: sz,
  };
}

/**
 * Many boxes as one mesh, each built as a rectangle extruded by its depth
 * (`blockPrism`), so that it carries its own flat normals (see the file
 * comment). A box with no volume is a slip, refused by its index.
 */
function blocks(g: Graph, id: string, list: readonly Block[]): NodeHandle {
  list.forEach((b, i) => {
    if (!b.size.every((v) => v > 1e-6)) {
      throw new Error(
        `platforms.ts blocks("${id}"): block ${i} at [${b.at.join(", ")}] has size ` +
          `[${b.size.join(", ")}]; every extent must be positive`,
      );
    }
  });
  return prisms(g, id, list.map(blockPrism));
}

/**
 * Many prisms as one mesh: every outline a closed path, extruded along its
 * own normal by its depth. The extrusion gives every wall and cap its own
 * points and a flat `normal`, which the platforms class keeps; `normals`
 * false removes it, for a class that carries none (see the file comment).
 * Each outline must be convex: a cap is a fan from its first point.
 */
function prisms(g: Graph, id: string, list: readonly Prism[], normals = true): NodeHandle {
  // An index table is a ramp, whose lookup scans its stops, so a table's
  // cost grows with the square of its length: the list is cooked in runs
  // of at most PRISM_RUN points and merged.
  const runs: Prism[][] = [[]];
  let count = 0;
  for (const p of list) {
    if (count + p.outline.length > PRISM_RUN && (runs[runs.length - 1] as Prism[]).length > 0) {
      runs.push([]);
      count = 0;
    }
    (runs[runs.length - 1] as Prism[]).push(p);
    count += p.outline.length;
  }
  if (runs.length === 1) return prismRun(g, id, list, normals);
  const out = g.add(mergePrimitives, {}, id);
  runs.forEach((run, i) => g.connect(prismRun(g, `${id}Run${i}`, run, normals), "out", out, "in"));
  return out;
}

/**
 * Points per run of `prisms` [measured 2026-09-19, Node: this file's
 * meshes cook in 0.31 s in runs of 1024, 0.29 s in runs of 512, 0.34 s in
 * runs of 2048, and 0.80 s unsplit].
 */
const PRISM_RUN = 1024;

/** One run of `prisms`, as one mesh node named `id`. */
function prismRun(g: Graph, id: string, list: readonly Prism[], normals: boolean): NodeHandle {
  const pts = list.flatMap((p) => p.outline);
  const which = list.flatMap((p, i) => p.outline.map(() => i));
  const depth = list.flatMap((p) => p.outline.map(() => p.depth));
  const slots = g.add(
    pointGrid,
    { countX: pts.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
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
    `${id}Place`,
  );
  const key = g.add(
    setAttribute,
    { name: "prism", type: "i32", value: indexTable(which) },
    `${id}Key`,
  );
  const len = g.add(
    setAttribute,
    { name: "depth", type: "f32", value: indexTable(depth) },
    `${id}Depth`,
  );
  const paths = g.add(pointsToPath, { groupAttr: "prism", closed: true }, `${id}Paths`);
  const solid = g.add(
    extrudePolygon,
    { direction: "polygonNormal", distance: attribute("depth"), caps: "both" },
    normals ? id : `${id}Solid`,
  );
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", len, "in");
  g.connect(len, "out", paths, "in");
  g.connect(paths, "out", solid, "in");
  if (normals) return solid;
  const out = g.add(removeAttribute, { names: ["normal"], domain: "point" }, id);
  g.connect(solid, "out", out, "in");
  return out;
}

/**
 * An octagonal slab `across` the flats with `straight` sides and 45-degree
 * chamfers, from y0 up to y1: counter-clockwise seen from above, so it
 * extrudes up.
 */
function octagon(across: number, straight: number, y0: number, y1: number): Prism {
  const h = across / 2;
  const s = straight / 2;
  const ring: [number, number][] = [
    [s, h],
    [h, s],
    [h, -s],
    [s, -h],
    [-s, -h],
    [-h, -s],
    [-h, s],
    [-s, h],
  ];
  return { outline: ring.map(([x, z]): Vec3 => [x, y0, z]), depth: y1 - y0 };
}

/**
 * A square ring of deck between half-widths `inner` and `outer`, top at
 * `top`, on the +z face: one pinwheel side slab (the +z side, on to the +x
 * corner), which `allFaces` turns onto the four sides, tiling the ring
 * with no overlap.
 */
function ringSide(inner: number, outer: number, top: number): Block {
  return {
    at: [(outer - inner) / 2, top - DECK / 2, (outer + inner) / 2],
    size: [outer + inner, DECK, outer - inner],
  };
}

/** The upright half-width at height y (the MEMBERS stops, clamped). */
function uprightAt(y: number): number {
  const stops = MEMBERS.upright;
  let w: number = stops[0]![1];
  for (const [sy, sw] of stops) if (y >= sy) w = sw;
  return w;
}

/**
 * One face of a balustrade along the line r (face frame), from a = -half
 * to +half, standing on y0: a plinth rail, a top rail, and posts at `posts`.
 */
function railFace(
  spec: RailSpec,
  r: number,
  half: number,
  y0: number,
  posts: readonly number[],
): Block[] {
  const top = y0 + spec.height;
  const out: Block[] = [
    onLine(-half, half, y0, y0 + spec.plinth, r, spec.rail),
    onLine(-half, half, top - spec.cap, top, r, spec.rail),
  ];
  for (const a of posts) out.push(post(a, r, spec.post, y0, top));
  return out;
}

/** The arcade's column axis: half the printed side. */
const EDGE = PLATFORMS.first.side / 2;

/** The bays' vaults spring from the valley gutters [derived: 3.80 + 2.25]. */
const SPRING_Y = GALLERY.floor + GALLERY.columnHeight + GALLERY.pierHeight;
/** The vaults' crown [sourced]. */
const CROWN_Y = GALLERY.floor + GALLERY.crown;

/** Bay k's centre on the face, k = -4 … 4: bay 0 is the face's middle. */
function bayCentre(k: number): number {
  return k * GALLERY.module;
}

/** A vault's outer arc over bay centre `c`, at r, left foot to right foot, shrunk by `inset`. */
function vaultArc(c: number, r: number, inset = 0): Vec3[] {
  const half = (GALLERY.module - GALLERY.valley) / 2 - inset;
  const rise = CROWN_Y - SPRING_Y - inset;
  const out: Vec3[] = [];
  for (let i = 0; i <= ARCADE.vaultSegments; i++) {
    const phi = Math.PI * (1 - i / ARCADE.vaultSegments);
    out.push([c + half * Math.cos(phi), SPRING_Y + rise * Math.sin(phi), r]);
  }
  return out;
}

/**
 * A vault: a half-ellipse over bay centre `c`, its face at r, wound to
 * extrude inward. Left foot, over the crown, to the right foot: clockwise
 * seen from +r, so the outline's normal points in, toward the tower's axis.
 */
function vault(c: number, r: number, depth: number): Prism {
  return { outline: vaultArc(c, r), depth };
}

/**
 * The quads between two arcs of equal count, each wound as the arcs are
 * (the first over the second), extruded `depth` inward: a crescent or a
 * shell cut into convex pieces, since a cap is a fan.
 */
function between(upper: readonly Vec3[], lower: readonly Vec3[], depth: number): Prism[] {
  const out: Prism[] = [];
  for (let i = 0; i + 1 < upper.length; i++) {
    out.push({
      outline: [upper[i] as Vec3, upper[i + 1] as Vec3, lower[i + 1] as Vec3, lower[i] as Vec3],
      depth,
    });
  }
  return out;
}

/**
 * A gable's inner arc over bay centre `c`, at r, left foot to right foot:
 * the circle of `radius` through the inner `crown` (the face gable's,
 * GALLERY's, unless given), cut by the vault's springing line, one point
 * per point of `vaultArc`. `grow` widens the circle about the same centre
 * (a rib's outer edge).
 */
function innerArc(
  c: number,
  r: number,
  grow = 0,
  radius: number = GALLERY.innerRadius,
  crown: number = GALLERY.innerCrown,
): Vec3[] {
  const n = ARCADE.vaultSegments;
  const R = radius + grow;
  const cy = GALLERY.floor + crown - radius;
  const psi0 = Math.asin((SPRING_Y - cy) / R);
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const psi = Math.PI - psi0 - ((Math.PI - 2 * psi0) * i) / n;
    out.push([c + R * Math.cos(psi), cy + R * Math.sin(psi), r]);
  }
  return out;
}

/** A bar in the plane r = const from p to q: `w` wide in the plane, `t` through it. */
function bar(p: Vec3, q: Vec3, w: number, t: number): Block {
  const b = memberAlong(p, q, w);
  return { ...b, size: [b.size[0], w, t] };
}

/** A curved or sloping part: its prisms and its straight members. */
interface Piece {
  readonly prisms: Prism[];
  readonly blocks: Block[];
}

/** A part in named pieces, so an inspection can tell them apart (`fitOutSolids`). */
type Parted = Record<string, Piece>;

/** Empty pieces under the names given. */
function parted<K extends string>(...names: K[]): Record<K, Piece> {
  const out = {} as Record<K, Piece>;
  for (const n of names) out[n] = { prisms: [], blocks: [] };
  return out;
}

/** A parted part's pieces, merged. */
function merged(part: Parted): Piece {
  const pieces = Object.values(part);
  return { prisms: pieces.flatMap((p) => p.prisms), blocks: pieces.flatMap((p) => p.blocks) };
}

/**
 * A gable's crescent over bay centre `c`, its face at r (see `GABLE`): a
 * rib under the vault's arc, a rib over the inner arc, and a ray from each
 * point of the one to the matching point of the other, all ARCADE.plate
 * thick and extruded inward from r as the vault is. `arc` gives the ribs'
 * depths, how far under the vault's arc the outer rib hangs, and the inner
 * arc (the face gable's unless given: the inner arcade's are
 * `INNER_ARCADE`'s, its outer rib under the shell).
 */
function gableRibs(
  c: number,
  r: number,
  arc: {
    readonly outerRib: number;
    readonly innerRib: number;
    readonly radius: number;
    readonly crown: number;
    readonly under?: number;
  } = { outerRib: GABLE.outerRib, innerRib: GABLE.innerRib, radius: GALLERY.innerRadius, crown: GALLERY.innerCrown },
): Piece {
  const under = arc.under ?? 0;
  const outer = vaultArc(c, r, under);
  const outerIn = vaultArc(c, r, under + arc.outerRib);
  const inner = innerArc(c, r, 0, arc.radius, arc.crown);
  const innerOut = innerArc(c, r, arc.innerRib, arc.radius, arc.crown);
  const prisms = [
    ...between(outer, outerIn, ARCADE.plate),
    ...between(innerOut, inner, ARCADE.plate),
  ];
  const mid = r - ARCADE.plate / 2;
  const blocks: Block[] = [];
  for (let i = 1; i < outer.length - 1; i++) {
    const [ax, ay] = innerOut[i] as Vec3;
    const [bx, by] = outerIn[i] as Vec3;
    blocks.push(bar([ax, ay, mid], [bx, by, mid], GABLE.ray, ARCADE.plate));
  }
  return { prisms, blocks };
}

/**
 * The trellis in the lunette of the gable over bay centre `c` on the face
 * (see `GABLE`): laths on the two diagonals, clipped to what the gable
 * leaves open between the plate piers, under the inner arc (or the
 * springing line, where the crescent comes down to it), over the small
 * arches' extrados; and the three rays from the middle column's head.
 * Laths lie in the gable's plane, half a plate inside the face.
 */
function lunetteTrellis(c: number): Block[] {
  const A = GALLERY;
  const T = GABLE.trellis;
  const spring = A.floor + A.columnHeight + A.archSpring;
  const extrados = A.archRadius + A.archRib;
  const plateHalf = (A.pair + A.column) / 2;
  const side = A.module / 2 - plateHalf - T.clear;
  const R = A.innerRadius;
  const cy = A.floor + A.innerCrown - R;
  const foot = Math.sqrt(R * R - (SPRING_Y - cy) ** 2);
  const top = (u: number) =>
    (Math.abs(u) < foot ? cy + Math.sqrt(R * R - u * u) : SPRING_Y) - T.clear;
  const bottom = (u: number) => {
    const dx = Math.abs(Math.abs(u) - GALLERY_RAIL_PITCH);
    return (dx < extrados ? spring + Math.sqrt(extrados ** 2 - dx * dx) : spring) + T.clear;
  };
  const inside = (u: number, y: number) => Math.abs(u) <= side && y <= top(u) && y >= bottom(u);
  const r = EDGE - ARCADE.plate / 2;
  const out: Block[] = [];
  const lath = (k: number, dir: number, u0: number, u1: number) => {
    if (u1 - u0 > 2 * T.lath) {
      out.push(bar([c + u0, k + dir * u0, r], [c + u1, k + dir * u1, r], T.lath, T.lath));
    }
  };
  // Lines y = k + dir u, both families through the middle column's head,
  // `pitch` apart square to themselves; each marched along u and cut into
  // its runs inside the opening.
  const step = T.pitch * Math.SQRT2;
  const n = Math.ceil((A.floor + A.innerCrown - spring + 2 * side) / step);
  for (const dir of [1, -1]) {
    for (let i = -n; i <= n; i++) {
      const k = spring + i * step;
      let start: number | undefined;
      let last = -side;
      const count = Math.round((2 * side) / T.step);
      for (let j = 0; j <= count; j++) {
        const u = -side + (2 * side * j) / count;
        const ok = inside(u, k + dir * u);
        if (ok && start === undefined) start = u;
        if (!ok && start !== undefined) {
          lath(k, dir, start, last);
          start = undefined;
        }
        if (ok) last = u;
      }
      if (start !== undefined) lath(k, dir, start, last);
    }
  }
  // The rays: to the inner arc's crown and a third of the way to its feet.
  for (const u of [-foot / 3, 0, foot / 3]) {
    out.push(bar([c, spring, r], [c + u, top(u), r], T.ray, T.lath));
  }
  return out;
}

/**
 * A bay's roof over the gallery, face at r: the gable (`gableRibs`), the
 * vault behind it a shell back to the inner arcade, `depth` in, whose arch
 * ends it (`innerArcadeFace`). The pavilions' bays are `pavilionFace`'s.
 */
function bayRoof(c: number, r: number, depth: number): Piece {
  const front = gableRibs(c, r);
  return {
    prisms: [...front.prisms, ...between(vaultArc(c, r), vaultArc(c, r, ARCADE.shell), depth)],
    blocks: front.blocks,
  };
}

/**
 * Whether the pier at station `a` along the face stands in front of a leg
 * (see `INNER_ARCADE`): within the leg's width at the gallery floor, its
 * uprights' half-width and a pilaster's depth to spare either side.
 */
function inFrontOfLeg(a: number): boolean {
  const { outer, inner } = profileAt(GALLERY.floor);
  const spare = uprightAt(GALLERY.floor) + INNER_ARCADE.deep;
  return Math.abs(a) > inner - spare && Math.abs(a) < outer + spare;
}

/**
 * The inner arcade on the +z face (see `INNER_ARCADE`): a pilaster and a
 * valley gutter at every pier, and over every bay the arch its vault ends
 * on, in the plane `INNER_ARCADE.depth` inside the column axis, extruded
 * outward from it by the plate as the face gable is inward.
 */
function innerArcadeFace(): Record<"pilaster" | "head" | "gutter" | "arch", Piece> {
  const I = INNER_ARCADE;
  const A = GALLERY;
  const rIn = EDGE - I.depth;
  const gutterFoot = SPRING_Y - I.gutterDepth;
  const out = parted("pilaster", "head", "gutter", "arch");
  // The piers between bays -4 and 4, not the corners' (see `INNER_ARCADE`).
  for (let k = -4; k <= 3; k++) {
    const p = (k + 0.5) * A.module;
    const leg = inFrontOfLeg(p);
    // The shaft: on the platform against the vault's end, or, before a
    // leg, on the gallery floor against the step's face.
    const r0 = leg ? EDGE - I.legAxis - I.deep / 2 : rIn;
    const r1 = r0 + I.deep;
    const foot = leg ? A.floor : FLOORS.first;
    const headFoot = A.floor + I.headFoot;
    out.pilaster.blocks.push(span(p - I.width / 2, p + I.width / 2, foot, headFoot, r0, r1));
    // The head: its flare (a trapezoid across the face, extruded through
    // the pilaster's depth), then its block up to the gutter.
    const w = I.width / 2;
    const h = I.headWidth / 2;
    out.head.prisms.push({
      // Counter-clockwise seen from +r, so it extrudes toward +r.
      outline: [
        [p - w, headFoot, r0],
        [p + w, headFoot, r0],
        [p + h, headFoot + I.flare, r0],
        [p - h, headFoot + I.flare, r0],
      ],
      depth: I.deep,
    });
    out.head.blocks.push(span(p - h, p + h, headFoot + I.flare, gutterFoot, r0, r1));
    // The valley gutter: from the face's plate pier back to the arch's
    // plane, or on to the leg.
    const back = leg ? EDGE - I.legReach : rIn;
    out.gutter.blocks.push(
      span(p - I.gutter / 2, p + I.gutter / 2, gutterFoot, SPRING_Y, back, EDGE - ARCADE.plate / 2),
    );
  }
  const arc = { outerRib: I.rib, innerRib: I.rib, radius: I.innerRadius, crown: I.innerCrown, under: ARCADE.shell };
  for (let k = -3; k <= 3; k++) {
    // gableRibs extrudes inward from its r: set it a plate outside the
    // plane, so the arch stands from the vault's end outward.
    const arch = gableRibs(bayCentre(k), rIn + ARCADE.plate, arc);
    out.arch.prisms.push(...arch.prisms);
    out.arch.blocks.push(...arch.blocks);
  }
  return out;
}

/** The arcade on the +z face: columns, piers, arches and masts (its dressing is `arcadeDressFace`). */
function arcadeFace(): Block[] {
  const A = GALLERY;
  const out: Block[] = [];
  const top = A.floor + A.columnHeight;
  const spring = top + A.archSpring;
  const column = (a: number, height: number) => post(a, EDGE, A.column, A.floor, A.floor + height);
  for (let k = -5; k <= 4; k++) {
    // The pier between bays k and k + 1; the corner piers stand 0.40 in
    // from the corner, so their outer column IS the corner's. That column
    // belongs to the face it ends (the +a end), pinwheel fashion.
    const p = (k + 0.5) * A.module;
    if (k > -5) out.push(column(p - A.pair / 2, A.columnHeight));
    out.push(column(p + A.pair / 2, A.columnHeight));
    const plateHalf = (A.pair + A.column) / 2;
    out.push(onLine(p - plateHalf, p + plateHalf, top, SPRING_Y, EDGE, ARCADE.plate));
    // The mast, just proud of the plate pier.
    const m = ARCADE.mast;
    const foot = A.floor + m.foot;
    out.push(post(p, EDGE + (ARCADE.plate + m.size) / 2, m.size, foot, foot + m.length));
  }
  for (let k = -4; k <= 4; k++) {
    const c = bayCentre(k);
    // The single column mid-bay, up to the arches' springing.
    out.push(column(c, A.columnHeight + A.archSpring));
    // Its two small arches, as facets of the rib.
    for (const side of [-1, 1]) {
      const ac = c + side * GALLERY_RAIL_PITCH;
      const mid = A.archRadius + A.archRib / 2;
      const chord = 2 * (A.archRadius + A.archRib) * Math.sin(Math.PI / (2 * ARCADE.archFacets));
      for (let i = 0; i < ARCADE.archFacets; i++) {
        const phi = (Math.PI * (i + 0.5)) / ARCADE.archFacets;
        out.push({
          at: [ac + mid * Math.cos(phi), spring + mid * Math.sin(phi), EDGE],
          size: [chord, A.archRib, ARCADE.plate],
          rot: turn(2, phi + Math.PI / 2),
        });
      }
    }
  }
  return out;
}

/**
 * THE ARCADE'S DRESSING: one arcade drawn once (`arcadeDressFace`, the
 * +z face's nine bays) and turned onto the four faces, 36 in all
 * [sourced: « 9 arcades » a face; the ledger's « 36 arcades »]. Heights
 * above the gallery floor, a from the bay's centre [tags per number]:
 *
 * - THE CREST. « Le tout est couronné par un grand motif en zinc estampé »
 *   [sourced E1900-TXT p. 213], with « Cartouches en staff » 36 and
 *   « Petits cartouches sous les motifs, patinettes » 36 [sourced ledger
 *   p. 218, as the OCR reads it; « palmettes » presumably]. PL-XIII is the
 *   iron skeleton and does not draw it; PL-XIX Fig. 1 does, at 1:200
 *   [measured on the full scan at 59-60 px/m, calibrated on the printed
 *   7.765 and the 3.80 + 4.90 chain, about ±0.05]: a U-shaped frame
 *   astride the crown, its legs about 0.15 wide leaning out along the two
 *   rays that flank the crown's pair of roundels, from the inner rib to
 *   8.30, then in to scrolls of radius 0.15 at ±0.58, 8.80; between them
 *   a cartouche 1.20 wide from 8.08 to 8.60; on it a collar and a palmette
 *   of seven fronds from 8.67, the middle one to 9.97, the next pair's
 *   tips at ±0.705, 9.42 and the lowest lobes' at ±0.765, 8.84 [measured;
 *   the pair between, ±0.40, 9.82, estimated], each frond about 0.28
 *   across [measured]. (An earlier reading on an upscaled crop gave 10.14
 *   for the top, about 0.15 high throughout: a datum slip. The box built
 *   before stopped at 10.10.) Stamped zinc, 0.10 thick [estimated],
 *   standing on the gable's face.
 * - THE CABOCHONS. « Dans les parties comprises entre les rayons de ces
 *   croissants existent des cabochons en verre jaune » [sourced text]: one
 *   in each of the crescent's 12 cells between its 11 rays [counted
 *   PL-XIX Fig. 1: 12 roundels an arcade], 432 in all [derived]; each a
 *   boss 0.27 across [measured] in a ring 0.38 across [measured 0.40;
 *   0.02 less, so that the model's crescent, a fit and narrower at its
 *   feet than the plate's, holds it clear of its rays and ribs], a
 *   constant 0.55 in from the outer rib along the cell's middle line
 *   [measured: the plate's centres sit a constant distance inside the
 *   outer member, the crown's pair at ±0.32, 7.72; here ±0.34, 7.87 in the
 *   model's crescent]. The boss is an instance (`fittings.cabochons`,
 *   asset `cabochon`), so the page can draw it in yellow glass; its ring
 *   is iron, 0.03 proud of the gable [estimated]. The « verres coulés
 *   étamés et teintés » over them are the `silvered` class (`glazing`).
 * - THE GLOBE. « Au centre de chaque arcade est disposé un gros ballon en
 *   verre dépoli enveloppé d'un treillage métallique, dans lequel est un
 *   bec de gaz » [sourced text]; no plate read draws it. One to an arcade
 *   [sourced], hung from the vault's crown over the gallery's middle,
 *   1.30 in from the column axis, centred 5.90 up, 0.60 across [estimated
 *   all three], on a rod inside two iron hoops [estimated]: 36 globes
 *   (`fittings.globes`, asset `globe`).
 */
const ARCADE_DRESS = {
  crest: {
    /** Along the rays either side of the crown's two cells (rays 5 and 7 of 11), up to `top`. */
    legs: { rays: [5, 7], width: 0.15, top: 8.3 },
    scroll: { at: 0.58, y: 8.8, radius: 0.15 },
    cartouche: { half: 0.6, foot: 8.08, top: 8.6, chamfer: 0.08 },
    collar: { half: 0.25, foot: 8.6, top: 8.7 },
    /** The fronds' tips, (a, height), from the base at 8.67; mirrored but the middle's. */
    palmette: {
      base: 8.67,
      tips: [
        [0, 9.97],
        [0.4, 9.82],
        [0.705, 9.42],
        [0.765, 8.84],
      ] as ReadonlyArray<readonly [number, number]>,
      width: 0.28,
    },
    depth: 0.1,
  },
  cabochon: { inFromOuter: 0.55, boss: 0.135, ring: 0.19, ringDepth: 0.03 },
  globe: { in: 1.3, centre: 5.9, radius: 0.3, rod: 0.03, hoop: 0.02, hoopSides: 12 },
} as const;

/** The assets the fit-out's instances resolve against: the page models each (main.ts `ASSETS`). */
export const FITTING_ASSETS = { globe: "globe", cabochon: "cabochon", baluster: "baluster" } as const;

/**
 * The cabochon asset's shape: a dome of base radius 1 on local y = 0,
 * rising this far along +y, out of its ring [estimated]. An instance's
 * matrix carries the boss's true radius, `ARCADE_DRESS.cabochon.boss`.
 */
export const CABOCHON_RISE = 0.55;

/** One instance of a fitting: where, turned how, and its size. */
interface Fitting {
  readonly at: Vec3;
  readonly rot: Quat;
  readonly scale: Vec3;
}

/** Local +y, the cabochon's axis, out along the +z face's normal: a quarter turn about x. */
const OUT_OF_FACE: Quat = turn(0, Math.PI / 2);
const UPRIGHT: Quat = [0, 0, 0, 1];

/** Face-frame fittings, turned onto the faces given, as the quadrant targets turn. */
function fittingsOnFaces(list: readonly Fitting[], faces: readonly number[] = [0, 1, 2, 3]): Fitting[] {
  const out: Fitting[] = [];
  for (const f of faces) {
    const yaw = turn(1, (f * Math.PI) / 2);
    for (const x of list) out.push({ at: onFace(f, x.at), rot: qmul(yaw, x.rot), scale: x.scale });
  }
  return out;
}

/**
 * Fittings as instances of `assetId`: a point per fitting carrying P,
 * `rot` and `scale`, jittered as the rivets are (they are seated on faces
 * too), then spawned.
 */
function fittingSpawn(g: Graph, id: string, list: readonly Fitting[], assetId: string): NodeHandle {
  const slots = g.add(
    pointGrid,
    { countX: list.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
  );
  const col = (pick: (x: Fitting) => number) => indexTable(list.map(pick));
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(col((x) => x.at[0]), col((x) => x.at[1]), col((x) => x.at[2])),
    },
    `${id}Place`,
  );
  const rot = g.add(
    setAttribute,
    {
      name: "rot",
      type: "f32",
      tupleSize: 4,
      value: vec(col((x) => x.rot[0]), col((x) => x.rot[1]), col((x) => x.rot[2]), col((x) => x.rot[3])),
    },
    `${id}Turn`,
  );
  const size = g.add(
    setAttribute,
    {
      name: "scale",
      type: "f32",
      tupleSize: 3,
      value: vec(col((x) => x.scale[0]), col((x) => x.scale[1]), col((x) => x.scale[2])),
    },
    `${id}Size`,
  );
  const spawn = g.add(spawnInstances, { assetId }, `${id}Spawn`);
  g.connect(slots, "out", place, "in");
  g.connect(jitter(g, `${id}Jitter`, place), "out", rot, "in");
  g.connect(rot, "out", size, "in");
  g.connect(size, "out", spawn, "in");
  return spawn;
}

/**
 * The arcade's dressing on the +z face (see `ARCADE_DRESS`): the crest,
 * the cabochons' rings and the globes' rods and hoops as solids, and the
 * bosses and globes as fittings.
 */
function arcadeDressFace(): {
  part: Record<"crest" | "ring" | "hanger", Piece>;
  cabochons: Fitting[];
  globes: Fitting[];
} {
  const D = ARCADE_DRESS;
  const C = D.crest;
  const floor = GALLERY.floor;
  const part = parted("crest", "ring", "hanger");
  const cabochons: Fitting[] = [];
  const globes: Fitting[] = [];
  // Counter-clockwise seen from +r: every crest outline extrudes out of
  // the gable's face, from EDGE.
  const ccw = (pts: Array<readonly [number, number]>): Prism => ({
    outline: pts.map(([a, y]): Vec3 => [a, y, EDGE]),
    depth: C.depth,
  });
  for (let k = -4; k <= 4; k++) {
    const c = bayCentre(k);
    const outerIn = vaultArc(c, EDGE, GABLE.outerRib);
    const innerOut = innerArc(c, EDGE, GABLE.innerRib);
    // The crest: legs along two rays, their heads turned in to the
    // scrolls, cartouche, collar, palmette.
    const plane = EDGE + C.depth / 2;
    for (const j of C.legs.rays) {
      const [ia, iy] = innerOut[j] as Vec3;
      const [oa, oy] = outerIn[j] as Vec3;
      const t = (floor + C.legs.top - iy) / (oy - iy);
      const head: Vec3 = [ia + t * (oa - ia), floor + C.legs.top, plane];
      const s = Math.sign(head[0] - c);
      const scroll: Vec3 = [c + s * C.scroll.at, floor + C.scroll.y, plane];
      part.crest.blocks.push(
        bar([ia, iy, plane], head, C.legs.width, C.depth),
        bar(head, [scroll[0] + s * C.scroll.radius * 0.6, scroll[1] - C.scroll.radius * 0.6, plane], C.legs.width, C.depth),
      );
      part.crest.prisms.push(disc(scroll[0], scroll[1], EDGE, C.scroll.radius, C.depth, 1));
    }
    const K = C.cartouche;
    const [k0, k1, h, e] = [floor + K.foot, floor + K.top, K.half, K.chamfer];
    part.crest.prisms.push(
      ccw([
        [c - h + e, k0],
        [c + h - e, k0],
        [c + h, k0 + e],
        [c + h, k1 - e],
        [c + h - e, k1],
        [c - h + e, k1],
        [c - h, k1 - e],
        [c - h, k0 + e],
      ]),
    );
    part.crest.blocks.push(
      span(c - C.collar.half, c + C.collar.half, floor + C.collar.foot, floor + C.collar.top, EDGE, EDGE + C.depth),
    );
    const P = C.palmette;
    const base = floor + P.base;
    const tips = P.tips.flatMap(([a, y]): Array<readonly [number, number]> => (a === 0 ? [[0, y]] : [[-a, y], [a, y]]));
    for (const [ta, ty] of tips) {
      const L = Math.hypot(ta, floor + ty - base);
      const [dx, dy] = [ta / L, (floor + ty - base) / L];
      const [nx, ny] = [dy, -dx];
      const w = P.width / 2;
      part.crest.prisms.push(
        ccw([
          [c, base],
          [c + dx * 0.55 * L + nx * w, base + dy * 0.55 * L + ny * w],
          [c + dx * L, base + dy * L],
          [c + dx * 0.55 * L - nx * w, base + dy * 0.55 * L - ny * w],
        ]),
      );
    }
    // The cabochons: one in each cell of the crescent, a constant distance
    // in from the outer rib's inner edge along the cell's middle line.
    const B = D.cabochon;
    for (let i = 0; i + 1 < outerIn.length; i++) {
      const midOf = (p: readonly Vec3[]): [number, number] => [
        ((p[i] as Vec3)[0] + (p[i + 1] as Vec3)[0]) / 2,
        ((p[i] as Vec3)[1] + (p[i + 1] as Vec3)[1]) / 2,
      ];
      const [oa, oy] = midOf(outerIn);
      const [ia, iy] = midOf(innerOut);
      const f = B.inFromOuter / Math.hypot(oa - ia, oy - iy);
      const a = oa + f * (ia - oa);
      const y = oy + f * (iy - oy);
      part.ring.prisms.push(disc(a, y, EDGE, B.ring, B.ringDepth, 1));
      cabochons.push({ at: [a, y, EDGE + B.ringDepth], rot: OUT_OF_FACE, scale: [B.boss, B.boss, B.boss] });
    }
    // The globe on its rod from the vault's crown, in its two hoops.
    const G = D.globe;
    const gr = EDGE - G.in;
    const gy = floor + G.centre;
    // The hoops' bars clear the globe at their chords' middles.
    const hoop = (G.radius + G.hoop / 2 + 0.005) / Math.cos(Math.PI / G.hoopSides);
    part.hanger.blocks.push(post(c, gr, G.rod, gy + hoop + G.hoop / 2, CROWN_Y - ARCADE.shell));
    for (let j = 0; j < G.hoopSides; j++) {
      const t0 = (2 * Math.PI * j) / G.hoopSides;
      const t1 = (2 * Math.PI * (j + 1)) / G.hoopSides;
      // One hoop in the face's plane, one square to it.
      part.hanger.blocks.push(
        bar(
          [c + hoop * Math.cos(t0), gy + hoop * Math.sin(t0), gr],
          [c + hoop * Math.cos(t1), gy + hoop * Math.sin(t1), gr],
          G.hoop,
          G.hoop,
        ),
        member(
          [c, gy + hoop * Math.sin(t0), gr + hoop * Math.cos(t0)],
          [c, gy + hoop * Math.sin(t1), gr + hoop * Math.cos(t1)],
          G.hoop,
        ),
      );
    }
    globes.push({ at: [c, gy, gr], rot: UPRIGHT, scale: [G.radius, G.radius, G.radius] });
  }
  return { part, cabochons, globes };
}

/**
 * THE BALUSTERS of the gallery's outer balustrade. « Enfin, les colonnes
 * sont réunies par un garde-corps constitué par des balustres en grès
 * verni maintenus par une lisse en fer et par une large main courante en
 * bois » [sourced E1900-TXT p. 213], supplied by Émile Muller [sourced].
 *
 * HOW MANY. The rule is PL-XIII Fig. 11's: « 5 balustres en terre cuite
 * dans chaque intervalle de 1.74125 » [sourced], and PL-XIX Fig. 1 draws
 * five in every interval of every bay, the corner bays too [counted].
 * Four intervals a bay (pier column, cast-iron pilaster, middle column,
 * pilaster, pier column), nine bays a face, four faces: 5 × 4 × 9 × 4 =
 * 720 [derived]. The ledger agrees: « Balustres en grès verni (E. Muller) »
 * 727 at 8.50 fr = 6,179.50 fr, and « Pose des balustres » 720 at 1 fr =
 * 720.00 fr [sourced p. 217, both products checked]: 727 bought, 720 set;
 * and its « Main-courante en bois », 237.60 m [sourced], is 72 small
 * arches' 3.30 between columns (3.4825 less 0.18) [derived], where 560
 * would need 4.24 an arch, longer than one.
 * The text's « Ces balustres, au nombre de 560 » [sourced p. 213] agrees
 * with neither; 560 is the rule with each face's two corner bays left out
 * (5 × 4 × 7 × 4) [derived], which no plate draws. The plates and the
 * ledger are built (SOURCES.md §10.10).
 *
 * WHERE. On the column axis, between each interval's two base blocks — the
 * column's socle 0.250 and the pilaster's 0.220 square, 1.50625 clear
 * [sourced PL-XIII Fig. 11 "250", "220", "1.50625"] — five evenly, 0.30125
 * apart [derived]; standing on the plinth rail (0.150) up to the channel
 * under the handrail, 0.890 [sourced: the cast-iron pilasters' "890"
 * between the rails; the model's rail is `GALLERY_RAIL`].
 *
 * THE PROFILE, turned about its axis, foot to top [measured PL-XIX Fig. 1,
 * 1:200, about 56 px/m on the full scan, so a pixel is 0.017 and the
 * thin parts are stroke-limited]: a plinth 0.21 (square on the plate,
 * read as a disc), a torus 0.17, a stem narrowing to about 0.07 over it
 * and swelling to 0.12 under a bulb 0.21 at 0.49-0.53, a neck about 0.06,
 * a cup, and an abacus 0.21 from 0.77 to the top. The host turns it (main.ts, the `baluster` asset); each
 * baluster is an instance of it at its true size (`fittings.balusters`).
 * The glaze's colour is not recorded [estimated on the page].
 */
export const BALUSTER = {
  perInterval: 5,
  clear: 1.50625,
  socle: 0.25,
  base: 0.22,
  height: 0.89,
  /** (height above the foot, radius) from the axis at the foot to the axis at the top. */
  profile: [
    [0, 0],
    [0, 0.105],
    [0.1, 0.105],
    [0.11, 0.085],
    [0.15, 0.085],
    [0.18, 0.06],
    [0.22, 0.035],
    [0.42, 0.06],
    [0.47, 0.09],
    [0.49, 0.105],
    [0.53, 0.105],
    [0.56, 0.08],
    [0.6, 0.035],
    [0.68, 0.03],
    [0.73, 0.06],
    [0.77, 0.1],
    [0.77, 0.105],
    [0.89, 0.105],
    [0.89, 0],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

/**
 * Every baluster on the +z face (see `BALUSTER`): five in each of a bay's
 * four intervals, on the column axis, on the gallery rail's plinth.
 */
function balustersFace(): Fitting[] {
  const B = BALUSTER;
  const A = GALLERY;
  const pitch = B.clear / B.perInterval;
  const foot = A.floor + GALLERY_RAIL.plinth;
  const out: Fitting[] = [];
  for (let k = -4; k <= 4; k++) {
    const c = bayCentre(k);
    // Each interval's clear: from the column's socle to the pilaster's
    // base, or from the pilaster's base to the middle column's socle.
    const pier = A.module / 2 - A.pair / 2;
    const clears: Array<readonly [number, number]> = [
      [c - pier + B.socle / 2, c - GALLERY_RAIL_PITCH - B.base / 2],
      [c - GALLERY_RAIL_PITCH + B.base / 2, c - B.socle / 2],
      [c + B.socle / 2, c + GALLERY_RAIL_PITCH - B.base / 2],
      [c + GALLERY_RAIL_PITCH + B.base / 2, c + pier - B.socle / 2],
    ];
    for (const [a0, a1] of clears) {
      if (Math.abs(a1 - a0 - B.clear) > 1e-9) {
        throw new Error(`platforms.ts balustersFace: an interval of ${a1 - a0}, not the plate's ${B.clear}`);
      }
      for (let j = 0; j < B.perInterval; j++) {
        out.push({ at: [a0 + pitch * (j + 0.5), foot, EDGE], rot: UPRIGHT, scale: [1, 1, 1] });
      }
    }
  }
  return out;
}

/**
 * A glazed door's arched head in the pavilion's gallery façade, centred on
 * a along the face, at r, left foot to right foot (see `FACADE`).
 */
function doorHead(a: number, r: number): Vec3[] {
  const F = FACADE;
  const out: Vec3[] = [];
  for (let i = 0; i <= F.headSegments; i++) {
    const phi = Math.PI * (1 - i / F.headSegments);
    const y = FLOORS.first + F.spring + F.rise * Math.sin(phi);
    out.push([a + (F.door / 2) * Math.cos(phi), y, r]);
  }
  return out;
}

/**
 * The glazed tympanum under a pavilion vault over bay centre `c`, at r
 * (see `FACADE`): a rib inside the vault's shell, a sill on the wall's
 * head, a post up the middle and rays from its foot, ARCADE.plate thick.
 */
function tympanum(c: number, r: number): Piece {
  const arc = vaultArc(c, r, ARCADE.shell);
  const rib = vaultArc(c, r, ARCADE.shell + GABLE.innerRib);
  const mid = r - ARCADE.plate / 2;
  const n = ARCADE.vaultSegments;
  const hub: Vec3 = [c, SPRING_Y, mid];
  const blocks: Block[] = [];
  const halfSpan = (GALLERY.module - GALLERY.valley) / 2 - ARCADE.shell;
  const sill = SPRING_Y + GABLE.innerRib / 2;
  const ends: [Vec3, Vec3] = [
    [c - halfSpan, sill, mid],
    [c + halfSpan, sill, mid],
  ];
  blocks.push(bar(ends[0], ends[1], GABLE.innerRib, ARCADE.plate));
  for (let i = 2; i <= n - 2; i += 2) {
    const [x, y] = rib[i] as Vec3;
    blocks.push(bar(hub, [x, y, mid], i === n / 2 ? GABLE.outerRib : GABLE.ray, ARCADE.plate));
  }
  return { prisms: between(arc, rib, ARCADE.plate), blocks };
}

/**
 * One pavilion on the +z face (tags as in the file comment). The hall is
 * its walls, not a block: the gallery façade of piers and glazed doors
 * (`FACADE`), the side walls, the rear wall beside the centre bay's annex;
 * the annexes stay blocks. Each bay's vault is a shell from the gallery's
 * gable to the building's back, over a glazed tympanum on the façade and
 * a solid one at its end.
 *
 * `staff` builds the gallery façade of piers and arched doors and its
 * glazed tympana: the Français', whose frame is clad [sourced text: « pans
 * de bois garnis de staff »]. The three pavilions of « bois apparent » get
 * their frame instead (`screenFront`), outside this shell.
 */
function pavilionFace(staff: boolean): { walls: Block[]; vaults: Prism[] } {
  const P = PAVILION;
  const F = FACADE;
  const front = EDGE - P.front;
  const back = front - P.depth;
  const annex = back + P.annex;
  const half = P.length / 2;
  const bay = GALLERY.module / 2;
  const floor = FLOORS.first;
  const W = F.wall;
  // The side walls run to the façade's back face, or to the screen's.
  const sideEnd = front - (staff ? W : PAVILION_FRAME.post);
  const walls: Block[] = [
    // The side walls, and the rear wall either side of the centre annex.
    span(-half, -half + W, floor, SPRING_Y, annex, sideEnd),
    span(half - W, half, floor, SPRING_Y, annex, sideEnd),
    span(-half, -bay, floor, SPRING_Y, annex, annex + W),
    span(bay, half, floor, SPRING_Y, annex, annex + W),
    // The centre bay's annex, up to the valley gutters.
    span(-bay, bay, floor, SPRING_Y, back, annex),
    // The outer bays' annexes, roofed as terraces.
    span(-half, -bay, floor, floor + P.annexHeight, back, annex),
    span(bay, half, floor, floor + P.annexHeight, back, annex),
  ];
  const vaults: Prism[] = [];
  const ridge = P.lanternEave + P.lanternRise;
  const pitch = Math.atan2(P.lanternRise, P.lanternWidth / 2);
  const slope = Math.hypot(P.lanternRise, P.lanternWidth / 2);
  for (const k of [-1, 0, 1]) {
    const c = bayCentre(k);
    const end = k === 0 ? back : annex;
    if (staff) {
      // The gallery façade: a pier either end, one in the middle, and over
      // each door the wall from its arched head to the gutter.
      walls.push(
        span(c - bay, c - bay + F.pier, floor, SPRING_Y, front - W, front),
        span(c + bay - F.pier, c + bay, floor, SPRING_Y, front - W, front),
        span(c - F.mid / 2, c + F.mid / 2, floor, SPRING_Y, front - W, front),
      );
      for (const s of [-1, 1]) {
        const head = doorHead(c + s * (F.mid + F.door) / 2, front);
        const line = head.map(([x, , z]): Vec3 => [x, SPRING_Y, z]);
        vaults.push(...between(line, head, W));
      }
      const glazed = tympanum(c, front);
      vaults.push(...glazed.prisms);
      walls.push(...glazed.blocks);
    }
    // The roof: the gallery's gable, the shell back to the building's end,
    // and the glazed tympanum at the end.
    const gable = gableRibs(c, EDGE);
    const rear = tympanum(c, end + ARCADE.plate);
    vaults.push(
      ...gable.prisms,
      ...between(vaultArc(c, EDGE), vaultArc(c, EDGE, ARCADE.shell), EDGE - end),
      ...rear.prisms,
    );
    walls.push(...gable.blocks, ...rear.blocks);
    const r1 = front - (k === 0 ? P.centreLantern.front : P.outerLantern.front);
    const r0 = k === 0 ? back + P.centreLantern.back : r1 - P.outerLantern.length;
    // The lantern's glazed body, sunk into the vault's crown, and its roof.
    const body = P.lanternBody / 2;
    walls.push(span(c - body, c + body, CROWN_Y - P.bodySink, P.lanternEave, r0, r1));
    for (const side of [-1, 1]) {
      walls.push({
        at: [c + (side * P.lanternWidth) / 4, (P.lanternEave + ridge) / 2, (r0 + r1) / 2],
        size: [slope, P.roofSlab, r1 - r0],
        rot: turn(2, -side * pitch),
      });
    }
  }
  return { walls, vaults };
}

/**
 * THE PAVILIONS' FRAME AND DRESSING (PL-XXIX, PL-XXX, E1900-TXT
 * pp. 213-214; SOURCES.md §10.4). `pavilionFace` is the shell all four
 * share; this is what stands on it, in two layers.
 *
 * THE RULE, the same on all four (`pavilionRule`), heights above the
 * restaurant floor [tags per number]:
 * - a cornice at the wall head round the gallery front, the sides and the
 *   back, 0.20 tall and 0.06 proud [estimated: every elevation draws a
 *   moulded head band; its section is not printed; 0.06 keeps it behind
 *   the Russe's gables, which stand in front of it];
 * - the side walls' posts, one on each of the 3.8825 lines back from the
 *   front [sourced: « 3 entraxes » of 3.8825 make the 11.65], 0.15 square
 *   and proud [sourced PL-XXX Fig. 5 "150"];
 * - on the two terraces the annex makes at 2.95 [sourced text], a
 *   balustrade 1.00 tall [sourced PL-XXIX Fig. 9 "1.00"] along the back
 *   and the outer side, posts about every 1.0 [estimated];
 * - where the centre bay's annex rises past the terraces, a pinnacle post
 *   by each back corner, outside its side cornice, 0.20 square from the
 *   terrace to 6.40 under a 0.30 cap at 6.70 [measured PL-XXIX Fig. 9:
 *   6.57-6.82; Fig. 1: 6.68-6.85].
 *
 * THE SCREEN (`screenFront`), the gallery front of the three « en bois
 * apparent » [sourced text], where the Français has its staff piers and
 * arched doors (`FACADE`): a post on every 3.8825 line [sourced PL-XXX
 * Fig. 5, PL-XXIX Fig. 11], 0.150 [sourced "150"]; a boarded sill to
 * 0.60 [sourced PL-XXIX Fig. 11 "0.60"; PL-XXX Fig. 5's chain 600 + 2.100
 * = 2.700]; a transom at 2.700 [sourced PL-XXX Fig. 5; the Russe's is
 * 2.76], its beam and the head beam 0.200 [sourced PL-XXX Fig. 5 "200"];
 * four leaves to a half-bay below the transom [counted PL-XXX Fig. 5,
 * PL-XXIX Fig. 11; "645.6" on the Bar, "605.6" on the Russe] on mullions
 * 0.080 [sourced "80"]; over the transom each pavilion's own sashes: two
 * on the Bar, three on the Russe (0.56 / 1.29 / 0.56), one arched on the
 * Flamand [counted]; their glass and bars `screenGlazing`'s. Over the wall head each vault's
 * end is BOARDED [sourced drawings:
 * the vertical boarding of PL-XXX Figs 5, 17 and PL-XXIX Fig. 11], 0.05
 * thick [estimated], where the Français' is glazed trellis. The Russe
 * leaves its centre bay open under the transom, as Fig. 11 draws it
 * (2.76 and 2.96 clear), where the entrance flights arrive.
 *
 * THE DRESSING, unique to each [measured on the plates at 1:100, about
 * 118 px/m on the full scans, unless tagged; heights above the floor]:
 * - FRANÇAIS (PL-XXIX Figs 1, 3): the nailed trellis on its piers
 *   [sourced text « treillage »; ledger « Treillage (Pillet et Schmid) »],
 *   laths on both diagonals 0.20 apart from 0.50 to the doors' springing
 *   [measured]; a staff archivolt round each door head, 0.25 wide and
 *   0.05 proud [measured]; and on the back of the centre bay, as it stood
 *   « pendant l'Exposition de 1889 » [sourced Fig. 1], the crest: a
 *   round-headed panel 2.40 wide to 8.46, between two posts 3.40 apart to
 *   7.64 with their finials, on quarter-round shoulders from the wall head
 *   [measured].
 * - RUSSE (PL-XXIX Figs 9, 11): over its open centre bay two carved
 *   gables, about 3.07 tip to tip, feet at 3.55, apex at 5.05 (its board's
 *   top 5.21), each 0.16 toward the bay's middle from its half-bay's,
 *   with its king post and a sunburst 0.32 in radius over the apex
 *   [measured], standing 0.085 proud, in front of the cornice; a carved
 *   valance of teeth under the front's cornice over the side bays, 0.16
 *   deep every 0.20 [measured, estimated pitch]; on the back of the centre
 *   bay the clock, 1.25 across [sourced "1.25"; measured 1.21-1.29]
 *   centred at 5.45 [measured], under a carved arch band 0.35 wide inside
 *   the vault [measured]; and on the centre lantern's back end the finial,
 *   2.60 from the ridge to the ball's top [sourced "2.60"], a wheel of
 *   radius 0.44 on it 1.28 up, its vane an arrow through it from 0.69 on
 *   one side to 1.28 on the other [measured].
 * - ANGLO-AMÉRICAIN (PL-XXX Fig. 5): on every boarded vault end a king
 *   post, a collar 0.55 of the way from the wall head to the crown with a
 *   post "110" under each end about 2.5 out; either side a long brace from
 *   the outer foot to the king post at the collar, a short strut under
 *   it, and a smaller X over the collar; in the band over the transom,
 *   raking struts rising from each post's foot out to the head beam, 0.78
 *   out [measured].
 * - FLAMAND: « identique au bar Anglo-Américain, sauf la décoration »
 *   [sourced text], and no plate draws its 1889 dress. The Théâtre it
 *   became kept its gallery front (PL-XXX Fig. 17), so that front is built
 *   [estimated]: an arched sash in every half-bay over the transom, rising
 *   1.50; and on every vault end a king post, a collar with its end posts,
 *   curved braces from the end posts' feet, 2.45 out, to the king post
 *   under the collar, and struts from the king post at the collar up and
 *   out to the arc, 1.24 out [measured on Fig. 17].
 *
 * Everything stands at most 0.09 proud of the front, inside the inner
 * arcade's plane (0.099 in front of it); no two of the rule's and the
 * dressings' pieces share a face; all is built in the +z face's
 * frame and turned onto the pavilion's own face, found by name in
 * `FACES` (never by index).
 */
const PAVILION_FRAME = {
  post: 0.15,
  mullion: 0.08,
  leaves: 4,
  sill: 0.6,
  panel: 0.05,
  transom: 2.7,
  beam: 0.2,
  board: 0.05,
  cornice: { height: 0.2, proud: 0.06 },
  terrace: { height: 1.0, plinth: 0.1, cap: 0.08, rail: 0.08, post: 0.1, pitch: 1.0 },
  pinnacle: { size: 0.2, top: 6.4, cap: 0.3, capTop: 6.7 },
} as const;

/** The dressing's numbers, per pavilion (see `PAVILION_FRAME`). */
const DRESSING = {
  francais: {
    trellis: { pitch: 0.2, lath: 0.035, from: 0.5 },
    archivolt: { width: 0.25, proud: 0.05 },
    crest: { half: 1.2, top: 8.46, depth: 0.3, posts: 1.7, post: 0.35, postTop: 7.64, finial: 0.25, shoulder: 6.8 },
  },
  russe: {
    gable: { half: 1.46, inward: 0.16, foot: 3.55, apex: 5.05, board: 0.22, tie: 0.12, king: 0.1, t: 0.085, sun: 0.32 },
    valance: { pitch: 0.2, tooth: 0.07, drop: 0.16, proud: 0.05 },
    clock: { radius: 0.625, centre: 5.45, depth: 0.1, band: 0.35, bandProud: 0.06 },
    finial: { height: 2.6, mast: 0.08, wheel: 0.44, wheelAt: 1.28, vane: [-0.69, 1.28] as readonly [number, number] },
    /** Mullions over the transom, as fractions of a half-bay's clear: three sashes, 0.56 / 1.29 / 0.56. */
    upper: [0.232, 0.768],
  },
  anglo: { collar: 0.55, knee: 0.78, collarPost: 2.5, upper: [0.5] },
  flamand: { collar: 0.55, braceFoot: 2.45, collarPost: 2.5, strut: 1.24, archRise: 1.5, upper: [] as number[] },
  /** Facets of a disc and of a curved brace. */
  discSides: 16,
  facets: 8,
} as const;

/** Each pavilion's face, by the name `FACES` gives it. */
const PAVILION_FACE = {
  flamand: pavilionOn("Restaurant flamand"),
  anglo: pavilionOn("Bar anglo-américain"),
  francais: pavilionOn("Restaurant français"),
  russe: pavilionOn("Restaurant russe"),
} as const;

function pavilionOn(name: (typeof FACES)[number]["pavilion"]): number {
  const f = FACES.find((x) => x.pavilion === name);
  if (f === undefined) throw new Error(`platforms.ts: FACES names no face for the ${name}`);
  return f.quadrant;
}

/** The pavilion's lines in the face frame: its gallery front, back, annex line, half-length. */
const PAV = {
  front: EDGE - PAVILION.front,
  back: EDGE - PAVILION.front - PAVILION.depth,
  annex: EDGE - PAVILION.front - PAVILION.depth + PAVILION.annex,
  half: PAVILION.length / 2,
  bay: GALLERY.module / 2,
} as const;

/** The vault's underside (under its shell) at height y: its half-width about the bay's centre. */
function underShell(y: number): number {
  const half = (GALLERY.module - GALLERY.valley) / 2 - ARCADE.shell;
  const rise = CROWN_Y - SPRING_Y - ARCADE.shell;
  const t = (y - SPRING_Y) / rise;
  return t >= 1 ? 0 : half * Math.sqrt(1 - Math.max(0, t) * t);
}

/**
 * A disc of `n` sides in the plane r = const, centred (a, y), extruded
 * `depth` toward +r (dir 1) or -r (dir -1): counter-clockwise seen from +r
 * extrudes toward it.
 */
function disc(a: number, y: number, r: number, radius: number, depth: number, dir: 1 | -1): Prism {
  const n = DRESSING.discSides;
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const phi = (2 * Math.PI * i) / n;
    pts.push([a + radius * Math.cos(phi), y + radius * Math.sin(phi), r]);
  }
  if (dir < 0) pts.reverse();
  return { outline: pts, depth };
}

/** A curve through `pts` in the plane r = const as bars `w` wide, `t` through it. */
function curveBars(pts: readonly (readonly [number, number])[], r: number, w: number, t: number): Block[] {
  const out: Block[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a0, y0] = pts[i] as readonly [number, number];
    const [a1, y1] = pts[i + 1] as readonly [number, number];
    out.push(bar([a0, y0, r], [a1, y1, r], w, t));
  }
  return out;
}

/**
 * The boarded end of the vault over bay centre `c`, its face at r,
 * extruded `t` inward: the arc under the shell over the springing line,
 * cut into convex pieces (a quad per facet, a triangle at each foot).
 */
function boardedEnd(c: number, r: number, t: number): Prism[] {
  const arc = vaultArc(c, r, ARCADE.shell);
  const out: Prism[] = [];
  for (let i = 0; i + 1 < arc.length; i++) {
    const p = arc[i] as Vec3;
    const q = arc[i + 1] as Vec3;
    // Clockwise seen from +r (over the top, then back along the line), so
    // it extrudes inward.
    const ring: Vec3[] = [p, q];
    if (q[1] - SPRING_Y > 1e-9) ring.push([q[0], SPRING_Y, r]);
    if (p[1] - SPRING_Y > 1e-9) ring.push([p[0], SPRING_Y, r]);
    out.push({ outline: ring, depth: t });
  }
  return out;
}

/** The rule every pavilion carries, on the +z face (see `PAVILION_FRAME`). */
function pavilionRule(): Record<"cornice" | "sidePost" | "terrace" | "pinnacle", Piece> {
  const F = PAVILION_FRAME;
  const { front, back, annex, half, bay } = PAV;
  const floor = FLOORS.first;
  const ch = F.cornice.height;
  const cp = F.cornice.proud;
  const out = parted("cornice", "sidePost", "terrace", "pinnacle");
  const head = SPRING_Y - ch;
  out.cornice.blocks.push(
    // The gallery front, the sides, the centre annex's back and sides,
    // and the hall's back wall over the terraces.
    span(-half - cp, half + cp, head, SPRING_Y, front, front + cp),
    span(-half - cp, -half, head, SPRING_Y, annex, front),
    span(half, half + cp, head, SPRING_Y, annex, front),
    span(-bay - cp, bay + cp, head, SPRING_Y, back - cp, back),
    span(-bay - cp, -bay, head, SPRING_Y, back, annex),
    span(bay, bay + cp, head, SPRING_Y, back, annex),
    span(-half - cp, -bay - cp, head, SPRING_Y, annex - cp, annex),
    span(bay + cp, half + cp, head, SPRING_Y, annex - cp, annex),
  );
  // The side walls' posts on the 3.8825 lines back from the front, the
  // last one at the hall's back corner.
  for (const s of [-1, 1]) {
    for (let j = 1; j <= 3; j++) {
      const r = j < 3 ? front - j * bay : annex + F.post / 2;
      out.sidePost.blocks.push(post(s * (half + F.post / 2), r, F.post, floor, head));
    }
  }
  // The terraces' balustrades and the pinnacles on the annex's corners.
  const T = F.terrace;
  const P = F.pinnacle;
  const y0 = floor + PAVILION.annexHeight;
  const top = y0 + T.height;
  for (const s of [-1, 1]) {
    // Past the centre annex's side cornice, then the pinnacle.
    const lo = bay + cp + P.size;
    const hi = half - T.rail;
    const rBack = back + T.rail / 2;
    const aSide = s * (half - T.rail / 2);
    for (const [ya, yb] of [
      [y0, y0 + T.plinth],
      [top - T.cap, top],
    ] as const) {
      out.terrace.blocks.push(onLine(s > 0 ? lo : -hi, s > 0 ? hi : -lo, ya, yb, rBack, T.rail));
      out.terrace.blocks.push(span(aSide - T.rail / 2, aSide + T.rail / 2, ya, yb, back, annex));
    }
    const n = Math.max(1, Math.round((hi - lo) / T.pitch));
    for (let k = 1; k <= n; k++) {
      const a = lo + ((hi - lo) * k) / n;
      out.terrace.blocks.push(post(s * a, rBack, T.post, y0 + T.plinth, top - T.cap));
    }
    const m = Math.max(1, Math.round((annex - back - T.rail) / T.pitch));
    for (let k = 1; k <= m; k++) {
      const r = back + T.rail + ((annex - back - T.rail) * k) / m - T.post / 2;
      out.terrace.blocks.push(post(aSide, r, T.post, y0 + T.plinth, top - T.cap));
    }
    const pa = s * (bay + cp + P.size / 2);
    const pr = back + P.size / 2;
    out.pinnacle.blocks.push(
      post(pa, pr, P.size, y0, floor + P.top),
      post(pa, pr, P.cap, floor + P.top, floor + P.capTop),
    );
  }
  return out;
}

/**
 * The timber screen on the gallery front, on the +z face (see
 * `PAVILION_FRAME`): posts, sill, transom and head, leaves and sashes,
 * and the boarded vault ends. `open` leaves the centre bay open under
 * the transom and bare over it (the Russe's, under its gables); `upper`
 * places the mullions over the transom, as fractions of a half-bay's
 * clear (each pavilion draws its own sashes there).
 */
function screenFront(open: boolean, upper: readonly number[]): Record<"post" | "beam" | "sash" | "board", Piece> {
  const F = PAVILION_FRAME;
  const { front, half, bay } = PAV;
  const floor = FLOORS.first;
  const out = parted("post", "beam", "sash", "board");
  const rMid = front - F.post / 2;
  const stations = [-3, -2, -1, 0, 1, 2, 3].map((i) =>
    Math.abs(i) === 3 ? Math.sign(i) * (half - F.post / 2) : i * bay,
  );
  for (const a of stations) out.post.blocks.push(post(a, rMid, F.post, floor, SPRING_Y));
  const transom = floor + F.transom;
  for (let j = 0; j + 1 < stations.length; j++) {
    const a0 = (stations[j] as number) + F.post / 2;
    const a1 = (stations[j + 1] as number) - F.post / 2;
    const centre = j === 2 || j === 3;
    out.beam.blocks.push(
      span(a0, a1, transom, transom + F.beam, front - F.post, front),
      span(a0, a1, SPRING_Y - F.beam, SPRING_Y, front - F.post, front),
    );
    if (open && centre) continue;
    out.beam.blocks.push(onLine(a0, a1, floor, floor + F.sill, rMid, F.panel));
    for (let m = 1; m < F.leaves; m++) {
      out.sash.blocks.push(post(a0 + ((a1 - a0) * m) / F.leaves, rMid, F.mullion, floor + F.sill, transom));
    }
    for (const u of upper) {
      out.sash.blocks.push(post(a0 + (a1 - a0) * u, rMid, F.mullion, transom + F.beam, SPRING_Y - F.beam));
    }
  }
  for (const k of [-1, 0, 1]) out.board.prisms.push(...boardedEnd(bayCentre(k), front, F.board));
  return out;
}

/** The plane the front's dressing stands in: `t` thick, from the front out. */
function proud(t: number): number {
  return PAV.front + t / 2;
}

/** The Français' dressing on the +z face (see `PAVILION_FRAME`, `DRESSING`). */
function francaisDressing(): Record<"trellis" | "archivolt" | "crest", Piece> {
  const D = DRESSING.francais;
  const F = FACADE;
  const { front, back, bay } = PAV;
  const floor = FLOORS.first;
  const out = parted("trellis", "archivolt", "crest");
  // The trellis on every pier of the façade, clipped to it.
  const T = D.trellis;
  // Inset by a lath, so no lath's square end overhangs its pier.
  const y0 = floor + T.from + T.lath;
  const y1 = floor + F.spring - T.lath;
  const r = proud(T.lath);
  const step = T.pitch * Math.SQRT2;
  for (const k of [-1, 0, 1]) {
    const c = bayCentre(k);
    const piers: Array<readonly [number, number]> = [
      [c - bay, c - bay + F.pier],
      [c - F.mid / 2, c + F.mid / 2],
      [c + bay - F.pier, c + bay],
    ];
    for (const [p0, p1] of piers) {
      const a0 = p0 + T.lath;
      const a1 = p1 - T.lath;
      for (const dir of [1, -1]) {
        // Lines y = kk + dir (a - a0), `pitch` apart square to themselves.
        const lo = dir > 0 ? y0 - (a1 - a0) : y0;
        const hi = dir > 0 ? y1 : y1 + (a1 - a0);
        for (let kk = lo + step / 2; kk < hi; kk += step) {
          // Where the line is inside the pier's rectangle, as a range of a.
          const u0 = Math.max(a0, dir > 0 ? a0 + (y0 - kk) : a0 + (kk - y1));
          const u1 = Math.min(a1, dir > 0 ? a0 + (y1 - kk) : a0 + (kk - y0));
          if (u1 - u0 < 2 * T.lath) continue;
          const y = (u: number) => kk + dir * (u - a0);
          out.trellis.blocks.push(bar([u0, y(u0), r], [u1, y(u1), r], T.lath, T.lath));
        }
      }
    }
    // The archivolts round the door heads.
    const A = D.archivolt;
    for (const s of [-1, 1]) {
      const a = c + (s * (F.mid + F.door)) / 2;
      const outer: Vec3[] = [];
      const inner: Vec3[] = [];
      for (let i = 0; i <= F.headSegments; i++) {
        const phi = Math.PI * (1 - i / F.headSegments);
        const y = floor + F.spring;
        outer.push([a + (F.door / 2 + A.width) * Math.cos(phi), y + (F.rise + A.width) * Math.sin(phi), front + A.proud]);
        inner.push([a + (F.door / 2) * Math.cos(phi), y + F.rise * Math.sin(phi), front + A.proud]);
      }
      out.archivolt.prisms.push(...between(outer, inner, A.proud));
    }
  }
  // The 1889 crest on the back of the centre bay, standing out from the
  // back toward the void (extruded -r from the back).
  const C = D.crest;
  const ys = floor + C.top - C.half;
  const tomb: Vec3[] = [];
  for (let i = 0; i <= DRESSING.facets; i++) {
    const phi = Math.PI * (1 - i / DRESSING.facets);
    tomb.push([C.half * Math.cos(phi), ys + C.half * Math.sin(phi), back]);
  }
  // Seen from +r: over the top left to right, down, back: clockwise, so -r.
  tomb.push([C.half, SPRING_Y, back], [-C.half, SPRING_Y, back]);
  out.crest.prisms.push({ outline: tomb, depth: C.depth });
  for (const s of [-1, 1]) {
    const a = s * C.posts;
    out.crest.blocks.push(
      post(a, back - C.post / 2, C.post, SPRING_Y, floor + C.postTop),
      post(a, back - C.post / 2, C.finial, floor + C.postTop, floor + C.postTop + C.finial),
    );
    // The shoulder from the wall head at the bay's edge up to the post: a
    // quarter ellipse, convex, clockwise seen from +r either side.
    const q: Vec3[] = [[s * (C.posts + C.post / 2), SPRING_Y, back]];
    const ax = bay - C.posts - C.post / 2;
    for (let i = 0; i <= DRESSING.facets; i++) {
      const t = (Math.PI / 2) * (i / DRESSING.facets);
      q.push([s * (C.posts + C.post / 2 + ax * Math.sin(t)), SPRING_Y + (floor + C.shoulder - SPRING_Y) * Math.cos(t), back]);
    }
    out.crest.prisms.push({ outline: s > 0 ? q : [...q].reverse(), depth: C.depth / 2 });
  }
  out.crest.blocks.push(post(0, back - C.depth / 2, C.finial, floor + C.top, floor + C.top + C.finial));
  return out;
}

/** The Russe's dressing on the +z face (see `PAVILION_FRAME`, `DRESSING`). */
function russeDressing(): Record<"gable" | "valance" | "clock" | "finial", Piece> {
  const D = DRESSING.russe;
  const { front, back, half, bay } = PAV;
  const floor = FLOORS.first;
  const out = parted("gable", "valance", "clock", "finial");
  // The two carved gables over the open centre bay.
  const G = D.gable;
  const r = proud(G.t);
  for (const s of [-1, 1]) {
    const gc = s * (bay / 2 - G.inward);
    const foot = floor + G.foot;
    const apex = floor + G.apex;
    out.gable.blocks.push(
      bar([gc - G.half, foot, r], [gc, apex, r], G.board, G.t),
      bar([gc, apex, r], [gc + G.half, foot, r], G.board, G.t),
      bar([gc - G.half, foot, r], [gc + G.half, foot, r], G.tie, G.t - 0.02),
      bar([gc, floor + PAVILION_FRAME.transom + PAVILION_FRAME.beam, r], [gc, apex, r], G.king, G.t - 0.01),
    );
    out.gable.prisms.push(disc(gc, apex + G.sun * 0.8, front, G.sun, G.t, 1));
  }
  // The valance under the front's cornice.
  const V = D.valance;
  const under = SPRING_Y - PAVILION_FRAME.cornice.height;
  const n = Math.floor((2 * half - V.tooth) / V.pitch);
  const a0 = -((n - 1) * V.pitch) / 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * V.pitch;
    // Not over the centre bay, where the gables stand [sourced drawing Fig. 11].
    if (Math.abs(a) < bay + V.tooth) continue;
    out.valance.blocks.push(span(a - V.tooth / 2, a + V.tooth / 2, under - V.drop, under, front, front + V.proud));
  }
  // The clock and its carved arch on the back of the centre bay.
  const K = D.clock;
  out.clock.prisms.push(disc(0, floor + K.centre, back, K.radius, K.depth, -1));
  // Wound as a gable's ribs, so it extrudes -r: out of the back.
  out.clock.prisms.push(
    ...between(vaultArc(0, back, ARCADE.shell), vaultArc(0, back, ARCADE.shell + K.band), K.bandProud),
  );
  // The finial on the centre lantern's back end.
  const Fi = D.finial;
  const ridge = PAVILION.lanternEave + PAVILION.lanternRise;
  const rf = back + PAVILION.centreLantern.back + Fi.mast / 2;
  const wheel = ridge + Fi.wheelAt;
  // Standing on the roof slabs' top over the ridge line, not in them.
  const pitch = Math.atan2(PAVILION.lanternRise, PAVILION.lanternWidth / 2);
  const onRoof = ridge + PAVILION.roofSlab / 2 / Math.cos(pitch) + 0.002;
  out.finial.blocks.push(
    post(0, rf, Fi.mast, onRoof, ridge + Fi.height),
    bar([Fi.vane[0], wheel, rf], [Fi.vane[1], wheel, rf], Fi.mast, Fi.mast),
  );
  out.finial.prisms.push(disc(0, wheel, rf - Fi.mast / 2, Fi.wheel, Fi.mast / 2, -1));
  return out;
}

/**
 * King post, collar and the collar's two end posts on each vault end
 * (PL-XXX Figs 5, 17: the posts "110" about 2.5 either side [measured]),
 * each a different depth through the plane so no two faces coincide;
 * returns the collar's height.
 */
function kingAndCollar(c: number, collar: number, posts: number, out: Piece): number {
  const top = CROWN_Y - ARCADE.shell - 0.02;
  const yc = SPRING_Y + collar * (top - SPRING_Y);
  const u = underShell(yc) - 0.2;
  out.blocks.push(
    bar([c, SPRING_Y, proud(0.09)], [c, top, proud(0.09)], 0.14, 0.09),
    bar([c - u, yc, proud(0.07)], [c + u, yc, proud(0.07)], 0.12, 0.07),
  );
  for (const s of [-1, 1]) {
    out.blocks.push(bar([c + s * posts, SPRING_Y, proud(0.06)], [c + s * posts, yc, proud(0.06)], 0.11, 0.06));
  }
  return yc;
}

/** The Anglo-Américain's dressing on the +z face (see `PAVILION_FRAME`, `DRESSING`). */
function angloDressing(): Record<"brace" | "knee", Piece> {
  const D = DRESSING.anglo;
  const F = PAVILION_FRAME;
  const { half, bay } = PAV;
  const floor = FLOORS.first;
  const out = parted("brace", "knee");
  const r = proud(0.05);
  const top = CROWN_Y - ARCADE.shell - 0.02;
  for (const k of [-1, 0, 1]) {
    const c = bayCentre(k);
    const yc = kingAndCollar(c, D.collar, D.collarPost, out.brace);
    const foot = SPRING_Y + 0.15;
    // Over the collar, a smaller X either side of the king post.
    const xLow = yc + 0.1;
    const xHigh = yc + 0.6 * (top - yc);
    for (const s of [-1, 1]) {
      const outer = c + s * (underShell(foot) - 0.3);
      const onKing = c + s * 0.12;
      out.brace.blocks.push(
        // The long brace from the outer foot to the king post at the collar,
        bar([outer, foot, r], [onKing, yc - 0.1, r], 0.12, 0.05),
        // the short strut under it, from the collar post's foot to its middle,
        bar([c + s * D.collarPost, foot, proud(0.04)], [(outer + onKing) / 2, (foot + yc - 0.1) / 2, proud(0.04)], 0.1, 0.04),
        // and the X over the collar, its two bars at two depths.
        bar([c + s * (underShell(xLow) - 0.3), xLow, proud(0.045)], [onKing, top - 0.3, proud(0.045)], 0.1, 0.045),
        bar([c + s * (underShell(xHigh) - 0.3), xHigh, proud(0.035)], [onKing, xLow, proud(0.035)], 0.1, 0.035),
      );
    }
  }
  // The raking struts in the band over the transom, rising from each
  // post's foot on the transom out to the head beam either side (inward
  // only at the ends), their heads clear of the cornice.
  const yTop = SPRING_Y - F.beam - 0.07;
  const yFoot = floor + F.transom + F.beam + 0.05;
  for (const i of [-3, -2, -1, 0, 1, 2, 3]) {
    const a = Math.abs(i) === 3 ? Math.sign(i) * (half - F.post / 2) : i * bay;
    for (const s of [-1, 1]) {
      if (Math.abs(a + s * D.knee) > half - F.post) continue;
      out.knee.blocks.push(bar([a + (s * F.post) / 2, yFoot, r], [a + s * D.knee, yTop, r], 0.1, 0.05));
    }
  }
  return out;
}

/** The Flamand's dressing on the +z face, from the Théâtre's front (see `PAVILION_FRAME`, `DRESSING`). */
function flamandDressing(): Record<"arch" | "brace", Piece> {
  const D = DRESSING.flamand;
  const F = PAVILION_FRAME;
  const { half, bay } = PAV;
  const floor = FLOORS.first;
  const out = parted("arch", "brace");
  const r = proud(0.05);
  const n = DRESSING.facets;
  for (const k of [-1, 0, 1]) {
    const c = bayCentre(k);
    const yc = kingAndCollar(c, D.collar, D.collarPost, out.brace);
    for (const s of [-1, 1]) {
      // The curved brace from the collar post's foot to the king post just
      // under the collar, bowed up and out.
      const onKing = 0.12;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= n; i++) {
        const t = (Math.PI / 2) * (i / n);
        pts.push([c + s * (onKing + (D.braceFoot - onKing) * Math.cos(t)), SPRING_Y + 0.1 + (yc - 0.16 - SPRING_Y - 0.1) * Math.sin(t)]);
      }
      out.brace.blocks.push(...curveBars(pts, r, 0.12, 0.05));
      // The strut from the king post at the collar up and out to the arc.
      const tU = Math.sqrt(1 - ((D.strut + 0.25) / underShell(SPRING_Y)) ** 2);
      const yEnd = SPRING_Y + tU * (CROWN_Y - ARCADE.shell - SPRING_Y) - 0.15;
      out.brace.blocks.push(bar([c + s * onKing, yc + 0.08, proud(0.04)], [c + s * D.strut, yEnd, proud(0.04)], 0.1, 0.04));
    }
  }
  // An arched sash in every half-bay over the transom.
  const stations = [-3, -2, -1, 0, 1, 2, 3].map((i) =>
    Math.abs(i) === 3 ? Math.sign(i) * (half - F.post / 2) : i * bay,
  );
  const spring = floor + F.transom + F.beam;
  for (let j = 0; j + 1 < stations.length; j++) {
    const a0 = (stations[j] as number) + F.post / 2 + 0.05;
    const a1 = (stations[j + 1] as number) - F.post / 2 - 0.05;
    const mid = (a0 + a1) / 2;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= n; i++) {
      const phi = Math.PI * (1 - i / n);
      pts.push([mid + ((a1 - a0) / 2) * Math.cos(phi), spring + D.archRise * Math.sin(phi)]);
    }
    out.arch.blocks.push(...curveBars(pts, r, 0.1, 0.05));
  }
  return out;
}

/** Every pavilion piece and the faces it goes on, by name. */
function pavilionParts(): Array<{ prefix: string; part: Parted; faces: readonly number[] }> {
  const P = PAVILION_FACE;
  return [
    { prefix: "pavilion", part: pavilionRule(), faces: [0, 1, 2, 3] },
    { prefix: "pavilion", part: screenFront(false, DRESSING.flamand.upper), faces: [P.flamand] },
    { prefix: "pavilion", part: screenFront(false, DRESSING.anglo.upper), faces: [P.anglo] },
    { prefix: "pavilion", part: screenFront(true, DRESSING.russe.upper), faces: [P.russe] },
    { prefix: "francais", part: francaisDressing(), faces: [P.francais] },
    { prefix: "russe", part: russeDressing(), faces: [P.russe] },
    { prefix: "anglo", part: angloDressing(), faces: [P.anglo] },
    { prefix: "flamand", part: flamandDressing(), faces: [P.flamand] },
    // The glazing bars (`GLAZING_BARS`); the glass itself is `glazing`'s.
    { prefix: "francais", part: francaisDoorsAll().bars, faces: [P.francais] },
    { prefix: "flamand", part: screenGlazing("flamand", false, DRESSING.flamand.upper).bars, faces: [P.flamand] },
    { prefix: "anglo", part: screenGlazing("anglo", false, DRESSING.anglo.upper).bars, faces: [P.anglo] },
    { prefix: "russe", part: screenGlazing("russe", true, DRESSING.russe.upper).bars, faces: [P.russe] },
  ];
}

// ------------------------------------------------------------------ //
// THE GLASS (SOURCES.md §10.11).
// ------------------------------------------------------------------ //

/**
 * THE GLASS the frames above leave open (SOURCES.md §10.11; PL-XIII,
 * PL-XIX, PL-XXIX, PL-XXX, E1900-TXT pp. 12, 213-216). Every pane is a sheet
 * `pane` thick [estimated: 6 mm plate], in the plane of the frame it
 * fills, cut to that frame's clear opening and run `rebate` into the
 * members round it [estimated], so no light shows at an edge and no pane
 * reaches into a member further than a glazier's rebate.
 *
 * - THE PAVILIONS' CLEAR GLASS (the `glass` class): the Français' six
 *   gallery doors (`FACADE`) and its glazed tympana over the façade; the
 *   glazed tympanum at every vault's void-side end, on all four; and the
 *   three « en bois apparent » the leaves and sashes of their screen
 *   (`screenFront`), « les baies vitrées ouvertes sur la galerie »
 *   [sourced p. 213], all but the leaves of the Russe's open centre bay.
 *   Each cut into its lights by the frame's own bars, with the glass past
 *   each ray's square end its own piece (`endFill`). NOT glazed, and why: the lanterns,
 *   zinc « et ne sert qu'à l'aération » on three [sourced p. 214] and on
 *   the Russe « trois châssis vitrés » standing 0.07-0.26 over the vault in
 *   the model's section, too little to glaze; the ceilings' glazed panels
 *   (the Français' « seul panneau vitré ovale par travée », the Bar's
 *   coffers), inside a hall the model does not furnish; the Bar's gables'
 *   stained glass by Champigneulle [sourced p. 214], drawn here as the
 *   clear glass of the tympana it would fill.
 * - THE ARCADE'S CRESCENTS (the `silvered` class): « des cabochons en
 *   verre jaune et, en dessus de ceux-ci, des verres coulés étamés et
 *   teintés donnant l'aspect de plaques dorées » [sourced p. 213; the
 *   ledger's « Verrerie des arcades (Néret) », p. 218]: silvered and tinted
 *   cast glass, which reads as gilt plate, not as a window, so it is its
 *   own class with its own paint. One plate in each of the 12 cells of
 *   every one of the 36 crescents, between the rays and the ribs, set
 *   `silveredSet` behind the gable's face [estimated], so the cabochons'
 *   rings, 0.03 proud of it, stand just in front.
 */
export const GLAZING = { pane: 0.006, rebate: 0.002, silveredSet: 0.01 } as const;

/** A point in a frame's own plane: (a, y) on a face, or (u, y) along a wall. */
type P2 = readonly [number, number];

/** The part of the convex `poly` where (x - at) · n ≥ d (Sutherland-Hodgman, one plane). */
function clipHalf(poly: readonly P2[], at: P2, n: P2, d: number): P2[] {
  const out: P2[] = [];
  const f = (p: P2) => (p[0] - at[0]) * n[0] + (p[1] - at[1]) * n[1] - d;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P2;
    const q = poly[(i + 1) % poly.length] as P2;
    const fp = f(p);
    const fq = f(q);
    if (fp >= 0) out.push(p);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** A polygon's signed area, (a, y) seen from +r: positive anticlockwise. */
function area2(poly: readonly P2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as P2;
    const q = poly[(i + 1) % poly.length] as P2;
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

/** A bar in a frame's plane: its centre line and its width in that plane. */
interface PlaneBar {
  readonly from: P2;
  readonly to: P2;
  readonly w: number;
}

/**
 * The convex `poly` cut into the lights between `bars`, ordered so that
 * each light lies to the right of the bar before it and to the left of
 * the bar after it, looking along the bar (`from` to `to`); every light
 * runs `GLAZING.rebate` past a bar's edge into it.
 */
function lights(poly: readonly P2[], bars: readonly PlaneBar[]): P2[][] {
  const out: P2[][] = [];
  for (let k = 0; k <= bars.length; k++) {
    const light = lightBetween(poly, bars[k - 1], bars[k]);
    if (light !== undefined) out.push(light);
  }
  return out;
}

/**
 * The one light of the convex `poly` to the right of `before` and the left
 * of `after` (either may be absent), run `GLAZING.rebate` past each bar's
 * edge into it; undefined if nothing is left.
 */
function lightBetween(poly: readonly P2[], before: PlaneBar | undefined, after: PlaneBar | undefined): P2[] | undefined {
  const side = (b: PlaneBar): P2 => {
    const dx = b.to[0] - b.from[0];
    const dy = b.to[1] - b.from[1];
    const l = Math.hypot(dx, dy);
    return [-dy / l, dx / l];
  };
  let light: P2[] = [...poly];
  if (before !== undefined) {
    const n = side(before);
    light = clipHalf(light, before.from, [-n[0], -n[1]], before.w / 2 - GLAZING.rebate);
  }
  if (after !== undefined) light = clipHalf(light, after.from, side(after), after.w / 2 - GLAZING.rebate);
  return light.length >= 3 && Math.abs(area2(light)) > 1e-4 ? light : undefined;
}

/**
 * A pane: the polygon in the plane r = const, as a sheet `GLAZING.pane`
 * thick centred on r (wound clockwise seen from +r, so it extrudes in).
 */
function sheet(poly: readonly P2[], r: number, t: number = GLAZING.pane): Prism {
  const ring = area2(poly) > 0 ? [...poly].reverse() : [...poly];
  return { outline: ring.map(([a, y]): Vec3 => [a, y, r + t / 2]), depth: t };
}

/** An axis-aligned light, a0..a1 by y0..y1, run `rebate` into its frame all round. */
function rect(a0: number, a1: number, y0: number, y1: number): P2[] {
  const e = GLAZING.rebate;
  return [
    [a0 - e, y0 - e],
    [a1 + e, y0 - e],
    [a1 + e, y1 + e],
    [a0 - e, y1 + e],
  ];
}

/**
 * The glass in the square end of a bar that meets a curved or sloping
 * member: the part of the convex `region` inside the bar's band, to
 * `rebate` short of its edges (where the lights either side of it stop),
 * and past its end `to` (`start`: past `from`), `rebate` into the bar. On
 * `side` 1 only the band's left half looking from `from` to `to`, on -1
 * only its right half. Undefined if that leaves nothing.
 */
function endFill(region: readonly P2[], from: P2, to: P2, w: number, side: -1 | 0 | 1 = 0, start = false): P2[] | undefined {
  const e = GLAZING.rebate;
  const l = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const d: P2 = [(to[0] - from[0]) / l, (to[1] - from[1]) / l];
  const n: P2 = [-d[1], d[0]];
  const half = w / 2 - e;
  let fill = clipHalf(region, from, n, side === 1 ? 0 : -half);
  fill = clipHalf(fill, from, [-n[0], -n[1]], side === -1 ? 0 : -half);
  fill = start ? clipHalf(fill, from, [-d[0], -d[1]], -e) : clipHalf(fill, to, d, -e);
  return fill.length >= 3 && Math.abs(area2(fill)) > 1e-6 ? fill : undefined;
}

/** The convex `poly` cut to the convex `clip` (either winding). */
function clipConvex(poly: readonly P2[], clip: readonly P2[]): P2[] {
  const sign = area2(clip) > 0 ? 1 : -1;
  let out: P2[] = [...poly];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const p = clip[i] as P2;
    const q = clip[(i + 1) % clip.length] as P2;
    // Inside is to the left of p->q for an anticlockwise clip.
    out = clipHalf(out, p, [-(q[1] - p[1]) * sign, (q[0] - p[0]) * sign], 0);
  }
  return out;
}

/**
 * The glass of the tympanum `tympanum` builds over bay centre `c` at r:
 * the vault's end under its rib, over the sill, cut by the post and rays
 * into six lights.
 */
function tympanumGlass(c: number, r: number): Prism[] {
  const n = ARCADE.vaultSegments;
  const inset = ARCADE.shell + GABLE.innerRib;
  const rib = vaultArc(c, r, inset);
  let poly: P2[] = vaultArc(c, r, inset - GLAZING.rebate).map(([a, y]): P2 => [a, y]);
  poly = clipHalf(poly, [c, SPRING_Y + GABLE.innerRib - GLAZING.rebate], [0, 1], 0);
  const hub: P2 = [c, SPRING_Y];
  const bars: PlaneBar[] = [];
  // Left to right, each pointing out of the hub: a light lies to the
  // right of the ray before it.
  for (let i = 2; i <= n - 2; i += 2) {
    const [x, y] = rib[i] as Vec3;
    bars.push({ from: hub, to: [x, y], w: i === n / 2 ? GABLE.outerRib : GABLE.ray });
  }
  // Each ray's square end meets the rib at a slant: the glass beyond it.
  const ends = bars.map((b) => endFill(poly, b.from, b.to, b.w)).filter((f): f is P2[] => f !== undefined);
  return [...lights(poly, bars), ...ends].map((p) => sheet(p, r - ARCADE.plate / 2));
}

/**
 * The glazing bars, read off the plates at 1:100 (SOURCES.md §10.11;
 * heights over the restaurant floor, good to ±0.03-0.05 [measured at about
 * 118 px/m on the full scans] unless tagged). Bars 0.030 wide, rails 0.050,
 * each 0.040 through the frame's plane [estimated: the plates draw lines].
 *
 * - THE FRANÇAIS' DOORS (PL-XXIX Figs 1, 3): four equal leaves of 0.61
 *   between jambs 0.08 [measured: 0.58-0.63 stile to stile, about 0.08
 *   frames], a stile between each pair and a meeting stile on the axis
 *   [measured: a double line]; a raised panel from the floor to 0.58;
 *   three panes to a leaf, bars at 1.18 and 1.73, up to a transom from
 *   2.28 to the springing (the model's 2.43; measured 2.44). Over it, the
 *   head's fan: an inner arched light over the two middle leaves, radius
 *   0.62 [measured: span 1.26, crown 3.03], split by the axis bar, and
 *   rays at ±30 and ±60 degrees from the upright [measured 30-32 and
 *   53-58] from it out to the head: 2 + 6 lights. The ring is built as the
 *   six chords between the rays' feet, so every light is convex.
 * - THE SCREENS' LEAVES: two panes high on the Russe and the Bar, over a
 *   rail at 2.10 and 2.02 [measured PL-XXIX Fig. 11: 2.10-2.13; PL-XXX
 *   Fig. 5: 1.97-2.07; drawn double, so rails]; four high and two across
 *   on the Flamand, bars at 1.13, 1.65, 2.14 [measured PL-XXX Fig. 17].
 *   OVER THE TRANSOM each draws its own (`screenGlazing`): the Russe three
 *   sashes three panes high, 2 / 4 / 2 across, and over its open centre
 *   bay « Châssis fixe » lights, built four across and three high
 *   [estimated: the plate draws vertical bars under the gables, not their
 *   count]; the Bar two sashes about 0.80 wide either side of its middle
 *   mullion, two by two, and diagonal boarding beyond them [measured]; the
 *   Flamand a fanlight under the arch its dressing draws, eight across (the
 *   leaves' lines and a bar between each two) and three high [counted],
 *   boarded over the arch [sourced drawing]. The rows split the heights
 *   evenly, as the plates' bars split theirs [measured: equal thirds and
 *   halves].
 */
const GLAZING_BARS = {
  bar: 0.03,
  rail: 0.05,
  depth: 0.04,
  door: {
    jamb: 0.08,
    stile: 0.05,
    meeting: 0.07,
    panel: 0.58,
    bars: [1.18, 1.73],
    transom: 2.28,
    fan: { radius: 0.62, rays: [-60, -30, 0, 30, 60] },
  },
  screen: {
    russe: { across: 1, rails: [2.1], rail: true, upper: [2, 4, 2], rows: 3, centre: 4 },
    anglo: { across: 1, rails: [2.02], rail: true, upper: [2, 2], rows: 2, sash: 0.8 },
    flamand: { across: 2, rails: [1.13, 1.65, 2.14], rail: false, upper: [8], rows: 3 },
  },
} as const;

/** A bar across or up an opening: where its middle is, and its width. */
interface Cut {
  readonly at: number;
  readonly w: number;
}

/** Glass and the bars that divide it: its panes, and the bars as a part (named for `fitOutSolids`). */
interface Glazed {
  readonly panes: Prism[];
  readonly bars: Parted;
}

/**
 * A rectangular opening a0..a1 by y0..y1 in the plane r, divided by bars up
 * it at `xs` and across it at `ys`: the bars as blocks
 * `GLAZING_BARS.depth` through the plane (the ones across running between
 * the ones up, so no two share a volume), the panes as the cells between
 * them, each run `rebate` into every bar and edge round it.
 */
function grid(
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  r: number,
  xs: readonly Cut[],
  ys: readonly Cut[],
): { panes: Prism[]; bars: Block[] } {
  const t = GLAZING_BARS.depth;
  const cuts = (lo: number, hi: number, list: readonly Cut[]) => [
    lo,
    ...[...list].sort((p, q) => p.at - q.at).flatMap((b) => [b.at - b.w / 2, b.at + b.w / 2]),
    hi,
  ];
  const ca = cuts(a0, a1, xs);
  const cy = cuts(y0, y1, ys);
  const bars: Block[] = xs.map((x) => span(x.at - x.w / 2, x.at + x.w / 2, y0, y1, r - t / 2, r + t / 2));
  for (const y of ys) {
    for (let i = 0; i < ca.length; i += 2) {
      bars.push(span(ca[i] as number, ca[i + 1] as number, y.at - y.w / 2, y.at + y.w / 2, r - t / 2, r + t / 2));
    }
  }
  const panes: Prism[] = [];
  for (let i = 0; i < ca.length; i += 2) {
    for (let j = 0; j < cy.length; j += 2) {
      panes.push(sheet(rect(ca[i] as number, ca[i + 1] as number, cy[j] as number, cy[j + 1] as number), r));
    }
  }
  return { panes, bars };
}

/** `n` bars `w` wide dividing a0..a1 into n + 1 lights of equal clear width. */
function even(a0: number, a1: number, n: number, w: number): Cut[] {
  const clear = (a1 - a0 - n * w) / (n + 1);
  return Array.from({ length: n }, (_, k) => ({ at: a0 + (k + 1) * clear + k * w + w / 2, w }));
}

/** Where the ray from `from` along `d` first leaves through the polyline `line` (a door's head). */
function exit(line: readonly P2[], from: P2, d: P2): { at: P2; normal: P2 } {
  let best: { at: P2; normal: P2; t: number } | undefined;
  for (let i = 0; i + 1 < line.length; i++) {
    const p = line[i] as P2;
    const q = line[i + 1] as P2;
    const e: P2 = [q[0] - p[0], q[1] - p[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-12) continue;
    const w: P2 = [p[0] - from[0], p[1] - from[1]];
    const t = (w[0] * e[1] - w[1] * e[0]) / den;
    const s = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 1e-9 && s >= -1e-9 && s <= 1 + 1e-9 && (best === undefined || t < best.t)) {
      const l = Math.hypot(e[0], e[1]);
      best = { at: [from[0] + d[0] * t, from[1] + d[1] * t], normal: [e[1] / l, -e[0] / l], t };
    }
  }
  if (best === undefined) throw new Error(`platforms.ts exit: the ray from ${from} along ${d} leaves no head`);
  return best;
}

/**
 * The Français' two doors over bay centre `c` in the gallery façade (see
 * `FACADE`, `GLAZING_BARS.door`): each door's panel, stiles, bars,
 * transom and fan, and its lights, in the wall's middle plane.
 */
function francaisDoors(c: number): Glazed {
  const F = FACADE;
  const B = GLAZING_BARS;
  const D = B.door;
  const r = PAV.front - F.wall / 2;
  const t = B.depth;
  const floor = FLOORS.first;
  const spring = floor + F.spring;
  const e = GLAZING.rebate;
  const bars = parted("doorFrame", "doorFan");
  const panes: Prism[] = [];
  for (const s of [-1, 1]) {
    const a = c + (s * (F.mid + F.door)) / 2;
    const h = F.door / 2;
    // The panel and the transom, the door's width.
    bars.doorFrame.blocks.push(
      span(a - h, a + h, floor, floor + D.panel, r - t / 2, r + t / 2),
      span(a - h, a + h, floor + D.transom, spring, r - t / 2, r + t / 2),
    );
    // The jambs, and the leaves between them: a stile between each pair,
    // the meeting stile on the axis.
    const inside = h - D.jamb;
    const pitch = inside / 2;
    bars.doorFrame.blocks.push(
      span(a - h, a - inside, floor + D.panel, floor + D.transom, r - t / 2, r + t / 2),
      span(a + inside, a + h, floor + D.panel, floor + D.transom, r - t / 2, r + t / 2),
    );
    const low = grid(
      a - inside,
      a + inside,
      floor + D.panel,
      floor + D.transom,
      r,
      [
        { at: a - pitch, w: D.stile },
        { at: a, w: D.meeting },
        { at: a + pitch, w: D.stile },
      ],
      D.bars.map((y) => ({ at: floor + y, w: B.bar })),
    );
    bars.doorFrame.blocks.push(...low.bars);
    panes.push(...low.panes);

    // The fan, centred on the axis at the springing. The ring is the
    // chords between its points at -90 (on the transom), the rays' feet
    // and +90; the rays run from it out to the head, the middle one from
    // the centre, through the inner light, which it splits.
    const hub: P2 = [a, spring];
    const R = D.fan.radius;
    const dir = (deg: number): P2 => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)];
    const angles = [-90, ...D.fan.rays, 90];
    const ring = angles.map((deg): P2 => [a + R * dir(deg)[0], spring + R * dir(deg)[1]]);
    const head = doorHead(a, PAV.front).map(([x, y]): P2 => [x, y]);
    for (let i = 0; i + 1 < ring.length; i++) {
      const [p, q] = [ring[i] as P2, ring[i + 1] as P2];
      bars.doorFan.blocks.push(bar([p[0], p[1], r], [q[0], q[1], r], B.bar, t));
    }
    const rays: PlaneBar[] = [];
    const ends: Array<{ from: P2; to: P2 }> = [];
    for (const deg of D.fan.rays) {
      const d = dir(deg);
      const from: P2 = deg === 0 ? hub : [a + R * d[0], spring + R * d[1]];
      // Stopped where its square end's leading corner meets the head's
      // facet, so no corner of it reaches into the wall above.
      const out = exit(head, hub, d);
      const cos = Math.abs(d[0] * out.normal[0] + d[1] * out.normal[1]);
      const back = ((B.bar / 2) * Math.sqrt(Math.max(0, 1 - cos * cos))) / cos + 0.001;
      const to: P2 = [out.at[0] - d[0] * back, out.at[1] - d[1] * back];
      bars.doorFan.blocks.push(bar([from[0], from[1], r], [to[0], to[1], r], B.bar, t));
      rays.push({ from: hub, to: [a + d[0], spring + d[1]], w: B.bar });
      ends.push({ from, to });
    }
    // The glass under the head, over the transom: a sector between each
    // two rays (left to right, each light to the right of the ray before
    // it looking out along it), cut by its chord of the ring into the fan
    // light beyond; and inside the ring the two inner lights either side
    // of the axis.
    // The head, `rebate` out along its normal: the same facets on an
    // ellipse grown by it both ways.
    const grown = Array.from({ length: F.headSegments + 1 }, (_, i): P2 => {
      const phi = Math.PI * (1 - i / F.headSegments);
      return [a + (h + e) * Math.cos(phi), spring + (F.rise + e) * Math.sin(phi)];
    });
    const opening: P2[] = [[a - h - e, spring - e], ...grown, [a + h + e, spring - e]];
    const chordIn = (i: number): { at: P2; n: P2 } => {
      const [p, q] = [ring[i] as P2, ring[i + 1] as P2];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let n: P2 = [(q[1] - p[1]) / l, -(q[0] - p[0]) / l];
      if ((hub[0] - p[0]) * n[0] + (hub[1] - p[1]) * n[1] < 0) n = [-n[0], -n[1]];
      return { at: p, n };
    };
    const sectors = lights(opening, rays);
    if (sectors.length !== ring.length - 1) throw new Error(`platforms.ts francaisDoors: ${sectors.length} fan sectors`);
    sectors.forEach((sector, i) => {
      const { at, n } = chordIn(i);
      const fanLight = clipHalf(sector, at, [-n[0], -n[1]], B.bar / 2 - e);
      if (fanLight.length >= 3) panes.push(sheet(fanLight, r));
    });
    for (const [half, away] of [
      [ring.slice(0, 4), -1],
      [ring.slice(3), 1],
    ] as const) {
      let inner: P2[] = [hub, ...half];
      for (let i = 0; i + 1 < ring.length; i++) {
        const { at, n } = chordIn(i);
        inner = clipHalf(inner, at, n, B.bar / 2 - e);
      }
      inner = clipHalf(inner, hub, [0, 1], -e);
      inner = clipHalf(inner, hub, [away, 0], B.bar / 2 - e);
      if (inner.length >= 3) panes.push(sheet(inner, r));
    }
    // The rays stop short of the head, square: the glass past each end.
    for (const { from, to } of ends) {
      const fill = endFill(opening, from, to, B.bar);
      if (fill !== undefined) panes.push(sheet(fill, r));
    }
  }
  return { panes, bars };
}

/**
 * A timber screen's glass, glazing bars and boarding, light by light
 * (`screenFront`, the same `open` and `upper`; `GLAZING_BARS.screen`): the
 * leaves between the mullions over the sill, and over the transom what
 * each pavilion's plate draws there — the Russe's sashes between its own
 * mullions and its centre bay's fixed lights, the Bar's two sashes by its
 * middle mullion and the boarding beyond them, the Flamand's fanlight
 * under its arch and the boarding over it.
 */
function screenGlazing(which: keyof typeof GLAZING_BARS.screen, open: boolean, upper: readonly number[]): Glazed {
  const F = PAVILION_FRAME;
  const B = GLAZING_BARS;
  const S = B.screen[which];
  const { front, half, bay } = PAV;
  const floor = FLOORS.first;
  const rMid = front - F.post / 2;
  const stations = [-3, -2, -1, 0, 1, 2, 3].map((i) =>
    Math.abs(i) === 3 ? Math.sign(i) * (half - F.post / 2) : i * bay,
  );
  const transom = floor + F.transom;
  const u0 = transom + F.beam;
  const u1 = SPRING_Y - F.beam;
  const bars = parted("glazing", "boarding");
  const panes: Prism[] = [];
  // The lights between the mullions at fractions `at` of a0..a1, each glazed as `each` says.
  const row = (a0: number, a1: number, at: readonly number[], each: (l0: number, l1: number, k: number) => void) => {
    const edges = [a0, ...at.flatMap((u) => [a0 + (a1 - a0) * u - F.mullion / 2, a0 + (a1 - a0) * u + F.mullion / 2]), a1];
    for (let i = 0; i < edges.length; i += 2) each(edges[i] as number, edges[i + 1] as number, i / 2);
  };
  const put = (g: { panes: Prism[]; bars: Block[] }) => {
    panes.push(...g.panes);
    bars.glazing.blocks.push(...g.bars);
  };
  const board = (poly: readonly P2[]) => bars.boarding.prisms.push(sheet(poly, rMid, F.board));
  for (let j = 0; j + 1 < stations.length; j++) {
    const a0 = (stations[j] as number) + F.post / 2;
    const a1 = (stations[j + 1] as number) - F.post / 2;
    const centre = open && (j === 2 || j === 3);
    if (!centre) {
      const leaves = Array.from({ length: F.leaves - 1 }, (_, m) => (m + 1) / F.leaves);
      row(a0, a1, leaves, (l0, l1) =>
        put(
          grid(
            l0,
            l1,
            floor + F.sill,
            transom,
            rMid,
            even(l0, l1, S.across - 1, B.bar),
            S.rails.map((y) => ({ at: floor + y, w: S.rail ? B.rail : B.bar })),
          ),
        ),
      );
    }
    const rows = even(u0, u1, S.rows - 1, B.bar);
    if (which === "russe") {
      // Over the open centre bay the fixed lights; elsewhere the sashes.
      if (centre) put(grid(a0, a1, u0, u1, rMid, even(a0, a1, B.screen.russe.centre - 1, B.bar), rows));
      else row(a0, a1, upper, (l0, l1, k) => put(grid(l0, l1, u0, u1, rMid, even(l0, l1, (S.upper[k] ?? 1) - 1, B.bar), rows)));
    } else if (which === "anglo") {
      // A sash either side of the middle mullion, boarding beyond it.
      const w = B.screen.anglo.sash;
      row(a0, a1, upper, (l0, l1, k) => {
        const [g0, g1] = k === 0 ? [l1 - w, l1] : [l0, l0 + w];
        put(grid(g0, g1, u0, u1, rMid, even(g0, g1, (S.upper[k] ?? 1) - 1, B.bar), rows));
        const [b0, b1] = k === 0 ? [l0, g0] : [g1, l1];
        board([
          [b0, u0],
          [b1, u0],
          [b1, u1],
          [b0, u1],
        ]);
      });
    } else {
      // The fanlight under the dressing's arch (`flamandDressing`: its
      // feet 0.05 inside the posts, rising `archRise` from the transom's
      // beam), glazed to the arch's centre line behind it; its bars on the
      // leaves' lines and between them; boarding over it.
      const D = DRESSING;
      const f0 = a0 + 0.05;
      const f1 = a1 - 0.05;
      const mid = (f0 + f1) / 2;
      const arch: P2[] = [];
      for (let i = 0; i <= D.facets; i++) {
        const phi = Math.PI * (1 - i / D.facets);
        arch.push([mid + ((f1 - f0) / 2) * Math.cos(phi), u0 + D.flamand.archRise * Math.sin(phi)]);
      }
      const archAt = (x: number): number => {
        for (let i = 0; i + 1 < arch.length; i++) {
          const [p, q] = [arch[i] as P2, arch[i + 1] as P2];
          if (x >= p[0] - 1e-9 && x <= q[0] + 1e-9) return p[1] + ((q[1] - p[1]) * (x - p[0])) / (q[0] - p[0]);
        }
        return u0;
      };
      const xs: Cut[] = [];
      for (let m = 1; m < 8; m++) xs.push({ at: a0 + ((a1 - a0) * m) / 8, w: m % 2 === 0 ? F.mullion : B.bar });
      const ys = even(u0, u0 + D.flamand.archRise, S.rows - 1, B.bar);
      const cells = grid(f0, f1, u0, u0 + D.flamand.archRise, rMid, xs, ys);
      for (const pane of cells.panes) {
        const ring = pane.outline.map(([x, y]): P2 => [x, y]);
        const light = clipConvex(ring, arch);
        if (light.length >= 3 && Math.abs(area2(light)) > 1e-6) panes.push(sheet(light, rMid));
      }
      const t = B.depth;
      for (const x of xs) {
        // Up to the arch at the bar's higher side, so no light shows over it.
        const [x0, x1] = [x.at - x.w / 2, x.at + x.w / 2];
        const yTop = Math.max(archAt(x0), archAt(x1), ...arch.filter((q) => q[0] > x0 && q[0] < x1).map((q) => q[1]));
        if (yTop - u0 > 1e-6) bars.glazing.blocks.push(span(x.at - x.w / 2, x.at + x.w / 2, u0, yTop, rMid - t / 2, rMid + t / 2));
      }
      for (const y of ys) {
        // Across the arch at that height, between its two sides.
        const across = clipConvex(
          [
            [f0, y.at - y.w / 2],
            [f1, y.at - y.w / 2],
            [f1, y.at + y.w / 2],
            [f0, y.at + y.w / 2],
          ],
          arch,
        );
        const lo = Math.min(...across.map((q) => q[0]));
        const hi = Math.max(...across.map((q) => q[0]));
        // [lo, hi] less the upright bars, which run through.
        let from = lo;
        for (const x of [...xs].sort((p, q) => p.at - q.at)) {
          const [x0, x1] = [x.at - x.w / 2, x.at + x.w / 2];
          if (x1 <= from || x0 >= hi) continue;
          if (x0 - from > 1e-6) bars.glazing.blocks.push(span(from, x0, y.at - y.w / 2, y.at + y.w / 2, rMid - t / 2, rMid + t / 2));
          from = Math.max(from, x1);
        }
        if (hi - from > 1e-6) bars.glazing.blocks.push(span(from, hi, y.at - y.w / 2, y.at + y.w / 2, rMid - t / 2, rMid + t / 2));
      }
      // The boarding: a strip by each post, and over each facet of the arch up to the head beam.
      board([
        [a0, u0],
        [f0, u0],
        [f0, u1],
        [a0, u1],
      ]);
      board([
        [f1, u0],
        [a1, u0],
        [a1, u1],
        [f1, u1],
      ]);
      for (let i = 0; i + 1 < arch.length; i++) {
        const [p, q] = [arch[i] as P2, arch[i + 1] as P2];
        board([p, q, [q[0], u1], [p[0], u1]]);
      }
    }
  }
  return { panes, bars };
}

/** The Français' doors over its three bays, as one. */
function francaisDoorsAll(): Glazed {
  const all = [-1, 0, 1].map((k) => francaisDoors(bayCentre(k)));
  const bars = parted("doorFrame", "doorFan");
  for (const d of all) {
    for (const name of ["doorFrame", "doorFan"] as const) {
      bars[name].blocks.push(...(d.bars[name] as Piece).blocks);
      bars[name].prisms.push(...(d.bars[name] as Piece).prisms);
    }
  }
  return { panes: all.flatMap((d) => d.panes), bars };
}

/**
 * The silvered glass in the crescent of the gable over bay centre `c` on
 * the face (`gableRibs`, face gable): a plate in each of its twelve cells,
 * between two rays (or a ray and the crescent's foot) and the two ribs;
 * the plates in the square ends of the rays, which meet the ribs at a
 * slant; and at each foot, where the two ribs come down to the springing
 * apart, a sill the width of a ray on which the end plates stand
 * [estimated: the plates draw the crescent's foot on the pier's head].
 */
function crescentGlass(c: number): { plates: Prism[]; ends: Prism[]; sills: Block[] } {
  const n = ARCADE.vaultSegments;
  const e = GLAZING.rebate;
  const outerIn = vaultArc(c, EDGE, GABLE.outerRib);
  const innerOut = innerArc(c, EDGE, GABLE.innerRib);
  const top = vaultArc(c, EDGE, GABLE.outerRib - e);
  const bottom = innerArc(c, EDGE, GABLE.innerRib - e);
  const p2 = (p: Vec3): P2 => [p[0], p[1]];
  const sill = SPRING_Y + GABLE.ray;
  // Each sill runs from the outer rib's foot to where the inner rib's edge
  // stands at the sill's top, which leans out over its own foot.
  const sills: Block[] = [
    [0, 1],
    [n, n - 1],
  ].map(([i, j]) => {
    const [p, q] = [innerOut[i as number] as Vec3, innerOut[j as number] as Vec3];
    const x = p[0] + ((q[0] - p[0]) * (sill - p[1])) / (q[1] - p[1]);
    const [a0, a1] = [(outerIn[i as number] as Vec3)[0], x].sort((u, v) => u - v) as [number, number];
    return span(a0, a1, SPRING_Y, sill, EDGE - ARCADE.plate, EDGE);
  });
  // Cell i, over the sill.
  const cell = (i: number): P2[] => {
    const quad: P2[] = [p2(top[i] as Vec3), p2(top[i + 1] as Vec3), p2(bottom[i + 1] as Vec3), p2(bottom[i] as Vec3)];
    return clipHalf(quad, [c, sill - e], [0, 1], 0);
  };
  const rays: PlaneBar[] = [];
  for (let i = 1; i < n; i++) {
    rays.push({ from: p2(innerOut[i] as Vec3), to: p2(outerIn[i] as Vec3), w: GABLE.ray });
  }
  const r = EDGE - GLAZING.silveredSet;
  const plates: Prism[] = [];
  for (let i = 0; i < n; i++) {
    const light = lightBetween(cell(i), rays[i - 1], rays[i]);
    if (light === undefined) throw new Error(`platforms.ts crescentGlass: cell ${i} of the gable at ${c} is empty`);
    plates.push(sheet(light, r));
  }
  // Ray i + 1 runs between cells i (on its left) and i + 1 (on its right).
  const ends: Prism[] = [];
  rays.forEach((ray, i) => {
    for (const [side, k] of [
      [1, i],
      [-1, i + 1],
    ] as const) {
      for (const start of [false, true]) {
        const fill = endFill(cell(k), ray.from, ray.to, ray.w, side, start);
        if (fill !== undefined) ends.push(sheet(fill, r));
      }
    }
  });
  return { plates, ends, sills };
}

/**
 * The clear glass (`glass`) and the silvered (`silvered`), each as world
 * prisms on the faces it stands on, and a pane count by opening for the
 * record. For inspection as well as for the cook.
 */
export function glazing(): { glass: Prism[]; silvered: Prism[]; sills: Block[]; count: Record<string, number> } {
  const P = PAVILION_FACE;
  const all = [0, 1, 2, 3];
  const timber = DRESSING;
  const count: Record<string, number> = {};
  const glass: Prism[] = [];
  const put = (name: string, list: readonly Prism[], faces: readonly number[]) => {
    const placed = allFacesPrisms(list, faces);
    count[name] = (count[name] ?? 0) + placed.length;
    glass.push(...placed);
  };
  const rearOf = (k: number) => (k === 0 ? PAV.back : PAV.annex) + ARCADE.plate;
  put("francais.doors", francaisDoorsAll().panes, [P.francais]);
  for (const k of [-1, 0, 1]) {
    const c = bayCentre(k);
    put("francais.tympana", tympanumGlass(c, PAV.front), [P.francais]);
    put("rear.tympana", tympanumGlass(c, rearOf(k)), all);
  }
  put("flamand.screen", screenGlazing("flamand", false, timber.flamand.upper).panes, [P.flamand]);
  put("anglo.screen", screenGlazing("anglo", false, timber.anglo.upper).panes, [P.anglo]);
  put("russe.screen", screenGlazing("russe", true, timber.russe.upper).panes, [P.russe]);
  const plates: Prism[] = [];
  const ends: Prism[] = [];
  const feet: Block[] = [];
  for (let k = -4; k <= 4; k++) {
    const cr = crescentGlass(bayCentre(k));
    plates.push(...cr.plates);
    ends.push(...cr.ends);
    feet.push(...cr.sills);
  }
  const silvered = [...allFacesPrisms(plates, all), ...allFacesPrisms(ends, all)];
  count["crescents"] = plates.length * all.length;
  count["crescent.ends"] = ends.length * all.length;
  return { glass, silvered, sills: allFaces(feet, all), count };
}

/** The 1st floor's cross girders on the +z face: parallelograms between the legs. */
function crossGirders(): Block[] {
  const G = CROSS_GIRDER;
  const yTop = FLOORS.first - G.drop - G.chord / 2;
  const yBot = FLOORS.first - G.drop - G.depth + G.chord / 2;
  const at = (y: number, t: number): [number, number] => {
    const { outer, inner } = profileAt(y);
    return [y, inner + (outer - inner) * t];
  };
  const out: Block[] = [];
  // Between the legs: every 3.8825 whose girder clears the side uprights.
  const clear = profileAt(FLOORS.first).inner - uprightAt(FLOORS.first) - G.chord;
  for (let k = -Math.floor(clear / G.pitch); k * G.pitch <= clear; k++) {
    const a = k * G.pitch;
    const pt = (y: number, t: number): Vec3 => {
      const [yy, r] = at(y, t);
      return [a, yy, r];
    };
    out.push(member(pt(yTop, 0), pt(yTop, 1), G.chord));
    out.push(member(pt(yBot, 0), pt(yBot, 1), G.chord));
    // Posts at the panel points, and one diagonal per panel.
    for (let i = 0; i <= G.panels; i++) {
      const t = i / G.panels;
      out.push(member(pt(yBot, t), pt(yTop, t), G.bar));
      if (i < G.panels) out.push(member(pt(yBot, t), pt(yTop, (i + 1) / G.panels), G.bar));
    }
  }
  return out;
}

/**
 * A straight member of square section `w` from p to q, both in the plane
 * r = const: a box along its own x, turned about the r axis onto p->q.
 */
function memberAlong(p: Vec3, q: Vec3, w: number): Block {
  const da = q[0] - p[0];
  const dy = q[1] - p[1];
  return {
    at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2],
    size: [Math.hypot(da, dy), w, w],
    rot: turn(2, Math.atan2(dy, da)),
  };
}

/** A point (s, t) of the diagonals' frame, on the plan (x, z). */
function fromDiagonals([s, t]: readonly [number, number]): [number, number] {
  return [(s + t) * Math.SQRT1_2, (t - s) * Math.SQRT1_2];
}

/** A convex polygon (s, t) clipped to the box s0..s1, t0..t1 (Sutherland-Hodgman). */
function clipToBox(
  poly: readonly (readonly [number, number])[],
  s0: number,
  s1: number,
  t0: number,
  t1: number,
): [number, number][] {
  let out = poly.map((p): [number, number] => [p[0], p[1]]);
  const planes: [0 | 1, number, 1 | -1][] = [
    [0, s0, 1],
    [0, s1, -1],
    [1, t0, 1],
    [1, t1, -1],
  ];
  for (const [k, v, sign] of planes) {
    const inside = (p: [number, number]) => sign * (p[k] - v) >= -1e-9;
    const next: [number, number][] = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i] as [number, number];
      const b = out[(i + 1) % out.length] as [number, number];
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
 * A floor slab from y0 up to y1 over a convex plan (in the diagonals'
 * frame) less rectangular wells, as convex prisms: the plan cut into bands
 * at the wells' edges across the N-S diagonal (t), each band into pieces
 * between the wells it crosses. Every piece is wound counter-clockwise
 * seen from above, so it extrudes up.
 */
function floorWithWells(
  plan: readonly (readonly [number, number])[],
  wells: readonly Well[],
  y0: number,
  y1: number,
): Prism[] {
  const big = 1e3;
  const edges = wells.flatMap((w) => [(w.t ?? 0) - w.across / 2, (w.t ?? 0) + w.across / 2]);
  const ts = [-big, big, ...edges].sort((a, b) => a - b);
  const out: Prism[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const [ta, tb] = [ts[i] as number, ts[i + 1] as number];
    if (tb - ta < 1e-9) continue;
    const mid = (ta + tb) / 2;
    // The wells this band crosses, as intervals along the diagonal, merged
    // where they overlap.
    const cut = wells
      .filter((w) => Math.abs(mid - (w.t ?? 0)) < w.across / 2)
      .map((w) => [w.s - w.along / 2, w.s + w.along / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    const spans: [number, number][] = [];
    let from = -big;
    for (const [c0, c1] of cut) {
      if (c0 > from) spans.push([from, c0]);
      from = Math.max(from, c1);
    }
    spans.push([from, big]);
    for (const [sa, sb] of spans) {
      const piece = clipToBox(plan, sa, sb, ta, tb);
      if (piece.length < 3) continue;
      const xz = piece.map(fromDiagonals);
      let area = 0;
      for (let k = 0; k < xz.length; k++) {
        const [x0, z0] = xz[k] as [number, number];
        const [x1, z1] = xz[(k + 1) % xz.length] as [number, number];
        area += x0 * z1 - x1 * z0;
      }
      if (Math.abs(area) < 1e-6) continue;
      if (area > 0) xz.reverse();
      out.push({ outline: xz.map(([x, z]): Vec3 => [x, y0, z]), depth: y1 - y0 });
    }
  }
  return out;
}

/** A well turned `k` quarter turns about +y, as the quadrant targets turn: (s, t) to (t, -s). */
function turnWell(w: Well, k: number): Well {
  let [s, t, along, across] = [w.s, w.t ?? 0, w.along, w.across];
  for (let i = 0; i < k; i++) [s, t, along, across] = [t, -s, across, along];
  return { s, t, along, across };
}

/**
 * Deck prisms (convex outlines extruded up) less the wells that fall on
 * them: a prism a well overlaps is cut up by `floorWithWells`, the rest
 * are kept whole.
 */
function cutWells(list: readonly Prism[], wells: readonly Well[]): Prism[] {
  return list.flatMap((p) => {
    const plan = p.outline.map(([x, , z]): [number, number] => [
      (x - z) * Math.SQRT1_2,
      (x + z) * Math.SQRT1_2,
    ]);
    const lo = [0, 1].map((k) => Math.min(...plan.map((q) => q[k] as number)));
    const hi = [0, 1].map((k) => Math.max(...plan.map((q) => q[k] as number)));
    const hit = wells.filter((w) => {
      const t = w.t ?? 0;
      return (
        w.s + w.along / 2 > (lo[0] as number) &&
        w.s - w.along / 2 < (hi[0] as number) &&
        t + w.across / 2 > (lo[1] as number) &&
        t - w.across / 2 < (hi[1] as number)
      );
    });
    if (hit.length === 0) return [p];
    const y0 = (p.outline[0] as Vec3)[1];
    return floorWithWells(plan, hit, y0, y0 + p.depth);
  });
}

/** The 2nd floor's deck, less e1's four openings (plan: the square in the diagonals' frame). */
function secondDeck(): Prism[] {
  const d = (PLATFORMS.second.side / 2) * Math.SQRT2;
  const plan: [number, number][] = [
    [d, 0],
    [0, d],
    [-d, 0],
    [0, -d],
  ];
  const wells = [
    ...[0, 1, 2, 3].map((k) => turnWell(STAIR_OPENINGS.e1, k)),
    // The Otis lifts come up through it in piles 3 and 1.
    ...[1, 3].flatMap((k) => LIFT_OPENINGS.second.map((w) => turnWell(w, k))),
  ];
  return floorWithWells(plan, wells, FLOORS.second - DECK, FLOORS.second);
}

/** The landing's floor, less its wells (plan: the square in the diagonals' frame). */
function landingFloor(): Prism[] {
  const h = LANDING.side / 2;
  const plan: [number, number][] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  return floorWithWells(plan, LANDING.wells, FLOORS.landing - LANDING.floor, FLOORS.landing);
}

/** The 3rd floor, less its wells: the octagon, in the diagonals' frame. */
function thirdFloor(): Prism[] {
  const plan = octagon(THIRD.across, THIRD.straight, 0, 1).outline.map(
    ([x, , z]): [number, number] => [(x - z) * Math.SQRT1_2, (x + z) * Math.SQRT1_2],
  );
  // Drawn 0.01 deeper than the edge beams, so its underside does not lie in
  // the plane of panel 29's plate girders, which `summit.ts` hangs to the
  // same 0.85.
  return floorWithWells(plan, THIRD.wells, FLOORS.third - THIRD.depth - 0.01, FLOORS.third);
}

/**
 * The landing's girders, the lattice round its edge. Laid out in the
 * diagonals' frame — s toward +x -z (pile 3), t toward +x +z (pile 4) —
 * where the turned square is |s|, |t| <= side / 2, and turned onto it
 * whole: a box turned 45 degrees about +y has its x along s and its z
 * along t. Each side's girder is built in its own face frame (a along the
 * side, r out to it) and turned onto the square's sides by quarter turns
 * first.
 */
function landingBlocks(): Block[] {
  const L = LANDING;
  const h = L.side / 2;
  const top = FLOORS.landing;
  const yawDiag = turn(1, Math.PI / 4);
  const toWorld = (b: Block): Block => {
    const [s, y, t] = b.at;
    return {
      at: [(s + t) * Math.SQRT1_2, y, (t - s) * Math.SQRT1_2],
      size: b.size,
      rot: qmul(yawDiag, b.rot ?? [0, 0, 0, 1]),
    };
  };
  const inSquare: Block[] = [];
  const G = L.girders;
  // The girders: chords, posts and one diagonal per panel. Two sides meet
  // at each corner, and one post stands there: the deeper side's.
  G.forEach(({ depth, drop }, f) => {
    const next = (G[(f + 1) % 4] as (typeof G)[number]).depth;
    const prev = (G[(f + 3) % 4] as (typeof G)[number]).depth;
    const yTop = top - drop - L.chord / 2;
    const yBot = top - drop - depth + L.chord / 2;
    const side: Block[] = [
      memberAlong([-h, yTop, h], [h, yTop, h], L.chord),
      memberAlong([-h, yBot, h], [h, yBot, h], L.chord),
    ];
    for (let i = 0; i <= L.panels; i++) {
      const a = -h + (2 * h * i) / L.panels;
      const corner = (i === 0 && prev > depth) || (i === L.panels && next >= depth);
      if (!corner) side.push(post(a, h, L.bar, yBot, yTop));
      if (i < L.panels) {
        const b = -h + (2 * h * (i + 1)) / L.panels;
        side.push(memberAlong([a, yBot, h], [b, yTop, h], L.bar));
      }
    }
    const yaw = turn(1, (f * Math.PI) / 2);
    for (const b of side) {
      inSquare.push({ at: onFace(f, b.at), size: b.size, rot: qmul(yaw, b.rot ?? [0, 0, 0, 1]) });
    }
  });
  return inSquare.map(toWorld);
}

/**
 * The 3rd floor's consoles on the +z face, each in the plane a = const,
 * from the corner upright's outer face out to the edge beam's. The flange
 * is the arc of CONSOLE.radius whose centre stands level with the tangent
 * point, radius + foot from the axis, so the arc leaves the upright
 * vertically and turns out to the wall line at the top; its axis runs half
 * a flange inside that outer face. A top strut under the edge beam, a tie
 * across the foot, and from every other flange node a horizontal and a
 * diagonal back to the upright, make the web.
 */
function consolesFace(): Block[] {
  const C = CONSOLE;
  const yTop = FLOORS.third - THIRD.depth;
  const yFoot = yTop - C.height;
  const r0 = PANEL29.half + uprightAt(FLOORS.third);
  const tip = THIRD.across / 2;
  const cr = C.foot + C.radius;
  // The arc's centre height, from the outer face reaching the tip at yTop.
  const cy = yTop - Math.sqrt(C.radius ** 2 - (cr - tip) ** 2);
  const sweep = Math.asin((yTop - cy) / C.radius);
  const ra = C.radius + C.flange / 2;
  const out: Block[] = [];
  const flange = (p: Vec3, q: Vec3): Block => {
    const b = member(p, q, C.width);
    return { ...b, size: [C.width, C.flange, b.size[2]] };
  };
  for (const a of C.at) {
    const node = (i: number): Vec3 => {
      const f = (sweep * i) / C.segments;
      return [a, cy + ra * Math.sin(f), cr - ra * Math.cos(f)];
    };
    out.push(flange([a, yFoot, cr - ra], node(0)));
    for (let i = 0; i < C.segments; i++) out.push(flange(node(i), node(i + 1)));
    const strutY = yTop - C.bar / 2;
    out.push(member([a, strutY, r0], [a, strutY, tip], C.bar));
    out.push(member([a, yFoot + C.bar / 2, r0], [a, yFoot + C.bar / 2, cr - ra], C.bar));
    for (let i = 2; i < C.segments; i += 2) {
      const p = node(i);
      const up = Math.min(node(i + 2)[1] as number, strutY);
      out.push(member(p, [a, p[1], r0], C.bar));
      out.push(member(p, [a, up, r0], C.bar));
    }
  }
  return out;
}

/**
 * The 2nd floor's skirt on the +z face: one planar strip per step of its
 * profile, each mitred at the corners, so the four faces close.
 */
function secondSkirtFace(): Prism[] {
  const P = SECOND_SKIRT.profile;
  const out: Prism[] = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const [d0, w0] = P[i] as readonly [number, number];
    const [d1, w1] = P[i + 1] as readonly [number, number];
    const y0 = FLOORS.second - d0;
    const y1 = FLOORS.second - d1;
    out.push({
      // Clockwise seen from outside, so the strip extrudes inward.
      outline: [
        [-w0, y0, w0],
        [w0, y0, w0],
        [w1, y1, w1],
        [-w1, y1, w1],
      ],
      depth: SECOND_SKIRT.thickness,
    });
  }
  return out;
}

/** An (s, t) rectangle of the diagonals' frame as a plan outline (x, z). */
function diagonalRect([s0, s1, t0, t1]: readonly [number, number, number, number]): [number, number][] {
  return [
    fromDiagonals([s0, t0]),
    fromDiagonals([s1, t0]),
    fromDiagonals([s1, t1]),
    fromDiagonals([s0, t1]),
  ];
}

/** A flat convex facet (three or four points) as a slab `t` thick, extruded up its outward side. */
function facet(pts: readonly Vec3[], t: number): Prism {
  const [a, b, c] = pts as [Vec3, Vec3, Vec3];
  const n = cross3(sub3(b, a), sub3(c, a));
  return { outline: n[1] < 0 ? [...pts].reverse() : [...pts], depth: t };
}

const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * The 2nd platform's 1889 massing, in the world (see `SECOND_FITOUT`):
 * blocks and prisms.
 */
function secondFitOut(): Record<
  "tank" | "saddle" | "figaro" | "tickets" | "boutique" | "tent" | "queue",
  Piece
> {
  const F = SECOND_FITOUT;
  const floor = FLOORS.second;
  const out = parted("tank", "saddle", "figaro", "tickets", "boutique", "tent", "queue");
  // The reservoirs: a cylinder of `facets` sides about an axis along s,
  // wound counter-clockwise seen from +s so it extrudes along it.
  const T = F.tank;
  const axis: Vec3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
  const u: Vec3 = [axis[2], 0, -axis[0]];
  const yAxis = floor + T.foot + T.diameter / 2;
  const yaw = turn(1, Math.PI / 4);
  for (const side of [1, -1]) {
    const [cx, cz] = fromDiagonals([T.s, side * T.t]);
    const start: Vec3 = [cx - (axis[0] * T.length) / 2, yAxis, cz - (axis[2] * T.length) / 2];
    const ring: Vec3[] = [];
    for (let i = 0; i < T.facets; i++) {
      const th = (2 * Math.PI * i) / T.facets;
      const cu = (Math.cos(th) * T.diameter) / 2;
      const cv = (Math.sin(th) * T.diameter) / 2;
      ring.push([start[0] + u[0] * cu, start[1] + cv, start[2] + u[2] * cu]);
    }
    out.tank.prisms.push({ outline: ring, depth: T.length });
    // Two saddles under it, square to its axis: a box turned 45 degrees
    // about +y has its x along s and its z along t.
    for (const k of [-1, 1]) {
      const [sx, sz] = fromDiagonals([T.s + k * F.saddle.at, side * T.t]);
      out.saddle.blocks.push({
        at: [sx, floor + T.foot / 2, sz],
        size: [F.saddle.along, T.foot, F.saddle.across],
        rot: yaw,
      });
    }
  }
  // The Figaro's pavilion, the tickets and the boutiques.
  out.figaro.prisms.push(standing(F.figaro.plan, floor, floor + F.figaro.height));
  out.tickets.prisms.push(standing(diagonalRect(F.tickets), floor, floor + F.booth));
  for (const b of F.boutiques) out.boutique.prisms.push(standing(diagonalRect(b), floor, floor + F.booth));
  // The round tents: a pole, a post at every corner, and a canvas facet
  // from each side of the rim up to the apex.
  const N = F.tents;
  for (const [cx, cz] of N.at) {
    // A corner on the face's normal: the axis-side direction to the centre.
    const phase = Math.atan2(cz, cx);
    const rim: Vec3[] = [];
    for (let i = 0; i < N.sides; i++) {
      const th = phase + (2 * Math.PI * i) / N.sides;
      rim.push([cx + N.radius * Math.cos(th), floor + N.eave, cz + N.radius * Math.sin(th)]);
    }
    const apex: Vec3 = [cx, floor + N.apex, cz];
    out.tent.blocks.push(post(cx, cz, N.pole, floor, floor + N.apex));
    rim.forEach((p, i) => {
      // The posts stand a post inside the rim, under the canvas.
      const inX = cx + ((p[0] - cx) * (N.radius - N.post)) / N.radius;
      const inZ = cz + ((p[2] - cz) * (N.radius - N.post)) / N.radius;
      out.tent.blocks.push(post(inX, inZ, N.post, floor, floor + N.eave));
      out.tent.prisms.push(facet([apex, p, rim[(i + 1) % rim.length] as Vec3], N.canvas));
    });
  }
  // The queue's tent: posts at its corners and mid-sides, two slopes.
  const Q = F.queue;
  const [s0, s1] = [Q.s - Q.along / 2, Q.s + Q.along / 2];
  const [t0, t1] = [Q.t - Q.across / 2, Q.t + Q.across / 2];
  const inset = N.post / 2;
  for (const ss of [s0 + inset, Q.s, s1 - inset]) {
    for (const tt of [t0 + inset, t1 - inset]) {
      const [x, z] = fromDiagonals([ss, tt]);
      out.queue.blocks.push(post(x, z, N.post, floor, floor + N.eave));
    }
  }
  const pt = (ss: number, tt: number, y: number): Vec3 => {
    const [x, z] = fromDiagonals([ss, tt]);
    return [x, y, z];
  };
  const yE = floor + N.eave;
  const yR = floor + Q.ridge;
  out.queue.prisms.push(
    facet([pt(s0, t0, yE), pt(s1, t0, yE), pt(s1, Q.t, yR), pt(s0, Q.t, yR)], N.canvas),
    facet([pt(s0, Q.t, yR), pt(s1, Q.t, yR), pt(s1, t1, yE), pt(s0, t1, yE)], N.canvas),
  );
  return out;
}

/** The 2nd floor's covered gallery on the +z face: posts, balustrade, roof. */
function secondGalleryFace(): { posts: Block[]; roof: Prism[] } {
  const S = SECOND_GALLERY;
  const floor = FLOORS.second;
  const rOut = PLATFORMS.second.side / 2 - S.inset;
  const rIn = rOut - S.clear - S.post;
  const posts: Block[] = [];
  const line = (r: number, height: number): number[] => {
    // Posts every pitch, centred on the face, and one on the +a corner.
    const n = Math.floor((2 * r) / S.pitch);
    const along = [...Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * S.pitch), r];
    for (const a of along) posts.push(post(a, r, S.post, floor, floor + height));
    return along;
  };
  // A flag mast on every outer post's head (`SECOND_MAST`).
  for (const a of line(rOut, S.postHeight)) {
    posts.push(post(a, rOut, SECOND_MAST.size, floor + S.postHeight, floor + SECOND_MAST.top));
  }
  line(rIn, S.eave);
  posts.push(...railFace(SECOND_RAIL, rOut, rOut, floor, []));
  posts.push(onLine(-rOut, rOut, floor + S.eave, floor + S.postHeight, rOut, S.attic));
  // Two roof slopes, each a trapezoid mitred at the corners: the outer one
  // from behind the attic band, the inner one out past the inner posts.
  const eOut = rOut - S.attic / 2;
  const eIn = rIn - S.overhang;
  const mid = (rOut + rIn) / 2;
  const yE = floor + S.eave;
  const yR = floor + S.ridge;
  const roof: Prism[] = [
    // Counter-clockwise seen from above: normals up, so the slabs extrude upward.
    {
      outline: [
        [-eOut, yE, eOut],
        [eOut, yE, eOut],
        [mid, yR, mid],
        [-mid, yR, mid],
      ],
      depth: S.roof,
    },
    {
      outline: [
        [-mid, yR, mid],
        [mid, yR, mid],
        [eIn, yE, eIn],
        [-eIn, yE, eIn],
      ],
      depth: S.roof,
    },
  ];
  return { posts, roof };
}

/**
 * The void's edge on the +z face, from the diagonal at its -a end to the
 * diagonal at its +a end, as plan points (a, r) (see `VOID`); `off` moves
 * it that far onto the deck, square to itself.
 */
function voidOutline(off: number): [number, number][] {
  const V = VOID;
  const sag = V.half - V.apex;
  const R = (V.bowEnd ** 2 + sag ** 2) / (2 * sag);
  const rc = V.apex + R;
  const rr = R - off;
  const edge = V.half + off;
  const cut = V.chamfer + off * Math.SQRT2;
  const bow = Math.sqrt(rr * rr - (rc - edge) ** 2);
  const out: [number, number][] = [
    [-cut / 2, cut / 2],
    [-(cut - edge), edge],
  ];
  for (let i = 0; i <= V.bowSegments; i++) {
    const a = -bow + (2 * bow * i) / V.bowSegments;
    out.push([a, rc - Math.sqrt(rr * rr - a * a)]);
  }
  out.push([cut - edge, edge], [cut / 2, cut / 2]);
  return out;
}

/** The deck's edge at station a on the +z face, between the diagonals. */
function voidEdgeAt(a: number): number {
  const edge = voidOutline(0);
  for (let i = 0; i + 1 < edge.length; i++) {
    const [a0, r0] = edge[i] as [number, number];
    const [a1, r1] = edge[i + 1] as [number, number];
    if (a >= a0 && a <= a1) return r0 + ((r1 - r0) * (a - a0)) / (a1 - a0);
  }
  throw new Error(
    `voidEdgeAt: station a = ${a} lies beyond the face's diagonals; ` +
      `the void's edge runs over |a| <= ${edge[0]?.[1]}`,
  );
}

/**
 * The platform's slab on the +z face, from the void's edge out to the step
 * down to the gallery: a convex quad for each segment of the edge,
 * reaching out along the rays from the axis through its two ends, so the
 * four faces tile the ring and meet on the diagonals.
 */
function firstDeck(): Prism[] {
  const T = EDGE - GALLERY.width;
  const y0 = FLOORS.first - DECK;
  const edge = voidOutline(0);
  const out: Prism[] = [];
  for (let i = 0; i + 1 < edge.length; i++) {
    const [a0, r0] = edge[i] as [number, number];
    const [a1, r1] = edge[i + 1] as [number, number];
    const quad: [number, number][] = [
      [a0, r0],
      [a1, r1],
      [(a1 * T) / r1, T],
      [(a0 * T) / r0, T],
    ];
    let area = 0;
    for (let k = 0; k < quad.length; k++) {
      const [x0, z0] = quad[k] as [number, number];
      const [x1, z1] = quad[(k + 1) % quad.length] as [number, number];
      area += x0 * z1 - x1 * z0;
    }
    // Counter-clockwise seen from above, so it extrudes up.
    if (area > 0) quad.reverse();
    out.push({ outline: quad.map(([x, z]): Vec3 => [x, y0, z]), depth: DECK });
  }
  return out;
}

/**
 * A balustrade along a plan polyline (a, r) of the face frame, standing on
 * y0: its plinth and top rail along every segment, lapped half a rail at
 * the joints, and posts about `pitch` apart along each segment, at its end
 * but not its start, so the polyline's first point is left to the
 * neighbouring face (pinwheel fashion).
 */
function railAlong(
  spec: RailSpec,
  line: readonly (readonly [number, number])[],
  y0: number,
  pitch: number,
): Block[] {
  const top = y0 + spec.height;
  const out: Block[] = [];
  type Plan = readonly [number, number];
  const run = (p: Plan, q: Plan, ya: number, yb: number): Block => {
    const da = q[0] - p[0];
    const dr = q[1] - p[1];
    return {
      at: [(p[0] + q[0]) / 2, (ya + yb) / 2, (p[1] + q[1]) / 2],
      size: [Math.hypot(da, dr) + spec.rail, yb - ya, spec.rail],
      rot: turn(1, Math.atan2(-dr, da)),
    };
  };
  for (let i = 0; i + 1 < line.length; i++) {
    const p = line[i] as readonly [number, number];
    const q = line[i + 1] as readonly [number, number];
    out.push(run(p, q, y0, y0 + spec.plinth), run(p, q, top - spec.cap, top));
    const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / pitch));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push(post(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, spec.post, y0, top));
    }
  }
  return out;
}

/**
 * The terrace balustrade in the +z face's frame (see `TERRACE_RAIL`):
 * broken over the centre bay when `entrance`, else one run.
 */
function terraceRail(entrance: boolean): Block[] {
  const T = TERRACE_RAIL;
  const S = T.spec;
  // On the terrace's edge: its outer face flush with the step's.
  const r = EDGE - GALLERY.width - S.rail / 2;
  const y0 = FLOORS.first;
  const out: Block[] = [];
  // Broken over the flights, its end posts on the terrace beside them.
  const gap = ENTRANCE.outer + S.post / 2;
  const runs: ReadonlyArray<readonly [number, number]> = entrance
    ? [
        [-T.end, -gap],
        [gap, T.end],
      ]
    : [[-T.end, T.end]];
  for (const [lo, hi] of runs) {
    out.push(
      onLine(lo, hi, y0, y0 + S.plinth, r, S.rail),
      onLine(lo, hi, y0 + T.mid, y0 + T.mid + S.cap, r, S.rail),
      onLine(lo, hi, y0 + S.height - S.cap, y0 + S.height, r, S.rail),
    );
    const n = Math.round((hi - lo) / T.pitch);
    for (let k = 0; k <= n; k++) {
      out.push(post(lo + ((hi - lo) * k) / n, r, S.post, y0, y0 + S.height));
    }
  }
  return out;
}

/** The terrace's edge, the step's face: the platform stops 2.60 inside the column axis. */
const TERRACE_EDGE = EDGE - GALLERY.width;

/**
 * The deck cut away under the flights, in the face frame (a, r): per
 * flight a rectangle from the newel's line to the outer string, from the
 * back string to the terrace's edge (see `ENTRANCE`).
 */
function entranceNotches(): Array<readonly [number, number, number, number]> {
  const E = ENTRANCE;
  const [u0] = E.newel;
  return [1, -1].map((side) => {
    const [a0, a1] = side > 0 ? [u0, E.outer] : [-E.outer, -u0];
    return [a0, a1, TERRACE_EDGE + E.back, TERRACE_EDGE] as const;
  });
}

/**
 * Face-frame deck prisms (outlines at one y, extruded up) less rectangles
 * (a0, a1, r0, r1): each prism a rectangle overlaps is cut into the convex
 * pieces either side of it, and behind and before it.
 */
function cutNotches(
  list: readonly Prism[],
  notches: ReadonlyArray<readonly [number, number, number, number]>,
): Prism[] {
  const big = 1e3;
  let out = [...list];
  for (const [a0, a1, r0, r1] of notches) {
    const next: Prism[] = [];
    for (const p of out) {
      const y0 = (p.outline[0] as Vec3)[1];
      const plan = p.outline.map(([a, , r]): [number, number] => [a, r]);
      if (clipToBox(plan, a0 + 1e-9, a1 - 1e-9, r0 + 1e-9, r1 - 1e-9).length < 3) {
        next.push(p);
        continue;
      }
      for (const piece of [
        clipToBox(plan, -big, a0, -big, big),
        clipToBox(plan, a1, big, -big, big),
        clipToBox(plan, a0, a1, -big, r0),
        clipToBox(plan, a0, a1, r1, big),
      ]) {
        if (piece.length < 3 || Math.abs(signedArea(piece)) < 1e-6) continue;
        next.push(standing(piece, y0, y0 + p.depth));
      }
    }
    out = next;
  }
  return out;
}

/** Twice the signed area of a plan polygon (x, z): positive clockwise seen from above. */
function signedArea(pts: readonly (readonly [number, number])[]): number {
  let area = 0;
  for (let k = 0; k < pts.length; k++) {
    const [x0, z0] = pts[k] as readonly [number, number];
    const [x1, z1] = pts[(k + 1) % pts.length] as readonly [number, number];
    area += x0 * z1 - x1 * z0;
  }
  return area;
}

/**
 * A convex plan outline (a, r) of the face frame — or (x, z) of the plan,
 * the same thing on face 0 — as a prism from y0 up to y1.
 */
function standing(plan: readonly (readonly [number, number])[], y0: number, y1: number): Prism {
  const pts = plan.map(([a, r]): [number, number] => [a, r]);
  // Counter-clockwise seen from above, so it extrudes up.
  if (signedArea(pts) > 0) pts.reverse();
  return { outline: pts.map(([a, r]): Vec3 => [a, y0, r]), depth: y1 - y0 };
}

/**
 * The entrance flights on the +z face's frame (see `ENTRANCE`): the
 * treads as prisms, the landing, its girder and the balustrades as blocks.
 */
function entranceFace(): Record<"tread" | "post" | "rail" | "landing", Piece> {
  const E = ENTRANCE;
  const R = TERRACE_RAIL.spec;
  const g = GALLERY.floor;
  const rise = (FLOORS.first - g) / E.risers;
  const T = TERRACE_EDGE;
  const [nu, nv] = E.newel;
  const top = FLOORS.first + R.height;
  const out = parted("tread", "post", "rail", "landing");
  // Where a ray from the newel, `deg` below the face's line, leaves the
  // flight's square (by the outer string or the back string), as (u, v).
  const exit = (deg: number): [number, number] => {
    const th = (deg * Math.PI) / 180;
    const du = Math.cos(th);
    const dv = -Math.sin(th);
    const toOuter = du > 1e-9 ? (E.outer - nu) / du : Number.POSITIVE_INFINITY;
    const toBack = dv < -1e-9 ? (E.back - nv) / dv : Number.POSITIVE_INFINITY;
    const t = Math.min(toOuter, toBack);
    return [nu + du * t, nv + dv * t];
  };
  for (const side of [1, -1]) {
    const at = (u: number, v: number): [number, number] => [side * u, T + v];
    // The bottom steps, each reaching back to the next one's front.
    E.bottom.forEach(([u0, u1, front], i) => {
      const next = E.bottom[i + 1];
      const backV = next === undefined ? nv : next[2];
      out.tread.prisms.push(standing([at(u0, backV), at(u1, backV), at(u1, front), at(u0, front)], g, g + rise * (i + 1)));
    });
    // The winders, wedges about the newel between consecutive rays, each
    // taking in the square's corner where its two rays leave by different
    // strings.
    for (let i = 0; i + 1 < E.rays.length; i++) {
      const p = exit(E.rays[i] as number);
      const q = exit(E.rays[i + 1] as number);
      const plan: [number, number][] = [at(nu, nv), at(p[0], p[1])];
      const pOuter = Math.abs(p[0] - E.outer) < 1e-9;
      const qOuter = Math.abs(q[0] - E.outer) < 1e-9;
      if (pOuter && !qOuter) plan.push(at(E.outer, E.back));
      plan.push(at(q[0], q[1]));
      out.tread.prisms.push(standing(plan, g, g + rise * (E.bottom.length + i + 1)));
    }
    // The newel, and the post at the outer string's front corner.
    out.post.blocks.push(post(side * nu, T + nv, E.newelPost, g, top + E.newelProud));
    const frontTop = g + rise * E.bottom.length + R.height;
    out.post.blocks.push(post(side * E.outer, T + nv, R.post, g, frontTop));
    // The handrail raking up the outer string from that post to the
    // terrace balustrade's end post, the rail's height over the first
    // winder where it meets it; a hair short of both posts, whose faces
    // its square-cut ends would otherwise cross.
    const endPost = T - R.rail / 2;
    const meet = g + rise * (E.bottom.length + 1) + R.height;
    const hair = 0.02;
    out.rail.blocks.push(
      member(
        [side * E.outer, frontTop - R.cap / 2, T + nv - R.post / 2 - hair],
        [side * E.outer, meet - R.cap / 2, T + hair],
        R.cap,
      ),
    );
    // Level on the terrace, beside the outer string and behind the back
    // string, to the newel's line.
    const la = side * (E.outer + R.post / 2);
    const lr = T + E.back - R.post / 2;
    const y0 = FLOORS.first;
    for (const [lo, hi] of [
      [y0, y0 + R.plinth],
      [y0 + TERRACE_RAIL.mid, y0 + TERRACE_RAIL.mid + R.cap],
      [top - R.cap, top],
    ] as const) {
      out.rail.blocks.push(span(la - R.rail / 2, la + R.rail / 2, lo, hi, lr + R.rail / 2, endPost - R.post / 2));
      const [b0, b1] = side > 0 ? [nu, E.outer + R.post] : [-E.outer - R.post, -nu];
      out.rail.blocks.push(span(b0, b1, lo, hi, lr - R.rail / 2, lr + R.rail / 2));
    }
    out.rail.blocks.push(post(la, lr, R.post, y0, top), post((side * (nu + E.outer)) / 2, lr, R.post, y0, top));
  }
  // The landing between the newels, its front over the gallery, on its own
  // girder; and its balustrade.
  const edge = T + E.landing;
  const half = nu - E.newelPost / 2;
  out.landing.blocks.push(
    span(-half, half, FLOORS.first - DECK, FLOORS.first, T, edge),
    span(-half, half, g, FLOORS.first - DECK, edge - STEP.thickness, edge),
  );
  const rr = edge - R.rail / 2;
  const y0 = FLOORS.first;
  out.rail.blocks.push(
    onLine(-half, half, y0, y0 + R.plinth, rr, R.rail),
    onLine(-half, half, y0 + TERRACE_RAIL.mid, y0 + TERRACE_RAIL.mid + R.cap, rr, R.rail),
    onLine(-half, half, top - R.cap, top, rr, R.rail),
  );
  const n = Math.round((2 * half) / TERRACE_RAIL.pitch);
  for (let k = 1; k < n; k++) out.rail.blocks.push(post(-half + (2 * half * k) / n, rr, R.post, y0, top));
  return out;
}

/** The skirt plate's outer face at depth d below the gallery floor, as (y, r). */
function skirtAt(d: number): [number, number] {
  const y = GALLERY.floor - d;
  return [y, EDGE - (SKIRT.lean * (GALLERY.floor - DECK - y)) / SKIRT_DROP];
}

/**
 * A box lying on the skirt plate's outer face, `proud` thick, centred at a
 * and depth d: `len` along the face and `h` up the plate, or turned in the
 * plate's plane by `spin` from the a axis.
 */
function onSkirt(a: number, d: number, len: number, h: number, proud: number, spin = 0): Block {
  const [y, r] = skirtAt(d);
  return {
    at: [a, y + (SKIRT_OUT[0] * proud) / 2, r + (SKIRT_OUT[1] * proud) / 2],
    size: [len, h, proud],
    rot: qmul(turn(0, SKIRT_TILT), turn(2, spin)),
  };
}

/** A bar `w` wide on the skirt plate from (a0, depth d0) to (a1, depth d1). */
function acrossSkirt(
  a0: number,
  d0: number,
  a1: number,
  d1: number,
  w: number,
  proud: number,
): Block {
  const du = a1 - a0;
  const dv = ((d0 - d1) * SKIRT_LEN) / SKIRT_DROP;
  return onSkirt((a0 + a1) / 2, (d0 + d1) / 2, Math.hypot(du, dv), w, proud, Math.atan2(dv, du));
}

/**
 * A band `proud` off a planar strip of a skirt on the +z face, the strip
 * running from (y0, r0) down to (y1, r1): mitred at the corners as the
 * plate is, its outline on the band's outer face, extruded back onto the
 * plate.
 */
function skirtBand(y0: number, r0: number, y1: number, r1: number, proud: number): Prism {
  const len = Math.hypot(y1 - y0, r1 - r0);
  const ny = ((r1 - r0) / len) * proud;
  const nr = (-(y1 - y0) / len) * proud;
  const [Y0, R0, Y1, R1] = [y0 + ny, r0 + nr, y1 + ny, r1 + nr];
  return {
    // Clockwise seen from outside, so it extrudes inward.
    outline: [
      [-R0, Y0, R0],
      [R0, Y0, R0],
      [R1, Y1, R1],
      [-R1, Y1, R1],
    ],
    depth: proud,
  };
}

/**
 * A plate in the plane a = const, `w` thick about it, over a convex
 * outline given as (y, r) points: wound so it extrudes toward +a.
 */
function slab(a: number, w: number, outline: readonly (readonly [number, number])[]): Prism {
  let s = 0;
  for (let i = 0; i < outline.length; i++) {
    const [y0, r0] = outline[i] as readonly [number, number];
    const [y1, r1] = outline[(i + 1) % outline.length] as readonly [number, number];
    s += y0 * r1 - r0 * y1;
  }
  const ring = s < 0 ? [...outline].reverse() : outline;
  return { outline: ring.map(([y, r]): Vec3 => [a - w / 2, y, r]), depth: w };
}

/**
 * A console's profile as (y, r): from the face at (yTop, rTop) out
 * `reach` beyond it, then a quarter ellipse down and in to the face at
 * `foot`.
 */
function bracket(
  yTop: number,
  rTop: number,
  reach: number,
  foot: readonly [number, number],
  segments: number,
): [number, number][] {
  const [yF, rF] = foot;
  const out: [number, number][] = [[yTop, rTop]];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * (Math.PI / 2);
    out.push([yTop - (yTop - yF) * Math.sin(t), rF + (rTop + reach - rF) * Math.cos(t)]);
  }
  return out;
}

/** The 1st-floor skirt's ornament on the +z face (see `SKIRT_ORNAMENT`). */
function skirtOrnament(): Piece {
  const O = SKIRT_ORNAMENT;
  const C = O.console;
  const K = O.cresting;
  const P = O.pilaster;
  const pitch = NAMES.pitch;
  const n = Math.floor(EDGE / pitch);
  const up = SKIRT_LEN / SKIRT_DROP;
  const [yTop, rTop] = skirtAt(C.top);
  const prisms: Prism[] = [];
  const blocks: Block[] = [];
  for (let j = -n; j <= n; j++) {
    const a = j * pitch;
    prisms.push(slab(a, C.width, bracket(yTop, rTop, C.reach, skirtAt(C.foot), C.segments)));
    blocks.push(onSkirt(a, (P.top + P.bottom) / 2, P.width, (P.bottom - P.top) * up, P.proud));
    if (j === n) continue;
    // The name's plaque in the console bay from here to the next.
    blocks.push(namePlaque(a + pitch / 2));
    // The cresting in the console bay from here to the next: its rail, and
    // under it a diamond lattice panel, a diamond over each.
    blocks.push(onSkirt(a + pitch / 2, K.rail, pitch, K.bar, K.proud));
    const w = pitch / K.panels;
    for (let i = 0; i < K.panels; i++) {
      const u = a + (i + 0.5) * w;
      blocks.push(
        acrossSkirt(u - w / 2, K.bottom, u + w / 2, K.rail, K.bar, K.proud),
        acrossSkirt(u + w / 2, K.bottom, u - w / 2, K.rail, K.bar, K.proud),
        onSkirt(u, (K.top + K.rail) / 2, K.diamond, K.diamond, K.proud, Math.PI / 4),
      );
    }
  }
  for (const [d0, d1, proud] of O.mouldings) {
    const [y0, r0] = skirtAt(d0);
    const [y1, r1] = skirtAt(d1);
    prisms.push(skirtBand(y0, r0, y1, r1, proud));
  }
  return { prisms, blocks };
}

/**
 * The pedestals (`PEDESTAL`, SOURCES.md §24, §31.2; tags as in the file
 * comment): a hollow masonry skirt round each leg's foot, its block,
 * cornice and gorge as PL-V draws them and its inner corner on an arc,
 * its top only where the uprights come out of it. Each tier's faces (the
 * four sides, battered or upright, and the corner's arc) and the ring
 * between one tier and the next (a
 * tread where the tier above steps back, a soffit under the cornice's
 * projection) are plates extruded into the masonry, `shell` thick or less:
 * never so thick that they reach the HOLE the leg stands in, the leg's own
 * footprint at every height (its uprights' outer faces, which lean out
 * toward the ground) plus `margin`. A leaning upright's horizontal section
 * is wider than its square one: `lean` times its half-width [measured on
 * the cooked skin at the supports: 0.542 across x and 0.459 across z for
 * the 0.41 upright, 1.32 and 1.12 times]. At the top a coping ring closes the
 * skirt onto that hole. So the uprights, the base ties, the central posts
 * and everything in the leg's interior (the lift tracks' feet, the ground
 * stair's start) rise out of the skirt without passing through masonry,
 * as PL-VII draws the ties inside it; and the arch's pier stands in front
 * of the inner faces, touching them only at the ground (38.17, the pier
 * base's back face) [derived]. The shell is 0.20: the cast facing was
 * about 0.15 [sourced p. 95], and a thicker skirt reaches the supports'
 * stones inside it (`SUPPORT` in ground.ts).
 */
const PEDESTAL_SKIRT = { shell: 0.2, margin: 0.03, coping: 0.05, lean: 1.33 } as const;

/** Wound so a planar outline's normal (Newell's) points along `into`: it then extrudes that way. */
function towards(outline: readonly Vec3[], into: Vec3): Vec3[] {
  const n = [0, 0, 0];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0, z0] = outline[i] as Vec3;
    const [x1, y1, z1] = outline[(i + 1) % outline.length] as Vec3;
    n[0] += (y0 - y1) * (z0 + z1);
    n[1] += (z0 - z1) * (x0 + x1);
    n[2] += (x0 - x1) * (y0 + y1);
  }
  const along = n[0]! * into[0] + n[1]! * into[1] + n[2]! * into[2] > 0;
  return along ? [...outline] : [...outline].reverse();
}

/** Drop consecutive repeats (and a closing repeat) from an outline. */
function distinct(outline: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of outline) {
    const q = out[out.length - 1];
    if (q === undefined || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-6) out.push(p);
  }
  while (out.length > 1) {
    const [a, b] = [out[0] as Vec3, out[out.length - 1] as Vec3];
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 1e-6) break;
    out.pop();
  }
  return out;
}

/**
 * A pedestal's plan at height y, as a closed loop in the +x +z quadrant:
 * the square [i, o]² (x and z both from the inner faces, i, to the outer,
 * o) with its inner corner turned on an arc about (c, c), of radius c − i
 * (`PEDESTAL.corner`). Every loop has the same points in the same order —
 * the arc's end on the z = i face, the three square corners, the arc's end
 * on the x = i face, then the arc — so two loops' corresponding edges
 * bound one face, or one piece of the ring between them. With c = i the
 * arc closes to the square's corner (the hole's loop).
 */
function planLoop(i: number, o: number, y: number, c: number): Vec3[] {
  const n = PEDESTAL.corner.segments;
  const r = c - i;
  const loop: Vec3[] = [
    [c, y, i],
    [o, y, i],
    [o, y, o],
    [i, y, o],
    [i, y, c],
  ];
  for (let k = 1; k < n; k++) {
    const a = Math.PI + (k / n) * (Math.PI / 2);
    loop.push([c + r * Math.cos(a), y, c + r * Math.sin(a)]);
  }
  return loop;
}

/** The arc's centre, on both axes: 3.29 in from the inner faces' foot. */
const CORNER_C = PEDESTAL.innerFoot + PEDESTAL.corner.radius;

/**
 * Edge k of a loop (to its next point): its horizontal normal INTO the
 * pedestal's body, toward the leg's hole, and a point on it.
 */
function edgeInto(loop: readonly Vec3[], k: number): { into: Vec3; at: Vec3 } {
  const a = loop[k] as Vec3;
  const b = loop[(k + 1) % loop.length] as Vec3;
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const l = Math.hypot(dx, dz);
  let into: Vec3 = [dz / l, 0, -dx / l];
  // Toward the leg, whose centre is inside every loop.
  const m = (PEDESTAL.innerFoot + PEDESTAL.outer) / 2;
  if (into[0] * (m - a[0]) + into[2] * (m - a[2]) < 0) into = [-into[0], 0, -into[2]];
  return { into, at: a };
}

/**
 * How far the line of a loop's edge k stands from the hole [hi, ho]², along
 * its `into`: the hole is convex, so its nearest point along a direction is
 * one of its corners.
 */
function roomTo(loop: readonly Vec3[], k: number, hole: readonly [number, number]): number {
  const { into, at } = edgeInto(loop, k);
  const [hi, ho] = hole;
  let best = Infinity;
  for (const x of [hi, ho]) {
    for (const z of [hi, ho]) best = Math.min(best, into[0] * (x - at[0]) + into[2] * (z - at[2]));
  }
  return best;
}

/**
 * The ring between two loops at one height, `outer` round `inner`, as one
 * convex piece per pair of corresponding edges (a trapezoid, or a triangle
 * where the inner loop's arc has closed to a point); pieces narrower than
 * a millimetre are left out.
 */
function loopRing(outer: readonly Vec3[], inner: readonly Vec3[]): Vec3[][] {
  const out: Vec3[][] = [];
  for (let k = 0; k < outer.length; k++) {
    const j = (k + 1) % outer.length;
    const [a0, a1, b0, b1] = [outer[k], outer[j], inner[k], inner[j]] as Vec3[];
    const w = Math.max(Math.hypot(a0[0] - b0[0], a0[2] - b0[2]), Math.hypot(a1[0] - b1[0], a1[2] - b1[2]));
    if (w <= 1e-3) continue;
    const piece = distinct([a0, a1, b1, b0]);
    if (piece.length >= 3) out.push(piece);
  }
  return out;
}

/**
 * One pedestal, in the +x +z quadrant (see `PEDESTAL_SKIRT`): per tier its
 * faces between its foot's and its head's loops (four straight faces and
 * the inner corner's arc), then the rings between tiers, then the coping.
 */
export function pedestalFaces(): Prism[] {
  const { shell, margin, coping, lean } = PEDESTAL_SKIRT;
  const tiers = PEDESTAL.tiers;
  // The hole: the leg's footprint at y, out to its uprights' outer faces.
  const hole = (y: number): [number, number] => {
    const { inner, outer } = profileAt(y);
    const w = uprightAt(y) * lean + margin;
    return [inner - w, outer + w];
  };
  const out: Prism[] = [];
  for (const t of tiers) {
    const foot = planLoop(t.inner[0], t.outer[0], t.y0, CORNER_C);
    const head = planLoop(t.inner[1], t.outer[1], t.y1, CORNER_C);
    for (let k = 0; k < foot.length; k++) {
      const j = (k + 1) % foot.length;
      // Its depth: the least room between it and the hole, over its height.
      const space = Math.min(roomTo(foot, k, hole(t.y0)), roomTo(head, k, hole(t.y1)));
      const depth = Math.min(shell, space - 0.02);
      if (!(depth > 0.01)) {
        throw new Error(
          `platforms.ts pedestalFaces: the tier ${t.y0}-${t.y1} leaves ${space.toFixed(3)} m between its face ${k} and the leg's uprights; ` +
            "move that tier's face out in PEDESTAL.tiers (spec.ts), or the skirt reaches into the leg",
        );
      }
      const f = distinct([foot[k] as Vec3, foot[j] as Vec3, head[j] as Vec3, head[k] as Vec3]);
      if (f.length >= 3) out.push({ outline: towards(f, edgeInto(foot, k).into), depth });
    }
  }
  // Between tiers: a tread where the one above steps back (into the tier
  // below), a soffit where it projects (into the tier above).
  for (let k = 0; k + 1 < tiers.length; k++) {
    const lo = tiers[k] as (typeof tiers)[number];
    const hi = tiers[k + 1] as (typeof tiers)[number];
    const y = lo.y1;
    const [li, lo1] = [lo.inner[1], lo.outer[1]];
    const [ui, uo] = [hi.inner[0], hi.outer[0]];
    const tread = ui >= li && uo <= lo1;
    const soffit = ui <= li && uo >= lo1;
    if (!tread && !soffit) {
      throw new Error(
        `platforms.ts pedestalFaces: the tiers meeting at ${y} neither step back nor project on both faces; ` +
          "make PEDESTAL.tiers (spec.ts) nest there",
      );
    }
    const lower = planLoop(li, lo1, y, CORNER_C);
    const upper = planLoop(ui, uo, y, CORNER_C);
    const ring = tread ? loopRing(lower, upper) : loopRing(upper, lower);
    if (ring.length === 0) continue;
    // A tread hangs down into the tier below, where the uprights lean
    // further out: it stops 0.02 short of the height at which the hole
    // reaches its inner edge.
    let depth = Math.min(shell, tread ? lo.y1 - lo.y0 : hi.y1 - hi.y0);
    if (tread) {
      for (let d = 0.01; d <= depth; d += 0.01) {
        const h = hole(y - d);
        if (upper.some((_, e) => roomTo(upper, e, h) < 0.02)) {
          depth = d - 0.02;
          break;
        }
      }
    }
    if (!(depth > 0.01)) {
      throw new Error(
        `platforms.ts pedestalFaces: the tread at ${y} has no room above the leg's uprights; ` +
          "move the tier above it out in PEDESTAL.tiers (spec.ts)",
      );
    }
    for (const f of ring) out.push({ outline: towards(f, [0, tread ? -1 : 1, 0]), depth });
  }
  // The coping: the top tier's head closed onto the hole.
  const top = tiers[tiers.length - 1] as (typeof tiers)[number];
  const [hi, ho] = hole(top.y1 - coping);
  const head = planLoop(top.inner[1], top.outer[1], top.y1, CORNER_C);
  for (const f of loopRing(head, planLoop(hi, ho, top.y1, hi))) {
    out.push({ outline: towards(f, [0, -1, 0]), depth: coping });
  }
  return out;
}

/**
 * The pedestals' dressing (SOURCES.md §31.2; `PEDESTAL`): the cast
 * artificial stone « à gros bossages » on the battered block, the bench
 * and its sill round the inner corner, and the doors' grilles.
 *
 * - THE COURSES [sourced drawing PL-V Fig. 15; measured at 58.4 and 104
 *   px/m]: a plain base course, then two courses of rusticated blocks,
 *   « 0.717 / 0.681 / 0.681 » over the plinth's 2.08; the blocks' faces
 *   0.50 high [measured 0.43-0.53] at 0.87-1.39 and 1.52-2.04 over the
 *   plinth's foot, here scaled to the model's 2.00 block; 1.53 long with
 *   0.15 joints, the courses staggered, the end blocks at the outer
 *   corners about 0.98 on the lower course and 1.40 on the upper; 0.06
 *   proud [measured 0.05-0.08]. On the inner faces they are cut back to
 *   the arch's two piers (`archPierBases`), the door and the curved
 *   corner, as Fig. 16 draws them.
 * - THE DOORS, one on each inner face, « 2.58 » clear on the leg's centre
 *   line [sourced PL-V Fig. 16] with an iron grille [sourced]: the grille
 *   is drawn as a plate 0.02 proud over the block, 1.90 high [estimated].
 * - THE BENCH round the curved corner: its front on the « Banc » line,
 *   the arc's 3.29, its sill « 0.70 » wide × « 0.10 » in front of it, its
 *   seat « 0.48 » over the sill [sourced PL-V Figs 12, 19], run back 0.45
 *   under the battered face, which stands for the concave back that
 *   sweeps into the plinth [estimated]; between the two near piers, whose
 *   bases reach 0.13 past the arc's ends.
 */
export const PEDESTAL_DRESS = {
  /** Each rusticated course's block faces' foot over the block's (the lower, the upper). */
  rows: [0.84, 1.46],
  /** The end block at the outer corners, each course's [measured PL-V Fig. 15]. */
  ends: [0.98, 1.4],
  /** The shortest block a cut leaves [estimated]. */
  least: 0.3,
  block: { length: 1.53, joint: 0.15, high: 0.5, relief: 0.06 },
  door: { clear: 2.58, high: 1.9, relief: 0.02, at: 50.704 },
  /** Clear left round a pier's base and a door by the blocks. */
  keepOff: 0.1,
  /** `lip`: how far each runs back under the battered face, so no slot shows behind it. */
  sill: { wide: 0.7, high: 0.1, lip: 0.05 },
  seat: { over: 0.48, deep: 0, lip: 0.45 },
} as const;

/** The battered block's face at height y, along the tier-0 batter: out from the axis. */
function blockFace(side: "inner" | "outer", y: number): number {
  const t = PEDESTAL.tiers[0] as (typeof PEDESTAL.tiers)[number];
  const [a, b] = t[side];
  return a + ((b - a) * (y - t.y0)) / (t.y1 - t.y0);
}

/** A face of the +x +z pedestal's battered block: which axis it faces along, and which side. */
export type BlockFace = "x-outer" | "z-outer" | "x-inner" | "z-inner";

/**
 * One block on the battered face `face` of the +x +z pedestal, from `s0` to
 * `s1` along it and `y0` to `y1` up it, standing `relief` proud: a planar
 * rectangle in the face, extruded outward.
 */
function onBlockFace(face: BlockFace, s0: number, s1: number, y0: number, y1: number, relief: number): Prism {
  const inner = face.endsWith("inner");
  const r = (y: number) => blockFace(inner ? "inner" : "outer", y);
  const onX = face.startsWith("x");
  const p = (s: number, y: number): Vec3 => (onX ? [r(y), y, s] : [s, y, r(y)]);
  // Outward: away from the leg, +x / +z on an outer face, −x / −z on an inner one.
  const sign = inner ? -1 : 1;
  const out: Vec3 = onX ? [sign, 0, 0] : [0, 0, sign];
  return { outline: towards([p(s0, y0), p(s1, y0), p(s1, y1), p(s0, y1)], out), depth: relief };
}

/**
 * Everything on the pedestals' faces, one pedestal in the +x +z quadrant,
 * by class, with each block's face and its span along it (for the tests).
 */
export function pedestalDressing(): {
  masonry: Prism[];
  platforms: Prism[];
  blocks: Array<{ face: BlockFace; s0: number; s1: number; y0: number; y1: number }>;
} {
  const D = PEDESTAL_DRESS;
  const { length, joint, high, relief } = D.block;
  const pitch = length + joint;
  const masonry: Prism[] = [];
  const platforms: Prism[] = [];
  const blocks: Array<{ face: BlockFace; s0: number; s1: number; y0: number; y1: number }> = [];
  // What the blocks keep off on each inner face, as intervals along it:
  // the piers (the +z face's at its +x end for the x-inner face, the same
  // mirrored for the z-inner), the door, and the curved corner.
  const piers = archPierBases().filter((b) => b.x > 0);
  const keep: Array<readonly [number, number]> = [
    ...piers.map((b): readonly [number, number] => [b.z - b.side / 2 - D.keepOff, b.z + b.side / 2 + D.keepOff]),
    [D.door.at - D.door.clear / 2 - D.keepOff, D.door.at + D.door.clear / 2 + D.keepOff],
    [-Infinity, CORNER_C + D.keepOff],
  ];
  const faces: readonly BlockFace[] = ["x-outer", "z-outer", "x-inner", "z-inner"];
  const put = (face: BlockFace, s0: number, s1: number, y0: number, y1: number) => {
    masonry.push(onBlockFace(face, s0, s1, y0, y1, relief));
    blocks.push({ face, s0, s1, y0, y1 });
  };
  for (const face of faces) {
    const inner = face.endsWith("inner");
    D.rows.forEach((y0, row) => {
      const y1 = y0 + high;
      // The face's extent along itself at the block's top, where the
      // batter makes it narrowest: between the other faces' planes there.
      const lo = blockFace("inner", y1);
      const hi = blockFace("outer", y1);
      // From the outer corner, its end block, then whole blocks toward the
      // inner faces; on an inner face each block is cut back to what the
      // piers, the door and the corner leave of it, down to `least`.
      const end = D.ends[row] as number;
      let [a, b] = [hi - end, hi];
      while (a >= lo + joint) {
        let pieces: Array<readonly [number, number]> = [[a, b]];
        if (inner) {
          for (const [k0, k1] of keep) {
            pieces = pieces.flatMap(([p0, p1]): Array<readonly [number, number]> =>
              k1 <= p0 || k0 >= p1
                ? [[p0, p1]]
                : ([[p0, Math.min(p1, k0)], [Math.max(p0, k1), p1]] as Array<readonly [number, number]>).filter(([q0, q1]) => q1 - q0 > 0),
            );
          }
        }
        for (const [p0, p1] of pieces) if (p1 - p0 >= D.least) put(face, p0, p1, y0, y1);
        b = a - joint;
        a = b - length;
      }
    });
    // The door's grille, on the inner faces.
    if (inner) {
      const { clear, high: h, relief: r, at } = D.door;
      platforms.push(onBlockFace(face, at - clear / 2, at + clear / 2, 0.05, 0.05 + h, r));
    }
  }
  // The bench round the curved corner: the sill, and the seat on it, as
  // arc pieces between radii about the corner's centre. It runs between
  // the two near piers, whose bases reach a little past the arc's ends.
  const R = PEDESTAL.corner.radius;
  const n = PEDESTAL.corner.segments;
  const { sill, seat } = D;
  const near = Math.min(...piers.map((b) => b.z - b.side / 2));
  const past = Math.max(0, CORNER_C - (near - 0.02));
  const skip = Math.asin(Math.min(1, past / (R + sill.wide)));
  const span = Math.PI / 2 - 2 * skip;
  const arcPiece = (r0: number, r1: number, y0: number, y1: number, k: number): Prism => {
    const a0 = Math.PI + skip + (k / n) * span;
    const a1 = Math.PI + skip + ((k + 1) / n) * span;
    const q = (r: number, a: number): Vec3 => [CORNER_C + r * Math.cos(a), y0, CORNER_C + r * Math.sin(a)];
    return { outline: towards([q(r0, a0), q(r1, a0), q(r1, a1), q(r0, a1)], [0, 1, 0]), depth: y1 - y0 };
  };
  for (let k = 0; k < n; k++) {
    masonry.push(arcPiece(R - sill.lip, R + sill.wide, 0, sill.high, k));
    masonry.push(arcPiece(R - seat.lip, R + seat.deep, sill.high, sill.high + seat.over, k));
  }
  return { masonry, platforms, blocks };
}

/**
 * The inner grande poutre's chord and post half-widths, square
 * (`firstFloor.ts`; PL-VII "800", "168").
 */
const GIRDER_CHORD = 0.4;
const GIRDER_POST = 0.084;
/** Clearance kept off the girder's faces. */
const GIRDER_GAP = 0.02;

/**
 * The consoles under the inner balcony on the +z face, and the edge girder
 * of its cut corner at the +a end (see `BALCONY`). Each console lies in
 * the plane a = const of one of the inner grande poutre's posts: a top bar
 * under the deck from the girder's top chord to the deck's edge, a post at
 * the tip, the flange a concave quarter ellipse from the tip's foot, level
 * there, running down into the post's face 3.73 under the floor [sourced
 * drawing], and a web of two posts and a diagonal. The girder leans with
 * the legs, so its faces are found square to it at each height.
 */
function balconyFace(): Block[] {
  const B = BALCONY;
  const inner = (y: number) => profileAt(y).inner;
  // The girder's horizontal half-depth at y: its half-width over the cosine of its lean.
  const across = (y: number, half: number) => half * Math.hypot(1, inner(y + 0.5) - inner(y - 0.5));
  const yTop = FLOORS.first - B.drop;
  const yTip = yTop - B.tip;
  const yFoot = FLOORS.first - B.foot;
  const yBar = yTop - B.bar / 2;
  const out: Block[] = [];
  const flange = (p: Vec3, q: Vec3): Block => {
    const b = member(p, q, B.width);
    return { ...b, size: [B.width, B.flange, b.size[2]] };
  };
  for (const at of B.at) {
    for (const a of at === 0 ? [0] : [-at, at]) {
      const rChord = inner(yBar) - across(yBar, GIRDER_CHORD) - GIRDER_GAP;
      const face = (y: number) => inner(y) - across(y, GIRDER_POST) - GIRDER_GAP;
      const rTip = voidEdgeAt(a) + B.setback;
      // Concave, as drawn: level at the tip and running down into the
      // leaning post along its face — a quadratic whose control point is
      // where the tip's level meets that face, so it never crosses it.
      const p0: [number, number] = [yTip, rTip];
      const p1: [number, number] = [yTip, face(yTip) - B.flange / 2];
      const p2: [number, number] = [yFoot, face(yFoot) - B.flange / 2];
      const node = (i: number): Vec3 => {
        const s = i / B.segments;
        const [u, v, w] = [(1 - s) ** 2, 2 * s * (1 - s), s * s];
        return [a, u * p0[0] + v * p1[0] + w * p2[0], u * p0[1] + v * p1[1] + w * p2[1]];
      };
      out.push(member([a, yBar, rChord], [a, yBar, rTip], B.bar));
      out.push(member([a, yTip, rTip], [a, yTop - B.bar, rTip], B.bar));
      for (let i = 0; i < B.segments; i++) out.push(flange(node(i), node(i + 1)));
      // The web: posts up from the flange's nodes that stand clear of the
      // chord, and a diagonal from the last of them to the chord's face.
      const web = Array.from({ length: B.segments }, (_, i) => node(i)).filter(
        (p, i) => i > 0 && p[2] < rChord - B.bar,
      );
      for (const p of web) out.push(member(p, [a, yTop - B.bar, p[2]], B.bar));
      const last = web[web.length - 1];
      if (last !== undefined) out.push(member(last, [a, yTop - B.bar, rChord - B.bar / 2], B.bar));
    }
  }
  // The cut corner's edge girder, post 7.765 of this face's inner girder to
  // the same post of the next face's, just inside the deck's edge, its
  // square ends kept off the girders' faces.
  const g = inner(FLOORS.first - DECK) - across(FLOORS.first - DECK, GIRDER_CHORD) - GIRDER_GAP;
  const c = VOID.chamfer / 2 + B.edge.width / Math.SQRT2 / 2;
  const len = 2 * Math.SQRT2 * (g - c) - B.edge.width;
  out.push({
    at: [c, FLOORS.first - DECK - B.edge.depth / 2, c],
    size: [len, B.edge.depth, B.edge.width],
    rot: turn(1, Math.PI / 4),
  });
  return out;
}

/**
 * The 2nd-floor skirt's panelling on the +z face (see
 * `SECOND_SKIRT_RELIEF`): the ribs follow the plate's profile strip by
 * strip, each box square to its strip; the consoles are plates in their
 * ribs' planes; the bands are mitred as the plate is.
 */
function secondSkirtRelief(): Piece {
  const S = SECOND_SKIRT_RELIEF;
  const P = SECOND_SKIRT.profile;
  const floor = FLOORS.second;
  // The plate's half-width at depth d below the floor, and the strip it lies on.
  const strip = (d: number): number => {
    for (let i = 0; i + 1 < P.length; i++) {
      if (d <= (P[i + 1] as readonly [number, number])[0]) return i;
    }
    return P.length - 2;
  };
  const widthAt = (d: number): number => {
    const i = strip(d);
    const [d0, w0] = P[i] as readonly [number, number];
    const [d1, w1] = P[i + 1] as readonly [number, number];
    return w0 + ((w1 - w0) * (d - d0)) / (d1 - d0);
  };
  const rOut = PLATFORMS.second.side / 2 - SECOND_GALLERY.inset;
  const n = Math.floor((2 * rOut) / SECOND_GALLERY.pitch);
  const ribs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * SECOND_GALLERY.pitch);
  const blocks: Block[] = [];
  const prisms: Prism[] = [];
  // A box on the plate from depth d0 to d1 (within one strip) at a, `w` wide, `proud` off it.
  const onPlate = (a: number, d0: number, d1: number, w: number, proud: number): Block => {
    const p: Vec3 = [a, floor - d0, widthAt(d0)];
    const q: Vec3 = [a, floor - d1, widthAt(d1)];
    const b = member(p, q, w);
    const dy = q[1] - p[1];
    const dr = q[2] - p[2];
    const len = Math.hypot(dy, dr);
    const [ny, nr] = [(dr / len) * (proud / 2), (-dy / len) * (proud / 2)];
    return { ...b, at: [a, b.at[1] + ny, b.at[2] + nr], size: [w, proud, len] };
  };
  // Cuts of [from, to] at the profile's kinks, so every box lies on one strip.
  const cuts = (from: number, to: number): [number, number][] => {
    const ds = [from, ...P.map((p) => p[0]).filter((d) => d > from && d < to), to];
    return ds.slice(1).map((d, i) => [ds[i] as number, d]);
  };
  const C = S.console;
  const foot: [number, number] = [floor - C.foot, widthAt(C.foot)];
  const skirtFoot = (P[P.length - 1] as readonly [number, number])[0];
  for (const a of ribs) {
    for (const [d0, d1] of cuts(DECK, skirtFoot)) {
      blocks.push(onPlate(a, d0, d1, S.rib, S.ribProud));
    }
    const profile = bracket(floor - DECK, widthAt(DECK), C.reach, foot, C.segments);
    prisms.push(slab(a, C.width, profile));
  }
  for (let i = 0; i + 1 < ribs.length; i++) {
    for (let m = 1; m <= S.muntins; m++) {
      const a = (ribs[i] as number) + (SECOND_GALLERY.pitch * m) / (S.muntins + 1);
      for (const [d0, d1] of cuts(S.panelTop, S.panelFoot)) {
        blocks.push(onPlate(a, d0, d1, S.muntin, S.muntinProud));
      }
    }
  }
  for (const [d0, d1, proud] of S.bands) {
    prisms.push(skirtBand(floor - d0, widthAt(d0), floor - d1, widthAt(d1), proud));
  }
  return { prisms, blocks };
}

/**
 * The fit-out that has no plate of its own to be read against — the inner
 * arcade, the entrance flights and the 2nd platform's 1889 massing — as
 * world solids, by piece, the same lists `buildPlatforms` cooks: every box
 * as its prism (`blockPrism`), each an outline extruded `depth` along its
 * own normal. For inspection: the graph never reads it.
 */
export function fitOutSolids(): Record<string, { outline: readonly Vec3[]; depth: number }[]> {
  const out: Record<string, Prism[]> = {};
  // A name met twice (a piece on two sets of faces) gathers both.
  const add = (prefix: string, part: Parted, faces: readonly number[] | null) => {
    for (const [name, piece] of Object.entries(part)) {
      const list = faces === null ? piece.prisms : allFacesPrisms(piece.prisms, faces);
      const boxes = faces === null ? piece.blocks : allFaces(piece.blocks, faces);
      const key = `${prefix}.${name}`;
      out[key] = [...(out[key] ?? []), ...list, ...boxes.map(blockPrism)];
    }
  };
  add("inner", innerArcadeFace(), [0, 1, 2, 3]);
  add("entrance", entranceFace(), TERRACE_RAIL.entrance);
  add("second", secondFitOut(), null);
  for (const { prefix, part, faces } of pavilionParts()) add(prefix, part, faces);
  add("arcade", arcadeDressFace().part, [0, 1, 2, 3]);
  return out;
}

/**
 * Build the platforms, their 1889 fit-out and the pedestals. `quads` are
 * the four quadrant targets.
 */
export function buildPlatforms(g: Graph, quads: NodeHandle): Parts {
  // The 1st floor: the platform (`firstDeck`, among the prisms), and the
  // gallery ring 1.23 m lower (`ringSide`, among the blocks), closed
  // between them by the step's girder.
  const terrace = EDGE - GALLERY.width;
  const step = span(
    -terrace,
    terrace - STEP.thickness,
    GALLERY.floor,
    FLOORS.first - DECK,
    terrace - STEP.thickness,
    terrace,
  );
  // On the Français and the Russe the step is cut where the flights come
  // up through it (see `ENTRANCE`).
  const [newel] = ENTRANCE.newel;
  const stepCut = [
    span(-terrace, -ENTRANCE.outer, GALLERY.floor, FLOORS.first - DECK, terrace - STEP.thickness, terrace),
    span(-newel, newel, GALLERY.floor, FLOORS.first - DECK, terrace - STEP.thickness, terrace),
    span(ENTRANCE.outer, terrace - STEP.thickness, GALLERY.floor, FLOORS.first - DECK, terrace - STEP.thickness, terrace),
  ];

  // The masonry class carries no normals: the page computes them.
  const pedestalDress = pedestalDressing();
  const pedestal = prisms(g, "pedestal", [...pedestalFaces(), ...pedestalDress.masonry], false);
  // The doors' grilles are iron, painted with the fit-out.
  const grilles = copyToQuadrants(g, "pedestalGrilles", prisms(g, "pedestalGrille", pedestalDress.platforms), quads, ["normal"]);

  // The fit-out, face by face. The pavilions' shell is one, less the
  // Français' staff front, which the other three have as a timber screen
  // (`pavilionParts`); each is found on its face by name.
  const staffFaces = [PAVILION_FACE.francais];
  const timberFaces = [PAVILION_FACE.flamand, PAVILION_FACE.anglo, PAVILION_FACE.russe];
  const staffShell = pavilionFace(true);
  const timberShell = pavilionFace(false);
  const second = secondGalleryFace();
  const ornament = skirtOrnament();
  const panelling = secondSkirtRelief();
  const bays: Piece = { prisms: [], blocks: [] };
  const trellis: Block[] = [];
  for (let k = -4; k <= 4; k++) {
    trellis.push(...lunetteTrellis(bayCentre(k)));
    if (Math.abs(k) <= 1) continue;
    const roof = bayRoof(bayCentre(k), EDGE, GALLERY.depth);
    bays.prisms.push(...roof.prisms);
    bays.blocks.push(...roof.blocks);
  }
  const skirt: Prism = {
    // Clockwise seen from outside, so the panel extrudes inward.
    outline: [
      [-EDGE, GALLERY.floor - DECK, EDGE],
      [EDGE, GALLERY.floor - DECK, EDGE],
      [EDGE - SKIRT.lean, SKIRT.bottom, EDGE - SKIRT.lean],
      [-(EDGE - SKIRT.lean), SKIRT.bottom, EDGE - SKIRT.lean],
    ],
    depth: SKIRT.thickness,
  };
  // The void's railing stands just inside the platform's edge, along it.
  const voidLine = voidOutline(GALLERY_RAIL.post / 2);
  const voidRail = railAlong(GALLERY_RAIL, voidLine, FLOORS.first, GALLERY_RAIL_PITCH);
  const galleryPosts: number[] = [];
  for (let k = -4; k <= 4; k++) {
    galleryPosts.push(bayCentre(k) - GALLERY_RAIL_PITCH, bayCentre(k) + GALLERY_RAIL_PITCH);
  }
  const galleryRail = railFace(GALLERY_RAIL, EDGE, EDGE, GALLERY.floor, galleryPosts);

  // The glass the frames leave open (`glazing`), and the crescents' sills.
  const glazed = glazing();
  const fitBlocks = blocks(
    g,
    "fitOut",
    allFaces([
      ...arcadeFace(),
      ...trellis,
      ...bays.blocks,
      ...galleryRail,
      ...voidRail,
      ...ornament.blocks,
      ...crossGirders(),
      ...balconyFace(),
      ...second.posts,
      ...panelling.blocks,
      ...consolesFace(),
      ringSide(terrace, EDGE + GALLERY.gutter, GALLERY.floor),
    ]).concat(
      allFaces(terraceRail(true), TERRACE_RAIL.entrance),
      allFaces(terraceRail(false), TERRACE_RAIL.closed),
      allFaces(stepCut, TERRACE_RAIL.entrance),
      allFaces([step], TERRACE_RAIL.closed),
      allFaces(staffShell.walls, staffFaces),
      allFaces(timberShell.walls, timberFaces),
      landingBlocks(),
      glazed.sills,
    ),
  );
  // The inner arcade, all round; the entrance flights, on the Français and
  // the Russe; and the 2nd platform's 1889 massing, whole.
  const inner = merged(innerArcadeFace());
  const flights = merged(entranceFace());
  const secondFit = merged(secondFitOut());
  const fitInner = [
    blocks(g, "innerArcade", allFaces(inner.blocks)),
    prisms(g, "innerArcadeCurved", allFacesPrisms(inner.prisms)),
  ];
  const fitFlights = [
    blocks(g, "entranceRails", allFaces(flights.blocks, TERRACE_RAIL.entrance)),
    prisms(g, "entranceFlights", allFacesPrisms(flights.prisms, TERRACE_RAIL.entrance)),
  ];
  const fitSecond = [blocks(g, "secondFitOut", secondFit.blocks), prisms(g, "secondFitOutCurved", secondFit.prisms)];
  // The pavilions' frame and dressing, each piece on its own face(s).
  const dress = pavilionParts();
  const fitPavilions = [
    blocks(g, "pavilionDress", dress.flatMap(({ part, faces }) => allFaces(merged(part).blocks, faces))),
    prisms(g, "pavilionDressCurved", dress.flatMap(({ part, faces }) => allFacesPrisms(merged(part).prisms, faces))),
  ];
  // The arcade's dressing: one arcade, on all 36 bays; its glass bosses
  // and globes as instances.
  const arcade = arcadeDressFace();
  const arcadeSolid = merged(arcade.part);
  const fitArcade = [
    blocks(g, "arcadeDress", allFaces(arcadeSolid.blocks)),
    prisms(g, "arcadeDressCurved", allFacesPrisms(arcadeSolid.prisms)),
  ];
  const fittings = [
    {
      name: "cabochons",
      spawn: fittingSpawn(g, "cabochons", fittingsOnFaces(arcade.cabochons), FITTING_ASSETS.cabochon),
    },
    { name: "globes", spawn: fittingSpawn(g, "globes", fittingsOnFaces(arcade.globes), FITTING_ASSETS.globe) },
    // The gallery balustrade's stoneware balusters.
    {
      name: "balusters",
      spawn: fittingSpawn(g, "balusters", fittingsOnFaces(balustersFace()), FITTING_ASSETS.baluster),
    },
  ];
  // The ground stair arrives in piles 4 and 2: quadrant targets 0 and 2.
  const arrivals = [
    ...[0, 2].map((k) => turnWell(STAIR_OPENINGS.ground, k)),
    // Every leg's lift passes through it: the Roux to it, the Otis on up.
    ...[0, 1, 2, 3].flatMap((k) => LIFT_OPENINGS.first.map((w) => turnWell(w, k))),
  ];
  const fitPrisms = prisms(g, "fitOutCurved", [
    ...cutWells(
      [
        ...allFacesPrisms(firstDeck(), TERRACE_RAIL.closed),
        ...allFacesPrisms(cutNotches(firstDeck(), entranceNotches()), TERRACE_RAIL.entrance),
      ],
      arrivals,
    ),
    ...secondDeck(),
    ...allFacesPrisms(staffShell.vaults, staffFaces),
    ...allFacesPrisms(timberShell.vaults, timberFaces),
    ...allFacesPrisms([
      ...bays.prisms,
      skirt,
      ...ornament.prisms,
      ...secondSkirtFace(),
      ...panelling.prisms,
      ...second.roof,
    ]),
    ...landingFloor(),
    ...thirdFloor(),
  ]);

  return {
    platforms: [grilles, fitBlocks, fitPrisms, ...fitInner, ...fitFlights, ...fitSecond, ...fitPavilions, ...fitArcade],
    glass: [prisms(g, "restaurantGlass", glazed.glass)],
    silvered: [prisms(g, "crescentGlass", glazed.silvered)],
    fittings,
    names: [namesLetters(g)],
    masonry: [copyToQuadrants(g, "pedestals", pedestal, quads)],
  };
}
