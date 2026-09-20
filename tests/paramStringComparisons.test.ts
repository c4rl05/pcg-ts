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
 * A finding is a comparison of a STRING CONSTANT against an expression
 * that is BOTH:
 *
 *   1. PARAM-DERIVED — traced through its DECLARATION, never through its
 *      name, to a node's params bag (a parameter named `params`/`opts`/
 *      `options`/`spec`/`config`, or one of those destructured out of an
 *      `execute({ ... })` ctx), to a parameter destructured from a
 *      `…Params`/`…Opts`/`…Options`/`…Spec`/`…Config` type, or to a
 *      parameter or annotated local whose type is a union of string
 *      literals. `??`, `||`, `?:` and a `canonicalOneOf(...)` /
 *      `String(...)` wrapper are followed through; `const a = b` chains
 *      are followed up to six links. A module-scope `const spec = {...}`
 *      or an imported `config` is NOT param-derived — the name is not the
 *      evidence, the declaration is.
 *
 *   2. EVALUATED BELOW WHERE THE PARAM WAS AVAILABLE — between the
 *      comparison and the scope holding that ORIGIN declaration there is
 *      at least one loop or at least one nested function.
 *
 *      MEASURING FROM THE ORIGIN AND NOT FROM THE NEAREST LOCAL IS THE
 *      WHOLE POINT, and the first version of this file got it wrong. If
 *      the boundary is measured from wherever the compared identifier
 *      happens to be declared, then `for (…) { const mode = params.mode;
 *      if (mode === "x") … }` is clean — the declaration is inside the
 *      loop, so nothing stands between them. That is not an exotic
 *      shape: it is exactly what a careless "I moved it into a local"
 *      fix produces, and it is strictly worse than the bug it was
 *      meant to fix.
 *
 * `===`, `!==`, `==`, `!=` and `switch (x) { case …: }` all count. A
 * STRING CONSTANT is a string literal, a module-scope `const WRAP =
 * "wrap"`, or a property of a module-scope const object
 * (`MODES.wrap`), resolved in this file first and then across `src/`;
 * otherwise `params.mode === WRAP` would be a one-line way to silence
 * this test without fixing anything. Only identifiers and plain property
 * chains are candidates on the other side; anything computed is not, and
 * a root that is REASSIGNED anywhere in its own scope is dropped, because
 * a `let phase` a loop writes to is not loop-invariant and hoisting it
 * would be wrong advice.
 *
 * THE COST OF THE CLOSURE HALF, MEASURED: counting loop bodies alone
 * finds 9 sites and counting loops plus nested functions finds 20. The
 * loop-only rule is cheaper to freeze and would have scored the bug that
 * actually happened as clean — worley's comparison was in an arrow
 * returned from an arrow, not in a `for` body — so the closure half is
 * the whole point.
 *
 * ── WHAT IS NOT A FINDING, DELIBERATELY ─────────────────────────────────
 *
 * A comparison against PER-ELEMENT DATA. `attr.getString(i) === "polyline"`
 * reads a different string every iteration, so there is no loop-invariant
 * answer to hoist and nothing to hoist it to. Those are excluded
 * structurally: the left side is a call, not an identifier, and
 * `slot.name === ""` two lines above a flagged `arcAttr === ""` in
 * `src/nodes/runs.ts` is excluded because `slot` is the loop's own
 * binding. So is a `let` the loop assigns to. The fixtures below check
 * every one of these rather than asserting them.
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
 * THE BIG ONE, STATED PLAINLY: a helper defined at the top level of a
 * module and CALLED once per element from somewhere else is invisible.
 * The scan is syntactic. It knows "nested inside", not "called from", so
 * `export function orientQuat(mode: AxisMode, …) { … mode === "x" … }`
 * with the loop in another file reads as a comparison in the function
 * that owns the parameter — zero nesting, no finding — however hot the
 * caller is. That is a real pre-fix shape in this repo's history, and
 * this scan would NOT have caught it, while it does catch pre-fix worley.
 * Anything that fixes it needs a call graph, which is a different tool.
 *
 * Also invisible:
 *
 * - A string reached through an alias the tracer cannot follow: an object
 *   field (`this.mode`), an array element, or a value returned by a call
 *   it does not know. `const spec = specOf(id); … spec.wrapper === "forEach"`
 *   in `src/graph/subgraph.ts` is exactly that and is NOT reported, which
 *   is the price of refusing to treat a NAME as evidence.
 * - A parameter whose string-union type comes from an indexed access or a
 *   mapped type rather than a named alias.
 * - Anything outside `src/`. `demos/`, `editor/` and `shared/` are hosts,
 *   not the library, and are not scanned.
 * - Whether a flagged site is actually hot. It cannot be: "per element" is
 *   a property of the caller. Every judgement of that kind lives in the
 *   allowlist's reason column, which is a claim a reviewer can check.
 *
 * ── THE ALLOWLIST ───────────────────────────────────────────────────────
 *
 * Frozen at what exists today so the debt is visible and cannot grow by
 * accident. An entry names the file, the compared expression, THE COMPARED
 * STRING, how many sites there are, and why that one is not the bug. The
 * literal is part of the key because without it a cold site could be
 * hoisted away and a hot `mode === "repair"` added in the same file on the
 * same expression with the count unchanged, and nothing would notice; that
 * swap was tried and it passed.
 *
 * A stale entry fails too — a site that no longer exists, or one whose
 * count moved in either direction — so the list cannot rot into a list of
 * things that used to be true. Line numbers are deliberately NOT part of an
 * entry: they move on every edit above them and would turn this into a test
 * that fails for reasons no one reads.
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
  readonly literal: string;
  readonly sites: number;
  readonly why: string;
}

