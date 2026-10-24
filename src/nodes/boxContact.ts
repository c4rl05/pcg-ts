/**
 * `boxContact`: the CONTEXT QUERY of a split grammar, as one node. For
 * every box in one set (the queries), does it overlap, touch, contain or
 * sit inside any box of another set (the targets)? The answer is written
 * onto the query points as attributes, and nothing else changes.
 *
 * WHAT IT REPLACES. The brick house asked "is anything standing in front of
 * this window?" with five nodes: a probe point moved half a stud out of the
 * wall, a direction attribute for the fan, a `pathCoverage` ray fan with
 * near = far = 0 (rays of no length, so a fan of containment tests), an
 * occluder cloud whose P had to be moved to each box's centre because the
 * ray test reads boxes as P plus a size, and a chimney "shadow" box grown
 * by hand. The fan needed a ray per stud of the widest opening, and
 * `rayCount` takes no field, so it was sized for the param's MAXIMUM. All
 * of that is a box-against-boxes question, and this node asks it directly:
 * the bay's own box, grown by a margin, against the occluders' own boxes.
 *
 * THE TESTS ARE EXACT, rotated boxes included: the overlap and touch modes
 * are the separating-axis test on all fifteen axes of two oriented boxes,
 * and the containment modes are the support-extent test along the outer
 * box's three axes, which is exact for a box in a box. Two
 * approximations exist on the ORIENTED path only, each stated where it
 * lives: near-parallel edge axes (`PARALLEL_EPS`) and the boundary band
 * that reads a contact as a contact through rounding (`BOUNDARY_REL`).
 *
 * ACCELERATION is the internal uniform grid (`src/spatial`), in the
 * two-tier shape `pathCoverage` uses: targets whose bounding sphere is no
 * larger than the median are binned by centre, the rest are scanned for
 * every query. The grid changes what an answer COSTS and never what it is
 * — the prefilter is a bounding-sphere inequality, sound by the triangle
 * inequality, with a slack that only ever admits more candidates.
 *
 * DETERMINISM. Nothing is drawn and nothing is accumulated in floating
 * point. A query's count is the number of distinct targets that pass, and
 * its nearest target is the minimum of (centre distance, target index),
 * so neither depends on the order the grid hands candidates over.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import type { Attribute, Geometry } from "../data/index.js";
import { deriveGeometry } from "../data/derive.js";
import { makeGeometryItem } from "../graph/index.js";
import { UniformGrid } from "../spatial/index.js";
import type {
  BoxContactInputs,
  BoxContactOutputs,
  BoxContactParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  readComp,
  requireFinitePlainParam,
  requireGeometry,
  requireReportSlot,
  requireVec3Column,
  resolveOn,
  rotateVec,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { BoxContactParams } from "./params.generated.js";

const NODE = "boxContact";

const MODES = ["overlap", "touch", "contain", "inside"] as const;
const FRAMES = ["world", "local"] as const;

/** Mode codes, decided once from the `mode` string. */
const OVERLAP = 0;
const TOUCH = 1;
const CONTAIN = 2;
const INSIDE = 3;
type ModeCode = 0 | 1 | 2 | 3;

/**
 * THE ONE APPROXIMATION. A cross axis `A_a x B_b` of the separating-axis
 * test has length sin(angle) between the two edges; when the edges are
 * parallel it is the zero vector and is no axis at all, so it is skipped.
 * It is skipped from 1 - cos^2 < 1e-12, i.e. edges within 1e-6 rad of
 * parallel, because below that the axis is rounding noise. Skipping a
 * genuine axis can only turn "apart" into "meet", and only where two
 * near-parallel edges are the sole thing separating the boxes: the gap such
 * an axis could prove is at most about 1e-6 of the boxes' size.
 */
const PARALLEL_EPS = 1e-12;

/** Relative slack on the bounding-sphere prefilter: admits, never drops. */
const SPHERE_SLACK = 1e-9;

/**
 * THE BOUNDARY TOLERANCE of the ORIENTED path, relative to the pair's
 * scale (the larger centre coordinate plus both boxes' half-extents). Two
 * boxes with one P and one rot that share a face share it EXACTLY in the
 * reals, but each centre is rotated on its own and picks up ~1e-16 of
 * rounding, so without this a face contact was "overlap" at about a third
 * of random rotations and missed by "touch" at about half (measured by the
 * independent verification of this node). Within this band a comparison
 * is read as EQUALITY — contact, not overlap; contained, boundary
 * included. The axis-aligned path needs none: its arithmetic on f32
 * corners is exact for every case that sits on a boundary.
 */
const BOUNDARY_REL = 1e-12;

/**
 * A box cloud in the one form the pair tests want: SoA world centres, the
 * box's own axes as orthonormal rows, and world half-extents along them.
 */
interface BoxTable {
  readonly count: number;
  /** World centre, 3 per box. */
  readonly centre: Float64Array;
  /** The images of local +X, +Y, +Z, 9 per box (rows). */
  readonly axes: Float64Array;
  /** World half-extents along those axes, 3 per box. */
  readonly half: Float64Array;
  /** 1 where the axes are exactly the world axes (the fast, exact path). */
  readonly aligned: Uint8Array;
}

