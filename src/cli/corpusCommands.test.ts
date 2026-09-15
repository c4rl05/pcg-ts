/**
 * The corpus one step from every node type and primitive: `pcg graphs`,
 * the examples and usage sections of `pcg nodes <type>`, and
 * `pcg run <name> --help`. The io here reads the REAL shipped files under
 * this repository, with `packagePath` answering package-relative paths the
 * way the Node binding does when run from the package root.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deserializeGraph, getRegisteredSubgraph, listSubgraphs } from "../index.js";
import { EXIT_FAILURE, EXIT_OK, runCli } from "./index.js";
import type { CliIo } from "./io.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface IndexEntry {
  readonly file: string;
  readonly path: string;
  readonly nodeTypes: readonly string[];
  readonly primitives: readonly string[];
  readonly tags: readonly string[];
}
const INDEX = JSON.parse(readFileSync(join(ROOT, "docs/graphs.json"), "utf8")) as IndexEntry[];

interface Run {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

async function run(argv: readonly string[], opts: { packagePath?: CliIo["packagePath"] | null } = {}): Promise<Run> {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (t) => void out.push(t),
    err: (t) => void err.push(t),
    readFile: (p) => readFileSync(isAbsolute(p) ? p : join(ROOT, p), "utf8"),
    writeFile: () => undefined,
  };
  // `null` means "an io written before packagePath existed".
  const packagePath = opts.packagePath === undefined ? (rel: string) => rel : opts.packagePath;
  const withPath: CliIo = packagePath === null ? io : { ...io, packagePath };
  const code = await runCli(argv, withPath);
  return { code, out: out.join(""), err: err.join("") };
}

describe("pcg graphs", () => {
  it("--node pathShift returns exactly the set docs/graphs.json lists for that type", async () => {
    const r = await run(["graphs", "--node", "pathShift", "--json"]);
    expect(r.code).toBe(EXIT_OK);
    const files = (JSON.parse(r.out) as { file: string; path: string }[]).map((e) => e.file).sort();
    const expected = INDEX.filter((e) => e.nodeTypes.includes("pathShift")).map((e) => e.file).sort();
    expect(expected.length).toBeGreaterThan(0);
    expect(files).toEqual(expected);
  });

  it("combines --node, --primitive and --tag with AND", async () => {
    const withPrimitive = INDEX.find((e) => e.primitives.length > 0 && e.nodeTypes.length > 0) as IndexEntry;
    const [primitive] = withPrimitive.primitives as [string];
    const [tag] = withPrimitive.tags as [string];
    const [node] = withPrimitive.nodeTypes as [string];
    const r = await run(["graphs", "--primitive", primitive, "--tag", tag, "--node", node, "--json"]);
    expect(r.code).toBe(EXIT_OK);
    const files = (JSON.parse(r.out) as { file: string }[]).map((e) => e.file).sort();
    const expected = INDEX.filter(
      (e) => e.primitives.includes(primitive) && e.tags.includes(tag) && e.nodeTypes.includes(node),
    )
      .map((e) => e.file)
      .sort();
    expect(files).toEqual(expected);
    expect(files).toContain(withPrimitive.file);
  });

  it("with no filter lists the whole corpus as a path/title/nodes table", async () => {
    const r = await run(["graphs"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out.split("\n")[0]).toBe(`${INDEX.length} graphs in the corpus`);
    expect(r.out).toMatch(/^ {2}path +title +types +nodes$/m);
    for (const e of INDEX) expect(r.out).toContain(`  ${e.path} `);
  });

  it("an unknown --node is the registry's own error, exit 1", async () => {
    const r = await run(["graphs", "--node", "pathShfit"]);
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain('unknown node type "pathShfit"');
  });

  it("an unknown --tag lists the valid tags and suggests, exit 1", async () => {
    const r = await run(["graphs", "--tag", "basic"]);
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain('unknown tag "basic"; did you mean "basics"? tags in the corpus: ');
  });

  it("an unknown --primitive suggests the nearest registered name, exit 1", async () => {
    const [first] = listSubgraphs().map((e) => e.name).sort();
    const typo = (first as string).slice(0, -1);
    const r = await run(["graphs", "--primitive", typo]);
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain(`unknown subgraph "${typo}"`);
    expect(r.err).toContain(`did you mean`);
    expect(r.err).toContain(`"${first}"`);
  });

  it("fails, naming why, when the index is out of reach", async () => {
    const r = await run(["graphs"], { packagePath: null });
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain("graphs: ");
    expect(r.err).toContain("docs/graphs.json");
  });
});

describe("pcg nodes <type> — examples and usage", () => {
  it("lists the corpus graphs using the type and quotes the node's own JSON", async () => {
    const r = await run(["nodes", "pathShift"]);
    expect(r.code).toBe(EXIT_OK);
    const expected = INDEX.filter((e) => e.nodeTypes.includes("pathShift"));
    expect(r.out).toContain(`examples (${expected.length}):`);
    expect(r.out).toContain(`  ${(expected[0] as IndexEntry).path} — `);
    expect(r.out).toContain(`  all ${expected.length}: pcg graphs --node pathShift`);
    expect(r.out).toContain(`usage (from ${(expected[0] as IndexEntry).path}):`);
    expect(r.out).toContain('"type": "pathShift"');
    // The catalog above it is still there, required pins included.
    expect(r.out).toContain("inputs:  in (geometry, required)");
  });

  it("caps the text at five examples and the usage at twenty lines", async () => {
    const r = await run(["nodes", "setAttribute"]);
    expect(r.code).toBe(EXIT_OK);
    const section = r.out.slice(r.out.indexOf("examples ("));
    const exampleLines = section.split("\n").filter((l) => /^ {2}graphs\/\S+\.json — /.test(l));
    expect(exampleLines).toHaveLength(5);
    const usage = section.slice(section.indexOf("usage (from ")).split("\n").slice(1).filter((l) => l !== "");
    expect(usage.length).toBeLessThanOrEqual(21);
  });

  it("the usage snippet is that node, verbatim, from the top example", async () => {
    const r = await run(["nodes", "setAttribute", "--json"]);
    const json = JSON.parse(r.out) as {
      type: string;
      inputs: unknown[];
      examples: { path: string; title: string }[];
      usage?: { path: string; node: { id: string; type: string } };
    };
    expect(json.type).toBe("setAttribute");
    expect(json.inputs.length).toBeGreaterThan(0);
    const expected = INDEX.filter((e) => e.nodeTypes.includes("setAttribute"));
    expect(json.examples).toHaveLength(expected.length);
    expect(json.usage?.path).toBe(json.examples[0]?.path);
    const graph = JSON.parse(readFileSync(join(ROOT, json.usage?.path as string), "utf8")) as {
      nodes: { id: string; type: string }[];
    };
    const node = graph.nodes.find((n) => n.id === json.usage?.node.id);
    expect(node?.type).toBe("setAttribute");
    expect(json.usage?.node).toEqual(node);
  });

  it("a missing index degrades to one note line and still exits 0", async () => {
    for (const packagePath of [null, (rel: string) => `/nowhere/${rel}`] as const) {
      const r = await run(["nodes", "pathShift"], { packagePath });
      expect(r.code).toBe(EXIT_OK);
      expect(r.out.match(/^examples: unavailable — .+$/gm)).toHaveLength(1);
      expect(r.out).not.toContain("usage (from");
      const json = JSON.parse((await run(["nodes", "pathShift", "--json"], { packagePath })).out) as {
        examples: unknown[];
        examplesNote?: string;
      };
      expect(json.examples).toEqual([]);
      expect(json.examplesNote).toContain("docs/graphs.json");
    }
  });

  it("a type no corpus graph uses says so", async () => {
    const r = await run(["nodes", "dataInput"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out).toContain("examples (0): no corpus graph uses dataInput");
  });
});

describe("pcg run <primitive> --help", () => {
  const names = listSubgraphs()
    .map((e) => e.name)
    .filter((n) => !n.startsWith("test/"))
    .sort();

  it("shows every exposed param name, the pins and an example, for every shipped primitive", async () => {
    expect(names.length).toBeGreaterThan(20);
    for (const name of names) {
      const r = await run(["run", name, "--help"]);
      expect(r.code, `${name}: ${r.err}`).toBe(EXIT_OK);
      // The static help still leads.
      expect(r.out.startsWith("pcg run <name> [flags]")).toBe(true);
      expect(r.out).toContain(`primitive ${name} #${getRegisteredSubgraph(name).hash}`);
      expect(r.out).toMatch(/^inputs: {2}/m);
      expect(r.out).toMatch(/^outputs: /m);
      expect(r.out).toMatch(/^example/m);
      expect(r.out).toMatch(/^examples( \(\d+\):|:)/m);
      for (const p of getRegisteredSubgraph(name).subgraph.params ?? []) {
        expect(r.out, `${name} --help is missing param ${p.name}`).toMatch(new RegExp(`^ {2}${p.name} `, "m"));
      }
    }
  });

  it("every example runs as printed: a pcg run line cooks, a graph node loads wired as shown", async () => {
    // A help line that does not run is worse than none. A primitive with a
    // REQUIRED geometry input cannot be run by `pcg run` (geometry has no
    // JSON form), so its example is the node JSON that references it plus a
    // connection per required geometry input, which must load when wired
    // exactly that way. One whose geometry input is optional prints a
    // `pcg run` line, and that line must cook — which is the whole claim.
    let commands = 0;
    let nodes = 0;
    let optionalGeometry = 0;
    for (const name of names) {
      const help = await run(["run", name, "--help"]);
      const line = /^ {2}pcg run (.+)$/m.exec(help.out)?.[1];
      if (line !== undefined) {
        if (getRegisteredSubgraph(name).subgraph.inputs.length > 0) optionalGeometry++;
        const cooked = await run(["run", ...line.split(" ")]);
        expect(cooked.code, `${name}: pcg run ${line}\n${cooked.err}`).toBe(EXIT_OK);
        expect(cooked.out).toContain(`ran "${name}"`);
        commands++;
        continue;
      }
      expect(help.out).toContain("pcg run cannot bind its geometry");
      const node = JSON.parse(/^ {2}node: +(.+)$/m.exec(help.out)?.[1] as string) as { id: string };
      const connections = [...help.out.matchAll(/^ {2}connection: +(.+)$/gm)].map(
        (m) => JSON.parse(m[1] as string) as { from: [string, string]; to: [string, string] },
      );
      expect(connections.length).toBeGreaterThan(0);
      const graph = {
        formatVersion: 1,
        seed: 1,
        nodes: [{ id: "src", type: "pointGrid", params: {} }, node],
        connections: connections.map((c) => ({ from: ["src", "out"], to: c.to })),
        outputs: [{ id: node.id, pin: getRegisteredSubgraph(name).subgraph.outputs[0]?.name ?? "out", name: "out" }],
      };
      expect(() => deserializeGraph(graph), name).not.toThrow();
      nodes++;
    }
    expect(commands).toBeGreaterThan(0);
    expect(nodes).toBeGreaterThan(0);
    // fill/volume-by-noise: its `in` box is optional, so it runs bare.
    expect(optionalGeometry).toBeGreaterThan(0);
  });

  it("lists the corpus graphs that reference the primitive", async () => {
    const referenced = INDEX.find((e) => e.primitives.length > 0) as IndexEntry;
    const [name] = referenced.primitives as [string];
    const r = await run(["run", name, "--help"]);
    const count = INDEX.filter((e) => e.primitives.includes(name)).length;
    expect(r.out).toContain(`examples (${count}):`);
    expect(r.out).toContain(`all ${count}: pcg graphs --primitive ${name}`);
  });

  it("without a name keeps the static help", async () => {
    const r = await run(["run", "--help"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out.startsWith("pcg run <name> [flags]")).toBe(true);
    expect(r.out).not.toMatch(/^primitive /m);
    expect(r.out).not.toMatch(/^params:/m);
  });

  it("an unknown primitive is exit 1 with the registry's list and a did-you-mean", async () => {
    const name = names[0] as string;
    const typo = `${name.slice(0, -2)}${name.slice(-1)}`;
    for (const argv of [
      ["run", typo, "--help"],
      ["run", typo],
    ]) {
      const r = await run(argv);
      expect(r.code).toBe(EXIT_FAILURE);
      // The suggestion comes BEFORE the long list, once.
      expect(r.err).toMatch(
        new RegExp(`unknown subgraph "${typo.replace(/[/.]/g, "\\$&")}"; did you mean [^?]*"${name.replace(/[/.]/g, "\\$&")}"\\? registered subgraphs: `),
      );
      expect(r.err.match(/did you mean/g)).toHaveLength(1);
    }
  });

  it("the params it lists are the live exposed params, derived schemas included", async () => {
    const name = names.find((n) => (getRegisteredSubgraph(n).subgraph.params ?? []).length > 0) as string;
    const r = await run(["run", name, "--help"]);
    expect(r.out).toContain("  name ");
    expect(r.out).toMatch(/^ {2}name +type +default +range +enum +field +description$/m);
    // One row per exposed param the recipe declares, no more and no fewer.
    const rows = r.out
      .slice(r.out.indexOf("params:"), r.out.search(/^example/m))
      .split("\n")
      .filter((l) => /^ {2}\S/.test(l) && !/^ {2}name +type/.test(l));
    expect(rows).toHaveLength((getRegisteredSubgraph(name).subgraph.params ?? []).length);
  });
});
