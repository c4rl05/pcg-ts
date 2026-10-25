/**
 * `transformBox`: every cell's box scaled about a pivot, then moved.
 *
 * Expectations are derived BY HAND from the param descriptions, or from an
 * ORACLE written here from them — x' = (x - pivot) * scale + pivot +
 * translate on both faces, min and max taken after — never recorded from a
 * run. Coordinates, scales and pivots are dyadic wherever a result is
 * compared, so "exact" is exact.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import { Pcg32 } from "../random/index.js";
import {
  deserializeGraph,
  fieldFromJson,
  parseFieldText,
  pointGrid,
  serializeGraph,
  setAttribute,
  setBounds,
} from "./index.js";
import "../spawn/index.js";
import { transformBox } from "./transformBox.js";
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

async function xform(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(transformBox, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

async function bounds(geo: Geometry, params: Record<string, unknown>): Promise<Geometry> {
  const outputs = await runNode(setBounds, params, { in: [makeGeometryItem(geo)] }, 1);
  return firstGeo(outputs.out);
}

const f = (text: string) => fieldFromJson(parseFieldText(text));

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

type Box = [number[], number[]];

function boxes(geo: Geometry): Box[] {
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  return Array.from({ length: geo.pointCount }, (_, i) => [lo.slice(i * 3, i * 3 + 3), hi.slice(i * 3, i * 3 + 3)]);
}

/** Cells with the given boxes, seeds 100, 101, ... and an i32 `cell` index. */
function cells(list: Box[]): Geometry {
  const geo = createPointCloud(list.length);
  const pts = geo.attrs.point;
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  const seed = pts.require("seed");
  const cell = pts.add("cell", "i32", 1, -1);
  list.forEach(([a, b], i) => {
    lo.setTuple(i, a);
    hi.setTuple(i, b);
    seed.set(i, 100 + i);
    cell.set(i, i);
  });
  return geo;
}

/** A dyadic number in [-r, r] on a 1/8 grid. */
function dyadic(rng: Pcg32, r: number): number {
  return Math.round((rng.nextF32() * 2 - 1) * r * 8) / 8;
}

/** Every attribute's stored BYTES (strings resolved) and the topology. */
function bytes(geo: Geometry): unknown {
  const out: Record<string, unknown> = {};
  for (const domain of ["point", "vertex", "primitive", "detail"] as const) {
    const set = geo.attrs[domain];
    out[domain] = set.names().map((name) => {
      const a = set.require(name);
      const view = a.data.subarray(0, set.count * a.tupleSize) as unknown as ArrayBufferView;
      return [
        name,
        a.type,
        a.tupleSize,
        Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString("base64"),
        a.type === "string" ? Array.from({ length: set.count }, (_, i) => a.getString(i)) : null,
      ];
    });
  }
  out.topology = [Array.from(geo.vertexToPoint), Array.from(geo.primVertexStart), Array.from(geo.primVertexCount)];
  return out;
}

/**
 * The oracle, from the description: per axis the pivot (a point, or a
 * fraction of the cell's box, or of the union of the chosen boxes), both
 * faces mapped, min and max taken, stored as f32.
 */
function oracle(list: Box[], s: number[][], pv: number[][], t: number[][], pivotIn: string, chosen: boolean[]): Box[] {
  const uLo = [Infinity, Infinity, Infinity];
  const uHi = [-Infinity, -Infinity, -Infinity];
  list.forEach(([lo, hi], i) => {
    if (!chosen[i]) return;
    for (let k = 0; k < 3; k++) {
      uLo[k] = Math.min(uLo[k], lo[k]);
      uHi[k] = Math.max(uHi[k], hi[k]);
    }
  });
  return list.map(([lo, hi], i) => {
    if (!chosen[i]) return [lo.slice(), hi.slice()];
    const l: number[] = [];
    const h: number[] = [];
    for (let k = 0; k < 3; k++) {
      const p =
        pivotIn === "origin" ? pv[i][k] : pivotIn === "cell" ? lo[k] + pv[i][k] * (hi[k] - lo[k]) : uLo[k] + pv[i][k] * (uHi[k] - uLo[k]);
      const a = p + s[i][k] * (lo[k] - p) + t[i][k];
      const b = p + s[i][k] * (hi[k] - p) + t[i][k];
      // + 0: a -0 face is written +0 (dyadic() can round to -0).
      l.push(Math.fround(Math.min(a, b)) + 0);
      h.push(Math.fround(Math.max(a, b)) + 0);
    }
    return [l, h];
  });
}

