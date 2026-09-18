/**
 * The four legs, supports to node XI where they merge into one shaft.
 *
 * One leg is built in the +x+z quadrant and copied onto the other three.
 * Its section is the square [inner, outer]^2 at every node, with the four
 * uprights in ring order c (outer corner), b, a (inner corner), d:
 *
 *   station 0  c  (outer, outer)
 *   station 1  b  (inner, outer)   in the +z tower face
 *   station 2  a  (inner, inner)   facing the tower's axis
 *   station 3  d  (outer, inner)   in the +x tower face
 *
 * so face f runs from station f to f + 1: faces 0 (c-b) and 3 (d-c) are
 * the leg's outer faces, 1 (b-a) and 2 (a-d) its inner ones.
 *
 * What changes with height is not the construction but which rules apply,
 * and those come straight off Plate XXXI:
 * - panels 1-4: one St Andrew's cross per face, crossing on a mid-height
 *   horizontal (the legs are parallel prisms there, so the faces are
 *   parallelograms and the diagonals bisect each other exactly at mid-height);
 * - panel 5 (below the 1st floor) and panel 11 (below the 2nd): lattice
 *   girder belts instead of a cross;
 * - panels 6-10: one cross per face;
 * - above the 2nd floor (node XVII) the inner upright a stops, and panels
 *   12-17 are braced on the two outer faces only;
 * - below panel 1, the base tie ("entretoise inférieure"), a lattice
 *   girder about 2 m deep [estimated] on every face.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  type Lattice,
  type Level,
  chains,
  copyMembersToQuadrants,
  copyToQuadrants,
  edges,
  merge,
  skin,
  squareRing,
  stationLattice,
} from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { MEMBERS, NODES, type NodeLevel, node } from "./spec.js";
import {
  UPRIGHT_SEAMS,
  faceSkin,
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

/** Stations b and a (c is 0, d is 3). */
const B = 1;
const A = 2;

/** The four uprights' ring: c, b, a, d. */
const LEG_RING = squareRing(1);

/** A leg's section at one node: the square [inner, outer]^2. */
export function legLevel(n: { y: number; outer: number; inner: number }): Level {
  return { y: n.y, x0: n.inner, x1: n.outer, z0: n.inner, z1: n.outer };
}

/** Faces that touch the inner upright a. */
const touchesA = (face: number) => face === B || face === A;

/**
 * The leg's levels: every node from the supports to XI, plus the midpoint
 * of each of panels 1-4, where the cross meets its horizontal. A midpoint
 * is exact because the uprights are straight within a panel.
 */
function legLevels(): NodeLevel[] {
  const levels: NodeLevel[] = [];
  const upTo = NODES.findIndex((n) => n.name === "XI");
  for (let i = 0; i <= upTo; i++) {
    const n = NODES[i] as NodeLevel;
    levels.push(n);
    if (["XXVIII", "XXVII", "XXVI", "XXV"].includes(n.name)) {
      const m = NODES[i + 1] as NodeLevel;
      levels.push({
        name: `mid-${n.name}`,
        y: (n.y + m.y) / 2,
        outer: (n.outer + m.outer) / 2,
        inner: (n.inner + m.inner) / 2,
      });
    }
  }
  return levels;
}

/** A lattice girder belt round one leg, between two of its levels. */
function belt(
  g: Graph,
  id: string,
  bottom: NodeLevel,
  top: NodeLevel,
  perSide: number,
  withBottomChord: boolean,
): NodeHandle {
  const lat: Lattice = stationLattice(g, {
    id,
    ring: squareRing(perSide),
    closed: true,
    levels: [legLevel(bottom), legLevel(top)],
  });
  const parts = [
    // Verticals, except at the corners, where the uprights already are.
    edges(lat, "Posts", 0, 1, (s) => s % perSide !== 0),
    edges(lat, "BarsA", 1, 1),
    edges(lat, "BarsB", -1, 1),
  ];
  if (withBottomChord) parts.push(edges(lat, "Chord", 1, 0, (_s, k) => k === 0));
  return merge(g, `${id}All`, parts);
}

