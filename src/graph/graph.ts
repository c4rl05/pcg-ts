import { type Field, isField } from "../fields/index.js";
// The grammar's parser, by MODULE rather than through `../nodes/index.js`,
// for the reason `subgraph.ts` states: it imports only `../fields` and
// `../noise`, so no cycle and no registry crossing the layer boundary. The
// graph layer needs it because rebinding a graph param means REBUILDING the
// expressions that read it, and building is the only door a value has into
// `Field.key`.
import { fieldFromJson } from "../fields/fieldJson.js";
import { hashCombine, hashString } from "../random/index.js";
import type { DataCollection } from "./data.js";
// By path: the phrasing helper is internal plumbing the diagnostics barrel does not carry.
import { suggestNames } from "../diagnostics/didYouMean.js";
import type { JsonValue } from "../diagnostics/index.js";
import { GraphCycleError, GraphValidationError } from "./errors.js";
import type { NodeDef, PinDef } from "./node.js";
import { paramScan, refLabel } from "./paramScan.js";
import { defParamSchemas } from "./paramSchemaLink.js";
import {
  canonicalEnumValue,
  type GraphParam,
  graphParamBindings,
  graphParamError,
  liveParamValueError,
  type ParamSchema,
  type ParamValue,
} from "./params.js";
import { subgraphSpecs, wrappedGraphOf } from "./subgraphLink.js";

/**
 * Reference to a node instance in a graph. Carries the param type of its
 * definition so `setParam` stays typed, and its input (`I`) and output
 * (`O`) pin names so `connect`, `disconnect` and `output` refuse a
 * misspelled pin at compile time.
 *
 * A handle from `Graph.add` on a standard node knows its pins, and so does
 * one from a def whose type TypeScript inferred from an object literal with
 * literal pin names. Every other handle — a def typed `NodeDef<P>` (which
 * `defineNode<P>` and `standardNode<P>` return), a subgraph def, a
 * registry lookup's def, a deserialized graph's node, one rebuilt from an
 * id — has `string` pins and accepts any name, checked when the call runs,
 * exactly as before the pins were typed.
 *
 * THE ESCAPE HATCH, for a pin name that is only known at runtime (read from
 * data, looped over, chosen by a UI): declare the handle as a plain
 * `NodeHandle` — `const h: NodeHandle = graph.add(scatter)` — or widen the
 * pin names at the call with `graph.connect<string, string>(a, pin, b, pin2)`.
 * Both are checked widenings, not casts; the runtime check still names the
 * node, the pin and the valid alternatives.
 */
export interface NodeHandle<P = unknown, I extends string = string, O extends string = string> {
  readonly id: string;
  /** @internal Phantom marker preserving the param type; never set. */
  readonly _params?: P;
  /** @internal Phantom marker preserving the input pin names; never set. */
  readonly _inputs?: I;
  /** @internal Phantom marker preserving the output pin names; never set. */
  readonly _outputs?: O;
}

/**
 * A pin-name position that TypeScript may check against but never infer
 * from: `connect`, `disconnect` and `output` infer a handle's pin names from
 * the HANDLE argument only, and this makes the pin argument a non-inference
 * site.
 *
 * Why the pin must not be an inference site: a literal `"outt"` would itself
 * become a candidate and widen the union until it accepted the typo. Why not
 * `NoInfer`, which says the same thing: it needs TypeScript 5.4 in the
 * CONSUMER's compiler. This is the older spelling of it — a conditional type
 * TypeScript defers while inferring, then resolves to `T` — which any
 * TypeScript that reads the rest of these typings understands.
 *
 * Why the pin names are inferred from the handle through a type parameter,
 * and not read off it by a conditional over the handle's own type: inside a
 * generic helper `<H extends NodeHandle>(h: H)`, a conditional over `H`
 * stays unresolved and refuses every string, where a type parameter
 * inferred from `h` falls to `H`'s constraint — `string` — and accepts it,
 * as that helper did before pins were typed.
 *
 * Not exported: a caller never names it, and a published name would be one
 * more to keep.
 */
type PinName<T extends string> = [T][T extends unknown ? 0 : never];

/** @internal One connection between two node pins. */
export interface Connection {
  readonly from: string;
  readonly fromPin: string;
  readonly to: string;
  readonly toPin: string;
}

/** @internal A declared terminal output of a graph. */
export interface OutputDecl {
  readonly name: string;
  readonly node: string;
  readonly pin: string;
  /** Present only when the output was declared with `role: "asset"`. */
  readonly role?: "asset";
}

/**
 * Options of {@link Graph.output}. `role: "asset"` declares the output's
 * geometry to be the mesh for the asset id equal to the output's name: a
 * host draws it as that id's instances rather than as scene content (see
 * `collectGraphAssets`). Omit `role` for ordinary scene content.
 */
export interface OutputOptions {
  readonly role?: "asset";
}

/** @internal Memoized result of one node cook. */
export interface NodeCache {
  readonly key: string;
  readonly outputs: Record<string, DataCollection>;
  /**
   * Never serve this entry: it exists only to deliver this cook's
   * outputs to downstream nodes and to the cook result, and the next
   * cook must recompute the node. Set for outputs that hold
   * device-resident handles, which the graph delivers but never owns —
   * memoizing one would pin GPU memory for the lifetime of the graph
   * and hand the same handle to a second owner. See `CookOptions.gpu`.
   */
  readonly volatile?: boolean;
}

/** @internal Per-node state stored by the graph. */
export interface NodeState {
  readonly id: string;
  readonly def: NodeDef<Record<string, unknown>>;
  params: Record<string, unknown>;
  /** Advisory flag; correctness comes from the executor's memo key. */
  dirty: boolean;
  cache: NodeCache | undefined;
}

function findPin(pins: readonly PinDef[], name: string): PinDef | undefined {
  return pins.find((p) => p.name === name);
}

