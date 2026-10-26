/**
 * `brickConnectivity`: which clutch-connected piece each brick belongs to,
 * and the build step at which it can be placed.
 *
 * WHAT THIS SUITE PINS is the contract in the node's description, checked
 * against an oracle the test builds itself from the boxes: two bricks are
 * joined when one's bottom face lies on the other's top face with
 * overlapping footprints (an O(n^2) pair test, nothing like the node's
 * occupancy grid), pieces are numbered by their lowest point identity, and a
 * build order is simulated course by course to a fixpoint. None of the
 * expected numbers were read off a run.
 *
 * Fixtures are written in lattice cells; most use a pitch of [1, 1, 1] so a
 * box reads as the cells it covers. The agreement suite runs on the default
 * [1, 0.4, 1] proportion with a shifted origin, through packBricks.
 */
import { describe, expect, it } from "vitest";
import { createPointCloud, type Geometry } from "../data/index.js";
import { canonicalPointRanks } from "../data/identity.js";
import { attribute } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import {
  brickConnectivity,
  packBricks,
  type BrickConnectivityParams,
} from "./bricks.js";
import {
  firstGeo,
  permutePoints,
  runNode,
  shuffledOrder,
  snapshotGeometry,
} from "./nodes.testsupport.js";
import { transferByIndex } from "./transferByIndex.js";

type V3 = [number, number, number];

/** One brick, in lattice cells: `lo` inclusive, `hi` exclusive. */
interface BoxSpec {
  lo: V3;
  hi: V3;
  /** An i32 the test reads back to tell bricks apart; defaults to the index. */
  tag?: number;
  seed?: number;
}

const UNIT: V3 = [1, 1, 1];
const PLATE: V3 = [1, 0.4, 1];
const ZERO: V3 = [0, 0, 0];

/**
 * A cloud of one point per box, P at its world centre and its corners
 * LOCAL to P (world = P + corner), as every box node reads them.
 */
function boxCloud(specs: readonly BoxSpec[], pitch: V3 = UNIT, origin: V3 = ZERO): Geometry {
  const geo = createPointCloud(specs.length);
  const pts = geo.attrs.point;
  const P = pts.require("P");
  const bMin = pts.require("boundsMin");
  const bMax = pts.require("boundsMax");
  const seed = pts.require("seed");
  const tag = pts.add("tag", "i32", 1, 0);
  specs.forEach((s, i) => {
    const lo = s.lo.map((v, c) => (origin[c] as number) + v * (pitch[c] as number));
    const hi = s.hi.map((v, c) => (origin[c] as number) + v * (pitch[c] as number));
    const centre = lo.map((a, c) => Math.fround(0.5 * (a + (hi[c] as number))));
    P.setTuple(i, centre);
    bMin.setTuple(i, lo.map((a, c) => a - (centre[c] as number)));
    bMax.setTuple(i, hi.map((b, c) => b - (centre[c] as number)));
    seed.set(i, s.seed ?? hashCombine(0xc0de, i));
    tag.set(i, s.tag ?? i);
  });
  return geo;
}

async function connect(geo: Geometry, params: Partial<BrickConnectivityParams> = {}): Promise<Geometry> {
  const r = await runNode(brickConnectivity, { pitch: UNIT, ...params }, { in: [makeGeometryItem(geo)] });
  return firstGeo(r.out);
}

async function refusal(geo: Geometry, params: Partial<BrickConnectivityParams> = {}): Promise<string> {
  try {
    await connect(geo, params);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected brickConnectivity to refuse this input, but it cooked");
}

function column(geo: Geometry, name: string): number[] {
  const col = geo.attrs.point.require(name);
  expect(col.type).toBe("i32");
  expect(col.tupleSize).toBe(1);
  return Array.from({ length: geo.pointCount }, (_, i) => col.get(i));
}

/**
 * Read boxes back as WORLD boxes, in cells: each point's local corners
 * mapped through P, rot (a quarter turn about y at most) and scale, the
 * axis-aligned box of the eight. Written here from the reading, sharing no
 * code with the node.
 */
function readBoxes(geo: Geometry, pitch: V3 = UNIT, origin: V3 = ZERO): BoxSpec[] {
  const pts = geo.attrs.point;
  const bMin = pts.require("boundsMin");
  const bMax = pts.require("boundsMax");
  const cell = (v: number, c: number) => Math.round((v - (origin[c] as number)) / (pitch[c] as number));
  return Array.from({ length: geo.pointCount }, (_, i) => {
    const P = pts.require("P").getTuple(i);
    const [, qy, , qw] = pts.require("rot").getTuple(i);
    const s = pts.require("scale").getTuple(i);
    // About y by theta: x' = cos x + sin z, z' = -sin x + cos z.
    const theta = 2 * Math.atan2(qy as number, qw as number);
    const cs = Math.round(Math.cos(theta));
    const sn = Math.round(Math.sin(theta));
    const xs: number[][] = [[], [], []];
    for (let k = 0; k < 8; k++) {
      const v = [0, 1, 2].map((a) => ((k >> a) & 1 ? bMax.get(i, a) : bMin.get(i, a)) * (s[a] as number));
      xs[0]!.push((P[0] as number) + cs * (v[0] as number) + sn * (v[2] as number));
      xs[1]!.push((P[1] as number) + (v[1] as number));
      xs[2]!.push((P[2] as number) - sn * (v[0] as number) + cs * (v[2] as number));
    }
    return {
      lo: [0, 1, 2].map((c) => cell(Math.min(...xs[c]!), c)) as V3,
      hi: [0, 1, 2].map((c) => cell(Math.max(...xs[c]!), c)) as V3,
    };
  });
}

const solidBox = (b: BoxSpec): boolean => [0, 1, 2].every((c) => (b.hi[c] as number) > (b.lo[c] as number));

/** The oracle's clutch: `b` rests on `a`'s top face with overlapping footprints. */
const restsOn = (b: BoxSpec, a: BoxSpec): boolean =>
  b.lo[1] === a.hi[1] && b.lo[0] < a.hi[0] && a.lo[0] < b.hi[0] && b.lo[2] < a.hi[2] && a.lo[2] < b.hi[2];

function oracleAdjacency(boxes: readonly BoxSpec[]): number[][] {
  const adj: number[][] = boxes.map(() => []);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = 0; j < boxes.length; j++) {
      if (i === j || !solidBox(boxes[i] as BoxSpec) || !solidBox(boxes[j] as BoxSpec)) continue;
      if (restsOn(boxes[j] as BoxSpec, boxes[i] as BoxSpec)) {
        (adj[i] as number[]).push(j);
        (adj[j] as number[]).push(i);
      }
    }
  }
  return adj;
}

