/**
 * `placeBox`: a box placed inside, or against, each cell's own box by size,
 * anchor and offset per axis, in the box frame or the frame shellSplit
 * writes.
 *
 * Expectations are written out by hand from the cell and the params, never
 * recorded from a run. The ORACLE below is written independently of the
 * node: it builds each frame axis as a signed unit vector — the up axis
 * from shellSplit's own `upAxis`/`upSign` attributes rather than from the
 * right-hand rule the node derives it by (it reads only along and the
 * outward normal) — and projects the cell onto it. Coordinates are dyadic
 * wherever a sum is compared, so "exact" means exact.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createTriangleMesh } from "../data/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import { deserializeGraph, fieldFromJson, parseFieldText, pointGrid, serializeGraph, setAttribute, setBounds } from "./index.js";
import { placeBox } from "./placeBox.js";
import { repeatPoints } from "./repeatPoints.js";
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

async function place(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(placeBox, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

const f = (text: string) => fieldFromJson(parseFieldText(text));

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.attrs.point.count * a.tupleSize));
}

function strings(geo: Geometry, name: string): string[] {
  const a = geo.attrs.point.require(name);
  return Array.from({ length: geo.attrs.point.count }, (_, i) => a.getString(i));
}

type Box = [number[], number[]];

function boxes(geo: Geometry): Box[] {
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  return Array.from({ length: geo.pointCount }, (_, i) => [lo.slice(i * 3, i * 3 + 3), hi.slice(i * 3, i * 3 + 3)]);
}

/** Cells with the given boxes, seeds 100, 101, ..., and an i32 `cell` index. */
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

/** The worked cell: 8 wide (x), 6 tall (y), 4 deep (z). */
const worked = (): Geometry => cells([[[0, 0, 0], [8, 6, 4]]]);

// ---------------------------------------------------------------------------
// The oracle: one cell, one frame given as three signed unit axes.

interface Frame {
  /** World axis code of along, up, out. */
  axis: [number, number, number];
  /** +1 or -1 per frame axis. */
  sign: [number, number, number];
}

const WORLD: Frame = { axis: [0, 1, 2], sign: [1, 1, 1] };

interface Placement {
  size: number[];
  units?: ("absolute" | "relative")[];
  anchor: number[];
  offset: number[];
  offsetUnits?: ("absolute" | "relative" | "self")[];
}

/**
 * The placed box, by the definition: on each frame axis d = sign * e[axis],
 * the cell projects onto t = d . x as [tMin, tMax]; the box starts at
 * tMin + anchor * (len - size) + offset and is size long; back in world
 * terms its interval is t / sign. No fit, no snap.
 */
function oracle(cell: Box, fr: Frame, p: Placement): Box {
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const w = fr.axis[c];
    const s = fr.sign[c];
    const ends = [s * cell[0][w], s * cell[1][w]];
    const tMin = Math.min(...ends);
    const len = Math.max(...ends) - tMin;
    const size = Math.max(0, (p.units?.[c] ?? "absolute") === "relative" ? p.size[c] * len : p.size[c]);
    const ou = p.offsetUnits?.[c] ?? "absolute";
    const off = ou === "absolute" ? p.offset[c] : ou === "relative" ? p.offset[c] * len : p.offset[c] * size;
    const t0 = tMin + p.anchor[c] * (len - size) + off;
    const a = t0 / s;
    const b = (t0 + size) / s;
    lo[w] = Math.min(a, b);
    hi[w] = Math.max(a, b);
  }
  return [lo, hi];
}

