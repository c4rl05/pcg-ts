/**
 * `packBricks`: boxes on a stud lattice, turned into the bricks that build
 * them.
 *
 * WHAT THIS SUITE PINS is the contract in the node's description, checked
 * against an oracle the test builds itself and never against a cook. The
 * coverage claim is the input boxes rasterized cell by cell beside the
 * output bricks rasterized cell by cell; the stud claim is "every solid
 * cell whose cell above is empty"; the stagger claim is a count of straight
 * head joints. None of those numbers were read off a run.
 *
 * EVERY FIXTURE IS WRITTEN IN LATTICE CELLS and converted to world units by
 * `boxCloud`, so a box reads as the cells it covers. Most cases use a pitch
 * of [1, 1, 1] so world and cell coordinates coincide; the ones that are
 * about the default [1, 0.4, 1] proportion (and the f32 snap it needs) say
 * so.
 */
import { describe, expect, it } from "vitest";
import { AttributeNotFoundError, createPointCloud, type Geometry } from "../data/index.js";
import { canonicalPointRanks } from "../data/identity.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import { holdBudget, holdRelay } from "./brickHoldBudget.js";
import { brickConnectivity, packBricks, type PackBricksParams } from "./bricks.js";
import {
  firstGeo,
  permutePoints,
  runNode,
  shuffledOrder,
  snapshotGeometry,
} from "./nodes.testsupport.js";

type V3 = [number, number, number];

/** One input box, in lattice cells: `lo` inclusive, `hi` exclusive. */
interface BoxSpec {
  lo: V3;
  hi: V3;
  color?: [number, number, number, number];
  kind?: string;
  /** An i32 the test reads back to tell boxes apart; defaults to the index. */
  tag?: number;
  seed?: number;
}

const UNIT: V3 = [1, 1, 1];
const PLATE: V3 = [1, 0.4, 1];
const ZERO: V3 = [0, 0, 0];
const S = Math.fround(Math.SQRT1_2);

/**
 * A cloud of one point per box, corners written as ABSOLUTE world
 * positions (origin + cell * pitch), P at the box centre and a genuine
 * per-point seed so identity rests on more than position.
 */
function boxCloud(specs: readonly BoxSpec[], pitch: V3 = UNIT, origin: V3 = ZERO): Geometry {
  const geo = createPointCloud(specs.length);
  const pts = geo.attrs.point;
  const P = pts.require("P");
  const bMin = pts.require("boundsMin");
  const bMax = pts.require("boundsMax");
  const seed = pts.require("seed");
  const color = pts.require("color");
  const tag = pts.add("tag", "i32", 1, 0);
  const kind = specs.some((s) => s.kind !== undefined) ? pts.add("kind", "string", 1, "") : undefined;
  specs.forEach((s, i) => {
    const lo = s.lo.map((v, c) => (origin[c] as number) + v * (pitch[c] as number));
    const hi = s.hi.map((v, c) => (origin[c] as number) + v * (pitch[c] as number));
    bMin.setTuple(i, lo);
    bMax.setTuple(i, hi);
    P.setTuple(i, lo.map((a, c) => 0.5 * (a + (hi[c] as number))));
    seed.set(i, s.seed ?? hashCombine(0xb41c, i));
    tag.set(i, s.tag ?? i);
    if (s.color !== undefined) color.setTuple(i, s.color);
    if (kind !== undefined) kind.setString(i, s.kind ?? "");
  });
  return geo;
}

async function pack(
  geo: Geometry,
  params: Partial<PackBricksParams> = {},
): Promise<{ out: Geometry; studs: Geometry }> {
  const r = await runNode(packBricks, { pitch: UNIT, ...params }, { in: [makeGeometryItem(geo)] });
  return { out: firstGeo(r.out), studs: firstGeo(r.studs) };
}

/** The message of a refusal, or a failure saying the cook went through. */
async function refusal(geo: Geometry, params: Partial<PackBricksParams> = {}): Promise<string> {
  try {
    await pack(geo, params);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected packBricks to refuse this input, but it cooked");
}

interface Brick {
  /** Minimum corner in lattice cells. */
  lo: V3;
  /** Extent in cells along x, y, z (the placed footprint, after any turn). */
  ext: V3;
  label: string;
  index: number;
  tag: number;
  color: number[];
  kind: string | undefined;
  P: number[];
  rot: number[];
  scale: number[];
  bMin: number[];
  bMax: number[];
}

/** Read every output brick back, converting its world corners to cells. */
function readBricks(geo: Geometry, pitch: V3 = UNIT, origin: V3 = ZERO): Brick[] {
  const pts = geo.attrs.point;
  const get = (name: string) => pts.require(name);
  const kind = pts.get("kind");
  const out: Brick[] = [];
  for (let i = 0; i < pts.count; i++) {
    const bMin = get("boundsMin").getTuple(i);
    const bMax = get("boundsMax").getTuple(i);
    const lo = [0, 1, 2].map((c) =>
      Math.round(((bMin[c] as number) - (origin[c] as number)) / (pitch[c] as number)),
    ) as V3;
    const hi = [0, 1, 2].map((c) =>
      Math.round(((bMax[c] as number) - (origin[c] as number)) / (pitch[c] as number)),
    );
    out.push({
      lo,
      ext: [0, 1, 2].map((c) => (hi[c] as number) - lo[c]) as V3,
      label: get("brick").getString(i),
      index: get("brickIndex").get(i),
      tag: get("tag").get(i),
      color: get("color").getTuple(i),
      kind: kind?.getString(i),
      P: get("P").getTuple(i),
      rot: get("rot").getTuple(i),
      scale: get("scale").getTuple(i),
      bMin,
      bMax,
    });
  }
  return out;
}

const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

/** Every cell the boxes cover, with the indices of every box covering it. */
function unionCells(specs: readonly BoxSpec[]): Map<string, number[]> {
  const cells = new Map<string, number[]>();
  specs.forEach((s, i) => {
    for (let y = s.lo[1]; y < s.hi[1]; y++) {
      for (let z = s.lo[2]; z < s.hi[2]; z++) {
        for (let x = s.lo[0]; x < s.hi[0]; x++) {
          const k = key(x, y, z);
          const list = cells.get(k) ?? [];
          list.push(i);
          cells.set(k, list);
        }
      }
    }
  });
  return cells;
}

/** Cell to brick index over the output, plus how many cells were covered twice. */
function rasterize(bricks: readonly Brick[]): { cells: Map<string, number>; doubled: number } {
  const cells = new Map<string, number>();
  let doubled = 0;
  bricks.forEach((b, id) => {
    for (let y = b.lo[1]; y < b.lo[1] + b.ext[1]; y++) {
      for (let z = b.lo[2]; z < b.lo[2] + b.ext[2]; z++) {
        for (let x = b.lo[0]; x < b.lo[0] + b.ext[0]; x++) {
          const k = key(x, y, z);
          if (cells.has(k)) doubled++;
          cells.set(k, id);
        }
      }
    }
  });
  return { cells, doubled };
}

/** Rotate v by the unit quaternion q = [x, y, z, w]. */
function rotate(q: readonly number[], v: readonly number[]): number[] {
  const [qx, qy, qz, qw] = q as [number, number, number, number];
  const [vx, vy, vz] = v as [number, number, number];
  // t = 2 (q.xyz x v); v' = v + w t + q.xyz x t
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

describe("packBricks: what it covers", () => {
  const cases: Record<string, BoxSpec[]> = {
    "overlapping and adjacent boxes": [
      { lo: [0, 0, 0], hi: [5, 3, 2] },
      { lo: [3, 1, 1], hi: [9, 4, 4] },
      { lo: [9, 0, 0], hi: [11, 2, 3] },
      { lo: [2, 2, 0], hi: [4, 7, 1] },
    ],
    // Twelve long, nine tall, one thick, with a window at x 4..8, y 3..6
    // built as the four boxes around it.
    "a wall with a window hole": [
      { lo: [0, 0, 0], hi: [12, 3, 1] },
      { lo: [0, 6, 0], hi: [12, 9, 1] },
      { lo: [0, 3, 0], hi: [4, 6, 1] },
      { lo: [8, 3, 0], hi: [12, 6, 1] },
    ],
    "an L shape": [
      { lo: [0, 0, 0], hi: [6, 3, 2] },
      { lo: [0, 0, 2], hi: [2, 3, 8] },
    ],
  };

  for (const [name, specs] of Object.entries(cases)) {
    it(`fills exactly the boxes' cells, each once: ${name}`, async () => {
      const { out } = await pack(boxCloud(specs));
      const { cells, doubled } = rasterize(readBricks(out));
      expect(doubled).toBe(0);
      const want = [...unionCells(specs).keys()].sort();
      expect([...cells.keys()].sort()).toEqual(want);
      // Non-vacuity: a cell count of zero would pass both of the above.
      expect(want.length).toBeGreaterThan(20);
    });
  }

  it("fills the window wall with the window left open", async () => {
    const { out } = await pack(boxCloud(cases["a wall with a window hole"] as BoxSpec[]));
    const { cells } = rasterize(readBricks(out));
    for (let y = 3; y < 6; y++) for (let x = 4; x < 8; x++) expect(cells.has(key(x, y, 0))).toBe(false);
    // And the rows either side of the opening are solid.
    expect(cells.has(key(3, 4, 0))).toBe(true);
    expect(cells.has(key(8, 4, 0))).toBe(true);
  });

  it("reads corners on the default plate pitch through f32 rounding", async () => {
    // 37 plates is 14.8 in decimal and 14.8000002 in f32: a corner the
    // author put on the lattice exactly, which the snap must accept.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [3, 37, 2] },
      { lo: [3, 5, 0], hi: [7, 11, 1] },
    ];
    const origin: V3 = [0.5, -1.2, 3];
    const { out } = await pack(boxCloud(specs, PLATE, origin), { pitch: PLATE, origin });
    const { cells, doubled } = rasterize(readBricks(out, PLATE, origin));
    expect(doubled).toBe(0);
    expect([...cells.keys()].sort()).toEqual([...unionCells(specs).keys()].sort());
  });
});

describe("packBricks: what a brick is", () => {
  // A wall along x (turned bricks), a wall along z (bricks as listed) and a
  // block, apart from each other, on the default plate pitch.
  const specs: BoxSpec[] = [
    { lo: [0, 0, 0], hi: [13, 6, 1] },
    { lo: [20, 0, 0], hi: [21, 6, 11] },
    { lo: [30, 0, 0], hi: [33, 4, 5] },
  ];

  it("is a catalogue entry, either way round, with its transform matching its bounds", async () => {
    const { out } = await pack(boxCloud(specs, PLATE), { pitch: PLATE });
    const flat = packBricks.defaultParams.bricks as readonly number[];
    const bricks = readBricks(out, PLATE);
    expect(bricks.length).toBeGreaterThan(5);
    let turnedSeen = 0;
    let listedSeen = 0;
    for (const b of bricks) {
      const w = flat[b.index * 3] as number;
      const d = flat[b.index * 3 + 1] as number;
      const h = flat[b.index * 3 + 2] as number;
      expect(b.label).toBe(`${w}x${d}x${h}`);
      expect(b.ext[1]).toBe(h);
      const asListed = b.ext[0] === w && b.ext[2] === d;
      const asTurned = b.ext[0] === d && b.ext[2] === w;
      expect(asListed || asTurned).toBe(true);
      // A square footprint is never placed turned: there is only one way.
      const turned = !asListed;
      if (turned) {
        turnedSeen++;
        expect(b.rot[0]).toBe(0);
        expect(b.rot[1]).toBeCloseTo(S, 6);
        expect(b.rot[2]).toBe(0);
        expect(b.rot[3]).toBeCloseTo(S, 6);
      } else {
        listedSeen++;
        expect(b.rot).toEqual([0, 0, 0, 1]);
      }
      // Scale is the OWN-frame extents, as listed.
      expect(b.scale[0]).toBeCloseTo(w * 1, 5);
      expect(b.scale[1]).toBeCloseTo(h * 0.4, 5);
      expect(b.scale[2]).toBeCloseTo(d * 1, 5);
      // P is the centre of the world corners.
      for (let c = 0; c < 3; c++) {
        expect(b.P[c]).toBeCloseTo(0.5 * ((b.bMin[c] as number) + (b.bMax[c] as number)), 5);
      }
      // A unit box through T * R * S lands on the bounds.
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const sx of [-0.5, 0.5]) {
        for (const sy of [-0.5, 0.5]) {
          for (const sz of [-0.5, 0.5]) {
            const v = rotate(b.rot, [
              sx * (b.scale[0] as number),
              sy * (b.scale[1] as number),
              sz * (b.scale[2] as number),
            ]);
            for (let c = 0; c < 3; c++) {
              const p = (v[c] as number) + (b.P[c] as number);
              lo[c] = Math.min(lo[c] as number, p);
              hi[c] = Math.max(hi[c] as number, p);
            }
          }
        }
      }
      for (let c = 0; c < 3; c++) {
        expect(lo[c]).toBeCloseTo(b.bMin[c] as number, 4);
        expect(hi[c]).toBeCloseTo(b.bMax[c] as number, 4);
      }
    }
    // Both branches were exercised, so neither half above is vacuous.
    expect(turnedSeen).toBeGreaterThan(0);
    expect(listedSeen).toBeGreaterThan(0);
  });

  it("names a custom catalogue's entry by its position in it", async () => {
    const bricks = [3, 1, 2, 1, 1, 1];
    const { out } = await pack(boxCloud([{ lo: [0, 0, 0], hi: [1, 2, 3] }]), { bricks });
    const got = readBricks(out);
    // 1 x 3 along z fits [3, 1, 2] turned.
    expect(got).toHaveLength(1);
    expect(got[0]?.label).toBe("3x1x2");
    expect(got[0]?.index).toBe(0);
    expect(got[0]?.ext).toEqual([1, 2, 3]);
  });
});

