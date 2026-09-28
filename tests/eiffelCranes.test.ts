/**
 * The erection's creeper cranes (demos/eiffel/cranes.ts): the plate's
 * crane, where each stood day by day, and that the part of it that hangs
 * inside the finished iron (the hotte, the chassis, the mast's foot, the
 * platform) passes through none of the iron standing that day.
 */
import { type DataCollection, cook, firstGeometry } from "pcg-ts";
import { toBufferGeometry } from "pcg-ts/three";
import { beforeAll, describe, expect, it } from "vitest";
import { MILESTONES, dayOf, isoOf, stageTriangles } from "../demos/eiffel/chronology.js";
import { CRANE, CRANE_RUNS, OVER_NODE, OVER_NODE_UPPER, craneAt, craneParts, cranePose, frontHeight } from "../demos/eiffel/cranes.js";
import type { Block } from "../demos/eiffel/ground.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import type { Vec3 } from "./support/eiffelGround.js";

let built: Record<string, DataCollection>;
let plainKeys: string[];

beforeAll(async () => {
  built = (await cook(buildEiffel(1889, { build: true }))).outputs as Record<string, DataCollection>;
  plainKeys = Object.keys((await cook(buildEiffel(1889, {}))).outputs);
}, 120_000);

const IRON = ["uprights", "bracing", "horizontals", "girders", "arches", "gussets", "summit", "platforms", "stairs"];

/** Is p inside the block, `shrink` in from every face? */
function inside(b: Block, p: Vec3, shrink = 0.02): boolean {
  const z: Vec3 = [b.x[1] * b.y[2] - b.x[2] * b.y[1], b.x[2] * b.y[0] - b.x[0] * b.y[2], b.x[0] * b.y[1] - b.x[1] * b.y[0]];
  const d: Vec3 = [p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]];
  const dot = (a: Vec3) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return Math.abs(dot(b.x)) < b.size[0] / 2 - shrink && Math.abs(dot(b.y)) < b.size[1] / 2 - shrink && Math.abs(dot(z)) < b.size[2] / 2 - shrink;
}

