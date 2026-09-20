import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { cloneGeometry } from "../graph/clone.js";
import * as root from "../index.js";
import { Attribute, AttributeSet } from "./attribute.js";
import { deriveGeometry, isColumnShared } from "./derive.js";
import { createTriangleMesh, Geometry, PRIMTYPE_ATTR } from "./geometry.js";
import { DOMAINS, type Domain } from "./types.js";

const INTERNAL = ["deriveGeometry", "isColumnShared"];

/**
 * A small mesh carrying one column of every type on every domain, so a
 * derivation is asked about the numeric case, the string case and the
 * detail-domain case at once.
 */
function sample(): Geometry {
  const geo = createTriangleMesh(
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 2, 1, 3, 2],
  );
  const pt = geo.attrs.point;
  const scale = pt.add("scale", "f32", 3, [1, 1, 1]);
  for (let i = 0; i < pt.count; i++) scale.setTuple(i, [i + 1, i + 2, i + 3]);
  const seed = pt.add("seed", "u32", 1);
  for (let i = 0; i < pt.count; i++) seed.set(i, 1000 + i);
  const flag = pt.add("flag", "bool", 1);
  for (let i = 0; i < pt.count; i++) flag.set(i, i % 2);
  const name = pt.add("name", "string", 1, "none");
  for (let i = 0; i < pt.count; i++) name.setString(i, `p${i}`);
  const uv = geo.attrs.vertex.add("uv", "f32", 2);
  for (let i = 0; i < geo.vertexCount; i++) uv.setTuple(i, [i * 0.25, i * 0.5]);
  const mat = geo.attrs.primitive.add("mat", "i32", 1, -1);
  for (let i = 0; i < geo.primitiveCount; i++) mat.set(i, i * 7);
  geo.attrs.detail.add("author", "string", 1, "").setString(0, "eiffel");
  return geo;
}

/**
 * One column over its LIVE range. The source of a derivation may carry
 * the slack of growth by doubling while the derived column is cut to its
 * count, so the whole allocation is not what the two have in common.
 */
function live(geo: Geometry, name: string, domain: Domain = "point"): number[] {
  const set = geo.attrs[domain];
  const attr = set.require(name);
  return Array.from(attr.data.subarray(0, set.count * attr.tupleSize));
}

/** Every column of every domain, as plain numbers over the live range. */
function snapshot(geo: Geometry): Record<string, unknown> {
  const out: Record<string, unknown> = {
    vertexToPoint: Array.from(geo.vertexToPoint),
    primVertexStart: Array.from(geo.primVertexStart),
    primVertexCount: Array.from(geo.primVertexCount),
  };
  for (const domain of DOMAINS) {
    const set = geo.attrs[domain];
    out[`${domain}:count`] = set.count;
    out[`${domain}:capacity`] = set.capacity;
    out[`${domain}:names`] = set.names();
    for (const attr of set) {
      const key = `${domain}.${attr.name}`;
      out[key] = Array.from(attr.data.subarray(0, set.count * attr.tupleSize));
      out[`${key}:table`] = [...attr.stringTable];
      out[`${key}:default`] = attr.defaultValue;
      out[`${key}:capacity`] = attr.capacity;
    }
  }
  return out;
}

