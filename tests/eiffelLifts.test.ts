/**
 * The Eiffel demo's inclined lifts, ridden end to end.
 *
 * `demos/eiffel/lifts.ts` publishes, for every lift car, the line its
 * wheels ride (arc-length parameterised) and where on it the car was
 * built, and the page (`main.ts`) moves each car's mesh by one rigid turn
 * and move from there. This file holds that contract against what the
 * graph actually COOKS:
 *
 * - every leg car's line lies on the rail line of the track the graph
 *   builds for its leg (the Roux's 0.45 over it, its wheels' centres,
 *   which run ON the rail heads and never in them), re-derived here from
 *   the cooked rail boxes rather than taken from the module's own table;
 * - moved the page's way, the cooked car's lower floor stands at each
 *   station's height at the arc length the run names for it — the
 *   rez-de-chaussée (z 1.58), the 1st floor, and for the Otis the 2nd;
 * - the Otis car, one rigid body built level on its decks' own 65.6°
 *   stack (PL-XXII ter Fig. 1), tips by the chord's slope less 65.6° — 11°
 *   back on the 54.6° run, about as far forward high in the leg, as
 *   E1900-TXT p. 135's « 0,20 m par mètre » either way — and the Roux car
 *   stays level on the straight run;
 * - slid along its whole run, no car enters the leg's inner faces or the
 *   diagonal entretoises across the leg.
 *
 * Every comparison that should read zero is first shown to read non-zero
 * on a deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { quadrants } from "../demos/eiffel/lattice.js";
import { type CarRun, LIFT_CARS, buildLifts, carPose } from "../demos/eiffel/lifts.js";
import { ENTRETOISE, FLOORS, NODES, PILES, node, profileAt } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / len3(p));
const DEG = 180 / Math.PI;

/**
 * The book's and the plates' numbers, restated rather than imported so a
 * change to the module has to be a change here too.
 * - The rez-de-chaussée station, altitude 35.08, z 1.58 [PL-XX, PL-XXI].
 * - The Otis decks: floor to floor 2.376, the upper « 1,080 » further in,
 *   so level on atan(2.376 / 1.080) [PL-XXII ter Fig. 1].
 * - The Otis course: 128.61 (68.410 + 60.200, E1900-TXT p. 344, the 1900
 *   lifts on the same legs) to 129.96 (10.83 x 12, PL-XX).
 * - The Roux travel, 66.60 [PL-XXI].
 */
const GROUND = 1.58;
const OTIS_LEVEL = Math.atan2(2.376, 1.08);
const OTIS_COURSE = [128.61, 129.96] as const;
const ROUX_TRAVEL = 66.6;
/**
 * The Roux car's « galets à double boudin de 600 mm de diamètre » [E1900-TXT
 * p. 160] on rails whose heads stand 0.15 over the rail line (lifts.ts
 * `track`): their centres' line, which the car's run rides, 0.45 over it.
 */
const ROUX_RIDE = 0.15 + 0.6 / 2;

/** Leg cars in quadrant order, with their system and their cooked mesh's node id. */
const LEG = PILES.map((p) => {
  const name = `${p.lift}.${p.name.toLowerCase()}`;
  const run = LIFT_CARS.find((r) => r.name === name);
  if (run === undefined) throw new Error(`no run for ${name}`);
  const id = `liftCar${name
    .split(".")
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join("")}`;
  return { k: p.quadrant, system: p.lift, run, id };
});

/** A cooked geometry's points. */
function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const out: Vec3[] = [];
  for (let i = 0; i < geo.pointCount; i++) {
    out.push([P.data[3 * i] as number, P.data[3 * i + 1] as number, P.data[3 * i + 2] as number]);
  }
  return out;
}

/**
 * A mesh of `blocks` boxes read back as boxes: 24 points each, faces of 4
 * in the order +x, -x, +y, -y, +z, -z (meshPrimitive's box). Returns
 * each box's face centres.
 */
function boxes(geo: Geometry): Vec3[][] {
  const P = points(geo);
  if (P.length % 24 !== 0) throw new Error(`${P.length} points is not a whole number of boxes`);
  const out: Vec3[][] = [];
  for (let b = 0; b < P.length; b += 24) {
    const faces: Vec3[] = [];
    for (let f = 0; f < 6; f++) {
      let c: Vec3 = [0, 0, 0];
      for (let v = 0; v < 4; v++) c = add3(c, P[b + 4 * f + v] as Vec3);
      faces.push(mul3(c, 0.25));
    }
    out.push(faces);
  }
  return out;
}

