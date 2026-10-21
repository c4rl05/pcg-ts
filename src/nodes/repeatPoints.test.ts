/**
 * `repeatPoints`: each input point emitted a per-point number of times.
 *
 * Expectations are written out by hand from the input (which point, which
 * copy, which value), never recorded from a run — the node's claim is a
 * layout rule, and a recorded expectation would move with the code.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { attribute, constant, div, index as indexField } from "../fields/index.js";
import { Graph, cook, makeGeometryItem } from "../graph/index.js";
// Registers spawnInstances, which the corpus graph below ends in.
import "../spawn/index.js";
import { hashCombine } from "../random/index.js";
import { deserializeGraph, fieldFromJson, pointLine, serializeGraph, setAttribute } from "./index.js";
import { repeatPoints } from "./repeatPoints.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

async function repeat(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(repeatPoints, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

/** One point column, element tuples flattened. */
function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

function strings(geo: Geometry, name: string): string[] {
  const a = geo.attrs.point.require(name);
  return Array.from({ length: geo.attrs.point.count }, (_, i) => a.getString(i));
}

/**
 * Three points with distinct positions and seeds, carrying one column of
 * every attribute type the library stores, tuple sizes 1 and 3, plus a
 * string column whose words are interned in a non-trivial order.
 */
function richCloud(): Geometry {
  const geo = createPointCloud(3);
  const pts = geo.attrs.point;
  const P = pts.require("P");
  const seed = pts.require("seed");
  for (let i = 0; i < 3; i++) {
    P.setTuple(i, [i * 10, i + 0.5, -i]);
    seed.set(i, 100 + i);
  }
  const f = pts.add("height", "f32", 1, 0);
  const v = pts.add("dir", "f32", 3, [0, 0, 0]);
  const iA = pts.add("level", "i32", 1, -1);
  const u = pts.add("tag", "u32", 1, 0);
  const b = pts.add("open", "bool", 1, 0);
  const s = pts.add("kind", "string", 1);
  const s2 = pts.add("pair", "string", 2);
  const words = ["wall", "roof", "door"];
  for (let i = 0; i < 3; i++) {
    f.set(i, 1.25 * (i + 1));
    v.setTuple(i, [i, -i, 2 * i]);
    iA.set(i, -7 + i);
    u.set(i, 4000000000 + i);
    b.set(i, i % 2);
    // Interned out of point order, so a raw table index copied across
    // geometries would name the wrong word.
    s.setString(2 - i, words[i]);
    s2.setString(i, `a${i}`, 0);
    s2.setString(i, `b${i}`, 1);
  }
  return geo;
}

// ---------------------------------------------------------------------------

