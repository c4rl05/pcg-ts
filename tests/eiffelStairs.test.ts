/**
 * The Eiffel demo's stairs, counted against the book: all 1,710 steps.
 *
 * `demos/eiffel/stairs.ts` builds the climb of 1889 from the ground to the
 * top platform, run by run, and `lifts.ts` places it. This file holds it
 * to its sources:
 *
 * - THE COUNT. E1900-TXT p. 304's table of the climb on foot: 347 to the
 *   1st floor, 327 to the 2nd, 456 to the intermediate landing, 455 to the
 *   3rd, 125 to the summit, 1,710 in all [sourced]. A step is a riser (a
 *   ladder's rung pitch); the model's runs are built to those rows.
 * - THE FLIGHTS THE PLATES FIX, restated here rather than imported:
 *   PL-XXVIII's T3 (24 risers in 3.8366 on a 6.020 run) and T4 (21 in
 *   3.3268 on 5.220), four repeats a leg, 1.00 wide; e1's joining flights,
 *   11 risers of 0.207 on 0.255 treads, its helices Ø 1.60 on 0.64 treads
 *   at 0.178 [E1900-TXT p. 81]; e2's « 16 marches 2.92 » and « 5 marches
 *   0.91 » after its helix stops at (225.60), Ø 1.600 on 0.600 treads; e3's
 *   « 314 marches sur une hauteur de 54m88 » and its raccord's « 13
 *   marches », « 2.327 », Ø 1.680 [PL-XX Figs 1-2]; the campanile's « 22
 *   marches de 178 = 3.916 », 1.980 across [PL-XV Fig. 2]; the little
 *   stair's 1.60 [PL-XIX Fig. 6]. Where the count, not a plate, sets a
 *   riser, it must stay within the stated band of the book's own riser.
 * - THE LEVELS. Each run starts on its floor and ends on the next, at the
 *   printed cotes less 33.50: ground 35.08, 1st 91.13, 2nd 149.23, landing
 *   229.43, 3rd 309.63, top platform 334.015.
 * - EVERY FOOT AND HEAD ON SOMETHING. Every flight's foot, a step behind
 *   it, and its head, a step past it, stand on a walkable surface at their
 *   level: a deck, floor, roof or girder top the graph cooks, or a
 *   landing or tread of the stair's own. A ladder's may be beside it, as a
 *   climber steps off sideways.
 * - WHAT THE GRAPH COOKS. The cooked tread meshes hold exactly the treads
 *   the runs list, copied onto their legs.
 *
 * The clearance of the stairs against the rest of the tower and the lift
 * cars is `eiffelStairsClearance.test.ts`'s.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { quadrants } from "../demos/eiffel/lattice.js";
import { buildLifts } from "../demos/eiffel/lifts.js";
import { buildPlatforms } from "../demos/eiffel/platforms.js";
import { type Block, type Flight, type StairRun, stairRuns, stepsOf } from "../demos/eiffel/stairs.js";
import { buildSummit } from "../demos/eiffel/summit.js";

type Vec3 = readonly [number, number, number];

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const flat = (p: Vec3): number => Math.hypot(p[0], p[2]);

/** The book's rows [E1900-TXT p. 304], restated. */
const BOOK = { ground: 347, e1: 327, e2: 456, e3: 455, summit: 125 } as const;
const CUMULATIVE = [347, 674, 1130, 1585, 1710] as const;
/** The levels, as printed cotes less 33.50. */
const y = (cote: number) => cote - 33.5;
const LEVEL = {
  ground: y(35.08),
  first: y(91.13),
  second: y(149.23),
  landing: y(229.43),
  third: y(309.63),
  top: y(334.015),
} as const;

const RUNS = stairRuns();
const run = (key: StairRun["key"]): StairRun => {
  const r = RUNS.find((x) => x.key === key);
  if (r === undefined) throw new Error(`no run ${key}`);
  return r;
};
const flight = (name: string): Flight => {
  for (const r of RUNS) {
    const f = r.parts.flights.find((x) => x.name === name);
    if (f !== undefined) return f;
  }
  throw new Error(`no flight ${name}`);
};
const flightsOf = (key: StairRun["key"], re: RegExp): Flight[] => run(key).parts.flights.filter((f) => re.test(f.name));

