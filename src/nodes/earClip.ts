/**
 * Planar polygon triangulation by ear clipping, with holes — the cap
 * triangulator `extrudePolygon` and `sweepProfile` share.
 *
 * Internal to the node library (not re-exported from `./index.ts`): the
 * nodes are the API, and this is how they fill a concave outline.
 *
 * THE ALGORITHM. Every hole is first spliced into the outer boundary by a
 * zero-width "bridge" — a doubled edge from the hole's leftmost vertex to
 * a vertex of the outer boundary it can see — so the polygon becomes one
 * weakly simple loop (Eberly, "Triangulation by Ear Clipping", 2002; the
 * visibility refinement below is the one earcut uses). Holes are bridged
 * leftmost first, so a later hole's bridge sees the earlier ones as part of
 * the boundary; the zero-width spikes a bridge can leave (a hole touching
 * an edge bridges along it) are filtered out after each one. The loop is
 * then clipped: a convex vertex whose triangle with its two neighbours
 * holds no reflex vertex is an ear, and is cut off. A lap that finds no
 * ear — the doubled bridge points can hide every one — splits the loop
 * along a diagonal that keeps both halves simple and clips each.
 *
 * DETERMINISM. Every choice is a pure function of the coordinates and the
 * index order: holes sort by leftmost x, ties by loop order; a hole's
 * leftmost vertex ties to the lower y, then the lower index; the clip
 * walk starts at the outer loop's first vertex (or the node the filter
 * keeps in its place) and moves forward, and a split takes the first
 * valid diagonal in walk order. No Map,
 * no sort without a total order, no randomness.
 *
 * WHAT COMES OUT. Triangles as vertex-index triples, every one
 * counter-clockwise (positive signed area) in the input's own 2D frame
 * whichever way the loops were wound — the caller flips them for the side
 * it wants to face. A vertex collinear with its neighbours (including a
 * repeated point) is dropped from the boundary without a triangle, so
 * degenerate input yields fewer triangles rather than zero-area ones. A
 * hole of zero area is ignored. Input that is not a simple polygon
 * (self-crossing edges, overlapping holes, a hole outside the outer loop)
 * gets a triangulation that terminates and is deterministic but does not
 * describe anything; callers that can detect those cases refuse them.
 *
 * Cost is O(n^2) in the worst case (n = vertices including holes): each
 * ear test scans the loop. Footprints and sections are small enough that
 * the simple scan beats the bookkeeping a spatial index would cost.
 */

/** Doubled signed area of (a, b, c): positive when counter-clockwise. */
function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/**
 * Doubled signed area of loop `[start, start + count)` of `xy`, positive
 * when it winds counter-clockwise.
 */
export function loopArea2(xy: ArrayLike<number>, start: number, count: number): number {
  let a = 0;
  for (let i = 0; i < count; i++) {
    const p = (start + i) * 2;
    const q = (start + ((i + 1) % count)) * 2;
    a += xy[p] * xy[q + 1] - xy[q] * xy[p + 1];
  }
  return a;
}

/**
 * Whether loop `[start, start + count)` of `xy` is convex, allowing
 * collinear corners and a turn backwards no larger than rounding makes:
 * `1e-6` radians, plus what f32 storage does to a straight edge — a
 * midpoint of an edge 140 units from the origin sits up to ~1e-5 off the
 * line through its neighbours, which reads as a reflex corner on a short
 * edge and is not one. A fan from the first corner carries a dent that
 * small with no visible error. A loop of zero area counts as convex
 * (there is nothing a fan could get wrong). Either winding.
 */
export function isConvexLoop(xy: ArrayLike<number>, start: number, count: number): boolean {
  const area = loopArea2(xy, start, count);
  if (area === 0) return true;
  const sign = area > 0 ? 1 : -1;
  let reach = 0;
  for (let i = 0; i < count * 2; i++) reach = Math.max(reach, Math.abs(xy[start * 2 + i]));
  // Eight f32 ulps of the loop's largest coordinate: the error each edge
  // vector's perpendicular component can pick up from rounded endpoints.
  const slack = reach * 8 * 2 ** -24;
  for (let i = 0; i < count; i++) {
    const a = (start + ((i + count - 1) % count)) * 2;
    const b = (start + i) * 2;
    const c = (start + ((i + 1) % count)) * 2;
    const ux = xy[b] - xy[a];
    const uy = xy[b + 1] - xy[a + 1];
    const vx = xy[c] - xy[b];
    const vy = xy[c + 1] - xy[b + 1];
    const turn = (ux * vy - uy * vx) * sign;
    if (turn >= 0) continue;
    const lu = Math.sqrt(ux * ux + uy * uy);
    const lv = Math.sqrt(vx * vx + vy * vy);
    if (-turn > 1e-6 * lu * lv + slack * (lu + lv)) return false;
  }
  return true;
}

