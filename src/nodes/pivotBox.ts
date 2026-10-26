/**
 * `pivotBox`: move every cell's P to a chosen point of its box, and
 * re-express the box about the new P, so the box stays where it is in the
 * world.
 *
 * WHY IT EXISTS. A cell's box is an extent in its point's own frame
 * (world = P + rot * (scale * x)), and every piece of a grammar root keeps
 * the root's P, rot and scale bit for bit: that shared frame is what makes
 * neighbouring pieces meet exactly. An instance wants the other thing — its
 * P AT the piece, its box about it — because copyToPoints and spawn place a
 * copy at P. This node is that hand-off, done once at the end of a grammar:
 * pivotBox, then (for a unit asset) `scale = scale * box("size")` and
 * bounds +-0.5, then copyToPoints or spawnInstances.
 *
 * THE MAP, per cell, with f the pivot fraction per box axis:
 *   c   = f32((1 - f) * lo + f * hi)      a point of the box, its own coordinates
 *   P'  = f32(P + rot * (scale * c))      that point in the world
 *   lo' = f32(lo - c),  hi' = f32(hi - c) the box about it
 * rot and scale are kept. So P' + rot * (scale * lo') = P + rot * (scale *
 * lo) in the reals; in f32, c is held as an f32 so lo - c and hi - c are
 * usually exact (always when c lies within a factor of two of the corner),
 * leaving the rounding of P' as the one rounding the world box moves by.
 * The rotation is normalized in f64 first, as boxContact and boxesToMesh
 * read it, and its matrix entries within 2^-40 of 0 or +-1 snapped, so a
 * quarter turn stored in f32 moves a point exactly (boxCells.cellRotation).
 */
import { deriveGeometry } from "../data/derive.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import {
  type InsideOutWording,
  cellRotation,
  newCellFrame,
  readCellFrame,
  requireBoxColumns,
  requireCellBoxAxis,
  requireCellFrameColumns,
  resolveWhere,
} from "./boxCells.js";
import type { PivotBoxInputs, PivotBoxOutputs, PivotBoxParams } from "./params.generated.js";
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
export type { PivotBoxParams } from "./params.generated.js";

const NODE = "pivotBox";
const AXIS_NAMES = ["x", "y", "z"] as const;

/** A cell box this node cannot pivot, in its words. */
const BOX_TAIL = 'so it has no point to pivot on. Fix the node that made it, or leave the cell out with "where".';
const BOX_INSIDE_OUT: InsideOutWording = {
  state: "ARRIVED inside out",
  tail: 'so a fraction of it names no point of a box. Fix the node that made it, or leave the cell out with "where".',
};

/** The point a fraction `f` of the way from `a` to `b`, exact at both ends (transformBox's lerp). */
function lerpExact(a: number, b: number, f: number): number {
  return (1 - f) * a + f * b;
}

