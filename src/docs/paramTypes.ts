/**
 * Rendering of `src/nodes/params.generated.ts` — every standard node's
 * `*Params` interface — from node registry metadata: a pure function from
 * `NodeTypeInfo[]` to the exact bytes of the file, like the other renderers
 * here.
 *
 * WHY THE INTERFACES ARE GENERATED. The registry schema is the one authored
 * copy of what a param means: its description, default, range and field
 * capability. The hand-written interfaces carried none of it — two of 285
 * fields had any JSDoc — so an editor hover, or an agent reading
 * `dist/*.d.ts` in `node_modules`, saw a bare `number`. Generating them
 * copies the registry's words onto every field, and the schema stays the
 * only place anyone writes them.
 *
 * WHY THE WRITER IS A SNAPSHOT TEST AND NOT A SCRIPT OVER `dist/`, as the
 * catalogs' generators are. This file is SOURCE the build compiles: once a
 * schema gains a param, the node's `execute` reads a field the committed
 * interface lacks, `tsc` fails, and so does tsup — so there would be no
 * current `dist/` to generate from. Vitest runs from source without type
 * checking, so `paramTypes.test.ts` can render from the live registry
 * whatever state the types are in: `npm run docs:types` runs it with `-u`
 * to write the file, and a plain run (CI, and `prebuild`) fails on drift.
 *
 * THE PIN-NAME UNIONS ride in the same file for the same reason: the
 * registry's pins are the authored copy of a node's interface, and a
 * compile-time copy has to be regenerated from it rather than kept in step
 * by hand. A node module passes them explicitly
 * (`standardNode<XParams, XInputs, XOutputs>`) rather than letting
 * TypeScript infer them from its literal `pins` arrays, because naming `P`
 * already switches inference off (TypeScript has no partial inference), and
 * the alternative — hoisting every pin array into an `as const` and typing
 * the call with `(typeof pins)[number]["name"]` — is 59 extra declarations
 * that print worse in a hover than a named union does. A pin added to a
 * spec and not regenerated fails `tsc` at that spec, the way a param does.
 *
 * The type spellings come from `src/nodes/paramTypeMap.ts`, the table the
 * JSON Schema generator shares; this module owns only the layout and the
 * prose.
 */
import type { ParamSchema, ParamValue } from "../graph/index.js";
import { paramTypeScript } from "../nodes/paramTypeMap.js";
import type { NodeTypeInfo } from "../nodes/registry.js";

/** The command that regenerates the file; named by every drift message. */
export const PARAM_TYPES_COMMAND = "npm run docs:types";

/**
 * Zero-param node types that get a `type XParams = Record<string, never>`
 * alias — exactly the ones whose alias the package already published.
 *
 * Why not every zero-param type. An EMPTY INTERFACE would accept any object
 * at all, so an alias is the only honest spelling; and `subgraph` and
 * `forEach` never had a params type, so generating `SubgraphParams` and
 * `ForEachParams` would grow the root import's surface with two names that
 * say nothing. A new zero-param type is a decision, which is why this is a
 * list and why `paramTypes.test.ts` names any registered type it misses.
 */
export const ZERO_PARAM_ALIASES: readonly string[] = ["mergePoints", "mergePrimitives"];

/**
 * Registered types whose pins are PER INSTANCE, which get no pin-name
 * unions: the three composite wrappers, whose registry entries are
 * metadata-only and declare no pins because every instance's pins come
 * from the graph it wraps. A union of their registered pins would be
 * `never` on both sides — a claim that no instance has a pin, which is
 * false. Their defs (`subgraphNode` and the rest) keep `string` pins.
 * A list, like {@link ZERO_PARAM_ALIASES}, so `paramTypes.test.ts` can name
 * a new pinless type instead of silently typing it `never`.
 */
export const PER_INSTANCE_PIN_TYPES: readonly string[] = ["forEach", "repeatUntil", "subgraph"];

