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
import { type Graph, type NodeHandle, abs, add, component, le, lt, min, mul, position, ramp } from "pcg-ts";
import {
  type SegmentMember,
  type Vec3,
  chains,
  edges,
  merge,
  segmentMembers,
  skin,
  squareRing,
  stationLattice,
} from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { EDOUX_PLAN, MEMBERS, NODES, PLAN_BRACING, node, profileAt } from "./spec.js";
import {
  JOINT_REACH,
  LACING_STEP,
  UPRIGHT_SEAMS,
  faceSkin,
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

type XZ = readonly [number, number];

/**
 * The girders of the plan bracing at one node, as plan lines (x, z) with
 * how far each end stops short of the point it is drawn to (PLAN_BRACING
 * in spec.ts; PL-VIII Figs 13-22). W is the outer half-width, w the face
 * points' offset from the face's centre line (b and d up to XII; 0 from
 * XI up, where they have merged, XI's 0.25 included).
 */
export function planBracingLines(
  name: string,
  W: number,
  w: number,
  column: number,
  lean = 0,
): Array<[XZ, XZ, number, number]> {
  // A girder meeting a square column along a diagonal meets it at a corner;
  // `lean` is how far the column's corner moves along the girder over the
  // girder's half depth, above or below the node.
  const atColumn = column * Math.SQRT2 + 0.03 + lean;
  // A meets the diamond's girders square: it stops at their chords.
  const atGirder = PLAN_BRACING.chord;
  if ((PLAN_BRACING.aOnly as readonly string[]).includes(name)) {
    return [[[-W, -W], [W, W], atColumn, atColumn]];
  }
  const m = W - w;
  const lines: Array<[XZ, XZ, number, number]> = [];
  const at = (a: XZ, b: XZ) => lines.push([a, b, atColumn, atColumn]);
  if (w > 0) {
    // The long girders, each from a face point across to the next face's.
    at([W, w], [-w, -W]);
    at([w, W], [-W, -w]);
    at([W, -w], [-w, W]);
    at([-W, w], [w, -W]);
    // Across each leg's corner, from its own b to its own d.
    at([W, w], [w, W]);
    at([-W, -w], [-w, -W]);
    at([W, -w], [w, -W]);
    at([-W, w], [-w, W]);
  } else {
    at([W, 0], [0, W]);
    at([0, W], [-W, 0]);
    at([-W, 0], [0, -W]);
    at([0, -W], [W, 0]);
  }
  // A along x = z, from side to side of the diamond x + z = +-m, between
  // the Edoux cars (which run along x = -z).
  lines.push([[-m / 2, -m / 2], [m / 2, m / 2], atGirder, atGirder]);
  return lines;
}

/**
 * The stretches of the plan line from a (x, z) along unit u for L that
 * stay clear of the Edoux (EDOUX_PLAN) at a girder centred on height y:
 * each obstacle standing over the girder's depth, grown by the girder's
 * half-width and a clearance, is cut out of it; stretches shorter than the
 * girder's depth are dropped. Returned as [from, to] distances along it.
 */
function clearOfEdoux(a: XZ, u: XZ, L: number, y: number): Array<[number, number]> {
  const d = PLAN_BRACING.depth;
  const grow = PLAN_BRACING.chord + PLAN_CLEAR;
  const S = (x: number, z: number) => (x - z) / Math.SQRT2;
  const T = (x: number, z: number) => (x + z) / Math.SQRT2;
  const s0 = S(a[0], a[1]);
  const t0 = T(a[0], a[1]);
  const ds = S(u[0], u[1]);
  const dt = T(u[0], u[1]);
  const cuts: Array<[number, number]> = [];
  for (const o of EDOUX_PLAN) {
    if (o.y[1] < y - d / 2 || o.y[0] > y + d / 2) continue;
    let lo = 0;
    let hi = L;
    // Keep lo <= tau <= hi with v0 + tau dv inside [min - grow, max + grow].
    const slab = (v0: number, dv: number, min: number, max: number) => {
      if (Math.abs(dv) < 1e-12) {
        if (v0 < min - grow || v0 > max + grow) hi = -1;
        return;
      }
      const ta = (min - grow - v0) / dv;
      const tb = (max + grow - v0) / dv;
      lo = Math.max(lo, Math.min(ta, tb));
      hi = Math.min(hi, Math.max(ta, tb));
    };
    slab(s0, ds, o.s[0], o.s[1]);
    slab(t0, dt, o.t[0], o.t[1]);
    if (hi > lo) cuts.push([lo, hi]);
  }
  cuts.sort((p, q) => p[0] - q[0]);
  const out: Array<[number, number]> = [];
  let from = 0;
  for (const [lo, hi] of cuts) {
    if (lo - from >= d) out.push([from, lo]);
    from = Math.max(from, hi);
  }
  if (L - from >= d) out.push([from, L]);
  return out;
}

/** A plan girder's clearance past what it stops at [estimated]. */
const PLAN_CLEAR = 0.05;

/**
 * The plan bracing as members: every girder a flat Warren truss in the
 * vertical plane through its line, chords `depth` apart centred on the
 * node, web bars at about 45 degrees and a post at each end. Where the
 * Edoux stands in a girder's way the girder stops: it frames into a post
 * or a column, and ends free beside a car's run (`clearOfEdoux`).
 */
function planBracing(): { chords: SegmentMember[]; web: SegmentMember[] } {
  const from = NODES.findIndex((n) => n.name === PLAN_BRACING.from);
  const d = PLAN_BRACING.depth;
  const chords: SegmentMember[] = [];
  const web: SegmentMember[] = [];
  for (const n of NODES.slice(from)) {
    // XII's b and d are still 1.86 apart (Fig. 15's pattern, the Nota);
    // XI's 0.25 is the merge, braced as the bd above it (Fig. 18).
    const w = n.inner > 0.5 ? n.inner : 0;
    const column = ramp0(MEMBERS.upright, n.y + 0.01);
    // The columns' steepest drift either side of the node, along a 45
    // degree girder, over its half depth.
    const drift = (dy: number) => {
      const p = profileAt(n.y);
      const q = profileAt(n.y + dy);
      return (Math.abs(q.inner - p.inner) + Math.abs(q.outer - p.outer)) / Math.abs(dy);
    };
    const lean = (Math.max(drift(-1), drift(1)) / Math.SQRT2) * (d / 2);
    for (const [p, q, t0, t1] of planBracingLines(n.name, n.outer, w, column, lean)) {
      const L0 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u: XZ = [(q[0] - p[0]) / L0, (q[1] - p[1]) / L0];
      const a0: XZ = [p[0] + u[0] * t0, p[1] + u[1] * t0];
      const nrm: Vec3 = [-u[1], 0, u[0]];
      for (const [f, g] of clearOfEdoux(a0, u, L0 - t0 - t1, n.y)) {
        const a: XZ = [a0[0] + u[0] * f, a0[1] + u[1] * f];
        const L = g - f;
        const count = Math.max(1, Math.round(L / d));
        const at = (i: number, k: 0 | 1): Vec3 => [
          a[0] + (u[0] * L * i) / count,
          n.y + (k - 0.5) * d,
          a[1] + (u[1] * L * i) / count,
        ];
        chords.push({ a: at(0, 0), b: at(count, 0), n: nrm });
        chords.push({ a: at(0, 1), b: at(count, 1), n: nrm });
        web.push({ a: at(0, 0), b: at(0, 1), n: nrm });
        web.push({ a: at(count, 0), b: at(count, 1), n: nrm });
        for (let i = 0; i < count; i++) {
          const k = (i % 2) as 0 | 1;
          web.push({ a: at(i, k), b: at(i + 1, (1 - k) as 0 | 1), n: nrm });
        }
      }
    }
  }
  return { chords, web };
}

/** A (y, w) table read at y, clamped (what `ramp` does, before the cook). */
function ramp0(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y0, v0] = stops[i - 1]!;
    const [y1, v1] = stops[i]!;
    if (y <= y1) return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return stops[stops.length - 1]![1];
}

/** The plan bracing's meshes: chords and web, squared to their girders' planes. */
function planBracingMeshes(g: Graph): NodeHandle[] {
  const { chords, web } = planBracing();
  return [
    faceSkin(g, "planBracingChords", segmentMembers(g, "planBracingChordPaths", chords), PLAN_BRACING.chord),
    faceSkin(g, "planBracingWeb", segmentMembers(g, "planBracingWebPaths", web), PLAN_BRACING.web),
  ];
}

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
    // The plan bracing at every node from XVI up (PL-VIII Figs 13-22).
    girders: planBracingMeshes(g),
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
