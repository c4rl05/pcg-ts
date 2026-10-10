/**
 * The second scale: a member that is itself a lattice.
 *
 * The web bars of every braced panel are not solid: each is a square strut
 * of four corner angles ("cornières", 80-100 mm) laced together on all four
 * faces by light angles ("treillis 45 x 45 x 5") in an X (Plate XXXI's
 * section table; Plate VII's labels). So a member path becomes four chords
 * and eight zigzags — two per face, in opposite phase, which is an X per
 * lacing bay.
 *
 * The strut's section is squared to the face it lies in: every edge rule
 * writes its face's normal (`FACE_NORMAL`, see lattice.ts), and the
 * section axes are that normal made perpendicular to the member, N, and
 * B = N x T. An up hint of +y would square it to the vertical instead,
 * which in panel 1, where the faces lean 26.7 degrees, rolls one diagonal
 * 30 degrees off its face and the other 40.
 *
 * Built like the truss in the corpus rig graph: resample, then displace
 * copies of the same paths — each chord or zigzag is one transformPoints
 * whose translate is a field of the sample's frame and index.
 */
import {
  type Field,
  type FieldLike,
  type Graph,
  type NodeHandle,
  abs,
  add,
  attribute,
  component,
  cross,
  dot,
  index,
  lerp,
  copyToPoints,
  div,
  extrudePolygon,
  filterByExpression,
  ge,
  gt,
  le,
  lt,
  max,
  min,
  meshPrimitive,
  mergePoints,
  mergePrimitives,
  mod,
  mul,
  normalize,
  orientAlongVector,
  pathResample,
  pathSegments,
  pointGrid,
  pointsToPath,
  position,
  promoteAttribute,
  ramp,
  randomField,
  removeAttribute,
  sampleNearestPoint,
  setAttribute,
  spawnInstances,
  select,
  sqrt,
  sub,
  sweepProfile,
  transferByIndex,
  transformPoints,
  vec,
} from "pcg-ts";
import type { PlateFootprint } from "./crossing.js";
import { END_CORNER, END_SINE, END_SINE_MIN, FACE_NORMAL, type Vec3, merge, pointTable, skin } from "./lattice.js";
import { HEAD_DRIVE_ATTR } from "./heads.js";
import { clipHeads, gatePaths, gatePoints } from "./region.js";

/**
 * How far outside its cell a regional build's gates keep (region.ts), in
 * metres: each is how far what is built from a gate's points can stand
 * from them, with a margin; the seam test holds every cell to the whole
 * cook. A lacing sample's rings and heads stand within a strut's
 * half-width (0.45 at most) of it; a member's end plate reaches from its
 * tip past its joint start (upright plus clearance over the end sine,
 * clamped at 0.25) and its reach, a few metres on the steepest.
 */
const REGION_HALO = { samples: 1.5, tips: 10, heads: 0.5 } as const;
import { type Detail, RIVET_ASSET, jitter } from "./parts.js";

/** A corner angle's half-width: 80-100 mm angles (Plate XXXI) [derived]. */
const CHORD = 0.045;
/** A lacing bar's half-width: 45 x 45 x 5 angles (Plate VII) [derived: 45 / 2 mm]. */
const LACE = 0.0225;
/**
 * A rivet head's radius. The rivets ran 14-25 mm (a secondary source
 * quoting Eiffel's price lists); a round head is about 1.7 shank
 * diameters, so 38 mm across for a 22 mm rivet [estimated].
 */
const RIVET_HEAD = 0.019;
/** How far a rivet head rises off its plate: the host's unit head rises 0.7 of its base radius (main.ts). */
export const RIVET_RISE = 0.7 * RIVET_HEAD;

/**
 * Solid square members squared to their faces. The members of an edge rule
 * share their end points, and a sweep's up hint resolves per POINT, so each
 * member is first resampled onto points of its own (2 samples: its two
 * ends), which carry its primitive face normal down to them.
 */
export function faceSkin(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
): NodeHandle {
  const own = g.add(pathResample, { mode: "count", count: 2 }, `${id}Ends`);
  g.connect(paths, "out", own, "in");
  return skin(g, `${id}Skin`, own, halfWidth, attribute(FACE_NORMAL, 3));
}

/**
 * Flat bars and plates: a box per member, its length along the member,
 * `width` across it in its face and `thickness` along the face's normal.
 * Either may be a field, read per member (a primitive attribute the
 * members carry, as the lower uprights' plates do, each its own size).
 *
 * A 'rect' sweep of the member's two ends: the resample gives each member
 * points of its own and carries its primitive attributes (the face normal,
 * a per-member size) down to them, and the sweep squares the section to
 * the face normal as its up hint, `thickness` along it and `width` across,
 * capped at both ends. The sweep writes flat per-face normals itself, so a
 * merge with the swept members of the same class keeps them (a missing
 * `normal` was filled with zeros, and the Masque rendered black).
 */
export function flatBars(
  g: Graph,
  id: string,
  members: NodeHandle,
  width: number | Field,
  thickness: number | Field,
): NodeHandle {
  const tips = g.add(pathResample, { mode: "count", count: 2 }, `${id}Tips`);
  const boxes = g.add(
    sweepProfile,
    { profile: "rect", width, height: thickness, anchor: "center", up: attribute(FACE_NORMAL, 3) },
    `${id}Lit`,
  );
  g.connect(members, "out", tips, "in");
  g.connect(tips, "out", boxes, "in");
  return boxes;
}

/**
 * Flat plates from their outlines: each a closed polygon on the plate's
 * inner face, wound counter-clockwise about the way the plate thickens,
 * extruded `thickness` that way. `place` runs on the outlines before the
 * extrusion (a quadrant copy, say), so each plate's normal is its own on
 * every copy. What `flatBars` cannot build: a plate that is not a
 * rectangle, as an X's crossing plate is not (crossing.ts).
 */
export function outlinePlates(
  g: Graph,
  id: string,
  outlines: readonly (readonly Vec3[])[],
  thickness: number,
  place: (outlines: NodeHandle) => NodeHandle = (h) => h,
): NodeHandle {
  const slots = pointTable(g, `${id}Slots`, outlines.flat(), {
    plate: ["i32", outlines.flatMap((o, i) => o.map(() => i))],
  });
  const paths = g.add(pointsToPath, { groupAttr: "plate", closed: true }, `${id}Paths`);
  const bare = g.add(removeAttribute, { names: ["plate"], domain: "point" }, `${id}Bare`);
  g.connect(slots, "out", paths, "in");
  g.connect(paths, "out", bare, "in");
  // The extrusion writes a flat `normal` for every wall and cap, which a
  // merge with swept members keeps (a missing one is filled with zeros).
  const solid = g.add(extrudePolygon, { direction: "polygonNormal", distance: thickness, caps: "both" }, id);
  g.connect(place(bare), "out", solid, "in");
  return solid;
}

/**
 * Solid members of a RECTANGULAR section squared to their faces (a web
 * set's plain form when `WebOpts.halfB` is given): a box per member,
 * `outer` across the face plane's normal N and `halfB` along B, each read
 * at its widest (the sets that take one are constant).
 */
function faceBox(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  halfB: ReadonlyArray<readonly [number, number]>,
): NodeHandle {
  const widest = (t: ReadonlyArray<readonly [number, number]>) => Math.max(...t.map((s) => s[1]));
  return flatBars(g, id, paths, 2 * widest(halfB), 2 * widest(outer));
}

/** Web members at some detail: their meshes, and their rivets when asked. */
export interface WebMembers {
  readonly meshes: NodeHandle[];
  readonly rivets?: NodeHandle;
  /** Gusset plates at the members' ends, when `joints` was given. */
  readonly gussets?: NodeHandle;
  /** The rivets fastening the members' chords to those plates. */
  readonly jointRivets?: NodeHandle;
}

/**
 * Where a web member's ends land: on an upright whose half-width, by
 * height, is this. The joint starts just clear of it.
 */