/** Island per box, numbered 0.. by each piece's lowest identity rank; -1 for zero-volume. */
function oracleIslands(geo: Geometry, boxes: readonly BoxSpec[]): number[] {
  const adj = oracleAdjacency(boxes);
  const rank = canonicalPointRanks(geo, "test");
  const comp = boxes.map(() => -1);
  const minRank: number[] = [];
  boxes.forEach((b, i) => {
    if (!solidBox(b) || comp[i] !== -1) return;
    const c = minRank.length;
    let best = Infinity;
    const stack = [i];
    comp[i] = c;
    while (stack.length > 0) {
      const k = stack.pop() as number;
      best = Math.min(best, rank[k] as number);
      for (const nb of adj[k] as number[]) {
        if (comp[nb] === -1) {
          comp[nb] = c;
          stack.push(nb);
        }
      }
    }
    minRank.push(best);
  });
  const order = minRank.map((_, c) => c).sort((a, b) => (minRank[a] as number) - (minRank[b] as number));
  const id = new Array<number>(minRank.length);
  order.forEach((c, k) => (id[c] = k));
  return comp.map((c) => (c < 0 ? -1 : (id[c] as number)));
}

/**
 * The oracle's build: courses in rising order; at each course, place to a
 * fixpoint every unplaced brick whose bottom is at or below it and that
 * stands on the lowest course or clutches a placed brick. Returns the COURSE
 * each brick was placed at (not a step index), -1 for never and zero-volume.
 */
function oraclePlacedCourse(boxes: readonly BoxSpec[]): number[] {
  const adj = oracleAdjacency(boxes);
  const solid = boxes.map(solidBox);
  const courses = [...new Set(boxes.filter((_, i) => solid[i]).map((b) => b.lo[1]))].sort((a, b) => a - b);
  const table = courses[0];
  const placed = boxes.map(() => -1);
  for (const c of courses) {
    let changed = true;
    while (changed) {
      changed = false;
      boxes.forEach((b, i) => {
        if (!solid[i] || placed[i] !== -1 || b.lo[1] > c) return;
        if (b.lo[1] === table || (adj[i] as number[]).some((nb) => placed[nb] !== -1)) {
          placed[i] = c;
          changed = true;
        }
      });
    }
  }
  return placed;
}

/** `step` must be a strictly increasing relabelling of the oracle's placement course. */
function expectStepsFollowCourses(step: readonly number[], placedCourse: readonly number[]): void {
  expect(step.map((s) => s < 0)).toEqual(placedCourse.map((c) => c < 0));
  for (let i = 0; i < step.length; i++) {
    for (let j = 0; j < step.length; j++) {
      const ci = placedCourse[i] as number;
      const cj = placedCourse[j] as number;
      if (ci < 0 || cj < 0) continue;
      expect(Math.sign((step[i] as number) - (step[j] as number))).toBe(Math.sign(ci - cj));
    }
  }
}

/** The distinct non-negative steps are exactly 0, 1, … k-1. */
function expectNoGaps(step: readonly number[]): void {
  const used = [...new Set(step.filter((s) => s >= 0))].sort((a, b) => a - b);
  expect(used).toEqual(used.map((_, k) => k));
}

