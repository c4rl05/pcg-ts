/**
 * Re-run the CURRENT transcript classifier over a campaign's finished records,
 * without touching them: what would each run's contamination verdict be now?
 *
 *   node evals/harness/reclassify.mjs --results <evals/results/<campaign>> [--runs <evals/runs/<campaign>>] [--json]
 *
 * Transcripts are found by the record's `transcript.path` (relative to the
 * repo root the campaign ran in) or, failing that, as
 * `<runs>/<slotId>-a<attempt>/transcript.jsonl`. The sandbox directory is the
 * transcript's own `init.cwd`, so a record from an older layout (sandboxes
 * under the OS temp dir) is judged against the layout it ran in.
 *
 * The Temp snapshot taken at launch is not recorded, so this entry point
 * cannot know which Temp entries already existed. It therefore judges each
 * transcript BOTH ways — strict (every Temp entry was already there, so
 * reading one is contamination) and permissive (anything in Temp was the
 * agent's own) — and marks a run `ambiguous` when they disagree, rather than
 * picking one and reporting it as the verdict. A live run always has the
 * snapshot and so is never ambiguous; a disagreement here means the
 * transcript alone does not settle the question, which is a fact about the
 * evidence and belongs in the output.
 *
 * Most of what used to be ambiguous no longer is: a file the agent CREATED
 * is now recognised from the command that created it (an output flag, a
 * redirect, a copy destination), so the verdict is a property of the
 * transcript rather than of the machine's temp directory at launch.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTER_FILE, jailOf, parseTranscript, readTranscript } from "./agents/claude-code.mjs";
import { effortMetrics, pairedEffort, parseJsonl, writeReport } from "./report.mjs";
import { REPO_ROOT, harnessGitState, sha256File, writeJson } from "./sandbox.mjs";

export function reclassifyCampaign({ resultsDir, runsDir, root = REPO_ROOT }) {
  const records = parseJsonl(readFileSync(join(resultsDir, "runs.jsonl"), "utf8"), { tolerant: true });
  const runs = runsDir ?? join(dirname(dirname(resultsDir)), "runs", basename(resultsDir));
  return records.map((r) => {
    const candidates = [r.transcript?.path && resolve(root, r.transcript.path), join(runs, `${r.slotId}-a${r.attempt}`, "transcript.jsonl")].filter(Boolean);
    const file = candidates.find((f) => existsSync(f));
    const row = { slotId: r.slotId, attempt: r.attempt, before: { contaminated: Boolean(r.contaminated), paths: r.outsideContaminating ?? [] } };
    if (!file) return { ...row, error: `no transcript (tried ${candidates.join(", ")})` };
    const events = readTranscript(file);
    const cwd = events.find((e) => e?.type === "system" && e?.subtype === "init")?.cwd;
    if (!cwd) return { ...row, error: `${file} has no init.cwd` };
    // Both readings of the unrecorded Temp snapshot. `null` = strict (assume
    // every Temp entry pre-dated the run); a Set holding only the harness'
    // own entry = permissive (assume the agent made the rest).
    const strict = parseTranscript(events, { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) });
    const permissive = parseTranscript(events, { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
    const ambiguous = strict.readPaths.contaminating.length !== permissive.readPaths.contaminating.length;
    const parsed = strict;
    return {
      ...row,
      record: r,
      parsed,
      transcript: file,
      ambiguous,
      after: {
        contaminated: parsed.readPaths.contaminating.length > 0,
        paths: parsed.readPaths.contaminating,
        outsideWrites: parsed.outsideWrites,
        outsideBenign: parsed.readPaths.outsideSandbox.filter((p) => !parsed.readPaths.contaminating.includes(p)),
      },
      // Only present when the two readings disagree, so the reader sees that
      // the transcript does not settle it rather than one arbitrary verdict.
      ...(ambiguous ? { permissive: { contaminated: permissive.readPaths.contaminating.length > 0, paths: permissive.readPaths.contaminating } } : {}),
    };
  });
}

/**
 * The record fields the classifier DERIVES FROM THE TRANSCRIPT, and the only
 * ones a rewrite touches. Scores, `solved`, `final`, timings and usage are
 * the scorer's and the runner's output and are left exactly as recorded.
 */
export const RECLASSIFIED_FIELDS = ["contaminated", "outsideContaminating", "outsideBenign", "outsideWrites", "readCounts", "readPaths", "listedPaths", "networkAttempts", "solved"];

