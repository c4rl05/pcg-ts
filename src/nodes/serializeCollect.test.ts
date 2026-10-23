/**
 * Collect-all loading: every load-time fault of a document in one throw,
 * as records with a code, a JSON pointer into the document, and the node,
 * param or pin they concern.
 *
 * The anchor is the loader as it was BEFORE it collected anything, which
 * stopped at its first fault. `SINGLE_FAULT_MESSAGES_BEFORE` is that
 * loader's message for each single-fault document in
 * `serializeFaults.testsupport.ts`, captured by feeding the same table to a
 * build of the previous commit. For a document with one fault, the new
 * loader must produce exactly one record, and its message must be the old
 * message with at most a "did you mean" clause inserted. For a document
 * with several, the first record must be the one the old loader stopped
 * at. Registry-derived lists are elided in both (`…`), because they grow
 * every time a node type, a field fn or a primitive is added, and that is
 * not what this pins.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { type Diagnostic, isDiagnostic } from "../diagnostics/index.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { FieldJsonError, fieldFromJson } from "../fields/fieldJson.js";
import { Graph } from "../graph/index.js";
import { fbm, perlinNoise } from "../noise/index.js";
import { MAX_FBM_OCTAVES } from "../noise/util.js";
import { getNodeType } from "./registry.js";
import {
  GraphSerializationError,
  type SerializedGraph,
  deserializeGraph,
  serializeGraph,
} from "./serialize.js";
import { BODY, MULTI_FAULT_CASES, SINGLE_FAULT_CASES, doc } from "./serializeFaults.testsupport.js";
import { listSubgraphs, registerSubgraph, subgraphContentHash } from "./subgraphRegistry.js";

/** The first-error loader's message for each single-fault document (see the file comment). */
const SINGLE_FAULT_MESSAGES_BEFORE: Readonly<Record<string, string>> = {
  "not an object": "deserializeGraph: expected a serialized graph object, got 42",
  "unknown top-level key": "deserializeGraph: unknown key \"notes\"; valid keys: formatVersion, seed, meta, params, nodes, connections, outputs. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "bad formatVersion": "unsupported formatVersion 2; this build reads formatVersion 1",
  "bad seed": "graph seed must be a finite number, got \"x\"",
  "nodes not an array": "\"nodes\" must be an array",
  "connections not an array": "\"connections\" must be an array",
  "outputs not an array": "\"outputs\" must be an array",
  "$schema not a string": "deserializeGraph: unknown key \"$schema\"; valid keys: formatVersion, seed, meta, params, nodes, connections, outputs. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "meta typo": "\"meta\": unknown key \"titel\"; valid keys: title, description, tags",
  "params not an array": "\"params\" must be an array of { name, value, min?, max?, description? }, got {}. It is an array rather than an object so a repeated name is detectable: JSON.parse collapses duplicate object keys before any reader sees them",
  "graph param without a name": "params[0]: \"name\" must be a non-empty string, got \"\"",
  "duplicate graph param": "params[1]: duplicate graph param \"n\"; declare each name once (a second declaration cannot be a redefinition, because a reference names one value)",
  "graph param targeting a missing param": "graph param \"n\": exposed param \"n\": node \"a\" (type \"pointScatterInBounds\") has no param \"nope\"; params: count, boundsMin, boundsMax, seed",
  "two graph params on one slot": "graph params \"n\" and \"m\" both target \"a\".count, so the slot has two declared values and takes whichever is applied last. Drive it from one of them, or split the slot into two params",
  "graph param targeting a field": "graph param \"n\" targets \"j\".amount, which holds a FIELD EXPRESSION. Writing the declared value there would leave that expression in the file and dead in the cook, so it is refused rather than chosen for you: either drop the expression from that param (the declaration then drives it), or drop the target and have the expression READ the name instead — a `param` reference inside it binds to the same declared value.",
  "authored value disagreeing with its driver": "node \"a\" param \"count\" is 5, but graph param \"n\" drives it to 7. The declaration wins on every load, so the value written on the node would be discarded silently: change the declaration, or drop the target and let the node keep its own value",
  "node not an object": "nodes[0]: expected a node object, got 3",
  "empty node id": "nodes[0]: node id must be a non-empty string, got \"\"",
  "duplicate node id": "nodes[1]: duplicate node id \"a\"",
  "unknown node key": "node \"a\": unknown key \"prams\"; valid keys: id, type, params, subgraph, ref. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "unknown node type": "node \"a\": unknown node type \"pointScatterInBound\"; registered types: …",
  "params not an object": "node \"a\": params must be an object, got []",
  "unknown param": "node \"a\": unknown param \"counts\" for type \"pointScatterInBounds\"; valid params: count, boundsMin, boundsMax, seed",
  "param out of range": "node \"a\" param \"count\": -5 is below the minimum 0",
  "enum value typo": "node \"f\" param \"mode\": expected one of \"threshold\", \"probabilistic\", got \"probablistic\"",
  "inline value shadowing a graph param": "node \"j\" param \"amount\": {\"fn\": \"param\", \"name\": \"amt\"} carries its own \"value\", but the graph declares \"amt\" in its top-level \"params\" — the graph's value would win and the inline one would be a number nothing reads. Drop the inline \"value\" to read the graph's, or rename one of the two",
  "ref on a plain node": "node \"a\": type \"pointScatterInBounds\" wraps no inner graph, so it cannot carry \"ref\"; only \"subgraph\", \"forEach\", \"repeatUntil\" and \"applyRules\" nodes wrap one (inline under \"subgraph\", or by name under \"ref\"; \"applyRules\" inline only)",
  "ref on an applyRules node": "node \"r\": an \"applyRules\" node takes its rule body INLINE, under \"subgraph\" ({ graph, inputs, outputs }); a \"ref\" to a registered recipe is not supported in this version — a recipe records no wrapper kind, and a rule body's pin names reserve nothing that could say it is one. Inline the body.",
  "unknown field fn": "node \"j\" param \"amount\": $: unknown field fn \"consant\"; valid fns: …",
  "unknown field key": "node \"j\" param \"amount\": $: unknown key \"arg\" for fn \"add\"; allowed keys: fn, args — usage: { fn: \"add\", args: [a, b] }",
  "field arity": "node \"j\" param \"amount\": $: fn \"clamp\" expects exactly 3 args, got 2",
  "field spec missing a required key": "node \"j\" param \"amount\": $.name: attribute requires a non-empty string name",
  "malformed field argument": "node \"j\" param \"amount\": $.args[1]: expected a field spec, number, or number array, got a string",
  "unknown subgraph name": "node \"s\": unknown subgraph \"fill/scatter-evn\"; registered subgraphs: …",
  "ref not an object": "node \"s\": \"ref\" must be an object { name, hash? } naming a registered subgraph, got 3",
  "unknown ref key": "node \"s\" ref: unknown key \"hsh\"; valid keys: name, hash (a reference carries the registered name and, when it pins itself, that content hash — nothing else)",
  "hash mismatch": "node \"s\": subgraph \"fill/scatter-even\" is pinned to content hash deadbeef, but the registered one hashes … — the primitive changed since this graph was written. Re-save the graph to adopt the new version, or remove \"hash\" from the ref to follow the registry.",
  "ref and payload": "node \"s\": carries both \"ref\" and \"subgraph\"; a subgraph node either references a registered subgraph by name (\"ref\") or embeds its inner graph (\"subgraph\"), never both — remove whichever is not intended",
  "payload cycle": "node \"s\" inner graph: node \"inner\": its subgraph payload reaches itself (a payload cycle); subgraph nesting must be acyclic",
  "no payload": "node \"s\": a \"subgraph\" node needs a \"subgraph\" payload object { graph, inputs, outputs } carrying its inner graph, or a \"ref\" { name } naming a registered one, got undefined",
  "unknown payload key": "node \"s\" subgraph payload: unknown key \"prams\"; valid keys: graph, inputs, outputs, params. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "fault inside a body": "node \"s\" inner graph: node \"t\": unknown node type \"warpDrive\"; registered types: …",
  "$schema inside a body": "node \"s\" inner graph: deserializeGraph: unknown key \"$schema\"; valid keys: formatVersion, seed, meta, params, nodes, connections, outputs. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "portal id collision": "node \"s\": inner node id \"__in_x\" collides with the portal node injected for exposed input \"x\" — ids \"__in_<name>\" and \"__out_<name>\" are reserved for subgraph plumbing; rename the inner node or the exposed pin",
  "iterated pin on a subgraph": "node \"s\": a \"subgraph\" node cannot expose \"each\" — those names are reserved for the pin a \"forEach\" iterates, and this body is written to be looped over. As a \"subgraph\" it would cook over the whole collection and emit one result where K were meant. Change this node's \"type\" to \"forEach\", or rename the exposed input if that is not what the body means.",
  "exposed pin on a missing inner node": "node \"s\" subgraph inputs[0] (\"in\"): unknown inner node \"ghost\"; inner nodes: t",
  "exposed pin on a missing inner pin": "node \"s\": exposed input \"in\": node \"t\" has no input pin \"warp\"",
  "exposed param on a missing inner param": "node \"s\": exposed param \"p\": node \"t\" (type \"transformPoints\") has no param \"nope\"; params: translate, rotateEuler, scale",
  "derived key on an exposed param": "node \"s\" subgraph params[0] (\"p\"): key \"type\" cannot be authored — it is derived from the targets' registered schemas; remove it. Valid keys: name, targets, description, default, min, max",
  "unknown wrapper param": "node \"s\": unknown param \"bogus\"; this subgraph node exposes: (none) (an exposed param must be declared under \"params\" in the node's \"subgraph\" payload)",
  "malformed endpoint": "connections[0].from: expected [nodeId, pinName], got [\"a\"]",
  "unknown connection key": "connections[0]: unknown key \"label\"; valid keys: from, to. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "connection from a missing node": "connections[0]: unknown source node \"ghost\"; known nodes: a, j",
  "connection from a missing pin": "connections[0]: node \"a\" has no output pin \"outt\"; valid output pins: out",
  "connection between pin kinds": "connections[0]: cannot connect v.out (value) to j.in (geometry)",
  "occupied input": "connections[1]: input pin j.in is already connected (declare it multi to allow several)",
  "cycle": "connections[1]: connecting j2.out to j1.in would create a cycle",
  "malformed output": "outputs[0]: expected { id, pin, name } strings, got {\"id\":\"a\",\"pin\":3,\"name\":\"x\"}",
  "output from a missing node": "outputs[0]: unknown node \"b\"; known nodes: a",
  "output from a missing pin": "outputs[0]: node \"a\" has no output pin \"ot\"; valid output pins: out",
  "duplicate output name": "outputs[1]: output \"x\" is already declared",
  "three faults in three phases": "deserializeGraph: unknown key \"notes\"; valid keys: formatVersion, seed, meta, params, nodes, connections, outputs. The format is closed — an unrecognized key is a typo, not an extension, so a future field arrives with a formatVersion bump. There is no annotation key: descriptive text belongs in the graph's \"meta\" block ({ title, description, tags })",
  "two bad params on one node, which is still wired": "node \"a\" param \"count\": -5 is below the minimum 0",
  "a poisoned node named by a connection, an output and a target": "node \"a\": unknown node type \"warpDrive\"; registered types: …",
  "a wrapper with a broken body, named by a connection and an output": "node \"s\" inner graph: node \"t\": unknown node type \"warpDrive\"; registered types: …",
  "a dropped param driven by a graph param": "node \"a\" param \"count\": expected an integer, got \"many\"",
  "a typo on the live end of a connection to a poisoned node": "node \"b\": unknown node type \"warpDrive\"; registered types: …",
  "a graph param with one poisoned target and one bad one": "node \"b\": unknown node type \"warpDrive\"; registered types: …",
  "a duplicate output name after an output from a poisoned node": "node \"b\": unknown node type \"warpDrive\"; registered types: …",
  "a duplicate output name after a refused output": "outputs[0]: unknown node \"typo\"; known nodes: a",
  "a node with no id, which a connection and an output may name": "nodes[0]: node id must be a non-empty string, got undefined",
  "a connection meant for the second of two nodes sharing an id": "nodes[1]: duplicate node id \"a\"",
  "a duplicate id after a poisoned node": "node \"a\": unknown node type \"warpDrive\"; registered types: …",
};

