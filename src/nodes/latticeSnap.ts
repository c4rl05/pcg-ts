/**
 * Snapping onto an absolute lattice, to f32 precision: the one rule
 * `splitBox` (its interior cuts), `placeBox` and `offsetBox` (the boxes
 * they write) share, so a cut and a box on the same lattice land on the
 * same lines. Internal: not re-exported from `src/nodes/index.ts`.
 *
 * ONE VOCABULARY. `snapMode` is "round" | "floor" | "ceil" | "out" | "in"
 * wherever a BOX is snapped, decided once into a {@link BoxSnap}:
 * - "round": each face to the nearest line (a half rounds up);
 * - "floor" / "ceil": each face down / up the WORLD axis, both faces the
 *   same way, so a box a whole number of steps long keeps its size;
 * - "out": the box GROWS onto the lattice, its min face down and its max
 *   face up; "in": it SHRINKS onto it, the reverse.
 * `snapTo` is "lattice" (the faces onto the absolute lattice anchored at 0)
 * or "size" (the box's size to a whole number of steps, its centre kept;
 * there "floor" and "in" round the size down, "ceil" and "out" up).
 * A CUT has no inside, so `splitBox` takes "round" | "floor" | "ceil" only
 * and refuses "out" and "in" by name ({@link refuseCutSnapMode}).
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";

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

/** One f32 ulp at the magnitude of `x` (the smallest normal's at 0). */
export function f32Ulp(x: number): number {
  const a = Math.abs(x);
  if (!(a > 1.1754943508222875e-38)) return 1.401298464324817e-45;
  return Math.pow(2, Math.floor(Math.log2(a)) - 23);
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
  /** How the MAX face rounds onto the lattice (`snapTo` "lattice"). */
  readonly hi: RoundCode;
  /** How a SIZE in steps rounds (`snapTo` "size"). */
  readonly size: RoundCode;
  /** `snapTo` is "size". */
  readonly toSize: boolean;
}

/** The `snapMode` / `snapTo` params of a box node, decoded once, or a refusal naming the valid values. */
export function decodeBoxSnap(node: string, snapMode: unknown, snapTo: unknown): BoxSnap {
  const mode = canonicalOneOf(BOX_SNAP_MODES, snapMode);
  if (mode === undefined) {
    throw new Error(
      `${node}: param "snapMode" is ${JSON.stringify(snapMode)}; valid: ${BOX_SNAP_MODES.join(", ")} — "round" to the nearest line, "floor" and "ceil" down and up the world axis, "out" grows the box onto the lattice, "in" shrinks it.`,
    );
  }
  const to = canonicalOneOf(SNAP_TO, snapTo);
  if (to === undefined) {
    throw new Error(`${node}: param "snapTo" is ${JSON.stringify(snapTo)}; valid: ${SNAP_TO.join(", ")}.`);
  }
  // floor 0, round 1, ceil 2
  const lo: RoundCode = mode === "round" ? 1 : mode === "floor" || mode === "out" ? 0 : 2;
  const hi: RoundCode = mode === "round" ? 1 : mode === "floor" || mode === "in" ? 0 : 2;
  const size: RoundCode = mode === "round" ? 1 : mode === "floor" || mode === "in" ? 0 : 2;
  return { lo, hi, size, toSize: to === "size" };
}

/**
 * One axis of a box `[l, h]` snapped by `rule` on a lattice of `step` (> 0),
 * written to `out[0]`, `out[1]`. Under "lattice" each face goes onto the
 * absolute lattice ({@link snapToLattice}, its own rounding code per face).
 * Under "size" the size goes to a whole number of steps — one already
 * whole to f32 precision at the box's coordinates stays — and the centre
 * stays put; a negative size (a crossed box) is left as it is.
 */
export function snapBoxAxis(l: number, h: number, step: number, rule: BoxSnap, out: number[]): void {
  if (rule.toSize) {
    const size = h - l;
    if (size >= 0) {
      const tol = Math.min(ULP_TOL * f32Ulp(Math.max(Math.abs(l), Math.abs(h))), step / 4);
      const q = size / step;
      const r = Math.round(q);
      const steps = Math.abs(size - r * step) <= tol ? r : roundBy(rule.size, q);
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
 * `splitBox`'s refusal of a box-only `snapMode`: a cut lies between two
 * pieces, so growing or shrinking "the box" onto the lattice has no side
 * to grow. `undefined` for any other value (the caller's own check runs).
 */
export function refuseCutSnapMode(node: string, param: string, value: unknown): string | undefined {
  if (value !== "out" && value !== "in") return undefined;
  return `${node}: param "${param}" is ${JSON.stringify(value)}, which snaps a BOX — it grows ("out") or shrinks ("in") a box onto the lattice, and placeBox and offsetBox take it — but a cut lies between two pieces and has no inside to grow or shrink. Valid here: floor, round, ceil ("floor" and "ceil" are down and up the world axis).`;
}
