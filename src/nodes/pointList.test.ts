import { describe, expect, it } from "vitest";
import type { Geometry } from "../data/index.js";
import { index, ramp, vec } from "../fields/index.js";
import { Graph, cook } from "../graph/index.js";
import { Pcg32, hashCombine } from "../random/index.js";
import {
  deserializeGraph,
  pointGrid,
  pointList,
  serializeGraph,
  setAttribute,
  type PointListParams,
} from "./index.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

const f32 = Math.fround;

/** The node run directly, with node seed 1 unless given. */
async function list(params: Partial<PointListParams>, seed = 1): Promise<Geometry> {
  return firstGeo((await runNode(pointList, params, {}, seed)).out);
}

/** A column's stored values, exactly. */
function column(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.subarray(0, geo.pointCount * a.tupleSize));
}

describe("pointList", () => {
  it("emits one point per triple in order, P as f32 of the literal", async () => {
    const geo = await list({ positions: [0.1, 2, -3, 4, 5.5, 6, 1e-3, 0, 1e7 + 1] });
    expect(geo.pointCount).toBe(3);
    expect(column(geo, "P")).toEqual([0.1, 2, -3, 4, 5.5, 6, 1e-3, 0, 1e7 + 1].map(f32));
    expect(geo.attrs.primitive.count).toBe(0);
    // The standard cloud, defaults untouched.
    expect(column(geo, "density")).toEqual([1, 1, 1]);
    expect(column(geo, "rot")).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  it("is empty at its defaults", async () => {
    const geo = await list({});
    expect(geo.pointCount).toBe(0);
    expect(geo.attrs.point.names()).toContain("seed");
  });

  it("writes seed exactly as pointGrid does: hashCombine(node seed, index)", async () => {
    const n = 37;
    const positions = Array.from({ length: n * 3 }, (_, j) => j);
    for (const nodeSeed of [0, 1, 12345, 0xffffffff]) {
      const a = await list({ positions }, nodeSeed);
      const grid = firstGeo(
        (await runNode(pointGrid, { countX: n, countY: 1, countZ: 1 }, {}, nodeSeed)).out,
      );
      expect(column(a, "seed")).toEqual(column(grid, "seed"));
      expect(column(a, "seed")).toEqual(Array.from({ length: n }, (_, i) => hashCombine(nodeSeed, i)));
    }
  });

  it("writes typed columns, column-major, vectors point-major within a column", async () => {
    const geo = await list({
      positions: [0, 0, 0, 1, 0, 0],
      columnNames: ["h", "kind", "id", "on", "uv", "up", "tint"],
      columnTypes: ["f32", "i32", "u32", "bool", "vec2", "vec3", "vec4"],
      columnValues: [
        0.5, -1.25, // h
        -7, 3, // kind
        4000000000, 0, // id
        1, 0, // on
        1, 2, 3, 4, // uv
        0, 1, 0, 0, 0, 1, // up
        1, 0, 0, 1, 0, 1, 0, 0.5, // tint
      ],
    });
    const set = geo.attrs.point;
    const shape = (name: string) => {
      const a = set.require(name);
      return [a.type, a.tupleSize];
    };
    expect(shape("h")).toEqual(["f32", 1]);
    expect(shape("kind")).toEqual(["i32", 1]);
    expect(shape("id")).toEqual(["u32", 1]);
    expect(shape("on")).toEqual(["bool", 1]);
    expect(shape("uv")).toEqual(["f32", 2]);
    expect(shape("up")).toEqual(["f32", 3]);
    expect(shape("tint")).toEqual(["f32", 4]);
    expect(column(geo, "h")).toEqual([0.5, -1.25]);
    expect(column(geo, "kind")).toEqual([-7, 3]);
    expect(column(geo, "id")).toEqual([4000000000, 0]);
    expect(column(geo, "on")).toEqual([1, 0]);
    expect(column(geo, "uv")).toEqual([1, 2, 3, 4]);
    expect(column(geo, "up")).toEqual([0, 1, 0, 0, 0, 1]);
    expect(column(geo, "tint")).toEqual([1, 0, 0, 1, 0, 1, 0, 0.5]);
    // Appended after the standard cloud, in list order.
    expect(set.names().slice(-7)).toEqual(["h", "kind", "id", "on", "uv", "up", "tint"]);
  });

  it("treats an empty columnTypes as every column f32", async () => {
    const geo = await list({
      positions: [0, 0, 0, 1, 1, 1],
      columnNames: ["a", "b"],
      columnValues: [1.5, 2.5, 3, 4],
    });
    expect(geo.attrs.point.require("a").type).toBe("f32");
    expect(column(geo, "a")).toEqual([1.5, 2.5]);
    expect(column(geo, "b")).toEqual([3, 4]);
  });

  it("overwrites a standard attribute in place when declared with its own type", async () => {
    const before = (await list({ positions: [0, 0, 0] })).attrs.point.names();
    const geo = await list({
      positions: [0, 0, 0, 1, 0, 0],
      columnNames: ["color", "scale", "density"],
      columnTypes: ["vec4", "vec3", "f32"],
      columnValues: [1, 0, 0, 1, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 0.25, 0.75],
    });
    expect(geo.attrs.point.names()).toEqual(before);
    expect(column(geo, "color")).toEqual([1, 0, 0, 1, 0, 0, 1, 1]);
    expect(column(geo, "scale")).toEqual([2, 2, 2, 3, 3, 3]);
    expect(column(geo, "density")).toEqual([0.25, 0.75]);
    // The standard defaults stay (setAttribute's replace() would reset them to 0).
    expect(geo.attrs.point.require("color").defaultValue).toEqual([1, 1, 1, 1]);
    expect(geo.attrs.point.require("density").defaultValue).toEqual([1]);
  });

  describe("refusals", () => {
    const one = { positions: [0, 0, 0, 1, 1, 1] };
    it("positions that are not whole triples", async () => {
      await expect(list({ positions: [0, 0, 0, 1] })).rejects.toThrow(
        /pointList: param "positions" holds 4 numbers, which is not whole \[x, y, z\] triples — 1 point takes 3 and 2 take 6/,
      );
    });
    it("a position past the f32 range, or non-finite", async () => {
      await expect(list({ positions: [0, 1e39, 0] })).rejects.toThrow(
        /"positions" entry 1 \(point 0, y\) is 1e\+39, which is outside the f32 range/,
      );
      await expect(list({ positions: [0, 0, Infinity] })).rejects.toThrow(/entry 2 \(point 0, z\).*not a finite number/);
    });
    it("a non-finite list at the param layer, before the node runs", () => {
      const g = new Graph(1);
      expect(() => g.add(pointList, { positions: [Number.NaN, 0, 0] })).toThrow(/finite/);
    });
    it("columnTypes of the wrong length", async () => {
      await expect(
        list({ ...one, columnNames: ["a", "b"], columnTypes: ["f32"], columnValues: [1, 2, 3, 4] }),
      ).rejects.toThrow(/"columnTypes" lists 1 type for 2 columns in "columnNames"/);
    });
    it("an unknown type, with a suggestion", async () => {
      await expect(
        list({ ...one, columnNames: ["a"], columnTypes: ["vec5"], columnValues: [1, 2] }),
      ).rejects.toThrow(/column "a" has unknown type "vec5" \(param "columnTypes" entry 0\); did you mean .*valid types: f32, i32, u32, bool, vec2, vec3, vec4/);
      await expect(
        list({ ...one, columnNames: ["a"], columnTypes: ["string"], columnValues: [1, 2] }),
      ).rejects.toThrow(/unknown type "string"/);
    });
    it("P, seed, an empty name and a repeated name", async () => {
      await expect(list({ ...one, columnNames: ["P"], columnTypes: ["vec3"], columnValues: [0, 0, 0, 0, 0, 0] })).rejects.toThrow(
        /column "P" is refused — the positions are param "positions"/,
      );
      await expect(list({ ...one, columnNames: ["seed"], columnTypes: ["u32"], columnValues: [1, 2] })).rejects.toThrow(
        /column "seed" is refused — .*exactly as pointGrid/,
      );
      await expect(list({ ...one, columnNames: [""], columnValues: [1, 2] })).rejects.toThrow(
        /"columnNames" entry 0 is empty/,
      );
      await expect(list({ ...one, columnNames: ["a", "a"], columnValues: [1, 2, 3, 4] })).rejects.toThrow(
        /column "a" is named twice in "columnNames" \(entries 0 and 1\)/,
      );
    });
    it("a standard attribute under another type", async () => {
      await expect(
        list({ ...one, columnNames: ["color"], columnTypes: ["vec3"], columnValues: [0, 0, 0, 0, 0, 0] }),
      ).rejects.toThrow(/column "color" is declared vec3, but "color" is a standard point attribute stored as vec4; declare it "vec4"/);
      await expect(
        list({ ...one, columnNames: ["density"], columnTypes: ["i32"], columnValues: [1, 2] }),
      ).rejects.toThrow(/"density" is a standard point attribute stored as f32/);
    });
    it("a columnValues length that is not the columns', listing every slice", async () => {
      await expect(
        list({
          ...one,
          columnNames: ["h", "up"],
          columnTypes: ["f32", "vec3"],
          columnValues: [1, 2, 0, 1, 0, 0, 1],
        }),
      ).rejects.toThrow(
        /"columnValues" holds 7 numbers, but 2 points and 2 columns take 8 — .*"h" \(f32\) \[0, 2\), "up" \(vec3\) \[2, 8\)/,
      );
      await expect(list({ ...one, columnValues: [1] })).rejects.toThrow(
        /no columns in "columnNames", so columnValues must be empty/,
      );
    });
    it("a value its column cannot hold, naming the column and the point", async () => {
      const cases: [string, number, RegExp][] = [
        ["i32", 1.5, /column "c" \(i32\) value for point 1 \(columnValues entry 1\) is 1.5, which is not an integer in the i32 range/],
        ["i32", 2 ** 31, /not an integer in the i32 range/],
        ["u32", -1, /is -1, which is not an integer in the u32 range/],
        ["u32", 2 ** 32, /u32 range/],
        ["bool", 2, /is 2, which is not 0 or 1/],
        ["f32", 1e39, /outside the f32 range/],
        ["f32", Number.NaN, /not a finite number/],
      ];
      for (const [type, bad, msg] of cases) {
        await expect(
          list({ ...one, columnNames: ["c"], columnTypes: [type], columnValues: [0, bad] }),
        ).rejects.toThrow(msg);
      }
      await expect(
        list({ ...one, columnNames: ["v"], columnTypes: ["vec3"], columnValues: [0, 0, 0, 0, Infinity, 0] }),
      ).rejects.toThrow(/column "v" \(vec3\) value for point 1, component 1 \(columnValues entry 4\)/);
    });
  });

  it("is deterministic, and the graph seed moves only the seed column", async () => {
    const params = {
      positions: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      columnNames: ["h"],
      columnValues: [0.1, 0.2, 0.3],
    };
    const cookWith = async (graphSeed: number) => {
      const g = new Graph(graphSeed);
      g.output(g.add(pointList, params, "stars"), "out", "pts");
      return firstGeo((await cook(g)).outputs.pts);
    };
    const a = await cookWith(7);
    expect(snapshotGeometry(await cookWith(7))).toEqual(snapshotGeometry(a));
    const b = await cookWith(8);
    expect(column(b, "P")).toEqual(column(a, "P"));
    expect(column(b, "h")).toEqual(column(a, "h"));
    expect(column(b, "seed")).not.toEqual(column(a, "seed"));
  });

  it("round-trips through JSON as plain number and string lists", async () => {
    const g = new Graph(3);
    g.output(
      g.add(
        pointList,
        {
          positions: [0, 1, 2, 3.5, -4, 5],
          columnNames: ["kind", "up"],
          columnTypes: ["i32", "vec3"],
          columnValues: [2, 9, 0, 1, 0, 1, 0, 0],
        },
        "table",
      ),
      "out",
      "pts",
    );
    const json = serializeGraph(g);
    const node = json.nodes.find((n) => n.id === "table");
    expect(node?.params).toEqual({
      positions: [0, 1, 2, 3.5, -4, 5],
      columnNames: ["kind", "up"],
      columnTypes: ["i32", "vec3"],
      columnValues: [2, 9, 0, 1, 0, 1, 0, 0],
    });
    const back = deserializeGraph(JSON.parse(JSON.stringify(json)));
    expect(serializeGraph(back)).toEqual(json);
    expect(snapshotGeometry(firstGeo((await cook(back)).outputs.pts))).toEqual(
      snapshotGeometry(firstGeo((await cook(g)).outputs.pts)),
    );
  });

  describe("byte-identity with pointGrid + setAttribute(ramp(index(), stops))", () => {
    /** The table this node replaces: a stop per point, [i, v_i]. */
    const table = (vs: readonly number[]) => ramp(index(), vs.map((v, i) => [i, v] as const));

    /** Both forms of one table under node id "table", cooked from JSON. */
    async function bothForms(
      n: number,
      xyz: readonly number[],
      h: readonly number[],
      kind: readonly number[],
      up: readonly number[],
    ): Promise<[Geometry, Geometry]> {
      const axis = (src: readonly number[], k: number, w: number) =>
        Array.from({ length: n }, (_, i) => src[i * w + k]!);
      const faked = new Graph(4242);
      const grid = faked.add(pointGrid, { countX: n, countY: 1, countZ: 1 }, "table");
      const setP = faked.add(setAttribute, {
        name: "P",
        tupleSize: 3,
        value: vec(table(axis(xyz, 0, 3)), table(axis(xyz, 1, 3)), table(axis(xyz, 2, 3))),
      });
      const setH = faked.add(setAttribute, { name: "h", value: table(h) });
      const setK = faked.add(setAttribute, { name: "kind", type: "i32", value: table(kind) });
      const setU = faked.add(setAttribute, {
        name: "up",
        tupleSize: 3,
        value: vec(table(axis(up, 0, 3)), table(axis(up, 1, 3)), table(axis(up, 2, 3))),
      });
      faked.connect(grid, "out", setP, "in");
      faked.connect(setP, "out", setH, "in");
      faked.connect(setH, "out", setK, "in");
      faked.connect(setK, "out", setU, "in");
      faked.output(setU, "out", "pts");

      const literal = new Graph(4242);
      literal.output(
        literal.add(
          pointList,
          {
            positions: xyz,
            columnNames: ["h", "kind", "up"],
            columnTypes: ["f32", "i32", "vec3"],
            columnValues: [...h, ...kind, ...up],
          },
          "table",
        ),
        "out",
        "pts",
      );
      // Through JSON, the way a serialized graph reaches both.
      const viaJson = (g: Graph) => deserializeGraph(JSON.parse(JSON.stringify(serializeGraph(g))));
      const a = firstGeo((await cook(viaJson(faked))).outputs.pts);
      const b = firstGeo((await cook(viaJson(literal))).outputs.pts);
      return [a, b];
    }

    it("cooks to the same bytes, every column and P, for f32-representable values", async () => {
      const rng = new Pcg32(99);
      const n = 400;
      const r = (lo: number, hi: number) => f32(rng.range(lo, hi));
      const xyz = Array.from({ length: n * 3 }, () => r(-500, 500));
      const h = Array.from({ length: n }, () => r(-1, 1));
      const kind = Array.from({ length: n }, () => Math.floor(rng.range(-1000, 1000)));
      const up = Array.from({ length: n * 3 }, () => r(-1, 1));
      const [a, b] = await bothForms(n, xyz, h, kind, up);
      expect(a.pointCount).toBe(n);
      // Every domain, every attribute, order, type and stored value.
      expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
      // And the bytes themselves, per column, so a -0 against a 0 would show.
      for (const name of a.attrs.point.names()) {
        const x = a.attrs.point.require(name).data;
        const y = b.attrs.point.require(name).data;
        const bytes = (d: typeof x) =>
          Array.from(new Uint8Array(d.slice(0, n * a.attrs.point.require(name).tupleSize).buffer));
        expect(bytes(y), name).toEqual(bytes(x));
      }
    });

    it("also for arbitrary doubles, except where the ramp's own arithmetic rounds away", async () => {
      // A stop hit exactly is answered from the segment BELOW at u = 1:
      // f32(v[k-1] + (v[k] - v[k-1])), which is f32(v[k]) unless v[k]
      // sits within a double rounding of an f32 midpoint. pointList stores
      // f32(v[k]), the correctly rounded one. State both models exactly
      // and check each form against its own.
      const rng = new Pcg32(7);
      const n = 300;
      const xyz = Array.from({ length: n * 3 }, () => rng.range(-500, 500));
      const h = Array.from({ length: n }, () => rng.range(-1, 1));
      const kind = Array.from({ length: n }, () => Math.floor(rng.range(-1000, 1000)));
      const up = Array.from({ length: n * 3 }, () => rng.range(-1, 1));
      const [a, b] = await bothForms(n, xyz, h, kind, up);
      const rampModel = (vs: readonly number[]) =>
        vs.map((v, i) => (i === 0 || i === vs.length - 1 ? f32(v) : f32(vs[i - 1]! + (v - vs[i - 1]!))));
      expect(column(b, "h")).toEqual(h.map(f32));
      expect(column(a, "h")).toEqual(rampModel(h));
      expect(column(b, "kind")).toEqual(column(a, "kind"));
      // On this sample the two models agree everywhere, so the forms do.
      expect(rampModel(h)).toEqual(h.map(f32));
      expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    });

    it("diverges beside a much larger neighbour, where the ramp loses the value", async () => {
      // (v - 1e20) rounds away v in double, so the stop reads back 0.
      const h = [0, 1e20, f32(-0.238), 5];
      const pos = Array.from({ length: 12 }, (_, j) => (j % 3 === 0 ? j / 3 : 0));
      const [a, b] = await bothForms(4, pos, h, [0, 0, 0, 0], new Array(12).fill(0));
      expect(column(a, "h")[2]).toBe(0);
      expect(column(b, "h")[2]).toBe(f32(-0.238));
    });

    it("stores integers past 2^24 exactly, which a ramp (computing in f32) cannot", async () => {
      const kind = [16777217, 2147483647, -2147483648, 1];
      const pos = Array.from({ length: 12 }, (_, j) => (j % 3 === 0 ? j / 3 : 0));
      const [a, b] = await bothForms(4, pos, [0, 0, 0, 0], kind, new Array(12).fill(0));
      expect(column(b, "kind")).toEqual(kind);
      expect(column(a, "kind")).not.toEqual(kind);
      const id = await list({ positions: [0, 0, 0], columnNames: ["id"], columnTypes: ["u32"], columnValues: [4294967295] });
      expect(column(id, "id")).toEqual([4294967295]);
    });

    it("the one divergence is the ramp's, and pointList is the correctly rounded side", async () => {
      // v is one double ulp above the midpoint between 1 and the next f32,
      // so f32(v) rounds UP. Reached from 3.0003, the ramp's round trip
      // 3.0003 + (v - 3.0003) loses that ulp, lands ON the midpoint, and
      // rounds to even: 1.
      const v = 1 + 2 ** -24 + 2 ** -52;
      const h = [3.0003, v, 0];
      const [a, b] = await bothForms(3, [0, 0, 0, 1, 0, 0, 2, 0, 0], h, [0, 0, 0], new Array(9).fill(0));
      expect(column(b, "h")[1]).toBe(f32(v));
      expect(f32(v)).toBe(1 + 2 ** -23);
      expect(column(a, "h")[1]).toBe(1);
    });
  });
});
