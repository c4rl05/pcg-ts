/**
 * Surface nodes: the producers that turn a curve into a skin, a footprint
 * into a solid and two curves into the band between them (`bridgePaths`),
 * and `smoothNormals`, which decides how such a skin SHADES — round across
 * a faceted curve, sharp across an edge — without changing what it is.
 * Caps that are not convex are ear-clipped by `./earClip.ts`.
 *
 * Before these, the library could represent, sample, transfer through,
 * filter, serialize and render a triangle mesh, and had exactly one node
 * that MADE one — `meshPrimitive`, which builds planes and boxes from
 * params alone. Everything a graph drew out of curves stopped at
 * `pathSegments`, which fakes a tube as a run of instanced cylinders.
 *
 * The producers here emit 3-VERTEX `poly` primitives, never n-gons. That is
 * not a stylistic choice: `surfaceSample` skips any primitive whose
 * vertex count is not 3, and the `uv` and `raycast` transfer mappings
 * collect only 3-vertex `poly` primitives. A quad-spelled surface would
 * draw correctly through `toBufferGeometry` (which fan-triangulates) and
 * be invisible to the library's own consumers — a plausible-looking cook,
 * which is the failure class this library refuses everywhere else.
 *
 * Neither node RESAMPLES its input. `sweepProfile` puts one ring on each
 * point it is given; an author who wants a finer surface runs
 * `pathResample` first, which is already the idiom. That removes the
 * interpolation question entirely, and with it the one fudge in
 * `pathSegments`, whose radius has to average its segment's two endpoints
 * because a segment has no element of its own. A ring IS at a point, so a
 * field-capable radius resolves there exactly.
 */
import { adoptTopology } from "../data/adoptTopology.js";
import { deriveGeometry } from "../data/derive.js";
import { type AttrDefault, Geometry, PRIMTYPE_ATTR, type PrimType } from "../data/index.js";
import { type Column, isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { requireAttributeOn } from "../data/attributeNotFound.js";
import { earClip, isConvexLoop, loopArea2, pointInLoop } from "./earClip.js";
import { standardNode } from "./registry.js";
import {
  type PolylineArcTable,
  carryPrimitiveAttributes,
  copyElements,
  ORIENT_AXIS_PZ,
  orientQuat,
  polylineArcTables,
  readComp,
  requireGeometry,
  requireReportSlot,
  requireTuple,
  resolveOn,
  resolveOnMaybeGpu,
  rotateVec,
} from "./util.js";
import type {
  BridgePathsInputs,
  BridgePathsOutputs,
  BridgePathsParams,
  ExtrudePolygonInputs,
  ExtrudePolygonOutputs,
  ExtrudePolygonParams,
  SmoothNormalsInputs,
  SmoothNormalsOutputs,
  SmoothNormalsParams,
  SweepProfileInputs,
  SweepProfileOutputs,
  SweepProfileParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type {
  BridgePathsParams,
  ExtrudePolygonParams,
  SmoothNormalsParams,
  SweepProfileParams,
} from "./params.generated.js";

/** How often the emit loops check for cancellation. */
const CANCEL_STRIDE = 1024;

/**
 * A cross-section, in the ring's own 2D basis and at unit scale.
 *
 * `pos` and `nrm` hold one (a1, a2) pair per ENTRY, `v` the texture
 * coordinate around the profile, and `bandA`/`bandB` name the entry pairs
 * that get stitched into quads. Entries and bands are separate because a
 * profile with FLAT faces needs its corners duplicated — a square tube
 * whose corner points carry an averaged normal shades like a rounded rod
 * — and duplicating a corner would otherwise emit a zero-width band
 * between the two copies. `cap` names the distinct corners in boundary
 * order, so a cap visits each position exactly once, and `capTris` is the
 * cap's triangulation over them.
 */
interface ProfileSpec {
  readonly count: number;
  readonly pos: Float64Array;
  readonly nrm: Float64Array;
  readonly v: Float64Array;
  readonly bandA: Uint32Array;
  readonly bandB: Uint32Array;
  /** Empty for an open profile, which has no inside and takes no cap. */
  readonly cap: Uint32Array;
  /**
   * The cap as triangles over `cap` INDICES (not entries), every one
   * counter-clockwise in the section's own (a1, a2) basis — the facing of
   * the END cap; the start cap reverses them. A convex section is a fan
   * from its first corner (n - 2 triangles, no centre point); a concave
   * one is ear-clipped.
   */
  readonly capTris: Uint32Array;
  /** Which field param sets this profile's scale: "radius" or "width". */
  readonly scaleParam: "radius" | "width";
  /**
   * True when the section is scaled PER AXIS — `width` along the first
   * ring axis, `height` along the second — rather than uniformly by
   * `scaleParam`. A per-axis scale has to act BEFORE the roll (a rolled
   * rectangle scaled after it would shear into a parallelogram), and it
   * moves every non-axis-aligned face normal, so the ring loop takes a
   * separate arm for it rather than folding it into the uniform one and
   * perturbing the bits the shipped profiles already produce.
   */
  readonly axes: boolean;
  /**
   * Fixed cap uv, one pair per `cap` entry. Absent means the disc mapping
   * of the rolled unit section the round and square profiles have always
   * used.
   */
  readonly capUv?: Float64Array;
}

/**
 * A fan of `n - 2` triangles from corner 0 over corners `0..n-1` — the cap
 * of a convex section. Counter-clockwise when the corners are.
 */
function cornerFan(n: number): Uint32Array {
  const tris = new Uint32Array(Math.max(0, n - 2) * 3);
  for (let j = 1; j + 1 < n; j++) {
    tris[(j - 1) * 3] = 0;
    tris[(j - 1) * 3 + 1] = j;
    tris[(j - 1) * 3 + 2] = j + 1;
  }
  return tris;
}

/**
 * A closed ring of `sides` points on the unit circle, with the seam
 * column duplicated: entry `sides` sits exactly on entry 0 but carries
 * `v = 1` rather than `v = 0`. Sharing the point instead would make a
 * texture run backwards across one column of quads; the duplicate costs
 * `(sides + 1) / sides` points and is the standard answer.
 *
 * The seam's trigonometry is taken at `i % sides` rather than at `2 * PI`,
 * so the duplicated entry is BIT-IDENTICAL to entry 0 instead of a
 * `Math.sin(2 * PI)` hair away from it.
 */
function circleProfile(sides: number): ProfileSpec {
  const count = sides + 1;
  const pos = new Float64Array(count * 2);
  const nrm = new Float64Array(count * 2);
  const v = new Float64Array(count);
  for (let i = 0; i <= sides; i++) {
    const phi = (2 * Math.PI * (i % sides)) / sides;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    pos[i * 2] = c;
    pos[i * 2 + 1] = s;
    nrm[i * 2] = c;
    nrm[i * 2 + 1] = s;
    v[i] = i / sides;
  }
  const bandA = new Uint32Array(sides);
  const bandB = new Uint32Array(sides);
  for (let i = 0; i < sides; i++) {
    bandA[i] = i;
    bandB[i] = i + 1;
  }
  const cap = new Uint32Array(sides);
  for (let i = 0; i < sides; i++) cap[i] = i;
  return {
    count,
    pos,
    nrm,
    v,
    bandA,
    bandB,
    cap,
    capTris: cornerFan(sides),
    scaleParam: "radius",
    axes: false,
  };
}

/**
 * A square of half-width 1, with every corner duplicated so the four
 * faces stay flat. Corners run counter-clockwise from (1, -1), matching
 * the circle's direction of travel, so the two profiles wind the same way
 * and produce the same facing.
 */
function squareProfile(): ProfileSpec {
  // Corner positions in order, then the outward normal of the face that
  // LEAVES each corner.
  const corners = [1, -1, 1, 1, -1, 1, -1, -1];
  const faceNrm = [1, 0, 0, 1, -1, 0, 0, -1];
  const count = 8;
  const pos = new Float64Array(count * 2);
  const nrm = new Float64Array(count * 2);
  const v = new Float64Array(count);
  for (let f = 0; f < 4; f++) {
    const a = f * 2;
    const b = ((f + 1) % 4) * 2;
    // Entry 2f starts face f at corner f; entry 2f + 1 ends it at the
    // next corner. Both carry face f's normal.
    pos[(2 * f) * 2] = corners[a];
    pos[(2 * f) * 2 + 1] = corners[a + 1];
    pos[(2 * f + 1) * 2] = corners[b];
    pos[(2 * f + 1) * 2 + 1] = corners[b + 1];
    nrm[(2 * f) * 2] = faceNrm[a];
    nrm[(2 * f) * 2 + 1] = faceNrm[a + 1];
    nrm[(2 * f + 1) * 2] = faceNrm[a];
    nrm[(2 * f + 1) * 2 + 1] = faceNrm[a + 1];
    v[2 * f] = f / 4;
    v[2 * f + 1] = (f + 1) / 4;
  }
  const bandA = Uint32Array.of(0, 2, 4, 6);
  const bandB = Uint32Array.of(1, 3, 5, 7);
  // The distinct corners, in boundary order: the first entry of each face.
  const cap = Uint32Array.of(0, 2, 4, 6);
  return {
    count,
    pos,
    nrm,
    v,
    bandA,
    bandB,
    cap,
    capTris: cornerFan(4),
    scaleParam: "radius",
    axes: false,
  };
}

/**
 * An open two-point strip of unit width, centred on the path and lying
 * along the ring's first basis axis, facing the second. A ribbon has no
 * inside, so it takes no cap and is SINGLE-SIDED: it is invisible from
 * below under a front-face material.
 *
 * The band runs 1 -> 0, against the entries' own order, and that is
 * load-bearing rather than a typo. A band's face normal is
 * `travel x ringNormal`, and the ring basis is right-handed
 * (`e1 x e2 = n`), so travel along `+e1` faces `-e2` while the strip is
 * declared to face `+e2`. Stitching the other way round is what makes
 * the winding agree with the normal this profile writes; `v` stays with
 * its entry, so the texture direction does not move.
 */
function ribbonProfile(): ProfileSpec {
  return {
    count: 2,
    pos: Float64Array.of(-0.5, 0, 0.5, 0),
    nrm: Float64Array.of(0, 1, 0, 1),
    v: Float64Array.of(0, 1),
    bandA: Uint32Array.of(1),
    bandB: Uint32Array.of(0),
    cap: new Uint32Array(0),
    capTris: new Uint32Array(0),
    scaleParam: "width",
    axes: false,
  };
}

/**
 * A closed section with FLAT faces from a list of corners `[a1, a2, ...]`
 * in the ring's own 2D basis — the square's construction generalized, so
 * every corner is duplicated and each face carries its own normal.
 *
 * Either winding is accepted: a clockwise list is reversed about its
 * first corner (which keeps that corner at `v = 0`), because the band
 * stitching and the cap triangles assume the counter-clockwise order the
 * circle and the square travel in. `v` runs by arc length around the
 * corners, and the face that LEAVES corner f carries the outward normal
 * (dy, -dx) / len of its edge.
 *
 * The cap is a fan from the first corner when the section is convex and
 * an ear-clipped triangulation otherwise (see `./earClip.ts`), so it never
 * needs a centre point. The cap uv maps the section's own bounding box
 * onto the unit square, so it is exact at a rectangle's corners and does
 * not turn with `roll`.
 */
function polygonProfile(corners: Float64Array): ProfileSpec {
  const n = corners.length / 2;
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area2 += corners[i * 2] * corners[j * 2 + 1] - corners[j * 2] * corners[i * 2 + 1];
  }
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const from = area2 < 0 ? (n - i) % n : i;
    xs[i] = corners[from * 2];
    ys[i] = corners[from * 2 + 1];
  }
  const count = 2 * n;
  const pos = new Float64Array(count * 2);
  const nrm = new Float64Array(count * 2);
  const v = new Float64Array(count);
  const len = new Float64Array(n);
  let perimeter = 0;
  for (let f = 0; f < n; f++) {
    const g = (f + 1) % n;
    len[f] = Math.hypot(xs[g] - xs[f], ys[g] - ys[f]);
    perimeter += len[f];
  }
  let cum = 0;
  for (let f = 0; f < n; f++) {
    const g = (f + 1) % n;
    const nx = (ys[g] - ys[f]) / len[f];
    const ny = -(xs[g] - xs[f]) / len[f];
    // Entry 2f starts face f at corner f; entry 2f + 1 ends it at the
    // next corner. Both carry face f's normal.
    pos[(2 * f) * 2] = xs[f];
    pos[(2 * f) * 2 + 1] = ys[f];
    pos[(2 * f + 1) * 2] = xs[g];
    pos[(2 * f + 1) * 2 + 1] = ys[g];
    nrm[(2 * f) * 2] = nx;
    nrm[(2 * f) * 2 + 1] = ny;
    nrm[(2 * f + 1) * 2] = nx;
    nrm[(2 * f + 1) * 2 + 1] = ny;
    v[2 * f] = cum / perimeter;
    cum += len[f];
    v[2 * f + 1] = cum / perimeter;
  }
  const bandA = new Uint32Array(n);
  const bandB = new Uint32Array(n);
  const cap = new Uint32Array(n);
  for (let f = 0; f < n; f++) {
    bandA[f] = 2 * f;
    bandB[f] = 2 * f + 1;
    // The distinct corners, in boundary order: the first entry of each face.
    cap[f] = 2 * f;
  }
  // The cap, over cap INDICES f (corner f), counter-clockwise because
  // the corners now are.
  const flat = new Float64Array(n * 2);
  for (let f = 0; f < n; f++) {
    flat[f * 2] = xs[f];
    flat[f * 2 + 1] = ys[f];
  }
  const capTris = isConvexLoop(flat, 0, n) ? cornerFan(n) : Uint32Array.from(earClip(flat, [0, n]));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, xs[i]);
    maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]);
    maxY = Math.max(maxY, ys[i]);
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const capUv = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    capUv[i * 2] = spanX > 0 ? (xs[i] - minX) / spanX : 0.5;
    capUv[i * 2 + 1] = spanY > 0 ? (ys[i] - minY) / spanY : 0.5;
  }
  return {
    count,
    pos,
    nrm,
    v,
    bandA,
    bandB,
    cap,
    capTris,
    scaleParam: "width",
    axes: true,
    capUv,
  };
}

/**
 * A rectangle one unit on each side — `width` and `height` scale it per
 * axis — with its corners running counter-clockwise from (+a1, -a2) like
 * the square's, so the two share their face order, `v` and facing.
 * `shift` moves it along the second axis: 0 centres it on the path, 0.5
 * stands it ON the path (its bottom face through the path point), -0.5
 * hangs it below.
 */
function rectProfile(shift: number): ProfileSpec {
  const lo = -0.5 + shift;
  const hi = 0.5 + shift;
  return polygonProfile(Float64Array.of(0.5, lo, 0.5, hi, -0.5, hi, -0.5, lo));
}

/** An example section for the refusals below: a unit block standing on the path. */
const SECTION_EXAMPLE = "[0.5, 0, 0.5, 1, -0.5, 1, -0.5, 0]";

/**
 * The corner list of a 'polygon' profile, validated. Refused rather than
 * repaired, each naming what an author has to look at: a list that is not
 * whole pairs, fewer than three corners, a corner repeated by its
 * successor (including a last corner that restates the first — the
 * section closes itself), and a section with no area.
 */
function sectionCorners(section: readonly number[]): Float64Array {
  if (!Array.isArray(section) || section.length % 2 !== 0 || section.length < 6) {
    throw new Error(
      `sweepProfile: profile "polygon" reads param "section", which must be a flat list [x0, y0, x1, y1, ...] of at least 3 corners in the ring's (across, up) frame, e.g. ${SECTION_EXAMPLE} for a unit block standing on the path; got ${Array.isArray(section) ? `${section.length} number(s)` : JSON.stringify(section)}`,
    );
  }
  for (let i = 0; i < section.length; i++) {
    if (!Number.isFinite(section[i])) {
      throw new Error(
        `sweepProfile: param "section" entry ${i} is ${String(section[i])}; every coordinate must be a finite number`,
      );
    }
  }
  const n = section.length / 2;
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (section[i * 2] === section[j * 2] && section[i * 2 + 1] === section[j * 2 + 1]) {
      throw new Error(
        `sweepProfile: param "section" repeats corner ${i} as corner ${j} ([${section[i * 2]}, ${section[i * 2 + 1]}]), and a zero-length face has no normal; remove the duplicate${j === 0 ? " — the section closes itself, so the last corner must not restate the first" : ""}`,
      );
    }
    area2 += section[i * 2] * section[j * 2 + 1] - section[j * 2] * section[i * 2 + 1];
  }
  if (!(Math.abs(area2) > 0)) {
    throw new Error(
      `sweepProfile: param "section" encloses no area (its corners are collinear); a closed section needs corners that span a region, e.g. ${SECTION_EXAMPLE}`,
    );
  }
  return Float64Array.from(section);
}

