/**
 * The supports (ground.ts `SUPPORT`, `supportFrames`, `supportPieces`;
 * SOURCES.md §31.3), against PL-IV Figs 7-8 and PL-VI:
 *
 * - sixteen of them, each under an upright's end: the stack's axis is the
 *   upright's, the contre-sabot's ledge meets the built-up box's end plane
 *   exactly, and the box's end section (item 8's 0.877 plan square, a
 *   lozenge square to the axis) lies wholly on the ledge;
 * - the stones two octagonal courses 0.50 thick, the sabot 1.80 across its
 *   flats with its « 2,150 » diagonal, 0.915 high, and 1.10 of iron from
 *   the stone to the upright's end;
 * - 32 anchor bolts, two a support on the lean line « 1,47 » apart, 7.80
 *   long and parallel to the axis;
 * - no jack;
 * - clear of everything else the tower builds round the feet.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Geometry } from "pcg-ts";
import { AS_BUILT, LEG_UPRIGHTS, lowerPlates } from "../demos/eiffel/builtup.js";
import { type Prism, SUPPORT, type SupportFrame, onQuadrant, supportFrames, supportPieces } from "../demos/eiffel/ground.js";
import type { PartClass } from "../demos/eiffel/parts.js";
import { PILES } from "../demos/eiffel/spec.js";
import { type Solid, type Vec3, cookWithoutGround, inside, solidOf, surfaceSamples } from "./support/eiffelGround.js";

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];

const frames = supportFrames();
/** A point in a support's frame: (u, e, t) from its seat. */
const local = (f: SupportFrame, p: Vec3): Vec3 => {
  const d = sub(p, f.seat);
  return [dot(d, f.U), dot(d, f.E), dot(d, f.T)];
};