const ALLOWED: readonly Allowed[] = [
  {
    file: "src/cli/commands.ts",
    expr: "side",
    literal: '"input"',
    sites: 1,
    why: "pin formatter closure in `nodeDetailText`: per PIN of one node type, building CLI text",
  },
  {
    file: "src/cli/commands.ts",
    expr: "kind",
    literal: '"node"',
    sites: 1,
    why: "`corpusFor`'s ranking predicate: per corpus INDEX ENTRY, building CLI text",
  },
  {
    file: "src/docs/node-reference.ts",
    expr: "side",
    literal: '"input"',
    sites: 1,
    why: "the same pin formatter for the markdown catalog; doc generation, never a cook",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "targetType",
    literal: '<switch "f32"|"i32"|"u32">',
    sites: 1,
    why: "`conv`'s switch, called once per TUPLE COMPONENT while emitting WGSL source at pipeline build",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "srcType",
    literal: '"f32"',
    sites: 3,
    why: "same `conv` closure and the same tuple-component call: string-building, not device work",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "srcType",
    literal: '"i32"',
    sites: 2,
    why: "same `conv` closure and the same tuple-component call: string-building, not device work",
  },
  {
    file: "src/gpu/applyKernels.ts",
    expr: "srcType",
    literal: '"u32"',
    sites: 1,
    why: "same `conv` closure and the same tuple-component call: string-building, not device work",
  },
  {
    file: "src/nodes/attributes.ts",
    expr: "mode",
    literal: '"average"',
    sites: 1,
    why: "attributeReduce's write-out loop runs over the TUPLE COMPONENTS of one detail value, not the domain",
  },
  {
    file: "src/nodes/attributes.ts",
    expr: "domain",
    literal: '"point"',
    sites: 1,
    why: "removeAttribute loops over `params.names` — the listed attribute names, a handful per cook",
  },
  {
    file: "src/nodes/filtering.ts",
    expr: "domain",
    literal: '"primitive"',
    sites: 1,
    why: "loop over the three OTHER domains while composing a did-you-mean message for a failed lookup",
  },
  {
    file: "src/nodes/forEach.ts",
    expr: "mode",
    literal: '"each"',
    sites: 1,
    why: "inside the GraphValidationError's own message: reached once, on the path that ends the cook",
  },
  {
    file: "src/nodes/paths.ts",
    expr: "groupName",
    literal: '""',
    sites: 1,
    why: "inside a thrown message on pointsToPath's short-group path; evaluated once, then the cook dies",
  },
  {
    file: "src/nodes/pointOps.ts",
    expr: "domain",
    literal: '"primitive"',
    sites: 1,
    why: "merge's schema union: per ITEM and per COLUMN of that item, not per element of a column",
  },
  {
    file: "src/nodes/registry.ts",
    expr: "side",
    literal: '"input"',
    sites: 1,
    why: "`pinInfos`' map at catalog build: per PIN DEF, and `required` is decided there exactly so nothing later re-asks",
  },
  {
    file: "src/nodes/runs.ts",
    expr: "arcAttr",
    literal: '""',
    sites: 2,
    why: "two per-vertex loops in runFit where the comparison sits INSIDE the `throw` that ends the cook, not in its guard",
  },
  {
    file: "src/nodes/sources.ts",
    expr: "mode",
    literal: '"xz"',
    sites: 1,
    why: "inside a thrown message, in a loop over the two or three AXES of the scatter window",
  },
];

