/**
 * The top of the Eiffel demo, room by room (`demos/eiffel/summit.ts`,
 * SOURCES.md §29), each against its source:
 *
 * - THE GALLERY round the 3rd floor: 24 croisées anglaises (the cost
 *   table's 24 x 250 fr = 6 000 fr), four bays a straight side at PL-XIV's
 *   stations and two a chamfer, a solid 1.20 parapet, the 1.030 window and
 *   the 0.200 sablière under the balcony's deck.
 * - EIFFEL'S PAVILION, 10.50 square and 2.27 tall, with the text's rooms
 *   (salon, cabinet de toilette, cuisine, water-closet, four laboratories,
 *   the lift's cage) on PL-XIX Fig. 6's plan, 16 windows and 8 doors, and
 *   the 10.680 roof on the girders' foot.
 * - THE FOUR CONTREFICHES under the girders' ends, 600 x 762.
 * - THE ARCHES, 1.300 radially (7.435 / 6.135) and in the girders' webs.
 * - THE LANTERN: the 0.80 decagon, the Ø 2.686 cupola, the Ø 1.70 platform
 *   with its 1.20 railing and 3.05 socket, the rod 10.790 seated in its
 *   1.000 tripod to PL-I's tip; the stair core to the lantern's floor, and the spiral stair's
 *   room round it left empty.
 * - NOTHING INTERPENETRATES: no surface of the girders, the contrefiches,
 *   the uprights, the dome, the lantern or the Edoux (its car at its top
 *   stop, its cables and pulleys) lies inside any room's solid.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { quadrants } from "../demos/eiffel/lattice.js";
import { LIFT_CARS, buildLifts } from "../demos/eiffel/lifts.js";
import {
  CONTREFICHE,
  PAVILION,
  ROD,
  STAIR_ENVELOPE,
  type Slab,
  balconyDeckSlabs,
  buildSummit,
  galleryLayout,
  lanternLevels,
  pavilionPlan,
  pavilionSolids,
} from "../demos/eiffel/summit.js";
import { FLOORS } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

// ------------------------------------------------------------ the numbers

/** The 3rd floor, 309.63 [sourced]; the apartment's floor, 312.21 [sourced PL-XIX Fig. 3]. */
const APARTMENT_FLOOR = FLOORS.third + 2.58;
/** The pavilion: 10.50 square [sourced E1900-TXT p. 216], 2.27 tall [sourced], its roof 10.680 [sourced PL-XIX Fig. 5]. */
const PAVILION_SIDE = 10.5;
const PAVILION_HEIGHT = 2.27;
const ROOF_SIDE = 10.68;
/** The gallery's parapet, window and sablière [sourced PL-XIV Fig. 7]. */
const PARAPET = 1.2;
const WINDOW = 1.03;
/** The croisées [sourced cost table: 24 x 250 = 6 000 fr]. */
const CROISEES = 24;
/** The arches: extrados 7.435, "largeur 1,300" radially [sourced p. 79, PL-XV Fig. 2 "6.135"]. */
const EXTRADOS = 7.435;
const INTRADOS = 6.135;
/** The lantern: decagon side 0.80, cupola Ø 2.686 [sourced p. 79]; the platform Ø 1.70 [sourced p. 80]. */
const DECAGON_SIDE = 0.8;
const CUPOLA = 2.686;
const PLATFORM = 1.7;
/** The chain [sourced PL-XV Fig. 1]: lantern floor 329.020, sablières 330.695 / 331.835, platform 334.015. */
const cote = (c: number) => c - 33.5;
/** The rod: 10.790 [sourced p. 80, PL-XV Fig. 1, PL-XIX Fig. 4] on a 1.000 tripod [sourced PL-XV, PL-XIX, PL-VII]. */
const ROD_LENGTH = 10.79;
const TRIPOD = 1.0;
/** The socket's top, "Soutien du paratonnerre 3.05" [sourced PL-XIX Fig. 4]; the railing 1.20 [sourced p. 80]. */
const SOCKET_TOP = 3.05;
const TOP_RAILING = 1.2;

