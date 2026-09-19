/**
 * Assigning to a read-only property of a `Graph` is refused with the write
 * route named, rather than with the engine's bare `TypeError`.
 *
 * The test for the table being exhaustive is the load-bearing one: it
 * walks the prototype rather than a list written here, so a read-only
 * property added later fails this suite instead of silently keeping the
 * bare failure.
 */
import { describe, expect, it } from "vitest";

import { diagnosticsOf } from "../diagnostics/index.js";
import { GraphValidationError } from "./errors.js";
import { Graph } from "./graph.js";

/** Every accessor on `Graph.prototype`, public ones only. */
function accessorNames(): string[] {
  return Object.entries(Object.getOwnPropertyDescriptors(Graph.prototype))
    .filter(([name, d]) => typeof d.get === "function" && !name.startsWith("_"))
    .map(([name]) => name)
    .sort();
}

describe("assigning to Graph.seed", () => {
  it("throws a GraphValidationError naming setSeed and the caller's own value", () => {
    const graph = new Graph(1);
    let thrown: unknown;
    try {
      // The assignment 58 of 108 fresh agent sessions either made or coded
      // around. Cast because TypeScript refuses it outright, which is the
      // half of the guard that already worked.
      (graph as unknown as { seed: number }).seed = 7;
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GraphValidationError);
    const message = (thrown as Error).message;
    expect(message).toContain("Graph.seed is read-only");
    expect(message).toContain("graph.setSeed(7)");
    expect(message).toContain("marks every node dirty");
  });

  it("carries a read-only-property diagnostic with the route as data", () => {
    const graph = new Graph(1);
    let thrown: unknown;
    try {
      (graph as unknown as { seed: number }).seed = 7;
    } catch (err) {
      thrown = err;
    }
    const [record] = diagnosticsOf(thrown);
    expect(record?.code).toBe("read-only-property");
    expect(record?.severity).toBe("error");
    expect(record?.key).toBe("seed");
    expect(record?.got).toBe(7);
    expect(record?.valid).toEqual(["setSeed"]);
    expect(record?.didYouMean).toEqual(["setSeed"]);
    expect(record?.fix).toBe("call graph.setSeed(7)");
  });

  it("leaves the seed and the version untouched — it refuses, it does not half-apply", () => {
    const graph = new Graph(1);
    const version = graph.version;
    expect(() => {
      (graph as unknown as { seed: number }).seed = 7;
    }).toThrow();
    expect(graph.seed).toBe(1);
    expect(graph.version).toBe(version);
  });

  it("still reads, and setSeed still writes", () => {
    const graph = new Graph(1);
    expect(graph.seed).toBe(1);
    graph.setSeed(7);
    expect(graph.seed).toBe(7);
  });

  it("names a value a literal cannot carry by the property, not by a quote", () => {
    const graph = new Graph(1);
    let thrown: unknown;
    try {
      (graph as unknown as { seed: unknown }).seed = { from: "node" };
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error).message).toContain("graph.setSeed(seed)");
    expect(diagnosticsOf(thrown)[0]?.got).toBeUndefined();
  });
});

describe("the other read-only properties of a Graph", () => {
  it("names setMeta and setGraphParams as their routes", () => {
    const graph = new Graph(1);
    expect(() => {
      (graph as unknown as { meta: unknown }).meta = { title: "x" };
    }).toThrow(/Graph\.meta is read-only.*graph\.setMeta\(meta\)/s);
    expect(() => {
      (graph as unknown as { graphParams: unknown }).graphParams = [];
    }).toThrow(/graph\.setGraphParams\(graphParams\)/);
  });

  it("says of version that it is derived, and offers no route to fake", () => {
    const graph = new Graph(1);
    let thrown: unknown;
    try {
      (graph as unknown as { version: number }).version = 0;
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error).message).toContain("read-only and derived");
    expect((thrown as Error).message).toContain("bumps on its own");
    const [record] = diagnosticsOf(thrown);
    expect(record?.code).toBe("read-only-property");
    expect(record?.fix).toBeUndefined();
    expect(record?.valid).toBeUndefined();
  });

  it("guards EVERY accessor on the prototype, so a new one cannot be forgotten", () => {
    const unguarded = accessorNames().filter(
      (name) => Object.getOwnPropertyDescriptor(Graph.prototype, name)?.set === undefined,
    );
    expect(
      unguarded,
      "these read-only properties still fail with the engine's bare TypeError; " +
        "add each to GRAPH_WRITE_ROUTES and GRAPH_READ_ONLY_DETAIL in graph.ts",
    ).toEqual([]);
  });
});
