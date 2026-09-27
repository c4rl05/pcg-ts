/**
 * The lantern platform's railing posts bear on the cupola AS BUILT.
 *
 * Under the platform each of the ten posts is cranked out and down onto
 * the cupola (PL-XV Fig. 1; `summit.ts`, `lantern()`), and that foot is
 * what carries it. The cupola is a sphere drawn as flat facets
 * (`cupolaSides` round, the profile's rings up), which stand up to
 * ~13 mm inside the true sphere; a foot seated on the SPHERE therefore
 * either pokes through the skin (where a facet is deep) or floats over it
 * (where a ridge between facets stands proud). Seated per post on the
 * facets it actually meets, every foot has to:
 *
 * - go no more than 1 mm into the cupola's mesh, anywhere on its surface
 *   (so no corner shows inside the lantern, where the ladders rise), and
 * - come within 1 mm of it (so it bears, and does not hang in the air).
 *
 * The depth is read off the cooked mesh alone: the cupola is convex, so a
 * point is inside it by the least of its distances inside the planes of
 * its faces, and outside by its distance to the nearest face. The
 * measure is first shown to say "inside" and "outside" on the cupola's own
 * vertices pushed in and out, so a measure that cannot find anything
 * cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildSummit, lanternLevels } from "../demos/eiffel/summit.js";

type Vec3 = readonly [number, number, number];
type Tri = readonly [Vec3, Vec3, Vec3];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P[i]!, P[i + 1]!, P[i + 2]!]);
  return out;
}

function triangles(geo: Geometry): Tri[] {
  const pts = points(geo);
  const out: Tri[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    const at = (k: number) => pts[geo.vertexToPoint[start + k]!]!;
    for (let k = 1; k + 1 < n; k++) out.push([at(0), at(k), at(k + 1)]);
  }
  return out;
}

/** Closest point on a triangle (Ericson, Real-Time Collision Detection 5.1.5). */
function closest(p: Vec3, [a, b, c]: Tri): Vec3 {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)));
  const cp = sub(p, c);
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return add(a, add(mul(ab, vb * den), mul(ac, vc * den)));
}

/** A face of the cupola: its triangle and its plane, the normal outward. */
interface Face {
  readonly tri: Tri;
  readonly n: Vec3;
  readonly d: number;
}

function facesOf(tris: readonly Tri[]): Face[] {
  const out: Face[] = [];
  for (const tri of tris) {
    let n = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]));
    const l = len(n);
    if (l < 1e-12) continue;
    n = mul(n, 1 / l);
    // Every wall of the cupola faces away from the axis (its radius never
    // grows going up), so outward is away from it.
    const c = mul(add(add(tri[0], tri[1]), tri[2]), 1 / 3);
    if (n[0] * c[0] + n[2] * c[2] < 0) n = mul(n, -1);
    out.push({ tri, n, d: dot(n, tri[0]) });
  }
  return out;
}

/**
 * How far `p` lies inside the (convex) mesh `faces`: positive inside, by
 * the least distance inside a face's plane; negative outside, by the
 * distance to the nearest face. `faces` need only be those near `p`.
 */
function depth(p: Vec3, faces: readonly Face[]): number {
  let inside = Infinity;
  for (const f of faces) inside = Math.min(inside, f.d - dot(f.n, p));
  if (inside >= 0) return inside;
  let gap = Infinity;
  for (const f of faces) gap = Math.min(gap, len(sub(p, closest(p, f.tri))));
  return -gap;
}

/** The plane-only bound of {@link depth}: exact inside, never below the true depth outside. */
function planeDepth(p: Vec3, faces: readonly Face[]): number {
  let inside = Infinity;
  for (const f of faces) inside = Math.min(inside, f.d - dot(f.n, p));
  return inside;
}

/** Points over a triangle, no two neighbours more than `step` apart along its edges. */
function* samples([a, b, c]: Tri, step: number): Generator<Vec3> {
  const m = Math.max(1, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, b)), len(sub(a, c))) / step));
  for (let i = 0; i <= m; i++) {
    for (let j = 0; i + j <= m; j++) {
      yield add(a, add(mul(sub(b, a), i / m), mul(sub(c, a), j / m)));
    }
  }
}

interface Foot {
  readonly azimuth: number;
  readonly tris: Tri[];
}

let cupola: Face[] = [];
let feet: Foot[] = [];

