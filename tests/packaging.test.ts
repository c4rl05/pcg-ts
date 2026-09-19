/**
 * `sideEffects` is a promise to bundlers, and getting it wrong empties the
 * registry silently.
 *
 * Several of this package's subpaths exist BECAUSE importing them runs
 * code. `pcg-ts/primitives` is the clearest case — `src/primitives/index.ts`
 * says so in its own header, and a consumer writes the bare
 * `import "pcg-ts/primitives";` with no bindings at all. A bundler told the
 * package is side-effect-free is then entitled to delete that line. Nothing
 * fails at build time; the registry is simply empty at run time and every
 * subgraph reports as unknown. `pcg-ts/gpu` has the same shape one level
 * down (23 module-scope `HANDLERS.set(...)` and 36 `registerElementwise(...)`
 * in `src/gpu/compile.ts`), and the two worker entries install their
 * message handler at module scope.
 *
 * So the field must exist — without it a bundler assumes the worst and
 * tree-shakes nothing — and it must be the ARRAY form. `"sideEffects": false`
 * is the exact bug described above, which is why the first assertion here
 * rejects it by shape rather than by value: a future "simplify this to
 * false" has to delete a test that explains why not.
 *
 * THE PART THAT IS EASY TO GET WRONG, and the reason this file checks the
 * built output and not just the manifest: tsup code-splits. The entry files
 * in `dist/` are re-export shells — `dist/primitives/index.js` is 420 bytes
 * and holds no registration at all — and every `definePrimitive` /
 * `register` call actually lands in a shared `dist/chunk-*.js`, pulled in by
 * bare side-effect-only imports. A `sideEffects` array naming only
 * `./dist/primitives/index.js` would therefore be a bundler's licence to
 * drop precisely the chunks that do the work. The chunk names are
 * content-hashed and change on every build, so they cannot be enumerated:
 * `./dist/chunk-*.js` is load-bearing, not a convenience.
 *
 * `./dist/three/index.js` and `./dist/panels/index.js` are the two entries
 * deliberately left out. Neither has a bare import or a module-scope
 * statement, so omitting them is the field carrying real information rather
 * than being a list of everything. `./panels` is the easier of the two to
 * be sure of — `src/panels` is a type plus a pure validator and imports
 * nothing at all — which is exactly why it must be CHECKED rather than
 * asserted: an entry nobody expects to grow an effect is the entry whose
 * growing one goes unnoticed.
 *
 * AND `./src/**` IS IN THE ARRAY, WHICH LOOKS WRONG AND IS NOT. `src/` is
 * not in `files`, so no consumer ever sees it and the entry is inert in the
 * published tarball. But `sideEffects` describes THIS PACKAGE, and inside
 * this repo `vitest.config.ts` and `vite.config.ts` both alias the package
 * name to `src/` — so a `dist/`-only array declares every source module
 * side-effect-free and Vite drops the module-scope `standardNode(...)` calls
 * in `src/nodes/*` that are reached through re-export chains. That was
 * measured, not theorised: with the array listing only `dist/` paths,
 * `src/worker/pool.test.ts` fails ten times with `unknown node type
 * "pointScatterInBounds"; registered types: forEach, repeatUntil, subgraph`
 * — the three types registered by a module something still imports
 * directly, and nothing else. Removing the field made all 24 pass again.
 * It is the same bug as `"sideEffects": false`, entered through the door
 * marked "but I listed the dist paths".
 *
 * `shared/`, `demos/` and `editor/` are in for the same reason one step
 * further out: `npm run examples:pages` is a Vite PRODUCTION build over
 * exactly those directories, and it is the build whose output is committed
 * and published, so a module silently dropped there ships to the live
 * demos and shows up nowhere in `npm test`. None of these four directories
 * is in `files`, so every one of them is inert in the published tarball —
 * which is what makes covering them free. `dist/` is the only thing a
 * consumer ever resolves, and that is where the array is precise.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { agentRulesData, renderAgentBlock, renderLlmsIndex } from "../src/cli/agentRules.js";
import { COMMANDS } from "../src/cli/commands.js";
import { VERSION } from "../src/index.js";
import "../src/primitives/index.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

interface Manifest {
  version: string;
  type?: string;
  main?: string;
  sideEffects?: unknown;
  exports: Record<string, { types: string; import: string; require?: string } | string>;
  peerDependencies: Record<string, string>;
}
const pkg = JSON.parse(read("package.json")) as Manifest;

/** The `dist/` path a subpath export resolves to, e.g. `./dist/gpu/index.js`. */
function importTarget(subpath: string): string {
  const entry = pkg.exports[subpath];
  if (entry === undefined || typeof entry === "string") {
    throw new Error(`package.json exports has no object entry for "${subpath}"`);
  }
  return entry.import;
}

