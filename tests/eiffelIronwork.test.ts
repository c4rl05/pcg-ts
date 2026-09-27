/**
 * The decorative arches' ironwork against PL-XI Fig. 14, "Panneau décoré
 * des faces 1 et 4" (SOURCES.md §28; `ironwork.ts`, `firstFloor.ts`):
 *
 * - every band panel, crown to montant 14, carries the motif: a round-
 *   headed frame, three bars rising together from the intrados' middle
 *   (the "fan" of Fig. 1 is these three, as Fig. 14 draws them member by
 *   member), and four volutes, each with a macaron in its eye, except where
 *   b cuts the band and a volute no longer fits;
 * - every volute and macaron lies inside its panel's clear opening — clear
 *   of the montants, both chords and b — and clear of the frame and the
 *   bars, touching its own bar only over its packing;
 * - the cooked ironwork lies on the rib planes' decorated sides only (face
 *   1 of the outer arch, face 4 of the inner), at the montants' faces, and
 *   inside the band;
 * - the frame and bars are built at every depth, the volutes and macarons
 *   with the laced web, and the cooked triangles are exactly what the
 *   pieces make; the same cook twice gives the same bytes.
 *
 * Every zero-check is paired with a control that proves it can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { bandIronwork } from "../demos/eiffel/firstFloor.js";
import {
  BAR_WIDTH,
  CROSS_DEPTH,
  FRAME_WIDTH,
  IRON_DEPTH,
  MACARON_DEPTH,
  MACARON_R,
  MACARON_SIDES,
  type Panel,
  type PanelIronwork,
  type Pt,
  VOLUTES,
  VOLUTE_WIDTH,
  panelClearance,
  panelIronwork,
  segmentDistance,
  squareEndClearance,
} from "../demos/eiffel/ironwork.js";
import { buildFirstFloor } from "../demos/eiffel/firstFloor.js";
import { quadrants } from "../demos/eiffel/lattice.js";
import { type Detail } from "../demos/eiffel/parts.js";
import { ARCH, node, profileAt } from "../demos/eiffel/spec.js";

type Vec3 = readonly [number, number, number];

// ------------------------------------------------------------ the numbers

/** Band panels a half, crown to montant 14 [sourced PL-XI Fig. 1: montants 1-14]. */
const PANELS_A_HALF = 13;
/** Arch planes a face (the face's and 15.00 inboard) and faces [sourced PL-XI Fig. 1 Nota, Fig. 2]. */
const PLANES = 2;
const FACES = 4;
/** Fig. 14: three bars, four volutes, a macaron in each volute's eye. */
const BARS = 3;
const VOLUTES_A_PANEL = 4;
/** The montants' faces, the plates' plane: 0.20 off the rib's axis plane [sourced "400"]. */
const FACE_OFF = 0.2;
/** The chords' 600 [sourced "600 x 7"]: the clear band is between their faces. */
const CHORD = 0.6;
const R_BAND_IN = ARCH.radius + CHORD;
const R_BAND_OUT = ARCH.extradosRadius - CHORD;
/** The face's lean over panels 1-4, the stretch the arch lies in [derived from the node table]. */
const SLOPE = (node("XXVIII").outer - node("XXIV").outer) / (node("XXIV").y - node("XXVIII").y);
const L = Math.hypot(1, SLOPE);
const COS = 1 / L;
const CENTRE_Y = ARCH.crownY - ARCH.radius * COS;
const INNER = node("XXIV").outer - node("XXIV").inner;

// ------------------------------------------------------------ helpers