/**
 * The declared schema of one param of `def`, from whichever side authored
 * it: the registry for a standard node (see paramSchemaLink.ts), the
 * recorded exposed params for a subgraph node. `undefined` when the def
 * declares no schema for that name — a hand-rolled `defineNode`, or a
 * param name the def does not have.
 */
function schemaOf(def: NodeDef<Record<string, unknown>>, key: string): ParamSchema | undefined {
  const declared = defParamSchemas.get(def);
  if (declared !== undefined) return declared[key];
  return subgraphSpecs.get(def)?.params.find((p) => p.name === key)?.schema;
}

/**
 * The value a node should HOLD for `key`, given what the caller passed.
 * Identical in value to what came in; for an enum param it is the
 * schema's own string rather than whatever the caller's string was made
 * of. Runs beside {@link checkParamValue}, at `add` and `setParam`, so a
 * host handing in a computed or parsed name — the editor's mirror does
 * exactly that — stores what a source literal would have stored. See
 * {@link canonicalEnumValue} for why the identity matters at all.
 */
function canonicalParamValue(
  def: NodeDef<Record<string, unknown>>,
  key: string,
  value: unknown,
): unknown {
  const schema = schemaOf(def, key);
  return schema === undefined ? value : canonicalEnumValue(schema, value);
}

/**
 * Refuse a param value the schema that declares it does not allow. Runs
 * at the mutation that introduces the value — `add` and `setParam` — so
 * a bad value is reported where it was written rather than at the next
 * serialization, which may be in another process or may never happen.
 *
 * Names the node, the type, the param, the value and what would be
 * legal, in the voice `connect` uses for a bad pin. A def that declares
 * no schema is not checked; see {@link schemaOf}.
 */
function checkParamValue(
  id: string,
  def: NodeDef<Record<string, unknown>>,
  key: string,
  value: unknown,
  where: string,
): void {
  const schema = schemaOf(def, key);
  if (schema === undefined) return;
  const bad = isField(value)
    ? schema.acceptsField === true
      ? undefined
      : "holds a Field but the param is not field-capable; pass a plain value, or move the expression to a param whose schema declares acceptsField"
    : liveParamValueError(schema, value);
  if (bad !== undefined) {
    throw new GraphValidationError(`${where}: node "${id}" (type "${def.type}") param "${key}": ${bad}`);
  }
}

function listPins(pins: readonly PinDef[]): string {
  return pins.map((p) => `"${p.name}"`).join(", ") || "(none)";
}

/**
 * The refusal for a pin `node` does not have: the sentence, with the
 * nearest pin names before any list, and the record behind it.
 * `listed` says whether the message goes on to list every pin — `connect`
 * never has, `disconnect` always has — so each keeps its own shape and
 * only gains the suggestion.
 */
function unknownPinError(
  nodeId: string,
  side: "input" | "output",
  pin: string,
  pins: readonly PinDef[],
  listed: boolean,
): GraphValidationError {
  const valid = pins.map((p) => p.name);
  const near = suggestNames(pin, valid);
  const head = `node "${nodeId}" has no ${side} pin "${pin}"`;
  const message = listed
    ? `${head}; ${near.clause}${side} pins: ${listPins(pins)}`
    : near.clause === ""
      ? head
      : `${head}; ${near.clause.trimEnd()}`;
  return new GraphValidationError(message, undefined, [
    {
      code: "unknown-pin",
      severity: "error",
      message,
      nodeId,
      pin,
      valid,
      ...(near.names.length > 0 ? { didYouMean: near.names } : {}),
      ...(near.only !== undefined ? { fix: `replace "${pin}" with "${near.only}"` } : {}),
    },
  ]);
}

/**
 * Ids of the subgraph nodes leading from `from` back to `target` through
 * the "contains a node that wraps" relation, or `undefined` when `target`
 * is unreachable. `[]` means `from` IS `target` — a direct self-wrap.
 *
 * `seen` is a visited set rather than a path set, and it is load-bearing,
 * not defensive. The invariant this walk enforces means the forest is
 * already acyclic, so a path set would also terminate — but a legitimate
 * acyclic forest can hold exponentially many PATHS over linearly many
 * GRAPHS (each level wrapping two instances of the level below is the
 * shape), and only a visited set walks graphs rather than paths. Pinned by
 * the diamond-chain test in `subgraph.test.ts`; it terminates on a forest
 * corrupted some other way too, which is the lesser of its two jobs.
 */
function wrapPathTo(from: Graph, target: Graph, seen: Set<Graph>): string[] | undefined {
  if (from === target) return [];
  if (seen.has(from)) return undefined;
  seen.add(from);
  for (const state of from._nodes.values()) {
    const next = wrappedGraphOf(state.def);
    if (next === undefined) continue;
    const rest = wrapPathTo(next, target, seen);
    if (rest !== undefined) return [state.id, ...rest];
  }
  return undefined;
}

/**
 * Refuse an `add` that would let `graph` reach itself through subgraph
 * nesting. Costs one WeakMap lookup for a non-subgraph def, and a walk of
 * the wrapped forest for a subgraph one — build-time work, never per cook.
 */
function checkNoWrapCycle(graph: Graph, def: object, id: string | undefined): void {
  const wrapped = wrappedGraphOf(def);
  if (wrapped === undefined) return;
  const path = wrapPathTo(wrapped, graph, new Set());
  if (path === undefined) return;
  const what = id === undefined ? "a subgraph node" : `subgraph node "${id}"`;
  const route =
    path.length === 0
      ? "its definition wraps this very graph"
      : `its definition wraps a graph that reaches back to this one through subgraph ${path.length === 1 ? "node" : "nodes"} ${path.map((p) => `"${p}"`).join(" -> ")}`;
  throw new GraphValidationError(
    `cannot add ${what}: ${route}; a graph may not contain a node that wraps it, directly or transitively — cooking one would re-enter the inner graph's own cook and never finish. Wrap an independent graph instead.`,
  );
}

