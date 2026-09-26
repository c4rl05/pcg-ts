/**
 * The tricolour on the Eiffel demo's rod (`demos/eiffel/flag.ts`, the gear
 * in `summit.ts`; SOURCES.md §29.4), against its sources:
 *
 * - THE SIZE is PL-XIX Fig. 4's 5.50 x 3.00 by default, the text's 7.50 x
 *   4.50 (p. 311) one switch away.
 * - THE GEAR: the « poulie de manœuvre » just under the points' spring, the
 *   « corde sans fin » down the rod to a lower sheave over the socket, the
 *   flag bent on its outer run, its head under the pulley.
 * - THE CLOTH as the graph builds it: a flat grid in the rod's plane whose
 *   `uv` runs 0 at the hoist to 1 at the fly, and the hoist band blue.
 * - THE PAGE'S POSE is pure in time: the same t gives the same bytes, the
 *   hoist never moves, no horizontal edge changes length and no vertical
 *   one stretches more than 10%, and at no sampled moment does the cloth
 *   cross the plane that separates it from every piece of the summit near
 *   it — a separating plane, so the check covers every triangle, not
 *   samples of them.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { FLAG_BANDS, FLAG_GRID, FLAG_POINTS, buildFlag, flagNormals, flagPose, flagWind } from "../demos/eiffel/flag.js";
import { assemble } from "../demos/eiffel/parts.js";
import { FLAG_GEAR, FLAG_SIZE, FLAG_SIZES, type FlagSize, ROD, buildSummit, flagHoist, lanternLevels } from "../demos/eiffel/summit.js";
import { FLOORS } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

/** PL-XIX Fig. 4 [sourced drawing] and E1900-TXT p. 311 [sourced]. */
const PLATE = { fly: 5.5, hoist: 3.0 };
const TEXT = { fly: 7.5, hoist: 4.5 };
/** The socket's head over the top platform, "3.05" [sourced PL-XIX Fig. 4]. */
const SOCKET_TOP = 3.05;

function points(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < 3 * geo.pointCount; i += 3) out.push([P[i]!, P[i + 1]!, P[i + 2]!]);
  return out;
}

/** Every polygon's points, one array per polygon. */
function polygons(geo: Geometry): Vec3[][] {
  const pts = points(geo);
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const n = geo.primVertexCount[p]!;
    out.push(Array.from({ length: n }, (_, k) => pts[geo.vertexToPoint[start + k]!]!));
  }
  return out;
}

/** The poses of `size` at every `step` seconds over `span`. */
function* poses(size: FlagSize, span = 600, step = 0.1): Generator<Float32Array> {
  const out = new Float32Array(3 * FLAG_POINTS);
  for (let k = 0; k * step <= span; k++) yield flagPose(k * step, out, size);
}

/**
 * The least x of the summit's pieces that reach into the height band
 * [y0, y1], each polygon whole: a polygon's least x is its least vertex's,
 * so this is exact for every triangle, not a sample.
 */
function leastX(pieces: ReadonlyArray<{ id: string; geo: Geometry }>, y0: number, y1: number): { x: number; id?: string } {
  let best: { x: number; id?: string } = { x: Infinity };
  for (const { id, geo } of pieces) {
    for (const poly of polygons(geo)) {
      const ys = poly.map((p) => p[1]);
      if (Math.max(...ys) < y0 || Math.min(...ys) > y1) continue;
      for (const p of poly) if (p[0] < best.x) best = { x: p[0], id };
    }
  }
  return best;
}

interface Cooked {
  cloth: Geometry;
  summit: Array<{ id: string; geo: Geometry }>;
  byId: (id: string) => Geometry;
}

async function cookFlag(): Promise<Cooked> {
  const g = new Graph(1889);
  const parts = buildSummit(g);
  const ids: string[] = [];
  for (const [cls, list] of Object.entries(parts)) {
    if (cls === "rivets" || !Array.isArray(list)) continue;
    for (const h of list as NodeHandle[]) {
      g.output(h, "out", `s:${h.id}`);
      ids.push(h.id);
    }
  }
  // The flag through the same `assemble` the tower's graph uses.
  assemble(g, buildFlag(g));
  const { outputs } = await cook(g);
  const geo = (name: string): Geometry => {
    const got = firstGeometry(outputs[name] ?? []);
    if (got === undefined) throw new Error(`${name} produced no geometry`);
    return got;
  };
  const summit = ids.map((id) => ({ id, geo: geo(`s:${id}`) }));
  return {
    cloth: geo("cloth.flag"),
    summit,
    byId: (id) => {
      const s = summit.find((q) => q.id === id);
      if (s === undefined) throw new Error(`no summit piece ${id}`);
      return s.geo;
    },
  };
}

