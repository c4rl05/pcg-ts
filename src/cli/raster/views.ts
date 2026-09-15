/**
 * Camera poses for the PNG frames — pure arithmetic, no scene, no pixels.
 *
 * Four views. `top` and `side` are orthographic and answer "where": `top`
 * has the SVG's orientation (x right, z down, looking down -y) and `side`
 * looks down -z from +z (x right, y up). `hero` and `ground` are
 * perspective and are the preview page's poses (`preview/poses.ts`), so a
 * CLI frame and a browser frame of the same graph stand in the same place:
 * the same extent ladder, the same snapping of centre and ground to
 * extent/128, the same 50° vertical field of view.
 *
 * WHY THE ARITHMETIC IS RESTRICTED. The bytes of a frame are a promise
 * across platforms, and only `+ − × ÷` and `sqrt` are required by IEEE 754
 * to round correctly; `sin`, `tan`, `pow`, `log10` are whatever the libm
 * underneath does. So the field of view is a literal focal constant, and
 * the extent ladder is walked with `×10` / `÷10` where the preview calls
 * `Math.pow(10, Math.floor(Math.log10(v)))` — measured on V8,
 * `Math.pow(10, -4) !== 1e-4` while `1e-3 / 10 === 1e-4`. A test scans this
 * file (and its siblings) for any other `Math.` member.
 *
 * The preview CANNOT import this module: it is reachable only through the
 * `pcg-ts/cli` entry, whose `makeNodeIo` pulls `node:fs` into a browser
 * bundle. The two copies are held together by `tests/previewPoses.test.ts`.
 */

/** A world-space vector. */
export type Vec3 = readonly [number, number, number];

/** The four frames the rasterizer can draw. */
export type ViewName = "top" | "side" | "hero" | "ground";

/** Every view, in the order a report lists them. */
export const VIEW_NAMES: readonly ViewName[] = ["top", "side", "hero", "ground"];

/**
 * 1 / tan(25°): the focal length, in units of half the image height, of
 * the preview's 50° vertical field of view. A literal so that no
 * trigonometry runs — see the module header.
 */
export const FOCAL = 2.1445069205095586;

/** The preview's vertical field of view, for reports. {@link FOCAL} is what draws. */
export const FOV_Y_DEGREES = 50;

/** The ~25% rungs an extent is rounded up to within one decade. */
export const EXTENT_LADDER: readonly number[] = [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10];

/**
 * Margin between the content's largest span and the extent asked of the
 * ladder: the hero pose is a fixed offset rather than a frustum fit, so
 * content filling its whole bucket clips its near corner without it.
 */
export const FRAMING_MARGIN = 1.1;

/** Ground-camera eye height when none is given: a person. */
export const DEFAULT_EYE = 1.7;

/**
 * Half of the SHORTER image side, in world units, for the orthographic
 * views — 0.55 × extent, so a content span of extent / 1.1 fits with the
 * same margin the ladder was asked for.
 */
export const ORTHO_HALF = 0.55;

/**
 * Round an extent up the ladder. Held still by design: tuning a density or
 * a threshold leaves the rung — and so every pose — bit-identical, while a
 * real change of size re-frames and the report says so.
 *
 * The decade is found by walking from 1 with `×10` and `÷10`, which is
 * exact up to 1e22 and correctly rounded below 1 on every platform.
 */
export function quantizeExtent(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 1;
  let decade = 1;
  while (value >= decade * 10) decade *= 10;
  while (value < decade) decade /= 10;
  for (const step of EXTENT_LADDER) {
    const candidate = step * decade;
    if (value <= candidate * (1 + 1e-9)) return candidate;
  }
  return 10 * decade;
}

/**
 * Snap a coordinate to extent/128. A power-of-two fraction of the extent
 * is exact in binary, so an edit that does not cross a step leaves the
 * pose bit-identical even though the bounding box it came from moved.
 */
export function snapToExtent(v: number, extent: number): number {
  const step = extent / 128;
  return Math.round(v / step) * step;
}

/** An axis-aligned world box. */
export interface Bounds3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** Where the cameras stand, and what decided it. */
export interface Framing {
  /** The extent every pose is scaled by. */
  readonly extent: number;
  /** `extent` came from the caller rather than from the content. */
  readonly pinned: boolean;
  /** The extent the content alone would have framed at. Equal to `extent` unless pinned. */
  readonly autoExtent: number;
  /** Ground-camera eye height above the surface under it. */
  readonly eye: number;
  /** The content's lowest point, snapped. */
  readonly groundY: number;
  /** The content's box centre, snapped. */
  readonly centre: Vec3;
}

/**
 * Framing from the content's box. An empty scene frames the unit box at
 * the origin so every number downstream stays finite.
 */