export interface JointOpts {
  readonly upright: ReadonlyArray<readonly [number, number]>;
  /**
   * How far past the joint start the plate (and its rivet rows) runs along
   * the member, in strut half-widths. Default PLATE_REACH (3).
   */
  readonly reach?: number;
  /**
   * The smallest sine of the meeting angle the clearance assumes. Default
   * 0.25; a member meeting its upright more steeply than that is trimmed
   * as if at the clamp, which leaves its rivet rows INSIDE the box — so a
   * set with steeper members (the slender gap X of panel 16) lowers it.
   */
  readonly minSine?: number;
  /**
   * Solve the clearance against every line the column runs along at the
   * node (its bisector and the segments below and above, `END_SINE_MIN`),
   * not the bisector alone. Where the column kinks, a deep member's chord
   * sits beside one segment, which can lean closer to it than the
   * bisector: without this, a horizontal's bottom chord at XXIII puts its
   * rivets 2 mm inside the upright. Default false (the bisector).
   */
  readonly kinks?: boolean;
  /**
   * The upright's half-width at a member end, as a field of the end's
   * position, in place of `upright` read at its height — for a station
   * whose steel is not the table's (at XI the shaft's bd stands on two
   * leg boxes 0.50 apart). Read for the clearance only.
   */
  readonly uprightAt?: Field;
  /**
   * Where the gusset plates' near edges meet the upright, by height, when
   * that is not `upright`: the WEB, where `upright` is the clearance a
   * strut keeps, which also stands off what protrudes from the web (the
   * lower uprights' channels, `builtup.ts`). Default `upright`.
   */
  readonly face?: ReadonlyArray<readonly [number, number]>;
  /**
   * The members carry {@link JOINT_ENDS} (primitive, f32 x 2): 1 where that
   * end lands on an upright and takes a joint, 0 where it stops free, at an
   * opening left for something that passes (a lift's run). A free end is
   * not trimmed and gets no plates and no joint rivets. Default false:
   * every end is a joint.
   */
  readonly endFlags?: boolean;
  /**
   * The members carry an edge rule's {@link END_CORNER}: at a column where
   * the lattice turns a corner, a plate stops where it would meet the next
   * face's plates, rather than running on past the corner through them.
   * Default false: no member brings it but an edge rule's, on a lattice
   * that asks for it (`LatticeSpec.corners`).
   */
  readonly corners?: boolean;
}

/** The primitive attribute {@link JointOpts.endFlags} reads: which ends are joints. */
export const JOINT_ENDS = "jointEnds";

/** How a laced web member is laced: options beyond its size. */
export interface WebOpts {
  /**
   * The lacing's step along each member, in metres, by the member's OUTER
   * half-width: (half-width, step) stops, read once per member at its mean
   * height (see {@link LACING_STEP}). Without it the step is the old rule,
   * the full chord-to-chord width of the widest section in the table
   * (lacing bars at 45 degrees).
   */
  readonly lacingStep?: ReadonlyArray<readonly [number, number]>;
  /**
   * Steps by height band, overriding `lacingStep` for a member whose mean
   * height lies in [from, to): for members the plates lace differently
   * from others of the same section (the legs' 500s in panels 12-17 are
   * laced more openly than the shaft's, and not evenly; see
   * `LEG_LACING_500` in spec.ts).
   */
  readonly lacingBands?: ReadonlyArray<LacingBand>;
  /**
   * A RECTANGULAR section: the outer half-width along B (the section's
   * axis in the member's face plane, square to the member), by height,
   * where it differs from `outer` (which then gives the half-width along
   * N, out of that plane). Default: `outer`, a square. The joints read it
   * too: the plates cover the chords' B extent, the joint rivets sit on the
   * chords where they are, and the clearance at an upright is solved with
   * the section's extent in the face plane, the plane the upright's axis
   * and the member share (the entretoises: 1.20 wide in plan, 0.7156
   * deep).
   */
  readonly halfB?: ReadonlyArray<readonly [number, number]>;
  /**
   * The crossing plates laid over these members, in world space (all four
   * quadrants for a copied part): no lacing rivet is spawned on a face a
   * plate covers (see {@link StrutOpts.covers}).
   */
  readonly covers?: readonly PlateFootprint[];
  /**
   * Which lacing heads to keep, as a predicate on each head where it
   * stands (1 keeps it): for members whose cooked ends are cut back to a
   * web they ran past (the first floor's girder web, `toTheWeb` in
   * firstFloor.ts), so no head stands in the upright's box where the
   * lacing under it no longer is (see {@link StrutOpts.keepHeads}).
   */
  readonly keepHeads?: Field;
}

/**
 * THE TOWER'S JOINT PLATES, as one cloud of points over their mid-planes,
 * one per graph: every riveted set with joints adds its plates to it and
 * every riveted set's lacing keeps {@link PLATE_CLEAR} off it. That clears
 * a strut's own gusset plates, which cover the first stretch of it at each
 * end where the joint rivets sit on top, and its neighbours' too: where
 * several members meet an upright their plates overlap into one gusset,
 * and one member's plate reaches over another's strut — even across
 * modules, where the first floor's and the summit's struts run into the
 * legs' and the shaft's joints. The lacing reads the plates and the plates
 * read only the members' ends, so the graph stays acyclic.
 *
 * Each plate arrives as its centre line (`lines`), carrying its full
 * width as a vector across it; the cloud resamples every line at
 * {@link PLATE_CLOUD_STEP} and spreads each sample across the plate in
 * {@link PLATE_CLOUD_ACROSS} points. A plate of any length is sampled as
 * finely as any other: the longest runs 3.87 m, where a fixed grid per
 * plate left gaps a head could fall through.
 */
interface PlateCloud {
  readonly lines: NodeHandle;
  readonly cloud: NodeHandle;
}
const PLATE_CLOUDS = new WeakMap<Graph, PlateCloud>();

function plateCloudOf(g: Graph): PlateCloud {
  let c = PLATE_CLOUDS.get(g);
  if (c === undefined) {
    // (A resample keeps a path's primitive attributes, not its points'.)
    const lines = g.add(mergePrimitives, {}, "jointPlateLines");
    const lift = g.add(
      promoteAttribute,
      { name: PLATE_ACROSS, from: "point", to: "primitive", mode: "first" },
      "jointPlateAcrossLift",
    );
    const resampled = g.add(pathResample, { mode: "spacing", spacing: PLATE_CLOUD_STEP }, "jointPlateResample");
    const along = g.add(
      promoteAttribute,
      { name: PLATE_ACROSS, from: "primitive", to: "point", mode: "first" },
      "jointPlateAlong",
    );
    g.connect(lines, "out", lift, "in");
    g.connect(lift, "out", resampled, "in");
    g.connect(resampled, "out", along, "in");
    const cloud = g.add(mergePoints, {}, "jointPlateCloud");
    for (let k = 0; k < PLATE_CLOUD_ACROSS; k++) {
      const t = k / (PLATE_CLOUD_ACROSS - 1) - 0.5;
      const spread = g.add(
        transformPoints,
        { translate: mul(attribute(PLATE_ACROSS, 3), t) },
        `jointPlateAcross${k}`,
      );
      g.connect(along, "out", spread, "in");
      g.connect(spread, "out", cloud, "in");
    }
    c = { lines, cloud };
    PLATE_CLOUDS.set(g, c);
  }
  return c;
}

/**
 * The lacing heads the cloud is asked about, from every set at once: a
 * nearest-point query builds a spatial index over its source each time it
 * runs, and a 490,000-point cloud indexed once per set cost a third of
 * the riveted cook. So each set tags its heads with its own number and
 * merges them in (`heads`); ONE query tests them all (`off`); each set
 * takes its own back out by number.
 */
interface PlateQuery {
  readonly heads: NodeHandle;
  readonly off: NodeHandle;
  sets: number;
}
const PLATE_QUERIES = new WeakMap<Graph, PlateQuery>();

function plateQueryOf(g: Graph, cloud: NodeHandle): PlateQuery {
  let q = PLATE_QUERIES.get(g);
  if (q === undefined) {
    const heads = g.add(mergePoints, {}, "lacingHeadsOnPlates");
    const near = g.add(
      sampleNearestPoint,
      { distanceAttr: PLATE_DIST, indexAttr: "", maxDistance: PLATE_CLEAR * 2 },
      "lacingHeadsPlates",
    );
    const off = g.add(filterByExpression, { predicate: gt(attribute(PLATE_DIST), PLATE_CLEAR) }, "lacingHeadsOffPlates");
    g.connect(heads, "out", near, "in");
    g.connect(cloud, "out", near, "source");
    g.connect(near, "out", off, "in");
    q = { heads, off, sets: 0 };
    PLATE_QUERIES.set(g, q);
  }
  return q;
}

/**
 * Heads that no strut brought (a splice's covers, `builtup.ts`), kept off
 * the tower's joint plates as the lacing is: a head within
 * {@link PLATE_CLEAR} of the plates' cloud goes. Where a joint plate laps a
 * face the model's plate stands 8 mm off the web, over a cover 12-15 mm
 * thick (D3 of the built-up study, SOURCES.md §27): the heads under it
 * would stand in it. They arrive aimed and keep their aim.
 *
 * Asked in a query of their own, not the lacing's shared one
 * (`plateQueryOf`): there every set takes its heads back out by number
 * with a pass over ALL the query's heads, so 100,000 more heads there cost
 * every lacing set a pass over them (+2.7 s on the riveted cook for the
 * splices' 290,000); a second index over the cloud costs a tenth of that
 * [measured, interleaved runs].
 */
