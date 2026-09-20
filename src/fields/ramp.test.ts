import { describe, expect, it } from "vitest";
import { createPointCloud } from "../data/index.js";
import { Pcg32 } from "../random/index.js";
import { ramp } from "./combinators.js";
import { type FieldSpec, fieldFromJson } from "./fieldJson.js";
import { index } from "./inputs.js";
import { type EvalContext, evaluateField, makeField } from "./types.js";

// A ramp of more than 16 stops finds each element's segment by bisection.
// Every ramp used to walk from the first segment, which made n stops over
// n elements O(n²) — the shape a literal per-point table takes
// (`ramp(index(), [[i, v], ...])`). Short ramps still walk, because the
// walk is faster there. Only the SEARCH changed; this file holds the old
// lookup as the reference and requires the shipped one to reproduce it
// byte for byte, so every hand-picked case runs at both lengths.

type Stops = ReadonlyArray<readonly [number, number]>;

/**
 * The same stops and 20 more, long enough that the lookup bisects: above
 * the last position when it is finite, else below the first, else just
 * after an infinite first stop, else (a lone +Infinity) below it. The
 * extra stops all carry `value`.
 */
function lengthened(stops: Stops, value = 1): Stops {
  const extra = Array.from({ length: 20 }, (_, k) => k);
  const first = stops[0]![0];
  const last = stops[stops.length - 1]![0];
  if (Number.isFinite(last)) return [...stops, ...extra.map((k) => [last + 1 + k, value] as const)];
  if (Number.isFinite(first)) return [...extra.map((k) => [first - 21 + k, value] as const), ...stops];
  const next = stops[1]?.[0];
  if (first === -Infinity && next !== undefined && Number.isFinite(next)) {
    return [stops[0]!, ...extra.map((k) => [next - 21 + k, value] as const), ...stops.slice(1)];
  }
  if (first === Infinity) return [...extra.map((k) => [k, value] as const), ...stops];
  throw new Error("lengthened: no finite position to extend from");
}

/**
 * The CPU evaluator as it stood before the bisection, verbatim apart from
 * taking its column as an argument: clamp at the ends, otherwise walk from
 * the first segment to the first stop whose position is not below `t`, and
 * interpolate that segment in f64 before the store rounds to f32.
 */
function rampByScan(data: ArrayLike<number>, stops: Stops): Float32Array {
  const ts = stops.map((s) => s[0]);
  const vs = stops.map((s) => s[1]);
  const n = data.length;
  const out = new Float32Array(n);
  const last = ts.length - 1;
  for (let i = 0; i < n; i++) {
    const t = data[i];
    if (t <= ts[0]) {
      out[i] = vs[0];
      continue;
    }
    if (t >= ts[last]) {
      out[i] = vs[last];
      continue;
    }
    let j = 1;
    while (ts[j] < t) j++;
    const u = (t - ts[j - 1]) / (ts[j] - ts[j - 1]);
    out[i] = vs[j - 1] + (vs[j] - vs[j - 1]) * u;
  }
  return out;
}

let columnSerial = 0;

/** The shipped `ramp`, evaluated over exactly these f32 bits. */
function rampShipped(data: Float32Array, stops: Stops): Float32Array {
  // A hand-authored input hands `ramp` the column untouched — NaN payloads
  // and -0 included — which no attribute write would guarantee.
  const input = makeField<1>(`rampTestColumn(${columnSerial++})`, 1, () => ({ data, tupleSize: 1 }));
  const ctx: EvalContext = { geo: createPointCloud(data.length), domain: "point", seed: 0 };
  const { data: out } = evaluateField(ramp(input, stops), ctx);
  expect(out).toBeInstanceOf(Float32Array);
  return out as Float32Array;
}

/** A copy with every NaN rewritten to the one quiet NaN, 0x7fc00000. */
function canonicalNaNs(a: Float32Array): Float32Array {
  const out = a.slice();
  const bits = new Uint32Array(out.buffer);
  for (let k = 0; k < out.length; k++) if (Number.isNaN(out[k])) bits[k] = 0x7fc00000;
  return out;
}

