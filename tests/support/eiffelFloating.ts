/**
 * Shared by tests/eiffelFloating.test.ts: a detector for members of the
 * cooked tower that stand on nothing.
 *
 * WHAT IT READS. The meshes the graph hands back, one per class (and one
 * per lift car), as polygon soups. A FACE is a connected component of one
 * mesh's points — the same notion `chronology.ts` dates by: a whole member
 * where the module welds one, one flat face of it where the module gives
 * every face its own points (most boxes and prisms). A SOLID is a run of
 * one mesh's consecutive triangles that closes on itself once its corners
 * are welded: a box, a prism, a capped sweep — one member, never the
 * member it abuts (see the SOLIDS step).
 *
 * UN-JITTERED GEOMETRY. The soups are meant to be the tower as designed,
 * cooked with the demo's 1 mm jitter (parts.ts `JITTER`) set to zero —
 * see `unjittered` in the test. Every distance below is then a property of
 * the construction. Measured on the jittered mesh, a gap or a weld near
 * its threshold was decided by the jitter's draw instead: of ten jitter
 * seeds tried, only the demo's own passed the suite's exact counts, and
 * the other nine failed them (2026-09-27).
 *
 * TWO CHECKS.
 *
 * - CONNECTED: two faces touch when some point of one lies within `tol`
 *   of the other (their triangles' distance, which is zero when they
 *   cross). The faces that touch, transitively, make clusters; the one
 *   that reaches the ground (y <= `groundY`) and every other that does are
 *   the tower; a cluster that reaches neither is FLOATING.
 * - ENDS: a LINEAR solid — at least `minLength` long and `slender` times
 *   longer than its section — must touch another solid at both ends if it
 *   lies or rakes, and at its foot if it stands (within `vertical` of
 *   plumb). An end is the last `endDepth` of it: every triangle of the
 *   solid clipped to that slab, tested against every other solid's
 *   triangles. A rail with a post under its middle but none under its end
 *   is connected, and fails here.
 *
 * An end whose middle lies inside another closed member (a strut run to a
 * chord's axis, a piston in its cylinder) is held too: parity along three
 * rays, the majority deciding.
 *
 * BLIND SPOTS, by design: only slender solids have their ends checked; and
 * any member counts as a support, so two rails meeting at a corner with no
 * post under it hold each other up (the CONNECTED check still needs the
 * pair to reach the ground somewhere).
 *
 * Everything is found through one uniform grid of triangles (cells of
 * `cell` metres, each triangle filed in every cell within `tol` of it),
 * so the whole tower (~1.2 million triangles at the plain depth) is one
 * pass. Pure: no cook, no randomness; the same soups give the same report.
 */

/** One mesh: a class name and its polygons. */
export interface Soup {
  readonly cls: string;
  readonly P: ArrayLike<number>;
  readonly primVertexStart: ArrayLike<number>;
  readonly primVertexCount: ArrayLike<number>;
  readonly vertexToPoint: ArrayLike<number>;
}

export interface FloatingOptions {
  /**
   * Touching distance, m, on the un-jittered geometry. The tower's design
   * gaps leave a wide plateau round it: the widest gap still read as
   * touching is 7.00 mm (360 platforms pieces at the 1st floor, 7 mm off
   * the silvered class), the narrowest read as open 11.0 mm (eight of the
   * Masque's loose ends), and the report is identical anywhere from 7.1 to
   * 10.9 mm (measured 2026-09-27).
   */
  readonly tol: number;
  /**
   * Two corners of one class this close are the same corner. Far under
   * a plate's thickness — the Masque's 630 chord is a flat 4.0 mm thick,
   * and a weld that reaches across a plate collapses its thin side and
   * splits the member into pieces that hold each other up — and far over
   * the f32 rounding of coincident corners (~0.03 mm at 300 m). The report
   * is identical for any weld from 0.001 to 2 mm (measured 2026-09-27).
   */
  readonly weld: number;
  /** Grid cell, m. */
  readonly cell: number;
  /** The ground's level: a cluster reaching it is grounded. */
  readonly groundY: number;
  /** A linear solid is at least this long ... */
  readonly minLength: number;
  /** ... and this many times longer than its section's larger side. */
  readonly slender: number;
  /** An end is this many sections deep (at least `minEnd`, at most a quarter of the length). */
  readonly endSections: number;
  readonly minEnd: number;
  /** A solid whose axis is within this many degrees of plumb needs only its foot supported. */
  readonly vertical: number;
  /** Measure each offender's gap to its nearest neighbour, out to `reach`. */
  readonly measure: boolean;
  readonly reach: number;
  /** Log every solid whose box meets this one (lo x, y, z, hi x, y, z): a debugging aid. */
  readonly debugBox?: readonly number[];
}

export const FLOATING_DEFAULTS: FloatingOptions = {
  tol: 0.008,
  weld: 0.0005,
  cell: 0.5,
  groundY: 0.01,
  minLength: 0.3,
  slender: 4,
  endSections: 1,
  minEnd: 0.03,
  vertical: 20,
  measure: false,
  reach: 0.5,
};

