/**
 * No lacing rivet in a plate.
 *
 * A laced strut's lacing rivets sit on its corner angles' outer faces, one
 * wherever a lacing bar meets a chord. Two kinds of plate lie over those
 * faces. A joint's gusset plates cover the first stretch of the strut at
 * each end, with the joint rivets on top of them, and overlap their
 * neighbours' at a node; a lacing head there stands in the plate. A
 * crossing plate is set UNDER the angles' outer face, covering the lacing
 * between them, with its own rows round its edge: on the narrow struts a
 * lacing head over it stands in the plate, and on every strut it stands on
 * top of the plate's own edge heads. strut.ts leaves all of them out (its
 * tower-wide joint-plate cloud, and `covers`); this cooks the riveted
 * tower and checks both — no lacing head in a plate, and none on another
 * head of a plate's rows.
 *
 * The plates are read BEFORE the class's jitter (`gussetsOut`): a plate is
 * 8-10 mm thick, and 1 mm of jitter on each end of that edge swings a
 * normal read from it by up to 18 degrees — which, 0.4 m from the plate's
 * centre, is several centimetres of made-up clash. The normal is taken
 * from the two long edges instead, and the heads keep their jitter (at
 * most 1.7 mm), which the slack covers.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { JITTER } from "../demos/eiffel/parts.js";

type Vec3 = readonly [number, number, number];

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => {
  const l = len3(p);
  return [p[0] / l, p[1] / l, p[2] / l];
};
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];

/**
 * A rivet head's radius (strut.ts' RIVET_HEAD) and height: the host's unit
 * cap rises 0.7 of its radius (main.ts).
 */
const HEAD_R = 0.019;
const HEAD_H = 0.7 * HEAD_R;

/**
 * Every rivet set a laced strut spawns at its lacing (`rivetOutputs`' plain
 * names; `.joints` are the joint rows, which sit ON their plates).
 */
const LACING_SETS = [
  "leg.horizontals",
  "leg.entretoises",
  "leg.bracing",
  "leg.posts",
  "leg.gap.bracing",
  "leg.gap.horizontals",
  "shaft.horizontals",
  "shaft.bracing",
  "ff.girders.web",
  "ff.entretoises",
  "ff.second.web",
  "summit.p29.posts",
  // And the covers' own fields over the uprights' tronçon joints (builtup.ts,
  // the splices), which a joint plate can lap as it laps the lacing.
  "leg.uprights.splices",
  "shaft.uprights.splices",
] as const;

interface Rivet {
  readonly base: Vec3;
  readonly axis: Vec3;
}

function rivets(item: unknown): Rivet[] {
  const it = item as { kind: string; batches: { count: number; transforms: Float32Array }[] };
  if (it?.kind !== "instances") throw new Error("no rivets");
  const out: Rivet[] = [];
  for (const b of it.batches) {
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      out.push({ base: [m[12]!, m[13]!, m[14]!], axis: unit3([m[4]!, m[5]!, m[6]!]) });
    }
  }
  return out;
}

/** A plate: centre, unit normal, its two in-plane axes, and half-extents. */
interface Plate {
  readonly c: Vec3;
  readonly n: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
  readonly hu: number;
  readonly hv: number;
  readonly ht: number;
}

/**
 * Every thin box of a box-mesh class. A copied unit box is 24 points
 * (three per corner, each face its own normals) or 8; its corners are the
 * distinct positions in its run. From one corner, the two longer of its
 * three edges span the plate and their cross product is its normal.
 */
function plates(geo: Geometry): Plate[] {
  const P = geo.attrs.point.get("P")!.data;
  const n = geo.attrs.point.count;
  const run = n % 24 === 0 ? 24 : 8;
  expect(n % run).toBe(0);
  const out: Plate[] = [];
  for (let i = 0; i < n; i += run) {
    const pts: Vec3[] = [];
    for (let k = i; k < i + run; k++) {
      const p: Vec3 = [P[3 * k]!, P[3 * k + 1]!, P[3 * k + 2]!];
      if (!pts.some((q) => len3(sub3(p, q)) < 1e-5)) pts.push(p);
    }
    expect(pts.length).toBe(8);
    const c = pts.reduce<Vec3>((a, p) => [a[0] + p[0] / 8, a[1] + p[1] / 8, a[2] + p[2] / 8], [0, 0, 0]);
    const p0 = pts[0]!;
    // The three edges from p0: the shortest offset, then each next shortest
    // square to those taken. (Its three NEAREST corners will not do: past
    // the thickness, a long edge plus the thickness is nearer than the
    // other long edge, and all but parallel to the first.)
    const e: Vec3[] = [];
    for (const v of pts.slice(1).map((p) => sub3(p, p0)).sort((x, y) => len3(x) - len3(y))) {
      if (e.every((u) => Math.abs(dot3(u, v)) < 0.1 * len3(u) * len3(v))) e.push(v);
    }
    expect(e.length).toBe(3);
    const [t, a, b] = e as [Vec3, Vec3, Vec3];
    if (len3(t) > 0.02) continue; // not a plate
    out.push({ c, n: unit3(cross3(a, b)), u: unit3(a), v: unit3(b), hu: len3(a) / 2, hv: len3(b) / 2, ht: len3(t) / 2 });
  }
  return out;
}

