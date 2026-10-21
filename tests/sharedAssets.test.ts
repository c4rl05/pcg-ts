/**
 * The viewer's asset vocabulary, listed as data and kept honest.
 *
 * `shared/assets.ts` answers "what can this viewer draw?" twice: once as
 * live three.js meshes, which is what the pages need, and once as
 * `PLACEHOLDER_ASSET_IDS`, which is what a script or a terminal needs so
 * the answer can be compared against `pcg assets <graph.json>` without a
 * rendering context. Two answers to one question drift, so this asserts
 * they are the same set — in BOTH directions, which is what makes it a
 * check rather than a reminder: an id added to the map and not to the
 * list fails, and so does the reverse.
 *
 * Lives in `tests/` for the reason `editorKnobs.test.ts` gives: the
 * browser pages sit outside vitest's `src/**` include.
 *
 * It deliberately does NOT assert anything about the corpus. Thirteen of
 * the nineteen asset ids the shipped graphs name have no entry here, and
 * that is BY DESIGN rather than a gap — the module's own header explains
 * why a viewer of arbitrary graphs invents a distinct stand-in instead of
 * refusing an id it does not know. Pinning that number would turn a
 * deliberate fallback into a thing nobody may touch.
 */
import { describe, expect, it } from "vitest";
import { cook, deserializeGraph, type InstanceBatch } from "pcg-ts";
import { MeshStandardMaterial, type BufferGeometry, type Material } from "three";
import {
  PLACEHOLDER_ASSET_IDS,
  collectSuppliedMeshes,
  createGraphAssetCache,
  createPlaceholderAssets,
  idsWithInstanceColour,
  resolveAssets,
} from "../shared/assets.js";

describe("the viewer's asset vocabulary", () => {
  it("lists exactly the ids the asset map registers", () => {
    const built = Object.keys(createPlaceholderAssets().known).sort();
    expect(built).toEqual([...PLACEHOLDER_ASSET_IDS].sort());
  });

  it("names each id once", () => {
    expect(new Set(PLACEHOLDER_ASSET_IDS).size).toBe(PLACEHOLDER_ASSET_IDS.length);
  });

  it("is unaffected by the mono option, which restyles rather than removes", () => {
    const mono = Object.keys(createPlaceholderAssets({ mono: true }).known).sort();
    expect(mono).toEqual([...PLACEHOLDER_ASSET_IDS].sort());
  });
});

/**
 * Graph-supplied meshes: an output declared `role: "asset"` is the mesh
 * for the asset id equal to its name, and the viewer must prefer it over
 * its own vocabulary — a placeholder there is the viewer overruling the
 * graph.
 */
async function cookAssets(): Promise<{
  declared: readonly { name: string; role?: "asset" }[];
  outputs: Awaited<ReturnType<typeof cook>>["outputs"];
}> {
  const graph = deserializeGraph({
    formatVersion: 1,
    seed: 1,
    nodes: [
      { id: "boxMesh", type: "meshPrimitive", params: { shape: "box" } },
      { id: "dots", type: "pointGrid", params: { countX: 2, countZ: 2 } },
    ],
    connections: [],
    outputs: [
      // "box" is also a placeholder id, which is what makes precedence testable.
      { id: "boxMesh", pin: "out", name: "box", role: "asset" },
      // Points and no faces: a refusal, which must not take "box" down with it.
      { id: "dots", pin: "out", name: "dots", role: "asset" },
    ],
  });
  const declared = graph.describe().outputs;
  return { declared, outputs: (await cook(graph)).outputs };
}

const batchOf = (assetId: string, colour = false): InstanceBatch => ({
  assetId,
  count: 1,
  transforms: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  ...(colour ? { attributes: { color: new Float32Array([1, 0, 0]) } } : {}),
});