/**
 * The record as the current classifier would have written it.
 *
 * `solved` is DERIVED — the runner stores `score.solved && !contaminated` —
 * so it is recomputed whenever the contamination verdict changes. A record
 * reading `contaminated: false, solved: false` while its score says the graph
 * solved would be false on its own terms: a derived field that is not
 * re-derived is not derived, it is stale. What is NOT recomputed is the
 * SCORE, which is the scorer's output and is never re-run here.
 */
export function reclassifiedRecord(record, parsed) {
  const rp = parsed.readPaths ?? {};
  const areas = ["llms", "docs", "skills", "graphs", "pkg"];
  const pick = (src) => Object.fromEntries(areas.map((k) => [k, src?.[k] ?? []]));
  const contaminated = (rp.contaminating ?? []).length > 0;
  return {
    ...record,
    solved: record.score?.solved === true && !contaminated,
    contaminated,
    outsideContaminating: rp.contaminating ?? [],
    outsideBenign: (rp.outsideSandbox ?? []).filter((p) => !(rp.contaminating ?? []).includes(p)),
    outsideWrites: parsed.outsideWrites ?? [],
    readCounts: Object.fromEntries(areas.map((k) => [k, (rp[k] ?? []).length])),
    readPaths: pick(rp),
    listedPaths: pick(parsed.listedPaths),
    networkAttempts: parsed.networkAttempts ?? [],
  };
}

/**
 * Which record counts for each slot, under the two rules worth comparing.
 *
 * `latest` is the campaign's own rule — the last attempt wins — and it stays
 * the rule. `firstClean` is the counterfactual: the earliest attempt that is
 * not contaminated. They differ only where a retry superseded an attempt the
 * corrected classifier now calls clean. The point of computing both is that
 * switching rules AFTER seeing the outcome would be choosing a rule with the
 * results in view; showing both settles the question by arithmetic instead.
 */
export function selectUnder(records, rule) {
  const bySlot = new Map();
  for (const r of records) {
    if (!r?.slotId) continue;
    const list = bySlot.get(r.slotId) ?? [];
    list.push(r);
    bySlot.set(r.slotId, list);
  }
  const out = [];
  for (const list of bySlot.values()) {
    const sorted = [...list].sort((a, b) => (a.attempt ?? 0) - (b.attempt ?? 0));
    if (rule === "firstClean") out.push(sorted.find((r) => !r.contaminated) ?? sorted[sorted.length - 1]);
    else out.push(sorted[sorted.length - 1]);
  }
  return out;
}

/** The turns figures a reader needs to compare the two selection rules. */
export function selectionComparison(records, manifest) {
  const arms = (manifest?.arms ?? []).map((a) => a.label);
  const tasks = (manifest?.tasks ?? []).map((t) => t.id);
  const scheduled = new Set((manifest?.schedule ?? []).map((s) => s.slotId));
  const gate = manifest?.gate ?? {};
  const [a1, a2] = gate.baselineArms ?? [];
  const stripped = gate.strippedArm;
  const ref = gate.strippedRefArm ?? a1;
  const metric = gate.effortMetric ?? "turns";
  const under = (rule) => {
    const finals = selectUnder(records, rule).filter((r) => scheduled.has(r.slotId) && !r.contaminated && !r.infraError);
    const effort = effortMetrics(finals, arms, tasks);
    const rel = (arm, against) => {
      if (!arm || !against || !arms.includes(arm) || !arms.includes(against)) return null;
      const fwd = pairedEffort(effort, tasks, arm, against).metrics[metric].meanRelative;
      const rev = pairedEffort(effort, tasks, against, arm).metrics[metric].meanRelative;
      return { forward: fwd, symmetric: Number.isFinite(fwd) && Number.isFinite(rev) ? Math.max(Math.abs(fwd), Math.abs(rev)) : null };
    };
    return {
      rule,
      solved: Object.fromEntries(arms.map((a) => [a, { solved: finals.filter((r) => r.arm === a && r.solved === true).length, n: finals.filter((r) => r.arm === a).length }])),
      median: Object.fromEntries(arms.map((a) => [a, effort.byArm[a]?.metrics?.[metric]?.median ?? null])),
      aaGap: rel(a2, a1)?.symmetric ?? null,
      strippedVsRef: rel(stripped, ref)?.forward ?? null,
    };
  };
  return { metric, baselineArms: [a1, a2], strippedArm: stripped, refArm: ref, latest: under("latest"), firstClean: under("firstClean") };
}

