/**
 * Snapping onto a lattice, to f32 precision: the one rule
 * `splitBox` (its interior cuts), `placeBox` and `offsetBox` (the boxes
 * they write) share, so a cut and a box on the same lattice land on the
 * same lines. Internal: not re-exported from `src/nodes/index.ts`.
 *
 * ONE VOCABULARY. `snapMode` is "round" | "floor" | "ceil" | "out" | "in"
 * wherever a BOX is snapped, decided once into a {@link BoxSnap}:
 * - "round": each face to the nearest line (a half rounds up);
 * - "floor" / "ceil": each face down / up the axis, both faces the
 *   same way, so a box a whole number of steps long keeps its size;
 * - "out": the box GROWS onto the lattice, its min face down and its max
 *   face up; "in": it SHRINKS onto it, the reverse.
 * `snapTo` is "lattice" (the faces onto the lattice anchored at 0)
 * or "size" (the box's size to a whole number of steps, its centre kept;
 * there "floor" and "in" round the size down, "ceil" and "out" up).
 * A CUT has no inside, so `splitBox` takes "round" | "floor" | "ceil" only
 * and refuses "out" and "in" by name ({@link refuseCutSnapMode}).
 *
 * THE LATTICE IS THE BOX'S. Bounds are an extent local to the point's
 * transform (world = P + rot * (scale * x)), so a lattice of step s here is
 * anchored at 0 of the box's coordinates — the cell's P — in its own units:
 * a rotated building snaps in its own frame, and the code never reads the
 * transform. Two cells agree on one lattice when they share a frame, which
 * every piece of one grammar root does, or when their P lie on it with
 * equal rot and scale. The tolerances below run at the stored (local)
 * magnitudes.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";

const AXIS_NAMES = ["x", "y", "z"] as const;

/**
 * How many f32 ulps "on a line" or "at the box's end" may be off by. Bounds
 * are stored f32, so a box edge typed as 1.2 is 1.2000000477, and on a 0.4
 * lattice that must snap to 1.2 under `ceil` rather than to 1.6. The
 * tolerance is in ULPS OF THE COORDINATE, not relative to the step count
 * or the coordinate's size: a relative one widened with the distance from
 * the origin until, past 1e6, every cut counted as on a line and floor and
 * ceil both became round, and a real 0.05-long piece at x = 1e5 was taken
 * for the box's end and swallowed.
 */
export const ULP_TOL = 2;

/** f32Ulp's scratch: one f64 and its two 32-bit words, the high one (sign, exponent) at HI on either byte order. */
const ULP_F64 = new Float64Array(1);
const ULP_U32 = new Uint32Array(ULP_F64.buffer);
const HI = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0;

/**
 * One f32 ulp at the magnitude of `x` (the smallest normal's at 0):
 * 2^(e - 23) for the binary exponent e of |x|, read from the f64's bits and
 * written as the bits of the answer. Exact where `log2` is not: a few f64
 * ulps below a power of two, Math.log2 rounds up to the power and gave
 * twice the ulp. Every f32 value is far enough from one to read the same.
 */
export function f32Ulp(x: number): number {
  const a = Math.abs(x);
  if (!(a > 1.1754943508222875e-38)) return 1.401298464324817e-45;
  if (a === Infinity) return Infinity;
  ULP_F64[0] = a;
  const e = ((ULP_U32[HI] >>> 20) & 0x7ff) - 1023;
  ULP_U32[HI] = (e - 23 + 1023) << 20;
  ULP_U32[1 - HI] = 0;
  return ULP_F64[0];
}

