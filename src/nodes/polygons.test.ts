import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, setPolylineTopology } from "../data/index.js";
import { attribute } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { polygonBoolean, splitPolygons } from "./index.js";

const HOLE_OF_ATTR = "holeOf";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Fixtures and readers. Loops are written as [x, z] pairs on the ground
// plane (y = `y`), the default plane of both nodes.

type Pt = readonly [number, number];

interface LoopSpec {
  readonly pts: readonly Pt[];
  readonly holeOf?: number;
  readonly tag?: string;
  readonly group?: number;
  /** Leave the polyline open (for the refusal test). */
  readonly open?: boolean;
}

function loops(specs: readonly LoopSpec[], y = 0): Geometry {
  const n = specs.reduce((s, l) => s + l.pts.length, 0);
  const geo = createPointCloud(n);
  const P = geo.attrs.point.require("P");
  const idx: number[] = [];
  const starts: number[] = [];
  const counts: number[] = [];
  let p = 0;
  for (const l of specs) {
    starts.push(idx.length);
    const first = p;
    for (const [x, z] of l.pts) {
      P.setTuple(p, [x, y, z]);
      idx.push(p++);
    }
    if (l.open !== true) idx.push(first);
    counts.push(l.pts.length + (l.open === true ? 0 : 1));
  }
  setPolylineTopology(geo, idx, starts, counts);
  if (specs.some((l) => l.holeOf !== undefined)) {
    const h = geo.attrs.primitive.add(HOLE_OF_ATTR, "i32", 1, -1);
    specs.forEach((l, k) => h.set(k, l.holeOf ?? -1));
  }
  if (specs.some((l) => l.tag !== undefined)) {
    const t = geo.attrs.primitive.add("tag", "string", 1, "");
    specs.forEach((l, k) => t.setString(k, l.tag ?? ""));
  }
  if (specs.some((l) => l.group !== undefined)) {
    const g = geo.attrs.primitive.add("floor", "i32", 1, 0);
    specs.forEach((l, k) => g.set(k, l.group ?? 0));
  }
  return geo;
}

const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

interface OutLoop {
  readonly pts: Pt[];
  readonly holeOf: number;
  /** Signed area in the plane's (u, v) = (x, -z): > 0 is an outer. */
  readonly area: number;
  readonly y: number[];
}

function readOut(geo: Geometry): OutLoop[] {
  const P = geo.attrs.point.require("P");
  const hole = geo.attrs.primitive.require(HOLE_OF_ATTR);
  const out: OutLoop[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p];
    const n = geo.primVertexCount[p];
    expect(geo.vertexToPoint[s + n - 1], "closed").toBe(geo.vertexToPoint[s]);
    const pts: Pt[] = [];
    const y: number[] = [];
    for (let k = 0; k < n - 1; k++) {
      const t = P.getTuple(geo.vertexToPoint[s + k]);
      pts.push([t[0], t[2]]);
      y.push(t[1]);
    }
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      // u = x, v = -z
      a += pts[j][0] * -pts[i][1] - pts[i][0] * -pts[j][1];
    }
    out.push({ pts, holeOf: hole.get(p), area: a / 2, y });
  }
  return out;
}

/** Net area of the result: outers minus holes. */
const netArea = (ls: readonly OutLoop[]): number => ls.reduce((s, l) => s + l.area, 0);

async function boolean(
  subject: Geometry,
  clip: Geometry | undefined,
  params: Record<string, unknown> = {},
): Promise<Geometry> {
  const inputs: Record<string, ReturnType<typeof wrap>> = { in: wrap(subject) };
  if (clip !== undefined) inputs.clip = wrap(clip);
  return firstGeo((await runNode(polygonBoolean, params, inputs)).out);
}

async function split(
  subject: Geometry,
  cutters: Geometry,
  params: Record<string, unknown> = {},
): Promise<Geometry> {
  return firstGeo((await runNode(splitPolygons, params, { in: wrap(subject), cutters: wrap(cutters) })).out);
}

