/**
 * The arithmetic allowlist's scanner, for `arithmetic.test.ts`: a small
 * tokenizer that knows comments, strings, template literals and regex
 * literals, so a `Math.pow` hidden after a `"http://"` on the same line is
 * code and a `"Math.pow"` inside a string is not; a check that `Math` is
 * only ever used as `Math.<allowed member>` (no computed access, no alias,
 * no destructuring); and an import follower that walks VALUE imports
 * (through barrels, symbol by symbol) so the scanned set is whatever the
 * PNG path actually reaches rather than a list someone remembered.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export type TokenKind = "ident" | "number" | "string" | "template" | "regex" | "punct";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  /** For templates: the code inside every `${ }`, tokenized. */
  readonly inner?: readonly Token[];
}

const IDENT_START = /[A-Za-z_$À-￿]/;
const IDENT_PART = /[\w$À-￿]/;
/** Keywords after which a `/` starts a regex rather than dividing. */
const REGEX_AFTER_WORD = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await",
]);

/** Tokenize TypeScript source well enough to tell code from text. Comments are dropped. */
export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  const regexAllowed = (): boolean => {
    const prev = tokens[tokens.length - 1];
    if (prev === undefined) return true;
    if (prev.kind === "ident") return REGEX_AFTER_WORD.has(prev.value);
    if (prev.kind === "number" || prev.kind === "string" || prev.kind === "template" || prev.kind === "regex") {
      return false;
    }
    return !(prev.value === ")" || prev.value === "]" || prev.value === "}");
  };

  /** Read a template literal starting at the backtick at `i`; returns [token, next index]. */
  const readTemplate = (start: number): [Token, number] => {
    let j = start + 1;
    let text = "";
    const inner: Token[] = [];
    while (j < n && src[j] !== "`") {
      if (src[j] === "\\") {
        text += src.slice(j, j + 2);
        j += 2;
        continue;
      }
      if (src[j] === "$" && src[j + 1] === "{") {
        // Find the matching brace by tokenizing the expression itself, so
        // braces inside strings or nested templates do not end it early.
        let depth = 1;
        let k = j + 2;
        const exprStart = k;
        while (k < n && depth > 0) {
          const c = src[k];
          if (c === "'" || c === '"') {
            k = skipString(src, k);
            continue;
          }
          if (c === "`") {
            k = readTemplate(k)[1];
            continue;
          }
          if (c === "/" && src[k + 1] === "/") {
            while (k < n && src[k] !== "\n") k++;
            continue;
          }
          if (c === "/" && src[k + 1] === "*") {
            k = src.indexOf("*/", k + 2);
            k = k < 0 ? n : k + 2;
            continue;
          }
          if (c === "{") depth++;
          else if (c === "}") depth--;
          k++;
        }
        inner.push(...tokenize(src.slice(exprStart, k - 1)));
        j = k;
        continue;
      }
      text += src[j];
      j++;
    }
    return [{ kind: "template", value: text, inner }, j + 1];
  };

  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
    } else if (c === "'" || c === '"') {
      const end = skipString(src, i);
      tokens.push({ kind: "string", value: src.slice(i + 1, end - 1) });
      i = end;
    } else if (c === "`") {
      const [token, end] = readTemplate(i);
      tokens.push(token);
      i = end;
    } else if (c === "/" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      tokens.push({ kind: "regex", value: src.slice(i, j) });
      i = j;
    } else if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < n && IDENT_PART.test(src[j])) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j) });
      i = j;
    } else if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
    } else if (c === "?" && src[i + 1] === ".") {
      tokens.push({ kind: "punct", value: "?." });
      i += 2;
    } else {
      tokens.push({ kind: "punct", value: c });
      i++;
    }
  }
  return tokens;
}

function skipString(src: string, start: number): number {
  const quote = src[start];
  let j = start + 1;
  while (j < src.length && src[j] !== quote) {
    if (src[j] === "\\") j++;
    else if (src[j] === "\n") break;
    j++;
  }
  return j + 1;
}

/** `Math` members whose results IEEE 754 pins down: correctly rounded `sqrt` and exact operations. */
export const ALLOWED_MATH: ReadonlySet<string> = new Set([
  "sqrt", "floor", "ceil", "round", "trunc", "abs", "min", "max", "fround", "imul",
]);

/**
 * Names that reach `Math` (or run code) without spelling `Math.<member>`:
 * the global object under each of its names, reflection, and the two ways
 * to evaluate a string.
 */
const ESCAPE_HATCHES: ReadonlySet<string> = new Set([
  "globalThis", "global", "window", "self", "Reflect", "eval", "Function",
]);

