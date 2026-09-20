/**
 * WHAT A {@link Geometry}'S TOPOLOGY ARRAYS REFUSE, checked by the
 * compiler rather than by a regular expression.
 *
 * The sibling of `attributeWriteRoute.negative.ts`, and it works exactly
 * the same way: every `@ts-expect-error` below is a guard, and if the
 * operation under it ever starts compiling, `tsc` reports "Unused
 * '@ts-expect-error' directive" and `npm run check` fails. That is the
 * whole mechanism, which is why this file has no assertions and is never
 * executed. `topologyWriteRoute.test.ts` asserts that it still holds the
 * cases, so it cannot be quietly emptied.
 *
 * SO `npm test` NEVER CHECKS THIS CLAIM. Only `npm run check` does. The
 * runtime guard reads this file as TEXT — it can see the cases go
 * missing, and nothing else: loosen `ReadonlyTopology` back to
 * `Uint32Array` and every test in the suite still passes while every
 * directive here goes unused. A green `npm test` says nothing about
 * whether the closure holds.
 *
 * WHY THE THREE ARRAYS NEED THIS AT ALL. The library installs topology
 * BY REFERENCE: a node builds the three arrays, hands them over, and the
 * geometry it hands them to is what the graph caches. So
 * `geo.vertexToPoint[0] = 1` inside a node is a write into a cached
 * output — its own, or an upstream node's when the geometry came in on an
 * input pin — and the type these cases pin is the only thing standing
 * between the library and it. The fields are also PRIVATE with getters in
 * front of them, so the other half of the guard is that one of the three
 * cannot be replaced on its own, leaving the other two describing
 * elements that no longer exist.
 *
 * EVERY CASE IS PAIRED with the same operation on a genuinely mutable
 * array. The pair is what makes the negative meaningful: it shows the
 * expression is well-formed and that the read view alone is what refuses
 * it. Loosen `ReadonlyTopology` back to `Uint32Array` and the mutable
 * half keeps compiling while every directive in the read half goes
 * unused — which is the failure this file is built to produce.
 *
 * IT WAS RUN, NOT ASSUMED, ON 2026-09-20, in three parts, because the 20
 * directives here guard three different things. Counting the directives
 * `tsc` then reported as unused:
 *
 * - `ReadonlyTopology` loosened to `Uint32Array` in `src/data/types.ts`:
 *   15, every case about the ARRAY.
 * - The same, with `dist/` rebuilt from it: 18. The three joiners are
 *   `publishedChecks`, which read the typings a consumer gets.
 * - A `set vertexToPoint(v: Uint32Array)` added beside each getter on
 *   `Geometry`: the last two, `replacingOneArray`, which the alias does
 *   not govern — a getter-only property is what refuses those.
 */
// FROM THE SOURCE, not from the package name, for the reason the sibling
// file gives: a `tests/` file that imports "pcg-ts" is checked against
// `dist/*.d.ts`, so while the build lags the tree it is checked against
// the PREVIOUS `Geometry`. The published shape is pinned separately, at
// the bottom of this file.
import type { Geometry, ReadonlyTopology } from "../src/data/index.js";

declare const geo: Geometry;
declare const other: Geometry;
declare const mutable: Uint32Array;
/** A plain object whose field really can be reassigned. */
declare const holder: { vertexToPoint: Uint32Array };

/** A parameter that means "I intend to write this". */
declare function wantsMutable(a: Uint32Array): void;

export function indexedStore(): void {
  mutable[0] = 1;
  // @ts-expect-error a geometry's vertexToPoint has a read-only index signature
  geo.vertexToPoint[0] = 1;
  // @ts-expect-error and so does primVertexStart
  geo.primVertexStart[0] = 1;
  // @ts-expect-error and primVertexCount
  geo.primVertexCount[0] = 1;
}

export function bulkWrites(): void {
  mutable.set([1, 2]);
  mutable.fill(0);
  mutable.copyWithin(0, 1);
  mutable.sort();
  mutable.reverse();
  const v = geo.vertexToPoint;
  // @ts-expect-error set
  v.set([1, 2]);
  // @ts-expect-error fill
  v.fill(0);
  // @ts-expect-error copyWithin
  v.copyWithin(0, 1);
  // @ts-expect-error sort
  v.sort();
  // @ts-expect-error reverse
  v.reverse();
}

/**
 * The half that is about the FIELD rather than the array. Putting one
 * array back on its own is how the three stop agreeing with each other
 * and with the vertex and primitive attribute sets; `setTopology` and the
 * library-internal `installTopology` replace all three together.
 */
export function replacingOneArray(): void {
  holder.vertexToPoint = mutable;
  // @ts-expect-error the three arrays are getters, not assignable fields
  geo.vertexToPoint = mutable;
  // @ts-expect-error not even from another geometry's, which is what a lend would look like
  geo.primVertexStart = other.primVertexStart;
}

export function throughSubarray(): void {
  // A subarray SHARES the buffer it was taken from, so a mutable one
  // would hand out the write in a single call.
  mutable.subarray(0, 2)[0] = 1;
  const sub = geo.vertexToPoint.subarray(0, 2);
  // @ts-expect-error the subarray of a read view is a read view
  sub[0] = 1;
  // @ts-expect-error and it cannot be widened back by assignment either
  const escaped: Uint32Array = sub;
  void escaped;
}

