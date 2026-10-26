/**
 * `transformBox`: scale every cell's box about a pivot, then move it — the
 * transform of a node-based modelling package applied to the grammar's own
 * cells, whose geometry IS the box.
 *
 * WHAT IT REPLACES. Taking a set of boxes from one coordinate system to
 * another — a lattice of whole studs and plates to world units, an
 * assembly centred on its lot — used to be a `setBounds` that rebuilt both
 * corners by hand: `vec(box("x0") - lot.x / 2, box("y0") * 0.4, ...)` and
 * the same again for the max corner. That is one operation, an axis-aligned
 * affine map, stated here once.
 *
 * THE MAP, per box axis k: x' = (x - pivot) * scale + pivot + translate,
 * applied to both faces, the faces swapped where a scale is negative so the
 * min corner stays the min. The pivot is a point in the boxes' own
 * coordinates ("origin", [0, 0, 0] being the cell's P), or a
 * fraction of the cell's own box ("cell", placeBox's anchor reading: 0 the
 * min face, 0.5 the centre, 1 the max face), or a fraction of the bounding
 * box of every cell transformed ("union"), so one pivot serves a whole
 * assembly and neighbouring boxes stay touching.
 *
 * NO ROTATION. A box stays a box only under a map that keeps its axes,
 * which is a per-axis scale and a translation; a quarter turn would also
 * have to turn the face frame shellSplit writes. A cell's box is an extent
 * in its point's own frame (world = P + rot * (scale * x)), so a cell is
 * turned by turning its POINT — transformPoints, which moves P and
 * composes rot and scale — and its box turns with it.
 *
 * NOTHING ELSE MOVES, as in offsetBox: same points, same order, same seeds,
 * every attribute and the topology carried; only boundsMin/boundsMax are
 * rewritten, in the coordinates they hold. P, rot and scale are not read:
 * a per-axis map along the box's own axes commutes with the point's
 * transform (tests/localBoxes.test.ts). The one exception is "union",
 * which pools corners from many cells: corners in different frames have
 * no common bounding box, so the chosen cells must share ONE transform —
 * bit-identical P, rot and scale, as every piece of one grammar root has —
 * and are refused otherwise, naming two that differ.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { deriveGeometry } from "../data/derive.js";
import type { Attribute, AttributeSet } from "../data/index.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { type InsideOutWording, requireBoxColumns, requireCellBoxAxis, resolveWhere } from "./boxCells.js";
import type {
  TransformBoxInputs,
  TransformBoxOutputs,
  TransformBoxParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  readComp,
  requireFinitePlainParam,
  requireGeometry,
  requireVec3Column,
  resolveOn,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { TransformBoxParams } from "./params.generated.js";

const NODE = "transformBox";

const PIVOTS = ["origin", "cell", "union"] as const;
/** Why "world" became "origin": the schema's `renamed` entry, and the direct-call refusal's text. */
const PIVOT_RENAMED = {
  world: {
    to: "origin",
    why: "a cell's box is an extent in its point's OWN frame (world = P + rot * (scale * x)), so a pivot point is in the box's coordinates, [0, 0, 0] being the cell's P, not the world's origin; the reading is the same",
  },
} as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Pivot codes, decided once. */
const PIVOT_ORIGIN = 0;
const PIVOT_CELL = 1;
const PIVOT_UNION = 2;

/** A cell box this node cannot transform, in its words. */
const BOX_TAIL = 'so it has no faces to transform. Fix the node that made it, or leave the cell out with "where".';
const BOX_INSIDE_OUT: InsideOutWording = {
  state: "ARRIVED inside out",
  tail: 'so a scale has no inside to keep. Fix the node that made it, or leave the cell out with "where".',
};

/**
 * The point a fraction `f` of the way from `a` to `b`, EXACT at both ends:
 * f = 0 is `a` and f = 1 is `b` whatever their magnitudes, which
 * `a + f * (b - a)` is not when `b - a` loses bits (-1e30 to 1e-30). That
 * is what makes "a face on the pivot does not move" hold for fraction 1.
 */
function lerpExact(a: number, b: number, f: number): number {
  return (1 - f) * a + f * b;
}

/** The transform columns "union" requires shared, with the value a missing column reads as. */
const TRANSFORM_COLUMNS = [
  ["P", 3, [0, 0, 0]],
  ["rot", 4, [0, 0, 0, 1]],
  ["scale", 3, [1, 1, 1]],
] as const;

/**
 * "union" pools corners from every chosen cell, which is a box only when
 * the corners share a frame: refuse, naming the first chosen cell, the
 * first that differs from it and the column, unless every chosen cell's P,
 * rot and scale are bit-identical (Object.is per component, so +0 and -0
 * differ). A missing rot or scale column reads as the identity, as every
 * reader of a point's transform takes it.
 */
