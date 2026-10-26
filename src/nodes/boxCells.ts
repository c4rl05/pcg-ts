/**
 * The preamble every box node runs on its cells before the per-cell work:
 * the box columns looked up and checked once, each cell's box checked axis
 * by axis, and `where` decided. Internal: not re-exported from
 * `src/nodes/index.ts`.
 *
 * Every message is the calling node's: the fragments that differ between
 * nodes — what a bad box costs THIS node, and what to do about it — are
 * passed in as constant strings and only ever interpolated, never compared,
 * so no param string reaches a helper called from a per-cell loop.
 */
import type { AttributeSet, Geometry } from "../data/index.js";
import { isField } from "../fields/index.js";
import { type FieldParam, requireScalarColumn, resolveOn } from "./util.js";

const AXIS_NAMES = ["x", "y", "z"] as const;

/** What most box nodes say after a missing or misshapen box column. */
export const BOX_COLUMNS_FIX =
  "a cell's box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the cells their boxes with setBounds first.";

/**
 * The cells' corners, `boundsMin` and `boundsMax` on `set` (the point
 * domain of the input on `pin`), each checked to be f32 tuple 3; otherwise
 * a refusal naming the column and ending in `fix`. The arrays are the
 * input's own: taken before `deriveGeometry` makes the output's writable,
 * they stay the input's, since columns are shared copy-on-write.
 */
export function requireBoxColumns(
  node: string,
  set: AttributeSet,
  pin: string,
  fix: string = BOX_COLUMNS_FIX,
): { readonly lo: Float32Array; readonly hi: Float32Array } {
  const cols: Float32Array[] = [];
  for (const name of ["boundsMin", "boundsMax"] as const) {
    const attr = set.get(name);
    if (attr === undefined || attr.type !== "f32" || attr.tupleSize !== 3) {
      throw new Error(
        `${node}: the input on pin "${pin}" ${attr === undefined ? `has no "${name}" point attribute` : `has "${name}" as ${attr.type} tupleSize ${attr.tupleSize}`}; ${fix}`,
      );
    }
    cols.push(attr.data as Float32Array);
  }
  return { lo: cols[0], hi: cols[1] };
}

/** An inside-out box's wording where a node does not say "is inside out" and give the not-finite tail. */
export interface InsideOutWording {
  /** What the box is along the axis, e.g. "ARRIVED inside out". */
  readonly state: string;
  /** The sentence after the corners, e.g. "so a scale has no inside to keep. ...". */
  readonly tail: string;
}

/**
 * Cell `i`'s box along axis `a`, corners `l` and `h`, checked: both finite,
 * and not inside out (h >= l; a box of no volume is a box). A refusal names
 * the node, the cell, the axis and the corners, then says `tail` — what
 * the node cannot do with such a box, and the fix — or, for an inside-out
 * box, `insideOut`'s own wording when given.
 */
export function requireCellBoxAxis(
  node: string,
  i: number,
  a: number,
  l: number,
  h: number,
  tail: string,
  insideOut?: InsideOutWording,
): void {
  if (!Number.isFinite(l) || !Number.isFinite(h)) {
    throw new Error(`${node}: cell ${i}'s box is not finite along ${AXIS_NAMES[a]} — boundsMin ${l}, boundsMax ${h} — ${tail}`);
  }
  if (!(h >= l)) {
    throw new Error(
      `${node}: cell ${i}'s box ${insideOut?.state ?? "is inside out"} along ${AXIS_NAMES[a]} — boundsMin ${l} is above boundsMax ${h} — ${insideOut?.tail ?? tail}`,
    );
  }
}

/**
 * A box node's `where`, decided once: which cells the node works on. A
 * plain value chooses every cell (nonzero) or none (0); a field is resolved
 * on the input's cells, one number each, `what` naming it in a refusal of
 * any other width.
 */
export function resolveWhere(src: Geometry, where: FieldParam, seed: number, node: string, what: string): (i: number) => boolean {
  let whereCol: ArrayLike<number> | undefined;
  let whereAll = true;
  if (isField(where)) {
    whereCol = requireScalarColumn(resolveOn(src, "point", where, seed, node, "where"), node, "where", "cell", what).data;
  } else {
    whereAll = (where as number) !== 0;
  }
  return (i: number): boolean => (whereCol === undefined ? whereAll : whereCol[i] !== 0);
}

/**
 * The cells' transforms — the columns a box is read THROUGH, since a cell's
 * box is an extent in its point's own frame (world = P + rot * (scale * x)):
 * P (f32, at least tuple 3, required), `rot` (f32 tuple 4) and `scale` (f32
 * tuple 3), each optional and read as the identity when missing. A column
 * of the wrong shape is refused naming it. The arrays are the input's own,
 * as {@link requireBoxColumns}' are.
 */
export interface CellFrameColumns {
  readonly P: ArrayLike<number>;
  readonly pStride: number;
  readonly rot: ArrayLike<number> | undefined;
  readonly scale: ArrayLike<number> | undefined;
}

