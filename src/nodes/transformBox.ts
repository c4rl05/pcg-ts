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
 * THE MAP, per world axis k: x' = (x - pivot) * scale + pivot + translate,
 * applied to both faces, the faces swapped where a scale is negative so the
 * min corner stays the min. The pivot is a world point ("world"), or a
 * fraction of the cell's own box ("cell", placeBox's anchor reading: 0 the
 * min face, 0.5 the centre, 1 the max face), or a fraction of the bounding
 * box of every cell transformed ("union"), so one pivot serves a whole
 * assembly and neighbouring boxes stay touching.
 *
 * NO ROTATION. An axis-aligned box stays axis-aligned only under a map that
 * keeps the axes, which is a per-axis scale and a translation; a rotated
 * box is not a box this vocabulary can store, and a quarter turn would also
 * have to turn the face frame shellSplit writes. A point that carries its
 * box as a LOCAL extent (the instance reading) is rotated with
 * transformPoints, which moves P and composes rot and scale instead.
 *
 * NOTHING ELSE MOVES, as in offsetBox: same points, same order, same seeds,
 * every attribute and the topology carried; only boundsMin/boundsMax are
 * rewritten, in the coordinates they hold. P, rot and scale are not read.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { deriveGeometry } from "../data/derive.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
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
  requireScalarColumn,
  requireVec3Column,
  resolveOn,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { TransformBoxParams } from "./params.generated.js";

const NODE = "transformBox";

