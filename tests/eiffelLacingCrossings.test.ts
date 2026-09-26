/**
 * The lacing's crossings (strut.ts `latticeStruts`; SOURCES.md §27.5).
 *
 * A laced strut's four faces each carry two zigzags in opposite phase, an
 * X a bay, and PL-X Fig. 12 draws a rivet at every crossing of the two:
 * one head a bay a face, half way between two lacing samples, on the
 * face's centre line, standing on the outer bar. This cooks one strut on
 * its own and holds every crossing head to that, and to the lacing mesh it
 * stands on (with a control that a head 5 mm off it is caught); and that a
 * crossing plate over a face takes the crossings under it, as it takes the
 * chord heads, and leaves the other faces'.
 *
 * The tower-wide invariants (no lacing head in a plate or on a plate's
 * rows) are tests/eiffelRivetClash.test.ts', which reads the crossings as
 * lacing heads of their sets.
 */
import { describe, expect, it } from "vitest";
import { type Geometry, Graph, cook, firstGeometry } from "pcg-ts";
import type { PlateFootprint } from "../demos/eiffel/crossing.js";
import { segmentMembers } from "../demos/eiffel/lattice.js";
import { JITTER } from "../demos/eiffel/parts.js";
import { latticeStruts } from "../demos/eiffel/strut.js";

type Vec3 = readonly [number, number, number];
const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sc = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const unit = (p: Vec3): Vec3 => sc(p, 1 / Math.hypot(...p));

/** An 800 strut (strut.ts: chords 0.045 in from its 0.40 outer half-width), laced at 1.00. */
const W = 0.355;
const CHORD = 0.045;
const LACE = 0.0225;
const STEP = 1.0;
/** A leaning member whose face normal is not square to it (the strut squares it). */
const A: Vec3 = [0, 0, 0];
const B: Vec3 = [0, 8, 3.3];
const F: Vec3 = [0.95, 0.3, 0.05];
const LEN = Math.hypot(...sub(B, A));
const T = unit(sub(B, A));
const N = unit(sub(F, sc(T, dot(F, T))));
const Bn = cross(N, T);
/** Each head moves by the rivets' jitter, a millimetre an axis. */
const SLACK = JITTER * Math.sqrt(3) + 1e-4;
/** How square a head stands to its face: its axis' cosine to the face's normal. */
const AIM = 0.9999;

interface Head {
  readonly base: Vec3;
  readonly axis: Vec3;
}

async function strut(covers?: readonly PlateFootprint[]): Promise<{ heads: Head[]; lacing: Geometry }> {
  const g = new Graph();
  const paths = segmentMembers(g, "m", [{ a: A, b: B, n: F }]);
  const s = latticeStruts(g, "s", paths, {
    halfWidth: [[0, W]],
    chord: CHORD,
    lacing: LACE,
    pitch: 1,
    step: [[0, STEP]],
    rivets: true,
    ...(covers === undefined ? {} : { covers }),
  });
  g.output(s.rivets!, "instances", "rivets");
  g.output(s.lacing, "out", "lacing");
  const { outputs } = await cook(g);
  const it = (outputs.rivets as unknown[])[0] as { batches: { count: number; transforms: Float32Array }[] };
  const heads: Head[] = [];
  for (const b of it.batches)
    for (let k = 0; k < b.count; k++) {
      const m = b.transforms.subarray(16 * k, 16 * k + 16);
      heads.push({ base: [m[12]!, m[13]!, m[14]!], axis: unit([m[4]!, m[5]!, m[6]!]) });
    }
  return { heads, lacing: firstGeometry(outputs.lacing!)! };
}

/** A head's place in the strut's frame: along the member, and across it on N and B. */
function frame(h: Head): { t: number; n: number; b: number } {
  const d = sub(h.base, A);
  return { t: dot(d, T), n: dot(d, N), b: dot(d, Bn) };
}

/** A crossing head sits on a face's centre line: one of its N, B offsets is 0. */
function isCrossing(h: Head): boolean {
  const f = frame(h);
  return Math.min(Math.abs(f.n), Math.abs(f.b)) < 0.01;
}

/** The segments the lacing's resample makes: whole steps, then the remainder. */
const MIDS = [...Array.from({ length: Math.floor(LEN / STEP) }, (_, i) => (i + 0.5) * STEP), (Math.floor(LEN / STEP) * STEP + LEN) / 2];

