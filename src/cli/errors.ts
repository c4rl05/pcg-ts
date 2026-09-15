/**
 * CLI-level failures, and the exit codes they map to.
 *
 * Library errors are never wrapped in a {@link CliError} to change their
 * message: naming the offending node, pin or param is the library's job
 * and the CLI must not blur it. A CliError carries what the CLI itself
 * knows — a path it could not read, a name it could not find — as the same
 * `Diagnostic` records a library error carries, so `--json` reports every
 * failure in one shape.
 */
import type { Diagnostic, DiagnosticCode, JsonValue } from "../diagnostics/index.js";
import { errorDiagnostics } from "../diagnostics/index.js";

/** The command did what it was asked. */
export const EXIT_OK = 0;
/**
 * A named thing does not exist (an unknown node type, field fn, node id,
 * output or primitive; a file that cannot be read), or the run failed (a
 * cook that threw).
 */
export const EXIT_FAILURE = 1;
/**
 * The command line itself is wrong: an unknown command, an unknown flag, a
 * missing argument, or a flag value of the wrong shape or out of range.
 */
export const EXIT_USAGE = 2;
/**
 * The graph DOCUMENT is invalid: not JSON, refused by the loader, or
 * failing the structural checks (`diagnoseGraph`) on the part of the graph
 * the command would cook — and, under `validate --strict`, carrying a
 * warning.
 */
export const EXIT_INVALID_GRAPH = 3;

/** The exit codes a {@link CliError} may carry: usage errors have their own class. */
export type CliFailureExit = typeof EXIT_FAILURE | typeof EXIT_INVALID_GRAPH;

/** The optional record fields a CLI error can state about its fault. */
export interface CliErrorFields {
  readonly path?: string;
  readonly nodeId?: string;
  readonly nodePath?: readonly string[];
  readonly pin?: string;
  readonly param?: string;
  readonly key?: string;
  readonly got?: JsonValue;
  readonly valid?: readonly string[];
  readonly expected?: string;
  readonly didYouMean?: readonly string[];
  readonly fix?: string;
}

/** Options for {@link CliError}. */
export interface CliErrorOptions extends CliErrorFields {
  /** The record's code; default `error`. Ignored when `diagnostics` is given. */
  readonly code?: DiagnosticCode;
  /** Default {@link EXIT_FAILURE}. */
  readonly exitCode?: CliFailureExit;
  /**
   * The complete error records, when the failure is several faults (a graph
   * the loader refused). Replaces the one record built from the fields.
   */
  readonly diagnostics?: readonly Diagnostic[];
  /** Warnings found alongside the errors, reported with them. */
  readonly warnings?: readonly Diagnostic[];
}

const FIELD_KEYS = [
  "path",
  "nodeId",
  "nodePath",
  "pin",
  "param",
  "key",
  "got",
  "valid",
  "expected",
  "didYouMean",
  "fix",
] as const;

/** One record from a message, a code and whichever fields are set. */
export function cliRecord(
  code: DiagnosticCode,
  message: string,
  fields: CliErrorFields = {},
  severity: Diagnostic["severity"] = "error",
): Diagnostic {
  const record: { -readonly [K in keyof Diagnostic]: Diagnostic[K] } = { code, severity, message };
  for (const k of FIELD_KEYS) {
    const v = fields[k];
    if (v !== undefined) (record as unknown as Record<string, unknown>)[k] = v;
  }
  return record;
}

/**
 * A CLI-level failure that is not a misuse of the command line: an
 * unreadable file, invalid JSON, a graph the loader refused, a graph with
 * nothing to cook, a name that does not exist.
 */
export class CliError extends Error {
  /** The first record's code. */
  readonly code: DiagnosticCode;
  /** The process exit code this failure maps to. */
  readonly exitCode: CliFailureExit;
  /** Every error record; never empty. */
  readonly diagnostics: readonly Diagnostic[];
  /** Warnings found alongside the errors; often empty. */
  readonly warnings: readonly Diagnostic[];
  readonly path?: string;
  readonly nodeId?: string;
  readonly nodePath?: readonly string[];
  readonly pin?: string;
  readonly param?: string;
  readonly key?: string;
  readonly got?: JsonValue;
  readonly valid?: readonly string[];
  readonly expected?: string;
  readonly didYouMean?: readonly string[];
  readonly fix?: string;

  constructor(message: string, opts: CliErrorOptions = {}) {
    super(message);
    this.name = "CliError";
    const single = cliRecord(opts.code ?? "error", message, opts);
    this.diagnostics = errorDiagnostics(
      message,
      opts.diagnostics !== undefined && opts.diagnostics.length > 0 ? opts.diagnostics : [single],
      "error",
    );
    this.code = (this.diagnostics[0] as Diagnostic).code;
    this.exitCode = opts.exitCode ?? EXIT_FAILURE;
    this.warnings = opts.warnings ?? [];
    for (const k of FIELD_KEYS) {
      const v = opts[k];
      if (v !== undefined) (this as unknown as Record<string, unknown>)[k] = v;
    }
  }
}
