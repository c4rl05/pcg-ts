import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The two halves of the write-route guard that a TEST can hold.
 *
 * The first half is not here at all: what `Attribute.data` refuses is
 * checked by the COMPILER, in `attributeWriteRoute.negative.ts`, whose
 * `@ts-expect-error` directives fail `npm run check` the moment one of
 * them stops being an error. This file only makes sure that file still
 * has its cases — a negative test is silently defeated by deletion, and
 * by nothing else.
 *
 * WHAT WAS HERE BEFORE, AND WHY IT WENT. Two regular expressions banning
 * `.data as <TypedArray>` and `.data instanceof <TypedArray>` across
 * `src/` and `tests/`. They reported no offenders — and matched ZERO
 * lines, because every real narrowing in the tree spells it through a
 * local (`const d = attr.data;` then `d instanceof Float32Array`), which
 * nothing anchored on `.data` can see. The scan had a control proving it
 * could match its own two shapes, and the control passed, and the scan
 * was still blind: what it could not see was the OTHER spelling of the
 * same thing. It also cost `src/fields/capture.ts` a reshape whose only
 * purpose was to move an `instanceof` off a member called `data`.
 *
 * The second half is the thing a compiler cannot see and a scan can: two
 * live references to ONE column in one scope, one taken through `data`
 * and one through `writable()`. Both compile, and which one wins depends
 * on whether an upstream node happened to write that column.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

function sources(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.ts$/.test(entry)) files.push(path);
    }
  };
  walk(join(REPO, "src"));
  walk(join(REPO, "tests"));
  return files.map((f) => relative(REPO, f).replace(/\\/g, "/"));
}

// ---------------------------------------------------------------------------
// The read-then-write hazard.
// ---------------------------------------------------------------------------

/**
 * A reference taken from `data` before a fork points at the PRE-FORK
 * buffer; one taken after points at the new one. So this, in a single
 * scope,
 *
 *     const before = attr.data;
 *     const p = attr.writable();
 *     p[0] = 9;              // does `before[0]` read 9?
 *
 * answers differently depending on whether the column was still sharing
 * storage when `writable()` ran — which is decided by whether some
 * upstream node happened to write that column on this cook. Same code,
 * two behaviours, and the deciding fact is invisible from here.
 *
 * TWO THINGS NARROW THE RULE, and both are about the mechanism rather
 * than about tidiness:
 *
 * - ORDER. `writable()` first and `data` after is safe unconditionally:
 *   the fork has already happened, `_shared` is false, and `data` returns
 *   the array `writable()` just handed back. It is a fair way to say "I
 *   am only reading this now", and `src/nodes/paths.ts` uses it. Only
 *   read-then-write is the foot-gun.
 * - A HELD REFERENCE. The hazard needs a name that outlives the write.
 *   `expect(attr.data.buffer).toBe(…)` reads and is done; it cannot
 *   observe a later fork. So only a BINDING of the view counts — of
 *   `X.data`, or of `X.data.subarray(…)`, which is a view of the same
 *   buffer and goes stale with it.
 *
 * The receiver is the whole expression in front of the member, so
 * `set.require("P").data` and `set.require("P").writable()` are one
 * receiver while `out…require("P")` and `src…require("P")` are two. That
 * is deliberate: the hazard is about one COLUMN, and the same expression
 * text is the only evidence a scan has that two references name one.
 */
const RECEIVER = String.raw`[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*|\([^()]*\)|!)*`;
/** A binding whose initialiser IS the view, or a subarray of it. */
const HELD_READ = new RegExp(
  String.raw`\b(?:const|let|var)\s+[\w$]+\s*(?::[^=]+)?=\s*(${RECEIVER})\.data\b(?:\.subarray\([^)]*\))?\s*;?\s*$`,
);
const WRITE = new RegExp(String.raw`(${RECEIVER})\.writable\(\)`, "g");

interface Hazard {
  readonly file: string;
  readonly receiver: string;
  readonly dataAt: number;
  readonly writableAt: number;
}

/**
 * Scopes are approximated by BRACE DEPTH: a held read at depth d is
 * compared only against writes at that same depth, and the record is
 * dropped when the depth closes. It is an approximation in the
 * over-reporting direction — two sibling blocks at one depth in one file
 * are treated as one scope — which is the right way for it to be wrong,
 * because an over-report is a thing a person reads and answers.
 */
function scanHazards(source: string, file = "<input>"): Hazard[] {
  const lines = source.split(/\r?\n/);
  const found: Hazard[] = [];
  // depth -> receiver -> line the view was bound at that depth.
  const held = new Map<number, Map<string, number>>();
  let depth = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (!/^\s*\*/.test(raw)) {
      for (const m of line.matchAll(WRITE)) {
        const at = held.get(depth)?.get(m[1]!);
        if (at !== undefined && !found.some((h) => h.file === file && h.receiver === m[1]!)) {
          found.push({ file, receiver: m[1]!, dataAt: at, writableAt: i + 1 });
        }
      }
      const read = HELD_READ.exec(line);
      if (read) {
        const atDepth = held.get(depth) ?? new Map<string, number>();
        held.set(depth, atDepth);
        if (!atDepth.has(read[1]!)) atDepth.set(read[1]!, i + 1);
      }
    }
    for (const ch of line) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        held.delete(depth);
        depth = Math.max(0, depth - 1);
      }
    }
  });
  return found;
}

/** A scope that holds the read across the write — what the scan is for. */
const HAZARD_FIXTURE = `
function move(attr: Attribute): void {
  const before = attr.data;
  const p = attr.writable();
  for (let i = 0; i < p.length; i++) p[i] = before[i] * 2;
}
`;

