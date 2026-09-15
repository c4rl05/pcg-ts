/**
 * The zlib encoder, checked against the reference decoder: whatever it
 * emits must inflate back to the input byte for byte, and the stream's own
 * Adler-32 must be the one `inflateSync` verifies.
 */
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { adler32, zlibDeflate } from "./deflate.js";

/** Deterministic bytes: a 32-bit LCG, high byte of each step. */
function lcgBytes(n: number, seed: number): Uint8Array {
  const out = new Uint8Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s >>> 24;
  }
  return out;
}

function roundTrip(data: Uint8Array): Uint8Array {
  const packed = zlibDeflate(data);
  const unpacked = new Uint8Array(inflateSync(packed));
  expect(unpacked.length).toBe(data.length);
  expect(Buffer.from(unpacked).equals(Buffer.from(data))).toBe(true);
  return packed;
}

describe("zlibDeflate", () => {
  it("round-trips the empty input and inputs shorter than a match", () => {
    for (const n of [0, 1, 2, 3, 4]) roundTrip(lcgBytes(n, n + 1));
  });

  it("round-trips random bytes", () => {
    for (const [n, seed] of [
      [1000, 7],
      [70000, 11],
      [200001, 12345],
    ] as const) {
      roundTrip(lcgBytes(n, seed));
    }
  });

  it("round-trips a constant buffer, and compresses it hard", () => {
    const data = new Uint8Array(500000).fill(0xab);
    const packed = roundTrip(data);
    expect(packed.length).toBeLessThan(data.length / 50);
  });

  it("round-trips runs at and around the longest match, 258", () => {
    for (const run of [257, 258, 259, 516, 517, 3 * 258 + 1]) {
      const data = new Uint8Array(run + 20);
      data.fill(9, 10, 10 + run);
      data.set(lcgBytes(10, run), 0);
      data.set(lcgBytes(10, run + 1), 10 + run);
      roundTrip(data);
    }
  });

  it("round-trips matches at the far edge of the 32K window", () => {
    const block = lcgBytes(600, 99);
    const data = new Uint8Array(32768 + 1200);
    data.set(block, 0);
    data.set(lcgBytes(32168, 5), 600);
    data.set(block, 32768);
    data.set(block, 32768 + 600);
    roundTrip(data);
  });

  it("round-trips incompressible input without growing it by more than the fixed-code bound", () => {
    const data = lcgBytes(100000, 424242);
    const packed = roundTrip(data);
    // Fixed codes spend at most 9 bits on a literal.
    expect(packed.length).toBeLessThanOrEqual(Math.ceil((data.length * 9) / 8) + 16);
  });

  it("round-trips a framebuffer-shaped input: rows of a few colours after the Sub filter", () => {
    const w = 640;
    const h = 120;
    const data = new Uint8Array(h * (w * 3 + 1));
    for (let y = 0; y < h; y++) {
      const row = y * (w * 3 + 1);
      data[row] = 1;
      for (let x = 0; x < 30; x++) data[row + 1 + ((x * 37 + y * 11) % (w * 3))] = (x * 29) & 255;
    }
    roundTrip(data);
  });

  it("is a pure function of its input", () => {
    const data = lcgBytes(50000, 3);
    expect(Buffer.from(zlibDeflate(data)).equals(Buffer.from(zlibDeflate(data.slice())))).toBe(true);
  });
});

describe("adler32", () => {
  it("matches the RFC 1950 definition, including across the 5552-byte chunking", () => {
    const reference = (data: Uint8Array): number => {
      let a = 1;
      let b = 0;
      for (const byte of data) {
        a = (a + byte) % 65521;
        b = (b + a) % 65521;
      }
      return ((b << 16) | a) >>> 0;
    };
    expect(adler32(new TextEncoder().encode("Wikipedia"))).toBe(0x11e60398);
    for (const n of [0, 1, 5551, 5552, 5553, 20000]) {
      const data = lcgBytes(n, n);
      expect(adler32(data)).toBe(reference(data));
    }
    const ones = new Uint8Array(70000).fill(255);
    expect(adler32(ones)).toBe(reference(ones));
  });
});
