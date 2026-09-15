/**
 * How the CLI states diagnostics: one text line per record for a person,
 * and the one JSON object every `--json` failure prints for a program.
 */
import type { Diagnostic } from "../index.js";

/**
 * One record as a line: severity, code, where in the document, and the
 * message — `error unknown-param at /nodes/1/params/cuont: node "b": ...`.
 * The whole document is `(document)`, since an empty pointer reads as
 * nothing at all.
 */
export function diagnosticLine(d: Diagnostic): string {
  const where = d.path === undefined ? "" : ` at ${d.path === "" ? "(document)" : d.path}`;
  return `${d.severity} ${d.code}${where}: ${d.message}`;
}

/**
 * What a command hands back besides its outcome: the warnings its checks
 * found. `runCli` prints them on stderr and adds them to the JSON report —
 * the success report and the failure envelope alike — so a warning found
 * before a cook threw is not lost with it.
 */
export interface RunContext {
  warn(records: readonly Diagnostic[]): void;
}

/**
 * What `--json` prints on stdout for EVERY failure, whatever its class:
 * a misuse of the command line, a file that cannot be read, a document
 * that is not a graph, a cook that threw. `command` is the subcommand the
 * line named, or `null` when it named none the CLI has.
 */
export interface FailureReport {
  readonly ok: false;
  readonly command: string | null;
  readonly exitCode: number;
  /** Never empty. */
  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
}
