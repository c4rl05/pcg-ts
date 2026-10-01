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
 * THE PAGE'S HALF (`flagPose`) is the cloth, and it is SIMULATED: wool
 * bunting of a measured weight, its hoist column held on the cord, flown
 * by an advected, gusting wind. It is a small-step XPBD solver (Macklin et
 * al., "Small Steps in Physics Simulation", 2019): position Verlet, one
 * Gauss-Seidel sweep of distance constraints a substep — stretch, shear
 * and a second-neighbour bend — and many substeps. The air acts on each
 * quad of the grid as it is posed: a pressure along its normal that goes
 * as the square of the relative wind's normal component, a skin drag
 * along it, and the lateral pressure of the wake the fly sheds, a wave
 * travelling down the fly at the flutter's rate. Folds, whip at the fly,
 * the cloth lifting in a gust and sagging in a lull are what that does,
 * not what anything here draws.
 *
 * AND IT IS STILL PURE IN TIME. The state at a time is DEFINED as the run
 * from rest at `-WARM` seconds in fixed steps of `1 / 60` s, so a frame at
 * t is the same bytes however the page got there: `?still` shows t = 0
 * (the flag already six seconds into its flight), and the capture probe's
 * `setClock(t)` lands on exactly the pose any other run shows at t. Time
 * between two steps is the linear mix of their poses. Running forward is
 * one step a frame; going back, or a jump, replays from the last
 * checkpoint the run passed (one every five seconds), so a seek costs the
 * distance from that checkpoint, never from the start, once a run has
 * been there.
 *
 * Nothing here imports three: the tests run it as the page does.
 */
import type { Graph } from "pcg-ts";
import { component, div, meshPrimitive, position, setAttribute, sub, vec } from "pcg-ts";
import type { Parts } from "./parts.js";
import { FLAG_SIZE, type FlagSize, flagHoist } from "./summit.js";

/**
 * The cloth's grid: quads along the fly (u) and along the hoist (v). Square
 * quads of 12.5 cm on the plate's flag: fine enough that a fold is a fold
 * and not a crease between two quads.
 */
export const FLAG_GRID = { nu: 44, nv: 24 } as const;

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
/**
 * Strength to the wind's mean speed, m/s: 7.2 to 12.8 over the gusts'
 * swing, a fresh to strong breeze, which is what 300 m up has on a
 * moderate day at the ground [estimated]. The floor is also what keeps the
 * text's 7.5 m flag's fly over the lower sheave in the deepest lull: at
 * 2 m/s less it sank 0.17 m under that bound (`eiffelFlag.test.ts`).
 */
const SPEED = { base: 3, perStrength: 10 } as const;
/** The flutter's frequency, Hz: `base` in a calm, `base + perGust` at full strength. */
const FLUTTER = { base: 0.8, perGust: 0.9 } as const;

export interface FlagWind {
  /** Strength, 0 to 1. */
  strength: number;
  /** The mean speed, m/s. */
  speed: number;
  /** The wind's swing off the mean direction, radians about +y. */
  yaw: number;
  /** The flutter's phase, radians: the closed-form integral of its frequency. */
  phase: number;
  /** How far the air has travelled since t = 0, m: the integral of the speed, which advects the turbulence. */
  travel: number;
}

/**
 * The wind at `t` seconds: pure in (t, seed). Written into `out` when one
 * is given, so a caller running every frame allocates nothing.
 */
export function flagWind(
  t: number,
  seed: number = FLAG_SEED,
  out: FlagWind = { strength: 0, speed: 0, yaw: 0, phase: 0, travel: 0 },
): FlagWind {
  let strength = MEAN;
  // The integral of the strength from 0 to t, for the phase and the travel.
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
  out.speed = SPEED.base + SPEED.perStrength * strength;
  out.yaw = yaw;
  out.phase = 2 * Math.PI * (FLUTTER.base * t + FLUTTER.perGust * integral);
  out.travel = SPEED.base * t + SPEED.perStrength * integral;
  return out;
}

// ------------------------------------------------------------------ //
// The cloth.
// ------------------------------------------------------------------ //

