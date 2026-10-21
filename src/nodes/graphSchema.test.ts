/**
 * The graph JSON Schema: valid, deterministic, in step with the committed
 * `docs/graph.schema.json`, and in AGREEMENT with the loader.
 *
 * The agreement half is the one that matters. `deserializeGraph` is the
 * authority, so every assertion here pairs the two: a document the schema
 * rejects must be one the loader rejects, and each defect in the table below
 * must be refused by both. Where they disagree in the other direction — the
 * loader refuses, the schema accepts — that is a rule the schema cannot
 * state, and it belongs in the root `$comment`, not in a failing test.
 *
 * `ajv` runs in strict mode. The one allowance is `allowUnionTypes`: the
 * schema writes `"type": ["object", "null"]` where the loader reads `null`
 * as absent, which is plain draft 2020-12 that ajv asks to have opted into.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { listFieldFnInfos } from "../fields/fieldJson.js";
import { MAX_FBM_OCTAVES } from "../noise/util.js";
import type { ParamSchema } from "../graph/index.js";
import {
  FIELD_SPEC_KEY_RULES,
  GRAPH_SCHEMA_ID,
  fieldSpecKeyRule,
  graphJsonSchema,
} from "./graphSchema.js";
import { listNodeTypes } from "./registry.js";
import { deserializeGraph } from "./serialize.js";
import { listSubgraphs } from "./subgraphRegistry.js";
import { describeSubgraphParams } from "../graph/index.js";

type Json = Record<string, unknown>;

const repo = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url));

/** What ajv logged instead of throwing; strict mode throws, and this catches the rest. */
const ajvWarnings: string[] = [];

function makeAjv(): Ajv2020 {
  const record = (...parts: unknown[]): void => {
    ajvWarnings.push(parts.map(String).join(" "));
  };
  return new Ajv2020({
    strict: true,
    allowUnionTypes: true,
    allErrors: true,
    logger: { log: () => {}, warn: record, error: record },
  });
}

const schema = graphJsonSchema();
const ajv = makeAjv();
const validate = ajv.compile(schema);

function schemaAccepts(doc: unknown): boolean {
  return validate(doc) === true;
}

function schemaErrors(): string {
  return ajv.errorsText(validate.errors, { separator: "\n" });
}

