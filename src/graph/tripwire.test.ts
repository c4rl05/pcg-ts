/**
 * The tripwire, proved against planted mutations.
 *
 * A guard nobody has seen fail is not a guard, so every kind of
 * after-the-fact write this could ever see is planted here on purpose and
 * the suite asserts not only that it fires but that it names the node
 * whose output was corrupted, the output, the domain, the attribute and
 * the element. Five shapes, each a different route to the same damage:
 *
 *   1. a write into an INPUT's column — the classic missing clone;
 *   2. a write into a node's own cached output, through a reference the
 *      offender kept from an earlier cook;
 *   3. a topology array written in place;
 *   4. a module-level buffer that two nodes' geometry both point at,
 *      rewritten by the later one;
 *   5. a string table mutated, with the index column left alone.
 *
 * (5) is the one that pins the string half: the indices still spell a
 * valid row, so nothing about the bytes of the column moved and only the
 * table says what index 0 means.
 *
 * The second half of the file is the plumbing: nested cooks, the sweep
 * modes, and that an unarmed cook records nothing at all.
 */
import { describe, expect, it } from "vitest";

import { createPointCloud, Geometry } from "../data/index.js";
import { cloneGeometry } from "./clone.js";
import { makeGeometryItem, makeValueItem, type DataItem } from "./data.js";
import { cook } from "./execute.js";
import { Graph, type NodeHandle } from "./graph.js";
import { defineNode, type NodeDef } from "./node.js";
import { subgraphNode } from "./subgraph.js";
import { TripwireError, resolveTripwire } from "./tripwire.js";
import { makePointsNode } from "./testNodes.js";

/** A source of `count` points with P = (i, 0, 0). */
function sourceNode(type = "src", count = 8): NodeDef<Record<string, never>> {
  return defineNode<Record<string, never>>({
    type,
    inputs: [],
    outputs: [{ name: "out", kind: "geometry" }],
    defaultParams: {},
    execute() {
      const geo = createPointCloud(count);
      const P = geo.attrs.point.require("P");
      for (let i = 0; i < count; i++) P.data[i * 3] = i;
      return { out: [makeGeometryItem(geo)] };
    },
  });
}

/** A well-behaved consumer: clones, then writes. */
function politeNode(): NodeDef<Record<string, never>> {
  return defineNode<Record<string, never>>({
    type: "polite",
    inputs: [{ name: "in", kind: "geometry" }],
    outputs: [{ name: "out", kind: "geometry" }],
    defaultParams: {},
    execute({ inputs }) {
      const out: DataItem[] = [];
      for (const item of inputs.in) {
        if (item.kind !== "geometry") continue;
        const geo = cloneGeometry(item.geo);
        geo.attrs.point.require("P").data[1] = 99;
        out.push(makeGeometryItem(geo));
      }
      return { out };
    },
  });
}

/** Cook armed, and hand back the failure. Fails the test if none came. */
async function expectTripped(g: Graph, mode: boolean | "cook" | "node" = true): Promise<TripwireError> {
  try {
    await cook(g, { tripwire: mode });
  } catch (err) {
    if (err instanceof TripwireError) return err;
    throw err;
  }
  throw new Error("the tripwire did not fire");
}

/** The graph every planted mutation runs in: src -> victim's reader. */
async function cookWith(
  offender: NodeDef<Record<string, never>>,
  mode: "cook" | "node" = "cook",
): Promise<TripwireError> {
  const g = new Graph(7);
  const src = g.add(sourceNode(), undefined, "src");
  const bad = g.add(offender, undefined, "bad");
  g.connect(src, "out", bad, "in");
  g.output(bad, "out", "main");
  g.output(src, "out", "raw");
  try {
    await cook(g, { tripwire: mode });
  } catch (err) {
    if (err instanceof TripwireError) return err;
    throw err;
  }
  throw new Error("the tripwire did not fire");
}