/** A per-cell vec3 as three f32 point attributes' worth of data. */
function vecAttr(geo: Geometry, name: string, rows: number[][]): void {
  const a = geo.attrs.point.add(name, "f32", 3, [0, 0, 0]);
  rows.forEach((r, i) => a.setTuple(i, r));
}

// ---------------------------------------------------------------------------

describe("transformBox: by hand", () => {
  it("a box from 2 to 6 scaled by 0.5: about the origin 1..3, about its centre 3..5, then moved", async () => {
    const geo = cells([[[2, 2, 2], [6, 6, 6]]]);
    expect(boxes(await xform(geo, { scale: [0.5, 0.5, 0.5] }))).toEqual([[[1, 1, 1], [3, 3, 3]]]);
    expect(boxes(await xform(geo, { scale: [0.5, 0.5, 0.5], pivot: [0.5, 0.5, 0.5], pivotIn: "cell" }))).toEqual([[[3, 3, 3], [5, 5, 5]]]);
    expect(boxes(await xform(geo, { scale: [0.5, 0.5, 0.5], pivot: [4, 4, 4] }))).toEqual([[[3, 3, 3], [5, 5, 5]]]);
    expect(boxes(await xform(geo, { scale: [0.5, 0.5, 0.5], translate: [-4, 0, 10] }))).toEqual([[[-3, 1, 11], [-1, 3, 13]]]);
    // Per axis: x doubled about the min face, y kept, z about the max face.
    expect(boxes(await xform(geo, { scale: [2, 1, 0.25], pivot: [0, 0.5, 1], pivotIn: "cell" }))).toEqual([[[2, 2, 5], [10, 6, 6]]]);
    // The defaults change nothing.
    expect(boxes(await xform(geo))).toEqual(boxes(geo));
  });

  it("a pivot face does not move; a fraction outside 0..1 is past the face", async () => {
    const geo = cells([[[0, 0, 0], [4, 2, 8]]]);
    // pivot at the floor (y fraction 0): the floor stays, the box grows up.
    expect(boxes(await xform(geo, { scale: [1, 3, 1], pivot: [0, 0, 0], pivotIn: "cell" }))).toEqual([[[0, 0, 0], [4, 6, 8]]]);
    // x fraction 1.5 of [0, 4] is 6: [0, 4] scaled 0.5 about 6 is [3, 5].
    expect(boxes(await xform(geo, { scale: [0.5, 1, 1], pivot: [1.5, 0, 0], pivotIn: "cell" }))).toEqual([[[3, 0, 0], [5, 2, 8]]]);
  });

  it("a negative scale mirrors about the pivot, faces swapped; 0 leaves a box of no volume on the pivot, kept", async () => {
    const geo = cells([
      [[2, 0, 0], [6, 1, 1]],
      [[-1, 0, 0], [3, 1, 1]],
    ]);
    expect(boxes(await xform(geo, { scale: [-1, 1, 1] }))).toEqual([
      [[-6, 0, 0], [-2, 1, 1]],
      [[-3, 0, 0], [1, 1, 1]],
    ]);
    expect(boxes(await xform(geo, { scale: [-0.5, 1, 1], pivot: [0.5, 0, 0], pivotIn: "cell" }))).toEqual([
      [[3, 0, 0], [5, 1, 1]],
      [[0, 0, 0], [2, 1, 1]],
    ]);
    const flat = await xform(geo, { scale: [0, 1, 1], pivot: [0.25, 0, 0], pivotIn: "cell" });
    expect(flat.pointCount).toBe(2);
    expect(boxes(flat)).toEqual([
      [[3, 0, 0], [3, 1, 1]],
      [[0, 0, 0], [0, 1, 1]],
    ]);
  });

  it('"union": one pivot for the assembly, so boxes that touched still touch; "cell" opens the gaps', async () => {
    const geo = cells([
      [[0, 0, 0], [2, 2, 2]],
      [[2, 0, 0], [4, 2, 2]],
      [[4, 0, 0], [8, 4, 2]],
    ]);
    // Union [0, 8] x [0, 4] x [0, 2]; pivot (4, 0, 1).
    expect(boxes(await xform(geo, { scale: [0.5, 0.5, 0.5], pivot: [0.5, 0, 0.5], pivotIn: "union" }))).toEqual([
      [[2, 0, 0.5], [3, 1, 1.5]],
      [[3, 0, 0.5], [4, 1, 1.5]],
      [[4, 0, 0.5], [6, 2, 1.5]],
    ]);
    // Each about its own centre: the faces that were shared part.
    expect(boxes(await xform(geo, { scale: [0.5, 1, 1], pivot: [0.5, 0, 0], pivotIn: "cell" }))).toEqual([
      [[0.5, 0, 0], [1.5, 2, 2]],
      [[2.5, 0, 0], [3.5, 2, 2]],
      [[5, 0, 0], [7, 4, 2]],
    ]);
  });

  it('"union" counts only the cells where selects, and the rest pass through exactly', async () => {
    const geo = cells([
      [[0, 0, 0], [2, 2, 2]],
      [[2, 0, 0], [4, 2, 2]],
      [[100, 100, 100], [200, 200, 200]],
    ]);
    const got = boxes(await xform(geo, { scale: [2, 2, 2], pivot: [0.5, 0.5, 0.5], pivotIn: "union", where: f('lt(attribute("cell"), 2)') }));
    // Union of cells 0 and 1: [0, 4] x [0, 2] x [0, 2], centre (2, 1, 1).
    expect(got).toEqual([
      [[-2, -1, -1], [2, 3, 3]],
      [[2, -1, -1], [6, 3, 3]],
      [[100, 100, 100], [200, 200, 200]],
    ]);
  });

  it('"union" refuses chosen cells in different frames, naming two and the column; one shared frame, or the odd cell left out, cooks', async () => {
    const geo = cells([
      [[0, 0, 0], [2, 2, 2]],
      [[2, 0, 0], [4, 2, 2]],
      [[4, 0, 0], [6, 2, 2]],
    ]);
    const params = { scale: [2, 2, 2], pivot: [0.5, 0.5, 0.5], pivotIn: "union" };
    const shared = { P: [8, 0, -3] as [number, number, number], rot: [0, 0, 0, 1] as [number, number, number, number], scale: [1, 1, 1] as [number, number, number] };
    const at = (ts: (typeof shared)[]) => {
      const g = cells(boxes(geo));
      const pts = g.attrs.point;
      ts.forEach((t, i) => {
        pts.require("P").setTuple(i, t.P);
        pts.require("rot").setTuple(i, t.rot);
        pts.require("scale").setTuple(i, t.scale);
      });
      return g;
    };
    // One shared frame: the identity's answer, bit for bit.
    expect(boxes(await xform(at([shared, shared, shared]), params))).toEqual(boxes(await xform(geo, params)));
    // Each column on its own, on the THIRD cell, so the message names the first and the one that differs.
    for (const [col, t] of [
      ["P", { ...shared, P: [8, 0, -2] }],
      ["rot", { ...shared, rot: [0, Math.SQRT1_2, 0, Math.SQRT1_2] }],
      ["scale", { ...shared, scale: [1, 1, -1] }],
    ] as const) {
      const msg = await rejection(xform(at([shared, shared, t as typeof shared]), params));
      expect(msg).toMatch(new RegExp(`^transformBox: pivotIn "union" takes one bounding box of every chosen cell, but cells 0 and 2 are in different frames — ${col} \\[`));
      expect(msg).toContain('pivotIn "cell"');
      // Left out by `where`, the odd cell is not counted, and the rest cooks.
      await xform(at([shared, shared, t as typeof shared]), { ...params, where: f('lt(attribute("cell"), 2)') });
    }
    // Bit-identical means bits: +0 and -0 are two frames.
    expect(await rejection(xform(at([shared, { ...shared, P: [8, -0, -3] }, shared]), params))).toContain("cells 0 and 1 are in different frames — P [8, 0, -3] and [8, -0, -3]");
    // "cell" and "origin" pool nothing, so differing frames are not refused there.
    await xform(at([shared, { ...shared, P: [1, 2, 3] }, shared]), { ...params, pivotIn: "cell" });
    await xform(at([shared, { ...shared, P: [1, 2, 3] }, shared]), { ...params, pivotIn: "origin" });
  });

  it("lattice to world, the brick house's map: x and z centred on the lot, y scaled 0.4 — byte for byte the setBounds it replaces", async () => {
    // Integer lattice boxes (studs across, plates up) with a per-cell lot.
    const rng = new Pcg32(7);
    const list: Box[] = [];
    const lots: number[][] = [];
    for (let i = 0; i < 400; i++) {
      const lo = [Math.floor(rng.nextF32() * 40), Math.floor(rng.nextF32() * 160) - 1, Math.floor(rng.nextF32() * 40)];
      list.push([lo, lo.map((v) => v + Math.floor(rng.nextF32() * 9))]);
      lots.push([2 * Math.floor(rng.nextF32() * 20) + 6, 0, 2 * Math.floor(rng.nextF32() * 20) + 6]);
    }
    const geo = cells(list);
    vecAttr(geo, "lot", lots);
    const hand = await bounds(geo, {
      boundsMin: f('vec(box("x0") - component(attribute("lot", 3), 0) / 2, box("y0") * 0.4, box("z0") - component(attribute("lot", 3), 2) / 2)'),
      boundsMax: f('vec(box("x1") - component(attribute("lot", 3), 0) / 2, box("y1") * 0.4, box("z1") - component(attribute("lot", 3), 2) / 2)'),
    });
    const node = await xform(geo, { scale: [1, 0.4, 1], translate: f('mul(attribute("lot", 3), [-0.5, 0, -0.5])') });
    expect(bytes(node)).toEqual(bytes(hand));
    // A control: the scale one f32 step off is not the same bytes.
    const off = await xform(geo, { scale: [1, 0.40000004, 1], translate: f('mul(attribute("lot", 3), [-0.5, 0, -0.5])') });
    expect(bytes(off)).not.toEqual(bytes(hand));
  });
});

