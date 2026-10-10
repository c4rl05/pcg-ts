/**
 * Detail by distance (`?bands`, demos/eiffel/bands.ts): the laced and
 * riveted depths cooked a cube at a time must be EXACTLY the whole cook,
 * cell by cell, so that what streams in round the camera is the tower and
 * not an approximation of it.
 *
 * What is held, for every cube of both levels that the tower's envelope
 * admits (132 laced cubes of 32 m, 532 rivet cubes of 16 m):
 *
 * - a laced cell's six classes are the whole ?rivets cook's primitives
 *   whose bounding box meets the cube (so every triangle passing through
 *   it, with or without a vertex in it: the page cuts the plain tower away
 *   there fragment by fragment) — every byte of every vertex's attributes,
 *   compared as multisets (a cell's arrays come out in another order). Its
 *   test runs before the class jitter and keeps a 1 cm halo for it, so the
 *   reference brackets it (`EPS`, `OUT`) and the cell may carry what meets
 *   the cube grown by OUT (drawn nowhere: the page cuts at the faces);
 * - a rivet cell's heads are the whole cook's heads SEATED in the cube
 *   (half-open), transform and per-instance channel to the bit — so the
 *   cells partition every rivet output exactly, no head twice, none lost;
 * - together the cells cover the whole cook, which is also what proves the
 *   envelope (`inEnvelope`, the levels' cellFilter) drops no cube that
 *   holds anything.
 *
 * And that the World the page runs (`bandsWorld`) delivers exactly those
 * cells, keeps none of their outputs, and cooks no cube of sky.
 *
 * The reference is ONE whole cook at the riveted depth: its six classes
 * are byte-identical to the laced depth's (measured; the laced level
 * cooks the laced graph), so both levels answer to it.
 */
import { type CellContext, type CellOutputs, type DataCollection, type Graph, World, cook, serializeGraph } from "pcg-ts";
import { beforeAll, describe, expect, it } from "vitest";
import {
  BANDS,
  ENVELOPE,
  LACED_CLASSES,
  bandsFrom,
  bandsGraphs,
  bandsLevels,
  bandsWorld,
  finestCell,
  inEnvelope,
} from "../demos/eiffel/bands.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { gateCount, regionNodes, setRegion } from "../demos/eiffel/region.js";
import { profileAt } from "../demos/eiffel/spec.js";
import {
  type Box,
  anyVertexIn,
  boxMeets,
  diffSorted,
  instanceHashes,
  meshHashes,
  seatedIn,
  unionSorted,
  uniqueSorted,
} from "./support/eiffelBands.js";

/**
 * How far the cell's test may stand off the exact one, metres: it runs
 * before the class jitter (1 mm an axis) moves what it kept, so everything
 * meeting the cube shrunk by EPS must be in the cell; and it keeps a 1 cm
 * halo for that jitter (parts.ts), so the cell may carry what meets the
 * cube grown by OUT.
 */
const EPS = 2e-3;
const OUT = 1e-2 + EPS;

/** What a laced cell MAY carry (region.ts `gateMesh`): what meets the cube grown by OUT. */
const mayCarry = (box: Box) => boxMeets(box, OUT);

/** Every cube of side `s` the envelope admits. */
function cubes(s: number): Box[] {
  const w = profileAt(ENVELOPE.bottom).outer + ENVELOPE.margin;
  const out: Box[] = [];
  for (let x = Math.floor(-w / s); x <= Math.floor(w / s); x++)
    for (let z = Math.floor(-w / s); z <= Math.floor(w / s); z++)
      for (let y = Math.floor(ENVELOPE.bottom / s); y <= Math.floor(ENVELOPE.top / s); y++) {
        const box: Box = { min: [x * s, y * s, z * s], max: [(x + 1) * s, (y + 1) * s, (z + 1) * s] };
        if (inEnvelope(box)) out.push(box);
      }
  return out;
}