/** Every cell's P moved to a point of its box, its box re-expressed about it. */
export const pivotBox = standardNode<PivotBoxParams, PivotBoxInputs, PivotBoxOutputs>({
  type: NODE,
  category: "point op",
  description: `MOVES every cell's P TO A POINT OF ITS BOX and re-expresses the box about it, so THE BOX STAYS WHERE IT IS IN THE WORLD: the hand-off from a grammar's cells to instances. A CELL IS A POINT WITH A BOX, as in splitBox: its standard \`boundsMin\`/\`boundsMax\`, an extent in the point's OWN frame (world = P + rot * (scale * x)), and every piece of one grammar root keeps that root's P, rot and scale, which is what lets neighbouring pieces meet exactly. copyToPoints and spawnInstances place a copy AT P, so a piece's P must first move to the piece: this node does that. THE MAP, per cell, with f the \`pivot\` fraction on each box axis: c = (1 - f) * min + f * max, held as an f32 (0 the min face, 0.5 the centre, 1 the max face, outside 0..1 past the face — placeBox's anchor reading); P becomes P + rot * (scale * c), the world position of that point; boundsMin and boundsMax become min - c and max - c. rot and scale are KEPT, so P + rot * (scale * x) gives every corner the world position it had: a rotated or mirrored cell keeps its oriented box. With the default [0.5, 0.5, 0.5] P lands at the box's centre and the box runs -size/2..size/2 about it; [0.5, 0, 0.5] puts P at the middle of the box's floor. THE CELL-TO-INSTANCE TAIL: pivotBox, then setAttribute scale = mul(attribute("scale", 3), box("size")) and setBounds boundsMin [-0.5, -0.5, -0.5], boundsMax [0.5, 0.5, 0.5] (the unit box the asset fills, about P), then copyToPoints or spawnInstances — or boxesToMesh straight from the cells, which needs no pivot, since it builds every face through the cell's transform. PIVOT AT THE END OF A GRAMMAR: pieces split after a pivot are pieces of DIFFERENT frames, so they lose boxContact's same-frame comparison and their shared faces stop being bit-exact. Rounding: the rotation is normalized in f64 first (as boxContact and boxesToMesh read it; a zero quaternion is the identity) and its matrix entries within 2^-40 of 0 or 1 are snapped to them, so a quarter or half turn stored in f32 moves a point exactly; P and the corners are computed in f64 and stored as f32, each -0 written +0. Because c is held as an f32, min - c and max - c are exact whenever c is within a factor of two of the corner, and the world box then moves only by the rounding of the new P — exact for dyadic boxes at dyadic P under no turn, quarter or half turns and dyadic scales. \`pivot\` is a vec3, plain or a FIELD resolved per cell on the INPUT (box names read the box as it arrived; a scalar broadcasts), held as f32. \`where\` passes chosen cells through EXACTLY as they arrived (0 = untouched). An input box that is inside out or not finite, a non-finite P, rot or scale, and a result past f32's range are refused naming the cell. Same points, same order, same SEEDS, every attribute (strings included), the topology and the detail attributes carried; only P, boundsMin and boundsMax are written. Point identity hashes P, so a randomField drawn after this node differs from one drawn before it. CPU only, as every box node.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    pivot: {
      type: "vec3",
      default: [0.5, 0.5, 0.5],
      acceptsField: true,
      description:
        "Where in its box each cell's P moves, as a FRACTION of the box per box axis — placeBox's anchor reading: 0 the min face, 0.5 the centre, 1 the max face, values outside 0..1 past the face. [0.5, 0.5, 0.5] (the default) puts P at the box's centre, [0.5, 0, 0.5] at the middle of its floor (where a building stands), [0, 0, 0] at its min corner. The box is re-expressed about the new P, so it does not move. As a FIELD it is resolved per cell on the INPUT (box names read the box as it arrived) and a scalar broadcasts to all three. Held as f32; must be finite.",
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        "Which cells are pivoted: nonzero pivots the cell, 0 leaves it EXACTLY as it arrived — P and box untouched, and its box not checked (a FIELD param is still resolved, and refused if not finite, on every cell). As a field it is resolved per cell, e.g. attributeIs(\"kind\", \"window\"). Must be finite.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    requireFinitePlainParam(params.pivot, NODE, "pivot", "A pivot is a finite fraction of the box per axis: 0 the min face, 0.5 the centre, 1 the max face. Write [0.5, 0.5, 0.5] for the centre.");
    const pv = params.pivot as unknown;
    if (!isField(pv) && Array.isArray(pv)) {
      pv.forEach((c, a) => {
        if (typeof c === "number" && c !== 0 && Number.isFinite(c) && (!Number.isFinite(Math.fround(c)) || Math.fround(c) === 0)) {
          throw new Error(
            `${NODE}: param "pivot" component ${a} (${AXIS_NAMES[a]}) is ${c}, which f32 — the precision every box and param is stored in — holds as ${Math.fround(c)}. Use a fraction f32 holds: under 3.4e38 in magnitude, and 0 rather than one so small it rounds to 0.`,
          );
        }
      });
    }
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to pivot every cell, 0 to leave every cell as it is, or a field.");

    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    const { lo, hi } = requireBoxColumns(NODE, srcSet, "in");
    const frames = requireCellFrameColumns(NODE, srcSet, "in");

    // Per-cell values, resolved on the INPUT before anything is written.
    const fCol = requireVec3Column(
      resolveOn(src, "point", params.pivot, seed, NODE, "pivot"),
      NODE,
      "pivot",
      "cell",
      "a pivot is a fraction of the box per box axis [x, y, z]",
    );
    const chosen = resolveWhere(src, params.where, seed, NODE, "a pivot-or-leave flag");

    const out = deriveGeometry(src);
    const oSet = out.attrs.point;
    const oLo = oSet.require("boundsMin").writable() as Float32Array;
    const oHi = oSet.require("boundsMax").writable() as Float32Array;
    const oP = oSet.require("P").writable() as Float32Array;
    const pStride = frames.pStride;

    const fr = newCellFrame();
    const m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const c = [0, 0, 0];
    const v = [0, 0, 0];
    const nl = [0, 0, 0];
    const nh = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!chosen(i)) continue;
      readCellFrame(NODE, frames, i, fr);
      for (let k = 0; k < 3; k++) {
        const o = i * 3 + k;
        const l0 = lo[o];
        const h0 = hi[o];
        requireCellBoxAxis(NODE, i, k, l0, h0, BOX_TAIL, BOX_INSIDE_OUT);
        const f = readComp(fCol, i, k);
        // c is held as an f32, so lo - c and hi - c are usually exact
        // (Sterbenz) and the box about P' is the stored box shifted by a
        // number P' also moved by.
        const ck = Math.fround(lerpExact(l0, h0, f));
        const a = Math.fround(l0 - ck);
        const b = Math.fround(h0 - ck);
        if (!Number.isFinite(ck) || !Number.isFinite(a) || !Number.isFinite(b)) {
          throw new Error(
            `${NODE}: cell ${i}'s pivot along ${AXIS_NAMES[k]} is past what f32 holds — boundsMin ${l0} and boundsMax ${h0} at fraction ${f} give ${lerpExact(l0, h0, f)}, and the box about it ${l0 - ck}..${h0 - ck}. Bound the pivot (0 to 1 stays inside the box), or leave the cell out with "where".`,
          );
        }
        c[k] = ck;
        nl[k] = a + 0;
        nh[k] = b + 0;
      }
      // R * (S * c), R snapped so a quarter or half turn is exact.
      cellRotation(fr, m);
      const x = fr.sx * c[0];
      const y = fr.sy * c[1];
      const z = fr.sz * c[2];
      v[0] = m[0] * x + m[1] * y + m[2] * z;
      v[1] = m[3] * x + m[4] * y + m[5] * z;
      v[2] = m[6] * x + m[7] * y + m[8] * z;
      const p0 = Math.fround(fr.px + v[0]);
      const p1 = Math.fround(fr.py + v[1]);
      const p2 = Math.fround(fr.pz + v[2]);
      if (!Number.isFinite(p0) || !Number.isFinite(p1) || !Number.isFinite(p2)) {
        throw new Error(
          `${NODE}: cell ${i}'s new P is past what f32 holds — P (${fr.px}, ${fr.py}, ${fr.pz}) plus rot * (scale * (${c.join(", ")})) gives (${fr.px + v[0]}, ${fr.py + v[1]}, ${fr.pz + v[2]}). Bound the scale or the pivot, or leave the cell out with "where".`,
        );
      }
      oP[i * pStride] = p0 + 0;
      oP[i * pStride + 1] = p1 + 0;
      oP[i * pStride + 2] = p2 + 0;
      for (let k = 0; k < 3; k++) {
        oLo[i * 3 + k] = nl[k];
        oHi[i * 3 + k] = nh[k];
      }
    }
    return { out: [makeGeometryItem(out)] };
  },
});
