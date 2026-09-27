/**
 * The cap triangulator. Every case is judged by what a triangulation IS
 * rather than by which triangles came out: the triangles tile the polygon
 * (their areas sum to the outer area less the holes, and every sample
 * point strictly inside is covered exactly once, every one outside or in
 * a hole not at all), each winds counter-clockwise, and the same input
 * gives the same triangles.
 */
import { describe, expect, it } from "vitest";
import { earClip, isConvexLoop, loopArea2, pointInLoop } from "./earClip.js";

/** Loops as lists of [x, y] pairs, outer first; returns the flat xy and starts. */
function pack(loops: number[][][]): { xy: number[]; starts: number[] } {
  const xy: number[] = [];
  const starts: number[] = [];
  for (const loop of loops) {
    starts.push(xy.length / 2);
    for (const [x, y] of loop) xy.push(x, y);
  }
  starts.push(xy.length / 2);
  return { xy, starts };
}

function triArea2(xy: number[], a: number, b: number, c: number): number {
  return (
    (xy[b * 2] - xy[a * 2]) * (xy[c * 2 + 1] - xy[a * 2 + 1]) -
    (xy[b * 2 + 1] - xy[a * 2 + 1]) * (xy[c * 2] - xy[a * 2])
  );
}

function inTri(xy: number[], a: number, b: number, c: number, px: number, py: number): boolean {
  const s = (i: number, j: number) =>
    (xy[j * 2] - xy[i * 2]) * (py - xy[i * 2 + 1]) - (xy[j * 2 + 1] - xy[i * 2 + 1]) * (px - xy[i * 2]);
  return s(a, b) > 0 && s(b, c) > 0 && s(c, a) > 0;
}

/**
 * Asserts the triangles tile the polygon: CCW, areas add up, and a grid
 * of probes (offset off every lattice line the test shapes use) lands in
 * exactly one triangle inside the solid and in none outside it.
 */
function expectTiles(loops: number[][][], label: string): number[] {
  const { xy, starts } = pack(loops);
  const tris = earClip(xy, starts);
  expect(tris.length % 3, label).toBe(0);
  let sum = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const a2 = triArea2(xy, tris[t], tris[t + 1], tris[t + 2]);
    expect(a2, `${label}: triangle ${t / 3} winds counter-clockwise`).toBeGreaterThan(0);
    sum += a2;
  }
  let want = Math.abs(loopArea2(xy, starts[0], starts[1] - starts[0]));
  for (let k = 1; k + 1 < starts.length; k++) {
    want -= Math.abs(loopArea2(xy, starts[k], starts[k + 1] - starts[k]));
  }
  expect(sum, `${label}: areas`).toBeCloseTo(want, 9);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < xy.length; i += 2) {
    minX = Math.min(minX, xy[i]);
    maxX = Math.max(maxX, xy[i]);
    minY = Math.min(minY, xy[i + 1]);
    maxY = Math.max(maxY, xy[i + 1]);
  }
  const steps = 41;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const px = minX + ((maxX - minX) * (i + 0.37)) / steps;
      const py = minY + ((maxY - minY) * (j + 0.61)) / steps;
      const outerSide = pointInLoop(xy, starts[0], starts[1] - starts[0], px, py);
      let inHole = false;
      let onEdge = outerSide === 0;
      for (let k = 1; k + 1 < starts.length; k++) {
        const side = pointInLoop(xy, starts[k], starts[k + 1] - starts[k], px, py);
        if (side === 0) onEdge = true;
        if (side > 0) inHole = true;
      }
      if (onEdge) continue;
      let covered = 0;
      for (let t = 0; t < tris.length; t += 3) {
        if (inTri(xy, tris[t], tris[t + 1], tris[t + 2], px, py)) covered++;
      }
      const want1 = outerSide > 0 && !inHole ? 1 : 0;
      expect(covered, `${label}: probe (${px.toFixed(3)}, ${py.toFixed(3)})`).toBe(want1);
    }
  }
  return tris;
}

