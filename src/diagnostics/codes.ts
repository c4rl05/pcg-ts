/**
 * Every diagnostic code the library can produce, with a one-line
 * description each — the single source the docs render from.
 *
 * ADDITIVE-ONLY. A code is a contract with every program that branches on
 * it: once published it is never renamed, never removed and never given a
 * different meaning. A category that turns out too coarse gets a NEW,
 * narrower code beside it, and the old one keeps its producers. A code
 * with no producer left stays listed, described as retired, rather than
 * disappearing.
 *
 * Codes are kebab-case and name the fault, not the phase that found it.
 * `error` is the unclassified fallback: a producer that has not been
 * given a precise code yet, or a thrown value this library did not make.
 */
export const DIAGNOSTIC_CODES = Object.freeze({
  // Unclassified.
  error: "An error with no more specific code: an unclassified library error or a foreign thrown value.",
  truncated: "More records were found than the report carries; the rest were dropped after the cap.",

  // Document shape.
  "invalid-json": "The input is not parseable JSON.",
  "graph-not-object": "The graph document is not a JSON object.",
  "unsupported-format-version": "The document's formatVersion is missing, malformed or not one this build reads.",
  "invalid-seed": "The graph's seed is not a finite number.",
  "invalid-section": "A section or entry has the wrong JSON shape: not an array or object where one is required.",
  "invalid-meta": "The graph's meta block is malformed: not an object, an unknown key, or a title, description or tag of the wrong type.",
  "not-serializable": "A live graph or field holds something the JSON format cannot represent, so it cannot be written.",

  // Live objects: misuse of the API itself, not of a document.
  "read-only-property": "A read-only property of a live object was assigned to; a method is its write route.",

  // Keys.
  "unknown-key": "An object carries a key its schema does not define.",
  "unauthorable-key": "A key whose value the format derives itself was authored by hand.",

  // Nodes.
  "invalid-node-id": "A node id is missing, not a string, empty, or not a valid id.",
  "duplicate-node-id": "Two nodes in the same graph share an id.",
  "unknown-node-type": "A node names a type that is not registered.",
  "unknown-param": "A node sets a param its type does not declare.",
  "invalid-param-value": "A param value does not fit the param's schema: wrong type, out of range, or not an allowed option.",
  "shadowed-graph-param": "An inline param expression carries its own value for a name the graph also declares, so the inline value would never be read.",
  "wrapper-key-on-plain-node": "A key that only a subgraph, forEach or repeatUntil node reads was set on a plain node.",

  // Fields.
  "unknown-field-fn": "A field spec names a fn that is not registered.",
  "unknown-field-key": "A field spec carries a key its fn does not read.",
  "field-arity": "A field fn received the wrong number of arguments.",
  "invalid-field-spec": "A field spec is malformed: a wrong argument shape, a bad literal, or a key of the wrong type.",
  "unbound-field-param": "A field reads a param name nothing bound, so it has no value to evaluate.",
  "field-not-rebuildable": "A field composed from constructors reads a graph param, so setting the param cannot rebuild it.",
  "field-text-syntax": "A field written as text does not parse: an unexpected token, an unclosed bracket or a misplaced argument.",

  // Subgraphs and wrappers.
  "unknown-subgraph": "A subgraph reference names a recipe that is not registered.",
  "invalid-subgraph-ref": "A subgraph reference is malformed: not an object, or a name or hash of the wrong type.",
  "subgraph-hash-mismatch": "A subgraph reference's content hash differs from the registered recipe's.",
  "subgraph-ref-and-payload": "A subgraph node carries both a registry reference and an inline payload.",
  "subgraph-cycle": "A subgraph recipe contains itself, directly or through other recipes.",
  "missing-subgraph-payload": "A subgraph, forEach or repeatUntil node carries neither a reference nor an inline payload.",
  "reserved-plumbing-name": "An exposed pin or param uses a name the wrapper reserves for its own plumbing.",
  "wrapper-kind-mismatch": "A recipe written for one wrapper kind was used under another.",
  "wrapper-ref-unsupported": "A wrapper that takes its body inline only (applyRules) was given a registry reference.",
  "invalid-exposed-pin": "An exposed pin mapping names a node or pin the body does not have, or duplicates a name.",
  "invalid-exposed-param": "An exposed param declaration is malformed or targets a param the body does not have.",

  // Graph params.
  "invalid-graph-param": "A graph param declaration or value is malformed: a bad name, type, bounds or value.",
  "duplicate-graph-param": "Two graph params share a name.",
  "invalid-graph-param-target": "A graph param targets a node or param that does not exist or cannot take its type.",
  "duplicate-param-target": "One param slot is targeted twice, by the same declaration or by two of them.",
  "target-holds-field": "A declaration targets a param slot that holds a field expression, which the declared value would leave dead.",
  "driven-param-conflict": "A node's authored param value disagrees with the graph param that drives it, so the authored value would be discarded.",

  // Connections and outputs.
  "invalid-connection": "A connection entry is malformed.",
  "unknown-node": "A connection, output or target names a node id the graph does not have.",
  "unknown-pin": "A connection or output names a pin the node does not have.",
  "pin-kind-mismatch": "A connection joins pins of incompatible kinds.",
  "input-pin-occupied": "A single-connection input pin already has a connection.",
  cycle: "A connection would close a cycle in the graph.",
  "invalid-output": "An output declaration is malformed.",
  "duplicate-output-name": "Two outputs share a name.",
  "unknown-output": "An output name was asked for — by the API or on the command line — that the graph does not declare.",
  "invalid-asset-output": "An output declared role \"asset\" cannot supply a mesh: a bad role, a non-geometry pin, a subgraph body, or a cook that did not produce exactly one geometry with faces.",

  // Checks on a loaded graph.
  "required-pin-unconnected": "A required input pin on a node that feeds an output has no connection.",
  "node-unreachable": "A node feeds no declared output, so a cook never runs it.",
  "no-outputs": "The graph declares no outputs, so a cook produces nothing.",
  "stranded-graph-param-value": "A body holds a constant that looks derived from a declared graph param's value, so changing the param will not move it.",
  "asset-output-unused": "An asset output names an id no spawnInstances can emit.",

  // Box frames: a box is an extent in its point's own frame.
  "box-corner-counts-position":
    "A box corner is written as position() plus an offset; bounds are already relative to P, so the point's transform counts P twice.",
  "position-from-local-box":
    "P is set from a box corner or centre taken as a place (a positive box-position term and no position() term); box positions are offsets from P, not world positions (pivotBox moves P into its box).",

  // Cook.
  "node-execution-failed": "A node's execute threw during a cook.",
  "attribute-not-found": "A node or field read an attribute the geometry does not carry on that domain.",
  "cook-cancelled": "The cook was aborted through its AbortSignal.",

  // CLI.
  usage: "The command line is malformed: a bad flag, a missing value or a missing argument.",
  "unknown-command": "The CLI was given a command it does not have.",
  "file-unreadable": "A file named on the command line cannot be read.",
  "file-unwritable": "A file named on the command line cannot be written: its directory cannot be created, the path is a directory, or the host has no way to write it.",
  "unknown-tag": "A tag was asked for on the command line that no graph in the shipped corpus carries.",

  // Agent rules (pcg agents).
  "agent-rules-missing": "The file pcg agents --check reads carries no PCG-TS agent-rules block, or does not exist.",
  "agent-rules-stale": "The file's PCG-TS agent-rules block differs from the one the installed version renders.",
  "agent-rules-malformed": "The agent-rules markers are not one BEGIN line followed by one END line, each alone on its line.",
  "agent-import-missing": "CLAUDE.md does not import the file that carries the agent-rules block, so Claude Code never reads it.",
} as const);

/** A diagnostic code: one of the keys of {@link DIAGNOSTIC_CODES}. */
export type DiagnosticCode = keyof typeof DIAGNOSTIC_CODES;

/** Is `value` a code this build defines? */
export function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && Object.hasOwn(DIAGNOSTIC_CODES, value);
}