/**
 * How far an f32-stored SIZE may sit from the number it was written as:
 * half an f32 ulp at its magnitude. A node that SUMS sizes against a box
 * (`splitBox`'s absolute segments and repeat modules, `shellSplit`'s two
 * opposite faces) holds the sum to ULP_TOL ulps of the box's coordinates
 * PLUS this for every size in the sum, because the sum's error grows with
 * the count while the box's does not. Without it, a box written as
 * [-15.73, 12.48] cut into seven absolute 4.03s is 2.5 coordinate ulps
 * "over" in f32 (each 4.03 stores 2.1e-7 long, the box 9.2e-7 short), and
 * a repeat of module 4.03 over it counted 6, not 7. Not a fraction of the
 * span: that widens with the span, and a millionth of a 1000-long box let
 * an absolute size 8 ulps short pass as a fill and leave the gap uncovered.
 */
export function f32HalfUlp(x: number): number {
  return f32Ulp(x) / 2;
}

/**
 * The tolerance a FACE is held to on one axis of a box `[l, h]`: ULP_TOL
 * f32 ulps at the larger magnitude of its two coordinates, which is where
 * the box itself is known to. "On a line", "flush with a plane", "fills the
 * box exactly" and "the faces meet" all mean within this, on every box node
 * — `splitBox`'s fill and its far end, `shellSplit`'s opposite faces,
 * `placeBox`'s flush corners, `offsetBox`'s crossed faces, a size snap
 * here. At the box's coordinates rather than at the size of what is laid
 * against it: far from the origin a stored span is only known to a few
 * ulps of where it sits (see ULP_TOL for what a relative tolerance did).
 */
export function coordTol(l: number, h: number): number {
  return ULP_TOL * f32Ulp(Math.max(Math.abs(l), Math.abs(h)));
}

/**
 * {@link coordTol} for a SUM of two f32 sizes held against the box `[l, h]`
 * — `shellSplit`'s two opposite thicknesses, `offsetBox`'s two inward
 * moves — plus half an f32 ulp of each, since a sum errs more than one
 * coordinate ({@link f32HalfUlp}). `splitBox`, which sums any number of
 * sizes, adds the halves itself.
 */
export function sumTol(l: number, h: number, a: number, b: number): number {
  return coordTol(l, h) + f32HalfUlp(a) + f32HalfUlp(b);
}

/**
 * How far a stored SPAN `h - l` may be off the length it was meant as:
 * half an f32 ulp at each of its two corners. `splitBox`'s axis "longest"
 * reads it to tell a tie f32 cannot resolve from a real difference.
 */
export function spanErr(l: number, h: number): number {
  return f32HalfUlp(l) + f32HalfUlp(h);
}

/** Rounding codes (`repeatRound`, `snapMode`), decided once from their strings. */
export type RoundCode = 0 | 1 | 2; // floor | round | ceil

export function roundBy(code: RoundCode, x: number): number {
  return code === 0 ? Math.floor(x) : code === 1 ? Math.round(x) : Math.ceil(x);
}

/**
 * `b` moved onto a multiple of `step` (> 0) on the lattice anchored at 0.
 * A value already on a line to f32 precision — a few ulps of the
 * coordinate, never more than a quarter step — stays there whatever the
 * mode; anything else rounds by `mode`.
 */
export function snapToLattice(b: number, step: number, mode: RoundCode): number {
  const q = b / step;
  const r = Math.round(q);
  const tol = Math.min(ULP_TOL * f32Ulp(b), step / 4);
  if (Math.abs(b - r * step) <= tol) return r * step;
  return roundBy(mode, q) * step;
}

/** Every `snapMode` a box snap accepts, in the order the docs give them. */
export const BOX_SNAP_MODES = ["round", "floor", "ceil", "out", "in"] as const;
/** What a box snap rounds: its faces onto the lattice, or its size. */
export const SNAP_TO = ["lattice", "size"] as const;

/** A box snap, decided once per cook: no string reaches a per-cell loop. */
export interface BoxSnap {
  /** How the MIN face rounds onto the lattice (`snapTo` "lattice"). */
  readonly lo: RoundCode;
  /**
   * How the MAX face rounds onto the lattice (`snapTo` "lattice"), and how
   * a SIZE in steps rounds (`snapTo` "size"): the same code, since the max
   * face moving up is the box growing.
   */
  readonly hi: RoundCode;
  /** `snapTo` is "size". */
  readonly toSize: boolean;
}

