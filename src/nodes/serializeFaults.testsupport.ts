/**
 * Documents with exactly ONE fault each, one per load-time diagnostic code
 * the loader emits, with where the record must point.
 *
 * Plain data on purpose — no library import — so the same table can be fed
 * to a build of the loader from before collect-all existed, which is how
 * `SINGLE_FAULT_MESSAGES_BEFORE` in `serializeCollect.test.ts` was captured:
 * every message the new loader produces for these documents is held to the
 * one the first-error loader produced, apart from an inserted "did you
 * mean" clause.
 *
 * Needs the shipped primitives registered (`../primitives/index.js`) for
 * the `ref` cases.
 */

/** What one single-fault document must produce. */
export interface SingleFaultCase {
  readonly name: string;
  readonly doc: unknown;
  readonly code: string;
  /** RFC 6901 pointer the record must carry, resolvable in `doc`. */
  readonly path: string;
  readonly nodeId?: string;
  readonly nodePath?: readonly string[];
  readonly param?: string;
  readonly pin?: string;
  readonly key?: string;
}

/** A well-formed graph around `nodes`, overridable key by key. */
export function doc(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { formatVersion: 1, seed: 1, nodes: [], connections: [], outputs: [], ...over };
}

const scatter = (id = "a", params: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  type: "pointScatterInBounds",
  params,
});
const jitter = (id = "j", params: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  type: "jitterPoints",
  params,
});

/** A one-node body a subgraph payload can wrap. */
export const BODY = {
  formatVersion: 1,
  seed: 0,
  nodes: [{ id: "t", type: "transformPoints", params: {} }],
  connections: [],
  outputs: [],
};

const wrapper = (payload: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  id: "s",
  type: "subgraph",
  params: {},
  subgraph: { graph: BODY, inputs: [], outputs: [], ...payload },
  ...over,
});

/** A payload whose body contains the payload itself: a cycle by object identity. */
function cyclicPayloadDoc(): Record<string, unknown> {
  const payload: Record<string, unknown> = { inputs: [], outputs: [] };
  const body = {
    formatVersion: 1,
    seed: 0,
    nodes: [{ id: "inner", type: "subgraph", params: {}, subgraph: payload }],
    connections: [],
    outputs: [],
  };
  payload.graph = body;
  return doc({ nodes: [{ id: "s", type: "subgraph", params: {}, subgraph: payload }] });
}