/** The shipped cross-sections; a section from a geometry pin still needs a consumer. */
const PROFILES = ["circle", "square", "ribbon", "rect", "polygon"] as const;
/** Where a 'rect' section sits across the ring's up axis. */
const ANCHORS = ["center", "bottom", "top"] as const;
/** How a ring meets the next one through a bend. */
const JOINTS = ["miter", "perpendicular"] as const;
/** Where the roll inside the ring plane comes from. */
const FRAMES = ["upHint", "curveFrame", "rot"] as const;

/**
 * Unit direction of every segment of one path, plus the nearest-nonzero
 * lookups either side of it.
 *
 * Zero-length segments are real (two path points landing on top of each
 * other survives every filter in the library) and a zero segment has no
 * direction. Rather than invent one per ring, the nearest segment that
 * DOES have a direction stands in, which keeps the ring plane defined and
 * the emitted band degenerate — a zero-area triangle, which area-weighted
 * sampling and the raycast mapping already skip — instead of producing a
 * NaN frame that poisons the whole path.
 */
interface SegmentDirs {
  readonly dir: Float64Array;
  readonly fwd: Int32Array;
  readonly bwd: Int32Array;
  /** Index of the first / last segment with a direction, or -1 for none. */
  readonly first: number;
  readonly last: number;
}

function segmentDirs(table: PolylineArcTable): SegmentDirs {
  const nSeg = table.segLen.length;
  const dir = new Float64Array(nSeg * 3);
  const fwd = new Int32Array(nSeg);
  const bwd = new Int32Array(nSeg);
  for (let k = 0; k < nSeg; k++) {
    const len = table.segLen[k];
    if (len === 0) continue;
    const inv = 1 / len;
    dir[k * 3] = table.segDir[k * 3] * inv;
    dir[k * 3 + 1] = table.segDir[k * 3 + 1] * inv;
    dir[k * 3 + 2] = table.segDir[k * 3 + 2] * inv;
  }
  let run = -1;
  for (let k = nSeg - 1; k >= 0; k--) {
    if (table.segLen[k] > 0) run = k;
    fwd[k] = run;
  }
  const first = nSeg > 0 ? fwd[0] : -1;
  run = -1;
  for (let k = 0; k < nSeg; k++) {
    if (table.segLen[k] > 0) run = k;
    bwd[k] = run;
  }
  const last = nSeg > 0 ? bwd[nSeg - 1] : -1;
  return { dir, fwd, bwd, first, last };
}

/** Per-path bookkeeping shared by the counting pass and the writing pass. */
interface SweepLayout {
  readonly table: PolylineArcTable;
  readonly dirs: SegmentDirs;
  /** Rings emitted: a closed path shares its first and last. */
  readonly rings: number;
  /** Ring-to-ring bands: `rings` when closed, `rings - 1` when open. */
  readonly bands: number;
  readonly caps: boolean;
  /** First output point of this path's ring block. */
  readonly pointBase: number;
  /** First output point of the start cap block (`-1` when uncapped). */
  readonly capStart: number;
  readonly capEnd: number;
}

/**
 * Rotate a profile entry by `roll` turns about the ring normal, in the
 * ring's own 2D basis. Written as a free function because it runs once
 * per profile entry per ring and must not allocate.
 */
function rollApply(out: number[], a1: number, a2: number, c: number, s: number): void {
  out[0] = a1 * c - a2 * s;
  out[1] = a1 * s + a2 * c;
}

/** A cross-section placed on every path point and stitched into a surface. */
export const sweepProfile = standardNode<
  SweepProfileParams,
  SweepProfileInputs,
  SweepProfileOutputs