describe("brickConnectivity: islands", () => {
  // A is a tower of two; C and D touch only at a side; E is a lone plate
  // floating above everything; F bridges two bricks G and H into one.
  const specs: BoxSpec[] = [
    { lo: [0, 0, 0], hi: [2, 3, 2] }, // 0 A base
    { lo: [1, 3, 1], hi: [3, 4, 3] }, // 1 A top, overlapping one stud
    { lo: [6, 0, 0], hi: [8, 3, 2] }, // 2 C
    { lo: [8, 0, 0], hi: [10, 3, 2] }, // 3 D, side contact with C only
    { lo: [20, 7, 20], hi: [22, 8, 22] }, // 4 E, floating
    { lo: [12, 0, 0], hi: [13, 3, 1] }, // 5 G
    { lo: [14, 0, 0], hi: [15, 3, 1] }, // 6 H
    { lo: [12, 3, 0], hi: [15, 4, 1] }, // 7 F bridges G and H
    { lo: [2, 3, 0], hi: [3, 4, 1] }, // 8 beside A's top, off A's base: side contact only
  ];

  it("numbers pieces 0.. by lowest point identity, joining by clutch only", async () => {
    const geo = boxCloud(specs);
    const island = column(await connect(geo), "island");
    expect(island).toEqual(oracleIslands(geo, specs));
    // The oracle's partition, spelled out: side contact joins nothing.
    expect(island[0]).toBe(island[1]);
    expect(island[2]).not.toBe(island[3]);
    expect(island[5]).toBe(island[7]);
    expect(island[6]).toBe(island[7]);
    expect(island[8]).not.toBe(island[0]);
    expect(new Set(island).size).toBe(6);
    expect([...new Set(island)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("does not move when the input is shuffled", async () => {
    const geo = boxCloud(specs);
    const order = shuffledOrder(specs.length, 7);
    expect(Array.from(order)).not.toEqual(specs.map((_, i) => i));
    const a = await connect(geo, { islandsAttr: "islands" });
    const b = await connect(permutePoints(geo, order), { islandsAttr: "islands" });
    // The shuffled run is the original run, reordered, byte for byte.
    // (gatherPoints carries the point domain only, so the detail count is
    // compared on its own.)
    expect(snapshotGeometry(b).point).toEqual(snapshotGeometry(permutePoints(a, order)).point);
    expect(b.attrs.detail.require("islands").get(0)).toBe(a.attrs.detail.require("islands").get(0));
    // THE CONTROLS. (1) The shuffle is not vacuous: numbering pieces by
    // first ARRAY index would give different ids in the two orders.
    const firstIndexIds = (isl: readonly number[]): number[] => {
      const seen = new Map<number, number>();
      return isl.map((v) => {
        if (!seen.has(v)) seen.set(v, seen.size);
        return seen.get(v) as number;
      });
    };
    const islA = column(a, "island");
    const islB = column(b, "island");
    const permutedA = Array.from(order, (i) => islA[i] as number);
    expect(islB).toEqual(permutedA);
    expect(firstIndexIds(islB)).not.toEqual(permutedA);
    // (2) The comparison can say "different": move one point's identity
    // (its seed) until the ORACLE numbers the pieces differently, and the
    // node's ids must follow it.
    let changed: Geometry | undefined;
    for (let s = 1; s < 400 && changed === undefined; s++) {
      const g = boxCloud(specs);
      g.attrs.point.require("seed").set(s % specs.length, hashCombine(0xfeed, s));
      if (JSON.stringify(oracleIslands(g, specs)) !== JSON.stringify(islA)) changed = g;
    }
    expect(changed).toBeDefined();
    const c = await connect(changed as Geometry, { islandsAttr: "islands" });
    expect(column(c, "island")).toEqual(oracleIslands(changed as Geometry, specs));
    expect(snapshotGeometry(c).point).not.toEqual(snapshotGeometry(a).point);
    expect(column(c, "island")).not.toEqual(islA);
  });

  it("writes the island count as a DETAIL u32 only when islandsAttr is set", async () => {
    const geo = boxCloud(specs);
    const out = await connect(geo, { islandsAttr: "pieces" });
    const detail = out.attrs.detail.require("pieces");
    expect(detail.type).toBe("u32");
    expect(detail.get(0)).toBe(6);
    // The default writes the step count and nothing else; emptied, nothing.
    expect((await connect(geo)).attrs.detail.names()).toEqual(["stepCount"]);
    expect((await connect(geo, { stepCountAttr: "" })).attrs.detail.names()).toEqual([]);
  });
});

describe("brickConnectivity: steps", () => {
  it("places courses in rising order, the lowest course at step 0", async () => {
    // Two stacks starting on the table, a plate course shared by both,
    // and a brick on one of them. Courses 0, 3, 4: steps 0, 1, 2.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [0, 3, 0], hi: [2, 4, 2] },
      { lo: [0, 4, 0], hi: [2, 7, 2] },
      { lo: [5, 0, 0], hi: [7, 3, 2] },
      { lo: [5, 3, 0], hi: [7, 4, 2] },
      { lo: [9, 0, 0], hi: [10, 1, 1] }, // a lone plate on the table
    ];
    const step = column(await connect(boxCloud(specs)), "step");
    expect(step).toEqual([0, 1, 2, 0, 1, 0]);
    expectNoGaps(step);
  });

  it("reads the table as the build's lowest course, wherever that is", async () => {
    // The same stack lifted to course 5, and a zero-volume box at course
    // -5 that is not a brick and must not lower the table.
    const specs: BoxSpec[] = [
      { lo: [0, 5, 0], hi: [2, 8, 2] },
      { lo: [0, 8, 0], hi: [2, 9, 2] },
      { lo: [4, -5, 4], hi: [6, -5, 6] },
    ];
    const out = await connect(boxCloud(specs));
    expect(column(out, "step")).toEqual([0, 1, -1]);
    expect(column(out, "island")).toEqual([0, 0, -1]);
  });

  it("places a plate hanging under a bridge in the bridge's step, with what hangs under it", async () => {
    // Pillars x 0..1 and 3..4, three plates tall; a plate across their
    // tops; a plate hung under the bridge between them (course 2) and a
    // second hung under that one (course 1). Neither hung plate touches a
    // pillar but at a side.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [1, 3, 1] }, // 0 pillar
      { lo: [3, 0, 0], hi: [4, 3, 1] }, // 1 pillar
      { lo: [0, 3, 0], hi: [4, 4, 1] }, // 2 bridge
      { lo: [1, 2, 0], hi: [3, 3, 1] }, // 3 hung under the bridge
      { lo: [1, 1, 0], hi: [3, 2, 1] }, // 4 hung under 3
    ];
    const geo = boxCloud(specs);
    const out = await connect(geo);
    const step = column(out, "step");
    expect(step[0]).toBe(0);
    expect(step[1]).toBe(0);
    expect(step[2]).toBeGreaterThan(0);
    expect(step[3]).toBe(step[2]);
    expect(step[4]).toBe(step[2]);
    expectStepsFollowCourses(step, oraclePlacedCourse(specs));
    expect(new Set(column(out, "island")).size).toBe(1);
  });

  it("places a brick of the bridge's course that rests ONLY on a hung plate with them", async () => {
    // Course 3 is three plates: B1 on pillar 0 and the hung plate, B2 on
    // the hung plate alone, B3 on the hung plate and pillar 1.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [1, 3, 1] }, // 0 pillar
      { lo: [4, 0, 0], hi: [5, 3, 1] }, // 1 pillar
      { lo: [1, 2, 0], hi: [4, 3, 1] }, // 2 hung plate between the pillars
      { lo: [0, 3, 0], hi: [2, 4, 1] }, // 3 B1
      { lo: [2, 3, 0], hi: [3, 4, 1] }, // 4 B2, on the hung plate only
      { lo: [3, 3, 0], hi: [5, 4, 1] }, // 5 B3
    ];
    const step = column(await connect(boxCloud(specs)), "step");
    expect([step[0], step[1]]).toEqual([0, 0]);
    const s = step[3] as number;
    expect(s).toBeGreaterThan(0);
    expect([step[2], step[4], step[5]]).toEqual([s, s, s]);
    expectStepsFollowCourses(step, oraclePlacedCourse(specs));
  });

  // A course whose only bricks hang (course 2 here) places nothing at its
  // own step; numbering by course index once left step 1 empty.
  it("leaves no gap when a course holds only hanging bricks", async () => {
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [1, 3, 1] },
      { lo: [3, 0, 0], hi: [4, 3, 1] },
      { lo: [0, 3, 0], hi: [4, 4, 1] },
      { lo: [1, 2, 0], hi: [3, 3, 1] },
    ];
    const step = column(await connect(boxCloud(specs)), "step");
    expectNoGaps(step);
  });

  it("gives a floating piece step -1 but still numbers its island", async () => {
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [2, 3, 2] }, // on the table
      { lo: [5, 4, 5], hi: [7, 7, 7] }, // floating
      { lo: [5, 7, 5], hi: [7, 8, 7] }, // on the floating one
      { lo: [2, 0, 0], hi: [4, 3, 2] }, // beside the first, on the table
    ];
    const geo = boxCloud(specs);
    const out = await connect(geo, { islandsAttr: "islands" });
    expect(column(out, "step")).toEqual([0, -1, -1, 0]);
    const island = column(out, "island");
    expect(island).toEqual(oracleIslands(geo, specs));
    expect(island[1]).toBeGreaterThanOrEqual(0);
    expect(island[1]).toBe(island[2]);
    expect(out.attrs.detail.require("islands").get(0)).toBe(3);
  });
});