beforeAll(async () => {
  const g = new Graph(1889);
  buildSummit(g);
  for (const id of ["cupolaSkin", "topRailPostSkin", "topBentSkin"]) g.output({ id } as NodeHandle, "out", id);
  const { outputs } = await cook(g);
  const geo = (id: string) => {
    const out = firstGeometry(outputs[id] ?? []);
    if (out === undefined) throw new Error(`${id} produced no geometry`);
    return out;
  };
  cupola = facesOf(triangles(geo("cupolaSkin")));
  // The posts' feet: the triangles of the cranked bars, which alone reach
  // down within 0.1 of the posts' lowest point (the plumb posts stop at
  // the platform's 0.275, 0.117 over the feet's ends).
  const posts = [...triangles(geo("topRailPostSkin")), ...triangles(geo("topBentSkin"))];
  const lowest = Math.min(...posts.flatMap((t) => t.map((p) => p[1])));
  const byPost = new Map<number, Tri[]>();
  for (const t of posts) {
    if (Math.min(t[0][1], t[1][1], t[2][1]) > lowest + 0.1) continue;
    const c = mul(add(add(t[0], t[1]), t[2]), 1 / 3);
    const az = Math.round((Math.atan2(c[2], c[0]) * 180) / Math.PI / 36) * 36;
    const key = ((az % 360) + 360) % 360;
    if (!byPost.has(key)) byPost.set(key, []);
    byPost.get(key)!.push(t);
  }
  feet = [...byPost].sort((a, b) => a[0] - b[0]).map(([azimuth, tris]) => ({ azimuth, tris }));
}, 600_000);

/** The faces of the cupola within `r` of any vertex of `tris`. */
function near(tris: readonly Tri[], r: number): Face[] {
  const pts = tris.flatMap((t) => [...t]);
  return cupola.filter((f) => f.tri.some((q) => pts.some((p) => len(sub(p, q)) < r)));
}

/** A foot's deepest point into the cupola (positive) or, if none is inside, its least gap (negative). */
function deepest(foot: Foot): { depth: number; at: Vec3 } {
  const faces = near(foot.tris, 0.5);
  let best = { depth: -Infinity, at: [0, 0, 0] as Vec3 };
  const close: Vec3[] = [];
  for (const t of foot.tris) {
    for (const p of samples(t, 0.0005)) {
      const d = planeDepth(p, faces);
      if (d >= 0 && d > best.depth) best = { depth: d, at: p };
      if (d < 0 && d > -0.005) close.push(p);
    }
  }
  if (best.depth >= 0) return best;
  // Nothing inside: the plane bound overstates a gap, so measure the
  // closest candidates exactly.
  for (const p of close) {
    const d = depth(p, faces);
    if (d > best.depth) best = { depth: d, at: p };
  }
  return best;
}

describe("the lantern platform's posts bear on the cupola as built", () => {
  it("measures inside and outside on the cupola's own vertices (control)", () => {
    const lv = lanternLevels();
    // A vertex of the cupola's upper rings, pushed toward and away from
    // the sphere's centre.
    const v = cupola.map((f) => f.tri[0]).find((p) => p[1] > lv.springing + 0.5 && p[1] < lv.crown - 0.2)!;
    expect(v).toBeDefined();
    const toward = sub([0, lv.springing, 0], v);
    const u = mul(toward, 1 / len(toward));
    const faces = cupola.filter((f) => f.tri.some((q) => len(sub(q, v)) < 0.8));
    expect(depth(add(v, mul(u, 0.005)), faces)).toBeGreaterThan(0.002);
    expect(depth(add(v, mul(u, -0.005)), faces)).toBeLessThan(-0.004);
    expect(Math.abs(depth(v, faces))).toBeLessThan(1e-5);
  });

  it("finds ten feet", () => {
    expect(feet.map((f) => f.azimuth)).toEqual([0, 36, 72, 108, 144, 180, 216, 252, 288, 324]);
    for (const f of feet) expect(f.tris.length).toBeGreaterThanOrEqual(10);
  });

  it("goes no more than 1 mm into the cupola's skin and comes within 1 mm of it, post by post", () => {
    const rows = feet.map((f) => ({ azimuth: f.azimuth, ...deepest(f) }));
    const report = rows.map((r) => `${r.azimuth}: ${(r.depth * 1000).toFixed(2)} mm`).join(", ");
    for (const r of rows) {
      expect(r.depth, `into the cupola (+) / off it (-), by post: ${report}`).toBeLessThanOrEqual(0.001);
      expect(r.depth, `into the cupola (+) / off it (-), by post: ${report}`).toBeGreaterThanOrEqual(-0.001);
    }
  });
});
