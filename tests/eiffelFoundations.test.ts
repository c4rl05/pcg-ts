/**
 * The foundations in section (ground.ts `MASSIF`, `CAISSON`, `WALLS`,
 * `EARTHING`; SOURCES.md §31.4), against PL-II to PL-V and the text:
 *
 * - sixteen massifs, one under each upright's stones, their profile
 *   PL-IV Figs 7 and 27's (8.90 and 9.61 at the base, 7.46 and 8.50 high),
 *   their top face square to the upright and under the lower stone, their
 *   redans 5.00 / 4.60 / 4.00 across;
 * - eight caissons under piles 1 and 4 only, 15.24 × 6.00 (pile 4's N°1
 *   14.24), each from its printed cutting edge to the 28.00 arase;
 * - the walls' piers and the earthing pipes of piles 2 and 3;
 * - all of it under the ground but the massifs' peaks inside the
 *   pedestals, and clear of everything else the tower builds (the lifts
 *   reach 4.4 m under the ground) and of the machine room's plant.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Geometry } from "pcg-ts";
import {
  CAISSON,
  MASSIF,
  type Prism,
  SUPPORT,
  caissonPrisms,
  earthingPipes,
  machineRoomPrisms,
  massifPrisms,
  massifSolids,
  skirtPlanes,
  supportFrames,
  supportPieces,
  wallPiers,
} from "../demos/eiffel/ground.js";
import type { PartClass } from "../demos/eiffel/parts.js";
import { type Solid, type Vec3, cookWithoutGround, inside, prismSamples, solidOf, surfaceSamples } from "./support/eiffelGround.js";

const frames = supportFrames();
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
/** A prism's points, both caps. */
const corners = (p: Prism): Vec3[] => {
  const s = solidOf(p);
  const n = s.planes[0]!.n;
  return [...p.outline, ...p.outline.map((q): Vec3 => [q[0] + n[0] * p.depth, q[1] + n[1] * p.depth, q[2] + n[2] * p.depth])];
};

describe("eiffel foundations: the massifs", () => {
  it("puts one under every upright, on the printed profile of its pile pair", () => {
    for (const f of frames) {
      const ms = massifSolids(f);
      const caisson = f.pile === 1 || f.pile === 4;
      const M = caisson ? MASSIF.byPile.caisson : MASSIF.byPile.open;
      const pts = ms.slice(0, 3).flatMap(corners);
      const cote = (y: number) => y - f.seat[1] + MASSIF.sommier;
      // Base and peak at the printed cotes (from the seat's datum).
      expect(cote(Math.min(...pts.map((p) => p[1])))).toBeCloseTo(M.base, 6);
      // The peak on the printed cote to 0.04: the top face is the lower stone's underside.
      expect(Math.abs(cote(Math.max(...pts.map((p) => p[1]))) - M.peak)).toBeLessThan(0.04);
      // The base's length along the diagonal: 8.90 / 9.61.
      const d: Vec3 = (() => {
        const l = Math.hypot(f.U[0], f.U[2]);
        return [f.U[0] / l, 0, f.U[2] / l];
      })();
      const s = (p: Vec3) => dot(sub(p, f.seat), d);
      const base = pts.filter((p) => Math.abs(cote(p[1]) - M.base) < 1e-6).map(s);
      const len = Math.max(...base) - Math.min(...base);
      expect(len).toBeCloseTo(caisson ? 9.61 : 8.9, 6);
      // Outward: its rear toe further from the tower's axis than its front face, and the stones between.
      const horiz = (p: Vec3) => Math.hypot(p[0], p[2]);
      const byS = [...base].sort((x, y) => x - y);
      const at = (sv: number): Vec3 => [f.seat[0] + d[0] * sv, 0, f.seat[2] + d[2] * sv];
      expect(horiz(at(byS[byS.length - 1]!))).toBeGreaterThan(horiz(at(byS[0]!)) + 8);
      expect(byS[0]!).toBeLessThan(0);
      // Its redans: 5.00, 4.60, 4.00 across.
      expect(ms.slice(0, 3).map((p) => p.depth)).toEqual([5.0, 4.6, 4.0]);
      // Footings under piles 2 and 3 only.
      expect(ms).toHaveLength(caisson ? 3 : 4);
    }
  });

  it("carries the stones on its top face, square to the upright", () => {
    for (const f of frames) {
      const top = massifSolids(f)[2]!;
      const { stone } = supportPieces(f);
      const lower = stone[1]!;
      // The lower stone's underside: its outline, at the seat less 1.00 of stone.
      for (const p of lower.outline) expect(dot(sub(p, f.seat), f.T)).toBeCloseTo(-1.0, 9);
      // Flush: the top band's highest face is the plane square to T through the stone's underside.
      const faces = corners(top).map((p) => dot(sub(p, f.seat), f.T));
      expect(Math.max(...faces)).toBeCloseTo(-1.0, 6);
    }
  });
});

