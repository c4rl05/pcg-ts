/**
 * What "a cell is exactly the whole cook inside it" is checked with
 * (tests/eiffelBands.test.ts): every mesh primitive and every instance of
 * an output reduced to a hash of ALL its bytes — each of its vertices'
 * point attributes in vertex order, its vertex and primitive attributes,
 * an instance's 16 transform floats and every per-instance channel — and
 * compared as sorted multisets. Order is not compared: a cell's arrays
 * come out in a different order from the whole cook's (region.ts), and
 * the page draws a set.
 */
import type { Attribute, DataCollection, Geometry, InstancesItem } from "pcg-ts";

/** An axis-aligned box, [min, max) per axis. */
export interface Box {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

const inBox = (b: Box, x: number, y: number, z: number): boolean =>
  x >= b.min[0] && x < b.max[0] && y >= b.min[1] && y < b.max[1] && z >= b.min[2] && z < b.max[2];

/** Two FNV-1a lanes over 32-bit words, folded into one exact double (53 bits). */
class Hasher {
  private a = 0x811c9dc5;
  private b = 0x01000193 ^ 0x5bd1e995;
  word(w: number): void {
    this.a = Math.imul(this.a ^ w, 0x01000193) >>> 0;
    this.b = Math.imul(this.b ^ w, 0x5bd1e995) >>> 0;
    this.b = (this.b ^ (this.b >>> 15)) >>> 0;
  }
  words(v: Uint32Array, from: number, count: number): void {
    for (let k = 0; k < count; k++) this.word(v[from + k] as number);
  }
  done(): number {
    return (this.a & 0x1fffff) * 4294967296 + this.b;
  }
}

/** A column as 32-bit words per tuple (f64 columns as two words a component). */
function wordsOf(a: Attribute): { v: Uint32Array; per: number } {
  const d = a.data as unknown as ArrayLike<number> & { buffer: ArrayBuffer; byteOffset: number; length: number; BYTES_PER_ELEMENT: number };
  if (d.BYTES_PER_ELEMENT === 4) return { v: new Uint32Array(d.buffer, d.byteOffset, d.length), per: a.tupleSize };
  if (d.BYTES_PER_ELEMENT === 8) return { v: new Uint32Array(d.buffer, d.byteOffset, d.length * 2), per: a.tupleSize * 2 };
  // Narrower columns: widen value by value.
  const v = new Uint32Array(d.length);
  for (let k = 0; k < d.length; k++) v[k] = (d[k] as number) >>> 0;
  return { v, per: a.tupleSize };
}

function columns(set: Iterable<Attribute>): Array<{ v: Uint32Array; per: number; name: string }> {
  return [...set]
    .map((a) => ({ ...wordsOf(a), name: a.name }))
    .sort((p, q) => (p.name < q.name ? -1 : p.name > q.name ? 1 : 0));
}

/**
 * Every primitive of `geo` as the hash of its bytes, keeping only those
 * `keep` accepts; sorted.
 */
export function primitiveHashes(geo: Geometry, keep?: (geo: Geometry, p: number) => boolean): Float64Array {
  const pts = columns(geo.attrs.point);
  const vtx = columns(geo.attrs.vertex);
  const prm = columns(geo.attrs.primitive);
  const out: number[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    if (keep !== undefined && !keep(geo, p)) continue;
    const h = new Hasher();
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    h.word(count);
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      for (const c of pts) h.words(c.v, i * c.per, c.per);
      for (const c of vtx) h.words(c.v, v * c.per, c.per);
    }
    for (const c of prm) h.words(c.v, p * c.per, c.per);
    out.push(h.done());
  }
  return Float64Array.from(out).sort();
}

/** Does primitive `p` of `geo` have any vertex in `box`? (region.ts' mesh clip) */
export function anyVertexIn(box: Box): (geo: Geometry, p: number) => boolean {
  return (geo, p) => {
    const P = geo.attrs.point.get("P")?.data as ArrayLike<number>;
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      if (inBox(box, P[3 * i] as number, P[3 * i + 1] as number, P[3 * i + 2] as number)) return true;
    }
    return false;
  };
}

