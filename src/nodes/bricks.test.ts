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
import { packBricks, type PackBricksParams } from "./bricks.js";
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
