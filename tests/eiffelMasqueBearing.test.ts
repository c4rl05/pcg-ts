/**
 * The Masque (PL-VII Fig. 6, legs.ts `masque`) bears on the leg: its "750"
 * chord runs on over the uprights' exterior webs, and a packing block under
 * each end fills the space from the web to the chord's back
 * (`MASQUE_BEARING`). This holds the blocks to what they are for, at every
 * depth the page draws:
 *
 * - each block bears: its back is on an upright's steel and its front on
 *   the 750 (both boxes intersect them);
 * - nothing else of the legs enters a block (shrunk by the 2 mm it is set
 *   into the web and the 1 mm into the chord, and 0.5 mm more): not the
 *   uprights' C.J.s, fins or seam steel the laced depth draws, not a node
 *   gusset, not panel 5's upright;
 * - no rivet head sits inside one (a head's centre within its radius of a
 *   block).
 *
 * The blocks rake with the uprights; a block squared to the horizontal
 * instead swung into the C.J. and the corner rows over its height, which is
 * what the control reproduces: the same block moved 0.20 toward the
 * upright's axis must be reported.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { quadrants } from "../demos/eiffel/lattice.js";
import { buildLegs } from "../demos/eiffel/legs.js";
import type { Detail } from "../demos/eiffel/parts.js";

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V): V => mul(a, 1 / len(a));

/** An oriented box: centre, three unit axes, half-extents. */
interface Box {
  c: V;
  ax: [V, V, V];
  h: [number, number, number];
}

