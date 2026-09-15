/**
 * Campaign report and the pilot gate.
 *
 *   node evals/harness/report.mjs --campaign <name> [--results-dir evals/results] [--config evals/eval.config.json]
 *
 * Reads `<results>/<campaign>/manifest.json` and `runs.jsonl`, writes
 * `report.json` and `report.md` beside them.
 *
 * - Solved counts per task x arm with Wilson 95% intervals.
 * - Paired-by-task deltas of each arm against the first baseline arm.
 * - Process metrics (turns, tool calls, `pcg validate` calls and failures,
 *   probe graphs written, doc reads, caps), which vary less than pass rate.
 * - The PILOT GATE, go iff
 *   (a) the stripped arm's solved rate is below EACH baseline arm by more than
 *       the A/A gap, and by at least `gate.strippedMinMargin`;
 *   (b) the A/A gap |A - A'| is at most `gate.aaMaxGap`;
 *   (c) no task sits at 0% or 100% solved pooled across all arms. Tasks that
 *       fail (c) are listed for replacement by reserve tasks.
 *   A campaign with unfinished slots reports `pending`, never go or stop.
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
 * The pilot gate. `gate` = { baselineArms: [A, A'], strippedArm, aaMaxGap, strippedMinMargin }.
 */
export function evaluateGate(summary, tasks, gate, { complete }) {
  const reasons = [];
  const [a1, a2] = gate.baselineArms ?? [];
  const s = gate.strippedArm;
  const arms = Object.keys(summary.byArm);
  const missing = [a1, a2, s].filter((x) => !x || !arms.includes(x));
  if (missing.length) {
    return { decision: "stop", complete, reasons: [`gate arms not in the campaign: ${missing.join(", ") || "(unset)"}; configure gate.baselineArms and gate.strippedArm`], a: null, b: null, c: null };
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
  const aPass = dA !== null && dA2 !== null && aaGap !== null && dA > aaGap + EPS && dA2 > aaGap + EPS && Math.min(dA, dA2) >= (gate.strippedMinMargin ?? 0) - EPS;
  const a = { pass: aPass, baseline: { [a1]: pA, [a2]: pA2 }, stripped: pS, deltas: { [a1]: dA, [a2]: dA2 }, aaGap, requiredMargin: margin };
  if (!aPass) reasons.push(`(a) stripped arm ${fmt(pS)} is not below both baselines (${fmt(pA)}, ${fmt(pA2)}) by more than the A/A gap ${fmt(aaGap)} and at least ${fmt(gate.strippedMinMargin ?? 0)}: the eval may not see documentation`);
  const bPass = aaGap !== null && aaGap <= gate.aaMaxGap + EPS;
  const b = { pass: bPass, aaGap, aaMaxGap: gate.aaMaxGap };
  if (!bPass) reasons.push(`(b) A/A gap ${fmt(aaGap)} exceeds gate.aaMaxGap ${fmt(gate.aaMaxGap)}: noise swamps the comparison`);
  // A task with no countable runs (all contaminated or infrastructure) measured nothing: it fails (c) too.
  const floorCeiling = tasks.filter((t) => summary.byTask[t].n === 0 || summary.byTask[t].solved === 0 || summary.byTask[t].solved === summary.byTask[t].n);
  const at = (t) => (summary.byTask[t].n === 0 ? "no-data" : summary.byTask[t].solved === 0 ? "floor" : "ceiling");
  const c = {
    pass: floorCeiling.length === 0,
    replaceTasks: floorCeiling.map((t) => ({ task: t, solved: summary.byTask[t].solved, n: summary.byTask[t].n, at: at(t) })),
  };
  if (!c.pass) reasons.push(`(c) task(s) at floor or ceiling across all arms, replace from reserve: ${c.replaceTasks.map((x) => `${x.task} (${x.at})`).join(", ")}`);
  if (!complete) return { decision: "pending", complete, reasons: ["campaign incomplete: the gate is evaluated only on a finished campaign", ...reasons], a, b, c };
  return { decision: aPass && bPass && c.pass ? "go" : "stop", complete, reasons, a, b, c };
}

function fmt(x) {
  return x === null || x === undefined || Number.isNaN(x) ? "n/a" : `${(x * 100).toFixed(1)}%`;
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
  const gate = manifest.gate ? evaluateGate(summary, tasks, manifest.gate, { complete }) : null;
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
  const pct = (x) => (x === null || x === undefined ? "n/a" : `${Math.round(x * 100)}%`);
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
  const n1 = (x) => (x === null || x === undefined ? "n/a" : x.toFixed(1));
  for (const a of report.arms) {
    const m = report.processMetrics[a];
    L.push(`| ${a} | ${m.runs} | ${n1(m.turnsMean)} / ${n1(m.turnsMedian)} | ${n1(m.toolCallsMean)} | ${n1(m.validateCallsMean)} | ${pct(m.validateFailureRate)} | ${n1(m.probeGraphsMean)} | ${n1(m.outputTokensMean)} | ${n1(m.wallMinutesMean)} | ${pct(m.readShare.llms)} / ${pct(m.readShare.docs)} / ${pct(m.readShare.skills)} / ${pct(m.readShare.graphs)} | ${Object.entries(m.capsHit).map(([k, v]) => `${k}:${v}`).join(" ") || "–"} |`);
  }
  if (report.contaminated.length) L.push("", `Contaminated after retry (excluded from rates): ${report.contaminated.join(", ")}`);
  if (report.infraErrors.length) L.push("", `Infrastructure errors (excluded): ${report.infraErrors.map((e) => `${e.slotId}: ${e.error}`).join("; ")}`);
  if (report.scorerErrors?.length) L.push("", `Scorer errors on the agent's graph (counted as unsolved): ${report.scorerErrors.map((e) => `${e.slotId}: ${e.error.slice(0, 160)}`).join("; ")}`);
  if (report.gate) {
    L.push("", `## Pilot gate: **${report.gate.decision.toUpperCase()}**`, "");
    if (report.gate.a) L.push(`- (a) stripped below both baselines by more than the A/A gap: ${report.gate.a.pass ? "pass" : "FAIL"} — baselines ${Object.entries(report.gate.a.baseline).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}, stripped ${pct(report.gate.a.stripped)}, A/A gap ${pct(report.gate.a.aaGap)}, required margin ${pct(report.gate.a.requiredMargin)}`);
    if (report.gate.b) L.push(`- (b) A/A gap within ${pct(report.gate.b.aaMaxGap)}: ${report.gate.b.pass ? "pass" : "FAIL"}`);
    if (report.gate.c) L.push(`- (c) no task at floor or ceiling: ${report.gate.c.pass ? "pass" : `FAIL — replace ${report.gate.c.replaceTasks.map((x) => `${x.task} (${x.at}, ${x.solved}/${x.n})`).join(", ")}`}`);
    for (const r of report.gate.reasons) L.push(`- ${r}`);
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
  console.log(`report: ${join(dir, "report.md")} (${r.progress.done}/${r.progress.total} slots, gate ${r.gate?.decision ?? "n/a"})`);
}