/** Turn p about the unit axis a by `angle`, right-handed: Rodrigues, restated here. */
function turn(p: Vec3, a: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add3(add3(mul3(p, c), mul3(cross3(a, p), s)), mul3(a, dot3(a, p) * (1 - c)));
}

/**
 * The page's move (main.ts `moveCars`), restated: the built mesh turned
 * about the run's axis by the chord's slope at `s` less its slope at `at`,
 * about the built pose's point, and carried onto the pose at `s`.
 */
function mover(run: CarRun, s: number): (p: Vec3) => Vec3 {
  const home = new Float64Array(4);
  const now = new Float64Array(4);
  carPose(run, run.at, home);
  carPose(run, s, now);
  const h: Vec3 = [home[0] as number, home[1] as number, home[2] as number];
  const n: Vec3 = [now[0] as number, now[1] as number, now[2] as number];
  const d = (now[3] as number) - (home[3] as number);
  return (p) => add3(n, turn(sub3(p, h), run.axis, d));
}

/** Quadrant k's frame back to the +x+z leg's: k quarter turns undone. */
function toLeg0(k: number, p: Vec3): Vec3 {
  if (k === 0) return p;
  if (k === 1) return [-p[2], p[1], p[0]];
  if (k === 2) return [-p[0], p[1], -p[2]];
  return [p[2], p[1], -p[0]];
}

/** Distance from p to the segment ab. */
function toSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub3(b, a);
  const u = Math.min(1, Math.max(0, dot3(sub3(p, a), ab) / dot3(ab, ab)));
  return len3(sub3(p, add3(a, mul3(ab, u))));
}

/**
 * The built rail line of every leg, re-derived from the cooked track: the
 * rails are the boxes 0.15 deep and 0.10 wide (lifts.ts `track`), each
 * standing on the rail line at ±half the gauge and overlapping its
 * neighbour by 0.15 at each end. A pair of rails with one tangent is one
 * segment of the line: the mid-point of their bottom faces' centres is the
 * segment's mid-point, and it runs (length - 0.3) / 2 each way along them.
 */
function railSegments(geo: Geometry): Array<[Vec3, Vec3]> {
  const rails = boxes(geo)
    .map((f) => {
      const along = sub3(f[0] as Vec3, f[1] as Vec3);
      const deep = len3(sub3(f[2] as Vec3, f[3] as Vec3));
      const wide = len3(sub3(f[4] as Vec3, f[5] as Vec3));
      return { t: unit3(along), length: len3(along), deep, wide, foot: f[3] as Vec3 };
    })
    .filter((b) => Math.abs(b.deep - 0.15) < 1e-4 && Math.abs(b.wide - 0.1) < 1e-4 && b.length > 1);
  const out: Array<[Vec3, Vec3]> = [];
  const used = new Set<number>();
  for (let i = 0; i < rails.length; i++) {
    if (used.has(i)) continue;
    const a = rails[i] as (typeof rails)[number];
    const j = rails.findIndex(
      (b, jj) => jj !== i && !used.has(jj) && dot3(a.t, b.t) > 1 - 1e-9 && len3(sub3(a.foot, b.foot)) < 4.5,
    );
    if (j < 0) throw new Error(`rail ${i} has no partner`);
    used.add(i);
    used.add(j);
    const mid = mul3(add3(a.foot, (rails[j] as (typeof rails)[number]).foot), 0.5);
    const half = (a.length - 0.3) / 2;
    out.push([sub3(mid, mul3(a.t, half)), add3(mid, mul3(a.t, half))]);
  }
  return out;
}

/** The least distance from p to any segment of a set. */
const toRail = (p: Vec3, segs: ReadonlyArray<readonly [Vec3, Vec3]>): number =>
  Math.min(...segs.map(([a, b]) => toSegment(p, a, b)));

let rail: Record<"otis" | "roux", Array<[Vec3, Vec3]>>;
let carBoxes: Map<string, Vec3[][]>;
/** The Roux track's rail boxes (0.15 deep, 0.10 wide), as face centres. */
let rouxRails: Vec3[][];

