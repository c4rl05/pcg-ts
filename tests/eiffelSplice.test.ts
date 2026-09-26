/**
 * The splices: where each arbalétrier's tronçons butt, and the cover plates
 * over every joint, each with its own rivet field (demos/eiffel/builtup.ts,
 * `SPLICE` in spec.ts, SOURCES.md §27.2).
 *
 * Held here: the joints where the text and PL-X put them (4.50 m tronçons,
 * three joints a panel with a node mid-tronçon, panel 5 bent in its two
 * joints 8.0267 apart, the upper joints 5 to 7 m apart); a cover over every
 * joint on every face, of PL-IX's sizes, their ends staggered; no cover in
 * the upright's own steel or in another cover; every splice head on its
 * cover and no seam head under one; and, counted, what the covers meet that
 * is not theirs. Each zero is first shown to be able to report otherwise
 * (a control fed a known clash).
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import {
  AS_BUILT,
  type UprightPlate,
  lowerCoverPlates,
  lowerJoints,
  lowerPlates,
  shaftCoverPlates,
  shaftPlates,
  upperJoints,
  upperLegCoverPlates,
  upperLegPlates,
} from "../demos/eiffel/builtup.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { JITTER } from "../demos/eiffel/parts.js";
import { NODES, SPLICE, profileAt } from "../demos/eiffel/spec.js";
import { MEMBERS4, type Name, type Slab, type Vec3, faceFrame, slabs } from "./support/eiffelBuiltupCensus.js";

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sc = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit = (p: Vec3): Vec3 => sc(p, 1 / len(p));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A rivet head's radius (strut.ts' RIVET_HEAD). */
const HEAD_R = 0.019;

/** A lower upright's axis over segment k (NODES[k] -> NODES[k + 1]), from the node table alone. */
function axis(name: Name, k: number): { A: Vec3; T: Vec3; L: number } {
  const m = MEMBERS4.find((x) => x[0] === name)!;
  const p = NODES[k]!;
  const q = NODES[k + 1]!;
  const A: Vec3 = [p[m[1]], p.y, p[m[2]]];
  const Q: Vec3 = [q[m[1]], q.y, q[m[2]]];
  return { A, T: unit(sub(Q, A)), L: len(sub(Q, A)) };
}

/** A box: centre, three unit axes and half-extents. */
interface Box {
  readonly c: Vec3;
  readonly axes: readonly Vec3[];
  readonly half: readonly number[];
}
const boxOf = (p: UprightPlate): Box => {
  const T = unit(sub(p.b, p.a));
  const n = unit(p.n);
  return { c: sc(add(p.a, p.b), 0.5), axes: [T, n, unit(cross(T, n))], half: [len(sub(p.b, p.a)) / 2, p.thickness / 2, p.width / 2] };
};
const slabBox = (s: Slab): Box => ({ c: s.c, axes: s.axes, half: s.half });

/** How deep two boxes interpenetrate along their least-separating axis (<= 0: apart) [separating axes]. */
function overlap(a: Box, b: Box): number {
  const axes: Vec3[] = [...a.axes, ...b.axes];
  for (const u of a.axes)
    for (const v of b.axes) {
      const c = cross(u, v);
      if (len(c) > 1e-6) axes.push(unit(c));
    }
  const d = sub(b.c, a.c);
  let least = Infinity;
  for (const L of axes) {
    const ra = a.half.reduce((s, h, i) => s + h * Math.abs(dot(a.axes[i]!, L)), 0);
    const rb = b.half.reduce((s, h, i) => s + h * Math.abs(dot(b.axes[i]!, L)), 0);
    least = Math.min(least, ra + rb - Math.abs(dot(d, L)));
    if (least <= 0) return least;
  }
  return least;
}

/** A uniform hash of boxes by the cells their bounding spheres touch. */
function grid(list: readonly Box[], cell = 1): (p: Vec3) => Box[] {
  const map = new Map<string, Box[]>();
  for (const b of list) {
    const r = Math.hypot(...b.half) + 0.05;
    const lo = b.c.map((v) => Math.floor((v - r) / cell));
    const hi = b.c.map((v) => Math.floor((v + r) / cell));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const key = `${i},${j},${k}`;
          const l = map.get(key);
          if (l === undefined) map.set(key, [b]);
          else l.push(b);
        }
  }
  return (p) => map.get(p.map((v) => Math.floor(v / cell)).join(",")) ?? [];
}

