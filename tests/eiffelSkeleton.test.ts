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
import { UPRIGHT_SEAMS } from "../demos/eiffel/strut.js";

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

  it("squares every copied web member to its leaning face", async () => {
    // Panels 1-4: the legs are parallel prisms leaning 0.50268 (horizontal
    // per vertical) on every face, so a face normal there tilts up by
    // exactly that slope and is square to x or to z. Checked on all four
    // quadrants' copies, where an unturned normal would not even be
    // perpendicular to its own member.
    const { legBracing4RotDone } = await cookWith(["legBracing4RotDone"]);
    const geo = legBracing4RotDone!;
    const faceN = geo.attrs.primitive.get("faceN");
    expect(faceN?.tupleSize).toBe(3);
    const n = faceN!.data as Float32Array;
    const lines = polylines(geo);
    let checked = 0;
    const quadrantsSeen = new Set<string>();
    lines.forEach(([a, b], p) => {
      const nx = n[3 * p] as number;
      const ny = n[3 * p + 1] as number;
      const nz = n[3 * p + 2] as number;
      const e = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
      const eLen = Math.hypot(e[0]!, e[1]!, e[2]!);
      expect(Math.abs(nx * e[0]! + ny * e[1]! + nz * e[2]!) / eLen).toBeLessThan(1e-4);
      if (Math.max(a![1], b![1]) > node("XXIV").y + 1e-3) return;
      expect(Math.min(Math.abs(nx), Math.abs(nz))).toBeLessThan(1e-4);
      expect(Math.abs(ny) / Math.hypot(nx, nz)).toBeCloseTo(0.50268, 3);
      quadrantsSeen.add(`${Math.sign(a![0])},${Math.sign(a![2])}`);
      checked++;
    });
    // 4 legs x 4 faces x 2 diagonals x 4 panels.
    expect(checked).toBe(128);
    expect(quadrantsSeen.size).toBe(4);
  });

  it("rivets the uprights' seams at the rule's pitch: 8 rows per upright", async () => {
    // The count a spacing resample implies for a path of length L at pitch
    // p: a sample every p from the start, plus the true end when L is not
    // a whole number of pitches.
    const g = buildEiffel(1889, { rivets: true });
    g.output({ id: "legUprights4" } as NodeHandle, "out", "probe:uprights");
    const { outputs } = await cook(g);
    const lines = polylines(firstGeometry(outputs["probe:uprights"]!)!);
    let expected = 0;
    for (const line of lines) {
      let L = 0;
      for (let i = 1; i < line.length; i++) {
        const [a, b] = [line[i - 1]!, line[i]!];
        L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }
      const whole = Math.floor(L / UPRIGHT_SEAMS.pitch + 1e-6);
      expected += 8 * (whole + 1 + (L - whole * UPRIGHT_SEAMS.pitch > 1e-4 ? 1 : 0));
    }
    const item = outputs["rivets.leg.uprights"]![0]!;
    expect(item.kind).toBe("instances");
    if (item.kind !== "instances") return;
    const count = item.batches.reduce((n, b) => n + b.count, 0);
    expect(item.batches.map((b) => b.assetId)).toEqual(["rivet"]);
    expect(count).toBe(expected);
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
