/**
 * THE BOX NODES ARE BLIND TO THEIR CELLS' TRANSFORMS: cooked on the same
 * bounds, at the identity or under any P, rot and scale, they write the
 * same bytes, and every piece carries the transform of the cell it came
 * from bit for bit.
 *
 * Why that is the property to hold. A cell's box is an extent LOCAL to its
 * point's transform, world(x) = P + rot * (scale * x), as copyToPoints and
 * spawn read it. Every cut, placement, offset and per-axis scale these
 * nodes make is along the box's OWN axes, and an affine map commutes with
 * all of them, so arithmetic on the stored local corners that never reads
 * the transform, carried onto every piece unchanged, is exactly the
 * transformed answer. This suite runs that claim on random cells under
 * random transforms (tests/support/localBoxes.ts) for splitBox, shellSplit,
 * placeBox (both frames), offsetBox (both frames), transformBox (pivotIn
 * "cell" and the point pivot) and a two-rule applyRules over them, with
 * box names and random fields in the params so a per-cell decision is
 * exercised. transformBox "union" pools corners across cells, which is
 * only meaningful when they share one transform, so it is run under a
 * SHARED transform alone.
 *
 * The comparator is shown to report "different" first — on a bound nudged
 * one ulp, on a transform column changed on one piece, and on an input
 * bound nudged one ulp — so its "same" is evidence.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, createPointCloud } from "../src/data/index.js";
import { deriveGeometry } from "../src/data/derive.js";
import { type NodeDef, makeGeometryItem } from "../src/graph/index.js";
import { cook, deserializeGraph } from "../src/index.js";
import { fieldFromJson, offsetBox, placeBox, shellSplit, splitBox, transformBox } from "../src/nodes/index.js";
import { firstGeo, runNode } from "../src/nodes/nodes.testsupport.js";
import type { Pcg32 } from "../src/random/index.js";
import {
  IDENTITY,
  type PointTransform,
  randomTransform,
  stampTransforms,
  transformBlindDiff,
  trialRng,
} from "./support/localBoxes.js";

type Box = [number[], number[]];

/** Cells with these boxes, seeds 100 + i, an i32 `cell` index, at the identity. */
function cells(list: readonly Box[]): Geometry {
  const geo = createPointCloud(list.length);
  const pts = geo.attrs.point;
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  const seed = pts.require("seed");
  const cell = pts.add("cell", "i32", 1, -1);
  list.forEach(([a, b], i) => {
    lo.setTuple(i, a);
    hi.setTuple(i, b);
    seed.set(i, 100 + i);
    cell.set(i, i);
  });
  return geo;
}

/**
 * 2..7 random boxes: half on a 1/8 grid (sizes 1/2 to 16), half with full
 * f32 corners near ±40, so both the exact and the tolerance paths of the
 * nodes are exercised.
 */
function randomBoxes(rng: Pcg32): Box[] {
  const n = 2 + Math.floor(rng.nextF32() * 6);
  const out: Box[] = [];
  for (let i = 0; i < n; i++) {
    const dyadic = rng.nextF32() < 0.5;
    const lo: number[] = [];
    const hi: number[] = [];
    for (let k = 0; k < 3; k++) {
      if (dyadic) {
        const a = Math.round((rng.nextF32() * 2 - 1) * 20 * 8) / 8;
        const s = Math.round((0.5 + rng.nextF32() * 15.5) * 8) / 8;
        lo.push(a);
        hi.push(a + s);
      } else {
        const a = Math.fround((rng.nextF32() * 2 - 1) * 40);
        const b = Math.fround(a + 0.5 + rng.nextF32() * 15.5);
        lo.push(a);
        hi.push(b);
      }
    }
    out.push([lo, hi]);
  }
  return out;
}

