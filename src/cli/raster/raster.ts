/**
 * A small software rasterizer: the PNG frames' pixels, with no browser and
 * no dependency.
 *
 * What it draws is deliberately little — flat triangles, lines and square
 * point splats with a depth buffer, linear fog and a ground grid — because
 * the frames answer PLACEMENT and shape, not the look. The look is the
 * host's and `npm run preview`'s.
 *
 * Every byte is a promise across platforms, so the arithmetic is `+ − × ÷`
 * and `Math.sqrt`, which IEEE 754 requires to round correctly, plus the
 * exact operations `floor`, `ceil`, `round`, `trunc`, `abs`, `min`, `max`
 * and `fround`. A test scans this file for any other `Math.` member.
 *
 * - Resolution: 2× supersampled RGB with a `Float64Array` depth buffer,
 *   downsampled by an integer 2×2 box filter.
 * - Triangles: edge functions over vertices snapped to 1/16 pixel, so every
 *   edge test is an exact integer in a double; a top-left fill rule makes
 *   two triangles that share an edge cover each pixel exactly once. Both
 *   windings draw (every face is two-sided).
 * - Depth: view-axis distance, interpolated linearly for orthographic
 *   views and through 1/w for perspective ones; nearer wins.
 * - Clipping: in view space against the near plane and a guard band three
 *   image-widths wide, so nothing behind the eye is ever flipped through
 *   it and no snapped coordinate grows past exact integer range. An
 *   intersection is always computed from the same endpoint of an edge,
 *   whichever triangle asks, so neighbours clip to identical vertices.
 */
import { FOCAL, type Pose, type Vec3 } from "./views.js";

/** How far past the image, in NDC units, geometry is kept before clipping. */
const GUARD = 3;
/** Subpixel precision of the snapped triangle vertices: 1/16 pixel. */
const SUB = 16;
const HALF_SUB = SUB / 2;
/** Most vertices a triangle can have after clipping against five planes. */
const MAX_CLIP = 8;

/** A camera ready to project, for one raster size. */
export interface Camera {
  readonly perspective: boolean;
  readonly eye: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly forward: Vec3;
  /** View x to NDC: FOCAL/aspect for perspective (per unit depth), 1/halfWidth for orthographic. */
  readonly scaleX: number;
  /** View y to NDC. */
  readonly scaleY: number;
  readonly near: number;
  /** Fog range along the view axis; `fogFar <= fogNear` disables it. */
  readonly fogNear: number;
  readonly fogFar: number;
  /** Supersampled raster size the camera projects onto. */
  readonly width: number;
  readonly height: number;
  /**
   * Depth slack given to lines and points, so a road lying on its terrain
   * is not buried in it: a fraction of depth in perspective, world units in
   * orthographic views.
   */
  readonly bias: number;
}

