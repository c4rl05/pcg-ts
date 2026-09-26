/**
 * Hand-driven rivet heads: how each head departs from the die's dome.
 *
 * A hand-closed head is never the snap's exact dome square on its hole
 * (the site's were driven hot by a gang of four, SOURCES.md §27.6), so
 * every head takes its own width, rise, lean, turn about its axis and
 * off-centre in its plate.
 *
 * THE GRAPH SETTLES WHICH. Every rivet carries one draw, `headDrive` in
 * [0, 1), from its own identity (`randomField`: its position with its
 * seed; strut.ts `rivetSpawn`), as a per-instance channel. It is the same
 * for a head in every cook and in any cook order.
 *
 * THE PAGE SETTLES HOW, ONCE, AT LOAD: it composes each instance's matrix
 * with {@link driveMatrix}, a transform in the unit head's own frame. So
 * the graph's instance transforms stay the rule's, and every seat, axis
 * and clearance the tests hold is unchanged. The variance costs the cook
 * one draw a head. Computing it all in the graph instead (per-head frame
 * arithmetic over 1.2 M heads, a node's copy each step) added about 4 s
 * to the riveted cook [measured]. The page's pass is a loop over the
 * matrices, and nothing per frame.
 */

/** The per-instance channel every rivet batch carries: one uniform draw in [0, 1). */
export const HEAD_DRIVE_ATTR = "headDrive";

/**
 * How far a head departs, in the unit head's own measure (base radius 1,
 * rise 0.7; the instance scales it to the 19 mm head) [estimated: no
 * source measures it; one original head is 42 mm across (SOURCES.md §7)
 * against the model's 38].
 */
export const HEAD_DRIVE = {
  /** Width, a fraction either way. */
  width: 0.04,
  /** Rise, a fraction either way. */
  rise: 0.12,
  /** The most the head's axis leans off its hole's, in radians (3°). */
  lean: (3 * Math.PI) / 180,
  /** The most its centre moves in its plate, in unit radii (1.2 mm on a 19 mm head). */
  off: 0.0012 / 0.019,
  /**
   * Odd multipliers: value k is fract(draw × spread[k]), each uniform in
   * [0, 1) to about 12 bits, which a head's variance cannot show.
   */
  spread: [1021, 1297, 1531, 1753, 2003, 2239, 2477],
} as const;

const f = Math.fround;
const fract = (x: number): number => x - Math.floor(x);

/** One head's departure from its draw. */
export interface DrivenHead {
  readonly width: number;
  readonly rise: number;
  /** Lean, radians, and the direction in the plate it leans toward (radians about the axis, from +x toward +z). */
  readonly lean: number;
  readonly leanToward: number;
  /** Turn about its own axis, radians. */
  readonly turn: number;
  /** Off-centre in its plate, unit radii: along the unit head's x and z. */
  readonly off: readonly [number, number];
  /** How far it is sunk along its axis, unit radii: exactly what its lean lifts its rim. */
  readonly sink: number;
}

/** A head's departure, from its `headDrive` draw (an f32). */
export function driveHead(draw: number): DrivenHead {
  const u = (k: number): number => fract(f(draw) * HEAD_DRIVE.spread[k]!);
  const T = 2 * Math.PI;
  const width = 1 + HEAD_DRIVE.width * (2 * u(0) - 1);
  const lean = HEAD_DRIVE.lean * u(2);
  const r = HEAD_DRIVE.off * Math.sqrt(u(5));
  const a = T * u(6);
  return {
    width,
    rise: 1 + HEAD_DRIVE.rise * (2 * u(1) - 1),
    lean,
    leanToward: T * u(3),
    turn: T * u(4),
    off: [r * Math.cos(a), r * Math.sin(a)],
    sink: width * Math.sin(lean),
  };
}

/**
 * The head's transform in the unit head's own frame, column-major 4x4 (a
 * three.js `Matrix4.elements`): scale by width and rise, turn about y,
 * lean the axis toward `leanToward`, then move off centre and sink. The
 * page right-multiplies each instance matrix by it, so it acts before the
 * instance's own scale, turn and seat.
 *
 * THE RIM NEVER RISES. Leaning by θ lifts one side of a rim of radius w by
 * w sin θ; the sink is exactly that, so the rim's highest point stays on
 * the plane the head was set on and the far side goes 2 w sin θ into
 * steel no one sees. The off-centre moves it in the plane, not off it.
 */
export function driveMatrix(h: DrivenHead): number[] {
  const ct = Math.cos(h.turn);
  const st = Math.sin(h.turn);
  // The lean: a rotation by `lean` about the plate-level axis square to
  // (cos t, 0, sin t), which tips +y toward it.
  const [dx, dz] = [Math.cos(h.leanToward), Math.sin(h.leanToward)];
  const [ax, az] = [dz, -dx];
  const c = Math.cos(h.lean);
  const s = Math.sin(h.lean);
  const k = 1 - c;
  // Rodrigues' rotation about a = (ax, 0, az), row-major.
  const L = [
    [c + ax * ax * k, -az * s, ax * az * k],
    [az * s, c, -ax * s],
    [ax * az * k, ax * s, c + az * az * k],
  ];
  // The turn about y, row-major: x' = x ct + z st, z' = -x st + z ct.
  const Tn = [
    [ct, 0, st],
    [0, 1, 0],
    [-st, 0, ct],
  ];
  const S = [h.width, h.rise, h.width];
  // M = L · Tn · diag(S), then the shift.
  const M = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => (L[i]![0]! * Tn[0]![j]! + L[i]![1]! * Tn[1]![j]! + L[i]![2]! * Tn[2]![j]!) * S[j]!),
  );
  const shift = [h.off[0], -h.sink, h.off[1]];
  const out = new Array<number>(16).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) out[4 * j + i] = M[i]![j]!;
    out[12 + i] = shift[i]!;
  }
  out[15] = 1;
  return out;
}

/** `m` (column-major 4x4) applied to the point `v`. */
export function applyMatrix(m: readonly number[], v: readonly [number, number, number]): [number, number, number] {
  return [0, 1, 2].map((i) => m[i]! * v[0] + m[4 + i]! * v[1] + m[8 + i]! * v[2] + m[12 + i]!) as [
    number,
    number,
    number,
  ];
}
