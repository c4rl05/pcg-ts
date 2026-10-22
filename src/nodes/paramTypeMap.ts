/**
 * The one table from a param schema's `type` to the TypeScript a node's
 * `*Params` interface spells for it, and to the JSON Schema a serialized
 * graph's value for it must satisfy.
 *
 * WHY A TABLE, AND WHY HERE. `src/nodes/params.generated.ts` is rendered
 * from the registry by `src/docs/paramTypes.ts`, and the JSON Schema
 * generator beside it (`./graphSchema.ts`) has to agree with it on what each
 * param type IS — two mappings would be two answers to one question, free to
 * drift. So the JSON Schema is a second COLUMN of this table, not a second
 * table.
 * `src/docs` may import `src/nodes` and not the reverse, so the table lives
 * on the side both can reach. It is not re-exported from `./index.ts`: it
 * describes how the library's own typings are made, which is no promise to
 * a consumer.
 *
 * WHAT IT REPRODUCES. The table was derived from the hand-written
 * interfaces it replaced, field by field against the registry: every one of
 * the 285 fields followed it except six `stringList` fields typed
 * `string[]`, which the table widens to `readonly string[]` like every
 * other list — a node reads its params, it never mutates them.
 *
 * Keyed by every {@link ParamType}, so a type added to the vocabulary does
 * not compile until it has a spelling here.
 */
import type { JsonValue } from "../diagnostics/index.js";
import type { ParamSchema, ParamType } from "../graph/index.js";

/** A JSON Schema object, as the generators build and emit one. */
export type JsonSchemaObject = { readonly [key: string]: JsonValue };

/** How one param type is spelled in TypeScript and in JSON Schema. */
export interface ParamTypeSpelling {
  /** The spelling of a plain (non-field) value. */
  readonly plain: string;
  /**
   * The spelling when the schema declares `acceptsField`, or undefined for
   * a type that never carries a field (a field resolves per element, and
   * only f32, vec3, vec4 and numberList read one — see `fieldSpecAdvice` in
   * `src/graph/params.ts`).
   */
  readonly field?: string;
  /**
   * The type-only imports a spelling needs, as `name → module specifier`
   * relative to `src/nodes/`. Kept beside the spelling so a renderer cannot
   * emit a name without the import that resolves it.
   */
  readonly imports?: Readonly<Record<string, string>>;
  /**
   * The JSON Schema a plain (non-field) value of this type satisfies in a
   * serialized graph, BEFORE the param's own `enum` and bounds are applied —
   * the shape `paramValueError` in `src/graph/params.ts` checks on load,
   * which is stricter than what a live graph takes (no scalar broadcast onto
   * a vec, and an `items` list is always empty in the JSON).
   */
  readonly json: JsonSchemaObject;
  /**
   * Where a declared `min`/`max` lands: on the value itself (`"value"`),
   * on each element of the array (`"items"`, componentwise, as a vec's
   * bounds read), or nowhere (absent) — `paramValueError` checks bounds only
   * for the numeric scalars and the vecs.
   */
  readonly bounds?: "value" | "items";
}

const FIELD_PARAM_IMPORT = { FieldParam: "./util.js" } as const;

/**
 * The table. An enum's `plain` spelling is `string` only as the column's
 * fallback: {@link paramTypeScript} spells a declared enum as the literal
 * union of its values, which the table cannot hold because the values are
 * per param, not per type. Integers and floats are all `number`
 * because JavaScript has one number. JSON Schema can say more than
 * TypeScript here, so it does: `integer`, a u32's floor, a vec's width.
 */
export const PARAM_TYPE_SPELLINGS: { readonly [T in ParamType]: ParamTypeSpelling } = {
  f32: { plain: "number", field: "FieldParam", json: { type: "number" }, bounds: "value" },
  i32: { plain: "number", json: { type: "integer" }, bounds: "value" },
  u32: { plain: "number", json: { type: "integer", minimum: 0 }, bounds: "value" },
  bool: { plain: "boolean", json: { type: "boolean" } },
  string: { plain: "string", json: { type: "string" } },
  enum: { plain: "string", json: { type: "string" } },
  vec3: {
    plain: "readonly number[]",
    field: "FieldParam",
    json: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
    bounds: "items",
  },
  vec4: {
    plain: "readonly number[]",
    field: "FieldParam",
    json: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
    bounds: "items",
  },
  items: {
    plain: "readonly DataItem[]",
    imports: { DataItem: "../graph/index.js" },
    json: { type: "array", maxItems: 0 },
  },
  stringList: { plain: "readonly string[]", json: { type: "array", items: { type: "string" } } },
  numberList: {
    plain: "readonly number[]",
    // Field-capable as a TUPLE, one component per entry (`splitBox.sizes`);
    // `FieldParam` already admits the plain `readonly number[]`.
    field: "FieldParam",
    json: { type: "array", items: { type: "number" } },
  },
};

