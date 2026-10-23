/**
 * Loading a graph from JSON and getting data out of it: the two steps
 * every feedback command shares. `inspect` and `render` can target any
 * node's output pin, not just a declared output, by declaring a temporary
 * one, cooking exactly that induced subgraph, and undeclaring it again —
 * so pointing the CLI at an interior node costs nothing structural and
 * leaves the graph as it was found.
 */
import { suggestNames } from "../diagnostics/didYouMean.js";
import {
  type CookOptions,
  type CookResult,
  type DataCollection,
  type Diagnostic,
  type Geometry,
  type Graph,
  checkSerializedGraph,
  collectGraphAssets,
  cook,
  isAssetOutput,
} from "../index.js";
import { CliError, EXIT_INVALID_GRAPH } from "./errors.js";
import type { CliIo } from "./io.js";
import { diagnosticLine } from "./report.js";

/** A graph read from disk, with the parsed JSON it came from. */
export interface LoadedGraph {
  readonly graph: Graph;
  readonly json: Record<string, unknown>;
  readonly path: string;
  /**
   * The structural errors `diagnoseGraph` found — unconnected required pins
   * on nodes an output reads. NOT yet a refusal: a command decides which of
   * them concern the part of the graph it cooks (see {@link requireCookable}).
   */
  readonly errors: readonly Diagnostic[];
  /** The warnings the checks found: reported, never a refusal. */
  readonly warnings: readonly Diagnostic[];
}

/** A graph file read and parsed, not yet loaded. */
export interface GraphDocument {
  readonly json: unknown;
  readonly path: string;
}

/**
 * Read a graph file and parse it as JSON. An unreadable file is
 * `file-unreadable` (exit 1: the named thing is not there to read); text
 * that is not JSON is `invalid-json` (exit 3: the document is invalid).
 */
