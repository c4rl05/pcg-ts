/**
 * Hand-driven heads (demos/eiffel/heads.ts, strut.ts `rivetSpawn`;
 * SOURCES.md §27.7).
 *
 * The graph gives every rivet one draw, `headDrive`, from its own identity;
 * the page turns it into the head's width, rise, lean, turn and off-centre
 * (`driveHead`, `driveMatrix`) and composes it into the instance matrix at
 * load. This holds the decode to its bounds, the transform to its one hard
 * rule (no point of a head's rim ever rises off the plane it was set on,
 * with a control that the lean alone would lift it), and the draws to what
 * a head's variance needs: on every rivet output in the tower, one per
 * instance in [0, 1) and near enough all different, and the same for a head
 * whatever order the heads come in.
 */
import { describe, expect, it } from "vitest";
import { Graph, cook, pointGrid, setAttribute, vec } from "pcg-ts";
import { HEAD_DRIVE, HEAD_DRIVE_ATTR, applyMatrix, driveHead, driveMatrix } from "../demos/eiffel/heads.js";
import { indexTable } from "../demos/eiffel/lattice.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { rivetSpawn } from "../demos/eiffel/strut.js";

type Vec3 = readonly [number, number, number];

interface Batch {
  count: number;
  transforms: Float32Array;
  attributes?: Record<string, ArrayLike<number>>;
}

function batches(item: unknown): Batch[] {
  const it = (item as unknown[])[0] as { kind: string; batches: Batch[] };
  expect(it.kind).toBe("instances");
  return it.batches;
}

/** Draws spread over [0, 1) as an f32 column would hold them. */
const DRAWS = Array.from({ length: 20_000 }, (_, i) => Math.fround((i * 0.6180339887) % 1));

