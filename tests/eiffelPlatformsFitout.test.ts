/**
 * The Eiffel demo's fit-out leftovers on the platforms (`platforms.ts`):
 * the 1st floor's inner arcade, the entrance flights on the Français and
 * the Russe, and the 2nd platform's 1889 massing.
 *
 * Held here against what the graph COOKS and against the plates' numbers,
 * restated rather than imported, so a change to the module has to be a
 * change here too:
 *
 * - counts: a pilaster and a valley gutter at every pier but the corners'
 *   (8 a face), an arch over every bay but the corners' (7 a face);
 *   6 treads a flight, 2 flights a face, on exactly the two faces FACES
 *   names for the Français and the Russe; 2 reservoirs, 1 Figaro pavilion,
 *   1 ticket office, 2 boutiques, 2 round tents and 1 queue's tent;
 * - placement: the pilasters' inboard face at 4.1875 inside the column
 *   axis, or before a leg against the step; the arch's crowns; the flights'
 *   strings, risers and landing; the reservoirs' size, height and place on
 *   the Roux legs' diagonal; the buildings' heights;
 * - the cooked meshes are exactly the solids `fitOutSolids` lists;
 * - no other part of the tower — deck, step, column, leg, pavilion, lift,
 *   stair — reaches inside any of them;
 * - two cooks agree to the bit.
 *
 * Every check that should read zero is first shown to read non-zero on a
 * deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { SAG, circleSegments } from "../demos/eiffel/chord.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { VAULT_SEGMENTS, fitOutSolids } from "../demos/eiffel/platforms.js";
import { FACES, FLOORS, PILES } from "../demos/eiffel/spec.js";

type V = readonly [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V): V => sc(a, 1 / len(a));

/** The plates' numbers (tags as in `platforms.ts`). */
/** Column axis, half PL-I's 70.695 [sourced]. */
const EDGE = 70.695 / 2;
/** Gallery floor, altitude 89.90 [sourced PL-XIX], and the platform's. */
const GALLERY = 89.9 - 33.5;
const TERRACE = FLOORS.first;
/** The step's face, 2.60 inside the column axis [sourced PL-XVIII]. */
const STEP = EDGE - 2.6;
/** Column axis to the inner arcade's pilasters [sourced PL-XIII Fig. 21]. */
const INNER = 4.1875;
/** Pier pitch [sourced]. */
const BAY = 7.765;
/** Vault crown 8.70 over the gallery floor; the inner arch's inner rib crowned 6.75 [sourced PL-XIII Fig. 26]. */
const CROWN = 8.7;
const INNER_CROWN = 6.75;
/** The vault's shell, which the inner arch's outer rib hangs under [platforms.ts ARCADE.shell]. */
const SHELL = 0.1;
/**
 * Flights: outer string on the pier's axis [sourced], back string 0.72 into
 * the terrace (PL-XXIX Fig. 4's 0.88 less what the model's grande poutre
 * takes, derived), 7 risers [counted PL-XXIX Fig. 4].
 */
const OUTER_STRING = 3.8825;
const BACK_STRING = 0.72;
const RISERS = 7;
/** Reservoirs « 3 m de diamètre » [sourced E1900-TXT p. 199], "6.00" along [sourced PL-XIX Fig. 7], 0.6 up [measured Fig. 2]. */
const TANK_D = 3.0;
const TANK_L = 6.0;
const TANK_FOOT = 0.6;
/** The boutique's "2.840" [sourced PL-XIX Fig. 2]. */
const BOOTH = 2.84;

interface Solid {
  readonly pts: readonly V[];
  readonly n: V;
  readonly depth: number;
  readonly inward: readonly V[];
  readonly lo: V;
  readonly hi: V;
}

/** An outline extruded `depth` along its right-hand normal, as a convex solid. */
function solid(outline: readonly V[], depth: number): Solid {
  // Newell's normal: right-handed about the outline's order.
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const n = unit([nx, ny, nz]);
  const inward = outline.map((a, i) => unit(cross(n, sub(outline[(i + 1) % outline.length]!, a))));
  const all = [...outline, ...outline.map((p) => add(p, sc(n, depth)))];
  const lo: V = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]!))) as unknown as V;
  const hi: V = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k]!))) as unknown as V;
  return { pts: outline, n, depth, inward, lo, hi };
}

