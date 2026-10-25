/**
 * The FACE FRAME `placeBox` and `offsetBox` read under `frame: "face"`: a
 * cell's own axes [along, up, out], from the attributes `shellSplit` writes
 * on every face and `splitBox` carries onto every piece cut from one.
 * Internal: not re-exported from `src/nodes/index.ts`.
 *
 * THREE ATTRIBUTES, ONE DERIVED AXIS. Along is an axis code and a sign
 * (`alongAxis`, `alongSign`); out is the `outward` normal, one signed axis;
 * up is the axis that keeps along x up = out, shellSplit's right-handed
 * frame, so it need not be written — the brick house's facade writes no
 * `upAxis`/`upSign` at all. Up = out x along: for unit axes e_o, e_a
 * (o != a) the cross is +e_u when (o, a, u) is a cyclic order of
 * (0, 1, 2) and -e_u otherwise, u the third axis. On every shellSplit face
 * this equals the up it writes (floor and ceiling included).
 *
 * SELECTED, NEVER INFERRED: the caller reads the columns only under
 * "face", and a missing one is refused by name — every missing one at once
 * — so the presence of an attribute never changes what a number means.
 */
import { suggestNames } from "../diagnostics/didYouMean.js";
import type { Attribute } from "../data/index.js";

/** The `frame` param of a box node. */
export const BOX_FRAMES = ["world", "face"] as const;
/** The three components of a face-frame vec3, in order. */
export const FACE_AXIS_NAMES = ["along", "up", "out"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** The three frame columns, looked up once by name, and the names they were read under. */
export interface FaceFrameColumns {
  readonly alongAxis: ArrayLike<number>;
  readonly alongSign: ArrayLike<number>;
  readonly outward: ArrayLike<number>;
  readonly alongAxisAttr: string;
  readonly alongSignAttr: string;
  readonly outwardAttr: string;
}

/** The three attribute-name params, as a node's params carry them. */
export interface FaceFrameParams {
  readonly alongAxisAttr: string;
  readonly alongSignAttr: string;
  readonly outwardAttr: string;
}

const SLOTS = [
  { param: "alongAxisAttr", what: "the along axis", tupleSize: 1, written: "i32 tuple 1", dflt: "alongAxis" },
  { param: "alongSignAttr", what: "the along direction", tupleSize: 1, written: "i32 tuple 1", dflt: "alongSign" },
  { param: "outwardAttr", what: "the outward normal", tupleSize: 3, written: "f32 tuple 3", dflt: "outward" },
] as const;

/**
 * The face-frame columns of `attrs` (a point domain), or ONE refusal naming
 * every attribute that is missing, empty-named or the wrong shape.
 */
export function readFaceFrame(
  node: string,
  attrs: { get(name: string): Attribute | undefined; names(): string[] },
  names: FaceFrameParams,
): FaceFrameColumns {
  const cols: ArrayLike<number>[] = [];
  const problems: string[] = [];
  for (const slot of SLOTS) {
    const name = names[slot.param];
    if (typeof name !== "string" || name === "") {
      problems.push(`param "${slot.param}" is ${JSON.stringify(name)}, so nothing names ${slot.what} (shellSplit's default is "${slot.dflt}")`);
      continue;
    }
    const attr = attrs.get(name);
    if (attr === undefined) {
      const near = suggestNames(name, attrs.names());
      problems.push(`there is no "${name}" (param "${slot.param}", ${slot.what})${near.names.length > 0 ? ` — ${near.clause.trim()}` : ""}`);
      continue;
    }
    if (attr.type === "string" || attr.tupleSize !== slot.tupleSize) {
      problems.push(`"${name}" (param "${slot.param}", ${slot.what}) is ${attr.type} tupleSize ${attr.tupleSize}, where shellSplit writes ${slot.written}`);
      continue;
    }
    cols.push(attr.data as ArrayLike<number>);
  }
  if (problems.length > 0) {
    throw new Error(
      `${node}: frame "face" reads each cell's frame from three point attributes — the along axis, its sign and the outward normal — and the input on pin "in" cannot give ${problems.length === 1 ? "one of them" : `${problems.length} of them`}: ${problems.join("; ")}. shellSplit writes all three (alongAxis, alongSign, outward) and splitBox carries them onto every piece cut from a face; split the cells with shellSplit first, point the params at the attributes that hold the frame, or set frame to "world".`,
    );
  }
  return {
    alongAxis: cols[0] as ArrayLike<number>,
    alongSign: cols[1] as ArrayLike<number>,
    outward: cols[2] as ArrayLike<number>,
    alongAxisAttr: names.alongAxisAttr,
    alongSignAttr: names.alongSignAttr,
    outwardAttr: names.outwardAttr,
  };
}

/**
 * Cell `i`'s frame: `axis[c]` and `sign[c]` (+1 / -1) are the world axis
 * and direction of frame component c (along, up, out). Refuses, naming the
 * cell, a frame that is not one: an along axis that is not 0, 1 or 2 (or
 * is the out axis), a zero or non-finite sign, an outward normal that is
 * not exactly one signed axis (shellSplit's interior, whose normal is
 * zero, has no out).
 */
export function decodeFaceFrame(node: string, cols: FaceFrameColumns, i: number, axis: number[], sign: number[]): void {
  const av = cols.alongAxis[i];
  const sv = cols.alongSign[i];
  // Along first: a cell shellSplit passed through has no frame at all
  // (-1, 0, [0, 0, 0]), and that is the thing to say about it.
  if (!(av === 0 || av === 1 || av === 2)) {
    throw new Error(
      `${node}: frame "face" needs cell ${i}'s along axis ("${cols.alongAxisAttr}") to be 0 (x), 1 (y) or 2 (z), and it is ${av}${av === -1 ? " — what shellSplit leaves on a cell its `where` passed through, and what boxContact writes on a pair that touches only along an edge or at a corner: neither has a face, so neither has a frame" : ""}. Leave such cells out with "where", e.g. where ge(attribute("${cols.alongAxisAttr}"), 0), or use frame "world".`,
    );
  }
  if (!(sv > 0 || sv < 0) || !Number.isFinite(sv)) {
    throw new Error(
      `${node}: frame "face" needs cell ${i}'s along sign ("${cols.alongSignAttr}") to be +1 or -1, and it is ${sv}${sv === 0 ? " — what shellSplit leaves on a cell its `where` passed through, and what boxContact writes on a pair that touches only along an edge or at a corner: neither has a face, so neither has a frame" : ""}. Leave such cells out with "where", or use frame "world".`,
    );
  }
  const n = cols.outward;
  let outAxis = -1;
  let nonzero = 0;
  for (let k = 0; k < 3; k++) {
    if (n[i * 3 + k] !== 0) {
      nonzero++;
      outAxis = k;
    }
  }
  const ov = outAxis < 0 ? 0 : n[i * 3 + outAxis];
  if (nonzero !== 1 || !Number.isFinite(ov)) {
    throw new Error(
      `${node}: frame "face" needs ONE signed axis as cell ${i}'s outward normal ("${cols.outwardAttr}"), and it is [${n[i * 3]}, ${n[i * 3 + 1]}, ${n[i * 3 + 2]}] — ${nonzero === 0 ? "a zero normal faces nowhere (shellSplit's interior), so the cell has no out axis" : "a tilted normal does not name a face of an axis-aligned box"}. Leave such cells out with "where" (shellSplit's interior is face 6: where lt(attribute("face"), 6)), or use frame "world".`,
    );
  }
  if (av === outAxis) {
    throw new Error(
      `${node}: frame "face" needs cell ${i}'s along axis ("${cols.alongAxisAttr}") to lie IN the face, not along its outward normal ("${cols.outwardAttr}"), and both are ${AXIS_NAMES[av]} (${av}). A face's along and out are different axes; check the node that wrote this frame, or use frame "world".`,
    );
  }
  const oS = ov > 0 ? 1 : -1;
  const aS = sv > 0 ? 1 : -1;
  const cyclic = (av - outAxis + 3) % 3 === 1;
  axis[0] = av;
  sign[0] = aS;
  axis[1] = 3 - outAxis - av;
  sign[1] = oS * aS * (cyclic ? 1 : -1);
  axis[2] = outAxis;
  sign[2] = oS;
}
