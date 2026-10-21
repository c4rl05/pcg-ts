/**
 * `Graph.output(..., { role: "asset" })`: the declaration that makes an
 * output's geometry the mesh for asset id = its name. The graph layer only
 * records and validates it; reading the meshes off a cook result is
 * `collectGraphAssets` (src/spawn/meshAssets.ts).
 */
import { describe, expect, it } from "vitest";
import { diagnosticsOf } from "../diagnostics/index.js";
import { makeInstancesItem } from "./data.js";
import { cook } from "./execute.js";
import { Graph } from "./graph.js";
import { defineNode } from "./node.js";
import { makePointsNode } from "./testNodes.js";

const instancesNode = defineNode<Record<string, never>>({
  type: "fakeSpawn",
  inputs: [],
  outputs: [{ name: "instances", kind: "instances" }],
  defaultParams: {},
  execute() {
    return { instances: [makeInstancesItem([])] };
  },
});

describe("Graph.output role", () => {
  it("records role asset and describe() reports it only where it is set", () => {
    const g = new Graph(1);
    const p = g.add(makePointsNode(), undefined, "mesh");
    g.output(p, "out", "brick", { role: "asset" });
    g.output(p, "out", "scene");
    expect(g.describe().outputs).toEqual([
      { id: "mesh", pin: "out", name: "brick", role: "asset" },
      { id: "mesh", pin: "out", name: "scene" },
    ]);
    expect(Object.hasOwn(g.describe().outputs[1]!, "role")).toBe(false);
    expect(g._outputs.map((o) => o.role)).toEqual(["asset", undefined]);
  });

  it("an asset output cooks like any other output", async () => {
    const g = new Graph(1);
    const p = g.add(makePointsNode(), undefined, "mesh");
    g.output(p, "out", "brick", { role: "asset" });
    const r = await cook(g);
    expect(Object.keys(r.outputs)).toEqual(["brick"]);
    expect(r.outputs.brick).toHaveLength(1);
  });

  it("refuses role asset on a pin that carries instances, naming the output, node, pin and the fix", () => {
    const g = new Graph(1);
    const s = g.add(instancesNode, undefined, "spawn");
    let caught: unknown;
    try {
      g.output(s, "instances", "brick", { role: "asset" });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      'output "brick" (node "spawn" pin "instances") is declared role "asset", but an asset is a mesh and that pin carries instances; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop "role"',
    );
    expect(diagnosticsOf(caught)[0]?.code).toBe("invalid-asset-output");
    expect(g._outputs).toHaveLength(0);
    // Without the role the same pin is a fine scene output.
    g.output(s, "instances", "brick");
    expect(g._outputs).toHaveLength(1);
  });

  it("refuses a role that is not one, from untyped callers", () => {
    const g = new Graph(1);
    const p = g.add(makePointsNode(), undefined, "mesh");
    expect(() => g.output(p, "out", "brick", { role: "assets" as "asset" })).toThrow(
      /role "assets" is not a role; valid: "asset" \(omit role for scene content\)/,
    );
  });

  it("bumps the version like any declaration", () => {
    const g = new Graph(1);
    const p = g.add(makePointsNode(), undefined, "mesh");
    const v = g.version;
    g.output(p, "out", "brick", { role: "asset" });
    expect(g.version).toBe(v + 1);
  });
});