describe("packBricks: what a brick may not cross", () => {
  const red: [number, number, number, number] = [1, 0, 0, 1];
  const blue: [number, number, number, number] = [0, 0, 1, 1];

  /** Bricks crossing the x = 4 plane between the two boxes. */
  const crossing = (bricks: readonly Brick[]) => bricks.filter((b) => b.lo[0] < 4 && b.lo[0] + b.ext[0] > 4);

  it("never lets a brick span two colours under groupBy color", async () => {
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [4, 3, 1], color: red },
      { lo: [4, 0, 0], hi: [8, 3, 1], color: blue },
    ];
    const grouped = readBricks((await pack(boxCloud(specs), { groupBy: ["color"] })).out);
    expect(crossing(grouped)).toHaveLength(0);
    for (const b of grouped) expect(b.color).toEqual(b.lo[0] < 4 ? red : blue);
    // THE CONTROL: with no groupBy the same cells are one material, and
    // the 8-long wall goes in as one brick across the colour change.
    const ungrouped = readBricks((await pack(boxCloud(specs), { groupBy: [] })).out);
    expect(crossing(ungrouped).length).toBeGreaterThan(0);
  });

  it("never lets a brick span two string kinds under groupBy kind", async () => {
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [4, 3, 1], kind: "wall" },
      { lo: [4, 0, 0], hi: [8, 3, 1], kind: "glass" },
    ];
    const grouped = readBricks((await pack(boxCloud(specs), { groupBy: ["kind"] })).out);
    expect(crossing(grouped)).toHaveLength(0);
    for (const b of grouped) expect(b.kind).toBe(b.lo[0] < 4 ? "wall" : "glass");
    const ungrouped = readBricks((await pack(boxCloud(specs))).out);
    expect(crossing(ungrouped).length).toBeGreaterThan(0);
  });
});

describe("packBricks: what a brick carries", () => {
  it("carries the attributes of the box owning its anchor cell", async () => {
    // Disjoint boxes, no groupBy, so bricks DO span boxes and "the box of
    // the anchor" is a real choice rather than the only box there is.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [3, 3, 1], tag: 100, color: [0.1, 0.2, 0.3, 1] },
      { lo: [3, 0, 0], hi: [8, 3, 1], tag: 200, color: [0.4, 0.5, 0.6, 1] },
      { lo: [0, 3, 0], hi: [8, 4, 1], tag: 300, color: [0.7, 0.8, 0.9, 1] },
    ];
    const cells = unionCells(specs);
    const bricks = readBricks((await pack(boxCloud(specs))).out);
    let spanning = 0;
    for (const b of bricks) {
      const ownerIdx = cells.get(key(...b.lo))?.[0] as number;
      const owner = specs[ownerIdx] as BoxSpec;
      expect(b.tag).toBe(owner.tag);
      for (let c = 0; c < 4; c++) expect(b.color[c]).toBeCloseTo(owner.color?.[c] as number, 6);
      if (b.lo[0] < 3 && b.lo[0] + b.ext[0] > 3) spanning++;
    }
    expect(spanning).toBeGreaterThan(0);
  });

  it("gives a cell two boxes claim to the lower point identity, not the lower index", async () => {
    // A [0, 4) and B [2, 6) share x 2..3. Grouped by tag so the shared
    // cells' owner is visible as the tag of the brick covering them.
    const overlapOwnerTag = async (seedA: number): Promise<{ got: number[]; want: number }> => {
      const specs: BoxSpec[] = [
        { lo: [0, 0, 0], hi: [4, 3, 1], tag: 10, seed: seedA },
        { lo: [2, 0, 0], hi: [6, 3, 1], tag: 20, seed: hashCombine(77) },
      ];
      const geo = boxCloud(specs);
      const rank = canonicalPointRanks(geo, "test");
      const want = (rank[0] as number) < (rank[1] as number) ? 10 : 20;
      const bricks = readBricks((await pack(geo, { groupBy: ["tag"] })).out);
      const { cells } = rasterize(bricks);
      const got: number[] = [];
      for (const x of [2, 3]) {
        for (let y = 0; y < 3; y++) got.push((bricks[cells.get(key(x, y, 0)) as number] as Brick).tag);
      }
      return { got, want };
    };
    const first = await overlapOwnerTag(hashCombine(1));
    expect(first.got.every((t) => t === first.want)).toBe(true);
    // THE CONTROL: the array order is fixed, so only identity can flip the
    // owner. Search A's seed until A's identity ranks the other side of
    // B's, and the shared cells must follow it.
    let flipped: { got: number[]; want: number } | undefined;
    for (let s = 2; s < 200 && flipped === undefined; s++) {
      const r = await overlapOwnerTag(hashCombine(s));
      if (r.want !== first.want) flipped = r;
    }
    expect(flipped).toBeDefined();
    expect(flipped?.got.every((t) => t === flipped?.want)).toBe(true);
  });
});

describe("packBricks: determinism", () => {
  const specs: BoxSpec[] = [
    { lo: [0, 0, 0], hi: [7, 3, 2], tag: 1 },
    { lo: [4, 0, 1], hi: [10, 6, 3], tag: 2 },
    { lo: [2, 2, 0], hi: [5, 5, 3], tag: 3 },
    { lo: [8, 4, 0], hi: [12, 7, 1], tag: 4 },
    { lo: [0, 3, 0], hi: [3, 4, 2], tag: 5 },
    { lo: [9, 0, 0], hi: [11, 1, 4], tag: 6 },
  ];

  for (const groupBy of [[], ["tag"]]) {
    it(`writes byte-identical outputs however the input is ordered (groupBy [${groupBy.join(", ")}])`, async () => {
      const geo = boxCloud(specs);
      const order = shuffledOrder(specs.length, 13);
      expect(Array.from(order)).not.toEqual([0, 1, 2, 3, 4, 5]);
      const a = await pack(geo, { groupBy, islandsAttr: "islands" });
      const b = await pack(permutePoints(geo, order), { groupBy, islandsAttr: "islands" });
      expect(a.out.pointCount).toBeGreaterThan(3);
      expect(a.studs.pointCount).toBeGreaterThan(3);
      expect(snapshotGeometry(b.out)).toEqual(snapshotGeometry(a.out));
      expect(snapshotGeometry(b.studs)).toEqual(snapshotGeometry(a.studs));
      // THE CONTROL: the comparison can say "different". The same
      // permuted cloud with one box's tag changed must not compare equal.
      const changed = permutePoints(geo, order);
      changed.attrs.point.require("tag").set(0, 999);
      const c = await pack(changed, { groupBy, islandsAttr: "islands" });
      expect(snapshotGeometry(c.out)).not.toEqual(snapshotGeometry(a.out));
      expect(snapshotGeometry(c.studs)).not.toEqual(snapshotGeometry(a.studs));
    });
  }
});

describe("packBricks: height first", () => {
  it("lays a 3-plate wall in full-height bricks only", async () => {
    const bricks = readBricks((await pack(boxCloud([{ lo: [0, 0, 0], hi: [10, 3, 1] }]))).out);
    expect(bricks.length).toBeGreaterThan(0);
    for (const b of bricks) {
      expect(b.ext[1]).toBe(3);
      expect(b.label.endsWith("x3")).toBe(true);
    }
  });

  it("lays a 4-plate wall as one brick course and one plate course", async () => {
    const bricks = readBricks((await pack(boxCloud([{ lo: [0, 0, 0], hi: [10, 4, 1] }]))).out);
    const bottom = bricks.filter((b) => b.lo[1] === 0);
    const top = bricks.filter((b) => b.lo[1] === 3);
    expect(bottom.length + top.length).toBe(bricks.length);
    expect(bottom.length).toBeGreaterThan(0);
    expect(top.length).toBeGreaterThan(0);
    for (const b of bottom) expect(b.ext[1]).toBe(3);
    for (const b of top) expect(b.ext[1]).toBe(1);
  });
});

describe("packBricks: stagger", () => {
  /**
   * Head joints that run straight from one course into the next: interior
   * x positions where both courses have a brick boundary. The wall is one
   * stud thick and five full courses tall, so a course is a y band of 3.
   */
  async function straightJoints(stagger: number): Promise<number> {
    const L = 17;
    const bricks = readBricks(
      (await pack(boxCloud([{ lo: [0, 0, 0], hi: [L, 15, 1] }]), { stagger })).out,
    );
    const joints: Set<number>[] = Array.from({ length: 5 }, () => new Set<number>());
    for (const b of bricks) {
      // Every brick is a full course; the scan never needs a plate here.
      expect(b.ext[1]).toBe(3);
      expect(b.lo[1] % 3).toBe(0);
      if (b.lo[0] > 0) joints[b.lo[1] / 3]?.add(b.lo[0]);
    }
    let straight = 0;
    for (let c = 0; c + 1 < 5; c++) {
      for (const x of joints[c] as Set<number>) if ((joints[c + 1] as Set<number>).has(x)) straight++;
    }
    return straight;
  }

  it("breaks more head joints at stagger 3 than at stagger 0", async () => {
    const running = await straightJoints(0);
    const staggered = await straightJoints(3);
    // Non-vacuity: largest-first DOES let seams run up this wall.
    expect(running).toBeGreaterThan(0);
    expect(staggered).toBeLessThan(running);
  });
});

