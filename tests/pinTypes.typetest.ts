/**
 * TYPE-LEVEL tests of typed pin names and enum params. Nothing here runs:
 * vitest collects only `*.test.ts`, and this file is `*.typetest.ts` so that
 * it never does. `npm run check` (`tsc --noEmit`) compiles it, and that
 * compile IS the test — each `@ts-expect-error` fails the check the day its
 * line starts to compile, and every line without one fails the check the
 * day it stops.
 *
 * WHAT IT PINS. A handle `Graph.add` returns for a standard node carries its
 * definition's input and output pin names, so `connect`, `disconnect` and
 * `output` refuse a misspelled pin at compile time; an enum param refuses a
 * value outside its literal union. And the other half, which matters as
 * much: every handle whose pins are NOT known statically — an untyped
 * `NodeHandle`, a deserialized graph's node rebuilt from its id, a
 * third-party def typed `NodeDef<P>`, a subgraph def, a generic helper's
 * handle — still takes any `string`, exactly as before the pins were typed.
 *
 * Two imports of the same names, on purpose: `../src/index.js` checks the
 * source, and `pcg-ts` checks the BUNDLED `dist/index.d.ts` a consumer
 * compiles against, where a bundler that dropped the `@internal` phantom
 * markers would erase the pin types without any source-level test noticing.
 */
import * as published from "pcg-ts";
import {
  Graph,
  copyToPoints,
  defineNode,
  deserializeGraph,
  filterByBounds,
  mergePoints,
  pointGrid,
  spawnInstances,
  subgraphNode,
  type NodeHandle,
} from "../src/index.js";

export function typedPins(): void {
  const g = new Graph(1);
  const grid = g.add(pointGrid);
  const clip = g.add(filterByBounds, { mode: "inside" });
  const spawn = g.add(spawnInstances);

  g.connect(grid, "out", clip, "in");
  g.connect(clip, "out", spawn, "in");
  g.output(spawn, "instances");
  g.output(spawn, "points", "pts");
  g.disconnect(grid, "out", clip, "in");

  // @ts-expect-error — a misspelled OUTPUT pin
  g.connect(grid, "outt", clip, "in");
  // @ts-expect-error — a misspelled INPUT pin
  g.connect(grid, "out", clip, "inn");
  // @ts-expect-error — pointGrid is a source: it has no input pins at all
  g.connect(clip, "out", grid, "in");
  // @ts-expect-error — an input pin name offered as an output
  g.connect(clip, "in", spawn, "in");
  // @ts-expect-error — a misspelled pin on disconnect
  g.disconnect(grid, "out", clip, "input");
  // @ts-expect-error — a misspelled pin on output
  g.output(spawn, "instance");

  // Multi-input nodes take each of their pins, and only those.
  const copy = g.add(copyToPoints);
  g.connect(grid, "out", copy, "source");
  g.connect(clip, "out", copy, "target");
  // @ts-expect-error — copyToPoints has "source" and "target", not "in"
  g.connect(grid, "out", copy, "in");

  // A union of handles accepts the pins of either member — the documented
  // limit of typing pins from the handle, and never a name neither has.
  const either = Math.random() < 0.5 ? clip : spawn;
  g.connect(either, "points", g.add(mergePoints), "in");
  // @ts-expect-error — neither member has this output
  g.connect(either, "nope", g.add(mergePoints), "in");
}

export function enumParams(): void {
  const g = new Graph(1);
  const clip = g.add(filterByBounds, { mode: "outside", boundary: "inclusive" });
  // @ts-expect-error — not a value of the `mode` enum
  g.add(filterByBounds, { mode: "nope" });
  g.setParam(clip, "mode", "inside");
  // @ts-expect-error — not a value of the `mode` enum
  g.setParam(clip, "mode", "sideways");
  const fromData: string = "inside";
  // @ts-expect-error — a wider `string` is not an enum value; narrow it first
  g.setParam(clip, "mode", fromData);
}

export function untypedHandlesTakeStrings(pinFromData: string): void {
  const g = new Graph(1);

  // A handle declared as a plain NodeHandle — the escape hatch for a pin
  // name known only at runtime.
  const widened: NodeHandle = g.add(filterByBounds);
  g.connect(widened, pinFromData, widened, pinFromData);
  g.output(widened, pinFromData);

  // The same widening at the call, with no declaration to change.
  const clip = g.add(filterByBounds);
  g.connect<string, string>(clip, pinFromData, clip, pinFromData);
  g.output<string>(clip, pinFromData);

  // A deserialized graph's nodes, addressed by the ids its JSON carries.
  const loaded = deserializeGraph({ formatVersion: 1, seed: 0, nodes: [], connections: [], outputs: [] });
  const byId: NodeHandle = { id: "scatter" };
  loaded.connect(byId, "out", { id: "clip" }, "in");
  loaded.connect({ id: "a" }, pinFromData, { id: "b" }, pinFromData);
  for (const node of loaded.describe().nodes) loaded.output({ id: node.id }, pinFromData);

  // A helper over any handle, plain and generic. The generic one is the case
  // a conditional type over the handle broke: `H` stays unresolved inside it.
  const link = (graph: Graph, a: NodeHandle, b: NodeHandle): void => graph.connect(a, "out", b, "in");
  link(g, g.add(pointGrid), clip);
  function linkGeneric<A extends NodeHandle, B extends NodeHandle>(graph: Graph, a: A, b: B, pin: string): void {
    graph.connect(a, "out", b, "in");
    graph.connect(a, pin, b, pin);
    graph.disconnect(a, "out", b, pin);
    graph.output(a, pin);
  }
  linkGeneric(g, g.add(pointGrid), clip, "out");

  // A third-party def keeps string pins.
  const custom = defineNode<Record<string, never>>({
    type: "custom",
    inputs: [{ name: "in", kind: "geometry" }],
    outputs: [{ name: "out", kind: "geometry" }],
    defaultParams: {},
    execute: () => ({ out: [] }),
  });
  const c = g.add(custom);
  g.connect(c, "whatever", c, pinFromData);

  // A def whose type is INFERRED from an object literal is the one
  // non-standard def whose pins become literal: TypeScript reads them off
  // the literal. Typing it `NodeDef<P>` keeps strings, as `custom` shows.
  const inferred = g.add({
    type: "inferred",
    inputs: [{ name: "in", kind: "geometry" }],
    outputs: [{ name: "out", kind: "geometry" }],
    defaultParams: {},
    execute: () => ({ out: [] }),
  });
  g.connect(inferred, "out", inferred, "in");
  // @ts-expect-error — its pins were read off the literal
  g.connect(inferred, pinFromData, inferred, "in");

  // A subgraph def's pins are per instance, so they are strings too.
  const wrapped = g.add(subgraphNode(new Graph(2), [], []));
  g.connect(wrapped, pinFromData, clip, "in");
}

export function publishedTypings(): void {
  const g = new published.Graph(1);
  const grid = g.add(published.pointGrid);
  const clip = g.add(published.filterByBounds, { mode: "inside" });
  g.connect(grid, "out", clip, "in");
  // @ts-expect-error — a misspelled output pin, through dist/index.d.ts
  g.connect(grid, "outt", clip, "in");
  // @ts-expect-error — a bad enum literal, through dist/index.d.ts
  g.add(published.filterByBounds, { mode: "nope" });
  const untyped: published.NodeHandle = clip;
  g.connect(untyped, "anything", untyped, "at all");
}
