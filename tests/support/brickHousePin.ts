/**
 * The brick house's cooked bytes over many seeds and graph-param draws, as
 * one short digest per configuration — the multi-seed pin the corpus golden
 * (default seed only, counts and bounds) cannot give.
 *
 * WHY IT EXISTS. The house's lot, baseplate, sill, chimney and chimney
 * shadow were five setBounds that rebuilt their corners by hand; they are
 * now two placeBox and three offsetBox nodes, proven byte-identical to the
 * setBounds house over 120 configurations before that graph left the repo.
 * This pins the same equivalence going forward: the digests below were
 * computed from the SETBOUNDS house (graphs/examples-brick-house.json at
 * 19ab534f) and match the box-node house, so a change that moves any box
 * these nodes write, on any configuration here, fails the pin.
 *
 * WHAT IS HASHED, per configuration: every declared graph output and the
 * stages the box nodes feed — `lotBox`, `gKind` (the baseplate), the
 * chimney `chimShadow`, the `facade` (where the sills are) and `pieces`
 * (everything, the chimney stack included) — each by the exact bytes of
 * every attribute of every domain, the string values, the topology, and
 * every instance batch's transforms and channels. The probe ids exist under
 * the same names in the setBounds house, which is how its digests were made.
 */
import { createHash } from "node:crypto";
import type { DataCollection } from "../../src/graph/index.js";
import type { Geometry } from "../../src/data/index.js";

/** The stages the box nodes write or feed, probed as extra outputs. */
export const HOUSE_PROBES = ["lotBox", "gKind", "chimShadow", "facade", "pieces"] as const;

type Json = Record<string, unknown>;
interface HouseGraph {
  seed: number;
  params: { value: unknown; min?: number; max?: number }[];
  outputs: Json[];
}

/**
 * The configurations: `seeds` default-param seeds (1, 2, ...), then `draws`
 * configurations each with its own seed and every numeric graph param drawn
 * — 15% at its min, 15% at its max, the rest uniform and mostly rounded —
 * from a fixed 32-bit LCG, so the list is the same on every machine.
 */
export function houseConfigs(house: HouseGraph, seeds: number, draws: number): HouseGraph[] {
  let st = 0x9e3779b9;
  const rnd = (): number => {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    return st / 4294967296;
  };
  const out: HouseGraph[] = [];
  for (let c = 0; c < seeds + draws; c++) {
    const g = structuredClone(house);
    g.seed = c < seeds ? c + 1 : 1 + Math.floor(rnd() * 1e6);
    if (c >= seeds) {
      for (const p of g.params) {
        if (typeof p.value !== "number" || p.min === undefined || p.max === undefined) continue;
        const r = rnd();
        let v = r < 0.15 ? p.min : r < 0.3 ? p.max : p.min + rnd() * (p.max - p.min);
        if (r >= 0.3 && rnd() < 0.7) v = Math.round(v);
        p.value = v;
      }
    }
    for (const id of HOUSE_PROBES) g.outputs.push({ id, pin: "out", name: `probe:${id}` });
    out.push(g);
  }
  return out;
}

/** A typed array's bytes, whatever brand its buffer type carries. */
const bytes = (v: { buffer: unknown; byteOffset: number; byteLength: number }): Uint8Array =>
  new Uint8Array(v.buffer as ArrayBuffer, v.byteOffset, v.byteLength);

function hashGeometry(h: ReturnType<typeof createHash>, geo: Geometry): void {
  for (const domain of ["point", "vertex", "primitive", "detail"] as const) {
    const set = geo.attrs[domain];
    h.update(`|${domain}:${set.count}`);
    for (const name of set.names().slice().sort()) {
      const a = set.require(name);
      const n = set.count * a.tupleSize;
      h.update(`|${name}:${a.type}:${a.tupleSize}`);
      const d = a.data.subarray(0, n);
      h.update(bytes(d));
      if (a.type === "string") for (let i = 0; i < n; i++) h.update(`\u0000${a.getString(Math.floor(i / a.tupleSize), i % a.tupleSize)}`);
    }
  }
  for (const arr of [geo.vertexToPoint, geo.primVertexStart, geo.primVertexCount]) {
    h.update(`|topo:${arr.length}`);
    h.update(bytes(arr));
  }
}

/** One configuration's cooked outputs as a 16-hex-digit digest. */
export function houseDigest(outputs: Record<string, DataCollection>): string {
  const h = createHash("sha256");
  for (const name of Object.keys(outputs).sort()) {
    h.update(`#${name}`);
    for (const item of outputs[name]) {
      h.update(`|${item.kind}`);
      if (item.kind === "geometry") hashGeometry(h, item.geo);
      else if (item.kind === "instances") {
        for (const b of item.batches) {
          h.update(`|${b.assetId}:${b.count}`);
          h.update(bytes(b.transforms));
          for (const k of Object.keys(b.attributes ?? {}).sort()) {
            const v = (b.attributes as Record<string, ArrayBufferView>)[k];
            h.update(`|${k}`);
            h.update(bytes(v));
          }
        }
      }
    }
  }
  return h.digest("hex").slice(0, 16);
}