/** The room ids buildSummit gives its room solids and fittings; everything else is "structure". */
const ROOM_IDS = new Set(["pavilionFloor", "pavilionWalls", "pavilionPartitions", "pavilionRoof", "balconyDeck"]);

// ------------------------------------------------------------ geometry

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P[i]!, P[i + 1]!, P[i + 2]!]);
  return out;
}

/** Every polygon of a geometry fanned into triangles. */
function triangles(geo: Geometry): Array<[Vec3, Vec3, Vec3]> {
  const pts = points(geo);
  const out: Array<[Vec3, Vec3, Vec3]> = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    if (n < 3) continue;
    const at = (k: number) => pts[geo.vertexToPoint[start + k]!]!;
    for (let k = 1; k + 1 < n; k++) out.push([at(0), at(k), at(k + 1)]);
  }
  return out;
}

/**
 * Points on a triangle's surface about every `h` metres, where `want`
 * accepts the box: the triangle is split in four at its edges' midpoints,
 * a part whose box `want` refuses is dropped, and a part no longer than
 * `h` gives its corners and centroid. A cable 80 m long costs only the
 * metres of it near what is looked for.
 */
function sampleNear(
  tri: readonly [Vec3, Vec3, Vec3],
  h: number,
  want: (lo: Vec3, hi: Vec3) => boolean,
  visit: (p: Vec3) => void,
): void {
  const [a, b, c] = tri;
  const lo = [0, 1, 2].map((k) => Math.min(a[k]!, b[k]!, c[k]!)) as unknown as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(a[k]!, b[k]!, c[k]!)) as unknown as Vec3;
  if (!want(lo, hi)) return;
  const len = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (Math.max(len(a, b), len(b, c), len(c, a)) <= h) {
    visit(a);
    visit(b);
    visit(c);
    visit([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]);
    return;
  }
  const m = (p: Vec3, q: Vec3): Vec3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  const [ab, bc, ca] = [m(a, b), m(b, c), m(c, a)];
  for (const t of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as const) sampleNear(t, h, want, visit);
}

/** Whether two boxes overlap. */
const overlaps = (lo: Vec3, hi: Vec3, blo: Vec3, bhi: Vec3) => [0, 1, 2].every((k) => hi[k]! >= blo[k]! && lo[k]! <= bhi[k]!);

/** How far a point is inside a slab (negative outside): the least of its distances to the slab's faces. */
function depthIn(p: Vec3, s: Slab): number {
  const y0 = s.outline[0]![1];
  let d = Math.min(p[1] - y0, y0 + s.depth - p[1]);
  const o = s.outline;
  for (let k = 0; k < o.length; k++) {
    const a = o[k]!;
    const b = o[(k + 1) % o.length]!;
    const ex = b[0] - a[0];
    const ez = b[2] - a[2];
    const L = Math.hypot(ex, ez);
    // Wound anticlockwise from above, which is a negative area in (x, z)'s
    // own orientation, the inside is to each edge's right there: the cross
    // product ex*(pz-az) - ez*(px-ax) is negative.
    d = Math.min(d, -(ex * (p[2] - a[2]) - ez * (p[0] - a[0])) / L);
  }
  return d;
}

/** A slab's plan bounding box and height range, for a quick reject. */
function bounds(s: Slab): { lo: Vec3; hi: Vec3 } {
  const xs = s.outline.map((p) => p[0]);
  const zs = s.outline.map((p) => p[2]);
  const y0 = s.outline[0]![1];
  return { lo: [Math.min(...xs), y0, Math.min(...zs)], hi: [Math.max(...xs), y0 + s.depth, Math.max(...zs)] };
}

