/**
 * The plinths as built (platforms.ts `pedestalFaces`, `pedestalDressing`;
 * spec.ts `PEDESTAL`; SOURCES.md §31.2), against PL-V:
 *
 * - the gorge, PL-V's stretched cavetto in place of PL-I's steps: concave,
 *   nearly level off the fillet and 45 degrees under the top, receding 5.00
 *   on the outer faces and 2.28 on the inner (« 2.088 + 2.965 », « 1.022 +
 *   1.281 »);
 * - the inner corner turned on its 3.29 arc, concentric up the plinth, and
 *   the bench and sill along it (« 0.70 », « 0.10 », « 0.48 », Fig. 19);
 * - the rusticated courses, two of them over a plain base, blocks 1.53 in
 *   half bond, clear of the arch's piers and the doors on the inner faces;
 * - all of it clear of everything else the tower builds round the feet.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type DataCollection, type Geometry, cook, firstGeometry } from "pcg-ts";
import { archPierBases } from "../demos/eiffel/firstFloor.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PEDESTAL_DRESS, pedestalDressing, pedestalFaces } from "../demos/eiffel/platforms.js";
import { PEDESTAL } from "../demos/eiffel/spec.js";
import { type Solid, type Vec3, inside, points, solidOf, surfaceSamples } from "./support/eiffelGround.js";

const T = PEDESTAL.tiers;
const C = PEDESTAL.innerFoot + PEDESTAL.corner.radius;
const D = pedestalDressing();

describe("eiffel plinths: the profile", () => {
  it("nests every tier on the next and ends at the uprights, 5.55 up", () => {
    for (let k = 0; k + 1 < T.length; k++) expect(T[k + 1]!.y0).toBeCloseTo(T[k]!.y1, 9);
    expect(T[T.length - 1]!.y1).toBeCloseTo(PEDESTAL.height, 9);
    // « 2,088 + 2,965 » and « 1,022 + 1,281 » (PL-V Figs 17-18).
    expect(PEDESTAL.outer - T[T.length - 1]!.outer[1]).toBeCloseTo(5.05, 2);
    expect(T[T.length - 1]!.inner[1] - PEDESTAL.innerFoot).toBeCloseTo(2.303, 2);
  });

  it("sweeps the gorge concave: nearly level off the fillet, steepening to 45 degrees", () => {
    const gorge = T.filter((t) => t.y0 >= 3.14 - 1e-9);
    expect(gorge.length).toBeGreaterThanOrEqual(6);
    const slopes = gorge.map((t) => (t.y1 - t.y0) / (t.outer[0] - t.outer[1]));
    for (let k = 0; k + 1 < slopes.length; k++) expect(slopes[k + 1]!).toBeGreaterThan(slopes[k]!);
    expect(slopes[0]!).toBeLessThan(0.2);
    expect(slopes[slopes.length - 1]!).toBeGreaterThan(1.0);
    // Continuous: no step inside the gorge.
    for (let k = 0; k + 1 < gorge.length; k++) {
      expect(gorge[k + 1]!.outer[0]).toBeCloseTo(gorge[k]!.outer[1], 9);
      expect(gorge[k + 1]!.inner[0]).toBeCloseTo(gorge[k]!.inner[1], 9);
    }
  });
});

describe("eiffel plinths: the cooked pedestals", () => {
  let masonry: Geometry;
  let platforms: Geometry;
  let others: Array<[string, Geometry]>;
  beforeAll(async () => {
    const { outputs } = await cook(buildEiffel(1889));
    const geo = (name: string) => firstGeometry((outputs[name] ?? []) as DataCollection) as Geometry;
    masonry = geo("masonry");
    platforms = geo("platforms");
    others = ["uprights", "bracing", "horizontals", "girders", "arches", "platforms", "stairs", "machinery", "masonry"].map(
      (n): [string, Geometry] => [n, geo(n)],
    );
  }, 240_000);

  it("turns the inner corner on its 3.29 arc and builds nothing at the old square corner", () => {
    // Pile 4's pedestal is the one built in the +x +z quadrant.
    const pts = points(masonry).filter(([x, y, z]) => x > 30 && z > 30 && y < 0.02);
    const onArc = pts.filter(([x, , z]) => x < C && z < C && Math.abs(Math.hypot(x - C, z - C) - PEDESTAL.corner.radius) < 0.01);
    expect(onArc.length).toBeGreaterThan(PEDESTAL.corner.segments);
    // The square corner (38.17, 38.17) is 1.36 outside the arc: nothing of
    // the plinth stands within a metre of it, except the bench's sill in
    // front of the arc, which reaches 3.29 + 0.70 from its centre.
    const corner = pts.filter(([x, , z]) => Math.hypot(x - PEDESTAL.innerFoot, z - PEDESTAL.innerFoot) < 0.3);
    expect(corner).toEqual([]);
    // (The arch's near piers' bases reach 0.13 past the arc's ends: leave them out.)
    const sillReach = Math.max(...pts.filter(([x, , z]) => x > 37 && z > 37 && x < C && z < C).map(([x, , z]) => Math.hypot(x - C, z - C)));
    expect(sillReach).toBeCloseTo(PEDESTAL.corner.radius + PEDESTAL_DRESS.sill.wide, 2);
  });

  it("sets the bench's seat 0.48 over its 0.10 sill, its front on the arc and the sill 0.70 before it", () => {
    const R = PEDESTAL.corner.radius;
    const near = (y: number) => points(masonry).filter(([x, py, z]) => x > 37 && z > 37 && x < C && z < C && Math.abs(py - y) < 0.004);
    const reach = (pts: Vec3[]) => Math.max(...pts.map(([x, , z]) => Math.hypot(x - C, z - C)));
    const seatTop = near(PEDESTAL_DRESS.sill.high + PEDESTAL_DRESS.seat.over);
    expect(seatTop.length).toBeGreaterThan(0);
    // The seat's front is the « Banc » line (Fig. 19): nothing of it stands out past the arc.
    expect(reach(seatTop)).toBeCloseTo(R, 2);
    const sillTop = near(PEDESTAL_DRESS.sill.high);
    expect(reach(sillTop)).toBeCloseTo(R + 0.7, 2);
  });

  it("courses the battered block in two staggered rows, cut back to the piers, the doors and the corner", () => {
    const { blocks } = D;
    const faces = ["x-outer", "z-outer", "x-inner", "z-inner"] as const;
    for (const f of faces) {
      const on = blocks.filter((b) => b.face === f);
      const rows = [...new Set(on.map((b) => b.y0.toFixed(4)))];
      expect(rows, f).toHaveLength(2);
      // Neighbours in a row at least a joint apart.
      const byRow = rows.map((r) => on.filter((b) => b.y0.toFixed(4) === r).sort((a, b) => a.s0 - b.s0));
      for (const row of byRow) {
        for (let k = 0; k + 1 < row.length; k++) expect(row[k + 1]!.s0 - row[k]!.s1).toBeGreaterThanOrEqual(PEDESTAL_DRESS.block.joint - 1e-9);
      }
      // Staggered: no joint of one row within 0.3 of a joint of the other, on the outer faces' whole run.
      if (f.endsWith("outer")) {
        const joints = byRow.map((row) => row.slice(0, -1).map((b) => b.s0));
        for (const j of joints[0]!) expect(Math.min(...joints[1]!.map((q) => Math.abs(q - j)))).toBeGreaterThan(0.3);
        // The end blocks at the outer corner: 0.98 below, 1.40 above.
        expect(byRow.map((row) => +(row[row.length - 1]!.s1 - row[row.length - 1]!.s0).toFixed(3)).sort()).toEqual([0.98, 1.4]);
      }
    }
    const outer = blocks.filter((b) => b.face === "x-outer");
    // An outer face runs the whole 24 m: about 14 blocks a row.
    expect(outer.length).toBeGreaterThanOrEqual(26);
    // The inner faces keep off each pier's base and the door.
    const piers = archPierBases().filter((b) => b.x > 0);
    expect(piers).toHaveLength(2);
    for (const f of ["x-inner", "z-inner"] as const) {
      for (const b of blocks.filter((q) => q.face === f)) {
        for (const p of piers) expect(b.s1 <= p.z - p.side / 2 || b.s0 >= p.z + p.side / 2, `${f} block ${b.s0.toFixed(2)}-${b.s1.toFixed(2)} on the pier at ${p.z.toFixed(2)}`).toBe(true);
        const d = PEDESTAL_DRESS.door;
        expect(b.s1 <= d.at - d.clear / 2 || b.s0 >= d.at + d.clear / 2).toBe(true);
        expect(b.s0).toBeGreaterThan(C);
      }
    }
  });

  it("hangs a grille on each inner face's door", () => {
    const grilles = points(platforms).filter(([x, y, z]) => x > 30 && z > 30 && y < 2.2 && y > 0.04 && (x < 40 || z < 40));
    const across = (sel: (p: Vec3) => number) => {
      const v = grilles.map(sel);
      return Math.max(...v) - Math.min(...v);
    };
    expect(grilles.length).toBeGreaterThan(0);
    // One on the x-inner face (spread along z), one on the z-inner (along x).
    expect(across(([, , z]) => z)).toBeGreaterThan(PEDESTAL_DRESS.door.clear - 0.01);
    expect(across(([x]) => x)).toBeGreaterThan(PEDESTAL_DRESS.door.clear - 0.01);
  });

  it("clashes with nothing else the tower builds round the foot (and can)", () => {
    // The blocks against everything; the bench and sill against everything
    // but the plinth they run back under (by design, `PEDESTAL_DRESS`).
    const n = PEDESTAL.corner.segments;
    const blocks: Solid[] = D.masonry.slice(0, D.masonry.length - 2 * n).map(solidOf);
    const bench: Solid[] = D.masonry.slice(D.masonry.length - 2 * n).map(solidOf);
    expect(blocks).toHaveLength(D.blocks.length);
    const box: [Vec3, Vec3] = [
      [PEDESTAL.innerFoot - 4.5, -0.5, PEDESTAL.innerFoot - 4.5],
      [PEDESTAL.outer + 0.5, 2.2, PEDESTAL.outer + 0.5],
    ];
    const report: string[] = [];
    // And the skirt itself, the gorge and all, against the iron: its faces are plates it builds.
    const skirt: Solid[] = pedestalFaces().map(solidOf);
    const high: [Vec3, Vec3] = [
      [PEDESTAL.innerFoot - 0.5, 0, PEDESTAL.innerFoot - 0.5],
      [PEDESTAL.outer + 0.5, PEDESTAL.height + 0.1, PEDESTAL.outer + 0.5],
    ];
    const iron = others.filter(([name]) => name !== "masonry" && name !== "platforms" && name !== "stairs").flatMap(([, geo]) => surfaceSamples(geo, high, 0.05));
    for (const h of inside(skirt, iron, 0.005)) report.push(`iron in the skirt at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep`);
    // Control: the skirt's outer faces 0.4 further in meet the c upright.
    const pushed = pedestalFaces().map((p) => ({ ...p, outline: p.outline.map(([x, y, z]): Vec3 => [x - 0.4, y, z - 0.4]) }));
    expect(inside(pushed.map(solidOf), iron, 0.005).length).toBeGreaterThan(0);
    // The plinth's own battered face behind the bench: inside the arc's radius.
    const behind = ([x, , z]: Vec3) => x < C && z < C && Math.hypot(x - C, z - C) <= PEDESTAL.corner.radius + 1e-3;
    const samplesOf = new Map<string, Vec3[]>();
    for (const [name, geo] of others) {
      const samples = surfaceSamples(geo, box);
      samplesOf.set(name, samples);
      for (const h of inside(blocks, samples, 0.01)) report.push(`${name} in a block at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep`);
      const forBench = name === "masonry" ? samples.filter((q) => !behind(q)) : samples;
      for (const h of inside(bench, forBench, 0.01)) report.push(`${name} in the bench at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep`);
    }
    expect(report.slice(0, 20)).toEqual([]);
    // Control, through the same census: the arch's near pier moved 2.6
    // along the face and 0.45 onto it lands on the blocks.
    const p = archPierBases().filter((b) => b.x > 0).sort((a, b) => a.z - b.z)[1]!;
    const pier = (samplesOf.get("masonry") ?? []).filter(([x, y, z]) => x < PEDESTAL.innerFoot && x > PEDESTAL.innerFoot - p.side - 0.1 && Math.abs(z - p.z) < p.side / 2 + 0.05 && y < 2);
    expect(pier.length).toBeGreaterThan(0);
    const moved = pier.map(([x, y, z]): Vec3 => [x + 0.45, y, z - 2.6]);
    expect(inside(blocks, moved, 0.01).length).toBeGreaterThan(0);
  });
});
