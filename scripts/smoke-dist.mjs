/**
 * Dist smoke test: proves the BUILT package works, entry by entry, the
 * way consumers actually load it. `npm test` runs against `src/` and
 * cannot see this class of failure: bundler code splitting once emitted
 * chunk imports in an order where the primitives chunk registered its
 * recipes before the standard-node chunk had evaluated, so importing
 * `pcg-ts/primitives` (or the CLI, or dist/docs) ALONE crashed with
 * `unknown node type "setAttribute"` — while src tests, the worker
 * entry (saved by a lucky chunk order), and `import "pcg-ts"` all
 * stayed green.
 *
 * Therefore every public entry is imported in a FRESH node subprocess
 * (module caches in a shared process would mask ordering: whichever
 * entry loads first evaluates the shared chunks for everyone after it),
 * and each asserts through its own surface that the registries are
 * actually populated. The worker path is exercised for real: a pooled
 * cook spawns dist/worker/entryNode.js inside a worker_threads Worker.
 *
 * Run after `npm run build`. Wired into `prepublishOnly`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** file:// URL literal for a repo-relative path, for embedding in -e code. */
function distUrl(relative) {
  return JSON.stringify(pathToFileURL(join(root, relative)).href);
}

const INDEX = distUrl("dist/index.js");
const PRIMITIVES = distUrl("dist/primitives/index.js");
const THREE = distUrl("dist/three/index.js");
const GPU = distUrl("dist/gpu/index.js");
const PANELS = distUrl("dist/panels/index.js");
const CLI = distUrl("dist/cli/index.js");
const WORKER = distUrl("dist/worker/index.js");
const ENTRY_NODE = distUrl("dist/worker/entryNode.js");
const ENTRY_BROWSER = distUrl("dist/worker/entryBrowser.js");
const DOCS = distUrl("dist/docs/index.js");

/**
 * Each case runs in its own node subprocess so no case can pre-warm the
 * module cache for another. The code is written to a temp .mjs file
 * rather than passed via `--input-type=module -e`, because
 * worker_threads Workers inherit execArgv and `--input-type` is invalid
 * for path input — it would crash the pooled-cook case's worker.
 * A case passes when the process exits 0.
 */
