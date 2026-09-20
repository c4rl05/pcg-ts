/**
 * The tripwire over everything this repository actually cooks.
 *
 * `src/graph/tripwire.test.ts` proves the mechanism by planting mutations
 * and watching it fire. This file is the other half: it arms the tripwire
 * over the whole graph corpus and over the Eiffel demo at its plain depth
 * and asserts that NOTHING moves. A guard that has never been run over the
 * real workload is a guard nobody knows the cost of, and a guard that is
 * already firing on main is a bug report rather than a gate.
 *
 * WHY THE CORPUS AND NOT JUST A FIXTURE. The corpus is the only place
 * where every shipped node type meets every other in the orders authors
 * actually write, and the failure this looks for — a node writing into a
 * buffer it was handed — is invisible until the specific pair of nodes
 * that share a buffer both run. `tests/graphs.test.ts` cooks each graph
 * twice and compares; that catches nondeterminism and misses this
 * entirely, because both cooks corrupt the same cache in the same place.
 *
 * WHY EIFFEL. It is the biggest thing here by an order of magnitude —
 * thousands of nodes, a `forEach` per part, hundreds of thousands of
 * elements — and it is built by TypeScript modules rather than corpus
 * JSON, so it exercises the wrapper nodes and the composite paths the
 * corpus graphs do not reach.
 *
 * WHAT IT COSTS, MEASURED. Both tests run on every `npm test`; the
 * numbers are in the test bodies, and `src/graph/tripwire.ts` carries the
 * raw runs behind them. The short version: the corpus pays nothing this
 * box can separate from its own noise, Eiffel pays about 1.6x, and both
 * are far inside the suite's 60 s floor. `"node"` mode is quadratic and
 * stays out of CI — on Eiffel it is 73-82 s against 0.5 s, which is a
 * debugging session, not a gate.
 */
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

// By PACKAGE NAME, like `tests/eiffelSkeleton.test.ts` and for the same
// reason: this file imports the Eiffel demo, the demo imports `pcg-ts`,
// and `npm run check` resolves that through `dist/`. Importing the same
// symbols from `../src/` here would give `tsc` two Graph types and one
// unreadable error. Vitest's alias makes both the same module at runtime.
//
// The side-effect import registers the shipped primitives; loading a
// corpus graph that names one fails without it.
import "pcg-ts/primitives";
import {
  Graph,
  createPointCloud,
  cook,
  defineNode,
  deserializeGraph,
  forEachNode,
  makeGeometryItem,
  repeatUntilNode,
} from "pcg-ts";
// Not from `pcg-ts`: the class is deliberately absent from the barrels
// (see src/graph/index.ts). `instanceof` is a runtime test and the alias
// makes this the very module `cook` threw from.
import { TripwireError } from "../src/graph/tripwire.js";
import { loadGraphs } from "../src/docs/graphIndex.js";
import { buildEiffel } from "../demos/eiffel/graph.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** Cook armed, and turn the tripwire's own report into the test failure. */
async function cookWatched(graph: Graph, label: string): Promise<number> {
  try {
    await cook(graph, { tripwire: true });
  } catch (err) {
    if (err instanceof TripwireError) {
      throw new Error(`${label}\n${err.message}`);
    }
    throw err;
  }
  return 0;
}

describe("the tripwire over the graph corpus", () => {
  const graphs = loadGraphs(ROOT);

  it("has graphs to check", () => {
    expect(graphs.length).toBeGreaterThan(80);
  });

  /**
   * ONE `it` FOR ALL 95 GRAPHS, NOT ONE EACH. Ninety-five test entries
   * that each cook a whole graph is ninety-five lines of output for one
   * fact, and vitest's per-test overhead is a real fraction of the cheap
   * ones. The failure message carries the graph's file name, so locating
   * a failure costs nothing that a per-graph `it` would have bought.
   *
   * COST, measured on this box (Node 22, 2026-09-20) as unarmed /
   * unarmed-again / armed triples in ONE process, so the two unarmed runs
   * bound what the armed one means: armed 2061/2042/2885/2136 ms against
   * unarmed 2428/2040/1978/2187 ms and a control arm of
   * 2190/1889/2000/2203 ms. The armed arm lands inside the unarmed pair's
   * own disagreement — 41 MB of snapshot over 356 watched node outputs at
   * its peak does not show against two seconds of cooking. So it runs on
   * every `npm test`. If the corpus grows enough to change that, move
   * THIS test (not the Eiffel one) to a CI-only path; the mechanism's own
   * proof lives in the unit file and costs milliseconds. In `"node"` mode
   * the same sweep takes 5.5-6.4 s.
   */
  it("cooks every corpus graph without any node's output moving", async () => {
    let checked = 0;
    for (const entry of graphs) {
      // A fresh parse per graph, as a host does — the same reason
      // `graphs.test.ts` re-parses rather than sharing one object.
      const graph = deserializeGraph(JSON.parse(JSON.stringify(entry.json)));
      await cookWatched(graph, `${entry.path}: a node's output changed after it was produced.`);
      checked++;
    }
    expect(checked).toBe(graphs.length);
  }, 180_000);
});

