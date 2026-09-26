/**
 * The platforms' round parts, cut by size (demos/eiffel/chord.ts): every
 * curve the 1st and 2nd platforms build stands at most its tolerance off
 * the true curve, chord by chord, measured on the outlines the builders
 * actually emit (platforms.ts `fitOutSolids`, `vaultArc`, `innerArc`,
 * `voidOutline`, `pedestalFaces`, `pedestalDressing`) against the curve
 * restated here from the plates' numbers:
 *
 * - `SAG.eye` (3 mm) for what a visitor walks up to: the 2nd floor's
 *   reservoirs and round tents, the void's « Balcon » bow, the plinth's
 *   inner corner and the bench round it;
 * - `SAG.near` (5 mm) for what is overhead or a few metres off: the
 *   gallery's vaults, crescents and small arches, the Français' door heads,
 *   archivolts and crest, the Flamand's arches and braces, every disc (the
 *   cabochons' rings, the Russe's clock, sun and wheel, the crest's
 *   scrolls) and the globes' hoops.
 *
 * And what is COUNTED stays as counted: the crescent's 11 rays at the
 * same feet, a post at each of a tent's 10 corners. Each bound is paired
 * with a control, the part's old count, which the same measure rejects.
 */
import { describe, expect, it } from "vitest";
import { SAG, circleSegments } from "../demos/eiffel/chord.js";
import {
  ARCADE,
  VAULT_SEGMENTS,
  fitOutSolids,
  innerArc,
  pedestalDressing,
  pedestalFaces,
  vaultArc,
  voidOutline,
} from "../demos/eiffel/platforms.js";
import { FLOORS, PEDESTAL } from "../demos/eiffel/spec.js";

type V = readonly [number, number, number];
type P = readonly [number, number];

const EPS = 1e-9;

/** The gallery (platforms.ts `GALLERY`) [sourced PL-XVIII, PL-XIX, PL-XIII]. */
const EDGE = 70.695 / 2;
const GALLERY_Y = 89.9 - 33.5;
const SPRING = GALLERY_Y + 3.8 + 2.25;
const VAULT_HALF = (7.765 - 0.73) / 2;
const VAULT_RISE = 8.7 - 3.8 - 2.25;
const INNER_R = 3.3675;
const INNER_CROWN = 6.95;
/** The inner arcade's arch (platforms.ts `INNER_ARCADE`) [sourced; derived]. */
const ARCADE_R = 3.5675;
const ARCADE_CROWN = 6.75;
/** The void (platforms.ts `VOID`) [sourced PL-XVI, measured PL-XVIII]. */
const VOID = { half: 14.5, apex: 13.35, bowEnd: 7.2 };

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const mid = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const centroid = (pts: readonly V[]): V => {
  const s = pts.reduce((t, q) => [t[0] + q[0], t[1] + q[1], t[2] + q[2]] as V, [0, 0, 0] as V);
  return [s[0] / pts.length, s[1] / pts.length, s[2] / pts.length];
};

/** The most a closed polygon's chords stand inside the circle of `radius` about `c` its corners are on. */
function circleSag(pts: readonly V[], c: V, radius: number): number {
  let worst = 0;
  for (let i = 0; i < pts.length; i++) {
    const m = mid(pts[i]!, pts[(i + 1) % pts.length]!);
    worst = Math.max(worst, radius - len(sub(m, c)));
  }
  return worst;
}

/** A regular polygon's radius, if `pts` is one (every corner as far from the centroid, every side as long); else undefined. */
function regular(pts: readonly V[]): { c: V; radius: number } | undefined {
  if (pts.length < 8) return undefined;
  const c = centroid(pts);
  const radius = len(sub(pts[0]!, c));
  const side = len(sub(pts[1]!, pts[0]!));
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(len(sub(pts[i]!, c)) - radius) > 1e-7 * radius) return undefined;
    if (Math.abs(len(sub(pts[(i + 1) % pts.length]!, pts[i]!)) - side) > 1e-7 * side) return undefined;
  }
  return { c, radius };
}