/** Deterministic dyadic draws for the oracle sweeps. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const dyadic = (r: () => number, lo: number, hi: number, den = 8): number => lo + Math.floor(r() * (hi - lo) * den) / den;

// ---------------------------------------------------------------------------

describe("placeBox: layout in the box frame", () => {
  it("defaults to a unit box centred in the cell", async () => {
    const out = await place(worked());
    expect(boxes(out)).toEqual([[[3.5, 2.5, 1.5], [4.5, 3.5, 2.5]]]);
  });

  it("anchors min, max and centre per axis, then offsets", async () => {
    // x: min side, 1 in -> [1, 3]; y: max side -> [5, 6]; z: centred
    // (0 + 0.5 * (4 - 2) = 1) then -0.5 -> [0.5, 2.5].
    const out = await place(worked(), { size: [2, 1, 2], anchor: [0, 1, 0.5], offset: [1, 0, -0.5] });
    expect(boxes(out)).toEqual([[[1, 5, 0.5], [3, 6, 2.5]]]);
  });

  it("an anchor between 0 and 1 places in proportion: min = cellMin + anchor * (len - size)", async () => {
    const out = await place(worked(), { size: [2, 2, 2], anchor: [0.25, 0.75, 0.5] });
    // x 0.25 * 6 = 1.5; y 0.75 * 4 = 3; z 0.5 * 2 = 1
    expect(boxes(out)).toEqual([[[1.5, 3, 1], [3.5, 5, 3]]]);
  });

  it("relative sizes are fractions of the cell's extent; one unit entry serves all three axes", async () => {
    const mixed = await place(worked(), { size: [0.5, 2, 1], units: ["relative", "absolute", "relative"], anchor: [1, 0, 0] });
    expect(boxes(mixed)).toEqual([[[4, 0, 0], [8, 2, 4]]]);
    const whole = await place(worked(), { size: [1, 1, 1], units: ["relative"] });
    expect(boxes(whole)).toEqual([[[0, 0, 0], [8, 6, 4]]]);
  });

  it("offsets in absolute, relative and self units; self places AGAINST the cell", async () => {
    // x: 0.25 of 8 = 2 in -> [2, 4]; y: on the max side, then one own size
    // up -> [6, 7], standing on the cell's top; z: [0, 1].
    const out = await place(worked(), {
      size: [2, 1, 1],
      anchor: [0, 1, 0],
      offset: [0.25, 1, 0],
      offsetUnits: ["relative", "self", "absolute"],
      fit: "allow",
    });
    expect(boxes(out)).toEqual([[[2, 6, 0], [4, 7, 1]]]);
    // ...and just under the min side, its max on the cell's min.
    const under = await place(worked(), { size: [1, 1, 1], anchor: [0.5, 0, 0.5], offset: [0, -1, 0], offsetUnits: ["self"], fit: "allow" });
    expect(boxes(under)).toEqual([[[3.5, -1, 1.5], [4.5, 0, 2.5]]]);
  });

  it("matches the oracle on a sweep of cells and placements, inside and out", async () => {
    const r = lcg(7);
    const list: Box[] = [];
    const ps: Placement[] = [];
    for (let i = 0; i < 64; i++) {
      const lo = [dyadic(r, -20, 20), dyadic(r, -20, 20), dyadic(r, -20, 20)];
      list.push([lo, lo.map((v) => v + dyadic(r, 0.5, 12))]);
      const units = [0, 1, 2].map(() => (r() < 0.5 ? "absolute" : "relative") as "absolute" | "relative");
      ps.push({
        size: units.map((u) => (u === "relative" ? dyadic(r, 0, 1.5, 4) : dyadic(r, 0, 10))),
        units,
        anchor: [0, 1, 2].map(() => dyadic(r, 0, 1, 4)),
        offset: [0, 1, 2].map(() => dyadic(r, -3, 3)),
        offsetUnits: [0, 1, 2].map(() => (["absolute", "relative", "self"] as const)[Math.floor(r() * 3)]),
      });
    }
    // One node, every placement per cell through fields on the cell index.
    const geo = cells(list);
    const pick = (key: "size" | "anchor" | "offset") =>
      f(`choose(attribute("cell"), ${ps.map((p) => `vec(${p[key].join(", ")})`).join(", ")})`);
    // Units are per node, so the sweep runs one node per unit combination.
    let checked = 0;
    for (const combo of new Set(ps.map((p) => `${p.units!.join()}|${p.offsetUnits!.join()}`))) {
      const [u, ou] = combo.split("|").map((s) => s.split(","));
      const out = await place(geo, {
        size: pick("size"),
        anchor: pick("anchor"),
        offset: pick("offset"),
        units: u,
        offsetUnits: ou,
        fit: "allow",
      });
      const got = boxes(out);
      const cellOf = col(out, "cell");
      ps.forEach((p, i) => {
        if (`${p.units!.join()}|${p.offsetUnits!.join()}` !== combo) return;
        const want = oracle(list[i], WORLD, p);
        // Every point is kept, a box of no volume included, in input order.
        expect(cellOf[i], `cell ${i} keeps its place`).toBe(i);
        expect(got[i], `cell ${i}`).toEqual(want);
        checked++;
      });
    }
    expect(checked).toBe(64);
    // ...and the sweep did reach boxes of no volume.
    expect(ps.some((p, i) => oracle(list[i], WORLD, p)[0].some((v, a) => !(oracle(list[i], WORLD, p)[1][a] > v)))).toBe(true);
  });
});

describe("placeBox: the frame shellSplit writes", () => {
  /** The worked box broken into its six faces, each 1 thick. */
  async function faces(): Promise<Geometry> {
    const r = await runNode(shellSplit, { thickness: [1] }, { in: [makeGeometryItem(worked())] });
    return firstGeo(r.out);
  }

  it("places 'one in from the left, flush to the outer face' on all six faces with one text", async () => {
    const shell = await faces();
    expect(strings(shell, "piece")).toEqual(["floor", "wall", "wall", "wall", "wall", "ceiling"]);
    const out = await place(shell, { frame: "face", size: [1, 1, 0.5], anchor: [0, 0, 1], offset: [1, 0, 0] });
    // By hand. Faces of [0,0,0]-[8,6,4], thickness 1; along runs left to
    // right seen from outside, up from the bottom, out to the outer face.
    expect(boxes(out)).toEqual([
      [[1, 0, 0], [2, 0.5, 1]], // floor  [0,0,0]-[8,1,4]: along +x, up +z, out -y (outer face y = 0)
      [[6, 1, 0], [7, 2, 0.5]], // south  [0,1,0]-[8,5,1]: along -x, so the left is x = 8; out -z
      [[1, 1, 3.5], [2, 2, 4]], // north  [0,1,3]-[8,5,4]: along +x; out +z
      [[0, 1, 2], [0.5, 2, 3]], // west   [0,1,1]-[1,5,3]: along +z; out -x
      [[7.5, 1, 1], [8, 2, 2]], // east   [7,1,1]-[8,5,3]: along -z, so the left is z = 3; out +x
      [[1, 5.5, 3], [2, 6, 4]], // ceiling[0,5,0]-[8,6,4]: along +x, up -z (bottom is z = 4); out +y
    ]);
  });

  it("out is shellSplit's outward and the DERIVED up is shellSplit's up on every face; the interior is refused, naming the cell", async () => {
    const r = await runNode(shellSplit, { thickness: [1], interiorLabel: "room" }, { in: [makeGeometryItem(worked())] });
    const shell = firstGeo(r.out);
    // The interior's outward normal is zero: it has no out, and is refused.
    const msg = await rejection(place(shell, { frame: "face" }));
    expect(msg).toContain("placeBox: frame \"face\" needs ONE signed axis as cell 6's outward normal (\"outward\"), and it is [0, 0, 0]");
    expect(msg).toContain("a zero normal faces nowhere");
    const faces = f('lt(attribute("face"), 6)');
    // Anchor out (then up) at 1 with a thin box: the box sits on the max
    // side, so its centre minus the face's centre points along +out (+up).
    const outward = col(shell, "outward");
    const upAxis = col(shell, "upAxis");
    const upSign = col(shell, "upSign");
    const fb = boxes(shell);
    const dirOf = (got: Box[], i: number) => [0, 1, 2].map((k) => Math.sign((got[i][0][k] + got[i][1][k]) / 2 - (fb[i][0][k] + fb[i][1][k]) / 2));
    const outBox = boxes(await place(shell, { frame: "face", where: faces, size: [1, 1, 0.25], units: ["relative", "relative", "absolute"], anchor: [0.5, 0.5, 1] }));
    const upBox = boxes(await place(shell, { frame: "face", where: faces, size: [1, 0.25, 1], units: ["relative", "absolute", "relative"], anchor: [0.5, 1, 0.5] }));
    for (let i = 0; i < 6; i++) {
      expect(dirOf(outBox, i), `out, piece ${i}`).toEqual(outward.slice(i * 3, i * 3 + 3).map((v) => Math.sign(v)));
      expect(dirOf(upBox, i), `up, piece ${i}`).toEqual([0, 1, 2].map((k) => (k === upAxis[i] ? upSign[i] : 0)));
    }
    // The interior, left out by `where`, passes through as it came.
    expect(outBox[6]).toEqual(fb[6]);
  });

  it("matches the oracle, built from shellSplit's own up attributes, on a sweep of placements on every face", async () => {
    const r = await runNode(shellSplit, { thickness: [1.5], interiorLabel: "room" }, { in: [makeGeometryItem(cells([[[-3, 2, 5], [9, 10, 11]]]))] });
    const shell = firstGeo(r.out);
    const along = col(shell, "alongAxis");
    const aSign = col(shell, "alongSign");
    const up = col(shell, "upAxis");
    const uSign = col(shell, "upSign");
    const outAxis = col(shell, "outAxis");
    const outward = col(shell, "outward");
    const rnd = lcg(11);
    for (let t = 0; t < 12; t++) {
      const p: Placement = {
        size: [dyadic(rnd, 0, 4), dyadic(rnd, 0, 4), dyadic(rnd, 0, 2)],
        anchor: [dyadic(rnd, 0, 1, 4), dyadic(rnd, 0, 1, 4), dyadic(rnd, 0, 1, 4)],
        offset: [dyadic(rnd, -2, 2), dyadic(rnd, -2, 2), dyadic(rnd, -1, 1)],
      };
      // The interior (face 6) has no out and is left out with `where`.
      const out = await place(shell, { frame: "face", where: f('lt(attribute("face"), 6)'), size: p.size, anchor: p.anchor, offset: p.offset, fit: "allow" });
      const got = boxes(out);
      expect(got.length).toBe(7);
      boxes(shell).forEach((cell, i) => {
        if (i === 6) {
          expect(got[i], `trial ${t}: the interior passes through`).toEqual(cell);
          return;
        }
        const o = outAxis[i];
        const fr: Frame = { axis: [along[i], up[i], o], sign: [aSign[i], uSign[i], Math.sign(outward[i * 3 + o])] };
        expect(got[i], `trial ${t} face ${i}`).toEqual(oracle(cell, fr, p));
      });
    }
  });

  it("reads a hand-written frame under other attribute names", async () => {
    const geo = worked();
    const pts = geo.attrs.point;
    pts.add("ax", "f32", 1, 2); // along +z ...
    pts.add("as", "f32", 1, -1); // ... negated
    pts.add("nrm", "f32", 3, [0, -1, 0]); // out -y
    // along = -z, out = -y: up = out x along = (-y) x (-z) = y x z = +x.
    const out = await place(geo, {
      frame: "face",
      alongAxisAttr: "ax",
      alongSignAttr: "as",
      outwardAttr: "nrm",
      size: [1, 2, 3],
      anchor: [0, 0, 1],
    });
    // along -z, min side is z = 4: [3, 4]; up +x from 0: [0, 2]; out -y,
    // max side is y = 0: [0, 3].
    expect(boxes(out)).toEqual([[[0, 0, 3], [2, 3, 4]]]);
  });

  it("is the box frame on a cell whose face frame is the box's own axes", async () => {
    const geo = worked();
    const pts = geo.attrs.point;
    pts.add("alongAxis", "i32", 1, 0);
    pts.add("alongSign", "i32", 1, 1);
    pts.add("outward", "f32", 3, [0, 0, 1]); // up = z x x = +y
    const params = { size: [2, 1, 3], anchor: [0.25, 1, 0], offset: [0.5, -1, 1], fit: "allow" };
    const a = await place(geo, params);
    const b = await place(geo, { ...params, frame: "face" });
    expect(boxes(b)).toEqual(boxes(a));
  });
});