const f = (fn: string, ...args: unknown[]) => ({ fn, args });
const box = (name: string) => ({ fn: "box", name });
/**
 * A per-cell pseudo-random number in [0, 1) from the SEED alone. Not
 * randomField: that keys on point identity, the bits of P with the seed,
 * so it is not blind to P by design (the last block of this suite).
 */
const SALT: Record<string, number> = { tall: 0.6180339, ax: 0.7548776, d: 0.5698403, p: 0.8191725 };
const rf = (key: string) => f("fract", f("mul", { fn: "attribute", name: "seed" }, SALT[key]!));

/** Run one node directly; a param written as field JSON (an object with `fn`) is parsed first. */
async function one<P>(def: NodeDef<P>, params: Partial<P>, geo: Geometry): Promise<Geometry> {
  const parsed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    parsed[k] = v !== null && typeof v === "object" && "fn" in v ? fieldFromJson(v as never) : v;
  }
  return firstGeo((await runNode(def, parsed as Partial<P>, { in: [makeGeometryItem(geo)] }, 7)).out);
}

/**
 * A two-rule grammar as graph JSON: "mass" is halved along its longest
 * horizontal axis into two "block"s, a random one of them relabelled
 * "tall"; "block" is shelled into floor and four walls; "tall" is placed
 * and offset by box names. pointList carries the cells' bounds, rot,
 * scale and index; a setAttribute ahead of the rules writes the axiom.
 */
function grammarDoc(boxes: readonly Box[], ts: readonly PointTransform[]): unknown {
  const positions = ts.flatMap((t) => t.P);
  return {
    formatVersion: 1,
    seed: 5,
    nodes: [
      {
        id: "cells",
        type: "pointList",
        params: {
          positions,
          columnNames: ["boundsMin", "boundsMax", "rot", "scale", "cell"],
          columnTypes: ["vec3", "vec3", "vec4", "vec3", "i32"],
          columnValues: [
            ...boxes.flatMap((b) => b[0]),
            ...boxes.flatMap((b) => b[1]),
            ...ts.flatMap((t) => t.rot),
            ...ts.flatMap((t) => t.scale),
            ...boxes.map((_, i) => i),
          ],
        },
      },
      { id: "axiom", type: "setAttribute", params: { name: "piece", domain: "point", type: "string", stringValue: "mass" } },
      {
        id: "rules",
        type: "applyRules",
        // No ruleRoll: it keys on point identity, P's bits included.
        params: { rollAttr: "" },
        subgraph: {
          graph: {
            formatVersion: 1,
            seed: 0,
            nodes: [
              {
                id: "halve",
                type: "splitBox",
                params: { axis: "longest", longestOf: "xz", labels: ["block", "block"], sizes: [1, 1], units: ["relative", "relative"] },
              },
              {
                id: "pick",
                type: "setAttribute",
                params: { name: "piece", domain: "point", type: "string", values: ["block", "tall"], value: f("lt", rf("tall"), 0.5) },
              },
              {
                id: "shell",
                type: "shellSplit",
                params: { faces: ["floor", "south", "north", "west", "east"], labels: ["end", "end", "end", "end", "end"], thickness: [0.25], fit: "clip", labelAttr: "piece" },
              },
              {
                id: "place",
                type: "placeBox",
                params: { size: f("vec", f("mul", box("sx"), 0.5), 1, f("mul", box("sz"), 0.25)), anchor: [0.5, 0, 0.25], fit: "clip", labelAttr: "piece", label: "end" },
              },
              { id: "grow", type: "offsetBox", params: { margin: f("mul", box("sy"), 0.125), snap: [0.5, 0, 0], snapMode: "out", fit: "scale" } },
            ],
            connections: [
              { from: ["halve", "out"], to: ["pick", "in"] },
              { from: ["place", "out"], to: ["grow", "in"] },
            ],
            outputs: [],
          },
          inputs: [
            { name: "mass", node: "halve", pin: "in" },
            { name: "block", node: "shell", pin: "in" },
            { name: "tall", node: "place", pin: "in" },
          ],
          outputs: [
            { name: "mass", node: "pick", pin: "out" },
            { name: "block", node: "shell", pin: "out" },
            { name: "tall", node: "grow", pin: "out" },
          ],
        },
      },
    ],
    connections: [
      { from: ["cells", "out"], to: ["axiom", "in"] },
      { from: ["axiom", "out"], to: ["rules", "in"] },
    ],
    outputs: [{ id: "rules", pin: "out", name: "out" }],
  };
}