describe("brickConnectivity: what it leaves alone", () => {
  it("keeps every input point, in order, with every input column untouched", async () => {
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [0, 3, 0], hi: [4, 4, 2] },
      { lo: [3, 0, 3], hi: [3, 2, 5] }, // zero volume
      { lo: [9, 2, 0], hi: [10, 3, 1] }, // floating
    ];
    const geo = boxCloud(specs);
    const out = await connect(geo);
    expect(out.pointCount).toBe(geo.pointCount);
    const strip = (g: Geometry) => {
      const copy = permutePoints(g, specs.map((_, i) => i));
      copy.attrs.point.remove("island");
      copy.attrs.point.remove("step");
      return snapshotGeometry(copy);
    };
    expect(strip(out)).toEqual(snapshotGeometry(geo));
    expect(out.attrs.point.has("island")).toBe(true);
    expect(geo.attrs.point.has("island")).toBe(false);
    // THE CONTROL: the comparison sees a single moved value.
    const moved = permutePoints(out, specs.map((_, i) => i));
    moved.attrs.point.require("tag").set(3, 42);
    expect(strip(moved)).not.toEqual(snapshotGeometry(geo));
  });

  it("resets an existing i32 column of the right shape rather than refusing it", async () => {
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    geo.attrs.point.add("island", "i32", 1, 99);
    geo.attrs.point.add("step", "i32", 1, 99);
    const out = await connect(geo);
    expect(column(out, "island")).toEqual([0]);
    expect(column(out, "step")).toEqual([0]);
  });
});

describe("brickConnectivity: degenerate", () => {
  it("cooks an empty input to an empty output carrying both columns", async () => {
    const out = await connect(createPointCloud(0), { islandsAttr: "islands" });
    expect(out.pointCount).toBe(0);
    expect(out.attrs.point.require("island").type).toBe("i32");
    expect(out.attrs.point.require("step").type).toBe("i32");
    expect(out.attrs.detail.require("islands").get(0)).toBe(0);
  });

  it("skips a box of no volume wherever it sits: an off-lattice, oddly rotated P is not refused", async () => {
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }, { lo: [4, 0, 0], hi: [4, 3, 2] }]);
    geo.attrs.point.require("P").setTuple(1, [4.3, 0.7, 1.1]);
    geo.attrs.point.require("rot").setTuple(1, [0.6, 0, 0, 0.8]);
    const out = await connect(geo);
    expect(column(out, "step")).toEqual([0, -1]);
  });

  it("gives zero-volume boxes -1 for both and counts no island", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [3, 0, 2] },
      { lo: [5, 1, 1], hi: [5, 4, 4] },
    ]);
    const out = await connect(geo, { islandsAttr: "islands" });
    expect(column(out, "island")).toEqual([-1, -1]);
    expect(column(out, "step")).toEqual([-1, -1]);
    expect(out.attrs.detail.require("islands").get(0)).toBe(0);
  });
});