/**
 * The first element whose BYTES differ, or -1 when every byte matches —
 * once every NaN is the same NaN. Bytes rather than values, because -0
 * and 0 are equal as values and must not be here. NaNs are canonical
 * because their sign and payload bits are not a promise the walk kept
 * even against itself: where both operands of an operation are NaN (a
 * one-stop ramp reads past its arrays, for one), which of them survives
 * depends on how far V8 has optimized the function, and the shipped ramp
 * and this file's copy of the walk warm up at different times.
 */
function firstByteDifference(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  const ca = canonicalNaNs(a);
  const cb = canonicalNaNs(b);
  const ba = new Uint8Array(ca.buffer);
  const bb = new Uint8Array(cb.buffer);
  for (let k = 0; k < ba.length; k++) if (ba[k] !== bb[k]) return k >> 2;
  return -1;
}

function expectSameBytes(data: Float32Array, stops: Stops, label: string): void {
  const shipped = rampShipped(data, stops);
  const reference = rampByScan(data, stops);
  const at = firstByteDifference(shipped, reference);
  expect(
    at,
    at < 0
      ? label
      : `${label}: element ${at} (input ${data[at]}) gave ${shipped[at]}, the scan gave ${reference[at]}`,
  ).toBe(-1);
}

// -- probes -------------------------------------------------------------------

const F32 = new Float32Array(1);
const U32 = new Uint32Array(F32.buffer);
const F64 = new Float64Array(1);
const U64 = new BigUint64Array(F64.buffer);

/** The next double above a finite `x`: two stops one ulp apart, which no f32 input can tell apart. */
function nextUp64(x: number): number {
  if (x === 0) return Number.MIN_VALUE;
  F64[0] = x;
  U64[0] = x > 0 ? U64[0]! + 1n : U64[0]! - 1n;
  return F64[0]!;
}

/** The f32 neighbour of `fround(x)` on the side `dir`. */
function f32Step(x: number, dir: 1 | -1): number {
  F32[0] = x;
  const v = F32[0]!;
  if (!Number.isFinite(v)) return v;
  if (v === 0) {
    U32[0] = 1;
    return dir > 0 ? F32[0]! : -F32[0]!;
  }
  if (v > 0 === dir > 0) U32[0] = U32[0]! + 1;
  else U32[0] = U32[0]! - 1;
  return F32[0]!;
}

/** Inputs no range check should get wrong, as raw f32 bits. */
const SPECIAL_BITS = [
  0x7fc00000, // NaN
  0xffc00000, // NaN, sign set
  0x7fc00001, // NaN with a payload
  0x7fa00000, // signalling NaN
  0x7f800000, // +Infinity
  0xff800000, // -Infinity
  0x00000000, // +0
  0x80000000, // -0
  0x00000001, // smallest subnormal
  0x80000001, // its negative
  0x7f7fffff, // largest finite f32
  0xff7fffff, // its negative
];

/**
 * Every stop, its two f32 neighbours and every segment's midpoint, then
 * uniform draws over the range and a little past both ends, then the
 * special bit patterns, then raw random bits (NaNs and all).
 */
function probeColumn(stops: Stops, rng: Pcg32, draws: number, rawDraws: number): Float32Array {
  const vals: number[] = [];
  const finite: number[] = [];
  for (let k = 0; k < stops.length; k++) {
    const p = stops[k]![0];
    vals.push(p, f32Step(p, 1), f32Step(p, -1));
    if (k > 0) vals.push((stops[k - 1]![0] + p) / 2);
    if (Number.isFinite(p)) finite.push(p);
  }
  const lo = finite.reduce((a, b) => Math.min(a, b), finite.length ? Infinity : -1);
  const hi = finite.reduce((a, b) => Math.max(a, b), finite.length ? -Infinity : 1);
  const span = hi > lo ? hi - lo : 1;
  for (let r = 0; r < draws; r++) vals.push(lo - 0.1 * span + rng.nextF32() * 1.2 * span);
  const out = new Float32Array(vals.length + SPECIAL_BITS.length + rawDraws);
  out.set(vals);
  const bits = new Uint32Array(out.buffer);
  for (let k = 0; k < SPECIAL_BITS.length; k++) bits[vals.length + k] = SPECIAL_BITS[k]!;
  for (let k = 0; k < rawDraws; k++) bits[vals.length + SPECIAL_BITS.length + k] = rng.nextU32();
  return out;
}