export function offJointPlates(g: Graph, id: string, heads: readonly NodeHandle[]): NodeHandle {
  const all = g.add(mergePoints, {}, `${id}Heads`);
  for (const h of heads) g.connect(h, "out", all, "in");
  const near = g.add(
    sampleNearestPoint,
    { distanceAttr: PLATE_DIST, indexAttr: "", maxDistance: PLATE_CLEAR * 2 },
    `${id}Plates`,
  );
  // A regional build (region.ts) asks only about its own cell's heads: the
  // plates' cloud it asks against is the cell's.
  g.connect(gatePoints(g, `${id}HeadsGate`, all, REGION_HALO.heads), "out", near, "in");
  g.connect(plateCloudOf(g).cloud, "out", near, "source");
  const off = g.add(filterByExpression, { predicate: gt(attribute(PLATE_DIST), PLATE_CLEAR) }, `${id}OffPlates`);
  g.connect(near, "out", off, "in");
  const done = g.add(removeAttribute, { names: [PLATE_DIST], domain: "point" }, `${id}OffDone`);
  g.connect(off, "out", done, "in");
  return done;
}

/** A head's move out along its own facing after the plate test (`throughHeads`), a primitive attribute on its row. */
export const THROUGH_HALF = "throughHalf";

/**
 * The two heads of a rivet through a leg, laid together on the leg's
 * centre plane (so `offJointPlates` keeps both or neither), moved out to
 * the leg's two faces: each by its row's {@link THROUGH_HALF} along its own
 * facing ({@link FACE_NORMAL}). Heads whose row carries 0 stay put.
 */
export function throughHeads(g: Graph, id: string, heads: NodeHandle): NodeHandle {
  const moved = g.add(
    transformPoints,
    { translate: mul(attribute(FACE_NORMAL, 3), attribute(THROUGH_HALF)) },
    `${id}Through`,
  );
  g.connect(heads, "out", moved, "in");
  const done = g.add(removeAttribute, { names: [THROUGH_HALF], domain: "point" }, `${id}ThroughDone`);
  g.connect(moved, "out", done, "in");
  return done;
}

/** The joint-plate cloud's step along each plate's centre line. */
const PLATE_CLOUD_STEP = 0.1;
/**
 * Points across each plate in its cloud: 13 over the widest joint plate,
 * 0.96 m, are 0.08 apart [derived].
 */
const PLATE_CLOUD_ACROSS = 13;
/**
 * How near a lacing head may come to a joint plate's cloud: half the
 * cloud's widest cell diagonal, so a head anywhere over a plate finds a
 * sample within it, plus the half-thickness and the jitter [derived:
 * hypot(0.1, 0.08) / 2 + 0.004 + 0.002]. A head up to that far outside a
 * plate's edge goes too, where the lacing would end at the plate.
 */
export const PLATE_CLEAR = 0.07;
/** A joint plate's full width, as a vector across it, on its centre line. */
const PLATE_ACROSS = "plateAcross";

/** A lacing step for the members whose mean height lies in [from, to). */
export interface LacingBand {
  readonly from: number;
  readonly to: number;
  readonly step: number;
}

/**
 * The lacing step Eiffel's struts show, by the strut's outer half-width
 * [estimated, measured on the plates]: 1.00 m in the 800 struts (PL-IX
 * Fig. 8 at 1:100, the crossings of the mid horizontal about 61 px apart
 * at 61 px/m; PL-VII panel 2 agrees), about 0.94 m in the 600 shaft
 * horizontals (PL-VII Fig. 3, node X: 64 px at about 67 px/m; an earlier
 * reading gave 0.92) and 0.66-0.69 m in the 500 struts (PL-VII Fig. 3,
 * panel 19). So the lacing bars run about 35 degrees off the axis in the
 * 800 struts, not 45.
 */
export const LACING_STEP: ReadonlyArray<readonly [number, number]> = [
  [0.25, 0.68],
  [0.3, 0.94],
  [0.4, 1.0],
];

/**
 * How far a plate runs along its member past the joint start, in strut
 * half-widths (`JointOpts.reach`), for the legs' and shaft's members
 * [estimated from PL-IX's Gousset A at 1:50 and PL-VII Fig. 3]: a
 * diagonal's chords end on the plate in groups of 5-6 rivets about 0.08
 * apart, about 0.5 m of overlap, 1.5 half-widths of an 800 strut; a
 * horizontal's run 7-8 rivets over about 1 m, and its plate ends 1.423 m
 * from the upright's axis (PL-IX) or 0.90-1.00 (PL-VII Fig. 3, the 600
 * shaft horizontals), which 2.2 half-widths past the joint start gives.
 */
export const JOINT_REACH = { diagonal: 1.5, horizontal: 2.2 } as const;

/**
 * Web members at the requested detail: solid square members of the given
 * outer half-width, or laced struts whose chords sit just inside it, with
 * their rivets as a spawner when `detail.rivets` asks (which implies the
 * lacing: a rivet is where a lacing bar meets a chord).
 */
export function webMembers(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  detail: Detail,
  joints?: JointOpts,
  opts: WebOpts = {},
): WebMembers {
  const riveted = detail.rivets === true;
  const alongB = opts.halfB ?? outer;
  if (detail.lacedWeb !== true && !riveted) {
    return {
      meshes: [opts.halfB === undefined ? faceSkin(g, id, paths, outer) : faceBox(g, id, paths, outer, opts.halfB)],
    };
  }
  const { plateLines, ...ends } =
    joints === undefined
      ? { plateLines: undefined }
      : memberJoints(g, id, paths, outer, joints, riveted, alongB);
  // A member with joints is a strut only between them: its ends stop where
  // its joint starts, just clear of the upright, and the gusset plates
  // cover the rest. Running it axis to axis put its lacing (and lacing
  // rivets) inside the upright's box — up to 15% of them in the shaft.
  const members =
    joints === undefined ? paths : trimToJoints(g, id, paths, alongB, joints);
  const struts = latticeStruts(g, id, members, {
    halfWidth: outer.map(([y, w]) => [y, w - CHORD] as const),
    ...(opts.halfB === undefined ? {} : { halfWidthB: opts.halfB.map(([y, w]) => [y, w - CHORD] as const) }),
    chord: CHORD,
    lacing: LACE,
    pitch: 1,
    rivets: riveted,
    ...(opts.lacingStep === undefined
      ? {}
      : { step: opts.lacingStep.map(([w, s]) => [w - CHORD, s] as const) }),
    ...(opts.lacingBands === undefined ? {} : { stepBands: opts.lacingBands }),
    ...(opts.covers === undefined || opts.covers.length === 0 ? {} : { covers: opts.covers }),
    ...(riveted ? { plateCloud: plateCloudOf(g).cloud } : {}),
    ...(opts.keepHeads === undefined ? {} : { keepHeads: opts.keepHeads }),
  });
  if (plateLines !== undefined) g.connect(plateLines, "out", plateCloudOf(g).lines, "in");
  return {
    meshes: [struts.chords, struts.lacing],
    ...(struts.rivets === undefined ? {} : { rivets: struts.rivets }),
    ...ends,
  };
}

/**
 * A gusset plate's thickness [sourced PL-IX: "Gousset G (8 m/m)",
 * "Attache 8 m/m", and "8 m/m" at gussets A and E of Fig. 8; PL-VII prints
 * "Ep. 10" on the panel-5 gusset].
 */
const PLATE = 0.008;
/**
 * The joint's clearance past the upright's face [estimated]: past what
 * stands out of it too, where the upright's table says so (the lower
 * uprights' channels, `builtup.ts`, `jointUpright`).
 */
const CLEAR = 0.05;
/** A plate runs this many strut half-widths along its member [estimated]. */
const PLATE_REACH = 3;
/** The point attribute a plate target carries its span in (near, far, width). */
const GUSSET_SPAN = "gussetSpan";
/** A member's two rivet windows along it: (from, to) at its first end, then its second. */
const JOINT_WINDOW = "jointWindow";
/** Rivets along a chord over a plate, every this far [estimated, as the seams]. */
export const JOINT_PITCH = 0.1;

/**
 * How far along a member, from its end `end` (0 first, 1 second), its
 * joint starts: clear of the upright's box. A point a along the member and
 * w off its axis (a chord's rivet row) is a sin(t) - w cos(t) from the
 * upright's axis, t being the angle the member meets it at (`endSin`) — so
 * a steep diagonal is still inside the box well past r along its own
 * length. Solved for the upright's half-width plus a margin; the sine is
 * clamped, so a member all but parallel to its upright does not run away.
 */