/**
 * Cases whose message changed ON PURPOSE with this unit: `$schema` used to
 * be refused as an unknown key everywhere, and is now accepted at the top
 * level and refused inside a payload with a message of its own.
 */
const CHANGED_BY_DESIGN = new Set(["$schema not a string", "$schema inside a body"]);

function elideLists(message: string): string {
  return message
    .replace(/(registered types: |valid fns: |registered subgraphs: )[^\n]*/g, "$1…")
    .replace(/(the registered one hashes )[0-9a-f]+/g, "$1…");
}

/** A message with every inserted "did you mean" clause taken back out. */
function withoutSuggestion(message: string): string {
  return message.replace(/did you mean [^?]*\? /g, "").replace(/; did you mean [^?]*\?$/gm, "");
}

/** The records a load throws, or a failure naming what happened instead. */
function recordsOf(json: unknown): { records: readonly Diagnostic[]; message: string } {
  try {
    deserializeGraph(json);
  } catch (err) {
    expect(err).toBeInstanceOf(GraphSerializationError);
    const e = err as GraphSerializationError;
    return { records: e.diagnostics, message: e.message };
  }
  throw new Error("the document loaded");
}

/** RFC 6901 lookup; `undefined` when the pointer does not resolve. */
function resolvePointer(root: unknown, pointer: string): { found: boolean; value?: unknown } {
  if (pointer === "") return { found: true, value: root };
  if (!pointer.startsWith("/")) return { found: false };
  let cur: unknown = root;
  for (const raw of pointer.slice(1).split("/")) {
    const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (typeof cur !== "object" || cur === null || !Object.hasOwn(cur, token)) return { found: false };
    cur = (cur as Record<string, unknown>)[token];
  }
  return { found: true, value: cur };
}