type Style = "index" | "f32" | "f64" | "wide" | "nanPositions";
const STYLES: readonly Style[] = ["index", "f32", "f64", "wide", "nanPositions"];

/**
 * A ramp the constructor accepts. Positions strictly ascend in every style
 * but the last: "index" is a per-point table, "f32" and "wide" step by
 * f32-representable and by wildly varying amounts, "f64" steps by a single
 * double ulp a quarter of the time (stops that collapse onto one f32), and
 * "nanPositions" drops NaN positions in, which pass the order check and
 * let the positions either side of them restart anywhere. Values repeat in
 * runs (the table's collapsed stretches), are -0 now and then, and are
 * sometimes large enough to cancel catastrophically when interpolated.
 */
function randomStops(rng: Pcg32, n: number, style: Style): Array<[number, number]> {
  const stops: Array<[number, number]> = [];
  let p = style === "index" ? 0 : style === "wide" ? -1e6 : (rng.nextF32() - 0.5) * 100;
  let v = 0;
  for (let i = 0; i < n; i++) {
    let pos = p;
    if (i > 0) {
      let next: number;
      switch (style) {
        case "index":
          next = i;
          break;
        case "f32":
          next = Math.fround(p + Math.fround(rng.nextF32() * 2 ** ((rng.nextU32() % 12) - 6)));
          break;
        case "f64":
          next = rng.nextU32() % 4 === 0 ? nextUp64(p) : p + rng.nextF32() * 0.01;
          break;
        case "wide":
          next = p + 2 ** ((rng.nextU32() % 60) - 30) * (1 + rng.nextF32());
          break;
        case "nanPositions":
          next = Number.isNaN(p) ? (rng.nextF32() - 0.5) * 100 : p + rng.nextF32();
          if (rng.nextU32() % 16 === 0) next = Number.NaN;
          break;
      }
      if (!Number.isNaN(next) && !Number.isNaN(p) && !(next > p)) next = nextUp64(p);
      p = next;
      pos = p;
    }
    const r = rng.nextU32() % 8;
    if (r === 3) v = -0;
    else if (r === 4) v = (rng.nextF32() - 0.5) * 1e20;
    else if (r > 4) v = (rng.nextF32() - 0.5) * 10;
    stops.push([pos, v]);
  }
  // The combinator (not the grammar) takes infinite end positions.
  if (style !== "index" && n >= 2 && rng.nextU32() % 4 === 0) stops[0]![0] = -Infinity;
  if (style !== "index" && n >= 2 && rng.nextU32() % 4 === 0) stops[n - 1]![0] = Infinity;
  return stops;
}

// -- the tests ------------------------------------------------------------------

describe("ramp: the byte comparison can fail", () => {
  it("reports a one-ulp change and a -0 against 0, and no NaN against another", () => {
    const rng = new Pcg32(11);
    const stops = randomStops(rng, 200, "f32");
    const data = probeColumn(stops, rng, 200, 50);
    const shipped = rampShipped(data, stops);
    const reference = rampByScan(data, stops);
    expect(firstByteDifference(shipped, reference)).toBe(-1);

    // The perturbed element is an interpolated one, so a value the
    // shipped lookup computed rather than copied is what gets caught.
    const k = 3 * 50 + 3; // the midpoint below stop 51
    const perturbed = reference.slice();
    const bits = new Uint32Array(perturbed.buffer);
    bits[k] = bits[k]! ^ 1;
    expect(perturbed[k]).not.toBe(reference[k]);
    expect(firstByteDifference(shipped, perturbed)).toBe(k);

    expect(firstByteDifference(new Float32Array([0]), new Float32Array([-0]))).toBe(0);
    expect(firstByteDifference(new Float32Array([1, 0]), new Float32Array([1, Number.NaN]))).toBe(1);
    // Payload and sign bits are not compared; see `firstByteDifference`.
    const nanA = new Float32Array(1);
    const nanB = new Float32Array(1);
    new Uint32Array(nanA.buffer)[0] = 0x7fc00000;
    new Uint32Array(nanB.buffer)[0] = 0xffc00001;
    expect(firstByteDifference(nanA, nanB)).toBe(-1);
  });
});