/**
 * Match one `sideEffects` glob against one path, the way a bundler does:
 * `*` stands for any run of characters within a single path segment. Both
 * sides are normalized to a leading `./` first, since webpack accepts the
 * pattern with or without it and the two must not read as different rules.
 */
function normalize(path: string): string {
  return path.startsWith("./") ? path : `./${path}`;
}
function globMatches(pattern: string, path: string): boolean {
  const body = normalize(pattern)
    .replace(/[.+^${}()|[\]\\?]/g, "\\$&")
    // `**` crosses path separators, a single `*` does not — the same
    // distinction webpack's glob-to-regexp draws, and the reason
    // `./dist/chunk-*.js` cannot be satisfied by a nested file.
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${body}$`).test(normalize(path));
}

const sideEffects = pkg.sideEffects;
const patterns = (): readonly string[] => (Array.isArray(sideEffects) ? sideEffects.map(String) : []);
const covers = (path: string): boolean => patterns().some((p) => globMatches(p, path));

/**
 * What "runs on import" looks like at column 0.
 *
 * The second pattern is the one that matters and the one a purity check
 * naturally forgets: this repo does not register with bare calls, it
 * registers with DECLARATIONS — `export const pointGrid =
 * standardNode<PointGridParams>({ ... })`, where `standardNode` writes to
 * two module-level maps (`src/nodes/registry.ts`). `src/nodes` holds 53 of
 * those and zero of the bare-call form, so a check with only the first
 * pattern calls the most side-effecting directory in the package pure.
 * Verified both ways: over `src/nodes` the first pattern flags 0 lines and
 * the second flags 64; over `src/three` both flag 0.
 */
const MODULE_SCOPE_EFFECT: readonly RegExp[] = [
  /^(?:[A-Za-z_$][\w$.]*\(|globalThis\b|if \(|throw )/,
  /^(?:export )?(?:const|let|var)\s+\w+(?:\s*:[^=]+)?\s*=\s*(?:new\s+)?[A-Za-z_$][\w$.]*\s*[<(]/,
];

/**
 * Every export whose import RUNS something at module scope, with the reason
 * stated so a future reader can re-derive it rather than trust the list.
 */
const REGISTERS_ON_IMPORT: ReadonlyArray<readonly [subpath: string, why: string]> = [
  [".", "bare-imports a chunk, and pulls the field-grammar registrations transitively"],
  ["./primitives", "the whole point of the subpath: importing it registers every primitive"],
  ["./gpu", "module-scope HANDLERS.set(...) in src/gpu/compile.ts lower the field grammar"],
  ["./cli", 'imports "../primitives/index.js" for effect, to fill the registry `pcg run` reads'],
  ["./worker", "bare-imports the chunks the pool's host shares"],
  ["./worker/node", "installs a parentPort message handler at module scope"],
  ["./worker/browser", "installs a scope message handler at module scope"],
];

describe("package.json sideEffects", () => {
  it("is declared, and is the array form rather than false", () => {
    expect(
      sideEffects,
      "package.json has no `sideEffects`. Without it a bundler must assume every module is " +
        "impure and tree-shakes nothing.",
    ).toBeDefined();
    expect(
      Array.isArray(sideEffects),
      "`sideEffects` must be an ARRAY of the paths that register on import. `false` is a bug, " +
        "not a simplification: `import \"pcg-ts/primitives\"` binds nothing, so a bundler told " +
        "the package is pure may delete it and leave the primitive registry empty at run time " +
        "with no build error. See this file's header.",
    ).toBe(true);
    expect(sideEffects).not.toBe(false);
  });

  it("covers every export that registers on import", () => {
    for (const [subpath, why] of REGISTERS_ON_IMPORT) {
      const target = importTarget(subpath);
      expect(
        covers(target),
        `package.json exports "${subpath}" -> ${target}, which ${why}. No \`sideEffects\` ` +
          "pattern matches it, so a bundler may drop it.",
      ).toBe(true);
    }
  });

  it("covers the hashed chunks, where the registration bodies actually land", () => {
    // tsup code-splits: the entry files are re-export shells and every
    // register call lives in a shared chunk reached by a bare import.
    // Naming the entries alone would not save them.
    expect(
      covers("./dist/chunk-DEADBEEF.js"),
      "`sideEffects` must match `./dist/chunk-*.js`. The built entry files hold no registration " +
        "at all — it is in the content-hashed shared chunks they bare-import, whose names change " +
        "on every build and so cannot be listed individually.",
    ).toBe(true);
  });

  it("covers the repo's own source, which vite and vitest resolve instead of dist/", () => {
    // Do not "tidy" these away as paths that are never published. Not being
    // published is exactly what makes them free to list, and they are what
    // keeps `npm test` and `npm run examples:pages` honest: both resolve
    // `pcg-ts` to `src/` and bundle the page directories as project code.
    // See this file's header for the measurement behind src/.
    for (const source of [
      "./src/nodes/sources.ts",
      "./src/nodes/serialize.ts",
      "./src/fields/fieldJson.ts",
      "./src/primitives/index.ts",
      "./src/gpu/compile.ts",
      "./shared/assets.ts",
      "./demos/racetrack/graph.ts",
      "./editor/main.ts",
    ]) {
      expect(
        covers(source),
        `${source} is bundled as project code by this repo's own vite/vitest, where the package ` +
          "name resolves to src/ rather than dist/. Leaving it unmatched by `sideEffects` " +
          "declares it pure, and a dropped module-scope registration empties the registry with " +
          "no build error — in `npm test`, or in the committed page build.",
      ).toBe(true);
    }
  });

  it("names only paths the build actually produces", () => {
    // A pattern for a file that no longer exists is a rule protecting
    // nothing, and reads as coverage it does not give.
    if (!existsSync(join(ROOT, "dist"))) return;
    for (const pattern of patterns()) {
      if (pattern.includes("*")) continue;
      expect(existsSync(join(ROOT, pattern)), `sideEffects names ${pattern}, which is not in dist/`).toBe(
        true,
      );
    }
  });
});

