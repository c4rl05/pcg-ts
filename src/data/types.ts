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
 * A column's storage AS A READER SEES IT: every read a typed array
 * offers — indexing, `length`, `slice`, `buffer`, iteration — and none of
 * the four that write (`set`, `fill`, `copyWithin`, `sort`/`reverse`).
 * This is the type of {@link Attribute.data}; the write route is
 * `Attribute.writable()`, which is also where a shared column forks.
 *
 * `subarray` is kept and RETYPED to return this same view, because a
 * subarray shares the buffer it was taken from: letting it come back
 * mutable would hand out, in one call, exactly the write this type
 * exists to refuse. `slice` is untouched — it copies, so what it returns
 * is the caller's own array and may be written freely.
 *
 * DISTRIBUTIVE over the union on purpose. `Attribute` defaults to
 * `AttrType`, so its `data` is a union of five array types; a
 * non-distributive `Omit` over that union would collapse the five into
 * one object whose every member is a union of signatures, and `slice()`
 * would stop being callable. Written as a conditional type, the union of
 * arrays stays a union of views, which is what it already was.
 */
export type ReadonlyAttrData<T extends AttrData = AttrData> = T extends AttrData
  ? Omit<T, number | "set" | "fill" | "copyWithin" | "sort" | "reverse" | "subarray"> & {
      readonly [index: number]: number;
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