describe("packBricks: studs", () => {
  it("puts one stud on every top cell with nothing above it, and none under a brick", async () => {
    const origin: V3 = [0.5, 0, -2];
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [4, 3, 2], tag: 1 },
      { lo: [1, 3, 0], hi: [3, 4, 2], tag: 2 },
      { lo: [6, 0, 1], hi: [7, 2, 2], tag: 3 },
    ];
    const { out, studs } = await pack(boxCloud(specs, PLATE, origin), { pitch: PLATE, origin });
    const bricks = readBricks(out, PLATE, origin);
    const { cells: brickAt } = rasterize(bricks);
    const solid = unionCells(specs);

    // The oracle: every solid cell whose cell above is empty, stud on its
    // top face at the column's centre.
    const want = new Map<string, number>();
    for (const k of solid.keys()) {
      const [x, y, z] = k.split(",").map(Number) as V3;
      if (!solid.has(key(x, y + 1, z))) want.set(key(x, y + 1, z), brickAt.get(k) as number);
    }

    const sp = studs.attrs.point;
    expect(sp.count).toBe(want.size);
    const seen = new Set<string>();
    for (let s = 0; s < sp.count; s++) {
      const P = sp.require("P").getTuple(s);
      const cx = Math.round(((P[0] as number) - origin[0]) / PLATE[0] - 0.5);
      const cy = Math.round(((P[1] as number) - origin[1]) / PLATE[1]);
      const cz = Math.round(((P[2] as number) - origin[2]) / PLATE[2] - 0.5);
      expect(P[0]).toBeCloseTo(origin[0] + (cx + 0.5) * PLATE[0], 5);
      expect(P[1]).toBeCloseTo(origin[1] + cy * PLATE[1], 5);
      expect(P[2]).toBeCloseTo(origin[2] + (cz + 0.5) * PLATE[2], 5);
      const k = key(cx, cy, cz);
      expect(want.has(k)).toBe(true);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
      const b = bricks[want.get(k) as number] as Brick;
      expect(sp.require("brick").getString(s)).toBe(b.label);
      expect(sp.require("brickIndex").get(s)).toBe(b.index);
      expect(sp.require("tag").get(s)).toBe(b.tag);
      expect(sp.require("rot").getTuple(s)).toEqual([0, 0, 0, 1]);
      expect(sp.require("scale").getTuple(s)).toEqual([1, 1, 1]);
      expect(sp.require("boundsMin").getTuple(s)).toEqual([0, 0, 0]);
      expect(sp.require("boundsMax").getTuple(s)).toEqual([0, 0, 0]);
    }
    // The cell under the upper box: covered above, so no stud on the
    // lower box's top there — and its neighbour, not covered, has one.
    expect(seen.has(key(1, 3, 0))).toBe(false);
    expect(seen.has(key(0, 3, 0))).toBe(true);
    expect(seen.has(key(1, 4, 0))).toBe(true);
  });
});

describe("packBricks: islands", () => {
  const islands = async (specs: BoxSpec[], params: Partial<PackBricksParams> = {}): Promise<number> => {
    const { out } = await pack(boxCloud(specs), { islandsAttr: "islands", ...params });
    return out.attrs.detail.require("islands").get(0);
  };
  // 2x2 plates and 1x1 plates only, so two side-by-side 2x2s cannot be
  // merged into one 2x4 that would join them by construction.
  const small = [2, 2, 1, 1, 1, 1];

  it("counts two separate towers as two", async () => {
    expect(
      await islands([
        { lo: [0, 0, 0], hi: [2, 6, 2] },
        { lo: [5, 0, 0], hi: [7, 6, 2] },
      ]),
    ).toBe(2);
  });

  it("does not join plates that touch only at a side, and joins them with a plate across the top", async () => {
    const pair: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [2, 1, 2] },
      { lo: [2, 0, 0], hi: [4, 1, 2] },
    ];
    expect(await islands(pair, { bricks: small })).toBe(2);
    expect(await islands([...pair, { lo: [1, 1, 0], hi: [3, 2, 2] }], { bricks: small })).toBe(1);
  });

  it("writes no detail attribute when islandsAttr is empty", async () => {
    const { out } = await pack(boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]));
    expect(out.attrs.detail.names()).toEqual([]);
  });
});

describe("packBricks: refusals", () => {
  const one = (): Geometry => boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);

  it("refuses an off-lattice corner, naming the point", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [2, 3, 2] },
      { lo: [4, 0, 0], hi: [6, 3, 2] },
    ]);
    geo.attrs.point.require("boundsMin").set(1, 4.5, 0);
    const m = await refusal(geo);
    expect(m).toContain("point 1");
    expect(m).toContain("boundsMin.x");
    expect(m).toContain("not on the lattice");
  });

  it("refuses a maximum below the minimum", async () => {
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);
    geo.attrs.point.require("boundsMax").set(0, -1, 2);
    const m = await refusal(geo);
    expect(m).toContain("point 0");
    expect(m).toContain("boundsMax.z below boundsMin.z");
  });

  it("refuses a pitch with x and z different", async () => {
    expect(await refusal(one(), { pitch: [1, 1, 2] })).toContain('param "pitch"');
  });

  it("refuses a pitch component at or below zero", async () => {
    expect(await refusal(one(), { pitch: [1, 0, 1] })).toContain('param "pitch"');
    expect(await refusal(one(), { pitch: [-1, 1, -1] })).toContain('param "pitch"');
  });

  it("refuses a catalogue that is not whole triples", async () => {
    expect(await refusal(one(), { bricks: [1, 1, 1, 2] })).toContain('param "bricks"');
    expect(await refusal(one(), { bricks: [] })).toContain('param "bricks"');
  });

  it("refuses a non-integer or zero entry", async () => {
    const frac = await refusal(one(), { bricks: [1, 1, 1, 1.5, 2, 3] });
    expect(frac).toContain('param "bricks" entry 1');
    const zero = await refusal(one(), { bricks: [0, 1, 1] });
    expect(zero).toContain('param "bricks" entry 0');
  });

  it("refuses a duplicate entry, turned or not", async () => {
    const turned = await refusal(one(), { bricks: [1, 4, 3, 4, 1, 3, 1, 1, 1] });
    expect(turned).toContain('param "bricks"');
    expect(turned).toContain("entries 0 and 1");
    const same = await refusal(one(), { bricks: [1, 1, 1, 2, 2, 1, 1, 1, 1] });
    expect(same).toContain("entries 0 and 2");
  });

  it("refuses a catalogue that cannot cover a one-plate gap, naming the cell", async () => {
    // Four plates tall against full-height bricks only: the fourth plate
    // at y = 3 has nothing that fits.
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [1, 4, 1] }]);
    const m = await refusal(geo, { bricks: [1, 1, 3, 1, 2, 3] });
    expect(m).toContain('"bricks"');
    expect(m).toContain("lattice cell (0, 3, 0)");
    expect(m).toContain("point 0");
    // THE CONTROL: the same box with [1, 1, 1] added cooks.
    await expect(pack(geo, { bricks: [1, 1, 3, 1, 2, 3, 1, 1, 1] })).resolves.toBeDefined();
  });

  it("refuses groupBy naming a missing attribute", async () => {
    // The shared missing-attribute error: the message names the attribute
    // and lists what the input carries; the PARAM is on the typed record.
    let err: unknown;
    try {
      await pack(one(), { groupBy: ["material"] });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AttributeNotFoundError);
    const missing = err as AttributeNotFoundError;
    expect(missing.param).toBe("groupBy");
    expect(missing.attribute).toBe("material");
    expect(missing.message).toContain('"material"');
    expect(missing.message).toContain("tag");
  });

  it("refuses an input carrying `brick` as a non-string column", async () => {
    const geo = one();
    geo.attrs.point.add("brick", "f32", 1, 0);
    const m = await refusal(geo);
    expect(m).toContain('"brick"');
    expect(m).toContain("f32");
  });

  it("refuses a grid over the cell limit", async () => {
    // Two unit boxes far apart: 301 x 301 x 300 = 27.2 million cells.
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [1, 1, 1] },
      { lo: [300, 300, 299], hi: [301, 301, 300] },
    ]);
    const m = await refusal(geo);
    expect(m).toContain("301 x 301 x 300");
    expect(m).toContain(String(1 << 24));
  });
});

describe("packBricks: degenerate", () => {
  const columns = ["P", "rot", "scale", "boundsMin", "boundsMax", "brick", "brickIndex"];

  const expectEmpty = (geo: Geometry): void => {
    expect(geo.pointCount).toBe(0);
    for (const name of columns) expect(geo.attrs.point.has(name)).toBe(true);
    expect(geo.attrs.point.require("brick").type).toBe("string");
    expect(geo.attrs.point.require("brickIndex").type).toBe("i32");
  };

  it("cooks an empty input to two empty pins carrying the columns", async () => {
    const { out, studs } = await pack(createPointCloud(0), { islandsAttr: "islands" });
    expectEmpty(out);
    expectEmpty(studs);
    expect(out.attrs.detail.require("islands").get(0)).toBe(0);
  });

  it("cooks zero-volume boxes to two empty pins", async () => {
    const geo = boxCloud([
      { lo: [0, 0, 0], hi: [3, 0, 2] },
      { lo: [5, 1, 1], hi: [5, 4, 4] },
    ]);
    const { out, studs } = await pack(geo, { islandsAttr: "islands" });
    expectEmpty(out);
    expectEmpty(studs);
    expect(out.attrs.detail.require("islands").get(0)).toBe(0);
  });
});

