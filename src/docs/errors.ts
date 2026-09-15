/**
 * The error-code page, `docs/errors.md`: every code in `DIAGNOSTIC_CODES`
 * with its one-line meaning, in declaration order.
 *
 * Generated because the codes are additive-only contracts that programs
 * branch on, and a hand-kept list is exactly the kind that silently misses
 * the newest code. `DIAGNOSTIC_CODES` is the single source; this only
 * formats it. `scripts/gen-error-codes.mjs` writes the file and
 * `errors.test.ts` renders through the same function, so the committed page
 * cannot drift from the build.
 *
 * Pure, no I/O.
 */

/** Markdown-table-safe text: a `|` would end the cell. */
function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

/** Render `docs/errors.md` from a code → description map. LF, trailing newline. */
export function renderErrorCodes(codes: Readonly<Record<string, string>>): string {
  const entries = Object.entries(codes);
  const lines = [
    "# Error codes",
    "",
    "Generated from `DIAGNOSTIC_CODES` (`src/diagnostics/codes.ts`) by `node scripts/gen-error-codes.mjs` — do not edit by hand.",
    "",
    "Every failure the library and the `pcg` CLI report carries one or more `Diagnostic` records, and each record's `code` is one of the codes below. With `--json`, a failing `pcg` command prints exactly one object on stdout, `{ \"ok\": false, \"command\", \"exitCode\", \"errors\": [...], \"warnings\": [...] }`, whose records carry the code, a JSON pointer `path` and, where they apply, the `nodeId`, `pin`, `param`, the accepted alternatives (`valid`) and the nearest ones (`didYouMean`). In code, `diagnosticsOf(err)` returns the same records. `pcg schema diagnostic` prints the record's JSON Schema with this list inside it.",
    "",
    "Codes are additive-only: a published code is never renamed, removed or given a different meaning, so it is safe to branch on. Match on `code`, never on `message`, which is prose and gets reworded.",
    "",
    `${entries.length} codes:`,
    "",
    "| Code | Meaning |",
    "|---|---|",
    ...entries.map(([code, description]) => `| \`${code}\` | ${cell(description)} |`),
    "",
  ];
  return lines.join("\n");
}
