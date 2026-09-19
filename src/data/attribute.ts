import { ATTR_CTORS, type AttrDefault, type AttrType, type AttrTypeMap } from "./types.js";

const MIN_CAPACITY = 8;

/**
 * One bound of {@link Attribute.fill} as an element index: truncated toward
 * zero, NaN read as 0 (what `ToIntegerOrInfinity` does for the language's
 * own `fill`), and clamped into `[0, capacity]` rather than counted back
 * from the end.
 */
function fillBound(index: number, capacity: number): number {
  const whole = Math.trunc(index);
  if (!(whole > 0)) return 0;
  return whole < capacity ? whole : capacity;
}

function normalizeDefault(
  type: AttrType,
  tupleSize: number,
  defaultValue: AttrDefault | undefined,
): number[] | string {
  if (type === "string") {
    if (defaultValue === undefined) return "";
    if (typeof defaultValue !== "string") {
      throw new Error("attribute: string attributes take a string default");
    }
    return defaultValue;
  }
  if (typeof defaultValue === "string") {
    throw new Error("attribute: numeric attributes take a numeric default");
  }
  if (defaultValue === undefined) return new Array<number>(tupleSize).fill(0);
  if (typeof defaultValue === "number") return new Array<number>(tupleSize).fill(defaultValue);
  if (defaultValue.length !== tupleSize) {
    throw new Error(
      `attribute: default tuple length ${defaultValue.length} does not match tupleSize ${tupleSize}`,
    );
  }
  return Array.from(defaultValue);
}

/**
 * A single named attribute column: SoA typed-array storage holding
 * `capacity * tupleSize` scalars. Values follow typed-array conversion
 * semantics (`bool` stores 0/1 bytes, integer types truncate/wrap).
 * String attributes store Uint32 indices into {@link Attribute.stringTable}.
 *
 * Hot loops should read/write {@link Attribute.data} directly; the
 * accessors here are conveniences for non-critical paths.
 */
export class Attribute<T extends AttrType = AttrType> {
  readonly type: T;
  /** Components per element (e.g. 3 for a vec3). */
  readonly tupleSize: number;
  /**
   * Backing storage; length = capacity * tupleSize. Reallocated on growth —
   * do not cache across resizes.
   */
  data: AttrTypeMap[T];
  /** String table for string attributes (data stores indices into it). Empty for other types. */
  readonly stringTable: string[] = [];

  private _name: string;
  private _default: number[] | string;
  private readonly stringIndices = new Map<string, number>();

  constructor(name: string, type: T, tupleSize = 1, capacity = 0, defaultValue?: AttrDefault) {
    if (!Number.isInteger(tupleSize) || tupleSize < 1) {
      throw new Error(`attribute "${name}": tupleSize must be a positive integer`);
    }
    this._name = name;
    this.type = type;
    this.tupleSize = tupleSize;
    this._default = normalizeDefault(type, tupleSize, defaultValue);
    this.data = new ATTR_CTORS[type](capacity * tupleSize);
    // Intern the default at index 0 so zero-initialized storage reads as it.
    if (type === "string") this.internString(this._default as string);
  }

  get name(): string {
    return this._name;
  }

  /** Elements this column can hold without reallocating. */
  get capacity(): number {
    return this.data.length / this.tupleSize;
  }

  /**
   * Per-element default: a tuple of numbers, or the default string for
   * string attributes.
   */
  get defaultValue(): readonly number[] | string {
    return this._default;
  }

  /** Read one component of an element. */
  get(index: number, component = 0): number {
    return this.data[index * this.tupleSize + component];
  }

  /** Write one component of an element. */
  set(index: number, value: number, component = 0): void {
    this.data[index * this.tupleSize + component] = value;
  }

  /** Read a whole element tuple, reusing `out` when provided. */
  getTuple(index: number, out: number[] = []): number[] {
    const ts = this.tupleSize;
    const offset = index * ts;
    out.length = ts;
    for (let k = 0; k < ts; k++) out[k] = this.data[offset + k];
    return out;
  }

  /** Write a whole element tuple. */
  setTuple(index: number, values: ArrayLike<number>): void {
    const ts = this.tupleSize;
    if (values.length !== ts) {
      throw new Error(`attribute "${this._name}": tuple length ${values.length} !== ${ts}`);
    }
    const offset = index * ts;
    for (let k = 0; k < ts; k++) this.data[offset + k] = values[k];
  }