const PIVOTS = ["world", "cell", "union"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Pivot codes, decided once. */
const PIVOT_WORLD = 0;
const PIVOT_CELL = 1;
const PIVOT_UNION = 2;

/**
 * The point a fraction `f` of the way from `a` to `b`, EXACT at both ends:
 * f = 0 is `a` and f = 1 is `b` whatever their magnitudes, which
 * `a + f * (b - a)` is not when `b - a` loses bits (-1e30 to 1e-30). That
 * is what makes "a face on the pivot does not move" hold for fraction 1.
 */
function lerpExact(a: number, b: number, f: number): number {
  return (1 - f) * a + f * b;
}

/** Every cell's box scaled about a pivot, then moved. */
export const transformBox = standardNode<TransformBoxParams, TransformBoxInputs, TransformBoxOutputs>({
  type: NODE,
  category: "point op",
  description: `SCALES every cell's box ABOUT A PIVOT and then MOVES it — the transform of a modelling package applied to geometry that is a box, and the way a set of boxes goes from one coordinate system to another: a lattice of whole studs and plates to world units, an assembly centred on its lot, a piece shrunk about its own centre. A CELL IS A POINT WITH A BOX, as in splitBox: its standard \`boundsMin\`/\`boundsMax\`, read and written in the coordinates they hold. THE MAP, per world axis: x' = (x - pivot) * scale + pivot + translate, applied to BOTH faces, so a box from 2 to 6 scaled by 0.5 about 0 runs from 1 to 3, about its centre (4) from 3 to 5, and with translate -4 after either. A NEGATIVE scale MIRRORS the box about the pivot, its faces swapped so boundsMin stays the min corner; a scale of 0 leaves a box of no volume on the pivot, KEPT, never dropped. \`pivotIn\` says what \`pivot\` is, decided once per cook: "world" (the default) a point in the boxes' coordinates, [0, 0, 0] the origin; "cell" a 0..1 FRACTION of the cell's OWN box per axis, placeBox's anchor reading — 0 the min face, 0.5 the centre, 1 the max face, any value between in proportion, and outside 0..1 past the face — so [0.5, 0.5, 0.5] scales every box about its own centre and [0.5, 0, 0.5] about the middle of its floor; "union" the same fraction of the BOUNDING BOX OF EVERY CELL this cook transforms (the cells \`where\` selects), so one pivot serves a whole assembly and boxes that touched still touch: [0.5, 0, 0.5] scales a house about the middle of its footprint. A scale about one shared pivot ("world" or "union") keeps a tiling a tiling; a scale about each cell's own pivot opens or closes the gaps between them. \`scale\`, \`pivot\` and \`translate\` are vec3, plain or FIELDS resolved per cell on the INPUT (box names read the box as it arrived; a scalar broadcasts to all three), all in WORLD axes. NO ROTATION: an axis-aligned box stays one only under a map that keeps the axes; a point whose box is a LOCAL extent (an instance) is rotated with transformPoints, which moves P and composes rot and scale. Every param, plain or field, is held as f32 (as every field constant is), so scale 0.4 is f32(0.4) and a plain value past f32's range is refused by name; the boxes are computed in f64 from those f32 numbers and the stored f32 corners and written as f32, a -0 face written +0 (an input face of -0 too). An input box that is inside out or not finite, and a result past what f32 bounds hold, are refused naming the cell — leave such a cell out with \`where\`, which passes chosen cells through EXACTLY as they arrived (0 = untouched, and under "union" not counted in the pivot box). Same points, same order, same SEEDS, every attribute (strings included), the topology and the detail attributes carried; P, rot and scale are neither read nor written. CPU only, as every box node. Use it where a setBounds rebuilt both corners from box("lo") and box("hi") by one scale and one shift: the map is then stated once instead of per corner.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    scale: {
      type: "vec3",
      default: [1, 1, 1],
      acceptsField: true,
      description:
        "The scale per WORLD axis [x, y, z], about the pivot: 1 keeps the axis, 0.5 halves it, 2 doubles it, a negative value mirrors the box about the pivot (its faces swapped, so boundsMin stays the min), and 0 leaves a box of no volume on the pivot. [1, 0.4, 1] takes a lattice counted in studs across and plates up to world units where a plate is 0.4 of a stud. As a FIELD it is resolved per cell on the INPUT (box names read the box as it arrived) and a scalar broadcasts to all three. Must be finite.",
    },
    pivot: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "The point the scale is about, per WORLD axis, read as `pivotIn` says: under \"world\" a point in the boxes' coordinates (the default [0, 0, 0] is the origin); under \"cell\" a fraction of the cell's own box (0 the min face, 0.5 the centre, 1 the max face — placeBox's anchor reading); under \"union\" the same fraction of the bounding box of every cell transformed. The pivot does not move: a box face on it stays where it is, whatever the scale. As a FIELD it is resolved per cell on the input; a scalar broadcasts. Must be finite.",
    },
    pivotIn: {
      type: "enum",
      enum: [...PIVOTS],
      default: "world",
      description:
        "What `pivot` is measured in. \"world\" (the default): a point in the boxes' own coordinates. \"cell\": a 0..1 fraction of each cell's OWN box per axis, so [0.5, 0.5, 0.5] scales every box about its own centre — which opens (or closes) the gaps between neighbours. \"union\": the same fraction of the bounding box of EVERY cell this cook transforms (those `where` selects), one pivot for the whole assembly, so boxes that touched still touch — [0.5, 0, 0.5] scales a building about the middle of its footprint, at ground level. Decided once per cook.",
    },
    translate: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far every box moves AFTER the scale, per WORLD axis, in the output's units: [0, 0, 0] (the default) leaves it on the pivot's frame. A field reading a per-cell attribute moves each cell by its own amount — mul(attribute(\"lot\", 3), [-0.5, 0, -0.5]) centres a lot whose box starts at the origin on x and z. As a FIELD it is resolved per cell on the input; a scalar broadcasts. Must be finite.",
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
    if (pivotName === undefined) {
      throw new Error(
        `${NODE}: param "pivotIn" is ${JSON.stringify(params.pivotIn)}; valid: ${PIVOTS.join(", ")} — "world" reads pivot as a point, "cell" as a 0..1 fraction of each cell's own box ([0.5, 0.5, 0.5] is its centre), "union" as the same fraction of the bounding box of every cell transformed.`,
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
    for (const name of ["boundsMin", "boundsMax"] as const) {
      const attr = srcSet.get(name);
      if (attr === undefined || attr.type !== "f32" || attr.tupleSize !== 3) {
        throw new Error(
          `${NODE}: the input on pin "in" ${attr === undefined ? `has no "${name}" point attribute` : `has "${name}" as ${attr.type} tupleSize ${attr.tupleSize}`}; a cell's box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the cells their boxes with setBounds first.`,
        );
      }
    }

    // ---- per-cell values, resolved on the INPUT before anything is written
    const [sCol, pCol, tCol] = (["scale", "pivot", "translate"] as const).map((name) =>
      requireVec3Column(
        resolveOn(src, "point", params[name], seed, NODE, name),
        NODE,
        name,
        "cell",
        name === "pivot" ? "a pivot is a point (or a fraction) per world axis [x, y, z]" : `a ${name} is one number per world axis [x, y, z]`,
      ),
    );
    let whereCol: ArrayLike<number> | undefined;
    let whereAll = true;
    if (isField(params.where)) {
      whereCol = requireScalarColumn(
        resolveOn(src, "point", params.where, seed, NODE, "where"),
        NODE,
        "where",
        "cell",
        "a transform-or-leave flag",
      ).data;
    } else {
      whereAll = (params.where as number) !== 0;
    }
    const chosen = (i: number): boolean => (whereCol === undefined ? whereAll : whereCol[i] !== 0);

    // The input's corners, taken before the output's columns are made
    // writable: `deriveGeometry` shares columns copy-on-write, so these
    // stay the input's while the writable views below are the output's.
    const lo = srcSet.require("boundsMin").data as Float32Array;
    const hi = srcSet.require("boundsMax").data as Float32Array;

    // Every chosen box is checked BEFORE the union is taken from them, so
    // a bad box is refused as itself rather than as a bad pivot.
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!chosen(i)) continue;
      for (let k = 0; k < 3; k++) {
        const l = lo[i * 3 + k];
        const h = hi[i * 3 + k];
        if (!Number.isFinite(l) || !Number.isFinite(h)) {
          throw new Error(
            `${NODE}: cell ${i}'s box is not finite along ${AXIS_NAMES[k]} — boundsMin ${l}, boundsMax ${h} — so it has no faces to transform. Fix the node that made it, or leave the cell out with "where".`,
          );
        }
        if (!(h >= l)) {
          throw new Error(
            `${NODE}: cell ${i}'s box ARRIVED inside out along ${AXIS_NAMES[k]} — boundsMin ${l} is above boundsMax ${h} — so a scale has no inside to keep. Fix the node that made it, or leave the cell out with "where".`,
          );
        }
      }
    }

    // ---- the union box, only when the pivot is a fraction of it
    const uLo = [Infinity, Infinity, Infinity];
    const uHi = [-Infinity, -Infinity, -Infinity];
    if (pivotMode === PIVOT_UNION) {
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
          pivotMode === PIVOT_WORLD
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
