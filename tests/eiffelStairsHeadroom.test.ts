/**
 * The Eiffel demo's stairs, held to the room a climber needs over them
 * (`demos/eiffel/stairs.ts`).
 *
 * - HEADROOM. Over every walking-line point of every stair (not the
 *   ladders), the stairs' own pieces — treads, landings, stringers, pads,
 *   newels, posts — stand at least `HEADROOM` over the foot, cast straight
 *   up from the foot and from a ring `REACH` round it. A helix's turn over
 *   the one below is the case that matters: a turn with a landing in it
 *   climbs less, and a flight leaving a helix at its head crosses over its
 *   last turn. The walk (`eiffelWalk.test.ts`) holds the eye to everything
 *   else the tower builds.
 * - LANDINGS. A service helix's landings are a turn apart, none in its last
 *   turn, and each sector's pieces stop at its forward edge, where the
 *   helix below climbs toward it.
 * - RAILS. A helix's rail stands within `RAIL_SAG` of its circle, and e1's
 *   stop where a flight crosses a helix's outer edge.
 * - THE WAYS THROUGH at the summit, as the plates draw them: the door cut
 *   in the campanile's core at its landing (PL-XV Fig. 2), the landing in
 *   front of it over the stair's first step, the core's ladder facing -t
 *   (Figs 1-2); the manhole in the top platform, the « 600 », with the last
 *   ladder inside its ring (PL-XV Fig. 1, PL-XIX Fig. 10); the floor that
 *   closes 83° of the little stair's circle, which its head steps onto
 *   (PL-XIX Fig. 6).
 *
 * Every check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import {
  type Block,
  type Flight,
  RAIL_SAG,
  SERVICE_LANDINGS,
  type StairRun,
  SUMMIT_STAIRS,
  landingSteps,
  sectorLanding,
  stairRuns,
  summitLevels,
} from "../demos/eiffel/stairs.js";
import { CORE_DOOR, STAIR_ENVELOPE, buildSummit, coreDoorArc } from "../demos/eiffel/summit.js";

type Vec3 = readonly [number, number, number];

/** The least room over a walking line [estimated: a doorway's 2.00, which the plates' flights allow]. */
const HEADROOM = 2.0;
/** The ring round the foot the room is cast up from: a climber's shoulders. */
const REACH = 0.15;
/** Only what stands this far over the foot counts: the next treads ahead are nearer. */
const OVER = 1.0;
/**
 * Where a stair has less, and why: by flight, the least it may have.
 */
const LOW: ReadonlyArray<{ flight: string; least: number; why: string }> = [];

const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];

/** How far over `o` a ray straight up enters the box; Infinity if it misses. */
function upInto(b: Block, o: Vec3): number {
  const axes = [b.x, b.y, cross3(b.x, b.y)];
  const d: Vec3 = [o[0] - b.at[0], o[1] - b.at[1], o[2] - b.at[2]];
  let t0 = -Infinity;
  let t1 = Infinity;
  for (let k = 0; k < 3; k++) {
    const a = axes[k]!;
    const p = dot3(d, a);
    const h = b.size[k]! / 2;
    if (Math.abs(a[1]) < 1e-12) {
      if (Math.abs(p) > h) return Infinity;
      continue;
    }
    const lo = (-h - p) / a[1];
    const hi = (h - p) / a[1];
    t0 = Math.max(t0, Math.min(lo, hi));
    t1 = Math.min(t1, Math.max(lo, hi));
  }
  return t0 > t1 || t1 < 0 ? Infinity : Math.max(0, t0);
}

const RING: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  ...Array.from({ length: 8 }, (_, k) => [REACH * Math.cos((k * Math.PI) / 4), REACH * Math.sin((k * Math.PI) / 4)] as const),
];

/** The least room over a flight's walking line among `blocks`. */
function leastRoom(f: Flight, blocks: readonly Block[]): { room: number; at: Vec3 } {
  let best = { room: Infinity, at: f.foot };
  for (const w of f.line) {
    for (const [dx, dz] of RING) {
      const o: Vec3 = [w.at[0] + dx, w.at[1] + 0.01, w.at[2] + dz];
      for (const b of blocks) {
        const room = upInto(b, o) + 0.01;
        if (room > OVER && room < best.room) best = { room, at: w.at };
      }
    }
  }
  return best;
}

