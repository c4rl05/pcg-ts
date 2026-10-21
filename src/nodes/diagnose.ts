/**
 * Structural checks on a live graph, reported as diagnostic records rather
 * than thrown: the faults a graph can hold while still being a graph.
 *
 * WHY IT IS NOT PART OF LOADING. `deserializeGraph` refuses what cannot be
 * built at all — an unknown type, a bad param, a pin that does not exist.
 * What this reports can be built, saved and reloaded, and the editor does
 * exactly that with half-finished graphs: a node dropped on the canvas and
 * not yet wired has an unconnected required pin for as long as it takes to
 * drag the wire. Refusing it at load would make the editor unable to open
 * its own autosave, so the check runs beside the loader, on request.
 *
 * WHAT IT REPORTS.
 * - `required-pin-unconnected` (error): an input pin the node needs
 *   ({@link PinDef.optional} absent) has no connection, on a node a cook
 *   would run — or is connected only to sources that deliver an empty
 *   collection: a `forEach` whose iterated pin receives nothing (zero
 *   iterations), or a wrapper that passes such emptiness through. A cook of
 *   that graph throws on it. A `forEach` running zero iterations is excused
 *   its own pins and its body, which never run. The rule is
 *   `analyzeStarvation` in `src/graph/subgraph.ts`, the same one a wrapper
 *   decides its exposed pins' `optional` from.
 *
 *   A wrapper's open pins are judged TOGETHER against its body, not one
 *   flag at a time: an open iterated pin excuses an open broadcast pin, and
 *   two open pins that each are optional alone (two feeds into one loop's
 *   iterated pin) are both reported when together they starve the body.
 *
 *   STRUCTURAL, NOT DATA. Emptiness is followed only where the graph's
 *   shape decides it. Where the data does — a tag filter that drops every
 *   item, an `eachPoint` loop over a cloud with zero points, what a
 *   `repeatUntil` delivers after its first round — the check assumes data
 *   flows: an open broadcast pin on a loop that happens to run zero times
 *   is still reported, because it throws the moment the loop runs, and a
 *   fault that appears only on a later round is not seen.
 * - `node-unreachable` (warning): a node feeds no declared output, so no
 *   cook ever runs it. Its unconnected pins are NOT additionally reported:
 *   the node is the fault, and a required pin on a node nothing runs cannot
 *   throw.
 * - `no-outputs` (warning): the graph declares no outputs at all. Reported
 *   once, instead of one `node-unreachable` per node.
 * - `stranded-graph-param-value` (warning): {@link strandedGraphParamValues},
 *   folded in so one call answers "is this graph sound".
 * - `asset-output-unused` (warning): a top-level output declared
 *   `role: "asset"` names an id no `spawnInstances` can emit, so the mesh
 *   it supplies is never drawn. Reported only when EVERY spawner's id set
 *   is closed (see `describeGraphAssets`): an open set may well emit the
 *   id, and a warning that could be wrong is not one an agent can act on.
 *
 * BODIES. An INLINE wrapper body is checked too, with `nodePath` running
 * from the outermost wrapper to the node at fault; inside a body the portal
 * that feeds an exposed input is a real connection, so an exposed pin
 * counts as connected there (whether the wrapper's own pin is connected is
 * the OUTER graph's question). A body materialized from a `ref` is not
 * walked: it is a registered recipe, held clean by the gate that loads
 * every primitive, and walking it would repeat one recipe's findings once
 * per use. Only a body a cook would enter is walked — an unreachable
 * wrapper's body is not.
 *
 * ORDER is deterministic and fixed: at each level, that level's nodes in
 * insertion order and each node's input pins in declaration order; then
 * each reachable inline wrapper's body in insertion order, recursively
 * (a graph's own records always precede those of the bodies inside it);
 * then the stranded-value warnings, in the order that lint reports them;
 * then the unused-asset warnings, in output declaration order.
 */