/**
 * Where `(px, py)` lies against loop `[start, start + count)` of `xy`:
 * 1 inside, 0 on the boundary, -1 outside. Crossing-number test with the
 * boundary checked exactly first, so a hole that touches its outer loop
 * is "on", not "out".
 */
export function pointInLoop(
  xy: ArrayLike<number>,
  start: number,
  count: number,
  px: number,
  py: number,
): number {
  let inside = false;
  for (let i = 0; i < count; i++) {
    const a = (start + i) * 2;
    const b = (start + ((i + 1) % count)) * 2;
    const ax = xy[a];
    const ay = xy[a + 1];
    const bx = xy[b];
    const by = xy[b + 1];
    if (
      cross(ax, ay, bx, by, px, py) === 0 &&
      px >= Math.min(ax, bx) &&
      px <= Math.max(ax, bx) &&
      py >= Math.min(ay, by) &&
      py <= Math.max(ay, by)
    ) {
      return 0;
    }
    if (ay > py !== by > py && px < ax + ((py - ay) * (bx - ax)) / (by - ay)) inside = !inside;
  }
  return inside ? 1 : -1;
}

/** The doubly linked loop the clipper works on, as parallel arrays. */
class Ring {
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** The input vertex each node stands for (a bridge duplicates two). */
  readonly id: Int32Array;
  readonly next: Int32Array;
  readonly prev: Int32Array;
  size = 0;

  constructor(capacity: number) {
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.id = new Int32Array(capacity);
    this.next = new Int32Array(capacity);
    this.prev = new Int32Array(capacity);
  }

  /** Append a node after `last` (or as a lone node when `last < 0`). */
  insert(id: number, x: number, y: number, last: number): number {
    const n = this.size++;
    this.x[n] = x;
    this.y[n] = y;
    this.id[n] = id;
    if (last < 0) {
      this.next[n] = n;
      this.prev[n] = n;
    } else {
      const after = this.next[last];
      this.next[n] = after;
      this.prev[n] = last;
      this.prev[after] = n;
      this.next[last] = n;
    }
    return n;
  }

  unlink(n: number): void {
    const p = this.prev[n];
    const q = this.next[n];
    this.next[p] = q;
    this.prev[q] = p;
  }

  /** Doubled signed area of the corner at `n`. */
  corner(n: number): number {
    const p = this.prev[n];
    const q = this.next[n];
    return cross(this.x[p], this.y[p], this.x[n], this.y[n], this.x[q], this.y[q]);
  }
}

/**
 * Link loop `[start, start + count)` into the ring, reversed when needed
 * so it winds counter-clockwise (`ccw`) or clockwise. Returns its first
 * node in ring order.
 */
function linkLoop(
  ring: Ring,
  xy: ArrayLike<number>,
  start: number,
  count: number,
  ccw: boolean,
): number {
  const forward = loopArea2(xy, start, count) > 0 === ccw;
  let last = -1;
  for (let k = 0; k < count; k++) {
    const i = start + (forward ? k : (count - k) % count);
    last = ring.insert(i, xy[i * 2], xy[i * 2 + 1], last);
  }
  return ring.next[last];
}

/** The diagonal from `a` toward `b` starts inside the polygon at `a`. */
function locallyInside(r: Ring, a: number, b: number): boolean {
  const p = r.prev[a];
  const q = r.next[a];
  const { x, y } = r;
  return r.corner(a) > 0
    ? cross(x[a], y[a], x[b], y[b], x[q], y[q]) <= 0 && cross(x[a], y[a], x[p], y[p], x[b], y[b]) <= 0
    : cross(x[a], y[a], x[b], y[b], x[p], y[p]) > 0 || cross(x[a], y[a], x[q], y[q], x[b], y[b]) > 0;
}

