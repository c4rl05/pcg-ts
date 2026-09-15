/**
 * `checkSerializedGraph`: load faults and structural checks as one report,
 * never a throw — and a `path` on every record that names a node the
 * document holds.
 */
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { loadGraphs } from "../docs/graphIndex.js";
import { checkSerializedGraph } from "./checkGraph.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Resolve an RFC 6901 pointer, or `undefined` when it leaves the document. */
function resolvePointer(doc: unknown, pointer: string): unknown {
  if (pointer === "") return doc;
  let at: unknown = doc;
  for (const raw of pointer.slice(1).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (typeof at !== "object" || at === null || !Object.hasOwn(at, key)) return undefined;
    at = (at as Record<string, unknown>)[key];
  }
  return at;
}

describe("checkSerializedGraph", () => {
  it("a sound document gives its graph and no records", () => {
    const report = checkSerializedGraph({
      formatVersion: 1,
      seed: 1,
      nodes: [{ id: "grid", type: "pointGrid", params: {} }],
      connections: [],
      outputs: [{ id: "grid", pin: "out", name: "points" }],
    });
    expect(report.graph).toBeDefined();
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("every load fault comes back as an error, with no graph, and nothing is thrown", () => {
    const doc = {
      formatVersion: 1,
      seed: 1,
      nodes: [
        { id: "a", type: "pointGridd", params: {} },
        { id: "b", type: "pointGrid", params: { cuont: 3 } },
      ],
      connections: [{ from: ["nope", "out"], to: ["b", "in"] }],
      outputs: [{ id: "b", pin: "out", name: "points" }],
    };
    const report = checkSerializedGraph(doc);
    expect(report.graph).toBeUndefined();
    expect(report.errors.map((e) => e.code)).toEqual(["unknown-node-type", "unknown-param", "unknown-node"]);
    for (const e of report.errors) {
      expect(e.severity).toBe("error");
      expect(e.path).toBeDefined();
      expect(resolvePointer(doc, e.path as string)).toBeDefined();
    }
    expect(report.errors[0]?.didYouMean).toContain("pointGrid");
    // Deterministic: the same document, the same report.
    expect(checkSerializedGraph(doc).errors).toEqual(report.errors);
  });

  it("non-objects and non-JSON values are records too", () => {
    for (const bad of [null, 3, "graph", [], { formatVersion: 99 }]) {
      const report = checkSerializedGraph(bad);
      expect(report.graph).toBeUndefined();
      expect(report.errors.length).toBeGreaterThan(0);
    }
  });

  it("a structural error keeps the graph and points at the node", () => {
    const doc = {
      formatVersion: 1,
      seed: 1,
      nodes: [
        { id: "grid", type: "pointGrid", params: {} },
        { id: "move", type: "transformPoints", params: {} },
      ],
      connections: [],
      outputs: [
        { id: "grid", pin: "out", name: "points" },
        { id: "move", pin: "out", name: "moved" },
      ],
    };
    const report = checkSerializedGraph(doc);
    expect(report.graph).toBeDefined();
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      code: "required-pin-unconnected",
      severity: "error",
      path: "/nodes/1",
      nodeId: "move",
      pin: "in",
    });
    expect(report.warnings).toEqual([]);
  });

  it("warnings are split from errors, with paths into nested inline bodies", () => {
    const doc = {
      formatVersion: 1,
      seed: 3,
      nodes: [
        { id: "grid", type: "pointGrid", params: {} },
        { id: "stray", type: "pointGrid", params: {} },
        {
          id: "wrap",
          type: "subgraph",
          params: {},
          subgraph: {
            graph: {
              formatVersion: 1,
              seed: 0,
              nodes: [
                { id: "a", type: "transformPoints", params: {} },
                { id: "inner/stray", type: "transformPoints", params: {} },
              ],
              connections: [],
              outputs: [],
            },
            inputs: [{ name: "in", node: "a", pin: "in" }],
            outputs: [{ name: "out", node: "a", pin: "out" }],
          },
        },
      ],
      connections: [{ from: ["grid", "out"], to: ["wrap", "in"] }],
      outputs: [{ id: "wrap", pin: "out", name: "out" }],
    };
    const report = checkSerializedGraph(doc);
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((w) => [w.code, w.path])).toEqual([
      ["node-unreachable", "/nodes/1"],
      ["node-unreachable", "/nodes/2/subgraph/graph/nodes/1"],
    ]);
    for (const w of report.warnings) expect(w.severity).toBe("warning");
  });

  it("a graph with no outputs is one warning pointing at the outputs section", () => {
    const report = checkSerializedGraph({
      formatVersion: 1,
      seed: 1,
      nodes: [],
      connections: [],
      outputs: [],
    });
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((w) => [w.code, w.path])).toEqual([["no-outputs", "/outputs"]]);
    const bare = checkSerializedGraph({ formatVersion: 1, seed: 1, nodes: [] });
    expect(bare.warnings.map((w) => [w.code, w.path])).toEqual([["no-outputs", ""]]);
  });

  it("every corpus graph checks clean: no errors, no warnings", () => {
    const graphs = loadGraphs(ROOT);
    expect(graphs.length).toBeGreaterThan(50);
    const dirty = graphs
      .map((g) => ({ file: g.file, report: checkSerializedGraph(g.json) }))
      .filter((r) => r.report.errors.length > 0 || r.report.warnings.length > 0)
      .map((r) => [r.file, [...r.report.errors, ...r.report.warnings].map((d) => d.code)]);
    expect(dirty).toEqual([]);
  });
});
