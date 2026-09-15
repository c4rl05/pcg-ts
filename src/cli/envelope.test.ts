/**
 * The failure envelope: under `--json` EVERY failure prints exactly one JSON
 * object on stdout — `{ ok: false, command, exitCode, errors, warnings }` —
 * while stderr keeps the text; the exit codes 1 / 2 / 3; `validate` listing
 * every fault and `--strict`; did-you-mean on commands, flags and names; and
 * the corpus loop proving that no graph or primitive that cooked before the
 * checks is refused by them.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadGraphs } from "../docs/graphIndex.js";
import { isDiagnostic } from "../diagnostics/index.js";
import { listSubgraphs } from "../index.js";
import { EXIT_FAILURE, EXIT_INVALID_GRAPH, EXIT_OK, EXIT_USAGE, runCli } from "./index.js";
import type { CliIo } from "./io.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Run {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

/** Writes under `/file/` fail the way a path below an existing FILE does. */
function refuseWrite(path: string): void {
  if (path.startsWith("/file/")) {
    throw Object.assign(new Error(`EEXIST: file already exists, mkdir '/file'`), { code: "EEXIST" });
  }
}

/** An io over in-memory files, falling back to the real repository for relative paths. */
async function run(argv: readonly string[], files: Record<string, string> = {}): Promise<Run> {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (t) => void out.push(t),
    err: (t) => void err.push(t),
    readFile: (p) => {
      if (p === "/dir") {
        throw Object.assign(new Error("EISDIR: illegal operation on a directory, read"), { code: "EISDIR" });
      }
      const mem = files[p];
      if (mem !== undefined) return mem;
      if (p.startsWith("/")) {
        throw Object.assign(new Error(`ENOENT: no such file or directory, open '${p}'`), { code: "ENOENT" });
      }
      return readFileSync(isAbsolute(p) ? p : join(ROOT, p), "utf8");
    },
    writeFile: (p) => refuseWrite(p),
    writeBytes: (p) => refuseWrite(p),
    packagePath: (rel) => rel,
  };
  const code = await runCli(argv, io);
  return { code, out: out.join(""), err: err.join("") };
}

interface Envelope {
  readonly ok: false;
  readonly command: string | null;
  readonly exitCode: number;
  readonly errors: readonly Record<string, unknown>[];
  readonly warnings: readonly Record<string, unknown>[];
}

/** Assert `r` is one well-formed failure envelope with exit `code`, and return it. */
function envelope(r: Run, code: number): Envelope {
  expect(r.code).toBe(code);
  expect(r.err.trim()).not.toBe("");
  let parsed: unknown;
  expect(() => (parsed = JSON.parse(r.out))).not.toThrow();
  const e = parsed as Envelope;
  expect(Object.keys(e)).toEqual(["ok", "command", "exitCode", "errors", "warnings"]);
  expect(e.ok).toBe(false);
  expect(e.exitCode).toBe(code);
  expect(e.errors.length).toBeGreaterThan(0);
  for (const d of [...e.errors, ...e.warnings]) expect(isDiagnostic(d)).toBe(true);
  return e;
}

const GOOD = JSON.stringify({
  formatVersion: 1,
  seed: 1,
  nodes: [{ id: "grid", type: "pointGrid", params: {} }],
  connections: [],
  outputs: [{ id: "grid", pin: "out", name: "points" }],
});

/** Three independent faults, one per phase-ordered unit. */
const THREE_FAULTS = JSON.stringify({
  formatVersion: 1,
  seed: 1,
  nodes: [
    { id: "a", type: "pointGridd", params: {} },
    { id: "b", type: "pointGrid", params: { cuont: 3 } },
  ],
  connections: [{ from: ["nope", "out"], to: ["b", "in"] }],
  outputs: [{ id: "b", pin: "out", name: "points" }],
});

/** Loads, but a node an output reads has its required pin open. */
const OPEN_PIN = JSON.stringify({
  formatVersion: 1,
  seed: 1,
  nodes: [
    { id: "grid", type: "pointGrid", params: {} },
    { id: "move", type: "transformPoints", params: {} },
  ],
  connections: [],
  outputs: [
    { id: "grid", pin: "out", name: "points" },
    { id: "move", pin: "out", name: "moved" },
  ],
});

/** Loads clean, with one unreachable node: a warning, never an error. */
const STRAY = JSON.stringify({
  formatVersion: 1,
  seed: 1,
  nodes: [
    { id: "grid", type: "pointGrid", params: {} },
    { id: "stray", type: "pointGrid", params: {} },
  ],
  connections: [],
  outputs: [{ id: "grid", pin: "out", name: "points" }],
});

