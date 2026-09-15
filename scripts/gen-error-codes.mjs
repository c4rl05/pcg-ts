#!/usr/bin/env node
/**
 * Generate docs/errors.md — every diagnostic code with its meaning — from
 * `DIAGNOSTIC_CODES` in the built library.
 *
 * Usage: node scripts/gen-error-codes.mjs
 *
 * I/O only. The rendering is `renderErrorCodes` in src/docs/errors.ts
 * (imported from dist/docs), and src/docs/errors.test.ts renders through the
 * same function and compares against the committed file.
 *
 * Reads dist/ (run `npm run build` first). Output is deterministic: codes in
 * declaration order, LF newlines, a trailing newline, no timestamp.
 */
import { writeFileSync } from "node:fs";
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
          `gen-error-codes: ${relative.replace("../", "")} not found — the library is not built.`,
          "Run `npm run build` first, then re-run:",
          "  node scripts/gen-error-codes.mjs",
        ].join("\n"),
      );
      process.exit(1);
    }
    throw err;
  }
}

const lib = await importDist("../dist/index.js");
const docs = await importDist("../dist/docs/index.js");

if (typeof docs.renderErrorCodes !== "function" || typeof lib.DIAGNOSTIC_CODES !== "object") {
  console.error("gen-error-codes: dist/ lacks renderErrorCodes or DIAGNOSTIC_CODES; rebuild with `npm run build`.");
  process.exit(1);
}

const text = docs.renderErrorCodes(lib.DIAGNOSTIC_CODES);
writeFileSync(join(root, "docs", "errors.md"), text);
console.log(`gen-error-codes: wrote docs/errors.md (${Object.keys(lib.DIAGNOSTIC_CODES).length} codes)`);
