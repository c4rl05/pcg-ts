/**
 * The corpus module's pure half: ranking, the node lookup a usage snippet
 * quotes, the compact JSON it prints, and the ways reading the index
 * degrades instead of failing.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type CorpusEntry,
  compactJson,
  exampleSection,
  findNodeJson,
  rankExamples,
  readCorpusIndex,
  usageLines,
} from "./corpus.js";
import type { CliIo } from "./io.js";

const INDEX = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../docs/graphs.json", import.meta.url)), "utf8"),
) as CorpusEntry[];

function entry(file: string, nodeTypes: readonly string[]): CorpusEntry {
  return { file, path: `graphs/${file}`, title: file, tags: ["t"], nodeTypes, primitives: [], nodeCount: 1 };
}

function ioWith(files: Record<string, string>, packagePath?: CliIo["packagePath"]): CliIo {
  return {
    out: () => undefined,
    err: () => undefined,
    readFile: (path) => {
      const text = files[path];
      if (text === undefined) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return text;
    },
    writeFile: () => undefined,
    ...(packagePath !== undefined ? { packagePath } : {}),
  };
}

describe("rankExamples", () => {
  it("puts basics- first, then fewest distinct node types, then file name", () => {
    const entries = [
      entry("examples-small.json", ["a"]),
      entry("basics-wide.json", ["a", "b", "c"]),
      entry("pipeline-z.json", ["a", "b"]),
      entry("basics-narrow-b.json", ["a"]),
      entry("basics-narrow-a.json", ["a"]),
      entry("examples-unrelated.json", ["x"]),
    ];
    const ranked = rankExamples(entries, (e) => e.nodeTypes.includes("a")).map((e) => e.file);
    expect(ranked).toEqual([
      "basics-narrow-a.json",
      "basics-narrow-b.json",
      "basics-wide.json",
      "examples-small.json",
      "pipeline-z.json",
    ]);
  });

  it("within a family, leads with the graph named for the subject, then fewest types, then fewer outer nodes", () => {
    const wide = { ...entry("basics-a-dense.json", ["transformPoints", "pointGrid"]), nodeCount: 9 };
    const lean = { ...entry("basics-b-lean.json", ["transformPoints", "pointGrid"]), nodeCount: 2 };
    const named = { ...entry("basics-transform-points.json", ["transformPoints", "pointGrid"]), nodeCount: 5 };
    const one = { ...entry("basics-z-one.json", ["transformPoints"]), nodeCount: 30 };
    const has = (e: CorpusEntry): boolean => e.nodeTypes.includes("transformPoints");
    expect(rankExamples([wide, lean, named, one], has, "transformPoints").map((e) => e.file)).toEqual([
      "basics-transform-points.json", // named for the subject, even with a type more
      "basics-z-one.json", // then fewest distinct types
      "basics-b-lean.json", // then fewer outer nodes
      "basics-a-dense.json",
    ]);
    // The family still decides first: a named graph outside basics- does not jump it.
    const namedPipeline = { ...entry("examples-transform-points.json", ["transformPoints"]), nodeCount: 1 };
    expect(rankExamples([wide, namedPipeline], has, "transformPoints")[0]?.file).toBe("basics-a-dense.json");
    // A primitive is spelled by its last segment; a partial word does not count.
    const scatter = { ...entry("basics-scatter-even.json", ["a", "b"]), nodeCount: 9 };
    expect(rankExamples([lean, scatter], () => true, "fill/scatter-even")[0]?.file).toBe("basics-scatter-even.json");
    expect(rankExamples([lean, named], has, "transformPoint")[0]?.file).toBe("basics-b-lean.json");
  });

  it("is deterministic: the input order never shows through", () => {
    const pred = (e: CorpusEntry): boolean => e.nodeTypes.includes("setAttribute");
    const forward = rankExamples(INDEX, pred, "setAttribute").map((e) => e.file);
    const reversed = rankExamples(INDEX.slice().reverse(), pred, "setAttribute").map((e) => e.file);
    const shuffled = rankExamples(
      INDEX.slice().sort((a, b) => (a.title < b.title ? 1 : -1)),
      pred,
      "setAttribute",
    ).map((e) => e.file);
    expect(reversed).toEqual(forward);
    expect(shuffled).toEqual(forward);
  });

  it("a type used across much of the corpus leads with a focused basics- graph, not the densest one", () => {
    const pred = (e: CorpusEntry): boolean => e.nodeTypes.includes("setAttribute");
    const matching = INDEX.filter(pred);
    // The premise the plan measured: setAttribute is everywhere.
    expect(matching.length).toBeGreaterThanOrEqual(50);
    const [top] = rankExamples(INDEX, pred);
    expect(top?.file.startsWith("basics-")).toBe(true);
    const fewestInBasics = Math.min(
      ...matching.filter((e) => e.file.startsWith("basics-")).map((e) => e.nodeTypes.length),
    );
    expect(top?.nodeTypes.length).toBe(fewestInBasics);
    // And it is nowhere near the densest graph using the type.
    const densest = Math.max(...matching.map((e) => e.nodeTypes.length));
    expect(top?.nodeTypes.length).toBeLessThan(densest);
  });
});

describe("findNodeJson", () => {
  it("returns the first outer node of the type, whole", () => {
    const graph = {
      nodes: [
        { id: "a", type: "pointGrid", params: {} },
        { id: "b", type: "setAttribute", params: { name: "h" } },
        { id: "c", type: "setAttribute", params: { name: "k" } },
      ],
    };
    expect(findNodeJson(graph, "setAttribute")).toEqual({ id: "b", type: "setAttribute", params: { name: "h" } });
    expect(findNodeJson(graph, "pathShift")).toBeUndefined();
  });

  it("prefers an outer node over one nested in a subgraph payload, and finds nested ones", () => {
    const nested = { id: "inner", type: "jitterPoints", params: {} };
    const graph = {
      nodes: [
        { id: "sub", type: "subgraph", params: {}, subgraph: { graph: { nodes: [nested] } } },
        { id: "outer", type: "pointGrid", params: {} },
      ],
    };
    expect(findNodeJson(graph, "jitterPoints")).toEqual(nested);
    expect(findNodeJson(graph, "pointGrid")?.id).toBe("outer");
  });
});

describe("compactJson and usageLines", () => {
  it("keeps scalar arrays on one line and stays valid JSON with the same values", () => {
    const node = { id: "s", type: "pathShift", params: { attributes: ["P"], offset: 1, nested: [{ a: [1, 2] }] } };
    const text = compactJson(node);
    expect(text).toContain('"attributes": ["P"]');
    expect(text).toContain('"a": [1, 2]');
    expect(JSON.parse(text)).toEqual(node);
  });

  it("keeps what fits in 100 columns on one line, and breaks out only what does not", () => {
    const expression = { fn: "mul", args: [{ fn: "position" }, { fn: "param", name: "lift", value: 2, min: 0, max: 9 }] };
    const node = {
      id: "t",
      type: "transformPoints",
      params: { translate: { fn: "add", args: [expression, expression, expression] }, scale: [1, 1, 1] },
    };
    const lines = compactJson(node).split("\n");
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(100);
    // Scalars in a broken-out array share a line.
    const packed = compactJson({ args: [{ fn: "x".repeat(90) }, 0, 1, 5, 13] }).split("\n");
    expect(packed).toContain("    0, 1, 5, 13");
    // A usage snippet's printed lines, prefix included, stay within 100 columns.
    const grid = { id: "grid", type: "pointGrid", params: { countX: 12, countY: 1, countZ: 12, spacing: [4, 0, 4], origin: [-22, 0, -22] } };
    for (const line of usageLines({ path: "g.json", node: grid })) expect(line.length).toBeLessThanOrEqual(100);
    expect(lines).toContain('    "scale": [1, 1, 1]');
    expect(lines.length).toBeLessThan(JSON.stringify(node, null, 2).split("\n").length);
    expect(JSON.parse(compactJson(node))).toEqual(node);
  });

  it("cuts at 20 lines and names the full graph", () => {
    const params: Record<string, number> = {};
    for (let i = 0; i < 40; i++) params[`p${i}`] = i;
    const lines = usageLines({ path: "graphs/x.json", node: { id: "n", type: "t", params } });
    expect(lines).toHaveLength(21);
    expect(lines[20]).toMatch(/^ {2}… \d+ more lines; full graph: graphs\/x\.json$/);
    const short = usageLines({ path: "graphs/x.json", node: { id: "n", type: "t", params: {} } });
    expect(short.join("\n")).not.toContain("full graph");
    // One line over the budget prints whole: the note would cost that line.
    const wide = Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`p${i}`, "v".repeat(60)]));
    const exact = usageLines({ path: "g.json", node: wide });
    expect(exact).toHaveLength(21);
    expect(exact.join("\n")).not.toContain("more line");
  });
});

describe("readCorpusIndex", () => {
  it("is unavailable, with a note, when the io has no packagePath", () => {
    const index = readCorpusIndex(ioWith({}));
    expect(index.available).toBe(false);
    if (!index.available) expect(index.note).toContain("docs/graphs.json");
  });

  it("is unavailable when packagePath answers undefined", () => {
    expect(readCorpusIndex(ioWith({}, () => undefined)).available).toBe(false);
  });

  it("is unavailable, naming the path, when the file cannot be read or is malformed", () => {
    const missing = readCorpusIndex(ioWith({}, (rel) => `/pkg/${rel}`));
    expect(missing.available).toBe(false);
    if (!missing.available) expect(missing.note).toContain("/pkg/docs/graphs.json could not be read");

    const bad = readCorpusIndex(
      ioWith({ "/pkg/docs/graphs.json": JSON.stringify([{ file: "a.json" }]) }, (rel) => `/pkg/${rel}`),
    );
    expect(bad.available).toBe(false);
    if (!bad.available) expect(bad.note).toBe('/pkg/docs/graphs.json entry [0] has no valid "path"');
  });

  it("reads entries and prints paths through packagePath", () => {
    const index = readCorpusIndex(
      ioWith({ "/pkg/docs/graphs.json": JSON.stringify([entry("basics-a.json", ["x"])]) }, (rel) => `/pkg/${rel}`),
    );
    expect(index.available).toBe(true);
    if (!index.available) return;
    expect(index.entries).toHaveLength(1);
    expect(index.pathOf(index.entries[0] as CorpusEntry)).toBe("/pkg/graphs/basics-a.json");
    expect(exampleSection(index, index.entries, "pcg graphs --node x", "none")).toEqual([
      "examples (1):",
      "  /pkg/graphs/basics-a.json — basics-a.json",
      "  all 1: pcg graphs --node x",
    ]);
  });
});