const L_SHAPE = [
  [0, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [1, 2],
  [0, 2],
];
const SQUARE4 = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

function reversed(loop: number[][]): number[][] {
  return [loop[0], ...loop.slice(1).reverse()];
}

describe("earClip", () => {
  it("tiles a convex polygon with n - 2 triangles", () => {
    expect(expectTiles([SQUARE4], "square").length).toBe(6);
  });

  it("tiles a concave L and a comb, wound either way", () => {
    const comb = [
      [0, 0],
      [5, 0],
      [5, 3],
      [4, 3],
      [4, 1],
      [3, 1],
      [3, 3],
      [2, 3],
      [2, 1],
      [1, 1],
      [1, 3],
      [0, 3],
    ];
    // At most n - 2: a clip can leave three corners in a line (the comb's
    // tooth roots at y = 1), and the middle one then leaves with no
    // triangle, since it bounds no area.
    for (const shape of [L_SHAPE, comb]) {
      expect(expectTiles([shape], "ccw").length / 3).toBeLessThanOrEqual(shape.length - 2);
      expect(expectTiles([reversed(shape)], "cw").length / 3).toBeLessThanOrEqual(shape.length - 2);
    }
    expect(expectTiles([L_SHAPE], "L").length / 3).toBe(4);
  });

  it("cuts one hole and several, whatever the holes' winding", () => {
    const hole = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ];
    const tris = expectTiles([SQUARE4, hole], "one hole");
    // n + 2h - 2 triangles for a polygon with h holes.
    expect(tris.length / 3).toBe(8 + 2 - 2);
    expectTiles([reversed(SQUARE4), reversed(hole)], "one hole, both reversed");
    const holeB = [
      [2.5, 2.5],
      [3.5, 2.5],
      [3.5, 3.5],
      [2.5, 3.5],
    ];
    const holeC = [
      [2.5, 0.5],
      [3.2, 1.5],
      [2.5, 1.5],
    ];
    expectTiles([SQUARE4, hole, holeB, holeC], "three holes");
  });

  it("cuts a hole out of a concave outline", () => {
    const outer = [
      [0, 0],
      [6, 0],
      [6, 6],
      [3, 3],
      [0, 6],
    ];
    const hole = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ];
    expectTiles([outer, hole], "concave with hole");
  });

  it("handles a hole sharing an x with the outer's vertices and one touching an edge", () => {
    const hole = [
      [0, 1],
      [1, 1.5],
      [0, 2],
    ];
    expectTiles([SQUARE4, hole], "hole touching the left edge");
    const aligned = [
      [1, 0.5],
      [3, 0.5],
      [3, 3.5],
      [1, 3.5],
    ];
    expectTiles([SQUARE4, aligned], "hole aligned with vertices");
  });

  it("drops collinear and repeated points rather than emitting zero-area triangles", () => {
    const withMid = [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 2],
      [0, 2],
      [0, 2],
      [0, 1],
    ];
    const tris = expectTiles([withMid], "collinear + duplicate");
    const { xy } = pack([withMid]);
    for (let t = 0; t < tris.length; t += 3) {
      expect(triArea2(xy, tris[t], tris[t + 1], tris[t + 2])).toBeGreaterThan(0);
    }
  });

  it("ignores a zero-area hole", () => {
    const flat = [
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    const tris = earClip(...(Object.values(pack([SQUARE4, flat])) as [number[], number[]]));
    expect(tris.length / 3).toBe(2);
  });

  it("returns nothing for a collinear outline and terminates on a self-crossing one", () => {
    const line = pack([
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
    ]);
    expect(earClip(line.xy, line.starts)).toEqual([]);
    const bowtie = pack([
      [
        [0, 0],
        [2, 2],
        [2, 0],
        [0, 2],
      ],
    ]);
    const tris = earClip(bowtie.xy, bowtie.starts);
    for (let t = 0; t < tris.length; t += 3) {
      expect(triArea2(bowtie.xy, tris[t], tris[t + 1], tris[t + 2])).toBeGreaterThan(0);
    }
  });

  it("tiles three holes whose bridges share a vertex (a lap with no ear, split)", () => {
    expectTiles(
      [
        [
          [68, -27],
          [-21, -82],
          [-18, 86],
        ],
        [
          [8, -7],
          [7, 0],
          [5, -2],
        ],
        [
          [27, 11],
          [29, 10],
          [21, 23],
        ],
        [
          [61, -19],
          [57, -17],
          [47, -7],
        ],
      ],
      "shared bridge vertex",
    );
  });

  it("tiles holes that touch the outline along an edge", () => {
    const rect = (x0: number, y0: number, x1: number, y1: number) => [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
    expectTiles(
      [rect(0, 0, 6, 10), rect(1, 1, 2, 2), rect(0, 3, 2, 4), rect(0, 6, 4, 8)],
      "edge-touching holes",
    );
    expectTiles(
      [rect(0, 0, 6, 10), rect(4, 1, 6, 2), rect(2, 3, 6, 4), rect(0, 6, 1, 7)],
      "holes touching both sides",
    );
  });

  it("tiles random star polygons with random holes", () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let trial = 0; trial < 150; trial++) {
      const n = 12 + Math.floor(rnd() * 20); // inscribed radius > 5.4: holes stay inside
      const outer: number[][] = [];
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        const r = 6 + rnd() * 4;
        outer.push([Math.round(r * Math.cos(a) * 8) / 8, Math.round(r * Math.sin(a) * 8) / 8]);
      }
      // Holes in disjoint cells of a grid well inside radius 6.
      const holes: number[][][] = [];
      for (let gx = -2; gx < 2; gx++) {
        for (let gy = -2; gy < 2; gy++) {
          if (rnd() < 0.5) continue;
          const cx = gx * 2 + 1;
          const cy = gy * 2 + 1;
          const tri = [
            [cx - 0.8 * rnd(), cy - 0.8 * rnd()],
            [cx + 0.8 * rnd(), cy - 0.8 * rnd()],
            [cx, cy + 0.8 * rnd()],
          ];
          holes.push(rnd() < 0.5 ? tri : reversed(tri));
        }
      }
      expectTiles([rnd() < 0.5 ? outer : reversed(outer), ...holes], `random ${trial}`);
    }
  });

  it("is deterministic", () => {
    const { xy, starts } = pack([SQUARE4, [[1, 1], [2, 1], [2, 2], [1, 2]]]);
    expect(earClip(xy, starts)).toEqual(earClip([...xy], [...starts]));
  });

  it("tiles a many-sided star, a comb of 100 notches and a ring of holes", () => {
    const star: number[][] = [];
    for (let i = 0; i < 40; i++) {
      const r = i % 2 === 0 ? 3 : 1.2;
      const a = (2 * Math.PI * i) / 40;
      star.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    expectTiles([star], "star");
    const teeth: number[][] = [[0, 0]];
    for (let i = 0; i < 100; i++) {
      teeth.push([2 * i + 0.5, 0], [2 * i + 0.5, -0.5], [2 * i + 1.5, -0.5], [2 * i + 1.5, 0]);
    }
    teeth.push([200, 0], [200, 3], [0, 3]);
    expectTiles([teeth], "teeth");
    const holes: number[][][] = [];
    for (let i = 0; i < 6; i++) {
      const cx = 2 + 1.4 * Math.cos((2 * Math.PI * i) / 6) * 1.2;
      const cy = 2 + 1.4 * Math.sin((2 * Math.PI * i) / 6) * 1.2;
      holes.push([
        [cx - 0.2, cy - 0.2],
        [cx + 0.2, cy - 0.2],
        [cx + 0.2, cy + 0.2],
        [cx - 0.2, cy + 0.2],
      ]);
    }
    expectTiles([SQUARE4, ...holes], "ring of holes");
  });
});

describe("isConvexLoop", () => {
  it("accepts convex and collinear corners either way round, refuses a reflex one", () => {
    const sq = pack([SQUARE4]).xy;
    expect(isConvexLoop(sq, 0, 4)).toBe(true);
    const mid = pack([[[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]]]).xy;
    expect(isConvexLoop(mid, 0, 5)).toBe(true);
    const l = pack([L_SHAPE]).xy;
    expect(isConvexLoop(l, 0, 6)).toBe(false);
    const lr = pack([reversed(L_SHAPE)]).xy;
    expect(isConvexLoop(lr, 0, 6)).toBe(false);
    // A straight edge knocked a hair inward by rounding is still convex.
    const hair = pack([[[0, 0], [1, 1e-9], [2, 0], [2, 2], [0, 2]]]).xy;
    expect(isConvexLoop(hair, 0, 5)).toBe(true);
  });
});
