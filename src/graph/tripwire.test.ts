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
import {
  makeGeometryItem,
  makeInstancesItem,
  makeValueItem,
  type DataItem,
  type InstancesItem,
} from "./data.js";
import { cook } from "./execute.js";
import { Graph, type NodeHandle } from "./graph.js";
import { defineNode, type NodeDef } from "./node.js";
import { subgraphNode } from "./subgraph.js";
import {
  DEFAULT_BUDGET_BYTES,
  TripwireBudgetError,
  TripwireError,
  resolveTripwire,
  type TripwireSettings,
} from "./tripwire.js";
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
      const P = geo.attrs.point.require("P").writable();
      for (let i = 0; i < count; i++) P[i * 3] = i;
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
        geo.attrs.point.require("P").writable()[1] = 99;
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
        item.geo.attrs.point.require("P").writable()[3 * 5 + 2] = -1;
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
        geo.attrs.point.require("P").writable()[0] = 1;
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
        kept?.attrs.point.require("P").writable().set([7, 7, 7], 0);
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
        // THE CAST IS THE POINT. A topology array is read-only through
        // the geometry, so this node has to reach around the type to
        // write its input in place — which is exactly the mistake the
        // tripwire is here to catch, expressed the only way it can still
        // be expressed. `writableTopology` would fork this geometry's
        // arrays and leave the producer's alone, so it would plant no bug.
        (item.geo.vertexToPoint as unknown as Uint32Array)[1] = 0;
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
      // Reaching past `private` on purpose. Copy-on-write closed the
      // public route — `data` is a read view with no setter, and nothing
      // public or internal installs foreign storage into a column any
      // more — but the tripwire is the net for this STATE however it
      // arises, not only for the states a caller can still reach: a
      // column pointing at a buffer someone else also holds is the same
      // hazard whether a node adopted it or a future refactor reopens
      // the door. Constructing impossible states is this test's job, so
      // the reach belongs here and nowhere else.
      (P as unknown as { _data: Float32Array })._data = shared;
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
          item.geo.attrs.point.require("P").writable()[0] = 3.5;
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
          item.geo.attrs.point.require("P").writable()[6] = -42;
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
          item.geo.attrs.point.require("P").writable()[0] = 1234;
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
    expect(resolveTripwire({ mode: "node", budgetBytes: 4096 })?.budgetBytes).toBe(4096);
    expect(resolveTripwire(true)?.budgetBytes).toBe(DEFAULT_BUDGET_BYTES);
    const root = resolveTripwire(true)!;
    expect(root.depth).toBe(0);
    expect(root.scope("a").depth).toBe(1);
    expect(root.scope("a").scope("b").depth).toBe(2);
    // The handle is inherited through its OWN argument, and it wins over
    // the flag: a nested cook is never its own session.
    expect(resolveTripwire(undefined, root)).toBe(root);
    expect(resolveTripwire(false, root)).toBe(root);
    expect(resolveTripwire("node", root)).toBe(root);
  });

  it("refuses a handle in the flag slot, which typechecks but would open a second session", () => {
    // `Tripwire` satisfies `TripwireSettings` structurally, so `tsc` has
    // nothing to say here. The runtime does.
    const handle = resolveTripwire(true)!;
    expect(() => resolveTripwire(handle as unknown as TripwireSettings)).toThrow(
      /takes a flag .* not a Tripwire handle/s,
    );
    expect(() => resolveTripwire(handle as unknown as TripwireSettings)).toThrow(
      /tripwireSession/,
    );
  });

  it("reads PCG_TRIPWIRE at the start of each cook, so setting it at runtime works", () => {
    const before = process.env.PCG_TRIPWIRE;
    try {
      process.env.PCG_TRIPWIRE = "node";
      expect(resolveTripwire(undefined)?.mode).toBe("node");
      process.env.PCG_TRIPWIRE = "1";
      expect(resolveTripwire(undefined)?.mode).toBe("cook");
      process.env.PCG_TRIPWIRE = "nonsense";
      expect(resolveTripwire(undefined)).toBeUndefined();
      delete process.env.PCG_TRIPWIRE;
      expect(resolveTripwire(undefined)).toBeUndefined();
      // And an explicit `false` still declines while the env var is on.
      process.env.PCG_TRIPWIRE = "1";
      expect(resolveTripwire(false)).toBeUndefined();
      // The budget comes from the environment too.
      process.env.PCG_TRIPWIRE_BUDGET_MB = "7";
      expect(resolveTripwire(true)?.budgetBytes).toBe(7 * 1024 * 1024);
    } finally {
      delete process.env.PCG_TRIPWIRE_BUDGET_MB;
      if (before === undefined) delete process.env.PCG_TRIPWIRE;
      else process.env.PCG_TRIPWIRE = before;
    }
  });

  /**
   * SKIPPED UNDER `PCG_TRIPWIRE`, and that is the point of the env var
   * rather than a hole in this test: a cook with no option is armed when
   * the variable is set, so asserting the node saw `undefined` would fail
   * for the right reason. Everything else in both tripwire suites passes
   * either way, which is what lets the whole repository suite be run
   * under `PCG_TRIPWIRE=1`.
   */
  it.skipIf(process.env.PCG_TRIPWIRE !== undefined)(
    "an unarmed cook hands nodes no handle at all",
    async () => {
      const g = new Graph(2);
      const src = g.add(sourceNode(), undefined, "src");
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
      g.connect(src, "out", p, "in");
      g.output(p, "out", "probed");
      await cook(g);
      expect(sawTripwire).toBeUndefined();
    },
  );

  it("an armed cook reports what it holds", async () => {
    const armed = resolveTripwire(true)!;
    const g = new Graph(9);
    const s = g.add(sourceNode(), undefined, "src");
    g.output(s, "out", "main");
    await cook(g, { tripwireSession: armed });
    expect(armed.watched).toBeGreaterThan(0);
    expect(armed.heldBytes).toBeGreaterThan(0);
    expect(armed.blindSpots).toEqual([]);
  });
});

