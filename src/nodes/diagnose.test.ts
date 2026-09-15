/**
 * `diagnoseGraph`: the structural faults of a live graph, as records.
 *
 * Unit cases for each code, the order the records come in, and two gates:
 * every graph in the corpus and every registered primitive's body comes out
 * clean. The corpus gate is what lets the checks start strict — a finding
 * there is a real graph a cook would run, not a hypothetical one.
 */
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { loadGraphs } from "../docs/graphIndex.js";
import { cook } from "../graph/execute.js";
import { Graph } from "../graph/graph.js";
import { getSubgraphSpec, subgraphNode } from "../graph/subgraph.js";
import { diagnoseGraph } from "./diagnose.js";
import { forEachNode } from "./forEach.js";
import {
  copyToPoints,
  listSubgraphs,
  registerSubgraph,
  mergePoints,
  pointGrid,
  transformPoints,
} from "./index.js";
import { deserializeGraph } from "./serialize.js";
import { subgraphRefOf } from "./subgraphRefs.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Names this suite registers, kept out of the primitives gate. */
const TEST_PREFIX = "__test_diagnose/";

describe("diagnoseGraph — the codes", () => {
  it("a clean graph gives no records", () => {
    const g = new Graph();
    const grid = g.add(pointGrid, {}, "grid");
    const t = g.add(transformPoints, {}, "t");
    g.connect(grid, "out", t, "in");
    g.output(t, "out", "out");
    expect(diagnoseGraph(g)).toEqual([]);
  });

  it("an unconnected required pin on a reachable node is an error naming node and pin", () => {
    const g = new Graph();
    const t = g.add(transformPoints, {}, "t");
    g.output(t, "out", "out");
    const records = diagnoseGraph(g);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      code: "required-pin-unconnected",
      severity: "error",
      nodeId: "t",
      nodePath: ["t"],
      pin: "in",
    });
    expect(records[0]?.message).toContain('node "t" (transformPoints)');
    expect(records[0]?.message).toContain('"in"');
    expect(records[0]?.fix).toBe(`connect a node's geometry output to input pin "in" of node "t"`);
  });

  it("an optional pin left open is not a finding", () => {
    const g = new Graph();
    const m = g.add(mergePoints, {}, "m");
    g.output(m, "out", "out");
    expect(diagnoseGraph(g)).toEqual([]);
  });

  it("an unreachable node is a warning, and its open pins are not additionally errors", () => {
    const g = new Graph();
    const grid = g.add(pointGrid, {}, "grid");
    g.add(transformPoints, {}, "stray");
    g.output(grid, "out", "out");
    expect(diagnoseGraph(g)).toEqual([
      expect.objectContaining({
        code: "node-unreachable",
        severity: "warning",
        nodeId: "stray",
        nodePath: ["stray"],
      }),
    ]);
  });

  it("a graph with no outputs gives exactly one warning, not one per node", () => {
    const g = new Graph();
    const grid = g.add(pointGrid, {}, "grid");
    const t = g.add(transformPoints, {}, "t");
    g.connect(grid, "out", t, "in");
    g.add(transformPoints, {}, "open");
    const records = diagnoseGraph(g);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ code: "no-outputs", severity: "warning" });
    expect(records[0]?.nodeId).toBeUndefined();
  });

  it("an inline body's fault carries the wrapper chain in nodePath; a portal satisfies its pin", () => {
    const inner = new Graph();
    const fed = inner.add(transformPoints, {}, "fed");
    const open = inner.add(transformPoints, {}, "open");
    const merge = inner.add(mergePoints, {}, "merge");
    inner.connect(fed, "out", merge, "in");
    inner.connect(open, "out", merge, "in");
    const def = subgraphNode(inner, [{ name: "shape", node: fed, pin: "in" }], [
      { name: "out", node: merge, pin: "out" },
    ]);
    const g = new Graph();
    const grid = g.add(pointGrid, {}, "grid");
    const sg = g.add(def, undefined, "sg");
    g.connect(grid, "out", sg, "shape");
    g.output(sg, "out", "out");
    expect(diagnoseGraph(g)).toEqual([
      expect.objectContaining({
        code: "required-pin-unconnected",
        nodeId: "open",
        nodePath: ["sg", "open"],
        pin: "in",
      }),
    ]);
    expect(diagnoseGraph(g)[0]?.message).toContain('node "open" (transformPoints) in the body of "sg"');
  });

  it("the wrapper's own exposed pin is the OUTER graph's finding", () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    const def = subgraphNode(inner, [{ name: "shape", node: t, pin: "in" }], [
      { name: "out", node: t, pin: "out" },
    ]);
    const g = new Graph();
    const sg = g.add(def, undefined, "sg");
    g.output(sg, "out", "out");
    expect(diagnoseGraph(g)).toEqual([
      expect.objectContaining({ code: "required-pin-unconnected", nodeId: "sg", nodePath: ["sg"], pin: "shape" }),
    ]);
  });

  it("a required pin fed only by a forEach that iterates nothing is an error, and says why", () => {
    const loopBody = new Graph();
    const lt = loopBody.add(transformPoints, {}, "lt");
    const loop = forEachNode(loopBody, [{ name: "each", node: lt, pin: "in" }], [
      { name: "out", node: lt, pin: "out" },
    ]);
    const g = new Graph();
    const fe = g.add(loop, undefined, "fe");
    const after = g.add(transformPoints, {}, "after");
    g.connect(fe, "out", after, "in");
    g.output(after, "out", "out");
    const records = diagnoseGraph(g);
    expect(records).toEqual([
      expect.objectContaining({ code: "required-pin-unconnected", nodeId: "after", pin: "in" }),
    ]);
    expect(records[0]?.message).toContain('fed only by "fe", which delivers an empty collection');

    // Feeding the loop clears it; the loop's own iterated pin is optional.
    const grid = g.add(pointGrid, {}, "grid");
    g.connect(grid, "out", fe, "each");
    expect(diagnoseGraph(g)).toEqual([]);
  });

  /** A forEach over `transformPoints`, optionally with a required broadcast pin. */
  function transformLoop(broadcast: boolean) {
    const body = new Graph();
    const lt = body.add(transformPoints, {}, "lt");
    if (!broadcast) {
      return forEachNode(body, [{ name: "each", node: lt, pin: "in" }], [
        { name: "out", node: lt, pin: "out" },
      ]);
    }
    const copy = body.add(copyToPoints, {}, "copy");
    body.connect(lt, "out", copy, "target");
    return forEachNode(
      body,
      [
        { name: "each", node: lt, pin: "in" },
        { name: "shape", node: copy, pin: "source" },
      ],
      [{ name: "out", node: copy, pin: "out" }],
    );
  }

  it("emptiness passes through a subgraph wrapping a forEach", async () => {
    // P = subgraph { forEach(each <- items) -> out }: open, it delivers [].
    const pBody = new Graph();
    const fe = pBody.add(transformLoop(false), undefined, "fe");
    const pDef = subgraphNode(pBody, [{ name: "items", node: fe, pin: "each" }], [
      { name: "out", node: fe, pin: "out" },
    ]);
    const g = new Graph();
    const p = g.add(pDef, undefined, "p");
    const after = g.add(transformPoints, {}, "after");
    g.connect(p, "out", after, "in");
    g.output(after, "out", "out");
    expect(diagnoseGraph(g).map((d) => [d.code, d.nodeId, d.pin])).toEqual([
      ["required-pin-unconnected", "after", "in"],
    ]);
    await expect(cook(g)).rejects.toThrow('"in"');
  });

  it("a wrapper's open pins are judged together: an open iterated pin excuses an open broadcast pin", async () => {
    // s = subgraph exposing a forEach's `each` and its required broadcast
    // `shape`. Alone, `shape` is required; with `each` open too, the loop
    // runs zero times and nothing throws.
    const body = new Graph();
    const fe = body.add(transformLoop(true), undefined, "fe");
    const def = subgraphNode(
      body,
      [
        { name: "each", node: fe, pin: "each" },
        { name: "shape", node: fe, pin: "shape" },
      ],
      [{ name: "out", node: fe, pin: "out" }],
    );
    expect(def.inputs.map((p) => [p.name, p.optional === true])).toEqual([
      ["each", true],
      ["shape", false],
    ]);
    const g = new Graph();
    const s = g.add(def, undefined, "s");
    g.output(s, "out", "out");
    expect(diagnoseGraph(g)).toEqual([]);
    await expect(cook(g)).resolves.toBeDefined();

    const grid = g.add(pointGrid, { countX: 2, countZ: 1 }, "grid");
    g.connect(grid, "out", s, "each");
    expect(diagnoseGraph(g).map((d) => [d.code, d.nodeId, d.pin])).toEqual([
      ["required-pin-unconnected", "s", "shape"],
    ]);
    await expect(cook(g)).rejects.toThrow();
  });

  it("names a pin hidden behind another open pin in the same pass", async () => {
    // each -> loop with required broadcast `shape` -> transform. With `each`
    // open the transform starves; connect only `each` and `shape` throws.
    const body = new Graph();
    const fe = body.add(transformLoop(true), undefined, "fe");
    const after = body.add(transformPoints, {}, "after");
    body.connect(fe, "out", after, "in");
    const def = subgraphNode(
      body,
      [
        { name: "each", node: fe, pin: "each" },
        { name: "shape", node: fe, pin: "shape" },
      ],
      [{ name: "out", node: after, pin: "out" }],
    );
    const g = new Graph();
    const s = g.add(def, undefined, "s");
    g.output(s, "out", "out");
    expect(diagnoseGraph(g).map((d) => d.pin)).toEqual(["each", "shape"]);
    await expect(cook(g)).rejects.toThrow();
    const grid = g.add(pointGrid, { countX: 2, countZ: 1 }, "grid");
    const grid2 = g.add(pointGrid, { countX: 2, countZ: 1 }, "grid2");
    g.connect(grid, "out", s, "each");
    g.connect(grid2, "out", s, "shape");
    expect(diagnoseGraph(g)).toEqual([]);
    await expect(cook(g)).resolves.toBeDefined();
  });

  it("two pins optional alone: the smallest fix is named, and why it matters", async () => {
    // Two exposed inputs into one loop's iterated (multi) pin, then a
    // required transform: either feed alone is enough, neither open is not.
    // Connecting "a" is the smallest complete fix, so "a" alone is named.
    const body = new Graph();
    const fe = body.add(transformLoop(false), undefined, "fe");
    const after = body.add(transformPoints, {}, "after");
    body.connect(fe, "out", after, "in");
    const def = subgraphNode(
      body,
      [
        { name: "a", node: fe, pin: "each" },
        { name: "b", node: fe, pin: "each" },
      ],
      [{ name: "out", node: after, pin: "out" }],
    );
    expect(def.inputs.every((p) => p.optional === true)).toBe(true);
    const g = new Graph();
    const s = g.add(def, undefined, "s");
    g.output(s, "out", "out");
    const records = diagnoseGraph(g);
    expect(records.map((d) => [d.code, d.nodeId, d.pin])).toEqual([
      ["required-pin-unconnected", "s", "a"],
    ]);
    expect(records[0]?.message).toContain(
      "the pin is optional alone, but with the other open pins it is part of the smallest set",
    );
    await expect(cook(g)).rejects.toThrow();

    const grid = g.add(pointGrid, { countX: 2, countZ: 1 }, "grid");
    g.connect(grid, "out", s, "b");
    expect(diagnoseGraph(g)).toEqual([]);
  });

  it("blames only open pins that can reach the fault", async () => {
    // Loop F: each -> lt; its output comes from a nested loop over broadcast
    // `shape`. Either `a` (F.each) or `b` (F.shape) open alone empties F, so
    // neither is needed alone; `c` feeds a merge downstream of the fault and
    // plays no part.
    const nestedBody = new Graph();
    const nt = nestedBody.add(transformPoints, {}, "nt");
    const nested = forEachNode(nestedBody, [{ name: "each", node: nt, pin: "in" }], [
      { name: "out", node: nt, pin: "out" },
    ]);
    const fBody = new Graph();
    const lt = fBody.add(transformPoints, {}, "lt");
    const inner = fBody.add(nested, undefined, "inner");
    const fm = fBody.add(mergePoints, {}, "fm");
    fBody.connect(lt, "out", fm, "in");
    fBody.connect(inner, "out", fm, "in");
    const f = forEachNode(
      fBody,
      [
        { name: "each", node: lt, pin: "in" },
        { name: "shape", node: inner, pin: "each" },
      ],
      [{ name: "out", node: inner, pin: "out" }],
    );
    const wBody = new Graph();
    const fe = wBody.add(f, undefined, "fe");
    const after = wBody.add(transformPoints, {}, "after");
    const merge = wBody.add(mergePoints, {}, "merge");
    wBody.connect(fe, "out", after, "in");
    wBody.connect(after, "out", merge, "in");
    const w = subgraphNode(
      wBody,
      [
        { name: "a", node: fe, pin: "each" },
        { name: "b", node: fe, pin: "shape" },
        { name: "c", node: merge, pin: "in" },
      ],
      [{ name: "out", node: merge, pin: "out" }],
    );
    const g = new Graph();
    const node = g.add(w, undefined, "w");
    g.output(node, "out", "out");
    expect(diagnoseGraph(g).map((d) => d.pin)).toEqual(["a", "b"]);
    await expect(cook(g)).rejects.toThrow();

    // A second, separate fault on another open pin does not hide the first:
    // `d` starves its own transform, and `a`/`b` are still named.
    const w2Body = new Graph();
    const fe2 = w2Body.add(f, undefined, "fe");
    const after2 = w2Body.add(transformPoints, {}, "after");
    const other = w2Body.add(transformPoints, {}, "other");
    const merge2 = w2Body.add(mergePoints, {}, "merge");
    w2Body.connect(fe2, "out", after2, "in");
    w2Body.connect(after2, "out", merge2, "in");
    w2Body.connect(other, "out", merge2, "in");
    const w2 = subgraphNode(
      w2Body,
      [
        { name: "a", node: fe2, pin: "each" },
        { name: "b", node: fe2, pin: "shape" },
        { name: "d", node: other, pin: "in" },
      ],
      [{ name: "out", node: merge2, pin: "out" }],
    );
    const g2 = new Graph();
    const n2 = g2.add(w2, undefined, "w");
    g2.output(n2, "out", "out");
    expect(diagnoseGraph(g2).map((d) => d.pin)).toEqual(["a", "b", "d"]);
  });

  it("a forEach that runs zero iterations is excused its broadcast pins and its body", async () => {
    const g = new Graph();
    const fe = g.add(transformLoop(true), undefined, "fe");
    g.output(fe, "out", "out");
    expect(diagnoseGraph(g)).toEqual([]);
    await expect(cook(g)).resolves.toBeDefined();

    // Fed, the loop runs and its open broadcast pin is a real fault.
    const grid = g.add(pointGrid, { countX: 2, countZ: 1 }, "grid");
    g.connect(grid, "out", fe, "each");
    expect(diagnoseGraph(g).map((d) => [d.code, d.nodeId, d.pin])).toEqual([
      ["required-pin-unconnected", "fe", "shape"],
    ]);
    await expect(cook(g)).rejects.toThrow();
  });

  it("an unreachable wrapper's body is not walked", () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    inner.add(transformPoints, {}, "innerStray");
    const def = forEachNode(inner, [{ name: "each", node: t, pin: "in" }], [
      { name: "out", node: t, pin: "out" },
    ]);
    const g = new Graph();
    const grid = g.add(pointGrid, {}, "grid");
    g.add(def, undefined, "loop");
    g.output(grid, "out", "out");
    expect(diagnoseGraph(g).map((d) => [d.code, d.nodePath])).toEqual([
      ["node-unreachable", ["loop"]],
    ]);
  });

  it("an inline body in JSON is walked and a ref body is not", () => {
    const json = {
      formatVersion: 1,
      seed: 3,
      nodes: [
        { id: "grid", type: "pointGrid", params: {} },
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
                { id: "stray", type: "transformPoints", params: {} },
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
    const g = deserializeGraph(json);
    expect(diagnoseGraph(g).map((d) => [d.code, d.nodePath])).toEqual([
      ["node-unreachable", ["wrap", "stray"]],
    ]);

    // The SAME body registered and reached by reference is a recipe, held by
    // the primitives gate: not walked, so the stray inside it is silent.
    const body = new Graph();
    const a = body.add(transformPoints, {}, "a");
    body.add(transformPoints, {}, "stray");
    registerSubgraph(`${TEST_PREFIX}stray-body`, {
      graph: body,
      inputs: [{ name: "in", node: a, pin: "in" }],
      outputs: [{ name: "out", node: a, pin: "out" }],
    });
    const byRef = deserializeGraph({
      ...json,
      nodes: [json.nodes[0], { id: "wrap", type: "subgraph", params: {}, ref: { name: `${TEST_PREFIX}stray-body` } }],
    });
    expect(getSubgraphSpec(byRef.require("wrap").def)).toBeDefined();
    expect(diagnoseGraph(byRef)).toEqual([]);
  });

  it("a stranded graph-param value folds in as a warning", () => {
    const json = {
      formatVersion: 1,
      seed: 3,
      params: [{ name: "offset", value: [0.42513370123, 0, 0] }],
      nodes: [
        { id: "grid", type: "pointGrid", params: {} },
        {
          id: "wrap",
          type: "subgraph",
          params: {},
          subgraph: {
            graph: {
              formatVersion: 1,
              seed: 0,
              nodes: [{ id: "move", type: "transformPoints", params: { translate: [0.42513370123, 0, 0] } }],
              connections: [],
              outputs: [],
            },
            inputs: [{ name: "in", node: "move", pin: "in" }],
            outputs: [{ name: "out", node: "move", pin: "out" }],
          },
        },
      ],
      connections: [{ from: ["grid", "out"], to: ["wrap", "in"] }],
      outputs: [{ id: "wrap", pin: "out", name: "out" }],
    };
    const records = diagnoseGraph(deserializeGraph(json));
    expect(records).toEqual([
      expect.objectContaining({
        code: "stranded-graph-param-value",
        severity: "warning",
        nodeId: "move",
        nodePath: ["wrap", "move"],
        param: "translate",
        got: [0.42513370123, 0, 0],
      }),
    ]);
    expect(records[0]?.message).toContain('graph param "offset"');
  });
});

