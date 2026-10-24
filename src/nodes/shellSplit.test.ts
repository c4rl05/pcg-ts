/**
 * `shellSplit`: each cell's box broken into floor, walls, ceiling and
 * interior, each with its own frame.
 *
 * Expectations are written out by hand from the cell and the thicknesses
 * (which piece, which face, which box), never recorded from a run — the
 * node's claim is a layout rule, and a recorded expectation would move with
 * the code. Coordinates are dyadic wherever a sum is compared, so "exact"
 * means exact.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, createPolyline } from "../data/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import {
  deserializeGraph,
  fieldFromJson,
  parseFieldText,
  pointGrid,
  serializeGraph,
  setAttribute,
  setBounds,
} from "./index.js";
import { repeatPoints } from "./repeatPoints.js";
import { shellSplit } from "./shellSplit.js";
import { splitBox } from "./splitBox.js";
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

async function shell(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(shellSplit, params, { in: [makeGeometryItem(geo)] }, seed);
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

/** Every piece's box as [lo, hi]. */
function boxes(geo: Geometry): Box[] {
  const lo = col(geo, "boundsMin");
  const hi = col(geo, "boundsMax");
  return Array.from({ length: geo.pointCount }, (_, i) => [lo.slice(i * 3, i * 3 + 3), hi.slice(i * 3, i * 3 + 3)]);
}

/** Cells with the given boxes and seeds 100, 101, ..., and an i32 `cell` index. */
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

const volume = ([a, b]: Box): number => (b[0] - a[0]) * (b[1] - a[1]) * (b[2] - a[2]);

/** Volume of the intersection of two boxes (0 when they only touch). */
function overlap([a0, a1]: Box, [b0, b1]: Box): number {
  let v = 1;
  for (let k = 0; k < 3; k++) v *= Math.max(0, Math.min(a1[k], b1[k]) - Math.max(a0[k], b0[k]));
  return v;
}

/**
 * The tiling claim, per cell: every piece inside the cell, no two pieces
 * sharing volume, and the volumes summing to the cell's exactly. Returns a
 * list of what fails, empty when nothing does.
 */
function tilingFailures(input: Geometry, out: Geometry): string[] {
  const inBoxes = boxes(input);
  const outBoxes = boxes(out);
  const cellOf = col(out, "cell");
  const fails: string[] = [];
  for (let c = 0; c < inBoxes.length; c++) {
    const parent = inBoxes[c];
    const mine = outBoxes.filter((_, i) => cellOf[i] === c);
    let sum = 0;
    mine.forEach((b, i) => {
      sum += volume(b);
      for (let k = 0; k < 3; k++) {
        if (b[0][k] < parent[0][k] || b[1][k] > parent[1][k]) fails.push(`cell ${c} piece ${i} leaves the box on axis ${k}`);
        if (!(b[1][k] > b[0][k])) fails.push(`cell ${c} piece ${i} has no extent on axis ${k}`);
      }
      for (let j = i + 1; j < mine.length; j++) {
        if (overlap(b, mine[j]) !== 0) fails.push(`cell ${c} pieces ${i} and ${j} overlap`);
      }
    });
    if (sum !== volume(parent)) fails.push(`cell ${c}: volumes sum to ${sum}, box is ${volume(parent)}`);
  }
  return fails;
}

const ALL = ["floor", "south", "north", "west", "east", "ceiling"];

/** The worked cell: 8 wide (x), 6 tall (y), 4 deep (z). */
const worked = (): Geometry => cells([[[0, 0, 0], [8, 6, 4]]]);
/** floor 1, south 0.5, north 0.5, west 1, east 2, ceiling 1, in ALL's order. */
const WORKED_T = [1, 0.5, 0.5, 1, 2, 1];

// ---------------------------------------------------------------------------