/** A cluster that touches nothing grounded. */
export interface FloatingCluster {
  readonly classes: readonly string[];
  readonly faces: number;
  readonly lo: readonly [number, number, number];
  readonly hi: readonly [number, number, number];
  /** With `measure`: how far it is from anything else (capped at `reach`), and that thing's class. */
  gap?: number;
  nearest?: string;
}

/** A linear solid with an end in the air. */
export interface LooseEnd {
  readonly cls: string;
  /** The free end's middle. */
  readonly at: readonly [number, number, number];
  /** The solid's axis (unit, from the free end inward) and length. */
  readonly axis: readonly [number, number, number];
  readonly length: number;
  /** "foot" for a standing member, "end" for a lying or raking one. */
  readonly end: "foot" | "end";
  readonly lo: readonly [number, number, number];
  readonly hi: readonly [number, number, number];
  /** With `measure`: how far the free end is from any other solid (capped at `reach`), and its class. */
  gap?: number;
  nearest?: string;
}

export interface FloatingReport {
  readonly triangles: number;
  readonly faces: number;
  readonly solids: number;
  readonly linear: number;
  readonly clusters: number;
  readonly floating: readonly FloatingCluster[];
  readonly looseEnds: readonly LooseEnd[];
  /** Milliseconds per phase: triangles, grid, connected, solids, ends. */
  readonly ms: Readonly<Record<string, number>>;
}

type V3 = [number, number, number];

// ---------------------------------------------------------------- geometry

/** Squared distance from p to triangle abc (Ericson, Real-Time Collision Detection 5.1.5). */
function pointTri2(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let qx: number, qy: number, qz: number;
  if (d1 <= 0 && d2 <= 0) {
    qx = ax; qy = ay; qz = az;
  } else {
    const bpx = px - bx, bpy = py - by, bpz = pz - bz;
    const d3 = abx * bpx + aby * bpy + abz * bpz;
    const d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) {
      qx = bx; qy = by; qz = bz;
    } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        qx = ax + v * abx; qy = ay + v * aby; qz = az + v * abz;
      } else {
        const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
        const d5 = abx * cpx + aby * cpy + abz * cpz;
        const d6 = acx * cpx + acy * cpy + acz * cpz;
        if (d6 >= 0 && d5 <= d6) {
          qx = cx; qy = cy; qz = cz;
        } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            qx = ax + w * acx; qy = ay + w * acy; qz = az + w * acz;
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              qx = bx + w * (cx - bx); qy = by + w * (cy - by); qz = bz + w * (cz - bz);
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              qx = ax + abx * v + acx * w; qy = ay + aby * v + acy * w; qz = az + abz * v + acz * w;
            }
          }
        }
      }
    }
  }
  const dx = px - qx, dy = py - qy, dz = pz - qz;
  return dx * dx + dy * dy + dz * dz;
}

/** Squared distance between segments p1q1 and p2q2 (Ericson 5.1.9). */
function segSeg2(
  p1x: number, p1y: number, p1z: number, q1x: number, q1y: number, q1z: number,
  p2x: number, p2y: number, p2z: number, q2x: number, q2y: number, q2z: number,
): number {
  const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z;
  const d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z;
  const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z;
  const e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz;
  let s: number, t: number;
  const EPS = 1e-18;
  if (a <= EPS && e <= EPS) {
    s = 0; t = 0;
  } else if (a <= EPS) {
    s = 0; t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= EPS) {
      t = 0; s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = a * e - b * b;
      s = den > EPS ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0; s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1; s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const dx = p1x + d1x * s - (p2x + d2x * t);
  const dy = p1y + d1y * s - (p2y + d2y * t);
  const dz = p1z + d1z * s - (p2z + d2z * t);
  return dx * dx + dy * dy + dz * dz;
}

/** Does segment pq cross triangle abc (Möller–Trumbore, both sides)? */
function segCrossesTri(
  px: number, py: number, pz: number, qx: number, qy: number, qz: number,
  ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number,
): boolean {
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
  const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
  const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
  const det = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(det) < 1e-14) return false;
  const inv = 1 / det;
  const sx = px - ax, sy = py - ay, sz = pz - az;
  const u = (sx * hx + sy * hy + sz * hz) * inv;
  if (u < 0 || u > 1) return false;
  const qqx = sy * e1z - sz * e1y, qqy = sz * e1x - sx * e1z, qqz = sx * e1y - sy * e1x;
  const v = (dx * qqx + dy * qqy + dz * qqz) * inv;
  if (v < 0 || u + v > 1) return false;
  const t = (e2x * qqx + e2y * qqy + e2z * qqz) * inv;
  return t >= 0 && t <= 1;
}