function isF32Tuple(attr: Attribute | undefined, size: number): boolean {
  return attr !== undefined && attr.type === "f32" && attr.tupleSize === size;
}

/**
 * Build the box table of one input. `local` decides the frame ONCE for the
 * whole cloud: false reads boundsMin/boundsMax as world corners (P, rot and
 * scale are not read), true maps them through P, rot and scale.
 */
function buildBoxes(geo: Geometry, local: boolean, pin: string, frameParam: string): BoxTable {
  const pts = geo.attrs.point;
  const n = pts.count;
  const centre = new Float64Array(n * 3);
  const axes = new Float64Array(n * 9);
  const half = new Float64Array(n * 3);
  const aligned = new Uint8Array(n);
  if (n === 0) return { count: 0, centre, axes, half, aligned };

  const loAttr = pts.get("boundsMin");
  const hiAttr = pts.get("boundsMax");
  for (const [name, attr] of [
    ["boundsMin", loAttr],
    ["boundsMax", hiAttr],
  ] as const) {
    if (!isF32Tuple(attr, 3)) {
      throw new Error(
        `${NODE}: the input on pin "${pin}" ${attr === undefined ? `has no "${name}" point attribute` : `has "${name}" as ${attr.type} tupleSize ${attr.tupleSize}`}; a box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the points their boxes with setBounds first.`,
      );
    }
  }
  const lo = loAttr!.data as Float32Array;
  const hi = hiAttr!.data as Float32Array;

  let P: ArrayLike<number> | undefined;
  let pStride = 3;
  let rot: ArrayLike<number> | undefined;
  let scale: ArrayLike<number> | undefined;
  if (local) {
    const pAttr = pts.get("P");
    if (pAttr === undefined || pAttr.type !== "f32" || pAttr.tupleSize < 3) {
      throw new Error(
        `${NODE}: param "${frameParam}" is "local", which places each box by its point's transform, but the input on pin "${pin}" has ${pAttr === undefined ? "no P attribute" : `P as ${pAttr.type} tupleSize ${pAttr.tupleSize}`}. Give the points positions, or set "${frameParam}" to "world" if boundsMin/boundsMax already hold world corners.`,
      );
    }
    P = pAttr.data;
    pStride = pAttr.tupleSize;
    const rAttr = pts.get("rot");
    if (rAttr !== undefined && !isF32Tuple(rAttr, 4)) {
      throw new Error(
        `${NODE}: the standard point attribute "rot" on pin "${pin}" is ${rAttr.type} tupleSize ${rAttr.tupleSize}, but a rotation is an f32 tuple-4 quaternion (x, y, z, w). Rename that column, or set "${frameParam}" to "world".`,
      );
    }
    rot = rAttr?.data;
    const sAttr = pts.get("scale");
    if (sAttr !== undefined && !isF32Tuple(sAttr, 3)) {
      throw new Error(
        `${NODE}: the standard point attribute "scale" on pin "${pin}" is ${sAttr.type} tupleSize ${sAttr.tupleSize}, but a scale is f32 tuple 3. Rename that column, or set "${frameParam}" to "world".`,
      );
    }
    scale = sAttr?.data;
  }

  const v: number[] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    for (let k = 0; k < 3; k++) {
      const a = lo[o + k];
      const b = hi[o + k];
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has a box that is not finite along ${"xyz"[k]} — boundsMin ${a}, boundsMax ${b}. Fix the setBounds that made it, or filter the point out first.`,
        );
      }
      if (a > b) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has an inside-out box along ${"xyz"[k]} — boundsMin ${a} is above boundsMax ${b}. A box has min <= max on every axis; fix the setBounds that made it (a zero-size box, min = max, is fine).`,
        );
      }
    }
    if (!local) {
      for (let k = 0; k < 3; k++) {
        centre[o + k] = 0.5 * (lo[o + k] + hi[o + k]);
        half[o + k] = 0.5 * (hi[o + k] - lo[o + k]);
      }
      axes[i * 9] = 1;
      axes[i * 9 + 4] = 1;
      axes[i * 9 + 8] = 1;
      aligned[i] = 1;
      continue;
    }
    // Local: the box [lo, hi] lives in the point's own frame, scaled, then
    // rotated, then moved to P — the matrix spawnInstances builds.
    let qx = 0;
    let qy = 0;
    let qz = 0;
    let qw = 1;
    if (rot !== undefined) {
      qx = rot[i * 4];
      qy = rot[i * 4 + 1];
      qz = rot[i * 4 + 2];
      qw = rot[i * 4 + 3];
      const len = Math.hypot(qx, qy, qz, qw);
      if (!Number.isFinite(len)) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has a non-finite "rot" (${qx}, ${qy}, ${qz}, ${qw}). Fix whatever wrote it, or filter the point out first.`,
        );
      }
      // A zero quaternion reads as identity; any other is normalized, so a
      // slightly non-unit rotation cannot skew the frame the tests need.
      if (len > 0) {
        qx /= len;
        qy /= len;
        qz /= len;
        qw /= len;
      } else {
        qx = qy = qz = 0;
        qw = 1;
      }
    }
    const sx = scale !== undefined ? scale[o] : 1;
    const sy = scale !== undefined ? scale[o + 1] : 1;
    const sz = scale !== undefined ? scale[o + 2] : 1;
    const p0 = P![i * pStride];
    const p1 = P![i * pStride + 1];
    const p2 = P![i * pStride + 2];
    if (![sx, sy, sz, p0, p1, p2].every(Number.isFinite)) {
      throw new Error(
        `${NODE}: point ${i} on pin "${pin}" has a non-finite P (${p0}, ${p1}, ${p2}) or scale (${sx}, ${sy}, ${sz}). Fix whatever wrote it, or filter the point out first.`,
      );
    }
    for (let k = 0; k < 3; k++) {
      rotateVec(v, qx, qy, qz, qw, k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0);
      axes[i * 9 + k * 3] = v[0];
      axes[i * 9 + k * 3 + 1] = v[1];
      axes[i * 9 + k * 3 + 2] = v[2];
    }
    const mx = 0.5 * (lo[o] + hi[o]) * sx;
    const my = 0.5 * (lo[o + 1] + hi[o + 1]) * sy;
    const mz = 0.5 * (lo[o + 2] + hi[o + 2]) * sz;
    rotateVec(v, qx, qy, qz, qw, mx, my, mz);
    centre[o] = p0 + v[0];
    centre[o + 1] = p1 + v[1];
    centre[o + 2] = p2 + v[2];
    // A negative scale mirrors the box; the mirrored box is the same set.
    half[o] = Math.abs(0.5 * (hi[o] - lo[o]) * sx);
    half[o + 1] = Math.abs(0.5 * (hi[o + 1] - lo[o + 1]) * sy);
    half[o + 2] = Math.abs(0.5 * (hi[o + 2] - lo[o + 2]) * sz);
    const ax = axes;
    const b = i * 9;
    aligned[i] =
      ax[b] === 1 && ax[b + 1] === 0 && ax[b + 2] === 0 &&
      ax[b + 3] === 0 && ax[b + 4] === 1 && ax[b + 5] === 0 &&
      ax[b + 6] === 0 && ax[b + 7] === 0 && ax[b + 8] === 1
        ? 1
        : 0;
  }
  return { count: n, centre, axes, half, aligned };
}

/**
 * The exact pair test: does query box `i` (centre, axes from `q`, half
 * extents `qh`, already grown by its margin and never negative) meet
 * target box `j` under `mode`? The mode is a CODE decided once in execute;
 * no string reaches this function.
 *
 * - OVERLAP: no separating axis with a gap >= 0 (strict: shared faces,
 *   edges and corners do not count).
 * - TOUCH: no separating axis with a gap > 0 (closed: they do).
 * - CONTAIN: the target lies in the query — its extent along each query
 *   axis, |d . A_a| + sum_b hb_b |A_a . B_b|, is <= the query's.
 * - INSIDE: the query lies in the target, the same test the other way.
 */
function boxesMeet(
  mode: ModeCode,
  q: BoxTable,
  qh: Float64Array,
  i: number,
  t: BoxTable,
  j: number,
): boolean {
  const qc = q.centre;
  const tc = t.centre;
  const th = t.half;
  const i3 = i * 3;
  const j3 = j * 3;
  const dx = tc[j3] - qc[i3];
  const dy = tc[j3 + 1] - qc[i3 + 1];
  const dz = tc[j3 + 2] - qc[i3 + 2];
  const ha0 = qh[i3];
  const ha1 = qh[i3 + 1];
  const ha2 = qh[i3 + 2];
  const hb0 = th[j3];
  const hb1 = th[j3 + 1];
  const hb2 = th[j3 + 2];

  if (q.aligned[i] === 1 && t.aligned[j] === 1) {
    const ex = Math.abs(dx);
    const ey = Math.abs(dy);
    const ez = Math.abs(dz);
    switch (mode) {
      case OVERLAP:
        return ex < ha0 + hb0 && ey < ha1 + hb1 && ez < ha2 + hb2;
      case TOUCH:
        return ex <= ha0 + hb0 && ey <= ha1 + hb1 && ez <= ha2 + hb2;
      case CONTAIN:
        return ex + hb0 <= ha0 && ey + hb1 <= ha1 && ez + hb2 <= ha2;
      default:
        return ex + ha0 <= hb0 && ey + ha1 <= hb1 && ez + ha2 <= hb2;
    }
  }

  // General: the oriented-box tests in the query's frame. R[a][b] = A_a . B_b.
  const A = q.axes;
  const B = t.axes;
  const ia = i * 9;
  const jb = j * 9;
  const R = SCRATCH_R;
  const AR = SCRATCH_AR;
  for (let a = 0; a < 3; a++) {
    const ax = A[ia + a * 3];
    const ay = A[ia + a * 3 + 1];
    const az = A[ia + a * 3 + 2];
    for (let b = 0; b < 3; b++) {
      const r = ax * B[jb + b * 3] + ay * B[jb + b * 3 + 1] + az * B[jb + b * 3 + 2];
      R[a * 3 + b] = r;
      AR[a * 3 + b] = Math.abs(r);
    }
  }
  const tA0 = dx * A[ia] + dy * A[ia + 1] + dz * A[ia + 2];
  const tA1 = dx * A[ia + 3] + dy * A[ia + 4] + dz * A[ia + 5];
  const tA2 = dx * A[ia + 6] + dy * A[ia + 7] + dz * A[ia + 8];
  const tB0 = dx * B[jb] + dy * B[jb + 1] + dz * B[jb + 2];
  const tB1 = dx * B[jb + 3] + dy * B[jb + 4] + dz * B[jb + 5];
  const tB2 = dx * B[jb + 6] + dy * B[jb + 7] + dz * B[jb + 8];
  const ha = SCRATCH_HA;
  const hb = SCRATCH_HB;
  const tA = SCRATCH_TA;
  ha[0] = ha0;
  ha[1] = ha1;
  ha[2] = ha2;
  hb[0] = hb0;
  hb[1] = hb1;
  hb[2] = hb2;
  tA[0] = tA0;
  tA[1] = tA1;
  tA[2] = tA2;
  const tB = SCRATCH_TB;
  tB[0] = tB0;
  tB[1] = tB1;
  tB[2] = tB2;

  const tol =
    BOUNDARY_REL *
    (Math.max(Math.abs(qc[i3]), Math.abs(qc[i3 + 1]), Math.abs(qc[i3 + 2]), Math.abs(tc[j3]), Math.abs(tc[j3 + 1]), Math.abs(tc[j3 + 2])) +
      ha0 + ha1 + ha2 + hb0 + hb1 + hb2);

  if (mode === CONTAIN) {
    for (let a = 0; a < 3; a++) {
      const ext = Math.abs(tA[a]) + hb0 * AR[a * 3] + hb1 * AR[a * 3 + 1] + hb2 * AR[a * 3 + 2];
      if (!(ext <= ha[a] + tol)) return false;
    }
    return true;
  }
  if (mode === INSIDE) {
    for (let b = 0; b < 3; b++) {
      const ext = Math.abs(tB[b]) + ha0 * AR[b] + ha1 * AR[3 + b] + ha2 * AR[6 + b];
      if (!(ext <= hb[b] + tol)) return false;
    }
    return true;
  }

  // Separating axes. `strict` (overlap) calls a zero gap a separation, so
  // boxes that only touch are apart; touch calls it contact. "Zero" is
  // within `tol` here (see BOUNDARY_REL).
  const strict = mode === OVERLAP;
  // The query's face normals.
  for (let a = 0; a < 3; a++) {
    const lhs = Math.abs(tA[a]);
    const rhs = ha[a] + hb0 * AR[a * 3] + hb1 * AR[a * 3 + 1] + hb2 * AR[a * 3 + 2];
    if (strict ? lhs >= rhs - tol : lhs > rhs + tol) return false;
  }
  // The target's face normals.
  for (let b = 0; b < 3; b++) {
    const lhs = Math.abs(tB[b]);
    const rhs = ha0 * AR[b] + ha1 * AR[3 + b] + ha2 * AR[6 + b] + hb[b];
    if (strict ? lhs >= rhs - tol : lhs > rhs + tol) return false;
  }
  // The nine edge-edge axes A_a x B_b, in the query's frame.
  for (let a = 0; a < 3; a++) {
    const a1 = (a + 1) % 3;
    const a2 = (a + 2) % 3;
    for (let b = 0; b < 3; b++) {
      const rab = R[a * 3 + b];
      if (1 - rab * rab < PARALLEL_EPS) continue;
      const b1 = (b + 1) % 3;
      const b2 = (b + 2) % 3;
      const lhs = Math.abs(tA[a2] * R[a1 * 3 + b] - tA[a1] * R[a2 * 3 + b]);
      const rhs =
        ha[a1] * AR[a2 * 3 + b] + ha[a2] * AR[a1 * 3 + b] + hb[b1] * AR[a * 3 + b2] + hb[b2] * AR[a * 3 + b1];
      if (strict ? lhs >= rhs - tol : lhs > rhs + tol) return false;
    }
  }
  return true;
}

// Scratch for the general pair test: allocated once per module, so the
// per-pair path allocates nothing.
const SCRATCH_R = new Float64Array(9);
const SCRATCH_AR = new Float64Array(9);
const SCRATCH_HA = new Float64Array(3);
const SCRATCH_HB = new Float64Array(3);
const SCRATCH_TA = new Float64Array(3);
const SCRATCH_TB = new Float64Array(3);

/**
 * Per-element keys for the exclusion attribute, comparable ACROSS the two
 * inputs: numbers compare by value (any numeric type against any other),
 * strings by their text, mapped through the query's table once per table
 * entry rather than once per pair. A NaN key is never equal to anything,
 * and a target string the query side never holds gets a key no query has.
 */
function exclusionKeys(
  qAttr: Attribute,
  tAttr: Attribute,
  qCount: number,
  tCount: number,
): { q: Float64Array; t: Float64Array } {
  const q = new Float64Array(qCount);
  const t = new Float64Array(tCount);
  if (qAttr.type !== "string") {
    for (let i = 0; i < qCount; i++) q[i] = qAttr.data[i];
    for (let j = 0; j < tCount; j++) t[j] = tAttr.data[j];
    return { q, t };
  }
  // The query table's strings to a canonical key: the first index holding
  // that text. A code past the table reads as "" (getString's rule).
  const canon = new Map<string, number>();
  const qTable = qAttr.stringTable;
  for (let k = 0; k < qTable.length; k++) if (!canon.has(qTable[k])) canon.set(qTable[k], k);
  if (!canon.has("")) canon.set("", qTable.length);
  const qKeyOf = Float64Array.from(qTable, (s) => canon.get(s)!);
  const qEmpty = canon.get("")!;
  for (let i = 0; i < qCount; i++) {
    const code = qAttr.data[i];
    q[i] = code < qKeyOf.length ? qKeyOf[code] : qEmpty;
  }
  const tTable = tAttr.stringTable;
  const tKeyOf = Float64Array.from(tTable, (s) => canon.get(s) ?? -1);
  const tEmpty = qEmpty;
  for (let j = 0; j < tCount; j++) {
    const code = tAttr.data[j];
    t[j] = code < tKeyOf.length ? tKeyOf[code] : tEmpty;
  }
  return { q, t };
}

/** Per-query contact with a set of target boxes: hit flag, count, nearest. */
export const boxContact = standardNode<BoxContactParams, BoxContactInputs, BoxContactOutputs>({
  type: NODE,
  category: "point op",
  description:
    "Asks, for every BOX on the `in` pin (the QUERIES), whether it meets any box on the `targets` pin, and writes the answer onto the query points as attributes: `hitAttr` a bool (any target met), `countAttr` an i32 (how many distinct targets), `targetAttr` an i32 (the index of the met target whose centre is nearest the query's centre, -1 for none). Nothing else changes — same points, same order, same topology, every attribute carried — so the usual next step is a filter or a relabel on the flag. This is the CONTEXT QUERY of a split grammar (the occlusion query of the shape-grammar literature, and the box form of a point-in-volume or group-by-bounding-object test): is this window blocked by a neighbour or a chimney, does this bay cross any box of another set, is this room inside the lot. A BOX is a point's standard `boundsMin`/`boundsMax`, read in one of two FRAMES, chosen per input by `queryFrame` and `targetFrame`: \"world\" (the default) reads the two corners as WORLD coordinates and does not read P, rot or scale — the convention setBounds, splitBox and packBricks write, so grammar cells need nothing done to them; \"local\" reads them in the point's OWN frame, mapped through P, rot and scale exactly as spawnInstances places a mesh (world = P + rot * (scale * corner)), so a rotated box is tested as the ORIENTED box it is (rot is normalized first, so a non-unit quaternion places the box rigidly where spawnInstances' matrix would also scale it). THE MODE (`mode`) is the question: \"overlap\" — the two boxes CROSS: on every separating direction their extents overlap by more than zero, so boxes that only share a face, an edge or a corner do NOT overlap (two neighbouring grammar cells are not overlapping), while a zero-thickness box passing through a solid one does; \"touch\" — the same test closed, so sharing a face, edge or corner COUNTS (the party-wall neighbour); \"contain\" — the target lies wholly inside the query, boundary included; \"inside\" — the query lies wholly inside the target, boundary included. THE TESTS ARE EXACT for oriented boxes too — the separating-axis test on all fifteen axes for overlap and touch, the support extent along the outer box's three axes for contain and inside — with two stated approximations that apply only where a box is ROTATED: a cross axis of two edges within 1e-6 rad of parallel is skipped as rounding noise, which can only report contact across a gap of at most about 1e-6 of the boxes' size; and a gap or overlap within 1e-12 of the pair's scale (its largest centre coordinate plus both boxes' half-extents) is read as exact contact, so two boxes under one P and rot that share a face share it under every rotation rather than as rounding decides. Axis-aligned pairs (every \"world\" box, and \"local\" ones with no rotation) are compared exactly. THE MARGIN (`margin`, per query point) GROWS THE QUERY box by that much on BOTH sides along each of its own three axes before the test, in world units (scale is not applied to it): margin 0.5 with \"touch\" asks \"is any target within half a unit of this box, measured per axis\" — a box-shaped neighbourhood, not a rounded one. A vec3 gives each axis its own reach (grow a wall's box only across its faces, not along its run, e.g. vec(0, 0, 2) on a wall running along x — both faces grow); a scalar field broadcasts to all three. A NEGATIVE margin shrinks the query, which is how a containment test tolerates a sliver (\"inside\" with margin -0.01), and a query shrunk past nothing on any axis is EMPTY and meets nothing in every mode. EXCLUSION: `excludeAttr` names a tuple-1 attribute present on BOTH inputs, and a target whose value EQUALS the query's is skipped — the bay that must not count its own wall carries its wall's id (write one with setAttribute before the split; splitBox carries every attribute onto its pieces), and siblings or one parent are excluded the same way. Numbers compare by value whatever their numeric type (NaN never equals anything); strings compare by text, so the two inputs' string tables may differ. `excludeSelf` skips target i for query i, for one cloud wired to BOTH pins (\"does this box overlap any OTHER box of its set\"); it is refused when the two inputs have different point counts, since they cannot then be one cloud. STAGING: query against an EARLIER stage — another branch's finished output, or an applyRules `trail` (the consumed ancestors, whose boxes are the blocks and storeys a later stage needs) — never against the frontier still being rewritten. DETERMINISM: nothing is drawn, nothing is accumulated, and the nearest target is the minimum of (centre distance, target index), so the answers do not depend on the order the targets arrive in beyond that index. COST: O(queries x candidate targets), the candidates found by a uniform grid over the targets' centres with a linear tier for the largest half, pruned by a bounding-sphere bound (two boxes can meet only if their centres are within the sum of their half-diagonals) that changes the cost, never the answer. Under a partitioned cook it is exact given every target whose centre lies within the query's half-diagonal (margin included) plus the largest target's half-diagonal. ERRORS name the pin and point: a box that is not finite or is inside out (min above max), a missing bounds pair, a frame of \"local\" on points without P. CPU ONLY, and deliberately not a GPU adopter: the margin is a value that decides a contact, and a device-rounded margin one ulp off flips a touching pair — the same reason filterByExpression keeps its predicate on the CPU.",
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "targets", kind: "geometry" },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    mode: {
      type: "enum",
      enum: [...MODES],
      default: "overlap",
      description:
        'The question asked of each (query, target) pair. "overlap": the boxes CROSS — sharing only a face, an edge or a corner is NOT an overlap, so neighbouring grammar cells that tile a block do not overlap each other. "touch": the closed test — they overlap OR share a face, edge or corner; with a margin, "within that distance along each of the query\'s axes". "contain": the target lies wholly inside the (grown) query, boundary included. "inside": the (grown) query lies wholly inside the target, boundary included. Decided once per cook.',
    },
    margin: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the QUERY box is GROWN on both sides along each of its own three axes before the test, in world units [x, y, z] (scale is not applied; for a \"world\" query the axes are the world's). 0 tests the box as it is. As a FIELD it is resolved per QUERY point — a scalar broadcasts to all three axes — so each query can reach as far as it needs: a window that must have two clear studs in front of it, but not beside it, grows along its wall's normal only. NEGATIVE shrinks the query: \"inside\" with a small negative margin tolerates a sliver of overhang, and \"overlap\" with one ignores a contact shallower than it. A query whose grown size is below zero on any axis is EMPTY and meets nothing, in every mode. Must be finite.",
    },
    queryFrame: {
      type: "enum",
      enum: [...FRAMES],
      default: "world",
      description:
        'How the QUERY points\' boundsMin/boundsMax are read. "world" (the default): as world coordinates, P, rot and scale not read — the convention of setBounds, splitBox and packBricks, and so of every grammar cell. "local": in the point\'s own frame, placed by P, rot and scale exactly as spawnInstances places a mesh (world = P + rot * (scale * corner)); a rotated point is then tested as an ORIENTED box, exactly. Decided once per cook.',
    },
    targetFrame: {
      type: "enum",
      enum: [...FRAMES],
      default: "world",
      description:
        'How the TARGET points\' boundsMin/boundsMax are read, with the same two choices as `queryFrame`, chosen independently: grammar cells ("world") can be queried against placed, rotated instances ("local"). Decided once per cook.',
    },
    excludeAttr: {
      type: "string",
      default: "",
      description:
        'OPT-IN: the name of a tuple-1 point attribute present on BOTH inputs; a target whose value EQUALS the query\'s is skipped, as if absent. This is how a bay does not count its own wall (give the wall an id before splitting it — splitBox carries every attribute onto its pieces — and give the targets the same column), and how siblings or the children of one parent ignore each other. Numbers compare by value across numeric types (i32, u32, f32, bool), and NaN never equals anything; strings compare by TEXT, so the two inputs\' string tables need not agree. A string on one side and a number on the other is refused. Empty (the default) excludes nothing.',
    },
    excludeSelf: {
      type: "bool",
      default: false,
      description:
        "Skip target i for query i: for ONE cloud wired to both pins, asking whether each box meets any OTHER box of its own set. Refused when the two inputs have different point counts, since they cannot then be one cloud. With two different clouds of equal size it silently pairs them by index, so leave it off there.",
    },
    hitAttr: {
      type: "string",
      default: "contact",
      description:
        "Name of the bool point attribute (tuple 1) receiving whether the query met at least one target. A REPORTING SLOT: an existing bool tuple-1 column of that name is reset and rewritten, one of any other shape is refused rather than destroyed. Empty writes no flag (then countAttr or targetAttr must be set).",
    },
    countAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of the i32 point attribute (tuple 1) receiving how many DISTINCT targets the query met (exclusions not counted). Worth writing when the question is how crowded a box is rather than whether it is clear. A reporting slot on the same terms as hitAttr. Empty (the default) writes none.",
    },
    targetAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of the i32 point attribute (tuple 1) receiving the INDEX, in the targets input, of the met target whose box centre is nearest the query's box centre (ties to the lowest index), or -1 when none was met. Feed it to transferByIndex as `index` to read that target's own attributes — its label, its id, its colour. A reporting slot on the same terms as hitAttr. Empty (the default) writes none.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: every string becomes a code here, and no
    // string reaches the pair loop.
    const modeName = canonicalOneOf(MODES, params.mode);
    if (modeName === undefined) {
      throw new Error(`${NODE}: param "mode" is ${JSON.stringify(params.mode)}; valid: ${MODES.join(", ")}.`);
    }
    const mode = MODES.indexOf(modeName as (typeof MODES)[number]) as ModeCode;
    const qFrame = canonicalOneOf(FRAMES, params.queryFrame);
    if (qFrame === undefined) {
      throw new Error(`${NODE}: param "queryFrame" is ${JSON.stringify(params.queryFrame)}; valid: ${FRAMES.join(", ")}.`);
    }
    const tFrame = canonicalOneOf(FRAMES, params.targetFrame);
    if (tFrame === undefined) {
      throw new Error(`${NODE}: param "targetFrame" is ${JSON.stringify(params.targetFrame)}; valid: ${FRAMES.join(", ")}.`);
    }
    const qLocal = qFrame === "local";
    const tLocal = tFrame === "local";
    const excludeSelf = params.excludeSelf === true;
    requireFinitePlainParam(
      params.margin,
      NODE,
      "margin",
      "A margin is a finite distance per axis (negative shrinks the query box). Write [0, 0, 0] for none.",
    );

    const slots = [
      ["hitAttr", params.hitAttr, "bool", "contactHit"],
      ["countAttr", params.countAttr, "i32", "contactCount"],
      ["targetAttr", params.targetAttr, "i32", "contactTarget"],
    ] as const;
    if (slots.every(([, name]) => name === "")) {
      throw new Error(
        `${NODE}: nothing to write — "hitAttr", "countAttr" and "targetAttr" are all empty. Set hitAttr (a bool: met any target), countAttr (an i32: how many) or targetAttr (an i32: the nearest met target's index), or more than one.`,
      );
    }
    for (let p = 0; p < 3; p++) {
      for (let r = p + 1; r < 3; r++) {
        if (slots[p][1] !== "" && slots[p][1] === slots[r][1]) {
          throw new Error(
            `${NODE}: params "${slots[p][0]}" and "${slots[r][0]}" are both "${slots[p][1]}"; they are different facts and need different attributes, or one would overwrite the other with no complaint. Rename one, or clear it to write nothing.`,
          );
        }
      }
    }

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const tgt = requireGeometry(inputs, "targets", NODE);
    const n = src.attrs.point.count;
    const m = tgt.attrs.point.count;
    for (const [param, name, type, suggestion] of slots) {
      if (name === "") continue;
      requireReportSlot({ attrs: src.attrs.point, nodeType: NODE, param, name, type, tupleSize: 1, domain: "point", suggestion });
    }
    if (excludeSelf && n !== m) {
      throw new Error(
        `${NODE}: "excludeSelf" is on, which skips target i for query i and so means ONE cloud wired to both pins, but "in" has ${n} point(s) and "targets" has ${m}. Wire the same geometry to both, or turn excludeSelf off and exclude by an id with "excludeAttr".`,
      );
    }

    let qKey: Float64Array | undefined;
    let tKey: Float64Array | undefined;
    const exName = params.excludeAttr;
    if (exName !== "") {
      const qa = src.attrs.point.get(exName);
      const ta = tgt.attrs.point.get(exName);
      for (const [pin, attr, geo] of [
        ["in", qa, src],
        ["targets", ta, tgt],
      ] as const) {
        if (attr === undefined) {
          throw new Error(
            `${NODE}: "excludeAttr" is "${exName}", but the input on pin "${pin}" has no such point attribute (it has: ${geo.attrs.point.names().join(", ") || "none"}). The attribute must be on BOTH inputs — write it with setAttribute on each, or clear excludeAttr.`,
          );
        }
        if (attr.tupleSize !== 1) {
          throw new Error(
            `${NODE}: "excludeAttr" "${exName}" on pin "${pin}" has tupleSize ${attr.tupleSize}; an exclusion key is ONE value per point (an id, a label). Write a tuple-1 id with setAttribute.`,
          );
        }
      }
      if ((qa!.type === "string") !== (ta!.type === "string")) {
        throw new Error(
          `${NODE}: "excludeAttr" "${exName}" is ${qa!.type} on pin "in" but ${ta!.type} on pin "targets"; a string never equals a number, so nothing would ever be excluded. Make both sides strings or both numbers.`,
        );
      }
      const keys = exclusionKeys(qa!, ta!, n, m);
      qKey = keys.q;
      tKey = keys.t;
    }

    const marginCol = requireVec3Column(
      resolveOn(src, "point", params.margin, seed, NODE, "margin"),
      NODE,
      "margin",
      "query point",
      "a margin is a distance per axis of the query box",
    );

    const Q = buildBoxes(src, qLocal, "in", "queryFrame");
    const T = buildBoxes(tgt, tLocal, "targets", "targetFrame");

    // ---- the grown queries, and every box's bounding-sphere radius.
    const qh = new Float64Array(n * 3);
    const qEmpty = new Uint8Array(n);
    const qRad = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let empty = false;
      for (let k = 0; k < 3; k++) {
        const g = Q.half[i * 3 + k] + readComp(marginCol, i, k);
        qh[i * 3 + k] = g;
        if (g < 0) empty = true;
      }
      qEmpty[i] = empty ? 1 : 0;
      qRad[i] = empty ? 0 : Math.hypot(qh[i * 3], qh[i * 3 + 1], qh[i * 3 + 2]);
    }
    const tRad = new Float64Array(m);
    for (let j = 0; j < m; j++) tRad[j] = Math.hypot(T.half[j * 3], T.half[j * 3 + 1], T.half[j * 3 + 2]);

    // An absolute slack for the prefilter, from the largest coordinate in
    // play: rounding in a centre is relative to IT, not to the radii.
    let maxCoord = 0;
    for (const c of [Q.centre, T.centre]) for (let k = 0; k < c.length; k++) maxCoord = Math.max(maxCoord, Math.abs(c[k]));
    const absSlack = 1e-12 * maxCoord;

    // ---- the index: targets no larger than the median binned by centre,
    // the rest scanned per query.
    let grid: UniformGrid | undefined;
    let binned = new Uint32Array(0);
    let large = new Uint32Array(0);
    let split = 0;
    if (m > 0 && n > 0) {
      const sorted = Float64Array.from(tRad).sort();
      split = sorted[(m - 1) >> 1];
      const bin: number[] = [];
      const big: number[] = [];
      for (let j = 0; j < m; j++) (tRad[j] <= split ? bin : big).push(j);
      binned = Uint32Array.from(bin);
      large = Uint32Array.from(big);
      const qSorted = Float64Array.from(qRad).sort();
      let cell = split + qSorted[(n - 1) >> 1];
      if (!(cell > 0) || !Number.isFinite(cell)) {
        // All boxes are points (or near enough): size the cell from the
        // spread of the binned centres instead. Never decides an answer.
        let ext = 0;
        for (let k = 0; k < 3; k++) {
          let lo = Infinity;
          let hi = -Infinity;
          for (const j of binned) {
            const v = T.centre[j * 3 + k];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          ext = Math.max(ext, hi - lo);
        }
        cell = ext > 0 ? ext / Math.cbrt(binned.length) : 1;
      }
      const positions = new Float64Array(binned.length * 3);
      for (let k = 0; k < binned.length; k++) {
        positions[k * 3] = T.centre[binned[k] * 3];
        positions[k * 3 + 1] = T.centre[binned[k] * 3 + 1];
        positions[k * 3 + 2] = T.centre[binned[k] * 3 + 2];
      }
      grid = UniformGrid.build({ data: positions, stride: 3, count: binned.length }, cell);
    }

    // ---- the queries
    const hit = new Uint8Array(n);
    const count = new Int32Array(n);
    const nearest = new Int32Array(n).fill(-1);
    const cand: number[] = [];
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (qEmpty[i] === 1 || m === 0) continue;
      const cx = Q.centre[i * 3];
      const cy = Q.centre[i * 3 + 1];
      const cz = Q.centre[i * 3 + 2];
      let c = 0;
      let best = -1;
      let bestD = Infinity;
      const consider = (j: number): void => {
        if (excludeSelf && j === i) return;
        if (qKey !== undefined && qKey[i] === tKey![j]) return;
        if (!boxesMeet(mode, Q, qh, i, T, j)) return;
        c++;
        const dx = T.centre[j * 3] - cx;
        const dy = T.centre[j * 3 + 1] - cy;
        const dz = T.centre[j * 3 + 2] - cz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD || (d === bestD && j < best)) {
          bestD = d;
          best = j;
        }
      };
      if (grid !== undefined && binned.length > 0) {
        const reach = (qRad[i] + split) * (1 + SPHERE_SLACK) + absSlack;
        grid.queryRadiusUnordered(cx, cy, cz, reach, cand);
        for (let k = 0; k < cand.length; k++) consider(binned[cand[k]]);
      }
      for (let k = 0; k < large.length; k++) {
        const j = large[k];
        const reach = (qRad[i] + tRad[j]) * (1 + SPHERE_SLACK) + absSlack;
        const dx = T.centre[j * 3] - cx;
        const dy = T.centre[j * 3 + 1] - cy;
        const dz = T.centre[j * 3 + 2] - cz;
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        consider(j);
      }
      hit[i] = c > 0 ? 1 : 0;
      count[i] = c;
      nearest[i] = best;
    }

    // ---- write: every field was resolved above, before any column moved.
    const out = deriveGeometry(src);
    const set = out.attrs.point;
    if (params.hitAttr !== "") (set.replace(params.hitAttr, "bool", 1, 0).writable() as Uint8Array).set(hit);
    if (params.countAttr !== "") (set.replace(params.countAttr, "i32", 1, 0).writable() as Int32Array).set(count);
    if (params.targetAttr !== "") (set.replace(params.targetAttr, "i32", 1, -1).writable() as Int32Array).set(nearest);
    return { out: [makeGeometryItem(out)] };
  },
});