describe("eiffel foundations: the caissons", () => {
  it("sinks eight, under piles 1 and 4 only, each from its printed edge to the 28.00 arase", () => {
    let n = 0;
    for (const f of frames) {
      const { concrete, iron } = caissonPrisms(f);
      if (f.pile === 2 || f.pile === 3) {
        expect(concrete).toHaveLength(0);
        continue;
      }
      n++;
      const c = concrete[0]!;
      const pts = corners(c);
      const cote = (y: number) => y - f.seat[1] + MASSIF.sommier;
      const edge = CAISSON.edge[f.pile as 1 | 4][f.upright];
      // The concrete from the « fond définitif », 0.20 over the cutting edge; the shell from the edge.
      expect(cote(Math.min(...pts.map((p) => p[1])))).toBeCloseTo(edge + 0.2, 6);
      expect(cote(Math.max(...pts.map((p) => p[1])))).toBeCloseTo(CAISSON.top, 6);
      const l = Math.hypot(f.U[0], f.U[2]);
      const d: Vec3 = [f.U[0] / l, 0, f.U[2] / l];
      const along = pts.map((p) => dot(sub(p, f.seat), d));
      const across = pts.map((p) => dot(sub(p, f.seat), f.E));
      // The short one is pile 4's N°1, under massif D (PL-II Fig. 12 « 14.00 », « (23.58) »).
      const short = f.pile === 4 && f.upright === "d";
      expect(Math.max(...along) - Math.min(...along)).toBeCloseTo(short ? 14.24 : 15.24, 6);
      // Its area in plan: the printed « Surface du Caisson 90,60 m q » (84.60 the short one), to the polygon's 0.3 %.
      const ring = c.outline;
      let area = 0;
      for (let i = 0; i < ring.length; i++) {
        const [a, b] = [ring[i]!, ring[(i + 1) % ring.length]!];
        area += a[0] * b[2] - b[0] * a[2];
      }
      expect(Math.abs(Math.abs(area) / 2 - (short ? 84.6 : 90.6))).toBeLessThan(0.3);
      expect(Math.max(...across) - Math.min(...across)).toBeCloseTo(6.0, 6);
      // Its shell from the edge, 5.00 of wall and hausses.
      const shell = iron.flatMap(corners).map((p) => cote(p[1]));
      expect(Math.min(...shell)).toBeCloseTo(edge, 6);
      expect(Math.max(...shell) - Math.min(...shell)).toBeCloseTo(Math.min(5.0, CAISSON.top - edge), 6);
    }
    expect(n).toBe(8);
    // The mapping read off the plans: the short caisson (the highest edge, 23.38) under pile 4's D.
    expect(CAISSON.edge[4].d).toBe(23.38);
    expect(CAISSON.edge[1]).toEqual({ a: 22.22, b: 21.99, c: 21.55, d: 21.8 });
  });
});