describe("diagnoseGraph — order", () => {
  /** Faults at two levels, several nodes and two pins on one node. */
  function faulty(): Graph {
    const inner = new Graph();
    const fed = inner.add(transformPoints, {}, "fed");
    const innerOpen = inner.add(copyToPoints, {}, "innerOpen");
    const merge = inner.add(mergePoints, {}, "merge");
    inner.connect(fed, "out", merge, "in");
    inner.connect(innerOpen, "out", merge, "in");
    inner.add(transformPoints, {}, "innerStray");
    const def = subgraphNode(inner, [{ name: "shape", node: fed, pin: "in" }], [
      { name: "out", node: merge, pin: "out" },
    ]);
    const g = new Graph();
    const copy = g.add(copyToPoints, {}, "copy");
    const sg = g.add(def, undefined, "sg");
    const m = g.add(mergePoints, {}, "m");
    g.add(transformPoints, {}, "stray");
    g.connect(copy, "out", m, "in");
    g.connect(sg, "out", m, "in");
    g.output(m, "out", "out");
    return g;
  }

  it("outer before inner, nodes in insertion order, pins in declaration order", () => {
    expect(diagnoseGraph(faulty()).map((d) => [d.code, d.nodePath?.join("/"), d.pin])).toEqual([
      ["required-pin-unconnected", "copy", "source"],
      ["required-pin-unconnected", "copy", "target"],
      ["required-pin-unconnected", "sg", "shape"],
      ["node-unreachable", "stray", undefined],
      ["required-pin-unconnected", "sg/innerOpen", "source"],
      ["required-pin-unconnected", "sg/innerOpen", "target"],
      ["node-unreachable", "sg/innerStray", undefined],
    ]);
  });

  it("is deterministic: two graphs built alike and two calls on one graph agree", () => {
    const g = faulty();
    const first = diagnoseGraph(g);
    expect(diagnoseGraph(g)).toEqual(first);
    expect(diagnoseGraph(faulty())).toEqual(first);
  });
});

