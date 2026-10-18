/**
 * Three of the Eiffel demo's leftovers, each against its plate:
 *
 * - PLATE I's 18.65 at the 3rd floor is carried by no element: the text
 *   closes the floor at the 16.56 octagon (10.90 sides), and the widest
 *   thing at that level is Eiffel's balcony, 0.52 proud of it (17.60), which
 *   is Plate I's widest stroke. So nothing is built at 18.65 (platforms.ts,
 *   `THIRD`).
 * - THE PLAN BRACING'S H at the hash nodes (XVI-XII, PL-VIII Figs 13-15)
 *   is the tinted stub from the long girder in along the diagonal to the K
 *   bracket, ending among the Edoux's outer guides; the dashed curve beside
 *   it is its letter's leader. It frames into the outboard guide post and
 *   enters no part of the Edoux (shaft.ts).
 * - THE ARCH'S IRON runs on hidden below the collar's top to PL-XI's 3.42,
 *   plumb on the pier's axis, inside the stone at every height, and the
 *   chord's rivet rows are what they were (firstFloor.ts, `IRON_END`).
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { type Detail } from "../demos/eiffel/parts.js";
import { planBracingLines, planPattern } from "../demos/eiffel/shaft.js";
import { EDOUX_PLAN, FLOORS, NODES, PLAN_BRACING, node } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];
type XZ = readonly [number, number];

/** The plain depth's probes: the feet, the piers' tiers (+z face), the plan chords. */
const PIER_BOXES = 24;
const PROBES = [
  "ffArchFeetPaths4RotDone",
  "ffArchFeetSkin",
  "ffArchChordsSkin",
  "planBracingChordPaths",
  ...Array.from({ length: PIER_BOXES }, (_, i) => `ffPier${i}`),
];

async function cookWith(ids: readonly string[], detail: Detail = {}) {
  const g = buildEiffel(1889, detail);
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const probe = (id: string): Geometry => {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    return geo;
  };
  return { outputs, probe };
}

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  // The store may hold more than the geometry's points: read pointCount.
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P.data[i]!, P.data[i + 1]!, P.data[i + 2]!]);
  return out;
}

function polylines(geo: Geometry): Vec3[][] {
  const pts = points(geo);
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const count = geo.primVertexCount[p]!;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) line.push(pts[geo.vertexToPoint[v]!]!);
    out.push(line);
  }
  return out;
}

function rivetBases(item: unknown): Vec3[] {
  const it = item as { kind: string; batches: { count: number; transforms: Float32Array }[] } | undefined;
  if (it === undefined || it.kind !== "instances") throw new Error("no rivets");
  const out: Vec3[] = [];
  for (const b of it.batches) {
    for (let k = 0; k < b.count; k++) out.push([b.transforms[16 * k + 12]!, b.transforms[16 * k + 13]!, b.transforms[16 * k + 14]!]);
  }
  return out;
}

/** A geometry's stored positions, exactly as stored (f32 to f64 is exact), for the determinism check. */
function positionsOf(geo: Geometry): number[] {
  const P = geo.attrs.point.get("P")!.data;
  return Array.from({ length: 3 * geo.pointCount }, (_, i) => P[i]!);
}

interface Box {
  readonly min: Vec3;
  readonly max: Vec3;
}
function bbox(pts: readonly Vec3[]): Box {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, p[k]!);
      max[k] = Math.max(max[k]!, p[k]!);
    }
  }
  return { min: min as unknown as Vec3, max: max as unknown as Vec3 };
}
/** The box turned q quarter turns about +y (the quadrant copies; the set of four is the same either way round). */
function turnBox(b: Box, q: number): Box {
  let corners: Vec3[] = [b.min, b.max];
  for (let i = 0; i < q; i++) corners = corners.map(([x, y, z]) => [z, y, -x] as Vec3);
  return bbox(corners);
}
function inBox(p: Vec3, b: Box, tol: number): boolean {
  return [0, 1, 2].every((k) => p[k]! >= b.min[k]! - tol && p[k]! <= b.max[k]! + tol);
}

