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
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jailOf, parseTranscript, readTranscript } from "./agents/claude-code.mjs";
import { parseJsonl } from "./report.mjs";
import { REPO_ROOT } from "./sandbox.mjs";

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
    console.error("usage: node evals/harness/reclassify.mjs --results <evals/results/<campaign>> [--runs <evals/runs/<campaign>>] [--root <repo>] [--json]");
    process.exit(2);
  }
  const rows = reclassifyCampaign({ resultsDir: resolve(results), runsDir: get("--runs") && resolve(get("--runs")), root: get("--root") ? resolve(get("--root")) : REPO_ROOT });
  console.log(argv.includes("--json") ? JSON.stringify(rows, null, 2) : renderTable(rows));
}