/**
 * Does primitive `p`'s bounding box meet `box` grown by `eps` on every side
 * (region.ts' mesh clip, `gateMesh`)? A negative `eps` shrinks the box: the
 * clip is evaluated in f32 fields, so the test brackets it between the two.
 */
export function boxMeets(box: Box, eps: number): (geo: Geometry, p: number) => boolean {
  return (geo, p) => {
    const P = geo.attrs.point.get("P")?.data as ArrayLike<number>;
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    for (let axis = 0; axis < 3; axis++) {
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      for (let v = start; v < start + count; v++) {
        const c = P[3 * (geo.vertexToPoint[v] as number) + axis] as number;
        if (c < lo) lo = c;
        if (c > hi) hi = c;
      }
      if (!(hi >= box.min[axis]! - eps && lo < box.max[axis]! + eps)) return false;
    }
    return true;
  };
}

/** Every primitive of every geometry item of an output, hashed and sorted. */
export function meshHashes(list: DataCollection, keep?: (geo: Geometry, p: number) => boolean): Float64Array {
  const parts: Float64Array[] = [];
  for (const item of list) if (item.kind === "geometry") parts.push(primitiveHashes(item.geo, keep));
  return concatSorted(parts);
}

/**
 * Every instance of an instances output as the hash of its transform and
 * its per-instance channels, keeping those whose seat (translation) `keep`
 * accepts; sorted.
 */
export function instanceHashes(list: DataCollection, keep?: (x: number, y: number, z: number) => boolean): Float64Array {
  const parts: Float64Array[] = [];
  for (const item of list) {
    if (item.kind !== "instances") continue;
    for (const b of (item as InstancesItem).batches) {
      const t = new Uint32Array(b.transforms.buffer, b.transforms.byteOffset, b.transforms.length);
      const chans = Object.keys(b.attributes ?? {})
        .sort()
        .map((name) => {
          const d = (b.attributes ?? {})[name] as unknown as { buffer: ArrayBuffer; byteOffset: number; length: number };
          return new Uint32Array(d.buffer, d.byteOffset, d.length);
        });
      const out: number[] = [];
      for (let k = 0; k < b.count; k++) {
        const m = b.transforms;
        if (keep !== undefined && !keep(m[16 * k + 12] as number, m[16 * k + 13] as number, m[16 * k + 14] as number)) continue;
        const h = new Hasher();
        h.word(b.assetId.length);
        h.words(t, 16 * k, 16);
        for (const c of chans) {
          const per = c.length / b.count;
          h.words(c, k * per, per);
        }
        out.push(h.done());
      }
      parts.push(Float64Array.from(out));
    }
  }
  return concatSorted(parts);
}

/** Seated in `box` (half-open): region.ts' rivet clip. */
export const seatedIn =
  (box: Box) =>
  (x: number, y: number, z: number): boolean =>
    inBox(box, x, y, z);

function concatSorted(parts: Float64Array[]): Float64Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Float64Array(n);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out.sort();
}

/** Merge sorted multisets. */
export function unionSorted(parts: readonly Float64Array[]): Float64Array {
  return concatSorted([...parts]);
}

/** Sorted multiset difference sizes: how many of `a` are missing from `b` and the other way round. */
export function diffSorted(a: Float64Array, b: Float64Array): { missing: number; extra: number } {
  let i = 0;
  let j = 0;
  let missing = 0;
  let extra = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if ((a[i] as number) < (b[j] as number)) {
      missing++;
      i++;
    } else {
      extra++;
      j++;
    }
  }
  return { missing: missing + (a.length - i), extra: extra + (b.length - j) };
}

/** Sorted unique values (a set, not a multiset). */
export function uniqueSorted(a: Float64Array): Float64Array {
  const out: number[] = [];
  for (let k = 0; k < a.length; k++) if (k === 0 || a[k] !== a[k - 1]) out.push(a[k] as number);
  return Float64Array.from(out);
}
