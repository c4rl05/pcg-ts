/**
 * The erection's temporary works (demos/eiffel/erection.ts): the timber
 * pylons with their sand boxes and shoes, and the girders' scaffolds with
 * their decks and the arches' centring. Held to PL-XXV and the text, to
 * the steel they stood beside (no timber through the iron standing at the
 * same time), and to their days (chronology.ts `WORKS`).
 */
import { type DataCollection, type Geometry, cook, firstGeometry } from "pcg-ts";
import { toBufferGeometry } from "pcg-ts/three";
import { beforeAll, describe, expect, it } from "vitest";
import { MILESTONES, WORKS, dayOf, frontDay, stageTriangles, worksDown } from "../demos/eiffel/chronology.js";
import {
  BEARING,
  PYLON,
  SCAFFOLD,
  deckBlocks,
  intradosY,
  LATERAL_PROP_Y,
  pylonBearings,
  propY,
  pylonBlocks,
  scaffoldBlocks,
  undersideAt,
} from "../demos/eiffel/erection.js";
import type { Block, Prism } from "../demos/eiffel/ground.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { ARCH, profileAt, yOfCote } from "../demos/eiffel/spec.js";
import type { Vec3 } from "./support/eiffelGround.js";

const WORKS_OUT = ["works.pylons", "works.bearings", "works.scaffolds", "works.decks"];

let plain: Record<string, DataCollection>;
let built: Record<string, DataCollection>;

beforeAll(async () => {
  plain = (await cook(buildEiffel(1889, {}))).outputs as Record<string, DataCollection>;
  built = (await cook(buildEiffel(1889, { build: true }))).outputs as Record<string, DataCollection>;
}, 120_000);

const geoOf = (outs: Record<string, DataCollection>, name: string): Geometry | undefined => firstGeometry((outs[name] ?? []) as DataCollection);

/** A block's eight corners. */
function corners(b: Block): Vec3[] {
  const z: Vec3 = [b.x[1] * b.y[2] - b.x[2] * b.y[1], b.x[2] * b.y[0] - b.x[0] * b.y[2], b.x[0] * b.y[1] - b.x[1] * b.y[0]];
  const out: Vec3[] = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) {
    out.push([0, 1, 2].map((e) => b.at[e]! + (i * b.x[e]! * b.size[0]) / 2 + (j * b.y[e]! * b.size[1]) / 2 + (k * z[e]! * b.size[2]) / 2) as unknown as Vec3);
  }
  return out;
}

/** Is p inside the block, `shrink` in from every face? */
function inside(b: Block, p: Vec3, shrink = 0.002): boolean {
  const z: Vec3 = [b.x[1] * b.y[2] - b.x[2] * b.y[1], b.x[2] * b.y[0] - b.x[0] * b.y[2], b.x[0] * b.y[1] - b.x[1] * b.y[0]];
  const d: Vec3 = [p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]];
  const dot = (a: Vec3) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return Math.abs(dot(b.x)) < b.size[0] / 2 - shrink && Math.abs(dot(b.y)) < b.size[1] / 2 - shrink && Math.abs(dot(z)) < b.size[2] / 2 - shrink;
}

/** The iron classes that stood while the works did (the rest came after them: SOURCES.md §32.3). */
const IRON = ["uprights", "bracing", "horizontals", "girders", "arches", "gussets"];

/** Each iron class of the built tower, staged by day as the page stages it. */
let staged: Array<{ cls: string; position: ArrayLike<number>; index: Uint32Array; triDays: Float64Array }> | undefined;
function ironStaged() {
  staged ??= IRON.flatMap((cls) => {
    const geo = geoOf(built, cls);
    if (geo === undefined) return [];
    const g = toBufferGeometry(geo);
    const position = g.getAttribute("position").array;
    const s = stageTriangles(cls, position, g.index!.array);
    const triDays = new Float64Array(s.index.length / 3);
    let t = 0;
    for (let k = 0; k < s.days.length; k++) for (; t < s.ends[k]! / 3; t++) triDays[t] = s.days[k]!;
    return [{ cls, position, index: s.index, triDays }];
  });
  return staged;
}

/** A convex solid for the clash checks: its box and a point test. */
interface Solid {
  readonly lo: Vec3;
  readonly hi: Vec3;
  has(p: Vec3): boolean;
}

