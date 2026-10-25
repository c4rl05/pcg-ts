/**
 * `placeBox`: give every cell a new box placed INSIDE, or AGAINST, its own
 * box by size, anchor and offset per axis — the scope operations of a
 * shape grammar (size the scope, centre it, translate it in its own frame)
 * and a per-axis min / centre / max justify: a target box, and on each
 * axis an alignment fraction and a size that may be a fraction of the
 * target's.
 *
 * WHY IT IS NOT A SPLIT. A split can only divide what is there: every piece
 * of `splitBox` and `shellSplit` tiles its cell. A chimney stands in the air
 * beside the upper layers of a roof; a stud of trim one in from a wall's
 * left edge and flush with its outer face is neither a cut of the wall nor
 * of the air beside it. Both were spelled as a `setBounds` whose two
 * corners each repeated the whole placement — the side it hangs from, the
 * inset, the size — once per corner and, where the axis depends on the
 * cell, once per axis inside a `select`. Here the placement is said once,
 * per axis, and the node does the corner arithmetic.
 *
 * WHY IT IS NOT setBounds. setBounds writes a box known outright — two
 * corners, or (its `anchor`) a size about the point's P, which reads no
 * box at all and is how a grammar's first cell is made. A
 * placement is a different parameterization of the same box — relative to
 * the box the cell already has, in that box's frame — and folding a second
 * parameterization into setBounds behind a mode flag would give one node
 * two unrelated param sets. The output is setBounds' output, though: the
 * same points in the same order (a box of no volume is KEPT, never
 * dropped), every attribute and the topology carried, the SEED UNCHANGED,
 * P, rot and scale neither read nor written. So a placeBox drops in for the
 * setBounds it replaces, byte for byte, on a point cloud or a mesh.
 *
 * ONE BOX PER CELL. Several boxes per cell is a `repeatPoints` (or a
 * `splitBox`) upstream, which already writes the copy's index and count
 * and the copy's own seed; a field here reads them (`attribute("copy")` in
 * an offset). A count here would duplicate that, and its index and count
 * attributes would be the only ones in the library a copy-fan already
 * writes.
 *
 * THE FRAME is a param, never a guess, and offsetBox's: "box" reads
 * size, anchor and offset as [x, y, z] along the box's own axes; "face"
 * reads them as [along, up, out] in the frame `shellSplit` writes on every
 * face (see faceFrame.ts: along and outward read, up derived), so one
 * placement serves every wall.
 *
 * THE BOX IS LOCAL. A cell's boundsMin/boundsMax are an extent in its
 * point's own frame (world = P + rot * (scale * x)); the placement is
 * arithmetic on those stored numbers along the box's own axes, which any
 * such transform commutes with, so P, rot and scale are never read and the
 * placed box turns and moves with its point (tests/localBoxes.test.ts).
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { deriveGeometry } from "../data/derive.js";
import { makeGeometryItem } from "../graph/index.js";
import { requireBoxColumns, resolveWhere } from "./boxCells.js";
import { type FitWord, decodeFit, fitGlossary } from "./boxFit.js";
import { BOX_FRAMES, BOX_FRAME_RENAMED, FACE_AXIS_NAMES, type FaceFrameColumns, decodeBoxFrame, decodeFaceFrame, readFaceFrame } from "./faceFrame.js";
import { BOX_SNAP_MODES, SNAP_TO, coordTol, decodeBoxSnap, requireSnapSteps, snapBoxAxis } from "./latticeSnap.js";
import type {
  PlaceBoxInputs,
  PlaceBoxOutputs,
  PlaceBoxParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  readComp,
  refuseStandardPointName,
  requireFinitePlainParam,
  requireGeometry,
  requireReportSlot,
  requireVec3Column,
  resolveOn,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { PlaceBoxParams } from "./params.generated.js";

const NODE = "placeBox";

const UNITS = ["absolute", "relative"] as const;
const OFFSET_UNITS = ["absolute", "relative", "self"] as const;
const FITS = ["error", "allow", "clamp", "clip"] as const satisfies readonly FitWord[];
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Unit codes, decided once. */
const ABS = 0;
const REL = 1;
const SELF = 2;
/** Fit codes, decided once. */
const FIT_ERROR = 0;
const FIT_CLAMP = 2;
const FIT_CLIP = 3; // 1 is "allow": the box as placed

