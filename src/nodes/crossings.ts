/**
 * Where do the SEGMENTS of a geometry cross each other?
 *
 * A braced panel's two diagonals meet in the middle, and that meeting is
 * where the rivet, the gusset or the node sits. The geometry already says
 * where it is — two bars, each a 2-vertex primitive — but nothing in the
 * library could ASK, so every graph that needed it computed the crossing
 * in TypeScript from its own knowledge of how the bars were laid out,
 * which is knowledge a graph built any other way does not have.
 *
 * WHAT A CROSSING IS, stated once because every clause is a decision: two
 * distinct 2-vertex primitives whose CLOSEST APPROACH is within
 * `tolerance` world units, at a place INTERIOR to both. The closest
 * approach rather than an exact intersection because nothing built in f32
 * is exactly coplanar, and a 3D lattice whose bars pass a hair apart is
 * the ordinary case, not the exception; "interior" because a joint where
 * one bar ends on another is a different thing from a crossing and is
 * opt-in (`endpoints`). Parallel pairs have no single closest point and
 * are never reported.
 *
 * WHY A SPATIAL HASH OF SEGMENT BOXES rather than `src/spatial`'s point
 * grid: the grid indexes POINTS, and a segment is not near a point of the
 * cloud when it is near the middle of another segment. Each segment is
 * binned into every cell its tolerance-grown bounding box touches, and a
 * pair is tested only in ONE cell — the one holding the low corner of the
 * two boxes' overlap — so it is tested once however many cells it shares.
 * The cell size adapts to the segments (their mean box extent, doubled
 * until the binning stays within a few entries per segment), so one very
 * long bar cannot make every other bar pay for its extent.
 */