/**
 * The most an open polyline's chords stand off the ellipse (a, b) about
 * (cx, cy) its points are on, at the parametric angles `ts` (one to a
 * point): the curve sampled between each two, its distance to the chord.
 */
function ellipseSag(pts: readonly P[], cx: number, cy: number, a: number, b: number, ts: readonly number[]): number {
  let worst = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [p, q] = [pts[i]!, pts[i + 1]!];
    const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
    const l = Math.hypot(dx, dy);
    for (let k = 1; k < 32; k++) {
      const t = ts[i]! + ((ts[i + 1]! - ts[i]!) * k) / 32;
      const [x, y] = [cx + a * Math.cos(t), cy + b * Math.sin(t)];
      worst = Math.max(worst, Math.abs((x - p[0]) * dy - (y - p[1]) * dx) / l);
    }
  }
  return worst;
}

/** A polyline in a vertical plane as (h, y): h along the plane, from its first point. */
function inPlane(pts: readonly V[]): P[] {
  // The plane's horizontal direction: the widest pair's, in plan.
  let [i0, i1, best] = [0, 0, -1];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[j]![0] - pts[i]![0], pts[j]![2] - pts[i]![2]);
      if (d > best) [i0, i1, best] = [i, j, d];
    }
  }
  const u = [(pts[i1]![0] - pts[i0]![0]) / best, (pts[i1]![2] - pts[i0]![2]) / best];
  for (const p of pts) {
    // Every point in that plane.
    const off = (p[0] - pts[i0]![0]) * -u[1]! + (p[2] - pts[i0]![2]) * u[0]!;
    expect(Math.abs(off)).toBeLessThan(1e-6);
  }
  return pts.map((p): P => [(p[0] - pts[0]![0]) * u[0]! + (p[2] - pts[0]![2]) * u[1]!, p[1]]);
}

/**
 * The most a polyline's chords stand off the axis-aligned ellipse (a, b)
 * about `c` its points are on: each point's angle read back off the
 * ellipse, the curve sampled between each two, its distance to the chord.
 */
function onEllipseSag(pts: readonly P[], c: P, a: number, b: number): number {
  const ts = pts.map(([h, y]) => {
    expect(((h - c[0]) / a) ** 2 + ((y - c[1]) / b) ** 2).toBeCloseTo(1, 9);
    return Math.atan2((y - c[1]) / b, (h - c[0]) / a);
  });
  return ellipseSag(
    pts.map(([h, y]): P => [h - c[0], y - c[1]]),
    0,
    0,
    a,
    b,
    ts,
  );
}

/** A half-ellipse, foot to foot on one level, its crown a point: its chords' worst. */
function halfEllipseSag(pts: readonly P[]): number {
  const [p, q] = [pts[0]!, pts[pts.length - 1]!];
  expect(p[1]).toBeCloseTo(q[1], 9);
  const c: P = [(p[0] + q[0]) / 2, p[1]];
  const top = Math.max(...pts.map((x) => x[1]));
  return onEllipseSag(pts, c, Math.abs(q[0] - p[0]) / 2, top - c[1]);
}

/** A quarter ellipse between its two ends, bowed out from its centre under the higher end, level with the lower. */
function quarterEllipseSag(pts: readonly P[]): number {
  const [p, q] = [pts[0]!, pts[pts.length - 1]!];
  const [hi, lo] = p[1] > q[1] ? [p, q] : [q, p];
  return onEllipseSag(pts, [hi[0], lo[1]], Math.abs(lo[0] - hi[0]), hi[1] - lo[1]);
}

