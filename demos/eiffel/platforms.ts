/**
 * The floor platforms, the lift-transfer landing, and the masonry pedestals,
 * with the 1st and 2nd floors fitted out as they stood in 1889.
 *
 * Every deck is a slab whose TOP is the printed floor level (Plate I; the
 * structural nodes sit 0.23 m below), 0.60 m thick [estimated]:
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
 * - LANDING, y 195.93 [sourced], inside the shaft between nodes X and IX.
 *   No plan is printed. It fills the shaft: the shaft's half-width at the
 *   floor, interpolated on Plate XXXI's profile, less an upright's
 *   half-width, 16.23 m square [estimated].
 * - 3RD FLOOR gallery, y 276.13: 18.65 m square [sourced], round the
 *   10 m panel-29 box and under the 16.56 m room (`summit.ts`).
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
 *   The inner arcade is not built: the vault ends in its gable. The crown
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
 * - THE SKIRT below the 1st-floor gallery: 0.50 of cornice and 5.50 of
 *   plate panels down to altitude 83.90 [sourced PL-XIX], hung on consoles
 *   whose outer edge curves in about 0.9 m at the foot [estimated], here a
 *   plane leaning in 0.50 (see `SKIRT`). The gallery slab's own edge
 *   stands for the cornice. Its names band, 0.80 tall [sourced], carries
 *   the 72 names of French scientists and engineers, 18 to a face [the
 *   count is well known; the plates give the band]: here 18 plaques per
 *   face on the panel's outer face just under the cornice, one per
 *   eighteenth of the face (see `namesBand`).
 * - THE UNDERSIDE: cross girders 4.00 deep every 3.8825 [sourced PL-XVI],
 *   tops 0.23 under the floor [sourced], spanning between the main girders
 *   on the outer and inner uprights' lines between the legs. They lean with
 *   the legs (panel 5's parallel prisms), so each is a parallelogram; its
 *   lattice (4 panels, one diagonal each) and sections are [estimated].
 * - THE 3rd FLOOR gets no balustrade: its gallery is INSIDE the glazed room
 *   (`summit.ts`), whose 1.200 plate parapet is the railing [sourced PL-XIV].
 *
 * Boxes carry no `normal`, so copying the meshes themselves is safe. Most
 * of the fit-out is boxes: one unit box copied onto a table of targets,
 * each carrying its size as `scale` and its turn as `rot`. The curved and
 * sloping parts — vaults, skirt panels, the 2nd-floor roof — are closed
 * outlines extruded along their own normals; their `normal` is removed, so
 * the class carries none and the page computes normals for all of it.
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
import { FLOORS, MEMBERS, PEDESTAL, PLATFORMS, profileAt } from "./spec.js";

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
} as const;

/** The arcade's lesser members [estimated: thicknesses, crest and mast sections]. */
const ARCADE = {
  /** Plate pier and arch rib thickness through the face. */
  plate: 0.15,
  /** Facets per small arch. */
  archFacets: 6,
  /** Segments of each vault's half-ellipse. */
  vaultSegments: 12,
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
 * The skirt's foot [sourced: altitude 83.90]. The consoles' outer edge curves
 * in about 0.9 at the foot [estimated]; the panels lean in 0.50, which keeps
 * their foot clear of the legs' outer uprights where these come through the
 * corners. The foot is at node XXIV, where the leg kinks and the upright's
 * mitred section reaches 34.66 from the axis [measured on the cooked mesh];
 * the panel's inner face is at 34.77 there. Thickness [estimated].
 */
const SKIRT = { bottom: 83.9 - 33.5, lean: 0.5, thickness: 0.08 } as const;

/**
 * The names band on the skirt: 0.80 tall [sourced], directly under the
 * 0.50 cornice [sourced]; plaque gaps and thickness [estimated].
 */
const NAMES = { perFace: 18, cornice: 0.5, height: 0.8, gap: 0.4, thickness: 0.03 } as const;

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
  const along = NAMES.cornice + NAMES.height / 2;
  const y = top + down[0] * along + out[0] * (NAMES.thickness / 2);
  const z = EDGE + down[1] * along + out[1] * (NAMES.thickness / 2);
  const pitch = (2 * EDGE) / NAMES.perFace;
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
    { countX: NAMES.perFace, countY: 1, countZ: 1, spacing: [pitch, 1, 1], origin: [-EDGE + pitch / 2, y, z] },
    "namesSlots",
  );
  const row = g.add(copyToPoints, { topology: "keep" }, "namesRow");
  g.connect(plaque, "out", tilt, "in");
  g.connect(tilt, "out", row, "source");
  g.connect(slots, "out", row, "target");
  return row;
}

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

/** A vault: a half-ellipse over bay centre `c`, its face at r, wound to extrude inward. */
function vault(c: number, r: number, depth: number): Prism {
  const half = (GALLERY.module - GALLERY.valley) / 2;
  const rise = CROWN_Y - SPRING_Y;
  const outline: Vec3[] = [];
  // Left foot, over the crown, to the right foot: clockwise seen from +r,
  // so the outline's normal points in, toward the tower's axis.
  for (let i = 0; i <= ARCADE.vaultSegments; i++) {
    const phi = Math.PI * (1 - i / ARCADE.vaultSegments);
    outline.push([c + half * Math.cos(phi), SPRING_Y + rise * Math.sin(phi), r]);
  }
  return { outline, depth };
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
    vaults.push(vault(c, EDGE, EDGE - end));
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

  const landingHalf = profileAt(FLOORS.landing).outer - uprightAt(FLOORS.landing);

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
    if (Math.abs(k) > 1) bays.push(vault(bayCentre(k), EDGE, GALLERY.depth));
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
    ]),
  );
  const fitPrisms = prisms(
    g,
    "fitOutCurved",
    allFacesPrisms([...pavilion.vaults, ...bays, skirt, ...second.roof]),
  );

  return {
    platforms: [
      first,
      gallery,
      deck(g, "secondFloor", PLATFORMS.second.side, FLOORS.second),
      deck(g, "landing", 2 * landingHalf, FLOORS.landing),
      deck(g, "thirdFloor", PLATFORMS.third.side, FLOORS.third),
      fitBlocks,
      fitPrisms,
    ],
    names: [copyToQuadrants(g, "names", namesBand(g), quads)],
    masonry: [copyToQuadrants(g, "pedestals", pedestal, quads)],
  };
}
