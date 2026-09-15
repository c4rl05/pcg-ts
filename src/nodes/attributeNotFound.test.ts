/**
 * A missing attribute at the node seam: a field reader's
 * `AttributeNotFoundError` learns its node type and param in
 * `resolveOn` / `resolveOnAllowingNonFinite`, reaches the caller as the
 * cause of a `NodeExecutionError` whose record keeps the
 * `attribute-not-found` code with the node id added, and survives the
 * worker boundary. The class and message shape themselves are pinned in
 * `src/data/attributeNotFound.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { AttributeNotFoundError, createPointCloud } from "../data/index.js";
import { type Diagnostic, diagnosticsOf } from "../diagnostics/index.js";
import { attribute, evaluateField } from "../fields/index.js";
import { Graph, NodeExecutionError, cook, makeGeometryItem } from "../graph/index.js";
import { decodeError, encodeError, type EncodedError } from "../worker/protocol.js";
import { attributeReduce, removeAttribute, setAttribute } from "./attributes.js";
import { filterByAttribute, filterByExpression } from "./filtering.js";
import { sampleNearestPoint } from "./neighborhood.js";
import { runNode } from "./nodes.testsupport.js";
import { pointScatterInBounds } from "./sources.js";

/** A scatter, a reduce that puts `height` on DETAIL only, and the graph. */
function detailHeightGraph() {
  const graph = new Graph(7);
  const src = graph.add(
    pointScatterInBounds,
    { count: 12, boundsMin: [0, 0, 0], boundsMax: [10, 0, 10] },
    "src",
  );
  const reduce = graph.add(attributeReduce, { name: "density", mode: "max", outName: "height" }, "reduce");
  graph.connect(src, "out", reduce, "in");
  return { graph, reduce };
}

/** Cook, returning whatever it threw (or `undefined` when it did not). */
async function attempt(graph: Graph): Promise<unknown> {
  return await cook(graph).then(
    () => undefined,
    (err: unknown) => err,
  );
}

