/**
 * A JSON Schema (draft 2020-12) for the serialized graph format, generated
 * from the live registries so it cannot drift from them.
 *
 * WHAT IT IS FOR. An agent or an editor can validate and autocomplete a
 * graph file without running the loader: the node `type` enum, each type's
 * closed `params` with their types, enums and bounds, the field grammar with
 * one closed object per `fn`, and every primitive a `ref` can name with its
 * exposed params. `deserializeGraph` stays the authority. The schema is
 * built to be NEVER STRICTER than it — a document the loader accepts must
 * validate — and as close to it as a context-free schema can get; what it
 * cannot express is stated in the root `$comment` rather than guessed at.
 *
 * WHERE EACH ANSWER COMES FROM, so a reader can tell generated from written:
 *
 *   - node types and param schemas: `listNodeTypes()`, each value's shape
 *     through `paramJsonSchema` — the same table `params.generated.ts` is
 *     rendered from, so the TypeScript and the JSON Schema cannot disagree
 *     about what a param type is;
 *   - field fns, their keys and their `args` arity: `listFieldFnInfos()`;
 *     the TYPE of each non-`args` key: {@link FIELD_SPEC_KEY_RULES} below,
 *     which a completeness test holds against that list;
 *   - primitives: `listSubgraphs()`, each one MATERIALIZED through
 *     `deserializeGraph` as a `ref` node under every wrapper type, which is
 *     how the catalog and `pcg run` read a primitive's exposed params — the
 *     derivation the loader itself performs, rather than a second reading
 *     of the recipe payload;
 *   - the format's own keys: this file, matching the closed key lists in
 *     `serialize.ts`.
 *
 * DETERMINISTIC BYTES: every list is sorted by name and every object's keys
 * are sorted before return, so `JSON.stringify` of the result is the same
 * whatever order anything was registered in.
 */
import type { JsonValue } from "../diagnostics/index.js";
import { MAX_LOOKUP_TABLE } from "../fields/spec.js";
import { type FieldFnInfo, listFieldFnInfos } from "../fields/fieldJson.js";
import { GRAPH_META_KEYS } from "../graph/graph.js";
import {
  type Graph,
  type ParamSchema,
  type WrapperKind,
  describeSubgraphParams,
} from "../graph/index.js";
import { NOISE_BASES, WORLEY_OUTPUTS } from "../noise/bases.js";
import { MAX_SEED_VARIANT } from "../noise/util.js";
import { type JsonSchemaObject, paramJsonSchema } from "./paramTypeMap.js";
import { type NodeTypeInfo, listNodeTypes } from "./registry.js";
import { deserializeGraph } from "./serialize.js";
import { type RegisteredSubgraph, listSubgraphs } from "./subgraphRegistry.js";

/** Options for {@link graphJsonSchema}. */
export interface GraphJsonSchemaOptions {
  /**
   * Carry the registries' prose as `description` annotations: each node
   * type's, each param's, each field fn's, each primitive's. Default `true`.
   * `false` gives the same constraints in far fewer bytes.
   */
  readonly descriptions?: boolean;
  /**
   * Describe ONE node object of this registered type instead of a whole
   * graph: the root is that node's schema, with only the definitions it
   * reaches. Throws for a type that is not registered, listing those that
   * are.
   */
  readonly nodeType?: string;
}

/** The published location of the generated schema, and its `$id`. */
export const GRAPH_SCHEMA_ID = "https://c4rl05.github.io/pcg-ts/graph.schema.json";

const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";

const FIELD_SPEC_REF = "#/$defs/fieldSpec";
const FIELD_ARG_REF = "#/$defs/fieldArg";

/** The wrapper types, sorted: the loader dispatches on exactly these names. */
const WRAPPER_TYPES: readonly WrapperKind[] = ["forEach", "repeatUntil", "subgraph"];

function isWrapper(type: string): type is WrapperKind {
  return (WRAPPER_TYPES as readonly string[]).includes(type);
}