describe("brickConnectivity: refusals", () => {
  const one = (): Geometry => boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);

  it("refuses two bricks sharing a cell, naming both points", async () => {
    const geo = boxCloud([
      { lo: [10, 0, 0], hi: [11, 1, 1] },
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [1, 2, 1], hi: [3, 4, 3] },
    ]);
    const m = await refusal(geo);
    expect(m.startsWith("brickConnectivity:")).toBe(true);
    expect(m).toContain("points 1 and 2");
    expect(m).toContain("(1, 2, 1)");
    expect(m).toContain("packBricks");
    // THE CONTROL: the same bricks moved one plate up do not overlap.
    const ok = boxCloud([
      { lo: [10, 0, 0], hi: [11, 1, 1] },
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [1, 3, 1], hi: [3, 5, 3] },
    ]);
    await expect(connect(ok)).resolves.toBeDefined();
  });

  it("reads each brick through its transform: a quarter turn about y swaps its extents, any whole number of quarter turns is read", async () => {
    // A 2 x 3 x 1 plate turned a quarter turn spans 1 along x and 2 along z;
    // a 1 x 3 x 2 one stands on it, unturned, in the same cells.
    const bricks = (list: [number[], number[], number[]][]) => {
      const g = createPointCloud(list.length);
      list.forEach(([P, rot, scale], i) => {
        g.attrs.point.require("P").setTuple(i, P);
        g.attrs.point.require("rot").setTuple(i, rot);
        g.attrs.point.require("scale").setTuple(i, scale);
        g.attrs.point.require("boundsMin").setTuple(i, [-0.5, -0.5, -0.5]);
        g.attrs.point.require("boundsMax").setTuple(i, [0.5, 0.5, 0.5]);
        g.attrs.point.require("seed").set(i, 7 + i);
      });
      return g;
    };
    const s = Math.fround(Math.SQRT1_2);
    for (const rot of [[0, s, 0, s], [0, -s, 0, s], [0, 1, 0, 0], [0, 0, 0, 1]]) {
      const turnedQuarter = rot[3] !== 0 && rot[1] !== 0;
      const both = bricks([
        [[0.5, 0.5, 1], rot, turnedQuarter ? [2, 1, 1] : [1, 1, 2]],
        [[0.5, 1.5, 1], [0, 0, 0, 1], [1, 1, 2]],
      ]);
      expect([rot, column(await connect(both), "island")]).toEqual([rot, [0, 0]]);
      // Shifted half a stud off the lattice, the turned brick is refused.
      const off = bricks([[[1, 0.5, 1], rot, turnedQuarter ? [2, 1, 1] : [1, 1, 2]]]);
      expect(await refusal(off)).toContain("not on the lattice");
    }
  });

  it("refuses a rotation that is not a whole number of quarter turns about y, naming the point", async () => {
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }, { lo: [4, 0, 0], hi: [6, 3, 2] }]);
    geo.attrs.point.require("rot").setTuple(1, [Math.sin(0.1), 0, 0, Math.cos(0.1)]);
    expect(await refusal(geo)).toMatch(/^brickConnectivity: point 1 has rot \[.*\], which is not a whole number of quarter turns about y/);
  });

  it("refuses an off-lattice corner, naming the point and the corner", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [4, 0, 0], hi: [6, 3, 2] },
    ]);
    geo.attrs.point.require("boundsMin").set(1, -0.5, 0); // local to P.x = 5: the world corner at x = 4.5
    const m = await refusal(geo);
    expect(m.startsWith("brickConnectivity:")).toBe(true);
    expect(m).toContain("point 1");
    expect(m).toContain("boundsMin.x");
    expect(m).toContain("not on the lattice");
  });

  it("refuses a report slot that exists as another shape, naming the param", async () => {
    const f32Island = one();
    f32Island.attrs.point.add("island", "f32", 1, 0);
    const a = await refusal(f32Island);
    expect(a).toContain("islandAttr");
    expect(a).toContain('"island"');

    const wideStep = one();
    wideStep.attrs.point.add("step", "i32", 3, 0);
    const b = await refusal(wideStep);
    expect(b).toContain("stepAttr");
    expect(b).toContain('"step"');

    const detail = one();
    detail.attrs.detail.add("pieces", "f32", 1, 0);
    const c = await refusal(detail, { islandsAttr: "pieces" });
    expect(c).toContain("islandsAttr");
    expect(c).toContain('"pieces"');
    expect(c).toContain("detail");
  });

  it("refuses islandAttr equal to stepAttr, and either empty", async () => {
    const same = await refusal(one(), { islandAttr: "k", stepAttr: "k" });
    expect(same).toContain('"islandAttr"');
    expect(same).toContain('"stepAttr"');
    expect(same).toContain('"k"');
    expect(await refusal(one(), { islandAttr: "" })).toContain('"islandAttr"');
    expect(await refusal(one(), { stepAttr: "" })).toContain('"stepAttr"');
  });
});

describe("brickConnectivity: agreement with packBricks", () => {
  /** A deterministic LCG; no Math.random in this library, tests included. */
  function boxes(seed: number, count: number): BoxSpec[] {
    let s = (seed >>> 0) || 1;
    const next = (n: number): number => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s % n;
    };
    return Array.from({ length: count }, () => {
      const lo: V3 = [next(12), next(10), next(10)];
      return { lo, hi: [lo[0] + 1 + next(6), lo[1] + 1 + next(6), lo[2] + 1 + next(5)] as V3 };
    });
  }

  const origin: V3 = [0.5, -1.2, 3];
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`agrees with packBricks' islandsAttr and the oracle on packed random boxes (seed ${seed})`, async () => {
      const specs = boxes(seed, 10);
      const r = await runNode(
        packBricks,
        { pitch: PLATE, origin, islandsAttr: "islands" },
        { in: [makeGeometryItem(boxCloud(specs, PLATE, origin))] },
      );
      const packed = firstGeo(r.out);
      expect(packed.pointCount).toBeGreaterThan(5);
      const out = await connect(packed, { pitch: PLATE, origin, islandsAttr: "islands" });
      const packedIslands = packed.attrs.detail.require("islands").get(0);
      expect(out.attrs.detail.require("islands").get(0)).toBe(packedIslands);

      const bricks = readBoxes(packed, PLATE, origin);
      const island = column(out, "island");
      expect(new Set(island).size).toBe(packedIslands);
      expect(island).toEqual(oracleIslands(packed, bricks));

      const step = column(out, "step");
      const placed = oraclePlacedCourse(bricks);
      expectStepsFollowCourses(step, placed);
      // A brick is never placed before its own course is reached, and one
      // left at -1 has no placed brick to grip.
      const courses = [...new Set(bricks.map((b) => b.lo[1]))].sort((a, b) => a - b);
      const placedCourses = [...new Set(placed.filter((c) => c >= 0))].sort((a, b) => a - b);
      const adj = oracleAdjacency(bricks);
      bricks.forEach((b, i) => {
        const s = step[i] as number;
        // Exactly: the step is the rank of the course it was placed at among
        // the courses at which anything was placed (steps have no gaps).
        if (s >= 0) expect(s).toBe(placedCourses.indexOf(placed[i] as number));
        else for (const nb of adj[i] as number[]) expect(step[nb]).toBe(-1);
      });
    });
  }

  it("is exercised: the random sets include floating bricks and several pieces", async () => {
    let floating = 0;
    let multi = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = await runNode(
        packBricks,
        { pitch: PLATE, origin, islandsAttr: "islands" },
        { in: [makeGeometryItem(boxCloud(boxes(seed, 10), PLATE, origin))] },
      );
      const packed = firstGeo(r.out);
      if (packed.attrs.detail.require("islands").get(0) > 1) multi++;
      const step = column(await connect(packed, { pitch: PLATE, origin }), "step");
      if (step.some((s) => s < 0)) floating++;
    }
    expect(floating).toBeGreaterThan(0);
    expect(multi).toBeGreaterThan(0);
  });
});