/** The packing mesh's blocks, read back as boxes from their corners. */
function blocks(geo: Geometry): Box[] {
  const P = geo.attrs.point.get("P")!.data;
  const pts: V[] = [];
  for (let i = 0; i < geo.pointCount; i++) pts.push([P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
  // Corners, deduplicated; each block is 8 of them, 24 points apart.
  const out: Box[] = [];
  for (let b = 0; b + 24 <= pts.length; b += 24) {
    const cs: V[] = [];
    for (const p of pts.slice(b, b + 24)) if (!cs.some((q) => len(sub(p, q)) < 1e-6)) cs.push(p);
    expect(cs).toHaveLength(8);
    const c = mul(cs.reduce((s, p) => add(s, p), [0, 0, 0] as V), 1 / 8);
    const o = cs[0]!;
    // Its edges from one corner: the two shortest, and the shortest square to both.
    const ds = cs.slice(1).map((p) => sub(p, o)).sort((p, q) => len(p) - len(q));
    const [e0, e1] = [ds[0]!, ds[1]!];
    const e2 = ds.find((d) => Math.abs(dot(unit(d), unit(e0))) < 1e-3 && Math.abs(dot(unit(d), unit(e1))) < 1e-3)!;
    const near = [e0, e1, e2].map((d) => add(o, d));
    const ax = near.map((p) => unit(sub(p, o))) as [V, V, V];
    const h = near.map((p) => len(sub(p, o)) / 2) as [number, number, number];
    out.push({ c, ax, h });
  }
  return out;
}

/** Whether triangle abc and the box overlap (separating axes). */
function triBox(a: V, b: V, cc: V, box: Box): boolean {
  const v = [sub(a, box.c), sub(b, box.c), sub(cc, box.c)];
  const e = [sub(v[1]!, v[0]!), sub(v[2]!, v[1]!), sub(v[0]!, v[2]!)];
  const axes: V[] = [...box.ax, cross(e[0]!, e[1]!)];
  for (const f of e) for (const u of box.ax) axes.push(cross(f, u));
  for (const n of axes) {
    if (len(n) < 1e-12) continue;
    const p = v.map((x) => dot(x, n));
    const r = box.h[0] * Math.abs(dot(box.ax[0], n)) + box.h[1] * Math.abs(dot(box.ax[1], n)) + box.h[2] * Math.abs(dot(box.ax[2], n));
    if (Math.min(...p) > r || Math.max(...p) < -r) return false;
  }
  return true;
}

const shrink = (b: Box, by: number): Box => ({ c: b.c, ax: b.ax, h: b.h.map((x) => Math.max(0, x - by)) as [number, number, number] });

/** Triangles of a geometry, as vertex triples. */
function triangles(geo: Geometry): V[][] {
  const P = geo.attrs.point.get("P")!.data;
  const at = (i: number): V => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  const out: V[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    for (let k = 1; k + 1 < n; k++) out.push([at(geo.vertexToPoint[s]!), at(geo.vertexToPoint[s + k]!), at(geo.vertexToPoint[s + k + 1]!)]);
  }
  return out;
}

/** The legs at a depth: every part mesh by its node id, and every rivet head's centre. */
async function legsAt(detail: Detail): Promise<{ meshes: Map<string, { cls: string; geo: Geometry }>; heads: V[] }> {
  const g = new Graph(1889);
  const parts = buildLegs(g, quadrants(g, "quad"), detail);
  const ids: Array<[string, string]> = [];
  for (const [cls, list] of Object.entries(parts)) {
    if (!Array.isArray(list) || cls === "rivets" || cls === "fittings" || cls === "cars" || cls === "chains") continue;
    for (const h of list as NodeHandle[]) {
      g.output(h, "out", `m|${h.id}`);
      ids.push([h.id, cls]);
    }
  }
  const rivets = (parts.rivets ?? []).map(({ name, spawn }) => {
    g.output(spawn, "instances", `r|${name}`);
    return name;
  });
  const { outputs } = await cook(g);
  const meshes = new Map<string, { cls: string; geo: Geometry }>();
  for (const [id, cls] of ids) {
    const geo = firstGeometry((outputs as Record<string, never>)[`m|${id}`] ?? []);
    if (geo !== undefined) meshes.set(id, { cls, geo });
  }
  const heads: V[] = [];
  for (const name of rivets) {
    for (const item of ((outputs as Record<string, unknown>)[`r|${name}`] ?? []) as Array<{ kind: string; batches?: Array<{ count: number; transforms: Float32Array }> }>) {
      if (item.kind !== "instances") continue;
      for (const b of item.batches ?? []) for (let k = 0; k < b.count; k++) {
        heads.push([b.transforms[16 * k + 12]!, b.transforms[16 * k + 13]!, b.transforms[16 * k + 14]!]);
      }
    }
  }
  return { meshes, heads };
}

/** A rivet head's radius (strut.ts RIVET_HEAD). */
const HEAD = 0.019;

describe("eiffel Masque: the 750's packing bears on the uprights and clashes with nothing", () => {
  for (const [label, detail] of [
    ["plain", {}],
    ["laced", { lacedWeb: true }],
    ["riveted", { rivets: true }],
  ] as const) {
    it(`at the ${label} depth`, async () => {
      const { meshes, heads } = await legsAt(detail);
      const fill = meshes.get("legMasque10Lit");
      expect(fill, "the packing mesh").toBeDefined();
      const boxes = blocks(fill!.geo);
      // Two blocks a face, two faces a leg, four legs.
      expect(boxes).toHaveLength(16);
      const mid = triangles(meshes.get("legMasque6Lit")!.geo);
      // Everything else of the legs, each triangle with its bounds.
      const others: Array<{ id: string; t: V[]; lo: V; hi: V }> = [];
      for (const [id, { cls, geo }] of meshes) {
        if (id.startsWith("legMasque")) continue;
        for (const t of triangles(geo)) {
          const lo = [0, 1, 2].map((k) => Math.min(t[0]![k]!, t[1]![k]!, t[2]![k]!)) as V;
          const hi = [0, 1, 2].map((k) => Math.max(t[0]![k]!, t[1]![k]!, t[2]![k]!)) as V;
          others.push({ id: `${cls}:${id}`, t, lo, hi });
        }
      }
      const hits = (b: Box): string[] => {
        const r = len(b.h as V) + 0.01;
        const out: string[] = [];
        for (const o of others) {
          if ([0, 1, 2].some((k) => o.hi[k]! < b.c[k]! - r || o.lo[k]! > b.c[k]! + r)) continue;
          if (triBox(o.t[0]!, o.t[1]!, o.t[2]!, b)) out.push(o.id);
        }
        return out;
      };
      const at = (b: Box) => b.c.map((v) => v.toFixed(2)).join(",");
      // Each block's axes by role: the thickness is the one along the 750's
      // normal (the chord's thinnest axis), the length the longest of the
      // other two, and across the third (square to the upright, in the face).
      const chords = blocks(meshes.get("legMasque6Lit")!.geo);
      expect(chords).toHaveLength(8);
      // The normal is the NEAREST chord's: the legs' four faces each have
      // their own, so one chord's normal serves only its own face's blocks.
      const role = (b: Box) => {
        const near = chords.reduce((m, c) => (len(sub(c.c, b.c)) < len(sub(m.c, b.c)) ? c : m));
        const normal = near.ax[near.h.indexOf(Math.min(...near.h))]!;
        const thick = [0, 1, 2].reduce((i, j) => (Math.abs(dot(b.ax[j]!, normal)) > Math.abs(dot(b.ax[i]!, normal)) ? j : i), 0);
        const [x, y] = [0, 1, 2].filter((i) => i !== thick);
        return b.h[x!]! > b.h[y!]! ? { thick, along: x!, across: y! } : { thick, along: y!, across: x! };
      };
      const headsIn = (b: Box) =>
        heads.filter((p) => {
          const d = sub(p, b.c);
          return b.ax.every((u, i) => Math.abs(dot(d, u)) < b.h[i]! + HEAD);
        });
      for (const b of boxes) {
        // Bears: on an upright's steel behind, and under the 750 in front.
        const touch = { c: b.c, ax: b.ax, h: b.h.map((x) => x + 0.001) as [number, number, number] };
        expect(hits(touch).some((id) => id.startsWith("uprights:")), `block at ${at(b)} on no upright`).toBe(true);
        expect(mid.some((t) => triBox(t[0]!, t[1]!, t[2]!, touch)), `block at ${at(b)} under no chord`).toBe(true);
        // Nothing else inside it, bar the 2 mm it is set into the web.
        expect([...new Set(hits(shrink(b, 0.0025)))], `inside the block at ${at(b)}`).toEqual([]);
        // No rivet head in it or on it.
        expect(headsIn(b).length, `rivet heads at the block at ${at(b)}`).toBe(0);
      }
      // The 750 itself, which runs on over the uprights: nothing of them in
      // it (the fin on the web's centre line stands up past its plane).
      for (const c of chords) expect([...new Set(hits(shrink(c, 0.0005)))], `inside the 750 at ${at(c)}`).toEqual([]);
      // Controls: a block moved 0.20 toward its upright's axis runs into
      // the C.J. and the fin where the depth draws them, and 0.07 away from
      // it onto the corner rows' heads where the depth drives them.
      const moved = (b: Box, by: number): Box[] => {
        const u = b.ax[role(b).across]!;
        return [1, -1].map((sg) => ({ c: add(b.c, mul(u, by * sg)), ax: b.ax, h: b.h }));
      };
      if (label !== "plain") for (const b of boxes) expect(moved(b, 0.2).some((m) => hits(shrink(m, 0.0025)).length > 0), `control: into the C.J. at ${at(b)}`).toBe(true);
      if (label === "riveted") for (const b of boxes) expect(moved(b, 0.07).some((m) => headsIn(m).length > 0), `control: onto the heads at ${at(b)}`).toBe(true);
    }, 900_000);
  }
});
