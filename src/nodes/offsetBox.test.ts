/**
 * `offsetBox`: every cell's box with each face moved out (or in) by a
 * signed offset, in world axes or in the face frame shellSplit writes.
 *
 * Expectations come from an ORACLE written here from the param
 * descriptions — the world reading of each margin, and the face frame read
 * from shellSplit's OWN up attributes (which the node does not read: it
 * derives up from along x up = out) — never recorded from a run.
 * Coordinates are dyadic wherever a sum is compared, so "exact" is exact.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { type DataCollection, Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
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
import { offsetBox } from "./offsetBox.js";
import { shellSplit } from "./shellSplit.js";
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

async function offset(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(offsetBox, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

async function shell(geo: Geometry, params: Record<string, unknown> = {}): Promise<Geometry> {
  const outputs = await runNode(shellSplit, params, { in: [makeGeometryItem(geo)] }, 1);
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
      // The read view's `buffer` is typed opaquely; the bytes are the same.
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

/** Any cooked value as bytes: typed arrays as base64, the per-cook `rev` dropped. */
function deepBytes(v: unknown): unknown {
  if (ArrayBuffer.isView(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
  if (v instanceof Geometry) return bytes(v);
  if (Array.isArray(v)) return v.map(deepBytes);
  if (v !== null && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) if (k !== "rev") o[k] = deepBytes((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}

function collectionBytes(c: DataCollection | undefined): unknown {
  return (c ?? []).map((item) => deepBytes(item));
}

// ---------------------------------------------------------------------------

describe("offsetBox: world frame", () => {
  it("moves each face by margin + its side's own, against an oracle over random boxes and offsets", async () => {
    const rng = new Pcg32(7);
    const list: Box[] = [];
    for (let i = 0; i < 64; i++) {
      const lo = [dyadic(rng, 50), dyadic(rng, 50), dyadic(rng, 50)];
      list.push([lo, lo.map((v) => v + Math.abs(dyadic(rng, 20)) + 8)]);
    }
    for (let t = 0; t < 8; t++) {
      const m = [dyadic(rng, 2), dyadic(rng, 2), dyadic(rng, 2)];
      const mn = [dyadic(rng, 2), dyadic(rng, 2), dyadic(rng, 2)];
      const mx = [dyadic(rng, 2), dyadic(rng, 2), dyadic(rng, 2)];
      const got = boxes(await offset(cells(list), { margin: m, marginMin: mn, marginMax: mx }));
      expect(got).toEqual(list.map(([lo, hi]) => [lo.map((v, k) => v - (m[k] + mn[k])), hi.map((v, k) => v + (m[k] + mx[k]))]));
    }
  });

  it("margin is the uniform shorthand: pads all round, insets when negative; a scalar field broadcasts; min and max shift", async () => {
    const geo = cells([[[0, 0, 0], [4, 2, 8]]]);
    expect(boxes(await offset(geo, { margin: [1, 1, 1] }))).toEqual([[[-1, -1, -1], [5, 3, 9]]]);
    expect(boxes(await offset(geo, { margin: [-0.5, -0.5, -0.5] }))).toEqual([[[0.5, 0.5, 0.5], [3.5, 1.5, 7.5]]]);
    expect(boxes(await offset(geo, { margin: f("constant(0.25)") }))).toEqual([[[-0.25, -0.25, -0.25], [4.25, 2.25, 8.25]]]);
    expect(boxes(await offset(geo, { marginMin: [-3, 0, 0], marginMax: [3, 0, 0] }))).toEqual([[[3, 0, 0], [7, 2, 8]]]);
    expect(boxes(await offset(geo))).toEqual([[[0, 0, 0], [4, 2, 8]]]);
  });

  it("a field reads the box as it ARRIVED, per point: the top put at y = 1 and the floor under it", async () => {
    const geo = cells([
      [[0, 1, 0], [6, 139, 4]],
      [[2, -5, 2], [4, 40, 8]],
    ]);
    const got = boxes(await offset(geo, { marginMin: [0, 1, 0], marginMax: f('vec(0, 1 - box("y1"), 0)') }));
    expect(got).toEqual([
      [[0, 0, 0], [6, 1, 4]],
      [[2, -6, 2], [4, 1, 8]],
    ]);
  });

  it("changes nothing but the box: P, rot, scale, seeds, attributes, topology carried; a ROTATED cell offsets as an unrotated one", async () => {
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
    const out = await offset(line, { margin: [1, 0, 0] });
    const strip = (s: Record<string, unknown>) =>
      JSON.stringify(s, (k, v: unknown) =>
        k === "attrs" ? (v as { name: string }[]).filter((x) => x.name !== "boundsMin" && x.name !== "boundsMax") : v,
      );
    expect(strip(snapshotGeometry(out))).toBe(strip(snapshotGeometry(line)));
    expect(boxes(out)[1]).toEqual([[-1, 0, 0], [3, 2, 2]]);
    expect(boxes(await offset(make(false), { margin: [1, 0, 0] }))).toEqual(boxes(out));
    expect(boxes(line)[1]).toEqual([[0, 0, 0], [2, 2, 2]]); // the input is not written
  });

  it("where leaves chosen cells exactly as they arrived — no offset, no snap, no check", async () => {
    const geo = cells([
      [[0, 0, 0], [1, 1, 1]],
      [[0.25, 0, 0], [4, 1, 1]],
    ]);
    // Cell 0 would collapse under margin -1; it is left out.
    const got = boxes(await offset(geo, { margin: [-1, 0, 0], snap: [1, 0, 0], snapMode: "out", where: f('attribute("cell")') }));
    expect(got).toEqual([
      [[0, 0, 0], [1, 1, 1]],
      [[1, 0, 0], [3, 1, 1]],
    ]);
    expect(boxes(await offset(geo, { margin: [5, 5, 5], where: 0 }))).toEqual(boxes(geo));
  });
});

// ---------------------------------------------------------------------------

/** One mass box broken into all six shell faces (shellSplit's default names, up attributes included). */
async function sixFaces(): Promise<Geometry> {
  return shell(cells([[[0, 0, 0], [8, 6, 4]]]), { labels: ["floor", "wall", "wall", "wall", "wall", "ceiling"] });
}

/**
 * The face-frame oracle, from shellSplit's OWN six frame attributes: along
 * (axis, sign), up (axis, sign), out (axis, sign of the normal). The node
 * reads only along and the normal, and derives up.
 */
function faceOracle(geo: Geometry, m: number[], mn: number[], mx: number[]): Box[] {
  const along = col(geo, "alongAxis");
  const alongS = col(geo, "alongSign");
  const up = col(geo, "upAxis");
  const upS = col(geo, "upSign");
  const outA = col(geo, "outAxis");
  const outward = col(geo, "outward");
  return boxes(geo).map(([lo, hi], i) => {
    const l = lo.slice();
    const h = hi.slice();
    const frame = [
      [along[i], alongS[i]],
      [up[i], upS[i]],
      [outA[i], Math.sign(outward[i * 3 + outA[i]])],
    ];
    frame.forEach(([axis, sign], c) => {
      const from = m[c] + mn[c];
      const to = m[c] + mx[c];
      if (sign > 0) {
        l[axis] -= from;
        h[axis] += to;
      } else {
        l[axis] -= to;
        h[axis] += from;
      }
    });
    return [l, h];
  });
}

describe("offsetBox: face frame", () => {
  it("marginMax [0, 0, 1] pushes the OUTER face out on all six faces — the brick house's sill expression, exactly", async () => {
    const pieces = await sixFaces();
    expect(pieces.pointCount).toBe(6);
    const got = boxes(await offset(pieces, { frame: "face", marginMax: [0, 0, 1] }));
    const outward = col(pieces, "outward");
    // box("lo") + min(outward, 0) * 1 and box("hi") + max(outward, 0) * 1
    const want = boxes(pieces).map(([lo, hi], i) => [
      lo.map((v, k) => v + Math.min(outward[i * 3 + k], 0)),
      hi.map((v, k) => v + Math.max(outward[i * 3 + k], 0)),
    ]);
    expect(got).toEqual(want);
    // and marginMin [0, 0, 1] moves the INNER face in, the other way
    const inner = boxes(await offset(pieces, { frame: "face", marginMin: [0, 0, -0.5] }));
    inner.forEach(([lo, hi], i) => {
      const [l0, h0] = boxes(pieces)[i];
      for (let k = 0; k < 3; k++) {
        const o = outward[i * 3 + k];
        expect(lo[k]).toBe(o > 0 ? l0[k] + 0.5 : l0[k]);
        expect(hi[k]).toBe(o < 0 ? h0[k] - 0.5 : h0[k]);
      }
    });
  });

  it("every component on every face against the oracle built from shellSplit's own up attributes", async () => {
    const pieces = await sixFaces();
    const rng = new Pcg32(3);
    for (let t = 0; t < 24; t++) {
      // Small enough never to cross a 1-thick face.
      const m = [dyadic(rng, 0.25), dyadic(rng, 0.25), dyadic(rng, 0.25)];
      const mn = [dyadic(rng, 0.25), dyadic(rng, 0.25), dyadic(rng, 0.25)];
      const mx = [dyadic(rng, 0.25), dyadic(rng, 0.25), dyadic(rng, 0.25)];
      const got = boxes(await offset(pieces, { frame: "face", margin: m, marginMin: mn, marginMax: mx }));
      expect(got).toEqual(faceOracle(pieces, m, mn, mx));
    }
  });

  it("along's min side is the LEFT end seen from outside, up's the bottom, on every wall", async () => {
    const pieces = await sixFaces();
    const face = col(pieces, "face");
    const got = boxes(await offset(pieces, { frame: "face", marginMin: [1, 0, 0], marginMax: [0, 2, 0] }));
    const before = boxes(pieces);
    face.forEach((code, i) => {
      const [l, h] = got[i];
      const [l0, h0] = before[i];
      // The left end, seen from outside: +x on south, -x on north, -z on west, +z on east.
      if (code === 1) expect([h[0] - h0[0], l0[0] - l[0]]).toEqual([1, 0]);
      if (code === 2) expect([l0[0] - l[0], h[0] - h0[0]]).toEqual([1, 0]);
      if (code === 3) expect([l0[2] - l[2], h[2] - h0[2]]).toEqual([1, 0]);
      if (code === 4) expect([h[2] - h0[2], l0[2] - l[2]]).toEqual([1, 0]);
      // On a wall the top rises 2.
      if (code >= 1 && code <= 4) expect([h[1] - h0[1], l0[1] - l[1]]).toEqual([2, 0]);
    });
  });

  it("reads renamed frame attributes, and is the world reading under frame \"world\" whatever they hold", async () => {
    const pieces = await sixFaces();
    const geo = await shell(cells([[[0, 0, 0], [8, 6, 4]]]), {
      alongAxisAttr: "aA",
      alongSignAttr: "aS",
      outwardAttr: "nrm",
    });
    const renamed = boxes(
      await offset(geo, { frame: "face", alongAxisAttr: "aA", alongSignAttr: "aS", outwardAttr: "nrm", marginMax: [0.5, 0.25, 1] }),
    );
    expect(renamed).toEqual(boxes(await offset(pieces, { frame: "face", marginMax: [0.5, 0.25, 1] })));
    const world = boxes(await offset(pieces, { marginMax: [0, 0, 1] }));
    expect(world).toEqual(boxes(pieces).map(([lo, hi]) => [lo, [hi[0], hi[1], hi[2] + 1]]));
  });

  it("a field margin in the face frame is resolved per piece", async () => {
    const pieces = await sixFaces();
    const got = boxes(await offset(pieces, { frame: "face", marginMax: f('vec(0, 0, attribute("face") * 0.5)') }));
    const face = col(pieces, "face");
    const outward = col(pieces, "outward");
    expect(got).toEqual(
      boxes(pieces).map(([lo, hi], i) => [
        lo.map((v, k) => v + Math.min(outward[i * 3 + k], 0) * face[i] * 0.5),
        hi.map((v, k) => v + Math.max(outward[i * 3 + k], 0) * face[i] * 0.5),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------

describe("offsetBox: snap", () => {
  const F = Math.fround;

  it('snapTo "lattice": out grows onto the absolute lattice, in shrinks, round goes to the nearest line', async () => {
    const geo = cells([[[0.25, 0.2, 0.1], [2.5, 1.5, 0.9]]]);
    const snap = [1, 0.4, 0];
    expect(boxes(await offset(geo, { snap, snapMode: "out" }))).toEqual([[[0, 0, F(0.1)], [3, F(1.6), F(0.9)]]]);
    expect(boxes(await offset(geo, { snap, snapMode: "in" }))).toEqual([[[1, F(0.4), F(0.1)], [2, F(1.2), F(0.9)]]]);
    // 0.2 (stored 0.2000000030) is just over half a 0.4 step, and 2.5 is a half: both round up.
    expect(boxes(await offset(geo, { snap, snapMode: "round" }))).toEqual([[[0, F(0.4), F(0.1)], [3, F(1.6), F(0.9)]]]);
    // A negative lattice coordinate floors away from 0 under "out".
    expect(boxes(await offset(cells([[[-0.5, 0, 0], [0.5, 1, 1]]]), { snap: [1, 0, 0], snapMode: "out" }))).toEqual([[[-1, 0, 0], [1, 1, 1]]]);
    // The default is "round", a half rounding up: -0.5 goes to 0, 0.5 to 1.
    expect(boxes(await offset(cells([[[-0.5, 0, 0], [0.5, 1, 1]]]), { snap: [1, 0, 0] }))).toEqual([[[0, 0, 0], [1, 1, 1]]]);
    // "floor" and "ceil" move both faces the same way down / up the world axis.
    expect(boxes(await offset(geo, { snap, snapMode: "floor" }))).toEqual([[[0, 0, F(0.1)], [2, F(1.2), F(0.9)]]]);
    expect(boxes(await offset(geo, { snap, snapMode: "ceil" }))).toEqual([[[1, F(0.4), F(0.1)], [3, F(1.6), F(0.9)]]]);
  });

  it("a face within f32 precision of a line is ON it: 1.2 stays on a 0.4 lattice under out", async () => {
    const geo = cells([[[0, 0, 0], [1, 1.2, 1]]]);
    expect(boxes(await offset(geo, { snap: [0, 0.4, 0], snapMode: "out" }))).toEqual([[[0, 0, 0], [1, F(1.2), 1]]]);
    expect(boxes(await offset(geo, { snap: [0, 0.4, 0], snapMode: "in" }))).toEqual([[[0, 0, 0], [1, F(1.2), 1]]]);
  });

  it('snapTo "size": the size made a whole number of steps, the centre kept', async () => {
    const geo = cells([[[0, 0, 0], [10, 1, 3]]]);
    const p = { snap: [4, 0, 0], snapTo: "size" };
    expect(boxes(await offset(geo, { ...p, snapMode: "out" }))).toEqual([[[-1, 0, 0], [11, 1, 3]]]);
    expect(boxes(await offset(geo, { ...p, snapMode: "in" }))).toEqual([[[1, 0, 0], [9, 1, 3]]]);
    expect(boxes(await offset(geo, { ...p, snapMode: "round" }))).toEqual([[[-1, 0, 0], [11, 1, 3]]]);
    // A size already whole is left alone, wherever the box stands.
    expect(boxes(await offset(cells([[[3, 0, 0], [11, 1, 1]]]), p))).toEqual([[[3, 0, 0], [11, 1, 1]]]);
  });

  it("the baseplate: a lot padded 2 each way, made a multiple of 8 and centred, is the house's formula for every lot", async () => {
    const list: Box[] = [];
    for (let w = 2; w <= 40; w += 2) for (let d = 2; d <= 24; d += 2) list.push([[0, 1, 0], [w, 139, d]]);
    const got = boxes(
      await offset(cells(list), {
        margin: [2, 0, 2],
        marginMin: [0, 1, 0],
        marginMax: f('vec(0, 1 - box("y1"), 0)'),
        snap: [8, 0, 8],
        snapTo: "size",
        snapMode: "out",
      }),
    );
    const half = (v: number) => 4 * Math.floor((v + 11) / 8);
    expect(got).toEqual(list.map(([, [w, , d]]) => [[w / 2 - half(w), 0, d / 2 - half(d)], [w / 2 + half(w), 1, d / 2 + half(d)]]));
  });
});

// ---------------------------------------------------------------------------

describe("offsetBox: collapse (fit)", () => {
  const box4 = (): Geometry => cells([[[0, 0, 0], [4, 1, 1]]]);

  it('"error" refuses an inset past the box, naming the cell, axis, faces and the ways out', async () => {
    const msg = await rejection(offset(box4(), { margin: [-3, 0, 0] }));
    expect(msg).toContain("offsetBox: cell 0's box COLLAPSES along x");
    expect(msg).toContain("from 0 to 3");
    expect(msg).toContain("from 4 to 1");
    expect(msg).toContain('"scale"');
    expect(msg).toContain('"allow"');
    // In the face frame it names the frame's faces.
    const pieces = await sixFaces();
    const faceMsg = await rejection(offset(pieces, { frame: "face", marginMax: [0, 0, -2] }));
    expect(faceMsg).toMatch(/COLLAPSES along y — its outer out \(y0\) face .* inner out \(y1\) face/);
  });

  it('"scale" shrinks the inward moves in proportion until the faces meet; a face that moved out keeps its place', async () => {
    const run = async (mn: number, mx: number) => boxes(await offset(box4(), { marginMin: [mn, 0, 0], marginMax: [mx, 0, 0], fit: "scale" }))[0];
    expect(await run(-3, -3)).toEqual([[2, 0, 0], [2, 1, 1]]); // symmetric: the centre
    expect(await run(-6, -2)).toEqual([[3, 0, 0], [3, 1, 1]]); // 6 : 2, halved to 3 : 1
    expect(await run(0, -6)).toEqual([[0, 0, 0], [0, 1, 1]]); // one-sided: stops on the far face
    expect(await run(1, -7)).toEqual([[-1, 0, 0], [-1, 1, 1]]); // the min face moved OUT and stays
  });

  it("an inward snap with no whole step inside collapses too, and scale meets it", async () => {
    const geo = cells([[[0.25, 0, 0], [0.75, 1, 1]]]);
    const msg = await rejection(offset(geo, { snap: [1, 0, 0], snapMode: "in" }));
    expect(msg).toContain("(after the snap)");
    expect(msg).toContain("the inward moves, the snap's included, are more than the box (0.5) holds");
    expect(boxes(await offset(geo, { snap: [1, 0, 0], snapMode: "in", fit: "scale" }))).toEqual([[[0.5, 0, 0], [0.5, 1, 1]]]);
  });

  it('after a lattice snap "in", "scale" meets at the PROPORTION of the inward moves, not on a lattice line: [0.1, 0.9] step 1 meets at 0.5', async () => {
    // In: 0.1 -> 1 and 0.9 -> 0, crossing by 1; the inward moves are 0.9 and
    // 0.9 (to f32), so the faces meet halfway, at 0.5, which is no line of a
    // step-1 lattice. Documented in the fit description; pinned here.
    const geo = cells([[[0.1, 0, 0], [0.9, 1, 1]]]);
    expect(boxes(await offset(geo, { snap: [1, 0, 0], snapMode: "in", fit: "scale" }))).toEqual([[[0.5, 0, 0], [0.5, 1, 1]]]);
    expect(await rejection(offset(geo, { snap: [1, 0, 0], snapMode: "in" }))).toContain("(after the snap)");
  });

  it('snapTo "size" with snapMode "in" and no whole step in the box gives a box of no volume at its centre, and no refusal', async () => {
    const out = await offset(cells([[[0, 0, 0], [10, 1, 1]]]), { snap: [16, 0, 0], snapTo: "size", snapMode: "in" });
    expect(boxes(out)).toEqual([[[5, 0, 0], [5, 1, 1]]]);
  });

  it("faces crossing by no more than f32 precision MEET, on one stored number, under error", async () => {
    // 0.1 and 0.7 stored in f32, inset by an f32 0.3: the faces cross by ~4e-8.
    const [lo, hi] = boxes(await offset(cells([[[0.1, 0, 0], [0.7, 1, 1]]]), { margin: [-0.3, 0, 0] }))[0];
    expect(lo[0]).toBe(hi[0]);
    expect(Math.abs(lo[0] - 0.4)).toBeLessThan(1e-6);
  });

  it("the meeting tolerance is two f32 ulps at the faces' coordinates, not a share of the offsets: a large shift that crosses is refused", async () => {
    // Box [0, 1] shifted by ~1000 with a 5e-4 crossing: past two f32 ulps
    // at 1000 (1.2e-4), so it is a collapse, not rounding.
    const msg = await rejection(offset(cells([[[0, 0, 0], [1, 1, 1]]]), { marginMin: [-1000, 0, 0], marginMax: [998.9995, 0, 0] }));
    expect(msg).toContain("COLLAPSES along x");
    expect(msg).toContain("the inset is larger than the box (1)");
  });

  it("...nor a share of the SPAN: a box 1e6 wide inset half a unit past collapse is refused, a crossing of one ulp there meets", async () => {
    // [0, 1e6] inset 5e5 + 0.25 a side: the faces cross by 0.5, sixteen f32
    // ulps at 5e5 (ulp 2^-5). A millionth of the span (1) would have met it.
    const wide = (): Geometry => cells([[[0, 0, 0], [1e6, 1, 1]]]);
    const msg = await rejection(offset(wide(), { margin: [-(5e5 + 0.25), 0, 0] }));
    expect(msg).toContain("offsetBox: cell 0's box COLLAPSES along x");
    expect(msg).toContain("crossing by 0.5");
    // One ulp: the min face to 500000.03125, the max face to 500000.
    const ulp = 2 ** -5;
    const [lo, hi] = boxes(await offset(wide(), { marginMin: [-(5e5 + ulp), 0, 0], marginMax: [-5e5, 0, 0] }))[0];
    expect(lo[0]).toBe(hi[0]);
    expect(lo[0] >= 5e5 && lo[0] <= 5e5 + ulp).toBe(true);
  });

  it("insets that meet in decimals meet: half an f32 ulp of each inward move is allowed, as shellSplit allows its thicknesses", async () => {
    // [-1084.5, 10] inset 1084.8 and 9.7 meets at 0.3. In f32 the faces
    // cross by 4.9e-5: past two ulps at 0.3 (6e-8), within half an ulp of
    // 1084.8 (6.1e-5) plus half of 9.7 (4.8e-7).
    const [lo, hi] = boxes(await offset(cells([[[-1084.5, 0, 0], [10, 1, 1]]]), { marginMin: [-1084.8, 0, 0], marginMax: [-9.7, 0, 0] }))[0];
    expect(lo[0]).toBe(hi[0]);
    expect(Math.abs(lo[0] - 0.3)).toBeLessThan(1e-4);
    // Ten times that crossing is still a collapse.
    const msg = await rejection(offset(cells([[[-1084.5, 0, 0], [10, 1, 1]]]), { marginMin: [-1084.8005, 0, 0], marginMax: [-9.7, 0, 0] }));
    expect(msg).toContain("COLLAPSES along x");
  });

  it("an offset that overflows f32 bounds is refused, and a -0 face is written +0", async () => {
    expect(await rejection(offset(cells([[[0, 0, 0], [1, 1, 1]]]), { marginMax: [1e39, 0, 0] }))).toContain("offset past what f32 bounds hold");
    expect(await rejection(offset(cells([[[0, 0, 0], [1, 1, 1]]]), { margin: [-1e160, 0, 0], fit: "scale" }))).toContain(
      "offset past what f32 bounds hold",
    );
    const [lo] = boxes(await offset(cells([[[-0.5, 0, 0], [0.5, 1, 1]]]), { snap: [1, 0, 0], snapMode: "in" }))[0];
    expect(Object.is(lo[0], 0)).toBe(true);
  });

  it('"allow" writes the crossed box as computed, as setBounds would, and passes an inside-out input on', async () => {
    expect(boxes(await offset(box4(), { margin: [-3, 0, 0], fit: "allow" }))).toEqual([[[3, 0, 0], [1, 1, 1]]]);
    const inverted = cells([[[4, 0, 0], [0, 1, 1]]]);
    expect(boxes(await offset(inverted, { fit: "allow" }))).toEqual([[[4, 0, 0], [0, 1, 1]]]);
    expect(await rejection(offset(inverted))).toContain("ARRIVED inside out along x");
    expect(await rejection(offset(inverted, { fit: "scale" }))).toContain("ARRIVED inside out along x");
  });

  it("a box of zero size is kept: a point is never dropped", async () => {
    const out = await offset(
      cells([
        [[0, 0, 0], [2, 2, 2]],
        [[5, 5, 5], [6, 6, 6]],
      ]),
      { margin: [-1, -1, -1], fit: "scale" },
    );
    expect(boxes(out)).toEqual([
      [[1, 1, 1], [1, 1, 1]],
      [[5.5, 5.5, 5.5], [5.5, 5.5, 5.5]],
    ]);
  });
});

// ---------------------------------------------------------------------------

describe("offsetBox: refusals", () => {
  const one = (): Geometry => cells([[[0, 0, 0], [4, 4, 4]]]);

  it("refuses unknown enum strings, naming the valid ones", async () => {
    expect(await rejection(offset(one(), { frame: "local" }))).toBe(
      'offsetBox: param "frame" is "local"; valid: world, face — "face" is the frame shellSplit writes (along, up, out), read from alongAxisAttr, alongSignAttr and outwardAttr.',
    );
    expect(await rejection(offset(one(), { fit: "squash" }))).toBe('offsetBox: param "fit" is "squash"; valid: error, scale, allow.');
    // A fit word of the other box nodes is refused naming why it means nothing here.
    const clip = await rejection(offset(one(), { fit: "clip" }));
    expect(clip).toContain('offsetBox: param "fit" is "clip"; valid: error, scale, allow. On the other box nodes "clip" cuts away what passes the limit');
    expect(clip).toContain("here faces move rather than being cut: a face's limit is the box's own other face");
    expect(clip).toContain('use "scale", which shrinks the inward moves in proportion until the faces meet');
    expect(await rejection(offset(one(), { fit: "clamp" }))).toContain("here a face offset has no cell to slide back into");
    expect(await rejection(offset(one(), { snapMode: "bogus" }))).toContain('offsetBox: param "snapMode" is "bogus"; valid: round, floor, ceil, out, in — ');
    expect(await rejection(offset(one(), { snapTo: "grid" }))).toBe('offsetBox: param "snapTo" is "grid"; valid: lattice, size.');
  });

  it("refuses a negative or non-finite snap step and non-finite offsets", async () => {
    expect(await rejection(offset(one(), { snap: [0, -1, 0] }))).toContain('param "snap" component 1 (y) is -1');
    expect(await rejection(offset(one(), { margin: [0, Number.NaN, 0] }))).toContain('param "margin" (component 1) is NaN');
    expect(await rejection(offset(one(), { marginMax: f("1 / 0") }))).toContain("marginMax");
    expect(await rejection(offset(one(), { where: Number.POSITIVE_INFINITY }))).toContain('param "where"');
  });

  it("refuses a margin field of the wrong width, and a where field that is not a scalar", async () => {
    expect(await rejection(offset(one(), { margin: f("vec(1, 2)") }))).toContain('param "margin" must evaluate to three components');
    expect(await rejection(offset(one(), { where: f('attribute("boundsMin")') }))).toContain('param "where" must evaluate to ONE number');
  });

  it("refuses a missing or mistyped bounds column, and a box that is not finite", async () => {
    const geo = one();
    geo.attrs.point.remove("boundsMax");
    expect(await rejection(offset(geo))).toContain('has no "boundsMax" point attribute');
    const bad = one();
    bad.attrs.point.require("boundsMin").setTuple(0, [Number.NEGATIVE_INFINITY, 0, 0]);
    expect(await rejection(offset(bad))).toContain("cell 0's box is not finite along x");
  });

  it("frame \"face\": a missing frame attribute is refused by name, with a suggestion — never a silent world reading", async () => {
    const msg = await rejection(offset(one(), { frame: "face", marginMax: [0, 0, 1] }));
    expect(msg).toContain('offsetBox: frame "face" reads each cell\'s frame from three point attributes');
    expect(msg).toContain('there is no "alongAxis" (param "alongAxisAttr", the along axis)');
    expect(msg).toContain('there is no "outward" (param "outwardAttr", the outward normal)');
    expect(msg).toContain('set frame to "world"');
    const pieces = await sixFaces();
    const typo = await rejection(offset(pieces, { frame: "face", outwardAttr: "outwards" }));
    expect(typo).toContain('did you mean "outward"?');
    expect(await rejection(offset(pieces, { frame: "face", alongSignAttr: "" }))).toContain('param "alongSignAttr" is "", so nothing names the along direction');
    expect(await rejection(offset(pieces, { frame: "face", outwardAttr: "alongAxis" }))).toContain(
      '"alongAxis" (param "outwardAttr", the outward normal) is i32 tupleSize 1, where shellSplit writes f32 tuple 3',
    );
  });

  it("frame \"face\": the interior (zero normal), a tilted normal, a passed-through cell and a degenerate frame are refused naming the cell", async () => {
    const room = await shell(cells([[[0, 0, 0], [8, 6, 4]]]), { interiorLabel: "room" });
    expect(await rejection(offset(room, { frame: "face" }))).toContain("cell 6's outward normal");
    expect(await rejection(offset(room, { frame: "face" }))).toContain("zero normal faces nowhere");
    // The interior left out with where, the rest offsets.
    expect((await offset(room, { frame: "face", where: f('lt(attribute("face"), 6)') })).pointCount).toBe(7);

    const passed = await shell(cells([[[0, 0, 0], [8, 6, 4]]]), { where: 0 });
    expect(await rejection(offset(passed, { frame: "face" }))).toContain("is -1 — what shellSplit leaves on a cell its `where` passed through");

    const hand = (along: number, sign: number, n: number[]): Geometry => {
      const g = one();
      g.attrs.point.add("alongAxis", "i32", 1, along);
      g.attrs.point.add("alongSign", "i32", 1, sign);
      g.attrs.point.add("outward", "f32", 3, n);
      return g;
    };
    expect(await rejection(offset(hand(0, 1, [0, 0.6, 0.8]), { frame: "face" }))).toContain("a tilted normal");
    expect(await rejection(offset(hand(2, 1, [0, 0, 1]), { frame: "face" }))).toContain("and both are z (2)");
    expect(await rejection(offset(hand(3, 1, [0, 0, 1]), { frame: "face" }))).toContain("to be 0 (x), 1 (y) or 2 (z), and it is 3");
    expect(await rejection(offset(hand(0, 0, [0, 0, 1]), { frame: "face" }))).toContain("to be +1 or -1, and it is 0");
    // A hand-written frame that IS one works: along -x, out +z, so up (out x along) is -y.
    expect(boxes(await offset(hand(0, -1, [0, 0, 1]), { frame: "face", marginMax: [0, 1, 0] }))).toEqual([[[0, -1, 0], [4, 4, 4]]]);
  });
});

// ---------------------------------------------------------------------------

describe("offsetBox: determinism and JSON", () => {
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
      shell: () => g.add(shellSplit, {}, "shell"),
      pad: () =>
        g.add(
          offsetBox,
          {
            frame: "face",
            margin: fieldFromJson(parseFieldText('vec(0, 0, randomField("pad") * 0.25)')),
            marginMax: fieldFromJson(parseFieldText('vec(0, 0, 1 + 0.5 * attribute("face"))')),
            snap: [0.5, 0, 0.5],
            snapMode: "round",
          },
          "pad",
        ),
      tint: () => g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
    };
    const ids = order === "forward" ? ["grid", "box", "shell", "pad", "tint"] : ["tint", "pad", "shell", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.shell, "in");
    g.connect(h.shell, "out", h.pad, "in");
    g.connect(h.pad, "out", h.tint, "in");
    g.output(h.tint, "out", "pieces");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(build("forward"))).outputs.pieces);
    const c = firstGeo((await cook(build("reverse"))).outputs.pieces);
    expect(a.pointCount).toBe(36);
    expect(bytes(b)).toEqual(bytes(a));
    expect(bytes(c)).toEqual(bytes(a));
  });

  it("round-trips through the serialized format, field margins included, and cooks the same", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    expect(bytes(b)).toEqual(bytes(a));
  });
});
