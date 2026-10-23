/**
 * The attribute UNION two point merges share, and the point-cloud
 * concatenation built on it.
 *
 * Internal, and in a module of its own for that reason: `pointOps.ts` is
 * published whole through `export *`, so a helper living there would ride
 * out into the package surface. `mergePoints`, `mergePrimitives` and
 * `applyRules` import from here, so what a missing column becomes is
 * decided in exactly one place.
 */
import {
  type AttrDefault,
  type AttributeSet,
  type Domain,
  Geometry,
  PRIMTYPE_ATTR,
} from "../data/index.js";
import { resizeForOverwrite } from "../data/overwrite.js";

/**
 * Union the attribute columns of one domain across every input into
 * `into`: first-occurrence order, and the first occurrence's type, tuple
 * size and default. Two inputs disagreeing on an attribute's shape is a
 * hard error naming it — the alternative is a column whose meaning
 * changes halfway down, which nothing downstream could notice.
 *
 * Copying the values is the caller's job, because the two merges append
 * different things: this only settles what columns exist and what an
 * input that lacks one contributes (its default, filled by `resize`).
 *
 * `primtype` on the primitive domain is the ONE column whose default is
 * overridden, and `mergePrimitives` (pointOps.ts) explains why.
 */
export function unionColumns(
  who: string,
  items: readonly { readonly geo: Geometry }[],
  domain: Domain,
  into: AttributeSet,
): void {
  for (const item of items) {
    for (const attr of item.geo.attrs[domain]) {
      const existing = into.get(attr.name);
      if (!existing) {
        // `attr.type === "string"` is not decoration: the empty default
        // below is only a legal default FOR a string column, and a
        // hand-built numeric column under this name would otherwise be
        // refused by the attribute layer in an error naming neither this
        // node nor the input it came from. Such a column is not a type
        // tag anyway, so it takes the ordinary rule.
        const isPrimType =
          domain === "primitive" && attr.name === PRIMTYPE_ATTR && attr.type === "string";
        into.add(
          attr.name,
          attr.type,
          attr.tupleSize,
          isPrimType ? "" : (attr.defaultValue as AttrDefault),
        );
      } else if (existing.type !== attr.type || existing.tupleSize !== attr.tupleSize) {
        throw new Error(
          `${who}: attribute "${attr.name}" has conflicting shapes across inputs on the ${domain} ` +
            `domain (${existing.type} tuple ${existing.tupleSize} vs ${attr.type} tuple ${attr.tupleSize}). ` +
            `Every input must agree on a name's type and tuple size — rename one side with setAttribute, ` +
            `or drop the column upstream with removeAttribute (domain "${domain}", names ["${attr.name}"]).`,
        );
      }
    }
  }
}

/**
 * Write one input's block `[offset, offset + n)` of every column of `into`,
 * for a merge that sized `into` with `resizeForOverwrite` and so skipped
 * the default fill. A column the input carries is copied over the block; a
 * column it lacks gets its default over the block — exactly what the fill
 * over the whole result used to leave there, now written once instead of
 * written and then copied over. Blocks tile the result, so after the last
 * input every element of every column has been written exactly once.
 */
export function appendBlock(into: AttributeSet, from: AttributeSet, offset: number, n: number): void {
  for (const dst of into) {
    const src = from.get(dst.name);
    if (src === undefined) dst.fillDefault(offset, offset + n);
    else dst.copyFrom(src, 0, offset, n);
  }
}

/**
 * Concatenate point clouds into one, with `mergePoints`' attribute UNION:
 * a column one input lacks is default-filled over that input's range, and
 * two inputs disagreeing on a name's type or tuple size are refused, naming
 * `who`. Points only — topology is not carried, and neither is the detail
 * domain. The one implementation of that contract, so `mergePoints` and the
 * wrappers that concatenate rounds of products (`applyRules`) cannot drift
 * apart on what a missing column becomes.
 *
 * At least one geometry: the union of none has no columns at all, not even
 * P, which is a malformed cloud rather than an empty one.
 */
export function concatPointClouds(who: string, geos: readonly Geometry[]): Geometry {
  const items = geos.map((geo) => ({ geo }));
  const out = new Geometry();
  const outSet = out.attrs.point;
  unionColumns(who, items, "point", outSet);
  let total = 0;
  for (const geo of geos) total += geo.pointCount;
  resizeForOverwrite(outSet, total);
  let offset = 0;
  for (const geo of geos) {
    appendBlock(outSet, geo.attrs.point, offset, geo.pointCount);
    offset += geo.pointCount;
  }
  return out;
}

/**
 * {@link concatPointClouds} for a record that must NOT be able to fail: a
 * column the inputs disagree on (type or tuple size) is left off the result
 * instead of refused, and its name is returned in `dropped`, in
 * first-occurrence order. Every other column follows the ordinary union.
 *
 * `applyRules`' trail is the one user: its blocks are cells from DIFFERENT
 * rounds, which may legitimately carry one name in two shapes (a rule
 * writes a scratch column as f32, a later rule removes it and writes it as
 * i32), while the cells that reach `out` never meet. Refusing there would
 * make wiring the trail fail a cook that succeeds unwired.
 */
export function concatPointCloudsDropping(geos: readonly Geometry[]): { geo: Geometry; dropped: string[] } {
  const shape = new Map<string, string>();
  const dropped: string[] = [];
  const conflict = new Set<string>();
  for (const geo of geos) {
    for (const attr of geo.attrs.point) {
      const s = `${attr.type}x${attr.tupleSize}`;
      const seen = shape.get(attr.name);
      if (seen === undefined) shape.set(attr.name, s);
      else if (seen !== s && !conflict.has(attr.name)) {
        conflict.add(attr.name);
        dropped.push(attr.name);
      }
    }
  }
  const out = new Geometry();
  const outSet = out.attrs.point;
  for (const geo of geos) {
    for (const attr of geo.attrs.point) {
      if (conflict.has(attr.name) || outSet.has(attr.name)) continue;
      outSet.add(attr.name, attr.type, attr.tupleSize, attr.defaultValue as AttrDefault);
    }
  }
  let total = 0;
  for (const geo of geos) total += geo.pointCount;
  resizeForOverwrite(outSet, total);
  let offset = 0;
  for (const geo of geos) {
    appendBlock(outSet, geo.attrs.point, offset, geo.pointCount);
    offset += geo.pointCount;
  }
  return { geo: out, dropped };
}