/** Checks clean and throws mid-cook: the filter reads an attribute nothing wrote. */
const THROWS = JSON.stringify({
  formatVersion: 1,
  seed: 1,
  nodes: [
    { id: "grid", type: "pointGrid", params: {} },
    { id: "keep", type: "filterByAttribute", params: { attribute: "height", comparison: "gt", value: 0 } },
  ],
  connections: [{ from: ["grid", "out"], to: ["keep", "in"] }],
  outputs: [{ id: "keep", pin: "out", name: "points" }],
});

const FILES = {
  "/good.json": GOOD,
  "/three.json": THREE_FAULTS,
  "/open.json": OPEN_PIN,
  "/stray.json": STRAY,
  "/throws.json": THROWS,
  "/empty.json": "",
  "/broken.json": "{ nope",
  "/bad-utf8.json": "{\"formatVersion\": 1, ��}",
  "/array.json": "[1, 2]",
};

describe("--json failure envelope: one object on stdout for every failure class", () => {
  const cases: readonly { name: string; argv: string[]; code: number; command: string | null; first: string }[] = [
    { name: "unknown command", argv: ["cokk", "g.json", "--json"], code: EXIT_USAGE, command: null, first: "unknown-command" },
    { name: "--json before an unknown command", argv: ["--json", "cokk"], code: EXIT_USAGE, command: null, first: "unknown-command" },
    { name: "no command, --json only", argv: ["--json"], code: EXIT_USAGE, command: null, first: "usage" },
    { name: "unknown flag", argv: ["cook", "/good.json", "--no-timing", "--json"], code: EXIT_USAGE, command: "cook", first: "usage" },
    { name: "--json before the command, unknown flag", argv: ["--json", "cook", "/good.json", "--bogus"], code: EXIT_USAGE, command: "cook", first: "usage" },
    { name: "missing argument", argv: ["validate", "--json"], code: EXIT_USAGE, command: "validate", first: "usage" },
    { name: "missing flag value", argv: ["cook", "/good.json", "--json", "--seed"], code: EXIT_USAGE, command: "cook", first: "usage" },
    { name: "bad flag value", argv: ["cook", "/good.json", "--seed", "-3", "--json"], code: EXIT_USAGE, command: "cook", first: "usage" },
    { name: "missing file", argv: ["validate", "/nope.json", "--json"], code: EXIT_FAILURE, command: "validate", first: "file-unreadable" },
    { name: "directory as file", argv: ["cook", "/dir", "--json"], code: EXIT_FAILURE, command: "cook", first: "file-unreadable" },
    { name: "empty file", argv: ["validate", "/empty.json", "--json"], code: EXIT_INVALID_GRAPH, command: "validate", first: "invalid-json" },
    { name: "invalid JSON", argv: ["inspect", "/broken.json", "--json"], code: EXIT_INVALID_GRAPH, command: "inspect", first: "invalid-json" },
    { name: "invalid UTF-8 (replacement characters)", argv: ["cook", "/bad-utf8.json", "--json"], code: EXIT_INVALID_GRAPH, command: "cook", first: "invalid-json" },
    { name: "not a graph object", argv: ["validate", "/array.json", "--json"], code: EXIT_INVALID_GRAPH, command: "validate", first: "graph-not-object" },
    { name: "load faults", argv: ["cook", "/three.json", "--json"], code: EXIT_INVALID_GRAPH, command: "cook", first: "unknown-node-type" },
    { name: "check error", argv: ["cook", "/open.json", "--json"], code: EXIT_INVALID_GRAPH, command: "cook", first: "required-pin-unconnected" },
    { name: "check error under render", argv: ["render", "/open.json", "--out", "/x.svg", "--json"], code: EXIT_INVALID_GRAPH, command: "render", first: "required-pin-unconnected" },
    { name: "a node throws mid-cook", argv: ["cook", "/throws.json", "--json"], code: EXIT_FAILURE, command: "cook", first: "attribute-not-found" },
    { name: "unknown --node", argv: ["inspect", "/good.json", "--node", "gird", "--json"], code: EXIT_FAILURE, command: "inspect", first: "unknown-node" },
    { name: "unknown --output", argv: ["inspect", "/good.json", "--output", "point", "--json"], code: EXIT_FAILURE, command: "inspect", first: "unknown-output" },
    { name: "unknown node type", argv: ["nodes", "pointGridd", "--json"], code: EXIT_FAILURE, command: "nodes", first: "unknown-node-type" },
    { name: "unknown field fn", argv: ["fields", "perlinNoize", "--json"], code: EXIT_FAILURE, command: "fields", first: "unknown-field-fn" },
    { name: "unknown primitive", argv: ["run", "shape/dsic", "--json"], code: EXIT_FAILURE, command: "run", first: "unknown-subgraph" },
    { name: "unknown primitive under --help", argv: ["run", "shape/dsic", "--help", "--json"], code: EXIT_FAILURE, command: "run", first: "unknown-subgraph" },
    { name: "geometry-input primitive under run", argv: ["run", "write/random-yaw", "--json"], code: EXIT_INVALID_GRAPH, command: "run", first: "required-pin-unconnected" },
    { name: "rejected --param value", argv: ["run", "shape/disc", "--param", "count=-5", "--json"], code: EXIT_USAGE, command: "run", first: "invalid-param-value" },
    { name: "--strict on a warning", argv: ["validate", "/stray.json", "--strict", "--json"], code: EXIT_INVALID_GRAPH, command: "validate", first: "node-unreachable" },
    { name: "unknown schema --node", argv: ["schema", "--node", "pointGridd", "--json"], code: EXIT_FAILURE, command: "schema", first: "unknown-node-type" },
    { name: "--json=true before the command", argv: ["--json=true", "cook", "/nope.json"], code: EXIT_FAILURE, command: "cook", first: "file-unreadable" },
    { name: "bad --seed with a missing file is still a misuse", argv: ["cook", "/nope.json", "--seed", "-1", "--json"], code: EXIT_USAGE, command: "cook", first: "usage" },
    { name: "bad --width on a graph that throws is still a misuse", argv: ["render", "/throws.json", "--out", "/w.svg", "--width", "0", "--json"], code: EXIT_USAGE, command: "render", first: "usage" },
    { name: "bad --rows on an invalid graph is still a misuse", argv: ["inspect", "/three.json", "--rows", "-1", "--json"], code: EXIT_USAGE, command: "inspect", first: "usage" },
    { name: "--out that cannot be written", argv: ["cook", "/good.json", "--out", "/file/report.json", "--json"], code: EXIT_FAILURE, command: "cook", first: "error" },
    { name: "--out PNG that cannot be written", argv: ["render", "/good.json", "--out", "/file/x.png", "--size", "64x64", "--json"], code: EXIT_FAILURE, command: "render", first: "error" },
    { name: "unknown --param name", argv: ["run", "shape/disc", "--param", "cuont=3", "--json"], code: EXIT_FAILURE, command: "run", first: "unknown-param" },
    { name: "unreadable --in file", argv: ["run", "shape/disc", "--in", "/nope.json", "--json"], code: EXIT_FAILURE, command: "run", first: "file-unreadable" },
    { name: "--in that is not JSON", argv: ["run", "shape/disc", "--in", "/broken.json", "--json"], code: EXIT_FAILURE, command: "run", first: "invalid-json" },
  ];
  for (const c of cases) {
    it(c.name, async () => {
      const e = envelope(await run(c.argv, FILES), c.code);
      expect(e.command).toBe(c.command);
      expect(e.errors[0]?.["code"]).toBe(c.first);
    });
  }

  it("a flag spelled after the command wins over a leading --json", async () => {
    const r = await run(["--json", "cook", "/nope.json", "--json=false"], FILES);
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.out).toBe("");
    expect(r.err).toContain('cannot read graph file "/nope.json"');
  });

  it("an unwritable --out names the flag and the path", async () => {
    const e = envelope(await run(["cook", "/good.json", "--out", "/file/report.json", "--json"], FILES), EXIT_FAILURE);
    expect(e.errors[0]?.["message"]).toContain('cannot write --out "/file/report.json"');
  });

  it("an unknown --param suggests the nearest exposed one", async () => {
    const e = envelope(await run(["run", "shape/disc", "--param", "cuont=3", "--json"], FILES), EXIT_FAILURE);
    expect(e.errors[0]).toMatchObject({ param: "cuont", didYouMean: ["count"] });
  });

  it("a cook failure keeps the node it happened in", async () => {
    const e = envelope(await run(["cook", "/throws.json", "--json"], FILES), EXIT_FAILURE);
    expect(e.errors[0]).toMatchObject({ nodeId: "keep", nodePath: ["keep"] });
  });

  it("without --json, a failure prints nothing on stdout", async () => {
    for (const argv of [["cokk"], ["cook", "/three.json"], ["cook", "/throws.json"], ["cook", "/good.json", "--bogus"]]) {
      const r = await run(argv, FILES);
      expect(r.out).toBe("");
      expect(r.err.trim()).not.toBe("");
    }
  });

  it("the top-level help documents every exit code the CLI returns", async () => {
    const r = await run(["--help"]);
    expect(r.code).toBe(EXIT_OK);
    for (const n of [EXIT_OK, EXIT_FAILURE, EXIT_USAGE, EXIT_INVALID_GRAPH]) expect(r.out).toMatch(new RegExp(`^  ${n}  `, "m"));
    expect(r.out).toContain('"ok": false');
  });
});

