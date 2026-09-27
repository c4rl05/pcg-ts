/**
 * `segmentCrossings`: one point per interior crossing among 2-vertex
 * primitives.
 *
 * Small cases are hand-computed (an X, a T, an L, a skew pair). The scale
 * cases check the spatial hash against an independent brute-force answer
 * built from 2D orientation tests — a different construction from the
 * node's closest-approach one — so agreement is not the code agreeing
 * with itself.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { adoptTopology } from "../data/adoptTopology.js";
import { makeGeometryItem } from "../graph/index.js";
import { segmentCrossings } from "./crossings.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

type V3 = readonly [number, number, number];

/** A geometry of segments, each its own two points (no sharing). */
function segments(list: readonly (readonly [V3, V3])[]): Geometry {
  const pts: V3[] = [];
  const prims: number[][] = [];
  for (const [a, b] of list) {
    prims.push([pts.length, pts.length + 1]);
    pts.push(a, b);
  }
  return topo(pts, prims);
}

/** A geometry with explicit points and primitives of any vertex count. */
function topo(pts: readonly V3[], prims: readonly (readonly number[])[]): Geometry {
  const geo = createPointCloud(pts.length);
  const P = geo.attrs.point.require("P").writable();
  pts.forEach((p, i) => P.set(p, i * 3));
  const v2p: number[] = [];
  const start: number[] = [];
  const count: number[] = [];
  for (const pr of prims) {
    start.push(v2p.length);
    v2p.push(...pr);
    count.push(pr.length);
  }
  adoptTopology(geo, Uint32Array.from(v2p), Uint32Array.from(start), Uint32Array.from(count));
  return geo;
}

async function cross(geo: Geometry, params: Record<string, unknown> = {}): Promise<Geometry> {
  return firstGeo((await runNode(segmentCrossings, params, { in: [makeGeometryItem(geo)] })).out);
}

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

function col(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.pointCount * a.tupleSize));
}

function pairsOf(geo: Geometry): string[] {
  const a = col(geo, "primA");
  const b = col(geo, "primB");
  return a.map((x, i) => `${x}-${b[i]}`);
}

function close(actual: number[], expected: number[], digits = 6): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], digits));
}

describe("segmentCrossings: what a crossing is", () => {
  it("finds the crossing of an X, with its ids, bisector and normal", async () => {
    const out = await cross(
      segments([
        [
          [0, 0, 0],
          [2, 2, 0],
        ],
        [
          [0, 2, 0],
          [2, 0, 0],
        ],
      ]),
      { normalAttr: "n", distanceAttr: "gap" },
    );
    expect(out.pointCount).toBe(1);
    close(col(out, "P"), [1, 1, 0]);
    expect(pairsOf(out)).toEqual(["0-1"]);
    // At a right angle B keeps its own direction: (1,1)+(1,-1) -> +x.
    close(col(out, "bisector"), [1, 0, 0]);
    close(col(out, "n"), [0, 0, -1]);
    close(col(out, "gap"), [0]);
    expect(out.primitiveCount).toBe(0);
  });

  it("flips B so the bisector halves the ACUTE angle and runs along A", async () => {
    const out = await cross(
      segments([
        [
          [0, 0, 0],
          [4, 1, 0],
        ],
        [
          [4, 0, 0],
          [0, 1, 0],
        ],
      ]),
      { normalAttr: "n" },
    );
    close(col(out, "P"), [2, 0.5, 0]);
    close(col(out, "bisector"), [1, 0, 0]);
    // A = (4,1), B flipped to (4,-1): A x B points -z.
    close(col(out, "n"), [0, 0, -1]);
  });

  it("finds a 3D pair that passes within the tolerance, at the midpoint of the gap", async () => {
    const skew = segments([
      [
        [-1, 0, 0],
        [1, 0, 0],
      ],
      [
        [0, -1, 0.0005],
        [0, 1, 0.0005],
      ],
    ]);
    const out = await cross(skew, { distanceAttr: "gap" });
    close(col(out, "P"), [0, 0, 0.00025]);
    close(col(out, "gap"), [0.0005]);
    expect((await cross(skew, { tolerance: 0.0001 })).pointCount).toBe(0);
  });

  it("reports nothing for parallel, collinear-overlapping or far-apart pairs", async () => {
    const out = await cross(
      segments([
        [
          [0, 0, 0],
          [4, 0, 0],
        ],
        [
          [1, 0, 0],
          [3, 0, 0],
        ],
        [
          [0, 1, 0],
          [4, 1, 0],
        ],
        [
          [10, 10, 10],
          [11, 12, 13],
        ],
      ]),
      { endpoints: "include" },
    );
    expect(out.pointCount).toBe(0);
  });
});