function loaderAccepts(doc: unknown): { ok: true } | { ok: false; message: string } {
  try {
    deserializeGraph(doc);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/** A one-node graph. */
function oneNode(node: Json, extra: Json = {}): Json {
  return { formatVersion: 1, seed: 0, nodes: [node], connections: [], outputs: [], ...extra };
}

function defaults(params: Readonly<Record<string, ParamSchema>>): Json {
  return Object.fromEntries(Object.entries(params).map(([k, s]) => [k, s.default]));
}

const types = listNodeTypes();
const standard = types.filter((t) => !["subgraph", "forEach", "repeatUntil"].includes(t.type));

function findParam(predicate: (s: ParamSchema) => boolean): { type: string; param: string } {
  for (const t of standard) {
    for (const [param, s] of Object.entries(t.params)) if (predicate(s)) return { type: t.type, param };
  }
  throw new Error("no registered param matches");
}

/** A standard node whose f32 param reads a field, to carry field specs. */
const fieldHost = findParam((s) => s.type === "f32" && s.acceptsField === true);
function withField(spec: unknown): Json {
  return oneNode({ id: "n", type: fieldHost.type, params: { [fieldHost.param]: spec } });
}

/** A registered primitive and one of its exposed params, read the way the loader derives them. */
function primitiveWithParam(): { name: string; param: string } {
  for (const entry of listSubgraphs()) {
    const graph = deserializeGraph(oneNode({ id: "p", type: "subgraph", params: {}, ref: { name: entry.name } }));
    const described = describeSubgraphParams(graph._nodes.get("p")!.def) ?? [];
    if (described.length > 0) return { name: entry.name, param: described[0]!.name };
  }
  throw new Error("no primitive exposes a param");
}

describe("graphJsonSchema: the schema itself", () => {
  it("is valid against the draft 2020-12 meta-schema and compiles in strict mode, in every variant", () => {
    const checker = makeAjv();
    expect(checker.validateSchema(schema), checker.errorsText(checker.errors)).toBe(true);
    const compact = graphJsonSchema({ descriptions: false });
    expect(checker.validateSchema(compact), checker.errorsText(checker.errors)).toBe(true);
    expect(() => makeAjv().compile(compact)).not.toThrow();
    for (const nodeType of [fieldHost.type, "subgraph", "repeatUntil"]) {
      const one = graphJsonSchema({ nodeType });
      expect(checker.validateSchema(one), checker.errorsText(checker.errors)).toBe(true);
      expect(() => makeAjv().compile(one)).not.toThrow();
    }
    expect(schema.$id).toBe(GRAPH_SCHEMA_ID);
    expect(ajvWarnings, "ajv logged strict-mode or other warnings").toEqual([]);
  });

  it("generates byte-identical output on every call", () => {
    expect(JSON.stringify(graphJsonSchema())).toBe(JSON.stringify(schema));
    expect(JSON.stringify(graphJsonSchema({ descriptions: false }))).toBe(
      JSON.stringify(graphJsonSchema({ descriptions: false })),
    );
  });

  it("has sorted keys at every object position", () => {
    const walk = (v: unknown, path: string): void => {
      if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
      if (typeof v !== "object" || v === null) return;
      const keys = Object.keys(v);
      expect(keys, path).toEqual([...keys].sort());
      for (const k of keys) walk((v as Json)[k], `${path}.${k}`);
    };
    walk(schema, "$");
  });

  it("docs/graph.schema.json matches a fresh render", () => {
    const committed = readFileSync(repo("docs/graph.schema.json"), "utf8").replaceAll("\r\n", "\n");
    const generated = `${JSON.stringify(schema, null, 2)}\n`;
    if (committed !== generated) {
      const a = committed.split("\n");
      const b = generated.split("\n");
      const i = a.findIndex((line, n) => line !== b[n]);
      // The root `$comment` is one long line, so show where in the line.
      const at = [...(a[i] ?? "")].findIndex((ch, n) => ch !== (b[i] ?? "")[n]);
      const excerpt = (line: string | undefined): string =>
        line === undefined ? "<end of file>" : JSON.stringify(line.slice(Math.max(0, at - 60), at + 60));
      throw new Error(
        "docs/graph.schema.json is stale: a registry changed but the schema was not regenerated. Run:\n\n" +
          "  npm run build && npm run docs:schema\n\n" +
          `first difference at line ${i + 1}, column ${at + 1}:\n` +
          `  committed: ${excerpt(a[i])}\n  generated: ${excerpt(b[i])}`,
      );
    }
  });

  it("describes one node type on request, and refuses an unknown one by listing the registered types", () => {
    const one = graphJsonSchema({ nodeType: fieldHost.type });
    const check = makeAjv().compile(one);
    expect(check({ id: "n", type: fieldHost.type, params: {} })).toBe(true);
    expect(check({ id: "n", type: fieldHost.type, params: { nope: 1 } })).toBe(false);
    expect(check({ id: "n", type: "subgraph", params: {} })).toBe(false);
    // A standard type's schema does not drag the whole format in with it.
    expect(Object.keys(one.$defs as Json)).not.toContain("node");
    expect(() => graphJsonSchema({ nodeType: "pointGridd" })).toThrow(/registered types: .*pointGrid/);
  });
});

describe("graphJsonSchema: the field grammar's key table", () => {
  const infos = listFieldFnInfos();

  it("types every non-args key of every field fn", () => {
    const keys = new Set<string>();
    for (const info of infos) {
      for (const key of info.keys) {
        if (key === "args") {
          expect(info.args?.length ?? 0, `${info.fn} takes args but publishes no argument list`).toBeGreaterThan(0);
          continue;
        }
        keys.add(key);
        expect(() => fieldSpecKeyRule(info.fn, key)).not.toThrow();
      }
    }
    // The count the table was written against; a new key is a new row.
    expect(keys.size).toBe(14);
    expect(infos.length).toBe(64);
  });

  it("holds no rule that no fn uses", () => {
    for (const [key, entry] of Object.entries(FIELD_SPEC_KEY_RULES)) {
      const takers = infos.filter((i) => i.keys.includes(key)).map((i) => i.fn);
      expect(takers.length, `FIELD_SPEC_KEY_RULES.${key} is taken by no fn`).toBeGreaterThan(0);
      for (const fn of Object.keys(entry.byFn ?? {})) {
        expect(takers, `FIELD_SPEC_KEY_RULES.${key}.byFn.${fn}`).toContain(fn);
      }
      if (entry.rule !== undefined) {
        const byRule = takers.filter((fn) => !Object.hasOwn(entry.byFn ?? {}, fn));
        expect(byRule.length, `FIELD_SPEC_KEY_RULES.${key}.rule is shadowed for every fn`).toBeGreaterThan(0);
      }
    }
  });

  it("refuses a missing rule by naming the table", () => {
    expect(() => fieldSpecKeyRule("constant", "nope")).toThrow(/FIELD_SPEC_KEY_RULES/);
  });
});

describe("graphJsonSchema: the corpus", () => {
  const files = readdirSync(repo("graphs")).filter((f) => f.endsWith(".json")).sort();

  it("validates every graph in graphs/, the wrapper nodes included", () => {
    expect(files.length).toBeGreaterThanOrEqual(95);
    const failures: string[] = [];
    const wrappers = { subgraphRef: 0, subgraphInline: 0, forEach: 0, repeatUntil: 0 };
    const count = (graph: Json): void => {
      for (const node of (graph.nodes as Json[]) ?? []) {
        const withParams = node.params !== undefined && Object.keys(node.params as Json).length > 0;
        if (withParams && node.type === "subgraph") {
          if (node.ref !== undefined) wrappers.subgraphRef++;
          else wrappers.subgraphInline++;
        }
        if (withParams && node.type === "forEach") wrappers.forEach++;
        if (withParams && node.type === "repeatUntil") wrappers.repeatUntil++;
        if (node.subgraph !== undefined) count((node.subgraph as Json).graph as Json);
      }
    };
    for (const file of files) {
      const doc = JSON.parse(readFileSync(repo(`graphs/${file}`), "utf8")) as Json;
      count(doc);
      if (!schemaAccepts(doc)) failures.push(`${file}:\n${schemaErrors()}`);
    }
    expect(failures, failures.join("\n\n")).toEqual([]);
    // The wrapper nodes that carry params on a type registering none: the
    // case a closed object per registered type would have rejected.
    expect(wrappers.subgraphRef + wrappers.subgraphInline + wrappers.forEach).toBeGreaterThanOrEqual(113);
    expect(wrappers.subgraphRef).toBeGreaterThanOrEqual(110);
    expect(wrappers.subgraphInline).toBeGreaterThanOrEqual(2);
    expect(wrappers.forEach).toBeGreaterThanOrEqual(1);
    expect(wrappers.repeatUntil).toBeGreaterThanOrEqual(1);
  });
});

describe("graphJsonSchema: agreement with deserializeGraph", () => {
  const enumParam = findParam((s) => s.type === "enum");
  const vec3Param = findParam((s) => s.type === "vec3");
  const primitive = primitiveWithParam();

  const rejects: ReadonlyArray<readonly [string, Json]> = [
    ["unknown node type", oneNode({ id: "n", type: "pointGridd", params: {} })],
    ["unknown param", oneNode({ id: "n", type: fieldHost.type, params: { notAParam: 1 } })],
    ["bad enum value", oneNode({ id: "n", type: enumParam.type, params: { [enumParam.param]: "not-a-value" } })],
    ["unknown field fn", withField({ fn: "noSuchFn" })],
    ["extra key in a field spec", withField({ fn: "constant", value: 1, extra: 2 })],
    ["wrong field arity", withField({ fn: "add", args: [1] })],
    ["bad vec3 length", oneNode({ id: "n", type: vec3Param.type, params: { [vec3Param.param]: [1, 2] } })],
    [
      "misspelled param on a ref node",
      oneNode({ id: "p", type: "subgraph", ref: { name: primitive.name }, params: { [`${primitive.param}x`]: 1 } }),
    ],
    ["extra top-level key", { ...oneNode({ id: "n", type: fieldHost.type, params: {} }), extra: 1 }],
    ["unknown primitive", oneNode({ id: "p", type: "subgraph", ref: { name: "no/such-primitive" }, params: {} })],
    [
      "both ref and subgraph",
      oneNode({
        id: "p",
        type: "subgraph",
        ref: { name: primitive.name },
        subgraph: { graph: { formatVersion: 1, seed: 0, nodes: [] }, inputs: [], outputs: [] },
      }),
    ],
    ["a wrapper with neither ref nor subgraph", oneNode({ id: "p", type: "subgraph", params: {} })],
    ["ref on a standard node", oneNode({ id: "n", type: fieldHost.type, ref: { name: primitive.name } })],
    [
      "graph params inside a payload",
      oneNode({
        id: "p",
        type: "subgraph",
        subgraph: { graph: { formatVersion: 1, seed: 0, nodes: [], params: [] }, inputs: [], outputs: [] },
      }),
    ],
    ["an unknown noise option", withField({ fn: "perlinNoise", opts: { octaves: 3 } })],
    ["a field spec at a param that reads none", oneNode({ id: "n", type: enumParam.type, params: { [enumParam.param]: { fn: "constant", value: 1 } } })],
    ["a primitive under the wrong wrapper type", oneNode({ id: "p", type: "forEach", ref: { name: primitive.name }, params: {} })],
    ["formatVersion 2", { ...oneNode({ id: "n", type: fieldHost.type, params: {} }), formatVersion: 2 }],
    ["a dotted graph param name", oneNode({ id: "n", type: fieldHost.type, params: {} }, { params: [{ name: "a.b", value: 1 }] })],
    // Parsed from text, not written as object literals: `{ __proto__: 1 }`
    // in source sets a prototype instead of making a key, and a file on disk
    // makes the key. The loader used to find Object.prototype members as
    // param schemas and accept all four, dropping them without a word.
    ...(["toString", "__proto__", "constructor", "hasOwnProperty"] as const).map(
      (key): readonly [string, Json] => [
        `a param named "${key}"`,
        JSON.parse(
          `{"formatVersion":1,"seed":0,"nodes":[{"id":"n","type":${JSON.stringify(fieldHost.type)},"params":{${JSON.stringify(key)}:1}}],"connections":[],"outputs":[]}`,
        ) as Json,
      ],
    ),
    // `base in NOISE_FACTORIES` walked the prototype.
    ["an fbm base named after a prototype member", withField({ fn: "fbm", base: "toString" })],
    // Loaded clean and ran the process out of memory at cook.
    ["an fbm with a million octaves", withField({ fn: "fbm", base: "perlinNoise", opts: { octaves: 1000000 } })],
    ["an fbm one octave past the bound", withField({ fn: "fbm", base: "perlinNoise", opts: { octaves: MAX_FBM_OCTAVES + 1 } })],
  ];

  it("both accept a top-level $schema string, and both refuse a non-string one and one inside a payload", () => {
    const base = oneNode({ id: "n", type: fieldHost.type, params: {} });
    const top = { $schema: GRAPH_SCHEMA_ID, ...base };
    expect(loaderAccepts(top)).toEqual({ ok: true });
    expect(schemaAccepts(top), schemaErrors()).toBe(true);
    for (const doc of [
      { ...base, $schema: 3 },
      oneNode({
        id: "p",
        type: "subgraph",
        params: {},
        subgraph: { graph: { $schema: GRAPH_SCHEMA_ID, formatVersion: 1, seed: 0, nodes: [] }, inputs: [], outputs: [] },
      }),
    ]) {
      expect(loaderAccepts(doc).ok, "the loader accepted it").toBe(false);
      expect(schemaAccepts(doc), "the schema accepted it").toBe(false);
    }
  });

  it("both accept an asset role on the outermost graph, and both refuse a bad one and one inside a payload", () => {
    const mesh = { id: "brickMesh", type: "meshPrimitive", params: {} };
    const top = oneNode(mesh, { outputs: [{ id: "brickMesh", pin: "out", name: "brick", role: "asset" }] });
    expect(loaderAccepts(top)).toEqual({ ok: true });
    expect(schemaAccepts(top), schemaErrors()).toBe(true);
    for (const doc of [
      oneNode(mesh, { outputs: [{ id: "brickMesh", pin: "out", name: "brick", role: "assets" }] }),
      oneNode({
        id: "p",
        type: "subgraph",
        params: {},
        subgraph: {
          graph: {
            formatVersion: 1,
            seed: 0,
            nodes: [mesh],
            outputs: [{ id: "brickMesh", pin: "out", name: "brick", role: "asset" }],
          },
          inputs: [],
          outputs: [{ name: "out", node: "brickMesh", pin: "out" }],
        },
      }),
    ]) {
      expect(loaderAccepts(doc).ok, "the loader accepted it").toBe(false);
      expect(schemaAccepts(doc), "the schema accepted it").toBe(false);
    }
  });

  it("both accept an fbm at exactly the octave bound", () => {
    const doc = withField({ fn: "fbm", base: "perlinNoise", opts: { octaves: MAX_FBM_OCTAVES } });
    expect(loaderAccepts(doc)).toEqual({ ok: true });
    expect(schemaAccepts(doc), schemaErrors()).toBe(true);
  });

  it.each(rejects)("both reject: %s", (_label, doc) => {
    expect(loaderAccepts(doc).ok, "the loader accepted it").toBe(false);
    expect(schemaAccepts(doc), "the schema accepted it").toBe(false);
  });

  /**
   * An inline wrapper whose body reads a targetless exposed param "amt"
   * through a field expression. The baseline must pass both, so each variant
   * below is refused for the one thing it changes and not for a broken body.
   */
  function inlineWithDecl(decl: Json, spec: Json = { fn: "param", name: "amt" }): Json {
    return oneNode({
      id: "w",
      type: "subgraph",
      params: {},
      subgraph: {
        graph: { formatVersion: 1, seed: 0, nodes: [{ id: "inner", type: fieldHost.type, params: { [fieldHost.param]: spec } }] },
        inputs: [],
        outputs: [],
        params: [decl],
      },
    });
  }
  const baseDecl: Json = { name: "amt", targets: [], description: "How much.", default: 1 };

  it("both accept the inline baseline the declaration variants are cut from", () => {
    for (const doc of [inlineWithDecl(baseDecl), inlineWithDecl({ ...baseDecl, default: [1, 2, 3] })]) {
      expect(loaderAccepts(doc)).toEqual({ ok: true });
      expect(schemaAccepts(doc), schemaErrors()).toBe(true);
    }
  });

  const declRejects: ReadonlyArray<readonly [string, Json]> = [
    ["a dotted exposed param name", inlineWithDecl({ ...baseDecl, name: "a.b" }, { fn: "param", name: "a.b" })],
    ["an empty exposed param name", inlineWithDecl({ ...baseDecl, name: "" })],
    ["a blank exposed param description", inlineWithDecl({ ...baseDecl, description: "  " })],
    ["a targetless exposed param with no default", inlineWithDecl({ name: "amt", targets: [], description: "How much." })],
    ["a targetless exposed param whose default is a string", inlineWithDecl({ ...baseDecl, default: "s" })],
    ["a targetless exposed param whose default is two numbers", inlineWithDecl({ ...baseDecl, default: [1, 2] })],
    ["an exposed param declaring its own type", inlineWithDecl({ ...baseDecl, type: "f32" })],
    ["worleyFeature at frequency 0", withField({ fn: "component", args: [{ fn: "worleyFeature", opts: { frequency: 0 } }], index: 0 })],
  ];

  it.each(declRejects)("both reject: %s", (_label, doc) => {
    expect(loaderAccepts(doc).ok, "the loader accepted it").toBe(false);
    expect(schemaAccepts(doc), "the schema accepted it").toBe(false);
  });

  it("both accept every registered standard node type at its default params, written out and omitted", () => {
    const disagreements: string[] = [];
    for (const t of standard) {
      for (const params of [defaults(t.params), {}]) {
        const doc = oneNode({ id: "n", type: t.type, params });
        const loaded = loaderAccepts(doc);
        if (!loaded.ok) disagreements.push(`${t.type}: loader refused its defaults: ${loaded.message}`);
        else if (!schemaAccepts(doc)) disagreements.push(`${t.type}: schema refused its defaults:\n${schemaErrors()}`);
      }
    }
    expect(disagreements, disagreements.join("\n")).toEqual([]);
  });

  it("both accept every registered primitive by ref at its default params, written out and omitted", () => {
    const disagreements: string[] = [];
    const entries = listSubgraphs();
    expect(entries.length).toBe(37);
    for (const entry of entries) {
      const probe = deserializeGraph(oneNode({ id: "p", type: "subgraph", params: {}, ref: { name: entry.name } }));
      const exposed = describeSubgraphParams(probe._nodes.get("p")!.def) ?? [];
      const written = Object.fromEntries(exposed.map((p) => [p.name, p.schema.default]));
      for (const params of [written, {}]) {
        for (const ref of [{ name: entry.name }, { name: entry.name, hash: entry.hash }]) {
          const doc = oneNode({ id: "p", type: "subgraph", params, ref });
          const loaded = loaderAccepts(doc);
          if (!loaded.ok) disagreements.push(`${entry.name}: loader refused: ${loaded.message}`);
          else if (!schemaAccepts(doc)) disagreements.push(`${entry.name}: schema refused:\n${schemaErrors()}`);
        }
      }
      // And a misspelling of each exposed param is refused by both.
      for (const p of exposed) {
        const doc = oneNode({ id: "p", type: "subgraph", params: { [`${p.name}_`]: p.schema.default }, ref: { name: entry.name } });
        if (loaderAccepts(doc).ok || schemaAccepts(doc)) disagreements.push(`${entry.name}: misspelled "${p.name}_" not refused by both`);
      }
    }
    expect(disagreements, disagreements.join("\n")).toEqual([]);
  });

  /**
   * One minimal spec per field fn, in a field-capable param. Every sample the
   * LOADER accepts must validate; samples it refuses (a scalar where a fn
   * needs a tuple, say — a broadcast rule the schema does not state) are
   * skipped, and each fn must have at least one accepted sample so the
   * sweep cannot pass vacuously.
   */
  it("accepts every field fn wherever the loader does", () => {
    const sample = (fn: string, key: string): unknown => {
      switch (key) {
        case "name":
          return fn === "param" ? "amount" : "density";
        case "value":
          return fn === "attributeIs" ? "pine" : 1;
        case "cases":
          return { rod: 1 };
        case "default":
          return 0;
        case "index":
          return 0;
        case "stops":
          return [[0, 0], [1, 1]];
        case "table":
          return [0, 1];
        case "base":
          return "perlinNoise";
        case "tupleSize":
          return 1;
        case "key":
          return "salt";
        case "opts":
          return fn === "fbm" ? { octaves: 2, seed: { from: "node", variant: 1 } } : { frequency: 0.5, seed: 3 };
        case "min":
          return 0;
        case "max":
          return 2;
        case "description":
          return "How much.";
        default:
          throw new Error(`no sample for ${fn}.${key}`);
      }
    };
    const unaccepted: string[] = [];
    const disagreements: string[] = [];
    for (const info of listFieldFnInfos()) {
      let accepted = 0;
      for (const argValue of [1, [1, 2, 3]]) {
        const spec: Json = { fn: info.fn };
        for (const key of info.keys) {
          spec[key] = key === "args" ? info.args!.map(() => argValue) : sample(info.fn, key);
        }
        const doc = withField(spec);
        if (!loaderAccepts(doc).ok) continue;
        accepted++;
        if (!schemaAccepts(doc)) disagreements.push(`${info.fn} ${JSON.stringify(spec)}:\n${schemaErrors()}`);
      }
      if (accepted === 0) unaccepted.push(info.fn);
    }
    expect(disagreements, disagreements.join("\n")).toEqual([]);
    expect(unaccepted, "fns with no sample the loader accepts").toEqual([]);
  });
});