describe("eiffel rivet heads", () => {
  it("decodes each draw within its bounds, and over most of them", () => {
    const hs = DRAWS.map(driveHead);
    const span = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];
    const [w0, w1] = span(hs.map((h) => h.width));
    const [r0, r1] = span(hs.map((h) => h.rise));
    const [, l1] = span(hs.map((h) => h.lean));
    const [, o1] = span(hs.map((h) => Math.hypot(...h.off)));
    expect(w0).toBeGreaterThanOrEqual(1 - HEAD_DRIVE.width);
    expect(w1).toBeLessThanOrEqual(1 + HEAD_DRIVE.width);
    expect(r0).toBeGreaterThanOrEqual(1 - HEAD_DRIVE.rise);
    expect(r1).toBeLessThanOrEqual(1 + HEAD_DRIVE.rise);
    expect(l1).toBeLessThanOrEqual(HEAD_DRIVE.lean);
    expect(o1).toBeLessThanOrEqual(HEAD_DRIVE.off);
    // Over most of each range: not a constant, not a sliver.
    expect(w1 - w0).toBeGreaterThan(1.9 * HEAD_DRIVE.width);
    expect(r1 - r0).toBeGreaterThan(1.9 * HEAD_DRIVE.rise);
    expect(l1).toBeGreaterThan(0.95 * HEAD_DRIVE.lean);
    expect(o1).toBeGreaterThan(0.95 * HEAD_DRIVE.off);
    // The values of one head are not one value: width and rise decorrelated.
    const n = hs.length;
    const mw = hs.reduce((s, h) => s + h.width, 0) / n;
    const mr = hs.reduce((s, h) => s + h.rise, 0) / n;
    const cov = hs.reduce((s, h) => s + (h.width - mw) * (h.rise - mr), 0) / n;
    const sw = Math.sqrt(hs.reduce((s, h) => s + (h.width - mw) ** 2, 0) / n);
    const sr = Math.sqrt(hs.reduce((s, h) => s + (h.rise - mr) ** 2, 0) / n);
    expect(Math.abs(cov / (sw * sr))).toBeLessThan(0.1);
  });

  it("never lifts a rim off its plate, leans the axis by its lean, and keeps the head a scaled rotation", () => {
    let highest = -Infinity;
    let lifted = 0;
    for (const draw of DRAWS.slice(0, 4000)) {
      const h = driveHead(draw);
      const m = driveMatrix(h);
      const bare = driveMatrix({ ...h, sink: 0 });
      let top = -Infinity;
      let topBare = -Infinity;
      for (let k = 0; k < 64; k++) {
        const a = (k / 64) * 2 * Math.PI;
        const rim: Vec3 = [Math.cos(a), 0, Math.sin(a)];
        top = Math.max(top, applyMatrix(m, rim)[1]);
        topBare = Math.max(topBare, applyMatrix(bare, rim)[1]);
      }
      highest = Math.max(highest, top);
      // The control: unsunk, the lean lifts the rim.
      if (topBare > 0.02 * h.width * Math.sin(HEAD_DRIVE.lean)) lifted++;
      // The axis (the image of +y, less the shift) leans by `lean`.
      const up = [m[4]!, m[5]!, m[6]!];
      expect(Math.acos(up[1]! / Math.hypot(...up))).toBeCloseTo(h.lean, 9);
      // Columns square to each other: a rotation times a scale, which
      // three's instanced normal transform handles exactly.
      const col = (j: number) => [m[4 * j]!, m[4 * j + 1]!, m[4 * j + 2]!];
      const dot = (p: number[], q: number[]) => p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!;
      expect(Math.abs(dot(col(0), col(1)))).toBeLessThan(1e-12);
      expect(Math.abs(dot(col(1), col(2)))).toBeLessThan(1e-12);
      expect(Math.abs(dot(col(0), col(2)))).toBeLessThan(1e-12);
      // The sink is in the plate's normal; the off-centre in its plane.
      expect(m[13]).toBeCloseTo(-h.width * Math.sin(h.lean), 12);
    }
    expect(highest).toBeLessThan(1e-12);
    expect(lifted).toBeGreaterThan(3000);
  });

  it("gives every head one draw of its own, whatever order the heads come in", async () => {
    // The same heads (a plate of them, each with its seed) spawned in one
    // order and in the reverse: each head draws the same value, since the
    // draw is keyed on the head, not its slot.
    const at: Vec3[] = [];
    for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) at.push([0.1 * i, 2 + 0.07 * j, 0.03 * i * j]);
    const drawsBy = async (list: readonly Vec3[]) => {
      const g = new Graph();
      const grid = g.add(pointGrid, { countX: list.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] }, "grid");
      const col = (c: number) => indexTable(list.map((p) => p[c]!));
      const place = g.add(setAttribute, { name: "P", type: "f32", tupleSize: 3, value: vec(col(0), col(1), col(2)) }, "place");
      const seed = g.add(setAttribute, { name: "seed", type: "u32", value: 7 }, "seed");
      g.connect(grid, "out", place, "in");
      g.connect(place, "out", seed, "in");
      g.output(rivetSpawn(g, "t", [seed]), "instances", "r");
      const { outputs } = await cook(g);
      const byHead = new Map<string, number>();
      for (const b of batches(outputs.r)) {
        const d = b.attributes?.[HEAD_DRIVE_ATTR];
        expect(d, "headDrive channel").toBeDefined();
        expect(d!.length).toBe(b.count);
        for (let k = 0; k < b.count; k++) {
          const t = b.transforms;
          byHead.set([t[16 * k + 12], t[16 * k + 13], t[16 * k + 14]].map((v) => v!.toFixed(6)).join(","), d![k]!);
        }
      }
      return byHead;
    };
    const one = await drawsBy(at);
    const other = await drawsBy([...at].reverse());
    expect(one.size).toBe(at.length);
    expect(other.size).toBe(one.size);
    for (const [p, d] of one) expect(other.get(p), p).toBe(d);
    // And they are not one value: the control a constant draw would fail.
    expect(new Set(one.values()).size).toBeGreaterThan(0.99 * one.size);
  }, 60_000);

  it("carries the draw on every rivet output of the riveted tower", async () => {
    const { outputs } = await cook(buildEiffel(1889, { rivets: true }));
    const names = Object.keys(outputs).filter((k) => k.startsWith("rivets."));
    expect(names.length).toBeGreaterThan(50);
    let heads = 0;
    const seen = new Set<number>();
    for (const name of names) {
      for (const b of batches(outputs[name])) {
        const d = b.attributes?.[HEAD_DRIVE_ATTR];
        expect(d, name).toBeDefined();
        expect(d!.length, name).toBe(b.count);
        for (let k = 0; k < b.count; k++) {
          const v = d![k]!;
          expect(v >= 0 && v < 1, `${name} draw ${v}`).toBe(true);
          if (k % 16 === 0) seen.add(v);
        }
        heads += b.count;
      }
    }
    expect(heads).toBeGreaterThan(1_000_000);
    // A 24-bit draw over a sixteenth of a million heads: a few coincide by
    // chance (the birthday bound), no more.
    expect(seen.size).toBeGreaterThan(0.99 * Math.ceil(heads / 16));
  }, 600_000);
});