describe("ramp: the semantics the lookup keeps", () => {
  const f = Math.fround;

  it("clamps at and past both ends, including at ±Infinity; -0 is 0; NaN in is NaN out", () => {
    const stops = [
      [0, 1e20],
      [1, 1],
      [2, 5],
      [4, -3],
    ] as const;
    const data = new Float32Array([-1, 0, -0, 4, 5, Infinity, -Infinity, Number.NaN]);
    expect(Array.from(rampShipped(data, stops))).toEqual([
      f(1e20),
      f(1e20),
      f(1e20),
      -3,
      -3,
      -3,
      f(1e20),
      Number.NaN,
    ]);
  });

  it("exactly on an interior stop it answers the TOP of the segment below, not the stop's value", () => {
    // The segment is the first stop at or above `t`, so a hit on stop 1 is
    // `vs[0] + (vs[1] - vs[0]) * 1` — which cancels to 0 here, not 1. A
    // search landing on the segment above would answer `vs[1]` exactly.
    const stops = [
      [0, 1e20],
      [1, 1],
      [2, 5],
      [4, -3],
    ] as const;
    const data = new Float32Array([1, 2, 0.5, 3]);
    // Walked, and bisected: the stops past 4 change none of these inputs.
    expect(Array.from(rampShipped(data, stops))).toEqual([0, 5, f(5e19), 1]);
    expect(Array.from(rampShipped(data, lengthened(stops)))).toEqual([0, 5, f(5e19), 1]);
  });

  it("is a constant for one stop, except that NaN stays NaN", () => {
    const data = new Float32Array([-Infinity, -1, 0, 7, 7.5, Infinity, Number.NaN]);
    expect(Array.from(rampShipped(data, [[7, 42]]))).toEqual([42, 42, 42, 42, 42, 42, Number.NaN]);
  });

  it("refuses no stops, and equal or descending positions — so there is no step to keep", () => {
    const x = index();
    expect(() => ramp(x, [])).toThrow(/at least one/);
    expect(() =>
      ramp(x, [
        [1, 0],
        [1, 2],
      ]),
    ).toThrow(/ascending/);
    // -0 and 0 are the same position.
    expect(() =>
      ramp(x, [
        [-0, 0],
        [0, 2],
      ]),
    ).toThrow(/ascending/);
    expect(() =>
      ramp(x, [
        [2, 0],
        [1, 2],
      ]),
    ).toThrow(/ascending/);
    // The grammar refuses an unordered list through the same constructor.
    expect(() =>
      fieldFromJson({
        fn: "ramp",
        args: [{ fn: "index" }],
        stops: [
          [1, 0],
          [1, 2],
        ],
      } as FieldSpec),
    ).toThrow(/ascending/);
  });

  it("takes infinite end positions (the combinator does; the grammar does not)", () => {
    const stops = [
      [-Infinity, 0],
      [0, 1],
      [Infinity, 2],
    ] as const;
    const data = new Float32Array([-Infinity, -5, 0, 5, 30, Infinity]);
    // (-5 - -Inf) / (0 - -Inf) is Inf / Inf: NaN — and so is 0, which sits
    // exactly on the interior stop and so takes the segment BELOW it.
    // (30 - 0) / (Inf - 0) is 0, so everything above 0 is 1.
    const expected = [0, Number.NaN, Number.NaN, 1, 1, 2];
    expect(Array.from(rampShipped(data, stops))).toEqual(expected);
    // Bisected: twenty more stops between 0 and +Infinity, all at 1.
    const long: Array<readonly [number, number]> = [stops[0], stops[1]];
    for (let k = 1; k <= 20; k++) long.push([k, 1]);
    long.push(stops[2]);
    expect(Array.from(rampShipped(data, long))).toEqual(expected);
  });

  it("lets a NaN position past the order check, and evaluates it exactly as the scan did", () => {
    // Every comparison with NaN is false, so neither neighbour is compared
    // with the other and the positions are not in order at all: a search
    // that assumes order would find a different segment. The scan stops at
    // the NaN, so everything strictly inside the ends interpolates against
    // it and is NaN.
    const stops = [
      [0, 0],
      [Number.NaN, 10],
      [-5, 20],
      [3, 30],
    ] as const;
    const data = new Float32Array([-10, 0, 1, -3, 2.5, 3, 9]);
    expect(Array.from(rampShipped(data, stops))).toEqual([
      0,
      0,
      Number.NaN,
      0,
      Number.NaN,
      30,
      30,
    ]);
    expectSameBytes(data, stops, "NaN position");
    // Long enough to bisect, were the NaN not there to stop it.
    const long = lengthened(stops);
    expect(Array.from(rampShipped(data, long)).slice(2, 5)).toEqual([Number.NaN, 0, Number.NaN]);
    expectSameBytes(data, long, "NaN position, long");
  });

  it("does the same for positions that are not numbers, which only an untyped caller can pass", () => {
    // A hole reads as undefined, which compares false both ways just as
    // NaN does — and `every` would skip it where a loop does not.
    const sparse: Array<readonly [number, number]> = new Array(24);
    sparse[0] = [0, 0];
    for (let k = 2; k < 24; k++) sparse[k] = [k, k % 5];
    expect(1 in sparse).toBe(false);
    const strings = lengthened([
      [0, 0],
      ["1e3", 1],
      ["2", 2],
      [3, 4],
    ] as unknown as Stops);
    const data = new Float32Array([-1, 0.5, 2, 2.5, 3, 4, 12.5, 23, 30]);
    expect(Array.from(rampShipped(data, sparse))).toEqual([0, NaN, NaN, NaN, NaN, NaN, NaN, 3, 3]);
    expectSameBytes(data, sparse, "a hole");
    expectSameBytes(data, strings, "string positions");
    expectSameBytes(probeColumn(strings, new Pcg32(5), 256, 0), strings, "string positions, probed");
  });

  it("keeps its key", () => {
    // The cache identity is part of the contract; the search is not in it.
    expect(
      ramp(index(), [
        [0, 0],
        [0.5, 1],
        [2, -2],
      ]).key,
    ).toBe("ramp(5#index;0:0,0.5:1,2:-2)");
  });
});

