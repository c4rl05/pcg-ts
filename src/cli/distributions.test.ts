/**
 * Distributions in `pcg inspect`: nearest-rank percentiles, histograms,
 * and groups that partition the population.
 *
 * The numbers are pinned by hand rather than re-derived from the code
 * under test, because a percentile that interpolates, a histogram that
 * drops the maximum or a band that loses its NaN all still produce a
 * plausible-looking table. The last suite replays the measurement that
 * motivated the feature — tree counts per distance band on the riverbank
 * graph, which took four scratch graphs — as one command, against the
 * figures that were measured then.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  Attribute,
  type DataItem,
  createPointCloud,
  makeGeometryItem,
  makeInstancesItem,
  makeValueItem,
} from "../index.js";
import { makeDeviceInstancesItem } from "../graph/data.js";
import { CliUsageError } from "./args.js";
import { type DistributionRequest, distributionReport, distributionText, parseBands } from "./distributions.js";
import { CliError } from "./errors.js";
import { EXIT_FAILURE, EXIT_OK, EXIT_USAGE, runCli } from "./index.js";
import type { CliIo } from "./io.js";
import { attributeStats, distributionStats, histogramEdges } from "./summary.js";

// ---------------------------------------------------------------------------
// distributionStats
// ---------------------------------------------------------------------------

describe("distributionStats — nearest-rank percentiles", () => {
  it("picks the value at rank ceil(P/100 * n), never an interpolation", () => {
    // n = 7: p5 -> rank ceil(0.35) = 1, p25 -> ceil(1.75) = 2,
    // p50 -> ceil(3.5) = 4, p75 -> ceil(5.25) = 6, p95 -> ceil(6.65) = 7.
    // Interpolation would give p25 = 25 and p75 = 55, values not in the data.
    const s = distributionStats([70, 10, 50, 30, 20, 60, 40], { bins: 10 });
    expect(s.percentiles).toEqual({ p0: 10, p5: 10, p25: 20, p50: 40, p75: 60, p95: 70, p100: 70 });
  });

  it("lands exactly on a rank when P/100 * n is an integer (n = 20)", () => {
    // 1..20: p5 -> rank 1, p25 -> 5, p50 -> 10, p75 -> 15, p95 -> 19.
    // 0.05 * 20 is 1 only if the rank is computed without rounding error.
    const values = Array.from({ length: 20 }, (_, i) => ((i * 7) % 20) + 1);
    expect([...values].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const s = distributionStats(values, { bins: 4 });
    expect(s.percentiles).toEqual({ p0: 1, p5: 1, p25: 5, p50: 10, p75: 15, p95: 19, p100: 20 });
    expect(s.count).toBe(20);
    expect(s.nonFinite).toBe(0);
    expect(s.min).toBe(1);
    expect(s.max).toBe(20);
    expect(s.mean).toBe(10.5);
    // Population stddev of 1..n is sqrt((n^2 - 1) / 12).
    expect(s.stddev).toBeCloseTo(Math.sqrt(399 / 12), 12);
    // Four equal bins over [1, 20]: width 4.75.
    expect(s.histogram.edges).toEqual([1, 5.75, 10.5, 15.25, 20]);
    expect(s.histogram.counts).toEqual([5, 5, 5, 5]);
  });

  it("handles one value and the p0/p100 edges", () => {
    const s = distributionStats([3.5], { bins: 10 });
    expect(s.percentiles).toEqual({ p0: 3.5, p5: 3.5, p25: 3.5, p50: 3.5, p75: 3.5, p95: 3.5, p100: 3.5 });
    const two = distributionStats([2, 1], { bins: 2 });
    // n = 2: p50 -> rank 1 (the lower), p75 -> rank 2.
    expect(two.percentiles).toMatchObject({ p0: 1, p25: 1, p50: 1, p75: 2, p100: 2 });
  });

  it("counts NaN and the infinities in nonFinite, and leaves them out of everything else", () => {
    const s = distributionStats([Number.NaN, 1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2], { bins: 1 });
    expect(s.count).toBe(5);
    expect(s.nonFinite).toBe(3);
    expect(s.min).toBe(1);
    expect(s.max).toBe(2);
    expect(s.mean).toBe(1.5);
    expect(s.percentiles?.p50).toBe(1);
    expect(s.histogram).toEqual({ edges: [1, 2], counts: [2] });
  });

  it("says nothing rather than something wrong when no value is finite", () => {
    const s = distributionStats([Number.NaN, Number.NaN], { bins: 10 });
    expect(s).toEqual({ count: 2, nonFinite: 2, histogram: { edges: [], counts: [] } });
    expect(distributionStats([], { bins: 10 })).toEqual({ count: 0, nonFinite: 0, histogram: { edges: [], counts: [] } });
  });

  it("orders -0 before +0", () => {
    const s = distributionStats([0, -0, 0], { bins: 3 });
    expect(Object.is(s.min, -0)).toBe(true);
    expect(Object.is(s.percentiles?.p0, -0)).toBe(true);
    // rank ceil(1.5) = 2: the first +0.
    expect(Object.is(s.percentiles?.p50, 0)).toBe(true);
    expect(Object.is(s.max, 0)).toBe(true);
    // All equal numerically, so one bin holds all three.
    expect(s.histogram.counts).toEqual([3]);
  });
});

describe("distributionStats — histograms", () => {
  it("gives a constant column one bin and a stddev of exactly zero", () => {
    const s = distributionStats([2, 2, 2], { bins: 10 });
    expect(s.histogram).toEqual({ edges: [2, 2], counts: [3] });
    expect(s.stddev).toBe(0);
    // 0.1 is not exact in binary, so its mean is not 0.1 — the stddev
    // must still say "no spread".
    const tenth = Float32Array.of(0.1, 0.1, 0.1);
    expect(distributionStats(tenth, { bins: 5 }).stddev).toBe(0);
  });

  it("puts a value on an edge in the bin above it, and the maximum in the last bin", () => {
    const s = distributionStats([0, 1, 2, 3, 4], { bins: 4 });
    expect(s.histogram.edges).toEqual([0, 1, 2, 3, 4]);
    expect(s.histogram.counts).toEqual([1, 1, 1, 2]);
  });

  it("uses shared edges as given, so groups line up bin for bin", () => {
    const s = distributionStats([0, 4.9, 5, 10], { bins: 99, edges: [0, 5, 10] });
    expect(s.histogram).toEqual({ edges: [0, 5, 10], counts: [2, 2] });
    expect(() => distributionStats([1], { bins: 1, edges: [1] })).toThrow(RangeError);
    expect(() => distributionStats([1], { bins: 1, edges: [2, 1] })).toThrow(RangeError);
  });

  it("refuses a bin count outside 1..100", () => {
    expect(() => histogramEdges(0, 1, 0)).toThrow(RangeError);
    expect(() => histogramEdges(0, 1, 101)).toThrow(RangeError);
    expect(() => histogramEdges(0, 1, 2.5)).toThrow(RangeError);
    expect(histogramEdges(0, 1, 100)).toHaveLength(101);
  });

  it("always counts every finite value exactly once", () => {
    const values = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 12.9898) * 437.5453);
    for (const bins of [1, 3, 7, 10, 100]) {
      const s = distributionStats(values, { bins });
      expect(s.histogram.counts.reduce((a, b) => a + b, 0)).toBe(1000);
      expect(s.histogram.edges[0]).toBe(s.min);
      expect(s.histogram.edges[bins]).toBe(s.max);
    }
  });
});

describe("distributionStats — against an independent rank rule", () => {
  it("agrees with integer nearest-rank for every n up to 500", () => {
    for (let n = 1; n <= 500; n++) {
      // Values are their own ranks, so the percentile IS the rank.
      const values = Array.from({ length: n }, (_, i) => n - i);
      const s = distributionStats(values, { bins: 1 });
      for (const p of [0, 5, 25, 50, 75, 95, 100]) {
        // The smallest integer r >= 1 with 100 * r >= p * n, in integers only.
        let r = 1;
        while (100 * r < p * n) r++;
        expect(s.percentiles?.[`p${p}` as "p0"]).toBe(r);
      }
    }
  });
});

describe("distribution text", () => {
  it("prints a column spanning 1e-7 as numbers, not zeros", () => {
    const values = Array.from({ length: 12 }, (_, i) => i * 1e-8);
    const report = distributionReport(pointItem({ tiny: { type: "f32", values } }), 0, "point", request({ dist: ["tiny"], bins: 4 }))!;
    const text = distributionText(report);
    const all = text.find((l) => l.trim().startsWith("(all)"))!.trim().split(/\s+/);
    expect(all[4]).not.toBe("0"); // max
    expect(all[6]).not.toBe("0"); // stddev
    const bins = text.filter((l) => l.trim().startsWith("[")).map((l) => l.trim().split(/\s+/)[0]);
    expect(bins).toHaveLength(4);
    expect(new Set(bins).size).toBe(4);
  });

  it("drops edges a narrow span cannot hold, and labels the rest apart", () => {
    const one = 1;
    const next = new Float32Array(Uint32Array.of(new Uint32Array(Float32Array.of(1).buffer)[0] + 1).buffer)[0];
    const edges = histogramEdges(one, next, 10);
    // One f32 step at 1 is 2^29 doubles wide, so ten bins fit; two doubles apart they do not.
    expect(edges).toHaveLength(11);
    const tight = histogramEdges(1, 1 + Number.EPSILON * 2, 10);
    expect(tight).toEqual([1, 1 + Number.EPSILON, 1 + Number.EPSILON * 2]);
    const s = distributionStats([1, 1 + Number.EPSILON, 1 + Number.EPSILON * 2], { bins: 10 });
    expect(s.histogram.counts).toEqual([1, 2]);

    const report = distributionReport(
      pointItem({ n: { type: "f32", values: [1, next, next] } }),
      0,
      "point",
      request({ dist: ["n"] }),
    )!;
    const text = distributionText(report);
    const bins = text.filter((l) => l.trim().startsWith("[")).map((l) => l.trim().split(/\s+/)[0]);
    expect(new Set(bins).size).toBe(bins.length);
    expect(bins[0].startsWith("[1,1.0000000")).toBe(true);
  });
});

describe("attributeStats — stddev", () => {
  it("is the population figure, per component, over finite values", () => {
    const attr = new Attribute("h", "f32", 2, 9);
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((v, i) => attr.setTuple(i, [v, 3]));
    attr.setTuple(8, [Number.NaN, 3]);
    const stats = attributeStats(attr, 9);
    // The textbook example: mean 5, population stddev exactly 2.
    expect(stats.mean).toEqual([5, 3]);
    expect(stats.stddev).toEqual([2, 0]);
    const empty = attributeStats(new Attribute("e", "f32", 1, 1), 0);
    expect(empty.stddev).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// distributionReport
// ---------------------------------------------------------------------------

function pointItem(columns: Record<string, { type: "f32" | "i32" | "u32" | "bool"; values: readonly number[] }>): DataItem {
  const n = Object.values(columns)[0].values.length;
  const geo = createPointCloud(n);
  for (const [name, { type, values }] of Object.entries(columns)) {
    const attr = geo.attrs.point.add(name, type, 1);
    values.forEach((v, i) => attr.set(i, v));
  }
  return makeGeometryItem(geo);
}

function request(extra: Partial<DistributionRequest>): DistributionRequest {
  return { dist: [], bins: 10, ...extra };
}

describe("--bands", () => {
  const item = pointItem({
    d: { type: "f32", values: [-1, 0, 4.999, 5, 9, 10, 25, Number.NaN, Number.POSITIVE_INFINITY, -0] },
  });

  it("partitions into <e0, half-open bands, >=eN and non-finite, summing to the total", () => {
    const report = distributionReport(item, 0, "point", request({ bands: parseBands("d=0,5,10") }))!;
    expect(report.count).toBe(10);
    expect(report.groups?.map((g) => [g.key, g.count])).toEqual([
      ["<0", 1], // -1
      ["[0,5)", 3], // 0, 4.999, -0 (numerically equal to the edge 0)
      ["[5,10)", 2], // 5, 9
      [">=10", 2], // 10, 25
      ["non-finite", 2], // NaN, +Infinity
    ]);
    expect(report.groups?.reduce((n, g) => n + g.count, 0)).toBe(10);
    expect(report.groups?.[1]).toMatchObject({ from: 0, to: 5 });
    expect(report.groups?.[0]).toEqual({ key: "<0", to: 0, count: 1 });
    expect(report.groups?.[3]).toEqual({ key: ">=10", from: 10, count: 2 });
  });

  it("keeps empty groups, and every group's histogram shares the population's edges", () => {
    const report = distributionReport(item, 0, "point", request({ dist: ["d"], bins: 4, bands: parseBands("d=-100,100") }))!;
    expect(report.groups?.map((g) => g.count)).toEqual([0, 8, 0, 2]);
    const col = report.columns[0];
    expect(col.all.histogram.edges).toEqual([-1, 5.5, 12, 18.5, 25]);
    for (const g of col.groups ?? []) expect(g.histogram.edges).toEqual(col.all.histogram.edges);
    expect(col.groups?.[1].histogram.counts).toEqual(col.all.histogram.counts);
    expect(col.groups?.[3]).toMatchObject({ key: "non-finite", count: 2, nonFinite: 2 });
    expect(col.groups?.[3].histogram.counts).toEqual([0, 0, 0, 0]);
    expect(col.all.nonFinite).toBe(2);
  });

  it("refuses a malformed edge list before anything cooks", () => {
    expect(() => parseBands("d")).toThrow(CliUsageError);
    expect(() => parseBands("d=")).toThrow(CliUsageError);
    expect(() => parseBands("=1,2")).toThrow(CliUsageError);
    expect(() => parseBands("d=1,x")).toThrow(/edge "x"/);
    expect(() => parseBands("d=2,1")).toThrow(/strictly increasing/);
    expect(parseBands("d=-1.5, 2,1e1")).toEqual({ attr: "d", edges: [-1.5, 2, 10] });
  });
});

describe("--group-by", () => {
  it("groups integers in ascending order, and strings in code-unit order", () => {
    const report = distributionReport(
      pointItem({ k: { type: "i32", values: [3, -2, 3, 10, -2, 3] } }),
      0,
      "point",
      request({ groupBy: "k" }),
    )!;
    expect(report.groups).toEqual([
      { key: "-2", count: 2, value: -2 },
      { key: "3", count: 3, value: 3 },
      { key: "10", count: 1, value: 10 },
    ]);
  });

  it("refuses a float attribute with exit 2, pointing at --bands", async () => {
    const item = pointItem({ f: { type: "f32", values: [0.5, 1.5] } });
    expect(() => distributionReport(item, 0, "point", request({ groupBy: "f" }))).toThrow(CliUsageError);
    expect(() => distributionReport(item, 0, "point", request({ groupBy: "f" }))).toThrow(/--bands f=/);
  });

  it(`caps groups at 64`, () => {
    const values = Array.from({ length: 65 }, (_, i) => i);
    const item = pointItem({ k: { type: "u32", values } });
    expect(() => distributionReport(item, 0, "point", request({ groupBy: "k" }))).toThrow(/more than 64/);
    const ok = distributionReport(pointItem({ k: { type: "u32", values: values.slice(0, 64) } }), 0, "point", request({ groupBy: "k" }));
    expect(ok?.groups).toHaveLength(64);
  });
});

describe("instance items", () => {
  /** A column-major T * Rz(90deg) * S block. */
  function trs(t: readonly number[], s: readonly number[]): number[] {
    // Rz(90): x -> y, y -> -x. Column 0 is R * (sx, 0, 0), and so on.
    return [0, s[0], 0, 0, -s[1], 0, 0, 0, 0, 0, s[2], 0, t[0], t[1], t[2], 1];
  }

  const item = makeInstancesItem([
    {
      assetId: "pine",
      count: 2,
      transforms: Float32Array.from([...trs([1, 2, 3], [2, 3, 4]), ...trs([5, 6, 7], [0.5, 0.5, 0.5])]),
      attributes: { phase: Float32Array.of(0.25, 0.75) },
    },
    {
      assetId: "birch",
      count: 1,
      transforms: Float32Array.from(trs([-1, 0, 1], [1, 1, 1])),
      attributes: { phase: Float32Array.of(0.5) },
    },
  ]);

  it("expose @translate, @scale (column lengths of the 3x3), @asset and the channels", () => {
    const report = distributionReport(
      item,
      0,
      "primitive", // ignored: an instance item is read per instance
      request({ dist: ["@translate[0]", "@scale", "phase"], groupBy: "@asset" }),
    )!;
    expect(report.source).toBe("instances");
    expect(report.count).toBe(3);
    expect(report.groups).toEqual([
      { key: "birch", count: 1, value: "birch" },
      { key: "pine", count: 2, value: "pine" },
    ]);
    const byName = Object.fromEntries(report.columns.map((c) => [c.name, c]));
    expect(Object.keys(byName)).toEqual(["@translate[0]", "@scale[0]", "@scale[1]", "@scale[2]", "phase"]);
    expect(byName["@translate[0]"].all).toMatchObject({ min: -1, max: 5 });
    // Rotated, yet each column's length is still that axis' scale.
    expect(byName["@scale[0]"].all).toMatchObject({ min: 0.5, max: 2 });
    expect(byName["@scale[1]"].all).toMatchObject({ min: 0.5, max: 3 });
    expect(byName["@scale[2]"].groups?.map((g) => g.max)).toEqual([1, 4]);
    expect(byName.phase.all).toMatchObject({ count: 3, min: 0.25, max: 0.75, mean: 0.5 });
  });

  it("name the pseudo-attributes when a name is missing, and refuse a device-resident batch", () => {
    expect(() => distributionReport(item, 0, "point", request({ dist: ["scale"] }))).toThrow(CliError);
    expect(() => distributionReport(item, 0, "point", request({ dist: ["scale"] }))).toThrow(
      /@translate, @scale, @asset and its channels phase/,
    );
    const device = makeDeviceInstancesItem([]);
    expect(() => distributionReport(device, 2, "point", request({ dist: ["@scale"] }))).toThrow(
      /item 2 is a device-resident instance batch/,
    );
  });

  it("skip value items", () => {
    expect(distributionReport(makeValueItem(3), 0, "point", request({ dist: ["x"] }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const RIVERBANK_PATH = "graphs/examples-riverbank.json";
const SMALL_PATH = "/graphs/small.json";

/** Twelve scattered points: `elevation` = index, `overflow` = +Infinity (1e39 as f32), `species` by index. */
const SMALL_GRAPH = JSON.stringify({
  formatVersion: 1,
  seed: 3,
  nodes: [
    { id: "src", type: "pointScatterInBounds", params: { count: 12, boundsMin: [0, 0, 0], boundsMax: [4, 0, 4] } },
    { id: "elev", type: "setAttribute", params: { name: "elevation", domain: "point", type: "f32", value: { fn: "index" } } },
    { id: "over", type: "setAttribute", params: { name: "overflow", domain: "point", type: "f32", value: 1e39 } },
    {
      id: "kind",
      type: "setAttribute",
      params: { name: "species", domain: "point", type: "string", values: ["oak", "ash", "elm"], value: { fn: "index" } },
    },
  ],
  connections: [
    { from: ["src", "out"], to: ["elev", "in"] },
    { from: ["elev", "out"], to: ["over", "in"] },
    { from: ["over", "out"], to: ["kind", "in"] },
  ],
  outputs: [{ id: "kind", pin: "out", name: "cloud" }],
});

async function run(argv: readonly string[]): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const files: Record<string, string> = {
    [SMALL_PATH]: SMALL_GRAPH,
    [RIVERBANK_PATH]: readFileSync(new URL("../../graphs/examples-riverbank.json", import.meta.url), "utf8"),
  };
  const io: CliIo = {
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
    readFile: (path) => {
      const content = files[path];
      if (content === undefined) throw Object.assign(new Error(`ENOENT: open '${path}'`), { code: "ENOENT" });
      return content;
    },
    writeFile: () => undefined,
  };
  const code = await runCli(argv, io);
  return { code, out: out.join(""), err: err.join("") };
}

describe("pcg inspect --dist / --group-by / --bands", () => {
  it("bands a column that is non-finite everywhere, and the counts still sum", async () => {
    const r = await run(["inspect", SMALL_PATH, "--json", "--bands", "overflow=0,1"]);
    expect(r.code).toBe(EXIT_OK);
    const report = JSON.parse(r.out).items[0].distributions;
    expect(report.groups.map((g: { key: string; count: number }) => [g.key, g.count])).toEqual([
      ["<0", 0],
      ["[0,1)", 0],
      [">=1", 0],
      ["non-finite", 12],
    ]);
  });

  it("prints percentiles and a histogram in the text, one row per group", async () => {
    const r = await run(["inspect", SMALL_PATH, "--rows", "0", "--dist", "elevation", "--bins", "3", "--bands", "elevation=6"]);
    expect(r.code).toBe(EXIT_OK);
    const lines = r.out.split("\n").map((l) => l.trim());
    expect(lines).toContain("groups: elevation in bands at 6 (counts sum to 12)");
    // elevation = 0..11. Nearest rank over n = 12: p5 -> 1 -> 0, p25 -> 3 -> 2,
    // p50 -> 6 -> 5, p75 -> 9 -> 8, p95 -> ceil(11.4) = 12 -> 11.
    const all = lines.find((l) => l.startsWith("(all)"))!.split(/\s+/);
    expect(all).toEqual(["(all)", "12", "0", "0", "11", "5.5", "3.452053", "0", "0", "2", "5", "8", "11", "11"]);
    const below = lines.find((l) => l.startsWith("<6 ") && l.split(/\s+/).length > 3)!.split(/\s+/);
    expect(below.slice(0, 5)).toEqual(["<6", "6", "0", "0", "5"]);
    // Three bins over [0, 11], shared: [0, 3.67) [3.67, 7.33) [7.33, 11].
    const bin = (label: string): string[] => lines.find((l) => l.startsWith(label))!.split(/\s+/);
    expect(bin("[0,3.666667)")).toEqual(["[0,3.666667)", "4", "4", "0", "0"]);
    expect(bin("[3.666667,7.333333)")).toEqual(["[3.666667,7.333333)", "4", "2", "2", "0"]);
    expect(bin("[7.333333,11]")).toEqual(["[7.333333,11]", "4", "0", "4", "0"]);
  });

  it("refuses --group-by on a float with exit 2, pointing at --bands", async () => {
    const r = await run(["inspect", SMALL_PATH, "--group-by", "elevation"]);
    expect(r.code).toBe(EXIT_USAGE);
    expect(r.err).toContain('"--group-by" names "elevation", an f32 attribute');
    expect(r.err).toContain("--bands elevation=<e0>,<e1>,…; its values run 0 .. 11");
  });

  it("groups by a string attribute", async () => {
    const r = await run(["inspect", SMALL_PATH, "--json", "--group-by", "species", "--dist", "elevation"]);
    expect(r.code).toBe(EXIT_OK);
    const report = JSON.parse(r.out).items[0].distributions;
    const total = report.groups.reduce((n: number, g: { count: number }) => n + g.count, 0);
    expect(total).toBe(12);
    const keys = report.groups.map((g: { key: string }) => g.key);
    expect(keys).toEqual([...keys].sort());
    expect(report.columns[0].groups).toHaveLength(report.groups.length);
  });

  it("names the flag, the value and the alternatives when something is wrong", async () => {
    const missing = await run(["inspect", SMALL_PATH, "--dist", "height"]);
    expect(missing.code).toBe(EXIT_FAILURE);
    expect(missing.err).toContain('flag "--dist" names "height", but item 0 has no point attribute "height"; point attributes:');
    expect(missing.err).toContain("elevation");

    const cases: [readonly string[], string][] = [
      [["--bins", "4"], "no --dist was given"],
      [["--dist", "elevation", "--bins", "0"], "[1, 100]"],
      [["--dist", "elevation", "--bins", "101"], "[1, 100]"],
      [["--group-by", "species", "--bands", "elevation=1"], "pass one of them, not both"],
      [["--bands", "elevation"], "expects <attr>=<e0>,<e1>"],
      [["--dist", "species"], "count its values with --group-by species"],
      [["--dist", "P[3]"], "valid: P[0], P[1], P[2]"],
      [["--bands", "P=1"], "name one: P[0], P[1], P[2]"],
      // A tuple's float refusal must suggest a spelling --bands accepts.
      [["--group-by", "P"], "--bands P[0]=<e0>,<e1>,…; its values run"],
      [["--dist", "elevation", "--dist", "elevation"], 'given "elevation" more than once'],
    ];
    for (const [flags, message] of cases) {
      const r = await run(["inspect", SMALL_PATH, ...flags]);
      expect({ flags, code: r.code }).toEqual({ flags, code: EXIT_USAGE });
      expect(r.err).toContain(message);
    }
  });

  it("leaves the text attribute table's columns where they were", async () => {
    const r = await run(["inspect", SMALL_PATH, "--rows", "0"]);
    const header = r.out.split("\n").find((l) => l.trim().startsWith("attr ") && l.includes("min"));
    expect(header?.trim().split(/\s+/)).toEqual(["attr", "type", "tuple", "min", "max", "mean", "non-finite"]);
    const json = JSON.parse((await run(["inspect", SMALL_PATH, "--json"])).out);
    const elevation = json.items[0].geometry.domains[0].attrs.find((a: { name: string }) => a.name === "elevation");
    expect(elevation.stddev[0]).toBeCloseTo(Math.sqrt(143 / 12), 5);
    expect(json.items[0]).not.toHaveProperty("distributions");
  });
});

describe("the riverbank outcome check, as one command", () => {
  it("reproduces tree counts and mean scale per distance band", async () => {
    // The authoring log measured these with four scratch graphs, each the
    // riverbank with a band filter appended on `riverDist`:
    //   [4.5,15) 163 trees, mean scale 0.526 · [15,25) 256, 0.811
    //   [25,35) 289, 1.029 · [35,45) 255, 1.221
    const r = await run([
      "inspect",
      RIVERBANK_PATH,
      "--node",
      "treeSpecies",
      "--rows",
      "0",
      "--bands",
      "riverDist=4.5,15,25,35,45",
      "--dist",
      "scale[0]",
      "--dist",
      "riverDist",
      "--json",
    ]);
    expect(r.err).toBe("");
    expect(r.code).toBe(EXIT_OK);
    const report = JSON.parse(r.out).items[0].distributions;
    expect(report.groups.map((g: { key: string; count: number }) => [g.key, g.count])).toEqual([
      ["<4.5", 0],
      ["[4.5,15)", 163],
      ["[15,25)", 256],
      ["[25,35)", 289],
      ["[35,45)", 255],
      [">=45", 462],
      ["non-finite", 0],
    ]);
    expect(report.groups.reduce((n: number, g: { count: number }) => n + g.count, 0)).toBe(report.count);
    const means = report.columns[0].groups.slice(1, 5).map((g: { mean: number }) => Number(g.mean.toFixed(3)));
    expect(means).toEqual([0.526, 0.811, 1.029, 1.221]);
    // The water is clear of trees: the minimum distance was 4.52.
    expect(report.columns[1].name).toBe("riverDist");
    expect(report.columns[1].all.min.toFixed(2)).toBe("4.52");
    expect(report.columns[1].groups.map((g: { mean?: number }) => g.mean?.toFixed(1))).toEqual([
      undefined,
      "10.7",
      "20.0",
      "29.8",
      "39.9",
      "55.6",
      undefined,
    ]);
  });
});
