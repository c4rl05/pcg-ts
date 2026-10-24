/**
 * `splitBox`: cut every cell's box along one axis into an ordered list of
 * labelled pieces, one output point per piece.
 *
 * WHAT IT REPLACES. A split used to be spelled as two nodes: a
 * `repeatPoints` fanning each cell out into as many copies as it has
 * pieces, then a `setBounds` rewriting every copy's box with a
 * `choose(slot, ...)` per corner — the cut positions written out as
 * corners, once per piece, in a field nobody could read back as "a
 * plinth, three storeys and a ceiling". Here the pieces are SIZES and the
 * node does the arithmetic, the snapping and the bookkeeping.
 *
 * WHAT IT DOES NOT DO, and that is the point of it. PLAN.md declined a
 * box-split node on 2026-09-08 because a node that owned the recursion
 * would have to own the STOP RULE, and node params are values, not
 * expressions. This one only CUTS: one level, one axis, per cook. A
 * recursive subdivision is an `applyRules` around it, and a staged grammar
 * is several of them chained, which is where the stop rule and the staging
 * already live.
 *
 * SEEDS ARE repeatPoints' SEEDS. Piece k of a cell whose seed is s gets
 * hashCombine(s, k), with k the piece's SLOT ordinal — dropped and gap
 * slots counted — so a split is seed-identical to the repeatPoints +
 * setBounds pair that keeps its zero-size copies, and no node identity
 * enters a child's seed.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { STANDARD_POINT_ATTRS } from "../data/index.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashFinalize, hashMix, hashSeed } from "../random/hash.js";
import type {
  SplitBoxInputs,
  SplitBoxOutputs,
  SplitBoxParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  copyElements,
  gatherPoints,
  requireFinitePlainParam,
  requireGeometry,
  requireReportSlot,
  requireScalarColumn,
  resolveOn,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { SplitBoxParams } from "./params.generated.js";

const NODE = "splitBox";

/**
 * Ceiling on the points one `splitBox` may emit, across the whole input:
 * repeatPoints' ceiling, for repeatPoints' reason — a repeat segment's
 * count is a field-derived allocation (`rest / module`, and a module of
 * 1e-6 is one keystroke away), so the cap is the post-resolution check a
 * fielded allocation owes. Checked on the running TOTAL, and on a single
 * repeat's count before anything is laid out for it.
 */
const MAX_SPLIT_POINTS = 1 << 22;