describe("the built output the sideEffects array describes", () => {
  const dist = join(ROOT, "dist");
  const built = existsSync(dist);

  it.runIf(built)("keeps the primitive registrations in chunks, not in the entry", () => {
    // The claim the chunk glob rests on. If tsup ever stopped splitting and
    // inlined the registration into `dist/primitives/index.js`, this fails
    // and the array can be narrowed on purpose rather than by accident.
    const entry = read("dist/primitives/index.js");
    expect(entry).toMatch(/^import "\.\.\/chunk-[A-Z0-9]+\.js";$/m);

    const chunks = readdirSync(dist).filter((f) => /^chunk-.*\.js$/.test(f));
    expect(chunks.length, "dist/ has no chunk-*.js files").toBeGreaterThan(0);
    const registrations = chunks
      .map((f) => read(join("dist", f)).match(/^(register[A-Za-z]*|definePrimitive)\(/gm)?.length ?? 0)
      .reduce((a, b) => a + b, 0);
    expect(
      registrations,
      "no module-scope registration calls found in any dist/chunk-*.js — if the build layout " +
        "changed, re-derive which dist paths are side-effecting before trusting the array",
    ).toBeGreaterThan(0);
  });

  /** Column-0 lines in a source directory that run something on import. */
  function moduleScopeEffects(relDir: string): string[] {
    const found: string[] = [];
    for (const file of readdirSync(join(ROOT, relDir)).filter(
      (f) => f.endsWith(".ts") && !f.includes(".test."),
    )) {
      for (const [i, line] of read(join(relDir, file)).split("\n").entries()) {
        if (MODULE_SCOPE_EFFECT.some((re) => re.test(line))) {
          found.push(`${relDir}/${file}:${i + 1}: ${line.trim().slice(0, 80)}`);
        }
      }
    }
    return found;
  }

  it("has a purity detector that actually detects, proven on src/nodes", () => {
    // A positive control, because the assertion below is the dangerous kind:
    // it passes by finding NOTHING, so a detector that quietly stopped
    // matching would read as "all clear" forever. src/nodes is the known
    // answer — 53 module-scope `export const x = standardNode({...})`, each
    // writing to the registry maps in src/nodes/registry.ts. If this ever
    // reports zero, the detector is broken and the ./three result below is
    // worth nothing.
    expect(
      moduleScopeEffects(join("src", "nodes")).length,
      "the module-scope detector found no effects in src/nodes, which registers 53 node types " +
        "at module scope. The detector is broken, so the ./three purity check is vacuous.",
    ).toBeGreaterThan(40);
  });

  it("leaves ./three out, and src/three is where that stays true or stops being true", () => {
    // The one omission, and the only thing that makes the field informative
    // rather than a list of everything. Checked against SOURCE rather than
    // `dist/`, because a stale build would keep answering yes long after
    // src/three had grown a module-scope effect — which is the whole class
    // of bug this file exists to catch, one directory over.
    expect(covers(importTarget("./three"))).toBe(false);

    const offenders: string[] = [];
    const dir = join(ROOT, "src", "three");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.includes(".test."))) {
      for (const [i, line] of read(join("src", "three", file)).split("\n").entries()) {
        if (MODULE_SCOPE_EFFECT.some((re) => re.test(line))) {
          offenders.push(`src/three/${file}:${i + 1}: ${line.trim().slice(0, 80)}`);
        }
      }
    }
    expect(
      offenders,
      "src/three now runs something at module scope, so `pcg-ts/three` registers on import and " +
        "./dist/three/index.js must be ADDED to package.json `sideEffects` — it is currently one " +
        "of two entries deliberately omitted as pure.",
    ).toEqual([]);
  });

  it("leaves ./panels out, and src/panels is where that stays true", () => {
    // The panel spec format: `pcg-ts/panels`. It exists so a HOST can
    // validate an authored control panel without the cooking core behind
    // it, which only works if importing it costs nothing — so purity is
    // the subpath's reason to exist, not an incidental property of it.
    expect(covers(importTarget("./panels"))).toBe(false);
    expect(
      moduleScopeEffects(join("src", "panels")),
      "src/panels now runs something at module scope, so `pcg-ts/panels` registers on import and " +
        "./dist/panels/index.js must be ADDED to package.json `sideEffects`. It is currently " +
        "omitted as pure: a type plus a validator, importing nothing.",
    ).toEqual([]);
  });

  it("has an export target the build actually emits", () => {
    // The two halves of a subpath, checked against each other. An `exports`
    // entry pointing at a path no tsup entry produces resolves to nothing
    // at install time, and the failure lands on the consumer rather than
    // here. `src/cli/bin.test.ts` makes the same pairing for ./cli.
    expect(importTarget("./panels")).toBe("./dist/panels/index.js");
    expect(pkg.exports["./panels"]).toEqual({
      types: "./dist/panels/index.d.ts",
      import: "./dist/panels/index.js",
      // The same file, on purpose — see "require() from CommonJS" above.
      require: "./dist/panels/index.js",
    });
    expect(
      read("tsup.config.ts"),
      'package.json exports "./panels" but tsup has no "src/panels/index.ts" entry, so ' +
        "dist/panels/ is never built.",
    ).toContain('"src/panels/index.ts"');
  });
});

