/**
 * Shared by the ground's suites (tests/eiffelGround*.test.ts): the tower
 * cooked with and without `ground.ts`, a mesh's surface sampled as points,
 * and the point-in-convex-prism test the clash checks use.
 */
import { type DataCollection, type Geometry, Graph, cook, firstGeometry } from "pcg-ts";
import { buildFirstFloor } from "../../demos/eiffel/firstFloor.js";
import type { Prism } from "../../demos/eiffel/ground.js";
import { quadrants } from "../../demos/eiffel/lattice.js";
import { buildLegs } from "../../demos/eiffel/legs.js";
import { buildLifts } from "../../demos/eiffel/lifts.js";
import { type Detail, PART_CLASSES, type PartClass, assemble, joinParts } from "../../demos/eiffel/parts.js";
import { buildPlatforms } from "../../demos/eiffel/platforms.js";
import { buildShaft } from "../../demos/eiffel/shaft.js";
import { buildSummit } from "../../demos/eiffel/summit.js";

export type Vec3 = readonly [number, number, number];

/** The tower as `buildEiffel` builds it, less the ground module: what the ground must not clash with. */
export async function cookWithoutGround(detail: Detail = {}): Promise<Partial<Record<PartClass, Geometry>>> {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  assemble(
    g,
    joinParts(
      buildLegs(g, quads, detail),
      buildShaft(g, detail),
      buildFirstFloor(g, quads, detail),
      buildSummit(g, detail),
      buildPlatforms(g, quads),
      buildLifts(g, quads, detail),
    ),
  );
  const { outputs } = await cook(g);
  const out: Partial<Record<PartClass, Geometry>> = {};
  for (const cls of PART_CLASSES) {
    const geo = firstGeometry((outputs[cls] ?? []) as DataCollection);
    if (geo !== undefined) out[cls] = geo;
  }
  return out;
}

/** A geometry's points. */
export function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P.data[i]!, P.data[i + 1]!, P.data[i + 2]!]);
  return out;
}

/** An axis-aligned box, [min, max]. */
export type Box = readonly [Vec3, Vec3];

/**
 * A mesh's surface as points, inside `box`: every vertex, points every
 * `step` along every polygon edge, and every polygon's fan triangles'
 * centroids and edge midpoints, so a long member that passes through a
 * thin slab with no vertex inside it is still caught.
 */
export function surfaceSamples(geo: Geometry, box: Box, step = 0.05): Vec3[] {
  const pts = points(geo);
  const [lo, hi] = box;
  const inBox = (p: Vec3) => p[0] >= lo[0] && p[1] >= lo[1] && p[2] >= lo[2] && p[0] <= hi[0] && p[1] <= hi[1] && p[2] <= hi[2];
  const out: Vec3[] = pts.filter(inBox);
  const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // An edge's part inside the box, as its parameter range (slab clipping).
  const clip = (a: Vec3, b: Vec3): [number, number] | undefined => {
    let t0 = 0;
    let t1 = 1;
    for (let k = 0; k < 3; k++) {
      const d = b[k]! - a[k]!;
      if (Math.abs(d) < 1e-12) {
        if (a[k]! < lo[k]! || a[k]! > hi[k]!) return undefined;
        continue;
      }
      let u0 = (lo[k]! - a[k]!) / d;
      let u1 = (hi[k]! - a[k]!) / d;
      if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0);
      t1 = Math.min(t1, u1);
      if (t0 > t1) return undefined;
    }
    return [t0, t1];
  };
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const count = geo.primVertexCount[p]!;
    const ring: Vec3[] = [];
    for (let v = start; v < start + count; v++) ring.push(pts[geo.vertexToPoint[v]!]!);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const r = clip(a, b);
      if (r !== undefined) {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * (r[1] - r[0]);
        const n = Math.max(1, Math.ceil(len / step));
        for (let k = 0; k <= n; k++) out.push(lerp(a, b, r[0] + ((r[1] - r[0]) * k) / n));
      }
      if (i >= 1 && i + 1 < ring.length) {
        const c = ring[i + 1]!;
        for (const q of [lerp(ring[0]!, lerp(b, c, 0.5), 2 / 3), lerp(b, c, 0.5), lerp(ring[0]!, b, 0.5), lerp(ring[0]!, c, 0.5)]) {
          if (inBox(q)) out.push(q);
        }
      }
    }
  }
  return out;
}

/**
 * A prism's surface as points: both caps' corners, points every `step`
 * along every edge of both caps and of its sides, and each cap's centre.
 */
