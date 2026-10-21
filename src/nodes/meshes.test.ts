/**
 * meshPrimitive — the library's only serializable source of mesh
 * geometry. The tests below check the three things downstream nodes
 * actually depend on: triangle topology they can read, a normal
 * direction they can trust, and uvs that cover the surface.
 */
import { describe, expect, it } from "vitest";
import { PRIMTYPE_ATTR, createPolyline, type Geometry } from "../data/index.js";
import { Graph, cook, makeGeometryItem } from "../graph/index.js";
import {
  deserializeGraph,
  mergePrimitives,
  meshPrimitive,
  surfaceSample,
  sweepProfile,
  transferAttribute,
  serializeGraph,
  type MeshPrimitiveParams,
} from "./index.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

async function mesh(params: Partial<MeshPrimitiveParams> = {}): Promise<Geometry> {
  return firstGeo((await runNode(meshPrimitive, params)).out);
}

/** Unit normal of triangle `t`, from the winding. */
function triangleNormal(geo: Geometry, t: number): number[] {
  const P = geo.attrs.point.require("P");
  const v = geo.primVertexStart[t];
  const [a, b, c] = [0, 1, 2].map((k) => P.getTuple(geo.vertexToPoint[v + k]));
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const len = Math.hypot(n[0], n[1], n[2]);
  // `+ 0` canonicalizes -0, which the sign of a zero component is free to
  // be and which deep equality distinguishes.
  return n.map((c2) => c2 / len + 0);
}

/** Sum of triangle areas. */
function surfaceArea(geo: Geometry): number {
  const P = geo.attrs.point.require("P");
  let total = 0;
  for (let t = 0; t < geo.primitiveCount; t++) {
    const v = geo.primVertexStart[t];
    const [a, b, c] = [0, 1, 2].map((k) => P.getTuple(geo.vertexToPoint[v + k]));
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    total +=
      Math.hypot(
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
      ) / 2;
  }
  return total;
}

describe("meshPrimitive plane", () => {
  it("is one quad of two triangles by default, sized and centered as asked", async () => {
    const geo = await mesh({ size: [4, 0, 6] });
    expect(geo.pointCount).toBe(4);
    expect(geo.primitiveCount).toBe(2);
    expect(geo.vertexCount).toBe(6);
    const P = geo.attrs.point.require("P");
    expect([0, 1, 2, 3].map((i) => P.getTuple(i))).toEqual([
      [-2, 0, -3],
      [2, 0, -3],
      [-2, 0, 3],
      [2, 0, 3],
    ]);
    expect(geo.attrs.primitive.require(PRIMTYPE_ATTR).getString(0)).toBe("poly");
  });

  it("subdivides per world axis, u fastest", async () => {
    const geo = await mesh({ size: [2, 0, 2], subdivisions: [2, 1, 3] });
    // 3 columns along x, 4 rows along z.
    expect(geo.pointCount).toBe(3 * 4);
    expect(geo.primitiveCount).toBe(2 * 3 * 2);
    const P = geo.attrs.point.require("P");
    expect(P.getTuple(0)).toEqual([-1, 0, -1]);
    expect(P.getTuple(1)).toEqual([0, 0, -1]);
    expect(P.getTuple(2)).toEqual([1, 0, -1]);
    // Row 1 is one third of the way along z.
    expect(P.getTuple(3)[2]).toBeCloseTo(-1 + 2 / 3, 6);
    // Area is preserved by subdivision.
    expect(surfaceArea(geo)).toBeCloseTo(4, 5);
  });

  it("faces the positive third axis in every orientation, and flip reverses it", async () => {
    for (const [orientation, normal] of [
      ["xz", [0, 1, 0]],
      ["xy", [0, 0, 1]],
      ["yz", [1, 0, 0]],
    ] as const) {
      const geo = await mesh({ orientation, subdivisions: [2, 2, 2] });
      for (let t = 0; t < geo.primitiveCount; t++) {
        expect(triangleNormal(geo, t), `${orientation} tri ${t}`).toEqual(normal);
      }
      const flipped = await mesh({ orientation, subdivisions: [2, 2, 2], flip: true });
      for (let t = 0; t < flipped.primitiveCount; t++) {
        expect(triangleNormal(flipped, t), `${orientation} flipped tri ${t}`).toEqual(
          normal.map((c) => -c || 0),
        );
      }
    }
  });

  it("writes uvs covering 0..1 in both directions", async () => {
    const geo = await mesh({ subdivisions: [2, 1, 2] });
    const uv = geo.attrs.point.require("uv");
    expect(uv.type).toBe("f32");
    expect(uv.tupleSize).toBe(2);
    expect(uv.getTuple(0)).toEqual([0, 0]);
    expect(uv.getTuple(geo.pointCount - 1)).toEqual([1, 1]);
    expect(uv.getTuple(1)).toEqual([0.5, 0]);
  });

  it("the plane's normal-axis size component is ignored", async () => {
    const a = await mesh({ size: [4, 0, 6] });
    const b = await mesh({ size: [4, 99, 6] });
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });
});

