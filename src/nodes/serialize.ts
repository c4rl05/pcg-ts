/**
 * Graph JSON serialization: a stable, versioned format referencing
 * registered node types by name. Params are validated against the
 * registry's param schemas; field-valued params serialize as declarative
 * FieldSpecs (see fieldJson.ts). Every validation error names the node,
 * param, or pin at fault and states what would be valid.
 */
import {
  type Diagnostic,
  type DiagnosticCode,
  diagnosticsOf,
  errorDiagnostics,
} from "../diagnostics/index.js";
// By path: the phrasing helper is internal plumbing the diagnostics barrel does not carry.
import { type NameSuggestion, suggestNames } from "../diagnostics/didYouMean.js";
import { isField } from "../fields/index.js";
import {
  Graph,
  validateGraphMeta,
  getSubgraphSpec,
  subgraphNode,
  type ExposedParam,
  type ExposedPin,
  type GraphMeta,
  type NodeHandle,
  type ParamSchema,
  type ParamValue,
  type SubgraphSpec,
  type GraphParam,
  graphParamBindings,
} from "../graph/index.js";
// Reached by MODULE, like `../graph/subgraph.js` above: the validator is
// the graph layer's own, not package API, and the reader needs the same one
// the live setter uses so a value refused by one is refused by both.
import { canonicalEnumValue, graphParamError, paramValueError } from "../graph/params.js";
import {
  CARRIED_PIN_NAMES,
  ITERATED_PIN_NAMES,
  getSubgraphPlumbing,
  type WrapperKind,
} from "../graph/subgraph.js";
import {
  FieldJsonError,
  type FieldSpec,
  fieldFromJson,
  fieldToJson,
  inlineParamValuesOf,
} from "../fields/fieldJson.js";
import { forEachNode } from "./forEach.js";
import type { RepeatUntilParams } from "./params.generated.js";
import { REPEAT_UNTIL_PARAM_SCHEMAS, repeatUntilNode } from "./repeatUntil.js";
import { getNodeType, hasNodeType, listNodeTypes, standardNode } from "./registry.js";
import { type ExposedParamDecl, resolveExposedParam } from "./subgraphParams.js";
// The ref record lives in its own module so `diagnoseGraph` can tell an
// inline body from a referenced one; see `./subgraphRefs.ts`.
import { recordSubgraphRef, subgraphRefOf } from "./subgraphRefs.js";
// Import cycle, deliberate and safe: the registry stores serialized
// recipes (so it needs this module's writer and reader) and this module
// must resolve names (so it needs the registry's lookups). Neither module
// touches the other at evaluation time — only function declarations cross
// the edge, and they are hoisted.
import {
  _registeredSubgraphKey,
  _subgraphKey,
  getRegisteredSubgraph,
  hasRegisteredSubgraph,
  registeredSubgraphNames,
  unknownSubgraphImportFix,
  unknownSubgraphMessage,
} from "./subgraphRegistry.js";

/**
 * Errors raised while serializing or deserializing graphs.
 *
 * `diagnostics` holds the fault as records. The optional trailing argument
 * is a code or the full list; without it the record's code is `error`,
 * because a load fault spans too many categories for the class alone to
 * name one.
 */
export class GraphSerializationError extends Error {
  /** This fault as records; never empty. */
  readonly diagnostics: readonly Diagnostic[];

  constructor(message: string, diagnostics?: DiagnosticCode | readonly Diagnostic[]) {
    super(message);
    this.name = "GraphSerializationError";
    this.diagnostics = errorDiagnostics(message, diagnostics, "error");
  }
}

/** One exposed pin mapping in a serialized subgraph payload. */
export interface SerializedExposedPin {
  /** Pin name on the wrapping subgraph node. */
  readonly name: string;
  /** Id of the inner node the pin maps to. */
  readonly node: string;
  /** Pin name on the inner node (input pin for inputs, output pin for outputs). */
  readonly pin: string;
}

/**
 * One exposed-param declaration in a serialized subgraph payload: the
 * AUTHORED part only. `type`, `enum`, `acceptsField` and `acceptsInfinite`
 * are deliberately
 * absent — they are re-derived from the targets' registered schemas on
 * load, so a payload cannot carry a schema that lies about what the inner
 * params accept, and there is no duplicated truth to drift.
 */
export interface SerializedExposedParam {
  /** Param name on the wrapping subgraph node. */
  readonly name: string;
  /**
   * Inner slots the value is written into, in write order. EMPTY for a
   * param the body's field expressions read by name — the value then
   * reaches the cook by substitution into those expressions, and the
   * schema is derived from `default`'s shape (a number is f32, a 3-number
   * array vec3, a 4-number array vec4) since there is no inner param to
   * borrow one from. A reader also accepts the key being absent.
   */
  readonly targets: readonly { readonly node: string; readonly param: string }[];
  /** Agent-facing description, authored at the exposed level. */
  readonly description: string;
  /** Value a fresh instance starts with. */
  readonly default: unknown;
  /** Inclusive lower bound, when the merged schema has one. */
  readonly min?: number;
  /** Inclusive upper bound, when the merged schema has one. */
  readonly max?: number;
}

/**
 * Nested payload of a serialized `subgraph` node: the inner graph
 * (recursively serialized, without the wrapper's injected plumbing), the
 * exposed pin mappings, and the exposed-param declarations (omitted when
 * the node declares none). Deserialization rebuilds the inner graph and
 * re-wraps it through `subgraphNode`, so the result behaves exactly like
 * a code-first subgraph node.
 */
export interface SerializedSubgraph {
  readonly graph: SerializedGraph;
  readonly inputs: readonly SerializedExposedPin[];
  readonly outputs: readonly SerializedExposedPin[];
  readonly params?: readonly SerializedExposedParam[];
}

/**
 * A `subgraph` node's reference to a registered subgraph (see
 * `registerSubgraph`), carried instead of an embedded `subgraph` payload.
 */
export interface SerializedSubgraphRef {
  /** Registered subgraph name; resolved at load time. */
  readonly name: string;
  /**
   * OPTIONAL content hash (see `subgraphContentHash`). Absent — the
   * default — means "whatever the registry currently holds", so a
   * primitive can be improved under saved graphs. Present means the author
   * asked to be pinned, and a mismatch is a hard error rather than a
   * warning that lets a near-miss cook.
   */
  readonly hash?: string;
}

/** One node instance in a serialized graph. */
export interface SerializedNode {
  readonly id: string;
  /** Registered node type name (see listNodeTypes). */
  readonly type: string;
  /**
   * Param values; field-valued params carry FieldSpec objects. On a
   * `subgraph` node these are its exposed params' values — the
   * declarations live in the `subgraph` payload (or, for a reference, in
   * the registered recipe), the way a standard node's schemas live in the
   * registry.
   */
  readonly params: Record<string, unknown>;
  /** Present on `subgraph` nodes only: the inner graph payload. */
  readonly subgraph?: SerializedSubgraph;
  /**
   * Present on `subgraph` nodes only, and mutually exclusive with
   * {@link SerializedNode.subgraph}: a reference to a registered subgraph
   * by name.
   */
  readonly ref?: SerializedSubgraphRef;
}

/** One connection: [nodeId, pinName] to [nodeId, pinName]. */
export interface SerializedConnection {
  readonly from: readonly [string, string];
  readonly to: readonly [string, string];
}

/** One declared terminal output. */
export interface SerializedOutput {
  readonly id: string;
  readonly pin: string;
  readonly name: string;
}

/**
 * One graph-scoped param: a value declared once at the top level and read
 * by name from any node's field expression (`{"fn":"param","name":…}`).
 *
 * The keys are the inline `param` spec node's keys minus `fn`, because a
 * graph-scoped param IS an inline value hoisted out of one expression so
 * several can share it — same vocabulary, same validation, same derived
 * schema. Deliberately not the exposed-param vocabulary: `targets` means
 * nothing without a wrapper, and `default` is what a fresh INSTANCE starts
 * with, where a graph has no instances and the value it holds is its value.
 */
export interface SerializedGraphParam {
  readonly name: string;
  /**
   * A finite number or a numeric tuple when the param has no `targets`;
   * anything the targets' merged schema admits when it does.
   */
  readonly value: ParamValue;
  /**
   * Node params this writes into, in write order. Omitted for a param that
   * only field expressions read by name — which is every param that can
   * reach a number and no param that can reach an `i32`, a `bool`, a
   * `string` or an `enum`, since those are unreachable from an expression.
   */
  readonly targets?: readonly { readonly node: string; readonly param: string }[];
  readonly min?: number;
  readonly max?: number;
  readonly description?: string;
}

/** The stable, versioned graph interchange format. */
export interface SerializedGraph {
  readonly formatVersion: 1;
  readonly seed: number;
  /**
   * Optional graph-scoped params, in declaration order. Written only when
   * the graph declares one, so a graph that has none serializes
   * byte-identically to before this key existed. An ARRAY rather than an
   * object keyed by name because `JSON.parse` collapses duplicate object
   * keys before any reader sees them — the trap `byAttribute`'s `cases`
   * had to concede — and here a repeated name is detectable, so it is
   * detected.
   */
  readonly params?: readonly SerializedGraphParam[];
  /**
   * Optional descriptive block ({@link GraphMeta}): title, description,
   * tags. Written only when the graph declares one, ignored by cooking,
   * and — being purely additive — read by every formatVersion-1 reader
   * that predates it, so the version stays 1.
   */
  readonly meta?: GraphMeta;
  readonly nodes: readonly SerializedNode[];
  readonly connections: readonly SerializedConnection[];
  readonly outputs: readonly SerializedOutput[];
}

const FORMAT_VERSION = 1;

/**
 * The complete key sets of the format. Anything else is a hard error, not
 * a silently ignored extra.
 *
 * **This closes the additive-extension door, on purpose.** `meta` could be
 * added to a graph in v0.9 and still be read by every earlier v1 reader,
 * because unknown keys were ignored. That leniency is now spent: a reader
 * that ignores what it does not recognize cannot tell a new field from a
 * typo, and `"refs"` for `"ref"` would have cooked as an ordinary subgraph
 * node — a near-miss, silently. A future field an old reader could MISREAD
 * therefore arrives with a `formatVersion` bump rather than riding along
 * unnoticed.
 *
 * That is narrower than "a future format field", and the narrowing is the
 * honest statement of what the rule protects. An added key an old reader
 * REFUSES — which is every added key, since this list is closed — cannot be
 * misread: `meta` was added under exactly this reasoning, the inline `value`
 * on a `param` spec node after it, and `params` here. The bump is not free
 * either: `hashableGraph` covers `formatVersion`, so moving it moves every
 * subgraph content hash and breaks every pinned `ref` in the corpus. Spend
 * it on a change that alters what an EXISTING key means, not on an addition
 * the closed list already polices.
 *
 * The rule holds at EVERY object position, not only the outer ones — a
 * lenient nested object is the same near-miss one level down, and the
 * nested positions are where the plausible typos live (`enum` or
 * `acceptsField` on an exposed param, `description` on a declared output).
 *
 * ONE key sits outside these lists, deliberately and narrowly:
 * `$schema` ({@link SCHEMA_KEY}) on the outermost graph object, a string
 * naming the JSON Schema the file follows. It is not a format field and
 * cannot be misread as one — the loader never reads its value, the writer
 * never writes it, and it reaches no content hash — so admitting it opens
 * no extension door. It is refused in a nested payload's graph, which
 * `hashableGraph` covers verbatim, and it is not listed among the "valid
 * keys" a refusal prints, because an author never needs it to fix a typo.
 */
const GRAPH_KEYS = [
  "formatVersion",
  "seed",
  "meta",
  "params",
  "nodes",
  "connections",
  "outputs",
] as const;
/**
 * The one key outside {@link GRAPH_KEYS} a graph object may carry, and only
 * the OUTERMOST one: the JSON Schema the file follows, for an editor's
 * validation and completion. The loader ignores its value and the writer
 * never emits it, so it touches no content hash and no round trip.
 */
const SCHEMA_KEY = "$schema";
const GRAPH_PARAM_KEYS = ["name", "value", "targets", "min", "max", "description"] as const;
const NODE_KEYS = ["id", "type", "params", "subgraph", "ref"] as const;
const SUBGRAPH_PAYLOAD_KEYS = ["graph", "inputs", "outputs", "params"] as const;
const SUBGRAPH_REF_KEYS = ["name", "hash"] as const;
const CONNECTION_KEYS = ["from", "to"] as const;
const OUTPUT_KEYS = ["id", "pin", "name"] as const;
const EXPOSED_PIN_KEYS = ["name", "node", "pin"] as const;
const EXPOSED_PARAM_KEYS = ["name", "targets", "description", "default", "min", "max"] as const;
const EXPOSED_PARAM_TARGET_KEYS = ["node", "param"] as const;

/**
 * Keys refused with a reason of their own rather than as plain unknowns.
 *
 * An exposed param's `type`, `enum` and `acceptsField` are real
 * {@link ParamSchema} field names, so an author or an agent will reach for
 * them — but the schema is RE-DERIVED from the targets' registered
 * schemas, never read from the payload. Accepting them would let a payload
 * claim a type or a field capability the inner params do not have;
 * ignoring them would drop an author's stated intent without a word. So
 * they are named, with the reason.
 */
const DERIVED_EXPOSED_PARAM_KEYS: Readonly<Record<string, string>> = {
  type: "derived from the targets' registered schemas; remove it",
  enum: "derived from the targets' registered schemas; remove it",
  acceptsField: "derived from the targets' registered schemas; remove it",
  acceptsInfinite: "derived from the targets' registered schemas; remove it",
};

/**
 * A WRITER refusal: thrown at once, with one record. Serializing stops at
 * the first thing it cannot write — there is no document yet to point
 * into, and a live graph that cannot be written has one fault worth
 * fixing before the next matters. Reading is the opposite case; see
 * {@link fault}.
 */
function fail(message: string, code: DiagnosticCode = "not-serializable"): never {
  throw new GraphSerializationError(message, code);
}

/* ------------------------------------------------------------------ *
 * Reading collects every fault
 * ------------------------------------------------------------------ */

/**
 * Most records one load reports. A load that finds more stops looking and
 * appends one `truncated` record, so a hostile or badly broken file cannot
 * make the error unbounded — and an author fixing a hundred faults gets
 * the next hundred on the next load.
 */
