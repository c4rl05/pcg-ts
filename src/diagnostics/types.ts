/**
 * The diagnostic record: one fault, stated so a program can act on it
 * without parsing the sentence.
 *
 * This module is a LEAF and imports nothing from the rest of the library,
 * which is why `JsonValue` is declared here rather than borrowed: every
 * layer that throws — fields, graph, nodes, worker, cli — imports this
 * one, so any import from here would close a cycle through one of them.
 */
import type { DiagnosticCode } from "./codes.js";

/** A value as JSON can carry it: what a diagnostic quotes back as `got`. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * One fault, in machine-readable form.
 *
 * `message` is the human sentence and is the same text the thrown error
 * carries; every other field restates part of it as data. Only `code`,
 * `severity` and `message` are always present — a field is set only where
 * it applies, never filled with a placeholder.
 */
export interface Diagnostic {
  /** Stable identifier from `DIAGNOSTIC_CODES`; never renamed or removed. */
  readonly code: DiagnosticCode;
  /** An `error` refuses the input; a `warning` reports it and lets it through. */
  readonly severity: "error" | "warning";
  /** The human-readable statement, naming the node, pin or param and the fix. */
  readonly message: string;
  /** RFC 6901 JSON pointer to the offending value in the source document. */
  readonly path?: string;
  /** Id of the node at fault. */
  readonly nodeId?: string;
  /**
   * Node ids from the outermost graph inward, for a fault inside a
   * subgraph or wrapper body. On a cook failure the first entry is the
   * top-level node (the error's own `nodeId`) and the last is the node
   * whose execute actually threw; a failure with no nesting has a path of
   * one.
   */
  readonly nodePath?: readonly string[];
  /** Pin name at fault. */
  readonly pin?: string;
  /** Param name at fault. */
  readonly param?: string;
  /** Object key at fault (an unknown or unauthorable key, a field spec key). */
  readonly key?: string;
  /** The offending value as it was given. */
  readonly got?: JsonValue;
  /** The complete set of accepted alternatives, when the set is closed. */
  readonly valid?: readonly string[];
  /** What was expected, when the alternatives are not a closed set ("a finite number"). */
  readonly expected?: string;
  /** The nearest accepted alternatives, nearest first. A suggestion only. */
  readonly didYouMean?: readonly string[];
  /** A mechanical fix, set only when one exists and applying it is safe. */
  readonly fix?: string;
}
