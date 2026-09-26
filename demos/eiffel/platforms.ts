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
 *   "côté extérieur 18m65" matches nothing drawn there, so no deck is
 *   18.65 wide.
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
 *   `bayRoof`). The inner arcade is not built: the vault ends in a gable
 *   drawn as the outer one. The crown carries a palmette crest to 10.10
 *   [measured PL-XIX: 10.14] and every pier an 8.00 m flag mast [sourced
 *   text] topping out about 12.2 above the gallery floor [estimated].
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
 *   (`FACADE`), its glass left out. Each vault
 *   carries a glazed ridge lantern: 2.65 wide, a gable 3.80 eave to eave
 *   rising 0.70 to a ridge at altitude 99.37 [sourced PL-XXX; the others
 *   print 99.39 and 99.40], its length [estimated from the roof plan].
 *   In front of each, along the terrace's edge to the mid-bay columns at
 *   ±15.53, the terrace balustrade, open over the centre bay on the
 *   Français and the Russe (`TERRACE_RAIL`).
 * - BALUSTRADES: rails and posts, their infill (terracotta balusters, X
 *   panels) left out. The gallery's: 1.150 tall, cast-iron pilasters every
 *   1.74125, mid-arch, where the columns do not stand [sourced PL-XIII].
 *   Round the central void ("Balcon") the same, following its edge, which
 *   no plate read prints [estimated]. The 2nd floor's: 1.150 [sourced
 *   13bis].
 * - THE 2nd-FLOOR GALLERY ("galerie couverte"): posts every 3.36268, 3.62
 *   tall [sourced 13bis], on two lines 2.096 clear apart [sourced, one
 *   digit ambiguous], under a pitched roof whose ridge runs along the face,
 *   eaves about 3.0 and ridge about 3.6 [estimated], behind a 0.62 attic
 *   band on the outer posts [sourced height]. Nothing that stood on
 *   the 2nd platform in 1889 is dimensioned on the plates (the 1900 album's
 *   buffet and tents may be later), so the deck carries only the gallery.
 *   A flag mast stands on each outer post (`SECOND_MAST`).
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
 *   gallery floor [measured PL-XIX], one to each 3.8825 console bay (see
 *   `NAMES`, `namesBand`).
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
  meshPrimitive,
  pointGrid,
  pointsToPath,
  removeAttribute,
  setAttribute,
  transformPoints,
  vec,
} from "pcg-ts";
import { type Vec3, copyToQuadrants, indexTable } from "./lattice.js";
import type { Parts } from "./parts.js";
import { FLOORS, MEMBERS, PANEL29, PEDESTAL, PLATFORMS, profileAt } from "./spec.js";

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
  /** The palmette over each crown: width, height (to about 10.2), thickness. */
  crest: [1.2, 1.5, 0.12] as Vec3,
  /** Flag mast: 8.00 long [sourced text], foot 4.2 above the gallery floor, section. */
  mast: { length: 8, foot: 4.2, size: 0.12 },
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

/**
 * The names band on the +z face: one tilted plaque, copied along the row.
 * The skirt's panel runs from the gallery's edge (y = its floor less the
 * deck, z = EDGE) down to its foot, leaning in SKIRT.lean; the band lies
 * on the panel's outer face, the row centred on the face.
 */
