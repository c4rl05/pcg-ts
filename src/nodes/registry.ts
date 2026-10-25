/**
 * Node registry: the standard node library registers machine-readable
 * metadata (description, pins, param schemas) so agents and tools can
 * enumerate the library's capabilities at runtime — without reading
 * source — and so graphs referencing node types by name can be
 * serialized and deserialized (see serialize.ts).
 */
import {
  type NodeDef,
  type NodeExecuteArgs,
  type NodeOutputs,
  type ParamSchema,
  type ParamType,
  type ParamValue,
  type PinDef,
  type PinKind,
  type ResidentDesc,
} from "../graph/index.js";
// Reached by MODULE rather than through the graph layer's index: the link
// is internal plumbing between the two layers, not API. See its header.
// `paramSchemaError` is the same case — an @internal message builder the
// graph layer's index no longer republishes.
import { paramSchemaError } from "../graph/params.js";
import { defParamSchemas } from "../graph/paramSchemaLink.js";

/**
 * A node definition plus registry metadata, passed to {@link standardNode}.
 * `defaultParams` is derived from the schemas' `default` values, so the
 * schema is the single source of truth.
 *
 * `I` and `O` are the input and output pin names, `string` by default. The
 * standard nodes pass their generated unions from `params.generated.ts`,
 * which is what types a `Graph.add` handle's pins; a third-party spec that
 * names `P` keeps `string` pins and connects exactly as before. (A call
 * naming no type argument at all has TypeScript infer `P`, `I` and `O`
 * together, so its literal pin names become the types.)
 */
export interface NodeSpec<P, I extends string = string, O extends string = string> {
  /** Node type name; must be unique across the registry. */
  readonly type: string;
  /** What the node does — agent-facing documentation. */
  readonly description: string;
  /**
   * Optional grouping label for palettes and generated docs. Short and
   * lowercase; the standard library uses "source" (emits points from
   * nothing), "sampler" (points from existing geometry), "surface"
   * (builds triangle mesh from curves), "point op" (transforms a point
   * cloud), "filter" (keeps a subset), "attribute"
   * (attribute create/promote/transfer), "value" (plain value plumbing),
   * "spawn" (graph terminals emitting instances), "io" (runtime data
   * bridges), and "composite" (nodes wrapping inner graphs). Omit it to
   * leave a type uncategorized (valid for third-party nodes; tools fall
   * back to their own grouping).
   */
  readonly category?: string;
  readonly inputs: readonly PinDef<I>[];
  readonly outputs: readonly PinDef<O>[];
  /** One schema per param; keys must exactly match `P`. */
  readonly params: { readonly [K in keyof P]-?: ParamSchema };
  execute(args: NodeExecuteArgs<P>): NodeOutputs | Promise<NodeOutputs>;
  memoKey?(): string;
  /** GPU adoption declaration, copied onto the def; see {@link NodeDef.gpu}. */
  readonly gpu?: "fields" | "always";
  /** Resident-fusion declaration, copied onto the def; see {@link NodeDef.resident}. */
  readonly resident?: ResidentDesc<P>;
  /**
   * Budget self-metering declaration, copied onto the def AND — unlike
   * `gpu` and `resident` — published in the JSON-safe catalog; see
   * {@link NodeDef.selfMetered} and {@link NodeTypeInfo.selfMetered}.
   */
  readonly selfMetered?: boolean;
}

/** JSON-safe pin metadata. */
export interface PinInfo {
  readonly name: string;
  readonly kind: PinKind;
  readonly multi: boolean;
  /**
   * Input pins: whether the node needs this pin connected to cook — `true`
   * unless the def marks it {@link PinDef.optional}. An unconnected
   * required pin on a node that feeds an output is what `diagnoseGraph`
   * reports as `required-pin-unconnected`. Output pins: always `false`,
   * since nothing needs an output connected.
   */
  readonly required: boolean;
  /**
   * Output pins only: present, and `true`, on a `PinDef.onDemand` pin, one
   * the node builds only when a connection or a declared graph output
   * reads it. A host that declares outputs on its own (an editor showing
   * every unconnected pin) must leave these out, or it builds the side
   * output it was meant to skip and draws it as if it were a result.
   * Absent on every other pin.
   */
  readonly onDemand?: true;
}