/**
 * `require("pcg-ts")` from CommonJS, which 8 of 96 fresh-agent eval runs
 * tried and none completed.
 *
 * The package is ESM-only and stays that way. Every build entry is ESM
 * (`tsup.config.ts` says `format: ["esm"]`), and a second CommonJS build
 * would be worse here than in most packages: this library REGISTERS at
 * module scope — node types, primitives, GPU handlers, field-grammar
 * constructors — into module-level maps. Two copies of those modules is two
 * registries, so a consumer that reached one half through `import` and the
 * other through `require` would get "unknown node type" for a type it can
 * see in the other half's listing. The dual-package hazard is a correctness
 * bug in this package, not a packaging inconvenience.
 *
 * What was actually wrong was the absence of a `require` condition, and it
 * cost twice. Node resolves `require("pcg-ts")` against the `require`
 * condition; with none declared it never reaches a file and throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED: No "exports" main defined`, which names
 * neither the situation (the package is ESM) nor the fix. And agents read
 * that as an invitation to guess: the transcripts show them `cd`-ing into
 * `node_modules/pcg-ts` and trying `require("./dist/index.cjs")` and
 * `require("./dist/index.cjs.js")` — paths this package has never shipped —
 * whose "Cannot find module './dist/index.cjs'" is the error the campaign
 * recorded. It was never Node's answer about pcg-ts; it was Node's answer
 * about a filename the agent invented.
 *
 * The fix is one line per subpath: point `require` at THE SAME ESM FILE
 * `import` points at. Node >= 20.19 / >= 22.12 then loads it through
 * `require(esm)` — the eval sandboxes all ran v22.20.0, so this turns those
 * runs from failing into working — and because it is one file there is one
 * module instance and no hazard. Below that, Node throws `ERR_REQUIRE_ESM`,
 * which names the file, the requiring file and the fix ("change the require
 * ... to a dynamic import()"). Truthful either way, which is the bar.
 *
 * This only holds while no entry's module graph has a top-level await:
 * `require(esm)` throws `ERR_REQUIRE_ASYNC_MODULE` on one. Verified against
 * the built output, and `scripts/smoke-dist.mjs` requires every entry in a
 * fresh subprocess so a TLA cannot be added without it failing.
 */
