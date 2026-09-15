// Reading cooked items, through the structure the 0.17.0 baseline exposes.
//
// A check receives `ctx.outputs[name]` (the first item of the declared
// kind) and `ctx.collections[name]` (the whole collection). Every helper
// here accepts either an item or a collection, so a check does not care
// whether a graph returned one instances item or three.

function asItems(itemOrCollection) {
  if (itemOrCollection === undefined || itemOrCollection === null) return [];
  if (Array.isArray(itemOrCollection)) return itemOrCollection;
  if (typeof itemOrCollection === "object" && "kind" in itemOrCollection) return [itemOrCollection];
  return [...itemOrCollection];
}

/**
 * Every CPU instance across the item(s), flattened in batch order.
 * `transforms` is 16 floats per instance, column-major, translation at
 * 12..14 — the layout `InstanceBatch.transforms` documents.
 */
export function instancesOf(itemOrCollection) {
  const batches = [];
  for (const item of asItems(itemOrCollection)) {
    if (item.kind !== "instances") continue;
    if (item.residency === "device") throw new Error("device-resident instances cannot be read on the CPU");
    for (const b of item.batches) batches.push(b);
  }
  let count = 0;
  for (const b of batches) count += b.count;
  const transforms = new Float64Array(count * 16);
  const assetIds = new Array(count);
  let k = 0;
  for (const b of batches) {
    for (let i = 0; i < b.count; i++, k++) {
      for (let j = 0; j < 16; j++) transforms[k * 16 + j] = b.transforms[i * 16 + j];
      assetIds[k] = b.assetId;
    }
  }
  const positions = new Float64Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = transforms[i * 16 + 12];
    positions[i * 3 + 1] = transforms[i * 16 + 13];
    positions[i * 3 + 2] = transforms[i * 16 + 14];
  }
  return { count, transforms, positions, assetIds, batches };
}

/**
 * Decompose instance `i` of a flattened transform array: its position,
 * the three local axes in world space (unit), and the scale along each
 * (the column lengths, so a reflection reads as a positive scale).
 */
export function instanceFrame(transforms, i) {
  const o = i * 16;
  const col = (c) => [transforms[o + c * 4], transforms[o + c * 4 + 1], transforms[o + c * 4 + 2]];
  const len = (v) => Math.hypot(v[0], v[1], v[2]);
  const unit = (v) => {
    const l = len(v);
    return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
  };
  const x = col(0);
  const y = col(1);
  const z = col(2);
  return {
    position: [transforms[o + 12], transforms[o + 13], transforms[o + 14]],
    axisX: unit(x),
    axisY: unit(y),
    axisZ: unit(z),
    scale: [len(x), len(y), len(z)],
  };
}

/** The geometries across the item(s). */
export function geometriesOf(itemOrCollection) {
  return asItems(itemOrCollection)
    .filter((it) => it.kind === "geometry")
    .map((it) => it.geo);
}

/** Point positions of one geometry as a flat Float64Array xyz. */
export function pointPositions(geo) {
  const P = geo.attrs.point.get("P");
  const n = geo.pointCount;
  const out = new Float64Array(n * 3);
  if (P === undefined) return out;
  for (let i = 0; i < n * 3; i++) out[i] = P.data[i];
  return out;
}

/** All point positions across the item(s), concatenated. */
export function pointsOf(itemOrCollection) {
  const parts = geometriesOf(itemOrCollection).map(pointPositions);
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Float64Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** The `primtype` of primitive `p`, or undefined when the geometry stamps none. */
export function primType(geo, p) {
  const a = geo.attrs.primitive.get("primtype");
  if (a === undefined || a.type !== "string") return undefined;
  return a.getString(p);
}

/**
 * Every polyline primitive across the item(s) as a flat Float64Array of
 * vertex positions in vertex order. A closed polyline keeps its trailing
 * vertex (the library's structural closure), so its last segment is there.
 * Also returns the point index of each vertex, for topology checks.
 */
export function polylinesOf(itemOrCollection) {
  const lines = [];
  for (const geo of geometriesOf(itemOrCollection)) {
    const P = geo.attrs.point.get("P");
    for (let p = 0; p < geo.primitiveCount; p++) {
      if (primType(geo, p) !== "polyline") continue;
      const start = geo.primVertexStart[p];
      const nv = geo.primVertexCount[p];
      const xyz = new Float64Array(nv * 3);
      const pointIndex = new Uint32Array(nv);
      for (let v = 0; v < nv; v++) {
        const pt = geo.vertexToPoint[start + v];
        pointIndex[v] = pt;
        xyz[v * 3] = P.data[pt * 3];
        xyz[v * 3 + 1] = P.data[pt * 3 + 1];
        xyz[v * 3 + 2] = P.data[pt * 3 + 2];
      }
      lines.push({ xyz, pointIndex, vertexCount: nv });
    }
  }
  return lines;
}

/**
 * Every triangle across the item(s) as a flat Float64Array, 9 floats per
 * triangle. Polygons with more than three vertices are fan-triangulated
 * from their first vertex; polylines are skipped.
 */
export function trianglesOf(itemOrCollection) {
  const out = [];
  for (const geo of geometriesOf(itemOrCollection)) {
    const P = geo.attrs.point.get("P");
    for (let p = 0; p < geo.primitiveCount; p++) {
      const t = primType(geo, p);
      if (t === "polyline") continue;
      const start = geo.primVertexStart[p];
      const nv = geo.primVertexCount[p];
      if (nv < 3) continue;
      const at = (v) => geo.vertexToPoint[start + v];
      for (let v = 1; v + 1 < nv; v++) {
        for (const pt of [at(0), at(v), at(v + 1)]) {
          out.push(P.data[pt * 3], P.data[pt * 3 + 1], P.data[pt * 3 + 2]);
        }
      }
    }
  }
  return Float64Array.from(out);
}

/** A numeric point attribute of one geometry as a plain array of tuples (or scalars). */
export function pointAttribute(geo, name) {
  const a = geo.attrs.point.get(name);
  if (a === undefined) return undefined;
  const n = geo.pointCount;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (a.type === "string") out[i] = a.getString(i);
    else if (a.tupleSize === 1) out[i] = a.data[i];
    else out[i] = Array.from(a.data.subarray(i * a.tupleSize, (i + 1) * a.tupleSize));
  }
  return out;
}