describe("shellSplit: layout", () => {
  it("cuts the worked box into the hand-derived pieces, floor and ceiling full, south and north owning the corners", async () => {
    const out = await shell(worked(), { thickness: WORKED_T, interiorLabel: "room" });
    // Planes: y 1 and 5; z 0.5 and 3.5; x 1 and 6.
    expect(boxes(out)).toEqual([
      [[0, 0, 0], [8, 1, 4]], // floor: the full footprint
      [[0, 1, 0], [8, 5, 0.5]], // south: full x, between floor and ceiling
      [[0, 1, 3.5], [8, 5, 4]], // north
      [[0, 1, 0.5], [1, 5, 3.5]], // west: between south and north
      [[6, 1, 0.5], [8, 5, 3.5]], // east
      [[0, 5, 0], [8, 6, 4]], // ceiling: the full footprint
      [[1, 1, 0.5], [6, 5, 3.5]], // interior
    ]);
    expect(strings(out, "piece")).toEqual(["floor", "wall", "wall", "wall", "wall", "ceiling", "room"]);
    expect(col(out, "face")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("tiles the box exactly: volumes 32 + 16 + 16 + 12 + 24 + 32 + 60 = 192, no overlap", async () => {
    const input = worked();
    const out = await shell(input, { thickness: WORKED_T, interiorLabel: "room" });
    expect(boxes(out).map(volume)).toEqual([32, 16, 16, 12, 24, 32, 60]);
    expect(tilingFailures(input, out)).toEqual([]);
  });

  it("tiles every cell of a varied set exactly, a field thickness included", async () => {
    const input = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[-3, 2, 5], [5, 2.5, 13]],
      [[1.25, -4, -2], [2, 8, 30]],
      [[100, 0, 100], [164, 16, 132]],
      [[0, 0, 0], [3, 3, 3]],
    ]);
    // Per face a different dyadic share of the span it cuts, so the five
    // cells get five different shells, all of them fitting.
    const thickness = f(
      'vec(box("sy") * 0.125, box("sz") * 0.25, box("sz") * 0.0625, box("sx") * 0.5, box("sx") * 0.25, box("sy") * 0.375)',
    );
    const out = await shell(input, { thickness, interiorLabel: "room" });
    expect(tilingFailures(input, out)).toEqual([]);
    // Nothing degenerate in this set: seven pieces per cell.
    expect(out.pointCount).toBe(35);
  });

  it("CONTROL: the tiling check reports an overlap and a missing volume", () => {
    const input = worked();
    const out = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [1, 1, 1]],
    ]);
    out.attrs.point.require("cell").set(1, 0);
    expect(tilingFailures(input, out)).toEqual(["cell 0 pieces 0 and 1 overlap", "cell 0: volumes sum to 193, box is 192"]);
  });

  it("a face not listed takes no thickness: without a ceiling the walls reach the top", async () => {
    const out = await shell(worked(), {
      faces: ["floor", "south", "north", "west", "east"],
      labels: ["floor", "wall", "wall", "wall", "wall"],
      thickness: [1],
    });
    expect(boxes(out)).toEqual([
      [[0, 0, 0], [8, 1, 4]],
      [[0, 1, 0], [8, 6, 1]],
      [[0, 1, 3], [8, 6, 4]],
      [[0, 1, 1], [1, 6, 3]],
      [[7, 1, 1], [8, 6, 3]],
    ]);
  });

  it("emits in the order of `faces`, the interior last", async () => {
    const out = await shell(worked(), {
      faces: ["east", "ceiling", "south"],
      labels: ["e", "c", "s"],
      thickness: [1],
      interiorLabel: "in",
    });
    expect(strings(out, "piece")).toEqual(["e", "c", "s", "in"]);
    expect(col(out, "face")).toEqual([4, 5, 1, 6]);
    expect(boxes(out)).toEqual([
      [[7, 0, 1], [8, 5, 4]], // east: between south (z 0..1) and the unlisted north
      [[0, 5, 0], [8, 6, 4]],
      [[0, 0, 0], [8, 5, 1]],
      [[0, 0, 1], [7, 5, 4]],
    ]);
  });

  it('a "" label is a GAP: the face takes its thickness and emits nothing', async () => {
    const out = await shell(worked(), {
      faces: ["floor", "south"],
      labels: ["", "wall"],
      thickness: [1],
    });
    expect(boxes(out)).toEqual([[[0, 1, 0], [8, 6, 1]]]);
  });

  it("drops a piece of no volume: a zero or negative thickness, and walls when floor and ceiling meet", async () => {
    // South thickness -2 counts as 0: no south wall, and west and east
    // reach z0.
    const a = await shell(worked(), {
      faces: ["south", "west", "east"],
      labels: ["s", "w", "e"],
      thickness: [-2, 1, 0],
    });
    expect(strings(a, "piece")).toEqual(["w"]);
    expect(boxes(a)).toEqual([[[0, 0, 0], [1, 6, 4]]]);
    // Floor 3 and ceiling 3 fill the height 6 exactly: no wall, no interior.
    const b = await shell(worked(), { thickness: [3, 1, 1, 1, 1, 3], interiorLabel: "in" });
    expect(strings(b, "piece")).toEqual(["floor", "ceiling"]);
    expect(boxes(b)).toEqual([
      [[0, 0, 0], [8, 3, 4]],
      [[0, 3, 0], [8, 6, 4]],
    ]);
  });

  it("a flat cell emits nothing when nothing of it has volume; a passed-through one is still emitted", async () => {
    const input = cells([
      [[0, 0, 0], [4, 0, 4]],
      [[0, 0, 0], [4, 0, 4]],
    ]);
    const where = f('lt(attribute("cell"), 1)');
    const out = await shell(input, { faces: ["south", "north"], labels: ["s", "n"], thickness: [1], where });
    expect(out.pointCount).toBe(1);
    expect(col(out, "cell")).toEqual([1]);
  });
});