describe("Eiffel stairs: the count", () => {
  it("counts every run to its row of the book, 1,710 in all", () => {
    const got = RUNS.map((r) => [r.key, stepsOf(r.parts)] as const);
    expect(Object.fromEntries(got)).toEqual(BOOK);
    let sum = 0;
    const cumulative = RUNS.map((r) => (sum += stepsOf(r.parts)));
    expect(cumulative).toEqual([...CUMULATIVE]);
    // The runs climb in order, each from the level the last reached.
    expect(RUNS.map((r) => r.key)).toEqual(["ground", "e1", "e2", "e3", "summit"]);
    // Control: a run one step short is seen.
    expect(stepsOf({ flights: run("e2").parts.flights.slice(1) })).not.toBe(BOOK.e2);
  });

  it("builds one tread per step, less the steps a slab takes", () => {
    for (const r of RUNS) {
      const slabbed = r.parts.flights.filter((f) => f.slab).length;
      expect(r.parts.treads.length, r.key).toBe(stepsOf(r.parts) - slabbed);
    }
  });
});

describe("Eiffel stairs: the flights the plates fix", () => {
  it("keeps PL-XXVIII's running part: T3 24 in 3.8366 on 6.020, T4 21 in 3.3268 on 5.220, four repeats", () => {
    const t3 = flightsOf("ground", /^ground\.p\d\.t3[ab]$/);
    const t4 = flightsOf("ground", /^ground\.p\d\.t4$/);
    expect(t3.length).toBe(8);
    expect(t4.length).toBe(4);
    for (const f of t3) {
      expect(f.risers).toBe(24);
      expect(f.risers * f.rise).toBeCloseTo(3.8366, 9);
      expect(flat(sub3(f.head, f.foot))).toBeCloseTo(6.02, 9);
    }
    for (const f of t4) {
      expect(f.risers).toBe(21);
      expect(f.risers * f.rise).toBeCloseTo(3.3268, 9);
      expect(flat(sub3(f.head, f.foot))).toBeCloseTo(5.22, 9);
    }
    // 276 of the 347; the start and the arrival close the count.
    expect([...t3, ...t4].reduce((n, f) => n + f.risers, 0)).toBe(276);
    const g = run("ground").parts.flights;
    for (const f of g) {
      expect(f.width, f.name).toBe(1.0);
      // PL-XXVIII's 0.15933, the landing steps' 0.172 and 0.1498, and the
      // start and arrival the count closes: 0.155-0.180.
      expect(f.rise, f.name).toBeGreaterThan(0.155);
      expect(f.rise, f.name).toBeLessThan(0.18);
      // The stair's treads, « de 250 »: every going 0.249-0.251.
      expect(Math.abs(f.going - 0.25), f.name).toBeLessThan(0.0015);
    }
  });

  it("keeps e1's joining flights, 11 of 0.207 on 0.255, and its helices Ø 1.60 on 0.64 at about 0.178", () => {
    const joins = flightsOf("e1", /^e1\.flight\d$/);
    expect(joins.length).toBe(4);
    for (const f of joins) {
      expect(f.risers).toBe(11);
      expect(f.rise).toBeCloseTo(0.207, 9);
      // The first is 0.263: its helices stand further apart than 2.805 plus a diameter.
      expect(Math.abs(f.going - 0.255), f.name).toBeLessThan(0.01);
    }
    const helices = flightsOf("e1", /^e1\.helix\d$/);
    expect(helices.length).toBe(5);
    for (const f of helices) {
      expect(f.diameter).toBe(1.6);
      expect(f.width).toBe(0.64);
      // The count sets them 3% under the printed 178.
      expect(Math.abs(f.rise / 0.178 - 1), f.name).toBeLessThan(0.04);
    }
    const top = flight("e1.top");
    expect(top.risers).toBe(19);
    expect(top.rise).toBeCloseTo(0.178, 9);
  });

  it("keeps e2's helix to (225.60) and its « 16 marches 2.92 », « 5 marches 0.91 »", () => {
    const h = flight("e2.helix");
    expect(h.diameter).toBe(1.6);
    expect(h.width).toBe(0.6);
    expect(h.head[1]).toBeCloseTo(y(225.6), 9);
    expect(Math.abs(h.rise / 0.178 - 1)).toBeLessThan(0.02);
    const up = flight("e2.up");
    expect([up.risers, up.risers * up.rise]).toEqual([16, expect.closeTo(2.92, 9)]);
    const back = flight("e2.back");
    expect(back.risers).toBe(5);
    // The two close on the landing: 3.83 = 2.92 + 0.91.
    expect(back.risers * back.rise).toBeCloseTo(0.91, 9);
  });

  it("keeps e3's « 314 marches sur 54m88 », the raccord's 13 in 2.327, Ø 1.680", () => {
    const lower = flight("e3.lower");
    expect(lower.risers).toBe(314);
    expect(lower.risers * lower.rise).toBeCloseTo(54.88, 9);
    expect(lower.diameter).toBe(1.68);
    const rc = flight("e3.raccord");
    expect(rc.risers).toBe(13);
    expect(rc.risers * rc.rise).toBeCloseTo(2.327, 9);
    const upper = flight("e3.upper");
    expect(upper.diameter).toBe(1.68);
    expect(Math.abs(upper.rise / 0.178 - 1)).toBeLessThan(0.02);
  });

  it("keeps the campanile's « 22 marches de 178 = 3.916 », 1.980 across, and the little stair's 1.60", () => {
    const c = flight("summit.campanile");
    expect(c.risers).toBe(22);
    expect(c.rise).toBeCloseTo(0.178, 9);
    expect(c.diameter).toBeCloseTo(1.98, 9);
    expect(flat(c.axis as Vec3)).toBe(0);
    const little = flight("summit.little");
    expect(little.diameter).toBe(1.6);
    expect(little.risers * little.rise).toBeCloseTo(2.58, 9);
    // The steep stairs and ladders the count sets: one pitch, 0.20-0.21.
    for (const name of ["summit.gallery", "summit.roof", "summit.girder", "summit.core", "summit.mobile", "summit.top"]) {
      const f = flight(name);
      expect(f.rise, name).toBeGreaterThan(0.2);
      expect(f.rise, name).toBeLessThan(0.21);
    }
  });

  it("puts every spiral's treads inside its diameter and out to it", () => {
    for (const r of RUNS) {
      // A spiral's treads are the boxes whose x points away from its axis
      // and that span its walking line. (Their centres stood on the walking
      // line until 2026-09-26, when the treads were taken in to the newel,
      // `stairs.ts` spiral's `inner`: the walking line stayed.)
      for (const f of r.parts.flights.filter((x) => x.kind === "spiral")) {
        const a = f.axis as Vec3;
        const walk = ((f.diameter as number) - f.width) / 2;
        const own = r.parts.treads.filter((b) => {
          if (b.at[1] < f.foot[1] - 0.1 || b.at[1] > f.head[1] + 0.1) return false;
          const d: Vec3 = [b.at[0] - a[0], 0, b.at[2] - a[2]];
          return Math.abs(flat(d) - walk) <= b.size[0] / 2 - f.width / 2 + 1e-6 && Math.abs(dot3(d, b.x) - flat(d)) < 1e-6;
        });
        expect(own.length, f.name).toBeGreaterThanOrEqual(f.risers - 1);
        const reach = Math.max(...own.map((b) => flat([b.at[0] - a[0], 0, b.at[2] - a[2]]) + b.size[0] / 2));
        expect(2 * reach, f.name).toBeCloseTo(f.diameter as number, 9);
      }
    }
  });
});