/**
 * What the root `$comment` says the schema does not check. Every entry is a
 * rule `deserializeGraph` enforces that no context-free schema can state, or
 * one that depends on values only a cook has.
 */
const OUT_OF_SCOPE =
  "Generated from the pcg-ts registries by graphJsonSchema(); deserializeGraph is the authority, and this schema " +
  "is built never to reject a document it accepts. Not checked here: that numbers are finite and not -0 (JSON " +
  "cannot carry a non-finite number, and a -0 reloads as 0, so serializeGraph refuses one); field-spec nesting " +
  "depth (256 levels); tuple-width broadcast rules between field arguments, and a component index or ramp stops " +
  "that must fit the values they meet (stops strictly ascending); param BINDINGS — which name a {\"fn\": \"param\"} " +
  "reads, and the refusal of an inline value that shadows a declared graph param; min <= max, and a value inside " +
  "its own min/max, on an inline param or a graph param; a graph param's merged schema against its targets; " +
  "unique names among a graph's params and among a payload's exposed params; " +
  "every id and pin cross-reference — unique node ids, " +
  "connections, outputs, exposed pins and param targets naming nodes and pins that exist, pin kinds, occupancy " +
  "and cycles; the reserved exposed-pin names (each, eachPoint, carry) and the __in_/__out_ plumbing names; " +
  "that a targetless exposed param is read by some expression in its body; and the param VALUES on a wrapper " +
  "node with an INLINE payload, which the payload's own declarations type rather than a registry. null for a graph's connections or outputs, or for a node's params, is read as absent, as the loader " +
  "reads it. A top-level \"$schema\" string is admitted here; the loader in this release does not yet accept it.";

// ---------------------------------------------------------------------------
// The field grammar's non-`args` keys.
// ---------------------------------------------------------------------------

/** What one field-spec key must hold, and whether a spec must carry it. */
export interface FieldKeyRule {
  readonly schema: JsonSchemaObject;
  readonly required: boolean;
}

/**
 * One key's rule: the same for every fn that takes it (`rule`), or per fn
 * (`byFn`) where the fns disagree — `value` is a number or tuple on
 * `constant` and `param` but a string on `attributeIs`, and each noise has
 * its own option set.
 */
export interface FieldKeyEntry {
  readonly rule?: FieldKeyRule;
  readonly byFn?: Readonly<Record<string, FieldKeyRule>>;
}

const NUMBER: JsonSchemaObject = { type: "number" };
const BOOLEAN: JsonSchemaObject = { type: "boolean" };
const NON_EMPTY_STRING: JsonSchemaObject = { type: "string", minLength: 1 };
/** `constant`'s shapes: a number, or a non-empty array of numbers. */
const NUMBER_OR_TUPLE: JsonSchemaObject = {
  anyOf: [NUMBER, { type: "array", items: NUMBER, minItems: 1 }],
};
/** A `param` name: non-empty and dot-free, because a knob address splits on dots. */
const FIELD_PARAM_NAME: JsonSchemaObject = { type: "string", minLength: 1, pattern: "^[^.]+$" };
/** Prose that must say something: non-empty after trimming. */
const NON_BLANK_STRING: JsonSchemaObject = { type: "string", pattern: "\\S" };

/**
 * `opts.seed`: an integer, or the node-seed ref whose `variant` is an
 * integer in range or an inline `param` spec.
 *
 * The inline `param` in that position is deliberately NOT closed: the reader
 * (`parseSeedVariantParam` in `src/fields/fieldJson.ts`) reads its name,
 * value and metadata without checking for other keys, and a schema that
 * refused what the reader takes would be stricter than the authority.
 */
const NOISE_SEED: JsonSchemaObject = {
  anyOf: [
    { type: "integer" },
    {
      type: "object",
      required: ["from"],
      properties: {
        from: { const: "node" },
        variant: {
          anyOf: [
            { type: "integer", minimum: 0, maximum: MAX_SEED_VARIANT },
            {
              type: "object",
              required: ["fn", "name"],
              properties: {
                fn: { const: "param" },
                name: FIELD_PARAM_NAME,
                value: NUMBER_OR_TUPLE,
                min: NUMBER,
                max: NUMBER,
                description: NON_BLANK_STRING,
              },
              $comment: "Open: the reader of a seed variant's param spec does not close its keys.",
            },
          ],
        },
      },
      additionalProperties: false,
    },
  ],
};

