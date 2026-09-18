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
 *
 * The horizontals are 600 against the diagonals' 500 [sourced PL-VII
 * Fig. 3], both laced at the plates' step (`LACING_STEP`), and their plates
 * reach 0.90-1.00 m along them from the upright (Fig. 3's "900" and
 * "1000").
 */
import { type Graph, abs, add, component, le, lt, min, mul, position, ramp } from "pcg-ts";
import { chains, edges, merge, skin, squareRing, stationLattice } from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { MEMBERS, NODES, node } from "./spec.js";
import {
  JOINT_REACH,
  LACING_STEP,
  UPRIGHT_SEAMS,
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

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
  const laced = { lacingStep: LACING_STEP };
  // At XI the shaft's bd stands on the two legs' b and d, still 0.50
  // apart axis to axis (PL-VII Fig. 3 "250 250"): a member ending on bd
  // there clears both boxes, 0.50 either side of the face centre, not one.
  // Near a face centre line (within 1 m) and at or below XI [derived].
  const P = position();
  const y = component(P, 1);
  const atMerge = mul(
    le(y, node("XI").y + 0.01),
    lt(min(abs(component(P, 0)), abs(component(P, 2))), 1),
  );
  const uprightAt = add(ramp(y, MEMBERS.upright), mul(atMerge, 0.25));
  const horizontalWeb = webMembers(
    g,
    "shaftHorizontal",
    horizontals,
    MEMBERS.horizontal,
    detail,
    { upright: MEMBERS.upright, reach: JOINT_REACH.horizontal, kinks: true, uprightAt },
    laced,
  );
  const bracingWeb = webMembers(
    g,
    "shaftBracing",
    crosses,
    MEMBERS.web,
    detail,
    { upright: MEMBERS.upright, reach: JOINT_REACH.diagonal, kinks: true, uprightAt },
    laced,
  );
  return {
    uprights: [skin(g, "shaftUprightSkin", uprights, MEMBERS.uprightAbove, [1, 0, 0])],
    horizontals: horizontalWeb.meshes,
    bracing: bracingWeb.meshes,
    gussets: gussetMeshes([horizontalWeb, bracingWeb]),
    rivets: [
      ...(detail.rivets === true
        ? [
            {
              name: "shaft.uprights",
              spawn: seamRivets(
                g,
                "shaftUpright",
                uprights,
                MEMBERS.uprightAbove,
                [1, 0, 0],
                UPRIGHT_SEAMS,
              ),
            },
          ]
        : []),
      ...rivetOutputs({ "shaft.horizontals": horizontalWeb, "shaft.bracing": bracingWeb }),
    ],
  };
}
