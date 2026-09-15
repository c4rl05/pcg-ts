/**
 * The WRITER of `src/nodes/params.generated.ts`, and its drift gate.
 *
 * `npm run docs:types` runs this file with `-u`, which writes the render
 * over the committed file. Any other run — `npm test`, CI, and the
 * `prebuild` script that runs this file alone before tsup — only compares,
 * and fails when a schema changed and the file was not regenerated. It runs
 * from source, so it works in exactly the state that makes the file matter:
 * a schema gained a param, a node reads it, and `tsc` cannot compile until
 * the interface has it.
 *
 * The other tests pin what the snapshot cannot: that the render covers
 * every registered param with documentation, and that no description can
 * break out of its comment.
 */
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { NodeTypeInfo } from "../nodes/registry.js";
import { listNodeTypes } from "../index.js";
import {
  PARAM_TYPES_COMMAND,
  PER_INSTANCE_PIN_TYPES,
  ZERO_PARAM_ALIASES,
  escapeJsDocLine,
  paramTypesName,
  pinTypesName,
  renderParamTypes,
} from "./paramTypes.js";

/**
 * Zero-param types that deliberately get NO params type. See
 * {@link ZERO_PARAM_ALIASES} for why; between the two lists every
 * zero-param type in the registry is a decision someone made.
 */
const ZERO_PARAM_UNALIASED: readonly string[] = ["subgraph", "forEach"];

/** One declaration of a rendered file: its members' docs and type text. */
interface Declared {
  readonly alias: boolean;
  /** An alias's type text, as written; empty for an interface. */
  readonly type: string;
  readonly members: Map<string, string>;
  readonly memberTypes: Map<string, string>;
}

/** Each declaration in a rendered file, by name, with its members' docs. */
function declarations(source: string): Map<string, Declared> {
  const file = ts.createSourceFile("params.generated.ts", source, ts.ScriptTarget.Latest, true);
  const syntax = (file as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (syntax.length > 0) {
    throw new Error(
      `rendered params file does not parse: ${syntax.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ")}`,
    );
  }
  const out = new Map<string, Declared>();
  for (const statement of file.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      out.set(statement.name.text, {
        alias: true,
        type: statement.type.getText(file),
        members: new Map(),
        memberTypes: new Map(),
      });
    } else if (ts.isInterfaceDeclaration(statement)) {
      const members = new Map<string, string>();
      const memberTypes = new Map<string, string>();
      for (const member of statement.members) {
        const docs = ts.getJSDocCommentsAndTags(member).filter(ts.isJSDoc);
        const text = docs.map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "").join("\n");
        const name = member.name!.getText(file);
        members.set(name, text);
        if (ts.isPropertySignature(member) && member.type !== undefined) {
          memberTypes.set(name, member.type.getText(file));
        }
      }
      out.set(statement.name.text, { alias: false, type: "", members, memberTypes });
    }
  }
  return out;
}

