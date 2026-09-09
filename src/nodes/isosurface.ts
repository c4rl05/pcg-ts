/**
 * Field to SURFACE: the node that turns a scalar field into geometry.
 *
 * Other nodes make geometry with no input — `meshPrimitive` builds a box
 * from parameters, `pointGrid` a lattice — but their SHAPE is written
 * into the node. This is the only one whose shape and topology come out
 * of an expression: it walks a lattice, asks the field for a value at
 * every corner, and emits the surface where that value crosses a
 * threshold. A cave, a blob, a cliff, an eroded rock: the shapes that are
 * easy to describe as "where is this quantity zero" and hard to describe
 * any other way.
 *
 * TETRAHEDRA, NOT CUBES, AND THAT IS THE INTERESTING CHOICE. Marching
 * cubes classifies a cube's 8 corners into one of 256 cases and looks the
 * triangles up in a table — and several of those cases are genuinely
 * AMBIGUOUS (a face with two diagonal corners inside can be joined either
 * way), so the table encodes a convention that neighbouring cubes must
 * share or the mesh cracks. This splits each cube into 6 tetrahedra
 * instead. A tetrahedron has 4 corners, 16 cases, and NO ambiguity: one
 * corner apart from the other three gives a triangle, two-and-two gives a
 * quad, and there is nothing to choose. The result is watertight by
 * construction rather than by a table being right.
 *
 * The decomposition is the Freudenthal one — six tetrahedra all sharing
 * the cube's main diagonal — and it is chosen because it is
 * TRANSLATION-INVARIANT. Two cubes meeting at a face each split that face
 * into two triangles, and they must pick the same diagonal or the surface
 * has a slit. Every cube here uses the same local pattern, so the shared
 * face is cut the same way from both sides; the three axes are checked in
 * `isosurface.test.ts` rather than asserted here.
 *
 * WHY IT CAN BE PARTITIONED. A tetrahedron's triangles depend on 4 corner
 * samples and nothing else, so this is a zero-hop op — but that alone is
 * not enough, and `PLAN.md` records five preconditions rather than one.
 * Three of them are structural and hold here by construction: the lattice
 * is anchored to the WORLD and not to the bounds, so a corner has the same
 * position in every window that touches it; the triangles of a cube are
 * owned by that cube's integer index, so a half-open rule over cube
 * indices tiles them; and nothing is welded across a cube boundary,
 * because nothing is welded at all — every triangle carries its own three
 * points, so no window ever needs to know a number another window chose.
 *
 * The fourth is the caller's and this node ENFORCES it: the field must be
 * a pure function of position. `fraction` and `index` are not — they
 * measure the population present in this cook — so a lattice built in a
 * window would sample a different field from the same lattice built
 * whole. They are refused by name, along with `attribute`, which can only
 * read the bookkeeping columns of a cloud this node manufactured.
 *
 * The fifth cannot be enforced from here and is stated instead: the CPU
 * and the GPU agree on a field's value within a published tolerance, and
 * a corner classification is a COMPARE, which tolerance does not bound.
 * Two windows that resolved the same corner on different paths can
 * therefore disagree about its sign and crack the seam. Resolve this
 * node's field on ONE path for a given world.
 */
