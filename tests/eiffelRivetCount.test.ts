/**
 * The rivet count against the book (spec.ts `COUNTS`, `rivetClass`;
 * SOURCES.md §27.3, §27.4).
 *
 * The text prints one count, 1,050,846 rivets driven ON SITE [p. 113], by
 * period of the erection, and 98,000 of them when the legs stood 28 m high
 * [p. 103]; no shop count. So the model's rivets are split into site and
 * shop by what each fastens (`rivetClass`), counted as rivets rather than
 * heads (a rivet the model draws both ends of is one), and held against
 * those figures: never more site rivets than the book counts, tower-wide or
 * in any period, and, in the lower legs, where the model builds every piece
 * the text says was joined on site, between half the book's and all of it
 * at both of its checkpoints. The 2,500,000 for the whole tower is a
 * secondary figure the text never prints: flagged, and only a ceiling.
 *
 * And at the `fullRivets` depth the built-up uprights' faces carry every
 * row PL-IX draws (`lowerBuiltRows`): each head on the steel it fastens, in
 * none, on no other head, under no cover.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { lowerBuiltRows } from "../demos/eiffel/builtup.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { JITTER } from "../demos/eiffel/parts.js";
import { COUNTS, rivetClass } from "../demos/eiffel/spec.js";
import { UPRIGHT_SEAMS } from "../demos/eiffel/strut.js";
import { type Slab, type Vec3, slabs } from "./support/eiffelBuiltupCensus.js";
import {
  HEAD_R,
  type Head,
  add,
  allHeads,
  backToBack,
  boxGrid,
  headsOf,
  inside,
  len,
  pointGrid,
  sc,
  seatedOn,
  secondHeads,
  sub,
} from "./support/eiffelRivets.js";

/** The site count of a set of rivets (first heads only), at a class's share, low or high. */
function site(heads: readonly Head[], second: ReadonlySet<Head>, pick: "share" | "low" | "high"): number {
  let n = 0;
  for (const h of heads) if (!second.has(h)) n += rivetClass(h.set)[pick];
  return n;
}

