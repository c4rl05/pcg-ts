/**
 * Independent verification of polygonBoolean and splitPolygons, with every
 * expectation derived from the node spec (set semantics, exact cell areas,
 * area identities, grid sampling), not from the implementation.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, setPolylineTopology } from "../data/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { polygonBoolean, splitPolygons } from "./index.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

const HOLE_OF_ATTR = "holeOf";

type Pt = readonly [number, number];
type Plane = "xz" | "xy" | "yz";

interface Spec {
  readonly pts: readonly Pt[];
  readonly holeOf?: number;
  readonly open?: boolean;
  readonly tag?: string;
  readonly group?: number;
}

/** Spec points are (u, w) and land in 3D per plane; (u, w) = (x, z) for xz. */
function to3(plane: Plane, a: number, b: number, y: number): [number, number, number] {
  if (plane === "xz") return [a, y, b];
  if (plane === "xy") return [a, b, y];
  return [y, a, b];
}
function from3(plane: Plane, t: ArrayLike<number>): Pt {
  if (plane === "xz") return [t[0], t[2]];
  if (plane === "xy") return [t[0], t[1]];
  return [t[1], t[2]];
}

function build(specs: readonly Spec[], plane: Plane = "xz", y = 0): Geometry {
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
    for (const [a, b] of l.pts) {
      P.setTuple(p, to3(plane, a, b, y));
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
    const g = geo.attrs.primitive.add("grp", "i32", 1, 0);
    specs.forEach((l, k) => g.set(k, l.group ?? 0));
  }
  return geo;
}

interface Out {
  readonly pts: Pt[];
  readonly holeOf: number;
  /** Signed area in (u, v) = (x, -z) for xz: > 0 counter-clockwise from +y. */
  readonly area: number;
}

function shoelace(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return a / 2;
}

function read(geo: Geometry, plane: Plane = "xz"): Out[] {
  const P = geo.attrs.point.require("P");
  const hole = geo.primitiveCount > 0 ? geo.attrs.primitive.require(HOLE_OF_ATTR) : undefined;
  const out: Out[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p];
    const n = geo.primVertexCount[p];
    expect(geo.vertexToPoint[s + n - 1], `loop ${p} closed`).toBe(geo.vertexToPoint[s]);
    const pts: Pt[] = [];
    for (let k = 0; k < n - 1; k++) pts.push(from3(plane, P.getTuple(geo.vertexToPoint[s + k])));
    // (x, -z): negate the shoelace of (x, z).
    out.push({ pts, holeOf: hole!.get(p), area: -shoelace(pts) });
  }
  return out;
}

const net = (ls: readonly Out[]): number => ls.reduce((s, l) => s + l.area, 0);

function wrap(geo: Geometry) {
  return [makeGeometryItem(geo)];
}

async function boolRaw(a: Geometry, b: Geometry | undefined, params: Record<string, unknown>): Promise<Geometry> {
  const inputs: Record<string, ReturnType<typeof wrap>> = { in: wrap(a) };
  if (b !== undefined) inputs.clip = wrap(b);
  return firstGeo((await runNode(polygonBoolean, params, inputs)).out);
}
async function splitRaw(a: Geometry, c: Geometry, params: Record<string, unknown>): Promise<Geometry> {
  return firstGeo((await runNode(splitPolygons, params, { in: wrap(a), cutters: wrap(c) })).out);
}

// ---------------------------------------------------------------------------
// Geometry predicates

function pip(p: Pt, poly: readonly Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = dx * dx + dy * dy;
  let t = L === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function edges(loop: readonly Pt[], closed = true): [Pt, Pt][] {
  const e: [Pt, Pt][] = [];
  for (let i = 0; i + 1 < loop.length; i++) e.push([loop[i], loop[i + 1]]);
  if (closed) e.push([loop[loop.length - 1], loop[0]]);
  return e;
}

/** Set semantics shared by inputs and outputs: union of (outer minus its holes). */
function member(p: Pt, specs: readonly { pts: readonly Pt[]; holeOf?: number }[]): number {
  let count = 0;
  specs.forEach((s, k) => {
    if ((s.holeOf ?? -1) >= 0) return;
    if (!pip(p, s.pts)) return;
    if (specs.some((h) => h.holeOf === k && pip(p, h.pts))) return;
    count++;
  });
  return count;
}

function properCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const cr = (o: Pt, u: Pt, v: Pt) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const lab = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const lcd = Math.hypot(d[0] - c[0], d[1] - c[1]);
  const tol = 1e-7;
  const d1 = cr(c, d, a) / lcd;
  const d2 = cr(c, d, b) / lcd;
  const d3 = cr(a, b, c) / lab;
  const d4 = cr(a, b, d) / lab;
  return ((d1 > tol && d2 < -tol) || (d1 < -tol && d2 > tol)) && ((d3 > tol && d4 < -tol) || (d3 < -tol && d4 > tol));
}