import { Geometry, PRIMTYPE_ATTR, type PrimType } from "../data/index.js";
import { createPointCloud } from "../data/index.js";
import { type FieldSpec, paramSpecOf, peekFieldSpec, specChildEntries } from "../fields/spec.js";
import { resolveField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import { standardNode } from "./registry.js";
import { optionalGeometry, requireScalarColumn, resolveOn, type FieldParam } from "./util.js";

/**
 * Ceiling on the field samples one cook may take. The corner count grows
 * with the CUBE of the bounds over the cell size, so a cell size that
 * looks reasonable on a 10-unit box asks for billions on a 1000-unit one.
 *
 * BYTES ARE THE BINDING CONSTRAINT, not evaluations, which a first draft
 * of this comment had backwards. The lattice is a real point cloud so the
 * field resolves through the ordinary path, and a standard cloud carries
 * the full attribute schema — P, rot, scale, density, bounds, color, seed
 * — at about 90 bytes a corner whether or not anything reads them, plus
 * the gradient and the value column. An audit measured 164 to 324 MB of
 * resident memory for one cook at the previous cap of 2^22; this one
 * authorizes about a quarter of that.
 */
const MAX_FIELD_SAMPLES = 1_048_576;

/** Ceiling on emitted triangles, for the same reason one size up. */
const MAX_TRIANGLES = 1_048_576;

/**
 * Field fns whose value depends on the POPULATION being evaluated rather
 * than on the position, and so cannot be sampled on a lattice a window
 * chose. `attribute` is here for a different reason: this node builds its
 * own cloud, so the only columns it could read are the standard
 * bookkeeping ones, which say nothing about the shape being contoured.
 */
const IMPURE_FNS: Readonly<Record<string, string>> = {
  fraction: "it is index / (count - 1), so it measures how many samples this cook happened to take",
  index: "it is the sample's ordinal in an array this node builds, which a window numbers its own way",
  attribute:
    "there is no input geometry to read one from — this node manufactures its lattice, so the only columns present are the standard bookkeeping ones",
};

/**
 * The six tetrahedra of a cube, as corner indices `x + 2y + 4z`.
 *
 * All six share the main diagonal 0-7, which is what makes the pattern
 * translation-invariant: every cube cuts each of its faces along the same
 * world-space diagonal its neighbour does, so the surface has no slit.
 */
const TETS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 7],
  [0, 3, 2, 7],
  [0, 2, 6, 7],
  [0, 6, 4, 7],
  [0, 4, 5, 7],
  [0, 5, 1, 7],
];

/** Corner offsets in the same `x + 2y + 4z` order the tets index. */
const CORNER_DX = [0, 1, 0, 1, 0, 1, 0, 1] as const;
const CORNER_DY = [0, 0, 1, 1, 0, 0, 1, 1] as const;
const CORNER_DZ = [0, 0, 0, 0, 1, 1, 1, 1] as const;

/** Lowest lattice index whose cube can hold a point at or above `v`. */
function latticeLo(v: number, size: number): number {
  return Math.floor(v / size);
}

/**
 * Refuse a field whose value is not a function of position alone.
 *
 * Walks the spec rather than the Field, because a spec is the only form
 * that can be inspected — and a field with NO spec (one composed with the
 * code combinators) cannot be screened at all, which the node's
 * description states rather than pretends away.
 */
function requirePositionPure(spec: unknown, nodeType: string, path: string): void {
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) return;
  const node = spec as Record<string, unknown>;
  const fn = typeof node.fn === "string" ? node.fn : undefined;
  // A `param` carries its bound spec BESIDE the node rather than inside
  // it, so `specChildEntries` — which walks the node's own keys — cannot
  // see through one. Every other walk in the library that has to look
  // through a param does this (`fieldJson`'s emitter, the WGSL
  // compiler); this one did not, and a `fraction` bound to a param went
  // straight past the screen and made two windows disagree in their
  // overlap, which is the exact failure the screen exists to stop.
  if (fn === "param") {
    const bound = paramSpecOf(node as unknown as FieldSpec);
    if (bound !== undefined) {
      requirePositionPure(bound, nodeType, `${path}(param "${String(node.name)}")`);
    }
    return;
  }
  if (fn !== undefined && IMPURE_FNS[fn] !== undefined) {
    throw new Error(
      `${nodeType}: field expression at ${path} uses "${fn}", which is not a function of POSITION — ${IMPURE_FNS[fn]}. ` +
        `This node samples a lattice it builds itself, and a window of a partitioned world builds a different one, so a field that reads the population would contour a different shape in every cell. Use position(), the noises, arithmetic over them, or a param.`,
    );
  }
  for (const child of specChildEntries(node)) {
    requirePositionPure(child.value, nodeType, `${path}.${child.path}`);
  }
}

/** Params of {@link meshFromField}. */
export interface MeshFromFieldParams {
  field: FieldParam;
  isoValue: number;
  cellSize: number;
  boundsMin: readonly number[];
  boundsMax: readonly number[];
  inside: string;
}

