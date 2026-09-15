// Plain geometry for task checks. No dependency on the package under test:
// everything takes flat Float64Array/number inputs, so the same measurement
// applies to every arm and can be unit-tested without cooking anything.
//
// "Planar" means measured in the XZ ground plane (Y is up), which is what
// a world-terms brief means by "4 m from the road" whatever the terrain
// does. Pass `{ planar: false }` for full 3D where a helper supports it.

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// statistics
// ---------------------------------------------------------------------------

export function mean(values) {
  let s = 0;
  let n = 0;
  for (const v of values) {
    s += v;
    n++;
  }
  return n === 0 ? NaN : s / n;
}

export function stddev(values) {
  const m = mean(values);
  let s = 0;
  let n = 0;
  for (const v of values) {
    s += (v - m) * (v - m);
    n++;
  }
  return n === 0 ? NaN : Math.sqrt(s / n);
}

/** Linear-interpolated quantile, q in [0, 1]. */
export function quantile(values, q) {
  const s = Float64Array.from(values).sort();
  if (s.length === 0) return NaN;
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function median(values) {
  return quantile(values, 0.5);
}

/** Axis-aligned bounds of a flat xyz array: `{ min: [x,y,z], max: [x,y,z] }`. */
export function bounds(xyz) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i + 2 < xyz.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = xyz[i + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }
  return { min, max };
}

export function angleBetweenDeg(a, b) {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (la < EPS || lb < EPS) return NaN;
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// polylines
// ---------------------------------------------------------------------------

/** Total length of one polyline given as flat xyz. */
export function polylineLength(xyz, { planar = true } = {}) {
  let len = 0;
  for (let i = 3; i + 2 < xyz.length; i += 3) {
    const dx = xyz[i] - xyz[i - 3];
    const dy = planar ? 0 : xyz[i + 1] - xyz[i - 2];
    const dz = xyz[i + 2] - xyz[i - 1];
    len += Math.hypot(dx, dy, dz);
  }
  return len;
}

/**
 * Index over one or more polylines for distance queries. `lines` is an
 * array of flat xyz Float64Arrays (or `{ xyz }` objects, as
 * `items.polylinesOf` returns). Queries are exact: every segment is tested.
 */
export class PolylineIndex {
  constructor(lines, { planar = true } = {}) {
    this.planar = planar;
    const segs = [];
    let arcBase = 0;
    lines.forEach((line, lineIndex) => {
      const xyz = line.xyz ?? line;
      let arc = 0;
      for (let i = 3; i + 2 < xyz.length; i += 3) {
        const ax = xyz[i - 3];
        const ay = planar ? 0 : xyz[i - 2];
        const az = xyz[i - 1];
        const bx = xyz[i];
        const by = planar ? 0 : xyz[i + 1];
        const bz = xyz[i + 2];
        const len = Math.hypot(bx - ax, by - ay, bz - az);
        segs.push({ ax, ay, az, bx, by, bz, len, arc, lineIndex, globalArc: arcBase + arc });
        arc += len;
      }
      arcBase += arc;
    });
    this.segments = segs;
    this.totalLength = arcBase;
  }

  /**
   * Nearest point on any polyline to (x, y, z). Returns
   * `{ distance, point, tangent, arc, lineIndex, side }` where `arc` is the
   * arc length along that line to the closest point and `side` is the sign
   * of (tangent x offset).y — +1 on one side of the line, -1 on the other,
   * 0 on it. `null` when the index holds no segment.
   */
  nearest(x, y, z) {
    const qy = this.planar ? 0 : y;
    let best = null;
    let bestD2 = Infinity;
    for (const s of this.segments) {
      const ex = s.bx - s.ax;
      const ey = s.by - s.ay;
      const ez = s.bz - s.az;
      const l2 = ex * ex + ey * ey + ez * ez;
      let t = l2 > EPS ? ((x - s.ax) * ex + (qy - s.ay) * ey + (z - s.az) * ez) / l2 : 0;
      t = Math.min(1, Math.max(0, t));
      const px = s.ax + ex * t;
      const py = s.ay + ey * t;
      const pz = s.az + ez * t;
      const d2 = (x - px) * (x - px) + (qy - py) * (qy - py) + (z - pz) * (z - pz);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { s, t, px, py, pz };
      }
    }
    if (best === null) return null;
    const { s, t, px, py, pz } = best;
    const len = s.len > EPS ? s.len : 1;
    const tangent = [(s.bx - s.ax) / len, (s.by - s.ay) / len, (s.bz - s.az) / len];
    const ox = x - px;
    const oz = z - pz;
    const crossY = tangent[2] * ox - tangent[0] * oz;
    return {
      distance: Math.sqrt(bestD2),
      point: [px, py, pz],
      tangent,
      arc: s.arc + t * s.len,
      globalArc: s.globalArc + t * s.len,
      lineIndex: s.lineIndex,
      side: Math.abs(crossY) < EPS ? 0 : Math.sign(crossY),
    };
  }

  distance(x, y, z) {
    const n = this.nearest(x, y, z);
    return n === null ? Infinity : n.distance;
  }
}

