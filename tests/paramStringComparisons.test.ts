/**
 * A STRUCTURAL SCAN FOR THE SHAPE THAT MISCOMPILED.
 *
 * `src/noise/worley.ts` carries the canonical note; read it first. The
 * short version: a param string compared inside a function that runs once
 * per element is a shape V8 can get wrong. In a warm process, with a
 * string that came out of `JSON.parse`, the comparison turned on the
 * string's REPRESENTATION rather than its value and about one element in
 * 22500 took the other branch — silently, with no error, and only on the
 * first cook. It is an optimizer fault, not a logic error, so no amount of
 * reading the code finds it and no assertion inside the loop catches it.
 *
 * Two defences already exist. `canonicalOneOf` (src/diagnostics/canonical.ts)
 * re-interns an accepted enum value as the schema's OWN string at every
 * seam, so the parsed string never reaches a hot path. And the known hot
 * comparisons were hoisted out of their loops into booleans decided once
 * (14abf49, 324f252, d77b621, cf97764). NEITHER STOPS THE SHAPE COMING
 * BACK, which is what this file is for: a new node written next month has
 * the same hands as the one that wrote worley.
 *
 * THIS IS A TEST AND NOT A LINT RULE because there is no linter in this
 * repo to add a rule to — no eslint, biome or oxlint config and no such
 * devDependency; CI runs build, check and test. A rule would mean adopting
 * a toolchain for one check. `typescript` is already a devDependency and
 * `tests/packaging.test.ts` already reads source text, so the cheapest
 * honest place for this is here.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────
 *
 * A finding is a comparison of a string literal against an expression that
 * is BOTH:
 *
 *   1. PARAM-DERIVED — it traces back to a node's params bag, to a
 *      destructured `params`/`opts`/`options`/`spec`/`config`, or to a
 *      function parameter (or annotated local) whose type is a union of
 *      string literals. `??`, `||`, `?:` and a `canonicalOneOf(...)` /
 *      `String(...)` wrapper are followed through; `const a = b` chains
 *      are followed up to six links.
 *
 *   2. NOT EVALUATED WHERE IT WAS DECIDED — between the comparison and the
 *      scope that declares the value there is at least one loop OR at
 *      least one nested function. Both halves matter, and the second is
 *      the one that costs entries: THE WORLEY FAULT WAS NOT IN A `for`
 *      BODY. It was in an arrow returned from an arrow, called once per
 *      sampled point. A loop-body-only rule would have scored the bug that
 *      actually happened as clean, which is the whole reason to pay for
 *      the closure half.
 *
 * `===`, `!==`, `==`, `!=` and `switch (x) { case "…": }` all count.
 * Only identifiers and plain property chains (`params.mode`, `spec.wrapper`)
 * are candidates; anything computed is not.
 *
 * THE COST OF THE CLOSURE HALF, MEASURED ON THIS TREE: loop bodies alone
 * find 13 sites, loop bodies plus closures find 24, and the middle rule
 * (a closure that is returned or passed as an argument) finds 17. 24 is
 * small enough to write down with a reason each, so the widest rule wins.
 *
 * ── WHAT IS NOT A FINDING, DELIBERATELY ─────────────────────────────────
 *
 * A comparison against PER-ELEMENT DATA. `attr.getString(i) === "polyline"`
 * in `src/cli/render.ts` reads a different string every iteration, so
 * there is no loop-invariant answer to hoist and nothing to hoist it to.
 * Those are excluded structurally rather than by name: the left side is a
 * call, not an identifier, and `slot.name === ""` two lines above a flagged
 * `arcAttr === ""` in `src/nodes/runs.ts` is excluded because `slot` is the
 * loop's own binding.
 *
 * INTERNAL CONTROL-FLOW STRINGS that never came from JSON are, by
 * contrast, NOT distinguishable here and are not excluded. `side: "input" |
 * "output"` is the same syntax as worley's `output`, and nothing in the
 * source says which of the two a parser ever touched. They are found, and
 * they go on the allowlist with a reason that says so. That is the right
 * way round: the allowlist is the place where "this one is fine" is
 * written down and reviewed, not the scanner.
 *
 * ── WHAT THIS CANNOT SEE ────────────────────────────────────────────────
 *
 * - A comparison in a function called per element from somewhere ELSE in
 *   the file or in another module. The scan is syntactic and single-file:
 *   it knows "nested inside", not "called from". A top-level
 *   `function pick(mode: Mode) { return mode === "a"; }` invoked in a hot
 *   loop is invisible.
 * - A string reached through an alias the tracer cannot follow: an object
 *   field (`this.mode`), an array element, a value passed through a call
 *   the tracer does not know, or a parameter whose string-union type comes
 *   from an indexed access or a mapped type rather than a named alias.
 * - Anything outside `src/`. `demos/`, `editor/` and `shared/` are hosts,
 *   not the library, and are not scanned.
 * - Whether a flagged site is actually hot. It cannot be: "per element" is
 *   a property of the caller. Every judgement of that kind lives in the
 *   allowlist's reason column, which is a claim a reviewer can check.
 *
 * ── THE ALLOWLIST ───────────────────────────────────────────────────────
 *
 * Frozen at what exists today so the debt is visible and cannot grow by
 * accident. An entry names the file, the compared expression, how many
 * sites there are, and why that one is not the bug. A stale entry fails
 * too — a site that no longer exists, or one whose count moved in either
 * direction — so the list cannot rot into a list of things that used to be
 * true. Line numbers are deliberately NOT part of an entry: they move on
 * every edit above them and would turn this into a test that fails for
 * reasons no one reads.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

/** One frozen site. `sites` is how many comparisons the scan finds there. */
interface Allowed {
  readonly file: string;
  readonly expr: string;
  readonly sites: number;
  readonly why: string;
}

