import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DIAGNOSTIC_CODES, isDiagnosticCode } from "./codes.js";

const DIAGNOSTICS_DIR = fileURLToPath(new URL(".", import.meta.url));

describe("DIAGNOSTIC_CODES", () => {
  const codes = Object.keys(DIAGNOSTIC_CODES);

  it("gives every code a non-empty one-line description", () => {
    for (const code of codes) {
      const description = DIAGNOSTIC_CODES[code as keyof typeof DIAGNOSTIC_CODES];
      expect(typeof description, code).toBe("string");
      expect(description.trim().length, code).toBeGreaterThan(0);
      expect(description, code).not.toMatch(/\n/);
    }
  });

  it("spells every code in kebab-case", () => {
    for (const code of codes) expect(code).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(DIAGNOSTIC_CODES)).toBe(true);
    expect(() => {
      (DIAGNOSTIC_CODES as Record<string, string>)["made-up"] = "x";
    }).toThrow(TypeError);
  });

  it("carries the fallback and the cap record", () => {
    expect(codes).toContain("error");
    expect(codes).toContain("truncated");
  });

  it("recognises exactly its own keys as codes", () => {
    for (const code of codes) expect(isDiagnosticCode(code)).toBe(true);
    expect(isDiagnosticCode("made-up")).toBe(false);
    // Inherited names are not codes: the table is a map, not an object API.
    expect(isDiagnosticCode("toString")).toBe(false);
    expect(isDiagnosticCode(undefined)).toBe(false);
  });
});

describe("src/diagnostics is a leaf", () => {
  /** Relative specifiers in any import/export/dynamic-import/require position. */
  const SPECIFIER_RES = [
    /from\s*(["'`])([^"'`]+)\1/g,
    /import\s*(["'`])([^"'`]+)\1/g,
    /import\s*\(\s*(["'`])([^"'`]+)\1\s*\)/g,
    /require\s*\(\s*(["'`])([^"'`]+)\1\s*\)/g,
  ];

  it("imports nothing from the rest of the library, tests included", () => {
    const files = readdirSync(DIAGNOSTICS_DIR).filter((f) => f.endsWith(".ts"));
    expect(files).toContain("index.ts");
    const leaks: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(DIAGNOSTICS_DIR, file), "utf8");
      for (const re of SPECIFIER_RES) {
        for (const m of source.matchAll(re)) {
          const spec = m[2] as string;
          // Sibling modules and node/vitest built-ins are fine; anything
          // climbing out of the directory is the leak.
          if (spec.startsWith("../") || spec === ".." || spec.startsWith("pcg-ts")) {
            leaks.push(`${file}: ${spec}`);
          }
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("the detector flags a climbing import", () => {
    // Assembled at runtime, so this file's own source holds no such import.
    const climbing = ["..", "graph", "index.js"].join("/");
    const source = `import { Graph } from "${climbing}";`;
    const hit = [...source.matchAll(SPECIFIER_RES[0] as RegExp)].map((m) => m[2]);
    expect(hit).toEqual([climbing]);
  });
});