>({
  type: "sweepProfile",
  category: "surface",
  description:
    "Places a cross-section on EVERY POINT of every polyline primitive and stitches consecutive placements into 3-vertex 'poly' triangles: a curve becomes a surface. This is what `pathSegments` could only fake — a run of overlapping instanced cylinders becomes one continuous skin, at HALF the drawn triangles of the eight-sided instanced tube it replaces, because rings are shared between segments and no interior caps grow. THE PATH IS NOT RESAMPLED: one ring per input point, exactly where the point is, so a field-capable `radius` resolves at the ring rather than being averaged across a segment's endpoints the way pathSegments must. Run `pathResample` first for a finer surface. Output carries P, a `normal` (f32 tuple 3) and a `uv` (f32 tuple 2) the node writes itself — `u` is normalized arc length along the path, matching the `curveU` that pathSegments and pathPointAt write, and `v` runs around the profile — plus every INPUT POINT attribute copied (not interpolated) around each ring, and every input PRIMITIVE attribute gathered onto the triangles that came from it, so a per-path `roadWidth` or `chordPick` survives the sweep and a primitive-domain filter downstream can still see it. Input VERTEX attributes are dropped: the topology they described is gone. `normal` and `uv` are reporting slots — an input already carrying either at a different shape is REFUSED by name rather than silently deleted. Open versus closed is structural and needs no flag: a closed path shares its first and last ring so the tube closes on itself exactly (which means `u` returns to 0 across that one closing band — a texture measured along `u` repeats backwards there, the price of a genuinely closed tube), and `caps` applies only to an OPEN path with a CLOSED profile, since a closed path has no ends and a ribbon has no hole. Roll around the path is fixed by `frame` and never by chance. Junctions are NOT solved: where several polylines share an endpoint each is swept independently and the surfaces overlap, which is what every mitered-stroke renderer does by default.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    profile: {
      type: "enum",
      default: "circle",
      enum: [...PROFILES],
      description:
        "Cross-section shape. 'circle' and 'square' are CLOSED (a tube, and a square rod whose four faces stay flat because its corners carry per-face normals) and take `radius` and `caps`; 'ribbon' is OPEN — a flat two-point strip of `width`, centred on the path, facing the frame's up axis — and takes neither, because a strip has no inside. 'rect' is the square with its two extents set apart: `width` across the path (the ring's first axis) by `height` along the frame's up axis, both field-capable, placed by `anchor` (centred on the path, standing on it, or hanging from it) — a wall, a kerb, a beam, a plank — with the same flat faces, split corners, frames, miter and caps as 'square'. 'polygon' is any closed section with flat faces: the corners in `section`, in the ring's (across, up) frame relative to the path point, scaled per axis by `width` and `height` (both 1 by default, so the corners are world units). Every corner of a 'rect' or 'polygon' is split, so all its faces shade flat; run smoothNormals after the sweep to round the shallow ones. A profile from a second geometry pin (an I-beam as a mesh) is deliberately not here yet: it forces decisions no consumer has asked for, and these enum values stay valid when it arrives.",
    },
    sides: {
      type: "i32",
      default: 8,
      min: 3,
      max: 256,
      description:
        "Points around a 'circle' profile; ignored by every other profile. Default 8 matches the shipped tube asset (a three.js CylinderGeometry with 8 radial segments), so a swept tube reads like the instanced tube it replaces. Cost is linear: the ring emits `sides + 1` points (the extra one duplicates the seam so the uv does not run backwards across one column of quads) and `sides * 2` triangles per band.",
    },
    radius: {
      type: "f32",
      default: 0.05,
      min: 0,
      acceptsField: true,
      description:
        "Distance from the path to the surface, in world units, for the 'circle' and 'square' profiles ('square' reads it as HALF-WIDTH, so the section fits a 2 x radius box); ignored by 'ribbon', 'rect' and 'polygon', which read `width` (and `height`) instead. Same default as pathSegments' `radius`. Field-capable and resolved on the INPUT points — the path's own points, which is exactly where a ring sits — so a taper is exact rather than averaged. A per-path radius living on the primitive domain has to be promoted onto the points first (promoteAttribute, primitive to point) before a field can see it.",
    },
    width: {
      type: "f32",
      default: 1,
      min: 0,
      acceptsField: true,
      description:
        "Full width across the path in world units for a 'ribbon' (the strip runs from -width/2 to +width/2) and a 'rect' (its extent along the ring's first axis); for a 'polygon' it MULTIPLIES the `section` coordinates along that axis. Ignored by 'circle' and 'square'. Field-capable on the INPUT points, so a road that widens at a junction is one promoted attribute away.",
    },
    height: {
      type: "f32",
      default: 1,
      min: 0,
      acceptsField: true,
      description:
        "Extent of a 'rect' along the frame's up axis (the ring's second axis — the axis a 'ribbon' faces), in world units; for a 'polygon' it MULTIPLIES the `section` coordinates along that axis. Ignored by the other profiles. Field-capable on the INPUT points, resolved at the ring exactly as `width` is, so a wall that rises along its run or a kerb that dips at a crossing is one attribute away. The two are independent: a non-uniform scale is applied BEFORE `roll`, so a rolled 'rect' stays a rectangle, and each face normal is carried through the scale (inverse-transpose) so a sloped 'polygon' face keeps shading the way it faces. A zero extent makes the faces along it zero-area — drawn as nothing, skipped by area-weighted sampling — and leaves their normals unscaled rather than zero.",
    },
    anchor: {
      type: "enum",
      default: "center",
      enum: [...ANCHORS],
      description:
        "Where a 'rect' sits across the frame's up axis: 'center' centres it on the path; 'bottom' STANDS it on the path — its bottom face runs through the path's points, so the section spans 0..height above them, which is a wall or a kerb built on a ground-hugging line; 'top' hangs it below, spanning -height..0, which is a beam under a deck line. Ignored by every other profile — a 'polygon' already says where the path is, because its corners are relative to the path point. Turned with the section by `roll`, about the path point.",
    },
    section: {
      type: "numberList",
      default: [],
      description:
        "Corners of a 'polygon' profile as a flat list [x0, y0, x1, y1, ...]: x across the path along the ring's first axis, y along the frame's up axis, relative to the path point, then scaled by `width` and `height`. At least three corners; either winding (a clockwise list is reversed about its first corner, which keeps `v` = 0 there); do not restate the first corner at the end — the section closes itself. With frame 'upHint' and the default up, a horizontal path's first axis points to the LEFT of the direction of travel, so (x, y, travel) is right-handed; [0.5, 0, 0.5, 1, -0.5, 1, -0.5, 0] is a unit block standing on the path. Every corner is split (flat faces, per-face normals), `v` runs 0..1 by arc length around the corners in counter-clockwise order (starting at the first corner) measured on the section as given, before `width` and `height` scale it. Caps are exact for ANY simple section: a convex one is a fan of n - 2 triangles from its first corner, a concave one (an L, a T, an I-beam) is ear-clipped, deterministically, and neither adds a point. The section must not cross itself — a self-crossing list is not refused, and its caps describe nothing. Refused by name when it is not whole pairs, has fewer than three corners, repeats a corner, or encloses no area. Ignored by every other profile. Not field-capable: the section is one shape for the whole sweep, and `width`, `height` and `roll` are what vary per ring.",
    },
    frame: {
      type: "enum",
      default: "upHint",
      enum: [...FRAMES],
      description:
        "Where the ROLL inside the ring comes from. The ring's PLANE always comes from the path, so this never changes where the surface is, only how the profile is turned within it — which is invisible for a circle and decisive for a square or a ribbon. 'upHint' uses the `up` param through the same deterministic construction (and the same [0,0,1] then [1,0,0] fallbacks) orientAlongVector and pathSegments use: purely local, correct for a tube and for a flat road ribbon, wrong for a ribbon on a curve that turns over. 'curveFrame' reads the `curveNormal` point attribute writeCurveFrame writes — a rotation-minimizing frame carried ALONG the curve, which is what a ribbon on a twisting path needs; `curveBinormal` is not read, the second axis is derived so the ring stays right-handed. 'rot' reads the standard `rot` quaternion's local +X, so anything that writes `rot` (orientAlongVector, with its field-capable direction and up) drives the roll. Both attribute modes fall back to `up` at a point whose attribute is degenerate. This node TRANSPORTS nothing along the path: the ring plane reads only the two segments meeting at its own point (a one-neighbour rule, the same reach writeTangents has) and no mode carries a value forward, so the only non-locality in a swept surface is whatever the attribute it was handed already had — 'curveFrame' inherits the non-locality writeCurveFrame documents, and nothing more.",
    },
    up: {
      type: "vec3",
      default: [0, 1, 0],
      acceptsField: true,
      description:
        "Up hint fixing the roll in 'upHint' mode, and the fallback in the other two; need not be unit length. When parallel or antiparallel to the path direction (or zero) it deterministically falls back to [0, 0, 1], then [1, 0, 0] — the same contract orientAlongVector and pathSegments state, through the same shared code, so a vertical path's roll is arbitrary but never random. Field-capable on the input points.",
    },
    roll: {
      type: "f32",
      default: 0,
      acceptsField: true,
      description:
        "Turns of the profile about the path direction, applied inside the ring plane on top of `frame` — 0.25 is a quarter turn, 1 is a full one. Field-capable on the input points, so a value that ramps along the path twists the section. Invisible on a 'circle' (it is rotationally symmetric) and the reason a 'square' or 'ribbon' can be aimed without changing the frame.",
    },
    joint: {
      type: "enum",
      default: "miter",
      enum: [...JOINTS],
      description:
        "How the section meets a bend. Both modes put the ring in the plane that BISECTS the two segments meeting at the point; they differ in whether the section is corrected for the tilt. 'miter' stretches the ring by 1/cos(half the turn angle) along the bend direction, which is exactly the ellipse a cylinder cuts on that plane, so the tube keeps its radius through the corner. 'perpendicular' leaves it, so the section thins by cos(half the turn angle) — 33% at a 96-degree bend, which is visible. Miter self-intersects only when the mitered half-width exceeds half the shorter segment; `miterLimit` is what refuses that.",
    },
    miterLimit: {
      type: "f32",
      default: 4,
      min: 1,
      acceptsField: true,
      description:
        "Largest stretch 'miter' may apply. Past it the ring falls back to the unstretched 'perpendicular' section for that point ONLY, which pinches rather than shooting a spike out of the corner. A stretch of 4 is a 151-degree turn; the limit is never reached by a path that was resampled at anything like an even spacing, and exists for the pathological input that would otherwise self-intersect. Field-capable on the INPUT points — the limit is read at the RING, from the point the ring stands on, so one deliberate spike and a capped remainder are one cook rather than two: a corner attribute lets the one junction that should keep its radius through a hairpin do so while every other corner stays bounded. As a field a value BELOW 1 is not refused at the point the way a plain number is refused at the door; it is read for what it does, which is admit no miter at all (a stretch is always > 1 when there is a bend), so that ring takes the unstretched section — the same fallback the limit already names when it is exceeded. Non-finite is refused with the offending element named, so 'never limit' is spelled as a large finite number rather than as Infinity: a stretch of 64 already admits a 178-degree turn. Ignored by 'perpendicular', where a field is not evaluated at all — exactly as `radius` is left unresolved for a 'ribbon' — while a plain number still meets its >= 1 check wherever the graph is loaded or patched.",
    },
    caps: {
      type: "bool",
      default: true,
      description:
        "Close the two ends of an OPEN path with a CLOSED profile, with triangles over the end ring's own corners and NO extra centre point: a convex section ('circle', 'square', 'rect', a convex 'polygon') is a fan of n - 2 triangles from its first corner, so a box end is 2 triangles and an 8-sided tube's end is 6, and a concave 'polygon' is ear-clipped. The start cap faces back along the path, the end cap forward. Ignored for a closed path (it has no ends) and for the 'ribbon' profile (it has no hole), so all four combinations are defined rather than merely unsurprising. Cap points are separate from the wall's, so the seam between a flat cap and a round wall stays a real crease instead of being smoothed away. Cap uv is not a continuation of the wall's: for 'circle' and 'square' it is a disc mapping — the unit section, turned by `roll`, mapped into the 0..1 square — and for 'rect' and 'polygon' it maps the section's own bounding box onto 0..1, so a rectangle's corners land exactly on the uv square's.",
    },
  },
  // `radius`, `width`, `height`, `up`, `roll` and `miterLimit` may resolve
  // on the GPU. All are evaluated on the INPUT geometry, which this node never mutates
  // (it builds a fresh mesh), so the resolver and the CPU fallback see
  // identical bytes. Not `resident`: a resident node must be
  // element-count-preserving on a single geometry input, and a sweep
  // multiplies the point count, creates a primitive domain and writes
  // three topology arrays — none of which is device-resident anywhere.
  gpu: "fields",
  async execute({ inputs, params, seed, gpu, checkCancelled }) {
    const profileName = params.profile;
    if (!(PROFILES as readonly string[]).includes(profileName)) {
      throw new Error(
        `sweepProfile: param "profile" must be one of ${PROFILES.join(", ")}; got "${profileName}"`,
      );
    }
    const frameMode = params.frame;
    if (!(FRAMES as readonly string[]).includes(frameMode)) {
      throw new Error(
        `sweepProfile: param "frame" must be one of ${FRAMES.join(", ")}; got "${frameMode}"`,
      );
    }
    const anchorMode = params.anchor;
    if (!(ANCHORS as readonly string[]).includes(anchorMode)) {
      throw new Error(
        `sweepProfile: param "anchor" must be one of ${ANCHORS.join(", ")}; got "${anchorMode}"`,
      );
    }
    const jointMode = params.joint;
    if (!(JOINTS as readonly string[]).includes(jointMode)) {
      throw new Error(
        `sweepProfile: param "joint" must be one of ${JOINTS.join(", ")}; got "${jointMode}"`,
      );
    }
    if (!Number.isInteger(params.sides) || params.sides < 3 || params.sides > 256) {
      throw new Error(
        `sweepProfile: param "sides" must be a whole number in [3, 256] (points around a 'circle' profile), got ${params.sides}`,
      );
    }
    // A PLAIN limit is checked here, in f64, and read from `scalarLimit`
    // below: the eager path keeps both its refusal and its arithmetic
    // exactly, so making this param field-capable is a pure extension. A
    // FIELD has no number to check until it lands on the points, so the
    // answer is named once here and reread rather than recomputed.
    const limitIsField = isField(params.miterLimit);
    let scalarLimit = 0;
    if (!limitIsField) {
      const plainLimit = params.miterLimit;
      if (typeof plainLimit !== "number" || !Number.isFinite(plainLimit) || plainLimit < 1) {
        throw new Error(
          `sweepProfile: param "miterLimit" must be a finite number >= 1 (a limit below 1 would shrink every joint), got ${String(plainLimit)}`,
        );
      }
      scalarLimit = plainLimit;
    }

    const src = requireGeometry(inputs, "in", "sweepProfile");
    // `normal` and `uv` are this node's own shapes, not the author's, so a
    // differently shaped column under either name is refused rather than
    // deleted and re-added — the same rule writeTangents and
    // writeCurveFrame follow, checked against the INPUT because every
    // input point attribute is copied around the rings.
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: "sweepProfile",
      param: "normal",
      name: "normal",
      type: "f32",
      tupleSize: 3,
      domain: "point",
      suggestion: "inNormal",
    });
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: "sweepProfile",
      param: "uv",
      name: "uv",
      type: "f32",
      tupleSize: 2,
      domain: "point",
      suggestion: "inUv",
    });

    // An empty input (a partitioned cook's empty cell) sweeps to an empty mesh.
    const tables = polylineArcTables(src, "sweepProfile", "emptyInput");
    // The profile and the anchor are decided HERE, once: every string is
    // compared before the ring loop, which reads only the numbers and
    // booleans the chosen ProfileSpec carries (see the note in
    // `src/noise/worley.ts`).
    const profile =
      profileName === "circle"
        ? circleProfile(params.sides)
        : profileName === "square"
          ? squareProfile()
          : profileName === "ribbon"
            ? ribbonProfile()
            : profileName === "rect"
              ? rectProfile(anchorMode === "bottom" ? 0.5 : anchorMode === "top" ? -0.5 : 0)
              : polygonProfile(sectionCorners(params.section));
    const perAxis = profile.axes;
    const capUv = profile.capUv;
    const capable = profile.cap.length > 0 && params.caps;
    // Every field-capable param resolves BEFORE anything is written, on
    // the untouched input, so the GPU and CPU paths read the same bytes.
    // Which param sets the ring's size is the profile's own business —
    // a closed section has a radius, an open strip has a width.
    const scaleCol = requireTuple(
      await resolveOnMaybeGpu(
        gpu,
        src,
        "point",
        profile.scaleParam === "width" ? params.width : params.radius,
        seed,
        "sweepProfile",
        profile.scaleParam,
      ),
      [1],
      "sweepProfile",
      profile.scaleParam,
    );
    // The second axis's extent, only for a section scaled per axis — left
    // unresolved otherwise, exactly as `radius` is for a 'ribbon'.
    const heightCol = perAxis
      ? requireTuple(
          await resolveOnMaybeGpu(gpu, src, "point", params.height, seed, "sweepProfile", "height"),
          [1],
          "sweepProfile",
          "height",
        )
      : undefined;
    const rollCol = requireTuple(
      await resolveOnMaybeGpu(gpu, src, "point", params.roll, seed, "sweepProfile", "roll"),
      [1],
      "sweepProfile",
      "roll",
    );
    // Only a FIELD limit becomes a column, and only under 'miter'. A
    // plain one stays the f64 number it was validated as, so the scalar
    // path compares exactly what it always compared rather than the f32
    // a column would have rounded it to; and a limit nothing reads is
    // not evaluated at all, the same way `radius` is left unresolved for
    // a 'ribbon'.
    const miterCol =
      jointMode === "miter" && limitIsField
        ? requireTuple(
            await resolveOnMaybeGpu(
              gpu,
              src,
              "point",
              params.miterLimit,
              seed,
              "sweepProfile",
              "miterLimit",
            ),
            [1],
            "sweepProfile",
            "miterLimit",
          )
        : undefined;
    const upIsField = isField(params.up);
    let upCol: Column | undefined;
    let upx = 0;
    let upy = 1;
    let upz = 0;
    if (upIsField) {
      upCol = requireTuple(
        await resolveOnMaybeGpu(gpu, src, "point", params.up, seed, "sweepProfile", "up"),
        [1, 3],
        "sweepProfile",
        "up",
      );
    } else {
      const up = params.up;
      if (!Array.isArray(up) || up.length !== 3 || !up.every((v) => Number.isFinite(v))) {
        throw new Error(
          'sweepProfile: param "up" must be an array of 3 finite numbers (e.g. [0, 1, 0])',
        );
      }
      const lenSq = up[0] * up[0] + up[1] * up[1] + up[2] * up[2];
      const inv = lenSq > 0 ? 1 / Math.sqrt(lenSq) : 0;
      upx = up[0] * inv;
      upy = up[1] * inv;
      upz = up[2] * inv;
    }

    // Frame sources, read once. A missing column is not fatal: the ring
    // falls back to the up hint, and the message only fires when the
    // author asked for a mode whose attribute is nowhere at all.
    const frameAttr =
      frameMode === "curveFrame"
        ? src.attrs.point.get("curveNormal")
        : frameMode === "rot"
          ? src.attrs.point.get("rot")
          : undefined;
    if (frameMode !== "upHint" && frameAttr === undefined) {
      throw new Error(
        frameMode === "curveFrame"
          ? 'sweepProfile: frame "curveFrame" reads the "curveNormal" point attribute and the input has none; run writeCurveFrame on the path first (it writes curveNormal, curveBinormal and tangent together), or use frame "upHint"'
          : 'sweepProfile: frame "rot" reads the standard "rot" point attribute and the input has none; run orientAlongVector on the path first, or use frame "upHint"',
      );
    }
    const frameTuple = frameMode === "rot" ? 4 : 3;
    if (frameAttr !== undefined && (frameAttr.type !== "f32" || frameAttr.tupleSize < frameTuple)) {
      throw new Error(
        `sweepProfile: frame "${frameMode}" needs the "${frameAttr.name}" point attribute to be f32 with at least ${frameTuple} components, but it is ${frameAttr.type} with ${frameAttr.tupleSize}`,
      );
    }
    // Both modes, settled here rather than asked inside the per-ring loop
    // below — see the note in `src/noise/worley.ts`. Both were already
    // branched on above (the miter limit's resolve, and the frame's own
    // column), and both tests are POSITIVE, so each trailing arm still
    // carries what it did: 'perpendicular', and the `rot` read.
    const jointIsMiter = jointMode === "miter";
    const frameIsCurveFrame = frameMode === "curveFrame";

    // Pass one: lay the output out. Purely combinatorial, so the writing
    // pass below can index straight into the blocks it names.
    const layouts: SweepLayout[] = [];
    let nPoints = 0;
    let nTris = 0;
    for (const table of tables) {
      const nv = table.points.length;
      const rings = table.closed ? nv - 1 : nv;
      if (rings < 2) continue;
      const dirs = segmentDirs(table);
      if (dirs.first < 0) continue; // every segment degenerate: no direction anywhere
      const bands = table.closed ? rings : rings - 1;
      const caps = capable && !table.closed;
      const pointBase = nPoints;
      nPoints += rings * profile.count;
      const capStart = caps ? nPoints : -1;
      if (caps) nPoints += profile.cap.length;
      const capEnd = caps ? nPoints : -1;
      if (caps) nPoints += profile.cap.length;
      nTris += bands * profile.bandA.length * 2 + (caps ? (2 * profile.capTris.length) / 3 : 0);
      layouts.push({
        table,
        dirs,
        rings,
        bands,
        caps,
        pointBase,
        capStart,
        capEnd,
      });
    }
    if (nTris === 0 && tables.length > 0) {
      throw new Error(
        `sweepProfile: none of the input's ${tables.length} path(s) can be swept — a path needs at least 2 distinct points and at least one segment of nonzero length. Drop the degenerate paths upstream, or move the points apart.`,
      );
    }

    // Which input point every output point came from, in write order.
    // This is the whole attribute story on the point domain: one gather,
    // no interpolation, values replicated around each ring.
    const srcPoint = new Uint32Array(nPoints);
    const v2p = new Uint32Array(nTris * 3);
    const primStart = new Uint32Array(nTris);
    const primCount = new Uint32Array(nTris);
    const primSrc = new Uint32Array(nTris);
    {
      let t = 0;
      for (const L of layouts) {
        const pts = L.table.points;
        for (let k = 0; k < L.rings; k++) {
          const base = L.pointBase + k * profile.count;
          for (let i = 0; i < profile.count; i++) srcPoint[base + i] = pts[k];
        }
        for (let k = 0; k < L.bands; k++) {
          const a = L.pointBase + k * profile.count;
          const b = L.pointBase + ((k + 1) % L.rings) * profile.count;
          for (let e = 0; e < profile.bandA.length; e++) {
            const i0 = profile.bandA[e];
            const i1 = profile.bandB[e];
            v2p[t * 3] = a + i0;
            v2p[t * 3 + 1] = a + i1;
            v2p[t * 3 + 2] = b + i0;
            primSrc[t++] = L.table.prim;
            v2p[t * 3] = a + i1;
            v2p[t * 3 + 1] = b + i1;
            v2p[t * 3 + 2] = b + i0;
            primSrc[t++] = L.table.prim;
          }
        }
        if (L.caps) {
          const nc = profile.cap.length;
          for (let c = 0; c < nc; c++) {
            srcPoint[L.capStart + c] = pts[0];
            srcPoint[L.capEnd + c] = pts[L.rings - 1];
          }
          // The start cap faces backwards along the path, the end cap
          // forwards, so the start cap takes the triangles reversed.
          const ct = profile.capTris;
          for (let k = 0; k < ct.length; k += 3) {
            v2p[t * 3] = L.capStart + ct[k];
            v2p[t * 3 + 1] = L.capStart + ct[k + 2];
            v2p[t * 3 + 2] = L.capStart + ct[k + 1];
            primSrc[t++] = L.table.prim;
          }
          for (let k = 0; k < ct.length; k += 3) {
            v2p[t * 3] = L.capEnd + ct[k];
            v2p[t * 3 + 1] = L.capEnd + ct[k + 1];
            v2p[t * 3 + 2] = L.capEnd + ct[k + 2];
            primSrc[t++] = L.table.prim;
          }
        }
      }
      for (let i = 0; i < nTris; i++) {
        primStart[i] = i * 3;
        primCount[i] = 3;
      }
    }

    const out = new Geometry();
    copyElements(src.attrs.point, out.attrs.point, srcPoint, nPoints);
    const P = out.attrs.point.require("P");
    const pOut = P.writable();
    const pStride = P.tupleSize;
    const normal = out.attrs.point.replace("normal", "f32", 3, [0, 0, 0]).writable();
    const uv = out.attrs.point.replace("uv", "f32", 2, [0, 0]).writable();

    const srcP = src.attrs.point.require("P");
    const pd = srcP.data;
    const ps = srcP.tupleSize;
    const fd = frameAttr?.data;
    const fs = frameAttr?.tupleSize ?? 0;

    const q: number[] = [0, 0, 0, 1];
    const e1: number[] = [0, 0, 0];
    const e2: number[] = [0, 0, 0];
    const rp: number[] = [0, 0];
    const rn: number[] = [0, 0];
    let rings = 0;
    for (const L of layouts) {
      const table = L.table;
      const pts = table.points;
      const dirs = L.dirs;
      const nSeg = table.segLen.length;
      const arc = table.length;
      for (let k = 0; k < L.rings; k++) {
        if ((rings++ & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
        const pi = pts[k];
        const po = pi * ps;
        // Outgoing and incoming unit directions, standing in from the
        // nearest segment that has one.
        let outIdx = k < nSeg ? dirs.fwd[k] : -1;
        if (outIdx < 0) outIdx = table.closed ? dirs.first : dirs.last;
        let inIdx = k > 0 ? dirs.bwd[k - 1] : table.closed ? dirs.last : -1;
        if (inIdx < 0) inIdx = table.closed ? dirs.last : dirs.first;
        const ox = dirs.dir[outIdx * 3];
        const oy = dirs.dir[outIdx * 3 + 1];
        const oz = dirs.dir[outIdx * 3 + 2];
        const ix = dirs.dir[inIdx * 3];
        const iy = dirs.dir[inIdx * 3 + 1];
        const iz = dirs.dir[inIdx * 3 + 2];
        // The ring plane bisects the two segments. For equal-length
        // segments this is the central-difference tangent writeTangents
        // computes; unlike it, the TRUE bisector makes the miter exact
        // (both cylinders cut the same ellipse on this plane) whatever
        // the two segment lengths are.
        let nx = ix + ox;
        let ny = iy + oy;
        let nz = iz + oz;
        let nl = nx * nx + ny * ny + nz * nz;
        if (nl <= 1e-12) {
          // A hairpin: the two segments are antiparallel and bisect
          // nothing. The outgoing direction stands in, unmitered.
          nx = ox;
          ny = oy;
          nz = oz;
          nl = 1;
        } else {
          const inv = 1 / Math.sqrt(nl);
          nx *= inv;
          ny *= inv;
          nz *= inv;
        }
        // Miter: stretch along the in-plane bend direction, which is
        // parallel to (out - in) and perpendicular to the bisector.
        let mx = 0;
        let my = 0;
        let mz = 0;
        let stretch = 0;
        if (jointIsMiter) {
          const cosHalf = nx * ox + ny * oy + nz * oz;
          const ms = cosHalf > 0 ? 1 / cosHalf : 0;
          // The ring's OWN limit: read at the point this ring stands on,
          // never resolved here. A resolved value below 1 admits no
          // stretch, which is the unstretched section this test already
          // falls back to.
          const limit = miterCol !== undefined ? readComp(miterCol, pi, 0) : scalarLimit;
          if (ms > 1 && ms <= limit) {
            let wx = ox - ix;
            let wy = oy - iy;
            let wz = oz - iz;
            const wl = wx * wx + wy * wy + wz * wz;
            if (wl > 1e-12) {
              const inv = 1 / Math.sqrt(wl);
              wx *= inv;
              wy *= inv;
              wz *= inv;
              mx = wx;
              my = wy;
              mz = wz;
              stretch = ms - 1;
            }
          }
        }

        // The roll axes. The plane is fixed above; `frame` only decides
        // where inside it the profile's first axis points.
        let ax = 0;
        let ay = 0;
        let az = 0;
        let have = false;
        if (frameAttr !== undefined && fd !== undefined) {
          const fo = pi * fs;
          if (frameIsCurveFrame) {
            ax = fd[fo];
            ay = fd[fo + 1];
            az = fd[fo + 2];
          } else {
            // rot's local +X, without materializing the whole basis.
            rotateVec(e1, fd[fo], fd[fo + 1], fd[fo + 2], fd[fo + 3], 1, 0, 0);
            ax = e1[0];
            ay = e1[1];
            az = e1[2];
          }
          // Gram-Schmidt into the ring plane.
          const d = ax * nx + ay * ny + az * nz;
          ax -= nx * d;
          ay -= ny * d;
          az -= nz * d;
          const al = ax * ax + ay * ay + az * az;
          if (al > 1e-12) {
            const inv = 1 / Math.sqrt(al);
            e1[0] = ax * inv;
            e1[1] = ay * inv;
            e1[2] = az * inv;
            e2[0] = ny * e1[2] - nz * e1[1];
            e2[1] = nz * e1[0] - nx * e1[2];
            e2[2] = nx * e1[1] - ny * e1[0];
            have = true;
          }
        }
        if (!have) {
          let ux = upx;
          let uy = upy;
          let uz = upz;
          if (upCol !== undefined) {
            ux = readComp(upCol, pi, 0);
            uy = readComp(upCol, pi, 1);
            uz = readComp(upCol, pi, 2);
            const ul = ux * ux + uy * uy + uz * uz;
            const inv = ul > 0 ? 1 / Math.sqrt(ul) : 0;
            ux *= inv;
            uy *= inv;
            uz *= inv;
          }
          // Local +Z onto the ring normal, through the one place the
          // library builds an orientation from a direction — so the up
          // fallbacks are the shared contract, not a second copy of it.
          // The axis is a module constant, so nothing here spells it.
          orientQuat(q, nx, ny, nz, ux, uy, uz, ORIENT_AXIS_PZ);
          rotateVec(e1, q[0], q[1], q[2], q[3], 1, 0, 0);
          rotateVec(e2, q[0], q[1], q[2], q[3], 0, 1, 0);
        }

        const scale = readComp(scaleCol, pi, 0);
        // A per-axis section scales its second axis by `height`; the
        // uniform ones never read it.
        const scale2 = heightCol !== undefined ? readComp(heightCol, pi, 0) : scale;
        const turns = readComp(rollCol, pi, 0);
        const rc = Math.cos(2 * Math.PI * turns);
        const rsn = Math.sin(2 * Math.PI * turns);
        const u = arc > 0 ? table.cum[k] / arc : 0;
        const base = L.pointBase + k * profile.count;
        for (let i = 0; i < profile.count; i++) {
          let vx: number;
          let vy: number;
          let vz: number;
          if (perAxis) {
            // Scale in the section's own axes FIRST, then roll, so the
            // section stays the shape it was declared as. A normal goes
            // through the inverse-transpose of that scale, (n1 * s2,
            // n2 * s1) up to length; a face with a zero extent keeps its
            // unscaled normal rather than a zero one.
            rollApply(rp, profile.pos[i * 2] * scale, profile.pos[i * 2 + 1] * scale2, rc, rsn);
            let m1 = profile.nrm[i * 2] * scale2;
            let m2 = profile.nrm[i * 2 + 1] * scale;
            const ml = m1 * m1 + m2 * m2;
            if (ml > 0) {
              const inv = 1 / Math.sqrt(ml);
              m1 *= inv;
              m2 *= inv;
            } else {
              m1 = profile.nrm[i * 2];
              m2 = profile.nrm[i * 2 + 1];
            }
            rollApply(rn, m1, m2, rc, rsn);
            vx = rp[0] * e1[0] + rp[1] * e2[0];
            vy = rp[0] * e1[1] + rp[1] * e2[1];
            vz = rp[0] * e1[2] + rp[1] * e2[2];
          } else {
            rollApply(rp, profile.pos[i * 2], profile.pos[i * 2 + 1], rc, rsn);
            rollApply(rn, profile.nrm[i * 2], profile.nrm[i * 2 + 1], rc, rsn);
            vx = (rp[0] * e1[0] + rp[1] * e2[0]) * scale;
            vy = (rp[0] * e1[1] + rp[1] * e2[1]) * scale;
            vz = (rp[0] * e1[2] + rp[1] * e2[2]) * scale;
          }
          if (stretch !== 0) {
            const along = vx * mx + vy * my + vz * mz;
            vx += mx * along * stretch;
            vy += my * along * stretch;
            vz += mz * along * stretch;
          }
          const o = (base + i) * pStride;
          pOut[o] = pd[po] + vx;
          pOut[o + 1] = pd[po + 1] + vy;
          pOut[o + 2] = pd[po + 2] + vz;
          const no = (base + i) * 3;
          normal[no] = rn[0] * e1[0] + rn[1] * e2[0];
          normal[no + 1] = rn[0] * e1[1] + rn[1] * e2[1];
          normal[no + 2] = rn[0] * e1[2] + rn[1] * e2[2];
          uv[(base + i) * 2] = u;
          uv[(base + i) * 2 + 1] = profile.v[i];
        }

        // Caps reuse the ring just built, so a cap point sits exactly on
        // its wall neighbour; only the normal and the uv differ.
        if (L.caps && (k === 0 || k === L.rings - 1)) {
          const capBase = k === 0 ? L.capStart : L.capEnd;
          const sign = k === 0 ? -1 : 1;
          const nc = profile.cap.length;
          for (let c = 0; c < nc; c++) {
            const i = profile.cap[c];
            const from = (base + i) * pStride;
            const o = (capBase + c) * pStride;
            pOut[o] = pOut[from];
            pOut[o + 1] = pOut[from + 1];
            pOut[o + 2] = pOut[from + 2];
            const no = (capBase + c) * 3;
            normal[no] = nx * sign;
            normal[no + 1] = ny * sign;
            normal[no + 2] = nz * sign;
            if (capUv !== undefined) {
              uv[(capBase + c) * 2] = capUv[c * 2];
              uv[(capBase + c) * 2 + 1] = capUv[c * 2 + 1];
            } else {
              // A disc mapping over the UNIT section, so cap uv does not
              // move when the radius does.
              rollApply(rp, profile.pos[i * 2], profile.pos[i * 2 + 1], rc, rsn);
              uv[(capBase + c) * 2] = 0.5 + 0.5 * rp[0];
              uv[(capBase + c) * 2 + 1] = 0.5 + 0.5 * rp[1];
            }
          }
        }
      }
    }

    // Allocated for this output in the layout pass above and written only
    // there; nothing keeps them, so the output adopts them, not a copy.
    adoptTopology(out, v2p, primStart, primCount);
    out.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
    carryPrimitiveAttributes(
      src.attrs.primitive,
      out.attrs.primitive,
      primSrc,
      "sweepProfile",
      "primitive",
    );
    copyElements(src.attrs.detail, out.attrs.detail, undefined, src.attrs.detail.count);
    return { out: [makeGeometryItem(out)] };
  },
});