describe("eiffel supports: sixteen, each under its upright's end", () => {
  it("has one support under every upright of every pile, on the upright's axis", () => {
    expect(frames).toHaveLength(16);
    for (const pile of PILES) expect(frames.filter((f) => f.pile === pile.n)).toHaveLength(4);
    for (const f of frames) {
      // A right-handed, orthonormal frame, U on the tower's diagonal (horizontal part outward).
      expect(dot(f.T, f.T)).toBeCloseTo(1, 12);
      expect(dot(f.U, f.T)).toBeCloseTo(0, 12);
      expect(dot(f.E, f.T)).toBeCloseTo(0, 12);
      expect(f.E[1]).toBeCloseTo(0, 12);
      expect(Math.hypot(f.U[0], f.U[2]) * Math.sign(dot(f.U, [f.foot[0], 0, f.foot[2]]))).toBeGreaterThan(0.8);
      // The seat 1.10 down the axis from the foot, the foot at the supports' node.
      expect(f.foot[1]).toBeCloseTo(2.5, 12);
      const back = add(f.seat, mul(f.T, SUPPORT.stack));
      for (let k = 0; k < 3; k++) expect(back[k]).toBeCloseTo(f.foot[k]!, 12);
    }
  });

  it("meets the built-up box's end exactly: every plate's foot, fins and all, on the ledge's top, inside its outline", () => {
    // The +x +z leg's plates as built at the laced depth (builtup.ts), turned onto each pile as the graph copies them.
    const base = lowerPlates(AS_BUILT);
    let checked = 0;
    for (const f of frames) {
      const k = PILES.find((p) => p.n === f.pile)!.quadrant;
      const plates = base.map((pl) => ({ ...pl, a: onQuadrant(k, pl.a), b: onQuadrant(k, pl.b), n: onQuadrant(k, pl.n) }));
      // The ledge's outline in (u, e), and the plates that start at this foot.
      const ledge = supportPieces(f).iron[3]!;
      const ring = ledge.outline.map((p) => local(f, p));
      for (const q of ring) expect(q[2]).toBeCloseTo(SUPPORT.stack - SUPPORT.ledge.t, 9);
      const top = SUPPORT.stack;
      const inRing = (u: number, e: number) => {
        // Convex: on the inner side of every edge.
        let sign = 0;
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i]!;
          const b = ring[(i + 1) % ring.length]!;
          const c = (b[0] - a[0]) * (e - a[1]) - (b[1] - a[1]) * (u - a[0]);
          if (Math.abs(c) < 1e-12) continue;
          if (sign === 0) sign = Math.sign(c);
          else if (Math.sign(c) !== sign) return false;
        }
        return true;
      };
      for (const pl of plates) {
        const a = local(f, pl.a);
        // A plate that starts at this support's foot: its lower end in the foot plane, near the axis.
        if (Math.abs(a[2] - top) > 1e-6 || Math.hypot(a[0], a[1]) > 1) continue;
        // Its four lower corners: across its width and through its thickness.
        const T = sub(pl.b, pl.a);
        const across = [T[1] * pl.n[2] - T[2] * pl.n[1], T[2] * pl.n[0] - T[0] * pl.n[2], T[0] * pl.n[1] - T[1] * pl.n[0]] as Vec3;
        const l = Math.hypot(...across);
        const w: Vec3 = [across[0] / l, across[1] / l, across[2] / l];
        for (const sw of [-0.5, 0.5]) {
          for (const sn of [-0.5, 0.5]) {
            const c = local(f, add(pl.a, add(mul(w, sw * pl.width), mul(pl.n, sn * pl.thickness))));
            expect(c[2]).toBeCloseTo(top, 6);
            expect(inRing(c[0], c[1]), `${f.upright} plate corner at u ${c[0].toFixed(3)}, e ${c[1].toFixed(3)} off the ledge`).toBe(true);
            checked++;
          }
        }
      }
    }
    // At least the four webs an upright, four corners each, sixteen uprights.
    expect(checked).toBeGreaterThanOrEqual(16 * 4 * 4);
  });

  it("stacks the stones, the sabot, the shims and the ledge as PL-VI and PL-IV print them", () => {
    const f = frames[0]!;
    const { iron, stone } = supportPieces(f);
    const span = (p: Prism, k: 0 | 1 | 2) => {
      const pts = [...p.outline.map((q) => local(f, q)), ...p.outline.map((q) => local(f, add(q, mul(f.T, p.depth))))];
      return [Math.min(...pts.map((q) => q[k])), Math.max(...pts.map((q) => q[k]))] as const;
    };
    const [upper, lower] = stone as [Prism, Prism];
    expect(span(upper, 2)[1]).toBeCloseTo(0, 9);
    expect(upper.depth).toBeCloseTo(0.5, 9);
    expect(lower.depth).toBeCloseTo(0.5, 9);
    expect(span(lower, 0)[1] - span(lower, 0)[0]).toBeCloseTo(4.1, 6);
    expect(span(lower, 1)[1] - span(lower, 1)[0]).toBeCloseTo(4.0, 6);
    expect(span(upper, 0)[1] - span(upper, 0)[0]).toBeCloseTo(3.0, 6);
    expect(span(upper, 1)[1] - span(upper, 1)[0]).toBeCloseTo(3.15, 6);
    expect(lower.outline).toHaveLength(8);
    const [flange, body, shims, ledge] = iron as [Prism, Prism, Prism, Prism];
    // The sabot: 0.915 from the stone, its « 2,150 » diagonal on U and across.
    expect(span(flange, 2)[0]).toBeCloseTo(0, 9);
    expect(span(body, 2)[1]).toBeCloseTo(SUPPORT.sabot.high, 9);
    const diag = span(flange, 0)[1] - span(flange, 0)[0];
    expect(diag).toBeGreaterThan(2.14);
    expect(diag).toBeLessThan(2.17);
    expect(shims.depth).toBeCloseTo(0.05, 9);
    expect(span(ledge, 2)[1]).toBeCloseTo(SUPPORT.stack, 9);
    expect(SUPPORT.sabot.high + SUPPORT.shims.t + SUPPORT.ledge.t).toBeCloseTo(SUPPORT.stack, 9);
  });

  it("anchors every support with two bolts on its lean line, 1.47 apart and 7.80 long", () => {
    let bolts = 0;
    for (const f of frames) {
      const { iron, buried } = supportPieces(f);
      const rods = [...iron, ...buried].filter((p) => p.outline.length === 12 && Math.abs(Math.hypot(...sub(p.outline[0]!, p.outline[6]!)) - SUPPORT.bolts.d / Math.cos(Math.PI / 12)) < 1e-9);
      // A rod below the stone and one above, per bolt.
      expect(rods).toHaveLength(4);
      const axes = rods.map((p) => {
        const c = p.outline.reduce<Vec3>((s, q) => add(s, mul(q, 1 / p.outline.length)), [0, 0, 0]);
        return { at: local(f, c), depth: p.depth };
      });
      const us = [...new Set(axes.map((a) => a.at[0].toFixed(6)))].map(Number).sort((a, b) => a - b);
      expect(us).toHaveLength(2);
      expect(us[1]! - us[0]!).toBeCloseTo(1.47, 6);
      // Each rod parallel to the upright's axis.
      for (const p of rods) {
        const s = solidOf(p);
        expect(Math.abs(dot(s.planes[0]!.n, f.T))).toBeCloseTo(1, 9);
      }
      for (const u of us) {
        const mine = axes.filter((a) => Math.abs(a.at[0] - u) < 1e-6);
        expect(mine.reduce((s, a) => s + a.depth, 0)).toBeCloseTo(7.8, 6);
        for (const a of mine) expect(a.at[1]).toBeCloseTo(0, 6);
        bolts++;
      }
    }
    expect(bolts).toBe(32);
  });

  it("builds no jack: nothing round but the bolts, their sleeves and the « sabots supérieurs »", () => {
    // A jack is a Ø 0.43 piston in a Ø 0.62 body (PL-VI Figs 17-19); every round piece a support has is one of these.
    const allowed = [SUPPORT.bolts.d, SUPPORT.bolts.sleeve, SUPPORT.washer.d];
    const diameters = (list: Prism[]) =>
      list.filter((p) => p.outline.length === 12).map((p) => Math.hypot(...sub(p.outline[0]!, p.outline[6]!)) * Math.cos(Math.PI / 12));
    for (const f of frames) {
      const { iron, stone, buried } = supportPieces(f);
      for (const d of diameters([...iron, ...stone, ...buried])) expect(allowed.some((a) => Math.abs(a - d) < 1e-9), `a round piece Ø ${d.toFixed(3)}`).toBe(true);
    }
    // Control: a jack's body would be caught.
    const body = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i): Vec3 => {
      const a = ((i + 0.5) * Math.PI) / 6;
      const r = 0.31 / Math.cos(Math.PI / 12);
      return [r * Math.cos(a), 0, r * Math.sin(a)];
    });
    expect(diameters([{ outline: body, depth: 0.41 }]).every((d) => allowed.some((a) => Math.abs(a - d) < 1e-9))).toBe(false);
  });
});

