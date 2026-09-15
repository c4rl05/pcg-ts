// trees-on-hills — checks. Thresholds are measured, not designed: see CALIBRATION.md.
//
// Everything about the terrain is measured on its UPPER SURFACE seen from
// above (a triangle counts only where it is the highest one over its own
// centre), so a closed or solid terrain's underside and walls never dilute
// the steep share or the height range. Extent and holes are measured on the
// footprint's convex outline, so the terrain may be turned any way about Y
// and need not be a rectangle.

const STEEP_DEG = 30; // brief: ground steeper than 30 degrees grows nothing
const ANGLE_EPS = 1e-6; // "steeper than 30" is > 30; exactly 30 is still gentle
const WALL_DEG = 75; // brief: a triangle steeper than 75 degrees is a wall, left out of the ground measures

// terrain-hilly
const WIDTH_NARROW_MIN = 150; // brief: narrowest width across 150-250 m
const WIDTH_NARROW_MAX = 250;
const WIDTH_WIDE_MAX = 360; // brief: widest width across at most 360 m
const COVER_MIN = 0.95; // brief: at least 95% of the ground inside the convex outline lies under a triangle
const COVER_SAMPLES_ACROSS = 150; // coverage sample spacing = narrowest width / 150
const TRIANGLES_MIN = 2; // degenerate-input floor only: the brief states no resolution (see CALIBRATION.md)
const HEIGHT_RANGE_MIN = 10; // brief: at least 10 m from lowest to highest ground
const STEEP_FRACTION_MIN = 0.1; // brief: between a tenth and a half of the area is steeper than 30 degrees
const STEEP_FRACTION_MAX = 0.5;
// trees-on-surface
const ROOT_TOLERANCE = 0.25; // brief: base within 0.25 m of the ground under it
const ON_SURFACE_FRACTION_MIN = 1; // brief: EVERY tree (strict; 31-seed sweep in CALIBRATION.md)
// trees-on-gentle-ground
const GENTLE_FRACTION_MIN = 0.95; // brief: at least 95 in every 100 trees (a seam tree can read as steep)
// gentle-ground-planted
const CELL = 10; // brief: 10 m squares aligned with X and Z, edges on multiples of 10 m
const CELL_SAMPLES = 5; // brief: a 5 x 5 grid of evenly spaced points per square
const CELL_GENTLE_MIN = 19; // brief: a square is gentle ground when at least 19 of its 25 points are
const PLANTED_FRACTION_MIN = 2 / 3; // brief: at least two in three of those squares hold a tree

const IDS = ["terrain-hilly", "trees-on-surface", "trees-on-gentle-ground", "gentle-ground-planted"];