/** The `snapMode` / `snapTo` params of a box node, decoded once, or a refusal naming the valid values. */
export function decodeBoxSnap(node: string, snapMode: unknown, snapTo: unknown): BoxSnap {
  const mode = canonicalOneOf(BOX_SNAP_MODES, snapMode);
  if (mode === undefined) {
    throw new Error(
      `${node}: param "snapMode" is ${JSON.stringify(snapMode)}; valid: ${BOX_SNAP_MODES.join(", ")} — "round" to the nearest line, "floor" and "ceil" down and up the axis, "out" grows the box onto the lattice, "in" shrinks it.`,
    );
  }
  const to = canonicalOneOf(SNAP_TO, snapTo);
  if (to === undefined) {
    throw new Error(`${node}: param "snapTo" is ${JSON.stringify(snapTo)}; valid: ${SNAP_TO.join(", ")}.`);
  }
  // floor 0, round 1, ceil 2
  const lo: RoundCode = mode === "round" ? 1 : mode === "floor" || mode === "out" ? 0 : 2;
  const hi: RoundCode = mode === "round" ? 1 : mode === "floor" || mode === "in" ? 0 : 2;
  return { lo, hi, toSize: to === "size" };
}

/**
 * One axis of a box `[l, h]` snapped by `rule` on a lattice of `step` (> 0),
 * written to `out[0]`, `out[1]`. Under "lattice" each face goes onto the
 * lattice ({@link snapToLattice}, its own rounding code per face).
 * Under "size" the size goes to a whole number of steps — one already
 * whole to f32 precision at the box's coordinates stays — and the centre
 * stays put; a negative size (a crossed box) is left as it is.
 */
export function snapBoxAxis(l: number, h: number, step: number, rule: BoxSnap, out: number[]): void {
  if (rule.toSize) {
    const size = h - l;
    if (size >= 0) {
      const tol = Math.min(coordTol(l, h), step / 4);
      const q = size / step;
      const r = Math.round(q);
      const steps = Math.abs(size - r * step) <= tol ? r : roundBy(rule.hi, q);
      const c = 0.5 * (l + h);
      const half = 0.5 * steps * step;
      l = c - half;
      h = c + half;
    }
    out[0] = l;
    out[1] = h;
    return;
  }
  out[0] = snapToLattice(l, step, rule.lo);
  out[1] = snapToLattice(h, step, rule.hi);
}

/**
 * The `snap` param of a box node — a lattice step per box axis, 0 for
 * none — checked once: every component a finite number >= 0, or a refusal
 * naming the component.
 */
export function requireSnapSteps(node: string, snap: readonly unknown[]): readonly number[] {
  for (let a = 0; a < 3; a++) {
    const v = snap[a];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      throw new Error(
        `${node}: param "snap" component ${a} (${AXIS_NAMES[a]}) is ${typeof v === "number" ? String(v) : JSON.stringify(v)}; a lattice step is a finite number >= 0, and 0 means no snapping on that axis.`,
      );
    }
  }
  return snap as readonly number[];
}

/**
 * `splitBox`'s refusal of a box-only `snapMode`: a cut lies between two
 * pieces, so growing or shrinking "the box" onto the lattice has no side
 * to grow. `undefined` for any other value (the caller's own check runs).
 */
export function refuseCutSnapMode(node: string, param: string, value: unknown): string | undefined {
  if (value !== "out" && value !== "in") return undefined;
  return `${node}: param "${param}" is ${JSON.stringify(value)}, which snaps a BOX — it grows ("out") or shrinks ("in") a box onto the lattice, and placeBox and offsetBox take it — but a cut lies between two pieces and has no inside to grow or shrink. Valid here: floor, round, ceil ("floor" and "ceil" are down and up the axis).`;
}