function sub3(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

/**
 * A camera for a pose on a raster of `width × height` samples. The basis is
 * a lookAt: forward toward the target, right = forward × up, and the true
 * up = right × forward — so `top` with up -z has x to the right and z down.
 */
export function makeCamera(pose: Pose, width: number, height: number, extent: number): Camera {
  const forward = normalize(sub3(pose.target, pose.position));
  let right = normalize(cross(forward, pose.up));
  if (right[0] === 0 && right[1] === 0 && right[2] === 0) right = [1, 0, 0];
  const up = cross(right, forward);
  const aspect = width / height;
  const perspective = pose.projection === "perspective";
  let scaleX: number;
  let scaleY: number;
  if (perspective) {
    scaleX = FOCAL / aspect;
    scaleY = FOCAL;
  } else {
    // `halfSize` covers half the SHORTER side; the longer one sees more.
    const half = pose.halfSize ?? extent / 2;
    const halfW = aspect >= 1 ? half * aspect : half;
    const halfH = aspect >= 1 ? half : half / aspect;
    scaleX = 1 / halfW;
    scaleY = 1 / halfH;
  }
  return {
    perspective,
    eye: pose.position,
    right,
    up,
    forward,
    scaleX,
    scaleY,
    near: perspective ? pose.near : 0,
    fogNear: pose.fog?.[0] ?? 0,
    fogFar: pose.fog?.[1] ?? 0,
    width,
    height,
    bias: perspective ? 0.004 : extent * 0.002,
  };
}

/** Packed `0xRRGGBB` as its three channels. */
export function channels(rgb: number): [number, number, number] {
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
}

/** A supersampled framebuffer and the primitives that draw into it. */
export class Raster {
  readonly width: number;
  readonly height: number;
  /** RGB, row-major from the top-left, 3 bytes per sample. */
  readonly color: Uint8Array;
  /** View-axis depth per sample; +Infinity where nothing drew. */
  readonly depth: Float64Array;
  private readonly bg: readonly [number, number, number];
  // Scratch for clipping: view-space polygons, 3 numbers per vertex.
  private readonly polyA = new Float64Array(MAX_CLIP * 3);
  private readonly polyB = new Float64Array(MAX_CLIP * 3);
  // Scratch for the snapped screen polygon a clipped triangle fans from.
  private readonly projX = new Float64Array(MAX_CLIP);
  private readonly projY = new Float64Array(MAX_CLIP);
  private readonly projZ = new Float64Array(MAX_CLIP);

  constructor(width: number, height: number, background: number) {
    this.width = width;
    this.height = height;
    this.color = new Uint8Array(width * height * 3);
    this.depth = new Float64Array(width * height).fill(Number.POSITIVE_INFINITY);
    this.bg = channels(background);
    const [r, g, b] = this.bg;
    for (let i = 0; i < width * height; i++) {
      this.color[i * 3] = r;
      this.color[i * 3 + 1] = g;
      this.color[i * 3 + 2] = b;
    }
  }

  /** Write one sample, fogged by its depth. The caller has done the depth test. */
  private write(cam: Camera, idx: number, z: number, r: number, g: number, b: number): void {
    this.depth[idx] = z;
    let f = 0;
    if (cam.fogFar > cam.fogNear) {
      f = (z - cam.fogNear) / (cam.fogFar - cam.fogNear);
      f = f < 0 ? 0 : f > 1 ? 1 : f;
    }
    const k = 1 - f;
    const o = idx * 3;
    this.color[o] = clampByte(r * k + this.bg[0] * f);
    this.color[o + 1] = clampByte(g * k + this.bg[1] * f);
    this.color[o + 2] = clampByte(b * k + this.bg[2] * f);
  }

  /** Clip a view-space polygon in `polyA` (n vertices) against one plane; result in `polyA`. */
  private clipPlane(n: number, cam: Camera, plane: number): number {
    const src = this.polyA;
    const dst = this.polyB;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ai = i * 3;
      const bj = j * 3;
      const da = planeDistance(cam, plane, src[ai], src[ai + 1], src[ai + 2]);
      const db = planeDistance(cam, plane, src[bj], src[bj + 1], src[bj + 2]);
      if (da >= 0) {
        dst[m * 3] = src[ai];
        dst[m * 3 + 1] = src[ai + 1];
        dst[m * 3 + 2] = src[ai + 2];
        m++;
      }
      if (da >= 0 !== db >= 0) {
        // Always from the lexicographically smaller endpoint, so the
        // neighbour that walks this edge the other way computes the same
        // vertex bit for bit.
        const swap = lexLess(src, bj, ai);
        const p = swap ? bj : ai;
        const q = swap ? ai : bj;
        const dp = swap ? db : da;
        const dq = swap ? da : db;
        const t = dp / (dp - dq);
        dst[m * 3] = src[p] + (src[q] - src[p]) * t;
        dst[m * 3 + 1] = src[p + 1] + (src[q + 1] - src[p + 1]) * t;
        dst[m * 3 + 2] = src[p + 2] + (src[q + 2] - src[p + 2]) * t;
        m++;
      }
    }
    src.set(dst.subarray(0, m * 3));
    return m;
  }

  /** View-space coordinates of a world point, into `out` at `o`. */
  private toView(cam: Camera, x: number, y: number, z: number, out: Float64Array, o: number): void {
    const dx = x - cam.eye[0];
    const dy = y - cam.eye[1];
    const dz = z - cam.eye[2];
    out[o] = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
    out[o + 1] = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
    out[o + 2] = dx * cam.forward[0] + dy * cam.forward[1] + dz * cam.forward[2];
  }

  /**
   * One flat triangle in world space, both windings. `r`, `g`, `b` are
   * already lit, in 0..255.
   */
  triangle(
    cam: Camera,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    r: number, g: number, b: number,
  ): void {
    const poly = this.polyA;
    this.toView(cam, ax, ay, az, poly, 0);
    this.toView(cam, bx, by, bz, poly, 3);
    this.toView(cam, cx, cy, cz, poly, 6);
    let n = 3;
    // Skip the clipper entirely for the common case of a triangle well
    // inside every plane.
    for (let plane = cam.perspective ? 0 : 1; plane < 5; plane++) {
      let inside = 0;
      for (let i = 0; i < n; i++) {
        if (planeDistance(cam, plane, poly[i * 3], poly[i * 3 + 1], poly[i * 3 + 2]) >= 0) inside++;
      }
      if (inside === 0) return;
      if (inside < n) n = this.clipPlane(n, cam, plane);
      if (n < 3) return;
    }
    // Project every vertex once, then fan.
    const fx = this.projX;
    const fy = this.projY;
    const fz = this.projZ;
    for (let i = 0; i < n; i++) {
      const vx = poly[i * 3];
      const vy = poly[i * 3 + 1];
      const vz = poly[i * 3 + 2];
      const w = cam.perspective ? vz : 1;
      fx[i] = Math.round(((vx * cam.scaleX) / w * 0.5 + 0.5) * this.width * SUB);
      fy[i] = Math.round((0.5 - (vy * cam.scaleY) / w * 0.5) * this.height * SUB);
      // Perspective interpolates 1/z, which is linear in screen space.
      fz[i] = cam.perspective ? 1 / vz : vz;
    }
    for (let i = 1; i + 1 < n; i++) {
      this.fill(cam, fx[0], fy[0], fz[0], fx[i], fy[i], fz[i], fx[i + 1], fy[i + 1], fz[i + 1], r, g, b);
    }
  }

  /** Scan one snapped screen triangle. */
  private fill(
    cam: Camera,
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    r: number, g: number, b: number,
  ): void {
    let area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (area === 0) return;
    if (area < 0) {
      // Two-sided: rewind so the edge functions are positive inside.
      let t = x1; x1 = x2; x2 = t;
      t = y1; y1 = y2; y2 = t;
      t = z1; z1 = z2; z2 = t;
      area = -area;
    }
    const W = this.width;
    const H = this.height;
    const minX = Math.max(0, Math.ceil((Math.min(x0, x1, x2) - HALF_SUB) / SUB));
    const maxX = Math.min(W - 1, Math.floor((Math.max(x0, x1, x2) - HALF_SUB) / SUB));
    const minY = Math.max(0, Math.ceil((Math.min(y0, y1, y2) - HALF_SUB) / SUB));
    const maxY = Math.min(H - 1, Math.floor((Math.max(y0, y1, y2) - HALF_SUB) / SUB));
    if (minX > maxX || minY > maxY) return;

    // Edge i is the one opposite vertex i. Top-left rule (y down, this
    // winding): an edge owns the samples exactly on it when it is a top
    // edge (horizontal, running +x) or a left edge (running -y).
    const bias0 = topLeft(x1, y1, x2, y2) ? 0 : -1;
    const bias1 = topLeft(x2, y2, x0, y0) ? 0 : -1;
    const bias2 = topLeft(x0, y0, x1, y1) ? 0 : -1;
    // d(E)/d(px) = -(by - ay); d(E)/d(py) = (bx - ax); one sample = SUB.
    const a0 = -(y2 - y1) * SUB;
    const b0 = (x2 - x1) * SUB;
    const a1 = -(y0 - y2) * SUB;
    const b1 = (x0 - x2) * SUB;
    const a2 = -(y1 - y0) * SUB;
    const b2 = (x1 - x0) * SUB;
    const px = minX * SUB + HALF_SUB;
    const py = minY * SUB + HALF_SUB;
    let row0 = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    let row1 = (x0 - x2) * (py - y2) - (y0 - y2) * (px - x2);
    let row2 = (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);
    const perspective = cam.perspective;
    const depth = this.depth;
    for (let y = minY; y <= maxY; y++) {
      let w0 = row0;
      let w1 = row1;
      let w2 = row2;
      let idx = y * W + minX;
      for (let x = minX; x <= maxX; x++, idx++) {
        if (w0 + bias0 >= 0 && w1 + bias1 >= 0 && w2 + bias2 >= 0) {
          const z = perspective
            ? area / (w0 * z0 + w1 * z1 + w2 * z2)
            : (w0 * z0 + w1 * z1 + w2 * z2) / area;
          if (z < depth[idx]) this.write(cam, idx, z, r, g, b);
        }
        w0 += a0;
        w1 += a1;
        w2 += a2;
      }
      row0 += b0;
      row1 += b1;
      row2 += b2;
    }
  }

  /**
   * A world-space segment, two samples thick, depth-tested with the
   * camera's bias — or with none when `biased` is false, for a line that
   * must lose to any surface it touches.
   */
  line(
    cam: Camera,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    r: number, g: number, b: number,
    biased = true,
  ): void {
    const poly = this.polyA;
    this.toView(cam, ax, ay, az, poly, 0);
    this.toView(cam, bx, by, bz, poly, 3);
    for (let plane = cam.perspective ? 0 : 1; plane < 5; plane++) {
      const da = planeDistance(cam, plane, poly[0], poly[1], poly[2]);
      const db = planeDistance(cam, plane, poly[3], poly[4], poly[5]);
      if (da < 0 && db < 0) return;
      if (da >= 0 && db >= 0) continue;
      const swap = lexLess(poly, 3, 0);
      const p = swap ? 3 : 0;
      const q = swap ? 0 : 3;
      const dp = swap ? db : da;
      const dq = swap ? da : db;
      const t = dp / (dp - dq);
      const ix = poly[p] + (poly[q] - poly[p]) * t;
      const iy = poly[p + 1] + (poly[q + 1] - poly[p + 1]) * t;
      const iz = poly[p + 2] + (poly[q + 2] - poly[p + 2]) * t;
      const out = da < 0 ? 0 : 3;
      poly[out] = ix;
      poly[out + 1] = iy;
      poly[out + 2] = iz;
    }
    const W = this.width;
    const H = this.height;
    const project = (o: number): [number, number, number] => {
      const w = cam.perspective ? poly[o + 2] : 1;
      return [
        ((poly[o] * cam.scaleX) / w * 0.5 + 0.5) * W,
        (0.5 - (poly[o + 1] * cam.scaleY) / w * 0.5) * H,
        cam.perspective ? 1 / poly[o + 2] : poly[o + 2],
      ];
    };
    const [sx0, sy0, sz0] = project(0);
    const [sx1, sy1, sz1] = project(3);
    const dx = sx1 - sx0;
    const dy = sy1 - sy0;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const s = sz0 + (sz1 - sz0) * t;
      const z = cam.perspective ? 1 / s : s;
      this.splat(cam, sx0 + dx * t, sy0 + dy * t, z, 1, r, g, b, biased);
    }
  }

  /** A world-space point as a square `2·half` samples wide. */
  point(cam: Camera, x: number, y: number, z: number, half: number, r: number, g: number, b: number): void {
    const v = this.polyA;
    this.toView(cam, x, y, z, v, 0);
    if (cam.perspective && v[2] < cam.near) return;
    const w = cam.perspective ? v[2] : 1;
    const sx = ((v[0] * cam.scaleX) / w * 0.5 + 0.5) * this.width;
    const sy = (0.5 - (v[1] * cam.scaleY) / w * 0.5) * this.height;
    if (!(sx > -half && sx < this.width + half && sy > -half && sy < this.height + half)) return;
    this.splat(cam, sx, sy, v[2], half, r, g, b);
  }

  /** A depth-tested square of samples centred on (sx, sy). */
  private splat(
    cam: Camera,
    sx: number, sy: number, z: number,
    half: number,
    r: number, g: number, b: number,
    biased = true,
  ): void {
    const x0 = Math.floor(sx - half + 0.5);
    const y0 = Math.floor(sy - half + 0.5);
    const zt = !biased ? z : cam.perspective ? z - z * cam.bias : z - cam.bias;
    for (let y = y0; y < y0 + 2 * half; y++) {
      if (y < 0 || y >= this.height) continue;
      for (let x = x0; x < x0 + 2 * half; x++) {
        if (x < 0 || x >= this.width) continue;
        const idx = y * this.width + x;
        if (zt < this.depth[idx]) this.write(cam, idx, z, r, g, b);
      }
    }
  }

  /** The 2×2 box-filtered image: `width/2 × height/2` RGB bytes. */
  downsample(): Uint8Array {
    const w = this.width >> 1;
    const h = this.height >> 1;
    const out = new Uint8Array(w * h * 3);
    const src = this.color;
    const W = this.width;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = ((2 * y) * W + 2 * x) * 3;
        const b = a + 3;
        const c = a + W * 3;
        const d = c + 3;
        const o = (y * w + x) * 3;
        for (let k = 0; k < 3; k++) {
          out[o + k] = (src[a + k] + src[b + k] + src[c + k] + src[d + k] + 2) >> 2;
        }
      }
    }
    return out;
  }
}