/** Strictly inside, by more than `m` from every face. */
function inside(x: V, s: Solid, m: number): boolean {
  for (let k = 0; k < 3; k++) if (x[k]! < s.lo[k]! + m || x[k]! > s.hi[k]! - m) return false;
  const h = dot(sub(x, s.pts[0]!), s.n);
  if (h <= m || h >= s.depth - m) return false;
  for (let i = 0; i < s.pts.length; i++) if (dot(sub(x, s.pts[i]!), s.inward[i]!) <= m) return false;
  return true;
}

const moved = (s: Solid, d: V): Solid =>
  solid(
    s.pts.map((p) => add(p, d)),
    s.depth,
  );

/** A mesh's polygons, as point lists. */
function polygons(geo: Geometry): V[][] {
  const P = geo.attrs.point.get("P")!.data;
  const out: V[][] = [];
  for (let p = 0; p < geo.primVertexStart.length; p++) {
    const s = geo.primVertexStart[p]!;
    const poly: V[] = [];
    for (let k = 0; k < geo.primVertexCount[p]!; k++) {
      const j = geo.vertexToPoint[s + k]!;
      poly.push([P[3 * j]!, P[3 * j + 1]!, P[3 * j + 2]!]);
    }
    out.push(poly);
  }
  return out;
}

/** Points over a polygon: its corners, along its edges, and over it (a fan), about `step` apart. */
function samples(poly: readonly V[], step: number): V[] {
  const out: V[] = [...poly];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.min(400, Math.ceil(len(sub(b, a)) / step));
    for (let k = 1; k < n; k++) out.push(add(a, sc(sub(b, a), k / n)));
  }
  for (let i = 1; i + 1 < poly.length; i++) {
    const a = poly[0]!;
    const b = poly[i]!;
    const c = poly[i + 1]!;
    const n = Math.min(60, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a))) / step));
    for (let u = 1; u < n; u++) {
      for (let v = 1; u + v < n; v++) out.push(add(a, add(sc(sub(b, a), u / n), sc(sub(c, a), v / n))));
    }
  }
  return out;
}

/** How many of `foreign`'s samples fall inside any of `solids`, by more than `m`; and the first few. */
function intrusions(solids: readonly Solid[], foreign: readonly V[][], m: number): { count: number; first: string[] } {
  const lo: V = [0, 1, 2].map((k) => Math.min(...solids.map((s) => s.lo[k]!))) as unknown as V;
  const hi: V = [0, 1, 2].map((k) => Math.max(...solids.map((s) => s.hi[k]!))) as unknown as V;
  let count = 0;
  const first: string[] = [];
  for (const poly of foreign) {
    const plo = [0, 1, 2].map((k) => Math.min(...poly.map((p) => p[k]!)));
    const phi = [0, 1, 2].map((k) => Math.max(...poly.map((p) => p[k]!)));
    if ([0, 1, 2].some((k) => phi[k]! < lo[k]! || plo[k]! > hi[k]!)) continue;
    const near = solids.filter((s) => [0, 1, 2].every((k) => phi[k]! >= s.lo[k]! && plo[k]! <= s.hi[k]!));
    if (near.length === 0) continue;
    for (const x of samples(poly, 0.05)) {
      if (near.some((s) => inside(x, s, m))) {
        count++;
        if (first.length < 5) first.push(x.map((v) => v.toFixed(3)).join(", "));
        break;
      }
    }
  }
  return { count, first };
}

/** The ids of the probe nodes `buildPlatforms` cooks the three leftovers into. */
const MINE = [
  "innerArcade",
  "innerArcadeCurved",
  "entranceRails",
  "entranceFlights",
  "secondFitOut",
  "secondFitOutCurved",
] as const;

/** The deck's (fitOutCurved) and the rest of the platforms' own (fitOut) meshes. */
const DECKS = ["fitOut", "fitOutCurved"] as const;