// ── the scan ──────────────────────────────────────────────────────────────

/**
 * Names that mean "the params bag" — but ONLY when the declaration they
 * resolve to is a parameter, or a binding destructured out of one. A
 * module-scope `const config = …` wearing one of these names is not a
 * param and must not be treated as one.
 */
const PARAM_ROOTS: ReadonlySet<string> = new Set([
  "params",
  "opts",
  "options",
  "spec",
  "config",
]);

/** Type-name suffixes that mark a destructured parameter as a params bag. */
const PARAM_TYPE_SUFFIX = /(?:Params|Opts|Options|Spec|Config)$/;

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

/** Everything `declIn` can hand back: a binding, or the thing that named it. */
type Decl =
  | ts.VariableDeclaration
  | ts.ParameterDeclaration
  | ts.BindingElement
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.ImportClause
  | ts.ImportSpecifier
  | ts.NamespaceImport;

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

const bindingFor = (name: ts.BindingName, wanted: string): ts.BindingElement | undefined => {
  if (ts.isIdentifier(name)) return undefined;
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
  if (ts.isForStatement(scope) || ts.isForOfStatement(scope) || ts.isForInStatement(scope)) {
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
  /** The scope node the declaration lives in. */
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

/**
 * Is `name` written to anywhere inside `scope`? A `let phase: Phase` a loop
 * reassigns is not loop-invariant: there is nothing to hoist, and telling
 * an author to hoist it would be wrong.
 */
const isReassignedIn = (name: string, scope: ts.Node): boolean => {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (
      ts.isBinaryExpression(n) &&
      ts.isIdentifier(n.left) &&
      n.left.text === name &&
      (n.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
        (n.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment &&
          n.operatorToken.kind <= ts.SyntaxKind.LastCompoundAssignment))
    ) {
      found = true;
      return;
    }
    if (
      (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
      (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) &&
      ts.isIdentifier(n.operand) &&
      n.operand.text === name
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(scope);
  return found;
};

const isStringLiteralType = (t: ts.TypeNode): boolean =>
  ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal);

/**
 * A type node that is a union of string literals, directly or through a
 * named alias collected from anywhere in `src/`. Resolving this through the
 * real checker would need a Program, which costs seconds; the alias table
 * costs a few extra passes over ASTs that are already parsed.
 */
const isStringUnion = (
  t: ts.TypeNode | undefined,
  aliases: ReadonlySet<string>,
  depth = 0,
): boolean => {
  if (!t || depth > 3) return false;
  if (isStringLiteralType(t)) return true;
  if (ts.isParenthesizedTypeNode(t)) return isStringUnion(t.type, aliases, depth);
  if (ts.isUnionTypeNode(t)) return t.types.every((x) => isStringUnion(x, aliases, depth + 1));
  if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName)) return aliases.has(t.typeName.text);
  return false;
};

/**
 * Type alias names whose right-hand side is a string-literal union, iterated
 * to a FIXED POINT rather than for a fixed number of sweeps: an alias of an
 * alias of an alias settles whatever order the files came in. The bound is
 * only there so a circular alias cannot spin.
 */
const collectStringUnionAliases = (files: readonly ts.SourceFile[]): ReadonlySet<string> => {
  const aliases = new Set<string>();
  for (let pass = 0; pass < 32; pass++) {
    const before = aliases.size;
    for (const sf of files) {
      const visit = (n: ts.Node): void => {
        if (
          ts.isTypeAliasDeclaration(n) &&
          !aliases.has(n.name.text) &&
          isStringUnion(n.type, aliases)
        ) {
          aliases.add(n.name.text);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    if (aliases.size === before) return aliases;
  }
  return aliases;
};

/** Module-scope string constants, so `params.mode === WRAP` reads as a literal. */
interface ConstTables {
  /** `const WRAP = "wrap"` → name ⇒ value. */
  readonly scalars: ReadonlyMap<string, string>;
  /** `const MODES = { wrap: "wrap" }` → name ⇒ property ⇒ value. */
  readonly objects: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

const stringOf = (e: ts.Expression | undefined): string | undefined => {
  if (!e) return undefined;
  if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) return stringOf(e.expression);
  return ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) ? e.text : undefined;
};

const objectOf = (e: ts.Expression | undefined): ts.ObjectLiteralExpression | undefined => {
  if (!e) return undefined;
  if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) return objectOf(e.expression);
  return ts.isObjectLiteralExpression(e) ? e : undefined;
};

const collectStringConsts = (files: readonly ts.SourceFile[]): ConstTables => {
  const scalars = new Map<string, string>();
  const objects = new Map<string, Map<string, string>>();
  for (const sf of files) {
    for (const s of sf.statements) {
      if (!ts.isVariableStatement(s)) continue;
      if ((s.declarationList.flags & ts.NodeFlags.Const) === 0) continue;
      for (const d of s.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        const value = stringOf(d.initializer);
        if (value !== undefined) {
          // A name with two different values across `src/` keeps the first
          // in file order; the scan is deterministic either way, and the
          // reported literal is what matters for the allowlist key.
          if (!scalars.has(d.name.text)) scalars.set(d.name.text, value);
          continue;
        }
        const obj = objectOf(d.initializer);
        if (!obj) continue;
        const props = new Map<string, string>();
        for (const p of obj.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
          const v = stringOf(p.initializer);
          if (key !== undefined && v !== undefined) props.set(key, v);
        }
        if (props.size > 0 && !objects.has(d.name.text)) objects.set(d.name.text, props);
      }
    }
  }
  return { scalars, objects };
};

/**
 * The string this expression IS, if it is one: a literal, a module-scope
 * `const X = "lit"`, or `OBJ.prop` of a module-scope const object. Resolved
 * through the declaration where there is one in scope, and through the
 * cross-`src/` table for an imported name.
 */
const constString = (expr: ts.Expression, consts: ConstTables): string | undefined => {
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr)) {
    return constString(expr.expression, consts);
  }
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isIdentifier(expr)) {
    const found = resolve(expr.text, expr);
    if (found && ts.isVariableDeclaration(found.decl)) {
      const list = parentOf(found.decl);
      const isConst =
        list !== undefined &&
        ts.isVariableDeclarationList(list) &&
        (list.flags & ts.NodeFlags.Const) !== 0;
      if (isConst) return stringOf(found.decl.initializer);
      return undefined;
    }
    if (found && (ts.isImportSpecifier(found.decl) || ts.isImportClause(found.decl))) {
      return consts.scalars.get(expr.text);
    }
    if (!found) return consts.scalars.get(expr.text);
    return undefined;
  }
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
    const holder = expr.expression.text;
    const key = expr.name.text;
    const found = resolve(holder, expr);
    if (found && ts.isVariableDeclaration(found.decl)) {
      const obj = objectOf(found.decl.initializer);
      if (!obj) return undefined;
      for (const p of obj.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
        if (name === key) return stringOf(p.initializer);
      }
      return undefined;
    }
    return consts.objects.get(holder)?.get(key);
  }
  return undefined;
};