function wellFormed(ls: readonly Out[], snap = 1e-4): void {
  ls.forEach((l, k) => {
    expect(l.pts.length, `loop ${k} >= 3 points`).toBeGreaterThanOrEqual(3);
    if (l.holeOf < 0) expect(l.area, `loop ${k} outer positive`).toBeGreaterThan(0);
    else {
      expect(l.area, `loop ${k} hole negative`).toBeLessThan(0);
      expect(l.holeOf, `hole ${k} names an earlier loop`).toBeLessThan(k);
      expect(ls[l.holeOf].holeOf, `hole ${k} names an outer`).toBe(-1);
      // Holes immediately follow their outer: everything between is a hole of it.
      for (let j = l.holeOf + 1; j < k; j++) expect(ls[j].holeOf, `loop ${j} between outer and hole ${k}`).toBe(l.holeOf);
      const outer = ls[l.holeOf].pts;
      // A hole must leave some of its outer: the outer's holes never cover all of it.
      const holeSum = ls.filter((h) => h.holeOf === l.holeOf).reduce((s, h) => s - h.area, 0);
      expect(holeSum, `holes of outer ${l.holeOf} leave it non-empty`).toBeLessThan(ls[l.holeOf].area - 1e-9);
      for (const p of l.pts) {
        const onEdge = edges(outer).some(([a, b]) => segDist(p, a, b) <= snap);
        expect(onEdge || pip(p, outer), `hole ${k} point ${p} inside outer`).toBe(true);
      }
    }
    // Welded: consecutive vertices are not within the snap distance.
    for (const [a, b] of edges(l.pts)) {
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `loop ${k} edge length`).toBeGreaterThan(snap * 0.5);
    }
  });
  // No two edges properly cross (within a loop: non-adjacent edges).
  const all: { k: number; i: number; n: number; a: Pt; b: Pt }[] = [];
  ls.forEach((l, k) => edges(l.pts).forEach(([a, b], i) => all.push({ k, i, n: l.pts.length, a, b })));
  for (let x = 0; x < all.length; x++) {
    for (let y = x + 1; y < all.length; y++) {
      const e = all[x];
      const f = all[y];
      if (e.k === f.k && (Math.abs(e.i - f.i) === 1 || Math.abs(e.i - f.i) === e.n - 1)) continue;
      if (properCross(e.a, e.b, f.a, f.b)) {
        throw new Error(`edges cross: loop ${e.k} edge ${e.i} ${JSON.stringify([e.a, e.b])} x loop ${f.k} edge ${f.i} ${JSON.stringify([f.a, f.b])}`);
      }
    }
  }
}

type Op = "union" | "intersection" | "difference";

function expected(op: Op, a: number, b: number): boolean {
  if (op === "union") return a > 0 || b > 0;
  if (op === "intersection") return a > 0 && b > 0;
  return a > 0 && b === 0;
}

function bbox(specs: readonly Spec[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of specs) for (const [x, y] of s.pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

function sampleCheck(
  label: string,
  out: readonly Out[],
  inside: (p: Pt) => boolean | undefined,
  box: [number, number, number, number],
  n = 47,
): void {
  const [x0, y0, x1, y1] = box;
  let bad = 0;
  let first = "";
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const p: Pt = [x0 - 0.37 + ((x1 - x0 + 0.74) * (i + 0.5)) / (n + 1), y0 - 0.41 + ((y1 - y0 + 0.82) * (j + 0.5)) / (n + 1)];
      const want = inside(p);
      if (want === undefined) continue;
      const m = member(p, out);
      if (m > 1 || (m === 1) !== want) {
        bad++;
        if (first === "") first = `at ${p}: expected ${want}, output coverage ${m}`;
      }
    }
  }
  expect(bad, `${label}: ${bad} sample mismatches, first ${first}`).toBe(0);
}

function reverseOrder(specs: readonly Spec[]): Spec[] {
  const n = specs.length;
  return [...specs].reverse().map((s) => ({ ...s, holeOf: s.holeOf === undefined || s.holeOf < 0 ? s.holeOf : n - 1 - s.holeOf }));
}
const reverseWinding = (specs: readonly Spec[]): Spec[] => specs.map((s) => ({ ...s, pts: [...s.pts].reverse() }));

function closeLoops(a: readonly Out[], b: readonly Out[], tol: number): void {
  expect(b.map((l) => [l.holeOf, l.pts.length])).toEqual(a.map((l) => [l.holeOf, l.pts.length]));
  a.forEach((l, k) =>
    l.pts.forEach((p, i) => {
      expect(Math.abs(p[0] - b[k].pts[i][0]) + Math.abs(p[1] - b[k].pts[i][1])).toBeLessThanOrEqual(tol);
    }),
  );
}