/** JSON-safe metadata of one registered node type. */
export interface NodeTypeInfo {
  readonly type: string;
  readonly description: string;
  /** Grouping label (see {@link NodeSpec.category}); absent when the type declared none. */
  readonly category?: string;
  readonly inputs: readonly PinInfo[];
  readonly outputs: readonly PinInfo[];
  readonly params: Record<string, ParamSchema>;
  /**
   * Present and `true` only on types that METER THE COOK'S TIME BUDGET
   * THEMSELVES: their `execute` reads `CookOptions.budgetMs` and yields
   * to the event loop inside itself, so `NodeDoneInfo.elapsedMs` for one
   * of their instances is wall time spanning those yields rather than an
   * uninterrupted block. Absent means the ordinary case — the executor
   * timed one uninterrupted run — exactly as an absent `category` means
   * uncategorized.
   *
   * It is HERE, in the catalog, and not only on the def, because the
   * question "which of these types are not a block?" is one a consumer
   * has to answer about types it did not write, before it decides what a
   * timing means. Published, it is one field to read; unpublished, it is
   * a hardcoded list of our type names in someone else's repository,
   * free to drift from this one. See {@link NodeDef.selfMetered}.
   *
   * `subgraph`, `forEach` and `repeatUntil` carry it.
   */
  readonly selfMetered?: boolean;
}

/** A registered node type: the executable def plus its JSON-safe metadata. */
export interface RegisteredNodeType {
  readonly def: NodeDef<Record<string, unknown>>;
  readonly info: NodeTypeInfo;
}

const registry = new Map<string, RegisteredNodeType>();

function specError(type: string, message: string): Error {
  return new Error(`standardNode "${type}": ${message}`);
}

function copyParamValue(v: ParamValue): ParamValue {
  return Array.isArray(v) ? ([...v] as ParamValue) : v;
}

function copySchema(schema: ParamSchema): ParamSchema {
  const copy: {
    type: ParamType;
    default: ParamValue;
    description: string;
    enum?: readonly string[];
    acceptsField?: boolean;
    min?: number;
    max?: number;
    acceptsInfinite?: boolean;
    renamed?: ParamSchema["renamed"];
  } = {
    type: schema.type,
    default: copyParamValue(schema.default),
    description: schema.description,
  };
  if (schema.enum !== undefined) copy.enum = [...schema.enum];
  if (schema.acceptsField !== undefined) copy.acceptsField = schema.acceptsField;
  if (schema.min !== undefined) copy.min = schema.min;
  if (schema.max !== undefined) copy.max = schema.max;
  if (schema.acceptsInfinite !== undefined) copy.acceptsInfinite = schema.acceptsInfinite;
  if (schema.renamed !== undefined) {
    copy.renamed = Object.fromEntries(Object.entries(schema.renamed).map(([k, v]) => [k, { to: v.to, why: v.why }]));
  }
  return copy;
}

/**
 * Catalog pins from a def's pins. `required` is decided here, once, from
 * `optional` and the side: an input is required unless marked optional,
 * and an output is never required.
 */
function pinInfos(pins: readonly PinDef[], side: "input" | "output"): PinInfo[] {
  // Decided once, outside the per-pin closure (the param-string rule).
  const isOutput = side === "output";
  return pins.map((p) => ({
    name: p.name,
    kind: p.kind,
    multi: p.multi === true,
    required: side === "input" && p.optional !== true,
    ...(isOutput && p.onDemand === true ? { onDemand: true as const } : {}),
  }));
}

/** A caller's copy of catalog pins, field by field like everything else here. */
function copyPins(pins: readonly PinInfo[]): PinInfo[] {
  return pins.map((p) => ({
    name: p.name,
    kind: p.kind,
    multi: p.multi,
    required: p.required,
    ...(p.onDemand === true ? { onDemand: true as const } : {}),
  }));
}

/**
 * Validate a node spec (non-empty descriptions, complete param schemas,
 * defaults matching schema types), register it in the global registry,
 * and return its executable {@link NodeDef}. `defaultParams` is built
 * from the schemas. Duplicate type names throw.
 */