describe("placeBox: rotated cells, carried attributes and seeds", () => {
  it("places a rotated cell in its own (stored, local) box, blind to its transform, and carries P, rot, scale, seed and every attribute as they were", async () => {
    const geo = cells([
      [[0, 0, 0], [4, 4, 4]],
      [[10, 0, 0], [12, 2, 6]],
    ]);
    const pts = geo.attrs.point;
    pts.require("P").setTuple(0, [2, 2, 2]);
    pts.require("P").setTuple(1, [11, 1, 3]);
    pts.require("rot").setTuple(1, [0, Math.SQRT1_2, 0, Math.SQRT1_2]); // 90 deg about y
    pts.require("scale").setTuple(1, [2, 3, 4]);
    const name = pts.add("name", "string", 1, "");
    name.setString(0, "a");
    name.setString(1, "b");
    geo.attrs.detail.add("lot", "i32", 1, 7);
    const out = await place(geo, { size: [1, 1, 1], anchor: [0, 0, 1] });
    expect(boxes(out)).toEqual([
      [[0, 0, 3], [1, 1, 4]],
      [[10, 0, 5], [11, 1, 6]], // the box's own coordinates: the transform is carried, never read (tests/localBoxes.test.ts)
    ]);
    const before = snapshotGeometry(geo) as Record<string, { attrs: { name: string }[] }>;
    const after = snapshotGeometry(out) as Record<string, { attrs: { name: string }[] }>;
    const without = (s: Record<string, { attrs: { name: string }[] }>) => ({
      ...s,
      point: { ...s.point, attrs: s.point.attrs.filter((a) => a.name !== "boundsMin" && a.name !== "boundsMax") },
    });
    expect(without(after)).toEqual(without(before));
  });

  it("drops in for the setBounds it replaces, byte for byte", async () => {
    const r = await runNode(pointGrid, { countX: 3, countY: 1, countZ: 2, spacing: [2, 2, 2] }, {});
    const grid = firstGeo(r.out);
    const sb = await runNode(setBounds, { boundsMin: [-1, -0.5, -1], boundsMax: [1, 3.5, 1] }, { in: [makeGeometryItem(grid)] });
    const parents = firstGeo(sb.out);
    // Hand-spelled: a 0.5 x 1 x 0.5 box on each cell's floor, 0.25 in from its max x.
    const spelled = await runNode(
      setBounds,
      { boundsMin: f('vec(box("x1") - 0.75, box("y0"), box("cz") - 0.25)'), boundsMax: f('vec(box("x1") - 0.25, box("y0") + 1, box("cz") + 0.25)') },
      { in: [makeGeometryItem(parents)] },
    );
    const placed = await place(parents, { size: [0.5, 1, 0.5], anchor: [1, 0, 0.5], offset: [-0.25, 0, 0] });
    expect(snapshotGeometry(placed)).toEqual(snapshotGeometry(firstGeo(spelled.out)));
  });

  it("drops in for setBounds on a MESH too: the points, vertices, primitive and detail carried, byte for byte", async () => {
    const mesh = createTriangleMesh([0, 0, 0, 4, 0, 0, 0, 4, 0], [0, 1, 2]);
    const pts = mesh.attrs.point;
    pts.add("boundsMin", "f32", 3, [0, 0, 0]);
    pts.add("boundsMax", "f32", 3, [4, 4, 2]);
    pts.add("tag", "string", 1, "").setString(1, "corner");
    mesh.attrs.vertex.add("uv", "f32", 2, [0.5, 0.5]);
    mesh.attrs.detail.add("lot", "i32", 1, 7);
    const placed = await place(mesh, { size: [1, 1, 1], anchor: [0, 0, 1] });
    expect(placed.pointCount).toBe(3);
    expect(placed.attrs.vertex.count).toBe(3);
    expect(placed.attrs.primitive.count).toBe(1);
    expect(Array.from(placed.vertexToPoint)).toEqual([0, 1, 2]);
    expect(placed.attrs.detail.require("lot").get(0)).toBe(7);
    expect(boxes(placed)).toEqual(Array.from({ length: 3 }, () => [[0, 0, 1], [1, 1, 2]]));
    const spelled = await runNode(
      setBounds,
      { boundsMin: f('vec(box("x0"), box("y0"), box("z1") - 1)'), boundsMax: f('vec(box("x0") + 1, box("y0") + 1, box("z1"))') },
      { in: [makeGeometryItem(mesh)] },
    );
    expect(snapshotGeometry(placed)).toEqual(snapshotGeometry(firstGeo(spelled.out)));
  });

  it("several boxes per cell come from a copy fan upstream, each copy's own seed and index carried", async () => {
    const rp = await runNode(repeatPoints, { count: 3, indexAttr: "copy" }, { in: [makeGeometryItem(worked())] });
    const fan = firstGeo(rp.out);
    const out = await place(fan, { size: [1, 1, 1], anchor: [0, 0, 0], offset: f('vec(2 * attribute("copy"), 0, 0)') });
    expect(boxes(out)).toEqual([
      [[0, 0, 0], [1, 1, 1]],
      [[2, 0, 0], [3, 1, 1]],
      [[4, 0, 0], [5, 1, 1]],
    ]);
    expect(col(out, "seed")).toEqual(col(fan, "seed"));
  });
});