describe("the budget", () => {
  it("fails with a message naming the limit and how to raise it, not an OOM", async () => {
    const g = new Graph(31);
    const src = g.add(sourceNode("big", 20_000), undefined, "big");
    g.output(src, "out", "main");
    // One point cloud of 20k points carries far more than 4 KiB of
    // standard attributes, so the very first node goes over.
    const err = await cook(g, { tripwire: { budgetBytes: 4096 } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripwireBudgetError);
    const budget = err as TripwireBudgetError;
    expect(budget.node).toBe("big");
    expect(budget.budgetBytes).toBe(4096);
    expect(budget.heldBytes).toBeGreaterThan(4096);
    expect(budget.message).toContain("ran out of budget");
    expect(budget.message).toContain("0.0 MiB limit");
    expect(budget.message).toContain("budgetBytes: 8192");
    expect(budget.message).toContain("PCG_TRIPWIRE_BUDGET_MB=");
    // NOT a TripwireError: nothing is wrong with the graph.
    expect(budget).not.toBeInstanceOf(TripwireError);
  });

  it("a generous budget lets the same cook through", async () => {
    const g = new Graph(31);
    const src = g.add(sourceNode("big", 20_000), undefined, "big");
    g.output(src, "out", "main");
    await expect(cook(g, { tripwire: { budgetBytes: 1 << 30 } })).resolves.toBeDefined();
  });
});

describe("a batch whose channels cannot be read", () => {
  /**
   * `instanceAttributesOf` THROWS on a hand-built batch carrying two
   * different colour buffers. A host holding one is fine unarmed; arming
   * must not turn that into a failed cook, which is what it did.
   */
  function twoColourBatch(): InstancesItem {
    const transforms = new Float32Array(16);
    transforms[0] = 1;
    return makeInstancesItem([
      {
        assetId: "rock",
        count: 1,
        transforms,
        attributes: { color: new Float32Array([1, 0, 0]) },
        colors: new Float32Array([0, 1, 0]),
      },
    ]);
  }

  function batchSource(item: InstancesItem): NodeDef<Record<string, never>> {
    return defineNode<Record<string, never>>({
      type: "handBuilt",
      inputs: [],
      outputs: [{ name: "out", kind: "instances" }],
      defaultParams: {},
      execute: () => ({ out: [item] }),
    });
  }

  it("cooks armed exactly as it cooks unarmed", async () => {
    const make = (): Graph => {
      const g = new Graph(37);
      const s = g.add(batchSource(twoColourBatch()), undefined, "hand");
      g.output(s, "out", "main");
      return g;
    };
    await expect(cook(make())).resolves.toBeDefined();
    await expect(cook(make(), { tripwire: true })).resolves.toBeDefined();
    await expect(cook(make(), { tripwire: "node" })).resolves.toBeDefined();
  });

  it("still watches the transforms, and says in the report what it could not read", async () => {
    const item = twoColourBatch();
    const g = new Graph(41);
    const hand = g.add(batchSource(item), undefined, "hand");
    const bad = g.add(
      defineNode<Record<string, never>>({
        type: "scribbles",
        inputs: [{ name: "in", kind: "instances" }],
        outputs: [{ name: "out", kind: "instances" }],
        defaultParams: {},
        execute({ inputs }) {
          // The transforms ARE watched, unreadable channels or not.
          item.batches[0]!.transforms[0] = 99;
          return { out: [...inputs.in] };
        },
      }),
      undefined,
      "scribbles",
    );
    g.connect(hand, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g);
    expect(err.violations[0]!.node).toBe("hand");
    expect(err.violations[0]!.at).toContain("transforms");
    expect(err.violations[0]!.detail).toContain("was 1, now 99");
    expect(err.blindSpots.join("\n")).toContain("channels could not be read");
    expect(err.message).toContain("Not everything was watched on this cook");
  });
});

describe("the failure message", () => {
  it("carries no control bytes, so a grep over a log cannot silently skip it", async () => {
    const source = defineNode<Record<string, never>>({
      type: "named",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute() {
        const geo = createPointCloud(2);
        const kind = geo.attrs.point.add("kind", "string", 1);
        kind.setString(0, "alpha");
        kind.setString(1, "beta");
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
        item.geo.attrs.point.require("kind").stringTable[0] = "gamma";
        return { out: [...inputs.in] };
      },
    });
    const g = new Graph(43);
    const src = g.add(source, undefined, "named");
    const bad = g.add(offender, undefined, "renames");
    g.connect(src, "out", bad, "in");
    g.output(bad, "out", "main");
    const err = await expectTripped(g);
    // eslint-disable-next-line no-control-regex
    expect(err.message).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
    // Index 0 of the table is the attribute's default (the empty string),
    // so "alpha" and "beta" are 1 and 2 — and the whole table lands in the
    // message as JSON, which is the point: readable, and greppable.
    expect(err.message).toContain('was ["","alpha","beta"]');
    expect(err.message).toContain('now ["gamma","alpha","beta"]');
  });
});
