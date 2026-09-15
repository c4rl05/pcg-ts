import {
  type Diagnostic,
  type DiagnosticCode,
  diagnosticsOf,
  errorDiagnostics,
  isDiagnosticCode,
  sanitizeDiagnostics,
} from "../diagnostics/index.js";

/**
 * Base class of all graph runtime errors.
 *
 * Every graph error carries `diagnostics`: the same fault as machine-readable
 * records (see `diagnosticsOf`). The trailing constructor argument is
 * optional on every class — a code, or the full record list — and when it
 * is absent the error carries one record with the class's coarse code and
 * the message verbatim, so an unmigrated `throw` still yields a record.
 */
export class GraphError extends Error {
  /** This fault as records; never empty. */
  readonly diagnostics: readonly Diagnostic[];

  constructor(
    message: string,
    options?: ErrorOptions,
    diagnostics?: DiagnosticCode | readonly Diagnostic[],
  ) {
    super(message, options);
    this.name = "GraphError";
    this.diagnostics = errorDiagnostics(message, diagnostics, "error");
  }
}

/**
 * Invalid graph construction or use: unknown nodes or pins, pin kind
 * mismatch, duplicate connections on single pins, duplicate ids/names.
 */
export class GraphValidationError extends GraphError {
  constructor(
    message: string,
    options?: ErrorOptions,
    diagnostics?: DiagnosticCode | readonly Diagnostic[],
  ) {
    super(message, options, diagnostics);
    this.name = "GraphValidationError";
  }
}

/** A connection would create (or a traversal found) a cycle. */
export class GraphCycleError extends GraphError {
  constructor(
    message: string,
    options?: ErrorOptions,
    diagnostics?: DiagnosticCode | readonly Diagnostic[],
  ) {
    super(message, options, errorDiagnostics(message, diagnostics, "cycle"));
    this.name = "GraphCycleError";
  }
}

/**
 * A cook was aborted via its AbortSignal. Completed nodes keep their
 * caches, so a re-cook resumes where the cancelled one left off.
 */
export class CookCancelledError extends GraphError {
  constructor(message = "cook cancelled", diagnostics?: DiagnosticCode | readonly Diagnostic[]) {
    super(message, undefined, errorDiagnostics(message, diagnostics, "cook-cancelled"));
    this.name = "CookCancelledError";
  }
}

/**
 * The record a failed execute carries, derived from its cause.
 *
 * The code is the cause's own when the cause is classified — a bad field
 * spec stays `invalid-field-spec` — and `node-execution-failed` when it is
 * not. The cause's other fields (param, key, valid, …) ride along when it
 * is classified, because they still describe the fault; `nodeId` is this
 * node's, and `nodePath` prepends it to a nested execution's path, so the
 * outermost node comes first and the node whose execute threw comes last.
 *
 * `cook-cancelled` is the one classified code NOT inherited. The scheduler
 * rethrows a genuine cancellation unwrapped (it checks the signal
 * actually aborted), so a `CookCancelledError` that reaches this wrapper
 * was thrown with no abort behind it — a failure, and a caller that
 * treats `cook-cancelled` as benign must not be told otherwise.
 */
function executionDiagnostic(nodeId: string, cause: unknown, message: string): Diagnostic {
  const inner = diagnosticsOf(cause)[0] as Diagnostic;
  const innerPath = cause instanceof NodeExecutionError ? (inner.nodePath ?? [cause.nodeId]) : [];
  const nodePath = [nodeId, ...innerPath];
  if (inner.code !== "error" && inner.code !== "cook-cancelled") {
    return { ...inner, severity: "error", message, nodeId, nodePath };
  }
  return { code: "node-execution-failed", severity: "error", message, nodeId, nodePath };
}

/**
 * A node's execute threw; wraps the cause and records the node id.
 *
 * Its `diagnostics` are derived from the cause (see the record builder
 * above) unless the trailing argument supplies them — a code, which keeps
 * `nodeId` and a one-entry `nodePath`, or the full list, which is how the
 * worker protocol restores a record that crossed the thread boundary
 * without its cause.
 */
export class NodeExecutionError extends GraphError {
  /** Id of the node instance whose execute failed. */
  readonly nodeId: string;

  constructor(
    nodeId: string,
    cause: unknown,
    message?: string,
    diagnostics?: DiagnosticCode | readonly Diagnostic[],
  ) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const text = message ?? `node "${nodeId}" failed: ${detail}`;
    // Validated rather than trusted, as every class's trailing argument is:
    // an untyped caller's bad code or list falls back to the record derived
    // from the cause, which keeps `nodeId`, instead of throwing here.
    const records: readonly Diagnostic[] = isDiagnosticCode(diagnostics)
      ? [{ code: diagnostics, severity: "error", message: text, nodeId, nodePath: [nodeId] }]
      : (sanitizeDiagnostics(diagnostics) ?? [executionDiagnostic(nodeId, cause, text)]);
    super(text, { cause }, records);
    this.name = "NodeExecutionError";
    this.nodeId = nodeId;
  }
}