import type { Diagnostic } from "../diagnostics/index.js";
// By path: the phrasing helper is internal plumbing the diagnostics barrel does not carry.
import { suggestNames } from "../diagnostics/didYouMean.js";
import type { Graph } from "../graph/graph.js";
import type { PinDef, PinKind } from "../graph/node.js";
import {
  type StarvedPin,
  getSubgraphPlumbing,
  getSubgraphSpec,
  analyzeStarvation,
  starvedPinKeys,
} from "../graph/subgraph.js";
import { describeGraphAssets, describeSuppliedAssets } from "./graphAssets.js";
import { type StrandedGraphParamValue, strandedGraphParamValues } from "./graphParams.js";
import { subgraphRefOf } from "./subgraphRefs.js";

/** What to connect to a pin of this kind, as the fix states it. */
function outputPhrase(pin: PinDef): string {
  const kinds: Record<PinKind, string> = {
    geometry: "geometry output",
    value: "value output",
    instances: "instances output",
    any: "output (of any kind)",
  };
  const what = kinds[pin.kind];
  return pin.multi === true ? `one or more nodes' ${what}s` : `a node's ${what}`;
}

/** `"a" > "b"`: the wrapper chain a body-level record sits in. */
function chain(path: readonly string[]): string {
  return path.map((id) => JSON.stringify(id)).join(" > ");
}

/** `node "x" (type)`, plus where it sits when inside a body. */
function nodeLabel(id: string, type: string, prefix: readonly string[]): string {
  const where = prefix.length === 0 ? "" : ` in the body of ${chain(prefix)}`;
  return `node ${JSON.stringify(id)} (${type})${where}`;
}

function typeOf(def: { readonly type?: unknown }): string {
  return typeof def.type === "string" && def.type !== "" ? def.type : "unregistered def";
}

/**
 * One level: `graph`'s own records into `out`, then each reachable inline
 * body's. `onPath` holds the graphs on the current path, so a pathological
 * self-nesting (which the wrappers refuse) could not recurse forever.
 */
