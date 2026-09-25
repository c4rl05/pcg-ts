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
import {
  CROSS_RIVETS,
  CROSS_THICK,
  crossFootprints,
  crossPlateSets,
  latticeCrossings,
} from "./crossing.js";
import { CROSS_PLATE, type Detail, type Parts } from "./parts.js";
import { EDOUX_PLAN, MEMBERS, NODES, PLAN_BRACING, node, profileAt, tableAt } from "./spec.js";
import {
  JOINT_REACH,
  LACING_STEP,
  UPRIGHT_SEAMS,
  faceSkin,
  flatBars,
  gussetMeshes,
  lineRivets,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

type XZ = readonly [number, number];

/** The plan bracing's members by PL-VIII's letters (A; the rest are the 0.60 family). */
export type PlanGirder = "A" | "long" | "corner" | "lozenge" | "H'" | "H" | "K" | "E" | "F" | "G";

/**
 * One plan girder: its line (x, z) from p to q, how far each end stops
 * short of the point it is drawn to, its depth (chord axis to chord axis)
 * and which girder it is.
 */
export type PlanLine = [p: XZ, q: XZ, trimP: number, trimQ: number, depth: number, girder: PlanGirder];

/** The pattern a node's plan bracing follows (PLAN_BRACING; PL-VIII Figs 13-22), or none. */
export function planPattern(name: string): "hash" | "lozengeH" | "lozengeEF" | "lozengeE" | "corner" | undefined {
  const has = (list: readonly string[]) => list.includes(name);
  if (has(PLAN_BRACING.skip)) return undefined;
  if (has(PLAN_BRACING.hash)) return "hash";
  if (has(PLAN_BRACING.lozengeH)) return "lozengeH";
  if (has(PLAN_BRACING.lozengeEF)) return "lozengeEF";
  if (has(PLAN_BRACING.lozengeE)) return "lozengeE";
  if (has(PLAN_BRACING.corner)) return "corner";
  return undefined;
}

/** How far a member ending on a face's horizontal (0.60, PL-VII Fig. 3) stops short of the face line [derived: 0.30 + 0.05]. */
const AT_FACE = 0.35;

/**
 * The girders of the plan bracing at one node, as plan lines (PLAN_BRACING
 * in spec.ts; PL-VIII Figs 13-22). W is the outer half-width, w the face
 * points' offset from the face's centre line (b and d up to XII; 0 from
 * XI up, where they have merged, XI's 0.25 included). `drift` is how far a
 * column's corner moves along a diagonal girder per metre up or down: a
 * girder d deep meeting a column stops `column sqrt 2 + 0.03 + drift d / 2`
 * short of its axis, clear of the corner above and below the node.
 *
 * s runs along the diagonal x = -z toward +x -z (pile 3, Sud), t along
 * x = z. A lies on x = z; the other diagonal's members leave its s > 0
 * half open up to X (the Edoux's lower car) and its s < 0 half from VIII
 * up (the upper car).
 */
export function planBracingLines(name: string, W: number, w: number, column: number, drift = 0): PlanLine[] {
  const pattern = planPattern(name);
  if (pattern === undefined) return [];
  const d = PLAN_BRACING.depth;
  const dA = PLAN_BRACING.depthA;
  // A girder meeting a square column along a diagonal meets it at a corner.
  const atColumn = (depth: number) => column * Math.SQRT2 + 0.03 + (drift * depth) / 2;
  // A member framing into a girder stops at its chords.
  const atGirder = PLAN_BRACING.chord;
  const lines: PlanLine[] = [];
  const add = (p: XZ, q: XZ, t0: number, t1: number, girder: PlanGirder) =>
    lines.push([p, q, t0, t1, girder === "A" ? dA : d, girder]);
  // A point on the tower's plan by (s, t).
  const st = (s: number, t = 0): XZ => [(s + t) / Math.SQRT2, (t - s) / Math.SQRT2];
  const centre: XZ = [0, 0];
  const cS = W * Math.SQRT2;

  // A, corner to corner along x = z [sourced, every figure].
  add([W, W], [-W, -W], atColumn(dA), atColumn(dA), "A");
  // The K bracket: a stub in along the diagonal from the girder at s =
  // `at` to its apex, and two struts parallel to the faces from the apex
  // back to that girder, `reach` either side (they meet it at 45 degrees).
  const kBracket = (at: number, reach: number, stub: boolean) => {
    const apex = st(at - reach);
    if (stub) add(st(at), apex, atGirder, 0, "K");
    add(apex, st(at, reach), 0, atGirder, "K");
    add(apex, st(at, -reach), 0, atGirder, "K");
    return apex;
  };
  if (pattern === "hash") {
    const col = atColumn(d);
    // The long girders, each from a face point across to the next face's.
    add([W, w], [-w, -W], col, col, "long");
    add([w, W], [-W, -w], col, col, "long");
    add([W, -w], [-w, W], col, col, "long");
    add([-W, w], [w, -W], col, col, "long");
    // Across each leg's corner, from its own b to its own d.
    add([W, w], [w, W], col, col, "corner");
    add([-W, -w], [-w, -W], col, col, "corner");
    add([W, -w], [w, -W], col, col, "corner");
    add([-W, w], [-w, W], col, col, "corner");
    // The long girders parallel to A cross the other diagonal at +-m/sqrt 2.
    const at = (W - w) / Math.SQRT2;
    // H', from the middle of the s < 0 one to A's centre [Figs 13-15].
    add(st(-at), centre, atGirder, 0, "H'");
    // K on the s > 0 one; H beyond it is drawn dashed, not built.
    kBracket(at, PLAN_BRACING.kReach, true);
    return lines;
  }
  if (pattern !== "corner") {
    // The lozenge on the four bd's.
    const col = atColumn(d);
    add([W, 0], [0, W], col, col, "lozenge");
    add([0, W], [-W, 0], col, col, "lozenge");
    add([-W, 0], [0, -W], col, col, "lozenge");
    add([0, -W], [W, 0], col, col, "lozenge");
  }
  // The lozenge's sides cross the other diagonal at +-W/sqrt 2.
  const side = W / Math.SQRT2;
  if (pattern === "lozengeH") {
    // Fig. 18: H' from c (s < 0) to A's centre; H from c (s > 0) through
    // the side to the K bracket; open between K and the centre.
    add(st(-cS), centre, atColumn(d), 0, "H'");
    const apex = st(side - PLAN_BRACING.kReachLozenge);
    add(st(cS), apex, atColumn(d), 0, "H");
    kBracket(side, PLAN_BRACING.kReachLozenge, false);
  } else if (pattern === "lozengeEF") {
    // Figs 19-20: E from c (s > 0) to the side, F on to the centre; H from
    // c (s < 0) to the side; open between that side and the centre.
    add(st(cS), st(side), atColumn(d), atGirder, "E");
    add(st(side), centre, atGirder, 0, "F");
    add(st(-cS), st(-side), atColumn(d), atGirder, "H");
  } else if (pattern === "lozengeE") {
    // Fig. 21: E from c to the centre across the side; H as in Fig. 19.
    add(st(cS), centre, atColumn(d), 0, "E");
    add(st(-cS), st(-side), atColumn(d), atGirder, "H");
  } else if (pattern === "corner") {
    // Fig. 22: E from c to the centre; at the s < 0 corner (-W, W) the G
    // frame, a member off each face meeting at (-W + g, W - g), and H from
    // c to that corner.
    const g = PLAN_BRACING.gFrame;
    const frame: XZ = [-W + g, W - g];
    add(st(cS), centre, atColumn(d), 0, "E");
    add([-W, W - g], frame, AT_FACE, 0, "G");
    add([-W + g, W], frame, AT_FACE, 0, "G");
    add([-W, W], frame, atColumn(d), atGirder, "H");
  }
  return lines;
}

/**
 * The bands at a node of Figs 13-15, "contreventements des poutres en haut
 * et en bas": in each leg's corner, between its corner girder (x + z =
 * W + w in the +x+z leg) and the long girder parallel to it (x + z = W - w),
 * ended by the other two long girders (|x - z| = W - w), a grid of angles
 * parallel to the tower's faces, one in the plane of the top chords and
 * one in the bottom's. Plan segments; A, which crosses two of the bands,
 * cuts the lines it meets.
 */
export function planBracingBandLines(name: string, W: number, w: number): Array<[XZ, XZ]> {
  if (planPattern(name) !== "hash" || w <= 0) return [];
  const m = W - w;
  const cells = Math.max(2, Math.round(m / ((w * Math.SQRT2) / PLAN_BRACING.bandCells)));
  const p = m / cells;
  // Clear of the columns b (x = w) and d (x = W) and of the tower's axis.
  const cs: number[] = [];
  for (let j = -40; j <= cells; j++) {
    const c = w + j * p;
    if (c > 0.4 && c < W - 0.4 && Math.abs(c - w) > 0.4) cs.push(c);
  }
  // Ends stop at the girders' chords: they meet them at 45 degrees.
  const trim = PLAN_BRACING.chord * Math.SQRT2;
  // A's cut, either side of its plane.
  const cut = (Math.max(PLAN_BRACING.chord, PLAN_BRACING.web) + PLAN_BRACING.band + 0.02) * Math.SQRT2;
  const out: Array<[XZ, XZ]> = [];
  for (const c of cs) {
    const lo = Math.max(m - c, c - m) + trim;
    const hi = Math.min(W + w - c, c + m) - trim;
    if (hi - lo < 0.3) continue;
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ] as const) {
      // The line x = c, z in [lo, hi] (and its mirror z = c), in the leg
      // at (sx, sz). A (x = z) runs through the legs where sx = sz.
      const pieces: Array<[number, number]> =
        sx === sz && c > lo && c < hi ? [[lo, c - cut], [c + cut, hi]] : [[lo, hi]];
      for (const [a, b] of pieces) {
        if (b - a < 0.2) continue;
        out.push([[sx * c, sz * a], [sx * c, sz * b]]);
        out.push([[sx * a, sz * c], [sx * b, sz * c]]);
      }
    }
  }
  return out;
}