import { type Geometry, createPointCloud } from "../data/index.js";
import { STANDARD_POINT_ATTRS } from "../data/points.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import { standardNode } from "./registry.js";
import { CANCEL_STRIDE, positionView, requireGeometry } from "./util.js";
import type {
  SegmentCrossingsInputs,
  SegmentCrossingsOutputs,
  SegmentCrossingsParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { SegmentCrossingsParams } from "./params.generated.js";

/** The two readings of a meeting at a segment's end. */
const ENDPOINT_RULES = ["exclude", "include"] as const;

/**
 * Two directions closer than this SINE of an angle are parallel, and a
 * parallel pair is never reported: it has no single closest point (an
 * overlapping collinear pair has a whole interval of them) and no plane
 * for a normal. 1e-6 rad is far below any angle a built lattice holds.
 */
const PARALLEL_SINE = 1e-6;

/** Ceiling on emitted crossings — a tolerance larger than the lattice makes every pair one. */
const MAX_CROSSINGS = 1_048_576;

/**
 * Entries the binning may make per segment before the cell size doubles.
 * A segment inside one cell makes 1; one straddling a corner makes 8.
 */
const ENTRIES_PER_SEGMENT = 8;

/** A name for each output param, quoted back in a refusal as the fix (the first three are the defaults). */
const SEGMENT_CROSSINGS_DEFAULT_NAMES: Readonly<Record<string, string>> = {
  primAAttr: "primA",
  primBAttr: "primB",
  bisectorAttr: "bisector",
  normalAttr: "crossNormal",
  distanceAttr: "crossGap",
};

/** The segment table, SoA: endpoint point indices and f64 endpoints. */
interface Segments {
  readonly count: number;
  readonly prim: Uint32Array;
  readonly pa: Uint32Array;
  readonly pb: Uint32Array;
  /** xyz of A then xyz of B, 6 per segment. */
  readonly ends: Float64Array;
  /** Tolerance-grown bounding box: min xyz then max xyz, 6 per segment. */
  readonly box: Float64Array;
}

function segmentTable(geo: Geometry, tol: number): Segments {
  const pos = positionView(geo, "segmentCrossings", "in");
  const pd = pos.data;
  const ps = pos.stride;
  const v2p = geo.vertexToPoint;
  const starts = geo.primVertexStart;
  const counts = geo.primVertexCount;
  const keep: number[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    if (counts[p] !== 2) continue;
    const a = v2p[starts[p]];
    const b = v2p[starts[p] + 1];
    if (a === b) continue;
    const ax = pd[a * ps];
    const ay = pd[a * ps + 1];
    const az = pd[a * ps + 2];
    const bx = pd[b * ps];
    const by = pd[b * ps + 1];
    const bz = pd[b * ps + 2];
    // A zero-length segment is a point: it has no direction to cross with.
    if (ax === bx && ay === by && az === bz) continue;
    keep.push(p);
  }
  const n = keep.length;
  const prim = Uint32Array.from(keep);
  const pa = new Uint32Array(n);
  const pb = new Uint32Array(n);
  const ends = new Float64Array(n * 6);
  const box = new Float64Array(n * 6);
  for (let i = 0; i < n; i++) {
    const p = prim[i];
    const a = v2p[starts[p]];
    const b = v2p[starts[p] + 1];
    pa[i] = a;
    pb[i] = b;
    for (let q = 0; q < 3; q++) {
      const va = pd[a * ps + q];
      const vb = pd[b * ps + q];
      ends[i * 6 + q] = va;
      ends[i * 6 + 3 + q] = vb;
      box[i * 6 + q] = Math.min(va, vb) - tol;
      box[i * 6 + 3 + q] = Math.max(va, vb) + tol;
    }
  }
  return { count: n, prim, pa, pb, ends, box };
}

/**
 * Visit every candidate pair exactly once, from a spatial hash of the
 * segments' grown boxes: `visit(i, j)` with i < j, in no particular order —
 * the caller sorts what survives. Visiting rather than collecting, so a
 * caller that refuses an explosion of crossings refuses it before the
 * candidate list could exhaust memory.
 *
 * CELLS ARE KEYED BY THEIR INDEX TRIPLE, sorted, never packed into one
 * dense integer: a dense key needs a bounded grid, and bounding it means a
 * floor on the cell size relative to the whole extent — which one outlier
 * far away from a dense cluster turns into a single cell holding the whole
 * cluster, and a quadratic cook. Indices here are exact f64 integers at any
 * extent a graph builds, so the cell size is free to follow the segments.
 */
function visitCandidatePairs(
  seg: Segments,
  checkCancelled: () => void,
  visit: (i: number, j: number) => void,
): void {
  const n = seg.count;
  const box = seg.box;
  if (n < 2) return;
  let lo0 = Infinity;
  let lo1 = Infinity;
  let lo2 = Infinity;
  let hi0 = -Infinity;
  let hi1 = -Infinity;
  let hi2 = -Infinity;
  let extentSum = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    lo0 = Math.min(lo0, box[o]);
    lo1 = Math.min(lo1, box[o + 1]);
    lo2 = Math.min(lo2, box[o + 2]);
    hi0 = Math.max(hi0, box[o + 3]);
    hi1 = Math.max(hi1, box[o + 4]);
    hi2 = Math.max(hi2, box[o + 5]);
    extentSum += Math.max(box[o + 3] - box[o], box[o + 4] - box[o + 1], box[o + 5] - box[o + 2]);
  }
  const span = Math.max(hi0 - lo0, hi1 - lo1, hi2 - lo2);
  // Every segment has a positive extent (zero-length ones were dropped), so
  // the mean is positive; the doubling below stops at the whole extent.
  let h = extentSum / n;
  const cellsOf = (lo: number, hi: number, origin: number, size: number): number =>
    Math.floor((hi - origin) / size) - Math.floor((lo - origin) / size) + 1;
  const budget = Math.max(ENTRIES_PER_SEGMENT * n, 4096);
  for (;;) {
    let entries = 0;
    for (let i = 0; i < n && entries <= budget; i++) {
      const o = i * 6;
      entries +=
        cellsOf(box[o], box[o + 3], lo0, h) *
        cellsOf(box[o + 1], box[o + 4], lo1, h) *
        cellsOf(box[o + 2], box[o + 5], lo2, h);
    }
    if (entries <= budget || h >= span) break;
    h *= 2;
  }

  const kx: number[] = [];
  const ky: number[] = [];
  const kz: number[] = [];
  const segList: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    const x0 = Math.floor((box[o] - lo0) / h);
    const x1 = Math.floor((box[o + 3] - lo0) / h);
    const y0 = Math.floor((box[o + 1] - lo1) / h);
    const y1 = Math.floor((box[o + 4] - lo1) / h);
    const z0 = Math.floor((box[o + 2] - lo2) / h);
    const z1 = Math.floor((box[o + 5] - lo2) / h);
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          kx.push(x);
          ky.push(y);
          kz.push(z);
          segList.push(i);
        }
      }
    }
  }
  const m = segList.length;
  const ex = Float64Array.from(kx);
  const ey = Float64Array.from(ky);
  const ez = Float64Array.from(kz);
  const segs = Uint32Array.from(segList);
  const order = new Uint32Array(m);
  for (let e = 0; e < m; e++) order[e] = e;
  order.sort((a, b) => ex[a] - ex[b] || ey[a] - ey[b] || ez[a] - ez[b] || segs[a] - segs[b]);

  let tested = 0;
  for (let g = 0; g < m; ) {
    const first = order[g];
    const cx = ex[first];
    const cy = ey[first];
    const cz = ez[first];
    let end = g + 1;
    while (end < m) {
      const e = order[end];
      if (ex[e] !== cx || ey[e] !== cy || ez[e] !== cz) break;
      end++;
    }
    for (let u = g; u < end; u++) {
      const i = segs[order[u]];
      const oi = i * 6;
      for (let v = u + 1; v < end; v++) {
        if ((++tested & (CANCEL_STRIDE * 16 - 1)) === 0) checkCancelled();
        const j = segs[order[v]];
        const oj = j * 6;
        // The grown boxes must overlap...
        if (box[oi] > box[oj + 3] || box[oj] > box[oi + 3]) continue;
        if (box[oi + 1] > box[oj + 4] || box[oj + 1] > box[oi + 4]) continue;
        if (box[oi + 2] > box[oj + 5] || box[oj + 2] > box[oi + 5]) continue;
        // ...and this must be the ONE cell that owns the pair: the one
        // holding the low corner of the overlap, computed with the same
        // floor as the binning so both agree which cell that is.
        const ox = Math.floor((Math.max(box[oi], box[oj]) - lo0) / h);
        const oy = Math.floor((Math.max(box[oi + 1], box[oj + 1]) - lo1) / h);
        const oz = Math.floor((Math.max(box[oi + 2], box[oj + 2]) - lo2) / h);
        if (ox !== cx || oy !== cy || oz !== cz) continue;
        visit(i, j);
      }
    }
    g = end;
  }
}