export function readGraphDocument(io: CliIo, path: string): GraphDocument {
  let text: string;
  try {
    text = io.readFile(path);
  } catch (err) {
    throw new CliError(
      `cannot read graph file "${path}": ${err instanceof Error ? err.message : String(err)}`,
      { code: "file-unreadable", got: path },
    );
  }
  try {
    // Editors and PowerShell redirection write UTF-8 with a BOM; JSON.parse
    // rejects it with a message about an invisible character, which is a
    // uselessly confusing way to fail on a file that is otherwise fine.
    return { json: JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text), path };
  } catch (err) {
    throw new CliError(
      `"${path}" is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      { code: "invalid-json", exitCode: EXIT_INVALID_GRAPH },
    );
  }
}

/** `3 errors`, `1 warning`. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The refusal for a graph document with errors: one CliError, exit 3,
 * carrying every record, whose message is a header naming the file and one
 * line per record with its pointer into the document.
 */
export function invalidGraphError(
  path: string,
  errors: readonly Diagnostic[],
  warnings: readonly Diagnostic[],
  header?: string,
): CliError {
  const head =
    header ??
    `"${path}" is not a valid graph: ${count(errors.length, "error")}${
      warnings.length > 0 ? `, ${count(warnings.length, "warning")}` : ""
    }`;
  return new CliError([head, ...[...errors, ...warnings].map((d) => `  ${diagnosticLine(d)}`)].join("\n"), {
    exitCode: EXIT_INVALID_GRAPH,
    diagnostics: errors,
    warnings,
  });
}

/**
 * Read and load a graph file through `checkSerializedGraph`. File and JSON
 * problems are named by the CLI (it knows the path); every fault the loader
 * finds is refused at once, as records (exit 3). A graph that loads comes
 * back with the structural errors and warnings the checks found, for the
 * command to weigh against what it will cook.
 */
export function loadGraph(io: CliIo, path: string): LoadedGraph {
  const doc = readGraphDocument(io, path);
  const report = checkSerializedGraph(doc.json);
  if (report.graph === undefined) throw invalidGraphError(path, report.errors, report.warnings);
  return {
    graph: report.graph,
    json: doc.json as Record<string, unknown>,
    path,
    errors: report.errors,
    warnings: report.warnings,
  };
}

/** Top-level node ids upstream of `roots`, the roots included. */
function upstreamOf(graph: Graph, roots: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack: string[] = [];
  for (const id of roots) {
    if (graph._nodes.has(id) && !seen.has(id)) {
      seen.add(id);
      stack.push(id);
    }
  }
  while (stack.length > 0) {
    const id = stack.pop() as string;
    for (const c of graph._inTo.get(id) ?? []) {
      if (!seen.has(c.from)) {
        seen.add(c.from);
        stack.push(c.from);
      }
    }
  }
  return seen;
}

/**
 * Refuse, with exit 3, when a structural error concerns the part of
 * `loaded` a command will cook for `target` — upstream of `--node`, of one
 * `--output`, or of every declared output. An error on a node the cook
 * never runs is not this command's to refuse: `pcg inspect --node a` cooks
 * `a` and its inputs, whatever else the file leaves unwired. A target that
 * names nothing selects nothing here, so the command's own "unknown node"
 * or "unknown output" error still speaks.
 */
export function requireCookable(
  loaded: LoadedGraph,
  target: TargetOptions = {},
  extra: CookTargetExtras = {},
): void {
  if (loaded.errors.length === 0) return;
  const { graph } = loaded;
  const declared = graph.describe().outputs;
  const picked =
    target.node !== undefined
      ? [target.node]
      : target.output !== undefined
        ? declared.filter((o) => o.name === target.output).map((o) => o.id)
        : declared.map((o) => o.id);
  // A cook that also supplies asset meshes runs their nodes too, so a
  // fault upstream of one is this command's to refuse.
  const roots =
    extra.withAssets === true && !assetTargeted(declared, target)
      ? [...picked, ...declared.filter(isAssetOutput).map((o) => o.id)]
      : picked;
  const cooked = upstreamOf(graph, roots);
  const relevant = loaded.errors.filter((d) => {
    const top = d.nodePath?.[0] ?? d.nodeId;
    return top === undefined || cooked.has(top);
  });
  if (relevant.length > 0) throw invalidGraphError(loaded.path, relevant, loaded.warnings);
}

/** Where a command should read data from. */
export interface TargetOptions {
  /** Node id to read an output pin from; omit to use declared outputs. */
  readonly node?: string;
  /** Output pin on `node`; omit to use its first output pin. */
  readonly pin?: string;
  /** Declared output name to read; omit to take every declared output. */
  readonly output?: string;
}

/** What a target resolved to, and the data it produced. */
export interface Target {
  /** Human label, e.g. `node "scatter_0" pin "out"` or `output "points"`. */
  readonly label: string;
  readonly collection: DataCollection;
  /**
   * The name each `collection` item came from, in order: the declared
   * output it was read from, or the node a `--node` read targeted.
   */
  readonly itemOutputs: readonly string[];
  readonly result: CookResult;
  /**
   * With `withAssets`: the asset meshes the graph supplies, by asset id, in
   * declaration order (`collectGraphAssets`). Absent when the cook was not
   * asked for them or the target IS an asset output (drawn as content).
   */
  readonly meshes?: ReadonlyMap<string, Geometry>;
  /** With `withAssets`: the asset outputs left out of `collection` because they supplied `meshes`. */
  readonly assetOutputs?: readonly string[];
}

/** What a cook-target adds beyond the flags. */
export interface CookTargetExtras {
  /**
   * Treat outputs declared `role: "asset"` as meshes rather than content:
   * leave them out of the collection a whole-graph target reads, cook them
   * beside a `--output` or `--node` target, and hand them back as
   * {@link Target.meshes}. A `--output` naming an asset output is still
   * drawn as content — that is how the mesh itself is looked at — as is a
   * graph whose every output is an asset, which has no scene to put one in.
   */
  readonly withAssets?: boolean;
}

/** Does `target` read an asset output itself, so it is content and supplies nothing? */
function assetTargeted(
  declared: readonly { readonly name: string; readonly role?: string }[],
  target: TargetOptions,
): boolean {
  if (target.node !== undefined) return false;
  if (target.output !== undefined) return declared.some((o) => o.name === target.output && isAssetOutput(o));
  return declared.every(isAssetOutput);
}

/** The did-you-mean fields for a record, set only when there is a suggestion. */
function suggestionFields(names: readonly string[]): { didYouMean?: readonly string[] } {
  return names.length > 0 ? { didYouMean: names } : {};
}

/**
 * Output pins of a node instance. Reads the live node state rather than
 * the registry because subgraph nodes derive their pins per instance from
 * the exposed inner pins — the registry entry declares none.
 */
function outputPins(graph: Graph, nodeId: string): readonly string[] {
  const state = graph._nodes.get(nodeId);
  if (state === undefined) {
    const ids = [...graph._nodes.keys()];
    const near = suggestNames(nodeId, ids);
    throw new CliError(
      `unknown node "${nodeId}"; ${near.clause}nodes in this graph: ${ids.length === 0 ? "(none)" : ids.join(", ")}`,
      { code: "unknown-node", nodeId, got: nodeId, valid: ids, ...suggestionFields(near.names) },
    );
  }
  return state.def.outputs.map((pin) => pin.name);
}

/** Resolve `--node`/`--pin` to a concrete pin, naming the alternatives on a miss. */
export function resolvePin(graph: Graph, nodeId: string, pin?: string): string {
  const pins = outputPins(graph, nodeId);
  if (pins.length === 0) {
    throw new CliError(`node "${nodeId}" has no output pins, so there is nothing to read from it`, {
      code: "unknown-pin",
      nodeId,
      valid: [],
    });
  }
  if (pin === undefined) return pins[0];
  if (!pins.includes(pin)) {
    const near = suggestNames(pin, pins);
    throw new CliError(
      `node "${nodeId}" has no output pin "${pin}"; ${near.clause}its output pins: ${pins.join(", ")}`,
      { code: "unknown-pin", nodeId, pin, got: pin, valid: pins, ...suggestionFields(near.names) },
    );
  }
  return pin;
}

/** A temporary output name that cannot collide with a declared one. */
function tempOutputName(graph: Graph): string {
  const declared = new Set(graph.describe().outputs.map((o) => o.name));
  let name = "__pcg_cli";
  for (let n = 1; declared.has(name); n++) name = `__pcg_cli_${n}`;
  return name;
}

/**
 * Cook the requested target and return its collection. With `node`, a
 * temporary output is declared, cooked alone (so only its upstream
 * subgraph runs), and removed again — including when the cook throws or
 * the cook is cancelled.
 *
 * Two caveats, precisely. The declared outputs, their order, every node's
 * dirty flag and the seed come back exactly as they were, and so does
 * every memo cache EXCEPT the target node's when `pin` is an on-demand
 * pin (`PinDef.onDemand`): the temporary output makes the pin read, which
 * is in that node's memo key, so the node cooks once with the pin and its
 * cache holds that cook afterwards (a later cook without the reader
 * recooks it). And `Graph.version` does NOT come back: `Graph.output`
 * and `Graph.removeOutput` each bump the counter and there is no API
 * to put it back, so a graph that goes through here comes out at `version + 2`. Harmless for the
 * CLI, which discards the graph after one command. It is not harmless
 * when the graph is the BODY OF A SUBGRAPH node: the wrapping node folds
 * the inner graph's `version` into its memo key, so calling `cookTarget`
 * on a subgraph body invalidates the wrapping node's cache and forces a
 * recook of everything downstream of it. Cook a throwaway copy, or accept
 * the recook.
 */
export async function cookTarget(
  graph: Graph,
  target: TargetOptions,
  opts: CookOptions = {},
  extra: CookTargetExtras = {},
): Promise<Target> {
  const declaredAll = graph.describe().outputs;
  const supplying = extra.withAssets === true && declaredAll.length > 0 && !assetTargeted(declaredAll, target);
  const assetNames = supplying ? declaredAll.filter(isAssetOutput).map((o) => o.name) : [];
  const assetsOf = (
    result: CookResult,
  ): { meshes?: ReadonlyMap<string, Geometry>; assetOutputs?: readonly string[] } =>
    supplying ? { meshes: collectGraphAssets(declaredAll, result.outputs), assetOutputs: assetNames } : {};

  if (target.node !== undefined) {
    const pin = resolvePin(graph, target.node, target.pin);
    const name = tempOutputName(graph);
    graph.output({ id: target.node }, pin, name);
    try {
      const result = await cook(graph, { ...opts, outputs: [name, ...assetNames] });
      const collection = result.outputs[name] ?? [];
      return {
        label: `node "${target.node}" pin "${pin}"`,
        collection,
        itemOutputs: collection.map(() => target.node as string),
        result,
        ...assetsOf(result),
      };
    } finally {
      graph.removeOutput(name);
    }
  }

  const declared = declaredAll;
  if (declared.length === 0) {
    throw new CliError(
      'this graph declares no outputs; add one to the JSON ("outputs": [{ "id": ..., "pin": ..., "name": ... }]) or target a node directly with --node <id>',
      { code: "no-outputs" },
    );
  }
  if (target.output !== undefined) {
    if (!declared.some((o) => o.name === target.output)) {
      const names = declared.map((o) => o.name);
      const near = suggestNames(target.output, names);
      throw new CliError(
        `unknown output "${target.output}"; ${near.clause}declared outputs: ${names.join(", ")}`,
        { code: "unknown-output", got: target.output, valid: names, ...suggestionFields(near.names) },
      );
    }
    const outputs = [target.output, ...assetNames.filter((n) => n !== target.output)];
    const result = await cook(graph, { ...opts, outputs });
    const collection = result.outputs[target.output] ?? [];
    return {
      label: `output "${target.output}"`,
      collection,
      itemOutputs: collection.map(() => target.output as string),
      result,
      ...assetsOf(result),
    };
  }
  const result = await cook(graph, opts);
  // Supplying meshes, the asset outputs are not content: drawn where they
  // were modelled they would be one stray mesh at the origin.
  const scene = supplying ? declared.filter((o) => !isAssetOutput(o)) : declared;
  const collection = scene.flatMap((o) => result.outputs[o.name] ?? []);
  return {
    label: scene.length === 1 ? `output "${scene[0].name}"` : "all declared outputs",
    collection,
    itemOutputs: scene.flatMap((o) => (result.outputs[o.name] ?? []).map(() => o.name)),
    result,
    ...assetsOf(result),
  };
}