function jointStart(
  outer: ReadonlyArray<readonly [number, number]>,
  joints: JointOpts,
  end: 0 | 1,
): Field {
  const y = component(position(), 1);
  const w = sub(ramp(y, outer), CHORD);
  const sine = endSineAt(joints, end, joints.kinks === true);
  const cosine = sqrt(sub(1, mul(sine, sine)));
  const r = joints.uprightAt ?? ramp(y, joints.upright);
  return div(add(add(r, CLEAR), mul(add(w, CHORD), cosine)), sine);
}

/**
 * A member's end sine at one end, clamped to its set's minimum: against
 * the column's bisector, or with `least` against the closest of the lines
 * the column runs along there.
 */
function endSineAt(joints: JointOpts, end: 0 | 1, least = false): Field {
  const sine = component(attribute(least ? END_SINE_MIN : END_SINE, 2), end);
  return max(sine, joints.minSine ?? 0.25);
}

/** 1 where a member's end `end` takes a joint, 0 where it stops free ({@link JOINT_ENDS}). */
function endFlag(end: 0 | 1): Field {
  return component(attribute(JOINT_ENDS, 2), end);
}

/**
 * Shorten every member to the stretch between its joints: each end moves
 * in along the member to where its joint starts. The members of an edge
 * rule share their end points, so each is first resampled onto two points
 * of its own (carrying its primitive attributes, `faceN` and `endSin`).
 */
function trimToJoints(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  joints: JointOpts,
): NodeHandle {
  const own = g.add(pathResample, { mode: "count", count: 2 }, `${id}Own`);
  const first = lt(attribute("curveU"), 0.5);
  const T = attribute("tangent", 3);
  // A free end (JointOpts.endFlags) is not trimmed.
  const at = (end: 0 | 1): Field =>
    joints.endFlags === true
      ? mul(jointStart(outer, joints, end), endFlag(end))
      : jointStart(outer, joints, end);
  const moved = g.add(
    transformPoints,
    {
      translate: select(first, mul(T, at(0)), mul(T, mul(at(1), -1))),
    },
    `${id}Trimmed`,
  );
  g.connect(paths, "out", own, "in");
  g.connect(own, "out", moved, "in");
  return moved;
}

/**
 * THE JOINTS. Every web member ends on an upright, and at each end a pair
 * of gusset plates takes it: one either side of the member's face plane,
 * just outside the chords on that side. A plate runs from the upright's
 * face to `reach` half-widths past the joint start (where the strut itself
 * begins): on PL-IX's Gousset A the plate is riveted over the upright's
 * flange and fills the wedge between it and the members, out to 1.298 m
 * from the upright's axis along a flat diagonal and 1.423 m along the
 * horizontal [sourced]. A rectangle cannot follow the face, so its near
 * edge is placed where its obtuse corner meets the upright's face: the
 * rest of that edge is inside the upright's box, and at a corner
 * (`JointOpts.corners`) the plate narrows so that its acute corner stops
 * short of the next face's plates. The plate lies just
 * outside the upright's faces parallel to it: 8 mm off the lower uprights'
 * webs (an 800 strut is 16 mm deeper than their lozenge, 0.784 square to
 * the lattice plane in panels 1-4), where it meets what stands out of them
 * (`builtup.ts`, `jointFace`), and on or near the 0.50 boxes' faces above. The plates of the members meeting at a node overlap
 * into the irregular gusset a real joint has, without the node needing to
 * know who meets it: each member brings its own.
 *
 * On each plate, the two chords that lie against it are riveted to it in
 * a row along the chord, every JOINT_PITCH from the joint start over the
 * plate's reach — never nearer the upright than the joint start, which is
 * what keeps every joint rivet out of the upright's box. The
 * members' ends are found by field, not by table: a resample reports each
 * sample's arc position and the member's length, and a sample is a joint
 * rivet when it is within reach of EITHER end.
 */