describe("eiffel foundations: under the ground, clear of the tower", () => {
  let others: Partial<Record<PartClass, Geometry>>;
  beforeAll(async () => {
    others = await cookWithoutGround();
  }, 400_000);

  // A massif as drawn is its solids cut back inside the pedestal's skirt
  // (`skirtPlanes`): a sample counts only on the kept side of those planes.
  type Part = { what: string; solids: Solid[]; keep?: Array<{ n: Vec3; c: number }> };
  const found = (): Part[] => [
    ...frames.map((f) => ({ what: `pile ${f.pile} ${f.upright} massif`, solids: massifSolids(f).map(solidOf), keep: skirtPlanes(f.pile) })),
    ...frames.map((f) => ({ what: `pile ${f.pile} ${f.upright} caisson`, solids: caissonPrisms(f).concrete.map(solidOf) })),
    { what: "walls' piers", solids: wallPiers().map(solidOf) },
    { what: "caissons' shells", solids: frames.flatMap((f) => caissonPrisms(f).iron).map(solidOf) },
    { what: "earthing", solids: earthingPipes().map(solidOf) },
  ];

  it("keeps it under the ground but the massifs' peaks, which stand inside the pedestals (and can tell)", () => {
    for (const { what, solids } of found()) {
      if (what.endsWith("massif")) continue;
      for (const s of solids) expect(s.max[1], what).toBeLessThan(0);
    }
    // The massifs as drawn: every point above the ground inside the plinth's outer faces.
    const outside = (list: Prism[], pile: 1 | 2 | 3 | 4) =>
      list.flatMap(corners).filter((q) => q[1] > 0 && skirtPlanes(pile).some(({ n, c }) => dot(n, q) > c + 1e-6));
    for (const f of frames) expect(outside(massifPrisms(f), f.pile), `pile ${f.pile} ${f.upright}`).toEqual([]);
    // Control: uncut, the peaks come out through the plinth.
    expect(frames.some((f) => outside(massifSolids(f), f.pile).length > 0)).toBe(true);
  });

  it("clashes with nothing the tower builds (the lifts' tracks and pits go down to 4.4 under the ground), and can", () => {
    const report: string[] = [];
    const census = (list: ReadonlyArray<Part>) => {
      const hits: string[] = [];
      for (const { what, solids, keep } of list) {
        if (solids.length === 0) continue;
        const lo: Vec3 = [Math.min(...solids.map((s) => s.min[0])), Math.min(...solids.map((s) => s.min[1])), Math.min(...solids.map((s) => s.min[2]))];
        const hi: Vec3 = [Math.max(...solids.map((s) => s.max[0])), Math.max(...solids.map((s) => s.max[1])), Math.max(...solids.map((s) => s.max[2]))];
        for (const [cls, geo] of Object.entries(others)) {
          const samples = surfaceSamples(geo as Geometry, [lo, hi], 0.1).filter((q) => (keep ?? []).every(({ n, c }) => dot(n, q) <= c - 0.02 * Math.hypot(...n)));
          for (const h of inside(solids, samples, 0.02)) {
            hits.push(`${what}: ${cls} at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep`);
          }
        }
      }
      return hits;
    };
    report.push(...census(found()));
    const groups = new Map<string, { n: number; worst: number; at: string }>();
    for (const r of report) {
      const m = /^(.*?): (\w+) at \[(.*?)\] ([\d.]+) deep$/.exec(r)!;
      const k = `${m[1]} / ${m[2]}`;
      const g = groups.get(k) ?? { n: 0, worst: 0, at: "" };
      g.n++;
      if (Number(m[4]) > g.worst) Object.assign(g, { worst: Number(m[4]), at: m[3] });
      groups.set(k, g);
    }
    expect([...groups].map(([k, g]) => `${k}: ${g.n}, worst ${g.worst} at ${g.at}`)).toEqual([]);
    // Control: pile 4's c massif raised 3.5 m meets its upright's end.
    const f = frames.find((q) => q.pile === 4 && q.upright === "c")!;
    const moved = massifSolids({ ...f, seat: [f.seat[0], f.seat[1] + 3.5, f.seat[2]] }).map(solidOf);
    expect(census([{ what: "moved", solids: moved, keep: skirtPlanes(f.pile) }]).length).toBeGreaterThan(0);
  });

  it("keeps the ground's own pieces apart: the plant, the flue, the piers and the earthing clear of the massifs and of each other (and can tell)", () => {
    const room = machineRoomPrisms();
    const massifs = frames.flatMap(massifSolids);
    const caissons = frames.flatMap((f) => caissonPrisms(f).concrete);
    const groups: Record<string, Prism[]> = {
      plant: room.plant,
      "room masonry and flue": room.foundations,
      piers: wallPiers(),
      earthing: earthingPipes(),
      caissons,
      massifs,
    };
    // The room's walls, floors and pits are masonry bonded into the massifs
    // that stand in its corners and run out through its walls (PL-III Fig.
    // 4): one class, one material, so that pair may overlap; no other may.
    const allowed = new Set(["room masonry and flue/massifs", "massifs/room masonry and flue"]);
    const report: string[] = [];
    for (const [a, pa] of Object.entries(groups)) {
      const samples = pa.flatMap((p) => prismSamples(p, 0.1)).filter((q) => q[1] < 0.5);
      for (const [b, pb] of Object.entries(groups)) {
        if (a === b || allowed.has(`${a}/${b}`)) continue;
        const hits = inside(pb.map(solidOf), samples, 0.02);
        if (hits.length > 0) report.push(`${a} in ${b}: ${hits.length}, e.g. [${hits[0]!.at.map((v) => v.toFixed(2))}]`);
      }
    }
    expect(report).toEqual([]);
    // Control: a pier moved 3 m onto its pile's c massif is caught.
    const pier = wallPiers()[0]!;
    const c = frames.find((f) => f.pile === 4 && f.upright === "c")!;
    const toward = sub([c.seat[0], 0, c.seat[2]], pier.outline[0]!);
    const moved = prismSamples(pier, 0.1).map((q): Vec3 => [q[0] + toward[0], q[1], q[2] + toward[2]]);
    expect(inside(massifs.map(solidOf), moved, 0.02).length).toBeGreaterThan(0);
  });

  it("runs the supports' anchors inside their massifs", () => {
    // The anchors run in the massifs by design; their bars lie inside them.
    for (const f of frames) {
      const bars = supportPieces(f).buried.slice(-2).flatMap((p) => prismSamples(p, 0.2));
      const own = massifSolids(f).map(solidOf);
      const out = bars.filter((q) => inside(own, [q], -0.001).length === 0);
      expect(out.length, `pile ${f.pile} ${f.upright}: anchor bars outside their massif`).toBe(0);
    }
    expect(SUPPORT.bolts.down).toBeCloseTo(6.2, 9);
  });
});

