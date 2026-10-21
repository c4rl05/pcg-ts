/**
 * `PinDef.optional` held to the cook, for every registered node type and
 * for the three wrappers.
 *
 * The flag is a CLAIM about execute — "this node cooks with the pin left
 * open" — and `diagnoseGraph` turns that claim into an error or into
 * silence. A claim nobody measures drifts, so this cooks each type with
 * exactly ONE input pin unconnected and every other one fed: a pin the
 * registry calls required must throw a message naming the pin, and a pin it
 * calls optional must cook.
 *
 * The wrappers have no pins of their own in the registry (their entries are
 * metadata-only), so each is built around a small inline body that exposes
 * required and optional pins in several shapes, and the same measurement
 * fixes the rule their pins follow: an exposed pin is required exactly when
 * leaving it alone open starves the body (through nested wrappers and
 * zero-iteration loops), and `forEach`'s iterated pin is optional whatever
 * sits behind it. A wrapper's failure names the INNER pin the exposed one
 * feeds — the body's node is what throws — so that is the name asserted
 * for them.
 */
import { describe, expect, it } from "vitest";
import "../runtime/index.js";
import "../spawn/index.js";
import { createPointCloud } from "../data/index.js";
import { type DataCollection, makeGeometryItem, makeValueItem } from "../graph/data.js";
import { cook } from "../graph/execute.js";
import { Graph } from "../graph/graph.js";
import type { NodeDef, PinDef } from "../graph/node.js";
import { subgraphNode } from "../graph/subgraph.js";
import { dataInput } from "../runtime/dataInput.js";
import { forEachNode } from "./forEach.js";
import { attributeReduce, getNodeType, listNodeTypes, mergePoints, transformPoints } from "./index.js";
import { repeatUntilNode } from "./repeatUntil.js";

/** A small cloud on a line: enough for any node that reads points. */
function trivialCloud(): DataCollection {
  const geo = createPointCloud(4);
  const P = geo.attrs.point.require("P");
  for (let i = 0; i < 4; i++) P.setTuple(i, [i, 0, i * 0.5]);
  return [makeGeometryItem(geo)];
}

function feedFor(pin: PinDef): DataCollection {
  return pin.kind === "value" ? [makeValueItem(1)] : trivialCloud();
}

interface Outcome {
  readonly threw: boolean;
  readonly message: string;
}