beforeAll(async () => {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  buildLifts(g, quads);
  const ids = ["liftOtisTracks", "liftRouxTracks", ...LEG.map((c) => c.id)];
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const geo = (id: string): Geometry => {
    const got = firstGeometry((outputs as Record<string, never>)[`probe:${id}`] ?? []);
    if (got === undefined) throw new Error(`probe ${id} produced no geometry`);
    return got;
  };
  rail = { otis: railSegments(geo("liftOtisTracks")), roux: railSegments(geo("liftRouxTracks")) };
  carBoxes = new Map(LEG.map((c) => [c.id, boxes(geo(c.id))]));
  rouxRails = boxes(geo("liftRouxTracks")).filter(
    (f) => Math.abs(len3(sub3(f[2] as Vec3, f[3] as Vec3)) - 0.15) < 1e-4 && Math.abs(len3(sub3(f[4] as Vec3, f[5] as Vec3)) - 0.1) < 1e-4,
  );
});

/** The lower deck's floor centre (box 0's -y face) of a car, moved to arc length s. */
function floorAt(c: (typeof LEG)[number], s: number): Vec3 {
  const deck = (carBoxes.get(c.id) as Vec3[][])[0] as Vec3[];
  return mover(c.run, s)(deck[3] as Vec3);
}