/**
 * Every use of `Math` in code that is not `Math.<allowed>`, every escape
 * hatch to it, and every `**` that is not the literal `2 ** <integer>`,
 * described.
 *
 * `**` gets one exception because a power of two with an integer exponent
 * is exactly representable and every engine computes it exactly; anything
 * else — a variable base, a fractional exponent, `**=` — is `Math.pow` under
 * another spelling.
 */
export function mathViolations(src: string): string[] {
  const out: string[] = [];
  const walk = (tokens: readonly Token[]): void => {
    tokens.forEach((t, k) => {
      if (t.kind === "template" && t.inner !== undefined) walk(t.inner);
      if (t.kind === "punct" && t.value === "*" && tokens[k + 1]?.kind === "punct" && tokens[k + 1]?.value === "*") {
        const left = tokens[k - 1];
        let r = k + 2;
        if (tokens[r]?.kind === "punct" && tokens[r]?.value === "-") r++;
        const right = tokens[r];
        const after = tokens[r + 1];
        const literalPowerOfTwo =
          left?.kind === "number" &&
          left.value === "2" &&
          right?.kind === "number" &&
          /^\d+$/.test(right.value) &&
          !(after?.kind === "punct" && after.value === "*" && tokens[r + 2]?.value === "*");
        const compound = tokens[k + 2]?.kind === "punct" && tokens[k + 2]?.value === "=";
        if (compound || !literalPowerOfTwo) {
          out.push(`** (exponentiation other than the literal 2 ** <integer>)`);
        }
        return;
      }
      if (t.kind !== "ident") return;
      const prior = tokens[k - 1];
      const isProperty = prior !== undefined && prior.kind === "punct" && (prior.value === "." || prior.value === "?.");
      if (ESCAPE_HATCHES.has(t.value) && !isProperty) {
        out.push(`${t.value} (can reach Math or run code without naming Math.<member>)`);
        return;
      }
      if (t.value !== "Math") return;
      const before = tokens[k - 1];
      // `x.Math` is some other object's property, not the global.
      if (before !== undefined && before.kind === "punct" && (before.value === "." || before.value === "?.")) {
        if (!(tokens[k - 2]?.kind === "ident" && tokens[k - 2]?.value === "globalThis")) return;
      }
      const dot = tokens[k + 1];
      const member = tokens[k + 2];
      if (dot?.kind === "punct" && dot.value === "." && member?.kind === "ident") {
        if (!ALLOWED_MATH.has(member.value)) out.push(`Math.${member.value}`);
        return;
      }
      if (dot?.kind === "punct" && dot.value === "[") out.push("Math[...] (computed member access)");
      else out.push(`Math used as a value${dot !== undefined ? ` before "${dot.value}"` : ""} (alias or destructuring)`);
    });
  };
  walk(tokenize(src));
  return out;
}

// ---------------------------------------------------------------------------
// Import following
// ---------------------------------------------------------------------------

interface ImportDecl {
  readonly specifier: string;
  /** Imported names (original export names); `*` for namespace or side-effect. */
  readonly names: readonly string[];
}

/** Value imports and value re-exports of a module (type-only ones are erased and skipped). */
function valueImports(tokens: readonly Token[]): ImportDecl[] {
  const out: ImportDecl[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.kind !== "ident" || (t.value !== "import" && t.value !== "export")) continue;
    const prev = tokens[k - 1];
    if (prev !== undefined && prev.kind === "punct" && (prev.value === "." || prev.value === "?.")) continue;
    let j = k + 1;
    const head = tokens[j];
    if (head === undefined) continue;
    if (head.kind === "punct" && head.value === "(") {
      throw new Error("dynamic import() on the PNG path: the scan cannot follow it");
    }
    if (t.value === "import" && head.kind === "string") {
      out.push({ specifier: head.value, names: ["*"] });
      continue;
    }
    if (head.kind === "ident" && head.value === "type") continue; // `import type` / `export type`: erased
    // A re-export must open with `{` or `*`; anything else after `export`
    // (`export function`, `export const`, ...) is a declaration.
    if (t.value === "export" && !(head.kind === "punct" && (head.value === "{" || head.value === "*"))) continue;
    const names: string[] = [];
    let specifier: string | undefined;
    let inBraces = false;
    for (; j < tokens.length; j++) {
      const u = tokens[j];
      if (u.kind === "punct" && u.value === ";") break;
      if (u.kind === "punct" && u.value === "{") {
        inBraces = true;
        continue;
      }
      if (u.kind === "punct" && u.value === "}") {
        inBraces = false;
        continue;
      }
      if (!inBraces && u.kind === "ident" && u.value === "from" && tokens[j + 1]?.kind === "string") {
        specifier = tokens[j + 1].value;
        break;
      }
      if (u.kind === "punct" && u.value === "*") {
        names.push("*");
        if (tokens[j + 1]?.value === "as") j += 2;
        continue;
      }
      if (u.kind !== "ident") continue;
      if (inBraces) {
        if (u.value === "type") {
          // `type X` or `type X as Y`: erased.
          j++;
          if (tokens[j + 1]?.value === "as") j += 2;
          continue;
        }
        names.push(u.value);
        if (tokens[j + 1]?.value === "as") j += 2;
        continue;
      }
      if (t.value === "import") names.push("default");
    }
    if (specifier === undefined || names.length === 0) continue;
    out.push({ specifier, names });
  }
  return out;
}

