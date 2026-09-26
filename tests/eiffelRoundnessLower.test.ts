/**
 * How round the tower's lower and machine parts are drawn (demos/eiffel):
 * every segment count that is smoothness rather than structure is derived
 * from its part's radius and `chord.ts`' tolerance for where the part is
 * seen from (`SAG`: eye 3 mm, near 5 mm, far 15 mm), and the counts that
 * are the structure's own — the chimney's merlons, the wheels' spokes, the
 * dome's panels, the lantern's decagons — are left as the sources give
 * them. Measured on the generated outlines where the module hands them
 * out, else on the counts it exports:
 *
 * - the machine room's cylinders and the earthing pipes (`cylinder`, a
 *   polygon with its flats on the circle): corners within SAG.eye;
 * - the chimney: its staves within SAG.eye, still 8 merlons and 8 crenels;
 * - the sabots' rounded corners within SAG.eye, the caissons' within
 *   SAG.far;
 * - the lifts' wheel rims and tubes (`LIFT_ROUNDS`);
 * - the dome's chords within SAG.far of the 7.435 arc, on the plate's 9
 *   panels a quarter; the cupola's normals tilting with its sphere; the
 *   lantern's decagons shading flat;
 * - the arches' ironwork: frame arcs and volute spirals, the bar's outer
 *   edge within CURVE_SAG;
 * - the arcade's round heads (`arcadeOpenings`) and the fillets;
 * - the page's instanced fittings (`FITTING_SEGMENTS`).
 */
import { describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { SAG, arcSegments } from "../demos/eiffel/chord.js";
import { cylinder, CAISSON, CAISSON_CORNER_CHORDS, CHIMNEY, CHIMNEY_STAVES, PLANT, SUPPORT, caissonPrisms, earthingPipes, flatsSides, machineRoomPrisms, supportFrames, supportPieces } from "../demos/eiffel/ground.js";
import { LIFT_ROUNDS, RIM_CHORDS_MIN } from "../demos/eiffel/lifts.js";
import { DOME_CHORD_SPLIT, buildSummit, lanternLevels } from "../demos/eiffel/summit.js";
import { CURVE_SAG, FRAME_WIDTH, VOLUTES, VOLUTE_END, VOLUTE_WIDTH, segmentDistance, spiralEye, trace } from "../demos/eiffel/ironwork.js";
import { ARCADE_SAG, arcadeArcSegments, arcadeOpenings, bandIronwork } from "../demos/eiffel/firstFloor.js";
import { BALUSTER_RADIUS, CABOCHON_BASE, FITTING_SEGMENTS, GLOBE_RADIUS, cabochonSphere } from "../demos/eiffel/fittingSegments.js";

type Vec3 = readonly [number, number, number];
type Pt = readonly [number, number];

/** Slack for floating point on a tolerance comparison, in metres. */
const EPS = 1e-9;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const centroid = (ps: readonly Vec3[]): Vec3 => {
  const s = ps.reduce<[number, number, number]>((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  return [s[0] / ps.length, s[1] / ps.length, s[2] / ps.length];
};

/** A chord of length L on radius r: how far it stands inside the arc. */
const chordSag = (r: number, L: number) => r - Math.sqrt(Math.max(0, r * r - (L * L) / 4));

/**
 * A regular polygon outline's corner excess over the circle its flats lie
 * on (a `cylinder`'s): R (1 − cos(π/n)), R its corner radius. Undefined
 * for an outline that is not a regular polygon of 12 or more sides.
 */
function polygonExcess(outline: readonly Vec3[]): { n: number; d: number; excess: number } | undefined {
  const n = outline.length;
  if (n < 12) return undefined;
  const c = centroid(outline);
  const radii = outline.map((p) => len(sub(p, c)));
  const R = radii[0]!;
  if (radii.some((r) => Math.abs(r - R) > 1e-9 * Math.max(1, R))) return undefined;
  const flats = R * Math.cos(Math.PI / n);
  return { n, d: 2 * flats, excess: R - flats };
}

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P[i]!, P[i + 1]!, P[i + 2]!]);
  return out;
}

function normals(geo: Geometry): Vec3[] {
  const N = geo.attrs.point.get("normal")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([N[i]!, N[i + 1]!, N[i + 2]!]);
  return out;
}