export const SINGLE_FAULT_CASES: readonly SingleFaultCase[] = [
  { name: "not an object", doc: 42, code: "graph-not-object", path: "" },
  { name: "unknown top-level key", doc: doc({ notes: "x" }), code: "unknown-key", path: "/notes", key: "notes" },
  { name: "bad formatVersion", doc: doc({ formatVersion: 2 }), code: "unsupported-format-version", path: "/formatVersion" },
  { name: "bad seed", doc: doc({ seed: "x" }), code: "invalid-seed", path: "/seed" },
  { name: "nodes not an array", doc: doc({ nodes: {} }), code: "invalid-section", path: "/nodes" },
  { name: "connections not an array", doc: doc({ connections: 3 }), code: "invalid-section", path: "/connections" },
  { name: "outputs not an array", doc: doc({ outputs: "x" }), code: "invalid-section", path: "/outputs" },
  { name: "$schema not a string", doc: doc({ $schema: 3 }), code: "invalid-section", path: "/$schema", key: "$schema" },
  { name: "meta typo", doc: doc({ meta: { titel: "x" } }), code: "invalid-meta", path: "/meta" },
  { name: "params not an array", doc: doc({ params: {} }), code: "invalid-section", path: "/params" },
  {
    name: "graph param without a name",
    doc: doc({ params: [{ name: "", value: 1 }] }),
    code: "invalid-graph-param",
    path: "/params/0/name",
  },
  {
    name: "duplicate graph param",
    doc: doc({ params: [{ name: "n", value: 1 }, { name: "n", value: 2 }] }),
    code: "duplicate-graph-param",
    path: "/params/1/name",
  },
  {
    name: "graph param targeting a missing param",
    doc: doc({ nodes: [scatter()], params: [{ name: "n", value: 3, targets: [{ node: "a", param: "nope" }] }] }),
    code: "invalid-graph-param-target",
    path: "/params/0/targets",
  },
  {
    name: "two graph params on one slot",
    doc: doc({
      nodes: [scatter()],
      params: [
        { name: "n", value: 3, targets: [{ node: "a", param: "count" }] },
        { name: "m", value: 3, targets: [{ node: "a", param: "count" }] },
      ],
    }),
    code: "duplicate-param-target",
    path: "/params/1/targets/0",
    nodeId: "a",
    param: "count",
  },
  {
    name: "graph param targeting a field",
    doc: doc({
      nodes: [jitter("j", { amount: { fn: "constant", value: 1 } })],
      params: [{ name: "n", value: 3, targets: [{ node: "j", param: "amount" }] }],
    }),
    code: "target-holds-field",
    path: "/params/0/targets/0",
    nodeId: "j",
    param: "amount",
  },
  {
    name: "authored value disagreeing with its driver",
    doc: doc({
      nodes: [scatter("a", { count: 5 })],
      params: [{ name: "n", value: 7, targets: [{ node: "a", param: "count" }] }],
    }),
    code: "driven-param-conflict",
    path: "/nodes/0/params/count",
    nodeId: "a",
    param: "count",
  },
  { name: "node not an object", doc: doc({ nodes: [3] }), code: "invalid-section", path: "/nodes/0" },
  { name: "empty node id", doc: doc({ nodes: [scatter("")] }), code: "invalid-node-id", path: "/nodes/0/id" },
  {
    name: "duplicate node id",
    doc: doc({ nodes: [scatter("a"), jitter("a")] }),
    code: "duplicate-node-id",
    path: "/nodes/1/id",
    nodeId: "a",
  },
  {
    name: "unknown node key",
    doc: doc({ nodes: [{ ...scatter(), prams: {} }] }),
    code: "unknown-key",
    path: "/nodes/0/prams",
    key: "prams",
  },
  {
    name: "unknown node type",
    doc: doc({ nodes: [{ id: "a", type: "pointScatterInBound", params: {} }] }),
    code: "unknown-node-type",
    path: "/nodes/0/type",
    nodeId: "a",
  },
  {
    name: "params not an object",
    doc: doc({ nodes: [{ id: "a", type: "pointScatterInBounds", params: [] }] }),
    code: "invalid-section",
    path: "/nodes/0/params",
    nodeId: "a",
  },
  {
    name: "unknown param",
    doc: doc({ nodes: [scatter("a", { counts: 5 })] }),
    code: "unknown-param",
    path: "/nodes/0/params/counts",
    nodeId: "a",
    param: "counts",
  },
  {
    name: "param out of range",
    doc: doc({ nodes: [scatter("a", { count: -5 })] }),
    code: "invalid-param-value",
    path: "/nodes/0/params/count",
    nodeId: "a",
    param: "count",
  },
  {
    name: "enum value typo",
    doc: doc({ nodes: [{ id: "f", type: "filterByDensity", params: { mode: "probablistic" } }] }),
    code: "invalid-param-value",
    path: "/nodes/0/params/mode",
    nodeId: "f",
    param: "mode",
  },
  {
    name: "inline value shadowing a graph param",
    doc: doc({
      params: [{ name: "amt", value: 1 }],
      nodes: [jitter("j", { amount: { fn: "param", name: "amt", value: 2 } })],
    }),
    code: "shadowed-graph-param",
    path: "/nodes/0/params/amount",
    nodeId: "j",
    param: "amount",
  },
  {
    name: "ref on a plain node",
    doc: doc({ nodes: [{ ...scatter(), ref: { name: "fill/scatter-even" } }] }),
    code: "wrapper-key-on-plain-node",
    path: "/nodes/0/ref",
    nodeId: "a",
    key: "ref",
  },
  {
    name: "unknown field fn",
    doc: doc({ nodes: [jitter("j", { amount: { fn: "consant", value: 1 } })] }),
    code: "unknown-field-fn",
    path: "/nodes/0/params/amount/fn",
    nodeId: "j",
    param: "amount",
  },
  {
    name: "unknown field key",
    doc: doc({ nodes: [jitter("j", { amount: { fn: "add", args: [1, 2], arg: 3 } })] }),
    code: "unknown-field-key",
    path: "/nodes/0/params/amount/arg",
    nodeId: "j",
    param: "amount",
    key: "arg",
  },
  {
    name: "field arity",
    doc: doc({ nodes: [jitter("j", { amount: { fn: "clamp", args: [1, 2] } })] }),
    code: "field-arity",
    path: "/nodes/0/params/amount/args",
    nodeId: "j",
    param: "amount",
  },
  {
    // The refusal is worded at the missing key; the pointer stops at the
    // spec that lacks it, since a pointer to an absent key resolves to nothing.
    name: "field spec missing a required key",
    doc: doc({ nodes: [jitter("j", { amount: { fn: "attribute" } })] }),
    code: "invalid-field-spec",
    path: "/nodes/0/params/amount",
    nodeId: "j",
    param: "amount",
  },
  {
    name: "malformed field argument",
    doc: doc({ nodes: [jitter("j", { amount: { fn: "add", args: [1, "x"] } })] }),
    code: "invalid-field-spec",
    path: "/nodes/0/params/amount/args/1",
    nodeId: "j",
    param: "amount",
  },
  {
    name: "unknown subgraph name",
    doc: doc({ nodes: [{ id: "s", type: "subgraph", params: {}, ref: { name: "fill/scatter-evn" } }] }),
    code: "unknown-subgraph",
    path: "/nodes/0/ref/name",
    nodeId: "s",
  },
  {
    name: "ref not an object",
    doc: doc({ nodes: [{ id: "s", type: "subgraph", params: {}, ref: 3 }] }),
    code: "invalid-subgraph-ref",
    path: "/nodes/0/ref",
    nodeId: "s",
  },
  {
    name: "unknown ref key",
    doc: doc({ nodes: [{ id: "s", type: "subgraph", params: {}, ref: { name: "fill/scatter-even", hsh: "x" } }] }),
    code: "unknown-key",
    path: "/nodes/0/ref/hsh",
    key: "hsh",
  },
  {
    name: "hash mismatch",
    doc: doc({ nodes: [{ id: "s", type: "subgraph", params: {}, ref: { name: "fill/scatter-even", hash: "deadbeef" } }] }),
    code: "subgraph-hash-mismatch",
    path: "/nodes/0/ref/hash",
    nodeId: "s",
  },
  {
    name: "ref and payload",
    doc: doc({ nodes: [wrapper({}, { ref: { name: "fill/scatter-even" } })] }),
    code: "subgraph-ref-and-payload",
    path: "/nodes/0",
    nodeId: "s",
  },
  { name: "payload cycle", doc: cyclicPayloadDoc(), code: "subgraph-cycle", path: "/nodes/0/subgraph/graph/nodes/0/subgraph", nodeId: "s", nodePath: ["s", "inner"] },
  {
    name: "no payload",
    doc: doc({ nodes: [{ id: "s", type: "subgraph", params: {} }] }),
    code: "missing-subgraph-payload",
    path: "/nodes/0",
    nodeId: "s",
  },
  {
    name: "unknown payload key",
    doc: doc({ nodes: [wrapper({ prams: [] })] }),
    code: "unknown-key",
    path: "/nodes/0/subgraph/prams",
    key: "prams",
  },
  {
    name: "fault inside a body",
    doc: doc({ nodes: [wrapper({ graph: { ...BODY, nodes: [{ id: "t", type: "warpDrive", params: {} }] } })] }),
    code: "unknown-node-type",
    path: "/nodes/0/subgraph/graph/nodes/0/type",
    nodeId: "s",
    nodePath: ["s", "t"],
  },
  {
    name: "$schema inside a body",
    doc: doc({ nodes: [wrapper({ graph: { ...BODY, $schema: "x" } })] }),
    code: "unknown-key",
    path: "/nodes/0/subgraph/graph/$schema",
    nodeId: "s",
    key: "$schema",
  },
  {
    name: "portal id collision",
    doc: doc({
      nodes: [
        wrapper({
          graph: { ...BODY, nodes: [...BODY.nodes, { id: "__in_x", type: "transformPoints", params: {} }] },
          inputs: [{ name: "x", node: "t", pin: "in" }],
        }),
      ],
    }),
    code: "reserved-plumbing-name",
    path: "/nodes/0/subgraph/inputs/0/name",
    nodeId: "s",
  },
  {
    name: "iterated pin on a subgraph",
    doc: doc({ nodes: [wrapper({ inputs: [{ name: "each", node: "t", pin: "in" }] })] }),
    code: "wrapper-kind-mismatch",
    path: "/nodes/0/type",
    nodeId: "s",
  },
  {
    name: "exposed pin on a missing inner node",
    doc: doc({ nodes: [wrapper({ inputs: [{ name: "in", node: "ghost", pin: "in" }] })] }),
    code: "invalid-exposed-pin",
    path: "/nodes/0/subgraph/inputs/0/node",
    nodeId: "s",
  },
  {
    name: "exposed pin on a missing inner pin",
    doc: doc({ nodes: [wrapper({ inputs: [{ name: "in", node: "t", pin: "warp" }] })] }),
    code: "invalid-exposed-pin",
    path: "/nodes/0/subgraph",
    nodeId: "s",
  },
  {
    name: "exposed param on a missing inner param",
    doc: doc({
      nodes: [wrapper({ params: [{ name: "p", targets: [{ node: "t", param: "nope" }], description: "d" }] })],
    }),
    code: "invalid-exposed-param",
    path: "/nodes/0/subgraph/params/0",
    nodeId: "s",
  },
  {
    name: "derived key on an exposed param",
    doc: doc({
      nodes: [
        wrapper({
          params: [{ name: "p", targets: [{ node: "t", param: "translate" }], description: "d", type: "vec3" }],
        }),
      ],
    }),
    code: "unauthorable-key",
    path: "/nodes/0/subgraph/params/0/type",
    key: "type",
  },
  {
    name: "unknown wrapper param",
    doc: doc({ nodes: [wrapper({}, { params: { bogus: 1 } })] }),
    code: "unknown-param",
    path: "/nodes/0/params/bogus",
    nodeId: "s",
    param: "bogus",
  },
  {
    name: "malformed endpoint",
    doc: doc({ nodes: [scatter(), jitter()], connections: [{ from: ["a"], to: ["j", "in"] }] }),
    code: "invalid-connection",
    path: "/connections/0/from",
  },
  {
    name: "unknown connection key",
    doc: doc({ nodes: [scatter(), jitter()], connections: [{ from: ["a", "out"], to: ["j", "in"], label: "x" }] }),
    code: "unknown-key",
    path: "/connections/0/label",
    key: "label",
  },
  {
    name: "connection from a missing node",
    doc: doc({ nodes: [scatter(), jitter()], connections: [{ from: ["ghost", "out"], to: ["j", "in"] }] }),
    code: "unknown-node",
    path: "/connections/0/from/0",
  },
  {
    name: "connection from a missing pin",
    doc: doc({ nodes: [scatter(), jitter()], connections: [{ from: ["a", "outt"], to: ["j", "in"] }] }),
    code: "unknown-pin",
    path: "/connections/0/from/1",
    nodeId: "a",
    pin: "outt",
  },
  {
    name: "connection between pin kinds",
    doc: doc({
      nodes: [{ id: "v", type: "valueConstant", params: {} }, jitter()],
      connections: [{ from: ["v", "out"], to: ["j", "in"] }],
    }),
    code: "pin-kind-mismatch",
    path: "/connections/0",
    nodeId: "j",
    pin: "in",
  },
  {
    name: "occupied input",
    doc: doc({
      nodes: [scatter("a"), scatter("b"), jitter()],
      connections: [
        { from: ["a", "out"], to: ["j", "in"] },
        { from: ["b", "out"], to: ["j", "in"] },
      ],
    }),
    code: "input-pin-occupied",
    path: "/connections/1",
    nodeId: "j",
    pin: "in",
  },
  {
    name: "cycle",
    doc: doc({
      nodes: [jitter("j1"), jitter("j2")],
      connections: [
        { from: ["j1", "out"], to: ["j2", "in"] },
        { from: ["j2", "out"], to: ["j1", "in"] },
      ],
    }),
    code: "cycle",
    path: "/connections/1",
    nodeId: "j1",
    pin: "in",
  },
  {
    name: "malformed output",
    doc: doc({ nodes: [scatter()], outputs: [{ id: "a", pin: 3, name: "x" }] }),
    code: "invalid-output",
    path: "/outputs/0",
  },
  {
    name: "output from a missing node",
    doc: doc({ nodes: [scatter()], outputs: [{ id: "b", pin: "out", name: "x" }] }),
    code: "unknown-node",
    path: "/outputs/0/id",
  },
  {
    name: "output from a missing pin",
    doc: doc({ nodes: [scatter()], outputs: [{ id: "a", pin: "ot", name: "x" }] }),
    code: "unknown-pin",
    path: "/outputs/0/pin",
    nodeId: "a",
    pin: "ot",
  },
  {
    name: "duplicate output name",
    doc: doc({
      nodes: [scatter()],
      outputs: [
        { id: "a", pin: "out", name: "x" },
        { id: "a", pin: "out", name: "x" },
      ],
    }),
    code: "duplicate-output-name",
    path: "/outputs/1/name",
    nodeId: "a",
    pin: "out",
  },
];

