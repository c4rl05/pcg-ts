/**
 * The crossing plates on the first floor and over the summit's girders.
 *
 * The legs and the shaft carry a pair of plates at every place two laced
 * struts cross (`demos/eiffel/crossing.ts`; held in
 * `tests/eiffelSkeleton.test.ts`). The first floor's girders between the
 * legs and panel 10's X over them are laced struts too, and so crossed
 * bare; the summit's two diagonal girders cross on the tower's axis under
 * PL-XIV Fig. 5 bis's "2 Goussets 1.130 x 10". This file holds the same
 * rule where it now reaches them.
 *
 * The crossings are derived HERE, from the cooked member axes after the
 * quadrant copy, not taken from the module's own list, and the counts are
 * derived by hand from the girders' layout (see the first test). Every
 * measurement that should read zero is first shown to read non-zero on a
 * deliberately displaced plate, so a comparator that cannot say
 * "different" cannot pass.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry, serializeGraph } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { JITTER } from "../demos/eiffel/parts.js";

type Vec3 = readonly [number, number, number];

/** How far a jittered OUTPUT may sit from where the rule put it (as in eiffelSkeleton.test.ts). */
const SETTLE = (JITTER + 2e-5) * Math.sqrt(3);

/**
 * The rule's numbers, restated rather than imported so a change to the
 * module has to be a change here too: a plate 10 mm thick, set 0.015 under
 * an 800's angles and as wide as its strut, both scaled by w / 0.4; edge
 * rows 0.04 in at 0.1. The summit's gusset is 1.130 x 10 mm [PL-XIV Fig. 5
 * bis], square by inference, set on the girders' plating.
 */
const CROSS = { thick: 0.01, set: 0.015, edge: 0.4, at: 0.4, pitch: 0.1, inset: 0.04 } as const;
const GUSSET = 1.13;
/** The first floor's laced sections: the girders' 360s and panel 10's 600s (firstFloor.ts). */
const W = { bars: 0.18, web10: 0.3, cross: 0.2 } as const;

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

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      line.push([P.data[3 * i] as number, P.data[3 * i + 1] as number, P.data[3 * i + 2] as number]);
    }
    out.push(line);
  }
  return out;
}

/** A geometry's primitive face normals (`faceN`, what an edge rule writes). */
function faceNormals(geo: Geometry): Vec3[] {
  const d = geo.attrs.primitive.get("faceN");
  if (d === undefined) throw new Error("no faceN");
  const out: Vec3[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    out.push([d.data[3 * p] as number, d.data[3 * p + 1] as number, d.data[3 * p + 2] as number]);
  }
  return out;
}

/** A flat-bar mesh's boxes: 24 points each (three a corner), their mean the centre. */
function flatBoxes(geo: Geometry): Array<{ centre: Vec3; points: Vec3[] }> {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const n = geo.attrs.point.count;
  expect(n % 24, "not a whole number of flat-bar boxes").toBe(0);
  const out: Array<{ centre: Vec3; points: Vec3[] }> = [];
  for (let i = 0; i < n; i += 24) {
    const pts: Vec3[] = [];
    for (let k = i; k < i + 24; k++) {
      pts.push([P.data[3 * k] as number, P.data[3 * k + 1] as number, P.data[3 * k + 2] as number]);
    }
    out.push({ centre: mul3(pts.reduce((a, p) => add3(a, p), [0, 0, 0] as Vec3), 1 / 24), points: pts });
  }
  return out;
}

/** Instance translations and +y axes of a rivet output. */
function rivetFrames(item: { kind: string } | undefined): Array<{ at: Vec3; axis: Vec3 }> {
  if (item === undefined || item.kind !== "instances") throw new Error("no rivets");
  const out: Array<{ at: Vec3; axis: Vec3 }> = [];
  for (const b of (item as unknown as { batches: { count: number; transforms: Float32Array }[] }).batches) {
    for (let k = 0; k < b.count; k++) {
      const t = b.transforms;
      out.push({
        at: [t[16 * k + 12]!, t[16 * k + 13]!, t[16 * k + 14]!],
        axis: unit3([t[16 * k + 4]!, t[16 * k + 5]!, t[16 * k + 6]!]),
      });
    }
  }
  return out;
}

