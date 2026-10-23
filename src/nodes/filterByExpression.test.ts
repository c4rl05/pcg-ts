/**
 * filterByExpression — the filter family's arrival at the
 * params-accept-fields pillar. The tests pin the predicate contract an
 * agent has to be able to rely on: non-zero keeps, NaN drops, and a
 * vector predicate is refused rather than silently reinterpreted.
 */
import { describe, expect, it } from "vitest";
import { createPointCloud, type Geometry, setPolylineTopology } from "../data/index.js";
import type { FieldLike } from "../fields/index.js";
import {
  attribute,
  component,
  div,
  evaluateField,
  gt,
  lt,
  max,
  mul,
  position,
  randomField,
  sub,
} from "../fields/index.js";
import { cook } from "../graph/execute.js";
import { Graph } from "../graph/graph.js";
import { makeGeometryItem } from "../graph/index.js";
import { dataInput } from "../runtime/dataInput.js";
import { fieldFromJson, filterByExpression, type FilterByExpressionParams } from "./index.js";
import { firstGeo, positionsOf, runNode, snapshotGeometry } from "./nodes.testsupport.js";

function cloudAt(positions: readonly (readonly number[])[]): ReturnType<typeof createPointCloud> {
  const geo = createPointCloud(positions.length);
  const P = geo.attrs.point.require("P");
  positions.forEach((p, i) => P.setTuple(i, p));
  return geo;
}

const LINE = [
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
];

async function keep(
  predicate: FieldLike,
  positions: readonly (readonly number[])[] = LINE,
  params: Partial<FilterByExpressionParams> = {},
  seed = 1,
): Promise<number[]> {
  const geo = firstGeo(
    (
      await runNode(
        filterByExpression,
        { predicate, ...params },
        { in: [makeGeometryItem(cloudAt(positions))] },
        seed,
      )
    ).out,
  );
  return positionsOf(geo).map((p) => p[0]);
}