/** Which way an extrusion goes. */
const EXTRUDE_DIRECTIONS = ["+y", "vector", "polygonNormal"] as const;
/** Which ends of an extrusion are closed. */
const EXTRUDE_CAPS = ["none", "top", "bottom", "both"] as const;

/** Per-polygon bookkeeping shared by the counting pass and the writing pass. */
interface ExtrudeLayout {
  readonly table: PolylineArcTable;
  /** Distinct boundary points (the closing repeat is not one of them). */
  readonly corners: number;
  /** Unit extrusion direction of THIS polygon. */
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  /** Newell normal of the footprint, UNNORMALIZED (zero when degenerate). */
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  /** +1 when the boundary winds counter-clockwise about the direction. */
  readonly wind: number;
  /**
   * +1 when the solid is built ALONG the direction, -1 when a negative
   * `distance` puts it on the other side. Every winding decision is made
   * against `wind * hsign` so a downward extrusion comes out facing
   * outward rather than inside out; the wall NORMALS stay on `wind`
   * alone, because a wall's outward direction is away from the footprint
   * interior whichever side the solid is on.
   */
  readonly hsign: number;
  /** First output point of this loop's walls (set in the placing pass). */
  wallBase: number;
  /** First output point of this loop's bottom cap points, or -1 for none. */
  bottomBase: number;
  /** First output point of this loop's top cap points, or -1 for none. */
  topBase: number;
}

/**
 * How one polygon's caps are triangulated, held on its OUTLINE's loop.
 * `loops` are the table indices whose cap points the cap uses, outline
 * first; `tris` indexes those points packed in that order (corner g of
 * the outline, then the next loop's corners, ...), every triangle
 * counter-clockwise seen from along the direction — or is undefined for
 * the fan from the outline's first point a convex, hole-free polygon
 * keeps.
 */
interface ExtrudeCapPlan {
  readonly loops: readonly number[];
  readonly tris: Uint32Array | undefined;
}

/** One polygon: an outline and the loops that are holes in it. */
interface ExtrudeGroup {
  /** Table indices: the outline, then its holes in input order. */
  readonly loops: readonly number[];
  /** The outline's table index. */
  readonly outer: number;
}

/**
 * The primitive attribute that makes a closed loop a HOLE: i32, -1 (or
 * any negative) on an outline, and on a hole the primitive index of the
 * outline it cuts, in the same geometry. The convention `polygonBoolean`
 * and `splitPolygons` (./polygons.ts, `HOLE_OF_ATTR`) write and read, so
 * their output extrudes with its holes and no param to set.
 */
const HOLE_OF = "holeOf";

/**
 * The input's closed loops as polygons: every loop is its own polygon,
 * except that a loop whose {@link HOLE_OF} is 0 or more joins the polygon
 * of the outline it names. Polygons come out in the order of their
 * outlines, so the output keeps the input's order.
 */