let whole: CellOutputs;
const graphs = bandsGraphs();
const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`bandsGraphs() built no ${what} graph`);
  return v;
};
const lacedGraph = need(graphs.laced, "laced");
const rivetGraph = need(graphs.rivets, "rivets");

beforeAll(async () => {
  whole = (await cook(buildEiffel(1889, { rivets: true }))).outputs;
}, 600_000);

describe("a regional graph", () => {
  it("is the whole graph node for node — id, type, seed and every param — plus only its gates", () => {
    for (const [depth, regional] of [
      [{ lacedWeb: true }, lacedGraph],
      [{ rivets: true }, rivetGraph],
    ] as const) {
      const whole = buildEiffel(1889, depth);
      const w = whole.describe();
      const r = regional.describe();
      const seeds = new Map(r.nodes.map((n) => [n.id, n]));
      const ws = serializeGraph(whole).nodes;
      const rs = new Map(serializeGraph(regional).nodes.map((n) => [n.id, n]));
      for (const n of w.nodes) {
        expect(seeds.get(n.id)?.seed, n.id).toBe(n.seed);
      }
      for (const n of ws) {
        const m = rs.get(n.id);
        expect(m?.type, n.id).toBe(n.type);
        expect(JSON.stringify(m?.params), n.id).toBe(JSON.stringify(n.params));
      }
      const known = new Set(ws.map((n) => n.id));
      const extra = [...rs.values()].filter((n) => !known.has(n.id));
      expect(new Set(extra.map((n) => n.id))).toEqual(regionNodes(regional));
      expect(gateCount(regional)).toBeGreaterThan(100);
      // Nothing but the gates: one box filter each.
      expect(extra.length).toBe(gateCount(regional));
      for (const n of extra) expect(["filterByBounds", "filterPrimitivesByBounds"]).toContain(n.type);
      expect(r.outputs.map((o) => o.name)).toEqual(w.outputs.map((o) => o.name));
    }
  }, 120_000);
});

describe("every laced cube is the whole cook inside it", () => {
  it(`${BANDS.laced.cell} m cubes, the six classes the laced depth changes`, async () => {
    const got = new Map<string, Float64Array[]>(LACED_CLASSES.map((c) => [c, []]));
    let bad: string[] = [];
    const cells = cubes(BANDS.laced.cell);
    let through = 0;
    for (const box of cells) {
      setRegion(lacedGraph, box);
      const { outputs } = await cook(lacedGraph, { outputs: graphs.lacedOutputs });
      for (const cls of LACED_CLASSES) {
        const mine = meshHashes(outputs[cls] ?? []);
        const inner = meshHashes(whole[cls] ?? [], boxMeets(box, -EPS));
        const outer = meshHashes(whole[cls] ?? [], mayCarry(box));
        const lost = diffSorted(inner, mine).missing;
        const stray = diffSorted(mine, outer).missing;
        if (lost + stray > 0) bad.push(`${cls} @ ${box.min}: ${lost} lost, ${stray} not the whole cook's of ${inner.length}`);
        // The triangles that pass through the cube with no vertex in it:
        // what a clip by vertex would have lost, and the page shown as a gap.
        through += diffSorted(inner, meshHashes(whole[cls] ?? [], anyVertexIn(box))).missing;
        got.get(cls)?.push(mine);
      }
    }
    expect(bad).toEqual([]);
    // The control: the rule above is not the vertex rule under another name
    // (2,375 such triangles at 32 m when this was written, 3 in 4 of them
    // the uprights' and girders' long flats).
    expect(through).toBeGreaterThan(1000);
    // Together they are the whole cook: every primitive in some admitted
    // cube, so the envelope left nothing out.
    bad = [];
    for (const cls of LACED_CLASSES) {
      const d = diffSorted(uniqueSorted(meshHashes(whole[cls] ?? [])), uniqueSorted(unionSorted(got.get(cls) ?? [])));
      if (d.missing + d.extra > 0) bad.push(`${cls}: ${JSON.stringify(d)}`);
    }
    expect(bad).toEqual([]);
    expect(cells.length).toBe(132);
  }, 600_000);
});

