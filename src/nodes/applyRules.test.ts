/**
 * `applyRules`: a rewriting grammar over labelled cells, one round at a
 * time.
 *
 * What matters, in the order it matters: the loop is byte-deterministic
 * whatever the cook order or budget; a rule that received no cells is never
 * cooked (the rev-1 failure was a branch cooked on cells that lacked a
 * column only its own producer writes); every shape the loop cannot cook is
 * refused naming the node, the rule or the param and the fix; the cap is
 * reported per rule rather than thrown; scoped rolls are shared exactly by
 * the cells under one ancestor and by no others; and the JSON form
 * round-trips.
 *
 * Every count asserted here is paired with a case that makes it differ:
 * "five rounds" means nothing unless the suite can also make it say four.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Geometry, createPointCloud } from "../data/index.js";
import {
  type DataCollection,
  type DataItem,
  Graph,
  type NodeDef,
  type NodeHandle,
  cloneGeometry,
  cook,
  defineNode,
  makeGeometryItem,
  makeValueItem,
} from "../graph/index.js";
import type { ExposedPin } from "../graph/subgraph.js";
import { dataInput } from "../runtime/dataInput.js";
import {
  DEFAULT_MAX_DEPTH,
  MAX_DEPTH_CEILING,
  RULES_CUT_OFF_ATTR,
  RULES_CUT_OFF_NAMES_ATTR,
  RULE_SRC_ATTR,
  applyRulesNode,
} from "./applyRules.js";
import {
  type AxiomCell,
  type Json,
  TWO_A,
  attr,
  choose,
  cut,
  lt,
  relabel,
  rulesBody,
  rulesDoc,
  scopeGrammar,
  setF32,
  wire,
} from "./applyRules.testsupport.js";
import {
  GraphSerializationError,
  deserializeGraph,
  mergePoints,
  removeAttribute,
  serializeGraph,
  setAttribute,
} from "./index.js";
import { snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const load = (doc: Json): Graph => deserializeGraph(clone(doc));

interface Ran {
  readonly geo: Geometry;
  readonly rounds: number;
  readonly converged: number;
}

function geoOf(coll: DataCollection | undefined): Geometry {
  expect(coll).toHaveLength(1);
  const item = (coll as DataCollection)[0] as DataItem;
  if (item.kind !== "geometry") throw new Error(`expected a geometry item, got ${item.kind}`);
  return item.geo;
}

function valueOf(coll: DataCollection | undefined): number {
  expect(coll).toHaveLength(1);
  const item = (coll as DataCollection)[0] as DataItem;
  if (item.kind !== "value") throw new Error(`expected a value item, got ${item.kind}`);
  return item.value as number;
}

async function ran(g: Graph, opts: Parameters<typeof cook>[1] = {}): Promise<Ran> {
  const r = await cook(g, opts);
  return { geo: geoOf(r.outputs.out), rounds: valueOf(r.outputs.rounds), converged: valueOf(r.outputs.converged) };
}

const runDoc = (doc: Json): Promise<Ran> => ran(load(doc));

function nums(geo: Geometry, name: string, component = 0): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from({ length: geo.pointCount }, (_, i) => a.get(i, component));
}

function strs(geo: Geometry, name: string): string[] {
  const a = geo.attrs.point.require(name);
  return Array.from({ length: geo.pointCount }, (_, i) => a.getString(i));
}

function cutOff(geo: Geometry): number[] {
  const a = geo.attrs.detail.require(RULES_CUT_OFF_ATTR);
  expect(a.type).toBe("i32");
  return Array.from({ length: a.tupleSize }, (_, r) => a.get(0, r));
}

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the cook to reject with an Error");
  return err.message;
}

function thrown(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof Error) return e.message;
    throw e;
  }
  throw new Error("expected a throw");
}

/** Distinct values of `xs`, keyed by `group(i)`: one entry per group. */
function byGroup(xs: number[], group: (i: number) => number): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  xs.forEach((x, i) => {
    const k = group(i);
    const set = out.get(k) ?? new Set<number>();
    set.add(x);
    out.set(k, set);
  });
  return out;
}

// ---- code-first fixtures --------------------------------------------------

/** Cells at x = 10 i with a 2-wide unit box, seeds 100 + i, labelled `labels[i]`. */
function cellsGeo(labels: readonly string[], opts: { labelType?: "string" | "f32" | "none" } = {}): Geometry {
  const geo = createPointCloud(labels.length);
  const pts = geo.attrs.point;
  const P = pts.require("P");
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  const seed = pts.require("seed");
  const type = opts.labelType ?? "string";
  const label = type === "none" ? undefined : pts.add("piece", type, 1);
  labels.forEach((l, i) => {
    P.setTuple(i, [10 * i, 0, 0]);
    lo.setTuple(i, [10 * i, 0, 0]);
    hi.setTuple(i, [10 * i + 2, 1, 1]);
    seed.set(i, 100 + i);
    if (label?.type === "string") label.setString(i, l);
    else label?.set(i, 1);
  });
  return geo;
}

const relabelParams = (label: string) =>
  ({ name: "piece", domain: "point", type: "string", stringValue: label }) as const;
const addRelabel = (g: Graph, id: string, label: string): NodeHandle => g.add(setAttribute, relabelParams(label), id);
const pinOf = (name: string, node: NodeHandle, pin: string): ExposedPin => ({ name, node, pin });

/** Inner nodes visited, by tag. Reset by each test that reads it. */
const visits = new Map<string, number>();

/** A pass-through that counts its cooks and, with `explode`, throws instead. */
const tally = defineNode<{ tag: string; explode: boolean }>({
  type: "__test_applyRulesTally",
  inputs: [{ name: "in", kind: "geometry", multi: true }],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: { tag: "", explode: false },
  execute({ inputs, params }) {
    visits.set(params.tag, (visits.get(params.tag) ?? 0) + 1);
    if (params.explode) throw new Error(`tally "${params.tag}" was cooked`);
    return { out: (inputs.in ?? []).filter((i) => i.kind === "geometry") };
  },
});

/** Passes `in` through and writes `refCount` = the point count of `ref` on every point. */
const stampRefCount = defineNode<Record<string, never>>({
  type: "__test_applyRulesStampRefCount",
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "ref", kind: "geometry", multi: true },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  defaultParams: {},
  execute({ inputs }) {
    let count = 0;
    for (const item of inputs.ref ?? []) if (item.kind === "geometry") count += item.geo.pointCount;
    const out: DataItem[] = [];
    for (const item of inputs.in ?? []) {
      if (item.kind !== "geometry") continue;
      const geo = cloneGeometry(item.geo);
      geo.attrs.point.replace("refCount", "i32", 1, 0).fill(count, 0, geo.pointCount);
      out.push(makeGeometryItem(geo, item.tags));
    }
    return { out };
  },
});

/** Emits a VALUE item on its output, whatever it is given. */
const toValue = defineNode<Record<string, never>>({
  type: "__test_applyRulesToValue",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "value" }],
  defaultParams: {},
  execute() {
    return { out: [makeValueItem(1)] };
  },
});

/** Cook `def` with `geo` on `in` and optional broadcasts; returns the three pins. */
async function cookCode(
  def: NodeDef<Record<string, unknown>>,
  geo: Geometry,
  params: Record<string, unknown> = {},
  broadcasts: Record<string, DataItem[]> = {},
): Promise<Ran> {
  const g = new Graph(7);
  const src = g.add(dataInput, { items: [makeGeometryItem(geo)] }, "src");
  const n = g.add(def, params, "rules");
  g.connect(src, "out", n, "in");
  for (const [pin, items] of Object.entries(broadcasts)) {
    const b = g.add(dataInput, { items }, `b_${pin}`);
    g.connect(b, "out", n, pin);
  }
  g.output(n, "out", "out");
  g.output(n, "rounds", "rounds");
  g.output(n, "converged", "converged");
  return ran(g);
}

