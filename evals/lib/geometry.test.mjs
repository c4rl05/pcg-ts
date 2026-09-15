// node --test evals/lib/geometry.test.mjs evals/lib/digest.test.mjs evals/lib/scorer.test.mjs
// (no package needed for this file)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PolylineIndex,
  Surface,
  angleBetweenDeg,
  bounds,
  connectedComponents,
  findCrossings,
  horizontalOcclusion,
  matchPoints,
  mean,
  median,
  minPairDistance,
  nearestNeighbourDistances,
  polylineLength,
  quantile,
  segmentsCross,
  slopeDegFromNormal,
  stddev,
} from "./geometry.mjs";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (eps ${eps})`);

/** Deterministic LCG so the brute-force comparisons are reproducible. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("statistics", () => {
  close(mean([1, 2, 3, 4]), 2.5);
  close(median([5, 1, 3]), 3);
  close(quantile([0, 10], 0.25), 2.5);
  close(stddev([2, 2, 2]), 0);
  assert.ok(Number.isNaN(mean([])));
  assert.deepEqual(bounds(Float64Array.of(1, 2, 3, -1, 5, 0)), { min: [-1, 2, 0], max: [1, 5, 3] });
  close(angleBetweenDeg([1, 0, 0], [0, 0, 1]), 90);
  close(angleBetweenDeg([1, 0, 0], [-1, 0, 0]), 180);
});

test("polyline length and distance", () => {
  // An L: (0,0,0) -> (10,0,0) -> (10,0,10)
  const L = Float64Array.of(0, 0, 0, 10, 0, 0, 10, 0, 10);
  close(polylineLength(L), 20);
  const idx = new PolylineIndex([L]);
  close(idx.totalLength, 20);

  const a = idx.nearest(5, 0, 3); // above the first leg
  close(a.distance, 3);
  close(a.arc, 5);
  assert.deepEqual(a.point, [5, 0, 3 - 3]);

  const b = idx.nearest(-4, 0, 3); // beyond the start: distance to the endpoint
  close(b.distance, 5);
  close(b.arc, 0);

  const c = idx.nearest(13, 0, 6); // beside the second leg
  close(c.distance, 3);
  close(c.arc, 16);

  // Planar: height does not count; 3D: it does.
  close(idx.distance(5, 100, 0), 0);
  close(new PolylineIndex([L], { planar: false }).distance(5, 4, 3), 5);

  // Side flips across the line, and is 0 on it.
  const left = idx.nearest(5, 0, 2).side;
  const right = idx.nearest(5, 0, -2).side;
  assert.notEqual(left, 0);
  assert.equal(left, -right);
  assert.equal(idx.nearest(5, 0, 0).side, 0);

  // MUST FAIL: a point 3 m away is not within 2.9 m.
  assert.ok(!(idx.distance(5, 0, 3) <= 2.9));

  // A repeated vertex does not make a tie read side 0 (verifier repro).
  const dup = new PolylineIndex([Float64Array.of(0, 0, 0, 0, 0, 0, 10, 0, 0)]);
  assert.notEqual(dup.nearest(-1, 0, 1).side, 0);
  close(dup.totalLength, 10);
  // A line collapsed to one point still answers distance.
  close(new PolylineIndex([Float64Array.of(2, 0, 0, 2, 0, 0)]).distance(2, 0, 3), 3);

  assert.equal(new PolylineIndex([]).nearest(0, 0, 0), null);
  assert.equal(new PolylineIndex([]).distance(0, 0, 0), Infinity);

  // Multiple lines: globalArc continues across them.
  const two = new PolylineIndex([Float64Array.of(0, 0, 0, 4, 0, 0), { xyz: Float64Array.of(0, 0, 10, 6, 0, 10) }]);
  const q = two.nearest(1, 0, 9);
  assert.equal(q.lineIndex, 1);
  close(q.arc, 1);
  close(q.globalArc, 5);
});

test("nearest-neighbour distances match brute force", () => {
  for (const planar of [true, false]) {
    const r = rng(planar ? 7 : 11);
    const n = 400;
    const xyz = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Clustered plus far outliers, to exercise ring growth.
      const far = i % 50 === 0;
      xyz[i * 3] = far ? 500 + r() * 1000 : r() * 20;
      xyz[i * 3 + 1] = r() * 20;
      xyz[i * 3 + 2] = far ? -700 * r() : r() * 20;
    }
    const got = nearestNeighbourDistances(xyz, { planar });
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = xyz[j * 3] - xyz[i * 3];
        const dy = planar ? 0 : xyz[j * 3 + 1] - xyz[i * 3 + 1];
        const dz = xyz[j * 3 + 2] - xyz[i * 3 + 2];
        best = Math.min(best, Math.hypot(dx, dy, dz));
      }
      close(got[i], best, 1e-9);
    }
  }
  close(minPairDistance(Float64Array.of(0, 0, 0, 3, 0, 4)), 5);
  close(minPairDistance(Float64Array.of(1, 1, 1, 1, 1, 1, 9, 9, 9)), 0); // coincident
  assert.equal(minPairDistance(Float64Array.of(1, 2, 3)), Infinity);
  // MUST FAIL: points 1 m apart do not satisfy a 1.5 m minimum.
  assert.ok(!(minPairDistance(Float64Array.of(0, 0, 0, 1, 0, 0, 5, 0, 0)) >= 1.5));

  // A non-finite coordinate must not turn a spacing check into a pass.
  const inf = nearestNeighbourDistances(Float64Array.of(0, 0, 0, 0, 0, 0.5, Infinity, 0, 0));
  close(inf[0], 0.5);
  close(inf[1], 0.5);
  assert.ok(Number.isNaN(inf[2]));
  assert.ok(!(minPairDistance(Float64Array.of(0, 0, 0, 0, 0, 0.5, Infinity, 0, 0)) >= 0.1));
});

test("nearest-neighbour distances stay fast on thin and outlier layouts", () => {
  // Verifier repro: a row of 400 points 0.25 m apart with float-rounding
  // jitter across it took 5.8 s (and minutes at smaller jitter).
  for (const jitter of [1e-5, 1e-6, 0]) {
    const n = 400;
    const xyz = new Float64Array(n * 3);
    const r = rng(3);
    for (let i = 0; i < n; i++) {
      xyz[i * 3] = i * 0.25;
      xyz[i * 3 + 2] = (r() - 0.5) * jitter;
    }
    const t0 = Date.now();
    const d = nearestNeighbourDistances(xyz);
    assert.ok(Date.now() - t0 < 500, `jitter ${jitter}: ${Date.now() - t0} ms`);
    close(Math.min(...d), 0.25, 1e-4);
  }
  const out = new Float64Array(401 * 3);
  const r = rng(5);
  for (let i = 0; i < 400; i++) {
    out[i * 3] = r() * 20;
    out[i * 3 + 2] = r() * 20;
  }
  out[400 * 3] = 1e6; // one far outlier
  const t0 = Date.now();
  const d = nearestNeighbourDistances(out);
  assert.ok(Date.now() - t0 < 1000, `outlier: ${Date.now() - t0} ms`);
  assert.ok(d[400] > 9.99e5);
});

test("matchPoints", () => {
  const targets = Float64Array.of(0, 0, 0, 10, 0, 0, 10.3, 0, 0);
  const got = matchPoints(Float64Array.of(0.2, 5, 0, 10.2, 0, 0, 50, 0, 0), targets, 0.5);
  assert.deepEqual([...got], [0, 2, -1]); // nearest within tolerance; planar ignores y
  const got3d = matchPoints(Float64Array.of(0.2, 5, 0), targets, 0.5, { planar: false });
  assert.deepEqual([...got3d], [-1]);
});

test("segment crossings", () => {
  const X = (a, b, c, d) => segmentsCross(a, b, c, d);
  assert.equal(X([0, 0], [10, 10], [0, 10], [10, 0]), true, "proper crossing");
  assert.equal(X([0, 0], [10, 0], [0, 1], [10, 1]), false, "parallel");
  assert.equal(X([0, 0], [10, 0], [10, 0], [10, 10]), false, "shared endpoint, corner");
  assert.equal(X([0, 0], [10, 0], [10, 0], [20, 0]), false, "shared endpoint, collinear, opposite ways");
  assert.equal(X([0, 0], [10, 0], [0, 0], [5, 0]), true, "shared endpoint, collinear overlap");
  assert.equal(X([0, 0], [10, 0], [5, 0], [5, 7]), true, "T-junction");
  assert.equal(X([0, 0], [10, 0], [12, 0], [20, 0]), false, "collinear, disjoint");
  assert.equal(X([0, 0], [10, 0], [2, 0], [8, 0]), true, "collinear, contained");
  assert.equal(X([0, 0], [10, 0], [0, 0], [10, 0]), true, "the same segment twice");
  assert.equal(X([0, 0], [10, 0], [5, 0.5], [5, 7]), false, "near miss above");

  // Degenerate segments (verifier repro): a zero-length piece at a shared
  // endpoint is a duplicated vertex, not a crossing...
  assert.equal(X([0, 0], [10, 0], [10, 0], [10, 0]), false, "zero-length at the endpoint");
  assert.equal(segmentsCross([0, 0], [10, 0], [10, 0], [10.00005, 0], 1e-4), false, "sub-eps piece at the endpoint");
  assert.equal(findCrossings([[[0, 0], [10, 0]], [[10, 0], [10.00005, 0]], [[10.00005, 0], [20, 5]]], { eps: 1e-4 }).count, 0);
  // ...but a point-like piece in the middle of another segment is a junction there.
  assert.equal(X([0, 0], [10, 0], [5, 0], [5, 0]), true, "zero-length on the interior");
  assert.equal(X([0, 0], [0, 0], [3, 3], [3, 3]), false, "two points");
  // The tolerance is a distance whatever the segment lengths: a 3.5e-4 gap
  // off a long segment is not touching at eps 1e-6.
  assert.equal(X([0, 0], [1000, 0], [500, 0.00035], [500, 7]), false, "long segment, small gap");
  assert.equal(segmentsCross([0, 0], [1000, 0], [500, 0.00035], [500, 7], 1e-3), true, "the same gap within eps");
  // Symmetric inside the eps band (verifier repro: false one way, true swapped).
  assert.equal(X([0, 0], [1, 0], [0, 0], [1000, 1e-4]), X([0, 0], [1000, 1e-4], [0, 0], [1, 0]), "swap symmetry");
  {
    const r = rng(17);
    for (let k = 0; k < 20000; k++) {
      const p = [r() * 2 - 1, r() * 2 - 1];
      const q = [p[0] + (r() - 0.5) * 1e3, p[1] + (r() - 0.5) * 1e-5];
      const s = [p[0] + (r() - 0.5) * 2, p[1] + (r() - 0.5) * 1e-5];
      assert.equal(X(p, q, p, s), X(p, s, p, q), `swap symmetry, case ${k}`);
    }
  }

  // A lattice's edges meet only at shared corners: no crossings.
  const segs = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i < 4) segs.push([[i, j], [i + 1, j]]);
      if (j < 4) segs.push([[i, j], [i, j + 1]]);
    }
  }
  assert.equal(findCrossings(segs).count, 0);
  // MUST FAIL: add the two diagonals of one cell and they cross each other.
  segs.push([[0, 0], [1, 1]], [[1, 0], [0, 1]]);
  const f = findCrossings(segs);
  assert.equal(f.count, 1);
  assert.equal(f.pairs.length, 1);
});

test("connected components", () => {
  const one = connectedComponents(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]);
  assert.equal(one.count, 1);
  const two = connectedComponents(5, [
    [0, 1],
    [2, 3],
    [3, 4],
  ]);
  assert.equal(two.count, 2);
  assert.deepEqual([...two.sizes].sort(), [2, 3]);
  const isolated = connectedComponents(3, [[0, 1]]);
  assert.equal(isolated.count, 2);
  assert.equal(isolated.degree[2], 0);
  assert.equal(isolated.degree[0], 1);
});

function grid(n, size, heightFn) {
  const tris = [];
  const h = size / n;
  const P = (i, j) => [i * h - size / 2, heightFn(i * h - size / 2, j * h - size / 2), j * h - size / 2];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      tris.push(...P(i, j), ...P(i + 1, j), ...P(i + 1, j + 1));
      tris.push(...P(i, j), ...P(i + 1, j + 1), ...P(i, j + 1));
    }
  }
  return Float64Array.from(tris);
}

test("surface height and slope", () => {
  const flat = new Surface(grid(4, 20, () => 3));
  const s = flat.sample(1.3, -2.2);
  close(s.y, 3, 1e-9);
  close(s.slopeDeg, 0, 1e-9);
  assert.equal(flat.sample(50, 0), null, "off the mesh");
  close(flat.sample(10, 10).y, 3, 1e-9); // the far corner vertex is on the mesh

  const tan30 = Math.tan(Math.PI / 6);
  const tilted = new Surface(grid(6, 30, (x, z) => z * tan30));
  const t = tilted.sample(2.1, 4.7);
  close(t.y, 4.7 * tan30, 1e-9);
  close(t.slopeDeg, 30, 1e-9);
  // MUST FAIL: a 30 degree slope is not under 25 degrees.
  assert.ok(!(t.slopeDeg < 25));

  // Half flat, half steep (60 deg for x > 0): steep fraction ~ 0.5.
  const tan60 = Math.tan(Math.PI / 3);
  const half = new Surface(grid(10, 20, (x) => (x > 0 ? x * tan60 : 0)));
  const st = half.slopeStats(45);
  close(st.steepFraction, 0.5, 1e-9);
  close(st.projectedArea, 400, 1e-9);
  close(st.heightRange, 10 * tan60, 1e-9);

  close(slopeDegFromNormal([0, 1, 0]), 0);
  close(slopeDegFromNormal([0, -1, 0]), 0); // either winding
  close(slopeDegFromNormal([1, 0, 0]), 90);
});

test("horizontal occlusion", () => {
  const eye = [0, 1.7, 0];
  const trunk = { x: 10, z: 0, radius: 1, yMin: 0, yMax: 12 };
  const one = horizontalOcclusion(eye, [trunk], { maxDistance: 30, rays: 360 });
  // Angular half-width asin(1/10) = 5.74 deg -> rays at -5..5 deg: 11 of 360.
  assert.equal(one.blocked, 11);
  close(one.hitDistances[0], 9, 1e-9);
  assert.equal(one.hitDistances[180], Infinity);

  // MUST FAIL: the same trunk beyond maxDistance blocks nothing.
  assert.equal(horizontalOcclusion(eye, [{ ...trunk, x: 40 }], { maxDistance: 30 }).blocked, 0);
  // Eye above the trunk's top: not blocked.
  assert.equal(horizontalOcclusion([0, 20, 0], [trunk], { maxDistance: 30 }).blocked, 0);
  // Eye inside a trunk: every ray blocked at 0.
  const inside = horizontalOcclusion(eye, [{ x: 0.2, z: 0, radius: 1, yMin: 0, yMax: 5 }], { maxDistance: 30, rays: 36 });
  assert.equal(inside.fraction, 1);

  // A closed palisade of touching trunks blocks everything.
  const ring = [];
  for (let k = 0; k < 64; k++) {
    const a = (2 * Math.PI * k) / 64;
    ring.push({ x: 20 * Math.cos(a), z: 20 * Math.sin(a), radius: 1.2, yMin: 0, yMax: 10 });
  }
  assert.equal(horizontalOcclusion(eye, ring, { maxDistance: 30, rays: 720 }).fraction, 1);
});
