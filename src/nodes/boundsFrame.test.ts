/**
 * The box-frame refusals: a box corner written as position() plus an
 * offset, and a P set from a box position, both refused by the shape of
 * the field expression — at validate (`checkSerializedGraph`) and at cook
 * (the node's execute) — while the legitimate graphs beside them cook.
 *
 * The refused graphs are the idioms graphs written against world-space
 * bounds actually contain (the agent eval runs carried every one of them);
 * each neighbour differs from one in exactly the way that makes it right
 * under the one meaning of bounds (world = P + rot * (scale * x)).
 */
import { describe, expect, it } from "vitest";
import { diagnosticsOf } from "../diagnostics/index.js";
import { type Geometry } from "../data/index.js";
import { type DataCollection, cook } from "../graph/index.js";
import { setAttribute } from "./attributes.js";
import { boundsFrameFaults } from "./boundsFrame.js";
import { makeField } from "../fields/types.js";
import { elementCount } from "../fields/index.js";
import { checkSerializedGraph } from "./checkGraph.js";
import { deserializeGraph, fieldFromJson } from "./index.js";
import { transformPoints } from "./pointOps.js";

type Spec = Record<string, unknown>;
type Node = { id: string; type: string; params: Record<string, unknown> };

const POS: Spec = { fn: "position" };
const box = (name: string): Spec => ({ fn: "box", name });
const comp = (of: unknown, index: number): Spec => ({ fn: "component", args: [of], index });
const fn = (name: string, ...args: unknown[]): Spec => ({ fn: name, args });
const noiseAt = (position: unknown): Spec => ({ fn: "valueNoise", opts: { position } });

/** Three points off the origin, each carrying a centred 2 x 4 x 2 box: P = (-16, 0, 0), (0, 3, 0), (16, 0, 2). */
const POINTS = [-16, 0, 0, 0, 3, 0, 16, 0, 2];

/**
 * pointList -> a centred box at every point -> `tail`, in order. The tail's
 * node sits at index 2 + its position, which is what a record's `path`
 * names.
 */
function graphOf(...tail: Node[]): Record<string, unknown> {
  const nodes: Node[] = [
    { id: "pts", type: "pointList", params: { positions: POINTS } },
    { id: "cells", type: "setBounds", params: { anchor: "center", size: [2, 4, 2] } },
    ...tail,
  ];
  const connections = nodes.slice(1).map((n, i) => ({ from: [nodes[i]!.id, "out"], to: [n.id, "in"] }));
  return {
    formatVersion: 1,
    seed: 7,
    nodes,
    connections,
    outputs: [{ id: nodes[nodes.length - 1]!.id, pin: "out", name: "out" }],
  };
}

function geoOf(coll: DataCollection | undefined): Geometry {
  const item = coll?.[0];
  if (item === undefined || item.kind !== "geometry") throw new Error("expected one geometry");
  return item.geo;
}

