import { describe, expect, it } from "vitest";
import { Attribute, AttributeSet } from "./attribute.js";
import type { AttrDefault, AttrType } from "./types.js";

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
    a.writable().set([1, 2, 3, 4, 5]);
    a.copyFrom(a, 0, 1, 4);
    expect(Array.from(a.data.subarray(0, 5))).toEqual([1, 1, 2, 3, 4]);
  });

  it("copies ranges between numeric attributes", () => {
    const setA = new AttributeSet();
    const a = setA.add("a", "f32", 2);
    setA.resize(3);
    a.writable().set([1, 2, 3, 4, 5, 6]);
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
    a.writable().set([1, 2, 3]);
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
    a.writable().set([1, 2, 3, 4, 5]);
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
    b.writable().set([5, 6]);
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

/**
 * A NaN with chosen bits, built through a DataView because the literal
 * `NaN` is one particular encoding and `-NaN` is not a thing the language
 * spells. Stored into an f32 column, 0xfff8... comes out 0xffc00000 and
 * plain `NaN` 0x7fc00000: two NaNs that compare equal and are different
 * bytes, which is the case a uniform `fill` cannot serve.
 */
function nanBits(hi: bigint): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, hi);
  return view.getFloat64(0);
}

const NEG_NAN = nanBits(0xfff8000000000000n);
const PAYLOAD_NAN = nanBits(0x7ff4000000000000n);

/** The f32 bits of `value`, as eight hex digits. */
function f32Bits(value: number): string {
  const f = new Float32Array(1);
  f[0] = value;
  return new Uint32Array(f.buffer)[0].toString(16).padStart(8, "0");
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
    // NaNs, which compare equal to each other however their bits differ:
    // one encoding throughout, two alternating, and one in the last slot
    // of an otherwise ordinary tuple.
    nanUniform: (ts) => new Array<number>(ts).fill(NEG_NAN),
    nanMixed: (ts) => Array.from({ length: ts }, (_, k) => (k % 2 === 0 ? Number.NaN : NEG_NAN)),
    nanLast: (ts) => Array.from({ length: ts }, (_, k) => (k === ts - 1 ? PAYLOAD_NAN : 0.5)),
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
            const sentinel = a.writable();
            for (let i = 0; i < sentinel.length; i++) sentinel[i] = 77;
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

  it("keeps each component's NaN encoding, which one broadcast value cannot", () => {
    const set = new AttributeSet();
    const a = set.add("a", "f32", 2, [Number.NaN, NEG_NAN]);
    set.resize(4);
    const expected = a.data.slice();
    referenceFill(expected, 2, [Number.NaN, NEG_NAN], 0, 4);
    a.fillDefault(0, 4);
    expect(sameBytes(a.data, expected)).toBe(true);
    // What the bytes are, stated rather than implied: the two NaNs differ,
    // so a fill that broadcast one of them would be visible here. (If a
    // platform ever canonicalized every NaN to one encoding, this is the
    // assertion that would say so.)
    const bits = Array.from(a.data.subarray(0, 8), (v) => f32Bits(v));
    expect(bits).toEqual(["7fc00000", "ffc00000", "7fc00000", "ffc00000", "7fc00000", "ffc00000", "7fc00000", "ffc00000"]);
    // CONTROL: the uniform fast path over this pattern — `fill(value[0])`,
    // which is what the first cut of this code did — writes one encoding
    // over both components and does NOT match the loop.
    const naive = a.data.slice();
    naive.fill(Number.NaN, 0, 8);
    expect(sameBytes(naive, expected)).toBe(false);
    expect(Array.from(naive.subarray(0, 2), (v) => f32Bits(v))).toEqual(["7fc00000", "7fc00000"]);
  });

  it("treats a scalar exactly as the one-value tuple, NaN included", () => {
    // Two spellings of one fill, which used to take different paths
    // through this method: the scalar went straight to the typed array's
    // own `fill`, which broadcasts one NaN's bits.
    for (const [ts, tuple] of [
      [1, [NEG_NAN]],
      [3, [NEG_NAN, NEG_NAN, NEG_NAN]],
    ] as const) {
      const set = new AttributeSet();
      const viaScalar = set.add("scalar", "f32", ts);
      const viaTuple = set.add("tuple", "f32", ts);
      const viaLoop = set.add("loop", "f32", ts);
      set.resize(5);
      viaScalar.fill(NEG_NAN, 1, 4);
      viaTuple.fill(tuple, 1, 4);
      referenceFill(viaLoop.data, ts, tuple, 1, 4);
      expect(sameBytes(viaScalar.data, viaLoop.data)).toBe(true);
      expect(sameBytes(viaTuple.data, viaLoop.data)).toBe(true);
      expect(f32Bits(viaScalar.get(2))).toBe("ffc00000");
    }
  });

  it("truncates a fractional bound and reads NaN as zero, for every kind of value", () => {
    // ONE RANGE RULE, stated by comparing each fractional or NaN bound
    // with the whole-number bound it stands for. No caller passes such a
    // range; the rule exists so the three kinds of value cannot disagree.
    const cases: Array<[AttrDefault, number, number, number, number]> = [
      [[1, 2], 1, 3.5, 1, 3],
      [[1, 2], 1.9, 4, 1, 4],
      [[1, 2], 0, Number.NaN, 0, 0],
      [[1, 2], Number.NaN, 3, 0, 3],
      [[1, 2], -2, 2, 0, 2],
      [[1, 2], 0, 99, 0, 8],
      [[1, 2], 0, Number.POSITIVE_INFINITY, 0, 8],
      [7, 1, 3.5, 1, 3],
      [7, 0, Number.NaN, 0, 0],
      [7, -2, 2, 0, 2],
    ];
    for (const [value, start, end, plainStart, plainEnd] of cases) {
      const set = new AttributeSet();
      const loose = set.add("loose", "f32", 2);
      const plain = set.add("plain", "f32", 2);
      set.resize(5); // capacity 8
      loose.fill(value, start, end);
      plain.fill(value, plainStart, plainEnd);
      expect(sameBytes(loose.data, plain.data), `[${start}, ${end}) vs [${plainStart}, ${plainEnd})`).toBe(true);
    }
    // The same rule on a string column, where the value cannot be a tuple.
    const set = new AttributeSet();
    const loose = set.add("loose", "string", 1, "none");
    const plain = set.add("plain", "string", 1, "none");
    set.resize(4);
    loose.fill("x", 1, 3.5);
    plain.fill("x", 1, 3);
    expect(Array.from(loose.data)).toEqual(Array.from(plain.data));
    expect(loose.getString(3)).toBe("none");
    // And the word is interned even when the range comes out empty, so a
    // column's table does not depend on the bounds it was filled over.
    const empty = set.add("empty", "string", 1, "none");
    empty.fill("late", 2, Number.NaN);
    expect(empty.stringTable).toEqual(["none", "late"]);
    expect(empty.getString(2)).toBe("none");
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