/**
 * What a rewrite would do, without doing it. Refuses a campaign that is
 * mid-flight, and refuses outright if any transcript is missing: a partial
 * rewrite leaves the file half in one classifier's terms and half in
 * another's, which is worse than leaving it alone.
 */
export function planRewrite({ resultsDir, runsDir, root = REPO_ROOT }) {
  const status = existsSync(join(resultsDir, "STATUS.json")) ? JSON.parse(readFileSync(join(resultsDir, "STATUS.json"), "utf8")) : null;
  const refusals = [];
  if (status?.state === "running") refusals.push(`${resultsDir}: STATUS.json says the campaign is RUNNING (pid ${status.pid ?? "?"}); a rewrite would race the runner. Wait for it to finish.`);
  const manifestPath = join(resultsDir, "manifest.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  const rows = reclassifyCampaign({ resultsDir, runsDir, root });
  const missing = rows.filter((r) => r.error);
  if (missing.length) {
    refusals.push(
      `${resultsDir}: ${missing.length} of ${rows.length} record(s) have no transcript, so they cannot be re-derived: ${missing.map((r) => `${r.slotId} a${r.attempt}`).join(", ")}. ` +
        `Rewriting the rest would leave runs.jsonl half in one classifier's terms and half in another's. Restore the transcripts (evals/runs/ is git-ignored) or leave the campaign as it is.`,
    );
  }
  const changes = [];
  const records = rows.map((r) => {
    if (r.error) return r.record;
    const next = reclassifiedRecord(r.record, r.parsed);
    const moved = RECLASSIFIED_FIELDS.filter((f) => JSON.stringify(r.record?.[f]) !== JSON.stringify(next[f]));
    if (moved.length) {
      changes.push({
        slotId: r.slotId,
        attempt: r.attempt,
        fields: moved,
        verdictMoved: Boolean(r.record?.contaminated) !== next.contaminated,
        before: { contaminated: Boolean(r.record?.contaminated), paths: r.record?.outsideContaminating ?? [] },
        after: { contaminated: next.contaminated, paths: next.outsideContaminating },
      });
    }
    return next;
  });
  // Which attempt COUNTS does not change: the campaign's rule is latest-wins
  // and it stays, because picking a rule once the outcome is visible is
  // choosing the answer. What changes is that the alternative is now VISIBLE
  // — every slot where a retry superseded an attempt the corrected classifier
  // calls clean, with both attempts' figures, so a reader can see what the
  // other rule would have given.
  const metric = manifest?.gate?.effortMetric ?? "turns";
  const bySlot = new Map();
  for (const r of records) if (r?.slotId) bySlot.set(r.slotId, [...(bySlot.get(r.slotId) ?? []), r]);
  const supersededClean = [];
  for (const [slotId, list] of bySlot) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => (a.attempt ?? 0) - (b.attempt ?? 0));
    const counting = sorted[sorted.length - 1];
    const earlierClean = sorted.slice(0, -1).find((r) => !r.contaminated);
    if (!earlierClean) continue;
    supersededClean.push({
      slotId,
      task: counting.task,
      arm: counting.arm,
      counting: { attempt: counting.attempt, [metric]: counting[metric] ?? null, solved: counting.solved === true },
      superseded: { attempt: earlierClean.attempt, [metric]: earlierClean[metric] ?? null, solved: earlierClean.solved === true },
    });
  }
  const comparison = manifest ? selectionComparison(records, manifest) : null;
  return { resultsDir, rows, records, changes, refusals, supersededClean, comparison, metric, ok: refusals.length === 0 };
}

/**
 * The two selection rules side by side. If the conclusion holds under both,
 * the question is settled by arithmetic and nobody has to relitigate it.
 */
