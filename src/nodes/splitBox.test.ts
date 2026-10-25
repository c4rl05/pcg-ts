/**
 * `splitBox`: each cell's box cut along one axis into labelled pieces.
 *
 * Expectations are written out by hand from the cell and the segment list
 * (which piece, which label, which box), never recorded from a run — the
 * node's claim is a layout rule, and a recorded expectation would move with
 * the code.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { attribute, constant } from "../fields/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import {
  deserializeGraph,
  fieldFromJson,
  parseFieldText,
  pointGrid,
  serializeGraph,
  setAttribute,
  setBounds,
} from "./index.js";
import { repeatPoints } from "./repeatPoints.js";
import { splitBox } from "./splitBox.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

async function split(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(splitBox, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

function strings(geo: Geometry, name: string): string[] {
  const a = geo.attrs.point.require(name);
  return Array.from({ length: geo.attrs.point.count }, (_, i) => a.getString(i));
}

/** The [lo, hi] interval of every piece along one axis. */
function spans(geo: Geometry, axis = 0): [number, number][] {
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  return Array.from({ length: geo.pointCount }, (_, i) => [lo[i * 3 + axis], hi[i * 3 + axis]]);
}

/** Cells with the given boxes and seeds 100, 101, ... */
function cells(boxes: [number[], number[]][]): Geometry {
  const geo = createPointCloud(boxes.length);
  const pts = geo.attrs.point;
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  const seed = pts.require("seed");
  boxes.forEach(([a, b], i) => {
    lo.setTuple(i, a);
    hi.setTuple(i, b);
    seed.set(i, 100 + i);
  });
  return geo;
}

const unitCell = (x0: number, x1: number): Geometry => cells([[[x0, 0, 0], [x1, 1, 1]]]);

// ---------------------------------------------------------------------------

