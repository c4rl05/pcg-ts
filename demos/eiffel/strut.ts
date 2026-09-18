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
 * which in panel 1, where the faces lean 26.7 degrees, is up to 30 degrees
 * off.
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
  setAttribute,
  spawnInstances,
  select,
  sqrt,
  sub,
  transformPoints,
  vec,
} from "pcg-ts";
import { END_SINE, FACE_NORMAL, merge, skin } from "./lattice.js";
import { type Detail, RIVET_ASSET } from "./parts.js";

/** A corner angle's half-width: 80-100 mm angles (Plate XXXI) [derived]. */
const CHORD = 0.045;
/** A lacing bar's half-width: 45 x 45 x 5 angles (Plate VII) [derived]. */
const LACE = 0.02;
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
}

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
): WebMembers {
  const riveted = detail.rivets === true;
  if (detail.lacedWeb !== true && !riveted) return { meshes: [faceSkin(g, id, paths, outer)] };
  const ends =
    joints === undefined ? {} : memberJoints(g, id, paths, outer, joints.upright, riveted);
  // A member with joints is a strut only between them: its ends stop where
  // its joint starts, just clear of the upright, and the gusset plates
  // cover the rest. Running it axis to axis put its lacing (and lacing
  // rivets) inside the upright's box — up to 15% of them in the shaft.
  const members =
    joints === undefined ? paths : trimToJoints(g, id, paths, outer, joints.upright);
  const struts = latticeStruts(g, id, members, {
    halfWidth: outer.map(([y, w]) => [y, w - CHORD] as const),
    chord: CHORD,
    lacing: LACE,
    pitch: 1,
    rivets: riveted,
  });
  return {
    meshes: [struts.chords, struts.lacing],
    ...(struts.rivets === undefined ? {} : { rivets: struts.rivets }),
    ...ends,
  };
}