describe("validate reports every fault", () => {
  it("three independent faults: all three, in phase order, with paths, as text and as JSON", async () => {
    const text = await run(["validate", "/three.json"], FILES);
    expect(text.code).toBe(EXIT_INVALID_GRAPH);
    expect(text.out).toBe("");
    expect(text.err).toContain("3 errors");
    expect(text.err).toContain("error unknown-node-type at /nodes/0");
    expect(text.err).toContain("error unknown-param at /nodes/1/params/cuont");
    expect(text.err).toContain("error unknown-node at /connections/0");

    const json = envelope(await run(["validate", "/three.json", "--json"], FILES), EXIT_INVALID_GRAPH);
    expect(json.errors.map((d) => [d["code"], d["path"]])).toEqual([
      ["unknown-node-type", "/nodes/0/type"],
      ["unknown-param", "/nodes/1/params/cuont"],
      ["unknown-node", expect.stringMatching(/^\/connections\/0/)],
    ]);
    expect(json.warnings).toEqual([]);
  });

  it("a warning-only graph passes plain validate, listing the warning, and fails --strict", async () => {
    const plain = await run(["validate", "/stray.json"], FILES);
    expect(plain.code).toBe(EXIT_OK);
    expect(plain.out).toContain("ok  /stray.json  (1 warning)");
    expect(plain.out).toContain("warning node-unreachable at /nodes/1");

    const plainJson = await run(["validate", "/stray.json", "--json"], FILES);
    expect(plainJson.code).toBe(EXIT_OK);
    const report = JSON.parse(plainJson.out) as { ok: boolean; warnings: { code: string; path: string }[] };
    expect(report.ok).toBe(true);
    expect(report.warnings.map((w) => [w.code, w.path])).toEqual([["node-unreachable", "/nodes/1"]]);

    const strict = await run(["validate", "/stray.json", "--strict"], FILES);
    expect(strict.code).toBe(EXIT_INVALID_GRAPH);
    expect(strict.err).toContain("fails --strict");
    const strictJson = envelope(await run(["validate", "/stray.json", "--strict", "--json"], FILES), EXIT_INVALID_GRAPH);
    expect(strictJson.errors[0]).toMatchObject({ code: "node-unreachable", severity: "error", path: "/nodes/1" });

    // A sound graph passes --strict.
    expect((await run(["validate", "/good.json", "--strict"], FILES)).code).toBe(EXIT_OK);
  });

  it("a check error is exit 3; the same error off the cooked part does not refuse inspect --node", async () => {
    expect((await run(["validate", "/open.json"], FILES)).code).toBe(EXIT_INVALID_GRAPH);
    const aside = await run(["inspect", "/open.json", "--node", "grid", "--no-timings"], FILES);
    expect(aside.code).toBe(EXIT_OK);
    const other = await run(["inspect", "/open.json", "--output", "points"], FILES);
    expect(other.code).toBe(EXIT_OK);
    expect((await run(["inspect", "/open.json", "--output", "moved"], FILES)).code).toBe(EXIT_INVALID_GRAPH);
  });

  it("warnings reach a cooking command's stderr and its JSON report, and do not fail it", async () => {
    const r = await run(["cook", "/stray.json", "--no-timings", "--json"], FILES);
    expect(r.code).toBe(EXIT_OK);
    expect(r.err).toContain("warning node-unreachable at /nodes/1");
    expect((JSON.parse(r.out) as { warnings: { code: string }[] }).warnings.map((w) => w.code)).toEqual([
      "node-unreachable",
    ]);
  });
});

