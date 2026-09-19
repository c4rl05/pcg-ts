import { describe, expect, it } from "vitest";
import { Attribute, AttributeSet } from "./attribute.js";
import type { AttrType } from "./types.js";

const NUMERIC_VALUES: Record<Exclude<AttrType, "string">, number[]> = {
  f32: [1.5, -2.25, 1024.5, 0.125],
  i32: [-2147483648, 2147483647, -5, 7],
  u32: [0, 4294967295, 123456789, 42],
  bool: [1, 0, 1, 1],
};

describe("Attribute storage round-trips", () => {
  for (const type of Object.keys(NUMERIC_VALUES) as Array<Exclude<AttrType, "string">>) {
    for (const tupleSize of [1, 2, 3, 4]) {
      it(`round-trips ${type} with tupleSize ${tupleSize}`, () => {
        const values = NUMERIC_VALUES[type];
        const set = new AttributeSet();
        const attr = set.add("a", type, tupleSize);
        set.resize(3);
        const tuples: number[][] = [];
        for (let i = 0; i < 3; i++) {
          const tuple: number[] = [];
          for (let k = 0; k < tupleSize; k++) {
            tuple.push(values[(i * tupleSize + k) % values.length]);
          }
          tuples.push(tuple);
          attr.setTuple(i, tuple);
        }
        for (let i = 0; i < 3; i++) {
          expect(attr.getTuple(i)).toEqual(tuples[i]);
          for (let k = 0; k < tupleSize; k++) {
            expect(attr.get(i, k)).toBe(tuples[i][k]);
          }
        }
      });
    }
  }

  it("maps types to the expected typed arrays", () => {
    const set = new AttributeSet();
    expect(set.add("f", "f32").data).toBeInstanceOf(Float32Array);
    expect(set.add("i", "i32").data).toBeInstanceOf(Int32Array);
    expect(set.add("u", "u32").data).toBeInstanceOf(Uint32Array);
    expect(set.add("b", "bool").data).toBeInstanceOf(Uint8Array);
    expect(set.add("s", "string").data).toBeInstanceOf(Uint32Array);
  });

  it("round-trips string values with interning", () => {
    const set = new AttributeSet();
    const attr = set.add("s", "string");
    set.resize(4);
    attr.setString(0, "apple");
    attr.setString(1, "banana");
    attr.setString(2, "apple");
    attr.setString(3, "");
    expect(attr.getString(0)).toBe("apple");
    expect(attr.getString(1)).toBe("banana");
    expect(attr.getString(2)).toBe("apple");
    expect(attr.getString(3)).toBe("");
    // "" (default) + "apple" + "banana": duplicates interned once.
    expect(attr.stringTable).toEqual(["", "apple", "banana"]);
    expect(attr.data[0]).toBe(attr.data[2]);
  });

  it("looks a string up without interning it", () => {
    // `internString` INSERTS on a miss, which is right for a writer and
    // wrong for anything merely reading the column — a field resolving a
    // literal would otherwise edit the geometry it is evaluating over,
    // and the appended entry would renumber the table at the next
    // `copyFrom`. `lookupString` is the read-only half.
    const set = new AttributeSet();
    const attr = set.add("s", "string");
    set.resize(2);
    attr.setString(0, "apple");
    expect(attr.lookupString("apple")).toBe(1);
    expect(attr.lookupString("")).toBe(0);
    expect(attr.lookupString("banana")).toBeUndefined();
    expect(attr.stringTable).toEqual(["", "apple"]);
    // ...and the miss above really would have grown the table.
    expect(attr.internString("banana")).toBe(2);
    expect(attr.lookupString("banana")).toBe(2);
  });

  it("refuses a string lookup on a numeric attribute", () => {
    const attr = new AttributeSet().add("n", "f32");
    expect(() => attr.lookupString("apple")).toThrow(/not a string attribute/);
  });

  it("round-trips string tuples per component", () => {
    const set = new AttributeSet();
    const attr = set.add("s", "string", 2);
    set.resize(2);
    attr.setString(0, "a", 0);
    attr.setString(0, "b", 1);
    attr.setString(1, "c", 0);
    expect(attr.getString(0, 0)).toBe("a");
    expect(attr.getString(0, 1)).toBe("b");
    expect(attr.getString(1, 0)).toBe("c");
  });

  it("set + scalar get honor components", () => {
    const set = new AttributeSet();
    const attr = set.add("v", "f32", 3);
    set.resize(2);
    attr.set(1, 5.5, 2);
    expect(attr.get(1, 2)).toBe(5.5);
    expect(attr.get(1, 0)).toBe(0);
    expect(attr.data[5]).toBe(5.5);
  });
});