export function throughSlice(): void {
  // `slice` COPIES, so what it returns is the caller's own array. It is
  // the sanctioned way to writable bytes — `src/cli/fingerprint.ts` and
  // `src/graph/tripwire.ts` both take it — and it must keep compiling.
  const copy = geo.vertexToPoint.slice();
  copy[0] = 1;
  const asArray: Uint32Array = copy;
  wantsMutable(asArray);
}

export function assignmentToMutable(): void {
  const ok: Uint32Array = mutable;
  void ok;
  // @ts-expect-error the read view is not the array it views
  const bad: Uint32Array = geo.vertexToPoint;
  void bad;
}

export function passingToMutableParameter(): void {
  wantsMutable(mutable);
  // @ts-expect-error a helper that takes writable topology cannot be handed a read view
  wantsMutable(geo.primVertexCount);
}

export function reachingTheBuffer(): void {
  // Comparing two buffers is allowed: it is how a test asks whether a
  // derived geometry was lent its topology or handed a copy.
  const same = geo.vertexToPoint.buffer === other.vertexToPoint.buffer;
  void same;
  const size: number = geo.vertexToPoint.buffer.byteLength;
  void size;
  // Building from one is not. A byte view over a lent array is a
  // writable alias of a cached geometry's topology, reached with no cast
  // and no `instanceof`.
  // @ts-expect-error a topology array's buffer is not an ArrayBufferLike
  const bytes = new Uint8Array(geo.vertexToPoint.buffer, geo.vertexToPoint.byteOffset, 4);
  void bytes;
  // @ts-expect-error nor may it stand in for one
  const asBuffer: ArrayBufferLike = geo.vertexToPoint.buffer;
  void asBuffer;
  // @ts-expect-error and the view as a whole is not an ArrayBufferView
  const asView: ArrayBufferView = geo.vertexToPoint;
  void asView;
}

/**
 * `setTopology` takes the read view so that another geometry's arrays can
 * be handed straight to it — which is what `cloneGeometry` does — and it
 * still takes a real array, so no existing caller had to change. It
 * copies, so neither is a way through.
 */
export function setTopologyTakesEither(): void {
  geo.setTopology(mutable, mutable, mutable);
  geo.setTopology(other.vertexToPoint, other.primVertexStart, other.primVertexCount);
}

export function buildingTheReplacementStillWorks(): void {
  // The other half of the contract, and the way a node actually changes
  // topology: build the three arrays, then install them. Nothing above is
  // refusing writes in general — it refuses writing the arrays a geometry
  // already holds.
  const next = new Uint32Array(4);
  next[0] = 1;
  next.set([1, 2], 1);
  next.fill(3, 3);
  wantsMutable(next);
  geo.setTopology(next, Uint32Array.of(0), Uint32Array.of(4));
  const bytes = new Uint8Array(next.buffer, next.byteOffset, next.byteLength);
  bytes[0] = 1;
}

/**
 * THE HOLES THAT REMAIN, pinned as facts rather than wished away — the
 * same ones `ReadonlyAttrData` has, because this IS that type. No line
 * below has a directive on it, because none of them is an error today:
 * every one compiles, and each was run against the checker rather than
 * reasoned about. They are here so that the closure is never read as a
 * proof, and so that a future TypeScript or lib change CLOSING one shows
 * up as a compile error in this file rather than going unnoticed.
 */
export function knownHoles(): void {
  const v: ReadonlyTopology = geo.vertexToPoint;
  // `instanceof` intersects the view with the concrete class, and the
  // class brings back the mutable index signature and all five mutators.
  if (v instanceof Uint32Array) {
    v[0] = 1;
    v.set([1, 2]);
  }
  // `lib.es5.d.ts` types the callback's third parameter as the mutable
  // class, so the array arrives writable however the receiver was typed.
  geo.primVertexStart.forEach((_value, _index, arr) => {
    arr[0] = 1;
  });
  // STRUCTURAL WIDENING, and this is the one worth knowing: no cast, no
  // `instanceof`, no callback. TypeScript does not treat a readonly index
  // signature as incompatible with a mutable one, so the view is
  // assignable to something that can be written through.
  const widened: { [index: number]: number } = geo.vertexToPoint;
  widened[0] = 1;
  // The reflective routes, which never consult the type at all.
  Reflect.set(geo.vertexToPoint, 0, 1);
  Object.assign(geo.vertexToPoint, { 0: 1 });
  Object.defineProperty(geo.vertexToPoint, "0", { value: 1 });
  Uint32Array.prototype.set.call(geo.vertexToPoint, [1, 2]);
}

/**
 * THE SAME REFUSALS, THROUGH THE PACKAGE NAME. Everything above reads the
 * source; this one reads `dist/*.d.ts`, which is what a consumer gets —
 * so it catches the case the source cannot: a d.ts bundler or a widened
 * barrel republishing `vertexToPoint` as the array it views, with `src/`
 * still right.
 *
 * It is only as current as the last `npm run build`, which is exactly why
 * it is not the whole file. `npm run check` is specified to run on a
 * fresh `dist/`; on a stale one these three directives go unused and this
 * fails LOUDLY, which is the correct reading of "the published types are
 * not the ones I just wrote".
 */
type PublishedGeometry = import("pcg-ts").Geometry;
declare const publishedGeo: PublishedGeometry;

export function publishedChecks(): void {
  // @ts-expect-error indexed store, through the published typings
  publishedGeo.vertexToPoint[0] = 1;
  // @ts-expect-error bulk write, through the published typings
  publishedGeo.primVertexStart.set([1, 2]);
  // @ts-expect-error the published read view is not the array it views
  const bad: Uint32Array = publishedGeo.primVertexCount;
  void bad;
}
