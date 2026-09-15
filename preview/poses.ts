/**
 * The preview page's camera poses — pure arithmetic, no three.js, no DOM.
 *
 * Split out of `main.ts` so something other than a browser can check it.
 * `pcg render --out frame.png` draws the same `hero` and `ground` poses in
 * `src/cli/raster/views.ts`, and that module cannot be imported here: it
 * is reachable only through the `pcg-ts/cli` entry, whose `makeNodeIo`
 * imports `node:fs` at top level and breaks the browser build. So there
 * are two copies, and `tests/previewPoses.test.ts` holds them together
 * over a sweep of extents and centres.
 *
 * The copies differ in one deliberate way. This one finds the decade with
 * `Math.pow(10, Math.floor(Math.log10(v)))`, as the page always has; the
 * CLI walks it with `×10` / `÷10`, because its PNG bytes are a promise
 * across platforms and `pow` / `log10` are not required to round the same
 * everywhere. From a thousandth up — every extent content can produce,
 * since the span is floored at 1e-3 — the two agree bit for bit; below it
 * they differ in the last bit or two, which the parity test states as its
 * tolerance.
 */

/** One named camera pose, in absolute world units. */
export interface View {
  readonly name: string;
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly up: readonly [number, number, number];
  /**
   * World size for point sprites in this view. Per view because sprites
   * are size-attenuated: one world size that reads well from 80 m up is
   * a two-metre billboard when the camera is standing among them.
   */
  readonly pointSize: number;
  /**
   * Linear fog range for this view, also per view and for the same kind
   * of reason. At eye level haze is the depth cue that makes a forest
   * read as deep rather than flat, so it wants to start close; from the
   * hero pose the whole scene is farther away than that, and one shared
   * range washes the layout out to the colour of the sky.
   */
  readonly fog: readonly [number, number];
}

/**
 * Round an extent up a ~25% ladder.
 *
 * The camera must not move between iterations or the comparison the whole
 * method rests on is meaningless — but auto-framing from the content's
 * bounding box moves it whenever the content changes by a hair. Snapping
 * to a coarse ladder buys back the property that matters: tuning density,
 * a threshold or a seed leaves the framing bit-identical, while a real
 * change of extent still re-frames and the harness says so out loud.
 */
export function quantizeExtent(value: number): number {
  if (!(value > 0)) return 1;
  const decade = Math.pow(10, Math.floor(Math.log10(value)));
  const ladder = [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10];
  for (const step of ladder) {
    const candidate = step * decade;
    if (value <= candidate * (1 + 1e-9)) return candidate;
  }
  return 10 * decade;
}

/**
 * Snap a coordinate to a power-of-two fraction of the extent.
 *
 * Quantizing the EXTENT is not enough to hold the camera still: every
 * pose is also anchored to the centre and the ground, and both come raw
 * off a bounding box that moves whenever any extreme point does. Tuning a
 * density would then shift all three cameras with the extent bucket
 * unchanged and nothing reported. extent/128 is exact in binary, so an
 * edit that does not cross a step leaves the pose bit-identical.
 */
export function snapToExtent(v: number, extent: number): number {
  const step = extent / 128;
  return Math.round(v / step) * step;
}

/**
 * The fixed poses. `ground` stands INSIDE the content at eye height and
 * looks across it, because that is the view the reference imagery is of:
 * a density that reads well from above can be a bald patch at 1.7 m.
 *
 * `surfaceY` answers "what is the ground at this x, z" by raycasting
 * down through the scene's surfaces. Using the bounding box's minimum
 * instead — which is what the first version did — puts the eye at the
 * lowest point of the whole terrain, so on anything with relief the
 * camera stands metres UNDERGROUND and photographs the sky through the
 * back of a front-facing mesh. It renders confidently and is completely
 * wrong, which is the failure this whole tool exists to avoid.
 */
export function viewsFor(
  cx: number,
  cz: number,
  groundY: number,
  extent: number,
  eye: number,
  surfaceY: (x: number, z: number) => number,
): View[] {
  const eyeX = cx;
  const eyeZ = cz + 0.22 * extent;
  const lookX = cx;
  const lookZ = cz - 0.3 * extent;
  // 1.15 * extent along a (1, 1, 1) direction: 35.26 degrees above the
  // horizontal — high enough to read layout, low enough to keep vertical
  // structure and cast shadows legible — and far enough back that
  // content filling its whole extent bucket still fits the frustum. The
  // first version stood at 0.87 and cropped the near half off anything
  // at 90% fill or more; 1.45 fixed the crop and then wasted half the
  // frame on sky.
  const heroDistance = 1.15 * extent;
  const heroOffset = heroDistance / Math.sqrt(3);
  const aerialFog: readonly [number, number] = [heroDistance * 0.95, extent * 4];
  return [
    {
      name: "hero",
      position: [cx + heroOffset, groundY + 0.05 * extent + heroOffset, cz + heroOffset],
      target: [cx, groundY + 0.05 * extent, cz],
      up: [0, 1, 0],
      pointSize: extent / 160,
      fog: aerialFog,
    },
    {
      name: "ground",
      position: [eyeX, surfaceY(eyeX, eyeZ) + eye, eyeZ],
      target: [lookX, surfaceY(lookX, lookZ) + eye * 0.9, lookZ],
      up: [0, 1, 0],
      // Sized against the eye, not the scene: the nearest points are a
      // couple of metres away, where an extent-sized sprite is a wall.
      pointSize: eye / 12,
      fog: [extent * 0.12, extent * 1.6],
    },
    {
      name: "top",
      // Straight down needs a non-Y up vector or lookAt degenerates.
      position: [cx, groundY + 1.15 * extent, cz],
      target: [cx, groundY, cz],
      up: [0, 0, -1],
      pointSize: extent / 160,
      fog: aerialFog,
    },
  ];
}