/** Are triangles i (of A) and j (of B) within sqrt(tol2) of each other? */
function trisTouch(A: Float64Array, i: number, B: Float64Array, j: number, tol2: number): boolean {
  const a = 9 * i;
  const b = 9 * j;
  // Boxes first.
  const tol = Math.sqrt(tol2);
  for (let k = 0; k < 3; k++) {
    const alo = Math.min(A[a + k]!, A[a + 3 + k]!, A[a + 6 + k]!);
    const ahi = Math.max(A[a + k]!, A[a + 3 + k]!, A[a + 6 + k]!);
    const blo = Math.min(B[b + k]!, B[b + 3 + k]!, B[b + 6 + k]!);
    const bhi = Math.max(B[b + k]!, B[b + 3 + k]!, B[b + 6 + k]!);
    if (alo > bhi + tol || blo > ahi + tol) return false;
  }
  for (let v = 0; v < 3; v++) {
    const o = a + 3 * v;
    if (pointTri2(A[o]!, A[o + 1]!, A[o + 2]!, B[b]!, B[b + 1]!, B[b + 2]!, B[b + 3]!, B[b + 4]!, B[b + 5]!, B[b + 6]!, B[b + 7]!, B[b + 8]!) <= tol2) return true;
    const w = b + 3 * v;
    if (pointTri2(B[w]!, B[w + 1]!, B[w + 2]!, A[a]!, A[a + 1]!, A[a + 2]!, A[a + 3]!, A[a + 4]!, A[a + 5]!, A[a + 6]!, A[a + 7]!, A[a + 8]!) <= tol2) return true;
  }
  for (let e = 0; e < 3; e++) {
    const p = a + 3 * e;
    const q = a + 3 * ((e + 1) % 3);
    for (let f = 0; f < 3; f++) {
      const r = b + 3 * f;
      const s = b + 3 * ((f + 1) % 3);
      if (segSeg2(A[p]!, A[p + 1]!, A[p + 2]!, A[q]!, A[q + 1]!, A[q + 2]!, B[r]!, B[r + 1]!, B[r + 2]!, B[s]!, B[s + 1]!, B[s + 2]!) <= tol2) return true;
    }
  }
  for (let e = 0; e < 3; e++) {
    const p = a + 3 * e;
    const q = a + 3 * ((e + 1) % 3);
    if (segCrossesTri(A[p]!, A[p + 1]!, A[p + 2]!, A[q]!, A[q + 1]!, A[q + 2]!, B[b]!, B[b + 1]!, B[b + 2]!, B[b + 3]!, B[b + 4]!, B[b + 5]!, B[b + 6]!, B[b + 7]!, B[b + 8]!)) return true;
    const r = b + 3 * e;
    const s = b + 3 * ((e + 1) % 3);
    if (segCrossesTri(B[r]!, B[r + 1]!, B[r + 2]!, B[s]!, B[s + 1]!, B[s + 2]!, A[a]!, A[a + 1]!, A[a + 2]!, A[a + 3]!, A[a + 4]!, A[a + 5]!, A[a + 6]!, A[a + 7]!, A[a + 8]!)) return true;
  }
  return false;
}

/** The distance between triangles i (of A) and j (of B): zero when they cross. */
function trisDistance(A: Float64Array, i: number, B: Float64Array, j: number): number {
  const a = 9 * i;
  const b = 9 * j;
  let best = Infinity;
  for (let v = 0; v < 3; v++) {
    const o = a + 3 * v;
    best = Math.min(best, pointTri2(A[o]!, A[o + 1]!, A[o + 2]!, B[b]!, B[b + 1]!, B[b + 2]!, B[b + 3]!, B[b + 4]!, B[b + 5]!, B[b + 6]!, B[b + 7]!, B[b + 8]!));
    const w = b + 3 * v;
    best = Math.min(best, pointTri2(B[w]!, B[w + 1]!, B[w + 2]!, A[a]!, A[a + 1]!, A[a + 2]!, A[a + 3]!, A[a + 4]!, A[a + 5]!, A[a + 6]!, A[a + 7]!, A[a + 8]!));
  }
  for (let e = 0; e < 3; e++) {
    const p = a + 3 * e;
    const q = a + 3 * ((e + 1) % 3);
    for (let f = 0; f < 3; f++) {
      const r = b + 3 * f;
      const s = b + 3 * ((f + 1) % 3);
      best = Math.min(best, segSeg2(A[p]!, A[p + 1]!, A[p + 2]!, A[q]!, A[q + 1]!, A[q + 2]!, B[r]!, B[r + 1]!, B[r + 2]!, B[s]!, B[s + 1]!, B[s + 2]!));
    }
  }
  if (best > 0 && trisTouch(A, i, B, j, 0)) return 0;
  return Math.sqrt(best);
}

// ---------------------------------------------------------------- grid

/** Cells hashed to one number: ±2,000 cells an axis. */
const SPAN = 4096;
const key = (i: number, j: number, k: number) => (i + 2048) + SPAN * ((j + 2048) + SPAN * (k + 2048));

/**
 * Does the triangle at T[o..o+9] overlap the cube of half-side h about c?
 * The separating-axis test (Akenine-Möller): the cube's three axes, the
 * triangle's normal, and the nine cross products of edges and axes.
 */
