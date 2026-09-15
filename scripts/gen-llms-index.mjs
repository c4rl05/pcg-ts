#!/usr/bin/env node
/**
 * Generate the two llms.txt indexes (llmstxt.org convention):
 *
 * - `llms.txt` at the package root: package-relative links, shipped in the
 *   tarball beside `package.json`;
 * - `docs/llms.txt`: the published site's URLs for `docs/*`, and raw
 *   repository URLs for `skills/` and `graphs/`, which the site does not
 *   serve.
 *
 * The long hand-written guide is `docs/llms-full.txt`; these are its index.
 *
 * Usage: node scripts/gen-llms-index.mjs
 *
 * I/O only. The rendering is `renderLlmsIndex` in src/cli/agentRules.ts
 * (imported from dist/docs), the same data `pcg agents` renders its block
 * from, and src/cli/agentRules.test.ts renders through it and compares
 * against both committed files.
 *
 * Reads dist/ (run `npm run build` first). Output is deterministic: LF
 * newlines, a trailing newline, no timestamp.
 */
import { readFileSync, writeFileSync } from "node:fs";
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
          `gen-llms-index: ${relative.replace("../", "")} not found — the library is not built.`,
          "Run `npm run build` first, then re-run:",
          "  node scripts/gen-llms-index.mjs",
        ].join("\n"),
      );
      process.exit(1);
    }
    throw err;
  }
}

const lib = await importDist("../dist/index.js");
// Side effect only: the primitives must be registered for the data to name them.
await importDist("../dist/primitives/index.js");
const docs = await importDist("../dist/docs/index.js");

if (typeof docs.renderLlmsIndex !== "function" || typeof docs.cliCommandNames !== "function") {
  console.error("gen-llms-index: dist/docs/index.js lacks renderLlmsIndex or cliCommandNames; rebuild with `npm run build`.");
  process.exit(1);
}

const data = docs.agentRulesData({
  version: lib.VERSION,
  commands: docs.cliCommandNames(),
  readShipped: (rel) => readFileSync(join(root, rel), "utf8"),
});

for (const [rel, base] of [
  ["llms.txt", "package"],
  ["docs/llms.txt", "site"],
]) {
  const text = docs.renderLlmsIndex(data, base);
  writeFileSync(join(root, rel), text);
  console.log(`gen-llms-index: wrote ${rel} (${Buffer.byteLength(text)} bytes, ${base} links)`);
}
