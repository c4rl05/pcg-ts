/**
 * Sizing an {@link AttributeSet} for a caller that OVERWRITES what it
 * sizes: no default fill, and capacity exactly the count.
 *
 * LIBRARY-INTERNAL, AND DELIBERATELY UNREACHABLE FROM EVERY ENTRY POINT,
 * the way `adoptTopology.ts` is. `src/data/index.ts` re-exports the whole
 * of `attribute.js`, so a method on {@link AttributeSet} would be public
 * API however it was commented — `@internal` is a note to a reader, not a
 * guard, and nothing in this repository strips it from the published
 * `.d.ts`. These are functions in a module no barrel names, so neither the
 * root import nor any subpath can reach them, and `overwrite.test.ts`
 * fails if that stops being true.
 *
 * Being unreachable is the whole point, because what these skip is what a
 * caller outside the library would be relying on. `resize` and `add`
 * promise that every element a caller has not written reads as the
 * column's DEFAULT; these two promise nothing about it. A JS caller that
 * found them would get zeros where a scale of 1 or a colour belongs, or —
 * after a shrink and a regrow — whatever the longer count left in that
 * storage. The obligation that buys the speed cannot be expressed in the
 * type, so the function must not be offered to callers who never took it
 * on.
 *
 * Inside the library the obligation is discharged at each call site, and
 * stated there: a clone and a gather write every element of every column
 * they create, and a merge writes each input's block of every column,
 * filling the default itself over the block of an input that lacks one.
 */
import { Attribute, type AttributeSet } from "./attribute.js";
import type { AttrDefault, AttrType } from "./types.js";

/**
 * The state {@link AttributeSet} keeps private, reached by name because
 * these functions are its own module's neighbours rather than its methods.
 * `private` in TypeScript is a compile-time rule over ordinary
 * properties, so this view is a cast and not a runtime trick; the tests
 * that check element counts and capacities fail loudly if a field is ever
 * renamed under it.
 */
interface SetState {
  readonly map: Map<string, Attribute>;
  _count: number;
  _capacity: number;
}

function state(set: AttributeSet): SetState {
  return set as unknown as SetState;
}

/**
 * {@link AttributeSet.resize} for a caller that knows the FINAL count and
 * writes every element in `[previous count, count)` of every column before
 * anything reads it. Two things differ, and nothing else:
 *
 * - New elements are NOT initialized to the default. They hold zeros when
 *   storage grows, and whatever an earlier, longer count left there when it
 *   does not, so a range the caller does not overwrite reads as neither. A
 *   caller that leaves any element of any column unwritten must use
 *   `resize`, or fill that range with {@link Attribute.fillDefault} itself.
 * - Capacity is EXACT rather than doubled: storage that has to grow grows to
 *   `count` elements, and a set holding no columns — whose capacity is only
 *   a number until a column is added — takes `count` as its capacity
 *   outright, shrinking it if need be. That is right for a result built once
 *   at a size known up front (a clone, a merge of known inputs, a gather of a
 *   known index list); a column that keeps growing should grow through
 *   `resize`, whose doubling keeps appends amortized. A later `resize` past
 *   an exact capacity doubles from there as usual.
 */
export function resizeForOverwrite(set: AttributeSet, count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`resize: count must be a non-negative integer, got ${count}`);
  }
  const s = state(set);
  if (s.map.size === 0) {
    s._capacity = count;
  } else if (count > s._capacity) {
    for (const attr of s.map.values()) attr._grow(count);
    s._capacity = count;
  }
  s._count = count;
}

/**
 * {@link AttributeSet.add} WITHOUT initializing the existing elements: the
 * new column's storage is fresh, so it reads as zeros, not as
 * `defaultValue`, until the caller writes it. Only for a caller that writes
 * EVERY element in `[0, count)` of this column before anything can read it
 * — a copy of a whole column, or a gather with one source per destination
 * slot. Anything less must use `add`: a non-zero default (scale 1, a
 * colour, a string that is not the table's first entry) left unwritten
 * would read as 0.
 *
 * A string column still interns its default at table index 0, exactly as
 * `add` does, so the table a full copy builds is the one it built before.
 */
export function addForOverwrite<T extends AttrType>(
  set: AttributeSet,
  name: string,
  type: T,
  tupleSize = 1,
  defaultValue?: AttrDefault,
): Attribute<T> {
  const s = state(set);
  if (s.map.has(name)) {
    throw new Error(`attribute "${name}" already exists`);
  }
  const attr = new Attribute(name, type, tupleSize, s._capacity, defaultValue);
  s.map.set(name, attr);
  return attr;
}
