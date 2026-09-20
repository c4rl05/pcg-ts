/**
 * Handing topology to a {@link Geometry} WITHOUT the defensive copy — and,
 * since the three fields became private behind a read view, the ONLY
 * place that can put an array on a geometry at all. `setTopology` reaches
 * its install through here too.
 *
 * LIBRARY-INTERNAL, AND DELIBERATELY UNREACHABLE FROM EVERY ENTRY POINT.
 * No barrel re-exports this module. `src/index.ts` does re-export the
 * whole of `src/data/index.ts` (`export *`), so what keeps this module out
 * of `import "pcg-ts"` is that `src/data/index.ts` names what it publishes
 * module by module and this one is not in its list; no other barrel names
 * it either, so neither the root nor any subpath can name
 * `adoptTopology`. It is imported by path, from inside
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
 *
 * This is not the only path that installs topology without the copy:
 * `decodeGeometry` in `src/worker/protocol.ts` assigns the three arrays it
 * received through a transfer list straight onto a new geometry, skipping
 * the validation as well, on the grounds that it owns them exclusively.
 */
import type { Geometry } from "./geometry.js";
import type { ReadonlyTopology } from "./types.js";

/**
 * The private storage of {@link Geometry}, reached by name because this
 * module is its module's neighbour rather than one of its methods — the
 * same cast `overwrite.ts` and `derive.ts` make, and for the same reason:
 * a method on `Geometry` would be public API however it was commented,
 * because `src/data/index.ts` re-exports the whole of `geometry.js`.
 * `private` is a compile-time rule over ordinary properties, so this view
 * is a cast and not a runtime trick, and the tests fail loudly if a field
 * is renamed under it.
 *
 * EACH OF THE THREE IS ASSIGNED IN EXACTLY TWO PLACES: its field
 * initializer on `Geometry`, which allocates a fresh empty array, and
 * {@link installTopology} below. There is no third, which is what lets
 * `adoptTopology`'s ownership rules be stated as rules about the CALLER's
 * array rather than about who else might hold it.
 */
interface TopologyState {
  _vertexToPoint: Uint32Array;
  _primVertexStart: Uint32Array;
  _primVertexCount: Uint32Array;
}

function topologyState(geo: Geometry): TopologyState {
  return geo as unknown as TopologyState;
}

/**
 * The references {@link Geometry.setTopology} checks before it installs
 * anything: the two primitive arrays agree in length, every vertex names an
 * existing point, and every primitive's vertex range fits. Throws on the
 * first violation, before the geometry is touched.
 */
export function checkTopology(
  pointCount: number,
  vertexToPoint: ReadonlyTopology,
  primVertexStart: ReadonlyTopology,
  primVertexCount: ReadonlyTopology,
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
 *
 * IT WRITES THE PRIVATE FIELDS. The three are getters on `Geometry`, so
 * `geo.vertexToPoint = …` compiles nowhere — including here, which is
 * why this reaches the storage by the cast above. That is the point: one
 * function installs all three, and a caller cannot replace one of them
 * and leave the other two describing elements that no longer exist.
 */
export function installTopology(
  geo: Geometry,
  vertexToPoint: Uint32Array,
  primVertexStart: Uint32Array,
  primVertexCount: Uint32Array,
): void {
  const state = topologyState(geo);
  state._vertexToPoint = vertexToPoint;
  state._primVertexStart = primVertexStart;
  state._primVertexCount = primVertexCount;
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
 * - THE CALLER'S OWN BUFFERS, OF EXACT LENGTH: each array must be the
 *   whole of a buffer the caller allocated for it — never a `subarray` of
 *   a larger one, and above all never a view of a pool or scratch buffer
 *   shared across calls, which the next call would rewrite under this
 *   geometry's cache entry. (An exact-length own buffer is also what
 *   `setTopology`'s slice would have produced, so nothing is kept alive
 *   that the copy would have released.)
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
