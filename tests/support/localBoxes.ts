/**
 * The local-bounds property harness: random point transforms, the world
 * image of a local box, an f32 ulp distance, and ONE comparator that says
 * whether a box node's output under a transform is its output at the
 * identity with that transform carried.
 *
 * WHY IT EXISTS. A cell's `boundsMin`/`boundsMax` are an extent LOCAL to
 * the point's transform — world(x) = P + rot * (scale * x), the reading
 * copyToPoints and spawn already use. The box nodes that cut, place,
 * offset and transform boxes (splitBox, shellSplit, placeBox, offsetBox,
 * transformBox, applyRules over them) do their arithmetic along the box's
 * own axes and never read P, rot or scale: every piece is a gather of its
 * parent, so the parent's transform rides onto it bit for bit. Under the
 * local reading that is already the right answer for ANY transform an
 * affine map commutes with — which is every cut, placement, offset and
 * per-axis scale along the box's own axes. This harness executes that
 * claim rather than asserting it: cook the same bounds at the identity and
 * under a transform, and every byte must agree except the transform
 * columns, which must be the transform.
 *
 * Shared by `tests/localBoxes.test.ts` and the later boxContact and
 * boxesToMesh suites, which need `worldCorners` and `ulpDiff` too.
 */
import type { Geometry } from "../../src/data/index.js";
import { Pcg32 } from "../../src/random/index.js";

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

/** A point transform as the standard columns store it: P, rot (x, y, z, w), scale. */
export interface PointTransform {
  readonly P: Vec3;
  readonly rot: Quat;
  readonly scale: Vec3;
}

export const IDENTITY: PointTransform = { P: [0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1] };

const f3 = (v: readonly number[]): Vec3 => [Math.fround(v[0]!), Math.fround(v[1]!), Math.fround(v[2]!)];

/** The transform as f32 columns would hold it (every component through Math.fround). */
export function storedTransform(t: PointTransform): PointTransform {
  return { P: f3(t.P), rot: t.rot.map(Math.fround) as Quat, scale: f3(t.scale) };
}

/** `v` rotated by unit quaternion `q`, in f64: v + 2w(u x v) + 2u x (u x v). */
function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/**
 * The eight WORLD corners of local box [lo, hi] under `t`, in f64:
 * P + R(S x) for every corner x, the quaternion normalized in f64 first (a
 * zero quaternion is the identity). Corner k takes hi on axis a where bit a
 * of k is set.
 */
export function worldCorners(t: PointTransform, lo: readonly number[], hi: readonly number[]): Vec3[] {
  const [qx, qy, qz, qw] = t.rot;
  const len = Math.hypot(qx, qy, qz, qw);
  const q: Quat = len === 0 ? [0, 0, 0, 1] : [qx / len, qy / len, qz / len, qw / len];
  const out: Vec3[] = [];
  for (let k = 0; k < 8; k++) {
    const x: Vec3 = [0, 1, 2].map((a) => ((k >> a) & 1 ? hi[a]! : lo[a]!) * t.scale[a]!) as Vec3;
    const r = rotate(q, x);
    out.push([t.P[0] + r[0], t.P[1] + r[1], t.P[2] + r[2]]);
  }
  return out;
}

/** The f32 of `x` as an ordered integer, so adjacent f32 values differ by 1 (+0 and -0 both map to 0). */
function orderedF32(x: number): number {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, x);
  const bits = view.getInt32(0);
  return bits < 0 ? -(bits & 0x7fffffff) : bits;
}

/**
 * How many f32 steps apart `a` and `b` are once each is stored f32: 0 for
 * the same value (+0 and -0 included), Infinity when either is NaN.
 */
export function ulpDiff(a: number, b: number): number {
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  return Math.abs(orderedF32(Math.fround(a)) - orderedF32(Math.fround(b)));
}