const MAX_LOAD_RECORDS = 100;

/** A load fault as the reader builds it: a record less its severity, which is always "error". */
type Fault = Omit<Diagnostic, "severity" | "got"> & { readonly got?: unknown };

/** RFC 6901 JSON pointer suffix for one step. */
type Locate = (suffix: string) => string;

/** Pointers under `base`, one step at a time. */
function under(base: string): Locate {
  return (suffix) => base + suffix;
}

/**
 * Every pointer collapsed onto `base`: a fault inside a registered recipe
 * the node reached by `ref` lives in no document the caller holds, so the
 * nearest place in THEIR document is the reference itself.
 */
function collapsedOn(base: string): Locate {
  return () => base;
}

/**
 * `locate` one step further down. Collapsing survives it: a child of a
 * collapsed locator is still collapsed, where `under(locate(step))` would
 * start growing a path inside a document nobody holds.
 */
function child(locate: Locate, step: string): Locate {
  return (suffix) => locate(step + suffix);
}

/** One RFC 6901 reference token: `~` as `~0`, `/` as `~1`. */
function pointerToken(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * The pointer to `obj[key]` when the key is present, else to `obj` itself:
 * a missing value has no location of its own, and a record should point at
 * something the document holds.
 */
function keyPath(obj: Record<string, unknown>, key: string, locate: Locate): string {
  return Object.hasOwn(obj, key) ? locate(`/${pointerToken(key)}`) : locate("");
}

/**
 * A value a record may quote as `got`: a string, a boolean, null or a
 * finite number. Structured values are left out rather than quoted — the
 * message already shows them — and anything JSON cannot carry would fail
 * the record list's validation as a whole.
 */
function scalarGot(v: unknown): string | number | boolean | null | undefined {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

/** A fault as a record, `got` kept only when it is a scalar (see {@link scalarGot}). */
function toRecord(f: Fault): Diagnostic {
  const { got, ...rest } = f;
  const quoted = scalarGot(got);
  return { ...rest, severity: "error", ...(quoted !== undefined ? { got: quoted } : {}) };
}

/**
 * Thrown to abandon the current unit (a node, a param, a connection...).
 * `record` is the fault that ended it; `undefined` means the fault was
 * already reported further in — a wrapper whose body failed — and the unit
 * is only being given up on.
 */
class LoadFault extends Error {
  // A declared field, not a constructor parameter property: some suites run
  // this source under Node's type stripping, which refuses those.
  readonly record: Diagnostic | undefined;
  constructor(record: Diagnostic | undefined) {
    super(record?.message ?? "abandoned: its faults were already reported");
    this.name = "LoadFault";
    this.record = record;
  }
}

/** Thrown when the record cap is exceeded; unwinds the whole load. */
class LoadCapReached extends Error {
  constructor() {
    super(`more than ${MAX_LOAD_RECORDS} load faults`);
    this.name = "LoadCapReached";
  }
}

/** End the current unit with this fault. */
function fault(f: Fault): never {
  throw new LoadFault(toRecord(f));
}

/** Where a load's records go. `count` is what THIS sink has taken. */
interface Sink {
  report(f: Fault): void;
  readonly count: number;
}

/** The records of one whole load, capped. */
class LoadRecords implements Sink {
  readonly records: Diagnostic[] = [];
  get count(): number {
    return this.records.length;
  }
  report(f: Fault): void {
    if (this.records.length >= MAX_LOAD_RECORDS) throw new LoadCapReached();
    this.records.push(toRecord(f));
  }
}

/**
 * A sink that restates each fault one level out before passing it on —
 * how a subgraph body's faults reach the outer load with the wrapper's
 * breadcrumb and pointer — and counts what came through it.
 */
function nestedSink(parent: Sink, restate: (f: Fault) => Fault): Sink {
  let count = 0;
  return {
    get count() {
      return count;
    },
    report(f: Fault) {
      parent.report(restate(f));
      count++;
    },
  };
}

/**
 * Run one unit. A {@link LoadFault} ends only that unit: its record goes
 * to `sink` and the load moves on to the next unit. Anything else — a
 * library bug, the cap — is not a load fault and propagates.
 * Returns whether the unit completed.
 */
function unit(sink: Sink, body: () => void): boolean {
  try {
    body();
    return true;
  } catch (err) {
    if (!(err instanceof LoadFault)) throw err;
    if (err.record !== undefined) sink.report(err.record);
    return false;
  }
}

/** The message of any thrown value. */
function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** `didYouMean` and `fix` for a record, from a suggestion. */
function suggestionFields(
  near: NameSuggestion,
  fix: (to: string) => string,
): Pick<Fault, "didYouMean" | "fix"> {
  return {
    ...(near.names.length > 0 ? { didYouMean: near.names } : {}),
    ...(near.only !== undefined ? { fix: fix(near.only) } : {}),
  };
}

/** The refusal of one key outside `valid`, as a record. */
function unknownKeyFault(
  key: string,
  valid: readonly string[],
  where: string,
  note: string,
  path: string,
): Fault {
  const near = suggestNames(key, valid);
  return {
    code: "unknown-key",
    message: `${where}: unknown key ${JSON.stringify(key)}; ${near.clause}valid keys: ${valid.join(", ")}${note}`,
    path,
    key,
    valid: [...valid],
    ...suggestionFields(near, (to) => `rename "${key}" to "${to}"`),
  };
}

/**
 * Report every key outside `valid`, naming the offender and listing them.
 * Reported, not thrown: an extra key does not stop the object it sits on
 * from being read, so the rest of that object is still checked.
 *
 * `refused` names keys that are not merely unrecognized but deliberately
 * not authorable, and says why — a near-miss an author would otherwise
 * repeat.
 */
function checkKeys(
  sink: Sink,
  obj: Record<string, unknown>,
  valid: readonly string[],
  where: string,
  note: string,
  locate: Locate,
  refused: Readonly<Record<string, string>> = {},
): void {
  for (const key of Object.keys(obj)) {
    if (valid.includes(key)) continue;
    const path = locate(`/${pointerToken(key)}`);
    const reason = Object.prototype.hasOwnProperty.call(refused, key) ? refused[key] : undefined;
    if (reason !== undefined) {
      sink.report({
        code: "unauthorable-key",
        message: `${where}: key ${JSON.stringify(key)} cannot be authored — it is ${reason}. Valid keys: ${valid.join(", ")}`,
        path,
        key,
        valid: [...valid],
      });
      continue;
    }
    sink.report(unknownKeyFault(key, valid, where, note, path));
  }
}

/** Shared tail of both unknown-key messages: why there is no escape hatch. */
const NO_ANNOTATION_KEY =
  '. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph\'s "meta" block ({ title, description, tags })';

/**
 * Same statement for exposed-param declarations, which DO have a place for
 * prose — their own `description` — so pointing at the graph's `meta` block
 * would be the wrong instruction here.
 */
const EXPOSED_PARAM_NO_ANNOTATION_KEY =
  '. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. Prose about this param belongs in its "description"';

/**
 * Registry entry for the subgraph composite. Metadata-only: instances are
 * created by `subgraphNode(innerGraph, exposedInputs, exposedOutputs,
 * exposedParams)` (or by deserializing a graph containing one), and both
 * their pins and their params are per-instance, so this entry declares
 * neither and its def cannot be instantiated directly.
 */
standardNode<Record<string, never>>({
  type: "subgraph",
  category: "composite",
  // Metadata-only entries carry this for the same reason they carry a
  // description: the def here cannot cook, and the def that CAN is built
  // per instance by `subgraphNode`. A catalog reader has only this entry,
  // so the fact has to be on it — and `selfMetered.test.ts` pins the two
  // together so they cannot drift.
  selfMetered: true,
  description:
    "Composite node wrapping an inner graph as a single node. Pins and params are per-instance, derived from the exposed inner pins and the exposed inner params, so this registry entry declares none — create instances with subgraphNode(innerGraph, exposedInputs, exposedOutputs, exposedParams) and read an instance's real interface with describeSubgraphPins(def) and describeSubgraphParams(def). A serialized subgraph node carries its exposed-param VALUES in \"params\" and its inner graph plus the exposed pin and param DECLARATIONS either inline under \"subgraph\" ({ graph, inputs, outputs, params }), recursively in the same versioned format, or by reference under \"ref\" ({ name, hash? }) to a subgraph registered with registerSubgraph. \"subgraph\" and \"ref\" are mutually exclusive; a ref's \"hash\" is optional, and pins the reference to that exact content (a mismatch is an error, never a warning).",
  inputs: [],
  outputs: [],
  params: {},
  execute() {
    throw new Error(
      'the registered "subgraph" definition is metadata-only and cannot cook; create subgraph nodes with subgraphNode(innerGraph, exposedInputs, exposedOutputs), or deserialize a graph containing one',
    );
  },
});

/**
 * Registry entry for the for-each composite. Metadata-only for the same
 * reason as `subgraph` above, and carrying the same payload — a forEach IS
 * a subgraph plus a loop, and the loop is named by a reserved exposed-input
 * name inside that payload rather than by a field of its own.
 *
 * The entry exists at all because `deserializeGraph` checks `hasNodeType`
 * before it dispatches on the wrapper types, so an unregistered `forEach`
 * would be refused as an unknown type before it ever reached its reader.
 */
standardNode<Record<string, never>>({
  type: "forEach",
  category: "composite",
  // See the `subgraph` entry above.
  selfMetered: true,
  description:
    "Composite node that cooks an inner graph ONCE PER ELEMENT instead of once. Exactly one exposed input must be named \"each\" (one iteration per item of the collection on that pin) or \"eachPoint\" (one iteration per point of the one geometry on that pin, the body seeing a one-point cloud); every other exposed input is broadcast whole to every iteration. Each iteration's outputs are concatenated onto the matching output pin in the iterated collection's own order, and carry the iterated item's tags. Every iteration is seeded on its element's CONTENT — position bits, the seed attribute and the tags — never on its position in the collection, so reordering the input reorders the output without re-rolling any of it. Pins and params are per-instance exactly as for \"subgraph\", and the serialized form is the same payload: create instances with forEachNode(innerGraph, exposedInputs, exposedOutputs, exposedParams), or deserialize a graph containing one. The body gets no memo reuse between iterations, by construction — each rotates the inner seed, and a node holds one cache slot.",
  inputs: [],
  outputs: [],
  params: {},
  execute() {
    throw new Error(
      'the registered "forEach" definition is metadata-only and cannot cook; create forEach nodes with forEachNode(innerGraph, exposedInputs, exposedOutputs), or deserialize a graph containing one',
    );
  },
});

/**
 * Registry entry for the repeat-until composite. Metadata-only for the same
 * reason as the two above, and carrying the same payload — a repeatUntil IS
 * a subgraph plus a feedback loop, and the loop is named by a reserved
 * exposed-pin name inside that payload rather than by a field of its own.
 *
 * Unlike the other two it DOES declare params here, because these two are
 * not the body's: `maxRounds` and `settleAttr` belong to the loop itself,
 * exist on every instance regardless of what the body exposes, and are the
 * two knobs an agent reading the catalog has to know about to drive one.
 * They round-trip through the node's own `params` object beside the exposed
 * ones; see {@link REPEAT_UNTIL_PARAM_SCHEMAS}, which is the single
 * definition both the factory and this entry read.
 */
standardNode<RepeatUntilParams>({
  type: "repeatUntil",
  category: "composite",
  // See the `subgraph` entry above.
  selfMetered: true,
  description:
    'Composite node that cooks an inner graph REPEATEDLY, feeding each round\'s output back into its own input until the body stops changing anything — a bounded fixed point, in a graph where a cycle cannot be wired. Exactly one exposed input AND exactly one exposed output must be named "carry": round 1 gets the outer "carry" input, round k+1 gets round k\'s "carry" output, and every other exposed input is broadcast whole to every round. This is the loop that relaxation needs and that "forEach" cannot express, because the number of rounds is not known before the first one runs: push overlapping props apart and a new pair now overlaps; snap a dangling edge and the snap creates another dangler. TERMINATION is a scalar the body publishes on the DETAIL domain of the carried geometry, named by "settleAttr" — attributeReduce is what normally writes it. All zero means settled: the loop stops and that round counts. Absent is REFUSED by name rather than read as zero, because reading it as zero turns a typo into "converged on round one". Two synthetic outputs the body never declared report what happened: "rounds" (how many cooks) and "converged" (did the settle signal reach zero, or did it hit maxRounds), both value items. THE SEED IS NOT ROTATED PER ROUND, and that is the design: a fixed point exists only if the body is the SAME function every round, so a body whose seed varies with the round number is a different function each time and has no fixed point to converge to — it re-rolls whatever the last round settled, runs the full budget every time, and reports converged false forever, with no error to say why. Pass a constant seed and let the DATA change between rounds. The payoff is the mirror of forEach\'s cost: a constant inner seed means inner nodes whose inputs did not change between rounds serve their caches, so a broadcast branch is computed once for the whole loop. Pins are per-instance exactly as for "subgraph" and the serialized form is the same payload plus this node\'s own two params: create instances with repeatUntilNode(innerGraph, exposedInputs, exposedOutputs, exposedParams), or deserialize a graph containing one.',
  inputs: [],
  outputs: [],
  params: {
    maxRounds: REPEAT_UNTIL_PARAM_SCHEMAS.maxRounds,
    settleAttr: REPEAT_UNTIL_PARAM_SCHEMAS.settleAttr,
  },
  execute() {
    throw new Error(
      'the registered "repeatUntil" definition is metadata-only and cannot cook; create repeatUntil nodes with repeatUntilNode(innerGraph, exposedInputs, exposedOutputs), or deserialize a graph containing one',
    );
  },
});

/**
 * The factory that builds each wrapper kind, for the writer's refusal when
 * a def of a wrapper type carries no recorded spec. A map rather than a
 * chain of ternaries so a fourth wrapper is a compile error here (the
 * record is total over {@link WrapperKind}) instead of silently being
 * described as a subgraph.
 */
const WRAPPER_FACTORIES: Readonly<Record<WrapperKind, string>> = {
  subgraph: "subgraphNode(...)",
  forEach: "forEachNode(...)",
  repeatUntil: "repeatUntilNode(...)",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate and copy the optional `meta` block. Absent is fine; present
 * and malformed is a hard error naming the offending key and listing the
 * valid ones — a near-miss like "titel" must not cook silently.
 *
 * The rules live in `validateGraphMeta`, shared with `Graph.setMeta`, so
 * the writer cannot accept what the reader refuses. Only the error TYPE
 * is translated here, because everything deserialization rejects raises
 * `GraphSerializationError`.
 */
function readGraphMeta(v: unknown, where: string): GraphMeta | undefined {
  if (v === undefined) return undefined;
  try {
    return validateGraphMeta(v, where);
  } catch (err) {
    fault({ code: "invalid-meta", message: errText(err), path: "/meta" });
  }
}

/**
 * Refuse an inline `param` VALUE for a name the graph declares.
 *
 * Under the existing precedence — binding > spliced field > inline value —
 * the graph-scoped value would arrive as a binding and silently win, and
 * the author would be looking at a number in the spec that nothing uses.
 * That precedence is right for the case it was written for and stays: a
 * SUBGRAPH binding a BODY is two documents, where the body must also stand
 * alone and its inline value is its standalone answer. A graph-scoped param
 * is the same document as the expression that reads it, so there is no
 * second reader to keep working and no reason to prefer one number over the
 * other — only a choice about which one is dead.
 *
 * A value-free reference is untouched: that is the ordinary way to read a
 * declared name.
 */
function checkNoShadowedGraphParam(
  spec: FieldSpec,
  declared: ReadonlySet<string>,
  where: string,
  at: Pick<Fault, "path" | "nodeId" | "param">,
): void {
  if (declared.size === 0) return;
  for (const name of Object.keys(inlineParamValuesOf(spec))) {
    if (!declared.has(name)) continue;
    fault({
      code: "shadowed-graph-param",
      message: `${where}: {"fn": "param", "name": ${JSON.stringify(name)}} carries its own "value", but the graph declares "${name}" in its top-level "params" — the graph's value would win and the inline one would be a number nothing reads. Drop the inline "value" to read the graph's, or rename one of the two`,
      ...at,
    });
  }
}

/** A graph param that read cleanly, with its index in the document's `params`. */
interface ReadGraphParam {
  readonly param: GraphParam;
  readonly index: number;
}

/**
 * Read the optional top-level `params` block into the graph's declared
 * params, refusing what a reader could otherwise misunderstand. Each
 * declaration is its own unit: one that is refused is left out, and the
 * rest are still read.
 *
 * Nested payloads are refused outright. A body's names are bound by its
 * WRAPPER's exposed params, and two binders that can disagree is the
 * failure `checkDerivedReaders` refuses one level up; the harder reason is
 * that `hashableGraph` covers a payload verbatim, so admitting a key there
 * would move every pinned `ref` hash in the corpus.
 */
function readGraphParams(v: unknown, nested: boolean, sink: Sink): ReadGraphParam[] {
  if (v === undefined) return [];
  if (nested) {
    sink.report({
      code: "invalid-graph-param",
      message: `a subgraph payload's graph cannot declare "params": a body's names are bound by its wrapper's exposed params, which is the one binder a body has. Declare it under the payload's "params" (an exposed param with no targets reads a name the body's expressions use), or hoist the value to the OUTER graph's "params" and pass it in through the wrapper's own param slot`,
      path: "/params",
    });
    return [];
  }
  if (!Array.isArray(v)) {
    sink.report({
      code: "invalid-section",
      message: `"params" must be an array of { name, value, min?, max?, description? }, got ${JSON.stringify(v)}. It is an array rather than an object so a repeated name is detectable: JSON.parse collapses duplicate object keys before any reader sees them`,
      path: "/params",
    });
    return [];
  }
  const seen = new Set<string>();
  const out: ReadGraphParam[] = [];
  v.forEach((raw: unknown, i: number) => {
    const at = under(`/params/${i}`);
    unit(sink, () => {
      if (!isPlainObject(raw)) {
        fault({
          code: "invalid-graph-param",
          message: `params[${i}]: expected an object { name, value, ... }, got ${JSON.stringify(raw)}`,
          path: at(""),
        });
      }
      checkKeys(sink, raw, GRAPH_PARAM_KEYS, `params[${i}]`, NO_ANNOTATION_KEY, at);
      const name = raw.name;
      if (typeof name !== "string" || name === "") {
        fault({
          code: "invalid-graph-param",
          message: `params[${i}]: "name" must be a non-empty string, got ${JSON.stringify(name)}`,
          path: keyPath(raw, "name", at),
          got: name,
        });
      }
      if (seen.has(name)) {
        fault({
          code: "duplicate-graph-param",
          message: `params[${i}]: duplicate graph param "${name}"; declare each name once (a second declaration cannot be a redefinition, because a reference names one value)`,
          path: at("/name"),
          got: name,
        });
      }
      seen.add(name);
      for (const key of ["min", "max"] as const) {
        const bound = raw[key];
        if (bound !== undefined && (typeof bound !== "number" || !Number.isFinite(bound))) {
          fault({
            code: "invalid-graph-param",
            message: `params[${i}] ("${name}"): "${key}" must be a finite number, got ${JSON.stringify(bound)}`,
            path: at(`/${key}`),
            got: bound,
            expected: "a finite number",
          });
        }
      }
      if (raw.description !== undefined && typeof raw.description !== "string") {
        fault({
          code: "invalid-graph-param",
          message: `params[${i}] ("${name}"): "description" must be a string, got ${JSON.stringify(raw.description)}`,
          path: at("/description"),
          got: raw.description,
          expected: "a string",
        });
      }
      const targets = readGraphParamTargets(raw.targets, `params[${i}] ("${name}")`, raw, at, sink);
      const param: GraphParam = {
        name,
        value: raw.value as ParamValue,
        ...(targets !== undefined ? { targets } : {}),
        ...(raw.min !== undefined ? { min: raw.min as number } : {}),
        ...(raw.max !== undefined ? { max: raw.max as number } : {}),
        ...(raw.description !== undefined ? { description: raw.description as string } : {}),
      };
      // A TARGETED param's value is judged later, against the schema its
      // targets merge into — which cannot be read until the nodes exist. This
      // pass checks only what is knowable now: the name, and (for a targetless
      // param) the numeric shape.
      const error = graphParamError(param, `params[${i}]`);
      if (error !== undefined) fault({ code: "invalid-graph-param", message: error, path: at("") });
      out.push({ param, index: i });
    });
  });
  return out;
}

/** Value equality for a param: numbers, strings, bools, and flat lists. */
function sameParamValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
    );
  }
  return a === b;
}