function requireSharedFrame(pts: AttributeSet, n: number, chosen: (i: number) => boolean, checkCancelled: () => void): void {
  const cols = TRANSFORM_COLUMNS.map(([name, size, dflt]) => {
    const a = pts.get(name);
    const data = a !== undefined && a.type !== "string" ? (a.data as ArrayLike<number>) : undefined;
    const stride = data !== undefined ? (a as Attribute).tupleSize : 0;
    return { name, size, at: (row: number, c: number): number => (data !== undefined && c < stride ? data[row * stride + c] : dflt[c]) };
  });
  let first = -1;
  for (let i = 0; i < n; i++) {
    if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
    if (!chosen(i)) continue;
    if (first < 0) {
      first = i;
      continue;
    }
    for (const { name, size, at } of cols) {
      for (let c = 0; c < size; c++) {
        if (Object.is(at(first, c), at(i, c))) continue;
        const tuple = (row: number) => `[${Array.from({ length: size }, (_, k) => (Object.is(at(row, k), -0) ? "-0" : String(at(row, k)))).join(", ")}]`;
        throw new Error(
          `${NODE}: pivotIn "union" takes one bounding box of every chosen cell, but cells ${first} and ${i} are in different frames — ${name} ${tuple(first)} and ${tuple(i)}. A cell's box is an extent in its point's own frame (world = P + rot * (scale * x)), so corners in two frames have no common box. Union cells that share one P, rot and scale (every piece of one grammar root does), choose one frame's cells with "where", or scale each about its own box with pivotIn "cell".`,
        );
      }
    }
  }
}

