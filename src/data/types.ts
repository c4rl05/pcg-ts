/** Element classes that attributes can live on. */
export type Domain = "point" | "vertex" | "primitive" | "detail";

/** All domains in canonical order. */
export const DOMAINS: readonly Domain[] = ["point", "vertex", "primitive", "detail"];

/** Storage types for attribute columns. */
export type AttrType = "f32" | "i32" | "u32" | "bool" | "string";

/**
 * Maps each {@link AttrType} to its backing typed-array type.
 * `bool` stores 0/1 bytes; `string` stores Uint32 indices into the
 * attribute's per-attribute string table.
 */
export interface AttrTypeMap {
  f32: Float32Array;
  i32: Int32Array;
  u32: Uint32Array;
  bool: Uint8Array;
  string: Uint32Array;
}

/** Any attribute column array. */
export type AttrData = AttrTypeMap[AttrType];

/**
 * A column's backing buffer AS AN IDENTITY, never as memory. It is what
 * {@link ReadonlyAttrData.buffer} hands back, and it is deliberately NOT
 * an `ArrayBufferLike`: you may compare two of them, and ask a size, and
 * nothing else.
 *
 * Comparing is the point. Copy-on-write means two columns can view one
 * buffer, and three alias guards in the node library turn on exactly that
 * question — `existing.data.buffer === col.data.buffer` in
 * `setAttribute`, and the same shape in `pathPointAt` and `setBounds` —
 * so taking `buffer` away outright would remove the test those guards are
 * made of.
 *
 * Building from it is the hole. `new Uint8Array(view.buffer,
 * view.byteOffset, view.byteLength)` is a fully writable alias of a
 * cached column, reached with no cast and no `instanceof`, and it is the
 * one escape from this whole scheme that the read view cannot otherwise
 * refuse. A structural type carrying only `byteLength` satisfies every
 * real `ArrayBuffer` (so a typed array is still assignable INTO the read
 * view) while failing every typed-array constructor, which is the
 * asymmetry the guard needs.
 */
export interface AttrBufferId {
  readonly byteLength: number;
}

/**
 * A column's storage AS A READER SEES IT: every read a typed array
 * offers — indexing, `length`, `slice`, iteration — and none of the five
 * that write (`set`, `fill`, `copyWithin`, `sort`, `reverse`). This is
 * the type of {@link Attribute.data}; the write route is
 * `Attribute.writable()`, which is also where a shared column forks. It
 * is also, through {@link ReadonlyTopology}, the type of a geometry's
 * three topology arrays — which are not shared, but are installed by
 * reference into the object a node cache holds, so they need the same
 * five writes refused.
 *
 * `subarray` is kept and RETYPED to return this same view, because a
 * subarray shares the buffer it was taken from: letting it come back
 * mutable would hand out, in one call, exactly the write this type
 * exists to refuse. `slice` is untouched — it copies, so what it returns
 * is the caller's own array and may be written freely, and it is
 * therefore the honest way out when writable bytes really are wanted.
 * `buffer` is retyped to {@link AttrBufferId} for the same reason
 * `subarray` is.
 *
 * WHAT IT STILL DOES NOT CATCH, because the standard library's own types
 * say otherwise and no shape of this alias can overrule them:
 *
 * - `if (d instanceof Float32Array) { d[0] = 1 }`. The narrowing
 *   intersects this view with the concrete class, and the class brings
 *   back the mutable index signature and all five mutators. No cast is
 *   needed, and nothing here can see it — which is why
 *   `tests/attributeWriteRoute.negative.ts` pins the behaviour rather
 *   than pretending it is refused.
 * - `d.forEach((_v, _i, arr) => { arr[0] = 1 })`, and the same through
 *   `map`, `filter`, `find`, `some` and `every`: `lib.es5.d.ts` types the
 *   callback's third parameter as the mutable class, so the array arrives
 *   writable however the receiver was typed.
 * - STRUCTURAL WIDENING, and this is the one to know about, because it
 *   needs no cast, no `instanceof` and no callback: `const a: { [index:
 *   number]: number } = attr.data; a[0] = 1`. TypeScript does not treat a
 *   READONLY index signature as incompatible with a mutable one, so the
 *   view is assignable to a type that can be written through. Verified
 *   against the checker on 2026-09-20 rather than reasoned about, on this
 *   type and on {@link ReadonlyTopology} alike.
 * - THE REFLECTIVE ROUTES, none of which the type is consulted for:
 *   `Reflect.set(d, 0, 1)`, `Object.assign(d, { 0: 1 })`,
 *   `Object.defineProperty(d, "0", { value: 1 })`, and borrowing a
 *   mutator off the prototype — `Float32Array.prototype.fill.call(d, 0)`
 *   and the same through `apply` and `bind`.
 *
 * THESE ARE COMPILE-TIME HOLES ONLY, and there are five of them, so the
 * closure is a guard against the accidental spelling and NOT a proof.
 * None is reachable by accident, none is used anywhere in this
 * repository, and the runtime object is an ordinary typed array that
 * would accept any of them — a reader who assumes this type is airtight
 * will eventually write one.
 *
 * Distributive over the union, so that `ReadonlyAttrData<AttrData>` is a
 * UNION OF VIEWS rather than one merged view and
 * `ReadonlyAttrData<Float32Array>` names exactly one of them — which is
 * what lets `src/data/transfer.ts` narrow a column's read view to the f32
 * member with an ordinary assertion. A non-distributive `Omit` over the
 * union was tried and measured on TypeScript 6.0.3: `slice()` stays
 * callable and the members stay assignable, so the difference is the
 * naming above and not, as an earlier version of this comment claimed,
 * callability.
 */