describe("eiffel foundations: the page's section (section.ts)", () => {
  it("cuts on PL-XX's plane, keeping pile 4's half, and leaves the tower above the ground alone", async () => {
    const { BoxGeometry } = await import("three");
    const { SECTION_PLANE, cutGeometry } = await import("../demos/eiffel/section.js");
    // The plane through piles 1 and 3, keeping pile 4 (+x +z).
    expect(SECTION_PLANE.distanceToPoint(new (await import("three")).Vector3(50.7, 0, 50.7))).toBeGreaterThan(0);
    expect(SECTION_PLANE.distanceToPoint(new (await import("three")).Vector3(50.7, 0, -50.7))).toBeCloseTo(0, 9);
    // A 10 m box on the plane, under the ground: what is left lies on the kept side, and half its area.
    const box = new BoxGeometry(10, 4, 10).translate(0, -3, 0);
    const cut = cutGeometry(box, SECTION_PLANE);
    const P = cut.getAttribute("position");
    let area = 0;
    for (let i = 0; i < P.count; i++) expect(P.getX(i) + P.getZ(i)).toBeGreaterThan(-1e-5);
    const tri = (i: number) => {
      const v = [0, 1, 2].map((k) => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)] as const);
      const u = [v[1]![0] - v[0]![0], v[1]![1] - v[0]![1], v[1]![2] - v[0]![2]];
      const w = [v[2]![0] - v[0]![0], v[2]![1] - v[0]![1], v[2]![2] - v[0]![2]];
      return Math.hypot(u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!) / 2;
    };
    for (let i = 0; i < P.count; i += 3) area += tri(i);
    // Half the box's surface, less the two 4 m end faces the cut opens: (2·100 + 4·40) / 2.
    expect(area).toBeCloseTo((2 * 100 + 4 * 40) / 2, 3);
    // With `under`, a box standing above the ground is kept whole.
    const tall = new BoxGeometry(10, 4, 10).translate(0, 3, 0);
    expect(cutGeometry(tall, SECTION_PLANE, 0.05).getAttribute("position").count).toBe(36);
  });
});
