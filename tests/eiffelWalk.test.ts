/**
 * The Eiffel demo's walk: the climb on foot, held to the stairs and to the
 * cooked tower (`demos/eiffel/walk.ts`).
 *
 * - THE STEPS. The walk visits every flight `stairRuns()` builds, run by
 *   run in climbing order (the leg runs once, in pile 2), each flight's
 *   whole walking line; the step count rises by one riser at a time and
 *   comes to E1900-TXT p. 304's 1,710, through its running totals at the
 *   floors (347, 674, 1,130, 1,585) [sourced].
 * - THE HEIGHT never falls: every point of the walk is at least as high as
 *   the one before it, landings and deck walks included — but for the one
 *   step down the model has, from Eiffel's apartment onto the terrace
 *   (`STEP_DOWN`), held to its size.
 * - THE FEET STAND ON THE DECK wherever the walk crosses a floor: a solid
 *   under them within `FLOOR_GAP` at every sample of a deck walk.
 * - THE EYE KEEPS CLEAR of everything solid the page draws: the whole
 *   tower at its plain depth — steel, decks, walls, glass, the stairs' own
 *   treads, landings, stringers and rails, the lifts' fixed machinery, the
 *   ground's masonry — sampled every 5 cm along the walk and held `CLEAR`
 *   from the nearest triangle (`LADDER_CLEAR` on a ladder, where a climber's
 *   face is a hand from the rungs). Rivets, fittings, the flag and the
 *   moving cars are left out; so is the door the walk goes out by, which
 *   stands open (`OPEN_DOOR`). WHAT THE WALK FOUND and could not fix in its
 *   own files is listed in `FOUND`, each bounded by its count so it cannot
 *   grow unseen, and each a follow-up; anything else near the eye fails.
 *   Controls prove the comparators can say "too close" and "no floor".
 *
 * Diagnostics are written to `node_modules/.cache/eiffel-next/walk/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { stairRuns } from "../demos/eiffel/stairs.js";
import { EYE, type WalkRoute, pointAt, walkRoute } from "../demos/eiffel/walk.js";

type Vec3 = readonly [number, number, number];

const OUT_DIR = "node_modules/.cache/eiffel-next/walk";

/** The eye's clearance from any solid, and on a ladder. */
const CLEAR = 0.25;
const LADDER_CLEAR = 0.15;
/** How far under the feet the floor may be off a flight (a sample between two points may cut a sill's corner). */
const FLOOR_GAP = 0.1;
/** The longest stretch off a flight with no floor under the feet: a stride, over a gap between a tread and a deck. */
const STRIDE = 0.35;
/** The body, off a flight: clear of any solid by `BODY.clear` at these heights over the feet. */
const BODY = { heights: [0.3, 0.6, 0.9, 1.2], clear: 0.1 } as const;
/**
 * Where the walk crosses more than a stride with no floor, and why: the
 * flight it leaves, the longest gap. Each a follow-up.
 */
const FLOOR_OPEN: ReadonlyArray<{ flight: string; most: number; why: string }> = [
  {
    flight: "summit.mobile",
    most: 0.45,
    why: "off the mobile ladder's head onto the cupola's floor: the ladder arrives beside the floor (stairs.ts), and the climber, 0.25 behind its rungs, steps 0.40 across to the floor's edge; sampled at another phase the top rung splits it in two",
  },
  {
    flight: "summit.campanile",
    most: 0.4,
    why: "in through the core's door (summit.ts CORE_DOOR) onto its ladder: inside the tube there is no floor at the landing's level, the feet go from the sill onto a rung; 0.35, 0.36 sampled at 1 cm",
  },
  {
    flight: "summit.core",
    most: 0.45,
    why: "off the core ladder's head onto the lantern's floor: the ladder comes up inside the core's top, and the floor is open round it (summit.ts, its 0.72 well); 0.24 and 0.15 sampled at 1 cm, split by the floor's rim, one gap at another phase",
  },
];
/**
 * Where the body, off a flight, meets a solid, and why: by flight, the most
 * samples (heights counted apart). Each a follow-up.
 */