function diagnoseLevel(
  graph: Graph,
  prefix: readonly string[],
  empty: ReadonlySet<string>,
  out: Diagnostic[],
  onPath: Set<Graph>,
): void {
  if (onPath.has(graph)) return;
  onPath.add(graph);
  const nested = prefix.length > 0;

  if (graph._outputs.length === 0) {
    out.push({
      code: "no-outputs",
      severity: "warning",
      message: nested
        ? `the body of ${chain(prefix)} declares no outputs, so cooking it produces nothing; expose an output from the body`
        : 'the graph declares no outputs, so a cook produces nothing; declare one with graph.output(node, pin, name), or an "outputs" entry { "id", "pin", "name" } in the JSON',
      ...(nested ? { nodeId: prefix[prefix.length - 1] as string, nodePath: [...prefix] } : {}),
    });
    onPath.delete(graph);
    return;
  }

  // Reverse walk from every declared output (the wrapper's `__out_*`
  // plumbing included — those ARE a body's outputs).
  const reachable = new Set<string>();
  const stack: string[] = [];
  for (const o of graph._outputs) {
    if (!reachable.has(o.node)) {
      reachable.add(o.node);
      stack.push(o.node);
    }
  }
  while (stack.length > 0) {
    const id = stack.pop() as string;
    for (const c of graph._inTo.get(id) ?? []) {
      if (!reachable.has(c.from)) {
        reachable.add(c.from);
        stack.push(c.from);
      }
    }
  }

  const portals = getSubgraphPlumbing(graph)?.portalIds;
  // The same rule the wrappers publish their pin flags from. `empty` holds
  // the portals the wrapper's own open pins leave empty; it decides which
  // loops run zero iterations, and so what is excused, but a pin starved
  // ONLY because of it is not reported here — that is the wrapper's
  // required pin, already the outer graph's finding.
  const analysis = analyzeStarvation(graph, empty);
  const intrinsic =
    empty.size === 0 ? undefined : starvedPinKeys(analyzeStarvation(graph, new Set()));
  const starvedByNode = new Map<string, StarvedPin[]>();
  for (const s of analysis.starved) {
    if (intrinsic !== undefined && !intrinsic.has(`${s.nodeId}\0${s.pin.name}`)) continue;
    const list = starvedByNode.get(s.nodeId);
    if (list === undefined) starvedByNode.set(s.nodeId, [s]);
    else list.push(s);
  }
  const bodies: { readonly id: string; readonly body: Graph; readonly empty: Set<string> }[] = [];
  for (const state of graph._nodes.values()) {
    // A portal is plumbing: it has no inputs, and a portal feeding an inner
    // node nothing reads is that inner node's finding, not its own.
    if (portals?.has(state.id) === true) continue;
    const type = typeOf(state.def);
    const nodePath = [...prefix, state.id];
    if (!reachable.has(state.id)) {
      out.push({
        code: "node-unreachable",
        severity: "warning",
        message:
          `${nodeLabel(state.id, type, prefix)} feeds no ${nested ? "exposed output of its body" : "declared output"}, ` +
          "so a cook never runs it; connect it upstream of " +
          (nested ? "an exposed output" : "a declared output, declare an output on it") +
          ", or remove it",
        nodeId: state.id,
        nodePath,
      });
      continue;
    }
    for (const { pin, via, jointly } of starvedByNode.get(state.id) ?? []) {
      const fix = `connect ${outputPhrase(pin)} to input pin ${JSON.stringify(pin.name)} of node ${JSON.stringify(state.id)}`;
      // A pin optional alone is here only because other open pins of the
      // same wrapper fault with it; "required" would contradict the
      // catalog. The clause claims membership in the smallest fix and no
      // more: which open pins fault WITH which is not one answer when
      // several faults share a fix.
      const status = pin.optional === true ? "" : "required ";
      const pinText = `its ${status}${pin.kind} input pin ${JSON.stringify(pin.name)}`;
      const together =
        pin.optional === true
          ? " — the pin is optional alone, but with the other open pins it is part of the smallest set of " +
            "connections that clears this node's faults" +
            (jointly.length > 0 ? ` (with ${jointly.map((n) => JSON.stringify(n)).join(", ")})` : "")
          : "";
      // Wired, and still empty at cook time. Said as such, because "nothing
      // is connected" would contradict what the author can see.
      const why =
        (via.length === 0
          ? `has nothing connected to ${pinText}`
          : `receives nothing on ${pinText}: it is fed only by ` +
            `${via.map((id) => JSON.stringify(id)).join(", ")}, which deliver${via.length === 1 ? "s" : ""} an empty ` +
            "collection — a forEach whose iterated pin receives nothing runs zero iterations, and a wrapper passes that on") +
        together;
      out.push({
        code: "required-pin-unconnected",
        severity: "error",
        message: `${nodeLabel(state.id, type, prefix)} ${why}, so cooking it throws; ${fix}`,
        nodeId: state.id,
        nodePath,
        pin: pin.name,
        expected: `a connection from ${outputPhrase(pin)}`,
        fix,
      });
    }
    const spec = getSubgraphSpec(state.def);
    // A loop that runs zero iterations never enters its body.
    if (
      spec !== undefined &&
      subgraphRefOf(state.def) === undefined &&
      !analysis.zeroIteration.has(state.id)
    ) {
      bodies.push({ id: state.id, body: spec.graph, empty: analysis.emptyPortals(state.id) });
    }
  }

  for (const { id, body, empty: bodyEmpty } of bodies) {
    diagnoseLevel(body, [...prefix, id], bodyEmpty, out, onPath);
  }
  onPath.delete(graph);
}

/** `innerNode.param` split at its LAST dot: a param name never holds one. */
function splitInnerSlot(innerSlot: string): { readonly node: string; readonly param: string } {
  const dot = innerSlot.lastIndexOf(".");
  return dot < 0
    ? { node: innerSlot, param: "" }
    : { node: innerSlot.slice(0, dot), param: innerSlot.slice(dot + 1) };
}