/**
 * Resolve every targeted graph param against the nodes it drives, WRITE its
 * value into them, and hand back the params carrying their merged schemas.
 *
 * EXPORTED because `deserializeGraph` is not the only thing that builds a
 * graph from a `SerializedGraph`: the editor rebuilds its own mirror node
 * by node, and skipping this step left every driven slot holding whatever
 * the file said instead of what its declaration says. That is the second
 * time a hand-rolled rebuild has missed a step this function performs, so
 * the function is the thing both call rather than a shape both imitate.
 * `authored` may be empty — it only decides whether a DISAGREEING literal
 * is refused, and a caller that cannot tell an authored value from a
 * default should not be raising that error.
 *
 * The resolver is `resolveExposedParam`, unchanged and deliberately: a
 * subgraph's exposed param answers the same question — "one name, several
 * inner param slots, what may it hold?" — and its merge rules are the
 * soundness argument, not a convenience. Types and enum sets must agree
 * across targets, `acceptsField` and `acceptsInfinite` are ANDed, bounds
 * intersect, and an author may only narrow them. A declaration therefore
 * cannot claim a capability the params it drives do not have, which is the
 * whole reason this reaches `i32` and `enum` safely.
 *
 * WRITING is where this differs from the subgraph form, and the difference
 * is that there is nothing to restore. `withExposedParams` writes into a
 * body at cook time and puts it back, because one body is shared between
 * wrapper instances and by `serializeGraph`. A top-level graph has exactly
 * one set of values and one owner, so the write is permanent and the node
 * simply holds what the declaration says.
 *
 * The consequence worth stating: a node param that a graph param drives is
 * NOT independently editable — the declaration wins on every load, the same
 * way a wrapper's value wins over what its body happens to hold.
 */
export function applyGraphParamTargets(
  graph: Graph,
  params: readonly GraphParam[],
  authored: ReadonlyMap<string, ReadonlySet<string>>,
): GraphParam[] {
  // Standalone, the first fault throws: a caller rebuilding a graph by hand
  // has no document to collect records against.
  const sink: Sink = {
    count: 0,
    report(f: Fault): never {
      const record = toRecord(f);
      throw new GraphSerializationError(record.message, [record]);
    },
  };
  return applyTargets(
    graph,
    params.map((param, index) => ({ param, index })),
    authored,
    sink,
    () => false,
    () => undefined,
  );
}

/**
 * {@link applyGraphParamTargets}, one declaration per unit: a declaration
 * that cannot be applied is left out of the result and the next is still
 * tried. A target naming a node `isSkipped` — one the load could not build,
 * or cannot tell apart, already reported — is left out without a word,
 * since every complaint about it would restate that fault; the declaration's
 * other targets are still resolved and applied. `nodeParamPath` locates an
 * authored node param in the document, for the one fault that is the
 * node's value rather than the declaration's.
 */
function applyTargets(
  graph: Graph,
  params: readonly ReadGraphParam[],
  authored: ReadonlyMap<string, ReadonlySet<string>>,
  sink: Sink,
  isSkipped: (node: string) => boolean,
  nodeParamPath: (node: string, param: string) => string | undefined,
): GraphParam[] {
  // Which declaration owns which slot. A slot with two owners has no
  // defined value — measured before this guard, two params targeting one
  // `countX` simply let the LAST one win, 90 points against 40, with
  // nothing said. `resolveExposedParam` has refused exactly this for
  // subgraph params since it shipped ("two exposed params binding the same
  // inner slot… is a hard error naming the params and the slot"), and the
  // two mechanisms must not disagree about a question they both answer.
  const owner = new Map<string, string>();
  const out: GraphParam[] = [];
  for (const { param, index } of params) {
    const at = under(`/params/${index}`);
    unit(sink, () => {
      const targets = param.targets;
      if (targets === undefined || targets.length === 0) {
        out.push(param);
        return;
      }
      // Original indices kept, so a record still points at the entry it is about.
      const kept = targets.map((t, j) => ({ t, j })).filter(({ t }) => !isSkipped(t.node));
      if (kept.length === 0) return;
      let resolved;
      try {
        resolved = resolveExposedParam(graph, {
          name: param.name,
          targets: kept.map(({ t }) => ({ node: { id: t.node }, param: t.param })),
          // `description` is optional on a graph param and REQUIRED by the
          // resolver, so the fallback says where the missing sentence goes —
          // the same answer `inlineParamSchema` gives for an undocumented
          // inline value, in the same voice.
          description:
            param.description ??
            `Graph param "${param.name}", driving ${targets.map((t) => `"${t.node}".${t.param}`).join(", ")}. The graph says nothing else about it — write "description" beside the value to say what turning it does.`,
          default: param.value,
          ...(param.min !== undefined ? { min: param.min } : {}),
          ...(param.max !== undefined ? { max: param.max } : {}),
        });
      } catch (err) {
        fault({
          code: "invalid-graph-param-target",
          message: `graph param "${param.name}": ${errText(err)}`,
          path: at("/targets"),
        });
      }
      const withSchema: GraphParam = { ...param, schema: resolved.schema };
      const bad = graphParamError(withSchema, "params");
      if (bad !== undefined) fault({ code: "invalid-graph-param", message: bad, path: at("") });
      kept.forEach(({ t, j }) => {
        // A target holding a FIELD is refused rather than overwritten.
        // Writing the value would leave the authored expression in the FILE
        // and dead in the COOK — measured: a `translate` of
        // `mul(position, 2)` under a declared 3 cooks a flat 3, while the
        // JSON still shows the expression. That is the hazard this session
        // keeps closing: a graph that does something its own text does not
        // say. Both readings are defensible, so neither is chosen silently.
        const slot = `"${t.node}".${t.param}`;
        const targetPath = at(`/targets/${j}`);
        const claimed = owner.get(slot);
        if (claimed !== undefined) {
          fault({
            code: "duplicate-param-target",
            message:
              claimed === param.name
                ? `graph param "${param.name}" lists ${slot} twice; name each slot once — writing it twice cannot mean anything a single write does not`
                : `graph params "${claimed}" and "${param.name}" both target ${slot}, so the slot has two declared values and takes whichever is applied last. Drive it from one of them, or split the slot into two params`,
            path: targetPath,
            nodeId: t.node,
            param: t.param,
          });
        }
        owner.set(slot, param.name);
        const held = graph.getParams({ id: t.node } as NodeHandle<Record<string, unknown>>)[t.param];
        if (isField(held)) {
          fault({
            code: "target-holds-field",
            message: `graph param "${param.name}" targets "${t.node}".${t.param}, which holds a FIELD EXPRESSION. Writing the declared value there would leave that expression in the file and dead in the cook, so it is refused rather than chosen for you: either drop the expression from that param (the declaration then drives it), or drop the target and have the expression READ the name instead — a `+"`param`"+` reference inside it binds to the same declared value.`,
            path: targetPath,
            nodeId: t.node,
            param: t.param,
          });
        }
        // A literal that DISAGREES with its driver is a hand edit that would
        // be silently discarded: the declaration wins on every load, so the
        // number in the file would sit there meaning nothing. Serialization
        // writes the driven value back, so a round-tripped graph always
        // agrees and never reaches this — only a file somebody edited does,
        // which is exactly when it is worth saying.
        const wasAuthored = authored.get(t.node)?.has(t.param) === true;
        if (wasAuthored && held !== undefined && !isField(held) && !sameParamValue(held, param.value)) {
          fault({
            code: "driven-param-conflict",
            message: `node "${t.node}" param "${t.param}" is ${JSON.stringify(held)}, but graph param "${param.name}" drives it to ${JSON.stringify(param.value)}. The declaration wins on every load, so the value written on the node would be discarded silently: change the declaration, or drop the target and let the node keep its own value`,
            path: nodeParamPath(t.node, t.param) ?? targetPath,
            nodeId: t.node,
            param: t.param,
          });
        }
        try {
          graph.setParam({ id: t.node } as NodeHandle<Record<string, unknown>>, t.param, param.value as never);
        } catch (err) {
          fault({
            code: "invalid-graph-param",
            message: `graph param "${param.name}" cannot write "${t.node}".${t.param}: ${errText(err)}`,
            path: at(""),
            nodeId: t.node,
            param: t.param,
          });
        }
      });
      out.push(withSchema);
    });
  }
  return out;
}