function memberJoints(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  joints: JointOpts,
  riveted: boolean,
  /** The outer half-width along B (`WebOpts.halfB`); `outer` for a square. */
  alongB: ReadonlyArray<readonly [number, number]> = outer,
): { gussets: NodeHandle; jointRivets?: NodeHandle; plateLines?: NodeHandle } {
  const y = component(position(), 1);
  const w = sub(ramp(y, outer), CHORD);
  const wB = sub(ramp(y, alongB), CHORD);
  const clearAt = (end: 0 | 1): Field => jointStart(alongB, joints, end);
  const reach = mul(w, joints.reach ?? PLATE_REACH);
  const T = attribute("tangent", 3);
  const F = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(F, mul(T, dot(F, T))));
  const B = cross(N, T);
  const off = add(w, CHORD);

  // Plates: one target per member end and side; the box's local x runs
  // along the member (into it), y across the face (N), z along B.
  const tips = g.add(pathResample, { mode: "count", count: 2 }, `${id}Tips`);
  g.connect(paths, "out", tips, "in");
  const into = mul(T, sub(1, mul(attribute("curveU"), 2)));
  // curveU is 0 at a member's first end and 1 at its second.
  const first = lt(attribute("curveU"), 0.5);
  // Plates only at the ends that take a joint (JointOpts.endFlags).
  // The plates are cooked for the region (region.ts); the windows below
  // read every tip, because the joint samples resampled from them are
  // array-seeded and gated only after.
  const regionTips = gatePaths(g, `${id}TipsGate`, tips, REGION_HALO.tips);
  let plateTips: NodeHandle = regionTips;
  if (joints.endFlags === true) {
    plateTips = g.add(
      filterByExpression,
      { predicate: ge(select(first, endFlag(0), endFlag(1)), 0.5) },
      `${id}PlateTipsJoined`,
    );
    g.connect(regionTips, "out", plateTips, "in");
  }
  const start = select(first, clearAt(0), clearAt(1));
  // The plate covers the chords' extent along B (a square's is its width)
  // and a margin.
  const coveredB = add(wB, CHORD);
  const across = add(coveredB, 0.08);
  const shape = (end: 0 | 1): { half: Field; near: Field } => {
    const r = joints.uprightAt ?? ramp(y, joints.face ?? joints.upright);
    // The near edge, along the member from the node: where a point `half`
    // off the axis on the obtuse side reaches the upright's face,
    // (r - half cos t) / sin t, and never behind the node; t against the
    // column's bisector.
    const onFace = (half: Field, sine: Field): Field =>
      div(sub(r, mul(half, sqrt(sub(1, mul(sine, sine))))), sine);
    const bisector = endSineAt(joints, end);
    if (joints.corners !== true) return { half: across, near: max(onFace(across, bisector), 0) };
    // At a corner the near edge's acute corner, 2 half cos t - r beyond
    // the axis, stops at `far`, where the plate meets the next face's:
    // a leg's diagonals meet its outer corner at about 35 degrees below
    // XVII, and their plates ran 7 cm past the arris and crossed the other
    // face's there. So the plate narrows, down to the chords' extent, and
    // where even that is too wide it starts further out,
    // (half cos t - far) / sin t, its obtuse corner then short of the face.
    // Here t is against the line the two faces' plates meet along, the
    // column's chord over the member's band (`END_CORNER`): where the
    // column kinks the bisector is a few degrees off it, and the acute
    // corner overshot by a centimetre. The obtuse corner is held clear in
    // both frames, so it stands no nearer the upright than it did.
    const band = max(component(attribute(END_CORNER, 4), end + 2), joints.minSine ?? 0.25);
    const cosine = sqrt(sub(1, mul(band, band)));
    const far = cornerReach(end);
    const half = max(min(across, div(add(r, far), mul(max(cosine, 1e-6), 2))), coveredB);
    const short = div(sub(mul(half, cosine), far), band);
    return { half, near: max(max(max(onFace(half, bisector), onFace(half, band)), short), 0) };
  };
  // How far past the column's axis, across the face away from the member,
  // a plate can reach before it meets the plate on the next face, its
  // inner face (`off` out) against the other's: (off (1 - c) - PLATE c) /
  // sqrt(1 - c^2), for c the cosine between the faces. Out of reach where
  // the faces lie in one plane (a post at a face centre) or there is no
  // next face, c near 1.
  const cornerReach = (end: 0 | 1): Field => {
    const c = component(attribute(END_CORNER, 4), end);
    const reachTo = div(sub(mul(off, sub(1, c)), mul(PLATE, c)), sqrt(max(sub(1, mul(c, c)), 1e-6)));
    return select(gt(c, 0.95), 1e3, reachTo);
  };
  const [end0, end1] = [shape(0), shape(1)];
  // The span (near edge, far edge, width) is fixed at the tips, before the
  // plates move: their size is set after the move, where position() is no
  // longer the member's end and would read the tables elsewhere.
  const span = g.add(
    setAttribute,
    {
      name: GUSSET_SPAN,
      type: "f32",
      tupleSize: 3,
      value: vec(select(first, end0.near, end1.near), add(start, reach), mul(select(first, end0.half, end1.half), 2)),
    },
    `${id}PlateSpan`,
  );
  g.connect(plateTips, "out", span, "in");
  const spanOf = attribute(GUSSET_SPAN, 3);
  const plateSides = [1, -1].map((side) => {
    const name = `${id}Plate${side > 0 ? "Out" : "In"}`;
    const at = g.add(
      transformPoints,
      {
        translate: add(
          mul(into, mul(add(component(spanOf, 0), component(spanOf, 1)), 0.5)),
          mul(N, mul(add(off, PLATE / 2), side)),
        ),
      },
      name,
    );
    const aim = g.add(orientAlongVector, { direction: into, up: N, axis: "+x" }, `${name}Aim`);
    g.connect(span, "out", at, "in");
    g.connect(at, "out", aim, "in");
    return aim;
  });
  const targets = g.add(mergePoints, {}, `${id}PlateTargets`);
  for (const p of plateSides) g.connect(p, "out", targets, "in");
  const sized = g.add(
    setAttribute,
    {
      name: "scale",
      type: "f32",
      tupleSize: 3,
      value: vec(sub(component(spanOf, 1), component(spanOf, 0)), PLATE, component(spanOf, 2)),
    },
    `${id}PlateSize`,
  );
  // The unit box writes its faces' own normals, and the copy turns them by
  // each plate's `rot` (a box scaled along its own axes keeps its face
  // normals): without them the class merge filled zeros, which the page
  // had to repair.
  const unit = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1], normals: true }, `${id}PlateUnit`);
  const plates = g.add(copyToPoints, { topology: "keep", rotateAttrs: ["normal"] }, `${id}Gussets`);
  g.connect(targets, "out", sized, "in");
  g.connect(unit, "out", plates, "source");
  g.connect(sized, "out", plates, "target");
  if (!riveted) return { gussets: plates };

  // Each plate's centre line, carrying its width across it, for the
  // tower's lacing to keep off (`plateCloudOf`): a unit segment along the
  // unit box's local x, which the copy scales to the plate's length.
  const withAcross = g.add(
    setAttribute,
    { name: PLATE_ACROSS, type: "f32", tupleSize: 3, value: mul(B, component(spanOf, 2)) },
    `${id}PlateAcross`,
  );
  g.connect(sized, "out", withAcross, "in");
  const unitEnds = g.add(
    pointGrid,
    { countX: 2, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [-0.5, 0, 0] },
    `${id}PlateUnitEnds`,
  );
  const segment = g.add(pointsToPath, {}, `${id}PlateUnitLine`);
  g.connect(unitEnds, "out", segment, "in");
  const lines = g.add(copyToPoints, { topology: "keep", targetNames: [PLATE_ACROSS] }, `${id}PlateLines`);
  g.connect(segment, "out", lines, "source");
  g.connect(withAcross, "out", lines, "target");

  // Rivets: samples within reach of either end, on both plates' chords.
  // Each end's window [joint start, + reach] is read ONCE, at that end (the
  // tips), and lifted onto the member: read at every sample instead, a
  // table that steps along the member (the upright's at XVII, the merge at
  // XI) slid the window off the strut's trimmed start, leaving heads on
  // the plate with no chord under them.
  // With free ends, the other end's slots and a free end's own window are
  // -1: the max below keeps a joined end's window and leaves a free end's
  // at [-1, -1], which no arc position reaches.
  const windowValue =
    joints.endFlags === true
      ? select(
          first,
          select(ge(endFlag(0), 0.5), vec(clearAt(0), add(clearAt(0), reach), -1, -1), vec(-1, -1, -1, -1)),
          select(ge(endFlag(1), 0.5), vec(-1, -1, clearAt(1), add(clearAt(1), reach)), vec(-1, -1, -1, -1)),
        )
      : select(
          first,
          vec(clearAt(0), add(clearAt(0), reach), 0, 0),
          vec(0, 0, clearAt(1), add(clearAt(1), reach)),
        );
  const windowAt = g.add(
    setAttribute,
    { name: JOINT_WINDOW, type: "f32", tupleSize: 4, value: windowValue },
    `${id}JointWindowAt`,
  );
  const window = g.add(
    promoteAttribute,
    { name: JOINT_WINDOW, from: "point", to: "primitive", mode: "max" },
    `${id}JointWindow`,
  );
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: JOINT_PITCH, sampleArcAttr: "arc", lengthAttr: "memberLen" },
    `${id}JointSamples`,
  );
  const len = g.add(
    promoteAttribute,
    { name: "memberLen", from: "primitive", to: "point", mode: "first" },
    `${id}JointLen`,
  );
  const arc = attribute("arc");
  const fromEnd = sub(attribute("memberLen"), arc);
  const win = attribute(JOINT_WINDOW, 4);
  const within = (a: Field, lo: Field, hi: Field) => mul(ge(a, lo), le(a, hi));
  const near = g.add(
    filterByExpression,
    {
      predicate: max(
        within(arc, component(win, 0), component(win, 1)),
        within(fromEnd, component(win, 2), component(win, 3)),
      ),
    },
    `${id}JointNear`,
  );
  // The tips are the members' own two ends, so resampling them is
  // resampling the members.
  g.connect(tips, "out", windowAt, "in");
  g.connect(windowAt, "out", window, "in");
  g.connect(window, "out", samples, "in");
  g.connect(samples, "out", len, "in");
  g.connect(gatePoints(g, `${id}JointSamplesGate`, len, REGION_HALO.samples), "out", near, "in");
  const heads = [1, -1].flatMap((side) =>
    [1, -1].map((chord) => {
      const out = mul(N, side);
      const name = `${id}Joint${side > 0 ? "Out" : "In"}${chord > 0 ? "P" : "M"}`;
      const at = g.add(
        transformPoints,
        { translate: add(mul(B, mul(wB, chord)), mul(out, add(off, PLATE))) },
        name,
      );
      const aim = g.add(orientAlongVector, { direction: out, up: T, axis: "+y" }, `${name}Aim`);
      g.connect(near, "out", at, "in");
      g.connect(at, "out", aim, "in");
      return aim;
    }),
  );
  return { gussets: plates, jointRivets: rivetSpawn(g, `${id}Joint`, heads), plateLines: lines };
}

/** Name the rivet spawners of several web-member sets, skipping the rivetless. */
export function rivetOutputs(
  sets: Record<string, WebMembers>,
): Array<{ name: string; spawn: NodeHandle }> {
  const out: Array<{ name: string; spawn: NodeHandle }> = [];
  for (const [name, set] of Object.entries(sets)) {
    if (set.rivets !== undefined) out.push({ name, spawn: set.rivets });
    if (set.jointRivets !== undefined) out.push({ name: `${name}.joints`, spawn: set.jointRivets });
  }
  return out;
}

/**
 * Rivets along given LINES rather than along a member: a head every
 * `pitch` on each path of `lines`, standing `out` off it along the line's
 * own face normal and pointing that way.
 *
 * This is the rivet a plate takes that no member brought: a crossing plate
 * is fastened by rows round its own edge, not by a chord running under it,
 * so the row is a line of the plate's making. Each line therefore carries
 * the OUTWARD normal of the plate it borders — both plates of a pair
 * cannot share one, or the inner plate's heads would sink into the
 * lattice — and `out` is measured from the line to the face the heads sit
 * on, which for a line drawn on the plate's mid-plane is half its
 * thickness.
 */
export function lineRivets(
  g: Graph,
  id: string,
  lines: NodeHandle,
  out: number,
  pitch: number,
): NodeHandle {
  return rivetSpawn(g, id, [lineHeads(g, id, lines, out, pitch)]);
}

/**
 * `lineRivets`' heads before they are spawned: for rows of several pitches
 * that make one rivet set (a splice's covers, `builtup.ts`), each pitch its
 * own lines, merged by one `rivetSpawn`.
 */
