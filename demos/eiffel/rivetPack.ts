/**
 * The rivets, packed for the GPU device: 24 bytes a head instead of a
 * 64-byte matrix, expanded in the vertex shader.
 *
 * WHY. `?rivets` draws about 1.2 M heads (1.33 M at `?rivets=full`). As
 * instanced meshes each head is a 4x4 f32 matrix: 74 MB (81 MB) that the
 * page allocates, fills, multiplies by the head's drive (heads.ts), uploads
 * and then keeps, because three holds an attribute's array for the life of
 * the mesh. The graph's own copy (the batches' `transforms`) is another
 * 74 MB in its cook cache, which the page does not own.
 *
 * WHAT A HEAD IS. Every rivet the graph puts out is a rotation, one uniform
 * scale (the 19 mm head) and a seat — no shear, no mirror [measured over
 * every head at both depths] — and the hand that closed it (heads.ts) adds
 * a lean and a turn, a width and a rise, and a move in its plate. So a
 * driven head is exactly
 *
 *     seat (3 × f32, 12 B)      where its base sits, the move included
 *     turn (4 × snorm16, 8 B)   its rotation, the rule's and the hand's
 *     size (2 × unorm16, 4 B)   its width and its rise, in metres
 *
 * and the vertex shader rebuilds the head from them: the unit head scaled
 * by (width, rise, width), rotated, set on its seat. The normal takes the
 * inverse scale before the same rotation, which is what three's instanced
 * path does with a matrix's columns.
 *
 * WHAT IT COSTS IN THE LOOK. Nothing a viewer can see: against the CPU
 * path's matrix (rule × drive), every point of every head lands within
 * about a micrometre plus the f32 rounding of its seat, and its axis
 * within a few thousandths of a degree (tests/eiffelRivetPack.test.ts
 * holds it to 0.1 mm and 0.01° on every head). The draw per head is the
 * one heads.ts turns into the matrix, so every head keeps its own width,
 * rise, lean, turn and move.
 *
 * WHAT IS KEPT. Nothing, once the first frame has drawn it: the packed
 * arrays are dropped as they upload (`onUpload`), the batch sphere is
 * computed before, and nothing on the page reads a rivet's transform
 * afterwards except the erection's staging (which `?build` sends down the
 * matrix path). The one cost: a WebGL context lost and restored cannot
 * re-upload them, as with three's own `disposeArray`; the page reloads.
 *
 * WHEN IT CANNOT. A batch whose transforms are not a rotation and one
 * scale, whose heads are larger than the packed range, or whose asset is
 * not the rivet head, is drawn the old way (`toInstancedMeshes`, then
 * `driveHeads`), and the page says which and why ({@link RivetFallback};
 * `?cpuRivets` asks for the old way everywhere, for comparison, and
 * `?build`, whose staging permutes instance matrices, takes it too).
 *
 * (What this is not: the transforms kept resident in a GPU buffer the
 * cook wrote. pcg-ts/gpu can do that for a spawner whose points it can
 * compute, drawn with the WebGPU renderer; this page places its rivets
 * on the CPU and draws with WebGL. See the follow-up in the queue's notes.)
 */
