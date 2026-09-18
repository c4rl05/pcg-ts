/**
 * Campaign report, the gate, and the calibration table.
 *
 *   node evals/harness/report.mjs --campaign <name> [--results-dir evals/results] [--config evals/eval.config.json]
 *
 * Reads `<results>/<campaign>/manifest.json` and `runs.jsonl`, writes
 * `report.json` and `report.md` beside them (and `calibration.md` for a
 * calibration campaign).
 *
 * Two things are reported, not one. SOLVED is the headline but it saturates:
 * the pilot came back 54/54 in every arm, which told us nothing except that
 * the tasks were too easy. EFFORT — what the run cost — kept varying while
 * solved sat at the ceiling, so v2 reports both and the gate can fire on
 * either.
 *
 * - Solved counts per task x arm with Wilson 95% intervals, and paired-by-task
 *   deltas of each arm against the first baseline arm (exact sign test).
 * - Process metrics (the pilot's table, kept for continuity) plus EFFORT:
 *   turns, tool calls, wall minutes, output tokens, `pcg validate` calls and
 *   their failure rate, probe graphs, and what was read (llms/docs/skills/
 *   graphs) — per arm AND per task, as medians, with a paired-by-task
 *   comparison against the baseline arm. The paired comparison carries a
 *   seeded percentile bootstrap over TASKS and an exact sign test, so a
 *   reader can tell an effort difference from run-to-run wobble. The A/A pair
 *   is the noise floor for effort exactly as it is for solved.
 * - The GATE, go iff
 *   (a) the stripped arm is worse than the baseline arms, EITHER on solved
 *       rate — below EACH baseline by more than the A/A gap and by at least
 *       `gate.strippedMinMargin` — OR on effort, needing at least
 *       `gate.strippedEffortMinMargin` more `gate.effortMetric` than EACH
 *       baseline (as a fraction of that baseline, paired by task), by more
 *       than the A/A effort gap, with the bootstrap interval clear of zero.
 *       The report says which limb fired;
 *   (b) the A/A gap |A - A'| is at most `gate.aaMaxGap`, and (when effort
 *       thresholds are configured) the A/A effort gap is at most
 *       `gate.aaMaxEffortGap`;
 *   (c) no task sits at 0% or 100% solved pooled across all arms. Tasks that
 *       fail (c) are listed for replacement by reserve tasks.
 *   A campaign with unfinished slots reports `pending`, never go or stop.
 *   A campaign whose gate configures no effort thresholds is the pilot gate,
 *   unchanged: limb (a) is solved-only and (b) checks the solved gap alone.
 *
 * CALIBRATION campaigns (`gate.mode: "calibration"`, or one arm at one run
 * per task) skip the gate — one run proves nothing — and get `calibration.md`:
 * one row per task with solved, turns, tool calls, wall minutes, output
 * tokens, caps hit and contamination, which is what picking the tasks for a
 * campaign needs.
 *
 * Which record counts for a slot: the LAST line for that slot id in
 * runs.jsonl (a contaminated first attempt is superseded by its retry).
 * Records still contaminated after their retry are reported and excluded
 * from rates: they measured something other than the arm.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EVALS_DIR, readJson } from "./sandbox.mjs";

const Z95 = 1.959963984540054;

/** Wilson score interval for k successes in n trials. */
export function wilson(k, n, z = Z95) {
  if (!n) return { p: null, lo: 0, hi: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

/** Two-sided exact sign test p-value for `wins` vs `losses` (ties dropped). */
export function signTest(wins, losses) {
  const n = wins + losses;
  if (!n) return 1;
  const k = Math.min(wins, losses);
  let tail = 0;
  let c = 1; // C(n, 0)
  for (let i = 0; i <= k; i++) {
    if (i > 0) c = (c * (n - i + 1)) / i;
    tail += c;
  }
  return Math.min(1, (2 * tail) / 2 ** n);
}

export function parseJsonl(text, { tolerant = false, onSkip = () => {} } = {}) {
  const out = [];
  text.split(/\r?\n/).forEach((l, i) => {
    if (!l.trim()) return;
    try {
      out.push(JSON.parse(l));
    } catch (err) {
      if (!tolerant) throw new Error(`runs.jsonl line ${i + 1} is not JSON: ${err.message}`);
      onSkip(i + 1);
    }
  });
  return out;
}

/** The record that counts for each slot: the last one written. */
export function latestBySlot(records) {
  const m = new Map();
  for (const r of records) m.set(r.slotId, r);
  return m;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/**
 * Nearest-rank percentile (`ceil(p * n)`, 1-based), so a quantile is always
 * one of the observed values and p25 of three runs is the smallest rather
 * than the middle one.
 */
const quantile = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length, Math.max(1, Math.ceil(p * s.length))) - 1];
};

/**
 * mulberry32, the schedule's PRNG, kept local: report.mjs cannot import
 * run.mjs (run.mjs imports this module). Seeded, so a bootstrap interval is
 * a property of the records and not of when the report was generated —
 * re-running report.mjs on the same runs.jsonl prints the same numbers.
 */
export function makeReportRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Percentile bootstrap of `stat` over `values`, resampling with replacement.
 * With fewer than two values there is nothing to resample: the interval is
 * reported as unavailable rather than as a point.
 */
export function bootstrapCi(values, stat = mean, { b = 2000, seed = 0x5eed, alpha = 0.05 } = {}) {
  const xs = values.filter((x) => Number.isFinite(x));
  if (xs.length < 2) return { lo: null, hi: null, samples: 0, b, alpha };
  const rng = makeReportRng(seed);
  const stats = [];
  for (let i = 0; i < b; i++) {
    const sample = new Array(xs.length);
    for (let j = 0; j < xs.length; j++) sample[j] = xs[Math.floor(rng() * xs.length)];
    const s = stat(sample);
    if (Number.isFinite(s)) stats.push(s);
  }
  if (!stats.length) return { lo: null, hi: null, samples: 0, b, alpha };
  return { lo: quantile(stats, alpha / 2), hi: quantile(stats, 1 - alpha / 2), samples: stats.length, b, alpha };
}

