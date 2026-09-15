// The scorer's own determinism digest.
//
// Computed over the cooked collections exactly as the package under test
// hands them back: every attribute column on every domain, the topology
// arrays, and every instance batch. It deliberately reads only structure
// the 0.17.0 baseline already exposes (`item.kind`, `item.geo.attrs`,
// `vertexToPoint` / `primVertexStart` / `primVertexCount`, `batch.transforms`,
// `batch.colors`, `batch.attributes`), and it never calls anything the
// package ships for fingerprinting: those formats belong to the arms being
// compared, so the ruler must not move with them.
//
// Floats are hashed as their bytes, so the digest is byte-exact — the
// library's determinism promise is "byte-identical on the same path", and a
// digest over rounded values would pass graphs that break it.

import { createHash } from "node:crypto";

const DOMAIN_ORDER = ["detail", "point", "vertex", "primitive"];

function feedString(h, s) {
  const b = Buffer.from(String(s), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length, 0);
  h.update(len);
  h.update(b);
}

function feedNumber(h, n) {
  const b = Buffer.alloc(8);
  b.writeDoubleLE(Number(n), 0);
  h.update(b);
}

function feedTyped(h, arr, length) {
  if (arr === undefined || arr === null) {
    feedString(h, "<none>");
    return;
  }
  const n = length === undefined ? arr.length : Math.min(length, arr.length);
  feedString(h, arr.constructor?.name ?? "array");
  feedNumber(h, n);
  if (ArrayBuffer.isView(arr)) {
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, n * arr.BYTES_PER_ELEMENT);
    h.update(bytes);
  } else {
    for (let i = 0; i < n; i++) feedNumber(h, arr[i]);
  }
}

function feedAttributeSet(h, geo, domain) {
  const set = geo.attrs[domain];
  feedString(h, domain);
  if (set === undefined) {
    feedString(h, "<absent>");
    return;
  }
  // The set's own element count: columns carry spare capacity past it,
  // and those slots are not output.
  const count = set.count;
  feedNumber(h, count);
  const attrs = [...set].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  feedNumber(h, attrs.length);
  for (const a of attrs) {
    feedString(h, a.name);
    feedString(h, a.type);
    feedNumber(h, a.tupleSize);
    if (a.type === "string") {
      // Resolve through the table: two cooks that intern in a different
      // order but mean the same strings are the same output.
      for (let i = 0; i < count; i++) {
        for (let c = 0; c < a.tupleSize; c++) feedString(h, a.getString(i, c));
      }
    } else {
      feedTyped(h, a.data, count * a.tupleSize);
    }
  }
}

function feedValue(h, v) {
  if (ArrayBuffer.isView(v)) {
    feedTyped(h, v);
  } else if (Array.isArray(v)) {
    feedString(h, "[");
    feedNumber(h, v.length);
    for (const x of v) feedValue(h, x);
  } else if (v !== null && typeof v === "object") {
    const keys = Object.keys(v).sort();
    feedString(h, "{");
    feedNumber(h, keys.length);
    for (const k of keys) {
      feedString(h, k);
      feedValue(h, v[k]);
    }
  } else if (typeof v === "number") {
    feedString(h, "n");
    feedNumber(h, v);
  } else {
    feedString(h, typeof v);
    feedString(h, String(v));
  }
}

/** Feed one cooked data item into a running hash. */
export function feedItem(h, item) {
  feedString(h, item.kind);
  const tags = [...(item.tags ?? [])].map(String).sort();
  feedNumber(h, tags.length);
  for (const t of tags) feedString(h, t);
  if (item.kind === "geometry") {
    const geo = item.geo;
    feedNumber(h, geo.pointCount);
    feedNumber(h, geo.vertexCount);
    feedNumber(h, geo.primitiveCount);
    feedTyped(h, geo.vertexToPoint, geo.vertexCount);
    feedTyped(h, geo.primVertexStart, geo.primitiveCount);
    feedTyped(h, geo.primVertexCount, geo.primitiveCount);
    for (const d of DOMAIN_ORDER) feedAttributeSet(h, geo, d);
  } else if (item.kind === "instances") {
    const batches = item.batches ?? [];
    feedNumber(h, batches.length);
    for (const b of batches) {
      feedString(h, b.assetId);
      feedNumber(h, b.count);
      feedTyped(h, b.transforms, b.count * 16);
      feedTyped(h, b.colors, b.count * 3);
      const attrs = b.attributes ?? {};
      const names = Object.keys(attrs).sort();
      feedNumber(h, names.length);
      for (const n of names) {
        feedString(h, n);
        feedTyped(h, attrs[n]);
      }
    }
  } else {
    feedValue(h, item.value);
  }
}

/**
 * Digest a cook result's outputs: `{ [name]: DataCollection }`. Output
 * names are visited sorted, items in collection order (order is part of
 * the output — a renderer draws batch k as batch k).
 */
export function digestOutputs(outputs) {
  const h = createHash("sha256");
  const names = Object.keys(outputs).sort();
  feedNumber(h, names.length);
  for (const name of names) {
    feedString(h, name);
    const collection = [...outputs[name]];
    feedNumber(h, collection.length);
    for (const item of collection) feedItem(h, item);
  }
  return h.digest("hex");
}