describe("placeBox: fit, snap, boxes of no volume, where and the label", () => {
  const over = { size: [4, 1, 1], anchor: [1, 0, 0], offset: [2, 0, 0] }; // x [6, 10] past 8

  it("refuses an overhang by default, naming the cell, the axis and the numbers", async () => {
    const msg = await rejection(place(worked(), over));
    expect(msg).toContain("placeBox: cell 0's placed box OVERHANGS the cell along x by 2");
    expect(msg).toContain("spans 6 to 10, the cell 0 to 8");
    expect(msg).toMatch(/"allow".*"clamp".*"clip"/);
  });

  it("names the frame axis in the refusal when the frame is the cell's", async () => {
    const r = await runNode(shellSplit, { thickness: [1] }, { in: [makeGeometryItem(worked())] });
    const msg = await rejection(place(firstGeo(r.out), { frame: "face", size: [1, 1, 1], anchor: [0, 0, 1], offset: [0, 0, 0.5] }));
    expect(msg).toContain("along y (the frame's out axis)");
  });

  it("allow keeps it, clamp slides it inside, clip cuts it", async () => {
    expect(boxes(await place(worked(), { ...over, fit: "allow" }))).toEqual([[[6, 0, 0], [10, 1, 1]]]);
    expect(boxes(await place(worked(), { ...over, fit: "clamp" }))).toEqual([[[4, 0, 0], [8, 1, 1]]]);
    expect(boxes(await place(worked(), { ...over, fit: "clip" }))).toEqual([[[6, 0, 0], [8, 1, 1]]]);
    // Clamp caps a box larger than the cell at the cell; past the min side too.
    expect(boxes(await place(worked(), { size: [20, 1, 1], anchor: [0, 0, 0], offset: [-3, 0, 0], fit: "clamp" }))).toEqual([[[0, 0, 0], [8, 1, 1]]]);
    expect(boxes(await place(worked(), { size: [2, 1, 1], anchor: [0, 0, 0], offset: [-1, 0, 0], fit: "clamp" }))).toEqual([[[0, 0, 0], [2, 1, 1]]]);
  });

  it("keeps a box of no volume: a size of 0, or a clip of a box wholly outside, on the plane it passed", async () => {
    const two = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [8, 6, 4]],
    ]);
    const out = await place(two, { size: f('vec(1, select(attribute("cell"), 1, 0), 1)') });
    expect(col(out, "cell")).toEqual([0, 1]);
    expect(boxes(out)).toEqual([
      [[3.5, 3, 1.5], [4.5, 3, 2.5]], // no height: centred on y = 3
      [[3.5, 2.5, 1.5], [4.5, 3.5, 2.5]],
    ]);
    // x [12, 13] is wholly past the max side x = 8: cut to x = 8, kept.
    const gone = await place(worked(), { size: [1, 1, 1], anchor: [1, 0, 0], offset: [5, 0, 0], fit: "clip" });
    expect(boxes(gone)).toEqual([[[8, 0, 0], [8, 1, 1]]]);
    // ...and past the min side, on x = 0.
    const under = await place(worked(), { size: [1, 1, 1], anchor: [0, 0, 0], offset: [-3, 0, 0], fit: "clip" });
    expect(boxes(under)).toEqual([[[0, 0, 0], [0, 1, 1]]]);
    // A negative size counts as 0.
    expect(boxes(await place(worked(), { size: [-1, 1, 1] }))).toEqual([[[4, 2.5, 1.5], [4, 3.5, 2.5]]]);
  });

  it("flush is flush to f32 precision: a third of a box three times meets its far side exactly", async () => {
    const geo = cells([[[0.1, 0, 0], [1.3, 1, 1]]]);
    const out = await place(geo, { size: [1 / 3, 1, 1], units: ["relative", "absolute", "absolute"], anchor: [0, 0, 0], offset: [2 / 3, 0, 0], offsetUnits: ["relative", "absolute", "absolute"] });
    expect(col(out, "boundsMax")[0]).toBe(col(geo, "boundsMax")[0]);
  });

  it("flush never pulls a small box onto a plane it is not at, nor a corner onto the far plane of a thin cell", async () => {
    // A long cell: a millionth of its length is 2, four times the box.
    const long = cells([[[0, 0, 0], [2e6, 1, 1]]]);
    expect(boxes(await place(long, { size: [0.5, 1, 1], anchor: [0, 0, 0] }))).toEqual([[[0, 0, 0], [0.5, 1, 1]]]);
    expect(boxes(await place(long, { size: [1, 1, 1], anchor: [1, 0, 0], offset: [1, 0, 0], offsetUnits: ["self"], fit: "allow" }))).toEqual([
      [[2e6, 0, 0], [2e6 + 1, 1, 1]],
    ]);
    // A cell one f32 step thick at z = 65536, a box stood on its top: the
    // box's min is the cell's max, not its min.
    const top = 65536 + 1 / 128;
    const thin = cells([[[0, 0, 65536], [1, 1, top]]]);
    const out = await place(thin, { size: [1, 1, 4 / 128], anchor: [0, 0, 1], offset: [0, 0, 1], offsetUnits: ["self"], fit: "allow" });
    expect(boxes(out)).toEqual([[[0, 0, top], [1, 1, top + 4 / 128]]]);
  });

  it("fit reads every box, one of no volume included: a size of 0 that overhangs is refused, and clipped under clip", async () => {
    const params = { size: [0, 1, 1], anchor: [0, 0, 0], offset: [0, 0, 50] };
    const msg = await rejection(place(worked(), params));
    expect(msg).toContain("placeBox: cell 0's placed box OVERHANGS the cell along z by 47");
    expect(boxes(await place(worked(), { ...params, fit: "clip" }))).toEqual([[[0, 0, 4], [0, 1, 4]]]);
  });

  it("snaps both corners onto the lattice: as nearly centred as whole units allow", async () => {
    const geo = cells([[[0, 0, 0], [7, 6, 5]]]);
    // Centred x is [2.5, 4.5], z [1.5, 3.5]: floor both corners.
    const out = await place(geo, { size: [2, 1, 2], anchor: [0.5, 0, 0.5], snap: [1, 1, 1], snapMode: "floor" });
    expect(boxes(out)).toEqual([[[2, 0, 1], [4, 1, 3]]]);
    const up = await place(geo, { size: [2, 1, 2], anchor: [0.5, 0, 0.5], snap: [1, 0, 1], snapMode: "ceil" });
    expect(boxes(up)).toEqual([[[3, 0, 2], [5, 1, 4]]]);
    // A plate lattice, a stored 1.2 counting as on it (no ceil to 1.6).
    const plate = await place(cells([[[0, 1.2, 0], [1, 4, 1]]]), { size: [1, 0.8, 1], anchor: [0, 0, 0], snap: [0, 0.4, 0], snapMode: "ceil" });
    expect(col(plate, "boundsMin")[1]).toBe(Math.fround(1.2));
    // A snap that pushes a corner out of the cell is an overhang like any other.
    const msg = await rejection(place(cells([[[0, 0, 0], [7.5, 1, 1]]]), { size: [2, 1, 1], anchor: [1, 0, 0], snap: [1, 0, 0], snapMode: "ceil" }));
    expect(msg).toContain("snapped to 1");
    // And a snap can collapse a box thinner than a step to no volume: kept.
    expect(boxes(await place(cells([[[0, 0, 0], [1, 1, 1]]]), { size: [0.5, 1, 1], anchor: [0, 0, 0], snap: [1, 0, 0], snapMode: "floor" }))).toEqual([
      [[0, 0, 0], [0, 1, 1]],
    ]);
  });

  it('snapMode "out" grows onto the lattice, "in" shrinks, and "in" with no whole step inside is a box of no volume at its centre', async () => {
    const geo = cells([[[0, 0, 0], [2, 1, 1]]]);
    const p = { size: [0.5, 1, 1], anchor: [0, 0, 0], offset: [0.25, 0, 0], snap: [1, 0, 0] }; // x [0.25, 0.75]
    expect(boxes(await place(geo, { ...p, snapMode: "out" }))).toEqual([[[0, 0, 0], [1, 1, 1]]]);
    expect(boxes(await place(geo, { ...p, snapMode: "in" }))).toEqual([[[0.5, 0, 0], [0.5, 1, 1]]]);
    // [0.25, 1.75] holds one line and no whole step: both corners land on x = 1.
    expect(boxes(await place(geo, { ...p, size: [1.5, 1, 1], snapMode: "in" }))).toEqual([[[1, 0, 0], [1, 1, 1]]]);
    // [0.25, 2.75] holds one whole step: it shrinks onto [1, 2].
    expect(boxes(await place(cells([[[0, 0, 0], [4, 1, 1]]]), { ...p, size: [2.5, 1, 1], snapMode: "in" }))).toEqual([[[1, 0, 0], [2, 1, 1]]]);
    // The centre is the BOX's own, not the middle of the step the snap
    // left: x [0.2, 0.3] in a cell [0, 0.35] collapses at 0.25, inside the
    // cell, where the step's middle (0.5) would overhang and be refused.
    const thin = await place(cells([[[0, 0, 0], [0.35, 1, 1]]]), { size: [0.1, 1, 1], anchor: [0, 0, 0], offset: [0.2, 0, 0], snap: [1, 0, 0], snapMode: "in" });
    expect(col(thin, "boundsMin")[0]).toBe(Math.fround(0.25));
    expect(col(thin, "boundsMax")[0]).toBe(Math.fround(0.25));
  });

  it("a box of no volume is made flush like any other: an f32-noise overhang of a zero box is not refused", async () => {
    // Cell x [1e5, 1e5 + 8]; a zero box anchored at the max side, nudged
    // 1.5 f32 ulps (ulp = 2^-7 here) past it by the offset.
    const cHi = 1e5 + 8;
    const out = await place(cells([[[1e5, 0, 0], [cHi, 1, 1]]]), { size: [0, 1, 1], anchor: [1, 0, 0], offset: [1.5 * 2 ** -7, 0, 0] });
    expect(col(out, "boundsMin")[0]).toBe(cHi);
    expect(col(out, "boundsMax")[0]).toBe(cHi);
  });

  it('snapTo "size" rounds the size to whole steps and keeps the centre', async () => {
    const geo = cells([[[0, 0, 0], [10, 1, 1]]]);
    // Centred x [3.5, 6.5], size 3 on a step of 4.
    const p = { size: [3, 1, 1], anchor: [0.5, 0, 0], snap: [4, 0, 0], snapTo: "size" };
    expect(boxes(await place(geo, { ...p, snapMode: "round" }))).toEqual([[[3, 0, 0], [7, 1, 1]]]);
    expect(boxes(await place(geo, { ...p, snapMode: "out" }))).toEqual([[[3, 0, 0], [7, 1, 1]]]);
    expect(boxes(await place(geo, { ...p, snapMode: "in" }))).toEqual([[[5, 0, 0], [5, 1, 1]]]);
    expect(boxes(await place(geo, { ...p, size: [6, 1, 1], snapMode: "floor" }))).toEqual([[[3, 0, 0], [7, 1, 1]]]);
    expect(boxes(await place(geo, { ...p, size: [6, 1, 1], snapMode: "ceil" }))).toEqual([[[1, 0, 0], [9, 1, 1]]]);
  });

  it("passes cells through with `where`, and labels only what it placed", async () => {
    const geo = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [2, 2, 2]],
    ]);
    const out = await place(geo, { where: f('eq(attribute("cell"), 0)'), labelAttr: "piece", label: "chimney" });
    expect(boxes(out)).toEqual([
      [[3.5, 2.5, 1.5], [4.5, 3.5, 2.5]],
      [[0, 0, 0], [2, 2, 2]],
    ]);
    expect(strings(out, "piece")).toEqual(["chimney", ""]);
    // An existing label column is rewritten on placed boxes, kept elsewhere.
    const labelled = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [2, 2, 2]],
    ]);
    const kind = labelled.attrs.point.add("kind", "string", 1, "");
    kind.setString(0, "roof");
    kind.setString(1, "wall");
    const again = await place(labelled, { where: f('eq(attribute("cell"), 0)'), labelAttr: "kind", label: "chimney" });
    expect(strings(again, "kind")).toEqual(["chimney", "wall"]);
  });

  it("skips cells with no frame by `where`", async () => {
    const r = await runNode(shellSplit, { where: f('eq(attribute("cell"), 0)') }, { in: [makeGeometryItem(cells([[[0, 0, 0], [8, 6, 4]], [[20, 0, 0], [22, 2, 2]]]))] });
    const shell = firstGeo(r.out);
    const msg = await rejection(place(shell, { frame: "face" }));
    expect(msg).toContain('placeBox: frame "face" needs cell 6\'s along axis ("alongAxis") to be 0 (x), 1 (y) or 2 (z), and it is -1');
    expect(msg).toContain('where ge(attribute("alongAxis"), 0)');
    const out = await place(shell, { frame: "face", where: f('ge(attribute("alongAxis"), 0)') });
    expect(out.pointCount).toBe(7);
    expect(boxes(out)[6]).toEqual([[20, 0, 0], [22, 2, 2]]);
  });
});