/**
 * What a run cost, one number each. `turns` leads: it is what the cap is set
 * on, it is an integer, and it does not move with how loaded the machine was
 * (wall minutes) or how chatty the model felt (output tokens).
 */
export const EFFORT_METRICS = [
  { key: "turns", label: "turns", of: (r) => r.turns },
  { key: "toolCalls", label: "tool calls", of: (r) => r.toolCalls },
  { key: "wallMinutes", label: "wall min", of: (r) => (r.wallMs ?? NaN) / 60_000 },
  { key: "outputTokens", label: "out tokens", of: (r) => r.usage?.output_tokens },
  { key: "validateCalls", label: "validate calls", of: (r) => r.pcgCommands?.validate ?? 0 },
  { key: "probeGraphs", label: "probe graphs", of: (r) => r.probeGraphsWritten ?? 0 },
];

/** The runs that measured their arm: neither contaminated nor an infra error. */
export const countableRuns = (finals) => finals.filter((r) => !r.contaminated && !r.infraError);

function effortStats(rs) {
  const out = {};
  for (const m of EFFORT_METRICS) {
    const xs = rs.map(m.of).filter((x) => Number.isFinite(x));
    out[m.key] = { n: xs.length, mean: mean(xs), median: median(xs), p25: quantile(xs, 0.25), p75: quantile(xs, 0.75) };
  }
  return out;
}

/**
 * Effort per arm and per task x arm: every EFFORT_METRIC as n/mean/median/IQR,
 * plus the rates that are not per-run numbers (validate failures, what was
 * read, caps hit, whether a graph came out at all).
 */
export function effortMetrics(finals, arms, tasks) {
  const byArm = {};
  const cell = {};
  const rates = (rs) => {
    const validateCalls = rs.reduce((a, r) => a + (r.pcgCommands?.validate ?? 0), 0);
    const validateFails = rs.reduce((a, r) => a + (r.pcgFailures?.validate ?? 0), 0);
    const capsHit = {};
    for (const r of rs) for (const c of r.capsHit ?? []) capsHit[c] = (capsHit[c] ?? 0) + 1;
    const share = (k) => (rs.length ? rs.filter((r) => (r.readCounts?.[k] ?? 0) > 0).length / rs.length : null);
    return {
      runs: rs.length,
      validateFailureRate: validateCalls ? validateFails / validateCalls : null,
      capsHit,
      capsHitRate: rs.length ? rs.filter((r) => (r.capsHit ?? []).length).length / rs.length : null,
      readShare: { llms: share("llms"), docs: share("docs"), skills: share("skills"), graphs: share("graphs") },
      graphProducedRate: rs.length ? rs.filter((r) => r.graphProduced ?? r.score?.graphProduced).length / rs.length : null,
    };
  };
  for (const arm of arms) {
    const rs = countableRuns(finals.filter((r) => r.arm === arm));
    byArm[arm] = { ...rates(rs), metrics: effortStats(rs) };
  }
  for (const task of tasks) {
    cell[task] = {};
    for (const arm of arms) {
      const rs = countableRuns(finals.filter((r) => r.arm === arm && r.task === task));
      cell[task][arm] = { runs: rs.length, metrics: effortStats(rs) };
    }
  }
  return { byArm, cell };
}

/**
 * Effort of `arm` against `ref`, PAIRED BY TASK: per task, the difference of
 * the two medians, and that difference as a fraction of the reference (which
 * is what a threshold can be stated in, since a task's turn count is set by
 * the task). Aggregated as the mean over tasks, with a seeded percentile
 * bootstrap over the per-task values and an exact two-sided sign test on
 * their signs. Tasks where either arm has no countable run are dropped.
 */
export function pairedEffort(effort, tasks, arm, ref, opts = {}) {
  const metrics = {};
  for (const m of EFFORT_METRICS) {
    const perTask = {};
    const deltas = [];
    const rel = [];
    let wins = 0;
    let losses = 0;
    let ties = 0;
    for (const t of tasks) {
      const a = effort.cell[t]?.[arm]?.metrics?.[m.key];
      const b = effort.cell[t]?.[ref]?.metrics?.[m.key];
      if (!a?.n || !b?.n || a.median === null || b.median === null) continue;
      const d = a.median - b.median;
      const r = b.median !== 0 ? d / b.median : null;
      perTask[t] = { arm: a.median, ref: b.median, delta: d, relative: r };
      deltas.push(d);
      if (r !== null) rel.push(r);
      if (d > 0) wins++;
      else if (d < 0) losses++;
      else ties++;
    }
    // `wins` counts "more effort"; for effort that is the arm doing worse.
    metrics[m.key] = {
      metric: m.key,
      tasks: deltas.length,
      perTask,
      meanDelta: mean(deltas),
      medianDelta: median(deltas),
      meanRelative: mean(rel),
      relativeCi: bootstrapCi(rel, mean, opts),
      deltaCi: bootstrapCi(deltas, mean, opts),
      higher: wins,
      lower: losses,
      ties,
      signTestP: signTest(wins, losses),
    };
  }
  return { arm, ref, metrics };
}

/**
 * Summaries per task x arm and per arm.
 * @param {object[]} finals  one record per slot
 * @param {string[]} arms
 * @param {string[]} tasks
 */
