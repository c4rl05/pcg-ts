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

/** A cloud of one point per box, corners as absolute world positions. */
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
    bMin.setTuple(i, lo);
    bMax.setTuple(i, hi);
    P.setTuple(i, lo.map((a, c) => 0.5 * (a + (hi[c] as number))));
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

/** Read boxes back from a geometry's corner columns, in cells. */
function readBoxes(geo: Geometry, pitch: V3 = UNIT, origin: V3 = ZERO): BoxSpec[] {
  const bMin = geo.attrs.point.require("boundsMin");
  const bMax = geo.attrs.point.require("boundsMax");
  const cell = (v: number, c: number) => Math.round((v - (origin[c] as number)) / (pitch[c] as number));
  return Array.from({ length: geo.pointCount }, (_, i) => ({
    lo: [0, 1, 2].map((c) => cell(bMin.get(i, c), c)) as V3,
    hi: [0, 1, 2].map((c) => cell(bMax.get(i, c), c)) as V3,
  }));
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
    expect((await connect(geo)).attrs.detail.names()).toEqual([]);
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

  it("refuses an off-lattice corner, naming the point and the corner", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [4, 0, 0], hi: [6, 3, 2] },
    ]);
    geo.attrs.point.require("boundsMin").set(1, 4.5, 0);
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
