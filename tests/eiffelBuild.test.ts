/**
 * The erection, 1887–89 (demos/eiffel/chronology.ts, scrub.ts): every
 * piece of the cooked tower carries a day, the days keep the book's
 * checkpoints, and the tower on the last day is the tower as cooked.
 *
 * The tests stage the class meshes exactly as the page does: the class
 * output through `toBufferGeometry`, then `stageTriangles` on its position
 * and index buffers.
 */
import { type DataCollection, cook, firstGeometry } from "pcg-ts";
import { toBufferGeometry } from "pcg-ts/three";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FRONT,
  LIFT_WORKS,
  MILESTONES,
  SITE_RIVETING,
  type Box6,
  SPAN,
  type Staged,
  components,
  datedHeight,
  dayOf,
  frontDay,
  hostDays,
  isoOf,
  outputDay,
  outsideLegs,
  pieceDay,
  pileAt,
  shownThrough,
  siteRivetDays,
  stageTriangles,
} from "../demos/eiffel/chronology.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { COUNTS, rivetClass } from "../demos/eiffel/spec.js";

/** One class mesh, staged: its buffers before, and the reordered index with its table. */
interface StagedClass {
  readonly cls: string;
  readonly position: Float32Array;
  readonly index: Uint32Array;
  readonly staged: Staged & { readonly index: Uint32Array; readonly triDays: Float64Array };
}

/** The classes that are the tower's iron, dated by the erection front. */
const IRON = ["uprights", "bracing", "horizontals", "girders", "arches", "summit", "gussets"];

let plain: StagedClass[];

beforeAll(async () => {
  const { outputs } = await cook(buildEiffel(1889, {}));
  plain = [];
  for (const cls of PART_CLASSES) {
    const geo = firstGeometry((outputs[cls] ?? []) as DataCollection);
    if (geo === undefined) continue;
    const bg = toBufferGeometry(geo);
    const position = bg.getAttribute("position").array as Float32Array;
    const index = Uint32Array.from(bg.index!.array);
    plain.push({ cls, position, index, staged: stageTriangles(cls, position, index) });
  }
}, 120_000);

/** The highest vertex of triangle `t` of an index. */
function topOf(c: StagedClass, index: ArrayLike<number>, t: number): number {
  const y = (k: number) => c.position[3 * index[3 * t + k]! + 1]!;
  return Math.max(y(0), y(1), y(2));
}

/** A class mesh's pieces (its index's connected components): each one's box and day. */
function piecesOf(c: StagedClass): Array<{ box: Box6; day: number }> {
  const comp = components(c.position.length / 3, c.index);
  const out = new Map<number, { box: number[]; day: number }>();
  for (let t = 0; t < c.index.length / 3; t++) {
    const id = comp[c.index[3 * t]!]!;
    let e = out.get(id);
    if (e === undefined) out.set(id, (e = { box: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], day: -Infinity }));
    // A piece dated triangle by triangle shows whole on its last day.
    e.day = Math.max(e.day, c.staged.triDays[t]!);
    for (let k = 0; k < 3; k++) {
      const v = c.index[3 * t + k]!;
      for (let q = 0; q < 3; q++) {
        e.box[q] = Math.min(e.box[q]!, c.position[3 * v + q]!);
        e.box[q + 3] = Math.max(e.box[q + 3]!, c.position[3 * v + q]!);
      }
    }
  }
  return [...out.values()].map((e) => ({ box: e.box as unknown as Box6, day: e.day }));
}

