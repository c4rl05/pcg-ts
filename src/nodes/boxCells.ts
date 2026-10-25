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
