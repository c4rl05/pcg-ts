/**
 * `shellSplit`: break every cell's box into its SHELL — floor, the four
 * walls and the ceiling, each an inset slab of the box with its own local
 * frame and a label — plus, optionally, the interior they enclose.
 *
 * WHAT IT REPLACES. A mass box broken into components used to be spelled
 * as a `repeatPoints` of five copies and a `setBounds` with a
 * `choose(slot, ...)` of five corners per corner, followed by an
 * `alongX` flag and a `choose(wall - 1, ...)` wherever a later rule needed
 * to know which way the wall ran or which side of it was out — the brick
 * house's parts, about 55 lines. It is the component split of a shape
 * grammar: the mass reduced to the faces that later rules decorate, each
 * face carrying the axes those rules are written against.
 *
 * TILING, AND WHO OWNS THE CORNERS. Every piece is INSET: carved out of
 * the cell's box, never grown past it. The floor and ceiling span the
 * FULL footprint; the four walls stand between them; the south and north
 * walls run the full x extent and so OWN the four vertical corners; the
 * west and east walls stand between south and north. With the interior
 * the seven pieces tile the box exactly — no gap, no overlap — and every
 * shared plane is the same stored number on both sides. That ownership is
 * the brick house's own (its slab under the walls, its south and north
 * walls the long ones), which is what makes this node seed- and
 * box-identical to the house's five-copy spelling.
 *
 * THE FRAME IS CARRIED AS ATTRIBUTES, NOT AS A TRANSFORM. The pieces'
 * boxes stay in the coordinates the input holds, like splitBox's: P, rot
 * and scale are neither read nor written. A rotated transform with boxes in
 * face-local coordinates would make `box("sx")` mean "along" — but every
 * box node downstream (splitBox, packBricks, filterByBounds, the box names
 * themselves) reads the corners as the coordinates they are, and
 * copyToPoints reads them as extents in the point's own frame, so a
 * face-local box would be misread by all of them. Instead each piece gets
 * its axes as integer codes (0 = x, 1 = y, 2 = z), which is exactly what
 * splitBox's `axis: "perCell"` reads, and its outward normal as a vec3.
 *
 * SEEDS ARE repeatPoints' SEEDS. The piece of face code k (0 floor, 1
 * south, 2 north, 3 west, 4 east, 5 ceiling, 6 interior) of a cell whose
 * seed is s gets hashCombine(s, k). The code is the FACE's, not its
 * position in the list, so a piece's seed moves neither when the list is
 * reordered nor when a sibling is dropped; and the first five are the
 * house's copy seeds, slab and walls S N W E.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { STANDARD_POINT_ATTRS } from "../data/index.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashFinalize, hashMix, hashSeed } from "../random/hash.js";
import type {
  ShellSplitInputs,
  ShellSplitOutputs,
  ShellSplitParams,
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
export type { ShellSplitParams } from "./params.generated.js";

const NODE = "shellSplit";

/** The six shell faces, in face-code order: the code IS the index here. */
const FACES = ["floor", "south", "north", "west", "east", "ceiling"] as const;
/** The interior's face code, after the six shell faces. */
const INTERIOR = 6;
const FITS = ["error", "clip", "scale"] as const;
const AXIS_NAMES = ["x", "y", "z"] as const;

/** Fit codes, decided once. */
const FIT_ERROR = 0;
const FIT_CLIP = 1;

/**
 * Per face code: the along, up and out axes (0 = x, 1 = y, 2 = z) and the
 * outward normal. Along and up point along the POSITIVE world axis, so a
 * box read through them is a length and never negative; only the outward
 * normal carries a sign. The interior faces nowhere: its frame is the
 * world's (along x, up y, out z) and its outward normal is zero.
 */
