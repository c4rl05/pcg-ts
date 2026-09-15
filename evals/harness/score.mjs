#!/usr/bin/env node
// Score one graph against one task, through the INSTALLED package under test.
//
//   node evals/harness/score.mjs --task <taskDir> --graph <graph.json> --pcg <dir>
//
// `--pcg` is the installed package directory (e.g. <sandbox>/node_modules/pcg-ts).
// Prints ONE JSON object:
//
//   { graphProduced, validates, cooks, deterministic, partitionSafe,
//     checks: { [id]: { pass, perSeed: [{ seed, pass, value?, detail? }] } },
//     solved, score, error? }
//
// Exit 0 whenever it produced that object for the graph, whatever the graph
// did. Exit 1 when the TASK or the PACKAGE could not be loaded (a harness
// fault, not an agent failure; the object is still printed, with `error`).
// Exit 2 on a bad command line.
//
// What it may touch, and why so little: only root exports the 0.17.0
// baseline already has — `deserializeGraph`, `Graph.setSeed`, `cook` (with
// `budgetMs: 0` for the partitioned cook) and the cooked collections'
// attribute storage — plus importing the package's `./primitives` entry so
// a `ref` resolves. Never `pcg inspect --json`, never a CLI fingerprint,
// never `src/docs`: later arms change those formats and the baseline has
// none of them, so the ruler would move with the thing it measures. The
// determinism digest is `evals/lib/digest.mjs`, the scorer's own code.
//
// Per seed (the task's `seeds`, used as given for every graph so runs and
// arms stay comparable) the graph is deserialized fresh three times:
//   A  cook()                  -> the outputs the checks read
//   B  cook()                  -> digest(B) === digest(A)  => deterministic
//   C  cook({ budgetMs: 0 })   -> digest(C) === digest(A)  => partitionSafe
// A fresh graph each time, because a second cook of the same Graph object
// is served from its cache and would compare the cache with itself.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_URL = pathToFileURL(join(HERE, "..", "lib", "index.mjs")).href;
const DIGEST_URL = pathToFileURL(join(HERE, "..", "lib", "digest.mjs")).href;

const OUTPUT_KINDS = new Set(["geometry", "instances", "value"]);

class HarnessFault extends Error {}

function message(e) {
  return e instanceof Error ? e.message : String(e);
}

/** The file an `exports` subpath resolves to for `import`, as a file URL. */
function exportUrl(pcgDir, subpath) {
  const pkgPath = join(pcgDir, "package.json");
  if (!existsSync(pkgPath)) throw new HarnessFault(`no package.json in --pcg directory "${pcgDir}"`);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  let target = pkg.exports?.[subpath];
  if (target !== null && typeof target === "object") target = target.import ?? target.default;
  if (typeof target !== "string" && subpath === ".") target = pkg.module ?? pkg.main;
  if (typeof target !== "string") return undefined;
  return pathToFileURL(resolve(pcgDir, target)).href;
}

function loadTask(taskDir) {
  const taskPath = join(taskDir, "task.json");
  if (!existsSync(taskPath)) throw new HarnessFault(`no task.json in "${taskDir}"`);
  const task = JSON.parse(readFileSync(taskPath, "utf8"));
  for (const key of ["id", "outputs", "seeds", "checks"]) {
    if (task[key] === undefined) throw new HarnessFault(`task.json in "${taskDir}" is missing "${key}"`);
  }
  if (!Array.isArray(task.seeds) || task.seeds.length === 0) {
    throw new HarnessFault(`task "${task.id}": "seeds" must be a non-empty array`);
  }
  if (!task.checks.some((c) => c.hard === true)) {
    // Without one, `solved` would reduce to "it cooked", at any score.
    throw new HarnessFault(`task "${task.id}" declares no hard check`);
  }
  const ids = task.checks.map((c) => c.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup !== undefined) throw new HarnessFault(`task "${task.id}" declares check "${dup}" twice`);
  for (const o of task.outputs) {
    if (!OUTPUT_KINDS.has(o.kind)) {
      throw new HarnessFault(
        `task "${task.id}": output "${o.name}" has kind "${o.kind}"; valid kinds: ${[...OUTPUT_KINDS].join(", ")}`,
      );
    }
  }
  return task;
}

function emptyResult(task) {
  const checks = {};
  for (const c of task?.checks ?? []) checks[c.id] = { pass: false, perSeed: [] };
  return {
    graphProduced: false,
    validates: false,
    cooks: false,
    deterministic: false,
    partitionSafe: false,
    checks,
    solved: false,
    score: 0,
  };
}

