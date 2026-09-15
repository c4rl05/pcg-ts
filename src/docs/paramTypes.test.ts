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
  ZERO_PARAM_ALIASES,
  escapeJsDocLine,
  paramTypesName,
  renderParamTypes,
} from "./paramTypes.js";

/**
 * Zero-param types that deliberately get NO params type. See
 * {@link ZERO_PARAM_ALIASES} for why; between the two lists every
 * zero-param type in the registry is a decision someone made.
 */
const ZERO_PARAM_UNALIASED: readonly string[] = ["subgraph", "forEach"];

/** Each declaration in a rendered file, by name, with its members' docs. */
function declarations(source: string): Map<string, { alias: boolean; members: Map<string, string> }> {
  const file = ts.createSourceFile("params.generated.ts", source, ts.ScriptTarget.Latest, true);
  const syntax = (file as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (syntax.length > 0) {
    throw new Error(
      `rendered params file does not parse: ${syntax.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ")}`,
    );
  }
  const out = new Map<string, { alias: boolean; members: Map<string, string> }>();
  for (const statement of file.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      out.set(statement.name.text, { alias: true, members: new Map() });
    } else if (ts.isInterfaceDeclaration(statement)) {
      const members = new Map<string, string>();
      for (const member of statement.members) {
        const docs = ts.getJSDocCommentsAndTags(member).filter(ts.isJSDoc);
        const text = docs.map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "").join("\n");
        members.set(member.name!.getText(file), text);
      }
      out.set(statement.name.text, { alias: false, members });
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
      `src/nodes/params.generated.ts is stale: a param schema changed but the generated interfaces ` +
        `were not regenerated. Run \`${PARAM_TYPES_COMMAND}\` and commit the result`,
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