const ALONG = [0, 0, 0, 2, 2, 0, 0] as const;
const UP = [2, 1, 1, 1, 1, 2, 1] as const;
const OUT = [1, 2, 2, 0, 0, 1, 2] as const;
const OUTWARD: readonly (readonly [number, number, number])[] = [
  [0, -1, 0],
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

/**
 * The tolerance "the thicknesses fit" is held to: thicknesses resolved in
 * f32 against a box stored in f32, so "exactly fills" means "to f32
 * precision" — splitBox's `fit` tolerance, for splitBox's reason.
 */
const FIT_EPS = 1e-6;
/** How many f32 ulps of the coordinate two planes may differ by and still meet. */
const ULP_TOL = 2;

/** One f32 ulp at the magnitude of `x` (the smallest normal's at 0). */
function f32Ulp(x: number): number {
  const a = Math.abs(x);
  if (!(a > 1.1754943508222875e-38)) return 1.401298464324817e-45;
  return Math.pow(2, Math.floor(Math.log2(a)) - 23);
}

/**
 * The seed of face code `k` of a cell: `hashCombine(cellSeed, k)`, spelled
 * out so the inner loop does not allocate the variadic form's rest array.
 * `h1` is `hashMix(hashSeed(2), cellSeed)`, folded once per CELL; the test
 * file pins it to hashCombine.
 */
function faceSeed(h1: number, k: number): number {
  return hashFinalize(hashMix(h1, k));
}

/** Each cell's box broken into floor, walls, ceiling and interior, each with its own frame. */
export const shellSplit = standardNode<ShellSplitParams, ShellSplitInputs, ShellSplitOutputs>({
  type: NODE,
  category: "point op",
  description:
    "BREAKS every cell's box into its SHELL — floor, the four walls south / north / west / east, and ceiling — plus, if asked, the INTERIOR they enclose, and emits one point per piece, each piece a box with its OWN FRAME and a label: the component split of a split grammar, which turns a mass into the faces later rules decorate. A CELL IS A POINT WITH A BOX, as in splitBox: its standard `boundsMin`/`boundsMax`, read in the coordinates they hold; P, rotation and scale are not read and nothing is moved, so a ROTATED cell is split in its stored box exactly as an unrotated one, and its P, rot and scale ride onto every piece unchanged. THE FACES are named by side: \"floor\" is the min-y side and \"ceiling\" the max-y side; \"south\" is min z, \"north\" max z, \"west\" min x, \"east\" max x. `faces` lists the ones to cut, in the order they are emitted, `labels` gives each its label (several may share one — the default labels all four walls \"wall\", so one applyRules rule or one attributeIs(\"piece\", \"wall\") serves every wall, and `faceAttr` still says which), and `thickness` gives each its depth into the box. A FACE NOT LISTED TAKES NO THICKNESS, so the faces beside it reach the box's side (list no ceiling and the walls run to the top); a face listed with the label \"\" is a GAP: it takes its thickness and emits nothing. EVERY PIECE IS INSET, carved out of the box; nothing grows past it. CORNERS: the floor and ceiling span the FULL footprint; the walls stand between them; the south and north walls run the full x extent and OWN the vertical corners; the west and east walls stand between south and north. So with the interior the pieces TILE the box exactly, no gap and no overlap, every shared plane one stored number. A piece of no volume is dropped — a face of thickness 0, a west wall when south and north meet, any piece of a flat box. THE FRAME is written as attributes, never as a transform: `alongAxisAttr`, `upAxisAttr` and `outAxisAttr` receive the piece's axes as codes (0 = x, 1 = y, 2 = z) — along x, up y, out z for the south and north walls; along z, up y, out x for the west and east walls; along x, up z, out y for the floor and ceiling; the world's for the interior — and `outwardAttr` its OUTWARD unit normal ([0, 0, -1] on the south wall, [0, -1, 0] under the floor, zero for the interior). Along and up are the POSITIVE world axes, so a box read through them is a length; only `outward` has a sign. That is what lets a rule be written ONCE for every wall: a splitBox with axis \"perCell\" and axisIndex attribute(\"alongAxis\") cuts any wall into bays along its run, the wall's length is choose(attribute(\"alongAxis\"), box(\"sx\"), box(\"sy\"), box(\"sz\")), and a sill pushed out of its wall is box(\"lo\") + attribute(\"outward\") * <depth>. BOX NAMES KEEP THEIR WORLD MEANING — box(\"sx\") is the x extent on every face, not \"along\" — because the boxes stay in the coordinates every box node reads (splitBox, packBricks, filterByBounds); a face-local box with a rotated transform would make box(\"sx\") mean along and be misread by all of them. `thickness` is a LENGTH in the box's units, one per face or one for all, plain or a field resolved on the PARENT cell (box(\"sy\") * 0.1, a per-cell attribute); a negative one counts as 0. `fit` says what happens when a pair of opposite faces is thicker than the box between them (floor + ceiling past its height, south + north past its depth, west + east past its width): \"error\" refuses, naming the cell, the faces and the numbers; \"clip\" lets the min-side face keep its thickness and gives the max-side face what is left; \"scale\" shrinks both in proportion so they meet. A pair that exactly fills its span fits, and leaves no interior. `where` passes chosen cells through UNSPLIT, as in splitBox. Every POINT ATTRIBUTE IS CARRIED onto every piece, strings included, and the DETAIL attributes come through unchanged; TOPOLOGY IS DROPPED. OUTPUT ORDER is cell-major, each cell's pieces in `faces` order with the interior last. SEEDS: the piece of face code k — 0 floor, 1 south, 2 north, 3 west, 4 east, 5 ceiling, 6 interior, the code `faceAttr` writes — of a cell with seed s gets hashCombine(s, k), repeatPoints' copy-k seed, so a piece's seed depends on its FACE alone: it moves neither when `faces` is reordered nor when a sibling is dropped, and floor and walls are seed-identical to repeatPoints(count = 5) with copy k cut into face k. No node identity enters a piece's seed; the node's own seed reaches only the fields it resolves. CPU only: which pieces exist is a comparison per cell.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    faces: {
      type: "stringList",
      default: [...FACES],
      description:
        'The shell faces to cut, in the order each cell emits them: any of "floor" (min y), "south" (min z), "north" (max z), "west" (min x), "east" (max x), "ceiling" (max y), each at most once. A face NOT listed takes no thickness — the faces beside it run to the box\'s side, so ["floor", "south", "north", "west", "east"] is a storey whose walls reach the top. `labels` and `thickness` are parallel to this list. Decided once per cook. At least one face.',
    },
    labels: {
      type: "stringList",
      default: ["floor", "wall", "wall", "wall", "wall", "ceiling"],
      description:
        'One label per entry of `faces`, written to `labelAttr` on that face\'s piece. Labels may repeat, and the default gives all four walls "wall" so a single rule (applyRules, attributeIs("piece", "wall")) serves every wall while `faceAttr` still tells them apart. An EMPTY label "" makes the face a GAP: it takes its thickness and emits nothing — a floor slab some other node lays, kept clear of the walls.',
    },
    thickness: {
      type: "numberList",
      default: [1],
      acceptsField: true,
      description:
        'How deep each face reaches INTO the box, as a length in the box\'s own units: ONE entry for every face, or one per entry of `faces`, in its order. AS A FIELD it is resolved on the PARENT cell and must have one component, or one per face — vec(1, 0.5, 0.5, 0.5, 0.5, 1) — and the box names read the parent\'s box, so a wall can be a share of the cell it bounds: box("sx") * 0.1. Every piece is INSET (carved out of the box), so a negative thickness counts as 0 — that face is then dropped, and its neighbours reach the side. A non-finite value is refused naming the cell. A pair of opposite faces thicker than the span between them is `fit`\'s to settle.',
    },
    interiorLabel: {
      type: "string",
      default: "",
      description:
        'The label of the INTERIOR — what the shell encloses, the box less every listed face — emitted after the faces with face code 6 when this is not empty. Empty (the default) emits no interior. With it, the pieces tile the cell exactly: their volumes sum to the box\'s. A room\'s floor plan, or the void a roof rule fills, starts here.',
    },
    fit: {
      type: "enum",
      enum: [...FITS],
      default: "error",
      description:
        'What happens when two OPPOSITE faces are thicker together than the box between them — floor + ceiling past its height, south + north past its depth, west + east past its width (a face not listed counts 0). "error" refuses the cook, naming the cell, the axis, both faces and the numbers; "clip" lets the min-side face (floor, south, west) keep its thickness, clipped to the box, and gives the max-side face what is left, which can be nothing; "scale" shrinks both in proportion so that they meet. A pair that EXACTLY fills its span fits under every mode and leaves no interior; "exactly" is to f32 precision — within a millionth of the span, or two f32 steps at the box\'s coordinates, whichever is larger, so a box at x = 1e5 (where f32 steps are 1/128) is not refused for its storage. Decided once per cook.',
    },
    where: {
      type: "f32",
      default: 1,
      acceptsField: true,
      description:
        'Which cells are SPLIT: nonzero splits the cell, 0 PASSES IT THROUGH UNSPLIT — emitted once, exactly as it arrived, its seed and box unchanged and any value it already carried in the attributes this node writes kept (a column this node creates gives it the column\'s default: "" for the label, -1 for the face and the axis codes, [0, 0, 0] for the outward normal). As a field it is resolved per cell, e.g. attributeIs("piece", "storey"). A non-finite value is refused naming the cell. A field `thickness` is still resolved on EVERY cell, passed-through ones included, so it must be finite there too.',
    },
    labelAttr: {
      type: "string",
      default: "piece",
      description:
        'Name of the STRING point attribute (tuple 1) receiving each piece\'s label — what applyRules and attributeIs dispatch on; "piece" is theirs and splitBox\'s too. A REPORTING SLOT: an input column of the same shape is rewritten on the pieces and kept on cells `where` passes through, one of another shape is refused, and a standard point attribute is refused by name. Empty writes no label.',
    },
    faceAttr: {
      type: "string",
      default: "face",
      description:
        'Name of the i32 point attribute (tuple 1) receiving each piece\'s FACE CODE: 0 floor, 1 south, 2 north, 3 west, 4 east, 5 ceiling, 6 interior — the face, not its position in `faces`, so ge(attribute("face"), 1) * le(attribute("face"), 4) is "a wall" whatever the list. The code is also what the piece\'s seed is hashed with. A reporting slot on the same terms as `labelAttr`. Empty writes none.',
    },
    alongAxisAttr: {
      type: "string",
      default: "alongAxis",
      description:
        'Name of the i32 point attribute (tuple 1) receiving the axis each piece RUNS along, 0 = x, 1 = y, 2 = z: x for the south and north walls, the floor, the ceiling and the interior; z for the west and east walls. It is exactly what splitBox\'s axisIndex reads under axis "perCell", so attribute("alongAxis") there cuts every wall along its own run. A reporting slot on the same terms as `labelAttr`. Empty writes none.',
    },
    upAxisAttr: {
      type: "string",
      default: "upAxis",
      description:
        'Name of the i32 point attribute (tuple 1) receiving each piece\'s second in-face axis, 0 = x, 1 = y, 2 = z: y for the walls and the interior, z for the floor and the ceiling (whose faces lie flat). With alongAxis it spans the face; a storey or course split up a wall is a splitBox perCell on attribute("upAxis"). A reporting slot on the same terms as `labelAttr`. Empty writes none.',
    },
    outAxisAttr: {
      type: "string",
      default: "outAxis",
      description:
        'Name of the i32 point attribute (tuple 1) receiving the axis each piece\'s THICKNESS runs along, 0 = x, 1 = y, 2 = z: z for the south and north walls, x for the west and east walls, y for the floor and the ceiling, z for the interior. A wall cut through its depth into an inner and an outer leaf is a splitBox perCell on attribute("outAxis"). A reporting slot on the same terms as `labelAttr`. Empty writes none.',
    },
    outwardAttr: {
      type: "string",
      default: "outward",
      description:
        'Name of the f32 point attribute (tuple 3) receiving each piece\'s OUTWARD unit normal — the side of the box it bounds, pointing out: [0, -1, 0] for the floor, [0, 1, 0] for the ceiling, [0, 0, -1] south, [0, 0, 1] north, [-1, 0, 0] west, [1, 0, 0] east, and [0, 0, 0] for the interior, which faces nowhere. It is the one signed axis, so it is what moves something OUT of its face: box("lo") + attribute("outward") * 0.5, or a probe half a unit outside the wall. A reporting slot on the same terms as `labelAttr`. Empty writes none.',
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // ---- params, decided ONCE: every string is turned into a code here,
    // and no string reaches a per-cell loop.
    const facesIn = params.faces;
    if (!Array.isArray(facesIn)) {
      throw new Error(
        `${NODE}: param "faces" is ${JSON.stringify(facesIn)}, not a list; give the faces to cut, e.g. ${JSON.stringify(FACES)}.`,
      );
    }
    const N = facesIn.length;
    if (N === 0) {
      throw new Error(
        `${NODE}: param "faces" is empty; a shell split needs at least one face. Give the faces to cut, from ${FACES.join(", ")}, e.g. ${JSON.stringify(FACES)}.`,
      );
    }
    /** Face code per list entry, and the list entry per face code (-1: not listed). */
    const faceOf = new Uint8Array(N);
    const entryOf = new Int32Array(6).fill(-1);
    for (let j = 0; j < N; j++) {
      const f = canonicalOneOf(FACES, facesIn[j]);
      if (f === undefined) {
        const near = typeof facesIn[j] === "string" ? suggestNames(facesIn[j] as string, FACES) : { clause: "" };
        throw new Error(
          `${NODE}: param "faces" entry ${j} is ${JSON.stringify(facesIn[j])}, which is not a face; ${near.clause}faces: ${FACES.join(", ")} (floor and ceiling are min and max y, south and north min and max z, west and east min and max x).`,
        );
      }
      const k = (FACES as readonly string[]).indexOf(f);
      if (entryOf[k] >= 0) {
        throw new Error(
          `${NODE}: param "faces" lists "${f}" twice (entries ${entryOf[k]} and ${j}); a box has one ${f}. Keep one entry — give it the label you want in "labels".`,
        );
      }
      entryOf[k] = j;
      faceOf[j] = k;
    }
    const labels = params.labels;
    if (!Array.isArray(labels) || labels.length !== N) {
      const got = Array.isArray(labels) ? `has ${labels.length} entr${labels.length === 1 ? "y" : "ies"}` : `is ${JSON.stringify(labels)}`;
      throw new Error(
        `${NODE}: param "labels" ${got} but "faces" has ${N} (${JSON.stringify(facesIn)}); give one label per face, in the same order ("" makes that face a gap).`,
      );
    }
    const isGap = new Uint8Array(N);
    for (let j = 0; j < N; j++) {
      if (typeof labels[j] !== "string") {
        throw new Error(`${NODE}: param "labels" entry ${j} (face "${FACES[faceOf[j]]}") is ${JSON.stringify(labels[j])}; every label is a string ("" for a gap).`);
      }
      isGap[j] = labels[j] === "" ? 1 : 0;
    }
    const interiorLabel = params.interiorLabel;
    if (typeof interiorLabel !== "string") {
      throw new Error(`${NODE}: param "interiorLabel" is ${JSON.stringify(interiorLabel)}; it is a string, and "" (the default) emits no interior.`);
    }
    const withInterior = interiorLabel !== "";

    const fitName = canonicalOneOf(FITS, params.fit);
    if (fitName === undefined) {
      throw new Error(`${NODE}: param "fit" is ${JSON.stringify(params.fit)}; valid: ${FITS.join(", ")}.`);
    }
    const fit = (FITS as readonly string[]).indexOf(fitName);

    requireFinitePlainParam(
      params.thickness,
      NODE,
      "thickness",
      "Every thickness is a finite length (a negative one counts as 0). Write a plain list, or bound the expression.",
    );
    if (!isField(params.thickness)) {
      const plain = params.thickness as readonly number[];
      const width = Array.isArray(plain) ? plain.length : 1;
      if (width !== 1 && width !== N) {
        throw new Error(
          `${NODE}: param "thickness" has ${width} entries but "faces" has ${N} (${JSON.stringify(facesIn)}); give ONE thickness for every face, or one per face in the same order.`,
        );
      }
    }
    requireFinitePlainParam(params.where, NODE, "where", "Write 1 to split every cell, 0 to pass every cell through, or a field.");

    const slots = [
      ["labelAttr", params.labelAttr, "string", 1, "shellPiece"],
      ["faceAttr", params.faceAttr, "i32", 1, "shellFace"],
      ["alongAxisAttr", params.alongAxisAttr, "i32", 1, "faceAlong"],
      ["upAxisAttr", params.upAxisAttr, "i32", 1, "faceUp"],
      ["outAxisAttr", params.outAxisAttr, "i32", 1, "faceOut"],
      ["outwardAttr", params.outwardAttr, "f32", 3, "faceOutward"],
    ] as const;
    for (let p = 0; p < slots.length; p++) {
      for (let q = p + 1; q < slots.length; q++) {
        if (slots[p][1] !== "" && slots[p][1] === slots[q][1]) {
          throw new Error(
            `${NODE}: params "${slots[p][0]}" and "${slots[q][0]}" are both "${slots[p][1]}"; they are different values and need different attributes, or one would overwrite the other with no complaint. Rename one, or clear it to write nothing.`,
          );
        }
      }
    }
    for (const [param, name, , , suggestion] of slots) {
      if (STANDARD_POINT_ATTRS.some((std) => std.name === name)) {
        throw new Error(
          `${NODE}: param "${param}" cannot write "${name}" — it is a standard point attribute (${STANDARD_POINT_ATTRS.map((std) => std.name).join(", ")}), ${name === "seed" ? "and this node writes a fresh seed on every piece, so the two would fight over one column" : name === "boundsMin" || name === "boundsMax" ? "and this node writes every piece's box there" : "whose meaning every other node relies on"}. Name an attribute of your own instead (e.g. "${suggestion}").`,
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
    for (const [param, name, type, tupleSize, suggestion] of slots) {
      if (name === "") continue;
      requireReportSlot({ attrs: srcSet, nodeType: NODE, param, name, type, tupleSize, domain: "point", suggestion });
    }

    // ---- per-cell values, resolved on the PARENT cells
    const thickCol = resolveOn(src, "point", params.thickness, seed, NODE, "thickness");
    const tw = thickCol.tupleSize;
    if (tw !== 1 && tw !== N) {
      throw new Error(
        `${NODE}: param "thickness" must evaluate to ONE component, or ONE PER FACE — ${N} for faces ${JSON.stringify(facesIn)} — but evaluated to tupleSize ${tw}. Write a scalar for every face, or build one per face with vec(...) in the order of "faces", e.g. vec(${facesIn.map((_, j) => (j === 0 ? "<" + FACES[faceOf[0]] + ">" : "1")).join(", ")}).`,
      );
    }
    const thick = thickCol.data;
    let whereCol: ArrayLike<number> | undefined;
    let whereAll = true;
    if (isField(params.where)) {
      whereCol = requireScalarColumn(resolveOn(src, "point", params.where, seed, NODE, "where"), NODE, "where", "cell", "a split-or-pass-through flag").data;
    } else {
      whereAll = (params.where as number) !== 0;
    }
    const splits = (i: number): boolean => (whereCol === undefined ? whereAll : whereCol[i] !== 0);

    /** A face code's thickness at cell i: 0 when the face is not listed, never negative. */
    const thicknessOf = (i: number, k: number): number => {
      const j = entryOf[k];
      if (j < 0) return 0;
      return Math.max(0, thick[tw === 1 ? i : i * N + j]);
    };

    // ---- the layout of one cell: three planes per axis pair, into
    // reused scratch. cut[a*2] is the min-side face's inner plane, cut[a*2+1]
    // the max-side face's, along axis a.
    const cut = new Float64Array(6);
    /** Min-side and max-side face codes per axis: x west/east, y floor/ceiling, z south/north. */
    const MIN_FACE = [3, 0, 1] as const;
    const MAX_FACE = [4, 5, 2] as const;
    const box = new Float64Array(6); // [x0, y0, z0, x1, y1, z1] of one piece

    const layoutCell = (i: number): void => {
      for (let a = 0; a < 3; a++) {
        const c0 = lo[i * 3 + a];
        const c1 = hi[i * 3 + a];
        if (!Number.isFinite(c0) || !Number.isFinite(c1)) {
          throw new Error(
            `${NODE}: cell ${i}'s box is not finite along ${AXIS_NAMES[a]} — boundsMin ${c0}, boundsMax ${c1} — so it has no shell to cut. Fix the setBounds that made it, or pass the cell through with "where".`,
          );
        }
        const len = c1 - c0;
        if (!(len >= 0)) {
          throw new Error(
            `${NODE}: cell ${i}'s box is inside out along ${AXIS_NAMES[a]} — boundsMin ${c0} is above boundsMax ${c1} — so it has no shell to cut. Fix the setBounds that made it, or pass the cell through with "where".`,
          );
        }
        const kMin = MIN_FACE[a];
        const kMax = MAX_FACE[a];
        let tMin = thicknessOf(i, kMin);
        let tMax = thicknessOf(i, kMax);
        const sum = tMin + tMax;
        // "To f32 precision" is the larger of a relative share and the
        // f32 spacing AT THE BOX's coordinates: far from the origin a
        // stored span is only known to a few ulps of where it sits.
        const eps = ULP_TOL * f32Ulp(Math.max(Math.abs(c0), Math.abs(c1)));
        const tol = Math.max(FIT_EPS * Math.max(len, sum), eps);
        if (sum > len + tol) {
          if (fit === FIT_ERROR) {
            throw new Error(
              `${NODE}: cell ${i}'s ${FACES[kMin]} and ${FACES[kMax]} OVERLAP — together ${sum} thick (${tMin} + ${tMax}) along ${AXIS_NAMES[a]}, but its box is ${len} across (${c0} to ${c1}). Set "fit" to "clip" (the ${FACES[kMin]} keeps its thickness, the ${FACES[kMax]} gets the rest) or "scale" (both shrink until they meet), or bound the thickness, e.g. min(<thickness>, box("s${AXIS_NAMES[a]}") * 0.5).`,
            );
          }
          if (fit === FIT_CLIP) {
            tMin = Math.min(tMin, len);
            tMax = len - tMin;
          } else {
            const s = len / sum;
            tMin *= s;
            tMax = len - tMin;
          }
        }
        // The planes, each from its own side; then made to meet when they
        // cross or come within f32 precision, so the pieces tile exactly.
        // A plane within f32 precision of the far side IS the far side, so
        // a face that fills its span leaves no sliver for its opposite.
        let p0 = c0 + tMin;
        let p1 = c1 - tMax;
        if (p0 > c1 - eps) p0 = c1;
        if (p1 < p0 + eps) p1 = p0;
        cut[a * 2] = p0;
        cut[a * 2 + 1] = p1;
      }
    };

    /** The box of face code k at cell i into `box`, from the planes in `cut`. */
    const pieceBox = (i: number, k: number): void => {
      for (let a = 0; a < 3; a++) {
        box[a] = lo[i * 3 + a];
        box[3 + a] = hi[i * 3 + a];
      }
      const xA = cut[0];
      const xB = cut[1];
      const yA = cut[2];
      const yB = cut[3];
      const zA = cut[4];
      const zB = cut[5];
      switch (k) {
        case 0: // floor: full footprint, y0 .. yA
          box[4] = yA;
          break;
        case 5: // ceiling: full footprint, yB .. y1
          box[1] = yB;
          break;
        case 1: // south: full x, between floor and ceiling, z0 .. zA
          box[1] = yA;
          box[4] = yB;
          box[5] = zA;
          break;
        case 2: // north: full x, between floor and ceiling, zB .. z1
          box[1] = yA;
          box[4] = yB;
          box[2] = zB;
          break;
        case 3: // west: x0 .. xA, between south and north
          box[3] = xA;
          box[1] = yA;
          box[4] = yB;
          box[2] = zA;
          box[5] = zB;
          break;
        case 4: // east: xB .. x1, between south and north
          box[0] = xB;
          box[1] = yA;
          box[4] = yB;
          box[2] = zA;
          box[5] = zB;
          break;
        default: // interior
          box[0] = xA;
          box[3] = xB;
          box[1] = yA;
          box[4] = yB;
          box[2] = zA;
          box[5] = zB;
      }
    };
    /** A piece exists when it has volume AS STORED: positive f32 extent on all three axes. */
    const hasVolume = (): boolean =>
      Math.fround(box[3]) > Math.fround(box[0]) &&
      Math.fround(box[4]) > Math.fround(box[1]) &&
      Math.fround(box[5]) > Math.fround(box[2]);

    // ---- pass 1: how many pieces each cell emits, so the output is
    // allocated once.
    const counts = new Uint8Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      let c = 0;
      if (!splits(i)) c = 1;
      else {
        layoutCell(i);
        for (let j = 0; j < N; j++) {
          if (isGap[j] !== 0) continue;
          pieceBox(i, faceOf[j]);
          if (hasVolume()) c++;
        }
        if (withInterior) {
          pieceBox(i, INTERIOR);
          if (hasVolume()) c++;
        }
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
    const [labelName, faceName, alongName, upName, outAxisName, outwardName] = slots.map((s) => s[1]);
    const labelOut = labelName !== "" ? (outSet.get(labelName) ?? outSet.add(labelName, "string", 1, "")) : undefined;
    const oLabel = labelOut !== undefined ? (labelOut.writable() as Uint32Array) : undefined;
    const i32Col = (name: string): Int32Array | undefined =>
      name !== "" ? ((outSet.get(name) ?? outSet.add(name, "i32", 1, -1)).writable() as Int32Array) : undefined;
    const oFace = i32Col(faceName);
    const oAlong = i32Col(alongName);
    const oUp = i32Col(upName);
    const oOutAxis = i32Col(outAxisName);
    const oOutward =
      outwardName !== "" ? ((outSet.get(outwardName) ?? outSet.add(outwardName, "f32", 3, [0, 0, 0])).writable() as Float32Array) : undefined;
    // Each label interned ONCE into the output's string table.
    const labelCode = new Uint32Array(N);
    let interiorCode = 0;
    if (labelOut !== undefined) {
      for (let j = 0; j < N; j++) if (isGap[j] === 0) labelCode[j] = labelOut.internString(labels[j] as string);
      if (withInterior) interiorCode = labelOut.internString(interiorLabel);
    }
    const oLo = outSet.require("boundsMin").writable() as Float32Array;
    const oHi = outSet.require("boundsMax").writable() as Float32Array;
    const sd = seedAttr ? (seedAttr.data as Uint32Array) : undefined;
    const oSeed = (outSet.get("seed") ?? outSet.add("seed", "u32", 1, 0)).writable() as Uint32Array;

    const write = (w: number, k: number, h1: number, label: number): void => {
      for (let a = 0; a < 3; a++) {
        oLo[w * 3 + a] = box[a];
        oHi[w * 3 + a] = box[3 + a];
      }
      oSeed[w] = faceSeed(h1, k);
      if (oLabel) oLabel[w] = label;
      if (oFace) oFace[w] = k;
      if (oAlong) oAlong[w] = ALONG[k];
      if (oUp) oUp[w] = UP[k];
      if (oOutAxis) oOutAxis[w] = OUT[k];
      if (oOutward) {
        const v = OUTWARD[k];
        oOutward[w * 3] = v[0];
        oOutward[w * 3 + 1] = v[1];
        oOutward[w * 3 + 2] = v[2];
      }
    };

    // ---- pass 2: lay out again and write the pieces.
    let w = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (!splits(i)) {
        // Passed through: gathered as it was, seed included.
        w++;
        continue;
      }
      layoutCell(i);
      const h1 = hashMix(hashSeed(2), sd === undefined ? 0 : sd[i]);
      for (let j = 0; j < N; j++) {
        if (isGap[j] !== 0) continue;
        const k = faceOf[j];
        pieceBox(i, k);
        if (!hasVolume()) continue;
        write(w++, k, h1, labelCode[j]);
      }
      if (withInterior) {
        pieceBox(i, INTERIOR);
        if (hasVolume()) write(w++, INTERIOR, h1, interiorCode);
      }
    }
    return { out: [makeGeometryItem(out)] };
  },
});