let geo: Record<string, Geometry>;
let foreign: V[][];
let solids: Record<string, Solid[]>;
const byPrefix = (prefix: string): Solid[] =>
  Object.entries(solids)
    .filter(([k]) => k.startsWith(prefix))
    .flatMap(([, v]) => v);
const bbox = (list: readonly Solid[]) => ({
  lo: [0, 1, 2].map((k) => Math.min(...list.map((s) => s.lo[k]!))),
  hi: [0, 1, 2].map((k) => Math.max(...list.map((s) => s.hi[k]!))),
});
const centre = (s: Solid): V => sc(add(s.lo, s.hi), 0.5);

async function cookProbed(): Promise<Record<string, Geometry>> {
  const g = buildEiffel(1889);
  for (const id of [...MINE, ...DECKS]) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  for (const [k, v] of Object.entries(outputs)) {
    const gg = firstGeometry(v as never);
    if (gg !== undefined && gg !== null) out[k] = gg;
  }
  return out;
}

beforeAll(async () => {
  geo = await cookProbed();
  solids = Object.fromEntries(
    Object.entries(fitOutSolids()).map(([k, list]) => [k, list.map((p) => solid(p.outline, p.depth))]),
  );
  // Everything else the tower cooks: every class output and every car,
  // less the leftovers' own points (the classes are jittered by 1 mm).
  const mine = new Set<string>();
  const key = (x: number, y: number, z: number) => `${Math.round(x * 200)},${Math.round(y * 200)},${Math.round(z * 200)}`;
  for (const id of MINE) {
    const P = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
    for (let i = 0; i < P.length; i += 3) {
      for (const dx of [-1, 0, 1])
        for (const dy of [-1, 0, 1])
          for (const dz of [-1, 0, 1]) mine.add(key(P[i]! + dx / 200, P[i + 1]! + dy / 200, P[i + 2]! + dz / 200));
    }
  }
  foreign = [];
  for (const [k, g] of Object.entries(geo)) {
    if (k.startsWith("probe:") || k.startsWith("rivets.")) continue;
    if (!(PART_CLASSES as readonly string[]).includes(k) && !k.startsWith("car.")) continue;
    for (const poly of polygons(g)) if (!poly.every((p) => mine.has(key(p[0], p[1], p[2])))) foreign.push(poly);
  }
}, 180_000);