/**
 * The solver's clock: the state is kept at whole steps of `step` seconds,
 * each `substeps` substeps; the run starts from rest at `-warm` s, so that
 * t = 0 is already a flag in flight; a checkpoint every `checkEvery` steps,
 * the last `checksKept` of them kept.
 */
const CLOCK = { step: 1 / 60, substeps: 10, warm: 6, checkEvery: 300, checksKept: 160 } as const;

/**
 * The cloth and the air. Wool bunting at 0.22 kg/m² [estimated: 1880s
 * worsted bunting, 150-250 g/m²]; air at 1.2 kg/m³. `normal` and `skin`
 * are the pressure and drag coefficients on a quad; `wake` the lateral
 * pressure the fly sheds, as a fraction of the dynamic pressure, growing
 * as `fly^wakeGrowth` from the hoist, in a wave `wakeLength` of the fly
 * long that slants `wakeSlant` radians a metre up; `turbulence` the gusts'
 * small-scale part as a fraction of the mean speed, at most (the smaller
 * eddies carry less of it); `damping` the
 * cloth's own loss a substep. The three compliances are XPBD's, m/N.
 */
const CLOTH = {
  areal: 0.22,
  air: 1.2,
  gravity: 9.81,
  normal: 1.1,
  skin: 0.05,
  wake: 0.16,
  wakeGrowth: 1.5,
  wakeLength: 0.75,
  wakeSlant: 0.35,
  turbulence: 0.16,
  damping: 0.0004,
  stretch: 0,
  shear: 2e-5,
  bend: 6e-4,
  /** Extra stretch-only sweeps after the full one, a substep: the hem never visibly gives. */
  stretchSweeps: 1,
} as const;

/** The turbulence: this many advected modes, wavelengths in this range, m, and their slow drift, Hz. */
const EDDIES = { modes: 6, wavelength: [1.6, 11], drift: [0.04, 0.3] } as const;

/** Add (fx, fy, fz) to the point at float offset `o` of `F`. */
function add(F: Float64Array, o: number, fx: number, fy: number, fz: number): void {
  F[o] = (F[o] as number) + fx;
  F[o + 1] = (F[o + 1] as number) + fy;
  F[o + 2] = (F[o + 2] as number) + fz;
}

/** The air's speed relative to a point, one component: its wind less its velocity over the substep. */
function rel(air: Float64Array, x: Float64Array, xp: Float64Array, k: number, inv: number): number {
  return (air[k] as number) - ((x[k] as number) - (xp[k] as number)) * inv;
}

/** A grid point's index, u fastest. */
const at = (i: number, j: number): number => j * (FLAG_GRID.nu + 1) + i;

/**
 * One flag's solver: its size and seed fixed, its state the run from rest
 * at `-CLOCK.warm` (see the file comment). Everything is allocated once.
 */
class FlagCloth {
  private readonly h: ReturnType<typeof flagHoist>;
  /** Positions and the substep before, float64: the run's whole state. */
  private readonly x = new Float64Array(3 * FLAG_POINTS);
  private readonly xp = new Float64Array(3 * FLAG_POINTS);
  /** Positions at the step before the current one, for the mix between steps. */
  private readonly last = new Float64Array(3 * FLAG_POINTS);
  private readonly rest = new Float64Array(3 * FLAG_POINTS);
  private readonly invMass = new Float64Array(FLAG_POINTS);
  private readonly force = new Float64Array(3 * FLAG_POINTS);
  /** The wind at each point for the current step, m/s. */
  private readonly air = new Float64Array(3 * FLAG_POINTS);
  /** Distance constraints, in the order they are swept: bend, shear, then stretch. */
  private readonly ca: Int32Array;
  private readonly cb: Int32Array;
  private readonly cRest: Float64Array;
  private readonly cAlpha: Float64Array;
  /** Where the stretch constraints begin in the lists above. */
  private readonly stretchFrom: number;
  /** Each quad's wake: its growth and the cos and sin of its place in the wave. */
  private readonly wakeGain: Float64Array;
  private readonly wakeCos: Float64Array;
  private readonly wakeSin: Float64Array;
  /** The eddies, drawn from the seed: wave vector (along, up, across), amplitude vector, drift and phase. */
  private readonly eddy: Float64Array;
  private readonly wind: FlagWind = { strength: 0, speed: 0, yaw: 0, phase: 0, travel: 0 };
  /** The step `x` is at. */
  private stepAt = 0;
  private readonly checks = new Map<number, Float64Array>();