describe("the ground's round parts", () => {
  it("cuts every cylinder of the plant and the earthing pipes within SAG.eye, by its own diameter", () => {
    const list = [...machineRoomPrisms().plant, ...earthingPipes()];
    const round = list.map((p) => polygonExcess(p.outline)).filter((x) => x !== undefined);
    expect(round.length).toBeGreaterThan(20);
    for (const r of round) {
      expect(r.excess).toBeLessThanOrEqual(SAG.eye + EPS);
      // The fewest that do: one step coarser (4 fewer) would not, unless at the floor.
      if (r.n > 12) expect((r.d / 2) * (1 / Math.cos(Math.PI / (r.n - 4)) - 1)).toBeGreaterThan(SAG.eye * Math.cos(Math.PI / 12));
    }
    // The flywheel (3.20) is the largest and the finest.
    const fly = round.find((r) => Math.abs(r.d - PLANT.flywheel) < 1e-9);
    expect(fly?.n).toBe(flatsSides(PLANT.flywheel));
    expect(fly!.n).toBeGreaterThan(24);
    // Control: the flywheel at its old 24 sides stands 14 mm proud.
    expect(polygonExcess(cylinder([0, 0, 0], [0, 1, 0], PLANT.flywheel, 24).outline)!.excess).toBeGreaterThan(0.013);
  });

  it("staves the chimney within SAG.eye and keeps its crown's 8 merlons and 8 crenels", () => {
    expect(CHIMNEY_STAVES % CHIMNEY.crown.merlons).toBe(0);
    const [cx, cz] = CHIMNEY.at;
    const mine = machineRoomPrisms().foundations.filter((p) => {
      const c = centroid(p.outline);
      return Math.hypot(c[0] - cx, c[2] - cz) < 2;
    });
    // The footing: the widest circle, a CHIMNEY_STAVES-gon.
    const footing = mine.map((p) => polygonExcess(p.outline)).filter((x) => x !== undefined);
    expect(footing).toHaveLength(1);
    expect(footing[0]!.n).toBe(CHIMNEY_STAVES);
    expect(footing[0]!.excess).toBeLessThanOrEqual(SAG.eye + EPS);
    // Every stave: its outer face a trapezoid whose corners stand off the
    // chord's middle by the circle's excess, at foot and head.
    const staves = mine.filter((p) => p.outline.length === 4);
    expect(staves.length).toBeGreaterThan(8 * CHIMNEY_STAVES);
    let worst = 0;
    for (const s of staves) {
      const [a, b, c, d] = s.outline;
      for (const [p, q] of [[a!, b!], [c!, d!]] as const) {
        if (Math.abs(p[1] - q[1]) > 1e-9) continue;
        const m: Vec3 = [(p[0] + q[0]) / 2, p[1], (p[2] + q[2]) / 2];
        const rc = Math.hypot(p[0] - cx, p[2] - cz);
        worst = Math.max(worst, rc - Math.hypot(m[0] - cx, m[2] - cz));
      }
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(SAG.eye + EPS);
    // The parapet's upper half: whole runs of staves on 8 of the 16 slots,
    // every other one.
    const top = Math.max(...staves.flatMap((s) => s.outline.map((p) => p[1])));
    const crenellated = staves.filter((s) => Math.min(...s.outline.map((p) => p[1])) > top - CHIMNEY.crown.parapet / 2 - 1e-6);
    expect(crenellated).toHaveLength(CHIMNEY_STAVES / 2);
    const slot = (s: (typeof staves)[number]) => {
      const c = centroid(s.outline);
      const a = (Math.atan2(c[2] - cz, c[0] - cx) + 2 * Math.PI) % (2 * Math.PI);
      return Math.floor(a / ((2 * Math.PI) / CHIMNEY.crown.merlons));
    };
    const slots = new Map<number, number>();
    for (const s of crenellated) slots.set(slot(s), (slots.get(slot(s)) ?? 0) + 1);
    expect([...slots.keys()].sort((x, y) => x - y)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    for (const count of slots.values()) expect(count).toBe(CHIMNEY_STAVES / CHIMNEY.crown.merlons);
  });

  it("rounds the sabots' corners within SAG.eye and the caissons' within SAG.far", () => {
    const B = SUPPORT.sabot;
    const S = SUPPORT.shims;
    const specs = [
      { flats: B.flats, r: B.radius },
      { flats: B.body, r: B.bodyRadius },
      { flats: S.flats, r: S.radius },
    ];
    const iron = supportPieces(supportFrames()[0]!).iron;
    for (const { flats, r } of specs) {
      const h = flats / 2;
      // Out to a corner's middle; a vertex lands there only for an even count.
      const far = (h - r) * Math.SQRT2 + r;
      const found = iron.filter((p) => {
        const c = centroid(p.outline);
        return p.outline.length >= 16 && Math.abs(Math.max(...p.outline.map((q) => len(sub(q, c)))) - far) < 0.01;
      });
      expect(found.length).toBeGreaterThan(0);
      for (const p of found) {
        const per = p.outline.length / 4 - 1;
        expect(per).toBe(arcSegments(r, Math.PI / 2, SAG.eye));
        const chords = p.outline.map((q, i) => len(sub(p.outline[(i + 1) % p.outline.length]!, q))).filter((L) => L < r);
        expect(chords).toHaveLength(4 * per);
        for (const L of chords) expect(chordSag(r, L)).toBeLessThanOrEqual(SAG.eye + EPS);
      }
    }
    const f = supportFrames().find((x) => x.pile === 1)!;
    const { concrete, iron: shell } = caissonPrisms(f);
    expect(concrete[0]!.outline).toHaveLength(4 * (CAISSON_CORNER_CHORDS + 1));
    for (const L of concrete[0]!.outline.map((q, i, a) => len(sub(a[(i + 1) % a.length]!, q))).filter((x) => x < CAISSON.radius)) {
      expect(chordSag(CAISSON.radius, L)).toBeLessThanOrEqual(SAG.far + EPS);
    }
    const R = CAISSON.radius + CAISSON.shell.t;
    const outer = shell.map((p) => len(sub(p.outline[2]!, p.outline[3]!))).filter((L) => L < CAISSON.radius);
    expect(outer).toHaveLength(4 * CAISSON_CORNER_CHORDS);
    for (const L of outer) expect(chordSag(R, L)).toBeLessThanOrEqual(SAG.far + EPS);
  });
});

describe("the lifts' wheels and tubes", () => {
  it("cuts every rim and tube within its tolerance, the fewest chords that do", () => {
    expect(LIFT_ROUNDS.length).toBeGreaterThan(8);
    for (const p of LIFT_ROUNDS) {
      const R = p.diameter / 2;
      // A rim's chords stand tangent (corners proud); a tube's sit on the circle.
      const dev = (n: number) => (p.kind === "rim" ? R * (1 / Math.cos(Math.PI / n) - 1) : R * (1 - Math.cos(Math.PI / n)));
      expect(dev(p.count), p.what).toBeLessThanOrEqual(p.sag + EPS);
      // Above its floor (a rim's old 36, a tube's old 16) it is the fewest that do.
      if (p.count > (p.kind === "rim" ? RIM_CHORDS_MIN : 16)) {
        expect(dev(p.count - 4), p.what).toBeGreaterThan(p.sag * Math.cos(Math.PI / 12));
      }
    }
    // The Roux driving wheel, 3.616 over its rim: from 36 to the tolerance's count.
    const roux = LIFT_ROUNDS.find((p) => p.what === "Roux driving wheel")!;
    expect(roux.count).toBeGreaterThan(36);
  });
});

describe("the summit's round parts", () => {
  it("sweeps the dome's chords within SAG.far of the 7.435 arc on the plate's 9 panels a quarter", () => {
    const R = 7.435;
    const step = Math.PI / 2 / (9 * DOME_CHORD_SPLIT);
    expect(R * (1 - Math.cos(step / 2))).toBeLessThanOrEqual(SAG.far + EPS);
    // Control: on the panels alone, 10 degrees, it stood 28 mm off.
    expect(R * (1 - Math.cos(Math.PI / 36))).toBeGreaterThan(0.028);
  });

  it("shades the cupola as a dome and the lantern's decagons flat", async () => {
    const g = new Graph(1889);
    buildSummit(g);
    for (const id of ["cupolaSmooth", "cupolaSkin", "lanternBaseSkin", "balconyParapetSkin"]) {
      g.output({ id } as NodeHandle, "out", id);
    }
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[id] ?? [])!;
    const lv = lanternLevels();

    // The cupola: outward everywhere, plumb on the drum, tilting up the sphere.
    const smooth = geo("cupolaSmooth");
    const P = points(smooth);
    const N = normals(smooth);
    const top = Math.max(...P.map((p) => p[1]));
    let crown = 0;
    let drum = 0;
    P.forEach((p, i) => {
      const n = N[i]!;
      expect(Math.abs(len(n) - 1)).toBeLessThan(1e-4);
      // Outward: along the sphere's radius from its centre on the axis.
      expect(n[0] * p[0] + n[1] * (p[1] - lv.springing) + n[2] * p[2]).toBeGreaterThan(0);
      if (p[1] > top - 0.1) {
        crown++;
        expect(n[1]).toBeGreaterThan(0.8);
      }
      if (p[1] < lv.springing - 0.05) {
        drum++;
        expect(Math.abs(n[1])).toBeLessThan(0.05);
      }
    });
    expect(crown).toBeGreaterThan(0);
    expect(drum).toBeGreaterThan(0);
    // Control: the sweep's own normals lie in the rings' planes.
    const raw = geo("cupolaSkin");
    const rawP = points(raw);
    const rawN = normals(raw);
    const rawCrown = rawP.map((p, i) => (p[1] > top - 0.1 ? Math.abs(rawN[i]![1]) : -1)).filter((y) => y >= 0);
    expect(rawCrown.length).toBeGreaterThan(0);
    expect(Math.max(...rawCrown)).toBeLessThan(0.2);

    // The decagons: level normals, ten of them, each square to its wall and out of it.
    for (const id of ["lanternBaseSkin", "balconyParapetSkin"]) {
      const d = geo(id);
      const dirs = new Set<string>();
      const dn = normals(d);
      points(d).forEach((p, i) => {
        const n = dn[i]!;
        expect(Math.abs(n[1])).toBeLessThan(1e-6);
        dirs.add(`${n[0].toFixed(5)},${n[2].toFixed(5)}`);
        // Out of the wall: within 18 degrees of the point's own radius.
        expect((n[0] * p[0] + n[2] * p[2]) / Math.hypot(p[0], p[2])).toBeGreaterThan(Math.cos(Math.PI / 10) - 1e-6);
      });
      expect(dirs.size).toBe(10);
      // Each triangle wound the way its normals face, so it is drawn front out.
      const dp = points(d);
      for (let t = 0; t < d.primitiveCount; t++) {
        const s0 = d.primVertexStart[t]!;
        const [i, j, k] = [0, 1, 2].map((m) => d.vertexToPoint[s0 + m]!) as [number, number, number];
        const u = sub(dp[j]!, dp[i]!);
        const v = sub(dp[k]!, dp[i]!);
        const face: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        expect(face[0] * dn[i]![0] + face[1] * dn[i]![1] + face[2] * dn[i]![2]).toBeGreaterThan(0);
      }
    }
  }, 120_000);
});

describe("the arches' ironwork", () => {
  /** The largest distance of a curve's samples between t0 and t1 from the chord a b. */
  const curveSag = (f: (t: number) => Pt, t0: number, t1: number, a: Pt, b: Pt) => {
    let worst = 0;
    for (let i = 1; i < 64; i++) worst = Math.max(worst, segmentDistance(f(t0 + ((t1 - t0) * i) / 64), a, b));
    return worst;
  };

  it("cuts the frame's arch so its outer edge stands within CURVE_SAG", () => {
    const hw = FRAME_WIDTH / 2;
    for (const radius of [0.25, 0.5, 0.8, 1.2]) {
      const line = trace({ p: [radius, 0], heading: Math.PI / 2 }, [{ op: "arc", radius, turn: Math.PI }], hw);
      // The arc about the origin, from angle 0 to π; its outer edge at radius + hw.
      const R = radius + hw;
      const edge = (t: number): Pt => [R * Math.cos(t), R * Math.sin(t)];
      for (let i = 0; i + 1 < line.length; i++) {
        const t0 = Math.atan2(line[i]![1], line[i]![0]);
        const t1 = Math.atan2(line[i + 1]![1], line[i + 1]![0]);
        expect(curveSag(edge, t0, t1, edge(t0), edge(t1))).toBeLessThanOrEqual(CURVE_SAG + 1e-7);
      }
    }
  });

  it("winds the volutes' spirals so their outer edge stands within CURVE_SAG, on every volute built", () => {
    const hw = VOLUTE_WIDTH / 2;
    let chords = 0;
    for (const { work } of bandIronwork()) {
      work.volutes.forEach((line, v) => {
        const eye = work.eyes[v]!;
        const { k, turn } = VOLUTES[work.which[v]!]!;
        for (let i = 0; i + 1 < line.length; i++) {
          const pa = line[i]!;
          const pb = line[i + 1]!;
          const ra = Math.hypot(pa[0] - eye[0], pa[1] - eye[1]);
          const rb = Math.hypot(pb[0] - eye[0], pb[1] - eye[1]);
          const dphi = Math.log(ra / rb) / k;
          const aa = Math.atan2(pa[1] - eye[1], pa[0] - eye[0]);
          const turned = Math.atan2(Math.sin(Math.atan2(pb[1] - eye[1], pb[0] - eye[0]) - aa), Math.cos(Math.atan2(pb[1] - eye[1], pb[0] - eye[0]) - aa));
          // A spiral chord: it winds in by the angle its radius falls by.
          if (!(dphi > 1e-6) || Math.abs(turned - turn * dphi) > 1e-6) continue;
          chords++;
          const on = (phi: number): Pt => {
            const r = ra * Math.exp(-k * phi);
            const a = aa + turn * phi;
            return [eye[0] + r * Math.cos(a), eye[1] + r * Math.sin(a)];
          };
          // The outer edge's radius of curvature over the centre line's.
          const rho = ra * Math.hypot(1, k);
          expect(curveSag(on, 0, dphi, pa, pb) * ((rho + hw) / rho)).toBeLessThanOrEqual(CURVE_SAG + 1e-7);
        }
      });
    }
    expect(chords).toBeGreaterThan(100);
  });

  it("cuts a volute traced alone the same way at the spiral's widest", () => {
    const s = { op: "spiral" as const, r0: 0.6, k: 0.13, rEnd: VOLUTE_END, turn: 1 as const };
    const start = { p: [0, 0] as Pt, heading: 0 };
    const line = trace(start, [s], VOLUTE_WIDTH / 2);
    const eye = spiralEye(start, s);
    const r = line.map((p) => Math.hypot(p[0] - eye[0], p[1] - eye[1]));
    expect(r[0]).toBeCloseTo(0.6, 9);
    expect(r.at(-1)).toBeCloseTo(VOLUTE_END, 9);
    // The steps lengthen as it winds in (the tolerance, not a fixed angle).
    const steps = r.slice(1).map((x, i) => Math.log(r[i]! / x) / s.k);
    expect(steps[0]!).toBeLessThan(steps[Math.floor(steps.length / 2)]! + 1e-12);
  });
});

describe("the 1st floor's arcade", () => {
  it("cuts every opening's head within ARCADE_SAG, symmetric, and the fillets too", () => {
    const openings = arcadeOpenings();
    expect(openings.length).toBe(7);
    for (const o of openings) {
      const n = o.head.length - 1;
      expect(n % 2).toBe(0);
      for (let i = 0; i < n; i++) {
        const L = Math.hypot(o.head[i + 1]![0] - o.head[i]![0], o.head[i + 1]![1] - o.head[i]![1]);
        expect(chordSag(o.radius, L)).toBeLessThanOrEqual(ARCADE_SAG + EPS);
      }
    }
    // The fillets: 1.50 [firstFloor.ts FILLET_R] over any sweep up to a right angle.
    for (const sweep of [0.3, 0.6, 1.0, Math.PI / 2]) {
      const m = arcadeArcSegments(1.5, sweep);
      expect(1.5 * (1 - Math.cos(sweep / m / 2))).toBeLessThanOrEqual(ARCADE_SAG + EPS);
      expect(m).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("the page's instanced fittings", () => {
  it("turns the globes, the balusters and the cabochons within their tolerances at true size", () => {
    // A sphere's quads are split on the diagonal: at the equator, where the
    // quads are widest, the diagonal of a step a around and b along stands
    // r (1 − cos(√(a² + b²) / 2)) off the sphere.
    const G = FITTING_SEGMENTS.globe;
    const diagonal = (r: number, a: number, b: number) => r * (1 - Math.cos(Math.hypot(a, b) / 2));
    expect(diagonal(GLOBE_RADIUS, (2 * Math.PI) / G.around, Math.PI / G.rings)).toBeLessThanOrEqual(SAG.eye + EPS);
    // Control: the old 16 × 12 stood 8 mm off on the diagonal.
    expect(diagonal(GLOBE_RADIUS, (2 * Math.PI) / 16, Math.PI / 12)).toBeGreaterThan(0.008);
    // A lathe's quads are flat (trapezoids between two rings): around only.
    const B = FITTING_SEGMENTS.baluster;
    expect(BALUSTER_RADIUS * (1 - Math.cos(Math.PI / B.around))).toBeLessThanOrEqual(SAG.eye + EPS);
    // The cabochon's cap: around at its base ring, along its sphere's meridian.
    const C = FITTING_SEGMENTS.cabochon;
    const { radius, polar } = cabochonSphere();
    const aroundSag = CABOCHON_BASE * (1 - Math.cos(Math.PI / C.around));
    const alongSag = radius * (1 - Math.cos(polar / C.rings / 2));
    expect(aroundSag + alongSag).toBeLessThanOrEqual(SAG.near + EPS);
    // The counts the page draws [measured 2026-09-26].
    expect([G.around, G.rings, B.around, C.around, C.rings]).toEqual([32, 16, 16, 20, 3]);
  });
});