export function lineHeads(
  g: Graph,
  id: string,
  lines: NodeHandle,
  out: number,
  pitch: number,
): NodeHandle {
  const samples = g.add(pathResample, { mode: "spacing", spacing: pitch }, `${id}Samples`);
  const N = attribute(FACE_NORMAL, 3);
  const at = g.add(transformPoints, { translate: mul(N, out) }, `${id}At`);
  const aim = g.add(
    orientAlongVector,
    { direction: N, up: attribute("tangent", 3), axis: "+y" },
    `${id}Aim`,
  );
  g.connect(lines, "out", samples, "in");
  g.connect(samples, "out", at, "in");
  g.connect(at, "out", aim, "in");
  return aim;
}

/** The gusset meshes of several web-member sets, skipping the jointless. */
export function gussetMeshes(sets: readonly WebMembers[]): NodeHandle[] {
  return sets.flatMap((set) => (set.gussets === undefined ? [] : [set.gussets]));
}

/**
 * The uprights' seam rows: a rivet every 0.125 m [estimated, measured on
 * PL-IX's Gousset A at 1:50, scaled by its printed 800 and 1.423 (310-318
 * px/m): the arbalétrier's flange rows repeat every 40.4 px, 0.127-0.130,
 * and a histogram of the same sheet's rings clusters at 37.8 px, 0.122;
 * the printed "88,5" is drawn too wide to scale by], 55 mm in from the
 * corner, the middle of a 100 mm angle's leg [derived from the 100 x 100
 * corner angles].
 */
export const UPRIGHT_SEAMS = { pitch: 0.125, inset: 0.055 } as const;

/**
 * Seam rivets along closed box members — the uprights, which are plate
 * boxes with an angle in each corner (Plate XXXI's section tables). Each
 * corner angle is riveted to the two plates it joins: a row on each face,
 * `inset` in from the corner, every `pitch` along the member. The rows
 * follow the member's own square section, which the skin squares to the
 * projection of `up` (so a face normal is N = up made perpendicular to the
 * member, and B = T x N): rivets and plates cannot disagree. `up` is a
 * constant for the uprights and a field for members squared to their own
 * leaning faces (the girder chords pass their face normal).
 *
 * `skipStart` drops each path's first row: a member that stands on a wider
 * one (the 0.50 upright on the built-up box below node XVII) starts at the plane
 * where the wider one ends, so its first row would sit half inside it.
 */
export function seamRivets(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  up: readonly [number, number, number] | Field,
  opts: {
    readonly pitch: number;
    readonly inset: number;
    readonly skipStart?: boolean;
    /** A predicate over the samples: rows only where it holds. */
    readonly keep?: Field;
  },
): NodeHandle {
  const resampled = g.add(
    pathResample,
    { mode: "spacing", spacing: opts.pitch },
    `${id}SeamSamples`,
  );
  g.connect(paths, "out", resampled, "in");
  let samples: NodeHandle = resampled;
  const afterStart = opts.skipStart === true ? ge(attribute("curveU"), 1e-6) : undefined;
  const predicate =
    afterStart !== undefined && opts.keep !== undefined
      ? mul(afterStart, opts.keep)
      : (afterStart ?? opts.keep);
  if (predicate !== undefined) {
    samples = g.add(filterByExpression, { predicate }, `${id}SeamSamplesKept`);
    g.connect(resampled, "out", samples, "in");
  }
  const r: FieldLike =
    typeof halfWidth === "number" ? halfWidth : ramp(component(position(), 1), halfWidth);
  const T = attribute("tangent", 3);
  // A constant up (the uprights, squared to the tower's faces) or a field:
  // a member's own face normal, the one its skin is squared to.
  const U: FieldLike = isVec3(up) ? vec(up[0], up[1], up[2]) : up;
  const N = normalize(sub(U, mul(T, dot(U, T))));
  const B = cross(T, N);
  const rows = CORNERS.flatMap(([sn, sb], c) =>
    (
      [
        // On the N face: out along sn N, in from the corner along B.
        ["N", mul(N, sn), mul(B, sb)],
        // On the B face: out along sb B, in from the corner along N.
        ["B", mul(B, sb), mul(N, sn)],
      ] as const
    ).map(([side, out, along]) => {
      const at = g.add(
        transformPoints,
        { translate: add(mul(out, r), mul(along, sub(r, opts.inset))) },
        `${id}Seam${c}${side}`,
      );
      const aim = g.add(
        orientAlongVector,
        { direction: out, up: T, axis: "+y" },
        `${id}Seam${c}${side}Aim`,
      );
      g.connect(samples, "out", at, "in");
      g.connect(at, "out", aim, "in");
      return aim;
    }),
  );
  return rivetSpawn(g, `${id}Seam`, rows);
}

function isVec3(v: readonly [number, number, number] | Field): v is readonly [number, number, number] {
  return Array.isArray(v);
}

/**
 * Merge rivet point sets, size them, and spawn them. EXPORTED, and it has
 * to stay exported: `summit.ts` held a character-identical private copy of
 * this until the jitter below landed on one of them and not the other, and
 * seven rivet outputs quietly kept their coplanar rims.
 *
 * Rivets fork off the resample samples before anything is skinned, so
 * they never reach the mesh classes and `assemble` cannot jitter them:
 * this is their own hook. A rivet head is a dome standing ON the plate it
 * fastens and TANGENT to it at its rim, which is the coplanar case again,
 * and a ring of it z-fights the plate at every head. The head does not
 * FOLLOW its chord — the two are jittered by different nodes — so the
 * seating moves by up to two millimetres rather than the one the steel
 * moves alone; against a 19 mm head that is a tenth of its radius, and a
 * rivet is half sunk in its plate to begin with.
 *
 * And each head is DRIVEN: it carries one draw, {@link HEAD_DRIVE_ATTR},
 * from its own identity (`randomField`: its position with its seed) as a
 * per-instance channel, and the page leans, turns, sizes and seats it by
 * that draw in its own frame (heads.ts). The instance transform stays the
 * rule's.
 */
export function rivetSpawn(g: Graph, id: string, sets: readonly NodeHandle[]): NodeHandle {
  const all = g.add(mergePoints, {}, `${id}Rivets`);
  // In a regional build (region.ts) every set is cut to its cell before the
  // merge, so a set no gate upstream has cut costs the cell a filter and
  // not the tower's jitter; the clip below, after the jitter, is the seam.
  sets.forEach((h, k) => g.connect(gatePoints(g, `${id}RivetGate${k}`, h, REGION_HALO.heads), "out", all, "in"));
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: RIVET_HEAD },
    `${id}RivetSize`,
  );
  const drive = g.add(
    setAttribute,
    { name: HEAD_DRIVE_ATTR, type: "f32", value: randomField("rivetHead") },
    `${id}RivetDrive`,
  );
  const spawn = g.add(
    spawnInstances,
    { assetId: RIVET_ASSET, instanceAttrs: [HEAD_DRIVE_ATTR] },
    `${id}RivetSpawn`,
  );
  g.connect(jitter(g, `${id}RivetJitter`, all), "out", sized, "in");
  g.connect(sized, "out", drive, "in");
  g.connect(clipHeads(g, `${id}RivetClip`, drive), "out", spawn, "in");
  return spawn;
}

export interface StrutOpts {
  /** Half-width of the strut, to its chords' axes, by height: (y, w) stops. */
  readonly halfWidth: ReadonlyArray<readonly [number, number]>;
  /**
   * The chords' half-width along B, by height, for a rectangular strut
   * (`halfWidth` is then the half-width along N). Default `halfWidth`.
   */
  readonly halfWidthB?: ReadonlyArray<readonly [number, number]>;
  /** Half-width of a chord angle's square section. */
  readonly chord: number;
  /** Half-width of a lacing bar's square section. */
  readonly lacing: number;
  /**
   * Lacing pitch as a multiple of the strut's full width: 1 puts each
   * lacing bar at 45 degrees across its face.
   */
  readonly pitch: number;
  /**
   * The lacing step in metres by the strut's CHORD half-width: (w, step)
   * stops, read once per member from its own section at its mean height.
   * Given, it replaces `pitch`, whose step is one per call.
   */
  readonly step?: ReadonlyArray<readonly [number, number]>;
  /** Steps by the member's mean height, overriding `step` (or `pitch`) inside each band. */
  readonly stepBands?: ReadonlyArray<LacingBand>;
  /** Also spawn a rivet wherever a lacing bar meets a chord, and at every crossing of a face's two zigzags. */
  readonly rivets?: boolean;
  /**
   * Crossing plates over these struts (crossing.ts `crossFootprints`). A
   * crossing plate is set UNDER the corner angles' outer face, covering the
   * lacing between them, so a lacing head (at a chord or at a crossing of
   * the lacing) on a face the plate lies on,
   * within its outline (plus a head's radius), would stand in the plate
   * and beside the plate's own edge rows: none is spawned there. Each
   * section corner's heads are tested where they sit, against the plate
   * whose centre is nearest the sample.
   */
  readonly covers?: readonly PlateFootprint[];
  /** The joint plates' sample points (`plateCloudOf`): no lacing head within {@link PLATE_CLEAR}. */
  readonly plateCloud?: NodeHandle;
  /** Keep only the heads where this predicate is 1 (`WebOpts.keepHeads`). */
  readonly keepHeads?: Field;
}

