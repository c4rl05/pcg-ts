/**
 * Graph-supplied asset meshes.
 *
 * A top-level output declared `role: "asset"` supplies the mesh for the
 * asset id equal to its NAME: a host draws that id's spawned instances
 * with the output's geometry instead of art of its own, and does not draw
 * the output itself as scene content. The output is an ordinary cook
 * output — cooked, cached, fingerprinted and shipped across the worker
 * boundary like any other — so this module only READS a cook result; it
 * changes nothing about how one is made.
 *
 * The mesh is in the instance's LOCAL frame, world units at scale 1: the
 * host applies the instance transform T(P)·R(rot)·S(scale) unmodified, so
 * the graph models the pivot.
 */
import type { Geometry } from "../data/index.js";
import { PRIMTYPE_ATTR } from "../data/geometry.js";
import type { DataCollection } from "../graph/data.js";
import { GraphError } from "../graph/errors.js";

/**
 * Is this output declaration an asset output? Accepts any of the output
 * shapes the library hands out — `graph.describe().outputs`, a serialized
 * graph's `outputs`, a cook-target's declarations.
 */
export function isAssetOutput(output: { readonly role?: string }): boolean {
  return output.role === "asset";
}

/** "asset output "brick" (node "brickMesh" pin "out")", as far as it is known. */
function whereOf(name: string, id: string | undefined, pin: string | undefined): string {
  const at =
    id !== undefined && pin !== undefined
      ? ` (node "${id}" pin "${pin}")`
      : id !== undefined
        ? ` (node "${id}")`
        : "";
  return `asset output "${name}"${at}`;
}

function refuse(message: string, id: string | undefined, pin: string | undefined): never {
  throw new GraphError(message, undefined, [
    {
      code: "invalid-asset-output",
      severity: "error",
      message,
      ...(id !== undefined ? { nodeId: id } : {}),
      ...(pin !== undefined ? { pin } : {}),
    },
  ]);
}

/** "4 polyline primitives", "2 poly primitives with fewer than 3 vertices", … */
function describePrimitives(geo: Geometry): string {
  if (geo.primitiveCount === 0) return `no primitives at all: ${geo.pointCount} bare point(s)`;
  const attr = geo.attrs.primitive.get(PRIMTYPE_ATTR);
  if (attr === undefined || attr.type !== "string") {
    return `${geo.primitiveCount} untagged primitive(s) with fewer than 3 vertices`;
  }
  const counts = new Map<string, number>();
  for (let p = 0; p < geo.primitiveCount; p++) {
    const kind = attr.getString(p);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts]
    .map(([kind, n]) =>
      kind === "poly" ? `${n} poly primitive(s) with fewer than 3 vertices` : `${n} ${kind} primitive(s)`,
    )
    .join(", ");
}

/**
 * Check one asset geometry: it must carry at least one face (a "poly"
 * primitive with >= 3 vertices, or an untagged one with >= 3), and every
 * point a face touches must have a finite position.
 */
function checkAssetMesh(geo: Geometry, where: string, id: string | undefined, pin: string | undefined): void {
  const P = geo.attrs.point.get("P");
  if (P === undefined || P.type !== "f32" || P.tupleSize !== 3) {
    refuse(
      `${where} carries no point attribute "P" (f32, tupleSize 3); an asset is drawn as a triangle mesh — build it with meshPrimitive, extrudePolygon or sweepProfile, or drop role "asset"`,
      id,
      pin,
    );
  }
  // The tag is compared as its interned INDEX, decided once here: a string
  // compared per element is the shape src/noise/worley.ts records V8
  // miscompiling.
  const tag = geo.attrs.primitive.get(PRIMTYPE_ATTR);
  const polyTag = tag !== undefined && tag.type === "string" ? tag : undefined;
  const polyIndex = polyTag?.lookupString("poly");
  const starts = geo.primVertexStart;
  const counts = geo.primVertexCount;
  const v2p = geo.vertexToPoint;
  const data = P.data;
  let faces = 0;
  for (let p = 0; p < geo.primitiveCount; p++) {
    if (counts[p] < 3) continue;
    if (polyTag !== undefined && (polyIndex === undefined || polyTag.get(p) !== polyIndex)) continue;
    faces++;
    for (let v = starts[p]; v < starts[p] + counts[p]; v++) {
      const point = v2p[v];
      const o = point * 3;
      if (!Number.isFinite(data[o]) || !Number.isFinite(data[o + 1]) || !Number.isFinite(data[o + 2])) {
        refuse(
          `${where}: point ${point} on face ${p} has a non-finite position (${data[o]}, ${data[o + 1]}, ${data[o + 2]}); an asset mesh must be finite everywhere a face touches — a field divided by zero or overflowed upstream`,
          id,
          pin,
        );
      }
    }
  }
  if (faces === 0) {
    refuse(
      `${where} carries 0 faces (${describePrimitives(geo)}); an asset is drawn as a triangle mesh — build faces (meshPrimitive, extrudePolygon, sweepProfile), or drop role "asset" to draw it as scene content`,
      id,
      pin,
    );
  }
}

/**
 * The meshes a cook result supplies, keyed by asset id (= the output's
 * name), in DECLARATION order.
 *
 * `outputs` is the graph's output declarations — `graph.describe().outputs`
 * or a serialized graph's `outputs` both fit; only entries with
 * `role: "asset"` are read. `cooked` is the cook result's `outputs` (or a
 * worker pool's decoded outputs). An asset output absent from `cooked` is
 * SKIPPED, not refused: a per-output cook that did not ask for it simply
 * has nothing to supply.
 *
 * Each present asset output must have cooked to exactly one geometry
 * carrying at least one face, with finite positions wherever a face
 * touches; anything else throws a `GraphError` with code
 * `invalid-asset-output`, naming the output, its node and pin, and the fix.
 *
 * The returned geometries are the cook result's own (no copy): treat them
 * as frozen, the same aliasing rule every cook result follows.
 */
export function collectGraphAssets(
  outputs: readonly { readonly name: string; readonly role?: string; readonly id?: string; readonly pin?: string }[],
  cooked: Readonly<Record<string, DataCollection>>,
): Map<string, Geometry> {
  const meshes = new Map<string, Geometry>();
  for (const output of outputs) {
    if (!isAssetOutput(output)) continue;
    const { name, id, pin } = output;
    if (!Object.hasOwn(cooked, name)) continue;
    const collection = cooked[name] as DataCollection;
    const where = whereOf(name, id, pin);
    if (collection.length === 0) {
      refuse(
        `${where} cooked to no items; an asset must cook to exactly one geometry — check what feeds it, or drop role "asset"`,
        id,
        pin,
      );
    }
    if (collection.length > 1) {
      refuse(
        `${where} cooked to ${collection.length} items; an asset must cook to exactly one geometry — merge them into one geometry with mergePrimitives before the output, or drop role "asset"`,
        id,
        pin,
      );
    }
    const item = collection[0]!;
    if (item.kind !== "geometry") {
      refuse(
        `${where} cooked to ${item.kind === "instances" ? "an instances" : `a ${item.kind}`} item, but an asset is a mesh; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop role "asset"`,
        id,
        pin,
      );
    }
    checkAssetMesh(item.geo, where, id, pin);
    meshes.set(name, item.geo);
  }
  return meshes;
}
