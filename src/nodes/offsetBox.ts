/**
 * `offsetBox`: move each face of every cell's box out (or, signed, in) —
 * the scope offset of a shape grammar, and the bound padding and
 * face-extrude inset/outset of a node-based modelling package, as one node
 * on the grammar's own cells.
 *
 * WHAT IT REPLACES. Growing one face of a box used to be a `setBounds`
 * whose two corners were rebuilt by hand: `box("lo") + min(outward, 0) * d`
 * and `box("hi") + max(outward, 0) * d` to push a wall's sill one stud out
 * of whichever face is outside, `lot / 2 - 4 * floor((lot + 11) / 8)` per
 * axis to grow the lot by a margin and round it to a baseplate. Those are
 * one operation each: a per-face signed offset, optionally in the face's
 * own frame, optionally rounded to a lattice.
 *
 * THE NAMES ARE boxContact's. `margin`, `marginMin` and `marginMax` mean
 * here exactly what they mean on boxContact's query — the min face moves
 * out by margin + marginMin, the max face by margin + marginMax, signed —
 * so a probe built as query margins there is the same three values here,
 * and moving it from one node to the other changes nothing but whether the
 * box is written.
 *
 * ONE VOCABULARY WITH placeBox: the same `frame` ("world" | "face", read
 * through faceFrame.ts), the same `snap` / `snapTo` / `snapMode` (through
 * latticeSnap.ts), the same `fit` words (boxFit.ts), and the same rule
 * that a box of no volume is kept. A missing frame attribute is refused
 * by name: the presence of an attribute never switches the meaning of a
 * number.
 *
 * NOTHING ELSE MOVES. Same points, same order, same seeds, every attribute
 * and the topology carried; only boundsMin/boundsMax are rewritten, in the
 * coordinates they hold (P, rot and scale are not read, as in splitBox).
 */