/** Cook `def` with `open` left unconnected and every other input fed. */
async function cookWithOpenPin(
  def: NodeDef<Record<string, unknown>>,
  open: string,
  params?: Record<string, unknown>,
): Promise<Outcome> {
  const g = new Graph(11);
  const node = g.add(def, params, "n");
  for (const pin of def.inputs) {
    if (pin.name === open) continue;
    const src = g.add(dataInput, { items: feedFor(pin) }, `src_${pin.name}`);
    g.connect(src, "out", node, pin.name);
  }
  const first = def.outputs[0];
  if (first === undefined) throw new Error(`${def.type} has no output pin to cook`);
  g.output(node, first.name, "out");
  try {
    await cook(g);
    return { threw: false, message: "" };
  } catch (err) {
    return { threw: true, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Params for the types whose DEFAULTS are refused before the inputs are
 * read — a node that checks its params first never reaches the pin. Only
 * enough to get past that check; each is the node's own suggested fix.
 */
const PARAMS: Record<string, Record<string, unknown>> = {
  pathShift: { attributes: ["density"], outNames: ["nextDensity"] },
  quotaRebalance: { min: [0.1, 0.3, 0.6], max: [0.2, 0.4, 0.7] },
};

/** Skip the `__test_*` fixtures other suites register. */
const standardTypes = () => listNodeTypes().filter((t) => !t.type.startsWith("__test_"));

describe("PinDef.optional, measured against the cook", () => {
  it("every registered type: required pins throw naming the pin, optional pins cook", async () => {
    const types = standardTypes();
    const withInputs = types.filter((t) => t.inputs.length > 0);
    // Guard the sweep: an empty set passes every assertion below.
    expect(withInputs.length).toBeGreaterThan(40);
    const wrong: string[] = [];
    const optional: string[] = [];
    let pins = 0;
    for (const info of withInputs) {
      const def = getNodeType(info.type).def;
      for (const pin of info.inputs) {
        pins++;
        if (!pin.required) optional.push(`${info.type}.${pin.name}`);
        const outcome = await cookWithOpenPin(def, pin.name, PARAMS[info.type]);
        if (pin.required) {
          if (!outcome.threw) wrong.push(`${info.type}.${pin.name} is required but cooked unconnected`);
          else if (!outcome.message.includes(`"${pin.name}"`)) {
            wrong.push(`${info.type}.${pin.name} threw without naming the pin: ${outcome.message}`);
          }
        } else if (outcome.threw) {
          wrong.push(`${info.type}.${pin.name} is optional but threw: ${outcome.message}`);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(pins).toBeGreaterThan(50);
    expect(optional.sort()).toEqual([
      "brickConnectivity.studs",
      "mergePoints.in",
      "mergePrimitives.in",
      "meshFromField.in",
      "polygonBoolean.clip",
      "volumeSample.in",
    ]);
  });

  it("the catalog carries required on every pin: inputs unless optional, outputs never", () => {
    for (const info of standardTypes()) {
      const def = getNodeType(info.type).def;
      info.inputs.forEach((pin, i) => {
        expect(pin.required).toBe((def.inputs[i] as PinDef).optional !== true);
      });
      for (const pin of info.outputs) expect(pin.required).toBe(false);
    }
  });
});

/** The pins of a wrapper def by name, with the inner pin each one feeds. */
function pinsOf(def: NodeDef<Record<string, unknown>>): Map<string, PinDef> {
  return new Map(def.inputs.map((p) => [p.name, p]));
}

/**
 * Cook a wrapper with each input left open in turn; the flag must match the
 * cook, and a throw must name `innerPin[name]`.
 */
async function measureWrapper(
  def: NodeDef<Record<string, unknown>>,
  innerPin: Record<string, string>,
  params?: Record<string, unknown>,
): Promise<Record<string, boolean>> {
  const required: Record<string, boolean> = {};
  for (const pin of def.inputs) {
    const outcome = await cookWithOpenPin(def, pin.name, params);
    const isRequired = pin.optional !== true;
    required[pin.name] = isRequired;
    expect({ pin: pin.name, threw: outcome.threw }).toEqual({ pin: pin.name, threw: isRequired });
    if (outcome.threw) expect(outcome.message).toContain(`"${innerPin[pin.name]}"`);
  }
  return required;
}

describe("wrapper pins follow the inner pin, measured", () => {
  it("subgraph: an exposed pin is required exactly when the inner pin it feeds is", async () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, { translate: [1, 0, 0] }, "t");
    const m = inner.add(mergePoints, {}, "m");
    inner.connect(t, "out", m, "in");
    const def = subgraphNode(
      inner,
      [
        { name: "shape", node: t, pin: "in" },
        { name: "extra", node: m, pin: "in" },
      ],
      [{ name: "out", node: m, pin: "out" }],
    );
    const pins = pinsOf(def);
    expect(pins.get("shape")?.optional).toBeUndefined();
    expect(pins.get("extra")?.optional).toBe(true);
    expect(await measureWrapper(def, { shape: "in", extra: "in" })).toEqual({
      shape: true,
      extra: false,
    });
  });

  it("subgraph nesting: the flag carries through a wrapper inside a wrapper", async () => {
    const body = new Graph();
    const t = body.add(transformPoints, {}, "t");
    const m = body.add(mergePoints, {}, "m");
    body.connect(t, "out", m, "in");
    const innerDef = subgraphNode(
      body,
      [
        { name: "a", node: t, pin: "in" },
        { name: "b", node: m, pin: "in" },
      ],
      [{ name: "out", node: m, pin: "out" }],
    );
    const outer = new Graph();
    const w = outer.add(innerDef, undefined, "w");
    const def = subgraphNode(
      outer,
      [
        { name: "x", node: w, pin: "a" },
        { name: "y", node: w, pin: "b" },
      ],
      [{ name: "out", node: w, pin: "out" }],
    );
    expect(await measureWrapper(def, { x: "in", y: "in" })).toEqual({ x: true, y: false });
  });

  it("subgraph: an exposed pin onto a node no output reaches is optional, because nothing cooks it", async () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    const dead = inner.add(transformPoints, {}, "dead");
    const def = subgraphNode(
      inner,
      [
        { name: "shape", node: t, pin: "in" },
        { name: "unused", node: dead, pin: "in" },
      ],
      [{ name: "out", node: t, pin: "out" }],
    );
    expect(await measureWrapper(def, { shape: "in", unused: "in" })).toEqual({
      shape: true,
      unused: false,
    });
  });

  it("subgraph: exposing a forEach's iterated pin is required when a required pin downstream starves", async () => {
    // The forEach itself cooks open (zero iterations), but it emits empty
    // collections and the transform after it throws — so the wrapper's pin
    // is required even though the inner pin it feeds is optional.
    const loop = () => {
      const body = new Graph();
      const lt = body.add(transformPoints, {}, "lt");
      return forEachNode(body, [{ name: "each", node: lt, pin: "in" }], [
        { name: "out", node: lt, pin: "out" },
      ]);
    };
    const inner = new Graph();
    const fe = inner.add(loop(), undefined, "fe");
    const after = inner.add(transformPoints, {}, "after");
    inner.connect(fe, "out", after, "in");
    const def = subgraphNode(inner, [{ name: "items", node: fe, pin: "each" }], [
      { name: "out", node: after, pin: "out" },
    ]);
    expect(await measureWrapper(def, { items: "in" })).toEqual({ items: true });

    // With nothing downstream but the output, the same exposure cooks open.
    const bare = new Graph();
    const fe2 = bare.add(loop(), undefined, "fe");
    const bareDef = subgraphNode(bare, [{ name: "items", node: fe2, pin: "each" }], [
      { name: "out", node: fe2, pin: "out" },
    ]);
    expect(await measureWrapper(bareDef, { items: "in" })).toEqual({ items: false });
  });

  it("emptiness passes through a nested subgraph, and a forEach that cannot run excuses its broadcast pin", async () => {
    const loop = (withShape: boolean) => {
      const body = new Graph();
      const lt = body.add(transformPoints, {}, "lt");
      if (!withShape) {
        return forEachNode(body, [{ name: "each", node: lt, pin: "in" }], [
          { name: "out", node: lt, pin: "out" },
        ]);
      }
      const t2 = body.add(transformPoints, {}, "t2");
      const m = body.add(mergePoints, {}, "m");
      body.connect(lt, "out", m, "in");
      body.connect(t2, "out", m, "in");
      return forEachNode(
        body,
        [
          { name: "each", node: lt, pin: "in" },
          { name: "shape", node: t2, pin: "in" },
        ],
        [{ name: "out", node: m, pin: "out" }],
      );
    };
    // P = subgraph { forEach(each <- items) } ; outer = subgraph { P -> transform }.
    const pBody = new Graph();
    const fe = pBody.add(loop(false), undefined, "fe");
    const pDef = subgraphNode(pBody, [{ name: "items", node: fe, pin: "each" }], [
      { name: "out", node: fe, pin: "out" },
    ]);
    const outerBody = new Graph();
    const p = outerBody.add(pDef, undefined, "p");
    const after = outerBody.add(transformPoints, {}, "after");
    outerBody.connect(p, "out", after, "in");
    const outer = subgraphNode(outerBody, [{ name: "items", node: p, pin: "items" }], [
      { name: "out", node: after, pin: "out" },
    ]);
    expect(await measureWrapper(outer, { items: "in" })).toEqual({ items: true });

    // A body whose forEach's iterated pin is never fed: its broadcast pin,
    // exposed alone, cooks open — zero iterations read nothing.
    const idle = new Graph();
    const idleLoop = idle.add(loop(true), undefined, "fe");
    const idleDef = subgraphNode(idle, [{ name: "shape", node: idleLoop, pin: "shape" }], [
      { name: "out", node: idleLoop, pin: "out" },
    ]);
    expect(await measureWrapper(idleDef, { shape: "in" })).toEqual({ shape: false });
  });

  for (const iterated of ["each", "eachPoint"] as const) {
    it(`forEach (${iterated}): the iterated pin is optional, broadcast pins follow the inner pin`, async () => {
      const inner = new Graph();
      const t = inner.add(transformPoints, {}, "t");
      const t2 = inner.add(transformPoints, {}, "t2");
      const m = inner.add(mergePoints, {}, "m");
      inner.connect(t, "out", m, "in");
      inner.connect(t2, "out", m, "in");
      const def = forEachNode(
        inner,
        [
          { name: iterated, node: t, pin: "in" },
          { name: "extra", node: m, pin: "in" },
          { name: "shape", node: t2, pin: "in" },
        ],
        [{ name: "out", node: m, pin: "out" }],
      );
      expect(await measureWrapper(def, { [iterated]: "in", extra: "in", shape: "in" })).toEqual({
        [iterated]: false,
        extra: false,
        shape: true,
      });
    });
  }

  it("forEach: the iterated pin is optional even when the inner pin behind it is required", () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    const def = forEachNode(inner, [{ name: "each", node: t, pin: "in" }], [
      { name: "out", node: t, pin: "out" },
    ]);
    expect(def.inputs).toEqual([{ name: "each", kind: "geometry", multi: true, optional: true }]);
  });

  /** A body that ends in a count reduction: always writes the settle signal. */
  function reduceTo(inner: Graph, from: ReturnType<Graph["add"]>) {
    const r = inner.add(attributeReduce, { mode: "count", name: "", outName: "moves" }, "r");
    inner.connect(from, "out", r, "in");
    return r;
  }

  it("repeatUntil: the carry pin follows the inner pin (optional behind a merge)", async () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    const m = inner.add(mergePoints, {}, "m");
    inner.connect(t, "out", m, "in");
    const r = reduceTo(inner, m);
    const def = repeatUntilNode(
      inner,
      [
        { name: "carry", node: m, pin: "in" },
        { name: "shape", node: t, pin: "in" },
      ],
      [{ name: "carry", node: r, pin: "out" }],
    );
    expect(
      await measureWrapper(def, { carry: "in", shape: "in" }, { maxRounds: 2, settleAttr: "moves" }),
    ).toEqual({ carry: false, shape: true });
  });

  it("repeatUntil: a carry pin into a forEach is required when the forEach's emptiness starves the body", async () => {
    const loopBody = new Graph();
    const lt = loopBody.add(transformPoints, {}, "lt");
    const loop = forEachNode(loopBody, [{ name: "each", node: lt, pin: "in" }], [
      { name: "out", node: lt, pin: "out" },
    ]);
    const inner = new Graph();
    const fe = inner.add(loop, undefined, "fe");
    const t = inner.add(transformPoints, {}, "t");
    inner.connect(fe, "out", t, "in");
    const r = reduceTo(inner, t);
    const def = repeatUntilNode(
      inner,
      [{ name: "carry", node: fe, pin: "each" }],
      [{ name: "carry", node: r, pin: "out" }],
    );
    expect(
      await measureWrapper(def, { carry: "in" }, { maxRounds: 2, settleAttr: "moves" }),
    ).toEqual({ carry: true });
  });

  it("repeatUntil: a carry pin whose emptiness empties the carried output is required", async () => {
    // carry -> forEach(each) -> carried output: nothing in the body starves,
    // but round 1 emits no geometry on "carry" and the loop refuses that.
    const loopBody = new Graph();
    const lt = loopBody.add(transformPoints, {}, "lt");
    const r = reduceTo(loopBody, lt);
    const loop = forEachNode(loopBody, [{ name: "each", node: lt, pin: "in" }], [
      { name: "out", node: r, pin: "out" },
    ]);
    const inner = new Graph();
    const fe = inner.add(loop, undefined, "fe");
    const def = repeatUntilNode(
      inner,
      [{ name: "carry", node: fe, pin: "each" }],
      [{ name: "carry", node: fe, pin: "out" }],
    );
    expect(
      await measureWrapper(def, { carry: "carry" }, { maxRounds: 2, settleAttr: "moves" }),
    ).toEqual({ carry: true });
  });

  it("repeatUntil: the carry pin follows the inner pin (required behind a transform)", async () => {
    const inner = new Graph();
    const t = inner.add(transformPoints, {}, "t");
    const r = reduceTo(inner, t);
    const def = repeatUntilNode(
      inner,
      [{ name: "carry", node: t, pin: "in" }],
      [{ name: "carry", node: r, pin: "out" }],
    );
    expect(
      await measureWrapper(def, { carry: "in" }, { maxRounds: 2, settleAttr: "moves" }),
    ).toEqual({ carry: true });
  });
});
