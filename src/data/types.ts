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
 * `Attribute.writable()`, which is also where a shared column forks.
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
 *
 * Both are compile-time holes only. Neither is reachable by accident, and
 * neither is used anywhere in this repository, but a reader who assumes
 * this type is airtight will eventually write one.
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
