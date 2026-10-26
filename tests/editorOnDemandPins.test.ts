/**
 * The editor's auto policy declares an output for every UNCONNECTED pin, so
 * the page draws whatever a graph leaves dangling. An on-demand pin
 * (`PinDef.onDemand`: filterByExpression's `rest`, applyRules' `trail`) is
 * the exception, and the one that matters: declaring it is exactly what
 * makes the node build it, and an unwired `rest` drawn as scene content is
 * the filter's rejects painted over its keeps — every filter in the corpus
 * looked like it did nothing until this was caught in the gallery frames.
 *
 * Lives in `tests/` for the reason `editorKnobs.test.ts` gives: the
 * browser pages sit outside vitest's `src/**` include.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DataItem, SerializedGraph } from "pcg-ts";
import { EditorController, type RenderInfo } from "../editor/controller.js";
import { Graph, boxContact, fieldFromJson, pointGrid, serializeGraph, setBounds } from "../src/index.js";

function corpus(name: string): string {
  return readFileSync(new URL(`../graphs/${name}.json`, import.meta.url), "utf8");
}

function withRender(): {
  c: EditorController;
  next: () => Promise<{ items: readonly DataItem[]; info: RenderInfo }>;
} {
  let resolve: ((r: { items: readonly DataItem[]; info: RenderInfo }) => void) | undefined;
  const c = new EditorController({
    render: (items, info) => resolve?.({ items, info }),
    status: () => {},
  });
  return {
    c,
    next: () =>
      new Promise((r) => {
        resolve = r;
      }),
  };
}

function points(items: readonly DataItem[]): number {
  let n = 0;
  for (const item of items) if (item.kind === "geometry") n += item.geo.pointCount;
  return n;
}

describe("on-demand pins in the editor's auto policy", () => {
  it("an unwired filterByExpression `rest` is not declared, cooked or drawn", async () => {
    const { c, next } = withRender();
    const rendered = next();
    expect(c.importText(corpus("basics-filter-by-expression"))).not.toHaveProperty("error");
    const { items, info } = await rendered;
    expect(info.outputs.some((o) => o.endsWith(".rest"))).toBe(false);
    // Only the kept points: the scatter's 1200 minus the rejects.
    const total = points(items);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(1200);
    const out = JSON.parse(c.exportText()) as SerializedGraph;
    expect(out.outputs?.some((o) => o.pin === "rest") ?? false).toBe(false);
  });

  it("an unwired applyRules `trail` is not declared either: the outputs are exactly the file's", async () => {
    const { c, next } = withRender();
    const rendered = next();
    const text = corpus("basics-apply-rules");
    expect(c.importText(text)).not.toHaveProperty("error");
    const { info } = await rendered;
    // Every other pin of the graph is wired or declared by the file, so the
    // auto policy has nothing to add — and before the flag it added
    // `<applyRules id>.trail`.
    const declared = (JSON.parse(text) as SerializedGraph).outputs?.map((o) => o.name) ?? [];
    expect(info.outputs).toEqual(declared);
  });

  it("a non-on-demand unconnected pin is still auto-declared beside an unwired `rest`", async () => {
    // The falsifier for the skip: a second, dangling filter's `out` is drawn.
    const doc = JSON.parse(corpus("basics-filter-by-expression")) as SerializedGraph;
    const filter = doc.nodes.find((n) => n.type === "filterByExpression");
    if (filter === undefined) throw new Error("fixture lost its filterByExpression");
    const src = doc.connections.find((w) => w.to[0] === filter.id)?.from;
    if (src === undefined) throw new Error("fixture lost the filter's input");
    const twin = { ...filter, id: "twin" };
    const withTwin = {
      ...doc,
      nodes: [...doc.nodes, twin],
      connections: [...doc.connections, { from: src, to: ["twin", "in"] }],
    };
    const { c, next } = withRender();
    const rendered = next();
    expect(c.importText(JSON.stringify(withTwin))).not.toHaveProperty("error");
    const { info } = await rendered;
    expect(info.outputs).toContain("twin.out");
    expect(info.outputs).not.toContain("twin.rest");
  });

  it("boxContact's `pairs` is on demand too: its `out` is declared, its pairs are not, until a file declares them", async () => {
    // A 2x2 plan of rooms touching itself. Built here rather than taken from
    // the corpus: the corpus' one boxContact sits inside an applyRules body,
    // where the auto policy never looks.
    const g = new Graph(1);
    const grid = g.add(pointGrid, { countX: 2, countY: 1, countZ: 2, spacing: [4, 4, 4] }, "grid");
    // Constant LOCAL corners: each room's box sits at its point's P.
    const rooms = g.add(setBounds, { boundsMin: [0, 0, 0], boundsMax: [4, 3, 4] }, "rooms");
    const probe = g.add(boxContact, { mode: "touch", excludeSelf: true }, "probe");
    g.connect(grid, "out", rooms, "in");
    g.connect(rooms, "out", probe, "in");
    g.connect(rooms, "out", probe, "targets");
    const doc = serializeGraph(g);

    const plain = withRender();
    const rendered = plain.next();
    expect(plain.c.importText(JSON.stringify(doc))).not.toHaveProperty("error");
    const first = await rendered;
    expect(first.info.outputs).toContain("probe.out");
    expect(first.info.outputs).not.toContain("probe.pairs");
    expect(points(first.items)).toBe(4);

    // Declared by the file: kept, and the 12 ordered pairs are drawn beside the rooms.
    const declared = withRender();
    const again = declared.next();
    const withPairs = { ...doc, outputs: [...(doc.outputs ?? []), { id: "probe", pin: "pairs", name: "pairs" }] };
    expect(declared.c.importText(JSON.stringify(withPairs))).not.toHaveProperty("error");
    const second = await again;
    expect(second.info.outputs).toContain("pairs");
    expect(points(second.items)).toBe(4 + 12);
  });

  it("a file that declares `rest` itself keeps the declaration, and it is drawn", async () => {
    const doc = JSON.parse(corpus("basics-filter-by-expression")) as SerializedGraph;
    const filter = doc.nodes.find((n) => n.type === "filterByExpression");
    if (filter === undefined) throw new Error("fixture lost its filterByExpression");
    const withRest = { ...doc, outputs: [...(doc.outputs ?? []), { id: filter.id, pin: "rest", name: "rejects" }] };
    const { c, next } = withRender();
    const rendered = next();
    expect(c.importText(JSON.stringify(withRest))).not.toHaveProperty("error");
    const { items, info } = await rendered;
    expect(info.outputs).toContain("rejects");
    // Kept plus rejected is the whole scatter.
    expect(points(items)).toBe(1200);
  });
});
