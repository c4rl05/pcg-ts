/**
 * Structured diagnostics: every failure as a list of records with a stable
 * code, a location and machine-readable alternatives.
 *
 * A LEAF: nothing in this directory imports from the rest of the library
 * (`codes.test.ts` walks the files to hold that), because every
 * layer that throws imports it.
 *
 * The root import publishes `Diagnostic`, `DiagnosticCode`,
 * `DIAGNOSTIC_CODES` and `diagnosticsOf` by name. The rest of what this
 * barrel carries is the library's own plumbing — the suggester, the record
 * validator, the error-class helper — and is reached by internal callers
 * only.
 */
export { DIAGNOSTIC_CODES, type DiagnosticCode, isDiagnosticCode } from "./codes.js";
export {
  diagnosticsOf,
  errorDiagnostics,
  isDiagnostic,
  isDiagnosticList,
  sanitizeDiagnostics,
} from "./record.js";
export { closestNames, editDistance } from "./suggest.js";
export type { Diagnostic, JsonValue } from "./types.js";
