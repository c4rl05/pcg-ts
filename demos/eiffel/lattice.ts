/**
 * Station lattices: the one construction every part of the tower uses.
 *
 * A STATION LATTICE is a grid of points — `ring` stations around a section
 * at each of `levels` heights — and every member is either a CHAIN (a path
 * up through one station's column) or an EDGE RULE (from station s on
 * level k to station s + ds on level k + dk). A leg is a four-station ring
 * whose section is the square [inner, outer]^2; the shaft is an
 * eight-station ring around [-w, w]^2; a girder between two legs is an
 * open ring lying in a face plane. The geometry of every rule is a field
 * of the station's (s, k); WHERE a rule applies is a mask over the
 * stations, written in TypeScript and carried as a table.
 *
 * Station (s, k) is point k * ring + s: pointGrid runs X fastest, so an
 * edge's far end is an ordinal the field computes directly, which is what
 * connectByIndex spends.
 */
import {
  type Field,
  type FieldLike,
  Graph,
  type NodeHandle,
  add,
  attribute,
  component,
  connectByIndex,
  copyToPoints,
  cross,
  index,
  lerp,
  meshPrimitive,
  mergePrimitives,
  mod,
  mul,
  pointGrid,
  pointsToPath,
  position,
  promoteAttribute,
  ramp,
  removeAttribute,
  select,
  setAttribute,
  sweepProfile,
  transformPoints,
  vec,
} from "pcg-ts";

/**
 * One level of a lattice. A station with ring coordinates (u, v) sits at
 * (lerp(x0, x1, u), y, lerp(z0, z1, v)).
 */
export interface Level {
  readonly y: number;
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

export interface LatticeSpec {
  /** Node-id prefix; must be unique in the graph. */
  readonly id: string;
  /** Each station's (u, v) in the level's section, in ring order. */
  readonly ring: ReadonlyArray<readonly [number, number]>;
  /** Whether the last station's neighbour is the first. */
  readonly closed: boolean;
  /** Bottom to top. */
  readonly levels: readonly Level[];
}

/** A placed lattice: its stations, with `s` and `k` point attributes. */
export interface Lattice {
  readonly g: Graph;
  readonly id: string;
  readonly ringSize: number;
  readonly levelCount: number;
  readonly closed: boolean;
  readonly stations: NodeHandle;
  /**
   * Where every station sits, positions[k][s], known before the cook: the
   * levels and the ring are data, so the graph's fields and this table are
   * two readings of the same numbers. Edge rules read it for their faces.
   */
  readonly positions: ReadonlyArray<ReadonlyArray<Vec3>>;
}

/** A per-station predicate: station s on level k. */
export type StationMask = (s: number, k: number) => boolean;

/**
 * A table field over the point index, exact at every integer: runs of one
 * value collapse to their two ends, and ramp interpolates only between
 * integers, which no point reads.
 */
export function indexTable(values: readonly number[]): Field {
  const stops: Array<readonly [number, number]> = [];
  for (let i = 0; i < values.length; i++) {
    // + 0 turns -0 into 0: a serialized param refuses -0.
    const v = (values[i] as number) + 0;
    const prev = values[i - 1];
    const next = values[i + 1];
    if (i === 0 || i === values.length - 1 || v !== prev || v !== next) stops.push([i, v]);
  }
  if (stops.length === 1) stops.push([stops[0]![0] + 1, stops[0]![1]]);
  return ramp(index(), stops);
}

/** A table field over an integer point attribute. */
function tableOver(attr: string, values: readonly number[]): Field {
  return ramp(attribute(attr), values.map((v, i) => [i, v] as const));
}

/** Place a lattice's stations. */
export function stationLattice(g: Graph, spec: LatticeSpec): Lattice {
  const { id, ring, levels } = spec;
  const grid = g.add(
    pointGrid,
    {
      countX: ring.length,
      countY: levels.length,
      countZ: 1,
      spacing: [1, 1, 1],
      origin: [0, 0, 0],
    },
    `${id}Grid`,
  );
  const tagS = g.add(
    setAttribute,
    { name: "s", type: "i32", value: component(position(), 0) },
    `${id}S`,
  );
  const tagK = g.add(
    setAttribute,
    { name: "k", type: "i32", value: component(position(), 1) },
    `${id}K`,
  );
  const u = tableOver("s", ring.map((r) => r[0]));
  const v = tableOver("s", ring.map((r) => r[1]));
  const at = (pick: (l: Level) => number) => tableOver("k", levels.map(pick));
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(
        lerp(at((l) => l.x0), at((l) => l.x1), u),
        at((l) => l.y),
        lerp(at((l) => l.z0), at((l) => l.z1), v),
      ),
    },
    `${id}Place`,
  );
  g.connect(grid, "out", tagS, "in");
  g.connect(tagS, "out", tagK, "in");
  g.connect(tagK, "out", place, "in");
  const positions = levels.map((l) =>
    ring.map(
      ([u, v]) => [l.x0 + (l.x1 - l.x0) * u, l.y, l.z0 + (l.z1 - l.z0) * v] as const,
    ),
  );
  return {
    g,
    id,
    ringSize: ring.length,
    levelCount: levels.length,
    closed: spec.closed,
    stations: place,
    positions,
  };
}

