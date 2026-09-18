/**
 * The Eiffel skeleton against Plate XXXI.
 *
 * The demo's claim is that its large structure is Eiffel's own — every
 * panel node where the plate puts it — while everything smaller is a rule.
 * This holds the first half: it reads the upright PATHS (before they are
 * skinned, where a vertex is exactly a station) and checks every vertex
 * against the node table, and the upright count against the plate's
 * 16 -> 12 -> 8 progression.
 */
import { describe, expect, it } from "vitest";
import {
  type Geometry,
  type NodeHandle,
  cook,
  deserializeGraph,
  firstGeometry,
  serializeGraph,
} from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { NODES, node } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const data = P.data as Float32Array;
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      line.push([data[3 * i] as number, data[3 * i + 1] as number, data[3 * i + 2] as number]);
    }
    out.push(line);
  }
  return out;
}

/** Cook the skeleton with the named intermediate nodes as extra outputs. */
async function cookWith(ids: readonly string[]): Promise<Record<string, Geometry>> {
  const g = buildEiffel();
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  for (const id of ids) {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    out[id] = geo;
  }
  return out;
}

/** The plate's node at height y, if a node (or panel 1-4 midpoint) sits there. */
function nodeAt(y: number): { outer: number; inner: number } | undefined {
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]!;
    if (Math.abs(n.y - y) < 1e-3) return n;
    const m = NODES[i + 1];
    const mid = m === undefined ? NaN : (n.y + m.y) / 2;
    if (m !== undefined && Math.abs(mid - y) < 1e-3) {
      return { outer: (n.outer + m.outer) / 2, inner: (n.inner + m.inner) / 2 };
    }
  }
  return undefined;
}

/** How many of the paths cross height y. */
function crossing(lines: readonly Vec3[][], y: number): number {
  return lines.filter((l) => {
    const ys = l.map((v) => v[1]);
    return Math.min(...ys) < y && Math.max(...ys) > y;
  }).length;
}

describe("eiffel skeleton", () => {
  it("puts every leg-upright vertex on a Plate XXXI node", async () => {
    const { legUprights4 } = await cookWith(["legUprights4"]);
    const lines = polylines(legUprights4!);
    expect(lines).toHaveLength(16);
    for (const line of lines) {
      for (const [x, y, z] of line) {
        const n = nodeAt(y);
        expect(n, `vertex at y=${y} is on no node`).toBeDefined();
        // Each coordinate is the node's outer or inner half-width.
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - n!.outer), Math.abs(c - n!.inner));
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
      }
    }
    // Upright a ends at the 2nd floor's node; b, c and d run on to XI.
    const tops = lines.map((l) => Math.max(...l.map((v) => v[1]))).sort((a, b) => a - b);
    expect(tops.slice(0, 4)).toEqual(Array(4).fill(node("XVII").y));
    for (const t of tops.slice(4)) expect(t).toBeCloseTo(node("XI").y, 3);
    // All sixteen start on the support centres.
    for (const l of lines) expect(Math.min(...l.map((v) => v[1]))).toBeCloseTo(2.5, 3);
  });

  it("puts every shaft-upright vertex on a Plate XXXI node", async () => {
    const { shaftUprights } = await cookWith(["shaftUprights"]);
    const lines = polylines(shaftUprights!);
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      for (const [x, y, z] of line) {
        const n = nodeAt(y);
        expect(n, `vertex at y=${y} is on no node`).toBeDefined();
        // A corner (c) or a face centre line (the merged b/d).
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - n!.outer), c);
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
      }
    }
  });

  it("carries 16 uprights to the 2nd floor, 12 to node XI and 8 above", async () => {
    const { legUprights4, shaftUprights } = await cookWith(["legUprights4", "shaftUprights"]);
    const all = [...polylines(legUprights4!), ...polylines(shaftUprights!)];
    expect(crossing(all, 60)).toBe(16);
    expect(crossing(all, 150)).toBe(12);
    expect(crossing(all, 220)).toBe(8);
  });

  it("round-trips through its serialized form to the same geometry", async () => {
    const g = buildEiffel();
    const again = deserializeGraph(JSON.parse(JSON.stringify(serializeGraph(g))));
    const [a, b] = await Promise.all([cook(g), cook(again)]);
    for (const name of Object.keys(a.outputs)) {
      const pa = firstGeometry(a.outputs[name]!)!.attrs.point.get("P")!.data;
      const pb = firstGeometry(b.outputs[name]!)!.attrs.point.get("P")!.data;
      expect(Buffer.from(pb.buffer, pb.byteOffset, pb.byteLength).equals(Buffer.from(pa.buffer, pa.byteOffset, pa.byteLength)), name).toBe(true);
    }
  });
});
