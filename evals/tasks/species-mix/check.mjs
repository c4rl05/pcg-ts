// species-mix — checks. Thresholds are measured, not designed: see CALIBRATION.md.

// tree-count: the brief's "about 1500", stated there as 1300..1700.
const COUNT_MIN = 1300;
const COUNT_MAX = 1700;
// species-ids / species-shares: the three kinds and their target shares.
const TARGETS = { oak: 0.6, birch: 0.3, pine: 0.1 };
const SHARE_TOL = 0.05; // +/- 5 percentage points, stated in the brief
// inside-grove: a circle of 50 m radius about the origin, across the ground.
const GROVE_RADIUS = 50;
const RADIUS_TOL = 0.01; // metres
// mixed-through: over all pairs of trees within NEIGHBOUR_RADIUS of each other,
// the same-kind percentage may exceed chance (the sum of squared grove-wide
// shares) by at most SAME_KIND_EXCESS_MAX points.
const NEIGHBOUR_RADIUS = 5; // metres, stated in the brief
const SAME_KIND_EXCESS_MAX = 0.04; // 4 points, stated in the brief
const PAIR_POINTS_LIMIT = 200000; // beyond this the pair count is not worth the time (and tree-count fails anyway)
const PAIRS_LIMIT = 5000000; // trees piled together: stop counting (the reference has ~11,000 pairs)
// fills-grove: the trees fill the 50 m circle rather than a smaller patch of it.
const OUTER_BAND_RADIUS = 35; // metres; beyond it lies 51% of the circle's area
const OUTER_SHARE_MIN = 0.44; // at least 44% of the trees stand beyond 35 m, stated in the brief
const FILL_CELL = 10; // metres; every 10 m square (edges on multiples of 10) wholly inside the circle holds a tree
// Inclusive comparisons ("within 5 points", "at most 4 points") allow this much
// float slack, so a value exactly on a stated limit is not rejected by rounding
// (e.g. |975/1500 - 0.6| evaluates to 0.050000000000000044).
const EPS = 1e-9;

const CHECK_IDS = ["tree-count", "species-ids", "species-shares", "inside-grove", "mixed-through", "fills-grove"];