/** The options every noise shares, keyed as the reader names them. */
const SHARED_NOISE_OPTS: Readonly<Record<string, JsonSchemaObject>> = {
  seed: NOISE_SEED,
  frequency: NUMBER,
  offset: { type: "array", items: NUMBER, minItems: 3, maxItems: 3 },
  position: { $ref: FIELD_ARG_REF },
};

function noiseOpts(extra: Readonly<Record<string, JsonSchemaObject>>): FieldKeyRule {
  return {
    schema: { type: "object", properties: { ...SHARED_NOISE_OPTS, ...extra }, additionalProperties: false },
    required: false,
  };
}

const SIMPLE_NOISE_OPTS = noiseOpts({ normalized: BOOLEAN });

/**
 * The type of every non-`args` key the field grammar takes, per fn where
 * the fns disagree. `args` is not here: its arity is read from each fn's
 * published argument list. The completeness test in `graphSchema.test.ts`
 * holds this table against `listFieldFnInfos()` in both directions — every
 * key a fn takes resolves here, and nothing here is unused.
 */
export const FIELD_SPEC_KEY_RULES: Readonly<Record<string, FieldKeyEntry>> = {
  base: {
    rule: { schema: { type: "string", enum: Object.keys(NOISE_BASES).sort() }, required: true },
  },
  cases: {
    rule: {
      schema: { type: "object", minProperties: 1, additionalProperties: { $ref: FIELD_ARG_REF } },
      required: true,
    },
  },
  default: { rule: { schema: { $ref: FIELD_ARG_REF }, required: true } },
  description: { byFn: { param: { schema: NON_BLANK_STRING, required: false } } },
  index: { rule: { schema: { type: "integer", minimum: 0 }, required: true } },
  key: { rule: { schema: { type: ["number", "string"] }, required: false } },
  max: { byFn: { param: { schema: NUMBER, required: false } } },
  min: { byFn: { param: { schema: NUMBER, required: false } } },
  name: {
    rule: { schema: NON_EMPTY_STRING, required: true },
    byFn: { param: { schema: FIELD_PARAM_NAME, required: true } },
  },
  opts: {
    byFn: {
      fbm: noiseOpts({
        normalized: BOOLEAN,
        octaves: { type: "integer", minimum: 1 },
        lacunarity: NUMBER,
        gain: NUMBER,
      }),
      perlinNoise: SIMPLE_NOISE_OPTS,
      simplexNoise: SIMPLE_NOISE_OPTS,
      valueNoise: SIMPLE_NOISE_OPTS,
      // No `normalized`: a world position has no range to map. And no zero
      // frequency, which `worleyFeature` refuses: mapping every position to
      // one noise point has no inverse to report a position through.
      worleyFeature: noiseOpts({ exact: BOOLEAN, frequency: { type: "number", not: { const: 0 } } }),
      worleyNoise: noiseOpts({
        normalized: BOOLEAN,
        output: { type: "string", enum: [...WORLEY_OUTPUTS] },
        exact: BOOLEAN,
      }),
    },
  },
  stops: {
    rule: {
      schema: {
        type: "array",
        minItems: 1,
        items: { type: "array", prefixItems: [NUMBER, NUMBER], items: false, minItems: 2 },
      },
      required: true,
    },
  },
  table: {
    rule: {
      schema: { type: "array", items: NUMBER, minItems: 1, maxItems: MAX_LOOKUP_TABLE },
      required: true,
    },
  },
  tupleSize: { rule: { schema: { type: "integer", minimum: 1 }, required: false } },
  value: {
    byFn: {
      attributeIs: { schema: { type: "string" }, required: true },
      constant: { schema: NUMBER_OR_TUPLE, required: true },
      param: { schema: NUMBER_OR_TUPLE, required: false },
    },
  },
};