describe("brickConnectivity: cancellation", () => {
  it("checks for cancellation while it works", async () => {
    // Forty courses of plates stacked on one another, plus a thousand
    // separate cells: past the rasterizing stride and one check per course.
    const specs: BoxSpec[] = [
      ...Array.from({ length: 40 }, (_, y) => ({ lo: [0, y, 0] as V3, hi: [2, y + 1, 2] as V3 })),
      ...Array.from({ length: 1000 }, (_, i) => ({ lo: [4 + 2 * i, 0, 0] as V3, hi: [5 + 2 * i, 1, 1] as V3 })),
    ];
    let calls = 0;
    await brickConnectivity.execute({
      inputs: { in: [makeGeometryItem(boxCloud(specs))] },
      params: { ...brickConnectivity.defaultParams, pitch: UNIT },
      seed: 1,
      checkCancelled() {
        calls++;
      },
    });
    expect(calls).toBeGreaterThanOrEqual(40);
  });
});

/** A deterministic LCG box set; no Math.random in this library, tests included. */
function randomBoxes(seed: number, count: number): BoxSpec[] {
  let s = (seed >>> 0) || 1;
  const next = (n: number): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
  return Array.from({ length: count }, () => {
    const lo: V3 = [next(12), next(10), next(10)];
    return { lo, hi: [lo[0] + 1 + next(6), lo[1] + 1 + next(6), lo[2] + 1 + next(5)] as V3 };
  });
}

const ORIGIN: V3 = [0.5, -1.2, 3];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const identity = (g: Geometry): number[] => Array.from({ length: g.pointCount }, (_, i) => i);

/** packBricks over a random set with every stud, as the brick house asks. */
async function packAll(seed: number): Promise<{ bricks: Geometry; studs: Geometry }> {
  const r = await runNode(
    packBricks,
    { pitch: PLATE, origin: ORIGIN, studMode: "all", islandsAttr: "islands" },
    { in: [makeGeometryItem(boxCloud(randomBoxes(seed, 10), PLATE, ORIGIN))] },
  );
  return { bricks: firstGeo(r.out), studs: firstGeo(r.studs) };
}

async function connectStuds(
  bricks: Geometry,
  studs: Geometry | undefined,
  params: Partial<BrickConnectivityParams> = {},
): Promise<{ out: Geometry; studs: Geometry | undefined; studItems: number }> {
  const r = await runNode(
    brickConnectivity,
    { pitch: PLATE, origin: ORIGIN, ...params },
    { in: [makeGeometryItem(bricks)], ...(studs === undefined ? {} : { studs: [makeGeometryItem(studs)] }) },
  );
  const items = r.studs ?? [];
  return { out: firstGeo(r.out), studs: items.length > 0 ? firstGeo(items) : undefined, studItems: items.length };
}

async function studRefusal(
  bricks: Geometry,
  studs: Geometry | undefined,
  params: Partial<BrickConnectivityParams> = {},
): Promise<string> {
  try {
    await connectStuds(bricks, studs, params);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected brickConnectivity to refuse this input, but it cooked");
}

describe("brickConnectivity: stepCount", () => {
  it("is the highest step plus one, as a DETAIL u32 on out", async () => {
    for (const seed of SEEDS) {
      const { bricks } = await packAll(seed);
      const { out } = await connectStuds(bricks, undefined);
      const count = out.attrs.detail.require("stepCount");
      expect(count.type).toBe("u32");
      expect(count.tupleSize).toBe(1);
      const step = column(out, "step");
      expect(count.get(0)).toBe(Math.max(...step) + 1);
      // Every step below it places something: the slider never lands on
      // an empty step.
      for (let t = 0; t < count.get(0); t++) expect(step).toContain(t);
    }
  });

  it("counts the steps of a build with a hung plate and a floating piece", async () => {
    // Steps: base (0), the bridge course with the hung plate (1); the
    // floating plate gets -1 and adds no step.
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [1, 3, 1] },
      { lo: [3, 0, 0], hi: [4, 3, 1] },
      { lo: [1, 2, 0], hi: [3, 3, 1] }, // hangs under the bridge
      { lo: [0, 3, 0], hi: [4, 4, 1] }, // the bridge
      { lo: [9, 5, 9], hi: [10, 6, 10] }, // floating
    ]);
    const out = await connect(geo);
    expect(column(out, "step")).toEqual([0, 0, 1, 1, -1]);
    expect(out.attrs.detail.require("stepCount").get(0)).toBe(2);
  });

  it("is 0 on an empty input and on zero-volume boxes only", async () => {
    expect((await connect(createPointCloud(0))).attrs.detail.require("stepCount").get(0)).toBe(0);
    const flat = boxCloud([{ lo: [0, 0, 0], hi: [3, 0, 2] }]);
    expect((await connect(flat)).attrs.detail.require("stepCount").get(0)).toBe(0);
    // THE CONTROL: one real brick is one step.
    const one = boxCloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    expect((await connect(one)).attrs.detail.require("stepCount").get(0)).toBe(1);
  });

  it("goes under another name, or nowhere, and keeps out's point domain unchanged", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [0, 3, 0], hi: [2, 4, 2] },
    ]);
    const named = await connect(geo, { stepCountAttr: "steps" });
    expect(named.attrs.detail.names()).toEqual(["steps"]);
    expect(named.attrs.detail.require("steps").get(0)).toBe(2);
    const none = await connect(geo, { stepCountAttr: "" });
    expect(none.attrs.detail.names()).toEqual([]);
    expect(snapshotGeometry(none).point).toEqual(snapshotGeometry(named).point);
    // Both detail counts, in a fixed order.
    const both = await connect(geo, { islandsAttr: "islands" });
    expect(both.attrs.detail.names()).toEqual(["islands", "stepCount"]);
  });

  it("refuses a name shared with islandsAttr, or a detail column of another shape", async () => {
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    const same = await refusal(geo, { islandsAttr: "count", stepCountAttr: "count" });
    expect(same).toContain('"stepCountAttr"');
    expect(same).toContain('"islandsAttr"');
    expect(same).toContain('"count"');
    const taken = boxCloud([{ lo: [0, 0, 0], hi: [1, 1, 1] }]);
    taken.attrs.detail.add("stepCount", "f32", 1, 0);
    const shape = await refusal(taken);
    expect(shape).toContain("stepCountAttr");
    expect(shape).toContain('"stepCount"');
    expect(shape).toContain("detail");
  });
});