// ------------------------------------------------------------ feet and heads

/** A cooked geometry's polygons fanned into triangles. */
function triangles(geo: Geometry): Array<[Vec3, Vec3, Vec3]> {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const at = (i: number): Vec3 => [P.data[3 * i] as number, P.data[3 * i + 1] as number, P.data[3 * i + 2] as number];
  const out: Array<[Vec3, Vec3, Vec3]> = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const n = geo.primVertexCount[p] as number;
    if (n < 3) continue;
    const v = (k: number) => at(geo.vertexToPoint[start + k] as number);
    for (let k = 1; k + 1 < n; k++) out.push([v(0), v(k), v(k + 1)]);
  }
  return out;
}

/** Level triangles, binned on a 1 m plan grid, for "what stands under this point". */
class Surfaces {
  private readonly cells = new Map<string, Array<[Vec3, Vec3, Vec3]>>();
  add(t: [Vec3, Vec3, Vec3]): void {
    const n = cross3(sub3(t[1], t[0]), sub3(t[2], t[0]));
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len < 1e-12 || Math.abs(n[1]) / len < 0.95) return;
    const xs = t.map((p) => p[0]);
    const zs = t.map((p) => p[2]);
    for (let i = Math.floor(Math.min(...xs)); i <= Math.floor(Math.max(...xs)); i++) {
      for (let j = Math.floor(Math.min(...zs)); j <= Math.floor(Math.max(...zs)); j++) {
        const k = `${i},${j}`;
        const list = this.cells.get(k);
        if (list === undefined) this.cells.set(k, [t]);
        else list.push(t);
      }
    }
  }
  /** Is there a level surface within `tol` of p's height under p (in plan, within `reach`)? */
  under(p: Vec3, tol: number, reach = 0): boolean {
    for (let i = Math.floor(p[0] - reach); i <= Math.floor(p[0] + reach); i++) {
      for (let j = Math.floor(p[2] - reach); j <= Math.floor(p[2] + reach); j++) {
        for (const t of this.cells.get(`${i},${j}`) ?? []) {
          if (Math.abs(t[0][1] - p[1]) > tol) continue;
          if (reach === 0 ? inTri(p, t) : nearTri(p, t, reach)) return true;
        }
      }
    }
    return false;
  }
}