export type ReadonlyAttrData<T extends AttrData = AttrData> = T extends AttrData
  ? Omit<
      T,
      number | "buffer" | "set" | "fill" | "copyWithin" | "sort" | "reverse" | "subarray"
    > & {
      readonly [index: number]: number;
      readonly buffer: AttrBufferId;
      subarray(begin?: number, end?: number): ReadonlyAttrData<T>;
    }
  : never;

/**
 * A GEOMETRY'S TOPOLOGY ARRAY AS A READER SEES IT. The same view as a
 * `u32` column's, and spelled as one, because what it has to refuse is
 * the same five writes. It keeps its own NAME rather than being written
 * out at each use: `vertexToPoint: ReadonlyAttrData<Uint32Array>` sends a
 * reader looking for an attribute, and topology is not one.
 *
 * WHY IT IS READ-ONLY AT ALL. Inside the library, topology is installed
 * BY REFERENCE: a node builds the three arrays, hands them over, and the
 * geometry it hands them to is what the graph caches.
 * So an in-place write through a geometry's `vertexToPoint` is a write
 * into a node's cached output — its own, or, when the geometry came in on
 * an input pin, an upstream node's. That is the mistake
 * `src/nodes/topologyAliasing.test.ts` was written to catch after the
 * fact; this refuses it at compile time.
 *
 * `buffer` closes to {@link AttrBufferId} for the reason it does on a
 * column: a byte view laid over the array is a fully writable alias
 * reached with no cast. `slice()` still copies, and is the way to bytes
 * that may be written — `src/cli/fingerprint.ts` and
 * `src/graph/tripwire.ts` both take it.
 *
 * ONLY THE STATIC TYPE CHANGES. The value handed back is the
 * `Uint32Array` itself, so `ArrayBuffer.isView` still answers true, a
 * structured clone still moves it, and anything reading it by index or
 * `length` reads what it always did — and every hole listed on
 * {@link ReadonlyAttrData} applies here unchanged, structural widening
 * (`const a: { [index: number]: number } = geo.vertexToPoint`) included.
 * This is a guard against the accidental spelling, not a proof.
 *
 * ONE MORE, SPECIFIC TO TOPOLOGY AND OUTSIDE THIS TYPE ALTOGETHER:
 * `pcg-ts/worker` publishes `EncodedGeometryItem` with the three arrays
 * as mutable `Uint32Array`s, and its decode installs them by reference.
 * See PLAN.md, "the worker protocol's topology arrays", for what closing
 * that would cost.
 *
 * THERE IS NO WRITE ROUTE, and that is deliberate rather than an
 * omission. Topology is REPLACED, not edited: build the three arrays and
 * install them with {@link Geometry.setTopology}, which validates them
 * and resizes the vertex and primitive sets to match. A node that wants
 * to change a few entries starts from `slice()`.
 */
export type ReadonlyTopology = ReadonlyAttrData<Uint32Array>;

/** Typed-array constructor per attribute type. */
export const ATTR_CTORS: { readonly [K in AttrType]: new (length: number) => AttrTypeMap[K] } = {
  f32: Float32Array,
  i32: Int32Array,
  u32: Uint32Array,
  bool: Uint8Array,
  string: Uint32Array,
};

/**
 * Default value accepted when creating an attribute: a scalar broadcast
 * across the tuple, a per-component tuple, or a string for string
 * attributes.
 */
export type AttrDefault = number | ArrayLike<number> | string;