  /** Read a string element (string attributes only). */
  getString(index: number, component = 0): string {
    this.assertString();
    return this.stringTable[this.data[index * this.tupleSize + component]] ?? "";
  }

  /** Write a string element, interning into the string table (string attributes only). */
  setString(index: number, value: string, component = 0): void {
    this.assertString();
    this.data[index * this.tupleSize + component] = this.internString(value);
  }

  /** Return the table index for `value`, adding it to the table if new. */
  internString(value: string): number {
    this.assertString();
    let idx = this.stringIndices.get(value);
    if (idx === undefined) {
      idx = this.stringTable.length;
      this.stringTable.push(value);
      this.stringIndices.set(value, idx);
    }
    return idx;
  }

  /**
   * The table index for `value`, or undefined when the table does not
   * hold it. The READ-ONLY half of {@link internString}, and it exists
   * because that one INSERTS: anything that resolves a string while
   * merely looking at a geometry — a field evaluating over it, notably —
   * would otherwise edit the column it is reading, appending an entry no
   * element uses. That edit is invisible until the next `copyFrom`
   * compacts the table and renumbers everything after it, so two cells of
   * one world can end up disagreeing about indices for no reason a caller
   * could see. Callers that WANT the insertion (every writer) keep
   * calling `internString`.
   */
  lookupString(value: string): number | undefined {
    this.assertString();
    return this.stringIndices.get(value);
  }

  /**
   * Fill elements `[start, end)` with a value (scalar broadcast, tuple, or
   * string).
   *
   * THE BOUNDS ARE ELEMENT INDICES, TRUNCATED TOWARD ZERO and clamped to
   * `[0, capacity]`, whatever the value is: a fractional bound drops its
   * fraction (`end` 3.5 is `end` 3, so element 3 is not written and no
   * element is written in part), NaN reads as 0 the way the language's own
   * `fill` reads it, and a negative bound clamps to 0 rather than counting
   * back from the end. One rule for all three kinds of value, rather than
   * the three the typed-array `fill` and a per-element loop would each have
   * brought.
   */
  fill(value: AttrDefault, start = 0, end = this.capacity): void {
    const ts = this.tupleSize;
    const data = this.data;
    const cap = this.capacity;
    const lo = fillBound(start, cap) * ts;
    const hi = fillBound(end, cap) * ts;
    if (this.type === "string") {
      if (typeof value !== "string") {
        throw new Error(`attribute "${this._name}": fill value must be a string`);
      }
      // Interned before the range is looked at, so an empty range still
      // leaves the table holding the word the caller named — which is what
      // it did when the interning was this call's argument.
      data.fill(this.internString(value), lo, hi);
      return;
    }
    if (typeof value === "string") {
      throw new Error(`attribute "${this._name}": fill value must be numeric`);
    }
    const scalar = typeof value === "number";
    if (!scalar && value.length !== ts) {
      throw new Error(`attribute "${this._name}": fill tuple length ${value.length} !== ${ts}`);
    }
    if (hi <= lo) return;
    // SEED ONE TUPLE WITH INDEXED STORES — the very writes this replaces,
    // component for component — and spread those STORED BYTES over the
    // rest of the range. A scalar is the same thing with every component
    // the same number, and takes this path too so that `fill(NaN)` and
    // `fill([NaN])` cannot disagree about one method's bytes.
    for (let k = 0; k < ts; k++) data[lo + k] = scalar ? value : value[k];
    // One `fill` when every component came back from storage as the same
    // number: every scalar default (defaults are tuples even at tupleSize
    // 1) and the uniform vectors ([0, 0, 0], [1, 1, 1]). The test is on
    // what was STORED, not on what was asked for, so 1 and 1 + 1e-9
    // collapse in f32 while 0 and -0 stay apart (`Object.is`), and filling
    // with the value read back stores those same bits again. A NaN is
    // excluded outright: every NaN reads back equal to every other however
    // its bits differ ([NaN, -NaN] is 7fc00000 then ffc00000 in f32), and
    // what `fill` writes for one is not specified to be what an indexed
    // store of it writes — the copy below moves the seeded bytes instead.
    const seed = data[lo];
    let uniform = seed === seed;
    for (let k = 1; uniform && k < ts; k++) uniform = Object.is(data[lo + k], seed);
    if (uniform) {
      data.fill(seed, lo + ts, hi);
      return;
    }
    // Otherwise double the seeded tuple with `copyWithin`, which moves
    // stored bytes: log2(elements) native copies instead of one JS store
    // per component, whatever those bytes are.
    let filled = ts;
    while (lo + filled < hi) {
      const n = Math.min(filled, hi - lo - filled);
      data.copyWithin(lo + filled, lo, lo + n);
      filled += n;
    }
  }