describe("repeatPoints: layout", () => {
  it("emits each point count times, point-major, copy 0 first", async () => {
    const out = await repeat(richCloud(), { count: 3 });
    expect(out.pointCount).toBe(9);
    // Point i's copies are slots 3i .. 3i+2, all at point i's position.
    const P = col(out, "P");
    for (let slot = 0; slot < 9; slot++) {
      const i = Math.floor(slot / 3);
      expect(P.slice(slot * 3, slot * 3 + 3)).toEqual([i * 10, i + 0.5, -i]);
    }
    expect(col(out, "copy")).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
    expect(out.attrs.point.require("copy").type).toBe("i32");
  });

  it("carries every point attribute of every type, strings included, with no carry list", async () => {
    const src = richCloud();
    const out = await repeat(src, { count: 2 });
    const order = [0, 0, 1, 1, 2, 2];
    // Every input column is present, same type, tuple size and default.
    for (const name of src.attrs.point.names()) {
      const a = src.attrs.point.require(name);
      const b = out.attrs.point.require(name);
      expect([b.type, b.tupleSize, b.defaultValue]).toEqual([a.type, a.tupleSize, a.defaultValue]);
    }
    expect(col(out, "height")).toEqual(order.map((i) => 1.25 * (i + 1)));
    expect(col(out, "dir")).toEqual(order.flatMap((i) => [i, -i, 2 * i]));
    expect(col(out, "level")).toEqual(order.map((i) => -7 + i));
    expect(col(out, "tag")).toEqual(order.map((i) => 4000000000 + i));
    expect(col(out, "open")).toEqual(order.map((i) => i % 2));
    // Point 0 says "door", point 1 "roof", point 2 "wall" (written reversed).
    expect(strings(out, "kind")).toEqual(["door", "door", "roof", "roof", "wall", "wall"]);
    const pair = out.attrs.point.require("pair");
    expect(order.map((i, slot) => [pair.getString(slot, 0), pair.getString(slot, 1)])).toEqual(
      order.map((i) => [`a${i}`, `b${i}`]),
    );
    // Standard columns ride along too.
    for (const std of ["rot", "scale", "density", "boundsMin", "boundsMax", "color"]) {
      const a = src.attrs.point.require(std);
      expect(col(out, std)).toEqual(
        order.flatMap((i) => Array.from(a.data.slice(i * a.tupleSize, (i + 1) * a.tupleSize))),
      );
    }
  });

  it("does not mutate its input", async () => {
    const src = richCloud();
    const before = snapshotGeometry(src);
    await repeat(src, { count: 3, countAttr: "n" });
    expect(snapshotGeometry(src)).toEqual(before);
  });

  it("carries the detail domain unchanged", async () => {
    const src = richCloud();
    src.attrs.detail.add("lotName", "string", 1).setString(0, "corner");
    src.attrs.detail.add("area", "f32", 1, 0).set(0, 42.5);
    const out = await repeat(src, { count: 2 });
    expect(out.attrs.detail.count).toBe(1);
    expect(out.attrs.detail.require("lotName").getString(0)).toBe("corner");
    expect(out.attrs.detail.require("area").get(0)).toBe(42.5);
  });

  it("an empty input gives an empty output with the input's columns", async () => {
    const src = createPointCloud(0);
    src.attrs.point.add("kind", "string", 1);
    const out = await repeat(src, { count: 3 });
    expect(out.pointCount).toBe(0);
    expect(out.attrs.point.has("kind")).toBe(true);
    expect(out.attrs.point.has("copy")).toBe(true);
  });
});

