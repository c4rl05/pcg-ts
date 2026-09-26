/**
 * The tricolour on the rod (SOURCES.md §29.4): the graph builds it flat and
 * the page flies it.
 *
 * THE GRAPH'S HALF (`buildFlag`) is a flat grid in the rod's plane, its
 * hoist edge on the endless cord's outer run and its head under the
 * « poulie de manœuvre » (`flagHoist` in summit.ts, which also builds the
 * pulley, the cord and the clips as part of the summit), of the size
 * `FLAG_SIZE` switches between the plate's and the text's. It goes out as
 * `cloth.flag`, not merged into a class and not jittered: the page moves
 * every one of its points every frame, so a millimetre of jitter would
 * only be overwritten. Its `uv` is the page's handle on it: u from 0 at
 * the hoist to 1 at the fly, v from 0 at the foot to 1 at the head.
 *
 * THE PAGE'S HALF (`flagPose`) is the cloth, and it is ANALYTIC: a pure
 * function of time and a seed, not a simulation stepped frame by frame.
 * That is what makes a frame at a given time reproducible — `?still`
 * shows t = 0, and the capture probe's `setClock(t)` lands on exactly the
 * pose any other run shows at t, with no history to replay. Each row of
 * the grid, hoist to fly, is laid out by its HEADING: the direction of
 * each of its segments, integrated from the hoist, so every horizontal
 * edge keeps its rest length exactly and the cloth cannot stretch along
 * the fly. The heading is the wind's direction plus a travelling wave
 * whose amplitude grows from the hoist to the fly, the rows a little out
 * of phase with one another so the folds run slant; the pitch droops the
 * fly as the wind drops. The wind is three seeded gusts, and the wave's
 * phase is their closed-form integral, so it speeds up in a gust without
 * any state.
 *
 * Nothing here imports three: the tests run it as the page does.
 */
import type { Graph } from "pcg-ts";
import { component, div, meshPrimitive, position, setAttribute, sub, vec } from "pcg-ts";
import type { Parts } from "./parts.js";
import { FLAG_SIZE, type FlagSize, flagHoist } from "./summit.js";

/** The cloth's grid: quads along the fly (u) and along the hoist (v). */
export const FLAG_GRID = { nu: 24, nv: 12 } as const;

/** Grid points, u fastest: (nu + 1) x (nv + 1). */
export const FLAG_POINTS = (FLAG_GRID.nu + 1) * (FLAG_GRID.nv + 1);

/**
 * The three bands, hoist to fly, as sRGB: bleu, blanc, rouge, in equal
 * thirds (the 1794 flag; the 30:33:37 split was the navy's ensign only)
 * [colours estimated: dyed bunting, not the modern screen blue].
 */
export const FLAG_BANDS = [0x2b3f8c, 0xf2eee4, 0xc8313a] as const;

/** The seed the wind is drawn from; the tower's own year, as the graph's is. */
export const FLAG_SEED = 1889;

/** The cloth as the graph builds it, flat, and its `uv` (see the file comment). */
export function buildFlag(g: Graph, size: FlagSize = FLAG_SIZE): Parts {
  const h = flagHoist(size);
  const plane = g.add(
    meshPrimitive,
    {
      shape: "plane",
      orientation: "xy",
      size: [h.fly, h.hoist, 0],
      center: [h.x - h.fly / 2, h.foot + h.hoist / 2, 0],
      subdivisions: [FLAG_GRID.nu, FLAG_GRID.nv, 1],
    },
    "flagCloth",
  );
  const uv = g.add(
    setAttribute,
    {
      name: "uv",
      type: "f32",
      tupleSize: 2,
      value: vec(div(sub(h.x, component(position(), 0)), h.fly), div(sub(component(position(), 1), h.foot), h.hoist)),
    },
    "flagClothUv",
  );
  g.connect(plane, "out", uv, "in");
  return { cloth: [{ name: "flag", mesh: uv }] };
}

