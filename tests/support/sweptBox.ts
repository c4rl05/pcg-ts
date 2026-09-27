/**
 * The point layout of a capped `sweepProfile` skin of ONE two-point path
 * with a four-cornered closed profile ('rect' or 'square') — the box every
 * Eiffel member skin, flat bar and packing block is — stated once, so the
 * tests that read such a box back from a cooked mesh do not each restate it.
 *
 * Read off a cook of the library (a 2-point path swept 'rect' and
 * 'square', caps on), 24 points and 12 triangles a box:
 *
 *   0..7    ring 0, at the path's first point: two points a corner (the
 *           corners are split so each face shades flat), corner f at ring
 *           points 2f - 1 and 2f (mod 8) — so points 7 and 0 are corner 0
 *   8..15   ring 1, at the path's second point, laid out the same
 *   16..19  the start cap: ring 0's four corners, once each, in order
 *   20..23  the end cap: ring 1's four corners, the same
 *
 * The caps are corner fans of n - 2 triangles with NO centre point. Until
 * 2026-09-27 each cap was a fan from a fifth point at the section's centre
 * (26 points a box, the centres at 20 and 25); a reader that still looks
 * for a hub is reading that layout.
 *
 * So the 8 distinct corners of a box are exactly its points 16..23, and
 * what tells a swept box from a copied `meshPrimitive` box of the same 24
 * points is the ring's doubling: a swept box's points 7 and 0 coincide,
 * where a primitive box's first 8 points are its 8 distinct corners.
 */
export type SweptVec3 = [number, number, number];

/** Corners of the swept section. */
export const SWEPT_BOX_CORNERS = 4;
/** Points a ring has: two a corner. */
export const SWEPT_BOX_RING = 2 * SWEPT_BOX_CORNERS;
/** First point of the start cap (ring 0's corners), after the two rings. */
export const SWEPT_BOX_CAP_START = 2 * SWEPT_BOX_RING;
/** First point of the end cap (ring 1's corners). */
export const SWEPT_BOX_CAP_END = SWEPT_BOX_CAP_START + SWEPT_BOX_CORNERS;
/** Points a box has: two rings and two caps of corners, no cap centre. */
export const SWEPT_BOX_POINTS = SWEPT_BOX_CAP_END + SWEPT_BOX_CORNERS;

/** Two points this close are the same corner written twice (f32 at tower scale). */
const SAME = 1e-5;

const at = (P: ArrayLike<number>, k: number): SweptVec3 => [P[3 * k]!, P[3 * k + 1]!, P[3 * k + 2]!];
const same = (P: ArrayLike<number>, i: number, j: number): boolean =>
  Math.hypot(P[3 * i]! - P[3 * j]!, P[3 * i + 1]! - P[3 * j + 1]!, P[3 * i + 2]! - P[3 * j + 2]!) < SAME;

/**
 * Whether the `SWEPT_BOX_POINTS` points from `base` have the swept-box
 * layout above: each ring's corners doubled as stated, and each cap
 * repeating its ring's corners in order.
 */
export function isSweptBox(P: ArrayLike<number>, base: number, count: number): boolean {
  if (base + SWEPT_BOX_POINTS > count) return false;
  for (let f = 0; f < SWEPT_BOX_CORNERS; f++) {
    for (const [ring, cap] of [
      [0, SWEPT_BOX_CAP_START],
      [SWEPT_BOX_RING, SWEPT_BOX_CAP_END],
    ] as const) {
      const a = base + ring + ((2 * f + SWEPT_BOX_RING - 1) % SWEPT_BOX_RING);
      const b = base + ring + 2 * f;
      if (!same(P, a, b) || !same(P, b, base + cap + f)) return false;
    }
  }
  return true;
}

/** A swept box's eight corners from `base`: the start cap's four, then the end cap's. */
export function sweptBoxCorners(P: ArrayLike<number>, base: number): SweptVec3[] {
  const out: SweptVec3[] = [];
  for (let k = SWEPT_BOX_CAP_START; k < SWEPT_BOX_POINTS; k++) out.push(at(P, base + k));
  return out;
}