/** Read a graph param's optional `targets`, or undefined when it has none. */
function readGraphParamTargets(
  v: unknown,
  where: string,
  raw: Record<string, unknown>,
  at: Locate,
  sink: Sink,
): readonly { node: string; param: string }[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) {
    fault({
      code: "invalid-graph-param",
      message: `${where}: "targets" must be an array of { node, param }, got ${JSON.stringify(v)}`,
      path: keyPath(raw, "targets", at),
    });
  }
  const out: { node: string; param: string }[] = [];
  v.forEach((entry: unknown, i: number) => {
    const entryAt = child(at, `/targets/${i}`);
    if (!isPlainObject(entry)) {
      fault({
        code: "invalid-graph-param",
        message: `${where}: targets[${i}] must be an object { node, param }, got ${JSON.stringify(entry)}`,
        path: entryAt(""),
      });
    }
    checkKeys(sink, entry, EXPOSED_PARAM_TARGET_KEYS, `${where} targets[${i}]`, NO_ANNOTATION_KEY, entryAt);
    const node = entry.node;
    const param = entry.param;
    if (typeof node !== "string" || node === "") {
      fault({
        code: "invalid-graph-param",
        message: `${where}: targets[${i}].node must be a non-empty string, got ${JSON.stringify(node)}`,
        path: keyPath(entry, "node", entryAt),
        got: node,
      });
    }
    if (typeof param !== "string" || param === "") {
      fault({
        code: "invalid-graph-param",
        message: `${where}: targets[${i}].param must be a non-empty string, got ${JSON.stringify(param)}`,
        path: keyPath(entry, "param", entryAt),
        got: param,
      });
    }
    out.push({ node, param });
  });
  // An empty list means the same as no list — the expressions are the only
  // readers — and is admitted rather than refused, because the exposed-param
  // form it borrows from admits it and says so.
  return out.length === 0 ? undefined : out;
}

/**
 * Validate a plain (non-field) param value against its schema, for the
 * WRITER. `where` names the node and param for error messages. The rules
 * themselves live in the graph layer beside {@link ParamSchema}, so the
 * exposed-param resolver applies exactly the same ones.
 */
function checkParamValue(schema: ParamSchema, value: unknown, where: string): void {
  const bad = paramValueError(schema, value);
  if (bad !== undefined) fail(`${where}: ${bad}`, "invalid-param-value");
}

/**
 * The READER's refusal of a plain param value, or undefined when it fits.
 * An enum value gets the nearest allowed values before the list — `did you
 * mean "probabilistic"? expected one of …` — so the suggestion is read
 * before the enumeration it was drawn from.
 */
function paramValueFault(
  schema: ParamSchema,
  value: unknown,
  where: string,
  at: Pick<Fault, "path" | "nodeId" | "param">,
): Fault | undefined {
  const bad = paramValueError(schema, value);
  if (bad === undefined) return undefined;
  if (schema.type === "enum" && typeof value === "string" && schema.enum !== undefined) {
    const near = suggestNames(value, schema.enum);
    return {
      code: "invalid-param-value",
      message: `${where}: ${near.clause}${bad}`,
      ...at,
      got: value,
      valid: [...schema.enum],
      ...suggestionFields(near, (to) => `replace "${value}" with "${to}"`),
    };
  }
  return { code: "invalid-param-value", message: `${where}: ${bad}`, ...at, got: value };
}

/**
 * One param value in its serialized form: item lists become `[]`, Fields
 * become FieldSpecs (and are rejected on a param that is not
 * field-capable), a field-capable vec param's scalar broadcast is
 * canonicalized to the vec arity, and everything else is validated
 * against the schema and copied. Shared by standard nodes and by subgraph
 * nodes' exposed params so the two cannot diverge.
 */
function serializeParamValue(
  schema: ParamSchema,
  key: string,
  value: unknown,
  where: string,
): unknown {
  if (schema.type === "items") {
    if (!Array.isArray(value)) {
      fail(
        `${where}: expected an array of DataItems, got ${JSON.stringify(value)}; bind items with graph.setParam(node, "${key}", [...])`,
      );
    }
    // Contract: live DataItems are runtime-injected (e.g. bound per cell
    // by the World at bind time) and are not part of the serialized form
    // — the serialized graph carries an empty list.
    return [];
  }
  if (isField(value)) {
    if (schema.acceptsField !== true) {
      fail(`${where}: holds a Field but the param is not field-capable`);
    }
    let spec: unknown;
    try {
      spec = fieldToJson(value);
    } catch (err) {
      fail(`${where}: ${err instanceof Error ? err.message : String(err)}`);
    }
    // Through the SAME guard the plain path takes. This branch used to
    // return straight from `fieldToJson`, so every number inside a field
    // spec skipped the -0 check — `{fn:"constant",value:-0}` saved as
    // `0` and cooked different bytes on reload, which is the one thing
    // that check exists to prevent. A field is a param like any other and
    // the numbers inside it are param numbers.
    refuseNegativeZero(spec, where);
    return spec;
  }
  // Field-capable vec params accept a runtime-legal scalar (tuple-1
  // broadcast); canonicalize it to the vec arity so the serialized form
  // always matches the schema. Broadcast semantics make the cooked output
  // identical.
  let plain = value;
  if (
    (schema.type === "vec3" || schema.type === "vec4") &&
    schema.acceptsField === true &&
    typeof plain === "number" &&
    Number.isFinite(plain)
  ) {
    plain = new Array<number>(schema.type === "vec3" ? 3 : 4).fill(plain);
  }
  checkParamValue(schema, plain, where);
  refuseNegativeZero(plain, where);
  return Array.isArray(plain) ? [...(plain as unknown[])] : plain;
}

/**
 * Refuse -0 in a serialized param, because JSON cannot carry it:
 * `JSON.stringify(-0)` is `"0"`, so a graph saved with one loads with the
 * sign gone and cooks different bytes from the graph that was saved.
 *
 * This is the same stance `constant()` already takes when it withholds a
 * spec for -0 — a form that cannot be parsed back must never be produced —
 * moved to the one place every param value passes through. It matters most
 * for a param an expression READS by name (`{"fn":"param"}`), where the
 * sign reaches `Field.key` and therefore the memo: in memory -0 is exact,
 * and on the GPU it is strictly better than a baked literal, which a WGSL
 * front end may flush to +0. None of that survives a save, so the save is
 * what gets refused rather than the value.
 */
function refuseNegativeZero(value: unknown, where: string): void {
  const negZero = (n: unknown): boolean => typeof n === "number" && Object.is(n, -0);
  // Walks the whole value, because a param may BE a field spec: a tree of
  // objects whose `value`, `args` and `opts` hold the numbers. Checking
  // only the top level and one array deep — which is all this did — let
  // `{fn:"constant",value:-0}` through, and then the inline `value` on a
  // `param` node gave it a second way in. Both reload as +0 and cook
  // different bytes, which is exactly what this function exists to stop,
  // so it has to go as deep as the numbers do.
  const find = (v: unknown, path: string): string | undefined => {
    if (negZero(v)) return path;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const hit = find(v[i], `${path}[${i}]`);
        if (hit !== undefined) return hit;
      }
      return undefined;
    }
    if (typeof v === "object" && v !== null) {
      for (const [k, child] of Object.entries(v)) {
        const hit = find(child, `${path}.${k}`);
        if (hit !== undefined) return hit;
      }
    }
    return undefined;
  };
  const at = find(value, "");
  if (at === undefined) return;
  fail(
    `${where}${at}: holds -0, which JSON cannot represent — it would reload as 0 and cook different bytes. ` +
      `Use 0 if the sign does not matter, or keep the graph in memory if it does`,
  );
}

/**
 * Serialize a graph to the versioned JSON format. Every node's type must
 * be registered (via standardNode) and its params must match the
 * registered schemas; field-valued params must originate from
 * fieldFromJson so they carry a serializable spec.
 *
 * Subgraph nodes (created by `subgraphNode`) serialize recursively: their
 * inner graph becomes a nested payload in the same format, excluding the
 * plumbing the wrapper injected (portal nodes, `__out_*` outputs).
 * Subgraph nesting must be acyclic — an inner graph reaching a graph
 * already being serialized is an error naming the offending node.
 *
 * Item-list params (`items` schema type) hold live, runtime-injected
 * DataItems; the serialized form always carries an empty list.
 */
export function serializeGraph(graph: Graph): SerializedGraph {
  return serializeGraphRec(graph, new Set());
}

/**
 * Serialize one subgraph node: as a `ref` when its def was materialized
 * from one, as an embedded payload otherwise. `seen` holds the graphs on
 * the current path.
 *
 * The embedded payload is built either way. It is what the node's own
 * `params` are validated against, and comparing it with the registered
 * recipe is what keeps a reference honest: an edit made through
 * `getSubgraphSpec(def).graph` would otherwise vanish the moment the graph
 * was saved, since writing `ref` back out writes the REGISTRY's content,
 * not the edited graph's.
 */
function serializeSubgraphNode(
  id: string,
  nodeParams: Record<string, unknown>,
  spec: SubgraphSpec,
  seen: Set<Graph>,
  def: object,
): SerializedNode {
  const embedded = buildEmbeddedSubgraphNode(id, nodeParams, spec, seen);
  const ref = subgraphRefOf(def);
  if (ref === undefined) return embedded;
  const registered = _registeredSubgraphKey(ref.name);
  if (registered === undefined) {
    fail(
      `cannot serialize node "${id}": it was loaded from the registered subgraph "${ref.name}", which is no longer registered; register it again before serializing, or rebuild the node from an embedded "subgraph" payload`,
    );
  }
  // `embedded.subgraph` is always present: buildEmbeddedSubgraphNode sets it.
  if (_subgraphKey(embedded.subgraph as SerializedSubgraph) !== registered) {
    fail(
      `cannot serialize node "${id}": it references the registered subgraph "${ref.name}", but its inner graph no longer matches the registered recipe — writing the reference back out would silently discard the edit. Edit a referenced primitive by registering it under a new name, or drop the reference by rebuilding the node from an embedded "subgraph" payload`,
    );
  }
  return { id, type: spec.wrapper, params: embedded.params, ref };
}

/** Serialize one subgraph node as its nested payload; `seen` holds the graphs on the current path. */
function buildEmbeddedSubgraphNode(
  id: string,
  nodeParams: Record<string, unknown>,
  spec: SubgraphSpec,
  seen: Set<Graph>,
): SerializedNode {
  if (seen.has(spec.graph)) {
    fail(
      `cannot serialize node "${id}": its inner graph reaches a graph that is already being serialized (a subgraph cycle); subgraph nesting must be acyclic — wrap an independent graph instead`,
    );
  }
  let inner: SerializedGraph;
  try {
    inner = serializeGraphRec(spec.graph, seen);
  } catch (err) {
    if (err instanceof GraphSerializationError) {
      fail(`node "${id}" inner graph: ${err.message}`, err.diagnostics[0]?.code);
    }
    throw err;
  }
  // Canonical-seed invariant: cooking overwrites the inner graph's live
  // seed (derived from the outer node seed on every cook), so the live
  // value is transient. The nested payload always carries the wrap-time
  // seed recorded in the spec — serializing before and after a cook emits
  // identical JSON, and deserialization seeds the rebuilt inner graph from
  // the payload and re-wraps, recording the same canonical value again.
  inner = { ...inner, seed: spec.seed };
  const pin = (e: ExposedPin): SerializedExposedPin => ({
    name: e.name,
    node: e.node.id,
    pin: e.pin,
  });
  // Exposed params split the way native ones do: VALUES on the node,
  // DECLARATIONS in the payload. A value set on a param this node does
  // not expose is an error, not a silent drop — the reader rejects the
  // same data, and a writer that quietly discards what the reader refuses
  // is how a tuned graph loses its tuning between save and load.
  const declared = new Map<string, ParamSchema>(spec.params.map((p) => [p.name, p.schema]));
  // A `repeatUntil` also carries two params of its OWN — the loop's, not
  // the body's — so they sit in the same `params` object beside the exposed
  // ones and round-trip through the same code path. Read from the single
  // schema definition the factory uses, so a saved graph can never load
  // under a different bound than it was authored with.
  if (spec.wrapper === "repeatUntil") {
    for (const [name, schema] of Object.entries(REPEAT_UNTIL_PARAM_SCHEMAS)) {
      declared.set(name, schema);
    }
  }
  for (const key of Object.keys(nodeParams)) {
    if (!declared.has(key)) {
      fail(
        `cannot serialize node "${id}": param "${key}" is not an exposed param of this subgraph node; exposed params: ${[...declared.keys()].join(", ") || "(none)"}`,
      );
    }
  }
  const params: Record<string, unknown> = {};
  for (const [name, schema] of declared) {
    params[name] = serializeParamValue(
      schema,
      name,
      nodeParams[name],
      `node "${id}" param "${name}"`,
    );
  }
  return {
    id,
    // From the spec, never a literal. Both wrappers record a spec and the
    // caller dispatches on the spec's PRESENCE, so a hardcoded "subgraph"
    // here would write a forEach out as a plain subgraph: it would
    // round-trip, validate, and cook one pass over the concatenated
    // collection instead of one pass per item. A wrong answer that saves
    // cleanly is the worst shape a bug can take.
    type: spec.wrapper,
    params,
    subgraph: {
      graph: inner,
      inputs: spec.inputs.map(pin),
      outputs: spec.outputs.map(pin),
      // Omitted entirely when the node exposes no params, so every graph
      // written before exposed params existed serializes byte-identically.
      ...(spec.params.length > 0
        ? {
            params: spec.params.map((p) => {
              const decl = serializeExposedParam(id, p);
              checkExposedParamDeclaration(id, spec.graph, p, decl);
              return decl;
            }),
          }
        : {}),
    },
  };
}