/** Every pair of `as` x `bs` near each other that interpenetrates by more than `tol`: the count and the deepest. */
function clashes(as: readonly Box[], bs: readonly Box[], tol: number): { n: number; deepest: number } {
  const near = grid(bs);
  let n = 0;
  let deepest = 0;
  for (const a of as) {
    let worst = 0;
    for (const b of near(a.c)) if (b !== a) worst = Math.max(worst, overlap(a, b));
    if (worst > tol) {
      n++;
      deepest = Math.max(deepest, worst);
    }
  }
  return { n, deepest };
}

interface Head {
  readonly base: Vec3;
  readonly axis: Vec3;
}
function heads(item: unknown): Head[] {
  const it = item as { kind: string; batches: { count: number; transforms: Float32Array }[] };
  if (it?.kind !== "instances") throw new Error("no rivets");
  const out: Head[] = [];
  for (const b of it.batches)
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      out.push({ base: [m[12]!, m[13]!, m[14]!], axis: unit([m[4]!, m[5]!, m[6]!]) });
    }
  return out;
}

/** Whether a head's base lies on a face of the box, its axis out of that face, its disk on it. */
function seatedOn(h: Head, b: Box, slack: number): boolean {
  const d = sub(h.base, b.c);
  for (let i = 0; i < 3; i++) {
    const up = dot(h.axis, b.axes[i]!);
    if (Math.abs(up) < 0.99) continue;
    if (Math.abs(dot(d, b.axes[i]!) * Math.sign(up) - b.half[i]!) > slack) continue;
    if ([0, 1, 2].every((j) => j === i || Math.abs(dot(d, b.axes[j]!)) <= b.half[j]! - HEAD_R + slack)) return true;
  }
  return false;
}

/** Whether a point lies inside a box by more than `margin`. */
const inside = (p: Vec3, b: Box, margin: number): boolean => {
  const d = sub(p, b.c);
  return b.half.every((h, i) => Math.abs(dot(d, b.axes[i]!)) < h - margin);
};

/**
 * A point under (or in) a plate: over its rectangle, 2 mm in, and within
 * 20 mm of its faces, where a seam head on the web under a cover sits.
 */
const under = (p: Vec3, b: Box): boolean => {
  const d = sub(p, b.c);
  const thin = b.half.indexOf(Math.min(...b.half));
  return [0, 1, 2].every((i) =>
    i === thin ? Math.abs(dot(d, b.axes[i]!)) < b.half[i]! + 0.02 : Math.abs(dot(d, b.axes[i]!)) < b.half[i]! - 0.002,
  );
};