  /** Fill elements [start, end) with the attribute default. */
  fillDefault(start: number, end: number): void {
    this.fill(this._default, start, end);
  }

  /**
   * Copy `count` elements from `src` (which may be this attribute; overlap
   * is handled) starting at `srcStart` into this attribute at `dstStart`.
   * Types and tuple sizes must match; string values are re-interned into
   * this attribute's table.
   *
   * BOTH RANGES ARE CHECKED AGAINST CAPACITY, NOT AGAINST THE ELEMENT
   * COUNT, and cannot be anything else: an {@link Attribute} is storage
   * and does not know the {@link AttributeSet} it belongs to or how many
   * of its slots are live. So a range that reaches past the last element
   * but stays inside the allocation is accepted here, and what it reads is
   * a dead slot — zeros, a default, or what a shrink left behind — which
   * also means whether such a range is accepted depends on how the source
   * was built (capacity is exactly the count for a clone, a merge or a
   * gather, and rounded up by doubling for a column that was appended to).
   * A caller holding the set bounds by `count` itself before calling, which
   * is what the library's own gather (`copyElements`, src/nodes/util.ts)
   * does.
   */
  copyFrom(src: Attribute, srcStart: number, dstStart: number, count: number): void {
    if (src.type !== this.type || src.tupleSize !== this.tupleSize) {
      throw new Error(
        `attribute "${this._name}": copyFrom requires matching type and tupleSize`,
      );
    }
    if (count < 0 || srcStart < 0 || dstStart < 0) {
      throw new Error(`attribute "${this._name}": copyFrom range out of bounds`);
    }
    if (srcStart + count > src.capacity || dstStart + count > this.capacity) {
      throw new Error(`attribute "${this._name}": copyFrom range out of bounds`);
    }
    const ts = this.tupleSize;
    if (src === (this as Attribute)) {
      this.data.copyWithin(dstStart * ts, srcStart * ts, (srcStart + count) * ts);
      return;
    }
    if (this.type === "string") {
      const n = count * ts;
      for (let i = 0; i < n; i++) {
        const s = src.stringTable[src.data[srcStart * ts + i]] ?? "";
        this.data[dstStart * ts + i] = this.internString(s);
      }
      return;
    }
    this.data.set(src.data.subarray(srcStart * ts, (srcStart + count) * ts), dstStart * ts);
  }

  /** @internal Grow storage to at least `capacity` elements, preserving data. */
  _grow(capacity: number): void {
    const needed = capacity * this.tupleSize;
    if (this.data.length >= needed) return;
    const next = new ATTR_CTORS[this.type](needed);
    next.set(this.data);
    this.data = next;
  }

  /** @internal */
  _setName(name: string): void {
    this._name = name;
  }

  /** @internal Reset the default value (re-normalized and validated). */
  _setDefault(defaultValue: AttrDefault | undefined): void {
    this._default = normalizeDefault(this.type, this.tupleSize, defaultValue);
  }

  private assertString(): void {
    if (this.type !== "string") {
      throw new Error(`attribute "${this._name}": not a string attribute`);
    }
  }
}

/**
 * An ordered collection of attributes sharing one element count (one domain
 * of a geometry). Iteration order is insertion order — stable and
 * deterministic; rename keeps the attribute's position.
 *
 * NOT A `Map`, despite carrying `get` and `has`. Iterating yields each
 * {@link Attribute} itself, never a `[name, attribute]` pair; there is no
 * `set`, `entries`, `keys`, `values` or `forEach`; `names()` is the list of
 * names and `size` the number of attributes. A column is created with
 * {@link AttributeSet.add}, which THROWS on a name already taken — the
 * collision a `Map.set` would silently overwrite — or replaced outright
 * with {@link AttributeSet.replace}. A geometry's sets are reached as
 * `geo.attrs[domain]`, an ordinary record keyed by domain name, so one
 * attribute is `geo.attrs[domain].get(name)`.
 *
 * Properties (not methods), in full: `capacity`, `count`, `size`.
 */