/**
 * One exposed-param declaration, authored part only. Bounds come from the
 * merged schema rather than from a separately remembered "what the author
 * narrowed": merging intersects, so re-intersecting an already-merged
 * bound on load is a no-op and the round trip is a fixed point.
 */
function serializeExposedParam(id: string, exposed: ExposedParam): SerializedExposedParam {
  const schema = exposed.schema;
  return {
    name: exposed.name,
    targets: exposed.targets.map((t) => ({ node: t.node.id, param: t.param })),
    description: schema.description,
    default: serializeParamValue(
      schema,
      exposed.name,
      schema.default,
      `node "${id}" exposed param "${exposed.name}" default`,
    ),
    ...(schema.min !== undefined ? { min: schema.min } : {}),
    ...(schema.max !== undefined ? { max: schema.max } : {}),
  };
}

/** `"nodeId".param`, the way the declaration errors name an inner slot. */
function slotLabel(target: { readonly node: { readonly id: string }; readonly param: string }): string {
  return `"${target.node.id}".${target.param}`;
}

function sameEnumList(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Re-derive the declaration about to be written and check the def's own
 * schema against it. `subgraphNode`'s fourth argument takes an ALREADY
 * RESOLVED schema, and the graph layer cannot audit its per-target claims
 * — param schemas live in this layer's registry, which the graph layer may
 * not import — so a hand-written declaration can assert a type, a bound or
 * a field capability the inner targets do not have.
 *
 * `deserializeGraph` re-derives every declaration through
 * `resolveExposedParam` and refuses such a payload, so without this check
 * the writer emits what the reader rejects: a graph that saves fine and
 * cannot be reopened, which is the worst outcome available. This is the
 * same writer/reader symmetry already applied to the graph `meta` block
 * and to values set on params the node does not expose.
 */
function checkExposedParamDeclaration(
  id: string,
  inner: Graph,
  exposed: ExposedParam,
  decl: SerializedExposedParam,
): void {
  const where = `cannot serialize node "${id}": exposed param "${exposed.name}"`;
  const door =
    'build exposed params with resolveExposedParam(innerGraph, { name, targets, description }), which derives the schema from the registry instead of asserting it';
  let resolved: ExposedParam;
  try {
    resolved = resolveExposedParam(inner, {
      name: decl.name,
      targets: decl.targets.map((t) => ({ node: { id: t.node }, param: t.param })),
      description: decl.description,
      default: decl.default as ParamValue,
      ...(decl.min !== undefined ? { min: decl.min } : {}),
      ...(decl.max !== undefined ? { max: decl.max } : {}),
    });
  } catch (err) {
    // resolveExposedParam already prefixes `exposed param "x": `.
    fail(
      `cannot serialize node "${id}": ${err instanceof Error ? err.message : String(err)}; ${door}`,
    );
  }
  const held = exposed.schema;
  const want = resolved.schema;
  // "(none)" when the param has no targets: its schema is then derived
  // from the default's shape, and saying so is what makes a type
  // disagreement readable ("its targets ((none)) are f32").
  const targets = exposed.targets.map(slotLabel).join(", ") || "(none)";
  if (held.type !== want.type) {
    fail(
      exposed.targets.length === 0
        ? `${where} declares type "${held.type}", but it has no targets, so its type is derived from the shape of its default and comes out ${want.type}; ${door}`
        : `${where} declares type "${held.type}", but its targets (${targets}) are ${want.type}; ${door}`,
    );
  }
  if (!sameEnumList(held.enum, want.enum)) {
    fail(
      `${where} declares enum values ${(held.enum ?? []).join(", ") || "(none)"}, but its targets (${targets}) allow ${(want.enum ?? []).join(", ") || "(none)"}; ${door}`,
    );
  }
  if ((held.acceptsField === true) !== (want.acceptsField === true)) {
    fail(
      exposed.targets.length === 0
        ? // No targets means the value's only route into the body is
          // substitution into a field expression — which takes a Field as
          // readily as a number, splicing it in where the reference
          // stands. So a targetless param is ALWAYS field-capable and the
          // only way to fail here is to record less than that.
          `${where} is recorded as taking plain values only, but it has no targets: its value reaches the body by substitution into a field expression, where a Field is spliced in exactly as a number would be, so reloading this graph would derive a field-capable param and the saved node and the loaded one would not behave alike — ${door}`
        : held.acceptsField === true
          ? `${where} claims to be field-capable, but not every target is: field-capable targets are ${resolved.targets.filter((t) => t.acceptsField === true).map(slotLabel).join(", ") || "(none)"}; a Field set on it would reach a target that takes plain values only — ${door}`
          : `${where} is recorded as taking plain values only, but every one of its targets (${targets}) accepts a Field; reloading this graph would derive a field-capable param, so the saved node and the loaded one would not behave alike — ${door}`,
    );
  }
  for (const bound of ["min", "max"] as const) {
    if (held[bound] !== want[bound]) {
      fail(
        `${where} ${held[bound] === undefined ? `omits a ${bound} bound its targets declare (${want[bound]})` : `declares ${bound} ${held[bound]}, but its targets merge to ${want[bound] ?? "no bound"}`}; an exposed bound may only NARROW its targets' own — ${door}`,
      );
    }
  }
  for (let i = 0; i < exposed.targets.length; i++) {
    const target = exposed.targets[i];
    const derived = resolved.targets[i];
    if ((target.acceptsField === true) !== (derived.acceptsField === true)) {
      fail(
        `${where} records target ${slotLabel(target)} as ${target.acceptsField === true ? "field-capable" : "taking plain values only"}, but its registered schema says otherwise; the cook-time Field check reads this flag, so a wrong one lets a Field reach a param that cannot resolve it — ${door}`,
      );
    }
  }
}

function serializeGraphRec(graph: Graph, seen: Set<Graph>): SerializedGraph {
  seen.add(graph);
  try {
    const plumbing = getSubgraphPlumbing(graph);
    const isPortal = (id: string): boolean => plumbing?.portalIds.has(id) === true;
    const nodes: SerializedNode[] = [];
    for (const state of graph._nodes.values()) {
      if (isPortal(state.id)) continue;
      const spec = getSubgraphSpec(state.def);
      if (spec !== undefined) {
        nodes.push(serializeSubgraphNode(state.id, state.params, spec, seen, state.def));
        continue;
      }
      const type = state.def.type;
      if (type === "subgraph" || type === "forEach" || type === "repeatUntil") {
        fail(
          `cannot serialize node "${state.id}": its definition was not created by ${
            WRAPPER_FACTORIES[type]
          }; build ${type} nodes with that factory (or deserializeGraph) so their inner graph can be serialized`,
        );
      }
      if (!hasNodeType(type)) {
        fail(
          `cannot serialize node "${state.id}": type "${type}" is not registered; only node types registered via standardNode can be serialized`,
        );
      }
      const reg = getNodeType(type);
      if (reg.def !== state.def) {
        fail(
          `cannot serialize node "${state.id}": its definition is not the registered definition for type "${type}"; build graphs from the registered node defs`,
        );
      }
      const schemas = reg.info.params;
      for (const key of Object.keys(state.params)) {
        if (!(key in schemas)) {
          fail(
            `cannot serialize node "${state.id}": param "${key}" is not in the schema of type "${type}"; valid params: ${Object.keys(schemas).join(", ")}`,
          );
        }
      }
      const params: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(schemas)) {
        params[key] = serializeParamValue(
          schema,
          key,
          state.params[key],
          `node "${state.id}" param "${key}"`,
        );
      }
      nodes.push({ id: state.id, type, params });
    }
    return {
      formatVersion: FORMAT_VERSION,
      seed: graph.seed,
      // Optional: omitted entirely when the graph declares no metadata, so
      // a graph that never used it serializes byte-identically to before.
      // `setMeta` already validated and froze it, so it is emitted as held.
      ...(graph.meta !== undefined ? { meta: graph.meta } : {}),
      // Same rule, same reason: a graph declaring none writes no key. The
      // values were validated by `setGraphParams` and are emitted as held,
      // with the optional keys omitted rather than written as undefined.
      ...(graph.graphParams.length > 0
        ? {
            params: graph.graphParams.map((p) => ({
              name: p.name,
              value: Array.isArray(p.value) ? [...p.value] : p.value,
              // The declaration, not the resolved schema: the schema is
              // DERIVED from these targets on every load, so writing it out
              // would be a second copy of a truth the registry already owns
              // — the same reason a subgraph payload omits an exposed
              // param's `type` and `acceptsField`.
              ...(p.targets !== undefined ? { targets: p.targets.map((t) => ({ ...t })) } : {}),
              ...(p.min !== undefined ? { min: p.min } : {}),
              ...(p.max !== undefined ? { max: p.max } : {}),
              ...(p.description !== undefined ? { description: p.description } : {}),
            })),
          }
        : {}),
      nodes,
      connections: graph._connections
        .filter((c) => !isPortal(c.from) && !isPortal(c.to))
        .map((c) => ({
          from: [c.from, c.fromPin] as const,
          to: [c.to, c.toPin] as const,
        })),
      outputs: graph._outputs
        .filter((o) => plumbing?.outputNames.has(o.name) !== true)
        .map((o) => ({ id: o.node, pin: o.pin, name: o.name })),
    };
  } finally {
    seen.delete(graph);
  }
}

function checkEndpoint(v: unknown, label: string, path: string): [string, string] {
  if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== "string" || typeof v[1] !== "string") {
    fault({
      code: "invalid-connection",
      message: `${label}: expected [nodeId, pinName], got ${JSON.stringify(v)}`,
      path,
      expected: "[nodeId, pinName]",
    });
  }
  return [v[0], v[1]];
}

/**
 * The refusal of a node id nothing in the graph has, with the nearest ids
 * before the list of the ones it does.
 */
function unknownNodeFault(
  head: string,
  id: string,
  known: readonly string[],
  path: string,
): Fault {
  const near = suggestNames(id, known);
  return {
    code: "unknown-node",
    message: `${head} "${id}"; ${near.clause}known nodes: ${known.join(", ")}`,
    path,
    got: id,
    valid: [...known],
    ...suggestionFields(near, (to) => `replace "${id}" with "${to}"`),
  };
}

/**
 * The refusal of a pin a node does not have, in the loader's own wording
 * (`valid output pins: …`); `none` is what an empty list reads as.
 */
function unknownPinFault(
  head: string,
  nodeId: string,
  side: "input" | "output",
  pin: string,
  pins: readonly { readonly name: string }[],
  path: string,
  none: string,
): Fault {
  const valid = pins.map((p) => p.name);
  const near = suggestNames(pin, valid);
  return {
    code: "unknown-pin",
    message: `${head}node "${nodeId}" has no ${side} pin "${pin}"; ${near.clause}valid ${side} pins: ${valid.join(", ") || none}`,
    path,
    nodeId,
    pin,
    valid,
    ...suggestionFields(near, (to) => `replace "${pin}" with "${to}"`),
  };
}

/** Read and validate the exposed-pin list of a subgraph payload. */
function readExposedPins(
  v: unknown,
  inner: Graph,
  where: string,
  locate: Locate,
  sink: Sink,
  id: string,
): ExposedPin[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    fault({
      code: "invalid-exposed-pin",
      message: `${where}: expected an array of { name, node, pin } objects, got ${JSON.stringify(v)}`,
      path: locate(""),
      nodeId: id,
    });
  }
  return v.map((e: unknown, i: number): ExposedPin => {
    const at = child(locate, `/${i}`);
    if (
      !isPlainObject(e) ||
      typeof e.name !== "string" ||
      typeof e.node !== "string" ||
      typeof e.pin !== "string"
    ) {
      fault({
        code: "invalid-exposed-pin",
        message: `${where}[${i}]: expected { name, node, pin } strings, got ${JSON.stringify(e)}`,
        path: at(""),
        nodeId: id,
      });
    }
    checkKeys(sink, e, EXPOSED_PIN_KEYS, `${where}[${i}]`, NO_ANNOTATION_KEY, at);
    if (!inner._nodes.has(e.node)) {
      const known = [...inner._nodes.keys()];
      const near = suggestNames(e.node, known);
      fault({
        code: "invalid-exposed-pin",
        message: `${where}[${i}] ("${e.name}"): unknown inner node "${e.node}"; ${near.clause}inner nodes: ${known.join(", ")}`,
        path: at("/node"),
        nodeId: id,
        got: e.node,
        valid: known,
        ...suggestionFields(near, (to) => `replace "${e.node}" with "${to}"`),
      });
    }
    return { name: e.name, node: { id: e.node }, pin: e.pin };
  });
}

/**
 * Read and validate the exposed-param declarations of a subgraph payload.
 * Only the authored fields are read: the schema is re-derived from the
 * targets by `resolveExposedParam`, so a payload claiming a type or a
 * field capability the inner params do not have is not representable.
 */