function extrudeGroups(src: Geometry, tables: readonly PolylineArcTable[]): ExtrudeGroup[] {
  const attr = src.attrs.primitive.get(HOLE_OF);
  if (attr === undefined) return tables.map((_, t) => ({ loops: [t], outer: t }));
  if (attr.type !== "i32" || attr.tupleSize !== 1) {
    throw new Error(
      `extrudePolygon: the input carries primitive attribute "${HOLE_OF}" as ${attr.type} with tupleSize ${attr.tupleSize}; "${HOLE_OF}" is read as the i32 link from a HOLE loop to the outline it cuts (-1 on an outline, the outline's primitive index on a hole — what polygonBoolean and splitPolygons write). Rename that attribute upstream, or rewrite it as i32.`,
    );
  }
  const nPrim = src.primitiveCount;
  const tableOf = new Int32Array(nPrim).fill(-1);
  for (let t = 0; t < tables.length; t++) tableOf[tables[t].prim] = t;
  const holeOf = attr.data;
  const groupOf = new Int32Array(tables.length).fill(-1);
  const groups: { loops: number[]; outer: number }[] = [];
  for (let t = 0; t < tables.length; t++) {
    if (holeOf[tables[t].prim] < 0) {
      groupOf[t] = groups.length;
      groups.push({ loops: [t], outer: t });
    }
  }
  for (let t = 0; t < tables.length; t++) {
    const prim = tables[t].prim;
    const target = holeOf[prim];
    if (target < 0) continue;
    const ot = target < nPrim ? tableOf[target] : -1;
    if (ot < 0 || holeOf[target] >= 0) {
      throw new Error(
        `extrudePolygon: primitive ${prim} has ${HOLE_OF} = ${target}, which names ${
          ot < 0
            ? `no closed polyline of the input's ${nPrim} primitive(s)`
            : `primitive ${target}, itself a hole (its ${HOLE_OF} is ${holeOf[target]})`
        }; ${HOLE_OF} is -1 on an outline and, on a hole, the primitive index of the OUTLINE it cuts. Set it to -1 to extrude this loop as a polygon of its own, or point it at the outline.`,
      );
    }
    groups[groupOf[ot]].loops.push(t);
  }
  return groups;
}

/** A closed footprint swept along a direction into a solid. */
export const extrudePolygon = standardNode<
  ExtrudePolygonParams,
  ExtrudePolygonInputs,
  ExtrudePolygonOutputs
>({
  type: "extrudePolygon",
  category: "surface",
  description:
    "Treats every CLOSED polyline primitive as a polygon boundary and sweeps it along a direction into 3-vertex 'poly' triangles: a footprint becomes massing, a boundary loop becomes a wall. This is the node a pipeline that already computed its plots has been waiting for — a closed quad per lot renders as four hairlines until something gives it a third dimension. Output carries P, a `normal` (f32 tuple 3) and a `uv` (f32 tuple 2) the node writes itself, plus every INPUT POINT attribute copied onto the points that came from it and every input PRIMITIVE attribute gathered onto the triangles, so a per-lot `lotId` or `districtKind` survives; input VERTEX attributes are dropped. `normal` and `uv` are reporting slots — an input already carrying either at a different shape is REFUSED by name rather than silently deleted. On the walls `u` runs 0..1 around the boundary by ARC LENGTH (so a plot with one long side does not stretch its texture there) and `v` 0..1 from bottom to top; on the caps both run 0..1 across the footprint's own bounding box in the plane perpendicular to the direction. Walls, top cap and bottom cap keep SEPARATE points, so the edge where a roof meets a wall stays a crease instead of being shaded round. Caps are exact for any SIMPLE footprint, convex or not: a convex one is a fan from the boundary's first point (n - 2 triangles), a concave one (an L, a U, a courtyard block) is ear-clipped — deterministically, adding no points — as seen along the extrusion direction. HOLES: a closed loop whose i32 primitive attribute `holeOf` is 0 or more is a HOLE through the outline whose primitive index it holds (-1 marks an outline) — the convention polygonBoolean and splitPolygons write, so their output extrudes with its courtyards and stair wells as it comes; setAttribute writes it by hand. The caps are cut around each hole, and each hole gets walls of its own, facing INTO the hole. The outline decides the whole polygon: its direction (a 'vector' field is read on the OUTLINE's primitive, 'polygonNormal' is the outline's own normal), which side the solid is on (`distance` summed over every loop), and the cap normals and uv box; every cap triangle carries the outline's primitive attributes, each hole's walls the hole's. Loops may wind either way. A hole with a point outside its outline (seen along the direction), a `holeOf` naming no closed loop, and a hole of a hole are refused by primitive; crossing edges and holes overlapping each other are not searched for. A hole of zero area cuts nothing and still gets its walls. Without a `holeOf` attribute every loop is a polygon of its own. A self-crossing boundary is not refused and its caps describe nothing. An OPEN polyline is refused by name: extrusion is not defined on one, and the fix is pointsToPath with `closed: true`. Winding is derived from the polygon's own Newell normal against the direction and against the sign of `distance`, so a footprint wound either way, extruded either way, comes out facing outward.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    distance: {
      type: "f32",
      default: 3,
      acceptsField: true,
      description:
        "How far the boundary travels along the direction, in world units. Field-capable and resolved on the INPUT points — the footprint's own points — so a per-point value gives a sloped top rather than a flat one, and a per-lot height living on the primitive domain becomes a field once promoteAttribute has put it on the points. A negative distance builds the solid on the OTHER side of the footprint and still comes out facing outward — the winding flips with it. A footprint whose distances straddle zero is a bowtie and has no outward side; the sign of their sum decides, which is total rather than right.",
    },
    direction: {
      type: "enum",
      default: "+y",
      enum: [...EXTRUDE_DIRECTIONS],
      description:
        "Which way the boundary travels. '+y' is straight up, the answer for buildings and walls on a ground plane. 'vector' uses the `vector` param, normalized. 'polygonNormal' computes each polygon's OWN normal by Newell's method — a sum over the boundary edges, so it is exact for a planar polygon, deterministic, and defined for a non-planar one (it returns the best-fit plane's normal) — which is what extrudes a footprint that is not lying flat. A polygon whose Newell normal is zero (every point collinear, or zero area) is refused by primitive index.",
    },
    vector: {
      type: "vec3",
      default: [0, 1, 0],
      acceptsField: true,
      description:
        "Direction for the 'vector' mode; need not be unit length, and is normalized before use. Ignored by the other modes. Field-capable on the PRIMITIVE domain — one direction per closed polyline, which is the element a whole extrusion belongs to — so two footprints in one input rise along two different vectors in a single cook: a per-lot `attribute('slope')`, a `byAttribute` over a per-lot string kind, or `randomField` all read there. It is NOT per point and cannot be: a per-point direction would shear the footprint rather than sweep it, and a per-point HEIGHT is what `distance` already is. Read the domain it resolves on before writing the expression — the primitive domain carries no P, so `position()` is not available there and a value the points know reaches it through promoteAttribute (point to primitive). A vector that resolves to [0, 0, 0] refuses THAT PRIMITIVE BY INDEX rather than flattening it into a sheet, exactly as direction 'polygonNormal' refuses a polygon whose Newell normal is zero — the same condition (this polygon names no direction) and the same answer; a plain [0, 0, 0] is still refused before the walk, by the param rather than by a primitive. Resolved on the CPU whether or not the cook carries a GPU device: the primitive domain holds one element per polygon, so a dispatch would cost more than the three multiplies it replaces. `distance` is the param that may resolve on the device.",
    },
    caps: {
      type: "enum",
      default: "both",
      enum: [...EXTRUDE_CAPS],
      description:
        "Which ends are closed. 'both' is a solid; 'bottom' or 'top' alone leaves an open shell (with `sides` false, 'top' is a floating lid — a roof with no building); 'none' with `sides` is a tube of wall. Each cap faces along its OWN plane's normal rather than along the direction, which is what makes a per-point `distance` shade as the sloped roof it actually builds, and what keeps a footprint lying in a tilted plane correct when it is extruded straight up.",
    },
    sides: {
      type: "bool",
      default: true,
      description:
        "Build the wall between the two ends. False keeps only the caps the `caps` param asked for, which is how a flat slab (`caps: 'bottom'`) or a floating roof (`caps: 'top'`) is spelled without a second node. False with `caps: 'none'` has nothing to build and is refused.",
    },
  },
  // `distance` may resolve on the GPU, evaluated on the INPUT geometry
  // which this node never mutates. Not `resident`: the element count
  // changes and topology is not device-resident. `vector` is field-capable
  // too but stays on the CPU: it resolves on the PRIMITIVE domain, which
  // holds one element per polygon — too few to pay for a dispatch, and a
  // domain the device path has never served (no other node resolves a
  // field off the point domain, and `position`/`randomField` cannot lower
  // there at all).
  gpu: "fields",
  async execute({ inputs, params, seed, gpu, checkCancelled }) {
    const dirMode = params.direction;
    if (!(EXTRUDE_DIRECTIONS as readonly string[]).includes(dirMode)) {
      throw new Error(
        `extrudePolygon: param "direction" must be one of ${EXTRUDE_DIRECTIONS.join(", ")}; got "${dirMode}"`,
      );
    }
    const capMode = params.caps;
    if (!(EXTRUDE_CAPS as readonly string[]).includes(capMode)) {
      throw new Error(
        `extrudePolygon: param "caps" must be one of ${EXTRUDE_CAPS.join(", ")}; got "${capMode}"`,
      );
    }
    const wantBottom = capMode === "bottom" || capMode === "both";
    const wantTop = capMode === "top" || capMode === "both";
    const wantSides = params.sides;
    if (!wantSides && !wantBottom && !wantTop) {
      throw new Error(
        'extrudePolygon: params "sides" false and "caps" "none" leave nothing to build; turn one of them back on',
      );
    }

    // A PLAIN vector is checked and normalized once, here, before the
    // input is even fetched — same refusals, same arithmetic, same order
    // as before this param took a field. A FIELD becomes one direction
    // per primitive below, once there is a geometry to resolve against.
    const vectorIsField = isField(params.vector);
    let gx = 0;
    let gy = 1;
    let gz = 0;
    if (dirMode === "vector" && !vectorIsField) {
      const v = params.vector;
      if (!Array.isArray(v) || v.length !== 3 || !v.every((c) => Number.isFinite(c))) {
        throw new Error(
          'extrudePolygon: param "vector" must be an array of 3 finite numbers (e.g. [0, 1, 0])',
        );
      }
      const lenSq = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      if (lenSq === 0) {
        throw new Error(
          'extrudePolygon: param "vector" is [0, 0, 0], which names no direction; give it a nonzero vector, or use direction "+y" or "polygonNormal"',
        );
      }
      const inv = 1 / Math.sqrt(lenSq);
      gx = v[0] * inv;
      gy = v[1] * inv;
      gz = v[2] * inv;
    }

    const src = requireGeometry(inputs, "in", "extrudePolygon");
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: "extrudePolygon",
      param: "normal",
      name: "normal",
      type: "f32",
      tupleSize: 3,
      domain: "point",
      suggestion: "inNormal",
    });
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: "extrudePolygon",
      param: "uv",
      name: "uv",
      type: "f32",
      tupleSize: 2,
      domain: "point",
      suggestion: "inUv",
    });

    const tables = polylineArcTables(src, "extrudePolygon");
    const distCol = requireTuple(
      await resolveOnMaybeGpu(gpu, src, "point", params.distance, seed, "extrudePolygon", "distance"),
      [1],
      "extrudePolygon",
      "distance",
    );
    // One direction per POLYGON, resolved once, before anything is
    // written and while the input is still untouched. Only in 'vector'
    // mode: a direction the other modes ignore is not evaluated either.
    const vectorCol =
      dirMode === "vector" && vectorIsField
        ? requireTuple(
            resolveOn(src, "primitive", params.vector, seed, "extrudePolygon", "vector"),
            [1, 3],
            "extrudePolygon",
            "vector",
          )
        : undefined;
    const srcP = src.attrs.point.require("P");
    const pd = srcP.data;
    const ps = srcP.tupleSize;

    const open = tables.filter((t) => !t.closed).map((t) => t.prim);
    if (open.length > 0) {
      throw new Error(
        `extrudePolygon: primitive(s) ${open.slice(0, 8).join(", ")}${open.length > 8 ? ", ..." : ""} of the input's ${tables.length} polyline(s) are OPEN, and extrusion is not defined on an open curve — there is no inside to fill and no boundary to close. Build the path with pointsToPath and \`closed: true\` (closure is structural: a closed polyline's last vertex references its own first point), or sweep it with sweepProfile instead.`,
      );
    }

    // Which direction rule, settled here rather than asked once per
    // POLYGON below — see the note in `src/noise/worley.ts`. The test is
    // POSITIVE, so a polygon under '+y' or 'vector' still skips the
    // Newell branch and keeps the direction it arrived with.
    const dirIsPolygonNormal = dirMode === "polygonNormal";
    const T = tables.length;
    // Pass 1: every loop's corner count and Newell normal — exact for a
    // planar loop, best-fit otherwise, and a pure function of the boundary
    // order (no Map, no sort).
    const newell = new Float64Array(T * 3);
    for (let t = 0; t < T; t++) {
      const table = tables[t];
      const m = table.points.length - 1;
      if (m < 3) {
        throw new Error(
          `extrudePolygon: primitive ${table.prim} closes over only ${m} distinct point(s); a polygon boundary needs at least 3`,
        );
      }
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let i = 0; i < m; i++) {
        const a = table.points[i] * ps;
        const b = table.points[(i + 1) % m] * ps;
        nx += (pd[a + 1] - pd[b + 1]) * (pd[a + 2] + pd[b + 2]);
        ny += (pd[a + 2] - pd[b + 2]) * (pd[a] + pd[b]);
        nz += (pd[a] - pd[b]) * (pd[a + 1] + pd[b + 1]);
      }
      newell[t * 3] = nx;
      newell[t * 3 + 1] = ny;
      newell[t * 3 + 2] = nz;
    }
    const groups = extrudeGroups(src, tables);

    // Pass 2, per POLYGON (an outline and its holes): the direction, the
    // side the solid is on, each loop's facing, and the cap plan.
    const layouts = new Array<ExtrudeLayout>(T);
    const capPlans = new Array<ExtrudeCapPlan | undefined>(T);
    const hasCapPoints = new Uint8Array(T);
    const q0: number[] = [0, 0, 0, 1];
    const b1: number[] = [0, 0, 0];
    const b2: number[] = [0, 0, 0];
    for (const group of groups) {
      checkCancelled();
      const outer = group.outer;
      const table = tables[outer];
      let dx = gx;
      let dy = gy;
      let dz = gz;
      const nx = newell[outer * 3];
      const ny = newell[outer * 3 + 1];
      const nz = newell[outer * 3 + 2];
      if (vectorCol !== undefined) {
        // This polygon's own direction, read on its OUTLINE's primitive.
        // A zero one is the same condition 'polygonNormal' refuses below
        // — the polygon names no direction — so it gets the same answer,
        // by primitive index.
        const vx = readComp(vectorCol, table.prim, 0);
        const vy = readComp(vectorCol, table.prim, 1);
        const vz = readComp(vectorCol, table.prim, 2);
        const lenSq = vx * vx + vy * vy + vz * vz;
        if (lenSq === 0) {
          throw new Error(
            `extrudePolygon: param "vector" resolved to [0, 0, 0] on primitive ${table.prim}, which names no direction — that polygon would flatten into a sheet rather than become a solid. Guard the expression so every primitive gets a nonzero vector (a select() or a max() on the component that vanishes), or use direction "+y" or "polygonNormal".`,
          );
        }
        const inv = 1 / Math.sqrt(lenSq);
        dx = vx * inv;
        dy = vy * inv;
        dz = vz * inv;
      }
      if (dirIsPolygonNormal) {
        const lenSq = nx * nx + ny * ny + nz * nz;
        if (lenSq === 0) {
          throw new Error(
            `extrudePolygon: direction "polygonNormal" needs primitive ${table.prim} to have an area, but its Newell normal is zero — every point is collinear, or they coincide. Use direction "+y" or "vector", or fix the footprint upstream.`,
          );
        }
        const inv = 1 / Math.sqrt(lenSq);
        dx = nx * inv;
        dy = ny * inv;
        dz = nz * inv;
      }
      // Which SIDE the solid ends up on. Summed rather than sampled so a
      // per-point `distance` decides it as a whole — over every loop of
      // the polygon, so a hole's walls cannot disagree with its outline's.
      // A footprint whose distances straddle zero is a bowtie and has no
      // outward side, so any rule is arbitrary there and this one is at
      // least total.
      let hsum = 0;
      for (const t of group.loops) {
        const pts = tables[t].points;
        const m = pts.length - 1;
        for (let i = 0; i < m; i++) hsum += readComp(distCol, pts[i], 0);
      }
      const hsign = hsum >= 0 ? 1 : -1;
      for (const t of group.loops) {
        const lx = newell[t * 3];
        const ly = newell[t * 3 + 1];
        const lz = newell[t * 3 + 2];
        const own = lx * dx + ly * dy + lz * dz >= 0 ? 1 : -1;
        layouts[t] = {
          table: tables[t],
          corners: tables[t].points.length - 1,
          dx,
          dy,
          dz,
          nx: lx,
          ny: ly,
          nz: lz,
          // A hole's walls face INTO the hole — away from the solid — so
          // a hole takes the facing opposite its own winding.
          wind: t === outer ? own : -own,
          hsign,
          wallBase: -1,
          bottomBase: -1,
          topBase: -1,
        };
      }
      // Nothing more to decide for a lone loop that takes no cap.
      if (!(wantBottom || wantTop) && group.loops.length === 1) continue;
      // The cap plane's basis — the construction the write pass uses for
      // the cap uv, so the same bits.
      orientQuat(q0, dx, dy, dz, 0, 1, 0, ORIENT_AXIS_PZ);
      rotateVec(b1, q0[0], q0[1], q0[2], q0[3], 1, 0, 0);
      rotateVec(b2, q0[0], q0[1], q0[2], q0[3], 0, 1, 0);
      // Every loop of the polygon in the cap plane, outline first.
      const order = [outer];
      for (const t of group.loops) if (t !== outer) order.push(t);
      const starts: number[] = [];
      let nv = 0;
      for (const t of order) {
        starts.push(nv);
        nv += tables[t].points.length - 1;
      }
      starts.push(nv);
      const xy = new Float64Array(nv * 2);
      for (let k = 0; k < order.length; k++) {
        const pts = tables[order[k]].points;
        for (let j = 0; j < starts[k + 1] - starts[k]; j++) {
          const a = pts[j] * ps;
          xy[(starts[k] + j) * 2] = pd[a] * b1[0] + pd[a + 1] * b1[1] + pd[a + 2] * b1[2];
          xy[(starts[k] + j) * 2 + 1] = pd[a] * b2[0] + pd[a + 1] * b2[1] + pd[a + 2] * b2[2];
        }
      }
      const outerArea = loopArea2(xy, 0, starts[1]);
      if (outerArea !== 0) {
        // A hole has to lie inside its outline. Checked per point
        // (touching the outline is allowed); crossing edges are not
        // searched for.
        for (let k = 1; k < order.length; k++) {
          for (let j = starts[k]; j < starts[k + 1]; j++) {
            if (pointInLoop(xy, 0, starts[1], xy[j * 2], xy[j * 2 + 1]) < 0) {
              const hole = tables[order[k]];
              throw new Error(
                `extrudePolygon: primitive ${hole.prim} is a hole of primitive ${table.prim} (its ${HOLE_OF} is ${table.prim}), but the hole's point ${hole.points[j - starts[k]]} lies OUTSIDE that outline, seen along the extrusion direction. A hole must sit inside the loop it cuts: set its ${HOLE_OF} to -1 if it is a polygon of its own, or fix it upstream.`,
              );
            }
          }
        }
      }
      if (!(wantBottom || wantTop)) continue;
      hasCapPoints[outer] = 1;
      // Holes that cut nothing (zero area in the cap plane, or an outline
      // with none) take no cap points; their walls are still built.
      const live: number[] = [];
      if (outerArea !== 0) {
        for (let k = 1; k < order.length; k++) {
          if (loopArea2(xy, starts[k], starts[k + 1] - starts[k]) !== 0) live.push(k);
        }
      }
      if (live.length === 0 && isConvexLoop(xy, 0, starts[1])) {
        // A convex outline keeps the fan from its first point it has
        // always had — the same triangles, bit for bit.
        capPlans[outer] = { loops: [outer], tris: undefined };
        continue;
      }
      // Ear-clipped, over the outline and the live holes packed in that
      // order: cap vertex g of the plan is corner g of the outline, then
      // the first live hole's corners, and so on.
      const loops = [outer];
      const packedStarts = [0];
      let packed = starts[1];
      for (const k of live) {
        loops.push(order[k]);
        packedStarts.push(packed);
        packed += starts[k + 1] - starts[k];
        hasCapPoints[order[k]] = 1;
      }
      packedStarts.push(packed);
      const packedXy = new Float64Array(packed * 2);
      packedXy.set(xy.subarray(0, starts[1] * 2), 0);
      for (let i = 0; i < live.length; i++) {
        const k = live[i];
        packedXy.set(xy.subarray(starts[k] * 2, starts[k + 1] * 2), packedStarts[i + 1] * 2);
      }
      capPlans[outer] = {
        loops,
        tris: Uint32Array.from(earClip(packedXy, packedStarts)),
      };
    }

    // Pass 3: where every loop's points land, in input order — its walls,
    // then its bottom and top cap points when it carries any.
    let nPoints = 0;
    let nTris = 0;
    for (let t = 0; t < T; t++) {
      const L = layouts[t];
      const m = L.corners;
      L.wallBase = nPoints;
      if (wantSides) {
        nPoints += m * 4;
        nTris += m * 2;
      }
      if (hasCapPoints[t] === 1 && wantBottom) {
        L.bottomBase = nPoints;
        nPoints += m;
      }
      if (hasCapPoints[t] === 1 && wantTop) {
        L.topBase = nPoints;
        nPoints += m;
      }
      const plan = capPlans[t];
      if (plan !== undefined) {
        const per = plan.tris === undefined ? m - 2 : plan.tris.length / 3;
        if (wantBottom) nTris += per;
        if (wantTop) nTris += per;
      }
    }

    const srcPoint = new Uint32Array(nPoints);
    const v2p = new Uint32Array(nTris * 3);
    const primStart = new Uint32Array(nTris);
    const primCount = new Uint32Array(nTris);
    const primSrc = new Uint32Array(nTris);
    {
      let t = 0;
      for (let li = 0; li < T; li++) {
        const L = layouts[li];
        const m = L.corners;
        const pts = L.table.points;
        // Every winding decision runs off wind * hsign: the geometry
        // itself flips when the solid is built on the other side, so the
        // vertex order has to flip with it or the whole solid comes back
        // inside out.
        const emit = L.wind * L.hsign;
        if (wantSides) {
          for (let j = 0; j < m; j++) {
            const b = L.wallBase + j * 4;
            // [bottom j, bottom j+1, top j, top j+1] — the band's own
            // four points, so its face normal stays flat.
            srcPoint[b] = pts[j];
            srcPoint[b + 1] = pts[(j + 1) % m];
            srcPoint[b + 2] = pts[j];
            srcPoint[b + 3] = pts[(j + 1) % m];
            if (emit > 0) {
              v2p[t * 3] = b;
              v2p[t * 3 + 1] = b + 1;
              v2p[t * 3 + 2] = b + 2;
              primSrc[t++] = L.table.prim;
              v2p[t * 3] = b + 1;
              v2p[t * 3 + 1] = b + 3;
              v2p[t * 3 + 2] = b + 2;
              primSrc[t++] = L.table.prim;
            } else {
              v2p[t * 3] = b;
              v2p[t * 3 + 1] = b + 2;
              v2p[t * 3 + 2] = b + 1;
              primSrc[t++] = L.table.prim;
              v2p[t * 3] = b + 1;
              v2p[t * 3 + 1] = b + 2;
              v2p[t * 3 + 2] = b + 3;
              primSrc[t++] = L.table.prim;
            }
          }
        }
        if (L.bottomBase >= 0) for (let j = 0; j < m; j++) srcPoint[L.bottomBase + j] = pts[j];
        if (L.topBase >= 0) for (let j = 0; j < m; j++) srcPoint[L.topBase + j] = pts[j];
        const plan = capPlans[li];
        if (plan !== undefined && plan.tris === undefined) {
          if (wantBottom) {
            // The bottom faces AGAINST the direction, so its fan winds
            // opposite the top's.
            for (let j = 1; j + 1 < m; j++) {
              v2p[t * 3] = L.bottomBase;
              v2p[t * 3 + 1] = L.bottomBase + (emit > 0 ? j + 1 : j);
              v2p[t * 3 + 2] = L.bottomBase + (emit > 0 ? j : j + 1);
              primSrc[t++] = L.table.prim;
            }
          }
          if (wantTop) {
            for (let j = 1; j + 1 < m; j++) {
              v2p[t * 3] = L.topBase;
              v2p[t * 3 + 1] = L.topBase + (emit > 0 ? j : j + 1);
              v2p[t * 3 + 2] = L.topBase + (emit > 0 ? j + 1 : j);
              primSrc[t++] = L.table.prim;
            }
          }
        } else if (plan !== undefined && plan.tris !== undefined) {
          // Ear-clipped: every triangle counter-clockwise in the cap
          // plane, which faces along the direction. The top faces along
          // it when the solid is built along it (hsign > 0), the bottom
          // against — winding here needs only hsign, because the clipper
          // already settled the loops' own winding.
          let nc = 0;
          for (const k of plan.loops) nc += layouts[k].corners;
          const bottomAt = new Uint32Array(nc);
          const topAt = new Uint32Array(nc);
          let g = 0;
          for (const k of plan.loops) {
            const K = layouts[k];
            for (let j = 0; j < K.corners; j++, g++) {
              bottomAt[g] = K.bottomBase + j;
              topAt[g] = K.topBase + j;
            }
          }
          const tris = plan.tris;
          const up = L.hsign > 0;
          if (wantBottom) {
            for (let k = 0; k < tris.length; k += 3) {
              v2p[t * 3] = bottomAt[tris[k]];
              v2p[t * 3 + 1] = bottomAt[tris[k + (up ? 2 : 1)]];
              v2p[t * 3 + 2] = bottomAt[tris[k + (up ? 1 : 2)]];
              primSrc[t++] = L.table.prim;
            }
          }
          if (wantTop) {
            for (let k = 0; k < tris.length; k += 3) {
              v2p[t * 3] = topAt[tris[k]];
              v2p[t * 3 + 1] = topAt[tris[k + (up ? 1 : 2)]];
              v2p[t * 3 + 2] = topAt[tris[k + (up ? 2 : 1)]];
              primSrc[t++] = L.table.prim;
            }
          }
        }
      }
      for (let i = 0; i < nTris; i++) {
        primStart[i] = i * 3;
        primCount[i] = 3;
      }
    }

    const out = new Geometry();
    copyElements(src.attrs.point, out.attrs.point, srcPoint, nPoints);
    const P = out.attrs.point.require("P");
    const pOut = P.writable();
    const pStride = P.tupleSize;
    const normal = out.attrs.point.replace("normal", "f32", 3, [0, 0, 0]).writable();
    const uv = out.attrs.point.replace("uv", "f32", 2, [0, 0]).writable();

    const q: number[] = [0, 0, 0, 1];
    const c1: number[] = [0, 0, 0];
    const c2: number[] = [0, 0, 0];
    // Wall normals of one polygon, computed before they are written so a
    // degenerate edge can borrow from a real one.
    let wallN = new Float64Array(0);
    let done = 0;
    for (let li = 0; li < T; li++) {
      const L = layouts[li];
      if ((done & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const m = L.corners;
      const pts = L.table.points;
      const { dx, dy, dz } = L;
      // The cap plane's basis, always: the degenerate-wall fallback below
      // borrows from it too. Same orientation construction, and the same
      // up fallbacks, every other frame in the library uses.
      orientQuat(q, dx, dy, dz, 0, 1, 0, ORIENT_AXIS_PZ);
      rotateVec(c1, q[0], q[1], q[2], q[3], 1, 0, 0);
      rotateVec(c2, q[0], q[1], q[2], q[3], 0, 1, 0);
      if (wantSides) {
        if (wallN.length < m * 3) wallN = new Float64Array(m * 3);
        for (let j = 0; j < m; j++) {
          const a = pts[j] * ps;
          const b = pts[(j + 1) % m] * ps;
          // Outward wall normal: perpendicular to the edge and to the
          // direction, turned by the boundary's winding. It rides on
          // `wind` alone, NOT on `wind * hsign`: a wall faces away from
          // the footprint's interior whichever side the solid sits on.
          const ex = pd[b] - pd[a];
          const ey = pd[b + 1] - pd[a + 1];
          const ez = pd[b + 2] - pd[a + 2];
          const wx = ey * dz - ez * dy;
          const wy = ez * dx - ex * dz;
          const wz = ex * dy - ey * dx;
          const wl = wx * wx + wy * wy + wz * wz;
          const inv = wl > 0 ? L.wind / Math.sqrt(wl) : 0;
          wallN[j * 3] = wx * inv;
          wallN[j * 3 + 1] = wy * inv;
          wallN[j * 3 + 2] = wz * inv;
        }
        // A zero-length boundary edge (two footprint points on top of
        // each other) has no direction and so no normal. The band it
        // makes is zero-area and draws nothing, but a [0,0,0] normal in
        // the buffer renders BLACK under every lit material if anything
        // downstream welds or resamples it, so the nearest real normal
        // stands in — and if the whole boundary is degenerate, the cap
        // basis does, which is at least perpendicular to the direction.
        let lastGood = -1;
        for (let j = 0; j < m; j++) {
          if (wallN[j * 3] !== 0 || wallN[j * 3 + 1] !== 0 || wallN[j * 3 + 2] !== 0) {
            lastGood = j;
            break;
          }
        }
        if (lastGood < 0) {
          for (let j = 0; j < m; j++) {
            wallN[j * 3] = c1[0];
            wallN[j * 3 + 1] = c1[1];
            wallN[j * 3 + 2] = c1[2];
          }
        } else {
          // One wrapping pass from the first real normal fills every gap.
          for (let k = 0; k < m; k++) {
            const j = (lastGood + k) % m;
            if (wallN[j * 3] === 0 && wallN[j * 3 + 1] === 0 && wallN[j * 3 + 2] === 0) {
              const p = (j + m - 1) % m;
              wallN[j * 3] = wallN[p * 3];
              wallN[j * 3 + 1] = wallN[p * 3 + 1];
              wallN[j * 3 + 2] = wallN[p * 3 + 2];
            }
          }
        }
        const perimeter = L.table.length;
        const invPerimeter = perimeter > 0 ? 1 / perimeter : 0;
        for (let j = 0; j < m; j++) {
          const i0 = pts[j];
          const i1 = pts[(j + 1) % m];
          const a = i0 * ps;
          const b = i1 * ps;
          const h0 = readComp(distCol, i0, 0);
          const h1 = readComp(distCol, i1, 0);
          const base = L.wallBase + j * 4;
          // u by ARC LENGTH around the boundary, from the same table
          // every path node measures with — so an unevenly cornered plot
          // does not stretch its texture on the long walls. The closing
          // edge ends at 1 exactly rather than at cum[m] / perimeter.
          const u0 = L.table.cum[j] * invPerimeter;
          const u1 = j + 1 === m ? 1 : L.table.cum[j + 1] * invPerimeter;
          const wx = wallN[j * 3];
          const wy = wallN[j * 3 + 1];
          const wz = wallN[j * 3 + 2];
          for (let c = 0; c < 4; c++) {
            const top = c >= 2;
            const far = (c & 1) === 1;
            const s = far ? b : a;
            const h = (far ? h1 : h0) * (top ? 1 : 0);
            const o = (base + c) * pStride;
            pOut[o] = pd[s] + dx * h;
            pOut[o + 1] = pd[s + 1] + dy * h;
            pOut[o + 2] = pd[s + 2] + dz * h;
            const no = (base + c) * 3;
            normal[no] = wx;
            normal[no + 1] = wy;
            normal[no + 2] = wz;
            uv[(base + c) * 2] = far ? u1 : u0;
            uv[(base + c) * 2 + 1] = top ? 1 : 0;
          }
        }
      }
      const plan = capPlans[li];
      if (plan !== undefined) {
        // Cap normals come from the caps' OWN Newell normals, not from
        // the direction. Two things need that: a footprint lying in a
        // tilted plane extruded straight up has caps facing the tilt,
        // not the direction; and a per-point `distance` makes the top a
        // SLOPED plane, which is the whole reason the param is
        // field-capable — stamping `dir` there would light a ramped roof
        // as if it were flat. `wind * hsign` turns each outward.
        const face = L.wind * L.hsign;
        let bx = -L.nx;
        let by = -L.ny;
        let bz = -L.nz;
        let bl = bx * bx + by * by + bz * bz;
        if (bl > 0) {
          const inv = face / Math.sqrt(bl);
          bx *= inv;
          by *= inv;
          bz *= inv;
        } else {
          bx = -dx * L.hsign;
          by = -dy * L.hsign;
          bz = -dz * L.hsign;
        }
        // The top ring's own Newell normal, over the DISPLACED points.
        let tx = 0;
        let ty = 0;
        let tz = 0;
        if (wantTop) {
          for (let j = 0; j < m; j++) {
            const a = pts[j] * ps;
            const b = pts[(j + 1) % m] * ps;
            const ha = readComp(distCol, pts[j], 0);
            const hb = readComp(distCol, pts[(j + 1) % m], 0);
            const ax = pd[a] + dx * ha;
            const ay = pd[a + 1] + dy * ha;
            const az = pd[a + 2] + dz * ha;
            const bx2 = pd[b] + dx * hb;
            const by2 = pd[b + 1] + dy * hb;
            const bz2 = pd[b + 2] + dz * hb;
            tx += (ay - by2) * (az + bz2);
            ty += (az - bz2) * (ax + bx2);
            tz += (ax - bx2) * (ay + by2);
          }
          const tl = tx * tx + ty * ty + tz * tz;
          if (tl > 0) {
            const inv = face / Math.sqrt(tl);
            tx *= inv;
            ty *= inv;
            tz *= inv;
          } else {
            tx = dx * L.hsign;
            ty = dy * L.hsign;
            tz = dz * L.hsign;
          }
        }
        let min1 = Infinity;
        let max1 = -Infinity;
        let min2 = Infinity;
        let max2 = -Infinity;
        for (let j = 0; j < m; j++) {
          const a = pts[j] * ps;
          const s1 = pd[a] * c1[0] + pd[a + 1] * c1[1] + pd[a + 2] * c1[2];
          const s2 = pd[a] * c2[0] + pd[a + 1] * c2[1] + pd[a + 2] * c2[2];
          if (s1 < min1) min1 = s1;
          if (s1 > max1) max1 = s1;
          if (s2 < min2) min2 = s2;
          if (s2 > max2) max2 = s2;
        }
        const inv1 = max1 > min1 ? 1 / (max1 - min1) : 0;
        const inv2 = max2 > min2 ? 1 / (max2 - min2) : 0;
        // Every loop of the polygon takes the OUTLINE's cap normals and uv
        // box: a hole is a gap in one flat cap, not a cap of its own.
        for (const k of plan.loops) {
          const K = layouts[k];
          const kPts = K.table.points;
          for (let j = 0; j < K.corners; j++) {
            const i0 = kPts[j];
            const a = i0 * ps;
            const s1 = (pd[a] * c1[0] + pd[a + 1] * c1[1] + pd[a + 2] * c1[2] - min1) * inv1;
            const s2 = (pd[a] * c2[0] + pd[a + 1] * c2[1] + pd[a + 2] * c2[2] - min2) * inv2;
            if (wantBottom) {
              const o = (K.bottomBase + j) * pStride;
              pOut[o] = pd[a];
              pOut[o + 1] = pd[a + 1];
              pOut[o + 2] = pd[a + 2];
              const no = (K.bottomBase + j) * 3;
              normal[no] = bx;
              normal[no + 1] = by;
              normal[no + 2] = bz;
              uv[(K.bottomBase + j) * 2] = s1;
              uv[(K.bottomBase + j) * 2 + 1] = s2;
            }
            if (wantTop) {
              const h = readComp(distCol, i0, 0);
              const o = (K.topBase + j) * pStride;
              pOut[o] = pd[a] + dx * h;
              pOut[o + 1] = pd[a + 1] + dy * h;
              pOut[o + 2] = pd[a + 2] + dz * h;
              const no = (K.topBase + j) * 3;
              normal[no] = tx;
              normal[no + 1] = ty;
              normal[no + 2] = tz;
              uv[(K.topBase + j) * 2] = s1;
              uv[(K.topBase + j) * 2 + 1] = s2;
            }
          }
        }
      }
      done += m;
    }

    // Allocated for this output in the layout pass above and written only
    // there; nothing keeps them, so the output adopts them, not a copy.
    adoptTopology(out, v2p, primStart, primCount);
    out.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
    carryPrimitiveAttributes(
      src.attrs.primitive,
      out.attrs.primitive,
      primSrc,
      "extrudePolygon",
      "primitive",
    );
    copyElements(src.attrs.detail, out.attrs.detail, undefined, src.attrs.detail.count);
    return { out: [makeGeometryItem(out)] };
  },
});

