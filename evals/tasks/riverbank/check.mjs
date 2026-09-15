// riverbank — checks. Thresholds are measured, not designed: see CALIBRATION.md.

const WATER_HALF_WIDTH = 2.0; // stated in the brief's contract: the water is 4 m wide
const BANDS = 4; // equal-AREA distance bands over the planted region
const GRID = 240; // cells per side of the area estimate

// tree-density-rises
const DENSITY_FAR_OVER_NEAR_MIN = 1.25;
const DENSITY_STEP_MIN = 0.85; // no band may fall below 85% of the one nearer the water
// tree-scale-rises
const SCALE_FAR_OVER_NEAR_MIN = 1.3;
const SCALE_STEP_MIN = 0.95;
// driftwood-on-bank
const BANK_MIN = 1.0;
const BANK_MAX = 8.0;
const BANK_FRACTION_MIN = 0.9;
const DRIFTWOOD_MIN = 10;
// driftwood-follows-course
const COURSE_BINS = 10;
const COURSE_BINS_MIN = 8;
const COURSE_REACH = 25.0;
// river-runs-through
const RIVER_SPAN_MIN = 0.8;

export default async function check({ outputs, collections, lib }) {
  const { PolylineIndex, polylinesOf, instancesOf, instanceFrame, pointsOf, bounds, quantile, result, round } = lib;
  const res = {};

  const lines = polylinesOf(collections.river).filter((l) => l.vertexCount >= 2);
  const trees = instancesOf(collections.trees);
  const drift = instancesOf(collections.driftwood);
  const groundB = bounds(pointsOf(collections.ground));

  if (lines.length === 0) {
    const none = result(false, undefined, "the river output holds no polyline, so nothing can be measured from it");
    return {
      "river-runs-through": none,
      "tree-density-rises": none,
      "tree-scale-rises": none,
      "tree-clearance": none,
      "driftwood-on-bank": none,
      "driftwood-follows-course": none,
    };
  }
  const river = new PolylineIndex(lines);

  // --- river-runs-through: the line crosses most of the ground ----------
  {
    const spanX = groundB.max[0] - groundB.min[0];
    const spanZ = groundB.max[2] - groundB.min[2];
    let loX = Infinity;
    let hiX = -Infinity;
    let loZ = Infinity;
    let hiZ = -Infinity;
    // Walk each segment finely and keep the part inside the ground's bounds.
    for (const s of river.segments) {
      const steps = Math.max(1, Math.ceil(s.len / 0.5));
      for (let k = 0; k <= steps; k++) {
        const x = s.ax + ((s.bx - s.ax) * k) / steps;
        const z = s.az + ((s.bz - s.az) * k) / steps;
        if (x < groundB.min[0] || x > groundB.max[0] || z < groundB.min[2] || z > groundB.max[2]) continue;
        loX = Math.min(loX, x);
        hiX = Math.max(hiX, x);
        loZ = Math.min(loZ, z);
        hiZ = Math.max(hiZ, z);
      }
    }
    const fx = spanX > 0 && hiX >= loX ? (hiX - loX) / spanX : 0;
    const fz = spanZ > 0 && hiZ >= loZ ? (hiZ - loZ) / spanZ : 0;
    const span = Math.max(fx, fz);
    res["river-runs-through"] = result(
      span >= RIVER_SPAN_MIN,
      round(span, 3),
      `the river crosses ${round(span * 100, 1)}% of the ground's extent; needs ${RIVER_SPAN_MIN * 100}%`,
    );
  }

  // --- distance of every tree, and the planted region ---------------------
  const treeDist = new Float64Array(trees.count);
  const treeScale = new Float64Array(trees.count);
  for (let i = 0; i < trees.count; i++) {
    treeDist[i] = river.distance(trees.positions[i * 3], 0, trees.positions[i * 3 + 2]);
    const f = instanceFrame(trees.transforms, i);
    treeScale[i] = (f.scale[0] + f.scale[1] + f.scale[2]) / 3;
  }

  // --- tree-clearance ------------------------------------------------------
  {
    let min = Infinity;
    for (const d of treeDist) min = Math.min(min, d);
    res["tree-clearance"] = result(
      trees.count > 0 && min >= WATER_HALF_WIDTH,
      round(min, 3),
      trees.count === 0
        ? "no trees"
        : `the nearest tree stands ${round(min, 3)} m from the river line; the water reaches ${WATER_HALF_WIDTH} m`,
    );
  }

  // --- equal-area bands over the planted region ----------------------------
  // The region is the ground's footprint clipped to where trees were
  // planted at all, so a margin of bare ground at the edge does not read as
  // "thinning" in the far band; and it starts at the nearest tree's
  // distance, so a hard bare strip along the water (which tree-clearance
  // judges) does not read as thinning in the near band either. Without that
  // cut, uniform trees behind a 4.5 m strip measured far/near 1.37-1.47,
  // above any threshold the reference leaves room for — see CALIBRATION.md.
  let bandEdges = null;
  let bandArea = null;
  let minTreeDist = Infinity;
  for (const d of treeDist) minTreeDist = Math.min(minTreeDist, d);
  if (trees.count >= 20) {
    const tb = bounds(trees.positions);
    const x0 = Math.max(groundB.min[0], tb.min[0]);
    const x1 = Math.min(groundB.max[0], tb.max[0]);
    const z0 = Math.max(groundB.min[2], tb.min[2]);
    const z1 = Math.min(groundB.max[2], tb.max[2]);
    if (x1 > x0 && z1 > z0) {
      const cellArea = ((x1 - x0) / GRID) * ((z1 - z0) / GRID);
      const all = [];
      for (let gx = 0; gx < GRID; gx++) {
        for (let gz = 0; gz < GRID; gz++) {
          const x = x0 + ((gx + 0.5) * (x1 - x0)) / GRID;
          const z = z0 + ((gz + 0.5) * (z1 - z0)) / GRID;
          const d = river.distance(x, 0, z);
          if (d >= minTreeDist) all.push(d);
        }
      }
      const cellDist = Float64Array.from(all);
      bandEdges = [-Infinity];
      for (let b = 1; b < BANDS; b++) bandEdges.push(quantile(cellDist, b / BANDS));
      bandEdges.push(Infinity);
      bandArea = new Float64Array(BANDS);
      for (const d of cellDist) bandArea[bandOf(d, bandEdges)] += cellArea;
    }
  }

  if (bandEdges === null) {
    const r = result(false, undefined, `too few trees to measure (${trees.count})`);
    res["tree-density-rises"] = r;
    res["tree-scale-rises"] = r;
  } else {
    const counts = new Float64Array(BANDS);
    const scaleSum = new Float64Array(BANDS);
    for (let i = 0; i < trees.count; i++) {
      const b = bandOf(treeDist[i], bandEdges);
      counts[b]++;
      scaleSum[b] += treeScale[i];
    }
    const density = [...counts].map((c, b) => (bandArea[b] > 0 ? (c * 100) / bandArea[b] : 0)); // per 100 m2
    const meanScale = [...counts].map((c, b) => (c > 0 ? scaleSum[b] / c : NaN));
    const edges = bandEdges.slice(1, -1).map((e) => round(e, 2));

    {
      const farOverNear = density[0] > 0 ? density[BANDS - 1] / density[0] : Infinity;
      let minStep = Infinity;
      for (let b = 1; b < BANDS; b++) minStep = Math.min(minStep, density[b - 1] > 0 ? density[b] / density[b - 1] : Infinity);
      const pass = density[0] > 0 && farOverNear >= DENSITY_FAR_OVER_NEAR_MIN && minStep >= DENSITY_STEP_MIN;
      res["tree-density-rises"] = result(
        pass,
        { per100m2: density.map((d) => round(d, 3)), bandEdgesM: edges, farOverNear: round(farOverNear, 3), minStep: round(minStep, 3) },
        density[0] === 0
          ? "no trees at all in the band nearest the water; the brief says they thin out, not that they stop"
          : `far/near density ${round(farOverNear, 3)} (needs >= ${DENSITY_FAR_OVER_NEAR_MIN}), smallest band-to-band ratio ${round(minStep, 3)} (needs >= ${DENSITY_STEP_MIN})`,
      );
    }
    {
      const ok = meanScale.every((m) => Number.isFinite(m));
      const farOverNear = ok ? meanScale[BANDS - 1] / meanScale[0] : NaN;
      let minStep = Infinity;
      for (let b = 1; b < BANDS; b++) minStep = Math.min(minStep, meanScale[b] / meanScale[b - 1]);
      const pass = ok && farOverNear >= SCALE_FAR_OVER_NEAR_MIN && minStep >= SCALE_STEP_MIN;
      res["tree-scale-rises"] = result(
        pass,
        { meanScale: meanScale.map((m) => round(m, 3)), farOverNear: round(farOverNear, 3), minStep: round(minStep, 3) },
        ok
          ? `far/near mean scale ${round(farOverNear, 3)} (needs >= ${SCALE_FAR_OVER_NEAR_MIN}), smallest band-to-band ratio ${round(minStep, 3)} (needs >= ${SCALE_STEP_MIN})`
          : "a distance band holds no tree, so its mean scale is undefined",
      );
    }
  }

  // --- driftwood -----------------------------------------------------------
  {
    let onBank = 0;
    const arcs = [];
    for (let i = 0; i < drift.count; i++) {
      const n = river.nearest(drift.positions[i * 3], 0, drift.positions[i * 3 + 2]);
      if (n.distance >= BANK_MIN && n.distance <= BANK_MAX) onBank++;
      // Course coverage reads every log near the river, not only the ones
      // on the bank, so a bank offset that is merely too wide fails
      // driftwood-on-bank alone.
      if (n.distance <= COURSE_REACH) arcs.push(n.globalArc);
    }
    const fraction = drift.count > 0 ? onBank / drift.count : 0;
    res["driftwood-on-bank"] = result(
      drift.count >= DRIFTWOOD_MIN && fraction >= BANK_FRACTION_MIN,
      { count: drift.count, onBankFraction: round(fraction, 3) },
      drift.count < DRIFTWOOD_MIN
        ? `only ${drift.count} pieces of driftwood; needs at least ${DRIFTWOOD_MIN}`
        : `${round(fraction * 100, 1)}% of the driftwood lies ${BANK_MIN}-${BANK_MAX} m from the river line; needs ${BANK_FRACTION_MIN * 100}%`,
    );

    // The stretch of river over the ground, cut into equal arc bins; the
    // driftwood on the bank must reach most of them.
    let arcLo = Infinity;
    let arcHi = -Infinity;
    for (const s of river.segments) {
      const steps = Math.max(1, Math.ceil(s.len / 0.5));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = s.ax + (s.bx - s.ax) * t;
        const z = s.az + (s.bz - s.az) * t;
        if (x < groundB.min[0] || x > groundB.max[0] || z < groundB.min[2] || z > groundB.max[2]) continue;
        const arc = s.globalArc + s.len * t;
        arcLo = Math.min(arcLo, arc);
        arcHi = Math.max(arcHi, arc);
      }
    }
    const filled = new Set();
    if (arcHi > arcLo) {
      for (const a of arcs) {
        if (a < arcLo || a > arcHi) continue;
        filled.add(Math.min(COURSE_BINS - 1, Math.floor(((a - arcLo) / (arcHi - arcLo)) * COURSE_BINS)));
      }
    }
    res["driftwood-follows-course"] = result(
      filled.size >= COURSE_BINS_MIN,
      filled.size,
      `driftwood within ${COURSE_REACH} m of the river reaches ${filled.size} of ${COURSE_BINS} equal stretches of its length over the ground; needs ${COURSE_BINS_MIN}`,
    );
  }

  return res;
}

function bandOf(d, edges) {
  for (let b = edges.length - 2; b >= 0; b--) if (d >= edges[b]) return b;
  return 0;
}