import {
  type BufferGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type Material,
  Mesh,
  type MeshBasicMaterial,
  MeshNormalMaterial,
  type MeshStandardMaterial,
  NoBlending,
  ShaderLib,
  Sphere,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { HEAD_DRIVE_ATTR, driveHead, driveRotation } from "./heads.js";

/** The asset id the graph names its rivet heads by (parts.ts). */
export const RIVET_ASSET = "rivet";

/**
 * The packed range of a head's width and rise, in metres: a head up to
 * 100 mm across, in steps of 0.8 µm. The tower's are 38 mm, driven.
 */
export const RIVET_SIZE_MAX = 0.05;

/** How far a rule's transform may be from a rotation and one scale and still pack (relative). */
const RIGID = 1e-4;

/** One rivet batch, as the cook puts it out. */
export interface RivetBatch {
  readonly assetId: string;
  readonly count: number;
  readonly transforms: Float32Array;
  readonly attributes?: Readonly<Record<string, ArrayLike<number>>>;
}

/** A batch packed: per head, its seat, its turn and its size. */
export interface PackedRivets {
  readonly count: number;
  /** The base's centre, world metres, 3 per head. */
  readonly at: Float32Array;
  /** The rotation, a unit quaternion xyzw as snorm16 (w ≥ 0), 4 per head. */
  readonly turn: Int16Array;
  /** Width and rise (the unit head's x/z and y scales) as unorm16 of {@link RIVET_SIZE_MAX}, 2 per head. */
  readonly size: Uint16Array;
  /** Everything the batch draws. */
  readonly bounds: Sphere;
}

/** Why a batch is drawn the old way. Machine-readable; `detail` names the head. */
export type RivetFallbackReason =
  | "cpu-requested"
  | "staged-by-date"
  | "shader-anchor-missing"
  | "not-the-rivet-asset"
  | "not-a-rotation-and-scale"
  | "size-out-of-range";

export interface RivetFallback {
  readonly reason: RivetFallbackReason;
  readonly detail: string;
}

/** Pack one batch, or say why it cannot be. */
export function packRivets(batch: RivetBatch): PackedRivets | RivetFallback {
  if (batch.assetId !== RIVET_ASSET) {
    return {
      reason: "not-the-rivet-asset",
      detail: `asset "${batch.assetId}": the packed shader draws the rivet head only`,
    };
  }
  const n = batch.count;
  const t = batch.transforms;
  const draws = batch.attributes?.[HEAD_DRIVE_ATTR];
  const at = new Float32Array(3 * n);
  const turn = new Int16Array(4 * n);
  const size = new Uint16Array(2 * n);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let reach = 0;
  const q = new Float64Array(5);
  for (let i = 0; i < n; i++) {
    const o = 16 * i;
    const refused = rotationOf(t, o, q);
    if (refused !== undefined) return { reason: "not-a-rotation-and-scale", detail: `head ${i}: ${refused}` };
    const s = q[4]!;
    // The hand's drive, or none.
    let w = 1;
    let r = 1;
    let off0 = 0;
    let off1 = 0;
    let sink = 0;
    let d: [number, number, number, number] = [0, 0, 0, 1];
    if (draws !== undefined) {
      const h = driveHead(draws[i]!);
      w = h.width;
      r = h.rise;
      [off0, off1] = h.off;
      sink = h.sink;
      d = driveRotation(h);
    }
    const sx = s * w;
    const sy = s * r;
    if (!(sx > 0 && sy > 0 && sx <= RIVET_SIZE_MAX && sy <= RIVET_SIZE_MAX)) {
      return {
        reason: "size-out-of-range",
        detail: `head ${i}: width ${sx.toFixed(4)} m, rise ${sy.toFixed(4)} m; the packed range is (0, ${RIVET_SIZE_MAX}]`,
      };
    }
    // The seat: the rule's, plus its move in the plate and its sink,
    // carried by the rule's rotation and scale (A · shift).
    for (let k = 0; k < 3; k++) {
      at[3 * i + k] = t[o + 12 + k]! + t[o + k]! * off0 - t[o + 4 + k]! * sink + t[o + 8 + k]! * off1;
      const f = at[3 * i + k]!;
      if (f < lo[k]!) lo[k] = f;
      if (f > hi[k]!) hi[k] = f;
    }
    // The turn: the rule's rotation, then the hand's (q ⊗ d).
    let x = q[3]! * d[0] + q[0]! * d[3] + q[1]! * d[2] - q[2]! * d[1];
    let y = q[3]! * d[1] - q[0]! * d[2] + q[1]! * d[3] + q[2]! * d[0];
    let z = q[3]! * d[2] + q[0]! * d[1] - q[1]! * d[0] + q[2]! * d[3];
    let ww = q[3]! * d[3] - q[0]! * d[0] - q[1]! * d[1] - q[2]! * d[2];
    const len = Math.sqrt(x * x + y * y + z * z + ww * ww) * (ww < 0 ? -1 : 1);
    x /= len;
    y /= len;
    z /= len;
    ww /= len;
    turn[4 * i] = Math.round(x * 32767);
    turn[4 * i + 1] = Math.round(y * 32767);
    turn[4 * i + 2] = Math.round(z * 32767);
    turn[4 * i + 3] = Math.round(ww * 32767);
    size[2 * i] = Math.round((sx / RIVET_SIZE_MAX) * 65535);
    size[2 * i + 1] = Math.round((sy / RIVET_SIZE_MAX) * 65535);
    // The unit head lies within 1 of its seat, so a head within its larger scale.
    reach = Math.max(reach, sx, sy);
  }
  const bounds = new Sphere();
  if (n > 0) {
    const c = new Vector3((lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2);
    bounds.set(c, c.distanceTo(new Vector3(hi[0], hi[1], hi[2])) + reach);
  }
  return { count: n, at, turn, size, bounds };
}

/** Is it a fallback rather than a packed batch? */
export function isFallback(p: PackedRivets | RivetFallback): p is RivetFallback {
  return (p as RivetFallback).reason !== undefined;
}

/**
 * Transform `o`'s rotation, as a unit quaternion xyzw into `q[0..3]` and
 * its one scale (the mean column length) into `q[4]`, or why it is not a
 * rotation times one scale.
 */
function rotationOf(t: Float32Array, o: number, q: Float64Array): string | undefined {
  if (t[o + 3] !== 0 || t[o + 7] !== 0 || t[o + 11] !== 0 || t[o + 15] !== 1) return "not affine";
  const a00 = t[o]!, a10 = t[o + 1]!, a20 = t[o + 2]!;
  const a01 = t[o + 4]!, a11 = t[o + 5]!, a21 = t[o + 6]!;
  const a02 = t[o + 8]!, a12 = t[o + 9]!, a22 = t[o + 10]!;
  const l0 = Math.sqrt(a00 * a00 + a10 * a10 + a20 * a20);
  const l1 = Math.sqrt(a01 * a01 + a11 * a11 + a21 * a21);
  const l2 = Math.sqrt(a02 * a02 + a12 * a12 + a22 * a22);
  const s = (l0 + l1 + l2) / 3;
  if (!(s > 0)) return "zero scale";
  if (Math.abs(l0 / s - 1) > RIGID || Math.abs(l1 / s - 1) > RIGID || Math.abs(l2 / s - 1) > RIGID) {
    return `its columns are ${[l0, l1, l2].map((l) => (l / s).toFixed(6)).join(", ")} of the mean scale`;
  }
  // The rotation, m<row><column>.
  const m00 = a00 / s, m10 = a10 / s, m20 = a20 / s;
  const m01 = a01 / s, m11 = a11 / s, m21 = a21 / s;
  const m02 = a02 / s, m12 = a12 / s, m22 = a22 / s;
  const d01 = m00 * m01 + m10 * m11 + m20 * m21;
  const d12 = m01 * m02 + m11 * m12 + m21 * m22;
  const d02 = m00 * m02 + m10 * m12 + m20 * m22;
  if (Math.abs(d01) > RIGID || Math.abs(d12) > RIGID || Math.abs(d02) > RIGID) {
    return `its columns are not square (${[d01, d12, d02].map((d) => d.toExponential(2)).join(", ")})`;
  }
  const det = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
  if (det < 0) return "a mirror";
  // Shepperd: from the largest of the four squared components.
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const k = 0.5 / Math.sqrt(tr + 1);
    q[3] = 0.25 / k;
    q[0] = (m21 - m12) * k;
    q[1] = (m02 - m20) * k;
    q[2] = (m10 - m01) * k;
  } else if (m00 > m11 && m00 > m22) {
    const k = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q[3] = (m21 - m12) / k;
    q[0] = 0.25 * k;
    q[1] = (m01 + m10) / k;
    q[2] = (m02 + m20) / k;
  } else if (m11 > m22) {
    const k = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q[3] = (m02 - m20) / k;
    q[0] = (m01 + m10) / k;
    q[1] = 0.25 * k;
    q[2] = (m12 + m21) / k;
  } else {
    const k = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q[3] = (m10 - m01) / k;
    q[0] = (m02 + m20) / k;
    q[1] = (m12 + m21) / k;
    q[2] = 0.25 * k;
  }
  q[4] = s;
  return undefined;
}

/**
 * Head `i` of a packed batch as the vertex shader rebuilds it, as a
 * column-major 4x4 (a `Matrix4.elements`), in the shader's f32: the GPU's
 * snorm/unorm decode, the quaternion normalised, the scales applied first.
 * The tests hold this against the CPU path's matrix.
 */
export function unpackMatrix(p: PackedRivets, i: number): number[] {
  const f = Math.fround;
  const sn = (v: number): number => f(Math.max(v / 32767, -1));
  let [x, y, z, w] = [sn(p.turn[4 * i]!), sn(p.turn[4 * i + 1]!), sn(p.turn[4 * i + 2]!), sn(p.turn[4 * i + 3]!)];
  const l = f(Math.sqrt(f(f(f(x * x) + f(y * y)) + f(f(z * z) + f(w * w)))));
  [x, y, z, w] = [f(x / l), f(y / l), f(z / l), f(w / l)];
  const sx = f(f(p.size[2 * i]! / 65535) * RIVET_SIZE_MAX);
  const sy = f(f(p.size[2 * i + 1]! / 65535) * RIVET_SIZE_MAX);
  // The rotation's columns, times the scales (x and z by width, y by rise).
  const cols = [
    [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)],
    [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)],
    [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)],
  ];
  const s = [sx, sy, sx];
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) out[4 * c + r] = f(cols[c]![r]! * s[c]!);
  out[12] = p.at[3 * i]!;
  out[13] = p.at[3 * i + 1]!;
  out[14] = p.at[3 * i + 2]!;
  out[15] = 1;
  return out;
}