/** Build the four legs. `quads` are the four quadrant targets. */
export function buildLegs(g: Graph, quads: NodeHandle, detail: Detail = {}): Parts {
  const levels = legLevels();
  const at = (name: string) => levels.findIndex((l) => l.name === name);
  const kA = at("XVII");

  const lat = stationLattice(g, {
    id: "leg",
    ring: LEG_RING,
    closed: true,
    levels: levels.map(legLevel),
  });

  // The uprights: c, b and d run the full height; a stops at XVII.
  const uprights = chains(lat, "Uprights", (s, k) => s !== A || k <= kA);

  // Horizontal struts at every node and mid-panel above the supports;
  // above XVII the ring is open, with no a to close it. XI's ring is the
  // shaft's (the same line, c to the face centre), so the legs stop below it.
  const kMerge = at("XI");
  const horizontals = edges(
    lat,
    "Horizontals",
    1,
    0,
    (s, k) => k >= at("XXVIII") && k < kMerge && !(k > kA && touchesA(s)),
  );

  // Crosses. Rule "A" draws face f's rising diagonal from station f,
  // rule "B" its falling one from station f + 1, so each face gets both.
  const crossSpan = (k: number): number => {
    const name = levels[k]?.name ?? "";
    if (["XXVIII", "XXVII", "XXVI", "XXV"].includes(name)) return 2; // over the mid
    if (["XXIII", "XXII", "XXI", "XX", "XIX"].includes(name)) return 1; // panels 6-10
    if (k >= kA && k < at("XI")) return 1; // panels 12-17
    return 0; // the supports, mids, and the belts at panels 5 and 11
  };
  const crossOn = (face: number, k: number, span: number) =>
    crossSpan(k) === span && !(k >= kA && touchesA(face));
  const crosses = [2, 1].flatMap((span) => [
    edges(lat, `CrossA${span}`, 1, span, (s, k) => crossOn(s, k, span)),
    edges(lat, `CrossB${span}`, -1, span, (s, k) => crossOn((s + 3) % 4, k, span)),
  ]);

  // The girder belts: the base tie under panel 1, and panels 5 and 11.
  const panel1Slope = (NODES[1]!.outer - NODES[2]!.outer) / (NODES[2]!.y - NODES[1]!.y);
  const tieBottom: NodeLevel = {
    name: "tie",
    y: node("XXVIII").y - 2,
    outer: node("XXVIII").outer + 2 * panel1Slope,
    inner: node("XXVIII").inner + 2 * panel1Slope,
  };
  const belts = merge(g, "legBelts", [
    belt(g, "tie", tieBottom, node("XXVIII"), 7, true),
    belt(g, "belt1", node("XXIV"), node("XXIII"), 5, false),
    belt(g, "belt2", node("XVIII"), node("XVII"), 4, false),
  ]);

  const four = (id: string, h: NodeHandle) => copyToQuadrants(g, id, h, quads);
  // Edge-rule members carry their faces' normals, which the copy must turn.
  const fourMembers = (id: string, h: NodeHandle) => copyMembersToQuadrants(g, id, h, quads);
  const horizontalWeb = webMembers(
    g,
    "legHorizontal",
    fourMembers("legHorizontals4", horizontals),
    MEMBERS.horizontal,
    detail,
    { upright: MEMBERS.upright },
  );
  const bracingWeb = webMembers(
    g,
    "legBracing",
    fourMembers("legBracing4", merge(g, "legCrosses", crosses)),
    MEMBERS.web,
    detail,
    { upright: MEMBERS.upright },
  );
  const uprights4 = four("legUprights4", uprights);
  const seams =
    detail.rivets === true
      ? [
          {
            name: "leg.uprights",
            spawn: seamRivets(g, "legUpright", uprights4, MEMBERS.upright, [1, 0, 0], UPRIGHT_SEAMS),
          },
        ]
      : [];
  return {
    uprights: [skin(g, "legUprightSkin", uprights4, MEMBERS.upright, [1, 0, 0])],
    horizontals: horizontalWeb.meshes,
    bracing: bracingWeb.meshes,
    girders: [faceSkin(g, "legBelt", fourMembers("legBelts4", belts), MEMBERS.girderBar)],
    gussets: gussetMeshes([horizontalWeb, bracingWeb]),
    rivets: [
      ...seams,
      ...rivetOutputs({ "leg.horizontals": horizontalWeb, "leg.bracing": bracingWeb }),
    ],
  };
}