/** One case: the node (or chain) cooked on cells carrying transforms. */
interface Case {
  readonly name: string;
  /** Absent: run under per-cell transforms too, not only a shared one. */
  readonly sharedOnly?: true;
  run(boxes: readonly Box[], ts: readonly PointTransform[]): Promise<Geometry>;
}

const onCells =
  (step: (geo: Geometry) => Promise<Geometry>) =>
  (boxes: readonly Box[], ts: readonly PointTransform[]): Promise<Geometry> =>
    step(stampTransforms(cells(boxes), ts));

const SHELL = {
  faces: ["floor", "south", "north", "west", "east", "ceiling"],
  labels: ["floor", "wall", "wall", "wall", "wall", "roof"],
  thickness: f("mul", box("sy"), 0.1),
  interiorLabel: "core",
  fit: "clip",
  labelAttr: "piece",
  faceAttr: "face",
  upAxisAttr: "upAxis",
  upSignAttr: "upSign",
  outAxisAttr: "outAxis",
} as const;

const CASES: Case[] = [
  {
    name: "splitBox: repeat bays on x, snapped",
    run: onCells((g) => one(splitBox, { axis: "x", labels: ["bay"], sizes: 1.5, units: ["repeat"], snap: [0.5, 0, 0], fit: "clip", indexAttr: "bay", countAttr: "bays" }, g)),
  },
  {
    name: "splitBox: longest of xz, absolute + relative, reversed",
    run: onCells((g) => one(splitBox, { axis: "longest", longestOf: "xz", labels: ["a", "b", "c"], sizes: [1, 1, 2], units: ["absolute", "relative", "absolute"], direction: -1, fit: "scale" }, g)),
  },
  {
    name: "splitBox: per-cell axis from a seed roll, field sizes",
    run: onCells((g) =>
      one(
        splitBox,
        {
          axis: "perCell",
          axisIndex: f("floor", f("mul", rf("ax"), 2.999)) as never,
          labels: ["lo", "hi"],
          sizes: f("vec", f("mul", box("sy"), 0.3), 1) as never,
          units: ["absolute", "relative"],
          fit: "clip",
        },
        g,
      ),
    ),
  },
  { name: "shellSplit: six faces and the interior, thickness from box names", run: onCells((g) => one(shellSplit, SHELL as never, g)) },
  {
    name: "placeBox: box frame, field size and anchor, snapped, clipped",
    run: onCells((g) =>
      one(
        placeBox,
        {
          size: f("vec", f("mul", box("sx"), 0.5), 2, f("mul", box("sz"), rf("d"))) as never,
          anchor: f("vec", rf("ax"), 1, 0.5) as never,
          offset: [0, 1, 0],
          offsetUnits: ["absolute", "self", "absolute"],
          snap: [0.5, 0.5, 0],
          fit: "clip",
        },
        g,
      ),
    ),
  },
  {
    name: "placeBox: face frame after shellSplit",
    run: onCells(async (g) =>
      one(
        placeBox,
        { frame: "face", size: [1, 1, 0.5], units: ["absolute", "absolute", "absolute"], anchor: [0, 0, 1], offset: [0.5, 0, 0], fit: "clip", where: f("lt", { fn: "attribute", name: "face" }, 5) as never },
        await one(shellSplit, SHELL as never, g),
      ),
    ),
  },
  {
    name: "offsetBox: box frame, field margins, snap out, fit scale",
    run: onCells((g) => one(offsetBox, { margin: f("mul", box("sx"), -0.1) as never, marginMax: [0, 1, 0], snap: [0.25, 0, 0.5], snapMode: "out", fit: "scale" }, g)),
  },
  {
    name: "offsetBox: face frame after shellSplit, snap size",
    run: onCells(async (g) =>
      one(
        offsetBox,
        { frame: "face", marginMax: [0, 0, 1], marginMin: [0.5, 0, 0], snap: [1, 0, 1], snapTo: "size", fit: "allow", where: f("lt", { fn: "attribute", name: "face" }, 5) as never },
        await one(shellSplit, SHELL as never, g),
      ),
    ),
  },
  {
    name: "transformBox: pivotIn cell, field pivot",
    run: onCells((g) => one(transformBox, { scale: [0.5, 2, -1], pivot: f("vec", rf("p"), 0, 0.5) as never, pivotIn: "cell", translate: f("mul", box("size"), 0.25) as never }, g)),
  },
  {
    name: "transformBox: a point pivot",
    run: onCells((g) => one(transformBox, { scale: [1, 0.4, 1], pivot: [3, 0, -2], translate: [-0.5, 0, 0.125] }, g)),
  },
  {
    name: "transformBox: pivotIn union",
    sharedOnly: true,
    run: onCells((g) => one(transformBox, { scale: [2, 0.5, 1], pivot: [0.5, 0, 0.5], pivotIn: "union" }, g)),
  },
  {
    name: "applyRules: halve, then shell or place-and-offset",
    async run(boxes, ts) {
      const r = await cook(deserializeGraph(grammarDoc(boxes, ts) as never));
      return firstGeo(r.outputs.out);
    },
  },
];