/**
 * The stretches of the plan line from a (x, z) along unit u for L that
 * stay clear of the Edoux (EDOUX_PLAN) at a girder d deep centred on
 * height y: each obstacle standing over its depth, grown by the girder's
 * half-width and a clearance, is cut out of it; stretches shorter than the
 * girder's depth are dropped. Returned as [from, to] distances along it.
 */
function clearOfEdoux(a: XZ, u: XZ, L: number, y: number, d: number): Array<[number, number]> {
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
 * The plan bracing as members: every girder a flat truss in the vertical
 * plane through its line, chords `depth` apart centred on the node and a
 * post at each end; A (1.00 deep) with an X in every panel, the rest (0.60)
 * a Warren web at about 45 degrees [sourced PL-VIII Fig. 13's details:
 * "Poutre A" an X lattice, "Poutre F", "Poutre B" /\]. Where the Edoux
 * stands in a girder's way the girder stops: it frames into a post or a
 * column, and ends free beside a car's run (`clearOfEdoux`). The bands of
 * Figs 13-15 lie in the planes of the 0.60 girders' chords, their angles
 * squared to the horizontal.
 */
function planBracing(): { chords: SegmentMember[]; web: SegmentMember[]; bands: SegmentMember[] } {
  const from = NODES.findIndex((n) => n.name === PLAN_BRACING.from);
  const chords: SegmentMember[] = [];
  const web: SegmentMember[] = [];
  const bands: SegmentMember[] = [];
  for (const n of NODES.slice(from)) {
    // XII's b and d are still 1.86 apart (Fig. 15's pattern, the Nota);
    // XI's 0.25 is the merge, braced as the bd above it (Fig. 18).
    const w = n.inner > 0.5 ? n.inner : 0;
    const column = ramp0(MEMBERS.upright, n.y + 0.01);
    // The columns' steepest drift either side of the node, along a 45
    // degree girder, per metre up or down.
    const slope = (dy: number) => {
      const p = profileAt(n.y);
      const q = profileAt(n.y + dy);
      return (Math.abs(q.inner - p.inner) + Math.abs(q.outer - p.outer)) / Math.abs(dy);
    };
    const drift = Math.max(slope(-1), slope(1)) / Math.SQRT2;
    for (const [p, q, t0, t1, d, girder] of planBracingLines(n.name, n.outer, w, column, drift)) {
      const L0 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u: XZ = [(q[0] - p[0]) / L0, (q[1] - p[1]) / L0];
      const a0: XZ = [p[0] + u[0] * t0, p[1] + u[1] * t0];
      const nrm: Vec3 = [-u[1], 0, u[0]];
      for (const [f, g] of clearOfEdoux(a0, u, L0 - t0 - t1, n.y, d)) {
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
          if (girder === "A") web.push({ a: at(i, (1 - k) as 0 | 1), b: at(i + 1, k), n: nrm });
        }
      }
    }
    const d = PLAN_BRACING.depth;
    for (const [p, q] of planBracingBandLines(n.name, n.outer, w)) {
      for (const k of [-0.5, 0.5]) {
        bands.push({ a: [p[0], n.y + k * d, p[1]], b: [q[0], n.y + k * d, q[1]], n: [0, 1, 0] });
      }
    }
  }
  return { chords, web, bands };
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

/** The plan bracing's meshes: chords and web squared to their girders' planes, the bands to the horizontal. */
function planBracingMeshes(g: Graph): NodeHandle[] {
  const { chords, web, bands } = planBracing();
  return [
    faceSkin(g, "planBracingChords", segmentMembers(g, "planBracingChordPaths", chords), PLAN_BRACING.chord),
    faceSkin(g, "planBracingWeb", segmentMembers(g, "planBracingWebPaths", web), PLAN_BRACING.web),
    faceSkin(g, "planBracingBands", segmentMembers(g, "planBracingBandPaths", bands), PLAN_BRACING.band),
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
  // The plates over the shaft's own crossings, one per bay per panel where
  // the bay's two diagonals cross. The shaft has no central posts and its
  // horizontals sit at the nodes, so every one of these is a plain
  // four-armed X — eight a panel, since `squareRing(2)` makes each tower
  // face two bays. Unlike the legs the shaft is built WHOLE, with no
  // quadrant copy, so these go straight to `flatBars`.
  const crossList =
    detail.lacedWeb === true || detail.rivets === true
      ? latticeCrossings(lat, 1, () => true, (h) => tableAt(MEMBERS.web, h))
      : [];
  const tune = { ...CROSS_PLATE, ...detail.crossPlate };
  const crossSets = crossList.length > 0 ? crossPlateSets(crossList, tune) : [];
  // No lacing rivet where a plate lies (`WebOpts.covers`).
  const lacing = { ...laced, covers: detail.rivets === true ? crossFootprints(crossList, tune) : [] };
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
    lacing,
  );
  const bracingWeb = webMembers(
    g,
    "shaftBracing",
    crosses,
    MEMBERS.web,
    detail,
    { upright: MEMBERS.upright, reach: JOINT_REACH.diagonal, kinks: true, uprightAt },
    lacing,
  );
  return {
    uprights: [skin(g, "shaftUprightSkin", uprights, MEMBERS.uprightAbove, [1, 0, 0])],
    horizontals: horizontalWeb.meshes,
    bracing: bracingWeb.meshes,
    // The plan bracing at every node from XVI up but IX (PL-VIII Figs 13-22).
    girders: planBracingMeshes(g),
    gussets: [
      ...gussetMeshes([horizontalWeb, bracingWeb]),
      ...crossSets.map((set) =>
        flatBars(
          g,
          `shaftCrossPlates${set.key}`,
          segmentMembers(g, `shaftCrossMembers${set.key}`, set.members),
          set.width,
          CROSS_THICK,
        ),
      ),
    ],
    rivets: [
      ...(detail.rivets === true
        ? crossSets.map((set) => ({
            name: `shaft.crossings.${set.key}`,
            spawn: lineRivets(
              g,
              `shaftCrossRivets${set.key}`,
              segmentMembers(g, `shaftCrossRivetLines${set.key}`, set.rivetLines),
              CROSS_THICK / 2,
              CROSS_RIVETS.pitch,
            ),
          }))
        : []),
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