/** The farthest the lacing mesh reaches out from the chords' plane along `dir`, through `at`. */
function outerSurface(geo: Geometry, at: Vec3, dir: Vec3): number {
  const P = geo.attrs.point.get("P")!.data;
  const pt = (i: number): Vec3 => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
  const origin = add(at, sc(dir, 0.3));
  const d = sc(dir, -1);
  let best = Infinity;
  const v2p = geo.vertexToPoint;
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p]!;
    const v = Array.from({ length: geo.primVertexCount[p]! }, (_, k) => v2p[start + k]!);
    for (let k = 1; k + 1 < v.length; k++) {
      const a = pt(v[0]!);
      const e1 = sub(pt(v[k]!), a);
      const e2 = sub(pt(v[k + 1]!), a);
      const q = cross(d, e2);
      const det = dot(e1, q);
      if (Math.abs(det) < 1e-12) continue;
      const s = sub(origin, a);
      const u = dot(s, q) / det;
      if (u < 0 || u > 1) continue;
      const r = cross(s, e1);
      const w = dot(d, r) / det;
      if (w < 0 || u + w > 1) continue;
      best = Math.min(best, dot(e2, r) / det);
    }
  }
  return 0.3 - best;
}

describe("eiffel lacing crossings", () => {
  it("rivets every crossing of a face's two zigzags once, on the outer bar", async () => {
    const { heads, lacing } = await strut();
    const crossings = heads.filter(isCrossing);
    // Eight chord heads a sample, as before, and one crossing a bay a face.
    const samples = MIDS.length + 1;
    expect(heads.length - crossings.length).toBe(8 * samples);
    expect(crossings.length).toBe(4 * MIDS.length);
    const faces = [
      [N, 0],
      [sc(N, -1), 0],
      [Bn, 0],
      [sc(Bn, -1), 0],
    ] as Array<[Vec3, number]>;
    for (const h of crossings) {
      const f = frame(h);
      // Half way along its bay, the short last bay included.
      expect(Math.min(...MIDS.map((m) => Math.abs(f.t - m)))).toBeLessThan(SLACK);
      // Its axis is its face's outward normal; its base the lacing's outer
      // face, `LACE` off the chords' plane.
      const face = faces.find(([n]) => dot(n, h.axis) > AIM);
      expect(face, `crossing at t=${f.t.toFixed(3)} aimed ${h.axis.join(",")}`).toBeDefined();
      face![1]++;
      const n = face![0];
      expect(Math.abs(dot(sub(h.base, A), n) - (W + LACE))).toBeLessThan(SLACK);
      // And that is where the swept lacing is: the base lies on the mesh.
      const centre = add(A, add(sc(T, dot(sub(h.base, A), T)), sc(n, W)));
      const surface = outerSurface(lacing, centre, n);
      // The bars' outer face is `LACE` off the chords' plane at a crossing,
      // except on the ±N faces in the bays at a strut's ends, where the
      // sweep's frame stands it up to 2 mm higher [measured: 0.0225 at 30
      // of these 36, 0.0229-0.0245 at the rest]: the head there is sunk,
      // never lifted.
      expect(surface).toBeGreaterThan(LACE - 1e-4);
      expect(surface).toBeLessThan(LACE + 0.0025);
      const seat = dot(sub(h.base, centre), n) - surface;
      expect(seat).toBeLessThan(SLACK);
      expect(seat).toBeGreaterThan(-0.0025 - SLACK);
    }
    expect(faces.map(([, n]) => n)).toEqual([MIDS.length, MIDS.length, MIDS.length, MIDS.length]);
    // The control: a head 5 mm off the bar is caught by the same check.
    const h = crossings[0]!;
    const n = faces.find(([m]) => dot(m, h.axis) > AIM)![0];
    const lifted = add(h.base, sc(n, 0.005));
    const centre = add(A, add(sc(T, dot(sub(h.base, A), T)), sc(n, W)));
    expect(dot(sub(lifted, centre), n) - outerSurface(lacing, centre, n)).toBeGreaterThan(SLACK);
  }, 60_000);

  it("drops the crossings under a crossing plate, and keeps the other faces'", async () => {
    // A plate pair over the ±N faces round the third bay's crossing (t = 2.5):
    // the rectangle, grown by a head's radius, takes t = 2.5 and no other
    // crossing (they are a metre apart), and the chord heads at t = 2 and 3.
    const at = add(A, sc(T, 2.5));
    const plate: PlateFootprint = { at, along: T, across: Bn, n: N, half: 0.55, halfAcross: 0.4 };
    const { heads } = await strut([plate]);
    const crossings = heads.filter(isCrossing);
    const under = (h: Head): boolean => Math.abs(frame(h).t - 2.5) < 0.1;
    const onN = (h: Head): boolean => Math.abs(dot(h.axis, N)) > AIM;
    expect(crossings.filter((h) => under(h) && onN(h))).toEqual([]);
    expect(crossings.filter((h) => under(h) && !onN(h)).length).toBe(2);
    expect(crossings.length).toBe(4 * MIDS.length - 2);
  }, 60_000);
});