/**
 * The rule for one key of one fn, or a refusal naming the table to extend.
 * Exported for the completeness test.
 */
export function fieldSpecKeyRule(fn: string, key: string): FieldKeyRule {
  const entry = Object.hasOwn(FIELD_SPEC_KEY_RULES, key) ? FIELD_SPEC_KEY_RULES[key] : undefined;
  const rule = entry?.byFn !== undefined && Object.hasOwn(entry.byFn, fn) ? entry.byFn[fn] : entry?.rule;
  if (rule === undefined) {
    throw new Error(
      `graphJsonSchema: field fn "${fn}" takes key "${key}", but FIELD_SPEC_KEY_RULES in ` +
        `src/nodes/graphSchema.ts has no rule for it; add one (under "byFn" if its type differs between fns)`,
    );
  }
  return rule;
}

/**
 * Constraints on a fn that are about how its keys go together rather than
 * what one key holds. `param`'s metadata describes an inline value and is
 * refused without one.
 */
const FIELD_FN_EXTRAS: Readonly<Record<string, JsonSchemaObject>> = {
  param: { dependentRequired: { description: ["value"], max: ["value"], min: ["value"] } },
};

function fieldFnSchema(info: FieldFnInfo, descriptions: boolean): JsonSchemaObject {
  const properties: Record<string, JsonSchemaObject> = { fn: { const: info.fn } };
  const required = ["fn"];
  for (const key of info.keys) {
    if (key === "args") {
      const args = info.args;
      if (args === undefined || args.length === 0) {
        throw new Error(
          `graphJsonSchema: field fn "${info.fn}" takes "args" but publishes no argument list, so its arity cannot be read`,
        );
      }
      // A trailing `…` marks a REPEATED position (see FieldFnInfo.args):
      // at least that many, with no upper bound.
      const variadic = args.some((a) => a.name.endsWith("…"));
      properties.args = {
        type: "array",
        items: { $ref: FIELD_ARG_REF },
        minItems: args.length,
        ...(variadic ? {} : { maxItems: args.length }),
      };
      required.push("args");
      continue;
    }
    const rule = fieldSpecKeyRule(info.fn, key);
    properties[key] = rule.schema;
    if (rule.required) required.push(key);
  }
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
    ...(FIELD_FN_EXTRAS[info.fn] ?? {}),
    ...(descriptions ? { description: `${info.usage} — ${info.description}` } : {}),
  };
}

function fieldDefs(descriptions: boolean): Record<string, JsonSchemaObject> {
  const infos = listFieldFnInfos();
  const defs: Record<string, JsonSchemaObject> = {
    fieldArg: {
      anyOf: [NUMBER, { type: "array", items: NUMBER, minItems: 1 }, { $ref: FIELD_SPEC_REF }],
      ...(descriptions
        ? { description: "A field argument: a nested field spec, a number, or a non-empty number array (a constant)." }
        : {}),
    },
    fieldSpec: {
      type: "object",
      required: ["fn"],
      properties: { fn: { type: "string", enum: infos.map((i) => i.fn) } },
      allOf: infos.map((info) => ({
        if: { properties: { fn: { const: info.fn } }, required: ["fn"] },
        then: { $ref: `#/$defs/fieldFn.${info.fn}` },
      })),
      ...(descriptions
        ? { description: "A declarative field expression: a constructor named by `fn` plus its keys." }
        : {}),
    },
  };
  for (const info of infos) defs[`fieldFn.${info.fn}`] = fieldFnSchema(info, descriptions);
  return defs;
}

// ---------------------------------------------------------------------------
// Primitives: what a `ref` can name, and the params each one exposes.
// ---------------------------------------------------------------------------

/** One registered subgraph, as the loader resolves a `ref` to it. */
interface RefTarget {
  readonly entry: RegisteredSubgraph;
  /** Every wrapper type under which a `ref` to it loads, with the params that type then takes. */
  readonly loads: readonly { readonly type: WrapperKind; readonly params: Readonly<Record<string, ParamSchema>> }[];
}