/** One point per interior crossing among a geometry's 2-vertex primitives. */
export const segmentCrossings = standardNode<
  SegmentCrossingsParams,
  SegmentCrossingsInputs,
  SegmentCrossingsOutputs
>({
  type: "segmentCrossings",
  category: "sampler",
  description:
    "Emits ONE POINT PER CROSSING among the input's SEGMENTS — its 2-vertex primitives (whatever their primtype: connectPoints' edges, connectByIndex's bars, pathClip or pathResample output made of two-point pieces) — carrying the two primitive ids and the crossing's directions, as a plain point cloud (no topology). This is 'where do these bars cross', which the geometry states and nothing else in the library could ask: the middle of a braced panel's X, the knot where two lattice webs meet, the rivet or gusset that belongs there. WHAT COUNTS AS A CROSSING: two distinct segments whose CLOSEST APPROACH is within `tolerance` world units, at a place INTERIOR to both. Closest approach rather than exact intersection, so one rule covers both cases people mean: COPLANAR segments that cross (distance 0, give or take f32 rounding — the default tolerance absorbs it) and 3D segments that pass within a tolerance of each other (a lattice whose bars were built a hair apart, or two bars deliberately offset by their thickness — set `tolerance` to the offset). The point is placed at the MIDPOINT of the two closest points, so for a true intersection it is the intersection. INTERIOR means the closest point on EACH segment is farther than `tolerance` from both of that segment's ends; a meeting within `tolerance` of an end is an ENDPOINT TOUCH — an L corner, a T junction, a bar ending on another — and two segments that SHARE a point are always touching there, whatever the arithmetic says. Touches are EXCLUDED by default and included with `endpoints` 'include' (at a shared point the crossing is placed exactly on it). NEVER REPORTED: PARALLEL pairs (directions within 1e-6 rad) — an overlapping collinear pair has a whole interval of closest points and no plane, so there is no one place to put a point, under either `endpoints` setting — a segment with itself, and zero-length segments. Primitives with other vertex counts are ignored rather than refused, so a mesh and its edges can share a geometry; a geometry with no segment at all cooks to an empty cloud — zero crossings is an answer, not an error. EACH PAIR IS REPORTED AT MOST ONCE, and the OUTPUT ORDER is fixed: by the lower primitive id, then the higher (primAAttr < primBAttr always), so the cloud is the same whatever order the segments were hashed in. THE POINT CARRIES: P; the two primitive ids (i32, `primAAttr` and `primBAttr`); the unit BISECTOR of the two directions (`bisectorAttr`, f32 x3) — with B's direction flipped if needed so the two make an ACUTE angle, so it bisects the acute pair of angles and points along A's own direction (vertex 0 to vertex 1); and, opt-in, the unit NORMAL of the crossing's plane (`normalAttr`: cross(A, B) with B flipped as for the bisector) and the closest-approach DISTANCE (`distanceAttr`). Every name it writes must be its own: one of the standard columns the cloud already carries (P, rot, scale, density, boundsMin, boundsMax, color, seed) is refused, as is one name for two reports. Its `seed` is hashed from this node's seed and the two primitive ids, so a crossing keeps its identity if other crossings come and go. Primitive ids are ORDINALS in the input's primitive storage, with transferByIndex's caveat: a node that drops or reorders primitives upstream renumbers them. SCALE: segments are binned by their tolerance-grown bounding boxes into an adaptive spatial hash, and a pair is tested in exactly one cell, so tens of thousands of segments cook in time proportional to the pairs that are actually near each other. More than 1,048,576 crossings is refused, naming `tolerance` — a tolerance as large as the lattice makes every pair a crossing.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    tolerance: {
      type: "f32",
      default: 0.001,
      min: 0,
      description:
        "World units. Two segments cross when their closest approach is at most this — and a meeting counts as an ENDPOINT TOUCH (see `endpoints`) when it is within this of either segment's end. The default 0.001 absorbs the f32 rounding of coplanar geometry at the scale of a building (an f32 at 300 is good to about 3e-5); raise it to find bars that pass NEAR each other in 3D — a lattice built with its webs offset by their thickness crosses at that offset. 0 asks for exact intersections, which f32 geometry off the axis planes rarely has. Must be finite and >= 0.",
    },
    endpoints: {
      type: "enum",
      default: "exclude",
      enum: [...ENDPOINT_RULES],
      description:
        "What a meeting AT A SEGMENT'S END is. 'exclude' (the default) reports interior crossings only — an X, not an L or a T — which is what 'where do the bars cross' means on a lattice, where every bar also touches its neighbours at the joints. 'include' reports touches too: two segments sharing a point meet ON that point, and one whose end lies within `tolerance` of another is reported at the midpoint of the two closest points. A touch is the closest point on EITHER segment lying within `tolerance` of one of its ends, so with `tolerance` 0 only an exact end or a shared point is a touch. Parallel pairs are excluded under both settings.",
    },
    primAAttr: {
      type: "string",
      default: "primA",
      description:
        "Name of the i32 POINT attribute receiving the LOWER of the two crossing primitives' ids — its ordinal in the input's primitive storage. Always less than the `primBAttr` value on the same point. Required: the pair is what a crossing IS. May not equal any other name this node writes.",
    },
    primBAttr: {
      type: "string",
      default: "primB",
      description:
        "Name of the i32 POINT attribute receiving the HIGHER of the two crossing primitives' ids. Required, and distinct from every other name this node writes.",
    },
    bisectorAttr: {
      type: "string",
      default: "bisector",
      description:
        "Name of the f32 x3 POINT attribute receiving the unit BISECTOR of the two segments' directions. Each direction runs from its primitive's vertex 0 to vertex 1; B's is flipped when the two make an obtuse angle, so the bisector halves the ACUTE angle between the bars and has a positive component along A. At a right angle, where either choice is acute, B keeps its own direction. It is the axis a part set into an X lies along. Empty = don't write.",
    },
    normalAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of an f32 x3 POINT attribute receiving the unit NORMAL of the crossing — the cross product of A's direction and B's (flipped as for the bisector), so bisector, normal and their cross product make an orthonormal frame at the crossing, which is how a rivet's axis or a gusset plate is oriented. Empty (the default) = don't write.",
    },
    distanceAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of an f32 POINT attribute receiving the closest-approach DISTANCE between the two segments, in world units — 0 for an exact intersection, up to `tolerance` otherwise. The number to read when tuning `tolerance` against a lattice. Empty (the default) = don't write.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    const tol = params.tolerance;
    if (!Number.isFinite(tol) || tol < 0) {
      throw new Error(
        `segmentCrossings: param "tolerance" is ${tol}; it is a distance in world units and must be finite and >= 0 — the default 0.001 absorbs f32 rounding at building scale.`,
      );
    }
    // Decided ONCE, never per pair — see the note in `src/noise/worley.ts`.
    const rule = params.endpoints;
    if (rule !== "exclude" && rule !== "include") {
      throw new Error(
        `segmentCrossings: unknown endpoints "${rule}"; valid settings: ${ENDPOINT_RULES.join(", ")} — exclude reports interior crossings only, include also reports segments meeting at an end`,
      );
    }
    const includeTouches = rule === "include";
    const names: [string, string][] = [
      ["primAAttr", params.primAAttr],
      ["primBAttr", params.primBAttr],
      ["bisectorAttr", params.bisectorAttr],
      ["normalAttr", params.normalAttr],
      ["distanceAttr", params.distanceAttr],
    ];
    for (const [param, name] of names.slice(0, 2)) {
      if (name === "") {
        throw new Error(
          `segmentCrossings: param "${param}" is empty; the two primitive ids are what a crossing IS, so both are always written — give it a name (the default is "${SEGMENT_CROSSINGS_DEFAULT_NAMES[param]}").`,
        );
      }
    }
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (names[i][1] !== "" && names[i][1] === names[j][1]) {
          throw new Error(
            `segmentCrossings: params "${names[i][0]}" and "${names[j][0]}" both name "${names[i][1]}"; each is a different column (${names[i][0]} and ${names[j][0]}) and one name cannot hold both. Give one of them another name.`,
          );
        }
      }
    }

    // The cloud is this node's own, so the only columns a name can collide
    // with are the standard ones createPointCloud lays down — P, seed, scale
    // and the rest — which this node or the instancer downstream reads. A
    // same-shape "reset" there is not a harmless reuse, it is `bisectorAttr:
    // "scale"` resizing every instance, so every collision is refused, and
    // refused here, before a single pair is tested.
    for (const [param, name] of names) {
      const std = STANDARD_POINT_ATTRS.find((a) => a.name === name);
      if (name === "" || std === undefined) continue;
      throw new Error(
        `segmentCrossings: param "${param}" is "${name}", one of the standard point columns every cloud this node emits already carries (${STANDARD_POINT_ATTRS.map((a) => a.name).join(", ")}) — writing the crossing's ${param} there would overwrite what "${name}" means to every node downstream. Give it a name of its own, e.g. "${SEGMENT_CROSSINGS_DEFAULT_NAMES[param]}".`,
      );
    }

    const geo = requireGeometry(inputs, "in", "segmentCrossings");
    const seg = segmentTable(geo, tol);
    const ends = seg.ends;
    const par2 = PARALLEL_SINE * PARALLEL_SINE;

    // Per accepted crossing: the pair, the point, the frame, the gap.
    const hitI: number[] = [];
    const hitJ: number[] = [];
    const hitVal: number[] = []; // px py pz  bx by bz  nx ny nz  dist — 10 per hit
    visitCandidatePairs(seg, checkCancelled, (i, j) => {
      const oi = i * 6;
      const oj = j * 6;
      const p1x = ends[oi];
      const p1y = ends[oi + 1];
      const p1z = ends[oi + 2];
      const d1x = ends[oi + 3] - p1x;
      const d1y = ends[oi + 4] - p1y;
      const d1z = ends[oi + 5] - p1z;
      const p2x = ends[oj];
      const p2y = ends[oj + 1];
      const p2z = ends[oj + 2];
      const d2x = ends[oj + 3] - p2x;
      const d2y = ends[oj + 4] - p2y;
      const d2z = ends[oj + 5] - p2z;
      const a = d1x * d1x + d1y * d1y + d1z * d1z;
      const e = d2x * d2x + d2y * d2y + d2z * d2z;
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denom = a * e - b * b;
      // |d1 x d2|^2 = a e - b^2 = a e sin^2: parallel within the sine.
      if (denom <= par2 * a * e) return;
      const shared =
        seg.pa[i] === seg.pa[j] || seg.pa[i] === seg.pb[j] || seg.pb[i] === seg.pa[j] || seg.pb[i] === seg.pb[j];
      if (shared && !includeTouches) return;
      const rx = p1x - p2x;
      const ry = p1y - p2y;
      const rz = p1z - p2z;
      const c = d1x * rx + d1y * ry + d1z * rz;
      const f = d2x * rx + d2y * ry + d2z * rz;
      // Closest points of two segments, clamped to both (the standard
      // construction): s on A, t on B, each in [0, 1].
      let s = Math.min(1, Math.max(0, (b * f - c * e) / denom));
      let t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
      let c1x = p1x + d1x * s;
      let c1y = p1y + d1y * s;
      let c1z = p1z + d1z * s;
      let c2x = p2x + d2x * t;
      let c2y = p2y + d2y * t;
      let c2z = p2z + d2z * t;
      const gx = c1x - c2x;
      const gy = c1y - c2y;
      const gz = c1z - c2z;
      let dist = Math.sqrt(gx * gx + gy * gy + gz * gz);
      if (shared) {
        // Connected segments meet ON their shared point, and nowhere else
        // unless they are collinear, which the parallel test removed.
        const sp = seg.pa[i] === seg.pa[j] || seg.pa[i] === seg.pb[j] ? 0 : 3;
        c1x = c2x = ends[oi + sp];
        c1y = c2y = ends[oi + sp + 1];
        c1z = c2z = ends[oi + sp + 2];
        dist = 0;
      } else {
        if (!(dist <= tol)) return;
        const la = Math.sqrt(a);
        const lb = Math.sqrt(e);
        const touch = s * la <= tol || (1 - s) * la <= tol || t * lb <= tol || (1 - t) * lb <= tol;
        if (touch && !includeTouches) return;
      }
      const ia = 1 / Math.sqrt(a);
      const ib = (b < 0 ? -1 : 1) / Math.sqrt(e);
      const ax = d1x * ia;
      const ay = d1y * ia;
      const az = d1z * ia;
      const bx = d2x * ib;
      const by = d2y * ib;
      const bz = d2z * ib;
      let hx = ax + bx;
      let hy = ay + by;
      let hz = az + bz;
      const hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
      hx /= hl;
      hy /= hl;
      hz /= hl;
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      hitI.push(i);
      hitJ.push(j);
      hitVal.push(
        0.5 * (c1x + c2x),
        0.5 * (c1y + c2y),
        0.5 * (c1z + c2z),
        hx,
        hy,
        hz,
        nx,
        ny,
        nz,
        dist,
      );
      if (hitI.length > MAX_CROSSINGS) {
        throw new Error(
          `segmentCrossings: more than ${MAX_CROSSINGS} crossings among ${seg.count} segments at tolerance ${tol}; that is nearly every pair crossing, which is what a tolerance on the scale of the lattice itself produces. Lower "tolerance" to the gap you actually expect between crossing bars (the default 0.001 is for coplanar geometry).`,
        );
      }
    });

    // THE ORDER IS THE PAIR'S, NEVER THE HASH'S: segment indices follow
    // primitive order, so sorting by (i, j) is sorting by (primA, primB).
    const k = hitI.length;
    const order = new Uint32Array(k);
    for (let h = 0; h < k; h++) order[h] = h;
    order.sort((x, y) => hitI[x] - hitI[y] || hitJ[x] - hitJ[y]);

    const out = createPointCloud(k);
    const pts = out.attrs.point;
    const P = pts.require("P").writable();
    const seeds = pts.require("seed").writable();
    const primA = pts.replace(params.primAAttr, "i32", 1, 0).writable();
    const primB = pts.replace(params.primBAttr, "i32", 1, 0).writable();
    const bis = params.bisectorAttr !== "" ? pts.replace(params.bisectorAttr, "f32", 3, [0, 0, 0]).writable() : null;
    const nrm = params.normalAttr !== "" ? pts.replace(params.normalAttr, "f32", 3, [0, 0, 0]).writable() : null;
    const gap = params.distanceAttr !== "" ? pts.replace(params.distanceAttr, "f32", 1, 0).writable() : null;
    for (let w = 0; w < k; w++) {
      const h = order[w];
      const v = h * 10;
      const pA = seg.prim[hitI[h]];
      const pB = seg.prim[hitJ[h]];
      P[w * 3] = hitVal[v];
      P[w * 3 + 1] = hitVal[v + 1];
      P[w * 3 + 2] = hitVal[v + 2];
      primA[w] = pA;
      primB[w] = pB;
      seeds[w] = hashCombine(seed, pA, pB);
      if (bis !== null) {
        bis[w * 3] = hitVal[v + 3];
        bis[w * 3 + 1] = hitVal[v + 4];
        bis[w * 3 + 2] = hitVal[v + 5];
      }
      if (nrm !== null) {
        nrm[w * 3] = hitVal[v + 6];
        nrm[w * 3 + 1] = hitVal[v + 7];
        nrm[w * 3 + 2] = hitVal[v + 8];
      }
      if (gap !== null) gap[w] = hitVal[v + 9];
    }
    return { out: [makeGeometryItem(out)] };
  },
});