function wrap(geo: Geometry) {
  return [makeGeometryItem(geo)];
}

/** Every hole names an outer that precedes it; outers name nothing. */
function expectWellFormed(ls: readonly OutLoop[]): void {
  ls.forEach((l, k) => {
    expect(l.pts.length).toBeGreaterThanOrEqual(3);
    if (l.holeOf < 0) expect(l.area, `loop ${k} is an outer`).toBeGreaterThan(0);
    else {
      expect(l.area, `loop ${k} is a hole`).toBeLessThan(0);
      expect(l.holeOf).toBeLessThan(k);
      expect(ls[l.holeOf].holeOf).toBe(-1);
    }
  });
}

// ---------------------------------------------------------------------------
// Exact reference areas for integer axis-aligned rectangles, by unit cells.

function cellSet(rects: readonly (readonly number[])[]): Set<string> {
  const s = new Set<string>();
  for (const [x0, z0, x1, z1] of rects) {
    for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) s.add(`${x},${z}`);
  }
  return s;
}

/** Deterministic PRNG (never Math.random). */
function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------

describe("polygonBoolean", () => {
  it("difference of a nested square is an outer with one hole keyed to it", async () => {
    const out = readOut(await boolean(loops([{ pts: rect(0, 0, 4, 4) }]), loops([{ pts: rect(1, 1, 3, 3) }])));
    expectWellFormed(out);
    expect(out.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-4, 0],
    ]);
    // Loops start at their smallest vertex (u = x, then v = -z).
    expect(out[0].pts[0]).toEqual([0, 4]);
  });

  it("intersection and union of overlapping squares", async () => {
    const a = loops([{ pts: rect(0, 0, 2, 2) }]);
    const b = loops([{ pts: rect(1, 1, 3, 3) }]);
    const inter = readOut(await boolean(a, b, { operation: "intersection" }));
    expect(inter.map((l) => l.area)).toEqual([1]);
    expect(inter[0].pts).toHaveLength(4);
    const uni = readOut(await boolean(a, b, { operation: "union" }));
    expectWellFormed(uni);
    expect(uni.map((l) => l.area)).toEqual([7]);
    expect(uni[0].pts).toHaveLength(8);
  });

  it("squares sharing an edge union into one rectangle with no leftover vertices", async () => {
    const a = loops([{ pts: rect(0, 0, 1, 1) }]);
    const b = loops([{ pts: rect(1, 0, 2, 1) }]);
    const uni = readOut(await boolean(a, b, { operation: "union" }));
    expect(uni.map((l) => [l.area, l.pts.length])).toEqual([[2, 4]]);
    // The same two in ONE set dissolve the same way.
    const self = readOut(await boolean(loops([{ pts: rect(0, 0, 1, 1) }, { pts: rect(1, 0, 2, 1) }]), undefined, {
      operation: "union",
    }));
    expect(self.map((l) => [l.area, l.pts.length])).toEqual([[2, 4]]);
    // Their intersection is only an edge: zero area, dropped.
    expect(readOut(await boolean(a, b, { operation: "intersection" }))).toEqual([]);
    // And a difference along a shared edge leaves the subject whole.
    expect(readOut(await boolean(a, b)).map((l) => [l.area, l.pts.length])).toEqual([[1, 4]]);
  });

  it("collinear overlapping edges", async () => {
    const a = loops([{ pts: rect(0, 0, 2, 2) }]);
    const b = loops([{ pts: rect(1, 0, 3, 2) }]);
    expect(readOut(await boolean(a, b, { operation: "union" })).map((l) => [l.area, l.pts.length])).toEqual([[6, 4]]);
    expect(readOut(await boolean(a, b, { operation: "intersection" })).map((l) => [l.area, l.pts.length])).toEqual([
      [2, 4],
    ]);
    expect(readOut(await boolean(a, b)).map((l) => [l.area, l.pts.length])).toEqual([[2, 4]]);
    // A clip whose edge runs along part of the subject's edge, inside.
    const c = loops([{ pts: rect(0.5, 0, 1.5, 1) }]);
    const d = readOut(await boolean(a, c));
    expectWellFormed(d);
    expect(netArea(d)).toBeCloseTo(3, 12);
    expect(d).toHaveLength(1);
    expect(d[0].pts).toHaveLength(8);
  });

  it("squares touching at one corner stay two outers under union", async () => {
    const out = readOut(
      await boolean(loops([{ pts: rect(0, 0, 1, 1) }]), loops([{ pts: rect(1, 1, 2, 2) }]), { operation: "union" }),
    );
    expectWellFormed(out);
    expect(out.map((l) => [l.area, l.holeOf, l.pts.length])).toEqual([
      [1, -1, 4],
      [1, -1, 4],
    ]);
  });

  it("a hole pinched against its outer at one vertex comes out as outer plus hole", async () => {
    const out = readOut(
      await boolean(
        loops([{ pts: rect(0, 0, 4, 4) }]),
        loops([
          {
            pts: [
              [2, 0],
              [3, 1],
              [1, 1],
            ],
          },
        ]),
      ),
    );
    expectWellFormed(out);
    expect(out.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-1, 0],
    ]);
  });

  it("shared vertices and a clip covering the subject", async () => {
    const tri1: Pt[] = [
      [0, 0],
      [2, 0],
      [1, 1],
    ];
    const tri2: Pt[] = [
      [1, 1],
      [2, 2],
      [0, 2],
    ];
    const uni = readOut(await boolean(loops([{ pts: tri1 }]), loops([{ pts: tri2 }]), { operation: "union" }));
    expectWellFormed(uni);
    expect(uni.map((l) => l.area)).toEqual([1, 1]);
    // Equal polygons: difference is empty, intersection is the polygon.
    const sq = loops([{ pts: rect(0, 0, 1, 1) }]);
    expect(readOut(await boolean(sq, loops([{ pts: rect(0, 0, 1, 1) }])))).toEqual([]);
    expect(readOut(await boolean(sq, loops([{ pts: rect(0, 0, 1, 1) }]), { operation: "intersection" })).map((l) => l.area)).toEqual([1]);
    // A covering clip leaves nothing.
    expect(readOut(await boolean(sq, loops([{ pts: rect(-1, -1, 2, 2) }])))).toEqual([]);
  });

  it("welds vertices within snapDistance, and not beyond it", async () => {
    const a = loops([{ pts: rect(0, 0, 1, 1) }]);
    const near = loops([{ pts: rect(1 + 2e-5, 0, 2, 1) }]);
    expect(readOut(await boolean(a, near, { operation: "union" })).map((l) => l.pts.length)).toEqual([4]);
    const far = loops([{ pts: rect(1.01, 0, 2, 1) }]);
    expect(readOut(await boolean(a, far, { operation: "union" }))).toHaveLength(2);
    // A vertex a hair off an edge counts as ON it (T-junction).
    const t = loops([{ pts: rect(0.25, 1 - 3e-5, 0.75, 2) }]);
    const tj = readOut(await boolean(a, t, { operation: "union" }));
    expectWellFormed(tj);
    expect(tj).toHaveLength(1);
  });

  it("winding either way, and holeOf holes on the input, read as what they are", async () => {
    const cw = rect(0, 0, 4, 4).reverse();
    const out = readOut(await boolean(loops([{ pts: cw }]), loops([{ pts: rect(1, 1, 3, 3).reverse() }])));
    expect(out.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-4, 0],
    ]);
    // Feed a with-hole result back in: union with a square filling part of the hole.
    const withHole = loops([{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 3, 3), holeOf: 0 }]);
    const refill = readOut(await boolean(withHole, loops([{ pts: rect(1, 1, 2, 3) }]), { operation: "union" }));
    expectWellFormed(refill);
    expect(refill.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-2, 0],
    ]);
  });

  it("groups boolean independently and carry their key", async () => {
    const subject = loops([
      { pts: rect(0, 0, 4, 4), group: 1 },
      { pts: rect(0, 0, 4, 4), group: 2 },
    ]);
    const clip = loops([{ pts: rect(1, 1, 3, 3), group: 2 }]);
    const geo = await boolean(subject, clip, { groupAttr: "floor" });
    const out = readOut(geo);
    expect(out.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [16, -1],
      [-4, 1],
    ]);
    const floor = geo.attrs.primitive.require("floor");
    expect([0, 1, 2].map((k) => floor.get(k))).toEqual([1, 2, 2]);
    expect(floor.type).toBe("i32");
  });

  it("the plane param maps axes and keeps the input's off-plane coordinate", async () => {
    const out = readOut(await boolean(loops([{ pts: rect(0, 0, 4, 4) }], 3), loops([{ pts: rect(1, 1, 3, 3) }], 3)));
    expect(out.every((l) => l.y.every((y) => y === 3))).toBe(true);
    // On xy, the same numbers placed in x and y at z = 5.
    const src = loops([{ pts: rect(0, 0, 2, 2) }]);
    const P = src.attrs.point.require("P");
    for (let i = 0; i < src.pointCount; i++) {
      const [x, , z] = P.getTuple(i);
      P.setTuple(i, [x, z, 5]);
    }
    const xy = await boolean(src, undefined, { operation: "union", plane: "xy" });
    const Q = xy.attrs.point.require("P");
    const zs = new Set<number>();
    let signed = 0;
    const n = xy.pointCount;
    for (let i = 0; i < n; i++) {
      const a = Q.getTuple(i);
      const b = Q.getTuple((i + 1) % n);
      zs.add(a[2]);
      signed += a[0] * b[1] - b[0] * a[1];
    }
    expect([...zs]).toEqual([5]);
    // Counter-clockwise seen from +z.
    expect(signed / 2).toBe(4);
  });

  it("refuses open polylines and bad params by name", async () => {
    await expect(boolean(loops([{ pts: rect(0, 0, 1, 1), open: true }]), undefined)).rejects.toThrow(
      /polygonBoolean: primitive\(s\) 0 on pin "in" are OPEN/,
    );
    await expect(boolean(loops([{ pts: rect(0, 0, 1, 1) }]), undefined, { plane: "xw" })).rejects.toThrow(
      /param "plane" must be one of xz, xy, yz/,
    );
    await expect(boolean(loops([{ pts: rect(0, 0, 1, 1) }]), undefined, { operation: "xor" })).rejects.toThrow(
      /param "operation" must be one of union, intersection, difference/,
    );
    await expect(boolean(loops([{ pts: rect(0, 0, 1, 1) }]), undefined, { snapDistance: 0 })).rejects.toThrow(
      /param "snapDistance" must be a finite number greater than 0/,
    );
    await expect(boolean(loops([{ pts: rect(0, 0, 1, 1) }]), undefined, { groupAttr: "nope" })).rejects.toThrow(
      /param "groupAttr" names primitive attribute "nope"/,
    );
  });

  it("a cloud with no loops cooks to an empty result", async () => {
    const out = await boolean(createPointCloud(3), undefined);
    expect(out.pointCount).toBe(0);
    expect(out.primitiveCount).toBe(0);
  });

  it("matches exact cell areas on random integer rectangles (shared and collinear edges everywhere)", async () => {
    const rnd = lcg(7);
    for (let trial = 0; trial < 25; trial++) {
      const mk = (count: number) =>
        Array.from({ length: count }, () => {
          const x0 = Math.floor(rnd() * 6);
          const z0 = Math.floor(rnd() * 6);
          return [x0, z0, x0 + 1 + Math.floor(rnd() * 4), z0 + 1 + Math.floor(rnd() * 4)];
        });
      const A = mk(4);
      const B = mk(3);
      const cellsA = cellSet(A);
      const cellsB = cellSet(B);
      const subject = loops(A.map(([x0, z0, x1, z1]) => ({ pts: rect(x0, z0, x1, z1) })));
      const clip = loops(B.map(([x0, z0, x1, z1]) => ({ pts: rect(x0, z0, x1, z1) })));
      const expected: Record<string, number> = {
        union: new Set([...cellsA, ...cellsB]).size,
        intersection: [...cellsA].filter((c) => cellsB.has(c)).length,
        difference: [...cellsA].filter((c) => !cellsB.has(c)).length,
      };
      for (const operation of ["union", "intersection", "difference"]) {
        const out = readOut(await boolean(subject, clip, { operation }));
        expectWellFormed(out);
        expect(netArea(out), `trial ${trial} ${operation}`).toBeCloseTo(expected[operation], 9);
      }
    }
  });

  it("random overlapping polygons satisfy the inclusion-exclusion identities", async () => {
    const rnd = lcg(99);
    const poly = (cx: number, cz: number): Pt[] => {
      // A star-shaped (often concave) polygon around (cx, cz).
      const n = 3 + Math.floor(rnd() * 6);
      const pts: Pt[] = [];
      for (let k = 0; k < n; k++) {
        const t = (k / n) * Math.PI * 2;
        const r = 0.5 + rnd() * 1.5;
        pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]);
      }
      return pts;
    };
    for (let trial = 0; trial < 30; trial++) {
      const a = loops([{ pts: poly(rnd(), rnd()) }, { pts: poly(rnd() * 2, rnd()) }]);
      const b = loops([{ pts: poly(rnd(), rnd() * 2) }]);
      const area = async (s: Geometry, c: Geometry | undefined, operation: string) => {
        const out = readOut(await boolean(s, c, { operation }));
        expectWellFormed(out);
        return netArea(out);
      };
      const A = await area(a, undefined, "union");
      const B = await area(b, undefined, "union");
      const U = await area(a, b, "union");
      const I = await area(a, b, "intersection");
      const D = await area(a, b, "difference");
      expect(U, `trial ${trial}`).toBeCloseTo(A + B - I, 4);
      expect(D, `trial ${trial}`).toBeCloseTo(A - I, 4);
    }
  });

  it("is deterministic and independent of input primitive order", async () => {
    const specs: LoopSpec[] = [
      { pts: rect(0, 0, 3, 2) },
      { pts: rect(2, 1, 5, 4) },
      {
        pts: [
          [1, -1],
          [4, 0.5],
          [0.5, 3],
        ],
      },
    ];
    const clip = loops([{ pts: rect(1, 0.5, 2, 1.5) }]);
    const a = await boolean(loops(specs), clip, { operation: "union" });
    const b = await boolean(loops(specs), clip, { operation: "union" });
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
    const c = await boolean(loops([...specs].reverse()), clip, { operation: "union" });
    expect(readOut(c)).toEqual(readOut(a));
  });
});