/** A held SUBARRAY of the view goes stale with it. Also a hazard. */
const SUBARRAY_FIXTURE = `
function move(attr: Attribute, n: number): void {
  const before = attr.data.subarray(0, n);
  attr.writable()[0] = before[0];
}
`;

/** Write first, read after: the fork has happened. Not a hazard. */
const SAFE_ORDER_FIXTURE = `
function move(attr: Attribute): void {
  const p = attr.writable();
  const view = attr.data;
  p[0] = view[1];
}
`;

/** Read and done, never bound. Cannot observe a later fork. */
const UNHELD_FIXTURE = `
function check(attr: Attribute, other: Attribute): void {
  expect(attr.data.buffer).toBe(other.data.buffer);
  attr.writable()[0] = 1;
}
`;

/** The same two calls, on two different columns. Not a hazard. */
const INNOCENT_FIXTURE = `
function copy(src: Attribute, dst: Attribute): void {
  const from = src.data;
  const to = dst.writable();
  to.set(from);
}
`;

/** One scope reads, a LATER scope writes. Not a hazard either. */
const SEQUENTIAL_FIXTURE = `
function read(attr: Attribute): number {
  const d = attr.data;
  return d[0];
}
function write(attr: Attribute): void {
  attr.writable()[0] = 1;
}
`;

describe("one scope, one reference to a column", () => {
  it("is what the tree does", () => {
    const offenders: string[] = [];
    for (const rel of sources()) {
      if (rel === "tests/attributeWriteRoute.test.ts") continue;
      for (const h of scanHazards(readFileSync(join(REPO, rel), "utf8"), rel)) {
        offenders.push(
          `${h.file}: "${h.receiver}" is read through .data (line ${h.dataAt}) and written ` +
            `through .writable() (line ${h.writableAt}) in one scope — take writable() first ` +
            `and read through it, or the read is the pre-fork copy whenever the column was shared`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("would find one, and does not cry wolf", () => {
    // "Found none" from a scan that matches nothing is exactly the way the
    // regex ban that used to live in this file failed. So the hazard is
    // found, by receiver and by both line numbers, and each of the four
    // shapes that are NOT hazards is shown being left alone — one per
    // clause of the rule, so a clause cannot quietly stop applying.
    const hit = scanHazards(HAZARD_FIXTURE, "fixture.ts");
    expect(hit).toHaveLength(1);
    expect(hit[0]!.receiver).toBe("attr");
    expect(hit[0]!.dataAt).toBe(3);
    expect(hit[0]!.writableAt).toBe(4);
    expect(scanHazards(SUBARRAY_FIXTURE, "fixture.ts")).toHaveLength(1);
    expect(scanHazards(SAFE_ORDER_FIXTURE, "fixture.ts")).toEqual([]);
    expect(scanHazards(UNHELD_FIXTURE, "fixture.ts")).toEqual([]);
    expect(scanHazards(INNOCENT_FIXTURE, "fixture.ts")).toEqual([]);
    expect(scanHazards(SEQUENTIAL_FIXTURE, "fixture.ts")).toEqual([]);
  });

  it("sees a receiver that is a call chain, not just a local", () => {
    // The realistic spelling, and the one a receiver keyed on identifiers
    // alone would miss: no local for the column at all, named twice.
    const chained = `
function f(set: AttributeSet): void {
  const d = set.require("P").data;
  set.require("P").writable()[0] = d[0];
}
`;
    const hit = scanHazards(chained, "fixture.ts");
    expect(hit).toHaveLength(1);
    expect(hit[0]!.receiver).toBe('set.require("P")');
  });

  it("scans the files it claims to scan", () => {
    const files = sources();
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain("src/data/attribute.ts");
    expect(files).toContain("src/nodes/pointOps.ts");
    expect(files.some((f) => f.startsWith("tests/"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The negative type test is still there.
// ---------------------------------------------------------------------------

describe("the compile-level guard", () => {
  const NEGATIVE = "tests/attributeWriteRoute.negative.ts";
  const text = (): string => readFileSync(join(REPO, NEGATIVE), "utf8");

  it("still carries a directive for every refusal it names", () => {
    // The only way a negative type test fails silently is by being
    // emptied: `tsc` says nothing about cases that are not there. Each
    // name below is an operation the read view must refuse, and the count
    // is a floor, not an equality, so adding cases is free.
    const source = text();
    const directives = source.match(/@ts-expect-error/g) ?? [];
    expect(directives.length).toBeGreaterThanOrEqual(17);
    for (const fn of [
      "indexedStore",
      "bulkWrites",
      "throughSubarray",
      "throughSlice",
      "assignmentToMutable",
      "passingToMutableParameter",
      "reachingTheBuffer",
      "writableIsTheWayThrough",
      "knownHoles",
      "publishedChecks",
    ]) {
      expect(source, `${NEGATIVE} lost ${fn}`).toContain(`export function ${fn}(`);
    }
    for (const op of ["set(", "fill(", "copyWithin(", "sort(", "reverse(", "subarray(", "buffer"]) {
      expect(source, `${NEGATIVE} stopped covering ${op}`).toContain(op);
    }
  });

  it("is reached by the type checker, and by both routes", () => {
    // It has to be INSIDE the program `npm run check` builds, or the
    // directives are never evaluated and the whole guard is inert. It is
    // under `tests/`, which tsconfig includes, and it pins the source
    // types and the published ones separately — the second is the one
    // that would catch a d.ts bundler widening `data` back.
    const config = JSON.parse(
      readFileSync(join(REPO, "tsconfig.json"), "utf8").replace(/\/\/.*$/gm, ""),
    ) as { include?: string[] };
    expect(config.include ?? []).toEqual(expect.arrayContaining(["tests"]));
    const source = text();
    expect(source).toContain('from "../src/data/index.js"');
    expect(source).toContain('import("pcg-ts").Attribute');
  });
});