describe("eiffel platforms fit-out", () => {
  it("cooks exactly the solids it lists", () => {
    // Every probe's bounds are its solids' bounds.
    const groups: Record<(typeof MINE)[number], string> = {
      innerArcade: "inner.",
      innerArcadeCurved: "inner.",
      entranceRails: "entrance.",
      entranceFlights: "entrance.",
      secondFitOut: "second.",
      secondFitOutCurved: "second.",
    };
    const union = (ids: readonly string[]) => {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const id of ids) {
        const P = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
        for (let i = 0; i < P.length; i++) {
          lo[i % 3] = Math.min(lo[i % 3]!, P[i]!);
          hi[i % 3] = Math.max(hi[i % 3]!, P[i]!);
        }
      }
      return { lo, hi };
    };
    for (const prefix of ["inner.", "entrance.", "second."]) {
      const ids = MINE.filter((id) => groups[id] === prefix);
      const cooked = union(ids);
      const listed = bbox(byPrefix(prefix));
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(cooked.lo[k]! - listed.lo[k]!), `${prefix} lo[${k}]`).toBeLessThan(1e-4);
        expect(Math.abs(cooked.hi[k]! - listed.hi[k]!), `${prefix} hi[${k}]`).toBeLessThan(1e-4);
      }
    }
    // And point for point: every cooked point is a corner of a listed
    // solid (its outline or its outline moved `depth` along its normal),
    // and every listed corner is cooked.
    const key = (p: V) => p.map((v) => Math.round(v * 1e4)).join(",");
    const listedKeys = (list: readonly Solid[]) =>
      new Set(list.flatMap((s) => [...s.pts, ...s.pts.map((q) => add(q, sc(s.n, s.depth)))].map(key)));
    const cookedKeys = (ids: readonly string[]) => {
      const out = new Set<string>();
      for (const id of ids) {
        const P = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
        for (let i = 0; i < P.length; i += 3) out.add(key([P[i]!, P[i + 1]!, P[i + 2]!]));
      }
      return out;
    };
    // Cooked points are f32: a key matches its neighbours' too, 0.1 mm apart.
    const missing = (a: Set<string>, b: Set<string>) =>
      [...a].filter((k) => {
        const [x, y, z] = k.split(",").map(Number) as [number, number, number];
        for (const dx of [-1, 0, 1])
          for (const dy of [-1, 0, 1])
            for (const dz of [-1, 0, 1]) if (b.has(`${x + dx},${y + dy},${z + dz}`)) return false;
        return true;
      }).length;
    for (const prefix of ["inner.", "entrance.", "second."]) {
      const listed = listedKeys(byPrefix(prefix));
      const cookedSet = cookedKeys(MINE.filter((id) => groups[id] === prefix));
      expect(missing(cookedSet, listed), `${prefix} cooked not listed`).toBe(0);
      expect(missing(listed, cookedSet), `${prefix} listed not cooked`).toBe(0);
    }
    // Control: one boutique dropped from the list leaves its corners unlisted.
    const less = listedKeys(byPrefix("second.").filter((s) => s !== solids["second.boutique"]![0]));
    expect(missing(cookedKeys(["secondFitOut", "secondFitOutCurved"]), less)).toBeGreaterThan(0);
    // Control: a solid list shifted 0.05 no longer matches.
    const shifted = bbox(byPrefix("second.").map((s) => moved(s, [0.05, 0, 0])));
    const cooked = union(["secondFitOut", "secondFitOutCurved"]);
    expect(Math.abs(cooked.lo[0]! - shifted.lo[0]!)).toBeGreaterThan(0.04);
  });

  it("stands a pilaster and a gutter at every pier and an arch over every bay, but the corners'", () => {
    const pilasters = solids["inner.pilaster"]!;
    expect(pilasters.length).toBe(32);
    expect(solids["inner.gutter"]!.length).toBe(32);
    // Each arch is its bay's two ribs as quads between arcs, as many as
    // the vault's arc has chords (VAULT_SEGMENTS, cut by size: a whole
    // number to each of the crescent's 12 cells), and its 11 rays, all a
    // plate (0.15) thick.
    const arch = solids["inner.arch"]!;
    expect(VAULT_SEGMENTS % 12).toBe(0);
    expect(arch.length).toBe(28 * (2 * VAULT_SEGMENTS + 11));
    // On the +z face: every 7.765 from ±3.8825 to ±27.18, in front of a
    // leg (19.41, 27.18) against the step, else 4.1875 inside the column axis.
    const zFace = pilasters.filter((s) => centre(s)[2] > EDGE - 5 && centre(s)[2] < EDGE);
    expect(zFace.length).toBe(8);
    const stations = zFace.map((s) => centre(s)[0]).sort((a, b) => a - b);
    stations.forEach((a, i) => expect(Math.abs(a - (i - 3.5) * BAY)).toBeLessThan(1e-6));
    for (const s of zFace) {
      const a = Math.abs(centre(s)[0]);
      const leg = a > 19 && a < 28;
      if (leg) {
        // Against the step's face, on the gallery floor.
        expect(Math.abs(s.lo[2] - STEP)).toBeLessThan(0.005);
        expect(Math.abs(s.lo[1] - GALLERY)).toBeLessThan(1e-6);
      } else {
        expect(Math.abs(s.lo[2] - (EDGE - INNER))).toBeLessThan(1e-6);
        expect(Math.abs(s.lo[1] - TERRACE)).toBeLessThan(1e-6);
      }
    }
    // The arch's outer rib under the shell at the 8.70 crown, its inner rib
    // crowned 6.75, in the plane at 4.1875.
    const mid = arch.filter((s) => s.lo[2] > EDGE - 5 && s.hi[2] < EDGE && Math.abs(centre(s)[0]) < 1);
    const top = Math.max(...mid.map((s) => s.hi[1]!));
    expect(Math.abs(top - (GALLERY + CROWN - SHELL))).toBeLessThan(0.01);
    // The inner rib's underside at the crown: the lowest corner on the
    // bay's middle line (the rays' corners stand off it).
    const onMiddle = mid.flatMap((s) => s.pts.filter((p) => Math.abs(p[0]) < 1e-6));
    const lowest = Math.min(...onMiddle.map((p) => p[1]));
    expect(Math.abs(lowest - (GALLERY + INNER_CROWN))).toBeLessThan(1e-6);
    expect(Math.min(...mid.map((s) => s.lo[2]!))).toBeCloseTo(EDGE - INNER, 6);
  });

  it("brings the flights up on the Français and the Russe only, 7 risers to the terrace", () => {
    const treads = solids["entrance.tread"]!;
    expect(treads.length).toBe(24);
    // Which face each tread is on, by FACES' own normals.
    const faceOf = (s: Solid) => {
      const c = centre(s);
      return FACES.reduce((best, f) =>
        f.normal[0] * c[0] + f.normal[1] * c[2] > best.normal[0] * c[0] + best.normal[1] * c[2] ? f : best,
      );
    };
    const on = new Map<string, number>();
    for (const s of treads) on.set(faceOf(s).pavilion, (on.get(faceOf(s).pavilion) ?? 0) + 1);
    expect(on.get("Restaurant français")).toBe(12);
    expect(on.get("Restaurant russe")).toBe(12);
    // Control: the count on the other two is zero, and the comparator can
    // see a tread moved onto one of them.
    expect((on.get("Bar anglo-américain") ?? 0) + (on.get("Restaurant flamand") ?? 0)).toBe(0);
    const turned = treads[0]!;
    const mirror = solid(
      turned.pts.map((p): V => [-p[0], p[1], -p[2]]),
      turned.depth,
    );
    expect(["Restaurant français", "Restaurant russe"]).not.toContain(faceOf(mirror).pavilion);
    // Tread tops: 1..6 risers of 1.23 / 7 over the gallery, per flight.
    const rise = (TERRACE - GALLERY) / RISERS;
    const tops = treads.map((s) => Math.round((s.hi[1] - GALLERY) / rise));
    for (let k = 1; k <= 6; k++) expect(tops.filter((t) => t === k).length).toBe(4);
    for (const s of treads) expect(Math.abs(s.hi[1] - GALLERY - rise * Math.round((s.hi[1] - GALLERY) / rise))).toBeLessThan(1e-6);
    // In the face frame: the outer string at ±3.8825, the back string 0.72
    // into the terrace, the winders inside those.
    const frame = (s: Solid) => {
      const f = faceOf(s);
      // a along the face (+a = the face's normal turned -90 about +y), r out.
      return s.pts.map((p): [number, number] => {
        const r = f.normal[0] * p[0] + f.normal[1] * p[2];
        const a = f.normal[1] * p[0] - f.normal[0] * p[2];
        return [a, r];
      });
    };
    for (const s of treads) {
      const ar = frame(s);
      const winder = s.hi[1] - GALLERY > 2.5 * rise;
      if (!winder) continue;
      expect(Math.max(...ar.map(([a]) => Math.abs(a)))).toBeLessThanOrEqual(OUTER_STRING + 1e-6);
      expect(Math.min(...ar.map(([, r]) => r))).toBeGreaterThanOrEqual(STEP - BACK_STRING - 1e-6);
    }
    const deepest = Math.min(...treads.flatMap((s) => frame(s).map(([, r]) => r)));
    expect(deepest).toBeCloseTo(STEP - BACK_STRING, 6);
  });

  it("sets the 2nd platform's reservoirs, buildings and tents where Fig. 7 draws them", () => {
    const floor = FLOORS.second;
    const tanks = solids["second.tank"]!;
    expect(tanks.length).toBe(2);
    // On the diagonal of the two Roux piles, axis square to it.
    const roux = PILES.filter((p) => p.lift === "roux").map((p) => p.corner);
    expect(roux.length).toBe(2);
    const diag = unit([roux[0]![0] - roux[1]![0], 0, roux[0]![1] - roux[1]![1]]);
    for (const t of tanks) {
      expect(Math.abs(dot(t.n, diag))).toBeLessThan(1e-9);
      expect(Math.abs(t.n[1])).toBeLessThan(1e-9);
      expect(t.depth).toBeCloseTo(TANK_L, 9);
      const c = centre(t);
      const off = len(sub(c, sc(diag, dot(c, diag))).map((v, k) => (k === 1 ? 0 : v)) as unknown as V);
      expect(off).toBeLessThan(0.3);
      expect(Math.abs(dot(c, diag))).toBeGreaterThan(7.5);
      expect(Math.abs(dot(c, diag))).toBeLessThan(8.3);
      // 3.00 across: the 16-gon's corners are on the circle about the axis.
      for (const p of t.pts) {
        const d = sub(p, c);
        expect(len(sub(d, sc(t.n, dot(d, t.n))))).toBeCloseTo(TANK_D / 2, 9);
      }
      expect(t.lo[1]).toBeCloseTo(floor + TANK_FOOT, 2);
      expect(t.hi[1]).toBeCloseTo(floor + TANK_FOOT + TANK_D, 9);
    }
    expect(Math.sign(dot(centre(tanks[0]!), diag))).not.toBe(Math.sign(dot(centre(tanks[1]!), diag)));
    // The Figaro's pavilion on the face between piles 1 and 2.
    const figaro = solids["second.figaro"]!;
    expect(figaro.length).toBe(1);
    const fc = centre(figaro[0]!);
    const face = FACES.reduce((b, f) => (f.normal[0] * fc[0] + f.normal[1] * fc[2] > b.normal[0] * fc[0] + b.normal[1] * fc[2] ? f : b));
    expect([...face.piles].sort()).toEqual([1, 2]);
    // The booths at the boutique's 2.84; everything inside the gallery's
    // inner posts (16.41 from the axis less their half-width).
    for (const k of ["second.tickets", "second.boutique"]) {
      for (const s of solids[k]!) expect(s.hi[1] - floor).toBeCloseTo(BOOTH, 9);
    }
    expect(solids["second.boutique"]!.length).toBe(2);
    // Their places on Fig. 7 [measured, ±0.3], in the diagonals' frame (s
    // toward pile 3, t toward pile 4) or the world's (x, z).
    const st = (p: V): [number, number] => [(p[0] - p[2]) * Math.SQRT1_2, (p[0] + p[2]) * Math.SQRT1_2];
    const stBox = (s: Solid) => {
      const q = s.pts.map(st);
      return [Math.min(...q.map((v) => v[0])), Math.max(...q.map((v) => v[0])), Math.min(...q.map((v) => v[1])), Math.max(...q.map((v) => v[1]))];
    };
    const near = (got: number[], want: number[], tol: number) => got.every((v, i) => Math.abs(v - want[i]!) <= tol);
    const plate = {
      tickets: [[-2.95, 4.1, -6.45, -2.55]],
      boutique: [
        [3.23, 5.29, 2.57, 3.58],
        [-4.65, -2.62, 2.52, 3.52],
      ],
    };
    for (const [k, want] of Object.entries(plate)) {
      for (const w of want) expect(solids[`second.${k}`]!.some((s) => near(stBox(s), w, 0.3)), `${k} ${w}`).toBe(true);
    }
    // Control: the comparator rejects a boutique at the other's place.
    expect(near(stBox(solids["second.boutique"]![0]!), plate.boutique[1]!, 0.3) && near(stBox(solids["second.boutique"]![1]!), plate.boutique[1]!, 0.3)).toBe(false);
    const poles = solids["second.tent"]!.filter((s) => s.hi[1] - floor > 3 && s.pts.length === 4);
    for (const [x, z] of [
      [12.56, -0.11],
      [0.05, 12.22],
    ]) {
      expect(poles.some((s) => Math.hypot(centre(s)[0] - x!, centre(s)[2] - z!) < 0.3), `tent ${x}, ${z}`).toBe(true);
    }
    const queue = bbox(solids["second.queue"]!);
    const qc = st([(queue.lo[0]! + queue.hi[0]!) / 2, 0, (queue.lo[2]! + queue.hi[2]!) / 2]);
    expect(Math.hypot(qc[0] - 8.52, qc[1] + 7.29)).toBeLessThan(0.3);
    expect(solids["second.tickets"]!.length).toBe(1);
    const all = byPrefix("second.");
    const reach = Math.max(...all.flatMap((s) => [Math.abs(s.lo[0]), Math.abs(s.hi[0]), Math.abs(s.lo[2]), Math.abs(s.hi[2])]));
    expect(reach).toBeLessThan(16.33);
    // Two round tents, their canvas a facet to each chord of a rim cut
    // within 3 mm of its circle (`chord.ts`) and a whole number of chords
    // to each of the decagon's sides; one queue's tent of 2.
    const chords = circleSegments(3.7, SAG.eye, { multiple: 10 });
    const canvas = solids["second.tent"]!.filter((s) => s.pts.length === 3);
    expect(canvas.length).toBe(2 * chords);
    // Still a post at each of the decagon's corners [sourced drawing]: ten
    // to a tent, up to the eave.
    const tentPosts = solids["second.tent"]!.filter((s) => s.pts.length === 4 && Math.abs(s.hi[1] - floor - 2.2) < 1e-6);
    expect(tentPosts.length).toBe(20);
    expect(solids["second.queue"]!.filter((s) => s.depth < 0.05).length).toBe(2);
  });

  it("lets nothing else in the tower inside the inner arcade, the flights or the 2nd floor's massing", () => {
    const m = 0.005;
    const report: Record<string, { count: number; first: string[] }> = {};
    for (const prefix of ["inner.", "entrance.", "second."]) report[prefix] = intrusions(byPrefix(prefix), foreign, m);
    expect(report, JSON.stringify(report)).toEqual({
      "inner.": { count: 0, first: [] },
      "entrance.": { count: 0, first: [] },
      "second.": { count: 0, first: [] },
    });
    // Nor the inner arcade and the flights, which share the Français's and
    // the Russe's centre bays, inside each other.
    const cooked = (ids: readonly string[]) => ids.flatMap((id) => polygons(geo[`probe:${id}`]!));
    expect(intrusions(byPrefix("inner."), cooked(["entranceRails", "entranceFlights"]), m).count).toBe(0);
    expect(intrusions(byPrefix("entrance."), cooked(["innerArcade", "innerArcadeCurved"]), m).count).toBe(0);
    // Controls: a reservoir sunk 0.3 into the deck, a pilaster before a
    // leg set 0.3 into the step, and a winder on a face with no notch are
    // each found.
    const tank = solids["second.tank"]![0]!;
    expect(intrusions([moved(tank, [0, -TANK_FOOT - 0.3, 0])], foreign, m).count).toBeGreaterThan(0);
    const legPilaster = solids["inner.pilaster"]!.find((s) => {
      const c = centre(s);
      return c[2] > EDGE - 5 && Math.abs(c[0] - 19.4125) < 0.01;
    })!;
    expect(intrusions([moved(legPilaster, [0, 0, -0.3])], foreign, m).count).toBeGreaterThan(0);
    const winder = solids["entrance.tread"]!.find((s) => s.hi[1] - GALLERY > 4.5 * ((TERRACE - GALLERY) / RISERS))!;
    const onFlamand = solid(
      winder.pts.map((p): V => {
        // Onto the +z face (Flamand), whose deck is not notched: turn the
        // tread's face onto +z.
        const c = centre(winder);
        return Math.abs(c[0]) > Math.abs(c[2]) ? [p[2] * Math.sign(c[0]) * -1, p[1], p[0] * Math.sign(c[0])] : [-p[0], p[1], -p[2]];
      }),
      winder.depth,
    );
    expect(intrusions([onFlamand], foreign, m).count).toBeGreaterThan(0);
  });

  it("cooks the same bits twice", async () => {
    const again = await cookProbed();
    for (const id of MINE) {
      const a = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
      const b = again[`probe:${id}`]!.attrs.point.get("P")!.data;
      expect(b.length).toBe(a.length);
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      expect(diff, id).toBe(0);
    }
    // Control: the comparator sees one coordinate moved.
    const a = geo["probe:secondFitOutCurved"]!.attrs.point.get("P")!.data;
    const c = Float32Array.from(a);
    c[7] = c[7]! + 1e-3;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) diff++;
    expect(diff).toBe(1);
  }, 120_000);
});