export function prismSamples(p: Prism, step = 0.05): Vec3[] {
  const o = p.outline;
  const nn = [0, 0, 0];
  for (let i = 0; i < o.length; i++) {
    const [x0, y0, z0] = o[i]!;
    const [x1, y1, z1] = o[(i + 1) % o.length]!;
    nn[0] += (y0 - y1) * (z0 + z1);
    nn[1] += (z0 - z1) * (x0 + x1);
    nn[2] += (x0 - x1) * (y0 + y1);
  }
  const L = Math.hypot(nn[0]!, nn[1]!, nn[2]!);
  const d: Vec3 = [(nn[0]! / L) * p.depth, (nn[1]! / L) * p.depth, (nn[2]! / L) * p.depth];
  const top = o.map((q): Vec3 => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]);
  const out: Vec3[] = [];
  const seg = (a: Vec3, b: Vec3) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
    for (let k = 0; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
  };
  for (let i = 0; i < o.length; i++) {
    seg(o[i]!, o[(i + 1) % o.length]!);
    seg(top[i]!, top[(i + 1) % o.length]!);
    seg(o[i]!, top[i]!);
  }
  const mean = (r: readonly Vec3[]): Vec3 => [0, 1, 2].map((k) => r.reduce((a, q) => a + q[k]!, 0) / r.length) as unknown as Vec3;
  out.push(mean(o), mean(top));
  return out;
}

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A convex prism as half-spaces: inside when every `d(p)` is at least `margin`. */
export interface Solid {
  readonly planes: ReadonlyArray<{ n: Vec3; c: number }>;
  readonly min: Vec3;
  readonly max: Vec3;
}

/** The half-spaces of a `Prism` (outline extruded `depth` along its Newell normal). */
export function solidOf(p: Prism): Solid {
  const o = p.outline;
  const nn = [0, 0, 0];
  for (let i = 0; i < o.length; i++) {
    const [x0, y0, z0] = o[i]!;
    const [x1, y1, z1] = o[(i + 1) % o.length]!;
    nn[0] += (y0 - y1) * (z0 + z1);
    nn[1] += (z0 - z1) * (x0 + x1);
    nn[2] += (x0 - x1) * (y0 + y1);
  }
  const L = Math.hypot(nn[0]!, nn[1]!, nn[2]!);
  const n: Vec3 = [nn[0]! / L, nn[1]! / L, nn[2]! / L];
  const planes: Array<{ n: Vec3; c: number }> = [
    { n, c: -dot(n, o[0]!) },
    { n: [-n[0], -n[1], -n[2]], c: dot(n, o[0]!) + p.depth },
  ];
  for (let i = 0; i < o.length; i++) {
    const a = o[i]!;
    const b = o[(i + 1) % o.length]!;
    // Counter-clockwise about n: the inward side of edge a->b is n × (b - a).
    const inward = cross(n, sub(b, a));
    const l = Math.hypot(...inward);
    if (l < 1e-9) continue;
    const m: Vec3 = [inward[0] / l, inward[1] / l, inward[2] / l];
    planes.push({ n: m, c: -dot(m, a) });
  }
  const all = [...o, ...o.map((q): Vec3 => [q[0] + n[0] * p.depth, q[1] + n[1] * p.depth, q[2] + n[2] * p.depth])];
  const min: Vec3 = [0, 1, 2].map((k) => Math.min(...all.map((q) => q[k]!))) as unknown as Vec3;
  const max: Vec3 = [0, 1, 2].map((k) => Math.max(...all.map((q) => q[k]!))) as unknown as Vec3;
  return { planes, min, max };
}

/** How deep `p` is inside `s` (the least distance to its faces); negative outside. */
export function depthIn(s: Solid, p: Vec3): number {
  if (p[0] < s.min[0] || p[1] < s.min[1] || p[2] < s.min[2] || p[0] > s.max[0] || p[1] > s.max[1] || p[2] > s.max[2]) return -1;
  let d = Infinity;
  for (const { n, c } of s.planes) d = Math.min(d, dot(n, p) + c);
  return d;
}

/**
 * Every sample of `samples` more than `margin` inside any of `solids`,
 * with the solid's index: the clash census.
 */
export function inside(solids: readonly Solid[], samples: readonly Vec3[], margin: number): Array<{ at: Vec3; solid: number; depth: number }> {
  const out: Array<{ at: Vec3; solid: number; depth: number }> = [];
  for (const p of samples) {
    for (let i = 0; i < solids.length; i++) {
      const d = depthIn(solids[i]!, p);
      if (d > margin) {
        out.push({ at: p, solid: i, depth: d });
        break;
      }
    }
  }
  return out;
}