/** Run a boolean and check everything the spec says about it. */
async function checkBool(
  label: string,
  op: Op,
  A: readonly Spec[],
  B: readonly Spec[] | undefined,
  opts: { exact?: boolean; area?: number; skip?: number } = {},
): Promise<Out[]> {
  const params = { operation: op };
  const geoA = await boolRaw(build(A), B === undefined ? undefined : build(B), params);
  const out = read(geoA);
  wellFormed(out);
  if (opts.area !== undefined) expect(net(out), `${label} area`).toBeCloseTo(opts.area, 6);
  // determinism
  const again = await boolRaw(build(A), B === undefined ? undefined : build(B), params);
  expect(snapshotGeometry(again)).toEqual(snapshotGeometry(geoA));
  // input order and winding invariance
  const rev = read(await boolRaw(build(reverseOrder(A)), B === undefined ? undefined : build(reverseOrder(B)), params));
  const cw = read(await boolRaw(build(reverseWinding(A)), B === undefined ? undefined : build(reverseWinding(B)), params));
  if (opts.exact === true) {
    expect(rev, `${label} reversed order`).toEqual(out);
    expect(cw, `${label} reversed winding`).toEqual(out);
  } else {
    closeLoops(out, rev, 1e-6);
    closeLoops(out, cw, 1e-6);
  }
  // sampling against the set semantics
  const inputs = [...A, ...(B ?? [])];
  const skip = opts.skip ?? 1e-3;
  sampleCheck(
    label,
    out,
    (p) => {
      for (const s of inputs) for (const [a, b] of edges(s.pts)) if (segDist(p, a, b) < skip) return undefined;
      return expected(op, member(p, A), B === undefined ? 0 : member(p, B));
    },
    bbox(inputs),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Generators

function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

function randRects(rng: () => number, k: number, size: number): number[][] {
  const r: number[][] = [];
  for (let i = 0; i < k; i++) {
    const x0 = Math.floor(rng() * size);
    const z0 = Math.floor(rng() * size);
    r.push([x0, z0, x0 + 1 + Math.floor(rng() * 4), z0 + 1 + Math.floor(rng() * 4)]);
  }
  return r;
}

function cells(rs: readonly number[][]): Set<string> {
  const s = new Set<string>();
  for (const [x0, z0, x1, z1] of rs) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) s.add(`${x},${z}`);
  return s;
}

/** Histogram polygon: column x in [0, n) covers z in [base, base + h[x]) (every unit vertex kept). */
function histogram(ox: number, base: number, h: readonly number[], down = false): { pts: Pt[]; cells: string[] } {
  const pts: Pt[] = [];
  const cs: string[] = [];
  const sgn = down ? -1 : 1;
  for (let x = 0; x <= h.length; x++) pts.push([ox + x, base]); // bottom, all collinear vertices
  for (let x = h.length - 1; x >= 0; x--) {
    pts.push([ox + x + 1, base + sgn * h[x]]);
    pts.push([ox + x, base + sgn * h[x]]);
  }
  pts.pop(); // last equals (ox, base + h[0]) -> keep; remove only exact duplicates below
  pts.push([ox, base + sgn * h[0]]);
  // Remove consecutive exact duplicates (vertical step of 0 height).
  const clean: Pt[] = [];
  for (const p of pts) {
    const q = clean[clean.length - 1];
    if (q === undefined || q[0] !== p[0] || q[1] !== p[1]) clean.push(p);
  }
  if (clean.length > 1 && clean[0][0] === clean[clean.length - 1][0] && clean[0][1] === clean[clean.length - 1][1]) clean.pop();
  for (let x = 0; x < h.length; x++) {
    for (let z = 0; z < h[x]; z++) cs.push(`${ox + x},${down ? base - z - 1 : base + z}`);
  }
  return { pts: down ? clean.reverse() : clean, cells: cs };
}

function star(rng: () => number, cx: number, cz: number, r: number, n: number): Pt[] {
  const angs: number[] = [];
  for (let i = 0; i < n; i++) angs.push(((i + 0.2 + rng() * 0.6) / n) * Math.PI * 2);
  return angs.map((a) => {
    const rr = r * (0.3 + rng() * 0.7);
    // P is f32: round here so the reference areas see the stored inputs.
    return [Math.fround(cx + rr * Math.cos(a)), Math.fround(cz + rr * Math.sin(a))] as Pt;
  });
}

// ---------------------------------------------------------------------------

describe("polygonBoolean (verify)", () => {
  it("random integer rectangle sets: exact cell areas for all three ops", async () => {
    const rng = lcg(7);
    for (let trial = 0; trial < 12; trial++) {
      const ra = randRects(rng, 2 + Math.floor(rng() * 5), 8);
      const rb = randRects(rng, 1 + Math.floor(rng() * 5), 8);
      const A = ra.map((r) => ({ pts: rect(r[0], r[1], r[2], r[3]) }));
      const B = rb.map((r) => ({ pts: rect(r[0], r[1], r[2], r[3]) }));
      const ca = cells(ra);
      const cb = cells(rb);
      const uni = new Set([...ca, ...cb]).size;
      const inter = [...ca].filter((c) => cb.has(c)).length;
      const diff = ca.size - inter;
      const tag = `trial ${trial} A=${JSON.stringify(ra)} B=${JSON.stringify(rb)}`;
      await checkBool(`${tag} union`, "union", A, B, { exact: true, area: uni });
      await checkBool(`${tag} intersection`, "intersection", A, B, { exact: true, area: inter });
      await checkBool(`${tag} difference`, "difference", A, B, { exact: true, area: diff });
    }
  });

  it("histogram polygons with collinear vertices against rectangles", async () => {
    const rng = lcg(99);
    for (let trial = 0; trial < 8; trial++) {
      const h1 = Array.from({ length: 6 }, () => 1 + Math.floor(rng() * 4));
      const h2 = Array.from({ length: 5 }, () => 1 + Math.floor(rng() * 4));
      const up = histogram(0, 0, h1);
      const down = histogram(1, 5, h2, true);
      const rb = randRects(rng, 3, 6);
      const A = [{ pts: up.pts }, { pts: down.pts }];
      const B = rb.map((r) => ({ pts: rect(r[0], r[1], r[2], r[3]) }));
      const ca = new Set([...up.cells, ...down.cells]);
      const cb = cells(rb);
      const inter = [...ca].filter((c) => cb.has(c)).length;
      const tag = `trial ${trial} h1=${h1} h2=${h2} B=${JSON.stringify(rb)}`;
      expect(shoelace(up.pts), "fixture self-check").toBeCloseTo(up.cells.length, 9);
      await checkBool(`${tag} union`, "union", A, B, { exact: true, area: new Set([...ca, ...cb]).size });
      await checkBool(`${tag} intersection`, "intersection", A, B, { exact: true, area: inter });
      await checkBool(`${tag} difference`, "difference", A, B, { exact: true, area: ca.size - inter });
    }
  });

  it("checkerboard and full grid of unit squares (vertex-only touches)", async () => {
    const board: Spec[] = [];
    const full: Spec[] = [];
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
      full.push({ pts: rect(x, z, x + 1, z + 1) });
      if ((x + z) % 2 === 0) board.push({ pts: rect(x, z, x + 1, z + 1) });
    }
    await checkBool("board union", "union", board, undefined, { exact: true, area: 8 });
    const g = await checkBool("grid union", "union", full, undefined, { exact: true, area: 16 });
    expect(g.map((l) => l.pts.length)).toEqual([4]);
    await checkBool("grid minus board", "difference", full, board, { exact: true, area: 8 });
    await checkBool("grid inter board", "intersection", full, board, { exact: true, area: 8 });
  });

  it("random star polygons obey the area identities", async () => {
    const rng = lcg(1234);
    for (let trial = 0; trial < 10; trial++) {
      const a = star(rng, 0, 0, 3, 5 + Math.floor(rng() * 12));
      const b = star(rng, rng() * 2, rng() * 2, 3, 5 + Math.floor(rng() * 12));
      const A = [{ pts: a }];
      const B = [{ pts: b }];
      const areaA = Math.abs(shoelace(a));
      const areaB = Math.abs(shoelace(b));
      const u = net(await checkBool(`star ${trial} union`, "union", A, B));
      const i = net(await checkBool(`star ${trial} inter`, "intersection", A, B));
      const d = net(await checkBool(`star ${trial} diff`, "difference", A, B));
      // Crossing points land in f32, so allow ~1e-6 per unit of perimeter.
      expect(Math.abs(u + i - areaA - areaB)).toBeLessThan(2e-5);
      expect(Math.abs(d - (areaA - i))).toBeLessThan(2e-5);
    }
  });

  it("nested holes and islands", async () => {
    const specs: Spec[] = [
      { pts: rect(0, 0, 10, 10) },
      { pts: rect(2, 2, 8, 8), holeOf: 0 },
      { pts: rect(3, 3, 7, 7) },
      { pts: rect(4, 4, 6, 6), holeOf: 2 },
    ];
    const u = await checkBool("nested union", "union", specs, undefined, { exact: true, area: 76 });
    expect(u.map((l) => [l.area, l.holeOf])).toEqual([
      [100, -1],
      [-36, 0],
      [16, -1],
      [-4, 2],
    ]);
    const d = await checkBool("nested minus nothing", "difference", specs, undefined, { exact: true, area: 76 });
    expect(d).toEqual(u);
    expect(read(await boolRaw(build(specs), undefined, { operation: "intersection" }))).toEqual([]);
    // Clip a band across all four rings.
    await checkBool("nested minus band", "difference", specs, [{ pts: rect(-1, 4.5, 11, 5.5) }], { exact: true, area: 76 - (10 - 6 + 4 - 2) });
    // Feedback: the output with holeOf, fed back in, is a fixed point.
    const outSpecs: Spec[] = u.map((l) => ({ pts: l.pts, holeOf: l.holeOf }));
    const again = read(await boolRaw(build(outSpecs), undefined, { operation: "union" }));
    expect(again).toEqual(u);
  });

  it("vertex touches: two squares at a corner, a hole touching its outer", async () => {
    await checkBool("corner union", "union", [{ pts: rect(0, 0, 1, 1) }], [{ pts: rect(1, 1, 2, 2) }], { exact: true, area: 2 });
    await checkBool("corner inter", "intersection", [{ pts: rect(0, 0, 1, 1) }], [{ pts: rect(1, 1, 2, 2) }], { exact: true, area: 0 });
    const holed: Spec[] = [
      { pts: rect(0, 0, 4, 4) },
      {
        pts: [
          [0, 0],
          [2, 1],
          [1, 2],
        ],
        holeOf: 0,
      },
    ];
    await checkBool("hole touching outer", "union", holed, undefined, { exact: true, area: 14.5 });
    await checkBool("hole touching outer minus square", "difference", holed, [{ pts: rect(3, 3, 5, 5) }], { exact: true, area: 13.5 });
    // Two holes touching each other at a vertex inside one outer.
    const twoHoles: Spec[] = [
      { pts: rect(0, 0, 4, 4) },
      { pts: rect(1, 1, 2, 2), holeOf: 0 },
      { pts: rect(2, 2, 3, 3), holeOf: 0 },
    ];
    await checkBool("holes touching", "union", twoHoles, undefined, { exact: true, area: 14 });
  });

  it("collinear partial edges, identical polygons, many copies", async () => {
    await checkBool("notch", "difference", [{ pts: rect(0, 0, 4, 2) }], [{ pts: rect(1, 0, 3, 1) }], { exact: true, area: 6 });
    await checkBool("overhang", "union", [{ pts: rect(0, 0, 4, 2) }], [{ pts: rect(1, 2, 5, 3) }], { exact: true, area: 12 });
    const rng = lcg(5);
    const s = star(rng, 0, 0, 2, 9);
    const area = Math.abs(shoelace(s));
    expect(net(await checkBool("same union", "union", [{ pts: s }], [{ pts: s }]))).toBeCloseTo(area, 9);
    expect(net(await checkBool("same inter", "intersection", [{ pts: s }], [{ pts: s }]))).toBeCloseTo(area, 9);
    expect(await checkBool("same diff", "difference", [{ pts: s }], [{ pts: s }])).toEqual([]);
    const copies: Spec[] = [];
    for (let k = 0; k < 20; k++) copies.push({ pts: k % 3 === 0 ? [...s].reverse() : s });
    const u = await checkBool("20 copies", "union", copies, undefined);
    expect(u).toHaveLength(1);
    expect(net(u)).toBeCloseTo(area, 9);
    expect(await checkBool("copies minus one", "difference", copies, [{ pts: s }])).toEqual([]);
  });

  it("near-coincident vertices, a T-junction a hair off an edge, thin slivers", async () => {
    // B's corner 1e-6 from A's edge line.
    const near = await checkBool(
      "near union",
      "union",
      [{ pts: rect(0, 0, 2, 2) }],
      [{ pts: rect(1 + 1e-6, 1e-6, 3, 2) }],
      { skip: 1e-3 },
    );
    expect(near).toHaveLength(1);
    expect(net(near)).toBeCloseTo(6, 4);
    // A triangle whose base floats 5e-5 above A's top edge: within snap, so it rests on it.
    const tri: Pt[] = [
      [0.5, 2 + 5e-5],
      [1, 3],
      [1.5, 2 + 5e-5],
    ];
    const t = await checkBool("T hair", "union", [{ pts: rect(0, 0, 2, 2) }], [{ pts: tri }]);
    expect(t.map((l) => l.holeOf)).toEqual([-1]);
    expect(net(t)).toBeCloseTo(4.5, 3);
    // A vertex a hair off (inside) an edge of the other polygon.
    const hair = await checkBool("vertex hair", "union", [{ pts: rect(0, 0, 2, 2) }], [
      {
        pts: [
          [1, 2 - 5e-5],
          [2.5, 3],
          [-0.5, 3],
        ],
      },
    ]);
    // The hair vertex snaps onto the edge: the two touch at a point (1 or 2 loops both fine).
    expect(net(hair)).toBeCloseTo(4 + 1.5 * (1 + 5e-5), 3);
    // Thin sliver: width 1e-3, well above snap.
    const sl: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 1e-3],
    ];
    const si = await checkBool("sliver inter", "intersection", [{ pts: rect(0, 0, 10, 1) }], [{ pts: sl }], { skip: 1e-4 });
    expect(net(si)).toBeCloseTo(0.005, 9);
    const sd = await checkBool("sliver diff", "difference", [{ pts: rect(0, 0, 10, 1) }], [{ pts: sl }], { skip: 1e-4 });
    expect(net(sd)).toBeCloseTo(10 - 0.005, 9);
    // A sliver thinner than snap: zero area after welding, dropped.
    const tiny: Pt[] = [
      [0, 0],
      [10, 0],
      [5, 1e-6],
    ];
    const tr = read(await boolRaw(build([{ pts: tiny }]), undefined, { operation: "union" }));
    expect(tr).toEqual([]);
  });

  it("other planes give the same areas", async () => {
    const A: Spec[] = [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 2, 2), holeOf: 0 }];
    const B: Spec[] = [{ pts: rect(3, 3, 6, 5) }];
    const ref = net(read(await boolRaw(build(A), build(B), { operation: "union" })));
    expect(ref).toBeCloseTo(16 - 1 + 6 - 1, 9);
    for (const plane of ["xy", "yz"] as const) {
      const o = read(await boolRaw(build(A, plane, 3), build(B, plane, 3), { operation: "union", plane }), plane);
      const areas = o.map((l) => l.area);
      // outers and holes have opposite signs, magnitudes as in xz
      const outer = o.filter((l) => l.holeOf < 0).map((l) => Math.abs(l.area));
      const holes = o.filter((l) => l.holeOf >= 0).map((l) => Math.abs(l.area));
      expect(outer.reduce((s, a) => s + a, 0) - holes.reduce((s, a) => s + a, 0), `${plane} ${areas}`).toBeCloseTo(ref, 9);
      const so = Math.sign(o.find((l) => l.holeOf < 0)!.area);
      for (const l of o) expect(Math.sign(l.area)).toBe(l.holeOf < 0 ? so : -so);
    }
  });

  it("a hole overlapped by another filled loop of the same set (probe)", async () => {
    // Spec: set = union over outers of (outer minus its holes)? Then the island B fills part of A's hole.
    const specs: Spec[] = [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 3, 3), holeOf: 0 }, { pts: rect(2, 2, 5, 5) }];
    // union semantics: 16 - 4 + (9 - 4 overlap with A) + 1 (part of hole covered) = 16 - 4 + 5 + 1 = 18
    await checkBool("hole overlapped", "union", specs, undefined, { exact: true, area: 18 });
  });

  it("coincident hole and island edges dissolve", async () => {
    const ringAndIsland: Spec[] = [
      { pts: rect(0, 0, 4, 4) },
      { pts: rect(1, 1, 3, 3), holeOf: 0 },
      { pts: rect(1, 1, 3, 3) },
    ];
    const u = await checkBool("ring + island union", "union", ringAndIsland, undefined, { exact: true, area: 16 });
    expect(u.map((l) => [l.area, l.pts.length])).toEqual([[16, 4]]);
    await checkBool("ring + island inter", "intersection", ringAndIsland, [{ pts: rect(0, 0, 4, 4) }], { exact: true, area: 16 });
    // A hole sharing an edge with its outer is a notch.
    const notch = await checkBool("edge hole", "union", [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 0, 3, 1), holeOf: 0 }], undefined, { exact: true, area: 14 });
    expect(notch.map((l) => l.holeOf)).toEqual([-1]);
    // Ring from a difference, then an island placed exactly in its hole by the clip.
    await checkBool("ring union island", "union", [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 3, 3), holeOf: 0 }], [{ pts: rect(1, 1, 3, 3) }], { exact: true, area: 16 });
  });

  it("groups: loops only combine within their group", async () => {
    const A: Spec[] = [
      { pts: rect(0, 0, 2, 2), group: 1 },
      { pts: rect(1, 1, 3, 3), group: 2 },
    ];
    const B: Spec[] = [{ pts: rect(0, 0, 3, 3), group: 1 }];
    const o = read(await boolRaw(build(A), build(B), { operation: "difference", groupAttr: "grp" }));
    wellFormed(o);
    // group 1: A0 - B = 0; group 2: A1 minus an empty clip = 4.
    expect(net(o)).toBeCloseTo(4, 9);
  });
});