describe("resolveAssets with graph-supplied meshes", () => {
  it("prefers the graph's mesh over a placeholder of the same id", () => {
    const assets = createPlaceholderAssets();
    const graphBox = { geometry: assets.known.cone.geometry, material: new MeshStandardMaterial() };
    const map = resolveAssets([batchOf("box"), batchOf("sphere")], assets, { box: graphBox });
    expect(map.box).toBe(graphBox);
    // An id the graph does not supply still resolves to the vocabulary.
    expect(map.sphere).toBe(assets.known.sphere);
  });

  it("prefers the graph's mesh over an invented stand-in", () => {
    const assets = createPlaceholderAssets();
    const brick = { geometry: assets.known.box.geometry, material: new MeshStandardMaterial() };
    expect(resolveAssets([batchOf("brick")], assets, { brick }).brick).toBe(brick);
    expect(resolveAssets([batchOf("brick")], assets).brick).toBe(assets.fallbackFor("brick"));
  });
});

describe("collectSuppliedMeshes", () => {
  it("collects good asset outputs and reports a bad one without dropping the rest", async () => {
    const { declared, outputs } = await cookAssets();
    const { meshes, problems } = collectSuppliedMeshes(declared, outputs);
    expect(meshes.map((m) => m.id)).toEqual(["box"]);
    expect(meshes[0].key).toBe(`box#${outputs.box[0].rev}`);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('asset output "dots"');
  });

  it("skips an asset output the cook did not produce, and ignores scene outputs", async () => {
    const { declared, outputs } = await cookAssets();
    const { meshes, problems } = collectSuppliedMeshes(
      [...declared.filter((o) => o.name === "box"), { name: "scene" }],
      { scene: outputs.dots },
    );
    expect(meshes).toEqual([]);
    expect(problems).toEqual([]);
  });
});

describe("createGraphAssetCache", () => {
  it("reuses a mesh's geometry while its key holds, and frees it when the key changes", async () => {
    const { declared, outputs } = await cookAssets();
    const { meshes } = collectSuppliedMeshes(declared, outputs);
    const cache = createGraphAssetCache();
    const look = (): { color: number } => ({ color: 0xffffff });
    const first = cache.resolve(meshes, look);
    const geometry = first.box.geometry as BufferGeometry;
    const material = first.box.material as Material;
    let geometryFreed = false;
    geometry.addEventListener("dispose", () => {
      geometryFreed = true;
    });

    const again = cache.resolve(meshes, () => ({ color: 0xff0000 }));
    expect(again.box.geometry).toBe(geometry);
    // Restyled in place: one material per id for the cache's life.
    expect(again.box.material).toBe(material);
    expect((material as MeshStandardMaterial).color.getHex()).toBe(0xff0000);
    expect(geometryFreed).toBe(false);

    // A new revision of the same output is a new mesh: the old buffers go.
    const changed = cache.resolve([{ ...meshes[0], key: "box#new" }], look);
    expect(changed.box.geometry).not.toBe(geometry);
    expect(geometryFreed).toBe(true);
    expect(changed.box.material).toBe(material);
  });

  it("frees the material of an id that vanished, and everything on dispose", async () => {
    const { declared, outputs } = await cookAssets();
    const { meshes } = collectSuppliedMeshes(declared, outputs);
    const cache = createGraphAssetCache();
    const map = cache.resolve(meshes, () => ({ color: 0xffffff }));
    let materialFreed = false;
    (map.box.material as Material).addEventListener("dispose", () => {
      materialFreed = true;
    });
    let geometryFreed = false;
    map.box.geometry.addEventListener("dispose", () => {
      geometryFreed = true;
    });
    expect(cache.resolve([], () => ({ color: 0 }))).toEqual({});
    expect(materialFreed).toBe(true);
    expect(geometryFreed).toBe(true);

    const fresh = createGraphAssetCache();
    const m2 = fresh.resolve(meshes, () => ({ color: 0xffffff }));
    let freed = 0;
    m2.box.geometry.addEventListener("dispose", () => freed++);
    (m2.box.material as Material).addEventListener("dispose", () => freed++);
    fresh.dispose();
    expect(freed).toBe(2);
  });
});

describe("idsWithInstanceColour", () => {
  it("names the ids whose batches carry colour, under either spelling", () => {
    const sugar: InstanceBatch = { ...batchOf("b"), colors: new Float32Array([0, 1, 0]) };
    expect([...idsWithInstanceColour([batchOf("a", true), sugar, batchOf("c")])].sort()).toEqual([
      "a",
      "b",
    ]);
  });
});
