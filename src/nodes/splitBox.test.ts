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