const ALLOWED: readonly Allowed[] = [
  {
    file: "src/cli/commands.ts",
    expr: "side",
    sites: 1,
    why: "pin formatter closure in `nodeDetailText`: per PIN of one node type, building CLI text",
  },
  {
    file: "src/cli/commands.ts",
    expr: "kind",
    sites: 1,
    why: "`corpusFor`'s ranking predicate: per corpus INDEX ENTRY, building CLI text",
  },
  {
    file: "src/docs/node-reference.ts",
    expr: "side",
    sites: 1,
    why: "the same pin formatter for the markdown catalog; doc generation, never a cook",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "targetType",
    sites: 1,
    why: "`conv`'s switch, called once per TUPLE COMPONENT while emitting WGSL source at pipeline build",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "srcType",
    sites: 6,
    why: "same `conv` closure and the same tuple-component call: string-building, not device work",
  },
  {
    file: "src/graph/subgraph.ts",
    expr: "spec.wrapper",
    sites: 1,
    why: "loop over a subgraph's EXPORTED INPUT PINS at validation time, once per graph build",
  },
  {
    file: "src/nodes/attributes.ts",
    expr: "mode",
    sites: 1,
    why: "attributeReduce's write-out loop runs over the TUPLE COMPONENTS of one detail value, not the domain",
  },
  {
    file: "src/nodes/attributes.ts",
    expr: "domain",
    sites: 1,
    why: "removeAttribute loops over `params.names` — the listed attribute names, a handful per cook",
  },
  {
    file: "src/nodes/filtering.ts",
    expr: "domain",
    sites: 1,
    why: "loop over the three OTHER domains while composing a did-you-mean message for a failed lookup",
  },
  {
    file: "src/nodes/forEach.ts",
    expr: "mode",
    sites: 1,
    why: "inside the GraphValidationError's own message: reached once, on the path that ends the cook",
  },
  {
    file: "src/nodes/paths.ts",
    expr: "groupName",
    sites: 1,
    why: "inside a thrown message on pointsToPath's short-group path; evaluated once, then the cook dies",
  },
  {
    file: "src/nodes/pointOps.ts",
    expr: "domain",
    sites: 1,
    why: "merge's schema union: per ITEM and per COLUMN of that item, not per element of a column",
  },
  {
    file: "src/nodes/registry.ts",
    expr: "side",
    sites: 1,
    why: "`pinInfos`' map at catalog build: per PIN DEF, and `required` is decided there exactly so nothing later re-asks",
  },
  {
    file: "src/nodes/runs.ts",
    expr: "arcAttr",
    sites: 3,
    why: "one loop over runFit's reporting SLOTS, and two per-vertex loops where the comparison sits inside the `throw` that ends the cook",
  },
  {
    file: "src/nodes/runs.ts",
    expr: "params.arcAttr",
    sites: 1,
    why: "runFit's period/wrap refusal, per PATH rather than per point, on the branch that throws",
  },
  {
    file: "src/nodes/sources.ts",
    expr: "mode",
    sites: 1,
    why: "inside a thrown message, in a loop over the two or three AXES of the scatter window",
  },
  {
    file: "src/nodes/topology.ts",
    expr: "mode",
    sites: 1,
    why: "the closest of these to hot: a per-point loop, but only on the MISS branch, which either ends the cook or takes the repair the node already pays a branch for",
  },
];

