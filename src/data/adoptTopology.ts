/**
 * Handing topology to a {@link Geometry} WITHOUT the defensive copy.
 *
 * LIBRARY-INTERNAL, AND DELIBERATELY UNREACHABLE FROM EVERY ENTRY POINT.
 * No barrel re-exports this module: `src/data/index.ts` names what it
 * publishes module by module and this one is not in the list, and nothing
 * else re-exports `src/data` at all, so neither `import "pcg-ts"` nor any
 * subpath can name `adoptTopology`. It is imported by path, from inside
 * `src/`, by code that built the arrays itself. Publishing it would hand
 * every caller a way to share a buffer with a cached geometry, which is
 * exactly what `setTopology`'s copy exists to prevent — so exporting it is
 * a decision about the public contract, not a convenience, and
 * `adoptTopology.test.ts` fails if it happens by accident.
 *
 * {@link Geometry.setTopology} validates and then `.slice()`s all three
 * arrays, which protects a caller-owned array from being mutated under a
 * validated geometry (and the geometry from the caller). Most callers are
 * node implementations that allocate the three arrays fresh, fill them,
 * hand them over and never touch them again: for those the copy protects
 * nothing and costs a full allocation, a memcpy and the garbage it leaves
 * (21 / 137 / 138 MB per cook of the eiffel demo at depths plain / laced /
 * rivets, measured before this module existed).
 *
 * The validation is the SAME function on both paths ({@link checkTopology}),
 * so an adopting caller throws the identical `setTopology:` message a
 * copying one would. Only the copy is skipped.
 */
import type { Geometry } from "./geometry.js";

/**
 * The references {@link Geometry.setTopology} checks before it installs
 * anything: the two primitive arrays agree in length, every vertex names an
 * existing point, and every primitive's vertex range fits. Throws on the
 * first violation, before the geometry is touched.
 */
export function checkTopology(
  pointCount: number,
  vertexToPoint: Uint32Array,
  primVertexStart: Uint32Array,
  primVertexCount: Uint32Array,
): void {
  if (primVertexStart.length !== primVertexCount.length) {
    throw new Error("setTopology: primVertexStart and primVertexCount lengths differ");
  }
  const nv = vertexToPoint.length;
  for (let v = 0; v < nv; v++) {
    if (vertexToPoint[v] >= pointCount) {
      throw new Error(`setTopology: vertex ${v} references point ${vertexToPoint[v]} >= ${pointCount}`);
    }
  }
  for (let p = 0; p < primVertexStart.length; p++) {
    if (primVertexStart[p] + primVertexCount[p] > nv) {
      throw new Error(`setTopology: primitive ${p} vertex range exceeds ${nv} vertices`);
    }
  }
}

/**
 * Install already-validated arrays as `geo`'s topology, by reference, and
 * size the vertex and primitive attribute sets to match. The tail both
 * paths share: `setTopology` passes its slices, `adoptTopology` the
 * caller's own arrays.
 */
export function installTopology(
  geo: Geometry,
  vertexToPoint: Uint32Array,
  primVertexStart: Uint32Array,
  primVertexCount: Uint32Array,
): void {
  geo.vertexToPoint = vertexToPoint;
  geo.primVertexStart = primVertexStart;
  geo.primVertexCount = primVertexCount;
  geo.attrs.vertex.resize(vertexToPoint.length);
  geo.attrs.primitive.resize(primVertexStart.length);
}

/**
 * {@link Geometry.setTopology} without the copy: validate exactly as it
 * does, then keep the three arrays themselves.
 *
 * OWNERSHIP PASSES TO `geo`. Call it only with arrays that are all of:
 *
 * - FRESHLY ALLOCATED by the caller (or by a helper only the caller uses)
 *   for this geometry — never an input geometry's arrays, a cached value, a
 *   param, a constant, or anything another call could also return;
 * - NOT RETAINED: the caller neither writes them nor hands them anywhere
 *   else after this call, because from here on they ARE the geometry's
 *   topology, and the geometry is what the graph caches;
 * - OWN BUFFERS of exact length, preferably: a `subarray` view is
 *   correct but keeps its whole parent buffer alive for as long as the
 *   geometry lives, where `setTopology`'s slice would have compacted it.
 *
 * When any of that is not plainly true at the call site, use
 * `setTopology`: the copy is the price of not having to prove it.
 */
export function adoptTopology(
  geo: Geometry,
  vertexToPoint: Uint32Array,
  primVertexStart: Uint32Array,
  primVertexCount: Uint32Array,
): void {
  checkTopology(geo.pointCount, vertexToPoint, primVertexStart, primVertexCount);
  installTopology(geo, vertexToPoint, primVertexStart, primVertexCount);
}
