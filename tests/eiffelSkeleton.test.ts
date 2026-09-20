/**
 * The Eiffel skeleton against Plate XXXI.
 *
 * The demo's claim is that its large structure is Eiffel's own — every
 * panel node where the plate puts it — while everything smaller is a rule.
 * This holds the first half: it reads the upright PATHS (before they are
 * skinned, where a vertex is exactly a station) and checks every vertex
 * against the node table, and the upright count against the plate's
 * 16 -> 12 -> 8 progression.
 */
import { describe, expect, it } from "vitest";
import {
  type Geometry,
  type NodeHandle,
  cook,
  deserializeGraph,
  firstGeometry,
  serializeGraph,
} from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { UPRIGHT_KINK } from "../demos/eiffel/legs.js";
import { JITTER } from "../demos/eiffel/parts.js";
import {
  EDOUX_PLAN,
  ENTRETOISE,
  LEG_GAP_LACING_500,
  LEG_LACING_500,
  MEMBERS,
  NODES,
  PLAN_BRACING,
  node,
  profileAt,
} from "../demos/eiffel/spec.js";
import { planBracingBandLines, planBracingLines, planPattern } from "../demos/eiffel/shaft.js";
import { UPRIGHT_SEAMS } from "../demos/eiffel/strut.js";

type Vec3 = readonly [number, number, number];

/**
 * How far a BUILT position may sit from where the rule put it. Every
 * output is jittered by at most {@link JITTER} per axis to keep coplanar
 * faces off each other's planes (see `demos/eiffel/parts.ts`), so a
 * distance measured perpendicular to an axis carries up to that much in
 * each of the three components — plus one f32 ULP per axis, because the
 * offset is added into f32 storage and the tower reaches 312 m, where an
 * ULP is 15 µm. Without that term the bound is not a bound: the measured
 * worst case is 99.5% of sqrt(3) * JITTER and the ULP is what pushes it
 * over. 20 µm covers every height this file measures at.
 *
 * The node-id probes this file reads for the paths and the skins tap the
 * graph upstream of the jitter and are still exact; the rivets are read
 * from a declared OUTPUT, so they are the ones that settle. If a probed
 * id is ever moved downstream of a jitter node, the assertions around it
 * — several of which hold two ends level to 5e-7 — fail outright rather
 * than marginally, and this is the constant to reach for.
 */
const SETTLE = (JITTER + 2e-5) * Math.sqrt(3);

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const data = P.data;
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      line.push([data[3 * i] as number, data[3 * i + 1] as number, data[3 * i + 2] as number]);
    }
    out.push(line);
  }
  return out;
}

/** Cook the skeleton with the named intermediate nodes as extra outputs. */
async function cookWith(ids: readonly string[]): Promise<Record<string, Geometry>> {
  const g = buildEiffel();
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  for (const id of ids) {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    out[id] = geo;
  }
  return out;
}

/** The plate's node at height y, if a node (or panel 1-4 midpoint) sits there. */
function nodeAt(y: number): { outer: number; inner: number } | undefined {
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]!;
    if (Math.abs(n.y - y) < 1e-3) return n;
    const m = NODES[i + 1];
    const mid = m === undefined ? NaN : (n.y + m.y) / 2;
    if (m !== undefined && Math.abs(mid - y) < 1e-3) {
      return { outer: (n.outer + m.outer) / 2, inner: (n.inner + m.inner) / 2 };
    }
  }
  return undefined;
}

/** How many of the paths cross height y. */
function crossing(lines: readonly Vec3[][], y: number): number {
  return lines.filter((l) => {
    const ys = l.map((v) => v[1]);
    return Math.min(...ys) < y && Math.max(...ys) > y;
  }).length;
}

/**
 * The nodes where a leg's column turns: the profile's slope (outer or
 * inner) differs between the panels either side. Derived from the plate's
 * table here, not taken from legs.ts, which names its own list.
 */
function kinkedNodes(from: string, to: string): number[] {
  const i0 = NODES.findIndex((n) => n.name === from);
  const i1 = NODES.findIndex((n) => n.name === to);
  const out: number[] = [];
  for (let i = Math.max(i0, 1); i < i1; i++) {
    const [a, b, c] = [NODES[i - 1]!, NODES[i]!, NODES[i + 1]!];
    const s = (p: typeof a, q: typeof a, k: "outer" | "inner") => (q[k] - p[k]) / (q.y - p.y);
    if (Math.abs(s(a, b, "outer") - s(b, c, "outer")) > 1e-4 || Math.abs(s(a, b, "inner") - s(b, c, "inner")) > 1e-4) {
      out.push(b.y);
    }
  }
  return out;
}

/** Distance from p to the nearest segment of any of the lines. */
function toAxis(p: Vec3, lines: readonly Vec3[][]): number {
  let best = Infinity;
  for (const l of lines) {
    for (let i = 0; i + 1 < l.length; i++) {
      const [a, b] = [l[i]!, l[i + 1]!];
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const L2 = ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2;
      const t = Math.max(0, Math.min(1, (ap[0]! * ab[0]! + ap[1]! * ab[1]! + ap[2]! * ab[2]!) / L2));
      best = Math.min(best, Math.hypot(ap[0]! - t * ab[0]!, ap[1]! - t * ab[1]!, ap[2]! - t * ab[2]!));
    }
  }
  return best;
}

/** Instance translations of a rivet output. */
function rivetBases(item: { kind: string } | undefined): Vec3[] {
  if (item === undefined || item.kind !== "instances") throw new Error("no rivets");
  const out: Vec3[] = [];
  for (const b of (item as unknown as { batches: { count: number; transforms: Float32Array }[] }).batches) {
    for (let k = 0; k < b.count; k++) out.push([b.transforms[16 * k + 12]!, b.transforms[16 * k + 13]!, b.transforms[16 * k + 14]!]);
  }
  return out;
}

