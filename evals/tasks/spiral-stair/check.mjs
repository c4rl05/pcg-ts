// spiral-stair — checks. Thresholds are measured, not designed: see CALIBRATION.md.

// step-count
const STEPS = 24; // brief: exactly 24 steps
// constant-radius
const RADIUS = 3; // brief: every step's centre is 3 m from the axis
const RADIUS_TOLERANCE = 0.1; // the mean radius must be within 3 +/- 0.1 m
const RADIUS_SPREAD_MAX = 0.05; // farthest minus nearest step, in metres
// fixed-rise
const RISE = 0.2; // brief: each step 0.2 m above the one below
const RISE_TOLERANCE = 0.005; // every gap within 0.2 +/- 0.005 m
// fixed-turn
const TURN_DEG = 15; // brief: each step turned 15 degrees from the one below, always the same way
const TURN_TOLERANCE_DEG = 0.25;
// treads-point-outward / treads-level
const OUTWARD_TOLERANCE_DEG = 3; // local +X, seen from above, against the line from the axis through the step
const LEVEL_TOLERANCE_DEG = 3; // local +Y against world up

export default async function check({ collections, lib }) {
  const { instancesOf, instanceFrame, angleBetweenDeg, result, round } = lib;
  const ids = ["step-count", "constant-radius", "fixed-rise", "fixed-turn", "treads-point-outward", "treads-level"];
  const res = {};
  const steps = instancesOf(collections.steps);
  const n = steps.count;

  // --- step-count -----------------------------------------------------------
  res["step-count"] = result(n === STEPS, n, `the stair has ${n} steps; the brief asks for exactly ${STEPS}`);

  if (n < 2) {
    const none = result(false, { count: n }, `only ${n} step(s), so nothing about the flight can be measured`);
    for (const id of ids) if (id !== "step-count") res[id] = none;
    return res;
  }

  const frames = [];
  for (let i = 0; i < n; i++) {
    const f = instanceFrame(steps.transforms, i);
    const [x, y, z] = f.position;
    frames.push({ ...f, x, y, z, r: Math.hypot(x, z), angle: Math.atan2(z, x) });
  }

  // --- constant-radius ------------------------------------------------------
  {
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (const f of frames) {
      lo = Math.min(lo, f.r);
      hi = Math.max(hi, f.r);
      sum += f.r;
    }
    const mean = sum / n;
    const spread = hi - lo;
    const pass = Math.abs(mean - RADIUS) <= RADIUS_TOLERANCE && spread <= RADIUS_SPREAD_MAX;
    res["constant-radius"] = result(
      pass,
      { meanRadius: round(mean, 4), minRadius: round(lo, 4), maxRadius: round(hi, 4), spread: round(spread, 4) },
      `steps stand ${round(lo, 3)}-${round(hi, 3)} m from the axis (mean ${round(mean, 3)}); needs a mean within ${RADIUS} +/- ${RADIUS_TOLERANCE} m and a spread of at most ${RADIUS_SPREAD_MAX} m`,
    );
  }

  // Walk the flight from the bottom up.
  const order = frames.slice().sort((a, b) => a.y - b.y);

  // --- fixed-rise -----------------------------------------------------------
  {
    let worst = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 1; k < n; k++) {
      const d = order[k].y - order[k - 1].y;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
      worst = Math.max(worst, Math.abs(d - RISE));
    }
    res["fixed-rise"] = result(
      worst <= RISE_TOLERANCE,
      { minRise: round(lo, 5), maxRise: round(hi, 5), worstError: round(worst, 5) },
      `rises between consecutive steps run ${round(lo, 4)}-${round(hi, 4)} m; every one must be ${RISE} +/- ${RISE_TOLERANCE} m`,
    );
  }

  // --- fixed-turn -----------------------------------------------------------
  {
    let lo = Infinity;
    let hi = -Infinity;
    let worst = 0;
    let positive = 0;
    let negative = 0;
    for (let k = 1; k < n; k++) {
      let d = ((order[k].angle - order[k - 1].angle) * 180) / Math.PI;
      while (d > 180) d -= 360;
      while (d <= -180) d += 360;
      if (d > 0) positive++;
      else if (d < 0) negative++;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
      worst = Math.max(worst, Math.abs(Math.abs(d) - TURN_DEG));
    }
    const oneWay = positive === n - 1 || negative === n - 1;
    res["fixed-turn"] = result(
      oneWay && worst <= TURN_TOLERANCE_DEG,
      { minTurnDeg: round(lo, 4), maxTurnDeg: round(hi, 4), worstErrorDeg: round(worst, 4), oneWay },
      oneWay
        ? `turns between consecutive steps run ${round(lo, 3)} to ${round(hi, 3)} degrees; every one must be ${TURN_DEG} +/- ${TURN_TOLERANCE_DEG}`
        : `the flight does not turn the same way throughout (${positive} steps turn one way, ${negative} the other)`,
    );
  }

  // --- treads-point-outward -------------------------------------------------
  {
    let worst = 0;
    for (const f of frames) {
      const flat = Math.hypot(f.axisX[0], f.axisX[2]);
      const a = f.r < 1e-6 || flat < 1e-6 ? 180 : angleBetweenDeg([f.axisX[0], 0, f.axisX[2]], [f.x, 0, f.z]);
      worst = Math.max(worst, Number.isFinite(a) ? a : 180);
    }
    res["treads-point-outward"] = result(
      worst <= OUTWARD_TOLERANCE_DEG,
      { worstDeg: round(worst, 4) },
      `the worst tread's local +X is ${round(worst, 2)} degrees (seen from above) off the line from the axis out through it; needs ${OUTWARD_TOLERANCE_DEG}`,
    );
  }

  // --- treads-level ---------------------------------------------------------
  {
    let worst = 0;
    for (const f of frames) {
      const a = angleBetweenDeg(f.axisY, [0, 1, 0]);
      worst = Math.max(worst, Number.isFinite(a) ? a : 180);
    }
    res["treads-level"] = result(
      worst <= LEVEL_TOLERANCE_DEG,
      { worstDeg: round(worst, 4) },
      `the worst tread's local +Y is ${round(worst, 2)} degrees off straight up; needs ${LEVEL_TOLERANCE_DEG}`,
    );
  }

  return res;
}