/** Contour a scalar field into a triangle mesh. */
export const meshFromField = standardNode<MeshFromFieldParams>({
  type: "meshFromField",
  category: "source",
  description:
    "Turns a scalar FIELD into a triangle mesh: the surface where the field crosses `isoValue`. Other nodes build geometry from no input at all — meshPrimitive makes a box, pointGrid a lattice — but their SHAPE is written into the node; this is the only one whose shape and topology come out of an EXPRESSION, which is how a cave, a blob, an eroded cliff or a melted rock gets made, which is to say every shape that is easy to write as 'where is this quantity zero' and hard to model any other way. Output is 3-vertex `poly` primitives carrying P and a `normal` taken from the field's own GRADIENT, so the surface shades smoothly however coarse the lattice; there is no `uv`, deliberately, because an isosurface has no natural parameterisation and a planar one would be a lie on every vertical face — use triplanar shading, or transferAttribute with mapping 'nearest' from something that does have UVs. IT CONTOURS BY TETRAHEDRA, NOT CUBES. Marching cubes looks 8 corner signs up in a 256-entry table, several of whose cases are genuinely ambiguous — a face with two diagonal corners inside can be joined either way — so the table encodes a convention that neighbouring cubes must agree on or the mesh cracks. Splitting each cube into 6 tetrahedra removes the choice: 4 corners, no ambiguous case, watertight because there is nothing to get wrong rather than because a table is right. The cost is roughly twice the triangles for the same lattice, which is the trade being made. THE LATTICE IS ANCHORED TO THE WORLD, not to `boundsMin`. Cube (i, j, k) always spans [i * cellSize, (i+1) * cellSize) whatever bounds asked for it, so two windows that overlap sample the same corners at the same positions and agree bit for bit — the property `volumeSample` deliberately does not have, since its cell size is a request divided into the extent it was given. `cellSize` here is exact and the bounds are widened outward to whole cubes. An optional geometry input replaces the bounds params with that geometry's own point extents, which chooses the REGION and never the lattice: contour around a scatter and the cubes are still the world's cubes. PARTITIONING: a tetrahedron reads 4 corner samples and no neighbour's answer, so this is zero-hop; a cell of a partitioned world cooks the cubes its own bounds cover and the union tiles them, because a cube belongs to exactly one cell under a half-open rule on its INDEX. Nothing is welded — every triangle carries its own three points — so no cell ever depends on a number another cell chose. Two conditions are on the caller. The field must be a function of POSITION: `fraction` and `index` measure the population of this cook and `attribute` can only read the bookkeeping columns of a cloud this node manufactured, so all three are REFUSED by name (a field built with the code combinators carries no spec and cannot be screened, which makes it the author's promise instead). And the field must resolve on ONE path for a given world: CPU and GPU agree within a published tolerance, a corner classification is a COMPARE, and no tolerance bounds a comparison, so two cells that resolved the same corner differently can disagree about its sign and crack the seam.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    field: {
      type: "f32",
      default: 0,
      acceptsField: true,
      description:
        "The scalar field to contour. A plain number contours nothing — a constant never crosses anything — so this is a field param that only makes sense as a field. Any expression of position works: a noise for a cloud or a rock, `sub(length(position()), r)` for a sphere, the difference of two for a carve. IT MUST BE A FUNCTION OF POSITION AND THAT IS ENFORCED: `fraction`, `index` and `attribute` are refused by name, because the first two measure the population of this cook and the third can only reach the bookkeeping columns of the lattice this node builds. The refusal names the offending position inside the expression. A field composed with the CODE combinators carries no spec and so cannot be screened at all; that one is the author's promise, and breaking it does not throw, it makes a partitioned world disagree with itself at the seams. Resolved on the CPU over the lattice corners, once per cook.",
    },
    isoValue: {
      type: "f32",
      default: 0,
      description:
        "The value the surface sits at. Moving it grows or shrinks the solid without re-sampling anything conceptually — for a signed distance it is a plain offset, and for a noise it is a threshold, which is why an eroded rock and a cave are the same graph with two settings. The surface passes EXACTLY through this value: a vertex is placed by linear interpolation along the lattice edge that crosses it, so evaluating the field at any emitted vertex returns this number to within the interpolation's own error, which is what `isosurface.test.ts` measures.",
    },
    cellSize: {
      type: "f32",
      default: 1,
      min: 0,
      description:
        "Lattice cube edge in world units, and unlike volumeSample's it is EXACT rather than a request. The lattice is anchored at the world origin, so cube (i, j, k) spans [i * cellSize, (i+1) * cellSize) whatever bounds asked for it, and the bounds are widened outward to whole cubes rather than divided into them. That is the whole partitioning story in one sentence: two windows that overlap sample the same corners at the same world positions, so they agree bit for bit, where a lattice fitted to its own bounds would put its corners somewhere different in every window. Cost grows with the CUBE of the bounds over this value, and every sample is a field evaluation, so halving it is eight times the work.",
    },
    boundsMin: {
      type: "vec3",
      default: [-8, -8, -8],
      description:
        "Low corner of the region to contour, in world units, and IGNORED when a geometry is connected — the input's own point extents replace both bounds then. Widened outward to the enclosing whole cube, so the surface is never clipped mid-cube by a bound that fell inside one. Under a partitioned world this is the cell's own rectangle: bind it per cell, and because the lattice is world-anchored rather than bounds-anchored the cells agree about every corner they share.",
    },
    boundsMax: {
      type: "vec3",
      default: [8, 8, 8],
      description:
        "High corner of the region to contour, in world units, and IGNORED when a geometry is connected. HALF-OPEN: the last cube walked is the one ending at or before this face, so two cells whose rectangles meet on a cell-size multiple tile the surface instead of both emitting the seam. The low face is widened OUTWARD to a whole cube, so the contoured region can reach up to one cube below `boundsMin` — a solid that leaves the box is left open there rather than capped, since this node emits the surface it found and never invents a lid. Note also that the FIELD is evaluated one cube further out again on every face, because the gradient that gives the normals is a central difference and needs a corner beyond the ones it reports on. A field with a pole just outside the box therefore still refuses the cook, and moving the box is the fix.",
    },
    inside: {
      type: "enum",
      default: "below",
      enum: ["below", "above"],
      description:
        "Which side of `isoValue` is solid, which decides only two things: which way the surface faces, and hence which way the winding runs. 'below' (the default) treats field < isoValue as inside, the convention a signed distance uses — negative within the shape. 'above' is the one a density or an occupancy noise wants, where more means more material. The surface geometry is identical either way; flipping this turns it inside out rather than moving it.",
    },
  },
  execute({ inputs, params, checkCancelled, seed: nodeSeed }) {
    const inside = params.inside;
    if (inside !== "below" && inside !== "above") {
      throw new Error(`meshFromField: unknown inside "${inside}"; valid values: below, above`);
    }
    const h = params.cellSize;
    if (!(h > 0) || !Number.isFinite(h)) {
      throw new Error(
        `meshFromField: cellSize must be a finite number > 0, got ${h}; it is the lattice cube's edge in world units and an exact one, not a request`,
      );
    }
    const iso = params.isoValue;
    if (!Number.isFinite(iso)) {
      throw new Error(`meshFromField: isoValue must be finite, got ${iso}`);
    }
    // Screened before any work, and before the lattice is even sized: a
    // refusal must cost nothing.
    const field = resolveField(params.field);
    requirePositionPure(peekFieldSpec(field), "meshFromField", "field");

    let [nx0 = 0, ny0 = 0, nz0 = 0] = params.boundsMin;
    let [nx1 = 0, ny1 = 0, nz1 = 0] = params.boundsMax;
    // Optional, and it moves the REGION rather than the lattice — which
    // is the distinction this node exists to make. A connected cloud says
    // which part of the world to contour; the cubes it is contoured on
    // are where they always were. volumeSample's input does the other
    // thing, dividing the extent it was handed into cells, which is why
    // two of its windows disagree about every sample and two of these
    // agree about all of them.
    const source = optionalGeometry(inputs, "in", "meshFromField");
    if (source) {
      const P = source.attrs.point.get("P");
      if (!P || P.type !== "f32" || P.tupleSize < 3 || source.pointCount === 0) {
        throw new Error(
          'meshFromField: connected input needs points with a "P" attribute (f32, tupleSize >= 3); disconnect it to use the bounds params',
        );
      }
      nx0 = ny0 = nz0 = Infinity;
      nx1 = ny1 = nz1 = -Infinity;
      const pd = P.data;
      const ps = P.tupleSize;
      for (let i = 0; i < source.pointCount; i++) {
        const x = pd[i * ps] as number;
        const y = pd[i * ps + 1] as number;
        const z = pd[i * ps + 2] as number;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
        if (x < nx0) nx0 = x;
        if (x > nx1) nx1 = x;
        if (y < ny0) ny0 = y;
        if (y > ny1) ny1 = y;
        if (z < nz0) nz0 = z;
        if (z > nz1) nz1 = z;
      }
      if (!Number.isFinite(nx0)) {
        throw new Error("meshFromField: connected input has no finite point positions");
      }
    }
    for (const v of [nx0, ny0, nz0, nx1, ny1, nz1]) {
      if (!Number.isFinite(v)) {
        throw new Error(
          `meshFromField: boundsMin and boundsMax must be finite, got [${params.boundsMin.join(", ")}] .. [${params.boundsMax.join(", ")}]`,
        );
      }
    }
    // Widened OUTWARD to whole cubes, anchored at the world origin, and
    // HALF-OPEN on the high side — `ceil`, not `floor + 1`. The
    // difference is invisible on a box whose faces fall mid-cube and is
    // the whole story on one whose faces land on a cell boundary, which
    // is exactly what a partitioned world's rectangles do: `floor(max/h)
    // + 1` walks one cube PAST the boundary, so two abutting cells both
    // emit the seam column and the surface is doubled there. Measured at
    // 344 duplicated triangles across one seam before this read `ceil`.
    const i0 = latticeLo(nx0, h);
    const j0 = latticeLo(ny0, h);
    const k0 = latticeLo(nz0, h);
    const cubesX = Math.max(0, Math.ceil(nx1 / h) - i0);
    const cubesY = Math.max(0, Math.ceil(ny1 / h) - j0);
    const cubesZ = Math.max(0, Math.ceil(nz1 / h) - k0);

    const out = new Geometry();
    if (cubesX === 0 || cubesY === 0 || cubesZ === 0) {
      out.attrs.point.add("P", "f32", 3, 0);
      out.attrs.point.add("normal", "f32", 3, 0);
      out.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
      return { out: [makeGeometryItem(out)] };
    }

    // One corner MARGIN on every side, so a central difference exists at
    // every corner the cubes actually use. The gradient is what makes the
    // surface shade smoothly on a coarse lattice, and taking it from the
    // field rather than from the triangles keeps it independent of how
    // the lattice happened to be cut.
    const sx = cubesX + 3;
    const sy = cubesY + 3;
    const sz = cubesZ + 3;
    const samples = sx * sy * sz;
    if (samples > MAX_FIELD_SAMPLES) {
      throw new Error(
        `meshFromField: the lattice would need ${samples} field samples (max ${MAX_FIELD_SAMPLES}). The corner count grows with the CUBE of the bounds over cellSize, and every corner is a field evaluation — raise cellSize, or shrink the bounds and cook the world in cells.`,
      );
    }

    // The lattice as a real point cloud, so the field resolves through the
    // ordinary path with the ordinary context. Positions are computed
    // from GLOBAL integer indices rather than accumulated, so a corner
    // lands on the same float in every window that samples it.
    const grid = createPointCloud(samples);
    const gp = grid.attrs.point.require("P").data;
    const gseed = grid.attrs.point.require("seed").data;
    let at = 0;
    for (let k = 0; k < sz; k++) {
      // The fill and the single resolve below are the two long phases;
      // without this the first of them is uninterruptible.
      checkCancelled();
      const gk = k0 - 1 + k;
      for (let j = 0; j < sy; j++) {
        const gj = j0 - 1 + j;
        for (let i = 0; i < sx; i++) {
          const gi = i0 - 1 + i;
          gp[at * 3] = gi * h;
          gp[at * 3 + 1] = gj * h;
          gp[at * 3 + 2] = gk * h;
          // Keyed on the GLOBAL corner, so a field reading `seed` (which
          // `randomField` does through the point's identity) is anchored
          // to the world like the position is.
          gseed[at] = hashCombine(nodeSeed, gi, gj, gk);
          at++;
        }
      }
    }
    checkCancelled();
    const value = requireScalarColumn(
      resolveOn(grid, "point", params.field, nodeSeed, "meshFromField", "field"),
      "meshFromField",
      "field",
      "point",
      "a field value",
    ).data;

    const sxy = sx * sy;
    /** Local sample index of the corner at local lattice coords. */
    const idx = (i: number, j: number, k: number): number => i + j * sx + k * sxy;

    // Gradients at every corner the cubes use, by central difference over
    // the margin. Stored packed for the SAME index space as `value`, with
    // the margin ring left at zero and never read.
    const grad = new Float32Array(samples * 3);
    for (let k = 1; k < sz - 1; k++) {
      for (let j = 1; j < sy - 1; j++) {
        for (let i = 1; i < sx - 1; i++) {
          const c = idx(i, j, k);
          grad[c * 3] = (value[idx(i + 1, j, k)] - value[idx(i - 1, j, k)]) / (2 * h);
          grad[c * 3 + 1] = (value[idx(i, j + 1, k)] - value[idx(i, j - 1, k)]) / (2 * h);
          grad[c * 3 + 2] = (value[idx(i, j, k + 1)] - value[idx(i, j, k - 1)]) / (2 * h);
        }
      }
    }

    // Emitted triangles, pushed as three fresh points each. NOTHING IS
    // WELDED, which is the point rather than an omission: a shared vertex
    // is a number one cook chose, and a partitioned world has no way to
    // agree on it across a seam. The gradient normal makes the shading
    // smooth anyway, so welding would buy only the point count.
    const px: number[] = [];
    const py: number[] = [];
    const pz: number[] = [];
    const nxs: number[] = [];
    const nys: number[] = [];
    const nzs: number[] = [];
    let triangles = 0;

    // Scratch for one tetrahedron: the corner sample indices and, per
    // crossed edge, the interpolated position and normal.
    const tetIdx = new Int32Array(4);
    const cx = new Float64Array(4);
    const cy = new Float64Array(4);
    const cz = new Float64Array(4);
    const cnx = new Float64Array(4);
    const cny = new Float64Array(4);
    const cnz = new Float64Array(4);
    // `below` means field < iso is solid; the outward normal then points
    // toward INCREASING field, which is the raw gradient. `above` flips
    // both the classification and the normal, which is why the surface is
    // the same set either way and only its facing changes.
    const sign = inside === "below" ? 1 : -1;
    const corner = new Int32Array(8);

    /**
     * Append the crossing on edge (a, b) into slot `n`.
     *
     * ORIENTED BY SAMPLE INDEX, ALWAYS, and that is what makes the mesh
     * watertight rather than nearly so. Two tetrahedra sharing a lattice
     * edge reach it through different local corners, so one would
     * interpolate from p to q and the other from q to p — the same point
     * in exact arithmetic and a fraction of an ulp apart in f64, which
     * is a crack. Interpolating always from the lower sample index makes
     * the two computations the SAME expression on the same operands.
     * Index order agrees with world order (local index is global minus a
     * fixed origin, with positive strides), so windows agree too.
     */
    const crossing = (lo: number, hi: number, n: number): void => {
      const a = (tetIdx[lo] as number) <= (tetIdx[hi] as number) ? lo : hi;
      const b = a === lo ? hi : lo;
      const va = value[tetIdx[a] as number] as number;
      const vb = value[tetIdx[b] as number] as number;
      // One endpoint is strictly inside and the other is not, so the
      // denominator cannot be zero: the classification below used the
      // same two numbers and the same comparison.
      const t = (iso - va) / (vb - va);
      const ia = (tetIdx[a] as number) * 3;
      const ib = (tetIdx[b] as number) * 3;
      cx[n] = (gp[ia] as number) + ((gp[ib] as number) - (gp[ia] as number)) * t;
      cy[n] = (gp[ia + 1] as number) + ((gp[ib + 1] as number) - (gp[ia + 1] as number)) * t;
      cz[n] = (gp[ia + 2] as number) + ((gp[ib + 2] as number) - (gp[ia + 2] as number)) * t;
      // NORMALIZED HERE, once, and that is not tidiness. The winding
      // below is chosen by comparing the triangle's geometric normal
      // against the sum of its three vertex normals, and the vertices
      // ship these. Summing the RAW gradients instead weights the
      // comparison differently from what is shipped, so the two could
      // disagree - measured at about half a percent of the triangles on
      // an fbm blob before this was moved.
      const gxr = (grad[ia] as number) + ((grad[ib] as number) - (grad[ia] as number)) * t;
      const gyr = (grad[ia + 1] as number) + ((grad[ib + 1] as number) - (grad[ia + 1] as number)) * t;
      const gzr = (grad[ia + 2] as number) + ((grad[ib + 2] as number) - (grad[ia + 2] as number)) * t;
      const glen = Math.hypot(gxr, gyr, gzr);
      const inv = glen > 0 ? sign / glen : 0;
      cnx[n] = gxr * inv;
      cny[n] = gyr * inv;
      cnz[n] = gzr * inv;
    };

    /** Emit one triangle from crossing slots, wound to face outward. */
    const emit = (a: number, b: number, c: number): void => {
      // A REPEATED CORNER, which happens whenever a lattice sample sits
      // EXACTLY on the iso value: the crossing interpolates to t = 0 or 1
      // and two slots land on the same point. Dropped rather than
      // shipped, because a zero-area triangle has no orientation and any
      // consumer that recomputes one from the geometry - an exporter, a
      // collider, a flat-shading renderer - gets a NaN out of it.
      // Dropping is safe for the watertightness: such a triangle is
      // A, A, B, whose directed edges are one self-pair and one matched
      // pair, so removing it leaves every other edge as matched as it
      // was. Measured at 26% of the triangles on a sphere whose radius is
      // a whole number of cells.
      const same = (i: number, j: number): boolean =>
        cx[i] === cx[j] && cy[i] === cy[j] && cz[i] === cz[j];
      if (same(a, b) || same(b, c) || same(a, c)) return;
      if (triangles >= MAX_TRIANGLES) {
        throw new Error(
          `meshFromField: emitted triangles exceed ${MAX_TRIANGLES}. Raise cellSize, shrink the bounds, or cook the world in cells — the count grows with the SQUARE of the bounds over cellSize, since it counts surface rather than volume.`,
        );
      }
      // Wound against the FIELD's own normal rather than by tabulating
      // sixteen sign cases: take the triangle's geometric normal, compare
      // it against the SUM OF THE THREE VERTEX NORMALS - the same values
      // the vertices ship, so the two agree by construction - and swap
      // two vertices when they disagree.
      const ux = (cx[b] as number) - (cx[a] as number);
      const uy = (cy[b] as number) - (cy[a] as number);
      const uz = (cz[b] as number) - (cz[a] as number);
      const vx = (cx[c] as number) - (cx[a] as number);
      const vy = (cy[c] as number) - (cy[a] as number);
      const vz = (cz[c] as number) - (cz[a] as number);
      let gx = uy * vz - uz * vy;
      let gy = uz * vx - ux * vz;
      let gz = ux * vy - uy * vx;
      const wantX = (cnx[a] as number) + (cnx[b] as number) + (cnx[c] as number);
      const wantY = (cny[a] as number) + (cny[b] as number) + (cny[c] as number);
      const wantZ = (cnz[a] as number) + (cnz[b] as number) + (cnz[c] as number);
      const agree = gx * wantX + gy * wantY + gz * wantZ;
      const order = agree < 0 ? ([a, c, b] as const) : ([a, b, c] as const);
      if (agree < 0) {
        gx = -gx;
        gy = -gy;
        gz = -gz;
      }
      // THE GRADIENT CAN VANISH ON A SURFACE THAT IS NOT FLAT, which is
      // what a first draft of this got wrong. A central difference
      // ALIASES: sample cos(pi * x) at whole-unit spacing and every
      // difference is exactly zero although the true gradient is at its
      // MAXIMUM right on the surface. So the fallback is not a stand-in
      // axis - it is the triangle's own geometric normal, which is an
      // orientation the surface genuinely has, just not a smooth one.
      const wlen = Math.hypot(wantX, wantY, wantZ);
      const glen = Math.hypot(gx, gy, gz);
      const flat = wlen === 0 && glen > 0;
      const fx = flat ? gx / glen : 0;
      const fy = flat ? gy / glen : 0;
      const fz = flat ? gz / glen : 0;
      for (const s of order) {
        px.push(cx[s] as number);
        py.push(cy[s] as number);
        pz.push(cz[s] as number);
        nxs.push(flat ? fx : (cnx[s] as number));
        nys.push(flat ? fy : (cny[s] as number));
        nzs.push(flat ? fz : (cnz[s] as number));
      }
      triangles++;
    };

    for (let k = 0; k < cubesZ; k++) {
      for (let j = 0; j < cubesY; j++) {
        if ((j & 15) === 0) checkCancelled();
        for (let i = 0; i < cubesX; i++) {
          // Local corner coords start at 1: index 0 is the margin ring.
          for (let c = 0; c < 8; c++) {
            corner[c] = idx(i + 1 + CORNER_DX[c], j + 1 + CORNER_DY[c], k + 1 + CORNER_DZ[c]);
          }
          for (const tet of TETS) {
            let mask = 0;
            for (let c = 0; c < 4; c++) {
              const s = corner[tet[c] as number] as number;
              tetIdx[c] = s;
              // STRICTLY below, so a corner sitting exactly on the iso
              // value is OUTSIDE. Strict on one side is what makes the
              // classification a total function of the stored sample:
              // there is no tie to break and no epsilon to pick.
              const v = value[s] as number;
              if (inside === "below" ? v < iso : v > iso) mask |= 1 << c;
            }
            if (mask === 0 || mask === 15) continue;
            // Four corners, sixteen masks, and only three shapes: one
            // corner cut off, three corners cut off, or a two-two split
            // that crosses four edges. No ambiguous case exists, which is
            // the whole reason for tetrahedra.
            switch (mask) {
              case 1:
              case 14: {
                crossing(0, 1, 0);
                crossing(0, 2, 1);
                crossing(0, 3, 2);
                emit(0, 1, 2);
                break;
              }
              case 2:
              case 13: {
                crossing(1, 0, 0);
                crossing(1, 2, 1);
                crossing(1, 3, 2);
                emit(0, 1, 2);
                break;
              }
              case 4:
              case 11: {
                crossing(2, 0, 0);
                crossing(2, 1, 1);
                crossing(2, 3, 2);
                emit(0, 1, 2);
                break;
              }
              case 8:
              case 7: {
                crossing(3, 0, 0);
                crossing(3, 1, 1);
                crossing(3, 2, 2);
                emit(0, 1, 2);
                break;
              }
              case 3:
              case 12: {
                // 0 and 1 on one side, 2 and 3 on the other.
                crossing(0, 2, 0);
                crossing(0, 3, 1);
                crossing(1, 3, 2);
                crossing(1, 2, 3);
                emit(0, 1, 2);
                emit(0, 2, 3);
                break;
              }
              case 5:
              case 10: {
                // 0 and 2 against 1 and 3.
                crossing(0, 1, 0);
                crossing(0, 3, 1);
                crossing(2, 3, 2);
                crossing(2, 1, 3);
                emit(0, 1, 2);
                emit(0, 2, 3);
                break;
              }
              default: {
                // 6 and 9: 0 and 3 against 1 and 2.
                crossing(0, 1, 0);
                crossing(0, 2, 1);
                crossing(3, 2, 2);
                crossing(3, 1, 3);
                emit(0, 1, 2);
                emit(0, 2, 3);
                break;
              }
            }
          }
        }
      }
    }

    const nPoints = px.length;
    out.attrs.point.add("P", "f32", 3, 0);
    out.attrs.point.add("normal", "f32", 3, 0);
    out.attrs.point.resize(nPoints);
    const P = out.attrs.point.require("P").data;
    const N = out.attrs.point.require("normal").data;
    for (let v = 0; v < nPoints; v++) {
      P[v * 3] = px[v] as number;
      P[v * 3 + 1] = py[v] as number;
      P[v * 3 + 2] = pz[v] as number;
      N[v * 3] = nxs[v] as number;
      N[v * 3 + 1] = nys[v] as number;
      N[v * 3 + 2] = nzs[v] as number;
    }
    const v2p = new Uint32Array(nPoints);
    const primStart = new Uint32Array(triangles);
    const primCount = new Uint32Array(triangles);
    for (let v = 0; v < nPoints; v++) v2p[v] = v;
    for (let t = 0; t < triangles; t++) {
      primStart[t] = t * 3;
      primCount[t] = 3;
    }
    out.setTopology(v2p, primStart, primCount);
    out.attrs.primitive.add(PRIMTYPE_ATTR, "string", 1, "poly" satisfies PrimType);
    return { out: [makeGeometryItem(out)] };
  },
});
