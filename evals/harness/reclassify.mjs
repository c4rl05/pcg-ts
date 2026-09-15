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
 * under the OS temp dir) is judged against the layout it ran in. The Temp
 * snapshot taken at launch is not recorded, so pre-existing Temp entries are
 * unknown here and count as pre-existing (the strict reading).
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
    const parsed = parseTranscript(events, { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) });
    return {
      ...row,
      transcript: file,
      after: { contaminated: parsed.readPaths.contaminating.length > 0, paths: parsed.readPaths.contaminating, outsideWrites: parsed.outsideWrites, outsideBenign: parsed.readPaths.outsideSandbox.filter((p) => !parsed.readPaths.contaminating.includes(p)) },
    };
  });
}

export function renderTable(rows) {
  const L = ["| slot | attempt | before | after | contaminating paths now |", "|---|---|---|---|---|"];
  for (const r of rows) {
    if (r.error) {
      L.push(`| ${r.slotId} | ${r.attempt} | ${r.before.contaminated ? "contaminated" : "clean"} | ? | ${r.error} |`);
      continue;
    }
    L.push(`| ${r.slotId} | ${r.attempt} | ${r.before.contaminated ? "contaminated" : "clean"} | ${r.after.contaminated ? "contaminated" : "clean"} | ${r.after.paths.map((p) => `\`${p}\``).join(", ") || "–"} |`);
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
