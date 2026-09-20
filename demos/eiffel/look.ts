/**
 * The look, as one value.
 *
 * Everything about how the tower is LIT and what it stands in — the
 * environment, the five lights, the fog, the exposure, the occlusion —
 * lives in the object below rather than in a scatter of statements across
 * `main.ts`. `rig.ts` is what turns it into a scene.
 *
 * It is one object because the interesting changes are never one dial: a
 * lower sun wants a different fog, a different fill and a different
 * exposure at once, and a look that was tuned as a whole image has to be
 * able to land as a whole image.
 *
 * The palette — what colour each part class is painted — is NOT here. That
 * stays in `main.ts` with the classes it names, and a look only ever
 * states its differences from it (`material`, empty below).
 */
import type { AoSpec } from "./gtao.js";
import type { EnvSpec, SunAngle } from "./env.js";

/** One light. `angle: null` means "wherever the environment's sun is". */
export interface LightSpec {
  readonly on: boolean;
  readonly color: number;
  readonly intensity: number;
  readonly angle: SunAngle | null;
}

/** The key, which is the only light that casts. */
export interface KeySpec extends LightSpec {
  readonly shadow: {
    readonly on: boolean;
    /** Square map, per side. 4096 is a texel every 4-8 cm over the tower. */
    readonly mapSize: number;
    readonly bias: number;
    readonly normalBias: number;
    /** PCF softening, in texels. */
    readonly radius: number;
  };
}

/** A per-class override on top of the base palette `main.ts` holds. */
export interface MaterialSpec {
  readonly color?: number;
  readonly roughness?: number;
  readonly metalness?: number;
  /** How hard this class reflects the environment. */
  readonly envMapIntensity?: number;
}

export interface Look {
  readonly name: string;
  readonly description: string;
  readonly env: EnvSpec;
  /** 'env' shows the generated sky; 'horizon' is its flat average. */
  readonly background: "env" | "horizon";
  /** ACES filmic exposure. The only camera dial. */
  readonly exposure: number;
  /**
   * Distance fog, in metres, taking the environment's own horizon colour
   * so the silhouette dissolves into its sky instead of into a constant
   * somebody typed. `null` is no fog at all, which a studio look wants.
   */
  readonly fog: { readonly near: number; readonly far: number } | null;
  /**
   * The plane the tower stands on and throws its shadow across. Omitted,
   * it follows the environment: present and the environment's own ground
   * colour whenever the background IS the environment, absent when it is
   * not — a studio look has no outdoors, and a floor under it would be a
   * floor from nowhere.
   */
  readonly ground?: { readonly on: boolean; readonly color: number; readonly roughness: number };
  readonly key: KeySpec;
  readonly fill: LightSpec;
  readonly rim: LightSpec;
  /** From below: what the ground throws back under the arches. */
  readonly bounce: LightSpec;
  readonly ambient: {
    readonly intensity: number;
    readonly sky: number;
    readonly ground: number;
  };
  /** Multiplies every material's environment contribution at once. */
  readonly envIntensity: number;
  readonly material: Readonly<Record<string, MaterialSpec>>;
  readonly ao: AoSpec;
}

const off: LightSpec = { on: false, color: 0xffffff, intensity: 0, angle: null };

/**
 * `1889`: the tower on a bright, slightly hazy day, lit as it is read.
 *
 * The sun is over the camera's left shoulder and 49 degrees up, which is
 * the whole reason the lattice is legible: the faces toward the camera
 * split into a lit side and a shaded one, and the tower's shadow falls
 * back and to the right onto ground the opening view can see. A cool fill
 * from the opposite quarter keeps the unlit faces off the ambient's flat
 * value, and the sky — flat, since zenith and horizon are the same colour
 * — is in the paint at a third strength, which is what a brown standing
 * under a pale sky actually does.
 *
 * The occlusion is the part that is about the structure rather than the
 * weather. On a thing that is mostly holes, the dark where two members
 * meet is most of what says they meet.
 */
export const LOOK: Look = {
  name: "1889",
  description:
    "One sun from over the camera's left shoulder, a flat pale sky, fog from 900, " +
    "and the sky in the iron at a third strength.",
  env: {
    kind: "gradient",
    zenith: 0xc4d0da,
    horizon: 0xc4d0da,
    ground: 0xb8ae9e,
    sharpness: 1,
    intensity: 1,
  },
  background: "horizon",
  exposure: 1,
  fog: { near: 900, far: 1950 },
  // Stated rather than inherited: the background is the flat horizon here,
  // which would otherwise take the ground away, and the ground the tower
  // stands on is half of what this look is.
  ground: { on: true, color: 0xa29c8f, roughness: 1 },
  key: {
    on: true,
    color: 0xfff3e2,
    intensity: 3.1,
    angle: { elevation: 49, azimuth: -42 },
    shadow: { on: true, mapSize: 4096, bias: -0.0005, normalBias: 0.35, radius: 2 },
  },
  fill: { on: true, color: 0xc9d8e8, intensity: 0.55, angle: { elevation: 20, azimuth: 150 } },
  rim: off,
  bounce: off,
  ambient: { intensity: 0.85, sky: 0xc4d0da, ground: 0x9a8f7d },
  envIntensity: 0.35,
  material: {},
  ao: {
    on: true,
    radius: 0.45,
    distanceExponent: 1,
    thickness: 1,
    scale: 0.9,
    samples: 16,
    screenSpaceRadius: false,
    blend: 0.75,
  },
};