describe("eiffel lift runs", () => {
  it("re-derives each leg's rail from the cooked track, segment for segment", () => {
    // Otis: basement, XXVIII-XVII and the beam's top, 13 segments per
    // leg; Roux: basement, XXVIII-XXIII and node XXII, 7 (lifts.ts
    // `railLine`); two legs each.
    expect(rail.otis).toHaveLength(2 * 13);
    expect(rail.roux).toHaveLength(2 * 7);
    // Consecutive segments of a leg meet: the line is one polyline.
    for (const segs of Object.values(rail)) {
      for (const [, b] of segs) {
        const next = segs.map(([a]) => len3(sub3(a, b)));
        const top = Math.max(...segs.map(([p, q]) => Math.max(p[1], q[1])));
        if (b[1] < top - 1e-3) expect(Math.min(...next)).toBeLessThan(1e-3);
      }
    }
  });

  it("lays every leg car's line on its own leg's built rail, to a millimetre", () => {
    for (const c of LEG) {
      const segs = rail[c.system].filter(([a]) => dot3(a, c.run.path[0] as Vec3) > 0);
      expect(segs.length, c.run.name).toBe(c.system === "otis" ? 13 : 7);
      // The Roux car rides its running wheels' centres' line, ROUX_RIDE
      // over the rail line; the Otis its axles' points, on it.
      const ride = c.system === "roux" ? ROUX_RIDE : 0;
      for (const p of c.run.path) expect(Math.abs(toRail(p, segs) - ride), c.run.name).toBeLessThan(1e-3);
      // The arc lengths are the line's own.
      for (let i = 1; i < c.run.path.length; i++) {
        const d = len3(sub3(c.run.path[i] as Vec3, c.run.path[i - 1] as Vec3));
        expect((c.run.arc[i] as number) - (c.run.arc[i - 1] as number)).toBeCloseTo(d, 9);
      }
      // Both axles stay on the line from station to station.
      expect(c.run.from - c.run.wheelbase / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(c.run.to + c.run.wheelbase / 2).toBeLessThanOrEqual((c.run.arc[c.run.arc.length - 1] as number) + 1e-9);
    }
    // The comparator can say "different": the same line 5 mm off the rail.
    const c = LEG[1] as (typeof LEG)[number];
    const segs = rail.otis.filter(([a]) => dot3(a, c.run.path[0] as Vec3) > 0);
    const p = c.run.path[3] as Vec3;
    expect(toRail(add3(p, [0, 0.005, 0]), segs)).toBeGreaterThan(1e-3);
  });

  it("rises monotonically, and the lower floor with it", () => {
    for (const c of LEG) {
      const ys = c.run.path.map((p) => p[1]);
      for (let i = 1; i < ys.length; i++) expect(ys[i] as number).toBeGreaterThan(ys[i - 1] as number);
      let last = -Infinity;
      for (let s = c.run.from; s <= c.run.to; s += 0.25) {
        const y = floorAt(c, s)[1];
        expect(y, `${c.run.name} at ${s}`).toBeGreaterThan(last);
        last = y;
      }
    }
  });

  it("stands the lower floor at every station: Roux to the 1st floor, Otis to the 2nd", () => {
    for (const c of LEG) {
      const want = c.system === "otis" ? [GROUND, FLOORS.first, FLOORS.second] : [GROUND, FLOORS.first];
      expect(c.run.stops).toHaveLength(want.length);
      c.run.stops.forEach((s, i) => {
        expect(floorAt(c, s)[1], `${c.run.name} station ${i}`).toBeCloseTo(want[i] as number, 4);
      });
      expect(c.run.from).toBe(c.run.stops[0]);
      expect(c.run.to).toBe(c.run.stops[c.run.stops.length - 1]);
      // At its built arc length the page leaves the mesh exactly as cooked.
      const q: Vec3 = [3, 40, -7];
      expect(len3(sub3(mover(c.run, c.run.at)(q), q))).toBeLessThan(1e-9);
      // And a metre a second, end to end.
      expect(c.run.trip).toBe(Math.round(c.run.to - c.run.from));
    }
    // The comparator can say "different": half a metre short of the top.
    const otis = LEG[1] as (typeof LEG)[number];
    expect(Math.abs(floorAt(otis, otis.run.to - 0.5)[1] - FLOORS.second)).toBeGreaterThan(0.3);
  });

  it("runs the Otis course the book prints, and the Roux within 1.6 m of its travel", () => {
    for (const c of LEG) {
      const course = c.run.to - c.run.from;
      if (c.system === "otis") {
        expect(course).toBeGreaterThan(OTIS_COURSE[0] - 0.5);
        expect(course).toBeLessThan(OTIS_COURSE[1] + 0.5);
      } else {
        // The model's rail bends at XXIV where the leg does; the printed
        // 66.60 reads as a steeper top than the model's (SOURCES.md §11.8).
        expect(Math.abs(course - ROUX_TRAVEL)).toBeLessThan(1.6);
      }
    }
  });

  it("tips the rigid Otis car by the chord's slope less 65.6°, and keeps the Roux level on its straight run", () => {
    const pose = new Float64Array(4);
    const tilt = (c: (typeof LEG)[number], s: number): number => {
      // The cooked lower deck's floor, moved: its +x and -x face centres
      // (its outer and inner ends) give the floor's line along the
      // diagonal; its angle from level, signed so that + is the car
      // tipping forward (its up leaning out, its outer end down). Read
      // along the floor's length, not across its thickness: the floor is a
      // 0.10 slab since the decks became cabins, and f32 points 0.10 apart
      // cannot hold 5e-4°; 3.9 and 4.67 apart they can.
      const deck = (carBoxes.get(c.id) as Vec3[][])[0] as Vec3[];
      const m = mover(c.run, s);
      const along = unit3(sub3(m(deck[0] as Vec3), m(deck[1] as Vec3)));
      const out = unit3([c.run.path[0]?.[0] as number, 0, c.run.path[0]?.[2] as number]);
      return Math.atan2(-along[1], dot3(along, out)) * DEG;
    };
    const lower: number[] = [];
    const upper: number[] = [];
    for (const c of LEG) {
      const h = c.run.wheelbase / 2;
      for (let s = c.run.from; s <= c.run.to; s += 0.5) {
        // Where both axles are on one segment, the chord IS that segment.
        const i = c.run.arc.findIndex((a, j) => j + 1 < c.run.arc.length && a <= s - h && (c.run.arc[j + 1] as number) >= s + h);
        if (i < 0) continue;
        const d = sub3(c.run.path[i + 1] as Vec3, c.run.path[i] as Vec3);
        const slope = Math.atan2(d[1], Math.hypot(d[0], d[2]));
        carPose(c.run, s, pose);
        expect(pose[3] as number).toBeCloseTo(slope, 9);
        const level = c.system === "otis" ? OTIS_LEVEL : Math.atan2(
          (c.run.path[1] as Vec3)[1] - (c.run.path[0] as Vec3)[1],
          Math.hypot((c.run.path[1] as Vec3)[0] - (c.run.path[0] as Vec3)[0], (c.run.path[1] as Vec3)[2] - (c.run.path[0] as Vec3)[2]),
        );
        expect(c.run.level).toBeCloseTo(level, 9);
        const want = (slope - level) * DEG;
        const got = tilt(c, s);
        // To 5e-4°: the floor is read back from f32 points 3.9 or more apart.
        expect(got, `${c.run.name} at ${s.toFixed(1)}`).toBeCloseTo(want, 3);
        if (c.system === "otis" && pose[1]! < 50) lower.push(got);
        if (c.system === "otis" && pose[1]! > 90) upper.push(got);
        // Level to a hundredth of a degree: the five segments under XXIV
        // agree in slope to 1.3e-4 in tan, not exactly (lifts.ts).
        if (c.system === "roux" && pose[1]! < 45) expect(Math.abs(got), c.run.name).toBeLessThan(0.01);
      }
    }
    // About 11° back on the 54.6° run, and forward high in the leg: the
    // book's « 0,20 m par mètre » (11.3°) either way.
    expect(lower.length).toBeGreaterThan(50);
    for (const t of lower) expect(t).toBeCloseTo(-11.0, 1);
    expect(upper.length).toBeGreaterThan(10);
    expect(Math.max(...upper)).toBeGreaterThan(11);
    expect(Math.max(...upper)).toBeLessThan(12);
    // The comparator can say "different": the same deck read at the top
    // station, where the chord is 74.1°, is nowhere near -11.
    const otis = LEG[1] as (typeof LEG)[number];
    expect(Math.abs(tilt(otis, otis.run.to) - -11.0)).toBeGreaterThan(10);
  });

  it("slides every car its whole run clear of the leg's inner faces and entretoises", () => {
    // The members the inner faces carry are 0.80 struts in their plane
    // (legs.ts); the entretoise a 1.20 x 0.7156 girder from d to b, open
    // ±`openHalf` about the diagonal where `openAt` says (spec.ts).
    const STRUT = 0.4;
    const worst = new Map<string, { face: number; ent: number }>();
    for (const c of LEG) {
      // Every box of the car sampled on its faces at 0.3 or closer, finer
      // than the entretoise's 0.7156 depth, so no face can pass through
      // the girder between two samples.
      const samples: Vec3[] = [];
      for (const f of carBoxes.get(c.id) as Vec3[][]) {
        const centre = mul3(add3(f[0] as Vec3, f[1] as Vec3), 0.5);
        const ax = [sub3(f[0] as Vec3, centre), sub3(f[2] as Vec3, centre), sub3(f[4] as Vec3, centre)];
        for (let a = 0; a < 3; a++) {
          const [u, v] = [ax[(a + 1) % 3] as Vec3, ax[(a + 2) % 3] as Vec3];
          const nu = Math.ceil((2 * len3(u)) / 0.3);
          const nv = Math.ceil((2 * len3(v)) / 0.3);
          for (const side of [-1, 1]) {
            for (let i = 0; i <= nu; i++) {
              for (let j = 0; j <= nv; j++) {
                const at = add3(centre, mul3(ax[a] as Vec3, side));
                samples.push(add3(add3(at, mul3(u, (2 * i) / nu - 1)), mul3(v, (2 * j) / nv - 1)));
              }
            }
          }
        }
      }
      let face = Infinity;
      let ent = Infinity;
      const open = c.system === "otis" ? (ENTRETOISE.openAt as readonly string[]) : [];
      for (let s = c.run.from; s <= c.run.to; s += 0.25) {
        const m = mover(c.run, s);
        for (const q of samples) {
          const p = toLeg0(c.k, m(q));
          // The inner faces stand on a's lines x = inner and z = inner,
          // up to XVII, where a ends.
          if (p[1] > 0 && p[1] < node("XVII").y) {
            const { inner } = profileAt(p[1]);
            face = Math.min(face, p[0] - inner, p[2] - inner);
          }
          for (const name of ENTRETOISE.nodes) {
            const n = node(name);
            const dy = Math.abs(p[1] - n.y) - ENTRETOISE.depth / 2;
            const t = (p[0] + p[2]) / Math.SQRT2 - (n.inner + n.outer) / Math.SQRT2;
            const dt = Math.abs(t) - ENTRETOISE.width / 2;
            const across = Math.abs(p[0] - p[2]) / Math.SQRT2;
            if (open.includes(name) && across < ENTRETOISE.openHalf) continue;
            ent = Math.min(ent, Math.max(dy, dt));
          }
        }
      }
      worst.set(c.run.name, { face, ent });
      expect(face, `${c.run.name}: nearest an inner face`).toBeGreaterThan(STRUT);
      expect(ent, `${c.run.name}: nearest an entretoise`).toBeGreaterThan(0);
    }
    expect(NODES.length).toBeGreaterThan(0);
  });
  it("runs the Roux car's wheels ON the rail heads its whole run: never in them, and standing on them where built", () => {
    // A box as centre and half-axes, from its face centres. Its axes are
    // squared up longest first: read straight off a 0.15-deep rail box 13.8
    // long, each from f32 points 3.8 um apart at this height, the depth
    // axis leans ~1e-5 and reads a head exactly under a corner 0.07 mm
    // high at the box's end [measured]; squared to the length's axis, which
    // the box's 13.8 fixes, the reading is good to a few microns.
    const frame = (f: Vec3[]) => {
      const c = mul3(add3(f[0] as Vec3, f[1] as Vec3), 0.5);
      const half = [0, 2, 4].map((i) => mul3(sub3(f[i] as Vec3, f[i + 1] as Vec3), 0.5));
      const ax: Vec3[] = [...half];
      const done: Vec3[] = [];
      for (const i of [0, 1, 2].sort((p, q) => len3(half[q] as Vec3) - len3(half[p] as Vec3))) {
        let v = half[i] as Vec3;
        for (const u of done) v = sub3(v, mul3(u, dot3(v, u)));
        const u = unit3(v);
        done.push(u);
        ax[i] = mul3(u, len3(half[i] as Vec3));
      }
      return { c, ax };
    };
    const rails = rouxRails.map(frame);
    // How far p is inside a rail box (negative: outside, by its worst axis).
    const depth = (p: Vec3) =>
      Math.max(...rails.map((r) => Math.min(...r.ax.map((a) => len3(a) - Math.abs(dot3(sub3(p, r.c), unit3(a)))))));
    // The rim chords: 0.06 deep and 0.09 wide (lifts.ts ROUX_CAR `running`).
    const rimOf = (c: (typeof LEG)[number]) =>
      (carBoxes.get(c.id) as Vec3[][])
        .filter((f) => Math.abs(len3(sub3(f[2] as Vec3, f[3] as Vec3)) - 0.06) < 1e-4 && Math.abs(len3(sub3(f[4] as Vec3, f[5] as Vec3)) - 0.09) < 1e-4)
        .map(frame);
    const corners = (b: ReturnType<typeof frame>, down = 0): Vec3[] => {
      const out: Vec3[] = [];
      for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) {
        out.push(add3(add3(add3(add3(b.c, mul3(b.ax[0] as Vec3, i)), mul3(b.ax[1] as Vec3, j)), mul3(b.ax[2] as Vec3, k)), [0, -down, 0]));
      }
      return out;
    };
    // The deepest rim corner in a head over the run, the page's way.
    const deepest = (run: CarRun, pts: Vec3[], from = run.from): number => {
      let worst = -Infinity;
      for (let s = from; s <= run.to + 1e-9; s += 0.25) {
        const m = mover(run, s);
        for (const p of pts) worst = Math.max(worst, depth(m(p)));
      }
      return worst;
    };
    // ON, to the rounding: each wheel's centre is on the run's line and its
    // rim's corners on its circle (lifts.ts carBody), so a corner reaches
    // the head and no further. Read 3 um at worst [measured]; 0.02 mm is
    // the f32 rounding of a corner and a head read as above, with room.
    const ON = 2e-5;
    const roux = LEG.filter((c) => c.system === "roux");
    expect(roux).toHaveLength(2);
    for (const c of roux) {
      const rim = rimOf(c);
      // Four wheels.
      expect(rim.length % 4, c.run.name).toBe(0);
      expect(rim.length, c.run.name).toBeGreaterThanOrEqual(4 * 36);
      const pts = rim.flatMap((b) => corners(b));
      expect(deepest(c.run, pts), `${c.run.name}: deepest rim corner in a rail head over the run`).toBeLessThan(ON);
      // Where it is built, every wheel stands on its head: a corner points
      // straight down onto it.
      const wheels: Vec3[][] = [];
      for (const b of rim) {
        const w = wheels.find((q) => len3(sub3(q[0] as Vec3, b.c)) < 0.7);
        if (w === undefined) wheels.push([b.c, ...corners(b)]);
        else w.push(...corners(b));
      }
      expect(wheels).toHaveLength(4);
      for (const w of wheels) expect(Math.max(...w.slice(1).map(depth)), c.run.name).toBeGreaterThan(-ON);
    }
    // The comparator can say "in", at this resolution: the same rims 0.1 mm
    // lower (0.06 mm square to the 54.6° rail), where built.
    const c = roux[0] as (typeof LEG)[number];
    const low = rimOf(c).flatMap((b) => corners(b, 1e-4));
    expect(Math.max(...low.map(depth))).toBeGreaterThan(ON);
    // And the axles' spacing is what holds the wheels up over the top bend:
    // the same car with its axles an arc length apart, not a chord, stands
    // its rigid wheelbase's ends past them, off the line, into the heads.
    const byArc: CarRun = { ...c.run, chordSpan: false };
    expect(deepest(byArc, rimOf(c).flatMap((b) => corners(b)), 60)).toBeGreaterThan(1e-3);
  });

  it("passes every car through the floors' lift wells", () => {
    // platforms.ts `LIFT_OPENINGS`, restated: slots on the leg's diagonal,
    // t out from the axis, `half` either side. The 1st deck's in every leg,
    // the 2nd's in the Otis legs; each deck 0.60 deep under its floor. The
    // band of t tested is the decks' own, near the well: 17-46 at the 1st
    // floor (from the void's corner to the deck's edge), 8-25 at the 2nd.
    const slot = (t0: number, t1: number, half: number) => ({ t0, t1, half });
    const decks = [
      {
        y: FLOORS.first,
        band: [17, 46],
        wells: [slot(24.6, 25.3, 0.7), slot(25.3, 26.0, 1.4), slot(26.0, 26.52, 2.1), slot(26.52, 31.3, 2.62), slot(31.3, 32.4, 1.9)],
      },
      {
        y: FLOORS.second,
        band: [8, 25],
        wells: [slot(10.3, 12.55, 2.02), slot(12.55, 12.97, 2.33), slot(12.97, 16.25, 2.665), slot(16.25, 16.83, 2.1)],
      },
    ] as const;
    for (const c of LEG) {
      // Every box sampled through its volume, 11 x 11 x 11.
      const pts: Vec3[] = [];
      for (const f of carBoxes.get(c.id) as Vec3[][]) {
        const centre = mul3(add3(f[0] as Vec3, f[1] as Vec3), 0.5);
        const ax = [sub3(f[0] as Vec3, centre), sub3(f[2] as Vec3, centre), sub3(f[4] as Vec3, centre)] as const;
        for (let i = 0; i <= 10; i++) {
          for (let j = 0; j <= 10; j++) {
            for (let l = 0; l <= 10; l++) {
              pts.push(add3(add3(add3(centre, mul3(ax[0], i / 5 - 1)), mul3(ax[1], j / 5 - 1)), mul3(ax[2], l / 5 - 1)));
            }
          }
        }
      }
      for (let s = c.run.from; s <= c.run.to; s += 0.25) {
        const m = mover(c.run, s);
        for (const q of pts) {
          const p = toLeg0(c.k, m(q));
          const t = (p[0] + p[2]) / Math.SQRT2;
          const across = Math.abs(p[0] - p[2]) / Math.SQRT2;
          for (const d of decks) {
            if (c.system === "roux" && d.y === FLOORS.second) continue;
            if (p[1] < d.y - 0.6 || p[1] > d.y || t < d.band[0] || t > d.band[1]) continue;
            if (d.wells.some((w) => t > w.t0 && t < w.t1 && across < w.half)) continue;
            // Outside every well, inside the deck.
            expect.fail(`${c.run.name} ${d.y}: at s ${s.toFixed(2)}, t ${t.toFixed(2)}, ${across.toFixed(2)} across, y ${p[1].toFixed(2)}`);
          }
        }
      }
    }
  });
});
