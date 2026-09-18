/**
 * The floor platforms, the lift-transfer landing, and the masonry pedestals.
 *
 * Every deck is a slab whose TOP is the printed floor level (Plate I; the
 * structural nodes sit 0.23 m below), 0.60 m thick [estimated]:
 *
 * - 1ST FLOOR, y 57.63: "côté extérieur 70m695, surface 4200 m²"
 *   [sourced]. 70.695² is 4,998 m², so the printed area only holds if the
 *   middle is open: a square ring whose hole is √(70.695² − 4200) = 28.245
 *   m wide [derived]. That is inside the inner uprights (32.70 m apart at
 *   node XXIII), so the ring spans the legs and leaves the centre void.
 *   One side slab is built in pinwheel form — the +z side, running on to
 *   the +x corner — and copied onto the four quadrant targets, which tiles
 *   the ring with no overlap.
 * - 2ND FLOOR, y 115.73: 37.63 m square [estimated reading of a smudged
 *   digit; see `PLATFORMS`]. 37.63² = 1,416 m² against the printed 1,400,
 *   which is inside the rounding the 3rd floor shows (18.65² = 348 m²
 *   against a printed 350), so no hole is inferred: a solid deck.
 * - LANDING, y 195.93 [sourced], inside the shaft between nodes X and IX.
 *   No plan is printed. It fills the shaft: the shaft's half-width at the
 *   floor, interpolated on Plate XXXI's profile, less an upright's
 *   half-width, 16.23 m square [estimated].
 * - 3RD FLOOR gallery, y 276.13: 18.65 m square [sourced], round the
 *   10 m panel-29 box and under the 16.56 m room (`summit.ts`).
 * - PEDESTALS: the four decorative masonry "soubassements", 4 m high from
 *   the ground [sourced], faces 37.119 and 62.453 from the axis on both x
 *   and z [derived from Plate I's ground chain 25.334 + 74.238 + 25.334;
 *   see `PEDESTAL`]. One per leg, copied onto the quadrant targets.
 *
 * Boxes carry no `normal`, so copying the meshes themselves is safe.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { box, copyToQuadrants } from "./lattice.js";
import type { Parts } from "./parts.js";
import { FLOORS, MEMBERS, PEDESTAL, PLATFORMS, profileAt } from "./spec.js";

/** Every deck's thickness [estimated]. */
const DECK = 0.6;

/** A square deck `side` wide whose top is at `top`. */
function deck(g: Graph, id: string, side: number, top: number): NodeHandle {
  return box(g, id, [0, top - DECK / 2, 0], [side, DECK, side]);
}

/** The upright half-width at height y (the MEMBERS stops, clamped). */
function uprightAt(y: number): number {
  const stops = MEMBERS.upright;
  let w: number = stops[0]![1];
  for (const [sy, sw] of stops) if (y >= sy) w = sw;
  return w;
}

/** Build the platforms and the pedestals. `quads` are the four quadrant targets. */
export function buildPlatforms(g: Graph, quads: NodeHandle): Parts {
  // The 1st floor: a square ring, one pinwheel side slab copied four times.
  const { side, area } = PLATFORMS.first;
  const o = side / 2;
  const i = Math.sqrt(side * side - area) / 2;
  const firstSide = box(
    g,
    "firstFloorSide",
    [(o - i) / 2, FLOORS.first - DECK / 2, (o + i) / 2],
    [o + i, DECK, o - i],
  );
  const first = copyToQuadrants(g, "firstFloor", firstSide, quads);

  const landingHalf = profileAt(FLOORS.landing).outer - uprightAt(FLOORS.landing);

  const pedestal = box(
    g,
    "pedestal",
    [(PEDESTAL.inner + PEDESTAL.outer) / 2, PEDESTAL.height / 2, (PEDESTAL.inner + PEDESTAL.outer) / 2],
    [PEDESTAL.outer - PEDESTAL.inner, PEDESTAL.height, PEDESTAL.outer - PEDESTAL.inner],
  );

  return {
    platforms: [
      first,
      deck(g, "secondFloor", PLATFORMS.second.side, FLOORS.second),
      deck(g, "landing", 2 * landingHalf, FLOORS.landing),
      deck(g, "thirdFloor", PLATFORMS.third.side, FLOORS.third),
    ],
    masonry: [copyToQuadrants(g, "pedestals", pedestal, quads)],
  };
}