describe("the tripwire catches a planted mutation", () => {
  it("1. a write into an input's column: names the upstream node, the domain and the point", async () => {
    const offender = defineNode<Record<string, never>>({
      type: "writesItsInput",
      inputs: [{ name: "in", kind: "geometry" }],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute({ inputs }) {
        const item = inputs.in[0]!;
        if (item.kind !== "geometry") throw new Error("no geometry");
        // The missing clone.
        item.geo.attrs.point.require("P").data[3 * 5 + 2] = -1;
        return { out: [makeGeometryItem(cloneGeometry(item.geo))] };
      },
    });
    const err = await cookWith(offender);
    expect(err.violations).toHaveLength(1);
    const v = err.violations[0]!;
    expect(v.node).toBe("src");
    expect(v.type).toBe("src");
    expect(v.at).toContain('output "out"');
    expect(v.at).toContain("item 0");
    expect(v.at).toContain('point attribute "P"');
    expect(v.detail).toContain("point 5, component 2");
    expect(v.detail).toContain("now -1");
    expect(err.message).toContain('node "src"');
  });

  it("2. a write into a cached output through a kept reference: names the node that produced it", async () => {
    let kept: Geometry | undefined;
    const keeper = defineNode<Record<string, never>>({
      type: "keeper",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute() {
        const geo = createPointCloud(4);
        geo.attrs.point.require("P").data[0] = 1;
        kept = geo;
        return { out: [makeGeometryItem(geo)] };
      },
    });
    // Not connected to `keeper` at all: it reaches the cached output the
    // way a shared cache or a stale closure would.
    const scribble = defineNode<Record<string, never>>({
      type: "scribble",
      inputs: [{ name: "in", kind: "geometry" }],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute({ inputs }) {
        kept?.attrs.point.require("P").data.set([7, 7, 7], 0);
        return { out: [...inputs.in] };
      },
    });
    const g = new Graph(3);
    const k = g.add(keeper, undefined, "keeper");
    const src = g.add(sourceNode(), undefined, "src");
    const s = g.add(scribble, undefined, "scribble");
    g.connect(src, "out", s, "in");
    g.output(k, "out", "kept");
    g.output(s, "out", "main");

    // ONE cook: a second would snapshot the already-corrupted bytes as
    // its "before" and then watch `scribble` write exactly them again.
    const err = await expectTripped(g, "node");
    expect(err.violations[0]!.node).toBe("keeper");
    expect(err.violations[0]!.at).toContain('point attribute "P"');
    expect(err.violations[0]!.detail).toContain("point 0, component 0");
    // "node" mode names who was running when it showed up.
    expect(err.violations[0]!.noticedAfter).toBe("scribble");
    expect(err.message).toContain('right after node "scribble" finished');
  });

  it("3. a topology array written in place: names the topology array and the vertex", async () => {
    const offender = defineNode<Record<string, never>>({
      type: "writesTopology",
      inputs: [{ name: "in", kind: "geometry" }],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute({ inputs }) {
        const item = inputs.in[0]!;
        if (item.kind !== "geometry") throw new Error("no geometry");
        item.geo.vertexToPoint[1] = 0;
        return { out: [makeGeometryItem(cloneGeometry(item.geo))] };
      },
    });
    const g = new Graph(11);
    const src = g.add(
      defineNode<Record<string, never>>({
        type: "lines",
        inputs: [],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute() {
          const geo = createPointCloud(4);
          geo.setTopology(
            new Uint32Array([0, 1, 2, 3]),
            new Uint32Array([0, 2]),
            new Uint32Array([2, 2]),
          );
          return { out: [makeGeometryItem(geo)] };
        },
      }),
      undefined,
      "lines",
    );
    const bad = g.add(offender, undefined, "bad");
    g.connect(src, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g, true);
    expect(err.violations[0]!.node).toBe("lines");
    expect(err.violations[0]!.at).toContain("topology vertexToPoint");
    expect(err.violations[0]!.detail).toContain("vertex 1");
    expect(err.violations[0]!.detail).toContain("was 1, now 0");
  });

  it("4. a shared module-level buffer rewritten by a later node: names the earlier node", async () => {
    // One buffer, two nodes' geometry adopting it. The later node writes
    // its own output and corrupts the earlier one's — the exact shape a
    // scratch buffer hoisted out of a hot loop takes.
    const shared = new Float32Array(3 * 4);
    const adopt = (mark: number): Geometry => {
      const geo = createPointCloud(4);
      const P = geo.attrs.point.require("P");
      P.data = shared;
      for (let i = 0; i < 4; i++) shared[i * 3] = mark + i;
      return geo;
    };
    const first = defineNode<Record<string, never>>({
      type: "first",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute: () => ({ out: [makeGeometryItem(adopt(10))] }),
    });
    const second = defineNode<Record<string, never>>({
      type: "second",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute: () => ({ out: [makeGeometryItem(adopt(100))] }),
    });
    const g = new Graph(5);
    const a = g.add(first, undefined, "first");
    const b = g.add(second, undefined, "second");
    g.output(a, "out", "a");
    g.output(b, "out", "b");
    const err = await expectTripped(g, true);
    expect(err.violations[0]!.node).toBe("first");
    expect(err.violations[0]!.detail).toContain("point 0, component 0");
    expect(err.violations[0]!.detail).toContain("was 10, now 100");
  });

  it("5. a string table mutated with the index column left alone", async () => {
    const source = defineNode<Record<string, never>>({
      type: "named",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute() {
        const geo = createPointCloud(3);
        const kind = geo.attrs.point.add("kind", "string", 1);
        for (let i = 0; i < 3; i++) kind.setString(i, ["red", "green", "blue"][i]!);
        return { out: [makeGeometryItem(geo)] };
      },
    });
    const offender = defineNode<Record<string, never>>({
      type: "renames",
      inputs: [{ name: "in", kind: "geometry" }],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute({ inputs }) {
        const item = inputs.in[0]!;
        if (item.kind !== "geometry") throw new Error("no geometry");
        // The indices are untouched; only what index 0 SPELLS changes.
        item.geo.attrs.point.require("kind").stringTable[0] = "crimson";
        return { out: [...inputs.in] };
      },
    });
    const g = new Graph(13);
    const src = g.add(source, undefined, "named");
    const bad = g.add(offender, undefined, "renames");
    g.connect(src, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g, true);
    expect(err.violations[0]!.node).toBe("named");
    expect(err.violations[0]!.at).toContain('point attribute "kind"');
    expect(err.violations[0]!.at).toContain("string table");
    expect(err.violations[0]!.detail).toContain("crimson");
  });
});