describe("did you mean — suggested, never applied", () => {
  it("pcg cokk", async () => {
    const e = envelope(await run(["cokk", "--json"]), EXIT_USAGE);
    expect(e.errors[0]?.["didYouMean"]).toEqual(["cook"]);
    const text = await run(["cokk"]);
    expect(text.err).toContain('unknown command "cokk"; did you mean "cook"? commands: ');
  });

  it("pcg cook --no-timing", async () => {
    const e = envelope(await run(["cook", "/good.json", "--no-timing", "--json"], FILES), EXIT_USAGE);
    expect(e.errors[0]?.["didYouMean"]).toEqual(["--no-timings"]);
    const text = await run(["cook", "/good.json", "--no-timing"], FILES);
    expect(text.err).toContain('cook: unknown flag "--no-timing"; did you mean "--no-timings"? valid flags: ');
  });

  it("pcg nodes pointGridd", async () => {
    const e = envelope(await run(["nodes", "pointGridd", "--json"]), EXIT_FAILURE);
    expect(e.errors[0]?.["didYouMean"]).toEqual(["pointGrid"]);
    const text = await run(["nodes", "pointGridd"]);
    expect(text.err).toMatch(/^unknown node type "pointGridd"; did you mean "pointGrid"\? registered types: /);
  });

  it("pcg fields, pcg graphs --node and pcg run name the nearest one first", async () => {
    expect((await run(["fields", "perlinNoize"])).err).toMatch(/did you mean "perlinNoise"\? valid fns: /);
    expect((await run(["graphs", "--node", "pointGridd"])).err).toMatch(/did you mean "pointGrid"\? registered types: /);
    expect((await run(["run", "shape/dsic"])).err).toMatch(/did you mean "shape\/disc"\? registered subgraphs: /);
  });
});