// ------------------------------------------------ the crossings, re-derived

interface Crossing {
  readonly family: "bars" | "web10" | "cross";
  readonly at: Vec3;
  /** The members' shared plane's unit normal. */
  readonly n: Vec3;
  /** The strut's outer half-width. */
  readonly w: number;
}

/**
 * Where two cooked member axes of one set cross, strictly inside both (a
 * millimetre off either end), in one plane. Solved in the plane's own 2D
 * basis with cross products, a different formulation from the module's
 * normal equations.
 */
function crossingsIn(lines: readonly Vec3[][], ns: readonly Vec3[], family: Crossing["family"], w: number): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const n = unit3(ns[i]!);
      if (Math.abs(dot3(n, unit3(ns[j]!))) < 1 - 1e-6) continue;
      const [a, b] = [lines[i]![0]!, lines[i]![lines[i]!.length - 1]!];
      const [c, d] = [lines[j]![0]!, lines[j]![lines[j]!.length - 1]!];
      if (Math.abs(dot3(sub3(c, a), n)) > 1e-4) continue;
      const U = unit3(sub3(b, a));
      const V = cross3(n, U);
      const to2 = (p: Vec3): [number, number] => [dot3(sub3(p, a), U), dot3(sub3(p, a), V)];
      const [p, q] = [to2(a), to2(b)];
      const [r, s] = [to2(c), to2(d)];
      const cr = (x: [number, number], y: [number, number]) => x[0] * y[1] - x[1] * y[0];
      const e: [number, number] = [q[0] - p[0], q[1] - p[1]];
      const f: [number, number] = [s[0] - r[0], s[1] - r[1]];
      const den = cr(e, f);
      if (Math.abs(den) < 1e-9) continue;
      const rp: [number, number] = [r[0] - p[0], r[1] - p[1]];
      const t = cr(rp, f) / den;
      const u = cr(rp, e) / den;
      const le = Math.hypot(...e);
      const lf = Math.hypot(...f);
      if (t * le <= 1e-3 || (1 - t) * le <= 1e-3 || u * lf <= 1e-3 || (1 - u) * lf <= 1e-3) continue;
      out.push({ family, at: add3(a, mul3(U, t * le)), n, w });
    }
  }
  return out;
}

/** Which tower face a point is on: 0 +z, 1 +x, 2 -z, 3 -x. */
const faceOf = (p: Vec3): number =>
  Math.abs(p[2]) >= Math.abs(p[0]) ? (p[2] > 0 ? 0 : 2) : p[0] > 0 ? 1 : 3;

// --------------------------------------------------------- the plates, cooked

interface Plate {
  /** Its centre, its own outward normal, along and across it. */
  readonly o: Vec3;
  readonly n: Vec3;
  readonly D: Vec3;
  readonly B: Vec3;
  readonly half: number;
  readonly across: number;
}

/** The plate members (two-point axes carrying the plate's own normal), as plates `across` wide. */
function platesFrom(geo: Geometry, across: number): Plate[] {
  const ns = faceNormals(geo);
  return polylines(geo).map((l, i) => {
    const [a, b] = [l[0]!, l[l.length - 1]!];
    const D = unit3(sub3(b, a));
    const n = unit3(ns[i]!);
    return { o: mul3(add3(a, b), 0.5), n, D, B: cross3(n, D), half: len3(sub3(b, a)) / 2, across };
  });
}

/** Faces of a skin, indexed by mean height, for clipping to a plate's footprint. */
interface Faces {
  readonly n: number;
  readonly cy: Float64Array;
  readonly fn: Float64Array;
  readonly order: Int32Array;
  readonly start: Int32Array;
  readonly count: Int32Array;
  readonly p: Float64Array;
}