export function standardNode<P, I extends string = string, O extends string = string>(
  spec: NodeSpec<P, I, O>,
): NodeDef<P, I, O> {
  if (typeof spec.type !== "string" || spec.type.trim() === "") {
    throw new Error("standardNode: spec.type must be a non-empty string");
  }
  if (registry.has(spec.type)) {
    throw specError(spec.type, "a node type with this name is already registered");
  }
  if (typeof spec.description !== "string" || spec.description.trim() === "") {
    throw specError(spec.type, "must have a non-empty description");
  }
  if (
    spec.category !== undefined &&
    (typeof spec.category !== "string" || spec.category.trim() === "")
  ) {
    throw specError(
      spec.type,
      "category, when present, must be a non-empty string (omit it to leave the type uncategorized)",
    );
  }
  const defaultParams: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries<ParamSchema>(spec.params)) {
    // A panel addresses a param as "<nodeId>.<paramKey>", and a param
    // inside a field spec as "<nodeId>.<paramKey>.<fieldParamName>", both
    // read from the RIGHT — which works only while the param key has no
    // dot of its own. Every registered name is dot-free today; this is
    // what keeps that a rule rather than a coincidence, the same way
    // `fieldJson.ts` already refuses a dotted field-spec param name.
    if (name.includes(".")) {
      throw specError(
        spec.type,
        `param "${name}" contains a "."; a panel addresses a param as "<nodeId>.<paramKey>", so a ` +
          "dot inside the key itself would split that address in a place nothing can put back " +
          "together — rename the param without a dot",
      );
    }
    const bad = paramSchemaError(schema);
    if (bad !== undefined) throw specError(spec.type, `param "${name}" ${bad}`);
    defaultParams[name] = copyParamValue(schema.default);
  }

  const def: NodeDef<P, I, O> = {
    type: spec.type,
    inputs: spec.inputs,
    outputs: spec.outputs,
    defaultParams: defaultParams as P,
    execute: (args) => spec.execute(args),
    ...(spec.memoKey !== undefined ? { memoKey: spec.memoKey.bind(spec) } : {}),
    ...(spec.gpu !== undefined ? { gpu: spec.gpu } : {}),
    ...(spec.resident !== undefined ? { resident: spec.resident } : {}),
    ...(spec.selfMetered !== undefined ? { selfMetered: spec.selfMetered } : {}),
  };
  const params: Record<string, ParamSchema> = {};
  for (const [name, schema] of Object.entries<ParamSchema>(spec.params)) {
    params[name] = copySchema(schema);
  }
  // Publish the schemas to the graph layer, which cannot import this one,
  // so `Graph.add` and `Graph.setParam` can refuse a value at the write.
  // The registry's own copies — the same objects `listNodeTypes` copies
  // again for callers — so the two can never describe different bounds.
  defParamSchemas.set(def, params);
  registry.set(spec.type, {
    def: def as unknown as NodeDef<Record<string, unknown>>,
    info: {
      type: spec.type,
      description: spec.description,
      ...(spec.category !== undefined ? { category: spec.category } : {}),
      inputs: pinInfos(spec.inputs, "input"),
      outputs: pinInfos(spec.outputs, "output"),
      params,
      // Spread conditionally, like `category`, so the emitted key order
      // is fixed and a type that does not self-meter carries no key at
      // all — the catalog's JSON stays byte-identical for every one of
      // them.
      ...(spec.selfMetered !== undefined ? { selfMetered: spec.selfMetered } : {}),
    },
  });
  return def;
}

/**
 * Look up a registered node type by name. Throws an error listing all
 * registered type names when the type is unknown.
 */
export function getNodeType(type: string): RegisteredNodeType {
  const entry = registry.get(type);
  if (!entry) {
    throw new Error(
      `unknown node type "${type}"; registered types: ${[...registry.keys()].sort().join(", ")}`,
    );
  }
  return entry;
}

/** Whether a node type name is registered. */
export function hasNodeType(type: string): boolean {
  return registry.has(type);
}

/**
 * JSON-safe metadata for every registered node type, in registration
 * order: type name, description, category (when declared), pins,
 * per-param schemas (type, default, description, enum values, field
 * capability, bounds), and `selfMetered` (when declared). This is the
 * runtime capability catalog for agents authoring graphs.
 */
export function listNodeTypes(): NodeTypeInfo[] {
  return [...registry.values()].map((entry) => ({
    type: entry.info.type,
    description: entry.info.description,
    ...(entry.info.category !== undefined ? { category: entry.info.category } : {}),
    inputs: copyPins(entry.info.inputs),
    outputs: copyPins(entry.info.outputs),
    params: Object.fromEntries(
      Object.entries(entry.info.params).map(([k, s]) => [k, copySchema(s)]),
    ),
    // Rebuilt field by field, exactly like `category` above, so a field
    // added to NodeTypeInfo and not added HERE is silently dropped from
    // every caller's copy while the stored `info` still carries it.
    ...(entry.info.selfMetered !== undefined ? { selfMetered: entry.info.selfMetered } : {}),
  }));
}