describe("Attribute fill and copy", () => {
  it("fills scalar, tuple, and string values over a range", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 2);
    const s = set.add("s", "string");
    set.resize(4);
    a.fill(3, 1, 3);
    expect(Array.from(a.data.subarray(0, 8))).toEqual([0, 0, 3, 3, 3, 3, 0, 0]);
    a.fill([7, 8], 0, 2);
    expect(Array.from(a.data.subarray(0, 4))).toEqual([7, 8, 7, 8]);
    s.fill("x", 2, 4);
    expect(s.getString(1)).toBe("");
    expect(s.getString(2)).toBe("x");
    expect(s.getString(3)).toBe("x");
  });

  it("copies ranges within one attribute (overlap-safe)", () => {
    const set = new AttributeSet();
    const a = set.add("a", "i32");
    set.resize(5);
    a.data.set([1, 2, 3, 4, 5]);
    a.copyFrom(a, 0, 1, 4);
    expect(Array.from(a.data.subarray(0, 5))).toEqual([1, 1, 2, 3, 4]);
  });

  it("copies ranges between numeric attributes", () => {
    const setA = new AttributeSet();
    const a = setA.add("a", "f32", 2);
    setA.resize(3);
    a.data.set([1, 2, 3, 4, 5, 6]);
    const setB = new AttributeSet();
    const b = setB.add("b", "f32", 2);
    setB.resize(3);
    b.copyFrom(a, 1, 0, 2);
    expect(Array.from(b.data.subarray(0, 4))).toEqual([3, 4, 5, 6]);
  });

  it("re-interns strings when copying across attributes", () => {
    const setA = new AttributeSet();
    const a = setA.add("a", "string");
    setA.resize(3);
    a.setString(0, "x");
    a.setString(1, "y");
    a.setString(2, "z");
    const setB = new AttributeSet();
    const b = setB.add("b", "string");
    setB.resize(3);
    b.setString(0, "q"); // diverge the tables so raw indices differ
    b.copyFrom(a, 1, 1, 2);
    expect(b.getString(0)).toBe("q");
    expect(b.getString(1)).toBe("y");
    expect(b.getString(2)).toBe("z");
  });

  it("rejects mismatched copyFrom shapes and out-of-range copies", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 2);
    const b = set.add("b", "f32", 3);
    const c = set.add("c", "i32", 2);
    set.resize(2);
    expect(() => a.copyFrom(b, 0, 0, 1)).toThrow(/matching type and tupleSize/);
    expect(() => a.copyFrom(c, 0, 0, 1)).toThrow(/matching type and tupleSize/);
    expect(() => a.copyFrom(a, 0, 7, 3)).toThrow(/out of bounds/);
  });
});