describe("ramp: byte-identical to the scan", () => {
  it("over hand-picked edges", () => {
    const rng = new Pcg32(3);
    const cases: Array<[string, Stops]> = [
      ["one stop", [[0.5, -0]]],
      ["one stop at -0", [[-0, 3]]],
      ["one stop at +Infinity", [[Infinity, 3]]],
      [
        "two stops",
        [
          [-1, 2],
          [1, -2],
        ],
      ],
      [
        "-0 values",
        [
          [0, -0],
          [1, -0],
          [2, 0],
        ],
      ],
      [
        "a -0 position",
        [
          [-0, 1],
          [1, 2],
        ],
      ],
      [
        "stops one double ulp apart",
        [
          [1, 0],
          [nextUp64(1), 10],
          [nextUp64(nextUp64(1)), 20],
          [2, 30],
        ],
      ],
      [
        "infinite ends",
        [
          [-Infinity, 0],
          [0, 1],
          [Infinity, 2],
        ],
      ],
      [
        "cancellation on a stop",
        [
          [0, 1e20],
          [1, 1],
          [2, 5],
          [4, -3],
        ],
      ],
      [
        "subnormal positions",
        [
          [-Number.MIN_VALUE, 1],
          [0, 2],
          [Number.MIN_VALUE, 3],
          [f32Step(0, 1), 4],
        ],
      ],
      [
        "NaN first position",
        [
          [Number.NaN, 1],
          [0, 2],
          [1, 3],
        ],
      ],
      [
        "NaN last position",
        [
          [0, 1],
          [1, 2],
          [Number.NaN, 3],
        ],
      ],
      [
        "NaN positions, out of order",
        [
          [5, 1],
          [Number.NaN, 2],
          [-5, 3],
          [Number.NaN, 4],
          [2, 5],
          [7, 6],
        ],
      ],
    ];
    for (const [label, stops] of cases) {
      expectSameBytes(probeColumn(stops, rng, 64, 64), stops, label);
      const long = lengthened(stops);
      expectSameBytes(probeColumn(long, rng, 64, 64), long, `${label}, long`);
    }
  });

  it("over seeded random ramps of 1 to 5000 stops", () => {
    const rng = new Pcg32(20260919);
    const sizes = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256, 257,
      1023, 1024, 1025, 2047, 2048, 2049, 4095, 4096, 4097, 5000,
    ];
    for (let r = 0; r < 16; r++) sizes.push(1 + (rng.nextU32() % 5000));
    let ramps = 0;
    for (let s = 0; s < sizes.length; s++) {
      const n = sizes[s]!;
      // Every style at the small sizes, where the cases are cheap and the
      // boundaries of the search are close together; one style per size
      // above that, rotating.
      const styles = n <= 64 ? STYLES : [STYLES[s % STYLES.length]!];
      for (const style of styles) {
        const stops = randomStops(rng, n, style);
        const data = probeColumn(stops, rng, Math.max(64, n), 256);
        expectSameBytes(data, stops, `${style}, ${n} stops`);
        ramps++;
      }
    }
    expect(ramps).toBeGreaterThan(100);
  });

  it("through the grammar, as a per-point table over index()", () => {
    // The shape that made the scan quadratic: one stop per point, runs of
    // equal values collapsed to their two ends.
    const rng = new Pcg32(1889);
    const n = 5000;
    const values: number[] = [];
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (rng.nextU32() % 3 === 0) v = (rng.nextF32() - 0.5) * 100;
      values.push(v);
    }
    const stops: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1 || values[i] !== values[i - 1] || values[i] !== values[i + 1]) {
        stops.push([i, values[i]!]);
      }
    }
    const field = fieldFromJson({ fn: "ramp", args: [{ fn: "index" }], stops } as FieldSpec);
    const got = evaluateField(field, { geo: createPointCloud(n), domain: "point", seed: 0 });
    const indices = new Uint32Array(n).map((_, i) => i);
    const reference = rampByScan(indices, stops);
    const { data: gotData } = got;
    expect(firstByteDifference(gotData as Float32Array, reference)).toBe(-1);
    // Exact at every integer, which is what the table is for.
    expect(Array.from(got.data)).toEqual(values.map(Math.fround));
  });
});