export function renderComparison(c) {
  const pct = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : "n/a");
  const num = (x) => (Number.isFinite(x) ? String(x) : "n/a");
  const L = [`### Selection rule: latest-wins (in force) vs first-clean-attempt (counterfactual)`, ""];
  const arms = Object.keys(c.latest.median);
  L.push(`| figure (${c.metric}) | latest-wins | first-clean |`, "|---|---|---|");
  for (const a of arms) L.push(`| ${a} solved | ${c.latest.solved[a].solved}/${c.latest.solved[a].n} | ${c.firstClean.solved[a].solved}/${c.firstClean.solved[a].n} |`);
  for (const a of arms) L.push(`| ${a} median | ${num(c.latest.median[a])} | ${num(c.firstClean.median[a])} |`);
  if (c.baselineArms?.[0] && c.baselineArms?.[1]) {
    L.push(`| **A/A gap** (${c.baselineArms[0]} vs ${c.baselineArms[1]}) | **${pct(c.latest.aaGap)}** | **${pct(c.firstClean.aaGap)}** |`);
  }
  if (c.strippedArm) L.push(`| ${c.strippedArm} vs ${c.refArm} | ${pct(c.latest.strippedVsRef)} | ${pct(c.firstClean.strippedVsRef)} |`);
  L.push("");
  const measurable = Number.isFinite(c.latest.aaGap) || Number.isFinite(c.firstClean.aaGap);
  const movedMedian = arms.filter((a) => c.latest.median[a] !== c.firstClean.median[a]);
  if (!measurable) {
    L.push(`This campaign has no A/A pair, so there is no gap to compare${movedMedian.length ? `; the ${c.metric} median would differ under the other rule (${movedMedian.map((a) => `${a} ${num(c.latest.median[a])} vs ${num(c.firstClean.median[a])}`).join(", ")})` : ""}.`);
  } else if (Math.abs(c.latest.aaGap - c.firstClean.aaGap) < 5e-4) {
    L.push(`The A/A gap on ${c.metric} — what the gate's effort limb is measured against — is the SAME under both rules, so the selection question does not touch it.`);
  } else {
    L.push(`**The A/A gap on ${c.metric} DIFFERS between the rules (${pct(c.latest.aaGap)} vs ${pct(c.firstClean.aaGap)}).** The pre-registered thresholds rest on it, so this needs a decision rather than a footnote.`);
  }
  return L.join("\n");
}

export function renderPlan(plan) {
  const L = [`# Reclassify plan: ${plan.resultsDir}`, ""];
  if (plan.refusals.length) {
    L.push("REFUSED:", ...plan.refusals.map((r) => `  - ${r}`), "");
    return L.join("\n");
  }
  L.push(`${plan.rows.length} records, ${plan.changes.length} would change, ${plan.changes.filter((c) => c.verdictMoved).length} verdict(s) would move.`, "");
  if (plan.changes.length) {
    L.push("| slot | attempt | verdict | fields |", "|---|---|---|---|");
    for (const c of plan.changes) {
      const v = c.verdictMoved ? `**${c.before.contaminated ? "contaminated" : "clean"} -> ${c.after.contaminated ? "contaminated" : "clean"}**` : c.after.contaminated ? "contaminated" : "clean";
      L.push(`| ${c.slotId} | ${c.attempt} | ${v} | ${c.fields.join(", ")} |`);
    }
    L.push("");
  }
  if (plan.supersededClean.length) {
    L.push(
      `### Superseded attempts that are now clean (${plan.supersededClean.length})`,
      "",
      "Which attempt COUNTS does not change: the campaign's rule is latest-wins and it stays that way, because choosing a selection rule with the outcome in view is choosing the answer. These are listed so the alternative is visible rather than applied.",
      "",
      `| slot | arm | counting attempt | its ${plan.metric} | superseded attempt | its ${plan.metric} |`,
      "|---|---|---|---|---|---|",
    );
    for (const x of plan.supersededClean) {
      L.push(`| ${x.slotId} | ${x.arm} | a${x.counting.attempt} (counts) | ${x.counting[plan.metric] ?? "n/a"} | a${x.superseded.attempt} | ${x.superseded[plan.metric] ?? "n/a"} |`);
    }
    L.push("");
  }
  if (plan.comparison) L.push(renderComparison(plan.comparison), "");
  L.push("Would write: runs.jsonl, reclassified.json, report.json, report.md" + (plan.rows.some((r) => r.record?.campaign) ? ", calibration.md (if a calibration)" : ""), "");
  return L.join("\n");
}

/**
 * Apply a plan: rewrite runs.jsonl, drop a `reclassified.json` provenance
 * sidecar beside it, and regenerate the report from the new records. The
 * sidecar is what puts the provenance in report.md — `writeReport` reads it,
 * so the note survives any later regeneration too.
 */
