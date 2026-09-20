/**
 * The aliasing guard for the no-copy topology hand-over (`adoptTopology`).
 *
 * The nodes switched to it hand the arrays they built straight to their
 * output, so a node's cached geometry now holds the very arrays its execute
 * allocated. That is safe exactly as long as nothing ELSE holds them: not
 * the node (it must not keep or write them, nor build them in a buffer it
 * reuses), and not any other node (none may adopt an input's arrays, nor
 * write an input's topology in place). Break any of those and a DOWNSTREAM
 * re-cook silently rewrites an UPSTREAM cache entry, which only shows on
 * the next cook that is served from it.
 *
 * So the guard cooks a graph whose upstream covers all eight switched
 * sites — createTriangleMesh (meshPrimitive), setPolylineTopology
 * (pointsToPath, connectPoints), meshFromField, sweepProfile,
 * extrudePolygon, mergePrimitives, copyToPoints "keep" and gatherPrimitives
 * (filterPrimitivesByBounds) — edits a downstream param (re-cooking only
 * downstream nodes, several of which read the upstream outputs and adopt
 * arrays of their own), cooks again, SNAPSHOTS every upstream output — the
 * cached object the second cook served — and only then compares the
 * snapshots against a fresh cook of the upstream alone.
 *
 * The snapshot has to come first: a node that builds its topology in a
 * buffer shared across calls is rewritten by the fresh cook itself, back
 * to the expected bytes, so a comparison that reads the cache AFTER the
 * fresh cook is blind to it. The controls plant that pooled buffer and the
 * two other ways the rule can be broken, and require the guard to see each.
 */
import { describe, expect, it } from "vitest";

import { adoptTopology } from "../data/adoptTopology.js";
import { Geometry, createPolyline, type ReadonlyTopology } from "../data/index.js";
import { constant, length, position, sub } from "../fields/index.js";
import {
  type DataCollection,
  Graph,
  type NodeHandle,
  cloneGeometry,
  cook,
  firstGeometry,
  makeGeometryItem,
} from "../graph/index.js";
import { defineNode } from "../graph/node.js";
import { dataInput } from "../runtime/index.js";
import {
  connectPoints,
  copyToPoints,
  extrudePolygon,
  filterPrimitivesByBounds,
  mergePrimitives,
  meshFromField,
  meshPrimitive,
  pointGrid,
  pointsToPath,
  sweepProfile,
  transformPoints,
} from "./index.js";

/**
 * A deliberately broken downstream node. With `shift` 0 it only passes a
 * clone through; with `shift` nonzero it corrupts its INPUT's topology —
 * `mode "write"` by writing the input's `vertexToPoint` in place, `mode
 * "adopt"` by adopting the input's arrays into its own output (the aliasing
 * the adopting path forbids) and then writing through that output.
 */
const vandal = defineNode<{ shift: number; mode: "write" | "adopt" }>({
  type: "test.topologyVandal",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: { shift: 0, mode: "write" },
  execute({ inputs, params }) {
    const src = firstGeometry(inputs.in as DataCollection);
    if (!src) throw new Error("test.topologyVandal: no geometry on pin in");
    if (params.shift === 0) return { out: [makeGeometryItem(cloneGeometry(src))] };
    const np = src.pointCount;
    // EVERY WRITE HERE CASTS, and that is a result rather than a nuisance:
    // a geometry hands its topology out read-only, so neither planted bug
    // can be written any more without reaching around the type. The casts
    // are what keeps the controls able to plant them.
    const raw = (v: ReadonlyTopology): Uint32Array => v as unknown as Uint32Array;
    if (params.mode === "write") {
      raw(src.vertexToPoint)[0] = (src.vertexToPoint[0] + params.shift) % np;
      return { out: [makeGeometryItem(cloneGeometry(src))] };
    }
    const out = new Geometry();
    out.attrs.point.resize(np);
    adoptTopology(out, raw(src.vertexToPoint), raw(src.primVertexStart), raw(src.primVertexCount));
    raw(out.vertexToPoint)[0] = (out.vertexToPoint[0] + params.shift) % np;
    return { out: [makeGeometryItem(out)] };
  },
});

/**
 * The third planted bug: ONE module-level buffer every instance of this
 * node type builds its `vertexToPoint` in and adopts a view of — the
 * "own buffer of exact length" rule broken. Each cook of any instance
 * rewrites every other instance's cached topology.
 */
const POOL = new Uint32Array(4096);
const pooled = defineNode<{ offset: number }>({
  type: "test.pooledTopology",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: { offset: 0 },
  execute({ inputs, params }) {
    const src = firstGeometry(inputs.in as DataCollection);
    if (!src) throw new Error("test.pooledTopology: no geometry on pin in");
    const n = src.pointCount;
    const v2p = POOL.subarray(0, n);
    for (let i = 0; i < n; i++) v2p[i] = (i + params.offset) % n;
    const out = new Geometry();
    out.attrs.point.resize(n);
    adoptTopology(out, v2p, Uint32Array.of(0), Uint32Array.of(n));
    return { out: [makeGeometryItem(out)] };
  },
});

