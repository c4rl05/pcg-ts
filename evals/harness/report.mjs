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
 *   deltas of each arm against the first baseline arm (exact sign test), PLUS
 *   the stripped arm against `gate.strippedRefArm` when that is a different
 *   arm. Both contrasts are already in the schedule and answer different
 *   questions: candidate vs baseline is "did the work help", stripped vs the
 *   tarball it was CUT FROM is "can these tasks see documentation at all".
 * - Process metrics (the pilot's table, kept for continuity) plus EFFORT:
 *   turns, tool calls, wall minutes, output tokens, `pcg validate` calls and
 *   their failure rate, probe graphs, and what was read (llms/docs/skills/
 *   graphs) — per arm AND per task, as medians, with the same paired
 *   comparisons. Each carries a percentile bootstrap over TASKS, seeded per
 *   (arm, ref, metric) so six metric rows are six independent draws and not
 *   one draw shown six times, and an exact sign test. The A/A pair is the
 *   noise floor for effort exactly as it is for solved.
 * - The GATE, go iff
 *   (a) the stripped arm is worse than its REFERENCE arms — `strippedRefArm`
 *       when set, else the baselines — EITHER on solved rate (below each by
 *       more than the A/A gap and by at least `gate.strippedMinMargin`) OR on
 *       effort (at least `gate.strippedEffortMinMargin` more
 *       `gate.effortMetric` than each, as a fraction of it, paired by task,
 *       by more than the A/A effort gap, with the bootstrap interval clear of
 *       zero). The report says which limb fired;
 *   (b) the A/A gap |A - A'| is at most `gate.aaMaxGap`, and (when effort
 *       thresholds are configured) the A/A effort gap is at most
 *       `gate.aaMaxEffortGap`;
 *   (c) no task sits at 0% or 100% solved — pooled across all arms, AND
 *       across the reference arms on their own, because a task the references
 *       already ace cannot move the contrast whatever the stripped arm does.
 *   A campaign with unfinished slots reports `pending`, never go or stop.
 *   A campaign whose gate configures no effort thresholds is the pilot gate,
 *   unchanged: limb (a) is solved-only and (b) checks the solved gap alone.
 *
 *   A threshold that is absent, null or unmeasurable never passes its check.
 *   `strippedMinMargin ?? 0` made a missing margin the easiest one to clear,
 *   and `null + EPS` made a null `aaMaxGap` pass only an exactly-zero gap.
 *
 * CALIBRATION campaigns (`gate.mode: "calibration"`, or one arm at one run
 * per task) skip the gate — one run proves nothing — and get `calibration.md`:
 * one row per task with solved, turns, tool calls, wall minutes, output
 * tokens, caps hit and contamination, which is what picking the tasks for a
 * campaign needs. `gate` is MERGED from the config defaults, so the mode is
 * honoured only when the campaign really is one arm at one run per task and
 * refused loudly otherwise: a stray key must not void a real campaign's gate.
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

/**
 * The record that counts for each slot: the LATEST ATTEMPT, not merely the
 * last line. Attempts are appended in order, so the two agree on a healthy
 * file — but selecting by position alone means a re-ordered or concatenated
 * runs.jsonl can retire a clean retry in favour of the contaminated attempt
 * it superseded, which silently drops a run from the rates. Keying on
 * `attempt` makes the choice a property of the records. A NUMERIC `attempt`
 * always beats a record without one, whatever their order; among records that
 * all lack one, position decides. run.mjs writes `attempt` on every record,
 * so the mixed case only arises in a hand-edited file.
 */