describe("meshPrimitive box", () => {
  it("closes six faces with unshared points and outward normals", async () => {
    const geo = await mesh({ shape: "box", size: [2, 2, 2] });
    expect(geo.pointCount).toBe(6 * 4);
    expect(geo.primitiveCount).toBe(6 * 2);
    expect(surfaceArea(geo)).toBeCloseTo(24, 5);
    // Every face normal points away from the center.
    const P = geo.attrs.point.require("P");
    for (let t = 0; t < geo.primitiveCount; t++) {
      const n = triangleNormal(geo, t);
      const v = geo.primVertexStart[t];
      const a = P.getTuple(geo.vertexToPoint[v]);
      expect(n[0] * a[0] + n[1] * a[1] + n[2] * a[2], `tri ${t} faces outward`).toBeGreaterThan(0);
    }
  });

  it("flip turns it inward", async () => {
    const geo = await mesh({ shape: "box", size: [2, 2, 2], flip: true });
    const P = geo.attrs.point.require("P");
    for (let t = 0; t < geo.primitiveCount; t++) {
      const n = triangleNormal(geo, t);
      const a = P.getTuple(geo.vertexToPoint[geo.primVertexStart[t]]);
      expect(n[0] * a[0] + n[1] * a[1] + n[2] * a[2], `tri ${t} faces inward`).toBeLessThan(0);
    }
  });

  it("subdivides every face by the two axes that span it", async () => {
    const geo = await mesh({ shape: "box", size: [2, 2, 2], subdivisions: [2, 3, 4] });
    // +-x faces span (y, z): 3*4 quads; +-y span (z, x): 4*2; +-z span (x, y): 2*3.
    expect(geo.primitiveCount).toBe(2 * 2 * (3 * 4 + 4 * 2 + 2 * 3));
    expect(surfaceArea(geo)).toBeCloseTo(24, 5);
    expect(geo.pointCount).toBe(2 * (4 * 5 + 5 * 3 + 3 * 4));
  });

  it("centers where asked", async () => {
    const geo = await mesh({ shape: "box", size: [2, 2, 2], center: [10, 20, 30] });
    const P = geo.attrs.point.require("P");
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < geo.pointCount; i++) {
      minX = Math.min(minX, P.get(i, 0));
      maxX = Math.max(maxX, P.get(i, 0));
    }
    expect([minX, maxX]).toEqual([9, 11]);
  });
});

/**
 * Every triangle's three points carry exactly the normal its winding
 * gives. Stronger than "normals agree with the winding" (a positive dot):
 * a flat face has one right answer, so the column must be it bit for bit.
 */
function expectFlatNormalsMatchWinding(geo: Geometry, label: string): void {
  const N = geo.attrs.point.require("normal");
  expect(N.type).toBe("f32");
  expect(N.tupleSize).toBe(3);
  for (let t = 0; t < geo.primitiveCount; t++) {
    const face = triangleNormal(geo, t);
    const v = geo.primVertexStart[t];
    for (let k = 0; k < 3; k++) {
      expect(
        N.getTuple(geo.vertexToPoint[v + k]).map((c) => c + 0),
        `${label} tri ${t} corner ${k}`,
      ).toEqual(face);
    }
  }
}