describe("corpus loop: nothing that cooked before the checks is refused by them", () => {
  const graphs = loadGraphs(ROOT);

  it("every corpus graph validates with no warnings, and cooks, inspects and renders", async () => {
    expect(graphs.length).toBeGreaterThan(50);
    const failures: string[] = [];
    for (const g of graphs) {
      const v = await run(["validate", g.absolutePath, "--strict", "--json"]);
      if (v.code !== EXIT_OK || (JSON.parse(v.out) as { warnings: unknown[] }).warnings.length > 0) {
        failures.push(`validate ${g.file}: ${v.code} ${v.err.split("\n")[0]}`);
      }
      for (const argv of [
        ["cook", g.absolutePath, "--no-timings"],
        ["inspect", g.absolutePath, "--no-timings", "--rows", "0"],
        ["render", g.absolutePath, "--out", "/frame.svg", "--max-points", "2000", "--max-primitives", "2000"],
      ]) {
        const r = await run(argv);
        if (r.code !== EXIT_OK) failures.push(`${argv[0]} ${g.file}: ${r.code} ${r.err.split("\n")[0]}`);
        else if (r.err !== "") failures.push(`${argv[0]} ${g.file}: stderr ${r.err.split("\n")[0]}`);
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("a PNG render of a corpus subset still exits 0", async () => {
    for (const g of graphs.filter((_, i) => i % 16 === 0)) {
      const r = await run(["render", g.absolutePath, "--out", "/frame.png", "--size", "160x120"]);
      expect([g.file, r.code, r.err.split("\n")[0]]).toEqual([g.file, EXIT_OK, ""]);
    }
  }, 60_000);

  // SKIPPED, with the reason: a primitive whose required input is geometry
  // never cooked through `pcg run` — `--in` binds value items only, and
  // before the checks every one of them (27 of 37, measured on the commit
  // before this suite) exited 1 with `input pin "<pin>" has no geometry
  // connected` from inside the cook. The checks now refuse it before the
  // cook, exit 3, naming that pin and printing the wiring; `pcg cook` on a
  // graph that wires it is what cooks it, and the corpus loop above holds
  // the ones the corpus wires. Everything else must still run, exit 0.
  it("every primitive: runs with exit 0, or is refused before cooking for an unbindable geometry input", async () => {
    let ran = 0;
    let wired = 0;
    for (const { name, subgraph } of listSubgraphs()) {
      const r = await run(["run", name, "--no-timings", "--json"]);
      if (r.code === EXIT_OK) {
        ran++;
        continue;
      }
      const e = envelope(r, EXIT_INVALID_GRAPH);
      const inputs = subgraph.inputs.map((p) => p.name);
      for (const d of e.errors) {
        expect(d["code"]).toBe("required-pin-unconnected");
        expect(inputs).toContain(d["pin"]);
      }
      expect(r.err).toContain("pcg run cannot bind geometry");
      expect(r.err).toContain(`"ref": {"name": ${JSON.stringify(name)}}`);
      wired++;
    }
    expect(ran + wired).toBe(listSubgraphs().length);
    expect(ran).toBeGreaterThan(0);
  }, 60_000);
});