/** Where a param-derived value came from, and the scope it was available in. */
interface Origin {
  readonly why: string;
  readonly scope: ts.Node;
}

interface TraceCtx {
  readonly aliases: ReadonlySet<string>;
  readonly seen: Set<ts.Node>;
}

const originOfDecl = (found: Resolved, ctx: TraceCtx, depth: number): Origin | undefined => {
  const { decl, scope } = found;
  if (depth > MAX_TRACE_DEPTH || ctx.seen.has(decl)) return undefined;
  ctx.seen.add(decl);
  if (ts.isParameter(decl)) {
    if (isStringUnion(decl.type, ctx.aliases)) return { why: "a string-union parameter", scope };
    if (ts.isIdentifier(decl.name) && PARAM_ROOTS.has(decl.name.text)) {
      return { why: `the \`${decl.name.text}\` parameter`, scope };
    }
    return undefined;
  }
  if (ts.isBindingElement(decl)) {
    let owner: ts.Node | undefined = parentOf(decl);
    while (owner && !ts.isVariableDeclaration(owner) && !ts.isParameter(owner)) owner = parentOf(owner);
    if (!owner) return undefined;
    if (ts.isParameter(owner)) {
      if (isStringUnion(owner.type, ctx.aliases)) return { why: "a string-union parameter", scope };
      // `execute({ inputs, params, seed })`: the ctx parameter carries no
      // annotation, so only the BOUND NAME says this is the params bag —
      // and it is a PARAMETER, which is the evidence a module-scope const
      // of the same name would not have.
      const bound = decl.propertyName ?? decl.name;
      if (ts.isIdentifier(bound) && PARAM_ROOTS.has(bound.text)) {
        return { why: `a destructured \`${bound.text}\``, scope };
      }
      if (
        owner.type &&
        ts.isTypeReferenceNode(owner.type) &&
        ts.isIdentifier(owner.type.typeName) &&
        PARAM_TYPE_SUFFIX.test(owner.type.typeName.text)
      ) {
        return { why: `a destructured ${owner.type.typeName.text}`, scope };
      }
      return undefined;
    }
    return originOfExpression(owner.initializer, ctx, depth + 1);
  }
  if (ts.isVariableDeclaration(decl)) {
    if (isStringUnion(decl.type, ctx.aliases)) return { why: "a string-union local", scope };
    return originOfExpression(decl.initializer, ctx, depth + 1);
  }
  return undefined;
};