export function requireCellFrameColumns(node: string, set: AttributeSet, pin: string): CellFrameColumns {
  const p = set.get("P");
  if (p === undefined || p.type !== "f32" || p.tupleSize < 3) {
    throw new Error(
      `${node}: a cell's box is an extent in its point's own frame (world = P + rot * (scale * x)), so every cell needs its point's position, but the input on pin "${pin}" has ${p === undefined ? "no P attribute" : `P as ${p.type} tupleSize ${p.tupleSize}`}. Give the points positions (every point cloud the library makes carries P).`,
    );
  }
  const r = set.get("rot");
  if (r !== undefined && (r.type !== "f32" || r.tupleSize !== 4)) {
    throw new Error(
      `${node}: the standard point attribute "rot" on pin "${pin}" is ${r.type} tupleSize ${r.tupleSize}, but a rotation is an f32 tuple-4 quaternion (x, y, z, w). Rename that column.`,
    );
  }
  const s = set.get("scale");
  if (s !== undefined && (s.type !== "f32" || s.tupleSize !== 3)) {
    throw new Error(
      `${node}: the standard point attribute "scale" on pin "${pin}" is ${s.type} tupleSize ${s.tupleSize}, but a scale is f32 tuple 3. Rename that column.`,
    );
  }
  return { P: p.data as ArrayLike<number>, pStride: p.tupleSize, rot: r?.data as ArrayLike<number> | undefined, scale: s?.data as ArrayLike<number> | undefined };
}

/**
 * Cell `i`'s transform, written into `out`: P, the rotation NORMALIZED in
 * f64 (boxContact's rule, so every reader of a box places it where the
 * others do; a zero quaternion is the identity), and the scale. `out.pure`
 * is 1 exactly when the normalized rotation is the identity (w = +1 or -1)
 * and the scale is exactly (1, 1, 1) — the pure translation a reader may
 * take a fast path on. A non-finite P, rot or scale is refused naming the
 * cell.
 */
export interface CellFrame {
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  sx: number;
  sy: number;
  sz: number;
  pure: boolean;
}

export function newCellFrame(): CellFrame {
  return { px: 0, py: 0, pz: 0, qx: 0, qy: 0, qz: 0, qw: 1, sx: 1, sy: 1, sz: 1, pure: true };
}

export function readCellFrame(node: string, cols: CellFrameColumns, i: number, out: CellFrame): CellFrame {
  const o = i * cols.pStride;
  out.px = cols.P[o];
  out.py = cols.P[o + 1];
  out.pz = cols.P[o + 2];
  let qx = 0;
  let qy = 0;
  let qz = 0;
  let qw = 1;
  if (cols.rot !== undefined) {
    qx = cols.rot[i * 4];
    qy = cols.rot[i * 4 + 1];
    qz = cols.rot[i * 4 + 2];
    qw = cols.rot[i * 4 + 3];
    const len = Math.hypot(qx, qy, qz, qw);
    if (!Number.isFinite(len)) {
      throw new Error(`${node}: cell ${i} has a non-finite "rot" (${qx}, ${qy}, ${qz}, ${qw}). Fix whatever wrote it, or drop the cell first (filterByExpression).`);
    }
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
  out.qx = qx;
  out.qy = qy;
  out.qz = qz;
  out.qw = qw;
  out.sx = cols.scale !== undefined ? cols.scale[i * 3] : 1;
  out.sy = cols.scale !== undefined ? cols.scale[i * 3 + 1] : 1;
  out.sz = cols.scale !== undefined ? cols.scale[i * 3 + 2] : 1;
  if (![out.px, out.py, out.pz, out.sx, out.sy, out.sz].every(Number.isFinite)) {
    throw new Error(
      `${node}: cell ${i} has a non-finite P (${out.px}, ${out.py}, ${out.pz}) or scale (${out.sx}, ${out.sy}, ${out.sz}). Fix whatever wrote it, or drop the cell first (filterByExpression).`,
    );
  }
  out.pure = qx === 0 && qy === 0 && qz === 0 && Math.abs(qw) === 1 && out.sx === 1 && out.sy === 1 && out.sz === 1;
  return out;
}

/**
 * The rotation matrix (row-major, 9 entries) of cell frame `fr`'s
 * normalized quaternion, every entry within 2^-40 of 0, +1 or -1 SNAPPED to
 * it. A quarter turn stored in f32 (SQRT1_2 rounded) normalizes to a matrix
 * whose zeros are 1e-16 and whose ones are 1 + 2e-16; mapped through it, a
 * box corner on an axis comes out 3e-16 off, which f32 holds. Snapped, a
 * quarter or half turn is an exact signed permutation and moves every
 * coordinate exactly, as the identity does. The snap moves an entry by
 * under 1e-12, a millionth of what an f32 coordinate resolves.
 */
const SNAP = 2 ** -40;
function snapUnit(v: number): number {
  if (Math.abs(v) < SNAP) return 0;
  if (Math.abs(v - 1) < SNAP) return 1;
  if (Math.abs(v + 1) < SNAP) return -1;
  return v;
}
export function cellRotation(fr: CellFrame, m: number[]): number[] {
  const { qx: x, qy: y, qz: z, qw: w } = fr;
  m[0] = snapUnit(1 - 2 * (y * y + z * z));
  m[1] = snapUnit(2 * (x * y - z * w));
  m[2] = snapUnit(2 * (x * z + y * w));
  m[3] = snapUnit(2 * (x * y + z * w));
  m[4] = snapUnit(1 - 2 * (x * x + z * z));
  m[5] = snapUnit(2 * (y * z - x * w));
  m[6] = snapUnit(2 * (x * z - y * w));
  m[7] = snapUnit(2 * (y * z + x * w));
  m[8] = snapUnit(1 - 2 * (x * x + y * y));
  return m;
}