describe("the report when one write damages many nodes", () => {
  it("stops at the cap and says it stopped, rather than implying it found them all", async () => {
    // Six pass-throughs hand the same geometry along, so one write at the
    // end lands on all seven nodes' outputs at once. That is the ordinary
    // shape of this failure, not a contrived one.
    const g = new Graph(29);
    let prev = g.add(sourceNode(), undefined, "src");
    for (let i = 0; i < 6; i++) {
      const pass = g.add(
        defineNode<Record<string, never>>({
          type: "pass",
          inputs: [{ name: "in", kind: "geometry" }],
          outputs: [{ name: "out", kind: "geometry" }],
          defaultParams: {},
          execute: ({ inputs }) => ({ out: [...inputs.in] }),
        }),
        undefined,
        `pass${i}`,
      );
      g.connect(prev, "out", pass, "in");
      prev = pass;
    }
    const bad = g.add(
      defineNode<Record<string, never>>({
        type: "last",
        inputs: [{ name: "in", kind: "geometry" }],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute({ inputs }) {
          const item = inputs.in[0]!;
          if (item.kind !== "geometry") throw new Error("no geometry");
          item.geo.attrs.point.require("P").data[0] = 3.5;
          return { out: [...inputs.in] };
        },
      }),
      undefined,
      "last",
    );
    g.connect(prev, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g);
    expect(err.truncated).toBe(true);
    expect(err.violations).toHaveLength(4);
    expect(err.message).toContain("the first 4 of them");
    // The first one found is the one furthest upstream, which is the one
    // whose cache has been wrong for longest.
    expect(err.violations[0]!.node).toBe("src");
  });
});

describe("the tripwire does not fire on well-behaved cooks", () => {
  it("a node that clones before writing passes", async () => {
    const g = new Graph(2);
    const src = g.add(sourceNode(), undefined, "src");
    const ok = g.add(politeNode(), undefined, "ok");
    g.connect(src, "out", ok, "in");
    g.output(ok, "out", "main");
    await expect(cook(g, { tripwire: "node" })).resolves.toBeDefined();
  });

  it("a value item, instance batches and a second cook all pass", async () => {
    const g = new Graph(4);
    const src = g.add(makePointsNode(6), undefined, "pts");
    const val = g.add(
      defineNode<Record<string, never>>({
        type: "val",
        inputs: [{ name: "in", kind: "geometry" }],
        outputs: [{ name: "out", kind: "any" }],
        defaultParams: {},
        execute: ({ inputs }) => ({ out: [makeValueItem(inputs.in.length)] }),
      }),
      undefined,
      "val",
    );
    g.connect(src, "out", val, "in");
    g.output(val, "out", "n");
    g.output(src, "out", "geo");
    await expect(cook(g, { tripwire: true })).resolves.toBeDefined();
    // The second cook serves every node from cache; the cached bytes are
    // watched just the same.
    const second = await cook(g, { tripwire: true });
    expect(second.stats.cached).toBeGreaterThan(0);
  });
});