function originOfExpression(
  expr: ts.Expression | undefined,
  ctx: TraceCtx,
  depth: number,
): Origin | undefined {
  if (!expr || depth > MAX_TRACE_DEPTH) return undefined;
  if (
    ts.isParenthesizedExpression(expr) ||
    ts.isNonNullExpression(expr) ||
    ts.isAsExpression(expr) ||
    ts.isSatisfiesExpression(expr)
  ) {
    return originOfExpression(expr.expression, ctx, depth + 1);
  }
  if (
    ts.isBinaryExpression(expr) &&
    (expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    return (
      originOfExpression(expr.left, ctx, depth + 1) ??
      originOfExpression(expr.right, ctx, depth + 1)
    );
  }
  if (ts.isConditionalExpression(expr)) {
    return (
      originOfExpression(expr.whenTrue, ctx, depth + 1) ??
      originOfExpression(expr.whenFalse, ctx, depth + 1) ??
      originOfExpression(expr.condition, ctx, depth + 1)
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
      const via = originOfExpression(a, ctx, depth + 1);
      if (via) return via;
    }
    return undefined;
  }
  if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
    const root = ts.isIdentifier(expr) ? expr : rootOf(expr);
    if (!root) return undefined;
    const found = resolve(root.text, expr);
    return found ? originOfDecl(found, ctx, depth + 1) : undefined;
  }
  return undefined;
}

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

interface Finding {
  readonly file: string;
  readonly expr: string;
  readonly line: number;
  /** The compared string, quoted — part of the allowlist key. */
  readonly literal: string;
  readonly why: string;
  /** What stands between the comparison and the scope the param reached. */
  readonly nesting: string;
}

interface SourceEntry {
  readonly fileName: string;
  readonly text: string;
}

