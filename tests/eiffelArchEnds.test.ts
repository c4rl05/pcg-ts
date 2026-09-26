/**
 * Where the first floor meets the lower uprights, against the uprights AS
 * BUILT (SOURCES.md §24.5; firstFloor.ts `UPRIGHT_FACE`, `landAt`,
 * `toTheWeb`):
 *
 * - the box is a constant 0.877 square in plan with its webs in the tower's
 *   face planes (PL-XXXI; the census's own analytic model in
 *   tests/support/eiffelBuiltupCensus.ts, not builtup.ts), so the web a
 *   face-plane member meets leans at the lozenge's 78.36° to that plane;
 * - every member that ENDS on an upright (the extrados, montants 9-14, the
 *   decorative girder's short end posts and the diagonals to their tops)
 *   ends with all four corners on the web, cut to it, not square to its
 *   axis with a wedge open on one side and buried on the other;
 * - no vertex of the cut sets (the arch's chords, montants, heads, plates
 *   and ironwork, the decorative girder's end posts, fillets and web)
 *   stands inside a box below XXIV. Still run to the uprights' axes by
 *   convention, hidden in the closed box and not cut: the girders' chords
 *   (the decorative girder's two among them), the bracket, the grande
 *   poutre's end diagonal above XXIV and the 2nd floor's bands;
 * - the fin on each exterior face is not cut for them: PL-XI Fig. 11 draws
 *   it standing inside the arch's caisson, between its face plates, so it is
 *   still in the section (builtup.ts) and each end's footprint on the web
 *   spans it and its flats;
 * - the arcade's plates and the heads' edges reach the web in both planes,
 *   each laid out to the web in its own layer; the ironwork, laid out once
 *   for both, is pinned where it stops short (the inner plane, at a);
 * - the seam rows of the cut members stop at the web;
 * - the cut moves only what was inside a box and adds nothing.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { AS_BUILT, facePieces as builtPieces } from "../demos/eiffel/builtup.js";
import { buildFirstFloor } from "../demos/eiffel/firstFloor.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { quadrants } from "../demos/eiffel/lattice.js";
import { type Detail } from "../demos/eiffel/parts.js";
import { node } from "../demos/eiffel/spec.js";
import { type Vec3, faceFrame, near, rivetBases } from "./support/eiffelBuiltupCensus.js";

// ------------------------------------------------------------ the numbers

/** The decorative girder's top, node XXIV: the cut's reach [firstFloor.ts `toTheWeb`'s `below`]. */
const XXIV = node("XXIV").y;
/** A corner "on" the web: a millimetre, where the cut lands it to f32 [tolerance]. */
const ON = 0.001;
/** The steepest angle a member is cut along its own axis at, its sine to the web [firstFloor.ts `LAND_SINE`]. */
const LAND_SINE = 0.3;
/** The fin's flats, 200 wide across the face's centre line [sourced PL-XXXI, D28; the census's model]. */
const FIN_FLAT = 0.1;
/** Points a two-point member's skin has: four walls of four, two caps of five. */
const MEMBER_POINTS = 26;

/** The cut sets and what they were before the cut, by probe id. */
const CUT = {
  chords: ["ffArchChordsOnWeb", "ffArchChordsSkin"],
  montants: ["ffMontantsOnWeb", "ffMontantsSkin"],
  heads: ["ffHeadsOnWeb", "ffHeadsSkin"],
  fans: ["ffFansOnWeb", "ffFans"],
  plates: ["ffArcadePlatesOnWeb", "ffArcadePlates"],
  endPosts: ["ffEndPostOnWeb", "ffEndPostSkin"],
  fillets: ["ffFilletOnWeb", "ffFilletSkin"],
} as const;
/** The girder web: a solid member at the plain depth, a laced strut's chords and lacing with the laced web. */
const WEB_PLAIN = ["ffWeb0OnWeb", "ffWebSkin"] as const;
const WEB_LACED = [
  ["ffWeb0OnWeb", "ffWebChordSkin"],
  ["ffWeb1OnWeb", "ffWebLaceSkin"],
] as const;

// ------------------------------------------------------------ helpers

type Probe = (id: string) => Geometry;

async function cookFloor(detail: Detail, ids: readonly string[]) {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  const parts = buildFirstFloor(g, quads, detail);
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const probe: Probe = (id) => {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    return geo;
  };
  return { probe };
}