function triBox(T: Float64Array, o: number, cx: number, cy: number, cz: number, h: number): boolean {
  const v0x = T[o]! - cx, v0y = T[o + 1]! - cy, v0z = T[o + 2]! - cz;
  const v1x = T[o + 3]! - cx, v1y = T[o + 4]! - cy, v1z = T[o + 5]! - cz;
  const v2x = T[o + 6]! - cx, v2y = T[o + 7]! - cy, v2z = T[o + 8]! - cz;
  if (Math.min(v0x, v1x, v2x) > h || Math.max(v0x, v1x, v2x) < -h) return false;
  if (Math.min(v0y, v1y, v2y) > h || Math.max(v0y, v1y, v2y) < -h) return false;
  if (Math.min(v0z, v1z, v2z) > h || Math.max(v0z, v1z, v2z) < -h) return false;
  const e0x = v1x - v0x, e0y = v1y - v0y, e0z = v1z - v0z;
  const e1x = v2x - v1x, e1y = v2y - v1y, e1z = v2z - v1z;
  const e2x = v0x - v2x, e2y = v0y - v2y, e2z = v0z - v2z;
  // The plane.
  const nx = e0y * e1z - e0z * e1y, ny = e0z * e1x - e0x * e1z, nz = e0x * e1y - e0y * e1x;
  const d = nx * v0x + ny * v0y + nz * v0z;
  const r = h * (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
  if (Math.abs(d) > r) return false;
  // The nine axes a x e, a each of the cube's axes.
  const edges = [e0x, e0y, e0z, e1x, e1y, e1z, e2x, e2y, e2z];
  const vs = [v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z];
  for (let e = 0; e < 3; e++) {
    const ex = edges[3 * e]!, ey = edges[3 * e + 1]!, ez = edges[3 * e + 2]!;
    // x cross e = (0, -ez, ey); y cross e = (ez, 0, -ex); z cross e = (-ey, ex, 0).
    const axes = [0, -ez, ey, ez, 0, -ex, -ey, ex, 0];
    for (let a = 0; a < 3; a++) {
      const px = axes[3 * a]!, py = axes[3 * a + 1]!, pz = axes[3 * a + 2]!;
      let mn = Infinity, mx = -Infinity;
      for (let v = 0; v < 3; v++) {
        const p = px * vs[3 * v]! + py * vs[3 * v + 1]! + pz * vs[3 * v + 2]!;
        if (p < mn) mn = p;
        if (p > mx) mx = p;
      }
      const rad = h * (Math.abs(px) + Math.abs(py) + Math.abs(pz));
      if (mn > rad || mx < -rad) return false;
    }
  }
  return true;
}

class Grid {
  readonly cells = new Map<number, number[]>();
  constructor(readonly size: number) {}

  /** File triangle `t` of `T` in every cell within `pad` of it. */
  add(T: Float64Array, t: number, pad: number): void {
    const o = 9 * t;
    const s = this.size;
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.floor((Math.min(T[o + k]!, T[o + 3 + k]!, T[o + 6 + k]!) - pad) / s);
      hi[k] = Math.floor((Math.max(T[o + k]!, T[o + 3 + k]!, T[o + 6 + k]!) + pad) / s);
    }
    const n = (hi[0]! - lo[0]! + 1) * (hi[1]! - lo[1]! + 1) * (hi[2]! - lo[2]! + 1);
    if (n <= 8) {
      for (let i = lo[0]!; i <= hi[0]!; i++)
        for (let j = lo[1]!; j <= hi[1]!; j++) for (let k = lo[2]!; k <= hi[2]!; k++) this.push(key(i, j, k), t);
      return;
    }
    // A big triangle: every cell of its box that the triangle, grown by
    // the pad, overlaps (the separating-axis test of a box and a triangle).
    const h = s / 2 + pad;
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          if (triBox(T, o, (i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s, h)) this.push(key(i, j, k), t);
        }
  }

  private push(c: number, t: number): void {
    const list = this.cells.get(c);
    if (list === undefined) this.cells.set(c, [t]);
    else list.push(t);
  }

  /** Every triangle filed in a cell overlapping the box, once each. */
  query(lo: readonly number[], hi: readonly number[], out: Set<number>): void {
    const s = this.size;
    for (let i = Math.floor(lo[0]! / s); i <= Math.floor(hi[0]! / s); i++)
      for (let j = Math.floor(lo[1]! / s); j <= Math.floor(hi[1]! / s); j++)
        for (let k = Math.floor(lo[2]! / s); k <= Math.floor(hi[2]! / s); k++) {
          const list = this.cells.get(key(i, j, k));
          if (list !== undefined) for (const t of list) out.add(t);
        }
  }
}

class UnionFind {
  readonly parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }
  find(a: number): number {
    const p = this.parent;
    while (p[a] !== a) {
      p[a] = p[p[a]!]!;
      a = p[a]!;
    }
    return a;
  }
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (ra < rb) this.parent[rb] = ra;
    else this.parent[ra] = rb;
    return true;
  }
}

// ---------------------------------------------------------------- clipping

/** Clip a convex polygon (flat xyz list) to n·x >= d. */
function clipPoly(poly: number[], nx: number, ny: number, nz: number, d: number): number[] {
  const out: number[] = [];
  const m = poly.length / 3;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const ax = poly[3 * i]!, ay = poly[3 * i + 1]!, az = poly[3 * i + 2]!;
    const bx = poly[3 * j]!, by = poly[3 * j + 1]!, bz = poly[3 * j + 2]!;
    const da = nx * ax + ny * ay + nz * az - d;
    const db = nx * bx + ny * by + nz * bz - d;
    if (da >= 0) out.push(ax, ay, az);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push(ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az));
    }
  }
  return out;
}

// ---------------------------------------------------------------- detector