/** p inside triangle t, in plan. */
function inTri(p: Vec3, t: readonly [Vec3, Vec3, Vec3]): boolean {
  const s = (a: Vec3, b: Vec3) => (b[0] - a[0]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[0] - a[0]);
  const d0 = s(t[0], t[1]);
  const d1 = s(t[1], t[2]);
  const d2 = s(t[2], t[0]);
  return (d0 >= -1e-12 && d1 >= -1e-12 && d2 >= -1e-12) || (d0 <= 1e-12 && d1 <= 1e-12 && d2 <= 1e-12);
}

/** p within `reach` of triangle t, in plan (by its vertices, its edges' midpoints and containment). */
function nearTri(p: Vec3, t: readonly [Vec3, Vec3, Vec3], reach: number): boolean {
  if (inTri(p, t)) return true;
  for (let k = 0; k < 3; k++) {
    const a = t[k] as Vec3;
    const b = t[(k + 1) % 3] as Vec3;
    const ab = sub3(b, a);
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[2] - a[2]) * ab[2]) / (ab[0] * ab[0] + ab[2] * ab[2] || 1)));
    if (Math.hypot(a[0] + ab[0] * u - p[0], a[2] + ab[2] * u - p[2]) <= reach) return true;
  }
  return false;
}

/** A box's top face as two triangles. */
function topOf(b: Block): Array<[Vec3, Vec3, Vec3]> {
  const z = cross3(b.x, b.y);
  const c = add3(b.at, mul3(b.y, b.size[1] / 2));
  const hx = mul3(b.x, b.size[0] / 2);
  const hz = mul3(z, b.size[2] / 2);
  const q = [add3(add3(c, hx), hz), add3(sub3(c, hx), hz), sub3(sub3(c, hx), hz), sub3(add3(c, hx), hz)] as const;
  return [
    [q[0], q[1], q[2]],
    [q[0], q[2], q[3]],
  ];
}

