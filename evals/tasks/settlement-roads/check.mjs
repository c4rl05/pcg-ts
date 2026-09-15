// settlement-roads — checks. Thresholds are measured, not designed: see CALIBRATION.md.

// settlements — every number here is stated in the brief.
const COUNT_MIN = 30;
const COUNT_MAX = 50;
const REGION_HALF = 200; // the square is 400 m on a side, centred on the origin
const REGION_SLACK = 0.01; // metres of float slack on the square's edge
const FLAT_MAX_ABS_Y = 0.5; // "level ground at height 0"
const SPACING_MIN = 25; // no two settlements closer than 25 m
const SPACING_SLACK = 0.01; // metres of float slack (positions are stored as f32)
// roads-are-segments / connected / no-crossings
const END_TOLERANCE = 0.5; // a road end within 0.5 m of a settlement is ON it (brief)
const CROSS_EPS = 1e-4; // findCrossings' shared-endpoint distance and collinearity scale

export default async function check({ collections, lib }) {
  const { pointsOf, polylinesOf, matchPoints, findCrossings, connectedComponents, minPairDistance, bounds, result, round } = lib;
  const res = {};

  const sxyz = pointsOf(collections.settlements);
  const n = sxyz.length / 3;
  const lines = polylinesOf(collections.roads);

  // --- settlements ---------------------------------------------------------
  {
    const b = n > 0 ? bounds(sxyz) : null;
    const spacing = n >= 2 ? minPairDistance(sxyz) : Infinity;
    const inside =
      b !== null &&
      b.min[0] >= -REGION_HALF - REGION_SLACK &&
      b.max[0] <= REGION_HALF + REGION_SLACK &&
      b.min[2] >= -REGION_HALF - REGION_SLACK &&
      b.max[2] <= REGION_HALF + REGION_SLACK;
    const flat = b !== null && Math.abs(b.min[1]) <= FLAT_MAX_ABS_Y && Math.abs(b.max[1]) <= FLAT_MAX_ABS_Y;
    const countOk = n >= COUNT_MIN && n <= COUNT_MAX;
    const spacingOk = n >= 2 && spacing >= SPACING_MIN - SPACING_SLACK;
    const reasons = [];
    if (!countOk) reasons.push(`${n} settlements; needs ${COUNT_MIN}-${COUNT_MAX}`);
    if (b !== null && !inside) {
      reasons.push(
        `settlements reach x ${round(b.min[0], 2)}..${round(b.max[0], 2)}, z ${round(b.min[2], 2)}..${round(b.max[2], 2)}; the square is +-${REGION_HALF} m`,
      );
    }
    if (b !== null && !flat) reasons.push(`settlement heights span ${round(b.min[1], 3)}..${round(b.max[1], 3)}; the ground is level at 0 (+-${FLAT_MAX_ABS_Y})`);
    if (n >= 2 && !spacingOk) reasons.push(`the closest two settlements are ${round(spacing, 3)} m apart; needs >= ${SPACING_MIN} m`);
    res.settlements = result(
      countOk && inside && flat && spacingOk,
      {
        count: n,
        minSpacingM: round(spacing, 3),
        bounds: b === null ? null : { min: b.min.map((v) => round(v, 2)), max: b.max.map((v) => round(v, 2)) },
      },
      reasons.length === 0 ? (n < 2 ? "fewer than two settlements" : "ok") : reasons.join("; "),
    );
  }

  if (n === 0 || lines.length === 0) {
    const why = n === 0 ? "the settlements output holds no points" : "the roads output holds no polyline";
    res["roads-are-segments"] = result(false, { roads: lines.length }, why);
    res["no-crossings"] = result(false, undefined, why);
    res.connected = result(false, undefined, why);
    res["every-settlement-has-a-road"] = result(false, undefined, why);
    return res;
  }

  // Every vertex of every road, matched to a settlement within the tolerance.
  const lineMatch = lines.map((l) => matchPoints(l.xyz, sxyz, END_TOLERANCE));

  // --- roads-are-segments --------------------------------------------------
  {
    let multiVertex = 0;
    let unmatchedEnds = 0;
    let loops = 0;
    let tooShort = 0;
    for (let r = 0; r < lines.length; r++) {
      const l = lines[r];
      if (l.vertexCount < 2) {
        tooShort++;
        continue;
      }
      if (l.vertexCount !== 2) multiVertex++;
      const a = lineMatch[r][0];
      const z = lineMatch[r][l.vertexCount - 1];
      if (a < 0) unmatchedEnds++;
      if (z < 0) unmatchedEnds++;
      if (a >= 0 && a === z) loops++;
    }
    const pass = multiVertex === 0 && unmatchedEnds === 0 && loops === 0 && tooShort === 0;
    const reasons = [];
    if (multiVertex > 0) reasons.push(`${multiVertex} of ${lines.length} roads are polylines of more than 2 points; each road must be ONE straight stretch`);
    if (tooShort > 0) reasons.push(`${tooShort} roads have fewer than 2 points`);
    if (unmatchedEnds > 0) reasons.push(`${unmatchedEnds} road ends lie more than ${END_TOLERANCE} m from every settlement`);
    if (loops > 0) reasons.push(`${loops} roads start and end at the same settlement`);
    res["roads-are-segments"] = result(
      pass,
      { roads: lines.length, multiVertex, unmatchedEnds, loops, tooShort },
      reasons.length === 0 ? "ok" : reasons.join("; "),
    );
  }

  // --- no-crossings --------------------------------------------------------
  // Every straight piece of every road, with any vertex that lies on a
  // settlement snapped onto it, so two roads meeting at a settlement share
  // the endpoint exactly and do not read as a crossing.
  {
    const segs = [];
    for (let r = 0; r < lines.length; r++) {
      const l = lines[r];
      const at = (v) => {
        const m = lineMatch[r][v];
        return m >= 0 ? [sxyz[m * 3], sxyz[m * 3 + 2]] : [l.xyz[v * 3], l.xyz[v * 3 + 2]];
      };
      for (let v = 1; v < l.vertexCount; v++) {
        const p = at(v - 1);
        const q = at(v);
        if (p[0] === q[0] && p[1] === q[1]) continue; // a zero-length piece crosses nothing
        segs.push([p, q]);
      }
    }
    const { count, pairs } = findCrossings(segs, { eps: CROSS_EPS, maxPairs: Number.MAX_SAFE_INTEGER });
    // Tell apart the same stretch of road twice (both ends shared) from roads
    // that cross, overlap or run into one another.
    const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= CROSS_EPS;
    let duplicates = 0;
    for (const [i, j] of pairs) {
      const [a, b] = segs[i];
      const [c, d] = segs[j];
      if ((same(a, c) && same(b, d)) || (same(a, d) && same(b, c))) duplicates++;
    }
    const others = count - duplicates;
    const example = pairs.slice(0, 3).map(([i, j]) => [segs[i], segs[j]].map((s) => s.map((pt) => pt.map((c) => round(c, 2)))));
    const why = [];
    if (others > 0) why.push(`${others} pairs of roads cross, overlap or run into one another other than by ending at a shared settlement`);
    if (duplicates > 0) why.push(`${duplicates} roads are laid twice over the same stretch between the same two settlements`);
    res["no-crossings"] = result(
      count === 0 && segs.length > 0,
      { pieces: segs.length, crossings: count, duplicates, examples: example },
      segs.length === 0 ? "no road has any length" : count === 0 ? "ok" : `${why.join("; ")} (measured on the ground plane); needs none`,
    );
  }

  // --- connected / every-settlement-has-a-road -----------------------------
  {
    const edges = [];
    for (let r = 0; r < lines.length; r++) {
      const l = lines[r];
      if (l.vertexCount < 2) continue;
      const a = lineMatch[r][0];
      const z = lineMatch[r][l.vertexCount - 1];
      if (a >= 0 && z >= 0 && a !== z) edges.push([a, z]);
    }
    const cc = connectedComponents(n, edges);
    const sizes = [...cc.sizes].sort((x, y) => y - x);
    let isolated = 0;
    for (let i = 0; i < n; i++) if (cc.degree[i] === 0) isolated++;
    res.connected = result(
      n >= 2 && cc.count === 1,
      { settlements: n, linkingRoads: edges.length, components: cc.count, largestSizes: sizes.slice(0, 4) },
      n < 2 ? "fewer than two settlements, so there is nothing to connect" : cc.count === 1 ? "ok" : `the roads split the settlements into ${cc.count} groups (sizes ${sizes.slice(0, 4).join(", ")}${sizes.length > 4 ? ", ..." : ""}); needs 1`,
    );
    res["every-settlement-has-a-road"] = result(
      isolated === 0,
      { isolated },
      isolated === 0 ? "ok" : `${isolated} settlements have no road ending at them`,
    );
  }

  return res;
}