  constructor(
    size: FlagSize,
    private readonly seed: number,
  ) {
    const { nu, nv } = FLAG_GRID;
    const h = flagHoist(size);
    this.h = h;
    const ds = h.fly / nu;
    const dv = h.hoist / nv;
    // At rest: the flat grid the graph builds, flown toward -x.
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const o = 3 * at(i, j);
        this.rest[o] = i === 0 ? h.x : h.x - (i / nu) * h.fly;
        this.rest[o + 1] = h.foot + (j / nv) * h.hoist;
        this.rest[o + 2] = 0;
      }
    }
    // Each quad gives a quarter of its mass to each corner; the hoist is held.
    const quarter = (CLOTH.areal * ds * dv) / 4;
    const mass = new Float64Array(FLAG_POINTS);
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        for (const p of [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)]) mass[p] = (mass[p] as number) + quarter;
      }
    }
    for (let p = 0; p < FLAG_POINTS; p++) this.invMass[p] = p % (nu + 1) === 0 ? 0 : 1 / (mass[p] as number);

    const pairs: Array<readonly [number, number, number]> = [];
    const bend = CLOTH.bend;
    for (let j = 0; j <= nv; j++) for (let i = 0; i + 2 <= nu; i++) pairs.push([at(i, j), at(i + 2, j), bend]);
    for (let j = 0; j + 2 <= nv; j++) for (let i = 0; i <= nu; i++) pairs.push([at(i, j), at(i, j + 2), bend]);
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        pairs.push([at(i, j), at(i + 1, j + 1), CLOTH.shear]);
        pairs.push([at(i + 1, j), at(i, j + 1), CLOTH.shear]);
      }
    }
    const stretchFrom = pairs.length;
    // Stretch from the hoist out, so a sweep carries the hold down the fly.
    for (let i = 0; i < nu; i++) for (let j = 0; j <= nv; j++) pairs.push([at(i, j), at(i + 1, j), CLOTH.stretch]);
    for (let i = 0; i <= nu; i++) for (let j = 0; j < nv; j++) pairs.push([at(i, j), at(i, j + 1), CLOTH.stretch]);
    this.stretchFrom = stretchFrom;
    this.ca = new Int32Array(pairs.length);
    this.cb = new Int32Array(pairs.length);
    this.cRest = new Float64Array(pairs.length);
    this.cAlpha = new Float64Array(pairs.length);
    const sub = CLOCK.step / CLOCK.substeps;
    pairs.forEach(([a, b, alpha], c) => {
      this.ca[c] = a;
      this.cb[c] = b;
      const dx = (this.rest[3 * b] as number) - (this.rest[3 * a] as number);
      const dy = (this.rest[3 * b + 1] as number) - (this.rest[3 * a + 1] as number);
      this.cRest[c] = Math.sqrt(dx * dx + dy * dy);
      this.cAlpha[c] = alpha / (sub * sub);
    });

    const quads = nu * nv;
    this.wakeGain = new Float64Array(quads);
    this.wakeCos = new Float64Array(quads);
    this.wakeSin = new Float64Array(quads);
    const k = (2 * Math.PI) / (CLOTH.wakeLength * h.fly);
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const s = (i + 0.5) * ds;
        const up = (j + 0.5) * dv;
        const q = j * nu + i;
        const kappa = k * s - CLOTH.wakeSlant * up;
        this.wakeGain[q] = Math.pow(s / h.fly, CLOTH.wakeGrowth);
        this.wakeCos[q] = Math.cos(kappa);
        this.wakeSin[q] = Math.sin(kappa);
      }
    }

    // The eddies: amplitudes such that the sum's RMS is at most `turbulence`.
    const M = EDDIES.modes;
    this.eddy = new Float64Array(8 * M);
    const unit = (k0: number, out: Float64Array, o: number, flatten: number) => {
      const z = 2 * hash01(seed, k0) - 1;
      const a = 2 * Math.PI * hash01(seed, k0 + 1);
      const r = Math.sqrt(1 - z * z);
      // (along, up, across); `flatten` squeezes the vertical, as eddies near a surface are.
      const ux = r * Math.cos(a);
      const uy = z * flatten;
      const uz = r * Math.sin(a);
      const l = Math.sqrt(ux * ux + uy * uy + uz * uz);
      out[o] = ux / l;
      out[o + 1] = uy / l;
      out[o + 2] = uz / l;
    };
    for (let m = 0; m < M; m++) {
      const base = 100 + 10 * m;
      const lam = EDDIES.wavelength[0] * Math.pow(EDDIES.wavelength[1] / EDDIES.wavelength[0], hash01(seed, base));
      const e = this.eddy;
      unit(base + 1, e, 8 * m, 0.6);
      const kk = (2 * Math.PI) / lam;
      e[8 * m] = (e[8 * m] as number) * kk;
      e[8 * m + 1] = (e[8 * m + 1] as number) * kk;
      e[8 * m + 2] = (e[8 * m + 2] as number) * kk;
      unit(base + 3, e, 8 * m + 3, 0.5);
      // Bigger eddies carry more of the energy: amplitude as lambda^(1/3).
      const amp = Math.cbrt(lam / EDDIES.wavelength[1]) * Math.sqrt(2 / M);
      e[8 * m + 3] = (e[8 * m + 3] as number) * amp;
      e[8 * m + 4] = (e[8 * m + 4] as number) * amp;
      e[8 * m + 5] = (e[8 * m + 5] as number) * amp;
      e[8 * m + 6] = 2 * Math.PI * (EDDIES.drift[0] + (EDDIES.drift[1] - EDDIES.drift[0]) * hash01(seed, base + 5));
      e[8 * m + 7] = 2 * Math.PI * hash01(seed, base + 6);
    }
    this.reset();
  }

  /** Back to rest at step 0. */
  private reset(): void {
    this.x.set(this.rest);
    this.xp.set(this.rest);
    this.last.set(this.rest);
    this.stepAt = 0;
  }

  /** The pose at `t` seconds into `out`, float32. */
  pose(t: number, out: Float32Array): Float32Array {
    if (!Number.isFinite(t)) throw new RangeError(`flagPose: t must be a finite number of seconds, got ${t}`);
    const u = Math.max((t + CLOCK.warm) / CLOCK.step, 0);
    const n = Math.floor(u);
    const f = u - n;
    this.reach(n + 1);
    const x = this.x;
    const last = this.last;
    for (let k = 0; k < 3 * FLAG_POINTS; k++) {
      const a = last[k] as number;
      out[k] = a + ((x[k] as number) - a) * f;
    }
    return out;
  }

  /** Bring the state to step `target` (at least 1), with `last` the step before. */
  private reach(target: number): void {
    if (this.stepAt === target) return;
    // From the latest checkpoint at or before target - 1 that is ahead of
    // where the state is, or behind it when the state is past the target.
    const every = CLOCK.checkEvery;
    let from = Math.floor((target - 1) / every) * every;
    while (from > 0 && !this.checks.has(from)) from -= every;
    if (this.stepAt > target || from > this.stepAt) {
      const saved = from > 0 ? this.checks.get(from) : undefined;
      if (saved === undefined) this.reset();
      else {
        this.x.set(saved.subarray(0, 3 * FLAG_POINTS));
        this.xp.set(saved.subarray(3 * FLAG_POINTS));
        this.stepAt = from;
      }
    }
    while (this.stepAt < target) this.advance();
  }

  /** One whole step: the wind at its start, then the substeps. */
  private advance(): void {
    this.last.set(this.x);
    const t = this.stepAt * CLOCK.step - CLOCK.warm;
    this.blow(t);
    for (let s = 0; s < CLOCK.substeps; s++) this.substep();
    this.stepAt++;
    // A replay passes checkpoints it already has: they hold, bit for bit.
    if (this.stepAt % CLOCK.checkEvery === 0 && !this.checks.has(this.stepAt)) {
      const saved = new Float64Array(6 * FLAG_POINTS);
      saved.set(this.x, 0);
      saved.set(this.xp, 3 * FLAG_POINTS);
      this.checks.set(this.stepAt, saved);
      if (this.checks.size > CLOCK.checksKept) {
        const oldest = this.checks.keys().next().value as number;
        this.checks.delete(oldest);
      }
    }
  }

  /** The air at every point at `t`: the mean wind and the eddies advected through the cloth. */
  private blow(t: number): void {
    const w = flagWind(t, this.seed, this.wind);
    const U = w.speed;
    // Toward -x at no yaw, as the cloth flies; `across` is horizontal and square to it.
    const ax = -Math.cos(w.yaw);
    const az = Math.sin(w.yaw);
    const cx = Math.sin(w.yaw);
    const cz = Math.cos(w.yaw);
    const h = this.h;
    const e = this.eddy;
    const M = EDDIES.modes;
    const turb = CLOTH.turbulence * U;
    for (let p = 0; p < FLAG_POINTS; p++) {
      const rx = (this.x[3 * p] as number) - h.x;
      const ry = (this.x[3 * p + 1] as number) - h.foot;
      const rz = this.x[3 * p + 2] as number;
      // In the wind's frame, the along coordinate carried with the air.
      const along = rx * ax + rz * az - w.travel;
      const across = rx * cx + rz * cz;
      let ua = 0;
      let uy = 0;
      let uc = 0;
      for (let m = 0; m < M; m++) {
        const o = 8 * m;
        const s = Math.sin(
          (e[o] as number) * along + (e[o + 1] as number) * ry + (e[o + 2] as number) * across + (e[o + 6] as number) * t + (e[o + 7] as number),
        );
        ua += (e[o + 3] as number) * s;
        uy += (e[o + 4] as number) * s;
        uc += (e[o + 5] as number) * s;
      }
      const along1 = U + turb * ua;
      this.air[3 * p] = along1 * ax + turb * uc * cx;
      this.air[3 * p + 1] = turb * uy;
      this.air[3 * p + 2] = along1 * az + turb * uc * cz;
    }
  }

  /** One substep: forces on the quads, Verlet, the constraints, the plane. */
  private substep(): void {
    const { nu, nv } = FLAG_GRID;
    const x = this.x;
    const xp = this.xp;
    const F = this.force;
    const air = this.air;
    const dt = CLOCK.step / CLOCK.substeps;
    const inv = 1 / dt;
    const w = this.wind;
    const q = 0.5 * CLOTH.air;
    // The wake: the fly's lateral pressure, sin(phase - kappa) per quad.
    const sp = Math.sin(w.phase);
    const cp = Math.cos(w.phase);
    const wake = CLOTH.wake * q * w.speed * w.speed;
    const cx = Math.sin(w.yaw);
    const cz = Math.cos(w.yaw);
    F.fill(0);
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const p00 = 3 * at(i, j);
        const p10 = p00 + 3;
        const p01 = 3 * at(i, j + 1);
        const p11 = p01 + 3;
        // The cross of the diagonals: twice the quad's area, along its normal.
        const d1x = (x[p11] as number) - (x[p00] as number);
        const d1y = (x[p11 + 1] as number) - (x[p00 + 1] as number);
        const d1z = (x[p11 + 2] as number) - (x[p00 + 2] as number);
        const d2x = (x[p01] as number) - (x[p10] as number);
        const d2y = (x[p01 + 1] as number) - (x[p10 + 1] as number);
        const d2z = (x[p01 + 2] as number) - (x[p10 + 2] as number);
        let nx = d1y * d2z - d1z * d2y;
        let ny = d1z * d2x - d1x * d2z;
        let nz = d1x * d2y - d1y * d2x;
        const n2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (n2 === 0) continue;
        const area = 0.5 * n2;
        nx /= n2;
        ny /= n2;
        nz /= n2;
        // The air relative to the quad: the corners' mean wind less their mean velocity.
        const vx = 0.25 * (rel(air, x, xp, p00, inv) + rel(air, x, xp, p10, inv) + rel(air, x, xp, p01, inv) + rel(air, x, xp, p11, inv));
        const vy =
          0.25 *
          (rel(air, x, xp, p00 + 1, inv) + rel(air, x, xp, p10 + 1, inv) + rel(air, x, xp, p01 + 1, inv) + rel(air, x, xp, p11 + 1, inv));
        const vz =
          0.25 *
          (rel(air, x, xp, p00 + 2, inv) + rel(air, x, xp, p10 + 2, inv) + rel(air, x, xp, p01 + 2, inv) + rel(air, x, xp, p11 + 2, inv));
        const vn = vx * nx + vy * ny + vz * nz;
        const tx = vx - vn * nx;
        const ty = vy - vn * ny;
        const tz = vz - vn * nz;
        const vt = Math.sqrt(tx * tx + ty * ty + tz * tz);
        const pn = q * CLOTH.normal * vn * Math.abs(vn);
        const pt = q * CLOTH.skin * vt;
        // The wake pushes along the normal turned to face `across`.
        const qi = j * nu + i;
        const side = nx * cx + nz * cz < 0 ? -1 : 1;
        const pw =
          side * wake * (this.wakeGain[qi] as number) * (sp * (this.wakeCos[qi] as number) - cp * (this.wakeSin[qi] as number));
        const fx = 0.25 * area * ((pn + pw) * nx + pt * tx);
        const fy = 0.25 * area * ((pn + pw) * ny + pt * ty);
        const fz = 0.25 * area * ((pn + pw) * nz + pt * tz);
        add(F, p00, fx, fy, fz);
        add(F, p10, fx, fy, fz);
        add(F, p01, fx, fy, fz);
        add(F, p11, fx, fy, fz);
      }
    }
    // Verlet.
    const keep = 1 - CLOTH.damping;
    const dt2 = dt * dt;
    for (let p = 0; p < FLAG_POINTS; p++) {
      const wm = this.invMass[p] as number;
      if (wm === 0) continue;
      const o = 3 * p;
      const x0 = x[o] as number;
      const y0 = x[o + 1] as number;
      const z0 = x[o + 2] as number;
      x[o] = x0 + (x0 - (xp[o] as number)) * keep + (F[o] as number) * wm * dt2;
      x[o + 1] = y0 + (y0 - (xp[o + 1] as number)) * keep + ((F[o + 1] as number) * wm - CLOTH.gravity) * dt2;
      x[o + 2] = z0 + (z0 - (xp[o + 2] as number)) * keep + (F[o + 2] as number) * wm * dt2;
      xp[o] = x0;
      xp[o + 1] = y0;
      xp[o + 2] = z0;
    }
    // The constraints: one full sweep, then stretch again.
    this.solve(0, this.ca.length);
    for (let s = 0; s < CLOTH.stretchSweeps; s++) this.solve(this.stretchFrom, this.ca.length);
    // Long-range attachments (Kim, Chentanez and Müller, 2012): no point
    // farther from its row's hoist point than the cloth between them, which
    // is what keeps the fly from paying out the sweeps' residual stretch.
    this.tether();
    // The hoist's plane: nothing of the cloth comes round past its own hoist line.
    const hx = this.h.x;
    for (let p = 0; p < FLAG_POINTS; p++) if ((x[3 * p] as number) > hx) x[3 * p] = hx;
  }

  /** Pull each point back within its rest distance of its row's hoist point (pinned, so all of the move is the point's). */
  private tether(): void {
    const { nu, nv } = FLAG_GRID;
    const x = this.x;
    const ds = this.h.fly / nu;
    for (let j = 0; j <= nv; j++) {
      const oa = 3 * at(0, j);
      const ax = x[oa] as number;
      const ay = x[oa + 1] as number;
      const az = x[oa + 2] as number;
      for (let i = 2; i <= nu; i++) {
        const o = oa + 3 * i;
        const dx = (x[o] as number) - ax;
        const dy = (x[o + 1] as number) - ay;
        const dz = (x[o + 2] as number) - az;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const max = i * ds;
        if (len <= max) continue;
        const k = max / len;
        x[o] = ax + dx * k;
        x[o + 1] = ay + dy * k;
        x[o + 2] = az + dz * k;
      }
    }
  }

  /** One Gauss-Seidel sweep of constraints [from, to), XPBD with the multipliers fresh each substep. */
  private solve(from: number, to: number): void {
    const x = this.x;
    const W = this.invMass;
    for (let c = from; c < to; c++) {
      const a = this.ca[c] as number;
      const b = this.cb[c] as number;
      const wa = W[a] as number;
      const wb = W[b] as number;
      const ws = wa + wb + (this.cAlpha[c] as number);
      if (wa + wb === 0) continue;
      const oa = 3 * a;
      const ob = 3 * b;
      const dx = (x[ob] as number) - (x[oa] as number);
      const dy = (x[ob + 1] as number) - (x[oa + 1] as number);
      const dz = (x[ob + 2] as number) - (x[oa + 2] as number);
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len === 0) continue;
      const s = (len - (this.cRest[c] as number)) / (ws * len);
      x[oa] = (x[oa] as number) + wa * s * dx;
      x[oa + 1] = (x[oa + 1] as number) + wa * s * dy;
      x[oa + 2] = (x[oa + 2] as number) + wa * s * dz;
      x[ob] = (x[ob] as number) - wb * s * dx;
      x[ob + 1] = (x[ob + 1] as number) - wb * s * dy;
      x[ob + 2] = (x[ob + 2] as number) - wb * s * dz;
    }
  }
}