describe("shellSplit: frames", () => {
  it("writes along, up and out axis codes, the along and up signs, and the outward normal per face", async () => {
    const out = await shell(worked(), { thickness: WORKED_T, interiorLabel: "room" });
    //                 floor south north west east ceiling interior
    expect(col(out, "alongAxis")).toEqual([0, 0, 0, 2, 2, 0, 0]);
    expect(col(out, "alongSign")).toEqual([1, -1, 1, 1, -1, 1, 1]);
    expect(col(out, "upAxis")).toEqual([2, 1, 1, 1, 1, 2, 1]);
    expect(col(out, "upSign")).toEqual([1, 1, 1, 1, 1, -1, 1]);
    expect(col(out, "outAxis")).toEqual([1, 2, 2, 0, 0, 1, 2]);
    expect(col(out, "outward")).toEqual([
      0, -1, 0, 0, 0, -1, 0, 0, 1, -1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0,
    ]);
  });

  it("is RIGHT-HANDED on every face: signed along x signed up = outward", async () => {
    const out = await shell(worked(), { thickness: WORKED_T, interiorLabel: "room" });
    const unit = (axis: number, sign: number) => [0, 1, 2].map((k) => (k === axis ? sign : 0));
    const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const [ax, as, ux, us, ox, n] = ["alongAxis", "alongSign", "upAxis", "upSign", "outAxis", "outward"].map((c) => col(out, c));
    for (let i = 0; i < out.pointCount; i++) {
      const c = cross(unit(ax[i], as[i]), unit(ux[i], us[i]));
      // The interior's outward is zero; its frame is still right-handed, out +z.
      const expected = i === 6 ? unit(ox[i], 1) : n.slice(i * 3, i * 3 + 3);
      expect(c.map((v) => v + 0)).toEqual(expected);
    }
  });

  it("on every wall, along runs LEFT TO RIGHT as seen from outside, and up is +y", async () => {
    const out = await shell(worked(), { faces: ["south", "north", "west", "east"], labels: ["s", "n", "w", "e"], thickness: [1] });
    const [ax, as, ux, us] = ["alongAxis", "alongSign", "upAxis", "upSign"].map((c) => col(out, c));
    const n = col(out, "outward");
    for (let i = 0; i < 4; i++) {
      // A viewer outside faces -outward with +y up; their right is
      // forward x up.
      const fwd = n.slice(i * 3, i * 3 + 3).map((v) => -v);
      const right = [fwd[1] * 0 - fwd[2] * 1, fwd[2] * 0 - fwd[0] * 0, fwd[0] * 1 - fwd[1] * 0];
      const along = [0, 1, 2].map((k) => (k === ax[i] ? as[i] : 0));
      expect(along).toEqual(right.map((v) => v + 0));
      expect([ux[i], us[i]]).toEqual([1, 1]);
    }
  });

  it("the outward normal points from the box's centre through the face", async () => {
    const out = await shell(worked(), { thickness: WORKED_T });
    const centre = [4, 3, 2];
    const n = col(out, "outward");
    boxes(out).forEach(([a, b], i) => {
      const c = [0, 1, 2].map((k) => (a[k] + b[k]) / 2 - centre[k]);
      const d = c[0] * n[i * 3] + c[1] * n[i * 3 + 1] + c[2] * n[i * 3 + 2];
      expect(d).toBeGreaterThan(0);
    });
  });

  it("the thickness runs along outAxis and the face spans alongAxis and upAxis", async () => {
    const out = await shell(worked(), { thickness: [0.25] });
    const along = col(out, "alongAxis");
    const up = col(out, "upAxis");
    const outAxis = col(out, "outAxis");
    boxes(out).forEach(([a, b], i) => {
      expect(b[outAxis[i]] - a[outAxis[i]]).toBe(0.25);
      expect(new Set([along[i], up[i], outAxis[i]]).size).toBe(3);
    });
  });

  it("is what splitBox perCell reads: one split cuts every wall into bays from its LEFT end", async () => {
    // 8 x 6 x 6, walls 1 thick: south and north run 8 along x, west and
    // east run 4 along z between them. Bays of 2, slot 0 at the left as
    // seen from outside: max x on the south wall, min x north, min z west,
    // max z east.
    const walls = await shell(cells([[[0, 0, 0], [8, 6, 6]]]), {
      faces: ["south", "north", "west", "east"],
      labels: ["wall", "wall", "wall", "wall"],
      thickness: [1],
    });
    const bays = firstGeo(
      (
        await runNode(
          splitBox,
          {
            axis: "perCell",
            axisIndex: f('attribute("alongAxis")'),
            direction: f('attribute("alongSign")'),
            labels: ["bay"],
            sizes: [2],
            units: ["repeat"],
          },
          { in: [makeGeometryItem(walls)] },
        )
      ).out,
    );
    expect(col(bays, "face")).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4]);
    expect(col(bays, "pieceIndex")).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 0, 1]);
    const along = col(bays, "alongAxis");
    const spans = boxes(bays).map(([a, b], i) => [a[along[i]], b[along[i]]]);
    expect(spans).toEqual([
      [6, 8], [4, 6], [2, 4], [0, 2],
      [0, 2], [2, 4], [4, 6], [6, 8],
      [1, 3], [3, 5],
      [3, 5], [1, 3],
    ]);
    // ...and the wall's length along its run is one expression for all four.
    const len = firstGeo(
      (
        await runNode(
          setAttribute,
          { name: "len", type: "f32", value: f('choose(attribute("alongAxis"), box("sx"), box("sy"), box("sz"))') },
          { in: [makeGeometryItem(walls)] },
        )
      ).out,
    );
    expect(col(len, "len")).toEqual([8, 8, 4, 4]);
  });

  it("one rule places an ASYMMETRIC facade correctly on all four walls, checked from outside", async () => {
    // The reviewer's reproduction: two cells (one off the origin), a shell,
    // bays from the left of every wall, then ONE applyRules rule for "bay"
    // that makes bay 0 a door and every other bay a window, flush with the
    // outer face. Seen by a viewer standing outside each wall, the door
    // must be the LEFTMOST opening, and each opening's position from the
    // left must be (pieceIndex + 0.5) / bayCount — no per-wall fix-up.
    const T = 0.4;
    const D = 0.1;
    const lo = `let({ o: attribute("outward", 3), m: abs(attribute("outward", 3)) }, box("center") + o * (box("size") * 0.5 - ${D / 2}) - ((1 - m) * box("size") * 0.25 + m * ${D / 2}))`;
    const hi = `let({ o: attribute("outward", 3), m: abs(attribute("outward", 3)) }, box("center") + o * (box("size") * 0.5 - ${D / 2}) + ((1 - m) * box("size") * 0.25 + m * ${D / 2}))`;
    const F = (t: string) => parseFieldText(t);
    const graph = {
      formatVersion: 1,
      seed: 7,
      nodes: [
        { id: "pts", type: "pointLine", params: { mode: "endpoints", count: 2, start: [0, 0, 0], end: [23, 1, -17] } },
        { id: "box", type: "setBounds", params: { boundsMin: F("position()"), boundsMax: F("position() + vec(12, 3, 8)") } },
        { id: "shell", type: "shellSplit", params: { thickness: [T] } },
        {
          id: "bays",
          type: "splitBox",
          params: {
            axis: "perCell",
            axisIndex: F('attribute("alongAxis")'),
            direction: F('attribute("alongSign")'),
            labels: ["bay"],
            sizes: [2],
            units: ["repeat"],
            where: F('attributeIs("piece", "wall")'),
            countAttr: "bayCount",
          },
        },
        {
          id: "grammar",
          type: "applyRules",
          params: { maxDepth: 4 },
          subgraph: {
            graph: {
              formatVersion: 1,
              seed: 0,
              nodes: [
                { id: "winBox", type: "setBounds", params: { boundsMin: F(lo), boundsMax: F(hi) } },
                {
                  id: "kind",
                  type: "setAttribute",
                  params: { name: "piece", type: "string", values: ["window", "door"], value: F('attribute("pieceIndex") == 0') },
                },
                { id: "tLeft", type: "setAttribute", params: { name: "tLeft", type: "f32", value: F('(attribute("pieceIndex") + 0.5) / attribute("bayCount")') } },
              ],
              connections: [
                { from: ["winBox", "out"], to: ["kind", "in"] },
                { from: ["kind", "out"], to: ["tLeft", "in"] },
              ],
              outputs: [],
            },
            inputs: [{ name: "bay", node: "winBox", pin: "in" }],
            outputs: [{ name: "bay", node: "tLeft", pin: "out" }],
          },
        },
      ],
      connections: [
        { from: ["pts", "out"], to: ["box", "in"] },
        { from: ["box", "out"], to: ["shell", "in"] },
        { from: ["shell", "out"], to: ["bays", "in"] },
        { from: ["bays", "out"], to: ["grammar", "in"] },
      ],
      outputs: [
        { id: "shell", pin: "out", name: "shell" },
        { id: "grammar", pin: "out", name: "result" },
      ],
    };
    const res = await cook(deserializeGraph(JSON.parse(JSON.stringify(graph))));
    const sh = firstGeo(res.outputs.shell);
    const out = firstGeo(res.outputs.result);
    // The walls, keyed by cell (its box's min corner) and face.
    const shBoxes = boxes(sh);
    const shFace = col(sh, "face");
    const wallOf = (lo: number[], face: number): Box =>
      shBoxes.find(([a, b], i) => shFace[i] === face && [0, 1, 2].every((k) => lo[k] >= a[k] - 1e-4 && lo[k] <= b[k] + 1e-4))!;
    const labels = strings(out, "piece");
    const faces = col(out, "face");
    const n = col(out, "outward");
    const tLeft = col(out, "tLeft");
    const perWall = new Map<string, { label: string; t: number }[]>();
    let openings = 0;
    boxes(out).forEach(([a, b], i) => {
      if (labels[i] !== "window" && labels[i] !== "door") return;
      openings++;
      const wall = wallOf(a, faces[i]);
      const o = n.slice(i * 3, i * 3 + 3);
      const right = [o[2], 0, -o[0]]; // (-outward) x (0, 1, 0)
      const wc = [0, 1, 2].map((k) => (wall[0][k] + wall[1][k]) / 2);
      const c = [0, 1, 2].map((k) => (a[k] + b[k]) / 2);
      const lateral = [0, 1, 2].reduce((s, k) => s + (c[k] - wc[k]) * right[k], 0);
      const half = [0, 1, 2].reduce((s, k) => s + ((wall[1][k] - wall[0][k]) / 2) * Math.abs(right[k]), 0);
      const tViewer = (lateral + half) / (2 * half);
      expect(Math.abs(tViewer - tLeft[i])).toBeLessThan(1e-4);
      const key = `${wall[0].join(",")}:${faces[i]}`;
      perWall.set(key, [...(perWall.get(key) ?? []), { label: labels[i], t: tViewer }]);
    });
    expect(openings).toBe(36);
    expect(perWall.size).toBe(8);
    for (const list of perWall.values()) {
      const doors = list.filter((x) => x.label === "door");
      expect(doors.length).toBe(1);
      expect(Math.min(...list.map((x) => x.t))).toBe(doors[0].t);
    }
  });
});