// ---------------------------------------------------------------------------

interface Cutter {
  readonly pts: readonly Pt[];
  readonly closed?: boolean;
}

async function checkSplit(
  label: string,
  poly: readonly Spec[],
  cutters: readonly Cutter[],
  kerf: number,
  want: { pieces?: number; area?: number; areas?: number[] } = {},
): Promise<Out[]> {
  const cgeo = () => build(cutters.map((c) => ({ pts: c.pts, open: c.closed !== true })));
  const geo = await splitRaw(build(poly), cgeo(), { kerf });
  const out = read(geo);
  wellFormed(out);
  const again = await splitRaw(build(poly), cgeo(), { kerf });
  expect(snapshotGeometry(again)).toEqual(snapshotGeometry(geo));
  if (want.pieces !== undefined) expect(out.filter((l) => l.holeOf < 0).length, `${label} pieces`).toBe(want.pieces);
  if (want.area !== undefined) expect(net(out), `${label} area`).toBeCloseTo(want.area, 6);
  if (want.areas !== undefined) {
    const got = out.filter((l) => l.holeOf < 0).map((l, _k) => l.area + out.filter((h) => h.holeOf === out.indexOf(l)).reduce((s, h) => s + h.area, 0));
    expect(got.sort((a, b) => a - b).map((a) => Math.round(a * 1e6) / 1e6), `${label} piece areas`).toEqual(
      [...want.areas].sort((a, b) => a - b).map((a) => Math.round(a * 1e6) / 1e6),
    );
  }
  const segs: [Pt, Pt][] = [];
  for (const c of cutters) segs.push(...edges(c.pts, c.closed === true));
  const h = kerf / 2;
  const inRect = (p: Pt, a: Pt, b: Pt, margin: number): boolean => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L;
    const uy = (b[1] - a[1]) / L;
    const t = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy;
    const d = Math.abs(-(p[0] - a[0]) * uy + (p[1] - a[1]) * ux);
    return t >= -h - margin && t <= L + h + margin && d <= h + margin;
  };
  sampleCheck(
    label,
    out,
    (p) => {
      for (const s of poly) for (const [a, b] of edges(s.pts)) if (segDist(p, a, b) < 1e-3) return undefined;
      for (const [a, b] of segs) {
        if (kerf === 0) {
          if (segDist(p, a, b) < 1e-3) return undefined;
        } else if (inRect(p, a, b, 1e-3) !== inRect(p, a, b, -1e-3)) return undefined;
      }
      if (member(p, poly) === 0) return false;
      return kerf === 0 ? true : !segs.some(([a, b]) => inRect(p, a, b, 0));
    },
    bbox(poly),
    61,
  );
  return out;
}

