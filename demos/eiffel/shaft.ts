/**
 * The shaft: node XI, where the legs merge, to the top of panel 28.
 *
 * Eight uprights: the four outer corners c, and on each face's centre line
 * the merged b/d of the two legs that met there (at XI their axes are
 * still 0.50 m apart; above it they are one member). Each tower face is
 * two X-braced bays side by side, c-bd and bd-c, with horizontals at every
 * node. Panels 19-28 are one straight frustum cut into self-similar
 * panels, every one a 0.94612 copy of the one below — Plate XXXI's node
 * table already carries that, so the lattice just reads it.
 */
import type { Graph } from "pcg-ts";
import { chains, edges, merge, skin, squareRing, stationLattice } from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { MEMBERS, NODES } from "./spec.js";
import { UPRIGHT_SEAMS, rivetOutputs, seamRivets, webMembers } from "./strut.js";

export function buildShaft(g: Graph, detail: Detail = {}): Parts {
  const from = NODES.findIndex((n) => n.name === "XI");
  const levels = NODES.slice(from).map((n) => ({
    y: n.y,
    x0: -n.outer,
    x1: n.outer,
    z0: -n.outer,
    z1: n.outer,
  }));
  const lat = stationLattice(g, { id: "shaft", ring: squareRing(2), closed: true, levels });
  const uprights = chains(lat, "Uprights");
  const horizontals = edges(lat, "Horizontals", 1, 0);
  const crosses = merge(g, "shaftCrosses", [
    edges(lat, "CrossA", 1, 1),
    edges(lat, "CrossB", -1, 1),
  ]);
  const horizontalWeb = webMembers(g, "shaftHorizontal", horizontals, MEMBERS.horizontal, detail);
  const bracingWeb = webMembers(g, "shaftBracing", crosses, MEMBERS.web, detail);
  return {
    uprights: [skin(g, "shaftUprightSkin", uprights, MEMBERS.upright, [1, 0, 0])],
    horizontals: horizontalWeb.meshes,
    bracing: bracingWeb.meshes,
    rivets: [
      ...(detail.rivets === true
        ? [
            {
              name: "shaft.uprights",
              spawn: seamRivets(g, "shaftUpright", uprights, MEMBERS.upright, [1, 0, 0], UPRIGHT_SEAMS),
            },
          ]
        : []),
      ...rivetOutputs({ "shaft.horizontals": horizontalWeb, "shaft.bracing": bracingWeb }),
    ],
  };
}
