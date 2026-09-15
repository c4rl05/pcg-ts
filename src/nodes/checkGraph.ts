/**
 * `checkSerializedGraph`: the whole "is this document a graph that will
 * cook" question, answered as records and never as a throw.
 *
 * Two passes, in order. The collect-all load (`deserializeGraph`) reports
 * every fault the document's shape, names and values carry; only when it
 * is clean does `diagnoseGraph` run over the loaded graph, because its
 * checks — required pins, reachability, outputs, stranded values — are
 * questions about a graph, and a document that did not load is not one.
 */
import { type Diagnostic, diagnosticsOf } from "../diagnostics/index.js";
import type { Graph } from "../graph/index.js";
import { diagnoseGraph } from "./diagnose.js";
import { deserializeGraph } from "./serialize.js";

/** What {@link checkSerializedGraph} found. */
export interface CheckedGraph {
  /**
   * The loaded graph, present exactly when the load succeeded — including
   * when `diagnoseGraph` then found errors, so a caller that cooks only
   * part of the graph can decide which of them concern it.
   */
  readonly graph?: Graph;
  /** Every `error`-severity record, load faults first; empty when the document is sound. */
  readonly errors: readonly Diagnostic[];
  /** Every `warning`-severity record. */
  readonly warnings: readonly Diagnostic[];
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One RFC 6901 reference token. */
function token(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * The pointer into `json` for a `diagnoseGraph` record, derived from its
 * `nodePath`: `/nodes/<i>` per level, through `/subgraph/graph` for an
 * inline body. A path that leaves the document — the body of a `ref`
 * lives in the registry, not in the file — stops at the deepest node the
 * document does hold, which is where an author would act on it. A record
 * with a `param` the node sets gets the param's own pointer.
 */
function pointerFor(record: Diagnostic, json: unknown): string | undefined {
  if (!isObject(json)) return undefined;
  const nodePath = record.nodePath;
  if (nodePath === undefined || nodePath.length === 0) {
    if (record.code !== "no-outputs") return undefined;
    return Array.isArray(json["outputs"]) ? "/outputs" : "";
  }
  let graph: JsonObject = json;
  let pointer = "";
  let node: JsonObject | undefined;
  let resolved = 0;
  for (const id of nodePath) {
    const nodes = graph["nodes"];
    if (!Array.isArray(nodes)) break;
    const index = nodes.findIndex((n) => isObject(n) && n["id"] === id);
    if (index < 0) break;
    node = nodes[index] as JsonObject;
    pointer += `${resolved === 0 ? "" : "/subgraph/graph"}/nodes/${index}`;
    resolved++;
    const payload = node["subgraph"];
    if (resolved < nodePath.length) {
      if (!isObject(payload) || !isObject(payload["graph"])) break;
      graph = payload["graph"];
    }
  }
  if (resolved === 0 || node === undefined) return undefined;
  const complete = resolved === nodePath.length;
  // A nested "no outputs" names the wrapper: the body it means is its payload's graph.
  if (complete && record.code === "no-outputs") {
    const payload = node["subgraph"];
    return isObject(payload) && isObject(payload["graph"]) ? `${pointer}/subgraph/graph` : pointer;
  }
  const params = node["params"];
  if (complete && record.param !== undefined && isObject(params) && Object.hasOwn(params, record.param)) {
    return `${pointer}/params/${token(record.param)}`;
  }
  return pointer;
}

/** `record` with `path` set, keeping the record's field order readable. */
function withPointer(record: Diagnostic, json: unknown): Diagnostic {
  if (record.path !== undefined) return record;
  const path = pointerFor(record, json);
  if (path === undefined) return record;
  const { code, severity, message, ...rest } = record;
  return { code, severity, message, path, ...rest };
}

/**
 * Load a serialized graph and check it, reporting every fault as records.
 *
 * - The load collects every document fault (see `deserializeGraph`): on
 *   any, `graph` is absent and `errors` holds them, in phase order then
 *   document order.
 * - On a clean load, `diagnoseGraph` runs, and its records are split by
 *   severity: an unconnected required pin on a node an output reads is an
 *   error; an unreachable node, a graph with no outputs and a stranded
 *   graph-param value are warnings. Each gets a `path` into `json` where
 *   the document holds the node it names.
 *
 * Never throws for a fault in the document — whatever the loader throws is
 * turned into records through `diagnosticsOf`. Deterministic: the same
 * document gives the same lists every call.
 */
export function checkSerializedGraph(json: unknown): CheckedGraph {
  let graph: Graph;
  try {
    graph = deserializeGraph(json);
  } catch (err) {
    const records = diagnosticsOf(err);
    return {
      errors: records.filter((r) => r.severity !== "warning"),
      warnings: records.filter((r) => r.severity === "warning"),
    };
  }
  const found = diagnoseGraph(graph).map((r) => withPointer(r, json));
  return {
    graph,
    errors: found.filter((r) => r.severity !== "warning"),
    warnings: found.filter((r) => r.severity === "warning"),
  };
}