/**
 * Score `graphPath` against the task in `taskDir` using the package
 * installed at `pcgDir`. Resolves to the result object; rejects only on a
 * harness fault (unreadable task, unimportable package).
 */
export async function scoreGraph({ taskDir, graphPath, pcgDir }) {
  const task = loadTask(taskDir);
  const out = emptyResult(task);
  const errors = [];
  const note = (e) => {
    if (errors.length < 8) errors.push(message(e));
  };
  const finish = () => {
    if (errors.length > 0) out.error = errors.join(" | ");
    return out;
  };

  // --- the package under test -------------------------------------------
  const rootUrl = exportUrl(pcgDir, ".");
  if (rootUrl === undefined) throw new HarnessFault(`package in "${pcgDir}" has no root export`);
  let pcg;
  try {
    pcg = await import(rootUrl);
  } catch (e) {
    throw new HarnessFault(`could not import the package under test from "${pcgDir}": ${message(e)}`);
  }
  let primitivesLoaded = false;
  const primitivesUrl = exportUrl(pcgDir, "./primitives");
  if (primitivesUrl !== undefined) {
    try {
      await import(primitivesUrl);
      primitivesLoaded = true;
    } catch (e) {
      note(`primitives entry failed to load: ${message(e)}`);
    }
  }
  const lib = await import(LIB_URL);
  const { digestOutputs } = await import(DIGEST_URL);

  // --- the check ---------------------------------------------------------
  const checkPath = join(taskDir, "check.mjs");
  if (!existsSync(checkPath)) throw new HarnessFault(`no check.mjs in "${taskDir}"`);
  const check = (await import(pathToFileURL(resolve(checkPath)).href)).default;
  if (typeof check !== "function") throw new HarnessFault(`check.mjs in "${taskDir}" has no default export function`);

  // --- the graph ---------------------------------------------------------
  let graphJson;
  if (!existsSync(graphPath)) {
    note(`no graph at "${graphPath}"`);
    return finish();
  }
  // Produced means the file exists; a file that is not JSON was produced
  // and does not validate.
  out.graphProduced = true;
  try {
    graphJson = JSON.parse(readFileSync(graphPath, "utf8"));
  } catch (e) {
    note(`graph is not JSON: ${message(e)}`);
    return finish();
  }

  try {
    pcg.deserializeGraph(graphJson);
    // The declared names are read from the FILE, whose format (formatVersion
    // 1) the deserialize above has just accepted, rather than from
    // `Graph.describe()`, whose shape belongs to the arms being compared.
    const declared = new Set(
      (Array.isArray(graphJson.outputs) ? graphJson.outputs : []).map((o) => o?.name).filter((n) => typeof n === "string"),
    );
    const missing = task.outputs.filter((o) => !declared.has(o.name)).map((o) => o.name);
    if (missing.length > 0) {
      note(
        `graph does not declare the output(s) ${missing.map((m) => `"${m}"`).join(", ")}; it declares ${
          declared.size === 0 ? "none" : [...declared].map((m) => `"${m}"`).join(", ")
        }`,
      );
    } else {
      out.validates = true;
    }
  } catch (e) {
    note(`deserialize: ${message(e)}`);
  }
  if (!out.validates) return finish();

  const cookOnce = async (seed, opts) => {
    if (typeof pcg.Graph?.prototype?.setSeed !== "function") {
      // Same effect through the file format, for a build without setSeed.
      return pcg.cook(pcg.deserializeGraph({ ...graphJson, seed }), opts);
    }
    const graph = pcg.deserializeGraph(graphJson);
    graph.setSeed(seed);
    return pcg.cook(graph, opts);
  };

  let cooksAll = true;
  let deterministicAll = true;
  let partitionAll = true;
  const perCheck = new Map(task.checks.map((c) => [c.id, []]));

  for (const seed of task.seeds) {
    let a;
    try {
      a = await cookOnce(seed, {});
    } catch (e) {
      note(`seed ${seed}: cook failed: ${message(e)}`);
    }

    // Resolve the declared outputs to items of the declared kind.
    let outputs;
    let collections;
    if (a !== undefined) {
      outputs = {};
      collections = {};
      for (const o of task.outputs) {
        const coll = a.outputs[o.name] === undefined ? [] : [...a.outputs[o.name]];
        const item = coll.find((it) => it.kind === o.kind);
        if (item === undefined) {
          note(
            `seed ${seed}: output "${o.name}" holds no ${o.kind} item (it holds ${
              coll.length === 0 ? "nothing" : coll.map((it) => it.kind).join(", ")
            })`,
          );
          outputs = undefined;
          break;
        }
        outputs[o.name] = item;
        collections[o.name] = coll.filter((it) => it.kind === o.kind);
      }
    }

    if (outputs === undefined) {
      cooksAll = false;
      deterministicAll = false;
      partitionAll = false;
      for (const c of task.checks) perCheck.get(c.id).push({ seed, pass: false, detail: "did not cook" });
      continue;
    }

    // A digest that throws (an item the CPU cannot read, say) is the
    // graph's failure, not the harness's: no equality can be established.
    let digestA;
    try {
      digestA = digestOutputs(a.outputs);
    } catch (e) {
      note(`seed ${seed}: outputs could not be digested: ${message(e)}`);
    }
    if (digestA === undefined) {
      deterministicAll = false;
      partitionAll = false;
    } else {
      try {
        const b = await cookOnce(seed, {});
        if (digestOutputs(b.outputs) !== digestA) {
          deterministicAll = false;
          note(`seed ${seed}: two identical cooks produced different outputs`);
        }
      } catch (e) {
        deterministicAll = false;
        note(`seed ${seed}: second cook failed: ${message(e)}`);
      }
      try {
        const c = await cookOnce(seed, { budgetMs: 0 });
        if (digestOutputs(c.outputs) !== digestA) {
          partitionAll = false;
          note(`seed ${seed}: the budgetMs 0 cook produced different outputs`);
        }
      } catch (e) {
        partitionAll = false;
        note(`seed ${seed}: budgetMs 0 cook failed: ${message(e)}`);
      }
    }

    let results;
    try {
      results = await check({ pcg, primitivesLoaded, graphJson, seed, outputs, collections, lib, task });
    } catch (e) {
      note(`seed ${seed}: check threw: ${message(e)}`);
      results = {};
      for (const c of task.checks) results[c.id] = { pass: false, detail: `check threw: ${message(e)}` };
    }
    for (const c of task.checks) {
      const r = results?.[c.id];
      const entry = { seed, pass: r?.pass === true };
      if (r === undefined) entry.detail = `check.mjs returned no result for "${c.id}"`;
      else {
        if (r.value !== undefined) entry.value = r.value;
        if (!entry.pass && r.detail !== undefined) entry.detail = r.detail;
      }
      perCheck.get(c.id).push(entry);
    }
  }

  out.cooks = cooksAll;
  out.deterministic = deterministicAll;
  out.partitionSafe = partitionAll;

  let passed = 0;
  let total = 0;
  let hardAll = true;
  for (const c of task.checks) {
    const perSeed = perCheck.get(c.id);
    const pass = perSeed.length === task.seeds.length && perSeed.every((s) => s.pass);
    out.checks[c.id] = { pass, perSeed };
    for (const s of perSeed) if (s.pass) passed++;
    total += task.seeds.length;
    if (c.hard && !pass) hardAll = false;
  }
  out.score = total === 0 ? 0 : passed / total;
  out.solved = hardAll && out.validates && out.cooks && out.deterministic && out.partitionSafe;
  return finish();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--task" || a === "--graph" || a === "--pcg") {
      if (i + 1 >= argv.length) return { error: `flag "${a}" needs a value` };
      args[a.slice(2)] = argv[++i];
    } else {
      return { error: `unknown argument "${a}"; valid flags: --task, --graph, --pcg` };
    }
  }
  for (const k of ["task", "graph", "pcg"]) if (args[k] === undefined) return { error: `missing --${k}` };
  return { args };
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error !== undefined) {
    process.stderr.write(
      `score: ${parsed.error}\nusage: node evals/harness/score.mjs --task <taskDir> --graph <graph.json> --pcg <installed package dir>\n`,
    );
    process.exit(2);
  }
  const { task, graph, pcg } = parsed.args;
  try {
    const result = await scoreGraph({ taskDir: resolve(task), graphPath: resolve(graph), pcgDir: resolve(pcg) });
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(0);
  } catch (e) {
    let taskJson;
    try {
      taskJson = JSON.parse(readFileSync(join(resolve(task), "task.json"), "utf8"));
    } catch {
      taskJson = undefined;
    }
    const result = { ...emptyResult(taskJson), error: `harness: ${message(e)}` };
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(1);
  }
}