describe("packBricks: cancellation", () => {
  it("checks for cancellation while it packs a large input", async () => {
    // A thousand separate 1x1x1 cells: a thousand owners to rasterize and
    // a thousand bricks to place, past the stride several times over.
    const specs: BoxSpec[] = Array.from({ length: 1000 }, (_, i) => ({
      lo: [2 * i, 0, 0] as V3,
      hi: [2 * i + 1, 1, 1] as V3,
    }));
    let calls = 0;
    await packBricks.execute({
      inputs: { in: [makeGeometryItem(boxCloud(specs))] },
      params: { ...packBricks.defaultParams, pitch: UNIT },
      seed: 1,
      checkCancelled() {
        calls++;
      },
    });
    expect(calls).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// bond, studMode, the stud index columns and the longer default plates.

/** brickConnectivity over a packed `out`: piece count and bricks no order attaches. */
async function holding(out: Geometry, pitch: V3 = UNIT): Promise<{ islands: number; never: number }> {
  const r = await runNode(
    brickConnectivity,
    { pitch, islandsAttr: "islands" },
    { in: [makeGeometryItem(out)] },
  );
  const geo = firstGeo(r.out);
  const step = geo.attrs.point.require("step");
  let never = 0;
  for (let i = 0; i < geo.pointCount; i++) if (step.get(i) < 0) never++;
  return { islands: geo.attrs.detail.require("islands").get(0), never };
}

/** Runs `body` with some of the hold search's budgets replaced, restoring them after. */
async function withHoldBudget<T>(budget: Partial<typeof holdBudget>, body: () => Promise<T>): Promise<T> {
  const saved = { ...holdBudget };
  Object.assign(holdBudget, budget);
  try {
    return await body();
  } finally {
    Object.assign(holdBudget, saved);
  }
}

/**
 * Four one-stud walls one brick course tall around a W x D room, and a
 * floor `courses` plates thick laid over the whole of it — so the floor's
 * plates over the empty room rest on nothing.
 */
function roomWithFloor(W: number, D: number, courses: number): BoxSpec[] {
  return [
    { lo: [0, 0, 0], hi: [W, 3, 1] },
    { lo: [0, 0, D - 1], hi: [W, 3, D] },
    { lo: [0, 0, 1], hi: [1, 3, D - 1] },
    { lo: [W - 1, 0, 1], hi: [W, 3, D - 1] },
    { lo: [0, 3, 0], hi: [W, 3 + courses, D] },
  ];
}

/** One-stud walls of material 0 round the rectangle [x0, x1) x [z0, z1), from course y0 to y1. */
function ring(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): BoxSpec[] {
  return [
    { lo: [x0, y0, z0], hi: [x1, y1, z0 + 1], tag: 0 },
    { lo: [x0, y0, z1 - 1], hi: [x1, y1, z1], tag: 0 },
    { lo: [x0, y0, z0 + 1], hi: [x0 + 1, y1, z1 - 1], tag: 0 },
    { lo: [x1 - 1, y0, z0 + 1], hi: [x1, y1, z1 - 1], tag: 0 },
  ];
}

/**
 * Two rooms side by side, W1 x D1 and W2 x D2, walled one brick tall, under
 * a one-plate floor (tag 1) and a second storey of walls: an upper floor of
 * a terrace, where each floor plate has to reach a wall on its own.
 */
function twoRooms(W1: number, W2: number, D1: number, D2: number): BoxSpec[] {
  return [
    ...ring(0, 0, W1, D1, 0, 3),
    ...ring(W1, 0, W1 + W2, D2, 0, 3),
    { lo: [0, 3, 0], hi: [W1, 4, D1], tag: 1 },
    { lo: [W1, 3, 0], hi: [W1 + W2, 4, D2], tag: 1 },
    ...ring(0, 0, W1, D1, 4, 7),
    ...ring(W1, 0, W1 + W2, D2, 4, 7),
  ];
}

describe("packBricks: bond", () => {
  it("defaults to 16, and studMode to exposed", () => {
    expect(packBricks.defaultParams.bond).toBe(16);
    expect(packBricks.defaultParams.studMode).toBe("exposed");
  });

  it("joins floor plates over an empty room that bond 0 leaves loose", async () => {
    // A 30 x 10 room under a two-plate floor, packed largest-first
    // (stagger 0) so nothing but `bond` steers the upper course across the
    // seams of the lower one. In the lower course a 30-stud row is more
    // than one plate, and a plate in the middle of it touches no wall.
    const specs = roomWithFloor(30, 10, 2);
    // With the ground repair off, so what is weighed is bond's alone: the
    // repair attaches what bond 0 leaves (see "attaching floating pieces").
    const noRepair = { ground: 0 };
    const loose = await withHoldBudget(noRepair, () => pack(boxCloud(specs), { stagger: 0, bond: 0 }));
    const bonded = await withHoldBudget(noRepair, () => pack(boxCloud(specs), { stagger: 0, bond: 16 }));
    // Both cover exactly the boxes' cells: bond changes WHICH bricks.
    const want = [...unionCells(specs).keys()].sort();
    for (const r of [loose, bonded]) {
      const { cells, doubled } = rasterize(readBricks(r.out));
      expect(doubled).toBe(0);
      expect([...cells.keys()].sort()).toEqual(want);
    }
    const a = await holding(loose.out);
    const b = await holding(bonded.out);
    // Non-vacuity: bond 0 really does leave bricks no order can attach.
    expect(a.never).toBeGreaterThan(0);
    expect(b.never).toBeLessThan(a.never);
    expect(b.islands).toBeLessThan(a.islands);
    // And with it on, bond 0's floor comes out attached as well.
    expect((await holding((await pack(boxCloud(specs), { stagger: 0, bond: 0 })).out)).never).toBe(0);
  });

  it("is never worse than bond 0 over a range of floored rooms", async () => {
    for (const [W, D, courses] of [
      [20, 20, 2],
      [30, 6, 2],
      [34, 10, 2],
      [40, 10, 2],
      [40, 20, 3],
    ] as const) {
      for (const stagger of [0, 3]) {
        const specs = roomWithFloor(W, D, courses);
        const a = await holding((await pack(boxCloud(specs), { stagger, bond: 0 })).out);
        const b = await holding((await pack(boxCloud(specs), { stagger, bond: 16 })).out);
        expect(b.never, `${W}x${D}x${courses} stagger ${stagger}`).toBeLessThanOrEqual(a.never);
      }
    }
  });

  it("packs walls, where everything below is standing, exactly as bond 0 does", async () => {
    const walls: Record<string, BoxSpec[]> = {
      "a long wall": [{ lo: [0, 0, 0], hi: [17, 15, 1] }],
      "a thick wall with a plate course": [{ lo: [0, 0, 0], hi: [23, 10, 2] }],
      "an L": [
        { lo: [0, 0, 0], hi: [9, 9, 2] },
        { lo: [0, 0, 2], hi: [2, 9, 13] },
      ],
      "a room's four walls": roomWithFloor(30, 10, 0)
        .slice(0, 4)
        .map((b) => ({ lo: b.lo, hi: [b.hi[0], 12, b.hi[2]] as V3 })),
    };
    for (const [name, specs] of Object.entries(walls)) {
      for (const stagger of [0, 3]) {
        const a = await pack(boxCloud(specs), { stagger, bond: 0, islandsAttr: "islands" });
        const b = await pack(boxCloud(specs), { stagger, bond: 16, islandsAttr: "islands" });
        expect(a.out.pointCount, name).toBeGreaterThan(3);
        expect(snapshotGeometry(b.out), `${name}, stagger ${stagger}`).toEqual(snapshotGeometry(a.out));
        expect(snapshotGeometry(b.studs), `${name}, stagger ${stagger}`).toEqual(snapshotGeometry(a.studs));
      }
    }
    // THE CONTROL: the comparison can say "different" — the floored room
    // above does pack differently under the two bonds.
    const specs = roomWithFloor(30, 10, 2);
    const a = await pack(boxCloud(specs), { stagger: 0, bond: 0 });
    const b = await pack(boxCloud(specs), { stagger: 0, bond: 16 });
    expect(snapshotGeometry(b.out)).not.toEqual(snapshotGeometry(a.out));
  });

  it("refuses a negative or non-finite bond, naming the param", async () => {
    const one = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);
    expect(await refusal(one, { bond: -1 })).toContain('param "bond"');
    expect(await refusal(one, { bond: Number.NaN })).toContain('param "bond"');
    expect(await refusal(one, { bond: Number.POSITIVE_INFINITY })).toContain('param "bond"');
  });
});

describe("packBricks: what holds", () => {
  // Every case is a ONE-plate floor (tag 1) over walls of another material,
  // with nothing over the floor: a floor plate is gripped only where a wall
  // brick is under it, so each plate has to reach a wall on its own — no
  // course above can bridge it, which is the case `bond` cannot answer.
  const floorPlates = (out: Geometry): Brick[] => readBricks(out).filter((b) => b.tag === 1);

  it("lays a floor plate that reaches a wall over a bigger one that reaches nothing", async () => {
    // An 8 x 8 floor whose only wall runs under its far edge, z = 7, in two
    // materials, so the wall is two bricks with a seam under x = 1 | 2.
    // By the score alone the first plate is an 8x2 across x (16, touching
    // no wall), not a 2x8 down z (16 less 3 for the stud of joint on the
    // seam): three of the four strips would be loose. Held first, every
    // strip runs down to the wall.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 7], hi: [2, 3, 8], tag: 2 },
      { lo: [2, 0, 7], hi: [8, 3, 8], tag: 3 },
      { lo: [0, 3, 0], hi: [8, 4, 8], tag: 1 },
    ];
    const { out } = await pack(boxCloud(specs), { groupBy: ["tag"] });
    // Non-vacuity: the wall really is two bricks, so the seam is there.
    expect(readBricks(out).filter((b) => b.tag !== 1)).toHaveLength(2);
    const plates = floorPlates(out);
    expect(plates.map((b) => b.ext)).toEqual([
      [2, 1, 8],
      [2, 1, 8],
      [2, 1, 8],
      [2, 1, 8],
    ]);
    // Two pieces, each standing on the table: the plates over either wall
    // brick, which nothing joins to the other's.
    expect(await holding(out)).toEqual({ islands: 2, never: 0 });
  });

  it("does not lay a plate that cuts the cell beside it off from every wall", async () => {
    // A 4 x 7 floor over walls at x = 0 and z = 6. By the score alone the
    // corner takes a 2x6 down z (12 less 3 for its seam, against 8 for a
    // 4x2 across x); that leaves the cell beside its first stud seven studs
    // from the wall at z = 6 with x = 0 taken, no plate is seven long, and
    // the plate that covers it is loose. Charged for the cell it strands,
    // the 2x6 loses to plates that each reach a wall.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [1, 3, 6], tag: 2 },
      { lo: [0, 0, 6], hi: [4, 3, 7], tag: 3 },
      { lo: [0, 3, 0], hi: [4, 4, 7], tag: 1 },
    ];
    const { out } = await pack(boxCloud(specs), { groupBy: ["tag"] });
    const plates = floorPlates(out);
    expect(plates.some((b) => b.lo[0] === 0 && b.lo[2] === 0 && b.ext[0] === 2 && b.ext[2] === 6)).toBe(false);
    expect(await holding(out)).toEqual({ islands: 1, never: 0 });
    const { cells, doubled } = rasterize(readBricks(out));
    expect(doubled).toBe(0);
    expect([...cells.keys()].sort()).toEqual([...unionCells(specs).keys()].sort());
  });

  it("does not trade one loose brick for two", async () => {
    // An 8 x 4 floor gripped at ONE cell, (0, 3). Only one plate can cover
    // that cell, so one loose plate is the least there can be. A held plate
    // at the corner runs down z to it and strands the cells beside it;
    // preferring it there would leave the rest in two loose plates.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 3], hi: [1, 3, 4], tag: 2 },
      { lo: [0, 3, 0], hi: [8, 4, 4], tag: 1 },
    ];
    const { out } = await pack(boxCloud(specs), { groupBy: ["tag"] });
    expect(floorPlates(out)).toHaveLength(2);
    expect((await holding(out)).never).toBe(1);
  });

  it("leaves nothing loose in a floor between two empty storeys over two rooms", async () => {
    // Two rooms side by side, W1 x D1 and W2 x D2, each walled one brick
    // tall, under a one-plate floor and a second storey of walls: the shape
    // a terrace of houses has at every upper floor. Measured over these 224
    // layouts, the score alone left 55 loose bricks in 46 of them; with
    // what holds first, 3 in 3 — a trap two placements back, which a
    // one-step look at the cells beside a placement cannot see — and with
    // the hold search behind it, none (see "packBricks: the hold search").
    let loose = 0;
    let layouts = 0;
    for (const W1 of [5, 7, 9, 11]) {
      for (const W2 of [5, 9]) {
        for (let D1 = 5; D1 <= 11; D1++) {
          for (const D2 of [5, 7, 9, 11]) {
            const { out } = await pack(boxCloud(twoRooms(W1, W2, D1, D2)), { groupBy: ["tag"] });
            loose += (await holding(out)).never;
            layouts++;
          }
        }
      }
    }
    expect(layouts).toBe(224);
    expect(loose).toBe(0);
  });
});