describe("shellSplit: the documented idioms, on every wall", () => {
  /** A 12 x 3 x 8 cell, walls 1 thick, and one setAttribute per idiom. */
  async function walls(): Promise<Geometry> {
    return shell(cells([[[0, 0, 0], [12, 3, 8]]]), {
      faces: ["south", "north", "west", "east"],
      labels: ["wall", "wall", "wall", "wall"],
      thickness: [1],
    });
  }
  async function vec3(geo: Geometry, text: string): Promise<number[][]> {
    const out = firstGeo(
      (await runNode(setAttribute, { name: "v", type: "f32", tupleSize: 3, value: f(text) }, { in: [makeGeometryItem(geo)] })).out,
    );
    const v = col(out, "v");
    return Array.from({ length: out.pointCount }, (_, i) => v.slice(i * 3, i * 3 + 3));
  }
  /** Per wall: its out axis, the outward sign, and the outer face's coordinate on that axis. */
  function outer(geo: Geometry): { oa: number; s: number; plane: number }[] {
    const oa = col(geo, "outAxis");
    const n = col(geo, "outward");
    return boxes(geo).map(([a, b], i) => {
      const s = n[i * 3 + oa[i]];
      return { oa: oa[i], s, plane: s > 0 ? b[oa[i]] : a[oa[i]] };
    });
  }

  it('the outer face\'s centre is box("center") + attribute("outward", 3) * box("size") * 0.5', async () => {
    const geo = await walls();
    const p = await vec3(geo, 'box("center") + attribute("outward", 3) * box("size") * 0.5');
    const o = outer(geo);
    boxes(geo).forEach(([a, b], i) => {
      for (let k = 0; k < 3; k++) expect(p[i][k]).toBe(k === o[i].oa ? o[i].plane : (a[k] + b[k]) / 2);
    });
  });

  it("a probe d outside the outer face adds d to that, on every wall", async () => {
    const geo = await walls();
    const p = await vec3(geo, 'box("center") + attribute("outward", 3) * (box("size") * 0.5 + 0.5)');
    outer(geo).forEach(({ oa, s, plane }, i) => expect((p[i][oa] - plane) * s).toBe(0.5));
  });

  it("a piece moved out by d adds outward * d to BOTH corners: same size, outer face d further out", async () => {
    const geo = await walls();
    const moved = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: f('box("lo") + attribute("outward", 3) * 0.25'), boundsMax: f('box("hi") + attribute("outward", 3) * 0.25') },
          { in: [makeGeometryItem(geo)] },
        )
      ).out,
    );
    const before = outer(geo);
    const after = outer(moved);
    boxes(moved).forEach((b, i) => {
      expect(volume(b)).toBe(volume(boxes(geo)[i]));
      expect((after[i].plane - before[i].plane) * before[i].s).toBe(0.25);
    });
  });

  it("leaves from the outside in: slot 0 is the OUTER leaf on every wall", async () => {
    const geo = await walls();
    const leaves = firstGeo(
      (
        await runNode(
          splitBox,
          {
            axis: "perCell",
            axisIndex: f('attribute("outAxis")'),
            direction: f('dot(attribute("outward", 3), vec(-1, -1, -1))'),
            labels: ["outer", "inner"],
            sizes: [0.25, 1],
            units: ["absolute", "relative"],
          },
          { in: [makeGeometryItem(geo)] },
        )
      ).out,
    );
    expect(strings(leaves, "piece")).toEqual(["outer", "inner", "outer", "inner", "outer", "inner", "outer", "inner"]);
    const o = outer(geo);
    boxes(leaves).forEach(([a, b], i) => {
      const w = o[Math.floor(i / 2)];
      const touches = w.s > 0 ? b[w.oa] === w.plane : a[w.oa] === w.plane;
      expect(touches).toBe(i % 2 === 0);
      expect(b[w.oa] - a[w.oa]).toBe(i % 2 === 0 ? 0.25 : 0.75);
    });
  });
});