export function summarize(finals, arms, tasks) {
  const cell = {};
  const byArm = {};
  const byTask = {};
  for (const arm of arms) byArm[arm] = { n: 0, solved: 0, contaminated: 0, infra: 0 };
  for (const task of tasks) {
    cell[task] = {};
    byTask[task] = { n: 0, solved: 0 };
    for (const arm of arms) cell[task][arm] = { n: 0, solved: 0, contaminated: 0, infra: 0 };
  }
  for (const r of finals) {
    const c = cell[r.task]?.[r.arm];
    if (!c) continue;
    if (r.contaminated) {
      c.contaminated++;
      byArm[r.arm].contaminated++;
      continue;
    }
    if (r.infraError) {
      c.infra++;
      byArm[r.arm].infra++;
      continue;
    }
    c.n++;
    byArm[r.arm].n++;
    byTask[r.task].n++;
    if (r.solved === true) {
      c.solved++;
      byArm[r.arm].solved++;
      byTask[r.task].solved++;
    }
  }
  const withCi = (o) => ({ ...o, ...wilson(o.solved, o.n) });
  for (const task of tasks) for (const arm of arms) cell[task][arm] = withCi(cell[task][arm]);
  for (const arm of arms) byArm[arm] = withCi(byArm[arm]);
  for (const task of tasks) byTask[task] = withCi(byTask[task]);
  return { cell, byArm, byTask };
}

/** Per-task rate differences of `arm` minus `ref`, and their aggregate. */
export function pairedDelta(summary, tasks, arm, ref) {
  const perTask = {};
  let wins = 0;
  let losses = 0;
  let ties = 0;
  const ds = [];
  for (const t of tasks) {
    const a = summary.cell[t][arm];
    const b = summary.cell[t][ref];
    if (!a.n || !b.n) continue;
    const d = a.p - b.p;
    perTask[t] = d;
    ds.push(d);
    if (d > 0) wins++;
    else if (d < 0) losses++;
    else ties++;
  }
  return { arm, ref, meanDelta: mean(ds), perTask, wins, losses, ties, signTestP: signTest(wins, losses) };
}

export function processMetrics(finals, arms) {
  const out = {};
  for (const arm of arms) {
    const rs = finals.filter((r) => r.arm === arm && !r.contaminated && !r.infraError);
    const num = (f) => rs.map(f).filter((x) => Number.isFinite(x));
    const validateCalls = num((r) => r.pcgCommands?.validate ?? 0);
    const validateFails = num((r) => r.pcgFailures?.validate ?? 0);
    const totalValidate = validateCalls.reduce((a, b) => a + b, 0);
    const capCounts = {};
    for (const r of rs) for (const c of r.capsHit ?? []) capCounts[c] = (capCounts[c] ?? 0) + 1;
    const readShare = (key) => (rs.length ? rs.filter((r) => (r.readCounts?.[key] ?? 0) > 0).length / rs.length : null);
    out[arm] = {
      runs: rs.length,
      turnsMean: mean(num((r) => r.turns)),
      turnsMedian: median(num((r) => r.turns)),
      toolCallsMean: mean(num((r) => r.toolCalls)),
      validateCallsMean: mean(validateCalls),
      validateFailureRate: totalValidate ? validateFails.reduce((a, b) => a + b, 0) / totalValidate : null,
      probeGraphsMean: mean(num((r) => r.probeGraphsWritten ?? 0)),
      outputTokensMean: mean(num((r) => r.usage?.output_tokens)),
      wallMinutesMean: mean(num((r) => (r.wallMs ?? NaN) / 60_000)),
      capsHit: capCounts,
      readShare: { llms: readShare("llms"), docs: readShare("docs"), skills: readShare("skills"), graphs: readShare("graphs") },
      graphProducedRate: rs.length ? rs.filter((r) => r.graphProduced ?? r.score?.graphProduced).length / rs.length : null,
    };
  }
  return out;
}

/**
 * The gate. `gate` = { label?, baselineArms: [A, A'], strippedArm, aaMaxGap,
 * strippedMinMargin, effortMetric?, strippedEffortMinMargin?, aaMaxEffortGap?,
 * effortCiMustExcludeZero? }.
 *
 * With no effort thresholds configured this is the pilot gate, byte for byte:
 * limb (a) is the solved comparison alone and (b) checks the solved gap alone.
 * Configure `strippedEffortMinMargin` and the stripped arm may instead fail
 * the baselines by COSTING more — which is what a ceiling-saturated campaign
 * leaves to measure. `effort` (from `effortMetrics`) must be passed for the
 * effort limb to be evaluated; without it the limb reports `unavailable`.
 */