describe("eiffel rivet count", () => {
  it("counts the model's site rivets against the book's 1,050,846, and its shop rivets under the flagged 2.5 M", async () => {
    const { outputs } = await cook(buildEiffel(1889, { rivets: true }));
    const heads = allHeads(outputs as Record<string, unknown>);
    expect(heads.length).toBeGreaterThan(1_000_000);

    // A rivet the model draws both ends of is one rivet. The control: two
    // heads facing apart through 27 mm of steel are one; facing the same
    // way, or apart but beside each other, two.
    const h0: Head = { base: [0, 0, 0], axis: [1, 0, 0], set: "x" };
    expect(backToBack(h0, { base: [-0.027, 0, 0], axis: [-1, 0, 0], set: "x" })).toBe(true);
    expect(backToBack(h0, { base: [-0.027, 0, 0], axis: [1, 0, 0], set: "x" })).toBe(false);
    expect(backToBack(h0, { base: [0, 0.027, 0], axis: [-1, 0, 0], set: "x" })).toBe(false);
    const second = secondHeads(heads);
    const bySet = new Map<string, number>();
    for (const h of second) bySet.set(h.set, (bySet.get(h.set) ?? 0) + 1);
    // Where: the splices' rivets through a fin's or channel's leg and its
    // covers, the T's stem rows through its angles, the belts' chord flats
    // seen from both sides [measured].
    expect([...bySet.keys()].sort()).toEqual([
      "rivets.leg.chords.legBelt11Edge",
      "rivets.leg.chords.legBelt5Edge",
      "rivets.leg.uprights.splices",
      "rivets.shaft.uprights",
    ]);
    const rivets = heads.length - second.size;

    // Every output takes a class; the site ones are the joints, the
    // splices, the crossings and the laps, and nothing else.
    const siteSets = [...new Set(heads.map((h) => h.set))].filter((s) => rivetClass(s).high > 0).sort();
    for (const s of siteSets) expect(/\.joints$|\.splices$|\.crossings|Lap$/.test(s), s).toBe(true);
    expect(siteSets.length).toBeGreaterThan(20);

    const [central, low, high] = (["share", "low", "high"] as const).map((p) => site(heads, second, p));
    // NEVER MORE than the book: every site rivet the model draws is one the
    // book counts, so over the tower and in every period of the erection
    // (by the height it finished at; 10 % for where a period's edge is
    // taken) the model stays under it.
    expect(high).toBeLessThanOrEqual(COUNTS.rivetsSite);
    const periods = COUNTS.rivetsSiteByPeriod.filter((p) => p.period !== "");
    let from = -Infinity;
    for (const p of periods) {
      const inBand = heads.filter((h) => h.base[1] >= from && h.base[1] < p.upTo);
      expect(site(inBand, second, "high"), `period ${p.period}`).toBeLessThanOrEqual(1.1 * p.n);
      from = p.upTo;
    }
    // IN THE LOWER LEGS the model builds every piece the text joins on site
    // there: the tronçons' joints and their covers (PL-IX figs. 21-24), the
    // bars' ends on their gussets, the crossings, the ties. What it leaves
    // out is inside (the corner angles' own covers, the joints' inside
    // covers' extra rows, the diaphragms' site joints), the manhole faces'
    // longer covers (figs. 25-26), the anchorages: under half of the book's
    // count, we reckon, so the model's lies between half the book's and all
    // of it, at both checkpoints the text gives, and the same share at both
    // (the model is as complete in panels 1-2 as in 1-4). Measured: 0.60
    // and 0.61. THAT IS AT THE CENTRAL READING, the covers and crossings
    // all site-riveted: were they half shop-riveted (the low end of their
    // range) the model would stand at 0.34 and 0.35, which this floor would
    // call incomplete. The floor tests the central reading, not the range.
    const legs = heads.filter((h) => h.set.startsWith("rivets.leg."));
    const periodA = site(
      legs.filter((h) => h.base[1] < periods[0]!.upTo),
      second,
      "share",
    );
    const at28 = site(
      legs.filter((h) => h.base[1] < 28.4),
      second,
      "share",
    );
    const [rA, r28] = [periodA / periods[0]!.n, at28 / COUNTS.rivetsSiteAt28m];
    expect(rA).toBeGreaterThan(0.5);
    expect(rA).toBeLessThanOrEqual(1);
    expect(r28).toBeGreaterThan(0.5);
    expect(r28).toBeLessThanOrEqual(1);
    expect(Math.abs(rA - r28)).toBeLessThan(0.1);
    // TOWER-WIDE the model draws a third: the platforms' floors, girders,
    // galleries and stairs, the lifts' girders, the campanile, all riveted
    // on site, are drawn without their site joints told apart (the first
    // floor's girders' rows are all taken as shop) or not at all. Pinned
    // (2 %), so a change to any rule shows here: 336,153 central, 191,833
    // if every cover and crossing was half shop-riveted.
    expect(central / 336_153).toBeGreaterThan(0.98);
    expect(central / 336_153).toBeLessThan(1.02);
    expect(low / 191_833).toBeGreaterThan(0.98);
    expect(low / 191_833).toBeLessThan(1.02);
    expect(central / COUNTS.rivetsSite).toBeGreaterThan(0.2);
    // THE SHOP. No count is printed; if the flagged 2,500,000 holds, the
    // shop drove 2,500,000 - 1,050,846, and the model's shop rivets (the
    // rest) stay under that.
    expect(rivets - low).toBeLessThan(COUNTS.rivets - COUNTS.rivetsSite);
  }, 600_000);

  it("rivets the built-up faces as PL-IX draws them at the full depth: on their steel, in none, on no other head, under no cover", async () => {
    const g = buildEiffel(1889, { rivets: true, fullRivets: true });
    const probes = ["legUprightPlatesLit", "gussetsOut"];
    for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[id] as never) as Geometry;
    const built = headsOf(outputs["rivets.leg.uprights.built"], "rivets.leg.uprights.built");
    // The rows laid (one leg, copied onto four), less the heads a joint
    // plate stands over (`offJointPlates`): measured 133,000 and 120,368.
    const laid = 4 * lowerBuiltRows().reduce((n, r) => n + Math.round(len(sub(r.b, r.a)) / UPRIGHT_SEAMS.pitch) + 1, 0);
    expect(laid).toBe(133_000);
    expect(built.length).toBeGreaterThan(0.85 * laid);
    expect(built.length).toBeLessThanOrEqual(laid);
    // All shop rivets: the site count is the riveted depth's.
    expect(built.every((h) => rivetClass(h.set).high === 0)).toBe(true);

    const upright = slabs(geo("probe:legUprightPlatesLit"));
    const gussets = slabs(geo("probe:gussetsOut"));
    const steel = [...upright, ...gussets];
    const near = boxGrid<Slab>(steel);
    const slack = 2 * JITTER * Math.sqrt(3);
    // Seated on a plate of the upright (a web, a C.J., a fin's or channel's
    // leg or flat), in none. The control: a head lifted 8 mm is not seated,
    // one sunk 4 mm is in steel (every plate here is 8 mm or more).
    const lifted = built.slice(0, 300).map((h) => ({ ...h, base: add(h.base, sc(h.axis, 0.008)) }));
    expect(lifted.filter((h) => near(h.base).some((b) => seatedOn(h, b, slack))).length).toBe(0);
    const sunk = built.slice(0, 300).map((h) => ({ ...h, base: sub(h.base, sc(h.axis, 0.004)) }));
    expect(sunk.filter((h) => near(h.base).some((b) => inside(h.base, b, 0.001))).length).toBe(300);
    let unseated = 0;
    let buried = 0;
    for (const h of built) {
      const here = near(h.base);
      if (!here.some((b) => upright.includes(b) && seatedOn(h, b, slack))) unseated++;
      if (here.some((b) => inside(h.base, b, slack))) buried++;
    }
    expect(unseated).toBe(0);
    expect(buried).toBe(0);

    // A rivet through the fin keeps both heads or neither (they are asked
    // about the joint plates together): every head seated on a fin (24 mm
    // thick, 88 proud) has its other head back to back with it. The
    // control: dropping one head leaves an orphan.
    const fin = (b: Slab) => {
      const h = [...b.half].sort((x, y) => x - y);
      return Math.abs(2 * h[0]! - 0.024) < 1e-3 && Math.abs(2 * h[1]! - 0.088) < 1e-3;
    };
    const onFin = built.filter((h) => near(h.base).some((b) => fin(b) && seatedOn(h, b, slack)));
    expect(onFin.length).toBeGreaterThan(10_000);
    const finNear = pointGrid(onFin, (h) => h.base, 0.05);
    const orphans = (list: readonly Head[], pool: (p: Vec3) => Head[]) =>
      list.filter((h) => !pool(h.base).some((q) => backToBack(h, q))).length;
    expect(orphans(onFin, finNear)).toBe(0);
    const dropped = new Set([onFin[0]]);
    expect(orphans(onFin.slice(1), (p) => finNear(p).filter((q) => !dropped.has(q)))).toBeGreaterThan(0);

    // On no other head (but its own rivet's other end). The control: a
    // head 10 mm off one is seen.
    // (The built heads themselves come again in `others`, as other objects:
    // a head is not crowded by its own copy.)
    const others = allHeads(outputs as Record<string, unknown>);
    const same = (h: Head, q: Head) => q.set === h.set && len(sub(q.base, h.base)) < 1e-6;
    const byPoint = pointGrid(others, (h) => h.base, 0.05);
    const crowded = (h: Head, pool: (p: Vec3) => Head[]) =>
      pool(h.base).some((q) => q !== h && !same(h, q) && !backToBack(h, q) && !backToBack(q, h) && len(sub(q.base, h.base)) < 2 * HEAD_R - slack);
    const ghost: Head = { ...built[0]!, base: add(built[0]!.base, [0.01, 0, 0]) };
    expect(crowded(built[0]!, (p) => [...byPoint(p), ghost])).toBe(true);
    const crowdedBy = new Map<string, number>();
    for (const h of built) {
      const q = byPoint(h.base).find(
        (x) => x !== h && !same(h, x) && !backToBack(h, x) && !backToBack(x, h) && len(sub(x.base, h.base)) < 2 * HEAD_R - slack,
      );
      if (q !== undefined) crowdedBy.set(q.set, (crowdedBy.get(q.set) ?? 0) + 1);
    }
    // Save by the first floor's girders' own rows, which run on the
    // uprights' faces at XXIV-XXIII (as the splices' do, eiffelSplice):
    // 50 measured, and 22 more since the lacing's crossings (§27.5): the
    // first floor's girder web runs its struts onto the uprights unjointed,
    // so the last bay's crossing lands on the upright's face.
    const ff = [...crowdedBy].filter(([k]) => k.startsWith("rivets.ff.")).reduce((n, [, v]) => n + v, 0);
    expect(Object.fromEntries([...crowdedBy].filter(([k]) => !k.startsWith("rivets.ff.")))).toEqual({});
    expect(ff).toBeLessThanOrEqual(75);

    // Under no cover: each row stops half a pitch short of the cover over
    // its line (the cover's own field carries on). A cover is the one
    // upright plate under 1.5 m long and over 10.5 mm thick. The control:
    // a point on the web under each cover's middle is seen.
    const covers = upright.filter((s) => {
      const h = [...s.half].sort((x, y) => x - y);
      return 2 * h[2]! < 1.5 && 2 * h[0]! > 0.0105;
    });
    expect(covers.length).toBeGreaterThan(10_000);
    const nearCover = boxGrid<Slab>(covers);
    const under = (p: Vec3, b: Slab) => {
      const d = sub(p, b.c);
      const thin = b.half.indexOf(Math.min(...b.half));
      return [0, 1, 2].every((i) =>
        i === thin ? Math.abs(d[0] * b.axes[i]![0] + d[1] * b.axes[i]![1] + d[2] * b.axes[i]![2]) < b.half[i]! + 0.02 : Math.abs(d[0] * b.axes[i]![0] + d[1] * b.axes[i]![1] + d[2] * b.axes[i]![2]) < b.half[i]! - 0.002,
      );
    };
    const probe = covers.slice(0, 200).map((b) => {
      const thin = b.half.indexOf(Math.min(...b.half));
      return sub(b.c, sc(b.axes[thin]!, b.half[thin]! + 0.005));
    });
    expect(probe.filter((p) => nearCover(p).some((b) => under(p, b))).length).toBe(200);
    expect(built.filter((h) => nearCover(h.base).some((b) => under(h.base, b))).length).toBe(0);
  }, 600_000);
});