/** The most an arc's chords stand inside the circle through its ends and middle point. */
function arcSag(pts: readonly P[]): number {
  const [a, b, c] = [pts[0]!, pts[Math.floor(pts.length / 2)]!, pts[pts.length - 1]!];
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const sq = (p: P) => p[0] * p[0] + p[1] * p[1];
  const ux = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
  const uy = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
  const R = Math.hypot(a[0] - ux, a[1] - uy);
  let worst = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    expect(Math.hypot(pts[i]![0] - ux, pts[i]![1] - uy)).toBeCloseTo(R, 9);
    const m = [(pts[i]![0] + pts[i + 1]![0]) / 2, (pts[i]![1] + pts[i + 1]![1]) / 2];
    worst = Math.max(worst, R - Math.hypot(m[0]! - ux, m[1]! - uy));
  }
  return worst;
}

/** Chains of `between` quads [u_i, u_i+1, l_i+1, l_i], in list order: each chain's two edges as polylines. */
function quadChains(quads: ReadonlyArray<{ outline: readonly V[] }>): Array<{ upper: V[]; lower: V[] }> {
  const out: Array<{ upper: V[]; lower: V[] }> = [];
  let cur: { upper: V[]; lower: V[] } | undefined;
  for (const { outline: o } of quads) {
    if (o.length !== 4) continue;
    const [u0, u1, l1, l0] = o as [V, V, V, V];
    if (cur !== undefined && len(sub(cur.upper[cur.upper.length - 1]!, u0)) < 1e-9) {
      cur.upper.push(u1);
      cur.lower.push(l1);
    } else {
      cur = { upper: [u0, u1], lower: [l0, l1] };
      out.push(cur);
    }
  }
  return out.filter((ch) => ch.upper.length >= 4);
}

/** Chains of bars (`bar`: a rectangle along its centre line, whose ends are its short sides' middles), end to start. */
function barChains(bars: ReadonlyArray<{ outline: readonly V[] }>): V[][] {
  const out: V[][] = [];
  let cur: V[] | undefined;
  for (const { outline: o } of bars) {
    if (o.length !== 4) continue;
    const p = mid(o[3]!, o[0]!);
    const q = mid(o[1]!, o[2]!);
    if (cur !== undefined && len(sub(cur[cur.length - 1]!, p)) < 1e-9) cur.push(q);
    else {
      cur = [p, q];
      out.push(cur);
    }
  }
  return out.filter((ch) => ch.length >= 4);
}

const solids = fitOutSolids();