function pointsOf(geo: Geometry): Vec3[] {
  const P = geo.attrs.point.get("P")!.data;
  const out: Vec3[] = [];
  for (let i = 0; i < geo.pointCount; i++) out.push([P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
  return out;
}

/** A cooked point turned back onto the +z face, and which face it came from. */
function toFace0(p: Vec3): { q: Vec3; face: number } {
  let q: Vec3 = p;
  for (let face = 0; face < 4; face++) {
    if (q[2] > Math.abs(q[0])) return { q, face };
    // Undo one quarter turn about +y: (x, z) <- (-z, x).
    q = [-q[2], q[1], q[0]];
  }
  throw new Error(`point ${p} lies on no face`);
}

/**
 * A +z-face point read against the two rib planes: which plane it is
 * nearer, its signed distance off that plane along the face's normal
 * (positive outward, toward +z), and its in-plane point (x, t), t up the
 * plane from the arch's centre.
 */
function onRib(q: Vec3): { plane: 0 | 1; off: number; inPlane: Pt } {
  const outer = profileAt(q[1]).outer;
  const d0 = (q[2] - outer) / L;
  const d1 = (q[2] - (outer - INNER)) / L;
  const plane: 0 | 1 = Math.abs(d0) < Math.abs(d1) ? 0 : 1;
  const off = plane === 0 ? d0 : d1;
  // Back onto the plane along its normal (0, SLOPE, 1) / L, then up it.
  const y = q[1] - (off * SLOPE) / L;
  return { plane, off, inPlane: [q[0], (y - CENTRE_Y) / COS] };
}

/** The decorated side's offset band: plane 0's face 1 outward, plane 1's face 4 inward. */
function offDecorated(plane: 0 | 1, off: number, deepest: number): boolean {
  const s = plane === 0 ? off : -off;
  return s >= FACE_OFF - 1e-3 && s <= FACE_OFF + deepest + 1e-3;
}

async function cookFloor(detail: Detail, ids: readonly string[]) {
  const g = new Graph(1889);
  const quads = quadrants(g, "quad");
  buildFirstFloor(g, quads, detail);
  // A set the depth does not build is no node at all: its probe reads nothing.
  const have = new Set(g.describe().nodes.map((n) => n.id));
  const built = ids.filter((id) => have.has(id));
  for (const id of built) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const probe = (id: string): Geometry | undefined => firstGeometry(outputs[`probe:${id}`] ?? []);
  return probe;
}

/** A panel's frame, for moving a piece in it in the controls. */
function shift(panel: Panel, line: readonly Pt[], ds: number, dv: number): Pt[] {
  return line.map((p) => [
    p[0] + ds * panel.across[0] + dv * panel.up[0],
    p[1] + ds * panel.across[1] + dv * panel.up[1],
  ]);
}

/** Volute centreline points that break the panel's clearances; 0 when every one fits. */
function scrollViolations(panel: Panel, work: PanelIronwork, volutes = work.volutes): number {
  const others = [
    ...work.frame.map((line) => ({ line, width: FRAME_WIDTH })),
    ...work.bars.map((line) => ({ line, width: BAR_WIDTH })),
  ];
  let bad = 0;
  for (const line of volutes) {
    for (const p of line) {
      const radial = Math.hypot(p[0], p[1]);
      const inBand = radial >= R_BAND_IN + VOLUTE_WIDTH / 2 - 1e-9 && radial <= R_BAND_OUT - VOLUTE_WIDTH / 2 + 1e-9;
      const clear = panelClearance(panel, p) >= VOLUTE_WIDTH / 2 - 1e-9;
      const apart = others.every((o) =>
        o.line.slice(1).every((b, i) => segmentDistance(p, o.line[i]!, b) >= (VOLUTE_WIDTH + o.width) / 2 - 1e-9),
      );
      if (!inBand || !clear || !apart) bad++;
    }
  }
  return bad;
}

// ------------------------------------------------------------ the tests

describe("the arches' ironwork (PL-XI Fig. 14)", () => {
  const panels = bandIronwork();

  it("every band panel, crown to montant 14, carries the motif; a volute is left out only where b cuts in", () => {
    expect(panels.length).toBe(2 * PANELS_A_HALF);
    const byK = new Map<number, number[]>();
    for (const { k, side, work } of panels) {
      expect(work.bars.length).toBe(BARS);
      expect(work.frame.length).toBeGreaterThanOrEqual(1);
      expect(work.eyes.length).toBe(work.volutes.length);
      byK.set(k * side, work.which);
    }
    // Panels 1|2 ... 11|12 lie under the extrados and keep all four;
    // 12|13 and 13|14 are cut by b.
    for (let k = 1; k <= 11; k++) {
      expect(byK.get(k)).toEqual([0, 1, 2, 3]);
      expect(byK.get(-k)).toEqual([0, 1, 2, 3]);
    }
    expect(byK.get(12)).toEqual([2, 3]);
    expect(byK.get(13)).toEqual([2]);
    expect(byK.get(-12)).toEqual(byK.get(12));
    expect(byK.get(-13)).toEqual(byK.get(13));
    const perPlane = panels.reduce((s, p) => s + p.work.volutes.length, 0);
    expect(perPlane).toBe(2 * (11 * VOLUTES_A_PANEL + 2 + 1));
    expect(VOLUTES.length).toBe(VOLUTES_A_PANEL);
  });

  it("the fan is three bars rising together from the intrados' middle, the middle one on the panel's axis", () => {
    for (const { panel, work } of panels) {
      const [low, axis, high] = work.bars as [Pt[], Pt[], Pt[]];
      const foot = axis[0]!;
      // On the intrados' face, on the axis.
      expect(Math.abs(Math.hypot(...foot) - R_BAND_IN)).toBeLessThan(1e-6);
      expect(Math.hypot(foot[0] - panel.origin[0], foot[1] - panel.origin[1])).toBeLessThan(1e-6);
      // The axis bar is radial; the outer two start within 0.2 of it and
      // splay to either side.
      const dir = (b: Pt[]) => {
        const d: Pt = [b[b.length - 1]![0] - b[0]![0], b[b.length - 1]![1] - b[0]![1]];
        const l = Math.hypot(...d);
        return [d[0] / l, d[1] / l] as Pt;
      };
      const u = dir(axis);
      expect(Math.abs(u[0] * panel.up[1] - u[1] * panel.up[0])).toBeLessThan(1e-9);
      for (const [b, sign] of [[low, -1], [high, 1]] as const) {
        expect(Math.hypot(b[0]![0] - foot[0], b[0]![1] - foot[1])).toBeLessThan(0.2);
        const across = dir(b)[0] * panel.across[0] + dir(b)[1] * panel.across[1];
        expect(Math.sign(across)).toBe(sign);
        // Each ends cut square where its corner meets the montant's or the
        // top edge's face, short of the opening's corner, not past it.
        const end = b[b.length - 1]!;
        const edges = [...panel.top, sign < 0 ? panel.low : panel.high];
        expect(Math.abs(squareEndClearance(edges, end, dir(b), BAR_WIDTH / 2))).toBeLessThan(1e-6);
        expect(panelClearance(panel, end)).toBeGreaterThan(0.03);
      }
    }
  });

  it("every volute and macaron lies inside its panel, clear of the chords, the montants, b, the frame and the bars", () => {
    let bad = 0;
    let eyesOut = 0;
    for (const { panel, work } of panels) {
      bad += scrollViolations(panel, work);
      eyesOut += work.eyes.filter((e) => panelClearance(panel, e) < MACARON_R - 1e-9).length;
    }
    expect(bad).toBe(0);
    expect(eyesOut).toBe(0);
    // Control: the same check on the crown panel's volutes lifted 0.3 up
    // the panel (into the extrados), and slid 0.3 toward the axis bar.
    const { panel, work } = panels[0]!;
    const up = scrollViolations(panel, work, work.volutes.map((l) => shift(panel, l, 0, 0.3)));
    const across = scrollViolations(panel, work, [shift(panel, work.volutes[0]!, 0.3, 0)]);
    expect(up).toBeGreaterThan(0);
    expect(across).toBeGreaterThan(0);
  });

  it("the fit rule is what leaves a volute out: lower the top edge and the upper pair goes", () => {
    const { panel } = panels[0]!;
    const low: Panel = {
      ...panel,
      top: [{ kind: "circle", c: [0, 0], r: R_BAND_OUT - 0.4, within: true }],
    };
    const work = panelIronwork(low);
    expect(work.which).toEqual([2, 3]);
    expect(scrollViolations(low, work)).toBe(0);
  });

  describe("cooked", () => {
    const deepest = MACARON_DEPTH + CROSS_DEPTH;
    let plainFans: Geometry | undefined;
    let plainScrolls: Geometry | undefined;
    let fans: Geometry;
    let scrolls: Geometry;
    let again: Geometry;
    beforeAll(async () => {
      const plain = await cookFloor({}, ["ffFans", "ffScrolls"]);
      plainFans = plain("ffFans");
      plainScrolls = plain("ffScrolls");
      const laced = await cookFloor({ lacedWeb: true }, ["ffFans", "ffScrolls"]);
      fans = laced("ffFans")!;
      scrolls = laced("ffScrolls")!;
      again = (await cookFloor({ lacedWeb: true }, ["ffScrolls"]))("ffScrolls")!;
    }, 120_000);

    it("the frames and bars at every depth, the volutes and macarons with the laced web", () => {
      expect(plainFans).toBeDefined();
      expect(plainScrolls).toBeUndefined();
      expect(plainFans!.primitiveCount).toBe(fans.primitiveCount);
      // Triangles as the pieces make them: a bar a 'rect' sweep of its
      // centreline (four faces of two triangles a segment, and each end a
      // fan of two over its four corners), a macaron's disc and cross
      // closed prisms; four faces, two planes.
      const segs = (ls: readonly Pt[][]) => ls.reduce((s, l) => s + l.length - 1, 0);
      const barTris = (ls: readonly Pt[][]) => ls.reduce((s, l) => s + 8 * (l.length - 1) + 2 * 2, 0);
      const fanTris = panels.reduce((s, { work }) => s + barTris(work.frame) + barTris(work.bars), 0);
      const eyes = panels.reduce((s, { work }) => s + work.eyes.length, 0);
      const prism = (n: number) => 2 * n + 2 * (n - 2);
      const scrollTris =
        panels.reduce((s, { work }) => s + barTris(work.volutes), 0) + eyes * (prism(MACARON_SIDES) + 2 * prism(4));
      expect(fans.primitiveCount).toBe(FACES * PLANES * fanTris);
      expect(scrolls.primitiveCount).toBe(FACES * PLANES * scrollTris);
      // The numbers SOURCES.md §28 quotes. Until 2026-09-26 the curves were
      // cut at a fixed 18 degrees (27,456 and 191,872); now every chord's
      // outer edge stands within CURVE_SAG of its curve, the frame's arch
      // taking the most of it (tests/eiffelRoundnessLower.test.ts). When
      // the bars were first swept (2026-09-27) each end was a fan of four
      // from the section's centre (41,856 and 197,696); the sweep's caps
      // are now corner fans of two, the count the walled boundary's quad
      // ends gave before the sweep.
      expect(FACES * PLANES * fanTris).toBe(38_464);
      expect(FACES * PLANES * scrollTris).toBe(194_688);
      expect(FACES * PLANES * eyes).toBe(752);
      expect(segs(panels.flatMap((p) => p.work.volutes))).toBeGreaterThan(0);
    });

    it("every face carries the same ironwork, point for point", () => {
      /** Points of `b` with no point of `a` within 0.1 mm (a 1 cm hash grid, neighbours searched). */
      const unmatched = (a: readonly Vec3[], b: readonly Vec3[]) => {
        const cell = (c: number) => Math.floor(c * 100);
        const grid = new Map<string, Vec3[]>();
        for (const p of a) {
          const k = p.map(cell).join(",");
          grid.set(k, [...(grid.get(k) ?? []), p]);
        }
        return b.filter((p) => {
          const [i, j, k] = p.map(cell) as [number, number, number];
          for (let di = -1; di <= 1; di++)
            for (let dj = -1; dj <= 1; dj++)
              for (let dk = -1; dk <= 1; dk++)
                for (const q of grid.get(`${i + di},${j + dj},${k + dk}`) ?? [])
                  if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-4) return false;
          return true;
        }).length;
      };
      for (const geo of [fans, scrolls]) {
        const faces: Vec3[][] = [[], [], [], []];
        for (const p of pointsOf(geo)) {
          const { q, face } = toFace0(p);
          faces[face]!.push(q);
        }
        expect(faces[0]!.length).toBe(geo.pointCount / 4);
        for (const f of faces.slice(1)) {
          expect(unmatched(faces[0]!, f)).toBe(0);
          expect(unmatched(f, faces[0]!)).toBe(0);
        }
      }
      // Control: the matcher sees a face moved 1 cm.
      const face0 = pointsOf(scrolls).map(toFace0).filter((r) => r.face === 0).map((r) => r.q);
      expect(unmatched(face0, face0.map(([x, y, z]) => [x + 0.01, y, z] as Vec3))).toBeGreaterThan(0);
    });

    it("nothing stands in a montant, read from the plates' pitch rather than the code's panels", () => {
      // Montant m's axis is the radial line (m - 1) x 2.5488 / R along the
      // intrados [sourced PL-VII, PL-XI Fig. 1]; its face is 0.20 off it.
      const theta = ARCH.montantPitch / ARCH.radius;
      const intoMontants = (list: readonly Pt[]) =>
        list.filter(([x, t]) => {
          const r = Math.hypot(x, t);
          const phi = Math.atan2(Math.abs(x), t);
          const m = Math.min(13, Math.round(phi / theta));
          return r * Math.abs(Math.sin(phi - m * theta)) < FACE_OFF - 1e-3;
        }).length;
      const inPlane = (geo: Geometry) => pointsOf(geo).map((p) => onRib(toFace0(p).q).inPlane);
      expect(intoMontants(inPlane(fans))).toBe(0);
      expect(intoMontants(inPlane(scrolls))).toBe(0);
      // Control: slid half a pitch round the arch, the frames' legs land in them.
      const turned = inPlane(fans).map(([x, t]): Pt => {
        const a = Math.sign(x || 1) * (theta / 2);
        return [x * Math.cos(a) + t * Math.sin(a), -x * Math.sin(a) + t * Math.cos(a)];
      });
      expect(intoMontants(turned)).toBeGreaterThan(0);
    });

    it("on the rib planes' decorated sides only, at the montants' faces, inside the band", () => {
      const check = (geo: Geometry, reach: number, tol: number) => {
        let side = 0;
        let band = 0;
        const planes = [0, 0];
        for (const p of pointsOf(geo)) {
          const { plane, off, inPlane } = onRib(toFace0(p).q);
          planes[plane]!++;
          if (!offDecorated(plane, off, deepest)) side++;
          const r = Math.hypot(...inPlane);
          if (r < R_BAND_IN - tol || r > R_BAND_OUT + tol) band++;
        }
        return { side, band, planes };
      };
      const f = check(fans, 0, BAR_WIDTH / 2);
      const s = check(scrolls, 0, 2e-3);
      expect(f.side).toBe(0);
      expect(s.side).toBe(0);
      expect(f.band).toBe(0);
      expect(s.band).toBe(0);
      // Both arches of every face are dressed, the same.
      expect(f.planes[0]).toBe(f.planes[1]);
      expect(s.planes[0]).toBe(s.planes[1]);
      // Control: the undecorated sides (faces 2 and 3) fail the side test,
      // and a point lifted 0.3 off the band fails the band test.
      let wrong = 0;
      for (const p of pointsOf(scrolls)) {
        const { plane, off } = onRib(toFace0(p).q);
        if (!offDecorated(plane === 0 ? 1 : 0, off, deepest)) wrong++;
      }
      expect(wrong).toBe(scrolls.pointCount);
      const lifted = onRib([0, CENTRE_Y + (R_BAND_OUT + 0.3) * COS, profileAt(CENTRE_Y + (R_BAND_OUT + 0.3) * COS).outer]);
      expect(Math.hypot(...lifted.inPlane)).toBeGreaterThan(R_BAND_OUT + 2e-3);
    });

    it("every cooked scroll point lies in some panel's opening, clear of its members", () => {
      const pts = pointsOf(scrolls).map((p) => onRib(toFace0(p).q).inPlane);
      const outside = (list: readonly Pt[]) =>
        list.filter((p) => !panels.some(({ panel }) => panelClearance(panel, p) >= -2e-3)).length;
      expect(outside(pts)).toBe(0);
      // Control: the same points slid 1.3 across (half a panel) land on the
      // montants.
      const slid = pts.map(([x, t]): Pt => [x + (x >= 0 ? 1.3 : -1.3) * Math.cos(Math.atan2(x, t)), t - 1.3 * Math.sin(Math.atan2(Math.abs(x), t))]);
      expect(outside(slid)).toBeGreaterThan(0);
    });

    it("the same cook twice gives the same bytes", () => {
      const a = scrolls.attrs.point.get("P")!.data;
      const b = again.attrs.point.get("P")!.data;
      expect(again.pointCount).toBe(scrolls.pointCount);
      let diff = 0;
      for (let i = 0; i < 3 * scrolls.pointCount; i++) if (a[i] !== b[i]) diff++;
      expect(diff).toBe(0);
      // Control: the comparison sees a one-ulp change.
      const c = Float32Array.from(b.subarray(0, 3 * again.pointCount));
      c[7] = Math.fround(c[7]! * (1 + 2 ** -20));
      let seen = 0;
      for (let i = 0; i < c.length; i++) if (a[i] !== c[i]) seen++;
      expect(seen).toBe(1);
    });

    it("the sections: 45 deep off the montants' faces, the macarons standing proud", () => {
      // Half a millimetre bins: a bar's points are its section's corners, on
      // the face and its depth off it (its caps fan over those corners, with
      // no centre point half its depth off the face).
      const offs = new Set<number>();
      for (const p of pointsOf(scrolls)) {
        const { plane, off } = onRib(toFace0(p).q);
        offs.add(Math.round((plane === 0 ? off : -off) * 2000));
      }
      const bin = (m: number) => Math.round(m * 2000);
      expect([...offs].sort((x, y) => x - y)).toEqual(
        [
          FACE_OFF,
          FACE_OFF + IRON_DEPTH,
          FACE_OFF + MACARON_DEPTH,
          FACE_OFF + MACARON_DEPTH + CROSS_DEPTH,
        ].map(bin),
      );
    });
  });
});