/**
 * `b` put on whichever of the cell's planes `cLo`, `cHi` is nearer, when
 * that one is within `tol`; otherwise `b` unchanged.
 */
function flush(b: number, cLo: number, cHi: number, tol: number): number {
  const dLo = Math.abs(b - cLo);
  const dHi = Math.abs(b - cHi);
  if (dLo <= dHi) return dLo <= tol ? cLo : b;
  return dHi <= tol ? cHi : b;
}

/** A cell's box re-placed by size, anchor and offset per axis, inside or against its own. */
export const placeBox = standardNode<PlaceBoxParams, PlaceBoxInputs, PlaceBoxOutputs>({
  type: NODE,
  category: "point op",
  description: `PLACES ONE BOX INSIDE, OR AGAINST, every cell's own box, by SIZE, ANCHOR and OFFSET on each axis, and writes it as the cell's new box: the scope operations of a shape grammar (size the scope, centre it, move it in its own frame) with a per-axis min / centre / max justify. It is for the box NO SPLIT MAKES — a chimney standing in the air beside a roof's upper layers, a stud of trim one in from a wall's left edge, a panel centred on a face — where a split can only divide what is there. A CELL IS A POINT WITH A BOX, as in splitBox: its standard \`boundsMin\`/\`boundsMax\`; the new box replaces it, and NOTHING ELSE CHANGES: the same points in the same order (a box of NO VOLUME is KEPT, never dropped), every attribute carried (strings included), the topology and the detail attributes carried, the SEED UNCHANGED, P, rotation and scale neither read nor written — the box is an extent in the point's OWN frame (world = P + rot * (scale * x)), so the placement is made along the box's own axes and the placed box turns and moves with its point, and the node drops in for the setBounds it replaces on a point cloud or a mesh. PER AXIS, in the cell's box: the placed box is \`size\` long (\`units\` "absolute", a length, or "relative", a fraction of the cell's extent on that axis: 1 fills it); its ANCHOR fraction lands on the cell's same fraction — anchor 0 puts its min side on the cell's min side, 1 its max side on the cell's max side, 0.5 its centre on the cell's centre, any value between them in proportion, so min = cellMin + anchor * (cellLength - size) — and then it moves by \`offset\` (\`offsetUnits\` "absolute", "relative" to the cell's extent, or "self", multiples of the placed box's own size). An anchor in 0..1 with a size no larger than the cell is INSIDE it; "self" makes AGAINST easy: anchor 1 with offset 1 self stands the box just outside the max side, its min on the cell's max — a box on top of its cell is anchor [0.5, 1, 0.5], offset [0, 1, 0], offsetUnits ["absolute", "self", "absolute"], fit "allow". THE FRAME is \`frame\`, offsetBox's, decided once per cook, never guessed: "box" reads every vec3 here as [x, y, z] along the box's own axes; "face" reads them as [ALONG, UP, OUT] in the frame shellSplit writes on every face and splitBox carries onto every piece cut from one — along from \`alongAxisAttr\`/\`alongSignAttr\`, out from the \`outwardAttr\` normal, and up DERIVED as the axis that keeps along x up = out (shellSplit's right-handed frame), so a facade that writes no up still has one. Min along is the LEFT as seen from outside, min up the bottom, and max out the OUTER FACE, so "one stud in from the left, flush to the outer face, one stud deep" is the same text on all four walls: anchor [0, 0, 1], offset [1, 0, 0], size [1, <height>, 1]. Offsets are along the frame's signed axes. The box names in a field keep the box's own axes (box("sx") is the x extent on every face), but "relative" units read the cell's extent on the FRAME axis. Under "face" a missing frame attribute is refused, naming every one that is missing; a cell with no frame (a shellSplit pass-through has axis -1; its interior has a zero normal) is refused naming the cell — skip it with \`where\`. EVERY VEC3 HERE (size, anchor, offset) is plain or a FIELD resolved on the cell, one value or three per cell, with the cell's box names, so a decision drawn once (a randomField in an offset, or an attribute set upstream) places the box — and the same decision read by two placeBox nodes places two boxes consistently, which is how a chimney and its shadow agree. A negative size counts as 0. SNAP (\`snap\`, a step per box axis, 0 = none) then puts the box on a lattice, by offsetBox's rule: \`snapTo\` "lattice" moves both corners onto the lattice anchored at 0 of the box's coordinates — the cell's P, in its own units — (splitBox's lattice, to f32 precision), "size" rounds the size to whole steps keeping the centre; \`snapMode\` "round" (the default) is the nearest line, "floor" and "ceil" down and up the axis, "out" GROWS the box onto the lattice and "in" SHRINKS it — a box with no whole step inside it shrinks to a box of no volume at its centre. Anchor 0.5 with snap 1 and snapMode "floor" is "as nearly centred as whole studs allow". FLUSH MEANS FLUSH: on an axis that is not snapped, a corner within two f32 ulps at the cell's coordinates (and, for a box with size, within a quarter of that size) of one of the cell's planes is put ON the nearer one; a snapped corner stays on its lattice line, and whether it is past the cell is judged on the stored f32 numbers. \`fit\` settles a box past its cell, axis by axis, after the snap: "error" (the default) refuses, naming the cell, the axis and the numbers; "allow" keeps the overhang (a box against the outside, a probe reaching past a face); "clamp" slides the box inside, keeping its size, and caps a box larger than its cell at the cell's extent; "clip" cuts away what overhangs — a chimney's shadow grown two studs every way and kept inside its roof — and a box wholly outside is cut to no volume on the plane it passed. Every box goes through \`fit\`, a box of no volume included. ${fitGlossary(FITS)} \`where\` passes chosen cells through with their box unchanged. \`labelAttr\` (opt-in) names a string attribute that receives \`label\` on every placed box, which is how one node both places a part and names it for applyRules or a material. CPU only: which cells are refused, and which lattice line a corner lands on, are comparisons per cell.`,
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    frame: {
      type: "enum",
      enum: [...BOX_FRAMES],
      default: "box",
      renamed: BOX_FRAME_RENAMED,
      description:
        'The axes `size`, `anchor`, `offset`, `units` and `offsetUnits` are written in — offsetBox\'s `frame`, with its meaning. "box" (the default): [x, y, z] along the box\'s own axes, positive up each axis, min the box\'s min corner; the frame attributes are not read ("box" was called "world"; that word is refused with the rename stated). "face": [along, up, out] in each cell\'s own frame, read from `alongAxisAttr`, `alongSignAttr` and `outwardAttr` — the frame shellSplit writes on every face — with up derived so that along x up = out. On a wall that makes component 0 run LEFT TO RIGHT AS SEEN FROM OUTSIDE, component 1 bottom to top, component 2 from the inner face to the OUTER face, so anchor 0 is the left, the bottom and the inner face, and anchor 1 the right, the top and the outer face. Under "face" a missing frame attribute is refused, naming every one missing. Decided once per cook. `snap` is always per box axis, whichever frame.',
    },
    alongAxisAttr: {
      type: "string",
      default: "alongAxis",
      description:
        'Read only with frame "face": the numeric tuple-1 point attribute holding each cell\'s ALONG axis code, 0 = x, 1 = y, 2 = z — shellSplit\'s `alongAxisAttr` default, carried by splitBox onto every piece. Any other value (shellSplit writes -1 on a cell it passed through), or the out axis itself, is refused naming the cell; `where` skips cells that have no frame.',
    },
    alongSignAttr: {
      type: "string",
      default: "alongSign",
      description:
        'Read only with frame "face": the numeric tuple-1 point attribute holding the direction along runs, +1 or -1 (its sign is read; 0 or non-finite is refused naming the cell) — shellSplit\'s `alongSignAttr` default, which makes along run left to right as seen from outside every wall.',
    },
    outwardAttr: {
      type: "string",
      default: "outward",
      description:
        'Read only with frame "face": the numeric tuple-3 point attribute holding each cell\'s OUTWARD normal — shellSplit\'s `outwardAttr` default. It must be ONE signed axis (exactly one nonzero component, its sign the side): that is the out axis, and up is derived from it and along. shellSplit\'s interior, whose normal is [0, 0, 0], and a tilted normal are refused naming the cell.',
    },
    size: {
      type: "vec3",
      default: [1, 1, 1],
      acceptsField: true,
      description:
        'The placed box\'s size per axis of the frame, read by `units`: a LENGTH ("absolute") or a FRACTION of the cell\'s extent on that axis ("relative"; 1 fills it). AS A FIELD it is resolved on the CELL, three components or one broadcast to all three, and the box names read the cell\'s box: vec(2, box("sy") - 3, 1). A negative size counts as 0, and a box with no size on an axis is KEPT as a box of no volume there. A non-finite value is refused naming the cell.',
    },
    units: {
      type: "stringList",
      default: ["absolute"],
      description:
        'How `size` is read: ONE entry for all three axes, or three, one per axis of the frame. "absolute" is a length; "relative" is a fraction of the cell\'s extent on that axis — on a frame axis, the extent along it — so ["relative", "absolute", "relative"] with size [1, 2, 1] is a slab 2 tall over the cell\'s whole footprint. Decided once per cook.',
    },
    anchor: {
      type: "vec3",
      default: [0.5, 0.5, 0.5],
      acceptsField: true,
      description:
        'Where the placed box sits in the cell, per axis of the frame, as a FRACTION: 0 lines its MIN side up with the cell\'s min side, 1 its MAX side with the cell\'s max side, 0.5 its centre with the cell\'s centre (the default: centred), and any fraction between in proportion — min = cellMin + anchor * (cellLength - size), a min / centre / max justify. In the "face" frame min is the left seen from outside, the bottom, and the inner face, so [0, 0, 1] is bottom left, flush to the outer face. A value outside 0..1 extrapolates, and `fit` settles any overhang. As a FIELD it is resolved on the cell, three components or one broadcast: vec(select(attribute("back"), 1, 0), 0, 0) hangs a box from the max side or the min side by a flag. A non-finite value is refused naming the cell.',
    },
    offset: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        'A move per axis of the frame after the anchor, read by `offsetUnits`, POSITIVE UP THE FRAME\'S SIGNED AXIS — in the "face" frame, rightward seen from outside, upward, and outward — so "one stud in from the left" is anchor 0 with offset 1, and one stud in from the right is anchor 1 with offset -1. AS A FIELD it is resolved on the cell, three components or one broadcast; a placement drawn once upstream (an attribute) or here (a randomField) lands here. A non-finite value is refused naming the cell.',
    },
    offsetUnits: {
      type: "stringList",
      default: ["absolute"],
      description:
        'How `offset` is read: ONE entry for all three axes, or three. "absolute" is a length; "relative" a fraction of the cell\'s extent on that axis; "self" multiples of the PLACED box\'s own size there — so anchor 1 with offset 1 "self" stands the box just outside the cell\'s max side, touching it, and anchor 0 with -1 "self" just outside the min side: placing AGAINST the cell rather than in it (with fit "allow"). Decided once per cook.',
    },
    fit: {
      type: "enum",
      enum: [...FITS],
      default: "error",
      description: `What a placed box past its cell does, axis by axis, after \`snap\`. "error" (the default) refuses the cook, naming the cell, the axis (and its frame name), the box and the cell: a placement that leaves the cell by accident is the defect worth refusing. "allow" keeps it as placed — a box against the outside, a sill standing out of a wall. "clamp" slides it back inside keeping its size, and a box larger than the cell on an axis is cut to the cell's extent there. "clip" cuts away what overhangs and keeps the rest; a box wholly outside is cut to no volume on the plane it passed, and kept. "Past" is to f32 precision: on an unsnapped axis a corner within two f32 ulps at the cell's coordinates of a plane is ON the plane; on a snapped one, the stored f32 corner is compared with the plane. Every box is checked, a box of no volume included. ${fitGlossary(FITS)} Decided once per cook.`,
    },
    snap: {
      type: "vec3",
      default: [0, 0, 0],
      min: 0,
      description:
        'A LATTICE STEP per box axis [x, y, z] (whichever `frame`), 0 for none — offsetBox\'s `snap`. How the placed box lands on it is `snapTo` and `snapMode`, applied after the placement and before `fit`; under `snapTo` "lattice" the lattice is anchored at 0 of the box\'s coordinates — the cell\'s P, in its own units — splitBox\'s `snap` lattice, so a cut and a placement on the same lattice share its lines. A corner within f32 precision of a line counts as on it. A snap can move a corner outside the cell (refused under fit "error"). On an integer lattice whose cells are integer, anchor 0.5 with snap [1, 1, 1] and snapMode "floor" places a box as nearly centred as whole units allow.',
    },
    snapTo: {
      type: "enum",
      enum: [...SNAP_TO],
      default: "lattice",
      description:
        'What `snap` rounds — offsetBox\'s `snapTo`. "lattice" (the default): both corners onto the ABSOLUTE lattice anchored at 0, so neighbouring boxes share lines. "size": the placed box\'s SIZE on the axis to a whole number of steps, keeping its CENTRE, so a centred box of a stock size stays centred where it was placed. Decided once per cook.',
    },
    snapMode: {
      type: "enum",
      enum: [...BOX_SNAP_MODES],
      default: "round",
      description:
        'How the box lands on the `snap` lattice — the same five words on every box node. "round" (the default): each corner to the nearest line (a half rounds up), or the size to the nearest whole step. "floor" / "ceil": each corner down / up the axis, both the same way, so a box a whole number of steps long keeps its size (the size rounds down / up). "out": the box GROWS onto the lattice — its min corner down, its max corner up (the size up). "in": it SHRINKS onto it, the reverse (the size down); a box with no whole step inside it becomes a box of no volume at its centre. Ignored where the step is 0. Decided once per cook.',
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        'Which cells are PLACED: nonzero places the box, 0 PASSES THE CELL THROUGH with its box, and everything else, unchanged (and no label written; a label column this node creates gives it ""). As a field it is resolved per cell, e.g. attributeIs("piece", "wall"). Under frame "face" the frame attributes must exist, but their values are read only where it is nonzero, so it is how cells with no frame are skipped. A non-finite value is refused naming the cell. A field `size`, `anchor` or `offset` is still resolved on EVERY cell, passed-through ones included, so it must be finite there too.',
    },
    labelAttr: {
      type: "string",
      default: "",
      description:
        'OPT-IN: name of a STRING point attribute (tuple 1) receiving `label` on every placed box — the part\'s name for applyRules, attributeIs or a material. Empty (the default) writes none. A REPORTING SLOT: an input column of the same shape is rewritten on placed boxes and kept on cells `where` passes through, one of another shape is refused, and a standard point attribute is refused by name.',
    },
    label: {
      type: "string",
      default: "",
      description:
        'The label written to `labelAttr` on every placed box (ignored when `labelAttr` is empty), e.g. "chimney". One string for the node; a label that varies per cell is a setAttribute with `values` after this.',
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: every string is turned into a code here,
    // and no string reaches the per-cell loop.
    const local = decodeBoxFrame(NODE, params.frame);
    const compNames: readonly string[] = local ? FACE_AXIS_NAMES : AXIS_NAMES;

    const unitCodes = (param: "units" | "offsetUnits", allowed: readonly string[], fix: string): Uint8Array => {
      const list = params[param];
      if (!Array.isArray(list) || (list.length !== 1 && list.length !== 3)) {
        throw new Error(
          `${NODE}: param "${param}" is ${JSON.stringify(list)}; give ONE unit for all three axes or THREE, one per axis of the frame (${compNames.join(", ")}), each one of ${allowed.join(", ")} — e.g. ${fix}.`,
        );
      }
      const codes = new Uint8Array(3);
      for (let c = 0; c < 3; c++) {
        const raw = list.length === 1 ? list[0] : list[c];
        const u = canonicalOneOf(allowed, raw);
        if (u === undefined) {
          throw new Error(
            `${NODE}: param "${param}" entry ${list.length === 1 ? 0 : c}${list.length === 1 ? "" : ` (axis ${compNames[c]})`} is ${JSON.stringify(raw)}; valid: ${allowed.join(", ")}.`,
          );
        }
        codes[c] = u === "absolute" ? ABS : u === "relative" ? REL : SELF;
      }
      return codes;
    };
    const sizeUnit = unitCodes("units", UNITS, '["absolute"] or ["relative", "absolute", "relative"]');
    const offUnit = unitCodes("offsetUnits", OFFSET_UNITS, '["absolute"] or ["absolute", "self", "absolute"]');

    const fit = decodeFit(NODE, params.fit, FITS, {
      scale: 'a placed box has a size of its own and nothing to rescale it against; bound the size instead, e.g. min(<size>, box("sx")), or use "clamp" or "clip"',
    });
    const snapRule = decodeBoxSnap(NODE, params.snapMode, params.snapTo);
    const snap = requireSnapSteps(NODE, params.snap);
    requireFinitePlainParam(params.size, NODE, "size", "A size is a finite number per axis (a negative one counts as 0). Write a plain [a, b, c], or bound the expression.");
    requireFinitePlainParam(params.anchor, NODE, "anchor", "An anchor is a fraction per axis: 0 the min side, 0.5 the centre, 1 the max side.");
    requireFinitePlainParam(params.offset, NODE, "offset", "An offset is a finite number per axis.");
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to place every cell's box, 0 to pass every cell through, or a field.");
    if (typeof params.label !== "string") {
      throw new Error(`${NODE}: param "label" is ${JSON.stringify(params.label)}; it is one string, written to labelAttr on every placed box.`);
    }

    const labelName = params.labelAttr;
    refuseStandardPointName(NODE, "labelAttr", labelName, "piece");

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    const { lo, hi } = requireBoxColumns(
      NODE,
      srcSet,
      "in",
      "a cell's box is the standard f32 tuple-3 pair boundsMin/boundsMax, and the box is placed inside it. Give the cells their boxes with setBounds first.",
    );
    if (labelName !== "") {
      requireReportSlot({ attrs: srcSet, nodeType: NODE, param: "labelAttr", name: labelName, type: "string", tupleSize: 1, domain: "point", suggestion: "placedLabel" });
    }

    // ---- per-cell values, resolved on the CELLS
    const places = resolveWhere(src, params.where, seed, NODE, "a place-or-pass-through flag");
    const vecParam = (param: "size" | "anchor" | "offset", what: string) => {
      const col = resolveOn(src, "point", params[param], seed, NODE, param);
      return requireVec3Column(col, NODE, param, "cell", what);
    };
    const sizeCol = vecParam("size", "a size per axis of the frame");
    const anchorCol = vecParam("anchor", "an anchor fraction per axis of the frame");
    const offsetCol = vecParam("offset", "an offset per axis of the frame");

    // The frame columns, looked up once by name (never per cell).
    const frameCols: FaceFrameColumns | undefined = local ? readFaceFrame(NODE, srcSet, params) : undefined;

    // ---- the output: the input's points, topology and every attribute,
    // shared until written; only the two corners (and the label) change.
    const out = deriveGeometry(src);
    const outSet = out.attrs.point;
    const oLo = outSet.require("boundsMin").writable() as Float32Array;
    const oHi = outSet.require("boundsMax").writable() as Float32Array;
    const labelOut = labelName !== "" ? (outSet.get(labelName) ?? outSet.add(labelName, "string", 1, "")) : undefined;
    const oLabel = labelOut !== undefined ? (labelOut.writable() as Uint32Array) : undefined;
    const labelCode = labelOut !== undefined ? labelOut.internString(params.label) : 0;

    const boxAxis = [0, 1, 2];
    const boxSign = [1, 1, 1];
    const sizeOf = [0, 0, 0];
    const offOf = [0, 0, 0];
    const bLoOf = [0, 0, 0];
    const bHiOf = [0, 0, 0];
    const snapped = [0, 0];
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!places(i)) continue; // passed through: the derived box, as it came
      for (let a = 0; a < 3; a++) {
        const cLo = lo[i * 3 + a];
        const cHi = hi[i * 3 + a];
        if (!Number.isFinite(cLo) || !Number.isFinite(cHi) || !(cHi >= cLo)) {
          throw new Error(
            `${NODE}: cell ${i}'s box is ${!(Number.isFinite(cLo) && Number.isFinite(cHi)) ? "not finite" : "inside out"} along ${AXIS_NAMES[a]} — boundsMin ${cLo}, boundsMax ${cHi} — so there is no box to place in. Fix the node that made it, or pass the cell through with "where".`,
          );
        }
      }
      if (frameCols !== undefined) decodeFaceFrame(NODE, frameCols, i, boxAxis, boxSign);
      // First the placement on all three axes, snapped or made flush.
      for (let c = 0; c < 3; c++) {
        const w = boxAxis[c];
        const sg = boxSign[c];
        const cLo = lo[i * 3 + w];
        const cHi = hi[i * 3 + w];
        const len = cHi - cLo;
        const sRaw = readComp(sizeCol, i, c);
        const s = Math.max(0, sizeUnit[c] === REL ? sRaw * len : sRaw);
        const oRaw = readComp(offsetCol, i, c);
        const off = offUnit[c] === ABS ? oRaw : offUnit[c] === REL ? oRaw * len : oRaw * s;
        // In the frame's signed coordinate t = sign * x (the box coordinate): the cell spans
        // [tLo, tLo + len], the box starts anchor * (len - s) in from tLo.
        const tLo = sg > 0 ? cLo : -cHi;
        const t0 = tLo + readComp(anchorCol, i, c) * (len - s) + off;
        const t1 = t0 + s;
        let bLo = sg > 0 ? t0 : -t1;
        let bHi = sg > 0 ? t1 : -t0;
        if (snap[w] > 0) {
          // A snapped corner STAYS on its lattice line: no flush on this
          // axis. Only "in" can cross the corners (no whole step inside
          // the box): they meet at the box's OWN centre, as placed before
          // the snap — never the middle of the step the snap left, which
          // can lie outside the cell — a box of no volume.
          const centre = 0.5 * (bLo + bHi);
          snapBoxAxis(bLo, bHi, snap[w], snapRule, snapped);
          bLo = snapped[0];
          bHi = snapped[1];
          if (bHi < bLo) bLo = bHi = centre;
        } else {
          // Flush to f32 precision IS flush: a corner within two f32 ulps
          // at the cell's coordinates of one of its planes goes onto the
          // NEARER one. Tied to the coordinates' own precision, so a
          // deliberate offset any larger is never erased and a real
          // overhang any larger is never accepted; and never more than a
          // quarter of the box's own size, so a small box in a long cell,
          // or one set against a thin cell, is not pulled onto a plane it
          // is not at. A box of no volume has no size to protect: both
          // corners move together, so it gets the plain tolerance.
          const ulpTol = coordTol(cLo, cHi);
          const tol = bHi > bLo ? Math.min(ulpTol, (bHi - bLo) / 4) : ulpTol;
          bLo = flush(bLo, cLo, cHi, tol);
          bHi = flush(bHi, cLo, cHi, tol);
        }
        bLoOf[c] = bLo;
        bHiOf[c] = bHi;
        sizeOf[c] = s;
        offOf[c] = off;
      }
      // Then `fit`, axis by axis, on every box — one of no volume included.
      // "Past" compares the corner AS STORED with the cell's stored plane.
      for (let c = 0; c < 3; c++) {
        const w = boxAxis[c];
        const cLo = lo[i * 3 + w];
        const cHi = hi[i * 3 + w];
        let bLo = bLoOf[c];
        let bHi = bHiOf[c];
        const pastLo = Math.fround(bLo) < cLo;
        if (pastLo || Math.fround(bHi) > cHi) {
          if (fit === FIT_ERROR) {
            const past = pastLo ? cLo - bLo : bHi - cHi;
            throw new Error(
              `${NODE}: cell ${i}'s placed box OVERHANGS the cell along ${AXIS_NAMES[w]}${local ? ` (the frame's ${FACE_AXIS_NAMES[c]} axis)` : ""} by ${past} — the box spans ${bLo} to ${bHi}, the cell ${cLo} to ${cHi} (size ${sizeOf[c]}, anchor ${readComp(anchorCol, i, c)}, offset ${offOf[c]}${snap[w] > 0 ? `, snapped to ${snap[w]}` : ""}). Set "fit" to "allow" (keep it: a box against or through the cell's side), "clamp" (slide it inside, keeping its size) or "clip" (cut away what overhangs), or bound the size and offset, e.g. min(<size>, box("s${AXIS_NAMES[w]}")).`,
            );
          }
          if (fit === FIT_CLAMP) {
            const sz = bHi - bLo;
            if (sz >= cHi - cLo) {
              bLo = cLo;
              bHi = cHi;
            } else if (pastLo) {
              bLo = cLo;
              bHi = cLo + sz;
            } else {
              bHi = cHi;
              bLo = cHi - sz;
            }
          } else if (fit === FIT_CLIP) {
            // Cut at the planes; a box wholly outside is cut to no volume
            // on the plane it passed, never turned inside out.
            bLo = Math.min(Math.max(bLo, cLo), cHi);
            bHi = Math.max(Math.min(bHi, cHi), cLo);
          }
          // "allow": as placed.
        }
        oLo[i * 3 + w] = bLo;
        oHi[i * 3 + w] = bHi;
      }
      if (oLabel) oLabel[i] = labelCode;
    }
    return { out: [makeGeometryItem(out)] };
  },
});
