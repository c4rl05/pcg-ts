/**
 * WHAT `Attribute.data` REFUSES, checked by the compiler rather than by a
 * regular expression.
 *
 * Every `@ts-expect-error` below is a guard: if the operation under it
 * ever starts compiling, `tsc` reports "Unused '@ts-expect-error'
 * directive" and `npm run check` fails. That is the whole mechanism, and
 * it is why this file has no assertions and is never executed — the check
 * happens when the project is type-checked, not when the suite runs.
 * `attributeWriteRoute.test.ts` asserts that this file still holds the
 * cases, so it cannot be quietly emptied — as TEXT, which is all a
 * runtime test can read. So `npm test` never checks this claim and only
 * `npm run check` does: loosen `ReadonlyAttrData` and the suite stays
 * green while every directive here goes unused.
 *
 * IT REPLACED A TEXT SCAN, which is worth saying because the scan looked
 * like it was working. It banned `.data as <TypedArray>` and `.data
 * instanceof <TypedArray>` across the repository and reported no
 * offenders — but it matched zero lines even before the migration,
 * because the four real narrowings all spell it through a LOCAL
 * (`const d = attr.data; … d instanceof Float32Array`), which no regex
 * anchored on `.data` can see. It also pushed a change into
 * `src/fields/capture.ts` whose only purpose was to move an `instanceof`
 * off a member called `data` — code reshaped to please a grep. A scan
 * that cannot see the shape it bans is worse than no scan: it reports
 * "none" and is believed.
 *
 * EVERY CASE IS PAIRED with the same operation on a genuinely mutable
 * array. The pair is what makes the negative meaningful: it shows the
 * expression is well-formed and that the read view alone is what refuses
 * it. If someone loosened `ReadonlyAttrData` back to the array type, the
 * mutable half would keep compiling and every directive in the read half
 * would go unused — which is the failure this file is built to produce.
 */
// FROM THE SOURCE, not from the package name. A `tests/` file that
// imports "pcg-ts" is type-checked against `dist/*.d.ts`, so while the
// build lags the tree it is checked against the PREVIOUS `Attribute` —
// which is how a plain-local write got into
// `tests/racetrackStationGraph.test.ts` during the migration and
// compiled clean. A guard that only fires after a rebuild is a guard
// that is off whenever it matters most. The published shape is pinned
// separately, at the bottom of this file.
import type { Attribute, AttrData, ReadonlyAttrData } from "../src/data/index.js";

declare const attr: Attribute<"f32">;
declare const anyAttr: Attribute;
declare const mutable: Float32Array;

/** A parameter that means "I intend to write this". */
declare function wantsMutable(a: Float32Array): void;
declare function wantsAttrData(a: AttrData): void;

export function indexedStore(): void {
  mutable[0] = 1;
  const d = attr.data;
  // @ts-expect-error a column's read view has a read-only index signature
  d[0] = 1;
  // @ts-expect-error and so does the union form, reached straight off the column
  anyAttr.data[0] = 1;
}

export function bulkWrites(): void {
  mutable.set([1, 2]);
  mutable.fill(0);
  mutable.copyWithin(0, 1);
  mutable.sort();
  mutable.reverse();
  const d = attr.data;
  // @ts-expect-error set
  d.set([1, 2]);
  // @ts-expect-error fill
  d.fill(0);
  // @ts-expect-error copyWithin
  d.copyWithin(0, 1);
  // @ts-expect-error sort
  d.sort();
  // @ts-expect-error reverse
  d.reverse();
}

export function throughSubarray(): void {
  // A subarray SHARES the buffer it was taken from, so a mutable one
  // would hand out the write in a single call.
  mutable.subarray(0, 2)[0] = 1;
  const sub = attr.data.subarray(0, 2);
  // @ts-expect-error the subarray of a read view is a read view
  sub[0] = 1;
  // @ts-expect-error and it cannot be widened back by assignment either
  const escaped: Float32Array = sub;
  void escaped;
}

export function throughSlice(): void {
  // `slice` COPIES, so what it returns is the caller's own array. This is
  // the sanctioned way to writable bytes, and it must keep compiling.
  const copy = attr.data.slice(0, 2);
  copy[0] = 1;
  const asArray: Float32Array = copy;
  wantsMutable(asArray);
}

export function assignmentToMutable(): void {
  const ok: Float32Array = mutable;
  void ok;
  // @ts-expect-error the read view is not the array it views
  const bad: Float32Array = attr.data;
  void bad;
  // @ts-expect-error nor the union of arrays
  const badUnion: AttrData = anyAttr.data;
  void badUnion;
}

