/**
 * The determinism fingerprint: byte-exact, run against run.
 *
 * {@link graphFingerprint} reduces a whole cook to a structure of hashes —
 * every attribute column's used bytes, the topology arrays, every instance
 * transform and channel — and {@link cookFingerprint} folds that structure
 * into one 16-hex digest overall plus one per output, which is what
 * `pcg cook --fingerprint` and `pcg run --fingerprint` print.
 *
 * It lives here rather than in `src/docs/graphGolden.ts`, where it was
 * born, because the CLI is a build entry the package publishes and the
 * docs tooling is not: the corpus test and the golden generator reach it
 * through graphGolden's re-export, so both still compare exactly what they
 * compared before the move.
 *
 * The digest is a comparison instrument, not an identity. Two cooks of one
 * graph at one seed on one build must agree on it; it says nothing about a
 * different build, where an intended change to the numbers moves it too.
 */
import {
  type Attribute,
  type DataCollection,
  DOMAINS,
  type Geometry,
  type InstanceBatch,
  instanceAttributesOf,
  isDeviceResidentInstances,
  type ReadonlyTopology,
} from "../index.js";

const encoder = new TextEncoder();

/**
 * A 64-bit hash of a byte range, as 16 hex characters: two independent
 * FNV-1a streams over the same bytes. One 32-bit stream would collide
 * once in four billion, which is a poor bet to make against a
 * determinism invariant that is checked on every run.
 */
export function hashBytes(bytes: Uint8Array): string {
  let a = 0x811c9dc5;
  let b = 0xcbf29ce4;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    a = Math.imul(a ^ byte, 0x01000193) >>> 0;
    b = Math.imul(b ^ byte, 0x9e3779b1) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/**
 * The used prefix of an attribute's storage, as bytes. Capacity beyond
 * `count` is not data.
 *
 * THE COPY IS THE POINT, not an oversight. A byte view laid over the
 * column's own buffer would be a fully writable alias of storage a node
 * cache holds — the one escape from `Attribute`'s read view that needs no
 * cast — so the read view does not hand its buffer out, and `slice` is
 * the way to bytes this code may own. It costs one copy per column per
 * fingerprint, on a path that already walks every one of those bytes
 * twice to hash them.
 */
function attributeBytes(attr: Attribute, count: number): Uint8Array {
  const used = count * attr.tupleSize;
  const copy = attr.data.slice(0, used);
  return new Uint8Array(copy.buffer, copy.byteOffset, copy.byteLength);
}

function hashAttribute(attr: Attribute, count: number): string {
  const value = hashBytes(attributeBytes(attr, count));
  if (attr.type !== "string") return value;
  // Indices alone say nothing: two runs agree on index 3 while disagreeing
  // on what index 3 spells.
  return value + ":" + hashBytes(encoder.encode(attr.stringTable.join("\u0000")));
}

/**
 * A CPU batch's channels as one hash per channel, keyed by name; absent
 * when the batch carries none, so a channel-less corpus fingerprints
 * exactly as it did before channels existed.
 */
function channelFingerprint(batch: InstanceBatch): { channels?: Record<string, string> } {
  const columns = instanceAttributesOf(batch);
  const names = Object.keys(columns);
  if (names.length === 0) return {};
  const channels: Record<string, string> = {};
  for (const name of names) {
    const column = columns[name]!;
    channels[name] = hashBytes(
      new Uint8Array(column.buffer, column.byteOffset, column.byteLength),
    );
  }
  return { channels };
}

/**
 * A topology array's bytes. It COPIES with `slice`, the way
 * {@link attributeBytes} does and for the same reason: a geometry hands
 * its topology out through a read view, which does not hand out a buffer,
 * so a byte view cannot be laid over one. (Each geometry owns its three
 * arrays — nothing is shared — but the array a geometry holds IS the one
 * a node built and a cache now keeps, which is what the read view is
 * protecting.) The hashed bytes are the array's own, so the fingerprint
 * is unchanged.
 */
function hashTypedArray(array: ReadonlyTopology): string {
  const copy = array.slice();
  return hashBytes(new Uint8Array(copy.buffer, copy.byteOffset, copy.byteLength));
}

function geometryFingerprint(geo: Geometry): Record<string, unknown> {
  const domains: Record<string, Record<string, string>> = {};
  for (const domain of DOMAINS) {
    const set = geo.attrs[domain];
    const columns: Record<string, string> = {};
    for (const attr of set) columns[attr.name] = hashAttribute(attr, set.count);
    domains[domain] = columns;
  }
  return {
    counts: {
      point: geo.pointCount,
      vertex: geo.vertexCount,
      primitive: geo.primitiveCount,
      detail: geo.attrs.detail.count,
    },
    attrs: domains,
    topology: {
      vertexToPoint: hashTypedArray(geo.vertexToPoint),
      primVertexStart: hashTypedArray(geo.primVertexStart),
      primVertexCount: hashTypedArray(geo.primVertexCount),
    },
  };
}

/**
 * A float-exact fingerprint of a whole cook: every attribute column, the
 * topology arrays, and every instance transform, hashed. Two cooks of the
 * same graph on the same build must produce the identical structure —
 * that is the determinism invariant, and unlike the golden it compares a
 * run against a run, so an intended change to the numbers can never make
 * it stale.
 */
export function graphFingerprint(outputs: Record<string, DataCollection>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const name of Object.keys(outputs).sort()) {
    result[name] = (outputs[name] ?? []).map((item): Record<string, unknown> => {
      if (item.kind === "geometry") {
        return { kind: "geometry", tags: [...item.tags].sort(), ...geometryFingerprint(item.geo) };
      }
      if (item.kind === "value") {
        return { kind: "value", tags: [...item.tags].sort(), value: item.value };
      }
      if (isDeviceResidentInstances(item)) {
        // Device transforms live in GPU memory and reading them throws;
        // the corpus never cooks with a GPU, so this is a guard, not a path.
        return {
          kind: "instances",
          tags: [...item.tags].sort(),
          residency: "device",
          batches: (item.deviceBatches ?? []).map((b) => ({ assetId: b.assetId, count: b.count })),
        };
      }
      return {
        kind: "instances",
        tags: [...item.tags].sort(),
        residency: "cpu",
        batches: item.batches.map((b) => ({
          assetId: b.assetId,
          count: b.count,
          transforms: hashBytes(
            new Uint8Array(b.transforms.buffer, b.transforms.byteOffset, b.transforms.byteLength),
          ),
          // Channels are cook output like any other, so they belong in the
          // determinism hash too — a channel whose values moved between two
          // runs of one build is the same class of bug as a transform that
          // did. Read through the normalizer so a batch spelling its colour
          // as a plain `colors` hashes identically to one spelling it as the
          // reserved channel.
          ...channelFingerprint(b),
        })),
      };
    });
  }
  return result;
}