describe("Eiffel stairs: every run on its floors", () => {
  let floors: Surfaces;
  let cooked: Record<string, Geometry>;

  beforeAll(async () => {
    const g = new Graph(1889);
    const quads = quadrants(g, "quad");
    const lifts = buildLifts(g, quads);
    const parts = [buildPlatforms(g, quads), buildSummit(g)];
    const names: string[] = [];
    let n = 0;
    for (const p of parts) {
      for (const [cls, list] of Object.entries(p)) {
        // The mesh classes: the instanced and moving ones are not floors.
        if (["rivets", "fittings", "cars", "chains", "cloth"].includes(cls) || !Array.isArray(list)) continue;
        for (const h of list as NodeHandle[]) {
          const name = `f${n++}`;
          g.output(h, "out", name);
          names.push(name);
        }
      }
    }
    void lifts;
    const probes = RUNS.flatMap((r) => {
      const name = r.key[0]!.toUpperCase() + r.key.slice(1);
      return r.legs === "world" ? [`liftStair${name}Treads`] : [`liftStair${name}Treads`, `liftStair${name}TreadsLegs`];
    });
    for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    floors = new Surfaces();
    for (const name of names) {
      const geo = firstGeometry(outputs[name] ?? []);
      if (geo !== undefined) for (const t of triangles(geo)) floors.add(t);
    }
    cooked = {};
    for (const id of probes) {
      const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
      if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
      cooked[id] = geo;
    }
  }, 300_000);

  it("starts and ends each run at its printed levels", () => {
    const levels: Record<StairRun["key"], readonly [number, number]> = {
      ground: [LEVEL.ground, LEVEL.first],
      e1: [LEVEL.first, LEVEL.second],
      e2: [LEVEL.second, LEVEL.landing],
      e3: [LEVEL.landing, LEVEL.third],
      summit: [LEVEL.third, LEVEL.top],
    };
    for (const r of RUNS) {
      const f = r.parts.flights;
      expect((f[0] as Flight).foot[1], r.key).toBeCloseTo(levels[r.key][0], 9);
      expect((f[f.length - 1] as Flight).head[1], r.key).toBeCloseTo(levels[r.key][1], 9);
      expect(r.from, r.key).toBeCloseTo(levels[r.key][0], 9);
      expect(r.to, r.key).toBeCloseTo(levels[r.key][1], 9);
    }
  });

  it("stands every flight's foot and head on a floor, a landing or a tread", () => {
    const misses: string[] = [];
    for (const r of RUNS) {
      // The run's own landings and treads, in its own frame (the leg runs'
      // floors are read in pile 4's leg, where they are built: every leg's
      // decks are the same turned).
      // A world run's are read with the other world runs', where one hands
      // over to the next (e3's last tread is the little stair's first floor).
      const own = new Surfaces();
      const with_ = r.legs === "world" ? RUNS.filter((x) => x.legs === "world") : [r];
      for (const x of with_) for (const b of [...x.parts.landings, ...x.parts.treads]) for (const t of topOf(b)) own.add(t);
      const on = (p: Vec3, reach = 0) => own.under(p, 0.01, reach) || floors.under(p, 0.02, reach);
      for (const f of r.parts.flights) {
        // Within a step of each end, in plan, a surface at its level: a
        // flight's first tread overhangs the landing it leaves by its
        // nosing, and the decks' openings stand a stringer's clearance past
        // the last riser; a ladder is stepped off sideways. The ground
        // stair starts on the rez-de-chaussée, which is the ground, inside
        // the pedestal the model builds solid.
        const reach = f.kind === "ladder" ? 0.6 : 0.35;
        const footOk = f.name === "ground.start" || on(f.foot, reach);
        const headOk = on(f.head, reach);
        if (!footOk) misses.push(`${f.name} foot ${f.foot.map((v) => v.toFixed(2)).join(", ")}`);
        if (!headOk) misses.push(`${f.name} head ${f.head.map((v) => v.toFixed(2)).join(", ")}`);
      }
    }
    expect(misses).toEqual([]);
    // Controls: a point in the air is on nothing; e1's last flight, whose
    // head is on the 2nd floor's deck within a step, is on nothing 0.6
    // higher, nor 30 m out, beyond the floor's edge.
    expect(floors.under([0, 150, 0], 0.02)).toBe(false);
    const top = flight("e1.top");
    expect(floors.under(top.head, 0.02, 0.35)).toBe(true);
    expect(floors.under(add3(top.head, [0, 0.6, 0]), 0.02, 0.35)).toBe(false);
    expect(floors.under(add3(top.head, mul3(top.leave, -30)), 0.02, 0.35)).toBe(false);
  });

  it("cooks exactly the treads the runs list, on every leg they are copied to", () => {
    for (const r of RUNS) {
      const name = r.key[0]!.toUpperCase() + r.key.slice(1);
      const one = cooked[`liftStair${name}Treads`] as Geometry;
      expect(one.pointCount, r.key).toBe(24 * r.parts.treads.length);
      if (r.legs !== "world") {
        const all = cooked[`liftStair${name}TreadsLegs`] as Geometry;
        expect(all.pointCount, r.key).toBe(24 * r.parts.treads.length * r.legs.length);
      }
    }
    // One climb, a leg's ground and e1 and the shaft and summit: its
    // treads plus the steps slabs take are the book's 1,710.
    const climb = RUNS.reduce((n, r) => n + r.parts.treads.length + r.parts.flights.filter((f) => f.slab).length, 0);
    expect(climb).toBe(1710);
  });
});