describe("segmentCrossings: endpoint touches", () => {
  const T = (): Geometry =>
    segments([
      [
        [0, 0, 0],
        [2, 0, 0],
      ],
      [
        [1, 0, 0],
        [1, 2, 0],
      ],
    ]);
  // An L through a SHARED point: 0 -> 1 and 1 -> 2.
  const L = (): Geometry =>
    topo(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
      ],
      [
        [0, 1],
        [1, 2],
      ],
    );

  it("excludes a T junction and an L corner by default", async () => {
    expect((await cross(T())).pointCount).toBe(0);
    expect((await cross(L())).pointCount).toBe(0);
  });

  it("includes them under endpoints 'include', an L exactly on its shared point", async () => {
    close(col(await cross(T(), { endpoints: "include" }), "P"), [1, 0, 0]);
    close(col(await cross(L(), { endpoints: "include" }), "P"), [1, 0, 0], 12);
  });

  it("counts a meeting within the tolerance of an end as a touch", async () => {
    const nearEnd = segments([
      [
        [0, 0, 0],
        [2, 0, 0],
      ],
      [
        [1.9995, -1, 0],
        [1.9995, 1, 0],
      ],
    ]);
    expect((await cross(nearEnd)).pointCount).toBe(0);
    expect((await cross(nearEnd, { tolerance: 0.0001 })).pointCount).toBe(1);
  });

  it("refuses an endpoints rule it does not know, naming both it does", async () => {
    const msg = await rejection(cross(T(), { endpoints: "maybe" }));
    expect(msg).toContain('segmentCrossings: unknown endpoints "maybe"; valid settings: exclude, include');
  });
});