/** One-rule body: `facade` relabels its cells `done`. */
function oneRule(): NodeDef<Record<string, unknown>> {
  const inner = new Graph(5);
  const a = addRelabel(inner, "a", "done");
  return applyRulesNode(inner, [pinOf("facade", a, "in")], [pinOf("facade", a, "out")]);
}

// ---- JSON fixtures ---------------------------------------------------------

/**
 * facade -> split y into floor | floor; floor -> split x into
 * window | window; window -> relabel glass. Converges in 3 cooks.
 */
function houseGrammar(): Json {
  return rulesBody([
    { name: "facade", nodes: [cut("floors", ["floor", "floor"], "y")] },
    { name: "floor", nodes: [cut("bays", ["window", "window"])] },
    { name: "window", nodes: [relabel("glaze", "glass")] },
  ]);
}

const HOUSES: readonly AxiomCell[] = [
  { x0: 0, x1: 4, label: "facade" },
  { x0: 50, x1: 54, label: "facade" },
];

const scopeDoc = (params: Json = {}, cells: readonly AxiomCell[] = TWO_A, seed?: number): Json =>
  rulesDoc(cells, scopeGrammar(), params, seed === undefined ? {} : { seed });

const CORPUS = new URL("../../graphs/basics-apply-rules.json", import.meta.url);

// ---------------------------------------------------------------------------