describe("eiffel skeleton", () => {
  it("puts every leg-upright vertex on Plate XXXI's profile, and a vertex on every node", async () => {
    const { legUprights4, legUprightsUpper4 } = await cookWith(["legUprights4", "legUprightsUpper4"]);
    const lower = polylines(legUprights4!);
    const upper = polylines(legUprightsUpper4!);
    // Cut at XVII, where the section steps: 16 lower chains, 12 upper (a stops).
    expect(lower).toHaveLength(16);
    expect(upper).toHaveLength(12);
    for (const line of [...lower, ...upper]) {
      for (const [x, y, z] of line) {
        // Each coordinate is the outer or inner half-width at that height:
        // the uprights are straight within a panel, so the table read
        // linearly is exact between nodes (the rings a kink either side).
        const p = profileAt(y);
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - p.outer), Math.abs(c - p.inner));
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
        const n = nodeAt(y);
        if (n === undefined) {
          // Off a node, a vertex is one of the rings bracketing a kink.
          const d = Math.min(...NODES.map((m) => Math.abs(m.y - y)));
          expect(d, `vertex at y=${y}`).toBeCloseTo(UPRIGHT_KINK, 4);
        }
      }
      // And every node the chain spans is one of its vertices.
      const ys = line.map((v) => v[1]);
      for (const m of NODES) {
        if (m.y < Math.min(...ys) - 1e-6 || m.y > Math.max(...ys) + 1e-6) continue;
        expect(ys.some((y) => Math.abs(y - m.y) < 1e-4), `node ${m.name} missing`).toBe(true);
      }
    }
    for (const l of lower) {
      expect(Math.min(...l.map((v) => v[1]))).toBeCloseTo(2.5, 3);
      expect(Math.max(...l.map((v) => v[1]))).toBeCloseTo(node("XVII").y, 3);
    }
    for (const l of upper) {
      expect(Math.min(...l.map((v) => v[1]))).toBeCloseTo(node("XVII").y, 3);
      expect(Math.max(...l.map((v) => v[1]))).toBeCloseTo(node("XI").y, 3);
    }
  });

  it("steps the upright section at node XVII, in the skins and in the seam rows alike", async () => {
    // PL-XXXI: sections XVIII-XXIII about 0.87 square, XII-XVII 500. The
    // skins: every ring of the lower chains within a kink of XVII is 0.435
    // half-wide, every ring of the upper chains 0.25 — a chain through XVII
    // would taper across panel 12 instead.
    const g = buildEiffel(1889, { rivets: true });
    for (const id of ["legUprights4", "legUprightsUpper4", "legUprightSkin", "legUprightUpperSkin"]) {
      g.output({ id } as NodeHandle, "out", `probe:${id}`);
    }
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[`probe:${id}`]!)!;
    const lower = polylines(geo("legUprights4"));
    const upper = polylines(geo("legUprightsUpper4"));
    const yXVII = node("XVII").y;
    // The vertices the skin's triangles use.
    const verts = (id: string): Vec3[] => polylines(geo(id)).flat();
    const corner = (r: number) => r * Math.SQRT2;
    const lowerTop = verts("legUprightSkin").filter((v) => Math.abs(v[1] - yXVII) < 0.02);
    expect(lowerTop.length).toBeGreaterThan(0);
    // (A cap's centre sits on the axis; the rim is what has a size.)
    const rim = (v: Vec3, lines: Vec3[][]) => toAxis(v, lines) > 1e-3;
    for (const v of lowerTop.filter((v) => rim(v, lower))) expect(toAxis(v, lower)).toBeCloseTo(corner(0.435), 3);
    const upperAll = verts("legUprightUpperSkin");
    for (const v of upperAll) expect(toAxis(v, upper)).toBeLessThan(corner(0.25) * 1.01);
    for (const v of upperAll.filter((v) => Math.abs(v[1] - yXVII) < 0.02 && rim(v, upper))) {
      expect(toAxis(v, upper)).toBeCloseTo(corner(0.25), 3);
    }
    // The seam rows read the same two tables: a row is `inset` in from a
    // corner of an r-square, so sqrt(r^2 + (r - inset)^2) off the axis.
    const row = (r: number) => Math.hypot(r, r - UPRIGHT_SEAMS.inset);
    const lowerRivets = rivetBases(outputs["rivets.leg.uprights"]![0]).filter((p) => p[1] > node("XVIII").y + 0.1);
    // (Up at XI, b and d close to 0.50 apart and a row between them is as
    // near the other leg's axis as its own; the rows below say the same.)
    const upperRivets = rivetBases(outputs["rivets.leg.uprights.upper"]![0]);
    const upperBelowXI = upperRivets.filter((p) => p[1] < node("XI").y - 0.5);
    expect(lowerRivets.length).toBeGreaterThan(0);
    for (const p of lowerRivets) expect(Math.abs(toAxis(p, lower) - row(0.435))).toBeLessThan(SETTLE);
    for (const p of upperBelowXI) expect(Math.abs(toAxis(p, upper) - row(0.25))).toBeLessThan(SETTLE);
    // The upper box's first row, which would sit on the lower box's top
    // face, is not laid.
    expect(Math.min(...upperRivets.map((p) => p[1]))).toBeGreaterThan(yXVII + 0.05);
  });

  it("puts every shaft-upright vertex on a Plate XXXI node", async () => {
    const { shaftUprights } = await cookWith(["shaftUprights"]);
    const lines = polylines(shaftUprights!);
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      for (const [x, y, z] of line) {
        const n = nodeAt(y);
        expect(n, `vertex at y=${y} is on no node`).toBeDefined();
        // A corner (c) or a face centre line (the merged b/d).
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - n!.outer), c);
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
      }
    }
  });

  it("carries 16 uprights to the 2nd floor, 12 to node XI and 8 above", async () => {
    const { legUprights4, legUprightsUpper4, shaftUprights } = await cookWith([
      "legUprights4",
      "legUprightsUpper4",
      "shaftUprights",
    ]);
    const all = [
      ...polylines(legUprights4!),
      ...polylines(legUprightsUpper4!),
      ...polylines(shaftUprights!),
    ];
    expect(crossing(all, 60)).toBe(16);
    expect(crossing(all, 150)).toBe(12);
    expect(crossing(all, 220)).toBe(8);
  });

  it("squares every copied web member to its leaning face", async () => {
    // Panels 1-4: the legs are parallel prisms leaning 0.50268 (horizontal
    // per vertical) on every face, so a face normal there tilts up by
    // exactly that slope and is square to x or to z. Checked on all four
    // quadrants' copies, where an unturned normal would not even be
    // perpendicular to its own member.
    const { legBracing4RotDone } = await cookWith(["legBracing4RotDone"]);
    const geo = legBracing4RotDone!;
    const faceN = geo.attrs.primitive.get("faceN");
    expect(faceN?.tupleSize).toBe(3);
    const n = faceN!.data;
    const lines = polylines(geo);
    let checked = 0;
    const quadrantsSeen = new Set<string>();
    lines.forEach(([a, b], p) => {
      const nx = n[3 * p] as number;
      const ny = n[3 * p + 1] as number;
      const nz = n[3 * p + 2] as number;
      const e = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
      const eLen = Math.hypot(e[0]!, e[1]!, e[2]!);
      expect(Math.abs(nx * e[0]! + ny * e[1]! + nz * e[2]!) / eLen).toBeLessThan(1e-4);
      if (Math.max(a![1], b![1]) > node("XXIV").y + 1e-3) return;
      expect(Math.min(Math.abs(nx), Math.abs(nz))).toBeLessThan(1e-4);
      expect(Math.abs(ny) / Math.hypot(nx, nz)).toBeCloseTo(0.50268, 3);
      quadrantsSeen.add(`${Math.sign(a![0])},${Math.sign(a![2])}`);
      checked++;
    });
    // 4 legs x 4 faces x 2 diagonals x 4 panels.
    expect(checked).toBe(128);
    expect(quadrantsSeen.size).toBe(4);
  });

  it("rivets the uprights' seams at the rule's pitch: 8 rows per upright", async () => {
    // The samples a spacing resample lays on a path of length L at pitch
    // p: one every p from the start, plus the true end when L is not a
    // whole number of pitches. Rows are left out where the column turns
    // (within a kink ring of a node whose slope changes: the skin's turn),
    // and the upper chains skip their first row, on the lower box's top.
    const g = buildEiffel(1889, { rivets: true });
    g.output({ id: "legUprights4" } as NodeHandle, "out", "probe:lower");
    g.output({ id: "legUprightsUpper4" } as NodeHandle, "out", "probe:upper");
    const { outputs } = await cook(g);
    // XVII turns too, but no chain turns THERE: both end on it.
    const kinks = kinkedNodes("supports", "XI").filter((y) => y !== node("XVII").y);
    // legs.ts drops rows within 3 mm of the rings either side of the node.
    const zone = UPRIGHT_KINK + 0.003;
    const samples = (line: readonly Vec3[]): number[] => {
      const ys: number[] = [];
      const p = UPRIGHT_SEAMS.pitch;
      let L = 0;
      const cum = [0];
      for (let i = 1; i < line.length; i++) {
        const [a, b] = [line[i - 1]!, line[i]!];
        L += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        cum.push(L);
      }
      const at = (s: number) => {
        let i = 1;
        while (i < cum.length - 1 && cum[i]! < s) i++;
        const t = (s - cum[i - 1]!) / (cum[i]! - cum[i - 1]!);
        return line[i - 1]![1] + (line[i]![1] - line[i - 1]![1]) * t;
      };
      const whole = Math.floor(L / p + 1e-6);
      for (let k = 0; k <= whole; k++) ys.push(at(k * p));
      if (L - whole * p > 1e-4) ys.push(line[line.length - 1]![1]);
      return ys;
    };
    const expected = (probe: string, skipStart: boolean) => {
      let n = 0;
      for (const line of polylines(firstGeometry(outputs[probe]!)!)) {
        const ys = samples(line).slice(skipStart ? 1 : 0);
        n += 8 * ys.filter((y) => kinks.every((k) => Math.abs(y - k) >= zone)).length;
      }
      return n;
    };
    for (const [name, probe, skip] of [
      ["rivets.leg.uprights", "probe:lower", false],
      ["rivets.leg.uprights.upper", "probe:upper", true],
    ] as const) {
      const item = outputs[name]![0]!;
      expect(item.kind).toBe("instances");
      if (item.kind !== "instances") return;
      expect(item.batches.map((b) => b.assetId)).toEqual(["rivet"]);
      expect(item.batches.reduce((n, b) => n + b.count, 0), name).toBe(expected(probe, skip));
    }
  });

  it("hangs panel 5's belt like the grande poutre, and screens panel 4 with the Masque", async () => {
    const { legHorizontals4RotDone, legBelt5Chords4RotDone, legMasque6x4RotDone, legMasque0x4RotDone } =
      await cookWith([
        "legHorizontals4RotDone",
        "legBelt5Chords4RotDone",
        "legMasque6x4RotDone",
        "legMasque0x4RotDone",
      ]);
    // Panel 5's chords are PL-VII's "500 x 10" plates, their OUTER faces on
    // the node lines ("Entre semelles 7,5309" = 7.00 x 1.07584, PL-VII
    // Fig. 1): their axes 0.25 in the plane inside XXIV and XXIII, and no
    // node horizontal on either node line.
    const inPlane = Math.hypot(1, (node("XXIV").outer - node("XXIII").outer) / 7);
    const inset = 0.25 / inPlane;
    const ys = polylines(legHorizontals4RotDone!).map(([a]) => a![1]);
    for (const y of [node("XXIV").y, node("XXIII").y]) expect(ys.filter((v) => Math.abs(v - y) < 1e-3)).toHaveLength(0);
    const chordYs = polylines(legBelt5Chords4RotDone!).map(([a]) => a![1]);
    expect(chordYs.filter((v) => Math.abs(v - (node("XXIV").y + inset)) < 1e-3)).toHaveLength(16);
    expect(chordYs.filter((v) => Math.abs(v - (node("XXIII").y - inset)) < 1e-3)).toHaveLength(16);
    // The Masque (PL-VII Fig. 6): its "750" chord 2.746 clear above the
    // "630", which clears panel 4's foot by 0.45, on the two outer faces of every leg, in
    // front of the uprights; its posts on the decorative girder's 3.8825.
    const panel4 = Math.hypot(1, (node("XXV").outer - node("XXIV").outer) / 11);
    const mid = polylines(legMasque6x4RotDone!);
    expect(mid).toHaveLength(8);
    // The screen stands out along the leaning face's normal (0, s, 1) / F,
    // which lifts it: take each point back onto the face plane first.
    const s4 = (node("XXV").outer - node("XXIV").outer) / 11;
    const onFace = (p: Vec3): number => {
      const w = Math.max(Math.abs(p[0]), Math.abs(p[2]));
      let y = p[1];
      // P = Q + t n with Q on the plane: t / F = w - outer(Q_y), so
      // Q_y = P_y - s (w - outer(Q_y)); a contraction (factor s^2).
      for (let i = 0; i < 12; i++) y = p[1] - s4 * (w - profileAt(y).outer);
      return y;
    };
    for (const [a, b] of mid) {
      expect(a![1]).toBeCloseTo(b![1], 6);
      const v = (onFace(a!) - node("XXV").y) * panel4;
      expect(v).toBeCloseTo(0.45 + 0.63 + 2.746 + 0.375, 2);
    }
    for (const [a] of polylines(legMasque0x4RotDone!)) {
      const [u, w] = [Math.abs(a![0]), Math.abs(a![2])].sort((m, n) => m - n);
      expect(Math.abs(u! / 3.8825 - Math.round(u! / 3.8825))).toBeLessThan(1e-3);
      expect(w!).toBeGreaterThan(profileAt(a![1]).outer + 0.41);
    }
  });

  it("draws the Masque's bars at the plate's angles, its lower V's at both chords, and fills its top corners", async () => {
    const got = await cookWith(["masqueUpABars", "masqueUpBBars", "masqueLowABars", "masqueLowBBars", "masqueFillet0Bars", "masqueFillet1Bars"]);
    const s4 = (node("XXV").outer - node("XXIV").outer) / 11;
    const F4 = Math.hypot(1, s4);
    // A face-0 member (z = outer + the standoff), in the face's (u, v): u is
    // x, and v the height in the plane, from the member's lean.
    const face0 = (lines: Vec3[][]) => lines.filter(([a, b]) => a![2] > a![0] && b![2] > b![0]);
    const angle = ([a, b]: Vec3[]) =>
      (Math.atan2(Math.hypot(b![1] - a![1], b![2] - a![2]), Math.abs(b![0] - a![0])) * 180) / Math.PI;
    // The upper X's at 47.5 degrees in the plane ("\" 48.5, "/" 46.5 read).
    for (const id of ["masqueUpABars", "masqueUpBBars"]) {
      const bars = face0(polylines(got[id]!));
      expect(bars.length, id).toBeGreaterThan(3);
      for (const l of bars) expect(angle(l)).toBeCloseTo(47.5, 3);
    }
    // The lower lattice: each bar 1.5 half-pitches along over the 2.746
    // clear, plus 0.23 into the 750 and less 0.05 short of the 630, so
    // V's meet at both chords; the 750's on the post grid (3.8825 / 2
    // from the tower's axis).
    const p = 3.8825 / 2;
    const rise = 2.746 + 0.23 - 0.05;
    const low = [...face0(polylines(got.masqueLowABars!)), ...face0(polylines(got.masqueLowBBars!))];
    expect(low.length).toBeGreaterThan(12);
    const midLo = 0.45 + 0.63 + 2.746;
    let apexes = 0;
    for (const [a, b] of low) {
      const [lo, hi] = a![1] < b![1] ? [a!, b!] : [b!, a!];
      const dir = Math.sign(hi[0] - lo[0]);
      expect(Math.abs(hi[0] - lo[0]) / Math.hypot(hi[1] - lo[1], hi[2] - lo[2])).toBeCloseTo((1.5 * p) / rise, 3);
      // Its upper end on the 750 chord's lower edge: the V's apex is 0.23
      // further along its line, on the grid. (The screen stands out along
      // the face's normal, which lifts it: back onto the plane first.)
      let yPlane = hi[1];
      for (let i = 0; i < 12; i++) yPlane = hi[1] - s4 * (hi[2] - profileAt(yPlane).outer);
      const v = (yPlane - node("XXV").y) * F4;
      if (Math.abs(v - midLo) > 0.02) continue;
      const apex = hi[0] + dir * ((1.5 * p) / rise) * 0.23;
      expect(Math.abs(apex / p - Math.round(apex / p)), `apex at ${apex.toFixed(3)}`).toBeLessThan(0.01);
      apexes++;
    }
    expect(apexes).toBeGreaterThan(6);
    // The rounded top corners, on both faces of every leg that carry it.
    for (const id of ["masqueFillet0Bars", "masqueFillet1Bars"]) {
      const f = polylines(got[id]!);
      expect(f.length, id).toBeGreaterThan(8);
      expect(face0(f).length * 2).toBe(f.length);
    }
  });

  it("builds the members the plates add: central posts, panel 10's two X's, the gap bracing", async () => {
    const ids = ["legPosts4RotDone", "legBracing4RotDone", "legGapBracing4RotDone", "legGapHorizontals4RotDone"];
    const got = await cookWith(ids);
    const [posts, bracing, gapX, gapH] = ids.map((id) => polylines(got[id]!));
    // A post on every face of every leg: the base tie and panel 1 (one
    // stretch: no horizontal at XXVIII, only the ties' top chord plate),
    // panels 2-4, 6-9 and panel 10 above its band [PL-IX Fig. 8, PL-VII
    // Figs 1, 2, 5].
    expect(posts).toHaveLength(4 * 4 * 9);
    for (const [a, b] of posts as [Vec3, Vec3][]) {
      // On the face's centre line: one coordinate is the outer or inner
      // half-width, the other their mean, at both ends.
      for (const [x, y, z] of [a, b]) {
        const p = profileAt(y);
        const mid = (p.outer + p.inner) / 2;
        const [u, v] = [Math.abs(x), Math.abs(z)].sort((m, n) => Math.abs(m - mid) - Math.abs(n - mid));
        expect(Math.abs(u! - mid), `post end at y=${y}`).toBeLessThan(2e-3);
        expect(Math.min(Math.abs(v! - p.outer), Math.abs(v! - p.inner))).toBeLessThan(2e-3);
      }
      // INTO the member it stands on, not short of it. The leg drifts
      // sideways as it rises, so the post meets a node's horizontal
      // obliquely while its cap is cut square: an end placed where the
      // whole cap cleared the horizontal left the far corner up to 0.38 m
      // clear of it — half a member wide, read as a post that stops short.
      // So the axis end sits INSIDE the horizontal's box, past its near
      // face and never past the node line, and the far corner clears.
      // The belts are the exception (postStretch caps the pull-back at
      // hw): their chord plates only touch XXIV, XXIII and XVIII, with
      // their bodies inside panels 5 and 11, so a post stops clear of
      // those and never enters them.
      for (const y of [a[1], b[1]]) {
        // The search reaches 1 m, well past the 0.4 bound, so an end that
        // stopped SHORT of its horizontal is caught by the bound instead
        // of falling outside the search and being skipped. (It has to stay
        // under 1.34, the tie's own lo end below XXVIII, which stands on a
        // chord plate rather than a horizontal and is not one of these.)
        const n = NODES.find((m) => Math.abs(m.y - y) < 1 && !["XXIV", "XXIII", "XVIII"].includes(m.name));
        if (n !== undefined) {
          const hw = MEMBERS.horizontal.find(([at]) => at >= n.y)?.[1] ?? 0;
          // Signed, from the side the member is on: a lower end stands on
          // the node below it, an upper end hangs under the node above.
          // So a positive d is an end that has not crossed the node line,
          // and d < hw is one that reaches its horizontal. The measure is
          // vertical while hw is a half-depth across the face's in-plane
          // normal, which makes the bound conservative by about a tenth.
          const d = y === Math.min(a[1], b[1]) ? y - n.y : n.y - y;
          expect(d, `post end at y=${y} crosses node ${n.name}`).toBeGreaterThan(0);
          expect(d, `post end at y=${y} short of node ${n.name}'s horizontal`).toBeLessThan(hw);
        }
        const inPanel5 = y > node("XXIV").y - 0.02 && y < node("XXIII").y + 0.02;
        expect(inPanel5, `post end at y=${y} in panel 5`).toBe(false);
      }
    }
    // Panel 10: above the band, two X's per face, 600 [PL-VII Fig. 2].
    const band = node("XIX").y + 3.6071 / Math.hypot(1, (19.16 - 16.8134) / 10);
    const p10 = bracing!.filter(([a, b]) => Math.min(a![1], b![1]) > node("XIX").y - 1e-3 && Math.max(a![1], b![1]) < node("XVIII").y + 1e-3);
    expect(p10).toHaveLength(4 * 4 * 2 * 2);
    for (const [a, b] of p10) {
      expect(Math.min(a![1], b![1])).toBeCloseTo(band, 3);
      expect(Math.max(a![1], b![1])).toBeCloseTo(node("XVIII").y, 3);
    }
    expect(MEMBERS.web.find(([y]) => y > 100.6 && y < 110.6)?.[1]).toBe(0.3);
    // The gap between adjacent legs: an X in panels 12-16 and a horizontal
    // at XVI-XII, on each tower face, from b of one leg to d of the next.
    expect(gapX).toHaveLength(4 * 5 * 2);
    expect(gapH).toHaveLength(4 * 5);
    for (const [a, b] of [...gapX!, ...gapH!] as [Vec3, Vec3][]) {
      for (const [x, y, z] of [a, b]) {
        const n = NODES.find((m) => Math.abs(m.y - y) < 1e-3);
        expect(n, `gap member end at y=${y}`).toBeDefined();
        expect(n!.y).toBeGreaterThan(node("XVIII").y);
        expect(n!.y).toBeLessThan(node("XI").y);
        // On a tower face (|x| or |z| is the outer half-width), at b or d.
        const [u, v] = [Math.abs(x), Math.abs(z)].sort((m, q) => m - q);
        expect(Math.abs(v! - n!.outer)).toBeLessThan(2e-3);
        expect(Math.abs(u! - n!.inner)).toBeLessThan(2e-3);
      }
      // Across the gap: its ends on opposite sides of the face's centre line.
      const across = Math.abs(a[0]) < Math.abs(a[2]) ? 0 : 2;
      expect(Math.sign(a[across]) * Math.sign(b[across])).toBe(-1);
    }
  });

  it("frames the belts as PL-VII draws them: chord plates, posts on the tower-axis grids, X'd ties", async () => {
    const got = await cookWith([
      "legHorizontals4RotDone",
      "legBelt11Chords4RotDone",
      "legBelt5Posts",
      "legBelt5BarsUp",
      "legBelt5BarsDown",
      "legBelt5Gussets",
      "legBelt11Posts",
      "legBelt11BarsUp",
      "legBelt11BarsDown",
      "legBelt11Gussets",
      "tieTopChord",
      "tieAChord",
      "tieBChord",
      "tieABarsA",
      "tieABarsB",
      "legBand10Up",
    ]);
    const slope = (lo: string, hi: string, key: "outer" | "inner" = "outer") =>
      (node(lo)[key] - node(hi)[key]) / (node(hi).y - node(lo).y);
    // Panel 11: "450 x 8" plates on the node lines replace the XVIII and
    // XVII horizontals; their axes 0.225 in the plane inside the lines. No
    // horizontal at XXVIII either: the ties' top chord plate is the only one.
    const hs = polylines(got.legHorizontals4RotDone!).map(([a]) => a![1]);
    for (const y of [node("XXVIII").y, node("XVIII").y, node("XVII").y]) {
      expect(hs.filter((v) => Math.abs(v - y) < 1e-3)).toHaveLength(0);
    }
    const F11 = Math.hypot(1, slope("XVIII", "XVII"));
    const chordYs = polylines(got.legBelt11Chords4RotDone!).map(([a, b]) => (a![1] + b![1]) / 2);
    expect(chordYs.filter((y) => Math.abs(y - (node("XVIII").y + 0.225 / F11)) < 1e-3)).toHaveLength(16);
    expect(chordYs.filter((y) => Math.abs(y - (node("XVII").y - 0.225 / F11)) < 1e-3)).toHaveLength(16);
    // Posts square to the chords (one coordinate constant along each) on
    // the grids from the tower's axis: 3.36268 in panel 11 (three to an
    // outer face), 3.8825 in panel 5 (four).
    const onFace0 = (p: Vec3, tol = 1e-3) => Math.abs(p[2] - profileAt(p[1]).outer) < tol;
    const onGrid = (lines: Vec3[][], pitch: number, count: number) => {
      for (const [a, b] of lines) expect(Math.abs(a![0] - b![0]) < 1e-6 || Math.abs(a![2] - b![2]) < 1e-6).toBe(true);
      // The leg is built in the +x+z quadrant: a post on face 0 (z = outer) keeps x.
      const face0 = lines.filter(([a, b]) => Math.abs(a![0] - b![0]) < 1e-6 && onFace0(a!));
      expect(face0).toHaveLength(count);
      for (const [a] of face0) expect(Math.abs(a![0] / pitch - Math.round(a![0] / pitch))).toBeLessThan(1e-4);
    };
    onGrid(polylines(got.legBelt11Posts!), 3.36268, 3);
    onGrid(polylines(got.legBelt5Posts!), 3.8825, 4);
    // Panel 11's lattice is an X in every bay AND the diamond: at the
    // belt's mid-depth the bars cross at every post and every bay centre.
    // The two families stand 5 mm either side of the face plane.
    const mid11 = (node("XVIII").y + node("XVII").y) / 2;
    const bars11 = [...polylines(got.legBelt11BarsUp!), ...polylines(got.legBelt11BarsDown!)].filter(
      ([a, b]) => onFace0(a!, 0.01) && onFace0(b!, 0.01),
    );
    const xs = bars11.map(([a, b]) => a![0] + ((b![0] - a![0]) * (mid11 - a![1])) / (b![1] - a![1]));
    for (const k of [2, 2.5, 3, 3.5, 4]) {
      expect(xs.filter((x) => Math.abs(x - k * 3.36268) < 3e-3), `bars at ${k} pitches`).toHaveLength(2);
    }
    // Their working lines run node line to node line: in the plane, the
    // panel's height over one pitch (panel 11, "55°49′49″") or two (panel
    // 5, 44 degrees).
    const riseOverRun = ([a, b]: Vec3[]) => Math.hypot(b![1] - a![1], b![2] - a![2]) / Math.abs(b![0] - a![0]);
    for (const [lo, hi, run, ids] of [
      ["XVIII", "XVII", 3.36268, ["legBelt11BarsUp", "legBelt11BarsDown"]],
      ["XXIV", "XXIII", 2 * 3.8825, ["legBelt5BarsUp", "legBelt5BarsDown"]],
    ] as const) {
      const H = (node(hi).y - node(lo).y) * Math.hypot(1, slope(lo, hi));
      const face0 = ids.flatMap((id) => polylines(got[id]!)).filter(([a, b]) => onFace0(a!, 0.01) && onFace0(b!, 0.01));
      expect(face0.length).toBeGreaterThan(4);
      for (const l of face0) expect(riseOverRun(l)).toBeCloseTo(H / run, 3);
    }
    // A gusset plate either side of the lattice at the mid-height of every
    // post (each reaches it), as tall as drawn.
    for (const [id, posts, lo, hi, height] of [
      ["legBelt5Gussets", "legBelt5Posts", "XXIV", "XXIII", 0.88],
      ["legBelt11Gussets", "legBelt11Posts", "XVIII", "XVII", 1.01],
    ] as const) {
      const gs = polylines(got[id]!);
      expect(gs).toHaveLength(2 * polylines(got[posts]!).length);
      const F = Math.hypot(1, slope(lo, hi));
      for (const [a, b] of gs) {
        expect(Math.hypot(b![0] - a![0], b![1] - a![1], b![2] - a![2])).toBeCloseTo(height, 4);
        expect(((a![1] + b![1]) / 2 - (node(lo).y + node(hi).y) / 2) * F).toBeCloseTo(0, 1);
      }
    }
    // The base ties' bottom chords: "2,987" below XXVIII in the plane (A)
    // and "2,765" over the support line (B) [PL-VII Figs 1, 5]; the top
    // chord, on all four faces, 0.29 above XXVIII.
    const F1 = Math.hypot(1, slope("XXVIII", "XXVII"));
    for (const [id, y, count] of [
      ["tieAChord", node("XXVIII").y - 2.987 / F1, 2],
      ["tieBChord", 2.5 + 2.765 / F1, 2],
      ["tieTopChord", node("XXVIII").y + 0.29 / F1, 4],
    ] as const) {
      const lines = polylines(got[id]!);
      expect(lines).toHaveLength(count);
      for (const [a, b] of lines) {
        expect(a![1]).toBeCloseTo(y, 3);
        expect(b![1]).toBeCloseTo(y, 3);
      }
    }
    // Tie A: an X in every bay but the one across the central post, whose
    // joints flank it 0.55 either side; so as many rising bars as falling
    // ones, and six X'd bays to a face (two of 3.05 each side of the post,
    // and the short end bays). No bar up a joint.
    const rising = polylines(got.tieABarsA!);
    const falling = polylines(got.tieABarsB!);
    expect(rising).toHaveLength(falling.length);
    expect(rising).toHaveLength(2 * 6);
    for (const [a, b] of [...rising, ...falling]) {
      const hi = a![1] > b![1] ? a! : b!;
      const p = profileAt(hi[1]);
      // On face 0 (z = outer) a station keeps x; on face 3 (x = outer), z.
      const u = Math.abs(hi[2] - p.outer) < 1e-3 ? hi[0] : hi[2];
      // Its upper joint: 0.55 + k 3.05 off the centre line, or an upright.
      const fromCentre = Math.abs(u - (p.outer + p.inner) / 2);
      const k = (fromCentre - 0.55) / 3.05;
      const onUpright = Math.abs(u - p.inner) < 1e-3 || Math.abs(u - p.outer) < 1e-3;
      expect(onUpright || Math.abs(k - Math.round(k)) < 1e-3, `joint ${fromCentre.toFixed(3)} off the centre`).toBe(true);
    }
    // Panel 10's band: flats every 1.59 along the chords, from the XIX
    // horizontal's top edge.
    const F10 = Math.hypot(1, slope("XIX", "XVIII"));
    const up = polylines(got.legBand10Up!).map(([a, b]) => (a![1] < b![1] ? a! : b!));
    const low = Math.min(...up.map((p) => p[1]));
    // (The flats stand 5 mm off the face plane, 1 mm higher.) They run from
    // the XIX horizontal's axis.
    expect((low - node("XIX").y) * F10).toBeCloseTo(0, 2);
    // On face 0 (z = outer), the flats' lower ends, on the chord.
    const face0 = up.filter((p) => p[2] > profileAt(p[1]).outer - 1e-3);
    const low0 = Math.min(...face0.map((p) => p[1]));
    const starts = face0.filter((p) => Math.abs(p[1] - low0) < 1e-4).map((p) => p[0]);
    for (const x of starts) expect(Math.abs(x / 1.59 - Math.round(x / 1.59))).toBeLessThan(1e-3);
    expect(starts.length).toBeGreaterThan(4);
  });

  it("laces the legs' 500s in panels 12-17 at the plate's steps, the shaft's at 0.68", async () => {
    const g = buildEiffel(1889, { lacedWeb: true });
    const probes = ["legBracingSamples", "shaftBracingSamples", "legGapBracingSamples", "legEntretoiseSamples", "legEntretoiseChords"];
    for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    // A strut's samples are its lacing stations: every step, bar the last.
    const steps = (id: string) =>
      polylines(firstGeometry(outputs[`probe:${id}`]!)!).map((l) => {
        const mid = l[1]!;
        const prev = l[0]!;
        return { y: (l[0]![1] + l[l.length - 1]![1]) / 2, step: Math.hypot(mid[0] - prev[0], mid[1] - prev[1], mid[2] - prev[2]) };
      });
    const leg = steps("legBracingSamples");
    for (const [lo, hi, step] of LEG_LACING_500) {
      const inPanel = leg.filter((s) => s.y > node(lo).y && s.y < node(hi).y);
      expect(inPanel, `panel ${lo}-${hi}`).toHaveLength(16);
      for (const s of inPanel) expect(s.step).toBeCloseTo(step, 4);
    }
    for (const s of leg.filter((x) => x.y < node("XIX").y)) expect(s.step).toBeCloseTo(1.0, 4);
    for (const s of steps("shaftBracingSamples")) expect(s.step).toBeCloseTo(0.68, 4);
    // The gap X's, panels 12-16, laced as openly as the legs' own 500s
    // (PL-VII: 0.70-1.13 read), not at the shaft's 0.68: two arms of four
    // tower faces' X's a panel.
    const gap = steps("legGapBracingSamples");
    for (const [lo, hi, step] of LEG_GAP_LACING_500) {
      const inPanel = gap.filter((s) => s.y > node(lo).y && s.y < node(hi).y);
      expect(inPanel, `gap panel ${lo}-${hi}`).toHaveLength(8);
      for (const s of inPanel) expect(s.step).toBeCloseTo(step, 4);
    }
    // The entretoises: laced at 0.79 (Fig. 8's 0.556 over cos 45), a
    // 1.20 x 0.7156 section ("600" +
    // "600", "715.6"): their chords 0.555 either side of the girder's
    // vertical plane and 0.3128 above and below its node (inside 0.045).
    for (const s of steps("legEntretoiseSamples")) expect(s.step).toBeCloseTo(ENTRETOISE.step, 4);
    const chords = polylines(firstGeometry(outputs["probe:legEntretoiseChords"]!)!);
    expect(chords.length).toBeGreaterThan(0);
    for (const l of chords) {
      const [a, b] = [l[0]!, l[l.length - 1]!];
      const n = NODES.find((m) => Math.abs(Math.abs(a[1] - m.y) - 0.3128) < 1e-3);
      expect(n && (ENTRETOISE.nodes as readonly string[]).includes(n.name), `chord at y ${a[1].toFixed(3)}`).toBe(true);
      // Off the leg's d-b line (x + z = inner + outer in the +x+z leg, and
      // its copies): the other legs are the same line turned, so measure
      // across the member in plan from the chord's own direction.
      const t = [b[0] - a[0], b[2] - a[2]];
      const L = Math.hypot(t[0]!, t[1]!);
      const across = Math.abs((a[0] * t[1]! - a[2] * t[0]!) / L);
      // The d-b line passes (outer, inner) and (inner, outer): its distance
      // from the tower's axis is (inner + outer) / sqrt 2.
      expect(Math.abs(across - (n!.inner + n!.outer) / Math.SQRT2)).toBeCloseTo(0.555, 3);
    }
  });

  it("braces the tower in plan at every node from XVI up, and each leg across its diagonal below", async () => {
    const { planBracingChordPaths, legEntretoises4 } = await cookWith([
      "planBracingChordPaths",
      "legEntretoises4",
    ]);
    const chords = polylines(planBracingChordPaths!);
    const from = NODES.findIndex((n) => n.name === PLAN_BRACING.from);
    // Members by pattern (PL-VIII Figs 13-22): A, then 8 girders + H' + the
    // K bracket's stub and two struts up to XII; the lozenge + H' + H + K's
    // two struts at XI and X; the lozenge + E, F, H at VIII-VI; the lozenge
    // + E, H at V-II; E, two G's and H at I and top28; nothing at IX.
    const expected: Record<string, number> = { hash: 13, lozengeH: 9, lozengeEF: 8, lozengeE: 7, corner: 5 };
    for (const n of NODES.slice(from)) {
      const w = n.inner > 0.5 ? n.inner : 0;
      const lines = planBracingLines(n.name, n.outer, w, 0.25);
      const pattern = planPattern(n.name);
      if (pattern === undefined) {
        // IX: the plancher intermédiaire, no plan bracing [PL-VIII Fig. 17].
        expect(lines, `node ${n.name}`).toHaveLength(0);
        expect(chords.filter(([a]) => Math.abs(a![1] - n.y) < 1), `node ${n.name}`).toHaveLength(0);
        continue;
      }
      expect(lines, `node ${n.name}`).toHaveLength(expected[pattern]!);
      const onLine = ([x, , z]: Vec3, [p, q]: (typeof lines)[number]) =>
        Math.abs((q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0])) / Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-3;
      // A is "1.000" deep, the rest "599.3" [PL-VIII Figs 16, 17, 24]: each
      // girder (or stretch of one) has its top chord right above its bottom
      // one, at its own depth, and lies on one of the node's lines of that depth.
      for (const d of [PLAN_BRACING.depthA, PLAN_BRACING.depth]) {
        const at = chords.filter(([a]) => Math.abs(a![1] - (n.y - d / 2)) < 1e-3);
        expect(chords.filter(([a]) => Math.abs(a![1] - (n.y + d / 2)) < 1e-3), `node ${n.name}`).toHaveLength(at.length);
        const ofDepth = lines.filter((l) => l[4] === d);
        for (const [a, b] of at) expect(ofDepth.some((l) => onLine(a!, l) && onLine(b!, l)), `node ${n.name}`).toBe(true);
        // Every line keeps at least one stretch.
        for (const l of ofDepth) expect(at.some(([a, b]) => onLine(a!, l) && onLine(b!, l)), `${n.name} ${l[5]}`).toBe(true);
        // Every girder in the tower's section.
        for (const [a, b] of at) for (const p of [a!, b!]) expect(Math.max(Math.abs(p[0]), Math.abs(p[2]))).toBeLessThanOrEqual(n.outer);
      }
      // A runs corner to corner along x = z, cut in two by the Edoux's
      // central guide post, which it frames into from both sides.
      const a1 = chords.filter(([a, b]) => Math.abs(a![1] - (n.y - 0.5)) < 1e-3 && Math.abs(a![0] - a![2]) < 1e-4 && Math.abs(b![0] - b![2]) < 1e-4);
      expect(a1, `node ${n.name}`).toHaveLength(2);
      const reach = Math.max(...a1.flatMap(([a, b]) => [Math.abs(a![0]), Math.abs(b![0])]));
      expect(n.outer - reach, `A short of c at ${n.name}`).toBeLessThan(0.45);
      expect(n.outer - reach).toBeGreaterThan(0.25);
    }
    // No chord enters the Edoux: its posts, its columns or its cars' runs.
    for (const [a, b] of chords) {
      for (let i = 0; i <= 50; i++) {
        const x = a![0] + ((b![0] - a![0]) * i) / 50;
        const y = a![1];
        const z = a![2] + ((b![2] - a![2]) * i) / 50;
        const [s, t] = [(x - z) / Math.SQRT2, (x + z) / Math.SQRT2];
        for (const o of EDOUX_PLAN) {
          if (y < o.y[0] || y > o.y[1]) continue;
          const gap = Math.max(o.s[0] - s, s - o.s[1], o.t[0] - t, t - o.t[1]);
          expect(gap, `${o.what} at y ${y.toFixed(2)}`).toBeGreaterThan(PLAN_BRACING.chord);
        }
      }
    }
    // Nothing below XVI.
    expect(chords.filter(([a]) => a![1] < node(PLAN_BRACING.from).y - 1)).toHaveLength(0);
    // The entretoises: d to b of every leg at the tops of panels 1-3, 6, 7;
    // where something of the lifts crosses their line, two, each from its
    // upright to `openHalf` short of the leg's diagonal: at XXVII-XXV and
    // XXI in the two Otis legs, where their car crosses it. Whole in the
    // Roux legs.
    const ent = polylines(legEntretoises4!);
    const halves = new Map<string, number>();
    const wholes = new Map<string, number>();
    for (const [a, b] of ent as [Vec3, Vec3][]) {
      const n = NODES.find((m) => Math.abs(m.y - a[1]) < 1e-4);
      expect(n && (ENTRETOISE.nodes as readonly string[]).includes(n.name)).toBe(true);
      expect(b[1]).toBeCloseTo(a[1], 6);
      const full = (n!.outer - n!.inner) * Math.SQRT2;
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (Math.abs(L - full) < 1e-3) {
        wholes.set(n!.name, (wholes.get(n!.name) ?? 0) + 1);
      } else {
        expect(L).toBeCloseTo(full / 2 - ENTRETOISE.openHalf, 3);
        // The free end stands openHalf off the leg's diagonal (|x| = |z|).
        const off = (p: Vec3) => Math.abs(Math.abs(p[0]) - Math.abs(p[2])) / Math.SQRT2;
        expect(Math.min(off(a), off(b))).toBeCloseTo(ENTRETOISE.openHalf, 3);
        halves.set(n!.name, (halves.get(n!.name) ?? 0) + 1);
      }
    }
    for (const name of ENTRETOISE.nodes) {
      const open = (ENTRETOISE.openAt as readonly string[]).includes(name);
      expect([wholes.get(name) ?? 0, halves.get(name) ?? 0], name).toEqual(open ? [2, 4] : [4, 0]);
    }
  });

  it("bands the plan bracing's corner bays at XVI-XII in the planes of its chords", async () => {
    const { planBracingBandPaths } = await cookWith(["planBracingBandPaths"]);
    const bands = polylines(planBracingBandPaths!);
    const d = PLAN_BRACING.depth;
    let total = 0;
    for (const n of NODES) {
      const w = n.inner > 0.5 ? n.inner : 0;
      const lines = planBracingBandLines(n.name, n.outer, w);
      const here = bands.filter(([a]) => Math.abs(a![1] - n.y) < d);
      // Top and bottom: one member per line in each chord plane.
      expect(here, `node ${n.name}`).toHaveLength(2 * lines.length);
      if (planPattern(n.name) !== "hash") {
        expect(lines, `node ${n.name}`).toHaveLength(0);
        continue;
      }
      // PL-VIII Figs 13-15: a sparse net at XVI, a grid at XIV, dense at XIII.
      expect(lines.length, `node ${n.name}`).toBeGreaterThan(0);
      total += here.length;
      for (const [a, b] of here as [Vec3, Vec3][]) {
        // Level, in a chord plane, parallel to a tower face.
        expect(a[1]).toBeCloseTo(b[1], 6);
        expect(Math.abs(Math.abs(a[1] - n.y) - d / 2)).toBeLessThan(1e-4);
        expect(Math.min(Math.abs(a[0] - b[0]), Math.abs(a[2] - b[2]))).toBeLessThan(1e-6);
        // Inside its leg's band: between the corner girder (|x| + |z| =
        // W + w) and the long girder (W - w), and within |x - z| <= W - w.
        for (const [x, , z] of [a, b]) {
          const [u, v] = [Math.abs(x), Math.abs(z)];
          expect(u + v).toBeGreaterThan(n.outer - w - 1e-6);
          expect(u + v).toBeLessThan(n.outer + w + 1e-6);
          expect(Math.abs(u - v)).toBeLessThan(n.outer - w + 1e-6);
        }
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it("lights its flat bars: unit normals, out of every box, the way its triangles wind", async () => {
    const ids = [
      "legMasque0Lit",
      "legMasque1Lit",
      "legMasque8Lit",
      "legBelt5ChordsLit",
      "legBelt11ChordsLit",
      "legBelt5PostsLit",
      "legBelt11BarsUpLit",
      "legBelt5GussetsLit",
      "tieTopChordLit",
      "tieAChordLit",
      "legBand10UpLit",
      "legEntretoiseLit",
    ];
    const got = await cookWith(ids);
    for (const id of ids) {
      const geo = got[id]!;
      const P = geo.attrs.point.get("P")!.data;
      const Nn = geo.attrs.point.get("normal")?.data;
      expect(Nn, `${id} carries no normal`).toBeDefined();
      let checked = 0;
      for (let p = 0; p < geo.primitiveCount; p++) {
        const s = geo.primVertexStart[p] as number;
        const ids3 = [0, 1, 2].map((k) => geo.vertexToPoint[s + k] as number);
        const v = ids3.map((i) => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
        const e1 = [v[1]![0]! - v[0]![0]!, v[1]![1]! - v[0]![1]!, v[1]![2]! - v[0]![2]!];
        const e2 = [v[2]![0]! - v[0]![0]!, v[2]![1]! - v[0]![1]!, v[2]![2]! - v[0]![2]!];
        const c = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
        const cl = Math.hypot(c[0]!, c[1]!, c[2]!);
        if (cl < 1e-12) continue;
        for (const i of ids3) {
          const n = [Nn![3 * i]!, Nn![3 * i + 1]!, Nn![3 * i + 2]!];
          expect(Math.hypot(n[0]!, n[1]!, n[2]!)).toBeCloseTo(1, 4);
          expect((n[0]! * c[0]! + n[1]! * c[1]! + n[2]! * c[2]!) / cl).toBeGreaterThan(0.999);
        }
        checked++;
      }
      expect(checked, id).toBeGreaterThan(0);
    }
  });

  it("round-trips through its serialized form to the same geometry", async () => {
    const g = buildEiffel();
    const again = deserializeGraph(JSON.parse(JSON.stringify(serializeGraph(g))));
    const [a, b] = await Promise.all([cook(g), cook(again)]);
    for (const name of Object.keys(a.outputs)) {
      const ga = firstGeometry(a.outputs[name]!)!;
      const gb = firstGeometry(b.outputs[name]!)!;
      const attrA = ga.attrs.point.get("P")!;
      const attrB = gb.attrs.point.get("P")!;
      // Capacity is not content: a column allocated at exactly its count and
      // one grown by doubling can hold the same elements, so compare only
      // the logical range, not whatever slack follows it.
      // `slice` and not `subarray`, because a column's read view does not
      // hand out its buffer and `Buffer.from` needs one. The copy is free
      // of consequence here — this compares bytes and keeps neither side.
      const pa = attrA.data.slice(0, ga.attrs.point.count * attrA.tupleSize);
      const pb = attrB.data.slice(0, gb.attrs.point.count * attrB.tupleSize);
      expect(Buffer.from(pb.buffer, pb.byteOffset, pb.byteLength).equals(Buffer.from(pa.buffer, pa.byteOffset, pa.byteLength)), name).toBe(true);
    }
  });
});
