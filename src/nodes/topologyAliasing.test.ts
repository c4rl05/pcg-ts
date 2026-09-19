/**
 * The aliasing guard for the no-copy topology hand-over (`adoptTopology`).
 *
 * The nodes switched to it hand the arrays they built straight to their
 * output, so a node's cached geometry now holds the very arrays its execute
 * allocated. That is safe exactly as long as nothing ELSE holds them: not
 * the node (it must not keep or write them), and not any other node (none
 * may adopt an input's arrays, nor write an input's topology in place).
 * Break either rule and a DOWNSTREAM re-cook silently rewrites an UPSTREAM
 * cache entry, which only shows on the next cook that is served from it.
 *
 * So the guard cooks a graph whose upstream is every switched site, edits a
 * downstream param (re-cooking only downstream nodes, several of which
 * read the upstream outputs and adopt arrays of their own), cooks again,
 * and compares every upstream output — the cached object the second cook
 * served — against a fresh cook of the upstream alone. The controls plant
 * the two ways the rule can be broken and require the guard to see them.
 */
import { describe, expect, it } from "vitest";

import { adoptTopology } from "../data/adoptTopology.js";
import { Geometry } from "../data/index.js";
import {
  type DataCollection,
  Graph,
  type NodeHandle,
  cloneGeometry,
  cook,
  firstGeometry,
  makeGeometryItem,
} from "../graph/index.js";
import { defineNode } from "../graph/node.js";
import {
  connectPoints,
  copyToPoints,
  filterPrimitivesByBounds,
  mergePrimitives,
  meshPrimitive,
  pointGrid,
  pointsToPath,
  sweepProfile,
  transformPoints,
} from "./index.js";

/**
 * A deliberately broken downstream node. With `shift` 0 it only passes a
 * clone through; with `shift` nonzero it corrupts its INPUT's topology —
 * `mode "write"` by writing the input's `vertexToPoint` in place, `mode
 * "adopt"` by adopting the input's arrays into its own output (the aliasing
 * the adopting path forbids) and then writing through that output.
 */
const vandal = defineNode<{ shift: number; mode: "write" | "adopt" }>({
  type: "test.topologyVandal",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: { shift: 0, mode: "write" },
  execute({ inputs, params }) {
    const src = firstGeometry(inputs.in as DataCollection);
    if (!src) throw new Error("test.topologyVandal: no geometry on pin in");
    if (params.shift === 0) return { out: [makeGeometryItem(cloneGeometry(src))] };
    const np = src.pointCount;
    if (params.mode === "write") {
      src.vertexToPoint[0] = (src.vertexToPoint[0] + params.shift) % np;
      return { out: [makeGeometryItem(cloneGeometry(src))] };
    }
    const out = new Geometry();
    out.attrs.point.resize(np);
    adoptTopology(out, src.vertexToPoint, src.primVertexStart, src.primVertexCount);
    out.vertexToPoint[0] = (out.vertexToPoint[0] + params.shift) % np;
    return { out: [makeGeometryItem(out)] };
  },
});

/**
 * The upstream outputs: every node that now adopts, directly (sweepProfile,
 * mergePrimitives, copyToPoints "keep", filterPrimitivesByBounds through
 * gatherPrimitives, meshPrimitive through createTriangleMesh) or through
 * setPolylineTopology (pointsToPath, connectPoints).
 */
const UPSTREAM = ["path", "links", "tube", "plate", "merged", "copies", "kept"] as const;

interface Built {
  g: Graph;
  /** Re-cooks downstream only: `moved` and everything below it. */
  edit: () => void;
  /** How many nodes the edit re-cooks. */
  downstreamCount: number;
}