/** The cook's output, or its error message: a refusal must be the same refusal. */
async function attempt(c: Case, boxes: readonly Box[], ts: readonly PointTransform[]): Promise<Geometry | string> {
  try {
    return await c.run(boxes, ts);
  } catch (e) {
    return e instanceof Error ? `refused: ${e.message}` : `refused: ${String(e)}`;
  }
}

const TRIALS = 24;

describe("the comparator can say different", () => {
  const boxes: Box[] = [
    [[0, 0, 0], [6, 3, 2]],
    [[-2.5, 1, 4], [3, 7.25, 9]],
  ];
  const t: PointTransform = { P: [5, -3, 12.5], rot: [0, Math.fround(Math.SQRT1_2), 0, Math.fround(Math.SQRT1_2)], scale: [2, 1, 0.5] };
  const run = (bx: readonly Box[], ts: readonly PointTransform[]) => CASES[0]!.run(bx, ts);

  it("on the same bounds under a transform it reports nothing", async () => {
    const base = await run(boxes, [IDENTITY, IDENTITY]);
    const moved = await run(boxes, [t, t]);
    expect(base.pointCount).toBeGreaterThan(2);
    expect(transformBlindDiff(base, moved, t)).toEqual([]);
  });

  it("a bound nudged one ulp on one output piece is reported", async () => {
    const base = await run(boxes, [IDENTITY, IDENTITY]);
    const moved = deriveGeometry(await run(boxes, [t, t]));
    const hi = moved.attrs.point.require("boundsMax").writable() as Float32Array;
    const v = hi[4]!;
    hi[4] = new Float32Array(new Uint32Array([new Uint32Array(new Float32Array([v]).buffer)[0]! + 1]).buffer)[0]!;
    expect(transformBlindDiff(base, moved, t)).toEqual(["point.boundsMax bytes differ"]);
  });

  it("a transform column changed on one piece, or a piece left at the identity, is reported", async () => {
    const base = await run(boxes, [IDENTITY, IDENTITY]);
    const moved = deriveGeometry(await run(boxes, [t, t]));
    (moved.attrs.point.require("scale").writable() as Float32Array)[3 * 2 + 1] = 1.5;
    expect(transformBlindDiff(base, moved, t).join()).toMatch(/point 2 scale/);
    // The identity cook compared as if it were the moved one.
    expect(transformBlindDiff(base, base, t).join()).toMatch(/point 0 P/);
  });

  it("an INPUT bound nudged one ulp changes the output and is reported", async () => {
    const base = await run(boxes, [IDENTITY, IDENTITY]);
    const nudged: Box[] = [[[0, 0, 0], [Math.fround(6 + 2 ** -21), 3, 2]], boxes[1]!];
    const moved = await run(nudged, [t, t]);
    expect(transformBlindDiff(base, moved, t)).not.toEqual([]);
  });
});