describe("placeBox: refusals", () => {
  const cases: [string, Record<string, unknown>, string | RegExp][] = [
    ["an unknown frame", { frame: "local" }, 'param "frame" is "local"; valid: box, face — '],
    ["the old frame word", { frame: "attributes" }, 'param "frame" is "attributes"; valid: box, face — '],
    ["the frame's name before the box nodes read bounds locally, with the rename", { frame: "world" }, 'param "frame" is "world", which was renamed "box" — a cell\'s box is an extent'],
    ["two units", { units: ["absolute", "relative"] }, /param "units" is \["absolute","relative"\]; give ONE unit for all three axes or THREE/],
    ["an unknown unit", { units: ["absolute", "fraction", "absolute"] }, 'param "units" entry 1 (axis y) is "fraction"; valid: absolute, relative.'],
    ["self as a size unit", { units: ["self"] }, 'param "units" entry 0 is "self"; valid: absolute, relative.'],
    ["an unknown offset unit", { offsetUnits: ["percent"] }, 'param "offsetUnits" entry 0 is "percent"; valid: absolute, relative, self.'],
    ["a fit word of the other box nodes, naming why not", { fit: "scale" }, /param "fit" is "scale"; valid: error, allow, clamp, clip\. On the other box nodes "scale" rescales .*; here a placed box has a size of its own and nothing to rescale it against/],
    ["an unknown fit", { fit: "squash" }, 'param "fit" is "squash"; valid: error, allow, clamp, clip.'],
    ["an unknown snapMode", { snapMode: "nearest" }, 'param "snapMode" is "nearest"; valid: round, floor, ceil, out, in — '],
    ["an unknown snapTo", { snapTo: "grid" }, 'param "snapTo" is "grid"; valid: lattice, size.'],
    ["a negative snap", { snap: [0, -1, 0] }, 'param "snap" component 1 (y) is -1; a lattice step is a finite number >= 0'],
    ["a non-finite plain size", { size: [1, Infinity, 1] }, 'param "size" (component 1) is Infinity'],
    ["a non-finite plain anchor", { anchor: [Number.NaN, 0, 0] }, 'param "anchor" (component 0) is NaN'],
    ["a non-finite plain offset", { offset: [0, 0, -Infinity] }, 'param "offset" (component 2) is -Infinity'],
    ["a non-finite field offset", { offset: f("vec(1 / 0, 0, 0)") }, /placeBox.*"offset"/],
    ["a two-component size field", { size: f("vec(1, 2)") }, 'param "size" must evaluate to three components [x, y, z] (tupleSize 3) per cell, or to one number'],
    ["a vector where", { where: f("vec(1, 1, 1)") }, 'param "where" must evaluate to ONE number per cell'],
    ["a standard attribute as the label slot", { labelAttr: "seed" }, 'param "labelAttr" cannot write "seed" — it is a standard point attribute'],
    ["a non-string label", { label: 3 }, 'param "label" is 3; it is one string'],
  ];
  for (const [what, params, want] of cases) {
    it(`refuses ${what}`, async () => {
      const msg = await rejection(place(worked(), params));
      if (typeof want === "string") expect(msg).toContain(want);
      else expect(msg).toMatch(want);
      expect(msg.startsWith("placeBox")).toBe(true);
    });
  }

  it("refuses a label slot holding another shape", async () => {
    const geo = worked();
    geo.attrs.point.add("kind", "f32", 1, 0);
    const msg = await rejection(place(geo, { labelAttr: "kind", label: "x" }));
    expect(msg).toContain('"kind"');
    expect(msg).toContain("placedLabel");
  });

  it("refuses cells with no box, or a box inside out or not finite", async () => {
    const bare = createPointCloud(1);
    bare.attrs.point.remove("boundsMin");
    expect(await rejection(place(bare))).toContain('has no "boundsMin" point attribute; a cell\'s box is the standard f32 tuple-3 pair');
    expect(await rejection(place(cells([[[0, 2, 0], [1, 1, 1]]])))).toContain("cell 0's box is inside out along y — boundsMin 2, boundsMax 1");
    expect(await rejection(place(cells([[[0, 0, 0], [1, Infinity, 1]]])))).toContain("cell 0's box is not finite along y");
  });

  it("refuses missing or mistyped frame attributes in ONE message naming every one, and the fix", async () => {
    const missing = await rejection(place(worked(), { frame: "face" }));
    expect(missing).toContain('placeBox: frame "face" reads each cell\'s frame from three point attributes');
    expect(missing).toContain("cannot give 3 of them");
    expect(missing).toContain('there is no "alongAxis" (param "alongAxisAttr", the along axis)');
    expect(missing).toContain('there is no "alongSign" (param "alongSignAttr", the along direction)');
    expect(missing).toContain('there is no "outward" (param "outwardAttr", the outward normal)');
    expect(missing).toContain('set frame to "box"');
    const geo = worked();
    const pts = geo.attrs.point;
    pts.add("alongAxis", "i32", 1, 0);
    pts.add("alongSign", "string", 1, "+");
    pts.add("outward", "f32", 3, [0, 0, 1]);
    const typed = await rejection(place(geo, { frame: "face" }));
    expect(typed).toContain("cannot give one of them");
    expect(typed).toContain('"alongSign" (param "alongSignAttr", the along direction) is string tupleSize 1, where shellSplit writes i32 tuple 1');
    expect(await rejection(place(geo, { frame: "face", alongSignAttr: "" }))).toContain('param "alongSignAttr" is "", so nothing names the along direction');
  });

  it("refuses a frame that is not one — along on the out axis, a bad code, a zero or NaN sign, a zero or tilted normal — naming the cell", async () => {
    const framed = (a: number, sa: number, n: number[]): Geometry => {
      const geo = worked();
      const pts = geo.attrs.point;
      pts.add("alongAxis", "f32", 1, a);
      pts.add("alongSign", "f32", 1, sa);
      pts.add("outward", "f32", 3, n);
      return geo;
    };
    const why = async (a: number, sa: number, n: number[]) => rejection(place(framed(a, sa, n), { frame: "face" }));
    expect(await why(2, 1, [0, 0, 1])).toContain("needs cell 0's along axis (\"alongAxis\") to lie IN the face, not along its outward normal (\"outward\"), and both are z (2)");
    expect(await why(0.5, 1, [0, 0, 1])).toContain("needs cell 0's along axis (\"alongAxis\") to be 0 (x), 1 (y) or 2 (z), and it is 0.5");
    expect(await why(0, 0, [0, 0, 1])).toContain("needs cell 0's along sign (\"alongSign\") to be +1 or -1, and it is 0");
    expect(await why(0, Number.NaN, [0, 0, 1])).toContain("and it is NaN");
    expect(await why(0, 1, [0, 0, 0])).toContain("a zero normal faces nowhere");
    expect(await why(0, 1, [0, 0.6, 0.8])).toContain("a tilted normal does not name a face");
  });
});