describe("brickConnectivity: the studs pin", () => {
  it("unwired, emits an empty studs collection and the same out as wired", async () => {
    const { bricks, studs } = await packAll(3);
    const unwired = await connectStuds(bricks, undefined);
    expect(unwired.studItems).toBe(0);
    const wired = await connectStuds(bricks, studs);
    expect(wired.studItems).toBe(1);
    expect(snapshotGeometry(wired.out)).toEqual(snapshotGeometry(unwired.out));
    // Unwired, stepAboveAttr is never read: even a bad one cooks.
    await expect(connectStuds(bricks, undefined, { stepAboveAttr: "" })).resolves.toBeDefined();
    await expect(connectStuds(bricks, undefined, { stepAboveAttr: "step" })).resolves.toBeDefined();
  });

  for (const seed of SEEDS) {
    it(`writes each stud's step and the step of the brick on it, read through its indices (seed ${seed})`, async () => {
      const { bricks, studs } = await packAll(seed);
      const r = await connectStuds(bricks, studs);
      const step = column(r.out, "step");
      const got = r.studs as Geometry;
      expect(got.pointCount).toBe(studs.pointCount);
      const on = column(got, "brickId");
      const above = column(got, "brickAbove");
      const own = column(got, "step");
      const cover = column(got, "stepAbove");
      for (let k = 0; k < got.pointCount; k++) {
        expect(own[k]).toBe(step[on[k] as number]);
        const a = above[k] as number;
        expect(cover[k]).toBe(a < 0 ? -1 : step[a]);
        // A stud is never covered before the brick it stands on is placed.
        if ((cover[k] as number) >= 0) expect(cover[k] as number).toBeGreaterThanOrEqual(own[k] as number);
      }
      const want = r.out.attrs.detail.require("stepCount").get(0);
      expect(got.attrs.detail.require("stepCount").get(0)).toBe(want);
    });
  }

  it("is exercised: covered studs, showing studs, and studs of unattachable bricks all occur", async () => {
    let covered = 0;
    let open = 0;
    let unattached = 0;
    let coveredLater = 0;
    for (const seed of SEEDS) {
      const { bricks, studs } = await packAll(seed);
      const got = (await connectStuds(bricks, studs)).studs as Geometry;
      const above = column(got, "brickAbove");
      const own = column(got, "step");
      const cover = column(got, "stepAbove");
      above.forEach((a, k) => {
        if (a >= 0) covered++;
        else open++;
        if ((own[k] as number) < 0) unattached++;
        if ((own[k] as number) >= 0 && (cover[k] as number) > (own[k] as number)) coveredLater++;
      });
    }
    expect(covered).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(0);
    expect(unattached).toBeGreaterThan(0);
    expect(coveredLater).toBeGreaterThan(0);
  });

  it("leaves every stud, in order, with every input column untouched", async () => {
    const { bricks, studs } = await packAll(5);
    const got = (await connectStuds(bricks, studs)).studs as Geometry;
    const strip = (g: Geometry) => {
      const copy = permutePoints(g, identity(g));
      copy.attrs.point.remove("step");
      copy.attrs.point.remove("stepAbove");
      return snapshotGeometry(copy).point;
    };
    expect(strip(got)).toEqual(snapshotGeometry(studs).point);
    expect(studs.attrs.point.has("step")).toBe(false);
    // The detail domain keeps what it had and gains the step count.
    expect(got.attrs.detail.names()).toEqual([...studs.attrs.detail.names(), "stepCount"]);
    // THE CONTROL: the comparison sees one moved value.
    const moved = permutePoints(got, identity(got));
    moved.attrs.point.require("brickId").set(0, 99);
    expect(strip(moved)).not.toEqual(snapshotGeometry(studs).point);
  });

  it("writes under stepAttr and stepAboveAttr, whatever they are called", async () => {
    const { bricks, studs } = await packAll(2);
    const a = await connectStuds(bricks, studs);
    const b = await connectStuds(bricks, studs, { stepAttr: "t", stepAboveAttr: "tCover" });
    expect(column(b.studs as Geometry, "t")).toEqual(column(a.studs as Geometry, "step"));
    expect(column(b.studs as Geometry, "tCover")).toEqual(column(a.studs as Geometry, "stepAbove"));
    expect(column(b.out, "t")).toEqual(column(a.out, "step"));
  });

  it("replaces the brick house's two transferByIndex joins, value for value", async () => {
    // The graph, as graphs/examples-brick-house.json builds it before this
    // pin: `shownAt` is the step with -1 drawn at 60 (the whole build);
    // `noneAbove` prefills `stepAbove` with 1e6; `stepOn` gathers shownAt
    // through brickId (clamp) and `stepAbove` through brickAbove (miss, so
    // the prefill stays where there is none). The two transferByIndex
    // nodes are the library's own, run with the graph's params.
    const join = async (
      dst: Geometry,
      src: Geometry,
      index: string,
      attr: string,
      outName: string,
      mode: "clamp" | "miss",
    ): Promise<Geometry> => {
      const r = await runNode(
        transferByIndex,
        { index: attribute(index), attributes: [attr], outNames: [outName], outOfRange: mode },
        { in: [makeGeometryItem(dst)], source: [makeGeometryItem(src)] },
      );
      return firstGeo(r.out);
    };
    let compared = 0;
    for (const seed of SEEDS) {
      const { bricks, studs } = await packAll(seed);
      const r = await connectStuds(bricks, studs);
      const step = column(r.out, "step");
      const stepCount = r.out.attrs.detail.require("stepCount").get(0);
      const got = r.studs as Geometry;
      const own = column(got, "step");
      const cover = column(got, "stepAbove");
      const above = column(got, "brickAbove");

      // (1) The graph's joins, on the graph's own f32 shownAt.
      const shown = permutePoints(r.out, identity(r.out));
      const shownAt = shown.attrs.point.add("shownAt", "f32", 1, 0);
      step.forEach((v, i) => shownAt.set(i, v < 0 ? 60 : v));
      const prefilled = permutePoints(studs, identity(studs));
      prefilled.attrs.point.add("stepAbove", "f32", 1, 1e6);
      const stepOn = await join(prefilled, shown, "brickId", "shownAt", "stepOn", "clamp");
      const viaGraph = await join(stepOn, shown, "brickAbove", "shownAt", "stepAbove", "miss");
      const gOn = viaGraph.attrs.point.require("stepOn");
      const gAbove = viaGraph.attrs.point.require("stepAbove");
      for (let k = 0; k < got.pointCount; k++) {
        // The same values, through the graph's two sentinels.
        const o = own[k] as number;
        const c = cover[k] as number;
        expect(gOn.get(k)).toBe(o < 0 ? 60 : o);
        expect(gAbove.get(k)).toBe((above[k] as number) < 0 ? 1e6 : c < 0 ? 60 : c);
      }
      // And the graph's `showing` predicate agrees, at every step a slider
      // can reach, with the recipe on the new columns: step >= 0, step <= t,
      // and (stepAbove < 0 or stepAbove > t). (The graph's whole-build
      // setting, t = 60, also draws the studs of unattachable bricks; that
      // is the graph's own choice, read off step < 0.)
      for (let t = 0; t < stepCount; t++) {
        for (let k = 0; k < got.pointCount; k++) {
          const graphShows = gOn.get(k) <= t && ((above[k] as number) < 0 || gAbove.get(k) > t);
          const o = own[k] as number;
          const c = cover[k] as number;
          expect(o >= 0 && o <= t && (c < 0 || c > t)).toBe(graphShows);
          compared++;
        }
      }

      // (2) The same two joins gathering the i32 `step` itself, with -1
      // prefilled: the new pin's output exactly, column types and all.
      const prefilledI = permutePoints(studs, identity(studs));
      prefilledI.attrs.point.add("stepAbove", "i32", 1, -1);
      const ownJoin = await join(prefilledI, r.out, "brickId", "step", "step", "clamp");
      const viaJoin = await join(ownJoin, r.out, "brickAbove", "step", "stepAbove", "miss");
      // Column by column: the joins add `stepAbove` before `step`.
      const byName = (g: Geometry) => {
        const point = snapshotGeometry(g).point as { attrs: { name: string }[] };
        return [...point.attrs].sort((x, y) => (x.name < y.name ? -1 : 1));
      };
      expect(byName(got)).toEqual(byName(viaJoin));
      expect(got.pointCount).toBe(viaJoin.pointCount);
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it("refuses a stud index past the bricks on in, naming the stud and the fix", async () => {
    const { bricks, studs } = await packAll(4);
    // The bricks filtered after packing: the studs' indices no longer fit.
    const fewer = permutePoints(bricks, [0, 1, 2]);
    const m = await studRefusal(fewer, studs);
    expect(m).toMatch(/^brickConnectivity: stud \d+ on pin "studs" has brick(Id|Above) \d+, but pin "in" carries 3 bricks/);
    expect(m).toContain("indices 0 to 2");
    expect(m).toContain("the SAME packBricks");
    // THE CONTROL: unfiltered it cooks.
    await expect(connectStuds(bricks, studs)).resolves.toBeDefined();
  });

  it("refuses studs without the index columns, or with them as another shape", async () => {
    const { bricks, studs } = await packAll(1);
    const missing = await studRefusal(bricks, createPointCloud(2));
    expect(missing).toContain("brickConnectivity: ");
    expect(missing).toContain('"brickId"');
    expect(missing).toContain(`packBricks' "studs" output`);
    const f32 = permutePoints(studs, identity(studs));
    f32.attrs.point.remove("brickAbove");
    f32.attrs.point.add("brickAbove", "f32", 1, -1);
    const shape = await studRefusal(bricks, f32);
    expect(shape).toContain('"brickAbove" as f32 with tuple size 1');
    expect(shape).toContain("i32 with tuple size 1");
  });

  it("refuses stud names that clash, are empty, or overwrite an index column", async () => {
    const { bricks, studs } = await packAll(1);
    const empty = await studRefusal(bricks, studs, { stepAboveAttr: "" });
    expect(empty).toContain('"stepAboveAttr" is empty');
    expect(empty).toContain('"stepAbove"');
    const same = await studRefusal(bricks, studs, { stepAttr: "s", stepAboveAttr: "s" });
    expect(same).toContain('"stepAttr" and "stepAboveAttr" are both "s"');
    const index = await studRefusal(bricks, studs, { stepAboveAttr: "brickAbove" });
    expect(index).toContain('param "stepAboveAttr" is "brickAbove"');
    const index2 = await studRefusal(bricks, studs, { stepAttr: "brickId" });
    expect(index2).toContain('param "stepAttr" is "brickId"');
    // A stud column of another shape under the written name is refused,
    // naming the param, as on the bricks.
    const taken = permutePoints(studs, identity(studs));
    taken.attrs.point.add("stepAbove", "f32", 1, 0);
    const slot = await studRefusal(bricks, taken);
    expect(slot).toContain("stepAboveAttr");
    expect(slot).toContain('"stepAbove"');
  });

  it("cooks empty studs, and studs of a build of zero-volume boxes, to -1", async () => {
    const { bricks, studs } = await packAll(1);
    const r = await connectStuds(bricks, permutePoints(studs, []));
    expect((r.studs as Geometry).pointCount).toBe(0);
    expect((r.studs as Geometry).attrs.point.require("stepAbove").type).toBe("i32");
    // Two zero-volume "bricks" and studs pointing at them: no step for any.
    const flat = boxCloud([
      { lo: [0, 0, 0], hi: [3, 0, 2] },
      { lo: [5, 1, 1], hi: [5, 4, 4] },
    ]);
    const fake = createPointCloud(2);
    fake.attrs.point.add("brickId", "i32", 1, 0).set(1, 1);
    fake.attrs.point.add("brickAbove", "i32", 1, -1).set(0, 1);
    const z = await runNode(
      brickConnectivity,
      { pitch: UNIT },
      { in: [makeGeometryItem(flat)], studs: [makeGeometryItem(fake)] },
    );
    const zs = firstGeo(z.studs);
    expect(column(zs, "step")).toEqual([-1, -1]);
    expect(column(zs, "stepAbove")).toEqual([-1, -1]);
    expect(zs.attrs.detail.require("stepCount").get(0)).toBe(0);
  });
});