function pascal(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** The interface name for a node type: `pointGrid` → `PointGridParams`. */
export function paramTypesName(type: string): string {
  return pascal(type) + "Params";
}

/**
 * The pin-name union names for a node type: `pointGrid` →
 * `PointGridInputs` / `PointGridOutputs`. INTERNAL names: the node modules
 * pass them to `standardNode` and never re-export them, so they type a
 * handle's pins without becoming names the package root publishes.
 */
export function pinTypesName(type: string, side: "input" | "output"): string {
  return pascal(type) + (side === "input" ? "Inputs" : "Outputs");
}

/** A union of pin names in declaration order, or `never` for no pins. */
function pinUnion(pins: NodeTypeInfo["inputs"]): string {
  return pins.length === 0 ? "never" : pins.map((p) => JSON.stringify(p.name)).join(" | ");
}

/**
 * Text width of a wrapped comment line, not counting the ` * ` prefix and
 * indent. Wrapped so a changed description shows in a diff as the lines
 * that changed rather than one line of four thousand characters; a hover
 * renders the paragraph the same either way.
 */
const WRAP = 88;

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      if (word === "") continue;
      if (line !== "" && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else {
        line = line === "" ? word : `${line} ${word}`;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * One comment line made safe to sit inside `/** … *\/`.
 *
 * `*\/` would close the comment early, so the slash is escaped. An `@`
 * that starts a word would be parsed as a JSDoc TAG and silently cut the
 * description short, so it is escaped as `\@`, which markdown renders as a
 * plain `@`. Not only at the start of a line: measured against TypeScript
 * 6.0, `word @internal` mid-line parses as an `@internal` tag too. An `@`
 * inside a word (`a@b`) or after a brace (`{@link X}`) is left alone.
 * Neither case occurs in any registered description today;
 * `paramTypes.test.ts` guards both.
 */
export function escapeJsDocLine(line: string): string {
  return line.replaceAll("*/", "*\\/").replace(/(^|\s)@/g, "$1\\@");
}

function formatDefault(value: ParamValue): string {
  return "`" + JSON.stringify(value) + "`";
}

/** The same wording `docs/nodes.md`'s range column uses, for the same schema. */
function formatRange(schema: ParamSchema): string | undefined {
  const hasMin = schema.min !== undefined;
  const hasMax = schema.max !== undefined;
  if (hasMin && hasMax) return `\`${schema.min}..${schema.max}\``;
  if (hasMin) return `\`>= ${schema.min}\``;
  if (hasMax) return `\`<= ${schema.max}\``;
  return undefined;
}

/**
 * The JSDoc lines of one param: the full description (decision D5 — the
 * whole text, not its first sentence), then the facts a caller would
 * otherwise look up, then `@defaultValue`.
 */
function paramDocLines(schema: ParamSchema): string[] {
  const lines = wrap(schema.description.trim(), WRAP).map(escapeJsDocLine);
  const facts: string[] = [];
  const range = formatRange(schema);
  if (range !== undefined) facts.push(`Range: ${range}`);
  if (schema.acceptsInfinite === true) {
    facts.push("Accepts ±Infinity on a live graph (it never serializes: JSON has no infinity)");
  }
  if (schema.enum !== undefined) {
    facts.push(`Enum: ${schema.enum.map((v) => "`" + JSON.stringify(v) + "`").join(" | ")}`);
  }
  if (schema.acceptsField === true) facts.push("Accepts a field.");
  if (facts.length > 0) {
    lines.push("");
    for (const fact of facts) {
      // Continuation lines indent under the bullet, so they can never
      // start with `@`; escaped anyway, since `*\/` can sit anywhere.
      lines.push(...wrap(`- ${fact}`, WRAP).map((l, i) => escapeJsDocLine(i === 0 ? l : `  ${l}`)));
    }
  }
  lines.push("");
  // The one tag written on purpose, and never wrapped: a default is one
  // JSON value, and a code span broken across lines reads as a different one.
  lines.push(`@defaultValue ${formatDefault(schema.default).replaceAll("*/", "*\\/")}`);
  return lines;
}

/** A JSDoc block from lines that are already safe to sit inside one. */
function comment(lines: readonly string[], indent: string): string {
  const body = lines.map((line) => (line === "" ? `${indent} *` : `${indent} * ${line}`));
  return [`${indent}/**`, ...body, `${indent} */`].join("\n");
}

const HEADER = `/**
 * GENERATED FILE — do not edit it by hand. Rendered by
 * \`src/docs/paramTypes.ts\` from the node registry's param schemas, and
 * rewritten by \`${PARAM_TYPES_COMMAND}\`.
 *
 * The only generated TypeScript under \`src/\`, and generated for one
 * reason: the registry schema is the one authored copy of each param's
 * description, default, range and field capability, and this file carries
 * that copy onto every standard node's \`*Params\` interface, where an editor
 * hover and \`dist/*.d.ts\` can show it. To change a param's documentation,
 * edit its schema in the node's module and run \`${PARAM_TYPES_COMMAND}\`.
 * Enum params are typed as the literal union of their values.
 *
 * It also carries each node type's pin names as \`<Type>Inputs\` and
 * \`<Type>Outputs\` unions, which the node module passes to \`standardNode\`
 * so a \`Graph.add\` handle knows its pins. Those two are internal: no module
 * re-exports them, so they never become names the package root publishes.
 *
 * \`src/docs/paramTypes.test.ts\` fails when this file and the registry
 * disagree, and \`prebuild\` runs that test first, so the first failure a
 * stale file causes is the one that names the command — not a type error
 * in whichever node's \`execute\` reads the new param.
 */`;

/**
 * The bytes of `src/nodes/params.generated.ts` for `types`.
 *
 * Deterministic: types sort by name, so a change in registration order is
 * not a change in the file; params keep their schema order, which is the
 * order a node's author wrote them in, and pins their declaration order.
 * Zero-param types get a params alias only when {@link ZERO_PARAM_ALIASES}
 * names them; every type but the {@link PER_INSTANCE_PIN_TYPES} gets its
 * two pin-name unions.
 */
export function renderParamTypes(types: readonly NodeTypeInfo[]): string {
  const sorted = [...types].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));
  const imports = new Map<string, Set<string>>();
  const blocks: string[] = [];
  for (const info of sorted) {
    const name = paramTypesName(info.type);
    const entries = Object.entries(info.params);
    if (entries.length === 0) {
      if (ZERO_PARAM_ALIASES.includes(info.type)) {
        blocks.push(
          `${comment([escapeJsDocLine(`Params of the \`${info.type}\` node type, which has none.`)], "")}\n` +
            `export type ${name} = Record<string, never>;`,
        );
      }
    } else {
      const fields = entries.map(([param, schema]) => {
        const ts = paramTypeScript(schema);
        for (const [importName, from] of Object.entries(ts.imports)) {
          const names = imports.get(from) ?? new Set<string>();
          names.add(importName);
          imports.set(from, names);
        }
        return `${comment(paramDocLines(schema), "  ")}\n  ${param}: ${ts.type};`;
      });
      blocks.push(
        `${comment([escapeJsDocLine(`Params of the \`${info.type}\` node type.`)], "")}\n` +
          `export interface ${name} {\n${fields.join("\n")}\n}`,
      );
    }
    if (PER_INSTANCE_PIN_TYPES.includes(info.type)) continue;
    for (const side of ["input", "output"] as const) {
      const pins = side === "input" ? info.inputs : info.outputs;
      const what =
        pins.length === 0
          ? `The \`${info.type}\` node type has no ${side} pins.`
          : `The ${side} pin names of the \`${info.type}\` node type.`;
      blocks.push(
        `${comment([escapeJsDocLine(what)], "")}\n` +
          `export type ${pinTypesName(info.type, side)} = ${pinUnion(pins)};`,
      );
    }
  }
  const importLines = [...imports.keys()]
    .sort()
    .map((from) => `import type { ${[...imports.get(from)!].sort().join(", ")} } from "${from}";`);
  const head = importLines.length > 0 ? `${HEADER}\n${importLines.join("\n")}\n` : `${HEADER}\n`;
  return `${head}\n${blocks.join("\n\n")}\n`;
}