describe("shellSplit: frames (continued)", () => {
  it("box names keep their world meaning: box(\"sx\") is the x extent on every face", async () => {
    const out = await shell(worked(), { thickness: WORKED_T });
    const sx = firstGeo(
      (await runNode(setAttribute, { name: "sx", type: "f32", value: f('box("sx")') }, { in: [makeGeometryItem(out)] })).out,
    );
    expect(col(sx, "sx")).toEqual([8, 8, 8, 1, 2, 8]);
  });
});

describe("shellSplit: rotated and moved cells", () => {
  it("reads the box as stored: P, rot and scale are not read, and ride onto every piece", async () => {
    const plain = await shell(worked(), { thickness: WORKED_T });
    const geo = worked();
    const q = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    geo.attrs.point.require("rot").setTuple(0, q);
    geo.attrs.point.require("P").setTuple(0, [7, 8, 9]);
    geo.attrs.point.require("scale").setTuple(0, [2, 3, 4]);
    const out = await shell(geo, { thickness: WORKED_T });
    expect(boxes(out)).toEqual(boxes(plain));
    expect(col(out, "outward")).toEqual(col(plain, "outward"));
    const rot = col(out, "rot");
    const P = col(out, "P");
    const scale = col(out, "scale");
    for (let i = 0; i < out.pointCount; i++) {
      expect(rot.slice(i * 4, i * 4 + 4)).toEqual(Array.from(new Float32Array(q)));
      expect(P.slice(i * 3, i * 3 + 3)).toEqual([7, 8, 9]);
      expect(scale.slice(i * 3, i * 3 + 3)).toEqual([2, 3, 4]);
    }
  });
});

describe("shellSplit: thickness", () => {
  it("one entry serves every face; one per face is read in faces order", async () => {
    const one = await shell(worked(), { thickness: [1] });
    const six = await shell(worked(), { thickness: [1, 1, 1, 1, 1, 1] });
    expect(boxes(one)).toEqual(boxes(six));
  });

  it("as a field it is resolved on the PARENT cell, box names reading the parent's box", async () => {
    const input = cells([
      [[0, 0, 0], [4, 8, 4]],
      [[0, 0, 0], [4, 16, 4]],
    ]);
    const out = await shell(input, { faces: ["floor", "ceiling"], labels: ["f", "c"], thickness: f('vec(box("sy") * 0.25, 1)') });
    expect(boxes(out)).toEqual([
      [[0, 0, 0], [4, 2, 4]],
      [[0, 7, 0], [4, 8, 4]],
      [[0, 0, 0], [4, 4, 4]],
      [[0, 15, 0], [4, 16, 4]],
    ]);
  });

  it("a scalar field serves every face", async () => {
    const out = await shell(worked(), { faces: ["west", "east"], labels: ["w", "e"], thickness: f('box("sx") * 0.125') });
    expect(boxes(out)).toEqual([
      [[0, 0, 0], [1, 6, 4]],
      [[7, 0, 0], [8, 6, 4]],
    ]);
  });

  it("refuses a plain list of the wrong length, and a field of the wrong width", async () => {
    expect(await rejection(shell(worked(), { thickness: [1, 2] }))).toMatch(
      /param "thickness" has 2 entries but "faces" has 6 .*ONE thickness for every face, or one per face/,
    );
    expect(await rejection(shell(worked(), { thickness: f("vec(1, 2)") }))).toMatch(
      /param "thickness" must evaluate to ONE component, or ONE PER FACE — 6 for faces .* tupleSize 2/,
    );
  });

  it("refuses a non-finite thickness from a field, naming the param", async () => {
    expect(await rejection(shell(worked(), { thickness: f("1 / 0") }))).toMatch(/thickness/);
  });
});