function namesBand(g: Graph): NodeHandle {
  const top = GALLERY.floor - DECK;
  const drop = top - SKIRT.bottom;
  const len = Math.hypot(drop, SKIRT.lean);
  // Down the panel, and its outward normal (it looks slightly down).
  const down: [number, number] = [-drop / len, -SKIRT.lean / len];
  const out: [number, number] = [-SKIRT.lean / len, drop / len];
  // The band's middle, as a distance down the panel from its top.
  const middle = GALLERY.floor - NAMES.top - NAMES.height / 2;
  const along = ((top - middle) * len) / drop;
  const y = top + down[0] * along + out[0] * (NAMES.thickness / 2);
  const z = EDGE + down[1] * along + out[1] * (NAMES.thickness / 2);
  const pitch = NAMES.pitch;
  const plaque = g.add(
    meshPrimitive,
    { shape: "box", center: [0, 0, 0], size: [pitch - NAMES.gap, NAMES.height, NAMES.thickness] },
    "namesPlaque",
  );
  const tilt = g.add(
    transformPoints,
    { rotateEuler: [(Math.atan2(SKIRT.lean, drop) * 180) / Math.PI, 0, 0] },
    "namesTilt",
  );
  const slots = g.add(
    pointGrid,
    {
      countX: NAMES.perFace,
      countY: 1,
      countZ: 1,
      spacing: [pitch, 1, 1],
      origin: [(-(NAMES.perFace - 1) * pitch) / 2, y, z],
    },
    "namesSlots",
  );
  const row = g.add(copyToPoints, { topology: "keep" }, "namesRow");
  g.connect(plaque, "out", tilt, "in");
  g.connect(tilt, "out", row, "source");
  g.connect(slots, "out", row, "target");
  return row;
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
 * PL-I's "côté extérieur 18m65" matches nothing drawn at this level (the
 * widest element on every plate is 16.56; PL-I's own strokes reach 17.7),
 * so it is not built.
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
 * through the 1st floor's at t
 * 31.34 to 36.91, s -1.58 to -0.52 [measured on the cooked stairs by the
 * lifts unit, §21]. Neither is on the plates read.
 */
const STAIR_OPENINGS = {
  e1: { s: 0, t: 17.105, along: 0.8, across: 3.97 },
  ground: { s: -1.05, t: 34.125, along: 1.06, across: 5.57 },
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
 * from the gallery [sourced PL-XVIII; the flights are not built]; on the
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
 * it is built as its two arc ribs and the rays, the glass left out as the
 * balustrades' infill is; rib and ray widths [estimated]. Under the inner
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
 * glass is left out. The walls' thickness [estimated]. The tympanum over
 * the wall under each vault is glazed trellis on a post and rays [sourced
 * drawing], built as the post, the rays and a rib along the vault; so is
 * the one at each vault's end, on the void side, as the Français had them
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

/** Face-frame prisms, turned onto all four faces. */
function allFacesPrisms(list: readonly Prism[]): Prism[] {
  const out: Prism[] = [];
  for (let f = 0; f < 4; f++) {
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
 * the circle of GALLERY.innerRadius through the inner crown, cut by the
 * vault's springing line, one point per point of `vaultArc`. `grow`
 * widens the circle about the same centre (a rib's outer edge).
 */
function innerArc(c: number, r: number, grow = 0): Vec3[] {
  const n = ARCADE.vaultSegments;
  const R = GALLERY.innerRadius + grow;
  const cy = GALLERY.floor + GALLERY.innerCrown - GALLERY.innerRadius;
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

/**
 * A gable's crescent over bay centre `c`, its face at r (see `GABLE`): a
 * rib under the vault's arc, a rib over the inner arc, and a ray from each
 * point of the one to the matching point of the other, all ARCADE.plate
 * thick and extruded inward from r as the vault is.
 */
function gableRibs(c: number, r: number): Piece {
  const outer = vaultArc(c, r);
  const outerIn = vaultArc(c, r, GABLE.outerRib);
  const inner = innerArc(c, r);
  const innerOut = innerArc(c, r, GABLE.innerRib);
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
 * vault behind it a shell back to the inner arcade, `depth` in, where the
 * inner arcade's gable closes it, drawn as the outer one [estimated: the
 * inner arcade is not dimensioned]. The pavilions' bays are
 * `pavilionFace`'s.
 */
function bayRoof(c: number, r: number, depth: number): Piece {
  const front = gableRibs(c, r);
  const back = gableRibs(c, r - depth + ARCADE.plate);
  return {
    prisms: [
      ...front.prisms,
      ...between(vaultArc(c, r), vaultArc(c, r, ARCADE.shell), depth),
      ...back.prisms,
    ],
    blocks: [...front.blocks, ...back.blocks],
  };
}

/** The arcade on the +z face: columns, piers, arches, crests and masts. */
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
    // The palmette on the crown.
    const [w, h, t] = ARCADE.crest;
    out.push(onLine(c - w / 2, c + w / 2, CROWN_Y - 0.1, CROWN_Y - 0.1 + h, EDGE, t));
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
 */
function pavilionFace(): { walls: Block[]; vaults: Prism[] } {
  const P = PAVILION;
  const F = FACADE;
  const front = EDGE - P.front;
  const back = front - P.depth;
  const annex = back + P.annex;
  const half = P.length / 2;
  const bay = GALLERY.module / 2;
  const floor = FLOORS.first;
  const W = F.wall;
  const walls: Block[] = [
    // The side walls, and the rear wall either side of the centre annex.
    span(-half, -half + W, floor, SPRING_Y, annex, front - W),
    span(half - W, half, floor, SPRING_Y, annex, front - W),
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
    // The roof: the gallery's gable, the shell back to the building's end,
    // and the glazed tympana on the façade and at the end.
    const gable = gableRibs(c, EDGE);
    const glazed = tympanum(c, front);
    const rear = tympanum(c, end + ARCADE.plate);
    vaults.push(
      ...gable.prisms,
      ...between(vaultArc(c, EDGE), vaultArc(c, EDGE, ARCADE.shell), EDGE - end),
      ...glazed.prisms,
      ...rear.prisms,
    );
    walls.push(...gable.blocks, ...glazed.blocks, ...rear.blocks);
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
  const runs: ReadonlyArray<readonly [number, number]> = entrance
    ? [
        [-T.end, -GALLERY.module / 2],
        [GALLERY.module / 2, T.end],
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
 * The pedestals (`PEDESTAL`, SOURCES.md §24; tags as in the file comment):
 * a hollow masonry skirt round each leg's foot, stepped as PL-I draws it,
 * its top only where the uprights come out of it. Each tier's four faces
 * (battered or upright) and the ring between one tier and the next (a
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
 * base's back face) [derived].
 */
const PEDESTAL_SKIRT = { shell: 0.4, margin: 0.03, coping: 0.05, lean: 1.33 } as const;

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

/**
 * The ring between two nested plan squares [a0, a1]² ⊇ [b0, b1]² at height
 * y, as its four mitred trapezoids (the +x +z quadrant's plan: x and z both
 * run from the inner faces, a0, to the outer, a1). Pieces narrower than a
 * millimetre are left out.
 */
function squareRing(a0: number, a1: number, b0: number, b1: number, y: number): Vec3[][] {
  const p = (x: number, z: number): Vec3 => [x, y, z];
  const pieces: Array<[Vec3[], number]> = [
    [[p(a0, a0), p(a1, a0), p(b1, b0), p(b0, b0)], b0 - a0],
    [[p(a1, a0), p(a1, a1), p(b1, b1), p(b1, b0)], a1 - b1],
    [[p(a1, a1), p(a0, a1), p(b0, b1), p(b1, b1)], a1 - b1],
    [[p(a0, a1), p(a0, a0), p(b0, b0), p(b0, b1)], b0 - a0],
  ];
  return pieces.filter(([, w]) => w > 1e-3).map(([o]) => o);
}

/**
 * One pedestal, in the +x +z quadrant (see `PEDESTAL_SKIRT`): per tier its
 * four faces, then the rings between tiers, then the coping.
 */
function pedestalFaces(): Prism[] {
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
    const [i0, i1] = t.inner;
    const [o0, o1] = t.outer;
    const b = (x: number, z: number): Vec3 => [x, t.y0, z];
    const h = (x: number, z: number): Vec3 => [x, t.y1, z];
    // Each face and the direction into the masonry behind it; its depth is
    // the least horizontal room between it and the hole, over its height.
    const room = (d0: number, d1: number, side: 0 | 1) =>
      Math.min(
        ...[t.y0, t.y1].map((y, k) => {
          const d = k === 0 ? d0 : d1;
          const [hi, ho] = hole(y);
          return side === 0 ? hi - d : d - ho;
        }),
      );
    const faces: Array<[Vec3[], Vec3, number]> = [
      [[b(i0, i0), b(o0, i0), h(o1, i1), h(i1, i1)], [0, 0, 1], room(i0, i1, 0)],
      [[b(o0, i0), b(o0, o0), h(o1, o1), h(o1, i1)], [-1, 0, 0], room(o0, o1, 1)],
      [[b(o0, o0), b(i0, o0), h(i1, o1), h(o1, o1)], [0, 0, -1], room(o0, o1, 1)],
      [[b(i0, o0), b(i0, i0), h(i1, i1), h(i1, o1)], [1, 0, 0], room(i0, i1, 0)],
    ];
    for (const [f, into, space] of faces) {
      const depth = Math.min(shell, space - 0.02);
      if (!(depth > 0.01)) {
        throw new Error(
          `platforms.ts pedestalFaces: the tier ${t.y0}-${t.y1} leaves ${space.toFixed(3)} m between its face and the leg's uprights; ` +
            "move that tier's face out in PEDESTAL.tiers (spec.ts), or the skirt reaches into the leg",
        );
      }
      out.push({ outline: towards(f, into), depth });
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
    const ring = tread ? squareRing(li, lo1, ui, uo, y) : squareRing(ui, uo, li, lo1, y);
    // A tread hangs down into the tier below, where the uprights lean
    // further out: it stops 0.02 short of the height at which the hole
    // reaches its inner edge.
    let depth = Math.min(shell, tread ? lo.y1 - lo.y0 : hi.y1 - hi.y0);
    if (tread) {
      for (let d = 0.01; d <= depth; d += 0.01) {
        const [hIn, hOut] = hole(y - d);
        if (hIn - ui < 0.02 || uo - hOut < 0.02) {
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
  for (const f of squareRing(top.inner[1], top.outer[1], hi, ho, top.y1)) {
    out.push({ outline: towards(f, [0, -1, 0]), depth: coping });
  }
  return out;
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

  // The masonry class carries no normals: the page computes them.
  const pedestal = prisms(g, "pedestal", pedestalFaces(), false);

  // The fit-out, face by face.
  const pavilion = pavilionFace();
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

  const fitBlocks = blocks(
    g,
    "fitOut",
    allFaces([
      ...arcadeFace(),
      ...trellis,
      ...bays.blocks,
      ...pavilion.walls,
      ...galleryRail,
      ...voidRail,
      step,
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
      landingBlocks(),
    ),
  );
  // The ground stair arrives in piles 4 and 2: quadrant targets 0 and 2.
  const arrivals = [
    ...[0, 2].map((k) => turnWell(STAIR_OPENINGS.ground, k)),
    // Every leg's lift passes through it: the Roux to it, the Otis on up.
    ...[0, 1, 2, 3].flatMap((k) => LIFT_OPENINGS.first.map((w) => turnWell(w, k))),
  ];
  const fitPrisms = prisms(g, "fitOutCurved", [
    ...cutWells(allFacesPrisms(firstDeck()), arrivals),
    ...secondDeck(),
    ...allFacesPrisms([
      ...pavilion.vaults,
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
    platforms: [fitBlocks, fitPrisms],
    names: [copyToQuadrants(g, "names", namesBand(g), quads)],
    masonry: [copyToQuadrants(g, "pedestals", pedestal, quads)],
  };
}