describe("the tripwire over the Eiffel demo", () => {
  /**
   * The plain depth, which is what the demo opens at: no laced web, no
   * rivets. `?laced` and `?rivets` build a different graph and are ~8x
   * the geometry; one depth is what this asks for, and it is already the
   * largest single cook in the suite.
   *
   * COST, measured the same way (six unarmed / unarmed / armed triples in
   * one process): armed 540/577/521/519/531/476 ms against unarmed
   * 351/334/331/335/363/318 ms, with the control arm at
   * 339/328/314/317/324/296 ms. The two unarmed arms agree within 5%, so
   * the 1.6x is real and not the machine's mood. It holds 273 MB across
   * 1608 watched node outputs, the `forEach` bodies' included. `"node"`
   * mode on this graph is 73-82 s, which is what "quadratic" means here
   * and why it is not what this test runs.
   */
  it("cooks the skeleton without any node's output moving", async () => {
    await cookWatched(buildEiffel(), "eiffel: a node's output changed after it was produced.");
  }, 180_000);
});

/**
 * The two loop wrappers live in `src/nodes`, so their forwarding is proved
 * here rather than beside the executor. The shape is the same in both: a
 * body node writes into its input instead of cloning, and the report has
 * to reach out of the body and name the inner node under the wrapper.
 */