describe("splitPolygons", () => {
  it("cuts a square along a line with a kerf, carrying the polygon's attributes", async () => {
    const square = loops([{ pts: rect(0, 0, 4, 4), tag: "glass" }]);
    const bar = loops([
      {
        pts: [
          [2, -1],
          [2, 5],
        ],
        open: true,
      },
    ]);
    const geo = await split(square, bar, { kerf: 0.2 });
    const out = readOut(geo);
    expectWellFormed(out);
    expect(out.map((l) => l.pts.length)).toEqual([4, 4]);
    for (const l of out) expect(l.area).toBeCloseTo(7.6, 5);
    for (const l of out) for (const [, z] of l.pts) expect([0, 4]).toContain(z);
    const tag = geo.attrs.primitive.require("tag");
    expect([tag.getString(0), tag.getString(1)]).toEqual(["glass", "glass"]);
  });

  it("kerf 0 splits exactly and a dangling cut changes nothing", async () => {
    const square = loops([{ pts: rect(0, 0, 4, 4) }]);
    const cross = loops([
      {
        pts: [
          [2, 0],
          [2, 4],
        ],
        open: true,
      },
      {
        pts: [
          [-1, 2],
          [5, 2],
        ],
        open: true,
      },
    ]);
    const four = readOut(await split(square, cross, { kerf: 0 }));
    expectWellFormed(four);
    expect(four.map((l) => l.area)).toEqual([4, 4, 4, 4]);
    const dangling = loops([
      {
        pts: [
          [2, 0],
          [2, 2],
        ],
        open: true,
      },
    ]);
    expect(readOut(await split(square, dangling, { kerf: 0 })).map((l) => [l.area, l.pts.length])).toEqual([
      [16, 4],
    ]);
  });

  it("a window's mullion grid makes its lights, with per-cutter kerf from a field", async () => {
    const window = loops([{ pts: rect(0, 0, 3, 2), tag: "w1" }]);
    const cutters = loops([
      {
        pts: [
          [1, 0],
          [1, 2],
        ],
        open: true,
      },
      {
        pts: [
          [2, 0],
          [2, 2],
        ],
        open: true,
      },
      {
        pts: [
          [0, 1],
          [3, 1],
        ],
        open: true,
      },
    ]);
    const w = cutters.attrs.primitive.add("barWidth", "f32", 1, 0);
    w.set(0, 0.1);
    w.set(1, 0.1);
    w.set(2, 0.2);
    const out = readOut(await split(window, cutters, { kerf: attribute("barWidth") }));
    expectWellFormed(out);
    expect(out).toHaveLength(6);
    expect(netArea(out)).toBeCloseTo((3 - 0.2) * (2 - 0.2), 5);
  });

  it("holes on the input stay holes, and grouped cutters cut only their group", async () => {
    const floors = loops([
      { pts: rect(0, 0, 4, 4), group: 1 },
      { pts: rect(1, 1, 2, 2), holeOf: 0, group: 1 },
      { pts: rect(10, 0, 14, 4), group: 2 },
    ]);
    const cutters = loops([
      {
        pts: [
          [3, -1],
          [3, 5],
        ],
        open: true,
        group: 1,
      },
      {
        pts: [
          [12, -1],
          [12, 5],
        ],
        open: true,
        group: 1,
      },
    ]);
    const out = readOut(await split(floors, cutters, { kerf: 0, groupAttr: "floor" }));
    expectWellFormed(out);
    expect(out.map((l) => [l.area, l.holeOf])).toEqual([
      [12, -1],
      [-1, 0],
      [4, -1],
      [16, -1],
    ]);
  });

  it("refuses a negative kerf by cutter and an open polygon by name", async () => {
    const square = loops([{ pts: rect(0, 0, 4, 4) }]);
    const bar = loops([
      {
        pts: [
          [2, -1],
          [2, 5],
        ],
        open: true,
      },
    ]);
    await expect(split(square, bar, { kerf: -1 })).rejects.toThrow(/splitPolygons: param "kerf" must be a finite number of 0 or more/);
    bar.attrs.primitive.add("w", "f32", 1, -0.5);
    await expect(split(square, bar, { kerf: attribute("w") })).rejects.toThrow(/resolved to -0.5 on cutter primitive 0/);
    await expect(split(bar, square)).rejects.toThrow(/connect them to the "cutters" pin/);
  });

  it("is deterministic", async () => {
    const square = loops([{ pts: rect(0, 0, 4, 4) }, { pts: rect(5, 0, 7, 3) }]);
    const bars = loops([
      {
        pts: [
          [-1, -1],
          [8, 5],
        ],
        open: true,
      },
    ]);
    const a = await split(square, bars, { kerf: 0.3 });
    const b = await split(square, bars, { kerf: 0.3 });
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
    expectWellFormed(readOut(a));
  });
});