/** The deepest any sample of `tris` goes into any of `solids`, and where. */
function deepest(tris: ReadonlyArray<readonly [Vec3, Vec3, Vec3]>, solids: readonly Slab[], h = 0.02): { depth: number; at?: Vec3; slab?: number } {
  const boxes = solids.map(bounds);
  let worst: { depth: number; at?: Vec3; slab?: number } = { depth: -Infinity };
  const len = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const mid = (p: Vec3, q: Vec3): Vec3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  // Split each triangle while it is longer than h, keeping at each step
  // only the solids its box still meets (by more than a millimetre).
  const walk = (t: readonly [Vec3, Vec3, Vec3], near: readonly number[]): void => {
    const [a, b, c] = t;
    const lo = [0, 1, 2].map((k) => Math.min(a[k]!, b[k]!, c[k]!)) as unknown as Vec3;
    const hi = [0, 1, 2].map((k) => Math.max(a[k]!, b[k]!, c[k]!)) as unknown as Vec3;
    // A part that only touches a solid's face cannot be a millimetre in it.
    const still = near.filter((i) => [0, 1, 2].every((k) => hi[k]! > boxes[i]!.lo[k]! + 0.001 && lo[k]! < boxes[i]!.hi[k]! - 0.001));
    if (still.length === 0) return;
    if (Math.max(len(a, b), len(b, c), len(c, a)) <= h) {
      for (const p of [a, b, c, [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3] as Vec3]) {
        for (const i of still) {
          const d = depthIn(p, solids[i]!);
          if (d > worst.depth) worst = { depth: d, at: p, slab: i };
        }
      }
      return;
    }
    // Halve the longest edge: a long thin strip (a cable, a guide post)
    // is cut across its length only, so its far parts drop out at once.
    const [lab, lbc, lca] = [len(a, b), len(b, c), len(c, a)];
    if (lab >= lbc && lab >= lca) {
      const m = mid(a, b);
      walk([a, m, c], still);
      walk([m, b, c], still);
    } else if (lbc >= lca) {
      const m = mid(b, c);
      walk([a, b, m], still);
      walk([a, m, c], still);
    } else {
      const m = mid(c, a);
      walk([a, b, m], still);
      walk([m, b, c], still);
    }
  };
  const all = boxes.map((_, i) => i);
  for (const t of tris) walk(t, all);
  return worst;
}

/** s along x = -z (toward pile 3), t along x = z (toward pile 4). */
const S = (p: Vec3) => (p[0] - p[2]) / Math.SQRT2;
const T = (p: Vec3) => (p[0] + p[2]) / Math.SQRT2;

// ------------------------------------------------------------ the cook

interface Cooked {
  rooms: Map<string, Geometry>;
  structure: Array<{ id: string; geo: Geometry; tris: Array<[Vec3, Vec3, Vec3]> }>;
  byId: (id: string) => Geometry;
}

async function cookSummit(): Promise<Cooked> {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  const parts = buildSummit(g);
  const lifts = buildLifts(g, quads);
  const names: Array<{ name: string; id: string; room: boolean }> = [];
  let n = 0;
  for (const [cls, list] of Object.entries(parts)) {
    if (cls === "rivets" || !Array.isArray(list)) continue;
    for (const h of list as NodeHandle[]) {
      const name = `s${n++}`;
      g.output(h, "out", name);
      names.push({ name, id: h.id, room: ROOM_IDS.has(h.id) });
    }
  }
  // The Edoux at the top: its pulleys, cables and heads, and the upper car
  // at its top stop (moved there below).
  for (const c of lifts.cars ?? []) {
    if (!c.name.startsWith("edoux")) continue;
    g.output(c.mesh, "out", `lift:${c.name}`);
    names.push({ name: `lift:${c.name}`, id: `lift:${c.name}`, room: false });
  }
  (lifts.machinery ?? []).forEach((m, i) => {
    g.output(m, "out", `lift:machinery${i}`);
    names.push({ name: `lift:machinery${i}`, id: `lift:machinery${i}`, room: false });
  });
  // Probes by node id, for the parts the tests read on their own.
  const probes = ["contreficheLit", "domeRibs", "ladderCylinderSkin", "lanternBaseSkin", "cupolaSkin", "topDeckSkin", "topSocketSkin", "rodSkin", "rodPoints", "rodTripod", "topBentSkin", "topRailPostSkin", "gallerySashSkin", "galleryParapet", "pavilionSashSkin", "lanternFloor"];
  for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const rooms = new Map<string, Geometry>();
  const structure: Cooked["structure"] = [];
  const top = LIFT_CARS.find((c) => c.name === "edoux.nord")!;
  const lift = top.to - top.at;
  for (const { name, id, room } of names) {
    const geo = firstGeometry(outputs[name] ?? []);
    if (geo === undefined) continue;
    // The upper car and its gear at the top stop: up by the travel left.
    const dy = id === "lift:edoux.nord" ? lift : 0;
    const tris = triangles(geo).map((t) => t.map((p) => [p[0], p[1] + dy, p[2]] as Vec3) as unknown as [Vec3, Vec3, Vec3]);
    if (room) rooms.set(id, geo);
    else structure.push({ id, geo, tris });
  }
  const byId = (id: string): Geometry => {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    return geo;
  };
  return { rooms, structure, byId };
}