export function evaluateGate(summary, tasks, gate, { complete, effort = null, bootstrap } = {}) {
  const reasons = [];
  const [a1, a2] = gate.baselineArms ?? [];
  const s = gate.strippedArm;
  const arms = Object.keys(summary.byArm);
  const label = gate.label ?? "Pilot gate";
  const missing = [a1, a2, s].filter((x) => !x || !arms.includes(x));
  if (missing.length) {
    return { decision: "stop", complete, label, reasons: [`gate arms not in the campaign: ${missing.join(", ") || "(unset)"}; configure gate.baselineArms and gate.strippedArm`], a: null, b: null, c: null };
  }
  const pA = summary.byArm[a1].p;
  const pA2 = summary.byArm[a2].p;
  const pS = summary.byArm[s].p;
  const aaGap = pA !== null && pA2 !== null ? Math.abs(pA - pA2) : null;
  const margin = Math.max(aaGap ?? 0, gate.strippedMinMargin ?? 0);
  const dA = pA !== null && pS !== null ? pA - pS : null;
  const dA2 = pA2 !== null && pS !== null ? pA2 - pS : null;
  // Rates are k/n in floating point: 14/18 - 10/18 and 10/18 - 6/18 are the
  // same gap but need not be the same double. EPS keeps a tie a tie.
  const EPS = 1e-9;
  const solvedPass = dA !== null && dA2 !== null && aaGap !== null && dA > aaGap + EPS && dA2 > aaGap + EPS && Math.min(dA, dA2) >= (gate.strippedMinMargin ?? 0) - EPS;

  // --- effort: the A/A gap for (b), then the limb for (a) ------------------
  // Both are computed whenever EITHER threshold is configured. Deriving the
  // A/A gap only when `strippedEffortMinMargin` happens to be set would let
  // `aaMaxEffortGap` be configured and silently never checked.
  const limbConfigured = Number.isFinite(gate.strippedEffortMinMargin);
  const aaEffortConfigured = Number.isFinite(gate.aaMaxEffortGap);
  const metricKey = gate.effortMetric ?? "turns";
  let effortLimb = null;
  let aaEffortGap = null;
  let aaEffortTasks = null;
  let effortUnavailable = null;
  if (limbConfigured || aaEffortConfigured) {
    if (!effort) effortUnavailable = "no effort data was passed to the gate";
    else if (!EFFORT_METRICS.some((m) => m.key === metricKey)) effortUnavailable = `gate.effortMetric "${metricKey}" is not one of ${EFFORT_METRICS.map((m) => m.key).join(", ")}`;
    else {
      const opts = bootstrap ?? {};
      // A relative difference is asymmetric (130 is 30% above 100; 100 is 23%
      // below 130), so taking it in one direction only would make the A/A gap
      // depend on the order of gate.baselineArms. Take the larger magnitude:
      // order-independent, and the conservative one.
      const aaBoth = [pairedEffort(effort, tasks, a2, a1, opts).metrics[metricKey], pairedEffort(effort, tasks, a1, a2, opts).metrics[metricKey]];
      const mags = aaBoth.map((m) => m.meanRelative).filter((x) => Number.isFinite(x)).map(Math.abs);
      aaEffortGap = mags.length ? Math.max(...mags) : null;
      aaEffortTasks = aaBoth[0].tasks;
    }
  }
  if (limbConfigured) {
    const req = gate.strippedEffortMinMargin;
    if (effortUnavailable) {
      effortLimb = { pass: false, unavailable: effortUnavailable, metric: metricKey, requiredMargin: req };
    } else {
      const opts = bootstrap ?? {};
      const needCi = gate.effortCiMustExcludeZero !== false;
      const checks = [a1, a2].map((base) => {
        const m = pairedEffort(effort, tasks, s, base, opts).metrics[metricKey];
        const rel = m.meanRelative;
        const okMargin = Number.isFinite(rel) && rel >= req - EPS;
        const okAboveNoise = Number.isFinite(rel) && aaEffortGap !== null && rel > aaEffortGap + EPS;
        const okCi = !needCi || (Number.isFinite(m.relativeCi.lo) && m.relativeCi.lo > 0);
        return { base, relative: rel, ci: m.relativeCi, tasks: m.tasks, higherOn: m.higher, lowerOn: m.lower, signTestP: m.signTestP, okMargin, okAboveNoise, okCi, pass: okMargin && okAboveNoise && okCi };
      });
      effortLimb = {
        pass: checks.every((c) => c.pass),
        metric: metricKey,
        requiredMargin: req,
        requiredAboveAaGap: aaEffortGap,
        ciMustExcludeZero: needCi,
        aaEffortGap,
        aaTasks: aaEffortTasks,
        perBaseline: Object.fromEntries(checks.map((c) => [c.base, c])),
      };
    }
  }

  const aPass = solvedPass || effortLimb?.pass === true;
  const firedBy = solvedPass ? "solved" : effortLimb?.pass ? "effort" : null;
  const a = {
    pass: aPass,
    firedBy,
    solvedPass,
    strippedArm: s,
    baseline: { [a1]: pA, [a2]: pA2 },
    stripped: pS,
    deltas: { [a1]: dA, [a2]: dA2 },
    aaGap,
    requiredMargin: margin,
    effort: effortLimb,
  };
  if (!aPass) {
    reasons.push(`(a) stripped arm ${fmt(pS)} is not below both baselines (${fmt(pA)}, ${fmt(pA2)}) by more than the A/A gap ${fmt(aaGap)} and at least ${fmt(gate.strippedMinMargin ?? 0)}: the eval may not see documentation`);
    if (effortLimb) {
      reasons.push(
        effortLimb.unavailable
          ? `(a) the effort limb could not be evaluated: ${effortLimb.unavailable}`
          : `(a) nor does it cost more: ${metricKey} paired by task is ${[a1, a2].map((base) => `${fmt(effortLimb.perBaseline[base].relative)} vs ${base} (95% ${fmt(effortLimb.perBaseline[base].ci.lo)}–${fmt(effortLimb.perBaseline[base].ci.hi)})`).join(", ")}, needing ${fmt(effortLimb.requiredMargin)} and more than the A/A effort gap ${fmt(aaEffortGap)}${effortLimb.ciMustExcludeZero ? " with the interval clear of zero" : ""}`,
      );
    }
  }
  const aaEffortMax = gate.aaMaxEffortGap;
  const bSolved = aaGap !== null && aaGap <= gate.aaMaxGap + EPS;
  // Configured but unmeasurable fails CLOSED, as the (a) limb does: a check
  // that cannot be run has not passed.
  const bEffort = !aaEffortConfigured ? null : aaEffortGap === null ? false : aaEffortGap <= aaEffortMax + EPS;
  const bPass = bSolved && bEffort !== false;
  const b = { pass: bPass, aaGap, aaMaxGap: gate.aaMaxGap, solvedPass: bSolved, aaEffortGap, aaEffortTasks, aaMaxEffortGap: aaEffortMax ?? null, effortPass: bEffort };
  if (!bSolved) reasons.push(`(b) A/A gap ${fmt(aaGap)} exceeds gate.aaMaxGap ${fmt(gate.aaMaxGap)}: noise swamps the comparison`);
  if (bEffort === false) {
    reasons.push(
      aaEffortGap === null
        ? `(b) the A/A effort gap could not be measured, so gate.aaMaxEffortGap ${fmt(aaEffortMax)} could not be checked: ${effortUnavailable ?? `no task has countable runs on both ${a1} and ${a2}`}`
        : `(b) A/A effort gap on ${metricKey} ${fmt(aaEffortGap)} exceeds gate.aaMaxEffortGap ${fmt(aaEffortMax)}: the same tarball under two labels already differs that much, so an effort difference means nothing`,
    );
  }
  // A task with no countable runs (all contaminated or infrastructure) measured nothing: it fails (c) too.
  const floorCeiling = tasks.filter((t) => summary.byTask[t].n === 0 || summary.byTask[t].solved === 0 || summary.byTask[t].solved === summary.byTask[t].n);
  const at = (t) => (summary.byTask[t].n === 0 ? "no-data" : summary.byTask[t].solved === 0 ? "floor" : "ceiling");
  const c = {
    pass: floorCeiling.length === 0,
    replaceTasks: floorCeiling.map((t) => ({ task: t, solved: summary.byTask[t].solved, n: summary.byTask[t].n, at: at(t) })),
  };
  if (!c.pass) reasons.push(`(c) task(s) at floor or ceiling across all arms, replace from reserve: ${c.replaceTasks.map((x) => `${x.task} (${x.at})`).join(", ")}`);
  if (!complete) return { decision: "pending", complete, label, reasons: ["campaign incomplete: the gate is evaluated only on a finished campaign", ...reasons], a, b, c };
  const decision = aPass && bPass && c.pass ? "go" : "stop";
  if (decision === "stop" && !reasons.some((r) => r.startsWith("fix:"))) {
    reasons.push(
      `fix: ${[
        !aPass ? `make the ${s} arm cost something — harder tasks (limb (c) names the saturated ones), or a stronger strip set — because ${solvedPass === false && effortLimb && !effortLimb.unavailable ? "neither solved rate nor effort separated it from the baselines" : "the arms did not separate"}` : null,
        !bPass ? `shrink the A/A gap before comparing anything: more runs per task, or tasks whose outcome is less of a coin flip` : null,
        !c.pass ? `replace the floor/ceiling task(s) from the reserve and re-run` : null,
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  return { decision, complete, label, reasons, a, b, c };
}

function fmt(x) {
  return x === null || x === undefined || Number.isNaN(x) ? "n/a" : `${(x * 100).toFixed(1)}%`;
}

/** Stated in the report, so a reader never has to open this file to know what the interval is. */
export const EFFORT_METHOD =
  "Effort is summarised as the MEDIAN over runs, not the mean: one run that hits its turn cap would otherwise move an arm on its own. " +
  "The comparison against the baseline arm is PAIRED BY TASK — per task, the difference of the two arms' medians, and that difference as a fraction of the baseline's median, since a task's turn count is set by the task. " +
  "The aggregate is the mean of those per-task values, with a 95% percentile bootstrap over TASKS (2000 resamples, seeded, so the same runs.jsonl always prints the same interval) and an exact two-sided sign test on the per-task signs. " +
  "The bootstrap treats the tasks as the sample: it answers 'would another set of tasks like these show the same difference', which is the question a campaign of a handful of tasks can ask. " +
  "The A/A pair is the noise floor: whatever separates the same tarball under two labels is what run-to-run wobble looks like here, and an effect smaller than that is not an effect.";

/**
 * A calibration campaign: one arm, one run per task, no gate. Declared with
 * `gate.mode: "calibration"`; a single-arm single-run campaign counts as one
 * anyway, because that is all a calibration is.
 */
export function isCalibration(manifest) {
  if (manifest?.gate?.mode === "calibration") return true;
  return (manifest?.arms?.length ?? 0) === 1 && manifest?.runsPerTask === 1;
}

/**
 * One row per task: what that task cost on the one arm, and whether it
 * solved. This is what picking the tasks for a campaign reads — a task that
 * solves in nine turns is at the ceiling, and one that burns the turn cap
 * without a graph is at the floor, and neither belongs in a comparison.
 */
export function calibrationTable(finals, manifest, arms, tasks) {
  const arm = arms[0];
  const rows = tasks.map((task) => {
    const rs = finals.filter((r) => r.task === task && r.arm === arm);
    const counted = countableRuns(rs);
    const pick = (of) => median(counted.map(of).filter((x) => Number.isFinite(x)));
    const capsHit = [...new Set(counted.flatMap((r) => r.capsHit ?? []))];
    return {
      task,
      tier: manifest.tasks?.find((t) => t.id === task)?.tier ?? null,
      runs: counted.length,
      solved: counted.length ? counted.filter((r) => r.solved === true).length : null,
      graphProduced: counted.length ? counted.filter((r) => r.graphProduced ?? r.score?.graphProduced).length : null,
      turns: pick((r) => r.turns),
      toolCalls: pick((r) => r.toolCalls),
      wallMinutes: pick((r) => (r.wallMs ?? NaN) / 60_000),
      outputTokens: pick((r) => r.usage?.output_tokens),
      validateCalls: pick((r) => r.pcgCommands?.validate ?? 0),
      capsHit,
      contaminated: rs.filter((r) => r.contaminated).length,
      infraError: rs.filter((r) => r.infraError).length,
      outcome: counted[counted.length - 1]?.outcome ?? null,
      scorerError: counted.some((r) => r.scorerError),
    };
  });
  const totals = {
    tasks: rows.length,
    runs: rows.reduce((a, r) => a + r.runs, 0),
    solved: rows.reduce((a, r) => a + (r.solved ?? 0), 0),
    turnsMedian: median(rows.map((r) => r.turns).filter((x) => Number.isFinite(x))),
    wallMinutesTotal: rows.reduce((a, r) => a + (Number.isFinite(r.wallMinutes) ? r.wallMinutes : 0), 0),
    outputTokensTotal: rows.reduce((a, r) => a + (Number.isFinite(r.outputTokens) ? r.outputTokens : 0), 0),
    capsHit: [...new Set(rows.flatMap((r) => r.capsHit))],
    contaminated: rows.reduce((a, r) => a + r.contaminated, 0),
  };
  return { arm, rows, totals };
}

/** The calibration table as markdown. */
export function renderCalibration(report) {
  const c = report.calibration;
  const n1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "n/a");
  const n0 = (x) => (Number.isFinite(x) ? Math.round(x).toString() : "n/a");
  const L = [];
  L.push(`# Calibration: ${report.campaign}`, "");
  L.push(`Generated ${report.generatedAt}. Model \`${report.model}\`, arm \`${c.arm}\`, one run per task.`);
  L.push(`Progress: ${report.progress.done}/${report.progress.total} slots${report.progress.complete ? "" : " (INCOMPLETE)"}. No gate: one run per task decides nothing, it only says what a task costs.`, "");
  L.push("| task | tier | solved | turns | tool calls | wall min | out tokens | validate | caps hit | contaminated |");
  L.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of c.rows) {
    const solved = r.runs === 0 ? "no data" : r.solved === r.runs ? "yes" : r.solved ? `${r.solved}/${r.runs}` : r.graphProduced ? "no" : "no graph";
    L.push(`| ${r.task} | ${r.tier ?? "–"} | ${solved} | ${n0(r.turns)} | ${n0(r.toolCalls)} | ${n1(r.wallMinutes)} | ${n0(r.outputTokens)} | ${n0(r.validateCalls)} | ${r.capsHit.join(" ") || "–"} | ${r.contaminated || "–"} |`);
  }
  L.push(`| **total** | | **${c.totals.solved}/${c.totals.runs}** | median ${n0(c.totals.turnsMedian)} | | ${n1(c.totals.wallMinutesTotal)} | ${n0(c.totals.outputTokensTotal)} | | ${c.totals.capsHit.join(" ") || "–"} | ${c.totals.contaminated || "–"} |`, "");
  L.push("A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.", "");
  if (report.contaminated.length) L.push(`Contaminated after retry (excluded): ${report.contaminated.join(", ")}`, "");
  if (report.infraErrors.length) L.push(`Infrastructure errors (excluded): ${report.infraErrors.map((e) => `${e.slotId}: ${e.error}`).join("; ")}`, "");
  if (report.scorerErrors?.length) L.push(`Scorer errors (counted as unsolved): ${report.scorerErrors.map((e) => `${e.slotId}: ${e.error.slice(0, 160)}`).join("; ")}`, "");
  return L.join("\n") + "\n";
}

export function buildReport({ manifest, records }) {
  const arms = manifest.arms.map((a) => a.label);
  const tasks = manifest.tasks.map((t) => t.id);
  const finalsMap = latestBySlot(records);
  const scheduled = new Set(manifest.schedule.map((s) => s.slotId));
  const finals = [...finalsMap.values()].filter((r) => scheduled.has(r.slotId));
  const done = manifest.schedule.filter((s) => {
    const r = finalsMap.get(s.slotId);
    return r && r.final !== false;
  }).length;
  const complete = done === manifest.schedule.length;
  const summary = summarize(finals, arms, tasks);
  const ref = manifest.gate?.baselineArms?.[0] ?? arms[0];
  const deltas = arms.filter((a) => a !== ref).map((a) => pairedDelta(summary, tasks, a, ref));
  const metrics = processMetrics(finals, arms);
  const effort = effortMetrics(finals, arms, tasks);
  const effortPaired = arms.filter((a) => a !== ref).map((a) => pairedEffort(effort, tasks, a, ref));
  const calibration = isCalibration(manifest) ? calibrationTable(finals, manifest, arms, tasks) : null;
  // One run per task proves nothing about an arm: a calibration campaign is
  // measured, never gated.
  const gate = manifest.gate && !calibration ? evaluateGate(summary, tasks, manifest.gate, { complete, effort }) : null;
  // Replacement proposal for (c): reserve tasks in id order, one per task to drop.
  let proposedReplacement = null;
  if (gate?.c && !gate.c.pass) {
    const drop = gate.c.replaceTasks.map((x) => x.task);
    const reserve = (manifest.reserveTasks ?? []).filter((id) => !tasks.includes(id));
    proposedReplacement = { drop, add: reserve.slice(0, drop.length), short: Math.max(0, drop.length - reserve.length) };
  }
  const n = summary.byArm[arms[0]]?.n ?? 0;
  return {
    campaign: manifest.campaign,
    generatedAt: new Date().toISOString(),
    progress: { done, total: manifest.schedule.length, complete },
    model: manifest.model,
    claudeVersion: manifest.claudeVersion,
    claudeVersionsSeen: [...new Set(finals.map((r) => r.claudeVersion).filter(Boolean))],
    arms,
    tasks,
    summary,
    pairedDeltas: deltas,
    processMetrics: metrics,
    effort,
    effortPaired,
    effortRef: ref,
    effortMethod: EFFORT_METHOD,
    calibration,
    contaminated: finals.filter((r) => r.contaminated).map((r) => r.slotId),
    infraErrors: finals.filter((r) => r.infraError).map((r) => ({ slotId: r.slotId, error: r.infraError })),
    scorerErrors: finals.filter((r) => r.scorerError).map((r) => ({ slotId: r.slotId, error: r.scorerError })),
    gate,
    proposedReplacement,
    caveat: `n = ${n} runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.`,
  };
}

export function renderMarkdown(report) {
  const L = [];
  const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : "n/a");
  const n0 = (x) => (Number.isFinite(x) ? Math.round(x).toString() : "n/a");
  // A negative bound would otherwise render "-13%–-13%".
  const range = (lo, hi) => (Number.isFinite(lo) && Number.isFinite(hi) ? (lo < 0 || hi < 0 ? `${pct(lo)} to ${pct(hi)}` : `${pct(lo)}–${pct(hi)}`) : "n/a");
  L.push(`# Eval report: ${report.campaign}`, "");
  L.push(`Generated ${report.generatedAt}. Model \`${report.model}\`, Claude Code ${report.claudeVersion}${report.claudeVersionsSeen.length > 1 ? ` (versions seen: ${report.claudeVersionsSeen.join(", ")})` : ""}.`);
  L.push(`Progress: ${report.progress.done}/${report.progress.total} slots${report.progress.complete ? "" : " (INCOMPLETE)"}.`, "");
  L.push(`> ${report.caveat}`, "");
  L.push("## Solved, per task and arm (Wilson 95%)", "");
  L.push(`| task | ${report.arms.join(" | ")} | pooled |`);
  L.push(`|---|${report.arms.map(() => "---").join("|")}|---|`);
  for (const t of report.tasks) {
    const cells = report.arms.map((a) => {
      const c = report.summary.cell[t][a];
      return c.n ? `${c.solved}/${c.n} (${pct(c.lo)}–${pct(c.hi)})` : "–";
    });
    const p = report.summary.byTask[t];
    L.push(`| ${t} | ${cells.join(" | ")} | ${p.solved}/${p.n} |`);
  }
  L.push(`| **all** | ${report.arms.map((a) => {
    const c = report.summary.byArm[a];
    return `**${c.solved}/${c.n}** ${pct(c.p)} (${pct(c.lo)}–${pct(c.hi)})`;
  }).join(" | ")} | |`, "");
  L.push("## Paired by task", "");
  for (const d of report.pairedDeltas) {
    L.push(`- **${d.arm} − ${d.ref}**: mean per-task delta ${d.meanDelta === null ? "n/a" : `${(d.meanDelta * 100).toFixed(1)} pts`}; better on ${d.wins}, worse on ${d.losses}, tied on ${d.ties} tasks (sign test p = ${d.signTestP.toFixed(3)})`);
  }
  L.push("", "## Process metrics", "");
  L.push("| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|");
  const n1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "n/a");
  for (const a of report.arms) {
    const m = report.processMetrics[a];
    L.push(`| ${a} | ${m.runs} | ${n1(m.turnsMean)} / ${n1(m.turnsMedian)} | ${n1(m.toolCallsMean)} | ${n1(m.validateCallsMean)} | ${pct(m.validateFailureRate)} | ${n1(m.probeGraphsMean)} | ${n1(m.outputTokensMean)} | ${n1(m.wallMinutesMean)} | ${pct(m.readShare.llms)} / ${pct(m.readShare.docs)} / ${pct(m.readShare.skills)} / ${pct(m.readShare.graphs)} | ${Object.entries(m.capsHit).map(([k, v]) => `${k}:${v}`).join(" ") || "–"} |`);
  }
  if (report.effort) {
    const em = (a, k) => report.effort.byArm[a]?.metrics?.[k] ?? {};
    const mid = (a, k, f = n1) => {
      const m = em(a, k);
      return m.median === null || m.median === undefined ? "n/a" : `${f(m.median)} [${f(m.p25)}–${f(m.p75)}]`;
    };
    L.push("", "## Effort per arm — median [p25–p75]", "");
    L.push("| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |");
    L.push(`|---|${new Array(11).fill("---").join("|")}|`);
    for (const a of report.arms) {
      const e = report.effort.byArm[a];
      L.push(
        `| ${a} | ${e.runs} | ${mid(a, "turns", n0)} | ${mid(a, "toolCalls", n0)} | ${mid(a, "wallMinutes")} | ${mid(a, "outputTokens", n0)} | ${mid(a, "validateCalls", n0)} | ${pct(e.validateFailureRate)} | ${mid(a, "probeGraphs", n0)} | ${pct(e.readShare.llms)} / ${pct(e.readShare.docs)} / ${pct(e.readShare.skills)} / ${pct(e.readShare.graphs)} | ${Object.entries(e.capsHit).map(([k, v]) => `${k}:${v}`).join(" ") || "–"} | ${pct(e.graphProducedRate)} |`,
      );
    }
    const gateMetric = report.gate?.a?.effort?.metric ?? "turns";
    const gm = EFFORT_METRICS.find((m) => m.key === gateMetric) ?? EFFORT_METRICS[0];
    L.push("", `### ${gm.label} per task (median)`, "");
    L.push(`| task | ${report.arms.join(" | ")} |`);
    L.push(`|---|${report.arms.map(() => "---").join("|")}|`);
    for (const t of report.tasks) {
      L.push(`| ${t} | ${report.arms.map((a) => n0(report.effort.cell[t]?.[a]?.metrics?.[gm.key]?.median)).join(" | ")} |`);
    }
    L.push("", `report.json carries every metric per task, not just ${gm.label}.`);
  }
  if (report.effortPaired?.length) {
    L.push("", `## Effort paired by task, against \`${report.effortRef}\``, "");
    L.push(`> ${report.effortMethod}`, "");
    L.push("| arm | metric | tasks | median Δ | mean Δ | Δ relative | 95% bootstrap (relative) | higher / lower / tied | sign p |");
    L.push(`|---|${new Array(8).fill("---").join("|")}|`);
    for (const p of report.effortPaired) {
      for (const m of EFFORT_METRICS) {
        const x = p.metrics[m.key];
        const ci = range(x.relativeCi.lo, x.relativeCi.hi);
        L.push(`| ${p.arm} | ${m.label} | ${x.tasks} | ${n1(x.medianDelta)} | ${n1(x.meanDelta)} | ${pct(x.meanRelative)} | ${ci} | ${x.higher} / ${x.lower} / ${x.ties} | ${x.signTestP.toFixed(3)} |`);
      }
    }
    L.push("", "\"higher\" means the arm spent MORE than the reference on that metric, which for effort is the arm doing worse. An interval spanning zero is a difference this campaign cannot tell from noise.");
  }
  if (report.contaminated.length) L.push("", `Contaminated after retry (excluded from rates): ${report.contaminated.join(", ")}`);
  if (report.infraErrors.length) L.push("", `Infrastructure errors (excluded): ${report.infraErrors.map((e) => `${e.slotId}: ${e.error}`).join("; ")}`);
  if (report.scorerErrors?.length) L.push("", `Scorer errors on the agent's graph (counted as unsolved): ${report.scorerErrors.map((e) => `${e.slotId}: ${e.error.slice(0, 160)}`).join("; ")}`);
  if (report.calibration) {
    L.push("", "## No gate", "", `\`${report.campaign}\` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.`);
  }
  if (report.gate) {
    const g = report.gate;
    L.push("", `## ${g.label ?? "Pilot gate"}: **${g.decision.toUpperCase()}**`, "");
    if (g.a) {
      L.push(`- (a) the ${g.a.strippedArm ?? "stripped"} arm is worse than both baselines${g.a.effort ? " on solved rate OR on effort" : ""}: ${g.a.pass ? `pass (fired by ${g.a.firedBy})` : "FAIL"}`);
      L.push(`  - solved: ${g.a.solvedPass ? "pass" : "FAIL"} — baselines ${Object.entries(g.a.baseline).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}, ${g.a.strippedArm ?? "stripped"} ${pct(g.a.stripped)}, A/A gap ${pct(g.a.aaGap)}, required margin ${pct(g.a.requiredMargin)}`);
      if (g.a.effort) {
        const e = g.a.effort;
        if (e.unavailable) L.push(`  - effort: not evaluated — ${e.unavailable}`);
        else {
          L.push(`  - effort (${e.metric}): ${e.pass ? "pass" : "FAIL"} — needs ≥ ${pct(e.requiredMargin)} more than EACH baseline, above the A/A effort gap ${pct(e.aaEffortGap)}${e.ciMustExcludeZero ? ", interval clear of zero" : ""}`);
          for (const [base, c] of Object.entries(e.perBaseline)) {
            L.push(`    - vs ${base}: ${pct(c.relative)} (95% ${range(c.ci.lo, c.ci.hi)}) over ${c.tasks} tasks, higher on ${c.higherOn}, lower on ${c.lowerOn}, sign p = ${c.signTestP.toFixed(3)} — margin ${c.okMargin ? "ok" : "short"}, above A/A ${c.okAboveNoise ? "ok" : "no"}, interval ${c.okCi ? "ok" : "spans zero"}`);
          }
        }
      }
    }
    if (g.b) {
      L.push(`- (b) A/A gap within ${pct(g.b.aaMaxGap)}${g.b.aaMaxEffortGap !== null && g.b.aaMaxEffortGap !== undefined ? ` on solved and ${pct(g.b.aaMaxEffortGap)} on effort` : ""}: ${g.b.pass ? "pass" : "FAIL"} — solved gap ${pct(g.b.aaGap)}${g.b.aaEffortGap === null || g.b.aaEffortGap === undefined ? "" : `, effort gap ${pct(g.b.aaEffortGap)}`}`);
    }
    if (g.c) L.push(`- (c) no task at floor or ceiling: ${g.c.pass ? "pass" : `FAIL — replace ${g.c.replaceTasks.map((x) => `${x.task} (${x.at}, ${x.solved}/${x.n})`).join(", ")}`}`);
    for (const r of g.reasons) L.push(`- ${r}`);
    if (report.proposedReplacement) {
      const p = report.proposedReplacement;
      L.push(`- proposed replacement: drop ${p.drop.join(", ")}; add ${p.add.join(", ") || "(no reserve tasks)"}${p.short ? `; ${p.short} short of reserve tasks` : ""}`);
    }
  }
  return L.join("\n") + "\n";
}