// ------------------------------------------------------------------ //
// Drawing.
// ------------------------------------------------------------------ //

/** Marks a packed rivet mesh, and its prepass stand-in (see gtao.ts). */
export const PACKED_RIVETS = "packedRivets";

/**
 * The shader's three edits; each anchor must be found exactly once. The
 * head's turn and size are functions of its attributes rather than locals
 * set beside the normal, because an unlit shader computes no normal: the
 * basic material's `beginnormal_vertex` sits under an `#if` that is off,
 * and a local declared there would not reach `begin_vertex`.
 */
const INJECT: ReadonlyArray<readonly [string, string]> = [
  [
    "#include <common>",
    `#include <common>
attribute vec3 rivetAt;
attribute vec4 rivetTurn;
attribute vec2 rivetSize;
vec3 rivetRotate( const in vec4 q, const in vec3 v ) {
	return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}
vec4 rivetQ() {
	return normalize( rivetTurn );
}
vec3 rivetS() {
	return vec3( rivetSize.x, rivetSize.y, rivetSize.x ) * ${RIVET_SIZE_MAX.toFixed(6)};
}`,
  ],
  [
    "#include <beginnormal_vertex>",
    `#include <beginnormal_vertex>
	objectNormal = rivetRotate( rivetQ(), objectNormal / rivetS() );`,
  ],
  ["#include <begin_vertex>", `#include <begin_vertex>\n\ttransformed = rivetRotate( rivetQ(), transformed * rivetS() ) + rivetAt;`],
];