describe("Eiffel summit, room by room", () => {
  let a: Cooked;
  let b: Cooked;
  beforeAll(async () => {
    a = await cookSummit();
    b = await cookSummit();
  }, 600_000);

  it("glazes the gallery as 24 croisées: four bays a straight side at PL-XIV's stations, two a chamfer", () => {
    const { bays, piers, posts } = galleryLayout();
    expect(bays).toHaveLength(CROISEES);
    // The cost table closes on 24, not on the OCR's 21.
    expect(CROISEES * 250).toBe(6000);
    expect(21 * 250).not.toBe(6000);
    const straight = bays.filter((q) => q.side % 2 === 0).map((q) => +(q.u1 - q.u0).toFixed(3));
    expect(straight.slice(0, 4)).toEqual([2.25, 2.5, 2.5, 2.25]);
    const chamfer = bays.filter((q) => q.side % 2 === 1);
    expect(chamfer).toHaveLength(8);
    for (const q of chamfer) expect(q.u1 - q.u0).toBeCloseTo(Math.SQRT2 * (8.28 - 5.45) / 2, 6);
    expect(piers).toHaveLength(8);
    for (const p of piers) expect(p.u1 - p.u0).toBeCloseTo(0.7, 9);
    // A post on each face's axis and 2.50 and 4.75 either side of it.
    const faceZ = posts.filter((p) => Math.abs(p.p[2] - 8.28) < 1e-9).map((p) => +p.p[0].toFixed(3)).sort((x, y) => x - y);
    // (both vertices included).
    expect(faceZ).toEqual([-5.45, -4.75, -2.5, 0, 2.5, 4.75, 5.45]);
    // The solid parapet to 1.20, the piers and sash to the window's head at 1.20 + 1.03.
    const parapet = points(a.byId("galleryParapet"));
    expect(Math.min(...parapet.map((p) => p[1]))).toBeCloseTo(FLOORS.third, 4);
    expect(Math.max(...parapet.map((p) => p[1]))).toBeCloseTo(FLOORS.third + PARAPET + WINDOW, 4);
    const sash = points(a.byId("gallerySashSkin"));
    expect(Math.max(...sash.map((p) => p[1]))).toBeCloseTo(FLOORS.third + PARAPET + WINDOW, 3);
    // The sash bars stand only in the openings, over the parapet.
    expect(Math.min(...sash.map((p) => p[1]))).toBeGreaterThan(FLOORS.third + PARAPET - 0.03);
  });

  it("builds Eiffel's pavilion 10.50 square and 2.27 tall under a 10.680 roof on the girders' foot", () => {
    const walls = points(a.rooms.get("pavilionWalls")!);
    const reach = Math.max(...walls.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[2]))));
    expect(2 * reach).toBeCloseTo(PAVILION_SIDE, 4);
    expect(Math.min(...walls.map((p) => p[1]))).toBeCloseTo(APARTMENT_FLOOR, 4);
    const roof = points(a.rooms.get("pavilionRoof")!);
    expect(2 * Math.max(...roof.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[2]))))).toBeCloseTo(ROOF_SIDE, 4);
    expect(Math.max(...roof.map((p) => p[1]))).toBeCloseTo(APARTMENT_FLOOR + PAVILION_HEIGHT, 4);
    // The girders stand on it: their lowest point is the roof's top.
    const girder = a.structure.filter((q) => q.id.startsWith("girder")).flatMap((q) => points(q.geo));
    expect(Math.min(...girder.map((p) => p[1]))).toBeCloseTo(APARTMENT_FLOOR + PAVILION_HEIGHT, 3);
    // Its outer walls: four windows and two doors a face.
    const s = pavilionSolids();
    expect(s.windows).toBe(16);
    expect(s.doors).toBe(8);
    expect(s.casings).toHaveLength(4);
    // The floor is the balcony's deck plus the 0.15 step.
    const floor = points(a.rooms.get("pavilionFloor")!);
    expect(Math.max(...floor.map((p) => p[1])) - Math.min(...floor.map((p) => p[1]))).toBeCloseTo(0.15, 4);
  });

  it("holds the text's rooms, each walled off from the others above the doors", () => {
    const { rooms } = pavilionPlan();
    const names = rooms.map((r) => r.name);
    for (const want of ["salon", "cabinet de toilette", "cuisine", "water-closet", "électricité", "météorologie", "physique (optique)", "physiologie", "cage d'ascenseur"]) {
      expect(names).toContain(want);
    }
    const solids = pavilionSolids();
    const walls = [...solids.walls, ...solids.casings, ...solids.partitions];
    const inner = PAVILION.side / 2 - PAVILION.wall;
    // Above the doors' heads, under the ceiling: a level where every wall is whole.
    const y = APARTMENT_FLOOR + PAVILION.innerDoor + 0.05;
    const seg = (p: readonly [number, number], q: readonly [number, number]): Vec3[] =>
      Array.from({ length: 401 }, (_, i) => [p[0] + ((q[0] - p[0]) * i) / 400, y, p[1] + ((q[1] - p[1]) * i) / 400]);
    const crosses = (p: readonly [number, number], q: readonly [number, number]) => seg(p, q).some((pt) => walls.some((w) => depthIn(pt, w) > 0.005));
    for (const r of rooms) {
      // Inside the walls and in no wall.
      expect(Math.max(Math.abs(r.at[0]), Math.abs(r.at[1]))).toBeLessThan(inner);
      expect(walls.every((w) => depthIn([r.at[0], y, r.at[1]], w) < 0)).toBe(true);
    }
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        expect(crosses(rooms[i]!.at, rooms[j]!.at), `${rooms[i]!.name} | ${rooms[j]!.name}`).toBe(true);
      }
    }
    // Control: two points in the salon see each other.
    const salon = rooms.find((r) => r.name === "salon")!.at;
    expect(crosses(salon, [salon[0] - 1, salon[1]])).toBe(false);
  });

  it("props the girders' ends on four contrefiches, 600 x 762, from under the girder to the corner upright's gusset", () => {
    const pts = points(a.byId("contreficheLit"));
    // Four struts, two walls each, one under each end of each diagonal.
    const under = [
      pts.filter((p) => Math.abs(T(p)) < 0.5 && S(p) > 3),
      pts.filter((p) => Math.abs(T(p)) < 0.5 && S(p) < -3),
      pts.filter((p) => Math.abs(S(p)) < 0.5 && T(p) > 3),
      pts.filter((p) => Math.abs(S(p)) < 0.5 && T(p) < -3),
    ];
    for (const q of under) expect(q.length).toBeGreaterThan(0);
    expect(under.reduce((n, q) => n + q.length, 0)).toBe(pts.length);
    expect(Math.max(...pts.map((p) => p[1]))).toBeLessThanOrEqual(APARTMENT_FLOOR + PAVILION_HEIGHT + 1e-4);
    expect(Math.max(...pts.map((p) => p[1]))).toBeGreaterThan(APARTMENT_FLOOR + PAVILION_HEIGHT - 0.03);
    expect(Math.min(...pts.map((p) => p[1]))).toBeGreaterThan(FLOORS.third + 0.3);
    // The walls stand 0.762 apart over their faces, across the girder.
    const across = pts.filter((p) => Math.abs(T(p)) < 0.5 && S(p) > 3).map((p) => T(p));
    expect(Math.max(...across) - Math.min(...across)).toBeCloseTo(CONTREFICHE.width, 3);
    // The lean, 24-30 degrees from plumb [measured].
    const lean = (Math.atan2(CONTREFICHE.foot[0] - CONTREFICHE.head[0], CONTREFICHE.head[1] - CONTREFICHE.foot[1]) * 180) / Math.PI;
    expect(lean).toBeGreaterThan(24);
    expect(lean).toBeLessThan(30);
  });

  it("builds the arches 1.300 deep radially, 7.435 to 6.135, in 9 panels a quarter", () => {
    const girderTop = APARTMENT_FLOOR + PAVILION_HEIGHT + 4.5;
    const pts = points(a.byId("domeRibs")).filter((p) => p[1] > girderTop + 0.5);
    // Each point on its own rib: along its diagonal d, across it w.
    const rho = pts.map((p) => {
      const [s, t] = [Math.abs(S(p)), Math.abs(T(p))];
      const d = Math.max(s, t);
      return Math.hypot(d, p[1] - girderTop);
    });
    expect(Math.max(...rho)).toBeGreaterThan(EXTRADOS - 0.01);
    // the square chords' mitred corners at the nodes stand a little proud
    expect(Math.max(...rho)).toBeLessThan(EXTRADOS + 0.02);
    expect(Math.min(...rho)).toBeLessThan(INTRADOS + 0.01);
    expect(Math.min(...rho)).toBeGreaterThan(INTRADOS - 0.03);
    // Across the rib, the chords' inner faces on the girders' webs (0.385), outer 0.485.
    const w = pts.map((p) => Math.min(Math.abs(S(p)), Math.abs(T(p))));
    expect(Math.max(...w)).toBeLessThan(0.485 + 0.01);
  });

  it("stacks the lantern on PL-XV's chain: the 0.80 decagon, the Ø 2.686 cupola, the Ø 1.70 platform", () => {
    const lv = lanternLevels();
    expect(lv.lanternFloor).toBeCloseTo(cote(329.02), 6);
    expect(lv.glass[0]).toBeCloseTo(cote(330.695), 6);
    expect(lv.glass[1]).toBeCloseTo(cote(331.835), 6);
    expect(lv.platform).toBeCloseTo(cote(334.015), 6);
    const base = points(a.byId("lanternBaseSkin"));
    const R = Math.max(...base.map((p) => Math.hypot(p[0], p[2])));
    expect(2 * R * Math.sin(Math.PI / 10)).toBeCloseTo(DECAGON_SIDE, 3);
    expect(Math.max(...base.map((p) => p[1]))).toBeCloseTo(lv.glass[0], 4);
    const cupola = points(a.byId("cupolaSkin"));
    expect(2 * Math.max(...cupola.map((p) => Math.hypot(p[0], p[2])))).toBeCloseTo(CUPOLA, 3);
    expect(Math.min(...cupola.map((p) => p[1]))).toBeCloseTo(lv.glass[1], 4);
    // 2.180 from the sablière supérieure to the platform [sourced].
    expect(lv.platform - lv.glass[1]).toBeCloseTo(2.18, 6);
    const deck = points(a.byId("topDeckSkin"));
    expect(2 * Math.max(...deck.map((p) => Math.hypot(p[0], p[2])))).toBeCloseTo(PLATFORM, 3);
    expect(Math.max(...deck.map((p) => p[1]))).toBeCloseTo(FLOORS.topTerrace, 4);
    // The stair core, from the girders' top to the lantern's floor.
    const core = points(a.byId("ladderCylinderSkin"));
    expect(Math.min(...core.map((p) => p[1]))).toBeCloseTo(cote(318.985), 2);
    expect(Math.max(...core.map((p) => p[1]))).toBeCloseTo(lv.lanternFloor, 4);
    expect(Math.abs(Math.max(...core.map((p) => p[1])) - Math.min(...core.map((p) => p[1])) - 10.035)).toBeLessThan(0.01);
  });

  it("seats the rod 10.790 in its 1.000 tripod to PL-I's tip, the railing 1.20 and the socket at 3.05", () => {
    const lv = lanternLevels();
    const rod = points(a.byId("rodSkin"));
    const tips = points(a.byId("rodPoints"));
    // Seated 0.030 into the tripod's head, so PL-I's "11m760" (flagTop)
    // and the text's 10.790 on the 1.000 apex both hold.
    expect(Math.min(...rod.map((p) => p[1]))).toBeCloseTo(FLOORS.topTerrace + TRIPOD - 0.03, 3);
    const tip = Math.max(...tips.map((p) => p[1]));
    // (the points' 8 mm square ends stand a hair over their axis)
    expect(tip).toBeCloseTo(FLOORS.flagTop, 2);
    expect(tip - Math.min(...rod.map((p) => p[1]))).toBeCloseTo(ROD_LENGTH, 2);
    expect(lv.tripod).toBeCloseTo(FLOORS.topTerrace + TRIPOD, 9);
    // Control: the text's length from the apex alone would miss PL-I's tip by 0.03.
    expect(Math.abs(FLOORS.topTerrace + TRIPOD + ROD_LENGTH - FLOORS.flagTop)).toBeGreaterThan(0.02);
    // Three points, each 1.50 long, 18 degrees out.
    const tipsOut = tips.filter((p) => p[1] > tip - 0.02).map((p) => Math.hypot(p[0], p[2]));
    expect(Math.max(...tipsOut)).toBeCloseTo(ROD.points * Math.sin(ROD.lean), 1);
    expect(Math.hypot(Math.max(...tipsOut), tip - lv.pointsFrom)).toBeCloseTo(ROD.points, 1);
    // The rod's foot, 60 mm.
    expect(2 * Math.max(...rod.filter((p) => p[1] < lv.rodBase + 0.01).map((p) => Math.hypot(p[0], p[2])))).toBeCloseTo(0.06, 2);
    // The tripod's apex is the rod's foot.
    const tripod = points(a.byId("rodTripod"));
    expect(Math.max(...tripod.map((p) => p[1]))).toBeGreaterThan(lv.tripod - 0.03);
    expect(Math.max(...tripod.map((p) => p[1]))).toBeLessThan(lv.tripod + 0.03);
    // The socket: 2.80 to 3.05 over the platform; the straight posts to 1.20.
    const socket = points(a.byId("topSocketSkin"));
    expect(Math.max(...socket.map((p) => p[1])) - FLOORS.topTerrace).toBeCloseTo(SOCKET_TOP, 4);
    expect(Math.max(...socket.map((p) => p[1])) - lv.tripod).toBeCloseTo(2.05, 4);
    const posts = points(a.byId("topRailPostSkin"));
    expect(Math.max(...posts.map((p) => p[1])) - FLOORS.topTerrace).toBeCloseTo(TOP_RAILING, 4);
    const bent = points(a.byId("topBentSkin"));
    expect(Math.max(...bent.map((p) => p[1])) - FLOORS.topTerrace).toBeCloseTo(2.8, 1);
  });

  it("leaves the campanile stair's room round the core empty", () => {
    const y0 = APARTMENT_FLOOR + PAVILION_HEIGHT + 4.5;
    const y1 = y0 + STAIR_ENVELOPE.rise + STAIR_ENVELOPE.railing;
    const inside = (p: Vec3) => p[1] > y0 + 0.01 && p[1] < y1 && Math.hypot(p[0], p[2]) < STAIR_ENVELOPE.radius;
    const box: [Vec3, Vec3] = [[-STAIR_ENVELOPE.radius, y0 + 0.01, -STAIR_ENVELOPE.radius], [STAIR_ENVELOPE.radius, y1, STAIR_ENVELOPE.radius]];
    const hits = (tris: ReadonlyArray<[Vec3, Vec3, Vec3]>) => {
      let hit = false;
      for (const t of tris) {
        sampleNear(t, 0.03, (lo, hi) => !hit && overlaps(lo, hi, box[0], box[1]), (p) => {
          if (inside(p)) hit = true;
        });
        if (hit) break;
      }
      return hit;
    };
    const intruders = [...a.structure, ...[...a.rooms].map(([id, geo]) => ({ id, geo, tris: triangles(geo) }))]
      .filter((q) => q.id !== "ladderCylinderSkin" && !q.id.startsWith("lift:"))
      .filter((q) => hits(q.tris));
    expect(intruders.map((q) => q.id)).toEqual([]);
    // Control: the scan sees the core inside it.
    const core = a.structure.find((q) => q.id === "ladderCylinderSkin")!;
    expect(hits(core.tris)).toBe(true);
  });

  it("puts no structure and no Edoux part inside any room's solid", () => {
    const s = pavilionSolids();
    const solids: Slab[] = [...s.floor, ...s.walls, ...s.casings, ...s.partitions, ...s.roof, ...balconyDeckSlabs()];
    const found = a.structure
      .map((q) => ({ id: q.id, ...deepest(q.tris, solids) }))
      .filter((w) => w.depth >= 0.001)
      .map((w) => `${w.id} ${w.depth.toFixed(3)} at ${w.at?.map((v) => v.toFixed(3))} (s ${S(w.at!).toFixed(3)}, t ${T(w.at!).toFixed(3)})`);
    expect(found).toEqual([]);
    // Control 1: the Edoux car at its top stop does pass through where the
    // floor's opening is; closing the opening, the scan finds it.
    const car = a.structure.find((q) => q.id === "lift:edoux.nord")!;
    const plug: Slab = {
      outline: ([[-4.7, -1.9], [-0.6, -1.9], [-0.6, 1.9], [-4.7, 1.9]] as const).map(([s0, t0]) => [(s0 + t0) / Math.SQRT2, FLOORS.third + 2.43 - 0.12, (t0 - s0) / Math.SQRT2] as Vec3).reverse(),
      depth: 0.27,
    };
    expect(deepest(car.tris, [plug]).depth).toBeGreaterThan(0.01);
    // Control 2: the girders, lowered 0.05, would sink into the roof.
    const girders = a.structure.filter((q) => q.id.startsWith("girder")).flatMap((q) => q.tris);
    const lowered = girders.map((t) => t.map((p) => [p[0], p[1] - 0.05, p[2]] as Vec3) as [Vec3, Vec3, Vec3]);
    expect(deepest(lowered, s.roof).depth).toBeGreaterThan(0.01);
    // And the scan reaches the contrefiches, which cross the deck's openings.
    const struts = triangles(a.byId("contreficheLit"));
    const closed: Slab = { outline: ([[5.2, -0.6], [6.6, -0.6], [6.6, 0.6], [5.2, 0.6]] as const).map(([s0, t0]) => [(s0 + t0) / Math.SQRT2, FLOORS.third + 2.31, (t0 - s0) / Math.SQRT2] as Vec3).reverse(), depth: 0.4 };
    expect(deepest(struts, [closed]).depth).toBeGreaterThan(0.01);
  }, 120_000);

  it("is deterministic: two cooks, identical rooms", () => {
    for (const [id, geo] of a.rooms) {
      const other = b.rooms.get(id)!;
      expect(other.pointCount).toBe(geo.pointCount);
      const P = geo.attrs.point.get("P")!.data;
      const Q = other.attrs.point.get("P")!.data;
      let same = true;
      for (let i = 0; i < 3 * geo.pointCount; i++) if (P[i] !== Q[i]) same = false;
      expect(same, id).toBe(true);
    }
    // Control: the comparison can say "different".
    const P = a.rooms.get("pavilionWalls")!.attrs.point.get("P")!.data;
    const Q = a.rooms.get("pavilionRoof")!.attrs.point.get("P")!.data;
    expect(P.length === Q.length && P.every((v, i) => v === Q[i])).toBe(false);
  });
});