// ------------------------------------------------------------ the numbers

/** PL-XI Fig. 1: the arch's iron ends at 3.42 [measured, SOURCES.md §24]. */
const IRON_END = 3.42;
/** The collar's top, where the member comes out of the stone (firstFloor.ts `ARCH_END`). */
const COLLAR_TOP = 4.3;
/** The arch chord's half-width, "600 x 7" [sourced PL-VII]. */
const CHORD_HALF = 0.3;
/** The face's lean over panels 1-4, and its sine [derived from Plate XXXI's table]. */
const SLOPE = (node("XXVIII").outer - node("XXIV").outer) / (node("XXIV").y - node("XXVIII").y);
const SIN = SLOPE / Math.hypot(1, SLOPE);
/** The chord's square end, on its axis: its highest corner at the collar's top. */
const END_Y = COLLAR_TOP - CHORD_HALF * SIN;

/** The 3rd floor: 16.56 across the flats, 10.90 sides [sourced E1900-TXT p. 79; PL-XIX Fig. 9]. */
const THIRD_ACROSS = 16.56;
const THIRD_STRAIGHT = 10.9;
/** Eiffel's balcony, 0.52 proud of the glass (summit.ts `BALCONY`) [estimated there]. */
const BALCONY_PROUD = 0.52;
/** Plate I's "côté extérieur 18m65". */
const PLATE_I_SIDE = 18.65;
/** The consoles hang 7.207 under the floor [sourced E1900-TXT]; the balcony's railing tops 2.43 + 0.12 + 1.00 over it. */
const BAND: readonly [number, number] = [FLOORS.third - 7.3, FLOORS.third + 3.7];

/** s along x = -z (toward pile 3), t along x = z. */
const S = ([x, , z]: Vec3) => (x - z) / Math.SQRT2;
const T = ([x, , z]: Vec3) => (x + z) / Math.SQRT2;
/** The largest gap from a plan point at height y to the Edoux boxes standing there (negative = inside). */
function edouxGap(p: Vec3): { gap: number; what: string } {
  let worst = { gap: Infinity, what: "" };
  const [s, t] = [S(p), T(p)];
  for (const o of EDOUX_PLAN) {
    if (p[1] < o.y[0] || p[1] > o.y[1]) continue;
    const gap = Math.max(o.s[0] - s, s - o.s[1], o.t[0] - t, t - o.t[1]);
    if (gap < worst.gap) worst = { gap, what: o.what };
  }
  return worst;
}
/** A segment sampled every centimetre or so. */
function samples(a: Vec3, b: Vec3, n = 200): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / n,
    a[1] + ((b[1] - a[1]) * i) / n,
    a[2] + ((b[2] - a[2]) * i) / n,
  ]);
}