describe("placeBox: determinism and the serialized format", () => {
  function build(order: "forward" | "reverse"): Graph {
    const g = new Graph(41);
    const add = {
      grid: () => g.add(pointGrid, { countX: 4, countY: 1, countZ: 3, spacing: [10, 10, 10] }, "grid"),
      box: () => g.add(setBounds, { anchor: "min", size: [8, 6, 4] }, "box"),
      shell: () => g.add(shellSplit, { faces: ["south", "north", "west", "east"], labels: ["wall", "wall", "wall", "wall"], thickness: [1] }, "shell"),
      trim: () =>
        g.add(
          placeBox,
          {
            frame: "face",
            // A drawn inset along, the same text on every wall.
            size: f('vec(1, box("sy") * 0.5, 1)'),
            anchor: [0, 0, 1],
            offset: f('vec(floor(randomField("at") * 2), 1, 0)'),
            snap: [1, 0, 1],
            snapMode: "floor",
            labelAttr: "piece",
            label: "trim",
          },
          "trim",
        ),
      tint: () => g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
    };
    const ids = order === "forward" ? ["grid", "box", "shell", "trim", "tint"] : ["tint", "trim", "shell", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.shell, "in");
    g.connect(h.shell, "out", h.trim, "in");
    g.connect(h.trim, "out", h.tint, "in");
    g.output(h.tint, "out", "pieces");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(build("forward"))).outputs.pieces);
    const c = firstGeo((await cook(build("reverse"))).outputs.pieces);
    expect(a.pointCount).toBe(48);
    expect(strings(a, "piece").every((s) => s === "trim")).toBe(true);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("round-trips through the serialized format, fields and string lists included, and cooks the same", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const node = json.nodes.find((n) => n.id === "trim")!;
    expect(node.type).toBe("placeBox");
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });

  it("loads plain params from hand-written JSON, units and fit included", async () => {
    const json = serializeGraph(build("forward"));
    const node = json.nodes.find((n) => n.id === "trim")!;
    Object.assign(node.params as Record<string, unknown>, {
      frame: "box",
      size: [2, 1, 2],
      units: ["absolute", "relative", "absolute"],
      anchor: [0.5, 0, 0.5],
      offset: [0, 0, 0],
      offsetUnits: ["absolute"],
      fit: "clamp",
    });
    const out = firstGeo((await cook(deserializeGraph(JSON.parse(JSON.stringify(json))))).outputs.pieces);
    expect(out.pointCount).toBe(48);
  });
});