function pointsOf(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < geo.pointCount; i++) out.push([P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
  return out;
}

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

/** Vertices below XXIV inside a box by more than half a millimetre, and the deepest. */
function inside(geo: Geometry): { count: number; deepest: number } {
  let count = 0;
  let deepest = 0;
  for (const p of pointsOf(geo)) {
    if (p[1] >= XXIV) continue;
    const w = near(p, 0.3);
    if (w === undefined || w.depth <= 0.0005) continue;
    count++;
    deepest = Math.max(deepest, w.depth);
  }
  return { count, deepest };
}

/** The nearest any vertex below XXIV comes to each upright's web, from outside (m; negative inside). */
function nearestGap(geo: Geometry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pointsOf(geo)) {
    if (p[1] >= XXIV) continue;
    const w = near(p, 0.3);
    if (w !== undefined) out[w.member] = Math.min(out[w.member] ?? Infinity, -w.depth);
  }
  return out;
}

/** A point in a face's (s across, o out of the web) coordinates, as the census reads them. */
function faceLocal(p: Vec3, member: Parameters<typeof faceFrame>[0], k: number, d: readonly [number, number]) {
  const f = faceFrame(member, k, d);
  const t = (p[1] - f.A[1]) / (f.Q[1] - f.A[1]);
  const X: Vec3 = [f.A[0] + (f.Q[0] - f.A[0]) * t, f.A[1] + (f.Q[1] - f.A[1]) * t, f.A[2] + (f.Q[2] - f.A[2]) * t];
  const v = sub(sub(p, X), f.mid);
  return { s: dot(v, f.e), o: dot(v, f.n), n: f.n };
}

/** One end of a member skin that meets an upright in the +x+z leg. */
interface End {
  readonly corners: Vec3[];
  /** Each corner's plan distance outside the box (m; negative inside). */
  readonly gaps: number[];
  /** The sine of the member's angle to the web it meets. */
  readonly sine: number;
  readonly where: NonNullable<ReturnType<typeof near>>;
}

/**
 * The ends of a set of two-point member skins that come within 2 mm of an
 * upright's web or past it, in the +x+z leg (every quadrant is a turned
 * copy): each end's four corners (the ring at curveU 0 or 1, less its
 * cap's hub) and the member's sine to that web.
 */
