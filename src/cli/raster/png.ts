/**
 * PNG encoding for the frames: signature, IHDR (8-bit RGB), one IDAT, IEND.
 *
 * Nothing else — no tEXt, no tIME, no version or software chunk — because
 * the file is a pure function of its pixels, and a timestamp or a version
 * string would make two identical frames differ. Every row uses filter
 * type 1 (Sub): fixed, so the choice is not a heuristic that could change,
 * and it turns a run of flat colour into a run of zeros for the LZ77 pass.
 */
import { zlibDeflate } from "./deflate.js";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (ISO 3309, as PNG uses it) of `data[start, end)`. */
export function crc32(data: Uint8Array, start = 0, end = data.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ data[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeU32(out: Uint8Array, at: number, value: number): void {
  out[at] = (value >>> 24) & 255;
  out[at + 1] = (value >>> 16) & 255;
  out[at + 2] = (value >>> 8) & 255;
  out[at + 3] = value & 255;
}

/** Encode `width × height` RGB bytes, row-major from the top-left, as a PNG file. */
export function encodePng(rgb: Uint8Array, width: number, height: number): Uint8Array {
  if (rgb.length !== width * height * 3) {
    throw new Error(`encodePng: ${rgb.length} bytes is not ${width}x${height} RGB (${width * height * 3})`);
  }
  const stride = width * 3;
  const filtered = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    const src = y * stride;
    filtered[row] = 1; // Sub
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? rgb[src + x - 3] : 0;
      filtered[row + 1 + x] = (rgb[src + x] - left) & 255;
    }
  }
  const idat = zlibDeflate(filtered);

  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering (filter method 0)
  ihdr[12] = 0; // no interlace

  const chunks: readonly [string, Uint8Array][] = [
    ["IHDR", ihdr],
    ["IDAT", idat],
    ["IEND", new Uint8Array(0)],
  ];
  let size = SIGNATURE.length;
  for (const [, body] of chunks) size += 12 + body.length;
  const out = new Uint8Array(size);
  out.set(SIGNATURE, 0);
  let at = SIGNATURE.length;
  for (const [type, body] of chunks) {
    writeU32(out, at, body.length);
    for (let k = 0; k < 4; k++) out[at + 4 + k] = type.charCodeAt(k);
    out.set(body, at + 8);
    writeU32(out, at + 8 + body.length, crc32(out, at + 4, at + 8 + body.length));
    at += 12 + body.length;
  }
  return out;
}

/**
 * A 16-hex digest of an image's pixels and size: CRC-32 and FNV-1a over
 * the same bytes. Not cryptographic — an identity for "did the picture
 * change", reported beside the file so two runs compare without decoding.
 */
export function pixelHash(rgb: Uint8Array, width: number, height: number): string {
  const dims = new Uint8Array(8);
  writeU32(dims, 0, width);
  writeU32(dims, 4, height);
  let fnv = 0x811c9dc5;
  const mix = (byte: number): void => {
    fnv ^= byte;
    // × 16777619 (the FNV prime) as shifts and adds, mod 2^32.
    fnv = (fnv + (fnv << 1) + (fnv << 4) + (fnv << 7) + (fnv << 8) + (fnv << 24)) >>> 0;
  };
  for (let i = 0; i < 8; i++) mix(dims[i]);
  for (let i = 0; i < rgb.length; i++) mix(rgb[i]);
  let c = 0xffffffff;
  for (let i = 0; i < 8; i++) c = CRC_TABLE[(c ^ dims[i]) & 255] ^ (c >>> 8);
  for (let i = 0; i < rgb.length; i++) c = CRC_TABLE[(c ^ rgb[i]) & 255] ^ (c >>> 8);
  const crc = (c ^ 0xffffffff) >>> 0;
  return crc.toString(16).padStart(8, "0") + fnv.toString(16).padStart(8, "0");
}
