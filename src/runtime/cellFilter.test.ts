/**
 * Two level options for streaming ONE bounded object in an unbounded grid
 * (the eiffel demo's tower, cooked a cube at a time).
 *
 * `LevelDef.cellFilter`: cells a level declares can hold nothing are never
 * wanted — not cooked, not stored, not pending — and every other cell is
 * exactly what it was without the filter. Without it every cube of sky
 * inside the radius is a full cook that puts out nothing, and a record
 * the World keeps.
 *
 * `LevelDef.keepOutputs: false`: the host gets every cell's outputs as
 * before and the World keeps only the record, so a resident cell is not
 * held twice (once as outputs, once as whatever the host built).
 */
import { describe, expect, it } from "vitest";
import { childEchoLevel, outputsDiff, scatterLevel } from "./runtime.testsupport.js";
import type { LevelDef } from "./types.js";
import { World, WorldValidationError } from "./world.js";

const key = (c: readonly number[]): string => c.join(",");

describe("cellFilter", () => {
  it("never cooks a cell it rejects, and cooks every other cell exactly as an unfiltered level does", async () => {
    const asked: string[] = [];
    const base = scatterLevel({ name: "cubes", cellSize: 10, cellMode: "xyz", generationRadius: 25 });
    // Keep only the cells whose box reaches below y = 10: a slab of content.
    const filtered: LevelDef = {
      ...scatterLevel({ name: "cubes", cellSize: 10, cellMode: "xyz", generationRadius: 25 }).def,
      cellFilter: ({ coord, min, max }) => {
        asked.push(key(coord));
        expect(max[1]! - min[1]!).toBe(10);
        expect(min[1]).toBe((coord[1] as number) * 10);
        return (min[1] as number) < 10;
      },
    };
    const all = new World({ seed: 3, levels: [base.def] });
    const some = new World({ seed: 3, levels: [filtered] });
    const a = await all.update([0, 0, 0]);
    const s = await some.update([0, 0, 0]);
    expect(a.pending).toBe(0);
    expect(s.pending).toBe(0);
    const kept = a.cooked.filter((c) => (c.coord[1] as number) < 1);
    expect(s.cooked.map((c) => key(c.coord)).sort()).toEqual(kept.map((c) => key(c.coord)).sort());
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(a.cooked.length);
    // The filter was asked about every cell in the radius, rejected ones too.
    expect(new Set(asked).size).toBe(a.cooked.length);
    // What it kept is byte-identical to the unfiltered level's same cell.
    for (const c of kept) {
      const mine = some.getCell("cubes", c.coord)?.outputs ?? {};
      const theirs = all.getCell("cubes", c.coord)?.outputs ?? {};
      expect(outputsDiff(mine, theirs)).toBeNull();
    }
    // And a rejected cell is nowhere: not stored, not in the stats.
    expect(some.getCell("cubes", [0, 1, 0])).toBeUndefined();
    expect(some.stats().levels[0]?.cellCount).toBe(kept.length);
    // Quiescent: nothing is pending for the filtered-out cells either.
    expect((await some.update([0, 0, 0])).cooked).toEqual([]);
  });

  it("filters an xz level by its 2D box", async () => {
    const def: LevelDef = {
      ...scatterLevel({ name: "tiles", cellSize: 10, generationRadius: 25 }).def,
      cellFilter: ({ min }) => (min[0] as number) >= 0,
    };
    const world = new World({ seed: 1, levels: [def] });
    const st = await world.update([0, 0, 0]);
    expect(st.cooked.length).toBeGreaterThan(0);
    for (const c of st.cooked) expect(c.coord[0]).toBeGreaterThanOrEqual(0);
  });

  it("is refused where there is no box to judge, naming the level and the fix", () => {
    const unbounded: LevelDef = { ...scatterLevel({ name: "planet", cellSize: "unbounded" }).def, cellFilter: () => true };
    expect(() => new World({ seed: 1, levels: [unbounded] })).toThrow(WorldValidationError);
    expect(() => new World({ seed: 1, levels: [unbounded] })).toThrow(/level 0 \("planet"\): declares cellFilter on an unbounded level/);
    const path: LevelDef = {
      ...scatterLevel({ name: "road", cellSize: 10, cellMode: "path", path: { length: 100, closed: true }, generationRadius: 20 }).def,
      cellFilter: () => true,
    };
    expect(() => new World({ seed: 1, levels: [path] })).toThrow(/level 0 \("road"\): declares cellFilter on a "path" level/);
    const wrong = { ...scatterLevel({ name: "cubes", cellSize: 10, generationRadius: 20 }).def, cellFilter: 3 } as unknown as LevelDef;
    expect(() => new World({ seed: 1, levels: [wrong] })).toThrow(/cellFilter must be a function/);
    const flag = { ...scatterLevel({ name: "cubes", cellSize: 10, generationRadius: 20 }).def, keepOutputs: "no" } as unknown as LevelDef;
    expect(() => new World({ seed: 1, levels: [flag] })).toThrow(/level 0 \("cubes"\): keepOutputs must be true or false/);
  });
});

describe("keepOutputs: false", () => {
  it("delivers every cell to onCellReady exactly as a keeping level does, then keeps only the record", async () => {
    const delivered = new Map<string, Record<string, unknown>>();
    const keeping = new World({ seed: 7, levels: [scatterLevel({ name: "tiles", cellSize: 10, generationRadius: 25 }).def] });
    const dropping = new World({
      seed: 7,
      levels: [{ ...scatterLevel({ name: "tiles", cellSize: 10, generationRadius: 25 }).def, keepOutputs: false }],
      onCellReady: (_level, coord, outputs) => delivered.set(key(coord), outputs),
    });
    const a = await keeping.update([0, 0, 0]);
    const d = await dropping.update([0, 0, 0]);
    expect(d.cooked.map((c) => key(c.coord))).toEqual(a.cooked.map((c) => key(c.coord)));
    for (const c of a.cooked) {
      const theirs = keeping.getCell("tiles", c.coord)?.outputs ?? {};
      expect(outputsDiff(delivered.get(key(c.coord)) as never, theirs)).toBeNull();
      // The record stays — resident, stamped — and holds nothing.
      const mine = dropping.getCell("tiles", c.coord);
      expect(mine).toBeDefined();
      expect(Object.keys(mine?.outputs ?? { x: 1 })).toEqual([]);
    }
    // Residency is unchanged by it: a repeat update cooks nothing, and
    // moving away evicts the same cells.
    expect((await dropping.update([0, 0, 0])).cooked).toEqual([]);
    const ea = await keeping.update([200, 0, 0]);
    const ed = await dropping.update([200, 0, 0]);
    expect(ed.evicted.map((c) => key(c.coord)).sort()).toEqual(ea.evicted.map((c) => key(c.coord)).sort());
  });

  it("hands a child level an empty parent, which is why a parent a child reads must keep its outputs", async () => {
    const parent = { ...scatterLevel({ name: "planet", cellSize: "unbounded" }).def, keepOutputs: false };
    const world = new World({ seed: 5, levels: [parent, childEchoLevel({ name: "chunk", cellSize: 10, generationRadius: 9 }).def] });
    await world.update([0, 0, 0]);
    for (const cell of world.cells("chunk")) expect(cell.outputs.parentEcho).toEqual([]);
  });
});