/** The TypeScript type of one param, and the type-only imports it needs. */
export function paramTypeScript(schema: ParamSchema): {
  readonly type: string;
  readonly imports: Readonly<Record<string, string>>;
} {
  const spelling = PARAM_TYPE_SPELLINGS[schema.type];
  if (spelling === undefined) {
    throw new Error(
      `paramTypeScript: param type "${String(schema.type)}" has no TypeScript spelling; ` +
        `known types: ${Object.keys(PARAM_TYPE_SPELLINGS).join(", ")} — add it to PARAM_TYPE_SPELLINGS`,
    );
  }
  if (schema.acceptsField === true) {
    if (spelling.field === undefined) {
      throw new Error(
        `paramTypeScript: a "${schema.type}" param declares acceptsField, but PARAM_TYPE_SPELLINGS has no field ` +
          `spelling for "${schema.type}"; only f32, vec3, vec4 and numberList read a field — declare the param as one of ` +
          "those, or give this type a `field` spelling if it has genuinely become field-capable",
      );
    }
    return { type: spelling.field, imports: FIELD_PARAM_IMPORT };
  }
  if (schema.type === "enum" && schema.enum !== undefined && schema.enum.length > 0) {
    // The literal union of the declared values, in schema order. The table's
    // `plain` spelling stays `string` for an enum with no values to spell,
    // which `paramSchemaError` refuses at registration anyway.
    return { type: schema.enum.map((v) => JSON.stringify(v)).join(" | "), imports: {} };
  }
  return { type: spelling.plain, imports: spelling.imports ?? {} };
}

/**
 * The JSON Schema one param's value must satisfy in a serialized graph:
 * the type's column above, narrowed by the schema's `enum` and bounds, and —
 * when the schema declares `acceptsField` — widened to
 * `anyOf: [that, fieldSpec]`.
 *
 * The widening follows the LOADER rather than the TypeScript column, and the
 * two differ on purpose: `deserializeGraph` reads a plain object at an
 * `acceptsField` param as a field spec whatever the param's type, and checks
 * everything else as a plain value. So there is no refusal here for a type
 * with no field spelling — the schema says what the reader does, and
 * `paramTypeScript` is where a declared-but-unreadable field is refused.
 *
 * `fieldSpecRef` is the `$ref` of the field grammar's definition in the
 * document the result is embedded in.
 */
export function paramJsonSchema(schema: ParamSchema, fieldSpecRef: string): JsonSchemaObject {
  const spelling = PARAM_TYPE_SPELLINGS[schema.type];
  if (spelling === undefined) {
    throw new Error(
      `paramJsonSchema: param type "${String(schema.type)}" has no JSON Schema column; ` +
        `known types: ${Object.keys(PARAM_TYPE_SPELLINGS).join(", ")} — add it to PARAM_TYPE_SPELLINGS`,
    );
  }
  const bounds: Record<string, number> = {};
  if (spelling.bounds !== undefined) {
    // A type's own floor (a u32's 0) and a declared min both bind, so the
    // higher of the two is the one that says anything.
    const floor = typeof spelling.json.minimum === "number" ? spelling.json.minimum : undefined;
    const min =
      schema.min === undefined ? floor : floor === undefined ? schema.min : Math.max(floor, schema.min);
    if (min !== undefined) bounds.minimum = min;
    if (schema.max !== undefined) bounds.maximum = schema.max;
  }
  let plain: JsonSchemaObject =
    spelling.bounds === "items"
      ? { ...spelling.json, items: { ...(spelling.json.items as JsonSchemaObject), ...bounds } }
      : { ...spelling.json, ...bounds };
  if (schema.type === "enum") plain = { ...plain, enum: [...(schema.enum ?? [])] };
  return schema.acceptsField === true ? { anyOf: [plain, { $ref: fieldSpecRef }] } : plain;
}
