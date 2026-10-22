/**
 * Box names inside the two nodes that rewrite boxes. Each reads the box
 * the node is HANDED: setBounds resolves both corners against the
 * incoming box before writing either, and splitBox resolves `sizes` on
 * the parent cell. Expected boxes are worked out by hand from the input.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, createPointCloud } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { fieldFromJson, parseFieldText, setBounds } from "./index.js";
import { splitBox } from "./splitBox.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

const f = (text: string) => fieldFromJson(parseFieldText(text));

/** Cells with the given boxes. */
function cells(boxes: [number[], number[]][]): Geometry {
  const geo = createPointCloud(boxes.length);
  const pts = geo.attrs.point;
  boxes.forEach(([a, b], i) => {
    pts.require("boundsMin").setTuple(i, a);
    pts.require("boundsMax").setTuple(i, b);
    pts.require("seed").set(i, 100 + i);
  });
  return geo;
}

function corners(geo: Geometry): { lo: number[][]; hi: number[][] } {
  const read = (name: string): number[][] => {
    const a = geo.attrs.point.require(name);
    return Array.from({ length: geo.pointCount }, (_, i) => Array.from(a.data.slice(i * 3, i * 3 + 3)));
  };
  return { lo: read("boundsMin"), hi: read("boundsMax") };
}

async function bound(geo: Geometry, params: Record<string, unknown>): Promise<Geometry> {
  return firstGeo((await runNode(setBounds, params, { in: [makeGeometryItem(geo)] }, 3)).out);
}

async function split(geo: Geometry, params: Record<string, unknown>): Promise<Geometry> {
  return firstGeo((await runNode(splitBox, params, { in: [makeGeometryItem(geo)] }, 3)).out);
}

const INPUT = (): Geometry => cells([[[1, 2, 3], [5, 8, 13]]]);

describe("box names in setBounds read the INCOMING box", () => {
  it("boundsMax reading lo and size sees the corner it was handed, not the one written", async () => {
    // Incoming lo [1, 2, 3], hi [5, 8, 13]: center [3, 5, 8], size [4, 6, 10].
    const out = await bound(INPUT(), {
      boundsMin: f('box("center")'),
      boundsMax: f('box("lo") + box("size") * 2'),
    });
    expect(corners(out)).toEqual({ lo: [[3, 5, 8]], hi: [[9, 14, 23]] });
  });

  it("and boundsMin reading hi sees the incoming max, in the other order", async () => {
    const out = await bound(INPUT(), {
      boundsMin: f('box("hi") - 1'),
      boundsMax: f('box("lo") + box("size") + box("sx")'),
    });
    expect(corners(out)).toEqual({ lo: [[4, 7, 12]], hi: [[9, 12, 17]] });
  });

  it("swaps the corners when each reads the other — the zero-copy views are snapshotted", async () => {
    // `box("hi")` evaluates to a VIEW of the boundsMax column, which this
    // node then overwrites; the read must still be the incoming value.
    const out = await bound(INPUT(), { boundsMin: f('box("hi")'), boundsMax: f('box("lo")') });
    expect(corners(out)).toEqual({ lo: [[5, 8, 13]], hi: [[1, 2, 3]] });
  });

  it("writes the same bytes as the attribute spelling", async () => {
    const byName = await bound(INPUT(), {
      boundsMin: f('vec(box("cx"), box("y0"), box("z0") - box("sz"))'),
      boundsMax: f('box("hi") + box("size") * 0.5'),
    });
    const byHand = await bound(INPUT(), {
      boundsMin: f(
        'let({ lo: attribute("boundsMin", 3), hi: attribute("boundsMax", 3) }, ' +
          "vec(0.5 * (component(lo, 0) + component(hi, 0)), component(lo, 1), " +
          "component(lo, 2) - (component(hi, 2) - component(lo, 2))))",
      ),
      boundsMax: f('attribute("boundsMax", 3) + (attribute("boundsMax", 3) - attribute("boundsMin", 3)) * 0.5'),
    });
    expect(snapshotGeometry(byName)).toEqual(snapshotGeometry(byHand));
    expect(corners(byName)).toEqual({ lo: [[3, 2, -7]], hi: [[7, 11, 18]] });
  });
});

describe("box names in splitBox's sizes read the PARENT cell", () => {
  const PARENTS = (): Geometry =>
    cells([
      [[0, 0, 0], [1, 10, 1]],
      [[0, 0, 0], [1, 20, 1]],
    ]);

  const spansY = (geo: Geometry): number[][] => {
    const { lo, hi } = corners(geo);
    return lo.map((l, i) => [l[1] as number, (hi[i] as number[])[1] as number]);
  };

  it("a size of a quarter of the cell's height is a quarter of each parent's", async () => {
    const out = await split(PARENTS(), {
      axis: "y",
      labels: ["a", "b"],
      sizes: f('vec(box("sy") * 0.25, 1)'),
      units: ["absolute", "relative"],
    });
    expect(spansY(out)).toEqual([
      [0, 2.5],
      [2.5, 10],
      [0, 5],
      [5, 20],
    ]);
  });

  it("a nested split reads its own parent: the piece the first split made", async () => {
    const first = await split(PARENTS(), {
      axis: "y",
      labels: ["a", "b"],
      sizes: f('vec(box("sy") * 0.25, 1)'),
      units: ["absolute", "relative"],
    });
    const second = await split(first, {
      axis: "y",
      where: f('attributeIs("piece", "b")'),
      labels: ["c", "d"],
      sizes: f('vec(box("sy") * 0.5, 1)'),
      units: ["absolute", "relative"],
    });
    // b of the first cell is [2.5, 10] (7.5 tall), of the second [5, 20]
    // (15 tall); each is cut at half of ITS OWN height. The a pieces ride
    // through.
    expect(spansY(second)).toEqual([
      [0, 2.5],
      [2.5, 6.25],
      [6.25, 10],
      [0, 5],
      [5, 12.5],
      [12.5, 20],
    ]);
  });

  it("cuts the same bytes as the attribute spelling", async () => {
    const params = { axis: "y", labels: ["a", "b"], units: ["absolute", "relative"] };
    const byName = await split(PARENTS(), { ...params, sizes: f('vec(box("sy") * 0.25, box("y0") + 1)') });
    const byHand = await split(PARENTS(), {
      ...params,
      sizes: f(
        'vec((component(attribute("boundsMax", 3), 1) - component(attribute("boundsMin", 3), 1)) * 0.25, ' +
          'component(attribute("boundsMin", 3), 1) + 1)',
      ),
    });
    expect(snapshotGeometry(byName)).toEqual(snapshotGeometry(byHand));
  });
});