/**
 * The corner angle of triangle (a, b, c) at `a`, in radians: the weight a
 * corner lends its face's normal. Angle weighting, not area weighting, so
 * a wall band split into two triangles counts once at each of its corners
 * whichever way its diagonal runs, and a long band does not outvote a
 * short one around a curve.
 */
function cornerAngle(pd: ArrayLike<number>, a: number, b: number, c: number): number {
  const ux = pd[b] - pd[a];
  const uy = pd[b + 1] - pd[a + 1];
  const uz = pd[b + 2] - pd[a + 2];
  const vx = pd[c] - pd[a];
  const vy = pd[c + 1] - pd[a + 1];
  const vz = pd[c + 2] - pd[a + 2];
  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;
  return Math.atan2(Math.sqrt(cx * cx + cy * cy + cz * cz), ux * vx + uy * vy + uz * vz);
}

/** Root of `p` in a union-find whose roots are always the smallest index. */
function findRoot(parent: Int32Array, p: number): number {
  let r = p;
  while (parent[r] !== r) r = parent[r];
  // Path compression: every node on the way now points at the root.
  while (parent[p] !== r) {
    const next = parent[p];
    parent[p] = r;
    p = next;
  }
  return r;
}

/**
 * Group the points that lie within `weld` of each other: a root per point,
 * the SMALLEST index of its group, so the grouping is a function of the
 * positions and the point order alone — never of hash order or of which
 * pair happened to be found first. Groups close transitively (a chain of
 * points each within `weld` of the next is one group), which a union-find
 * gives whatever order the pairs arrive in. A non-finite position is its
 * own group.
 */