/**
 * @internal Seed the executor derives for one node instance (graph seed
 * combined with the node id). Shared between the executor and
 * {@link Graph.describe} so the reported seed always matches the seed
 * `execute` receives.
 */
export function deriveNodeSeed(graphSeed: number, nodeId: string): number {
  return hashCombine(graphSeed, hashString(nodeId));
}

/** One node instance in a {@link GraphDescription} snapshot. */
export interface DescribedNode {
  readonly id: string;
  /** Seed the executor passes to this node's execute (graph seed + id). */
  readonly seed: number;
  /**
   * The definition's declared type string — for graphs built from
   * registered defs this is the registered type name serialization uses;
   * ad-hoc defs report whatever type string they declare. `undefined`
   * (never a throw) when a def carries no usable type string.
   */
  readonly defType: string | undefined;
}

/** One connection in a {@link GraphDescription} snapshot. */
export interface DescribedConnection {
  /** Source endpoint: [nodeId, outputPin]. */
  readonly from: readonly [string, string];
  /** Target endpoint: [nodeId, inputPin]. */
  readonly to: readonly [string, string];
}

/** One declared terminal output in a {@link GraphDescription} snapshot. */
export interface DescribedOutput {
  readonly id: string;
  readonly pin: string;
  readonly name: string;
  /** `"asset"` when the output supplies the mesh for asset id = `name`; absent otherwise. */
  readonly role?: "asset";
}

/**
 * Read-only structural snapshot of a live graph; see {@link Graph.describe}.
 */
export interface GraphDescription {
  /** Node instances in insertion order. */
  readonly nodes: readonly DescribedNode[];
  /** Connections in creation order (per-pin order is order in this list). */
  readonly connections: readonly DescribedConnection[];
  /** Declared terminal outputs in declaration order. */
  readonly outputs: readonly DescribedOutput[];
}

/**
 * Descriptive metadata about a graph: what it is and what it is for.
 * Carried through the serialized JSON as an optional `meta` block and
 * read back by {@link Graph.meta}. Purely descriptive — cooking never
 * reads it, so it is not part of any memo key and setting it does not
 * bump {@link Graph.version}.
 */
export interface GraphMeta {
  /** Short human name, e.g. "scatter on a slope". */
  readonly title?: string;
  /** One or more sentences on what the graph builds. */
  readonly description?: string;
  /** Free-form labels for catalogs and search, e.g. ["scatter", "basics"]. */
  readonly tags?: readonly string[];
}

/**
 * Keys a {@link GraphMeta} object may carry, in canonical order. Frozen:
 * the validator reads it to decide what is legal AND to write the error
 * that lists the alternatives, so a caller who could push to it could
 * make the library advertise a key it then silently drops.
 */
export const GRAPH_META_KEYS: readonly string[] = Object.freeze([
  "title",
  "description",
  "tags",
]);

/**
 * Validate an untrusted value as {@link GraphMeta} and return a frozen,
 * canonical copy: known keys only, absent keys omitted, `tags` copied so
 * later caller-side mutation cannot reach into the graph.
 *
 * This is the ONE validator. `Graph.setMeta` and the JSON reader both go
 * through it, because the two ends disagreeing is how you get a graph
 * that saves and cannot be reopened: a writer that accepts
 * `{ title: 7 }` hands the reader something it is right to refuse.
 * `where` names the offender's location for the message.
 */
export function validateGraphMeta(value: unknown, where: string): GraphMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GraphValidationError(
      `${where}: expected an object { title?, description?, tags? }, got ${JSON.stringify(value)}`,
    );
  }
  const meta = value as Record<string, unknown>;
  for (const key of Object.keys(meta)) {
    if (!GRAPH_META_KEYS.includes(key)) {
      throw new GraphValidationError(
        `${where}: unknown key "${key}"; valid keys: ${GRAPH_META_KEYS.join(", ")}`,
      );
    }
  }
  const out: { title?: string; description?: string; tags?: readonly string[] } = {};
  for (const key of ["title", "description"] as const) {
    const v = meta[key];
    if (v === undefined) continue;
    if (typeof v !== "string") {
      throw new GraphValidationError(
        `${where}.${key}: expected a string, got ${JSON.stringify(v)}`,
      );
    }
    out[key] = v;
  }
  if (meta.tags !== undefined) {
    const tags = meta.tags;
    if (!Array.isArray(tags)) {
      throw new GraphValidationError(
        `${where}.tags: expected an array of strings, got ${JSON.stringify(tags)}`,
      );
    }
    // Indexed, not forEach: forEach SKIPS holes, so a sparse array would
    // validate clean and then serialize its holes as nulls — saved, and
    // unreadable on the way back in.
    const copy: string[] = [];
    for (let i = 0; i < tags.length; i++) {
      const tag: unknown = tags[i];
      if (typeof tag !== "string") {
        throw new GraphValidationError(
          `${where}.tags[${i}]: expected a string, got ${JSON.stringify(tag)}`,
        );
      }
      copy.push(tag);
    }
    out.tags = Object.freeze(copy);
  }
  return Object.freeze(out);
}

/**
 * Code-first node graph: add node instances, connect pins, declare
 * terminal outputs, then cook with `cook(graph)`. Connections are
 * validated eagerly (pins, kinds, single-pin occupancy, cycles).
 */
export class Graph {
  /** @internal Node instances in insertion order. */
  readonly _nodes = new Map<string, NodeState>();
  /** @internal All connections; per-pin order is order in this list. */
  readonly _connections: Connection[] = [];
  /** @internal Incoming connections per target node id, in connection order. */
  readonly _inTo = new Map<string, Connection[]>();
  /** @internal Outgoing connections per source node id, in connection order. */
  readonly _outFrom = new Map<string, Connection[]>();
  /** @internal Declared terminal outputs in declaration order. */
  readonly _outputs: OutputDecl[] = [];

  private _seed: number;
  private _version = 0;
  private _meta: GraphMeta | undefined;
  private _graphParams: readonly GraphParam[] = [];
  private readonly typeCounts = new Map<string, number>();