const scanSources = (entries: readonly SourceEntry[]): readonly Finding[] => {
  const parsed = entries.map((e) =>
    ts.createSourceFile(e.fileName, e.text, ts.ScriptTarget.ES2022, true),
  );
  const aliases = collectStringUnionAliases(parsed);
  const consts = collectStringConsts(parsed);
  const findings: Finding[] = [];

  for (const sf of parsed) {
    const file = sf.fileName;
    const record = (node: ts.Node, operand: ts.Expression, literal: string): void => {
      const root = rootOf(operand);
      if (!root) return;
      const found = resolve(root.text, operand);
      if (!found) return;
      // A value the code writes to is not loop-invariant; there is nothing
      // to hoist and the message's advice would be wrong.
      if (isReassignedIn(root.text, found.scope)) return;
      const origin = originOfDecl(found, { aliases, seen: new Set<ts.Node>() }, 0);
      if (!origin) return;
      let cursor: ts.Node | undefined = parentOf(node);
      let loops = 0;
      let closures = 0;
      while (cursor && cursor !== origin.scope) {
        if (isLoop(cursor)) loops++;
        else if (isFunctionLike(cursor)) closures++;
        cursor = parentOf(cursor);
      }
      if (cursor === undefined) return; // origin scope is not an ancestor
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
        why: origin.why,
        nesting,
      });
    };

    const visit = (n: ts.Node): void => {
      if (ts.isBinaryExpression(n) && EQUALITY.has(n.operatorToken.kind)) {
        const left = constString(n.left, consts);
        const right = constString(n.right, consts);
        // Exactly one side a string constant: two is constant folding, none
        // is not a string comparison at all.
        if (right !== undefined && left === undefined) {
          const operand = candidate(n.left);
          if (operand) record(n, operand, JSON.stringify(right));
        } else if (left !== undefined && right === undefined) {
          const operand = candidate(n.right);
          if (operand) record(n, operand, JSON.stringify(left));
        }
      } else if (ts.isSwitchStatement(n)) {
        const cases = n.caseBlock.clauses
          .filter((c): c is ts.CaseClause => ts.isCaseClause(c))
          .map((c) => constString(c.expression, consts))
          .filter((v): v is string => v !== undefined);
        if (cases.length > 0) {
          const operand = candidate(n.expression);
          const label = `<switch ${[...new Set(cases)].sort().map((v) => JSON.stringify(v)).join("|")}>`;
          if (operand) record(n, operand, label);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return findings;
};

/**
 * `.mjs` as well as `.ts`: `src/gpu/deviceRunner.mjs` is the one source file
 * here that is not TypeScript, it is bundled by path into the device suites,
 * and leaving it out would be a hole shaped exactly like the next file
 * someone writes in plain JS.
 */
const SCANNED = /\.(?:ts|mts|mjs|js)$/;
const NOT_PRODUCTION = /\.(?:d|test|testsupport|typetest)\.[cm]?[jt]s$/;

const listSources = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) listSources(p, out);
    else if (SCANNED.test(entry) && !NOT_PRODUCTION.test(entry)) out.push(p);
  }
  return out;
};

const scanRepo = (): readonly Finding[] => {
  const paths = listSources(join(repoRoot, "src")).sort();
  return scanSources(
    paths.map((p) => ({
      fileName: relative(repoRoot, p).split(sep).join("/"),
      text: readFileSync(p, "utf8"),
    })),
  );
};

// One scan for every assertion below.
const FINDINGS = scanRepo();

const keyOf = (file: string, expr: string, literal: string): string =>
  `${file}::${expr}::${literal}`;
const keyOfFinding = (f: Finding): string => keyOf(f.file, f.expr, f.literal);

// ── fixtures ──────────────────────────────────────────────────────────────

/**
 * The scanner's own tests. These are in-memory sources rather than temporary
 * files under `src/`, so nothing about them can reach a build, and rather
 * than asserting against unrelated production code they state the shape
 * they mean. Each says how many findings it must produce.
 */
interface Fixture {
  readonly name: string;
  readonly source: string;
  readonly expect: number;
  /** Substrings every failure message for this fixture must contain. */
  readonly names?: readonly string[];
}