const PROBE_ID = "probe";

/**
 * Materialize `entry` as a `ref` node under each wrapper type and read the
 * params the result exposes — the loader's own derivation, so the schema
 * cannot type a param differently from how it is checked.
 *
 * A type the probe refuses (a plain body under `forEach`, say) is one a
 * document cannot use either, so it is simply absent. A primitive no probe
 * loads gets no branch at all rather than a guessed one: its name stays
 * valid and its params stay open, which errs toward the loader.
 */
function probeRefTarget(
  entry: RegisteredSubgraph,
  repeatUntilParams: Readonly<Record<string, ParamSchema>>,
): RefTarget {
  const loads: { type: WrapperKind; params: Record<string, ParamSchema> }[] = [];
  for (const type of WRAPPER_TYPES) {
    let graph: Graph;
    try {
      graph = deserializeGraph({
        formatVersion: 1,
        seed: 0,
        nodes: [{ id: PROBE_ID, type, params: {}, ref: { name: entry.name } }],
        connections: [],
        outputs: [],
      });
    } catch {
      continue;
    }
    const state = graph._nodes.get(PROBE_ID);
    const described = state === undefined ? undefined : describeSubgraphParams(state.def);
    if (described === undefined) continue;
    const params: Record<string, ParamSchema> = {};
    for (const p of described) params[p.name] = p.schema;
    // The loop's own two params, which the reader sets OVER the exposed ones
    // of the same name (see `buildSubgraphNode` in serialize.ts).
    if (type === "repeatUntil") Object.assign(params, repeatUntilParams);
    loads.push({ type, params });
  }
  return { entry, loads };
}

// ---------------------------------------------------------------------------
// The format.
// ---------------------------------------------------------------------------

interface Context {
  readonly descriptions: boolean;
}

function described(ctx: Context, schema: JsonSchemaObject, text: string): JsonSchemaObject {
  return ctx.descriptions ? { ...schema, description: text } : schema;
}

/** A node's (or an exposed param's) `params` object, closed over `params`. */
function closedParams(ctx: Context, params: Readonly<Record<string, ParamSchema>>): JsonSchemaObject {
  const properties: Record<string, JsonSchemaObject> = {};
  for (const name of Object.keys(params).sort()) {
    const schema = params[name]!;
    properties[name] = described(
      ctx,
      { ...paramJsonSchema(schema, FIELD_SPEC_REF), default: schema.default as JsonValue },
      schema.description,
    );
  }
  return { type: ["object", "null"], properties, additionalProperties: false };
}

function refBranch(ctx: Context, target: RefTarget): JsonSchemaObject | undefined {
  const { entry, loads } = target;
  if (loads.length === 0) return undefined;
  const byType = loads.map((load) => ({
    properties: { type: { const: load.type }, params: closedParams(ctx, load.params) },
  }));
  const then: JsonSchemaObject = {
    properties: {
      ref: {
        type: "object",
        properties: { hash: { type: "string", const: entry.hash } },
      },
      ...(byType.length === 1 ? byType[0]!.properties : {}),
    },
    ...(byType.length === 1 ? {} : { anyOf: byType }),
  };
  const prose = entry.meta?.description ?? entry.meta?.title;
  return {
    if: {
      properties: { ref: { type: "object", properties: { name: { const: entry.name } }, required: ["name"] } },
      required: ["ref"],
    },
    then: prose === undefined ? then : described(ctx, then, `Primitive "${entry.name}": ${prose}`),
  };
}

