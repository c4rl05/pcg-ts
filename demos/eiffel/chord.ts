/**
 * How finely a round part is cut, and how it shades.
 *
 * SEGMENTS FROM A TOLERANCE, NOT A COUNT. A fixed count is wrong at every
 * size but one: 16 sides is invisible on a 50 mm cabochon and a barrel of
 * planks on a 3 m reservoir. What the eye reads is how far a straight
 * chord stands off the true curve — its sagitta, r (1 − cos(θ/2)) for a
 * chord of angle θ on radius r — so every round part here asks for the
 * fewest segments that keep that under a tolerance chosen by where the part
 * is seen from ({@link SAG}), within a floor and a cap of its own. A large
 * part gets many more segments than a small one, which is the point.
 *
 * SMOOTH SHADING WHERE THE SURFACE IS ROUND. The extrusion every prism goes
 * through gives each wall its own points and a flat normal, so even a fine
 * polygon shades as facets. {@link smoothed} runs the library's
 * `smoothNormals` over a mesh: faces meeting at less than {@link CREASE}
 * degrees shade as one surface (a cylinder of 12 or more sides, a vault's
 * arc, a tent's cone), faces meeting at more keep their edge (a box's 90, an
 * octagon's 45). Only the `normal` changes — no point is merged, moved or
 * split — so a piece is still a connected component of the index buffer
 * exactly as before (`chronology.ts`), and nothing keyed by point index
 * moves.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { smoothNormals } from "pcg-ts";

/**
 * The most a chord may stand off its curve, in metres, by where the part
 * is seen from:
 * - `eye`: anything a visitor walks up to — the platforms, the plinths,
 *   the ground round the legs — and small parts read at arm's length;
 * - `near`: parts at eye level but overhead or a few metres off (the
 *   gallery's crescents, the clock, the lamps);
 * - `far`: large parts only ever seen from well away (the summit's dome,
 *   the caissons' plan below the ground).
 */
export const SAG = { eye: 0.003, near: 0.005, far: 0.015 } as const;

/**
 * The crease angle, in degrees, for {@link smoothed}: under it faces shade
 * as one surface. 35 smooths any circle of 11 or more segments and keeps
 * an octagon's 45-degree edges and every right angle.
 */
export const CREASE = 35;

/** Limits on a segment count: a floor, a cap, and a multiple it rounds up to. */
export type SegmentLimits = { readonly min?: number; readonly max?: number; readonly multiple?: number };

/** The angle one chord may span on radius `r` so it stands at most `sag` off the arc. */
function stepFor(r: number, sag: number): number {
  if (!(r > 0) || !(sag > 0)) throw new Error(`chord.ts: radius ${r} and sagitta ${sag} must both be positive`);
  // r (1 − cos(θ/2)) ≤ sag  ⇔  θ ≤ 2 acos(1 − sag / r); a sagitta past the
  // radius allows any angle.
  return sag >= r ? Math.PI : 2 * Math.acos(1 - sag / r);
}

function limit(n: number, { min = 3, max = 256, multiple = 1 }: SegmentLimits): number {
  const m = Math.ceil(n / multiple) * multiple;
  return Math.min(max, Math.max(min, m));
}

/**
 * Segments for a whole circle of radius `r` whose chords stand at most
 * `sag` off it. Rounded up to a multiple of 4 by default, so a circle keeps
 * its quarter points (an axis, a face) on a vertex.
 */
export function circleSegments(r: number, sag: number, limits: SegmentLimits = {}): number {
  return limit((2 * Math.PI) / stepFor(r, sag), { min: 12, max: 128, multiple: 4, ...limits });
}

/** Segments for an arc of `sweep` radians on radius `r`, chords at most `sag` off it. */
export function arcSegments(r: number, sweep: number, sag: number, limits: SegmentLimits = {}): number {
  return limit(Math.abs(sweep) / stepFor(r, sag), { min: 2, max: 128, ...limits });
}

/**
 * Segments for a half-ellipse of semi-axes `a` (across the springing) and
 * `b` (the rise), cut at EQUAL steps of its parametric angle — the way
 * every arch here walks one — whose chords stand at most `sag` off it.
 * A chord of parameter step dt has sagitta ≈ (v dt)² κ / 8, v the speed
 * and κ the curvature; on an ellipse v² κ = ab / √(a² sin² t + b² cos² t),
 * at most max(a, b), so dt = √(8 sag / max(a, b)) holds everywhere (and
 * is the circle's own step when a = b).
 */
export function halfEllipseSegments(a: number, b: number, sag: number, limits: SegmentLimits = {}): number {
  if (!(a > 0) || !(b > 0) || !(sag > 0)) {
    throw new Error(`chord.ts: semi-axes ${a}, ${b} and sagitta ${sag} must all be positive`);
  }
  const dt = Math.sqrt((8 * sag) / Math.max(a, b));
  return limit(Math.PI / dt, { min: 4, max: 96, multiple: 2, ...limits });
}

/**
 * `mesh` with its normals rewritten by the crease angle (see the file
 * comment). Topology, positions and every other attribute pass through.
 */
export function smoothed(g: Graph, id: string, mesh: NodeHandle, angle = CREASE): NodeHandle {
  const out = g.add(smoothNormals, { angle, weldDistance: 1e-4 }, id);
  g.connect(mesh, "out", out, "in");
  return out;
}