/** A random f32 in [-r, r] with a full 24-bit mantissa draw. */
function randomF32(rng: Pcg32, r: number): number {
  return Math.fround((rng.nextF32() * 2 - 1) * r);
}

const QUARTER = Math.SQRT1_2;
/** Quarter and half turns about each axis, as packBricks and a modeller would store them. */
const TURNS: Quat[] = [
  [QUARTER, 0, 0, QUARTER],
  [0, QUARTER, 0, QUARTER],
  [0, 0, QUARTER, QUARTER],
  [0, -QUARTER, 0, QUARTER],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
];

/**
 * A random transform. P from {0, small integers, random f32 up to 1000};
 * rot from {identity, a quarter or half turn, a random unit quaternion};
 * scale from {1, a dyadic per-axis scale, a random f32 per axis (signs
 * mixed), one zero component}. Every component is f32.
 */
export function randomTransform(rng: Pcg32): PointTransform {
  const pick = (n: number): number => Math.floor(rng.nextF32() * n);
  const pKind = pick(3);
  const P: Vec3 =
    pKind === 0
      ? [0, 0, 0]
      : pKind === 1
        ? [pick(17) - 8, pick(17) - 8, pick(17) - 8]
        : [randomF32(rng, 1000), randomF32(rng, 1000), randomF32(rng, 1000)];
  const rKind = pick(3);
  let rot: Quat;
  if (rKind === 0) rot = [0, 0, 0, 1];
  else if (rKind === 1) rot = TURNS[pick(TURNS.length)]!;
  else {
    const v: Quat = [randomF32(rng, 1), randomF32(rng, 1), randomF32(rng, 1), randomF32(rng, 1)];
    const len = Math.hypot(...v) || 1;
    rot = v.map((c) => c / len) as Quat;
  }
  const sKind = pick(4);
  const scale: Vec3 =
    sKind === 0
      ? [1, 1, 1]
      : sKind === 1
        ? [[0.5, 2, 4][pick(3)]!, [0.25, 1, 8][pick(3)]!, [-1, 0.5, 2][pick(3)]!]
        : sKind === 2
          ? [randomF32(rng, 10), randomF32(rng, 10), randomF32(rng, 10)]
          : [0, 1 + pick(3), -2];
  return storedTransform({ P, rot, scale });
}

/** A fresh seeded generator for one property trial. */
export const trialRng = (trial: number, stream = 0): Pcg32 => new Pcg32(0x10ca1b0 + trial, stream);

/**
 * Writes transform `ts[i]` (or one `ts` for every point) onto the P, rot
 * and scale columns of `geo`, in place, and returns it. The columns are
 * added when missing.
 */
export function stampTransforms(geo: Geometry, ts: PointTransform | readonly PointTransform[]): Geometry {
  const pts = geo.attrs.point;
  const P = pts.get("P") ?? pts.add("P", "f32", 3, [0, 0, 0]);
  const rot = pts.get("rot") ?? pts.add("rot", "f32", 4, [0, 0, 0, 1]);
  const scale = pts.get("scale") ?? pts.add("scale", "f32", 3, [1, 1, 1]);
  for (let i = 0; i < pts.count; i++) {
    const t = Array.isArray(ts) ? (ts as readonly PointTransform[])[i]! : (ts as PointTransform);
    P.setTuple(i, t.P);
    rot.setTuple(i, t.rot);
    scale.setTuple(i, t.scale);
  }
  return geo;
}

const TRANSFORM_COLUMNS = ["P", "rot", "scale"] as const;

function hexOf(view: ArrayBufferView): string {
  return Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString("hex");
}

function columnHex(geo: Geometry, domain: "point" | "vertex" | "primitive" | "detail", name: string): string {
  const set = geo.attrs[domain];
  const a = set.require(name);
  return hexOf(a.data.subarray(0, set.count * a.tupleSize) as unknown as ArrayBufferView);
}