/**
 * A number as the canonical text spells it. Finite values take their JSON
 * spelling, except that `-0` stays `-0`; NaN and the infinities, which
 * JSON would fold into `null` along with a genuine null, keep their JS
 * names. The text is only ever hashed, never parsed, so it does not have
 * to be JSON — it has to keep apart what the cook kept apart.
 */
function canonicalNumber(n: number): string {
  if (Object.is(n, -0)) return "-0";
  if (!Number.isFinite(n)) return String(n);
  return JSON.stringify(n);
}

/**
 * The canonical text of a fingerprint structure: JSON with the keys of
 * every object sorted (UTF-16 code-unit order, locale-free) and no
 * whitespace, so the digest depends on what the structure says and never
 * on the order its keys happened to be written in. Array order is kept —
 * item order in a collection is cook output. Keys whose value is
 * `undefined` are left out, as JSON leaves them out.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "number":
      return canonicalNumber(value);
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      if (ArrayBuffer.isView(value)) {
        const view = value as unknown as ArrayLike<number>;
        return `[${Array.from(view, canonicalNumber).join(",")}]`;
      }
      const record = value as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort()) {
        if (record[key] === undefined) continue;
        parts.push(`${JSON.stringify(key)}:${canonicalJson(record[key])}`);
      }
      return `{${parts.join(",")}}`;
    }
    default:
      // bigint, function, symbol, undefined: none occurs in a fingerprint
      // structure, and hashing a stand-in for one would hide the bug.
      throw new Error(`canonicalJson: cannot encode a value of type ${typeof value}`);
  }
}

/** What `--fingerprint` adds to a cook report. */
export interface CookFingerprint {
  /** 16 hex characters over every declared output together. */
  readonly fingerprint: string;
  /** 16 hex characters per output, keyed by output name in sorted order. */
  readonly outputs: Readonly<Record<string, string>>;
}

/**
 * The digests `pcg cook --fingerprint` and `pcg run --fingerprint` report:
 * {@link hashBytes} over the UTF-8 of {@link canonicalJson} of
 * {@link graphFingerprint} — once for the whole structure, and once for
 * each output's own entry in it.
 */
export function cookFingerprint(outputs: Record<string, DataCollection>): CookFingerprint {
  const structure = graphFingerprint(outputs);
  const perOutput: Record<string, string> = {};
  for (const name of Object.keys(structure)) {
    perOutput[name] = hashBytes(encoder.encode(canonicalJson(structure[name])));
  }
  return { fingerprint: hashBytes(encoder.encode(canonicalJson(structure))), outputs: perOutput };
}