function strandedDiagnostic(v: StrandedGraphParamValue): Diagnostic {
  const wrappers = v.slot.split(" > ");
  const inner = splitInnerSlot(v.innerSlot);
  const value = typeof v.value === "number" ? v.value : [...v.value];
  const fix =
    `pass the value in through the wrapper's own param (declare it with no targets and have the ` +
    `body's expression read "${v.name}"), or confirm the match is a coincidence`;
  return {
    code: "stranded-graph-param-value",
    severity: "warning",
    message:
      `graph param "${v.name}" = ${JSON.stringify(value)} is repeated as a constant in the body of ` +
      `${chain(wrappers)} at ${JSON.stringify(v.innerSlot)}; a body is bound by its wrapper and nothing ` +
      `else, so it cooks correctly today and desyncs the moment the param moves — ${fix}`,
    nodeId: inner.node,
    nodePath: [...wrappers, inner.node],
    ...(inner.param !== "" ? { param: inner.param } : {}),
    got: value,
  };
}

/**
 * Asset outputs whose id no spawner can emit. Silent while any spawner's
 * set is open: that spawner may emit the id, and saying otherwise would be
 * a guess presented as a finding.
 */
function unusedAssetDiagnostics(graph: Graph): Diagnostic[] {
  const supplied = describeSuppliedAssets(graph);
  if (supplied.length === 0) return [];
  const spawners = describeGraphAssets(graph);
  if (spawners.some((s) => s.open.length > 0)) return [];
  const emitted: string[] = [];
  for (const s of spawners) {
    for (const origin of s.ids) if (!emitted.includes(origin.id)) emitted.push(origin.id);
  }
  const out: Diagnostic[] = [];
  for (const asset of supplied) {
    if (emitted.includes(asset.id)) continue;
    const head = `asset output ${JSON.stringify(asset.id)} (node ${JSON.stringify(asset.node)} pin ${JSON.stringify(asset.pin)}) supplies the mesh for asset id ${JSON.stringify(asset.id)}`;
    if (spawners.length === 0) {
      out.push({
        code: "asset-output-unused",
        severity: "warning",
        message: `${head}, but the graph has no spawnInstances node, so nothing ever draws it; add a spawnInstances with assetId ${JSON.stringify(asset.id)}, or drop role "asset" to draw the output as scene content`,
        nodeId: asset.node,
        pin: asset.pin,
        got: asset.id,
      });
      continue;
    }
    const near = suggestNames(asset.id, emitted);
    out.push({
      code: "asset-output-unused",
      severity: "warning",
      message: `${head}, but no spawnInstances in this graph can emit that id (they emit ${emitted.map((id) => JSON.stringify(id)).join(", ")}); ${near.clause}rename the output to an id a spawner emits, or drop role "asset" to draw it as scene content`,
      nodeId: asset.node,
      pin: asset.pin,
      got: asset.id,
      valid: [...emitted],
      ...(near.names.length > 0 ? { didYouMean: near.names } : {}),
    });
  }
  return out;
}

/**
 * The structural faults of a live graph, as records: unconnected required
 * pins (errors), nodes no output reads, a graph with no outputs, and
 * stranded graph-param values and asset outputs no spawner can emit
 * (warnings). Empty for a sound graph.
 *
 * Read-only and deterministic — the same graph gives the same list, in the
 * same order, every call. It never throws on a graph that exists, including
 * a half-built one; it is not run by `deserializeGraph`, so call it when the
 * question is "will this cook", not "did this load".
 */
export function diagnoseGraph(graph: Graph): Diagnostic[] {
  const out: Diagnostic[] = [];
  diagnoseLevel(graph, [], new Set(), out, new Set());
  for (const v of strandedGraphParamValues(graph)) out.push(strandedDiagnostic(v));
  out.push(...unusedAssetDiagnostics(graph));
  return out;
}
