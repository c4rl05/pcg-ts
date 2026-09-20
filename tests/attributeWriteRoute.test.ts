import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `Attribute.data` is a READ VIEW, and `Attribute.writable()` is the one
 * route to a writable array — which is also where a column that still
 * shares a buffer with the column it was derived from takes a copy of its
 * own. Two spellings walk straight through that guard, and neither is a
 * type error:
 *
 * - `attr.data as Float32Array` (or any other typed array). TypeScript
 *   allows the assertion because the read view and the array overlap, and
 *   what comes back writes into whatever buffer the column is sharing. It
 *   is the shape the whole library used before the read view existed, so
 *   it is also the shape a half-remembered edit reaches for.
 * - `attr.data instanceof Uint8Array`, as a way to ask what a column IS.
 *   `instanceof` narrows the read view to an intersection that re-admits
 *   the numeric index signature, so a write in that branch compiles
 *   silently — exactly one such write existed in `src/gpu/run.ts` and the
 *   compiler said nothing about it. The type tag answers the question
 *   without the narrowing: `attr.type === "bool"`.
 *
 * So both are banned by text across `src/` and `tests/`. The ban is on the
 * MEMBER, not on the operation: `column.data as Float32Array` on anything
 * that is not an attribute would read the same way to this scan, which is
 * why `src/fields/capture.ts` asks its question through a named parameter
 * instead. A cast to `ReadonlyAttrData<…>` is not a way out of the view
 * and is deliberately allowed.
 *
 * WHAT THIS TEST IS NOT. It is not the guard against
 * `const p = attr.data; p[i] = x` — the plain local, with no cast and no
 * `instanceof`. The TYPE SYSTEM catches that one, and catching it here
 * would mean re-implementing dataflow in a regular expression. The two
 * shapes above are exactly the ones the type system does NOT catch, which
 * is why they are the two the text is asked about.
 *
 * That division of labour has a seam, and it is worth naming because a
 * write slipped through it once during this very migration: the tests
 * under `tests/` that import the library BY PACKAGE NAME are type-checked
 * against `dist/*.d.ts`, not against `src/`, so while `dist/` is stale
 * they are checked against the OLD `Attribute` and a plain-local write
 * compiles. `npm run check` is the run that closes it, and only after
 * `npm run build` — which is why CLAUDE.md says `check` needs a current
 * `dist/` first. A green `tsc` over a stale `dist/` is not evidence about
 * those files.
 */
const BANNED: Array<[string, RegExp]> = [
  ["a cast back to a writable typed array", /\.data\s+as\s+(Float32|Int32|Uint32|Uint8)Array\b/],
  [
    "an instanceof test on a column's storage",
    /\.data\s+instanceof\s+(Float32|Int32|Uint32|Uint8)Array\b/,
  ],
];

const SELF = "tests/attributeWriteRoute.test.ts";

function sources(): string[] {
  const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.ts$/.test(entry)) files.push(path);
    }
  };
  walk(join(repo, "src"));
  walk(join(repo, "tests"));
  return files.map((f) => relative(repo, f).replace(/\\/g, "/"));
}

describe("the write route to an attribute column", () => {
  it("is never taken by casting or by instanceof", () => {
    const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files = sources();
    expect(files.length).toBeGreaterThan(200);
    const offenders: string[] = [];
    for (const rel of files) {
      if (rel === SELF) continue;
      const lines = readFileSync(join(repo, rel), "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const [what, pattern] of BANNED) {
          if (pattern.test(line)) offenders.push(`${rel}:${i + 1}: ${what} — ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("has a scan that can see both spellings", () => {
    // "Found none" means nothing from a pattern that matches nothing. Each
    // ban is shown finding its own shape, and leaving alone the two
    // neighbours it must not claim: a narrowing cast to the read view, and
    // an `instanceof` on something that is not a column's storage.
    const [cast, narrow] = BANNED;
    expect(cast[1].test('const p = attr.data as Float32Array;')).toBe(true);
    expect(cast[1].test("const p = set.require('P').data as Uint32Array;")).toBe(true);
    expect(cast[1].test("const p = attr.data as ReadonlyAttrData<Float32Array>;")).toBe(false);
    expect(narrow[1].test("if (attr.data instanceof Uint8Array) {")).toBe(true);
    expect(narrow[1].test("if (storage instanceof Uint8Array) {")).toBe(false);
  });

  it("scans the files it claims to scan", () => {
    // The walk has to reach both trees, or "no offenders" is a statement
    // about an empty list.
    const files = sources();
    expect(files.some((f) => f === "src/data/attribute.ts")).toBe(true);
    expect(files.some((f) => f === "src/nodes/pointOps.ts")).toBe(true);
    expect(files.some((f) => f.startsWith("tests/"))).toBe(true);
  });
});