function weldRoots(
  pd: ArrayLike<number>,
  ps: number,
  n: number,
  weld: number,
  checkCancelled: () => void,
): Int32Array {
  const parent = new Int32Array(n);
  for (let p = 0; p < n; p++) parent[p] = p;
  if (!(weld > 0) || n < 2) return parent;
  // Cells four weld distances wide: a point within `weld` of another lies
  // in its own cell or, only when it is that close to a border, in the one
  // across it — so a lookup visits one cell per axis almost always and two
  // at most, where cells one weld wide would need all 27 around it.
  const inv = 1 / (4 * weld);
  const limit = weld * weld;
  // The search reaches a hair past `weld`, so rounding in `x ± reach` can
  // never drop a pair the distance test below would keep.
  const reach = weld * (1 + 1e-6);
  let size = 1;
  while (size < 2 * n) size *= 2;
  const mask = size - 1;
  const head = new Int32Array(size).fill(-1);
  const next = new Int32Array(n).fill(-1);
  const cell = new Float64Array(n * 3);
  const finite = new Uint8Array(n);
  // Integer-valued cell coordinates, compared exactly; the hash only picks
  // the bucket, so a wrapped `| 0` there costs a collision, never a wrong
  // answer.
  const bucketOf = (cx: number, cy: number, cz: number): number =>
    ((Math.imul(cx | 0, 0x8da6b343) ^ Math.imul(cy | 0, 0xd8163841) ^ Math.imul(cz | 0, 0xcb1ab31f)) >>> 0) &
    mask;
  for (let p = 0; p < n; p++) {
    const o = p * ps;
    const x = pd[o];
    const y = pd[o + 1];
    const z = pd[o + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    finite[p] = 1;
    const cx = Math.floor(x * inv);
    const cy = Math.floor(y * inv);
    const cz = Math.floor(z * inv);
    cell[p * 3] = cx;
    cell[p * 3 + 1] = cy;
    cell[p * 3 + 2] = cz;
    const b = bucketOf(cx, cy, cz);
    next[p] = head[b];
    head[b] = p;
  }
  for (let p = 0; p < n; p++) {
    if ((p & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
    if (finite[p] === 0) continue;
    const o = p * ps;
    const x = pd[o];
    const y = pd[o + 1];
    const z = pd[o + 2];
    const x0 = Math.floor((x - reach) * inv);
    const x1 = Math.floor((x + reach) * inv);
    const y0 = Math.floor((y - reach) * inv);
    const y1 = Math.floor((y + reach) * inv);
    const z0 = Math.floor((z - reach) * inv);
    const z1 = Math.floor((z + reach) * inv);
    for (let qx = x0; qx <= x1; qx++) {
      for (let qy = y0; qy <= y1; qy++) {
        for (let qz = z0; qz <= z1; qz++) {
          for (let q = head[bucketOf(qx, qy, qz)]; q >= 0; q = next[q]) {
            // Each unordered pair once, from its larger index.
            if (q >= p) continue;
            if (cell[q * 3] !== qx || cell[q * 3 + 1] !== qy || cell[q * 3 + 2] !== qz) continue;
            const oq = q * ps;
            const ex = pd[oq] - x;
            const ey = pd[oq + 1] - y;
            const ez = pd[oq + 2] - z;
            if (ex * ex + ey * ey + ez * ez > limit) continue;
            const rp = findRoot(parent, p);
            const rq = findRoot(parent, q);
            if (rp < rq) parent[rq] = rp;
            else if (rq < rp) parent[rp] = rq;
          }
        }
      }
    }
  }
  for (let p = 0; p < n; p++) parent[p] = findRoot(parent, p);
  return parent;
}

/**
 * Rewrite a mesh's point `normal` so a faceted curve shades round and an
 * edge shades sharp, by a crease angle, without touching its topology.
 */
export const smoothNormals = standardNode<
  SmoothNormalsParams,
  SmoothNormalsInputs,
  SmoothNormalsOutputs
>({
  type: "smoothNormals",
  category: "surface",
  description:
    "Rewrites the point `normal` (f32 tuple 3) of a triangle mesh so a faceted curve shades as the surface it approximates while a real edge stays sharp. Each point's normal becomes the angle-weighted average of the faces around its POSITION whose normals lie within `angle` degrees of the point's own faces: a cylinder of 16 flat walls (22.5 degrees apart) shades round, a box (90 degrees) keeps every edge, a cap meeting its wall stays a crease. This is what extrudePolygon's output needs to read as a round tank rather than a barrel of planks — extrudePolygon gives every wall band its own four points and one flat normal, on purpose, so its creases are exact, and it cannot know which of them were meant. TOPOLOGY IS UNTOUCHED: no point is merged, split, moved or reordered, and every attribute but `normal` passes through as it came, so connected components, counts, uv seams and anything keyed by point index are exactly the input's. Points are matched by POSITION, not by index — points within `weldDistance` of each other (closing transitively) are one position — which is what lets separately-pointed bands, and separate pieces that meet edge to edge (the staves of a round wall), shade as one surface. The faces around a position are read from the whole input, so two pieces that merely touch at a shared corner at a shallow angle shade together too: run the node on the rounded part alone, before it is merged with its neighbours, when that is not wanted. A point's own faces are the reference, so a point whose faces already disagree (a shared-point mesh folded across a crease) gets the one normal that reference gives rather than being split. A point whose own faces cancel or have no area (a double-sided sheet sharing its points, a sliver) keeps the normal it came with, or [0, 0, 0] when the input had none. Reads the 'poly' primitives of 3 or more vertices, fanned from their first vertex exactly as toBufferGeometry draws them, and ignores every other primitive; an input with none is refused by name. Deterministic: positions are grouped by a union-find rooted at the smallest point index, and every sum runs in point and corner order.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    angle: {
      type: "f32",
      default: 35,
      min: 0,
      max: 180,
      description:
        "The crease angle, in DEGREES: faces whose normals differ by this much or less shade as one smooth surface, faces that differ by more keep the edge between them. 30-40 is the usual range — the default 35 smooths any circle of 11 or more segments (under 33 degrees apart) while a decagon's 36-degree edges, an octagon's 45 and every right angle stay sharp. 0 reproduces flat shading (a point takes only faces parallel to its own); 180 smooths everything that meets at a position.",
    },
    weldDistance: {
      type: "f32",
      default: 0.0001,
      min: 0,
      description:
        "How close two points must be, in world units, to count as one position when faces are gathered around it. Points are NOT merged: this only decides whose faces a point may average with. Keep it well under the mesh's point spacing: the pairs inside one neighbourhood are compared each against each, so a distance that gathers thousands of points into one position is slow as well as wrong. The default (a tenth of a millimetre, in metres) absorbs the float rounding between separately computed copies of one corner while staying far below any real feature. 0 matches a point to itself alone, so only faces that already SHARE a point smooth together.",
    },
  },
  execute({ inputs, params, checkCancelled }) {
    const angle = params.angle;
    if (!Number.isFinite(angle) || angle < 0 || angle > 180) {
      throw new Error(
        `smoothNormals: param "angle" must be a number of degrees from 0 to 180 (35 is the usual crease); got ${angle}`,
      );
    }
    const weld = params.weldDistance;
    if (!Number.isFinite(weld) || weld < 0) {
      throw new Error(
        `smoothNormals: param "weldDistance" must be a finite distance of 0 or more (0 matches a point to itself alone); got ${weld}`,
      );
    }
    const src = requireGeometry(inputs, "in", "smoothNormals");
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: "smoothNormals",
      param: "normal",
      name: "normal",
      type: "f32",
      tupleSize: 3,
      domain: "point",
      suggestion: "inNormal",
    });
    const P = src.attrs.point.get("P");
    if (!P || P.type !== "f32" || P.tupleSize < 3) {
      throw new Error('smoothNormals: input "in" needs a point attribute "P" (f32, tupleSize >= 3)');
    }
    const pd = P.data;
    const ps = P.tupleSize;
    const n = src.pointCount;
    const v2p = src.vertexToPoint;
    const starts = src.primVertexStart;
    const counts = src.primVertexCount;
    const primType = src.attrs.primitive.get(PRIMTYPE_ATTR);

    // Which primitives are faces: decided once per primitive.
    const isFace = new Uint8Array(src.primitiveCount);
    let nTris = 0;
    for (let p = 0; p < src.primitiveCount; p++) {
      if (counts[p] < 3) continue;
      if (primType !== undefined && primType.getString(p) !== "poly") continue;
      isFace[p] = 1;
      nTris += counts[p] - 2;
    }
    if (nTris === 0) {
      throw new Error(
        "smoothNormals: input \"in\" has no 'poly' primitive of 3 or more vertices, so there is no surface to shade — " +
          "connect a mesh (extrudePolygon, sweepProfile, meshPrimitive, meshFromField), not a point cloud or a path",
      );
    }

    // Each triangle's corners, unit face normal, and corner weights.
    const corner = new Uint32Array(nTris * 3);
    const faceN = new Float64Array(nTris * 3);
    const weight = new Float64Array(nTris * 3);
    {
      let t = 0;
      for (let p = 0; p < src.primitiveCount; p++) {
        if (isFace[p] === 0) continue;
        const s = starts[p];
        const a = v2p[s];
        for (let k = 1; k + 1 < counts[p]; k++, t++) {
          const b = v2p[s + k];
          const c = v2p[s + k + 1];
          corner[t * 3] = a;
          corner[t * 3 + 1] = b;
          corner[t * 3 + 2] = c;
          const oa = a * ps;
          const ob = b * ps;
          const oc = c * ps;
          const ux = pd[ob] - pd[oa];
          const uy = pd[ob + 1] - pd[oa + 1];
          const uz = pd[ob + 2] - pd[oa + 2];
          const vx = pd[oc] - pd[oa];
          const vy = pd[oc + 1] - pd[oa + 1];
          const vz = pd[oc + 2] - pd[oa + 2];
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
          // No area, no direction: it lends nothing (its weights stay 0).
          if (!(len > 0) || !Number.isFinite(len)) continue;
          faceN[t * 3] = nx / len;
          faceN[t * 3 + 1] = ny / len;
          faceN[t * 3 + 2] = nz / len;
          weight[t * 3] = cornerAngle(pd, oa, ob, oc);
          weight[t * 3 + 1] = cornerAngle(pd, ob, oc, oa);
          weight[t * 3 + 2] = cornerAngle(pd, oc, oa, ob);
        }
      }
    }

    // Point -> the corners on it, as CSR, in ascending corner order.
    const incStart = new Uint32Array(n + 1);
    for (let i = 0; i < corner.length; i++) incStart[corner[i] + 1]++;
    for (let p = 0; p < n; p++) incStart[p + 1] += incStart[p];
    const inc = new Uint32Array(corner.length);
    {
      const fill = incStart.slice(0, n);
      for (let i = 0; i < corner.length; i++) inc[fill[corner[i]]++] = i;
    }

    // Each point's OWN direction — its own faces, angle-weighted — which is
    // what the crease angle is measured from.
    const own = new Float64Array(n * 3);
    for (let p = 0; p < n; p++) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (let k = incStart[p]; k < incStart[p + 1]; k++) {
        const i = inc[k];
        const w = weight[i];
        const t = (i / 3) | 0;
        x += w * faceN[t * 3];
        y += w * faceN[t * 3 + 1];
        z += w * faceN[t * 3 + 2];
      }
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        own[p * 3] = x / len;
        own[p * 3 + 1] = y / len;
        own[p * 3 + 2] = z / len;
      }
    }

    // Positions: each point's group, as CSR by root, members ascending.
    const root = weldRoots(pd, ps, n, weld, checkCancelled);
    const memStart = new Uint32Array(n + 1);
    for (let p = 0; p < n; p++) memStart[root[p] + 1]++;
    for (let p = 0; p < n; p++) memStart[p + 1] += memStart[p];
    const members = new Uint32Array(n);
    {
      const fill = memStart.slice(0, n);
      for (let p = 0; p < n; p++) members[fill[root[p]]++] = p;
    }

    // A face joins when its normal is within `angle` of the point's own
    // direction. The tolerance keeps exactly parallel faces in at angle 0,
    // where rounding would otherwise drop the point's own face.
    const cosLimit = angle >= 180 ? -2 : Math.cos((angle * Math.PI) / 180) - 1e-9;
    const prev = src.attrs.point.get("normal");
    const prevData = prev !== undefined && prev.type === "f32" && prev.tupleSize === 3 ? prev.data : undefined;
    const out = deriveGeometry(src);
    const normal = out.attrs.point.replace("normal", "f32", 3, [0, 0, 0]).writable();
    for (let p = 0; p < n; p++) {
      if ((p & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const ox = own[p * 3];
      const oy = own[p * 3 + 1];
      const oz = own[p * 3 + 2];
      if (ox === 0 && oy === 0 && oz === 0) {
        // On no face with area: keep what it came with.
        if (prevData !== undefined) {
          normal[p * 3] = prevData[p * 3];
          normal[p * 3 + 1] = prevData[p * 3 + 1];
          normal[p * 3 + 2] = prevData[p * 3 + 2];
        }
        continue;
      }
      let x = 0;
      let y = 0;
      let z = 0;
      const r = root[p];
      for (let m = memStart[r]; m < memStart[r + 1]; m++) {
        const q = members[m];
        for (let k = incStart[q]; k < incStart[q + 1]; k++) {
          const i = inc[k];
          const w = weight[i];
          if (w === 0) continue;
          const t = (i / 3) | 0;
          const fx = faceN[t * 3];
          const fy = faceN[t * 3 + 1];
          const fz = faceN[t * 3 + 2];
          if (fx * ox + fy * oy + fz * oz < cosLimit) continue;
          x += w * fx;
          y += w * fy;
          z += w * fz;
        }
      }
      const len = Math.sqrt(x * x + y * y + z * z);
      const inv = len > 0 ? 1 / len : 0;
      normal[p * 3] = len > 0 ? x * inv : ox;
      normal[p * 3 + 1] = len > 0 ? y * inv : oy;
      normal[p * 3 + 2] = len > 0 ? z * inv : oz;
    }
    return { out: [makeGeometryItem(out)] };
  },
});

/** One `from` path and the `to` path it is bridged to. */
interface BridgePair {
  readonly a: PolylineArcTable;
  readonly b: PolylineArcTable;
  /** Distinct points per side: a closed path's closing repeat is not one. */
  readonly n: number;
  /** Quads: `n` when closed (the last wraps to the first), `n - 1` when open. */
  readonly quads: number;
  /** First output point of this pair's `from` side; its `to` side is `toBase`. */
  readonly fromBase: number;
  readonly toBase: number;
}

/** A pair key, read by value: a whole number or a string. */
function bridgeKeys(
  geo: Geometry,
  pin: "from" | "to",
  name: string,
  tables: readonly PolylineArcTable[],
): (number | string)[] {
  const attr = requireAttributeOn(geo, "primitive", name, {
    prefix: "bridgePaths: ",
    param: "pairAttr",
    pin,
    on: `the geometry on pin "${pin}"`,
    reader: 'param "pairAttr"',
    otherDomain: "promote",
    suffix: ' Both inputs must carry it; leave "pairAttr" empty to pair the paths in primitive order.',
  });
  if (attr.tupleSize !== 1) {
    throw new Error(
      `bridgePaths: param "pairAttr" names primitive attribute "${name}" on pin "${pin}" with tuple size ${attr.tupleSize}; a pair key must be scalar — a whole-number id (setAttribute type 'i32', domain 'primitive') or a string name`,
    );
  }
  const isString = attr.type === "string";
  return tables.map((table) => {
    if (isString) return attr.getString(table.prim);
    const value = attr.data[table.prim];
    if (!Number.isInteger(value)) {
      throw new Error(
        `bridgePaths: primitive ${table.prim} on pin "${pin}" has ${name} = ${value}, which is not a whole number; a pair key is an IDENTITY — it says which "to" path a "from" path is bridged to — and a fractional value cannot be trusted to equal itself. Write a whole-number id with setAttribute (type 'i32', domain 'primitive'), or name the pairs with a string attribute`,
      );
    }
    return value;
  });
}

