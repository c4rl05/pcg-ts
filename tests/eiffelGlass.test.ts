/**
 * The Eiffel demo's glass (backlog item 17; `platforms.ts` `glazing`,
 * `summit.ts` `summitGlass`; SOURCES.md §10.11): the clear panes in the
 * 1st-floor pavilions' doors, screens and tympana, the 3rd-floor gallery's
 * croisées and Eiffel's pavilion's windows (the `glass` class), and the
 * silvered cast glass in the arcade crescents' cells (the `silvered`
 * class).
 *
 * Held against what the graph COOKS and against the sources' numbers,
 * restated rather than imported:
 *
 * - the counts, opening by opening, and the classes' triangle counts;
 * - every pane a flat convex sheet 6 mm thick, wound outward (the page
 *   draws front faces only);
 * - no other part of the tower (every class, every car) inside a pane by
 *   more than the rebate and the jitter;
 * - every screen, door, tympanum and crescent filled, between the
 *   members the fit-out lists or the plates' numbers restate, with no gap
 *   and no two panes over each other;
 * - one silvered plate to each cabochon, behind its ring, inside its
 *   crescent;
 * - the panes where the plates put them: `glazing` draws each opening's
 *   glass once, on the +z face, with the faces and stations it stands on,
 *   and the cook's copies are held to those placed by the plates' own
 *   symmetry (tests/support/eiffelFitout.ts);
 * - the croisées' ends at their posts' true reach (a chamfer's last post
 *   is turned 45 degrees) or at the mid-bay bar;
 * - two cooks agree to the bit.
 *
 * Every check that should read zero is first shown to read non-zero on a
 * deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, cook, firstGeometry } from "pcg-ts";
import { SAG, halfEllipseSegments } from "../demos/eiffel/chord.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { VAULT_SEGMENTS, fitOutSolids, glazing } from "../demos/eiffel/platforms.js";
import { type Solid, placedPrisms, worldSolids } from "./support/eiffelFitout.js";
import { summitGlass } from "../demos/eiffel/summit.js";
import { FACES, FLOORS } from "../demos/eiffel/spec.js";

type V = readonly [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V): V => sc(a, 1 / len(a));

// ------------------------------------------------------------ the numbers

/** A pane: 6 mm plate [estimated], run 2 mm into its frame [estimated]. */
const PANE = 0.006;
const REBATE = 0.002;
/** The jitter every class output carries, per axis (parts.ts `JITTER`), and an f32 ULP's worth over it. */
const JIT = 0.001 + 1e-4;

/** Column axis, half PL-I's 70.695 [sourced]. */
const EDGE = 70.695 / 2;
/** The restaurant floor [sourced PL-I]. */
const FLOOR = FLOORS.first;
/** The gallery floor, altitude 89.90 [sourced PL-XIX]; the vaults spring from the valley gutters, 6.05 over it [derived]. */
const GALLERY_Y = 89.9 - 33.5;
const SPRING = GALLERY_Y + 6.05;
/** The bay module and its half, one « entraxe » [sourced]. */
const BAY = 7.765;
const HALF_BAY = BAY / 2;
/** A pavilion: 23.295 along, its gallery front 4.2865 inside the column axis, 14.9975 deep, a 3.35 annex [sourced PL-XXX]. */
const PAV_HALF = 23.295 / 2;
const FRONT = EDGE - 4.2865;
/** The screen: posts 0.150, mullions 0.080, four leaves a half-bay, sill 0.60, transom 2.700 under a 0.200 beam, a 0.200 head beam [sourced PL-XXX Fig. 5, PL-XXIX Fig. 11]. */
const POST = 0.15;
const MULLION = 0.08;
const LEAVES = 4;
const SILL = 0.6;
const TRANSOM = 2.7;
const BEAM = 0.2;
/** Each screen's mullions over the transom as fractions of a half-bay's clear [counted: two sashes on the Bar, three on the Russe, 0.56 / 1.29 / 0.56; one on the Flamand]. */
const UPPER = { flamand: [] as number[], anglo: [0.5], russe: [0.232, 0.768] };
/** The Français' doors: 2.60 wide, springing 2.43, rising 1.12 [sourced / measured PL-XXIX Fig. 3]; a 0.85 pier either end, 0.865 between [sourced]; the wall 0.25 [estimated]. */
const DOOR = 2.6;
const DOOR_SPRING = 2.43;
const DOOR_RISE = 1.12;
const DOOR_MID = 0.865;
const WALL = 0.25;
/**
 * The glazing bars [measured PL-XXIX Figs 1, 3, 11; PL-XXX Figs 5, 17; sections
 * estimated]: bars 0.030, rails 0.050; the doors' stiles 0.050 and meeting
 * stile 0.070, a panel to 0.58, bars at 1.18 and 1.73, a transom from 2.28;
 * the fan's ring R 0.62 and its rays at 0, ±30, ±60 degrees.
 */
const BAR = 0.03;
const RAIL = 0.05;
const STILE = 0.05;
const MEETING = 0.07;
const DOOR_PANEL = 0.58;
const DOOR_BARS = [1.18, 1.73];
const DOOR_TRANSOM = 2.28;
const FAN_R = 0.62;
const FAN_RAYS = [-60, -30, 0, 30, 60];
/** The pavilion's depth and annex [sourced PL-XXX]: the void-side ends of its vaults. */
const BACK = FRONT - 14.9975;
const ANNEX = BACK + 3.35;
/**
 * The vaults and their gables [platforms.ts: valley 0.73 and crown 8.70
 * sourced; shell 0.10, plate 0.15, ribs estimated]: the half-ellipse on the
 * 7.035 between the valleys, 2.65 over the springing; the tympanum's rib
 * 0.20 inside the shell; the crescent's outer rib 0.25, its inner arc
 * R 3.3675 crowned 6.95 [sourced] under a 0.20 rib.
 */
const VALLEY = 0.73;
const VAULT_CROWN = 8.7;
const SHELL = 0.1;
const PLATE = 0.15;
const TYMPANUM_RIB = 0.2;
const VAULT_HALF = (BAY - VALLEY) / 2;
const VAULT_RISE = 2.65;
const OUTER_RIB = 0.25;
const INNER_R = 3.3675;
const INNER_CROWN = GALLERY_Y + 6.95;
const INNER_RIB = 0.2;
/**
 * The 3rd-floor gallery [sourced PL-XIV, PL-XIX]: an octagon 16.56 across
 * the flats with 10.90 straight sides, a 1.20 parapet, the 1.030 window;
 * its posts' and sash bars' half-widths 0.05 and 0.02 [estimated]. Eiffel's
 * pavilion 10.50 square [sourced], its walls 0.25 [estimated].
 */