const BODY_FOUND: ReadonlyArray<{ flights: RegExp; most: number; why: string; phase?: boolean }> = [
  {
    flights: /^ground\.start$/,
    most: 4,
    why: "on the first P4 the turn between the lanes is squeezed: 0.125 onto the landing passes the start flight's end post at 0.097, further out puts the eye within 0.25 of the leg's face diagonal, which crosses P4 at head height",
  },
  {
    flights: /^e1\.helix\d$/,
    most: 7,
    why: "the helices' rails stop where a flight crosses their edge (stairs.ts railOpen); left, where a flight leaves a helix at an angle off the diagonal, the walk's straight step from the helix's head to the flight's foot passes under the back edge of the flight's first tread, 0.093 under the knee sample",
  },
  {
    flights: /^(e3\.upper|summit\.little)$/,
    most: 4,
    why: "at 0.096-0.100, found at a 1 cm pitch and by the 5 cm one only at some phases: stepping from e3's upper helix onto the little stair, whose axes stand 0.055 apart, past its newel; and the terrace flight's foot stringer at 0.098 on the way to its foot",
    phase: true,
  },
  {
    flights: /^summit\.(girder|core|mobile|top|roof|gallery)$/,
    most: 20,
    why: "the steep stairs' and ladders' joins at the top (the girder stair's head under the campanile's first turn, the lantern round the mobile ladder's foot, the cupola, the terrace landings' stringers): cramped, 0.06-0.10",
  },
];
/**
 * The one descent: `summit.ts` sets the terrace's deck (the « balcon »)
 * 2.43 over the 3rd floor and the apartment's floor 2.58, where the book
 * has both at 312.21 [sourced E1900-TXT p. 216, PL-XIX]: 0.15 down, going
 * out of the door. A follow-up for `summit.ts`.
 */
const STEP_DOWN = { from: "summit.little", depth: 0.15 } as const;
/**
 * The door the walk leaves the apartment by, open: the +x wall's at u
 * -2.57, 0.89 wide and 1.95 tall on the apartment's floor (`summit.ts`
 * PAVILION, PAVILION_OPENINGS, restated), through the wall's thickness. Its
 * glazed leaf is not in the way of anyone walking through it.
 */
const OPEN_DOOR = { x: [4.95, 5.3], y: [278.7, 278.71 + 1.96], z: [2.57 - 0.46, 2.57 + 0.46] } as const;
/**
 * WHAT THE WALK FOUND, where the eye cannot keep clear because of how
 * another part is built (not the walk): by flight and class, the most
 * samples each may take, and why. Every one is a follow-up
 * (node_modules/.cache/eiffel-next/walk/units.txt has the frames).
 */
const FOUND: ReadonlyArray<{ flight: string; cls: string; most: number; why: string; phase?: boolean }> = [
  {
    flight: "summit.core",
    cls: "summit",
    most: 19,
    why: "the lantern's floor is 2.46 across the flats (summit.ts LANTERN), with the core's 0.72 well in the middle and the mobile ladder leaning in: the walk round to its back keeps 0.21 of the wall, not 0.25",
  },
  {
    flight: "summit.core",
    cls: "stairs",
    most: 7,
    why: "the same walk passes the mobile ladder's stiles at 0.19",
  },
  {
    flight: "summit.mobile",
    cls: "stairs",
    most: 2,
    why: "the cupola is 1.655 from its floor to the platform's underside: crossing to the last ladder, crouched, the eye comes round close to the axis, 0.24 from its rungs (a stretch of 1-2 samples, so by the phase)",
    phase: true,
  },
  {
    flight: "summit.top",
    cls: "summit",
    most: 14,
    why: "the manhole (summit.ts, the « 600 ») is open now, but the paratonnerre's tripod stands over it, its three legs on the collar's rim and meeting 1.00 over the deck on the axis (PL-XV Fig. 1, PL-XIX Fig. 10): the climber's head comes up inside it, beside the rod",
  },
];
/** The walk's sampling pitch, well under the clearance, so no surface is stepped over. */
const PITCH = 0.05;
/** The book's running totals at each floor [E1900-TXT p. 304], restated. */
const CUMULATIVE = { ground: 347, e1: 674, e2: 1130, e3: 1585, summit: 1710 } as const;

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);