export function writeReport(campaignDir) {
  const manifest = readJson(join(campaignDir, "manifest.json"));
  const runsPath = join(campaignDir, "runs.jsonl");
  const records = existsSync(runsPath) ? parseJsonl(readFileSync(runsPath, "utf8"), { tolerant: true }) : [];
  const report = buildReport({ manifest, records });
  writeFileSync(join(campaignDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(campaignDir, "report.md"), renderMarkdown(report));
  if (report.calibration) writeFileSync(join(campaignDir, "calibration.md"), renderCalibration(report));
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const campaign = get("--campaign");
  if (!campaign) {
    console.error("usage: node evals/harness/report.mjs --campaign <name> [--results-dir evals/results]");
    process.exit(2);
  }
  const dir = join(resolve(get("--results-dir") ?? join(EVALS_DIR, "results")), campaign);
  if (!existsSync(join(dir, "manifest.json"))) {
    console.error(`report: no manifest at ${dir}; has the campaign started?`);
    process.exit(2);
  }
  const r = writeReport(dir);
  console.log(`report: ${join(dir, "report.md")} (${r.progress.done}/${r.progress.total} slots, gate ${r.gate?.decision ?? (r.calibration ? "n/a — calibration" : "n/a")})`);
  if (r.calibration) console.log(`calibration: ${join(dir, "calibration.md")} (${r.calibration.totals.solved}/${r.calibration.totals.runs} solved on arm ${r.calibration.arm})`);
}
