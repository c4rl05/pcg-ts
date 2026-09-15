// even-spacing — checks. Thresholds are measured, not designed: see CALIBRATION.md.

// marker-count: the brief's "about 400", stated there as 340..460.
const COUNT_MIN = 340;
const COUNT_MAX = 460;
// inside-square: the 100 m x 100 m square centred on the origin, flat at y = 0.
const HALF_SIDE = 50;
const GROUND_Y = 0;
const BOUNDS_TOL = 0.01; // metres; f32 transforms round far below this
// min-spacing: no two markers closer than 4 m across the ground.
const MIN_SPACING = 4;
const SPACING_TOL = 0.001; // metres; the reference's closest pair sits 0.0001-0.01 m above 4
const SPACING_POINTS_LIMIT = 50000; // a pile this large would make the exact pair search crawl (marker-count fails anyway)
// no-holes (hard): 10 x 10 cells of 10 m over the square, every one occupied.
const CELLS_PER_SIDE = 10;
const EMPTY_CELLS_MAX = 0;
// Inclusive comparisons allow this much float slack on top of the tolerances,
// so a value exactly on a stated limit is never rejected by rounding.
const EPS = 1e-9;

export default async function check({ collections, lib }) {
  const { instancesOf, minPairDistance, result, round } = lib;
  const res = {};

  let markers;
  try {
    markers = instancesOf(collections.markers);
  } catch (e) {
    const why = `the markers output cannot be read on the CPU: ${e instanceof Error ? e.message : String(e)}`;
    const none = result(false, undefined, why);
    return { "marker-count": none, "inside-square": none, "min-spacing": none, "no-holes": none };
  }
  const n = markers.count;
  const P = markers.positions;

  // --- marker-count --------------------------------------------------------
  res["marker-count"] = result(
    n >= COUNT_MIN && n <= COUNT_MAX,
    n,
    `${n} markers; the brief asks for about 400, between ${COUNT_MIN} and ${COUNT_MAX}`,
  );

  if (n === 0) {
    const none = result(false, 0, "no markers at all");
    res["inside-square"] = none;
    res["min-spacing"] = none;
    res["no-holes"] = none;
    return res;
  }

  // --- inside-square ---------------------------------------------------------
  {
    let outside = 0;
    let off = 0;
    let farXZ = 0; // the largest |x| or |z| of any marker: 50 is the square's edge
    let farY = 0; // the largest |y - 0| of any marker
    for (let i = 0; i < n; i++) {
      const x = P[i * 3];
      const y = P[i * 3 + 1];
      const z = P[i * 3 + 2];
      const reach = Math.max(Math.abs(x), Math.abs(z));
      const dy = Math.abs(y - GROUND_Y);
      if (!(reach <= HALF_SIDE + BOUNDS_TOL + EPS)) outside++;
      if (!(dy <= BOUNDS_TOL + EPS)) off++;
      farXZ = Number.isNaN(reach) ? Infinity : Math.max(farXZ, reach);
      farY = Number.isNaN(dy) ? Infinity : Math.max(farY, dy);
    }
    res["inside-square"] = result(
      outside === 0 && off === 0,
      { outside, offGround: off, farthestAbsXZ: round(farXZ, 4), farthestAbsY: round(farY, 4) },
      `${outside} marker(s) outside the square |x|,|z| <= ${HALF_SIDE} m (farthest reaches ${round(farXZ, 3)} m) and ${off} off the ground (farthest ${round(farY, 3)} m from y = ${GROUND_Y}); tolerance ${BOUNDS_TOL} m`,
    );
  }

  // --- min-spacing -----------------------------------------------------------
  if (n > SPACING_POINTS_LIMIT) {
    res["min-spacing"] = result(false, null, `${n} markers is too many to measure spacing over (limit ${SPACING_POINTS_LIMIT}); the brief asks for about 400`);
  } else {
    const closest = n < 2 ? Infinity : minPairDistance(P);
    res["min-spacing"] = result(
      n >= 2 && Number.isFinite(closest) && closest >= MIN_SPACING - SPACING_TOL - EPS,
      n < 2 || !Number.isFinite(closest) ? null : round(closest, 4),
      n < 2
        ? "fewer than two markers, so there is no spacing to measure"
        : !Number.isFinite(closest)
          ? "the marker positions are not finite numbers, so no spacing can be measured"
        : `the closest two markers are ${round(closest, 4)} m apart; the brief allows no pair closer than ${MIN_SPACING} m`,
    );
  }

  // --- no-holes -----------------------------------------------------------------
  {
    const cell = (2 * HALF_SIDE) / CELLS_PER_SIDE;
    const occupied = new Uint32Array(CELLS_PER_SIDE * CELLS_PER_SIDE);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3];
      const z = P[i * 3 + 2];
      const lim = HALF_SIDE + BOUNDS_TOL + EPS; // the same square inside-square accepts
      if (!(Math.abs(x) <= lim && Math.abs(z) <= lim)) continue;
      const cx = Math.max(0, Math.min(CELLS_PER_SIDE - 1, Math.floor((x + HALF_SIDE) / cell)));
      const cz = Math.max(0, Math.min(CELLS_PER_SIDE - 1, Math.floor((z + HALF_SIDE) / cell)));
      occupied[cx * CELLS_PER_SIDE + cz]++;
    }
    let empty = 0;
    let fewest = Infinity;
    for (const c of occupied) {
      if (c === 0) empty++;
      fewest = Math.min(fewest, c);
    }
    res["no-holes"] = result(
      empty <= EMPTY_CELLS_MAX,
      { emptyCells: empty, fewestInACell: fewest },
      `${empty} of the ${CELLS_PER_SIDE * CELLS_PER_SIDE} ${cell} m cells over the square hold no marker; allowed ${EMPTY_CELLS_MAX}`,
    );
  }

  return res;
}