// ------------------------------------------------------------ point to triangle

/** The nearest point of the triangle abc to p (Ericson, Real-Time Collision Detection 5.1.5). */
function nearestOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub3(b, a);
  const ac = sub3(c, a);
  const ap = sub3(p, a);
  const d1 = dot3(ab, ap);
  const d2 = dot3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub3(p, b);
  const d3 = dot3(ab, bp);
  const d4 = dot3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add3(a, mul3(ab, d1 / (d1 - d3)));
  const cp = sub3(p, c);
  const d5 = dot3(ab, cp);
  const d6 = dot3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add3(a, mul3(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add3(b, mul3(sub3(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const denom = 1 / (va + vb + vc);
  return add3(a, add3(mul3(ab, vb * denom), mul3(ac, vc * denom)));
}

// ------------------------------------------------------------ the corridor grid

const CELL = 0.5;
const key = (i: number, j: number, k: number): number => ((i + 4096) * 8192 + (j + 4096)) * 8192 + (k + 4096);

/** The eye samples along the walk, and what each is held to. */
interface Sample {
  eye: Vec3;
  at: Vec3;
  d: number;
  clear: number;
  flight: string;
  step: number;
  /** On a walk across a floor (both ends of its segment are deck points). */
  deck: boolean;
  /** Off a flight's own line: a deck walk, a turn on a landing, or the join of two flights. */
  walk: boolean;
}

function samples(route: WalkRoute): Sample[] {
  const out: Sample[] = [];
  for (let d = 0; d <= route.length + 1e-9; d += PITCH) {
    const p = pointAt(route, d);
    const v = route.points[p.index]!;
    const w = route.points[p.index + 1] ?? v;
    const ladder = v.kind === "ladder" || w.kind === "ladder";
    out.push({ eye: p.eye, at: p.at, d, clear: ladder ? LADDER_CLEAR : CLEAR, flight: v.flight, step: v.step, deck: v.kind === "deck" && w.kind === "deck",
      walk: v.flight !== w.flight || v.kind === "deck" || v.kind === "landing" || w.kind === "deck" || w.kind === "landing",
    });
  }
  return out;
}

/** The cells within the clearance of any sample: only triangles there are kept. */
function corridor(eyes: readonly Vec3[]): Set<number> {
  const cells = new Set<number>();
  const r = Math.ceil(CLEAR / CELL);
  for (const e of eyes) {
    const i = Math.floor(e[0] / CELL);
    const j = Math.floor(e[1] / CELL);
    const k = Math.floor(e[2] / CELL);
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) cells.add(key(i + a, j + b, k + c));
  }
  return cells;
}

interface Tri {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  cls: string;
}

function eachTriangle(geo: Geometry, visit: (a: Vec3, b: Vec3, c: Vec3) => void): void {
  const P = geo.attrs.point.get("P")!.data;
  const pt = (i: number): Vec3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    if (n < 3) continue;
    const a = pt(geo.vertexToPoint[start]!);
    for (let k = 1; k + 1 < n; k++) visit(a, pt(geo.vertexToPoint[start + k]!), pt(geo.vertexToPoint[start + k + 1]!));
  }
}

/** Every triangle the page draws as a solid that reaches into the corridor, binned by cell. */
async function cookCorridor(cells: Set<number>): Promise<{ tris: Tri[]; bins: Map<number, number[]>; classes: string[] }> {
  const g = buildEiffel(1889, {});
  const { outputs } = await cook(g);
  const tris: Tri[] = [];
  const bins = new Map<number, number[]>();
  const classes: string[] = [];
  for (const cls of PART_CLASSES) {
    const geo = firstGeometry((outputs as Record<string, never>)[cls] ?? []);
    if (geo === undefined) continue;
    classes.push(cls);
    eachTriangle(geo, (a, b, c) => {
      const lo = [0, 1, 2].map((k) => Math.floor(Math.min(a[k]!, b[k]!, c[k]!) / CELL));
      const hi = [0, 1, 2].map((k) => Math.floor(Math.max(a[k]!, b[k]!, c[k]!) / CELL));
      let n = -1;
      // A large triangle (a deck) is binned only where the corridor is.
      for (let i = lo[0]!; i <= hi[0]!; i++)
        for (let j = lo[1]!; j <= hi[1]!; j++)
          for (let k = lo[2]!; k <= hi[2]!; k++) {
            const id = key(i, j, k);
            if (!cells.has(id)) continue;
            if (n < 0) {
              n = tris.length;
              tris.push({ a, b, c, cls });
            }
            let bin = bins.get(id);
            if (bin === undefined) bins.set(id, (bin = []));
            bin.push(n);
          }
    });
  }
  return { tris, bins, classes };
}

interface Near {
  dist: number;
  tri: number;
  at: Vec3;
}

function nearest(eye: Vec3, bins: Map<number, number[]>, tris: readonly Tri[], keep: (t: Tri) => boolean = () => true): Near {
  const r = Math.ceil(CLEAR / CELL);
  const i = Math.floor(eye[0] / CELL);
  const j = Math.floor(eye[1] / CELL);
  const k = Math.floor(eye[2] / CELL);
  let best: Near = { dist: Infinity, tri: -1, at: eye };
  for (let a = -r; a <= r; a++)
    for (let b = -r; b <= r; b++)
      for (let c = -r; c <= r; c++) {
        for (const n of bins.get(key(i + a, j + b, k + c)) ?? []) {
          const t = tris[n]!;
          if (!keep(t)) continue;
          const q = nearestOnTriangle(eye, t.a, t.b, t.c);
          const d = len3(sub3(q, eye));
          if (d < best.dist) best = { dist: d, tri: n, at: q };
        }
      }
  return best;
}

/** The highest solid surface under a point, within a metre of it, cast straight down; undefined if none. */
function floorUnder(p: Vec3, bins: Map<number, number[]>, tris: readonly Tri[]): number | undefined {
  let best: number | undefined;
  const i = Math.floor(p[0] / CELL);
  const k = Math.floor(p[2] / CELL);
  const j = Math.floor(p[1] / CELL);
  const seen = new Set<number>();
  for (let b = -2; b <= 1; b++) {
    for (const n of bins.get(key(i, j + b, k)) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      const { a, b: q, c } = tris[n]!;
      const det = (q[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (q[2] - a[2]);
      if (Math.abs(det) < 1e-12) continue;
      const u = ((p[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (p[2] - a[2])) / det;
      const v = ((q[0] - a[0]) * (p[2] - a[2]) - (p[0] - a[0]) * (q[2] - a[2])) / det;
      if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) continue;
      const y = a[1] + u * (q[1] - a[1]) + v * (c[1] - a[1]);
      if (y <= p[1] + 0.02 && y >= p[1] - 1 && (best === undefined || y > best)) best = y;
    }
  }
  return best;
}

function writeReport(file: string, body: unknown): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/${file}`, typeof body === "string" ? body : JSON.stringify(body, null, 1), "utf8");
}

const fmt = (p: Vec3): string => `(${p.map((v) => v.toFixed(2)).join(", ")})`;

/** Whether a point is inside the open door. */
const inDoor = (p: Vec3): boolean =>
  p[0] >= OPEN_DOOR.x[0] && p[0] <= OPEN_DOOR.x[1] && p[1] >= OPEN_DOOR.y[0] && p[1] <= OPEN_DOOR.y[1] && p[2] >= OPEN_DOOR.z[0] && p[2] <= OPEN_DOOR.z[1];

describe("Eiffel walk: the climb on foot", () => {
  const route = walkRoute();

  it("visits every flight, run by run, in climbing order", () => {
    const runs = stairRuns();
    const expected = runs.flatMap((r) => r.parts.flights.map((f) => `${r.key}:${f.name}`));
    expect(route.flights.map((f) => `${f.run}:${f.name}`)).toEqual(expected);
    // Each flight's line is whole, and the flights follow one another along the walk.
    let prev = -1;
    for (const f of route.flights) {
      expect(f.first, f.name).toBeGreaterThan(prev);
      const pts = route.points.slice(f.first, f.last + 1);
      expect(pts.every((p) => p.flight === f.name), f.name).toBe(true);
      expect(pts[pts.length - 1]!.step - pts[0]!.step, f.name).toBe(f.risers);
      // A point for every riser climbed.
      expect(pts.filter((p, i) => i > 0 && p.step > pts[i - 1]!.step).length, f.name).toBe(f.risers);
      prev = f.last;
    }
  });

  it("climbs 1,710 steps, one riser at a time, through the book's running totals", () => {
    expect(route.steps).toBe(1710);
    const pts = route.points;
    expect(pts[0]!.step).toBe(0);
    expect(pts[pts.length - 1]!.step).toBe(1710);
    let rises = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = pts[i]!.step - pts[i - 1]!.step;
      expect(d === 0 || d === 1, `step jumps by ${d} at point ${i}`).toBe(true);
      // A step is taken only on a flight.
      if (d === 1) expect(pts[i]!.kind === "stair" || pts[i]!.kind === "ladder", `point ${i}`).toBe(true);
      rises += d;
    }
    expect(rises).toBe(1710);
    // The count on leaving each run's last flight is the book's running total.
    for (const [run, total] of Object.entries(CUMULATIVE)) {
      const last = [...route.flights].reverse().find((f) => f.run === run)!;
      expect(route.points[last.last]!.step, run).toBe(total);
    }
  });

  it("never loses height, but for the one step down onto the terrace", () => {
    const pts = route.points;
    const falls: string[] = [];
    let stepDown = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const drop = a.at[1] - b.at[1];
      if (drop <= 1e-9) continue;
      if (b.kind === "deck" && b.flight === STEP_DOWN.from && Math.abs(drop - STEP_DOWN.depth) < 1e-6) stepDown++;
      else falls.push(`${b.run} ${b.flight} point ${i}: ${a.at[1].toFixed(3)} -> ${b.at[1].toFixed(3)}`);
    }
    expect(falls, falls.slice(0, 10).join("\n")).toEqual([]);
    expect(stepDown).toBe(1);
    // Every run starts where the one before it ends, at its floor.
    for (const r of stairRuns()) {
      const fs = route.flights.filter((f) => f.run === r.key);
      expect(route.points[fs[0]!.first]!.at[1], r.key).toBeCloseTo(r.from, 6);
      expect(route.points[fs[fs.length - 1]!.last]!.at[1], r.key).toBeCloseTo(r.to, 6);
    }
    // The eye is EYE over the feet, but where the climber crouches under the
    // cupola, on the lantern's last two ladders, and never under 0.9.
    for (const p of pts) {
      const h = p.eye[1] - p.at[1];
      if (p.flight === "summit.mobile" || p.flight === "summit.top") {
        expect(h, p.flight).toBeLessThanOrEqual(EYE + 1e-9);
        expect(h, p.flight).toBeGreaterThanOrEqual(0.9 - 1e-9);
      } else expect(h, `${p.flight} at ${p.step}`).toBeCloseTo(EYE, 9);
    }
    // And it ends standing on the top platform.
    const end = pts[pts.length - 1]!;
    expect(end.eye[1] - end.at[1]).toBeCloseTo(EYE, 9);
  });

  describe("against the cooked tower", () => {
    let ss: Sample[];
    let tower: Awaited<ReturnType<typeof cookCorridor>>;
    // The controls' points: the ground stair's tenth tread, 2 cm under the
    // top its walking line stands on; and a foot 0.5 over the 2nd floor.
    const ground = route.flights.find((x) => x.run === "ground" && x.kind === "straight")!;
    const onTread = route.points[ground.first + 10]!.at;
    const inTread: Vec3 = [onTread[0], onTread[1] - 0.02, onTread[2]];
    const deckFoot = route.points.find((p) => p.kind === "deck" && p.flight === "e1.top")!.at;
    const inAir: Vec3 = [deckFoot[0], deckFoot[1] + 0.5, deckFoot[2]];
    beforeAll(async () => {
      ss = samples(route);
      const off = ss.filter((x) => x.walk);
      const feet = off.map((x) => [x.at[0], x.at[1] - 0.05, x.at[2]] as Vec3);
      const body = off.flatMap((x) => BODY.heights.map((h) => [x.at[0], x.at[1] + h, x.at[2]] as Vec3));
      tower = await cookCorridor(corridor([...ss.map((x) => x.eye), ...feet, ...body, inTread, inAir]));
    }, 600_000);

    it("reads the classes a walker could meet", () => {
      for (const cls of ["uprights", "bracing", "horizontals", "girders", "platforms", "stairs", "summit", "machinery", "glass"]) {
        expect(tower.classes, cls).toContain(cls);
      }
      expect(tower.tris.length).toBeGreaterThan(10_000);
    });

    it("keeps the eye clear of every solid, all the way up, but for what it found", () => {
      const bad: Array<Sample & Near & { cls: string }> = [];
      let closest = Infinity;
      const shut = (t: Tri): boolean => !(t.cls === "glass" && inDoor(t.a) && inDoor(t.b) && inDoor(t.c));
      for (const x of ss) {
        const n = nearest(x.eye, tower.bins, tower.tris, shut);
        closest = Math.min(closest, n.dist);
        if (n.dist < x.clear) bad.push({ ...x, ...n, cls: tower.tris[n.tri]!.cls });
      }
      // Grouped by flight and class, for a reader.
      const groups = new Map<string, { n: number; worst: (typeof bad)[number] }>();
      for (const b of bad) {
        const k = `${b.flight} | ${b.cls}`;
        const e = groups.get(k);
        if (e === undefined) groups.set(k, { n: 1, worst: b });
        else {
          e.n++;
          if (b.dist < e.worst.dist) e.worst = b;
        }
      }
      const lines = [...groups.entries()].map(
        ([k, { n, worst: w }]) =>
          `${k}: ${n} samples, nearest ${w.dist.toFixed(3)} at step ${w.step}, d ${w.d.toFixed(2)}, eye ${fmt(w.eye)}, solid at ${fmt(w.at)}`,
      );
      writeReport("clearance.txt", [`samples ${ss.length}, triangles ${tower.tris.length}, closest ${closest.toFixed(3)}`, ...lines].join("\n"));
      const unexplained: string[] = [];
      for (const [k, { n }] of groups) {
        const [flight, cls] = k.split(" | ") as [string, string];
        const f = FOUND.find((x) => x.flight === flight && x.cls === cls);
        if (f === undefined) unexplained.push(lines.find((l) => l.startsWith(k))!);
        else expect(n, `${k}: ${f.why}`).toBeLessThanOrEqual(f.most);
      }
      expect(unexplained, unexplained.join("\n")).toEqual([]);
      // Each finding is still there: when one is fixed, its entry goes. One
      // a sample may or may not land in, as the walk's length moves the
      // sampling's phase, is bounded but not required (`phase`).
      for (const f of FOUND) {
        if (f.phase === true) continue;
        expect(groups.has(`${f.flight} | ${f.cls}`), `${f.flight} | ${f.cls} no longer found: remove it from FOUND`).toBe(true);
      }
    });

    it("keeps the feet on a floor off the flights, but for a stride", () => {
      const off = ss.filter((x) => x.walk);
      expect(off.filter((x) => x.deck).length).toBeGreaterThan(200);
      const gaps: Array<{ flight: string; from: number; to: number; feet: Vec3 }> = [];
      let open: (typeof gaps)[number] | undefined;
      for (const x of off) {
        const y = floorUnder(x.at, tower.bins, tower.tris);
        const ok = y !== undefined && y >= x.at[1] - FLOOR_GAP;
        if (!ok && open !== undefined && x.d - open.to <= PITCH * 1.5) open.to = x.d;
        else if (!ok) gaps.push((open = { flight: x.flight, from: x.d, to: x.d, feet: x.at }));
        else open = undefined;
      }
      const long = gaps.filter((g) => g.to - g.from + PITCH > STRIDE + 1e-9);
      const report = long.map((g) => `${g.flight} d ${g.from.toFixed(2)}-${g.to.toFixed(2)} (${(g.to - g.from + PITCH).toFixed(2)} m) feet ${fmt(g.feet)}`);
      writeReport("floor.txt", [`off-flight samples ${off.length}, gaps ${gaps.length}`, ...gaps.map((g) => `${g.flight} d ${g.from.toFixed(2)}-${g.to.toFixed(2)}`)].join("\n"));
      const unexplained = long.filter((g) => {
        const f = FLOOR_OPEN.find((o) => o.flight === g.flight);
        return f === undefined || g.to - g.from + PITCH > f.most;
      });
      expect(unexplained.map((g) => report[long.indexOf(g)]), "floorless stretches longer than a stride").toEqual([]);
    });

    it("keeps the body clear off the flights", () => {
      const hits: string[] = [];
      const shut = (t: Tri): boolean => !(t.cls === "glass" && inDoor(t.a) && inDoor(t.b) && inDoor(t.c));
      for (const x of ss.filter((q) => q.walk)) {
        for (const h of BODY.heights) {
          const n = nearest([x.at[0], x.at[1] + h, x.at[2]], tower.bins, tower.tris, shut);
          if (n.dist < BODY.clear) hits.push(`${x.flight} d ${x.d.toFixed(2)} +${h}: ${n.dist.toFixed(3)} (${tower.tris[n.tri]!.cls}) at ${fmt(n.at)}`);
        }
      }
      writeReport("body.txt", hits.join("\n"));
      const counts = new Map<RegExp, number>();
      const unexplained = hits.filter((h) => {
        const f = BODY_FOUND.find((b) => b.flights.test(h.split(" ")[0]!));
        if (f !== undefined) counts.set(f.flights, (counts.get(f.flights) ?? 0) + 1);
        return f === undefined;
      });
      expect(unexplained, unexplained.slice(0, 12).join("\n")).toEqual([]);
      for (const f of BODY_FOUND) {
        const n = counts.get(f.flights) ?? 0;
        expect(n, `${f.flights}: ${f.why}`).toBeLessThanOrEqual(f.most);
        if (f.phase !== true) expect(n, `${f.flights} no longer found: remove it from BODY_FOUND`).toBeGreaterThan(0);
      }
    });

    it("controls: an eye in a tread is too close, and a foot in the air has no floor", () => {
      const n = nearest(inTread, tower.bins, tower.tris);
      expect(n.dist).toBeLessThan(CLEAR);
      // The stairs are their own class (parts.ts).
      expect(tower.tris[n.tri]!.cls).toBe("stairs");
      const under = floorUnder(inAir, tower.bins, tower.tris);
      expect(under).toBeDefined();
      expect(inAir[1] - under!).toBeGreaterThan(FLOOR_GAP);
    });
  });
});