/** A uniform hash of plates by the cells their bounding spheres touch. */
function plateGrid(list: readonly Plate[], cell: number): (p: Vec3) => Plate[] {
  const map = new Map<string, Plate[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  for (const b of list) {
    const r = Math.hypot(b.hu, b.hv, b.ht) + HEAD_R + HEAD_H;
    const lo = b.c.map((v) => Math.floor((v - r) / cell));
    const hi = b.c.map((v) => Math.floor((v + r) / cell));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const s = key(i, j, k);
          const l = map.get(s);
          if (l === undefined) map.set(s, [b]);
          else l.push(b);
        }
  }
  return (p) => map.get(key(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell))) ?? [];
}

/**
 * Whether a head stands in a plate: its base inside the plate's rectangle
 * and its dome, rising along its axis, overlapping the slab. A head on the
 * plate's outer face (a joint or crossing row) rises away from it and is
 * not; nor is a head on another face, standing across the plate's normal.
 */
function inPlate(r: Rivet, b: Plate, slack: number): boolean {
  const d = sub3(r.base, b.c);
  if (Math.abs(dot3(d, b.u)) > b.hu - slack) return false;
  if (Math.abs(dot3(d, b.v)) > b.hv - slack) return false;
  const up = dot3(r.axis, b.n);
  if (Math.abs(up) < 0.5) return false;
  // The base's height above the slab's mid-plane, along the head's sense.
  const s = dot3(d, b.n) * Math.sign(up);
  return s < b.ht - slack && s + HEAD_H > -b.ht + slack;
}

describe("eiffel rivet clash", () => {
  it("leaves no lacing rivet in a plate, or on a plate's own rows", async () => {
    const g = buildEiffel(1889, { rivets: true });
    g.output({ id: "gussetsOut" } as NodeHandle, "out", "probe:gussetsOut");
    const { outputs } = await cook(g);
    const all = plates(firstGeometry(outputs["probe:gussetsOut"]!)!);
    expect(all.length).toBeGreaterThan(4000);
    const near = plateGrid(all, 1);
    const slack = 2 * JITTER * Math.sqrt(3);
    const hits: Record<string, number> = {};
    let checked = 0;
    for (const name of LACING_SETS) {
      const list = outputs[`rivets.${name}`];
      expect(list, `rivets.${name}`).toBeDefined();
      for (const r of rivets((list as unknown[])[0])) {
        checked++;
        if (near(r.base).some((b) => inPlate(r, b, slack))) hits[name] = (hits[name] ?? 0) + 1;
      }
    }
    expect(checked).toBeGreaterThan(200_000);
    expect(hits).toEqual({});

    // And no lacing head within a head's width of a joint or crossing row's.
    const rows: Vec3[] = [];
    for (const k of Object.keys(outputs)) {
      if (!k.startsWith("rivets.")) continue;
      if (k.endsWith(".joints") || k.includes(".crossings")) {
        for (const r of rivets((outputs[k] as unknown[])[0])) rows.push(r.base);
      }
    }
    expect(rows.length).toBeGreaterThan(50_000);
    const cell = 0.1;
    const byCell = new Map<string, Vec3[]>();
    const key = (p: Vec3) => p.map((v) => Math.floor(v / cell)).join(",");
    for (const p of rows) {
      const k = key(p);
      const l = byCell.get(k);
      if (l === undefined) byCell.set(k, [p]);
      else l.push(p);
    }
    const onRow: Record<string, number> = {};
    for (const name of LACING_SETS) {
      for (const r of rivets((outputs[`rivets.${name}`] as unknown[])[0])) {
        const [i, j, k] = r.base.map((v) => Math.floor(v / cell)) as [number, number, number];
        let hit = false;
        for (let a = -1; a <= 1 && !hit; a++)
          for (let b = -1; b <= 1 && !hit; b++)
            for (let c = -1; c <= 1 && !hit; c++)
              for (const q of byCell.get(`${i + a},${j + b},${k + c}`) ?? []) {
                if (len3(sub3(q, r.base)) < 2 * HEAD_R) hit = true;
              }
        if (hit) onRow[name] = (onRow[name] ?? 0) + 1;
      }
    }
    expect(onRow).toEqual({});
  }, 600_000);
});