describe("AttributeSet defaults and resize", () => {
  it("initializes new elements to the default on grow", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 1, 9);
    set.resize(3);
    a.data.set([1, 2, 3]);
    set.resize(6);
    expect(Array.from(a.data.subarray(0, 6))).toEqual([1, 2, 3, 9, 9, 9]);
  });

  it("broadcasts scalar defaults and honors tuple defaults", () => {
    const set = new AttributeSet();
    const s = set.add("s", "f32", 3, 2);
    const t = set.add("t", "f32", 4, [0, 0, 0, 1]);
    set.resize(2);
    expect(Array.from(s.data.subarray(0, 6))).toEqual([2, 2, 2, 2, 2, 2]);
    expect(Array.from(t.data.subarray(0, 8))).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("defaults string attributes", () => {
    const set = new AttributeSet();
    const s = set.add("s", "string", 1, "none");
    set.resize(2);
    expect(s.getString(0)).toBe("none");
    expect(s.getString(1)).toBe("none");
  });

  it("initializes existing elements when adding to a non-empty set", () => {
    const set = new AttributeSet();
    set.resize(4);
    const a = set.add("a", "u32", 1, 9);
    expect(Array.from(a.data.subarray(0, 4))).toEqual([9, 9, 9, 9]);
  });

  it("re-defaults elements after shrink and regrow", () => {
    const set = new AttributeSet();
    const a = set.add("a", "i32", 1, 9);
    set.resize(5);
    a.data.set([1, 2, 3, 4, 5]);
    set.resize(2);
    expect(set.count).toBe(2);
    set.resize(5);
    expect(Array.from(a.data.subarray(0, 5))).toEqual([1, 2, 9, 9, 9]);
  });

  it("grows capacity by doubling and keeps it on shrink", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    set.resize(3);
    expect(set.capacity).toBe(8);
    set.resize(9);
    expect(set.capacity).toBe(16);
    set.resize(17);
    expect(set.capacity).toBe(32);
    set.resize(2);
    expect(set.capacity).toBe(32);
    expect(set.count).toBe(2);
    const a = set.require("a");
    expect(a.capacity).toBe(32);
  });

  it("keeps data valid for attributes added before the first resize", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 2, 5);
    expect(a.capacity).toBe(0);
    set.resize(3);
    expect(Array.from(a.data.subarray(0, 6))).toEqual([5, 5, 5, 5, 5, 5]);
  });
});

describe("AttributeSet ordering and management", () => {
  it("iterates in insertion order, deterministically", () => {
    const set = new AttributeSet();
    set.add("alpha", "f32");
    set.add("zeta", "i32");
    set.add("beta", "u32");
    expect(set.names()).toEqual(["alpha", "zeta", "beta"]);
    expect([...set].map((a) => a.name)).toEqual(["alpha", "zeta", "beta"]);
    set.remove("zeta");
    set.add("gamma", "f32");
    expect(set.names()).toEqual(["alpha", "beta", "gamma"]);
  });

  it("rename keeps the attribute's position", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    set.add("b", "f32");
    set.add("c", "f32");
    set.rename("b", "middle");
    expect(set.names()).toEqual(["a", "middle", "c"]);
    expect(set.require("middle").name).toBe("middle");
    expect(set.has("b")).toBe(false);
  });

  it("add/get/has/remove/require behave", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32");
    expect(set.get("a")).toBe(a);
    expect(set.has("a")).toBe(true);
    expect(set.get("missing")).toBeUndefined();
    expect(() => set.require("missing")).toThrow(/not found/);
    expect(set.remove("a")).toBe(true);
    expect(set.remove("a")).toBe(false);
    expect(set.size).toBe(0);
  });

  it("replace reuses same-shaped attributes in place", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    const b = set.add("b", "f32");
    set.add("c", "f32");
    set.resize(2);
    b.data.set([5, 6]);
    const b2 = set.replace("b", "f32", 1, 7);
    expect(b2).toBe(b);
    expect(set.names()).toEqual(["a", "b", "c"]);
    expect(Array.from(b2.data.subarray(0, 2))).toEqual([7, 7]);
  });

  it("replace swaps mismatched shapes for a fresh attribute", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    set.add("b", "f32");
    set.resize(2);
    const b2 = set.replace("b", "u32", 2, 3);
    expect(b2.type).toBe("u32");
    expect(b2.tupleSize).toBe(2);
    expect(Array.from(b2.data.subarray(0, 4))).toEqual([3, 3, 3, 3]);
  });

  it("rejects duplicate adds and bad renames", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    set.add("b", "f32");
    expect(() => set.add("a", "f32")).toThrow(/already exists/);
    expect(() => set.rename("a", "b")).toThrow(/already exists/);
    expect(() => set.rename("missing", "x")).toThrow(/not found/);
  });

  it("validates defaults and types", () => {
    const set = new AttributeSet();
    expect(() => set.add("a", "f32", 3, [1, 2])).toThrow(/does not match tupleSize/);
    expect(() => set.add("b", "f32", 1, "oops")).toThrow(/numeric default/);
    expect(() => set.add("c", "string", 1, 5)).toThrow(/string default/);
    expect(() => set.add("d", "f32", 0)).toThrow(/positive integer/);
    const n = set.add("n", "f32");
    expect(() => n.getString(0)).toThrow(/not a string attribute/);
    expect(() => set.resize(-1)).toThrow(/non-negative/);
  });

  it("standalone Attribute exposes capacity and defaults", () => {
    const attr = new Attribute("solo", "f32", 2, 4, [1, 2]);
    expect(attr.capacity).toBe(4);
    expect(attr.defaultValue).toEqual([1, 2]);
    attr.fillDefault(0, 4);
    expect(Array.from(attr.data)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
  });
});