describe("the tripwire reaches nested cooks", () => {
  /** A body whose one node scribbles on its input. */
  function badBody(): { inner: Graph; out: NodeHandle } {
    const inner = new Graph(21);
    const src = inner.add(sourceNode("innerSrc"), undefined, "innerSrc");
    const bad = inner.add(
      defineNode<Record<string, never>>({
        type: "innerBad",
        inputs: [{ name: "in", kind: "geometry" }],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute({ inputs }) {
          const item = inputs.in[0]!;
          if (item.kind !== "geometry") throw new Error("no geometry");
          item.geo.attrs.point.require("P").data[6] = -42;
          return { out: [makeGeometryItem(cloneGeometry(item.geo))] };
        },
      }),
      undefined,
      "innerBad",
    );
    inner.connect(src, "out", bad, "in");
    inner.output(bad, "out", "out");
    return { inner, out: bad };
  }

  it("a subgraph body: the inner node is named under the wrapper", async () => {
    const g = new Graph(31);
    const body = badBody();
    const wrap = g.add(
      subgraphNode(body.inner, [], [{ name: "out", node: body.out, pin: "out" }]),
      undefined,
      "wrap",
    );
    g.output(wrap, "out", "main");
    const err = await expectTripped(g, true);
    expect(err.violations[0]!.node).toBe("wrap/innerSrc");
    expect(err.violations[0]!.detail).toContain("point 2, component 0");
  });

  it("an outer node writing into a subgraph body's output is caught after the body's cook returned", async () => {
    // The body is clean; the corruption happens in the OUTER graph, after
    // the inner cook has already finished and swept nothing. Only the
    // outermost sweep can see this.
    const inner = new Graph(41);
    const src = inner.add(sourceNode("innerSrc"), undefined, "innerSrc");
    inner.output(src, "out", "out");
    const g = new Graph(43);
    const wrap = g.add(
      subgraphNode(inner, [], [{ name: "out", node: src, pin: "out" }]),
      undefined,
      "wrap",
    );
    const bad = g.add(
      defineNode<Record<string, never>>({
        type: "outerBad",
        inputs: [{ name: "in", kind: "geometry" }],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute({ inputs }) {
          const item = inputs.in[0]!;
          if (item.kind !== "geometry") throw new Error("no geometry");
          item.geo.attrs.point.require("P").data[0] = 1234;
          return { out: [...inputs.in] };
        },
      }),
      undefined,
      "outerBad",
    );
    g.connect(wrap, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g, true);
    expect(err.violations.map((v) => v.node)).toContain("wrap/innerSrc");
  });
});

describe("arming", () => {
  it("resolveTripwire is undefined when off, and the modes are what they say", () => {
    expect(resolveTripwire(false)).toBeUndefined();
    expect(resolveTripwire(true)?.mode).toBe("cook");
    expect(resolveTripwire("cook")?.mode).toBe("cook");
    expect(resolveTripwire("node")?.mode).toBe("node");
    const root = resolveTripwire(true)!;
    expect(root.depth).toBe(0);
    expect(root.scope("a").depth).toBe(1);
    expect(root.scope("a").scope("b").depth).toBe(2);
    // A handle passed in is inherited, not re-created.
    expect(resolveTripwire(root)).toBe(root);
  });

  it("an unarmed cook records nothing, and an armed one reports what it holds", async () => {
    const g = new Graph(2);
    const src = g.add(sourceNode(), undefined, "src");
    const ok = g.add(politeNode(), undefined, "ok");
    g.connect(src, "out", ok, "in");
    g.output(ok, "out", "main");

    // The off path: no handle exists at all, so there is nothing to record
    // into and nothing to sweep.
    let sawTripwire: unknown = "unset";
    const probe = defineNode<Record<string, never>>({
      type: "probe",
      inputs: [{ name: "in", kind: "geometry" }],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute({ inputs, tripwire }) {
        sawTripwire = tripwire;
        return { out: [...inputs.in] };
      },
    });
    const p = g.add(probe, undefined, "probe");
    g.connect(ok, "out", p, "in");
    g.output(p, "out", "probed");
    await cook(g);
    expect(sawTripwire).toBeUndefined();

    const armed = resolveTripwire(true)!;
    await cook(new Graph(2), {});
    const g2 = new Graph(9);
    const s2 = g2.add(sourceNode(), undefined, "src");
    g2.output(s2, "out", "main");
    await cook(g2, { tripwire: armed });
    expect(armed.watched).toBeGreaterThan(0);
    expect(armed.heldBytes).toBeGreaterThan(0);
  });
});