export default async function check({ collections, lib }) {
  const { Surface, trianglesOf, instancesOf, slopeDegFromNormal, result, round } = lib;
  const res = {};
  const failAll = (value, detail, ids = IDS) => {
    for (const id of ids) res[id] = result(false, value, detail);
    return res;
  };

  // --- read the outputs, never throwing ---------------------------------------
  let tris;
  try {
    tris = trianglesOf(collections.terrain);
  } catch (e) {
    return failAll(undefined, `the terrain output could not be read as a mesh: ${e instanceof Error ? e.message : String(e)}`);
  }
  let trees = null;
  let treesError = null;
  try {
    trees = instancesOf(collections.trees);
  } catch (e) {
    treesError = `the trees output could not be read as CPU instances: ${e instanceof Error ? e.message : String(e)}`;
  }

  const triCount = tris.length / 9;
  if (triCount === 0) {
    return failAll({ triangles: 0 }, "the terrain output holds no triangles or polygons, so there is no ground to measure");
  }
  const surface = new Surface(tris);
  const gentleAt = (s) => s !== null && s.slopeDeg <= STEEP_DEG + ANGLE_EPS;

  // --- terrain-hilly ----------------------------------------------------------
  // Ground: triangles that are the highest over their own centre and are not
  // walls (steeper than WALL_DEG).
  let topCount = 0;
  let wallCount = 0;
  let maxUpperSlope = 0;
  let topArea = 0;
  let steepArea = 0;
  let yMin = Infinity;
  let yMax = -Infinity;
  const groundVerts = [];
  for (let t = 0; t < triCount; t++) {
    const o = t * 9;
    const e1 = [tris[o + 3] - tris[o], tris[o + 4] - tris[o + 1], tris[o + 5] - tris[o + 2]];
    const e2 = [tris[o + 6] - tris[o], tris[o + 7] - tris[o + 1], tris[o + 8] - tris[o + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const projected = Math.abs(n[1]) / 2;
    if (projected < 1e-9) continue;
    const cx = (tris[o] + tris[o + 3] + tris[o + 6]) / 3;
    const cz = (tris[o + 2] + tris[o + 5] + tris[o + 8]) / 3;
    const s = surface.sample(cx, cz);
    if (s === null || s.triangle !== t) continue;
    const slope = slopeDegFromNormal(n);
    if (slope > maxUpperSlope) maxUpperSlope = slope;
    if (slope > WALL_DEG + ANGLE_EPS) {
      wallCount++;
      continue;
    }
    topCount++;
    topArea += projected;
    if (slope > STEEP_DEG + ANGLE_EPS) steepArea += projected;
    for (let k = 0; k < 9; k++) groundVerts.push(tris[o + k]);
    for (const k of [1, 4, 7]) {
      yMin = Math.min(yMin, tris[o + k]);
      yMax = Math.max(yMax, tris[o + k]);
    }
  }
  const steepFraction = topArea > 0 ? steepArea / topArea : NaN;
  const heightRange = topCount > 0 ? yMax - yMin : NaN;

  // Footprint outline: convex hull, in XZ, of the ground triangles' vertices.
  const hull = convexHullXZ(groundVerts);
  const { narrow, wide } = hullWidths(hull);

  // Holes: evenly spaced ground points inside the outline that no triangle covers.
  let inside = 0;
  let covered = 0;
  if (hull.length >= 3 && narrow > 0) {
    const stepLen = narrow / COVER_SAMPLES_ACROSS;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of hull) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    for (let x = minX + stepLen / 2; x < maxX; x += stepLen) {
      for (let z = minZ + stepLen / 2; z < maxZ; z += stepLen) {
        if (!insideConvex(hull, x, z)) continue;
        inside++;
        if (surface.sample(x, z) !== null) covered++;
      }
    }
  }
  const cover = inside > 0 ? covered / inside : 0;

  {
    const reasons = [];
    if (triCount < TRIANGLES_MIN) reasons.push(`${triCount} triangle(s) (needs ${TRIANGLES_MIN})`);
    if (!(narrow >= WIDTH_NARROW_MIN && narrow <= WIDTH_NARROW_MAX)) {
      reasons.push(`narrowest width across ${round(narrow, 1)} m (must be ${WIDTH_NARROW_MIN}-${WIDTH_NARROW_MAX} m)`);
    }
    if (!(wide <= WIDTH_WIDE_MAX)) reasons.push(`widest width across ${round(wide, 1)} m (must be at most ${WIDTH_WIDE_MAX} m)`);
    if (!(cover >= COVER_MIN)) {
      reasons.push(`triangles cover ${round(cover * 100, 1)}% of the ground inside the terrain's convex outline (needs ${COVER_MIN * 100}%)`);
    }
    if (!(heightRange >= HEIGHT_RANGE_MIN)) {
      reasons.push(`the upper surface spans ${round(heightRange, 2)} m in height (needs ${HEIGHT_RANGE_MIN} m)`);
    }
    if (!(steepFraction >= STEEP_FRACTION_MIN && steepFraction <= STEEP_FRACTION_MAX)) {
      reasons.push(
        `${round(steepFraction * 100, 1)}% of the upper surface's area seen from above is steeper than ${STEEP_DEG} degrees (needs ${STEEP_FRACTION_MIN * 100}-${STEEP_FRACTION_MAX * 100}%)`,
      );
    }
    res["terrain-hilly"] = result(
      reasons.length === 0,
      {
        triangles: triCount,
        groundTriangles: topCount,
        wallTriangles: wallCount,
        maxUpperSlopeDeg: round(maxUpperSlope, 3),
        narrowWidth: round(narrow, 2),
        wideWidth: round(wide, 2),
        cover: round(cover, 4),
        heightRange: round(heightRange, 3),
        steepFraction: round(steepFraction, 4),
      },
      reasons.length === 0 ? "hilly" : `the terrain is not the hills the brief asks for: ${reasons.join("; ")}`,
    );
  }

  if (trees === null) return failAll(undefined, treesError, IDS.slice(1));

  // --- per-tree ground --------------------------------------------------------
  let over = 0;
  let rooted = 0;
  let gentle = 0;
  let maxGap = 0;
  const gaps = [];
  for (let i = 0; i < trees.count; i++) {
    const x = trees.positions[i * 3];
    const y = trees.positions[i * 3 + 1];
    const z = trees.positions[i * 3 + 2];
    const s = surface.sample(x, z);
    if (s === null) continue;
    over++;
    const gap = Math.abs(y - s.y);
    gaps.push(gap);
    if (gap > maxGap) maxGap = gap;
    if (gap <= ROOT_TOLERANCE) rooted++;
    if (gentleAt(s)) gentle++;
  }

  // --- trees-on-surface -------------------------------------------------------
  {
    const fraction = trees.count > 0 ? rooted / trees.count : 0;
    const median = gaps.length > 0 ? lib.median(gaps) : NaN;
    res["trees-on-surface"] = result(
      trees.count > 0 && fraction >= ON_SURFACE_FRACTION_MIN,
      {
        count: trees.count,
        overTerrain: over,
        rootedFraction: round(fraction, 4),
        medianGap: round(median, 4),
        maxGap: round(maxGap, 4),
      },
      trees.count === 0
        ? "no trees"
        : `${round(fraction * 100, 2)}% of the trees stand over the terrain with their base within ${ROOT_TOLERANCE} m of the ground under them; needs ${ON_SURFACE_FRACTION_MIN * 100}% (median gap ${round(median, 3)} m, ${trees.count - over} off the terrain)`,
    );
  }

  // --- trees-on-gentle-ground -------------------------------------------------
  {
    const fraction = trees.count > 0 ? gentle / trees.count : 0;
    res["trees-on-gentle-ground"] = result(
      trees.count > 0 && fraction >= GENTLE_FRACTION_MIN,
      { count: trees.count, gentleFraction: round(fraction, 4) },
      trees.count === 0
        ? "no trees"
        : `${round(fraction * 100, 2)}% of the trees stand over terrain no steeper than ${STEEP_DEG} degrees; needs ${GENTLE_FRACTION_MIN * 100}%`,
    );
  }

  // --- gentle-ground-planted --------------------------------------------------
  {
    const gx0 = Math.floor(surface.min[0] / CELL);
    const gx1 = Math.floor(surface.max[0] / CELL);
    const gz0 = Math.floor(surface.min[2] / CELL);
    const gz1 = Math.floor(surface.max[2] / CELL);
    const held = new Set();
    for (let i = 0; i < trees.count; i++) {
      held.add(`${Math.floor(trees.positions[i * 3] / CELL)},${Math.floor(trees.positions[i * 3 + 2] / CELL)}`);
    }
    let gentleCells = 0;
    let planted = 0;
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        let ok = 0;
        for (let a = 0; a < CELL_SAMPLES; a++) {
          for (let b = 0; b < CELL_SAMPLES; b++) {
            const s = surface.sample((gx + (a + 0.5) / CELL_SAMPLES) * CELL, (gz + (b + 0.5) / CELL_SAMPLES) * CELL);
            if (gentleAt(s)) ok++;
          }
        }
        if (ok >= CELL_GENTLE_MIN) {
          gentleCells++;
          if (held.has(`${gx},${gz}`)) planted++;
        }
      }
    }
    const fraction = gentleCells > 0 ? planted / gentleCells : 0;
    res["gentle-ground-planted"] = result(
      gentleCells > 0 && fraction >= PLANTED_FRACTION_MIN,
      { gentleSquares: gentleCells, plantedSquares: planted, plantedFraction: round(fraction, 4), trees: trees.count },
      gentleCells === 0
        ? `no ${CELL} m square of the terrain has ${CELL_GENTLE_MIN} of its ${CELL_SAMPLES * CELL_SAMPLES} points on gentle ground`
        : `${planted} of ${gentleCells} gentle ${CELL} m squares hold a tree (${round(fraction * 100, 1)}%); needs two in three (${round(PLANTED_FRACTION_MIN * 100, 1)}%)`,
    );
  }

  return res;
}