// ── the scan ──────────────────────────────────────────────────────────────

/** Names that mean "the params bag" when an expression is rooted in one. */
const PARAM_ROOTS: ReadonlySet<string> = new Set([
  "params",
  "opts",
  "options",
  "spec",
  "config",
]);

/** Wrappers that pass a param string through unchanged. */
const PASS_THROUGH_CALLS: ReadonlySet<string> = new Set(["canonicalOneOf", "String"]);

/** How far `const a = b` chains are followed before the tracer gives up. */
const MAX_TRACE_DEPTH = 6;

type FunctionLike =
  | ts.ArrowFunction
  | ts.FunctionExpression
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration;

const isFunctionLike = (n: ts.Node): n is FunctionLike =>
  ts.isArrowFunction(n) ||
  ts.isFunctionExpression(n) ||
  ts.isFunctionDeclaration(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isGetAccessor(n) ||
  ts.isSetAccessor(n) ||
  ts.isConstructorDeclaration(n);

const isLoop = (n: ts.Node): n is ts.IterationStatement => ts.isIterationStatement(n, false);

/** Every node that can introduce a binding this tracer knows about. */
const isScope = (n: ts.Node): boolean =>
  ts.isSourceFile(n) ||
  ts.isBlock(n) ||
  ts.isModuleBlock(n) ||
  ts.isCaseBlock(n) ||
  ts.isCatchClause(n) ||
  isFunctionLike(n) ||
  isLoop(n);

const parentOf = (n: ts.Node): ts.Node | undefined => n.parent as ts.Node | undefined;

type Decl = ts.VariableDeclaration | ts.ParameterDeclaration | ts.BindingElement | ts.Node;

const bindingFor = (name: ts.BindingName, wanted: string): Decl | undefined => {
  if (ts.isIdentifier(name)) return undefined; // handled by the caller, which owns the decl node
  for (const el of name.elements) {
    if (!ts.isBindingElement(el)) continue;
    if (ts.isIdentifier(el.name)) {
      if (el.name.text === wanted) return el;
    } else {
      const inner = bindingFor(el.name, wanted);
      if (inner) return inner;
    }
  }
  return undefined;
};

const declaredBy = (
  d: ts.VariableDeclaration | ts.ParameterDeclaration,
  wanted: string,
): Decl | undefined => {
  if (ts.isIdentifier(d.name)) return d.name.text === wanted ? d : undefined;
  return bindingFor(d.name, wanted);
};

/** The declarations a single scope node introduces, searched for one name. */
const declIn = (scope: ts.Node, wanted: string): Decl | undefined => {
  if (isFunctionLike(scope)) {
    for (const p of scope.parameters) {
      const hit = declaredBy(p, wanted);
      if (hit) return hit;
    }
  }
  if (ts.isCatchClause(scope) && scope.variableDeclaration) {
    const hit = declaredBy(scope.variableDeclaration, wanted);
    if (hit) return hit;
  }
  if (isLoop(scope) && (ts.isForStatement(scope) || ts.isForOfStatement(scope) || ts.isForInStatement(scope))) {
    const init = scope.initializer;
    if (init && ts.isVariableDeclarationList(init)) {
      for (const d of init.declarations) {
        const hit = declaredBy(d, wanted);
        if (hit) return hit;
      }
    }
  }
  const statements: readonly ts.Statement[] = ts.isSourceFile(scope)
    ? scope.statements
    : ts.isBlock(scope) || ts.isModuleBlock(scope)
      ? scope.statements
      : ts.isCaseBlock(scope)
        ? scope.clauses.flatMap((c) => [...c.statements])
        : [];
  for (const s of statements) {
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        const hit = declaredBy(d, wanted);
        if (hit) return hit;
      }
    }
    if (ts.isFunctionDeclaration(s) && s.name?.text === wanted) return s;
    if (ts.isClassDeclaration(s) && s.name?.text === wanted) return s;
    if (ts.isImportDeclaration(s)) {
      const clause = s.importClause;
      if (clause?.name?.text === wanted) return clause;
      const bindings = clause?.namedBindings;
      if (bindings) {
        if (ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) if (el.name.text === wanted) return el;
        } else if (bindings.name.text === wanted) return bindings;
      }
    }
  }
  return undefined;
};

interface Resolved {
  readonly decl: Decl;
  /** The scope node the declaration lives in — the boundary nesting is measured from. */
  readonly scope: ts.Node;
}