/** The distance from a point to the nearest of some rails' centre lines. */
function railGap(rails: ReadonlyArray<readonly Vec3[]>, p: Vec3): number {
  let best = Infinity;
  for (const rail of rails) {
    for (let k = 1; k < rail.length; k++) {
      const a = rail[k - 1]!;
      const b = rail[k]!;
      const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const t = Math.max(0, Math.min(1, dot3(ab, ap) / dot3(ab, ab)));
      best = Math.min(best, Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t));
    }
  }
  return best;
}

const RUNS = stairRuns();
const run = (key: StairRun["key"]): StairRun => RUNS.find((r) => r.key === key)!;
const flight = (name: string): Flight => RUNS.flatMap((r) => r.parts.flights).find((f) => f.name === name)!;
const piecesOf = (r: StairRun): Block[] => [...r.parts.treads, ...r.parts.frame, ...r.parts.landings];

describe("Eiffel stairs: the room over them", () => {
  it("leaves 2.00 over every stair's walking line", () => {
    const low: string[] = [];
    const least: Record<string, number> = {};
    for (const r of RUNS) {
      const blocks = piecesOf(r);
      for (const f of r.parts.flights) {
        if (f.kind === "ladder") continue;
        const { room, at } = leastRoom(f, blocks);
        least[f.name] = room;
        const ok = LOW.find((x) => x.flight === f.name);
        if (room < (ok?.least ?? HEADROOM)) low.push(`${f.name}: ${room.toFixed(3)} at (${at.map((v) => v.toFixed(2)).join(", ")})`);
      }
    }
    expect(low, low.join("\n")).toEqual([]);
    // The helices are what this is about: each has something over it.
    for (const name of ["e1.helix2", "e2.helix", "e3.lower", "e3.upper", "e3.raccord", "summit.campanile"]) {
      expect(least[name], name).toBeLessThan(4);
    }
  });

  it("control: a slab 1.90 over a walking line is too low", () => {
    const f = flight("e2.helix");
    const p = f.line[200]!.at;
    const slab: Block = { at: [p[0], p[1] + 1.9 + 0.05, p[2]], x: [1, 0, 0], y: [0, 1, 0], size: [0.4, 0.1, 0.4] };
    const { room } = leastRoom(f, [slab]);
    expect(room).toBeLessThan(HEADROOM);
    expect(room).toBeLessThanOrEqual(1.9 + 1e-9);
  });

  it("puts a service helix's landings a turn apart and none in its last turn", () => {
    for (const [name, risers] of [
      ["e2.helix", 435],
      ["e3.lower", 314],
      ["e3.upper", 128],
    ] as const) {
      const f = flight(name);
      expect(f.risers, name).toBe(risers);
      const after = landingSteps(risers, SERVICE_LANDINGS);
      expect(after[0], name).toBe(SERVICE_LANDINGS.every);
      expect(risers - after[after.length - 1]!, name).toBeGreaterThanOrEqual(SERVICE_LANDINGS.headClear);
      // A landing on the walking line is `span` points at one height after its riser.
      const flatRuns = f.line.filter((w, i) => i > 0 && w.step === f.line[i - 1]!.step && w.step > 0 && w.step < risers).length;
      expect(flatRuns, name).toBe(after.length * SERVICE_LANDINGS.span);
      // A turn to each landing, or a little more: at least its 14 risers
      // and 3 treads' angle, 17 slots, to the turn, and not two landings'
      // worth; so the walking line comes round to each landing's angle one
      // landing later, within a slot or so.
      const axis = f.axis!;
      const mid = (f.diameter! - f.width) / 2;
      const perTurn = (2 * Math.PI * mid) / f.going;
      expect(perTurn, name).toBeGreaterThanOrEqual(SERVICE_LANDINGS.perTurn - 1e-9);
      expect(perTurn, name).toBeLessThan(SERVICE_LANDINGS.perTurn + 2);
      const angleAt = (i: number) => Math.atan2(f.line[i]!.at[2] - axis[2], f.line[i]!.at[0] - axis[0]);
      const firsts = f.line.map((w, i) => (i > 0 && w.step < risers && w.step === f.line[i - 1]!.step && f.line[i - 2]?.step !== w.step ? i : -1)).filter((i) => i > 0);
      for (let k = 1; k < firsts.length; k++) {
        const d = Math.abs(Math.atan2(Math.sin(angleAt(firsts[k]!) - angleAt(firsts[k - 1]!)), Math.cos(angleAt(firsts[k]!) - angleAt(firsts[k - 1]!))));
        expect(d, `${name} landing ${k}`).toBeLessThan(((perTurn - SERVICE_LANDINGS.perTurn + 0.5) * f.going) / mid);
      }
    }
  });

  it("stops a sector landing's pieces at its forward edge", () => {
    const from = 0.3;
    const angle = 1.2;
    const pieces = sectorLanding([0, 0, 0], [1, 0, 0], [0, 0, 1], 5, from, angle, 0.2, 0.8, 0.42);
    expect(pieces.length).toBe(3);
    // No corner past the forward edge's radial line (counter-clockwise
    // from +x toward +z), and the sector covered to the outer radius.
    const edge = from + angle;
    for (const b of pieces) {
      const z = cross3(b.x, b.y);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const c: Vec3 = [
            b.at[0] + (sx * b.size[0]! * b.x[0] + sz * b.size[2]! * z[0]) / 2,
            0,
            b.at[2] + (sx * b.size[0]! * b.x[2] + sz * b.size[2]! * z[2]) / 2,
          ];
          const past = Math.cos(edge) * c[2] - Math.sin(edge) * c[0];
          expect(past).toBeLessThanOrEqual(1e-9);
        }
    }
    for (let k = 0; k <= 20; k++) {
      const a = from + (angle * k) / 20;
      for (const r of [0.21, 0.5, 0.79]) {
        const p: Vec3 = [r * Math.cos(a), 5 - 0.05, r * Math.sin(a)];
        const inside = pieces.some((b) => {
          const d: Vec3 = [p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]];
          const z = cross3(b.x, b.y);
          return Math.abs(dot3(d, b.x)) <= b.size[0] / 2 + 1e-9 && Math.abs(dot3(d, z)) <= b.size[2] / 2 + 1e-9;
        });
        expect(inside, `angle ${a.toFixed(2)} r ${r}`).toBe(true);
      }
    }
  });

  it("draws a helix's rail within RAIL_SAG of its circle", () => {
    for (const name of ["e1.helix1", "e2.helix", "e3.lower", "summit.campanile"]) {
      const f = flight(name);
      const r = RUNS.find((x) => x.parts.flights.includes(f))!;
      const axis = f.axis!;
      const outer = f.diameter! / 2;
      // Its rail: the one whose points stand on the outer circle round its
      // axis, but for its ends: since 2026-09-26 e1's run on off the circle
      // to the posts of the flights either side (`stairs.ts`
      // firstToSecond), and those last chords are not the circle's.
      const on = (p: Vec3) => Math.abs(Math.hypot(p[0] - axis[0], p[2] - axis[2]) - outer) < 1e-6;
      const rail = r.parts.rails.find((l) => l.length > 10 && l.slice(1, -1).every(on))!;
      expect(rail, name).toBeDefined();
      let worst = 0;
      for (let k = 1; k < rail.length; k++) {
        if (!on(rail[k - 1]!) || !on(rail[k]!)) continue;
        const m = [(rail[k - 1]![0] + rail[k]![0]) / 2 - axis[0], (rail[k - 1]![2] + rail[k]![2]) / 2 - axis[2]];
        worst = Math.max(worst, outer - Math.hypot(m[0]!, m[1]!));
      }
      expect(worst, name).toBeLessThanOrEqual(RAIL_SAG + 1e-9);
      expect(worst, name).toBeGreaterThan(RAIL_SAG / 4);
    }
  });

  it("opens e1's helix rails where a flight crosses the helix's edge", () => {
    const e1 = run("e1");
    for (const f of e1.parts.flights.filter((x) => x.kind === "straight")) {
      // The flight's ends that meet a helix: every point of its band's edge
      // there (a stringer's width either side of the lane) is clear of every
      // rail by the rail's half width.
      const ends = [f.foot, f.head];
      const across: Vec3 = [f.enter[2], 0, -f.enter[0]];
      for (const e of ends) {
        for (const s of [-0.2, 0, 0.2]) {
          const p: Vec3 = [e[0] + across[0] * s, e[1] + 0.9, e[2] + across[2] * s];
          expect(railGap(e1.parts.rails, p), `${f.name} at ${s}`).toBeGreaterThan(0.1);
        }
      }
    }
  });

  it("control: a helix rail left unbroken is in a joining flight's way", () => {
    const f = flight("e1.flight1");
    const h = flight("e1.helix2");
    const r = h.diameter! / 2;
    const closed: Vec3[] = Array.from({ length: 97 }, (_, k) => {
      const a = (k / 96) * 2 * Math.PI;
      return [h.axis![0] + r * Math.cos(a), f.head[1] + 0.9, h.axis![2] + r * Math.sin(a)];
    });
    expect(railGap([closed], [f.head[0], f.head[1] + 0.9, f.head[2]])).toBeLessThan(0.1);
  });
});

