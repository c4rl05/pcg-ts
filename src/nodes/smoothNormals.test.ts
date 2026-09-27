/**
 * smoothNormals: the crease-angle normal rewrite. What it must hold:
 * a faceted cylinder's walls shade radial, a box's edges stay split, the
 * caps stay flat, topology and every other attribute pass through
 * untouched, and the answer does not depend on the input's point order.
 */
import { describe, expect, it } from "vitest";
import { createPolyline, createTriangleMesh, type Geometry } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import {
  extrudePolygon,
  meshPrimitive,
  smoothNormals,
  type ExtrudePolygonParams,
  type SmoothNormalsParams,
} from "./index.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";

/** A closed n-gon of radius r in the xz plane, centred on the origin. */
function ngon(n: number, r: number): Geometry {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pos.push(r * Math.cos(a), 0, r * Math.sin(a));
  }
  return createPolyline(pos, { closed: true });
}

async function extrude(input: Geometry, params: Partial<ExtrudePolygonParams> = {}): Promise<Geometry> {
  return firstGeo((await runNode(extrudePolygon, params, { in: [makeGeometryItem(input)] })).out);
}

async function smooth(input: Geometry, params: Partial<SmoothNormalsParams> = {}): Promise<Geometry> {
  return firstGeo((await runNode(smoothNormals, params, { in: [makeGeometryItem(input)] })).out);
}

const deg = (rad: number): number => (rad * 180) / Math.PI;

/** Angle in degrees between two 3-vectors. */
function between(a: readonly number[], b: readonly number[]): number {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return deg(Math.acos(Math.min(1, Math.max(-1, c))));
}