describe("eiffel roundness: the platforms' curves cut by size", () => {
  it("rounds the 2nd floor's reservoirs to 3 mm, a corner at top and bottom", () => {
    const tanks = solids["second.tank"]!;
    expect(tanks.length).toBe(2);
    for (const t of tanks) {
      const reg = regular(t.outline)!;
      expect(reg).toBeDefined();
      expect(reg.radius).toBeCloseTo(1.5, 9);
      expect(circleSag(t.outline, reg.c, reg.radius)).toBeLessThanOrEqual(SAG.eye + EPS);
      const ys = t.outline.map((p) => p[1]);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(3.0, 9);
    }
    // Control: the old 16 sides stood 29 mm off.
    expect(1.5 * (1 - Math.cos(Math.PI / 16))).toBeGreaterThan(SAG.eye);
  });

  it("rounds the tents' canvas to 3 mm and keeps a post under each of the decagon's 10 corners", () => {
    const floor = FLOORS.second;
    const tent = solids["second.tent"]!;
    const canvas = tent.filter((s) => s.outline.length === 3);
    for (const [cx, cz] of [
      [12.56, -0.11],
      [0.05, 12.22],
    ] as const) {
      const mine = canvas.filter((s) => {
        const apex = s.outline.reduce((a, p) => (p[1] > a[1] ? p : a));
        return Math.hypot(apex[0] - cx, apex[2] - cz) < 1e-6;
      });
      expect(mine.length).toBeGreaterThan(10);
      expect(mine.length % 10).toBe(0);
      const c: V = [cx, floor + 2.2, cz];
      let worst = 0;
      const corners: number[] = [];
      for (const s of mine) {
        const rim = s.outline.filter((p) => Math.abs(p[1] - (floor + 2.2)) < 1e-9);
        expect(rim.length).toBe(2);
        for (const p of rim) expect(len(sub(p, c))).toBeCloseTo(3.7, 9);
        worst = Math.max(worst, 3.7 - len(sub(mid(rim[0]!, rim[1]!), c)));
        for (const p of rim) corners.push(Math.atan2(p[2] - cz, p[0] - cx));
      }
      expect(worst).toBeLessThanOrEqual(SAG.eye + EPS);
      // The posts: ten, each on the ray of a rim corner, under the canvas
      // (a post's outline is its box's one face, half a post off its axis:
      // within 0.02 of the corner's ray, where the rim's corners are 0.08
      // apart).
      const posts = tent.filter(
        (s) => s.outline.length === 4 && Math.abs(Math.max(...s.outline.map((p) => p[1])) - (floor + 2.2)) < 0.2 &&
          Math.abs(Math.hypot(centroid(s.outline)[0] - cx, centroid(s.outline)[2] - cz) - 3.7) < 0.2,
      );
      expect(posts.length).toBe(10);
      for (const s of posts) {
        const [px, , pz] = centroid(s.outline);
        const th = Math.atan2(pz - cz, px - cx);
        expect(corners.some((a) => Math.abs(Math.atan2(Math.sin(a - th), Math.cos(a - th))) < 0.02)).toBe(true);
      }
      // A corner on the face's normal, as before: the axis-side direction.
      const phase = Math.atan2(cz, cx);
      expect(corners.some((a) => Math.abs(Math.atan2(Math.sin(a - phase), Math.cos(a - phase))) < 1e-9)).toBe(true);
    }
    // Control: the old decagon stood 181 mm off its circle.
    expect(3.7 * (1 - Math.cos(Math.PI / 10))).toBeGreaterThan(SAG.eye);
  });

  it("rounds every vault's arc and the crescents' ribs to 5 mm, and keeps the 11 rays' feet where they were", () => {
    const S = VAULT_SEGMENTS / ARCADE.cells;
    expect(Number.isInteger(S)).toBe(true);
    expect(ARCADE.cells).toBe(12);
    const ts = Array.from({ length: VAULT_SEGMENTS + 1 }, (_, i) => Math.PI * (1 - i / VAULT_SEGMENTS));
    // The vault's arc, the outer rib's inner edge and the shell's underside.
    for (const inset of [0, 0.25, 0.1, 0.1 + 0.2]) {
      const arc = vaultArc(0, EDGE, inset);
      expect(arc.length).toBe(VAULT_SEGMENTS + 1);
      const pts = arc.map((p): P => [p[0], p[1]]);
      expect(ellipseSag(pts, 0, SPRING, VAULT_HALF - inset, VAULT_RISE - inset, ts)).toBeLessThanOrEqual(SAG.near + EPS);
      // Cell boundary k is the 12-chord arc's point k.
      for (let k = 0; k <= 12; k++) {
        const phi = Math.PI * (1 - k / 12);
        expect(pts[k * S]![0]).toBeCloseTo((VAULT_HALF - inset) * Math.cos(phi), 12);
        expect(pts[k * S]![1]).toBeCloseTo(SPRING + (VAULT_RISE - inset) * Math.sin(phi), 12);
      }
    }
    // The inner arcs: the face gable's, its rib's outer edge, and the inner arcade's.
    for (const [radius, crown, grow] of [
      [INNER_R, INNER_CROWN, 0],
      [INNER_R, INNER_CROWN, 0.2],
      [ARCADE_R, ARCADE_CROWN, 0],
      [ARCADE_R, ARCADE_CROWN, 0.2],
    ] as const) {
      const arc = innerArc(0, EDGE, grow, radius, crown);
      const c: V = [0, GALLERY_Y + crown - radius, EDGE];
      expect(arc.length).toBe(VAULT_SEGMENTS + 1);
      for (const p of arc) expect(len(sub(p, c))).toBeCloseTo(radius + grow, 9);
      expect(arcSag(arc.map((p): P => [p[0], p[1]]))).toBeLessThanOrEqual(SAG.near + EPS);
    }
    // Control: the old 12 chords stood 30 mm off the vault's arc.
    const old = Array.from({ length: 13 }, (_, i): P => {
      const phi = Math.PI * (1 - i / 12);
      return [VAULT_HALF * Math.cos(phi), SPRING + VAULT_RISE * Math.sin(phi)];
    });
    const oldTs = Array.from({ length: 13 }, (_, i) => Math.PI * (1 - i / 12));
    expect(ellipseSag(old, 0, SPRING, VAULT_HALF, VAULT_RISE, oldTs)).toBeGreaterThan(SAG.near);
  });

  it("rounds the inner arcade's arches as built, rib by rib, to 5 mm", () => {
    // Each arch's two ribs are `between` quads along its arcs, in turn: the
    // outer rib between two half-ellipses, the inner between two circles.
    const chains = quadChains(solids["inner.arch"]!);
    expect(chains.length).toBe(28 * 2);
    chains.forEach((ch, i) => {
      for (const edge of [ch.upper, ch.lower]) {
        expect(edge.length).toBe(VAULT_SEGMENTS + 1);
        const pts = inPlane(edge);
        expect(i % 2 === 0 ? halfEllipseSag(pts) : arcSag(pts)).toBeLessThanOrEqual(SAG.near + EPS);
      }
    });
  });

  it("cuts the small arches to 5 mm on their extrados", () => {
    const extrados = 1.538 + 0.2;
    const n = ARCADE.archFacets;
    // A facet of the half turn is a chord of π / n.
    expect(extrados * (1 - Math.cos(Math.PI / (2 * n)))).toBeLessThanOrEqual(SAG.near + EPS);
    // Control: the old 6 facets stood 60 mm off.
    expect(extrados * (1 - Math.cos(Math.PI / 12))).toBeGreaterThan(SAG.near);
  });

  it("rounds every disc to 5 mm by its own radius, and the reservoirs to 3", () => {
    const radii = new Map<string, number[]>();
    let found = 0;
    for (const [key, list] of Object.entries(solids)) {
      for (const s of list) {
        const reg = regular(s.outline);
        if (reg === undefined) continue;
        found++;
        const tol = key === "second.tank" ? SAG.eye : SAG.near;
        expect(circleSag(s.outline, reg.c, reg.radius), `${key} r ${reg.radius}`).toBeLessThanOrEqual(tol + EPS);
        radii.set(key, [...(radii.get(key) ?? []), Math.round(reg.radius * 1000) / 1000]);
      }
    }
    expect(found).toBeGreaterThan(0);
    // The ones the fit-out is known to build: a cabochon's ring 0.19, the
    // crest's scrolls 0.15, the Russe's clock 0.625, sun 0.32 and wheel 0.44.
    expect(radii.get("arcade.ring")).toContain(0.19);
    expect(radii.get("arcade.crest")).toContain(0.15);
    expect(radii.get("russe.clock")).toContain(0.625);
    expect(radii.get("russe.gable")).toContain(0.32);
    expect(radii.get("russe.finial")).toContain(0.44);
    // Control: the old 16 sides on the clock stood 12 mm off.
    expect(0.625 * (1 - Math.cos(Math.PI / 16))).toBeGreaterThan(SAG.near);
  });

  it("hangs each globe in hoops round to 5 mm", () => {
    const hanger = solids["arcade.hanger"]!;
    // A rod and two hoops to each of the 36 arcades.
    const bars = (hanger.length / 36 - 1) / 2;
    expect(Number.isInteger(bars)).toBe(true);
    // The hoop's bars' outer edges, about 0.33 from the globe's centre.
    expect(0.33 * (1 - Math.cos(Math.PI / bars))).toBeLessThanOrEqual(SAG.near + EPS);
    expect(0.33 * (1 - Math.cos(Math.PI / 12))).toBeGreaterThan(SAG.near);
  });

  it("rounds the Français' archivolts (so the door heads they ring) and its crest to 5 mm", () => {
    const chains = quadChains(solids["francais.archivolt"]!);
    // Two doors to a bay, three bays; the archivolt's outer edge and the
    // head's own, half-ellipses 1.55 by 1.37 and 1.30 by 1.12.
    expect(chains.length).toBe(6);
    for (const ch of chains) {
      for (const [edge, a, b] of [
        [ch.upper, 1.55, 1.37],
        [ch.lower, 1.3, 1.12],
      ] as const) {
        const pts = inPlane(edge);
        expect(Math.abs(pts[pts.length - 1]![0] - pts[0]![0]) / 2).toBeCloseTo(a, 9);
        expect(Math.max(...pts.map((p) => p[1])) - pts[0]![1]).toBeCloseTo(b, 9);
        expect(halfEllipseSag(pts)).toBeLessThanOrEqual(SAG.near + EPS);
      }
    }
    // The crest: its round head over two corners at the wall head, and its
    // two shoulders, each a quarter ellipse and the corner at its centre.
    const crest = solids["francais.crest"]!.filter((s) => s.outline.length > 4);
    expect(crest.length).toBe(3);
    const head = crest.reduce((a, b) => (Math.max(...b.outline.map((p) => p[1])) > Math.max(...a.outline.map((p) => p[1])) ? b : a));
    const low = Math.min(...head.outline.map((p) => p[1]));
    const round = inPlane(head.outline.filter((p) => p[1] > low + 1e-6));
    expect(halfEllipseSag(round)).toBeLessThanOrEqual(SAG.near + EPS);
    for (const s of crest.filter((x) => x !== head)) {
      const pts = inPlane(s.outline);
      const top = pts.reduce((a, p) => (p[1] > a[1] ? p : a));
      const floor = Math.min(...pts.map((p) => p[1]));
      const curve = pts.filter((p) => !(Math.abs(p[0] - top[0]) < 1e-9 && Math.abs(p[1] - floor) < 1e-9));
      expect(curve.length).toBe(pts.length - 1);
      expect(quarterEllipseSag(curve)).toBeLessThanOrEqual(SAG.near + EPS);
    }
    // Control: the old 8 chords on the archivolt's outer edge.
    const ts = Array.from({ length: 9 }, (_, i) => Math.PI * (1 - i / 8));
    const old = ts.map((t): P => [1.55 * Math.cos(t), 1.37 * Math.sin(t)]);
    expect(ellipseSag(old, 0, 0, 1.55, 1.37, ts)).toBeGreaterThan(SAG.near);
  });

  it("rounds the Flamand's arched sashes and curved braces to 5 mm", () => {
    // Six sashes, half-ellipses foot to foot; two braces to each of three
    // bays, quarter ellipses from the collar post's foot to the king post.
    const sashes = barChains(solids["flamand.arch"]!);
    expect(sashes.length).toBe(6);
    for (const ch of sashes) expect(halfEllipseSag(inPlane(ch))).toBeLessThanOrEqual(SAG.near + EPS);
    const braces = barChains(solids["flamand.brace"]!);
    expect(braces.length).toBe(6);
    for (const ch of braces) expect(quarterEllipseSag(inPlane(ch))).toBeLessThanOrEqual(SAG.near + EPS);
    // Control: the old 8 chords on a sash's half-ellipse, 1.82 by 1.50.
    const ts = Array.from({ length: 9 }, (_, i) => Math.PI * (1 - i / 8));
    const old = ts.map((t): P => [1.82 * Math.cos(t), 1.5 * Math.sin(t)]);
    expect(ellipseSag(old, 0, 0, 1.82, 1.5, ts)).toBeGreaterThan(SAG.near);
  });

  it("rounds the void's « Balcon » bow to 3 mm, its ends where they were", () => {
    const sag = VOID.half - VOID.apex;
    const R = (VOID.bowEnd ** 2 + sag ** 2) / (2 * sag);
    for (const off of [0, 0.09]) {
      const line = voidOutline(off);
      const bow = line.slice(2, line.length - 2);
      const rr = R - off;
      const c: V = [0, VOID.apex + R, 0];
      const pts = bow.map(([a, r]): V => [a, r, 0]);
      for (const p of pts) expect(len(sub(p, c))).toBeCloseTo(rr, 9);
      let worst = 0;
      for (let i = 0; i + 1 < pts.length; i++) worst = Math.max(worst, rr - len(sub(mid(pts[i]!, pts[i + 1]!), c)));
      expect(worst).toBeLessThanOrEqual(SAG.eye + EPS);
      // Its ends on the straight edge, the middle at the apex.
      expect(bow[0]![1]).toBeCloseTo(VOID.half + off, 9);
      expect(bow[bow.length - 1]![1]).toBeCloseTo(VOID.half + off, 9);
      expect(Math.min(...bow.map((p) => p[1]))).toBeCloseTo(VOID.apex + off, 9);
    }
    // Control: the old 12 chords stood 8 mm off.
    expect(R * (1 - Math.cos(Math.asin(VOID.bowEnd / R) / 12))).toBeGreaterThan(SAG.eye);
  });

  it("turns the plinth's inner corner and the bench round it to 3 mm", () => {
    const C = PEDESTAL.innerFoot + PEDESTAL.corner.radius;
    const R = PEDESTAL.corner.radius;
    // The plinth's foot: its points on the arc, in order round it.
    const onArc = pedestalFaces()
      .flatMap((p) => p.outline)
      .filter(([x, y, z]) => Math.abs(y) < 1e-9 && x < C + 1e-9 && z < C + 1e-9 && Math.abs(Math.hypot(x - C, z - C) - R) < 1e-9)
      // Its quarter turn from π to 3π/2, read so it does not wrap.
      .map(([x, , z]) => {
        const a = Math.atan2(z - C, x - C);
        return a < 0 ? a + 2 * Math.PI : a;
      });
    const angles = [...new Set(onArc.map((a) => Math.round(a * 1e9) / 1e9))].sort((a, b) => a - b);
    expect(angles.length).toBe(PEDESTAL.corner.segments + 1);
    let worst = 0;
    for (let i = 0; i + 1 < angles.length; i++) worst = Math.max(worst, R * (1 - Math.cos((angles[i + 1]! - angles[i]!) / 2)));
    expect(worst).toBeLessThanOrEqual(SAG.eye + EPS);
    // The bench: sill and seat pieces round the corner, the last 2n of the
    // masonry; each piece's outer edge a chord of its arc.
    const n = PEDESTAL.corner.segments;
    const bench = pedestalDressing().masonry.slice(-2 * n);
    let benchWorst = 0;
    for (const piece of bench) {
      const foot = piece.outline;
      const radii = foot.map(([x, , z]) => Math.hypot(x - C, z - C));
      const r1 = Math.max(...radii);
      const outer = foot.filter((_, i) => Math.abs(radii[i]! - r1) < 1e-9);
      expect(outer.length).toBe(2);
      const [a, b] = outer as [V, V];
      const m = mid(a, b);
      benchWorst = Math.max(benchWorst, r1 - Math.hypot(m[0] - C, m[2] - C));
    }
    expect(benchWorst).toBeLessThanOrEqual(SAG.eye + EPS);
    // Control: the old 12 over the quarter turn stood 9 mm off the sill's front.
    expect((R + 0.7) * (1 - Math.cos(Math.PI / 48))).toBeGreaterThan(SAG.eye);
  });

  it("derives each count from its size, so a larger part gets more", () => {
    // The rule the builders call, on the parts' own sizes: the reservoir's
    // 1.50 against a cabochon's 0.19 at their tolerances.
    expect(circleSegments(1.5, SAG.eye)).toBeGreaterThan(circleSegments(0.19, SAG.near));
    expect(circleSegments(0.625, SAG.near)).toBeGreaterThan(circleSegments(0.19, SAG.near));
  });
});