describe("segmentCrossings: input shapes", () => {
  it("ignores primitives that are not two vertices and cooks no segment to an empty cloud", async () => {
    const tri = topo(
      [
        [0, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
        [2, 0, 0],
      ],
      [[0, 1, 2], [0, 1, 2, 3]],
    );
    const out = await cross(tri);
    expect(out.pointCount).toBe(0);
    expect(out.attrs.point.get("primA")).toBeDefined();
    expect((await cross(createPointCloud(0))).pointCount).toBe(0);
  });

  it("reports primitive ids in the INPUT's numbering, skipping non-segments", async () => {
    const geo = topo(
      [
        [0, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
        [2, 0, 0],
        [9, 9, 9],
      ],
      [[0, 1, 4], [0, 1], [4, 4], [2, 3]],
    );
    const out = await cross(geo);
    expect(pairsOf(out)).toEqual(["1-3"]);
  });
});

describe("segmentCrossings: params", () => {
  const X = (): Geometry =>
    segments([
      [
        [0, 0, 0],
        [2, 2, 0],
      ],
      [
        [0, 2, 0],
        [2, 0, 0],
      ],
    ]);

  it("refuses an empty primitive-id name", async () => {
    expect(await rejection(cross(X(), { primAAttr: "" }))).toContain(
      'segmentCrossings: param "primAAttr" is empty',
    );
  });

  it("refuses one name for two outputs", async () => {
    expect(await rejection(cross(X(), { normalAttr: "bisector" }))).toContain(
      'params "bisectorAttr" and "normalAttr" both name "bisector"',
    );
  });

  it("refuses a name that is a standard point column, same shape or not", async () => {
    expect(await rejection(cross(X(), { bisectorAttr: "scale" }))).toContain(
      'segmentCrossings: param "bisectorAttr" is "scale", one of the standard point columns',
    );
    expect(await rejection(cross(X(), { primAAttr: "seed" }))).toContain('param "primAAttr" is "seed"');
  });

  it("refuses a negative tolerance", async () => {
    expect(await rejection(cross(X(), { tolerance: -1 }))).toContain(
      'segmentCrossings: param "tolerance" is -1',
    );
  });

  it("omits the bisector when its name is empty", async () => {
    const out = await cross(X(), { bisectorAttr: "" });
    expect(out.attrs.point.get("bisector")).toBeUndefined();
    expect(out.pointCount).toBe(1);
  });
});

/** A deterministic stream of numbers in [0, 1) for the scale cases. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Proper 2D intersection by orientation signs — the brute-force reference. */
function properCross(a: readonly [V3, V3], b: readonly [V3, V3]): boolean {
  const o = (p: V3, q: V3, r: V3): number => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(b[0], b[1], a[0]);
  const d2 = o(b[0], b[1], a[1]);
  const d3 = o(a[0], a[1], b[0]);
  const d4 = o(a[0], a[1], b[1]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

describe("segmentCrossings: scale and order", () => {
  it("agrees with a brute-force reference on a random planar tangle with long and short bars", async () => {
    const rnd = lcg(7);
    const list: [V3, V3][] = [];
    for (let i = 0; i < 400; i++) {
      // Every 25th bar is long, so the adaptive cell size is exercised.
      const len = i % 25 === 0 ? 80 : 1 + rnd() * 6;
      const x = rnd() * 100;
      const y = rnd() * 100;
      const ang = rnd() * Math.PI * 2;
      list.push([
        [Math.fround(x), Math.fround(y), 0],
        [Math.fround(x + Math.cos(ang) * len), Math.fround(y + Math.sin(ang) * len), 0],
      ]);
    }
    const expected: string[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) if (properCross(list[i], list[j])) expected.push(`${i}-${j}`);
    }
    const out = await cross(segments(list), { tolerance: 1e-6 });
    expect(expected.length).toBeGreaterThan(50);
    expect(pairsOf(out)).toEqual(expected);
  });

  it("orders by primitive pair whatever order the primitives arrive in", async () => {
    const list: [V3, V3][] = [];
    for (let i = 0; i < 5; i++) {
      list.push([
        [0, i + 0.5, 0],
        [5, i + 0.5, 0],
      ]);
      list.push([
        [i + 0.5, 0, 0],
        [i + 0.5, 5, 0],
      ]);
    }
    const a = await cross(segments(list));
    expect(a.pointCount).toBe(25);
    const ids = pairsOf(a).map((s) => s.split("-").map(Number));
    for (let k = 1; k < ids.length; k++) {
      const [pa, pb] = ids[k - 1];
      const [qa, qb] = ids[k];
      expect(pa < qa || (pa === qa && pb < qb)).toBe(true);
    }
    for (const [x, y] of ids) expect(x).toBeLessThan(y);
    const b = await cross(segments(list));
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });

  it("keeps a dense cluster cheap when one segment lies far away", async () => {
    // A cell size floored against the WHOLE extent put this cluster in one
    // cell and made the cook quadratic (seconds); the cell size must follow
    // the segments, not the outlier. The lattice is 100 x 100 crossings.
    const list: [V3, V3][] = [];
    for (let j = 0; j < 100; j++) {
      for (let i = 0; i < 100; i++) {
        list.push([
          [i * 0.05, j * 0.05 + 0.025, 0],
          [i * 0.05 + 0.05, j * 0.05 + 0.025, 0],
        ]);
        list.push([
          [i * 0.05 + 0.025, j * 0.05, 0],
          [i * 0.05 + 0.025, j * 0.05 + 0.05, 0],
        ]);
      }
    }
    list.push([
      [1e6, 0, 0],
      [1e6 + 1, 0, 0],
    ]);
    const t0 = performance.now();
    const out = await cross(segments(list), { tolerance: 1e-4 });
    const ms = performance.now() - t0;
    expect(out.pointCount).toBe(10_000);
    // Quadratic was ~2 s here; linear is tens of ms. Generous for a loaded box.
    expect(ms).toBeLessThan(1500);
  });

  it("handles twenty thousand segments of a lattice, each crossing exactly once", async () => {
    // 100 x 100 unit cells; in each, a horizontal and a vertical bar cross
    // at the cell centre. Neighbouring bars of a row touch end to end,
    // which is parallel and never reported.
    const list: [V3, V3][] = [];
    for (let j = 0; j < 100; j++) {
      for (let i = 0; i < 100; i++) {
        list.push([
          [i, j + 0.5, 0],
          [i + 1, j + 0.5, 0],
        ]);
        list.push([
          [i + 0.5, j, 0],
          [i + 0.5, j + 1, 0],
        ]);
      }
    }
    const out = await cross(segments(list));
    expect(out.pointCount).toBe(10_000);
    const a = col(out, "primA");
    const b = col(out, "primB");
    for (let k = 0; k < 10_000; k++) {
      expect(a[k]).toBe(2 * k);
      expect(b[k]).toBe(2 * k + 1);
    }
  });
});