/** One solver per (size, seed) asked for: each is its own run. */
const solvers = new Map<string, FlagCloth>();

/**
 * The cloth's grid at `t` seconds, u fastest, three floats a point, into
 * `out` (length `3 * FLAG_POINTS`). Pure in (t, size, seed): the run from
 * rest at `-6` s, stepped as the file comment says, whatever was asked
 * for before. The hoist column itself never moves. Allocates nothing once
 * a run is past its checkpoints.
 */
export function flagPose(
  t: number,
  out: Float32Array,
  size: FlagSize = FLAG_SIZE,
  seed: number = FLAG_SEED,
): Float32Array {
  const key = `${size.fly}x${size.hoist}:${seed}`;
  let cloth = solvers.get(key);
  if (cloth === undefined) {
    cloth = new FlagCloth(size, seed);
    solvers.set(key, cloth);
  }
  return cloth.pose(t, out);
}

// ------------------------------------------------------------------ //
// The wave.
// ------------------------------------------------------------------ //

/** `flagWave`'s scratch: the wind, and the hoist of the last size asked for. */
const WIND: FlagWind = { strength: 0, speed: 0, yaw: 0, phase: 0, travel: 0 };
let hoistOf: { size: FlagSize; h: ReturnType<typeof flagHoist> } | undefined;

/** The wave: its length as a fraction of the fly, and how far the rows' phases slant, radians a metre up. */
const WAVE = { length: 0.35, slant: 0.25 } as const;

/**
 * THE OTHER FLAG, the one the panel's "cloth sim" box swaps in when it is
 * unchecked: the cloth as a closed-form wave rather than a simulation —
 * cheap, and no history at all. The grid at `t` seconds, as `flagPose`
 * writes it. Pure in (t, size, seed); allocates nothing. Row by row from its hoist point, each segment's direction is
 *
 *   d = (-cos β cos θ, sin β, cos β sin θ)
 *
 * — toward -x at rest — with the heading θ = yaw + A e(s) sin(k s - phase +
 * slant y) and the pitch β = -droop s / fly, A and the droop growing as the
 * wind drops and e(s) = 0.3 + 0.7 (s / fly)^1.2 growing it toward the fly;
 * the hoist column itself never moves.
 */
export function flagWave(
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