function endsAtWebs(geo: Geometry): End[] {
  const n = geo.pointCount;
  if (n % MEMBER_POINTS !== 0) throw new Error(`a two-point member skin has ${MEMBER_POINTS} points a member; this has ${n}`);
  const P = geo.attrs.point.get("P")!.data;
  const U = geo.attrs.point.get("curveU")!.data;
  const T = geo.attrs.point.get("tangent")!.data;
  const out: End[] = [];
  for (let m = 0; m < n; m += MEMBER_POINTS) {
    for (const want of [0, 1]) {
      const pts: Vec3[] = [];
      let tangent: Vec3 = [0, 0, 0];
      for (let i = m; i < m + MEMBER_POINTS; i++) {
        if (Math.abs(U[i]! - want) > 1e-6) continue;
        const q: Vec3 = [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
        tangent = [T[3 * i]!, T[3 * i + 1]!, T[3 * i + 2]!];
        if (!pts.some((r) => Math.hypot(...sub(q, r)) < 1e-5)) pts.push(q);
      }
      if (pts.length !== 5) throw new Error(`member ${m / MEMBER_POINTS}'s end has ${pts.length} distinct points, not 4 corners and a hub`);
      const spread = (c: Vec3) => pts.reduce((a, q) => a + Math.hypot(...sub(q, c)), 0);
      const hub = pts.reduce((a, q) => (spread(q) < spread(a) ? q : a));
      const corners = pts.filter((q) => q !== hub);
      if (corners.some((c) => c[0] <= 0 || c[2] <= 0)) continue;
      const ws = corners.map((c) => near(c, 0.3));
      if (ws.some((w) => w === undefined)) continue;
      const gaps = ws.map((w) => -w!.depth);
      if (Math.min(...gaps) > 0.002) continue;
      // The face it meets is the one its shallowest corner is at: a corner
      // deep in a box is nearer one of the box's other faces.
      const where = ws.reduce((a, w) => (w!.depth < a!.depth ? w : a))!;
      const { n: normal } = faceLocal(hub, where.member, where.k, where.d);
      out.push({ corners, gaps, sine: Math.abs(dot(normal, tangent)), where });
    }
  }
  return out;
}

/** Whether every corner of an end lies on the web. */
const onWeb = (e: End) => e.gaps.every((g) => Math.abs(g) <= ON);

// ------------------------------------------------------------ the checks

describe("the first floor meets the lower uprights on their true webs", () => {
  const cut = Object.values(CUT).flat();
  let plain: Awaited<ReturnType<typeof cookFloor>>;
  let laced: Awaited<ReturnType<typeof cookFloor>>;
  beforeAll(async () => {
    plain = await cookFloor({}, [...cut, ...WEB_PLAIN]);
    laced = await cookFloor({ lacedWeb: true }, [...cut, ...WEB_LACED.flat(), "ffScrollsOnWeb", "ffScrolls"]);
  }, 600_000);

  it("ends every landing member with all four corners on the web, cut to it", () => {
    for (const [depth, cooked] of [
      ["plain", plain],
      ["laced", laced],
    ] as const) {
      const sets = depth === "plain" ? [CUT.chords, CUT.montants, CUT.endPosts, WEB_PLAIN] : [CUT.chords, CUT.montants, CUT.endPosts];
      let landed = 0;
      let wedged = 0;
      for (const [cut, raw] of sets) {
        const steep = (id: string) => endsAtWebs(cooked.probe(id)).filter((e) => e.sine >= LAND_SINE);
        for (const e of steep(cut)) {
          expect(onWeb(e), `${depth} ${cut} end at y ${e.corners[0]![1].toFixed(2)} on ${e.where.member}: ${e.gaps.map((g) => (g * 1000).toFixed(1))} mm`).toBe(true);
          landed++;
        }
        // Control: before the cut the same ends are square to their axes:
        // a corner stands off the web or sinks into the box.
        wedged += steep(raw).filter((e) => !onWeb(e)).length;
      }
      // In the +x+z leg, a plane at each of b, d and a twice: the extrados,
      // montants 9-14 and the decorative girder's end post, 8 an end, and at
      // the plain depth the solid diagonal to the post's top, 9 [derived].
      expect(landed).toBe(depth === "plain" ? 36 : 32);
      expect(wedged).toBe(landed);
    }
  });

  it("leaves no vertex of the arches or the decorative girder inside a box", () => {
    for (const [depth, cooked, sets] of [
      ["plain", plain, [...Object.values(CUT), WEB_PLAIN]],
      ["laced", laced, [...Object.values(CUT), ...WEB_LACED, ["ffScrollsOnWeb", "ffScrolls"]]],
    ] as const) {
      let before = 0;
      for (const [cut, raw] of sets) {
        const got = inside(cooked.probe(cut));
        expect(got.count, `${depth} ${cut}: ${got.count} vertices up to ${(got.deepest * 1000).toFixed(1)} mm inside`).toBe(0);
        before += inside(cooked.probe(raw)).count;
      }
      // Control: before the cut (the landing ends already run on into the
      // box by `landAt`) well over a thousand stand inside.
      expect(before).toBeGreaterThan(1000);
    }
  });

  it("keeps the fin: in the section, and running into each landing end's footprint", () => {
    let spans = 0;
    let narrow = 0;
    for (const [cut] of [CUT.chords, CUT.montants, CUT.endPosts]) {
      for (const e of endsAtWebs(laced.probe(cut)).filter((x) => x.sine >= LAND_SINE)) {
        const { member, k, d } = e.where;
        // The section still carries a fin on this face (PL-XI Fig. 11 draws
        // it inside the caisson, uncut): builtup.ts's own table.
        const pieces = builtPieces(member, k, d, AS_BUILT).map((p) => p.what);
        expect(pieces, `${member} face ${d} panel ${k}`).toContain("fin");
        const s = e.corners.map((c) => faceLocal(c, member, k, d).s);
        // The end's footprint on the web spans the fin and its flats: the
        // fin runs into the member (its caisson), not beside it.
        expect(Math.min(...s), `${cut} at y ${e.corners[0]![1].toFixed(2)}`).toBeLessThan(-FIN_FLAT);
        expect(Math.max(...s)).toBeGreaterThan(FIN_FLAT);
        spans++;
        // Control: an end a quarter as wide across the face would stand
        // between the flats' edges, which then stand past it.
        const hub = s.reduce((a, b) => a + b, 0) / 4;
        const thin = s.map((x) => hub + (x - hub) / 4);
        if (!(Math.min(...thin) < -FIN_FLAT && Math.max(...thin) > FIN_FLAT)) narrow++;
      }
    }
    expect(spans).toBe(32);
    expect(narrow).toBe(spans);
  });

  it("brings the arcade's plates and heads, and the ironwork, to the web in both planes", () => {
    for (const cooked of [plain, laced]) {
      for (const [cut, raw] of [CUT.plates, CUT.heads]) {
        const gap = nearestGap(cooked.probe(cut));
        // b and d in the face plane, a in the inner one: on the web, to a millimetre.
        for (const u of ["a", "b", "d"]) expect(Math.abs(gap[u]!), `${cut} at ${u}`).toBeLessThan(ON);
        // Control: before the cut they stood inside b, by the web's lean
        // across their own thickness.
        expect(nearestGap(cooked.probe(raw))["b"]!).toBeLessThan(-ON);
      }
      // The ironwork is laid out once, to the web at the face plane, and
      // placed on face 1 of the outer arch and face 4 of the inner: at b the
      // cut brings it to the web; at a, where the web lies farther in the
      // ironwork's layer, its ends are run on to it (firstFloor.ts
      // `arches`; SOURCES.md §24.5) and the cut brings them to the web too.
      // Until 2026-09-26 they stood 45 mm short of it, in the air.
      const fans = nearestGap(cooked.probe(CUT.fans[0]));
      expect(Math.abs(fans["b"]!)).toBeLessThan(ON);
      expect(Math.abs(fans["a"]!)).toBeLessThan(ON);
      // Control: before the cut, the run-on ends stood inside a.
      expect(nearestGap(cooked.probe(CUT.fans[1]))["a"]!).toBeLessThan(-ON);
      // Flush, not just touching: no fewer of the ironwork's points lie on
      // a's web than on b's, where every end lands flush (the same ends,
      // laid out once; 96 at a, 68 at b, measured). Met by its leading
      // corner alone, a had 48.
      const onWeb: Record<string, number> = {};
      for (const p of pointsOf(cooked.probe(CUT.fans[0]))) {
        if (p[1] >= XXIV) continue;
        const w = near(p, 0.3);
        if (w !== undefined && Math.abs(w.depth) < ON) onWeb[w.member] = (onWeb[w.member] ?? 0) + 1;
      }
      expect(onWeb["b"]!).toBeGreaterThan(0);
      expect(onWeb["a"]!).toBeGreaterThanOrEqual(onWeb["b"]!);
    }
  });

  it("moves only what stood inside a box, and adds nothing", () => {
    for (const [cut, raw] of [...Object.values(CUT), WEB_PLAIN]) {
      const after = pointsOf(plain.probe(cut));
      const before = pointsOf(plain.probe(raw));
      expect(after.length, cut).toBe(before.length);
      let moved = 0;
      for (let i = 0; i < before.length; i++) {
        // The +x+z leg, as the census reads it; the others are turned copies.
        if (before[i]![0] <= 0 || before[i]![2] <= 0) continue;
        const w = near(before[i]!, 0.3);
        const wasInside = w !== undefined && w.depth > 0 && before[i]![1] < XXIV;
        const by = Math.hypot(...sub(after[i]!, before[i]!));
        // Outside, unmoved: to 10 um, the f32 the cut computes in, for a
        // point on the web to within that (the intrados at section AB).
        if (!wasInside) expect(by, `${cut} point ${i}`).toBeLessThan(1e-5);
        else if (by > 0) moved++;
      }
      // Control: the cut did move what was inside.
      expect(moved, cut).toBeGreaterThan(0);
    }
    // Above XXIV the grande poutre's end diagonal still runs to b's axis,
    // as its chords do: the cut stops at the decorative girder's top.
    expect(pointsOf(plain.probe(WEB_PLAIN[0])).some((p) => p[1] > XXIV && (near(p, 0.3)?.depth ?? 0) > 0.1)).toBe(true);
  });
});