function faceIndex(geo: Geometry): Faces {
  const total = geo.primitiveCount;
  let verts = 0;
  for (let p = 0; p < total; p++) verts += geo.primVertexCount[p] as number;
  const cy = new Float64Array(total);
  const fn = new Float64Array(3 * total);
  const start = new Int32Array(total);
  const count = new Int32Array(total);
  const pts = new Float64Array(3 * verts);
  const P = geo.attrs.point.get("P")!.data;
  let vk = 0;
  for (let p = 0; p < total; p++) {
    const s = geo.primVertexStart[p] as number;
    const c = geo.primVertexCount[p] as number;
    start[p] = vk;
    count[p] = c;
    let ay = 0;
    for (let v = s; v < s + c; v++) {
      const i = geo.vertexToPoint[v] as number;
      pts[3 * vk] = P[3 * i] as number;
      pts[3 * vk + 1] = P[3 * i + 1] as number;
      pts[3 * vk + 2] = P[3 * i + 2] as number;
      ay += P[3 * i + 1] as number;
      vk++;
    }
    cy[p] = ay / c;
    const b = start[p] as number;
    const q = (k: number): Vec3 => [pts[3 * (b + k)]!, pts[3 * (b + k) + 1]!, pts[3 * (b + k) + 2]!];
    const f = unit3(cross3(sub3(q(1), q(0)), sub3(q(2), q(0))));
    fn[3 * p] = f[0];
    fn[3 * p + 1] = f[1];
    fn[3 * p + 2] = f[2];
  }
  const order = Int32Array.from(
    Array.from({ length: total }, (_, i) => i).sort((a, b) => (cy[a] as number) - (cy[b] as number)),
  );
  return { n: total, cy, fn, order, start, count, p: pts };
}

function fromHeight(f: Faces, y: number): number {
  let a = 0;
  let b = f.n;
  while (a < b) {
    const m = (a + b) >> 1;
    if ((f.cy[f.order[m] as number] as number) < y) a = m + 1;
    else b = m;
  }
  return a;
}

/** Clip a convex (d, e) polygon to [-half, half] x [-across, across] (Sutherland-Hodgman). */
function clipToFootprint(poly: number[][], half: number, across: number): number[][] {
  let out = poly;
  for (const [a, b, c] of [
    [1, 0, half],
    [-1, 0, half],
    [0, 1, across],
    [0, -1, across],
  ] as const) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const q = inp[i]!;
      const r = inp[(i + 1) % inp.length]!;
      const dq = a * q[0]! + b * q[1]! - c;
      const dr = a * r[0]! + b * r[1]! - c;
      if (dq <= 0) out.push(q);
      if (dq * dr < 0) {
        const t = dq / (dq - dr);
        out.push([q[0]! + (r[0]! - q[0]!) * t, q[1]! + (r[1]! - q[1]!) * t]);
      }
    }
    if (out.length === 0) return [];
  }
  return out;
}

/**
 * How far the steel of `f` stands above the plate's INNER face, read over
 * the plate's own footprint: every face turned along the plate's normal,
 * clipped to the footprint and evaluated on its plane at what is left. On
 * the plate's own strut's chords this is its depth under the angles.
 */
function overPlate(f: Faces, p: Plate): number[] {
  const R = Math.hypot(p.half, p.across) + 1.4;
  const out: number[] = [];
  for (let i = fromHeight(f, p.o[1] - R); i < fromHeight(f, p.o[1] + R); i++) {
    const j = f.order[i] as number;
    const F: Vec3 = [f.fn[3 * j]!, f.fn[3 * j + 1]!, f.fn[3 * j + 2]!];
    const Fn = dot3(F, p.n);
    if (Fn < 0.999) continue;
    const poly: number[][] = [];
    let d0 = 0;
    let e0 = 0;
    let h0 = 0;
    const s = f.start[j] as number;
    const n = f.count[j] as number;
    for (let v = 0; v < n; v++) {
      const q: Vec3 = sub3([f.p[3 * (s + v)]!, f.p[3 * (s + v) + 1]!, f.p[3 * (s + v) + 2]!], p.o);
      const d = dot3(q, p.D);
      const e = dot3(q, p.B);
      d0 += d / n;
      e0 += e / n;
      h0 += dot3(q, p.n) / n;
      poly.push([d, e]);
    }
    if (Math.abs(h0) > 0.12) continue;
    const kept = clipToFootprint(poly, p.half, p.across);
    if (kept.length < 3) continue;
    const ds = kept.map((q) => q[0]!);
    const es = kept.map((q) => q[1]!);
    if (Math.max(...ds) - Math.min(...ds) < 0.02 || Math.max(...es) - Math.min(...es) < 0.02) continue;
    const Fd = dot3(F, p.D);
    const Fe = dot3(F, p.B);
    for (const q of kept) out.push(h0 - (Fd * (q[0]! - d0) + Fe * (q[1]! - e0)) / Fn + CROSS.thick / 2);
  }
  return out;
}

