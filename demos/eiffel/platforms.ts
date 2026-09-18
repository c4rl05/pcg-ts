/**
 * The floor platforms, the lift-transfer landing, and the masonry pedestals,
 * with the 1st and 2nd floors fitted out as they stood in 1889.
 *
 * Every deck is a slab whose TOP is the printed floor level (Plate I; the
 * structural nodes sit 0.23 m below), 0.60 m thick [estimated] unless the
 * plates give its depth:
 *
 * - 1ST FLOOR, y 57.63: "côté extérieur 70m695, surface 4200 m²"
 *   [sourced]. 70.695² is 4,998 m², so the printed area only holds if the
 *   middle is open: a square ring whose hole is √(70.695² − 4200) = 28.245
 *   m wide [derived]. That is inside the inner uprights (32.70 m apart at
 *   node XXIII), so the ring spans the legs and leaves the centre void.
 *   One side slab is built in pinwheel form — the +z side, running on to
 *   the +x corner — and copied onto the four quadrant targets, which tiles
 *   the ring with no overlap. The ring's outer 2.60 m is the promenade
 *   gallery, 1.23 m LOWER than the rest (below), so it is a second ring
 *   built the same way; the platform proper stops 2.60 inside the edge.
 * - 2ND FLOOR, y 115.73: 37.63 m square [estimated reading of a smudged
 *   digit; see `PLATFORMS`]. 37.63² = 1,416 m² against the printed 1,400,
 *   which is inside the rounding the 3rd floor shows (18.65² = 348 m²
 *   against a printed 350), so no hole is inferred: a solid deck.
 * - LANDING, y 195.93 [sourced], inside the shaft between nodes X and IX:
 *   a square turned 45 degrees, 11.337 on its girders' axes, its vertices
 *   on the face centre lines, the corner triangles of the shaft left open
 *   [sourced PL-XVI Fig. 14, PL-XIX Fig. 14]. A 0.22 floor over lattice
 *   girders 2.30 deep round its edge, less the wells of the lower Edoux car
 *   and the stair from the 2nd floor (see `LANDING`).
 * - 3RD FLOOR, y 276.13: the glazed gallery's octagon, 16.56 across the
 *   flats, 0.85 deep, flush with the glass [sourced PL-XIX Figs 3, 9],
 *   less the wells of the upper Edoux car and the stair from the landing;
 *   on two curved consoles a face (see `THIRD`, `CONSOLE`). Plate I's
 *   "côté extérieur 18m65" matches nothing drawn there, so no deck is
 *   18.65 wide.
 * - PEDESTALS: the four decorative masonry "soubassements", 4 m high from
 *   the ground [sourced], faces 37.119 and 62.453 from the axis on both x
 *   and z [derived from Plate I's ground chain 25.334 + 74.238 + 25.334;
 *   see `PEDESTAL`]. One per leg, copied onto the quadrant targets.
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
 *   6.95 [sourced PL-XIX]; the lunette under the inner arc is an open
 *   wooden trellis [sourced], so it is left open, and the vault behind it
 *   is a shell (see `bayRoof`). The inner arcade is not built: the vault
 *   ends in a gable drawn as the outer one. The crown
 *   carries a palmette crest to about 10.2 [estimated] and every pier an
 *   8.00 m flag mast [sourced text] topping out about 12.2 above the
 *   gallery floor [estimated].
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
 *   the arcade to the building's back. The rear 3.35 m is an annex that
 *   rises full height only in the centre bay; in the outer bays it stops at
 *   2.95 as a roof terrace [sourced text, PL-XXX], and those vaults stop
 *   there. The walls rise to the gallery's valley gutters, 4.82 above the
 *   restaurant floor [derived: 56.40 + 6.05 − 57.63], within the 4.61 to
 *   5.03 the pavilion plates print for their own [sourced]. Each vault
 *   carries a glazed ridge lantern: 2.65 wide, a gable 3.80 eave to eave
 *   rising 0.70 to a ridge at altitude 99.37 [sourced PL-XXX; the others
 *   print 99.39 and 99.40], its length [estimated from the roof plan].
 * - BALUSTRADES: rails and posts, their infill (terracotta balusters, X
 *   panels) left out. The gallery's: 1.150 tall, cast-iron pilasters every
 *   1.74125, mid-arch, where the columns do not stand [sourced PL-XIII].
 *   Round the central void ("Balcon") the same, which no plate read prints
 *   [estimated]. The 2nd floor's: 1.150 [sourced 13bis].
 * - THE 2nd-FLOOR GALLERY ("galerie couverte"): posts every 3.36268, 3.62
 *   tall [sourced 13bis], on two lines 2.096 clear apart [sourced, one
 *   digit ambiguous], under a pitched roof whose ridge runs along the face,
 *   eaves about 3.0 and ridge about 3.6 [estimated], behind a 0.62 attic
 *   band on the outer posts [sourced height]. Nothing that stood on
 *   the 2nd platform in 1889 is dimensioned on the plates (the 1900 album's
 *   buffet and tents may be later), so the deck carries only the gallery.
 *   Under the deck's edge hangs its SKIRT, a curved plate 5.15 deep
 *   [sourced PL-XIX Fig. 2] leaning in 1.3 to its foot at node XVIII,
 *   unbroken across the faces, which hides panel 11's belt (see
 *   `SECOND_SKIRT`).
 * - THE SKIRT below the 1st-floor gallery: 0.50 of cornice and 5.50 of
 *   plate panels down to altitude 83.90 [sourced PL-XIX], the plate leaning
 *   in 0.62-0.93 at the foot [measured PL-XIII], here a plane leaning in
 *   0.60 (see `SKIRT`). The gallery slab's own edge stands for the
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
 *   sections are [estimated].
 * - THE 3rd FLOOR gets no balustrade: its gallery is INSIDE the glazed room
 *   (`summit.ts`), whose 1.200 plate parapet is the railing [sourced PL-XIV].
 *
 * Boxes carry no `normal`, so copying the meshes themselves is safe. Most
 * of the fit-out is boxes: one unit box copied onto a table of targets,
 * each carrying its size as `scale` and its turn as `rot`. The curved and
 * sloping parts — vaults, skirt panels, the 2nd-floor roof, and the floors
 * with wells — are closed convex outlines extruded along their own
 * normals; their `normal` is removed, so the class carries none and the
 * page computes normals for all of it.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  attribute,
  copyToPoints,
  extrudePolygon,
  meshPrimitive,
  pointGrid,
  pointsToPath,
  removeAttribute,
  setAttribute,
  transformPoints,
  vec,
} from "pcg-ts";
import { type Vec3, box, copyToQuadrants, indexTable } from "./lattice.js";
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
 * face carries [sourced PL-XIX's list, 18 a face]. Plaque gaps and
 * thickness [estimated].
 */