const VIOLATIONS: readonly Fixture[] = [
  {
    name: "worley's pre-fix shape: a param compared in a closure called per point",
    source: `
export interface Opts { readonly output?: "f1" | "f2" | "cell"; }
export function worley(opts: Opts = {}): (x: number) => number {
  const output = opts.output ?? "f1";
  return (x: number): number => (output === "cell" ? x : x * 2);
}
`,
    expect: 1,
    names: ["output", '"cell"'],
  },
  {
    name: "a param compared in a loop body",
    source: `
export interface Opts { readonly output?: "f1" | "f2"; }
export function run(opts: Opts, xs: Float32Array): number {
  const output = opts.output ?? "f1";
  let acc = 0;
  for (let i = 0; i < xs.length; i++) acc += output === "f2" ? xs[i]! : 0;
  return acc;
}
`,
    expect: 1,
    names: ["output", '"f2"'],
  },
  {
    name: "THE CARELESS FIX: the param re-read into a local INSIDE the loop",
    source: `
export const node = {
  execute({ params, xs }: { params: { mode: string }; xs: Float32Array }): number {
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const mode = params.mode;
      if (mode === "wrap") acc += xs[i]!;
    }
    return acc;
  },
};
`,
    expect: 1,
    names: ["mode", '"wrap"'],
  },
  {
    name: "the params bag read directly inside the loop",
    source: `
export const node = {
  execute({ params, xs }: { params: { mode: string }; xs: Float32Array }): number {
    let acc = 0;
    for (let i = 0; i < xs.length; i++) if (params.mode === "wrap") acc += xs[i]!;
    return acc;
  },
};
`,
    expect: 1,
    names: ["params.mode", '"wrap"'],
  },
  {
    name: "compared against a NAMED module constant rather than a literal",
    source: `
const WRAP = "wrap";
export const node = {
  execute({ params, xs }: { params: { mode: string }; xs: Float32Array }): number {
    let acc = 0;
    for (let i = 0; i < xs.length; i++) if (params.mode === WRAP) acc += xs[i]!;
    return acc;
  },
};
`,
    expect: 1,
    names: ["params.mode", '"wrap"'],
  },
  {
    name: "compared against a property of a module const object",
    source: `
const MODES = { wrap: "wrap", clamp: "clamp" } as const;
export const node = {
  execute({ params, xs }: { params: { mode: string }; xs: Float32Array }): number {
    let acc = 0;
    for (let i = 0; i < xs.length; i++) if (params.mode === MODES.wrap) acc += xs[i]!;
    return acc;
  },
};
`,
    expect: 1,
    names: ["params.mode", '"wrap"'],
  },
  {
    name: "a switch on a param, with named-constant cases",
    source: `
const WRAP = "wrap";
const CLAMP = "clamp";
export const node = {
  execute({ params, xs }: { params: { mode: string }; xs: Float32Array }): number {
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      switch (params.mode) {
        case WRAP: acc += xs[i]!; break;
        case CLAMP: acc -= xs[i]!; break;
      }
    }
    return acc;
  },
};
`,
    expect: 1,
    names: ["params.mode", '<switch "clamp"|"wrap">'],
  },
  {
    name: "a string-union parameter compared in a nested helper",
    source: `
export type Axis = "x" | "y" | "z";
export function build(axis: Axis, n: number): number {
  const pick = (i: number): number => (axis === "x" ? i : -i);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += pick(i);
  return acc;
}
`,
    expect: 1,
    names: ["axis", '"x"'],
  },
];

const CLEAN: readonly Fixture[] = [
  {
    name: "per-element DATA read out of a column",
    source: `
interface Col { getString(i: number): string; }
export function count(col: Col, n: number): number {
  let c = 0;
  for (let i = 0; i < n; i++) if (col.getString(i) === "polyline") c++;
  return c;
}
`,
    expect: 0,
  },
  {
    name: "the loop's own binding",
    source: `
interface Row { readonly kind: string; }
export function count(rows: readonly Row[]): number {
  let c = 0;
  for (const row of rows) if (row.kind === "polyline") c++;
  return c;
}
`,
    expect: 0,
  },
  {
    name: "a mutable state-machine local the loop writes to",
    source: `
export type Phase = "idle" | "run";
export function walk(n: number, flip: readonly boolean[]): number {
  let phase: Phase = "idle";
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (flip[i]!) phase = phase === "idle" ? "run" : "idle";
    if (phase === "run") c++;
  }
  return c;
}
`,
    expect: 0,
  },
  {
    name: "a module-scope const object merely NAMED spec",
    source: `
const spec = { wrapper: "forEach" } as const;
export function count(n: number): number {
  let c = 0;
  for (let i = 0; i < n; i++) if (spec.wrapper === "forEach") c++;
  return c;
}
`,
    expect: 0,
  },
  {
    name: "an internal module constant compared in a loop",
    source: `
const INTERNAL = "ready";
export function count(n: number): number {
  let c = 0;
  for (let i = 0; i < n; i++) if (INTERNAL === "ready") c++;
  return c;
}
`,
    expect: 0,
  },
  {
    name: "worley's actual fix: decided once, compared as a boolean",
    source: `
export interface Opts { readonly output?: "f1" | "cell"; }
export function run(opts: Opts, xs: Float32Array): number {
  const output = opts.output ?? "f1";
  const isCell = output === "cell";
  let acc = 0;
  for (let i = 0; i < xs.length; i++) acc += isCell ? xs[i]! * 2 : xs[i]!;
  return acc;
}
`,
    expect: 0,
  },
  {
    name: "a param compared in the function that decided it",
    source: `
export interface Opts { readonly output?: "f1" | "cell"; }
export function decide(opts: Opts): number {
  const output = opts.output ?? "f1";
  return output === "cell" ? 1 : 0;
}
`,
    expect: 0,
  },
];

