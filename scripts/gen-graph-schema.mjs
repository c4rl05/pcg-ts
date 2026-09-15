#!/usr/bin/env node
/**
 * Generate docs/graph.schema.json — the JSON Schema (draft 2020-12) of the
 * serialized graph format — from the built library's registries.
 *
 * Usage: node scripts/gen-graph-schema.mjs
 *
 * I/O only: the schema is built by `graphJsonSchema()` (src/nodes/graphSchema.ts,
 * imported here from dist), and the drift test in src/nodes/graphSchema.test.ts
 * renders through the same function with the same formatting, so the two
 * cannot disagree about the bytes.
 *
 * THE SHIPPED PRIMITIVES MUST BE REGISTERED FIRST, which is why
 * dist/primitives/index.js is imported below purely for its side effect: a
 * `ref` node's name enum and its per-primitive params come from the
 * named-subgraph registry at the moment the schema is built, and without the
 * import every corpus graph that references a primitive would fail to
 * validate against the published file. The drift test imports the same
 * module for the same reason.
 *
 * Reads dist/index.js and dist/primitives/index.js (run `npm run build`
 * first). Output is deterministic: keys sorted by the generator, two-space
 * indentation, LF newlines, a trailing newline, no timestamp.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDir);

/** Import a built module, failing with the build instruction instead of a stack. */
async function importDist(relative) {
  const url = new URL(relative, import.meta.url);
  try {
    return await import(url.href);
  } catch (err) {
    const code = err && err.code;
    const message = err && err.message ? String(err.message) : "";
    if (code === "ERR_MODULE_NOT_FOUND" && message.includes("dist")) {
      console.error(
        [
          `gen-graph-schema: ${relative.replace("../", "")} not found — the library is not built.`,
          "Run `npm run build` first, then re-run:",
          "  node scripts/gen-graph-schema.mjs",
        ].join("\n"),
      );
      process.exit(1);
    }
    throw err;
  }
}

const lib = await importDist("../dist/index.js");
// Side effect only: this is what puts the primitives in the registry.
await importDist("../dist/primitives/index.js");

if (typeof lib.graphJsonSchema !== "function") {
  console.error("gen-graph-schema: dist/index.js does not export graphJsonSchema(); rebuild with `npm run build`.");
  process.exit(1);
}

const schema = lib.graphJsonSchema();
const text = `${JSON.stringify(schema, null, 2)}\n`;

const docsDir = join(root, "docs");
mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "graph.schema.json"), text);
const refs = lib.listSubgraphs().length;
console.log(
  `gen-graph-schema: wrote docs/graph.schema.json (${Math.round(text.length / 1024)} KB; ${
    lib.listNodeTypes().length
  } node types, ${lib.listFieldFns().length} field fns, ${refs} ${refs === 1 ? "primitive" : "primitives"})`,
);