function blockSolid(b: Block): Solid {
  const c = corners(b);
  const lo = [0, 1, 2].map((e) => Math.min(...c.map((p) => p[e]!))) as unknown as Vec3;
  const hi = [0, 1, 2].map((e) => Math.max(...c.map((p) => p[e]!))) as unknown as Vec3;
  return { lo, hi, has: (p) => inside(b, p) };
}

/** A convex prism (ground.ts): its outline extruded `depth` along its own normal. */
function prismSolid(pr: Prism, shrink = 0.002): Solid {
  const o = pr.outline;
  const n = [0, 0, 0];
  for (let i = 0; i < o.length; i++) {
    const a = o[i]!;
    const b = o[(i + 1) % o.length]!;
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(n[0]!, n[1]!, n[2]!);
  const u: Vec3 = [n[0]! / l, n[1]! / l, n[2]! / l];
  const all = [...o, ...o.map((p) => [p[0] + u[0] * pr.depth, p[1] + u[1] * pr.depth, p[2] + u[2] * pr.depth] as Vec3)];
  const lo = [0, 1, 2].map((e) => Math.min(...all.map((p) => p[e]!))) as unknown as Vec3;
  const hi = [0, 1, 2].map((e) => Math.max(...all.map((p) => p[e]!))) as unknown as Vec3;
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // Which way round the outline runs about u decides which side of an edge is in.
  const probe = cross(u, sub(o[1]!, o[0]!));
  const mid = o.reduce<Vec3>((acc, p) => [acc[0] + p[0] / o.length, acc[1] + p[1] / o.length, acc[2] + p[2] / o.length], [0, 0, 0]);
  const sign = dot(sub(mid, o[0]!), probe) >= 0 ? 1 : -1;
  return {
    lo,
    hi,
    has(p) {
      const h = dot(sub(p, o[0]!), u);
      if (h < shrink || h > pr.depth - shrink) return false;
      for (let i = 0; i < o.length; i++) {
        const a = o[i]!;
        const inward = cross(u, sub(o[(i + 1) % o.length]!, a));
        const len = Math.hypot(inward[0], inward[1], inward[2]);
        if ((sign * dot(sub(p, a), inward)) / len < shrink) return false;
      }
      return true;
    },
  };
}

/**
 * Iron through timber (or through the bearings' iron): every sample of an
 * iron surface that went up before `until` (the works' last day) inside
 * any of `solids`. Samples: each triangle's corners, its edges every 5 cm
 * and its centroid, over the solids' joint box.
 */
function clashes(solids: readonly Solid[], until: number, skip: readonly string[] = []): Array<{ cls: string; p: Vec3 }> {
  const lo = [0, 1, 2].map((e) => Math.min(...solids.map((s) => s.lo[e]!)));
  const hi = [0, 1, 2].map((e) => Math.max(...solids.map((s) => s.hi[e]!)));
  // The solids by 1 m cell of their boxes, so a sample tests only its neighbours.
  const cells = new Map<string, Solid[]>();
  for (const b of solids) {
    const bl = [0, 1, 2].map((e) => Math.floor(b.lo[e]!));
    const bh = [0, 1, 2].map((e) => Math.floor(b.hi[e]!));
    for (let i = bl[0]!; i <= bh[0]!; i++) for (let j = bl[1]!; j <= bh[1]!; j++) for (let k = bl[2]!; k <= bh[2]!; k++) {
      const key = `${i},${j},${k}`;
      (cells.get(key) ?? cells.set(key, []).get(key)!).push(b);
    }
  }
  const out: Array<{ cls: string; p: Vec3 }> = [];
  const test = (cls: string, p: Vec3) => {
    const near = cells.get(`${Math.floor(p[0])},${Math.floor(p[1])},${Math.floor(p[2])}`);
    if (near?.some((b) => b.has(p))) out.push({ cls, p });
  };
  for (const m of ironStaged()) {
    if (skip.includes(m.cls)) continue;
    const P = m.position;
    for (let t = 0; t < m.index.length / 3; t++) {
      if (m.triDays[t]! >= until) break; // staged by day: the rest came later
      const v = [0, 1, 2].map((k) => [0, 1, 2].map((e) => P[3 * m.index[3 * t + k]! + e]!) as unknown as Vec3);
      if ([0, 1, 2].some((e) => Math.max(v[0]![e]!, v[1]![e]!, v[2]![e]!) < lo[e]! || Math.min(v[0]![e]!, v[1]![e]!, v[2]![e]!) > hi[e]!)) continue;
      for (let k = 0; k < 3; k++) {
        const a = v[k]!;
        const b = v[(k + 1) % 3]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const n = Math.max(1, Math.ceil(len / 0.05));
        for (let i = 0; i < n; i++) test(m.cls, [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n]);
      }
      test(m.cls, [0, 1, 2].map((e) => (v[0]![e]! + v[1]![e]! + v[2]![e]!) / 3) as unknown as Vec3);
    }
  }
  return out;
}

describe("the erection's temporary works", () => {
  it("adds the works as four outputs of their own, and leaves the tower exactly as it was", () => {
    for (const w of WORKS_OUT) {
      expect(plain[w], w).toBeUndefined();
      expect(geoOf(built, w), w).toBeDefined();
    }
    // (The cranes are works too, their own outputs: tests/eiffelCranes.test.ts.)
    expect(Object.keys(built).filter((k) => !k.startsWith("works.crane.")).sort()).toEqual([...Object.keys(plain), ...WORKS_OUT].sort());
    for (const cls of PART_CLASSES) {
      const a = geoOf(plain, cls);
      const b = geoOf(built, cls);
      if (a === undefined) {
        expect(b).toBeUndefined();
        continue;
      }
      expect(Array.from(b!.attrs.point.get("P")!.data), cls).toEqual(Array.from(a.attrs.point.get("P")!.data));
    }
  });

  it("builds sixteen pylons as twelve structures, 27.41 high on the plate's 8.463 foot", () => {
    const blocks = pylonBlocks();
    // Posts: 0.27 square, eight to a pyramid, four pyramids to a leg (the double is two).
    const posts = blocks.filter((b) => b.size[1] === PYLON.post && b.size[2] === PYLON.post);
    // (Each spliced at the joint: two lengths a post.)
    expect(posts.length).toBe(64);
    const top = Math.max(...blocks.flatMap(corners).map((p) => p[1]));
    expect(top).toBeCloseTo(yOfCote(60.91), 6);
    expect(PYLON.top).toBeCloseTo(27.41, 6);
    // Each pyramid's foot is the plate's 8.463 square; the double's pair 17.456 across (2 x 8.463 + 0.530).
    expect(2 * PYLON.base + PYLON.gap).toBeCloseTo(17.456, 3);
    // The cooked output: four legs' worth, symmetric about the axis, standing on the ground.
    const g = toBufferGeometry(geoOf(built, "works.pylons")!);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    // (A raking post's square-cut foot dips its outer corner a few centimetres into the ground.)
    expect(bb.min.y).toBeGreaterThanOrEqual(-0.05);
    expect(bb.max.y).toBeCloseTo(27.41, 2);
    expect(bb.max.x + bb.min.x).toBeCloseTo(0, 2);
    expect(bb.max.z + bb.min.z).toBeCloseTo(0, 2);
  });

  it("props each upright on a sand box and a shoe whose table clears it, at node XXVI's 28 m limit", () => {
    // Table top, the upright's underside over the table's outer edge.
    const tableTop = PYLON.top + BEARING.box.h + BEARING.table;
    {
      // Under b and d: the table along the upright's faces, clear of the
      // side faces' belt at node XXVI, and under the upright.
      const yc = LATERAL_PROP_Y;
      expect(yc).toBeGreaterThan(28.4);
      expect(yc).toBeLessThan(31);
      const p = profileAt(yc);
      const half = BEARING.lateral.long / 2;
      expect(p.inner + half).toBeLessThan(profileAt(28.4).inner - 0.6);
      expect(undersideAt(p.inner, p.outer, yc, p.inner + half, p.outer + BEARING.lateral.across / 2)).toBeGreaterThanOrEqual(tableTop);
    }
    for (const shoe of [BEARING.median]) {
      const yc = propY(shoe.long);
      // Just above node XXVI (28.40), where the legs stood free to.
      expect(yc).toBeGreaterThan(28.4);
      expect(yc).toBeLessThan(30.5);
      const p = profileAt(yc);
      const edge = shoe.long / 2 / Math.SQRT2;
      // The outer edge along the diagonal: the upright's underside there is at or above the table.
      expect(undersideAt(p.inner, p.inner, yc, p.inner + edge, p.inner + edge)).toBeGreaterThanOrEqual(tableTop);
      // The inner edge: the gap the consoles fill, about their 1.33.
      expect(undersideAt(p.inner, p.inner, yc, p.inner - edge, p.inner - edge) - tableTop).toBeLessThan(BEARING.console.high + 0.15);
    }
    const bear = toBufferGeometry(geoOf(built, "works.bearings")!);
    bear.computeBoundingBox();
    expect(bear.boundingBox!.min.y).toBeCloseTo(PYLON.top, 3);
    expect(bear.boundingBox!.max.y).toBeLessThanOrEqual(tableTop + BEARING.console.high + 0.001);
  });

  it("stands the girders' scaffolds 41 m to a 28.50 x 22.40 deck, one to a face, the centring under the arch's intrados", () => {
    const posts = scaffoldBlocks().filter((b) => b.size[1] === SCAFFOLD.post && b.size[2] === SCAFFOLD.post && Math.abs(b.x[1]) > 0.999);
    expect(posts.length).toBe(18);
    expect(SCAFFOLD.deck.y).toBeCloseTo(yOfCote(35.1) + 41.0, 6);
    const deck = deckBlocks();
    const plank = deck.reduce((a, b) => (a.size[0] * a.size[2] > b.size[0] * b.size[2] ? a : b));
    expect(plank.size[0]).toBeCloseTo(28.5, 6);
    expect(plank.size[2]).toBeCloseTo(22.4, 1);
    // The centring's rib stays under the arch's intrados everywhere along it.
    const ribs = scaffoldBlocks().filter((b) => b.size[1] === SCAFFOLD.rib && b.size[2] === SCAFFOLD.rib && Math.abs(b.x[1]) < 0.3);
    expect(ribs.length).toBe(8);
    for (const r of ribs) for (const c of corners(r)) expect(c[1]).toBeLessThan(intradosY(c[0]) - 0.01);
    expect(intradosY(0)).toBeCloseTo(ARCH.crownY, 6);
  });

  it("drives no timber through the iron that stood beside it", () => {
    // The pylons of pile 4 (the +x+z leg) against the iron up before they came down.
    // The control: a block round upright b at 10 m is found full of iron.
    const b10 = profileAt(10);
    const control = clashes([blockSolid({ at: [b10.inner, 10, b10.outer], x: [1, 0, 0], y: [0, 1, 0], size: [1, 1, 1] })], Infinity);
    expect(control.length).toBeGreaterThan(20);
    const pyl = clashes(pylonBlocks().map(blockSolid), WORKS.pylons!.down);
    expect(pyl.slice(0, 5), `${pyl.length} samples of iron inside the pylons`).toEqual([]);
    // The +z face's scaffold, the arches included: they went up on its centring.
    const sc = clashes(scaffoldBlocks().map(blockSolid), WORKS.scaffolds!.down);
    expect(sc.slice(0, 5), `${sc.length} samples of iron inside the scaffold`).toEqual([]);
    // Its deck, off before the arches came.
    const dk = clashes(deckBlocks().map(blockSolid), WORKS.decks!.down);
    expect(dk.slice(0, 5), `${dk.length} samples of iron inside the deck`).toEqual([]);
    // The sand boxes and shoes under the uprights (4 mm of contact with an upright allowed).
    const br = clashes(pylonBearings().map((p) => prismSolid(p, 0.004)), WORKS.bearings!.down);
    expect(br.slice(0, 5), `${br.length} samples of iron inside the bearings: ${br.slice(0, 12).map((c) => `${c.cls} [${c.p.map((v) => v.toFixed(2))}]`).join("; ")}`).toEqual([]);
    // The prism test's control: a console-sized plate round upright b at 10 m is found full of iron.
    const b10p = profileAt(10);
    const plate: Prism = {
      outline: [
        [b10p.inner - 0.5, 9.5, b10p.outer],
        [b10p.inner + 0.5, 9.5, b10p.outer],
        [b10p.inner + 0.5, 10.5, b10p.outer],
        [b10p.inner - 0.5, 10.5, b10p.outer],
      ],
      depth: 0.3,
    };
    expect(clashes([prismSolid(plate)], Infinity).length).toBeGreaterThan(5);
    // Every sand box sits on a cap: its foot's centre over timber.
    const caps = pylonBlocks().filter((b) => Math.abs(b.at[1] - (PYLON.top - 0.125)) < 1e-6);
    const boxes = pylonBearings().filter((p) => p.outline.length === 12);
    expect(boxes.length).toBe(4);
    for (const bx of boxes) {
      const c = [0, 1, 2].map((e) => bx.outline.reduce((a, p) => a + p[e]!, 0) / 12) as unknown as Vec3;
      expect(caps.some((cap) => inside(cap, [c[0], PYLON.top - 0.125, c[2]], 0.1))).toBe(true);
    }

  }, 120_000);

  it("passes no timber through timber", () => {
    for (const [what, blocks] of [
      ["pylons", pylonBlocks()],
      ["scaffold", [...scaffoldBlocks(), ...deckBlocks()]],
    ] as const) {
      const solids = blocks.map(blockSolid);
      let hits = 0;
      const where: string[] = [];
      blocks.forEach((b, i) => {
        const z: Vec3 = [b.x[1] * b.y[2] - b.x[2] * b.y[1], b.x[2] * b.y[0] - b.x[0] * b.y[2], b.x[0] * b.y[1] - b.x[1] * b.y[0]];
        // Its axis and four lines 0.4 of the way to its edges, 11 points each.
        for (const [fy, fz] of [
          [0, 0],
          [0.4, 0],
          [-0.4, 0],
          [0, 0.4],
          [0, -0.4],
        ] as const) {
          for (let k = 0; k <= 10; k++) {
            const fx = (k / 10 - 0.5) * 0.96;
            const p = [0, 1, 2].map((e) => b.at[e]! + b.x[e]! * fx * b.size[0] + b.y[e]! * fy * b.size[1] + z[e]! * fz * b.size[2]) as unknown as Vec3;
            const j = solids.findIndex(
              (s, n) => n !== i && p[0] > s.lo[0] && p[0] < s.hi[0] && p[1] > s.lo[1] && p[1] < s.hi[1] && p[2] > s.lo[2] && p[2] < s.hi[2] && s.has(p),
            );
            if (j >= 0) {
              hits++;
              if (where.length < 4) where.push(`${i}/${j} at [${p.map((c) => c.toFixed(2))}] sizes ${b.size.map((c) => c.toFixed(2))} / ${blocks[j]!.size.map((c) => c.toFixed(2))}`);
            }
          }
        }
      });
      expect(hits, `${what}: ${where.join("; ")}`).toBe(0);
    }
  }, 120_000);

  it("puts each kind up and takes it down on its days", () => {

    // The pylons up before the legs landed on them at 28 m, down before photogravure 8 (21 Aug 1888).
    expect(WORKS.pylons!.up[1]).toBeLessThanOrEqual(MILESTONES.at28m);
    expect(WORKS.pylons!.down).toBeGreaterThan(dayOf("1888-05-15"));
    expect(WORKS.pylons!.down).toBeLessThanOrEqual(dayOf("1888-08-21"));
    // The bearings once the upright's tronçon over them is up, and out with the sand.
    expect(WORKS.bearings!.up[0]).toBeGreaterThanOrEqual(Math.ceil(frontDay(propY(BEARING.median.long))));
    expect(WORKS.bearings!.down).toBeLessThanOrEqual(WORKS.pylons!.down);
    // The scaffolds finished for the girders (18 Dec 1887), standing on photogravure 7, gone on 8.
    expect(WORKS.scaffolds!.up[1]).toBeLessThan(MILESTONES.girdersBegun);
    expect(WORKS.scaffolds!.down).toBeGreaterThan(dayOf("1888-05-15"));
    expect(WORKS.scaffolds!.down).toBeLessThanOrEqual(dayOf("1888-08-21"));
    // The decks off before the arches went on.
    expect(WORKS.decks!.down).toBe(MILESTONES.archesBegun);
    expect(worksDown("works.decks")).toBe(MILESTONES.archesBegun);
    // Staged as the page stages them: every piece inside its window.
    for (const w of WORKS_OUT) {
      const kind = WORKS[w.slice("works.".length)]!;
      const g = toBufferGeometry(geoOf(built, w)!);
      const s = stageTriangles(w, g.getAttribute("position").array, g.index!.array);
      for (const d of s.triDays) {
        expect(d).toBeGreaterThanOrEqual(kind.up[0]);
        expect(d).toBeLessThanOrEqual(Math.ceil(kind.up[1]));
        expect(d).toBeLessThan(kind.down);
      }
    }
  });
});