describe("collect-all loading: one record per single-fault document", () => {
  it("has a before-message for every case, and a case for every before-message", () => {
    const names = [...SINGLE_FAULT_CASES, ...MULTI_FAULT_CASES].map((c) => c.name).sort();
    expect(Object.keys(SINGLE_FAULT_MESSAGES_BEFORE).sort()).toEqual(names);
  });

  it.each(SINGLE_FAULT_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const { records, message } = recordsOf(c.doc);
    expect(records.map((r) => r.code)).toEqual([c.code]);
    const record = records[0] as Diagnostic;
    expect(isDiagnostic(record)).toBe(true);
    expect(record.severity).toBe("error");
    expect(record.message).toBe(message);
    expect(record.path).toBe(c.path);
    expect(resolvePointer(c.doc, c.path).found, `path ${c.path} resolves in the document`).toBe(true);
    for (const field of ["nodeId", "param", "pin", "key"] as const) {
      if (c[field] !== undefined) expect(record[field], field).toBe(c[field]);
    }
    if (c.nodePath !== undefined) expect(record.nodePath).toEqual(c.nodePath);
    if (!CHANGED_BY_DESIGN.has(c.name)) {
      expect(elideLists(withoutSuggestion(message))).toBe(
        elideLists(SINGLE_FAULT_MESSAGES_BEFORE[c.name] as string),
      );
    }
  });

  it("covers every load-time code the loader and the field grammar emit", () => {
    const covered = new Set(SINGLE_FAULT_CASES.map((c) => c.code));
    for (const code of [
      "graph-not-object",
      "unknown-key",
      "unauthorable-key",
      "unsupported-format-version",
      "invalid-seed",
      "invalid-section",
      "invalid-meta",
      "invalid-node-id",
      "duplicate-node-id",
      "unknown-node-type",
      "unknown-param",
      "invalid-param-value",
      "shadowed-graph-param",
      "wrapper-key-on-plain-node",
      "unknown-field-fn",
      "unknown-field-key",
      "field-arity",
      "invalid-field-spec",
      "unknown-subgraph",
      "invalid-subgraph-ref",
      "subgraph-hash-mismatch",
      "subgraph-ref-and-payload",
      "subgraph-cycle",
      "missing-subgraph-payload",
      "reserved-plumbing-name",
      "wrapper-kind-mismatch",
      "wrapper-ref-unsupported",
      "invalid-exposed-pin",
      "invalid-exposed-param",
      "invalid-graph-param",
      "duplicate-graph-param",
      "invalid-graph-param-target",
      "duplicate-param-target",
      "target-holds-field",
      "driven-param-conflict",
      "invalid-connection",
      "unknown-node",
      "unknown-pin",
      "pin-kind-mismatch",
      "input-pin-occupied",
      "cycle",
      "invalid-output",
      "duplicate-output-name",
    ]) {
      expect(covered.has(code), code).toBe(true);
    }
  });
});

