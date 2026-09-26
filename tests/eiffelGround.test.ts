/**
 * The machine room under pile 3, its flue and its chimney (ground.ts,
 * SOURCES.md §31), against the plates:
 *
 * - the floors at the printed cotes, 30.50 and 30.00 (PL-III Fig. 4, PL-V,
 *   PL-XX, PL-XXI), the walls' box 26.08 square with its faces at 35.62 and
 *   61.70 (PL-III Fig. 3), and everything that stood up to the site's
 *   higher ground cut off under the model's (`CAP`);
 * - the plant inside the walls, clear of the room's own masonry, and clear
 *   of everything else the tower builds (the Otis girders pass through
 *   this room), sampled over every face of every other class;
 * - the flue's 116.23 from the wall's outer face (PL-IV Fig. 15) and the
 *   chimney's 17.23 over its footing, 12.15 of it clear of the ground.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Geometry } from "pcg-ts";
import { CAP, CHIMNEY, FLUE, PLANT, ROOM, groundPrisms } from "../demos/eiffel/ground.js";
import type { PartClass } from "../demos/eiffel/parts.js";
import { yOfCote } from "../demos/eiffel/spec.js";
import { type Solid, type Vec3, cookWithoutGround, inside, prismSamples, solidOf, surfaceSamples } from "./support/eiffelGround.js";

const P = groundPrisms();
const plant: Solid[] = P.machinery.map(solidOf);
const masonry: Solid[] = P.foundations.map(solidOf);

describe("eiffel ground: the machine room under pile 3", () => {
  it("stands on the printed floors, inside its 26.08 box", () => {
    expect(ROOM.floor).toBeCloseTo(yOfCote(30.5), 9);
    expect(ROOM.stokehold).toBeCloseTo(yOfCote(30.0), 9);
    expect(ROOM.x[1] - ROOM.x[0]).toBeCloseTo(26.08, 6);
    expect(ROOM.z[1] - ROOM.z[0]).toBeCloseTo(26.08, 6);
    // Its faces: 3.50 outside the outer sommiers' line and 7.58 inside the inner one (PL-III Fig. 3).
    expect(ROOM.x[1] - 58.2041).toBeCloseTo(3.5, 2);
    expect(43.2041 - ROOM.x[0]).toBeCloseTo(7.58, 2);
    // The walls are 1.50 thick up to 31.63 and 1.10 over it (PL-V « Coupe PQ »).
    const wallAt = (y: number) => (y < yOfCote(31.63) ? ROOM.bands[0]![1] : ROOM.bands[1]![1]);
    for (const s of plant) {
      const t = wallAt(s.min[1]);
      expect(s.min[0]).toBeGreaterThan(ROOM.x[0] + t);
      expect(s.max[0]).toBeLessThan(ROOM.x[1] - t);
      expect(s.min[2]).toBeGreaterThan(ROOM.z[0] + t);
      expect(s.max[2]).toBeLessThan(ROOM.z[1] - t);
      // Every machine stands on a floor of the room, no lower than a pit.
      expect(s.min[1]).toBeGreaterThan(PLANT.pitFloor - 1e-6);
    }
  });

  it("cuts what stood up to the site's ground off under the model's", () => {
    expect(CAP).toBeLessThan(0);
    for (const s of plant) expect(s.max[1]).toBeLessThan(CAP);
    // Only the chimney's shaft stands above the ground.
    const [cx, cz] = CHIMNEY.at;
    for (const s of masonry) {
      if (s.max[1] <= CAP + 1e-9) continue;
      const far = Math.hypot((s.min[0] + s.max[0]) / 2 - cx, (s.min[2] + s.max[2]) / 2 - cz);
      expect(far, `a foundations solid reaches y ${s.max[1].toFixed(3)} at [${s.min.map((v) => v.toFixed(2))}]`).toBeLessThan(2);
    }
  });

  it("keeps the plant out of its own walls and floors", () => {
    // A machine may stand ON a floor (its face on the slab's top) but not in
    // it: every machine's surface, sampled along all its edges.
    const samples = P.machinery.flatMap((p) => prismSamples(p));
    const hits = inside(masonry, samples, 0.005);
    expect(hits.slice(0, 10).map((h) => `${h.at.map((v) => v.toFixed(2)).join(",")} in ${h.solid}`)).toEqual([]);
    // Control: the second engine's flywheel moved back to where the plate
    // measures it runs into the chaufferie's parting wall and floor.
    const E = PLANT.engines[1]!;
    const back: Vec3 = [40.7 - E.wheel[0], 0, -46.3 - E.wheel[1]];
    const wheel = P.machinery.filter((p) => {
      const s = solidOf(p);
      return Math.abs((s.min[0] + s.max[0]) / 2 - E.wheel[0]) < 0.3 && Math.abs((s.min[2] + s.max[2]) / 2 - E.wheel[1]) < 0.3 && s.max[1] - s.min[1] > 3;
    });
    expect(wheel).toHaveLength(1);
    const moved = prismSamples(wheel[0]!).map((q): Vec3 => [q[0] + back[0] * 2, q[1], q[2] + back[2] * 2]);
    expect(inside(masonry, moved, 0.005).length).toBeGreaterThan(0);
  });

  describe("against the rest of the tower", () => {
    let others: Partial<Record<PartClass, Geometry>>;
    beforeAll(async () => {
      others = await cookWithoutGround();
    }, 240_000);

    it("clashes with nothing the tower builds (the Otis girders cross the room)", () => {
      const report: string[] = [];
      let sampled = 0;
      for (const [cls, geo] of Object.entries(others)) {
        // Round pile 3 and along the flue to the chimney, under the ground and just over it.
        const samples = [
          ...surfaceSamples(geo as Geometry, [[ROOM.x[0] - 1, -8, ROOM.z[0] - 1], [ROOM.x[1] + 1, 0.5, ROOM.z[1] + 1]]),
          ...surfaceSamples(geo as Geometry, [[40, -8, ROOM.z[1] + 1], [105, 0.5, 60]], 0.2),
        ];
        sampled += samples.length;
        for (const h of inside([...plant, ...masonry], samples, 0.01)) {
          report.push(`${cls} at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep in solid ${h.solid}`);
        }
      }
      expect(sampled).toBeGreaterThan(1000);
      expect(report.slice(0, 20)).toEqual([]);
      // Control, through the same census: a Worthington pump moved onto the
      // Otis girders' feet is caught.
      const pump = P.machinery.map(solidOf).filter((s) => Math.abs((s.min[0] + s.max[0]) / 2 - 56.8) < 0.2 && Math.abs((s.min[2] + s.max[2]) / 2 + 50.8) < 0.2);
      expect(pump.length).toBeGreaterThan(0);
      const shift = (s: Solid, d: Vec3): Solid => ({
        planes: s.planes.map(({ n, c }) => ({ n, c: c - (n[0] * d[0] + n[1] * d[1] + n[2] * d[2]) })),
        min: [s.min[0] + d[0], s.min[1] + d[1], s.min[2] + d[2]],
        max: [s.max[0] + d[0], s.max[1] + d[1], s.max[2] + d[2]],
      });
      const onOtis = pump.map((s) => shift(s, [-2.8, 0, -3.2]));
      let caught = 0;
      for (const geo of Object.values(others)) {
        caught += inside(onOtis, surfaceSamples(geo as Geometry, [[ROOM.x[0], -8, ROOM.z[0]], [ROOM.x[1], 0.5, ROOM.z[1]]]), 0.01).length;
      }
      expect(caught).toBeGreaterThan(0);
    });

    it("control: a point in a boiler's drum and one in a pump-engine's bed are caught", () => {
      const B = PLANT.boilers;
      const drumAt: [number, number, number] = [
        (B.pairs[0]![0] + B.pairs[0]![1]) / 2 - (B.pairs[0]![1] - B.pairs[0]![0]) / 4,
        ROOM.stokehold + B.setting + B.drum.d / 2,
        B.front + 0.6,
      ];
      const E = PLANT.engines[0]!;
      const bedAt: [number, number, number] = [
        E.pump[0] + (E.wheel[0] - E.pump[0]) * 0.3,
        (ROOM.floor + PLANT.engineBed) / 2,
        E.pump[1] + (E.wheel[1] - E.pump[1]) * 0.3,
      ];
      expect(inside(plant, [drumAt, bedAt], 0.01)).toHaveLength(2);
    });
  });
});

describe("eiffel ground: the flue and the chimney", () => {
  it("runs 116.23 from the wall's outer face to the chimney's, within 1%", () => {
    const r = FLUE.route;
    expect(r[0]![1]).toBeCloseTo(ROOM.z[1], 9);
    let len = 0;
    for (let i = 0; i + 1 < r.length; i++) len += Math.hypot(r[i + 1]![0] - r[i]![0], r[i + 1]![1] - r[i]![1]);
    // Its end is inside the chimney's base shaft: count to the shaft's outer face.
    const end = r[r.length - 1]!;
    len -= CHIMNEY.a.d / 2 - Math.hypot(CHIMNEY.at[0] - end[0], CHIMNEY.at[1] - end[1]);
    expect(Math.abs(len - 116.23) / 116.23).toBeLessThan(0.01);
    expect(Math.hypot(CHIMNEY.at[0] - end[0], CHIMNEY.at[1] - end[1])).toBeLessThan(CHIMNEY.a.d / 2);
    // Its vault under the model's ground.
    expect(FLUE.invert + FLUE.clear.high + FLUE.wall).toBeLessThan(CAP);
  });

  it("stands 17.23 over its footing, 12.15 of it clear of the ground", () => {
    const [cx, cz] = CHIMNEY.at;
    const mine = masonry.filter((s) => Math.hypot((s.min[0] + s.max[0]) / 2 - cx, (s.min[2] + s.max[2]) / 2 - cz) < 2.5);
    const top = Math.max(...mine.map((s) => s.max[1]));
    const footingTop = -CHIMNEY.a.high;
    expect(top - footingTop).toBeCloseTo(17.23, 6);
    expect(top).toBeCloseTo(6.05 + 6.1, 6);
    // Round: its outer diameter at the foot of the shaft above ground.
    const ring = mine.filter((s) => Math.abs(s.min[1]) < 0.05);
    const w = Math.max(...ring.map((s) => s.max[0])) - Math.min(...ring.map((s) => s.min[0]));
    expect(w).toBeGreaterThan(CHIMNEY.b[0]!.d0 - 0.01);
    expect(w).toBeLessThan(CHIMNEY.b[0]!.d0 / Math.cos(Math.PI / 24) + 0.01);
  });
});