const importCases = [
  {
    name: "pcg-ts (dist/index.js): standard node registry populated",
    code: `
      const pcg = await import(${INDEX});
      const n = pcg.listNodeTypes().length;
      if (n <= 30) throw new Error("expected > 30 registered node types, got " + n);
      if (!pcg.hasNodeType("setAttribute")) throw new Error("setAttribute is not registered");
    `,
  },
  {
    name: "pcg-ts/primitives imported ALONE, then pcg-ts (the shipped regression)",
    code: `
      // Order matters: primitives FIRST. This is the exact import order
      // that crashed in the broken build (primitives chunk evaluated
      // before the standard-node chunk).
      await import(${PRIMITIVES});
      const pcg = await import(${INDEX});
      const n = pcg.listNodeTypes().length;
      if (n <= 30) throw new Error("expected > 30 registered node types, got " + n);
      const s = pcg.listSubgraphs().length;
      if (s <= 20) throw new Error("expected > 20 registered primitives, got " + s);
      if (!pcg.hasRegisteredSubgraph("write/height-slope")) {
        throw new Error("primitive write/height-slope (the first one registered) is missing");
      }
    `,
  },
  {
    name: "pcg-ts/three imported alone",
    code: `
      const three = await import(${THREE});
      if (typeof three.toInstancedMeshes !== "function") throw new Error("toInstancedMeshes missing");
    `,
  },
  {
    name: "pcg-ts/gpu imported alone",
    code: `
      const gpu = await import(${GPU});
      if (typeof gpu.compileFieldSpec !== "function") throw new Error("compileFieldSpec missing");
    `,
  },
  {
    // The last published subpath to get one. `pcg-ts/panels` is pinned in
    // source by `tests/panelSpec.test.ts`, which runs the parser over
    // every file in `graphs/panels/` — but from SOURCE, so nothing had
    // ever imported the built entry. A subpath that is exported in
    // package.json and never imported from `dist/` is exactly the shape
    // of the failures this script exists to catch.
    name: "pcg-ts/panels imported alone",
    code: `
      const panels = await import(${PANELS});
      if (typeof panels.parsePanelSpec !== "function") throw new Error("parsePanelSpec missing");
      // Parse something, rather than only checking a name is present: a
      // built entry can export a function that throws on first use, and
      // this is the one call every consumer of the subpath makes.
      const spec = panels.parsePanelSpec({
        sections: [{ title: "t", controls: [{ param: "n.p", label: "l" }] }],
      });
      if (spec.sections.length !== 1) throw new Error("parsePanelSpec returned no sections");
    `,
  },
  {
    name: "CLI module (dist/cli/index.js) imported alone",
    code: `
      await import(${CLI});
      const pcg = await import(${INDEX});
      if (pcg.listSubgraphs().length <= 20) throw new Error("CLI import did not register the primitives");
    `,
  },
  {
    name: "pcg-ts/worker imported alone",
    code: `
      const worker = await import(${WORKER});
      if (typeof worker.CookWorkerPool !== "function") throw new Error("CookWorkerPool missing");
    `,
  },
  {
    name: "pcg-ts/worker/node main-thread guard",
    code: `
      // Importing the worker entry on a main thread must fail with its
      // guidance error — anything else (including succeeding) is a bug.
      try {
        await import(${ENTRY_NODE});
        throw new Error("importing entryNode on the main thread did not throw");
      } catch (err) {
        const msg = String(err && err.message);
        if (!msg.includes("worker_threads")) throw err;
      }
    `,
  },
  {
    name: "pcg-ts/worker/browser worker-scope guard",
    code: `
      try {
        await import(${ENTRY_BROWSER});
        throw new Error("importing entryBrowser outside a worker scope did not throw");
      } catch (err) {
        const msg = String(err && err.message);
        if (!msg.includes("worker scope")) throw err;
      }
    `,
  },
  {
    name: "dist/docs (build tooling entry) imported alone",
    code: `
      const docs = await import(${DOCS});
      if (typeof docs.renderSiteVersion !== "function") throw new Error("renderSiteVersion missing");
      if (!Array.isArray(docs.SITE_PAGES)) throw new Error("SITE_PAGES missing");
    `,
  },
  {
    // package.json's `require` condition points every subpath at the SAME
    // ESM file `import` does. That is deliberate — one file is one module
    // instance, so the dual-package hazard cannot split this library's
    // module-level registries — and it works because Node >= 20.19 / >=
    // 22.12 can require() an ES module.
    //
    // It works only while no entry's module graph contains a TOP-LEVEL
    // AWAIT. Add one anywhere beneath any of these entries and every
    // CommonJS consumer's `require("pcg-ts")` becomes
    // ERR_REQUIRE_ASYNC_MODULE, with nothing in `npm test` to notice: the
    // suite runs against src/ through an ESM loader that is perfectly happy
    // with a TLA. This case is the notice.
    name: "require() of every published entry from CommonJS (require(esm))",
    code: `
      const { createRequire } = await import("node:module");
      const { fileURLToPath } = await import("node:url");
      const require = createRequire(import.meta.url);
      const targets = [
        ["pcg-ts", ${INDEX}],
        ["pcg-ts/three", ${THREE}],
        ["pcg-ts/gpu", ${GPU}],
        ["pcg-ts/cli", ${CLI}],
        ["pcg-ts/primitives", ${PRIMITIVES}],
        ["pcg-ts/worker", ${WORKER}],
        ["pcg-ts/panels", ${PANELS}],
      ];
      for (const [subpath, url] of targets) {
        let mod;
        try {
          mod = require(fileURLToPath(url));
        } catch (err) {
          const code = err && err.code;
          if (code === "ERR_REQUIRE_ASYNC_MODULE") {
            throw new Error(
              "require(\\"" + subpath + "\\") threw ERR_REQUIRE_ASYNC_MODULE: something under this " +
                "entry now uses a top-level await, so package.json's \`require\` condition no longer " +
                "resolves for any CommonJS consumer. Remove the TLA, or stop promising require().",
            );
          }
          throw err;
        }
        if (!mod || Object.keys(mod).length === 0) {
          throw new Error("require(\\"" + subpath + "\\") returned an empty namespace");
        }
      }
      const pcg = require(fileURLToPath(${INDEX}));
      if (typeof pcg.listNodeTypes !== "function") {
        throw new Error("require(\\"pcg-ts\\") has no listNodeTypes");
      }
    `,
  },
  {
    name: "pooled cook through dist/worker/entryNode.js in a real Worker",
    code: `
      const { CookWorkerPool } = await import(${WORKER});
      const { Graph, pointScatterInBounds, serializeGraph } = await import(${INDEX});
      const graph = new Graph(1);
      const scatter = graph.add(pointScatterInBounds, {
        count: 64,
        boundsMin: [0, 0, 0],
        boundsMax: [8, 0, 8],
      });
      graph.output(scatter, "out", "points");
      // No createWorker: the pool's default spawns dist/worker/entryNode.js
      // next to dist/worker/index.js — exactly what a consumer gets.
      const pool = new CookWorkerPool({ workers: 1 });
      try {
        const result = await pool.cook({ graph: serializeGraph(graph) });
        if (!result || !result.outputs || !result.outputs.points) {
          throw new Error("pooled cook returned no 'points' output");
        }
      } finally {
        await pool.close();
      }
    `,
  },
];