describe("deriveGeometry", () => {
  it("is element-for-element what cloneGeometry produces", () => {
    const src = sample();
    expect(snapshot(deriveGeometry(src))).toEqual(snapshot(cloneGeometry(src)));
    // CONTROL: the comparator can tell two geometries apart. One point
    // moved, and nothing else, has to show up.
    const moved = cloneGeometry(src);
    moved.attrs.point.require("P").set(0, 99);
    expect(snapshot(moved)).not.toEqual(snapshot(cloneGeometry(src)));
  });

  it("leaves the source unchanged", () => {
    const src = sample();
    const before = snapshot(src);
    deriveGeometry(src);
    expect(snapshot(src)).toEqual(before);
  });

  it("shares numeric columns and copies string ones", () => {
    const src = sample();
    const out = deriveGeometry(src);
    for (const domain of DOMAINS) {
      for (const attr of src.attrs[domain]) {
        const derived = out.attrs[domain].require(attr.name);
        if (attr.type === "string") {
          expect(derived.data.buffer).not.toBe(attr.data.buffer);
          expect(isColumnShared(derived)).toBe(false);
          expect(isColumnShared(attr)).toBe(false);
        } else {
          expect(derived.data.buffer).toBe(attr.data.buffer);
          expect(isColumnShared(derived)).toBe(true);
          expect(isColumnShared(attr)).toBe(true);
        }
      }
    }
    // CONTROL: the deep copy shares nothing, so `toBe` on a buffer is a
    // test with teeth rather than a tautology about typed arrays.
    const copy = cloneGeometry(src);
    expect(copy.attrs.point.require("P").data.buffer).not.toBe(
      src.attrs.point.require("P").data.buffer,
    );
  });

  it("copies the topology arrays, which carry no read view of their own", () => {
    const src = sample();
    const out = deriveGeometry(src);
    expect(Array.from(out.vertexToPoint)).toEqual(Array.from(src.vertexToPoint));
    expect(out.vertexToPoint.buffer).not.toBe(src.vertexToPoint.buffer);
    expect(out.primVertexStart.buffer).not.toBe(src.primVertexStart.buffer);
    expect(out.primVertexCount.buffer).not.toBe(src.primVertexCount.buffer);
  });

  it("lends the live prefix, not the allocation, when the source carries slack", () => {
    const src = new Geometry();
    const P = src.attrs.point.add("P", "f32", 3);
    src.attrs.point.resize(5); // doubling: capacity 8, count 5
    expect(src.attrs.point.capacity).toBe(8);
    for (let i = 0; i < 5; i++) P.setTuple(i, [i, i, i]);
    const out = deriveGeometry(src);
    const derived = out.attrs.point.require("P");
    expect(out.attrs.point.capacity).toBe(5);
    expect(derived.capacity).toBe(5);
    expect(derived.data.length).toBe(15);
    // Same bytes, same buffer, a view of its first 15 elements.
    expect(derived.data.buffer).toBe(P.data.buffer);
    expect(Array.from(derived.data)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
  });

  it("derives a geometry with no elements at all", () => {
    const empty = new Geometry();
    empty.attrs.point.add("P", "f32", 3);
    const out = deriveGeometry(empty);
    expect(out.pointCount).toBe(0);
    expect(out.attrs.point.require("P").data.length).toBe(0);
  });

  it("carries the primtype tag across, so a derived mesh still reads as one", () => {
    const out = deriveGeometry(sample());
    expect(out.attrs.primitive.require(PRIMTYPE_ATTR).getString(0)).toBe("poly");
  });
});

describe("the copy-on-write fork", () => {
  it("gives the writer its own storage and leaves the other column alone", () => {
    const src = sample();
    const out = deriveGeometry(src);
    const from = src.attrs.point.require("P");
    const to = out.attrs.point.require("P");
    const before = live(src, "P");

    const p = to.writable();
    expect(to.data.buffer).not.toBe(from.data.buffer);
    expect(Array.from(p)).toEqual(before); // the fork COPIES, it does not zero
    p[0] = 42;
    expect(live(src, "P")).toEqual(before);
    expect(to.get(0, 0)).toBe(42);
  });

  it("forks whichever side writes first — including the source", () => {
    const src = sample();
    const out = deriveGeometry(src);
    const from = src.attrs.point.require("P");
    const to = out.attrs.point.require("P");
    const before = Array.from(to.data);
    from.set(0, -7);
    expect(from.get(0, 0)).toBe(-7);
    expect(Array.from(to.data)).toEqual(before);
  });

  it("forks once: a second writable() on the same column is the same array", () => {
    const out = deriveGeometry(sample());
    const to = out.attrs.point.require("P");
    expect(isColumnShared(to)).toBe(true);
    const first = to.writable();
    expect(isColumnShared(to)).toBe(false);
    expect(to.writable()).toBe(first);
  });

  it("never forks a column nothing writes", () => {
    const src = sample();
    const out = deriveGeometry(src);
    out.attrs.point.require("P").writable()[0] = 1;
    // `scale` and `seed` were along for the ride and are still on loan.
    for (const name of ["scale", "seed", "flag"]) {
      expect(out.attrs.point.require(name).data.buffer).toBe(
        src.attrs.point.require(name).data.buffer,
      );
    }
  });

  // Every route that writes a column, each asked the same question: does
  // the source still read as it did? These are the fork points, and a
  // missing one is a cache corruption, not a slow path.
  const writers: Array<[string, (attr: Attribute) => void]> = [
    ["set", (a) => a.set(0, 5)],
    ["setTuple", (a) => a.setTuple(0, [5, 5, 5])],
    ["fill", (a) => a.fill(5)],
    ["fill over one element", (a) => a.fill([5, 5, 5], 0, 1)],
    ["fillDefault", (a) => a.fillDefault(0, 1)],
    ["writable", (a) => void (a.writable()[0] = 5)],
    ["copyFrom (self)", (a) => a.copyFrom(a, 1, 0, 1)],
  ];
  for (const [label, write] of writers) {
    it(`forks on ${label}`, () => {
      const src = sample();
      const out = deriveGeometry(src);
      const from = src.attrs.point.require("P");
      const before = Array.from(from.data);
      write(out.attrs.point.require("P"));
      expect(Array.from(from.data)).toEqual(before);
      expect(out.attrs.point.require("P").data.buffer).not.toBe(from.data.buffer);
    });
  }

  it("forks on copyFrom from another column", () => {
    const src = sample();
    const out = deriveGeometry(src);
    const from = src.attrs.point.require("P");
    const before = Array.from(from.data);
    const other = new Attribute("P", "f32", 3, from.capacity);
    other.fill([9, 9, 9]);
    out.attrs.point.require("P").copyFrom(other, 0, 0, 2);
    expect(Array.from(from.data)).toEqual(before);
  });

  it("forks on setString, though a string column is never lent in the first place", () => {
    const src = sample();
    const out = deriveGeometry(src);
    out.attrs.point.require("name").setString(0, "changed");
    expect(src.attrs.point.require("name").getString(0)).toBe("p0");
  });

  it("forks when replace resets a column in place", () => {
    const src = sample();
    const out = deriveGeometry(src);
    const before = live(src, "scale");
    out.attrs.point.replace("scale", "f32", 3, [1, 1, 1]);
    expect(live(src, "scale")).toEqual(before);
    expect(live(out, "scale")).toEqual(new Array<number>(before.length).fill(1));
  });

  it("forks when a resize grows the element count", () => {
    const src = sample();
    const out = deriveGeometry(src);
    const from = src.attrs.point.require("scale");
    const before = Array.from(from.data);
    out.attrs.point.resize(out.pointCount + 3);
    expect(Array.from(from.data)).toEqual(before);
    // The new elements read as the column's default on the derived side.
    expect(out.attrs.point.require("scale").getTuple(out.pointCount - 1)).toEqual([1, 1, 1]);
  });

  it("forks the SOURCE when a resize grows it within its existing capacity", () => {
    // The one path where the default fill is the ONLY writer: `_grow`
    // returns early because storage is already long enough, so nothing
    // reallocates and `fillDefault` has to do the forking itself.
    //
    // It can only be reached from the LENDING side. A derived column is
    // cut to exactly its count, so growing one past that always
    // reallocates and the fork is `_grow`'s — which is the test above.
    // A source that has been shrunk still carries its old allocation, and
    // growing back into it writes in place.
    const src = new Geometry();
    const scale = src.attrs.point.add("scale", "f32", 3, [1, 1, 1]);
    src.attrs.point.resize(8);
    for (let i = 0; i < 8; i++) scale.setTuple(i, [i, i, i]);
    src.attrs.point.resize(4); // shrink; the allocation stays at 8
    expect(scale.capacity).toBe(8);

    const out = deriveGeometry(src);
    const lent = out.attrs.point.require("scale");
    const lentBefore = Array.from(lent.data);
    const lentArray = lent.data;
    expect(lent.capacity).toBe(4);

    // 6 <= 8, so no reallocation happens and the fill is all there is.
    src.attrs.point.resize(6);
    expect(scale.capacity).toBe(8); // it really did not reallocate for room
    expect(scale.data.buffer).not.toBe(lentArray.buffer); // it reallocated to FORK
    expect(Array.from(lent.data)).toEqual(lentBefore);
    // And the source got what a fill is supposed to give it.
    expect(scale.getTuple(5)).toEqual([1, 1, 1]);
    expect(scale.getTuple(0)).toEqual([0, 0, 0]);
  });

  it("re-shares a column that has already forked once", () => {
    const src = sample();
    const a = deriveGeometry(src);
    a.attrs.point.require("P").writable()[0] = 1;
    const b = deriveGeometry(src);
    expect(b.attrs.point.require("P").data.buffer).toBe(src.attrs.point.require("P").data.buffer);
    const before = Array.from(src.attrs.point.require("P").data);
    b.attrs.point.require("P").writable()[0] = 2;
    expect(Array.from(src.attrs.point.require("P").data)).toEqual(before);
  });

  it("keeps two consumers of one producer from seeing each other's writes", () => {
    // The graph's shape, without the graph: one cached geometry, two nodes
    // deriving from it, each writing the column the other reads.
    const producer = sample();
    const left = deriveGeometry(producer);
    const right = deriveGeometry(producer);
    const original = live(producer, "P");

    const lp = left.attrs.point.require("P").writable();
    for (let i = 0; i < lp.length; i++) lp[i] = -1;
    expect(live(right, "P")).toEqual(original);
    expect(live(producer, "P")).toEqual(original);

    const rp = right.attrs.point.require("P").writable();
    for (let i = 0; i < rp.length; i++) rp[i] = -2;
    expect(live(left, "P")).toEqual(new Array<number>(original.length).fill(-1));
    expect(live(producer, "P")).toEqual(original);
  });

  it("keeps a chain of derivations apart", () => {
    const a = sample();
    const b = deriveGeometry(a);
    const c = deriveGeometry(b);
    const d = deriveGeometry(c);
    const original = Array.from(a.attrs.point.require("P").data);
    c.attrs.point.require("P").writable()[0] = 77;
    expect(a.attrs.point.require("P").get(0, 0)).toBe(original[0]);
    expect(b.attrs.point.require("P").get(0, 0)).toBe(original[0]);
    expect(d.attrs.point.require("P").get(0, 0)).toBe(original[0]);
    expect(c.attrs.point.require("P").get(0, 0)).toBe(77);
  });

  it("does not fork an empty fill, which writes nothing", () => {
    const out = deriveGeometry(sample());
    const P = out.attrs.point.require("P");
    const lent = P.data.buffer;
    P.fill([1, 1, 1], 2, 2);
    expect(P.data.buffer).toBe(lent);
    // CONTROL: the same call over a real range does fork.
    P.fill([1, 1, 1], 2, 3);
    expect(P.data.buffer).not.toBe(lent);
  });

  it("interns an empty string fill's word without forking", () => {
    const set = new AttributeSet();
    const tag = set.add("tag", "string", 1, "none");
    set.resize(3);
    tag.fill("word", 1, 1);
    expect(tag.stringTable).toEqual(["none", "word"]);
  });
});

describe("cloneGeometry", () => {
  it("stays a deep, independent copy", () => {
    const src = sample();
    const copy = cloneGeometry(src);
    for (const domain of DOMAINS) {
      for (const attr of src.attrs[domain]) {
        expect(copy.attrs[domain].require(attr.name).data.buffer).not.toBe(attr.data.buffer);
        expect(isColumnShared(attr)).toBe(false);
      }
    }
  });
});

describe("the derive module", () => {
  it("is absent from the root import", () => {
    for (const name of INTERNAL) expect(name in root).toBe(false);
  });

  it("is not on Attribute or AttributeSet either, where `export *` would publish it", () => {
    for (const name of INTERNAL) {
      expect(name in AttributeSet.prototype).toBe(false);
      expect(name in Attribute.prototype).toBe(false);
    }
  });

  it("is re-exported by no module under src/", () => {
    // Same invariant, and same reading of it, as `overwrite.test.ts`: a
    // name reaches an entry point only through a re-export, and this
    // module defines both.
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
      if (rel === "data/derive.ts") continue;
      const text = readFileSync(file, "utf8");
      const reExport =
        /^\s*export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["'][^"']*\/derive(\.js)?["']/m;
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
