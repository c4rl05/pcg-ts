/**
 * `pcg schema` — the JSON Schemas an agent validates against before it runs
 * anything: the serialized graph format, the field-expression grammar on its
 * own, and the diagnostic record every `--json` failure carries.
 *
 * Every subject prints ONE JSON document, so the text rendering and the
 * `--json` rendering are the same bytes: `text` is exactly
 * `JSON.stringify(json, null, 2) + "\n"`, the formatting
 * `scripts/gen-graph-schema.mjs` writes `docs/graph.schema.json` in. The
 * default `pcg schema` therefore prints that file byte for byte.
 */
import { graphJsonSchema, listNodeTypes } from "../index.js";
// Side effect only: a `ref` node's name enum and each primitive's params come
// from the named-subgraph registry at the moment the schema is built, so the
// shipped primitives must be registered first — as the generator script and
// the CLI entry both do. Idempotent when the entry already imported it.
import "../primitives/index.js";
import { DIAGNOSTIC_CODES, type Diagnostic, type JsonValue } from "../diagnostics/index.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { CliUsageError, boolFlag, stringFlag } from "./args.js";
import type { Command, CommandOutcome } from "./commands.js";
import { CliError } from "./errors.js";

type JsonObject = { readonly [key: string]: JsonValue };

const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";

/** The subjects, in the order help lists them; the first is the default. */
const SCHEMA_SUBJECTS = ["graph", "field", "diagnostic"] as const;
type SchemaSubject = (typeof SCHEMA_SUBJECTS)[number];

/** A deep copy with every object's keys in sorted order; arrays keep theirs. */
function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return (value as readonly JsonValue[]).map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  const obj = value as JsonObject;
  const out: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(obj).sort()) out[key] = sortKeys(obj[key] as JsonValue);
  return out;
}

/** Every `#/$defs/<name>` a schema fragment references, not following them. */
function collectRefs(value: JsonValue, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value as readonly JsonValue[]) collectRefs(v, into);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value as JsonObject)) {
    if (key === "$ref" && typeof child === "string" && child.startsWith("#/$defs/")) {
      into.add(child.slice("#/$defs/".length));
    } else {
      collectRefs(child, into);
    }
  }
}

/** The `$defs` entries reachable from `start`, transitively, keyed in sorted order. */
function reachableDefs(start: string, defs: JsonObject): JsonObject {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const name = queue.pop() as string;
    if (seen.has(name)) continue;
    const def = defs[name];
    if (def === undefined) {
      throw new Error(`pcg schema: the graph schema references an undefined $defs entry "${name}"`);
    }
    seen.add(name);
    const refs = new Set<string>();
    collectRefs(def, refs);
    for (const r of refs) if (!seen.has(r)) queue.push(r);
  }
  const out: { [key: string]: JsonValue } = {};
  for (const name of [...seen].sort()) out[name] = defs[name] as JsonValue;
  return out;
}