describe("collect-all loading: several faults", () => {
  it.each(MULTI_FAULT_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const first = recordsOf(c.doc);
    expect(first.records.map((r) => r.code)).toEqual(c.codes);
    expect(first.records.map((r) => r.path)).toEqual(c.paths);
    for (const r of first.records) {
      expect(resolvePointer(c.doc, r.path as string).found, `path ${r.path} resolves`).toBe(true);
    }
    // The message is the records, one per line.
    expect(first.message).toBe(first.records.map((r) => r.message).join("\n"));
    // The first record is where the first-error loader stopped.
    expect(elideLists(withoutSuggestion((first.records[0] as Diagnostic).message))).toBe(
      elideLists(SINGLE_FAULT_MESSAGES_BEFORE[c.name] as string),
    );
    // Deterministic: a second load of the same document says the same thing.
    expect(recordsOf(c.doc)).toEqual(first);
  });

  it("two levels of nesting carry both breadcrumbs, the full pointer and the node path", () => {
    const innerWrapper = {
      id: "mid",
      type: "subgraph",
      params: {},
      subgraph: { graph: { ...BODY, nodes: [{ id: "t", type: "warpDrive", params: {} }] }, inputs: [], outputs: [] },
    };
    const json = doc({
      nodes: [
        {
          id: "outer",
          type: "subgraph",
          params: {},
          subgraph: { graph: { ...BODY, nodes: [innerWrapper] }, inputs: [], outputs: [] },
        },
      ],
    });
    const { records } = recordsOf(json);
    expect(records).toHaveLength(1);
    const r = records[0] as Diagnostic;
    expect(r.code).toBe("unknown-node-type");
    expect(r.path).toBe("/nodes/0/subgraph/graph/nodes/0/subgraph/graph/nodes/0/type");
    expect(resolvePointer(json, r.path as string).value).toBe("warpDrive");
    expect(r.nodeId).toBe("outer");
    expect(r.nodePath).toEqual(["outer", "mid", "t"]);
    expect(r.message.startsWith('node "outer" inner graph: node "mid" inner graph: node "t": unknown node type')).toBe(true);
  });

  it("stops at 100 records and says so with a truncated record", () => {
    const nodes = Array.from({ length: 150 }, (_, i) => ({ id: `n${i}`, type: "warpDrive", params: {} }));
    const { records, message } = recordsOf(doc({ nodes }));
    expect(records).toHaveLength(101);
    expect(records.slice(0, 100).every((r) => r.code === "unknown-node-type")).toBe(true);
    expect(records.map((r) => r.path).slice(0, 3)).toEqual(["/nodes/0/type", "/nodes/1/type", "/nodes/2/type"]);
    expect(records[100]?.code).toBe("truncated");
    expect(message.split("\n")).toHaveLength(101);
  });

  it("escapes / and ~ in a key the pointer names", () => {
    const json = doc({ nodes: [{ id: "a", type: "pointScatterInBounds", params: { "a/b~c": 1 } }] });
    const { records } = recordsOf(json);
    expect(records[0]?.path).toBe("/nodes/0/params/a~1b~0c");
    expect(resolvePointer(json, "/nodes/0/params/a~1b~0c")).toEqual({ found: true, value: 1 });
  });

  it("refuses a param named after an Object.prototype member, which used to be dropped silently", () => {
    for (const key of ["toString", "__proto__", "constructor", "hasOwnProperty"]) {
      const json = JSON.parse(
        `{"formatVersion":1,"seed":0,"nodes":[{"id":"a","type":"pointScatterInBounds","params":{${JSON.stringify(key)}:1}}],"connections":[],"outputs":[]}`,
      ) as unknown;
      const { records } = recordsOf(json);
      expect(records.map((r) => [r.code, r.param, r.path])).toEqual([
        ["unknown-param", key, `/nodes/0/params/${key}`],
      ]);
    }
  });

  it("refuses a graph param target named after an Object.prototype member", () => {
    const { records } = recordsOf(
      doc({
        nodes: [{ id: "a", type: "pointScatterInBounds", params: {} }],
        params: [{ name: "n", value: 3, targets: [{ node: "a", param: "toString" }] }],
      }),
    );
    expect(records.map((r) => r.code)).toEqual(["invalid-graph-param-target"]);
    expect(records[0]?.message).toMatch(/has no param "toString"/);
  });
});