function readExposedParams(
  v: unknown,
  inner: Graph,
  where: string,
  locate: Locate,
  sink: Sink,
  id: string,
): ExposedParamDecl[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    fault({
      code: "invalid-exposed-param",
      message: `${where}: expected an array of { name, targets, description, default } objects, got ${JSON.stringify(v)}`,
      path: locate(""),
      nodeId: id,
    });
  }
  return v.map((e: unknown, i: number): ExposedParamDecl => {
    const at = child(locate, `/${i}`);
    if (!isPlainObject(e) || typeof e.name !== "string" || typeof e.description !== "string") {
      fault({
        code: "invalid-exposed-param",
        message: `${where}[${i}]: expected { name, targets, description, default } with string name and description, got ${JSON.stringify(e)}`,
        path: at(""),
        nodeId: id,
      });
    }
    checkKeys(
      sink,
      e,
      EXPOSED_PARAM_KEYS,
      `${where}[${i}] ("${e.name}")`,
      EXPOSED_PARAM_NO_ANNOTATION_KEY,
      at,
      DERIVED_EXPOSED_PARAM_KEYS,
    );
    // Absent and empty both mean "writes nowhere", which is legal exactly
    // when a field expression in the body reads the name instead — the
    // wrapper checks that, since only it can see the body.
    if (e.targets !== undefined && !Array.isArray(e.targets)) {
      fault({
        code: "invalid-exposed-param",
        message: `${where}[${i}] ("${e.name}"): "targets" must be an array of { node, param } objects — empty or absent for a param the body's field expressions read by name — got ${JSON.stringify(e.targets)}`,
        path: at("/targets"),
        nodeId: id,
      });
    }
    const declaredTargets: readonly unknown[] = e.targets === undefined ? [] : (e.targets as unknown[]);
    const targets = declaredTargets.map((t: unknown, j: number) => {
      const targetAt = child(at, `/targets/${j}`);
      if (!isPlainObject(t) || typeof t.node !== "string" || typeof t.param !== "string") {
        fault({
          code: "invalid-exposed-param",
          message: `${where}[${i}] ("${e.name}") targets[${j}]: expected { node, param } strings, got ${JSON.stringify(t)}`,
          path: targetAt(""),
          nodeId: id,
        });
      }
      checkKeys(
        sink,
        t,
        EXPOSED_PARAM_TARGET_KEYS,
        `${where}[${i}] ("${e.name}") targets[${j}]`,
        NO_ANNOTATION_KEY,
        targetAt,
      );
      if (!inner._nodes.has(t.node)) {
        const known = [...inner._nodes.keys()];
        const near = suggestNames(t.node, known);
        fault({
          code: "invalid-exposed-param",
          message: `${where}[${i}] ("${e.name}") targets[${j}]: unknown inner node "${t.node}"; ${near.clause}inner nodes: ${known.join(", ")}`,
          path: targetAt("/node"),
          nodeId: id,
          got: t.node,
          valid: known,
          ...suggestionFields(near, (to) => `replace "${t.node}" with "${to}"`),
        });
      }
      return { node: { id: t.node }, param: t.param };
    });
    for (const bound of ["min", "max"] as const) {
      const b = e[bound];
      if (b !== undefined && (typeof b !== "number" || !Number.isFinite(b))) {
        fault({
          code: "invalid-exposed-param",
          message: `${where}[${i}] ("${e.name}"): "${bound}" must be a finite number when present, got ${JSON.stringify(b)}`,
          path: at(`/${bound}`),
          nodeId: id,
          got: b,
          expected: "a finite number",
        });
      }
    }
    return {
      name: e.name,
      targets,
      description: e.description,
      // A schema default is always a plain value — a Field is set as a
      // VALUE on an instance, never as a default — so there is no
      // FieldSpec to interpret here. resolveExposedParam validates it
      // against the schema it derives.
      ...(e.default !== undefined ? { default: e.default as ParamValue } : {}),
      ...(typeof e.min === "number" ? { min: e.min } : {}),
      ...(typeof e.max === "number" ? { max: e.max } : {}),
    };
  });
}

/**
 * @internal Threaded through deserialization: both acyclicity guards.
 */
interface ReadContext {
  /** Payload objects on the current path, by object identity. */
  readonly seenPayloads: Set<object>;
  /**
   * Registered subgraph names on the current resolution path, in order.
   * Object identity cannot see a NAME cycle — "a" referencing "b"
   * referencing "a" involves three distinct payload objects — so names
   * need a guard of their own.
   */
  readonly seenNames: Set<string>;
  /**
   * True inside a subgraph payload's graph, where a top-level `params`
   * block is refused. A body's names are bound by its WRAPPER's exposed
   * params, and two binders that can disagree is the failure
   * `checkDerivedReaders` refuses one level up — but the load-bearing
   * reason is narrower: `hashableGraph` covers a payload verbatim, so a
   * key admitted there would move every pinned `ref` hash in the corpus.
   */
  readonly nested?: boolean;
}

/**
 * What reading one node's params needs to know about the node: where it
 * sits, what it may set, how to word an unknown key, and which keys were
 * accepted (the authored set a graph param's conflict check reads).
 */
interface ParamReading {
  readonly id: string;
  readonly at: Locate;
  readonly schemaOf: (key: string) => ParamSchema | undefined;
  readonly valid: readonly string[];
  readonly unknownMessage: (key: string, clause: string) => string;
  readonly declaredParams: ReadonlySet<string>;
  readonly bindings: Readonly<Record<string, number | readonly number[]>>;
  readonly accepted: Set<string>;
}

/**
 * The record for a field expression that did not build, under the param
 * that holds it. A grammar refusal already carries a pointer relative to
 * the spec, which lands under the param's own; any other failure (a
 * combinator refusing a tuple size) is located at the param.
 */
function fieldFault(err: unknown, where: string, path: string, nodeId: string, param: string): Fault {
  const inner = diagnosticsOf(err)[0];
  const grammar = err instanceof FieldJsonError ? inner : undefined;
  return {
    code: inner !== undefined && inner.code !== "error" ? inner.code : "invalid-field-spec",
    message: `${where}: ${errText(err)}`,
    path: path + (grammar?.path ?? ""),
    nodeId,
    param,
    ...(grammar?.key !== undefined ? { key: grammar.key } : {}),
    ...(grammar?.got !== undefined ? { got: grammar.got } : {}),
    ...(grammar?.valid !== undefined ? { valid: grammar.valid } : {}),
    ...(grammar?.expected !== undefined ? { expected: grammar.expected } : {}),
    ...(grammar?.didYouMean !== undefined ? { didYouMean: grammar.didYouMean } : {}),
    ...(grammar?.fix !== undefined ? { fix: grammar.fix } : {}),
  };
}

/**
 * Read one node's params, each its own unit: a refused param is dropped and
 * reported, and the rest are still read — the node is built without it, so
 * its pins stay known to the connections that name them.
 */
function readParams(paramsJson: Record<string, unknown>, r: ParamReading, sink: Sink): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(paramsJson)) {
    unit(sink, () => {
      const path = r.at(`/params/${pointerToken(key)}`);
      const schema = r.schemaOf(key);
      if (schema === undefined) {
        const near = suggestNames(key, r.valid);
        fault({
          code: "unknown-param",
          message: r.unknownMessage(key, near.clause),
          path,
          nodeId: r.id,
          param: key,
          valid: [...r.valid],
          ...suggestionFields(near, (to) => `rename "${key}" to "${to}"`),
        });
      }
      const where = `node "${r.id}" param "${key}"`;
      if (schema.acceptsField === true && isPlainObject(value)) {
        checkNoShadowedGraphParam(value as FieldSpec, r.declaredParams, where, {
          path,
          nodeId: r.id,
          param: key,
        });
        try {
          params[key] = fieldFromJson(value as FieldSpec, r.bindings);
        } catch (err) {
          fault(fieldFault(err, where, path, r.id, key));
        }
      } else {
        const bad = paramValueFault(schema, value, where, { path, nodeId: r.id, param: key });
        if (bad !== undefined) fault(bad);
        // An accepted enum value is stored as the SCHEMA'S string, not the
        // one `JSON.parse` just allocated. Same value, same validation,
        // same refusal above for anything unrecognised — see
        // `canonicalEnumValue` for the miscompile that makes the identity
        // worth having. Arrays are copied for the reason they always were:
        // the caller's JSON must not alias a live graph's param.
        params[key] = Array.isArray(value)
          ? [...(value as unknown[])]
          : canonicalEnumValue(schema, value);
      }
      r.accepted.add(key);
    });
  }
  return params;
}

/** Read and validate a node's `ref` object. */
function readSubgraphRef(
  id: string,
  v: unknown,
  at: Locate,
  sink: Sink,
): SerializedSubgraphRef {
  if (!isPlainObject(v)) {
    fault({
      code: "invalid-subgraph-ref",
      message: `node "${id}": "ref" must be an object { name, hash? } naming a registered subgraph, got ${JSON.stringify(v)}`,
      path: at(""),
      nodeId: id,
    });
  }
  checkKeys(
    sink,
    v,
    SUBGRAPH_REF_KEYS,
    `node "${id}" ref`,
    " (a reference carries the registered name and, when it pins itself, that content hash — nothing else)",
    at,
  );
  if (typeof v.name !== "string" || v.name === "") {
    fault({
      code: "invalid-subgraph-ref",
      message: `node "${id}": "ref".name must be a non-empty string naming a registered subgraph, got ${JSON.stringify(v.name)}`,
      path: keyPath(v, "name", at),
      nodeId: id,
      got: v.name,
    });
  }
  if (v.hash !== undefined && typeof v.hash !== "string") {
    fault({
      code: "invalid-subgraph-ref",
      message: `node "${id}": "ref".hash must be a string when present (the hash registerSubgraph reported), got ${JSON.stringify(v.hash)}`,
      path: at("/hash"),
      nodeId: id,
      got: v.hash,
    });
  }
  return { name: v.name, ...(typeof v.hash === "string" ? { hash: v.hash } : {}) };
}

/** Everything a wrapper node's reader needs beyond its JSON. */
interface WrapperReading {
  readonly graph: Graph;
  readonly id: string;
  readonly at: Locate;
  readonly nodeJson: Record<string, unknown>;
  readonly paramsJson: Record<string, unknown>;
  readonly ctx: ReadContext;
  readonly wrapper: WrapperKind;
  readonly bindings: Readonly<Record<string, number | readonly number[]>>;
  readonly declaredParams: ReadonlySet<string>;
  readonly accepted: Set<string>;
}

/**
 * Rebuild one subgraph node, from a registered name (`ref`) or from an
 * embedded payload (`subgraph`) — never both. Either way the node is built
 * by the same code below, so a reference and an embedded copy of the same
 * recipe produce the same def, the same memo key and the same cooked bytes.
 */
function addSubgraphNode(w: WrapperReading, sink: Sink): NodeHandle {
  const { id, at, nodeJson, ctx } = w;
  const refJson = nodeJson.ref;
  const payload = nodeJson.subgraph;
  if (refJson !== undefined && payload !== undefined) {
    fault({
      code: "subgraph-ref-and-payload",
      message: `node "${id}": carries both "ref" and "subgraph"; a subgraph node either references a registered subgraph by name ("ref") or embeds its inner graph ("subgraph"), never both — remove whichever is not intended`,
      path: at(""),
      nodeId: id,
    });
  }
  if (refJson !== undefined) {
    const refAt = under(at("/ref"));
    const ref = readSubgraphRef(id, refJson, refAt, sink);
    if (ctx.seenNames.has(ref.name)) {
      fault({
        code: "subgraph-cycle",
        message: `node "${id}": subgraph reference cycle ${[...ctx.seenNames, ref.name].map((n) => JSON.stringify(n)).join(" -> ")}; named subgraph references must be acyclic — resolving one would resolve itself forever`,
        path: refAt("/name"),
        nodeId: id,
        got: ref.name,
      });
    }
    if (!hasRegisteredSubgraph(ref.name)) {
      const valid = registeredSubgraphNames();
      const near = suggestNames(ref.name, valid);
      const importFix = unknownSubgraphImportFix(ref.name);
      fault({
        code: "unknown-subgraph",
        message: `node "${id}": ${unknownSubgraphMessage(ref.name)}`,
        path: refAt("/name"),
        nodeId: id,
        got: ref.name,
        valid,
        ...suggestionFields(near, (to) => `replace "${ref.name}" with "${to}"`),
        // A load that never imported the vocabulary: the import is the fix,
        // whatever near name the caller's own registrations happen to hold.
        ...(importFix !== undefined ? { fix: importFix } : {}),
      });
    }
    const entry = getRegisteredSubgraph(ref.name);
    // A pin is opt-in, and a mismatch is a hard error: the author who
    // wrote a hash asked to cook exactly what they authored against. A
    // ref WITHOUT one follows the registry, so improving a primitive
    // never breaks a saved graph. Neither mode warns — a library warning
    // reaches nobody, which makes it indistinguishable from cooking the
    // near-miss silently.
    if (ref.hash !== undefined && ref.hash !== entry.hash) {
      fault({
        code: "subgraph-hash-mismatch",
        message: `node "${id}": subgraph "${ref.name}" is pinned to content hash ${ref.hash}, but the registered one hashes ${entry.hash} — the primitive changed since this graph was written. Re-save the graph to adopt the new version, or remove "hash" from the ref to follow the registry.`,
        path: refAt("/hash"),
        nodeId: id,
        got: ref.hash,
        expected: entry.hash,
      });
    }
    ctx.seenNames.add(ref.name);
    try {
      return buildSubgraphNode(
        w,
        entry.subgraph as unknown as Record<string, unknown>,
        ref,
        collapsedOn(at("/ref")),
        sink,
      );
    } finally {
      ctx.seenNames.delete(ref.name);
    }
  }
  if (!isPlainObject(payload)) {
    fault({
      code: "missing-subgraph-payload",
      message: `node "${id}": a "${w.wrapper}" node needs a "subgraph" payload object { graph, inputs, outputs } carrying its inner graph, or a "ref" { name } naming a registered one, got ${JSON.stringify(payload)}`,
      path: keyPath(nodeJson, "subgraph", at),
      nodeId: id,
    });
  }
  if (ctx.seenPayloads.has(payload)) {
    fault({
      code: "subgraph-cycle",
      message: `node "${id}": its subgraph payload reaches itself (a payload cycle); subgraph nesting must be acyclic`,
      path: at("/subgraph"),
      nodeId: id,
    });
  }
  ctx.seenPayloads.add(payload);
  try {
    return buildSubgraphNode(w, payload, undefined, under(at("/subgraph")), sink);
  } finally {
    ctx.seenPayloads.delete(payload);
  }
}

/**
 * A body's fault restated one level out: the wrapper's breadcrumb in front
 * of the message, the pointer re-rooted at the body (or collapsed onto the
 * `ref` that reached it), and the wrapper's id prepended to the node path.
 * A fix is dropped when the body is a registered recipe, since applying it
 * would mean editing the registry rather than the caller's document.
 */
function restateBodyFault(f: Fault, id: string, locate: Locate, viaRef: boolean): Fault {
  const { fix, ...rest } = f;
  const innerPath = f.nodePath ?? (f.nodeId !== undefined ? [f.nodeId] : []);
  return {
    ...rest,
    message: `node "${id}" inner graph: ${f.message}`,
    path: locate(f.path ?? ""),
    nodeId: id,
    nodePath: [id, ...innerPath],
    ...(fix !== undefined && !viaRef ? { fix } : {}),
  };
}