import { deriveGeometry } from "../data/derive.js";
import { makeGeometryItem } from "../graph/index.js";
import { type InsideOutWording, requireBoxColumns, requireCellBoxAxis, resolveWhere } from "./boxCells.js";
import { type FitWord, decodeFit, fitGlossary } from "./boxFit.js";
import { BOX_FRAMES, FACE_AXIS_NAMES, type FaceFrameColumns, decodeBoxFrame, decodeFaceFrame, readFaceFrame } from "./faceFrame.js";
import { BOX_SNAP_MODES, SNAP_TO, decodeBoxSnap, requireSnapSteps, snapBoxAxis, sumTol } from "./latticeSnap.js";
import type {
  OffsetBoxInputs,
  OffsetBoxOutputs,
  OffsetBoxParams,
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
export type { OffsetBoxParams } from "./params.generated.js";

const NODE = "offsetBox";

const FITS = ["error", "scale", "allow"] as const satisfies readonly FitWord[];
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Fit codes, decided once. */
const FIT_ERROR = 0;
const FIT_ALLOW = 2; // 1 is "scale"

/** A cell box this node cannot offset, in its words. */
const BOX_TAIL = 'so it has no face to move. Fix the setBounds that made it, or leave the cell out with "where".';
const BOX_INSIDE_OUT: InsideOutWording = {
  state: "ARRIVED inside out",
  tail: 'so its faces have no inside to move from. Fix the node that made it, leave the cell out with "where", or set "fit" to "allow" to offset it as it is.',
};

/** Every cell's box with each face moved out (or in) by a signed offset. */
export const offsetBox = standardNode<OffsetBoxParams, OffsetBoxInputs, OffsetBoxOutputs>({
  type: NODE,
  category: "point op",
  description: `MOVES THE FACES of every cell's box OUT, or IN where the offset is negative — the scope offset of a shape grammar, the padding of a bounding box, the inset/outset of a face extrude — and changes nothing else: same points, same order, same seeds, every attribute and the topology carried, only \`boundsMin\`/\`boundsMax\` rewritten. A CELL IS A POINT WITH A BOX, as in splitBox: its standard boundsMin/boundsMax, read and written in the coordinates they hold; P, rot and scale are not read, so a ROTATED cell is offset in its stored box exactly as an unrotated one. THE OFFSETS are boxContact's margins, with boxContact's names and meaning, applied to the box itself instead of to a query: \`margin\` moves BOTH faces of each axis out (the uniform shorthand — [0.5, 0.5, 0.5] pads the box half a unit all round, [-0.5, -0.5, -0.5] insets it, and a scalar FIELD broadcasts to all three), \`marginMin\` moves the face on the MIN side of each axis and \`marginMax\` the face on the MAX side, signed and on top of \`margin\`: the min face moves out by margin + marginMin, the max face by margin + marginMax, so marginMin -d with marginMax +d SHIFTS the box d, and a box name in a field reads the box as it ARRIVED (marginMax vec(0, 1 - box("y1"), 0) puts the top face at y = 1 wherever it was). All three are vec3, plain or fields resolved per cell. THE FRAME (\`frame\`, placeBox's) says what the three components are. "world" (the default): [x, y, z], min side = the boundsMin corner. "face": the cell's OWN axes [along, up, out], read from the frame shellSplit writes on every piece and splitBox carries onto every piece cut from one — \`alongAxisAttr\` (the axis code, 0 = x, 1 = y, 2 = z) and \`alongSignAttr\` for along, \`outwardAttr\` (the outward normal) for out, and up DERIVED as the axis that keeps along x up = out, shellSplit's right-handed frame, so it need not be written. In "face" the MIN side of a component is the end its axis runs FROM and the MAX side the end it runs TO: marginMax [0, 0, 1] pushes the OUTER face out one unit and marginMin [0, 0, 1] the inner face in, on every wall and the floor and ceiling alike — one rule for a sill standing out of whichever face is outside; marginMin [1, 0, 0] grows the LEFT end as seen from outside; marginMax [0, 1, 0] raises the top. The frame is SELECTED, never inferred from what attributes happen to be present: under "face" a missing frame attribute is refused, naming every one missing, and a cell whose outward normal is not one signed axis (exactly one nonzero component — shellSplit's interior, whose normal is zero, has no out) or whose along axis is not 0, 1 or 2, is the out axis, or has a zero sign, is refused naming the cell; under "world" the frame attributes are not read at all. SNAP (\`snap\`, a lattice step per WORLD axis [x, y, z], 0 = none, placeBox's) puts the offset box on a lattice afterwards, every face of each snapped axis. \`snapTo\` "lattice" (the default) moves each face onto the ABSOLUTE lattice anchored at 0, as splitBox's snap, so neighbouring cells agree on one lattice; "size" rounds the box's SIZE on that axis to a whole number of steps and keeps its CENTRE, so a footprint grown by a margin and then made a multiple of 8 stays centred on what it grew from (a baseplate of a stock size under a lot). \`snapMode\` is the same five words on every box node: "round" (the default) goes to the nearest line (or size; a half rounds up), "floor" and "ceil" move every face down or up the WORLD axis (the size down or up), "out" GROWS onto the lattice (min face down, max face up; size up), "in" SHRINKS onto it (the reverse; size down). A face within f32 precision of a line counts as on it. COLLAPSE (\`fit\`): an inset past the box's own size crosses the faces, and a box written inside out is a defect every box node downstream refuses, so the default "error" refuses the cook, naming the cell, the axis, the crossed faces and the offsets; "scale" shrinks the INWARD moves in proportion until the two faces meet (a face that moved out keeps its place, so a one-sided inset past the far face stops ON it), leaving a box of no volume on that axis — and after a lattice snap "in" the meeting point is that proportion, not a lattice line; "allow" writes the crossed box as computed, as setBounds would. ${fitGlossary(FITS)} Faces on an unsnapped axis that cross by no more than two f32 ulps at their coordinates, plus half an f32 ulp of each inward move (an f32 margin is that far from the decimal it was written as, so insets written to sum to the box meet), MEET under "error" and "scale", put on one stored number; a crossing any larger is a real one, and faces on a snapped lattice axis are lattice lines, so any crossing there is a whole step. Under \`snapTo\` "size" a size that rounds to no whole step leaves a box of no volume at its centre: that is not a crossing, so \`fit\` has nothing to settle. An input box already inside out, or not finite, is refused under "error" and "scale". \`where\` leaves chosen cells exactly as they arrived (0 = untouched, no offset, snap or check), e.g. attributeIs("piece", "sill"). The output keeps every point: a box offset to nothing is a box of no volume, never a dropped point. CPU ONLY, and not a GPU adopter, for boxContact's reason: the offsets decide comparisons — which lattice line a face lands on, whether two faces crossed — and a device-rounded offset one ulp off moves a face a whole lattice step. Use it where a setBounds rebuilt a corner from box("lo") or box("hi") plus an offset: the face moved is then named rather than reconstructed.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    margin: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far BOTH faces of each axis move OUT, per component — [x, y, z] under frame \"world\", [along, up, out] under \"face\" — in the box's own units: the uniform shorthand. [1, 1, 1] pads the box one unit all round, [-1, -1, -1] insets it, [2, 0, 2] grows a footprint two units each way and leaves its height. As a FIELD it is resolved per cell on the INPUT (box names read the box as it arrived) and a scalar broadcasts to all three components. Adds to marginMin and marginMax. Must be finite.",
    },
    marginMin: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the MIN-SIDE face of each axis moves OUT, on top of `margin`, signed (negative pulls it in): under frame \"world\" the face the boundsMin corner is on, so marginMin [0, 1, 0] lowers the floor one unit; under \"face\" the end each frame axis runs FROM — the left end along (as seen from outside, on a shellSplit wall), the bottom up, the INNER face out. With marginMax it can shift the box (marginMin -d, marginMax +d moves it d). boxContact's marginMin, with its meaning. As a FIELD it is resolved per cell on the input, and may read the box names. Must be finite.",
    },
    marginMax: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the MAX-SIDE face of each axis moves OUT, on top of `margin`, signed: under frame \"world\" the face the boundsMax corner is on; under \"face\" the end each frame axis runs TO — the right end along, the top up, the OUTER face out, so marginMax [0, 0, 1] stands a sill one unit out of whichever face of its wall is outside. boxContact's marginMax, with its meaning. As a FIELD it is resolved per cell on the input, and may read the box names: marginMax vec(0, 1 - box(\"y1\"), 0) puts the top at y = 1. Must be finite.",
    },
    frame: {
      type: "enum",
      enum: [...BOX_FRAMES],
      default: "world",
      description:
        "What the three components of the margins mean — placeBox's `frame`, with its meaning. \"world\": world axes [x, y, z], min side the boundsMin corner — the frame attributes are not read. \"face\": the cell's own axes [along, up, out] from the frame shellSplit writes (`alongAxisAttr`, `alongSignAttr`, `outwardAttr`; up is derived, completing the right-handed frame along x up = out), min side the end each axis runs from — so one offset reads the same on every wall, floor and ceiling of a shell. Selected here, never inferred: under \"face\" a missing frame attribute is refused, naming every one missing. Decided once per cook.",
    },
    alongAxisAttr: {
      type: "string",
      default: "alongAxis",
      description:
        "Read only under frame \"face\": the tuple-1 numeric point attribute holding each cell's ALONG axis code, 0 = x, 1 = y, 2 = z — shellSplit's `alongAxisAttr`, carried by splitBox onto every piece. Any other value, or the out axis itself, is refused naming the cell.",
    },
    alongSignAttr: {
      type: "string",
      default: "alongSign",
      description:
        "Read only under frame \"face\": the tuple-1 numeric point attribute holding the direction ALONG runs, its sign read (+1 or -1; shellSplit's `alongSignAttr`, left to right as seen from outside on a wall). Zero — what shellSplit leaves on a cell its `where` passed through — has no direction and is refused naming the cell, and so is a non-finite value.",
    },
    outwardAttr: {
      type: "string",
      default: "outward",
      description:
        "Read only under frame \"face\": the tuple-3 numeric point attribute holding each cell's OUTWARD normal — shellSplit's `outwardAttr`. It must be ONE signed axis (exactly one nonzero component; its sign is the side), which is what makes the out component of a margin a face of the box; shellSplit's interior, whose normal is [0, 0, 0], and any tilted normal, are refused naming the cell.",
    },
    snap: {
      type: "vec3",
      default: [0, 0, 0],
      min: 0,
      description:
        "A LATTICE STEP per WORLD axis [x, y, z] — in every frame, since a lattice is the world's — applied after the offset to every face of each axis whose step is not 0 (0 = no snapping, the default). How depends on `snapTo` and `snapMode`. splitBox's and placeBox's snap: snap [1, 0.4, 1] keeps a box on a brick lattice of 1-stud by 1-plate cells.",
    },
    snapTo: {
      type: "enum",
      enum: [...SNAP_TO],
      default: "lattice",
      description:
        "What `snap` rounds — placeBox's `snapTo`. \"lattice\": each face onto the ABSOLUTE lattice anchored at 0, as splitBox's snap, so neighbouring boxes share lines. \"size\": the box's SIZE on the axis to a whole number of steps, keeping its CENTRE — the box grows (or shrinks) equally at both faces, which is how a lot padded two studs each way becomes a stock 8-stud-multiple baseplate centred under it (margin [2, 0, 2], snap [8, 0, 8], snapTo \"size\", snapMode \"out\"). Under \"size\" an axis whose size is already negative is left for `fit`, and a size that rounds to no whole step is a box of no volume at its centre. Decided once per cook.",
    },
    snapMode: {
      type: "enum",
      enum: [...BOX_SNAP_MODES],
      default: "round",
      description:
        "Which way a face (or a size) lands on the `snap` lattice — the same five words on every box node. \"round\" (the default): the nearest line or size, a half rounding up. \"floor\" / \"ceil\": every face down / up the WORLD axis, both the same way (the size down / up). \"out\": the box GROWS onto it — the min face to the line at or below it, the max face to the line at or above it, the size up — so a padded box never loses what the offset gave it. \"in\": it SHRINKS onto it (the reverse), which can cross the faces of a box with no whole step inside it, for `fit` to settle. Ignored where the step is 0. Decided once per cook.",
    },
    fit: {
      type: "enum",
      enum: [...FITS],
      default: "error",
      description: `What happens when an inset (or an inward snap) crosses a box's two faces on an axis. "error" (the default) refuses the cook, naming the cell, the axis, the faces and the offsets — a box written inside out is refused by every box node downstream, so it is caught where it is made. "scale" shrinks the INWARD moves of the two faces in proportion until they meet, which leaves the box no volume on that axis — a symmetric inset past the middle stops at the centre, and a face that moved OUT keeps its place, so a one-sided inset past the far face stops on it. "allow" writes the crossed box as computed, as setBounds would. ${fitGlossary(FITS)} On an unsnapped axis, faces crossing by no more than two f32 ulps at their coordinates plus half an f32 ulp of each inward move MEET under "error" and "scale", on one stored number. An input box that is already inside out or not finite, and an offset that takes a face past what f32 bounds hold, are refused under "error" and "scale", and written as computed under "allow". Decided once per cook.`,
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        "Which cells are offset: nonzero offsets the cell, 0 leaves it EXACTLY as it arrived — no offset, no snap, no fit check, and its frame values not read (under frame \"face\" the frame attributes must still exist, so their columns can be looked up once). As a field it is resolved per cell, e.g. attributeIs(\"piece\", \"sill\"). A non-finite value is refused naming the cell.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: every string becomes a code here, and no
    // string reaches the per-cell loop.
    const faceFrame = decodeBoxFrame(NODE, params.frame);
    const fit = decodeFit(NODE, params.fit, FITS, {
      clamp: "a face offset has no cell to slide back into: its limit is the box's own other face, and \"scale\" is how two faces meet",
      clip: "faces move rather than being cut: a face's limit is the box's own other face, and to stop an inset there use \"scale\", which shrinks the inward moves in proportion until the faces meet (a one-sided inset meets on the far face)",
    });
    const snapRule = decodeBoxSnap(NODE, params.snapMode, params.snapTo);
    const snap = requireSnapSteps(NODE, params.snap);
    for (const name of ["margin", "marginMin", "marginMax"] as const) {
      requireFinitePlainParam(
        params[name],
        NODE,
        name,
        "An offset is a finite distance per axis (negative moves the face in). Write [0, 0, 0] for none.",
      );
    }
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to offset every cell, 0 to leave every cell as it is, or a field.");

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    // The input's corners, taken before the output's columns are made
    // writable: `deriveGeometry` shares columns copy-on-write, so these
    // stay the input's while the writable views below are the output's.
    const { lo, hi } = requireBoxColumns(NODE, srcSet, "in");

    // ---- per-cell values, resolved on the INPUT before anything is written
    const [mCol, minCol, maxCol] = (["margin", "marginMin", "marginMax"] as const).map((name) =>
      requireVec3Column(
        resolveOn(src, "point", params[name], seed, NODE, name),
        NODE,
        name,
        "cell",
        `an offset is a distance per ${faceFrame ? "frame axis [along, up, out]" : "axis [x, y, z]"} of the box`,
      ),
    );
    const offsets = resolveWhere(src, params.where, seed, NODE, "an offset-or-leave flag");

    const frameCols: FaceFrameColumns | undefined = faceFrame ? readFaceFrame(NODE, srcSet, params) : undefined;

    const out = deriveGeometry(src);
    const oLo = out.attrs.point.require("boundsMin").writable() as Float32Array;
    const oHi = out.attrs.point.require("boundsMax").writable() as Float32Array;

    // Per cell, in world axes: how far the min and the max face move out.
    const dMin = [0, 0, 0];
    const dMax = [0, 0, 0];
    // Per frame component c: its world axis and sign.
    const fAxis = [0, 0, 0];
    const fSign = [0, 0, 0];
    const snapped = [0, 0];

    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!offsets(i)) continue;

      if (frameCols === undefined) {
        for (let k = 0; k < 3; k++) {
          const sym = readComp(mCol, i, k);
          dMin[k] = sym + readComp(minCol, i, k);
          dMax[k] = sym + readComp(maxCol, i, k);
        }
      } else {
        decodeFaceFrame(NODE, frameCols, i, fAxis, fSign);
        for (let c = 0; c < 3; c++) {
          const sym = readComp(mCol, i, c);
          const fromEnd = sym + readComp(minCol, i, c);
          const toEnd = sym + readComp(maxCol, i, c);
          const k = fAxis[c];
          // A positive axis runs from the min face to the max face; a
          // negative one from the max face to the min face.
          if (fSign[c] > 0) {
            dMin[k] = fromEnd;
            dMax[k] = toEnd;
          } else {
            dMin[k] = toEnd;
            dMax[k] = fromEnd;
          }
        }
      }

      for (let k = 0; k < 3; k++) {
        const o = i * 3 + k;
        const l0 = lo[o];
        const h0 = hi[o];
        let l = l0 - dMin[k];
        let h = h0 + dMax[k];
        if (fit !== FIT_ALLOW) {
          requireCellBoxAxis(NODE, i, k, l0, h0, BOX_TAIL, BOX_INSIDE_OUT);
          // A finite offset can still overflow what a box stores: an f32
          // margin of 3e38 on a box at 1e38 is infinite, and so is a face
          // under it. Refused here rather than written as a box with no face.
          if (!Number.isFinite(Math.fround(l)) || !Number.isFinite(Math.fround(h))) {
            throw new Error(
              `${NODE}: cell ${i}'s box along ${AXIS_NAMES[k]} is offset past what f32 bounds hold — boundsMin ${l0} becomes ${l}, boundsMax ${h0} becomes ${h} (the offsets there are ${-dMin[k]} and ${dMax[k]}). Bound the offset, or set "fit" to "allow" to write it as computed.`,
            );
          }
        }
        // ---- snap, every face of a snapped axis
        const step = snap[k];
        const onLattice = step > 0 && !snapRule.toSize;
        if (step > 0) {
          snapBoxAxis(l, h, step, snapRule, snapped);
          l = snapped[0];
          h = snapped[1];
        }
        // ---- collapse
        if (fit !== FIT_ALLOW && Math.fround(l) > Math.fround(h)) {
          const cross = l - h;
          // Inward moves of each face, the snap's included; a face that
          // moved out moved in by nothing.
          const a = Math.max(0, l - l0);
          const b = Math.max(0, h0 - h);
          // To f32 precision at the faces' own coordinates, plus half an f32
          // ulp of each inward move, as shellSplit judges its two
          // thicknesses (sumTol): each margin is an f32 that sits up to half
          // an ulp from the decimal it was written as, so [-1084.5, 10]
          // inset by 1084.8 and 9.7 meets at 0.3 yet crosses by 4.9e-5, past
          // two ulps there. Never a share of the span, which let a real
          // over-inset of a long box meet silently. Lattice faces are
          // lattice lines: no tolerance there.
          const tol = onLattice ? 0 : sumTol(l, h, a, b);
          if (fit === FIT_ERROR && cross > tol) {
            const names = frameCols !== undefined ? faceNames(k, fAxis, fSign) : [`min (${AXIS_NAMES[k]}0)`, `max (${AXIS_NAMES[k]}1)`];
            throw new Error(
              `${NODE}: cell ${i}'s box COLLAPSES along ${AXIS_NAMES[k]} — its ${names[0]} face moved from ${l0} to ${l} and its ${names[1]} face from ${h0} to ${h}${step > 0 ? " (after the snap)" : ""}, crossing by ${cross}: ${step > 0 ? `the inward moves, the snap's included, are more than the box (${h0 - l0}) holds` : `the inset is larger than the box (${h0 - l0})`}. Set "fit" to "scale" (the faces meet, leaving a box of no volume there), "allow" (write it inside out, as setBounds would), bound the offset, e.g. max(<offset>, -0.5 * box("s${AXIS_NAMES[k]}")), or leave the cell out with "where".`,
            );
          }
          // Meet where the inward moves, shrunk in proportion, end. `a + b`
          // is positive: the input was not inside out, so only an inward
          // move can have crossed the faces.
          const m = l - (cross * a) / (a + b);
          l = m;
          h = m;
        }
        // + 0 turns a -0 into +0, as setBounds' box("lo") + offset does.
        oLo[o] = l + 0;
        oHi[o] = h + 0;
      }
    }
    return { out: [makeGeometryItem(out)] };
  },
});

/**
 * The two faces of world axis `k` under a face frame, as the error names
 * them: [the min-corner face, the max-corner face], each by its frame end.
 */
function faceNames(k: number, fAxis: readonly number[], fSign: readonly number[]): [string, string] {
  const c = fAxis.indexOf(k);
  const axis = FACE_AXIS_NAMES[c] ?? AXIS_NAMES[k];
  const from = c === 2 ? "inner" : c === 1 ? "bottom" : "start (left)";
  const to = c === 2 ? "outer" : c === 1 ? "top" : "end (right)";
  const pos = (fSign[c] ?? 1) > 0;
  return [`${pos ? from : to} ${axis} (${AXIS_NAMES[k]}0)`, `${pos ? to : from} ${axis} (${AXIS_NAMES[k]}1)`];
}