describe("the erection's cranes", () => {
  it("is the plate's crane", () => {
    expect(CRANE.mastAbove).toBe(4.535);
    expect(CRANE.mastBelow).toBe(3.85);
    expect(CRANE.reach).toBe(12.0);
    expect(CRANE.underJib).toBe(10.4);
    expect(CRANE.gauge).toBe(3.8);
    expect(CRANE.upperApart).toBe(6.3);
    // The jib's tip at its full reach and height.
    const { blocks } = craneParts([0, 1, 0]);
    const tipX = Math.max(...blocks.map((b) => b.at[0] + (Math.abs(b.x[0]) * b.size[0]) / 2));
    expect(tipX).toBeCloseTo(CRANE.reach + CRANE.jib / 2, 0);
  });

  it("puts out six cranes under ?build, and none without", () => {
    const cranes = Object.keys(built).filter((k) => k.startsWith("works.crane."));
    expect(cranes.sort()).toEqual(CRANE_RUNS.map((r) => `works.crane.${r.name}`).sort());
    expect(plainKeys.some((k) => k.startsWith("works."))).toBe(false);
  });

  it("climbs with the front: never over it, never down, each crane on its days", () => {
    for (const run of CRANE_RUNS) {
      let last = -Infinity;
      for (let day = run.from; day < run.until; day++) {
        const pose = cranePose(run, day);
        expect(pose.shown).toBe(true);
        const y = pose.at[1] - (run.upper === true ? OVER_NODE_UPPER : OVER_NODE);
        // On a finished node under the front; over the 2nd floor on the girders' tops.
        if (day < MILESTONES.secondPlatform || run.upper === true) expect(y, `${run.name} ${isoOf(day)}`).toBeLessThanOrEqual(frontHeight(day) + 1e-6);
        expect(y).toBeGreaterThanOrEqual(last);
        last = y;
      }
      expect(cranePose(run, run.from - 1).shown).toBe(false);
      expect(cranePose(run, run.until).shown).toBe(false);
    }
    // The first at pile 3 on 2 Sep 1887; four on the legs by 28 m; two on the post in the winter; one at the end.
    const on = (d: number) => CRANE_RUNS.filter((r) => cranePose(r, d).shown).map((r) => r.name).sort();
    expect(on(dayOf("1887-09-10"))).toEqual(["pile3"]);
    expect(on(dayOf("1887-11-01"))).toEqual(["pile1", "pile2", "pile3", "pile4"]);
    expect(on(dayOf("1888-09-20"))).toEqual(["pile2", "pile4", "upper1", "upper3"]);
    expect(on(dayOf("1888-12-01"))).toEqual(["upper1", "upper3"]);
    expect(on(dayOf("1889-03-15"))).toEqual(["upper1"]);
    // The last one reaches the 3rd floor.
    const last = CRANE_RUNS.find((r) => r.name === "upper1")!;
    expect(cranePose(last, MILESTONES.erected - 1).at[1] - OVER_NODE_UPPER).toBeCloseTo(276.13, 6);
    expect(on(MILESTONES.erected)).toEqual([]);
  });

  it("stands clear of the iron standing that day while it climbs the legs, and counts the rest", () => {
    const iron = IRON.flatMap((cls) => {
      const geo = firstGeometry((built[cls] ?? []) as DataCollection);
      if (geo === undefined) return [];
      const g = toBufferGeometry(geo);
      const position = g.getAttribute("position").array;
      const s = stageTriangles(cls, position, g.index!.array);
      const days = new Float64Array(s.index.length / 3);
      let t = 0;
      for (let k = 0; k < s.days.length; k++) for (; t < s.ends[k]! / 3; t++) days[t] = s.days[k]!;
      return [{ cls, position, index: s.index, days }];
    });
    const found: string[] = [];
    let tested = 0;
    for (const run of CRANE_RUNS) {
      for (let day = run.from; day < run.until; day += 20) {
        const pose = cranePose(run, day);
        // The whole crane, jib and all, as the graph builds it and the page moves it.
        const low = craneAt(run, day).blocks;
        const lo = [0, 1, 2].map((e) => Math.min(...low.map((b) => b.at[e]! - b.size[0] / 2 - 0.3)));
        const hi = [0, 1, 2].map((e) => Math.max(...low.map((b) => b.at[e]! + b.size[0] / 2 + 0.3)));
        for (const m of iron) {
          for (let t = 0; t < m.index.length / 3; t++) {
            if (m.days[t]! > day) break;
            const v = [0, 1, 2].map((k) => [0, 1, 2].map((e) => m.position[3 * m.index[3 * t + k]! + e]!) as unknown as Vec3);
            if ([0, 1, 2].some((e) => Math.max(v[0]![e]!, v[1]![e]!, v[2]![e]!) < lo[e]! || Math.min(v[0]![e]!, v[1]![e]!, v[2]![e]!) > hi[e]!)) continue;
            for (let k = 0; k < 3; k++) {
              const a = v[k]!;
              const b = v[(k + 1) % 3]!;
              const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.05));
              for (let i = 0; i < n; i++) {
                const p: Vec3 = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n];
                tested++;
                if (low.some((bl) => inside(bl, p))) found.push(`${run.name} ${isoOf(day)} ${m.cls} [${p.map((c) => c.toFixed(2))}]`);
              }
            }
          }
        }
      }
    }
    expect(tested).toBeGreaterThan(10_000);
    // Measured, by crane and height (SOURCES.md §32.8): none in the legs' climb to the 2nd floor; the
    // legs' cranes over the 2nd floor, on the Otis girders' tops, among the plan bracing and bands of
    // panels 12-13 that went up round them (girders); the post cranes' jibs through panel 29's corner
    // uprights and bracing at their last station, the 3rd floor's stair, and, for the one left over
    // the 3rd floor, the rooms the model dates with the iron (summit), which p. 118 has fitted after
    // it came down. Bounded here so a regression shows; the arches and the horizontals, never.
    const by = new Map<string, number>();
    for (const f of found) by.set(f.split(" ")[2]!, (by.get(f.split(" ")[2]!) ?? 0) + 1);
    const bound: Record<string, number> = { girders: 6000, uprights: 200, bracing: 200, platforms: 600, summit: 3000, arches: 0, horizontals: 0, gussets: 0 };
    for (const [cls, n] of Object.entries(bound)) expect(by.get(cls) ?? 0, cls).toBeLessThanOrEqual(n);
    // And nothing at all while the cranes climb the legs, under the 2nd floor.
    expect(found.filter((f) => f.startsWith("pile") && Number(/\[([^\]]*)\]/.exec(f)![1]!.split(",")[1]) < 120).length).toBe(0);
  }, 240_000);
});