/** The code a wrapper factory's refusal gets, by what it was refusing. */
function wrapperFactoryCode(err: unknown): DiagnosticCode {
  const carried = diagnosticsOf(err)[0]?.code;
  if (carried !== undefined && carried !== "error") return carried;
  const text = errText(err);
  if (/reserved/.test(text)) return "reserved-plumbing-name";
  if (/exposed param/.test(text)) return "invalid-exposed-param";
  return "invalid-exposed-pin";
}

/**
 * The one construction route: recursively deserialize the inner graph,
 * then re-wrap it through `subgraphNode` so the instance is
 * indistinguishable from a code-first one. `ref`, when present, is
 * recorded against the def so serialization writes the reference back out.
 * `locate` points into the payload — or, for a `ref`, at the reference.
 *
 * Any fault in the BODY ends the node — every record the body produced,
 * down to a stray key at its top, because a body that took records is not
 * one the wrapper can be trusted to cook — and so does any refused exposed
 * pin or param declaration, since the interface is then unknown: the node is
 * not built and nothing that names it is checked. A stray key on the payload
 * object or on one exposed declaration is reported and does NOT end it; the
 * key changes nothing about what is built. The node's own params are read
 * one by one like any node's.
 *
 * For a `ref`, every payload record is located at the reference and loses
 * its `fix`: the recipe lives in the registry, not in the caller's document,
 * so a mechanical edit has nowhere to be applied.
 */
function buildSubgraphNode(
  w: WrapperReading,
  payload: Record<string, unknown>,
  ref: SerializedSubgraphRef | undefined,
  locate: Locate,
  sink: Sink,
): NodeHandle {
  const { graph, id, ctx, wrapper } = w;
  const withoutFix = (r: Fault): Fault => {
    const { fix: _fix, ...rest } = r;
    return rest;
  };
  const payloadSink = ref === undefined ? sink : nestedSink(sink, withoutFix);
  const payloadStep = <T>(read: () => T): T => {
    if (ref === undefined) return read();
    try {
      return read();
    } catch (err) {
      if (err instanceof LoadFault && err.record?.fix !== undefined) {
        throw new LoadFault(toRecord(withoutFix(err.record)));
      }
      throw err;
    }
  };
  checkKeys(payloadSink, payload, SUBGRAPH_PAYLOAD_KEYS, `node "${id}" subgraph payload`, NO_ANNOTATION_KEY, locate);
  const bodyAt: Locate =
    ref !== undefined ? locate : Object.hasOwn(payload, "graph") ? child(locate, "/graph") : collapsedOn(locate(""));
  const bodySink = nestedSink(sink, (f) => restateBodyFault(f, id, bodyAt, ref !== undefined));
  const inner = deserializeGraphRec(payload.graph, { ...ctx, nested: true }, bodySink);
  if (inner === undefined || bodySink.count > 0) throw new LoadFault(undefined);
  const inputs = payloadStep(() =>
    readExposedPins(payload.inputs, inner, `node "${id}" subgraph inputs`, child(locate, "/inputs"), payloadSink, id),
  );
  const outputs = payloadStep(() =>
    readExposedPins(payload.outputs, inner, `node "${id}" subgraph outputs`, child(locate, "/outputs"), payloadSink, id),
  );
  // Re-wrapping injects plumbing under reserved names ("__in_<name>"
  // portal nodes, "__out_<name>" outputs); detect collisions with the
  // payload's own content up front so the error states the mechanism and
  // the fix instead of a bare duplicate-id failure from Graph.add.
  inputs.forEach((exp, k) => {
    const portalId = `__in_${exp.name}`;
    if (inner._nodes.has(portalId)) {
      fault({
        code: "reserved-plumbing-name",
        message: `node "${id}": inner node id "${portalId}" collides with the portal node injected for exposed input "${exp.name}" — ids "__in_<name>" and "__out_<name>" are reserved for subgraph plumbing; rename the inner node or the exposed pin`,
        path: locate(`/inputs/${k}/name`),
        nodeId: id,
        got: exp.name,
      });
    }
  });
  outputs.forEach((exp, k) => {
    const outName = `__out_${exp.name}`;
    if (inner._outputs.some((o) => o.name === outName)) {
      fault({
        code: "reserved-plumbing-name",
        message: `node "${id}": inner output "${outName}" collides with the output injected for exposed output "${exp.name}" — ids "__in_<name>" and "__out_<name>" are reserved for subgraph plumbing; rename the inner output or the exposed pin`,
        path: locate(`/outputs/${k}/name`),
        nodeId: id,
        got: exp.name,
      });
    }
  });
  // A recipe records a body and its exposed pins and NOTHING about which
  // wrapper cooks them, so the kind lives only in the referencing node's
  // `type`. That leaves one way to reach the wrong answer through
  // well-formed JSON: point a `subgraph` node at a body written to be
  // iterated, and it cooks once over the concatenated collection and emits
  // one item where the author expected K. What is refused is the
  // confusion, not the body: a forEach body is a perfectly good thing to
  // write and to REGISTER, and `registerSubgraph` probes one as a forEach
  // (its canonicalizing probe reads the kind off these same reserved names
  // through `inferWrapperKind`), so nothing here makes such a body
  // unregisterable.
  //
  // Checked HERE rather than in `subgraphNode` because the mistake being
  // caught only EXISTS in the serialized form. A code-first author picked a
  // constructor — `forEachNode` or `subgraphNode` — and cannot have paired
  // the wrong one with a body silently; a JSON author wrote a `type` key
  // beside a payload, and those two can disagree. Only the loader holds
  // both halves plus the node id and the `ref` name the message has to
  // quote, which is why the refusal can say "the type is the mistake" at
  // all.
  const recipeNote =
    ref === undefined ? "" : ` (the recipe "${ref.name}" itself is fine — the type is the mistake)`;
  if (wrapper !== "forEach") {
    const iterated = inputs.filter((e) => ITERATED_PIN_NAMES.has(e.name));
    if (iterated.length > 0) {
      fault({
        code: "wrapper-kind-mismatch",
        message:
          `node "${id}": a "${wrapper}" node cannot expose ${iterated
            .map((e) => `"${e.name}"`)
            .join(" or ")} — those names are reserved for the pin a "forEach" iterates, and this body is ` +
          `written to be looped over. As a "${wrapper}" it would cook over the whole collection and ` +
          `emit one result where K were meant. Change this node's "type" to "forEach"${recipeNote}, or ` +
          "rename the exposed input if that is not what the body means.",
        path: w.at("/type"),
        nodeId: id,
        got: wrapper,
      });
    }
  }
  // The same refusal for the other loop's reserved name, on BOTH sides —
  // `repeatUntil` matches its carried output to its carried input by name,
  // so a body written for it says so at both ends. A `subgraph` carrying
  // one would cook exactly ONE relaxation pass where the author wrote
  // "until it settles": well-formed, saves cleanly, and wrong.
  if (wrapper !== "repeatUntil") {
    for (const [side, pins] of [
      ["input", inputs],
      ["output", outputs],
    ] as const) {
      const carried = pins.filter((e) => CARRIED_PIN_NAMES.has(e.name));
      if (carried.length > 0) {
        fault({
          code: "wrapper-kind-mismatch",
          message:
            `node "${id}": a "${wrapper}" node cannot expose ${side} ${carried
              .map((e) => `"${e.name}"`)
              .join(" or ")} — that name is reserved for the pin a "repeatUntil" feeds back into itself, and ` +
            `this body is written to be relaxed to a fixed point. As a "${wrapper}" it would cook ONE pass ` +
            `where "until it settles" was meant. Change this node's "type" to "repeatUntil"${recipeNote}, ` +
            `or rename the exposed ${side} if a single pass is what you want.`,
          path: w.at("/type"),
          nodeId: id,
          got: wrapper,
        });
      }
    }
  }
  const decls = payloadStep(() =>
    readExposedParams(payload.params, inner, `node "${id}" subgraph params`, child(locate, "/params"), payloadSink, id),
  );
  const exposed: ExposedParam[] = decls.map((decl, k) => {
    try {
      return resolveExposedParam(inner, decl);
    } catch (err) {
      fault({
        code: "invalid-exposed-param",
        message: `node "${id}": ${errText(err)}`,
        path: locate(`/params/${k}`),
        nodeId: id,
      });
    }
  });
  let def;
  try {
    // The one place the two wrappers part company on the way in. Both read
    // the same payload — a forEach is a subgraph plus a loop, and the loop
    // is named by a reserved exposed-input name inside `inputs`, so the
    // payload needs no field to say which this is.
    def =
      wrapper === "forEach"
        ? forEachNode(inner, inputs, outputs, exposed)
        : wrapper === "repeatUntil"
          ? repeatUntilNode(inner, inputs, outputs, exposed)
          : subgraphNode(inner, inputs, outputs, exposed);
  } catch (err) {
    fault({
      code: wrapperFactoryCode(err),
      message: `node "${id}": ${errText(err)}`,
      path: locate(""),
      nodeId: id,
    });
  }
  // Values, validated against the schemas just derived — exactly the
  // treatment a standard node's params get, including field capability.
  const declared = new Map(exposed.map((p) => [p.name, p.schema]));
  // The loop's own two params, for a `repeatUntil`. Not exposed from the
  // body and so absent from `exposed`, but present on every instance and
  // written by the writer, so the reader has to know them or a saved
  // `maxRounds` would come back as "unknown param".
  if (wrapper === "repeatUntil") {
    for (const [name, schema] of Object.entries(REPEAT_UNTIL_PARAM_SCHEMAS)) {
      declared.set(name, schema);
    }
  }
  const exposedNames = [...declared.keys()];
  const params = readParams(
    w.paramsJson,
    {
      id,
      at: w.at,
      schemaOf: (key) => declared.get(key),
      valid: exposedNames,
      unknownMessage: (key, clause) =>
        `node "${id}": unknown param "${key}"; ${clause}this subgraph node exposes: ${exposedNames.join(", ") || "(none)"} (an exposed param must be declared under "params" ${ref === undefined ? 'in the node\'s "subgraph" payload' : `in the registered recipe of "${ref.name}"`})`,
      declaredParams: w.declaredParams,
      bindings: w.bindings,
      accepted: w.accepted,
    },
    sink,
  );
  // Recorded per DEF, and a def is created fresh for every reference (a
  // live graph can be wrapped exactly once), so no two references share
  // this record and serialization can write each one back out as it came.
  if (ref !== undefined) recordSubgraphRef(def as object, ref);
  return graph.add(def, params, id);
}

/**
 * Rebuild a Graph from the serialized JSON format. Validates the format
 * version, that every node type is registered, that params match their
 * schemas (type, enum membership, bounds, no unknown keys), and that
 * every connection and output references existing nodes and pins —
 * errors name the offending node id, param, or pin and list what would
 * be valid, with the nearest valid names first when there are any.
 *
 * **Every fault in one load.** A failed load throws ONE
 * `GraphSerializationError` whose `diagnostics` holds a record per fault —
 * with an RFC 6901 `path` into `json`, a code, and the node, param or pin
 * it concerns — and whose message is those records' messages, one per
 * line. Records come in phase order (document shape, `meta`, graph
 * params, nodes, targets, connections, outputs), then document order, so
 * the first is the fault a first-error reader would have stopped at. A
 * load stops early only when the document's shape blocks everything else
 * (not an object, a formatVersion this build does not read, `nodes` not an
 * array), and after {@link MAX_LOAD_RECORDS} records, which it follows
 * with one `truncated` record. A node whose params are refused is still
 * built without them, so connections to it are still checked; a node that
 * cannot be built at all is left out, and connections, outputs and
 * targets naming it are skipped rather than reported again. Inside one
 * field expression the grammar still stops at its first fault — one
 * record per param.
 *
 * The key sets are closed at EVERY object position — the graph, a node, a
 * `subgraph` payload, a `ref`, a connection, a declared output, an
 * exposed-pin or exposed-param declaration, an exposed-param target — so
 * an unrecognized key is named rather than ignored. The one key outside
 * them is `$schema` on the OUTERMOST graph object, a string naming the JSON
 * Schema the file follows for an editor's benefit; the loader ignores it,
 * {@link serializeGraph} never writes it, and a nested payload may not
 * carry it.
 *
 * The optional `meta` block ({ title?, description?, tags? }) is read
 * onto {@link Graph.setMeta}; an unknown key inside it is an error, not a
 * warning. Absent meta leaves the graph without any.
 *
 * `subgraph` nodes are rebuilt recursively from their nested payload and
 * re-wrapped through `subgraphNode`, so they behave exactly like
 * code-first subgraph nodes (including inner-edit invalidation).
 * Item-list params must be empty in the JSON — live DataItems are bound
 * at runtime (e.g. by the World) after deserialization.
 */
export function deserializeGraph(json: unknown): Graph {
  const sink = new LoadRecords();
  let graph: Graph | undefined;
  try {
    graph = deserializeGraphRec(json, { seenPayloads: new Set(), seenNames: new Set() }, sink);
  } catch (err) {
    if (!(err instanceof LoadCapReached)) throw err;
    sink.records.push(
      toRecord({
        code: "truncated",
        message: `more than ${MAX_LOAD_RECORDS} faults; the rest were not reported — fix these and load again to see the next ones`,
      }),
    );
  }
  if (graph === undefined || sink.records.length > 0) {
    throw new GraphSerializationError(sink.records.map((r) => r.message).join("\n"), sink.records);
  }
  return graph;
}

/**
 * Read one graph document into `sink`. Returns the graph, or `undefined`
 * when the document's shape blocked reading it at all; a graph returned
 * while `sink` took records is incomplete and must not be used.
 */
function deserializeGraphRec(json: unknown, ctx: ReadContext, sink: Sink): Graph | undefined {
  let graph: Graph | undefined;
  unit(sink, () => {
    graph = readGraphDocument(json, ctx, sink);
  });
  return graph;
}