describe("meshPrimitive normal", () => {
  it("writes none by default, so the renderer computes one from wherever P ends up", async () => {
    for (const shape of ["plane", "box"] as const) {
      const geo = await mesh({ shape });
      expect(geo.attrs.point.get("normal"), shape).toBeUndefined();
    }
  });

  it("writes each plane's face normal on every point, for every orientation and both windings", async () => {
    for (const orientation of ["xz", "xy", "yz"] as const) {
      for (const flip of [false, true]) {
        const geo = await mesh({ orientation, flip, subdivisions: [3, 2, 4], normals: true });
        expectFlatNormalsMatchWinding(geo, `${orientation} flip=${flip}`);
      }
    }
    // The direction, not only the agreement: the default ground plane faces up.
    const ground = await mesh({ normals: true });
    const N = ground.attrs.point.require("normal");
    for (let i = 0; i < ground.pointCount; i++) expect(N.getTuple(i).map((c) => c + 0)).toEqual([0, 1, 0]);
  });

  it("splits a box's corners: every point carries its own face's outward axis, in face order", async () => {
    const geo = await mesh({ shape: "box", size: [3, 1, 2], subdivisions: [2, 3, 1], normals: true });
    expectFlatNormalsMatchWinding(geo, "box");
    // Face blocks run +x, -x, +y, -y, +z, -z; each block's first point
    // carries that block's axis.
    const N = geo.attrs.point.require("normal");
    const blockSizes = [
      (3 + 1) * (1 + 1), (3 + 1) * (1 + 1), // x faces span (y, z): (3+1) x (1+1)
      (1 + 1) * (2 + 1), (1 + 1) * (2 + 1), // y faces span (z, x)
      (2 + 1) * (3 + 1), (2 + 1) * (3 + 1), // z faces span (x, y)
    ];
    const axes = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    let at = 0;
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < blockSizes[f]; i++) {
        expect(N.getTuple(at + i).map((c) => c + 0), `face ${f} point ${i}`).toEqual(axes[f]);
      }
      at += blockSizes[f];
    }
    expect(at).toBe(geo.pointCount);
  });

  it("flip turns the written normal inward together with the winding", async () => {
    const out = await mesh({ shape: "box", size: [2, 2, 2], normals: true });
    const inward = await mesh({ shape: "box", size: [2, 2, 2], flip: true, normals: true });
    expectFlatNormalsMatchWinding(inward, "flipped box");
    const A = out.attrs.point.require("normal");
    const B = inward.attrs.point.require("normal");
    for (let i = 0; i < out.pointCount; i++) {
      expect(B.getTuple(i).map((c) => c + 0)).toEqual(A.getTuple(i).map((c) => -c + 0));
    }
  });

  it("keeps a unit normal on a zero-area face rather than a zero one", async () => {
    const geo = await mesh({ shape: "box", size: [2, 0, 2], normals: true });
    const N = geo.attrs.point.require("normal");
    for (let i = 0; i < geo.pointCount; i++) expect(Math.hypot(...N.getTuple(i))).toBe(1);
  });

  it("adds only the column: points, uv and triangles are the bytes they are without it", async () => {
    const params: Partial<MeshPrimitiveParams> = { shape: "box", size: [3, 1, 2], subdivisions: [2, 2, 2] };
    const plain = await mesh(params);
    const lit = await mesh({ ...params, normals: true });
    expect([...lit.attrs.point.names()].sort()).toEqual(["P", "normal", "uv"].sort());
    lit.attrs.point.remove("normal");
    expect(snapshotGeometry(lit)).toEqual(snapshotGeometry(plain));
  });

  it("merged with a sweep, no point ends up with the zero normal a missing column fills with", async () => {
    // The trap this closes: mergePrimitives fills an attribute one input
    // lacks with its default, which for `normal` is (0, 0, 0) — and a lit
    // material shades that black.
    const tube = firstGeo(
      (
        await runNode(
          sweepProfile,
          { radius: 0.2 },
          { in: [makeGeometryItem(createPolyline([0, 0, 0, 3, 0, 0]))] },
        )
      ).out,
    );
    const merge = async (box: Geometry): Promise<Geometry> =>
      firstGeo(
        (await runNode(mergePrimitives, {}, { in: [makeGeometryItem(box), makeGeometryItem(tube)] }))
          .out,
      );
    const merged = await merge(await mesh({ shape: "box", size: [1, 1, 1], normals: true }));
    const N = merged.attrs.point.require("normal");
    for (let i = 0; i < merged.pointCount; i++) {
      expect(Math.hypot(...N.getTuple(i)), `point ${i}`).toBeGreaterThan(0.99);
    }
    // CONTROL: the trap is real without the switch — the box's 24 points
    // come out of the merge with (0, 0, 0).
    const trapped = await merge(await mesh({ shape: "box", size: [1, 1, 1] }));
    const Z = trapped.attrs.point.require("normal");
    for (let i = 0; i < 24; i++) expect(Z.getTuple(i).map((c) => c + 0)).toEqual([0, 0, 0]);
  });
});