describe("every rivet cube is the whole cook's heads seated in it", () => {
  it(`${BANDS.rivets.cell} m cubes, every rivet output, partitioned exactly`, async () => {
    const got = new Map<string, Float64Array[]>(graphs.rivetOutputs.map((n) => [n, []]));
    const bad: string[] = [];
    const cells = cubes(BANDS.rivets.cell);
    for (const box of cells) {
      setRegion(rivetGraph, box);
      const { outputs } = await cook(rivetGraph, { outputs: graphs.rivetOutputs });
      for (const name of graphs.rivetOutputs) {
        const mine = instanceHashes(outputs[name] ?? []);
        const theirs = instanceHashes(whole[name] ?? [], seatedIn(box));
        const d = diffSorted(theirs, mine);
        if (d.missing + d.extra > 0) bad.push(`${name} @ ${box.min}: ${JSON.stringify(d)} of ${theirs.length}`);
        got.get(name)?.push(mine);
      }
    }
    expect(bad).toEqual([]);
    // A partition, not a cover: the multiset sum IS the whole cook.
    let heads = 0;
    for (const name of graphs.rivetOutputs) {
      const all = instanceHashes(whole[name] ?? []);
      heads += all.length;
      expect(diffSorted(all, unionSorted(got.get(name) ?? [])), name).toEqual({ missing: 0, extra: 0 });
    }
    // 1,207,672 + 252: the Otis legs' entretoises whole at XXVII-XXV
    // (spec.ts ENTRETOISE.openAt), laced and riveted across the old opening;
    // + 208: the central posts under and over the belts' chord plates
    // (XXIV, XXIII, XVIII) bearing on them, 0.05 longer (legs.ts
    // `postStretch`), their lacing rivets with them; - 3,200: the X's
    // crossing plates laid along their struts as rhombi (crossing.ts
    // `plateFrame`), their edge rows cut to whole pitches and the lacing
    // heads they cover moved with them; + 360: the uprights' splice heads
    // the legs' joint plates no longer cover, the plates stopping short of
    // the box's corners (strut.ts `JointOpts.corners`).
    expect(heads).toBe(1_205_292);
    expect(cells.length).toBe(532);
  }, 900_000);
});

