/**
 * `--no-timings` and `--fingerprint`: the determinism check as a one-liner.
 *
 * The gap this closes was measured, not imagined: an agent diffing two
 * `pcg cook --json` reports got different hashes from one graph and for a
 * moment believed determinism was broken — the reports embed `elapsedMs`.
 * These gates hold the fix to both halves of the claim: with both flags two
 * cooks are byte-identical, AND without `--no-timings` the same comparison
 * reports a difference, so "identical" is a result the check could have
 * failed to give. The fingerprint is held to the same standard: a seed
 * change and a single mutated value each move it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type DataCollection,
  cook,
  createPointCloud,
  deserializeGraph,
  makeGeometryItem,
} from "../index.js";
import { graphFingerprint as goldenGraphFingerprint } from "../docs/graphGolden.js";
import { canonicalJson, cookFingerprint, graphFingerprint } from "./fingerprint.js";
import { EXIT_OK, runCli } from "./index.js";
import type { CliIo } from "./io.js";

const RIVERBANK_PATH = "graphs/examples-riverbank.json";
const RIVERBANK = readFileSync(new URL("../../graphs/examples-riverbank.json", import.meta.url), "utf8");

async function run(argv: readonly string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
    readFile: (path) => {
      if (path === RIVERBANK_PATH) return RIVERBANK;
      throw Object.assign(new Error(`ENOENT: no such file or directory, open '${path}'`), { code: "ENOENT" });
    },
    writeFile: () => undefined,
  };
  const code = await runCli(argv, io);
  return { code, out: out.join(""), err: err.join("") };
}

async function ok(argv: readonly string[]): Promise<string> {
  const r = await run(argv);
  expect(r.err).toBe("");
  expect(r.code).toBe(EXIT_OK);
  return r.out;
}

/**
 * Does the same command, run twice WITH its timings, ever print two
 * different reports? Up to five pairs, so one coincidentally equal clock
 * reading cannot make the negative half of a gate pass by luck.
 */
async function differsWithTimings(argv: readonly string[]): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if ((await ok(argv)) !== (await ok(argv))) return true;
  }
  return false;
}