/** The upstream outputs every build declares, one per switched site. */
const UPSTREAM = ["path", "links", "tube", "plate", "blob", "block", "merged", "copies", "kept"] as const;

interface BuildOptions {
  downstream: boolean;
  vandal?: "write" | "adopt";
  pooled?: boolean;
}

interface Built {
  g: Graph;
  /** Upstream output names: {@link UPSTREAM}, plus `pooled` when planted. */
  upstream: string[];
  /** Re-cooks downstream only: `moved` and everything below it. */
  edit: () => void;
  /** How many nodes the edit re-cooks. */
  downstreamCount: number;
}

function build(opts: BuildOptions): Built {
  const g = new Graph(7);
  const grid = g.add(pointGrid, { countX: 5, countY: 1, countZ: 3, spacing: [1, 1, 1] }, "grid");
  const path = g.add(pointsToPath, {}, "path");
  g.connect(grid, "out", path, "in");
  const links = g.add(connectPoints, { mode: "radius", radius: 1.01 }, "links");
  g.connect(grid, "out", links, "in");
  const tube = g.add(sweepProfile, { sides: 4, radius: 0.1 }, "tube");
  g.connect(path, "out", tube, "in");
  const plate = g.add(meshPrimitive, { shape: "plane", size: [4, 4, 4], subdivisions: [2, 1, 2] }, "plate");
  const blob = g.add(
    meshFromField,
    {
      field: sub(length(position()), constant(1.5)) as never,
      cellSize: 0.5,
      boundsMin: [-2, -2, -2],
      boundsMax: [2, 2, 2],
    },
    "blob",
  );
  // A closed square footprint, the one input extrudePolygon extrudes.
  const footprint = g.add(
    dataInput,
    { items: [makeGeometryItem(createPolyline([0, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 2], { closed: true }))] },
    "footprint",
  );
  const block = g.add(extrudePolygon, { distance: 1.5 }, "block");
  g.connect(footprint, "out", block, "in");
  const merged = g.add(mergePrimitives, {}, "merged");
  for (const h of [tube, plate, links, blob, block]) g.connect(h, "out", merged, "in");
  const targets = g.add(pointGrid, { countX: 3, countY: 1, countZ: 1, spacing: [20, 1, 1] }, "targets");
  const copies = g.add(copyToPoints, { topology: "keep" }, "copies");
  g.connect(merged, "out", copies, "source");
  g.connect(targets, "out", copies, "target");
  const kept = g.add(
    filterPrimitivesByBounds,
    { boundsMin: [-100, -100, -100], boundsMax: [30, 100, 100], vertex: "first", unreferencedPoints: "drop" },
    "kept",
  );
  g.connect(copies, "out", kept, "in");
  const handles: Record<(typeof UPSTREAM)[number], NodeHandle> = {
    path,
    links,
    tube,
    plate,
    blob,
    block,
    merged,
    copies,
    kept,
  };
  for (const name of UPSTREAM) g.output(handles[name], "out", name);
  const upstream: string[] = [...UPSTREAM];
  if (opts.pooled) {
    const pool = g.add(pooled, { offset: 0 }, "pooled");
    g.connect(grid, "out", pool, "in");
    g.output(pool, "out", "pooled");
    upstream.push("pooled");
  }

  if (!opts.downstream) return { g, upstream, edit: () => {}, downstreamCount: 0 };

  // Downstream: a copying node (transformPoints clones), then two adopting
  // nodes that READ upstream outputs while they build their own arrays —
  // mergePrimitives appends links/tube/plate/blob/block, and copyToPoints
  // "keep" with no selection plans straight off its source's own arrays.
  const moved = g.add(transformPoints, { translate: [0, 0, 0] }, "moved");
  g.connect(kept, "out", moved, "in");
  const again = g.add(mergePrimitives, {}, "again");
  for (const h of [moved, links, tube, plate, blob, block]) g.connect(h, "out", again, "in");
  const copied = g.add(copyToPoints, { topology: "keep" }, "copied");
  g.connect(again, "out", copied, "source");
  g.connect(targets, "out", copied, "target");
  g.output(copied, "out", "down");
  let downstreamCount = 3;
  let bad: NodeHandle<{ shift: number; mode: "write" | "adopt" }> | undefined;
  if (opts.vandal !== undefined) {
    bad = g.add(vandal, { shift: 0, mode: opts.vandal }, "vandal");
    g.connect(links, "out", bad, "in");
    g.output(bad, "out", "vandal");
    downstreamCount++;
  }
  let pooledDown: NodeHandle<{ offset: number }> | undefined;
  if (opts.pooled) {
    // A second instance of the pooled node, downstream: re-cooking it with a
    // new offset rewrites the buffer the upstream instance's cache holds.
    pooledDown = g.add(pooled, { offset: 0 }, "pooledDown");
    g.connect(grid, "out", pooledDown, "in");
    g.output(pooledDown, "out", "pooledDown");
    downstreamCount++;
  }
  return {
    g,
    upstream,
    edit: () => {
      g.setParam(moved, "translate", [1, 2, 3]);
      if (bad) g.setParam(bad, "shift", 1);
      if (pooledDown) g.setParam(pooledDown, "offset", 1);
    },
    downstreamCount,
  };
}