export default async function check({ collections, lib }) {
  const { instancesOf, result, round } = lib;
  const res = {};

  let trees;
  try {
    trees = instancesOf(collections.grove);
  } catch (e) {
    const why = `the grove output cannot be read on the CPU: ${e instanceof Error ? e.message : String(e)}`;
    for (const id of CHECK_IDS) res[id] = result(false, undefined, why);
    return res;
  }
  const n = trees.count;
  const P = trees.positions;
  const ids = trees.assetIds;

  // --- tree-count --------------------------------------------------------------
  res["tree-count"] = result(
    n >= COUNT_MIN && n <= COUNT_MAX,
    n,
    `${n} trees; the brief asks for about 1500, between ${COUNT_MIN} and ${COUNT_MAX}`,
  );

  if (n === 0) {
    for (const id of CHECK_IDS) if (res[id] === undefined) res[id] = result(false, 0, "no trees at all");
    return res;
  }

  // --- species-ids ---------------------------------------------------------------
  const counts = new Map();
  for (const a of ids) counts.set(a, (counts.get(a) ?? 0) + 1);
  {
    const wanted = Object.keys(TARGETS);
    const missing = wanted.filter((k) => !counts.has(k));
    const extra = [...counts.keys()].filter((k) => !(k in TARGETS));
    const byId = Object.fromEntries([...counts.entries()].map(([k, c]) => [String(k), c]));
    res["species-ids"] = result(
      missing.length === 0 && extra.length === 0,
      byId,
      `asset ids present: ${[...counts.keys()].map((k) => JSON.stringify(k)).join(", ")}; missing ${missing.length === 0 ? "none" : missing.join(", ")}; unexpected ${extra.length === 0 ? "none" : extra.map((k) => JSON.stringify(k)).join(", ")} (the brief names exactly oak, birch and pine)`,
    );
  }

  // --- species-shares --------------------------------------------------------------
  {
    let named = 0;
    for (const k of Object.keys(TARGETS)) named += counts.get(k) ?? 0;
    const shares = {};
    let worst = 0;
    let worstKind = "";
    for (const [k, target] of Object.entries(TARGETS)) {
      const s = named > 0 ? (counts.get(k) ?? 0) / named : 0;
      shares[k] = round(s * 100, 2);
      const dev = Math.abs(s - target);
      if (dev > worst) {
        worst = dev;
        worstKind = k;
      }
    }
    res["species-shares"] = result(
      named > 0 && worst <= SHARE_TOL + EPS,
      { sharesPct: shares, named, worstDeviationPts: round(worst * 100, 2) },
      named === 0
        ? "no oak, birch or pine instances to take shares of"
        : `${worstKind} is ${round(worst * 100, 2)} points off its target of ${TARGETS[worstKind] * 100}% (shares oak ${shares.oak}%, birch ${shares.birch}%, pine ${shares.pine}%); allowed ${SHARE_TOL * 100} points`,
    );
  }

  // --- inside-grove ------------------------------------------------------------------
  {
    let outside = 0;
    let far = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(P[i * 3], P[i * 3 + 2]);
      if (!(r <= GROVE_RADIUS + RADIUS_TOL + EPS)) outside++;
      far = Number.isNaN(r) ? Infinity : Math.max(far, r);
    }
    res["inside-grove"] = result(
      outside === 0,
      { outside, farthestM: round(far, 4) },
      `${outside} tree(s) stand more than ${GROVE_RADIUS} m from the centre (farthest ${round(far, 3)} m); tolerance ${RADIUS_TOL} m`,
    );
  }

  // --- mixed-through -------------------------------------------------------------------
  {
    // Chance: two trees drawn independently from the grove's own mix are the
    // same kind with probability sum(share^2), whatever that mix is — so this
    // check does not depend on whether the shares are right.
    let chance = 0;
    for (const c of counts.values()) chance += (c / n) * (c / n);
    if (n > PAIR_POINTS_LIMIT) {
      res["mixed-through"] = result(false, { trees: n }, `${n} trees is too many to pair up (limit ${PAIR_POINTS_LIMIT}); the brief asks for about 1500`);
    } else {
      const { pairs, same, aborted } = neighbourPairs(P, ids, n, NEIGHBOUR_RADIUS, PAIRS_LIMIT);
      const sameFrac = pairs > 0 ? same / pairs : NaN;
      const excess = sameFrac - chance;
      if (aborted) {
        res["mixed-through"] = result(false, { pairs }, `more than ${PAIRS_LIMIT} pairs of trees stand within ${NEIGHBOUR_RADIUS} m of each other; the trees are piled together, not planted through a grove`);
      } else {
        res["mixed-through"] = result(
          pairs > 0 && excess <= SAME_KIND_EXCESS_MAX + EPS,
          { pairs, sameKindPct: round(sameFrac * 100, 2), chancePct: round(chance * 100, 2), excessPts: round(excess * 100, 2) },
          pairs === 0
            ? `no two trees stand within ${NEIGHBOUR_RADIUS} m of each other, so there is no mixing to measure`
            : `${round(sameFrac * 100, 2)}% of the ${pairs} pairs of trees within ${NEIGHBOUR_RADIUS} m are the same kind, against ${round(chance * 100, 2)}% by chance for this mix: ${round(excess * 100, 2)} points over; allowed ${SAME_KIND_EXCESS_MAX * 100}`,
        );
      }
    }
  }

  // --- fills-grove ------------------------------------------------------------------------
  {
    let beyond = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(P[i * 3], P[i * 3 + 2]);
      if (r > OUTER_BAND_RADIUS) beyond++;
    }
    const outerShare = beyond / n;
    // The 10 m squares lying wholly inside the circle (their farthest corner
    // within the radius), and which of them hold no tree.
    const occupied = new Set();
    for (let i = 0; i < n; i++) {
      const x = P[i * 3];
      const z = P[i * 3 + 2];
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      occupied.add(`${Math.floor(x / FILL_CELL)},${Math.floor(z / FILL_CELL)}`);
    }
    const reach = Math.ceil(GROVE_RADIUS / FILL_CELL);
    let squares = 0;
    const empty = [];
    for (let gx = -reach; gx < reach; gx++) {
      for (let gz = -reach; gz < reach; gz++) {
        const fx = Math.max(Math.abs(gx * FILL_CELL), Math.abs((gx + 1) * FILL_CELL));
        const fz = Math.max(Math.abs(gz * FILL_CELL), Math.abs((gz + 1) * FILL_CELL));
        if (Math.hypot(fx, fz) > GROVE_RADIUS + EPS) continue;
        squares++;
        if (!occupied.has(`${gx},${gz}`)) empty.push(`[${gx * FILL_CELL}..${(gx + 1) * FILL_CELL}]x[${gz * FILL_CELL}..${(gz + 1) * FILL_CELL}]`);
      }
    }
    const shareOk = outerShare >= OUTER_SHARE_MIN - EPS;
    res["fills-grove"] = result(
      shareOk && empty.length === 0,
      { beyond35mPct: round(outerShare * 100, 2), squares, emptySquares: empty.length },
      !shareOk
        ? `only ${round(outerShare * 100, 2)}% of the trees stand more than ${OUTER_BAND_RADIUS} m from the centre; the brief asks for at least ${OUTER_SHARE_MIN * 100}% (the grove fills the whole ${GROVE_RADIUS} m circle)`
        : `${empty.length} of the ${squares} ${FILL_CELL} m squares lying wholly inside the circle hold no tree (e.g. ${empty.slice(0, 3).join(", ")}); the brief asks for every one to hold a tree`,
    );
  }

  return res;
}

/**
 * Every unordered pair of points within `radius` of each other across the
 * ground (XZ), and how many of those pairs carry the same asset id. Local
 * helper: evals/lib has nearest-neighbour distances but no radius pairs.
 */
function neighbourPairs(P, ids, n, radius, limit) {
  const grid = new Map();
  const keyOf = (gx, gz) => `${gx},${gz}`;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3];
    const z = P[i * 3 + 2];
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const k = keyOf(Math.floor(x / radius), Math.floor(z / radius));
    let list = grid.get(k);
    if (list === undefined) grid.set(k, (list = []));
    list.push(i);
  }
  const r2 = radius * radius;
  let pairs = 0;
  let same = 0;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3];
    const z = P[i * 3 + 2];
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const gx = Math.floor(x / radius);
    const gz = Math.floor(z / radius);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = grid.get(keyOf(gx + dx, gz + dz));
        if (list === undefined) continue;
        for (const j of list) {
          if (j <= i) continue;
          const ex = P[j * 3] - x;
          const ez = P[j * 3 + 2] - z;
          if (ex * ex + ez * ez > r2) continue;
          pairs++;
          if (ids[j] === ids[i]) same++;
          if (pairs > limit) return { pairs, same, aborted: true };
        }
      }
    }
  }
  return { pairs, same, aborted: false };
}