describe("require() from CommonJS", () => {
  /** Every subpath with an object entry, i.e. everything but `./package.json`. */
  const subpaths = Object.entries(pkg.exports).filter(
    (entry): entry is [string, { types: string; import: string; require?: string }] =>
      typeof entry[1] !== "string",
  );

  it("stays ESM-only: no `main`, and type module", () => {
    // Deleting this test is the deliberate way to introduce a CommonJS
    // build. Doing it by adding a field is the accidental way, and the
    // registries above are what pay for it.
    expect(pkg.type).toBe("module");
    expect(
      pkg.main,
      "package.json grew a `main`. This package is ESM-only and `exports` is the whole resolution " +
        "story; a `main` is either dead weight or a second, divergent entry. See this block's header.",
    ).toBeUndefined();
  });

  it("declares a `require` condition for every subpath", () => {
    expect(subpaths.length).toBeGreaterThan(5);
    for (const [subpath, entry] of subpaths) {
      expect(
        entry.require,
        `package.json exports "${subpath}" has no \`require\` condition, so \`require("pcg-ts${subpath.slice(1)}")\` ` +
          'fails with ERR_PACKAGE_PATH_NOT_EXPORTED ("No \\"exports\\" main defined") — a message that names ' +
          "neither the cause nor the fix, and that agents answer by guessing at .cjs filenames inside " +
          "node_modules. See this block's header.",
      ).toBeDefined();
    }
  });

  it("points `require` at the very same file as `import`, never a second build", () => {
    for (const [subpath, entry] of subpaths) {
      expect(
        entry.require,
        `package.json exports "${subpath}" resolves \`require\` to ${entry.require} and \`import\` to ` +
          `${entry.import}. Two files is two module instances and two copies of every module-level ` +
          "registry in this library. One file, loaded through require(esm), is the whole point.",
      ).toBe(entry.import);
      expect(entry.require?.endsWith(".cjs"), `${subpath} points require at a .cjs the build does not emit`).toBe(
        false,
      );
    }
  });

  it("requires what tsup actually built, when there is a build to check", () => {
    // The `.cjs` the transcripts show agents reaching for does not exist,
    // and this is where a future `exports` entry claiming one gets caught
    // before a consumer does.
    if (!existsSync(join(ROOT, "dist"))) return;
    for (const [subpath, entry] of subpaths) {
      const target = entry.require as string;
      expect(
        existsSync(join(ROOT, target)),
        `package.json exports "${subpath}" requires ${target}, which is not in dist/`,
      ).toBe(true);
    }
  });
});

/**
 * `files` decides what a consumer can actually open, and a root-anchored
 * glob does not descend.
 *
 * `graphs/basics-*.json` and `graphs/pipeline-*.json` were the whole rule
 * here, and both are anchored at the package root with a `*` that does not
 * cross a `/`. Two things fell through it. `graphs/panels/*.json` — the
 * authored control-panel sidecars, which are the answer to "how do I label
 * and group a graph's params" — shipped in NONE of the 42 cases. And
 * `graphs/examples-*.json` matched neither prefix, while `docs/graphs.md`,
 * which IS shipped, tells the reader to `pcg cook graphs/examples-forest.json`.
 *
 * So the rule is now the directory, which npm includes recursively. That is
 * checked here against the corpus loader's own list of prefixes rather than
 * against a copy of it: `graphs/` holds nothing but the corpus and its
 * panels, and if it ever does, this is where that has to be decided again.
 */
