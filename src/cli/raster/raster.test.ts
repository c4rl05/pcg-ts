/**
 * The rasterizer's contracts: the fill rule (a shared edge covers each
 * sample exactly once), depth (nearer wins whatever the draw order), near
 * clipping (a triangle through the eye plane is cut, never flipped), and
 * the orientation of the orthographic views against the SVG's.
 */
import { describe, expect, it } from "vitest";
import { type Camera, Raster, makeCamera } from "./raster.js";
import type { Pose, Vec3 } from "./views.js";

const BG = 0x000000;

/** An orthographic camera looking down -y with up -z: the `top` orientation. */
function topCamera(size: number, half: number): Camera {
  const pose: Pose = {
    name: "top",
    projection: "orthographic",
    position: [0, 10, 0],
    target: [0, 0, 0],
    up: [0, 0, -1],
    near: 0,
    far: 100,
    halfSize: half,
  };
  return makeCamera(pose, size, size, half * 2);
}

function coverage(raster: Raster): Uint8Array {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let i = 0; i < mask.length; i++) mask[i] = Number.isFinite(raster.depth[i]) ? 1 : 0;
  return mask;
}

/**
 * Is (x, z) inside triangle abc by at least `margin` from every edge
 * (either winding)? A negative margin admits points up to that far outside.
 */
function insideBy(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
  x: number,
  z: number,
  margin: number,
): boolean {
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const sign = area < 0 ? -1 : 1;
  const edge = (p: readonly [number, number], q: readonly [number, number]): number => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return (sign * ((q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]))) / len;
  };
  return edge(a, b) > margin && edge(b, c) > margin && edge(c, a) > margin;
}

/** Inside every edge of the quad p0 p1 p2 p3 by `margin` — a subset of the quad even when it is not convex. */
function insideQuadBy(p: readonly (readonly [number, number])[], x: number, z: number, margin: number): boolean {
  const area = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
  const sign = area < 0 ? -1 : 1;
  for (let k = 0; k < 4; k++) {
    const a = p[k];
    const b = p[(k + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!((sign * ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]))) / len > margin)) return false;
  }
  return true;
}

/** Deterministic floats in [lo, hi). */
function lcg(seed: number): (lo: number, hi: number) => number {
  let s = seed >>> 0;
  return (lo, hi) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return lo + ((hi - lo) * s) / 4294967296;
  };
}

describe("Raster triangles: fill rule", () => {
  it("covers every sample of a triangle fan exactly once, with no gaps, at arbitrary subpixel positions", () => {
    const rand = lcg(2024);
    for (let trial = 0; trial < 40; trial++) {
      const size = 64;
      const cam = topCamera(size, 1);
      // A fan of 7 triangles around an off-grid centre, on the y = 0 plane.
      const cx = rand(-0.2, 0.2);
      const cz = rand(-0.2, 0.2);
      // Seven directions in angular order (each step under 180°), radii
      // jittered: a star-shaped ring whose fan triangles cannot overlap.
      const dirs: readonly (readonly [number, number])[] = [
        [1, 0], [0.62, 0.78], [-0.22, 0.97], [-0.9, 0.43], [-0.9, -0.43], [-0.22, -0.97], [0.62, -0.78],
      ];
      const ring: [number, number][] = dirs.map(([dx, dz]) => {
        const r = 0.6 + rand(0, 0.3);
        return [cx + dx * r, cz + dz * r];
      });
      const total = new Uint8Array(size * size);
      for (let k = 0; k < 7; k++) {
        const a = ring[k];
        const b = ring[(k + 1) % 7];
        const raster = new Raster(size, size, BG);
        // Alternate the winding: both must follow the same rule.
        if (k % 2 === 0) raster.triangle(cam, cx, 0, cz, a[0], 0, a[1], b[0], 0, b[1], 255, 0, 0);
        else raster.triangle(cam, cx, 0, cz, b[0], 0, b[1], a[0], 0, a[1], 255, 0, 0);
        const mask = coverage(raster);
        for (let i = 0; i < mask.length; i++) total[i] += mask[i];
      }
      let covered = 0;
      for (let i = 0; i < total.length; i++) {
        expect(total[i]).toBeLessThanOrEqual(1);
        covered += total[i];
      }
      // The centre sample of the image lies inside the fan and must be hit.
      expect(covered).toBeGreaterThan(100);
      const middle = (size >> 1) * size + (size >> 1);
      expect(total[middle]).toBe(1);
    }
  });

  it("two triangles sharing a diagonal cover a quad with no double hits and no holes", () => {
    const rand = lcg(77);
    for (let trial = 0; trial < 60; trial++) {
      const size = 48;
      const cam = topCamera(size, 1);
      const p: [number, number][] = [
        [rand(-0.95, -0.3), rand(-0.95, -0.3)],
        [rand(0.3, 0.95), rand(-0.95, -0.3)],
        [rand(0.3, 0.95), rand(0.3, 0.95)],
        [rand(-0.95, -0.3), rand(0.3, 0.95)],
      ];
      const one = new Raster(size, size, BG);
      one.triangle(cam, p[0][0], 0, p[0][1], p[1][0], 0, p[1][1], p[2][0], 0, p[2][1], 255, 0, 0);
      const two = new Raster(size, size, BG);
      two.triangle(cam, p[0][0], 0, p[0][1], p[2][0], 0, p[2][1], p[3][0], 0, p[3][1], 0, 255, 0);
      const a = coverage(one);
      const b = coverage(two);
      let both = 0;
      for (let i = 0; i < a.length; i++) both += a[i] & b[i];
      expect(both).toBe(0);
      // No hole: every sample whose centre is inside either triangle by
      // more than the 1/16-sample snapping — the shared diagonal included —
      // was covered by one of them.
      const margin = (2 / size) * 0.25;
      let inside = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const wx = ((x + 0.5) / size) * 2 - 1;
          const wz = ((y + 0.5) / size) * 2 - 1;
          const inA = insideBy(p[0], p[1], p[2], wx, wz, margin);
          const inB = insideBy(p[0], p[2], p[3], wx, wz, margin);
          // Inside all four OUTER edges: the samples along the diagonal.
          const inQuad = insideQuadBy(p, wx, wz, margin);
          if (inA || inB || inQuad) {
            inside++;
            expect(a[y * size + x] | b[y * size + x]).toBe(1);
          }
        }
      }
      expect(inside).toBeGreaterThan(200);
    }
  });

  it("draws both windings, identically", () => {
    const cam = topCamera(32, 1);
    const cw = new Raster(32, 32, BG);
    cw.triangle(cam, -0.8, 0, -0.7, 0.9, 0, -0.2, -0.1, 0, 0.8, 10, 20, 30);
    const ccw = new Raster(32, 32, BG);
    ccw.triangle(cam, -0.8, 0, -0.7, -0.1, 0, 0.8, 0.9, 0, -0.2, 10, 20, 30);
    expect(Buffer.from(ccw.color).equals(Buffer.from(cw.color))).toBe(true);
    expect(coverage(cw).reduce((n, v) => n + v, 0)).toBeGreaterThan(100);
  });
});