  constructor(seed = 0) {
    this._seed = seed >>> 0;
  }

  /**
   * The graph seed all node seeds derive from. Read-only: write it with
   * {@link Graph.setSeed}, which normalises it to a uint32, marks every
   * node dirty and bumps {@link Graph.version}. Assigning to it is refused
   * with that route named (see `GRAPH_WRITE_ROUTES` below).
   */
  get seed(): number {
    return this._seed;
  }

  /**
   * Descriptive metadata, or `undefined` when the graph declares none.
   * The returned object is frozen; replace it with {@link Graph.setMeta}.
   */
  get meta(): GraphMeta | undefined {
    return this._meta;
  }

  /**
   * Attach descriptive metadata (or clear it with `undefined`). The value
   * is validated by the same rules the JSON reader applies — an unknown
   * key or a non-string title is rejected here rather than at load time,
   * so what this accepts is exactly what `deserializeGraph` accepts — then
   * copied and frozen.
   *
   * Metadata is not cook input — no node sees it, no memo key includes it
   * — so this deliberately does NOT bump {@link Graph.version}: retitling
   * a graph must not invalidate a single cache. `serializeGraph` writes it
   * as the optional `meta` block and `deserializeGraph` reads it back.
   */
  setMeta(meta: GraphMeta | undefined): void {
    this._meta = meta === undefined ? undefined : validateGraphMeta(meta, "setMeta");
  }

  /**
   * Graph-scoped params in declaration order, frozen. Empty for a graph
   * that declares none, which is every graph that never asked for one.
   */
  get graphParams(): readonly GraphParam[] {
    return this._graphParams;
  }

  /**
   * Declare the graph's params, replacing any previous set. The values are
   * NOT pushed into the nodes: this records what the graph declares, and
   * the expressions were bound when they were BUILT — which is the whole
   * mechanism, because a value that arrives after construction never
   * reaches `Field.key` and so never moves a memo key. `deserializeGraph`
   * calls this with the same values it bound the fields with; use
   * {@link Graph.setGraphParam} to change one afterwards, which rebinds
   * the readers as it goes.
   *
   * Does not bump {@link Graph.version} on its own: on the deserialize path
   * every field already carries the value, and a bump would only invalidate
   * caches nothing has yet filled. `setGraphParam` bumps for the edit it
   * actually makes.
   */
  setGraphParams(params: readonly GraphParam[]): void {
    const seen = new Set<string>();
    const out: GraphParam[] = [];
    for (const param of params) {
      const error = graphParamError(param, "setGraphParams");
      if (error !== undefined) throw new GraphValidationError(error);
      if (seen.has(param.name)) {
        throw new GraphValidationError(
          `setGraphParams: duplicate graph param "${param.name}"; declare each name once`,
        );
      }
      seen.add(param.name);
      out.push(
        Object.freeze({
          ...param,
          value: Array.isArray(param.value) ? Object.freeze([...param.value]) : param.value,
        }) as GraphParam,
      );
    }
    this._graphParams = Object.freeze(out);
  }