// ---------------------------------------------------------------------------

describe("transformBox: against the oracle", () => {
  for (const pivotIn of ["origin", "cell", "union"] as const) {
    it(`pivotIn "${pivotIn}": 128 random boxes, per-cell field scale, pivot and translate, a quarter left out`, async () => {
      const rng = new Pcg32((pivotIn === "origin" ? "world".length : pivotIn.length) * 31 + 5);
      const list: Box[] = [];
      const s: number[][] = [];
      const pv: number[][] = [];
      const t: number[][] = [];
      const chosen: boolean[] = [];
      for (let i = 0; i < 128; i++) {
        const lo = [dyadic(rng, 16), dyadic(rng, 16), dyadic(rng, 16)];
        list.push([lo, lo.map((v) => v + Math.abs(dyadic(rng, 8)))]);
        // Scales on a 1/4 grid in [-2, 2], zero and negatives included.
        s.push([0, 1, 2].map(() => Math.round((rng.nextF32() * 4 - 2) * 4) / 4));
        pv.push([0, 1, 2].map(() => (pivotIn === "origin" ? dyadic(rng, 16) : Math.round(rng.nextF32() * 8) / 8)));
        t.push([dyadic(rng, 4), dyadic(rng, 4), dyadic(rng, 4)]);
        chosen.push(rng.nextF32() >= 0.25);
      }
      const geo = cells(list);
      vecAttr(geo, "s", s);
      vecAttr(geo, "pv", pv);
      vecAttr(geo, "t", t);
      geo.attrs.point.add("pick", "f32", 1, 0);
      chosen.forEach((c, i) => geo.attrs.point.require("pick").set(i, c ? 1 : 0));
      const got = boxes(
        await xform(geo, {
          scale: f('attribute("s", 3)'),
          pivot: f('attribute("pv", 3)'),
          translate: f('attribute("t", 3)'),
          pivotIn,
          where: f('attribute("pick")'),
        }),
      );
      expect(got).toEqual(oracle(list, s, pv, t, pivotIn, chosen));
    });
  }

  it("plain params equal the same values as fields; a scalar field broadcasts to all three axes", async () => {
    const geo = cells([
      [[1, 2, 3], [5, 6, 7]],
      [[-4, 0, 2], [0, 8, 4]],
    ]);
    const plain = boxes(await xform(geo, { scale: [0.5, 0.5, 0.5], pivot: [0.5, 0.5, 0.5], pivotIn: "cell", translate: [1, 1, 1] }));
    const field = boxes(await xform(geo, { scale: f("constant(0.5)"), pivot: f("constant(0.5)"), pivotIn: "cell", translate: f("constant(1)") }));
    expect(field).toEqual(plain);
    expect(plain).toEqual([
      [[3, 4, 5], [5, 6, 7]],
      [[-2, 3, 3.5], [0, 7, 4.5]],
    ]);
  });

  it("a field reads the box as it ARRIVED: scale each box's height to 1 about its floor", async () => {
    const geo = cells([
      [[0, 2, 0], [1, 6, 1]],
      [[0, -3, 0], [1, 5, 1]],
    ]);
    const got = boxes(await xform(geo, { scale: f('vec(1, 1 / box("sy"), 1)'), pivot: [0, 0, 0], pivotIn: "cell" }));
    expect(got).toEqual([
      [[0, 2, 0], [1, 3, 1]],
      [[0, -3, 0], [1, -2, 1]],
    ]);
  });
});