export function frameBounds(
  bounds: Bounds3 | undefined,
  opts: { readonly extent?: number; readonly eye?: number } = {},
): Framing {
  const box = bounds ?? { min: [0, 0, 0] as const, max: [1, 1, 1] as const };
  const sx = box.max[0] - box.min[0];
  const sy = box.max[1] - box.min[1];
  const sz = box.max[2] - box.min[2];
  const autoExtent = quantizeExtent(Math.max(sx, sz, sy, 1e-3) * FRAMING_MARGIN);
  const extent = opts.extent ?? autoExtent;
  const centre: Vec3 = [
    snapToExtent((box.min[0] + box.max[0]) / 2, extent),
    snapToExtent((box.min[1] + box.max[1]) / 2, extent),
    snapToExtent((box.min[2] + box.max[2]) / 2, extent),
  ];
  return {
    extent,
    pinned: opts.extent !== undefined,
    autoExtent,
    eye: opts.eye ?? DEFAULT_EYE,
    groundY: snapToExtent(box.min[1], extent),
    centre,
  };
}

/** One camera pose, in absolute world units. */
export interface Pose {
  readonly name: ViewName;
  readonly projection: "orthographic" | "perspective";
  readonly position: Vec3;
  readonly target: Vec3;
  readonly up: Vec3;
  /** Perspective: the near plane distance. Orthographic: unused (nothing is clipped by depth). */
  readonly near: number;
  /** Perspective: the far plane, for reports; fog has faded everything well before it. */
  readonly far: number;
  /** Perspective: linear fog range along the view axis. Orthographic views have no fog. */
  readonly fog?: readonly [number, number];
  /** Orthographic: world units covered by half the shorter image side. */
  readonly halfSize?: number;
}

/**
 * The ground under (x, z), by casting down onto the scene's surfaces.
 * Returns the fallback it is given when nothing is under the point.
 */
export type SurfaceY = (x: number, z: number) => number;

/**
 * The preview's two perspective poses, number for number — see
 * `preview/poses.ts`, which this must match (and a test checks it does).
 *
 * `ground` stands INSIDE the content at eye height ABOVE THE SURFACE UNDER
 * IT. The preview's first version took eye height from the box minimum,
 * which on relief put the camera metres underground photographing the sky
 * through the back of the terrain.
 */
export function perspectivePoses(
  cx: number,
  cz: number,
  groundY: number,
  extent: number,
  eye: number,
  surfaceY: SurfaceY,
): { readonly hero: Pose; readonly ground: Pose } {
  const near = Math.max(0.02, extent / 5000);
  const far = extent * 6;
  const eyeX = cx;
  const eyeZ = cz + 0.22 * extent;
  const lookX = cx;
  const lookZ = cz - 0.3 * extent;
  const heroDistance = 1.15 * extent;
  const heroOffset = heroDistance / Math.sqrt(3);
  const aerialFog: readonly [number, number] = [heroDistance * 0.95, extent * 4];
  return {
    hero: {
      name: "hero",
      projection: "perspective",
      position: [cx + heroOffset, groundY + 0.05 * extent + heroOffset, cz + heroOffset],
      target: [cx, groundY + 0.05 * extent, cz],
      up: [0, 1, 0],
      near,
      far,
      fog: aerialFog,
    },
    ground: {
      name: "ground",
      projection: "perspective",
      position: [eyeX, surfaceY(eyeX, eyeZ) + eye, eyeZ],
      target: [lookX, surfaceY(lookX, lookZ) + eye * 0.9, lookZ],
      up: [0, 1, 0],
      near,
      far,
      fog: [extent * 0.12, extent * 1.6],
    },
  };
}

/**
 * All four poses for one framing. `top` stands where the preview's top
 * camera does but projects orthographically, with the SVG's orientation;
 * `side` stands in front of the content on +z.
 */
export function posesFor(framing: Framing, surfaceY: SurfaceY): Readonly<Record<ViewName, Pose>> {
  const { extent, groundY, centre } = framing;
  const [cx, cy, cz] = centre;
  const halfSize = extent * ORTHO_HALF;
  const { hero, ground } = perspectivePoses(cx, cz, groundY, extent, framing.eye, surfaceY);
  return {
    top: {
      name: "top",
      projection: "orthographic",
      // Straight down needs a non-Y up vector; -z up puts +z at the bottom.
      position: [cx, groundY + 1.15 * extent, cz],
      target: [cx, groundY, cz],
      up: [0, 0, -1],
      near: 0,
      far: extent * 6,
      halfSize,
    },
    side: {
      name: "side",
      projection: "orthographic",
      position: [cx, cy, cz + 1.15 * extent],
      target: [cx, cy, cz],
      up: [0, 1, 0],
      near: 0,
      far: extent * 6,
      halfSize,
    },
    hero,
    ground,
  };
}