describe("the page's World", () => {
  it("delivers exactly those cells, keeps none of their outputs, and cooks no sky", async () => {
    const delivered: Array<{ level: string; coord: readonly number[]; outputs: CellOutputs }> = [];
    const { world } = bandsWorld({
      onCellReady: (level, coord, outputs) => delivered.push({ level, coord: coord as readonly number[], outputs }),
    });
    // Beside pile 4's leg, 30 m up: both levels have cells to cook.
    const at = [60, 30, 60] as const;
    const st = await world.update(at);
    expect(st.pending).toBe(0);
    const laced = delivered.filter((d) => d.level === "laced");
    const rivets = delivered.filter((d) => d.level === "rivets");
    expect(laced.length).toBeGreaterThan(10);
    expect(rivets.length).toBeGreaterThan(10);
    let heads = 0;
    for (const d of delivered) {
      const s = d.level === "laced" ? BANDS.laced.cell : BANDS.rivets.cell;
      const box: Box = {
        min: [d.coord[0]! * s, d.coord[1]! * s, d.coord[2]! * s],
        max: [(d.coord[0]! + 1) * s, (d.coord[1]! + 1) * s, (d.coord[2]! + 1) * s],
      };
      expect(inEnvelope(box)).toBe(true);
      // Within the level's radius of the viewpoint, centre to viewpoint.
      const c = box.min.map((v) => v + s / 2);
      expect(Math.hypot(c[0]! - at[0], c[1]! - at[1], c[2]! - at[2])).toBeLessThanOrEqual(
        d.level === "laced" ? BANDS.laced.radius : BANDS.rivets.radius,
      );
      const names = d.level === "laced" ? LACED_CLASSES : graphs.rivetOutputs;
      expect(Object.keys(d.outputs).sort()).toEqual([...(d.level === "laced" ? graphs.lacedOutputs : graphs.rivetOutputs)].sort());
      for (const name of names) {
        const list: DataCollection = d.outputs[name] ?? [];
        const mine = d.level === "laced" ? meshHashes(list) : instanceHashes(list);
        if (d.level === "laced") {
          const inner = meshHashes(whole[name] ?? [], boxMeets(box, -EPS));
          const outer = meshHashes(whole[name] ?? [], mayCarry(box));
          expect(diffSorted(inner, mine).missing, `${d.coord} ${name} lost`).toBe(0);
          expect(diffSorted(mine, outer).missing, `${d.coord} ${name} stray`).toBe(0);
        } else {
          const theirs = instanceHashes(whole[name] ?? [], seatedIn(box));
          expect(diffSorted(theirs, mine), `${d.level} ${d.coord} ${name}`).toEqual({ missing: 0, extra: 0 });
        }
        if (d.level === "rivets") heads += mine.length;
      }
      // keepOutputs: false — the World kept the record, not the payload.
      expect(Object.keys(world.getCell(d.level, d.coord as [number, number, number])?.outputs ?? { x: 1 })).toEqual([]);
    }
    expect(heads).toBeGreaterThan(10_000);
  }, 600_000);
});

describe("bandsFrom", () => {
  it("reads the radii by position over the defaults, and keeps only the levels asked for", () => {
    expect(bandsFrom(null)).toEqual(BANDS);
    expect(bandsFrom("")).toEqual(BANDS);
    expect(bandsFrom("x,-5")).toEqual(BANDS);
    expect(bandsFrom("90,30")).toEqual({ laced: { cell: 32, radius: 90 }, rivets: { cell: 16, radius: 30 } });
    expect(bandsFrom(",30")).toEqual({ laced: BANDS.laced, rivets: { cell: 16, radius: 30 } });
    // Positional whichever levels are kept: the second number is the rivets'.
    const laced = bandsFrom("90,30", { laced: true, rivets: false });
    const rivets = bandsFrom("90,30", { laced: false, rivets: true });
    expect(laced).toEqual({ laced: { cell: 32, radius: 90 } });
    expect(rivets).toEqual({ rivets: { cell: 16, radius: 30 } });
    // No key at all for the level left out (toEqual would pass an undefined
    // one), and none after the trip to the worker either.
    expect(Object.keys(laced)).toEqual(["laced"]);
    expect(Object.keys(structuredClone(rivets))).toEqual(["rivets"]);
    expect(() => bandsFrom("90,30", { laced: false, rivets: false })).toThrow(/neither level/);
    expect(finestCell(BANDS)).toBe(16);
    expect(finestCell(laced)).toBe(32);
    expect(finestCell(rivets)).toBe(16);
  });

  it("builds only the graphs and levels asked for, and names what is missing", () => {
    const none = { lacedOutputs: [], rivetOutputs: [] };
    expect(() => bandsLevels(none, {})).toThrow(/neither level/);
    expect(() => bandsLevels(none, { rivets: BANDS.rivets })).toThrow(/"rivets" but its graph was not built/);
    expect(bandsLevels(graphs).map((l) => l.name)).toEqual(["laced", "rivets"]);
    expect(bandsLevels(graphs, { rivets: BANDS.rivets }).map((l) => l.name)).toEqual(["rivets"]);
  });
});

/** Where the page's World tests stand: beside pile 4's leg, 30 m up. */
const AT = [60, 30, 60] as const;

