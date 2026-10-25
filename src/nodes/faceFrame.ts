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
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import type { Attribute } from "../data/index.js";

/**
 * The `frame` param of a box node. "box" reads a vec3 along the box's own
 * axes — its stored x, y, z, which turn with the point's rot — and "face"
 * along the face frame below. "box" was "world" until the box nodes read
 * bounds as an extent local to the point's transform; the old word is
 * refused with the rename stated ({@link decodeBoxFrame}).
 */
export const BOX_FRAMES = ["box", "face"] as const;

/** Why "world" became "box": the schema's `renamed` entry, and the direct-call refusal's text. */
export const BOX_FRAME_RENAMED = {
  world: {
    to: "box",
    why: "a cell's box is an extent in its point's OWN frame (world = P + rot * (scale * x)), so the axes this frame reads are the box's, not the world's; the reading is the same [x, y, z]",
  },
} as const;
/** The three components of a face-frame vec3, in order. */
export const FACE_AXIS_NAMES = ["along", "up", "out"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/**
 * THE FACE CONVENTION, stated once: shellSplit's face codes and the frame
 * each one carries, indexed by the code. shellSplit writes it, boxesToMesh
 * lays its sides and their uv by it, and boxContact's `pairs` write it on a
 * one-face contact. Code 0 floor (min y), 1 south (min z), 2 north (max z),
 * 3 west (min x), 4 east (max x), 5 ceiling (max y), 6 the interior.
 *
 * Per code: the along, up and out axes (0 = x, 1 = y, 2 = z), the signs of
 * along and up, the side of the box (-1 min, +1 max) and the outward
 * normal, chosen so that (ALONG_SIGN * e[ALONG]) x (UP_SIGN * e[UP]) =
 * OUTWARD on every face — the shellSplit test checks that cross product,
 * and the faceFrame test that {@link decodeFaceFrame} derives this up from
 * this along and out. On a wall up is +y and along runs left to right as
 * seen from outside. The interior faces nowhere: its frame is the box's
 * own axes (along +x, up +y, out z), its side 0 and its outward normal
 * zero. Every code names a side of the box in its OWN axes, so on a
 * rotated cell "south" is the min-z side of the box, wherever that faces.
 */
export const FACE_NAMES = ["floor", "south", "north", "west", "east", "ceiling"] as const;
export const FACE_ALONG = [0, 0, 0, 2, 2, 0, 0] as const;
export const FACE_ALONG_SIGN = [1, -1, 1, 1, -1, 1, 1] as const;
export const FACE_UP = [2, 1, 1, 1, 1, 2, 1] as const;
export const FACE_UP_SIGN = [1, 1, 1, 1, 1, -1, 1] as const;
export const FACE_OUT = [1, 2, 2, 0, 0, 1, 2] as const;
export const FACE_SIDE = [-1, -1, 1, -1, 1, 1, 0] as const;
export const FACE_OUTWARD: readonly (readonly [number, number, number])[] = [
  [0, -1, 0],
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];
/** The interior's face code, after the six shell faces. */
export const FACE_INTERIOR = 6;

/** Min-side and max-side face codes per out axis: x west / east, y floor / ceiling, z south / north. */
const MIN_FACE = [3, 0, 1] as const;
const MAX_FACE = [4, 5, 2] as const;

/** The face code of the box side normal to `outAxis` (0, 1, 2) on side `side` (< 0 the min side, else the max). */
export function faceCodeOf(outAxis: number, side: number): number {
  return side < 0 ? MIN_FACE[outAxis] : MAX_FACE[outAxis];
}

/** The three attribute-name params, as a node's params carry them. */
export interface FaceFrameParams {
  readonly alongAxisAttr: string;
  readonly alongSignAttr: string;
  readonly outwardAttr: string;
}

/** The three frame columns, looked up once by name, and the names they were read under. */
export interface FaceFrameColumns extends FaceFrameParams {
  readonly alongAxis: ArrayLike<number>;
  readonly alongSign: ArrayLike<number>;
  readonly outward: ArrayLike<number>;
}

/**
 * The `frame` param of `placeBox` and `offsetBox`, decided once: true for
 * "face", false for "box", or a refusal naming both — the old word "world"
 * with the rename stated.
 */
export function decodeBoxFrame(node: string, value: unknown): boolean {
  const frame = canonicalOneOf(BOX_FRAMES, value);
  if (frame === undefined && value === "world") {
    throw new Error(`${node}: param "frame" is "world", which was renamed "box" — ${BOX_FRAME_RENAMED.world.why}. Write "box" (the default). Valid: ${BOX_FRAMES.join(", ")}.`);
  }
  if (frame === undefined) {
    throw new Error(
      `${node}: param "frame" is ${JSON.stringify(value)}; valid: ${BOX_FRAMES.join(", ")} — "face" is the frame shellSplit writes (along, up, out), read from alongAxisAttr, alongSignAttr and outwardAttr.`,
    );
  }
  return frame === "face";
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
      `${node}: frame "face" reads each cell's frame from three point attributes — the along axis, its sign and the outward normal — and the input on pin "in" cannot give ${problems.length === 1 ? "one of them" : `${problems.length} of them`}: ${problems.join("; ")}. shellSplit writes all three (alongAxis, alongSign, outward) and splitBox carries them onto every piece cut from a face; split the cells with shellSplit first, point the params at the attributes that hold the frame, or set frame to "box".`,
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

/** Why a cell with no face has no frame: said of an along axis of -1 and of a sign of 0. */
const NO_FACE =
  " — what shellSplit leaves on a cell its `where` passed through, and what boxContact writes on a pair that touches only along an edge or at a corner: neither has a face, so neither has a frame";

/**
 * Cell `i`'s frame: `axis[c]` and `sign[c]` (+1 / -1) are the box axis
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
      `${node}: frame "face" needs cell ${i}'s along axis ("${cols.alongAxisAttr}") to be 0 (x), 1 (y) or 2 (z), and it is ${av}${av === -1 ? NO_FACE : ""}. Leave such cells out with "where", e.g. where ge(attribute("${cols.alongAxisAttr}"), 0), or use frame "box".`,
    );
  }
  if (!(sv > 0 || sv < 0) || !Number.isFinite(sv)) {
    throw new Error(
      `${node}: frame "face" needs cell ${i}'s along sign ("${cols.alongSignAttr}") to be +1 or -1, and it is ${sv}${sv === 0 ? NO_FACE : ""}. Leave such cells out with "where", or use frame "box".`,
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
      `${node}: frame "face" needs ONE signed axis as cell ${i}'s outward normal ("${cols.outwardAttr}"), and it is [${n[i * 3]}, ${n[i * 3 + 1]}, ${n[i * 3 + 2]}] — ${nonzero === 0 ? "a zero normal faces nowhere (shellSplit's interior), so the cell has no out axis" : "a tilted normal does not name a face of an axis-aligned box"}. Leave such cells out with "where" (shellSplit's interior is face 6: where lt(attribute("face"), 6)), or use frame "box".`,
    );
  }
  if (av === outAxis) {
    throw new Error(
      `${node}: frame "face" needs cell ${i}'s along axis ("${cols.alongAxisAttr}") to lie IN the face, not along its outward normal ("${cols.outwardAttr}"), and both are ${AXIS_NAMES[av]} (${av}). A face's along and out are different axes; check the node that wrote this frame, or use frame "box".`,
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