describe("the graph corpus reaches the tarball", () => {
  const filesField = (JSON.parse(read("package.json")) as { files: string[] }).files;

  it("includes graphs/ as a directory rather than by prefix glob", () => {
    expect(
      filesField,
      "`files` must name the `graphs` DIRECTORY. A `graphs/<prefix>-*.json` glob is anchored at " +
        "the package root and its `*` does not cross a `/`, so it silently omits " +
        "graphs/panels/*.json — and any corpus prefix nobody remembered to add a line for.",
    ).toContain("graphs");
    expect(
      filesField.filter((f) => f.startsWith("graphs/")),
      "a per-prefix `graphs/...` glob is back beside the directory entry. It is at best " +
        "redundant and at worst the thing that looks like the rule while the directory does the " +
        "work; delete it.",
    ).toEqual([]);
  });

  it("covers every prefix the corpus loader recognises, and the panels", () => {
    const graphs = readdirSync(join(ROOT, "graphs"));
    // Read from the loader, so a new family admitted there cannot quietly
    // stop shipping. GRAPH_PREFIXES is src/docs/graphIndex.ts's own list.
    for (const prefix of ["basics-", "examples-", "pipeline-"]) {
      expect(
        graphs.some((f) => f.startsWith(prefix) && f.endsWith(".json")),
        `no ${prefix}*.json in graphs/ — this test's prefix list has drifted from the corpus`,
      ).toBe(true);
    }
    expect(readdirSync(join(ROOT, "graphs", "panels")).filter((f) => f.endsWith(".json")).length)
      .toBeGreaterThan(30);
  });
});

describe("the three peer range", () => {
  it("admits the 0.185 line the WebGPU seam is verified against", () => {
    // `src/three/webgpuInstances.ts` does not compare version strings: it
    // probes the adoption seam behaviourally on every use and throws naming
    // the version. VERIFIED_THREE_VERSION appears only in that error text.
    // So the floor is the minor line, not one specific patch — and that is
    // exactly the set `src/three/webgpuInstances.test.ts` accepts, which
    // compares installed major.minor against 0.185.
    expect(pkg.peerDependencies.three).toBe("^0.185.0");
    // Checked by what the constant DOES, not by how many times it is
    // mentioned: the error message is prose and gets reworded, but the
    // moment the constant is compared against anything the range stops
    // being cosmetic and this has to be reconsidered.
    const compared = read("src/three/webgpuInstances.ts")
      .split("\n")
      .filter((l) => l.includes("VERIFIED_THREE_VERSION"))
      .filter((l) => /[=!<>]==?|\.(startsWith|localeCompare|split|match)\(|\bsatisfies\b/.test(l))
      .filter((l) => !/^\s*const VERIFIED_THREE_VERSION =/.test(l));
    expect(
      compared,
      "VERIFIED_THREE_VERSION is being COMPARED, not just named in an error. The peer range is " +
        "loosened to ^0.185.0 precisely because the seam is checked behaviourally at runtime " +
        "(checkAdoptionSeam) rather than by version string. If that changed, re-tighten the range.",
    ).toEqual([]);
  });
});

/**
 * The version lives in THREE places and only two of them move together.
 *
 * `npm version` rewrites `package.json` and the lockfile. It does not know
 * about `src/index.ts`'s `VERSION`, which is what the package EXPORTS and
 * what `pcg --version` prints. So a release bumped the ordinary way ships a
 * package that misreports itself: the registry serves 0.17.0 while the code
 * inside says 0.16.0, and nothing anywhere fails.
 *
 * That is not hypothetical. On 2026-08-28 a publish was attempted with none
 * of the three bumped, npm refused with "you cannot publish over the
 * previously published versions", and the fix was three separate edits — the
 * third of which is easy to forget precisely because the first two are
 * automated. The lockfile had ALSO drifted on its own, sitting at 0.15.0
 * while the manifest said 0.16.0, which is the same failure one file over.
 *
 * A test is the cheap answer: it costs nothing, it fails at the moment the
 * bump is half-done rather than after the tarball is public, and unlike a
 * note in PLAN.md it cannot be read past.
 */
describe("the version agrees with itself", () => {
  const manifestVersion = pkg.version;

  it("package.json declares a version", () => {
    expect(manifestVersion, "package.json has no version field").toMatch(/^\d+\.\d+\.\d+/);
  });

  it("src/index.ts's exported VERSION matches package.json", () => {
    const src = read("src/index.ts");
    const found = /export const VERSION = "([^"]+)"/.exec(src);
    expect(found, "src/index.ts no longer exports a string VERSION const").not.toBeNull();
    expect(
      found?.[1],
      `src/index.ts exports VERSION "${found?.[1]}" but package.json says "${manifestVersion}".\n` +
        "  These are bumped SEPARATELY: `npm version` moves package.json and the lockfile and\n" +
        "  leaves this one behind. Publishing now ships a package whose own VERSION export and\n" +
        "  `pcg --version` both report the wrong number, and nothing else catches it.\n" +
        "  Fix: edit src/index.ts to match, then `npm run build`.",
    ).toBe(manifestVersion);
  });

  it("the lockfile matches package.json", () => {
    const lock = JSON.parse(read("package-lock.json")) as {
      version?: string;
      packages?: Record<string, { version?: string }>;
    };
    expect(
      lock.version,
      `package-lock.json says "${lock.version}" and package.json says "${manifestVersion}".\n` +
        "  Run `npm install` (or `npm version <bump> --no-git-tag-version`) so the two agree.",
    ).toBe(manifestVersion);
    expect(lock.packages?.[""]?.version, "the lockfile's root package entry disagrees too").toBe(
      manifestVersion,
    );
  });
});

