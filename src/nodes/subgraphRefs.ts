/**
 * @internal Which wrapper defs were materialized from a `ref` rather than
 * an embedded `subgraph` payload.
 *
 * Its own module rather than a private map inside `serialize.ts` because two
 * readers need it: the writer, which writes a reference back out as it came,
 * and `diagnoseGraph`, which recurses into INLINE bodies only — a referenced
 * body is a registered recipe, held clean by the gate that loads every
 * primitive, and walking it per reference would repeat one recipe's findings
 * once per use. Deliberately not re-exported by `./index.ts`: `serialize.ts`
 * is star-exported, so an accessor defined there would have become package
 * API by accident.
 */
import type { SerializedSubgraphRef } from "./serialize.js";

/**
 * Keyed on the def, which is created fresh per reference (see
 * `registerSubgraph`), so two references never share a record.
 */
const subgraphRefs = new WeakMap<object, SerializedSubgraphRef>();

/** Remember the reference a materialized def came from. */
export function recordSubgraphRef(def: object, ref: SerializedSubgraphRef): void {
  subgraphRefs.set(def, ref);
}

/** The reference `def` was materialized from, or `undefined` for an inline or API-built def. */
export function subgraphRefOf(def: object): SerializedSubgraphRef | undefined {
  return subgraphRefs.get(def);
}