  /**
   * Set one declared graph param's value and rebuild every field expression
   * that reads its name.
   *
   * The fan-out is the point: "cable radius" is one value read by three
   * nodes, and turning it must re-key exactly those three. A non-reader's
   * param object is untouched, so its `stableValueHash` is unchanged and it
   * is still served from cache; readers get a rebuilt field with a new
   * `Field.key`, which is what the executor's memo key is built on.
   *
   * The writes are LOUD, and that is where this inverts the subgraph
   * mechanism. `withExposedParams` writes quietly and restores on the way
   * out, because a body is shared between wrapper instances and a version
   * bump would invalidate the wrapper on every cook. This is a permanent
   * edit of a graph nobody else owns, so it must bump the version — a World
   * reads that counter to tell a user edit from its own per-cell binding,
   * and a quiet write would leave every stored cell serving the old value.
   */
  setGraphParam(name: string, value: ParamValue): void {
    const index = this._graphParams.findIndex((p) => p.name === name);
    if (index < 0) {
      throw new GraphValidationError(
        `setGraphParam: this graph declares no param "${name}"; declared: ${
          this._graphParams.map((p) => p.name).join(", ") || "(none)"
        }`,
      );
    }
    const next: GraphParam = { ...this._graphParams[index], value };
    const error = graphParamError(next, "setGraphParam");
    if (error !== undefined) throw new GraphValidationError(error);
    // Scan BEFORE the first write: setParam bumps the version, which
    // invalidates the scan's memo, and a cold re-scan would then read specs
    // this call has already rebuilt.
    const scan = paramScan(this);
    const derived = scan.derivedRefs.find((ref) => ref.names.includes(name));
    if (derived !== undefined) {
      throw new GraphValidationError(
        `setGraphParam: the field at ${refLabel(derived)} reads the graph param "${name}", but it was COMPOSED with the field constructors (mul(fieldFromJson(…), 3)) rather than authored as one JSON spec, so it cannot be rebuilt — it would keep the value it was built with while every authored expression took the new one. Write that slot as a single fieldFromJson spec, or have it read a name this graph does not declare`,
      );
    }
    const params = [...this._graphParams];
    params[index] = Object.freeze({
      ...next,
      value: Array.isArray(value) ? Object.freeze([...value]) : value,
    }) as GraphParam;
    this._graphParams = Object.freeze(params);
    // The slots it DRIVES take the value outright. This is the half a field
    // expression cannot do: an `i32`, an `enum` or a `string` is written,
    // not substituted, and writing is what lets a declaration reach the
    // other half of the format. `setParam` validates against each target's
    // own registered schema, so a value the merged schema admitted but a
    // target refuses still fails here, naming that target.
    for (const t of next.targets ?? []) {
      this.setParam({ id: t.node } as NodeHandle<Record<string, unknown>>, t.param, value as never);
    }
    const bindings = graphParamBindings(this._graphParams);
    for (const ref of scan.refs) {
      if (!ref.names.includes(name)) continue;
      const state = this._nodes.get(ref.node);
      if (state === undefined) continue;
      let rebuilt: Field;
      try {
        rebuilt = fieldFromJson(ref.spec, bindings);
      } catch (err) {
        throw new GraphValidationError(
          `setGraphParam: the field at ${refLabel(ref)} cannot be rebuilt with graph param "${name}" = ${JSON.stringify(value)}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      this.setParam(
        { id: ref.node } as NodeHandle<Record<string, unknown>>,
        ref.param,
        rebuilt as never,
      );
    }
  }

  /**
   * Monotonic edit counter: bumps on every mutating call (add, connect,
   * disconnect, setParam, setSeed, output). A subgraph node folds its
   * inner graph's version into its memo key, so direct edits to a wrapped
   * graph invalidate the wrapping node's cache.
   */
  get version(): number {
    return this._version;
  }

  /**
   * Add a node instance. `params` shallow-merges over the definition's
   * defaults. Omitting `id` assigns a deterministic `type_N` id.
   *
   * A node whose definition wraps this graph — directly, or through a
   * chain of subgraph nodes — is refused here, before the graph can hold
   * it. This is the ONLY moment the cycle can be caught statically: a
   * subgraph def carries no edge on its own, and `subgraphNode(inner)`
   * cannot see a loop that does not exist until the def is placed. Cook
   * time is too late, because a self-wrapping cook re-enters the inner
   * graph's exclusive section and a re-entrant call is indistinguishable
   * there from a genuinely concurrent one — so it would hang rather than
   * report anything.
   *
   * Each overriding param is checked against its declared schema, exactly
   * as {@link Graph.setParam} checks it — a value illegal to set is
   * illegal to start with. Defaults are not rechecked: `standardNode`
   * validated them at registration. Nothing is inserted when one is
   * refused, and the auto-id counter does not advance.
   */
  add<P, I extends string = string, O extends string = string>(
    def: NodeDef<P, I, O>,
    params?: Partial<P>,
    id?: string,
  ): NodeHandle<P, I, O> {
    checkNoWrapCycle(this, def as unknown as object, id);
    let nodeId: string;
    let advanceTo: number | undefined;
    if (id !== undefined) {
      if (this._nodes.has(id)) {
        throw new GraphValidationError(`node id "${id}" already exists`);
      }
      nodeId = id;
    } else {
      let n = this.typeCounts.get(def.type) ?? 0;
      do {
        nodeId = `${def.type}_${n}`;
        n++;
      } while (this._nodes.has(nodeId));
      advanceTo = n;
    }
    // `given` is this node's own record of what the caller passed, and it
    // is not quite a copy of `params`:
    //
    // - each string key is read ONCE, and the value that is checked is the
    //   value that is stored. Reading twice — once to check, once to
    //   merge — lets a param defined as a getter return one value to the
    //   validator and another to the node;
    // - own SYMBOL keys are dropped. `Object.keys` never saw them, so they
    //   were never validated, and no schema names one;
    // - an own `__proto__` key is dropped, because assigning it goes
    //   through the prototype setter rather than creating a property. JSON
    //   does produce that key; no schema names it either, so losing it
    //   keeps it out of a node's params, which is the safer of the two.
    const d = def as unknown as NodeDef<Record<string, unknown>>;
    let given: Record<string, unknown> | undefined;
    if (params !== undefined) {
      given = {};
      for (const key of Object.keys(params as object)) {
        const value = (params as Record<string, unknown>)[key];
        checkParamValue(nodeId, d, key, value, "add");
        given[key] = value;
      }
    }
    if (advanceTo !== undefined) this.typeCounts.set(def.type, advanceTo);
    const merged = {
      ...(def.defaultParams as object),
      ...given,
    } as Record<string, unknown>;
    // Canonicalized AFTER the merge, so the DEFAULTS are covered too. A
    // standard node's defaults are source literals and this is a no-op on
    // them, but a subgraph wrapper's are not: an exposed param's `default`
    // is read from the graph file and lands in `defaultParams`, so a
    // wrapper added without an explicit value would otherwise hold the
    // parsed string. Written only when the value actually changes, which
    // is also what keeps a `__proto__` key (never an enum param, so never
    // changed) from being assigned through.
    for (const key of Object.keys(merged)) {
      const canon = canonicalParamValue(d, key, merged[key]);
      if (canon !== merged[key]) merged[key] = canon;
    }
    this._nodes.set(nodeId, {
      id: nodeId,
      def: def as unknown as NodeDef<Record<string, unknown>>,
      params: merged,
      dirty: true,
      cache: undefined,
    });
    this._version++;
    return { id: nodeId };
  }

  /**
   * Connect an output pin to an input pin. Validates that both pins exist,
   * kinds are compatible (`any` matches either), the input pin is free
   * unless `multi`, and no cycle is created. Dirties the target node.
   *
   * `fromPin` and `toPin` are typed from the handles: a standard node's
   * handle accepts only its own pin names, an untyped handle any string
   * (see {@link NodeHandle} for widening one whose pin is a runtime value).
   */
  connect<O extends string, I extends string>(
    from: NodeHandle<unknown, string, O>,
    fromPin: PinName<O>,
    to: NodeHandle<unknown, I, string>,
    toPin: PinName<I>,
  ): void {
    const src = this.require(from.id);
    const dst = this.require(to.id);
    const out = findPin(src.def.outputs, fromPin);
    if (!out) {
      throw unknownPinError(src.id, "output", fromPin, src.def.outputs, false);
    }
    const inp = findPin(dst.def.inputs, toPin);
    if (!inp) {
      throw unknownPinError(dst.id, "input", toPin, dst.def.inputs, false);
    }
    if (out.kind !== "any" && inp.kind !== "any" && out.kind !== inp.kind) {
      throw new GraphValidationError(
        `cannot connect ${src.id}.${fromPin} (${out.kind}) to ${dst.id}.${toPin} (${inp.kind})`,
        undefined,
        "pin-kind-mismatch",
      );
    }
    if (
      inp.multi !== true &&
      (this._inTo.get(dst.id) ?? []).some((c) => c.toPin === toPin)
    ) {
      throw new GraphValidationError(
        `input pin ${dst.id}.${toPin} is already connected (declare it multi to allow several)`,
        undefined,
        "input-pin-occupied",
      );
    }
    if (src.id === dst.id || this.reaches(dst.id, src.id)) {
      throw new GraphCycleError(
        `connecting ${src.id}.${fromPin} to ${dst.id}.${toPin} would create a cycle`,
      );
    }
    const conn: Connection = { from: src.id, fromPin, to: dst.id, toPin };
    this._connections.push(conn);
    let into = this._inTo.get(dst.id);
    if (!into) this._inTo.set(dst.id, (into = []));
    into.push(conn);
    let outOf = this._outFrom.get(src.id);
    if (!outOf) this._outFrom.set(src.id, (outOf = []));
    outOf.push(conn);
    dst.dirty = true;
    this._version++;
  }

  /**
   * Remove one matching connection; returns whether one existed (a
   * missing connection between valid endpoints is not an error, and does
   * not bump the version). Unknown nodes or pins throw, naming the
   * offender and listing the valid pins. Dirties the target node on
   * success. On a `multi` input the remaining connections keep their
   * original insertion order — order is part of determinism.
   *
   * Cache contract: the target's next memo key sees the changed input
   * revs, so it (and anything downstream of it) recooks on the next
   * cook; untouched branches keep serving their caches.
   */
  disconnect<O extends string, I extends string>(
    from: NodeHandle<unknown, string, O>,
    fromPin: PinName<O>,
    to: NodeHandle<unknown, I, string>,
    toPin: PinName<I>,
  ): boolean {
    const src = this.require(from.id);
    const dst = this.require(to.id);
    if (!findPin(src.def.outputs, fromPin)) {
      throw unknownPinError(src.id, "output", fromPin, src.def.outputs, true);
    }
    if (!findPin(dst.def.inputs, toPin)) {
      throw unknownPinError(dst.id, "input", toPin, dst.def.inputs, true);
    }
    const idx = this._connections.findIndex(
      (c) => c.from === from.id && c.fromPin === fromPin && c.to === to.id && c.toPin === toPin,
    );
    if (idx < 0) return false;
    const conn = this._connections[idx];
    this._connections.splice(idx, 1);
    const into = this._inTo.get(conn.to);
    if (into) into.splice(into.indexOf(conn), 1);
    const outOf = this._outFrom.get(conn.from);
    if (outOf) outOf.splice(outOf.indexOf(conn), 1);
    dst.dirty = true;
    this._version++;
    return true;
  }

  /**
   * Remove a node. Documented cascade: every connection touching the
   * node and every declared output on it are removed too, and each
   * former downstream target is marked dirty. Bumps the version once.
   * Unknown handles (another graph's, or already removed) throw.
   *
   * Cache contract: former downstream nodes see changed input revs in
   * their next memo key and recook on the next cook; nodes on untouched
   * branches keep serving their caches. The removed node's memoized
   * outputs live on its per-node state, which this call drops — eviction
   * is immediate and nothing else retains it (the executor keys its
   * in-flight guard per graph, not per node), so repeated add/remove
   * cycles cannot accumulate cached data.
   *
   * Removed auto-assigned ids are not reused (the per-type counter only
   * advances); an explicit id can be reused by passing it to `add` again.
   *
   * Subgraph notes: removing a subgraph *instance* leaves its definition
   * and the wrapped inner graph intact — other instances (and re-adding
   * the def) keep working, and the def's recorded spec/plumbing are
   * WeakMap-keyed, so they are reclaimed with the def. Removing plumbing
   * the wrapper injected *inside* a wrapped graph (portal nodes) breaks
   * that wrapper and is not supported.
   *
   * Removing a node while a cook of this graph is in flight may reject
   * that pass (the cook can no longer resolve the node); the graph stays
   * consistent and the next cook is correct.
   */
  removeNode(handle: NodeHandle): void {
    const node = this.require(handle.id);
    const id = node.id;
    for (let i = this._connections.length - 1; i >= 0; i--) {
      const conn = this._connections[i];
      if (conn.from !== id && conn.to !== id) continue;
      this._connections.splice(i, 1);
      if (conn.from !== id) {
        const outOf = this._outFrom.get(conn.from);
        if (outOf) outOf.splice(outOf.indexOf(conn), 1);
      }
      if (conn.to !== id) {
        const into = this._inTo.get(conn.to);
        if (into) into.splice(into.indexOf(conn), 1);
        const dst = this._nodes.get(conn.to);
        if (dst) dst.dirty = true;
      }
    }
    this._inTo.delete(id);
    this._outFrom.delete(id);
    for (let i = this._outputs.length - 1; i >= 0; i--) {
      if (this._outputs[i].node === id) this._outputs.splice(i, 1);
    }
    this._nodes.delete(id);
    this._version++;
  }

  /**
   * Set one param and mark the node dirty.
   *
   * The value is checked against the param's declared schema first, and a
   * violation throws `GraphValidationError` naming the node, the param,
   * the value and what would be legal. The check belongs here rather than
   * only at the JSON boundary: a graph that is built, patched and cooked
   * in memory — a host, the editor, an agent driving this API — would
   * otherwise carry a value nothing ever refuses, and the damage would
   * surface at a node far from the write, or not at all.
   *
   * What it does NOT check is a `Field`, beyond the param being
   * field-capable: a field is a recipe with no number to bound until it
   * lands on a domain, which is what the finiteness guard at the param
   * seam is for.
   */
  setParam<P, K extends keyof P & string>(handle: NodeHandle<P>, key: K, value: P[K]): void {
    const node = this.require(handle.id);
    checkParamValue(node.id, node.def, key, value, "setParam");
    this._setParamQuiet(handle, key, canonicalParamValue(node.def, key, value) as P[K]);
    this._version++;
  }

  /**
   * @internal Param write that does not count as a user edit (no version
   * bump) — used by subgraph plumbing, whose effects are already covered
   * by the wrapping node's memo key (outer seed and input revs).
   *
   * Deliberately UNCHECKED, unlike {@link Graph.setParam}. Every caller
   * is a write-cook-restore around an inner graph: the write half carries
   * a value the wrapper already validated at its own seam (an exposed
   * param, a `forEach` step key), and the restore half puts back the
   * value that was there before — which was checked on its way in.
   * Checking again would cost a schema switch per param per cook, and per
   * ITERATION in `forEach`, to re-derive an answer already known.
   */
  _setParamQuiet<P, K extends keyof P & string>(
    handle: NodeHandle<P>,
    key: K,
    value: P[K],
  ): void {
    const node = this.require(handle.id);
    node.params[key] = value;
    node.dirty = true;
  }

  /**
   * Current params of a node instance, as a frozen shallow copy taken at
   * call time (later `setParam` calls are not reflected — call again for
   * fresh values). Freezing the snapshot means no returned object offers
   * a mutation path that bypasses version bumps. Nested values are the
   * live values by reference — Fields are immutable by contract, and
   * arrays/items follow the library-wide aliasing rule (cook results,
   * `dataInput` items): treat them as frozen, and change params only
   * through `setParam`.
   */
  getParams<P>(handle: NodeHandle<P>): Readonly<P> {
    return Object.freeze({ ...this.require(handle.id).params }) as unknown as Readonly<P>;
  }

  /** Set the graph seed and mark every node dirty. */
  setSeed(seed: number): void {
    this._setSeedQuiet(seed);
    this._version++;
  }

  /** @internal Seed write without a version bump; see {@link Graph._setParamQuiet}. */
  _setSeedQuiet(seed: number): void {
    this._seed = seed >>> 0;
    for (const node of this._nodes.values()) node.dirty = true;
  }

  /**
   * Declare a terminal output: cooking pulls from these (and cooks only
   * what they reach). `name` defaults to `"<nodeId>.<pin>"` and keys the
   * collection in the cook result. `opts.role: "asset"` makes the
   * output's geometry the mesh for asset id = `name` (see
   * {@link OutputOptions}); the pin must then carry geometry.
   */
  output<O extends string>(
    handle: NodeHandle<unknown, string, O>,
    pin: PinName<O>,
    name?: string,
    opts?: OutputOptions,
  ): void {
    const node = this.require(handle.id);
    const pinDef = findPin(node.def.outputs, pin);
    if (!pinDef) {
      throw new GraphValidationError(`node "${node.id}" has no output pin "${pin}"`);
    }
    const outName = name ?? `${node.id}.${pin}`;
    const role = opts?.role;
    if (role !== undefined && role !== "asset") {
      throw new GraphValidationError(
        `output "${outName}" (node "${node.id}" pin "${pin}"): role ${JSON.stringify(role)} is not a role; valid: "asset" (omit role for scene content)`,
        undefined,
        "invalid-asset-output",
      );
    }
    if (role === "asset" && pinDef.kind !== "geometry" && pinDef.kind !== "any") {
      throw new GraphValidationError(
        `output "${outName}" (node "${node.id}" pin "${pin}") is declared role "asset", but an asset is a mesh and that pin carries ${pinDef.kind}; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop "role"`,
        undefined,
        "invalid-asset-output",
      );
    }
    if (this._outputs.some((o) => o.name === outName)) {
      throw new GraphValidationError(`output "${outName}" is already declared`);
    }
    this._outputs.push(
      role === "asset" ? { name: outName, node: node.id, pin, role } : { name: outName, node: node.id, pin },
    );
    this._version++;
  }

  /**
   * Undeclare the named terminal output. Cooking afterwards no longer
   * produces it (and per-output cooking rejects the name); the name is
   * free to redeclare. Bumps the version. Node caches are untouched —
   * removing an output changes what a cook pulls, not any memo key, so
   * the next cook serves every unchanged node from cache. Unknown names
   * throw, listing the declared outputs.
   */
  removeOutput(name: string): void {
    const idx = this._outputs.findIndex((o) => o.name === name);
    if (idx < 0) {
      if (this._outputs.length === 0) {
        throw new GraphValidationError(
          `unknown output "${name}": this graph declares no outputs`,
        );
      }
      throw new GraphValidationError(
        `unknown output "${name}"; declared outputs: ${this._outputs
          .map((o) => `"${o.name}"`)
          .join(", ")}`,
      );
    }
    this._outputs.splice(idx, 1);
    this._version++;
  }

  /** Whether the node has a pending change not yet validated by a cook. */
  isDirty(handle: NodeHandle): boolean {
    return this.require(handle.id).dirty;
  }

  /**
   * Read-only snapshot of the live structure: nodes (insertion order),
   * connections (creation order), and declared outputs (declaration
   * order) — deterministic and stable across calls. Every object in the
   * snapshot is freshly built and frozen, so nothing it exposes can
   * mutate the graph behind the version counter; per-node param values
   * are served separately by {@link Graph.getParams}. Cheap enough to
   * call per UI frame on editor-sized graphs (no geometry or param
   * copies). The structure is reported verbatim — for a graph wrapped by
   * `subgraphNode` that includes the wrapper's injected plumbing (portal
   * nodes, `__out_*` outputs), which serialization excludes.
   */
  describe(): GraphDescription {
    const nodes: DescribedNode[] = [];
    for (const state of this._nodes.values()) {
      const type = state.def.type;
      nodes.push(
        Object.freeze({
          id: state.id,
          seed: deriveNodeSeed(this._seed, state.id),
          defType: typeof type === "string" && type !== "" ? type : undefined,
        }),
      );
    }
    const connections = this._connections.map((c) =>
      Object.freeze({
        from: Object.freeze([c.from, c.fromPin] as const),
        to: Object.freeze([c.to, c.toPin] as const),
      }),
    );
    const outputs = this._outputs.map((o) =>
      Object.freeze(
        o.role === undefined
          ? { id: o.node, pin: o.pin, name: o.name }
          : { id: o.node, pin: o.pin, name: o.name, role: o.role },
      ),
    );
    return Object.freeze({
      nodes: Object.freeze(nodes),
      connections: Object.freeze(connections),
      outputs: Object.freeze(outputs),
    });
  }

  /** @internal Look up node state, throwing on unknown ids. */
  require(id: string): NodeState {
    const node = this._nodes.get(id);
    if (!node) {
      throw new GraphValidationError(
        `unknown node "${id}" (removed from this graph, or a handle from another graph?)`,
      );
    }
    return node;
  }

  /** Is `target` reachable downstream from `start`? */
  private reaches(start: string, target: string): boolean {
    const stack = [start];
    const seen = new Set<string>([start]);
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (id === target) return true;
      const outgoing = this._outFrom.get(id);
      if (!outgoing) continue;
      for (const c of outgoing) {
        if (!seen.has(c.to)) {
          seen.add(c.to);
          stack.push(c.to);
        }
      }
    }
    return false;
  }
}

/**
 * The method that writes each read-only property of a {@link Graph}, or
 * `null` for one that is derived and nothing writes.
 *
 * `graph.seed = 1234` is the assignment callers reach for, and a
 * getter-only accessor answers it with the engine's own `TypeError` — a
 * sentence naming neither the property's purpose nor `setSeed`. The guards
 * below replace that bare failure with a diagnostic that names the route,
 * because an error message is part of this library's API.
 *
 * Exhaustive by test: `readOnly.test.ts` walks every accessor on
 * `Graph.prototype` and fails when one has no entry here, so a read-only
 * property added later cannot quietly keep the bare `TypeError`.
 */
const GRAPH_WRITE_ROUTES: Readonly<Record<string, string | null>> = Object.freeze({
  seed: "setSeed",
  meta: "setMeta",
  graphParams: "setGraphParams",
  version: null,
});

/**
 * What a refused assignment says per property: the consequence the write
 * route carries, or why there is no route. Written out per property rather
 * than assembled from a template, because that consequence is the useful
 * half of the message and no two of them are alike.
 */
const GRAPH_READ_ONLY_DETAIL: Readonly<Record<string, string>> = Object.freeze({
  seed: "it normalises the seed to a uint32, marks every node dirty and bumps graph.version",
  meta: "it validates the block by the rules the JSON reader applies, and deliberately leaves graph.version alone",
  graphParams:
    "it replaces the whole declared set; to change one and rebind its readers, call graph.setGraphParam(name, value)",
  version:
    "version bumps on its own with every mutating call (add, connect, disconnect, setParam, setSeed, output)",
});

/** The value as a diagnostic can quote it back, or `undefined` when it cannot. */
function quotableValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

/**
 * The error a refused assignment throws.
 *
 * The fix is spelled as a call the caller can paste — carrying their own
 * value only when that value would still be a VALID argument, so
 * `graph.seed = 7` is answered with `graph.setSeed(7)` while
 * `graph.seed = "7"` gets `graph.setSeed(seed)` rather than a call that
 * would fail in turn. `got` quotes the refused value either way; that is
 * data about what happened, not advice.
 *
 * The record carries the route as `expected` rather than as `valid` or
 * `didYouMean`: those two are for the accepted values (or near spellings)
 * of the offending KEY, and a consumer that renders them would print
 * "setSeed" as a permitted name for the property. What was expected here
 * is a call, which is exactly what `expected` says.
 */
function readOnlyPropertyError(property: string, value: unknown): GraphValidationError {
  const route = GRAPH_WRITE_ROUTES[property] ?? null;
  const got = quotableValue(value);
  const argument = typeof value === "number" && Number.isFinite(value) ? String(value) : property;
  const call = route === null ? undefined : `graph.${route}(${argument})`;
  // Never the no-route wording for a property that HAS one: the two
  // tables are written side by side and a gap in the second must not turn
  // into a sentence that contradicts the first.
  const detail =
    GRAPH_READ_ONLY_DETAIL[property] ??
    (route === null ? "there is no write route" : `it is the supported way to change ${property}`);
  const message =
    call === undefined
      ? `Graph.${property} is read-only and derived; assigning to it changes nothing — ${detail}.`
      : `Graph.${property} is read-only; assigning to it cannot work. Call ${call} instead — ${detail}.`;
  return new GraphValidationError(message, undefined, [
    {
      code: "read-only-property",
      severity: "error",
      message,
      key: property,
      ...(got !== undefined ? { got } : {}),
      ...(call !== undefined ? { expected: `a call to ${call}`, fix: `call ${call}` } : {}),
    },
  ]);
}

/**
 * Give every read-only property named above a setter that throws that
 * error, in place of the engine's bare `TypeError`.
 *
 * Installed on the prototype rather than declared as a `set` accessor in
 * the class body ON PURPOSE. A declared setter needs a parameter type, and
 * the narrowest one available (`never`) would replace TypeScript's own
 * "Cannot assign to 'seed' because it is a read-only property" — which
 * already names the fault at compile time — with "Type 'number' is not
 * assignable to type 'never'", which names nothing. Installing it here
 * leaves the compile-time message alone and improves only the RUNTIME one,
 * which is the half a JavaScript caller, a `pcg` script and an agent
 * reading a stack trace actually reach.
 */
for (const property of Object.keys(GRAPH_WRITE_ROUTES)) {
  const descriptor = Object.getOwnPropertyDescriptor(Graph.prototype, property);
  if (descriptor?.get === undefined || descriptor.set !== undefined) continue;
  Object.defineProperty(Graph.prototype, property, {
    ...descriptor,
    set(value: unknown): never {
      throw readOnlyPropertyError(property, value);
    },
  });
}
