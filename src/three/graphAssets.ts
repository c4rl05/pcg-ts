/**
 * Graph-supplied asset meshes → an {@link AssetMap}.
 *
 * A top-level graph output declared `role: "asset"` is the mesh for the
 * asset id equal to its name; `collectGraphAssets` reads those meshes off a
 * cook result. This turns that map into the lookup `toInstancedMeshes`
 * resolves batches against, so a host draws the graph's own mesh for an id
 * the graph supplies.
 */
import type { Material } from "three";
import type { Geometry } from "../data/index.js";
import { toBufferGeometry, type ToBufferGeometryOptions } from "./convert.js";
import type { AssetMap } from "./instanced.js";

/**
 * An {@link AssetMap} with one entry per graph-supplied mesh, in the
 * map's (declaration) order: each geometry converted with
 * `toBufferGeometry(mesh, opts)`, each material from `materialFor(id)`.
 *
 * OWNERSHIP. Everything in the result belongs to the CALLER: the buffer
 * geometries are fresh and the library keeps no reference to them, and the
 * materials are whatever `materialFor` returned. Dispose both when the map
 * is retired — `toInstancedMeshes` never disposes an asset map's shared
 * geometry, only the per-batch clones it made itself (`ownsGeometry`).
 *
 * PRECEDENCE is spread order, deliberately not an option:
 * `{ ...graphAssetMap(meshes, materialFor), ...hostArt }` lets the host's
 * art win for an id both supply, and the reverse spread lets the graph win.
 */
export function graphAssetMap(
  meshes: ReadonlyMap<string, Geometry>,
  materialFor: (id: string) => Material | Material[],
  opts?: ToBufferGeometryOptions,
): AssetMap {
  const out: AssetMap = {};
  for (const [id, mesh] of meshes) {
    out[id] = { geometry: toBufferGeometry(mesh, opts), material: materialFor(id) };
  }
  return out;
}