function column(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

/** Cook the document; it must validate clean and cook. */
async function cooks(doc: Record<string, unknown>): Promise<Geometry> {
  const report = checkSerializedGraph(doc);
  expect(report.errors).toEqual([]);
  return geoOf((await cook(deserializeGraph(doc))).outputs.out);
}

/**
 * The document must be refused twice over, with the same code naming the
 * same node and param: as an error from `checkSerializedGraph` (with a
 * pointer to the param), and as the cook's rejection.
 */
async function refused(
  doc: Record<string, unknown>,
  want: { code: string; node: string; param: string },
): Promise<string> {
  const report = checkSerializedGraph(doc);
  const nodes = doc.nodes as Node[];
  const index = nodes.findIndex((n) => n.id === want.node);
  const record = report.errors.find((r) => r.code === want.code && r.param === want.param);
  expect(record, JSON.stringify(report.errors)).toBeDefined();
  expect(record).toMatchObject({
    severity: "error",
    nodeId: want.node,
    nodePath: [want.node],
    path: `/nodes/${index}/params/${want.param}`,
  });
  expect(record!.message).toContain(`node "${want.node}" (${nodes[index]!.type})`);

  const err: unknown = await cook(deserializeGraph(doc)).then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(Error);
  const [cooked] = diagnosticsOf(err);
  expect(cooked).toMatchObject({ code: want.code, nodeId: want.node, param: want.param });
  const message = (err as Error).message;
  expect(message).toContain(`${nodes[index]!.type}: param "${want.param}"`);
  return message;
}

describe("refused: a box whose two corners are position() plus an offset", () => {
  it("setBounds corners centred on position() — the old box-at-the-point idiom — both corners at validate", async () => {
    const doc = graphOf({
      id: "lots",
      type: "setBounds",
      params: { boundsMin: fn("sub", POS, [4, 0, 3]), boundsMax: fn("add", POS, [4, 9, 3]) },
    });
    const message = await refused(doc, { code: "box-corner-counts-position", node: "lots", param: "boundsMin" });
    expect(message).toContain("on axes x, y and z, and so is the other corner");
    expect(message).toContain("counts P twice");
    expect(message).toContain('"anchor" "center", "baseCenter" or "min"');
    // Validate reports the second corner too, so one fix pass clears both.
    const codes = checkSerializedGraph(doc).errors.map((r) => [r.code, r.param]);
    expect(codes).toEqual([
      ["box-corner-counts-position", "boundsMin"],
      ["box-corner-counts-position", "boundsMax"],
    ]);
  });

  it("corners that track one component through a let binding name only that axis", async () => {
    const corner = (dx: number, y: number, z: number) => ({
      fn: "let",
      bind: { px: comp(POS, 0) },
      args: [fn("vec", fn("add", { fn: "var", name: "px" }, dx), y, z)],
    });
    const doc = graphOf({ id: "lots", type: "setBounds", params: { boundsMin: corner(-4, 0, -3), boundsMax: corner(4, 9, 3) } });
    const message = await refused(doc, { code: "box-corner-counts-position", node: "lots", param: "boundsMin" });
    expect(message).toContain("on axis x,");
  });

  it("a lattice point scaled into a corner, mul(position(), [1, 0.4, 1]), is refused where the factor is 1", async () => {
    const doc = graphOf({
      id: "bricks",
      type: "setBounds",
      params: { boundsMin: fn("mul", POS, [1, 0.4, 1]), boundsMax: fn("mul", fn("add", POS, [1, 1, 1]), [1, 0.4, 1]) },
    });
    const message = await refused(doc, { code: "box-corner-counts-position", node: "bricks", param: "boundsMin" });
    expect(message).toContain("on axes x and z,");
  });

});

describe("refused: P set from a box position", () => {
  it('setAttribute "P" = box("center") — the old cell-to-instance tail — names pivotBox', async () => {
    const doc = graphOf({ id: "toCenter", type: "setAttribute", params: { name: "P", tupleSize: 3, value: box("center") } });
    const message = await refused(doc, { code: "position-from-local-box", node: "toCenter", param: "value" });
    expect(message).toContain("pivotBox");
    expect(message).toContain("offsets FROM P, not world positions");
  });

  it("the same centre spelled over the bound attributes", async () => {
    const center = fn("mul", fn("add", { fn: "attribute", name: "boundsMin" }, { fn: "attribute", name: "boundsMax" }), 0.5);
    const doc = graphOf({ id: "estateP", type: "setAttribute", params: { name: "P", tupleSize: 3, value: center } });
    await refused(doc, { code: "position-from-local-box", node: "estateP", param: "value" });
  });

  it("one axis set from the box top, the others kept, names that axis", async () => {
    const value = fn("vec", comp(POS, 0), box("y1"), comp(POS, 2));
    const doc = graphOf({ id: "top", type: "setAttribute", params: { name: "P", tupleSize: 3, value } });
    const message = await refused(doc, { code: "position-from-local-box", node: "top", param: "value" });
    expect(message).toContain("on axis y,");
  });

  it("transformPoints translate = box(\"center\") - position() moves P onto the box offset", async () => {
    const doc = graphOf({
      id: "cellCenter",
      type: "transformPoints",
      params: { translate: fn("sub", box("center"), POS) },
    });
    const message = await refused(doc, { code: "position-from-local-box", node: "cellCenter", param: "translate" });
    expect(message).toContain("pivotBox");
  });

  it("a fused device run cannot skip the refusal: the resident gates decline exactly the refused params", () => {
    const value = (spec: Spec) => fieldFromJson(spec as never);
    const set = (v: Spec) => ({ ...setAttribute.defaultParams, name: "P", tupleSize: 3, value: value(v) });
    expect(setAttribute.resident!.eligible!(set(box("center")))).toBe(false);
    expect(setAttribute.resident!.eligible!(set(fn("add", POS, box("center"))))).toBe(true);
    const move = (v: Spec) => ({ ...transformPoints.defaultParams, translate: value(v) });
    expect(transformPoints.resident!.eligible!(move(fn("sub", box("center"), POS)))).toBe(false);
    expect(transformPoints.resident!.eligible!(move(box("center")))).toBe(true);
  });
});

describe("cooks: the legitimate neighbours", () => {
  it("corners rewritten from box names stay in the box's frame", async () => {
    const geo = await cooks(
      graphOf({
        id: "raise",
        type: "setBounds",
        params: { boundsMin: fn("vec", box("x0"), fn("add", box("y0"), 1), box("z0")), boundsMax: box("hi") },
      }),
    );
    expect(column(geo, "boundsMin")).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(column(geo, "boundsMax")).toEqual([1, 2, 1, 1, 2, 1, 1, 2, 1]);
  });

  it("noise(position()) driving a box SIZE under an anchor is a box, not a double count", async () => {
    const size = fn("vec", 4, fn("add", 5, noiseAt(POS)), 4);
    const geo = await cooks(graphOf({ id: "blocks", type: "setBounds", params: { anchor: "baseCenter", size } }));
    expect(column(geo, "boundsMin").filter((_, i) => i % 3 === 1)).toEqual([0, 0, 0]);
  });

  it("noise(position()) inside a corner is not affine in P, so it is not judged", async () => {
    const max = fn("vec", 1, fn("add", 2, noiseAt(POS)), 1);
    await cooks(graphOf({ id: "lumpy", type: "setBounds", params: { boundsMin: [-1, 0, -1], boundsMax: max } }));
  });

  it("a corner reaching down to world y = 0 (-P.y) and one growing with height (0.5 P.y) are relative corners", async () => {
    const min = fn("vec", -0.5, fn("sub", 0, comp(POS, 1)), -0.5);
    const max = fn("vec", 0.5, fn("mul", comp(POS, 1), 0.5), 0.5);
    const geo = await cooks(graphOf({ id: "posts", type: "setBounds", params: { boundsMin: min, boundsMax: max } }));
    // The middle point stands at y = 3: its box reaches world y = 0 and rises 1.5 above it.
    expect(column(geo, "boundsMin").slice(3, 6)).toEqual([-0.5, -3, -0.5]);
    expect(column(geo, "boundsMax").slice(3, 6)).toEqual([0.5, 1.5, 0.5]);
  });

  it("ONE corner tracking P is half a box centred on P that reaches world y = 0", async () => {
    const min = fn("vec", -0.5, fn("mul", -1, comp(POS, 1)), -0.5);
    const max = fn("vec", 0.5, comp(POS, 1), 0.5);
    const geo = await cooks(graphOf({ id: "pillar", type: "setBounds", params: { boundsMin: min, boundsMax: max } }));
    expect(column(geo, "boundsMin").slice(3, 6)).toEqual([-0.5, -3, -0.5]);
    expect(column(geo, "boundsMax").slice(3, 6)).toEqual([0.5, 3, 0.5]);
  });

  it('a corner written alone by setAttribute is not judged: setAttribute "boundsMax" = attribute("P", 3)', async () => {
    await cooks(
      graphOf({
        id: "hi",
        type: "setAttribute",
        params: { name: "boundsMax", tupleSize: 3, value: { fn: "attribute", name: "P", tupleSize: 3 } },
      }),
    );
  });

  it("a vector attribute may hold a place: corners anchor - P and P - anchor are a box about P", async () => {
    const anchor = { fn: "attribute", name: "anchor", tupleSize: 3 };
    await cooks(
      graphOf(
        { id: "pin", type: "setAttribute", params: { name: "anchor", tupleSize: 3, value: fn("add", POS, [-1, -1, -1]) } },
        { id: "span", type: "setBounds", params: { boundsMin: fn("sub", anchor, POS), boundsMax: fn("sub", POS, anchor) } },
      ),
    );
  });

  it("P from a stored rest position plus a box offset is not judged: rest may be P", async () => {
    const geo = await cooks(
      graphOf(
        { id: "rest", type: "setAttribute", params: { name: "rest", tupleSize: 3, value: POS } },
        {
          id: "up",
          type: "setAttribute",
          params: { name: "P", tupleSize: 3, value: fn("add", { fn: "attribute", name: "rest", tupleSize: 3 }, box("hi")) },
        },
      ),
    );
    expect(column(geo, "P")).toEqual([-15, 2, 1, 1, 5, 1, 17, 2, 3]);
  });

  it("P moved by a box offset keeps its position() term", async () => {
    const geo = await cooks(
      graphOf(
        { id: "lift", type: "setBounds", params: { anchor: "baseCenter", size: [2, 4, 2] } },
        { id: "up", type: "setAttribute", params: { name: "P", tupleSize: 3, value: fn("add", POS, box("center")) } },
      ),
    );
    expect(column(geo, "P")).toEqual([-16, 2, 0, 0, 5, 0, 16, 2, 2]);
  });

  it("a SIZE written into P carries no frame: cells laid out by their widths", async () => {
    const value = fn("vec", fn("mul", { fn: "index" }, box("sx")), 0, 0);
    const geo = await cooks(graphOf({ id: "row", type: "setAttribute", params: { name: "P", tupleSize: 3, value } }));
    expect(column(geo, "P")).toEqual([0, 0, 0, 2, 0, 0, 4, 0, 0]);
  });

  it("a box read only to DECIDE where P goes is not a box position in P", async () => {
    const value = fn("select", fn("gt", box("sy"), 3), [0, 5, 0], [0, 0, 0]);
    await cooks(graphOf({ id: "pick", type: "setAttribute", params: { name: "P", tupleSize: 3, value } }));
  });

  it("transformPoints translate = box(\"center\") keeps P's own term, and scale = box(\"size\") is not judged", async () => {
    await cooks(
      graphOf(
        { id: "nudge", type: "transformPoints", params: { translate: box("center") } },
        { id: "fit", type: "setAttribute", params: { name: "scale", tupleSize: 3, value: box("size") } },
      ),
    );
  });
});

describe("boundsFrameFaults reads the expression, not its spelling", () => {
  // The same expression for both corners: the rule needs both to track P.
  const corner = (spec: unknown, bindings?: Record<string, unknown>) => {
    const f = () => fieldFromJson(spec as never, bindings as never);
    return boundsFrameFaults("setBounds", { anchor: "corners", boundsMin: f(), boundsMax: f() }).map((x) => x.code);
  };
  const refusedCorner = ["box-corner-counts-position", "box-corner-counts-position"];

  it("folds literal arithmetic, params and let to the coefficient", () => {
    expect(corner(fn("mul", fn("mul", POS, 2), 0.5))).toEqual(refusedCorner);
    expect(corner(fn("div", fn("mul", POS, 4), 4))).toEqual(refusedCorner);
    expect(corner(fn("mul", POS, { fn: "param", name: "k", value: 1 }))).toEqual(refusedCorner);
    expect(corner(fn("mul", POS, { fn: "param", name: "k", value: 0.5 }))).toEqual([]);
    expect(corner(fn("lerp", POS, [0, 0, 0], 0))).toEqual(refusedCorner);
    expect(corner(fn("lerp", POS, [0, 0, 0], 0.5))).toEqual([]);
    expect(corner({ fn: "remap", args: [POS, 0, 1, 0, 1] })).toEqual(refusedCorner);
  });

  it("branches count only when every branch agrees", () => {
    expect(corner(fn("choose", { fn: "index" }, POS, fn("add", POS, 1)))).toEqual(refusedCorner);
    expect(corner(fn("choose", { fn: "index" }, POS, [0, 0, 0]))).toEqual([]);
    expect(corner(fn("max", POS, [0, 0, 0]))).toEqual([]);
  });

  it("a selector's width counts: vec(select(vec(1, 1), 0, 0), P.y) is [0, 0, P.y], not P.y on y", () => {
    expect(corner(fn("vec", fn("select", fn("vec", 1, 1), 0, 0), comp(POS, 1)))).toEqual([]);
    // CONTROL: with a scalar selector the same shape does put P.y on y.
    expect(corner(fn("vec", fn("select", 1, 0, 0), comp(POS, 1), 0))).toEqual(refusedCorner);
  });

  it("a param bound to a field with no spec is not read through its inline value", () => {
    const opaque = makeField("opaque-zero", 3, (ctx) => ({ data: new Float32Array(elementCount(ctx) * 3), tupleSize: 3 }));
    const spec = fn("add", POS, { fn: "param", name: "x", value: [0, 0, 0] });
    expect(corner(spec, { x: opaque })).toEqual([]);
    expect(corner(spec)).toEqual(refusedCorner);
  });

  it("one corner tracking P alone is not judged", () => {
    expect(
      boundsFrameFaults("setBounds", { anchor: "corners", boundsMin: fieldFromJson(POS as never), boundsMax: [1, 1, 1] }),
    ).toEqual([]);
  });

  it("a vector attribute taints what it reaches; a scalar one does not", () => {
    expect(corner(fn("add", POS, { fn: "attribute", name: "off", tupleSize: 3 }))).toEqual([]);
    expect(corner(fn("add", POS, { fn: "attribute", name: "off" }))).toEqual([]);
    expect(corner(fn("vec", fn("add", comp(POS, 0), { fn: "attribute", name: "w" }), 0, 0))).toEqual(refusedCorner);
    expect(corner(fn("vec", fn("add", comp(POS, 0), comp({ fn: "attribute", name: "rest" }, 0)), 0, 0))).toEqual([]);
  });

  it("the taint survives lerp and remap: lerp(0, 1, anchorX) is anchorX", () => {
    const anchorX = comp({ fn: "attribute", name: "anchor", tupleSize: 3 }, 0);
    const p = (x: unknown) =>
      boundsFrameFaults("setAttribute", {
        name: "P",
        domain: "point",
        type: "f32",
        value: fieldFromJson(fn("vec", fn("add", x, box("cx")), comp(POS, 1), comp(POS, 2)) as never),
      }).length;
    expect(p(anchorX)).toBe(0);
    expect(p(fn("lerp", 0, 1, anchorX))).toBe(0);
    const w = { fn: "attribute", name: "w", tupleSize: 1 };
    expect(p({ fn: "remap", args: [anchorX, w, 1, w, 1] })).toBe(0);
    // CONTROL: a scalar weight is trusted, so the same blend of a box position is refused.
    expect(p(fn("lerp", 0, 1, w))).toBe(1);
  });

  it("a product of P with anything not a literal is not judged", () => {
    expect(corner(fn("mul", POS, { fn: "attribute", name: "s" }))).toEqual([]);
    expect(corner(fn("mul", POS, POS))).toEqual([]);
    expect(corner(fn("floor", POS))).toEqual([]);
  });

  it("an anchor never reads the corners, so they are not judged under one", () => {
    expect(
      boundsFrameFaults("setBounds", { anchor: "center", boundsMin: fieldFromJson(POS as never), size: [1, 1, 1] }),
    ).toEqual([]);
  });

  it("other domains and other attributes are not judged", () => {
    const value = fieldFromJson(box("center") as never);
    expect(boundsFrameFaults("setAttribute", { name: "P", domain: "vertex", type: "f32", value })).toEqual([]);
    expect(boundsFrameFaults("setAttribute", { name: "anchorP", domain: "point", type: "f32", value })).toEqual([]);
    expect(boundsFrameFaults("setAttribute", { name: "P", domain: "point", type: "f32", value }).length).toBe(1);
  });
});