describe("placeBox: flush and past, to f32 precision at the cell's coordinates", () => {
  const F = Math.fround;
  /** A cell spanning [x0, x1] on x and [0, 1] on y and z. */
  const onX = (x0: number, x1: number): Geometry => cells([[[x0, 0, 0], [x1, 1, 1]]]);

  it("a deliberate offset larger than two ulps is never flushed away: 0.0005 in a cell 1000 long stays", async () => {
    const out = await place(onX(0, 1000), { size: [1, 1, 1], anchor: [0, 0, 0], offset: [0.0005, 0, 0] });
    expect(col(out, "boundsMin")[0]).toBe(F(0.0005));
    expect(col(out, "boundsMax")[0]).toBe(F(1.0005));
  });

  it("a real overhang larger than two ulps is never accepted: -0.0005 is refused under error, kept under allow", async () => {
    const p = { size: [1, 1, 1], anchor: [0, 0, 0], offset: [-0.0005, 0, 0] };
    const msg = await rejection(place(onX(0, 1000), p));
    expect(msg).toContain("placeBox: cell 0's placed box OVERHANGS the cell along x");
    const kept = await place(onX(0, 1000), { ...p, fit: "allow" });
    expect(col(kept, "boundsMin")[0]).toBe(F(-0.0005));
  });

  it("the tolerance does not widen with the span: 0.09 in from the min side of a cell 1e5 long stays, the size kept", async () => {
    const out = await place(onX(0, 1e5), { size: [4, 1, 1], anchor: [0, 0, 0], offset: [0.09, 0, 0] });
    expect(col(out, "boundsMin")[0]).toBe(F(0.09));
    expect(col(out, "boundsMax")[0]).toBe(F(4.09));
  });

  it("a snapped corner is never flushed: floored off a cell plane 8 ulps above 1000, it stays on the lattice", async () => {
    const hi = F(1000.0005);
    expect(hi).toBe(1000 + 8 * 2 ** -14);
    const out = await place(onX(0, hi), { size: [1, 1, 1], units: ["relative"], anchor: [0, 0, 0], snap: [1, 0, 0], snapMode: "floor" });
    expect(col(out, "boundsMin")[0]).toBe(0);
    expect(col(out, "boundsMax")[0]).toBe(1000);
  });

  it("a snapped corner within two ulps of a cell plane off the lattice stays on its lattice line", async () => {
    const hi = F(1000 + 2 * 2 ** -14);
    expect(hi - 1000).toBe(2 * 2 ** -14); // exactly two f32 ulps at 1000
    const out = await place(onX(0, hi), { size: [1, 1, 1], units: ["relative"], anchor: [0, 0, 0], snap: [1, 0, 0], snapMode: "round" });
    expect(col(out, "boundsMax")[0]).toBe(1000);
  });

  it("the case the tolerance exists for still flushes: a size computed in f32 from the box lands ON the far plane", async () => {
    // As written: box("sx") on [123.456, 98765.43].
    const lo = F(123.456);
    const hi = F(98765.43);
    const out = await place(onX(lo, hi), { size: f('vec(box("sx"), 1, 1)'), anchor: [0, 0, 0] });
    expect(col(out, "boundsMin")[0]).toBe(lo);
    expect(col(out, "boundsMax")[0]).toBe(hi);
    // Where the flush is load-bearing: the f32 width, added back in f64,
    // lands ONE ulp past the plane (so "past" on stored numbers would
    // refuse it), and within two ulps it is put on the plane instead.
    const l = F(-40000.3);
    const h = F(40000.9);
    const w = F(h - l);
    expect(F(l + w) - h).toBe(2 ** -8); // one f32 ulp at 40000
    const geo = onX(l, h);
    geo.attrs.point.add("w", "f32", 1, w);
    const flushed = await place(geo, { size: f('vec(attribute("w"), 1, 1)'), anchor: [0, 0, 0] });
    expect(col(flushed, "boundsMin")[0]).toBe(l);
    expect(col(flushed, "boundsMax")[0]).toBe(h);
  });
});