/** CLI commands, run exactly as a user would. */
const cliCases = [
  {
    name: "CLI: pcg nodes",
    args: [join(root, "bin/pcg.mjs"), "nodes"],
    check: (out) => {
      if (!/\d+ node types/.test(out)) return "output does not report a node-type count";
      return undefined;
    },
  },
  {
    name: "CLI: pcg validate graphs/basics-primitive-ref.json",
    // A graph whose "ref" node resolves a registered primitive — validation
    // fails unless both the node AND primitive registries populated. Also a
    // corpus graph, so this same command works against a packed tarball.
    args: [join(root, "bin/pcg.mjs"), "validate", join(root, "graphs/basics-primitive-ref.json")],
    check: (out) => {
      if (!out.includes("ok")) return "validate did not report ok";
      return undefined;
    },
  },
  {
    name: "CLI: pcg nodes pathShift finds the corpus from dist, run OUTSIDE the package",
    // The corpus index is located by walking up from the built module's own
    // URL to the package.json named pcg-ts — not from the working directory.
    // Running from a temp dir is what proves it: a cwd-based lookup would
    // find nothing there and print the "unavailable" note instead. Outside
    // the package the path is printed absolute, and it must name a real file.
    args: [join(root, "bin/pcg.mjs"), "nodes", "pathShift"],
    cwd: "tmp",
    check: (out) => {
      if (/^examples: unavailable/m.test(out)) return "the corpus index was not found from dist";
      const line = /^ {2}(\S+basics-shift-along-a-path\.json) — /m.exec(out);
      if (line === null) return "no examples line naming graphs/basics-shift-along-a-path.json";
      if (!existsSync(line[1])) return `the printed example path does not exist: ${line[1]}`;
      if (!out.includes("all 1: pcg graphs --node pathShift")) return "no `all N: pcg graphs` line";
      if (!out.includes('"type": "pathShift"')) return "no usage snippet quoting the node's JSON";
      return undefined;
    },
  },
  {
    name: "CLI: pcg agents prints the managed block, run OUTSIDE the package",
    // The block quotes each shipped skill's frontmatter, read from the
    // installed package located from the built module — so a cwd with no
    // package in it is what proves the read does not lean on the working
    // directory. The size ceiling is checked on the bytes a consumer gets.
    args: [join(root, "bin/pcg.mjs"), "agents"],
    cwd: "tmp",
    stdoutOnly: true,
    check: (out) => {
      const lines = out.replace(/\n$/, "").split("\n");
      if (lines[0] !== "<!-- BEGIN:pcg-ts-agent-rules -->") return "the first line is not the BEGIN marker";
      if (lines.at(-1) !== "<!-- END:pcg-ts-agent-rules -->") return "the last line is not the END marker";
      const bytes = Buffer.byteLength(out.replace(/\n$/, ""));
      if (bytes > 8192) return `the block is ${bytes} bytes, over the 8192-byte ceiling`;
      if (!out.includes("`node_modules/pcg-ts/skills/graph-authoring/SKILL.md`: ")) return "no skill trigger line";
      if (/[A-Za-z]:[\\/]|\/tmp\/pcg-smoke/.test(out)) return "the block spells a machine-specific path";
      return undefined;
    },
  },
];

function fail(name, detail, proc) {
  console.error(`FAIL  ${name}`);
  if (detail) console.error(`      ${detail}`);
  if (proc) {
    const text = `${proc.stdout ?? ""}${proc.stderr ?? ""}`.trim();
    if (text) console.error(text.split("\n").map((l) => `      | ${l}`).join("\n"));
  }
  process.exitCode = 1;
}