describe("param types (src/nodes/params.generated.ts)", () => {
  const types = listNodeTypes();
  const rendered = renderParamTypes(types);

  it("matches the live node registry", async () => {
    await expect(
      rendered,
      `src/nodes/params.generated.ts is stale: a param schema or a pin list changed but the generated ` +
        `types were not regenerated. Run \`${PARAM_TYPES_COMMAND}\` and commit the result`,
    ).toMatchFileSnapshot("../nodes/params.generated.ts");
  });

  it("renders identically twice, whatever the registration order", () => {
    expect(renderParamTypes([...types].reverse())).toBe(rendered);
  });

  it("declares every registered param as a field with non-empty JSDoc", () => {
    const declared = declarations(rendered);
    let fields = 0;
    for (const info of types) {
      const params = Object.keys(info.params);
      if (params.length === 0) continue;
      const name = paramTypesName(info.type);
      const decl = declared.get(name);
      expect(decl, `node type "${info.type}" has params but no interface ${name}`).toBeDefined();
      expect(decl!.alias, `${name} must be an interface`).toBe(false);
      expect([...decl!.members.keys()], `${name}'s fields`).toEqual(params);
      for (const param of params) {
        const doc = decl!.members.get(param) ?? "";
        expect(doc.trim(), `${name}.${param} has no JSDoc`).not.toBe("");
        // The full description, not a summary of it (decision D5).
        const description = info.params[param]!.description.replace(/\s+/g, " ").trim();
        expect(doc.replace(/\s+/g, " "), `${name}.${param}'s JSDoc`).toContain(description);
        fields += 1;
      }
    }
    // The guard must have something to guard.
    expect(fields).toBeGreaterThan(250);
  });

  it("decides every zero-param type: an alias that already existed, or nothing", () => {
    const zero = types.filter((t) => Object.keys(t.params).length === 0).map((t) => t.type);
    const undecided = zero.filter((t) => !ZERO_PARAM_ALIASES.includes(t) && !ZERO_PARAM_UNALIASED.includes(t));
    expect(
      undecided,
      "a new zero-param node type needs a decision: add it to ZERO_PARAM_ALIASES in src/docs/paramTypes.ts " +
        "only if its `XParams` name is already published, otherwise to ZERO_PARAM_UNALIASED here",
    ).toEqual([]);
    const declared = declarations(rendered);
    for (const t of ZERO_PARAM_ALIASES) {
      expect(declared.get(paramTypesName(t))?.alias, `${paramTypesName(t)} alias`).toBe(true);
    }
    for (const t of ZERO_PARAM_UNALIASED) expect(declared.has(paramTypesName(t))).toBe(false);
  });

  it("types every enum param as the literal union of its values, in schema order", () => {
    const declared = declarations(rendered);
    let enums = 0;
    for (const info of types) {
      for (const [param, schema] of Object.entries(info.params)) {
        if (schema.type !== "enum") continue;
        const expected = schema.enum!.map((v) => JSON.stringify(v)).join(" | ");
        const name = paramTypesName(info.type);
        expect(declared.get(name)?.memberTypes.get(param), `${name}.${param}`).toBe(expected);
        enums += 1;
      }
    }
    // Measured at 56 when the unions landed; the guard must have something to guard.
    expect(enums).toBeGreaterThan(40);
  });

  it("gives every type with fixed pins its input and output pin-name unions", () => {
    const declared = declarations(rendered);
    const union = (names: readonly string[]) =>
      names.length === 0 ? "never" : names.map((n) => JSON.stringify(n)).join(" | ");
    for (const info of types) {
      for (const side of ["input", "output"] as const) {
        const name = pinTypesName(info.type, side);
        if (PER_INSTANCE_PIN_TYPES.includes(info.type)) {
          expect(declared.has(name), `${name} must not exist: ${info.type}'s pins are per instance`).toBe(false);
          continue;
        }
        const pins = (side === "input" ? info.inputs : info.outputs).map((p) => p.name);
        expect(declared.get(name)?.alias, `${name} alias`).toBe(true);
        expect(declared.get(name)!.type, name).toBe(union(pins));
      }
    }
  });

  it("decides every pinless type: per-instance pins, or none of its own", () => {
    // A registered type with no output pin can produce nothing, so a standard
    // node never has one; the three wrappers have none only because their
    // pins come from the graph each instance wraps. A new pinless type is a
    // decision, not a `never` union to be generated silently.
    const pinless = types.filter((t) => t.outputs.length === 0).map((t) => t.type).sort();
    expect(
      pinless,
      "a registered node type declares no output pins: if its pins are per instance, add it to " +
        "PER_INSTANCE_PIN_TYPES in src/docs/paramTypes.ts; otherwise give it its output pins",
    ).toEqual([...PER_INSTANCE_PIN_TYPES].sort());
    for (const t of PER_INSTANCE_PIN_TYPES) {
      const info = types.find((i) => i.type === t);
      expect(info?.inputs, `${t} is registered with no input pins`).toEqual([]);
    }
  });

  describe("escaping", () => {
    const hostile: NodeTypeInfo = {
      type: "hostileDoc",
      description: "test",
      inputs: [],
      outputs: [],
      params: {
        closer: {
          type: "enum",
          default: "a*/b @see",
          enum: ["a*/b @see", "c @deprecated"],
          description: `Ends a comment */ early, then @internal mid-line, then ${"word ".repeat(6)}@param starts a wrapped line.`,
        },
        leading: { type: "string", default: "", description: "@returns looks like a tag, mail@example.com does not" },
      },
    };
    const source = renderParamTypes([hostile]);

    it("escapes `*/` and a word-leading `@` in the helper", () => {
      expect(escapeJsDocLine("a */ b")).toBe("a *\\/ b");
      expect(escapeJsDocLine("@internal x")).toBe("\\@internal x");
      expect(escapeJsDocLine("x @internal")).toBe("x \\@internal");
      expect(escapeJsDocLine("mail@example.com {@link X}")).toBe("mail@example.com {@link X}");
    });

    it("keeps a hostile description inside its own comment, with no stray tags", () => {
      const file = ts.createSourceFile("hostile.ts", source, ts.ScriptTarget.Latest, true);
      const iface = file.statements.find(ts.isInterfaceDeclaration);
      expect(iface?.name.text).toBe("HostileDocParams");
      expect(iface!.members.map((m) => m.name!.getText(file))).toEqual(["closer", "leading"]);
      for (const member of iface!.members) {
        const tags = ts.getJSDocTags(member);
        const name = member.name!.getText(file);
        expect(tags.map((tag) => tag.tagName.text), `${name}'s tags`).toEqual(["defaultValue"]);
      }
      // An `@` inside the backticked default is not a tag either, and the
      // default survives whole.
      const closerDefault = ts.getJSDocTags(iface!.members[0]!)[0]!;
      expect(ts.getTextOfJSDocComment(closerDefault.comment)).toBe('`"a*\\/b @see"`');
      // The `@param` really did land at the start of a wrapped line, so the
      // line-start case was exercised rather than dodged by the wrap.
      expect(source).toMatch(/^ {3}\* \\@param starts a wrapped line\.$/m);
      expect(source).toMatch(/^ {3}\* \\@returns looks like a tag, mail@example\.com does not$/m);
    });
  });
});