/** The highest any POINT of `geo` reaches above the plate's inner face inside its footprint (-Infinity if none). */
function pointsOverPlate(pts: Float64Array, p: Plate): number {
  let best = -Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    const q = sub3([pts[i]!, pts[i + 1]!, pts[i + 2]!], p.o);
    if (Math.abs(q[1]) > 1) continue;
    const h = dot3(q, p.n);
    if (h > 0.1 || h < -0.25) continue;
    if (Math.abs(dot3(q, p.D)) > p.half || Math.abs(dot3(q, p.B)) > p.across) continue;
    best = Math.max(best, h + CROSS.thick / 2);
  }
  return best;
}

const pointsOf = (geo: Geometry): Float64Array => Float64Array.from(geo.attrs.point.get("P")!.data);

/** A plate moved along its own normal: the displaced control every zero check is tried on first. */
const moved = (p: Plate, by: number): Plate => ({ ...p, o: add3(p.o, mul3(p.n, by)) });

/** The samples a spacing resample lays on a row of length L at the pitch (as eiffelSkeleton.test.ts counts them). */
const heads = (L: number) => {
  const whole = Math.floor(L / CROSS.pitch + 1e-6);
  return whole + 1 + (L - whole * CROSS.pitch > 1e-4 ? 1 : 0);
};

const FF_PROBES = {
  bars: "ffBars4RotDone",
  web10: "ffWeb104RotDone",
  cross: "ffCross4RotDone",
  plates360: "ffCrossPlates3604RotDone",
  plates600: "ffCrossPlates6004RotDone",
  lit360: "ffCrossPlates360Lit",
  lit600: "ffCrossPlates600Lit",
  chords360: "ffWebChordSkin",
  lace360: "ffWebLaceSkin",
  chords600: "ffPanel10ChordSkin",
  lace600: "ffPanel10LaceSkin",
  gusset: "girderCrossPlates4500",
  gussetLit: "girderCrossPlates4500Lit",
  cover: "girderCoverLit",
  flange: "girderFlangeLit",
} as const;

type Probed = { outputs: Record<string, unknown>; geo: (k: keyof typeof FF_PROBES) => Geometry };

async function cookProbed(detail: { lacedWeb?: boolean; rivets?: boolean }): Promise<Probed> {
  const g = buildEiffel(1889, detail);
  for (const id of Object.values(FF_PROBES)) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  return {
    outputs: outputs as Record<string, unknown>,
    geo: (k) => {
      const geo = firstGeometry((outputs as Record<string, never>)[`probe:${FF_PROBES[k]}`] ?? []);
      if (geo === undefined) throw new Error(`probe ${FF_PROBES[k]} produced no geometry`);
      return geo;
    },
  };
}

/** The first floor's crossings, re-derived from the cooked member axes. */
function derivedCrossings(p: Probed): Crossing[] {
  const of = (k: "bars" | "web10" | "cross") => crossingsIn(polylines(p.geo(k)), faceNormals(p.geo(k)), k, W[k]);
  return [...of("bars"), ...of("web10"), ...of("cross")];
}

let laced: Promise<Probed> | undefined;
const lacedProbe = () => (laced ??= cookProbed({ lacedWeb: true }));