describe("filterByExpression", () => {
  it("keeps points where a field predicate is non-zero", async () => {
    expect(await keep(gt(component(position(), 0), 1.5))).toEqual([2, 3]);
    expect(await keep(lt(component(position(), 0), 1.5))).toEqual([0, 1]);
  });

  it("a constant-true predicate keeps everything and a constant-false keeps nothing", async () => {
    expect(await keep(1)).toEqual([0, 1, 2, 3]);
    expect(await keep(0)).toEqual([]);
    // Any non-zero counts, including negatives.
    expect(await keep(-0.5)).toEqual([0, 1, 2, 3]);
    // And the default param is the identity filter.
    const geo = cloudAt(LINE);
    const out = firstGeo((await runNode(filterByExpression, {}, { in: [makeGeometryItem(geo)] })).out);
    expect(snapshotGeometry(out)).toEqual(snapshotGeometry(geo));
  });

  it("NaN never passes", async () => {
    expect(await keep(NaN)).toEqual([]);
    // A per-point NaN drops only its own point: 0/0 at x = 0.
    expect(await keep(div(component(position(), 0), component(position(), 0)))).toEqual([1, 2, 3]);
  });

  it("mul is AND and max is OR over comparison flags", async () => {
    const x = component(position(), 0);
    expect(await keep(mul(gt(x, 0.5), lt(x, 2.5)))).toEqual([1, 2]);
    expect(await keep(max(lt(x, 0.5), gt(x, 2.5)))).toEqual([0, 3]);
  });

  it("reads attributes, and carries every attribute onto the survivors", async () => {
    const geo = cloudAt(LINE);
    geo.attrs.point.require("density").writable().set([0.1, 0.9, 0.2, 0.8]);
    const tag = geo.attrs.point.add("tag", "string", 1, "");
    LINE.forEach((_, i) => tag.setString(i, `p${i}`));
    const out = firstGeo(
      (
        await runNode(
          filterByExpression,
          { predicate: gt(attribute("density", 1), 0.5) },
          { in: [makeGeometryItem(geo)] },
        )
      ).out,
    );
    expect(positionsOf(out).map((p) => p[0])).toEqual([1, 3]);
    const outTag = out.attrs.point.require("tag");
    expect([outTag.getString(0), outTag.getString(1)]).toEqual(["p1", "p3"]);
  });

  it("refuses a vector predicate, naming the elementwise trap and the fix", async () => {
    await expect(
      runNode(
        filterByExpression,
        { predicate: gt(position(), 0) },
        { in: [makeGeometryItem(cloudAt(LINE))] },
      ),
    ).rejects.toThrow(/tuple size 1 \(one flag per point\), got tuple size 3.*component\(position\(\), 1\)/s);
  });

  it("a seed re-rolls context randomness, and 0 leaves the node seed alone", async () => {
    const many = Array.from({ length: 400 }, (_, i) => [i, 0, 0]);
    const half = lt(randomField("keep"), 0.5);
    const a = await keep(half, many, {}, 5);
    const b = await keep(half, many, {}, 5);
    expect(b).toEqual(a);
    expect(a.length).toBeGreaterThan(150);
    expect(a.length).toBeLessThan(250);
    // seed 0 is the node seed UNCHANGED — not hashCombine(nodeSeed, 0).
    // Checked against the field evaluated directly at the node seed, which
    // is the only reference that does not go through the node's own
    // folding rule; graphs authored before the param existed depend on it.
    const geo = cloudAt(many);
    const direct = evaluateField(half, { geo, domain: "point", seed: 5 });
    const expected = many.map((p, i) => (direct.data[i] !== 0 ? p[0] : -1)).filter((x) => x >= 0);
    expect(a).toEqual(expected);
    expect(await keep(half, many, { seed: 0 }, 5)).toEqual(expected);
    // A nonzero seed is a different roll, reproducible on its own terms.
    expect(await keep(half, many, { seed: 9 }, 5)).not.toEqual(a);
    expect(await keep(half, many, { seed: 9 }, 5)).toEqual(await keep(half, many, { seed: 9 }, 5));
  });

  it("handles an empty input and a single point", async () => {
    expect(await keep(1, [])).toEqual([]);
    expect(await keep(gt(component(position(), 0), 0), [[5, 0, 0]])).toEqual([5]);
    expect(await keep(gt(component(position(), 0), 0), [[-5, 0, 0]])).toEqual([]);
  });

  it("survives non-finite coordinates without keeping them by accident", async () => {
    // The comparison against NaN is false, so the bad point is dropped —
    // the same answer a hand-written filterByAttribute would give.
    expect(
      await keep(gt(component(position(), 0), -1), [
        [0, 0, 0],
        [NaN, 0, 0],
        [Infinity, 0, 0],
      ]),
    ).toEqual([0, Infinity]);
  });

  it("takes a predicate authored as a declarative field spec (the JSON path)", async () => {
    const spec = fieldFromJson({
      fn: "gt",
      args: [{ fn: "component", args: [{ fn: "position" }], index: 0 }, 1.5],
    });
    expect(await keep(spec)).toEqual([2, 3]);
  });

  it("is deterministic: cooking twice gives identical bytes", async () => {
    const geo = cloudAt(LINE);
    const run = () =>
      runNode(
        filterByExpression,
        { predicate: sub(component(position(), 0), 1) },
        { in: [makeGeometryItem(geo)] },
        3,
      );
    expect(snapshotGeometry(firstGeo((await run()).out))).toEqual(
      snapshotGeometry(firstGeo((await run()).out)),
    );
  });

  it("names the node when nothing is connected", async () => {
    await expect(runNode(filterByExpression, {}, {})).rejects.toThrow(
      /filterByExpression: input pin "in" has no geometry connected/,
    );
  });
});

// ---------------------------------------------------------------------------
// rest: the rejected points, so a two-way split is one node

/** Predicate values per point: positive, zero, NaN, negative, mixed. */
const PRED = [1, 0, NaN, -2, 3, 0, NaN, 0.5];