function nodeTypeBranch(ctx: Context, info: NodeTypeInfo): JsonSchemaObject {
  const test = { properties: { type: { const: info.type } }, required: ["type"] };
  if (!isWrapper(info.type)) {
    return {
      if: test,
      then: described(
        ctx,
        {
          properties: { params: closedParams(ctx, info.params), ref: false, subgraph: false },
        },
        info.description,
      ),
    };
  }
  // A wrapper carries exactly one of the two. Its params are OPEN here: an
  // inline body declares them inside the payload, and a `ref` is closed by
  // the primitive's own branch. Only the loop's own params, which exist on
  // every instance whatever the body exposes, are typed.
  const own = Object.keys(info.params).sort();
  const properties: Record<string, JsonSchemaObject> = {};
  for (const name of own) {
    const schema = info.params[name]!;
    properties[name] = described(
      ctx,
      { ...paramJsonSchema(schema, FIELD_SPEC_REF), default: schema.default as JsonValue },
      schema.description,
    );
  }
  return {
    if: test,
    then: described(
      ctx,
      {
        oneOf: [
          { properties: { subgraph: true }, required: ["subgraph"] },
          { properties: { ref: true }, required: ["ref"] },
        ],
        properties: {
          params: {
            type: ["object", "null"],
            ...(own.length > 0 ? { properties } : {}),
          },
        },
      },
      info.description,
    ),
  };
}

function nodeSchema(ctx: Context, types: readonly NodeTypeInfo[], refs: readonly RefTarget[]): JsonSchemaObject {
  const wraps = types.some((t) => isWrapper(t.type));
  const branches: JsonSchemaObject[] = types.map((info) => nodeTypeBranch(ctx, info));
  if (wraps) {
    for (const target of refs) {
      const branch = refBranch(ctx, target);
      if (branch !== undefined) branches.push(branch);
    }
  }
  return {
    type: "object",
    required: ["id", "type"],
    properties: {
      id: described(ctx, NON_EMPTY_STRING, "Node id, unique within its graph."),
      type: described(
        ctx,
        { type: "string", enum: types.map((t) => t.type) },
        "Registered node type (see listNodeTypes, or `pcg nodes`).",
      ),
      params: described(
        ctx,
        { type: ["object", "null"] },
        "Param values by name; a field-capable param may hold a field spec. On a wrapper node, the values of its exposed params.",
      ),
      ...(wraps
        ? {
            ref: { $ref: "#/$defs/subgraphRef" },
            subgraph: { $ref: "#/$defs/subgraphPayload" },
          }
        : { ref: false, subgraph: false }),
    },
    additionalProperties: false,
    allOf: branches,
  };
}

/** The graph object: `top` adds the keys only the outermost graph may carry. */
function graphObject(ctx: Context, top: boolean): JsonSchemaObject {
  const properties: Record<string, JsonSchemaObject> = {
    formatVersion: described(ctx, { const: 1 }, "Format version; this build reads 1."),
    seed: described(ctx, NUMBER, "Graph seed. Every random draw derives from it, the node id and the element."),
    meta: { $ref: "#/$defs/meta" },
    nodes: { type: "array", items: { $ref: "#/$defs/node" } },
    connections: described(
      ctx,
      { type: ["array", "null"], items: { $ref: "#/$defs/connection" } },
      "Wires, each from an output pin to an input pin.",
    ),
    outputs: described(
      ctx,
      { type: ["array", "null"], items: { $ref: "#/$defs/output" } },
      "Declared terminal outputs.",
    ),
  };
  if (top) {
    properties.$schema = described(ctx, { type: "string" }, "The schema this document is written against.");
    properties.params = described(
      ctx,
      { type: "array", items: { $ref: "#/$defs/graphParam" } },
      "Graph-scoped params, read by name from field expressions or written into node params through targets. The outermost graph only.",
    );
  }
  return { type: "object", required: ["formatVersion", "seed", "nodes"], properties, additionalProperties: false };
}