/** Every cell's box scaled about a pivot, then moved. */
export const transformBox = standardNode<TransformBoxParams, TransformBoxInputs, TransformBoxOutputs>({
  type: NODE,
  category: "point op",
  description: `SCALES every cell's box ABOUT A PIVOT and then MOVES it — the transform of a modelling package applied to geometry that is a box, and the way a set of boxes goes from one coordinate system to another: a lattice of whole studs and plates to units, an assembly centred on its lot, a piece shrunk about its own centre. A CELL IS A POINT WITH A BOX, as in splitBox: its standard \`boundsMin\`/\`boundsMax\`, an extent in the point's OWN frame (world = P + rot * (scale * x)), read and written in the coordinates they hold. THE MAP, per box axis: x' = (x - pivot) * scale + pivot + translate, applied to BOTH faces, so a box from 2 to 6 scaled by 0.5 about 0 runs from 1 to 3, about its centre (4) from 3 to 5, and with translate -4 after either. A NEGATIVE scale MIRRORS the box about the pivot, its faces swapped so boundsMin stays the min corner; a scale of 0 leaves a box of no volume on the pivot, KEPT, never dropped. \`pivotIn\` says what \`pivot\` is, decided once per cook: "origin" (the default) a point in the boxes' own coordinates, [0, 0, 0] their origin — the cell's P (it was called "world"; that word is refused with the rename stated); "cell" a 0..1 FRACTION of the cell's OWN box per axis, placeBox's anchor reading — 0 the min face, 0.5 the centre, 1 the max face, any value between in proportion, and outside 0..1 past the face — so [0.5, 0.5, 0.5] scales every box about its own centre and [0.5, 0, 0.5] about the middle of its floor; "union" the same fraction of the BOUNDING BOX OF EVERY CELL this cook transforms (the cells \`where\` selects), so one pivot serves a whole assembly and boxes that touched still touch: [0.5, 0, 0.5] scales a house about the middle of its footprint — and since corners in different frames have no common box, "union" refuses chosen cells that do not share one P, rot and scale bit for bit (every piece of one grammar root does), naming two that differ. A scale about one shared pivot ("origin" or "union") keeps a tiling a tiling; a scale about each cell's own pivot opens or closes the gaps between them. \`scale\`, \`pivot\` and \`translate\` are vec3, plain or FIELDS resolved per cell on the INPUT (box names read the box as it arrived; a scalar broadcasts to all three), all along the box's own axes. NO ROTATION: a box stays a box only under a map that keeps its axes; to turn a cell, turn its point with transformPoints, which moves P and composes rot and scale, and the box turns with it. Every param, plain or field, is held as f32 (as every field constant is), so scale 0.4 is f32(0.4) and a plain value past f32's range is refused by name; the boxes are computed in f64 from those f32 numbers and the stored f32 corners and written as f32, a -0 face written +0 (an input face of -0 too). An input box that is inside out or not finite, and a result past what f32 bounds hold, are refused naming the cell — leave such a cell out with \`where\`, which passes chosen cells through EXACTLY as they arrived (0 = untouched, and under "union" not counted in the pivot box). Same points, same order, same SEEDS, every attribute (strings included), the topology and the detail attributes carried; P, rot and scale are neither read nor written (beyond "union"'s shared-frame check), so the transformed box keeps its cell's frame. CPU only, as every box node. Use it where a setBounds rebuilt both corners from box("lo") and box("hi") by one scale and one shift: the map is then stated once instead of per corner.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    scale: {
      type: "vec3",
      default: [1, 1, 1],
      acceptsField: true,
      description:
        "The scale per box axis [x, y, z], about the pivot: 1 keeps the axis, 0.5 halves it, 2 doubles it, a negative value mirrors the box about the pivot (its faces swapped, so boundsMin stays the min), and 0 leaves a box of no volume on the pivot. [1, 0.4, 1] takes a lattice counted in studs across and plates up to units where a plate is 0.4 of a stud. As a FIELD it is resolved per cell on the INPUT (box names read the box as it arrived) and a scalar broadcasts to all three. Must be finite.",
    },
    pivot: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "The point the scale is about, per box axis, read as `pivotIn` says: under \"origin\" a point in the boxes' own coordinates (the default [0, 0, 0] is their origin, the cell's P); under \"cell\" a fraction of the cell's own box (0 the min face, 0.5 the centre, 1 the max face — placeBox's anchor reading); under \"union\" the same fraction of the bounding box of every cell transformed. The pivot does not move: a box face on it stays where it is, whatever the scale. As a FIELD it is resolved per cell on the input; a scalar broadcasts. Must be finite.",
    },
    pivotIn: {
      type: "enum",
      enum: [...PIVOTS],
      default: "origin",
      renamed: PIVOT_RENAMED,
      description:
        "What `pivot` is measured in. \"origin\" (the default): a point in the boxes' own coordinates, [0, 0, 0] the cell's P (it was called \"world\"; that word is refused with the rename stated). \"cell\": a 0..1 fraction of each cell's OWN box per axis, so [0.5, 0.5, 0.5] scales every box about its own centre — which opens (or closes) the gaps between neighbours. \"union\": the same fraction of the bounding box of EVERY cell this cook transforms (those `where` selects), one pivot for the whole assembly, so boxes that touched still touch — [0.5, 0, 0.5] scales a building about the middle of its footprint, at ground level. The chosen cells must share one P, rot and scale bit for bit (corners in different frames have no common box); cells that do not are refused, naming two. Decided once per cook.",
    },
    translate: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far every box moves AFTER the scale, per box axis, in the output's units: [0, 0, 0] (the default) leaves it on the pivot's frame. A field reading a per-cell attribute moves each cell by its own amount — mul(attribute(\"lot\", 3), [-0.5, 0, -0.5]) centres a lot whose box starts at [0, 0, 0] in its own coordinates (on its cell's P, not at the world's origin) on x and z. As a FIELD it is resolved per cell on the input; a scalar broadcasts. Must be finite.",
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        "Which cells are transformed: nonzero transforms the cell, 0 leaves it EXACTLY as it arrived — no scale, no move, no check of its box (a FIELD param is still resolved, and refused if not finite, on every cell), and under pivotIn \"union\" not counted in the box the pivot is a fraction of. As a field it is resolved per cell, e.g. attributeIs(\"kind\", \"roof\"). Must be finite.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: the pivot word becomes a code here, and no
    // string reaches the per-cell loop.
    const pivotName = canonicalOneOf(PIVOTS, params.pivotIn);
    if (pivotName === undefined && (params.pivotIn as unknown) === "world") {
      throw new Error(`${NODE}: param "pivotIn" is "world", which was renamed "origin" — ${PIVOT_RENAMED.world.why}. Write "origin" (the default). Valid: ${PIVOTS.join(", ")}.`);
    }
    if (pivotName === undefined) {
      throw new Error(
        `${NODE}: param "pivotIn" is ${JSON.stringify(params.pivotIn)}; valid: ${PIVOTS.join(", ")} — "origin" reads pivot as a point in the boxes' own coordinates, "cell" as a 0..1 fraction of each cell's own box ([0.5, 0.5, 0.5] is its centre), "union" as the same fraction of the bounding box of every cell transformed.`,
      );
    }
    const pivotMode = (PIVOTS as readonly string[]).indexOf(pivotName);
    for (const [name, fix] of [
      ["scale", "A scale is a finite factor per axis (negative mirrors, 0 flattens). Write [1, 1, 1] for none."],
      ["pivot", "A pivot is a finite point (or, under pivotIn \"cell\" or \"union\", a finite fraction) per axis. Write [0, 0, 0] for the origin."],
      ["translate", "A translation is a finite distance per axis. Write [0, 0, 0] for none."],
    ] as const) {
      requireFinitePlainParam(params[name], NODE, name, fix);
    }
    // A plain value is stored f32 before it is used, as a field constant
    // is: one past f32's range would arrive as Infinity (or a scale under
    // it as 0) and be refused, or used, as something nobody wrote.
    for (const name of ["scale", "pivot", "translate"] as const) {
      const v = params[name];
      if (isField(v) || !Array.isArray(v)) continue;
      v.forEach((c, a) => {
        if (typeof c === "number" && c !== 0 && Number.isFinite(c) && (!Number.isFinite(Math.fround(c)) || Math.fround(c) === 0)) {
          throw new Error(
            `${NODE}: param "${name}" component ${a} (${AXIS_NAMES[a]}) is ${c}, which f32 — the precision every box and param is stored in — holds as ${Math.fround(c)}. Use a value between about 1.2e-38 and 3.4e38 in magnitude, or 0.`,
          );
        }
      });
    }
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to transform every cell, 0 to leave every cell as it is, or a field.");

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    // The input's corners, taken before the output's columns are made
    // writable: `deriveGeometry` shares columns copy-on-write, so these
    // stay the input's while the writable views below are the output's.
    const { lo, hi } = requireBoxColumns(NODE, srcSet, "in");

    // ---- per-cell values, resolved on the INPUT before anything is written
    const [sCol, pCol, tCol] = (["scale", "pivot", "translate"] as const).map((name) =>
      requireVec3Column(
        resolveOn(src, "point", params[name], seed, NODE, name),
        NODE,
        name,
        "cell",
        name === "pivot" ? "a pivot is a point (or a fraction) per box axis [x, y, z]" : `a ${name} is one number per box axis [x, y, z]`,
      ),
    );
    const chosen = resolveWhere(src, params.where, seed, NODE, "a transform-or-leave flag");

    // Every chosen box is checked BEFORE the union is taken from them, so
    // a bad box is refused as itself rather than as a bad pivot.
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!chosen(i)) continue;
      for (let k = 0; k < 3; k++) requireCellBoxAxis(NODE, i, k, lo[i * 3 + k], hi[i * 3 + k], BOX_TAIL, BOX_INSIDE_OUT);
    }

    // ---- the union box, only when the pivot is a fraction of it
    const uLo = [Infinity, Infinity, Infinity];
    const uHi = [-Infinity, -Infinity, -Infinity];
    if (pivotMode === PIVOT_UNION) {
      requireSharedFrame(srcSet, n, chosen, checkCancelled);
      for (let i = 0; i < n; i++) {
        if (!chosen(i)) continue;
        for (let k = 0; k < 3; k++) {
          uLo[k] = Math.min(uLo[k], lo[i * 3 + k]);
          uHi[k] = Math.max(uHi[k], hi[i * 3 + k]);
        }
      }
    }

    const out = deriveGeometry(src);
    const oLo = out.attrs.point.require("boundsMin").writable() as Float32Array;
    const oHi = out.attrs.point.require("boundsMax").writable() as Float32Array;

    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!chosen(i)) continue;
      for (let k = 0; k < 3; k++) {
        const o = i * 3 + k;
        const l0 = lo[o];
        const h0 = hi[o];
        const s = readComp(sCol, i, k);
        const pv = readComp(pCol, i, k);
        const t = readComp(tCol, i, k);
        const p =
          pivotMode === PIVOT_ORIGIN
            ? pv
            : pivotMode === PIVOT_CELL
              ? lerpExact(l0, h0, pv)
              : lerpExact(uLo[k], uHi[k], pv);
        const a = (l0 - p) * s + p + t;
        const b = (h0 - p) * s + p + t;
        const l = Math.min(a, b);
        const h = Math.max(a, b);
        if (!Number.isFinite(Math.fround(l)) || !Number.isFinite(Math.fround(h))) {
          throw new Error(
            `${NODE}: cell ${i}'s box along ${AXIS_NAMES[k]} is transformed past what f32 bounds hold — boundsMin ${l0} and boundsMax ${h0}, scaled by ${s} about ${p} and moved ${t}, become ${l} and ${h}. Bound the scale or the translation, or leave the cell out with "where".`,
          );
        }
        // + 0 turns a -0 into +0, as offsetBox writes it — AFTER the f32
        // rounding, since a tiny negative f64 rounds to an f32 -0.
        oLo[o] = Math.fround(l) + 0;
        oHi[o] = Math.fround(h) + 0;
      }
    }
    return { out: [makeGeometryItem(out)] };
  },
});