const seg = (a: Pt, b: Pt): Cutter => ({ pts: [a, b] });
const SQ: Spec[] = [{ pts: rect(0, 0, 4, 4) }];

describe("splitPolygons (verify)", () => {
  it("crossing cutters, kerf 0 and > 0", async () => {
    const cross = [seg([2, -1], [2, 5]), seg([-1, 2], [5, 2])];
    await checkSplit("cross k0", SQ, cross, 0, { pieces: 4, areas: [4, 4, 4, 4] });
    await checkSplit("cross k0.2", SQ, cross, 0.2, { pieces: 4, areas: [3.61, 3.61, 3.61, 3.61] });
  });

  it("cutter through vertices (diagonal)", async () => {
    const d = [seg([-1, -1], [5, 5])];
    await checkSplit("diag k0", SQ, d, 0, { pieces: 2, areas: [8, 8] });
    const w = 0.1 * Math.SQRT2 * 2; // band |x - z| <= 0.1*sqrt2 -> each triangle legs 4 - 0.1*sqrt2
    const leg = 4 - w / 2;
    await checkSplit("diag k0.2", SQ, d, 0.2, { pieces: 2, areas: [(leg * leg) / 2, (leg * leg) / 2] });
    // A diagonal that starts and ends exactly at the corners.
    await checkSplit("diag exact k0", SQ, [seg([0, 0], [4, 4])], 0, { pieces: 2, areas: [8, 8] });
  });

  it("cutter along a polygon edge", async () => {
    await checkSplit("edge k0", SQ, [seg([-1, 0], [5, 0])], 0, { pieces: 1, area: 16 });
    await checkSplit("edge k0.2", SQ, [seg([-1, 0], [5, 0])], 0.2, { pieces: 1, area: 15.6 });
    await checkSplit("partial edge k0", SQ, [seg([1, 0], [3, 0])], 0, { pieces: 1, area: 16 });
  });

  it("cutters ending exactly at the boundary", async () => {
    await checkSplit("boundary to boundary k0", SQ, [seg([2, 0], [2, 4])], 0, { pieces: 2, areas: [8, 8] });
    await checkSplit("boundary to boundary k0.2", SQ, [seg([2, 0], [2, 4])], 0.2, { pieces: 2, areas: [7.6, 7.6] });
    await checkSplit("inside to boundary k0", SQ, [seg([2, 2], [2, 4])], 0, { pieces: 1, area: 16 });
    await checkSplit("inside to boundary k0.2", SQ, [seg([2, 2], [2, 4])], 0.2, { pieces: 1, area: 16 - 0.2 * 2.1 });
    // T of two dangling cuts that together cut off a quadrant.
    await checkSplit("T quadrant k0", SQ, [seg([2, -1], [2, 2]), seg([-1, 2], [2, 2])], 0, { pieces: 2, areas: [4, 12] });
    // One polyline with a corner doing the same.
    await checkSplit("L quadrant k0", SQ, [{ pts: [[2, 0], [2, 2], [0, 2]] }], 0, { pieces: 2, areas: [4, 12] });
  });

  it("polygon with a hole, and a closed cutter", async () => {
    const holed: Spec[] = [{ pts: rect(0, 0, 4, 4), tag: "t" }, { pts: rect(1, 1, 3, 3), holeOf: 0, tag: "t" }];
    await checkSplit("holed k0", holed, [seg([2, -1], [2, 5])], 0, { pieces: 2, areas: [6, 6] });
    await checkSplit("holed k0 one side", holed, [seg([0.5, -1], [0.5, 5])], 0, { pieces: 2, areas: [2, 10] });
    const ring: Cutter = { pts: rect(1, 1, 3, 3), closed: true };
  });

  it("a closed cutter, kerf 0: ring piece keeps the hole, inner square is its own piece", async () => {
    const ring: Cutter = { pts: rect(1, 1, 3, 3), closed: true };
    await checkSplit("closed cutter k0", SQ, [ring], 0, { pieces: 2, areas: [4, 12] });
  });

  it("a closed cutter, kerf 0.2", async () => {
    const ring: Cutter = { pts: rect(1, 1, 3, 3), closed: true };
    await checkSplit("closed cutter k0.2", SQ, [ring], 0.2, { pieces: 2, areas: [3.24, 16 - 4.84] });
  });

  it("nested closed cutters and a closed cutter on a hole (kerf 0)", async () => {
    await checkSplit("two rings k0", [{ pts: rect(0, 0, 6, 6) }], [{ pts: rect(1, 1, 5, 5), closed: true }, { pts: rect(2, 2, 4, 4), closed: true }], 0, {
      pieces: 3,
      areas: [36 - 16, 16 - 4, 4],
    });
  });

  it("closed cutter around an existing hole (kerf 0)", async () => {
    const holed: Spec[] = [{ pts: rect(0, 0, 6, 6) }, { pts: rect(2, 2, 4, 4), holeOf: 0 }];
    await checkSplit("ring around hole k0", holed, [{ pts: rect(1, 1, 5, 5), closed: true }], 0, { pieces: 2, areas: [20, 12] });
  });

  it("pieces carry the polygon's attributes; polygons are cut independently", async () => {
    const polys: Spec[] = [
      { pts: rect(0, 0, 4, 4), tag: "a" },
      { pts: rect(2, 0, 6, 4), tag: "b" },
    ];
    const cgeo = build([{ pts: [[3, -1], [3, 5]], open: true }]);
    const geo = await splitRaw(build(polys), cgeo, { kerf: 0 });
    const out = read(geo);
    wellFormed(out);
    const tag = geo.attrs.primitive.require("tag");
    const got = out.map((l, k) => [tag.getString(k), l.area]).sort();
    // Overlapping polygons are NOT merged: each is cut on its own.
    expect(got).toEqual([
      ["a", 12],
      ["a", 4],
      ["b", 12],
      ["b", 4],
    ].sort());
  });

  it("random star polygons, random cutters", async () => {
    const rng = lcg(31);
    for (let trial = 0; trial < 8; trial++) {
      const s = star(rng, 0, 0, 3, 7 + Math.floor(rng() * 8));
      const cs: Cutter[] = [];
      const nc = 1 + Math.floor(rng() * 4);
      for (let c = 0; c < nc; c++) cs.push(seg([rng() * 8 - 4, rng() * 8 - 4], [rng() * 8 - 4, rng() * 8 - 4]));
      for (const kerf of [0, 0.15]) {
        const out = await checkSplit(`star ${trial} kerf ${kerf}`, [{ pts: s }], cs, kerf);
        if (kerf === 0) expect(net(out)).toBeCloseTo(Math.abs(shoelace(s)), 6);
      }
    }
  });
});