describe("packBricks: the hold search", () => {
  const floorPlates = (out: Geometry): Brick[] => readBricks(out).filter((b) => b.tag === 1);
  /** The `holdSearch` detail: [searched, solved, none holds, left], or undefined when it never ran. */
  const searched = (out: Geometry): number[] | undefined => {
    const a = out.attrs.detail.get("holdSearch");
    return a === undefined ? undefined : [0, 1, 2, 3].map((c) => a.get(0, c));
  };
  const withBudget = withHoldBudget;
  /**
   * A region budget of 0, and none for `settle`, leaves every region to the
   * greedy: the packer as it was before the search.
   */
  const greedyOnly = <T>(body: () => Promise<T>): Promise<T> => withBudget({ region: 0, settle: 0 }, body);
  const coversExactly = (specs: readonly BoxSpec[], out: Geometry): void => {
    const { cells, doubled } = rasterize(readBricks(out));
    expect(doubled).toBe(0);
    expect([...cells.keys()].sort()).toEqual([...unionCells(specs).keys()].sort());
  };

  // THE 16 x 16 HOUSE AT SEED 1868 left one floor plate loose; this is its
  // slab course cut down to the five boxes the trap needs. A floor (tag 1)
  // of two rows, z = 7 from x = 0 and z = 8 from x = 1, both to x = 11; a
  // post under (9, 7) and another under (10, 8); a wall over row 7 from
  // x = 7. Row 7 comes first and is one 1x12, held by the post and the wall
  // and stranding nothing a look beside it can see: the cell (11, 8) can
  // still be held by a 1x2 through the post at (10, 8). But row 8 starts at
  // x = 1, and its only held plate there runs to that post — a 1x10 — which
  // leaves (11, 8) a lone plate on nothing under nothing. Stopping row 7 at
  // x = 10 instead lets a plate turned down the last column tie (11, 8) to
  // the wall over (11, 7), and then every plate is held.
  const slab1868: BoxSpec[] = [
    { lo: [0, 1, 7], hi: [12, 2, 8], tag: 1 },
    { lo: [1, 1, 8], hi: [12, 2, 9], tag: 1 },
    { lo: [7, 2, 7], hi: [15, 3, 8], tag: 2 },
    { lo: [9, 0, 7], hi: [10, 1, 8], tag: 12 },
    { lo: [10, 0, 8], hi: [11, 1, 9], tag: 14 },
  ];
  // The three of the 224 two-room layouts the greedy left a plate loose in
  // (see "packBricks: what holds").
  const traps: [number, number, number, number][] = [
    [5, 9, 6, 11],
    [9, 9, 6, 11],
    [11, 9, 6, 11],
  ];

  it("holds the floor the greedy leaves a plate loose in, from the 16 x 16 house at seed 1868", async () => {
    // Non-vacuity, and the oracle above: the greedy alone lays the 1x12,
    // the 1x10 and the lone plate, and says the region was left to it.
    const greedy = await greedyOnly(() => pack(boxCloud(slab1868), { groupBy: ["tag"] }));
    expect(floorPlates(greedy.out).map((b) => [b.lo, b.ext])).toEqual([
      [[0, 1, 7], [12, 1, 1]],
      [[1, 1, 8], [10, 1, 1]],
      [[11, 1, 8], [1, 1, 1]],
    ]);
    expect((await holding(greedy.out)).never).toBe(1);
    expect(searched(greedy.out)).toEqual([1, 0, 0, 1]);

    const { out } = await pack(boxCloud(slab1868), { groupBy: ["tag"] });
    expect(searched(out)).toEqual([1, 1, 0, 0]);
    expect((await holding(out)).never).toBe(0);
    expect(floorPlates(out).some((b) => b.ext[0] === 12)).toBe(false);
    coversExactly(slab1868, out);
  });

  it("solves the three two-room layouts the greedy leaves a plate loose in", async () => {
    for (const [W1, W2, D1, D2] of traps) {
      const specs = twoRooms(W1, W2, D1, D2);
      const name = `${W1}, ${W2}, ${D1}, ${D2}`;
      const greedy = await greedyOnly(() => pack(boxCloud(specs), { groupBy: ["tag"] }));
      expect((await holding(greedy.out)).never, name).toBe(1);
      const { out } = await pack(boxCloud(specs), { groupBy: ["tag"] });
      expect(searched(out), name).toEqual([1, 1, 0, 0]);
      expect((await holding(out)).never, name).toBe(0);
      coversExactly(specs, out);
    }
  });

  it("falls back to the greedy when a budget runs out, and says so", async () => {
    const run = (budget: Partial<typeof holdBudget>) =>
      withBudget(budget, () => pack(boxCloud(slab1868), { groupBy: ["tag"] }));
    // Out of the region's budget and out of the cook's, with nothing for
    // `settle` either: both are the greedy's packing, the oracle of the
    // case above, and both say so.
    const region = await run({ region: 0, settle: 0 });
    const cook = await run({ cook: 0, settle: 0 });
    expect(searched(cook.out)).toEqual([1, 0, 0, 1]);
    expect(snapshotGeometry(cook.out)).toEqual(snapshotGeometry(region.out));
    expect(snapshotGeometry(cook.studs)).toEqual(snapshotGeometry(region.studs));
    expect(floorPlates(cook.out).map((b) => b.ext[0])).toEqual([12, 10, 1]);
    // With no budget for the scan, the search from the cell the fewest
    // placements cover still solves it on its own.
    const fewest = await run({ scan: 0 });
    expect(searched(fewest.out)).toEqual([1, 1, 0, 0]);
    expect((await holding(fewest.out)).never).toBe(0);
    coversExactly(slab1868, fewest.out);
  });

  it("says when a region has no held packing, and lays it as the greedy does", async () => {
    const cases: Record<string, BoxSpec[]> = {
      // Gripped at one cell, so one plate at most can be held.
      "an 8 x 4 floor gripped at one cell": [
        { lo: [0, 0, 3], hi: [1, 3, 4], tag: 2 },
        { lo: [0, 3, 0], hi: [8, 4, 4], tag: 1 },
      ],
      // The worst case for size: the middle of the floor is out of every
      // plate's reach from the ring, which the search sees before it lays
      // a brick.
      // Every cell IS in reach of a held plate here — the plates through the
      // three posts cover the floor between them — so no cell says it on
      // its own: the search itself has to prove it, by the count. Three
      // posts grip three plates at most, 96 studs, and the floor is 217.
      "a 31 x 7 floor over three posts, every cell in reach": [
        { lo: [0, 3, 0], hi: [31, 4, 7], tag: 1 },
        { lo: [15, 0, 0], hi: [16, 3, 1], tag: 0 },
        { lo: [15, 0, 3], hi: [16, 3, 4], tag: 0 },
        { lo: [15, 0, 6], hi: [16, 3, 7], tag: 0 },
      ],
      "a 120 x 120 one-plate floor over a ring wall": [
        ...ring(0, 0, 120, 120, 0, 3),
        { lo: [0, 3, 0], hi: [120, 4, 120], tag: 1 },
        ...ring(0, 0, 120, 120, 4, 7),
      ],
    };
    for (const [name, specs] of Object.entries(cases)) {
      const { out, studs } = await pack(boxCloud(specs), { groupBy: ["tag"] });
      expect(searched(out), name).toEqual([1, 0, 1, 0]);
      const greedy = await greedyOnly(() => pack(boxCloud(specs), { groupBy: ["tag"] }));
      expect(snapshotGeometry(out).point, name).toEqual(snapshotGeometry(greedy.out).point);
      expect(snapshotGeometry(studs), name).toEqual(snapshotGeometry(greedy.studs));
      expect((await holding(out)).never, name).toBeGreaterThan(0);
    }
  });

  it("never searches a course with no brick held by nothing, and writes nothing there", async () => {
    const builds: Record<string, BoxSpec[]> = {
      "a long wall": [{ lo: [0, 0, 0], hi: [17, 15, 1] }],
      "a room's four walls": ring(0, 0, 30, 10, 0, 12),
      "a floor whose plates each reach a wall": [
        { lo: [0, 0, 7], hi: [2, 3, 8], tag: 2 },
        { lo: [2, 0, 7], hi: [8, 3, 8], tag: 3 },
        { lo: [0, 3, 0], hi: [8, 4, 8], tag: 1 },
      ],
      "a floor over two rooms the greedy holds": twoRooms(7, 5, 7, 5),
    };
    for (const [name, specs] of Object.entries(builds)) {
      const a = await pack(boxCloud(specs), { groupBy: ["tag"], islandsAttr: "islands" });
      expect(searched(a.out), name).toBeUndefined();
      expect((await holding(a.out)).never, name).toBe(0);
      // Nothing a budget could change: the greedy alone packs it the same.
      const b = await greedyOnly(() => pack(boxCloud(specs), { groupBy: ["tag"], islandsAttr: "islands" }));
      expect(snapshotGeometry(b.out), name).toEqual(snapshotGeometry(a.out));
      expect(snapshotGeometry(b.studs), name).toEqual(snapshotGeometry(a.studs));
    }
  });

  it("packs a searched course byte for byte the same however the input is ordered", async () => {
    for (const specs of [slab1868, twoRooms(9, 9, 6, 11)]) {
      const geo = boxCloud(specs);
      const order = shuffledOrder(specs.length, 7);
      const a = await pack(geo, { groupBy: ["tag"], islandsAttr: "islands" });
      const again = await pack(geo, { groupBy: ["tag"], islandsAttr: "islands" });
      const b = await pack(permutePoints(geo, order), { groupBy: ["tag"], islandsAttr: "islands" });
      expect(searched(a.out)).toEqual([1, 1, 0, 0]);
      expect(snapshotGeometry(again.out)).toEqual(snapshotGeometry(a.out));
      expect(snapshotGeometry(b.out)).toEqual(snapshotGeometry(a.out));
      expect(snapshotGeometry(b.studs)).toEqual(snapshotGeometry(a.studs));
      // THE CONTROL: the comparison can say "different" — the greedy's
      // packing of the same course is not the search's.
      const greedy = await greedyOnly(() => pack(geo, { groupBy: ["tag"], islandsAttr: "islands" }));
      expect(snapshotGeometry(greedy.out)).not.toEqual(snapshotGeometry(a.out));
    }
  });

  // A one-plate floor W x D walled round below and above, where every
  // plate has to reach the wall: the slab of an upper storey, one stud
  // past what a slab of the default plates always packs.
  const walledSlab = (W: number, D: number): BoxSpec[] => [
    ...ring(0, 0, W, D, 0, 3),
    { lo: [0, 3, 0], hi: [W, 4, D], tag: 1 },
    ...ring(0, 0, W, D, 4, 7),
  ];
  // The house's catalogue: the default plates and bricks with its
  // baseplates, 16 to 40 studs a side, appended.
  const baseplates = [16, 16, 1, 16, 24, 1, 16, 32, 1, 16, 40, 1, 24, 24, 1, 24, 32, 1, 24, 40, 1, 32, 32, 1, 32, 40, 1, 40, 40, 1];

  it("proves by parity that a 21 x 21 floor walled round has no held packing", async () => {
    // Every plate that reaches the middle 13 x 13 of the floor from the
    // wall does so by an even length (6 to 16, from 4 cells out), so it
    // covers an even number of those 169 cells, and no set of them covers
    // all 169. The search, laying one plate at a time, runs out before it
    // sees that; the count is what proves it.
    const specs = walledSlab(21, 21);
    const searchOnly = await withBudget({ settle: 0 }, () => pack(boxCloud(specs), { groupBy: ["tag"] }));
    expect(searched(searchOnly.out)).toEqual([1, 0, 0, 1]);
    const { out, studs } = await pack(boxCloud(specs), { groupBy: ["tag"] });
    expect(searched(out)).toEqual([1, 0, 1, 0]);
    // Proven or not, the region is the greedy's, and the build is the same.
    expect(snapshotGeometry(out).point).toEqual(snapshotGeometry(searchOnly.out).point);
    expect(snapshotGeometry(studs)).toEqual(snapshotGeometry(searchOnly.studs));
    expect((await holding(out)).never).toBeGreaterThan(0);
  });

  it("packs a 29 x 30 floor walled round that the search runs out on, by straight cuts", async () => {
    // Held packings exist — a baseplate from the wall and strips of plates
    // along the rest — but a search laying one plate at a time from a
    // corner first tries every packing a wrong first baseplate allows.
    const specs = walledSlab(29, 30);
    const params = { groupBy: ["tag"], extraBricks: baseplates };
    const searchOnly = await withBudget({ settle: 0 }, () => pack(boxCloud(specs), params));
    expect(searched(searchOnly.out)).toEqual([1, 0, 0, 1]);
    expect((await holding(searchOnly.out)).never).toBeGreaterThan(0);
    const { out } = await pack(boxCloud(specs), params);
    expect(searched(out)).toEqual([1, 1, 0, 0]);
    expect((await holding(out)).never).toBe(0);
    coversExactly(specs, out);
    // And without the search at all, `settle` alone finds it.
    const settleOnly = await withBudget({ region: 0 }, () => pack(boxCloud(specs), params));
    expect(searched(settleOnly.out)).toEqual([1, 1, 0, 0]);
    expect((await holding(settleOnly.out)).never).toBe(0);
  });

  it("solves exactly what has a held packing and proves none only where none exists, against an exhaustive count", async () => {
    // Small floors over random posts, the search given no budget, so
    // `settle` alone decides every region; each region checked against an
    // exhaustive enumeration of held packings written here.
    // The default catalogue's plates, either way round.
    const plates: [number, number][] = [];
    const flat = packBricks.defaultParams.bricks;
    for (let i = 0; i < flat.length; i += 3) {
      const [a, b, h] = [flat[i] as number, flat[i + 1] as number, flat[i + 2] as number];
      if (h !== 1) continue;
      plates.push([a, b]);
      if (a !== b) plates.push([b, a]);
    }
    const anyHeld = (W: number, D: number, grip: Uint8Array): boolean => {
      const filled = new Uint8Array(W * D);
      const go = (): boolean => {
        const c = filled.indexOf(0);
        if (c < 0) return true;
        const x = c % W;
        const z = (c - x) / W;
        for (const [fx, fz] of plates) {
          if (x + fx > W || z + fz > D) continue;
          let ok = true;
          let held = false;
          for (let zz = z; zz < z + fz && ok; zz++) {
            for (let xx = x; xx < x + fx; xx++) {
              if (filled[zz * W + xx] === 1) ok = false;
              if (grip[zz * W + xx] === 1) held = true;
            }
          }
          if (!ok || !held) continue;
          for (let zz = z; zz < z + fz; zz++) for (let xx = x; xx < x + fx; xx++) filled[zz * W + xx] = 1;
          if (go()) return true;
          for (let zz = z; zz < z + fz; zz++) for (let xx = x; xx < x + fx; xx++) filled[zz * W + xx] = 0;
        }
        return false;
      };
      return go();
    };
    let seed = 12345;
    const rnd = (): number => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
    const tally = { searched: 0, solved: 0, none: 0, left: 0 };
    for (let i = 0; i < 120; i++) {
      const W = 3 + Math.floor(rnd() * 5);
      const D = 3 + Math.floor(rnd() * 5);
      const grip = new Uint8Array(W * D);
      const specs: BoxSpec[] = [{ lo: [0, 3, 0], hi: [W, 4, D], tag: 1 }];
      const dens = 0.04 + rnd() * 0.2;
      for (let c = 0; c < W * D; c++) {
        if (rnd() >= dens) continue;
        grip[c] = 1;
        specs.push({ lo: [c % W, 0, Math.floor(c / W)], hi: [(c % W) + 1, 3, Math.floor(c / W) + 1], tag: 0 });
      }
      const { out } = await withBudget({ region: 0 }, () => pack(boxCloud(specs), { groupBy: ["tag"] }));
      const hs = searched(out);
      if (hs === undefined) continue;
      tally.searched++;
      const exists = anyHeld(W, D, grip);
      const name = `${W} x ${D}, case ${i}`;
      if (hs[1] === 1) {
        tally.solved++;
        expect(exists, name).toBe(true);
        expect((await holding(out)).never, name).toBe(0);
        coversExactly(specs, out);
      } else if (hs[2] === 1) {
        tally.none++;
        expect(exists, name).toBe(false);
      } else tally.left++;
    }
    // Not vacuous: both answers came up, many times.
    expect(tally.solved).toBeGreaterThan(5);
    expect(tally.none).toBeGreaterThan(5);
  });

  it("lays again only what a searched region changes, brick for brick as laying the whole course again", async () => {
    const full = (body: () => Promise<{ out: Geometry; studs: Geometry }>) => {
      holdRelay.partial = false;
      return body().finally(() => {
        holdRelay.partial = true;
      });
    };
    // A course of two materials, one after the other in scan order, both
    // standing on plates that float in the course below (held from above,
    // so each is a piece of its own until the course joins them). The
    // first material is a region the search solves; its packing joins the
    // floating pieces differently from the greedy's, and that changes the
    // `bond` the greedy weighs at anchors of the second material, which
    // the relaying has to see through the pieces alone — no cell of the
    // second material is read differently. Measured: laying the earlier
    // brick again there without weighing it, as if nothing under it had
    // changed, comes out different from the full relaying in this case.
    const floating: BoxSpec[] = [
      { lo: [5, 0, 4], hi: [6, 3, 5], tag: 0 },
      { lo: [11, 0, 3], hi: [12, 3, 4], tag: 0 },
      { lo: [4, 3, 8], hi: [5, 4, 17], tag: 5 },
      { lo: [8, 3, 1], hi: [9, 4, 11], tag: 6 },
      { lo: [8, 3, 8], hi: [10, 4, 17], tag: 5 },
      { lo: [4, 3, 4], hi: [5, 4, 17], tag: 6 },
      { lo: [0, 3, 5], hi: [2, 4, 16], tag: 5 },
      { lo: [6, 3, 4], hi: [9, 4, 16], tag: 6 },
      { lo: [0, 4, 0], hi: [14, 5, 8], tag: 1 },
      { lo: [0, 4, 8], hi: [14, 5, 17], tag: 2 },
      { lo: [10, 5, 6], hi: [11, 8, 7], tag: 0 },
      { lo: [7, 5, 7], hi: [8, 8, 8], tag: 0 },
      { lo: [2, 5, 9], hi: [3, 8, 10], tag: 0 },
    ];
    const fixtures = [floating, slab1868, ...traps.map(([a, b, c, d]) => twoRooms(a, b, c, d)), walledSlab(29, 30)];
    for (const specs of fixtures) {
      const params = { groupBy: ["tag"], extraBricks: baseplates, islandsAttr: "islands" };
      const a = await pack(boxCloud(specs), params);
      const b = await full(() => pack(boxCloud(specs), params));
      expect(searched(a.out)?.[1]).toBeGreaterThan(0);
      expect(snapshotGeometry(a.out)).toEqual(snapshotGeometry(b.out));
      expect(snapshotGeometry(a.studs)).toEqual(snapshotGeometry(b.studs));
    }
    // And many like the first: random floating plates under a course of
    // two materials, posts to the ground under some cells and on top of
    // others.
    let seed = 5;
    const rnd = (a: number, b: number): number => a + Math.floor(((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296) * (b - a + 1));
    let solved = 0;
    for (let i = 0; i < 150; i++) {
      const W = rnd(8, 20);
      const D = rnd(4, 10);
      const specs: BoxSpec[] = [];
      for (let k = rnd(1, 6); k > 0; k--) {
        const [x, z] = [rnd(0, W - 1), rnd(0, 2 * D)];
        specs.push({ lo: [x, 0, z], hi: [x + 1, 3, z + 1], tag: 0 });
      }
      for (let k = rnd(2, 6); k > 0; k--) {
        const [x, z, w, d] = [rnd(0, W - 2), rnd(0, D), rnd(1, 3), rnd(D, 2 * D)];
        specs.push({ lo: [x, 3, z], hi: [Math.min(W, x + w), 4, Math.min(2 * D + 1, z + d)], tag: 5 + (k % 2) });
      }
      specs.push({ lo: [0, 4, 0], hi: [W, 5, D], tag: 1 }, { lo: [0, 4, D], hi: [W, 5, 2 * D + 1], tag: 2 });
      for (let k = rnd(0, 5); k > 0; k--) {
        const [x, z] = [rnd(0, W - 1), rnd(0, 2 * D)];
        specs.push({ lo: [x, 5, z], hi: [x + 1, 8, z + 1], tag: 0 });
      }
      const geo = boxCloud(specs);
      const a = await pack(geo, { groupBy: ["tag"], islandsAttr: "islands" });
      const b = await full(() => pack(geo, { groupBy: ["tag"], islandsAttr: "islands" }));
      expect(snapshotGeometry(a.out), `case ${i}`).toEqual(snapshotGeometry(b.out));
      expect(snapshotGeometry(a.studs), `case ${i}`).toEqual(snapshotGeometry(b.studs));
      solved += searched(a.out)?.[1] ?? 0;
    }
    // Not vacuous: regions were solved, so courses were laid again.
    expect(solved).toBeGreaterThan(20);
  });
});

describe("packBricks: attaching floating pieces", () => {
  /**
   * The `groundRepair` detail: [pieces floating before, their bricks,
   * pieces floating after, their bricks, courses asked, repairs kept], or
   * undefined when nothing floated.
   */
  const repaired = (out: Geometry): number[] | undefined => {
    const a = out.attrs.detail.get("groundRepair");
    return a === undefined ? undefined : [0, 1, 2, 3, 4, 5].map((c) => a.get(0, c));
  };
  const searched = (out: Geometry): number[] | undefined => {
    const a = out.attrs.detail.get("holdSearch");
    return a === undefined ? undefined : [0, 1, 2, 3].map((c) => a.get(0, c));
  };
  /** The repair off: it still asks what floats, and asks no course to change. */
  const noRepair = <T>(body: () => Promise<T>): Promise<T> => withHoldBudget({ ground: 0 }, body);
  /**
   * What floats, as brickConnectivity says it — the oracle, never the
   * packer's own count: the pieces holding a brick of step -1, those
   * bricks, and the courses they start in.
   */
  async function floating(out: Geometry): Promise<{ pieces: number; bricks: number; courses: number[] }> {
    const r = await runNode(brickConnectivity, { pitch: UNIT }, { in: [makeGeometryItem(out)] });
    const geo = firstGeo(r.out);
    const step = geo.attrs.point.require("step");
    const island = geo.attrs.point.require("island");
    const lo = geo.attrs.point.require("boundsMin");
    const pieces = new Set<number>();
    const courses = new Set<number>();
    let bricks = 0;
    for (let i = 0; i < geo.pointCount; i++) {
      if (step.get(i) >= 0) continue;
      bricks++;
      pieces.add(island.get(i));
      courses.add(lo.get(i, 1));
    }
    return { pieces: pieces.size, bricks, courses: [...courses].sort((a, b) => a - b) };
  }
  const coversExactly = (specs: readonly BoxSpec[], out: Geometry): void => {
    const { cells, doubled } = rasterize(readBricks(out));
    expect(doubled).toBe(0);
    expect([...cells.keys()].sort()).toEqual([...unionCells(specs).keys()].sort());
  };
  const params = { groupBy: ["tag"] };

  // THE EAVE OF THE BRICK HOUSE AT SEED 1185, on a 32 x 32 lot without its
  // third block split, cut down from 424 boxes to eight: a one-plate floor
  // (tag 1) running out past its walls (tag 0, and 2 beyond them), and a
  // roof (tag 3) two and three plates thick standing on the part over the
  // room. The greedy lays the floor's edge row over nothing, held only by
  // the roof plates over it, and the roof's edge column held only by that
  // row: twelve bricks holding each other across two courses, every one of
  // them held, none of them reaching the table. No per-course look sees it.
  const eave: BoxSpec[] = [
    { lo: [0, 3, 0], hi: [14, 4, 32], tag: 1 },
    { lo: [14, 3, 21], hi: [15, 4, 32], tag: 1 },
    { lo: [0, 0, 14], hi: [14, 3, 15], tag: 0 },
    { lo: [0, 0, 16], hi: [1, 3, 21], tag: 0 },
    { lo: [13, 0, 21], hi: [14, 3, 31], tag: 0 },
    { lo: [14, 0, 21], hi: [15, 3, 31], tag: 2 },
    { lo: [0, 4, 16], hi: [14, 6, 31], tag: 3 },
    { lo: [1, 6, 16], hi: [13, 7, 31], tag: 3 },
  ];
  // The same delta-minimised further, to six boxes: a 1x1 plate of its own
  // material (tag 2) hung under the floor's corner cell (14, 3, 22), on
  // nothing. The two plates hold each other and nothing else. Its lowest
  // course cannot be made firm — nothing under the hanging plate at all —
  // so the repair asks the course above, where a plate from the corner
  // reaches over the wall at x = 13.
  const hanging: BoxSpec[] = [
    { lo: [0, 3, 0], hi: [14, 4, 32], tag: 1 },
    { lo: [14, 3, 22], hi: [15, 4, 23], tag: 1 },
    { lo: [1, 0, 14], hi: [13, 3, 15], tag: 0 },
    { lo: [13, 0, 21], hi: [14, 3, 23], tag: 0 },
    { lo: [14, 2, 22], hi: [15, 3, 23], tag: 2 },
    { lo: [1, 4, 22], hi: [13, 5, 25], tag: 3 },
  ];

  it("attaches a floor strip and the roof over it that hold each other and nothing else, from the house at seed 1185", async () => {
    // Non-vacuity, and the oracle: with the repair off, twelve bricks of
    // one piece float across two courses, and the hold search never ran.
    const off = await noRepair(() => pack(boxCloud(eave), params));
    expect(await floating(off.out)).toEqual({ pieces: 1, bricks: 12, courses: [3, 4] });
    expect(searched(off.out)).toBeUndefined();
    expect(repaired(off.out)).toEqual([1, 12, 1, 12, 0, 0]);

    const { out } = await pack(boxCloud(eave), params);
    expect((await floating(out)).bricks).toBe(0);
    // One course asked — the floor, the piece's lowest — and kept.
    expect(repaired(out)).toEqual([1, 12, 0, 0, 1, 1]);
    expect(searched(out)).toBeUndefined();
    coversExactly(eave, out);
  });

  it("asks the course above when the piece's lowest course cannot stand firm", async () => {
    const off = await noRepair(() => pack(boxCloud(hanging), params));
    expect(await floating(off.out)).toEqual({ pieces: 1, bricks: 2, courses: [2, 3] });
    const { out } = await pack(boxCloud(hanging), params);
    expect((await floating(out)).bricks).toBe(0);
    // Two courses asked: the hanging plate's, which has no firm packing,
    // and the floor's, kept.
    expect(repaired(out)).toEqual([1, 2, 0, 0, 2, 1]);
    coversExactly(hanging, out);
  });

  it("never engages where nothing floats: no detail, and byte for byte as with it off", async () => {
    const builds: Record<string, BoxSpec[]> = {
      "a long wall": [{ lo: [0, 0, 0], hi: [17, 15, 1] }],
      "a room's four walls": ring(0, 0, 30, 10, 0, 12),
      "a floor over two rooms the search holds": twoRooms(9, 9, 6, 11),
      "a floored room": roomWithFloor(20, 20, 2),
    };
    for (const [name, specs] of Object.entries(builds)) {
      const a = await pack(boxCloud(specs), { ...params, islandsAttr: "islands" });
      expect((await floating(a.out)).bricks, name).toBe(0);
      expect(repaired(a.out), name).toBeUndefined();
      const b = await noRepair(() => pack(boxCloud(specs), { ...params, islandsAttr: "islands" }));
      expect(snapshotGeometry(a.out), name).toEqual(snapshotGeometry(b.out));
      expect(snapshotGeometry(a.studs), name).toEqual(snapshotGeometry(b.studs));
    }
  });

  it("does not ask a course the hold search came back from without a held packing", async () => {
    // The 21 x 21 walled slab: proven to have no held packing, so its loose
    // plate is a piece no packing of that course can attach (a firm packing
    // is a held one), and no packing of another course can either — held
    // depends only on which cells are filled below and above.
    const specs = [...ring(0, 0, 21, 21, 0, 3), { lo: [0, 3, 0], hi: [21, 4, 21], tag: 1 }, ...ring(0, 0, 21, 21, 4, 7)] as BoxSpec[];
    const { out, studs } = await pack(boxCloud(specs), params);
    expect(searched(out)).toEqual([1, 0, 1, 0]);
    const f = await floating(out);
    expect(f.bricks).toBeGreaterThan(0);
    expect(repaired(out)).toEqual([f.pieces, f.bricks, f.pieces, f.bricks, 0, 0]);
    const off = await noRepair(() => pack(boxCloud(specs), params));
    expect(snapshotGeometry(out).point).toEqual(snapshotGeometry(off.out).point);
    expect(snapshotGeometry(studs)).toEqual(snapshotGeometry(off.studs));
  });

  it("puts the build back exactly as it was when a repair does not stand", async () => {
    // With no budget for the hold search or `settle`, no region the repair
    // asks for can be packed, so every course it asks is laid again and
    // then put back.
    const starved = { region: 0, settle: 0 };
    const a = await withHoldBudget(starved, () => pack(boxCloud(eave), params));
    const b = await withHoldBudget({ ...starved, ground: 0 }, () => pack(boxCloud(eave), params));
    const asked = repaired(a.out) as number[];
    expect(asked.slice(0, 4)).toEqual([1, 12, 1, 12]);
    expect(asked[4]).toBeGreaterThan(0);
    expect(asked[5]).toBe(0);
    expect(snapshotGeometry(a.out).point).toEqual(snapshotGeometry(b.out).point);
    expect(snapshotGeometry(a.studs)).toEqual(snapshotGeometry(b.studs));
  });

  it("stops at its budget and says how far it got", async () => {
    // The floor course is the first asked, and costs every cell from it up:
    // one cell short of that, nothing is asked.
    const cells = (bricks: Brick[]): number => {
      const lo = [0, 1, 2].map((c) => Math.min(...bricks.map((b) => b.lo[c] as number)));
      const hi = [0, 1, 2].map((c) => Math.max(...bricks.map((b) => (b.lo[c] as number) + (b.ext[c] as number))));
      return ((hi[0] as number) - (lo[0] as number)) * ((hi[2] as number) - (lo[2] as number)) * ((hi[1] as number) - 3);
    };
    const off = await noRepair(() => pack(boxCloud(eave), params));
    const cost = cells(readBricks(off.out));
    const short = await withHoldBudget({ ground: cost - 1 }, () => pack(boxCloud(eave), params));
    expect(repaired(short.out)).toEqual([1, 12, 1, 12, 0, 0]);
    expect(snapshotGeometry(short.out).point).toEqual(snapshotGeometry(off.out).point);
    const enough = await withHoldBudget({ ground: cost }, () => pack(boxCloud(eave), params));
    expect(repaired(enough.out)).toEqual([1, 12, 0, 0, 1, 1]);
  });

  it("packs the same however the input is ordered, and as laying each course again in full", async () => {
    for (const specs of [eave, hanging]) {
      const geo = boxCloud(specs);
      const p = { ...params, islandsAttr: "islands" };
      const a = await pack(geo, p);
      const again = await pack(geo, p);
      const shuffled = await pack(permutePoints(geo, shuffledOrder(specs.length, 3)), p);
      holdRelay.partial = false;
      const full = await pack(geo, p).finally(() => {
        holdRelay.partial = true;
      });
      for (const b of [again, shuffled, full]) {
        expect(snapshotGeometry(b.out)).toEqual(snapshotGeometry(a.out));
        expect(snapshotGeometry(b.studs)).toEqual(snapshotGeometry(a.studs));
      }
      // THE CONTROL: the comparison can say "different".
      const off = await noRepair(() => pack(geo, p));
      expect(snapshotGeometry(off.out).point).not.toEqual(snapshotGeometry(a.out).point);
    }
  });

  it("says only what it checked: its counts are brickConnectivity's, before and after, over random eaves", async () => {
    // Floors over a few walls and posts, with roof blocks of two materials
    // over parts of them: many float, some across courses, and some of
    // those the repair attaches.
    let seed = 7;
    const rnd = (a: number, b: number): number => a + Math.floor(((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296) * (b - a + 1));
    let kept = 0;
    let fewer = 0;
    for (let i = 0; i < 80; i++) {
      const W = rnd(6, 16);
      const D = rnd(6, 16);
      const specs: BoxSpec[] = [];
      for (let k = rnd(1, 4); k > 0; k--) {
        const [along, x, z, L] = [rnd(0, 1), rnd(1, W - 2), rnd(1, D - 2), rnd(2, 12)];
        specs.push(along === 1 ? { lo: [x, 0, z], hi: [Math.min(W, x + L), 3, z + 1], tag: 0 } : { lo: [x, 0, z], hi: [x + 1, 3, Math.min(D, z + L)], tag: 0 });
      }
      for (let k = rnd(0, 3); k > 0; k--) {
        const [x, z] = [rnd(0, W - 1), rnd(0, D - 1)];
        specs.push({ lo: [x, rnd(0, 2), z], hi: [x + 1, 3, z + 1], tag: rnd(0, 1) === 1 ? 0 : 4 });
      }
      specs.push({ lo: [0, 3, 0], hi: [W, 4, D], tag: 1 });
      for (let k = rnd(1, 3); k > 0; k--) {
        const [x, z] = [rnd(0, W - 2), rnd(0, D - 2)];
        const [w, d, y] = [rnd(1, W - x), rnd(1, D - z), 4 + rnd(0, 1)];
        specs.push({ lo: [x, y, z], hi: [x + w, y + rnd(1, 3), z + d], tag: 2 + rnd(0, 1) });
      }
      const name = `case ${i}`;
      const geo = boxCloud(specs);
      // Overlapping boxes of two materials can leave a gap no entry fits;
      // that refusal is not this test's business, and both cooks make it.
      let a: { out: Geometry; studs: Geometry };
      try {
        a = await pack(geo, params);
      } catch {
        await expect(noRepair(() => pack(geo, params))).rejects.toThrow();
        continue;
      }
      const off = await noRepair(() => pack(geo, params));
      const before = await floating(off.out);
      const after = await floating(a.out);
      const rec = repaired(a.out);
      if (before.bricks === 0) {
        expect(rec, name).toBeUndefined();
        expect(snapshotGeometry(a.out), name).toEqual(snapshotGeometry(off.out));
        continue;
      }
      expect(rec, name).toEqual([before.pieces, before.bricks, after.pieces, after.bricks, (rec as number[])[4], (rec as number[])[5]]);
      expect(after.bricks, name).toBeLessThanOrEqual(before.bricks);
      if ((rec as number[])[5] === 0) expect(snapshotGeometry(a.out).point, name).toEqual(snapshotGeometry(off.out).point);
      else coversExactly(specs, a.out);
      kept += (rec as number[])[5] as number;
      if (after.bricks < before.bricks) fewer++;
    }
    // Not vacuous: repairs were kept, in several builds.
    expect(kept).toBeGreaterThan(3);
    expect(fewer).toBeGreaterThan(2);
  });
});

describe("packBricks: studMode and the stud index columns", () => {
  // A base, a plate on part of it, a brick overhanging the base's edge, a
  // separate low block, and a column reaching the top of the grid.
  const origin: V3 = [0.5, 0, -2];
  const specs: BoxSpec[] = [
    { lo: [0, 0, 0], hi: [6, 3, 4], tag: 1 },
    { lo: [1, 3, 0], hi: [3, 4, 2], tag: 2 },
    { lo: [4, 3, 1], hi: [8, 6, 3], tag: 3 },
    { lo: [10, 0, 1], hi: [11, 2, 2], tag: 4 },
    { lo: [12, 0, 0], hi: [14, 9, 2], tag: 5 },
  ];

  interface Stud {
    key: string;
    brickId: number;
    brickAbove: number;
  }

  const readStuds = (studs: Geometry): Stud[] => {
    const sp = studs.attrs.point;
    const on = sp.require("brickId");
    const under = sp.require("brickAbove");
    expect(on.type).toBe("i32");
    expect(under.type).toBe("i32");
    return Array.from({ length: sp.count }, (_, s) => {
      const P = sp.require("P").getTuple(s);
      const cx = Math.round(((P[0] as number) - origin[0]) / PLATE[0] - 0.5);
      const cy = Math.round(((P[1] as number) - origin[1]) / PLATE[1]);
      const cz = Math.round(((P[2] as number) - origin[2]) / PLATE[2] - 0.5);
      return { key: key(cx, cy, cz), brickId: on.get(s), brickAbove: under.get(s) };
    });
  };

  const sortStuds = (list: readonly Stud[]): string[] =>
    list.map((s) => `${s.key}|${s.brickId}|${s.brickAbove}`).sort();

  /** The oracle: every top-face cell of every brick, and the brick whose bottom covers it. */
  const everyTopStud = (bricks: readonly Brick[]): Stud[] => {
    const out: Stud[] = [];
    bricks.forEach((b, id) => {
      const top = b.lo[1] + b.ext[1];
      for (let z = b.lo[2]; z < b.lo[2] + b.ext[2]; z++) {
        for (let x = b.lo[0]; x < b.lo[0] + b.ext[0]; x++) {
          const above = bricks.findIndex(
            (o) =>
              o.lo[1] === top &&
              o.lo[0] <= x &&
              x < o.lo[0] + o.ext[0] &&
              o.lo[2] <= z &&
              z < o.lo[2] + o.ext[2],
          );
          out.push({ key: key(x, top, z), brickId: id, brickAbove: above });
        }
      }
    });
    return out;
  };

  it("'all' carries every stud of every top face, each naming the brick under and over it", async () => {
    const { out, studs } = await pack(boxCloud(specs, PLATE, origin), {
      pitch: PLATE,
      origin,
      studMode: "all",
    });
    const bricks = readBricks(out, PLATE, origin);
    const want = everyTopStud(bricks);
    const area = bricks.reduce((sum, b) => sum + b.ext[0] * b.ext[2], 0);
    expect(want).toHaveLength(area);
    expect(studs.pointCount).toBe(area);
    const got = readStuds(studs);
    expect(sortStuds(got)).toEqual(sortStuds(want));
    // Non-vacuity: some studs are covered and some showing.
    expect(got.some((s) => s.brickAbove >= 0)).toBe(true);
    expect(got.some((s) => s.brickAbove < 0)).toBe(true);
    // brickId points at a brick whose TOP FACE holds the stud, and the stud
    // carries that brick's attributes; brickAbove's bottom is that face.
    const sp = studs.attrs.point;
    for (let s = 0; s < sp.count; s++) {
      const P = sp.require("P").getTuple(s);
      const b = bricks[sp.require("brickId").get(s)] as Brick;
      expect(P[1]).toBeCloseTo(b.bMax[1] as number, 5);
      expect(P[0]).toBeGreaterThan(b.bMin[0] as number);
      expect(P[0]).toBeLessThan(b.bMax[0] as number);
      expect(P[2]).toBeGreaterThan(b.bMin[2] as number);
      expect(P[2]).toBeLessThan(b.bMax[2] as number);
      expect(sp.require("tag").get(s)).toBe(b.tag);
      expect(sp.require("brick").getString(s)).toBe(b.label);
      const above = sp.require("brickAbove").get(s);
      if (above >= 0) expect((bricks[above] as Brick).bMin[1]).toBeCloseTo(b.bMax[1] as number, 5);
    }
  });

  it("'exposed' is exactly the studs of 'all' with nothing resting on them", async () => {
    const geo = boxCloud(specs, PLATE, origin);
    const all = await pack(geo, { pitch: PLATE, origin, studMode: "all" });
    const exposed = await pack(geo, { pitch: PLATE, origin, studMode: "exposed" });
    // The bricks do not depend on the mode.
    expect(snapshotGeometry(exposed.out)).toEqual(snapshotGeometry(all.out));
    const shown = readStuds(exposed.studs);
    expect(shown.length).toBeGreaterThan(0);
    for (const s of shown) expect(s.brickAbove).toBe(-1);
    const subset = readStuds(all.studs).filter((s) => s.brickAbove < 0);
    expect(sortStuds(shown)).toEqual(sortStuds(subset));
    expect(shown.length).toBeLessThan(all.studs.pointCount);
    // In the same order, too: 'exposed' is 'all' filtered, not re-sorted.
    expect(shown.map((s) => s.key)).toEqual(subset.map((s) => s.key));
  });

  it("reads 'showing after the last step' through brickConnectivity as the exposed studs", async () => {
    // The description's recipe: showing after step t is step(brickId) <= t
    // and (brickAbove < 0 or step(brickAbove) > t). At the last step of a
    // build that is all attached, that is exactly 'exposed'; at the step
    // before, a stud whose cover comes last is still showing.
    const geo = boxCloud(specs, PLATE, origin);
    const all = await pack(geo, { pitch: PLATE, origin, studMode: "all" });
    const exposed = await pack(geo, { pitch: PLATE, origin });
    const r = await runNode(brickConnectivity, { pitch: PLATE, origin }, { in: [makeGeometryItem(all.out)] });
    const stepCol = firstGeo(r.out).attrs.point.require("step");
    const step = Array.from({ length: all.out.pointCount }, (_, i) => stepCol.get(i));
    expect(step.every((s) => s >= 0)).toBe(true);
    const last = Math.max(...step);
    expect(last).toBeGreaterThan(0);
    const studs = readStuds(all.studs);
    const showing = (t: number) =>
      studs.filter(
        (s) => (step[s.brickId] as number) <= t && (s.brickAbove < 0 || (step[s.brickAbove] as number) > t),
      );
    expect(sortStuds(showing(last))).toEqual(sortStuds(readStuds(exposed.studs)));
    expect(showing(last - 1).some((s) => s.brickAbove >= 0)).toBe(true);
  });

  it("refuses an input carrying brickId or brickAbove as another shape", async () => {
    const withOn = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);
    withOn.attrs.point.add("brickId", "f32", 1, 0);
    const a = await refusal(withOn);
    expect(a).toContain('"brickId"');
    expect(a).toContain("f32");
    const withUnder = boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);
    withUnder.attrs.point.add("brickAbove", "i32", 2, 0);
    const b = await refusal(withUnder);
    expect(b).toContain('"brickAbove"');
    expect(b).toContain("tuple size 2");
  });

  it("carries both index columns on an empty studs pin", async () => {
    const { studs } = await pack(createPointCloud(0), { studMode: "all" });
    expect(studs.pointCount).toBe(0);
    expect(studs.attrs.point.require("brickId").type).toBe("i32");
    expect(studs.attrs.point.require("brickAbove").type).toBe("i32");
  });
});