// ---------------------------------------------------------------------------

describe("transformBox: nothing else changes", () => {
  it("P, rot, scale, seeds, attributes, topology carried; a ROTATED cell transforms in its own (local) box, blind to its transform; the input is not written", async () => {
    const make = (rotated: boolean): Geometry => {
      const line = createPolyline([0, 0, 0, 1, 2, 3, 4, 5, 6]);
      const pts = line.attrs.point;
      for (const name of ["boundsMin", "boundsMax", "scale"]) if (!pts.get(name)) pts.add(name, "f32", 3, name === "scale" ? [1, 1, 1] : [0, 0, 0]);
      if (!pts.get("rot")) pts.add("rot", "f32", 4, [0, 0, 0, 1]);
      pts.require("boundsMax").setTuple(1, [2, 2, 2]);
      if (rotated) {
        pts.require("rot").setTuple(1, [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
        pts.require("scale").setTuple(1, [2, 3, 4]);
      }
      pts.add("tag", "string", 1, "").setString(2, "kept");
      return line;
    };
    const line = make(true);
    const out = await xform(line, { scale: [2, 1, 1], translate: [1, 0, 0] });
    const strip = (s: Record<string, unknown>) =>
      JSON.stringify(s, (k, v: unknown) =>
        k === "attrs" ? (v as { name: string }[]).filter((x) => x.name !== "boundsMin" && x.name !== "boundsMax") : v,
      );
    expect(strip(snapshotGeometry(out))).toBe(strip(snapshotGeometry(line)));
    expect(boxes(out)[1]).toEqual([[1, 0, 0], [5, 2, 2]]);
    expect(boxes(await xform(make(false), { scale: [2, 1, 1], translate: [1, 0, 0] }))).toEqual(boxes(out));
    expect(boxes(line)[1]).toEqual([[0, 0, 0], [2, 2, 2]]);
  });

  it("where leaves chosen cells exactly as they arrived — an inside-out cell left out is not refused", async () => {
    const geo = cells([
      [[0, 0, 0], [1, 1, 1]],
      [[5, 0, 0], [4, 1, 1]], // inside out along x
    ]);
    const got = boxes(await xform(geo, { scale: [3, 3, 3], where: f('eq(attribute("cell"), 0)') }));
    expect(got).toEqual([
      [[0, 0, 0], [3, 3, 3]],
      [[5, 0, 0], [4, 1, 1]],
    ]);
    expect(boxes(await xform(geo, { scale: [3, 3, 3], where: 0 }))).toEqual(boxes(geo));
  });

  it("a -0 face is written +0: one computed as -0, one that underflows f32 to -0, and one that arrived as -0", async () => {
    // y: (-1 - (-0)) * 0 + (-0) + (-0) is -0 in f64 before the write.
    const geo = cells([[[-0, -1, -1e-30], [1, 1, 1]]]);
    const out = await xform(geo, { scale: [1, 0, 1e-20], pivot: [0, -0, 0], translate: [0, -0, 0] });
    const lo = Array.from(out.attrs.point.require("boundsMin").data.slice(0, 3));
    expect(lo.map((v) => Object.is(v, -0))).toEqual([false, false, false]);
    expect(lo).toEqual([0, 0, 0]);
  });

  it("a face on the pivot does not move, at fraction 1 as at 0, whatever the box's span", async () => {
    const geo = cells([[[-1e30, -1e10, 0], [1e-30, 1e-10, 1]]]);
    const hiPivot = boxes(await xform(geo, { scale: [2, 2, 1], pivot: [1, 1, 0], pivotIn: "cell" }))[0];
    expect(hiPivot[1].slice(0, 2)).toEqual([Math.fround(1e-30), Math.fround(1e-10)]);
    const union = boxes(await xform(geo, { scale: [2, 2, 1], pivot: [1, 1, 0], pivotIn: "union" }))[0];
    expect(union[1].slice(0, 2)).toEqual([Math.fround(1e-30), Math.fround(1e-10)]);
    const loPivot = boxes(await xform(geo, { scale: [0.5, 0.5, 1], pivot: [0, 0, 0], pivotIn: "cell" }))[0];
    expect(loPivot[0].slice(0, 2)).toEqual([Math.fround(-1e30), Math.fround(-1e10)]);
  });
});

// ---------------------------------------------------------------------------

describe("transformBox: refusals", () => {
  const one = (): Geometry => cells([[[0, 0, 0], [4, 4, 4]]]);

  it('a graph FILE with the old word "world" is refused on load, naming the rename and the fix', () => {
    const doc = {
      formatVersion: 1,
      seed: 1,
      nodes: [
        { id: "grid", type: "pointGrid", params: {} },
        { id: "move", type: "transformBox", params: { pivotIn: "world" } },
      ],
      connections: [{ from: ["grid", "out"], to: ["move", "in"] }],
      outputs: [{ id: "move", pin: "out", name: "out" }],
    };
    expect(() => deserializeGraph(doc as never)).toThrow(/node "move" param "pivotIn": "world" was renamed "origin" — a cell's box is an extent in its point's OWN frame.*; write "origin" \(expected one of "origin", "cell", "union"\)/);
  });

  it('refuses the old word "world", stating the rename to "origin"', async () => {
    const msg = await rejection(xform(one(), { pivotIn: "world" }));
    expect(msg).toMatch(/^transformBox: param "pivotIn" is "world", which was renamed "origin" — a cell's box is an extent in its point's OWN frame/);
    expect(msg).toContain('Write "origin" (the default)');
  });

  it("refuses an unknown pivotIn, naming the valid ones and what each means", async () => {
    expect(await rejection(xform(one(), { pivotIn: "centre" }))).toBe(
      'transformBox: param "pivotIn" is "centre"; valid: origin, cell, union — "origin" reads pivot as a point in the boxes\' own coordinates, "cell" as a 0..1 fraction of each cell\'s own box ([0.5, 0.5, 0.5] is its centre), "union" as the same fraction of the bounding box of every cell transformed.',
    );
  });

  it("refuses non-finite plain params and fields, naming the param", async () => {
    expect(await rejection(xform(one(), { scale: [1, Number.NaN, 1] }))).toContain('param "scale" (component 1) is NaN');
    expect(await rejection(xform(one(), { pivot: [Number.POSITIVE_INFINITY, 0, 0] }))).toContain('param "pivot"');
    expect(await rejection(xform(one(), { translate: f("1 / 0") }))).toContain("translate");
    expect(await rejection(xform(one(), { where: Number.NaN }))).toContain('param "where"');
  });

  it("refuses a plain value f32 cannot hold, rather than using Infinity or 0 in its place", async () => {
    expect(await rejection(xform(one(), { scale: [1e39, 1, 1] }))).toBe(
      'transformBox: param "scale" component 0 (x) is 1e+39, which f32 — the precision every box and param is stored in — holds as Infinity. Use a value between about 1.2e-38 and 3.4e38 in magnitude, or 0.',
    );
    expect(await rejection(xform(one(), { scale: [1, 1e-46, 1] }))).toContain('param "scale" component 1 (y) is 1e-46, which f32');
    expect(await rejection(xform(one(), { translate: [0, 0, -1e40] }))).toContain('param "translate" component 2 (z)');
  });

  it("refuses a vec field of the wrong width, and a where field that is not a scalar", async () => {
    expect(await rejection(xform(one(), { scale: f("vec(1, 2)") }))).toContain('transformBox: param "scale" must evaluate to three components');
    expect(await rejection(xform(one(), { pivot: f("vec(1, 2)") }))).toContain('param "pivot" must evaluate to three components');
    expect(await rejection(xform(one(), { where: f('attribute("boundsMin")') }))).toContain('param "where" must evaluate to ONE number');
  });

  it("refuses a missing or mistyped bounds column", async () => {
    const geo = one();
    geo.attrs.point.remove("boundsMax");
    expect(await rejection(xform(geo))).toContain('transformBox: the input on pin "in" has no "boundsMax" point attribute');
    const typed = one();
    typed.attrs.point.remove("boundsMin");
    typed.attrs.point.add("boundsMin", "f32", 2, [0, 0]);
    expect(await rejection(xform(typed))).toContain('has "boundsMin" as f32 tupleSize 2');
  });

  it("refuses a box that is not finite or arrived inside out, naming the cell, the axis and the way out", async () => {
    const bad = cells([
      [[0, 0, 0], [1, 1, 1]],
      [[0, 0, Number.NEGATIVE_INFINITY], [1, 1, 1]],
    ]);
    const msg = await rejection(xform(bad));
    expect(msg).toContain("transformBox: cell 1's box is not finite along z");
    expect(msg).toContain('leave the cell out with "where"');
    const inside = cells([[[0, 3, 0], [1, 2, 1]]]);
    expect(await rejection(xform(inside, { pivotIn: "union" }))).toContain("cell 0's box ARRIVED inside out along y — boundsMin 3 is above boundsMax 2");
  });

  it("refuses a result past what f32 bounds hold, naming the cell and the numbers", async () => {
    const big = cells([[[0, 0, 0], [3e38, 1, 1]]]);
    const msg = await rejection(xform(big, { scale: [2, 1, 1] }));
    expect(msg).toContain("transformBox: cell 0's box along x is transformed past what f32 bounds hold");
    expect(msg).toContain("scaled by 2 about 0 and moved 0");
  });
});

// ---------------------------------------------------------------------------

describe("transformBox: determinism and JSON", () => {
  function build(order: "forward" | "reverse"): Graph {
    const g = new Graph(31);
    const add = {
      grid: () => g.add(pointGrid, { countX: 3, countY: 1, countZ: 2, spacing: [10, 10, 10] }, "grid"),
      box: () =>
        g.add(
          setBounds,
          {
            boundsMin: fieldFromJson({ fn: "position" }),
            boundsMax: fieldFromJson({ fn: "add", args: [{ fn: "position" }, [8, 6, 4]] }),
          },
          "box",
        ),
      // The corners above are WORLD corners built from P; "union" pools
      // corners, so the cells must share one frame. Moving every P to the
      // origin keeps the corners' bytes and makes them that frame's.
      origin: () => g.add(setAttribute, { name: "P", type: "f32", tupleSize: 3, value: fieldFromJson({ fn: "vec", args: [0, 0, 0] }) }, "origin"),
      move: () =>
        g.add(
          transformBox,
          {
            scale: fieldFromJson(parseFieldText('vec(1 + randomField("s"), 0.4, 1)')),
            pivot: [0.5, 0, 0.5],
            pivotIn: "union",
            translate: fieldFromJson(parseFieldText('vec(0, randomField("t") * 2, 0)')),
          },
          "move",
        ),
      tint: () => g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
    };
    const ids = order === "forward" ? ["grid", "box", "origin", "move", "tint"] : ["tint", "move", "origin", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.origin, "in");
    g.connect(h.origin, "out", h.move, "in");
    g.connect(h.move, "out", h.tint, "in");
    g.output(h.tint, "out", "cells");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.cells);
    const b = firstGeo((await cook(build("forward"))).outputs.cells);
    const c = firstGeo((await cook(build("reverse"))).outputs.cells);
    expect(a.pointCount).toBe(6);
    expect(bytes(b)).toEqual(bytes(a));
    expect(bytes(c)).toEqual(bytes(a));
  });

  it("round-trips through the serialized format, field params included, and cooks the same", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.cells);
    const b = firstGeo((await cook(back)).outputs.cells);
    expect(bytes(b)).toEqual(bytes(a));
  });
});