const FLAT = 8.28;
const STRAIGHT = 5.45;
const PARAPET = 1.2;
const WINDOW = 1.03;
const FRAME = 0.05;
const SASH_BAR = 0.02;
const PAV_SIDE = 10.5;
const PAV_WALL = 0.25;

/** The Français' six doors' axes along its face. */
const doorAxes = () => [-1, 0, 1].flatMap((k) => [-1, 1].map((s) => k * BAY + (s * (DOOR_MID + DOOR)) / 2));
/** Is v within the bar of width w centred at `at`? */
const near = (v: number, at: number, w: number) => Math.abs(v - at) <= w / 2 + 1e-9;
/** Is (x, y) inside the convex ring (either winding)? */
function inPoly(ring: ReadonlyArray<readonly [number, number]>, x: number, y: number): boolean {
  let sgn = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]!;
    const [bx, by] = ring[(i + 1) % ring.length]!;
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(c) < 1e-12) continue;
    if (sgn === 0) sgn = Math.sign(c);
    else if (Math.sign(c) !== sgn) return false;
  }
  return true;
}

/** Which face each pavilion is on, by name (never by index). */
const faceOf = (name: (typeof FACES)[number]["pavilion"]) => FACES.find((f) => f.pavilion === name)!;
const FLAMAND = faceOf("Restaurant flamand");
const ANGLO = faceOf("Bar anglo-américain");
const FRANCAIS = faceOf("Restaurant français");
const RUSSE = faceOf("Restaurant russe");

/** A world point in a face's frame: a along the face, y up, r out along its normal. */
function toFace(p: V, f: (typeof FACES)[number]): V {
  const [nx, nz] = f.normal;
  return [p[0] * nz - p[2] * nx, p[1], p[0] * nx + p[2] * nz];
}

/** A convex outline in a face's plane, (a, y). */
type Ring = ReadonlyArray<readonly [number, number]>;

/** The rectangle a0..a1 by y0..y1. */
const rectRing = (a0: number, a1: number, y0: number, y1: number): Ring => [
  [a0, y0],
  [a1, y0],
  [a1, y1],
  [a0, y1],
];

/** Distance from (x, y) to the ring's boundary. */
function edgeDistance(ring: Ring, x: number, y: number): number {
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]!;
    const [bx, by] = ring[(i + 1) % ring.length]!;
    const ex = bx - ax;
    const ey = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * ex, y - ay - t * ey));
  }
  return d;
}

/**
 * Over `regions` (convex rings), sampled every `step`, 3 mm clear of their
 * edges: how many samples neither a pane nor a member covers (to within
 * `tol`), how many two panes cover (inside both by more than a micron),
 * and how many any pane covers.
 */
function coverage(regions: readonly Ring[], panes: readonly Ring[], members: readonly Ring[], step = 0.01, tol = 5e-4) {
  const box = (r: Ring) => {
    const xs = r.map((q) => q[0]);
    const ys = r.map((q) => q[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] as const;
  };
  const rb = regions.map(box);
  const [x0, x1, y0, y1] = [Math.min(...rb.map((b) => b[0])), Math.max(...rb.map((b) => b[1])), Math.min(...rb.map((b) => b[2])), Math.max(...rb.map((b) => b[3]))];
  const near = (list: readonly Ring[]) =>
    list.map((r) => ({ r, b: box(r) })).filter(({ b }) => b[1] >= x0 - 0.01 && b[0] <= x1 + 0.01 && b[3] >= y0 - 0.01 && b[2] <= y1 + 0.01);
  const P = near(panes);
  const M = near(members);
  let gaps = 0;
  let doubled = 0;
  let covered = 0;
  const first: string[] = [];
  for (let x = x0 + step / 2; x < x1; x += step) {
    for (let y = y0 + step / 2; y < y1; y += step) {
      if (!regions.some((r) => inPoly(r, x, y) && edgeDistance(r, x, y) > 0.003)) continue;
      const within = (e: { r: Ring; b: readonly [number, number, number, number] }, m: number) =>
        x >= e.b[0] - m && x <= e.b[1] + m && y >= e.b[2] - m && y <= e.b[3] + m;
      let inside = 0;
      for (const e of P) if (within(e, 0) && inPoly(e.r, x, y) && edgeDistance(e.r, x, y) > 1e-6) inside++;
      if (inside > 1) doubled++;
      if (inside > 0) {
        covered++;
        continue;
      }
      let hit = false;
      for (const e of [...P, ...M]) {
        if (!within(e, tol)) continue;
        if (inPoly(e.r, x, y) || edgeDistance(e.r, x, y) <= tol) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        gaps++;
        if (first.length < 3) first.push(`${x.toFixed(3)},${y.toFixed(3)}`);
      }
    }
  }
  return { gaps, doubled, covered, first };
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
    const n = Math.min(80, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a))) / step));
    for (let u = 1; u < n; u++) {
      for (let v = 1; u + v < n; v++) out.push(add(a, add(sc(sub(b, a), u / n), sc(sub(c, a), v / n))));
    }
  }
  return out;
}

/** The face a point is on: the one whose normal it lies furthest along. */
function faceAt(p: V): (typeof FACES)[number] {
  return FACES.reduce((a, b) => (toFace(p, b)[2] > toFace(p, a)[2] ? b : a));
}

// ------------------------------------------------------------ sheets

interface Sheet {
  /** The outline, world. */
  readonly pts: readonly V[];
  readonly n: V;
  readonly depth: number;
}

/** A listed prism or slab as a sheet: its outline's right-hand normal and its depth. */
function sheetOf(outline: readonly V[], depth: number): Sheet {
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
  return { pts: outline, n: unit([nx, ny, nz]), depth };
}

/** A slab's (extruded up) outline: its footprint; as a vertical sheet it is thin across and tall. */
function slabExtent(outline: readonly V[], depth: number): { lo: V; hi: V } {
  const all = [...outline, ...outline.map((p) => add(p, [0, depth, 0]))];
  return {
    lo: [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]!))) as unknown as V,
    hi: [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k]!))) as unknown as V,
  };
}

/** Is the planar polygon convex (every turn the same way about its normal)? */
function convex(pts: readonly V[], n: V): boolean {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const c = pts[(i + 2) % pts.length]!;
    const t = dot(cross(sub(b, a), sub(c, b)), n);
    if (Math.abs(t) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(t);
    else if (Math.sign(t) !== sign) return false;
  }
  return true;
}