describe("Eiffel leftovers: Plate I's 18.65, the plan bracing's H, the arch's hidden foot", () => {
  let plain: Awaited<ReturnType<typeof cookWith>>;
  let again: Awaited<ReturnType<typeof cookWith>>;
  let riveted: Awaited<ReturnType<typeof cookWith>>;
  beforeAll(async () => {
    plain = await cookWith(PROBES);
    again = await cookWith(PROBES);
    riveted = await cookWith([], { lacedWeb: true, rivets: true });
  }, 600_000);

  it("builds nothing at Plate I's 18.65: the 3rd floor is the 16.56 octagon, the balcony the widest thing there", () => {
    const deck = points(firstGeometry(plain.outputs["platforms"] ?? [])!).filter((p) => Math.abs(p[1] - (FLOORS.third - 0.43)) < 0.5);
    expect(deck.length).toBeGreaterThan(0);
    const flats = Math.max(...deck.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[2]))));
    const corners = Math.max(...deck.map((p) => Math.abs(p[0]) + Math.abs(p[2])));
    expect(flats).toBeCloseTo(THIRD_ACROSS / 2, 2);
    // A cut corner at (straight / 2, across / 2): |x| + |z| = 5.45 + 8.28.
    expect(corners).toBeCloseTo(THIRD_STRAIGHT / 2 + THIRD_ACROSS / 2, 2);

    // Everything built at the level, every class: its reach from the axis.
    const reach: Array<{ name: string; r: number }> = [];
    for (const [name, items] of Object.entries(plain.outputs)) {
      const geo = firstGeometry(items);
      if (geo === undefined || name.startsWith("probe:")) continue;
      for (const p of points(geo)) {
        if (p[1] < BAND[0] || p[1] > BAND[1]) continue;
        reach.push({ name, r: Math.max(Math.abs(p[0]), Math.abs(p[2])) });
      }
    }
    const widest = reach.reduce((a, b) => (b.r > a.r ? b : a));
    // The balcony: 16.56 + 2 x 0.52 = 17.60, Plate I's widest stroke (17.6-17.7).
    expect(widest.name).toBe("summit");
    expect(widest.r).toBeCloseTo(THIRD_ACROSS / 2 + BALCONY_PROUD, 2);
    // Zero-check: nothing reaches Plate I's 18.65 / 2.
    expect(reach.filter((q) => q.r > PLATE_I_SIDE / 2)).toHaveLength(0);
    // Control: the same scan does see the level's edge, the deck's 8.28,
    // so a thing standing at 9.325 could not slip past it.
    expect(reach.filter((q) => q.r > THIRD_ACROSS / 2 - 0.01).length).toBeGreaterThan(0);
  });

  it("builds H at every hash node: the long girder in along the diagonal to the K bracket, framing into the outboard post", () => {
    const chords = polylines(plain.probe("planBracingChordPaths"));
    const d = PLAN_BRACING.depth;
    const post = EDOUX_PLAN.find((o) => o.what === "outboard post S")!;
    const hash = NODES.filter((n) => planPattern(n.name) === "hash");
    expect(hash.map((n) => n.name)).toEqual(["XVI", "XV", "XIV", "XIII", "XII"]);
    for (const n of hash) {
      const w = n.inner > 0.5 ? n.inner : 0;
      const lines = planBracingLines(n.name, n.outer, w, 0.25);
      // One H, on the s > 0 half of the diagonal x = -z, from the long
      // girder (x - z = W - w, s = at) in to the K bracket's apex; K's two
      // struts leave that apex; H' is on the s < 0 half.
      const at = (n.outer - w) / Math.SQRT2;
      const H = lines.filter((l) => l[5] === "H");
      expect(H, `${n.name} H`).toHaveLength(1);
      const [p, q] = H[0]!;
      const p3: Vec3 = [p[0], n.y, p[1]];
      const q3: Vec3 = [q[0], n.y, q[1]];
      expect(T(p3)).toBeCloseTo(0, 9);
      expect(T(q3)).toBeCloseTo(0, 9);
      expect(S(p3)).toBeCloseTo(at, 9);
      expect(S(q3)).toBeCloseTo(at - PLAN_BRACING.kReach, 9);
      expect(lines.filter((l) => l[5] === "K"), `${n.name} K`).toHaveLength(2);
      expect(lines.filter((l) => l[5] === "H'"), `${n.name} H'`).toHaveLength(1);
      // H's end, the K apex, lies among the lower car's outer guides, where
      // Fig. 14 draws the I-section at its end, 4.4 +-0.5 out [measured]
      // (EDOUX_PLAN: guide S2 4.51-4.85, the outboard post 4.90-5.40).
      expect(S(q3)).toBeGreaterThan(4.4 - 0.5);
      expect(S(q3)).toBeLessThan(post.s[1]);

      // Built: at each chord level one stretch on t = 0, s > 0, from the
      // long girder's chord in to the outboard post plus its clearance.
      for (const k of [-0.5, 0.5]) {
        const y = n.y + k * d;
        const onH = chords.filter(
          ([a, b]) =>
            Math.abs(a![1] - y) < 1e-3 &&
            Math.abs(b![1] - y) < 1e-3 &&
            Math.abs(T(a!)) < 1e-3 &&
            Math.abs(T(b!)) < 1e-3 &&
            S(a!) > 0 &&
            S(b!) > 0,
        );
        expect(onH, `${n.name} y ${y.toFixed(2)}`).toHaveLength(1);
        const [a, b] = onH[0]!;
        const outer = Math.max(S(a!), S(b!));
        const inner = Math.min(S(a!), S(b!));
        // It starts at the long girder's chord (PLAN_BRACING.chord short of its axis)...
        expect(outer).toBeCloseTo(at - PLAN_BRACING.chord, 3);
        // ...and ends on the post, framing into it: its end post's face on
        // the post's, so its axis stops the end post's half-width less 5 mm
        // off it (shaft.ts `FRAME_INTO`).
        expect(inner).toBeCloseTo(post.s[1] + PLAN_BRACING.web - 0.005, 3);
        expect(outer - inner).toBeGreaterThanOrEqual(d);
        // Clear of the whole Edoux: its axis out of the post it frames into,
        // and more than its chord's half-width off everything else.
        for (const pt of samples(a!, b!)) {
          const { gap, what } = edouxGap(pt);
          const least = what === "outboard post S" ? PLAN_BRACING.web - 0.005 - 1e-6 : PLAN_BRACING.chord;
          expect(gap, `${n.name} H vs ${what}`).toBeGreaterThan(least);
        }
      }
      // Control: H drawn whole to the apex, uncut, would run into the post:
      // the gap check reports it.
      const whole = samples(p3, q3).map(edouxGap);
      expect(Math.min(...whole.map((g) => g.gap)), `${n.name} control`).toBeLessThan(0);
      expect(whole.some((g) => g.gap < 0 && g.what === "outboard post S")).toBe(true);
    }
  });

  it("carries the arch's iron down, plumb and hidden, to PL-XI's 3.42 on the pier's axis", () => {
    // 2 planes x 2 sides x 4 faces.
    const feet = polylines(plain.probe("ffArchFeetPaths4RotDone"));
    expect(feet).toHaveLength(16);
    const piers = Array.from({ length: PIER_BOXES }, (_, i) => bbox(points(plain.probe(`ffPier${i}`))));
    const tiers = [0, 1, 2, 3].flatMap((q) => piers.map((b) => turnBox(b, q)));
    const collars = tiers.filter((b) => Math.abs(b.max[1] - COLLAR_TOP) < 1e-4);
    expect(collars).toHaveLength(16);
    for (const [a, b] of feet) {
      const [top, bottom] = a![1] > b![1] ? [a!, b!] : [b!, a!];
      expect(top[1]).toBeCloseTo(END_Y, 4);
      expect(bottom[1]).toBeCloseTo(IRON_END, 4);
      // Plumb, and on its own collar's axis.
      expect(Math.hypot(top[0] - bottom[0], top[2] - bottom[2])).toBeLessThan(1e-4);
      const mine = collars.filter((c) => inBox(top, c, 0));
      expect(mine).toHaveLength(1);
      const c = mine[0]!;
      expect((c.min[0] + c.max[0]) / 2).toBeCloseTo(top[0], 4);
      expect((c.min[2] + c.max[2]) / 2).toBeCloseTo(top[2], 4);
    }

    // The skin: a 0.60 square from 3.42 to END_Y.
    const skin = points(plain.probe("ffArchFeetSkin"));
    const ys = skin.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(IRON_END, 4);
    expect(Math.max(...ys)).toBeCloseTo(END_Y, 4);
    // Every edge of the foot, sampled every 5 mm, stands inside a tier of
    // its pier: nothing of it pokes out of the stone.
    const corners = skin.filter((p) => Math.abs(p[1] - IRON_END) < 1e-4);
    expect(corners.length).toBeGreaterThanOrEqual(64);
    const outside = (lean: number) => {
      let n = 0;
      for (const [x, , z] of corners) {
        for (let y = IRON_END; y <= END_Y + 1e-9; y += 0.005) {
          // `lean` moves the point outward as the face plane would carry it,
          // on the +z face only (the control's case), from the collar's top.
          const out = z > Math.abs(x) ? (COLLAR_TOP - y) * lean : 0;
          if (!tiers.some((b) => inBox([x, y, z + out], b, 1e-4))) n++;
        }
      }
      return n;
    };
    // Zero-check: plumb, it is inside the stone everywhere.
    expect(outside(0)).toBe(0);
    // Control: carried on down the leaning face plane instead (0.503 out per
    // metre), the same check finds it standing out of the neck and capital.
    expect(outside(SLOPE)).toBeGreaterThan(0);

    // The chord above still ends at the collar, as before: its lowest point
    // is its square end's lowest corner, inside the collar (4.00-4.30).
    const chordYs = points(plain.probe("ffArchChordsSkin")).map((p) => p[1]);
    // (The lean there is not quite panel 1's, and the arc is 0.5 degrees
    // off vertical: 4.027 against 4.031 for a plain lean.)
    expect(Math.abs(Math.min(...chordYs) - (COLLAR_TOP - 2 * CHORD_HALF * SIN))).toBeLessThan(0.01);
    expect(Math.min(...chordYs)).toBeGreaterThan(4.0);
  });

  it("leaves the arch chord's rivet rows as they were: none in the stone, the foot has none", () => {
    const rivets = rivetBases(riveted.outputs["rivets.ff.arches.chords"]?.[0]);
    // Before the foot was added and after, the set was compared point for
    // point and was bit-identical (108,160 heads, 2026-09-26; SOURCES.md
    // §26.3). Not pinned here: the rows follow strut.ts's `UPRIGHT_SEAMS`,
    // which is not this file's to hold.
    expect(rivets.length).toBeGreaterThan(0);
    const piers = Array.from({ length: PIER_BOXES }, (_, i) => bbox(points(plain.probe(`ffPier${i}`))));
    const tiers = [0, 1, 2, 3].flatMap((q) => piers.map((b) => turnBox(b, q)));
    const head = 0.019;
    // Zero-check: no rivet inside any pier tier, grown by a head.
    const inStone = (lift: number) =>
      rivets.filter((p) => tiers.some((b) => inBox(p, { min: b.min, max: [b.max[0], b.max[1] + lift, b.max[2]] }, head))).length;
    expect(inStone(0)).toBe(0);
    // Control: raise the collars' tops 0.2 and the rows' lowest heads fall in.
    expect(inStone(0.2)).toBeGreaterThan(0);
    // And no rivet of any set stands on the hidden foot.
    const feet = polylines(plain.probe("ffArchFeetPaths4RotDone"));
    const onFoot = (grow: number, across = CHORD_HALF + head) => {
      let n = 0;
      for (const [name, items] of Object.entries(riveted.outputs)) {
        if (!name.startsWith("rivets.")) continue;
        for (const p of rivetBases(items[0])) {
          for (const [a, b] of feet) {
            const lo = Math.min(a![1], b![1]);
            const hi = Math.max(a![1], b![1]);
            if (p[1] >= lo - head && p[1] <= hi + grow && Math.abs(p[0] - a![0]) <= across && Math.abs(p[2] - a![2]) <= across) n++;
          }
        }
      }
      return n;
    };
    expect(onFoot(0)).toBe(0);
    // Control: the same prism carried up past the collar and widened to the
    // collar's 0.90 reaches the chord's lowest rows.
    expect(onFoot(0.5, 0.45)).toBeGreaterThan(0);
  });

  it("is deterministic: a second cook gives the same bytes", () => {
    for (const id of ["ffArchFeetSkin", "ffArchFeetPaths4RotDone", "planBracingChordPaths"]) {
      expect(positionsOf(again.probe(id)), id).toEqual(positionsOf(plain.probe(id)));
    }
    for (const name of ["platforms", "deckUndersides", "stairs", "summit", "arches", "girders"]) {
      const a = firstGeometry(plain.outputs[name] ?? []);
      const b = firstGeometry(again.outputs[name] ?? []);
      expect(a, name).toBeDefined();
      expect(positionsOf(b!), name).toEqual(positionsOf(a!));
    }
  });
});