/** The top-level key check, with `$schema` admitted where it belongs. */
function checkGraphKeys(json: Record<string, unknown>, nested: boolean, sink: Sink): void {
  for (const key of Object.keys(json)) {
    if ((GRAPH_KEYS as readonly string[]).includes(key)) continue;
    if (key === SCHEMA_KEY) {
      if (nested) {
        sink.report({
          code: "unknown-key",
          message: `deserializeGraph: key "${SCHEMA_KEY}" belongs at the top of the file — it names the JSON Schema the whole document follows, so only the outermost graph object may carry it, never a subgraph payload's graph. Move it to the top-level object or remove it`,
          path: `/${pointerToken(key)}`,
          key,
        });
      } else if (typeof json[key] !== "string") {
        sink.report({
          code: "invalid-section",
          message: `deserializeGraph: "${SCHEMA_KEY}" must be a string (the URL or path of the JSON Schema this file follows), got ${JSON.stringify(json[key])}`,
          path: `/${pointerToken(key)}`,
          key,
          got: json[key],
        });
      }
      continue;
    }
    sink.report(unknownKeyFault(key, GRAPH_KEYS, "deserializeGraph", NO_ANNOTATION_KEY, `/${pointerToken(key)}`));
  }
}

function readGraphDocument(json: unknown, ctx: ReadContext, sink: Sink): Graph {
  const nested = ctx.nested === true;
  if (!isPlainObject(json)) {
    fault({
      code: "graph-not-object",
      message: `deserializeGraph: expected a serialized graph object, got ${JSON.stringify(json)}`,
      path: "",
    });
  }
  checkGraphKeys(json, nested, sink);
  if (json.formatVersion !== FORMAT_VERSION) {
    fault({
      code: "unsupported-format-version",
      message: `unsupported formatVersion ${JSON.stringify(json.formatVersion)}; this build reads formatVersion ${FORMAT_VERSION}`,
      path: keyPath(json, "formatVersion", under("")),
      got: json.formatVersion,
      expected: String(FORMAT_VERSION),
    });
  }
  let seed = json.seed;
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    sink.report({
      code: "invalid-seed",
      message: `graph seed must be a finite number, got ${JSON.stringify(seed)}`,
      path: keyPath(json, "seed", under("")),
      got: seed,
      expected: "a finite number",
    });
    seed = 0;
  }
  const nodesJson = json.nodes;
  if (!Array.isArray(nodesJson)) {
    fault({ code: "invalid-section", message: `"nodes" must be an array`, path: keyPath(json, "nodes", under("")) });
  }
  const rawConnections = json.connections ?? [];
  let connectionsJson: readonly unknown[] = [];
  if (Array.isArray(rawConnections)) connectionsJson = rawConnections;
  else sink.report({ code: "invalid-section", message: `"connections" must be an array`, path: "/connections" });
  const rawOutputs = json.outputs ?? [];
  let outputsJson: readonly unknown[] = [];
  if (Array.isArray(rawOutputs)) outputsJson = rawOutputs;
  else sink.report({ code: "invalid-section", message: `"outputs" must be an array`, path: "/outputs" });

  const graph = new Graph(seed as number);
  let meta: GraphMeta | undefined;
  unit(sink, () => {
    meta = readGraphMeta(json.meta, `"meta"`);
  });
  graph.setMeta(meta);
  // Declared BEFORE any node is read, because every field-valued param
  // below is built against these values: binding substitutes at BUILD time
  // (the only moment a value reaches `Field.key`, and so the only moment it
  // reaches a memo key), and deserialize is the earliest build that has
  // them.
  const graphParams = readGraphParams(json.params, nested, sink);
  // Only the BINDINGS are needed before the nodes: a targetless param
  // substitutes into expressions at build time. A targeted one is resolved
  // and applied after, because its schema comes from params that do not
  // exist yet — see `applyGraphParamTargets`.
  const bindings = graphParamBindings(graphParams.map((p) => p.param));
  const declaredParams = new Set(graphParams.map((p) => p.param.name));
  const handles = new Map<string, NodeHandle>();
  // Every string id a node claimed, built or not: a second node reusing a
  // poisoned node's id is still a duplicate.
  const claimedIds = new Map<string, number>();
  // Ids a reference cannot be checked against: nodes that could not be
  // built, and ids two nodes claimed (which of the two a connection meant
  // is unknowable). Their fault is already reported, so anything that names
  // one is skipped rather than refused again.
  const poisoned = new Set<string>();
  // Set when a node could not be built before it claimed any id at all (not
  // an object, a missing or empty id). A reference to an id no node has may
  // then be a reference to THAT node, so it is not reported either.
  let anonymousPoisoned = false;
  const skipped = (id: string): boolean => poisoned.has(id) || (anonymousPoisoned && !handles.has(id));
  // Which param keys each node's JSON carried AND the loader accepted.
  // `getParams` merges the registry defaults, so it cannot tell "the author
  // wrote 2" from "the author wrote nothing and the default is 10" — and
  // only the first is worth objecting to when a graph param drives that
  // slot. A refused key is left out, so its dropped value cannot be
  // reported a second time as a conflict with its driver.
  const authoredParamKeys = new Map<string, ReadonlySet<string>>();
  const knownIds = (): string[] => [...handles.keys()];

  nodesJson.forEach((nodeJson: unknown, i: number) => {
    const at = under(`/nodes/${i}`);
    let claimed: string | undefined;
    const built = unit(sink, () => {
      if (!isPlainObject(nodeJson)) {
        fault({
          code: "invalid-section",
          message: `nodes[${i}]: expected a node object, got ${JSON.stringify(nodeJson)}`,
          path: at(""),
        });
      }
      const id = nodeJson.id;
      if (typeof id !== "string" || id === "") {
        fault({
          code: "invalid-node-id",
          message: `nodes[${i}]: node id must be a non-empty string, got ${JSON.stringify(id)}`,
          path: keyPath(nodeJson, "id", at),
          got: id,
        });
      }
      if (claimedIds.has(id)) {
        poisoned.add(id);
        fault({
          code: "duplicate-node-id",
          message: `nodes[${i}]: duplicate node id "${id}"`,
          path: at("/id"),
          nodeId: id,
          got: id,
        });
      }
      claimedIds.set(id, i);
      claimed = id;
      checkKeys(sink, nodeJson, NODE_KEYS, `node "${id}"`, NO_ANNOTATION_KEY, at);
      const type = nodeJson.type;
      if (typeof type !== "string") {
        fault({
          code: "unknown-node-type",
          message: `node "${id}": type must be a string, got ${JSON.stringify(type)}`,
          path: keyPath(nodeJson, "type", at),
          nodeId: id,
          got: type,
        });
      }
      if (!hasNodeType(type)) {
        const valid = listNodeTypes()
          .map((t) => t.type)
          .sort();
        const near = suggestNames(type, valid);
        fault({
          code: "unknown-node-type",
          message: `node "${id}": unknown node type "${type}"; ${near.clause}registered types: ${valid.join(", ")}`,
          path: at("/type"),
          nodeId: id,
          got: type,
          valid,
          ...suggestionFields(near, (to) => `replace "${type}" with "${to}"`),
        });
      }
      const rawParams = nodeJson.params ?? {};
      let paramsJson: Record<string, unknown> = {};
      if (isPlainObject(rawParams)) {
        paramsJson = rawParams;
      } else {
        sink.report({
          code: "invalid-section",
          message: `node "${id}": params must be an object, got ${JSON.stringify(nodeJson.params)}`,
          path: at("/params"),
          nodeId: id,
        });
      }
      const accepted = new Set<string>();
      authoredParamKeys.set(id, accepted);
      if (type === "subgraph" || type === "forEach" || type === "repeatUntil") {
        handles.set(
          id,
          addSubgraphNode(
            {
              graph,
              id,
              at,
              nodeJson,
              paramsJson,
              ctx,
              wrapper: type,
              bindings,
              declaredParams,
              accepted,
            },
            sink,
          ),
        );
        return;
      }
      // Both keys are inner-graph plumbing. Carried by any other type they
      // are a mistake — and one that used to be ignored, which is exactly how
      // a graph cooks something other than what it says. The node is still
      // built: the key changes nothing about what it cooks.
      for (const key of ["subgraph", "ref"] as const) {
        if (nodeJson[key] !== undefined) {
          sink.report({
            code: "wrapper-key-on-plain-node",
            message: `node "${id}": type "${type}" wraps no inner graph, so it cannot carry "${key}"; only "subgraph", "forEach" and "repeatUntil" nodes wrap one (inline under "subgraph", or by name under "ref")`,
            path: at(`/${key}`),
            nodeId: id,
            key,
          });
        }
      }
      const reg = getNodeType(type);
      const schemas = reg.info.params;
      const valid = Object.keys(schemas);
      const params = readParams(
        paramsJson,
        {
          id,
          at,
          // Own keys only. A plain lookup reads the prototype, so a param
          // named "toString" or "constructor" found a FUNCTION as its schema
          // and was accepted and silently dropped instead of refused.
          schemaOf: (key) => (Object.hasOwn(schemas, key) ? schemas[key] : undefined),
          valid,
          unknownMessage: (key, clause) =>
            `node "${id}": unknown param "${key}" for type "${type}"; ${clause}valid params: ${valid.join(", ")}`,
          declaredParams,
          bindings,
          accepted,
        },
        sink,
      );
      handles.set(id, graph.add(reg.def, params, id));
    });
    if (!built && claimed === undefined) anonymousPoisoned = true;
    if (!built && claimed !== undefined && !handles.has(claimed) && claimedIds.get(claimed) === i) {
      poisoned.add(claimed);
    }
  });

  // Now that every node exists, a targeted param can merge its schema from
  // the params it drives and write its value into them.
  graph.setGraphParams(
    applyTargets(graph, graphParams, authoredParamKeys, sink, skipped, (node, param) => {
      const index = claimedIds.get(node);
      return index === undefined ? undefined : `/nodes/${index}/params/${pointerToken(param)}`;
    }),
  );

  connectionsJson.forEach((connJson: unknown, i: number) => {
    const at = under(`/connections/${i}`);
    unit(sink, () => {
      if (!isPlainObject(connJson)) {
        fault({
          code: "invalid-connection",
          message: `connections[${i}]: expected a connection object, got ${JSON.stringify(connJson)}`,
          path: at(""),
        });
      }
      checkKeys(sink, connJson, CONNECTION_KEYS, `connections[${i}]`, NO_ANNOTATION_KEY, at);
      const [fromId, fromPin] = checkEndpoint(connJson.from, `connections[${i}].from`, keyPath(connJson, "from", at));
      const [toId, toPin] = checkEndpoint(connJson.to, `connections[${i}].to`, keyPath(connJson, "to", at));
      // Each end is checked unless it names a skipped node: a typo on the
      // other end is still a fault of its own.
      const fromSkipped = skipped(fromId);
      const toSkipped = skipped(toId);
      const from = handles.get(fromId);
      if (!fromSkipped && !from) {
        fault(unknownNodeFault(`connections[${i}]: unknown source node`, fromId, knownIds(), at("/from/0")));
      }
      const to = handles.get(toId);
      if (!toSkipped && !to) {
        fault(unknownNodeFault(`connections[${i}]: unknown target node`, toId, knownIds(), at("/to/0")));
      }
      // Pins come from the instance's own def: for standard nodes that is
      // the registered def, for subgraph nodes the per-instance exposed pins.
      for (const [nodeId, isSkipped, side, pin, path] of [
        [fromId, fromSkipped, "output", fromPin, at("/from/1")],
        [toId, toSkipped, "input", toPin, at("/to/1")],
      ] as const) {
        if (isSkipped) continue;
        const def = graph.require(nodeId).def;
        const pins = side === "output" ? def.outputs : def.inputs;
        if (!pins.some((p) => p.name === pin)) {
          fault(unknownPinFault(`connections[${i}]: `, nodeId, side, pin, pins, path, "(none)"));
        }
      }
      if (fromSkipped || toSkipped) return;
      try {
        graph.connect(from as NodeHandle, fromPin, to as NodeHandle, toPin);
      } catch (err) {
        const carried = diagnosticsOf(err)[0]?.code;
        fault({
          code: carried !== undefined && carried !== "error" ? carried : "invalid-connection",
          message: `connections[${i}]: ${errText(err)}`,
          path: at(""),
          nodeId: toId,
          pin: toPin,
        });
      }
    });
  });

  // Every output name an entry claimed, declared, skipped or refused: a name
  // reused after any of them is still a duplicate.
  const outputNames = new Set<string>();
  outputsJson.forEach((outJson: unknown, i: number) => {
    const at = under(`/outputs/${i}`);
    unit(sink, () => {
      if (!isPlainObject(outJson)) {
        fault({
          code: "invalid-output",
          message: `outputs[${i}]: expected an output object, got ${JSON.stringify(outJson)}`,
          path: at(""),
        });
      }
      checkKeys(sink, outJson, OUTPUT_KEYS, `outputs[${i}]`, NO_ANNOTATION_KEY, at);
      const { id, pin, name } = outJson;
      if (typeof id !== "string" || typeof pin !== "string" || typeof name !== "string") {
        fault({
          code: "invalid-output",
          message: `outputs[${i}]: expected { id, pin, name } strings, got ${JSON.stringify(outJson)}`,
          path: at(""),
          expected: "{ id, pin, name } strings",
        });
      }
      const duplicate = (): never =>
        fault({
          code: "duplicate-output-name",
          message: `outputs[${i}]: output "${name}" is already declared`,
          path: at("/name"),
          nodeId: id,
          pin,
        });
      // Claimed before anything else about this entry is judged: a second
      // output reusing the name is a fault whether or not this one is.
      const reused = outputNames.has(name);
      outputNames.add(name);
      if (skipped(id)) {
        if (reused) duplicate();
        return;
      }
      const handle = handles.get(id);
      if (!handle) fault(unknownNodeFault(`outputs[${i}]: unknown node`, id, knownIds(), at("/id")));
      const outPins = graph.require(id).def.outputs;
      if (!outPins.some((p) => p.name === pin)) {
        // No "(none)" here, unlike a connection's: this message never had one.
        fault(unknownPinFault(`outputs[${i}]: `, id, "output", pin, outPins, at("/pin"), ""));
      }
      if (reused && !graph._outputs.some((o) => o.name === name)) duplicate();
      try {
        graph.output(handle, pin, name);
      } catch (err) {
        const carried = diagnosticsOf(err)[0]?.code;
        fault({
          code:
            carried !== undefined && carried !== "error"
              ? carried
              : /already declared/.test(errText(err))
                ? "duplicate-output-name"
                : "invalid-output",
          message: `outputs[${i}]: ${errText(err)}`,
          path: at("/name"),
          nodeId: id,
          pin,
        });
      }
    });
  });

  return graph;
}
