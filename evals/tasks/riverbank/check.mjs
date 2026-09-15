// riverbank — checks. Every number here is stated in brief.md's contract;
// where each was placed, against what, is in CALIBRATION.md.

const WATER_HALF_WIDTH = 2.0; // the water is 4 m wide, centred on the river line
const NEAR_MIN = 2.0; // "by the water": 2 m to 12 m from the river line
const NEAR_MAX = 12.0;
const FAR_MIN = 30.0; // "away from the water": more than 30 m from it
const PLANTED_REACH = 10.0; // area counts only within 10 m of some tree
const TREES_MIN = 100;
const NEAR_DENSITY_MAX = 0.6; // by the water: at most 60% of the density away from it
const NEAR_DENSITY_MIN = 0.1; // ...and at least 10%: thinner, not bare
const NEAR_SIZE_MAX = 0.7; // trees by the water average at most 70% of the size away from it
const GROUND_TOLERANCE = 0.5; // a tree's base within 0.5 m of the ground under it
const ON_GROUND_FRACTION_MIN = 0.99;
const BANK_MIN = 2.0; // driftwood: out of the water...
const BANK_MAX = 8.0; // ...and within 8 m of the river line
const BANK_FRACTION_MIN = 0.9;
const DRIFTWOOD_MIN = 10;
const COURSE_BINS = 10;
const COURSE_BINS_MIN = 8;
const COURSE_REACH = 25.0;
const RIVER_SPAN_MIN = 0.8;
const CLOSED_WITHIN = 2.0; // a line ending within 2 m of its start loops back
const BANK_REACH = 4.0; // the river runs "by the ground" where ground lies within 4 m of it
const CELLS_PER_SIDE = 300; // area estimate resolution over the ground's extent

