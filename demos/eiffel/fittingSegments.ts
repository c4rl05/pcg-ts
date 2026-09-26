/**
 * How finely the page's instanced fittings are turned (`main.ts`' ASSETS):
 * each a unit shape the instance matrix scales to its true size, so its
 * segment counts are set here from that true size and `chord.ts`'
 * tolerance for where it is seen from, not from the unit shape. Kept apart
 * from `main.ts` so a test can read them without a page.
 *
 * Every instance multiplies its asset's triangles, so the tolerance is
 * chosen per fitting:
 * - the globes, 0.60 across, hung 5.90 up over the gallery's middle: a
 *   visitor stands under them, `SAG.eye`, 36 instances;
 * - the balusters, 0.21 at their widest, the gallery's railing a visitor
 *   leans on: `SAG.eye`, 720 instances;
 * - the cabochons, bosses 0.27 across in the arcades' crescents 7.7 m up
 *   outside the gallery: `SAG.near`, 432 instances.
 *
 * The true sizes are platforms.ts' (`ARCADE_DRESS.globe.radius` 0.30 and
 * `.cabochon.boss` 0.135, not exported; `BALUSTER.profile`), restated here.
 */
import { SAG, arcSegments, circleSegments } from "./chord.js";
import { BALUSTER, CABOCHON_RISE } from "./platforms.js";

/** The globe's true radius [platforms.ts ARCADE_DRESS.globe.radius]. */
export const GLOBE_RADIUS = 0.3;
/** The cabochon boss's true base radius [platforms.ts ARCADE_DRESS.cabochon.boss]. */
export const CABOCHON_BASE = 0.135;
/** The baluster's widest radius, off its profile. */
export const BALUSTER_RADIUS = Math.max(...BALUSTER.profile.map(([, r]) => r));

/** The cabochon's sphere radius and the polar angle its cap spans, at true size. */
export function cabochonSphere(): { radius: number; polar: number } {
  const r = (1 + CABOCHON_RISE * CABOCHON_RISE) / (2 * CABOCHON_RISE);
  return { radius: r * CABOCHON_BASE, polar: Math.acos((r - CABOCHON_RISE) / r) };
}

/**
 * A sphere's segments: `around` its equator, `rings` from pole to pole. A
 * quad of the two is split on its diagonal, whose chord stands off the
 * sphere by about the SUM of the two edges' sagittas (r (a² + b²) / 8 for
 * steps a and b), so each direction is held to half of `sag`.
 */
function sphere(radius: number, sag: number): { around: number; rings: number } {
  return { around: circleSegments(radius, sag / 2), rings: arcSegments(radius, Math.PI, sag / 2, { multiple: 2 }) };
}

export const FITTING_SEGMENTS = {
  globe: sphere(GLOBE_RADIUS, SAG.eye),
  // A cap: its widest ring the base (radius CABOCHON_BASE), its meridians
  // on the sphere; each direction held to half, as a sphere's.
  cabochon: {
    around: circleSegments(CABOCHON_BASE, SAG.near / 2),
    rings: arcSegments(cabochonSphere().radius, cabochonSphere().polar, SAG.near / 2, { min: 3 }),
  },
  baluster: { around: circleSegments(BALUSTER_RADIUS, SAG.eye) },
} as const;
