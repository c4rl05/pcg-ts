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
import { MEMBERS, NODES, node, profileAt } from "../demos/eiffel/spec.js";
import { UPRIGHT_SEAMS } from "../demos/eiffel/strut.js";

type Vec3 = readonly [number, number, number];

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const data = P.data as Float32Array;
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
    for (const p of lowerRivets) expect(toAxis(p, lower)).toBeCloseTo(row(0.435), 3);
    for (const p of upperBelowXI) expect(toAxis(p, upper)).toBeCloseTo(row(0.25), 3);
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
    const n = faceN!.data as Float32Array;
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

  it("builds the members the plates add: central posts, panel 10's two X's, the gap bracing", async () => {
    const ids = ["legPosts4RotDone", "legBracing4RotDone", "legGapBracing4RotDone", "legGapHorizontals4RotDone"];
    const got = await cookWith(ids);
    const [posts, bracing, gapX, gapH] = ids.map((id) => polylines(got[id]!));
    // A post on every face of every leg: the base tie, panels 1-4, 6-9 and
    // panel 10 above its band [PL-IX Fig. 8, PL-VII Figs 1, 2, 5].
    expect(posts).toHaveLength(4 * 4 * 10);
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
      // Clear of the member it stands on: never within 0.4 of a node whose
      // horizontal is centred on it, and never into panel 5, whose belt
      // chords stand inside it with their faces on XXIV and XXIII.
      for (const y of [a[1], b[1]]) {
        const n = NODES.find((m) => Math.abs(m.y - y) < 0.4 && m.name !== "XXIV" && m.name !== "XXIII");
        expect(n, `post end at y=${y} runs into node ${n?.name}`).toBeUndefined();
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

  it("round-trips through its serialized form to the same geometry", async () => {
    const g = buildEiffel();
    const again = deserializeGraph(JSON.parse(JSON.stringify(serializeGraph(g))));
    const [a, b] = await Promise.all([cook(g), cook(again)]);
    for (const name of Object.keys(a.outputs)) {
      const pa = firstGeometry(a.outputs[name]!)!.attrs.point.get("P")!.data;
      const pb = firstGeometry(b.outputs[name]!)!.attrs.point.get("P")!.data;
      expect(Buffer.from(pb.buffer, pb.byteOffset, pb.byteLength).equals(Buffer.from(pa.buffer, pa.byteOffset, pa.byteLength)), name).toBe(true);
    }
  });
});