describe("diagnoseGraph — gates", () => {
  it("every graph in the corpus is clean: zero errors and zero warnings", () => {
    const corpus = loadGraphs(ROOT);
    // Guard the sweep: an empty corpus passes every assertion below.
    expect(corpus.length).toBeGreaterThanOrEqual(95);
    const findings: string[] = [];
    let inlineBodies = 0;
    for (const entry of corpus) {
      const graph = deserializeGraph(entry.json);
      for (const state of graph._nodes.values()) {
        if (getSubgraphSpec(state.def) !== undefined && subgraphRefOf(state.def) === undefined) inlineBodies++;
      }
      for (const d of diagnoseGraph(graph)) findings.push(`${entry.file}: ${d.code}: ${d.message}`);
    }
    expect(findings).toEqual([]);
    expect(inlineBodies).toBeGreaterThan(0);
  });

  it("every registered primitive's body is clean", () => {
    const primitives = listSubgraphs().filter((e) => !e.name.startsWith(TEST_PREFIX));
    expect(primitives.length).toBeGreaterThanOrEqual(37);
    const findings: string[] = [];
    for (const entry of primitives) {
      const loaded = deserializeGraph({
        formatVersion: 1,
        seed: 0,
        nodes: [{ id: "p", type: "subgraph", params: {}, ref: { name: entry.name } }],
        connections: [],
        outputs: [],
      });
      const spec = getSubgraphSpec(loaded.require("p").def);
      if (spec === undefined) throw new Error(`primitive "${entry.name}" loaded without a spec`);
      // The body as a wrapper cooks it: portals feed the exposed inputs and
      // the `__out_*` plumbing outputs are its outputs.
      for (const d of diagnoseGraph(spec.graph)) findings.push(`${entry.name}: ${d.code}: ${d.message}`);
    }
    expect(findings).toEqual([]);
  });
});