// Guard rail: the build must exist (and be current enough to have every
// entry) before any subprocess spawns.
const requiredEntries = [
  "dist/index.js",
  "dist/primitives/index.js",
  "dist/three/index.js",
  "dist/gpu/index.js",
  "dist/panels/index.js",
  "dist/cli/index.js",
  "dist/worker/index.js",
  "dist/worker/entryNode.js",
  "dist/worker/entryBrowser.js",
  "dist/docs/index.js",
];
const missing = requiredEntries.filter((p) => !existsSync(join(root, p)));
if (missing.length > 0) {
  console.error(`smoke-dist: missing built entries (run \`npm run build\` first):\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

// Every exports target in package.json must be a real file — a rename in
// tsup.config.ts that orphans an exports path should fail here, not at
// install time.
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const [subpath, target] of Object.entries(pkg.exports)) {
  const targets = typeof target === "string" ? [target] : Object.values(target);
  for (const t of targets) {
    if (!existsSync(join(root, t))) {
      fail(`exports["${subpath}"]`, `target ${t} does not exist in the build output`);
    }
  }
}

// The typings must carry the registry's param descriptions: that is what
// `src/nodes/params.generated.ts` exists for, and a d.ts bundler that drops
// comments would lose it with every test still green, since nothing else
// reads the emitted typings' prose. `pointGrid.countX` is the probe because
// its description is one short sentence that no other param shares.
const PARAM_DOC_PROBE = "Number of points along X. Minimum 1.";
{
  const name = "dist/*.d.ts carries the registry's param descriptions";
  const typings = readdirSync(join(root, "dist")).filter((f) => f.endsWith(".d.ts"));
  const carrying = typings.filter((f) => readFileSync(join(root, "dist", f), "utf8").includes(PARAM_DOC_PROBE));
  if (carrying.length === 0) {
    fail(name, `no dist/*.d.ts (of ${typings.length}) contains ${JSON.stringify(PARAM_DOC_PROBE)}, pointGrid.countX's description`);
  } else {
    console.log(`ok    ${name} (${carrying.join(", ")})`);
  }
}

// Names that are library-internal BY CONSTRUCTION — no barrel re-exports
// their module — and must therefore appear in no consumer's typings.
// `adoptTopology` (with `checkTopology` and `installTopology`) installs
// topology by reference, and `resizeForOverwrite`/`addForOverwrite` size
// storage without the default fill: each hands out an obligation the type
// cannot carry, which is why neither is offered. Their source-level tests
// check that no module under `src/` re-exports them; only this reads the
// BUILT typings, where a widened barrel or a d.ts bundler that inlines an
// internal declaration would actually show up.
const INTERNAL_TYPE_NAMES = ["adoptTopology", "checkTopology", "installTopology", "ForOverwrite"];
// The scan must be able to SEE a name before "found none" means anything:
// `cloneGeometry` is published from the root entry, so it has to turn up.
const PUBLISHED_TYPE_PROBE = "cloneGeometry";
{
  const name = "dist/**/*.d.ts publishes no library-internal name";
  const typings = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".d.ts")) typings.push(path);
    }
  };
  walk(join(root, "dist"));
  const texts = typings.map((path) => [path, readFileSync(path, "utf8")]);
  const sawProbe = texts.some(([, text]) => text.includes(PUBLISHED_TYPE_PROBE));
  const offenders = [];
  for (const [path, text] of texts) {
    for (const internal of INTERNAL_TYPE_NAMES) {
      if (text.includes(internal)) offenders.push(`${path.slice(root.length + 1)}: ${internal}`);
    }
  }
  if (!sawProbe) {
    fail(
      name,
      `the scan read ${typings.length} .d.ts files and found no ${JSON.stringify(PUBLISHED_TYPE_PROBE)}, which IS published — it is not reading the typings, so "no internal name" proves nothing`,
    );
  } else if (offenders.length > 0) {
    fail(name, `internal names in the published typings:\n      ${offenders.join("\n      ")}`);
  } else {
    console.log(`ok    ${name} (${typings.length} files, ${INTERNAL_TYPE_NAMES.length} names)`);
  }
}

const started = Date.now();
let ran = 0;

const caseDir = mkdtempSync(join(tmpdir(), "pcg-smoke-"));
try {
  for (const [i, c] of importCases.entries()) {
    const caseFile = join(caseDir, `case-${i}.mjs`);
    writeFileSync(caseFile, c.code);
    const t0 = Date.now();
    const proc = spawnSync(process.execPath, [caseFile], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    ran += 1;
    if (proc.status !== 0) {
      fail(c.name, proc.signal ? `killed by ${proc.signal} (timeout?)` : `exit ${proc.status}`, proc);
    } else {
      console.log(`ok    ${c.name} (${Date.now() - t0}ms)`);
    }
  }
} finally {
  rmSync(caseDir, { recursive: true, force: true });
}

for (const c of cliCases) {
  const t0 = Date.now();
  const cwd = c.cwd === "tmp" ? mkdtempSync(join(tmpdir(), "pcg-smoke-cwd-")) : root;
  let proc;
  try {
    proc = spawnSync(process.execPath, c.args, { cwd, encoding: "utf8", timeout: 30_000 });
  } finally {
    if (cwd !== root) rmSync(cwd, { recursive: true, force: true });
  }
  ran += 1;
  if (proc.status !== 0) {
    fail(c.name, proc.signal ? `killed by ${proc.signal} (timeout?)` : `exit ${proc.status}`, proc);
    continue;
  }
  const problem = c.check(c.stdoutOnly ? (proc.stdout ?? "") : `${proc.stdout ?? ""}${proc.stderr ?? ""}`);
  if (problem) {
    fail(c.name, problem, proc);
  } else {
    console.log(`ok    ${c.name} (${Date.now() - t0}ms)`);
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (process.exitCode) {
  console.error(`\nsmoke-dist: FAILED (${ran} cases, ${elapsed}s)`);
} else {
  console.log(`\nsmoke-dist: all ${ran} cases passed (${elapsed}s)`);
}