describe("eiffel supports: against the rest of the tower", () => {
  let others: Partial<Record<PartClass, Geometry>>;
  beforeAll(async () => {
    others = await cookWithoutGround({ lacedWeb: true });
  }, 400_000);

  it("clashes with nothing the tower builds round the feet, at the laced depth (and can)", () => {
    const report: string[] = [];
    const bySupport = frames.map((f) => {
      const p = supportPieces(f);
      return { f, solids: [...p.iron, ...p.stone].map(solidOf) };
    });
    const census = (list: ReadonlyArray<{ f: SupportFrame; solids: Solid[] }>) => {
      const hits: string[] = [];
      for (const { f, solids } of list) {
        const lo: Vec3 = [Math.min(...solids.map((s) => s.min[0])), Math.min(...solids.map((s) => s.min[1])), Math.min(...solids.map((s) => s.min[2]))];
        const hi: Vec3 = [Math.max(...solids.map((s) => s.max[0])), Math.max(...solids.map((s) => s.max[1])), Math.max(...solids.map((s) => s.max[2]))];
        for (const [cls, geo] of Object.entries(others)) {
          for (const h of inside(solids, surfaceSamples(geo as Geometry, [lo, hi], 0.03), 0.004)) {
            hits.push(`pile ${f.pile} ${f.upright}: ${cls} at [${h.at.map((v) => v.toFixed(2))}] ${h.depth.toFixed(3)} deep`);
          }
        }
      }
      return hits;
    };
    report.push(...census(bySupport));
    expect(report.slice(0, 20)).toEqual([]);
    // Control: the pile 4 supports raised 0.3 up their axes run into the uprights' ends.
    const raised = bySupport
      .filter((s) => s.f.pile === 4)
      .map(({ f }) => {
        const g: SupportFrame = { ...f, seat: add(f.seat, mul(f.T, 0.3)) };
        const p = supportPieces(g);
        return { f: g, solids: [...p.iron, ...p.stone].map(solidOf) };
      });
    expect(census(raised).length).toBeGreaterThan(0);
  });

  it("names the uprights it stands under", () => {
    expect(new Set(frames.map((f) => f.upright))).toEqual(new Set(LEG_UPRIGHTS.map((u) => u[0])));
  });
});