/** The primitive attribute a member's mean height rides on to its step. */
const STRUT_Y = "strutY";
/** A lacing head's distance to the nearest joint-plate sample (Infinity past its reach). */
const PLATE_DIST = "plateDist";
/** A lacing head's outward axis and its set's number, carried through the tower-wide merge (`plateQueryOf`). */
const RIVET_AXIS = "rivetAxis";
/** The index of the crossing plate nearest a lacing sample, -1 past `COVER_REACH`. */
const COVER_INDEX = "coverIdx";
/**
 * How far a sample looks for a crossing plate's centre: beyond the
 * farthest a covered head can be from it (a post landing's plate is about
 * 0.8 x 1.1 m; the farthest grown corner of any is 1.13 m, the long
 * rhombus over the 27.5-degree X) [derived], so a miss is a sample no
 * plate reaches.
 */
const COVER_REACH = 1.5;

/** The four section corners in ring order, as (sN, sB) sign pairs. */
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/**
 * The four faces in ring order, face f running from corner f to corner
 * f + 1, as the (sN, sB) of its outward normal.
 */
const FACE_OUT = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
] as const;

/**
 * A crossing plate's frame, gathered onto a sample from its nearest plate
 * (`coverFilter`): the centre, the outline's two edge normals and the plane's
 * normal (vectors), and its two half-extents.
 */
const COVER_AT = "coverAt";
const COVER_ALONG = "coverAlong";
const COVER_ACROSS = "coverAcross";
const COVER_N = "coverN";
const COVER_HALF = "coverHalf";
const COVER_HALF_ACROSS = "coverHalfAcross";
/** The frame columns a sample gathers by index; its centre comes with the nearest-point query. */
const COVER_FRAME = [COVER_ALONG, COVER_ACROSS, COVER_N, COVER_HALF, COVER_HALF_ACROSS];

/**
 * Each footprint list's plates as ONE point cloud per graph: a point at
 * each plate's centre, carrying its frame as the {@link COVER_FRAME}
 * columns. Every strut a list covers asks it three times (both B sides'
 * chord heads and the crossings), 27 asks in the tower; each ask used to
 * write the whole list into its own predicate as a table per column, 18%
 * of the riveted graph's ramp stops. Keyed on the list itself: a part
 * hands the same list to every strut it covers.
 *
 * The columns are the footprints' values as f32 literals, one pointList
 * ({@link pointTable}) rather than a ramp per column.
 */
const COVER_CLOUDS = new WeakMap<Graph, Map<readonly PlateFootprint[], NodeHandle>>();

function coverCloudOf(g: Graph, id: string, covers: readonly PlateFootprint[]): NodeHandle {
  let byList = COVER_CLOUDS.get(g);
  if (byList === undefined) {
    byList = new Map();
    COVER_CLOUDS.set(g, byList);
  }
  const known = byList.get(covers);
  if (known !== undefined) return known;
  // Named after the first strut that asks.
  const cloud = pointTable(g, `${id}Plates`, covers.map((c) => c.at), {
    [COVER_ALONG]: ["vec3", covers.map((c) => c.along)],
    [COVER_ACROSS]: ["vec3", covers.map((c) => c.across)],
    [COVER_N]: ["vec3", covers.map((c) => c.n)],
    [COVER_HALF]: ["f32", covers.map((c) => c.half)],
    [COVER_HALF_ACROSS]: ["f32", covers.map((c) => c.halfAcross)],
  });
  byList.set(covers, cloud);
  return cloud;
}

/**
 * Keep the points of `pts` whose `head` (a field of each point: where its
 * rivet would sit) lies outside every plate footprint in `covers`. The
 * footprints are a point cloud of their centres (`coverCloudOf`); each
 * point finds the nearest (crossing plates are metres apart, and where two
 * families cross at one point only one plate is built), gathers that
 * plate's frame by index, and is dropped when the head is within the
 * outline (two strips' overlap: a rectangle, or an X's rhombus), grown by
 * a head's radius, and near the plate's plane.
 */
function coverFilter(
  g: Graph,
  id: string,
  pts: NodeHandle,
  covers: readonly PlateFootprint[],
  head: Field,
): NodeHandle {
  const plates = coverCloudOf(g, id, covers);
  const near = g.add(
    sampleNearestPoint,
    { distanceAttr: "", indexAttr: COVER_INDEX, attribute: "P", outAttribute: COVER_AT, maxDistance: COVER_REACH },
    `${id}Near`,
  );
  g.connect(pts, "out", near, "in");
  g.connect(plates, "out", near, "source");
  // A miss (-1) reads plate 0 and is kept below whatever that reads.
  const frame = g.add(
    transferByIndex,
    { index: attribute(COVER_INDEX), attributes: COVER_FRAME },
    `${id}Frame`,
  );
  g.connect(near, "out", frame, "in");
  g.connect(plates, "out", frame, "source");
  const i = attribute(COVER_INDEX);
  const d = sub(head, attribute(COVER_AT, 3));
  const inside = mul(
    mul(
      lt(abs(dot(d, attribute(COVER_ALONG, 3))), add(attribute(COVER_HALF), RIVET_HEAD)),
      lt(abs(dot(d, attribute(COVER_ACROSS, 3))), add(attribute(COVER_HALF_ACROSS), RIVET_HEAD)),
    ),
    // Near the plane: the struts' own half-depth is under 0.45 everywhere.
    lt(abs(dot(d, attribute(COVER_N, 3))), 0.5),
  );
  const keep = g.add(
    filterByExpression,
    { predicate: max(lt(i, 0), sub(1, mul(ge(i, 0), inside))) },
    `${id}Keep`,
  );
  const done = g.add(
    removeAttribute,
    { names: [COVER_INDEX, COVER_AT, ...COVER_FRAME], domain: "point" },
    `${id}Done`,
  );
  g.connect(frame, "out", keep, "in");
  g.connect(keep, "out", done, "in");
  return done;
}

/**
 * Turn member paths into laced struts. Returns the chords' and the
 * lacing's meshes separately (they differ by an order of magnitude in
 * section, so a class may want to hold only one).
 */
