/**
 * An output's `role: "asset"` in the serialized format: written only when
 * set (so every existing document is byte-identical), canonicalized on
 * read, refused with a did-you-mean when misspelled, refused on a pin
 * that cannot carry a mesh, and refused inside a subgraph body, whose
 * outputs never reach a host.
 */
import { describe, expect, it } from "vitest";
import { type Diagnostic, diagnosticsOf } from "../diagnostics/index.js";
import "../spawn/index.js";
import { Graph } from "../graph/index.js";
import { meshPrimitive } from "./index.js";
import { deserializeGraph, serializeGraph } from "./serialize.js";

const MESH = { id: "brickMesh", type: "meshPrimitive", params: {} };

function docWith(outputs: unknown[], nodes: unknown[] = [MESH]): unknown {
  return { formatVersion: 1, seed: 0, nodes, connections: [], outputs };
}

function loadFault(doc: unknown): { message: string; records: readonly Diagnostic[] } {
  try {
    deserializeGraph(doc);
  } catch (err) {
    return { message: (err as Error).message, records: diagnosticsOf(err) };
  }
  throw new Error("expected the load to fail");
}

describe("serialized output role", () => {
  it("round-trips role asset, and writes no role key where none is set", () => {
    const g = new Graph(3);
    const mesh = g.add(meshPrimitive, {}, "brickMesh");
    g.output(mesh, "out", "brick", { role: "asset" });
    g.output(mesh, "out", "scene");
    const json = serializeGraph(g);
    expect(json.outputs).toEqual([
      { id: "brickMesh", pin: "out", name: "brick", role: "asset" },
      { id: "brickMesh", pin: "out", name: "scene" },
    ]);
    expect(Object.hasOwn(json.outputs[1]!, "role")).toBe(false);
    // Key order is id, pin, name, role: the role trails, so a document that
    // gains one differs from its old self by exactly that key.
    expect(Object.keys(json.outputs[0]!)).toEqual(["id", "pin", "name", "role"]);
    const back = deserializeGraph(JSON.parse(JSON.stringify(json)));
    expect(back.describe().outputs).toEqual(g.describe().outputs);
    expect(JSON.stringify(serializeGraph(back))).toBe(JSON.stringify(json));
  });

  it("leaves a graph without roles byte-identical through a load", () => {
    const first = JSON.stringify(serializeGraph(deserializeGraph(docWith([{ id: "brickMesh", pin: "out", name: "scene" }]))));
    expect(first).not.toContain('"role"');
    expect(JSON.stringify(serializeGraph(deserializeGraph(JSON.parse(first))))).toBe(first);
  });

  it("refuses a misspelled role with a did-you-mean, located at the key", () => {
    const { message, records } = loadFault(docWith([{ id: "brickMesh", pin: "out", name: "brick", role: "assets" }]));
    expect(message).toBe(
      'outputs[0]: role "assets" is not a role; did you mean "asset"? valid: "asset" (omit role for scene content)',
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      code: "invalid-asset-output",
      path: "/outputs/0/role",
      nodeId: "brickMesh",
      pin: "out",
      didYouMean: ["asset"],
      valid: ["asset"],
      fix: 'replace "assets" with "asset"',
    });
  });

  it("refuses a non-string role without a suggestion", () => {
    const { message, records } = loadFault(docWith([{ id: "brickMesh", pin: "out", name: "brick", role: 1 }]));
    expect(message).toBe('outputs[0]: role 1 is not a role; valid: "asset" (omit role for scene content)');
    expect(records[0]?.didYouMean).toBeUndefined();
  });

  it("refuses role asset on a pin that carries instances", () => {
    const { message, records } = loadFault(
      docWith(
        [{ id: "spawn", pin: "instances", name: "brick", role: "asset" }],
        [{ id: "spawn", type: "spawnInstances", params: {} }],
      ),
    );
    expect(message).toBe(
      'outputs[0]: output "brick" (node "spawn" pin "instances") is declared role "asset", but an asset is a mesh and that pin carries instances; point it at a geometry pin (meshPrimitive, extrudePolygon, sweepProfile, mergePrimitives), or drop "role"',
    );
    expect(records[0]).toMatchObject({ code: "invalid-asset-output", path: "/outputs/0/role", nodeId: "spawn", pin: "instances" });
  });

  it("refuses role inside a subgraph body, naming the wrapper", () => {
    const { message, records } = loadFault(
      docWith(
        [{ id: "wall", pin: "out", name: "wall" }],
        [
          {
            id: "wall",
            type: "subgraph",
            params: {},
            subgraph: {
              graph: docWith([{ id: "brickMesh", pin: "out", name: "brick", role: "asset" }]),
              inputs: [],
              outputs: [{ name: "out", node: "brickMesh", pin: "out" }],
            },
          },
        ],
      ),
    );
    expect(message).toBe(
      'node "wall" inner graph: outputs[0]: role "asset" is only read on the outermost graph — a subgraph body\'s outputs never reach a host; declare the asset output on the graph that wraps it',
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      code: "invalid-asset-output",
      path: "/nodes/0/subgraph/graph/outputs/0/role",
      nodeId: "wall",
    });
  });

  it("does not list role among a body output's valid keys", () => {
    const { message } = loadFault(
      docWith(
        [{ id: "wall", pin: "out", name: "wall" }],
        [
          {
            id: "wall",
            type: "subgraph",
            params: {},
            subgraph: {
              graph: docWith([{ id: "brickMesh", pin: "out", name: "brick", rle: "asset" }]),
              inputs: [],
              outputs: [{ name: "out", node: "brickMesh", pin: "out" }],
            },
          },
        ],
      ),
    );
    expect(message).toMatch(/unknown key "rle"; valid keys: id, pin, name\./);
  });
});
