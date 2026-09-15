/**
 * The arithmetic allowlist that makes a PNG frame's bytes the same on every
 * platform: only `+ − × ÷`, `Math.sqrt` (correctly rounded by IEEE 754) and
 * the exact operations `floor ceil round trunc abs min max fround imul` may
 * run on the path from a collection to PNG bytes. `sin`, `cos`, `tan`,
 * `pow`, `exp`, `log*`, `atan*`, `hypot`, `cbrt` are whatever the platform's
 * libm does, and one differing bit in a pose moves every pixel.
 *
 * The scan is tokenizer-grade (comments, strings, template literals and
 * regex literals are told apart from code), refuses `Math` used any way but
 * `Math.<allowed>` — computed access, aliasing and destructuring included —
 * and scans every module the PNG path reaches through value imports, found
 * by following them rather than by a list.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { followValueImports, mathViolations, tokenize } from "./arithmeticScan.testsupport.js";

const ROOT = new URL("../../../", import.meta.url);
const rootPath = decodeURIComponent(ROOT.pathname).replace(/^\/([A-Za-z]:)/, "$1");

describe("the scanner catches every evasion it is meant to", () => {
  const cases: readonly (readonly [string, string, RegExp])[] = [
    ["a plain banned member", "const a = Math.pow(2, 3);", /Math\.pow/],
    ["after a URL string on the same line", 'const u = "http://example.com"; const a = Math.pow(2, 3);', /Math\.pow/],
    ["after a single-quoted URL", "const u = 'https://x//y'; Math.sin(1);", /Math\.sin/],
    ["with whitespace and a comment around the dot", "Math /* hi */ . cos(1)", /Math\.cos/],
    ["on the next line", "const a = Math\n  .tan(1);", /Math\.tan/],
    ["destructured", "const { pow } = Math;", /Math used as a value/],
    ["aliased", "const M = Math; M.pow(2, 2);", /Math used as a value/],
    ["passed along", "use(Math);", /Math used as a value/],
    ["computed member access", 'Math["pow"](2, 3);', /computed member access/],
    ["computed with a variable", "const k = 'po' + 'w'; Math[k](2, 3);", /computed member access/],
    ["optional chaining", "Math?.pow(2, 3);", /Math used as a value/],
    ["through globalThis", "globalThis.Math.pow(2, 3);", /globalThis/],
    ["inside a template expression", "const s = `x ${Math.exp(1)} y`;", /Math\.exp/],
    ["inside a nested template expression", "const s = `a ${`b ${Math.log(2)}`}`;", /Math\.log/],
    ["after a division that looks like a regex start", "const r = a / b / Math.atan2(1, 2);", /Math\.atan2/],
    ["after a regex literal containing a quote", "const re = /\"/; Math.hypot(1, 2);", /Math\.hypot/],
    ["after a string with an escaped quote", 'const s = "a\\"b"; Math.cbrt(8);', /Math\.cbrt/],
  ];
  it.each(cases)("%s", (_name, snippet, expected) => {
    const found = mathViolations(snippet);
    expect(found.length, snippet).toBeGreaterThan(0);
    expect(found.join(" | ")).toMatch(expected);
  });

  const clean: readonly (readonly [string, string])[] = [
    ["allowed members", "Math.sqrt(2) + Math.floor(1.5) + Math.imul(3, 4) + Math.fround(0.1) + Math.max(1, 2);"],
    ["a banned name inside a string", 'const help = "never Math.pow here";'],
    ["a banned name inside a template's text", "const help = `Math.pow is banned`;"],
    ["a banned name inside a line comment", "// Math.pow(10, -4) !== 1e-4\nconst a = 1;"],
    ["a banned name inside a block comment", "/* Math.sin */ const a = 1;"],
    ["a banned name inside a regex literal", "const re = /Math\\.pow/g;"],
    ["another object's Math property", "const a = lib.Math;"],
  ];
  it.each(clean)("passes %s", (_name, snippet) => {
    expect(mathViolations(snippet)).toEqual([]);
  });
});

/** The PNG path's entry: everything a render runs is reachable from here. */
const ENTRY = "src/cli/renderPng.ts";

describe("the modules on the PNG path", () => {
  const files = followValueImports([ENTRY], rootPath);

  it("are found by following value imports, through the library barrel symbol by symbol", () => {
    for (const expected of [
      "src/cli/renderPng.ts",
      "src/cli/raster/views.ts",
      "src/cli/raster/raster.ts",
      "src/cli/raster/scene.ts",
      "src/cli/raster/font.ts",
      "src/cli/raster/deflate.ts",
      "src/cli/raster/png.ts",
      "src/cli/render.ts",
      "src/cli/summary.ts",
      "src/random/hash.ts",
    ]) {
      expect(files).toContain(expected);
    }
    // A named import through `src/index.ts` resolves to the defining module;
    // the barrel itself would pull in the whole library (noise included).
    expect(files).not.toContain("src/index.ts");
    expect(files.some((f) => f.startsWith("src/noise/"))).toBe(false);
  });

  it.each(files)("%s uses Math only through the allowlist", (file) => {
    expect(mathViolations(readFileSync(`${rootPath}${file}`, "utf8"))).toEqual([]);
  });

  it.each(files)("%s tokenizes without swallowing code", (file) => {
    // Every top-level `export function NAME` a plain regex finds must come
    // out of the tokenizer as an identifier: a mis-read string, template or
    // regex would eat the declarations after it.
    const source = readFileSync(`${rootPath}${file}`, "utf8");
    const declared = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]);
    const idents = new Set(tokenize(source).filter((t) => t.kind === "ident").map((t) => t.value));
    for (const name of declared) expect(idents.has(name), `${file}: ${name}`).toBe(true);
  });
});