describe("ramp: the search is logarithmic, counted rather than timed", () => {
  /**
   * How many stops the shipped ramp compares each input with, one input
   * in the middle of every segment. The inputs are objects whose `valueOf`
   * counts, so this is the real loop, unchanged, counting its own reads:
   * an input strictly inside the stops is read twice by the two clamps
   * and once by the interpolation, and every other read is a probe of the
   * search. (It relies on the loop comparing `t` as it reads it; a loop
   * that converted `t` to a number first would count 1 and fail here.)
   */
  function probes(n: number): number[] {
    const stops = Array.from({ length: n }, (_, k) => [k, k % 7] as const);
    const counts = new Array<number>(n - 1).fill(0);
    const column = counts.map((_, k) => ({
      valueOf: () => {
        counts[k] = counts[k]! + 1;
        return k + 0.5;
      },
    }));
    const input = makeField<1>(`rampProbeColumn(${columnSerial++})`, 1, () => ({
      data: column as unknown as Float32Array,
      tupleSize: 1,
    }));
    evaluateField(ramp(input, stops), { geo: createPointCloud(n - 1), domain: "point", seed: 0 });
    return counts.map((c) => c - 3);
  }

  it("walks up to 16 stops: the input in segment j costs j probes", () => {
    for (const n of [2, 3, 16]) {
      expect(probes(n), `${n} stops`).toEqual(Array.from({ length: n - 1 }, (_, k) => k + 1));
    }
  });

  it("bisects from 17 stops on: at most ceil(log2 n) + 1 probes an input", () => {
    for (const n of [17, 1024, 65536]) {
      const p = probes(n);
      const most = p.reduce((a, b) => Math.max(a, b), 0);
      const least = p.reduce((a, b) => Math.min(a, b), Infinity);
      expect(most, `${n} stops`).toBeLessThanOrEqual(Math.ceil(Math.log2(n)) + 1);
      expect(least, `${n} stops`).toBeGreaterThan(0);
    }
  });
});