export function latestBySlot(records) {
  const m = new Map();
  const rank = new Map();
  records.forEach((r, i) => {
    const key = r.slotId;
    const score = Number.isFinite(r.attempt) ? r.attempt : -1;
    const prev = rank.get(key);
    // Higher attempt wins; equal or unknown attempts fall back to later position.
    if (prev === undefined || score > prev.score || (score === prev.score && i > prev.index)) {
      rank.set(key, { score, index: i });
      m.set(key, r);
    }
  });
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
 * A seed derived from a base seed and a label (FNV-1a over the label, folded
 * in). Two metrics bootstrapped from one seed draw the SAME resample indices,
 * so their intervals move together and six rows read as six independent views
 * of the data when they are one. Deterministic: the same label always gives
 * the same seed, so re-running the report prints the same intervals.
 */
export function seedFor(seed, label) {
  let h = 0x811c9dc5 ^ (seed >>> 0);
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
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

/**
 * The turn budget each task actually ran under, taken from the records rather
 * than the caps: a task's own `budgets.turns` REPLACES the campaign cap, and
 * the campaign's `taskBudgets` may replace that again. A turn count printed
 * without the budget it is against cannot be read — 83 is comfortable under
 * 100 and truncated under 80 — so every effort figure is shown over its
 * budget. `varied` marks a task whose runs did not all share one budget,
 * which would mean the campaign changed under it.
 */
export function effectiveBudgets(finals, tasks) {
  const out = {};
  for (const task of tasks) {
    const seen = new Set();
    for (const r of finals) {
      if (r.task !== task) continue;
      const t = r.budgets?.turns;
      if (Number.isFinite(t)) seen.add(t);
    }
    const walls = new Set();
    for (const r of finals) {
      if (r.task !== task) continue;
      const w = r.budgets?.wallMinutes;
      if (Number.isFinite(w)) walls.add(w);
    }
    const values = [...seen].sort((a, b) => a - b);
    const wallValues = [...walls].sort((a, b) => a - b);
    out[task] = {
      turns: values.length ? values[values.length - 1] : null,
      wallMinutes: wallValues.length ? wallValues[wallValues.length - 1] : null,
      // Either budget disagreeing means the campaign changed under the task.
      varied: values.length > 1 || wallValues.length > 1,
      values,
      wallValues,
    };
  }
  return out;
}

/** `83/100`, or `83` when the budget is unknown. */
export function overBudget(value, budget, format = (x) => Math.round(x).toString()) {
  if (!Number.isFinite(value)) return "n/a";
  return Number.isFinite(budget) ? `${format(value)}/${format(budget)}` : format(value);
}

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
    // Each metric resamples on its own seed: one seed for all six would draw
    // the same task indices every time, and the six intervals would be one
    // draw shown six times rather than six independent ones.
    const base = opts.seed ?? 0x5eed;
    const seeded = (kind) => ({ ...opts, seed: seedFor(base, `${arm}|${ref}|${m.key}|${kind}`) });
    // `wins` counts "more effort"; for effort that is the arm doing worse.
    metrics[m.key] = {
      metric: m.key,
      tasks: deltas.length,
      // The relative CI is over `rel`, which drops any task whose reference
      // median is 0 (no relative difference is defined there). Quoting
      // `tasks` beside that interval would overstate its sample.
      relativeTasks: rel.length,
      perTask,
      meanDelta: mean(deltas),
      medianDelta: median(deltas),
      meanRelative: mean(rel),
      relativeCi: bootstrapCi(rel, mean, seeded("relative")),
      deltaCi: bootstrapCi(deltas, mean, seeded("delta")),
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
  // What limb (a) measures the stripped arm AGAINST. A strip arm answers a
  // question about the tarball it was CUT FROM: comparing `stripped-all`
  // (derived from candidate-U1) against a baseline built from a different
  // commit would measure "lost the docs" and "changed the library" as one
  // effect. Unset, the references are the baselines — the pilot's rule,
  // which was right there because its stripped arm was cut from its baseline.
  const refArms = gate.strippedRefArm ? [gate.strippedRefArm] : [a1, a2].filter(Boolean);
  const missing = [...new Set([a1, a2, s, ...refArms])].filter((x) => !x || !arms.includes(x));
  if (missing.length) {
    return { decision: "stop", complete, label, reasons: [`gate arms not in the campaign: ${missing.join(", ") || "(unset)"}; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm`], a: null, b: null, c: null };
  }
  const pA = summary.byArm[a1].p;
  const pA2 = summary.byArm[a2].p;
  const pS = summary.byArm[s].p;
  const aaGap = pA !== null && pA2 !== null ? Math.abs(pA - pA2) : null;
  // Rates are k/n in floating point: 14/18 - 10/18 and 10/18 - 6/18 are the
  // same gap but need not be the same double. EPS keeps a tie a tie.
  const EPS = 1e-9;

  // --- the solved limb -----------------------------------------------------
  // An ABSENT margin is not a margin of zero. `?? 0` made a missing threshold
  // the easiest one to clear — with a zero A/A gap a single run of difference
  // passed — so a limb with no threshold has no opinion instead, exactly as
  // the effort limb does.
  const solvedConfigured = Number.isFinite(gate.strippedMinMargin);
  const req = gate.strippedMinMargin;
  const margin = solvedConfigured ? Math.max(aaGap ?? 0, req) : null;
  const solvedChecks = refArms.map((ref) => {
    const pR = summary.byArm[ref].p;
    const d = pR !== null && pS !== null ? pR - pS : null;
    const okAboveNoise = d !== null && aaGap !== null && d > aaGap + EPS;
    const okMargin = solvedConfigured && d !== null && d >= req - EPS;
    return { ref, rate: pR, delta: d, okMargin, okAboveNoise, pass: okMargin && okAboveNoise };
  });
  const solvedPass = solvedConfigured && solvedChecks.length > 0 && solvedChecks.every((c) => c.pass);
  if (!solvedConfigured) reasons.push(`(a) gate.strippedMinMargin is not configured, so the solved limb has no threshold to meet and cannot fire`);

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
  /** task -> |relative effort difference| against its reference(s). */
  const effortSpread = new Map();
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
      const checks = refArms.map((ref) => {
        const m = pairedEffort(effort, tasks, s, ref, opts).metrics[metricKey];
        // Keep the per-task spread: limb (c) needs to know which individual
        // tasks separated the arms, not just the aggregate.
        for (const t of tasks) {
          const r = m.perTask[t]?.relative;
          const mag = Number.isFinite(r) ? Math.abs(r) : null;
          // A task must clear the noise floor against EVERY reference to
          // count as informative, so keep the smallest magnitude seen.
          if (mag !== null) effortSpread.set(t, effortSpread.has(t) ? Math.min(effortSpread.get(t), mag) : mag);
        }
        const rel = m.meanRelative;
        const okMargin = Number.isFinite(rel) && rel >= req - EPS;
        const okAboveNoise = Number.isFinite(rel) && aaEffortGap !== null && rel > aaEffortGap + EPS;
        const okCi = !needCi || (Number.isFinite(m.relativeCi.lo) && m.relativeCi.lo > 0);
        return { ref, relative: rel, ci: m.relativeCi, tasks: m.relativeTasks, higherOn: m.higher, lowerOn: m.lower, signTestP: m.signTestP, okMargin, okAboveNoise, okCi, pass: okMargin && okAboveNoise && okCi };
      });
      effortLimb = {
        pass: checks.length > 0 && checks.every((c) => c.pass),
        metric: metricKey,
        requiredMargin: req,
        requiredAboveAaGap: aaEffortGap,
        ciMustExcludeZero: needCi,
        aaEffortGap,
        aaTasks: aaEffortTasks,
        perReference: Object.fromEntries(checks.map((c) => [c.ref, c])),
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
    // The arms the stripped arm was measured against: the baselines, unless
    // `strippedRefArm` named its parent. `baseline` keeps the pilot's key.
    refArms,
    baseline: Object.fromEntries(solvedChecks.map((c) => [c.ref, c.rate])),
    stripped: pS,
    deltas: Object.fromEntries(solvedChecks.map((c) => [c.ref, c.delta])),
    solvedChecks,
    aaGap,
    requiredMargin: margin,
    effort: effortLimb,
  };
  if (!aPass && solvedConfigured) {
    reasons.push(`(a) stripped arm ${fmt(pS)} is not below ${refArms.length > 1 ? "both references" : `its reference ${refArms[0]}`} (${solvedChecks.map((c) => fmt(c.rate)).join(", ")}) by more than the A/A gap ${fmt(aaGap)} and at least ${fmt(req)}: the eval may not see documentation`);
  }
  if (!aPass && effortLimb) {
    reasons.push(
      effortLimb.unavailable
        ? `(a) the effort limb could not be evaluated: ${effortLimb.unavailable}`
        : `(a) nor does it cost more: ${metricKey} paired by task is ${refArms.map((ref) => `${fmt(effortLimb.perReference[ref].relative)} vs ${ref} (95% ${fmt(effortLimb.perReference[ref].ci.lo)}–${fmt(effortLimb.perReference[ref].ci.hi)})`).join(", ")}, needing ${fmt(effortLimb.requiredMargin)} and more than the A/A effort gap ${fmt(aaEffortGap)}${effortLimb.ciMustExcludeZero ? " with the interval clear of zero" : ""}`,
    );
  }
  const aaEffortMax = gate.aaMaxEffortGap;
  // `null + EPS` is 1e-9, so a null aaMaxGap used to pass only an exactly-zero
  // gap while `undefined` failed closed. Both are "not configured" now.
  const aaMaxConfigured = Number.isFinite(gate.aaMaxGap);
  const bSolved = aaMaxConfigured && aaGap !== null && aaGap <= gate.aaMaxGap + EPS;
  // Configured but unmeasurable fails CLOSED, as the (a) limb does: a check
  // that cannot be run has not passed.
  const bEffort = !aaEffortConfigured ? null : aaEffortGap === null ? false : aaEffortGap <= aaEffortMax + EPS;
  const bPass = bSolved && bEffort !== false;
  const b = { pass: bPass, aaGap, aaMaxGap: gate.aaMaxGap, solvedPass: bSolved, aaEffortGap, aaEffortTasks, aaMaxEffortGap: aaEffortMax ?? null, effortPass: bEffort };
  if (!bSolved) {
    reasons.push(
      !aaMaxConfigured
        ? `(b) gate.aaMaxGap is not a number (${JSON.stringify(gate.aaMaxGap ?? null)}), so the A/A gap has no bound to be within: set it before the campaign runs`
        : aaGap === null
          ? `(b) the A/A gap could not be measured (one of ${a1}, ${a2} has no countable runs), so gate.aaMaxGap ${fmt(gate.aaMaxGap)} could not be checked`
          : `(b) A/A gap ${fmt(aaGap)} exceeds gate.aaMaxGap ${fmt(gate.aaMaxGap)}: noise swamps the comparison`,
    );
  }
  if (bEffort === false) {
    reasons.push(
      aaEffortGap === null
        ? `(b) the A/A effort gap could not be measured, so gate.aaMaxEffortGap ${fmt(aaEffortMax)} could not be checked: ${effortUnavailable ?? `no task has countable runs on both ${a1} and ${a2}`}`
        : `(b) A/A effort gap on ${metricKey} ${fmt(aaEffortGap)} exceeds gate.aaMaxEffortGap ${fmt(aaEffortMax)}: the same tarball under two labels already differs that much, so an effort difference means nothing`,
    );
  }
  // (c) asks whether a task can DISCRIMINATE in the dimension the gate is
  // using. Solved saturation only disqualifies a task when the verdict rests
  // on solved: an 8/8-solved task that costs the stripped arm 40% more turns
  // is carrying the result, not blocking it. Calibration measured 10 solves
  // in 10 attempts, 5 of them one-shot, so a solved-only (c) would fail on
  // nearly every task while the signal we expect lives in effort.
  // A task with no countable runs (all contaminated or infrastructure)
  // measured nothing, and is saturated in every dimension.
  const saturated = (n, solved) => n === 0 || solved === 0 || solved === n;
  const at = (n, solved) => (n === 0 ? "no-data" : solved === 0 ? "floor" : "ceiling");
  const pooled = tasks.filter((t) => saturated(summary.byTask[t].n, summary.byTask[t].solved));
  const replaceTasks = pooled.map((t) => ({ task: t, solved: summary.byTask[t].solved, n: summary.byTask[t].n, at: at(summary.byTask[t].n, summary.byTask[t].solved) }));
  // Pooling every arm hides the case that matters most: references at 3/3 on
  // every task, with only the stripped arm missing, pools to 11/12 and passes
  // — yet the contrast cannot move, because its reference is already at the
  // ceiling. So check the arms the stripped arm is measured against on their
  // own too.
  const refScope = [...new Set([...refArms, a1, a2].filter(Boolean))];
  const already = new Set(pooled);
  for (const t of tasks) {
    if (already.has(t)) continue;
    let n = 0;
    let solved = 0;
    for (const arm of refScope) {
      n += summary.cell[t]?.[arm]?.n ?? 0;
      solved += summary.cell[t]?.[arm]?.solved ?? 0;
    }
    if (!saturated(n, solved)) continue;
    already.add(t);
    replaceTasks.push({ task: t, solved, n, at: `${at(n, solved)}-in-reference`, scope: refScope });
  }
  // Effort-flat: this task's arms differ by less than the campaign's own A/A
  // effort gap, so the row says nothing either way. `null` = not measurable,
  // which is not the same as flat and never counts as informative.
  const effortFlatness = new Map();
  for (const t of tasks) {
    const mag = effortSpread.get(t);
    effortFlatness.set(t, aaEffortGap === null || mag === undefined ? null : mag <= aaEffortGap + EPS);
  }
  // The dimension is the one the VERDICT rests on. When no limb fired the
  // gate stops regardless, and (c) is only advising which tasks to replace —
  // so it falls back to the solved question it has always asked rather than
  // to effort. Asking about effort there would be worse than useless: the
  // floor is the MEASURED A/A gap, which is 0 whenever the two baselines
  // happen to share a median (common with small integer turn counts), and a
  // floor of 0 makes every non-identical task "informative". That would have
  // quietly passed (c) on a campaign the old rule failed.
  const dimension = firedBy ?? "solved";
  const informativeSolved = (t) => !already.has(t);
  const informativeEffort = (t) => effortFlatness.get(t) === false;
  const informative = (t) => (dimension === "effort" ? informativeEffort(t) : informativeSolved(t));
  // Everything that blocks must also be listed for replacement, or the report
  // proposes swapping tasks that were fine and keeps the one that stopped the
  // gate. `flatness === null` (no measurable effort for this task) blocks in
  // the effort dimension, so it needs an entry of its own.
  if (dimension === "effort") {
    for (const t of tasks) {
      if (already.has(t) || informativeEffort(t)) continue;
      already.add(t);
      const flat = effortFlatness.get(t) === true;
      replaceTasks.push({
        task: t,
        solved: summary.byTask[t].solved,
        n: summary.byTask[t].n,
        at: flat ? "flat-in-effort" : "no-effort-data",
        relative: effortSpread.get(t) ?? null,
        aaEffortGap,
      });
    }
  }
  const blocking = tasks.filter((t) => !informative(t));
  const c = { pass: blocking.length === 0, dimension, blocking, replaceTasks };
  if (!c.pass) {
    const why = dimension === "effort" ? `cannot separate the arms on ${metricKey} by more than the A/A effort gap ${fmt(aaEffortGap)}` : "at floor or ceiling on solved";
    reasons.push(`(c) ${blocking.length} of ${tasks.length} task(s) ${why}, replace from reserve: ${blocking.join(", ")}`);
  }
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
  "Each comparison is PAIRED BY TASK — per task, the difference of the two arms' medians, and that difference as a fraction of the REFERENCE arm's median, since a task's turn count is set by the task. The stripped arm's reference is the tarball it was cut from, not the baseline: against a build from another commit, losing the docs and changing the library would be one effect. " +
  "The aggregate is the mean of those per-task values, with a 95% percentile bootstrap over TASKS (2000 resamples, seeded per arm/reference/metric — so the same runs.jsonl always prints the same interval, and the metric rows are independent draws rather than one draw repeated) and an exact two-sided sign test on the per-task signs. " +
  "The bootstrap treats the tasks as the sample: it answers 'would another set of tasks like these show the same difference', which is the question a campaign of a handful of tasks can ask. " +
  "The A/A pair is the noise floor: whatever separates the same tarball under two labels is what run-to-run wobble looks like here, and an effect smaller than that is not an effect.";

/** Does the campaign have a calibration's SHAPE: one arm, one run per task. */
export function hasCalibrationShape(manifest) {
  return (manifest?.arms?.length ?? 0) === 1 && manifest?.runsPerTask === 1;
}

/** The message a mismatched `gate.mode: "calibration"` is refused with. */
export function calibrationShapeError(manifest, where = "manifest") {
  const arms = manifest?.arms?.length ?? 0;
  const runs = manifest?.runsPerTask;
  return (
    `${where}: gate.mode is "calibration" but the campaign has ${arms} arm${arms === 1 ? "" : "s"} and ${runs} run${runs === 1 ? "" : "s"} per task. ` +
    `Calibration means one arm at one run per task; on anything else it silently disables the gate and prints a per-task table claiming to be one run of one arm. ` +
    `Remove gate.mode, or make the campaign one arm at runsPerTask 1.`
  );
}

/**
 * A calibration campaign: one arm, one run per task, no gate. Declared with
 * `gate.mode: "calibration"`; a single-arm single-run campaign counts as one
 * anyway, because that is all a calibration is.
 *
 * `gate` is MERGED from the config defaults, so one stray `mode` key was
 * enough to void the gate on a full campaign and print a table describing
 * data that was never collected. The mode is honoured only when the shape
 * agrees, and refused loudly when it does not.
 */
export function isCalibration(manifest) {
  if (manifest?.gate?.mode === "calibration") {
    if (!hasCalibrationShape(manifest)) throw new Error(calibrationShapeError(manifest));
    return true;
  }
  return hasCalibrationShape(manifest);
}

/**
 * One row per task: what that task cost on the one arm, and whether it
 * solved. This is what picking the tasks for a campaign reads — a task that
 * solves in nine turns is at the ceiling, and one that burns the turn cap
 * without a graph is at the floor, and neither belongs in a comparison.
 */
export function calibrationTable(finals, manifest, arms, tasks) {
  const arm = arms[0];
  const budgets = effectiveBudgets(finals, tasks);
  const rows = tasks.map((task) => {
    const rs = finals.filter((r) => r.task === task && r.arm === arm);
    const counted = countableRuns(rs);
    const pick = (of) => median(counted.map(of).filter((x) => Number.isFinite(x)));
    const capsHit = [...new Set(counted.flatMap((r) => r.capsHit ?? []))];
    const budget = budgets[task] ?? { turns: null, varied: false };
    return {
      task,
      tier: manifest.tasks?.find((t) => t.id === task)?.tier ?? null,
      runs: counted.length,
      turnsBudget: budget.turns,
      turnsBudgetVaried: budget.varied,
      wallBudget: budget.wallMinutes,
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
  L.push("| task | tier | solved | turns / budget | tool calls | wall min / budget | out tokens | validate | caps hit | contaminated |");
  L.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of c.rows) {
    const solved = r.runs === 0 ? "no data" : r.solved === r.runs ? "yes" : r.solved ? `${r.solved}/${r.runs}` : r.graphProduced ? "no" : "no graph";
    L.push(`| ${r.task} | ${r.tier ?? "–"} | ${solved} | ${overBudget(r.turns, r.turnsBudget)}${r.turnsBudgetVaried ? " ⚠" : ""} | ${n0(r.toolCalls)} | ${overBudget(r.wallMinutes, r.wallBudget, (x) => x.toFixed(1))} | ${n0(r.outputTokens)} | ${n0(r.validateCalls)} | ${r.capsHit.join(" ") || "–"} | ${r.contaminated || "–"} |`);
  }
  L.push(`| **total** | | **${c.totals.solved}/${c.totals.runs}** | median ${n0(c.totals.turnsMedian)} | | ${n1(c.totals.wallMinutesTotal)} | ${n0(c.totals.outputTokensTotal)} | | ${c.totals.capsHit.join(" ") || "–"} | ${c.totals.contaminated || "–"} |`, "");
  L.push("Turns and wall minutes are shown over the budget that run ACTUALLY had. A task's own `budgets` replace the campaign caps, and a campaign's `taskBudgets` replace those again, so the campaign cap is often not the number a run was measured against — 83 is comfortable under 100 and truncated under 80, and the bare figure cannot tell you which.", "");
  L.push("A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.", "");
  const tight = c.rows.filter((r) => Number.isFinite(r.turns) && Number.isFinite(r.turnsBudget) && r.turnsBudget < r.turns * 1.5);
  if (tight.length) {
    L.push(`**Headroom.** ${tight.map((r) => `${r.task} used ${r.turns} of ${r.turnsBudget}`).join("; ")} — under 50% spare. An arm that legitimately costs more would be truncated rather than measured, so raise the budget (campaign \`taskBudgets\`) before a comparison run.`, "");
  }
  if (report.contaminated.length) L.push(`Contaminated after retry (excluded): ${report.contaminated.join(", ")}`, "");
  if (report.infraErrors.length) L.push(`Infrastructure errors (excluded): ${report.infraErrors.map((e) => `${e.slotId}: ${e.error}`).join("; ")}`, "");
  if (report.scorerErrors?.length) L.push(`Scorer errors (counted as unsolved): ${report.scorerErrors.map((e) => `${e.slotId}: ${e.error.slice(0, 160)}`).join("; ")}`, "");
  return L.join("\n") + "\n";
}

export function buildReport({ manifest, records, provenance = null }) {
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
  const metrics = processMetrics(finals, arms);
  const effort = effortMetrics(finals, arms, tasks);
  const budgets = effectiveBudgets(finals, tasks);
  // Every arm against the baseline, PLUS the stripped arm against the arm it
  // was cut from when that is a different arm. Both contrasts are already in
  // the schedule, so computing only the first would throw away the clean one:
  // candidate vs baseline says whether the work helped, stripped vs its own
  // parent says whether these tasks can see documentation at all.
  const strippedRef = manifest.gate?.strippedRefArm;
  const stripped = manifest.gate?.strippedArm;
  const extra = strippedRef && stripped && strippedRef !== ref && arms.includes(strippedRef) && arms.includes(stripped) ? [[stripped, strippedRef]] : [];
  const pairings = [...arms.filter((a) => a !== ref).map((a) => [a, ref]), ...extra];
  const deltas = pairings.map(([a, r]) => pairedDelta(summary, tasks, a, r));
  const effortPaired = pairings.map(([a, r]) => pairedEffort(effort, tasks, a, r));
  const calibration = isCalibration(manifest) ? calibrationTable(finals, manifest, arms, tasks) : null;
  // One run per task proves nothing about an arm: a calibration campaign is
  // measured, never gated.
  const gate = manifest.gate && !calibration ? evaluateGate(summary, tasks, manifest.gate, { complete, effort }) : null;
  // Replacement proposal for (c): reserve tasks in id order, one per task to drop.
  let proposedReplacement = null;
  if (gate?.c && !gate.c.pass) {
    // Propose replacements for the tasks that actually block first; the
    // other flagged ones are worth swapping later but are not why it stopped.
    const blocking = new Set(gate.c.blocking ?? gate.c.replaceTasks.map((x) => x.task));
    const drop = [...gate.c.replaceTasks.map((x) => x.task).filter((t) => blocking.has(t)), ...gate.c.replaceTasks.map((x) => x.task).filter((t) => !blocking.has(t))];
    const reserve = (manifest.reserveTasks ?? []).filter((id) => !tasks.includes(id));
    proposedReplacement = { drop, add: reserve.slice(0, drop.length), short: Math.max(0, drop.length - reserve.length) };
  }
  const n = summary.byArm[arms[0]]?.n ?? 0;
  return {
    campaign: manifest.campaign,
    generatedAt: new Date().toISOString(),
    reclassified: provenance,
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
    budgets,
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
  if (report.reclassified) {
    const r = report.reclassified;
    L.push("", "## Reclassified", "");
    L.push(
      `**These records were RE-DERIVED from their transcripts on ${r.at}**, against harness commit \`${r.harnessGit?.sha?.slice(0, 7) ?? "?"}\`${r.harnessGit?.dirty ? " (dirty)" : ""}, adapter sha256 \`${String(r.adapter).slice(0, 12)}\`. ` +
        `They are therefore NOT what the run log recorded at the time: ${r.changed} of ${r.records} records changed and ${r.verdictsMoved.length} contamination verdict(s) moved. ` +
        `Only what the classifier derives from a transcript was rewritten (${r.fields.join(", ")}); ${r.untouched.join(", ")} are the scorer's and the runner's output and are untouched.`,
    );
    if (r.verdictsMoved.length) {
      L.push("", "| slot | attempt | before | after | paths that no longer count |", "|---|---|---|---|---|");
      for (const v of r.verdictsMoved) {
        L.push(`| ${v.slotId} | ${v.attempt} | ${v.before.contaminated ? "contaminated" : "clean"} | ${v.after.contaminated ? "contaminated" : "clean"} | ${(v.before.paths ?? []).map((p) => `\`${p}\``).join(", ") || "–"} |`);
      }
    }
    if (r.note) L.push("", r.note);
    const m = r.metric ?? "turns";
    if (r.supersededClean?.length) {
      L.push(
        "",
        `**Which attempt counts has NOT changed.** The campaign's rule is latest-wins and it stays that way: choosing a selection rule once the outcome is visible is choosing the answer. ${r.supersededClean.length} slot(s) now have an earlier attempt that is clean, listed here so the alternative is visible rather than applied. Every ${m} figure elsewhere in this report is the COUNTING attempt's.`,
        "",
        `| slot | arm | counting attempt | its ${m} | superseded attempt | its ${m} |`,
        "|---|---|---|---|---|---|",
      );
      for (const x of r.supersededClean) {
        L.push(`| ${x.slotId} | ${x.arm} | a${x.counting.attempt} (counts) | ${x.counting[m] ?? "n/a"} | a${x.superseded.attempt} | ${x.superseded[m] ?? "n/a"} |`);
      }
    }
    if (r.comparison) {
      const c = r.comparison;
      const pctc = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : "n/a");
      const numc = (x) => (Number.isFinite(x) ? String(x) : "n/a");
      const armsc = Object.keys(c.latest.median);
      L.push("", `### Selection rule: latest-wins (in force) vs first-clean-attempt (counterfactual)`, "");
      L.push(`| figure (${c.metric}) | latest-wins | first-clean |`, "|---|---|---|");
      for (const a of armsc) L.push(`| ${a} solved | ${c.latest.solved[a].solved}/${c.latest.solved[a].n} | ${c.firstClean.solved[a].solved}/${c.firstClean.solved[a].n} |`);
      for (const a of armsc) L.push(`| ${a} median | ${numc(c.latest.median[a])} | ${numc(c.firstClean.median[a])} |`);
      if (c.baselineArms?.[0] && c.baselineArms?.[1]) L.push(`| **A/A gap** | **${pctc(c.latest.aaGap)}** | **${pctc(c.firstClean.aaGap)}** |`);
      if (c.strippedArm) L.push(`| ${c.strippedArm} vs ${c.refArm} | ${pctc(c.latest.strippedVsRef)} | ${pctc(c.firstClean.strippedVsRef)} |`);
      const measurable = Number.isFinite(c.latest.aaGap) || Number.isFinite(c.firstClean.aaGap);
      const sameGap = measurable && Math.abs(c.latest.aaGap - c.firstClean.aaGap) < 5e-4;
      const movedMedian = armsc.filter((a) => c.latest.median[a] !== c.firstClean.median[a]);
      L.push(
        "",
        !measurable
          ? `This campaign has no A/A pair, so there is no gap to compare${movedMedian.length ? `; the ${c.metric} median would differ under the other rule (${movedMedian.map((a) => `${a} ${numc(c.latest.median[a])} vs ${numc(c.firstClean.median[a])}`).join(", ")})` : ""}.`
          : sameGap
            ? `The A/A gap on ${c.metric} — what the gate's effort limb is measured against — is the SAME under both rules, so the selection question does not touch the pre-registered thresholds.`
            : `**The A/A gap on ${c.metric} DIFFERS between the rules (${pctc(c.latest.aaGap)} vs ${pctc(c.firstClean.aaGap)}).** The pre-registered thresholds rest on it, so this needs a decision rather than a footnote.`,
      );
    }
    L.push("");
  }
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
    const cap = (t) => (gm.key === "turns" ? report.budgets?.[t]?.turns : gm.key === "wallMinutes" ? report.budgets?.[t]?.wallMinutes : null);
    for (const t of report.tasks) {
      L.push(`| ${t} | ${report.arms.map((a) => overBudget(report.effort.cell[t]?.[a]?.metrics?.[gm.key]?.median, cap(t))).join(" | ")} |`);
    }
    L.push("", `report.json carries every metric per task, not just ${gm.label}. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own \`budgets\` replace the campaign caps, and the campaign's \`taskBudgets\` replace those), which is the only number the figure can be read against.`);
  }
  if (report.effortPaired?.length) {
    L.push("", "## Effort paired by task", "");
    L.push(`> ${report.effortMethod}`, "");
    L.push("| arm | vs | metric | tasks | median Δ | mean Δ | Δ relative | 95% bootstrap (relative) | higher / lower / tied | sign p |");
    L.push(`|---|${new Array(9).fill("---").join("|")}|`);
    for (const p of report.effortPaired) {
      for (const m of EFFORT_METRICS) {
        const x = p.metrics[m.key];
        const ci = range(x.relativeCi.lo, x.relativeCi.hi);
        L.push(`| ${p.arm} | ${p.ref} | ${m.label} | ${x.relativeTasks} | ${n1(x.medianDelta)} | ${n1(x.meanDelta)} | ${pct(x.meanRelative)} | ${ci} | ${x.higher} / ${x.lower} / ${x.ties} | ${x.signTestP.toFixed(3)} |`);
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
      L.push(`- (a) the ${g.a.strippedArm ?? "stripped"} arm is worse than ${(g.a.refArms ?? []).length === 1 ? `its reference \`${g.a.refArms[0]}\`` : "both baselines"}${g.a.effort ? " on solved rate OR on effort" : ""}: ${g.a.pass ? `pass (fired by ${g.a.firedBy})` : "FAIL"}`);
      L.push(`  - solved: ${g.a.solvedPass ? "pass" : "FAIL"} — reference${(g.a.refArms ?? []).length > 1 ? "s" : ""} ${Object.entries(g.a.baseline).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}, ${g.a.strippedArm ?? "stripped"} ${pct(g.a.stripped)}, A/A gap ${pct(g.a.aaGap)}, required margin ${pct(g.a.requiredMargin)}`);
      if (g.a.effort) {
        const e = g.a.effort;
        if (e.unavailable) L.push(`  - effort: not evaluated — ${e.unavailable}`);
        else {
          L.push(`  - effort (${e.metric}): ${e.pass ? "pass" : "FAIL"} — needs ≥ ${pct(e.requiredMargin)} more than ${(g.a.refArms ?? []).length === 1 ? "its reference" : "EACH reference"}, above the A/A effort gap ${pct(e.aaEffortGap)}${e.ciMustExcludeZero ? ", interval clear of zero" : ""}`);
          for (const [base, c] of Object.entries(e.perReference)) {
            L.push(`    - vs ${base}: ${pct(c.relative)} (95% ${range(c.ci.lo, c.ci.hi)}) over ${c.tasks} tasks, higher on ${c.higherOn}, lower on ${c.lowerOn}, sign p = ${c.signTestP.toFixed(3)} — margin ${c.okMargin ? "ok" : "short"}, above A/A ${c.okAboveNoise ? "ok" : "no"}, interval ${c.okCi ? "ok" : "spans zero"}`);
          }
        }
      }
    }
    if (g.b) {
      L.push(`- (b) A/A gap within ${pct(g.b.aaMaxGap)}${g.b.aaMaxEffortGap !== null && g.b.aaMaxEffortGap !== undefined ? ` on solved and ${pct(g.b.aaMaxEffortGap)} on effort` : ""}: ${g.b.pass ? "pass" : "FAIL"} — solved gap ${pct(g.b.aaGap)}${g.b.aaEffortGap === null || g.b.aaEffortGap === undefined ? "" : `, effort gap ${pct(g.b.aaEffortGap)}`}`);
    }
    if (g.c) {
      L.push(`- (c) every task can discriminate on ${g.c.dimension === "any" ? "solved or effort" : g.c.dimension}: ${g.c.pass ? "pass" : `FAIL — ${(g.c.blocking ?? []).join(", ")}`}`);
      if ((g.c.replaceTasks ?? []).length) {
        L.push(`  - worth replacing from the reserve (not all of these block): ${g.c.replaceTasks.map((x) => `${x.task} (${x.at}, ${x.solved}/${x.n})`).join(", ")}`);
      }
    }
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
  // Provenance for a campaign whose records were re-derived from their
  // transcripts. Read from the sidecar rather than passed in, so the note
  // survives every later regeneration of this report.
  const sidecar = join(campaignDir, "reclassified.json");
  const report = buildReport({ manifest, records, provenance: existsSync(sidecar) ? readJson(sidecar) : null });
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
