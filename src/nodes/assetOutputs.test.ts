/**
 * The static half of graph-supplied asset meshes: which ids a graph
 * supplies (`describeSuppliedAssets`), and the `asset-output-unused`
 * warning `diagnoseGraph` raises for an asset no spawner can emit — only
 * when every spawner's id set is closed, so the warning is never a guess.
 */
import { describe, expect, it } from "vitest";
import { Graph, subgraphNode } from "../graph/index.js";
import { spawnInstances } from "../spawn/index.js";
import { diagnoseGraph } from "./diagnose.js";
import { describeSuppliedAssets } from "./graphAssets.js";
import { meshPrimitive, pointGrid } from "./index.js";
import { serializeGraph } from "./serialize.js";

/** A grid spawning `assetId` (or reading `assetAttr`), plus one asset output named `assetName`. */
function assetGraph(assetName: string, spawn: { assetId?: string; assetAttr?: string } | undefined): Graph {
  const g = new Graph(1);
  const mesh = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, "brickMesh");
  g.output(mesh, "out", assetName, { role: "asset" });
  if (spawn !== undefined) {
    const grid = g.add(pointGrid, {}, "grid");
    const s = g.add(spawnInstances, spawn, "spawn");
    g.connect(grid, "out", s, "in");
    g.output(s, "instances", "bricks");
  }
  return g;
}

describe("describeSuppliedAssets", () => {
  it("lists top-level asset outputs in declaration order with node and pin", () => {
    const g = new Graph(1);
    const a = g.add(meshPrimitive, {}, "a");
    const b = g.add(meshPrimitive, {}, "b");
    g.output(b, "out", "stud", { role: "asset" });
    g.output(a, "out", "scene");
    g.output(a, "out", "brick", { role: "asset" });
    expect(describeSuppliedAssets(g)).toEqual([
      { id: "stud", node: "b", pin: "out" },
      { id: "brick", node: "a", pin: "out" },
    ]);
  });

  it("does not look inside a subgraph body", () => {
    const inner = new Graph(1);
    const m = inner.add(meshPrimitive, {}, "m");
    inner.output(m, "out", "brick", { role: "asset" });
    const outer = new Graph(1);
    const wrap = outer.add(subgraphNode(inner, [], [{ name: "out", node: m, pin: "out" }]), {}, "wall");
    outer.output(wrap, "out", "wall");
    expect(describeSuppliedAssets(outer)).toEqual([]);
    // And the writer refuses to emit a body role the loader would refuse.
    expect(() => serializeGraph(outer)).toThrow(
      /cannot serialize output "brick" \(node "m" pin "out"\) of a subgraph body: role "asset" is only read on the outermost graph/,
    );
  });
});

describe("diagnoseGraph: asset-output-unused", () => {
  it("is silent when a spawner emits the id", () => {
    expect(diagnoseGraph(assetGraph("brick", { assetId: "brick" })).filter((d) => d.code === "asset-output-unused")).toEqual([]);
  });

  it("warns with a did-you-mean when every spawner's set is closed and none emits the id", () => {
    const found = diagnoseGraph(assetGraph("brik", { assetId: "brick" })).filter((d) => d.code === "asset-output-unused");
    expect(found).toEqual([
      {
        code: "asset-output-unused",
        severity: "warning",
        message:
          'asset output "brik" (node "brickMesh" pin "out") supplies the mesh for asset id "brik", but no spawnInstances in this graph can emit that id (they emit "brick"); did you mean "brick"? rename the output to an id a spawner emits, or drop role "asset" to draw it as scene content',
        nodeId: "brickMesh",
        pin: "out",
        got: "brik",
        valid: ["brick"],
        didYouMean: ["brick"],
      },
    ]);
  });

  it("warns when the graph has no spawner at all", () => {
    const found = diagnoseGraph(assetGraph("brick", undefined)).filter((d) => d.code === "asset-output-unused");
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toBe(
      'asset output "brick" (node "brickMesh" pin "out") supplies the mesh for asset id "brick", but the graph has no spawnInstances node, so nothing ever draws it; add a spawnInstances with assetId "brick", or drop role "asset" to draw the output as scene content',
    );
  });

  it("is silent while any spawner's set is open — the id may be emitted", () => {
    // Nothing writes "species", so the set is open: a guess is not a finding.
    const g = assetGraph("brik", { assetId: "brick", assetAttr: "species" });
    expect(diagnoseGraph(g).filter((d) => d.code === "asset-output-unused")).toEqual([]);
  });
});