/** Whether a fan from the first point covers the outline with no triangle turned against `n` (its winding's). */
function fansFromFirst(pts: readonly V[], n: V): boolean {
  for (let i = 1; i + 1 < pts.length; i++) {
    if (dot(cross(sub(pts[i]!, pts[0]!), sub(pts[i + 1]!, pts[0]!)), n) < -1e-12) return false;
  }
  return true;
}

// ------------------------------------------------------------ the cook

let geo: Record<string, Geometry>;
/** `glazing`'s drawings, placed: every pane in the world, in the cook's order. */
let listed: { glass: Solid[]; silvered: Solid[]; plates: Solid[]; count: Record<string, number> };
let top: ReturnType<typeof summitGlass>;
/** The cabochons' centres, as cooked. */
let cabochons: V[];

beforeAll(async () => {
  const { outputs } = await cook(buildEiffel(1889));
  geo = {};
  for (const [k, v] of Object.entries(outputs)) {
    const g = firstGeometry(v as never);
    if (g !== undefined && g !== null) geo[k] = g;
  }
  const cab = outputs["fittings.cabochons"] as unknown as Array<{ batches: Array<{ count: number; transforms: Float32Array }> }>;
  cabochons = cab.flatMap((it) =>
    it.batches.flatMap((b) => Array.from({ length: b.count }, (_, k): V => [b.transforms[16 * k + 12]!, b.transforms[16 * k + 13]!, b.transforms[16 * k + 14]!])),
  );
  const drawn = glazing();
  listed = {
    glass: placedPrisms(drawn.glass),
    silvered: placedPrisms(drawn.silvered),
    plates: placedPrisms(drawn.plates),
    count: drawn.count,
  };
  top = summitGlass();
}, 240_000);

/** A mesh's polygons, as point lists. */
function polygons(g: Geometry): V[][] {
  const P = g.attrs.point.get("P")!.data;
  const out: V[][] = [];
  for (let p = 0; p < g.primVertexStart.length; p++) {
    const s = g.primVertexStart[p]!;
    const poly: V[] = [];
    for (let k = 0; k < g.primVertexCount[p]!; k++) {
      const j = g.vertexToPoint[s + k]!;
      poly.push([P[3 * j]!, P[3 * j + 1]!, P[3 * j + 2]!]);
    }
    out.push(poly);
  }
  return out;
}

/** Every 1st-floor clear pane in its face's frame: its outline (a, y) and the plane r its sheet is centred on. */
function facePanes(): Array<{ f: (typeof FACES)[number]; ring: Array<readonly [number, number]>; r: number }> {
  return listed.glass.map((p) => {
    const c = sc(p.outline.reduce((s, q) => add(s, q), [0, 0, 0] as V), 1 / p.outline.length);
    const f = faceAt(c);
    const pts = p.outline.map((q) => toFace(q, f));
    return { f, ring: pts.map((q) => [q[0], q[1]] as const), r: pts[0]![2] - PANE / 2 };
  });
}

/** Every listed pane of a class as a sheet (the summit's slabs extrude up; the platforms' prisms along their normal). */
function sheets(cls: "glass" | "silvered"): Sheet[] {
  if (cls === "silvered") return listed.silvered.map((p) => sheetOf(p.outline, p.depth));
  return listed.glass.map((p) => sheetOf(p.outline, p.depth));
}