describe("hole assignment after the fix (adversarial)", () => {
  const ringCut = (x0: number, z0: number, x1: number, z1: number): Cutter => ({ pts: rect(x0, z0, x1, z1), closed: true });

  it("kerf-0 closed cutters nested three deep", async () => {
    await checkSplit("3 rings", [{ pts: rect(0, 0, 8, 8) }], [ringCut(1, 1, 7, 7), ringCut(2, 2, 6, 6), ringCut(3, 3, 5, 5)], 0, {
      pieces: 4,
      areas: [28, 20, 12, 4],
    });
    // Same, cutters in reverse order and reversed winding.
    await checkSplit("3 rings reversed", [{ pts: rect(0, 0, 8, 8) }], [ringCut(3, 3, 5, 5), ringCut(2, 2, 6, 6), ringCut(1, 1, 7, 7)].map((c) => ({ ...c, pts: [...c.pts].reverse() })), 0, {
      pieces: 4,
      areas: [28, 20, 12, 4],
    });
    // Three deep inside a polygon that already has a hole in the middle.
    await checkSplit("3 rings around a hole", [{ pts: rect(0, 0, 8, 8) }, { pts: rect(3.5, 3.5, 4.5, 4.5), holeOf: 0 }], [ringCut(1, 1, 7, 7), ringCut(2, 2, 6, 6), ringCut(3, 3, 5, 5)], 0, {
      pieces: 4,
      areas: [28, 20, 12, 3],
    });
  });

  it("a kerf-0 closed cutter coinciding with an input hole or the outer", async () => {
    const holed: Spec[] = [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 3, 3), holeOf: 0 }];
    const on = await checkSplit("cutter on hole", holed, [ringCut(1, 1, 3, 3)], 0, { pieces: 1, areas: [12] });
    expect(on.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-4, 0],
    ]);
    await checkSplit("cutter on outer", holed, [ringCut(0, 0, 4, 4)], 0, { pieces: 1, areas: [12] });
    await checkSplit("cutter on hole, kerf 0.2", holed, [ringCut(1, 1, 3, 3)], 0.2, { pieces: 1, areas: [16 - 2.2 * 2.2] });
  });

  it("a closed cutter sharing only part of an edge with a hole", async () => {
    const holed: Spec[] = [{ pts: rect(0, 0, 6, 6) }, { pts: rect(2, 2, 4, 4), holeOf: 0 }];
    // Left edge x=4, z 3..5 overlaps the hole's right edge on z 3..4.
    await checkSplit("partial shared edge", holed, [ringCut(4, 3, 5, 5)], 0, { pieces: 2, areas: [2, 30] });
    // Crossing into the hole: its inside less the hole is one piece.
    await checkSplit("overlapping hole", holed, [ringCut(1, 3, 3, 5)], 0, { pieces: 2, areas: [3, 29] });
    // Sharing a whole edge from outside.
    await checkSplit("full shared edge", holed, [ringCut(4, 2, 5, 4)], 0, { pieces: 2, areas: [2, 30] });
    // Sharing a corner only.
    await checkSplit("shared corner", holed, [ringCut(4, 4, 5, 5)], 0, { pieces: 2, areas: [1, 31] });
  });

  it("kerf-0 cutters through a hole's vertices and along its edges", async () => {
    const holed: Spec[] = [{ pts: rect(0, 0, 6, 6) }, { pts: rect(2, 2, 4, 4), holeOf: 0 }];
    await checkSplit("diagonal through hole corners", holed, [seg([-1, -1], [7, 7])], 0, { pieces: 2, areas: [16, 16] });
    await checkSplit("other diagonal", holed, [seg([-1, 7], [7, -1])], 0, { pieces: 2, areas: [16, 16] });
    await checkSplit("along hole's left edge line", holed, [seg([2, -1], [2, 7])], 0, { pieces: 2, areas: [12, 20] });
    await checkSplit("cross through hole middle", holed, [seg([3, -1], [3, 7]), seg([-1, 3], [7, 3])], 0, { pieces: 4, areas: [8, 8, 8, 8] });
    await checkSplit("cut inside the hole only", holed, [seg([2, 2], [4, 4])], 0, { pieces: 1, areas: [32] });
    await checkSplit("hole corner to outer corner", holed, [seg([0, 0], [2, 2])], 0, { pieces: 1, areas: [32] });
    await checkSplit("two hole corners to outer", holed, [seg([0, 0], [2, 2]), seg([4, 4], [6, 6])], 0, { pieces: 2, areas: [16, 16] });
    await checkSplit("corner cut clear of the hole", holed, [seg([-1, 3], [3, -1])], 0, { pieces: 2, areas: [2, 30] });
    // x + z = 4 touches the hole only at its corner (2, 2).
    await checkSplit("tangent through a hole corner", holed, [seg([-1, 5], [5, -1])], 0, { pieces: 2, areas: [8, 24] });
  });

  it("polygonBoolean: holes and islands sharing edges across in and clip", async () => {
    const ring: Spec[] = [{ pts: rect(0, 0, 4, 4) }, { pts: rect(1, 1, 3, 3), holeOf: 0 }];
    const part = await checkBool("island fills 1/2 of hole", "union", ring, [{ pts: rect(1, 1, 3, 2) }], { exact: true, area: 14 });
    expect(part.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-2, 0],
    ]);
    const holedIsland: Spec[] = [{ pts: rect(1, 1, 3, 3) }, { pts: rect(1.5, 1.5, 2.5, 2.5), holeOf: 0 }];
    const hi = await checkBool("holed island fills hole", "union", ring, holedIsland, { exact: true, area: 15 });
    expect(hi.map((l) => [l.area, l.holeOf])).toEqual([
      [16, -1],
      [-1, 0],
    ]);
    await checkBool("island overhangs", "union", ring, [{ pts: rect(1, 1, 5, 3) }], { exact: true, area: 18 });
    await checkBool("ring inter island", "intersection", ring, [{ pts: rect(1, 1, 3, 3) }], { exact: true, area: 0 });
    await checkBool("ring minus island", "difference", ring, [{ pts: rect(1, 1, 3, 3) }], { exact: true, area: 12 });
    await checkBool("island minus ring", "difference", [{ pts: rect(1, 1, 3, 3) }], ring, { exact: true, area: 4 });
    // Three deep: in = ring 0..8/1..7 with island 2..6/3..5; clip fills the 1..7/2..6 ring exactly.
    const deep: Spec[] = [
      { pts: rect(0, 0, 8, 8) },
      { pts: rect(1, 1, 7, 7), holeOf: 0 },
      { pts: rect(2, 2, 6, 6) },
      { pts: rect(3, 3, 5, 5), holeOf: 2 },
    ];
    const fill: Spec[] = [{ pts: rect(1, 1, 7, 7) }, { pts: rect(2, 2, 6, 6), holeOf: 0 }];
    const d = await checkBool("deep fill", "union", deep, fill, { exact: true, area: 60 });
    expect(d.map((l) => [l.area, l.holeOf])).toEqual([
      [64, -1],
      [-4, 0],
    ]);
    // Clip fills the innermost hole instead: two separate regions remain.
    const d2 = await checkBool("deep fill inner", "union", deep, [{ pts: rect(3, 3, 5, 5) }], { exact: true, area: 64 - 36 + 16 });
    expect(d2.map((l) => [l.area, l.holeOf])).toEqual([
      [64, -1],
      [-36, 0],
      [16, -1],
    ]);
  });
});