/** Find the floating clusters and the loose ends of `soups`. */
export function findFloating(soups: readonly Soup[], options: Partial<FloatingOptions> = {}): FloatingReport {
  const o = { ...FLOATING_DEFAULTS, ...options };
  const ms: Record<string, number> = {};
  let clock = performance.now();
  const lap = (name: string) => {
    const now = performance.now();
    ms[name] = Math.round(now - clock);
    clock = now;
  };
  const tol2 = o.tol * o.tol;

  // Triangles, faces and classes. Each polygon is fanned; each mesh's
  // point components are its faces.
  let nt = 0;
  for (const s of soups) for (let p = 0; p < s.primVertexStart.length; p++) nt += Math.max(0, s.primVertexCount[p]! - 2);
  const T = new Float64Array(9 * nt);
  const faceOfTri = new Int32Array(nt);
  const faceCls: number[] = [];
  let t = 0;
  soups.forEach((s, ci) => {
    const n = s.P.length / 3;
    const uf = new UnionFind(n);
    for (let p = 0; p < s.primVertexStart.length; p++) {
      const st = s.primVertexStart[p]!;
      for (let k = 1; k < s.primVertexCount[p]!; k++) uf.union(s.vertexToPoint[st]!, s.vertexToPoint[st + k]!);
    }
    const faceOfRoot = new Map<number, number>();
    for (let p = 0; p < s.primVertexStart.length; p++) {
      const st = s.primVertexStart[p]!;
      const c = s.primVertexCount[p]!;
      if (c < 3) continue;
      const root = uf.find(s.vertexToPoint[st]!);
      let f = faceOfRoot.get(root);
      if (f === undefined) {
        f = faceCls.length;
        faceCls.push(ci);
        faceOfRoot.set(root, f);
      }
      for (let k = 1; k + 1 < c; k++) {
        const ids = [st, st + k, st + k + 1];
        for (let v = 0; v < 3; v++) {
          const q = s.vertexToPoint[ids[v]!]!;
          T[9 * t + 3 * v] = s.P[3 * q]!;
          T[9 * t + 3 * v + 1] = s.P[3 * q + 1]!;
          T[9 * t + 3 * v + 2] = s.P[3 * q + 2]!;
        }
        faceOfTri[t] = f;
        t++;
      }
    }
  });
  nt = t;
  const nf = faceCls.length;

  lap("triangles");
  // The grid.
  const grid = new Grid(o.cell);
  for (let i = 0; i < nt; i++) grid.add(T, i, o.tol);

  lap("grid");
  // CONNECTED: faces that touch, transitively.
  const touch = new UnionFind(nf);
  for (const list of grid.cells.values()) {
    for (let x = 0; x < list.length; x++) {
      const i = list[x]!;
      const fi = faceOfTri[i]!;
      for (let y = x + 1; y < list.length; y++) {
        const j = list[y]!;
        const fj = faceOfTri[j]!;
        if (fi === fj) continue;
        if (touch.find(fi) === touch.find(fj)) continue;
        if (trisTouch(T, i, T, j, tol2)) touch.union(fi, fj);
      }
    }
  }
  const faceLo = new Float64Array(3 * nf).fill(Infinity);
  const faceHi = new Float64Array(3 * nf).fill(-Infinity);
  for (let i = 0; i < nt; i++) {
    const f = faceOfTri[i]!;
    for (let v = 0; v < 3; v++)
      for (let k = 0; k < 3; k++) {
        const x = T[9 * i + 3 * v + k]!;
        if (x < faceLo[3 * f + k]!) faceLo[3 * f + k] = x;
        if (x > faceHi[3 * f + k]!) faceHi[3 * f + k] = x;
      }
  }
  const clusters = new Map<number, { faces: number; classes: Set<number>; lo: V3; hi: V3 }>();
  for (let f = 0; f < nf; f++) {
    const r = touch.find(f);
    let c = clusters.get(r);
    if (c === undefined) {
      c = { faces: 0, classes: new Set(), lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] };
      clusters.set(r, c);
    }
    c.faces++;
    c.classes.add(faceCls[f]!);
    for (let k = 0; k < 3; k++) {
      c.lo[k] = Math.min(c.lo[k]!, faceLo[3 * f + k]!);
      c.hi[k] = Math.max(c.hi[k]!, faceHi[3 * f + k]!);
    }
  }
  const floating: FloatingCluster[] = [];
  for (const c of clusters.values()) {
    if (c.lo[1]! <= o.groundY) continue;
    floating.push({
      classes: [...c.classes].sort((a, b) => a - b).map((k) => soups[k]!.cls),
      faces: c.faces,
      lo: c.lo,
      hi: c.hi,
    });
  }
  floating.sort((a, b) => b.hi[1] - a.hi[1] || a.lo[0] - b.lo[0] || a.lo[2] - b.lo[2]);
  /** The nearest triangle to `tris` that `skip` does not reject, out to `reach`. */
  const nearestTo = (P: Float64Array, tris: Iterable<number>, skip: (j: number) => boolean): [number, string] => {
    let best = o.reach;
    let cls = "";
    const found = new Set<number>();
    for (const i of tris) {
      const lo = [0, 1, 2].map((k) => Math.min(P[9 * i + k]!, P[9 * i + 3 + k]!, P[9 * i + 6 + k]!) - o.reach);
      const hi = [0, 1, 2].map((k) => Math.max(P[9 * i + k]!, P[9 * i + 3 + k]!, P[9 * i + 6 + k]!) + o.reach);
      found.clear();
      grid.query(lo, hi, found);
      for (const j of found) {
        if (skip(j)) continue;
        const d = trisDistance(P, i, T, j);
        if (d < best) {
          best = d;
          cls = soups[faceCls[faceOfTri[j]!]!]!.cls;
        }
      }
    }
    return [best, cls];
  };
  if (o.measure && floating.length > 0) {
    const trisOf = new Map<number, number[]>();
    for (let i = 0; i < nt; i++) {
      const r = touch.find(faceOfTri[i]!);
      const c = clusters.get(r)!;
      if (c.lo[1]! <= o.groundY) continue;
      const l = trisOf.get(r);
      if (l === undefined) trisOf.set(r, [i]);
      else l.push(i);
    }
    const byBox = new Map<string, FloatingCluster>();
    for (const f of floating) byBox.set(`${f.lo.join()}|${f.hi.join()}`, f);
    for (const [r, tris] of trisOf) {
      const c = clusters.get(r)!;
      const f = byBox.get(`${c.lo.join()}|${c.hi.join()}`)!;
      const [gap, cls] = nearestTo(T, tris, (j) => touch.find(faceOfTri[j]!) === r);
      f.gap = gap;
      f.nearest = cls;
    }
  }

  lap("connected");
  // SOLIDS: each run of one mesh's triangles that closes on itself. The
  // modules emit a member's faces one after another (a box's twelve
  // triangles, a prism's caps and walls), each face with its own points,
  // so a member is recovered by welding the corners (coincident but for
  // f32 rounding; see `weld`) and growing from its first triangle across
  // shared edges, always taking the lowest-numbered triangle that meets an
  // open edge, until no edge is open. Growing across ANY shared edge would
  // weld a rail to the post it ends flush on; the order is what keeps them
  // apart, since the rail closes before the post's first triangle comes.
  const solidOfTri = new Int32Array(nt).fill(-1);
  const trisOfSolid = new Map<number, number[]>();
  /** The solids whose run closed: they have an inside. */
  const closed = new Set<number>();
  {
    const w = o.weld;
    const w2 = w * w;
    const vid = new Int32Array(3 * nt);
    const reps: number[] = [];
    const repCell = new Map<number, number[]>();
    for (let i = 0; i < nt; i++) {
      const cls = faceCls[faceOfTri[i]!]!;
      for (let v = 0; v < 3; v++) {
        const x = T[9 * i + 3 * v]!, y = T[9 * i + 3 * v + 1]!, z = T[9 * i + 3 * v + 2]!;
        const ci = Math.floor(x / w), cj = Math.floor(y / w), ck = Math.floor(z / w);
        let found = -1;
        search: for (let a = ci - 1; a <= ci + 1; a++)
          for (let b = cj - 1; b <= cj + 1; b++)
            for (let c = ck - 1; c <= ck + 1; c++) {
              const l = repCell.get(key(a, b, c));
              if (l === undefined) continue;
              for (const r of l) {
                if (reps[4 * r + 3] !== cls) continue;
                const dx = reps[4 * r]! - x, dy = reps[4 * r + 1]! - y, dz = reps[4 * r + 2]! - z;
                if (dx * dx + dy * dy + dz * dz <= w2) {
                  found = r;
                  break search;
                }
              }
            }
        if (found < 0) {
          found = reps.length / 4;
          reps.push(x, y, z, cls);
          const c = key(ci, cj, ck);
          const l = repCell.get(c);
          if (l === undefined) repCell.set(c, [found]);
          else l.push(found);
        }
        vid[3 * i + v] = found;
      }
    }
    const nv = reps.length / 4;
    const edgeKey = (a: number, b: number) => (a < b ? a * nv + b : b * nv + a);
    const edgeTris = new Map<number, number[]>();
    for (let i = 0; i < nt; i++) {
      for (let e = 0; e < 3; e++) {
        const k = edgeKey(vid[3 * i + e]!, vid[3 * i + ((e + 1) % 3)]!);
        const l = edgeTris.get(k);
        if (l === undefined) edgeTris.set(k, [i]);
        else l.push(i);
      }
    }
    // A binary min-heap of triangle numbers.
    const heap: number[] = [];
    const push = (x: number) => {
      heap.push(x);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p]! <= x) break;
        heap[i] = heap[p]!;
        i = p;
      }
      heap[i] = x;
    };
    const pop = (): number => {
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          if (l >= heap.length) break;
          const r = l + 1;
          const m = r < heap.length && heap[r]! < heap[l]! ? r : l;
          if (heap[m]! >= last) break;
          heap[i] = heap[m]!;
          i = m;
        }
        heap[i] = last;
      }
      return top;
    };
    const open = new Set<number>();
    for (let t0 = 0; t0 < nt; t0++) {
      if (solidOfTri[t0] !== -1) continue;
      const sid = t0;
      const members: number[] = [];
      open.clear();
      heap.length = 0;
      const take = (i: number) => {
        solidOfTri[i] = sid;
        members.push(i);
        for (let e = 0; e < 3; e++) {
          const k = edgeKey(vid[3 * i + e]!, vid[3 * i + ((e + 1) % 3)]!);
          if (open.has(k)) open.delete(k);
          else open.add(k);
          for (const j of edgeTris.get(k)!) if (solidOfTri[j] === -1 && faceCls[faceOfTri[j]!] === faceCls[faceOfTri[i]!]) push(j);
        }
      };
      take(t0);
      while (open.size > 0 && heap.length > 0) {
        const j = pop();
        if (solidOfTri[j] !== -1) continue;
        let meets = false;
        for (let e = 0; e < 3 && !meets; e++) meets = open.has(edgeKey(vid[3 * j + e]!, vid[3 * j + ((e + 1) % 3)]!));
        if (meets) take(j);
      }
      trisOfSolid.set(sid, members);
      if (open.size === 0) closed.add(sid);
    }
  }

  lap("solids");
  /**
   * Is `p` inside a closed solid other than `self`? Crossings counted by
   * parity along three skew rays, the majority deciding: one ray can graze
   * an edge of a box turned 45 degrees and count it twice or not at all.
   */
  const buried = (p: V3, self: number): boolean => {
    const cand = new Set<number>();
    const found = new Set<number>();
    grid.query([p[0] - 0.25, p[1] - 0.25, p[2] - 0.25], [p[0] + 0.25, p[1] + 0.25, p[2] + 0.25], found);
    for (const j of found) {
      const sj = solidOfTri[j]!;
      if (sj !== self && closed.has(sj)) cand.add(sj);
    }
    const rays: ReadonlyArray<V3> = [
      [0.5773, 0.5774, 0.5773],
      [-0.3122, 0.8814, 0.3544],
      [0.6851, -0.2433, -0.6867],
    ];
    const far = 1e3;
    for (const sj of cand) {
      let inside = 0;
      for (const [dx, dy, dz] of rays) {
        let crossings = 0;
        for (const i of trisOfSolid.get(sj)!) {
          const o9 = 9 * i;
          if (segCrossesTri(p[0], p[1], p[2], p[0] + far * dx, p[1] + far * dy, p[2] + far * dz, T[o9]!, T[o9 + 1]!, T[o9 + 2]!, T[o9 + 3]!, T[o9 + 4]!, T[o9 + 5]!, T[o9 + 6]!, T[o9 + 7]!, T[o9 + 8]!)) crossings++;
        }
        if (crossings % 2 === 1) inside++;
      }
      if (inside >= 2) return true;
    }
    return false;
  };
  // ENDS.
  const looseEnds: LooseEnd[] = [];
  const cosVertical = Math.cos((o.vertical * Math.PI) / 180);
  let linear = 0;
  const near = new Set<number>();
  for (const [s, tris] of trisOfSolid) {
    // The axis: the principal direction of the solid's corners.
    let n = 0;
    let mx = 0, my = 0, mz = 0;
    for (const i of tris) for (let v = 0; v < 3; v++) {
      mx += T[9 * i + 3 * v]!; my += T[9 * i + 3 * v + 1]!; mz += T[9 * i + 3 * v + 2]!; n++;
    }
    mx /= n; my /= n; mz /= n;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (const i of tris) for (let v = 0; v < 3; v++) {
      const dx = T[9 * i + 3 * v]! - mx, dy = T[9 * i + 3 * v + 1]! - my, dz = T[9 * i + 3 * v + 2]! - mz;
      xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz;
    }
    // Power iteration from the box's longest side.
    let ax = 1, ay = 0.618, az = 0.382;
    for (let it = 0; it < 60; it++) {
      const bx = xx * ax + xy * ay + xz * az;
      const by = xy * ax + yy * ay + yz * az;
      const bz = xz * ax + yz * ay + zz * az;
      const l = Math.hypot(bx, by, bz);
      if (l === 0) break;
      ax = bx / l; ay = by / l; az = bz / l;
    }
    // Extents along the axis and across it.
    let tmin = Infinity, tmax = -Infinity;
    // Two directions across.
    let px = -ay, py = ax, pz = 0;
    if (Math.hypot(px, py, pz) < 0.3) { px = 0; py = -az; pz = ay; }
    const pl = Math.hypot(px, py, pz);
    px /= pl; py /= pl; pz /= pl;
    const qx = ay * pz - az * py, qy = az * px - ax * pz, qz = ax * py - ay * px;
    let umin = Infinity, umax = -Infinity, wmin = Infinity, wmax = -Infinity;
    for (const i of tris) for (let v = 0; v < 3; v++) {
      const x = T[9 * i + 3 * v]!, y = T[9 * i + 3 * v + 1]!, z = T[9 * i + 3 * v + 2]!;
      const tt = x * ax + y * ay + z * az;
      const u = x * px + y * py + z * pz;
      const w = x * qx + y * qy + z * qz;
      if (tt < tmin) tmin = tt; if (tt > tmax) tmax = tt;
      if (u < umin) umin = u; if (u > umax) umax = u;
      if (w < wmin) wmin = w; if (w > wmax) wmax = w;
    }
    const length = tmax - tmin;
    const section = Math.max(umax - umin, wmax - wmin);
    const dbg = o.debugBox;
    let debug = false;
    if (dbg !== undefined) {
      const b0 = [Infinity, Infinity, Infinity];
      const b1 = [-Infinity, -Infinity, -Infinity];
      for (const i of tris) for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) {
        b0[k] = Math.min(b0[k]!, T[9 * i + 3 * v + k]!);
        b1[k] = Math.max(b1[k]!, T[9 * i + 3 * v + k]!);
      }
      debug = [0, 1, 2].every((k) => b1[k]! >= dbg[k]! && b0[k]! <= dbg[k + 3]!);
      if (debug) console.log("solid", s, soups[faceCls[faceOfTri[tris[0]!]!]!]!.cls, "tris", tris.length, "box", b0.map((x) => x.toFixed(3)).join(), b1.map((x) => x.toFixed(3)).join(), "len", length.toFixed(3), "sec", section.toFixed(3), "axis", [ax, ay, az].map((x) => x.toFixed(2)).join());
    }
    if (length < o.minLength || length < o.slender * section) continue;
    linear++;
    const standing = Math.abs(ay) >= cosVertical;
    const depth = Math.min(length / 4, Math.max(o.minEnd, o.endSections * section));
    // The ends: +1 is the tmax end, -1 the tmin end.
    for (const sign of [1, -1]) {
      if (standing) {
        // Only the foot: the lower end.
        const footSign = ay > 0 ? -1 : 1;
        if (sign !== footSign) continue;
      }
      const nx = sign * ax, ny = sign * ay, nz = sign * az;
      const d = sign > 0 ? tmax - depth : -(tmin + depth);
      let supported = false;
      const lo: V3 = [Infinity, Infinity, Infinity];
      const hi: V3 = [-Infinity, -Infinity, -Infinity];
      const pieces: number[][] = [];
      for (const i of tris) {
        const poly = clipPoly(Array.from(T.subarray(9 * i, 9 * i + 9)), nx, ny, nz, d);
        if (poly.length < 9) continue;
        pieces.push(poly);
        for (let k = 0; k < poly.length; k++) {
          const c = k % 3;
          if (poly[k]! < lo[c]!) lo[c] = poly[k]!;
          if (poly[k]! > hi[c]!) hi[c] = poly[k]!;
        }
      }
      near.clear();
      grid.query(lo.map((x) => x - o.tol), hi.map((x) => x + o.tol), near);
      const P = new Float64Array(9);
      outer: for (const j of near) {
        if (solidOfTri[j] === s) continue;
        for (const poly of pieces) {
          const m = poly.length / 3;
          for (let k = 1; k + 1 < m; k++) {
            P[0] = poly[0]!; P[1] = poly[1]!; P[2] = poly[2]!;
            P[3] = poly[3 * k]!; P[4] = poly[3 * k + 1]!; P[5] = poly[3 * k + 2]!;
            P[6] = poly[3 * k + 3]!; P[7] = poly[3 * k + 4]!; P[8] = poly[3 * k + 5]!;
            if (trisTouch(P, 0, T, j, tol2)) {
              supported = true;
              break outer;
            }
          }
        }
      }
      if (debug) console.log("  end", sign, supported ? "supported" : "LOOSE", "pieces", pieces.length, "near", near.size);
      if (supported) continue;
      const at: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
      // An end buried in another member — run to a chord's axis, say —
      // touches no surface but is held all the same: its middle inside a
      // closed solid.
      if (buried(at, s)) {
        if (debug) console.log("  end", sign, "buried");
        continue;
      }
      const blo: V3 = [Infinity, Infinity, Infinity];
      const bhi: V3 = [-Infinity, -Infinity, -Infinity];
      for (const i of tris)
        for (let v = 0; v < 3; v++)
          for (let k = 0; k < 3; k++) {
            blo[k] = Math.min(blo[k]!, T[9 * i + 3 * v + k]!);
            bhi[k] = Math.max(bhi[k]!, T[9 * i + 3 * v + k]!);
          }
      let gap: number | undefined;
      let nearest: string | undefined;
      if (o.measure) {
        const E = new Float64Array(pieces.reduce((n, poly) => n + 9 * (poly.length / 3 - 2), 0));
        let e = 0;
        for (const poly of pieces) {
          const m = poly.length / 3;
          for (let k = 1; k + 1 < m; k++) {
            E.set([poly[0]!, poly[1]!, poly[2]!, poly[3 * k]!, poly[3 * k + 1]!, poly[3 * k + 2]!, poly[3 * k + 3]!, poly[3 * k + 4]!, poly[3 * k + 5]!], 9 * e);
            e++;
          }
        }
        [gap, nearest] = nearestTo(E, Array.from({ length: e }, (_, k) => k), (j) => solidOfTri[j] === s);
      }
      looseEnds.push({
        gap,
        nearest,
        cls: soups[faceCls[faceOfTri[tris[0]!]!]!]!.cls,
        at,
        axis: [-nx, -ny, -nz],
        length,
        end: standing ? "foot" : "end",
        lo: blo,
        hi: bhi,
      });
    }
  }
  looseEnds.sort((a, b) => a.cls.localeCompare(b.cls) || b.at[1] - a.at[1] || a.at[0] - b.at[0] || a.at[2] - b.at[2]);
  return {
    triangles: nt,
    faces: nf,
    solids: trisOfSolid.size,
    linear,
    clusters: clusters.size,
    floating,
    looseEnds,
    ms: (lap("ends"), ms),
  };
}