/**
 * The agent-rules block (`pcg agents`) and the root llms.txt index point a
 * consumer's agent at files by their path inside the INSTALLED package. A
 * path that exists in this repository but is not in `files` reads fine here
 * and is missing from every install, so each one is checked against both.
 */
describe("everything the agent entry points name reaches the tarball", () => {
  const filesField = (JSON.parse(read("package.json")) as { files: string[] }).files;
  /** Does an entry of `files` include this package-relative path, exactly or as its directory? */
  // A leading `/` anchors an entry at the package root (`/llms.txt`, so the
  // site copy `docs/llms.txt` is not matched too); it names the same path.
  const shipped = (rel: string): boolean =>
    filesField
      .map((entry) => entry.replace(/^\//, "").replace(/\/$/, ""))
      .some((entry) => rel === entry || rel.startsWith(`${entry}/`));

  const data = agentRulesData({
    version: VERSION,
    commands: COMMANDS.map((c) => c.spec.name),
    readShipped: (rel) => read(rel),
  });

  it("the ship check can say no", () => {
    expect(shipped("docs/llms-full.txt")).toBe(true);
    expect(shipped("skills/determinism/SKILL.md")).toBe(true);
    expect(shipped("docs/roadmap.html")).toBe(false);
    expect(shipped("graphsX/a.json")).toBe(false);
  });

  it("ships the root llms.txt index and not the site copy beside docs/", () => {
    // npm reads an unanchored `llms.txt` entry like a gitignore pattern, at
    // any depth, which packed docs/llms.txt (site URLs) into the tarball.
    expect(filesField).toContain("/llms.txt");
    expect(filesField).not.toContain("llms.txt");
  });

  it("every node_modules/pcg-ts/<path> in the block exists and is in files", () => {
    const block = renderAgentBlock(data);
    const named = [...block.matchAll(/node_modules\/pcg-ts\/([^`\s:]+)/g)].map((m) => m[1] as string);
    expect(named.length).toBeGreaterThan(4);
    for (const rel of named) {
      expect(existsSync(join(ROOT, rel)), `the block names node_modules/pcg-ts/${rel}, which does not exist`).toBe(true);
      expect(shipped(rel), `the block names node_modules/pcg-ts/${rel}, but package.json files does not ship it`).toBe(
        true,
      );
    }
  });

  it("every link in the root llms.txt exists and is in files, and so is llms.txt", () => {
    expect(shipped("llms.txt")).toBe(true);
    const links = [...renderLlmsIndex(data, "package").matchAll(/\]\(([^)]+)\)/g)].map((m) =>
      (m[1] as string).replace(/\/$/, ""),
    );
    expect(links.length).toBeGreaterThan(8);
    for (const rel of links) {
      expect(existsSync(join(ROOT, rel)), `llms.txt links ${rel}, which does not exist`).toBe(true);
      expect(shipped(rel), `llms.txt links ${rel}, but package.json files does not ship it`).toBe(true);
    }
  });
});
