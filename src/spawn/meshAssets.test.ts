import { describe, expect, it } from "vitest";
import { createPointCloud, createPolyline, createTriangleMesh } from "../data/index.js";
import { diagnosticsOf } from "../diagnostics/index.js";
import {
  type DataCollection,
  Graph,
  cook,
  makeGeometryItem,
  makeInstancesItem,
  makeValueItem,
} from "../graph/index.js";
import { meshPrimitive } from "../nodes/index.js";
import { collectGraphAssets, isAssetOutput } from "./meshAssets.js";

const tri = (): ReturnType<typeof createTriangleMesh> => createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2]);

function refusal(fn: () => unknown): { message: string; code: string | undefined; nodeId?: string; pin?: string } {
  try {
    fn();
  } catch (err) {
    const d = diagnosticsOf(err)[0];
    return { message: (err as Error).message, code: d?.code, nodeId: d?.nodeId, pin: d?.pin };
  }
  throw new Error("expected a refusal");
}

const brick = { id: "brickMesh", pin: "out", name: "brick", role: "asset" } as const;

describe("isAssetOutput", () => {
  it("is true exactly for role asset", () => {
    expect(isAssetOutput({ role: "asset" })).toBe(true);
    expect(isAssetOutput({})).toBe(false);
    expect(isAssetOutput({ role: "assets" })).toBe(false);
  });
});

describe("collectGraphAssets", () => {
  it("returns the asset meshes in declaration order, ignoring scene outputs", () => {
    const a = tri();
    const b = tri();
    const meshes = collectGraphAssets(
      [
        { name: "stud", role: "asset" },
        { name: "scene" },
        { name: "brick", role: "asset" },
      ],
      {
        brick: [makeGeometryItem(b)],
        scene: [makeGeometryItem(createPointCloud(3))],
        stud: [makeGeometryItem(a)],
      },
    );
    expect([...meshes.keys()]).toEqual(["stud", "brick"]);
    expect(meshes.get("stud")).toBe(a);
    expect(meshes.get("brick")).toBe(b);
  });

  it("skips an asset output a partial cook did not produce", () => {
    expect(collectGraphAssets([brick], {}).size).toBe(0);
  });

  it("reads a real cook through graph.describe()", async () => {
    const g = new Graph(1);
    const m = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, "brickMesh");
    g.output(m, "out", "brick", { role: "asset" });
    const r = await cook(g);
    const meshes = collectGraphAssets(g.describe().outputs, r.outputs);
    expect([...meshes.keys()]).toEqual(["brick"]);
    expect(meshes.get("brick")!.primitiveCount).toBeGreaterThan(0);
  });

  const cases: ReadonlyArray<readonly [string, DataCollection, string]> = [
    [
      "no items",
      [],
      'asset output "brick" (node "brickMesh" pin "out") cooked to no items; an asset must cook to exactly one geometry — check what feeds it, or drop role "asset"',
    ],
    [
      "several items",
      [makeGeometryItem(tri()), makeGeometryItem(tri()), makeGeometryItem(tri())],
      'asset output "brick" (node "brickMesh" pin "out") cooked to 3 items; an asset must cook to exactly one geometry — merge them into one geometry with mergePrimitives before the output, or drop role "asset"',
    ],
    [
      "a value",
      [makeValueItem(1)],
      'asset output "brick" (node "brickMesh" pin "out") cooked to a value item, but an asset is a mesh; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop role "asset"',
    ],
    [
      "instances",
      [makeInstancesItem([])],
      'asset output "brick" (node "brickMesh" pin "out") cooked to an instances item, but an asset is a mesh; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop role "asset"',
    ],
    [
      "polylines",
      [makeGeometryItem(createPolyline([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]))],
      'asset output "brick" (node "brickMesh" pin "out") carries 0 faces (1 polyline primitive(s)); an asset is drawn as a triangle mesh — build faces (meshPrimitive, extrudePolygon, sweepProfile), or drop role "asset" to draw it as scene content',
    ],
    [
      "a bare cloud",
      [makeGeometryItem(createPointCloud(4))],
      'asset output "brick" (node "brickMesh" pin "out") carries 0 faces (no primitives at all: 4 bare point(s)); an asset is drawn as a triangle mesh — build faces (meshPrimitive, extrudePolygon, sweepProfile), or drop role "asset" to draw it as scene content',
    ],
  ];
  for (const [label, collection, message] of cases) {
    it(`refuses ${label}, naming the output, node and pin`, () => {
      const r = refusal(() => collectGraphAssets([brick], { brick: collection }));
      expect(r.message).toBe(message);
      expect(r.code).toBe("invalid-asset-output");
      expect(r.nodeId).toBe("brickMesh");
      expect(r.pin).toBe("out");
    });
  }

  it("refuses a non-finite position on a face, naming the point", () => {
    const geo = createTriangleMesh([0, 0, 0, 1, 0, 0, 0, Number.NaN, 0], [0, 1, 2]);
    const r = refusal(() => collectGraphAssets([brick], { brick: [makeGeometryItem(geo)] }));
    expect(r.message).toBe(
      'asset output "brick" (node "brickMesh" pin "out"): point 2 on face 0 has a non-finite position (0, NaN, 0); an asset mesh must be finite everywhere a face touches — a field divided by zero or overflowed upstream',
    );
    expect(r.code).toBe("invalid-asset-output");
  });

  it("ignores a non-finite point no face touches", () => {
    const geo = createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 1, 0, Number.POSITIVE_INFINITY, 0, 0], [0, 1, 2]);
    expect(collectGraphAssets([brick], { brick: [makeGeometryItem(geo)] }).size).toBe(1);
  });

  it("names only the output when the declaration carries no node or pin", () => {
    const r = refusal(() => collectGraphAssets([{ name: "brick", role: "asset" }], { brick: [] }));
    expect(r.message).toMatch(/^asset output "brick" cooked to no items;/);
    expect(r.nodeId).toBeUndefined();
  });

  it("counts an untagged primitive of three or more vertices as a face", () => {
    const geo = createPointCloud(3);
    geo.setTopology(new Uint32Array([0, 1, 2]), new Uint32Array([0]), new Uint32Array([3]));
    expect(collectGraphAssets([brick], { brick: [makeGeometryItem(geo)] }).size).toBe(1);
  });
});
