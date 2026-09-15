/**
 * A stand-in for `evals/harness/score.mjs` with the same CLI and export
 * contract, so the runner and selftest can be exercised end to end before
 * (and independently of) the real scorer. It scores through the installed
 * package's own CLI, which the real scorer must NOT do (see PLAN U7); that is
 * acceptable only because nothing here is a measurement.
 *
 *   node stub-score.mjs --task <taskDir> --graph <graph.json> --pcg <node_modules/pcg-ts>
 *
 * Prints one JSON object and exits 0 whenever it produced one.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function pcg(pcgDir, args) {
  const r = spawnSync(process.execPath, [join(pcgDir, "bin", "pcg.mjs"), ...args], { encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function stripTimes(value) {
  return JSON.stringify(value, (k, v) => (k === "elapsedMs" || k === "path" ? undefined : v));
}

export async function scoreGraph({ taskDir, graphPath, pcgDir }) {
  const task = JSON.parse(readFileSync(join(taskDir, "task.json"), "utf8"));
  const out = { graphProduced: false, validates: false, cooks: false, deterministic: false, partitionSafe: false, checks: {}, solved: false, score: 0 };
  for (const c of task.checks) out.checks[c.id] = { pass: false, perSeed: [] };
  if (!graphPath || !existsSync(graphPath)) return out;
  out.graphProduced = true;
  out.validates = pcg(pcgDir, ["validate", graphPath, "--json"]).status === 0;
  if (!out.validates) return out;
  const { check } = await import(pathToFileURL(join(taskDir, "check.mjs")).href);
  const scratch = mkdtempSync(join(tmpdir(), "pcg-stubscore-"));
  try {
    let cooksAll = true;
    let deterministic = true;
    let partitionSafe = true;
    for (const seed of task.seeds) {
      const a = pcg(pcgDir, ["cook", graphPath, "--json", "--seed", String(seed)]);
      const b = pcg(pcgDir, ["cook", graphPath, "--json", "--seed", String(seed)]);
      const c = pcg(pcgDir, ["cook", graphPath, "--json", "--seed", String(seed), "--budget", "0"]);
      if (a.status !== 0 || b.status !== 0) {
        cooksAll = false;
        break;
      }
      const ra = JSON.parse(a.stdout);
      if (stripTimes(ra.outputs) !== stripTimes(JSON.parse(b.stdout).outputs)) deterministic = false;
      if (c.status !== 0 || stripTimes(ra.outputs) !== stripTimes(JSON.parse(c.stdout).outputs)) partitionSafe = false;
      const results = check({ report: ra, seed });
      for (const def of task.checks) {
        const r = results[def.id] ?? { pass: false };
        out.checks[def.id].perSeed.push({ seed, pass: Boolean(r.pass), value: r.value });
      }
    }
    out.cooks = cooksAll;
    out.deterministic = cooksAll && deterministic;
    out.partitionSafe = cooksAll && partitionSafe;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const hard = task.checks.filter((c) => c.hard);
  for (const c of task.checks) {
    const ps = out.checks[c.id].perSeed;
    out.checks[c.id].pass = ps.length === task.seeds.length && ps.every((s) => s.pass);
  }
  const hardPassed = hard.filter((c) => out.checks[c.id].pass).length;
  out.solved = out.cooks && out.deterministic && out.partitionSafe && hardPassed === hard.length;
  out.score = hard.length ? hardPassed / hard.length : out.solved ? 1 : 0;
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  try {
    const result = await scoreGraph({ taskDir: resolve(get("--task")), graphPath: resolve(get("--graph")), pcgDir: resolve(get("--pcg")) });
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  } catch (err) {
    process.stderr.write(`stub-score: ${err.stack}\n`);
    process.exit(1);
  }
}
