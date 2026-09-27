/**
 * The eiffel demo's COOKED output reduced to one digest per output, for
 * tests/eiffelGolden.test.ts: every output the graph declares (each part
 * class, `rivets.*`, `fittings.*`, `chain.*`, `cloth.*`, `works.*`,
 * `car.*`), each as its counts plus one hash over everything it carries.
 *
 * What the hash covers, per geometry item: its point / vertex / primitive
 * counts, the topology (vertex -> point, each primitive's first vertex and
 * vertex count), and on every domain (point, vertex, primitive, detail)
 * every attribute column — its name, type, tuple size and the raw bytes of
 * its first `count * tupleSize` elements. Every typed array hashed —
 * topology arrays, attribute columns, instance transforms and channels —
 * is hashed with its constructor's NAME as well as its bytes, so an
 * f32 <-> u32 (or i32 <-> u32) swap that happens to keep the bits still
 * reads as a change. Columns are taken in sorted name
 * order, not insertion order, so a refactor that only adds the same columns
 * in another order still reads as identical. A string column is hashed by
 * the string each element resolves to, not by its index into the column's
 * table, for the same reason: the table's interning order is an accident
 * of how the column was filled. Per instances item: every batch's asset id,
 * count, packed transforms and every per-instance channel (sorted by name;
 * `colors` is a view of one of them). Item tags are hashed too, sorted.
 *
 * DEPTHS are the page's own: {@link pageDetail} is main.ts's query ->
 * `Detail` mapping, copied, so the golden cooks exactly what `?rivets`,
 * `?rivets=full` or `?build` cooks in the browser.
 *
 * ORDER IS HASHED: points, primitives and instances in the order the cook
 * produced them. The golden's promise is "byte-identical", and a changed
 * order is a changed output — the page uploads these arrays as they are.
 *
 * Platform-independent: 32-bit words read through typed-array views, and
 * every platform this runs on is little-endian; strings are hashed by
 * their UTF-16 code units. Two independent 32-bit lanes (FNV-1a and a
 * murmur-mixed one) printed as 16 hex digits.
 */
import { type Attribute, type DataCollection, type Geometry, type InstancesItem, cook } from "pcg-ts";
import { buildEiffel } from "../../demos/eiffel/graph.js";
import type { Detail } from "../../demos/eiffel/parts.js";

/** One output's digest: its counts, summed over its items, and its hash. */
export interface OutputDigest {
  readonly kind: string;
  readonly items: number;
  readonly points: number;
  readonly vertices: number;
  readonly primitives: number;
  readonly instances: number;
  readonly hash: string;
}

/** The count fields of a digest, in the order a mismatch reports them. */
export const COUNT_FIELDS = ["kind", "items", "points", "vertices", "primitives", "instances"] as const;

class Hasher {
  private a = 0x811c9dc5;
  private b = 0x9747b28c;
  word(w: number): void {
    this.a = Math.imul(this.a ^ w, 0x01000193) >>> 0;
    let b = Math.imul(w, 0xcc9e2d51);
    b = Math.imul((b << 15) | (b >>> 17), 0x1b873593);
    this.b ^= b;
    this.b = ((this.b << 13) | (this.b >>> 19)) >>> 0;
    this.b = (Math.imul(this.b, 5) + 0xe6546b64) >>> 0;
  }
  words(v: ArrayLike<number>, count: number): void {
    this.word(count);
    for (let k = 0; k < count; k++) this.word(v[k] as number);
  }
  str(s: string): void {
    this.word(s.length);
    for (let k = 0; k < s.length; k++) this.word(s.charCodeAt(k));
  }
  hex(): string {
    return this.a.toString(16).padStart(8, "0") + this.b.toString(16).padStart(8, "0");
  }
}

type Typed = ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; BYTES_PER_ELEMENT: number };

/** A typed array's constructor name ("Float32Array", ...), hashed beside its bytes. */
function typeName(d: unknown): string {
  return (d as { constructor?: { name?: string } }).constructor?.name ?? "?";
}

/** The first `n` elements of a typed array, prefixed by its constructor name. */
function hashTyped(h: Hasher, d: Typed, n: number): void {
  h.str(typeName(d));
  h.words(asWords(d, n), d.BYTES_PER_ELEMENT === 8 ? 2 * n : n);
}

/** The first `n` elements of a typed array as 32-bit words (narrower types widened value by value). */
function asWords(d: Typed, n: number): ArrayLike<number> {
  if (d.BYTES_PER_ELEMENT === 4) return new Uint32Array(d.buffer, d.byteOffset, n);
  if (d.BYTES_PER_ELEMENT === 8) return new Uint32Array(d.buffer, d.byteOffset, 2 * n);
  const out = new Uint32Array(n);
  for (let k = 0; k < n; k++) out[k] = (d[k] as number) >>> 0;
  return out;
}

function hashColumn(h: Hasher, a: Attribute, count: number): void {
  h.str(a.name);
  h.str(a.type);
  h.word(a.tupleSize);
  const n = count * a.tupleSize;
  const data = a.data as unknown as Typed;
  h.str(typeName(data));
  if (a.type === "string") {
    // By resolved string: one hash per table entry, then one word per element.
    const perEntry = a.stringTable.map((s) => {
      const e = new Hasher();
      e.str(s);
      return Number.parseInt(e.hex().slice(0, 8), 16) >>> 0;
    });
    h.word(n);
    for (let k = 0; k < n; k++) h.word(perEntry[data[k] as number] ?? 0xffffffff);
    return;
  }
  h.words(asWords(data, n), data.BYTES_PER_ELEMENT === 8 ? 2 * n : n);
}