/**
 * A three vertex shader taught to draw packed rivets. Throws if three's
 * shader no longer has an anchor this edits, rather than drawing every
 * head at the origin.
 */
export function packedVertexShader(src: string): string {
  let out = src;
  for (const [anchor, to] of INJECT) {
    const at = out.indexOf(anchor);
    if (at < 0 || out.indexOf(anchor, at + anchor.length) >= 0) {
      throw new Error(
        `packed rivets: three's vertex shader has ${at < 0 ? "no" : "more than one"} "${anchor}"; ` +
          `re-read its ShaderLib and update rivetPack.ts, or draw the rivets with ?cpuRivets.`,
      );
    }
    out = out.slice(0, at) + to + out.slice(at + anchor.length);
  }
  return out;
}

/**
 * Whether this three's shaders take the edit, asked once at load, before
 * anything is drawn: an anchor gone would otherwise throw inside the
 * first render, frame after frame. `undefined` when they do; else why not,
 * and the page draws every batch as matrices.
 */
export function packedShaderProblem(): string | undefined {
  try {
    packedVertexShader(ShaderLib.physical.vertexShader);
    packedVertexShader(ShaderLib.normal.vertexShader);
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * The same question of the unlit shader, for packed heads in flat paint
 * (flat.ts). Asked apart, so an anchor gone from it costs only them and
 * not the default look's packed rivets.
 */
export function packedUnlitProblem(): string | undefined {
  try {
    packedVertexShader(ShaderLib.basic.vertexShader);
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function teach<M extends MeshStandardMaterial | MeshNormalMaterial | MeshBasicMaterial>(m: M): M {
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = packedVertexShader(shader.vertexShader);
  };
  m.customProgramCacheKey = () => PACKED_RIVETS;
  // The occlusion pass's override material cannot draw a packed head, so
  // the head keeps its own, and the pass is handed its stand-in (gtao.ts).
  m.allowOverride = false;
  m.userData[PACKED_RIVETS] = true;
  return m;
}

/**
 * `base` (a rivet material, or flat paint) for packed heads: its colour
 * and finish, the packed vertex shader.
 */
export function packedRivetMaterial<M extends MeshStandardMaterial | MeshBasicMaterial>(base: M): M {
  return teach(base.clone() as M);
}

/**
 * The occlusion pass's normal-and-depth prepass material for packed heads:
 * what `GTAOPass` draws everything else with, taught the packed shader.
 */
export const PACKED_PREPASS = (() => {
  const m = teach(new MeshNormalMaterial());
  m.blending = NoBlending;
  return m;
})();

/**
 * A packed batch as one mesh: the unit head's own attributes, shared, and
 * the three per-head ones, each dropped from the CPU once uploaded.
 */
export function packedRivetMesh(p: PackedRivets, head: BufferGeometry, material: Material): Mesh {
  const g = new InstancedBufferGeometry();
  g.setIndex(head.index);
  for (const [name, attr] of Object.entries(head.attributes)) g.setAttribute(name, attr);
  const per = (array: Float32Array | Int16Array | Uint16Array, item: number, normalized: boolean) => {
    const a = new InstancedBufferAttribute(array, item, normalized);
    a.onUpload(release);
    return a;
  };
  g.setAttribute("rivetAt", per(p.at, 3, false));
  g.setAttribute("rivetTurn", per(p.turn, 4, true));
  g.setAttribute("rivetSize", per(p.size, 2, true));
  g.instanceCount = p.count;
  // Frustum culling reads the geometry's sphere, which would otherwise be
  // the unit head's at the origin.
  g.boundingSphere = p.bounds.clone();
  const mesh = new Mesh(g, material);
  mesh.userData[PACKED_RIVETS] = true;
  mesh.userData.prepassMaterial = PACKED_PREPASS;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

/** Drop an attribute's array once it is on the GPU device (three's own `disposeArray` idiom). */
function release(this: { array: unknown }): void {
  this.array = null;
}

/** Is it a packed rivet mesh? */
export function isPackedRivets(mesh: Mesh): boolean {
  return mesh.userData[PACKED_RIVETS] === true;
}

/** Bytes a packed head takes on the GPU device, against a matrix's 64. */
export const PACKED_BYTES = 3 * 4 + 4 * 2 + 2 * 2;