describe("eiffel splices", () => {
  it("cuts the lower uprights into the text's tronçons: 4.50 m, a node mid-tronçon, panel 5 bent in its joints 8.0267 apart", () => {
    for (const [name] of MEMBERS4) {
      const joints = lowerJoints(name);
      // Panels 1-4 (XXVIII to XXIV): "13,50 m en nombre rond ... divisée en
      // trois parties de 4,50 m ... trois joints dans chaque panneau ; celui
      // du milieu correspond à l'entretoise intermédiaire ... les deux autres
      // sont à des distances égales de l'entretoise principale" [text p. 75].
      for (let k = 1; k <= 4; k++) {
        const { L } = axis(name, k);
        expect(L).toBeCloseTo(13.5, 1);
        const ts = joints.filter((j) => j.k === k).map((j) => j.t);
        expect(ts).toHaveLength(3);
        expect(ts[1]!).toBeCloseTo(L / 2, 9);
        for (const t of ts) expect(Math.abs(t - L / 2) < 1e-9 || Math.abs(Math.abs(t - L / 2) - L / 3) < 1e-9).toBe(true);
        // Each tronçon 4.50 "en nombre rond".
        expect(ts[1]! - ts[0]!).toBeCloseTo(4.5, 1);
      }
      // Every node XXVII-XXV mid-tronçon: its joints below and above equidistant.
      for (let k = 2; k <= 4; k++) {
        const below = axis(name, k - 1).L - joints.filter((j) => j.k === k - 1).at(-1)!.t;
        const above = joints.filter((j) => j.k === k)[0]!.t;
        expect(below).toBeCloseTo(above, 2);
      }
      // Panel 5: "ils s'infléchissent dans le joint qui existe en ce point"
      // at XXIV [text p. 76]; PL-X fig. 19: "Entre les deux coudes 8,0267",
      // "Distance au joint 4,01335"; figs. 15 and 18 section the upper bend
      // through its covers.
      const k5 = NODES.findIndex((n) => n.name === "XXIV");
      expect(axis(name, k5).L).toBeCloseTo(8.0267, 4);
      const p5 = joints.filter((j) => j.k === k5);
      expect(p5.map((j) => [j.bent, Number(j.t.toFixed(5))])).toEqual([
        [true, 0],
        [false, 4.01335],
      ]);
      expect(joints.filter((j) => j.bent).map((j) => NODES[j.k]!.name)).toEqual(["XXIV", "XXIII"]);
      // No joint within a metre of a node that is not bent in one: a
      // tronçon carries its node's attachments on its middle.
      for (const j of joints.filter((x) => !x.bent)) {
        expect(Math.min(j.t, axis(name, j.k).L - j.t), `${name} ${NODES[j.k]!.name}+${j.t.toFixed(2)}`).toBeGreaterThan(1.8);
      }
    }
  });

  it("puts the upper joints 5 to 7 m apart as the text prints, to within what whole tronçons a panel allow", () => {
    // "Les joints sont distants de 5 à 7 mètres" [text p. 77]; each panel
    // takes round(L / 6) at (i + 1/2) L / n, so a joint spacing is at worst
    // three quarters of one panel plus a quarter of the next: every one
    // measured between 4.4 and 8.4 m, three in four within 5-7 m (the
    // shaft's short top panels are the long ones) [measured].
    const spacing: number[] = [];
    for (const name of ["c", "bd"] as const) {
      const js = upperJoints(name);
      const along = js.map((j) => {
        let s = j.t;
        for (let k = NODES.findIndex((n) => n.name === (name === "c" ? "XVII" : "XI")); k < j.k; k++) {
          const [p, q] = [NODES[k]!, NODES[k + 1]!];
          s += Math.hypot(q.y - p.y, q.outer - p.outer, name === "c" ? q.outer - p.outer : 0);
        }
        return s;
      });
      for (let i = 1; i < along.length; i++) spacing.push(along[i]! - along[i - 1]!);
    }
    expect(Math.min(...spacing)).toBeGreaterThan(4.4);
    expect(Math.max(...spacing)).toBeLessThan(8.4);
    expect(spacing.filter((s) => s >= 5 && s <= 7).length / spacing.length).toBeGreaterThan(0.5);
  });

  it("covers every lower joint on every face at the laced depth, with PL-IX's plates, their ends staggered", async () => {
    const g = buildEiffel(1889, { lacedWeb: true });
    g.output({ id: "legUprightPlatesLit" } as NodeHandle, "out", "probe:legUprightPlatesLit");
    const { outputs } = await cook(g);
    const all = slabs(firstGeometry(outputs["probe:legUprightPlatesLit"] as never) as Geometry).filter((s) => s.c[0] > 0 && s.c[2] > 0);
    // Tag each short slab (every other piece runs its panel) by upright,
    // segment and face, and read it in its face's (s, o) and along the axis.
    interface Cover {
      readonly name: Name;
      readonly k: number;
      readonly d: readonly [number, number];
      readonly s: readonly [number, number];
      readonly o: readonly [number, number];
      readonly u: readonly [number, number];
      readonly t: number;
      readonly yMin: number;
      readonly yMax: number;
    }
    const covers: Cover[] = [];
    for (const sl of all) {
      const pr = profileAt(sl.c[1]);
      const [name, xs, zs] = MEMBERS4.reduce((b, m) =>
        Math.hypot(sl.c[0] - pr[m[1]], sl.c[2] - pr[m[2]]) < Math.hypot(sl.c[0] - pr[b[1]], sl.c[2] - pr[b[2]]) ? m : b,
      );
      let k = 0;
      while (k < 11 && NODES[k + 1]!.y <= sl.c[1]) k++;
      const { A, T } = axis(name, k);
      const run = [0, 1, 2].find((i) => Math.abs(dot(sl.axes[i]!, T)) > 0.99);
      if (run === undefined || 2 * sl.half[run]! >= 1.5) continue;
      const dx = sl.c[0] - pr[xs];
      const dz = sl.c[2] - pr[zs];
      const d: readonly [number, number] = Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
      const f = faceFrame(name, k, d);
      const corners = [-1, 1].flatMap((a) =>
        [-1, 1].flatMap((b) => [-1, 1].map((c) => add(sl.c, add(sc(sl.axes[0], a * sl.half[0]), add(sc(sl.axes[1], b * sl.half[1]), sc(sl.axes[2], c * sl.half[2])))))),
      );
      const local = corners.map((p) => {
        const u = dot(sub(p, A), T);
        const v = sub(sub(sub(p, A), sc(T, u)), f.mid);
        return { s: dot(v, f.e), o: dot(v, f.n), u, y: p[1] };
      });
      const range = (key: "s" | "o" | "u") => [Math.min(...local.map((x) => x[key])), Math.max(...local.map((x) => x[key]))] as const;
      covers.push({
        name,
        k,
        d,
        s: range("s"),
        o: range("o"),
        u: range("u"),
        t: Math.min(...sl.half) * 2,
        yMin: Math.min(...local.map((x) => x.y)),
        yMax: Math.max(...local.map((x) => x.y)),
      });
    }
    expect(covers.length).toBeGreaterThan(2000);
    const exterior = (name: Name, d: readonly [number, number]) =>
      !(
        {
          a: [[1, 0], [0, 1]],
          b: [[1, 0], [0, -1]],
          c: [[-1, 0], [0, -1]],
          d: [[0, 1], [-1, 0]],
        } as const
      )[name].some(([x, z]) => x === d[0] && z === d[1]);
    const round = (v: number) => Math.round(v * 1000);
    let straight = 0;
    for (const [name] of MEMBERS4) {
      for (const j of lowerJoints(name)) {
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const same = (c: Cover) => c.name === name && c.d[0] === d[0] && c.d[1] === d[1];
          if (j.bent) {
            // At a bend each half on its own panel's face, wholly on its own
            // side of the node's horizontal plane (f32 at 50 m: 0.1 mm).
            const y = NODES[j.k]!.y;
            // (Its halves: the covers on either panel reaching within 0.3 m
            // of the node, none of them centred on a straight joint.)
            const centred = (c: Cover) =>
              lowerJoints(name).some((x) => !x.bent && x.k === c.k && Math.abs((c.u[0] + c.u[1]) / 2 - x.t) < 0.002);
            const lo = covers.filter((c) => same(c) && c.k === j.k - 1 && c.yMax > y - 0.3 && !centred(c));
            const hi = covers.filter((c) => same(c) && c.k === j.k && c.yMin < y + 0.3 && !centred(c));
            expect(lo.length, `${name} ${NODES[j.k]!.name} ${d} below`).toBeGreaterThan(0);
            expect(hi.length, `${name} ${NODES[j.k]!.name} ${d} above`).toBeGreaterThan(0);
            for (const c of lo) expect(c.yMax).toBeLessThan(y + 1e-4);
            for (const c of hi) expect(c.yMin).toBeGreaterThan(y - 1e-4);
            // The long run into the long panel (PL-X fig. 19's 765 / 965 below
            // XXIV, 380 / 510 above; XXIII its mirror).
            const long = NODES[j.k]!.name === "XXIV" ? lo : hi;
            const short = NODES[j.k]!.name === "XXIV" ? hi : lo;
            expect(new Set(long.map((c) => round(c.u[1] - c.u[0])))).toEqual(new Set([765, 965]));
            expect(new Set(short.map((c) => round(c.u[1] - c.u[0])))).toEqual(new Set([380, 510]));
            continue;
          }
          // A straight joint: every cover centred on it.
          const here = covers.filter((c) => same(c) && c.k === j.k && Math.abs((c.u[0] + c.u[1]) / 2 - j.t) < 0.002);
          const where = `${name} ${NODES[j.k]!.name}+${j.t.toFixed(2)} ${d}`;
          straight++;
          // Nothing of a cover under the web's outer face.
          for (const c of here) expect(c.o[0], where).toBeGreaterThan(-5e-4);
          const kinds = new Map<string, number>();
          for (const c of here) {
            const key = `${round(c.t)}x${round(c.u[1] - c.u[0])}`;
            kinds.set(key, (kinds.get(key) ?? 0) + 1);
          }
          const sorted = new Map([...kinds].sort());
          if (j.k > 5) {
            // PL-X figs. 15, 18: a 12 mm web cover each side of the C.J.
            // and a 200 x 12 over it (lengths panels 1-4's, estimated).
            expect(sorted, where).toEqual(new Map([["12x940", 2], ["12x1340", 1]]));
          } else if (exterior(name, d)) {
            // PL-IX figs. 23-24: web covers "290 x 15", "0.94"; the fin's
            // angles "80 x 80 x 15", "1.34", each two boxes (flat, leg).
            expect(sorted, where).toEqual(new Map([["15x940", 2], ["15x1340", 4]]));
            const webs = here.filter((c) => round(c.u[1] - c.u[0]) === 940);
            // 290 wide, or narrower at the lozenge's acute corner (the
            // neighbouring web's edge stands 3.3 mm out there): 277 at least.
            for (const c of webs) {
              expect(c.s[1] - c.s[0], where).toBeLessThan(0.29 + 2e-4);
              expect(c.s[1] - c.s[0], where).toBeGreaterThan(0.277);
            }
          } else {
            // PL-IX figs. 21-22: "C.j. 380 x 12" and its fillers "0.54 +
            // 0.54", the corner flats "85 x 12" "1.02", the channel's angles
            // "85 x 85 x 15" "1.34".
            expect(sorted, where).toEqual(new Map([["12x1020", 2], ["12x1080", 3], ["15x1340", 4]]));
            const centre = here.find((c) => round(c.u[1] - c.u[0]) === 1080 && c.s[0] < 0 && c.s[1] > 0)!;
            expect(centre.s[1] - centre.s[0], where).toBeCloseTo(0.38, 3);
            // The covers' ends at three stations each side: no two covers
            // of a face end together (the plies themselves all end on the
            // joint, "dans un même plan normal à l'axe").
            expect(new Set(here.map((c) => round(c.u[1] - c.u[0]))).size, where).toBe(3);
          }
        }
      }
    }
    // 30 joints an upright, 2 of them bent, 4 faces, 4 uprights.
    expect(straight).toBe(4 * 4 * 28);
  }, 600_000);

  it("keeps every cover out of the steel it lies on and out of every other cover", () => {
    // Laid out, before the jitter. Tolerance: the classes' 1 mm jitter, under
    // which the neighbouring web's edge (0.6-0.9 mm out of the face where no
    // cover keeps off it, builtup.ts `SLIVER`) is left.
    const TOL = JITTER;
    const lower = lowerCoverPlates().map(boxOf);
    const lowerSteel = lowerPlates(AS_BUILT)
      .filter((p) => !["cover", "coverAngle", "filler"].includes(p.what))
      .map(boxOf);
    const upper = [...upperLegCoverPlates(), ...shaftCoverPlates()].map(boxOf);
    const upperSteel = [...upperLegPlates(AS_BUILT), ...shaftPlates(AS_BUILT)]
      .filter((p) => !["cover", "coverAngle", "filler"].includes(p.what))
      .map(boxOf);
    // The control: a web cover pushed 5 mm into its web (along its face's
    // outward normal, which a lying plate carries as its own) is seen.
    const pushed = lowerCoverPlates()
      .filter((p) => p.what === "cover")
      .slice(0, 50)
      .map((p) => boxOf({ ...p, a: sub(p.a, sc(p.n, 0.005)), b: sub(p.b, sc(p.n, 0.005)) }));
    expect(clashes(pushed, lowerSteel, TOL).n).toBeGreaterThan(0);
    expect(clashes(lower, lowerSteel, TOL)).toEqual({ n: 0, deepest: 0 });
    expect(clashes(upper, upperSteel, TOL)).toEqual({ n: 0, deepest: 0 });
    expect(clashes(lower, lower, TOL)).toEqual({ n: 0, deepest: 0 });
    expect(clashes(upper, upper, TOL)).toEqual({ n: 0, deepest: 0 });
  });

  it("seats every splice head on its cover, runs no seam row under one, and counts what the covers meet that is not theirs", async () => {
    const g = buildEiffel(1889, { rivets: true });
    const probes = ["legUprightPlatesLit", "legUprightUpperPlatesLit", "shaftUprightPlatesLit", "gussetsOut"];
    for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[id] as never) as Geometry;
    const upright = [...probes.slice(0, 3).flatMap((id) => slabs(geo(`probe:${id}`)))];
    // A cover: under 1.5 m along its length, where every other upright
    // plate runs its panel (an L's closing plates, 1.05 either side of a
    // node, are 8 mm and inside the box: they are the exception, by thickness).
    const isCover = (s: Slab) => {
      const h = [...s.half].sort((x, y) => x - y);
      return 2 * h[2]! < 1.5 && 2 * h[0]! > 0.0105;
    };
    const covers = upright.filter(isCover).map(slabBox);
    const steel = upright.filter((s) => !isCover(s)).map(slabBox);
    expect(covers.length).toBeGreaterThan(10_000);
    const nearCover = grid(covers);
    const nearAll = grid([...covers, ...steel]);
    const slack = 2 * JITTER * Math.sqrt(3);

    // Every splice head seated on a face of a cover, or (the rivets through
    // a channel's leg) on the channel leg's inner face, and in no steel.
    for (const set of ["leg.uprights.splices", "shaft.uprights.splices"]) {
      const list = heads((outputs[`rivets.${set}`] as unknown[])[0]);
      expect(list.length, set).toBeGreaterThan(set.startsWith("leg") ? 200_000 : 10_000);
      // The control: a head lifted 8 mm off its cover is not seated.
      const lifted = list.slice(0, 200).map((h) => ({ base: add(h.base, sc(h.axis, 0.008)), axis: h.axis }));
      expect(lifted.filter((h) => nearAll(h.base).some((b) => seatedOn(h, b, slack))).length).toBe(0);
      let unseated = 0;
      let onSteel = 0;
      let offChannel = 0;
      let buried = 0;
      const coverSet = new Set(covers);
      // A channel's outstanding leg: 12 thick, 88 proud of the web.
      const channelLeg = (b: Box) => {
        const h = [...b.half].sort((x, y) => x - y);
        return Math.abs(2 * h[0]! - 0.012) < 1e-3 && Math.abs(2 * h[1]! - 0.088) < 1e-3;
      };
      for (const h of list) {
        const seats = nearAll(h.base).filter((b) => seatedOn(h, b, slack));
        if (seats.length === 0) unseated++;
        else if (!seats.some((b) => coverSet.has(b))) {
          onSteel++;
          if (!seats.some(channelLeg)) offChannel++;
        }
        if (nearAll(h.base).some((b) => inside(h.base, b, slack))) buried++;
      }
      expect(unseated, set).toBe(0);
      expect(buried, set).toBe(0);
      // On steel: only the heads on the channel legs' inner faces (the other
      // end of each rivet through a channel's leg, PL-IX fig. 21).
      expect(offChannel, set).toBe(0);
      if (set.startsWith("shaft")) expect(onSteel).toBe(0);
      else expect(onSteel).toBeGreaterThan(0);
    }

    // No splice head on another head: none within a head's diameter of any
    // head of any set (less both jitters), but the two heads of one rivet
    // through a channel's leg and its cover, back to back 27 mm apart.
    {
      const all = Object.keys(outputs)
        .filter((k) => k.startsWith("rivets."))
        .flatMap((k) => heads((outputs[k] as unknown[])[0]).map((h) => ({ ...h, splice: k.endsWith(".splices"), ff: k.startsWith("rivets.ff.") })));
      const cell = 0.05;
      type Tagged = Head & { readonly ff?: boolean };
      const byCell = new Map<string, Tagged[]>();
      const key = (p: Vec3) => p.map((v) => Math.floor(v / cell)).join(",");
      const put = (h: Tagged) => {
        const l = byCell.get(key(h.base));
        if (l === undefined) byCell.set(key(h.base), [h]);
        else l.push(h);
      };
      for (const h of all) put(h);
      const crowded = (h: Head, ff: boolean) => {
        const [i, j, k] = h.base.map((v) => Math.floor(v / cell)) as [number, number, number];
        for (let a = -1; a <= 1; a++)
          for (let b2 = -1; b2 <= 1; b2++)
            for (let c = -1; c <= 1; c++)
              for (const q of byCell.get(`${i + a},${j + b2},${k + c}`) ?? []) {
                if (q === h || (q.ff === true) !== ff || len(sub(q.base, h.base)) >= 2 * HEAD_R - 2 * slack) continue;
                // Back to back: facing apart, along their common axis.
                const apart = dot(q.axis, h.axis) < -0.99 && dot(sub(q.base, h.base), h.axis) < 0;
                if (!apart) return true;
              }
        return false;
      };
      const splice = all.filter((x) => x.splice);
      // The control: a head 10 mm off a splice head, facing its way, is seen.
      const ghost: Tagged = { base: add(splice[0]!.base, sc(cross(splice[0]!.axis, [0, 1, 0]), 0.01)), axis: splice[0]!.axis, ff: false };
      put(ghost);
      expect(crowded(splice[0]!, false)).toBe(true);
      byCell.get(key(ghost.base))!.pop();
      expect(splice.filter((h) => crowded(h, false)).length).toBe(0);
      // Save by the first floor's own rows (girders, montants, end posts),
      // which run on the uprights' webs over the bends XXIV and XXIII, under
      // the covers there (firstFloor.ts; SOURCES.md §27.2) [measured].
      expect(splice.filter((h) => crowded(h, true)).length).toBeLessThanOrEqual(98);
    }

    // No seam head under a cover (the corner rows stop half a pitch short of
    // it and run on over it as the cover's own column).
    const seams = ["leg.uprights", "leg.uprights.upper", "shaft.uprights"].flatMap((n) => heads((outputs[`rivets.${n}`] as unknown[])[0]));
    // The control: points on the web under each cover's middle are seen.
    const probeUnder = covers.slice(0, 200).map((b) => {
      const thin = b.half.indexOf(Math.min(...b.half));
      return sub(b.c, sc(b.axes[thin]!, b.half[thin]! * 0.5));
    });
    expect(probeUnder.filter((p) => nearCover(p).some((b) => under(p, b))).length).toBe(200);
    expect(seams.filter((h) => nearCover(h.base).some((b) => under(h.base, b))).length).toBe(0);

    // WHAT THE COVERS MEET THAT IS NOT THEIRS, counted (the tower-wide
    // census; each a residual of another rule's, SOURCES.md §27.2):
    //  - the joint plates, which lap an upright's faces 8 mm off the web
    //    (D3 of the built-up study): a 12-15 mm cover under one stands 1-10
    //    mm into it, a fin's or channel's angle cover through it (up to 41
    //    mm). 640 of them at the mid-panel joints of panels 1-4, under the
    //    intermediate entretoise's plates; 440 at the bends XXIV and XXIII,
    //    under the 1st floor's; 16 at XVI [measured].
    const gussets = slabs(geo("probe:gussetsOut")).map(slabBox);
    const pierced = clashes(covers, gussets, 0.001);
    expect(pierced.n).toBeGreaterThan(0);
    expect(pierced.n).toBeLessThanOrEqual(1104);
    expect(pierced.deepest).toBeLessThan(0.041);
    //  - the first floor's arches, whose ends stand 2-11 mm off the webs
    //    (§27, left for the first floor), and the 2nd floor's chords, which
    //    clip at the old skin inside the web: their vertices in a cover.
    //    The arches are counted by the COVERS they reach and how deep, not
    //    by vertices: their round parts are cut by a chord tolerance
    //    (`chord.ts`), so the vertex count on the same grazes follows the
    //    segmentation (444 at 12 segments a head, 1,301 at 22-26), and the
    //    finer curve sits nearer the true one, which reaches 5.7 mm into a
    //    15 mm cover at the leg corners where the polygon reached 2.2
    //    [measured 2026-09-26: 44 covers, then 43]. The girders' count
    //    rose with the same change, 242 to 310: the 1st floor's decorative
    //    girders' rounded corners, cut finer (6 to 8 chords), graze 20 more
    //    covers at y 48-50 by the legs, 7.5 mm deep at most (6.6 before).
    for (const [cls, most, covered, depth] of [
      ["arches", Infinity, 44, 0.006],
      ["girders", 310, 53, 0.008],
      ["bracing", 0, 0, 0],
      ["horizontals", 0, 0, 0],
      ["platforms", 0, 0, 0],
    ] as const) {
      const gm = geo(cls);
      const P = gm.attrs.point.get("P")!.data;
      let n = 0;
      const hit = new Set<Box>();
      let deepest = 0;
      for (let i = 0; i < gm.attrs.point.count; i++) {
        const p: Vec3 = [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
        const boxes = nearCover(p).filter((b) => inside(p, b, 0.001));
        if (boxes.length > 0) n++;
        for (const b of boxes) {
          hit.add(b);
          const d = sub(p, b.c);
          deepest = Math.max(deepest, Math.min(...b.half.map((h, k) => h - Math.abs(dot(d, b.axes[k]!)))));
        }
      }
      expect(n, cls).toBeLessThanOrEqual(most);
      expect(hit.size, `${cls} covers`).toBeLessThanOrEqual(covered);
      expect(deepest, `${cls} depth`).toBeLessThanOrEqual(depth);
    }
  }, 600_000);
});