/**
 * The fill `Attribute.fill` shipped with before its fast paths: one indexed
 * store per component. The fast paths are held to it BYTE FOR BYTE.
 */
function referenceFill(
  data: { [i: number]: number },
  ts: number,
  value: readonly number[],
  start: number,
  end: number,
): void {
  for (let i = start; i < end; i++) {
    const offset = i * ts;
    for (let k = 0; k < ts; k++) data[offset + k] = value[k];
  }
}

function bytesOf(data: ArrayBufferView): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function sameBytes(a: ArrayBufferView, b: ArrayBufferView): boolean {
  const x = bytesOf(a);
  const y = bytesOf(b);
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

describe("Attribute.fill fast paths", () => {
  const PATTERNS: Record<string, (ts: number) => number[]> = {
    zeros: (ts) => new Array<number>(ts).fill(0),
    uniform: (ts) => new Array<number>(ts).fill(1.5),
    // [0, 0, 0, 1] — the rot default: uniform but for the last component.
    lastDiffers: (ts) => Array.from({ length: ts }, (_, k) => (k === ts - 1 ? 1 : 0)),
    ramp: (ts) => Array.from({ length: ts }, (_, k) => k * 0.75 - 1),
    // 0 and -0 are different f32 bits; a `===` uniformity test would merge them.
    signedZero: (ts) => Array.from({ length: ts }, (_, k) => (k % 2 === 0 ? 0 : -0)),
    nan: (ts) => Array.from({ length: ts }, (_, k) => (k === 0 ? Number.NaN : 2)),
    // Converted on store: truncated by the integer types, wrapped by u32.
    converted: (ts) => Array.from({ length: ts }, (_, k) => -1.75 + k * 300.5),
  };
  const RANGES: Array<[number, number]> = [
    [0, 0],
    [3, 3],
    [0, 1],
    [2, 3],
    [0, 7],
    [1, 8],
    [0, 16],
    [5, 16],
    [3, 13],
  ];

  it("writes exactly the bytes the per-element loop wrote, for every type, tuple size and range", () => {
    let checked = 0;
    for (const type of ["f32", "i32", "u32", "bool"] as const) {
      for (let ts = 1; ts <= 5; ts++) {
        for (const [pname, make] of Object.entries(PATTERNS)) {
          const value = make(ts);
          for (const [start, end] of RANGES) {
            const set = new AttributeSet();
            const a = set.add("a", type, ts);
            set.resize(16);
            // A sentinel everywhere, so a write outside [start, end) shows.
            for (let i = 0; i < a.data.length; i++) a.data[i] = 77;
            const expected = a.data.slice();
            referenceFill(expected, ts, value, start, end);
            a.fill(value, start, end);
            if (!sameBytes(a.data, expected)) {
              throw new Error(`${type} x${ts} ${pname} [${start}, ${end}) differs from the loop`);
            }
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(4 * 5 * Object.keys(PATTERNS).length * RANGES.length);
  });

  it("CONTROL: the byte comparison above reports a fill one element short", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 3);
    set.resize(16);
    const expected = a.data.slice();
    referenceFill(expected, 3, [1, 2, 3], 0, 9);
    a.fill([1, 2, 3], 0, 10);
    expect(sameBytes(a.data, expected)).toBe(false);
    // And a single flipped bit, in a column that otherwise matches.
    const again = a.data.slice();
    bytesOf(again)[5] ^= 1;
    expect(sameBytes(a.data, again)).toBe(false);
  });

  it("clamps a negative start and clips an end past capacity, as the loop did", () => {
    for (const value of [[4, 4, 4], [1, 2, 3]]) {
      const set = new AttributeSet();
      const a = set.add("a", "f32", 3);
      set.resize(3); // capacity 8
      const expected = a.data.slice();
      referenceFill(expected, 3, value, -2, 20);
      a.fill(value, -2, 20);
      expect(sameBytes(a.data, expected)).toBe(true);
      expect(Array.from(a.data.subarray(0, 3))).toEqual(value);
    }
  });
});

describe("AttributeSet._resizeForOverwrite", () => {
  it("allocates exactly the count, where resize rounds up by doubling", () => {
    const exact = new AttributeSet();
    const e = exact.add("P", "f32", 3);
    exact._resizeForOverwrite(5);
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
    set._resizeForOverwrite(4);
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
    set._resizeForOverwrite(6);
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
    set._resizeForOverwrite(3);
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
    a.data.set([1, 2, 3, 4, 5]);
    set._resizeForOverwrite(3);
    expect(set.capacity).toBe(8);
    expect(set.count).toBe(3);
    set._resizeForOverwrite(10);
    expect(set.capacity).toBe(10);
    expect(Array.from(a.data.subarray(0, 3))).toEqual([1, 2, 3]);
  });

  it("grows by doubling from an exact capacity once appended to", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 1, 3);
    set._resizeForOverwrite(9);
    a.data.set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    set.resize(10);
    expect(set.capacity).toBe(18);
    expect(Array.from(a.data.subarray(0, 10))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 3]);
  });

  it("rejects a count that is not a non-negative integer", () => {
    const set = new AttributeSet();
    expect(() => set._resizeForOverwrite(-1)).toThrow(/non-negative integer/);
    expect(() => set._resizeForOverwrite(1.5)).toThrow(/non-negative integer/);
  });
});

describe("AttributeSet._addForOverwrite", () => {
  it("creates a column without filling the existing elements", () => {
    const set = new AttributeSet();
    set._resizeForOverwrite(3);
    const a = set._addForOverwrite("a", "f32", 2, 7);
    expect(a.data.length).toBe(6);
    expect(Array.from(a.data)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(a.defaultValue).toEqual([7, 7]);
    // CONTROL: `add` on the same set fills.
    expect(Array.from(set.add("b", "f32", 2, 7).data)).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it("interns a string column's default at slot 0, as add does", () => {
    const set = new AttributeSet();
    set._resizeForOverwrite(2);
    const s = set._addForOverwrite("s", "string", 1, "none");
    expect(s.stringTable).toEqual(["none"]);
    s.setString(0, "x");
    s.setString(1, "none");
    expect(s.stringTable).toEqual(["none", "x"]);
  });

  it("refuses a name already taken", () => {
    const set = new AttributeSet();
    set.add("a", "f32");
    expect(() => set._addForOverwrite("a", "f32")).toThrow(/already exists/);
  });
});
