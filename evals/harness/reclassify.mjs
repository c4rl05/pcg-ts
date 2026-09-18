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
import { parseJsonl, writeReport } from "./report.mjs";
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
export const RECLASSIFIED_FIELDS = ["contaminated", "outsideContaminating", "outsideBenign", "outsideWrites", "readCounts", "readPaths", "listedPaths", "networkAttempts"];

/** The record as the current classifier would have written it. */
export function reclassifiedRecord(record, parsed) {
  const rp = parsed.readPaths ?? {};
  const areas = ["llms", "docs", "skills", "graphs", "pkg"];
  const pick = (src) => Object.fromEntries(areas.map((k) => [k, src?.[k] ?? []]));
  return {
    ...record,
    contaminated: (rp.contaminating ?? []).length > 0,
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
 * What a rewrite would do, without doing it. Refuses a campaign that is
 * mid-flight, and refuses outright if any transcript is missing: a partial
 * rewrite leaves the file half in one classifier's terms and half in
 * another's, which is worse than leaving it alone.
 */
export function planRewrite({ resultsDir, runsDir, root = REPO_ROOT }) {
  const status = existsSync(join(resultsDir, "STATUS.json")) ? JSON.parse(readFileSync(join(resultsDir, "STATUS.json"), "utf8")) : null;
  const refusals = [];
  if (status?.state === "running") refusals.push(`${resultsDir}: STATUS.json says the campaign is RUNNING (pid ${status.pid ?? "?"}); a rewrite would race the runner. Wait for it to finish.`);
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
  // `solved` is stored as `score.solved && !contaminated`, so clearing a
  // contamination leaves it disagreeing with the score. Recomputing it is
  // out of scope here (it decides which attempt counts, and whether the
  // superseded retry should have run at all), so it is REPORTED instead.
  const inconsistent = records
    .filter((r) => r && r.contaminated === false && r.solved === false && r.score?.solved === true)
    .map((r) => ({ slotId: r.slotId, attempt: r.attempt, final: r.final !== false }));
  return { resultsDir, rows, records, changes, refusals, inconsistent, ok: refusals.length === 0 };
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
  if (plan.inconsistent.length) {
    L.push(
      `${plan.inconsistent.length} record(s) would read \`contaminated: false\` while still \`solved: false\`, because \`solved\` is stored as \`score.solved && !contaminated\` and this rewrite does NOT touch scores or solved verdicts: ${plan.inconsistent
        .map((r) => `${r.slotId} a${r.attempt}${r.final ? "" : " (superseded)"}`)
        .join(", ")}.`,
      "Whether a cleared attempt should now count instead of the retry that replaced it is a campaign decision, not a classifier one, so it is left to you.",
      "",
    );
  }
  L.push("Would write: runs.jsonl, reclassified.json, report.json, report.md" + (plan.rows.some((r) => r.record?.campaign) ? ", calibration.md (if a calibration)" : ""), "");
  return L.join("\n");
}

/**
 * Apply a plan: rewrite runs.jsonl, drop a `reclassified.json` provenance
 * sidecar beside it, and regenerate the report from the new records. The
 * sidecar is what puts the provenance in report.md — `writeReport` reads it,
 * so the note survives any later regeneration too.
 */
export function applyRewrite(plan, { now = new Date(), harness = harnessGitState() } = {}) {
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
    untouched: ["score", "solved", "final", "wallMs", "turns", "toolCalls", "usage", "capsHit"],
    inconsistent: plan.inconsistent,
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
      const { provenance } = applyRewrite(plan);
      console.log(`\nWROTE ${plan.resultsDir}: ${provenance.changed} record(s) updated, ${provenance.verdictsMoved.length} verdict(s) moved; report regenerated.`);
    } else {
      console.log("\n(dry run: nothing written. Add --write to apply.)");
    }
    process.exit(0);
  }
  const rows = reclassifyCampaign(opts);
  console.log(argv.includes("--json") ? JSON.stringify(rows.map((r) => ({ ...r, record: undefined, parsed: undefined })), null, 2) : renderTable(rows));
}