describe("smoothNormals", () => {
  it("shades a 16-sided extruded cylinder radially on its walls and keeps its caps flat", async () => {
    const solid = await extrude(ngon(16, 1.5), { distance: 6 });
    const out = await smooth(solid);
    const P = out.attrs.point.require("P");
    const N = out.attrs.point.require("normal");
    let walls = 0;
    let caps = 0;
    for (let p = 0; p < out.pointCount; p++) {
      const [x, y, z] = P.getTuple(p);
      const n = N.getTuple(p);
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 6);
      const before = solid.attrs.point.require("normal").getTuple(p);
      if (Math.abs(before[1]) > 0.5) {
        // A cap point: the cap is 90 degrees from every wall, so it stays
        // exactly the cap's normal.
        expect(between(n, before)).toBeLessThan(1e-4);
        caps++;
      } else {
        // A wall point sits on a polygon corner: the radial direction.
        expect(between(n, [x, 0, z])).toBeLessThan(1e-4);
        walls++;
      }
      void y;
    }
    expect(walls).toBe(16 * 4);
    expect(caps).toBe(16 * 2);
  });

  it("keeps every edge of a box split: its normals are unchanged", async () => {
    const box = firstGeo((await runNode(meshPrimitive, { shape: "box", size: [2, 1, 3] }, {})).out);
    const out = await smooth(box, { angle: 60 });
    // meshPrimitive writes no normal by default; the rewrite must give
    // each point its own face's axis and nothing else.
    const N = out.attrs.point.require("normal");
    for (let p = 0; p < out.pointCount; p++) {
      const n = N.getTuple(p);
      const axes = n.map((c) => Math.abs(c));
      expect(Math.max(...axes)).toBeCloseTo(1, 9);
      expect(axes.filter((c) => c < 1e-9).length).toBe(2);
    }
  });

  it("an octagon keeps its 45-degree edges at the default angle and smooths them above it", async () => {
    const solid = await extrude(ngon(8, 1), { distance: 1, caps: "none" });
    const sharp = await smooth(solid);
    const round = await smooth(solid, { angle: 50 });
    const before = solid.attrs.point.require("normal");
    const S = sharp.attrs.point.require("normal");
    const R = round.attrs.point.require("normal");
    const P = solid.attrs.point.require("P");
    for (let p = 0; p < solid.pointCount; p++) {
      expect(between(S.getTuple(p), before.getTuple(p))).toBeLessThan(1e-4);
      const [x, , z] = P.getTuple(p);
      expect(between(R.getTuple(p), [x, 0, z])).toBeLessThan(1e-4);
    }
  });

  it("angle 0 is flat shading: every point keeps its own face's normal", async () => {
    const solid = await extrude(ngon(24, 2), { distance: 3 });
    const out = await smooth(solid, { angle: 0 });
    const A = solid.attrs.point.require("normal");
    const B = out.attrs.point.require("normal");
    for (let p = 0; p < solid.pointCount; p++) expect(between(A.getTuple(p), B.getTuple(p))).toBeLessThan(1e-4);
  });

  it("changes no topology and no attribute but normal", async () => {
    const solid = await extrude(ngon(12, 1), { distance: 2 });
    const out = await smooth(solid);
    expect(out.pointCount).toBe(solid.pointCount);
    expect(out.primitiveCount).toBe(solid.primitiveCount);
    expect(Array.from(out.vertexToPoint)).toEqual(Array.from(solid.vertexToPoint));
    expect(Array.from(out.primVertexStart)).toEqual(Array.from(solid.primVertexStart));
    for (const name of solid.attrs.point.names()) {
      if (name === "normal") continue;
      expect(Array.from(out.attrs.point.require(name).data)).toEqual(Array.from(solid.attrs.point.require(name).data));
    }
    // And the input is not written through the shared storage.
    const again = await extrude(ngon(12, 1), { distance: 2 });
    expect(Array.from(solid.attrs.point.require("normal").data)).toEqual(
      Array.from(again.attrs.point.require("normal").data),
    );
  });

  it("welds separate pieces by position: two staves meeting edge to edge shade as one surface", async () => {
    // Two quads of a 12-sided ring, each its own points (as separate prisms'
    // walls are), sharing an edge only by position.
    const a0 = 0;
    const a1 = Math.PI / 6;
    const a2 = Math.PI / 3;
    const at = (a: number, y: number): number[] => [Math.cos(a), y, Math.sin(a)];
    const quad = (u: number, v: number): number[] => [...at(u, 0), ...at(v, 0), ...at(v, 1), ...at(u, 1)];
    const pos = [...quad(a0, a1), ...quad(a1, a2)];
    // Wound so the faces point outward (+radial).
    const tris = [0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6];
    const mesh = createTriangleMesh(pos, tris);
    const out = await smooth(mesh);
    const N = out.attrs.point.require("normal");
    // The shared edge: points 1, 2 (first quad) and 4, 7 (second) all sit at
    // angle a1 and must all face along it.
    for (const p of [1, 2, 4, 7]) expect(between(N.getTuple(p), [Math.cos(a1), 0, Math.sin(a1)])).toBeLessThan(1e-4);
    // weldDistance 0: nothing is shared, so each stave stays flat.
    const flat = await smooth(mesh, { weldDistance: 0 });
    const F = flat.attrs.point.require("normal");
    expect(between(F.getTuple(1), [Math.cos(a1 / 2), 0, Math.sin(a1 / 2)])).toBeLessThan(1e-4);
    expect(between(F.getTuple(4), [Math.cos((a1 + a2) / 2), 0, Math.sin((a1 + a2) / 2)])).toBeLessThan(1e-4);
  });

  it("is a function of the geometry, not of its point order", async () => {
    const solid = await extrude(ngon(20, 1.3), { distance: 0.7 });
    const out = await smooth(solid);
    // Reverse the point order and remap the triangles to match.
    const n = solid.pointCount;
    const P = solid.attrs.point.require("P");
    const pos: number[] = [];
    for (let p = n - 1; p >= 0; p--) pos.push(...P.getTuple(p));
    const tris: number[] = [];
    for (let t = 0; t < solid.primitiveCount; t++) {
      const v = solid.primVertexStart[t];
      for (let k = 0; k < 3; k++) tris.push(n - 1 - solid.vertexToPoint[v + k]);
    }
    const flipped = await smooth(createTriangleMesh(pos, tris));
    const A = out.attrs.point.require("normal");
    const B = flipped.attrs.point.require("normal");
    for (let p = 0; p < n; p++) expect(between(A.getTuple(p), B.getTuple(n - 1 - p))).toBeLessThan(1e-4);
  });

  it("refuses a path with no faces, by name", async () => {
    await expect(smooth(createPolyline([0, 0, 0, 1, 0, 0, 1, 1, 0]))).rejects.toThrow(/smoothNormals: .*no 'poly' primitive/);
  });

  it("refuses an angle out of range", async () => {
    const solid = await extrude(ngon(6, 1), { distance: 1 });
    await expect(smooth(solid, { angle: 200 })).rejects.toThrow(/smoothNormals: param "angle"/);
  });
});