/** Walk outward from `from` for the innermost declaration of `wanted`. */
const resolve = (wanted: string, from: ts.Node): Resolved | undefined => {
  let node: ts.Node | undefined = from;
  while (node) {
    if (isScope(node)) {
      const decl = declIn(node, wanted);
      if (decl) return { decl, scope: node };
    }
    node = parentOf(node);
  }
  return undefined;
};

/** The identifier a property chain is rooted in, or undefined if computed. */
const rootOf = (expr: ts.Expression): ts.Identifier | undefined => {
  let e: ts.Expression = expr;
  for (;;) {
    if (ts.isPropertyAccessExpression(e)) e = e.expression;
    else if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    else break;
  }
  return ts.isIdentifier(e) ? e : undefined;
};

const isStringLiteralType = (t: ts.TypeNode): boolean =>
  ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal);

/**
 * A type node that is a union of string literals, directly or through a
 * named alias collected from anywhere in `src/`. Resolving this through the
 * real checker would need a Program, which costs seconds; the alias table
 * costs one extra pass over ASTs that are already parsed.
 */
const isStringUnion = (t: ts.TypeNode | undefined, aliases: ReadonlySet<string>, depth = 0): boolean => {
  if (!t || depth > 3) return false;
  if (isStringLiteralType(t)) return true;
  if (ts.isParenthesizedTypeNode(t)) return isStringUnion(t.type, aliases, depth);
  if (ts.isUnionTypeNode(t)) return t.types.every((x) => isStringUnion(x, aliases, depth + 1));
  if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName)) return aliases.has(t.typeName.text);
  return false;
};

/** Type alias names in `src/` whose right-hand side is a string-literal union. */
const collectStringUnionAliases = (files: readonly ts.SourceFile[]): ReadonlySet<string> => {
  const aliases = new Set<string>();
  // Three sweeps so an alias of an alias of an alias settles; the tree has
  // none deeper, and a fixed bound cannot loop on a circular alias.
  for (let pass = 0; pass < 3; pass++) {
    for (const sf of files) {
      const visit = (n: ts.Node): void => {
        if (ts.isTypeAliasDeclaration(n) && !aliases.has(n.name.text) && isStringUnion(n.type, aliases)) {
          aliases.add(n.name.text);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
  }
  return aliases;
};

/** Why an expression counts as param-derived, or undefined if it does not. */
const paramSource = (
  decl: Decl,
  aliases: ReadonlySet<string>,
  seen: Set<ts.Node>,
  depth: number,
): string | undefined => {
  if (depth > MAX_TRACE_DEPTH || seen.has(decl)) return undefined;
  seen.add(decl);
  if (ts.isParameter(decl)) {
    if (isStringUnion(decl.type, aliases)) return "a string-union parameter";
    if (ts.isIdentifier(decl.name) && PARAM_ROOTS.has(decl.name.text)) return "the params bag";
    return undefined;
  }
  if (ts.isBindingElement(decl)) {
    let owner: ts.Node | undefined = parentOf(decl);
    while (owner && !ts.isVariableDeclaration(owner) && !ts.isParameter(owner)) owner = parentOf(owner);
    if (!owner) return undefined;
    if (ts.isParameter(owner)) {
      if (isStringUnion(owner.type, aliases)) return "a string-union parameter";
      // `execute({ inputs, params, seed })`: the ctx parameter carries no
      // annotation, so only the BOUND NAME says this is the params bag.
      const bound = decl.propertyName ?? decl.name;
      if (ts.isIdentifier(bound) && PARAM_ROOTS.has(bound.text)) return `a destructured \`${bound.text}\``;
      if (
        owner.type &&
        ts.isTypeReferenceNode(owner.type) &&
        ts.isIdentifier(owner.type.typeName) &&
        /(?:Params|Opts|Options|Spec|Config)$/.test(owner.type.typeName.text)
      ) {
        return `a destructured ${owner.type.typeName.text}`;
      }
      return undefined;
    }
    return fromExpression(owner.initializer, aliases, seen, depth + 1);
  }
  if (ts.isVariableDeclaration(decl)) {
    if (isStringUnion(decl.type, aliases)) return "a string-union local";
    return fromExpression(decl.initializer, aliases, seen, depth + 1);
  }
  return undefined;
};

const fromExpression = (
  expr: ts.Expression | undefined,
  aliases: ReadonlySet<string>,
  seen: Set<ts.Node>,
  depth: number,
): string | undefined => {
  if (!expr || depth > MAX_TRACE_DEPTH) return undefined;
  if (
    ts.isParenthesizedExpression(expr) ||
    ts.isNonNullExpression(expr) ||
    ts.isAsExpression(expr) ||
    ts.isSatisfiesExpression(expr)
  ) {
    return fromExpression(expr.expression, aliases, seen, depth + 1);
  }
  if (
    ts.isBinaryExpression(expr) &&
    (expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    return (
      fromExpression(expr.left, aliases, seen, depth + 1) ??
      fromExpression(expr.right, aliases, seen, depth + 1)
    );
  }
  if (ts.isConditionalExpression(expr)) {
    return (
      fromExpression(expr.whenTrue, aliases, seen, depth + 1) ??
      fromExpression(expr.whenFalse, aliases, seen, depth + 1) ??
      fromExpression(expr.condition, aliases, seen, depth + 1)
    );
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : "";
    if (!PASS_THROUGH_CALLS.has(name)) return undefined;
    for (const a of expr.arguments) {
      const via = fromExpression(a, aliases, seen, depth + 1);
      if (via) return via;
    }
    return "a canonicalized enum param";
  }
  if (ts.isPropertyAccessExpression(expr) || ts.isIdentifier(expr)) {
    const root = ts.isIdentifier(expr) ? expr : rootOf(expr);
    if (!root) return undefined;
    if (ts.isPropertyAccessExpression(expr) && PARAM_ROOTS.has(root.text)) return `\`${root.text}.…\``;
    const found = resolve(root.text, expr);
    return found ? paramSource(found.decl, aliases, seen, depth + 1) : undefined;
  }
  return undefined;
};

/** An identifier or a plain property chain; anything else is not a candidate. */
const candidate = (expr: ts.Expression): ts.Expression | undefined => {
  if (ts.isParenthesizedExpression(expr) || ts.isNonNullExpression(expr) || ts.isAsExpression(expr)) {
    return candidate(expr.expression);
  }
  if (ts.isIdentifier(expr)) return expr;
  if (ts.isPropertyAccessExpression(expr) && rootOf(expr)) return expr;
  return undefined;
};

const EQUALITY: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

const isStringLit = (n: ts.Node): boolean =>
  ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);

interface Finding {
  readonly file: string;
  readonly expr: string;
  readonly line: number;
  readonly literal: string;
  readonly why: string;
  /** What stands between the comparison and the scope that decided the value. */
  readonly nesting: string;
}

const listTs = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) listTs(p, out);
    else if (
      entry.endsWith(".ts") &&
      !entry.endsWith(".d.ts") &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".testsupport.ts") &&
      !entry.endsWith(".typetest.ts")
    ) {
      out.push(p);
    }
  }
  return out;
};