const NAMES = {
  perFace: 18,
  top: 4.02,
  height: 0.8,
  pitch: 3.8825,
  gap: 0.4,
  thickness: 0.03,
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
 * The Edoux lift's two cars run on the N-S diagonal, their axes 2.650 out
 * either side of the tower's axis [sourced PL-XX], the lower car toward
 * pile 3 (+x -z), the upper toward pile 1; the service stairs e2 and e3,
 * Ø 1.600 and 1.680 [sourced PL-XX Fig. 2], take the halves of the shaft
 * the cars leave free (as `lifts.ts` builds them). A floor a car rises
 * through, or a stair comes up through, has a well there: the stairs' a
 * square 0.90 either side of the stair's axis, room for its rail
 * [estimated].
 */
const CAR_AXIS = 2.65;
const STAIR_HALF = 0.9;

/** A rectangular well on the N-S diagonal: centre `s` out along it, size along and across it. */
interface Well {
  readonly s: number;
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
    // The service stair e3 from the landing.
    { s: CAR_AXIS, along: 2 * STAIR_HALF, across: 2 * STAIR_HALF },
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
 * inner beams A and C are left out.
 */
const LANDING = {
  side: 11.337,
  floor: 0.22,
  wells: [
    // The lower car's, toward pile 3.
    { s: CAR_AXIS, along: 3.67, across: 4.2 },
    // The service stair from the 2nd floor, e2, arriving under the upper car.
    { s: -CAR_AXIS, along: 2 * STAIR_HALF, across: 2 * STAIR_HALF },
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

/** The 1st floor's cross girders [sourced pitch, depth, drop; the rest estimated]. */
const CROSS_GIRDER = {
  pitch: 3.8825,
  depth: 4.0,
  drop: 0.23,
  panels: 4,
  chord: 0.3,
  bar: 0.2,
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

/** Face-frame blocks, turned onto all four faces. */
function allFaces(list: readonly Block[]): Block[] {
  const out: Block[] = [];
  for (let f = 0; f < 4; f++) {
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

/**
 * Many boxes as one mesh: a unit box copied onto one target per block,
 * each target carrying the block's size as `scale` and its turn as `rot`
 * (copyToPoints scales, then turns, then places).
 */
function blocks(g: Graph, id: string, list: readonly Block[]): NodeHandle {
  const unit = box(g, `${id}Unit`, [0, 0, 0], [1, 1, 1]);
  const slots = g.add(
    pointGrid,
    { countX: list.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
  );
  const col = (pick: (b: Block) => number) => indexTable(list.map(pick));
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(col((b) => b.at[0]), col((b) => b.at[1]), col((b) => b.at[2])),
    },
    `${id}Place`,
  );
  const size = g.add(
    setAttribute,
    {
      name: "scale",
      type: "f32",
      tupleSize: 3,
      value: vec(col((b) => b.size[0]), col((b) => b.size[1]), col((b) => b.size[2])),
    },
    `${id}Size`,
  );
  const q = (i: number) => col((b) => (b.rot ?? [0, 0, 0, 1])[i] as number);
  const rot = g.add(
    setAttribute,
    { name: "rot", type: "f32", tupleSize: 4, value: vec(q(0), q(1), q(2), q(3)) },
    `${id}Turn`,
  );
  const out = g.add(copyToPoints, { topology: "keep" }, id);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", size, "in");
  g.connect(size, "out", rot, "in");
  g.connect(unit, "out", out, "source");
  g.connect(rot, "out", out, "target");
  return out;
}

/**
 * Many prisms as one mesh: every outline a closed path, extruded along its
 * own normal by its depth, its `normal` then removed (see the file comment).
 * Each outline must be convex: a cap is a fan from its first point.
 */
function prisms(g: Graph, id: string, list: readonly Prism[]): NodeHandle {
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
    `${id}Solid`,
  );
  const out = g.add(removeAttribute, { names: ["normal"], domain: "point" }, id);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", len, "in");
  g.connect(len, "out", paths, "in");
  g.connect(paths, "out", solid, "in");
  g.connect(solid, "out", out, "in");
  return out;
}

/** A square deck `side` wide whose top is at `top`. */
function deck(g: Graph, id: string, side: number, top: number): NodeHandle {
  return box(g, id, [0, top - DECK / 2, 0], [side, DECK, side]);
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
 * `top`: one pinwheel side slab (the +z side, on to the +x corner) copied
 * onto the quadrant targets, which tiles the ring with no overlap.
 */
function ring(
  g: Graph,
  id: string,
  inner: number,
  outer: number,
  top: number,
  quads: NodeHandle,
): NodeHandle {
  const side = box(
    g,
    `${id}Side`,
    [(outer - inner) / 2, top - DECK / 2, (outer + inner) / 2],
    [outer + inner, DECK, outer - inner],
  );
  return copyToQuadrants(g, id, side, quads);
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

/** Positions about `pitch` apart from -half to +half, pinwheel: -half is the last face's. */
function pitched(half: number, pitch: number): number[] {
  const n = Math.max(1, Math.round((2 * half) / pitch));
  return Array.from({ length: n }, (_, i) => -half + ((i + 1) * 2 * half) / n);
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
 * vault's springing line, one point per point of `vaultArc`.
 */
function innerArc(c: number, r: number): Vec3[] {
  const n = ARCADE.vaultSegments;
  const R = GALLERY.innerRadius;
  const cy = GALLERY.floor + GALLERY.innerCrown - R;
  const psi0 = Math.asin((SPRING_Y - cy) / R);
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const psi = Math.PI - psi0 - ((Math.PI - 2 * psi0) * i) / n;
    out.push([c + R * Math.cos(psi), cy + R * Math.sin(psi), r]);
  }
  return out;
}

/**
 * A bay's roof, face at r. The gable at the face is the crescent between
 * the vault's outer arc and its inner arc, a plate [sourced: glazed and
 * gilt in the cells between its rays]; the lunette under the inner arc
 * is « un treillis de bois » [sourced PL-XIX, PL-XIII Fig. 26, Eiffel's
 * text], an open trellis, so it is left open like the balustrades' infill.
 * Behind the gable the vault is a shell for `open` (the gallery and, at the
 * pavilions, the terrace), then solid on to `depth` where a hall stands
 * under it; where nothing does, the inner arcade's gable closes it, drawn
 * as the outer one [estimated: the inner arcade is not dimensioned].
 */
function bayRoof(c: number, r: number, open: number, depth: number): Prism[] {
  const gable = (at: number) => between(vaultArc(c, at), innerArc(c, at), ARCADE.plate);
  const out = [...gable(r), ...between(vaultArc(c, r), vaultArc(c, r, ARCADE.shell), open)];
  if (depth > open) out.push(vault(c, r - open, depth - open));
  else out.push(...gable(r - open + ARCADE.plate));
  return out;
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

/** One pavilion on the +z face: walls, annexes and lanterns (its vaults are prisms). */
function pavilionFace(): { walls: Block[]; vaults: Prism[] } {
  const P = PAVILION;
  const front = EDGE - P.front;
  const back = front - P.depth;
  const annex = back + P.annex;
  const half = P.length / 2;
  const bay = GALLERY.module / 2;
  const floor = FLOORS.first;
  const walls: Block[] = [
    // The hall, and the centre bay's annex, up to the valley gutters.
    span(-half, half, floor, SPRING_Y, annex, front),
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
    vaults.push(...bayRoof(c, EDGE, P.front, EDGE - end));
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
 * frame) less rectangular wells on the N-S diagonal, as convex prisms: the
 * plan cut into bands at the wells' edges across the diagonal, each band
 * into pieces between the wells it crosses. Every piece is wound
 * counter-clockwise seen from above, so it extrudes up.
 */
function floorWithWells(
  plan: readonly (readonly [number, number])[],
  wells: readonly Well[],
  y0: number,
  y1: number,
): Prism[] {
  const big = 1e3;
  const edges = wells.flatMap((w) => [-w.across / 2, w.across / 2]);
  const ts = [-big, big, ...edges].sort((a, b) => a - b);
  const out: Prism[] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const [ta, tb] = [ts[i] as number, ts[i + 1] as number];
    if (tb - ta < 1e-9) continue;
    const mid = (ta + tb) / 2;
    // The wells this band crosses, as intervals along the diagonal.
    const cut = wells
      .filter((w) => Math.abs(mid) < w.across / 2)
      .map((w) => [w.s - w.along / 2, w.s + w.along / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    const spans: [number, number][] = [];
    let from = -big;
    for (const [c0, c1] of cut) {
      spans.push([from, c0]);
      from = c1;
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
  const line = (r: number, height: number) => {
    // Posts every pitch, centred on the face, and one on the +a corner.
    const n = Math.floor((2 * r) / S.pitch);
    const along = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * S.pitch);
    for (const a of [...along, r]) posts.push(post(a, r, S.post, floor, floor + height));
  };
  line(rOut, S.postHeight);
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
 * Build the platforms, their 1889 fit-out and the pedestals. `quads` are
 * the four quadrant targets.
 */
export function buildPlatforms(g: Graph, quads: NodeHandle): Parts {
  // The 1st floor: the platform ring, and the gallery ring 1.23 m lower.
  const { side, area } = PLATFORMS.first;
  const hole = Math.sqrt(side * side - area) / 2;
  const terrace = EDGE - GALLERY.width;
  const first = ring(g, "firstFloor", hole, terrace, FLOORS.first, quads);
  const gallery = ring(g, "firstGallery", terrace, EDGE + GALLERY.gutter, GALLERY.floor, quads);

  const pedMid = (PEDESTAL.inner + PEDESTAL.outer) / 2;
  const pedSide = PEDESTAL.outer - PEDESTAL.inner;
  const pedestal = box(
    g,
    "pedestal",
    [pedMid, PEDESTAL.height / 2, pedMid],
    [pedSide, PEDESTAL.height, pedSide],
  );

  // The fit-out, face by face.
  const pavilion = pavilionFace();
  const second = secondGalleryFace();
  const bays: Prism[] = [];
  for (let k = -4; k <= 4; k++) {
    if (Math.abs(k) > 1) bays.push(...bayRoof(bayCentre(k), EDGE, GALLERY.depth, GALLERY.depth));
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
  // The void's railing stands just inside the platform's edge.
  const voidLine = hole + GALLERY_RAIL.post / 2;
  const voidPosts = pitched(hole, GALLERY_RAIL_PITCH);
  const voidRail = railFace(GALLERY_RAIL, voidLine, hole, FLOORS.first, voidPosts);
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
      ...pavilion.walls,
      ...galleryRail,
      ...voidRail,
      ...crossGirders(),
      ...second.posts,
      ...consolesFace(),
    ]).concat(landingBlocks()),
  );
  const fitPrisms = prisms(g, "fitOutCurved", [
    ...allFacesPrisms([...pavilion.vaults, ...bays, skirt, ...secondSkirtFace(), ...second.roof]),
    ...landingFloor(),
    ...thirdFloor(),
  ]);

  return {
    platforms: [
      first,
      gallery,
      deck(g, "secondFloor", PLATFORMS.second.side, FLOORS.second),
      fitBlocks,
      fitPrisms,
    ],
    names: [copyToQuadrants(g, "names", namesBand(g), quads)],
    masonry: [copyToQuadrants(g, "pedestals", pedestal, quads)],
  };
}