describe("eiffel glass", () => {
  it("cooks the classes, every listed pane and nothing else", () => {
    expect(PART_CLASSES).toContain("glass");
    expect(PART_CLASSES).toContain("silvered");
    // A prism of an n-gon cooks as triangles: two to each of its n sides and n - 2 to each cap.
    const prims = (list: ReadonlyArray<{ outline: readonly V[] }>) => list.reduce((s, p) => s + 4 * p.outline.length - 4, 0);
    const glassPrims = prims(listed.glass) + prims(top.gallery) + prims(top.pavilion);
    expect(geo.glass!.primVertexStart.length).toBe(glassPrims);
    expect(geo.silvered!.primVertexStart.length).toBe(prims(listed.silvered));
    // Every cooked point is a listed corner (to the jitter), and back.
    const corners = (list: ReadonlyArray<{ outline: readonly V[]; depth: number }>, up: boolean) =>
      list.flatMap((p) => {
        const n = up ? ([0, 1, 0] as V) : sheetOf(p.outline, p.depth).n;
        return [...p.outline, ...p.outline.map((q) => add(q, sc(n, p.depth)))];
      });
    const listedGlass = [...corners(listed.glass, false), ...corners(top.gallery, true), ...corners(top.pavilion, true)];
    const key = (p: V) => p.map((v) => Math.round(v * 250)).join(",");
    const near = (set: Set<string>, p: V) => {
      const [x, y, z] = p.map((v) => Math.round(v * 250));
      for (const dx of [-1, 0, 1])
        for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (set.has(`${x! + dx},${y! + dy},${z! + dz}`)) return true;
      return false;
    };
    const cooked = new Set<string>();
    const P = geo.glass!.attrs.point.get("P")!.data;
    const cookedPts: V[] = [];
    for (let i = 0; i < P.length; i += 3) {
      cookedPts.push([P[i]!, P[i + 1]!, P[i + 2]!]);
      cooked.add(key([P[i]!, P[i + 1]!, P[i + 2]!]));
    }
    const listedSet = new Set(listedGlass.map(key));
    expect(cookedPts.filter((p) => !near(listedSet, p)).length).toBe(0);
    expect(listedGlass.filter((p) => !near(cooked, p)).length).toBe(0);
    // Control: a pane moved 1 cm is found missing.
    expect(listedGlass.map((p, i) => (i < 8 ? add(p, [0.01, 0, 0]) : p)).filter((p) => !near(cooked, p)).length).toBeGreaterThan(0);
  });

  it("counts the panes opening by opening", () => {
    // A ray's square end meets a slanting member: the glass past it is one
    // piece more, on every ray that has any room left there.
    const c = listed.count;
    expect(c).toMatchObject({
      // Two doors a bay, three bays [sourced PL-XXIX Fig. 3], each four
      // leaves three panes high and eight lights in the fan [counted], and
      // the glass past its five rays' ends.
      "francais.doors": 2 * 3 * (4 * 3 + 8 + 5),
      // A tympanum's post and four rays make six lights, and five ends.
      "francais.tympana": 3 * (6 + 5),
      "rear.tympana": 4 * 3 * (6 + 5),
      // Six half-bays of four leaves each, and over the transom [counted
      // PL-XXIX Fig. 11, PL-XXX Figs 5, 17]: the Bar's leaves two high
      // under two sashes two by two; the Russe's two high under three
      // sashes three high, 2 / 4 / 2 across, and its open centre half-bays'
      // fixed lights, four by three.
      "anglo.screen": 6 * (4 * 2 + 2 * 2 * 2),
      "russe.screen": 4 * (4 * 2 + (2 + 4 + 2) * 3) + 2 * 4 * 3,
      // One silvered plate to each cell: 12 a crescent, 36 crescents; and
      // the ends of the 11 rays, both ends, both sides.
      crescents: 12 * 36,
      "crescent.ends": 11 * 2 * 2 * 36,
    });
    // The Flamand's leaves two across and four high; its fanlight eight
    // across and three high, less the cells wholly outside the arch.
    expect(c["flamand.screen"]! - 6 * 4 * 2 * 4).toBeGreaterThan(6 * 8 * 2);
    expect(c["flamand.screen"]! - 6 * 4 * 2 * 4).toBeLessThanOrEqual(6 * 8 * 3);
    expect(listed.glass.length).toBe(Object.entries(c).filter(([k]) => !k.startsWith("crescent")).reduce((s, [, n]) => s + n, 0));
    expect(listed.silvered.length).toBe(c.crescents! + c["crescent.ends"]!);
    expect(listed.plates.length).toBe(c.crescents!);
    // 24 croisées, two sashes of two lights; 16 windows of two lights and 8 doors.
    expect(top.gallery.length).toBe(24 * 4);
    expect(top.pavilion.length).toBe(16 * 2 + 8);
  });

  it("makes every pane a flat convex sheet 6 mm thick", () => {
    const all = [...sheets("glass"), ...sheets("silvered")];
    for (const s of all) {
      expect(s.depth).toBeCloseTo(PANE, 9);
      for (const p of s.pts) expect(Math.abs(dot(sub(p, s.pts[0]!), s.n))).toBeLessThan(1e-9);
    }
    // Convex, but for a crescent's plates, whose inner rib's edge bows into
    // them chord by chord: those are fanned from their first point with no
    // triangle turned over, which is what the cook needs (a cap is a fan
    // from its first point).
    for (const s of sheets("glass")) expect(convex(s.pts, s.n)).toBe(true);
    const silvered = sheets("silvered");
    const bowed = silvered.filter((s) => !convex(s.pts, s.n));
    expect(bowed.length).toBeLessThanOrEqual(listed.count.crescents!);
    for (const s of bowed) expect(fansFromFirst(s.pts, s.n)).toBe(true);
    // Control: a bowed plate fanned from some other corner of it (one on
    // the inner rib) turns triangles over.
    expect(bowed.length).toBeGreaterThan(0);
    const b = bowed[0]!;
    expect(b.pts.some((_, k) => !fansFromFirst([...b.pts.slice(k), ...b.pts.slice(0, k)], b.n))).toBe(true);
    // The summit's slabs are vertical sheets: 6 mm across the wall, however tall.
    for (const s of [...top.gallery, ...top.pavilion]) {
      const o = s.outline;
      const across = Math.min(len(sub(o[1]!, o[0]!)), len(sub(o[2]!, o[1]!)));
      expect(across).toBeCloseTo(PANE, 9);
      expect(o.every((p) => Math.abs(p[1] - o[0]![1]) < 1e-12)).toBe(true);
    }
    // Control: a bent outline is not convex.
    const s0 = all[0]!;
    const bent = [...s0.pts];
    bent[1] = add(bent[1]!, sc(sub(add(bent[0]!, bent[2]!), sc(bent[1]!, 2)), 1.5));
    expect(convex(bent, s0.n)).toBe(false);
  });

  it("winds every cooked pane outward, as its front faces are the ones drawn", () => {
    // The class cooks its lists in order, each n-gon as 4n - 4 triangles:
    // the summit's (graph order), then the restaurants'.
    const lists: Array<{ outline: readonly V[]; depth: number; up: boolean }> = [
      ...top.gallery.map((p) => ({ ...p, up: true })),
      ...top.pavilion.map((p) => ({ ...p, up: true })),
      ...listed.glass.map((p) => ({ ...p, up: false })),
    ];
    const check = (g: Geometry, list: typeof lists) => {
      const tris = polygons(g);
      let at = 0;
      let inward = 0;
      let misplaced = 0;
      for (const p of list) {
        const n = p.up ? ([0, 1, 0] as V) : sheetOf(p.outline, p.depth).n;
        const corners = [...p.outline, ...p.outline.map((q) => add(q, sc(n, p.depth)))];
        const centre = sc(corners.reduce((s, q) => add(s, q), [0, 0, 0] as V), 1 / corners.length);
        const count = 4 * p.outline.length - 4;
        for (const cooked of tris.slice(at, at + count)) {
          // Each cooked corner is a listed one, jittered: judge the winding
          // on the listed corners, which a jitter cannot tilt.
          const t = cooked.map((q) => corners.find((c) => Math.max(...[0, 1, 2].map((k) => Math.abs(q[k]! - c[k]!))) <= JIT));
          if (t.some((q) => q === undefined)) {
            misplaced++;
            continue;
          }
          const [p0, p1, p2] = t as [V, V, V];
          const nt = cross(sub(p1, p0), sub(p2, p0));
          if (len(nt) < 1e-12) continue;
          const mid = sc(add(add(p0, p1), p2), 1 / 3);
          if (dot(nt, sub(mid, centre)) <= 0) inward++;
        }
        at += count;
      }
      return { inward, misplaced, left: tris.length - at };
    };
    expect(check(geo.glass!, lists)).toEqual({ inward: 0, misplaced: 0, left: 0 });
    const silvered = listed.silvered.map((p) => ({ ...p, up: false }));
    expect(check(geo.silvered!, silvered)).toEqual({ inward: 0, misplaced: 0, left: 0 });
    // Control: the list read in another order is found misplaced.
    expect(check(geo.silvered!, [...silvered].reverse()).misplaced).toBeGreaterThan(0);
  });

  it("lets no other part of the tower into a pane further than its rebate", () => {
    // Every pane as a convex solid: its faces' planes, inward, and which of
    // them are the sheet's two broad faces (a point between those is in
    // the glass; how deep is the least distance to the others).
    interface Solid {
      readonly planes: Array<{ p: V; n: V; broad: boolean }>;
      readonly lo: V;
      readonly hi: V;
      readonly label: string;
    }
    const solidOf = (outline: readonly V[], ext: V, depth: number, label: string): Solid => {
      const s = sheetOf(outline, depth);
      const up = sc(unit(ext), depth);
      const inwardCap = dot(s.n, ext) > 0 ? 1 : -1;
      const planes: Solid["planes"] = [
        { p: outline[0]!, n: sc(unit(ext), 1), broad: false },
        { p: add(outline[0]!, up), n: sc(unit(ext), -1), broad: false },
      ];
      const edges: Array<{ p: V; n: V; l: number }> = [];
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!;
        const b = outline[(i + 1) % outline.length]!;
        const n = unit(sc(cross(s.n, sub(b, a)), inwardCap * (dot(s.n, ext) > 0 ? 1 : -1)));
        edges.push({ p: a, n, l: len(sub(b, a)) });
      }
      // Orient each side plane toward the outline's centre.
      const c = sc(outline.reduce((t, q) => add(t, q), [0, 0, 0] as V), 1 / outline.length);
      for (const e of edges) planes.push({ p: e.p, n: dot(sub(c, e.p), e.n) >= 0 ? e.n : sc(e.n, -1), broad: false });
      // The thin direction: the caps for a sheet laid in its outline's plane
      // (depth 6 mm); the long sides for a slab stood up (outline 6 mm across).
      if (depth <= PANE + 1e-9) {
        planes[0]!.broad = true;
        planes[1]!.broad = true;
      } else {
        for (let i = 0; i < edges.length; i++) if (edges[i]!.l > PANE + 1e-6) planes[2 + i]!.broad = true;
      }
      const all = [...outline, ...outline.map((q) => add(q, up))];
      return {
        planes,
        lo: [0, 1, 2].map((k) => Math.min(...all.map((q) => q[k]!))) as unknown as V,
        hi: [0, 1, 2].map((k) => Math.max(...all.map((q) => q[k]!))) as unknown as V,
        label,
      };
    };
    const solids: Solid[] = [
      ...listed.glass.map((p, i) => solidOf(p.outline, sheetOf(p.outline, p.depth).n, p.depth, `glass ${i}`)),
      ...listed.silvered.map((p, i) => solidOf(p.outline, sheetOf(p.outline, p.depth).n, p.depth, `silvered ${i}`)),
      ...top.gallery.map((p, i) => solidOf(p.outline, [0, 1, 0], p.depth, `croisée ${i}`)),
      ...top.pavilion.map((p, i) => solidOf(p.outline, [0, 1, 0], p.depth, `pavilion ${i}`)),
    ];
    /** How deep x lies in the pane, in its plane; -1 outside it. */
    const depthIn = (x: V, s: Solid): number => {
      let d = Infinity;
      for (const pl of s.planes) {
        const h = dot(sub(x, pl.p), pl.n);
        if (h < -1e-9) return -1;
        if (!pl.broad) d = Math.min(d, h);
      }
      return d;
    };
    // Bucket the panes by metre.
    const cell = (v: number) => Math.floor(v);
    const buckets = new Map<string, Solid[]>();
    for (const s of solids) {
      for (let x = cell(s.lo[0]); x <= cell(s.hi[0]); x++)
        for (let y = cell(s.lo[1]); y <= cell(s.hi[1]); y++)
          for (let z = cell(s.lo[2]); z <= cell(s.hi[2]); z++) {
            const k = `${x},${y},${z}`;
            buckets.set(k, [...(buckets.get(k) ?? []), s]);
          }
    }
    const scan = (list: Solid[], polys: readonly (readonly V[])[]) => {
      let worst = { depth: 0, label: "", at: [0, 0, 0] as V };
      for (const poly of polys) {
        const lo = [0, 1, 2].map((k) => Math.min(...poly.map((q) => q[k]!)));
        const hi = [0, 1, 2].map((k) => Math.max(...poly.map((q) => q[k]!)));
        const near = new Set<Solid>();
        for (let x = cell(lo[0]!); x <= cell(hi[0]!); x++)
          for (let y = cell(lo[1]!); y <= cell(hi[1]!); y++)
            for (let z = cell(lo[2]!); z <= cell(hi[2]!); z++)
              for (const s of buckets.get(`${x},${y},${z}`) ?? []) if (list.includes(s)) near.add(s);
        const hits = [...near].filter((s) => [0, 1, 2].every((k) => hi[k]! >= s.lo[k]! && lo[k]! <= s.hi[k]!));
        if (hits.length === 0) continue;
        for (const x of samples(poly, 0.004)) {
          for (const s of hits) {
            const d = depthIn(x, s);
            if (d > worst.depth) worst = { depth: d, label: s.label, at: x };
          }
        }
      }
      return worst;
    };
    const foreign: V[][] = [];
    for (const [k, g] of Object.entries(geo)) {
      if (k === "glass" || k === "silvered" || k.startsWith("cloth.")) continue;
      if (!(PART_CLASSES as readonly string[]).includes(k) && !k.startsWith("car.")) continue;
      for (const poly of polygons(g)) foreign.push(poly);
    }
    // The rebate, and the jitter the foreign class carries (the listed
    // panes carry none), per axis in the plane.
    const worst = scan(solids, foreign);
    expect(worst.depth, `${worst.label} at ${worst.at.map((v) => v.toFixed(3))}`).toBeLessThan(REBATE + JIT * Math.SQRT2 + 1e-4);
    // Control: a croisée pane pushed 2 cm along its side into its post is found.
    const pushed = top.gallery.slice(0, 1).map((p) => {
      const o = p.outline;
      const along = unit(len(sub(o[1]!, o[0]!)) > len(sub(o[2]!, o[1]!)) ? sub(o[1]!, o[0]!) : sub(o[2]!, o[1]!));
      return solidOf(o.map((q) => add(q, sc(along, 0.02))), [0, 1, 0], p.depth, "pushed");
    });
    const pushedBack = top.gallery.slice(0, 1).map((p) => {
      const o = p.outline;
      const along = unit(len(sub(o[1]!, o[0]!)) > len(sub(o[2]!, o[1]!)) ? sub(o[1]!, o[0]!) : sub(o[2]!, o[1]!));
      return solidOf(o.map((q) => add(q, sc(along, -0.02))), [0, 1, 0], p.depth, "pushed back");
    });
    const moved = [...pushed, ...pushedBack];
    for (const s of moved) {
      for (let x = cell(s.lo[0]); x <= cell(s.hi[0]); x++)
        for (let y = cell(s.lo[1]); y <= cell(s.hi[1]); y++)
          for (let z = cell(s.lo[2]); z <= cell(s.hi[2]); z++) {
            const k = `${x},${y},${z}`;
            buckets.set(k, [...(buckets.get(k) ?? []), s]);
          }
    }
    expect(scan(moved, foreign).depth).toBeGreaterThan(0.015);
  }, 240_000);

  it("fills every opening, no gap and no light over another: the screens and the doors", () => {
    const panes = facePanes();
    const rScreen = FRONT - POST / 2;
    const rDoor = FRONT - WALL / 2;
    // The members the lights meet, from the fit-out's list: those standing
    // across the pane's plane, drawn onto it.
    const solids = worldSolids(fitOutSolids());
    const membersOn = (f: (typeof FACES)[number], r: number, keys: readonly string[]): Ring[] =>
      keys
        .flatMap((k) => solids[k] ?? [])
        .filter((s) => {
          const c = sc(s.outline.reduce((t, q) => add(t, q), [0, 0, 0] as V), 1 / s.outline.length);
          if (faceAt(c) !== f) return false;
          const n = sheetOf(s.outline, s.depth).n;
          const rn = toFace(n, f)[2];
          if (Math.abs(Math.abs(rn) - 1) > 1e-6) return false;
          const r0 = toFace(s.outline[0]!, f)[2];
          const r1 = r0 + rn * s.depth;
          return Math.min(r0, r1) <= r + 1e-9 && Math.max(r0, r1) >= r - 1e-9;
        })
        .map((s) => s.outline.map((q) => {
          const p = toFace(q, f);
          return [p[0], p[1]] as const;
        }));
    const screenKeys = ["pavilion.post", "pavilion.beam", "pavilion.sash", "flamand.glazing", "flamand.boarding", "anglo.glazing", "anglo.boarding", "russe.glazing", "russe.boarding"];
    const stations = [-3, -2, -1, 0, 1, 2, 3].map((i) => (Math.abs(i) === 3 ? Math.sign(i) * (PAV_HALF - POST / 2) : i * HALF_BAY));
    let checked = 0;
    for (const f of [FLAMAND, ANGLO, RUSSE]) {
      const mine = panes.filter((p) => p.f === f && Math.abs(p.r - rScreen) < 1e-6).map((p) => p.ring);
      const members = membersOn(f, rScreen, screenKeys);
      for (let j = 0; j < 6; j++) {
        const a0 = stations[j]! + POST / 2;
        const a1 = stations[j + 1]! - POST / 2;
        const open = f === RUSSE && (j === 2 || j === 3);
        // Over the sill to the transom (not on the Russe's open centre), and over its beam to the head beam.
        const regions: Ring[] = [rectRing(a0, a1, FLOOR + TRANSOM + BEAM, SPRING - BEAM)];
        if (!open) regions.push(rectRing(a0, a1, FLOOR + SILL, FLOOR + TRANSOM));
        const cov = coverage(regions, mine, members);
        expect(cov, `${f.pavilion} half-bay ${j} ${cov.first.join(" ")}`).toMatchObject({ gaps: 0, doubled: 0 });
        if (open) expect(coverage([rectRing(a0, a1, FLOOR + SILL, FLOOR + TRANSOM)], mine, []).covered, `${f.pavilion} ${j} open`).toBe(0);
        checked++;
      }
    }
    expect(checked).toBe(18);
    // The Français' doors: the panel to the head.
    const doorPanes = panes.filter((p) => p.f === FRANCAIS && Math.abs(p.r - rDoor) < 1e-6).map((p) => p.ring);
    const doorMembers = membersOn(FRANCAIS, rDoor, ["francais.doorFrame", "francais.doorFan"]);
    // The head in as many chords as keep the archivolt round it within
    // 5 mm (`chord.ts`; the archivolt 0.25 wide), the head's own.
    const headChords = halfEllipseSegments(DOOR / 2 + 0.25, DOOR_RISE + 0.25, SAG.near);
    const doorRegion = (a: number): Ring[] => {
      const head: Array<readonly [number, number]> = [];
      for (let i = 0; i <= headChords; i++) {
        const phi = Math.PI * (1 - i / headChords);
        head.push([a + (DOOR / 2) * Math.cos(phi), FLOOR + DOOR_SPRING + DOOR_RISE * Math.sin(phi)]);
      }
      return [rectRing(a - DOOR / 2, a + DOOR / 2, FLOOR, FLOOR + DOOR_SPRING), head];
    };
    for (const a of doorAxes()) {
      expect(coverage(doorRegion(a), doorPanes, doorMembers), `door at ${a}`).toMatchObject({ gaps: 0, doubled: 0 });
    }
    // Controls: a door's largest pane dropped leaves a gap, and one listed
    // twice is found; and without the small pieces past the rays' square
    // ends the fan shows gaps where they meet the head.
    const a = doorAxes()[0]!;
    const area = (r: Ring) => Math.abs(r.reduce((t, q, i) => t + q[0] * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * q[1], 0)) / 2;
    const inDoor = doorPanes.filter((p) => Math.abs(p.reduce((t, q) => t + q[0], 0) / p.length - a) < DOOR / 2);
    const biggest = inDoor.reduce((x, y) => (area(y) > area(x) ? y : x));
    expect(coverage(doorRegion(a), doorPanes.filter((p) => p !== biggest), doorMembers).gaps).toBeGreaterThan(0);
    expect(coverage(doorRegion(a), [...doorPanes, biggest], doorMembers).doubled).toBeGreaterThan(0);
    expect(coverage(doorRegion(a), doorPanes.filter((p) => area(p) > 0.003), doorMembers, 0.002).gaps).toBeGreaterThan(0);
  });

  it("fills the tympana and the crescents, no gap and no light over another", () => {
    const half = VAULT_HALF;
    const rise = VAULT_RISE;
    // A vault's arc over bay centre c, shrunk by `inset`, as `vaultArc`
    // builds it: N chords, S to each of the crescent's 12 cells, so cell
    // boundary k (a ray's foot) is point k S.
    const N = VAULT_SEGMENTS;
    const S = N / 12;
    const arc = (c: number, inset: number) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const phi = Math.PI * (1 - i / N);
        return [c + (half - inset) * Math.cos(phi), SPRING + (rise - inset) * Math.sin(phi)] as const;
      });
    const bar = (p: readonly [number, number], q: readonly [number, number], w: number): Ring => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const n = [(-(q[1] - p[1]) / l) * (w / 2), ((q[0] - p[0]) / l) * (w / 2)] as const;
      return [
        [p[0] + n[0], p[1] + n[1]],
        [q[0] + n[0], q[1] + n[1]],
        [q[0] - n[0], q[1] - n[1]],
        [p[0] - n[0], p[1] - n[1]],
      ];
    };
    // The tympana: under the rib, over the sill, the post and four rays from the hub.
    const panes = facePanes();
    const tympanum = (c: number, r: number, f: (typeof FACES)[number], list = panes) => {
      const rib = arc(c, SHELL + TYMPANUM_RIB);
      const mine = list.filter((p) => p.f === f && Math.abs(p.r - r) < 1e-6).map((p) => p.ring);
      const span = half - SHELL;
      const members: Ring[] = [
        rectRing(c - span, c + span, SPRING, SPRING + TYMPANUM_RIB),
        ...[2, 4, 6, 8, 10].map((i) => bar([c, SPRING], rib[i * S]!, i === 6 ? OUTER_RIB : 0.1)),
      ];
      return coverage([rib], mine, members);
    };
    for (const k of [-1, 0, 1]) {
      expect(tympanum(k * BAY, FRONT - PLATE / 2, FRANCAIS), `français ${k}`).toMatchObject({ gaps: 0, doubled: 0 });
      for (const f of FACES) {
        expect(tympanum(k * BAY, (k === 0 ? BACK : ANNEX) + PLATE / 2, f), `${f.pavilion} rear ${k}`).toMatchObject({ gaps: 0, doubled: 0 });
      }
    }
    // The crescents on one face (the others are the same turned): between
    // the ribs, the rays and the sills at the feet.
    const plates = listed.silvered.map((p) => {
      const c = sc(p.outline.reduce((s, q) => add(s, q), [0, 0, 0] as V), 1 / p.outline.length);
      const f = faceAt(c);
      return { f, ring: p.outline.map((q) => [toFace(q, f)[0], toFace(q, f)[1]] as const) };
    });
    const cy = INNER_CROWN - INNER_R;
    const crescent = (c: number, list = plates) => {
      const outer = arc(c, OUTER_RIB);
      const R = INNER_R + INNER_RIB;
      const psi0 = Math.asin((SPRING - cy) / R);
      const inner = Array.from({ length: N + 1 }, (_, i) => {
        const psi = Math.PI - psi0 - ((Math.PI - 2 * psi0) * i) / N;
        return [c + R * Math.cos(psi), cy + R * Math.sin(psi)] as const;
      });
      // Cell k between the ribs' edges, chord by chord on both.
      const cells: Ring[] = Array.from({ length: 12 }, (_, k) => [
        ...outer.slice(k * S, (k + 1) * S + 1),
        ...inner.slice(k * S, (k + 1) * S + 1).reverse(),
      ]);
      const members: Ring[] = [
        ...Array.from({ length: 11 }, (_, i) => bar(inner[(i + 1) * S]!, outer[(i + 1) * S]!, 0.1)),
        // The sills, 0.10 tall [estimated], from the outer rib's foot to
        // the inner rib's edge at the sill's top: on the chord of it that
        // reaches that height, from the foot.
        ...[
          [0, 1],
          [N, -1],
        ].map(([foot, step]) => {
          let i = foot!;
          while (inner[i + step!]![1] < SPRING + 0.1) i += step!;
          const [p, q] = [inner[i]!, inner[i + step!]!];
          const x = p[0] + ((q[0] - p[0]) * (SPRING + 0.1 - p[1])) / (q[1] - p[1]);
          return rectRing(Math.min(outer[foot!]![0], x), Math.max(outer[foot!]![0], x), SPRING, SPRING + 0.1);
        }),
      ];
      const mine = list.filter((p) => p.f === FLAMAND && Math.abs(p.ring.reduce((s, q) => s + q[0], 0) / p.ring.length - c) < BAY / 2).map((p) => p.ring);
      return coverage(cells, mine, members);
    };
    for (let k = -4; k <= 4; k++) expect(crescent(k * BAY), `crescent ${k} ${crescent(k * BAY).first.join(" ")}`).toMatchObject({ gaps: 0, doubled: 0 });
    // Controls: a tympanum's largest light dropped leaves a gap; and without
    // the small pieces past the rays' square ends, the tympana and the
    // crescents show gaps where they meet the ribs.
    const area = (r: Ring) => Math.abs(r.reduce((t, q, i) => t + q[0] * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * q[1], 0)) / 2;
    const r0 = FRONT - PLATE / 2;
    const onFront = panes.filter((p) => p.f === FRANCAIS && Math.abs(p.r - r0) < 1e-6 && Math.abs(p.ring[0]![0]) < BAY / 2);
    const big = onFront.reduce((x, y) => (area(y.ring) > area(x.ring) ? y : x));
    expect(tympanum(0, r0, FRANCAIS, panes.filter((p) => p !== big)).gaps).toBeGreaterThan(0);
    expect(tympanum(0, r0, FRANCAIS, panes.filter((p) => area(p.ring) > 0.003)).gaps).toBeGreaterThan(0);
    expect(crescent(0, plates.filter((p) => area(p.ring) > 0.003)).gaps).toBeGreaterThan(0);
  });

  it("sets one silvered plate behind each cabochon, in its cell", () => {
    // The cells' plates (the rays' end plates are the rest).
    const plates = listed.plates.map((p) => {
      const c = sc(p.outline.reduce((s, q) => add(s, q), [0, 0, 0] as V), 1 / p.outline.length);
      const f = faceAt(c);
      const pts = p.outline.map((q) => toFace(q, f));
      return { f, ring: pts.map((q) => [q[0], q[1]] as const), r: pts[0]![2] - PANE / 2 };
    });
    // Every silvered plate in the gable's plane, 0.01 behind its face, so
    // behind the rings standing 0.03 proud of it.
    for (const p of listed.silvered) {
      const f = faceAt(p.outline[0]!);
      expect(toFace(p.outline[0]!, f)[2] - PANE / 2).toBeCloseTo(EDGE - 0.01, 9);
    }
    // Inside the crescent: under the outer rib, over the inner, over the sills.
    let outside = 0;
    const cy = INNER_CROWN - INNER_R;
    const R = INNER_R + INNER_RIB - REBATE;
    const step = (Math.PI - 2 * Math.asin((SPRING - cy) / R)) / VAULT_SEGMENTS;
    const outsideOf = (list: typeof plates) => {
      let n = 0;
      for (const p of list) {
        for (const [x, y] of p.ring) {
          const u = x - Math.round(x / BAY) * BAY;
          const e = (u / (VAULT_HALF - OUTER_RIB + REBATE)) ** 2 + ((y - SPRING) / (VAULT_RISE - OUTER_RIB + REBATE)) ** 2;
          // The inner rib is faceted, VAULT_SEGMENTS chords from foot to
          // foot, so its edge comes as close to the centre as a chord's middle.
          if (e > 1 + 1e-9 || Math.hypot(u, y - cy) < R * Math.cos(step / 2) - 1e-9 || y < SPRING + 0.1 - REBATE - 1e-9) n++;
        }
      }
      return n;
    };
    outside = outsideOf(plates);
    expect(outside).toBe(0);
    // Control: a plate moved 0.3 up leaves the crescent.
    expect(outsideOf(plates.map((p, i) => (i === 5 ? { ...p, ring: p.ring.map(([x, y]) => [x, y + 0.3] as const) } : p)))).toBeGreaterThan(0);
    const count = (list: readonly V[]) =>
      plates.map((p) => list.filter((c) => faceAt(c) === p.f && inPoly(p.ring, toFace(c, p.f)[0], toFace(c, p.f)[1])).length);
    const per = count(cabochons);
    expect(cabochons.length).toBe(432);
    expect(per.every((n) => n === 1)).toBe(true);
    // Control: a cabochon moved into the next cell leaves one plate with two.
    const moved = cabochons.map((c, i) => (i === 0 ? add(c, [0, -1.2, 0]) : c));
    expect(count(moved).some((n) => n !== 1)).toBe(true);
  });

  it("glazes the croisées on the glass line to their posts and bars, and the pavilion in its walls' middle", () => {
    const sill = FLOORS.third + PARAPET;
    const head = sill + WINDOW;
    // The octagon: 16.56 across the flats, 10.90 straight sides; its sides
    // in order from (F, -S) as `octagon` gives them.
    const oct: V[] = [
      [FLAT, 0, -STRAIGHT],
      [FLAT, 0, STRAIGHT],
      [STRAIGHT, 0, FLAT],
      [-STRAIGHT, 0, FLAT],
      [-FLAT, 0, STRAIGHT],
      [-FLAT, 0, -STRAIGHT],
      [-STRAIGHT, 0, -FLAT],
      [STRAIGHT, 0, -FLAT],
    ];
    // The posts: along a straight side 0 (a vertex), 0.70, 2.95, 5.45, 7.95,
    // 10.20; a chamfer's at its vertex and its middle; each square to its
    // own side, `FRAME` a half-width.
    const posts: Array<{ at: V; dir: V }> = [];
    for (let i = 0; i < 8; i++) {
      const a = oct[i]!;
      const b = oct[(i + 1) % 8]!;
      const dir = unit(sub(b, a));
      const L = len(sub(b, a));
      const us = i % 2 === 0 ? [0, 0.7, 2.95, 5.45, 7.95, 10.2] : [0, L / 2];
      for (const u of us) posts.push({ at: add(a, sc(dir, u)), dir });
    }
    const edgeErrors = (list: typeof top.gallery) => {
      let bad = 0;
      for (const s of list) {
        const { lo, hi } = slabExtent(s.outline, s.depth);
        if (lo[1] < sill + FRAME - REBATE - 1e-9 || hi[1] > head + REBATE + 1e-9) bad++;
        // Which side: the one whose line the pane's middle lies on.
        const m: V = [(lo[0] + hi[0]) / 2, 0, (lo[2] + hi[2]) / 2];
        const i = oct.findIndex((a, k) => {
          const b = oct[(k + 1) % 8]!;
          const d = unit(sub(b, a));
          const off = sub(m, a);
          const along = dot(off, d);
          return Math.abs(len(sub(off, sc(d, along)))) < 1e-6 && along > 0 && along < len(sub(b, a));
        });
        if (i < 0) {
          bad++;
          continue;
        }
        const a = oct[i]!;
        const d = unit(sub(oct[(i + 1) % 8]!, a));
        // Each end: 2 mm into a post (its reach along this side, turned or
        // not) or into the bay's middle bar (half-width 0.02).
        const us = s.outline.map((q) => dot(sub([q[0], 0, q[2]], a), d));
        for (const u of [Math.min(...us), Math.max(...us)]) {
          const ok =
            posts.some((p) => {
              const reach = FRAME * (Math.abs(dot(p.dir, d)) + Math.abs(len(cross(p.dir, d))));
              const pu = dot(sub(p.at, a), d);
              const off = len(sub(sub(p.at, a), sc(d, pu)));
              return off < 1e-6 && Math.abs(Math.abs(u - pu) - (reach - REBATE)) < 1e-6;
            }) ||
            // The mid-bay bar: halfway between the two posts either side.
            (() => {
              const on = posts
                .filter((p) => len(sub(sub(p.at, a), sc(d, dot(sub(p.at, a), d)))) < 1e-6)
                .map((p) => dot(sub(p.at, a), d))
                .sort((x, y) => x - y);
              for (let k = 0; k + 1 < on.length; k++) {
                const mid = (on[k]! + on[k + 1]!) / 2;
                if (Math.abs(Math.abs(u - mid) - (SASH_BAR - REBATE)) < 1e-6) return true;
              }
              return false;
            })();
          if (!ok) bad++;
        }
      }
      return bad;
    };
    expect(edgeErrors(top.gallery)).toBe(0);
    // Control: the chamfers' last panes as they were first built, stopping at
    // `FRAME` from their vertex post (which is turned 45 degrees and reaches
    // FRAME √2 along the chamfer), are found.
    const shortened = top.gallery.map((s) => ({ ...s, outline: s.outline.map((q) => add(q, [0.001, 0, 0])) }));
    expect(edgeErrors(shortened)).toBeGreaterThan(0);
    for (const s of top.pavilion) {
      const { lo, hi } = slabExtent(s.outline, s.depth);
      const m = sc(add(lo, hi), 0.5);
      expect(Math.max(Math.abs(m[0]), Math.abs(m[2]))).toBeCloseTo(PAV_SIDE / 2 - PAV_WALL / 2, 9);
    }
  });

  it("agrees with itself across two cooks, to the bit", async () => {
    const again = await cook(buildEiffel(1889));
    for (const k of ["glass", "silvered"]) {
      const a = geo[k]!.attrs.point.get("P")!.data;
      const b = firstGeometry(again.outputs[k] as never)!.attrs.point.get("P")!.data;
      expect(b.length).toBe(a.length);
      const bits = (x: ArrayLike<number>) => Array.from(new Uint32Array(Float32Array.from(x).buffer));
      expect(bits(b)).toEqual(bits(a));
    }
  }, 240_000);
});