/** A float in [0, 1) from the seed and a slot; integer mixing only, no `Math.random`. */
function hash01(seed: number, k: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** The wind's three gusts: strength weights, periods (s) and the ranges they are drawn from. */
const GUSTS = [
  { weight: 0.12, period: [23, 31] },
  { weight: 0.1, period: [9, 13] },
  { weight: 0.06, period: [3.5, 5] },
] as const;
/** The mean strength, 0 calm to 1 the flag flat out; the gusts swing it 0.42-0.98. */
const MEAN = 0.7;
/** The flutter's frequency, Hz: `base` in a calm, `base + perGust` at full strength. */
const FLUTTER = { base: 0.8, perGust: 0.9 } as const;

export interface FlagWind {
  /** Strength, 0 to 1. */
  strength: number;
  /** The wind's swing off the mean direction, radians about +y. */
  yaw: number;
  /** The travelling wave's phase, radians: the closed-form integral of its frequency. */
  phase: number;
}

/**
 * The wind at `t` seconds: pure in (t, seed). Written into `out` when one
 * is given, so a caller running every frame allocates nothing.
 */
export function flagWind(
  t: number,
  seed: number = FLAG_SEED,
  out: FlagWind = { strength: 0, yaw: 0, phase: 0 },
): FlagWind {
  let strength = MEAN;
  // The integral of the strength from 0 to t, for the phase.
  let integral = MEAN * t;
  for (let i = 0; i < GUSTS.length; i++) {
    const G = GUSTS[i] as (typeof GUSTS)[number];
    const period = G.period[0] + (G.period[1] - G.period[0]) * hash01(seed, 2 * i);
    const phi = 2 * Math.PI * hash01(seed, 2 * i + 1);
    const w = (2 * Math.PI) / period;
    strength += G.weight * Math.sin(w * t + phi);
    integral += (G.weight / w) * (Math.cos(phi) - Math.cos(w * t + phi));
  }
  const yawPeriod = 40 + 20 * hash01(seed, 10);
  const yawPhi = 2 * Math.PI * hash01(seed, 11);
  const yaw =
    0.12 * Math.sin((2 * Math.PI * t) / yawPeriod + yawPhi) + 0.05 * Math.sin((2 * Math.PI * t) / 7.3 + 1.7 * yawPhi);
  out.strength = strength;
  out.yaw = yaw;
  out.phase = 2 * Math.PI * (FLUTTER.base * t + FLUTTER.perGust * integral);
  return out;
}

/** `flagPose`'s scratch: the wind, and the hoist of the last size asked for. */
const WIND: FlagWind = { strength: 0, yaw: 0, phase: 0 };
let hoistOf: { size: FlagSize; h: ReturnType<typeof flagHoist> } | undefined;

/** The wave: its length as a fraction of the fly, and how far the rows' phases slant, radians a metre up. */
const WAVE = { length: 0.35, slant: 0.25 } as const;

/**
 * The cloth's grid at `t` seconds, u fastest, three floats a point, into
 * `out` (length `3 * FLAG_POINTS`). Pure in (t, size, seed); allocates
 * nothing. Row by row from its hoist point, each segment's direction is
 *
 *   d = (-cos β cos θ, sin β, cos β sin θ)
 *
 * — toward -x at rest — with the heading θ = yaw + A e(s) sin(k s - phase +
 * slant y) and the pitch β = -droop s / fly, A and the droop growing as the
 * wind drops and e(s) = 0.3 + 0.7 (s / fly)^1.2 growing it toward the fly;
 * the hoist column itself never moves.
 */
export function flagPose(
  t: number,
  out: Float32Array,
  size: FlagSize = FLAG_SIZE,
  seed: number = FLAG_SEED,
): Float32Array {
  if (hoistOf?.size !== size) hoistOf = { size, h: flagHoist(size) };
  const h = hoistOf.h;
  const { nu, nv } = FLAG_GRID;
  const wind = flagWind(t, seed, WIND);
  const calm = 1 - wind.strength;
  const amp = 0.3 + 0.4 * calm;
  const droop = 0.04 + 0.5 * calm * Math.sqrt(Math.max(calm, 0));
  const k = (2 * Math.PI) / (WAVE.length * h.fly);
  const ds = h.fly / nu;
  for (let j = 0; j <= nv; j++) {
    const up = (j / nv) * h.hoist;
    let x = h.x;
    let y = h.foot + up;
    let z = 0;
    let o = 3 * j * (nu + 1);
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = z;
    for (let i = 0; i < nu; i++) {
      const s = (i + 0.5) * ds;
      const f = s / h.fly;
      const theta = wind.yaw + amp * (0.3 + 0.7 * Math.pow(f, 1.2)) * Math.sin(k * s - wind.phase + WAVE.slant * up);
      const beta = -droop * f;
      const cb = Math.cos(beta);
      x -= ds * cb * Math.cos(theta);
      y += ds * Math.sin(beta);
      z += ds * cb * Math.sin(theta);
      o += 3;
      out[o] = x;
      out[o + 1] = y;
      out[o + 2] = z;
    }
  }
  return out;
}

/**
 * Per-point normals of a pose from `flagPose`, into `out`: the cross of the
 * grid's v and u differences (one-sided at the edges), so the rest pose
 * faces +z, the flat grid's own normal. Allocates nothing.
 */
export function flagNormals(pose: Float32Array, out: Float32Array): Float32Array {
  const { nu, nv } = FLAG_GRID;
  const row = nu + 1;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const a = 3 * (j * row + Math.max(i - 1, 0));
      const b = 3 * (j * row + Math.min(i + 1, nu));
      const c = 3 * (Math.max(j - 1, 0) * row + i);
      const d = 3 * (Math.min(j + 1, nv) * row + i);
      const ux = (pose[b] as number) - (pose[a] as number);
      const uy = (pose[b + 1] as number) - (pose[a + 1] as number);
      const uz = (pose[b + 2] as number) - (pose[a + 2] as number);
      const vx = (pose[d] as number) - (pose[c] as number);
      const vy = (pose[d + 1] as number) - (pose[c + 1] as number);
      const vz = (pose[d + 2] as number) - (pose[c + 2] as number);
      // v x u: +z at rest, where u runs -x and v +y.
      const nx = vy * uz - vz * uy;
      const ny = vz * ux - vx * uz;
      const nz = vx * uy - vy * ux;
      const l = Math.hypot(nx, ny, nz) || 1;
      const o = 3 * (j * row + i);
      out[o] = nx / l;
      out[o + 1] = ny / l;
      out[o + 2] = nz / l;
    }
  }
  return out;
}