// ---------------------------------------------------------------------------
// point sets
// ---------------------------------------------------------------------------

function hashGrid(xyz, cell, planar) {
  const map = new Map();
  const n = xyz.length / 3;
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(xyz[i * 3] / cell);
    const gy = planar ? 0 : Math.floor(xyz[i * 3 + 1] / cell);
    const gz = Math.floor(xyz[i * 3 + 2] / cell);
    const key = `${gx},${gy},${gz}`;
    let list = map.get(key);
    if (list === undefined) map.set(key, (list = []));
    list.push(i);
  }
  return map;
}

/**
 * Distance from every point to its nearest OTHER point. Exact: a grid
 * narrows the search, and the ring grows until no unvisited cell can hold
 * something nearer. Coincident points report 0.
 */
export function nearestNeighbourDistances(xyz, { planar = true } = {}) {
  const n = xyz.length / 3;
  const out = new Float64Array(n).fill(Infinity);
  if (n < 2) return out;
  const b = bounds(xyz);
  const spanX = b.max[0] - b.min[0];
  const spanZ = b.max[2] - b.min[2];
  const spanY = planar ? 0 : b.max[1] - b.min[1];
  const dims = [spanX, spanY, spanZ].filter((s) => s > EPS);
  const volume = dims.reduce((a, s) => a * s, 1);
  const cell = Math.max(dims.length === 0 ? 1 : Math.pow(volume / n, 1 / Math.max(1, dims.length)), 1e-6);
  const grid = hashGrid(xyz, cell, planar);
  const maxRing = Math.ceil(Math.max(spanX, spanY, spanZ, cell) / cell) + 1;
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3];
    const y = planar ? 0 : xyz[i * 3 + 1];
    const z = xyz[i * 3 + 2];
    const gx = Math.floor(x / cell);
    const gy = planar ? 0 : Math.floor(y / cell);
    const gz = Math.floor(z / cell);
    let best = Infinity;
    for (let r = 0; r <= maxRing; r++) {
      // Every point in ring r is at least (r - 1) * cell away.
      if (r > 0 && (r - 1) * cell > Math.sqrt(best)) break;
      const yr = planar ? 0 : r;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -yr; dy <= yr; dy++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
            const list = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
            if (list === undefined) continue;
            for (const j of list) {
              if (j === i) continue;
              const ex = xyz[j * 3] - x;
              const ey = planar ? 0 : xyz[j * 3 + 1] - y;
              const ez = xyz[j * 3 + 2] - z;
              const d2 = ex * ex + ey * ey + ez * ez;
              if (d2 < best) best = d2;
            }
          }
        }
      }
    }
    out[i] = Math.sqrt(best);
  }
  return out;
}

/** The smallest distance between any two points (Infinity for fewer than two). */
export function minPairDistance(xyz, opts) {
  let m = Infinity;
  for (const d of nearestNeighbourDistances(xyz, opts)) if (d < m) m = d;
  return m;
}

/**
 * For each query point, the index of a target point within `tolerance`
 * (the nearest such), or -1. Planar by default.
 */