describe("meshPrimitive contracts", () => {
  it("is deterministic and seed-independent", async () => {
    const params: Partial<MeshPrimitiveParams> = {
      shape: "box",
      size: [3, 1, 2],
      subdivisions: [2, 2, 2],
    };
    const a = firstGeo((await runNode(meshPrimitive, params, {}, 1)).out);
    const b = firstGeo((await runNode(meshPrimitive, params, {}, 1)).out);
    const c = firstGeo((await runNode(meshPrimitive, params, {}, 999999)).out);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("rejects fractional subdivision counts, naming the axis and the fix", async () => {
    await expect(runNode(meshPrimitive, { subdivisions: [1, 1, 2.5] })).rejects.toThrow(
      /subdivisions\.z is 2\.5.*whole numbers >= 1.*use 3/s,
    );
  });

  it("a zero extent still builds, with zero-area triangles", async () => {
    const geo = await mesh({ orientation: "xy", size: [0, 4, 0] });
    expect(geo.primitiveCount).toBe(2);
    expect(surfaceArea(geo)).toBe(0);
  });

  it("feeds surfaceSample, the reason it exists", async () => {
    const surface = await mesh({ size: [10, 0, 10], subdivisions: [4, 1, 4] });
    const sampled = firstGeo(
      (await runNode(surfaceSample, { count: 200 }, { in: [makeGeometryItem(surface)] })).out,
    );
    expect(sampled.pointCount).toBe(200);
    const P = sampled.attrs.point.require("P");
    for (let i = 0; i < sampled.pointCount; i++) {
      expect(P.get(i, 1)).toBe(0);
      expect(Math.abs(P.get(i, 0))).toBeLessThanOrEqual(5);
      expect(Math.abs(P.get(i, 2))).toBeLessThanOrEqual(5);
    }
    // The flat normal is the plane's own.
    expect(sampled.attrs.point.require("normal").getTuple(0).map((c) => c + 0)).toEqual([0, 1, 0]);
  });

  it("feeds transferAttribute's raycast mapping — the drop-to-surface path", async () => {
    const surface = await mesh({ size: [10, 0, 10], center: [0, -3, 0] });
    const points = firstGeo(
      (await runNode(meshPrimitive, { size: [4, 0, 4], subdivisions: [3, 1, 3] })).out,
    );
    const dropped = firstGeo(
      (
        await runNode(
          transferAttribute,
          { name: "P", mapping: "raycast", direction: [0, -1, 0] },
          { in: [makeGeometryItem(points)], source: [makeGeometryItem(surface)] },
        )
      ).out,
    );
    const P = dropped.attrs.point.require("P");
    for (let i = 0; i < dropped.pointCount; i++) {
      expect(P.get(i, 1), `point ${i} landed on the surface`).toBeCloseTo(-3, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// cylinder and disc
// ---------------------------------------------------------------------------

/** Every -0 any point column carries, by name, point and component. */
function negativeZeros(geo: Geometry): string[] {
  const found: string[] = [];
  for (const name of geo.attrs.point.names()) {
    const a = geo.attrs.point.require(name);
    for (let i = 0; i < geo.pointCount; i++) {
      a.getTuple(i).forEach((c, k) => {
        if (Object.is(c, -0)) found.push(`${name}[${i}].${k}`);
      });
    }
  }
  return found;
}

/** [min, max] of P per axis. */
function bounds(geo: Geometry): [number[], number[]] {
  const P = geo.attrs.point.require("P");
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < geo.pointCount; i++) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], P.get(i, a));
      hi[a] = Math.max(hi[a], P.get(i, a));
    }
  }
  return [lo, hi];
}

/** Points welded by exact position: id per point, and the welded count. */
function weld(geo: Geometry): { id: number[]; count: number } {
  const P = geo.attrs.point.require("P");
  const ids = new Map<string, number>();
  const id: number[] = [];
  for (let i = 0; i < geo.pointCount; i++) {
    const key = P.getTuple(i).join(",");
    let w = ids.get(key);
    if (w === undefined) {
      w = ids.size;
      ids.set(key, w);
    }
    id.push(w);
  }
  return { id, count: ids.size };
}

/**
 * Directed-edge use per undirected edge, with points WELDED by position:
 * a cylinder's caps share no points with its wall and its seam column is
 * duplicated, so closure is a statement about positions, not indices.
 */
function weldedEdges(geo: Geometry): Map<string, { fwd: number; back: number }> {
  const { id } = weld(geo);
  const edges = new Map<string, { fwd: number; back: number }>();
  for (let t = 0; t < geo.primitiveCount; t++) {
    const v = geo.primVertexStart[t];
    const w = [0, 1, 2].map((k) => id[geo.vertexToPoint[v + k]]);
    for (let k = 0; k < 3; k++) {
      const a = w[k];
      const b = w[(k + 1) % 3];
      expect(a, `tri ${t} has a collapsed edge`).not.toBe(b);
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const e = edges.get(key) ?? { fwd: 0, back: 0 };
      if (a < b) e.fwd++;
      else e.back++;
      edges.set(key, e);
    }
  }
  return edges;
}

/** Every triangle faces away from (sign 1) or toward (-1) the point `c`. */
function expectFacing(geo: Geometry, c: readonly number[], sign: 1 | -1, label: string): void {
  const P = geo.attrs.point.require("P");
  for (let t = 0; t < geo.primitiveCount; t++) {
    const n = triangleNormal(geo, t);
    const v = geo.primVertexStart[t];
    const pts = [0, 1, 2].map((k) => P.getTuple(geo.vertexToPoint[v + k]));
    const g = [0, 1, 2].map((a) => (pts[0][a] + pts[1][a] + pts[2][a]) / 3 - c[a]);
    const dot = n[0] * g[0] + n[1] * g[1] + n[2] * g[2];
    if (sign > 0) expect(dot, `${label} tri ${t} faces outward`).toBeGreaterThan(0);
    else expect(dot, `${label} tri ${t} faces inward`).toBeLessThan(0);
  }
}

/** Area of the `sides`-gon inscribed in an ellipse of radii a, b at equal angle steps. */
function inscribedArea(sides: number, a: number, b: number): number {
  return (sides / 2) * a * b * Math.sin((2 * Math.PI) / sides);
}

/** Perimeter of that polygon. */
function inscribedPerimeter(sides: number, a: number, b: number): number {
  let total = 0;
  for (let k = 0; k < sides; k++) {
    const t0 = (2 * Math.PI * k) / sides;
    const t1 = (2 * Math.PI * (k + 1)) / sides;
    total += Math.hypot(a * (Math.sin(t1) - Math.sin(t0)), b * (Math.cos(t1) - Math.cos(t0)));
  }
  return total;
}

describe("meshPrimitive cylinder", () => {
  it("counts: one wall band of sides + 1 seam-duplicated columns, two corner-fan caps", async () => {
    const geo = await mesh({ shape: "cylinder", sides: 12 });
    // Wall: 2 rings x 13 points, 12 quads; each cap 12 corners, 10 triangles.
    expect(geo.pointCount).toBe(2 * 13 + 2 * 12);
    expect(geo.primitiveCount).toBe(2 * 12 + 2 * 10);
    expect(geo.vertexCount).toBe(3 * geo.primitiveCount);
    const kind = geo.attrs.primitive.require(PRIMTYPE_ATTR);
    for (let t = 0; t < geo.primitiveCount; t++) expect(kind.getString(t)).toBe("poly");
    // subdivisions.y cuts the wall into bands; x and z are not read.
    const banded = await mesh({ shape: "cylinder", sides: 12, subdivisions: [5, 3, 7] });
    expect(banded.pointCount).toBe(4 * 13 + 2 * 12);
    expect(banded.primitiveCount).toBe(3 * 2 * 12 + 2 * 10);
    const sameXZ = await mesh({ shape: "cylinder", sides: 12, subdivisions: [1, 3, 1] });
    expect(snapshotGeometry(sameXZ)).toEqual(snapshotGeometry(banded));
    // orientation is not read either.
    const turned = await mesh({ shape: "cylinder", sides: 12, subdivisions: [1, 3, 1], orientation: "yz" });
    expect(snapshotGeometry(turned)).toEqual(snapshotGeometry(banded));
  });

  it("caps closes exactly the ends it names", async () => {
    const wall = { points: 2 * 9, tris: 2 * 8 };
    for (const [caps, n, ys] of [
      ["both", 2, [1, -1]],
      ["top", 1, [1]],
      ["bottom", 1, [-1]],
      ["none", 0, []],
    ] as const) {
      const geo = await mesh({ shape: "cylinder", sides: 8, caps, size: [2, 2, 2] });
      expect(geo.pointCount, caps).toBe(wall.points + n * 8);
      expect(geo.primitiveCount, caps).toBe(wall.tris + n * 6);
      // Which end: the y of each cap block, in block order (top first).
      const P = geo.attrs.point.require("P");
      const capYs: number[] = [];
      for (let i = wall.points; i < geo.pointCount; i += 8) capYs.push(P.get(i, 1));
      expect(capYs, caps).toEqual(ys);
    }
  });

  it("faces outward everywhere — wall and both caps — and flip turns all of it inward", async () => {
    const params: Partial<MeshPrimitiveParams> = {
      shape: "cylinder",
      size: [3, 2, 1.5],
      center: [4, -1, 2],
      sides: 7,
      subdivisions: [1, 2, 1],
    };
    expectFacing(await mesh(params), [4, -1, 2], 1, "cylinder");
    expectFacing(await mesh({ ...params, flip: true }), [4, -1, 2], -1, "flipped cylinder");
    // The caps by their own normal: the top faces +y, the bottom -y.
    const geo = await mesh({ ...params, sides: 8 });
    const wallTris = 2 * 2 * 8;
    for (let t = wallTris; t < wallTris + 6; t++) expect(triangleNormal(geo, t)).toEqual([0, 1, 0]);
    for (let t = wallTris + 6; t < wallTris + 12; t++) expect(triangleNormal(geo, t)).toEqual([0, -1, 0]);
  });

  it("winds as the box does: the same quad pattern, outward, u left to right seen from outside", async () => {
    const box = await mesh({ shape: "box", size: [2, 2, 2] });
    const cyl = await mesh({ shape: "cylinder", size: [2, 2, 2], sides: 4 });
    // The box's +z face (block 4, after four 4-point blocks) faces +z and
    // its u runs toward +x; the cylinder's first corner sits on +z and its
    // ring turns toward +x.
    expect(triangleNormal(box, 8)).toEqual([0, 0, 1]);
    const BP = box.attrs.point.require("P");
    expect(BP.get(17, 0)).toBeGreaterThan(BP.get(16, 0));
    const P = cyl.attrs.point.require("P");
    const uv = cyl.attrs.point.require("uv");
    expect(P.getTuple(0)).toEqual([0, -1, 1]);
    expect(P.getTuple(1)).toEqual([1, -1, 0]);
    expect(uv.getTuple(0)[0]).toBeLessThan(uv.getTuple(1)[0]);
    // So the first quad faces out of the edge between +z and +x.
    const n = triangleNormal(cyl, 0);
    expect(n[0]).toBeCloseTo(Math.SQRT1_2, 6);
    expect(n[1]).toBe(0);
    expect(n[2]).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("its bounds are the size exactly when sides is a multiple of 4 — the brick house's stud in one node", async () => {
    // graphs/examples-brick-house.json's stud: radius 0.3 at 12 segments,
    // 0.2125 tall, its base at y = -0.02.
    const stud = await mesh({
      shape: "cylinder",
      sides: 12,
      size: [0.6, 0.2125, 0.6],
      center: [0, -0.02 + 0.2125 / 2, 0],
    });
    const f = Math.fround;
    expect(bounds(stud)).toEqual([
      [f(-0.3), f(-0.02), f(-0.3)],
      [f(0.3), f(-0.02 + 0.2125), f(0.3)],
    ]);
    // Elliptic: unequal x and z diameters.
    const ellipse = await mesh({ shape: "cylinder", sides: 16, size: [4, 2, 1], center: [1, 2, 3] });
    expect(bounds(ellipse)).toEqual([
      [-1, 1, 2.5],
      [3, 3, 3.5],
    ]);
    // Not a multiple of 4: corners are inscribed, so only the quarter
    // turns that are corners are reached — here +z and -z, not x.
    const hex = await mesh({ shape: "cylinder", sides: 6, size: [2, 2, 2] });
    const [lo, hi] = bounds(hex);
    expect([lo[2], hi[2]]).toEqual([-1, 1]);
    expect(hi[0]).toBeCloseTo(Math.sin(Math.PI / 3), 6);
    expect(hi[0]).toBeLessThan(1);
  });

  it("is a closed manifold when capped: every welded edge used exactly twice, once each way", async () => {
    for (const sides of [3, 4, 7, 12]) {
      for (const flip of [false, true]) {
        const geo = await mesh({ shape: "cylinder", sides, size: [1, 0.5, 2], subdivisions: [1, 3, 1], flip });
        const edges = weldedEdges(geo);
        for (const [key, e] of edges) {
          expect(e, `sides ${sides} flip ${flip} edge ${key}`).toEqual({ fwd: 1, back: 1 });
        }
        // Euler characteristic of a closed genus-0 surface: V - E + F = 2.
        expect(weld(geo).count - edges.size + geo.primitiveCount, `sides ${sides}`).toBe(2);
      }
    }
  });

  it("leaves open exactly the rims it does not cap", async () => {
    for (const [caps, openRims] of [
      ["top", 1],
      ["bottom", 1],
      ["none", 2],
    ] as const) {
      const geo = await mesh({ shape: "cylinder", sides: 9, caps });
      const edges = [...weldedEdges(geo).values()];
      expect(edges.filter((e) => e.fwd + e.back === 1).length, caps).toBe(openRims * 9);
      for (const e of edges) if (e.fwd + e.back !== 1) expect(e, caps).toEqual({ fwd: 1, back: 1 });
    }
  });

  it("the seam column is bit-identical to the first, with u = 1 instead of 0", async () => {
    const geo = await mesh({ shape: "cylinder", sides: 7, size: [3, 2, 5], subdivisions: [1, 2, 1] });
    const P = geo.attrs.point.require("P");
    const uv = geo.attrs.point.require("uv");
    for (let r = 0; r <= 2; r++) {
      const first = r * 8;
      const seam = first + 7;
      expect(P.getTuple(seam)).toEqual(P.getTuple(first));
      expect(uv.getTuple(first)).toEqual([0, r / 2]);
      expect(uv.getTuple(seam)).toEqual([1, r / 2]);
    }
    // Cap uv is the planar map of the section into 0..1.
    for (let i = 3 * 8; i < geo.pointCount; i++) {
      for (const c of uv.getTuple(i)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it("has the inscribed prism's area", async () => {
    for (const [sides, sx, sz] of [
      [12, 0.6, 0.6],
      [5, 4, 1],
    ] as const) {
      const geo = await mesh({ shape: "cylinder", sides, size: [sx, 2, sz] });
      const want = inscribedPerimeter(sides, sx / 2, sz / 2) * 2 + 2 * inscribedArea(sides, sx / 2, sz / 2);
      expect(surfaceArea(geo), `sides ${sides}`).toBeCloseTo(want, 5);
    }
  });

  it("writes the wall's smooth analytic normal and flat cap normals, and flip turns all of them", async () => {
    const sides = 10;
    for (const [sx, sz] of [
      [2, 2],
      [4, 1],
    ] as const) {
      for (const flip of [false, true]) {
        const geo = await mesh({ shape: "cylinder", sides, size: [sx, 1, sz], center: [1, 0, -2], flip, normals: true });
        const P = geo.attrs.point.require("P");
        const N = geo.attrs.point.require("normal");
        const s = flip ? -1 : 1;
        const wallPoints = 2 * (sides + 1);
        for (let i = 0; i < wallPoints; i++) {
          const n = N.getTuple(i);
          expect(Math.hypot(...n), `point ${i} unit`).toBeCloseTo(1, 6);
          expect(n[1]).toBe(0);
          // The ellipse's normal at (x, z) is the gradient of
          // (x/a)^2 + (z/b)^2: along ((x - cx)/a^2, (z - cz)/b^2).
          const gx = (P.get(i, 0) - 1) / (sx / 2) ** 2;
          const gz = (P.get(i, 2) + 2) / (sz / 2) ** 2;
          const gl = Math.hypot(gx, gz);
          expect(n[0], `${sx}x${sz} flip ${flip} point ${i} x`).toBeCloseTo((s * gx) / gl, 5);
          expect(n[2], `${sx}x${sz} flip ${flip} point ${i} z`).toBeCloseTo((s * gz) / gl, 5);
        }
        for (let i = wallPoints; i < wallPoints + sides; i++) expect(N.getTuple(i)).toEqual([0, s, 0]);
        for (let i = wallPoints + sides; i < geo.pointCount; i++) expect(N.getTuple(i)).toEqual([0, -s, 0]);
        // Curved, so not the per-corner flat check: the wall's normals
        // agree with its winding (a positive dot at every corner).
        for (let t = 0; t < 2 * sides; t++) {
          const face = triangleNormal(geo, t);
          const v = geo.primVertexStart[t];
          for (let k = 0; k < 3; k++) {
            const n = N.getTuple(geo.vertexToPoint[v + k]);
            expect(n[0] * face[0] + n[1] * face[1] + n[2] * face[2], `tri ${t} corner ${k}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("carries no -0 in P, uv or normal, even from a -0 center and a zero size", async () => {
    for (const shape of ["cylinder", "disc"] as const) {
      for (const flip of [false, true]) {
        for (const size of [
          [0, 0, 0],
          [2, 1, 2],
        ]) {
          const geo = await mesh({ shape, sides: 8, size, center: [-0, -0, -0], flip, normals: true });
          expect(negativeZeros(geo), `${shape} flip ${flip} size ${size.join(",")}`).toEqual([]);
          const N = geo.attrs.point.require("normal");
          for (let i = 0; i < geo.pointCount; i++) expect(Math.hypot(...N.getTuple(i))).toBeCloseTo(1, 6);
        }
      }
    }
  });

  it("adds only the column: points, uv and triangles are the bytes they are without it", async () => {
    const params: Partial<MeshPrimitiveParams> = { shape: "cylinder", sides: 9, size: [3, 1, 2], subdivisions: [1, 2, 1] };
    const plain = await mesh(params);
    const lit = await mesh({ ...params, normals: true });
    lit.attrs.point.remove("normal");
    expect(snapshotGeometry(lit)).toEqual(snapshotGeometry(plain));
  });

  it("feeds surfaceSample: every sample lands on the surface", async () => {
    const surface = await mesh({ shape: "cylinder", sides: 32, size: [2, 2, 2] });
    const sampled = firstGeo(
      (await runNode(surfaceSample, { count: 300 }, { in: [makeGeometryItem(surface)] })).out,
    );
    expect(sampled.pointCount).toBe(300);
    const P = sampled.attrs.point.require("P");
    const apothem = Math.cos(Math.PI / 32);
    let caps = 0;
    for (let i = 0; i < sampled.pointCount; i++) {
      const r = Math.hypot(P.get(i, 0), P.get(i, 2));
      const y = P.get(i, 1);
      const onCap = Math.abs(Math.abs(y) - 1) < 1e-6 && r <= 1 + 1e-6;
      const onWall = Math.abs(y) <= 1 + 1e-6 && r >= apothem - 1e-6 && r <= 1 + 1e-6;
      expect(onCap || onWall, `sample ${i} at r=${r} y=${y}`).toBe(true);
      if (onCap && r < apothem - 1e-3) caps++;
    }
    // Both kinds of face are reached: the caps are a third of the area.
    expect(caps).toBeGreaterThan(30);
  });
});

describe("meshPrimitive disc", () => {
  it("is one corner fan: sides points, sides - 2 triangles, no centre point", async () => {
    const geo = await mesh({ shape: "disc", sides: 12, size: [2, 0, 2] });
    expect(geo.pointCount).toBe(12);
    expect(geo.primitiveCount).toBe(10);
    const P = geo.attrs.point.require("P");
    for (let i = 0; i < geo.pointCount; i++) {
      expect(Math.hypot(P.get(i, 0), P.get(i, 2))).toBeCloseTo(1, 6);
      expect(P.get(i, 1)).toBe(0);
    }
    expect(surfaceArea(geo)).toBeCloseTo(inscribedArea(12, 1, 1), 5);
    // Subdivisions are not read, nor is the normal-axis size component.
    const other = await mesh({ shape: "disc", sides: 12, size: [2, 99, 2], subdivisions: [4, 5, 6] });
    expect(snapshotGeometry(other)).toEqual(snapshotGeometry(geo));
  });

  it("faces the positive third axis in every orientation, as the plane does, and flip reverses it", async () => {
    for (const [orientation, normal] of [
      ["xz", [0, 1, 0]],
      ["xy", [0, 0, 1]],
      ["yz", [1, 0, 0]],
    ] as const) {
      for (const flip of [false, true]) {
        const geo = await mesh({ shape: "disc", orientation, sides: 7, flip, normals: true });
        const want = normal.map((c) => (flip ? -c : c) + 0);
        for (let t = 0; t < geo.primitiveCount; t++) {
          expect(triangleNormal(geo, t), `${orientation} flip ${flip} tri ${t}`).toEqual(want);
        }
        expectFlatNormalsMatchWinding(geo, `disc ${orientation} flip=${flip}`);
      }
    }
  });

  it("its in-plane size components are diameters, its bounds the size, centred where asked", async () => {
    const geo = await mesh({ shape: "disc", orientation: "xy", sides: 8, size: [4, 2, 7], center: [1, 2, 3] });
    expect(bounds(geo)).toEqual([
      [-1, 1, 3],
      [3, 3, 3],
    ]);
    const uv = geo.attrs.point.require("uv");
    // u runs along the first in-plane axis and v along the second, as on
    // the plane: the first corner is on +v (+y for 'xy'), the third a
    // quarter turn on at +u (+x).
    expect(uv.getTuple(0)).toEqual([0.5, 1]);
    expect(uv.getTuple(2)).toEqual([1, 0.5]);
  });

  it("is the cylinder's cap: the same corners and the same uv", async () => {
    const disc = await mesh({ shape: "disc", sides: 9, size: [3, 0, 2], center: [1, 0.5, -1] });
    const cyl = await mesh({ shape: "cylinder", sides: 9, size: [3, 0, 2], center: [1, 0.5, -1], caps: "top" });
    const wallPoints = 2 * 10;
    const DP = disc.attrs.point.require("P");
    const CP = cyl.attrs.point.require("P");
    const Duv = disc.attrs.point.require("uv");
    const Cuv = cyl.attrs.point.require("uv");
    for (let i = 0; i < 9; i++) {
      expect(CP.getTuple(wallPoints + i)).toEqual(DP.getTuple(i));
      expect(Cuv.getTuple(wallPoints + i)).toEqual(Duv.getTuple(i));
    }
  });
});

describe("meshPrimitive cylinder and disc params", () => {
  it("writes no normal by default", async () => {
    for (const shape of ["cylinder", "disc"] as const) {
      expect((await mesh({ shape })).attrs.point.get("normal"), shape).toBeUndefined();
    }
  });

  it("is deterministic and seed-independent", async () => {
    const params: Partial<MeshPrimitiveParams> = { shape: "cylinder", sides: 11, size: [3, 1, 2], subdivisions: [1, 2, 1] };
    const a = firstGeo((await runNode(meshPrimitive, params, {}, 1)).out);
    const b = firstGeo((await runNode(meshPrimitive, params, {}, 1)).out);
    const c = firstGeo((await runNode(meshPrimitive, params, {}, 999999)).out);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("the schema refuses sides outside 3..256 or fractional, an unknown caps and an unknown shape, by param", () => {
    const g = new Graph(1);
    const m = g.add(meshPrimitive, { shape: "cylinder" }, "m");
    expect(() => g.setParam(m, "sides", 2)).toThrow(/param "sides": 2 is below the minimum 3/);
    expect(() => g.setParam(m, "sides", 257)).toThrow(/param "sides": 257 is above the maximum 256/);
    expect(() => g.setParam(m, "sides", 6.5)).toThrow(/param "sides": expected an integer, got 6\.5/);
    expect(() => g.setParam(m, "caps", "lid" as never)).toThrow(
      /param "caps": expected one of "none", "top", "bottom", "both", got "lid"/,
    );
    expect(() => g.setParam(m, "shape", "cone" as never)).toThrow(
      /param "shape": expected one of "plane", "box", "cylinder", "disc", got "cone"/,
    );
    expect(() => g.setParam(m, "sides", 3)).not.toThrow();
    expect(() => g.setParam(m, "caps", "none")).not.toThrow();
  });

  it("the node itself refuses what the schema would, naming the param and the valid values", async () => {
    await expect(runNode(meshPrimitive, { shape: "cylinder", sides: 2 })).rejects.toThrow(
      /sides is 2.*whole number of corners from 3 to 256; use 3/,
    );
    await expect(runNode(meshPrimitive, { shape: "disc", sides: 300 })).rejects.toThrow(/sides is 300.*use 256/);
    await expect(runNode(meshPrimitive, { shape: "cylinder", caps: "lid" as never })).rejects.toThrow(
      /unknown caps "lid"; valid caps: none, top, bottom, both/,
    );
    await expect(runNode(meshPrimitive, { shape: "cone" as never })).rejects.toThrow(
      /unknown shape "cone"; valid shapes: plane, box, cylinder, disc/,
    );
  });

  it("round-trips through graph JSON and cooks byte-identically", async () => {
    const build = (): Graph => {
      const g = new Graph(5);
      const stud = g.add(
        meshPrimitive,
        {
          shape: "cylinder",
          sides: 12,
          caps: "top",
          size: [0.6, 0.2125, 0.6],
          center: [0, 0.08625, 0],
          subdivisions: [1, 2, 1],
          normals: true,
        },
        "stud",
      );
      const disc = g.add(meshPrimitive, { shape: "disc", orientation: "yz", sides: 5, flip: true }, "disc");
      g.output(stud, "out", "stud");
      g.output(disc, "out", "disc");
      return g;
    };
    const text = JSON.stringify(serializeGraph(build()));
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const saved = JSON.parse(text) as { nodes: { id: string; params: Record<string, unknown> }[] };
    const studParams = saved.nodes.find((n) => n.id === "stud")?.params;
    expect([studParams?.shape, studParams?.sides, studParams?.caps]).toEqual(["cylinder", 12, "top"]);
    const a = await cook(build());
    const b = await cook(back);
    for (const name of ["stud", "disc"]) {
      expect(snapshotGeometry(firstGeo(b.outputs[name])), name).toEqual(
        snapshotGeometry(firstGeo(a.outputs[name])),
      );
    }
    // A saved graph whose sides is out of range is refused on load, by name.
    const bad = JSON.parse(text) as typeof saved;
    const badStud = bad.nodes.find((n) => n.id === "stud");
    if (badStud) badStud.params.sides = 1;
    expect(() => deserializeGraph(bad)).toThrow(/sides/);
  });
});