describe("a missing attribute through a node cook", () => {
  it("reads a detail-only attribute from a point field: typed cause, node and param named", async () => {
    const { graph, reduce } = detailHeightGraph();
    const set = graph.add(setAttribute, { name: "h2", value: attribute("height") }, "lift");
    graph.connect(reduce, "out", set, "in");
    graph.output(set, "out", "out");

    const err = await attempt(graph);
    expect(err).toBeInstanceOf(NodeExecutionError);
    const exec = err as NodeExecutionError;
    expect(exec.nodeId).toBe("lift");

    const cause = exec.cause;
    expect(cause).toBeInstanceOf(AttributeNotFoundError);
    const missing = cause as AttributeNotFoundError;
    expect(missing.attribute).toBe("height");
    expect(missing.domain).toBe("point");
    expect(missing.foundOn).toEqual(["detail"]);
    expect(missing.param).toBe("value");
    expect(missing.message).toMatch(
      /^setAttribute: param "value": point attribute "height" not found; available point attributes: [^;]+; "height" exists on the detail domain — a point field cannot read a detail attribute; promote it first with promoteAttribute \(name "height", from "detail", to "point", mode "first"\)$/,
    );
    // The reader's own error, unprefixed, is kept one level down.
    expect((missing.cause as Error).message).toBe(missing.message.slice('setAttribute: param "value": '.length));
    expect(exec.message).toBe(`node "lift" failed: ${missing.message}`);

    const [record] = diagnosticsOf(err);
    expect(record).toMatchObject({
      code: "attribute-not-found",
      severity: "error",
      message: exec.message,
      nodeId: "lift",
      nodePath: ["lift"],
      param: "value",
      got: "height",
      fix: 'insert promoteAttribute (name "height", from "detail", to "point", mode "first") before this read',
    });
    expect(record?.valid).toEqual(missing.available);
  });

  it("suggests the near miss", async () => {
    const { graph, reduce } = detailHeightGraph();
    const set = graph.add(setAttribute, { name: "d2", value: attribute("densty") }, "copy");
    graph.connect(reduce, "out", set, "in");
    graph.output(set, "out", "out");

    const err = await attempt(graph);
    const missing = (err as NodeExecutionError).cause as AttributeNotFoundError;
    expect(missing).toBeInstanceOf(AttributeNotFoundError);
    expect(missing.didYouMean).toEqual(["density"]);
    expect(missing.foundOn).toEqual([]);
    expect(missing.message).toMatch(/ not found; did you mean "density"\? available point attributes: [^;]*density/);
    expect(diagnosticsOf(err)[0]).toMatchObject({
      code: "attribute-not-found",
      nodeId: "copy",
      param: "value",
      didYouMean: ["density"],
    });
    expect(diagnosticsOf(err)[0]?.fix).toBeUndefined();
  });

  it("is named on the exempt resolve too (resolveOnAllowingNonFinite)", async () => {
    const { graph, reduce } = detailHeightGraph();
    const filter = graph.add(filterByExpression, { predicate: attribute("heigt") }, "keep");
    graph.connect(reduce, "out", filter, "in");
    graph.output(filter, "out", "out");

    const err = await attempt(graph);
    const missing = (err as NodeExecutionError).cause as AttributeNotFoundError;
    expect(missing).toBeInstanceOf(AttributeNotFoundError);
    expect(missing.message).toMatch(/^filterByExpression: param "predicate": point attribute "heigt" not found; /);
    expect(diagnosticsOf(err)[0]).toMatchObject({ code: "attribute-not-found", param: "predicate", nodeId: "keep" });
  });

  it("re-words only that class: any other field error passes through as thrown", async () => {
    const { graph, reduce } = detailHeightGraph();
    const set = graph.add(setAttribute, { name: "pp", value: attribute("P", 1) }, "narrow");
    graph.connect(reduce, "out", set, "in");
    graph.output(set, "out", "out");

    const err = await attempt(graph);
    const cause = (err as NodeExecutionError).cause as Error;
    expect(cause).not.toBeInstanceOf(AttributeNotFoundError);
    expect(cause.message).toBe('attribute "P": expected tupleSize 1, got 3');
    expect(diagnosticsOf(err)[0]?.code).toBe("node-execution-failed");
  });

  it("carries no prefix when a field is evaluated outside a node", async () => {
    const { graph, reduce } = detailHeightGraph();
    graph.output(reduce, "out", "out");
    const result = await cook(graph);
    const geo = result.outputs["out"]?.[0];
    expect(geo?.kind).toBe("geometry");
    if (geo?.kind !== "geometry") return;
    let thrown: unknown;
    try {
      evaluateField(attribute("height"), { geo: geo.geo, domain: "point", seed: 0 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(AttributeNotFoundError);
    expect((thrown as Error).message).toMatch(/^point attribute "height" not found; /);
    expect((thrown as AttributeNotFoundError).param).toBeUndefined();
  });

  it("a hand-rolled node lookup throws the same typed fault", async () => {
    const { graph, reduce } = detailHeightGraph();
    const filter = graph.add(filterByAttribute, { attribute: "height" }, "gate");
    graph.connect(reduce, "out", filter, "in");
    graph.output(filter, "out", "out");

    const err = await attempt(graph);
    const missing = (err as NodeExecutionError).cause as AttributeNotFoundError;
    expect(missing).toBeInstanceOf(AttributeNotFoundError);
    expect(missing.foundOn).toEqual(["detail"]);
    expect(missing.message).toMatch(
      /^filterByAttribute: point attribute "height" not found; available point attributes: [^;]+ — but "height" IS a /,
    );
    expect(diagnosticsOf(err)[0]).toMatchObject({ code: "attribute-not-found", param: "attribute", nodeId: "gate" });
  });
});

describe("hand-rolled lookups: what each reader adds to the record", () => {
  it("removeAttribute states the INPUT's names and offers a fix only for a single name", async () => {
    const geo = createPointCloud(2);
    geo.attrs.point.add("a", "f32", 1);
    geo.attrs.detail.add("b", "f32", 1);
    const inputNames = geo.attrs.point.names();
    const one = [makeGeometryItem(geo)];

    const listed = await runNode(removeAttribute, { names: ["a", "b"] }, { in: one }).catch((e: unknown) => e);
    expect(listed).toBeInstanceOf(AttributeNotFoundError);
    const many = listed as AttributeNotFoundError;
    // "a" was already stripped from the clone when "b" failed; the list is
    // still what was connected.
    expect(many.available).toEqual(inputNames);
    expect(many.message).toContain('"b" exists on the detail domain — set param "domain" to "detail"');
    expect(many.diagnostics[0]).toMatchObject({ code: "attribute-not-found", param: "names" });
    expect(many.diagnostics[0]?.fix).toBeUndefined();

    const single = await runNode(removeAttribute, { names: ["b"] }, { in: one }).catch((e: unknown) => e);
    expect((single as AttributeNotFoundError).diagnostics[0]?.fix).toBe('set param "domain" to "detail"');
  });

  it("sampleNearestPoint names the source pin", async () => {
    const src = createPointCloud(1);
    src.attrs.detail.add("tint", "f32", 1);
    const err = await runNode(
      sampleNearestPoint,
      { attribute: "tint" },
      { in: [makeGeometryItem(createPointCloud(1))], source: [makeGeometryItem(src)] },
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AttributeNotFoundError);
    expect((err as AttributeNotFoundError).diagnostics[0]).toMatchObject({
      pin: "source",
      param: "attribute",
      fix: 'insert promoteAttribute (name "tint", from "detail", to "point", mode "first") on the geometry reaching input pin "source" before this read',
    });
  });
});

describe("a missing attribute across the worker boundary", () => {
  it("keeps the record: code, param, didYouMean and nodeId", async () => {
    const { graph, reduce } = detailHeightGraph();
    const set = graph.add(setAttribute, { name: "d2", value: attribute("densty") }, "copy");
    graph.connect(reduce, "out", set, "in");
    graph.output(set, "out", "out");
    const err = await attempt(graph);
    expect(err).toBeInstanceOf(NodeExecutionError);

    const back = decodeError(structuredClone(encodeError(err)) as EncodedError);
    expect(back).toBeInstanceOf(NodeExecutionError);
    expect((back as NodeExecutionError).nodeId).toBe("copy");
    expect(back.message).toBe((err as Error).message);
    const records: readonly Diagnostic[] = diagnosticsOf(back);
    expect(records).toEqual(diagnosticsOf(err));
    expect(records[0]).toMatchObject({
      code: "attribute-not-found",
      param: "value",
      didYouMean: ["density"],
      nodeId: "copy",
      nodePath: ["copy"],
    });
  });

  it("classifies a bare AttributeNotFoundError that lost its records by name", () => {
    const back = decodeError({ name: "AttributeNotFoundError", message: 'point attribute "x" not found' });
    expect(back.name).toBe("AttributeNotFoundError");
    expect(diagnosticsOf(back)[0]?.code).toBe("attribute-not-found");
  });
});
