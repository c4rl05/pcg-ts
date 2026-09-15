/**
 * Building, validating and recovering diagnostic records.
 *
 * `diagnosticsOf` is the public half: it answers "what went wrong, as
 * data" for ANY thrown value. The rest is internal plumbing the error
 * classes and the worker protocol share. Nothing here uses `instanceof`
 * — this module imports no error class, and an error that crossed a
 * realm (a worker, a second copy of the package) fails `instanceof`
 * anyway — so classification reads `name` and shape.
 */
import { type DiagnosticCode, isDiagnosticCode } from "./codes.js";
import type { Diagnostic, JsonValue } from "./types.js";

/** How deep `got` may nest before a record is judged malformed. */
const MAX_JSON_DEPTH = 64;

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isJsonValue(value: unknown, depth: number): value is JsonValue {
  if (value === null) return true;
  switch (typeof value) {
    case "boolean":
    case "string":
      return true;
    case "number":
      // JSON has no NaN or Infinity; a producer quoting one quotes it as text.
      return Number.isFinite(value);
    case "object": {
      if (depth >= MAX_JSON_DEPTH) return false;
      if (Array.isArray(value)) return value.every((v) => isJsonValue(v, depth + 1));
      // By tag rather than prototype identity, so a plain object made in
      // another realm still passes while a Date, Map or typed array does not.
      if (Object.prototype.toString.call(value) !== "[object Object]") return false;
      return Object.values(value).every((v) => isJsonValue(v, depth + 1));
    }
    default:
      return false;
  }
}

const OPTIONAL_STRINGS = ["path", "nodeId", "pin", "param", "key", "expected", "fix"] as const;
const OPTIONAL_STRING_ARRAYS = ["nodePath", "valid", "didYouMean"] as const;

/**
 * Is `value` a well-formed {@link Diagnostic}: a known code, a severity, a
 * message, and every optional field either absent or of its declared type?
 */
export function isDiagnostic(value: unknown): value is Diagnostic {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (!isDiagnosticCode(r["code"])) return false;
  if (r["severity"] !== "error" && r["severity"] !== "warning") return false;
  if (typeof r["message"] !== "string") return false;
  for (const k of OPTIONAL_STRINGS) {
    if (r[k] !== undefined && typeof r[k] !== "string") return false;
  }
  for (const k of OPTIONAL_STRING_ARRAYS) {
    if (r[k] !== undefined && !isStringArray(r[k])) return false;
  }
  if (r["got"] !== undefined && !isJsonValue(r["got"], 0)) return false;
  return true;
}

/**
 * Is `value` a non-empty list of well-formed diagnostics? A payload whose
 * inspection throws (a hostile getter, a revoked proxy) is simply not one.
 */
export function isDiagnosticList(value: unknown): value is readonly Diagnostic[] {
  try {
    return Array.isArray(value) && value.length > 0 && value.every(isDiagnostic);
  } catch {
    return false;
  }
}

/**
 * A deep, frozen copy of an already-validated JSON value. Copied rather
 * than referenced because a list this module built is trusted without
 * re-validation, so a caller editing its own object afterwards (adding a
 * function, say) must not reach the record — or the worker's clone.
 */
function frozenJsonCopy(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(frozenJsonCopy));
  const out: { [key: string]: JsonValue } = {};
  for (const [k, v] of Object.entries(value)) out[k] = frozenJsonCopy(v);
  return Object.freeze(out);
}

/** Lists this module built: already copied, sanitized and frozen. */
const SANITIZED = new WeakSet<readonly Diagnostic[]>();

/**
 * A frozen copy of a WELL-FORMED list carrying only the fields a
 * `Diagnostic` declares, each record and its string lists frozen, so no
 * holder of an error can edit what another holder reads and no stray key
 * (a function, say) can ride along into a structured clone. `got` is
 * deep-copied too (see {@link frozenJsonCopy}).
 */
function freezeList(list: readonly Diagnostic[]): readonly Diagnostic[] {
  const out = Object.freeze(
    list.map((d) => {
      const copy: { -readonly [K in keyof Diagnostic]: Diagnostic[K] } = {
        code: d.code,
        severity: d.severity,
        message: d.message,
      };
      for (const k of OPTIONAL_STRINGS) {
        const v = d[k];
        if (v !== undefined) copy[k] = v;
      }
      for (const k of OPTIONAL_STRING_ARRAYS) {
        const arr = d[k];
        if (arr !== undefined) copy[k] = Object.freeze([...arr]);
      }
      if (d.got !== undefined) copy.got = frozenJsonCopy(d.got);
      return Object.freeze(copy);
    }),
  );
  SANITIZED.add(out);
  return out;
}