/** The bytes of one stored f32 tuple, for comparing a carried transform. */
function tupleHex(values: readonly number[]): string {
  return hexOf(Float32Array.from(values));
}

/**
 * Every way `moved` (the node's output under a transform) differs from
 * `base` (its output on the same bounds at the identity), as readable
 * lines; empty when the transform is invisible to the node.
 *
 * - The same counts per domain, the same attribute names, types and tuple
 *   sizes, the same topology.
 * - Every attribute byte-identical, strings included, EXCEPT P, rot and
 *   scale on the point domain.
 * - P, rot and scale: point i of `moved` carries the transform of the cell
 *   it came from — `ts` itself, or `ts[cellOf[i]]` — bit for bit, and
 *   point i of `base` the identity.
 *
 * `cellOf` reads an i32 column (default "cell") the fixture writes on its
 * input cells and every box node carries onto its pieces.
 */
export function transformBlindDiff(
  base: Geometry,
  moved: Geometry,
  ts: PointTransform | readonly PointTransform[],
  cellAttr = "cell",
): string[] {
  const out: string[] = [];
  for (const domain of ["point", "vertex", "primitive", "detail"] as const) {
    const a = base.attrs[domain];
    const b = moved.attrs[domain];
    if (a.count !== b.count) {
      out.push(`${domain} count ${a.count} vs ${b.count}`);
      continue;
    }
    const an = a.names().slice().sort();
    const bn = b.names().slice().sort();
    if (an.join() !== bn.join()) {
      out.push(`${domain} attributes [${an.join(", ")}] vs [${bn.join(", ")}]`);
      continue;
    }
    for (const name of an) {
      const x = a.require(name);
      const y = b.require(name);
      if (x.type !== y.type || x.tupleSize !== y.tupleSize) {
        out.push(`${domain}.${name} is ${x.type}x${x.tupleSize} vs ${y.type}x${y.tupleSize}`);
        continue;
      }
      if (domain === "point" && (TRANSFORM_COLUMNS as readonly string[]).includes(name)) continue;
      if (columnHex(base, domain, name) !== columnHex(moved, domain, name)) out.push(`${domain}.${name} bytes differ`);
      if (x.type === "string") {
        for (let i = 0; i < a.count; i++) {
          for (let c = 0; c < x.tupleSize; c++) {
            if (x.getString(i, c) !== y.getString(i, c)) {
              out.push(`${domain}.${name}[${i}] "${x.getString(i, c)}" vs "${y.getString(i, c)}"`);
              break;
            }
          }
        }
      }
    }
  }
  for (const [name, arr] of [
    ["vertexToPoint", [base.vertexToPoint, moved.vertexToPoint]],
    ["primVertexStart", [base.primVertexStart, moved.primVertexStart]],
    ["primVertexCount", [base.primVertexCount, moved.primVertexCount]],
  ] as const) {
    if (Array.from(arr[0]).join() !== Array.from(arr[1]).join()) out.push(`topology ${name} differs`);
  }
  if (out.length > 0) return out;

  const pts = moved.attrs.point;
  const cell = Array.isArray(ts) ? pts.require(cellAttr) : undefined;
  for (const name of TRANSFORM_COLUMNS) {
    const tb = base.attrs.point.require(name);
    const tm = pts.require(name);
    for (let i = 0; i < pts.count; i++) {
      const t = cell === undefined ? (ts as PointTransform) : (ts as readonly PointTransform[])[cell.get(i)]!;
      const want = tupleHex(t[name]);
      const got = tupleHex(tm.getTuple(i));
      if (got !== want) {
        out.push(`point ${i} ${name} [${tm.getTuple(i).join(", ")}] is not the cell's [${t[name].join(", ")}]`);
        break;
      }
      if (tupleHex(tb.getTuple(i)) !== tupleHex(IDENTITY[name])) {
        out.push(`base point ${i} ${name} is not the identity`);
        break;
      }
    }
  }
  return out;
}