export function passingToMutableParameter(): void {
  wantsMutable(mutable);
  wantsAttrData(mutable);
  // @ts-expect-error a helper that takes a writable column cannot be handed a read view
  wantsMutable(attr.data);
  // @ts-expect-error same for the union spelling
  wantsAttrData(anyAttr.data);
}

export function reachingTheBuffer(): void {
  // Comparing two buffers is allowed and load-bearing: three alias guards
  // in src/nodes ask exactly this question.
  const same = attr.data.buffer === anyAttr.data.buffer;
  void same;
  const size: number = attr.data.buffer.byteLength;
  void size;
  // Building from one is not. This is the escape that needs no cast and
  // no `instanceof`, and it is the reason `buffer` is an identity rather
  // than memory.
  // @ts-expect-error a column's buffer is not an ArrayBufferLike
  const bytes = new Uint8Array(attr.data.buffer, attr.data.byteOffset, 4);
  void bytes;
  // @ts-expect-error nor may it stand in for one
  const asBuffer: ArrayBufferLike = attr.data.buffer;
  void asBuffer;
  // @ts-expect-error and the view as a whole is not an ArrayBufferView
  const asView: ArrayBufferView = attr.data;
  void asView;
}

export function writableIsTheWayThrough(): void {
  // The other half of the contract: `writable()` really does hand back
  // the array, so nothing above is refusing writes in general.
  const w = attr.writable();
  w[0] = 1;
  w.set([1, 2]);
  w.fill(0);
  const asArray: Float32Array = w;
  wantsMutable(asArray);
  const bytes = new Uint8Array(w.buffer, w.byteOffset, w.byteLength);
  bytes[0] = 1;
}

/**
 * THE HOLES THAT REMAIN, pinned as facts rather than wished away.
 *
 * None has a directive on it, because none is an error — every line
 * below compiles today, and each was run against the checker rather than
 * reasoned about. They are here so the holes are written down where the
 * guard is, so that nobody reads the guard as a proof, and so that a
 * future TypeScript or lib change CLOSING one shows up as a compile
 * error in this file rather than going unnoticed. See
 * `ReadonlyAttrData`'s own comment.
 */
export function knownHoles(): void {
  const d: ReadonlyAttrData = anyAttr.data;
  // `instanceof` intersects the view with the concrete class, and the
  // class brings back the mutable index signature and all five mutators.
  if (d instanceof Float32Array) {
    d[0] = 1;
    d.set([1, 2]);
  }
  // `lib.es5.d.ts` types the callback's third parameter as the mutable
  // class, so the array arrives writable however the receiver was typed.
  const f = attr.data;
  f.forEach((_v, _i, arr) => {
    arr[0] = 1;
  });
  f.map((v, _i, arr) => {
    arr[0] = 1;
    return v;
  });
  // STRUCTURAL WIDENING, the one that needs no cast, no `instanceof` and
  // no callback: TypeScript does not treat a readonly index signature as
  // incompatible with a mutable one.
  const widened: { [index: number]: number } = attr.data;
  widened[0] = 1;
  // The reflective routes, which never consult the type at all.
  Reflect.set(attr.data, 0, 1);
  Object.assign(attr.data, { 0: 1 });
  Object.defineProperty(attr.data, "0", { value: 1 });
  Float32Array.prototype.fill.call(attr.data, 0);
}

/**
 * THE SAME REFUSALS, THROUGH THE PACKAGE NAME. Everything above reads the
 * source; this one reads `dist/*.d.ts`, which is what a consumer gets —
 * so it catches the case the source cannot: a d.ts bundler or a widened
 * barrel republishing `data` as the array it views, with `src/` still
 * right.
 *
 * It is only as current as the last `npm run build`, which is exactly why
 * it is not the whole file. `npm run check` is specified to run on a
 * fresh `dist/`; on a stale one these three directives go unused and this
 * fails LOUDLY, which is the correct reading of "the published types are
 * not the ones I just wrote".
 */
type PublishedAttribute = import("pcg-ts").Attribute<"f32">;
declare const publishedAttr: PublishedAttribute;

export function publishedChecks(): void {
  // @ts-expect-error indexed store, through the published typings
  publishedAttr.data[0] = 1;
  // @ts-expect-error bulk write, through the published typings
  publishedAttr.data.set([1, 2]);
  // @ts-expect-error the published read view is not the array it views
  const bad: Float32Array = publishedAttr.data;
  void bad;
}

/**
 * A scope of its own, and not for tidiness: binding the read view and
 * then calling `writable()` on the same column is the hazard
 * `attributeWriteRoute.test.ts` scans for, and this file has no business
 * being the only thing that trips it.
 */
export function publishedWritableStillWorks(): void {
  const w: Float32Array = publishedAttr.writable();
  w[0] = 1;
}