export function latticeStruts(
  g: Graph,
  id: string,
  paths: NodeHandle,
  o: StrutOpts,
): { chords: NodeHandle; lacing: NodeHandle; rivets?: NodeHandle } {
  const y = component(position(), 1);
  const w = ramp(y, o.halfWidth);
  const wB = o.halfWidthB === undefined ? w : ramp(y, o.halfWidthB);
  // Without a step table the resample step is uniform per call, so it
  // takes the strut's widest section: 2 * max w * pitch. With one, the
  // step is a field on the PATHS (a resample reads its spacing once per
  // path): each member's mean height is lifted onto its primitive, and the
  // step read from its own section there.
  const widest = Math.max(...o.halfWidth.map((s) => s[1]));
  let source = paths;
  let spacing: FieldLike = 2 * widest * o.pitch;
  if (o.step !== undefined || (o.stepBands !== undefined && o.stepBands.length > 0)) {
    const tag = g.add(
      setAttribute,
      { name: STRUT_Y, type: "f32", value: component(position(), 1) },
      `${id}StrutY`,
    );
    const lift = g.add(
      promoteAttribute,
      { name: STRUT_Y, from: "point", to: "primitive", mode: "average" },
      `${id}StrutYLift`,
    );
    const drop = g.add(
      removeAttribute,
      { names: [STRUT_Y], domain: "point" },
      `${id}StrutYDone`,
    );
    g.connect(paths, "out", tag, "in");
    g.connect(tag, "out", lift, "in");
    g.connect(lift, "out", drop, "in");
    source = drop;
    const Y = attribute(STRUT_Y);
    let base: FieldLike =
      o.step === undefined ? spacing : max(ramp(ramp(Y, o.halfWidth), o.step), 0.05);
    // Later bands win where they overlap; outside every band, the base.
    for (const band of o.stepBands ?? []) {
      base = select(mul(ge(Y, band.from), lt(Y, band.to)), band.step, base);
    }
    spacing = base;
  }
  const samples = g.add(pathResample, { mode: "spacing", spacing }, `${id}Samples`);
  g.connect(source, "out", samples, "in");
  // A regional build (region.ts) is cooked for its cell only past here.
  // The gate stands AFTER the resample, whose seeds are array-indexed:
  // before it, it would renumber every later sample.
  const inRegion = gatePaths(g, `${id}SamplesGate`, samples, REGION_HALO.samples);

  const T = attribute("tangent", 3);
  const F = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(F, mul(T, dot(F, T))));
  const B = cross(N, T);
  const corner = (c: number): Field => {
    const [sn, sb] = CORNERS[c % 4]!;
    return add(mul(N, mul(w, sn)), mul(B, mul(wB, sb)));
  };
  const shifted = (name: string, offset: Field): NodeHandle => {
    const node = g.add(transformPoints, { translate: offset }, `${id}${name}`);
    g.connect(inRegion, "out", node, "in");
    return node;
  };

  const chords = CORNERS.map((_, c) => shifted(`Chord${c}`, corner(c)));
  const phase = mod(index(), 2);
  const lacing = CORNERS.flatMap((_, f) => [
    shifted(`LaceA${f}`, lerp(corner(f), corner(f + 1), phase)),
    shifted(`LaceB${f}`, lerp(corner(f), corner(f + 1), sub(1, phase))),
  ]);
  // The chords and lacing are squared to the strut's face too (they carry
  // its normal from the resample): with the default +y hint a chord box
  // rolls up to 40 degrees off the face its rivets sit on.
  const meshes = {
    chords: skin(g, `${id}ChordSkin`, merge(g, `${id}Chords`, chords), o.chord, F),
    lacing: skin(g, `${id}LaceSkin`, merge(g, `${id}Lacing`, lacing), o.lacing, F),
  };
  if (o.rivets !== true) return meshes;

  // RIVETS. At every sample each face's two zigzags meet the face's two
  // chords, one each, so every chord takes a lacing end from each of the
  // two faces it borders: two rivets per chord per sample, eight per
  // strut section. Each head sits on its chord's outer face on that side,
  // its axis along the face's outward normal.
  const clear: NodeHandle = inRegion;
  // Per B side (sb), the N-face heads of that side's two corners, kept off
  // the crossing plates. The plates are a pair either side of the face
  // plane, so one test in the plane serves both N faces.
  const uncovered = (sb: number): NodeHandle => {
    if (o.covers === undefined || o.covers.length === 0) return clear;
    return coverFilter(g, `${id}Cover${sb > 0 ? "P" : "M"}`, clear, o.covers, add(position(), mul(B, mul(wB, sb))));
  };
  const clearBySide = new Map<number, NodeHandle>();
  const clearFor = (sb: number): NodeHandle => {
    let h = clearBySide.get(sb);
    if (h === undefined) {
      h = uncovered(sb);
      clearBySide.set(sb, h);
    }
    return h;
  };
  const head = (c: number, side: string, out: Field, from: NodeHandle): NodeHandle => {
    const at = g.add(transformPoints, { translate: add(corner(c), mul(out, o.chord)) }, `${id}Rivet${c}${side}`);
    g.connect(from, "out", at, "in");
    return at;
  };
  const aimed = (name: string, from: NodeHandle, out: Field): NodeHandle => {
    const aim = g.add(orientAlongVector, { direction: out, up: T, axis: "+y" }, `${id}${name}Aim`);
    g.connect(from, "out", aim, "in");
    return aim;
  };
  const bHeads = CORNERS.map(([, sb], c) => aimed(`Rivet${c}B`, head(c, "B", mul(B, sb), inRegion), mul(B, sb)));
  // THE CROSSINGS. A face's two zigzags cross once a bay, half way between
  // two samples on the face's centre line, and the bars are riveted there
  // singly: PL-X Figs. 12-13 (panels 6-9, 1:50) draw one head at every
  // crossing of the 45 x 45 x 5 lacing of the 800 struts [sourced
  // drawing]; every laced strut is taken to be riveted so [inferred].
  // `pathSegments` puts a point at every segment's midpoint — the crossing,
  // on the short last bay too, since both zigzags run corner to corner over
  // the same segment (exact for a constant section; a tapering one moves
  // the true crossing a little off the midpoint, and the head still lands
  // on the bars) — with the segment's tangent, and carries the member's
  // face normal. The head stands on the outer bar, `lacing` off the
  // chords' plane [measured on the swept lacing: 0.0225 on all four faces
  // mid-strut; in a strut's end bays the sweep's frame stands the ±N faces'
  // bars a few mm higher, so the head there is sunk, never lifted].
  const allMids = g.add(pathSegments, { radius: 0 }, `${id}Crossings`);
  g.connect(samples, "out", allMids, "in");
  const mids = gatePoints(g, `${id}CrossingsGate`, allMids, REGION_HALO.samples);
  const crossing = (f: number, from: NodeHandle): NodeHandle => {
    const [sn, sb] = FACE_OUT[f]!;
    const out = add(mul(N, sn), mul(B, sb));
    const at = g.add(
      transformPoints,
      { translate: add(add(mul(N, mul(w, sn)), mul(B, mul(wB, sb))), mul(out, o.lacing)) },
      `${id}Cross${f}`,
    );
    g.connect(from, "out", at, "in");
    return at;
  };
  // The ±N faces' crossings (1 and 3) are kept off the crossing plates as
  // their chord heads are, tested in the strut's mid-plane (both faces at
  // once); the ±B faces carry no crossing plate.
  const midsClear =
    o.covers === undefined || o.covers.length === 0
      ? mids
      : coverFilter(g, `${id}CrossCover`, mids, o.covers, position());
  const crossOut = (f: number): Field => add(mul(N, FACE_OUT[f]![0]), mul(B, FACE_OUT[f]![1]));
  const crossAt = (f: number): NodeHandle => crossing(f, f % 2 === 1 ? midsClear : mids);
  let nHeads: NodeHandle[];
  if (o.plateCloud === undefined) {
    nHeads = [
      ...CORNERS.map(([sn, sb], c) => aimed(`Rivet${c}N`, head(c, "N", mul(N, sn), clearFor(sb)), mul(N, sn))),
      ...FACE_OUT.map((_, f) => aimed(`Cross${f}`, crossAt(f), crossOut(f))),
    ];
  } else {
    // Off every joint plate in the tower (`plateCloudOf`), asked with every
    // other set's heads in one query (`plateQueryOf`): the four N faces'
    // heads carry their own axis and this set's number in, and come back
    // out by number to be aimed.
    const q = plateQueryOf(g, o.plateCloud);
    const set = q.sets++;
    CORNERS.forEach(([sn, sb], c) => {
      const at = head(c, "N", mul(N, sn), clearFor(sb));
      const tag = g.add(
        setAttribute,
        { name: RIVET_AXIS, type: "f32", tupleSize: 4, value: vec(mul(N, sn), set) },
        `${id}Rivet${c}NTag`,
      );
      g.connect(at, "out", tag, "in");
      g.connect(tag, "out", q.heads, "in");
    });
    // All four faces' crossings: a ±B face carries no plate of its own,
    // but a neighbour's joint plate can reach over it where members meet.
    FACE_OUT.forEach((_, f) => {
      const tag = g.add(
        setAttribute,
        { name: RIVET_AXIS, type: "f32", tupleSize: 4, value: vec(crossOut(f), set) },
        `${id}Cross${f}Tag`,
      );
      g.connect(crossAt(f), "out", tag, "in");
      g.connect(tag, "out", q.heads, "in");
    });
    const mine = g.add(
      filterByExpression,
      { predicate: lt(abs(sub(component(attribute(RIVET_AXIS, 4), 3), set)), 0.5) },
      `${id}RivetNOffPlates`,
    );
    g.connect(q.off, "out", mine, "in");
    const axis = attribute(RIVET_AXIS, 4);
    const aim = aimed("RivetN", mine, vec(component(axis, 0), component(axis, 1), component(axis, 2)));
    const done = g.add(removeAttribute, { names: [PLATE_DIST, RIVET_AXIS], domain: "point" }, `${id}RivetNDone`);
    g.connect(aim, "out", done, "in");
    nHeads = [done];
  }
  let heads = [...nHeads, ...bHeads];
  if (o.keepHeads !== undefined) {
    const all = g.add(mergePoints, {}, `${id}RivetHeads`);
    for (const h of heads) g.connect(h, "out", all, "in");
    const kept = g.add(filterByExpression, { predicate: o.keepHeads }, `${id}RivetKept`);
    g.connect(all, "out", kept, "in");
    heads = [kept];
  }
  const spawn = rivetSpawn(g, id, heads);
  return { ...meshes, rivets: spawn };
}
