/**
 * `applyRules` as the rest of the library sees it: the pins a caller can
 * wire. The rule pairs are INTERIOR — fed and drained by the round loop —
 * so every view of the node (the pin description, the structural
 * diagnosis, the read-only graph picture, the JSON Schema) must show `in`
 * plus the broadcasts going in and `out`, `trail`, `rounds`, `converged` coming out,
 * and never a rule name.
 */
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { readGraph } from "../shared/graph/fromSerialized.js";
import { Graph, type NodeHandle, cook, defineNode, makeGeometryItem } from "../src/graph/index.js";
import { describeSubgraphPins } from "../src/graph/subgraph.js";
import { dataInput } from "../src/runtime/dataInput.js";
import { applyRulesNode } from "../src/nodes/applyRules.js";
import { type Json, cut, relabel as relabelJson, rulesBody, rulesDoc } from "../src/nodes/applyRules.testsupport.js";
import { diagnoseGraph } from "../src/nodes/diagnose.js";
import { graphJsonSchema } from "../src/nodes/graphSchema.js";
import { deserializeGraph, setAttribute } from "../src/nodes/index.js";
import { createPointCloud } from "../src/data/index.js";

const CORPUS = new URL("../graphs/basics-apply-rules.json", import.meta.url);

const HOUSE_CELLS = [
  { x0: 0, x1: 4, label: "facade" },
  { x0: 50, x1: 54, label: "facade" },
] as const;

/**
 * facade -> floor -> glass, as graph JSON. With `broadcast`, the body also
 * exposes an `occluder` input with no output: a pin-name fixture for the
 * read-only view, which reads names only and does not cook.
 */
function houseDoc(opts: { broadcast?: boolean } = {}): Json {
  const body = rulesBody(
    [
      { name: "facade", nodes: [cut("floors", ["floor", "floor"], "y")] },
      { name: "floor", nodes: [relabelJson("glaze", "glass")] },
    ],
    opts.broadcast === true
      ? { nodes: [relabelJson("occ", "o")], broadcasts: [{ name: "occluder", node: "occ", pin: "in" }] }
      : {},
  );
  return rulesDoc(HOUSE_CELLS, body);
}

/** Passes `in` through; reads `ref` only so a broadcast can reach a rule. */
const withRef = defineNode<Record<string, never>>({
  type: "__test_applyRulesInterfaceWithRef",
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "ref", kind: "geometry", multi: true, optional: true },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: {},
  execute({ inputs }) {
    return { out: (inputs.in ?? []).filter((i) => i.kind === "geometry") };
  },
});

const relabel = (g: Graph, id: string, label: string): NodeHandle =>
  g.add(setAttribute, { name: "piece", domain: "point", type: "string", stringValue: label } as const, id);

/** Two rules (facade, floor) and one broadcast (occluder), code-first. */
function rulesDef() {
  const inner = new Graph(5);
  const occ = relabel(inner, "occ", "o");
  const f = inner.add(withRef, {}, "f");
  const fr = relabel(inner, "fr", "floor");
  inner.connect(occ, "out", f, "ref");
  inner.connect(f, "out", fr, "in");
  const w = relabel(inner, "w", "done");
  return applyRulesNode(
    inner,
    [
      { name: "facade", node: f, pin: "in" },
      { name: "occluder", node: occ, pin: "in" },
      { name: "floor", node: w, pin: "in" },
    ],
    [
      { name: "facade", node: fr, pin: "out" },
      { name: "floor", node: w, pin: "out" },
    ],
  );
}

describe("applyRules: the pins it describes", () => {
  it("describeSubgraphPins lists in + broadcasts, and out / trail / rounds / converged; no rule pair", () => {
    const pins = describeSubgraphPins(rulesDef());
    expect(pins).toBeDefined();
    expect(pins?.inputs.map((p) => p.name)).toEqual(["in", "occluder"]);
    expect(pins?.outputs.map((p) => p.name)).toEqual(["out", "trail", "rounds", "converged"]);
    expect(pins?.inputs.find((p) => p.name === "in")).toMatchObject({ kind: "geometry", synthesized: true });
    // The broadcast is the body's own pin, resolved through the inner node.
    expect(pins?.inputs.find((p) => p.name === "occluder")).toMatchObject({ kind: "geometry" });
    expect(pins?.inputs.find((p) => p.name === "occluder")?.synthesized).toBeUndefined();
    expect(pins?.outputs.find((p) => p.name === "rounds")).toMatchObject({ kind: "value", synthesized: true });
    for (const side of [pins?.inputs, pins?.outputs]) {
      for (const rule of ["facade", "floor"]) expect(side?.some((p) => p.name === rule)).toBe(false);
    }
  });

  it("the def's own pins agree", () => {
    const def = rulesDef();
    expect(def.inputs.map((p) => p.name)).toEqual(["in", "occluder"]);
    expect(def.outputs.map((p) => p.name)).toEqual(["out", "trail", "rounds", "converged"]);
  });
});