/** A line of PRED.length points with a `pred` column and an `idx` column. */
function splitFixture(): Geometry {
  const geo = cloudAt(PRED.map((_, i) => [i, 0, 0]));
  geo.attrs.point.add("pred", "f32", 1, 0).writable().set(PRED);
  const idx = geo.attrs.point.add("idx", "i32", 1, 0);
  PRED.forEach((_, i) => idx.set(i, i));
  const tag = geo.attrs.point.add("tag", "string", 1, "");
  PRED.forEach((_, i) => tag.setString(i, `p${i}`));
  return geo;
}

function idxOf(geo: Geometry): number[] {
  const idx = geo.attrs.point.require("idx");
  return Array.from({ length: geo.pointCount }, (_, i) => idx.get(i));
}

describe("filterByExpression rest", () => {
  it("out and rest partition the input, each in stable input order; 0 and NaN go to rest", async () => {
    const geo = splitFixture();
    const res = await runNode(
      filterByExpression,
      { predicate: attribute("pred", 1) },
      { in: [makeGeometryItem(geo)] },
    );
    const out = idxOf(firstGeo(res.out));
    const rest = idxOf(firstGeo(res.rest));
    expect(out).toEqual([0, 3, 4, 7]);
    expect(rest).toEqual([1, 2, 5, 6]);
    expect(out.length + rest.length).toBe(geo.pointCount);
    expect([...out, ...rest].sort((a, b) => a - b)).toEqual(PRED.map((_, i) => i));
    // Positions follow the same order, so the partition is of the points
    // themselves, not just of the index column.
    expect(positionsOf(firstGeo(res.rest)).map((p) => p[0])).toEqual([1, 2, 5, 6]);
  });

  it("carries every attribute onto rest", async () => {
    const res = await runNode(
      filterByExpression,
      { predicate: attribute("pred", 1) },
      { in: [makeGeometryItem(splitFixture())] },
    );
    const rest = firstGeo(res.rest);
    const tag = rest.attrs.point.require("tag");
    expect(Array.from({ length: rest.pointCount }, (_, i) => tag.getString(i))).toEqual([
      "p1",
      "p2",
      "p5",
      "p6",
    ]);
    const pred = rest.attrs.point.require("pred");
    const values = Array.from({ length: rest.pointCount }, (_, i) => pred.get(i));
    expect(values[0]).toBe(0);
    expect(values[1]).toBeNaN();
  });

  it("topology 'keep' gives each side the primitives wholly on it; a straddler is on neither", async () => {
    const geo = cloudAt(Array.from({ length: 6 }, (_, i) => [i, 0, 0]));
    // Points 0,1 pass; 2..5 are rejected. [0,1] is out's, [2,3] and [4,5]
    // are rest's, [1,2] straddles the split.
    const prims = [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
    ];
    const flat = prims.flat();
    const start = prims.map((_, p) => p * 2);
    const count = prims.map(() => 2);
    setPolylineTopology(geo, flat, start, count);
    const kind = geo.attrs.primitive.add("roadKind", "string", 1, "");
    prims.forEach((_, p) => kind.setString(p, `road${p}`));
    const res = await runNode(
      filterByExpression,
      { predicate: lt(component(position(), 0), 1.5), topology: "keep" },
      { in: [makeGeometryItem(geo)] },
    );
    const out = firstGeo(res.out);
    const rest = firstGeo(res.rest);
    expect(out.pointCount).toBe(2);
    expect(rest.pointCount).toBe(4);
    expect(out.primitiveCount).toBe(1);
    expect(rest.primitiveCount).toBe(2);
    const kinds = (g: Geometry) => {
      const k = g.attrs.primitive.require("roadKind");
      return Array.from({ length: g.primitiveCount }, (_, p) => k.getString(p));
    };
    expect(kinds(out)).toEqual(["road0"]);
    expect(kinds(rest)).toEqual(["road2", "road3"]);
  });

  it("a primitive with no vertices stays on out only, so the two sides never share a primitive", async () => {
    const geo = cloudAt(Array.from({ length: 4 }, (_, i) => [i, 0, 0]));
    // [0,1] out's, a zero-vertex primitive, [2,3] rest's.
    // Built raw: the polyline helper refuses a primitive under 2 vertices.
    geo.setTopology(new Uint32Array([0, 1, 2, 3]), new Uint32Array([0, 2, 2]), new Uint32Array([2, 0, 2]));
    const kind = geo.attrs.primitive.add("roadKind", "string", 1, "");
    ["whole", "empty", "rejected"].forEach((k, p) => kind.setString(p, k));
    const res = await runNode(
      filterByExpression,
      { predicate: lt(component(position(), 0), 1.5), topology: "keep" },
      { in: [makeGeometryItem(geo)] },
    );
    const kinds = (g: Geometry) => {
      const k = g.attrs.primitive.require("roadKind");
      return Array.from({ length: g.primitiveCount }, (_, p) => k.getString(p));
    };
    // `out` is what it was before `rest` existed: the vacuous survivor kept.
    expect(kinds(firstGeo(res.out))).toEqual(["whole", "empty"]);
    expect(kinds(firstGeo(res.rest))).toEqual(["rejected"]);
    expect(firstGeo(res.out).primitiveCount + firstGeo(res.rest).primitiveCount).toBe(geo.primitiveCount);
  });

  function splitGraph(seed: number, predicate: FieldLike, geo: Geometry = splitFixture()): {
    g: Graph;
    f: ReturnType<Graph["add"]>;
  } {
    const g = new Graph(seed);
    const src = g.add(dataInput, { items: [makeGeometryItem(geo)] }, "src");
    const f = g.add(filterByExpression, { predicate }, "f");
    g.connect(src, "out", f, "in");
    g.output(f, "out", "kept");
    return { g, f };
  }

  it("in a graph, rest is built only when wired, and out is the same bytes either way", async () => {
    const pred = fieldFromJson({ fn: "attribute", name: "pred", tupleSize: 1 });
    const unread = splitGraph(4, pred);
    const a = await cook(unread.g);
    expect(unread.g.require("f").cache?.outputs.rest).toEqual([]);

    const read = splitGraph(4, pred);
    read.g.output(read.f, "rest", "rest");
    const b = await cook(read.g);
    expect(snapshotGeometry(firstGeo(a.outputs.kept))).toEqual(
      snapshotGeometry(firstGeo(b.outputs.kept)),
    );
    expect(idxOf(firstGeo(b.outputs.rest))).toEqual([1, 2, 5, 6]);

    // Unchanged wiring serves the cache.
    expect((await cook(unread.g)).stats.cooked).toBe(0);
    // Declaring rest after a cook recooks the node (and only it), and rest
    // is then built.
    unread.g.output(unread.f, "rest", "rest");
    const c = await cook(unread.g);
    expect(c.stats.cooked).toBe(1);
    expect(idxOf(firstGeo(c.outputs.rest))).toEqual([1, 2, 5, 6]);
    expect(snapshotGeometry(firstGeo(c.outputs.kept))).toEqual(
      snapshotGeometry(firstGeo(a.outputs.kept)),
    );
  });

  it("a connection leaving rest counts as reading it", async () => {
    const pred = fieldFromJson({ fn: "attribute", name: "pred", tupleSize: 1 });
    const { g, f } = splitGraph(4, pred);
    await cook(g);
    expect(g.require("f").cache?.outputs.rest).toEqual([]);
    const after = g.add(filterByExpression, {}, "after");
    g.connect(f, "rest", after, "in");
    g.output(after, "out", "afterRest");
    const res = await cook(g);
    expect(idxOf(firstGeo(res.outputs.afterRest))).toEqual([1, 2, 5, 6]);
  });

  it("rest from a seeded predicate is deterministic across fresh graphs", async () => {
    const many = Array.from({ length: 400 }, (_, i) => [i, 0, 0]);
    const half = lt(randomField("keep"), 0.5);
    const run = async () => {
      const { g, f } = splitGraph(13, half, cloudAt(many));
      g.output(f, "rest", "rest");
      return cook(g);
    };
    const a = await run();
    const b = await run();
    const restA = firstGeo(a.outputs.rest);
    expect(restA.pointCount).toBeGreaterThan(150);
    expect(restA.pointCount + firstGeo(a.outputs.kept).pointCount).toBe(many.length);
    expect(snapshotGeometry(restA)).toEqual(snapshotGeometry(firstGeo(b.outputs.rest)));
  });
});