describe("repeatPoints: count", () => {
  it("as a field, is read per input point", async () => {
    const src = richCloud();
    // index() over the input: point 0 emits 0, point 1 emits 1, point 2 emits 2.
    const out = await repeat(src, { count: indexField() });
    expect(out.pointCount).toBe(3);
    expect(col(out, "level")).toEqual([-6, -5, -5]);
    expect(col(out, "copy")).toEqual([0, 0, 1]);
  });

  it("reads a point attribute per point", async () => {
    const src = richCloud();
    const n = src.attrs.point.add("n", "f32", 1, 0);
    n.set(0, 2);
    n.set(1, 0);
    n.set(2, 4);
    const out = await repeat(src, { count: attribute("n"), countAttr: "copies" });
    expect(strings(out, "kind")).toEqual(["door", "door", "wall", "wall", "wall", "wall"]);
    expect(col(out, "copy")).toEqual([0, 1, 0, 1, 2, 3]);
    expect(col(out, "copies")).toEqual([2, 2, 4, 4, 4, 4]);
  });

  it("count 0 drops the point; a plain 0 empties the cloud", async () => {
    const src = richCloud();
    const n = src.attrs.point.add("n", "f32", 1, 0);
    n.set(0, 0);
    n.set(1, 1);
    n.set(2, 0);
    const out = await repeat(src, { count: attribute("n") });
    expect(out.pointCount).toBe(1);
    expect(col(out, "level")).toEqual([-6]);
    const none = await repeat(src, { count: 0 });
    expect(none.pointCount).toBe(0);
  });

  it("rounds a fractional count to nearest (half up) and clamps a negative to 0", async () => {
    const src = createPointCloud(6);
    const n = src.attrs.point.add("n", "f32", 1, 0);
    const P = src.attrs.point.require("P");
    const raw = [2.4, 2.5, 2.6, 0.49, -3, -0.5];
    raw.forEach((v, i) => {
      n.set(i, v);
      P.set(i, i, 0);
    });
    const out = await repeat(src, { count: attribute("n"), countAttr: "c" });
    // 2, 3, 3, 0, 0, 0
    expect(col(out, "c")).toEqual([2, 2, 3, 3, 3, 3, 3, 3]);
    expect(col(out, "P").filter((_, k) => k % 3 === 0)).toEqual([0, 0, 1, 1, 1, 2, 2, 2]);
    // A plain fractional count follows the same rule.
    expect((await repeat(src, { count: 1.5 })).pointCount).toBe(12);
  });

  it("refuses a non-finite count field, naming the param and the point", async () => {
    const src = richCloud();
    const n = src.attrs.point.add("n", "f32", 1, 0);
    n.set(0, 1);
    n.set(1, 0);
    n.set(2, 1);
    // 1 / 0 at point 1 only.
    const msg = await rejection(repeat(src, { count: div(constant(1), attribute("n")) }));
    expect(msg).toContain('repeatPoints: param "count" resolved to +Infinity at element 1');
  });

  it("refuses a non-finite plain count", async () => {
    const msg = await rejection(repeat(richCloud(), { count: Number.NaN }));
    expect(msg).toContain('repeatPoints: param "count"');
    expect(msg).toContain("max(<expr>, 0)");
  });

  it("refuses a vector count field", async () => {
    const msg = await rejection(repeat(richCloud(), { count: attribute("dir") }));
    expect(msg).toContain('repeatPoints: param "count" must evaluate to ONE number per point');
  });

  it("refuses a total past the cap, naming the point the total ran out on", async () => {
    const src = createPointCloud(3);
    const n = src.attrs.point.add("n", "f32", 1, 0);
    n.set(0, 1);
    n.set(1, 4_000_000);
    n.set(2, 1_000_000);
    const msg = await rejection(repeat(src, { count: attribute("n") }));
    expect(msg).toContain("repeatPoints: the resolved counts would emit more than 4194304 points");
    expect(msg).toContain("at point 2");
    expect(msg).toContain("min(<the count field>");
  });

  it("allows a total exactly at the cap", async () => {
    // Exactly the cap is legal (cap + 1 is refused above); this pins the
    // comparison's direction.
    const src = createPointCloud(1);
    const out = await repeat(src, { count: 1 << 22, indexAttr: "" });
    expect(out.pointCount).toBe(1 << 22);
  });
});