function build(opts: { downstream: boolean; vandal?: "write" | "adopt" }): Built {
  const g = new Graph(7);
  const grid = g.add(pointGrid, { countX: 5, countY: 1, countZ: 3, spacing: [1, 1, 1] }, "grid");
  const path = g.add(pointsToPath, {}, "path");
  g.connect(grid, "out", path, "in");
  const links = g.add(connectPoints, { mode: "radius", radius: 1.01 }, "links");
  g.connect(grid, "out", links, "in");
  const tube = g.add(sweepProfile, { sides: 4, radius: 0.1 }, "tube");
  g.connect(path, "out", tube, "in");
  const plate = g.add(meshPrimitive, { shape: "plane", size: [4, 4, 4], subdivisions: [2, 1, 2] }, "plate");
  const merged = g.add(mergePrimitives, {}, "merged");
  g.connect(tube, "out", merged, "in");
  g.connect(plate, "out", merged, "in");
  g.connect(links, "out", merged, "in");
  const targets = g.add(pointGrid, { countX: 3, countY: 1, countZ: 1, spacing: [20, 1, 1] }, "targets");
  const copies = g.add(copyToPoints, { topology: "keep" }, "copies");
  g.connect(merged, "out", copies, "source");
  g.connect(targets, "out", copies, "target");
  const kept = g.add(
    filterPrimitivesByBounds,
    { boundsMin: [-100, -100, -100], boundsMax: [30, 100, 100], vertex: "first", unreferencedPoints: "drop" },
    "kept",
  );
  g.connect(copies, "out", kept, "in");
  const handles: Record<(typeof UPSTREAM)[number], NodeHandle> = { path, links, tube, plate, merged, copies, kept };
  for (const name of UPSTREAM) g.output(handles[name], "out", name);

  if (!opts.downstream) return { g, edit: () => {}, downstreamCount: 0 };

  // Downstream: a copying node (transformPoints clones), then two adopting
  // nodes that READ upstream outputs while they build their own arrays —
  // mergePrimitives appends links/tube/plate, and copyToPoints "keep" with
  // no selection plans straight off its source's own arrays.
  const moved = g.add(transformPoints, { translate: [0, 0, 0] }, "moved");
  g.connect(kept, "out", moved, "in");
  const again = g.add(mergePrimitives, {}, "again");
  g.connect(moved, "out", again, "in");
  g.connect(links, "out", again, "in");
  g.connect(tube, "out", again, "in");
  g.connect(plate, "out", again, "in");
  const copied = g.add(copyToPoints, { topology: "keep" }, "copied");
  g.connect(again, "out", copied, "source");
  g.connect(targets, "out", copied, "target");
  g.output(copied, "out", "down");
  let downstreamCount = 3;
  let bad: NodeHandle<{ shift: number; mode: "write" | "adopt" }> | undefined;
  if (opts.vandal !== undefined) {
    bad = g.add(vandal, { shift: 0, mode: opts.vandal }, "vandal");
    g.connect(links, "out", bad, "in");
    g.output(bad, "out", "vandal");
    downstreamCount++;
  }
  return {
    g,
    edit: () => {
      g.setParam(moved, "translate", [1, 2, 3]);
      if (bad) g.setParam(bad, "shift", 1);
    },
    downstreamCount,
  };
}

type Topology = { v: number[]; s: number[]; c: number[]; points: number };

function topologyOf(coll: DataCollection | undefined, name: string): Topology {
  const geo = coll ? firstGeometry(coll) : undefined;
  if (!geo) throw new Error(`no geometry on output ${name}`);
  return {
    v: Array.from(geo.vertexToPoint),
    s: Array.from(geo.primVertexStart),
    c: Array.from(geo.primVertexCount),
    points: geo.pointCount,
  };
}

/**
 * Cook, edit downstream, cook again; return the upstream outputs whose
 * CACHED topology no longer matches a fresh cook of the upstream alone.
 */
async function guard(vandalMode?: "write" | "adopt"): Promise<string[]> {
  const built = build({ downstream: true, vandal: vandalMode });
  const first = await cook(built.g);
  built.edit();
  const second = await cook(built.g);
  // The edit re-cooked the downstream nodes and nothing upstream: every
  // upstream output is the same object the first cook produced.
  expect(second.stats.cooked).toBe(built.downstreamCount);
  for (const name of UPSTREAM) {
    expect(firstGeometry(second.outputs[name])).toBe(firstGeometry(first.outputs[name]));
  }
  const fresh = await cook(build({ downstream: false }).g);
  const differ: string[] = [];
  for (const name of UPSTREAM) {
    const cached = topologyOf(second.outputs[name], name);
    const want = topologyOf(fresh.outputs[name], name);
    // Nothing degenerate would make "same" vacuous.
    expect(want.v.length).toBeGreaterThan(0);
    if (JSON.stringify(cached) !== JSON.stringify(want)) differ.push(name);
  }
  return differ;
}

describe("adopted topology is never rewritten by a downstream re-cook", () => {
  it("every upstream cache entry still matches a fresh cook after a downstream edit", async () => {
    expect(await guard()).toEqual([]);
  });

  it("control: a downstream node writing its input's topology in place is caught", async () => {
    expect(await guard("write")).toEqual(["links"]);
  });

  it("control: a downstream node adopting its input's arrays and writing them is caught", async () => {
    expect(await guard("adopt")).toEqual(["links"]);
  });
});