type Topology = { v: number[]; s: number[]; c: number[]; points: number };

/** A COPY of an output's topology — a snapshot, not a view of the cache. */
function topologyOf(coll: DataCollection | undefined, name: string): Topology {
  const geo = coll ? firstGeometry(coll) : undefined;
  if (!geo) throw new Error(`no geometry on output ${name}`);
  return {
    v: Array.from(geo.vertexToPoint),
    s: Array.from(geo.primVertexStart),
    c: Array.from(geo.primVertexCount),
    points: geo.pointCount,
  };
}

const sameTopology = (a: Topology, b: Topology): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * THIS FILE MUTATES ON PURPOSE, SO IT DECLINES THE TRIPWIRE.
 *
 * The controls below plant a vandal — a node that writes its input's
 * topology, adopts its input's arrays, or builds into a pooled buffer —
 * and then ask whether THIS FILE'S comparator sees it.
 * `src/graph/tripwire.ts` is the general form of the same check, and under
 * `PCG_TRIPWIRE` it watches every cook in the run: it would catch the
 * vandal and abort the cook before the comparator ever took a reading, so
 * the controls failed for the one reason that proves both instruments
 * work. `tripwire: false` declines the environment's default per cook,
 * which is exactly what it is for.
 *
 * ANY TEST THAT DELIBERATELY MUTATES A COOKED OUTPUT NEEDS THIS. Pass it
 * on every `cook` the test makes, not just the one doing the damage — the
 * sweep happens at the end of the cook that is armed, not the one that
 * wrote.
 */
const NO_TRIPWIRE = { tripwire: false } as const;

/**
 * Cook, edit downstream, cook again, snapshot the upstream cache, then
 * cook the upstream alone from scratch. `caught` names the upstream outputs
 * whose snapshot differs from the fresh cook — the guard's verdict.
 * `lateRead` repeats the comparison reading the cache AFTER the fresh cook,
 * which is what the guard must not do; it is returned so a control can show
 * what that ordering misses.
 */
async function guard(opts: Omit<BuildOptions, "downstream"> = {}): Promise<{ caught: string[]; lateRead: string[] }> {
  const built = build({ downstream: true, ...opts });
  const first = await cook(built.g, NO_TRIPWIRE);
  built.edit();
  const second = await cook(built.g, NO_TRIPWIRE);
  // The edit re-cooked the downstream nodes and nothing upstream: every
  // upstream output is the same object the first cook produced.
  expect(second.stats.cooked).toBe(built.downstreamCount);
  for (const name of built.upstream) {
    expect(firstGeometry(second.outputs[name])).toBe(firstGeometry(first.outputs[name]));
  }
  // SNAPSHOT BEFORE THE FRESH COOK (see the module doc).
  const cached = new Map(built.upstream.map((name) => [name, topologyOf(second.outputs[name], name)]));
  const fresh = await cook(build({ downstream: false, pooled: opts.pooled }).g, NO_TRIPWIRE);
  const caught: string[] = [];
  const lateRead: string[] = [];
  for (const name of built.upstream) {
    const want = topologyOf(fresh.outputs[name], name);
    // Nothing degenerate would make "same" vacuous.
    expect(want.v.length).toBeGreaterThan(0);
    if (!sameTopology(cached.get(name) as Topology, want)) caught.push(name);
    if (!sameTopology(topologyOf(second.outputs[name], name), want)) lateRead.push(name);
  }
  return { caught, lateRead };
}

describe("adopted topology is never rewritten by a downstream re-cook", () => {
  it("every upstream cache entry still matches a fresh cook after a downstream edit", async () => {
    expect(await guard()).toEqual({ caught: [], lateRead: [] });
  });

  // The controls run under `PCG_TRIPWIRE` like any other test: `guard`
  // declines the tripwire per cook (see NO_TRIPWIRE), so the vandal it
  // plants reaches this file's own comparator instead of being caught a
  // layer earlier.
  it("control: a downstream node writing its input's topology in place is caught", async () => {
    expect((await guard({ vandal: "write" })).caught).toEqual(["links"]);
  });

  it("control: a downstream node adopting its input's arrays and writing them is caught", async () => {
    expect((await guard({ vandal: "adopt" })).caught).toEqual(["links"]);
  });

  it("control: a node building its topology in a shared pooled buffer is caught", async () => {
    // The snapshot sees the downstream instance's rewrite; reading the cache
    // after the fresh cook would not, because that cook rewrote the pool
    // back to the expected bytes.
    expect(await guard({ pooled: true })).toEqual({ caught: ["pooled"], lateRead: [] });
  });
});