describe("repeatPoints: indexAttr and countAttr", () => {
  it("indexAttr empty writes no index column; countAttr empty (default) writes no count", async () => {
    const src = richCloud();
    const out = await repeat(src, { count: 2, indexAttr: "" });
    expect(out.attrs.point.names()).toEqual([...src.attrs.point.names()]);
  });

  it("writes i32 columns with defaults -1 (index) and 0 (count)", async () => {
    const out = await repeat(richCloud(), { count: 2, indexAttr: "slot", countAttr: "n" });
    const slot = out.attrs.point.require("slot");
    const n = out.attrs.point.require("n");
    expect([slot.type, slot.tupleSize, slot.defaultValue]).toEqual(["i32", 1, [-1]]);
    expect([n.type, n.tupleSize, n.defaultValue]).toEqual(["i32", 1, [0]]);
    expect(col(out, "slot")).toEqual([0, 1, 0, 1, 0, 1]);
    expect(col(out, "n")).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("overwrites a same-shape input column (re-running over its own output)", async () => {
    const once = await repeat(richCloud(), { count: 2 });
    const twice = await repeat(once, { count: 3 });
    expect(twice.pointCount).toBe(18);
    // The outer index replaces the inner one.
    expect(col(twice, "copy")).toEqual(Array.from({ length: 18 }, (_, k) => k % 3));
  });

  it("refuses a differently shaped input column under the name", async () => {
    const lvl = await rejection(repeat(richCloud(), { indexAttr: "height" }));
    expect(lvl).toContain('repeatPoints: indexAttr "height" already exists');
    const seedMsg = await rejection(repeat(richCloud(), { countAttr: "seed" }));
    expect(seedMsg).toContain('repeatPoints: param "countAttr" cannot write "seed"');
    const strMsg = await rejection(repeat(richCloud(), { indexAttr: "kind" }));
    expect(strMsg).toContain('indexAttr "kind" already exists');
  });

  it("refuses a standard point attribute by name, even when the input lacks it", async () => {
    // A seedless, P-less cloud: the shape check alone would pass both.
    const bare = new Geometry();
    bare.attrs.point.add("w", "f32", 1, 0);
    bare.attrs.point.resize(2);
    for (const [param, name] of [
      ["indexAttr", "seed"],
      ["countAttr", "seed"],
      ["indexAttr", "P"],
      ["countAttr", "color"],
    ]) {
      const msg = await rejection(repeat(bare, { [param]: name }));
      expect(msg).toContain(`repeatPoints: param "${param}" cannot write "${name}"`);
    }
  });

  it("refuses indexAttr and countAttr naming the same attribute", async () => {
    const msg = await rejection(repeat(richCloud(), { indexAttr: "k", countAttr: "k" }));
    expect(msg).toContain('repeatPoints: params "indexAttr" and "countAttr" are both "k"');
  });
});

describe("repeatPoints: seeds", () => {
  it("copy k of a point with seed s gets hashCombine(s, k), copy 0 included", async () => {
    const out = await repeat(richCloud(), { count: 3 });
    const expected: number[] = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) expected.push(hashCombine(100 + i, k));
    expect(col(out, "seed")).toEqual(expected);
    expect(out.attrs.point.require("seed").type).toBe("u32");
  });

  it("matches hashCombine bit for bit for seeds past 2^31", async () => {
    const src = createPointCloud(3);
    const seeds = [0x80000000, 0xfffffffe, 0xffffffff];
    seeds.forEach((v, i) => {
      src.attrs.point.require("seed").set(i, v);
      src.attrs.point.require("P").set(i, i, 0);
    });
    const out = await repeat(src, { count: 2 });
    expect(col(out, "seed")).toEqual(seeds.flatMap((v) => [hashCombine(v, 0), hashCombine(v, 1)]));
  });

  it("copies of one point have distinct seeds, so coincident copies are distinct points", async () => {
    const out = await repeat(richCloud(), { count: 50 });
    const seeds = col(out, "seed");
    for (let i = 0; i < 3; i++) {
      expect(new Set(seeds.slice(i * 50, i * 50 + 50)).size).toBe(50);
    }
  });

  it("a cloud with no seed column reads seed 0 and gains a u32 seed column", async () => {
    const src = new Geometry();
    src.attrs.point.add("P", "f32", 3, [0, 0, 0]);
    src.attrs.point.resize(2);
    const out = await repeat(src, { count: 2 });
    expect(out.attrs.point.require("seed").type).toBe("u32");
    expect(col(out, "seed")).toEqual([hashCombine(0, 0), hashCombine(0, 1), hashCombine(0, 0), hashCombine(0, 1)]);
  });

  it("chained repeats keep every copy distinct (why copy 0 is re-seeded)", async () => {
    const src = createPointCloud(1);
    src.attrs.point.require("seed").set(0, 9);
    const once = await repeat(src, { count: 2, indexAttr: "a" });
    const twice = await repeat(once, { count: 2, indexAttr: "b" });
    expect(new Set(col(twice, "seed")).size).toBe(4);
  });

  it("refuses a seed column of a non-standard shape", async () => {
    const src = new Geometry();
    src.attrs.point.add("P", "f32", 3, [0, 0, 0]);
    src.attrs.point.add("seed", "f32", 1, 0);
    src.attrs.point.resize(1);
    const msg = await rejection(repeat(src));
    expect(msg).toContain('repeatPoints: the standard point attribute "seed" must be u32');
    expect(msg).toContain("f32 tupleSize 1");
  });

  it("does not depend on the node seed (a plain count)", async () => {
    const a = await repeat(richCloud(), { count: 3 }, 1);
    const b = await repeat(richCloud(), { count: 3 }, 987654);
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
  });
});

describe("repeatPoints: topology", () => {
  it("drops the input's topology and its vertex and primitive attributes", async () => {
    const path = createPolyline([0, 0, 0, 1, 0, 0, 2, 0, 0]);
    path.attrs.primitive.add("width", "f32", 1, 0);
    const out = await repeat(path, { count: 2 });
    expect(out.pointCount).toBe(6);
    expect(out.vertexToPoint.length).toBe(0);
    expect(out.primVertexStart.length).toBe(0);
    expect(out.attrs.primitive.has("width")).toBe(false);
    expect(col(out, "P").filter((_, k) => k % 3 === 0)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe("repeatPoints: in a graph", () => {
  function build(): Graph {
    const g = new Graph(77);
    const line = g.add(pointLine, { count: 4, start: [0, 0, 0], end: [6, 0, 0] }, "line");
    const n = g.add(
      setAttribute,
      { name: "n", type: "f32", value: fieldFromJson({ fn: "add", args: [{ fn: "index" }, 1] }) },
      "n",
    );
    const rep = g.add(repeatPoints, { count: fieldFromJson({ fn: "attribute", name: "n" }), countAttr: "total" }, "rep");
    g.connect(line, "out", n, "in");
    g.connect(n, "out", rep, "in");
    g.output(rep, "out", "stack");
    return g;
  }

  it("cooks byte-identically from two fresh graphs", async () => {
    const a = firstGeo((await cook(build())).outputs.stack);
    const b = firstGeo((await cook(build())).outputs.stack);
    expect(a.pointCount).toBe(1 + 2 + 3 + 4);
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
  });

  it("round-trips through the serialized format and cooks the same", async () => {
    const json = serializeGraph(build());
    const node = json.nodes.find((x) => x.id === "rep");
    expect(node?.type).toBe("repeatPoints");
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build())).outputs.stack);
    const b = firstGeo((await cook(back)).outputs.stack);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(col(b, "copy")).toEqual([0, 0, 1, 0, 1, 2, 0, 1, 2, 3]);
    expect(col(b, "total")).toEqual([1, 2, 2, 3, 3, 3, 4, 4, 4, 4]);
  });
});

describe("repeatPoints: the corpus teaching graph", () => {
  it("graphs/basics-repeat-points.json does what its description says", async () => {
    const text = readFileSync(new URL("../../graphs/basics-repeat-points.json", import.meta.url), "utf8");
    const res = await cook(deserializeGraph(JSON.parse(text)));
    const out = firstGeo(res.outputs.points);
    const copy = col(out, "copy");
    const storeys = col(out, "storeys");
    const piece = strings(out, "piece");
    const scale = col(out, "scale");
    const P = col(out, "P");
    const red = col(out, "color").filter((_, k) => k % 4 === 0);
    // Walk the output tower by tower: point-major, copy 0 first, each
    // tower exactly `storeys` tall, its storeys 1 apart, its piece and scale
    // carried, and its tints distinct although they were drawn while the
    // storeys were still coincident.
    let slot = 0;
    let towers = 0;
    const heights = new Set<number>();
    while (slot < out.pointCount) {
      const n = storeys[slot];
      expect(Number.isInteger(n) && n >= 1 && n <= 6).toBe(true);
      heights.add(n);
      const tints = new Set<number>();
      for (let k = 0; k < n; k++) {
        expect(copy[slot + k]).toBe(k);
        expect(storeys[slot + k]).toBe(n);
        expect(piece[slot + k]).toBe(towers % 2 === 0 ? "box" : "panel");
        expect(scale.slice((slot + k) * 3, (slot + k) * 3 + 3)).toEqual([4, Math.fround(2.2), 4]);
        expect(P[(slot + k) * 3 + 1]).toBe(k);
        expect(P[(slot + k) * 3]).toBe(P[slot * 3]);
        tints.add(red[slot + k]);
      }
      expect(tints.size).toBe(n);
      slot += n;
      towers++;
    }
    expect(towers).toBe(8);
    // The draw is not degenerate: the towers are not all one height.
    expect(heights.size).toBeGreaterThan(2);
  });
});