const AXES = ["x", "y", "z", "perCell"] as const;
const UNITS = ["absolute", "relative", "repeat"] as const;
const ROUNDS = ["floor", "round", "ceil"] as const;
const FITS = ["error", "clip", "scale"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Unit codes, decided once from the `units` strings. */
const ABS = 0;
const REL = 1;
const REP = 2;
/** Rounding codes (`repeatRound`, `snapMode`), decided once. */
type RoundCode = 0 | 1 | 2; // floor | round | ceil
/** Fit codes, decided once. */
const FIT_ERROR = 0;
const FIT_CLIP = 1;
const FIT_SCALE = 2;

/**
 * A size tolerance: `fit` compares sums of f32-resolved sizes against an
 * f32-stored box, so "exactly fills" has to mean "fills to f32 precision",
 * or `[0.1, 0.2, 0.7]` on a box of 1 would be an overflow of 1.5e-8.
 */
const FIT_EPS = 1e-6;
/**
 * How many f32 ulps "on a line" or "at the box's end" may be off by. Bounds
 * are stored f32, so a box edge typed as 1.2 is 1.2000000477, and on a 0.4
 * lattice that must snap to 1.2 under `ceil` rather than to 1.6. The
 * tolerance is in ULPS OF THE COORDINATE, not relative to the step count
 * or the coordinate's size: a relative one widened with the distance from
 * the origin until, past 1e6, every cut counted as on a line and floor and
 * ceil both became round, and a real 0.05-long piece at x = 1e5 was taken
 * for the box's end and swallowed.
 */
const ULP_TOL = 2;

/** One f32 ulp at the magnitude of `x` (the smallest normal's at 0). */
function f32Ulp(x: number): number {
  const a = Math.abs(x);
  if (!(a > 1.1754943508222875e-38)) return 1.401298464324817e-45;
  return Math.pow(2, Math.floor(Math.log2(a)) - 23);
}

function roundBy(code: RoundCode, x: number): number {
  return code === 0 ? Math.floor(x) : code === 1 ? Math.round(x) : Math.ceil(x);
}

/**
 * The seed of slot `k` of a cell: `hashCombine(cellSeed, k)`, spelled out
 * as repeatPoints spells it so the inner loop does not allocate the
 * variadic form's rest array. `h1` is `hashMix(hashSeed(2), cellSeed)`,
 * folded once per CELL; the test file pins it to hashCombine.
 */
function slotSeed(h1: number, k: number): number {
  return hashFinalize(hashMix(h1, k));
}

/** A cell's box along the split axis, cut: `lo`/`hi` per emitted piece. */
interface Layout {
  /** Piece boundaries, one per slot end (slot k spans ends[k-1]..ends[k]). */
  ends: Float64Array;
  /** The segment each slot came from. */
  segOf: Int32Array;
  /** Slots in the current cell. */
  slots: number;
}

function snapToLattice(b: number, step: number, mode: RoundCode): number {
  const q = b / step;
  const r = Math.round(q);
  // On the line already, to f32 precision — a few ulps of the coordinate,
  // and never more than a quarter step: no rounding mode may move it.
  const tol = Math.min(ULP_TOL * f32Ulp(b), step / 4);
  if (Math.abs(b - r * step) <= tol) return r * step;
  return roundBy(mode, q) * step;
}

/** Each cell's box cut along one axis into labelled pieces, every attribute carried. */
export const splitBox = standardNode<SplitBoxParams, SplitBoxInputs, SplitBoxOutputs>({
  type: NODE,
  category: "point op",
  description:
    "CUTS every cell's box along one axis into an ordered list of LABELLED PIECES and emits one point per piece — the split of a split grammar (a block into storeys, a wall into bays, a bay into jamb | opening | jamb). A CELL IS A POINT WITH A BOX: its standard `boundsMin`/`boundsMax`, cut in the coordinates they hold; P, rotation and scale are not read and nothing is moved, so every piece sits where its cell sat and only its box differs. THE PIECES are three parallel lists, one entry per SEGMENT in order from the box's MIN side: `labels` (the name each piece is given), `sizes` (a number each, or a field of that many components resolved on the parent cell) and `units` — \"absolute\" is that length; \"relative\" is a weighted share of the REST, what the absolute segments leave; \"repeat\" cuts the rest into max(1, <repeatRound>(rest / size)) EQUAL pieces of about `size` each (`repeatRound` is floor, round or ceil; floor by default), so `labels [\"bay\"], sizes [4], units [\"repeat\"]` gives a 10-long wall two bays of 5. A LABEL OF \"\" IS A GAP: it takes its space and emits nothing. A PIECE OF ZERO SIZE IS DROPPED — that is how an absent sill or lintel disappears without a branch. `snap` puts every interior cut on a lattice, `fit` says what happens when absolute sizes do not fit, and `where` passes chosen cells through UNSPLIT, which is how a nested split stays one node per level: split y into under | band | over, then split x WHERE attributeIs(\"piece\", \"band\"), and the under and over pieces ride through untouched. THIS NODE ONLY CUTS, ONE LEVEL: recursion is an applyRules around it (each label a rule, the stop a relabel to a label with no rule), staging is several of it chained, and any decision the children must agree on is made on the PARENT — a field in `sizes` is resolved once per cell, before the cut, so a random cut position drawn there is the same for both halves. Every POINT ATTRIBUTE IS CARRIED onto every piece, strings included, exactly as repeatPoints carries them, and the DETAIL attributes come through unchanged; TOPOLOGY IS DROPPED. OUTPUT ORDER is cell-major, each cell's pieces min side first. `direction` turns a cell's list round: a NEGATIVE direction lays the segments from the MAX side instead (the first label at the max end, slot 0 there), which is how one split cuts a wall from the left as seen from outside whichever way it faces — direction attribute(\"alongSign\") on shellSplit's walls. SEEDS: the piece in slot k of a cell with seed s gets hashCombine(s, k) — repeatPoints' copy-k seed — where k counts EVERY slot of the cell's expanded list, dropped and gap slots included, so a piece's seed does not move when a sibling vanishes, and splitBox is seed-identical to repeatPoints(count = slots) followed by setBounds. No node identity enters a piece's seed; the node's own seed reaches only the fields it resolves (a randomField in `sizes`). A cell can emit NOTHING (a zero-length box, or nothing but gaps), and the output is capped at 4194304 points in all, refused past that naming the cell the total ran out on. The seed identity holds PER LEVEL: a nested split seeds its inner pieces hashCombine(hashCombine(s, j), k), so it is not seed-identical to one flat repeatPoints over all the pieces. CPU only, like repeatPoints: piece counts and drops are comparisons.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    axis: {
      type: "enum",
      enum: [...AXES],
      default: "x",
      description:
        'The axis every cell is cut along: "x", "y" or "z" — a component of the cell\'s boundsMin/boundsMax, not a direction in the cell\'s rotated frame. "perCell" reads the axis PER CELL from `axisIndex` instead, for a split whose direction is the cell\'s own — a wall cut along its run, which is x for a south wall and z for an east one. Decided once per cook; with "perCell" only numbers are read per cell.',
    },
    axisIndex: {
      type: "f32",
      default: 0,
      min: 0,
      max: 2,
      acceptsField: true,
      description:
        'Read ONLY when `axis` is "perCell" (ignored otherwise): the axis each cell is cut along, 0 = x, 1 = y, 2 = z. As a field it is resolved on the input\'s point domain, ONE AXIS PER CELL, e.g. select(attribute("alongX"), 0, 2) or 2 * lt(<span x>, <span z>) for "the longer floor axis". Rounded to nearest; a value that rounds to anything but 0, 1 or 2, or is not finite, is refused naming the cell.',
    },
    labels: {
      type: "stringList",
      default: ["a", "b"],
      description:
        'One label per SEGMENT, in order from the box\'s MIN side; the list\'s length is the segment count, and `sizes` and `units` must have the same length. Each piece is written this label in `labelAttr`; a repeat segment gives all of its pieces the same one. Labels may repeat (["jamb", "opening", "jamb"]). An EMPTY label "" makes the segment a GAP: it takes its space along the axis and emits nothing — a margin, or the ceiling plate a storey split leaves to someone else. At least one segment.',
    },
    sizes: {
      type: "numberList",
      default: [1, 1],
      acceptsField: true,
      description:
        'One size per segment, read by its unit: a LENGTH for "absolute", a WEIGHT for "relative", the MODULE (the length one piece aims for) for "repeat". Plain, a list of numbers: [1, 3, 1]. AS A FIELD it is resolved on the PARENT CELL and must have ONE COMPONENT PER SEGMENT — build it with vec(...), which concatenates any number of components: vec(sub(attribute("sill"), box("y0")), 3, 1). The BOX NAMES (box("y0"), box("sy"), box("center") and the rest) read the box of the PARENT cell here, so a size can be a share of the cell it cuts — vec(box("sy") * 0.25, 1) — and the sizes of a nested split read the piece the split before it made. A field is where a per-cell decision goes, and since it is resolved once per cell before the cut, every piece agrees on it (a randomField drawn here cuts both halves at one coordinate). A NEGATIVE size counts as 0 (nothing, and dropped), like repeatPoints\' count; a non-finite one is refused naming the cell; a repeat MODULE must be > 0 and is refused otherwise, since "pieces of size 0" has no count.',
    },
    units: {
      type: "stringList",
      default: ["relative", "relative"],
      description:
        'One unit per segment: "absolute" (the size is a length along the axis), "relative" (a weighted share of the REST — the box length less every absolute segment — so sizes [2, 1] with both relative cut the rest 2:1), or "repeat" (the rest cut into n EQUAL pieces, n = max(1, <repeatRound>(rest / size)), so "bays of about 4" on a 10-long wall is 2 bays of 5 with "floor"). At most ONE "repeat" per split, and not together with a "relative": both would claim the rest, so the pair is refused rather than given a rule. Decided once per cook.',
    },
    repeatRound: {
      type: "enum",
      enum: [...ROUNDS],
      default: "floor",
      description:
        'How a "repeat" segment\'s count rounds: n = max(1, <mode>(rest / module)). "floor" never makes a piece shorter than the module (as many WHOLE modules as fit, the remainder shared out), "ceil" never makes one longer, "round" is nearest with a half rounding up. A rest of 0 still gives n = 1, a piece of size 0, which is dropped.',
    },
    snap: {
      type: "vec3",
      default: [0, 0, 0],
      min: 0,
      description:
        'A LATTICE STEP per axis [x, y, z]; the component of the axis a cell is cut along applies to it, and 0 means no snapping. Every INTERIOR cut is moved onto a multiple of the step on an ABSOLUTE lattice anchored at 0 — the cell\'s own min and max are never moved, so the pieces tile the cell exactly (except under `fit` "clip", where an underfill leaves the far end uncovered and the end of the covered run is snapped like any interior cut) — and is then clamped into the cell. Absolute rather than cell-relative, so two neighbouring cells agree on one lattice (a packer\'s). A cut within f32 precision of a lattice line counts as on it, so a box edge stored as 1.2000000477 stays on a 0.4 lattice. Snapping can shrink a piece to nothing, and that piece is dropped. On an integer lattice whose cells are already integer, snap [1, 1, 1] with snapMode "floor" turns a repeat into u0 + floor(k * length / n) — whole-number bays.',
    },
    snapMode: {
      type: "enum",
      enum: [...ROUNDS],
      default: "round",
      description:
        'How an interior cut lands on the `snap` lattice: "round" to the nearest line (a half rounds up), "floor" to the line at or below it, "ceil" to the line at or above it. Ignored where the step is 0.',
    },
    fit: {
      type: "enum",
      enum: [...FITS],
      default: "error",
      description:
        'What happens when the absolute sizes do not fit the box. OVERFLOW (absolute sizes past the box length): "error" refuses the cook, naming the cell, the segment where the running total passed the box, and the numbers; "clip" lays the segments from the min side and cuts the one that crosses the max end there, dropping the rest; "scale" scales every absolute size down to fill the box exactly. The relative and repeat segments get nothing either way. UNDERFILL (no relative or repeat segment to take the rest, and the absolute sizes short of the box): "error" refuses, "clip" leaves the rest of the box UNCOVERED at the max end, "scale" scales the absolute sizes up to fill it. Relative segments whose weights are ALL 0 on a cell take nothing, so that cell counts as having no flexible segment. The default is strict because a cut that silently loses area is the defect worth refusing: a relative segment of weight 1 at the end is the usual way to say "and the rest".',
    },
    direction: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        'Which END of the box the segment list starts from. POSITIVE (the default, and 0) lays it from the MIN side, as every other param here describes. NEGATIVE lays it from the MAX side: the first label sits at the max end and is slot 0, a repeat counts from there, `fit` "clip" cuts at the MIN end and an underfill leaves the min end uncovered — the same split mirrored, with the same seeds per slot. As a field it is resolved per cell, so one node can cut every wall of a shell from its own start: shellSplit writes `alongSign` (+1 or -1) so that, seen from outside, along runs left to right on every wall, and direction attribute("alongSign") with axisIndex attribute("alongAxis") puts slot 0 at the left of each. Read only its sign; a non-finite value is refused naming the cell.',
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        'Which cells are SPLIT: nonzero splits the cell, 0 PASSES IT THROUGH UNSPLIT — emitted once, exactly as it arrived, its seed and box unchanged and any label, index or count it already carried in `labelAttr`, `indexAttr` and `countAttr` kept (a column this node creates gives it the column\'s default: "", -1, 0). As a field it is resolved per cell, e.g. attributeIs("piece", "band"): a nested split — the band of a y split cut again in x — is then one more splitBox, with no filter and no merge, and the pieces keep their order. A non-finite value is refused naming the cell.',
    },
    labelAttr: {
      type: "string",
      default: "piece",
      description:
        'Name of the STRING point attribute (tuple 1) receiving each piece\'s label — what a downstream node dispatches on: attributeIs("piece", "window"), a byAttribute, a spawnInstances asset key. A REPORTING SLOT like repeatPoints\' indexAttr: an input column of the same shape is rewritten on the split pieces (and kept on cells `where` passes through, which is how a nested split relabels only what it cut), one of another shape is refused, and a standard point attribute is refused by name. Empty writes no label.',
    },
    indexAttr: {
      type: "string",
      default: "pieceIndex",
      description:
        'Name of the i32 point attribute (tuple 1) receiving each piece\'s SLOT index: its position in its cell\'s expanded segment list, a repeat counting each of its pieces, from 0 at the min side. Dropped and gap slots are COUNTED, so the numbers need not be contiguous: the opening of an under | sill | opening split is slot 2 whether or not the sill had any height. That is the index the seed is hashed with. A repeat-only split numbers its pieces 0 .. n - 1, exactly as repeatPoints numbers copies. A reporting slot on the same terms as `labelAttr` (default -1 on a column this node creates). Empty writes none.',
    },
    countAttr: {
      type: "string",
      default: "",
      description:
        'OPT-IN: name of an i32 point attribute (tuple 1) receiving, on every piece, its cell\'s SLOT COUNT — the length of the expanded segment list, dropped and gap slots included, so index < count always and a repeat-only split writes n, its piece count. Empty (the default) writes none. A reporting slot on the same terms as `labelAttr` (default 0 on a column this node creates). Must differ from `indexAttr`.',
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: every string is turned into a code here,
    // and no string reaches a per-cell loop.
    const axisName = canonicalOneOf(AXES, params.axis);
    if (axisName === undefined) {
      throw new Error(`${NODE}: param "axis" is ${JSON.stringify(params.axis)}; valid: ${AXES.join(", ")}.`);
    }
    const fixedAxis = axisName === "perCell" ? -1 : AXIS_NAMES.indexOf(axisName as "x" | "y" | "z");

    const labels = params.labels;
    if (!Array.isArray(labels)) {
      throw new Error(
        `${NODE}: param "labels" is ${JSON.stringify(labels)}, not a list; give one label per piece, in order from the min side, e.g. ["under", "band", "over"].`,
      );
    }
    const N = labels.length;
    if (N === 0) {
      throw new Error(
        `${NODE}: param "labels" is empty; a split needs at least one segment. Give one label per piece, in order from the min side, e.g. ["under", "band", "over"].`,
      );
    }
    const unitsIn = params.units;
    if (unitsIn.length !== N) {
      throw new Error(
        `${NODE}: param "units" has ${unitsIn.length} entr${unitsIn.length === 1 ? "y" : "ies"} but "labels" has ${N} (${JSON.stringify(labels)}); give one unit per segment, each one of ${UNITS.join(", ")}.`,
      );
    }
    const unit = new Uint8Array(N);
    let repeatSeg = -1;
    let anyRel = false;
    for (let j = 0; j < N; j++) {
      const u = canonicalOneOf(UNITS, unitsIn[j]);
      if (u === undefined) {
        throw new Error(
          `${NODE}: param "units" entry ${j} (segment "${labels[j]}") is ${JSON.stringify(unitsIn[j])}; valid units: ${UNITS.join(", ")}.`,
        );
      }
      unit[j] = u === "absolute" ? ABS : u === "relative" ? REL : REP;
      if (unit[j] === REP) {
        if (repeatSeg >= 0) {
          throw new Error(
            `${NODE}: segments ${repeatSeg} ("${labels[repeatSeg]}") and ${j} ("${labels[j]}") are both "repeat"; a split takes at most one repeat, since both would claim the rest of the box. Split twice — one splitBox per repeat — or make one of them "absolute".`,
          );
        }
        repeatSeg = j;
      }
      if (unit[j] === REL) anyRel = true;
    }
    if (repeatSeg >= 0 && anyRel) {
      throw new Error(
        `${NODE}: segment ${repeatSeg} ("${labels[repeatSeg]}") is "repeat" and another segment is "relative"; both would claim the rest of the box, and no share between them is defined. Make the relative segments "absolute", or cut the repeat out in a second splitBox.`,
      );
    }
    const isGap = new Uint8Array(N);
    for (let j = 0; j < N; j++) {
      if (typeof labels[j] !== "string") {
        throw new Error(`${NODE}: param "labels" entry ${j} is ${JSON.stringify(labels[j])}; every label is a string ("" for a gap).`);
      }
      isGap[j] = labels[j] === "" ? 1 : 0;
    }

    const round = canonicalOneOf(ROUNDS, params.repeatRound);
    if (round === undefined) {
      throw new Error(`${NODE}: param "repeatRound" is ${JSON.stringify(params.repeatRound)}; valid: ${ROUNDS.join(", ")}.`);
    }
    const repeatRound = (ROUNDS as readonly string[]).indexOf(round) as RoundCode;
    const snapName = canonicalOneOf(ROUNDS, params.snapMode);
    if (snapName === undefined) {
      throw new Error(`${NODE}: param "snapMode" is ${JSON.stringify(params.snapMode)}; valid: ${ROUNDS.join(", ")}.`);
    }
    const snapMode = (ROUNDS as readonly string[]).indexOf(snapName) as RoundCode;
    const fitName = canonicalOneOf(FITS, params.fit);
    if (fitName === undefined) {
      throw new Error(`${NODE}: param "fit" is ${JSON.stringify(params.fit)}; valid: ${FITS.join(", ")}.`);
    }
    const fit = (FITS as readonly string[]).indexOf(fitName);
    const snap = params.snap;
    for (let a = 0; a < 3; a++) {
      const v = snap[a];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        throw new Error(
          `${NODE}: param "snap" component ${a} (${AXIS_NAMES[a]}) is ${typeof v === "number" ? String(v) : JSON.stringify(v)}; a lattice step is a finite number >= 0, and 0 means no snapping on that axis.`,
        );
      }
    }

    requireFinitePlainParam(
      params.sizes,
      NODE,
      "sizes",
      "Every size is a finite number (a negative one counts as 0). Write a plain list, or bound the expression.",
    );
    if (!isField(params.sizes)) {
      const plain = params.sizes as readonly number[];
      const width = Array.isArray(plain) ? plain.length : 1;
      if (width !== N) {
        throw new Error(
          `${NODE}: param "sizes" has ${width} entr${width === 1 ? "y" : "ies"} but "labels" has ${N} (${JSON.stringify(labels)}); give one size per segment.`,
        );
      }
    }
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to split every cell, 0 to pass every cell through, or a field.");
    requireFinitePlainParam(params.axisIndex, NODE, "axisIndex", "An axis index is 0 (x), 1 (y) or 2 (z).");
    requireFinitePlainParam(params.direction, NODE, "direction", "Write 1 to cut from the min side, -1 from the max side, or a field.");

    const labelName = params.labelAttr;
    const indexName = params.indexAttr;
    const countName = params.countAttr;
    const slotsNamed = [
      ["labelAttr", labelName],
      ["indexAttr", indexName],
      ["countAttr", countName],
    ] as const;
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        if (slotsNamed[p][1] !== "" && slotsNamed[p][1] === slotsNamed[q][1]) {
          throw new Error(
            `${NODE}: params "${slotsNamed[p][0]}" and "${slotsNamed[q][0]}" are both "${slotsNamed[p][1]}"; they are different values and need different attributes, or one would overwrite the other with no complaint. Rename one, or clear it to write nothing.`,
          );
        }
      }
    }
    for (const [param, name] of slotsNamed) {
      if (STANDARD_POINT_ATTRS.some((std) => std.name === name)) {
        throw new Error(
          `${NODE}: param "${param}" cannot write "${name}" — it is a standard point attribute (${STANDARD_POINT_ATTRS.map((std) => std.name).join(", ")}), ${name === "seed" ? "and this node writes a fresh seed on every piece, so the two would fight over one column" : name === "boundsMin" || name === "boundsMax" ? "and this node writes every piece's box there" : "whose meaning every other node relies on"}. Name an attribute of your own instead (e.g. "${param === "labelAttr" ? "piece" : param === "indexAttr" ? "pieceIndex" : "pieceCount"}").`,
        );
      }
    }

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;
    const loAttr = srcSet.get("boundsMin");
    const hiAttr = srcSet.get("boundsMax");
    for (const [name, attr] of [
      ["boundsMin", loAttr],
      ["boundsMax", hiAttr],
    ] as const) {
      if (attr === undefined || attr.type !== "f32" || attr.tupleSize !== 3) {
        throw new Error(
          `${NODE}: the input on pin "in" ${attr === undefined ? `has no "${name}" point attribute` : `has "${name}" as ${attr.type} tupleSize ${attr.tupleSize}`}; a cell's box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the cells their boxes with setBounds first.`,
        );
      }
    }
    const lo = loAttr!.data as Float32Array;
    const hi = hiAttr!.data as Float32Array;
    const seedAttr = srcSet.get("seed");
    if (seedAttr && (seedAttr.type !== "u32" || seedAttr.tupleSize !== 1)) {
      throw new Error(
        `${NODE}: the standard point attribute "seed" must be u32 with tupleSize 1 — this node writes a fresh seed on every piece so coincident pieces stay distinct points — but the input on pin "in" has it as ${seedAttr.type} tupleSize ${seedAttr.tupleSize}. Rename that column with setAttribute, or removeAttribute it if it is dead.`,
      );
    }
    const reportSlots = [
      // Suggestions that are NOT the defaults: the default is usually the
      // very name that collided.
      ["labelAttr", labelName, "string", "pieceLabel"],
      ["indexAttr", indexName, "i32", "pieceSlot"],
      ["countAttr", countName, "i32", "pieceSlots"],
    ] as const;
    for (const [param, name, type, suggestion] of reportSlots) {
      if (name === "") continue;
      requireReportSlot({ attrs: srcSet, nodeType: NODE, param, name, type, tupleSize: 1, domain: "point", suggestion });
    }

    // ---- per-cell values, resolved on the PARENT cells
    const sizeCol = resolveOn(src, "point", params.sizes, seed, NODE, "sizes");
    if (sizeCol.tupleSize !== N) {
      throw new Error(
        `${NODE}: param "sizes" must evaluate to ONE COMPONENT PER SEGMENT — ${N} for labels ${JSON.stringify(labels)} — but evaluated to tupleSize ${sizeCol.tupleSize}. Build it with vec(...), one argument per segment in label order, e.g. vec(${labels.map((_, j) => (j === 0 ? "<size of " + JSON.stringify(labels[0]) + ">" : "1")).join(", ")}).`,
      );
    }
    const sizes = sizeCol.data;
    let whereCol: ArrayLike<number> | undefined;
    let whereAll = true;
    if (isField(params.where)) {
      whereCol = requireScalarColumn(resolveOn(src, "point", params.where, seed, NODE, "where"), NODE, "where", "cell", "a split-or-pass-through flag").data;
    } else {
      whereAll = (params.where as number) !== 0;
    }
    let axisCol: ArrayLike<number> | undefined;
    if (fixedAxis < 0) {
      axisCol = requireScalarColumn(resolveOn(src, "point", params.axisIndex, seed, NODE, "axisIndex"), NODE, "axisIndex", "cell", "an axis index").data;
    }
    const axisOf = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (axisCol === undefined) {
        axisOf[i] = fixedAxis;
        continue;
      }
      const raw = axisCol[i];
      const a = Math.round(raw);
      if (a !== 0 && a !== 1 && a !== 2) {
        throw new Error(
          `${NODE}: param "axisIndex" resolved to ${raw} at cell ${i}, which rounds to ${a}; an axis index is 0 (x), 1 (y) or 2 (z). Bound the expression, e.g. select(<cond>, 0, 2).`,
        );
      }
      axisOf[i] = a;
    }
    const splits = (i: number): boolean => (whereCol === undefined ? whereAll : whereCol[i] !== 0);
    // The direction is decided per cell as a boolean: only its sign is read.
    let dirCol: ArrayLike<number> | undefined;
    let revAll = false;
    if (isField(params.direction)) {
      dirCol = requireScalarColumn(resolveOn(src, "point", params.direction, seed, NODE, "direction"), NODE, "direction", "cell", "a cut direction").data;
    } else {
      revAll = (params.direction as number) < 0;
    }
    const reversed = (i: number): boolean => (dirCol === undefined ? revAll : dirCol[i] < 0);
    const sizeAt = (i: number, j: number): number => sizes[i * N + j];

    // ---- the layout of one cell, into reused scratch: slot ends and the
    // segment behind each slot. No per-cell allocation once warm.
    const L: Layout = { ends: new Float64Array(Math.max(8, N)), segOf: new Int32Array(Math.max(8, N)), slots: 0 };
    const ensure = (cap: number): void => {
      if (L.ends.length >= cap) return;
      let c = L.ends.length;
      while (c < cap) c *= 2;
      L.ends = new Float64Array(c);
      L.segOf = new Int32Array(c);
    };

    /**
     * Fill `L` with cell i's slots and return its EMITTED piece count. The
     * ends are final positions along the axis: snapped, clamped, monotone.
     */
    const layoutCell = (i: number, runningTotal: number): number => {
      const a = axisOf[i];
      const cLo = lo[i * 3 + a];
      const cHi = hi[i * 3 + a];
      const len = cHi - cLo;
      if (!Number.isFinite(cLo) || !Number.isFinite(cHi)) {
        throw new Error(
          `${NODE}: cell ${i}'s box is not finite along ${AXIS_NAMES[a]} — boundsMin ${cLo}, boundsMax ${cHi} — so it has no length to cut. Fix the setBounds that made it, or pass the cell through with "where".`,
        );
      }
      if (!(len >= 0)) {
        throw new Error(
          `${NODE}: cell ${i}'s box is inside out along ${AXIS_NAMES[a]} — boundsMin ${cLo} is above boundsMax ${cHi} — so it has no length to cut. Fix the setBounds that made it, or pass the cell through with "where".`,
        );
      }
      let absSum = 0;
      let relSum = 0;
      for (let j = 0; j < N; j++) {
        const s = Math.max(0, sizeAt(i, j));
        if (unit[j] === ABS) absSum += s;
        else if (unit[j] === REL) relSum += s;
      }
      const tol = FIT_EPS * Math.max(len, absSum);
      let absScale = 1;
      let clipAbs = false;
      let rest: number;
      if (absSum > len + tol) {
        if (fit === FIT_ERROR) {
          let run = 0;
          let at = 0;
          for (let j = 0; j < N; j++) {
            if (unit[j] !== ABS) continue;
            run += Math.max(0, sizeAt(i, j));
            if (run > len + tol) {
              at = j;
              break;
            }
          }
          throw new Error(
            `${NODE}: cell ${i} OVERFLOWS — its absolute segments need ${absSum} along ${AXIS_NAMES[a]} but its box is ${len} long (${cLo} to ${cHi}); segment ${at} ("${labels[at]}", size ${Math.max(0, sizeAt(i, at))}) is where the running total passed the box, at ${run}. Set "fit" to "clip" (cut the pieces at the box's end) or "scale" (shrink them to fit), or bound the sizes, e.g. min(<size>, <the box length>).`,
          );
        }
        if (fit === FIT_CLIP) clipAbs = true;
        else absScale = absSum > 0 ? len / absSum : 0;
        rest = 0;
      } else {
        rest = Math.max(0, len - absSum);
      }
      const flexible = repeatSeg >= 0 || relSum > 0;
      if (!flexible && rest > tol) {
        if (fit === FIT_ERROR) {
          const why = anyRel
            ? `its "relative" segments all have weight 0 here, so nothing takes the remaining ${rest}`
            : `no "relative" or "repeat" segment is there to take the remaining ${rest}`;
          throw new Error(
            `${NODE}: cell ${i} is UNDERFILLED — its segments cover ${absSum} of a box ${len} long along ${AXIS_NAMES[a]} (${cLo} to ${cHi}), and ${why}. Add a segment that takes the rest (unit "relative", size 1 — label it "" to leave it empty as a gap), or set "fit" to "clip" (leave it uncovered) or "scale" (stretch the pieces to fill).`,
          );
        }
        if (fit === FIT_SCALE) {
          absScale = absSum > 0 ? len / absSum : 0;
          rest = 0;
        }
      }
      let repN = 0;
      if (repeatSeg >= 0) {
        const m = sizeAt(i, repeatSeg);
        if (!(m > 0)) {
          throw new Error(
            `${NODE}: segment ${repeatSeg} ("${labels[repeatSeg]}") is "repeat" and its size — the module, the length one piece aims for — resolved to ${m} at cell ${i}; a module must be > 0, since pieces of no length have no count. Bound the expression, e.g. max(<module>, 1).`,
          );
        }
        repN = Math.max(1, roundBy(repeatRound, rest / m));
        if (runningTotal + repN > MAX_SPLIT_POINTS) {
          throw new Error(
            `${NODE}: the split would emit more than ${MAX_SPLIT_POINTS} points from the input's ${n} cell(s) — segment ${repeatSeg} ("${labels[repeatSeg]}") repeats ${repN} times at cell ${i} (a rest of ${rest} over a module of ${m}), and the running total reached ${runningTotal + repN}. The cap is on the TOTAL, so this is the cell the total ran out on rather than necessarily the largest offender. Bound the module, e.g. max(<module>, <the smallest piece you meant>).`,
          );
        }
      }
      const slots = N - (repeatSeg >= 0 ? 1 : 0) + repN;
      ensure(slots);
      const ends = L.ends;
      const segOf = L.segOf;
      // The RAW slot ends, as offsets accumulated from the min side. A
      // repeat's ends are start + r * rest / n, each computed from the
      // start rather than accumulated, so n pieces do not drift.
      // A REVERSED cell lays the same offsets from its max side: the
      // forward arithmetic is kept as it was, byte for byte.
      const rev = reversed(i);
      let cum = 0;
      let k = 0;
      for (let j = 0; j < N; j++) {
        const u = unit[j];
        if (u === REP) {
          const start = cum;
          for (let r = 1; r <= repN; r++) {
            const off = r === repN ? start + rest : start + (r * rest) / repN;
            ends[k] = rev ? cHi - off : cLo + off;
            segOf[k++] = j;
          }
          cum = start + rest;
          continue;
        }
        const s = Math.max(0, sizeAt(i, j));
        if (u === ABS) cum += clipAbs ? Math.max(0, Math.min(s, len - cum)) : s * absScale;
        else cum += relSum > 0 ? (rest * s) / relSum : 0;
        ends[k] = rev ? cHi - cum : cLo + cum;
        segOf[k++] = j;
      }
      // Then each end made final: an end at the box's max (to f32
      // precision) IS the max, so the pieces tile the cell exactly; any
      // other end is snapped, then clamped into the cell and kept monotone.
      // A piece is emitted when it is not a gap and has length as STORED.
      const step = snap[a];
      const endTol = ULP_TOL * f32Ulp(Math.max(Math.abs(cLo), Math.abs(cHi)));
      let emitted = 0;
      if (rev) {
        // Mirrored: from the max side down, the min IS the min.
        let prev = cHi;
        for (let q = 0; q < k; q++) {
          let b = ends[q];
          if (b <= cLo + endTol) b = cLo;
          else if (step > 0) b = snapToLattice(b, step, snapMode);
          if (b < cLo) b = cLo;
          if (b > prev) b = prev;
          ends[q] = b;
          if (isGap[segOf[q]] === 0 && Math.fround(prev) > Math.fround(b)) emitted++;
          prev = b;
        }
        L.slots = k;
        return emitted;
      }
      let prev = cLo;
      for (let q = 0; q < k; q++) {
        let b = ends[q];
        if (b >= cHi - endTol) b = cHi;
        else if (step > 0) b = snapToLattice(b, step, snapMode);
        if (b > cHi) b = cHi;
        if (b < prev) b = prev;
        ends[q] = b;
        if (isGap[segOf[q]] === 0 && Math.fround(b) > Math.fround(prev)) emitted++;
        prev = b;
      }
      L.slots = k;
      return emitted;
    };

    // ---- pass 1: how many pieces each cell emits, whole, so the output is
    // allocated once and the cap checked before a byte of it exists.
    const counts = new Uint32Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const c = splits(i) ? layoutCell(i, total) : 1;
      if (total + c > MAX_SPLIT_POINTS) {
        throw new Error(
          `${NODE}: the split would emit more than ${MAX_SPLIT_POINTS} points from the input's ${n} cell(s) — cell ${i} emits ${c} piece(s) and the running total reached ${total + c}. The cap is on the TOTAL, so this is the cell the total ran out on rather than necessarily the largest offender. Bound the repeat module or the input.`,
        );
      }
      counts[i] = c;
      total += c;
    }

    const srcIdx = new Uint32Array(total);
    {
      let w = 0;
      for (let i = 0; i < n; i++) {
        const c = counts[i];
        if (c === 0) continue;
        srcIdx.fill(i, w, w + c);
        w += c;
      }
    }
    // Every point column, every type, through the one map: no carry list.
    const out = gatherPoints(src, srcIdx);
    copyElements(src.attrs.detail, out.attrs.detail, undefined, src.attrs.detail.count);
    const outSet = out.attrs.point;

    // Report columns: a same-shape column carried from the input is KEPT
    // (pass-through cells keep their values) and written only on the
    // pieces; a missing one is created with its default.
    const labelOut = labelName !== "" ? (outSet.get(labelName) ?? outSet.add(labelName, "string", 1, "")) : undefined;
    const oIndex =
      indexName !== "" ? ((outSet.get(indexName) ?? outSet.add(indexName, "i32", 1, -1)).writable() as Int32Array) : undefined;
    const oCount =
      countName !== "" ? ((outSet.get(countName) ?? outSet.add(countName, "i32", 1, 0)).writable() as Int32Array) : undefined;
    const oLabel = labelOut !== undefined ? (labelOut.writable() as Uint32Array) : undefined;
    // Each label interned ONCE into the output's string table.
    const labelCode = new Uint32Array(N);
    if (labelOut !== undefined) for (let j = 0; j < N; j++) if (isGap[j] === 0) labelCode[j] = labelOut.internString(labels[j]);
    const oLo = outSet.require("boundsMin").writable() as Float32Array;
    const oHi = outSet.require("boundsMax").writable() as Float32Array;
    const sd = seedAttr ? (seedAttr.data as Uint32Array) : undefined;
    const oSeed = (outSet.get("seed") ?? outSet.add("seed", "u32", 1, 0)).writable() as Uint32Array;

    // ---- pass 2: lay out again and write the pieces.
    let w = 0;
    let running = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!splits(i)) {
        // Passed through: gathered as it was, seed included.
        w++;
        running++;
        continue;
      }
      layoutCell(i, running);
      running += counts[i];
      const a = axisOf[i];
      const h1 = hashMix(hashSeed(2), sd === undefined ? 0 : sd[i]);
      const slots = L.slots;
      if (reversed(i)) {
        let prev = hi[i * 3 + a];
        for (let k = 0; k < slots; k++) {
          const b = L.ends[k];
          const j = L.segOf[k];
          if (isGap[j] === 0 && Math.fround(prev) > Math.fround(b)) {
            oLo[w * 3 + a] = b;
            oHi[w * 3 + a] = prev;
            oSeed[w] = slotSeed(h1, k);
            if (oLabel) oLabel[w] = labelCode[j];
            if (oIndex) oIndex[w] = k;
            if (oCount) oCount[w] = slots;
            w++;
          }
          prev = b;
        }
        continue;
      }
      let prev = lo[i * 3 + a];
      for (let k = 0; k < slots; k++) {
        const b = L.ends[k];
        const j = L.segOf[k];
        if (isGap[j] === 0 && Math.fround(b) > Math.fround(prev)) {
          oLo[w * 3 + a] = prev;
          oHi[w * 3 + a] = b;
          oSeed[w] = slotSeed(h1, k);
          if (oLabel) oLabel[w] = labelCode[j];
          if (oIndex) oIndex[w] = k;
          if (oCount) oCount[w] = slots;
          w++;
        }
        prev = b;
      }
    }
    return { out: [makeGeometryItem(out)] };
  },
});