describe("the box nodes are blind to their cells' transforms", () => {
  for (const c of CASES) {
    it(`${c.name}: the same bytes under a shared${c.sharedOnly ? "" : " and a per-cell"} random transform`, async () => {
      let cooked = 0;
      for (let trial = 0; trial < TRIALS; trial++) {
        const rng = trialRng(trial, c.name.length);
        const boxes = randomBoxes(rng);
        const ids = boxes.map(() => IDENTITY);
        const shared = randomTransform(rng);
        const each = boxes.map(() => randomTransform(rng));
        const base = await attempt(c, boxes, ids);
        for (const ts of c.sharedOnly ? [boxes.map(() => shared)] : [boxes.map(() => shared), each]) {
          const moved = await attempt(c, boxes, ts);
          if (typeof base === "string" || typeof moved === "string") {
            expect({ trial, moved: typeof moved === "string" ? moved : "cooked" }).toEqual({ trial, moved: typeof base === "string" ? base : "cooked" });
            continue;
          }
          cooked++;
          const diff = transformBlindDiff(base, moved, ts);
          expect({ trial, diff }).toEqual({ trial, diff: [] });
        }
      }
      // Most trials must actually cook, or the property is vacuous.
      expect(cooked).toBeGreaterThanOrEqual(TRIALS);
    }, 60_000);
  }
});

describe("what is NOT blind to P, by design: identity-keyed randomness", () => {
  // randomField and applyRules' ruleRoll key on a point's IDENTITY — the
  // bits of P with its seed (src/data/identity.ts) — so a cell moved to
  // another P draws other numbers. That is a property of the randomness,
  // not of the box arithmetic: every piece of one root keeps the root's P,
  // as it always has, so a grammar's draws do not move when its boxes'
  // meaning does. Pinned here so the suite above cannot be read as
  // claiming more than it shows.
  const boxes: Box[] = [[[0, 0, 0], [4, 2, 2]]];
  const t: PointTransform = { P: [3, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1] };

  it("a placeBox anchored by randomField places differently once P moves", async () => {
    const run = (ts: PointTransform[]) =>
      one(placeBox, { size: [1, 1, 1], anchor: f("vec", { fn: "randomField", key: "a" }, 0, 0) as never }, stampTransforms(cells(boxes), ts));
    expect(transformBlindDiff(await run([IDENTITY]), await run([t]), t)).toEqual(["point.boundsMax bytes differ", "point.boundsMin bytes differ"]);
  });

  it("applyRules' ruleRoll differs once P moves; with rollAttr \"\" the grammar is blind", async () => {
    const roll = async (ts: PointTransform[], rollAttr?: string) => {
      const doc = grammarDoc(boxes, ts) as { nodes: { id: string; params: Record<string, unknown> }[] };
      const rules = doc.nodes.find((n) => n.id === "rules")!;
      if (rollAttr === undefined) delete rules.params.rollAttr;
      return firstGeo((await cook(deserializeGraph(doc as never))).outputs.out);
    };
    expect(transformBlindDiff(await roll([IDENTITY]), await roll([t]), t)).toEqual(["point.ruleRoll bytes differ"]);
    expect(transformBlindDiff(await roll([IDENTITY], ""), await roll([t], ""), t)).toEqual([]);
  });
});