describe("shellSplit: fit", () => {
  const tall2 = (): Geometry => cells([[[0, 0, 0], [4, 2, 4]]]);
  const pair = (t: number[], fit: string) =>
    shell(tall2(), { faces: ["floor", "ceiling"], labels: ["f", "c"], thickness: t, fit, interiorLabel: "in" });

  it('"error" refuses opposite faces thicker than the span, naming the cell, faces, axis and numbers', async () => {
    const msg = await rejection(pair([1.5, 1], "error"));
    expect(msg).toMatch(/shellSplit: cell 0's floor and ceiling OVERLAP — together 2.5 thick \(1.5 \+ 1\) along y, but its box is 2 across \(0 to 2\)/);
    expect(msg).toMatch(/"fit" to "clip".*"scale"/);
  });

  it('"error" is the default, and refuses a wall pair too', async () => {
    const msg = await rejection(shell(cells([[[0, 0, 0], [1, 4, 4]]]), { thickness: [1] }));
    expect(msg).toMatch(/cell 0's west and east OVERLAP — together 2 thick \(1 \+ 1\) along x, but its box is 1 across/);
  });

  it('"clip": the min-side face keeps its thickness, the max-side face gets the rest', async () => {
    expect(boxes(await pair([1.5, 1], "clip"))).toEqual([
      [[0, 0, 0], [4, 1.5, 4]],
      [[0, 1.5, 0], [4, 2, 4]],
    ]);
    // A min-side face past the whole span leaves its opposite nothing.
    const out = await pair([3, 1], "clip");
    expect(strings(out, "piece")).toEqual(["f"]);
    expect(boxes(out)).toEqual([[[0, 0, 0], [4, 2, 4]]]);
  });

  it('"scale": both shrink in proportion until they meet', async () => {
    expect(boxes(await pair([3, 1], "scale"))).toEqual([
      [[0, 0, 0], [4, 1.5, 4]],
      [[0, 1.5, 0], [4, 2, 4]],
    ]);
  });

  it("an exact fill fits under every mode and leaves no interior", async () => {
    for (const fit of ["error", "clip", "scale"]) {
      const out = await pair([0.5, 1.5], fit);
      expect(strings(out, "piece")).toEqual(["f", "c"]);
      expect(boxes(out)).toEqual([
        [[0, 0, 0], [4, 0.5, 4]],
        [[0, 0.5, 0], [4, 2, 4]],
      ]);
    }
  });

  it("a fill within f32 precision meets without a sliver, off round numbers", async () => {
    // x from f32(0.1) to f32(0.6): 0.1 + 0.4 fills it to f32 precision, but
    // the two planes, each computed from its own side, are 1.5e-8 apart
    // with the east one further out — two different f32s once stored, so
    // unless they are made to meet a sliver of interior survives between
    // the walls. (Found by search; 0.3 + 0.3 on 0.1 .. 0.7 crosses
    // instead, which the clamp alone already handles.)
    const input = cells([[[0.1, 0, 0], [0.6, 1, 1]]]);
    const out = await shell(input, { faces: ["west", "east"], labels: ["w", "e"], thickness: [0.1, 0.4], interiorLabel: "in" });
    expect(strings(out, "piece")).toEqual(["w", "e"]);
    const [w, e] = boxes(out);
    expect(w[1][0]).toBe(e[0][0]);
    expect(w[0][0]).toBe(Math.fround(0.1));
    expect(e[1][0]).toBe(Math.fround(0.6));
  });

  it("a face that fills its span to f32 precision leaves its opposite nothing, not a sliver", async () => {
    // West alone 0.3 on f32(1.3) .. f32(1.6), east listed at 0: the west
    // plane lands 6e-8 short of the box's max side — a different f32 — and
    // IS that side, so the interior is not a sliver. (Found by search.)
    const input = cells([[[1.3, 0, 0], [1.6, 1, 1]]]);
    const out = await shell(input, { faces: ["west", "east"], labels: ["w", "e"], thickness: [0.3, 0], interiorLabel: "in" });
    expect(strings(out, "piece")).toEqual(["w"]);
    expect(boxes(out)[0][1][0]).toBe(Math.fround(1.6));
  });

  it("far from the origin, a fill to the coordinate's f32 step fits rather than overlapping", async () => {
    // 100000.1 .. 100000.3 is stored 100000.1015625 .. 100000.296875, a
    // span of 0.1953125: 0.1 + 0.1 is 0.0047 over it, less than one f32
    // step (1/128) there. That is storage, not an overlap.
    const input = cells([[[100000.1, 0, 0], [100000.3, 1, 1]]]);
    const out = await shell(input, { faces: ["west", "east"], labels: ["w", "e"], thickness: [0.1], interiorLabel: "in" });
    expect(strings(out, "piece")).toEqual(["w", "e"]);
    const [w, e] = boxes(out);
    expect(w[1][0]).toBe(e[0][0]);
    // ...and a real overlap there is still refused.
    expect(await rejection(shell(input, { faces: ["west", "east"], labels: ["w", "e"], thickness: [0.15] }))).toMatch(
      /west and east OVERLAP/,
    );
  });

  it("names the one face when its opposite is not there: a floor alone thicker than the box", async () => {
    const msg = await rejection(shell(cells([[[0, 0, 0], [4, 2, 4]]]), { faces: ["floor"], labels: ["f"], thickness: [3] }));
    expect(msg).toMatch(/cell 0's floor is 3 thick along y, but its box is only 2 across \(0 to 2\), so the floor alone is thicker than the box/);
    expect(msg).not.toMatch(/ceiling/);
  });

  it("a box narrower than two f32 steps still tiles: an absent face never snaps", async () => {
    // The reviewer's reproduction: x spans ONE f32 step at 1e5, and no face
    // is cut along x. The interior must still cover y 1 .. 3.
    const input = cells([[[100000, 0, 0], [100000.0078125, 4, 4]]]);
    const out = await shell(input, { faces: ["floor", "ceiling"], labels: ["f", "c"], thickness: [1], interiorLabel: "in" });
    expect(strings(out, "piece")).toEqual(["f", "c", "in"]);
    expect(tilingFailures(input, out)).toEqual([]);
  });

  it("refuses an unknown fit", async () => {
    expect(await rejection(shell(worked(), { fit: "shrink" }))).toMatch(/param "fit" is "shrink"; valid: error, clip, scale/);
  });
});

describe("shellSplit: params", () => {
  it("refuses an unknown face with a suggestion and the valid list", async () => {
    const msg = await rejection(shell(worked(), { faces: ["floor", "sout"], labels: ["a", "b"] }));
    expect(msg).toMatch(/param "faces" entry 1 is "sout", which is not a face; did you mean "south"\? faces: floor, south, north, west, east, ceiling/);
  });

  it("refuses a face listed twice", async () => {
    expect(await rejection(shell(worked(), { faces: ["west", "east", "west"], labels: ["a", "b", "c"] }))).toMatch(
      /lists "west" twice \(entries 0 and 2\)/,
    );
  });

  it("refuses labels of another length, and an empty face list", async () => {
    expect(await rejection(shell(worked(), { faces: ["floor", "south"], labels: ["a"] }))).toMatch(
      /param "labels" has 1 entry but "faces" has 2/,
    );
    expect(await rejection(shell(worked(), { faces: [], labels: [] }))).toMatch(/param "faces" is empty/);
  });

  it("refuses a box that is inside out, and one that is not finite, naming the cell and axis", async () => {
    expect(await rejection(shell(cells([[[0, 5, 0], [4, 1, 4]]]), {}))).toMatch(
      /cell 0's box is inside out along y — boundsMin 5 is above boundsMax 1/,
    );
    expect(await rejection(shell(cells([[[0, 0, 0], [Infinity, 1, 4]]]), {}))).toMatch(/cell 0's box is not finite along x/);
  });

  it("refuses an input with no box", async () => {
    const geo = createPointCloud(1);
    geo.attrs.point.remove("boundsMax");
    expect(await rejection(shell(geo, {}))).toMatch(/has no "boundsMax" point attribute.*setBounds/);
  });

  it("refuses a seed column of the wrong type", async () => {
    const geo = createPointCloud(1);
    geo.attrs.point.remove("seed");
    geo.attrs.point.add("seed", "f32", 1, 0);
    expect(await rejection(shell(geo, {}))).toMatch(/"seed" must be u32 with tupleSize 1/);
  });

  it("refuses a standard attribute name, two slots under one name, and a column of another shape", async () => {
    expect(await rejection(shell(worked(), { faceAttr: "seed" }))).toMatch(/"faceAttr" cannot write "seed"/);
    expect(await rejection(shell(worked(), { outwardAttr: "P" }))).toMatch(/"outwardAttr" cannot write "P"/);
    expect(await rejection(shell(worked(), { alongAxisAttr: "ax", outAxisAttr: "ax" }))).toMatch(
      /"alongAxisAttr" and "outAxisAttr" are both "ax"/,
    );
    const geo = worked();
    geo.attrs.point.add("outward", "f32", 1, 0);
    expect(await rejection(shell(geo, {}))).toMatch(/outwardAttr "outward" already exists on the input's point domain as f32/);
  });

  it("empty attr names write no column", async () => {
    const out = await shell(worked(), {
      labelAttr: "",
      faceAttr: "",
      alongAxisAttr: "",
      upAxisAttr: "",
      outAxisAttr: "",
      outwardAttr: "",
    });
    for (const name of ["piece", "face", "alongAxis", "upAxis", "outAxis", "outward"]) {
      expect(out.attrs.point.has(name)).toBe(false);
    }
    expect(out.pointCount).toBe(6);
  });
});

describe("shellSplit: where (pass-through)", () => {
  it("passes a cell where `where` is 0 through unsplit, with the slot columns' defaults", async () => {
    const input = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [8, 6, 4]],
    ]);
    const out = await shell(input, { thickness: [1], where: f('eq(attribute("cell"), 1)') });
    expect(out.pointCount).toBe(7);
    expect(col(out, "cell")).toEqual([0, 1, 1, 1, 1, 1, 1]);
    expect(boxes(out)[0]).toEqual([[0, 0, 0], [8, 6, 4]]);
    expect(col(out, "seed")[0]).toBe(100);
    expect(strings(out, "piece")[0]).toBe("");
    expect(col(out, "face")[0]).toBe(-1);
    expect(col(out, "alongAxis")[0]).toBe(-1);
    expect(col(out, "outward").slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("keeps the values a passed-through cell already carried in the slot columns", async () => {
    const input = cells([[[0, 0, 0], [8, 6, 4]]]);
    input.attrs.point.add("piece", "string", 1).setString(0, "mass");
    input.attrs.point.add("face", "i32", 1, 9);
    const out = await shell(input, { where: 0 });
    expect(strings(out, "piece")).toEqual(["mass"]);
    expect(col(out, "face")).toEqual([9]);
  });
});

describe("shellSplit: attributes", () => {
  it("carries every point attribute of every type onto every piece, and the detail domain", async () => {
    const geo = worked();
    const pts = geo.attrs.point;
    pts.add("h", "f32", 1, 0).set(0, 2.5);
    pts.add("tag", "u32", 1, 0).set(0, 4000000000);
    pts.add("kind", "string", 1).setString(0, "house");
    geo.attrs.detail.add("note", "f32", 1, 42);
    const out = await shell(geo, { thickness: [1] });
    expect(col(out, "h")).toEqual(Array(6).fill(2.5));
    expect(col(out, "tag")).toEqual(Array(6).fill(4000000000));
    expect(strings(out, "kind")).toEqual(Array(6).fill("house"));
    expect(out.attrs.detail.require("note").get(0)).toBe(42);
  });

  it("does not mutate its input", async () => {
    const geo = worked();
    const before = snapshotGeometry(geo);
    await shell(geo, { thickness: WORKED_T, interiorLabel: "room" });
    expect(snapshotGeometry(geo)).toEqual(before);
  });

  it("drops topology", async () => {
    const path = createPolyline([0, 0, 0, 1, 0, 0]);
    path.attrs.point.add("boundsMin", "f32", 3, [0, 0, 0]);
    path.attrs.point.add("boundsMax", "f32", 3, [4, 4, 4]);
    const out = await shell(path, { thickness: [1] });
    expect(out.pointCount).toBe(12);
    expect(out.attrs.primitive.count).toBe(0);
    expect(out.attrs.vertex.count).toBe(0);
  });

  it("rewrites a same-shape label column on the pieces", async () => {
    const geo = worked();
    geo.attrs.point.add("piece", "string", 1).setString(0, "mass");
    const out = await shell(geo, { thickness: [1] });
    expect(strings(out, "piece")).toEqual(["floor", "wall", "wall", "wall", "wall", "ceiling"]);
  });
});

describe("shellSplit: seeds and determinism", () => {
  it("the piece of face code k of a cell with seed s gets hashCombine(s, k), past 2^31 too", async () => {
    const geo = cells([
      [[0, 0, 0], [8, 6, 4]],
      [[0, 0, 0], [8, 6, 4]],
    ]);
    geo.attrs.point.require("seed").set(1, 0xfffffff0);
    const out = await shell(geo, { thickness: [1], interiorLabel: "in" });
    const expected = [100, 0xfffffff0].flatMap((s) => [0, 1, 2, 3, 4, 5, 6].map((k) => hashCombine(s, k)));
    expect(col(out, "seed")).toEqual(expected);
  });

  it("a piece's seed is its face's: reordering faces or dropping a sibling moves none", async () => {
    const all = await shell(worked(), { thickness: [1] });
    const seedOf = new Map(col(all, "face").map((k, i) => [k, col(all, "seed")[i]]));
    const some = await shell(worked(), { faces: ["east", "floor", "north"], labels: ["e", "f", "n"], thickness: [1] });
    col(some, "face").forEach((k, i) => expect(col(some, "seed")[i]).toBe(seedOf.get(k)));
  });

  it("does not depend on the node seed when its fields do not", async () => {
    const a = await shell(worked(), {}, 1);
    const b = await shell(worked(), {}, 999);
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
  });

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
      shell: () =>
        g.add(
          shellSplit,
          {
            // A random wall thickness drawn on the PARENT: all four walls
            // of a cell agree on it.
            thickness: fieldFromJson({ fn: "vec", args: [1, { fn: "add", args: [0.5, { fn: "randomField" }] }, 1] }),
            faces: ["floor", "south", "ceiling"],
            labels: ["floor", "wall", "ceiling"],
            interiorLabel: "room",
          },
          "shell",
        ),
      tint: () =>
        g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
    };
    const ids = order === "forward" ? ["grid", "box", "shell", "tint"] : ["tint", "shell", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.shell, "in");
    g.connect(h.shell, "out", h.tint, "in");
    g.output(h.tint, "out", "pieces");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(build("forward"))).outputs.pieces);
    const c = firstGeo((await cook(build("reverse"))).outputs.pieces);
    expect(a.pointCount).toBe(24);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("the parent-drawn thickness is shared: each cell's south wall and interior meet", async () => {
    const out = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = boxes(out);
    for (let i = 0; i < b.length; i += 4) {
      const south = b[i + 1];
      const room = b[i + 3];
      expect(south[1][2]).toBe(room[0][2]);
      expect(south[1][2] - south[0][2]).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("round-trips through the serialized format, a field thickness included, and cooks the same", async () => {
    const json = serializeGraph(build("forward"));
    const text = JSON.stringify(json);
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.pieces);
    const b = firstGeo((await cook(back)).outputs.pieces);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });

  it("loads a plain thickness list from JSON", async () => {
    const json = serializeGraph(build("forward"));
    const node = json.nodes.find((n) => n.id === "shell")!;
    (node.params as Record<string, unknown>).thickness = [1, 2, 1];
    const g = deserializeGraph(JSON.parse(JSON.stringify(json)));
    const out = firstGeo((await cook(g)).outputs.pieces);
    expect(boxes(out).slice(0, 4)).toEqual([
      [[0, 0, 0], [8, 1, 4]],
      [[0, 1, 0], [8, 5, 2]],
      [[0, 5, 0], [8, 6, 4]],
      [[0, 1, 2], [8, 5, 4]],
    ]);
  });
});

describe("shellSplit: the same parts as the five-copy spelling", () => {
  /**
   * The brick house's parts: repeatPoints(count = 5) then setBounds with a
   * choose of five corners per corner — slab, then walls S N W E, the S and
   * N walls owning the corners. shellSplit with faces floor, south, north,
   * west, east and thickness 1 must be the same points: boxes, seeds and P,
   * and the random draws taken after them.
   */
  async function viaRepeat(geo: Geometry): Promise<Geometry> {
    const rep = firstGeo((await runNode(repeatPoints, { count: 5, indexAttr: "face" }, { in: [makeGeometryItem(geo)] })).out);
    const k = 'attribute("face")';
    const lo = `choose(${k}, box("lo"), box("lo") + vec(0, 1, 0), vec(box("x0"), box("y0") + 1, box("z1") - 1), vec(box("x0"), box("y0") + 1, box("z0") + 1), vec(box("x1") - 1, box("y0") + 1, box("z0") + 1))`;
    const hi = `choose(${k}, vec(box("x1"), box("y0") + 1, box("z1")), vec(box("x1"), box("y1"), box("z0") + 1), box("hi"), vec(box("x0") + 1, box("y1"), box("z1") - 1), vec(box("x1"), box("y1"), box("z1") - 1))`;
    return firstGeo((await runNode(setBounds, { boundsMin: f(lo), boundsMax: f(hi) }, { in: [makeGeometryItem(rep)] })).out);
  }
  async function viaShell(geo: Geometry): Promise<Geometry> {
    return shell(geo, {
      faces: ["floor", "south", "north", "west", "east"],
      labels: ["floor", "wall", "wall", "wall", "wall"],
      thickness: [1],
    });
  }
  async function draw(geo: Geometry): Promise<number[]> {
    const out = firstGeo(
      (
        await runNode(
          setAttribute,
          { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) },
          { in: [makeGeometryItem(geo)] },
          5,
        )
      ).out,
    );
    return col(out, "r");
  }
  async function differences(a: Geometry, b: Geometry): Promise<string[]> {
    const diffs: string[] = [];
    for (const name of ["P", "seed", "boundsMin", "boundsMax", "face"]) {
      if (JSON.stringify(col(a, name)) !== JSON.stringify(col(b, name))) diffs.push(name);
    }
    if (JSON.stringify(await draw(a)) !== JSON.stringify(await draw(b))) diffs.push("downstream randomField");
    return diffs;
  }
  function input(): Geometry {
    const geo = cells([
      [[0, 0, 0], [8, 16, 6]],
      [[6, 16, 2], [12, 32, 9]],
      [[-9, 0, -4], [0, 16, 4]],
    ]);
    geo.attrs.point.require("P").setTuple(1, [1, 2, 3]);
    geo.attrs.point.require("seed").set(2, 0xdeadbeef);
    return geo;
  }

  it("is identical, downstream randomness included", async () => {
    const a = await viaRepeat(input());
    const b = await viaShell(input());
    expect(b.pointCount).toBe(15);
    expect(await differences(a, b)).toEqual([]);
  });

  it("CONTROL: the comparison reports a seed that differs", async () => {
    const changed = input();
    changed.attrs.point.require("seed").set(0, 101);
    const a = await viaRepeat(changed);
    const b = await viaShell(input());
    expect(await differences(a, b)).toEqual(["seed", "downstream randomField"]);
  });
});