/** Strips of quads between two paths, point i to point i. */
export const bridgePaths = standardNode<BridgePathsParams, BridgePathsInputs, BridgePathsOutputs>({
  type: "bridgePaths",
  category: "surface",
  description:
    "Joins each polyline on `from` to one polyline on `to` with a strip of quads, point i to point i: segment i of the one path, segment i of the other and the two rungs between their ends make one quad, emitted as two 3-vertex 'poly' triangles (the mesh convention every consumer here reads — surfaceSample, the uv and raycast transfers). This is the band between two lines: a road shoulder between a kerb line and its pathShift offset, a ribbon between two rails, an annulus between two concentric rings, one band of a loft between two sections. PAIRING: with `pairAttr` empty the i-th polyline of `from` pairs with the i-th of `to`, in primitive order, and different path COUNTS are refused naming both; with `pairAttr` set, the path on each side carrying the same key is the pair. A pair's two paths must have the SAME number of points (refused naming both counts and both primitives — resample both with pathResample mode 'count' to one count) and must both be open or both closed: two closed paths wrap, so the last quad joins the last points back to the first and the band is a ring with no seam in its geometry. THE PATHS ARE NOT RESAMPLED OR MATCHED: point i meets point i whatever their spacing, so two paths sampled by the same count along similar lengths give an even band, and an offset path that folded back on itself gives a folded band. OUTPUT: every `from` point of every pair, then every `to` point, each carrying its own input's point attributes (a name both sides carry must agree on type and tuple size, and fills with its default where one side lacks it); a `normal` (f32 tuple 3) the node writes — shared by the two points of a rung, the normalized sum of the unit normals of the (at most two) quads meeting at that rung, so a band that bends shades round; a rung whose quads have no area or cancel borrows the nearest earlier rung that has one, or the first — and a `uv` (f32 tuple 2): `u` is each side's own normalized arc length, `v` is 0 on `from` and 1 on `to`. On a closed pair `u` returns to 0 across the closing quad, as it does on sweepProfile's closed tubes. Every triangle carries the primitive attributes of its `from` path; `to`'s primitive attributes and detail are dropped. FACING: with `from` on the right of the direction of travel and `to` on its left (seen from above), the band faces UP — the triangles wind so that (along `from`) x (from -> to) is the face normal — and `flip` turns it over. Single-sided like any mesh: flip it, or bridge the pair twice, for a band seen from both sides. `normal` and `uv` are reporting slots — an input already carrying either at a different shape is refused by name. Deterministic: pairs come out in `from` primitive order, quads in path order.",
  inputs: [
    { name: "from", kind: "geometry" },
    { name: "to", kind: "geometry" },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    pairAttr: {
      type: "string",
      default: "",
      description:
        "Name of a scalar PRIMITIVE attribute, on BOTH inputs, that says which `to` path each `from` path is bridged to: the paths carrying the same key are a pair. A key is a whole number (setAttribute type 'i32' on the primitive domain) or a string compared by value — the rules pointsToPath's `groupAttr` sets. Every key must appear exactly once on each side; a key repeated on one side, or present on only one, is refused by name. Pairs still come out in `from` primitive order. Empty (the default) pairs the i-th polyline of `from` with the i-th of `to` — right whenever both sides came from the same paths through nodes that keep primitive order (pathShift, pathResample, transformPoints), and the reason this is optional.",
    },
    flip: {
      type: "bool",
      default: false,
      description:
        "Turn the band over: reverse every triangle's winding and negate the written `normal`, so the band faces the other way. The default faces (along `from`) x (from -> to): with `from` on the right of the direction of travel and `to` on its left, a flat band faces up.",
    },
  },
  execute({ inputs, params, checkCancelled }) {
    const flip = params.flip;
    const fromGeo = requireGeometry(inputs, "from", "bridgePaths");
    const toGeo = requireGeometry(inputs, "to", "bridgePaths");
    for (const [geo, pin] of [
      [fromGeo, "from"],
      [toGeo, "to"],
    ] as const) {
      requireReportSlot({
        attrs: geo.attrs.point,
        nodeType: "bridgePaths",
        param: "normal",
        name: "normal",
        type: "f32",
        tupleSize: 3,
        domain: "point",
        suggestion: `${pin}Normal`,
      });
      requireReportSlot({
        attrs: geo.attrs.point,
        nodeType: "bridgePaths",
        param: "uv",
        name: "uv",
        type: "f32",
        tupleSize: 2,
        domain: "point",
        suggestion: `${pin}Uv`,
      });
    }
    // An empty geometry on both pins (a partitioned cook's empty cell)
    // bridges to an empty mesh; one with points and no path is refused.
    const fromTables = polylineArcTables(fromGeo, "bridgePaths", "emptyInput");
    const toTables = polylineArcTables(toGeo, "bridgePaths", "emptyInput");

    // The pairs, in `from` primitive order.
    const matched: [PolylineArcTable, PolylineArcTable][] = [];
    const pairAttr = params.pairAttr;
    if (pairAttr === "") {
      if (fromTables.length !== toTables.length) {
        throw new Error(
          `bridgePaths: pin "from" carries ${fromTables.length} polyline(s) and pin "to" carries ${toTables.length}; paired in primitive order, every "from" path needs one "to" path. Feed both pins paths made from the same source (pathShift and pathResample keep primitive order), or set "pairAttr" to a primitive attribute both sides carry to pair them by key.`,
        );
      }
      for (let i = 0; i < fromTables.length; i++) matched.push([fromTables[i], toTables[i]]);
    } else {
      // A side with no path has no key to read (an empty cell carries no
      // attributes at all); its partner's keys then go unmatched below.
      const fromKeys = fromTables.length > 0 ? bridgeKeys(fromGeo, "from", pairAttr, fromTables) : [];
      const toKeys = toTables.length > 0 ? bridgeKeys(toGeo, "to", pairAttr, toTables) : [];
      const toByKey = new Map<number | string, number>();
      for (let j = 0; j < toTables.length; j++) {
        const seen = toByKey.get(toKeys[j]);
        if (seen !== undefined) {
          throw new Error(
            `bridgePaths: primitives ${toTables[seen].prim} and ${toTables[j].prim} on pin "to" both carry ${pairAttr} = ${JSON.stringify(toKeys[j])}; a key names ONE path on each side, so each "from" path has exactly one partner`,
          );
        }
        toByKey.set(toKeys[j], j);
      }
      const fromSeen = new Map<number | string, number>();
      for (let i = 0; i < fromTables.length; i++) {
        const key = fromKeys[i];
        const twin = fromSeen.get(key);
        if (twin !== undefined) {
          throw new Error(
            `bridgePaths: primitives ${fromTables[twin].prim} and ${fromTables[i].prim} on pin "from" both carry ${pairAttr} = ${JSON.stringify(key)}; a key names ONE path on each side, so each "from" path has exactly one partner`,
          );
        }
        fromSeen.set(key, i);
        const j = toByKey.get(key);
        if (j === undefined) {
          throw new Error(
            `bridgePaths: primitive ${fromTables[i].prim} on pin "from" carries ${pairAttr} = ${JSON.stringify(key)}, and no polyline on pin "to" does; every key needs a path on both sides`,
          );
        }
        matched.push([fromTables[i], toTables[j]]);
      }
      for (let j = 0; j < toTables.length; j++) {
        if (!fromSeen.has(toKeys[j])) {
          throw new Error(
            `bridgePaths: primitive ${toTables[j].prim} on pin "to" carries ${pairAttr} = ${JSON.stringify(toKeys[j])}, and no polyline on pin "from" does; every key needs a path on both sides`,
          );
        }
      }
    }

    // Layout: every pair's `from` points first, then every pair's `to`
    // points, so each side's attributes arrive as one contiguous block.
    let totalFrom = 0;
    let nTris = 0;
    const shapes: { n: number; quads: number; fromBase: number }[] = [];
    for (const [a, b] of matched) {
      if (a.closed !== b.closed) {
        const [c, o] = a.closed ? ["from", "to"] : ["to", "from"];
        throw new Error(
          `bridgePaths: primitive ${a.prim} on pin "from" and primitive ${b.prim} on pin "to" are a pair, but the one on "${c}" is CLOSED and the one on "${o}" is OPEN; a band between them has no consistent end. Close both (pointsToPath \`closed: true\`) for a ring, or open both.`,
        );
      }
      const na = a.points.length - (a.closed ? 1 : 0);
      const nb = b.points.length - (b.closed ? 1 : 0);
      if (na !== nb) {
        throw new Error(
          `bridgePaths: primitive ${a.prim} on pin "from" has ${na} point(s) and its pair, primitive ${b.prim} on pin "to", has ${nb}; a bridge joins point i to point i, so both sides need the same count. Resample both to one count first (pathResample mode "count" with the same "count" on each side).`,
        );
      }
      if (a.closed && na < 3) {
        throw new Error(
          `bridgePaths: primitives ${a.prim} ("from") and ${b.prim} ("to") are closed over only ${na} distinct point(s); a closed band needs at least 3`,
        );
      }
      const quads = a.closed ? na : na - 1;
      shapes.push({ n: na, quads, fromBase: totalFrom });
      totalFrom += na;
      nTris += quads * 2;
    }
    const pairs: BridgePair[] = matched.map(([a, b], k) => ({
      a,
      b,
      n: shapes[k].n,
      quads: shapes[k].quads,
      fromBase: shapes[k].fromBase,
      toBase: totalFrom + shapes[k].fromBase,
    }));
    const nPoints = totalFrom * 2;

    const srcFrom = new Uint32Array(totalFrom);
    const srcTo = new Uint32Array(totalFrom);
    const v2p = new Uint32Array(nTris * 3);
    const primStart = new Uint32Array(nTris);
    const primCount = new Uint32Array(nTris);
    const primSrc = new Uint32Array(nTris);
    {
      let t = 0;
      for (const pr of pairs) {
        for (let i = 0; i < pr.n; i++) {
          srcFrom[pr.fromBase + i] = pr.a.points[i];
          srcTo[pr.fromBase + i] = pr.b.points[i];
        }
        for (let i = 0; i < pr.quads; i++) {
          const j = (i + 1) % pr.n;
          const a0 = pr.fromBase + i;
          const a1 = pr.fromBase + j;
          const b0 = pr.toBase + i;
          const b1 = pr.toBase + j;
          if (!flip) {
            v2p[t * 3] = a0;
            v2p[t * 3 + 1] = a1;
            v2p[t * 3 + 2] = b0;
            primSrc[t++] = pr.a.prim;
            v2p[t * 3] = a1;
            v2p[t * 3 + 1] = b1;
            v2p[t * 3 + 2] = b0;
            primSrc[t++] = pr.a.prim;
          } else {
            v2p[t * 3] = a0;
            v2p[t * 3 + 1] = b0;
            v2p[t * 3 + 2] = a1;
            primSrc[t++] = pr.a.prim;
            v2p[t * 3] = a1;
            v2p[t * 3 + 1] = b0;
            v2p[t * 3 + 2] = b1;
            primSrc[t++] = pr.a.prim;
          }
        }
      }
      for (let i = 0; i < nTris; i++) {
        primStart[i] = i * 3;
        primCount[i] = 3;
      }
    }

    // Point attributes: each side gathered on its own, then laid into one
    // set as two blocks — the union of both sides' columns, a column one
    // side lacks filled with its default over that side's block.
    const sideA = new Geometry();
    copyElements(fromGeo.attrs.point, sideA.attrs.point, srcFrom, totalFrom);
    const sideB = new Geometry();
    copyElements(toGeo.attrs.point, sideB.attrs.point, srcTo, totalFrom);
    const out = new Geometry();
    const set = out.attrs.point;
    set.resize(nPoints);
    for (const attr of sideA.attrs.point) {
      set.add(attr.name, attr.type, attr.tupleSize, attr.defaultValue as AttrDefault);
    }
    for (const attr of sideB.attrs.point) {
      const have = set.get(attr.name);
      if (have === undefined) {
        set.add(attr.name, attr.type, attr.tupleSize, attr.defaultValue as AttrDefault);
      } else if (have.type !== attr.type || have.tupleSize !== attr.tupleSize) {
        throw new Error(
          `bridgePaths: point attribute "${attr.name}" is ${have.type} tuple ${have.tupleSize} on pin "from" and ${attr.type} tuple ${attr.tupleSize} on pin "to"; the output carries both sides' points in one column, so a name both carry must agree on type and tuple size. Rename one side with setAttribute, or drop it upstream with removeAttribute (domain "point", names ["${attr.name}"]).`,
        );
      }
    }
    for (const dst of set) {
      const a = sideA.attrs.point.get(dst.name);
      if (a === undefined) dst.fillDefault(0, totalFrom);
      else dst.copyFrom(a, 0, 0, totalFrom);
      const b = sideB.attrs.point.get(dst.name);
      if (b === undefined) dst.fillDefault(totalFrom, nPoints);
      else dst.copyFrom(b, 0, totalFrom, totalFrom);
    }
    const P = set.require("P");
    const pd = P.data;
    const ps = P.tupleSize;
    const normal = set.replace("normal", "f32", 3, [0, 0, 0]).writable();
    const uv = set.replace("uv", "f32", 2, [0, 0]).writable();

    // Per pair: every quad's unit normal from its two diagonals (so the
    // diagonal the triangles happen to split on does not bias it), then
    // each rung's normal as the normalized sum of the quads either side.
    let qn = new Float64Array(0);
    let good = new Uint8Array(0);
    const fs = flip ? -1 : 1;
    for (const pr of pairs) {
      checkCancelled();
      const { n, quads } = pr;
      if (qn.length < quads * 3) qn = new Float64Array(quads * 3);
      for (let i = 0; i < quads; i++) {
        const j = (i + 1) % n;
        const a0 = (pr.fromBase + i) * ps;
        const a1 = (pr.fromBase + j) * ps;
        const b0 = (pr.toBase + i) * ps;
        const b1 = (pr.toBase + j) * ps;
        const ux = pd[b1] - pd[a0];
        const uy = pd[b1 + 1] - pd[a0 + 1];
        const uz = pd[b1 + 2] - pd[a0 + 2];
        const vx = pd[b0] - pd[a1];
        const vy = pd[b0 + 1] - pd[a1 + 1];
        const vz = pd[b0 + 2] - pd[a1 + 2];
        let cx = (uy * vz - uz * vy) * fs;
        let cy = (uz * vx - ux * vz) * fs;
        let cz = (ux * vy - uy * vx) * fs;
        const cl = cx * cx + cy * cy + cz * cz;
        if (cl > 0) {
          const inv = 1 / Math.sqrt(cl);
          cx *= inv;
          cy *= inv;
          cz *= inv;
        }
        qn[i * 3] = cx;
        qn[i * 3 + 1] = cy;
        qn[i * 3 + 2] = cz;
      }
      if (good.length < n) good = new Uint8Array(n);
      let firstGood = -1;
      for (let i = 0; i < n; i++) {
        // The quads meeting at rung i: the one before it (wrapping on a
        // closed band) and the one after it.
        const before = i > 0 ? i - 1 : pr.a.closed ? quads - 1 : -1;
        const after = i < quads ? i : -1;
        let x = 0;
        let y = 0;
        let z = 0;
        if (before >= 0) {
          x += qn[before * 3];
          y += qn[before * 3 + 1];
          z += qn[before * 3 + 2];
        }
        if (after >= 0) {
          x += qn[after * 3];
          y += qn[after * 3 + 1];
          z += qn[after * 3 + 2];
        }
        const l = x * x + y * y + z * z;
        const o = (pr.fromBase + i) * 3;
        if (l > 1e-24) {
          const inv = 1 / Math.sqrt(l);
          normal[o] = x * inv;
          normal[o + 1] = y * inv;
          normal[o + 2] = z * inv;
          good[i] = 1;
          if (firstGood < 0) firstGood = i;
        } else {
          good[i] = 0;
        }
      }
      // A rung with no normal of its own borrows the nearest earlier rung
      // that has one, or — before the first — the first. A band with no
      // area anywhere keeps [0, 0, 0]: it draws nothing to shade.
      if (firstGood >= 0) {
        let last = firstGood;
        for (let i = 0; i < n; i++) {
          const o = (pr.fromBase + i) * 3;
          if (good[i] === 1) {
            last = i;
            continue;
          }
          const s = (pr.fromBase + last) * 3;
          normal[o] = normal[s];
          normal[o + 1] = normal[s + 1];
          normal[o + 2] = normal[s + 2];
        }
      }
      const invA = pr.a.length > 0 ? 1 / pr.a.length : 0;
      const invB = pr.b.length > 0 ? 1 / pr.b.length : 0;
      for (let i = 0; i < n; i++) {
        const o = (pr.fromBase + i) * 3;
        const q = (pr.toBase + i) * 3;
        normal[q] = normal[o];
        normal[q + 1] = normal[o + 1];
        normal[q + 2] = normal[o + 2];
        uv[(pr.fromBase + i) * 2] = pr.a.cum[i] * invA;
        uv[(pr.fromBase + i) * 2 + 1] = 0;
        uv[(pr.toBase + i) * 2] = pr.b.cum[i] * invB;
        uv[(pr.toBase + i) * 2 + 1] = 1;
      }
    }

    // Allocated for this output above and written only there; nothing
    // keeps them, so the output adopts them, not a copy.
    adoptTopology(out, v2p, primStart, primCount);
    out.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
    carryPrimitiveAttributes(
      fromGeo.attrs.primitive,
      out.attrs.primitive,
      primSrc,
      "bridgePaths",
      "primitive",
    );
    copyElements(fromGeo.attrs.detail, out.attrs.detail, undefined, fromGeo.attrs.detail.count);
    return { out: [makeGeometryItem(out)] };
  },
});
