/**
 * A zlib stream (RFC 1950) around one fixed-Huffman DEFLATE block (RFC
 * 1951), with greedy LZ77 over a 3-byte hash and a fixed chain limit.
 *
 * Not `node:zlib`: its bytes are whatever the bundled zlib build emits,
 * which no one promises stays the same across Node versions, and it would
 * make the frames Node-only. This encoder's output is a pure function of
 * its input — every choice below (the hash, the chain limit, the "too far
 * for a 3-byte match" rule, one block) is fixed — so the PNG bytes can be
 * pinned by a test. It compresses worse than zlib's dynamic trees; frames
 * are mostly flat colour, which LZ77 alone handles well.
 */

const WINDOW = 32768;
const WINDOW_MASK = WINDOW - 1;
const HASH_SIZE = 1 << 15;
const HASH_MASK = HASH_SIZE - 1;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
/** Candidates examined per position. Fixed: it is part of the output's definition. */
const CHAIN_LIMIT = 48;
/** A 3-byte match farther back than this costs more bits than three literals. */
const TOO_FAR = 4096;

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163,
  195, 227, 258,
];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073,
  4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

function reverseBits(code: number, bits: number): number {
  let out = 0;
  for (let i = 0; i < bits; i++) {
    out = (out << 1) | ((code >> i) & 1);
  }
  return out;
}

/** Fixed literal/length codes (RFC 1951 3.2.6), bit-reversed for an LSB-first writer. */
const LIT_CODE = new Uint16Array(288);
const LIT_BITS = new Uint8Array(288);
for (let sym = 0; sym < 288; sym++) {
  let code: number;
  let bits: number;
  if (sym < 144) {
    code = 0x30 + sym;
    bits = 8;
  } else if (sym < 256) {
    code = 0x190 + (sym - 144);
    bits = 9;
  } else if (sym < 280) {
    code = sym - 256;
    bits = 7;
  } else {
    code = 0xc0 + (sym - 280);
    bits = 8;
  }
  LIT_CODE[sym] = reverseBits(code, bits);
  LIT_BITS[sym] = bits;
}
const DIST_CODE = new Uint8Array(30);
for (let d = 0; d < 30; d++) DIST_CODE[d] = reverseBits(d, 5);

/** Length 3..258 -> index into LENGTH_BASE. */
const LENGTH_INDEX = new Uint8Array(MAX_MATCH + 1);
for (let i = 0; i < LENGTH_BASE.length; i++) {
  const end = i + 1 < LENGTH_BASE.length ? LENGTH_BASE[i + 1] : MAX_MATCH + 1;
  for (let len = LENGTH_BASE[i]; len < end; len++) LENGTH_INDEX[len] = i;
}
// 258 has its own code with no extra bits, not code 284 + 31.
LENGTH_INDEX[MAX_MATCH] = LENGTH_BASE.length - 1;

function distIndex(dist: number): number {
  let lo = 0;
  let hi = DIST_BASE.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (DIST_BASE[mid] <= dist) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Least-significant-bit-first writer into a growing byte buffer. */
class BitWriter {
  buf: Uint8Array;
  pos = 0;
  private bits = 0;
  private count = 0;

  constructor(capacity: number) {
    this.buf = new Uint8Array(capacity);
  }

  private ensure(extra: number): void {
    if (this.pos + extra <= this.buf.length) return;
    const next = new Uint8Array((this.buf.length + extra) * 2);
    next.set(this.buf.subarray(0, this.pos));
    this.buf = next;
  }

  /** Append `n` (<= 16) bits of `value`, low bit first. */
  write(value: number, n: number): void {
    this.bits |= value << this.count;
    this.count += n;
    this.ensure(4);
    while (this.count >= 8) {
      this.buf[this.pos++] = this.bits & 255;
      this.bits >>>= 8;
      this.count -= 8;
    }
  }

  byte(value: number): void {
    this.ensure(1);
    this.buf[this.pos++] = value & 255;
  }

  /** Pad to a byte boundary with zero bits. */
  align(): void {
    if (this.count > 0) this.write(0, 8 - this.count);
  }

  bytes(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }
}

/** Adler-32 of `data` (RFC 1950). */
export function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  const n = data.length;
  let i = 0;
  while (i < n) {
    // 5552 bytes is the most that cannot overflow 2^53 before the modulo;
    // far below it here, it simply keeps the sums small.
    const end = i + 5552 < n ? i + 5552 : n;
    for (; i < end; i++) {
      a += data[i];
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Compress `data` into a complete zlib stream. */
export function zlibDeflate(data: Uint8Array): Uint8Array {
  const n = data.length;
  const out = new BitWriter(n + (n >> 3) + 64);
  // CMF 0x78: deflate, 32K window. FLG 0x01: no dictionary, level 0 hint,
  // and (0x78 << 8 | 0x01) % 31 === 0 as the header check requires.
  out.byte(0x78);
  out.byte(0x01);
  // One final block, fixed Huffman.
  out.write(1, 1);
  out.write(1, 2);

  const head = new Int32Array(HASH_SIZE).fill(-1);
  const prev = new Int32Array(WINDOW).fill(-1);
  const hashAt = (i: number): number =>
    ((data[i] << 10) ^ (data[i + 1] << 5) ^ data[i + 2]) & HASH_MASK;
  const insert = (i: number): void => {
    if (i + MIN_MATCH > n) return;
    const h = hashAt(i);
    prev[i & WINDOW_MASK] = head[h];
    head[h] = i;
  };

  let i = 0;
  while (i < n) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + MIN_MATCH <= n) {
      const limit = n - i < MAX_MATCH ? n - i : MAX_MATCH;
      let candidate = head[hashAt(i)];
      let chain = 0;
      while (candidate >= 0 && i - candidate <= WINDOW && chain < CHAIN_LIMIT) {
        chain++;
        if (data[candidate + bestLen] === data[i + bestLen]) {
          let len = 0;
          while (len < limit && data[candidate + len] === data[i + len]) len++;
          if (len > bestLen) {
            bestLen = len;
            bestDist = i - candidate;
            if (len === limit) break;
          }
        }
        const next = prev[candidate & WINDOW_MASK];
        // The ring slot can have been reused by a newer position; a chain
        // only ever walks backwards.
        if (next >= candidate) break;
        candidate = next;
      }
    }
    if (bestLen > MIN_MATCH || (bestLen === MIN_MATCH && bestDist <= TOO_FAR)) {
      const li = LENGTH_INDEX[bestLen];
      const sym = 257 + li;
      out.write(LIT_CODE[sym], LIT_BITS[sym]);
      if (LENGTH_EXTRA[li] > 0) out.write(bestLen - LENGTH_BASE[li], LENGTH_EXTRA[li]);
      const di = distIndex(bestDist);
      out.write(DIST_CODE[di], 5);
      if (DIST_EXTRA[di] > 0) out.write(bestDist - DIST_BASE[di], DIST_EXTRA[di]);
      for (let k = 0; k < bestLen; k++) insert(i + k);
      i += bestLen;
    } else {
      out.write(LIT_CODE[data[i]], LIT_BITS[data[i]]);
      insert(i);
      i++;
    }
  }
  out.write(LIT_CODE[256], LIT_BITS[256]);
  out.align();
  const check = adler32(data);
  out.byte(check >>> 24);
  out.byte(check >>> 16);
  out.byte(check >>> 8);
  out.byte(check);
  return out.bytes();
}
