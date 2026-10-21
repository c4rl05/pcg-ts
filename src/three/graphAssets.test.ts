import { BufferGeometry, MeshBasicMaterial, type Material } from "three";
import { describe, expect, it } from "vitest";
import { createPointCloud, createTriangleMesh } from "../data/index.js";
import { Graph, cook } from "../graph/index.js";
import { meshPrimitive } from "../nodes/index.js";
import { buildInstanceBatches } from "../spawn/instances.js";
import { collectGraphAssets } from "../spawn/meshAssets.js";
import { graphAssetMap } from "./graphAssets.js";
import { ownsGeometry, toInstancedMeshes } from "./instanced.js";

describe("graphAssetMap", () => {
  it("converts each graph mesh, in map order, with the caller's material", () => {
    const meshes = new Map([
      ["stud", createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2])],
      ["brick", createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], [0, 1, 2, 1, 3, 2])],
    ]);
    const materials = new Map<string, Material>();
    const map = graphAssetMap(meshes, (id) => {
      const m = new MeshBasicMaterial();
      materials.set(id, m);
      return m;
    });
    expect(Object.keys(map)).toEqual(["stud", "brick"]);
    expect(map.brick!.geometry).toBeInstanceOf(BufferGeometry);
    expect(map.brick!.geometry.getIndex()!.count).toBe(6);
    expect(map.stud!.geometry.getIndex()!.count).toBe(3);
    expect(map.brick!.material).toBe(materials.get("brick"));
  });

  it("takes precedence by spread order against host art", () => {
    const meshes = new Map([["brick", createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2])]]);
    const fromGraph = graphAssetMap(meshes, () => new MeshBasicMaterial());
    const host = { brick: { geometry: new BufferGeometry(), material: new MeshBasicMaterial() } };
    expect({ ...fromGraph, ...host }.brick).toBe(host.brick);
    expect({ ...host, ...fromGraph }.brick).toBe(fromGraph.brick);
  });

  it("feeds toInstancedMeshes from a real cook, and the shared geometry stays the caller's", async () => {
    const g = new Graph(1);
    const m = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, "brickMesh");
    g.output(m, "out", "brick", { role: "asset" });
    const r = await cook(g);
    const map = graphAssetMap(collectGraphAssets(g.describe().outputs, r.outputs), () => new MeshBasicMaterial());

    const pts = createPointCloud(2);
    const [mesh] = toInstancedMeshes(buildInstanceBatches(pts, { defaultAssetId: "brick" }), map);
    expect(mesh!.geometry).toBe(map.brick!.geometry);
    expect(ownsGeometry(mesh!)).toBe(false);
  });
});