/** A cooked mesh's triangles. */
function trianglesOf(geo: Geometry): Array<[Vec3, Vec3, Vec3]> {
  const P = geo.attrs.point.get("P")!.data;
  const pt = (i: number): Vec3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  const out: Array<[Vec3, Vec3, Vec3]> = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    for (let k = 1; k + 1 < n; k++) out.push([pt(geo.vertexToPoint[start]!), pt(geo.vertexToPoint[start + k]!), pt(geo.vertexToPoint[start + k + 1]!)]);
  }
  return out;
}

/** The angle of a world point round the axis in the diagonals' frame (0 toward +s, a quarter turn toward +t), in [0, 2π). */
const angleST = (p: Vec3): number => (((Math.atan2(p[2], p[0]) + Math.PI / 4) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
/** Whether a point lies in a block (its full extent). */
const inBlock = (b: Block, p: Vec3): boolean => {
  const z = cross3(b.x, b.y);
  const q: Vec3 = [p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]];
  return Math.abs(dot3(q, b.x)) <= b.size[0] / 2 + 1e-9 && Math.abs(dot3(q, b.y)) <= b.size[1] / 2 + 1e-9 && Math.abs(dot3(q, z)) <= b.size[2] / 2 + 1e-9;
};

describe("Eiffel stairs: the ways through at the summit", () => {
  let core: Array<[Vec3, Vec3, Vec3]>;
  let deck: Array<[Vec3, Vec3, Vec3]>;
  const lv = summitLevels();
  beforeAll(async () => {
    const g = new Graph(1889);
    buildSummit(g);
    for (const id of ["ladderCylinderSkin", "topDeckSkin"]) g.output({ id } as NodeHandle, "out", id);
    const { outputs } = await cook(g);
    core = trianglesOf(firstGeometry(outputs.ladderCylinderSkin ?? [])!);
    deck = trianglesOf(firstGeometry(outputs.topDeckSkin ?? [])!);
  }, 120_000);

  it("cuts the core's door at the campanile's landing, 2.00 high, over the stair's arrival", () => {
    const [j0, j1] = coreDoorArc();
    expect(CORE_DOOR.height).toBe(2.0);
    const sill = lv.girderTop + STAIR_ENVELOPE.rise;
    expect(lv.campanileLanding).toBeCloseTo(sill, 9);
    // The opening: no triangle's centre inside it, a degree in from its jambs.
    const inArc = (a: number, lo: number, hi: number) => (a - lo + 4 * Math.PI) % (2 * Math.PI) < hi - lo;
    const centre = (t: [Vec3, Vec3, Vec3]): Vec3 => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3, (t[0][2] + t[1][2] + t[2][2]) / 3];
    const d = Math.PI / 180;
    const inDoor = core.filter((t) => {
      const c = centre(t);
      return c[1] > sill + 0.01 && c[1] < sill + CORE_DOOR.height - 0.01 && inArc(angleST(c), j0 + d, j1 - d);
    });
    expect(inDoor.length).toBe(0);
    // Control: the same arc below the sill is the core's sheet.
    const below = core.filter((t) => {
      const c = centre(t);
      return c[1] < sill - 0.01 && inArc(angleST(c), j0 + d, j1 - d);
    });
    expect(below.length).toBeGreaterThan(0);
    // The stair arrives at the door's near jamb, a turn over its first step
    // (PL-XV Fig. 2), and its landing stands in front of the whole door.
    const camp = flight("summit.campanile");
    expect(SUMMIT_STAIRS.campanile.turns).toBe(1);
    const head = angleST(camp.head);
    expect(Math.abs(Math.atan2(Math.sin(head - j0), Math.cos(head - j0)))).toBeLessThan(0.05);
    const landings = run("summit").parts.landings;
    for (let k = 0; k <= 10; k++) {
      const a = j0 + ((j1 - j0) * k) / 10;
      const p: Vec3 = [0.5 * Math.cos(a - Math.PI / 4), lv.campanileLanding - 0.05, 0.5 * Math.sin(a - Math.PI / 4)];
      expect(
        landings.some((b) => inBlock(b, p)),
        `in front of the door at ${a.toFixed(2)}`,
      ).toBe(true);
    }
  });

  it("stands the core's ladder facing -t, its rungs along s, on down to the girders' deck", () => {
    const f = flight("summit.core");
    expect(f.enter[0] - f.enter[2]).toBeCloseTo(0, 9);
    expect(f.enter[0] + f.enter[2]).toBeCloseTo(-Math.SQRT2, 9);
    // Its rungs below the landing are frame, not steps, its first a pitch and a bit over the deck.
    const rungs = run("summit").parts.frame.filter(
      (b) => b.size[0] === b.size[1] && b.size[0] < 0.03 && Math.hypot(b.at[0], b.at[2]) < 0.35 && b.at[1] < lv.campanileLanding + 1e-9,
    );
    expect(rungs.length).toBeGreaterThan(10);
    const lowest = Math.min(...rungs.map((b) => b.at[1]));
    expect(lowest).toBeGreaterThan(lv.girderTop);
    expect(lowest - lv.girderTop).toBeLessThan(1.5 * f.rise);
  });

  it("opens the top platform over the crown ring, the last ladder inside it", () => {
    const radii = deck.flatMap((t) => t.map((p) => Math.hypot(p[0], p[2])));
    expect(Math.min(...radii)).toBeGreaterThan(0.29);
    expect(Math.max(...radii)).toBeCloseTo(0.85, 3);
    // The last ladder and its stiles inside the ring's 0.30.
    const f = flight("summit.top");
    const stiles = run("summit").parts.frame.filter(
      (b) => b.at[1] > lv.cupolaFloor && b.at[1] < lv.platform && Math.hypot(b.at[0], b.at[2]) < 0.4 && b.size[0] > 1,
    );
    expect(stiles.length).toBe(2);
    for (const b of stiles) {
      const z = cross3(b.x, b.y);
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          const c = [b.at[0] + (sy * b.size[1] * b.y[0] + sz * b.size[2] * z[0]) / 2, b.at[2] + (sy * b.size[1] * b.y[2] + sz * b.size[2] * z[2]) / 2];
          expect(Math.hypot(c[0]!, c[1]!)).toBeLessThan(0.297);
        }
    }
    // It rises to the deck's level through it.
    expect(f.head[1]).toBeCloseTo(lv.platform, 9);
  });

  it("closes 83° of the little stair's circle with the floor its head steps onto", () => {
    const f = flight("summit.little");
    const axis = f.axis!;
    const head = Math.atan2(f.head[2] - axis[2], f.head[0] - axis[0]);
    const foot = Math.atan2(f.foot[2] - axis[2], f.foot[0] - axis[0]);
    // The circle it leaves open: the stair's own 277°, foot to head.
    const gap = (((foot - head) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    expect(gap).toBeCloseTo(SUMMIT_STAIRS.little.arrival, 9);
    // The floor over the gap, at the apartment's level, from the head on.
    const floor = run("summit").parts.landings.filter(
      (b) => Math.abs(b.at[1] + 0.05 - lv.apartment) < 1e-9 && Math.hypot(b.at[0] - axis[0], b.at[2] - axis[2]) < 0.8,
    );
    expect(floor.length).toBeGreaterThan(0);
    for (let k = 1; k < 10; k++) {
      const a = head + (gap * k) / 10;
      const p: Vec3 = [axis[0] + 0.5 * Math.cos(a), lv.apartment - 0.05, axis[2] + 0.5 * Math.sin(a)];
      expect(
        floor.some((b) => inBlock(b, p)),
        `floor at ${a.toFixed(2)}`,
      ).toBe(true);
    }
  });
});