describe("the erection's dates", () => {
  it("counts days from 26 Jan 1887 and names them back", () => {
    expect(dayOf("1887-01-26")).toBe(0);
    expect(isoOf(MILESTONES.at28m)).toBe("1887-10-10");
    expect(isoOf(MILESTONES.riveted)).toBe("1889-06-01");
    // The book's order: every milestone after the one before.
    const order = Object.values(MILESTONES);
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThanOrEqual(order[i - 1]!);
    // The front rises: heights and days both ascend.
    for (let i = 1; i < FRONT.length; i++) {
      expect(FRONT[i]![0]).toBeGreaterThan(FRONT[i - 1]![0]);
      expect(FRONT[i]![1]).toBeGreaterThanOrEqual(FRONT[i - 1]![1]);
    }
  });

  it("paces the site rivets by the book's periods (spec.ts COUNTS)", () => {
    let run = 0;
    const byPeriod = COUNTS.rivetsSiteByPeriod.map((p) => (run += p.n));
    expect(run).toBe(COUNTS.rivetsSite);
    // SITE_RIVETING's running totals at the period ends are the periods' sums.
    const ends = [MILESTONES.fourPanels, MILESTONES.firstPlatform, MILESTONES.secondPlatform, MILESTONES.intermediate, MILESTONES.thirdPlatform, MILESTONES.erected, MILESTONES.riveted];
    ends.forEach((d, i) => expect(SITE_RIVETING.find(([day]) => day === d)?.[1]).toBe(byPeriod[i]));
    expect(SITE_RIVETING.find(([d]) => d === MILESTONES.at28m)?.[1]).toBe(COUNTS.rivetsSiteAt28m);
    // A synthetic set: iron all up on day 0 is driven at the book's pace;
    // iron that is late holds its rivets back.
    const iron = new Float64Array(1000);
    const driven = siteRivetDays(iron);
    const byFourPanels = driven.filter((d) => d <= MILESTONES.fourPanels).length / 1000;
    expect(byFourPanels).toBeCloseTo(189_580 / COUNTS.rivetsSite, 2);
    const late = siteRivetDays(new Float64Array(1000).fill(MILESTONES.thirdPlatform));
    expect(Math.min(...late)).toBeGreaterThanOrEqual(MILESTONES.thirdPlatform);
  });

  it("dates every triangle of every class, inside the span, and the last day is the tower as cooked", () => {
    expect(plain.length).toBeGreaterThan(8);
    for (const c of plain) {
      const { staged } = c;
      for (const d of staged.triDays) {
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(SPAN[0]);
        expect(d).toBeLessThanOrEqual(SPAN[1]);
      }
      // All of it drawn on the last day...
      expect(shownThrough(staged, SPAN[1])).toBe(c.index.length);
      // ...and the reordered index is the same triangles, each exactly once.
      const key = (ix: ArrayLike<number>, t: number) => `${ix[3 * t]},${ix[3 * t + 1]},${ix[3 * t + 2]}`;
      const before = new Map<string, number>();
      for (let t = 0; t < c.index.length / 3; t++) before.set(key(c.index, t), (before.get(key(c.index, t)) ?? 0) + 1);
      for (let t = 0; t < staged.index.length / 3; t++) {
        const k = key(staged.index, t);
        const n = before.get(k);
        expect(n, `${c.cls}: triangle ${k} not in the cook`).toBeGreaterThan(0);
        before.set(k, n! - 1);
      }
      expect(staged.index.length).toBe(c.index.length);
      // And nothing on the first day but what the foundations began with.
      expect(shownThrough(staged, SPAN[0] - 1)).toBe(0);
    }
  });

  it("rises with height in every leg: a piece wholly above another is never up before it", () => {
    let pieces = 0;
    let pairs = 0;
    for (const c of plain.filter((x) => IRON.includes(x.cls))) {
      // Per pile, the pieces standing in the leg.
      const legs: Array<Array<{ bottom: number; top: number; day: number }>> = [[], [], [], []];
      for (const p of piecesOf(c)) {
        const b = p.box;
        const cx = (b[0] + b[3]) / 2;
        const cy = (b[1] + b[4]) / 2;
        const cz = (b[2] + b[5]) / 2;
        if (b[4] > 179 || outsideLegs(cx, cy, cz) > 0) continue;
        legs[pileAt(cx, cz)]!.push({ bottom: b[1], top: b[4], day: p.day });
      }
      for (const leg of legs) {
        pieces += leg.length;
        // The latest day of any piece whose top is at or under y: by top, a running maximum.
        const byTop = [...leg].sort((p, q) => p.top - q.top);
        const latest: number[] = [];
        byTop.forEach((p, i) => latest.push(Math.max(p.day, i > 0 ? latest[i - 1]! : -Infinity)));
        for (const a of leg) {
          // Every piece whose top is under this one's bottom.
          let lo = 0;
          let hi = byTop.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (byTop[mid]!.top <= a.bottom - 0.01) lo = mid + 1;
            else hi = mid;
          }
          if (lo === 0) continue;
          pairs++;
          expect(a.day, `${c.cls}: a piece from ${a.bottom.toFixed(2)} m up before one under it`).toBeGreaterThanOrEqual(latest[lo - 1]!);
        }
      }
    }
    expect(pieces).toBeGreaterThan(10_000);
    expect(pairs).toBeGreaterThan(10_000);
  });

  it("keeps the book's checkpoints: on each day of the front nothing of the iron stands above the height it gives", () => {
    const iron = plain.filter((x) => IRON.includes(x.cls));
    for (let i = 1; i < FRONT.length; i++) {
      const [h, day] = FRONT[i]!;
      // Two stops on one day (the top terrace and the rod): the higher holds.
      if (FRONT[i + 1]?.[1] === day) continue;
      const what = `${isoOf(day)} at ${h} m`;
      let highest = 0;
      for (const c of iron) {
        for (const p of piecesOf(c)) {
          if (p.day > day) continue;
          // Nothing's dated height above the front: its top, or an
          // upright's first tronçon; and no upright starts above it.
          expect(datedHeight(c.cls, p.box), `${what}: ${c.cls} [${p.box.map((v) => v.toFixed(1))}]`).toBeLessThanOrEqual(h + 0.01);
          expect(p.box[1], what).toBeLessThanOrEqual(h + 0.01);
          highest = Math.max(highest, datedHeight(c.cls, p.box));
        }
      }
      // And the front did reach it: something stands within a panel of it
      // (the rod's 12 m over the top terrace is one piece).
      expect(highest, what).toBeGreaterThan(h - 12);
    }
    // The ones the brief names: 28 m on 10 Oct 1887, four panels (50.4) on 4 Dec.
    expect(frontDay(28.4)).toBe(dayOf("1887-10-10"));
    expect(frontDay(50.4)).toBe(dayOf("1887-12-04"));
    expect(frontDay(115.5)).toBe(dayOf("1888-08-14"));
    expect(frontDay(276.13)).toBe(dayOf("1889-02-24"));
  });

  it("hangs nothing in the air: in a leg or the shaft no strut or tie starts above the uprights standing there that day", () => {
    const uprights = plain.find((c) => c.cls === "uprights")!;
    const others = plain.filter((c) => c.cls === "bracing" || c.cls === "horizontals");
    const up = piecesOf(uprights);
    const rest = others.flatMap((c) => piecesOf(c));
    const inLeg = (b: Box6) => b[1] >= 179 || (b[4] < 179 && outsideLegs((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2) === 0);
    const pileOf = (b: Box6) => pileAt((b[0] + b[3]) / 2, (b[2] + b[5]) / 2);
    let checked = 0;
    for (let day = MILESTONES.metalBegun; day <= MILESTONES.flag; day += 5) {
      const reach = [0, 0, 0, 0];
      for (const p of up) if (p.day <= day && inLeg(p.box)) reach[pileOf(p.box)] = Math.max(reach[pileOf(p.box)]!, p.box[4]);
      for (const p of rest) {
        if (p.day > day || !inLeg(p.box)) continue;
        expect(p.box[1], `${isoOf(day)}: a piece at ${p.box[1].toFixed(1)} m, the uprights at ${reach[pileOf(p.box)]!.toFixed(1)}`).toBeLessThanOrEqual(reach[pileOf(p.box)]! + 0.5);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("puts the fit-out after the deck under it, the lifts in their windows, the foundations before the iron", () => {
    const at = (cls: string) => plain.find((c) => c.cls === cls);
    // Every piece of the 1st floor's platforms over the deck is after the
    // 1st platform (the entrance flights among them), and so is every stair
    // there.
    for (const cls of ["platforms", "stairs"]) {
      const c = at(cls)!;
      for (let t = 0; t < c.index.length / 3; t++) {
        const v = c.index[3 * t]!;
        const y = c.position[3 * v + 1]!;
        if (y > 58.2 && y < 69) expect(c.staged.triDays[t]!, cls).toBeGreaterThanOrEqual(MILESTONES.firstPlatform);
      }
    }
    // The 1st and 2nd floors' undersides go up with their decks, never
    // before them.
    const under = at("deckUndersides")!;
    expect(under.index.length).toBeGreaterThan(0);
    for (let t = 0; t < under.index.length / 3; t++) {
      const y = under.position[3 * under.index[3 * t]! + 1]!;
      const deck = y < 90 ? MILESTONES.firstPlatform : MILESTONES.secondPlatform;
      expect(under.staged.triDays[t]!, `deckUndersides at ${y.toFixed(2)}`).toBeGreaterThanOrEqual(deck);
    }
    // The names, the glass: the spring of 1889 or the autumn before, never with the iron.
    for (const cls of ["names", "glass"]) {
      const c = at(cls);
      if (c === undefined) continue;
      expect(Math.min(...c.staged.triDays)).toBeGreaterThanOrEqual(dayOf("1888-10-01"));
    }
    const machinery = at("machinery");
    if (machinery !== undefined) {
      expect(Math.min(...machinery.staged.triDays)).toBeGreaterThanOrEqual(LIFT_WORKS.otis[0]);
      expect(Math.max(...machinery.staged.triDays)).toBeLessThanOrEqual(LIFT_WORKS.otis[1]);
    }
    // A foundation under pile 3 is down by the end of April 1887, one at pile 1 by 30 June;
    // the support stones under the shoes before the iron.
    expect(pieceDay("foundations", [20, -12, -20, 30, -2, -10])).toBeLessThanOrEqual(dayOf("1887-04-30"));
    expect(pieceDay("foundations", [-30, -12, 10, -20, 0, 20])).toBeLessThanOrEqual(MILESTONES.foundationsDone);
    expect(pieceDay("masonry", [44, 0, 44, 46, 2.4, 46])).toBeLessThan(MILESTONES.metalBegun);
    // The soubassements' facing, round the feet: the autumn of 1888 to May 1889.
    expect(pieceDay("masonry", [60, 1, -2, 62, 5, 2])).toBeGreaterThanOrEqual(MILESTONES.soubassementsBegun);
    // And the plinth's skirt at its foot, outside the legs' own square.
    expect(pieceDay("masonry", [60.7, 0, 50, 62.45, 2, 52])).toBeGreaterThanOrEqual(MILESTONES.soubassementsBegun);
  });

  it("begins all four legs on 1 Jul 1887 and has them level at 28 m", () => {
    const early = dayOf("1887-07-10");
    const shown = [0, 0, 0, 0];
    for (const c of plain.filter((x) => x.cls === "uprights")) {
      const n = shownThrough(c.staged, early) / 3;
      for (let t = 0; t < n; t++) {
        const v = c.staged.index[3 * t]!;
        shown[pileAt(c.position[3 * v]!, c.position[3 * v + 2]!)]!++;
      }
    }
    for (const k of [0, 1, 2, 3]) expect(shown[k], `pile ${k}`).toBeGreaterThan(0);
    // Nothing of the iron before 1 Jul.
    for (const c of plain.filter((x) => IRON.includes(x.cls))) expect(shownThrough(c.staged, MILESTONES.metalBegun - 1)).toBe(0);
  });

  it("gives the lifts' cars, chains and the flag their own days", () => {
    expect(outputDay("car.roux.ouest")).toBe(dayOf("1889-05-26"));
    // A car's panes are their own output, dated with their car.
    expect(outputDay("car.otis.nord.glass")).toBe(dayOf("1889-06-04"));
    expect(outputDay("chain.roux.est.left")).toBe(dayOf("1889-06-02"));
    expect(outputDay("car.otis.sud.truck")).toBe(dayOf("1889-06-19"));
    expect(outputDay("car.edoux.pulley.nord.upper")).toBe(dayOf("1889-06-13"));
    expect(outputDay("cloth.flag")).toBe(dayOf("1889-03-31"));
    expect(outputDay("uprights")).toBeUndefined();
    expect(SPAN[1]).toBe(dayOf("1889-06-19"));
  });

  it("builds the 1st floor's girders from the legs out and joins them last", () => {
    const girders = plain.find((c) => c.cls === "girders")!;
    // Mid-face at the 1st floor (x ~ 0, z ~ the face): the joint.
    let joint = 0;
    let nearLeg = Infinity;
    for (let t = 0; t < girders.index.length / 3; t++) {
      const v = girders.index[3 * t]!;
      const x = girders.position[3 * v]!;
      const y = girders.position[3 * v + 1]!;
      const z = girders.position[3 * v + 2]!;
      if (y < 44 || y > 57) continue;
      const d = girders.staged.triDays[t]!;
      if (Math.abs(x) < 1 && Math.abs(z) > 30) joint = Math.max(joint, d);
      if (Math.abs(x) > 15 && Math.abs(x) < 16 && Math.abs(z) > 30) nearLeg = Math.min(nearLeg, d);
    }
    expect(nearLeg).toBeGreaterThanOrEqual(MILESTONES.girdersBegun);
    expect(nearLeg).toBeLessThan(MILESTONES.girdersBegun + 15);
    expect(joint).toBeGreaterThan(MILESTONES.girdersClosed - 10);
    expect(joint).toBeLessThanOrEqual(MILESTONES.girdersClosed);
  });
});

/**
 * At `?rivets`: every head is dated by the iron it sits on, never before
 * it, and the site heads keep the book's pace (SOURCES.md §32.4).
 */
describe("the erection's rivets", () => {
  let surfaces: Array<{ position: Float32Array; index: Uint32Array; triDays: Float64Array }>;
  let heads: Array<{ name: string; at: Float32Array }>;

  beforeAll(async () => {
    const { outputs } = await cook(buildEiffel(1889, { lacedWeb: true, rivets: true }));
    surfaces = [];
    for (const cls of PART_CLASSES) {
      const geo = firstGeometry((outputs[cls] ?? []) as DataCollection);
      if (geo === undefined) continue;
      const bg = toBufferGeometry(geo);
      const position = bg.getAttribute("position").array as Float32Array;
      const staged = stageTriangles(cls, position, bg.index!.array);
      // Each triangle's day, in the staged order.
      const days = new Float64Array(staged.index.length / 3);
      let t = 0;
      for (let k = 0; k < staged.days.length; k++) for (; t < staged.ends[k]! / 3; t++) days[t] = staged.days[k]!;
      surfaces.push({ position, index: staged.index, triDays: days });
    }
    heads = [];
    for (const [name, col] of Object.entries(outputs)) {
      if (!name.startsWith("rivets")) continue;
      for (const item of col as DataCollection) {
        if (item.kind !== "instances") continue;
        for (const b of item.batches) {
          const at = new Float32Array(3 * b.count);
          for (let i = 0; i < b.count; i++) for (let e = 0; e < 3; e++) at[3 * i + e] = b.transforms[16 * i + 12 + e]!;
          heads.push({ name, at });
        }
      }
    }
  }, 240_000);

  it("finds the iron under every head, and never dates a head before it", () => {
    let n = 0;
    for (const h of heads) n += h.at.length / 3;
    const all = new Float32Array(3 * n);
    let o = 0;
    for (const h of heads) {
      all.set(h.at, o);
      o += h.at.length;
    }
    const iron = hostDays(all, surfaces);
    const missing = iron.filter((d) => Number.isNaN(d)).length;
    // Every head sits on a surface (a few may sit on something the classes do not draw).
    expect(missing / n).toBeLessThan(0.001);
    // Check a sample by brute force: every surface within 2 cm, the latest day.
    const boxes = surfaces.map((s) => {
      const nt = s.index.length / 3;
      const lo = new Float32Array(3 * nt);
      const hi = new Float32Array(3 * nt);
      for (let t = 0; t < nt; t++) {
        for (let e = 0; e < 3; e++) {
          const a = s.position[3 * s.index[3 * t]! + e]!;
          const b = s.position[3 * s.index[3 * t + 1]! + e]!;
          const c = s.position[3 * s.index[3 * t + 2]! + e]!;
          lo[3 * t + e] = Math.min(a, b, c) - 0.02;
          hi[3 * t + e] = Math.max(a, b, c) + 0.02;
        }
      }
      return { lo, hi };
    });
    let checked = 0;
    for (let p = 0; p < n; p += Math.floor(n / 120)) {
      const x = all[3 * p]!;
      const y = all[3 * p + 1]!;
      const z = all[3 * p + 2]!;
      // The latest surface within 2 cm, found independently: every
      // triangle whose grown box holds the head, its distance by projection
      // onto the plane or else onto the nearest edge.
      let latest = -Infinity;
      surfaces.forEach((s, si) => {
        const { lo, hi } = boxes[si]!;
        for (let t = 0; t < s.index.length / 3; t++) {
          if (x < lo[3 * t]! || x > hi[3 * t]! || y < lo[3 * t + 1]! || y > hi[3 * t + 1]! || z < lo[3 * t + 2]! || z > hi[3 * t + 2]!) continue;
          const v = [0, 1, 2].map((k) => [0, 1, 2].map((e) => s.position[3 * s.index[3 * t + k]! + e]!)) as number[][];
          if (pointTriangle([x, y, z], v[0]!, v[1]!, v[2]!) <= 0.02) latest = Math.max(latest, s.triDays[t]!);
        }
      });
      if (Number.isNaN(iron[p]!)) continue;
      // hostDays gives the latest of them: never before any of its iron.
      expect(iron[p]!).toBe(latest);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
    // The site heads: never before their iron, and at the book's pace.
    const siteIron: number[] = [];
    o = 0;
    for (const h of heads) {
      const k = h.at.length / 3;
      if (rivetClass(h.name).share > 0) for (let i = 0; i < k; i++) siteIron.push(iron[o + i]!);
      o += k;
    }
    const ironDays = Float64Array.from(siteIron.map((d) => (Number.isNaN(d) ? MILESTONES.metalBegun : d)));
    const driven = siteRivetDays(ironDays);
    for (let i = 0; i < driven.length; i++) expect(driven[i]!).toBeGreaterThanOrEqual(ironDays[i]!);
    const byFourPanels = driven.filter((d) => d <= MILESTONES.fourPanels).length / driven.length;
    expect(byFourPanels).toBeLessThanOrEqual(189_580 / COUNTS.rivetsSite + 1e-3);
    const byErected = driven.filter((d) => d <= MILESTONES.erected).length / driven.length;
    expect(byErected).toBeGreaterThan(0.9);
  }, 240_000);
});

/** A point's distance to a triangle: onto the plane if it projects inside, else the nearest of the three edges. */
function pointTriangle(p: number[], a: number[], b: number[], c: number[]): number {
  const sub = (u: number[], w: number[]) => [u[0]! - w[0]!, u[1]! - w[1]!, u[2]! - w[2]!];
  const dot = (u: number[], w: number[]) => u[0]! * w[0]! + u[1]! * w[1]! + u[2]! * w[2]!;
  const cross = (u: number[], w: number[]) => [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  const n = cross(sub(b, a), sub(c, a));
  const nn = Math.sqrt(dot(n, n));
  const seg = (u: number[], w: number[]) => {
    const d = sub(w, u);
    const t = Math.max(0, Math.min(1, dot(sub(p, u), d) / (dot(d, d) || 1)));
    const q = [u[0]! + t * d[0]!, u[1]! + t * d[1]!, u[2]! + t * d[2]!];
    return Math.sqrt(dot(sub(p, q), sub(p, q)));
  };
  const edges = Math.min(seg(a, b), seg(b, c), seg(c, a));
  if (nn === 0) return edges;
  const inside = [
    [a, b],
    [b, c],
    [c, a],
  ].every(([u, w]) => dot(cross(sub(w!, u!), sub(p, u!)), n) >= 0);
  return inside ? Math.abs(dot(sub(p, a), n)) / nn : edges;
}