describe("applyRules: the loop", () => {
  it("runs the scope grammar to its terminal cells: five cooks, converged, nothing cut off", async () => {
    const out = await runDoc(scopeDoc());
    // A -> B -> B -> E -> D -> end: five rule applications, so five cooks;
    // the sixth classification finds only `end` and stops without one.
    expect(out.rounds).toBe(5);
    expect(out.converged).toBe(1);
    expect(out.geo.pointCount).toBe(16);
    expect(new Set(strs(out.geo, "piece"))).toEqual(new Set(["end"]));
    expect(new Set(nums(out.geo, "ruleDepth"))).toEqual(new Set([5]));
    expect(nums(out.geo, "boundsMin")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 100, 101, 102, 103, 104, 105, 106, 107]);
    // One component per rule, all zero, and the lineage column is gone.
    expect(cutOff(out.geo)).toEqual([0, 0, 0, 0]);
    expect(out.geo.attrs.point.has(RULE_SRC_ATTR)).toBe(false);
    for (const r of nums(out.geo, "ruleRoll")) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });

  it("takes one round fewer when the recursion is one level shallower", async () => {
    // The falsifier for "five": stop B at depth 1, so B never recurses.
    const body = scopeGrammar();
    const nodes = (body.graph as { nodes: Json[] }).nodes;
    const bLabel = nodes.find((n) => n.id === "bLabel") as Json;
    (bLabel.params as Json).value = lt(attr("ruleDepth"), 1);
    const out = await runDoc(rulesDoc(TWO_A, body));
    expect(out.rounds).toBe(4);
    expect(out.geo.pointCount).toBe(8);
    expect(new Set(nums(out.geo, "ruleDepth"))).toEqual(new Set([4]));
  });

  it("a terminal cell on `in` leaves at depth 0, first, with no roll; fed cells settle later", async () => {
    const out = await runDoc(
      rulesDoc(
        [
          { x0: 0, x1: 8, label: "A" },
          { x0: 50, x1: 51, label: "stone" },
        ],
        scopeGrammar(),
      ),
    );
    expect(out.geo.pointCount).toBe(9);
    expect(strs(out.geo, "piece")[0]).toBe("stone");
    expect(nums(out.geo, "ruleDepth")[0]).toBe(0);
    // rollAttr is written only on FED cells; the stone was never fed, so it
    // carries the column default.
    expect(nums(out.geo, "ruleRoll")[0]).toBe(0);
    expect(nums(out.geo, "ruleDepth").slice(1)).toEqual(new Array(8).fill(5));
  });

  it("an empty `in` cooks no round and converges", async () => {
    const out = await cookCode(oneRule(), cellsGeo([]));
    expect(out.rounds).toBe(0);
    expect(out.converged).toBe(1);
    expect(out.geo.pointCount).toBe(0);
    expect(cutOff(out.geo)).toEqual([0]);
  });

  it("carries the axiom's detail attributes onto `out`, beside rulesCutOff", async () => {
    const geo = cellsGeo(["facade", "facade"]);
    geo.attrs.detail.add("lot", "i32", 1, 0).set(0, 7);
    const out = await cookCode(oneRule(), geo);
    expect(out.geo.attrs.detail.require("lot").get(0)).toBe(7);
    expect(cutOff(out.geo)).toEqual([0]);
    expect(strs(out.geo, "piece")).toEqual(["done", "done"]);
    expect(out.rounds).toBe(1);
  });

  it("depthAttr and rollAttr '' write no column", async () => {
    const out = await cookCode(oneRule(), cellsGeo(["facade"]), { depthAttr: "", rollAttr: "" });
    expect(out.geo.attrs.point.has("ruleDepth")).toBe(false);
    expect(out.geo.attrs.point.has("ruleRoll")).toBe(false);
    const named = await cookCode(oneRule(), cellsGeo(["facade"]), { depthAttr: "lvl", rollAttr: "dice" });
    expect(nums(named.geo, "lvl")).toEqual([1]);
    expect(named.geo.attrs.point.require("dice").type).toBe("f32");
  });

  it("a broadcast reaches every round, through a node shared by two rules", async () => {
    // `occ` is relabelled once by a node that reads ONLY the broadcast, and
    // both rules read that node: the sharing the isolation check allows.
    const inner = new Graph(5);
    const shared = addRelabel(inner, "shared", "occ");
    const fa = inner.add(stampRefCount, {}, "fa");
    const fb = addRelabel(inner, "fb", "floor");
    const wa = inner.add(stampRefCount, {}, "wa");
    const wb = addRelabel(inner, "wb", "glass");
    inner.connect(shared, "out", fa, "ref");
    inner.connect(fa, "out", fb, "in");
    inner.connect(shared, "out", wa, "ref");
    inner.connect(wa, "out", wb, "in");
    const def = applyRulesNode(
      inner,
      [pinOf("facade", fa, "in"), pinOf("floor", wa, "in"), pinOf("occ", shared, "in")],
      [pinOf("facade", fb, "out"), pinOf("floor", wb, "out")],
    );
    const occ = cellsGeo(["x", "x", "x"]);
    const out = await cookCode(def, cellsGeo(["facade", "facade"]), {}, { occ: [makeGeometryItem(occ)] });
    expect(out.rounds).toBe(2);
    expect(strs(out.geo, "piece")).toEqual(["glass", "glass"]);
    expect(nums(out.geo, "refCount")).toEqual([3, 3]);
  });

  it("default-fills a column one rule writes and another does not, in exposed-output order", async () => {
    // Both rules fed in round 0; only `door` writes `knob`. The products
    // concatenate in the body's exposed-OUTPUT order, so with the outputs
    // listed door-first the door cells come first.
    const body = rulesBody(
      [
        { name: "facade", nodes: [relabel("fDone", "wall")] },
        { name: "door", nodes: [setF32("knob", "knob", 2), relabel("dDone", "plank")] },
      ],
      { outputOrder: ["door", "facade"] },
    );
    const out = await runDoc(
      rulesDoc(
        [
          { x0: 0, x1: 1, label: "facade" },
          { x0: 10, x1: 11, label: "door" },
        ],
        body,
      ),
    );
    expect(strs(out.geo, "piece")).toEqual(["plank", "wall"]);
    expect(nums(out.geo, "knob")).toEqual([2, 0]);
    expect(cutOff(out.geo)).toEqual([0, 0]);
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: determinism", () => {
  const docs: [string, Json][] = [
    ["scope grammar, scoped", scopeDoc({ scoped: ["D", "B"], scopeOf: ["B", "A"] })],
    ["house grammar", rulesDoc(HOUSES, houseGrammar())],
  ];

  for (const [name, doc] of docs) {
    it(`${name}: the same bytes for every budget and on re-cooks`, async () => {
      const g = load(doc);
      const want = snapshotGeometry((await ran(g)).geo);
      for (const budgetMs of [0, 1e-6, 0.5]) {
        expect(snapshotGeometry((await ran(load(doc), { budgetMs })).geo), `budget ${budgetMs}`).toEqual(want);
      }
      // A re-cook of the same graph, and one with a budget after a cook without.
      expect(snapshotGeometry((await ran(g)).geo)).toEqual(want);
      expect(snapshotGeometry((await ran(g, { budgetMs: 0 })).geo)).toEqual(want);
    });

    it(`${name}: the same bytes with every node list inserted in reverse`, async () => {
      const want = snapshotGeometry((await runDoc(doc)).geo);
      const rev = clone(doc);
      (rev.nodes as Json[]).reverse();
      (rev.connections as Json[]).reverse();
      const rulesNode = (rev.nodes as Json[]).find((n) => n.id === "rules") as Json;
      const graph = (rulesNode.subgraph as Json).graph as Json;
      (graph.nodes as Json[]).reverse();
      (graph.connections as Json[]).reverse();
      expect(snapshotGeometry((await runDoc(rev)).geo)).toEqual(want);
    });
  }

  it("the same bytes whichever order the outputs are requested in", async () => {
    const doc = scopeDoc({ scoped: ["D"], scopeOf: ["A"] });
    const a = await cook(load(doc), { outputs: ["out", "rounds", "converged"] });
    const b = await cook(load(doc), { outputs: ["converged", "rounds", "out"] });
    const c = await cook(load(doc), { outputs: ["out"] });
    const want = snapshotGeometry(geoOf(a.outputs.out));
    expect(snapshotGeometry(geoOf(b.outputs.out))).toEqual(want);
    expect(snapshotGeometry(geoOf(c.outputs.out))).toEqual(want);
    expect(valueOf(b.outputs.rounds)).toBe(valueOf(a.outputs.rounds));
    // And rounds alone, before out was ever asked for.
    const d = await cook(load(doc), { outputs: ["rounds"] });
    expect(valueOf(d.outputs.rounds)).toBe(5);
  });

  it("the corpus graph cooks to the same bytes under a budget and on a re-cook", async () => {
    const text = readFileSync(CORPUS, "utf8");
    const g = deserializeGraph(JSON.parse(text));
    const first = await cook(g);
    const want = snapshotGeometry(geoOf(first.outputs.pieces));
    expect(valueOf(first.outputs.converged)).toBe(1);
    const budgeted = await cook(deserializeGraph(JSON.parse(text)), { budgetMs: 0 });
    expect(snapshotGeometry(geoOf(budgeted.outputs.pieces))).toEqual(want);
    expect(snapshotGeometry(geoOf((await cook(g)).outputs.pieces))).toEqual(want);
  });

  it("a different graph seed moves the rolls (they are not a constant)", async () => {
    const a = await runDoc(scopeDoc({}, TWO_A, 3));
    const b = await runDoc(scopeDoc({}, TWO_A, 4));
    expect(nums(a.geo, "ruleRoll")).not.toEqual(nums(b.geo, "ruleRoll"));
    // Structure does not depend on the seed: same boxes, same labels.
    expect(nums(a.geo, "boundsMin")).toEqual(nums(b.geo, "boundsMin"));
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: only fed rules cook", () => {
  /** facade (tally, relabel done) and trap (an exploding tally). */
  function trapBody(): NodeDef<Record<string, unknown>> {
    const inner = new Graph(5);
    const f = inner.add(tally, { tag: "facade" }, "f");
    const fr = addRelabel(inner, "fr", "done");
    inner.connect(f, "out", fr, "in");
    const t = inner.add(tally, { tag: "trap", explode: true }, "t");
    return applyRulesNode(
      inner,
      [pinOf("facade", f, "in"), pinOf("trap", t, "in")],
      [pinOf("facade", fr, "out"), pinOf("trap", t, "out")],
    );
  }

  it("never visits a rule no cell is labelled with", async () => {
    visits.clear();
    const out = await cookCode(trapBody(), cellsGeo(["facade", "facade"]));
    expect(out.rounds).toBe(1);
    expect(strs(out.geo, "piece")).toEqual(["done", "done"]);
    expect(visits.get("facade")).toBe(1);
    expect(visits.get("trap") ?? 0).toBe(0);
  });

  it("does visit it, and fails naming the round, once a cell carries its label", async () => {
    // The falsifier: the same body, one cell labelled trap.
    visits.clear();
    const msg = await rejection(cookCode(trapBody(), cellsGeo(["facade", "trap"])));
    expect(visits.get("trap")).toBe(1);
    expect(msg).toContain("applyRules: round 0");
    expect(msg).toContain("trap×1");
    expect(msg).toContain('tally "trap" was cooked');
  });

  it("does not re-visit a rule in a round that does not feed it", async () => {
    // facade -> floor (one round), floor -> done: facade cooks in round 0
    // only, floor in round 1 only.
    visits.clear();
    const inner = new Graph(5);
    const f = inner.add(tally, { tag: "facade" }, "f");
    const fr = addRelabel(inner, "fr", "floor");
    inner.connect(f, "out", fr, "in");
    const w = inner.add(tally, { tag: "floor" }, "w");
    const wr = addRelabel(inner, "wr", "done");
    inner.connect(w, "out", wr, "in");
    const def = applyRulesNode(
      inner,
      [pinOf("facade", f, "in"), pinOf("floor", w, "in")],
      [pinOf("facade", fr, "out"), pinOf("floor", wr, "out")],
    );
    const out = await cookCode(def, cellsGeo(["facade"]));
    expect(out.rounds).toBe(2);
    expect(visits.get("facade")).toBe(1);
    expect(visits.get("floor")).toBe(1);
  });

  /** facade writes `panelW` on its panels; panel reads it. */
  const readsOwnProducerColumn = (): Json =>
    rulesBody([
      {
        name: "facade",
        nodes: [cut("split", ["panel", "panel"]), setF32("width", "panelW", { fn: "box", name: "sx" })],
      },
      {
        name: "panel",
        nodes: [setF32("useW", "w2", { fn: "mul", args: [attr("panelW"), 2] }), relabel("pDone", "leaf")],
      },
    ]);

  it("a branch reading a column only its own producer rule writes passes round 0 (the rev-1 failure)", async () => {
    const out = await runDoc(rulesDoc([{ x0: 0, x1: 4, label: "facade" }], readsOwnProducerColumn()));
    expect(out.rounds).toBe(2);
    expect(strs(out.geo, "piece")).toEqual(["leaf", "leaf"]);
    expect(nums(out.geo, "w2")).toEqual([4, 4]);
  });

  it("the same branch fails when a cell reaches it WITHOUT the column, so the pass above is real", async () => {
    const msg = await rejection(runDoc(rulesDoc([{ x0: 0, x1: 4, label: "panel" }], readsOwnProducerColumn())));
    expect(msg).toContain("round 0");
    expect(msg).toContain("panel×1");
    expect(msg).toContain("panelW");
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: refused when the body is built", () => {
  /** A body whose only rule is `name` (input and output), plus `extra` exposed inputs. */
  function buildWith(inputs: string[], outputs: string[]): string {
    const inner = new Graph(5);
    const handles = new Map<string, NodeHandle>();
    for (const n of new Set([...inputs, ...outputs])) handles.set(n, addRelabel(inner, `n_${n || "empty"}`, "done"));
    return thrown(() =>
      applyRulesNode(
        inner,
        inputs.map((n) => pinOf(n, handles.get(n) as NodeHandle, "in")),
        outputs.map((n) => pinOf(n, handles.get(n) as NodeHandle, "out")),
      ),
    );
  }

  it("an empty name, on either side", () => {
    expect(buildWith([""], [""])).toContain('an exposed input has an empty name');
    expect(buildWith(["x"], ["x", ""])).toContain('an exposed output has an empty name');
  });

  it("the loop wrappers' pin names, naming the wrapper they belong to", () => {
    for (const name of ["each", "eachPoint"]) {
      const msg = buildWith([name], [name]);
      expect(msg).toContain(`exposed input "${name}"`);
      expect(msg).toContain('"forEach"');
    }
    const carry = buildWith(["carry"], ["carry"]);
    expect(carry).toContain('exposed input "carry"');
    expect(carry).toContain('"repeatUntil"');
    // Output side only: the input side is clean, so the output is what is named.
    expect(buildWith(["x"], ["x", "carry"])).toContain('exposed output "carry"');
  });

  it("this node's own pin names, and `trail`", () => {
    for (const name of ["in", "out", "trail", "rounds", "converged"]) {
      const msg = buildWith([name], [name]);
      expect(msg).toContain(`exposed input "${name}" uses a name reserved for this node's own pins`);
      expect(msg).toContain("Rename it");
    }
    expect(buildWith(["x"], ["x", "rounds"])).toContain('exposed output "rounds" uses a name reserved');
    // A broadcast may not take one either.
    expect(buildWith(["x", "out"], ["x"])).toContain('exposed input "out"');
  });

  it("a rule named root", () => {
    const msg = buildWith(["root"], ["root"]);
    expect(msg).toContain('a rule is named "root", which is reserved');
    expect(msg).toContain("Rename the rule");
    // A BROADCAST named root is not a rule and is not refused for it.
    const inner = new Graph(5);
    const a = inner.add(stampRefCount, {}, "a");
    const b = addRelabel(inner, "b", "done");
    const root = addRelabel(inner, "rootIn", "r");
    inner.connect(a, "out", b, "in");
    inner.connect(root, "out", a, "ref");
    expect(() =>
      applyRulesNode(inner, [pinOf("x", a, "in"), pinOf("root", root, "in")], [pinOf("x", b, "out")]),
    ).not.toThrow();
  });

  it("an output with no same-named input, with did-you-mean against the unpaired inputs", () => {
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    const w = inner.add(stampRefCount, {}, "w");
    const occ = addRelabel(inner, "occ", "o");
    inner.connect(occ, "out", w, "ref");
    const msg = thrown(() =>
      applyRulesNode(
        inner,
        [pinOf("facade", a, "in"), pinOf("window", w, "in"), pinOf("occluder", occ, "in")],
        [pinOf("facade", a, "out"), pinOf("windw", w, "out")],
      ),
    );
    expect(msg).toContain('exposed output "windw" has no same-named exposed input, so it is not a rule');
    expect(msg).toContain('did you mean "window"');
    expect(msg).toContain('"window", "occluder"');
    expect(msg).toContain("Rename one side");
  });

  it("zero rules", () => {
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    const msg = thrown(() => applyRulesNode(inner, [pinOf("occ", a, "in")], []));
    expect(msg).toContain("the body declares no rule");
    expect(msg).toContain("Expose the rule's first node as input X and its last as output X");
  });

  it("a branch depending on another rule's input, naming the node and both rules", () => {
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    const b = addRelabel(inner, "b", "done");
    const m = inner.add(mergePoints, {}, "m");
    inner.connect(a, "out", m, "in");
    inner.connect(b, "out", m, "in");
    const msg = thrown(() =>
      applyRulesNode(
        inner,
        [pinOf("facade", a, "in"), pinOf("door", b, "in")],
        [pinOf("facade", a, "out"), pinOf("door", m, "out")],
      ),
    );
    expect(msg).toContain('rule "door"\'s output depends on inner node "a", which rule "facade"\'s input feeds');
    expect(msg).toContain("Duplicate the node per rule");
  });

  it("a rule whose input does not reach its output", () => {
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    const b = addRelabel(inner, "b", "done");
    const msg = thrown(() => applyRulesNode(inner, [pinOf("facade", a, "in")], [pinOf("facade", b, "out")]));
    expect(msg).toContain('rule "facade"\'s input (inner node "a") does not reach its output (inner node "b")');
    expect(msg).toContain("Wire the rule's input through to its output");
  });

  it("a dead broadcast", () => {
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    const occ = addRelabel(inner, "occ", "o");
    const msg = thrown(() =>
      applyRulesNode(inner, [pinOf("facade", a, "in"), pinOf("occluder", occ, "in")], [pinOf("facade", a, "out")]),
    );
    expect(msg).toContain('exposed input "occluder" has no same-named output, which makes it a BROADCAST');
    expect(msg).toContain('no rule\'s output depends on its inner node "occ"');
    expect(msg).toContain('expose its branch\'s last node as output "occluder"');
  });

  it("an exposed param colliding with an own param", () => {
    for (const own of ["maxDepth", "labelAttr", "depthAttr", "rollAttr", "scoped", "scopeOf"]) {
      const inner = new Graph(5);
      const a = addRelabel(inner, "a", "done");
      const msg = thrown(() =>
        applyRulesNode(
          inner,
          [pinOf("facade", a, "in")],
          [pinOf("facade", a, "out")],
          [{ name: own, targets: [{ node: a, param: "stringValue" }], schema: { type: "string", default: "done", description: "a label" } }],
        ),
      );
      expect(msg).toContain(`exposed param "${own}" collides with this node's own param`);
      expect(msg).toContain("rename it");
    }
  });

  it("a refusal leaves the inner graph unwrapped and reusable", () => {
    // resolveRules runs BEFORE any plumbing is injected: after a refused
    // build the same inner graph wraps cleanly.
    const inner = new Graph(5);
    const a = addRelabel(inner, "a", "done");
    expect(() => applyRulesNode(inner, [pinOf("facade", a, "in")], [pinOf("facad", a, "out")])).toThrow();
    expect(() => applyRulesNode(inner, [pinOf("facade", a, "in")], [pinOf("facade", a, "out")])).not.toThrow();
  });

  it("the own params' schema: maxDepth defaults to 32 within 1..1024", () => {
    const def = oneRule();
    expect(def.defaultParams.maxDepth).toBe(DEFAULT_MAX_DEPTH);
    expect(DEFAULT_MAX_DEPTH).toBe(32);
    expect(MAX_DEPTH_CEILING).toBe(1024);
    expect(def.defaultParams).toMatchObject({
      labelAttr: "piece",
      depthAttr: "ruleDepth",
      rollAttr: "ruleRoll",
      scoped: [],
      scopeOf: [],
    });
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: refused when it cooks", () => {
  const house = (params: Json, cells: readonly AxiomCell[] = HOUSES): Promise<string> =>
    rejection(runDoc(rulesDoc(cells, houseGrammar(), params)));

  it("scoped and scopeOf of different lengths", async () => {
    const msg = await house({ scoped: ["window"], scopeOf: [] });
    expect(msg).toContain('param "scoped" has 1 entry but "scopeOf" has 0');
    expect(msg).toContain("give one scope per scoped rule");
  });

  it("a scoped entry that is not a rule, with did-you-mean", async () => {
    const msg = await house({ scoped: ["windw"], scopeOf: ["facade"] });
    expect(msg).toContain('param "scoped" entry 0 is "windw", which is not a rule of this body');
    expect(msg).toContain('did you mean "window"');
    expect(msg).toContain('rules: "facade", "floor", "window"');
  });

  it("a scope that is neither a rule nor root, with did-you-mean over both", async () => {
    const near = await house({ scoped: ["window"], scopeOf: ["facde"] });
    expect(near).toContain('param "scopeOf" entry 0 (the scope of rule "window") is "facde"');
    expect(near).toContain('did you mean "facade"');
    expect(near).toContain('valid: "facade", "floor", "window", "root"');
    const toRoot = await house({ scoped: ["window"], scopeOf: ["rooot"] });
    expect(toRoot).toContain('did you mean "root"');
  });

  it("a rule listed twice", async () => {
    const msg = await house({ scoped: ["window", "window"], scopeOf: ["facade", "floor"] });
    expect(msg).toContain('param "scoped" lists rule "window" twice');
  });

  it("a rule scoped to itself, as a no-op", async () => {
    const msg = await house({ scoped: ["window"], scopeOf: ["window"] });
    expect(msg).toContain('rule "window" is scoped to itself');
    expect(msg).toContain('exactly what leaving it out of "scoped" does');
  });

  it("a scoped cell with no ancestor fed to the scope rule, naming rule, scope and round", async () => {
    const msg = await house({ scoped: ["window"], scopeOf: ["facade"] }, [
      { x0: 0, x1: 4, label: "facade" },
      { x0: 50, x1: 51, label: "window" },
    ]);
    expect(msg).toContain('rule "window" is scoped to "facade"');
    expect(msg).toContain("of round 0's frontier");
    expect(msg).toContain('has no ancestor that was fed to "facade"');
    expect(msg).toContain('Scope it to "root"');
    // The falsifier: the same cells scoped to root cook.
    const ok = await runDoc(
      rulesDoc(
        [
          { x0: 0, x1: 4, label: "facade" },
          { x0: 50, x1: 51, label: "window" },
        ],
        houseGrammar(),
        { scoped: ["window"], scopeOf: ["root"] },
      ),
    );
    expect(ok.converged).toBe(1);
  });

  it("rollAttr '' while scoped lists a rule", async () => {
    const msg = await house({ rollAttr: "", scoped: ["window"], scopeOf: ["facade"] });
    expect(msg).toContain('param "rollAttr" is empty, so no roll is written, but "scoped" lists 1 rule(s)');
  });

  it("stamp names that collide with each other, with a standard attribute or with the lineage column", async () => {
    expect(await house({ depthAttr: "tag", rollAttr: "tag" })).toContain(
      'params "depthAttr" and "rollAttr" both name "tag"',
    );
    expect(await house({ depthAttr: "piece" })).toContain('params "labelAttr" and "depthAttr" both name "piece"');
    const std = await house({ depthAttr: "seed" });
    expect(std).toContain('param "depthAttr" cannot write "seed"');
    expect(std).toContain("a standard point attribute");
    expect(await house({ rollAttr: "density" })).toContain('param "rollAttr" cannot write "density"');
    expect(await house({ rollAttr: RULE_SRC_ATTR })).toContain("this node's lineage column");
  });

  it("labelAttr ''", async () => {
    expect(await house({ labelAttr: "" })).toContain('param "labelAttr" is ""');
  });

  it("maxDepth outside 1..1024", async () => {
    for (const maxDepth of [0, 1025]) {
      const msg = await rejection(cookCode(oneRule(), cellsGeo(["facade"]), { maxDepth }));
      expect(msg).toContain("maxDepth");
    }
  });

  it("a stamp column already on the frontier in another shape", async () => {
    const geo = cellsGeo(["facade"]);
    geo.attrs.point.add("ruleDepth", "f32", 1, 0);
    const msg = await rejection(cookCode(oneRule(), geo));
    expect(msg).toContain('depthAttr "ruleDepth" already exists on the frontier as f32 tuple 1');
    expect(msg).toContain("Give depthAttr a name of its own");
  });

  it("labelAttr missing or non-string on `in`", async () => {
    const missing = await rejection(cookCode(oneRule(), cellsGeo(["facade"], { labelType: "none" })));
    expect(missing).toContain('input "in" has no point attribute "piece" (labelAttr)');
    expect(missing).toContain("Point attributes there: P,");
    const numeric = await rejection(cookCode(oneRule(), cellsGeo(["facade"], { labelType: "f32" })));
    expect(numeric).toContain('input "in" has a non-string (f32 tuple 1) point attribute "piece"');
    // labelAttr pointed elsewhere: the same cells have no "kind".
    const elsewhere = await rejection(cookCode(oneRule(), cellsGeo(["facade"]), { labelAttr: "kind" }));
    expect(elsewhere).toContain('has no point attribute "kind" (labelAttr)');
  });

  it("labelAttr dropped or retyped on a rule's output, naming the rule and round", async () => {
    const dropped = rulesBody([{ name: "facade", nodes: [{ id: "drop", type: "removeAttribute", params: { names: ["piece"] } }] }]);
    const a = await rejection(runDoc(rulesDoc([{ x0: 0, x1: 1, label: "facade" }], dropped)));
    expect(a).toContain('rule "facade"\'s output in round 0 has no point attribute "piece"');
    const retyped = rulesBody([{ name: "facade", nodes: [setF32("num", "piece", 1)] }]);
    const b = await rejection(runDoc(rulesDoc([{ x0: 0, x1: 1, label: "facade" }], retyped)));
    expect(b).toContain('rule "facade"\'s output in round 0 has a non-string (f32 tuple 1)');
    expect(removeAttribute.type).toBe("removeAttribute");
  });

  it("a product built from scratch (lineage 0), merged in from a fresh pointList", async () => {
    const body = rulesBody([{ name: "facade", nodes: [relabel("own", "done"), { id: "m", type: "mergePoints", params: {} }] }], {
      nodes: [{ id: "fresh", type: "pointList", params: { positions: [5, 5, 5] } }, relabel("freshLabel", "done")],
      connections: [wire("fresh", "freshLabel"), wire("freshLabel", "m")],
    });
    const msg = await rejection(runDoc(rulesDoc([{ x0: 0, x1: 1, label: "facade" }], body)));
    expect(msg).toContain('round 0: product 1 of rule "facade" carries __ruleSrc 0');
    expect(msg).toContain("Build a rule's products FROM ITS INPUT");
  });

  /** facade and door, both fed; facade's products merge in a broadcast cell. */
  function lineageThief(): NodeDef<Record<string, unknown>> {
    const inner = new Graph(5);
    const f = addRelabel(inner, "f", "done");
    const m = inner.add(mergePoints, {}, "m");
    const stolen = addRelabel(inner, "stolen", "done");
    inner.connect(f, "out", m, "in");
    inner.connect(stolen, "out", m, "in");
    const d = addRelabel(inner, "d", "done");
    return applyRulesNode(
      inner,
      [pinOf("facade", f, "in"), pinOf("door", d, "in"), pinOf("loot", stolen, "in")],
      [pinOf("facade", m, "out"), pinOf("door", d, "out")],
    );
  }

  function loot(src: number): DataItem[] {
    const geo = cellsGeo(["x"]);
    geo.attrs.point.add(RULE_SRC_ATTR, "u32", 1, 0).set(0, src);
    return [makeGeometryItem(geo)];
  }

  it("a product naming a cell fed to ANOTHER rule (a broadcast cell carrying a lineage column)", async () => {
    // Fed list is rule-major in exposed-output order: facade cells are
    // 1..2, the door cell is 3.
    const cells = cellsGeo(["facade", "door", "facade"]);
    const msg = await rejection(cookCode(lineageThief(), cells, {}, { loot: loot(3) }));
    expect(msg).toContain('round 0: product 2 of rule "facade" names a cell fed to another rule');
    // The falsifier: lineage 1 names a facade cell and is accepted.
    const ok = await cookCode(lineageThief(), cellsGeo(["facade", "door", "facade"]), {}, { loot: loot(1) });
    expect(ok.geo.pointCount).toBe(4);
  });

  it("a product whose lineage is out of range", async () => {
    const msg = await rejection(cookCode(lineageThief(), cellsGeo(["facade", "door"]), {}, { loot: loot(999) }));
    expect(msg).toContain('product 1 of rule "facade" carries __ruleSrc 999, which no cell fed this round has');
  });

  it("a non-geometry item on a rule's output", async () => {
    const inner = new Graph(5);
    const v = inner.add(toValue, {}, "v");
    const def = applyRulesNode(inner, [pinOf("facade", v, "in")], [pinOf("facade", v, "out")]);
    const msg = await rejection(cookCode(def, cellsGeo(["facade"])));
    expect(msg).toContain('round 0: rule "facade" emitted a value item');
    expect(msg).toContain('Emit instances downstream of the node, from "out"');
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: the depth cap is reported, not thrown", () => {
  /** A <-> B: each relabels its cells to the other. */
  const cycle = (outputOrder?: string[]): Json =>
    rulesBody(
      [
        { name: "A", nodes: [relabel("toB", "B")] },
        { name: "B", nodes: [relabel("toA", "A")] },
      ],
      outputOrder === undefined ? {} : { outputOrder },
    );

  it("a relabel cycle: converged 0, rounds = maxDepth, the cut-off cell at depth maxDepth, counted against its rule", async () => {
    const out = await runDoc(rulesDoc([{ x0: 0, x1: 1, label: "A" }], cycle(), { maxDepth: 3 }));
    expect(out.converged).toBe(0);
    expect(out.rounds).toBe(3);
    // A -> B -> A -> B: after three rounds the cell carries B, unexpanded.
    expect(strs(out.geo, "piece")).toEqual(["B"]);
    expect(nums(out.geo, "ruleDepth")).toEqual([3]);
    expect(cutOff(out.geo)).toEqual([0, 1]);
    expect(out.geo.attrs.point.has(RULE_SRC_ATTR)).toBe(false);
  });

  it("counts in the body's exposed-OUTPUT order", async () => {
    const out = await runDoc(rulesDoc([{ x0: 0, x1: 1, label: "A" }], cycle(["B", "A"]), { maxDepth: 3 }));
    expect(cutOff(out.geo)).toEqual([1, 0]);
    // One round more moves the cell to A: the count follows the label.
    const four = await runDoc(rulesDoc([{ x0: 0, x1: 1, label: "A" }], cycle(["B", "A"]), { maxDepth: 4 }));
    expect(cutOff(four.geo)).toEqual([0, 1]);
    expect(four.rounds).toBe(4);
  });

  it("a rule that keeps its own label: every such cell counted, terminal ones untouched", async () => {
    const body = rulesBody([{ name: "loop", nodes: [relabel("same", "loop")] }]);
    const out = await runDoc(
      rulesDoc(
        [
          { x0: 0, x1: 1, label: "loop" },
          { x0: 10, x1: 11, label: "stone" },
          { x0: 20, x1: 21, label: "loop" },
        ],
        body,
        { maxDepth: 4 },
      ),
    );
    expect(out.converged).toBe(0);
    expect(out.rounds).toBe(4);
    expect(cutOff(out.geo)).toEqual([2]);
    expect(strs(out.geo, "piece")).toEqual(["stone", "loop", "loop"]);
    expect(nums(out.geo, "ruleDepth")).toEqual([0, 4, 4]);
  });

  it("a rule that sheds one terminal cell a round: settled cells carry their round, the survivor maxDepth", async () => {
    const body = rulesBody([{ name: "keep", nodes: [cut("shed", ["keep", "done"])] }]);
    const out = await runDoc(rulesDoc([{ x0: 0, x1: 8, label: "keep" }], body, { maxDepth: 3 }));
    expect(out.rounds).toBe(3);
    expect(out.converged).toBe(0);
    expect(strs(out.geo, "piece")).toEqual(["done", "done", "done", "keep"]);
    expect(nums(out.geo, "ruleDepth")).toEqual([1, 2, 3, 3]);
    expect(cutOff(out.geo)).toEqual([1]);
  });

  it("maxDepth exactly the grammar's depth converges; one less cuts the last rule off", async () => {
    const enough = await runDoc(scopeDoc({ maxDepth: 5 }));
    expect(enough.converged).toBe(1);
    expect(enough.rounds).toBe(5);
    expect(cutOff(enough.geo)).toEqual([0, 0, 0, 0]);
    const short = await runDoc(scopeDoc({ maxDepth: 4 }));
    expect(short.converged).toBe(0);
    expect(short.rounds).toBe(4);
    // Rules in exposed-output order A, B, E, D: the sixteen D cells were cut off.
    expect(cutOff(short.geo)).toEqual([0, 0, 0, 16]);
    expect(new Set(strs(short.geo, "piece"))).toEqual(new Set(["D"]));
    expect(new Set(nums(short.geo, "ruleDepth"))).toEqual(new Set([4]));
  });

  it("a terminating grammar reports all zeros, one per rule", async () => {
    const out = await runDoc(rulesDoc(HOUSES, houseGrammar()));
    expect(out.converged).toBe(1);
    expect(out.rounds).toBe(3);
    expect(cutOff(out.geo)).toEqual([0, 0, 0]);
    expect(out.geo.pointCount).toBe(8);
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: scoped rolls", () => {
  const rolls = async (params: Json, cells: readonly AxiomCell[] = TWO_A, seed?: number) => {
    const out = await runDoc(scopeDoc(params, cells, seed));
    return { geo: out.geo, roll: nums(out.geo, "ruleRoll"), bRoll: nums(out.geo, "bRoll"), x0: nums(out.geo, "boundsMin") };
  };
  const sizes = (m: Map<number, Set<number>>): number[] => [...m.values()].map((s) => s.size);
  const firsts = (m: Map<number, Set<number>>): number[] => [...m.values()].map((s) => [...s][0] as number);

  it("unscoped: every cell rolls its own number", async () => {
    const { roll } = await rolls({});
    expect(new Set(roll).size).toBe(16);
  });

  it("scoped to an ancestor rule: shared under it, different between ancestors", async () => {
    const { roll, x0 } = await rolls({ scoped: ["D"], scopeOf: ["A"] });
    const groups = byGroup(roll, (i) => Math.floor((x0[i] as number) / 50));
    expect(sizes(groups)).toEqual([1, 1]);
    expect(new Set(firsts(groups)).size).toBe(2);
  });

  it("root: shared across one axiom cell's whole subtree, different between axiom cells", async () => {
    const { roll, x0 } = await rolls({ scoped: ["D"], scopeOf: ["root"] });
    const groups = byGroup(roll, (i) => Math.floor((x0[i] as number) / 50));
    expect(sizes(groups)).toEqual([1, 1]);
    expect(new Set(firsts(groups)).size).toBe(2);
  });

  it("nested: the NEAREST ancestor fed to the scope rule decides, through an unscoped rule between", async () => {
    // D's nearest B ancestor is the round-2 B cell, 2 wide: pairs. The
    // round-1 B cell (4 wide) would give quads, and E sits between B and D.
    const { roll, x0 } = await rolls({ scoped: ["D"], scopeOf: ["B"] });
    const pairs = byGroup(roll, (i) => Math.floor((x0[i] as number) / 2));
    expect(pairs.size).toBe(8);
    expect(sizes(pairs)).toEqual(new Array(8).fill(1));
    expect(new Set(firsts(pairs)).size).toBe(8);
    // Explicitly not quads: the two pairs under one round-1 B differ.
    expect(roll[0]).not.toBe(roll[2]);
  });

  it("two different rules under one scope roll differently", async () => {
    const { roll, bRoll, x0 } = await rolls({ scoped: ["B", "D"], scopeOf: ["A", "A"] });
    const under = (xs: number[]) => sizes(byGroup(xs, (i) => Math.floor((x0[i] as number) / 50)));
    expect(under(roll)).toEqual([1, 1]);
    expect(under(bRoll)).toEqual([1, 1]);
    for (let i = 0; i < roll.length; i++) expect(roll[i]).not.toBe(bRoll[i]);
  });

  it("a recursive rule scoped to an ancestor rolls the same number at every depth", async () => {
    // bRoll is the round-2 B roll; scoped to A it equals the round-1 one,
    // so every B cell under an A carries one bRoll — unscoped, pairs.
    const unscoped = await rolls({});
    expect(new Set(unscoped.bRoll.slice(0, 8)).size).toBe(4);
    const scoped = await rolls({ scoped: ["B"], scopeOf: ["A"] });
    expect(new Set(scoped.bRoll.slice(0, 8)).size).toBe(1);
  });

  it("stable across re-cooks and across a change to an unrelated sibling", async () => {
    for (const params of [{}, { scoped: ["D"], scopeOf: ["B"] }, { scoped: ["D"], scopeOf: ["root"] }]) {
      const a = await rolls(params);
      const again = await rolls(params);
      expect(again.roll).toEqual(a.roll);
      // The second A cell grows to 16 wide: the first one's subtree is
      // untouched, roll for roll, while the second's moves.
      const b = await rolls(params, [TWO_A[0] as AxiomCell, { x0: 100, x1: 116, label: "A" }]);
      expect(b.roll.slice(0, 8)).toEqual(a.roll.slice(0, 8));
      expect(b.bRoll.slice(0, 8)).toEqual(a.bRoll.slice(0, 8));
      expect(b.x0.slice(0, 8)).toEqual(a.x0.slice(0, 8));
      expect(b.x0.slice(8)).not.toEqual(a.x0.slice(8));
    }
  });
});

// ---------------------------------------------------------------------------

describe("applyRules: JSON", () => {
  const ownParams: Json = {
    maxDepth: 7,
    labelAttr: "piece",
    depthAttr: "lvl",
    rollAttr: "dice",
    scoped: ["window"],
    scopeOf: ["facade"],
  };

  it("serialize -> deserialize -> serialize is byte-identical, own params included", async () => {
    const g = load(rulesDoc(HOUSES, houseGrammar(), ownParams));
    const text = JSON.stringify(serializeGraph(g));
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const node = (JSON.parse(text).nodes as Json[]).find((n) => n.id === "rules") as Json;
    expect(node.params).toMatchObject(ownParams);
    expect(node.ref).toBeUndefined();
    const payload = node.subgraph as Json;
    expect((payload.inputs as Json[]).map((p) => p.name)).toEqual(["facade", "floor", "window"]);
    expect((payload.outputs as Json[]).map((p) => p.name)).toEqual(["facade", "floor", "window"]);
    // The injected plumbing does not leak into the payload.
    expect(text).not.toContain("__out_");
    // And the round-tripped graph cooks to the same bytes, honouring the params.
    const a = await ran(g);
    const b = await ran(back);
    expect(snapshotGeometry(b.geo)).toEqual(snapshotGeometry(a.geo));
    expect(nums(a.geo, "lvl")).toEqual(new Array(8).fill(3));
    expect(a.geo.attrs.point.has("ruleDepth")).toBe(false);
  });

  it("a non-default param set survives the round trip as given", () => {
    const g = load(rulesDoc(HOUSES, houseGrammar(), { maxDepth: 2 }));
    const node = (serializeGraph(g).nodes as unknown as Json[]).find((n) => n.id === "rules") as Json;
    expect((node.params as Json).maxDepth).toBe(2);
  });

  it("serialization is the same before and after a cook", async () => {
    const g = load(scopeDoc({ scoped: ["D"], scopeOf: ["B"] }));
    const before = JSON.stringify(serializeGraph(g));
    await cook(g);
    expect(JSON.stringify(serializeGraph(g))).toBe(before);
    await cook(g, { budgetMs: 0 });
    expect(JSON.stringify(serializeGraph(g))).toBe(before);
  });

  it("the corpus graph round-trips byte-identically to its own serialization", async () => {
    const text = readFileSync(CORPUS, "utf8");
    const g = deserializeGraph(JSON.parse(text));
    const once = JSON.stringify(serializeGraph(g));
    expect(JSON.stringify(serializeGraph(deserializeGraph(JSON.parse(once))))).toBe(once);
    // The committed file omits defaulted params; its serialization writes
    // them. What it does carry, it carries as written.
    expect(JSON.parse(once)).toMatchObject(JSON.parse(text));
    await cook(g);
    expect(JSON.stringify(serializeGraph(g))).toBe(once);
  });

  it("refuses a ref payload with code wrapper-ref-unsupported, naming the node", () => {
    const doc = rulesDoc(HOUSES, houseGrammar());
    const node = (doc.nodes as Json[]).find((n) => n.id === "rules") as Json;
    delete node.subgraph;
    node.ref = { name: "someRecipe" };
    let err: unknown;
    try {
      deserializeGraph(doc);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GraphSerializationError);
    const records = (err as GraphSerializationError).diagnostics;
    const rec = records.find((d) => d.code === "wrapper-ref-unsupported");
    expect(rec).toBeDefined();
    expect(rec?.message).toContain('node "rules"');
    expect(rec?.message).toContain("Inline the body");
  });

  it("refuses a JSON body exposing carry", () => {
    const body = rulesBody([{ name: "carry", nodes: [relabel("c", "done")] }]);
    const msg = thrown(() => load(rulesDoc(HOUSES, body)));
    expect(msg).toContain('node "rules"');
    expect(msg).toContain('cannot expose input "carry"');
    expect(msg).toContain(`Change this node's "type" to "repeatUntil"`);
  });

  it("refuses a JSON body whose output has no input, with did-you-mean", () => {
    const body = rulesBody([{ name: "facade", nodes: [relabel("c", "done")] }]);
    (body.outputs as Json[])[0] = { name: "facde", node: "c", pin: "out" };
    const msg = thrown(() => load(rulesDoc(HOUSES, body)));
    expect(msg).toContain('exposed output "facde" has no same-named exposed input');
  });
});

// ---------------------------------------------------------------------------
// Found by the independent verification pass.

describe("applyRules: verification findings", () => {
  it("a duplicate exposed name is refused as a duplicate, not as a broken branch", () => {
    const inner = new Graph(5);
    const n = addRelabel(inner, "n", "done");
    const msg = thrown(() => applyRulesNode(inner, [pinOf("x", n, "in"), pinOf("x", n, "in")], [pinOf("x", n, "out")]));
    expect(msg).toContain('duplicate exposed input "x"');
  });

  it("a fractional lineage value is refused, not rounded onto some other cell", async () => {
    const body = rulesBody([
      {
        name: "facade",
        nodes: [
          setF32("retype", RULE_SRC_ATTR, { fn: "add", args: [attr(RULE_SRC_ATTR), 0.5] }),
          relabel("own", "done"),
        ],
      },
    ]);
    const msg = await rejection(runDoc(rulesDoc([{ x0: 0, x1: 1, label: "facade" }], body)));
    expect(msg).toContain("which is not a whole number");
  });

  it("an unscoped relabel-only recursion draws afresh each round, so a per-round stop chance stops", async () => {
    // "Stay A while the roll is under 0.7": setAttribute keeps a cell's
    // identity, so only the round in the roll's key makes this a coin
    // flipped every round rather than once.
    const body = rulesBody([{ name: "A", nodes: [choose("stay", ["end", "A"], lt(attr("ruleRoll"), 0.7))] }]);
    const cells: AxiomCell[] = Array.from({ length: 20 }, (_, i) => ({ x0: i * 2, x1: i * 2 + 1, label: "A" }));
    const r = await runDoc(rulesDoc(cells, body));
    expect(r.converged).toBe(1);
    expect(cutOff(r.geo)).toEqual([0]);
    expect(new Set(nums(r.geo, "ruleDepth")).size).toBeGreaterThan(2);
  });
});

describe("applyRules: second review findings", () => {
  /** An inner applyRules body: P splits into two Q cells (terminal inside it). */
  const innerBody = (): Json => rulesBody([{ name: "P", nodes: [cut("pSplit", ["Q", "Q"])] }]);

  /** An outer rule A: split into P | P, then `mid` (the nested part), then relabel to `end`. */
  function outerBody(mid: Json): Json {
    return {
      graph: {
        formatVersion: 1,
        seed: 0,
        nodes: [
          {
            id: "aSplit",
            type: "splitBox",
            params: { axis: "x", labels: ["P", "P"], sizes: [1, 1], units: ["relative", "relative"] },
          },
          mid,
          relabel("toEnd", "end"),
        ],
        connections: [wire("aSplit", "nested"), wire("nested", "toEnd")],
        outputs: [],
      },
      inputs: [{ name: "A", node: "aSplit", pin: "in" }],
      outputs: [{ name: "A", node: "toEnd", pin: "out" }],
    };
  }

  const nestedDirect = (): Json => ({ id: "nested", type: "applyRules", params: {}, subgraph: innerBody() });
  const nestedInSubgraph = (): Json => ({
    id: "nested",
    type: "subgraph",
    params: {},
    subgraph: {
      graph: {
        formatVersion: 1,
        seed: 0,
        nodes: [{ id: "ar", type: "applyRules", params: {}, subgraph: innerBody() }],
        connections: [],
        outputs: [],
      },
      inputs: [{ name: "in", node: "ar", pin: "in" }],
      outputs: [{ name: "out", node: "ar", pin: "out" }],
    },
  });

  for (const [label, mid] of [
    ["directly in a rule branch", nestedDirect],
    ["inside a subgraph in a rule branch", nestedInSubgraph],
  ] as const) {
    it(`an applyRules nested ${label} hands its products back linked to the outer cell`, async () => {
      const r = await runDoc(rulesDoc([{ x0: 0, x1: 8, label: "A" }, { x0: 20, x1: 24, label: "A" }], outerBody(mid())));
      expect(r.converged).toBe(1);
      // Two A cells -> 2 P each -> 2 Q each: eight `end` cells, tiling both boxes.
      expect(strs(r.geo, "piece")).toEqual(Array(8).fill("end"));
      expect(nums(r.geo, "boundsMin")).toEqual([0, 2, 4, 6, 20, 21, 22, 23]);
      expect(r.geo.attrs.point.has(RULE_SRC_ATTR)).toBe(false);
    });
  }

  it("hands back the lineage column `in` carried, per axiom cell, and removes none it did not", async () => {
    const geo = cellsGeo(["facade", "facade", "done"]);
    const src = geo.attrs.point.add(RULE_SRC_ATTR, "u32", 1, 0);
    [7, 8, 9].forEach((v, i) => src.set(i, v));
    const out = await cookCode(oneRule(), geo);
    // The terminal "done" cell settles in round 0, the two facades after it.
    expect(nums(out.geo, RULE_SRC_ATTR)).toEqual([9, 7, 8]);
  });

  it("the lineage column in another shape is refused without suggesting a rename of it", async () => {
    const geo = cellsGeo(["facade"]);
    geo.attrs.point.add(RULE_SRC_ATTR, "f32", 1, 0);
    const msg = await rejection(cookCode(oneRule(), geo));
    expect(msg).toContain('reserved lineage column (u32 tuple 1) and is not configurable');
    expect(msg).not.toContain("a name of its own");
  });

  it("a column two rules write in different shapes is refused naming the node, the round and the rules", async () => {
    const body = rulesBody([
      { name: "A", nodes: [setF32("wa", "w", 1), relabel("aEnd", "end")] },
      {
        name: "B",
        nodes: [
          { id: "wb", type: "setAttribute", params: { name: "w", domain: "point", type: "i32", value: 1 } },
          relabel("bEnd", "end"),
        ],
      },
    ]);
    const msg = await rejection(
      runDoc(rulesDoc([{ x0: 0, x1: 1, label: "A" }, { x0: 2, x1: 3, label: "B" }], body)),
    );
    expect(msg).toContain("applyRules: round 0's products (fed: A×1, B×1) disagree on a column's shape");
    expect(msg).toContain('"w"');
  });

  it("rulesCutOffRules names the rule behind each rulesCutOff component", async () => {
    const body = rulesBody([
      { name: "A", nodes: [relabel("ab", "B")] },
      { name: "B", nodes: [relabel("ba", "A")] },
      { name: "C", nodes: [relabel("cEnd", "end")] },
    ]);
    const r = await runDoc(rulesDoc([{ x0: 0, x1: 1, label: "A" }, { x0: 2, x1: 3, label: "C" }], body, { maxDepth: 3 }));
    expect(r.converged).toBe(0);
    const names = r.geo.attrs.detail.require(RULES_CUT_OFF_NAMES_ATTR);
    expect(names.type).toBe("string");
    expect(Array.from({ length: names.tupleSize }, (_, i) => names.getString(0, i))).toEqual(["A", "B", "C"]);
    expect(cutOff(r.geo)).toEqual([0, 1, 0]);
  });

  it("documented caveat: randomField in a relabel-only recursion repeats the parent's draw; ruleRoll does not", async () => {
    const cells: AxiomCell[] = Array.from({ length: 200 }, (_, i) => ({ x0: i * 2, x1: i * 2 + 1, label: "P" }));
    const depths = async (idx: Json): Promise<Set<number>> => {
      const body = rulesBody([{ name: "P", nodes: [choose("pick", ["P", "leaf"], idx)] }]);
      const r = await runDoc(rulesDoc(cells, body, { maxDepth: 10 }));
      return new Set(nums(r.geo, "ruleDepth"));
    };
    // The same draw every round: a cell stops in round 0 or never (cut off at 10).
    expect([...(await depths({ fn: "ge", args: [{ fn: "randomField" }, 0.5] }))].sort((a, b) => a - b)).toEqual([1, 10]);
    // The round is in the roll's key: settle depths spread out.
    expect((await depths({ fn: "ge", args: [attr("ruleRoll"), 0.5] })).size).toBeGreaterThan(4);
  });
});