function clampByte(v: number): number {
  const r = Math.round(v);
  return r < 0 ? 0 : r > 255 ? 255 : r;
}

/**
 * Signed distance-like value of a view-space point against clip plane
 * `plane`: 0 near (perspective only), 1..4 the guard band left, right,
 * bottom, top. Inside is >= 0.
 */
function planeDistance(cam: Camera, plane: number, vx: number, vy: number, vz: number): number {
  const w = cam.perspective ? vz : 1;
  switch (plane) {
    case 0:
      return vz - cam.near;
    case 1:
      return vx * cam.scaleX + GUARD * w;
    case 2:
      return GUARD * w - vx * cam.scaleX;
    case 3:
      return vy * cam.scaleY + GUARD * w;
    default:
      return GUARD * w - vy * cam.scaleY;
  }
}

/** Is the vertex at `i` lexicographically before the one at `j` (x, then y, then z)? */
function lexLess(buf: Float64Array, i: number, j: number): boolean {
  if (buf[i] !== buf[j]) return buf[i] < buf[j];
  if (buf[i + 1] !== buf[j + 1]) return buf[i + 1] < buf[j + 1];
  return buf[i + 2] < buf[j + 2];
}

/** Top-left rule for an edge a→b of a triangle wound so edge functions are positive inside. */
function topLeft(ax: number, ay: number, bx: number, by: number): boolean {
  const dy = by - ay;
  return dy < 0 || (dy === 0 && bx > ax);
}