/** `p` lies inside or on triangle (a, b, c), whichever way it winds. */
function inTriangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number,
): boolean {
  const d1 = cross(ax, ay, bx, by, px, py);
  const d2 = cross(bx, by, cx, cy, px, py);
  const d3 = cross(cx, cy, ax, ay, px, py);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/**
 * The outer-loop node the hole vertex `h` (its leftmost) can be bridged
 * to: cast a ray from `h` toward -x, take the nearest edge it hits, and
 * of that edge's endpoints and any reflex vertex hiding the endpoint from
 * `h`, the one at the smallest angle to the ray. -1 when the ray hits
 * nothing (a hole outside its outer loop).
 */
function findBridge(r: Ring, h: number, outer: number): number {
  const { x, y, next } = r;
  const hx = x[h];
  const hy = y[h];
  let qx = -Infinity;
  let m = -1;
  let p = outer;
  do {
    const q = next[p];
    // A CCW outer loop's left side runs downward, so those are the edges
    // a leftward ray can enter the hole's region through.
    if (hy <= y[p] && hy >= y[q] && y[q] !== y[p]) {
      const ix = x[p] + ((hy - y[p]) * (x[q] - x[p])) / (y[q] - y[p]);
      if (ix <= hx && ix > qx) {
        qx = ix;
        m = x[p] < x[q] ? p : q;
        if (ix === hx) return m; // the hole touches this edge
      }
    }
    p = q;
  } while (p !== outer);
  if (m < 0) return -1;
  const stop = m;
  const mx = x[m];
  const my = y[m];
  let tanMin = Infinity;
  p = m;
  do {
    if (
      hx >= x[p] &&
      x[p] >= mx &&
      hx !== x[p] &&
      inTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, x[p], y[p])
    ) {
      const tan = Math.abs(hy - y[p]) / (hx - x[p]);
      if (
        locallyInside(r, p, h) &&
        (tan < tanMin ||
          (tan === tanMin &&
            (x[p] > x[m] || (x[p] === x[m] && sectorContainsSector(r, m, p)))))
      ) {
        m = p;
        tanMin = tan;
      }
    }
    p = next[p];
  } while (p !== stop);
  return m;
}

/** Whether the sector at `m` holds the sector at `p` (two copies of one point). */
function sectorContainsSector(r: Ring, m: number, p: number): boolean {
  const { x, y, prev, next } = r;
  const mp = prev[m];
  const mn = next[m];
  const pp = prev[p];
  const pn = next[p];
  return (
    cross(x[mp], y[mp], x[m], y[m], x[pp], y[pp]) > 0 &&
    cross(x[pn], y[pn], x[m], y[m], x[mn], y[mn]) > 0
  );
}

/**
 * Splice hole node `b` into the loop at node `a`: a -> b ... (the hole)
 * ... b' -> a' -> (what followed a), where the primes are new nodes at the
 * same points — the doubled bridge edge. Returns b'. Given `a` and `b` on
 * ONE loop it does the converse: it splits that loop along the diagonal
 * a-b into a -> b -> ... and b' -> a' -> ....
 */
function splice(r: Ring, a: number, b: number): number {
  const an = r.next[a];
  const bp = r.prev[b];
  const a2 = r.size++;
  const b2 = r.size++;
  r.x[a2] = r.x[a];
  r.y[a2] = r.y[a];
  r.id[a2] = r.id[a];
  r.x[b2] = r.x[b];
  r.y[b2] = r.y[b];
  r.id[b2] = r.id[b];
  r.next[a] = b;
  r.prev[b] = a;
  r.next[a2] = an;
  r.prev[an] = a2;
  r.next[b2] = a2;
  r.prev[a2] = b2;
  r.next[bp] = b2;
  r.prev[b2] = bp;
  return b2;
}

/**
 * Whether the corner at `e` is an ear: no reflex (or flat) vertex of the
 * loop lies in or on its triangle. A node standing on the triangle's
 * FIRST corner (the one before `e`) is skipped — the bridge doubles
 * points, and the copy that starts the walk back out of a hole is not in
 * the way of the ear it closes. A copy of either other corner still
 * blocks: its sector may reach into the triangle with no vertex inside
 * it. (The same exception earcut makes.)
 */
function isEar(r: Ring, e: number): boolean {
  const { x, y, next } = r;
  const a = r.prev[e];
  const b = next[e];
  const ax = x[a];
  const ay = y[a];
  const ex = x[e];
  const ey = y[e];
  const bx = x[b];
  const by = y[b];
  const x0 = Math.min(ax, ex, bx);
  const x1 = Math.max(ax, ex, bx);
  const y0 = Math.min(ay, ey, by);
  const y1 = Math.max(ay, ey, by);
  let p = next[b];
  while (p !== a) {
    const px = x[p];
    const py = y[p];
    if (
      px >= x0 &&
      px <= x1 &&
      py >= y0 &&
      py <= y1 &&
      !(px === ax && py === ay) &&
      inTriangle(ax, ay, ex, ey, bx, by, px, py) &&
      r.corner(p) <= 0
    ) {
      return false;
    }
    p = next[p];
  }
  return true;
}