describe("the tripwire reaches the loop wrappers' bodies", () => {
  /**
   * A body: a pass-through, then a node that writes into what it was
   * handed. `settle` makes the offender emit a FRESH geometry carrying
   * `repeatUntil`'s settle signal, which that loop refuses to run without;
   * `forEach` wants the plain pass-through.
   */
  function scribblingBody(settle: boolean): {
    inner: Graph;
    inPin: ReturnType<Graph["add"]>;
    out: ReturnType<Graph["add"]>;
  } {
    const inner = new Graph(17);
    const pass = inner.add(
      defineNode<Record<string, never>>({
        type: "bodyPass",
        inputs: [{ name: "in", kind: "geometry", multi: true }],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute: ({ inputs }) => ({ out: [...(inputs.in ?? [])] }),
      }),
      undefined,
      "bodyPass",
    );
    const bad = inner.add(
      defineNode<Record<string, never>>({
        type: "bodyBad",
        inputs: [{ name: "in", kind: "geometry", multi: true }],
        outputs: [{ name: "out", kind: "geometry" }],
        defaultParams: {},
        execute({ inputs }) {
          const item = (inputs.in ?? [])[0];
          if (item === undefined || item.kind !== "geometry") return { out: [] };
          // The plant: a write into the geometry it was handed.
          item.geo.attrs.point.require("P").data[1] = -77;
          if (!settle) return { out: [item] };
          const geo = createPointCloud(item.geo.pointCount);
          geo.attrs.detail.replace("moves", "u32", 1, 0).set(0, 0);
          return { out: [makeGeometryItem(geo)] };
        },
      }),
      undefined,
      "bodyBad",
    );
    inner.connect(pass, "out", bad, "in");
    return { inner, inPin: pass, out: bad };
  }

  /** One geometry item to iterate over. */
  function oneItem(): ReturnType<typeof makeGeometryItem> {
    const geo = createPointCloud(3);
    geo.attrs.point.require("P").data.set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    return makeGeometryItem(geo);
  }

  function sourceOf(item: ReturnType<typeof makeGeometryItem>) {
    return defineNode<Record<string, never>>({
      type: "one",
      inputs: [],
      outputs: [{ name: "out", kind: "geometry" }],
      defaultParams: {},
      execute: () => ({ out: [item] }),
    });
  }

  it("forEach: a body node writing into its input is caught and named under the loop", async () => {
    const body = scribblingBody(false);
    const def = forEachNode(
      body.inner,
      [{ name: "each", node: body.inPin, pin: "in" }],
      [{ name: "out", node: body.out, pin: "out" }],
    );
    const g = new Graph(19);
    const src = g.add(sourceOf(oneItem()), undefined, "src");
    const loop = g.add(def, undefined, "loop");
    g.connect(src, "out", loop, "each");
    g.output(loop, "out", "main");
    const err = await cook(g, { tripwire: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripwireError);
    expect((err as TripwireError).violations.map((v) => v.node)).toContain("loop/bodyPass");
    expect((err as TripwireError).violations[0]!.detail).toContain("point 0, component 1");
  });

  /**
   * In `"node"` mode the sweep fires INSIDE the body's cook, which is
   * inside the wrapper node's `execute`. Both the executor and `forEach`
   * wrap a failing execute — the executor in a `NodeExecutionError`, the
   * loop in a plain `Error` naming the iteration — and either one lost the
   * class (`World` rethrows verbatim and the worker protocol reconstructs
   * by `error.name`) and printed the whole multi-line report a second time
   * inside its own message. Both now let it through.
   */
  it("a body's failure in node mode keeps its class and prints its report once", async () => {
    const body = scribblingBody(false);
    const def = forEachNode(
      body.inner,
      [{ name: "each", node: body.inPin, pin: "in" }],
      [{ name: "out", node: body.out, pin: "out" }],
    );
    const g = new Graph(53);
    const src = g.add(sourceOf(oneItem()), undefined, "src");
    const loop = g.add(def, undefined, "loop");
    g.connect(src, "out", loop, "each");
    g.output(loop, "out", "main");
    const err = await cook(g, { tripwire: "node" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripwireError);
    expect((err as Error).name).toBe("TripwireError");
    const message = (err as Error).message;
    // The report is the WHOLE message: it opens with "tripwire:" and that
    // word appears once. Wrapped, the message opened with the wrapper's
    // own sentence and carried the report quoted inside it.
    expect(message.startsWith("tripwire:")).toBe(true);
    expect(message.split("tripwire:")).toHaveLength(2);
    expect(message).not.toContain("forEach: iteration");
    expect(message).not.toContain("failed:");
  });

  /**
   * The budget is the tripwire's OWN failure, not the graph's, and it
   * takes the same route out of a body as a violation does — which is the
   * whole reason the pass-through is a predicate over both classes rather
   * than one `instanceof`. A loop is also where the budget actually bites,
   * since retention grows with the iterations.
   */
  it("a budget overrun inside a body keeps its class too", async () => {
    const body = scribblingBody(false);
    const def = forEachNode(
      body.inner,
      [{ name: "each", node: body.inPin, pin: "in" }],
      [{ name: "out", node: body.out, pin: "out" }],
    );
    const g = new Graph(59);
    const src = g.add(sourceOf(oneItem()), undefined, "src");
    const loop = g.add(def, undefined, "loop");
    g.connect(src, "out", loop, "each");
    g.output(loop, "out", "main");
    const err = await cook(g, { tripwire: { budgetBytes: 64 } }).catch((e: unknown) => e);
    expect((err as Error).name).toBe("TripwireBudgetError");
    expect((err as Error).message.startsWith("tripwire: ran out of budget")).toBe(true);
    expect((err as Error).message).not.toContain("forEach: iteration");
  });

  it("repeatUntil: the same, through the round loop", async () => {
    const body = scribblingBody(true);
    const def = repeatUntilNode(
      body.inner,
      [{ name: "carry", node: body.inPin, pin: "in" }],
      [{ name: "carry", node: body.out, pin: "out" }],
    );
    const g = new Graph(23);
    const src = g.add(sourceOf(oneItem()), undefined, "src");
    const loop = g.add(def, { maxRounds: 1 }, "loop");
    g.connect(src, "out", loop, "carry");
    g.output(loop, "carry", "main");
    const err = await cook(g, { tripwire: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TripwireError);
    expect((err as TripwireError).violations.map((v) => v.node)).toContain("loop/bodyPass");
  });
});