describe("eiffel crossing plates: first floor and summit", () => {
  it("builds nothing new at the plain depth", async () => {
    const g = buildEiffel();
    const ids = serializeGraph(g).nodes.map((n) => n.id);
    expect(ids.filter((id) => /^(ffCrossPlates|ffCrossRivets|girderCross)/.test(id))).toEqual([]);
    const { outputs } = await cook(g);
    expect(outputs.gussets).toBeUndefined();
    expect(Object.keys(outputs).filter((k) => k.includes("crossings"))).toEqual([]);
  });

  it("finds 60 laced-strut crossings a face on the first floor, 240 round the tower", async () => {
    const p = await lacedProbe();
    const all = derivedCrossings(p);
    // BY HAND, a face, from the girders' layout (firstFloor.ts `girders`,
    // `secondFloor`): the grande poutre's two diagonal sets cross twice in
    // each of its 4 bays a half and once in the end bay (9), twice (18),
    // plus the X on the axis: 19 a plane. The decorative girder's X per
    // bay: 10 a plane. Both girders stand in two planes; panel 10's X
    // stands in the face plane only, one each side of its post: 2. The
    // entretoises' cross members are parallel pairs: 0.
    // 2 x (19 + 10) + 2 = 60 a face — the backlog's "60" — and x 4.
    const byFamily = (f: Crossing["family"]) => all.filter((c) => c.family === f).length;
    expect(byFamily("cross")).toBe(0);
    expect(byFamily("web10")).toBe(4 * 2);
    expect(byFamily("bars")).toBe(4 * 2 * (19 + 10));
    for (let f = 0; f < 4; f++) expect(all.filter((c) => faceOf(c.at) === f), `face ${f}`).toHaveLength(60);
    // The grande poutre's (panel 5, 50.4-57.4) against the decorative
    // girder's (panel 4, below 50.4).
    expect(all.filter((c) => c.family === "bars" && c.at[1] > 50.4)).toHaveLength(4 * 2 * 19);
    expect(all.filter((c) => c.family === "bars" && c.at[1] < 50.4)).toHaveLength(4 * 2 * 10);
    expect(all).toHaveLength(240);
  });

  it("puts one pair at each crossing, centred on it, square to the members' face, sized by the rule", async () => {
    const p = await lacedProbe();
    const all = derivedCrossings(p);
    const plates = [
      ...platesFrom(p.geo("plates360"), W.bars),
      ...platesFrom(p.geo("plates600"), W.web10),
    ];
    expect(platesFrom(p.geo("plates360"), W.bars)).toHaveLength(2 * 232);
    expect(platesFrom(p.geo("plates600"), W.web10)).toHaveLength(2 * 8);
    const taken = new Set<number>();
    /** The plate nearest where the rule puts the pair's `side` plate of crossing c, and how far off. */
    const nearest = (c: Crossing, side: number) => {
      const set = (CROSS.set * c.w) / CROSS.at;
      const want = add3(c.at, mul3(c.n, side * (c.w - set + CROSS.thick / 2)));
      let best = Infinity;
      let bi = -1;
      plates.forEach((q, i) => {
        const d = len3(sub3(q.o, want));
        if (d < best) {
          best = d;
          bi = i;
        }
      });
      return { best, bi };
    };
    // The matcher can say "no": a crossing a millimetre off finds nothing.
    const c0 = all[0]!;
    expect(nearest({ ...c0, at: add3(c0.at, [1e-3, 0, 0]) }, 1).best).toBeGreaterThan(1e-4);
    let worstCentre = 0;
    let worstNormal = 0;
    for (const c of all) {
      for (const side of [1, -1]) {
        const { best, bi } = nearest(c, side);
        expect(best, `plate at y=${c.at[1].toFixed(3)}`).toBeLessThan(1e-4);
        taken.add(bi);
        const q = plates[bi]!;
        // CENTRED: the plate's centre, dropped onto the members' plane, is the crossing.
        const off = sub3(q.o, c.at);
        worstCentre = Math.max(worstCentre, len3(sub3(off, mul3(c.n, dot3(off, c.n)))));
        // SQUARE TO THE FACE, with its own outward normal (the pair cannot share one).
        worstNormal = Math.max(worstNormal, 1 - dot3(q.n, mul3(c.n, side)));
        expect(Math.abs(dot3(q.D, c.n))).toBeLessThan(5e-5);
        // Square, as wide as its strut: 2w by 2w at the default edge.
        expect(q.half).toBeCloseTo(c.w, 5);
      }
    }
    expect(taken.size).toBe(plates.length);
    expect(worstCentre).toBeLessThan(1e-4);
    expect(worstNormal).toBeLessThan(1e-9);

    // The boxes the flat bars make, sized by the rule, and IN the gussets class.
    const gussets = flatBoxes(firstGeometry(p.outputs.gussets as never)!);
    for (const [lit, list] of [
      ["lit360", plates.filter((q) => q.across === W.bars)],
      ["lit600", plates.filter((q) => q.across === W.web10)],
    ] as const) {
      const boxes = flatBoxes(p.geo(lit));
      expect(boxes).toHaveLength(list.length);
      for (const q of list) {
        let best = Infinity;
        let box = boxes[0]!;
        for (const b of boxes) {
          const d = len3(sub3(b.centre, q.o));
          if (d < best) [best, box] = [d, b];
        }
        expect(best).toBeLessThan(5e-5);
        for (const [axis, half] of [
          [q.D, q.half],
          [q.B, q.across],
          [q.n, CROSS.thick / 2],
        ] as const) {
          const got = Math.max(...box.points.map((r) => Math.abs(dot3(sub3(r, box.centre), axis))));
          expect(Math.abs(got - half)).toBeLessThan(5e-5);
        }
        let placed = Infinity;
        for (const b of gussets) placed = Math.min(placed, len3(sub3(b.centre, q.o)));
        expect(placed).toBeLessThan(SETTLE);
      }
    }
  });

  it("sets every first-floor plate under its struts' angles and outside their lacing", async () => {
    const p = await lacedProbe();
    const sets = [
      { plates: platesFrom(p.geo("plates360"), W.bars), chords: faceIndex(p.geo("chords360")), lace: p.geo("lace360"), w: W.bars },
      { plates: platesFrom(p.geo("plates600"), W.web10), chords: faceIndex(p.geo("chords600")), lace: p.geo("lace600"), w: W.web10 },
    ];
    const report: Record<string, { depth: [number, number]; clear: number }> = {};
    for (const s of sets) {
      const set = (CROSS.set * s.w) / CROSS.at;
      const lacePts = pointsOf(s.lace);
      const laceFaces = faceIndex(s.lace);
      // The controls first: 5 mm out, the depth reads 5 mm off; 25 mm in,
      // the lacing comes through.
      const q0 = s.plates[0]!;
      const out5 = overPlate(s.chords, moved(q0, 0.005));
      expect(out5.length).toBeGreaterThan(0);
      expect(Math.min(...out5.map((h) => Math.abs(h - set)))).toBeGreaterThan(0.004);
      expect(
        Math.max(pointsOverPlate(lacePts, moved(q0, -0.025)), ...overPlate(laceFaces, moved(q0, -0.025))),
      ).toBeGreaterThan(0);
      let lo = Infinity;
      let hi = -Infinity;
      let clear = Infinity;
      for (const q of s.plates) {
        // ON THE STEEL: the strut's corner angles stand over the plate's
        // footprint, their outer faces `set` above its inner face, read at
        // every corner of every clipped face — not floating off the chords.
        const hits = overPlate(s.chords, q);
        expect(hits.length, `no steel over the plate at y=${q.o[1].toFixed(3)}`).toBeGreaterThan(0);
        for (const h of hits) {
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        // OUTSIDE THE LACING, read on its mitred vertices and its faces.
        const top = Math.max(pointsOverPlate(lacePts, q), ...overPlate(laceFaces, q));
        expect(Number.isFinite(top), `no lacing under the plate at y=${q.o[1].toFixed(3)}`).toBe(true);
        clear = Math.min(clear, -top);
      }
      expect(Math.abs(lo - set), `depth under the angles (${s.w})`).toBeLessThan(1e-4);
      expect(Math.abs(hi - set), `depth under the angles (${s.w})`).toBeLessThan(1e-4);
      expect(clear, `lacing clearance (${s.w})`).toBeGreaterThan(0.001);
      report[String(s.w)] = { depth: [lo, hi], clear };
    }
    // MEASURED: the 360s' plates 6.74-6.76 mm under the angles, the 600s'
    // 11.25 (the rule's 0.015 scaled by w / 0.4), to f32; the lacing's
    // highest point under any of them 6.43 and 1.93 mm below the plate's
    // inner face — the 600s' close to the legs' tightest clean plate
    // (1.57 mm), and none through.
    expect(1000 * report["0.18"]!.clear).toBeCloseTo(6.43, 1);
    expect(1000 * report["0.3"]!.clear).toBeCloseTo(1.93, 1);
  });

  it("lays the summit's two gussets on the girders' crossing: 1.130 square, flush on the plating", async () => {
    const p = await lacedProbe();
    const plates = platesFrom(p.geo("gusset"), GUSSET / 2);
    expect(plates).toHaveLength(2);
    const covers = flatBoxes(p.geo("cover")).flatMap((b) => b.points);
    const flanges = flatBoxes(p.geo("flange")).flatMap((b) => b.points);
    const coverTop = Math.max(...covers.map((q) => q[1]));
    const flangeFoot = Math.min(...flanges.map((q) => q[1]));
    const [top, bottom] = [...plates].sort((a, b) => b.o[1] - a.o[1]) as [Plate, Plate];
    for (const q of plates) {
      // On the tower's axis, where the girders cross; square to the
      // continuous (N-S) girder; flat.
      expect(Math.hypot(q.o[0], q.o[2])).toBeLessThan(1e-4);
      expect(Math.abs(dot3(q.D, [Math.SQRT1_2, 0, -Math.SQRT1_2]))).toBeCloseTo(1, 6);
      expect(Math.abs(q.n[1])).toBeCloseTo(1, 9);
      expect(q.half).toBeCloseTo(GUSSET / 2, 5);
    }
    expect(top.n[1]).toBeGreaterThan(0);
    expect(bottom.n[1]).toBeLessThan(0);
    // FLUSH: the top one's inner face on the cover plating's top, the
    // bottom one's on the flanges' underside. The control: 2 mm off reads 2 mm.
    const inner = (q: Plate) => q.o[1] - (q.n[1] * CROSS.thick) / 2;
    const gapTop = inner(top) - coverTop;
    const gapBottom = flangeFoot - inner(bottom);
    expect(Math.abs(inner(moved(top, 0.002)) - coverTop)).toBeGreaterThan(0.0019);
    expect(Math.abs(gapTop)).toBeLessThan(1e-4);
    expect(Math.abs(gapBottom)).toBeLessThan(1e-4);
    // The boxes: 1.130 x 1.130 x 10 mm, in the gussets class.
    const boxes = flatBoxes(p.geo("gussetLit"));
    const gussets = flatBoxes(firstGeometry(p.outputs.gussets as never)!);
    expect(boxes).toHaveLength(2);
    for (const q of plates) {
      const box = boxes.reduce((a, b) => (len3(sub3(b.centre, q.o)) < len3(sub3(a.centre, q.o)) ? b : a));
      expect(len3(sub3(box.centre, q.o))).toBeLessThan(1e-4);
      for (const [axis, half] of [
        [q.D, GUSSET / 2],
        [q.B, GUSSET / 2],
        [q.n, CROSS.thick / 2],
      ] as const) {
        const got = Math.max(...box.points.map((r) => Math.abs(dot3(sub3(r, box.centre), axis))));
        expect(Math.abs(got - half)).toBeLessThan(1e-4);
      }
      expect(Math.min(...gussets.map((b) => len3(sub3(b.centre, q.o))))).toBeLessThan(SETTLE);
    }
    // All of the top one's footprint is over the cover, which is the
    // continuous girder's, 1.130 broad and running through the crossing.
    const coverBoxes = flatBoxes(p.geo("cover"));
    const under = coverBoxes.filter((b) => {
      const v = sub3(b.centre, top.o);
      return Math.abs(dot3(v, top.B)) < 1e-3 && Math.abs(v[1]) < 0.05;
    });
    expect(under.length).toBeGreaterThan(0);
    const reach = Math.max(
      ...under.flatMap((b) => b.points.map((r) => Math.abs(dot3(sub3(r, top.o), top.D)))),
    );
    expect(reach).toBeGreaterThan(GUSSET / 2);
  });

  it("rivets every new plate round its own edges: on the outer face, inside the outline, pointing out", async () => {
    const p = await cookProbed({ rivets: true });
    const sets = [
      ["rivets.ff.crossings.360", platesFrom(p.geo("plates360"), W.bars), 12, 5568],
      ["rivets.ff.crossings.600", platesFrom(p.geo("plates600"), W.web10), 24, 384],
      ["rivets.summit.crossings", platesFrom(p.geo("gusset"), GUSSET / 2), 44, 88],
    ] as const;
    let total = 0;
    for (const [name, plates, per, want] of sets) {
      // Four rows round the edge: the long ones `inset` in from the ends,
      // the short ones stopping a pitch clear of them.
      const q0 = plates[0]!;
      expect(2 * heads(2 * (q0.half - CROSS.inset)) + 2 * heads(2 * (q0.across - CROSS.inset - CROSS.pitch))).toBe(per);
      expect(per * plates.length, name).toBe(want);
      const frames = rivetFrames((p.outputs[name] as Array<{ kind: string }> | undefined)?.[0]);
      expect(frames, name).toHaveLength(want);
      total += frames.length;
      const count = new Map<number, number>();
      for (const { at, axis } of frames) {
        let best = Infinity;
        let bi = -1;
        plates.forEach((q, i) => {
          const v = sub3(at, q.o);
          const off = (t: number, lim: number) => Math.max(0, Math.abs(t) - lim);
          const d = Math.hypot(
            dot3(v, q.n) - CROSS.thick / 2,
            off(dot3(v, q.D), q.half - CROSS.inset),
            off(dot3(v, q.B), q.across - CROSS.inset),
          );
          if (d < best) [best, bi] = [d, i];
        });
        expect(best, name).toBeLessThan(SETTLE);
        expect(dot3(axis, plates[bi]!.n), name).toBeCloseTo(1, 5);
        count.set(bi, (count.get(bi) ?? 0) + 1);
      }
      expect(count.size, name).toBe(plates.length);
      expect(Math.min(...count.values()), name).toBe(per);
    }
    expect(total).toBe(5568 + 384 + 88);

    // AND NO LACING HEAD UNDER A PLATE. The plate is set under the angles'
    // outer face, so a lacing rivet on the face it covers would stand in
    // it: the struts are told the footprints (`WebOpts.covers`) and drop
    // those heads. Read on every head turned along a plate's normal and
    // within 30 mm of its plane, inside its outline. The control: the same
    // footprints slid 0.6 m along their struts catch plenty.
    for (const [name, plates] of [
      ["rivets.ff.girders.web", platesFrom(p.geo("plates360"), W.bars)],
      ["rivets.ff.second.web", platesFrom(p.geo("plates600"), W.web10)],
    ] as const) {
      const frames = rivetFrames((p.outputs[name] as Array<{ kind: string }> | undefined)?.[0]);
      const inside = (list: readonly Plate[]) =>
        frames.filter(({ at, axis }) =>
          list.some((q) => {
            const v = sub3(at, q.o);
            return (
              dot3(axis, q.n) > 0.99 &&
              Math.abs(dot3(v, q.n)) < 0.03 &&
              Math.abs(dot3(v, q.D)) < q.half &&
              Math.abs(dot3(v, q.B)) < q.across
            );
          }),
        ).length;
      expect(inside(plates.map((q) => ({ ...q, o: add3(q.o, mul3(q.D, 0.6)) }))), name).toBeGreaterThan(0);
      expect(inside(plates), name).toBe(0);
    }
  });
});