/**
 * Triangulate the polygon whose outer boundary is loop 0 and whose holes
 * are loops 1.., in `xy` (flat [x0, y0, x1, y1, ...]). `loops` holds each
 * loop's first vertex index, then the total vertex count as a sentinel:
 * `[0, 5, 9]` is an outer loop of vertices 0..4 and one hole of 5..8.
 * Every loop needs at least 3 vertices. Returns vertex-index triples, all
 * counter-clockwise in `xy`'s frame.
 */
export function earClip(xy: ArrayLike<number>, loops: readonly number[]): number[] {
  const nLoops = loops.length - 1;
  const total = loops[nLoops];
  const tris: number[] = [];
  if (nLoops < 1 || loops[1] - loops[0] < 3) return tris;
  // One node per vertex, two per bridge, and two per split — and every
  // split leaves each half at least one corner short of the whole, so
  // there are fewer splits than nodes.
  const ring = new Ring(3 * (total + 2 * (nLoops - 1)));
  let outer = linkLoop(ring, xy, loops[0], loops[1] - loops[0], true);

  // Holes, leftmost first. Each is linked clockwise — against the outer
  // loop — so the spliced walk keeps the solid on its left throughout.
  const holes: { node: number; x: number; order: number }[] = [];
  for (let k = 1; k < nLoops; k++) {
    const start = loops[k];
    const count = loops[k + 1] - start;
    if (count < 3 || loopArea2(xy, start, count) === 0) continue;
    const first = linkLoop(ring, xy, start, count, false);
    let left = first;
    let p = ring.next[first];
    while (p !== first) {
      if (
        ring.x[p] < ring.x[left] ||
        (ring.x[p] === ring.x[left] &&
          (ring.y[p] < ring.y[left] || (ring.y[p] === ring.y[left] && ring.id[p] < ring.id[left])))
      ) {
        left = p;
      }
      p = ring.next[p];
    }
    holes.push({ node: left, x: ring.x[left], order: k });
  }
  holes.sort((a, b) => a.x - b.x || a.order - b.order);
  for (const hole of holes) {
    const bridge = findBridge(ring, hole.node, outer);
    if (bridge < 0) continue; // outside the outer loop: nothing to cut from
    const back = splice(ring, bridge, hole.node);
    // A bridge can lay zero-width spikes along the boundary (a hole that
    // touches an edge bridges along it); they are cleared before the next
    // hole's bridge is searched for, or that search could pick one.
    filterPoints(ring, back);
    const kept = filterPoints(ring, bridge);
    if (kept < 0) return tris;
    outer = kept;
  }
  clipLoop(ring, outer, tris);
  return tris;
}

/**
 * Drop every node of the loop through `start` that bounds no area — a
 * repeated point, or a corner collinear with its neighbours (a straight
 * run, or a zero-width spike such as a bridge laid along an edge) — until
 * none is left. Returns a node still in the loop, or -1 when fewer than 3
 * remain.
 */
function filterPoints(r: Ring, start: number): number {
  let end = start;
  let p = start;
  let again: boolean;
  do {
    again = false;
    const q = r.next[p];
    if (q === p || r.next[q] === p) return -1;
    if (r.corner(p) === 0) {
      r.unlink(p);
      p = end = r.prev[p];
      again = true;
    } else {
      p = q;
    }
  } while (again || p !== end);
  return end;
}

function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** `q` lies within the bounding box of p-r (the three being collinear). */
function onSegment(px: number, py: number, qx: number, qy: number, rx: number, ry: number): boolean {
  return (
    qx <= Math.max(px, rx) && qx >= Math.min(px, rx) && qy <= Math.max(py, ry) && qy >= Math.min(py, ry)
  );
}

/** Segments p1-q1 and p2-q2 meet; touching counts. */
function intersects(r: Ring, p1: number, q1: number, p2: number, q2: number): boolean {
  const { x, y } = r;
  const o1 = sign(cross(x[p1], y[p1], x[q1], y[q1], x[p2], y[p2]));
  const o2 = sign(cross(x[p1], y[p1], x[q1], y[q1], x[q2], y[q2]));
  const o3 = sign(cross(x[p2], y[p2], x[q2], y[q2], x[p1], y[p1]));
  const o4 = sign(cross(x[p2], y[p2], x[q2], y[q2], x[q1], y[q1]));
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(x[p1], y[p1], x[p2], y[p2], x[q1], y[q1])) return true;
  if (o2 === 0 && onSegment(x[p1], y[p1], x[q2], y[q2], x[q1], y[q1])) return true;
  if (o3 === 0 && onSegment(x[p2], y[p2], x[p1], y[p1], x[q2], y[q2])) return true;
  if (o4 === 0 && onSegment(x[p2], y[p2], x[q1], y[q1], x[q2], y[q2])) return true;
  return false;
}