describe("did you mean", () => {
  it("puts the suggestion before the long list, and a mechanical fix only for one near name", () => {
    const { records } = recordsOf(doc({ nodes: [{ id: "a", type: "pointScatterInBound", params: {} }] }));
    const r = records[0] as Diagnostic;
    expect(r.message).toMatch(
      /^node "a": unknown node type "pointScatterInBound"; did you mean "pointScatterInBounds"\? registered types: /,
    );
    expect(r.didYouMean).toEqual(["pointScatterInBounds"]);
    expect(r.got).toBe("pointScatterInBound");
    expect(r.valid).toContain("pointGrid");
    expect(r.fix).toBe('replace "pointScatterInBound" with "pointScatterInBounds"');
    // Two names equally near: both suggested, and no fix.
    const box = recordsOf(doc({ nodes: [{ id: "a", type: "pointScatterInBox", params: {} }] })).records[0];
    expect(box?.didYouMean).toEqual(["pointScatterInBounds", "pointScatterInWorld"]);
    expect(box?.fix).toBeUndefined();
  });

  it("suggests for params (standard and wrapper), enum values, node ids, pins, keys and subgraph names", () => {
    const at = (json: unknown): Diagnostic => recordsOf(json).records[0] as Diagnostic;
    expect(at(doc({ nodes: [{ id: "a", type: "pointScatterInBounds", params: { cout: 1 } }] })).didYouMean).toEqual(["count"]);
    expect(
      at(doc({ nodes: [{ id: "f", type: "filterByDensity", params: { mode: "probablistic" } }] })).message,
    ).toBe('node "f" param "mode": did you mean "probabilistic"? expected one of "threshold", "probabilistic", got "probablistic"');
    const wired = (conn: unknown): Diagnostic =>
      at(
        doc({
          nodes: [
            { id: "scatter", type: "pointScatterInBounds", params: {} },
            { id: "j", type: "jitterPoints", params: {} },
          ],
          connections: [conn],
        }),
      );
    expect(wired({ from: ["scater", "out"], to: ["j", "in"] }).message).toBe(
      'connections[0]: unknown source node "scater"; did you mean "scatter"? known nodes: scatter, j',
    );
    expect(wired({ from: ["scatter", "otu"], to: ["j", "in"] }).didYouMean).toEqual(["out"]);
    expect(at(doc({ nodez: [] })).didYouMean).toEqual(["nodes"]);
    const wrapperParam = at(
      doc({
        nodes: [
          {
            id: "s",
            type: "subgraph",
            params: { amout: 1 },
            subgraph: {
              graph: BODY,
              inputs: [],
              outputs: [],
              params: [{ name: "amount", targets: [{ node: "t", param: "translate" }], description: "d", default: [0, 0, 0] }],
            },
          },
        ],
      }),
    );
    expect(wrapperParam.code).toBe("unknown-param");
    expect(wrapperParam.didYouMean).toEqual(["amount"]);
    expect(wrapperParam.message).toMatch(/unknown param "amout"; did you mean "amount"\? this subgraph node exposes: amount/);
    const sub = at(doc({ nodes: [{ id: "s", type: "subgraph", params: {}, ref: { name: "fill/scatter-evn" } }] }));
    expect(sub.didYouMean).toEqual(["fill/scatter-even"]);
    expect(sub.message).toMatch(/unknown subgraph "fill\/scatter-evn"; did you mean "fill\/scatter-even"\? registered subgraphs: /);
  });

  it("suggests field fns and keys, and the grammar's own records point into the spec", () => {
    let caught: unknown;
    try {
      fieldFromJson({ fn: "add", args: [1, { fn: "constnat", value: 1 }] });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(FieldJsonError);
    const r = (caught as FieldJsonError).diagnostics[0] as Diagnostic;
    expect(r.code).toBe("unknown-field-fn");
    expect(r.path).toBe("/args/1/fn");
    expect(r.didYouMean).toEqual(["constant"]);
    expect(r.message).toMatch(/^\$\.args\[1\]: unknown field fn "constnat"; did you mean "constant"\? valid fns: /);
  });

  it("orders ties by code unit, whatever order the candidates arrive in", () => {
    const names = ["pointB", "pointA", "pointC"];
    expect(suggestNames("pointX", names).names).toEqual(["pointA", "pointB", "pointC"]);
    expect(suggestNames("pointX", [...names].reverse()).names).toEqual(["pointA", "pointB", "pointC"]);
    expect(suggestNames("zzzzzz", names)).toEqual({ names: [], clause: "" });
  });

  it("suggests pins in Graph.connect and Graph.disconnect", () => {
    const g = new Graph(1);
    const a = g.add(getNodeType("pointScatterInBounds").def, {}, "a");
    const j = g.add(getNodeType("jitterPoints").def, {}, "j");
    let caught: unknown;
    try {
      g.connect(a, "ot", j, "in");
    } catch (err) {
      caught = err;
    }
    expect((caught as Error).message).toBe('node "a" has no output pin "ot"; did you mean "out"?');
    expect((caught as { diagnostics: readonly Diagnostic[] }).diagnostics[0]).toMatchObject({
      code: "unknown-pin",
      nodeId: "a",
      pin: "ot",
      valid: ["out"],
      didYouMean: ["out"],
      fix: 'replace "ot" with "out"',
    });
    expect(() => g.connect(a, "nope", j, "in")).toThrow(/^node "a" has no output pin "nope"$/);
    expect(() => g.disconnect(a, "out", j, "inn")).toThrow(
      /^node "j" has no input pin "inn"; did you mean "in"\? input pins: "in"$/,
    );
  });
});

describe("fbm octaves", () => {
  it("a code-first fbm past the bound never saves a spec the reader refuses", () => {
    const saved = (octaves: number): SerializedGraph => {
      const g = new Graph(1);
      g.add(getNodeType("jitterPoints").def, { amount: fbm(perlinNoise, { octaves }) }, "j");
      return serializeGraph(g);
    };
    const amountFn = (json: SerializedGraph): unknown => (json.nodes[0]?.params.amount as { fn?: unknown }).fn;
    // At the bound it saves as one fbm spec, and reloads.
    expect(amountFn(saved(MAX_FBM_OCTAVES))).toBe("fbm");
    expect(() => deserializeGraph(saved(MAX_FBM_OCTAVES))).not.toThrow();
    // Past it, it used to save as an fbm the reader then refused. It now
    // saves as its own octave tree — the same field, spelled out — which
    // reloads.
    expect(amountFn(saved(MAX_FBM_OCTAVES + 8))).toBe("add");
    expect(() => deserializeGraph(saved(MAX_FBM_OCTAVES + 8))).not.toThrow();
  });

  it("where the octave tree cannot describe itself, saving is refused naming the count", () => {
    // A NARROWING, stated: the reader before this bound took any count, so
    // these three saved and reloaded. They cook exactly as before; writing
    // them now would write a file the reader refuses, so the writer refuses
    // first.
    const over = MAX_FBM_OCTAVES + 1;
    for (const field of [
      fbm(perlinNoise, { octaves: over, normalized: true }),
      fbm(perlinNoise, { octaves: over, seed: { from: "node", variant: 2 } }),
      fbm(perlinNoise, { octaves: 300 }),
    ]) {
      const g = new Graph(1);
      g.add(getNodeType("jitterPoints").def, { amount: field }, "j");
      expect(() => serializeGraph(g)).toThrow(/a graph file carries at most 32/);
    }
  });
});

describe("$schema", () => {
  const corpusFile = fileURLToPath(new URL("../../graphs/basics-subgraph-exposed-params.json", import.meta.url));

  it("is accepted at the top level, ignored by the loader and never written", () => {
    const plain = JSON.parse(readFileSync(corpusFile, "utf8")) as SerializedGraph;
    const annotated = { $schema: "https://c4rl05.github.io/pcg-ts/graph.schema.json", ...plain };
    const fromPlain = serializeGraph(deserializeGraph(plain));
    const fromAnnotated = serializeGraph(deserializeGraph(annotated));
    expect(Object.hasOwn(fromAnnotated, "$schema")).toBe(false);
    expect(JSON.stringify(fromAnnotated)).toBe(JSON.stringify(fromPlain));
    // Every payload the graph carries hashes the same either way.
    const hashes = (g: SerializedGraph): string[] =>
      g.nodes.flatMap((n) => (n.subgraph !== undefined ? [subgraphContentHash(n.subgraph)] : []));
    expect(hashes(fromAnnotated)).toEqual(hashes(fromPlain));
    expect(hashes(fromPlain).length).toBeGreaterThan(0);
  });

  it("is refused inside a payload, including when a recipe is registered", () => {
    expect(() =>
      registerSubgraph("test/schema-in-body", {
        graph: { ...BODY, $schema: "x" } as unknown as SerializedGraph,
        inputs: [],
        outputs: [],
      }),
    ).toThrow(/"\$schema" belongs at the top of the file/);
  });
});

describe("what used to load still loads", () => {
  const graphsDir = fileURLToPath(new URL("../../graphs/", import.meta.url));

  it("every corpus graph loads with no records", () => {
    const files = readdirSync(graphsDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(95);
    for (const file of files) {
      const json = JSON.parse(readFileSync(`${graphsDir}${file}`, "utf8")) as unknown;
      expect(() => deserializeGraph(json), file).not.toThrow();
    }
  });

  it("every registered primitive loads by reference with no records", () => {
    const primitives = listSubgraphs();
    expect(primitives.length).toBeGreaterThanOrEqual(37);
    for (const entry of primitives) {
      const refNode = { id: "p", type: "subgraph", params: {}, ref: { name: entry.name } };
      const types = ["subgraph", "forEach", "repeatUntil"];
      // A body names its wrapper by its reserved pins; one of the three loads it.
      const loaded = types.filter((type) => {
        try {
          deserializeGraph(doc({ nodes: [{ ...refNode, type }] }));
          return true;
        } catch {
          return false;
        }
      });
      expect(loaded, entry.name).toHaveLength(1);
    }
  });

  it("a registration probe strips its scaffolding breadcrumb from every line", () => {
    let message = "";
    try {
      registerSubgraph("test/two-faults", {
        graph: {
          ...BODY,
          nodes: [
            { id: "x", type: "warpDrive", params: {} },
            { id: "y", type: "pointScatterInBounds", params: { count: -1 } },
          ],
        } as unknown as SerializedGraph,
        inputs: [],
        outputs: [],
      });
    } catch (err) {
      message = (err as Error).message;
    }
    const lines = message.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^registerSubgraph "test\/two-faults": node "x": unknown node type "warpDrive"/);
    expect(lines[1]).toBe('node "y" param "count": -1 is below the minimum 0');
  });
});