// --- local helpers (not in ctx.lib) ---------------------------------------------

/** Convex hull of every vertex's (x, z), counter-clockwise, collinear points dropped. */
function convexHullXZ(tris) {
  const pts = [];
  const seen = new Set();
  for (let o = 0; o + 2 < tris.length; o += 3) {
    const x = tris[o];
    const z = tris[o + 2];
    const key = `${x},${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pts.push([x, z]);
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Narrowest and widest width of a convex polygon, over every direction in the plane. */
function hullWidths(hull) {
  const h = hull.length;
  if (h < 3) return { narrow: 0, wide: 0 };
  let narrow = Infinity;
  for (let i = 0; i < h; i++) {
    const [ax, az] = hull[i];
    const [bx, bz] = hull[(i + 1) % h];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-12) continue;
    let far = 0;
    for (const [px, pz] of hull) far = Math.max(far, Math.abs((bx - ax) * (pz - az) - (bz - az) * (px - ax)) / len);
    narrow = Math.min(narrow, far);
  }
  let wide = 0;
  for (let i = 0; i < h; i++) {
    for (let j = i + 1; j < h; j++) wide = Math.max(wide, Math.hypot(hull[i][0] - hull[j][0], hull[i][1] - hull[j][1]));
  }
  return { narrow, wide };
}

/** Is (x, z) inside (or on) a counter-clockwise convex polygon? */
function insideConvex(hull, x, z) {
  const h = hull.length;
  for (let i = 0; i < h; i++) {
    const [ax, az] = hull[i];
    const [bx, bz] = hull[(i + 1) % h];
    if ((bx - ax) * (z - az) - (bz - az) * (x - ax) < 0) return false;
  }
  return true;
}