describe("packBricks: the longer default plates", () => {
  for (const [w, d] of [
    [2, 16],
    [2, 12],
    [2, 10],
    [1, 12],
    [1, 10],
  ] as const) {
    it(`lays a ${w}x${d} one-plate slab as one ${w}x${d}x1, either way round`, async () => {
      for (const hi of [
        [w, 1, d],
        [d, 1, w],
      ] as V3[]) {
        const bricks = readBricks((await pack(boxCloud([{ lo: [0, 0, 0], hi }]))).out);
        expect(bricks).toHaveLength(1);
        expect(bricks[0]?.label).toBe(`${w}x${d}x1`);
        expect(bricks[0]?.ext).toEqual(hi);
      }
    });
  }
});

describe("packBricks: extraBricks", () => {
  /** The default catalogue's 27 entries, read from the schema rather than restated. */
  const DEFAULT = packBricks.defaultParams.bricks;
  const one = (): Geometry => boxCloud([{ lo: [0, 0, 0], hi: [2, 3, 2] }]);

  it("defaults to empty, and the default catalogue is 27 entries", () => {
    expect(packBricks.defaultParams.extraBricks).toEqual([]);
    expect(DEFAULT).toHaveLength(81);
  });

  it("appends a baseplate to the default list without restating it", async () => {
    // A 32 x 32 one-plate slab: the default catalogue's longest plate is
    // 2x16, so without the extra entry it takes many bricks.
    const slab = boxCloud([{ lo: [0, 0, 0], hi: [32, 1, 32] }]);
    const plain = readBricks((await pack(slab)).out);
    expect(plain.length).toBeGreaterThan(1);
    const withPlate = readBricks((await pack(slab, { extraBricks: [32, 32, 1] })).out);
    expect(withPlate).toHaveLength(1);
    expect(withPlate[0]?.label).toBe("32x32x1");
    // Its index continues the count after the 27 default entries.
    expect(withPlate[0]?.index).toBe(27);
    expect(withPlate[0]?.ext).toEqual([32, 1, 32]);
  });

  it("is exactly the concatenated list, given as bricks", async () => {
    // The slab is its own material, so full-height bricks cannot root in it
    // and the baseplate has a course to itself.
    const specs: BoxSpec[] = [
      { lo: [0, 0, 0], hi: [32, 1, 32], tag: 1, kind: "ground" },
      { lo: [0, 1, 0], hi: [12, 7, 2], tag: 2, kind: "wall" },
      { lo: [3, 1, 5], hi: [9, 5, 11], tag: 3, kind: "wall" },
    ];
    const geo = boxCloud(specs, PLATE);
    const groupBy = ["kind"];
    for (const [bricks, extra] of [
      [DEFAULT, [32, 32, 1]],
      [DEFAULT, [32, 32, 1, 3, 5, 3]],
      [[2, 4, 3, 1, 1, 3], [1, 1, 1, 2, 2, 1]],
    ] as const) {
      const appended = await pack(geo, { pitch: PLATE, groupBy, bricks: [...bricks], extraBricks: [...extra] });
      const joined = await pack(geo, { pitch: PLATE, groupBy, bricks: [...bricks, ...extra] });
      expect(snapshotGeometry(appended.out)).toEqual(snapshotGeometry(joined.out));
      expect(snapshotGeometry(appended.studs)).toEqual(snapshotGeometry(joined.studs));
    }
    // THE CONTROL: the extra entry changes the packing here, so the
    // comparison above is not two default cooks agreeing.
    const without = await pack(geo, { pitch: PLATE, groupBy });
    const withPlate = await pack(geo, { pitch: PLATE, groupBy, extraBricks: [32, 32, 1] });
    expect(readBricks(withPlate.out, PLATE).filter((b) => b.label === "32x32x1")).toHaveLength(1);
    expect(snapshotGeometry(withPlate.out)).not.toEqual(snapshotGeometry(without.out));
  });

  it("covers what bricks alone cannot, and names the cell when neither list can", async () => {
    // Four plates tall against full-height bricks only: [1, 1, 1] from
    // extraBricks closes the gap, at entry index 2.
    const geo = boxCloud([{ lo: [0, 0, 0], hi: [1, 4, 1] }]);
    const m = await refusal(geo, { bricks: [1, 1, 3, 1, 2, 3] });
    expect(m).toContain('"extraBricks"');
    expect(m).toContain("lattice cell (0, 3, 0)");
    const bricks = readBricks((await pack(geo, { bricks: [1, 1, 3, 1, 2, 3], extraBricks: [1, 1, 1] })).out);
    expect(bricks.map((b) => [b.label, b.index])).toEqual([
      ["1x1x3", 0],
      ["1x1x1", 2],
    ]);
  });

  it("refuses an entry the default list already has, either way round, naming both entries", async () => {
    // [1, 1, 1] is the default list's last entry, 26; [16, 2, 1] is its
    // 2x16 plate, entry 11, turned.
    const plate = await refusal(one(), { extraBricks: [32, 32, 1, 1, 1, 1] });
    expect(plate).toContain('param "extraBricks" entry 1');
    expect(plate).toContain('"bricks" entry 26 (the default catalogue)');
    expect(plate).toContain("1x1x1");
    const turned = await refusal(one(), { extraBricks: [16, 2, 1] });
    expect(turned).toContain('param "extraBricks" entry 0');
    expect(turned).toContain('"bricks" entry 11 (the default catalogue)');
    expect(turned).toContain('remove it from "extraBricks"');
    // A given list is named as itself, not as the default.
    const given = await refusal(one(), { bricks: [2, 4, 3, 1, 1, 1], extraBricks: [4, 2, 3] });
    expect(given).toContain('"bricks" entry 0');
    expect(given).not.toContain("default catalogue");
  });

  it("refuses an entry listed twice within extraBricks", async () => {
    const twice = await refusal(one(), { extraBricks: [32, 32, 1, 3, 5, 3, 5, 3, 3] });
    expect(twice).toContain('param "extraBricks" entries 1 and 2');
    expect(twice).toContain("3x5x3");
  });

  it("refuses a list that is not whole triples, and a non-integer or zero entry, naming the entry", async () => {
    const short = await refusal(one(), { extraBricks: [32, 32] });
    expect(short).toContain('param "extraBricks" has 2 numbers');
    expect(short).toContain("multiple of 3");
    const zero = await refusal(one(), { extraBricks: [0, 1, 1] });
    expect(zero).toContain('param "extraBricks" entry 0');
    expect(zero).toContain("whole numbers of at least 1");
    const frac = await refusal(one(), { bricks: [2, 2, 3, 1, 1, 1], extraBricks: [3, 3, 3, 2.5, 1, 1] });
    expect(frac).toContain('param "extraBricks" entry 1 is [2.5, 1, 1]');
    // `bricks` keeps its own words, and is still checked first.
    const both = await refusal(one(), { bricks: [1, 1], extraBricks: [1, 1] });
    expect(both).toContain('param "bricks" has 2 numbers');
  });
});
