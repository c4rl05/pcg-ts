/**
 * `pcg schema`: the three subjects, each compiled by ajv in strict mode and
 * checked against real documents — a corpus graph, a corpus field spec, a
 * record the library itself produced — plus the refusals.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { diagnosticsOf } from "../diagnostics/index.js";
import { type ParsedArgs, CliUsageError, parseArgs } from "./args.js";
import { COMMANDS } from "./commands.js";
import { CliError } from "./errors.js";
import { EXIT_OK, runCli } from "./index.js";
import type { CliIo } from "./io.js";
import { schemaCommand } from "./schemaCommand.js";

const repo = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url));

type Json = Record<string, unknown>;

const io: CliIo = {
  out: () => undefined,
  err: () => undefined,
  readFile: () => {
    throw new Error("no files in this suite");
  },
  writeFile: () => undefined,
};

function args(...argv: string[]): ParsedArgs {
  return parseArgs(argv, schemaCommand.spec);
}

async function run(...argv: string[]): Promise<{ text: string; json: Json }> {
  const outcome = await schemaCommand.run(args(...argv), io);
  return { text: outcome.text, json: outcome.json as Json };
}

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

/** The first object anywhere in `value` whose `fn` is `fn`. */
function findFieldSpec(value: unknown, fn: string): Json | undefined {
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = findFieldSpec(v, fn);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  if ((value as Json)["fn"] === fn) return value as Json;
  for (const v of Object.values(value)) {
    const hit = findFieldSpec(v, fn);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

async function rejected(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (err) {
    return err;
  }
  throw new Error("expected a rejection");
}

describe("pcg schema graph", () => {
  it("prints docs/graph.schema.json byte for byte, as text and as the json it renders", async () => {
    const committed = readFileSync(repo("docs/graph.schema.json"), "utf8").replaceAll("\r\n", "\n");
    const bare = await run();
    expect(bare.text).toBe(committed);
    expect(`${JSON.stringify(bare.json, null, 2)}\n`).toBe(bare.text);
    expect((await run("graph")).text).toBe(committed);
  });

  it("compiles in strict mode and accepts a corpus graph", async () => {
    const { json } = await run();
    const ajv = makeAjv();
    const validate = ajv.compile(json);
    const doc = JSON.parse(readFileSync(repo("graphs/basics-attribute-remap.json"), "utf8")) as unknown;
    expect(validate(doc), ajv.errorsText(validate.errors)).toBe(true);
    expect(validate({ formatVersion: 1, seed: 0, nodes: [{ id: "a", type: "nope", params: {} }] })).toBe(false);
    expect(ajvWarnings).toEqual([]);
  });

  it("--node describes one node object", async () => {
    const { text, json } = await run("--node", "pointGrid");
    expect(`${JSON.stringify(json, null, 2)}\n`).toBe(text);
    const validate = makeAjv().compile(json);
    expect(validate({ id: "g", type: "pointGrid", params: {} })).toBe(true);
    expect(validate({ id: "g", type: "pointGrid", params: { nope: 1 } })).toBe(false);
  });

  it("refuses an unknown --node type with a record naming the nearest one, never correcting it", async () => {
    const err = await rejected(run("graph", "--node", "pointGridd"));
    expect(err).toBeInstanceOf(CliError);
    const e = err as CliError;
    expect(e.code).toBe("unknown-node-type");
    expect(e.exitCode).toBe(1);
    expect(e.got).toBe("pointGridd");
    expect(e.didYouMean).toContain("pointGrid");
    expect(e.valid).toContain("pointGrid");
    expect(e.valid).toEqual([...(e.valid ?? [])].sort());
    expect(e.message).toMatch(/^schema: unknown node type "pointGridd"; did you mean "pointGrid"\? registered types: /);
  });

  it("--compact is smaller and still compiles, for every subject that has prose", async () => {
    for (const subject of ["graph", "field", "diagnostic"]) {
      const full = await run(subject);
      const compact = await run(subject, "--compact");
      expect(compact.text.length, subject).toBeLessThan(full.text.length);
      expect(`${JSON.stringify(compact.json, null, 2)}\n`).toBe(compact.text);
      expect(() => makeAjv().compile(compact.json), subject).not.toThrow();
    }
    expect(ajvWarnings).toEqual([]);
  });
});

describe("pcg schema field", () => {
  it("is a standalone document: it compiles, accepts a corpus field spec and refuses an unknown fn", async () => {
    const { text, json } = await run("field");
    expect(`${JSON.stringify(json, null, 2)}\n`).toBe(text);
    expect(json["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(json["$ref"]).toBe("#/$defs/fieldSpec");
    const defs = json["$defs"] as Json;
    expect(Object.keys(defs)).toEqual(Object.keys(defs).sort());
    expect(defs).not.toHaveProperty("node");

    const ajv = makeAjv();
    const validate = ajv.compile(json);
    const graph = JSON.parse(readFileSync(repo("graphs/basics-attribute-remap.json"), "utf8")) as unknown;
    const spec = findFieldSpec(graph, "perlinNoise");
    expect(spec).toBeDefined();
    expect(validate(spec), ajv.errorsText(validate.errors)).toBe(true);
    expect(validate({ fn: "nope" })).toBe(false);
    expect(validate({ fn: "perlinNoise", opts: { nope: 1 } })).toBe(false);
    expect(ajvWarnings).toEqual([]);
  });

  it("carries exactly the graph schema's fieldSpec definitions, unchanged", async () => {
    const field = (await run("field")).json;
    const graphDefs = (await run()).json["$defs"] as Json;
    for (const [name, def] of Object.entries(field["$defs"] as Json)) {
      expect(def, name).toEqual(graphDefs[name]);
    }
  });
});

describe("pcg schema diagnostic", () => {
  it("compiles, accepts a record the library produced and refuses an unknown code or stray key", async () => {
    const { text, json } = await run("diagnostic");
    expect(`${JSON.stringify(json, null, 2)}\n`).toBe(text);
    const ajv = makeAjv();
    const validate = ajv.compile(json);

    const [record] = diagnosticsOf(new Error("x"));
    expect(validate(record), ajv.errorsText(validate.errors)).toBe(true);
    const cli = new CliError("schema: nope", {
      code: "unknown-node-type",
      got: { deep: [1, null] },
      valid: ["a"],
      didYouMean: ["a"],
      nodePath: ["n"],
    });
    expect(validate(cli.diagnostics[0]), ajv.errorsText(validate.errors)).toBe(true);

    expect(validate({ ...record, code: "no-such-code" })).toBe(false);
    expect(validate({ ...record, severity: "info" })).toBe(false);
    expect(validate({ ...record, extra: 1 })).toBe(false);
    expect(validate({ code: "error", severity: "error" })).toBe(false);

    const compact = makeAjv().compile((await run("diagnostic", "--compact")).json);
    expect(compact(record)).toBe(true);
    expect(compact({ ...record, code: "no-such-code" })).toBe(false);
    expect(ajvWarnings).toEqual([]);
  });
});

describe("pcg schema: usage errors", () => {
  it("refuses an unknown subject with a did-you-mean and the valid subjects", async () => {
    const err = await rejected(run("grpah"));
    expect(err).toBeInstanceOf(CliUsageError);
    expect((err as Error).message).toBe(
      'schema: unknown subject "grpah"; did you mean "graph"? valid subjects: graph, field, diagnostic',
    );
  });

  it("refuses --node on a subject other than graph", async () => {
    for (const subject of ["field", "diagnostic"]) {
      const err = await rejected(run(subject, "--node", "pointGrid"));
      expect(err, subject).toBeInstanceOf(CliUsageError);
      expect((err as Error).message).toContain("--node");
    }
  });
});

describe("pcg schema through runCli", () => {
  it.skipIf(!COMMANDS.some((c) => c.spec.name === "schema"))(
    "prints the same bytes with and without --json",
    async () => {
      const outs: string[] = [];
      const capture = (into: string[]): CliIo => ({ ...io, out: (t) => void into.push(t) });
      expect(await runCli(["schema"], capture(outs))).toBe(EXIT_OK);
      const json: string[] = [];
      expect(await runCli(["schema", "--json"], capture(json))).toBe(EXIT_OK);
      expect(json.join("")).toBe(outs.join(""));
      expect(outs.join("")).toBe(readFileSync(repo("docs/graph.schema.json"), "utf8").replaceAll("\r\n", "\n"));
    },
  );
});