export function applyRewrite(plan, { now = new Date(), harness = harnessGitState(), note = null } = {}) {
  if (!plan.ok) throw new Error(`reclassify: refusing to write:\n${plan.refusals.join("\n")}`);
  const runsPath = join(plan.resultsDir, "runs.jsonl");
  writeFileSync(runsPath, plan.records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const provenance = {
    at: now.toISOString(),
    harnessGit: harness,
    adapter: sha256File(ADAPTER_FILE),
    fields: RECLASSIFIED_FIELDS,
    records: plan.rows.length,
    changed: plan.changes.length,
    verdictsMoved: plan.changes.filter((c) => c.verdictMoved).map((c) => ({ slotId: c.slotId, attempt: c.attempt, before: c.before, after: c.after })),
    untouched: ["score", "final", "wallMs", "turns", "toolCalls", "usage", "capsHit"],
    supersededClean: plan.supersededClean,
    comparison: plan.comparison,
    metric: plan.metric,
    note: note ?? null,
  };
  writeJson(join(plan.resultsDir, "reclassified.json"), provenance);
  const report = writeReport(plan.resultsDir);
  return { provenance, report };
}

export function renderTable(rows) {
  const L = ["| slot | attempt | before | after | contaminating paths now | wrote outside |", "|---|---|---|---|---|---|"];
  for (const r of rows) {
    if (r.error) {
      L.push(`| ${r.slotId} | ${r.attempt} | ${r.before.contaminated ? "contaminated" : "clean"} | ? | ${r.error} | ? |`);
      continue;
    }
    const after = r.ambiguous ? `${r.after.contaminated ? "contaminated" : "clean"} / ${r.permissive.contaminated ? "contaminated" : "clean"} (AMBIGUOUS)` : r.after.contaminated ? "contaminated" : "clean";
    L.push(`| ${r.slotId} | ${r.attempt} | ${r.before.contaminated ? "contaminated" : "clean"} | ${after} | ${r.after.paths.map((p) => `\`${p}\``).join(", ") || "–"} | ${r.after.outsideWrites?.length ?? 0} |`);
  }
  const ambiguous = rows.filter((r) => r.ambiguous);
  if (ambiguous.length) {
    L.push(
      "",
      `${ambiguous.length} run(s) AMBIGUOUS: the launch-time Temp snapshot is not recorded, so the transcript alone does not say whether those Temp paths pre-dated the run. Shown as strict / permissive. A live run has the snapshot and is never ambiguous.`,
    );
  }
  const wrote = rows.filter((r) => (r.after?.outsideWrites?.length ?? 0) > 0);
  if (wrote.length) {
    L.push("", `${wrote.length} run(s) WROTE outside their sandbox (a hazard for later runs, not contamination of this one): ${wrote.map((r) => `${r.slotId} a${r.attempt} (${r.after.outsideWrites.length})`).join(", ")}`);
  }
  return L.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const results = get("--results");
  if (!results || !existsSync(join(results, "runs.jsonl"))) {
    console.error(
      [
        "usage: node evals/harness/reclassify.mjs --results <evals/results/<campaign>> [--runs <dir>] [--root <repo>] [--json]",
        "       --plan    what a rewrite would change, without writing (implied by --write)",
        "       --write   rewrite runs.jsonl from the transcripts and regenerate the report",
        "       --note S  a one-line human summary recorded in the provenance block",
      ].join("\n"),
    );
    process.exit(2);
  }
  const opts = { resultsDir: resolve(results), runsDir: get("--runs") && resolve(get("--runs")), root: get("--root") ? resolve(get("--root")) : REPO_ROOT };
  if (argv.includes("--write") || argv.includes("--plan")) {
    const plan = planRewrite(opts);
    if (argv.includes("--json")) console.log(JSON.stringify({ ...plan, rows: undefined, records: undefined }, null, 2));
    else console.log(renderPlan(plan));
    if (!plan.ok) process.exit(1);
    if (argv.includes("--write")) {
      const { provenance } = applyRewrite(plan, { note: get("--note") });
      console.log(`\nWROTE ${plan.resultsDir}: ${provenance.changed} record(s) updated, ${provenance.verdictsMoved.length} verdict(s) moved; report regenerated.`);
    } else {
      console.log("\n(dry run: nothing written. Add --write to apply.)");
    }
    process.exit(0);
  }
  const rows = reclassifyCampaign(opts);
  console.log(argv.includes("--json") ? JSON.stringify(rows.map((r) => ({ ...r, record: undefined, parsed: undefined })), null, 2) : renderTable(rows));
}