/** A gusset plate's thickness [estimated]. */
const PLATE = 0.015;
/** The joint's clearance past the upright's face [estimated]. */
const CLEAR = 0.05;
/** A plate runs this many strut half-widths along its member [estimated]. */
const PLATE_REACH = 3;
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
  upright: ReadonlyArray<readonly [number, number]>,
  end: 0 | 1,
): Field {
  const y = component(position(), 1);
  const w = sub(ramp(y, outer), CHORD);
  const sine = max(component(attribute(END_SINE, 2), end), 0.25);
  const cosine = sqrt(sub(1, mul(sine, sine)));
  return div(add(add(ramp(y, upright), CLEAR), mul(add(w, CHORD), cosine)), sine);
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
  upright: ReadonlyArray<readonly [number, number]>,
): NodeHandle {
  const own = g.add(pathResample, { mode: "count", count: 2 }, `${id}Own`);
  const first = lt(attribute("curveU"), 0.5);
  const T = attribute("tangent", 3);
  const moved = g.add(
    transformPoints,
    {
      translate: select(
        first,
        mul(T, jointStart(outer, upright, 0)),
        mul(T, mul(jointStart(outer, upright, 1), -1)),
      ),
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
 * just outside the chords on that side, starting clear of the upright's
 * face and reaching PLATE_REACH half-widths along the member. The plates
 * of the members meeting at a node overlap into the irregular gusset a
 * real joint has, without the node needing to know who meets it: each
 * member brings its own.
 *
 * On each plate, the two chords that lie against it are riveted to it in
 * a row along the chord, every JOINT_PITCH over the plate's reach. The
 * members' ends are found by field, not by table: a resample reports each
 * sample's arc position and the member's length, and a sample is a joint
 * rivet when it is within reach of EITHER end.
 */
function memberJoints(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  upright: ReadonlyArray<readonly [number, number]>,
  riveted: boolean,
): { gussets: NodeHandle; jointRivets?: NodeHandle } {
  const y = component(position(), 1);
  const w = sub(ramp(y, outer), CHORD);
  const clearAt = (end: 0 | 1): Field => jointStart(outer, upright, end);
  const reach = mul(w, PLATE_REACH);
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
  const start = select(lt(attribute("curveU"), 0.5), clearAt(0), clearAt(1));
  const plateSides = [1, -1].map((side) => {
    const name = `${id}Plate${side > 0 ? "Out" : "In"}`;
    const at = g.add(
      transformPoints,
      {
        translate: add(
          mul(into, add(start, mul(reach, 0.5))),
          mul(N, mul(add(off, PLATE / 2), side)),
        ),
      },
      name,
    );
    const aim = g.add(orientAlongVector, { direction: into, up: N, axis: "+x" }, `${name}Aim`);
    g.connect(tips, "out", at, "in");
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
      value: vec(reach, PLATE, mul(add(off, 0.08), 2)),
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
  const within = (a: Field, from: Field) => mul(ge(a, from), le(a, add(from, reach)));
  const near = g.add(
    filterByExpression,
    { predicate: max(within(arc, clearAt(0)), within(fromEnd, clearAt(1))) },
    `${id}JointNear`,
  );
  g.connect(paths, "out", samples, "in");
  g.connect(samples, "out", len, "in");
  g.connect(len, "out", near, "in");
  const heads = [1, -1].flatMap((side) =>
    [1, -1].map((chord) => {
      const out = mul(N, side);
      const name = `${id}Joint${side > 0 ? "Out" : "In"}${chord > 0 ? "P" : "M"}`;
      const at = g.add(
        transformPoints,
        { translate: add(mul(B, mul(w, chord)), mul(out, add(off, PLATE))) },
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
 * The uprights' seam rows: a rivet every 0.10 m [estimated — no source
 * found gives a pitch; about 4.5 diameters of a 22 mm rivet, a common
 * 19th-century spacing], 55 mm in from the corner, the middle of a
 * 100 mm angle's leg [derived from the 100 x 100 corner angles].
 */
export const UPRIGHT_SEAMS = { pitch: 0.1, inset: 0.055 } as const;

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
 */
export function seamRivets(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  up: readonly [number, number, number] | Field,
  opts: { readonly pitch: number; readonly inset: number },
): NodeHandle {
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: opts.pitch },
    `${id}SeamSamples`,
  );
  g.connect(paths, "out", samples, "in");
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

/** Merge rivet point sets, size them, and spawn them. */
function rivetSpawn(g: Graph, id: string, sets: readonly NodeHandle[]): NodeHandle {
  const all = g.add(mergePoints, {}, `${id}Rivets`);
  for (const h of sets) g.connect(h, "out", all, "in");
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: RIVET_HEAD },
    `${id}RivetSize`,
  );
  const spawn = g.add(spawnInstances, { assetId: RIVET_ASSET }, `${id}RivetSpawn`);
  g.connect(all, "out", sized, "in");
  g.connect(sized, "out", spawn, "in");
  return spawn;
}

export interface StrutOpts {
  /** Half-width of the strut, to its chords' axes, by height: (y, w) stops. */
  readonly halfWidth: ReadonlyArray<readonly [number, number]>;
  /** Half-width of a chord angle's square section. */
  readonly chord: number;
  /** Half-width of a lacing bar's square section. */
  readonly lacing: number;
  /**
   * Lacing pitch as a multiple of the strut's full width: 1 puts each
   * lacing bar at 45 degrees across its face.
   */
  readonly pitch: number;
  /** Also spawn a rivet wherever a lacing bar meets a chord. */
  readonly rivets?: boolean;
}

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
  // The resample step is uniform per call, so it takes the strut's widest
  // section: 2 * max w * pitch.
  const widest = Math.max(...o.halfWidth.map((s) => s[1]));
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: 2 * widest * o.pitch },
    `${id}Samples`,
  );
  g.connect(paths, "out", samples, "in");

  const T = attribute("tangent", 3);
  const F = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(F, mul(T, dot(F, T))));
  const B = cross(N, T);
  const corner = (c: number): Field => {
    const [sn, sb] = CORNERS[c % 4]!;
    return mul(w, add(mul(N, sn), mul(B, sb)));
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