function formatDefs(ctx: Context, refNames: readonly string[]): Record<string, JsonSchemaObject> {
  // A graph param's targets must name something (non-empty strings); an
  // exposed param's reader checks only that they are strings, and leaves the
  // rest to the resolver — so the schema does the same.
  const target = (nonEmpty: boolean): JsonSchemaObject => {
    const name = nonEmpty ? NON_EMPTY_STRING : { type: "string" };
    return {
      type: "object",
      required: ["node", "param"],
      properties: { node: name, param: name },
      additionalProperties: false,
    };
  };
  const pin = (text: string): JsonSchemaObject =>
    described(
      ctx,
      {
        type: "object",
        required: ["name", "node", "pin"],
        properties: { name: { type: "string" }, node: { type: "string" }, pin: { type: "string" } },
        additionalProperties: false,
      },
      text,
    );
  const metaProperties: Record<string, JsonSchemaObject> = {};
  for (const key of GRAPH_META_KEYS) {
    metaProperties[key] = key === "tags" ? { type: "array", items: { type: "string" } } : { type: "string" };
  }
  return {
    graph: described(
      ctx,
      graphObject(ctx, false),
      "A graph nested in a subgraph payload: the format without graph-scoped params.",
    ),
    meta: described(
      ctx,
      { type: "object", properties: metaProperties, additionalProperties: false },
      "Descriptive block; cooking never reads it.",
    ),
    connection: {
      type: "object",
      required: ["from", "to"],
      properties: { from: { $ref: "#/$defs/endpoint" }, to: { $ref: "#/$defs/endpoint" } },
      additionalProperties: false,
    },
    endpoint: described(
      ctx,
      { type: "array", prefixItems: [{ type: "string" }, { type: "string" }], items: false, minItems: 2 },
      "[nodeId, pinName].",
    ),
    output: {
      type: "object",
      required: ["id", "pin", "name"],
      properties: { id: { type: "string" }, pin: { type: "string" }, name: { type: "string" } },
      additionalProperties: false,
    },
    graphParam: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1, pattern: "^(?!\\$)[^.]+$" },
        value: true,
        targets: { type: "array", items: target(true) },
        min: NUMBER,
        max: NUMBER,
        description: { type: "string" },
      },
      additionalProperties: false,
      // Targetless (absent or empty targets), the value is what an
      // expression can read: a number, a vec3 or a vec4. Targeted, it is
      // judged against the targets' merged schema, which the loader reads.
      if: { properties: { targets: { type: "array", minItems: 1 } }, required: ["targets"] },
      else: {
        properties: {
          value: { anyOf: [NUMBER, { type: "array", items: NUMBER, minItems: 3, maxItems: 4 }] },
        },
        required: ["value"],
      },
    },
    subgraphRef: described(
      ctx,
      {
        type: "object",
        required: ["name"],
        properties: {
          name: refNames.length > 0 ? { type: "string", enum: [...refNames] } : false,
          hash: { type: "string" },
        },
        additionalProperties: false,
      },
      "A registered subgraph (a primitive) by name, optionally pinned to its content hash.",
    ),
    subgraphPayload: described(
      ctx,
      {
        type: "object",
        required: ["graph"],
        properties: {
          graph: { $ref: "#/$defs/graph" },
          inputs: {
            type: "array",
            items: pin("An exposed input pin: its name on the wrapper, and the inner node and pin it maps to."),
          },
          outputs: {
            type: "array",
            items: pin("An exposed output pin: its name on the wrapper, and the inner node and pin it maps to."),
          },
          params: { type: "array", items: { $ref: "#/$defs/exposedParam" } },
        },
        additionalProperties: false,
      },
      "An inline inner graph with its exposed pins and params.",
    ),
    exposedParam: described(
      ctx,
      {
        type: "object",
        required: ["name", "description"],
        properties: {
          // `resolveExposedParam`'s rules: a panel addresses the param as
          // "<nodeId>.<name>", and the description is a param schema's.
          name: FIELD_PARAM_NAME,
          description: NON_BLANK_STRING,
          targets: { type: "array", items: target(false) },
          default: true,
          min: NUMBER,
          max: NUMBER,
        },
        additionalProperties: false,
        // Targetless (absent or empty targets), nothing inner can lend a
        // schema, so `default` is required and its shape IS the type: a
        // number is f32, three or four numbers a vec3 or a vec4.
        if: { properties: { targets: { type: "array", minItems: 1 } }, required: ["targets"] },
        else: {
          properties: {
            default: { anyOf: [NUMBER, { type: "array", items: NUMBER, minItems: 3, maxItems: 4 }] },
          },
          required: ["default"],
        },
        $comment:
          "type, enum, acceptsField and acceptsInfinite are refused: an exposed param's schema is derived from its targets.",
      },
      "An exposed-param declaration. Its type is derived from the inner params it targets, never written.",
    ),
  };
}

