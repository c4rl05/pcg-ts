/**
 * The Eiffel Tower as rules — the skeleton.
 *
 * The large structure is Eiffel's own: Plate XXXI of his 1900 album gives
 * all 29 panels, node by node, and `spec.ts` carries that table verbatim.
 * Everything below the panel scale — how a panel is braced, how a girder
 * is laced — is a rule per region read off the plates, not a trace of the
 * individual pieces.
 *
 * Each part of the tower is its own module and hands back finished meshes
 * by class (`parts.ts`); this file only assembles them, one output per
 * class.
 */
import { Graph } from "pcg-ts";
import { buildFirstFloor } from "./firstFloor.js";
import { buildFlag } from "./flag.js";
import { buildGround } from "./ground.js";
import { quadrants } from "./lattice.js";
import { buildLegs } from "./legs.js";
import { buildLifts } from "./lifts.js";
import { type Detail, assemble, joinParts } from "./parts.js";
import { buildPlatforms } from "./platforms.js";
import { buildShaft } from "./shaft.js";
import { buildSummit } from "./summit.js";

/** Build the skeleton graph, at the given depth of detail. */
export function buildEiffel(seed = 1889, detail: Detail = {}): Graph {
  const g = new Graph(seed);
  g.setMeta({
    title: "Eiffel Tower — skeleton",
    description:
      "Eiffel's 29 panels from Plate XXXI: four legs merging into one shaft, braced by rule.",
    tags: ["structure", "lattice"],
  });
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
      buildFlag(g),
      buildGround(g),
    ),
  );
  return g;
}