describe("Raster depth", () => {
  it("lets the nearer surface win regardless of draw order", () => {
    const cam = topCamera(32, 1);
    const near: Vec3[] = [[-0.9, 1, -0.9], [0.9, 1, -0.9], [0, 1, 0.9]];
    const far: Vec3[] = [[-0.9, 0, 0.9], [0.9, 0, 0.9], [0, 0, -0.9]];
    const draw = (order: "near-first" | "far-first"): Raster => {
      const r = new Raster(32, 32, BG);
      const tri = (t: Vec3[], rgb: [number, number, number]): void =>
        r.triangle(cam, ...t[0], ...t[1], ...t[2], ...rgb);
      if (order === "near-first") {
        tri(near, [255, 0, 0]);
        tri(far, [0, 0, 255]);
      } else {
        tri(far, [0, 0, 255]);
        tri(near, [255, 0, 0]);
      }
      return r;
    };
    const a = draw("near-first");
    const b = draw("far-first");
    expect(Buffer.from(a.color).equals(Buffer.from(b.color))).toBe(true);
    // The centre is under both; red (y = 1, nearer the camera at y = 10) wins.
    const centre = (16 * 32 + 16) * 3;
    expect([...a.color.subarray(centre, centre + 3)]).toEqual([255, 0, 0]);
    // And blue shows where only the far triangle is: near the bottom middle.
    const low = (29 * 32 + 16) * 3;
    expect([...a.color.subarray(low, low + 3)]).toEqual([0, 0, 255]);
  });

  it("interpolates perspective depth through 1/w: a slanted plane's depth matches the ray hit", () => {
    const pose: Pose = {
      name: "hero",
      projection: "perspective",
      position: [0, 2, 0],
      target: [0, 0, -4],
      up: [0, 1, 0],
      near: 0.05,
      far: 100,
    };
    const size = 64;
    const cam = makeCamera(pose, size, size, 10);
    const r = new Raster(size, size, BG);
    // A large ground plane y = 0.
    r.triangle(cam, -50, 0, 1, 50, 0, 1, 0, 0, -80, 200, 200, 200);
    let checked = 0;
    for (let y = size >> 1; y < size; y += 5) {
      const x = size >> 1;
      const z = r.depth[y * size + x];
      if (!Number.isFinite(z)) continue;
      // The ray through a point `dy` samples below this sample's centre, in
      // view space: at depth 1 it is eye + forward + up * vy, and it meets
      // y = 0 at depth -eyeY / (forward.y + up.y * vy). Vertices are snapped
      // to 1/16 sample, so the drawn plane may sit that far from the true
      // one: the depth must lie between the hits a sixteenth either side.
      const hit = (dy: number): number => {
        const ndcY = 0.5 - (y + 0.5 + dy) / size;
        const vy = (ndcY * 2) / cam.scaleY;
        return -pose.position[1] / (cam.forward[1] + cam.up[1] * vy);
      };
      const lo = Math.min(hit(-1 / 16), hit(1 / 16));
      const hi = Math.max(hit(-1 / 16), hit(1 / 16));
      expect(z).toBeGreaterThanOrEqual(lo);
      expect(z).toBeLessThanOrEqual(hi);
      // And not merely inside a wide band: within a thousandth of the centre ray.
      expect(Math.abs(z - hit(0)) / hit(0)).toBeLessThan(1e-3);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

describe("Raster near clipping", () => {
  it("cuts a triangle that crosses the eye plane instead of flipping its far vertex across the image", () => {
    const pose: Pose = {
      name: "ground",
      projection: "perspective",
      position: [0, 0, 0],
      target: [0, 0, -1],
      up: [0, 1, 0],
      near: 0.1,
      far: 100,
    };
    const size = 64;
    const cam = makeCamera(pose, size, size, 10);
    const r = new Raster(size, size, BG);
    // Every point of this triangle is below the eye (y = -1): two vertices
    // in front, one BEHIND the camera. Unclipped, the one behind projects
    // with a negative depth, flips to above the horizon, and smears the
    // triangle over the top half of the frame.
    r.triangle(cam, -3, -1, -6, 3, -1, -6, 0, -1, 3, 255, 255, 255);
    const mask = coverage(r);
    let top = 0;
    let bottom = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mask[y * size + x] === 0) continue;
        if (y < size >> 1) top++;
        else bottom++;
        expect(r.depth[y * size + x]).toBeGreaterThanOrEqual(0.1 * (1 - 1e-9));
      }
    }
    expect(top).toBe(0);
    expect(bottom).toBeGreaterThan(200);
  });

  it("never draws a sample nearer than the near plane, even on the view axis", () => {
    // The guard band alone already rejects everything behind the eye, so
    // this is the case only the near plane catches: a face passing a hair
    // under the eye, whose samples straight ahead are closer than `near`.
    const pose: Pose = {
      name: "ground",
      projection: "perspective",
      position: [0, 0, 0],
      target: [0, 0, -1],
      up: [0, 1, 0],
      near: 0.1,
      far: 100,
    };
    const size = 64;
    const cam = makeCamera(pose, size, size, 10);
    const r = new Raster(size, size, BG);
    r.triangle(cam, -1, -0.001, 1, 1, -0.001, 1, 0, -0.001, -5, 255, 255, 255);
    let drawn = 0;
    for (let i = 0; i < r.depth.length; i++) {
      if (!Number.isFinite(r.depth[i])) continue;
      drawn++;
      expect(r.depth[i]).toBeGreaterThanOrEqual(0.1 * (1 - 1e-9));
    }
    expect(drawn).toBeGreaterThan(0);
  });

  it("draws nothing for a triangle entirely behind the eye, and clips a segment the same way", () => {
    const pose: Pose = {
      name: "ground",
      projection: "perspective",
      position: [0, 0, 0],
      target: [0, 0, -1],
      up: [0, 1, 0],
      near: 0.1,
      far: 100,
    };
    const cam = makeCamera(pose, 32, 32, 10);
    const behind = new Raster(32, 32, BG);
    behind.triangle(cam, -1, -1, 2, 1, -1, 2, 0, 1, 3, 255, 255, 255);
    expect(coverage(behind).every((v) => v === 0)).toBe(true);
    const line = new Raster(32, 32, BG);
    line.line(cam, 0, -1, -6, 0, -1, 3, 255, 255, 255);
    const mask = coverage(line);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) expect(mask[y * 32 + x]).toBe(0);
    expect(mask.reduce((n, v) => n + v, 0)).toBeGreaterThan(4);
  });
});

describe("Raster marks", () => {
  it("draws an instance marker as a plus sign and a point as a square, so they read as different things", () => {
    const cam = topCamera(64, 1);
    const cross = new Raster(64, 64, BG);
    cross.cross(cam, 0, 0, 0, 5, 255, 255, 255);
    const square = new Raster(64, 64, BG);
    square.point(cam, 0, 0, 0, 2, 255, 255, 255);
    const c = coverage(cross);
    const s = coverage(square);
    const at = (mask: Uint8Array, x: number, y: number): number => mask[y * 64 + x];
    // The plus: arms reach 5 samples out along both axes, the diagonal is empty.
    expect(at(c, 32 + 5, 32)).toBe(1);
    expect(at(c, 32, 32 - 5)).toBe(1);
    expect(at(c, 32 - 5, 32)).toBe(1);
    expect(at(c, 32 + 3, 32 + 3)).toBe(0);
    expect(at(c, 32 - 3, 32 - 3)).toBe(0);
    // The square: filled corner to corner, and no arms.
    expect(s.reduce((n, v) => n + v, 0)).toBe(16);
    expect(at(s, 32 + 5, 32)).toBe(0);
    expect(c.reduce((n, v) => n + v, 0)).toBeGreaterThan(20);
  });
});

describe("Raster downsample", () => {
  it("box-filters 2x2 with integer rounding", () => {
    const r = new Raster(4, 2, 0x000000);
    r.color.set([255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0);
    r.color.set([255, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], 12);
    const out = r.downsample();
    expect(out.length).toBe(2 * 1 * 3);
    // (255 + 0 + 255 + 1 + 2) >> 2 = 128
    expect(out[0]).toBe(128);
  });
});