/** The cube `coord` of side `s`. */
const cubeAt = (coord: readonly number[], s: number): Box => ({
  min: [coord[0]! * s, coord[1]! * s, coord[2]! * s],
  max: [(coord[0]! + 1) * s, (coord[1]! + 1) * s, (coord[2]! + 1) * s],
});

describe("a World of one level", () => {
  it("laced alone: laced cells, the whole cook inside each, and no rivet level or graph", async () => {
    const spec = bandsFrom("40", { laced: true, rivets: false });
    const delivered: Array<{ level: string; coord: readonly number[]; outputs: CellOutputs }> = [];
    const { world, graphs: built } = bandsWorld({
      spec,
      onCellReady: (level, coord, outputs) => delivered.push({ level, coord: coord as readonly number[], outputs }),
    });
    expect(built.laced).toBeDefined();
    expect(built.rivets).toBeUndefined();
    expect(built.rivetOutputs).toEqual([]);
    expect((await world.update(AT)).pending).toBe(0);
    expect(world.stats().levels.map((l) => l.name)).toEqual(["laced"]);
    expect(delivered.length).toBeGreaterThan(2);
    for (const d of delivered) {
      expect(d.level).toBe("laced");
      const box = cubeAt(d.coord, BANDS.laced.cell);
      expect(inEnvelope(box)).toBe(true);
      expect(Object.keys(d.outputs).sort()).toEqual([...built.lacedOutputs].sort());
      for (const cls of LACED_CLASSES) {
        const mine = meshHashes(d.outputs[cls] ?? []);
        expect(diffSorted(meshHashes(whole[cls] ?? [], boxMeets(box, -EPS)), mine).missing, `${d.coord} ${cls} lost`).toBe(0);
        expect(diffSorted(mine, meshHashes(whole[cls] ?? [], mayCarry(box))).missing, `${d.coord} ${cls} stray`).toBe(0);
      }
    }
  }, 600_000);

  it("rivets alone: rivet cells at the top, with no parent, the whole cook's heads in each, and no laced level or graph", async () => {
    const spec = bandsFrom(",30", { laced: false, rivets: true });
    const built = bandsGraphs(1889, undefined, { laced: false, rivets: true });
    expect(built.laced).toBeUndefined();
    expect(built.lacedOutputs).toEqual([]);
    // bandsWorld's levels, each bind watched for the parent it is handed.
    const parented: boolean[] = [];
    const levels = bandsLevels(built, spec).map((l) => ({
      ...l,
      bind: (graph: Graph, ctx: CellContext): void => {
        parented.push(ctx.parent !== undefined);
        l.bind?.(graph, ctx);
      },
    }));
    const delivered: Array<{ level: string; coord: readonly number[]; outputs: CellOutputs }> = [];
    const world = new World({
      seed: 1889,
      levels,
      onCellReady: (level, coord, outputs) => delivered.push({ level, coord: coord as readonly number[], outputs }),
    });
    expect((await world.update(AT)).pending).toBe(0);
    expect(world.stats().levels.map((l) => l.name)).toEqual(["rivets"]);
    expect(delivered.length).toBeGreaterThan(2);
    expect(parented.length).toBe(delivered.length);
    expect(parented.every((p) => !p)).toBe(true);
    let heads = 0;
    for (const d of delivered) {
      expect(d.level).toBe("rivets");
      const box = cubeAt(d.coord, BANDS.rivets.cell);
      const c = box.min.map((v) => v + BANDS.rivets.cell / 2);
      expect(Math.hypot(c[0]! - AT[0], c[1]! - AT[1], c[2]! - AT[2])).toBeLessThanOrEqual(30);
      for (const name of built.rivetOutputs) {
        const mine = instanceHashes(d.outputs[name] ?? []);
        expect(diffSorted(instanceHashes(whole[name] ?? [], seatedIn(box)), mine), `${d.coord} ${name}`).toEqual({ missing: 0, extra: 0 });
        heads += mine.length;
      }
    }
    expect(heads).toBeGreaterThan(1000);
  }, 600_000);
});