function hashGeometry(h: Hasher, geo: Geometry): void {
  h.word(geo.pointCount);
  h.word(geo.vertexCount);
  h.word(geo.primitiveCount);
  hashTyped(h, geo.vertexToPoint as unknown as Typed, geo.vertexCount);
  hashTyped(h, geo.primVertexStart as unknown as Typed, geo.primitiveCount);
  hashTyped(h, geo.primVertexCount as unknown as Typed, geo.primitiveCount);
  for (const domain of ["point", "vertex", "primitive", "detail"] as const) {
    const set = geo.attrs[domain];
    h.str(domain);
    const names = set.names().sort();
    h.word(names.length);
    for (const name of names) hashColumn(h, set.require(name), set.count);
  }
}

function hashInstances(h: Hasher, item: InstancesItem): number {
  if (item.deviceBatches !== undefined) throw new Error("eiffelGolden: a device-resident instances item; the golden cooks on the CPU");
  let total = 0;
  h.word(item.batches.length);
  for (const b of item.batches) {
    h.str(b.assetId);
    h.word(b.count);
    hashTyped(h, b.transforms as unknown as Typed, 16 * b.count);
    const attrs = b.attributes ?? {};
    const names = Object.keys(attrs).sort();
    h.word(names.length);
    for (const name of names) {
      const d = attrs[name] as unknown as Typed;
      h.str(name);
      h.word(d.BYTES_PER_ELEMENT);
      hashTyped(h, d, d.length);
    }
    total += b.count;
  }
  return total;
}

/** Stable text of a plain value: sorted object keys. */
function stableText(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? String(v);
  if (Array.isArray(v)) return `[${v.map(stableText).join(",")}]`;
  if (ArrayBuffer.isView(v)) return `${v.constructor.name}(${Array.from(v as unknown as ArrayLike<number>).join(",")})`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableText((v as Record<string, unknown>)[k])}`).join(",")}}`;
}

/** One output reduced to its digest. */
export function digestOutput(list: DataCollection): OutputDigest {
  const h = new Hasher();
  const kinds = new Set<string>();
  let points = 0;
  let vertices = 0;
  let primitives = 0;
  let instances = 0;
  h.word(list.length);
  for (const item of list) {
    kinds.add(item.kind);
    h.str(item.kind);
    const tags = [...item.tags].sort();
    h.word(tags.length);
    for (const t of tags) h.str(t);
    if (item.kind === "geometry") {
      hashGeometry(h, item.geo);
      points += item.geo.pointCount;
      vertices += item.geo.vertexCount;
      primitives += item.geo.primitiveCount;
    } else if (item.kind === "instances") {
      instances += hashInstances(h, item);
    } else {
      h.str(stableText(item.value));
    }
  }
  return {
    kind: [...kinds].sort().join("+") || "empty",
    items: list.length,
    points,
    vertices,
    primitives,
    instances,
    hash: h.hex(),
  };
}

/** Every output of a cook, digested, keyed by sorted output name. */
export function digestOutputs(outputs: Readonly<Record<string, DataCollection | undefined>>): Record<string, OutputDigest> {
  const out: Record<string, OutputDigest> = {};
  for (const name of Object.keys(outputs).sort()) out[name] = digestOutput(outputs[name] as DataCollection);
  return out;
}

/** Cook the tower at `detail` and digest every output, keyed by sorted output name. */
export async function eiffelDigests(detail: Detail, seed = 1889): Promise<Record<string, OutputDigest>> {
  const { outputs } = await cook(buildEiffel(seed, detail));
  return digestOutputs(outputs as Record<string, DataCollection>);
}

/**
 * The depths the golden cooks, each as the page's query string. `?rivets`
 * implies `?laced`, and `?rivets=full` adds the built-up uprights' rows;
 * `?build` adds the erection's works (`works.*`) and the cranes to the
 * skeleton.
 */
export const PAGE_DEPTHS: ReadonlyArray<{ readonly name: string; readonly query: string }> = [
  { name: "skeleton", query: "" },
  { name: "laced", query: "?laced" },
  { name: "riveted", query: "?rivets" },
  { name: "rivetsFull", query: "?rivets=full" },
  { name: "build", query: "?build" },
];

/** main.ts's `tuned`, copied: the numeric query params it reads, where finite. */
function tuned<K extends string>(params: URLSearchParams, keys: Record<K, string>): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const [key, param] of Object.entries(keys) as Array<[K, string]>) {
    const raw = params.get(param);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

/**
 * The `Detail` demos/eiffel/main.ts builds from a page query, copied line
 * for line (`BUILD`, `BANDS`, then the block in `main()` that calls
 * `buildEiffel`); main.ts cannot be imported here, it builds a page as it
 * loads. Keep the two in step: a depth the page cooks differently from
 * this is a depth the golden does not pin.
 */
export function pageDetail(search: string): Detail {
  const params = new URLSearchParams(search);
  const BUILD = params.has("build");
  const BANDS = params.has("bands") && !BUILD;
  const rivets = !BANDS && params.has("rivets");
  const fullRivets = rivets && params.get("rivets") === "full";
  const laced = !BANDS && (params.has("laced") || rivets);
  const crossPlate = tuned(params, { set: "plateSet", edge: "plateEdge" });
  return { lacedWeb: laced, rivets, fullRivets, crossPlate, build: BUILD };
}