describe("a param string is never compared where it is evaluated per element", () => {
  it("finds no site that is not on the frozen allowlist", () => {
    const allowed = new Set(ALLOWED.map((a) => keyOf(a.file, a.expr, a.literal)));
    const unlisted = FINDINGS.filter((f) => !allowed.has(keyOfFinding(f)));
    const report = unlisted
      .map(
        (f) =>
          `  ${f.file}:${f.line}  \`${f.expr}\` compared against ${f.literal}, ` +
          `${f.nesting} below where ${f.why} reached it`,
      )
      .join("\n");
    expect(
      unlisted.length === 0,
      unlisted.length === 0
        ? ""
        : `A param string is compared inside a per-element loop or closure:\n${report}\n\n` +
            "This is the shape that miscompiled under V8 — read the canonical note in " +
            "`src/noise/worley.ts`. Decide the answer ONCE, in the scope the param " +
            "arrived in, and compare the boolean inside the loop or the closure; if the " +
            "value crosses a seam, canonicalize it with `canonicalOneOf` " +
            "(src/diagnostics/canonical.ts). Re-reading the param into a local inside the " +
            "loop is NOT the fix and is caught here too. If the site is genuinely not per " +
            "element, add it to ALLOWED in `tests/paramStringComparisons.test.ts` with a " +
            "one-line reason:\n" +
            [...new Set(unlisted.map(keyOfFinding))]
              .map((k) => {
                const same = FINDINGS.filter((g) => keyOfFinding(g) === k);
                const first = same[0]!;
                return (
                  `  { file: ${JSON.stringify(first.file)}, expr: ${JSON.stringify(first.expr)}, ` +
                  `literal: ${JSON.stringify(first.literal)}, sites: ${same.length}, why: "…" },`
                );
              })
              .join("\n"),
    ).toBe(true);
  });

  it("has no stale allowlist entry", () => {
    const counted = new Map<string, number>();
    for (const f of FINDINGS) {
      const k = keyOfFinding(f);
      counted.set(k, (counted.get(k) ?? 0) + 1);
    }
    const stale = ALLOWED.flatMap((a) => {
      const k = keyOf(a.file, a.expr, a.literal);
      const actual = counted.get(k) ?? 0;
      if (actual === a.sites) return [];
      return [
        actual === 0
          ? `  ${a.file}: \`${a.expr}\` against ${a.literal} is no longer found — delete this entry`
          : `  ${a.file}: \`${a.expr}\` against ${a.literal} is listed as ${a.sites} site${a.sites > 1 ? "s" : ""} ` +
            `but the scan finds ${actual} (lines ${FINDINGS.filter((f) => keyOfFinding(f) === k)
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

  // The scanner's own halves, checked rather than asserted. A gate that can
  // only ever say "clean" is not a gate; these prove it says "dirty" for
  // each shape it is meant to catch, including the two the first version of
  // this file let through.
  describe("fires on", () => {
    for (const f of VIOLATIONS) {
      it(f.name, () => {
        const found = scanSources([{ fileName: "fixture.ts", text: f.source }]);
        const shown = found.map((g) => `${g.line}: \`${g.expr}\` vs ${g.literal}`).join("; ");
        expect(found.length, `expected ${f.expect}, got: ${shown || "(none)"}`).toBe(f.expect);
        for (const needle of f.names ?? []) {
          expect(found.map((g) => `${g.expr} ${g.literal}`).join(" | ")).toContain(needle);
        }
      });
    }
  });

  describe("stays silent on", () => {
    for (const f of CLEAN) {
      it(f.name, () => {
        const found = scanSources([{ fileName: "fixture.ts", text: f.source }]);
        const shown = found.map((g) => `${g.line}: \`${g.expr}\` vs ${g.literal}`).join("; ");
        expect(found.length, `expected no finding, got: ${shown}`).toBe(0);
      });
    }
  });
});
