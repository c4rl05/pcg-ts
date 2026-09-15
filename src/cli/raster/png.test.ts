/**
 * The PNG container: chunk layout, CRCs recomputed independently, and the
 * pixels decoded back (inflate + Sub unfilter) equal to the framebuffer.
 */
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { crc32, encodePng, pixelHash } from "./png.js";

/** Bitwise CRC-32, no table: a second implementation to check the first against. */
function slowCrc(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Chunk {
  readonly type: string;
  readonly body: Uint8Array;
  readonly crc: number;
  readonly crcOver: Uint8Array;
}

function chunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: Chunk[] = [];
  let at = 8;
  while (at < png.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    out.push({
      type,
      body: png.subarray(at + 8, at + 8 + len),
      crc: view.getUint32(at + 8 + len),
      crcOver: png.subarray(at + 4, at + 8 + len),
    });
    at += 12 + len;
  }
  expect(at).toBe(png.length);
  return out;
}

/** Decode an 8-bit RGB PNG with filter 0/1 rows back to its pixels. */
function decode(png: Uint8Array): { width: number; height: number; rgb: Uint8Array } {
  const list = chunks(png);
  const ihdr = new DataView(list[0].body.buffer, list[0].body.byteOffset, 13);
  const width = ihdr.getUint32(0);
  const height = ihdr.getUint32(4);
  const raw = new Uint8Array(inflateSync(Buffer.concat(list.filter((c) => c.type === "IDAT").map((c) => c.body))));
  const stride = width * 3;
  expect(raw.length).toBe(height * (stride + 1));
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    expect(filter).toBe(1);
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? rgb[y * stride + x - 3] : 0;
      rgb[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + left) & 255;
    }
  }
  return { width, height, rgb };
}

function testImage(width: number, height: number): Uint8Array {
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 3;
      rgb[o] = (x * 7) & 255;
      rgb[o + 1] = (y * 13) & 255;
      rgb[o + 2] = (x ^ y) & 255;
    }
  }
  return rgb;
}

describe("encodePng", () => {
  it("writes the signature, then IHDR, one IDAT and IEND with valid CRCs", () => {
    const png = encodePng(testImage(37, 23), 37, 23);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const list = chunks(png);
    // No tEXt, tIME or anything else a timestamp or a version could hide in.
    expect(list.map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    for (const chunk of list) {
      expect(chunk.crc).toBe(slowCrc(chunk.crcOver));
      expect(crc32(chunk.crcOver)).toBe(chunk.crc);
    }
    expect([...list[0].body]).toEqual([0, 0, 0, 37, 0, 0, 0, 23, 8, 2, 0, 0, 0]);
    expect(list[2].body.length).toBe(0);
  });

  it("decodes back to exactly the framebuffer it was given", () => {
    for (const [w, h] of [
      [1, 1],
      [2, 3],
      [37, 23],
      [640, 480],
    ] as const) {
      const rgb = testImage(w, h);
      const decoded = decode(encodePng(rgb, w, h));
      expect(decoded.width).toBe(w);
      expect(decoded.height).toBe(h);
      expect(Buffer.from(decoded.rgb).equals(Buffer.from(rgb))).toBe(true);
    }
  });

  it("refuses a buffer that is not width x height RGB", () => {
    expect(() => encodePng(new Uint8Array(10), 2, 2)).toThrow(/not 2x2 RGB \(12\)/);
  });

  it("detects a flipped bit: the CRC check can fail", () => {
    const png = encodePng(testImage(8, 8), 8, 8);
    const idat = chunks(png)[1];
    const corrupt = idat.crcOver.slice();
    corrupt[corrupt.length - 1] ^= 1;
    expect(slowCrc(corrupt)).not.toBe(idat.crc);
  });
});

describe("pixelHash", () => {
  it("is 16 hex, moves with one byte, and moves with the size alone", () => {
    const rgb = testImage(16, 16);
    const a = pixelHash(rgb, 16, 16);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    const b = rgb.slice();
    b[100] ^= 1;
    expect(pixelHash(b, 16, 16)).not.toBe(a);
    expect(pixelHash(rgb, 8, 32)).not.toBe(a);
    expect(pixelHash(rgb.slice(), 16, 16)).toBe(a);
  });
});