// ---------------------------------------------------------------------------
// Assembly.
// ---------------------------------------------------------------------------

/** Every `#/$defs/<name>` a value references, anywhere inside it. */
function collectRefs(value: JsonValue, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectRefs(v, into);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string" && child.startsWith("#/$defs/")) {
      into.add(child.slice("#/$defs/".length));
    } else {
      collectRefs(child, into);
    }
  }
}

/** Only the definitions reachable from `root`, following references transitively. */
function reachable(
  root: JsonValue,
  defs: Readonly<Record<string, JsonSchemaObject>>,
): Record<string, JsonSchemaObject> {
  const seen = new Set<string>();
  const queue = new Set<string>();
  collectRefs(root, queue);
  while (queue.size > 0) {
    const [name] = queue;
    queue.delete(name!);
    if (seen.has(name!)) continue;
    seen.add(name!);
    const def = defs[name!];
    if (def === undefined) throw new Error(`graphJsonSchema: internal reference to undefined $defs entry "${name}"`);
    collectRefs(def, queue);
  }
  const out: Record<string, JsonSchemaObject> = {};
  for (const name of [...seen].sort()) out[name] = defs[name]!;
  return out;
}

/** A deep copy with every object's keys in sorted order; arrays keep theirs. */
function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as JsonSchemaObject)[key]!);
  return out;
}

/**
 * The JSON Schema (draft 2020-12) of the serialized graph format, generated
 * from the registries as they stand when it is called — node types, field
 * fns and registered subgraphs, so import `pcg-ts/primitives` first for a
 * schema that knows the shipped primitives.
 *
 * Built never to reject a graph `deserializeGraph` accepts; what it cannot
 * check is listed in its root `$comment`. Keys are sorted, so
 * `JSON.stringify` of two calls over the same registries is byte-identical.
 * The published copy is `docs/graph.schema.json`.
 */
export function graphJsonSchema(opts: GraphJsonSchemaOptions = {}): JsonSchemaObject {
  const ctx: Context = { descriptions: opts.descriptions !== false };
  const allTypes = listNodeTypes().sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));
  const repeatUntil = allTypes.find((t) => t.type === "repeatUntil");
  const entries = listSubgraphs().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const refs = entries.map((entry) => probeRefTarget(entry, repeatUntil?.params ?? {}));
  const refNames = entries.map((e) => e.name);

  const defs: Record<string, JsonSchemaObject> = {
    ...formatDefs(ctx, refNames),
    ...fieldDefs(ctx.descriptions),
    node: nodeSchema(ctx, allTypes, refs),
  };

  let root: JsonSchemaObject;
  if (opts.nodeType !== undefined) {
    const info = allTypes.find((t) => t.type === opts.nodeType);
    if (info === undefined) {
      throw new Error(
        `graphJsonSchema: unknown nodeType "${opts.nodeType}"; registered types: ${allTypes.map((t) => t.type).join(", ")}`,
      );
    }
    // The primitive branches are the full graph's, unfiltered: each pins the
    // wrapper type its `ref` loads under, which is what refuses a `ref` to a
    // plain body on a `forEach` here exactly as it does inside a graph.
    const body = nodeSchema(ctx, [info], refs);
    root = { $schema: DRAFT_2020_12, $comment: OUT_OF_SCOPE, ...body, $defs: reachable(body, defs) };
  } else {
    const body = graphObject(ctx, true);
    root = {
      $schema: DRAFT_2020_12,
      $id: GRAPH_SCHEMA_ID,
      $comment: OUT_OF_SCOPE,
      ...described(ctx, body, "A pcg-ts graph in the serialized interchange format (formatVersion 1)."),
      $defs: reachable(body, defs),
    };
  }
  return sortKeys(root) as JsonSchemaObject;
}