export class AttributeSet implements Iterable<Attribute> {
  private readonly map = new Map<string, Attribute>();
  private _count = 0;
  private _capacity = 0;

  /** Number of elements in this domain. */
  get count(): number {
    return this._count;
  }

  /**
   * Allocated element capacity, always at least {@link count}. It grows by
   * doubling as elements are appended, but a result built once at a known
   * size (a cloned, merged or gathered geometry) is allocated at exactly
   * its count. Read `count`, never capacity, for how many elements hold
   * data.
   */
  get capacity(): number {
    return this._capacity;
  }

  /** Number of attributes. */
  get size(): number {
    return this.map.size;
  }

  /**
   * Create a new attribute. Existing elements are initialized to
   * `defaultValue`. Throws if the name is already taken.
   */
  add<T extends AttrType>(
    name: string,
    type: T,
    tupleSize = 1,
    defaultValue?: AttrDefault,
  ): Attribute<T> {
    if (this.map.has(name)) {
      throw new Error(`attribute "${name}" already exists`);
    }
    const attr = new Attribute(name, type, tupleSize, this._capacity, defaultValue);
    if (this._count > 0) attr.fillDefault(0, this._count);
    this.map.set(name, attr);
    return attr;
  }

  /**
   * Create the attribute, or reset an existing one of the same shape in
   * place (keeping storage and insertion order). All element values are
   * reset to `defaultValue`; a shape mismatch replaces the attribute.
   */
  replace<T extends AttrType>(
    name: string,
    type: T,
    tupleSize = 1,
    defaultValue?: AttrDefault,
  ): Attribute<T> {
    const existing = this.map.get(name);
    if (existing && existing.type === type && existing.tupleSize === tupleSize) {
      existing._setDefault(defaultValue);
      existing.fillDefault(0, this._count);
      return existing as Attribute<T>;
    }
    if (existing) this.map.delete(name);
    return this.add(name, type, tupleSize, defaultValue);
  }

  get(name: string): Attribute | undefined {
    return this.map.get(name);
  }

  /** Like {@link get} but throws when the attribute is missing. */
  require(name: string): Attribute {
    const attr = this.map.get(name);
    if (!attr) throw new Error(`attribute "${name}" not found`);
    return attr;
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  /** Remove an attribute; returns whether it existed. */
  remove(name: string): boolean {
    return this.map.delete(name);
  }

  /** Rename an attribute, preserving its position in iteration order. */
  rename(oldName: string, newName: string): void {
    if (oldName === newName) return;
    const attr = this.require(oldName);
    if (this.map.has(newName)) {
      throw new Error(`attribute "${newName}" already exists`);
    }
    const entries: Array<[string, Attribute]> = [];
    for (const [key, value] of this.map) {
      entries.push([key === oldName ? newName : key, value]);
    }
    this.map.clear();
    for (const [key, value] of entries) this.map.set(key, value);
    attr._setName(newName);
  }

  /**
   * Set the element count. Existing element data is preserved; new elements
   * are initialized to each attribute's default. Capacity grows by
   * doubling; shrinking keeps capacity.
   */
  resize(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`resize: count must be a non-negative integer, got ${count}`);
    }
    if (count > this._capacity) {
      let cap = Math.max(MIN_CAPACITY, this._capacity);
      while (cap < count) cap *= 2;
      for (const attr of this.map.values()) attr._grow(cap);
      this._capacity = cap;
    }
    if (count > this._count) {
      for (const attr of this.map.values()) attr.fillDefault(this._count, count);
    }
    this._count = count;
  }

  /** Attribute names in insertion order. */
  names(): string[] {
    return [...this.map.keys()];
  }

  /** Iterate attributes in insertion order. */
  [Symbol.iterator](): IterableIterator<Attribute> {
    return this.map.values();
  }
}