export type Vec3 = readonly [number, number, number];

/** rows[k][s] = at(s, k): station positions for {@link placedLattice}. */
export function stationRows(
  ringSize: number,
  levelCount: number,
  at: (s: number, k: number) => Vec3,
): Vec3[][] {
  return Array.from({ length: levelCount }, (_, k) =>
    Array.from({ length: ringSize }, (_, s) => at(s, k)),
  );
}

/**
 * A lattice whose stations sit at explicit positions — rows[k][s] is
 * station s on level k — for what no level section describes: points
 * along a circle, a rib whose two chords cross each height at different
 * radii, posts at fixed x between uprights that lean. It carries the same
 * `s` and `k` attributes in the same point order as {@link stationLattice},
 * so {@link edges} and {@link chains} run on it unchanged.
 */
export function placedLattice(
  g: Graph,
  id: string,
  rows: ReadonlyArray<ReadonlyArray<Vec3>>,
  closed = false,
): Lattice {
  const ringSize = rows[0]?.length ?? 0;
  if (ringSize === 0 || rows.some((r) => r.length !== ringSize)) {
    throw new Error(`eiffel lattice "${id}": placedLattice needs rows of one non-zero length`);
  }
  const grid = g.add(
    pointGrid,
    { countX: ringSize, countY: rows.length, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Grid`,
  );
  const tagS = g.add(
    setAttribute,
    { name: "s", type: "i32", value: component(position(), 0) },
    `${id}S`,
  );
  const tagK = g.add(
    setAttribute,
    { name: "k", type: "i32", value: component(position(), 1) },
    `${id}K`,
  );
  const flat = rows.flat();
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(flat.map((p) => p[0])),
        indexTable(flat.map((p) => p[1])),
        indexTable(flat.map((p) => p[2])),
      ),
    },
    `${id}Place`,
  );
  g.connect(grid, "out", tagS, "in");
  g.connect(tagS, "out", tagK, "in");
  g.connect(tagK, "out", place, "in");
  return { g, id, ringSize, levelCount: rows.length, closed, stations: place, positions: rows };
}

/** Evaluate a mask over every station, in point order. */
function maskTable(lat: Lattice, keep: StationMask): number[] {
  const out: number[] = [];
  for (let k = 0; k < lat.levelCount; k++) {
    for (let s = 0; s < lat.ringSize; s++) out.push(keep(s, k) ? 1 : 0);
  }
  return out;
}

/**
 * An edge rule: one 2-point member from (s, k) to (s + ds, k + dk) at every
 * station the mask keeps. An edge that would leave the lattice (past the
 * top, or round an open ring's end) is dropped here, so masks only state
 * the structure.
 */
export function edges(
  lat: Lattice,
  id: string,
  ds: number,
  dk: number,
  keep: StationMask = () => true,
): NodeHandle {
  const R = lat.ringSize;
  const mask = maskTable(lat, (s, k) => {
    if (k + dk < 0 || k + dk >= lat.levelCount) return false;
    if (!lat.closed && (s + ds < 0 || s + ds >= R)) return false;
    if (ds === 0 && dk === 0) return false;
    return keep(s, k);
  });
  const s = attribute("s");
  const k = attribute("k");
  const target = add(mul(add(k, dk), R), mod(add(s, ds), R));
  const node = lat.g.add(
    connectByIndex,
    { index: select(indexTable(mask), target, -1) },
    `${lat.id}${id}`,
  );
  lat.g.connect(lat.stations, "out", node, "in");
  // Edges come out in point order, one per station the mask keeps, so the
  // face table is indexed by primitive in that same order.
  const normals: Vec3[] = [];
  const sinA: number[] = [];
  const sinB: number[] = [];
  const minA: number[] = [];
  const minB: number[] = [];
  for (let k = 0; k < lat.levelCount; k++) {
    for (let s = 0; s < R; s++) {
      if (mask[k * R + s] !== 1) continue;
      normals.push(faceNormal(lat, s, k, ds, dk));
      const s2 = (((s + ds) % R) + R) % R;
      sinA.push(endSine(lat, s, k, s2, k + dk));
      sinB.push(endSine(lat, s2, k + dk, s, k));
      minA.push(endSineMin(lat, s, k, s2, k + dk));
      minB.push(endSineMin(lat, s2, k + dk, s, k));
    }
  }
  const faces = lat.g.add(
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
    `${lat.id}${id}Faces`,
  );
  const ends = lat.g.add(
    setAttribute,
    {
      name: END_SINE,
      domain: "primitive",
      type: "f32",
      tupleSize: 2,
      value: vec(indexTable(sinA), indexTable(sinB)),
    },
    `${lat.id}${id}Ends`,
  );
  const endsMin = lat.g.add(
    setAttribute,
    {
      name: END_SINE_MIN,
      domain: "primitive",
      type: "f32",
      tupleSize: 2,
      value: vec(indexTable(minA), indexTable(minB)),
    },
    `${lat.id}${id}EndsMin`,
  );
  lat.g.connect(node, "out", faces, "in");
  lat.g.connect(faces, "out", ends, "in");
  lat.g.connect(ends, "out", endsMin, "in");
  return endsMin;
}

/**
 * The other primitive attribute every edge rule writes (f32 x 2): the sine
 * of the angle at which the member meets its station's column, at its
 * first end and at its second. A member leaving a node at angle theta to
 * the upright there is still inside that upright's box until it is r /
 * sin(theta) along — so anything that has to start clear of the upright (a
 * joint) divides by this. A scalar, so a copy onto turned targets carries
 * it unchanged.
 */
export const END_SINE = "endSin";

/**
 * Beside {@link END_SINE}, the smallest sine the member makes at each end
 * with ANY line its column runs along there: the bisector, the segment
 * below the station and the segment above (f32 x 2). Where the column
 * kinks, a member's chord offset along it sits beside one segment, not the
 * bisector, and the segment below a node can lean several degrees closer
 * to the member than the bisector does: at XXIII a horizontal's bottom
 * chord, 0.33 m below the node, is 20 mm nearer the upright than the
 * bisector says. A clearance solved with this sine clears both segments.
 */
export const END_SINE_MIN = "endSinMin";

/**
 * The smallest of the sines between the member (s, k) -> (s2, k2) and the
 * column's bisector, its segment below and its segment above at (s, k).
 */
function endSineMin(lat: Lattice, s: number, k: number, s2: number, k2: number): number {
  const P = lat.positions;
  const at = P[k]![s]!;
  const m = unit3(sub3(P[k2]![s2]!, at));
  const sineWith = (d: Vec3): number => {
    const c = cross3(unit3(d), m);
    return Math.hypot(c[0], c[1], c[2]);
  };
  let least = endSine(lat, s, k, s2, k2);
  const below = P[k - 1]?.[s];
  const above = P[k + 1]?.[s];
  if (below !== undefined) least = Math.min(least, sineWith(sub3(at, below)));
  if (above !== undefined) least = Math.min(least, sineWith(sub3(above, at)));
  return least;
}

const unit3 = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
};

/**
 * The sine of the angle between the member from (s, k) to (s2, k2) and the
 * column through (s, k) there: the bisector of the column's segments below
 * and above the station (one of them at the lattice's ends).
 */
function endSine(lat: Lattice, s: number, k: number, s2: number, k2: number): number {
  const P = lat.positions;
  const at = P[k]![s]!;
  const below = P[k - 1]?.[s];
  const above = P[k + 1]?.[s];
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
  };
  const up = unit(
    [
      (above === undefined ? at : above)[0] - (below === undefined ? at : below)[0],
      (above === undefined ? at : above)[1] - (below === undefined ? at : below)[1],
      (above === undefined ? at : above)[2] - (below === undefined ? at : below)[2],
    ],
  );
  const m = unit(sub3(P[k2]![s2]!, at));
  const c = cross3(up, m);
  return Math.hypot(c[0], c[1], c[2]);
}

/**
 * The primitive attribute every edge rule writes: the unit normal of the
 * lattice face the member lies in (f32 x 3). A member's section is squared
 * to it, which is what makes a strut in a LEANING face lie flat in that
 * face — an up hint of +y squares it to the vertical instead, which in
 * panel 1 is 30 degrees off.
 */
export const FACE_NORMAL = "faceN";

/**
 * The face an edge rule's member lies in: the ring segment it spans (or,
 * for a post, the one starting at its station) between the levels it
 * spans (or, for a horizontal, the level above it — the one below at the
 * top). Its normal is the segment crossed with the rise between the
 * segment's midpoints, which is exact for the trapezoid faces of a
 * tapering section. The sign is not normalised: a square section does not
 * care which way its normal points.
 */
function faceNormal(lat: Lattice, s: number, k: number, ds: number, dk: number): Vec3 {
  const R = lat.ringSize;
  const wrap = (i: number) => ((i % R) + R) % R;
  let a = ds < 0 ? wrap(s + ds) : s;
  let b = ds === 0 ? s + 1 : ds < 0 ? s : s + ds;
  if (!lat.closed && b >= R) {
    b = a;
    a = a - 1;
  }
  a = wrap(a);
  b = wrap(b);
  let k0 = Math.min(k, k + dk);
  let k1 = k0 + Math.max(Math.abs(dk), 1);
  if (k1 >= lat.levelCount) {
    k1 = k0;
    k0 = k0 - 1;
  }
  const P = lat.positions;
  const pa0 = P[k0]![a]!;
  const pb0 = P[k0]![b]!;
  const pa1 = P[k1]![a]!;
  const pb1 = P[k1]![b]!;
  const along = sub3(pb0, pa0);
  const rise = sub3(mid3(pa1, pb1), mid3(pa0, pb0));
  const n = cross3(along, rise);
  const len = Math.hypot(n[0], n[1], n[2]);
  if (!(len > 1e-9)) {
    throw new Error(
      `eiffel lattice "${lat.id}": station ${s} on level ${k} spans a degenerate face; ` +
        "an edge rule needs a ring segment and a rise that are not parallel",
    );
  }
  return [n[0] / len, n[1] / len, n[2] / len];
}

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mid3 = (p: Vec3, q: Vec3): Vec3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];

/**
 * Rotate a vector field by a quaternion field [x, y, z, w]:
 * v + w t + q x t with t = 2 (q x v).
 */
export function rotateByQuat(q: FieldLike, v: FieldLike): Field {
  const qv = vec(component(q, 0), component(q, 1), component(q, 2));
  const t = mul(cross(qv, v), 2);
  return add(add(v, mul(component(q, 3), t)), cross(qv, t));
}

/**
 * Chains: one path up through each station's column, over the levels the
 * mask keeps (they must be contiguous). A masked-out station gets a key of
 * its own and is dropped as a one-point group.
 */
export function chains(lat: Lattice, id: string, keep: StationMask = () => true): NodeHandle {
  const mask = maskTable(lat, keep);
  const chain = lat.g.add(
    setAttribute,
    {
      name: "chain",
      type: "i32",
      value: select(indexTable(mask), attribute("s"), add(index(), 100000)),
    },
    `${lat.id}${id}Key`,
  );
  const paths = lat.g.add(
    pointsToPath,
    { groupAttr: "chain", shortGroups: "skip" },
    `${lat.id}${id}`,
  );
  lat.g.connect(lat.stations, "out", chain, "in");
  lat.g.connect(chain, "out", paths, "in");
  return paths;
}

/** Concatenate geometry, keeping topology, in the order given. */
export function merge(g: Graph, id: string, parts: readonly NodeHandle[]): NodeHandle {
  const node = g.add(mergePrimitives, {}, id);
  for (const p of parts) g.connect(p, "out", node, "in");
  return node;
}

/**
 * Four targets at the origin turned 0, 90, 180 and 270 degrees about +y.
 * Copying a part built in the +x+z quadrant (or on the +z face) onto them
 * gives all four legs (or faces).
 */
export function quadrants(g: Graph, id: string): NodeHandle {
  const grid = g.add(
    pointGrid,
    { countX: 4, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Grid`,
  );
  const origin = g.add(
    setAttribute,
    { name: "P", type: "f32", tupleSize: 3, value: vec(0, 0, 0) },
    `${id}Origin`,
  );
  const turn = g.add(transformPoints, { rotateEuler: vec(0, mul(index(), 90), 0) }, `${id}Turn`);
  g.connect(grid, "out", origin, "in");
  g.connect(origin, "out", turn, "in");
  return turn;
}

/**
 * Copy PATHS onto the quadrant targets. Copy before skinning: copyToPoints
 * turns positions, not a mesh's `normal` attribute.
 */
export function copyToQuadrants(
  g: Graph,
  id: string,
  source: NodeHandle,
  targets: NodeHandle,
): NodeHandle {
  const node = g.add(copyToPoints, { topology: "keep" }, id);
  g.connect(source, "out", node, "source");
  g.connect(targets, "out", node, "target");
  return node;
}

/**
 * Copy edge-rule MEMBERS onto the quadrant targets, turning their face
 * normals with them. copyToPoints composes a copy's position and `rot`,
 * but a vector attribute rides along unturned, so the copies' `rot` is
 * lifted onto their primitives and applied to {@link FACE_NORMAL} there.
 */
export function copyMembersToQuadrants(
  g: Graph,
  id: string,
  source: NodeHandle,
  targets: NodeHandle,
): NodeHandle {
  const copied = copyToQuadrants(g, id, source, targets);
  const lifted = g.add(
    promoteAttribute,
    { name: "rot", from: "point", to: "primitive", mode: "first" },
    `${id}Rot`,
  );
  const turned = g.add(
    setAttribute,
    {
      name: FACE_NORMAL,
      domain: "primitive",
      type: "f32",
      tupleSize: 3,
      value: rotateByQuat(attribute("rot", 4), attribute(FACE_NORMAL, 3)),
    },
    `${id}Faces`,
  );
  // The lifted `rot` goes again: a resample carries primitive attributes
  // onto its samples and refuses one named like a point attribute it writes.
  const dropped = g.add(
    removeAttribute,
    { names: ["rot"], domain: "primitive" },
    `${id}RotDone`,
  );
  g.connect(copied, "out", lifted, "in");
  g.connect(lifted, "out", turned, "in");
  g.connect(turned, "out", dropped, "in");
  return dropped;
}

/**
 * Skin paths as square-section members whose half-width follows the given
 * (height, half-width) stops. `up` fixes the section's roll: [1, 0, 0]
 * keeps a near-vertical member's faces square to the tower's faces.
 */
export function skin(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  up: Vec3 | Field = [0, 1, 0],
): NodeHandle {
  const radius: FieldLike =
    typeof halfWidth === "number" ? halfWidth : ramp(component(position(), 1), halfWidth);
  const node = g.add(
    sweepProfile,
    { profile: "square", radius, frame: "upHint", up: Array.isArray(up) ? [...up] : up },
    id,
  );
  g.connect(paths, "out", node, "in");
  return node;
}

/** An axis-aligned box from its centre and full size. */
export function box(
  g: Graph,
  id: string,
  center: readonly [number, number, number],
  size: readonly [number, number, number],
): NodeHandle {
  return g.add(meshPrimitive, { shape: "box", center: [...center], size: [...size] }, id);
}

/** The ring of a square section subdivided into `perSide` bays per side. */
export function squareRing(perSide: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  // Ring order from corner (1,1): along v = 1 to (0,1), down u = 0 to
  // (0,0), along v = 0 to (1,0), up u = 1 back toward (1,1).
  for (let i = 0; i < perSide; i++) out.push([1 - i / perSide, 1]);
  for (let i = 0; i < perSide; i++) out.push([0, 1 - i / perSide]);
  for (let i = 0; i < perSide; i++) out.push([i / perSide, 0]);
  for (let i = 0; i < perSide; i++) out.push([1, i / perSide]);
  return out;
}
