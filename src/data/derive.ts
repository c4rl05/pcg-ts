/**
 * Building a geometry that SHARES its inputs' columns until something
 * writes one.
 *
 * LIBRARY-INTERNAL, AND DELIBERATELY UNREACHABLE FROM EVERY ENTRY POINT,
 * the way `adoptTopology.ts` and `overwrite.ts` are. No barrel names this
 * module — `src/data/index.ts` lists what it publishes module by module
 * and this one is not on the list — so neither the root import nor any
 * subpath can reach these names, and `derive.test.ts` fails if that stops
 * being true.
 *
 * WHAT THIS BUYS. A node that transforms geometry must not write its
 * input: upstream caches hold that object. The honest answer was
 * `cloneGeometry` — every column of every domain copied — and for a node
 * that rewrites `P` and nothing else, every column BUT `P` was copied to
 * be read and dropped. Cooking the eiffel demo retains one such copy per
 * node in the graph, so the same bytes are held many times over under
 * different names.
 *
 * WHAT MAKES IT SAFE. `Attribute` hands out a read view (`data`) and a
 * write route (`writable`), and only the write route can produce a
 * writable array. A derived column starts out pointing at the source's
 * buffer with both columns flagged shared; the first `writable()` on
 * either gives that one a copy of its own and clears its flag. So a write
 * through the derived geometry is never seen through the source, which is
 * the whole contract, and a column nobody writes is never copied, which
 * is the whole point.
 *
 * WHAT IS NOT SHARED, and why:
 *
 * - STRING COLUMNS are copied, with `copyFrom`'s re-interning. Sharing
 *   the `Uint32Array` would mean sharing the string table it indexes, and
 *   the table is an ordinary array with no flag on it; worse, `copyFrom`
 *   COMPACTS the table (it interns only the strings elements actually
 *   use), so a shared table would carry entries the copy drops and change
 *   the CLI's geometry fingerprint. Copying keeps the bytes the copy
 *   produced.
 * - THE TOPOLOGY ARRAYS are copied, exactly as `cloneGeometry` copies
 *   them. They sit flat on `Geometry` as plain writable fields with no
 *   read view in front of them, so nothing would stop a write from
 *   reaching a cached input — and `topologyAliasing.test.ts` exists
 *   because writing an input's topology is a mistake worth catching, not
 *   one the type system catches. Sharing them is a separate change, and
 *   it needs its own guard first.
 *
 * WHAT IT COSTS. The flag is a boolean, not a count: nothing in the
 * language tells a buffer how many typed arrays view it. So a column
 * whose sharer has already forked still reads as shared and copies once
 * more than it strictly must. That is a copy that was not needed, never a
 * write seen through the wrong column.
 */
import { Attribute, type AttributeSet } from "./attribute.js";
import { Geometry } from "./geometry.js";
import { addForOverwrite, resizeForOverwrite } from "./overwrite.js";
import { DOMAINS, type AttrData, type Domain } from "./types.js";

/**
 * The private state of {@link AttributeSet} and {@link Attribute},
 * reached by name because this module is their module's neighbour rather
 * than one of their methods — the same cast `overwrite.ts` makes, and for
 * the same reason: a method on either class would be public API however
 * it was commented, because `src/data/index.ts` re-exports the whole of
 * `attribute.js`. `private` is a compile-time rule over ordinary
 * properties, so these views are casts and not runtime tricks, and the
 * tests that check sharing fail loudly if a field is renamed under them.
 */
interface SetState {
  readonly map: Map<string, Attribute>;
}

interface ColumnState {
  _data: AttrData;
  _shared: boolean;
}

function setState(set: AttributeSet): SetState {
  return set as unknown as SetState;
}

function columnState(attr: Attribute): ColumnState {
  return attr as unknown as ColumnState;
}

/**
 * Whether this column's storage may also be reached from another
 * {@link Attribute}. For tests: it is the flag itself, so it reads `true`
 * on a column whose one-time sharer has since forked.
 */
export function isColumnShared(attr: Attribute): boolean {
  return columnState(attr)._shared;
}

/**
 * Put a column into `set` that reads `src`'s storage, flagging both so
 * that whichever writes first takes a copy.
 *
 * `count` is the destination's element count, and the view is cut to
 * exactly it, so the derived column's `capacity` is its `count` — which
 * is what a clone produced, and what the set's own capacity was just set
 * to. A source carrying the slack of growth by doubling therefore lends
 * its live prefix and not its allocation.
 */
function shareColumn(set: AttributeSet, src: Attribute, count: number): void {
  const held = new Attribute(src.name, src.type, src.tupleSize, 0, src.defaultValue);
  const from = columnState(src);
  const to = columnState(held);
  const needed = count * src.tupleSize;
  to._data = from._data.length === needed ? from._data : from._data.subarray(0, needed);
  from._shared = true;
  to._shared = true;
  setState(set).map.set(src.name, held);
}

// ONE PASS PER COLUMN, and the same shape as the clone's: `to` is a fresh
// geometry's set and holds no columns yet, so it is sized first, at
// exactly `from.count`, while that is still just a number. Each column
// then either lends its storage or — a string column — is created
// uninitialized and written whole by one `copyFrom`, whose re-interning is
// what the fingerprint depends on.
function deriveDomain(src: Geometry, dst: Geometry, domain: Domain): void {
  const from = src.attrs[domain];
  const to = dst.attrs[domain];
  const n = from.count;
  resizeForOverwrite(to, n);
  for (const attr of from) {
    if (attr.type === "string") {
      addForOverwrite(to, attr.name, attr.type, attr.tupleSize, attr.defaultValue).copyFrom(
        attr,
        0,
        0,
        n,
      );
    } else {
      shareColumn(to, attr, n);
    }
  }
}

/**
 * `cloneGeometry` without the copies: a new geometry holding the same
 * elements, whose numeric columns read `src`'s storage until one of them
 * is written. Element for element it is indistinguishable from the clone,
 * string tables and topology included, and every domain's `capacity` is
 * its `count` just as the clone's is.
 *
 * This is what the library's own nodes call where the doc comments say
 * "clone the input first". `cloneGeometry` stays a deep, independent copy
 * for callers outside the library, who have not taken on the obligation
 * that makes this safe: that every write goes through
 * `Attribute.writable()`.
 */
export function deriveGeometry(src: Geometry): Geometry {
  const dst = new Geometry();
  // Points first so topology validation sees the right point count;
  // setTopology copies the three arrays and sizes the vertex and
  // primitive domains, exactly as it does for the clone.
  deriveDomain(src, dst, "point");
  dst.setTopology(src.vertexToPoint, src.primVertexStart, src.primVertexCount);
  for (const domain of DOMAINS) {
    if (domain !== "point") deriveDomain(src, dst, domain);
  }
  return dst;
}
