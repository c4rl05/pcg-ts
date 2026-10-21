/**
 * `repeatPoints`: emit every input point a per-point number of times, each
 * copy numbered, in point-major order.
 *
 * WHAT IT REPLACES, because the replacement is the reason it exists. Before
 * this node a graph that wanted "each point, N times, with a copy index"
 * built a rule cloud of a FIXED width (a `pointLine` whose start and end
 * coincide, plus a setAttribute writing the slot), stamped it onto the
 * points with `copyToPoints`, carried every attribute it still needed
 * through a hand-kept `targetNames` list, and filtered `slot < n` away
 * afterwards. Three costs came with it: the fan width had to be the
 * LARGEST count any point could ask for, so most copies were made only to
 * be thrown away; an attribute forgotten in `targetNames` was silently
 * absent downstream; and the copy seeds were whatever the rule cloud's
 * seeds made them. Here the count is read per point, nothing is made that
 * is not kept, and every point attribute rides along with no list at all.
 */
import { hashFinalize, hashMix, hashSeed } from "../random/hash.js";
import { STANDARD_POINT_ATTRS } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
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
import type {
  RepeatPointsInputs,
  RepeatPointsOutputs,
  RepeatPointsParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { RepeatPointsParams } from "./params.generated.js";

const NODE = "repeatPoints";

/**
 * Ceiling on the points one `repeatPoints` may emit, across the whole
 * input.
 *
 * Not a semantic limit — it changes no copy the node makes — but the
 * post-resolution check a fielded allocation param owes (see
 * `docs/authoring.md`, "Where a fielded allocation param has a global cap,
 * the cap becomes a post-resolution check"): a PLAIN count is a number the
 * author typed, a field is not, and `mul(1e6, attribute("height"))` would
 * otherwise ask for an allocation nothing can serve and die without a
 * message. Checked on the running TOTAL rather than per point, for
 * `pointScatterOnPath`'s reason — a per-point cap would pass a million
 * points asking for a million copies each.
 *
 * Four times `pointScatterOnPath`'s ceiling and equal to the point lattice
 * ceiling in `sources.ts`, because this node's INPUT may already be a large
 * cloud: a 500,000-point scatter repeated four times is an ordinary cook,
 * and the guard is for runaway expressions, not for that. Raising it later
 * is always compatible; the error names the numbers so an author can bound
 * the expression instead.
 */
const MAX_REPEAT_POINTS = 1 << 22;

/**
 * The seed of copy `k` of a point whose seed is `pointSeed`:
 * `hashCombine(pointSeed, k)`, spelled out so the per-copy inner loop does
 * not allocate the variadic form's rest array once per copy. `h1` is
 * `hashMix(hashSeed(2), pointSeed)`, folded once per POINT by the caller;
 * the result is bit-identical to `hashCombine(pointSeed, k)` (the test file
 * pins that).
 */
function copySeed(h1: number, k: number): number {
  return hashFinalize(hashMix(h1, k));
}

/** Each input point repeated a per-point number of times, every attribute carried. */
export const repeatPoints = standardNode<
  RepeatPointsParams,
  RepeatPointsInputs,
  RepeatPointsOutputs
>({
  type: NODE,
  category: "point op",
  description:
    "Emits every input point `count` times — a PER-POINT number of times when `count` is a field — and numbers the copies 0, 1, ..., count - 1 in `indexAttr`. This is the fan-out a split grammar, a stack of storeys or a row of bays needs: a cell that becomes N children, a wall that becomes N courses, a bay that becomes N panes, where N is the point's own value. OUTPUT ORDER IS POINT-MAJOR: all the copies of input point 0 (copy 0 first), then all the copies of point 1, and so on, so copy k of a point sits next to copy k + 1 and the input order is kept between points. EVERY POINT ATTRIBUTE IS CARRIED onto every copy — the standard columns and every custom one, of every type, strings included (re-interned, so each copy says the word its point said) — with no carry list to keep, and the DETAIL attributes come through unchanged. The copies are COINCIDENT: nothing is moved, so a copy is placed by what reads the index downstream (a transformPoints or setAttribute whose field reads `attribute(\"copy\")`), not by this node. EACH COPY GETS ITS OWN SEED, and that is not optional, because a point's identity is its position bits plus its `seed` and coincident copies with one seed would be ONE point to every identity-keyed decision (jitter, random fields, selfPrune ties): copy k of a point carrying seed s gets seed hashCombine(s, k) — the source point's own seed and the copy index, never the output slot, in the spirit of copyToPoints' hashCombine(sourceSeed, targetSeed). COPY 0 IS RE-SEEDED TOO, deliberately: if copy 0 kept s, then repeating twice in a row would give copy (0 of copy 1) and copy (1 of copy 0) the same seed hashCombine(s, 1) at the same position — two different copies merged into one point. Hashing every copy makes chained repeats distinct; the cost is that count 1 is not a byte-identical pass-through (the seeds change, the index column is added, and topology is dropped). A cloud with no `seed` column contributes 0, exactly as point identity reads it (copyToPoints falls back to the point INDEX there instead, which would tie the copies' seeds to the slot), so copies of different seedless points still differ by position. COUNT 0 DROPS THE POINT, and a point dropped here leaves no trace — which is how a fan-out wider for some points than others costs only what is kept. TOPOLOGY IS DROPPED: the output is a point cloud, and the input's vertices, primitives and their attributes are gone — what the point filters do by default and what mergePoints does. To repeat a path or a mesh as a SHAPE — every primitive once per copy — use copyToPoints with `topology \"keep\"`, which re-emits the source's primitives onto each target. CPU only: `count` is a comparison-like decision (it is rounded to a whole number) and the GPU's published tolerance cannot bound which side of a .5 a value lands on.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    count: {
      type: "f32",
      default: 2,
      min: 0,
      acceptsField: true,
      description: `How many times to emit each point. AS A FIELD IT IS ONE COUNT PER INPUT POINT, resolved on the input's point domain, so it reads what the point carries: attribute("storeys") stacks each block its own number of storeys, floor(div(attribute("length"), 1.2)) gives each wall as many bays as fit, and randomField() varies it per point. THE RESOLVED VALUE IS ROUNDED TO NEAREST with Math.round, which rounds a half UP (toward +Infinity), and then CLAMPED AT 0 — the rule pointScatterOnPath's \`count\` states, so a count field means the same thing on both nodes: 2.5 emits 3 copies, 2.4 emits 2, and a negative emits none rather than erroring, since "fewer than none" has exactly one reading. To get a FLOOR (as many whole copies as fit), say so: floor(<expr>). COUNT 0 DROPS THE POINT. A NON-FINITE resolved value is REFUSED, naming this param and the point: a field is not range-checked the way a plain number is, so a division by zero arrives here as NaN and has no reading as a population — bound the expression, e.g. max(<expr>, 0) or a guard under the div. THE CAP IS ON THE TOTAL: the rounded counts are summed over every input point and the cook is refused past ${MAX_REPEAT_POINTS} output points, naming the point the total ran out on — bound the expression with min(<expr>, <the most copies you meant>).`,
    },
    indexAttr: {
      type: "string",
      default: "copy",
      description:
        "Name of the i32 POINT attribute (tuple 1) receiving each copy's index within its own point's copies: 0 for the first copy of every point, up to count - 1. This is the number a downstream field places the copies by — add(attribute(\"lo\"), mul(attribute(\"copy\"), 3)) stacks them 3 apart — and the one copyToPoints' rule-cloud pattern used to recover from a `slot` attribute. The column's default is -1, the value no copy gets, so an element appended later reads as no copy at all. It is a REPORTING SLOT: an input point attribute of the same shape (i32, tuple 1) under this name is overwritten, which is what re-running the node over its own output does — so give a SECOND repeatPoints in a chain a different name, or the outer copy index replaces the inner one — and one of any other shape is refused rather than destroyed. The standard point attributes (\"P\", \"seed\", \"color\" and the rest) are refused by name whatever the input holds. Empty writes no index column.",
    },
    countAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of an i32 POINT attribute (tuple 1) receiving, on every copy, how many copies its point was emitted — the rounded, clamped count, so a copy can ask where it stands in its run (sub(attribute(\"n\"), attribute(\"copy\")) counts down to 1 on the last copy; div(attribute(\"copy\"), attribute(\"n\")) is a 0-based fraction). Empty (the default) writes none. A reporting slot under the same rule as `indexAttr`: a same-shape input column is overwritten, any other shape refused, and a standard point attribute refused by name. Naming the same attribute as `indexAttr` is refused — the two are different numbers and one would silently overwrite the other.",
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    // Params before geometry, as in pointScatterOnPath: a bad param must
    // not be reported as something wrong with the input.
    requireFinitePlainParam(
      params.count,
      NODE,
      "count",
      "A count must be a finite number >= 0 (it is rounded to nearest and clamped at 0). Write a plain count, or bound the expression with max(<expr>, 0).",
    );
    const indexName = params.indexAttr;
    const countName = params.countAttr;
    if (indexName !== "" && indexName === countName) {
      throw new Error(
        `${NODE}: params "indexAttr" and "countAttr" are both "${indexName}"; they are two different numbers (which copy this is, and how many copies its point made) and need two attributes, or the second would overwrite the first with no complaint. Rename one, or clear "countAttr" to write only the index.`,
      );
    }

    const src = requireGeometry(inputs, "in", NODE);
    const srcSet = src.attrs.point;
    const n = srcSet.count;

    // The seed column is REWRITTEN per copy, so its shape has to be the
    // standard one: a u32 hash written into an f32 column would round to 24
    // bits, and into a vector column would land on the wrong lanes.
    const seedAttr = srcSet.get("seed");
    if (seedAttr && (seedAttr.type !== "u32" || seedAttr.tupleSize !== 1)) {
      throw new Error(
        `${NODE}: the standard point attribute "seed" must be u32 with tupleSize 1 — this node writes a fresh seed on every copy so coincident copies stay distinct points — but the input on pin "in" has it as ${seedAttr.type} tupleSize ${seedAttr.tupleSize}. Rename that column with setAttribute, or removeAttribute it if it is dead.`,
      );
    }
    // The STANDARD point columns are refused BY NAME, whatever the input
    // holds. The shape check below only sees the input, and an input
    // without the column passes it: a seedless cloud with indexAttr "seed"
    // would get the u32 seed this node writes replaced by an i32 copy
    // index, and every identity downstream would quietly key on it. A
    // standard name is never this node's to use as a report slot.
    for (const [param, name] of [
      ["indexAttr", indexName],
      ["countAttr", countName],
    ] as const) {
      if (STANDARD_POINT_ATTRS.some((std) => std.name === name)) {
        throw new Error(
          `${NODE}: param "${param}" cannot write "${name}" — it is a standard point attribute (${STANDARD_POINT_ATTRS.map((std) => std.name).join(", ")}), ${name === "seed" ? "and this node writes a fresh seed on every copy, so the two would fight over one column" : "whose meaning every other node relies on, so writing a copy number into it would silently change what that column means downstream"}. Name an attribute of your own instead (e.g. "${param === "indexAttr" ? "copy" : "copyCount"}").`,
        );
      }
    }
    // Both slots are checked against the INPUT's columns, which is what the
    // output's point domain is made of: a collision there is a column the
    // author put on the input, so "remove it from the input" is real advice.
    // Checked before anything is resolved or allocated.
    if (indexName !== "") {
      requireReportSlot({
        attrs: srcSet,
        nodeType: NODE,
        param: "indexAttr",
        name: indexName,
        type: "i32",
        tupleSize: 1,
        domain: "point",
        suggestion: "copy",
      });
    }
    if (countName !== "") {
      requireReportSlot({
        attrs: srcSet,
        nodeType: NODE,
        param: "countAttr",
        name: countName,
        type: "i32",
        tupleSize: 1,
        domain: "point",
        suggestion: "copyCount",
      });
    }

    // One count per INPUT point. Guarded (`resolveOn`, not the allowing
    // variant): a NaN population has no documented meaning here.
    const countCol = requireScalarColumn(
      resolveOn(src, "point", params.count, seed, NODE, "count"),
      NODE,
      "count",
      "point",
      "a count",
    );

    // Counts first, whole, so the output is allocated once and the cap is
    // checked before a byte of it exists.
    const counts = new Uint32Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const raw = countCol.data[i];
      const c = Math.max(0, Math.round(raw));
      if (total + c > MAX_REPEAT_POINTS) {
        throw new Error(
          `${NODE}: the resolved counts would emit more than ${MAX_REPEAT_POINTS} points from the input's ${n} point(s) — "count" resolved to ${raw} at point ${i}, and the running total reached ${total + c}. The cap is on the TOTAL, not on one point, so this is the point the total ran out on rather than necessarily the largest offender. A field is not range-checked the way a plain number is, so bound the expression itself — min(<the count field>, <the most copies you meant>) — or lower a plain count.`,
        );
      }
      counts[i] = c;
      total += c;
    }

    // The input point behind each output slot, point-major.
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

    // Every point column, every type, gathered through the one map: no
    // carry list, so no attribute can be forgotten. A fresh geometry with
    // NO topology — see the node description for why topology is dropped.
    const out = gatherPoints(src, srcIdx);
    // The detail domain has exactly one element on both sides, so it is
    // carried whole.
    copyElements(src.attrs.detail, out.attrs.detail, undefined, src.attrs.detail.count);
    const outSet = out.attrs.point;

    const sd = seedAttr ? (seedAttr.data as Uint32Array) : undefined;
    const oSeed = (outSet.get("seed") ?? outSet.add("seed", "u32", 1, 0)).writable() as Uint32Array;
    // `replace` resets a same-shape column in place and the slot checks
    // above have already refused every other shape, so neither can delete
    // a column the author meant to keep.
    const oIndex = indexName !== "" ? (outSet.replace(indexName, "i32", 1, -1).writable() as Int32Array) : undefined;
    const oCount = countName !== "" ? (outSet.replace(countName, "i32", 1, 0).writable() as Int32Array) : undefined;

    let w = 0;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const c = counts[i];
      if (c === 0) continue;
      // hashCombine(pointSeed, k) for every copy k, copy 0 included — see
      // the description for why copy 0 is not left with the point's seed.
      const h1 = hashMix(hashSeed(2), sd === undefined ? 0 : sd[i]);
      for (let k = 0; k < c; k++) {
        oSeed[w + k] = copySeed(h1, k);
      }
      if (oIndex) for (let k = 0; k < c; k++) oIndex[w + k] = k;
      if (oCount) oCount.fill(c, w, w + c);
      w += c;
    }
    return { out: [makeGeometryItem(out)] };
  },
});