function resolveSpecifier(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined; // node: builtins and packages are not ours to scan
  const base = resolve(dirname(from), specifier);
  for (const candidate of [base.replace(/\.js$/, ".ts"), `${base}.ts`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`cannot resolve "${specifier}" from ${from}`);
}

/** Does module `file` define `name` itself (not by re-export)? */
function definesLocally(tokens: readonly Token[], name: string): boolean {
  for (let k = 0; k + 2 < tokens.length; k++) {
    if (tokens[k].value !== "export") continue;
    let j = k + 1;
    if (tokens[j].value === "declare" || tokens[j].value === "abstract") j++;
    if (tokens[j].value === "async") j++;
    if (["function", "const", "let", "var", "class", "enum"].includes(tokens[j].value)) {
      if (tokens[j + 1].value === "*" ? tokens[j + 2].value === name : tokens[j + 1].value === name) return true;
    }
  }
  // `const x = ...; export { x };`
  for (let k = 0; k + 1 < tokens.length; k++) {
    if (tokens[k].value !== "export" || tokens[k + 1].value !== "{") continue;
    let j = k + 2;
    const local: string[] = [];
    for (; j < tokens.length && tokens[j].value !== "}"; j++) {
      if (tokens[j].kind === "ident" && tokens[j].value !== "as" && tokens[j].value !== "type") local.push(tokens[j].value);
    }
    if (tokens[j + 1]?.value !== "from" && local.includes(name)) return true;
  }
  return false;
}

/** The module that defines `name`, following `export { } from` and `export * from` chains. */
function definingModule(file: string, name: string, seen = new Set<string>()): string | undefined {
  if (seen.has(`${file}#${name}`)) return undefined;
  seen.add(`${file}#${name}`);
  const tokens = tokenize(readFileSync(file, "utf8"));
  if (definesLocally(tokens, name)) return file;
  for (let k = 0; k < tokens.length; k++) {
    if (tokens[k].value !== "export") continue;
    if (tokens[k + 1]?.value === "*" && tokens[k + 2]?.value === "from" && tokens[k + 3]?.kind === "string") {
      const target = resolveSpecifier(file, tokens[k + 3].value);
      if (target === undefined) continue;
      const found = definingModule(target, name, seen);
      if (found !== undefined) return found;
    }
    if (tokens[k + 1]?.value === "{") {
      let j = k + 2;
      let original: string | undefined;
      for (; j < tokens.length && tokens[j].value !== "}"; j++) {
        const u = tokens[j];
        if (u.kind !== "ident" || u.value === "type") continue;
        const exported = tokens[j + 1]?.value === "as" ? tokens[j + 2].value : u.value;
        if (exported === name) original = u.value;
        if (tokens[j + 1]?.value === "as") j += 2;
      }
      if (original !== undefined && tokens[j + 1]?.value === "from" && tokens[j + 2]?.kind === "string") {
        const target = resolveSpecifier(file, tokens[j + 2].value);
        if (target !== undefined) return definingModule(target, original, seen);
      }
    }
  }
  return undefined;
}

/**
 * Every module the entries reach through value imports. A named import is
 * resolved to the module that DEFINES the name, so importing one helper
 * through the library's barrel scans that helper's module, not the whole
 * library; the defining module is then scanned whole and its own value
 * imports followed the same way.
 */
export function followValueImports(entries: readonly string[], root: string): string[] {
  const reached = new Set<string>();
  const queue = entries.map((e) => resolve(root, e));
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (reached.has(file)) continue;
    reached.add(file);
    const tokens = tokenize(readFileSync(file, "utf8"));
    for (const decl of valueImports(tokens)) {
      const target = resolveSpecifier(file, decl.specifier);
      if (target === undefined) continue;
      const isBarrel = /index\.ts$/.test(target);
      if (!isBarrel || decl.names.includes("*") || decl.names.includes("default")) {
        queue.push(target);
        continue;
      }
      for (const name of decl.names) {
        const defining = definingModule(target, name);
        if (defining === undefined) throw new Error(`cannot find where "${name}" imported by ${file} is defined`);
        queue.push(defining);
      }
    }
  }
  return [...reached].map((f) => relative(root, f).replace(/\\/g, "/")).sort();
}