/** A document with several independent faults and the codes they must produce, in order. */
export interface MultiFaultCase {
  readonly name: string;
  readonly doc: unknown;
  readonly codes: readonly string[];
  readonly paths: readonly string[];
}

export const MULTI_FAULT_CASES: readonly MultiFaultCase[] = [
  {
    // Written connections-first and with the stray key LAST, so document
    // order and phase order disagree: phase order must win.
    name: "three faults in three phases",
    doc: {
      connections: [{ from: ["a", "outt"], to: ["j", "in"] }],
      formatVersion: 1,
      seed: 1,
      nodes: [scatter("a"), jitter("j"), { id: "b", type: "warpDrive", params: {} }],
      outputs: [],
      notes: "x",
    },
    codes: ["unknown-key", "unknown-node-type", "unknown-pin"],
    paths: ["/notes", "/nodes/2/type", "/connections/0/from/1"],
  },
  {
    name: "two bad params on one node, which is still wired",
    doc: doc({
      nodes: [scatter("a", { count: -5, boundsMin: "x" }), jitter("j")],
      connections: [{ from: ["a", "ot"], to: ["j", "in"] }],
    }),
    codes: ["invalid-param-value", "invalid-param-value", "unknown-pin"],
    paths: ["/nodes/0/params/count", "/nodes/0/params/boundsMin", "/connections/0/from/1"],
  },
  {
    name: "a poisoned node named by a connection, an output and a target",
    doc: doc({
      params: [{ name: "n", value: 3, targets: [{ node: "a", param: "count" }] }],
      nodes: [{ id: "a", type: "warpDrive", params: {} }, jitter("j")],
      connections: [{ from: ["a", "out"], to: ["j", "in"] }],
      outputs: [{ id: "a", pin: "out", name: "x" }],
    }),
    codes: ["unknown-node-type"],
    paths: ["/nodes/0/type"],
  },
  {
    name: "a wrapper with a broken body, named by a connection and an output",
    doc: doc({
      nodes: [
        wrapper({
          graph: { ...BODY, nodes: [{ id: "t", type: "warpDrive", params: {} }] },
          outputs: [{ name: "out", node: "t", pin: "out" }],
        }),
        jitter("j"),
      ],
      connections: [{ from: ["s", "out"], to: ["j", "in"] }],
      outputs: [{ id: "s", pin: "out", name: "x" }],
    }),
    codes: ["unknown-node-type"],
    paths: ["/nodes/0/subgraph/graph/nodes/0/type"],
  },
  {
    name: "a dropped param driven by a graph param",
    doc: doc({
      params: [{ name: "n", value: 3, targets: [{ node: "a", param: "count" }] }],
      nodes: [scatter("a", { count: "many" })],
    }),
    codes: ["invalid-param-value"],
    paths: ["/nodes/0/params/count"],
  },
  {
    name: "a typo on the live end of a connection to a poisoned node",
    doc: doc({
      nodes: [{ id: "b", type: "warpDrive", params: {} }, jitter("j")],
      connections: [
        { from: ["b", "out"], to: ["jj", "in"] },
        { from: ["b", "out"], to: ["j", "inn"] },
      ],
    }),
    codes: ["unknown-node-type", "unknown-node", "unknown-pin"],
    paths: ["/nodes/0/type", "/connections/0/to/0", "/connections/1/to/1"],
  },
  {
    name: "a graph param with one poisoned target and one bad one",
    doc: doc({
      params: [{ name: "n", value: 3, targets: [{ node: "b", param: "count" }, { node: "a", param: "nope" }] }],
      nodes: [{ id: "b", type: "warpDrive", params: {} }, scatter("a")],
    }),
    codes: ["unknown-node-type", "invalid-graph-param-target"],
    paths: ["/nodes/0/type", "/params/0/targets"],
  },
  {
    name: "a duplicate output name after an output from a poisoned node",
    doc: doc({
      nodes: [{ id: "b", type: "warpDrive", params: {} }, scatter("a")],
      outputs: [
        { id: "b", pin: "out", name: "x" },
        { id: "a", pin: "out", name: "x" },
      ],
    }),
    codes: ["unknown-node-type", "duplicate-output-name"],
    paths: ["/nodes/0/type", "/outputs/1/name"],
  },
  {
    name: "a duplicate output name after a refused output",
    doc: doc({
      nodes: [scatter("a")],
      outputs: [
        { id: "typo", pin: "out", name: "x" },
        { id: "a", pin: "out", name: "x" },
      ],
    }),
    codes: ["unknown-node", "duplicate-output-name"],
    paths: ["/outputs/0/id", "/outputs/1/name"],
  },
  {
    name: "a node with no id, which a connection and an output may name",
    doc: doc({
      nodes: [{ type: "pointScatterInBounds", params: {} }, jitter("j")],
      connections: [{ from: ["a", "out"], to: ["j", "in"] }],
      outputs: [{ id: "a", pin: "out", name: "x" }],
    }),
    codes: ["invalid-node-id"],
    paths: ["/nodes/0"],
  },
  {
    name: "a connection meant for the second of two nodes sharing an id",
    doc: doc({
      nodes: [scatter("a"), jitter("a"), jitter("j")],
      connections: [{ from: ["j", "out"], to: ["a", "in"] }],
    }),
    codes: ["duplicate-node-id"],
    paths: ["/nodes/1/id"],
  },
  {
    name: "a duplicate id after a poisoned node",
    doc: doc({
      nodes: [{ id: "a", type: "warpDrive", params: {} }, scatter("a"), jitter("j")],
      connections: [{ from: ["a", "out"], to: ["j", "in"] }],
    }),
    codes: ["unknown-node-type", "duplicate-node-id"],
    paths: ["/nodes/0/type", "/nodes/1/id"],
  },
];