export function matchPoints(queryXyz, targetXyz, tolerance, { planar = true } = {}) {
  const cell = Math.max(tolerance, 1e-6);
  const grid = hashGrid(targetXyz, cell, planar);
  const nq = queryXyz.length / 3;
  const out = new Int32Array(nq).fill(-1);
  for (let i = 0; i < nq; i++) {
    const x = queryXyz[i * 3];
    const y = planar ? 0 : queryXyz[i * 3 + 1];
    const z = queryXyz[i * 3 + 2];
    const gx = Math.floor(x / cell);
    const gy = planar ? 0 : Math.floor(y / cell);
    const gz = Math.floor(z / cell);
    let best = tolerance * tolerance;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = planar ? 0 : -1; dy <= (planar ? 0 : 1); dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
          if (list === undefined) continue;
          for (const j of list) {
            const ex = targetXyz[j * 3] - x;
            const ey = planar ? 0 : targetXyz[j * 3 + 1] - y;
            const ez = targetXyz[j * 3 + 2] - z;
            const d2 = ex * ex + ey * ey + ez * ez;
            if (d2 <= best) {
              best = d2;
              out[i] = j;
            }
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// segments and graphs (planar, XZ)
// ---------------------------------------------------------------------------

function orient(ax, az, bx, bz, cx, cz) {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

function onSegment(ax, az, bx, bz, px, pz, eps) {
  return (
    Math.min(ax, bx) - eps <= px &&
    px <= Math.max(ax, bx) + eps &&
    Math.min(az, bz) - eps <= pz &&
    pz <= Math.max(az, bz) + eps
  );
}

/**
 * Do segments AB and CD intersect anywhere other than at an endpoint they
 * SHARE? Coordinates are XZ pairs `[x, z]`. Two segments meeting at a
 * common endpoint do not cross; a T-junction (an endpoint on the other's
 * interior), a proper crossing and a collinear overlap all do.
 * `eps` is the distance under which two endpoints count as shared.
 */
export function segmentsCross(a, b, c, d, eps = 1e-6) {
  const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= eps;
  const shared = [
    [a, c],
    [a, d],
    [b, c],
    [b, d],
  ].filter(([p, q]) => same(p, q)).length;
  if (shared >= 2) return true; // the same segment twice overlaps itself
  const lenAB = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const lenCD = Math.hypot(d[0] - c[0], d[1] - c[1]);
  const tol = eps * Math.max(1, lenAB, lenCD);
  const o1 = orient(a[0], a[1], b[0], b[1], c[0], c[1]);
  const o2 = orient(a[0], a[1], b[0], b[1], d[0], d[1]);
  const o3 = orient(c[0], c[1], d[0], d[1], a[0], a[1]);
  const o4 = orient(c[0], c[1], d[0], d[1], b[0], b[1]);
  const s = (v) => (Math.abs(v) <= tol ? 0 : Math.sign(v));
  const s1 = s(o1);
  const s2 = s(o2);
  const s3 = s(o3);
  const s4 = s(o4);
  if (shared === 1) {
    // Touching at the shared endpoint is fine; only a collinear overlap
    // running along both segments from that endpoint is a crossing.
    if (s1 === 0 && s2 === 0) {
      const [p, q1, q2] = same(a, c)
        ? [a, b, d]
        : same(a, d)
          ? [a, b, c]
          : same(b, c)
            ? [b, a, d]
            : [b, a, c];
      const dot = (q1[0] - p[0]) * (q2[0] - p[0]) + (q1[1] - p[1]) * (q2[1] - p[1]);
      return dot > 0;
    }
    return false;
  }
  if (s1 * s2 < 0 && s3 * s4 < 0) return true;
  // An endpoint lying on the other segment: a T-junction, or (all four
  // zero) a collinear overlap, which one of these four also catches.
  if (s1 === 0 && onSegment(a[0], a[1], b[0], b[1], c[0], c[1], eps)) return true;
  if (s2 === 0 && onSegment(a[0], a[1], b[0], b[1], d[0], d[1], eps)) return true;
  if (s3 === 0 && onSegment(c[0], c[1], d[0], d[1], a[0], a[1], eps)) return true;
  if (s4 === 0 && onSegment(c[0], c[1], d[0], d[1], b[0], b[1], eps)) return true;
  return false;
}

/**
 * All crossing pairs among `segments` (each `[[ax, az], [bx, bz]]`).
 * Returns `{ count, pairs }` with at most `maxPairs` pairs listed.
 */
export function findCrossings(segments, { eps = 1e-6, maxPairs = 10 } = {}) {
  const boxes = segments.map(([p, q]) => [
    Math.min(p[0], q[0]) - eps,
    Math.max(p[0], q[0]) + eps,
    Math.min(p[1], q[1]) - eps,
    Math.max(p[1], q[1]) + eps,
  ]);
  const order = segments.map((_, i) => i).sort((i, j) => boxes[i][0] - boxes[j][0]);
  let count = 0;
  const pairs = [];
  for (let oi = 0; oi < order.length; oi++) {
    const i = order[oi];
    for (let oj = oi + 1; oj < order.length; oj++) {
      const j = order[oj];
      if (boxes[j][0] > boxes[i][1]) break;
      if (boxes[j][2] > boxes[i][3] || boxes[j][3] < boxes[i][2]) continue;
      if (segmentsCross(segments[i][0], segments[i][1], segments[j][0], segments[j][1], eps)) {
        count++;
        if (pairs.length < maxPairs) pairs.push([Math.min(i, j), Math.max(i, j)]);
      }
    }
  }
  return { count, pairs };
}

/** Union-find components over `n` nodes and `[a, b]` edges. */
export function connectedComponents(n, edges) {
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const degree = new Int32Array(n);
  for (const [a, b] of edges) {
    if (a < 0 || b < 0 || a >= n || b >= n) continue;
    if (a !== b) {
      degree[a]++;
      degree[b]++;
    }
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  const componentOf = new Int32Array(n);
  const ids = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!ids.has(r)) ids.set(r, ids.size);
    componentOf[i] = ids.get(r);
  }
  const sizes = new Array(ids.size).fill(0);
  for (let i = 0; i < n; i++) sizes[componentOf[i]]++;
  return { count: ids.size, componentOf, sizes, degree };
}

// ---------------------------------------------------------------------------
// surfaces
// ---------------------------------------------------------------------------

/** Slope in degrees of a surface with (not necessarily unit) normal n: 0 = level. */
export function slopeDegFromNormal(n) {
  const l = Math.hypot(n[0], n[1], n[2]);
  if (l < EPS) return NaN;
  return (Math.acos(Math.min(1, Math.abs(n[1]) / l)) * 180) / Math.PI;
}

/**
 * A heightfield query over a triangle soup (9 floats per triangle): for a
 * ground position (x, z), the highest triangle whose XZ projection holds
 * it. Vertical triangles (zero projected area) are ignored.
 */
export class Surface {
  constructor(tris) {
    this.tris = tris;
    const n = tris.length / 9;
    const b = bounds(tris);
    this.min = b.min;
    this.max = b.max;
    const area = Math.max((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]), EPS);
    this.cell = Math.max(Math.sqrt(area / Math.max(1, n)) * 2, 1e-6);
    this.grid = new Map();
    this.projectedArea = 0;
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const xs = [tris[o], tris[o + 3], tris[o + 6]];
      const zs = [tris[o + 2], tris[o + 5], tris[o + 8]];
      const a2 = (xs[1] - xs[0]) * (zs[2] - zs[0]) - (xs[2] - xs[0]) * (zs[1] - zs[0]);
      if (Math.abs(a2) < EPS) continue;
      this.projectedArea += Math.abs(a2) / 2;
      const x0 = Math.floor(Math.min(...xs) / this.cell);
      const x1 = Math.floor(Math.max(...xs) / this.cell);
      const z0 = Math.floor(Math.min(...zs) / this.cell);
      const z1 = Math.floor(Math.max(...zs) / this.cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const key = `${gx},${gz}`;
          let list = this.grid.get(key);
          if (list === undefined) this.grid.set(key, (list = []));
          list.push(t);
        }
      }
    }
  }

  /** `{ y, normal, slopeDeg, triangle }` at (x, z), or null off the surface. */
  sample(x, z) {
    const list = this.grid.get(`${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`);
    if (list === undefined) return null;
    const tris = this.tris;
    let best = null;
    for (const t of list) {
      const o = t * 9;
      const ax = tris[o];
      const ay = tris[o + 1];
      const az = tris[o + 2];
      const bx = tris[o + 3];
      const by = tris[o + 4];
      const bz = tris[o + 5];
      const cx = tris[o + 6];
      const cy = tris[o + 7];
      const cz = tris[o + 8];
      const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(det) < EPS) continue;
      const u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / det;
      const v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / det;
      const tol = 1e-7;
      if (u < -tol || v < -tol || u + v > 1 + tol) continue;
      const y = ay + u * (by - ay) + v * (cy - ay);
      if (best === null || y > best.y) {
        const e1 = [bx - ax, by - ay, bz - az];
        const e2 = [cx - ax, cy - ay, cz - az];
        let nx = e1[1] * e2[2] - e1[2] * e2[1];
        let ny = e1[2] * e2[0] - e1[0] * e2[2];
        let nz = e1[0] * e2[1] - e1[1] * e2[0];
        const l = Math.hypot(nx, ny, nz);
        if (ny < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const normal = [nx / l, ny / l, nz / l];
        best = { y, normal, slopeDeg: slopeDegFromNormal(normal), triangle: t };
      }
    }
    return best;
  }

  /**
   * Fraction of the surface's projected (ground-plane) area whose slope
   * exceeds `thresholdDeg`, and the height range.
   */
  slopeStats(thresholdDeg) {
    const tris = this.tris;
    let steep = 0;
    let total = 0;
    for (let o = 0; o + 8 < tris.length; o += 9) {
      const e1 = [tris[o + 3] - tris[o], tris[o + 4] - tris[o + 1], tris[o + 5] - tris[o + 2]];
      const e2 = [tris[o + 6] - tris[o], tris[o + 7] - tris[o + 1], tris[o + 8] - tris[o + 2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const projected = Math.abs(n[1]) / 2;
      if (projected < EPS) continue;
      total += projected;
      if (slopeDegFromNormal(n) > thresholdDeg) steep += projected;
    }
    return {
      steepFraction: total > 0 ? steep / total : NaN,
      projectedArea: total,
      heightRange: this.max[1] - this.min[1],
    };
  }
}

// ---------------------------------------------------------------------------
// sight lines
// ---------------------------------------------------------------------------

/**
 * Horizontal sight lines from `eye` ([x, y, z]) in `rays` evenly spaced
 * directions. Each blocker is a vertical cylinder `{ x, z, radius, yMin,
 * yMax }`; a ray is blocked when it meets a cylinder whose height span
 * holds the eye's height within `maxDistance`. Returns
 * `{ fraction, blocked, rays, hitDistances }` (Infinity for a clear ray).
 */
export function horizontalOcclusion(eye, cylinders, { maxDistance, rays = 360 } = {}) {
  const [ex, ey, ez] = eye;
  const relevant = cylinders.filter(
    (c) => c.yMin <= ey && ey <= c.yMax && Math.hypot(c.x - ex, c.z - ez) - c.radius <= maxDistance,
  );
  const hitDistances = new Float64Array(rays).fill(Infinity);
  let blocked = 0;
  for (let r = 0; r < rays; r++) {
    const th = (2 * Math.PI * r) / rays;
    const dx = Math.cos(th);
    const dz = Math.sin(th);
    let best = Infinity;
    for (const c of relevant) {
      const ox = ex - c.x;
      const oz = ez - c.z;
      const b = ox * dx + oz * dz;
      const cc = ox * ox + oz * oz - c.radius * c.radius;
      if (cc <= 0) {
        best = 0;
        break;
      }
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t >= 0 && t < best) best = t;
    }
    hitDistances[r] = best;
    if (best <= maxDistance) blocked++;
  }
  return { fraction: blocked / rays, blocked, rays, hitDistances };
}