describe("applyRules: diagnoseGraph", () => {
  const outer = (wireIn: boolean): Graph => {
    const g = new Graph(7);
    const n = g.add(rulesDef(), {}, "rules");
    if (wireIn) {
      const geo = createPointCloud(1);
      geo.attrs.point.add("piece", "string", 1).setString(0, "facade");
      const src = g.add(dataInput, { items: [makeGeometryItem(geo)] }, "src");
      g.connect(src, "out", n, "in");
      g.connect(src, "out", n, "occluder");
    }
    g.output(n, "out", "out");
    return g;
  };

  it("reports an unconnected `in` as a starved required pin, naming the node", () => {
    const records = diagnoseGraph(outer(false));
    const open = records.filter((r) => r.code === "required-pin-unconnected");
    // `in`, and the broadcast, which inherits "required" from the inner pin
    // it maps to (setAttribute's `in`) as any wrapper's exposed pin does.
    expect(open.map((r) => (r as { pin?: string }).pin).sort()).toEqual(["in", "occluder"]);
    const rec = open.find((r) => (r as { pin?: string }).pin === "in");
    expect(rec).toMatchObject({ severity: "error", nodeId: "rules", pin: "in" });
    expect(rec?.message).toContain('node "rules" (applyRules)');
    expect(rec?.message).toContain('input pin "in"');
    // No rule pair is ever reported as a pin to wire.
    for (const r of records) {
      expect((r as { pin?: string }).pin === "facade" || (r as { pin?: string }).pin === "floor").toBe(false);
    }
  });

  it("is clean once `in` and the broadcast are wired: the rule pins are never findings", async () => {
    const g = outer(true);
    expect(diagnoseGraph(g)).toEqual([]);
    // And it cooks: the clean verdict is about a graph that runs.
    const r = await cook(g);
    expect(r.outputs.out).toHaveLength(1);
  });
});

describe("applyRules: readGraph (the read-only graph view)", () => {
  it("draws in + broadcasts going in and out / trail / rounds / converged coming out", () => {
    const doc = houseDoc({ broadcast: true });
    const picture = readGraph(doc as never);
    const node = picture.nodes.find((n) => n.id === "rules");
    expect(node).toBeDefined();
    expect(node?.inputs.map((p) => p.name)).toEqual(["in", "occluder"]);
    expect(node?.outputs.map((p) => p.name)).toEqual(["out", "trail", "rounds", "converged"]);
  });

  it("does the same for the corpus graph, whose six rules are all interior", () => {
    const doc = JSON.parse(readFileSync(CORPUS, "utf8")) as Json;
    const node = readGraph(doc as never).nodes.find((n) => n.id === "grammar");
    expect(node?.inputs.map((p) => p.name)).toEqual(["in"]);
    expect(node?.outputs.map((p) => p.name)).toEqual(["out", "trail", "rounds", "converged"]);
  });
});

describe("applyRules: graphJsonSchema", () => {
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true, logger: false });
  const validate = ajv.compile(graphJsonSchema());

  it("accepts the corpus graph, and the loader does too", () => {
    const doc = JSON.parse(readFileSync(CORPUS, "utf8")) as Json;
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
    expect(() => deserializeGraph(doc)).not.toThrow();
  });

  it("accepts a fixture doc the loader accepts", () => {
    const doc = houseDoc();
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
    expect(() => deserializeGraph(doc)).not.toThrow();
    expect(HOUSE_CELLS).toHaveLength(2);
  });

  it("rejects an applyRules node with a ref, as the loader does", () => {
    const doc = houseDoc();
    const node = (doc.nodes as Json[]).find((n) => n.id === "rules") as Json;
    delete node.subgraph;
    node.ref = { name: "someRecipe" };
    expect(validate(doc)).toBe(false);
    expect(() => deserializeGraph(doc)).toThrow(/wrapper|ref/);
  });

  it("rejects an applyRules node with neither ref nor subgraph", () => {
    const doc = houseDoc();
    const node = (doc.nodes as Json[]).find((n) => n.id === "rules") as Json;
    delete node.subgraph;
    expect(validate(doc)).toBe(false);
    expect(() => deserializeGraph(doc)).toThrow();
  });
});

describe("applyRules nested inside another wrapper", () => {
  it("describeSubgraphPins resolves an exposed pin onto applyRules' own in / out / rounds", () => {
    const ruleBody = rulesBody([{ name: "A", nodes: [cut("s", ["end", "end"])] }]);
    const doc: Json = {
      formatVersion: 1,
      seed: 1,
      nodes: [
        {
          id: "wrap",
          type: "subgraph",
          params: {},
          subgraph: {
            graph: {
              formatVersion: 1,
              seed: 0,
              nodes: [{ id: "g", type: "applyRules", params: {}, subgraph: ruleBody }],
              connections: [],
              outputs: [],
            },
            inputs: [{ name: "cells", node: "g", pin: "in" }],
            outputs: [
              { name: "result", node: "g", pin: "out" },
              { name: "n", node: "g", pin: "rounds" },
            ],
          },
        },
      ],
      connections: [],
      outputs: [],
    };
    const g = deserializeGraph(doc);
    const pins = describeSubgraphPins(g.require("wrap").def);
    expect(pins?.inputs).toEqual([{ name: "cells", kind: "geometry" }]);
    expect(pins?.outputs).toEqual([
      { name: "result", kind: "geometry" },
      { name: "n", kind: "value" },
    ]);
  });
});