export default async function check({ collections, lib }) {
  const {
    PolylineIndex,
    Surface,
    polylinesOf,
    instancesOf,
    instanceFrame,
    pointsOf,
    trianglesOf,
    bounds,
    result,
    round,
  } = lib;
  const ids = [
    "river-runs-through",
    "trees-thin-by-the-water",
    "trees-smaller-by-the-water",
    "tree-clearance",
    "trees-on-ground",
    "driftwood-on-bank",
    "driftwood-follows-course",
  ];
  const res = {};

  const lines = polylinesOf(collections.river).filter((l) => l.vertexCount >= 2);
  const trees = instancesOf(collections.trees);
  const drift = instancesOf(collections.driftwood);
  const groundPts = pointsOf(collections.ground);
  if (lines.length === 0 || groundPts.length === 0) {
    const why =
      lines.length === 0
        ? "the river output holds no path, so nothing can be measured from it"
        : "the ground output holds no points, so its extent is unknown";
    for (const id of ids) res[id] = result(false, undefined, why);
    return res;
  }
  const groundB = bounds(groundPts);
  const groundTris = trianglesOf(collections.ground);
  const groundSurface = groundTris.length >= 9 ? new Surface(groundTris) : null;
  // Two readings of "over the ground". Planted area uses the ground's own
  // footprint (its triangles), so unplanted corners of a round ground drop
  // out. The river uses the ground's BOUNDS, because a ground delivered as
  // two banks with no ground under the water is still ground the river
  // runs through.
  const inGroundBounds = (x, z) => x >= groundB.min[0] && x <= groundB.max[0] && z >= groundB.min[2] && z <= groundB.max[2];
  const onGround = (x, z) => inGroundBounds(x, z) && (groundSurface === null || groundSurface.sample(x, z) !== null);
  // The ground's height under (x, z): the mesh when the ground has
  // triangles (NaN off it), otherwise the nearest ground point's height.
  const groundHeight = (x, z) => {
    if (groundSurface !== null) {
      const s = groundSurface.sample(x, z);
      return s === null ? NaN : s.y;
    }
    let best = Infinity;
    let gy = NaN;
    for (let j = 0; j < groundPts.length; j += 3) {
      const d2 = (groundPts[j] - x) ** 2 + (groundPts[j + 2] - z) ** 2;
      if (d2 < best) {
        best = d2;
        gy = groundPts[j + 1];
      }
    }
    return gy;
  };
  const river = new PolylineIndex(lines);

  // Samples of the river every 0.5 m where it runs BY THE GROUND — ground
  // within BANK_REACH of the line, so a river in a gap between two banks
  // counts and a river crossing the empty corner of a diamond or disc does
  // not — each with its arc position counted over that length only, in line
  // order. Arc away from the ground adds nothing, so neither the order of
  // the pieces nor a loop off the edge changes what the course is.
  const byGround = (x, z) => {
    if (!inGroundBounds(x, z) && groundSurface === null) return false;
    if (groundSurface === null) return true;
    if (groundSurface.sample(x, z) !== null) return true;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      if (groundSurface.sample(x + BANK_REACH * Math.cos(a), z + BANK_REACH * Math.sin(a)) !== null) return true;
    }
    return false;
  };
  const riverSamples = [];
  let inBoundsLength = 0;
  for (const s of river.segments) {
    const steps = Math.max(1, Math.ceil(s.len / 0.5));
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const mx = s.ax + (s.bx - s.ax) * ((t0 + t1) / 2);
      const mz = s.az + (s.bz - s.az) * ((t0 + t1) / 2);
      if (!byGround(mx, mz)) continue;
      riverSamples.push({ x: mx, z: mz, arc: inBoundsLength + (s.len / steps) / 2 });
      inBoundsLength += s.len / steps;
    }
  }

  // --- river-runs-through: an open line across most of the ground ----------
  {
    // Closed by index, or by the brief's own words: the last vertex ends
    // within 2 m (on the ground plane) of the first — whatever the vertex
    // count, so a stray 1.5 m fragment reads the same with 2 or 3 vertices.
    const closed = lines.filter((l) => {
      const n = l.vertexCount - 1;
      if (l.pointIndex[0] === l.pointIndex[n]) return true;
      return Math.hypot(l.xyz[0] - l.xyz[n * 3], l.xyz[2] - l.xyz[n * 3 + 2]) <= CLOSED_WITHIN;
    }).length;
    const spanX = groundB.max[0] - groundB.min[0];
    const spanZ = groundB.max[2] - groundB.min[2];
    let loX = Infinity;
    let hiX = -Infinity;
    let loZ = Infinity;
    let hiZ = -Infinity;
    for (const s of river.segments) {
      const steps = Math.max(1, Math.ceil(s.len / 0.5));
      for (let k = 0; k <= steps; k++) {
        const x = s.ax + ((s.bx - s.ax) * k) / steps;
        const z = s.az + ((s.bz - s.az) * k) / steps;
        if (!inGroundBounds(x, z)) continue;
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
      closed === 0 && span >= RIVER_SPAN_MIN,
      { span: round(span, 3), closedLines: closed },
      closed > 0
        ? `${closed} river line(s) end within ${CLOSED_WITHIN} m of their start; the river is an open line`
        : `over the ground the river spans ${round(span * 100, 1)}% of its width or depth; needs ${RIVER_SPAN_MIN * 100}%`,
    );
  }

  // --- per tree: distance and size -----------------------------------------
  const treeDist = new Float64Array(trees.count);
  const treeSize = new Float64Array(trees.count);
  for (let i = 0; i < trees.count; i++) {
    treeDist[i] = river.distance(trees.positions[i * 3], 0, trees.positions[i * 3 + 2]);
    const f = instanceFrame(trees.transforms, i);
    treeSize[i] = (f.scale[0] + f.scale[1] + f.scale[2]) / 3;
  }

  // --- tree-clearance --------------------------------------------------------
  {
    let min = Infinity;
    for (const d of treeDist) min = Math.min(min, d);
    res["tree-clearance"] = result(
      trees.count > 0 && min >= WATER_HALF_WIDTH,
      round(min, 3),
      trees.count === 0 ? "no trees" : `the nearest tree stands ${round(min, 3)} m from the river line; the water reaches ${WATER_HALF_WIDTH} m`,
    );
  }

  // --- trees-on-ground ---------------------------------------------------------
  {
    let ok = 0;
    let worst = 0;
    for (let i = 0; i < trees.count; i++) {
      const x = trees.positions[i * 3];
      const y = trees.positions[i * 3 + 1];
      const z = trees.positions[i * 3 + 2];
      const gap = Math.abs(y - groundHeight(x, z));
      if (gap <= GROUND_TOLERANCE) ok++;
      if (!(gap <= worst)) worst = gap;
    }
    const fraction = trees.count > 0 ? ok / trees.count : 0;
    res["trees-on-ground"] = result(
      trees.count > 0 && fraction >= ON_GROUND_FRACTION_MIN,
      { onGroundFraction: round(fraction, 4), worstGap: round(worst, 3) },
      `${round(fraction * 100, 2)}% of trees stand within ${GROUND_TOLERANCE} m of the ground under them (worst ${round(worst, 3)} m, or off the ground); needs ${ON_GROUND_FRACTION_MIN * 100}%`,
    );
  }

  // --- trees-thin-by-the-water ----------------------------------------------
  // Area by zone: cells over the ground (its mesh footprint when it has
  // triangles) that lie within PLANTED_REACH of some tree, so a bare margin
  // or a corner nobody planted is not counted as sparse forest.
  {
    let farTrees = 0;
    let nearCount = 0;
    let nearSize = 0;
    let farSize = 0;
    for (let i = 0; i < trees.count; i++) {
      const d = treeDist[i];
      if (d >= NEAR_MIN && d < NEAR_MAX) {
        nearCount++;
        nearSize += treeSize[i];
      } else if (d >= FAR_MIN) {
        farTrees++;
        farSize += treeSize[i];
      }
    }
    const reach = PLANTED_REACH;
    const treeGrid = new Map();
    for (let i = 0; i < trees.count; i++) {
      const key = `${Math.floor(trees.positions[i * 3] / reach)},${Math.floor(trees.positions[i * 3 + 2] / reach)}`;
      let l = treeGrid.get(key);
      if (l === undefined) treeGrid.set(key, (l = []));
      l.push(i);
    }
    const nearTree = (x, z) => {
      const gx = Math.floor(x / reach);
      const gz = Math.floor(z / reach);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const l = treeGrid.get(`${gx + dx},${gz + dz}`);
          if (l === undefined) continue;
          for (const j of l) {
            const ex = trees.positions[j * 3] - x;
            const ez = trees.positions[j * 3 + 2] - z;
            if (ex * ex + ez * ez <= reach * reach) return true;
          }
        }
      }
      return false;
    };
    const spanX = groundB.max[0] - groundB.min[0];
    const spanZ = groundB.max[2] - groundB.min[2];
    const cell = Math.max(spanX, spanZ) / CELLS_PER_SIDE;
    let nearArea = 0;
    let farArea = 0;
    if (cell > 0 && trees.count > 0) {
      for (let x = groundB.min[0] + cell / 2; x < groundB.max[0]; x += cell) {
        for (let z = groundB.min[2] + cell / 2; z < groundB.max[2]; z += cell) {
          if (!onGround(x, z) || !nearTree(x, z)) continue;
          const d = river.distance(x, 0, z);
          if (d >= NEAR_MIN && d < NEAR_MAX) nearArea += cell * cell;
          else if (d >= FAR_MIN) farArea += cell * cell;
        }
      }
    }
    const nearDensity = nearArea > 0 ? (nearCount * 100) / nearArea : 0;
    const farDensity = farArea > 0 ? (farTrees * 100) / farArea : 0;
    const ratio = farDensity > 0 ? nearDensity / farDensity : NaN;
    const densityPass =
      trees.count >= TREES_MIN && farDensity > 0 && ratio >= NEAR_DENSITY_MIN && ratio <= NEAR_DENSITY_MAX;
    res["trees-thin-by-the-water"] = result(
      densityPass,
      {
        trees: trees.count,
        nearPer100m2: round(nearDensity, 3),
        farPer100m2: round(farDensity, 3),
        nearOverFar: round(ratio, 3),
      },
      trees.count < TREES_MIN
        ? `${trees.count} trees; needs at least ${TREES_MIN}`
        : farDensity === 0
          ? `no planted ground more than ${FAR_MIN} m from the river to compare with`
          : `by the water (${NEAR_MIN}-${NEAR_MAX} m) the trees are ${round(ratio * 100, 1)}% as dense as beyond ${FAR_MIN} m; needs ${NEAR_DENSITY_MIN * 100}-${NEAR_DENSITY_MAX * 100}%`,
    );

    const nearMean = nearCount > 0 ? nearSize / nearCount : NaN;
    const farMean = farTrees > 0 ? farSize / farTrees : NaN;
    const sizeRatio = nearMean / farMean;
    res["trees-smaller-by-the-water"] = result(
      Number.isFinite(sizeRatio) && sizeRatio <= NEAR_SIZE_MAX,
      { nearMeanSize: round(nearMean, 3), farMeanSize: round(farMean, 3), nearOverFar: round(sizeRatio, 3) },
      Number.isFinite(sizeRatio)
        ? `trees by the water average ${round(sizeRatio * 100, 1)}% of the size of trees beyond ${FAR_MIN} m; needs at most ${NEAR_SIZE_MAX * 100}%`
        : `no trees ${nearCount === 0 ? `${NEAR_MIN}-${NEAR_MAX} m from the river` : `beyond ${FAR_MIN} m`} to compare sizes with`,
    );
  }

  // --- driftwood -------------------------------------------------------------
  {
    let onBank = 0;
    let lying = 0;
    const filled = new Set();
    for (let i = 0; i < drift.count; i++) {
      const x = drift.positions[i * 3];
      const y = drift.positions[i * 3 + 1];
      const z = drift.positions[i * 3 + 2];
      const n = river.nearest(x, 0, z);
      const onTheGround = Math.abs(y - groundHeight(x, z)) <= GROUND_TOLERANCE;
      if (onTheGround) lying++;
      if (n.distance >= BANK_MIN && n.distance <= BANK_MAX && onTheGround) onBank++;
      // Course coverage reads every log near the river, not only the ones on
      // the bank, so a bank offset that is merely wrong fails
      // driftwood-on-bank alone. Each log maps to its nearest river sample
      // over the ground, whose arc counts only in-bounds length.
      if (inBoundsLength > 0) {
        let best = COURSE_REACH * COURSE_REACH;
        let arc = -1;
        for (const s of riverSamples) {
          const d2 = (s.x - x) ** 2 + (s.z - z) ** 2;
          if (d2 <= best) {
            best = d2;
            arc = s.arc;
          }
        }
        if (arc >= 0) filled.add(Math.min(COURSE_BINS - 1, Math.floor((arc / inBoundsLength) * COURSE_BINS)));
      }
    }
    const fraction = drift.count > 0 ? onBank / drift.count : 0;
    res["driftwood-on-bank"] = result(
      drift.count >= DRIFTWOOD_MIN && fraction >= BANK_FRACTION_MIN,
      { count: drift.count, onBankFraction: round(fraction, 3), onGroundFraction: round(drift.count > 0 ? lying / drift.count : 0, 3) },
      drift.count < DRIFTWOOD_MIN
        ? `only ${drift.count} pieces of driftwood; needs at least ${DRIFTWOOD_MIN}`
        : `${round(fraction * 100, 1)}% of the driftwood lies ${BANK_MIN}-${BANK_MAX} m from the river line and within ${GROUND_TOLERANCE} m of the ground; needs ${BANK_FRACTION_MIN * 100}%`,
    );
    res["driftwood-follows-course"] = result(
      filled.size >= COURSE_BINS_MIN,
      filled.size,
      `driftwood within ${COURSE_REACH} m of the river reaches ${filled.size} of ${COURSE_BINS} equal stretches of its length over the ground; needs ${COURSE_BINS_MIN}`,
    );
  }

  return res;
}