describe("splitBox: units", () => {
  it("all relative: the box is shared by weight", async () => {
    const out = await split(unitCell(0, 10), { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(spans(out)).toEqual([
      [0, 5],
      [5, 10],
    ]);
    expect(strings(out, "piece")).toEqual(["a", "b"]);
    expect(col(out, "pieceIndex")).toEqual([0, 1]);
  });

  it("weights are proportions of the rest, not lengths", async () => {
    const out = await split(unitCell(0, 9), { labels: ["a", "b"], sizes: [2, 1], units: ["relative", "relative"] });
    expect(spans(out)).toEqual([
      [0, 6],
      [6, 9],
    ]);
  });

  it("all absolute, filling the box exactly", async () => {
    const out = await split(unitCell(0, 10), {
      labels: ["a", "b", "c"],
      sizes: [2, 3, 5],
      units: ["absolute", "absolute", "absolute"],
    });
    expect(spans(out)).toEqual([
      [0, 2],
      [2, 5],
      [5, 10],
    ]);
  });

  it("mixed: relative segments share what the absolute ones leave", async () => {
    // 10 long: a takes 2 and d takes 1, wherever they sit; the rest, 7,
    // goes to b and c by weight 1 : 6.
    const out = await split(unitCell(0, 10), {
      labels: ["a", "b", "c", "d"],
      sizes: [2, 1, 6, 1],
      units: ["absolute", "relative", "relative", "absolute"],
    });
    expect(spans(out)).toEqual([
      [0, 2],
      [2, 3],
      [3, 9],
      [9, 10],
    ]);
  });

  it("cuts only the chosen axis; the other two keep the cell's extent", async () => {
    const geo = cells([[[1, 2, 3], [5, 10, 7]]]);
    const out = await split(geo, { axis: "y", labels: ["lo", "hi"], sizes: [3, 1], units: ["absolute", "relative"] });
    expect(col(out, "boundsMin")).toEqual([1, 2, 3, 1, 5, 3]);
    expect(col(out, "boundsMax")).toEqual([5, 5, 7, 5, 10, 7]);
  });

  it("moves nothing: P, rot and scale are carried untouched", async () => {
    const geo = unitCell(0, 4);
    geo.attrs.point.require("P").setTuple(0, [7, 8, 9]);
    geo.attrs.point.require("scale").setTuple(0, [2, 2, 2]);
    const out = await split(geo, { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(col(out, "P")).toEqual([7, 8, 9, 7, 8, 9]);
    expect(col(out, "scale")).toEqual([2, 2, 2, 2, 2, 2]);
  });
});

describe("splitBox: repeat", () => {
  const bays = (len: number, module: number, repeatRound = "floor") =>
    split(unitCell(0, len), { labels: ["bay"], sizes: [module], units: ["repeat"], repeatRound, countAttr: "n" });

  it("fills the rest with max(1, floor(rest / module)) equal pieces", async () => {
    const out = await bays(10, 4);
    expect(spans(out)).toEqual([
      [0, 5],
      [5, 10],
    ]);
    expect(strings(out, "piece")).toEqual(["bay", "bay"]);
    expect(col(out, "pieceIndex")).toEqual([0, 1]);
    expect(col(out, "n")).toEqual([2, 2]);
  });

  it("rounds the count by repeatRound", async () => {
    // 10 / 4 = 2.5: floor 2, round 3 (half up), ceil 3; 10 / 3 = 3.33: ceil 4.
    expect((await bays(10, 4, "floor")).pointCount).toBe(2);
    expect((await bays(10, 4, "round")).pointCount).toBe(3);
    expect((await bays(10, 4, "ceil")).pointCount).toBe(3);
    expect((await bays(10, 3, "ceil")).pointCount).toBe(4);
    expect((await bays(10, 3, "round")).pointCount).toBe(3);
  });

  it("a module longer than the box still gives one piece", async () => {
    const out = await bays(3, 4);
    expect(spans(out)).toEqual([[0, 3]]);
  });

  it("is the house's bays: u0 + floor(k * len / nb) on an integer lattice", async () => {
    // nb = max(1, floor(len / bayWidth)) and the bay edges are floored —
    // repeat + snap 1 floor, checked over a sweep of wall lengths and
    // starts against the arithmetic written out.
    for (const u0 of [0, 3, -7]) {
      for (let len = 1; len <= 23; len++) {
        const out = await split(unitCell(u0, u0 + len), {
          labels: ["bay"],
          sizes: [4],
          units: ["repeat"],
          snap: [1, 1, 1],
          snapMode: "floor",
        });
        const nb = Math.max(1, Math.floor(len / 4));
        const want: [number, number][] = [];
        for (let k = 0; k < nb; k++) want.push([u0 + Math.floor((k * len) / nb), u0 + Math.floor(((k + 1) * len) / nb)]);
        expect(spans(out), `u0 ${u0} len ${len}`).toEqual(want);
      }
    }
  });

  it("shares the box with absolute segments: they are taken first", async () => {
    const out = await split(unitCell(0, 10), {
      labels: ["plinth", "storey"],
      sizes: [1, 3],
      units: ["absolute", "repeat"],
      countAttr: "n",
    });
    expect(spans(out)).toEqual([
      [0, 1],
      [1, 4],
      [4, 7],
      [7, 10],
    ]);
    expect(strings(out, "piece")).toEqual(["plinth", "storey", "storey", "storey"]);
    expect(col(out, "pieceIndex")).toEqual([0, 1, 2, 3]);
    expect(col(out, "n")).toEqual([4, 4, 4, 4]);
  });

  it("refuses a second repeat, and a repeat beside a relative", async () => {
    const two = await rejection(
      split(unitCell(0, 10), { labels: ["a", "b"], sizes: [1, 1], units: ["repeat", "repeat"] }),
    );
    expect(two).toMatch(/segments 0 \("a"\) and 1 \("b"\) are both "repeat"/);
    const mixed = await rejection(
      split(unitCell(0, 10), { labels: ["a", "b"], sizes: [1, 1], units: ["repeat", "relative"] }),
    );
    expect(mixed).toMatch(/"repeat" and another segment is "relative"/);
  });

  it("refuses a module that is not > 0, naming the segment and cell", async () => {
    const msg = await rejection(split(unitCell(0, 10), { labels: ["bay"], sizes: [0], units: ["repeat"] }));
    expect(msg).toMatch(/segment 0 \("bay"\) is "repeat".*resolved to 0 at cell 0.*must be > 0/);
  });

  it("refuses a repeat past the output cap before laying it out", async () => {
    const msg = await rejection(split(unitCell(0, 1), { labels: ["bay"], sizes: [1e-7], units: ["repeat"] }));
    expect(msg).toMatch(/more than 4194304 points/);
    // 1 / f32(1e-7) is 9999999.88: within f32 slack of the 10^7 pieces meant.
    expect(msg).toMatch(/segment 0 \("bay"\) repeats 10000000 times at cell 0/);
  });
});

describe("splitBox: snap", () => {
  const thirds = (snapMode: string) =>
    split(unitCell(0, 10), {
      labels: ["a", "b", "c"],
      sizes: [1, 1, 1],
      units: ["relative", "relative", "relative"],
      snap: [1, 0, 0],
      snapMode,
    });

  it("puts interior cuts on the lattice by snapMode; the cell's own ends never move", async () => {
    // Cuts at 3.33 and 6.67.
    expect(spans(await thirds("round"))).toEqual([
      [0, 3],
      [3, 7],
      [7, 10],
    ]);
    expect(spans(await thirds("floor"))).toEqual([
      [0, 3],
      [3, 6],
      [6, 10],
    ]);
    expect(spans(await thirds("ceil"))).toEqual([
      [0, 4],
      [4, 7],
      [7, 10],
    ]);
  });

  it("uses the split axis's component of snap", async () => {
    const geo = cells([[[0, 0, 0], [10, 10, 10]]]);
    const params = { labels: ["a", "b", "c"], sizes: [1, 1, 1], units: ["relative", "relative", "relative"], snap: [1, 5, 0] };
    expect(spans(await split(geo, { ...params, axis: "x" }), 0)).toEqual([
      [0, 3],
      [3, 7],
      [7, 10],
    ]);
    // y on a 5 lattice: 3.33 -> 5, 6.67 -> 5, so the middle piece is gone.
    const y = await split(geo, { ...params, axis: "y" });
    expect(spans(y, 1)).toEqual([
      [0, 5],
      [5, 10],
    ]);
    expect(strings(y, "piece")).toEqual(["a", "c"]);
    // z: step 0, no snapping.
    expect(spans(await split(geo, { ...params, axis: "z" }), 2).map(([a, b]) => [a, Math.fround(b)])).toEqual([
      [0, Math.fround(10 / 3)],
      [Math.fround(10 / 3), Math.fround(20 / 3)],
      [Math.fround(20 / 3), 10],
    ]);
  });

  it("is an ABSOLUTE lattice: a cell off the lattice keeps its ends, its cuts land on lattice lines", async () => {
    const out = await split(unitCell(0.5, 9.5), {
      labels: ["a", "b"],
      sizes: [1, 1],
      units: ["relative", "relative"],
      snap: [2, 0, 0],
    });
    // The cut at 5 rounds to 6 (2.5 lattice steps, a half rounds up).
    expect(spans(out)).toEqual([
      [0.5, 6],
      [6, 9.5],
    ]);
  });

  it("treats a cut within f32 precision of a lattice line as on it", async () => {
    // 1.2 stored in f32 is 1.2000000477; on a 0.4 lattice, ceil must keep
    // the cuts at 0.4 and 0.8 rather than pushing them a whole step on.
    const out = await split(unitCell(0, 1.2), {
      labels: ["a", "b", "c"],
      sizes: [0.4, 0.4, 1],
      units: ["absolute", "absolute", "relative"],
      snap: [0.4, 0, 0],
      snapMode: "ceil",
    });
    expect(spans(out)).toEqual([
      [0, Math.fround(0.4)],
      [Math.fround(0.4), Math.fround(0.8)],
      [Math.fround(0.8), Math.fround(1.2)],
    ]);
  });
});

describe("splitBox: dropped pieces and gaps", () => {
  it("drops a zero-size piece and keeps the others' slot index (and seed)", async () => {
    const out = await split(unitCell(0, 5), {
      labels: ["under", "sill", "opening"],
      sizes: [0, 1, 1],
      units: ["absolute", "absolute", "relative"],
    });
    expect(strings(out, "piece")).toEqual(["sill", "opening"]);
    expect(spans(out)).toEqual([
      [0, 1],
      [1, 5],
    ]);
    expect(col(out, "pieceIndex")).toEqual([1, 2]);
    expect(col(out, "seed")).toEqual([hashCombine(100, 1), hashCombine(100, 2)]);
  });

  it("a negative size counts as 0", async () => {
    const out = await split(unitCell(0, 5), { labels: ["a", "b"], sizes: [-3, 1], units: ["absolute", "relative"] });
    expect(strings(out, "piece")).toEqual(["b"]);
    expect(spans(out)).toEqual([[0, 5]]);
  });

  it('a "" label is a GAP: it takes its space and emits nothing', async () => {
    // The house's storeys: three storeys, and the tier's ceiling plate on
    // top left to another node.
    const out = await split(unitCell(0, 10), {
      labels: ["storey", ""],
      sizes: [3, 1],
      units: ["repeat", "absolute"],
      indexAttr: "level",
      countAttr: "n",
    });
    expect(spans(out)).toEqual([
      [0, 3],
      [3, 6],
      [6, 9],
    ]);
    expect(col(out, "level")).toEqual([0, 1, 2]);
    expect(col(out, "n")).toEqual([4, 4, 4]);
  });

  it("drops a piece that snapping shrinks to nothing", async () => {
    const out = await split(unitCell(0, 1), {
      labels: ["a", "b"],
      sizes: [1, 1],
      units: ["relative", "relative"],
      snap: [1, 0, 0],
      snapMode: "floor",
    });
    expect(strings(out, "piece")).toEqual(["b"]);
    expect(spans(out)).toEqual([[0, 1]]);
  });

  it("a zero-length cell emits nothing; a pass-through one is still emitted", async () => {
    const geo = cells([
      [[2, 0, 0], [2, 1, 1]],
      [[0, 0, 0], [4, 1, 1]],
    ]);
    const out = await split(geo, { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(spans(out)).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });
});

describe("splitBox: fit", () => {
  const over = (fit: string) =>
    split(unitCell(0, 10), { labels: ["a", "b", "c"], sizes: [6, 6, 1], units: ["absolute", "absolute", "relative"], fit });
  const under = (fit: string) =>
    split(unitCell(0, 10), { labels: ["a", "b"], sizes: [2, 3], units: ["absolute", "absolute"], fit });

  it('"error" refuses an overflow, naming the cell, the segment and the numbers', async () => {
    const msg = await rejection(over("error"));
    expect(msg).toMatch(/cell 0 OVERFLOWS/);
    expect(msg).toMatch(/need 12 along x but its box is 10 long/);
    expect(msg).toMatch(/segment 1 \("b", size 6\) is where the running total passed the box, at 12/);
    expect(msg).toMatch(/"clip".*"scale"/);
  });

  it('"clip" cuts the crossing piece at the box end and drops the rest', async () => {
    const out = await over("clip");
    expect(strings(out, "piece")).toEqual(["a", "b"]);
    expect(spans(out)).toEqual([
      [0, 6],
      [6, 10],
    ]);
  });

  it('"scale" shrinks the absolute pieces to fill the box', async () => {
    const out = await over("scale");
    expect(strings(out, "piece")).toEqual(["a", "b"]);
    expect(spans(out)).toEqual([
      [0, 5],
      [5, 10],
    ]);
  });

  it('"error" refuses an underfill with nothing to take the rest', async () => {
    const msg = await rejection(under("error"));
    expect(msg).toMatch(/cell 0 is UNDERFILLED — its segments cover 5 of a box 10 long/);
    expect(msg).toMatch(/remaining 5/);
  });

  it('"clip" leaves an underfill uncovered; "scale" stretches it', async () => {
    expect(spans(await under("clip"))).toEqual([
      [0, 2],
      [2, 5],
    ]);
    expect(spans(await under("scale"))).toEqual([
      [0, 4],
      [4, 10],
    ]);
  });

  it("a fill within f32 precision is exact, not an overflow", async () => {
    const out = await split(unitCell(0, 1), {
      labels: ["a", "b", "c"],
      sizes: [0.1, 0.2, 0.7],
      units: ["absolute", "absolute", "absolute"],
    });
    expect(out.pointCount).toBe(3);
    expect(spans(out)[2][1]).toBe(1);
  });
});

describe("splitBox: params", () => {
  it("refuses lists of different lengths", async () => {
    expect(await rejection(split(unitCell(0, 1), { labels: ["a", "b"], sizes: [1, 1], units: ["relative"] }))).toMatch(
      /"units" has 1 entry but "labels" has 2/,
    );
    expect(await rejection(split(unitCell(0, 1), { labels: ["a", "b"], sizes: [1], units: ["relative", "relative"] }))).toMatch(
      /"sizes" has 1 entry but "labels" has 2/,
    );
  });

  it("refuses an unknown unit, naming the entry and the valid ones", async () => {
    const msg = await rejection(split(unitCell(0, 1), { labels: ["a"], sizes: [1], units: ["rel"] }));
    expect(msg).toMatch(/"units" entry 0 \(segment "a"\) is "rel"; valid units: absolute, relative, repeat/);
  });

  it("refuses a sizes field of the wrong width", async () => {
    const msg = await rejection(
      split(unitCell(0, 1), { labels: ["a", "b", "c"], sizes: constant([1, 1]), units: ["relative", "relative", "relative"] }),
    );
    expect(msg).toMatch(/must evaluate to ONE COMPONENT PER SEGMENT — 3 .* tupleSize 2/);
  });

  it("refuses an empty label list", async () => {
    expect(await rejection(split(unitCell(0, 1), { labels: [], sizes: [], units: [] }))).toMatch(/"labels" is empty/);
  });

  it("refuses a box that is inside out along the split axis", async () => {
    const msg = await rejection(split(cells([[[5, 0, 0], [1, 1, 1]]]), {}));
    expect(msg).toMatch(/cell 0's box is inside out along x/);
  });

  it("refuses a non-finite size from a field, naming the param", async () => {
    const geo = unitCell(0, 1);
    geo.attrs.point.add("w", "f32", 1, Number.NaN);
    const msg = await rejection(
      split(geo, { labels: ["a", "b"], sizes: fieldFromJson({ fn: "vec", args: [{ fn: "attribute", name: "w" }, 1] }), units: ["absolute", "relative"] }),
    );
    expect(msg).toMatch(/splitBox: param "sizes"/);
  });
});

describe("splitBox: per-cell axis", () => {
  it('"perCell" cuts each cell along its own axisIndex', async () => {
    const geo = cells([
      [[0, 0, 0], [4, 1, 2]],
      [[0, 0, 0], [2, 1, 4]],
    ]);
    const ax = geo.attrs.point.add("ax", "f32", 1, 0);
    ax.set(1, 2);
    const out = await split(geo, {
      axis: "perCell",
      axisIndex: attribute("ax"),
      labels: ["a", "b"],
      sizes: [1, 1],
      units: ["relative", "relative"],
    });
    expect(col(out, "boundsMin")).toEqual([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2]);
    expect(col(out, "boundsMax")).toEqual([2, 1, 2, 4, 1, 2, 2, 1, 2, 2, 1, 4]);
  });

  it("refuses an axis index that is not 0, 1 or 2, naming the cell", async () => {
    const geo = unitCell(0, 1);
    geo.attrs.point.add("ax", "f32", 1, 3);
    const msg = await rejection(split(geo, { axis: "perCell", axisIndex: attribute("ax") }));
    expect(msg).toMatch(/"axisIndex" resolved to 3 at cell 0, which rounds to 3/);
  });

  it("ignores axisIndex unless axis is perCell", async () => {
    const out = await split(unitCell(0, 2), { axis: "x", axisIndex: 2 });
    expect(spans(out, 0)).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });
});

describe('splitBox: axis "longest"', () => {
  const halves = { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] };

  /** The axis each emitted pair was cut along: the one whose lo moved on the second piece. */
  function cutAxes(out: Geometry): number[] {
    const lo = col(out, "boundsMin");
    const axes: number[] = [];
    for (let i = 0; i < out.pointCount; i += 2) {
      const moved = [0, 1, 2].filter((a) => lo[(i + 1) * 3 + a] !== lo[i * 3 + a]);
      expect(moved.length).toBe(1);
      axes.push(moved[0]);
    }
    return axes;
  }

  it("cuts each cell across its own longest span, halves written out by hand", async () => {
    const geo = cells([
      [[0, 0, 0], [4, 1, 2]],
      [[0, 0, 0], [1, 3, 2]],
      [[0, 0, 0], [1, 1, 5]],
    ]);
    const out = await split(geo, { axis: "longest", ...halves });
    expect(col(out, "boundsMin")).toEqual([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 0, 0, 2.5]);
    expect(col(out, "boundsMax")).toEqual([2, 1, 2, 4, 1, 2, 1, 1.5, 2, 1, 3, 2, 1, 1, 2.5, 1, 1, 5]);
  });

  it('"longestOf" restricts the candidates: "xz" ignores a tall y', async () => {
    const geo = cells([
      [[0, 0, 0], [1, 9, 3]],
      [[0, 0, 0], [3, 9, 1]],
    ]);
    expect(cutAxes(await split(geo, { axis: "longest", longestOf: "xz", ...halves }))).toEqual([2, 0]);
    expect(cutAxes(await split(geo, { axis: "longest", ...halves }))).toEqual([1, 1]);
    expect(cutAxes(await split(cells([[[0, 0, 0], [9, 1, 3]]]), { axis: "longest", longestOf: "yz", ...halves }))).toEqual([2]);
    expect(cutAxes(await split(cells([[[0, 0, 0], [1, 2, 9]]]), { axis: "longest", longestOf: "xy", ...halves }))).toEqual([1]);
  });

  it("an exact tie goes to the first axis of the set, in x, y, z order", async () => {
    const geo = cells([
      [[0, 0, 0], [2, 2, 2]],
      [[0, 0, 0], [1, 3, 3]],
      [[0, 0, 0], [3, 1, 3]],
    ]);
    expect(cutAxes(await split(geo, { axis: "longest", ...halves }))).toEqual([0, 1, 0]);
    expect(cutAxes(await split(geo, { axis: "longest", longestOf: "yz", ...halves }))).toEqual([1, 1, 2]);
    // A zero-size box has every span tied at 0; it is not refused, and has
    // nothing to emit.
    const flat = cells([[[1, 1, 1], [1, 1, 1]]]);
    const out = await split(flat, { axis: "longest", longestOf: "yz", labels: ["a"], sizes: [1], units: ["relative"] });
    expect(out.pointCount).toBe(0);
  });

  it("a tie is to f32 precision: a square cell is cut along x even where its stored z span rounds longer", async () => {
    // x [0, 0.2] stores a span of 0.20000000298, z [0.1, 0.3] one of
    // 0.20000001043: z is longer by 7.5e-9 in f32, under an ulp — a tie.
    const square = cells([[[0, 0, 0.1], [0.2, 0.1, 0.3]]]);
    const lo = col(square, "boundsMin");
    const hi = col(square, "boundsMax");
    expect(hi[2] - lo[2]).toBeGreaterThan(hi[0] - lo[0]);
    expect(cutAxes(await split(square, { axis: "longest", ...halves }))).toEqual([0]);
    // Far from the origin an f32 step at x = 1e5 is 1/128, so a z span
    // 0.005 longer is still a tie, and one 0.05 longer is not.
    const far = cells([
      [[1e5, 0, 0], [1e5 + 4, 1, 4.005]],
      [[1e5, 0, 0], [1e5 + 4, 1, 4.05]],
    ]);
    expect(cutAxes(await split(far, { axis: "longest", ...halves }))).toEqual([0, 2]);
    // Near the origin the same 0.005 is far past precision: z.
    expect(cutAxes(await split(cells([[[0, 0, 0], [4, 1, 4.005]]]), { axis: "longest", ...halves }))).toEqual([2]);
  });

  it("is the argmax the graphs spelled by hand, on every cell of a random population", async () => {
    // select(sx >= sy && sx >= sz, 0, select(sy >= sz, 1, 2)): x wins its
    // ties, then y over z. Away from f32 near-ties the two must agree.
    const boxes: [number[], number[]][] = [];
    let s = 7;
    const rnd = (): number => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return (s >>> 8) / (1 << 24);
    };
    for (let i = 0; i < 400; i++) {
      // Corners and spans on a 0.25 grid: every stored span is exact, so
      // the ties are exact ties and no f32 near-tie separates the two.
      const l = [0, 1, 2].map(() => Math.floor(rnd() * 80) * 0.25 - 10);
      boxes.push([l, l.map((v) => v + Math.floor(rnd() * 12) * 0.25)]);
    }
    const geo = cells(boxes);
    const box = (n: string) => ({ fn: "box", name: n });
    const argmax = fieldFromJson({
      fn: "select",
      args: [
        { fn: "mul", args: [{ fn: "ge", args: [box("sx"), box("sy")] }, { fn: "ge", args: [box("sx"), box("sz")] }] },
        0,
        { fn: "select", args: [{ fn: "ge", args: [box("sy"), box("sz")] }, 1, 2] },
      ],
    });
    const byHand = await split(geo, { axis: "perCell", axisIndex: argmax, ...halves });
    const byNode = await split(geo, { axis: "longest", ...halves });
    expect(byHand.pointCount).toBeGreaterThan(0);
    expect(snapshotGeometry(byNode)).toEqual(snapshotGeometry(byHand));
    // The comparison can fail: cut along "xz" only, some cells differ.
    const xz = await split(geo, { axis: "longest", longestOf: "xz", ...halves });
    expect(snapshotGeometry(xz)).not.toEqual(snapshotGeometry(byHand));
  });

  it("refuses an unknown longestOf, naming the valid sets", async () => {
    const msg = await rejection(split(unitCell(0, 1), { axis: "longest", longestOf: "zx" }));
    expect(msg).toMatch(/param "longestOf" is "zx"; valid: xyz, xy, xz, yz/);
  });

  it("ignores longestOf unless axis is longest", async () => {
    const out = await split(cells([[[0, 0, 0], [2, 1, 9]]]), { axis: "x", longestOf: "xz", ...halves });
    expect(cutAxes(out)).toEqual([0]);
  });

  it("refuses a box inside out or not finite along any axis of the set, and only the set", async () => {
    const insideOutY = cells([[[0, 5, 0], [4, 1, 2]]]);
    expect(await rejection(split(insideOutY, { axis: "longest", ...halves }))).toMatch(
      /cell 0's box is inside out along y .* axis "longest" has no longest span/,
    );
    // y is not a candidate under "xz", so the cell is read only in x and z.
    expect(cutAxes(await split(insideOutY, { axis: "longest", longestOf: "xz", ...halves }))).toEqual([0]);
    const nanZ = cells([[[0, 0, Number.NaN], [4, 1, 2]]]);
    expect(await rejection(split(nanZ, { axis: "longest", ...halves }))).toMatch(/cell 0's box is not finite along z/);
  });

  it("does not read the box of a cell `where` passes through", async () => {
    const geo = cells([
      [[0, 0, Number.NaN], [4, 1, 2]],
      [[0, 0, 0], [1, 1, 6]],
    ]);
    geo.attrs.point.add("go", "f32", 1, 0).set(1, 1);
    const out = await split(geo, { axis: "longest", where: attribute("go"), ...halves });
    expect(out.pointCount).toBe(3);
    expect(spans(out, 2).slice(1)).toEqual([
      [0, 3],
      [3, 6],
    ]);
  });

  it("round-trips through JSON and cooks byte-identically, run to run", async () => {
    const build = (): Graph => {
      const g = new Graph(5);
      const grid = g.add(pointGrid, { countX: 3, countY: 1, countZ: 3, spacing: [5, 5, 5] }, "grid");
      const box = g.add(
        setBounds,
        {
          boundsMin: fieldFromJson({ fn: "position" }),
          boundsMax: fieldFromJson({
            fn: "add",
            args: [{ fn: "position" }, { fn: "vec", args: [{ fn: "add", args: [1, { fn: "mul", args: [{ fn: "randomField", key: "w" }, 4] }] }, 2, { fn: "add", args: [1, { fn: "mul", args: [{ fn: "randomField", key: "d" }, 4] }] }] }],
          }),
        },
        "box",
      );
      const cut = g.add(splitBox, { axis: "longest", longestOf: "xz", ...halves }, "cut");
      g.connect(grid, "out", box, "in");
      g.connect(box, "out", cut, "in");
      g.output(cut, "out", "pieces");
      return g;
    };
    const text = JSON.stringify(serializeGraph(build()));
    expect(text).toContain('"longestOf":"xz"');
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build())).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    const c = firstGeo((await cook(build())).outputs.pieces);
    expect(a.pointCount).toBe(18);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
    // Both floor axes are used across the nine random cells.
    expect(new Set(cutAxes(a))).toEqual(new Set([0, 2]));
  });
});

describe("splitBox: where (pass-through) and nested splits", () => {
  it("passes a cell where `where` is 0 through unsplit: seed, box and labels kept", async () => {
    const geo = cells([
      [[0, 0, 0], [4, 1, 1]],
      [[0, 0, 0], [6, 1, 1]],
    ]);
    const go = geo.attrs.point.add("go", "f32", 1, 0);
    go.set(1, 1);
    const out = await split(geo, { where: attribute("go"), labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(spans(out)).toEqual([
      [0, 4],
      [0, 3],
      [3, 6],
    ]);
    expect(col(out, "seed")).toEqual([100, hashCombine(101, 0), hashCombine(101, 1)]);
    expect(strings(out, "piece")).toEqual(["", "a", "b"]);
    expect(col(out, "pieceIndex")).toEqual([-1, 0, 1]);
  });

  it("the 7-piece opening is three chained splits, y then x then y, in order", async () => {
    // A bay 7 wide (x 0..7) and 10 tall (y 0..10): under 0..2, band 2..8
    // (sill 2..3, opening 3..7, lintel 7..8), over 8..10; jambs 0..2 and
    // 5..7 across the band, the opening 2..5 between them.
    const bay = cells([[[0, 0, 0], [7, 10, 1]]]);
    const isPiece = (name: string) => fieldFromJson({ fn: "attributeIs", name: "piece", value: name });
    const rows = await split(bay, { axis: "y", labels: ["wall", "band", "wall"], sizes: [2, 6, 1], units: ["absolute", "absolute", "relative"] });
    const cols = await split(rows, {
      axis: "x",
      where: isPiece("band"),
      labels: ["jamb", "mid", "jamb"],
      sizes: [2, 3, 1],
      units: ["absolute", "absolute", "relative"],
      indexAttr: "col",
    });
    const out = await split(cols, {
      axis: "y",
      where: isPiece("mid"),
      labels: ["sill", "opening", "lintel"],
      sizes: [1, 4, 1],
      units: ["absolute", "absolute", "relative"],
      indexAttr: "row",
    });
    expect(strings(out, "piece")).toEqual(["wall", "jamb", "sill", "opening", "lintel", "jamb", "wall"]);
    const lo = col(out, "boundsMin");
    const hi = col(out, "boundsMax");
    const boxes = Array.from({ length: out.pointCount }, (_, i) => [lo[i * 3], lo[i * 3 + 1], hi[i * 3], hi[i * 3 + 1]]);
    expect(boxes).toEqual([
      [0, 0, 7, 2],
      [0, 2, 2, 8],
      [2, 2, 5, 3],
      [2, 3, 5, 7],
      [2, 7, 5, 8],
      [5, 2, 7, 8],
      [0, 8, 7, 10],
    ]);
    // The seven pieces tile the bay: their areas sum to its area.
    expect(boxes.reduce((s, [x0, y0, x1, y1]) => s + (x1 - x0) * (y1 - y0), 0)).toBe(70);
    // Seeds are still all distinct.
    expect(new Set(col(out, "seed")).size).toBe(7);
  });
});

describe("splitBox: attributes", () => {
  function richCells(): Geometry {
    const geo = cells([
      [[0, 0, 0], [2, 1, 1]],
      [[0, 0, 0], [4, 1, 1]],
    ]);
    const pts = geo.attrs.point;
    pts.add("h", "f32", 1, 0).set(1, 2.5);
    pts.add("v", "f32", 3, [0, 0, 0]).setTuple(1, [1, 2, 3]);
    pts.add("lvl", "i32", 1, -1).set(0, 7);
    pts.add("tag", "u32", 1, 0).set(1, 4000000000);
    pts.add("open", "bool", 1, 0).set(1, 1);
    const s = pts.add("kind", "string", 1);
    // Interned out of point order, so a raw table index copied across
    // geometries would name the wrong word.
    s.setString(1, "roof");
    s.setString(0, "wall");
    geo.attrs.detail.add("note", "f32", 1, 42);
    return geo;
  }

  it("carries every point attribute of every type, strings included, onto every piece", async () => {
    const out = await split(richCells(), { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(out.pointCount).toBe(4);
    expect(col(out, "h")).toEqual([0, 0, 2.5, 2.5]);
    expect(col(out, "v")).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 2, 3]);
    expect(col(out, "lvl")).toEqual([7, 7, -1, -1]);
    expect(col(out, "tag")).toEqual([0, 0, 4000000000, 4000000000]);
    expect(col(out, "open")).toEqual([0, 0, 1, 1]);
    expect(strings(out, "kind")).toEqual(["wall", "wall", "roof", "roof"]);
    expect(out.attrs.detail.require("note").get(0)).toBe(42);
  });

  it("does not mutate its input", async () => {
    const geo = richCells();
    const before = snapshotGeometry(geo);
    await split(geo, { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(snapshotGeometry(geo)).toEqual(before);
  });

  it("drops topology", async () => {
    const path = createPolyline([0, 0, 0, 1, 0, 0]);
    path.attrs.point.add("boundsMin", "f32", 3, [0, 0, 0]);
    path.attrs.point.add("boundsMax", "f32", 3, [2, 1, 1]);
    const out = await split(path, { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(out.pointCount).toBe(4);
    expect(out.attrs.primitive.count).toBe(0);
    expect(out.attrs.vertex.count).toBe(0);
  });

  it("empty attr names write no column", async () => {
    const out = await split(unitCell(0, 2), { labelAttr: "", indexAttr: "", countAttr: "" });
    expect(out.attrs.point.has("piece")).toBe(false);
    expect(out.attrs.point.has("pieceIndex")).toBe(false);
  });

  it("refuses a standard attribute name and two slots under one name", async () => {
    expect(await rejection(split(unitCell(0, 2), { indexAttr: "seed" }))).toMatch(/"indexAttr" cannot write "seed"/);
    expect(await rejection(split(unitCell(0, 2), { labelAttr: "boundsMin" }))).toMatch(/"labelAttr" cannot write "boundsMin"/);
    expect(await rejection(split(unitCell(0, 2), { indexAttr: "k", countAttr: "k" }))).toMatch(
      /"indexAttr" and "countAttr" are both "k"/,
    );
  });

  it("refuses an input column of another shape under a slot name", async () => {
    const geo = unitCell(0, 2);
    geo.attrs.point.add("piece", "f32", 1, 0);
    expect(await rejection(split(geo, {}))).toMatch(/labelAttr "piece" already exists on the input's point domain as f32/);
  });

  it("rewrites a same-shape label column on the pieces", async () => {
    const geo = unitCell(0, 2);
    geo.attrs.point.add("piece", "string", 1).setString(0, "old");
    const out = await split(geo, { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] });
    expect(strings(out, "piece")).toEqual(["a", "b"]);
  });
});

describe("splitBox: seeds and determinism", () => {
  it("slot k of a cell with seed s gets hashCombine(s, k), past 2^31 too", async () => {
    const geo = cells([
      [[0, 0, 0], [3, 1, 1]],
      [[0, 0, 0], [3, 1, 1]],
    ]);
    geo.attrs.point.require("seed").set(1, 0xfffffff0);
    const out = await split(geo, { labels: ["a", "b", "c"], sizes: [1, 1, 1], units: ["relative", "relative", "relative"] });
    expect(col(out, "seed")).toEqual([
      hashCombine(100, 0),
      hashCombine(100, 1),
      hashCombine(100, 2),
      hashCombine(0xfffffff0, 0),
      hashCombine(0xfffffff0, 1),
      hashCombine(0xfffffff0, 2),
    ]);
  });

  it("does not depend on the node seed when its fields do not", async () => {
    const a = await split(unitCell(0, 4), {}, 1);
    const b = await split(unitCell(0, 4), {}, 999);
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
  });

  function build(order: "forward" | "reverse"): Graph {
    const g = new Graph(31);
    const add = {
      grid: () => g.add(pointGrid, { countX: 3, countY: 1, countZ: 2, spacing: [5, 5, 5] }, "grid"),
      box: () =>
        g.add(
          setBounds,
          {
            boundsMin: fieldFromJson({ fn: "position" }),
            boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [4, 3, 4]] }),
          },
          "box",
        ),
      cut: () =>
        g.add(
          splitBox,
          {
            labels: ["a", "b"],
            // A random cut drawn on the PARENT: both halves agree on it.
            sizes: fieldFromJson({ fn: "vec", args: [{ fn: "mul", args: [{ fn: "randomField" }, 4] }, 1] }),
            units: ["absolute", "relative"],
          },
          "cut",
        ),
      tint: () =>
        g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
    };
    const ids = order === "forward" ? ["grid", "box", "cut", "tint"] : ["tint", "cut", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.cut, "in");
    g.connect(h.cut, "out", h.tint, "in");
    g.output(h.tint, "out", "pieces");
    g.output(h.box, "out", "cells");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(build("forward"))).outputs.pieces);
    const c = firstGeo((await cook(build("reverse"))).outputs.pieces);
    expect(a.pointCount).toBe(12);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("the parent-drawn cut is shared: the halves of every cell meet and fill it", async () => {
    const out = firstGeo((await cook(build("forward"))).outputs.pieces);
    const s = spans(out);
    for (let i = 0; i < s.length; i += 2) {
      expect(s[i][1]).toBe(s[i + 1][0]);
      expect(s[i + 1][1] - s[i][0]).toBe(4);
    }
  });

  it("round-trips through the serialized format, a field sizes included, and cooks the same", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });

  it("loads a plain sizes list from JSON", async () => {
    const json = serializeGraph(build("forward"));
    const cut = json.nodes.find((n) => n.id === "cut")!;
    (cut.params as Record<string, unknown>).sizes = [3, 1];
    const g = deserializeGraph(JSON.parse(JSON.stringify(json)));
    const out = firstGeo((await cook(g)).outputs.pieces);
    expect(spans(out).slice(0, 2)).toEqual([
      [0, 3],
      [3, 4],
    ]);
  });
});

describe("splitBox: the same split as repeatPoints + setBounds", () => {
  /**
   * Halves and thirds both spellings can express: repeatPoints(count = 3)
   * then setBounds placing copy k at x0 + k * (x1 - x0) / 3, against
   * splitBox thirds. Compared on every column that downstream randomness
   * reads — seed and P — plus the boxes, and then on a randomField drawn
   * after each: the downstream draws must be identical.
   */
  async function viaRepeat(geo: Geometry): Promise<Geometry> {
    const rep = firstGeo((await runNode(repeatPoints, { count: 3, indexAttr: "k" }, { in: [makeGeometryItem(geo)] })).out);
    const text = (k: string, corner: string) =>
      `let({ lo: attribute("boundsMin", 3), hi: attribute("boundsMax", 3), x0: component(lo, 0), x1: component(hi, 0) }, ` +
      `vec(x0 + ${k} * (x1 - x0) / 3, component(${corner}, 1), component(${corner}, 2)))`;
    const box = firstGeo(
      (
        await runNode(
          setBounds,
          {
            boundsMin: fieldFromJson(parseFieldText(text(`attribute("k")`, "lo"))),
            boundsMax: fieldFromJson(parseFieldText(text(`(attribute("k") + 1)`, "hi"))),
          },
          { in: [makeGeometryItem(rep)] },
        )
      ).out,
    );
    return box;
  }
  async function viaSplit(geo: Geometry): Promise<Geometry> {
    return split(geo, { labels: ["a", "a", "a"], sizes: [1, 1, 1], units: ["relative", "relative", "relative"], indexAttr: "k" });
  }
  async function draw(geo: Geometry): Promise<number[]> {
    const out = firstGeo(
      (
        await runNode(
          setAttribute,
          { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) },
          { in: [makeGeometryItem(geo)] },
          5,
        )
      ).out,
    );
    return col(out, "r");
  }
  /** The comparison: a list of what differs, empty when nothing does. */
  async function differences(a: Geometry, b: Geometry): Promise<string[]> {
    const diffs: string[] = [];
    for (const name of ["P", "seed", "boundsMin", "boundsMax", "k"]) {
      if (JSON.stringify(col(a, name)) !== JSON.stringify(col(b, name))) diffs.push(name);
    }
    if (JSON.stringify(await draw(a)) !== JSON.stringify(await draw(b))) diffs.push("downstream randomField");
    return diffs;
  }
  function input(): Geometry {
    const geo = cells([
      [[0, 0, 0], [3, 1, 1]],
      [[6, 0, 2], [12, 4, 5]],
      [[-9, 1, 1], [0, 2, 2]],
    ]);
    geo.attrs.point.require("P").setTuple(1, [1, 2, 3]);
    geo.attrs.point.require("seed").set(2, 0xdeadbeef);
    return geo;
  }

  it("is identical, downstream randomness included", async () => {
    const a = await viaRepeat(input());
    const b = await viaSplit(input());
    expect(b.pointCount).toBe(9);
    expect(await differences(a, b)).toEqual([]);
  });

  it("CONTROL: the comparison reports a seed that differs", async () => {
    // One input seed changed on the repeat side only: the comparison must
    // see it, in the seeds and in the draws after them.
    const changed = input();
    changed.attrs.point.require("seed").set(0, 101);
    const a = await viaRepeat(changed);
    const b = await viaSplit(input());
    expect(await differences(a, b)).toEqual(["seed", "downstream randomField"]);
  });
});

describe("splitBox: far from the origin (the tolerances are f32 ulps, not relative)", () => {
  it("floor and ceil still differ from round at x = 1e6", async () => {
    const at = (snapMode: string) =>
      split(unitCell(1e6, 1e6 + 3), { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"], snap: [1, 0, 0], snapMode });
    expect(spans(await at("floor"))[0][1]).toBe(1e6 + 1);
    expect(spans(await at("ceil"))[0][1]).toBe(1e6 + 2);
    // A fine lattice at 1e4: 10000.015 floors to 10000.01, not up.
    const fine = await split(unitCell(1e4, 1e4 + 0.03), {
      labels: ["a", "b"],
      sizes: [1, 1],
      units: ["relative", "relative"],
      snap: [0.01, 0, 0],
      snapMode: "floor",
    });
    expect(spans(fine)[0][1]).toBe(Math.fround(10000.01));
  });

  it("keeps a short piece near the box's end at x = 1e5", async () => {
    const out = await split(unitCell(1e5, 1e5 + 10), { labels: ["a", "b"], sizes: [9.95, 1], units: ["absolute", "relative"] });
    expect(strings(out, "piece")).toEqual(["a", "b"]);
    expect(spans(out)[1][1]).toBe(1e5 + 10);
  });
});

describe("splitBox: messages", () => {
  it("says so when relative segments exist but all weigh 0", async () => {
    const msg = await rejection(split(unitCell(0, 10), { labels: ["a", "b"], sizes: [0, 0], units: ["relative", "relative"] }));
    expect(msg).toMatch(/relative" segments all have weight 0 here/);
  });

  it("suggests a name other than the default that collided", async () => {
    const geo = unitCell(0, 2);
    geo.attrs.point.add("piece", "f32", 1, 0);
    expect(await rejection(split(geo, {}))).toMatch(/e\.g\. "pieceLabel"/);
  });

  it("names a non-finite box rather than calling it inside out", async () => {
    const msg = await rejection(split(cells([[[Number.NaN, 0, 0], [3, 1, 1]]]), {}));
    expect(msg).toMatch(/cell 0's box is not finite along x/);
  });
});

describe("splitBox: the corpus teaching graph", () => {
  it("graphs/basics-split-box.json does what its description says", async () => {
    const text = readFileSync(new URL("../../graphs/basics-split-box.json", import.meta.url), "utf8");
    const res = await cook(deserializeGraph(JSON.parse(text)));
    const out = firstGeo(res.outputs.pieces);
    const piece = strings(out, "piece");
    const lo = col(out, "boundsMin");
    const hi = col(out, "boundsMax");
    const door = col(out, "door");
    expect(new Set(piece)).toEqual(new Set(["plinth", "cornice", "wall", "opening"]));
    // Three blocks, 8 wide, x centred on -8, 0 and 8: the pieces of each
    // tile its face exactly — no gap, no overlap — so their areas sum to
    // the block's, and the block's height is 1.5 + 3 * storeys.
    const heights = new Set<number>();
    for (const cx of [-8, 0, 8]) {
      const mine = piece.map((_, i) => i).filter((i) => lo[i * 3] >= cx - 4 && hi[i * 3] <= cx + 4);
      const top = Math.max(...mine.map((i) => hi[i * 3 + 1]));
      const storeys = (top - 1.5) / 3;
      expect(Number.isInteger(storeys) && storeys >= 2 && storeys <= 4).toBe(true);
      heights.add(top);
      const area = mine.reduce((s, i) => s + (hi[i * 3] - lo[i * 3]) * (hi[i * 3 + 1] - lo[i * 3 + 1]), 0);
      expect(area).toBeCloseTo(8 * top, 4);
      // Bays cut on the 0.5 lattice into 2.5 | 3 | 2.5, each opening the
      // middle half of its bay.
      const xs = new Set(mine.filter((i) => piece[i] === "opening").map((i) => lo[i * 3] - (cx - 4)));
      expect([...xs].sort((a, b) => a - b)).toEqual([0.625, 3.25, 6.125]);
      // One door per block: on the ground storey's middle bay, standing on
      // the plinth with no wall under it.
      const doors = mine.filter((i) => door[i] === 1 && piece[i] === "opening");
      expect(doors.length).toBe(1);
      expect(lo[doors[0] * 3 + 1]).toBe(1);
      expect(hi[doors[0] * 3 + 1]).toBeCloseTo(3.4, 5);
    }
    expect(heights.size).toBeGreaterThan(1);
  });
});

describe("splitBox: direction", () => {
  const abc = { labels: ["a", "b", "c"], sizes: [2, 3, 5], units: ["absolute", "absolute", "absolute"] };

  it("a negative direction lays the list from the MAX side: first label at the max end, slot 0 there", async () => {
    const out = await split(unitCell(0, 10), { ...abc, direction: -1 });
    expect(spans(out)).toEqual([
      [8, 10],
      [5, 8],
      [0, 5],
    ]);
    expect(strings(out, "piece")).toEqual(["a", "b", "c"]);
    expect(col(out, "pieceIndex")).toEqual([0, 1, 2]);
  });

  it("keeps each slot's seed: slot k is hashCombine(s, k) from either end", async () => {
    const fwd = await split(unitCell(0, 10), abc);
    const rev = await split(unitCell(0, 10), { ...abc, direction: -1 });
    expect(col(rev, "seed")).toEqual(col(fwd, "seed"));
    expect(col(rev, "seed")).toEqual([0, 1, 2].map((k) => hashCombine(100, k)));
  });

  it("a repeat counts from the max side", async () => {
    const out = await split(unitCell(0, 10), { labels: ["bay"], sizes: [4], units: ["repeat"], direction: -1 });
    expect(spans(out)).toEqual([
      [5, 10],
      [0, 5],
    ]);
    expect(col(out, "pieceIndex")).toEqual([0, 1]);
  });

  it('"clip" leaves an underfill uncovered at the MIN end', async () => {
    const out = await split(unitCell(0, 10), {
      labels: ["a", "b"],
      sizes: [2, 3],
      units: ["absolute", "absolute"],
      fit: "clip",
      direction: -1,
    });
    expect(spans(out)).toEqual([
      [8, 10],
      [5, 8],
    ]);
  });

  it("snaps a reversed cut on the same absolute lattice", async () => {
    const p = { labels: ["a", "b"], sizes: [3, 1], units: ["absolute", "relative"], snap: [2, 0, 0], snapMode: "round" };
    // Reversed: the raw cut is 10 - 3 = 7, which rounds to 8; forward it is
    // 3, which rounds to 4.
    expect(spans(await split(unitCell(0, 10), { ...p, direction: -1 }))).toEqual([
      [8, 10],
      [0, 8],
    ]);
    expect(spans(await split(unitCell(0, 10), p))).toEqual([
      [0, 4],
      [4, 10],
    ]);
  });

  it("as a field it is read per cell, by its sign alone (0 is forward)", async () => {
    const geo = cells([
      [[0, 0, 0], [10, 1, 1]],
      [[0, 0, 0], [10, 1, 1]],
      [[0, 0, 0], [10, 1, 1]],
    ]);
    const d = geo.attrs.point.add("d", "f32", 1, 0);
    d.set(0, -0.5);
    d.set(1, 0);
    d.set(2, 7);
    const out = await split(geo, { ...abc, direction: fieldFromJson({ fn: "attribute", name: "d" }) });
    expect(spans(out)).toEqual([
      [8, 10], [5, 8], [0, 5],
      [0, 2], [2, 5], [5, 10],
      [0, 2], [2, 5], [5, 10],
    ]);
  });

  it("refuses a non-finite direction, naming the param", async () => {
    expect(await rejection(split(unitCell(0, 10), { ...abc, direction: fieldFromJson(parseFieldText("1 / 0")) }))).toMatch(/direction/);
    expect(await rejection(split(unitCell(0, 10), { ...abc, direction: Number.NaN }))).toMatch(/direction/);
  });

  it("ABSENT, the output is byte-identical to direction 1, plain or as a field, across every layout path", async () => {
    // The default path is the code as it was; these configurations touch
    // every branch of it (relative, absolute, repeat, snap, clip, scale,
    // gaps, per-cell axis, pass-through).
    const geo = (): Geometry => {
      const g = cells([
        [[0, 0, 0], [10, 3, 7]],
        [[1.2, 0.4, -3], [9.7, 5, 2]],
        [[-1e5, 0, 0], [-1e5 + 13, 1, 1]],
      ]);
      g.attrs.point.add("ax", "f32", 1, 0).set(1, 2);
      return g;
    };
    const configs: Record<string, unknown>[] = [
      { labels: ["a", "b"], sizes: [1, 2], units: ["relative", "relative"] },
      { labels: ["a", "", "c"], sizes: [1, 2, 1], units: ["absolute", "relative", "absolute"], snap: [0.4, 0.4, 0.4], snapMode: "floor" },
      { labels: ["x", "bay"], sizes: [1, 2.5], units: ["absolute", "repeat"], repeatRound: "ceil", snap: [1, 1, 1] },
      { labels: ["a", "b"], sizes: [4, 30], units: ["absolute", "absolute"], fit: "clip" },
      { labels: ["a", "b"], sizes: [4, 30], units: ["absolute", "absolute"], fit: "scale" },
      { axis: "perCell", axisIndex: fieldFromJson({ fn: "attribute", name: "ax" }), labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"] },
      { labels: ["a", "b"], sizes: [1, 1], units: ["relative", "relative"], where: fieldFromJson({ fn: "attribute", name: "ax" }) },
    ];
    for (const c of configs) {
      const absent = snapshotGeometry(await split(geo(), c));
      expect(snapshotGeometry(await split(geo(), { ...c, direction: 1 }))).toEqual(absent);
      expect(snapshotGeometry(await split(geo(), { ...c, direction: fieldFromJson({ fn: "add", args: [{ fn: "attribute", name: "ax" }, 1] }) }))).toEqual(absent);
    }
  });

  it("CONTROL: the byte comparison reports a reversed cell", async () => {
    const absent = snapshotGeometry(await split(unitCell(0, 10), abc));
    expect(snapshotGeometry(await split(unitCell(0, 10), { ...abc, direction: -1 }))).not.toEqual(absent);
  });

  it("a serialized graph without the param loads and cooks as before", async () => {
    const g = new Graph(3);
    const grid = g.add(pointGrid, { countX: 2, countY: 1, countZ: 1, spacing: [5, 5, 5] }, "grid");
    const box = g.add(
      setBounds,
      { boundsMin: fieldFromJson({ fn: "position" }), boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [4, 3, 4]] }) },
      "box",
    );
    const cut = g.add(splitBox, { labels: ["a", "b"], sizes: [1, 3], units: ["relative", "relative"] }, "cut");
    g.connect(grid, "out", box, "in");
    g.connect(box, "out", cut, "in");
    g.output(cut, "out", "pieces");
    const json = serializeGraph(g);
    const node = json.nodes.find((x) => x.id === "cut")!;
    const params = node.params as Record<string, unknown>;
    delete params.direction;
    const back = deserializeGraph(JSON.parse(JSON.stringify(json)));
    const a = firstGeo((await cook(g)).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });
});

describe("splitBox: direction and the absolute lattice", () => {
  it("a reversed split with snap is NOT the mirror image: the lattice stays the world's", async () => {
    // The reviewer's case: box [0, 10], absolute sizes [3, 7], snap 4. The
    // forward cut at 3 rounds to 4; the reversed raw cut at 10 - 3 = 7
    // rounds to 8 on the same world lattice, not to 6 (the mirror of 4).
    const p = { labels: ["a", "b"], sizes: [3, 7], units: ["absolute", "absolute"], snap: [4, 0, 0], snapMode: "round" };
    expect(spans(await split(unitCell(0, 10), p))).toEqual([
      [0, 4],
      [4, 10],
    ]);
    expect(spans(await split(unitCell(0, 10), { ...p, direction: -1 }))).toEqual([
      [8, 10],
      [0, 8],
    ]);
  });

  it('"floor" and "ceil" keep their world meaning when reversed', async () => {
    // Raw reversed cut at 7: floor takes it down to 4, ceil up to 8.
    const p = { labels: ["a", "b"], sizes: [3, 7], units: ["absolute", "absolute"], snap: [4, 0, 0], direction: -1 };
    expect(spans(await split(unitCell(0, 10), { ...p, snapMode: "floor" }))).toEqual([
      [4, 10],
      [0, 4],
    ]);
    expect(spans(await split(unitCell(0, 10), { ...p, snapMode: "ceil" }))).toEqual([
      [8, 10],
      [0, 8],
    ]);
  });
});

describe("splitBox: the repeat count has f32 slack", () => {
  it("two equal walls get the same count wherever they stand (the reviewer's reproduction)", async () => {
    // Two 7.2-long walls along z: one at 0.4 .. 7.6, one at -16.6 .. -9.4.
    // Stored in f32 the first is 7.1999999 long and the second 7.2000008,
    // so after a 3.2 door bay the rests are 3.9999999 and 4.0000008 — and
    // floor(rest / 2) was 1 for one and 2 for the other.
    const geo = cells([
      [[0, 0, 0.4], [1, 3, 7.6]],
      [[0, 0, -16.6], [1, 3, -9.4]],
    ]);
    const out = await split(geo, { axis: "z", labels: ["door", "window"], sizes: [3.2, 2], units: ["absolute", "repeat"] });
    expect(strings(out, "piece")).toEqual(["door", "window", "window", "door", "window", "window"]);
  });

  it("CONTROL: a rest really short of a whole module still rounds down", async () => {
    // 7.19 long: the rest is 3.99, a hundredth short — far past f32 slack.
    const out = await split(cells([[[0, 0, 0], [1, 3, 7.19]]]), { axis: "z", labels: ["door", "window"], sizes: [3.2, 2], units: ["absolute", "repeat"] });
    expect(strings(out, "piece")).toEqual(["door", "window"]);
  });

  it("the slack is the same for ceil: a rest within f32 of 2 modules is 2, not 3", async () => {
    const geo = cells([[[0, 0, -16.6], [1, 3, -9.4]]]);
    const out = await split(geo, { axis: "z", labels: ["door", "window"], sizes: [3.2, 2], units: ["absolute", "repeat"], repeatRound: "ceil" });
    expect(strings(out, "piece")).toEqual(["door", "window", "window"]);
  });
});

describe("splitBox: a piece two f32 ulps long at the far end is kept", () => {
  // The far-end snap ("an end within f32 precision of the box's max IS the
  // max") used to apply to EVERY end, so an end with a real piece after it,
  // no more than two ulps of the box's coordinates from the max, was moved
  // onto the max and the piece after it vanished. Pieces of exactly
  // 2^-22 on [0, 1] are two ulps of 1 (2 * 2^-23), and 2^22 of them is
  // also the output cap, which is why it showed as "one piece short at
  // 4194304". This holds for pieces that are LAID: absolute pieces, and a
  // repeat that has the rest to itself. A relative or repeat REMAINDER
  // after absolute sizes that already fill the box to f32 precision is
  // storage error, not room, and gets nothing (tested below).

  it("a 2^22-way repeat of [0, 1] emits all 4194304 pieces, the last one 2^-22 long", async () => {
    const out = await split(unitCell(0, 1), { labels: ["bay"], sizes: [2 ** -22], units: ["repeat"], indexAttr: "", labelAttr: "" });
    expect(out.pointCount).toBe(4194304);
    const lo = out.attrs.point.require("boundsMin").data;
    const hi = out.attrs.point.require("boundsMax").data;
    const last = out.pointCount - 1;
    expect([lo[(last - 1) * 3], hi[(last - 1) * 3]]).toEqual([1 - 2 * 2 ** -22, 1 - 2 ** -22]);
    expect([lo[last * 3], hi[last * 3]]).toEqual([1 - 2 ** -22, 1]);
  }, 60_000);

  it("it is not about the cap: [1, 2] lost one at 2^21 pieces (2^-21 is two ulps of 2)", async () => {
    const out = await split(unitCell(1, 2), { labels: ["bay"], sizes: [2 ** -21], units: ["repeat"], indexAttr: "", labelAttr: "" });
    expect(out.pointCount).toBe(2 ** 21);
  }, 60_000);

  it("two absolute pieces, the second two ulps long, forward and reversed", async () => {
    const fwd = await split(unitCell(0, 1), { labels: ["a", "b"], sizes: [1 - 2 ** -22, 2 ** -22], units: ["absolute", "absolute"] });
    expect(strings(fwd, "piece")).toEqual(["a", "b"]);
    expect(spans(fwd)).toEqual([
      [0, 1 - 2 ** -22],
      [1 - 2 ** -22, 1],
    ]);
    // Reversed on [-1, 0]: the far end is -1, and two ulps of 1 is 2^-22.
    const rev = await split(unitCell(-1, 0), {
      labels: ["a", "b"],
      sizes: [1 - 2 ** -22, 2 ** -22],
      units: ["absolute", "absolute"],
      direction: -1,
    });
    expect(strings(rev, "piece")).toEqual(["a", "b"]);
    expect(spans(rev)).toEqual([
      [-1 + 2 ** -22, 0],
      [-1, -1 + 2 ** -22],
    ]);
  });

  it("CONTROL: the end of the layout still snaps, and what follows it with no length is still dropped", async () => {
    // [-20, 0.56] is stored -20 .. 0.5600000024; two f32(10.28) end at
    // 0.5599994659, 5.4e-7 short: a different f32 (ulp there 6e-8), but
    // inside the tolerance 2 * 2^-19 + 2 * (2^-20 / 2) = 4.77e-6. That end IS
    // the box's max, and the zero-size "c" and the relative "rest" after it
    // get nothing (the absolute pair filled the box).
    const out = await split(unitCell(-20, 0.56), {
      labels: ["a", "b", "c", "rest"],
      sizes: [10.28, 10.28, 0, 1],
      units: ["absolute", "absolute", "absolute", "relative"],
    });
    expect(strings(out, "piece")).toEqual(["a", "b"]);
    expect(spans(out)[1][1]).toBe(Math.fround(0.56));
    // Reversed, the same pair ends AT the min.
    const rev = await split(unitCell(-20, 0.56), {
      labels: ["a", "b", "c", "rest"],
      sizes: [10.28, 10.28, 0, 1],
      units: ["absolute", "absolute", "absolute", "relative"],
      direction: -1,
    });
    expect(strings(rev, "piece")).toEqual(["a", "b"]);
    expect(spans(rev)[1][0]).toBe(-20);
  });

  it("a fill to f32 precision leaves the relative segment after it no sliver", async () => {
    // [-20, -17.88] stores 2.1200008 long; 1.06 + 1.06 in f32 is 2.1199999:
    // the 9.5e-7 between them (half an ulp of 17.88, inside the tolerance
    // 2 * 2^-19 + 2^-23) is storage, not room for "and the rest", which
    // used to get it as a one-ulp sliver once the 2-ulp far-end snap was
    // limited to the end of the layout.
    const out = await split(unitCell(-20, -17.88), { labels: ["a", "a", "rest"], sizes: [1.06, 1.06, 1], units: ["absolute", "absolute", "relative"] });
    expect(strings(out, "piece")).toEqual(["a", "a"]);
    expect(spans(out)[1][1]).toBe(Math.fround(-17.88));
  });

  it("the far end's own precision decides what is nothing: a [-2^-16, 0] piece at the end of [-1000, 0] is kept", async () => {
    // 2^-16 is under half an ulp of 1000, but 0 is the far end and f32
    // stores 2^-16 there exactly. (The ends: -2^-14, -2^-16, 0.)
    const out = await split(unitCell(-1000, 0), {
      labels: ["a", "b", "c"],
      sizes: [1000 - 2 ** -14, 2 ** -14 - 2 ** -16, 2 ** -16],
      units: ["absolute", "absolute", "absolute"],
    });
    expect(strings(out, "piece")).toEqual(["a", "b", "c"]);
    expect(spans(out)).toEqual([
      [-1000, -(2 ** -14)],
      [-(2 ** -14), -(2 ** -16)],
      [-(2 ** -16), 0],
    ]);
  });
});

describe("splitBox: fit and repeat tolerances are f32 ulps, not a share of the span", () => {
  // The rule: ULP_TOL (2) f32 ulps at the box's coordinates, plus half an
  // ulp of every absolute size summed (and of each module a repeat counts).
  // ulp(1000) = 2^-14 = 6.103515625e-5 and ulp(500) = 2^-15, so on [0, 1000]
  // one size near 1000, two near 500, or four modules near 250 each add
  // 2^-15 to 2^-13: a tolerance of 1.52587890625e-4. The old rule was a
  // millionth of the span, 1e-3.

  it("an underfill of 8 ulps on [0, 1000] is refused (it used to pass and leave the gap uncovered)", async () => {
    // f32(999.9995) = 999.99951171875: 4.8828125e-4 short of 1000, past the
    // tolerance 2^-13 + 2^-15 = 1.52587890625e-4. Under the old 1e-3 it was
    // a fill, but the far-end snap (2 ulps) did not reach it, so the one
    // piece ended at 999.9995 and the box's last 4.9e-4 was covered by
    // nothing with no complaint.
    const msg = await rejection(split(unitCell(0, 1000), { labels: ["a"], sizes: [999.9995], units: ["absolute"] }));
    expect(msg).toMatch(/cell 0 is UNDERFILLED — its segments cover 999.99951171875 of a box 1000 long/);
    expect(msg).toMatch(/remaining 0.00048828125/);
  });

  it("an overflow of 8 ulps on [0, 1000] is refused (it used to be called a fill)", async () => {
    // f32(500.0005) = 500.00048828125: the pair is 4.8828125e-4 over, past
    // 2^-13 + 2^-16 + 2^-16 = 1.52587890625e-4.
    const msg = await rejection(split(unitCell(0, 1000), { labels: ["a", "b"], sizes: [500, 500.0005], units: ["absolute", "absolute"] }));
    expect(msg).toMatch(/cell 0 OVERFLOWS — its absolute segments need 1000.00048828125 along x but its box is 1000 long/);
  });

  it("a fill to the coordinates' f32 step far from the origin fits (it used to be refused)", async () => {
    // [100000.1, 100010.2] is stored 100000.1015625 .. 100010.203125 (f32
    // steps of 1/128 there), 10.1015625 long; one absolute 10.1 is
    // 1.56e-3 short of it — a fifth of one f32 step, but 155 millionths of
    // the span, which the old rule refused as an underfill.
    const out = await split(unitCell(100000.1, 100010.2), { labels: ["a"], sizes: [10.1], units: ["absolute"] });
    expect(spans(out)).toEqual([[100000.1015625, 100010.203125]]);
  });

  it("seven equal sizes over a box across the origin: why the sizes' own ulps are in the sum", async () => {
    // [-15.73, 12.48] stores -15.729999542 .. 12.479999542, 28.2099990845
    // long; seven f32(4.03) = 4.03000020981 sum to 2.384e-6 over it: 2.5
    // ulps of 15.73 (ulp 2^-20), past 2 ulps alone (1.907e-6) but inside
    // 2 ulps + 7 half-ulps of 4.03 (7 * 2^-21 / 2 = 1.669e-6; 3.576e-6 in all).
    const cell = (): Geometry => unitCell(-15.73, 12.48);
    const seven = await split(cell(), {
      labels: Array(7).fill("p"),
      sizes: Array(7).fill(4.03),
      units: Array(7).fill("absolute"),
    });
    expect(seven.pointCount).toBe(7);
    expect(spans(seven)[6][1]).toBe(Math.fround(12.48));
    // The same box as a repeat of module 4.03: rest / module = 6.9999994,
    // within the slack of 7, so 7 bays (2 ulps alone would floor it to 6).
    const rep = await split(cell(), { labels: ["bay"], sizes: [4.03], units: ["repeat"] });
    expect(rep.pointCount).toBe(7);
  });

  it("a repeat 8 ulps short of a whole number of modules rounds down (it used to count as whole)", async () => {
    // f32(250.0002) = 250.0001983642578: four of them are 7.93e-4 past
    // 1000, past the slack 2^-13 + 4 * 2^-16 / 2 = 1.52587890625e-4, so
    // rest / module = 3.99999683 floors to 3. The old slack (1e-3) made it 4.
    const out = await split(unitCell(0, 1000), { labels: ["bay"], sizes: [250.0002], units: ["repeat"] });
    expect(out.pointCount).toBe(3);
    expect(spans(out)[0][1]).toBe(Math.fround(1000 / 3));
  });
});