describe("--no-timings and --fingerprint on cook", () => {
  it("two cooks with both flags are byte-identical, and differ without --no-timings", async () => {
    const flags = ["cook", RIVERBANK_PATH, "--fingerprint", "--no-timings", "--stats"];
    const [a, b] = [await ok([...flags, "--json"]), await ok([...flags, "--json"])];
    expect(a).toBe(b);
    expect(await ok(flags)).toBe(await ok(flags));

    // The negative half: the same comparison WITHOUT --no-timings must be
    // able to say "different", or the byte-identity above proves nothing.
    // Eighteen per-node timings all repeating to the last fraction of a
    // millisecond is not something a real clock does, but the loop keeps
    // the gate honest rather than lucky.
    const timed = ["cook", RIVERBANK_PATH, "--fingerprint", "--stats", "--json"];
    let differed = false;
    let first = "";
    for (let attempt = 0; attempt < 3 && !differed; attempt++) {
      const x = await ok(timed);
      const y = await ok(timed);
      differed = x !== y;
      first = x;
      // The fingerprint itself is timing-blind: it moves with the data only.
      expect(JSON.parse(x).fingerprint).toBe(JSON.parse(y).fingerprint);
    }
    expect(differed).toBe(true);
    expect(JSON.parse(first).fingerprint).toBe(JSON.parse(a).fingerprint);
  });

  it("omits every elapsedMs rather than zeroing it, in the JSON and in the text", async () => {
    const timed = JSON.parse(await ok(["cook", RIVERBANK_PATH, "--stats", "--json"]));
    expect(typeof timed.stats.elapsedMs).toBe("number");
    expect(timed.nodes.every((n: { elapsedMs?: unknown }) => typeof n.elapsedMs === "number")).toBe(true);

    const bare = await ok(["cook", RIVERBANK_PATH, "--stats", "--json", "--no-timings"]);
    expect(bare).not.toContain("elapsedMs");
    const report = JSON.parse(bare);
    expect(Object.keys(report.stats)).toEqual(["cooked", "cached"]);
    expect(report.nodes.length).toBe(timed.nodes.length);
    expect(Object.keys(report.nodes[0])).toEqual(["id", "type", "cached"]);

    const text = await ok(["cook", RIVERBANK_PATH, "--stats", "--no-timings"]);
    expect(text).not.toMatch(/\d ms\b/);
    expect(text).toContain("18 cooked, 0 cached\n");
    expect(text.split("\n").find((l) => l.trim().startsWith("id "))?.trim().split(/\s+/)).toEqual([
      "id",
      "type",
      "state",
    ]);
  });

  it("reports 16 hex overall and per output, and nothing without the flag", async () => {
    const report = JSON.parse(await ok(["cook", RIVERBANK_PATH, "--json", "--fingerprint"]));
    expect(report.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(Object.keys(report.outputFingerprints).sort()).toEqual(Object.keys(report.outputs).sort());
    for (const hex of Object.values(report.outputFingerprints)) expect(hex).toMatch(/^[0-9a-f]{16}$/);
    // outputs[name] stays the array of item summaries existing readers index.
    expect(Array.isArray(report.outputs.trees)).toBe(true);

    const plain = JSON.parse(await ok(["cook", RIVERBANK_PATH, "--json"]));
    expect(plain).not.toHaveProperty("fingerprint");
    expect(plain).not.toHaveProperty("outputFingerprints");

    const text = await ok(["cook", RIVERBANK_PATH, "--fingerprint"]);
    expect(text).toContain(`fingerprint ${report.fingerprint}\n`);
    expect(text).toContain(`  trees (1 item)  fingerprint ${report.outputFingerprints.trees}\n`);
  });

  it("a seed change moves the fingerprint — and only the outputs the seed reaches", async () => {
    const base = JSON.parse(await ok(["cook", RIVERBANK_PATH, "--json", "--fingerprint", "--no-timings"]));
    const other = JSON.parse(
      await ok(["cook", RIVERBANK_PATH, "--json", "--fingerprint", "--no-timings", "--seed", "99"]),
    );
    expect(other.fingerprint).not.toBe(base.fingerprint);
    expect(other.outputFingerprints.trees).not.toBe(base.outputFingerprints.trees);
    // The ground is a plain mesh with no seeded column (P and uv only), so
    // the graph seed cannot reach it: a per-output digest that moved anyway
    // would be hashing something other than the output. The river's SHAPE
    // does not move either — its noises carry literal seeds — but its
    // per-point `seed` column does, and a byte-exact digest has to see it.
    expect(other.outputFingerprints.ground).toBe(base.outputFingerprints.ground);
    expect(other.outputFingerprints.river).not.toBe(base.outputFingerprints.river);
  });
});

describe("--no-timings and --fingerprint on run and inspect", () => {
  it("run: byte-identical with both flags, and the seed moves the digest", async () => {
    const flags = ["run", "fill/scatter-even", "--json", "--fingerprint", "--no-timings", "--stats"];
    const a = await ok(flags);
    expect(a).toBe(await ok(flags));
    expect(await differsWithTimings(["run", "fill/scatter-even", "--json", "--fingerprint", "--stats"])).toBe(true);
    expect(a).not.toContain("elapsedMs");
    const report = JSON.parse(a);
    expect(report.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(report.outputFingerprints.out).toMatch(/^[0-9a-f]{16}$/);
    const reseeded = JSON.parse(await ok([...flags, "--seed", "5"]));
    expect(reseeded.fingerprint).not.toBe(report.fingerprint);

    const text = await ok(["run", "fill/scatter-even", "--no-timings"]);
    expect(text).not.toMatch(/\d ms\b/);
  });

  it("inspect: --no-timings leaves elapsedMs out of the report", async () => {
    const timed = JSON.parse(await ok(["inspect", RIVERBANK_PATH, "--output", "river", "--json"]));
    expect(typeof timed.stats.elapsedMs).toBe("number");
    const bare = await ok(["inspect", RIVERBANK_PATH, "--output", "river", "--json", "--no-timings"]);
    expect(bare).not.toContain("elapsedMs");
    expect(bare).toBe(await ok(["inspect", RIVERBANK_PATH, "--output", "river", "--json", "--no-timings"]));
    expect(await differsWithTimings(["inspect", RIVERBANK_PATH, "--output", "trees", "--json"])).toBe(true);
  });

  it("help names the pair as the determinism check", async () => {
    for (const command of ["cook", "run"]) {
      const help = await ok([command, "--help"]);
      expect(help).toContain("--no-timings");
      expect(help).toContain("--fingerprint");
      expect(help.match(/the determinism check/g)?.length).toBe(2);
    }
    expect(await ok(["inspect", "--help"])).toContain("--no-timings");
  });
});

describe("the fingerprint itself", () => {
  /** A one-output cook of a point cloud with two attributes, written in `order`. */
  function cloud(order: readonly ("a" | "b")[], mutate?: (a: Float32Array) => void): Record<string, DataCollection> {
    const geo = createPointCloud(4);
    for (const name of order) {
      const attr = geo.attrs.point.add(name, "f32", 1);
      for (let i = 0; i < 4; i++) attr.set(i, name === "a" ? i * 0.5 : 10 - i);
    }
    const a = geo.attrs.point.get("a")!;
    // The callback writes, so it gets the write route; the cast only names
    // the f32 column `get` hands back under the union.
    if (mutate !== undefined) mutate(a.writable() as Float32Array);
    return { cloud: [makeGeometryItem(geo)], other: [makeGeometryItem(createPointCloud(2))] };
  }

  it("moves when one value moves by one float step, and only for that output", () => {
    const base = cookFingerprint(cloud(["a", "b"]));
    const nudged = cookFingerprint(
      cloud(["a", "b"], (data) => {
        // The next f32 above 1.5: the smallest change a column can carry.
        const bits = new Uint32Array(Float32Array.of(data[3]).buffer);
        bits[0] += 1;
        data[3] = new Float32Array(bits.buffer)[0];
      }),
    );
    expect(nudged.fingerprint).not.toBe(base.fingerprint);
    expect(nudged.outputs.cloud).not.toBe(base.outputs.cloud);
    expect(nudged.outputs.other).toBe(base.outputs.other);
    expect(cookFingerprint(cloud(["a", "b"]))).toEqual(base);
  });

  it("does not depend on the order attributes, keys or outputs were written in", () => {
    const ab = cookFingerprint(cloud(["a", "b"]));
    const ba = cookFingerprint(cloud(["b", "a"]));
    expect(ba).toEqual(ab);
    const swapped = cloud(["a", "b"]);
    expect(cookFingerprint({ other: swapped.other, cloud: swapped.cloud }).fingerprint).toBe(ab.fingerprint);
  });

  it("canonical text sorts keys and keeps apart what plain JSON folds", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: true, c: "x" }] })).toBe(canonicalJson({ a: [2, { c: "x", d: true }], b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson(-0)).not.toBe(canonicalJson(0));
    expect(canonicalJson(Number.NaN)).not.toBe(canonicalJson(null));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
  });

  it("spells its string-table separator as an escape, never as a raw NUL byte", () => {
    // A raw NUL hashes identically, but it makes git treat the file as
    // binary and ripgrep skip it without a word — every later diff and
    // search of the determinism hash would be blind. It happened once.
    for (const file of ["fingerprint.ts", "distributions.ts", "summary.ts", "commands.ts"]) {
      const bytes = readFileSync(new URL(`./${file}`, import.meta.url));
      expect({ file, nul: bytes.includes(0) }).toEqual({ file, nul: false });
    }
  });

  it("is the same function the corpus golden and its determinism test use", async () => {
    expect(goldenGraphFingerprint).toBe(graphFingerprint);
    // And it still describes a real cook the way the corpus suite reads it.
    const graph = deserializeGraph(JSON.parse(RIVERBANK));
    const { outputs } = await cook(graph);
    expect(Object.keys(graphFingerprint(outputs))).toEqual(["driftwood", "ground", "river", "trees"]);
  });
});
