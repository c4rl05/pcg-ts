/**
 * The platforms' fit-out as the suites read it (tests/eiffelPlatformsFitout,
 * eiffelFitout1889, eiffelGlass, eiffelRoundness): `platforms.ts` hands its
 * drawings over as it builds them, each once in the +z face's frame with
 * where it stands (`Lot`: which faces, which stations along a face), and
 * the graph's copies put them in the world. The world solids here are
 * placed by the plates' own geometry, restated rather than imported, so
 * the cook is held to an independent reading of where every copy goes:
 *
 * - the faces: the tower is the same on its four faces [sourced text:
 *   « les mêmes dimensions en plan »; the plates draw one face], face f
 *   the +z face turned f quarter turns about +y, so (a, y, r) lands on
 *   (a, y, r), (r, y, -a), (-a, y, -r) and (-r, y, a);
 * - the stations: a move along the face, `count` of them `pitch` apart
 *   from `first`, less any the lot's own filter drops (a field, read here
 *   by the library's evaluator on the same stations the graph builds);
 * - the skirt: a station set on the 1st-floor skirt's plate, which leans
 *   in 0.60 over its drop from under the gallery slab, 0.60 thick
 *   [estimated], to its foot at altitude 83.90 [sourced PL-XIX], on the
 *   column axis, half PL-I's 70.695 [sourced].
 *
 * The order is the cook's: a lot's copies face by face (in the quadrant
 * targets' order), station by station, each the whole drawing in order.
 */
import { type Field, constant, createPointCloud, evaluateField } from "pcg-ts";
import type { Along, Lot, Place } from "../../demos/eiffel/platforms.js";

export type V = readonly [number, number, number];

/** A world solid: a closed outline extruded `depth` along its right-hand normal. */
export interface Solid {
  readonly outline: readonly V[];
  readonly depth: number;
}

/** Face f of the +z face's frame (a, y, r), turned f quarter turns about +y. */
export function onFace(f: number, [a, y, r]: V): V {
  if (f === 0) return [a, y, r];
  if (f === 1) return [r, y, -a];
  if (f === 2) return [-a, y, -r];
  return [-r, y, a];
}

/** The skirt plate's frame (x along the face, v up the plate from its top edge, w out of it) on the +z face. */
function onSkirt([x, v, w]: V): V {
  const gallery = 89.9 - 33.5;
  const deck = 0.6;
  const drop = gallery - deck - (83.9 - 33.5);
  const t = Math.atan2(0.6, drop);
  return [x, gallery - deck + v * Math.cos(t) - w * Math.sin(t), 70.695 / 2 + v * Math.sin(t) + w * Math.cos(t)];
}

/** The a of every station `along` keeps, in order. */
export function stations(along: Along): number[] {
  const all = Array.from({ length: along.count }, (_, i) => along.first + i * along.pitch);
  if (along.keep === undefined) return all;
  const geo = createPointCloud(all.length);
  const P = geo.attrs.point.get("P")!.writable();
  all.forEach((a, i) => {
    P[3 * i] = a;
  });
  const keep = typeof along.keep === "number" ? constant(along.keep) : (along.keep as Field);
  const col = evaluateField(keep, { geo, domain: "point", seed: 0 });
  return all.filter((_, i) => col.data[i] !== 0);
}

/** Where a place puts a face-frame point: one function per copy, in the cook's order. */
export function copiesOf(place: Place | null): Array<(p: V) => V> {
  if (place === null) return [(p) => p];
  const faces = [...place.faces].sort((x, y) => x - y);
  const along = place.along;
  const at = along === undefined ? [undefined] : stations(along);
  const out: Array<(p: V) => V> = [];
  for (const f of faces) {
    for (const a of at) {
      out.push((p) => {
        if (a === undefined) return onFace(f, p);
        const moved: V = along?.skirt === true ? onSkirt(p) : p;
        return onFace(f, [moved[0] + a, moved[1], moved[2]]);
      });
    }
  }
  return out;
}

/** Lots of world-placeable outlines, placed: every copy of every one, in the cook's order. */
export function placedSolids(lots: ReadonlyArray<Lot<readonly Solid[]>>): Solid[] {
  return lots.flatMap((lot) =>
    copiesOf(lot.place).flatMap((to) => lot.drawn.map((s) => ({ outline: s.outline.map(to), depth: s.depth }))),
  );
}

/** Lots whose drawings are pieces (`glazing`), their prisms placed. */
export function placedPrisms(lots: ReadonlyArray<Lot<{ readonly prisms: readonly Solid[] }>>): Solid[] {
  return placedSolids(lots.map((l) => ({ place: l.place, drawn: l.drawn.prisms })));
}

/** `fitOutSolids()` placed: every named piece as world solids. */
export function worldSolids(byName: Readonly<Record<string, ReadonlyArray<Lot<readonly Solid[]>>>>): Record<string, Solid[]> {
  return Object.fromEntries(Object.entries(byName).map(([k, lots]) => [k, placedSolids(lots)]));
}