describe("Eiffel summit: the tricolour on the rod", () => {
  let a: Cooked;
  let b: Cooked;
  beforeAll(async () => {
    a = await cookFlag();
    b = await cookFlag();
  }, 600_000);

  it("flies the plate's 5.50 x 3.00 by default, the text's 7.50 x 4.50 one switch away", () => {
    expect(FLAG_SIZES.plate).toEqual(PLATE);
    expect(FLAG_SIZES.text).toEqual(TEXT);
    expect(FLAG_SIZE).toBe(FLAG_SIZES.plate);
    const p = points(a.cloth);
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(PLATE.fly, 4);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(PLATE.hoist, 4);
    // Flat, in the rod's plane.
    for (const q of p) expect(q[2]).toBe(0);
    // Control: the text's flag is not the plate's.
    expect(flagHoist(FLAG_SIZES.text).foot).not.toBeCloseTo(flagHoist().foot, 2);
  });

  it("builds the cloth as a 24 x 12 grid whose uv runs from the hoist to the fly", () => {
    const { nu, nv } = FLAG_GRID;
    expect(a.cloth.pointCount).toBe(FLAG_POINTS);
    expect(FLAG_POINTS).toBe((nu + 1) * (nv + 1));
    expect(polygons(a.cloth).length).toBe(2 * nu * nv);
    const h = flagHoist();
    const uv = a.cloth.attrs.point.get("uv")!;
    expect(uv.tupleSize).toBe(2);
    const p = points(a.cloth);
    for (let i = 0; i < p.length; i++) {
      const [x, y] = p[i]!;
      expect(uv.data[2 * i]!).toBeCloseTo((h.x - x) / h.fly, 5);
      expect(uv.data[2 * i + 1]!).toBeCloseTo((y - h.foot) / h.hoist, 5);
    }
    // u = 0 is the hoist, on the rod side; the fly is away from it.
    const hoist = p.filter((_, i) => uv.data[2 * i]! < 1e-6);
    expect(hoist).toHaveLength(nv + 1);
    for (const q of hoist) expect(q[0]).toBeCloseTo(h.x, 5);
    expect(Math.min(...p.map((q) => q[0]))).toBeCloseTo(h.x - h.fly, 4);
  });

  it("puts bleu at the hoist, blanc in the middle and rouge at the fly", () => {
    const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const;
    const [bleu, blanc, rouge] = FLAG_BANDS.map(rgb);
    expect(bleu![2]).toBeGreaterThan(bleu![0] + 60);
    expect(bleu![2]).toBeGreaterThan(bleu![1] + 60);
    expect(Math.min(...blanc!)).toBeGreaterThan(200);
    expect(rouge![0]).toBeGreaterThan(rouge![1] + 100);
    expect(rouge![0]).toBeGreaterThan(rouge![2] + 100);
    // Control: the bands read fly to hoist fail the hoist's blue.
    const hoistBlue = (c: readonly number[]) => c[2]! > c[0]! + 60 && c[2]! > c[1]! + 60;
    expect(hoistBlue(bleu!)).toBe(true);
    expect(hoistBlue([...FLAG_BANDS].reverse().map(rgb)[0]!)).toBe(false);
  });

  it("hangs it from the pulley under the points, on the endless cord's outer run, over the socket", () => {
    const lv = lanternLevels();
    const h = flagHoist();
    // The pulley under the points' spring, the flag's head 0.39 under it.
    expect(lv.pointsFrom - h.pulleyY).toBeCloseTo(0.15, 9);
    expect(h.pulleyY - h.head).toBeCloseTo(0.39, 9);
    expect(h.head).toBeLessThan(lv.pointsFrom);
    expect(h.head - h.foot).toBeCloseTo(PLATE.hoist, 9);
    const sheaves = points(a.byId("flagSheavesSkin"));
    const top = Math.max(...sheaves.map((p) => p[1]));
    expect(top).toBeCloseTo(h.pulleyY + FLAG_GEAR.sheave, 3);
    expect(top).toBeLessThan(lv.pointsFrom);
    expect(FLOORS.flagTop - top).toBeLessThan(1.7);
    // The lower sheave over the socket's head.
    const bottom = Math.min(...sheaves.map((p) => p[1]));
    expect(bottom).toBeGreaterThan(FLOORS.topTerrace + SOCKET_TOP + 0.1);
    // The cord's two runs, pulley to lower sheave, on the flag's side.
    const cord = points(a.byId("flagCordSkin"));
    expect(Math.max(...cord.map((p) => p[1]))).toBeCloseTo(h.pulleyY, 3);
    expect(Math.min(...cord.map((p) => p[1]))).toBeCloseTo(h.lowerY, 3);
    expect(Math.max(...cord.map((p) => p[0]))).toBeLessThan(-ROD.foot);
    // The clips bridge the outer run to the hoist at the head and the foot.
    const clips = points(a.byId("flagClipsSkin"));
    expect(Math.min(...clips.map((p) => p[0]))).toBeCloseTo(h.x, 2);
    expect(Math.max(...clips.map((p) => p[1]))).toBeCloseTo(h.head + FLAG_GEAR.axle, 2);
    expect(Math.min(...clips.map((p) => p[1]))).toBeCloseTo(h.foot - FLAG_GEAR.axle, 2);
  });

  it("keeps the hoist on the cord and the cloth from stretching, at every tenth of a second for ten minutes", () => {
    const { nu, nv } = FLAG_GRID;
    const row = nu + 1;
    for (const size of [FLAG_SIZES.plate, FLAG_SIZES.text]) {
      const h = flagHoist(size);
      const ds = h.fly / nu;
      const dv = h.hoist / nv;
      let worstU = 0;
      let worstV = 0;
      for (const P of poses(size)) {
        for (let j = 0; j <= nv; j++) {
          const o = 3 * j * row;
          expect(P[o]).toBe(Math.fround(h.x));
          expect(P[o + 1]).toBe(Math.fround(h.foot + (j / nv) * h.hoist));
          expect(P[o + 2]).toBe(0);
          for (let i = 0; i < nu; i++) {
            const p = o + 3 * i;
            const q = p + 3;
            worstU = Math.max(worstU, Math.abs(Math.hypot(P[q]! - P[p]!, P[q + 1]! - P[p + 1]!, P[q + 2]! - P[p + 2]!) / ds - 1));
          }
        }
        for (let j = 0; j < nv; j++) {
          for (let i = 0; i <= nu; i++) {
            const p = 3 * (j * row + i);
            const q = p + 3 * row;
            worstV = Math.max(worstV, Math.abs(Math.hypot(P[q]! - P[p]!, P[q + 1]! - P[p + 1]!, P[q + 2]! - P[p + 2]!) / dv - 1));
          }
        }
      }
      // Along the fly the rows are integrated from their headings, so only f32 rounding.
      expect(worstU).toBeLessThan(1e-4);
      expect(worstV).toBeLessThan(0.1);
      // Control: a sheared row is caught.
      const P = flagPose(0, new Float32Array(3 * FLAG_POINTS), size);
      P[3 * (nv * row + nu)] += 0.3 * dv;
      let sheared = 0;
      for (let i = 0; i <= nu; i++) {
        const p = 3 * ((nv - 1) * row + i);
        const q = p + 3 * row;
        sheared = Math.max(sheared, Math.abs(Math.hypot(P[q]! - P[p]!, P[q + 1]! - P[p + 1]!, P[q + 2]! - P[p + 2]!) / dv - 1));
      }
      expect(sheared).toBeGreaterThan(0.01);
    }
  });

  it("never reaches the rod, its gear or anything else of the summit: a separating plane at every sampled moment", () => {
    for (const size of [FLAG_SIZES.plate, FLAG_SIZES.text]) {
      const h = flagHoist(size);
      let maxX = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const P of poses(size)) {
        for (let i = 0; i < FLAG_POINTS; i++) {
          maxX = Math.max(maxX, P[3 * i]!);
          y0 = Math.min(y0, P[3 * i + 1]!);
          y1 = Math.max(y1, P[3 * i + 1]!);
        }
      }
      // The cloth never comes round past its own hoist line toward the rod...
      expect(maxX).toBeLessThanOrEqual(Math.fround(h.x));
      // ...and nothing of the summit in its height band, but the clips that
      // hold it, comes within 1 cm of that line from the rod's side.
      const others = a.summit.filter((s) => s.id !== "flagClipsSkin");
      const near = leastX(others, y0, y1);
      expect(near.x - h.x, near.id).toBeGreaterThan(0.01);
      // Its lowest point stays over the lower sheave, the socket and the railing.
      expect(y0).toBeGreaterThan(h.lowerY + FLAG_GEAR.sheave + 0.5);
      // Controls: the clips do reach it; and a cloth pushed 2 cm toward the
      // rod crosses the plane.
      expect(leastX(a.summit, y0, y1).x - h.x).toBeLessThan(0.001);
      expect(maxX + 0.02 <= Math.fround(h.x)).toBe(false);
    }
    // The band the check covered, for the record: the plate's flag from the
    // head down to where the fly droops in the lulls.
    expect(flagHoist().head).toBeLessThan(lanternLevels().pointsFrom);
  });

  it("is pure in time: the same t gives the same bytes, another t another pose", () => {
    const one = new Float32Array(3 * FLAG_POINTS);
    const two = new Float32Array(3 * FLAG_POINTS);
    for (const t of [0, 0.1, 12.5, 333.3]) {
      flagPose(t, one);
      flagPose(99, two); // history must not matter
      flagPose(t, two);
      expect(Buffer.from(two.buffer).equals(Buffer.from(one.buffer))).toBe(true);
    }
    flagPose(12.5, one);
    flagPose(12.6, two);
    expect(Buffer.from(two.buffer).equals(Buffer.from(one.buffer))).toBe(false);
    // The wind is drawn from its seed: another seed, another wind.
    expect(flagWind(10).strength).toBe(flagWind(10).strength);
    expect(flagWind(10, 7).strength).not.toBe(flagWind(10).strength);
    // Its strength stays in the band the model is shaped for.
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = 0; t < 600; t += 0.5) {
      const s = flagWind(t).strength;
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
    expect(lo).toBeGreaterThan(0.4);
    expect(hi).toBeLessThan(1);
  });

  it("faces +z at rest, the flat grid's own normal, and turns its normals with the cloth", () => {
    const rest = new Float32Array(3 * FLAG_POINTS);
    const h = flagHoist();
    const { nu, nv } = FLAG_GRID;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const o = 3 * (j * (nu + 1) + i);
        rest[o] = h.x - (i / nu) * h.fly;
        rest[o + 1] = h.foot + (j / nv) * h.hoist;
      }
    }
    const n = flagNormals(rest, new Float32Array(3 * FLAG_POINTS));
    for (let i = 0; i < FLAG_POINTS; i++) expect(n[3 * i + 2]).toBeCloseTo(1, 6);
    const flying = flagNormals(flagPose(3, new Float32Array(3 * FLAG_POINTS)), new Float32Array(3 * FLAG_POINTS));
    for (let i = 0; i < FLAG_POINTS; i++) expect(Math.hypot(flying[3 * i]!, flying[3 * i + 1]!, flying[3 * i + 2]!)).toBeCloseTo(1, 5);
    // Control: flying, not every normal is still +z.
    expect(Math.min(...Array.from({ length: FLAG_POINTS }, (_, i) => flying[3 * i + 2]!))).toBeLessThan(0.99);
  });

  it("is deterministic: two cooks, identical cloth and gear", () => {
    const bytes = (x: Geometry) => Buffer.from(x.attrs.point.get("P")!.data.slice(0, 3 * x.pointCount).buffer);
    const same = (x: Geometry, y: Geometry) => bytes(x).equals(bytes(y));
    expect(same(a.cloth, b.cloth)).toBe(true);
    for (const id of ["flagSheavesSkin", "flagCordSkin", "flagClipsSkin", "flagCheeks"]) expect(same(a.byId(id), b.byId(id)), id).toBe(true);
    // Control: one coordinate of the cloth moved by an f32 step is told apart.
    const moved = bytes(a.cloth);
    moved[0] = moved[0]! ^ 1;
    expect(moved.equals(bytes(b.cloth))).toBe(false);
  });

  it("draws its wind from the seed and the clock alone", async () => {
    const { readFileSync } = await import("node:fs");
    // The code, not its comments (one says there is no `Math.random`).
    const src = readFileSync(new URL("../demos/eiffel/flag.ts", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const banned = /Math\.random|Date\.now|new Date|performance\.now/;
    expect(banned.test(src)).toBe(false);
    // Control: the pattern does catch a call.
    expect(banned.test("const r = Math.random();")).toBe(true);
  });
});