/**
 * `value` as a sanitized list when it is a well-formed one (see
 * {@link freezeList}), else `undefined`. A list this module already built
 * comes back as itself.
 */
export function sanitizeDiagnostics(value: unknown): readonly Diagnostic[] | undefined {
  if (typeof value === "object" && value !== null && SANITIZED.has(value as readonly Diagnostic[])) {
    return value as readonly Diagnostic[];
  }
  if (!isDiagnosticList(value)) return undefined;
  try {
    return freezeList(value);
  } catch {
    // A getter that answered the check and throws on the copy.
    return undefined;
  }
}

/**
 * The `diagnostics` an error class stores, from the optional trailing
 * constructor argument.
 *
 * - absent: one `error`-severity record with `fallback` as its code;
 * - a code: one record with that code;
 * - a list: that list, copied and frozen (see {@link freezeList}).
 *
 * An EMPTY list is treated as absent, because a thrown error with no
 * record is a contradiction every consumer would otherwise have to guard
 * against. So is a list, or a code, that does not validate — reachable only
 * from untyped callers — because an error constructor that threw would
 * replace the fault being reported with a worse one.
 *
 * The message on a defaulted record is the error's own message, verbatim.
 */
export function errorDiagnostics(
  message: string,
  given: DiagnosticCode | readonly Diagnostic[] | undefined,
  fallback: DiagnosticCode,
): readonly Diagnostic[] {
  if (isDiagnosticCode(given)) return freezeList([{ code: given, severity: "error", message }]);
  return sanitizeDiagnostics(given) ?? freezeList([{ code: fallback, severity: "error", message }]);
}

/**
 * The coarse code for an error class this library throws, by name. Names
 * absent here — including `GraphError`, `GraphValidationError` and
 * `GraphSerializationError`, whose faults span many codes — are `error`
 * unless the thrown value carries its own records.
 */
const CODE_BY_ERROR_NAME: Readonly<Record<string, DiagnosticCode>> = Object.freeze({
  FieldJsonError: "invalid-field-spec",
  AttributeNotFoundError: "attribute-not-found",
  GraphCycleError: "cycle",
  CookCancelledError: "cook-cancelled",
  NodeExecutionError: "node-execution-failed",
  CliUsageError: "usage",
});

/** `obj[key]`, or undefined when reading it throws (a hostile getter or proxy). */
function readKey(obj: object, key: string): unknown {
  try {
    return (obj as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function messageOf(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const message = readKey(value, "message");
    if (typeof message === "string") return message;
  }
  try {
    return String(value);
  } catch {
    // An object whose toString throws, or one with no prototype at all.
    return "unknown error";
  }
}

/**
 * The diagnostic records for any thrown value.
 *
 * - A value carrying a well-formed, non-empty `diagnostics` list — every
 *   error this library throws — returns that list: as is when this module
 *   built it, otherwise as a frozen copy holding only the declared fields.
 * - Otherwise a value whose `name` is one of the library's error classes
 *   gets that class's coarse code (`FieldJsonError` → `invalid-field-spec`,
 *   `NodeExecutionError` → `node-execution-failed` with its `nodeId`, …).
 * - Anything else — a foreign `Error`, a string, `null` — is one `error`
 *   record carrying its message, or its string form.
 *
 * Never throws, and always returns at least one record.
 */
export function diagnosticsOf(err: unknown): readonly Diagnostic[] {
  if (typeof err === "object" && err !== null) {
    const carried = sanitizeDiagnostics(readKey(err, "diagnostics"));
    if (carried !== undefined) return carried;
    const message = messageOf(err);
    const name = readKey(err, "name");
    const code = typeof name === "string" && Object.hasOwn(CODE_BY_ERROR_NAME, name)
      ? (CODE_BY_ERROR_NAME[name] as DiagnosticCode)
      : "error";
    const nodeId = readKey(err, "nodeId");
    if (code === "node-execution-failed" && typeof nodeId === "string") {
      return freezeList([{ code, severity: "error", message, nodeId, nodePath: [nodeId] }]);
    }
    return freezeList([{ code, severity: "error", message }]);
  }
  return freezeList([{ code: "error", severity: "error", message: messageOf(err) }]);
}
