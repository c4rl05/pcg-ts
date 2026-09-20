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
  add,
  attribute,
  component,
  cross,
  dot,
  index,
  lerp,
  copyToPoints,
  div,
  filterByExpression,
  ge,
  le,
  lt,
  max,
  meshPrimitive,
  mergePoints,
  mod,
  mul,
  normalize,
  orientAlongVector,
  pathResample,
  position,
  promoteAttribute,
  ramp,
  removeAttribute,
  setAttribute,
  spawnInstances,
  select,
  sqrt,
  sub,
  transformPoints,
  vec,
} from "pcg-ts";
import { END_SINE, END_SINE_MIN, FACE_NORMAL, type Vec3, indexTable, merge, skin } from "./lattice.js";
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
 * The unit box's outward face normals, point by point: meshPrimitive's box
 * lays its faces out as blocks of 4 points (one quad each at the default
 * subdivisions) in the order +x, -x, +y, -y, +z, -z.
 */
const BOX_NORMALS: readonly Vec3[] = (
  [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as const
).flatMap((n): Vec3[] => [n, n, n, n]);

/**
 * Flat bars and plates: a box per member, its length along the member,
 * `width` across it in its face and `thickness` along the face's normal.
 *
 * The unit box carries its local face normals as `normal`; `rotateAttrs`
 * turns them by each copy's `rot` (a box scaled along its own axes keeps
 * its face normals). Without one, a merge with the swept members of the
 * same class (which do carry normals) filled these with zeros, and the
 * Masque rendered black.
 */
export function flatBars(g: Graph, id: string, members: NodeHandle, width: number, thickness: number): NodeHandle {
  const tips = g.add(pathResample, { mode: "count", count: 2, lengthAttr: "barLen" }, `${id}Tips`);
  const len = g.add(
    promoteAttribute,
    { name: "barLen", from: "primitive", to: "point", mode: "first" },
    `${id}Len`,
  );
  const first = g.add(filterByExpression, { predicate: lt(attribute("curveU"), 0.5) }, `${id}First`);
  const T = attribute("tangent", 3);
  const Fn = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(Fn, mul(T, dot(Fn, T))));
  const mid = g.add(
    transformPoints,
    { translate: mul(T, mul(attribute("barLen"), 0.5)) },
    `${id}Mid`,
  );
  const aim = g.add(orientAlongVector, { direction: T, up: N, axis: "+x" }, `${id}Aim`);
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: vec(attribute("barLen"), thickness, width) },
    `${id}Size`,
  );
  const unit = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, `${id}Unit`);
  const unitN = g.add(
    setAttribute,
    {
      name: "normal",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(BOX_NORMALS.map((n) => n[0])),
        indexTable(BOX_NORMALS.map((n) => n[1])),
        indexTable(BOX_NORMALS.map((n) => n[2])),
      ),
    },
    `${id}UnitN`,
  );
  const boxes = g.add(copyToPoints, { topology: "keep", rotateAttrs: ["normal"] }, `${id}Lit`);
  g.connect(members, "out", tips, "in");
  g.connect(tips, "out", len, "in");
  g.connect(len, "out", first, "in");
  g.connect(first, "out", mid, "in");
  g.connect(mid, "out", aim, "in");
  g.connect(aim, "out", sized, "in");
  g.connect(unit, "out", unitN, "in");
  g.connect(unitN, "out", boxes, "source");
  g.connect(sized, "out", boxes, "target");
  return boxes;
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
   * The members carry {@link JOINT_ENDS} (primitive, f32 x 2): 1 where that
   * end lands on an upright and takes a joint, 0 where it stops free, at an
   * opening left for something that passes (a lift's run). A free end is
   * not trimmed and gets no plates and no joint rivets. Default false:
   * every end is a joint.
   */
  readonly endFlags?: boolean;
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
}

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
  const ends =
    joints === undefined
      ? {}
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
  });
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
/** The joint's clearance past the upright's face [estimated]. */
const CLEAR = 0.05;
/** A plate runs this many strut half-widths along its member [estimated]. */
const PLATE_REACH = 3;
/** The point attribute a plate target carries its span in (near, far, width). */
const GUSSET_SPAN = "gussetSpan";
/** A member's two rivet windows along it: (from, to) at its first end, then its second. */
const JOINT_WINDOW = "jointWindow";
/** Rivets along a chord over a plate, every this far [estimated, as the seams]. */
const JOINT_PITCH = 0.1;

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
 * rest of that edge is inside the upright's box, and the plate's inner
 * face lies within the box's face (the strut is no wider than the upright)
 * or flush on it. The plates of the members meeting at a node overlap
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
): { gussets: NodeHandle; jointRivets?: NodeHandle } {
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
  let plateTips: NodeHandle = tips;
  if (joints.endFlags === true) {
    plateTips = g.add(
      filterByExpression,
      { predicate: ge(select(first, endFlag(0), endFlag(1)), 0.5) },
      `${id}PlateTipsJoined`,
    );
    g.connect(tips, "out", plateTips, "in");
  }
  const start = select(first, clearAt(0), clearAt(1));
  // The plate's near edge, along the member from the node: where a point
  // `across` off the axis on the obtuse side reaches the upright's face,
  // (r - across cos t) / sin t, and never behind the node.
  // The plate covers the chords' extent along B (a square's is its width).
  const across = add(add(wB, CHORD), 0.08);
  const faceAt = (end: 0 | 1): Field => {
    const sine = endSineAt(joints, end);
    const cosine = sqrt(sub(1, mul(sine, sine)));
    const r = joints.uprightAt ?? ramp(y, joints.upright);
    return max(div(sub(r, mul(across, cosine)), sine), 0);
  };
  // The span (near edge, far edge, width) is fixed at the tips, before the
  // plates move: their size is set after the move, where position() is no
  // longer the member's end and would read the tables elsewhere.
  const span = g.add(
    setAttribute,
    {
      name: GUSSET_SPAN,
      type: "f32",
      tupleSize: 3,
      value: vec(select(first, faceAt(0), faceAt(1)), add(start, reach), mul(across, 2)),
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
  const unit = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, `${id}PlateUnit`);
  const plates = g.add(copyToPoints, { topology: "keep" }, `${id}Gussets`);
  g.connect(targets, "out", sized, "in");
  g.connect(unit, "out", plates, "source");
  g.connect(sized, "out", plates, "target");
  if (!riveted) return { gussets: plates };

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
  g.connect(len, "out", near, "in");
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
  return { gussets: plates, jointRivets: rivetSpawn(g, `${id}Joint`, heads) };
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
 * one (the 0.50 upright on the 0.87 below node XVII) starts at the plane
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
 */
export function rivetSpawn(g: Graph, id: string, sets: readonly NodeHandle[]): NodeHandle {
  const all = g.add(mergePoints, {}, `${id}Rivets`);
  for (const h of sets) g.connect(h, "out", all, "in");
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: RIVET_HEAD },
    `${id}RivetSize`,
  );
  const spawn = g.add(spawnInstances, { assetId: RIVET_ASSET }, `${id}RivetSpawn`);
  g.connect(jitter(g, `${id}RivetJitter`, all), "out", sized, "in");
  g.connect(sized, "out", spawn, "in");
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
  /** Also spawn a rivet wherever a lacing bar meets a chord. */
  readonly rivets?: boolean;
}

/** The primitive attribute a member's mean height rides on to its step. */
const STRUT_Y = "strutY";

/** The four section corners in ring order, as (sN, sB) sign pairs. */
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

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
    g.connect(samples, "out", node, "in");
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
  const heads = CORNERS.flatMap(([sn, sb], c) =>
    (
      [
        ["N", mul(N, sn)],
        ["B", mul(B, sb)],
      ] as const
    ).map(([side, out]) => {
      const at = g.add(
        transformPoints,
        { translate: add(corner(c), mul(out, o.chord)) },
        `${id}Rivet${c}${side}`,
      );
      const aim = g.add(
        orientAlongVector,
        { direction: out, up: T, axis: "+y" },
        `${id}Rivet${c}${side}Aim`,
      );
      g.connect(samples, "out", at, "in");
      g.connect(at, "out", aim, "in");
      return aim;
    }),
  );
  const spawn = rivetSpawn(g, id, heads);
  return { ...meshes, rivets: spawn };
}
