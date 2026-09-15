/**
 * The one table from a param schema's `type` to the TypeScript a node's
 * `*Params` interface spells for it.
 *
 * WHY A TABLE, AND WHY HERE. `src/nodes/params.generated.ts` is rendered
 * from the registry by `src/docs/paramTypes.ts`, and the JSON Schema
 * generator planned beside it has to agree with it on what each param type
 * IS — two mappings would be two answers to one question, free to drift.
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
import type { ParamSchema, ParamType } from "../graph/index.js";

/** How one param type is spelled in TypeScript. */
export interface ParamTypeSpelling {
  /** The spelling of a plain (non-field) value. */
  readonly plain: string;
  /**
   * The spelling when the schema declares `acceptsField`, or undefined for
   * a type that never carries a field (a field resolves per element, and
   * only f32, vec3 and vec4 read one — see `fieldSpecAdvice` in
   * `src/graph/params.ts`).
   */
  readonly field?: string;
  /**
   * The type-only imports a spelling needs, as `name → module specifier`
   * relative to `src/nodes/`. Kept beside the spelling so a renderer cannot
   * emit a name without the import that resolves it.
   */
  readonly imports?: Readonly<Record<string, string>>;
}

const FIELD_PARAM_IMPORT = { FieldParam: "./util.js" } as const;

/**
 * The table. Enums spell `string` because the vocabulary's literal unions
 * are a separate, stricter step; integers and floats are all `number`
 * because JavaScript has one number.
 */
export const PARAM_TYPE_SPELLINGS: { readonly [T in ParamType]: ParamTypeSpelling } = {
  f32: { plain: "number", field: "FieldParam" },
  i32: { plain: "number" },
  u32: { plain: "number" },
  bool: { plain: "boolean" },
  string: { plain: "string" },
  enum: { plain: "string" },
  vec3: { plain: "readonly number[]", field: "FieldParam" },
  vec4: { plain: "readonly number[]", field: "FieldParam" },
  items: { plain: "readonly DataItem[]", imports: { DataItem: "../graph/index.js" } },
  stringList: { plain: "readonly string[]" },
  numberList: { plain: "readonly number[]" },
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
          `spelling for "${schema.type}"; only f32, vec3 and vec4 read a field — declare the param as one of ` +
          "those, or give this type a `field` spelling if it has genuinely become field-capable",
      );
    }
    return { type: spelling.field, imports: FIELD_PARAM_IMPORT };
  }
  return { type: spelling.plain, imports: spelling.imports ?? {} };
}
