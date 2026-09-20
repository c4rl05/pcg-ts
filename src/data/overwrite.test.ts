import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as root from "../index.js";
import { AttributeSet } from "./attribute.js";
import { addForOverwrite, resizeForOverwrite } from "./overwrite.js";

describe("resizeForOverwrite", () => {
  it("allocates exactly the count, where resize rounds up by doubling", () => {
    const exact = new AttributeSet();
    const e = exact.add("P", "f32", 3);
    resizeForOverwrite(exact, 5);
    expect(exact.count).toBe(5);
    expect(exact.capacity).toBe(5);
    expect(e.capacity).toBe(5);
    expect(e.data.length).toBe(15);
    // CONTROL: the ordinary path, same count.
    const doubled = new AttributeSet();
    doubled.add("P", "f32", 3);
    doubled.resize(5);
    expect(doubled.capacity).toBe(8);
  });

  it("does not default-initialize: a non-zero default left unwritten reads as zero", () => {
    // What the contract says a caller must never leave behind — shown here
    // so the "default honoured" tests below demonstrably have teeth.
    const set = new AttributeSet();
    const scale = set.add("scale", "f32", 3, [1, 1, 1]);
    resizeForOverwrite(set, 4);
    expect(Array.from(scale.data)).toEqual(new Array<number>(12).fill(0));
    // CONTROL: resize over the same count gives the default.
    const ref = new AttributeSet();
    const refScale = ref.add("scale", "f32", 3, [1, 1, 1]);
    ref.resize(4);
    expect(Array.from(refScale.data.subarray(0, 12))).toEqual(new Array<number>(12).fill(1));
  });

  it("honours a non-zero default on a partially written range when the caller fills the rest", () => {
    // The merge shape: blocks written by copy, a block an input lacked
    // filled with the column's default, all into a set sized with no fill.
    const set = new AttributeSet();
    const color = set.add("color", "f32", 4, [1, 0.5, 0.25, 1]);
    const scale = set.add("scale", "f32", 3, [1, 1, 1]);
    const tag = set.add("tag", "string", 1, "none");
    resizeForOverwrite(set, 6);
    color.fill([0, 0, 1, 1], 0, 2);
    color.fillDefault(2, 5);
    color.fill([0, 1, 0, 1], 5, 6);
    scale.fillDefault(0, 3);
    scale.fill(2, 3, 6);
    tag.setString(0, "a");
    tag.fillDefault(1, 6);
    expect(Array.from(color.data.subarray(0, 24))).toEqual([
      0, 0, 1, 1, 0, 0, 1, 1, 1, 0.5, 0.25, 1, 1, 0.5, 0.25, 1, 1, 0.5, 0.25, 1, 0, 1, 0, 1,
    ]);
    expect(Array.from(scale.data.subarray(0, 18))).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    ]);
    expect([0, 1, 5].map((i) => tag.getString(i))).toEqual(["a", "none", "none"]);
    // The default string kept table slot 0, as `add` gives it.
    expect(tag.stringTable).toEqual(["none", "a"]);
  });

  it("takes the count as capacity outright on a set with no columns, shrinking it", () => {
    const set = new AttributeSet();
    set.resize(3);
    expect(set.capacity).toBe(8);
    resizeForOverwrite(set, 3);
    expect(set.capacity).toBe(3);
    // A column added afterwards is allocated at that capacity and, through
    // `add`, still initialized to its default.
    const a = set.add("a", "f32", 2, 4);
    expect(a.data.length).toBe(6);
    expect(Array.from(a.data)).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it("keeps existing elements and never shrinks a set that holds columns", () => {
    const set = new AttributeSet();
    const a = set.add("a", "i32", 1, 9);
    set.resize(5); // capacity 8
    a.writable().set([1, 2, 3, 4, 5]);
    resizeForOverwrite(set, 3);
    expect(set.capacity).toBe(8);
    expect(set.count).toBe(3);
    resizeForOverwrite(set, 10);
    expect(set.capacity).toBe(10);
    expect(Array.from(a.data.subarray(0, 3))).toEqual([1, 2, 3]);
  });

  it("grows by doubling from an exact capacity once appended to", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 1, 3);
    resizeForOverwrite(set, 9);
    a.writable().set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    set.resize(10);
    expect(set.capacity).toBe(18);
    expect(Array.from(a.data.subarray(0, 10))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 3]);
  });

  it("rejects a count that is not a non-negative integer", () => {
    const set = new AttributeSet();
    expect(() => resizeForOverwrite(set, -1)).toThrow(/non-negative integer/);
    expect(() => resizeForOverwrite(set, 1.5)).toThrow(/non-negative integer/);
  });
});

describe("addForOverwrite", () => {
  it("creates a column without filling the existing elements", () => {
    const set = new AttributeSet();
    resizeForOverwrite(set, 3);
    const a = addForOverwrite(set, "a", "f32", 2, 7);
    expect(a.data.length).toBe(6);
    expect(Array.from(a.data)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(a.defaultValue).toEqual([7, 7]);
    // CONTROL: `add` on the same set fills.
    expect(Array.from(set.add("b", "f32", 2, 7).data)).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it("interns a string column's default at slot 0, as add does", () => {
    const set = new AttributeSet();
    resizeForOverwrite(set, 2);
    const s = addForOverwrite(set, "s", "string", 1, "none");
    expect(s.stringTable).toEqual(["none"]);
    s.setString(0, "x");
    s.setString(1, "none");
    expect(s.stringTable).toEqual(["none", "x"]);
  });

  it("refuses a name already taken", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    expect(() => addForOverwrite(set, "a", "f32")).toThrow(/already exists/);
  });
});

describe("the overwrite sizing is not public", () => {
  const INTERNAL = ["resizeForOverwrite", "addForOverwrite"];

  it("is absent from the root import", () => {
    for (const name of INTERNAL) expect(name in root).toBe(false);
  });

  it("is not on AttributeSet either, where `export *` would publish it", () => {
    // Where these two lived first. A method would be in the published
    // `.d.ts` whatever its doc comment said, since `src/data/index.ts`
    // re-exports the whole of `attribute.js` and nothing strips
    // `@internal`.
    for (const name of [...INTERNAL, "_resizeForOverwrite", "_addForOverwrite"]) {
      expect(name in AttributeSet.prototype).toBe(false);
      expect(name in new AttributeSet()).toBe(false);
    }
  });

  it("is re-exported by no module under src/", () => {
    // A name reaches an entry point only through a re-export, and this
    // module defines both. So the invariant is: no `export ... from` names
    // the module, and no `export { ... }` list names the functions.
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) files.push(path);
      }
    };
    walk(srcDir);
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(srcDir, file).replace(/\\/g, "/");
      if (rel === "data/overwrite.ts") continue;
      const text = readFileSync(file, "utf8");
      const reExport =
        /^\s*export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["'][^"']*\/overwrite(\.js)?["']/m;
      if (reExport.test(text)) offenders.push(`${rel}: re-exports the module`);
      for (const block of text.match(/export\s*(type\s*)?\{[^}]*\}/g) ?? []) {
        for (const name of INTERNAL) {
          if (new RegExp(`\\b${name}\\b`).test(block)) offenders.push(`${rel}: exports ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