const scan = (): readonly Finding[] => {
  const paths = listTs(join(repoRoot, "src")).sort();
  const parsed = paths.map((p) =>
    ts.createSourceFile(p, readFileSync(p, "utf8"), ts.ScriptTarget.ES2022, true),
  );
  const aliases = collectStringUnionAliases(parsed);
  const findings: Finding[] = [];

  for (const sf of parsed) {
    const file = relative(repoRoot, sf.fileName).split(sep).join("/");
    const record = (node: ts.Node, operand: ts.Expression, literal: string): void => {
      const root = rootOf(operand);
      if (!root) return;
      const found = resolve(root.text, operand);
      if (!found) return;
      const why =
        ts.isPropertyAccessExpression(operand) && PARAM_ROOTS.has(root.text)
          ? `\`${root.text}.…\``
          : paramSource(found.decl, aliases, new Set<ts.Node>(), 0);
      if (!why) return;
      let cursor: ts.Node | undefined = parentOf(node);
      let loops = 0;
      let closures = 0;
      while (cursor && cursor !== found.scope) {
        if (isLoop(cursor)) loops++;
        else if (isFunctionLike(cursor)) closures++;
        cursor = parentOf(cursor);
      }
      if (loops === 0 && closures === 0) return;
      const nesting = [
        loops > 0 ? `${loops} loop${loops > 1 ? "s" : ""}` : "",
        closures > 0 ? `${closures} nested function${closures > 1 ? "s" : ""}` : "",
      ]
        .filter((s) => s !== "")
        .join(" and ");
      findings.push({
        file,
        expr: operand.getText(sf),
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        literal,
        why,
        nesting,
      });
    };

    const visit = (n: ts.Node): void => {
      if (ts.isBinaryExpression(n) && EQUALITY.has(n.operatorToken.kind)) {
        if (isStringLit(n.right)) {
          const operand = candidate(n.left);
          if (operand) record(n, operand, JSON.stringify((n.right as ts.StringLiteral).text));
        } else if (isStringLit(n.left)) {
          const operand = candidate(n.right);
          if (operand) record(n, operand, JSON.stringify((n.left as ts.StringLiteral).text));
        }
      } else if (ts.isSwitchStatement(n)) {
        const hasStringCase = n.caseBlock.clauses.some(
          (c) => ts.isCaseClause(c) && isStringLit(c.expression),
        );
        if (hasStringCase) {
          const operand = candidate(n.expression);
          if (operand) record(n, operand, "<switch on string cases>");
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return findings;
};

// One scan for every assertion below; parsing 186 files twice is the only
// avoidable cost in here.
const FINDINGS = scan();

const keyOf = (file: string, expr: string): string => `${file}::${expr}`;

describe("a param string is never compared where it is evaluated per element", () => {
  it("finds no site that is not on the frozen allowlist", () => {
    const allowed = new Set(ALLOWED.map((a) => keyOf(a.file, a.expr)));
    const unlisted = FINDINGS.filter((f) => !allowed.has(keyOf(f.file, f.expr)));
    const report = unlisted
      .map(
        (f) =>
          `  ${f.file}:${f.line}  \`${f.expr}\` compared against ${f.literal}, ` +
          `${f.nesting} below where ${f.why} decided it`,
      )
      .join("\n");
    expect(
      unlisted.length === 0,
      unlisted.length === 0
        ? ""
        : `A param string is compared inside a per-element loop or closure:\n${report}\n\n` +
            "This is the shape that miscompiled under V8 — read the canonical note in " +
            "`src/noise/worley.ts`. Decide the answer ONCE, above the loop or above the " +
            "closure, and compare the boolean inside it; if the value crosses a seam, " +
            "canonicalize it with `canonicalOneOf` (src/diagnostics/canonical.ts). If the " +
            "site is genuinely not per element, add it to ALLOWED in " +
            "`tests/paramStringComparisons.test.ts` with a one-line reason:\n" +
            [...new Set(unlisted.map((f) => keyOf(f.file, f.expr)))]
              .map((k) => {
                const same = FINDINGS.filter((g) => keyOf(g.file, g.expr) === k);
                const first = same[0]!;
                return (
                  `  { file: ${JSON.stringify(first.file)}, expr: ${JSON.stringify(first.expr)}, ` +
                  `sites: ${same.length}, why: "…" },`
                );
              })
              .join("\n"),
    ).toBe(true);
  });

  it("has no stale allowlist entry", () => {
    const counted = new Map<string, number>();
    for (const f of FINDINGS) {
      const k = keyOf(f.file, f.expr);
      counted.set(k, (counted.get(k) ?? 0) + 1);
    }
    const stale = ALLOWED.flatMap((a) => {
      const k = keyOf(a.file, a.expr);
      const actual = counted.get(k) ?? 0;
      if (actual === a.sites) return [];
      return [
        actual === 0
          ? `  ${a.file}: \`${a.expr}\` is no longer found at all — delete this entry`
          : `  ${a.file}: \`${a.expr}\` is listed as ${a.sites} site${a.sites > 1 ? "s" : ""} but the scan finds ${actual}` +
            ` (lines ${FINDINGS.filter((f) => keyOf(f.file, f.expr) === k)
              .map((f) => f.line)
              .join(", ")})`,
      ];
    });
    expect(
      stale.length === 0,
      stale.length === 0
        ? ""
        : `The allowlist in \`tests/paramStringComparisons.test.ts\` no longer describes the tree:\n${stale.join("\n")}\n\n` +
            "An entry that has been fixed must be removed, and a count that grew is a new " +
            "site that needs its own look before the number is raised.",
    ).toBe(true);
  });

  it("does not fire on a comparison against per-element data", () => {
    // The boundary in item 3 of the rule above, checked rather than asserted.
    // `src/cli/render.ts` reads a primitive's type string out of an attribute
    // column and compares it inside the loop over primitives — a different
    // string every iteration, so there is nothing loop-invariant to hoist.
    const render = FINDINGS.filter((f) => f.file === "src/cli/render.ts");
    expect(render).toEqual([]);
    const renderSource = readFileSync(join(repoRoot, "src/cli/render.ts"), "utf8");
    expect(renderSource).toContain('=== "polyline"');
  });
});