/** The node-type registry, sorted, for the refusal of an unknown `--node`. */
function registeredTypes(): string[] {
  return listNodeTypes()
    .map((t) => t.type)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function graphSubject(nodeType: string | undefined, descriptions: boolean): JsonObject {
  if (nodeType !== undefined) {
    const types = registeredTypes();
    if (!types.includes(nodeType)) {
      // Refuse, never auto-correct: the suggestion is a clause, and the
      // complete list follows it for a reader who meant something else.
      const suggestion = suggestNames(nodeType, types);
      throw new CliError(
        `schema: unknown node type ${JSON.stringify(nodeType)}; ${suggestion.clause}registered types: ${types.join(", ")}`,
        {
          code: "unknown-node-type",
          got: nodeType,
          valid: types,
          ...(suggestion.names.length > 0 ? { didYouMean: suggestion.names } : {}),
        },
      );
    }
    return graphJsonSchema({ nodeType, descriptions });
  }
  return graphJsonSchema({ descriptions });
}

/**
 * What the field schema does not check — the field-grammar half of the graph
 * schema's root `$comment`, restated for a document that is only a field.
 */
const FIELD_OUT_OF_SCOPE =
  "The fieldSpec definition of graphJsonSchema() (docs/graph.schema.json), standalone: it validates one field " +
  "expression. fieldFromJson is the authority, and this schema is built never to reject a spec it accepts. Not " +
  "checked here: that numbers are finite and not -0; field-spec nesting depth (256 levels); tuple-width broadcast " +
  "rules between field arguments, and a component index or ramp stops that must fit the values they meet (stops " +
  "strictly ascending); param BINDINGS — which name a {\"fn\": \"param\"} reads, and whether anything binds it.";

function fieldSubject(descriptions: boolean): JsonObject {
  const graph = graphJsonSchema({ descriptions });
  const defs = graph["$defs"];
  if (typeof defs !== "object" || defs === null || Array.isArray(defs) || !("fieldSpec" in defs)) {
    throw new Error("pcg schema: the graph schema carries no $defs.fieldSpec to extract");
  }
  return sortKeys({
    $schema: DRAFT_2020_12,
    $comment: FIELD_OUT_OF_SCOPE,
    $ref: "#/$defs/fieldSpec",
    ...(descriptions ? { title: "PCG-TS field expression" } : {}),
    $defs: reachableDefs("fieldSpec", defs as JsonObject),
  }) as JsonObject;
}

/** An optional string list on a diagnostic. */
const STRING_LIST: JsonObject = { type: "array", items: { type: "string" } };

/**
 * One schema per `Diagnostic` field. Typed as a record over `keyof
 * Diagnostic`, so a field added to the interface fails to compile here until
 * the schema states it, and a field removed from it cannot linger.
 */
function diagnosticProperties(descriptions: boolean): Readonly<Record<keyof Diagnostic, JsonObject>> {
  const d = (schema: JsonObject, text: string): JsonObject =>
    descriptions ? { ...schema, description: text } : schema;
  const codes = Object.entries(DIAGNOSTIC_CODES);
  return {
    code: descriptions
      ? {
          type: "string",
          description: "Stable identifier from DIAGNOSTIC_CODES; never renamed or removed.",
          oneOf: codes.map(([code, text]) => ({ const: code, description: text })),
        }
      : { type: "string", enum: codes.map(([code]) => code) },
    severity: d(
      { type: "string", enum: ["error", "warning"] },
      "An error refuses the input; a warning reports it and lets it through.",
    ),
    message: d({ type: "string" }, "The human-readable statement, naming the node, pin or param and the fix."),
    path: d({ type: "string" }, "RFC 6901 JSON pointer to the offending value in the source document."),
    nodeId: d({ type: "string" }, "Id of the node at fault."),
    nodePath: d(
      STRING_LIST,
      "Node ids from the outermost graph inward, for a fault inside a subgraph or wrapper body.",
    ),
    pin: d({ type: "string" }, "Pin name at fault."),
    param: d({ type: "string" }, "Param name at fault."),
    key: d({ type: "string" }, "Object key at fault (an unknown or unauthorable key, a field spec key)."),
    // Any JSON value: every instance a JSON parser produces already is one.
    got: d({}, "The offending value as it was given: any JSON value."),
    valid: d(STRING_LIST, "The complete set of accepted alternatives, when the set is closed."),
    expected: d({ type: "string" }, "What was expected, when the alternatives are not a closed set."),
    didYouMean: d(STRING_LIST, "The nearest accepted alternatives, nearest first. A suggestion only."),
    fix: d({ type: "string" }, "A mechanical fix, set only when one exists and applying it is safe."),
  };
}

const REQUIRED_FIELDS = ["code", "message", "severity"] as const satisfies readonly (keyof Diagnostic)[];

function diagnosticSubject(descriptions: boolean): JsonObject {
  return sortKeys({
    $schema: DRAFT_2020_12,
    title: "Diagnostic",
    ...(descriptions
      ? {
          description:
            "One fault in machine-readable form: the record a PCG-TS error carries and every `pcg --json` " +
            "failure reports. Only code, severity and message are always present; a field is set only where " +
            "it applies. Codes are additive-only.",
        }
      : {}),
    type: "object",
    required: [...REQUIRED_FIELDS],
    additionalProperties: false,
    properties: diagnosticProperties(descriptions),
  }) as JsonObject;
}

function isSubject(value: string): value is SchemaSubject {
  return (SCHEMA_SUBJECTS as readonly string[]).includes(value);
}

export const schemaCommand: Command = {
  spec: {
    name: "schema",
    summary:
      "Print a JSON Schema (draft 2020-12): the serialized graph format (default, the same bytes as docs/graph.schema.json), a field expression on its own, or the diagnostic record with every code. Output is JSON with or without --json.",
    positionals: [
      {
        name: "subject",
        required: false,
        description: `what to describe: ${SCHEMA_SUBJECTS.join(", ")} (default graph)`,
      },
    ],
    flags: {
      node: {
        kind: "string",
        value: "type",
        description: "graph only: the schema of ONE node object of this registered type",
      },
      compact: {
        kind: "boolean",
        description: "leave out the description annotations: the same constraints in far fewer bytes",
      },
    },
  },
  run(args): Promise<CommandOutcome> {
    const given = args.positional[0] ?? "graph";
    if (!isSubject(given)) {
      const suggestion = suggestNames(given, SCHEMA_SUBJECTS);
      throw new CliUsageError(
        `schema: unknown subject ${JSON.stringify(given)}; ${suggestion.clause}valid subjects: ${SCHEMA_SUBJECTS.join(", ")}`,
      );
    }
    const nodeType = stringFlag(args, "node");
    if (nodeType !== undefined && given !== "graph") {
      throw new CliUsageError(
        `schema: --node describes one node of the graph format and applies only to the graph subject, not ${JSON.stringify(given)}; run "pcg schema graph --node ${nodeType}"`,
      );
    }
    const descriptions = !boolFlag(args, "compact");
    const json =
      given === "graph"
        ? graphSubject(nodeType, descriptions)
        : given === "field"
          ? fieldSubject(descriptions)
          : diagnosticSubject(descriptions);
    return Promise.resolve({ text: `${JSON.stringify(json, null, 2)}\n`, json });
  },
};