/** Diagonal a-b meets an edge of the loop that does not end at a or b. */
function intersectsLoop(r: Ring, a: number, b: number): boolean {
  const { id, next } = r;
  let p = a;
  do {
    const q = next[p];
    if (
      id[p] !== id[a] &&
      id[q] !== id[a] &&
      id[p] !== id[b] &&
      id[q] !== id[b] &&
      intersects(r, p, q, a, b)
    ) {
      return true;
    }
    p = q;
  } while (p !== a);
  return false;
}

/** The midpoint of diagonal a-b lies inside the loop. */
function middleInside(r: Ring, a: number, b: number): boolean {
  const { x, y, next } = r;
  const px = (x[a] + x[b]) / 2;
  const py = (y[a] + y[b]) / 2;
  let inside = false;
  let p = a;
  do {
    const q = next[p];
    if (y[p] > py !== y[q] > py && px < ((x[q] - x[p]) * (py - y[p])) / (y[q] - y[p]) + x[p]) {
      inside = !inside;
    }
    p = q;
  } while (p !== a);
  return inside;
}

/** Splitting along a-b leaves two loops that are each still simple. */
function isValidDiagonal(r: Ring, a: number, b: number): boolean {
  const { x, y, id, prev, next } = r;
  if (id[next[a]] === id[b] || id[prev[a]] === id[b] || intersectsLoop(r, a, b)) return false;
  if (locallyInside(r, a, b) && locallyInside(r, b, a) && middleInside(r, a, b)) {
    // ...and does not leave two sectors facing each other.
    const pa = prev[a];
    const pb = prev[b];
    return (
      cross(x[pa], y[pa], x[a], y[a], x[pb], y[pb]) !== 0 ||
      cross(x[a], y[a], x[pb], y[pb], x[b], y[b]) !== 0
    );
  }
  // Two copies of one point, both convex: a zero-length split.
  return x[a] === x[b] && y[a] === y[b] && r.corner(a) > 0 && r.corner(b) > 0;
}

/**
 * Clip the loop through `start` into `tris`. When a full lap finds no ear
 * — the loop is only weakly simple (a bridge's doubled points can hide
 * every ear behind a copy of one of its own corners) or not simple at all
 * — it is split along the first diagonal, in walk order, that keeps both
 * halves simple, and each half is clipped on its own (earcut's fallback).
 * Only when no such diagonal exists either is a convex corner clipped
 * regardless, which terminates and stays deterministic but is no longer
 * exact: the input was not a simple polygon.
 */
function clipLoop(r: Ring, start: number, tris: number[]): void {
  let ear = filterPoints(r, start);
  if (ear < 0) return;
  let left = 0;
  {
    let p = ear;
    do {
      left++;
      p = r.next[p];
    } while (p !== ear);
  }
  let stop = ear;
  let pass = 0; // 0: ears only; 1: no diagonal either, clip any convex corner
  while (left > 2) {
    const a = r.prev[ear];
    const b = r.next[ear];
    const c = r.corner(ear);
    if (c === 0) {
      // Collinear with its neighbours (or a repeated point): it bounds no
      // area, so it leaves the loop without a triangle.
      r.unlink(ear);
      left--;
      ear = b;
      stop = ear;
      continue;
    }
    if (c > 0 && (pass === 1 || isEar(r, ear))) {
      tris.push(r.id[a], r.id[ear], r.id[b]);
      r.unlink(ear);
      left--;
      // Stepping past the next corner spreads the clipping around the
      // loop, which leaves fewer slivers than clipping one spot bare.
      ear = r.next[b];
      stop = ear;
      pass = 0;
      continue;
    }
    ear = b;
    if (ear !== stop) continue;
    // No convex corner left: what remains has no positive area.
    if (pass === 1) return;
    let s = ear;
    do {
      let t = r.next[r.next[s]];
      while (t !== r.prev[s]) {
        if (r.id[s] !== r.id[t] && isValidDiagonal(r, s, t)) {
          const s2 = splice(r, s, t);
          clipLoop(r, s, tris);
          clipLoop(r, s2, tris);
          return;
        }
        t = r.next[t];
      }
      s = r.next[s];
    } while (s !== ear);
    pass = 1;
  }
}
