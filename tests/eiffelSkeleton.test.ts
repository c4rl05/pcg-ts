/**
 * The Eiffel skeleton against Plate XXXI.
 *
 * The demo's claim is that its large structure is Eiffel's own — every
 * panel node where the plate puts it — while everything smaller is a rule.
 * This holds the first half: it reads the upright PATHS (before they are
 * skinned, where a vertex is exactly a station) and checks every vertex
 * against the node table, and the upright count against the plate's
 * 16 -> 12 -> 8 progression.
 */
import { describe, expect, it } from "vitest";
import {
  type Geometry,
  type NodeHandle,
  cook,
  deserializeGraph,
  firstGeometry,
  serializeGraph,
} from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { lowerSeamRows, shaftSeamRows, upperJoints, upperLegSeamRows } from "../demos/eiffel/builtup.js";
import { UPRIGHT_KINK } from "../demos/eiffel/legs.js";
import { type Detail, JITTER } from "../demos/eiffel/parts.js";
import {
  EDOUX_PLAN,
  ENTRETOISE,
  LEG_BELTS,
  LEG_GAP_LACING_500,
  LEG_LACING_500,
  MEMBERS,
  NODES,
  PLAN_BRACING,
  SPLICE,
  UPRIGHT_BOX,
  node,
  profileAt,
} from "../demos/eiffel/spec.js";
import { planBracingBandLines, planBracingLines, planPattern } from "../demos/eiffel/shaft.js";
import { RIVET_RISE, UPRIGHT_SEAMS } from "../demos/eiffel/strut.js";

type Vec3 = readonly [number, number, number];

/**
 * How far a BUILT position may sit from where the rule put it. Every
 * output is jittered by at most {@link JITTER} per axis to keep coplanar
 * faces off each other's planes (see `demos/eiffel/parts.ts`), so a
 * distance measured perpendicular to an axis carries up to that much in
 * each of the three components — plus one f32 ULP per axis, because the
 * offset is added into f32 storage and the tower reaches 312 m, where an
 * ULP is 15 µm. Without that term the bound is not a bound: the measured
 * worst case is 99.5% of sqrt(3) * JITTER and the ULP is what pushes it
 * over. 20 µm covers every height this file measures at.
 *
 * The node-id probes this file reads for the paths and the skins tap the
 * graph upstream of the jitter and are still exact; the rivets are read
 * from a declared OUTPUT, so they are the ones that settle. If a probed
 * id is ever moved downstream of a jitter node, the assertions around it
 * — several of which hold two ends level to 5e-7 — fail outright rather
 * than marginally, and this is the constant to reach for.
 */
const SETTLE = (JITTER + 2e-5) * Math.sqrt(3);

/** Every polyline primitive of a geometry, as its vertex positions. */
function polylines(geo: Geometry): Vec3[][] {
  const P = geo.attrs.point.get("P");
  if (P === undefined) throw new Error("no P");
  const data = P.data;
  const out: Vec3[][] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const start = geo.primVertexStart[p] as number;
    const count = geo.primVertexCount[p] as number;
    const line: Vec3[] = [];
    for (let v = start; v < start + count; v++) {
      const i = geo.vertexToPoint[v] as number;
      line.push([data[3 * i] as number, data[3 * i + 1] as number, data[3 * i + 2] as number]);
    }
    out.push(line);
  }
  return out;
}

/** Cook the skeleton with the named intermediate nodes as extra outputs. */
async function cookWith(ids: readonly string[], detail: Detail = {}): Promise<Record<string, Geometry>> {
  const g = buildEiffel(1889, detail);
  for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  for (const id of ids) {
    const geo = firstGeometry(outputs[`probe:${id}`] ?? []);
    if (geo === undefined) throw new Error(`probe ${id} produced no geometry`);
    out[id] = geo;
  }
  return out;
}

/** The plate's node at height y, if a node (or panel 1-4 midpoint) sits there. */
function nodeAt(y: number): { outer: number; inner: number } | undefined {
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]!;
    if (Math.abs(n.y - y) < 1e-3) return n;
    const m = NODES[i + 1];
    const mid = m === undefined ? NaN : (n.y + m.y) / 2;
    if (m !== undefined && Math.abs(mid - y) < 1e-3) {
      return { outer: (n.outer + m.outer) / 2, inner: (n.inner + m.inner) / 2 };
    }
  }
  return undefined;
}

/** How many of the paths cross height y. */
function crossing(lines: readonly Vec3[][], y: number): number {
  return lines.filter((l) => {
    const ys = l.map((v) => v[1]);
    return Math.min(...ys) < y && Math.max(...ys) > y;
  }).length;
}

/** Instance translations of a rivet output. */
function rivetBases(item: { kind: string } | undefined): Vec3[] {
  if (item === undefined || item.kind !== "instances") throw new Error("no rivets");
  const out: Vec3[] = [];
  for (const b of (item as unknown as { batches: { count: number; transforms: Float32Array }[] }).batches) {
    for (let k = 0; k < b.count; k++) out.push([b.transforms[16 * k + 12]!, b.transforms[16 * k + 13]!, b.transforms[16 * k + 14]!]);
  }
  return out;
}

/**
 * The AXIS each rivet stands along: its matrix's local +y, which the asset
 * is a unit dome about (`RIVET_ASSET`), as a unit vector — the head points
 * out of the plate it fastens.
 */
function rivetAxes(item: { kind: string } | undefined): Vec3[] {
  if (item === undefined || item.kind !== "instances") throw new Error("no rivets");
  const out: Vec3[] = [];
  for (const b of (item as unknown as { batches: { count: number; transforms: Float32Array }[] }).batches) {
    for (let k = 0; k < b.count; k++) {
      const [x, y, z] = [b.transforms[16 * k + 4]!, b.transforms[16 * k + 5]!, b.transforms[16 * k + 6]!];
      const l = Math.hypot(x, y, z);
      out.push([x / l, y / l, z / l]);
    }
  }
  return out;
}

/** The vector arithmetic the crossing plates' frames are read in. */
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

/**
 * A flat-bar mesh's BOXES, as each box's points and their mean. `flatBars`
 * copies a unit box that carries its six faces' own normals, so a box is 24
 * points — three at each of its eight corners — and 12 triangles; the mean
 * of all 24 weights each corner alike, so it is the box's centre.
 */
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

/** Where the infinite line through a and b passes closest to p, and how far off. */
function foot(p: Vec3, a: Vec3, b: Vec3): { at: Vec3; off: number; dir: Vec3 } {
  const dir = unit3(sub3(b, a));
  const at = add3(a, mul3(dir, dot3(sub3(p, a), dir)));
  return { at, off: len3(sub3(at, p)), dir };
}

/** The linear read of a (height, value) table, clamped: what `ramp` does. */
function tableAt(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y0, v0] = stops[i - 1]!;
    const [y1, v1] = stops[i]!;
    if (y <= y1) return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return stops[stops.length - 1]![1];
}

/** Corner i of a leg's section (c, b, a, d in ring order) at height y. */
function legCorner(i: number, y: number): Vec3 {
  // The leg's section is the square [inner, outer]^2: c is (1, 1), b (0, 1),
  // a (0, 0) and d (1, 0), so face f runs from station f to f + 1.
  const uv = [
    [1, 1],
    [0, 1],
    [0, 0],
    [1, 0],
  ][((i % 4) + 4) % 4]!;
  const { outer, inner } = profileAt(y);
  return [inner + (outer - inner) * uv[0]!, y, inner + (outer - inner) * uv[1]!];
}

/** The centre line of leg face f (station f to f + 1) at height y. */
const legFaceCentre = (f: number, y: number): Vec3 =>
  mul3(add3(legCorner(f, y), legCorner(f + 1, y)), 0.5);

/** A point of the +x+z leg, on leg k: a quarter turn about +y each (`quadrants`). */
function onLeg(p: Vec3, k: number): Vec3 {
  const c = [1, 0, -1, 0][k % 4]!;
  const s = [0, 1, 0, -1][k % 4]!;
  return [p[0] * c + p[2] * s, p[1], p[2] * c - p[0] * s];
}

/**
 * A crossing plate's own numbers [`demos/eiffel/parts.ts`: CROSS_PLATE's
 * `set` and `edge`, both quoted at an `at` strut and scaled by the section;
 * `demos/eiffel/crossing.ts`: CROSS_THICK, CROSS_RIVETS; `demos/eiffel/legs.ts`:
 * the margin a post landing takes ALONG the post past the cut cap, the post's
 * clearance, and the step the post's direction is read over].
 *
 * `set` is 0.015, not the 0.02 a first pass took from the section table: the
 * lacing's outer surface stands 0.0174 inside the angles' outer face, not the
 * `CHORD - LACE` (0.0225) the table implies, because the swept square is
 * mitred at the zigzag's vertices. This file re-measures that envelope from
 * the cooked lacing rather than trusting either number.
 */
const CROSS = {
  thick: 0.01,
  set: 0.015,
  edge: 0.4,
  at: 0.4,
  margin: 0.02,
  clear: 0.05,
  step: 0.25,
  pitch: 0.1,
  inset: 0.04,
} as const;

/** The leg profile's slope either side of y, horizontal per vertical. */
const faceSlopes = (y: number) => {
  const lo = profileAt(y - 0.01);
  const hi = profileAt(y + 0.01);
  return { outer: (lo.outer - hi.outer) / 0.02, inner: (lo.inner - hi.inner) / 0.02 };
};
/** A depth printed in a rabattement (in the face plane), as a vertical one. */
const vertical = (inPlane: number, slope: number) => inPlane / Math.sqrt(1 + slope * slope);

/**
 * One crossing that takes a pair of plates, as the rules put it. Re-derived
 * from Plate XXXI's table and the members' own dimensions here, not read
 * from `demos/eiffel/crossing.ts`.
 */
interface Crossing {
  /** Which rule put it here, for the counts. */
  readonly family: "post" | "legX" | "p10" | "gap" | "shaft";
  /** The landing's name, for a post crossing. */
  readonly label?: string;
  /** The crossing point, on the members' shared face plane. */
  readonly at: Vec3;
  /** Unit, in that plane: the plate's long axis. */
  readonly along: Vec3;
  /** The plane's unit normal. */
  readonly n: Vec3;
  /** The struts' half-width there. */
  readonly w: number;
  /** Half the plate's length along `along`. */
  readonly half: number;
  /** A post landing at a node has a CUT CAP under it. */
  readonly atNode: boolean;
  /**
   * How far the plate's ENDS stand off the steel because it lies on the
   * bisector: `half sin(kink / 2)`, and zero wherever the leg runs
   * straight through. An X crossing has no kink to bisect.
   */
  readonly residual: number;
  /** Whether it lands on a HORIZONTAL STRUT rather than on a chord plate. */
  readonly strut: boolean;
}

/** The nodes a central post ends a stretch at [PL-VII, PL-IX]. */
const POST_NODES = ["XXVII", "XXVI", "XXV", "XXIV", "XXIII", "XXII", "XXI", "XX", "XIX", "XVIII"];
/**
 * How far past the node line the member a post stands on reaches. The belts'
 * chord plates only TOUCH XXIV, XXIII, XVIII and XVII — their bodies stand
 * inside panels 5 and 11 — so those four carry no horizontal.
 */
const postSeat = (name: string): number =>
  ["XXIV", "XXIII", "XVIII", "XVII"].includes(name) ? 0 : tableAt(MEMBERS.horizontal, node(name).y);
/** The ties' top chord's axis, above XXVIII in the plane. */
const tieTop = (): number =>
  node("XXVIII").y + vertical(LEG_BELTS.tieTopChordAxis, faceSlopes(node("XXVIII").y - 1).outer);
/** How far below XXVIII a base tie's bottom chord lies on face f (A's two faces are the outer pair). */
const tieDepth = (f: number): number => {
  const s = faceSlopes(node("XXVIII").y - 1);
  return f === 0 || f === 3
    ? vertical(LEG_BELTS.tieOuterDepth, s.outer)
    : vertical(LEG_BELTS.tieInnerDepth, s.inner);
};
/** The top of panel 10's base band: its printed depth over the outer faces' slope. */
const band10Top = (): number =>
  node("XIX").y + vertical(LEG_BELTS.band10Depth, faceSlopes(node("XIX").y + 1).outer);

/**
 * THE POST LANDINGS, re-derived from Plate XXXI's table: every level a leg
 * face's central post meets a member SQUARE TO THE FACE — the node
 * horizontals it ends on, the mid-panel horizontals of panels 1-4 it runs
 * through (where the panel's own X crosses at the same point, the
 * eight-armed rosettes), and panel 10's band top chord.
 *
 * NOT the ties' chords, nor the belts' chord plates at XXIV, XXIII and
 * XVIII, though a post does end on each of them: those are flats lying IN
 * the face plane, a third of a metre below where a plate set under the
 * post's corner angles would sit, so a plate there plates nothing. The
 * test below asserts they are unplated.
 *
 * ONE PLATE, ON THE BISECTOR. The post's direction is read ACROSS the
 * crossing, so at a node where the leg turns it is the bisector of the two
 * stretches meeting there. That is the one thing the rule cannot get
 * right, and it is bounded rather than hidden: {@link Crossing.residual}
 * carries how far the plate's ends then stand off the steel.
 */
function postCrossings(): Crossing[] {
  const mid = (name: string) => {
    const i = NODES.findIndex((n) => n.name === name);
    return (NODES[i]!.y + NODES[i + 1]!.y) / 2;
  };
  const landings: Array<{ label: string; y: number; hw: number; atNode: boolean }> = [
    ...POST_NODES.filter((name) => postSeat(name) > 0).map((name) => ({
      label: name,
      y: node(name).y,
      hw: postSeat(name),
      atNode: true,
    })),
    ...["XXVIII", "XXVII", "XXVI", "XXV"].map((name) => ({
      label: `mid-${name}`,
      y: mid(name),
      hw: tableAt(MEMBERS.horizontal, mid(name)),
      atNode: false,
    })),
    { label: "band10", y: band10Top(), hw: LEG_BELTS.band10TopChord, atNode: false },
  ];
  const out: Crossing[] = [];
  for (const landing of landings) {
    for (let f = 0; f < 4; f++) {
      const y = landing.y;
      const w = tableAt(MEMBERS.web, y);
      const at = legFaceCentre(f, y);
      const H = unit3(sub3(legCorner(f + 1, y), legCorner(f, y)));
      // The two stretches meeting here, and the bisector the plate takes.
      const dirs = [-1, 1].map((s) => unit3(sub3(legFaceCentre(f, y + s * CROSS.step), at))) as [Vec3, Vec3];
      const along = unit3(sub3(legFaceCentre(f, y + CROSS.step), legFaceCentre(f, y - CROSS.step)));
      const n = unit3(cross3(H, along));
      let U = unit3(cross3(n, H));
      if (dot3(U, along) < 0) U = mul3(U, -1);
      // Along the post it reaches the far corner of the cut cap: that
      // corner stands `hw + clear` past the node line across U, so
      // `/ (U.along)` along the post, plus the margin.
      const half = (landing.hw + CROSS.clear) / dot3(U, along) + CROSS.margin;
      // WHAT THE BISECTOR COSTS. One flat rectangle cannot lie on two
      // planes: where the leg turns by `kink`, the plate's ends stand
      // `half sin(kink / 2)` off the steel, and the two plates of a pair
      // tip OPPOSITE ways.
      const kink = Math.acos(Math.min(1, dot3(mul3(dirs[0], -1), dirs[1])));
      out.push({
        family: "post",
        label: landing.label,
        at,
        along,
        n,
        w,
        half,
        atNode: landing.atNode,
        residual: half * Math.sin(kink / 2),
        strut: true,
      });
    }
  }
  return out;
}

/**
 * Where a lattice bay's two diagonals meet, and the plate's frame there:
 * the two diagonals intersected directly (not through the trapezoid's
 * fraction rule), the plate running along the bay's midline. An X cuts
 * nothing, so its plate is SQUARE.
 */
function bayX(family: Crossing["family"], p0: Vec3, q0: Vec3, p1: Vec3, q1: Vec3): Crossing {
  const u = sub3(q1, p0);
  const v = sub3(p1, q0);
  const w0 = sub3(p0, q0);
  const a = dot3(u, u);
  const b = dot3(u, v);
  const c = dot3(v, v);
  const d = dot3(u, w0);
  const e = dot3(v, w0);
  const at = add3(p0, mul3(u, (b * e - c * d) / (a * c - b * b)));
  const along = unit3(sub3(mul3(add3(p1, q1), 0.5), mul3(add3(p0, q0), 0.5)));
  const n = unit3(cross3(unit3(sub3(q0, p0)), along));
  const w = tableAt(MEMBERS.web, at[1]);
  return { family, at, along, n, w, half: (CROSS.edge * w) / CROSS.at, atNode: false, residual: 0, strut: true };
}

/** `squareRing(2)`: a square section with a station at each face's middle. */
const RING2: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [0.5, 1],
  [0, 1],
  [0, 0.5],
  [0, 0],
  [0.5, 0],
  [1, 0],
  [1, 0.5],
];

/**
 * Every crossing in ONE leg (the +x+z quadrant): the post landings, the
 * panels' own X's — 6-9 on all four faces, 12-17 on faces 0 and 3, which
 * are the two that do not touch the inner upright a — panel 10's two X's a
 * face above its band, and the gap X between this leg and the next in
 * panels 12-16.
 */
function legCrossings(): Crossing[] {
  const out: Crossing[] = [...postCrossings()];
  const panels: Array<readonly [string, string, readonly number[]]> = [
    ["XXIII", "XXII", [0, 1, 2, 3]],
    ["XXII", "XXI", [0, 1, 2, 3]],
    ["XXI", "XX", [0, 1, 2, 3]],
    ["XX", "XIX", [0, 1, 2, 3]],
    ["XVII", "XVI", [0, 3]],
    ["XVI", "XV", [0, 3]],
    ["XV", "XIV", [0, 3]],
    ["XIV", "XIII", [0, 3]],
    ["XIII", "XII", [0, 3]],
    ["XII", "XI", [0, 3]],
  ];
  for (const [lo, hi, fs] of panels) {
    const y0 = node(lo).y;
    const y1 = node(hi).y;
    for (const f of fs) {
      out.push(bayX("legX", legCorner(f, y0), legCorner(f + 1, y0), legCorner(f, y1), legCorner(f + 1, y1)));
    }
  }
  const p10At = (s: number, y: number): Vec3 => {
    const { outer, inner } = profileAt(y);
    const [u, v] = RING2[s % 8]!;
    return [inner + (outer - inner) * u, y, inner + (outer - inner) * v];
  };
  const y0 = band10Top();
  const y1 = node("XVIII").y;
  for (let s = 0; s < 8; s++) out.push(bayX("p10", p10At(s, y0), p10At(s + 1, y0), p10At(s, y1), p10At(s + 1, y1)));
  // The gap: b of this leg to d of the next, across the tower face.
  const gapAt = (s: number, y: number): Vec3 => {
    const { outer, inner } = profileAt(y);
    return [s === 0 ? inner : -inner, y, outer];
  };
  const names = ["XVII", "XVI", "XV", "XIV", "XIII", "XII"];
  for (let k = 0; k < 5; k++) {
    const a = node(names[k]!).y;
    const b = node(names[k + 1]!).y;
    out.push(bayX("gap", gapAt(0, a), gapAt(1, a), gapAt(0, b), gapAt(1, b)));
  }
  return out;
}

/** The shaft's own X's: one per bay per panel, eight a panel, XI to the top of 28. */
function shaftCrossings(): Crossing[] {
  const levels = NODES.slice(NODES.findIndex((n) => n.name === "XI"));
  const at = (s: number, k: number): Vec3 => {
    const o = levels[k]!.outer;
    const [u, v] = RING2[s % 8]!;
    return [-o + 2 * o * u, levels[k]!.y, -o + 2 * o * v];
  };
  const out: Crossing[] = [];
  for (let k = 0; k + 1 < levels.length; k++) {
    for (let s = 0; s < 8; s++) out.push(bayX("shaft", at(s, k), at(s + 1, k), at(s, k + 1), at(s + 1, k + 1)));
  }
  return out;
}

/** One plate as the rules put it: its frame, its footprint, and what it covers. */
interface Plate {
  readonly c: Crossing;
  /** The section in millimetres: the set it rides in, and so its node id. */
  readonly key: string;
  /** Its centre, and its own OUTWARD normal (the pair cannot share one). */
  readonly o: Vec3;
  readonly n: Vec3;
  /** Along its member, and across it in the plate. */
  readonly D: Vec3;
  readonly B: Vec3;
  /** Half its length, half its width, and how far under the angles it is set. */
  readonly half: number;
  readonly across: number;
  readonly set: number;
}

/**
 * A pair of plates at each crossing, one either side; and, for a leg
 * crossing, the same four times round the tower. Both knobs scale with the
 * section, so a 500's plate is an 800's at 5/8 rather than an 800's plate
 * on a smaller member.
 */
function platesOf(list: readonly Crossing[], legs: boolean): Plate[] {
  const out: Plate[] = [];
  for (const c of list) {
    const set = (CROSS.set * c.w) / CROSS.at;
    const across = (CROSS.edge * c.w) / CROSS.at;
    const key = String(Math.round(c.w * 2000));
    for (const side of [1, -1]) {
      const o0 = add3(c.at, mul3(c.n, side * (c.w - set + CROSS.thick / 2)));
      for (const k of legs ? [0, 1, 2, 3] : [0]) {
        const n = legs ? onLeg(mul3(c.n, side), k) : mul3(c.n, side);
        const D = legs ? onLeg(c.along, k) : c.along;
        out.push({ c, key, o: legs ? onLeg(o0, k) : o0, n, D, B: cross3(n, D), half: c.half, across, set });
      }
    }
  }
  return out;
}

/**
 * A geometry's primitives as their vertices, face normal and mean height,
 * indexed by height. The skins' rings are a whole lacing step apart, so a
 * point cloud is no test of what stands over a 0.5 m plate: the FACES are.
 */
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
    const q0: Vec3 = [pts[3 * b] as number, pts[3 * b + 1] as number, pts[3 * b + 2] as number];
    const q1: Vec3 = [pts[3 * b + 3] as number, pts[3 * b + 4] as number, pts[3 * b + 5] as number];
    const q2: Vec3 = [pts[3 * b + 6] as number, pts[3 * b + 7] as number, pts[3 * b + 8] as number];
    const f = unit3(cross3(sub3(q1, q0), sub3(q2, q0)));
    fn[3 * p] = f[0];
    fn[3 * p + 1] = f[1];
    fn[3 * p + 2] = f[2];
  }
  const order = Int32Array.from(
    Array.from({ length: total }, (_, i) => i).sort((a, b) => (cy[a] as number) - (cy[b] as number)),
  );
  return { n: total, cy, fn, order, start, count, p: pts };
}

/** The first index of `order` at or above y. */
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

/**
 * Clip a convex polygon, given as (d, e) pairs, to the rectangle
 * [-half, half] x [-across, across]. Sutherland-Hodgman, four half-planes.
 */
function clipToFootprint(poly: number[][], half: number, across: number): number[][] {
  let out = poly;
  const edges: Array<readonly [number, number, number]> = [
    [1, 0, half],
    [-1, 0, half],
    [0, 1, across],
    [0, -1, across],
  ];
  for (const [a, b, c] of edges) {
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
 * How far the steel of `f` stands above the plate's inner face, READ OVER
 * THE PLATE'S OWN FOOTPRINT: every face whose outward normal is along the
 * plate's own, clipped to that footprint and evaluated on its plane at the
 * corners of what is left.
 *
 * Clipped, and not read at a vertex or over a bounding box, because a face
 * spans a whole lacing step and a lacing bar crosses its strut at 35
 * degrees: a vertex reports a standoff the plate never has, and the box
 * round a skewed strip covers ground the strip does not. On the plate's
 * own strut these numbers are its DEPTH under the corner angles, at every
 * point of the footprint at once.
 */
function overPlate(f: Faces, p: Plate, reach = 1.4): number[] {
  const R = Math.hypot(p.half, p.across) + reach;
  const lo = fromHeight(f, p.o[1] - R);
  const hi = fromHeight(f, p.o[1] + R);
  const out: number[] = [];
  const poly: number[][] = [];
  for (let i = lo; i < hi; i++) {
    const j = f.order[i] as number;
    const F: Vec3 = [f.fn[3 * j] as number, f.fn[3 * j + 1] as number, f.fn[3 * j + 2] as number];
    const Fn = dot3(F, p.n);
    if (Fn < 0.999) continue;
    poly.length = 0;
    let d0 = 0;
    let e0 = 0;
    let h0 = 0;
    const s = f.start[j] as number;
    const n = f.count[j] as number;
    for (let v = 0; v < n; v++) {
      const dx = (f.p[3 * (s + v)] as number) - p.o[0];
      const dy = (f.p[3 * (s + v) + 1] as number) - p.o[1];
      const dz = (f.p[3 * (s + v) + 2] as number) - p.o[2];
      const d = dx * p.D[0] + dy * p.D[1] + dz * p.D[2];
      const e = dx * p.B[0] + dy * p.B[1] + dz * p.B[2];
      d0 += d / n;
      e0 += e / n;
      h0 += (dx * p.n[0] + dy * p.n[1] + dz * p.n[2]) / n;
      poly.push([d, e]);
    }
    // Not a member a panel away.
    if (Math.abs(h0) > 0.12) continue;
    const kept = clipToFootprint(poly, p.half, p.across);
    if (kept.length < 3) continue;
    // A real overlap rather than a touch along one edge.
    const ds = kept.map((q) => q[0]!);
    const es = kept.map((q) => q[1]!);
    if (Math.max(...ds) - Math.min(...ds) < 0.02 || Math.max(...es) - Math.min(...es) < 0.02) continue;
    const Fd = dot3(F, p.D);
    const Fe = dot3(F, p.B);
    for (const q of kept) {
      out.push(h0 - (Fd * (q[0]! - d0) + Fe * (q[1]! - e0)) / Fn + CROSS.thick / 2);
    }
  }
  return out;
}

/** A geometry's points, indexed by height. */
interface Pts {
  readonly n: number;
  readonly p: Float64Array;
  readonly order: Int32Array;
}

function pointIndex(geo: Geometry): Pts {
  const n = geo.attrs.point.count;
  const P = geo.attrs.point.get("P")!.data;
  const p = new Float64Array(3 * n);
  for (let i = 0; i < 3 * n; i++) p[i] = P[i] as number;
  const order = Int32Array.from(
    Array.from({ length: n }, (_, i) => i).sort((a, b) => (p[3 * a + 1] as number) - (p[3 * b + 1] as number)),
  );
  return { n, p, order };
}

/**
 * The highest the cooked LACING reaches above the plate's inner face inside
 * its footprint, or -Infinity where none of it is. A mitred zigzag's peak is
 * a VERTEX, so this reads points and not faces.
 */
function laceOverPlate(q: Pts, p: Plate): number {
  const R = Math.hypot(p.half, p.across) + 0.2;
  const at = (i: number) => q.p[3 * (q.order[i] as number) + 1] as number;
  let a = 0;
  let b = q.n;
  while (a < b) {
    const m = (a + b) >> 1;
    if (at(m) < p.o[1] - R) a = m + 1;
    else b = m;
  }
  let best = -Infinity;
  for (let i = a; i < q.n && at(i) <= p.o[1] + R; i++) {
    const j = q.order[i] as number;
    const dx = (q.p[3 * j] as number) - p.o[0];
    const dy = (q.p[3 * j + 1] as number) - p.o[1];
    const dz = (q.p[3 * j + 2] as number) - p.o[2];
    const h = dx * p.n[0] + dy * p.n[1] + dz * p.n[2];
    if (h > 0.1 || h < -0.25) continue;
    if (Math.abs(dx * p.D[0] + dy * p.D[1] + dz * p.D[2]) > p.half) continue;
    if (Math.abs(dx * p.B[0] + dy * p.B[1] + dz * p.B[2]) > p.across) continue;
    best = Math.max(best, h + CROSS.thick / 2);
  }
  return best;
}

/**
 * Every place the cooked lacing stands over a plate's footprint, as (d, e,
 * h) in the plate's frame, h above its INNER face: the mitred vertices and
 * the clipped corners of the flat outer faces, read exactly as
 * {@link laceOverPlate} and {@link overPlate} read them, but kept one by
 * one so that each can be asked whether it is already inside steel.
 */
function laceSamples(q: Pts, f: Faces, p: Plate): Array<{ d: number; e: number; h: number }> {
  const out: Array<{ d: number; e: number; h: number }> = [];
  const R = Math.hypot(p.half, p.across) + 0.2;
  for (let i = 0; i < q.n; i++) {
    const j = q.order[i] as number;
    const r: Vec3 = [(q.p[3 * j] as number) - p.o[0], (q.p[3 * j + 1] as number) - p.o[1], (q.p[3 * j + 2] as number) - p.o[2]];
    if (Math.abs(r[1]) > R) continue;
    const h = dot3(r, p.n);
    if (h > 0.1 || h < -0.25) continue;
    const d = dot3(r, p.D);
    const e = dot3(r, p.B);
    if (Math.abs(d) > p.half || Math.abs(e) > p.across) continue;
    out.push({ d, e, h: h + CROSS.thick / 2 });
  }
  for (const s of facePolys(f, p, 0.999, 0.3, 0.12)) {
    for (const [d, e] of s.poly) out.push({ d: d!, e: e!, h: s.at(d!, e!) });
  }
  return out;
}

/**
 * The faces of `f` over a plate's footprint whose outward normal is within
 * `gate` of the plate's own, clipped to it: each as its clipped polygon in
 * (d, e) and its plane, as height above the plate's inner face.
 */
function facePolys(f: Faces, p: Plate, gate: number, reach: number, off: number) {
  const R = Math.hypot(p.half, p.across) + reach;
  const out: Array<{ poly: number[][]; at: (d: number, e: number) => number }> = [];
  for (let i = fromHeight(f, p.o[1] - R); i < fromHeight(f, p.o[1] + R); i++) {
    const j = f.order[i] as number;
    const F: Vec3 = [f.fn[3 * j] as number, f.fn[3 * j + 1] as number, f.fn[3 * j + 2] as number];
    const Fn = dot3(F, p.n);
    if (Fn < gate) continue;
    const poly: number[][] = [];
    let d0 = 0;
    let e0 = 0;
    let h0 = 0;
    const s = f.start[j] as number;
    const n = f.count[j] as number;
    for (let v = 0; v < n; v++) {
      const r: Vec3 = [(f.p[3 * (s + v)] as number) - p.o[0], (f.p[3 * (s + v) + 1] as number) - p.o[1], (f.p[3 * (s + v) + 2] as number) - p.o[2]];
      const d = dot3(r, p.D);
      const e = dot3(r, p.B);
      d0 += d / n;
      e0 += e / n;
      h0 += dot3(r, p.n) / n;
      poly.push([d, e]);
    }
    if (Math.abs(h0) > off) continue;
    const kept = clipToFootprint(poly, p.half, p.across);
    if (kept.length < 3) continue;
    const Fd = dot3(F, p.D);
    const Fe = dot3(F, p.B);
    out.push({ poly: kept, at: (d, e) => h0 - (Fd * (d - d0) + Fe * (e - e0)) / Fn + CROSS.thick / 2 });
  }
  return out;
}

/**
 * Whether a point over a plate is INSIDE A CORNER ANGLE already: under the
 * outer face of some web class' chord, within the chord's own 90 mm
 * (strut.ts, `CHORD` 0.045 a side), laterally within 2 mm of the face.
 * Such a point is enclosed by steel whether or not a plate is there, so it
 * cannot show through one. The lacing is inside the angles BY CONSTRUCTION
 * — it runs from chord axis to chord axis — which is why this has to be
 * asked before a plate is blamed for it.
 */
function inAngle(chords: Record<string, Faces>, p: Plate): (s: { d: number; e: number; h: number }) => boolean {
  const polys = WEB_CLASSES.flatMap((c) => facePolys(chords[c]!, p, 0.95, 1.4, 0.2));
  const near = (poly: number[][], d: number, e: number) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]!;
      const [xj, yj] = poly[j]!;
      if (yi! > e !== yj! > e && d < ((xj! - xi!) * (e - yi!)) / (yj! - yi!) + xi!) inside = !inside;
      const dx = xj! - xi!;
      const dy = yj! - yi!;
      const t = Math.max(0, Math.min(1, ((d - xi!) * dx + (e - yi!) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(d - xi! - t * dx, e - yi! - t * dy) < 0.002) return true;
    }
    return inside;
  };
  return (s) => polys.some((q) => {
    const over = q.at(s.d, s.e) - s.h;
    return over >= -1e-6 && over <= 0.09 && near(q.poly, s.d, s.e);
  });
}

/** The cooked skins the crossing plates are measured against, and the plates. */
interface CrossingProbe {
  /** Each web class' CHORDS: the corner angles, whose outer faces are the plate's datum. */
  readonly chords: Record<string, Faces>;
  /** Each web class' LACING, which the plate has to stay outside: its mitred
   * vertices, where a ring falls under a plate, and its flat outer faces,
   * which run the whole length of every bar. */
  readonly lacing: Record<string, Pts>;
  readonly laceFaces: Record<string, Faces>;
  /** Every plate the rules put on the tower: four legs, then the shaft. */
  readonly plates: Plate[];
}

const WEB_CLASSES = [
  "legPost",
  "legHorizontal",
  "legBracing",
  "legGapBracing",
  "shaftBracing",
  "shaftHorizontal",
];

/**
 * Cooked once and shared: the laced tower is 3.3M triangles and two of the
 * crossing tests read the same probes of it.
 */
const crossingProbes = new Map<string, Promise<CrossingProbe>>();
function crossingProbe(detail: Detail): Promise<CrossingProbe> {
  const key = JSON.stringify(detail);
  const got = crossingProbes.get(key);
  if (got !== undefined) return got;
  const made = (async (): Promise<CrossingProbe> => {
    const g = buildEiffel(1889, detail);
    for (const c of WEB_CLASSES) {
      for (const kind of ["ChordSkin", "LaceSkin"]) {
        g.output({ id: `${c}${kind}` } as NodeHandle, "out", `probe:${c}${kind}`);
      }
    }
    const { outputs } = await cook(g);
    const chords: Record<string, Faces> = {};
    const lacing: Record<string, Pts> = {};
    const laceFaces: Record<string, Faces> = {};
    for (const c of WEB_CLASSES) {
      chords[c] = faceIndex(firstGeometry(outputs[`probe:${c}ChordSkin`]!)!);
      lacing[c] = pointIndex(firstGeometry(outputs[`probe:${c}LaceSkin`]!)!);
      laceFaces[c] = faceIndex(firstGeometry(outputs[`probe:${c}LaceSkin`]!)!);
    }
    return {
      chords,
      lacing,
      laceFaces,
      plates: [...platesOf(legCrossings(), true), ...platesOf(shaftCrossings(), false)],
    };
  })();
  crossingProbes.set(key, made);
  return made;
}


describe("eiffel skeleton", () => {
  it("puts every leg-upright vertex on Plate XXXI's profile, and a vertex on every node", async () => {
    const { legUprights4, legUprightsUpper4 } = await cookWith(["legUprights4", "legUprightsUpper4"]);
    const lower = polylines(legUprights4!);
    const upper = polylines(legUprightsUpper4!);
    // Cut at XVII, where the section steps: 16 lower chains, 12 upper (a stops).
    expect(lower).toHaveLength(16);
    expect(upper).toHaveLength(12);
    for (const line of [...lower, ...upper]) {
      for (const [x, y, z] of line) {
        // Each coordinate is the outer or inner half-width at that height:
        // the uprights are straight within a panel, so the table read
        // linearly is exact between nodes (the rings a kink either side).
        const p = profileAt(y);
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - p.outer), Math.abs(c - p.inner));
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
        const n = nodeAt(y);
        if (n === undefined) {
          // Off a node, a vertex is one of the rings bracketing a kink.
          const d = Math.min(...NODES.map((m) => Math.abs(m.y - y)));
          expect(d, `vertex at y=${y}`).toBeCloseTo(UPRIGHT_KINK, 4);
        }
      }
      // And every node the chain spans is one of its vertices.
      const ys = line.map((v) => v[1]);
      for (const m of NODES) {
        if (m.y < Math.min(...ys) - 1e-6 || m.y > Math.max(...ys) + 1e-6) continue;
        expect(ys.some((y) => Math.abs(y - m.y) < 1e-4), `node ${m.name} missing`).toBe(true);
      }
    }
    for (const l of lower) {
      expect(Math.min(...l.map((v) => v[1]))).toBeCloseTo(2.5, 3);
      expect(Math.max(...l.map((v) => v[1]))).toBeCloseTo(node("XVII").y, 3);
    }
    for (const l of upper) {
      expect(Math.min(...l.map((v) => v[1]))).toBeCloseTo(node("XVII").y, 3);
      expect(Math.max(...l.map((v) => v[1]))).toBeCloseTo(node("XI").y, 3);
    }
  });

  it("steps the upright section at node XVII: the built-up box below, the 0.50 box above, and their seam rows", async () => {
    // PL-XXXI: from the supports to XVII the arbalétriers are the 0.877
    // plan-square box of plates (demos/eiffel/builtup.ts, held against the
    // plate in tests/eiffelBuiltup.test.ts), XII-XVII 500 square. This
    // used to read a swept 0.435 skin's rims at XVII and its seam rows at
    // hypot(0.435, 0.435 - inset) off the axis: that skin was neither the
    // plan square (0.4385) nor square to the tower's faces (rolled 11.6 deg
    // in panels 1-4), so the lower half now reads the plates themselves.
    // Above XVII the same holds of the 500 box (`UPPER_SECTIONS`): it too
    // is a plan square of plates in the tower's faces now, not a swept
    // 0.25 skin, so the upper half reads its plates and rows in plan too.
    const g = buildEiffel(1889, { rivets: true });
    for (const id of ["legUprightPlatesLit", "legUprightUpperPlatesLit"]) {
      g.output({ id } as NodeHandle, "out", `probe:${id}`);
    }
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[`probe:${id}`]!)!;
    const yXVII = node("XVII").y;
    const H = UPRIGHT_BOX.planHalf;
    // Into the +x+z leg: the quadrants are quarter turns of it.
    const fold = (p: Vec3): Vec3 => {
      let q = p;
      for (let i = 0; i < 4 && !(q[0] > 0 && q[2] > 0); i++) q = [q[2], q[1], -q[0]];
      return q;
    };
    // The upright of the leg nearest a point, the panel it lies along, and
    // its plan offsets from that panel's axis line at its own height. A
    // point ON the box's faces is in the panel of its height (the faces
    // fold on the nodes' horizontal lines); a plate vertex may be on a
    // run-on past it, so `along` picks the panel by the place along each
    // panel's axis instead.
    const picks = [["outer", "outer"], ["inner", "outer"], ["inner", "inner"], ["outer", "inner"]] as const;
    const nearest = (p: Vec3, along = true) => {
      const pr = profileAt(p[1]);
      const [xs, zs] = picks.reduce((b, m) =>
        Math.hypot(p[0] - pr[m[0]], p[2] - pr[m[1]]) < Math.hypot(p[0] - pr[b[0]], p[2] - pr[b[1]]) ? m : b,
      );
      let k = 0;
      let off = Infinity;
      for (let j = 0; j < 12; j++) {
        const [A, Q] = [NODES[j]!, NODES[j + 1]!];
        const d: Vec3 = [Q[xs] - A[xs], Q.y - A.y, Q[zs] - A[zs]];
        const t = ((p[0] - A[xs]) * d[0] + (p[1] - A.y) * d[1] + (p[2] - A[zs]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2);
        const o = along ? Math.max(0, -t, t - 1) : Math.max(0, A.y - p[1], p[1] - Q.y);
        if (o < off) [k, off] = [j, o];
      }
      const A = NODES[k]!;
      const Q = NODES[k + 1]!;
      const T0: Vec3 = [Q[xs] - A[xs], Q.y - A.y, Q[zs] - A[zs]];
      const l = Math.hypot(...T0);
      const f = (p[1] - A.y) / T0[1];
      return {
        dx: p[0] - (A[xs] + T0[0] * f),
        dz: p[2] - (A[zs] + T0[2] * f),
        T: [T0[0] / l, T0[1] / l, T0[2] / l] as Vec3,
        xs,
        zs,
      };
    };
    // The lower box ENDS at XVII: no plate vertex stands past the node's
    // plane square to panel 11's axis, and some lie on it (to f32 on a box
    // scaled 5 m either side of its centre: 0.5 mm).
    const plates = polylines(geo("legUprightPlatesLit")).flat().map(fold);
    let onTop = 0;
    for (const v of plates.filter((v) => v[1] > node("XVIII").y + 1)) {
      const { T, xs, zs } = nearest(v);
      const top = node("XVII");
      const past = (v[0] - top[xs]) * T[0] + (v[1] - yXVII) * T[1] + (v[2] - top[zs]) * T[2];
      expect(past).toBeLessThan(5e-4);
      if (Math.abs(past) < 5e-4) onTop++;
    }
    expect(onTop).toBeGreaterThan(0);
    // The upper plates: inside the 0.50 plan square about their own axis at
    // their own height (the face planes; to 30 mm of run-on past a turning
    // node, where the next panel's square is the one, and the jitter), and
    // at XVII on it: the box steps from the 0.877 to the 0.50 there.
    const upperPicks = [["outer", "outer"], ["inner", "outer"], ["outer", "inner"]] as const;
    // (A plate's end lies in XVII's plane square to panel 12's axis, so its
    // corners dip below the node: read there, that panel's line runs on.)
    const [n12, n13] = [node("XVII"), node("XVI")];
    const upperProfile = (y: number) =>
      y >= yXVII
        ? profileAt(y)
        : {
            outer: n12.outer + ((n13.outer - n12.outer) * (y - n12.y)) / (n13.y - n12.y),
            inner: n12.inner + ((n13.inner - n12.inner) * (y - n12.y)) / (n13.y - n12.y),
          };
    const inPlan = (v: Vec3) => {
      const pr = upperProfile(v[1]);
      return Math.min(...upperPicks.map(([xs, zs]) => Math.max(Math.abs(v[0] - pr[xs]), Math.abs(v[2] - pr[zs]))));
    };
    const upperAll = polylines(geo("legUprightUpperPlatesLit")).flat().map(fold);
    expect(upperAll.length).toBeGreaterThan(0);
    // (Except over a tronçon's joint, where a cover stands its own
    // thickness out of the face, and no more: tests/eiffelSplice.test.ts.)
    const jointYs = (["c", "b", "d"] as const).flatMap((m) =>
      upperJoints(m).map((j) => {
        const [A, Q] = [NODES[j.k]!, NODES[j.k + 1]!];
        // c runs (outer, outer), b and d (inner, outer) and (outer, inner).
        const L = Math.hypot(Q.y - A.y, Q.outer - A.outer, (m === "c" ? Q.outer - A.outer : Q.inner - A.inner));
        return A.y + ((Q.y - A.y) * j.t) / L;
      }),
    );
    // (A cover's end is square to its axis, so its corners reach 0.05 m
    // higher or lower than its centre line's end.)
    const overJoint = (y: number) => jointYs.some((jy) => Math.abs(y - jy) < SPLICE.upper.length / 2 + 0.1);
    for (const v of upperAll) {
      const reach = 0.25 + 0.004 + (overJoint(v[1]) ? SPLICE.upper.t : 0);
      expect(inPlan(v), `upper plate vertex at y ${v[1].toFixed(3)}`).toBeLessThan(reach);
    }
    const atXVII = upperAll.filter((v) => Math.abs(v[1] - yXVII) < 0.02);
    expect(atXVII.length).toBeGreaterThan(0);
    expect(Math.max(...atXVII.map(inPlan))).toBeCloseTo(0.25, 2);
    // The lower seam rows lie ON the webs: 0.4385 out in plan across the
    // face they fasten, and inset from its corner square to the axis, which
    // in plan is inset / |h square to T| [derived: builtup.ts, faceFrame].
    const lowerRivets = rivetBases(outputs["rivets.leg.uprights"]![0]).map(fold);
    expect(lowerRivets.length).toBeGreaterThan(0);
    for (const p of lowerRivets) {
      const { dx, dz, T } = nearest(p, false);
      const [out, along, h] = Math.abs(dx) > Math.abs(dz) ? [dx, dz, T[2]] : [dz, dx, T[0]];
      expect(Math.abs(Math.abs(out) - H)).toBeLessThan(SETTLE);
      expect(Math.abs(Math.abs(along) - (H - UPRIGHT_SEAMS.inset / Math.sqrt(1 - h * h)))).toBeLessThan(SETTLE);
    }
    // The upper rows lie ON the 500 box's webs, as the lower on theirs:
    // 0.25 out in plan across the face they fasten, and inset from its
    // corner square to the axis [derived: builtup.ts, upperLegSeamRows].
    // (Up at XI, b and d close to 0.50 apart and a row between them is as
    // near the other leg's axis as its own.)
    const upperRivets = rivetBases(outputs["rivets.leg.uprights.upper"]![0]);
    const upperBelowXI = upperRivets.filter((p) => p[1] < node("XI").y - 0.5).map(fold);
    expect(upperBelowXI.length).toBeGreaterThan(0);
    for (const p of upperBelowXI) {
      const pr = profileAt(p[1]);
      const [xs, zs] = upperPicks.reduce((b, m) =>
        Math.hypot(p[0] - pr[m[0]], p[2] - pr[m[1]]) < Math.hypot(p[0] - pr[b[0]], p[2] - pr[b[1]]) ? m : b,
      );
      let k = NODES.findIndex((n) => n.name === "XVII");
      while (NODES[k + 1]!.y <= p[1]) k++;
      const [A, Q] = [NODES[k]!, NODES[k + 1]!];
      const T0: Vec3 = [Q[xs] - A[xs], Q.y - A.y, Q[zs] - A[zs]];
      const l = Math.hypot(...T0);
      const [dx, dz] = [p[0] - pr[xs], p[2] - pr[zs]];
      const [out, along, h] = Math.abs(dx) > Math.abs(dz) ? [dx, dz, T0[2] / l] : [dz, dx, T0[0] / l];
      expect(Math.abs(Math.abs(out) - 0.25)).toBeLessThan(SETTLE);
      expect(Math.abs(Math.abs(along) - (0.25 - UPRIGHT_SEAMS.inset / Math.sqrt(1 - h * h)))).toBeLessThan(SETTLE);
    }
    // No upper head at the step: every one stands at least half a pitch up
    // its panel's axis from XVII's plane square to it, as every row keeps
    // off a straight node (the lower box's top lies in the 2nd floor's slab,
    // 115.13-115.73, and has no face to sit on). This used to hold the
    // swept skin's first resample row off the lower box's top.
    let firstUp = Infinity;
    for (const q of upperRivets.map(fold).filter((v) => v[1] < n13.y)) {
      const [xs, zs] = upperPicks.reduce((b, m) =>
        Math.hypot(q[0] - n12[m[0]], q[2] - n12[m[1]]) < Math.hypot(q[0] - n12[b[0]], q[2] - n12[b[1]]) ? m : b,
      );
      const T0: Vec3 = [n13[xs] - n12[xs], n13.y - n12.y, n13[zs] - n12[zs]];
      const l = Math.hypot(...T0);
      firstUp = Math.min(firstUp, ((q[0] - n12[xs]) * T0[0] + (q[1] - n12.y) * T0[1] + (q[2] - n12[zs]) * T0[2]) / l);
    }
    expect(firstUp).toBeGreaterThan(UPRIGHT_SEAMS.pitch / 2 - SETTLE);
    expect(firstUp).toBeLessThan(UPRIGHT_SEAMS.pitch);
  });

  it("puts every shaft-upright vertex on a Plate XXXI node", async () => {
    const { shaftUprights } = await cookWith(["shaftUprights"]);
    const lines = polylines(shaftUprights!);
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      for (const [x, y, z] of line) {
        const n = nodeAt(y);
        expect(n, `vertex at y=${y} is on no node`).toBeDefined();
        // A corner (c) or a face centre line (the merged b/d).
        for (const c of [Math.abs(x), Math.abs(z)]) {
          const off = Math.min(Math.abs(c - n!.outer), c);
          expect(off, `|coord| ${c} at y=${y}`).toBeLessThan(2e-3);
        }
      }
    }
  });

  it("carries 16 uprights to the 2nd floor, 12 to node XI and 8 above", async () => {
    const { legUprights4, legUprightsUpper4, shaftUprights } = await cookWith([
      "legUprights4",
      "legUprightsUpper4",
      "shaftUprights",
    ]);
    const all = [
      ...polylines(legUprights4!),
      ...polylines(legUprightsUpper4!),
      ...polylines(shaftUprights!),
    ];
    expect(crossing(all, 60)).toBe(16);
    expect(crossing(all, 150)).toBe(12);
    expect(crossing(all, 220)).toBe(8);
  });

  it("squares every copied web member to its leaning face", async () => {
    // Panels 1-4: the legs are parallel prisms leaning 0.50268 (horizontal
    // per vertical) on every face, so a face normal there tilts up by
    // exactly that slope and is square to x or to z. Checked on all four
    // quadrants' copies, where an unturned normal would not even be
    // perpendicular to its own member.
    const { legBracing4RotDone } = await cookWith(["legBracing4RotDone"]);
    const geo = legBracing4RotDone!;
    const faceN = geo.attrs.primitive.get("faceN");
    expect(faceN?.tupleSize).toBe(3);
    const n = faceN!.data;
    const lines = polylines(geo);
    let checked = 0;
    const quadrantsSeen = new Set<string>();
    lines.forEach(([a, b], p) => {
      const nx = n[3 * p] as number;
      const ny = n[3 * p + 1] as number;
      const nz = n[3 * p + 2] as number;
      const e = [b![0] - a![0], b![1] - a![1], b![2] - a![2]];
      const eLen = Math.hypot(e[0]!, e[1]!, e[2]!);
      expect(Math.abs(nx * e[0]! + ny * e[1]! + nz * e[2]!) / eLen).toBeLessThan(1e-4);
      if (Math.max(a![1], b![1]) > node("XXIV").y + 1e-3) return;
      expect(Math.min(Math.abs(nx), Math.abs(nz))).toBeLessThan(1e-4);
      expect(Math.abs(ny) / Math.hypot(nx, nz)).toBeCloseTo(0.50268, 3);
      quadrantsSeen.add(`${Math.sign(a![0])},${Math.sign(a![2])}`);
      checked++;
    });
    // 4 legs x 4 faces x 2 diagonals x 4 panels.
    expect(checked).toBe(128);
    expect(quadrantsSeen.size).toBe(4);
  });

  it("rivets the uprights' seams at the rule's pitch: 8 rows a box, 4 an open L, 8 a T", async () => {
    // Every upright's rows are laid on its plates as built (builtup.ts):
    // BELOW XVII the 0.877 box (lowerSeamRows), XVII-XI the legs' 500 boxes
    // (upperLegSeamRows), XI up the shaft's box, L and T (shaftSeamRows). On
    // each face a row in from each edge an angle is riveted along, a head
    // every pitch, centred on its stretch and at least half a pitch clear of
    // each end: a straight node, or at a turn the face's fold or its plate's
    // end (where each head sits is held in tests/eiffelBuiltup.test.ts).
    // Each row is a line (n - 1) pitches long, less 0.1 mm, so it takes n.
    // This used to count a spacing resample's samples along the upper
    // chains, 8 a sample, as the swept 0.25 skin took them: the L of panels
    // 19-28 has no plates on its two inner faces for 4 of those rows.
    const g = buildEiffel(1889, { rivets: true });
    const { outputs } = await cook(g);
    const p = UPRIGHT_SEAMS.pitch;
    const heads = (rows: ReadonlyArray<{ a: Vec3; b: Vec3 }>) =>
      rows.reduce((n, r) => n + Math.round(Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1], r.b[2] - r.a[2]) / p) + 1, 0);
    const upperLeg = upperLegSeamRows(p, UPRIGHT_SEAMS.inset, RIVET_RISE);
    const shaft = shaftSeamRows(p, UPRIGHT_SEAMS.inset, RIVET_RISE);
    // Rows: a leg's c, b and d over panels 12-17, 8 each; the shaft's four
    // c, a box in panel 18 (8) and an L in 19-28 (4), and four bd, a T in
    // 18-28 (8: the flange's tips and either side of the stem, and the stem
    // through its root's and its tip's angles).
    // Each tronçon joint's cover splits every row on a plate's outer face
    // it crosses in two (builtup.ts, the splices): a box's 8, the L's 4, the
    // T flange's 4 (its stem's rows run on). The legs' c, b and d have 12
    // joints each over panels 12-17; the shaft's c 2 in panel 18 (a box)
    // and 12 in 19-28, its bd 14.
    expect(upperLeg).toHaveLength(3 * 6 * 8 + 3 * 12 * 8);
    expect(shaft).toHaveLength(4 * (8 + 10 * 4) + 4 * 11 * 8 + 4 * (2 * 8 + 12 * 4 + 14 * 4));
    for (const [name, expected] of [
      ["rivets.leg.uprights", 4 * heads(lowerSeamRows(p, UPRIGHT_SEAMS.inset))],
      ["rivets.leg.uprights.upper", 4 * heads(upperLeg)],
      ["rivets.shaft.uprights", heads(shaft)],
    ] as const) {
      const item = outputs[name]![0]!;
      expect(item.kind).toBe("instances");
      if (item.kind !== "instances") return;
      expect(item.batches.map((b) => b.assetId)).toEqual(["rivet"]);
      expect(item.batches.reduce((n, b) => n + b.count, 0), name).toBe(expected);
    }
  });

  it("hangs panel 5's belt like the grande poutre, and screens panel 4 with the Masque", async () => {
    const { legHorizontals4RotDone, legBelt5Chords4RotDone, legMasque6x4RotDone, legMasque0x4RotDone } =
      await cookWith([
        "legHorizontals4RotDone",
        "legBelt5Chords4RotDone",
        "legMasque6x4RotDone",
        "legMasque0x4RotDone",
      ]);
    // Panel 5's chords are PL-VII's "500 x 10" plates, their OUTER faces on
    // the node lines ("Entre semelles 7,5309" = 7.00 x 1.07584, PL-VII
    // Fig. 1): their axes 0.25 in the plane inside XXIV and XXIII, and no
    // node horizontal on either node line.
    const inPlane = Math.hypot(1, (node("XXIV").outer - node("XXIII").outer) / 7);
    const inset = 0.25 / inPlane;
    const ys = polylines(legHorizontals4RotDone!).map(([a]) => a![1]);
    for (const y of [node("XXIV").y, node("XXIII").y]) expect(ys.filter((v) => Math.abs(v - y) < 1e-3)).toHaveLength(0);
    const chordYs = polylines(legBelt5Chords4RotDone!).map(([a]) => a![1]);
    expect(chordYs.filter((v) => Math.abs(v - (node("XXIV").y + inset)) < 1e-3)).toHaveLength(16);
    expect(chordYs.filter((v) => Math.abs(v - (node("XXIII").y - inset)) < 1e-3)).toHaveLength(16);
    // The Masque (PL-VII Fig. 6): its "750" chord 2.746 clear above the
    // "630", which clears panel 4's foot by 0.45, on the two outer faces of every leg, in
    // front of the uprights; its posts on the decorative girder's 3.8825.
    const panel4 = Math.hypot(1, (node("XXV").outer - node("XXIV").outer) / 11);
    const mid = polylines(legMasque6x4RotDone!);
    expect(mid).toHaveLength(8);
    // The screen stands out along the leaning face's normal (0, s, 1) / F,
    // which lifts it: take each point back onto the face plane first.
    const s4 = (node("XXV").outer - node("XXIV").outer) / 11;
    const onFace = (p: Vec3): number => {
      const w = Math.max(Math.abs(p[0]), Math.abs(p[2]));
      let y = p[1];
      // P = Q + t n with Q on the plane: t / F = w - outer(Q_y), so
      // Q_y = P_y - s (w - outer(Q_y)); a contraction (factor s^2).
      for (let i = 0; i < 12; i++) y = p[1] - s4 * (w - profileAt(y).outer);
      return y;
    };
    for (const [a, b] of mid) {
      expect(a![1]).toBeCloseTo(b![1], 6);
      const v = (onFace(a!) - node("XXV").y) * panel4;
      expect(v).toBeCloseTo(0.45 + 0.63 + 2.746 + 0.375, 2);
    }
    for (const [a] of polylines(legMasque0x4RotDone!)) {
      const [u, w] = [Math.abs(a![0]), Math.abs(a![2])].sort((m, n) => m - n);
      expect(Math.abs(u! / 3.8825 - Math.round(u! / 3.8825))).toBeLessThan(1e-3);
      // In front of the uprights' exterior webs, their C.J.s (12) and the
      // seam heads on the webs (13): the built-up box's plan half and those,
      // along the face's normal, which in plan is F = sqrt(1 + s^2) times it.
      // (This read 0.41 once, the old square skin's half-width.)
      expect(w!).toBeGreaterThan(profileAt(a![1]).outer + UPRIGHT_BOX.planHalf + 0.025 * Math.hypot(1, s4));
    }
  });

  it("draws the Masque's bars at the plate's angles, its lower V's at both chords, and fills its top corners", async () => {
    const got = await cookWith(["masqueUpABars", "masqueUpBBars", "masqueLowABars", "masqueLowBBars", "masqueFillet0Bars", "masqueFillet1Bars"]);
    const s4 = (node("XXV").outer - node("XXIV").outer) / 11;
    const F4 = Math.hypot(1, s4);
    // A face-0 member (z = outer + the standoff), in the face's (u, v): u is
    // x, and v the height in the plane, from the member's lean.
    const face0 = (lines: Vec3[][]) => lines.filter(([a, b]) => a![2] > a![0] && b![2] > b![0]);
    const angle = ([a, b]: Vec3[]) =>
      (Math.atan2(Math.hypot(b![1] - a![1], b![2] - a![2]), Math.abs(b![0] - a![0])) * 180) / Math.PI;
    // The upper X's at 47.5 degrees in the plane ("\" 48.5, "/" 46.5 read).
    for (const id of ["masqueUpABars", "masqueUpBBars"]) {
      const bars = face0(polylines(got[id]!));
      expect(bars.length, id).toBeGreaterThan(3);
      for (const l of bars) expect(angle(l)).toBeCloseTo(47.5, 3);
    }
    // The lower lattice: each bar 1.5 half-pitches along over the 2.746
    // clear, plus 0.23 into the 750 and less 0.05 short of the 630, so
    // V's meet at both chords; the 750's on the post grid (3.8825 / 2
    // from the tower's axis).
    const p = 3.8825 / 2;
    const rise = 2.746 + 0.23 - 0.05;
    const low = [...face0(polylines(got.masqueLowABars!)), ...face0(polylines(got.masqueLowBBars!))];
    expect(low.length).toBeGreaterThan(12);
    const midLo = 0.45 + 0.63 + 2.746;
    let apexes = 0;
    for (const [a, b] of low) {
      const [lo, hi] = a![1] < b![1] ? [a!, b!] : [b!, a!];
      const dir = Math.sign(hi[0] - lo[0]);
      expect(Math.abs(hi[0] - lo[0]) / Math.hypot(hi[1] - lo[1], hi[2] - lo[2])).toBeCloseTo((1.5 * p) / rise, 3);
      // Its upper end on the 750 chord's lower edge: the V's apex is 0.23
      // further along its line, on the grid. (The screen stands out along
      // the face's normal, which lifts it: back onto the plane first.)
      let yPlane = hi[1];
      for (let i = 0; i < 12; i++) yPlane = hi[1] - s4 * (hi[2] - profileAt(yPlane).outer);
      const v = (yPlane - node("XXV").y) * F4;
      if (Math.abs(v - midLo) > 0.02) continue;
      const apex = hi[0] + dir * ((1.5 * p) / rise) * 0.23;
      expect(Math.abs(apex / p - Math.round(apex / p)), `apex at ${apex.toFixed(3)}`).toBeLessThan(0.01);
      apexes++;
    }
    expect(apexes).toBeGreaterThan(6);
    // The rounded top corners, on both faces of every leg that carry it.
    for (const id of ["masqueFillet0Bars", "masqueFillet1Bars"]) {
      const f = polylines(got[id]!);
      expect(f.length, id).toBeGreaterThan(8);
      expect(face0(f).length * 2).toBe(f.length);
    }
  });

  it("builds the members the plates add: central posts, panel 10's two X's, the gap bracing", async () => {
    const ids = ["legPosts4RotDone", "legBracing4RotDone", "legGapBracing4RotDone", "legGapHorizontals4RotDone"];
    const got = await cookWith(ids);
    const [posts, bracing, gapX, gapH] = ids.map((id) => polylines(got[id]!));
    // A post on every face of every leg: the base tie and panel 1 (one
    // stretch: no horizontal at XXVIII, only the ties' top chord plate),
    // panels 2-4, 6-9 and panel 10 above its band [PL-IX Fig. 8, PL-VII
    // Figs 1, 2, 5].
    expect(posts).toHaveLength(4 * 4 * 9);
    for (const [a, b] of posts as [Vec3, Vec3][]) {
      // On the face's centre line: one coordinate is the outer or inner
      // half-width, the other their mean, at both ends.
      for (const [x, y, z] of [a, b]) {
        const p = profileAt(y);
        const mid = (p.outer + p.inner) / 2;
        const [u, v] = [Math.abs(x), Math.abs(z)].sort((m, n) => Math.abs(m - mid) - Math.abs(n - mid));
        expect(Math.abs(u! - mid), `post end at y=${y}`).toBeLessThan(2e-3);
        expect(Math.min(Math.abs(v! - p.outer), Math.abs(v! - p.inner))).toBeLessThan(2e-3);
      }
      // INTO the member it stands on, not short of it. The leg drifts
      // sideways as it rises, so the post meets a node's horizontal
      // obliquely while its cap is cut square: an end placed where the
      // whole cap cleared the horizontal left the far corner up to 0.38 m
      // clear of it — half a member wide, read as a post that stops short.
      // So the axis end sits INSIDE the horizontal's box, past its near
      // face and never past the node line, and the far corner clears.
      // The belts are the exception (postStretch caps the pull-back at
      // hw): their chord plates only touch XXIV, XXIII and XVIII, with
      // their bodies inside panels 5 and 11, so a post stops clear of
      // those and never enters them.
      for (const y of [a[1], b[1]]) {
        // The search reaches 1 m, well past the 0.4 bound, so an end that
        // stopped SHORT of its horizontal is caught by the bound instead
        // of falling outside the search and being skipped. (It has to stay
        // under 1.34, the tie's own lo end below XXVIII, which stands on a
        // chord plate rather than a horizontal and is not one of these.)
        const n = NODES.find((m) => Math.abs(m.y - y) < 1 && !["XXIV", "XXIII", "XVIII"].includes(m.name));
        if (n !== undefined) {
          const hw = MEMBERS.horizontal.find(([at]) => at >= n.y)?.[1] ?? 0;
          // Signed, from the side the member is on: a lower end stands on
          // the node below it, an upper end hangs under the node above.
          // So a positive d is an end that has not crossed the node line,
          // and d < hw is one that reaches its horizontal. The measure is
          // vertical while hw is a half-depth across the face's in-plane
          // normal, which makes the bound conservative by about a tenth.
          const d = y === Math.min(a[1], b[1]) ? y - n.y : n.y - y;
          expect(d, `post end at y=${y} crosses node ${n.name}`).toBeGreaterThan(0);
          expect(d, `post end at y=${y} short of node ${n.name}'s horizontal`).toBeLessThan(hw);
        }
        const inPanel5 = y > node("XXIV").y - 0.02 && y < node("XXIII").y + 0.02;
        expect(inPanel5, `post end at y=${y} in panel 5`).toBe(false);
      }
    }
    // Panel 10: above the band, two X's per face, 600 [PL-VII Fig. 2].
    const band = node("XIX").y + 3.6071 / Math.hypot(1, (19.16 - 16.8134) / 10);
    const p10 = bracing!.filter(([a, b]) => Math.min(a![1], b![1]) > node("XIX").y - 1e-3 && Math.max(a![1], b![1]) < node("XVIII").y + 1e-3);
    expect(p10).toHaveLength(4 * 4 * 2 * 2);
    for (const [a, b] of p10) {
      expect(Math.min(a![1], b![1])).toBeCloseTo(band, 3);
      expect(Math.max(a![1], b![1])).toBeCloseTo(node("XVIII").y, 3);
    }
    expect(MEMBERS.web.find(([y]) => y > 100.6 && y < 110.6)?.[1]).toBe(0.3);
    // The gap between adjacent legs: an X in panels 12-16 and a horizontal
    // at XVI-XII, on each tower face, from b of one leg to d of the next.
    expect(gapX).toHaveLength(4 * 5 * 2);
    expect(gapH).toHaveLength(4 * 5);
    for (const [a, b] of [...gapX!, ...gapH!] as [Vec3, Vec3][]) {
      for (const [x, y, z] of [a, b]) {
        const n = NODES.find((m) => Math.abs(m.y - y) < 1e-3);
        expect(n, `gap member end at y=${y}`).toBeDefined();
        expect(n!.y).toBeGreaterThan(node("XVIII").y);
        expect(n!.y).toBeLessThan(node("XI").y);
        // On a tower face (|x| or |z| is the outer half-width), at b or d.
        const [u, v] = [Math.abs(x), Math.abs(z)].sort((m, q) => m - q);
        expect(Math.abs(v! - n!.outer)).toBeLessThan(2e-3);
        expect(Math.abs(u! - n!.inner)).toBeLessThan(2e-3);
      }
      // Across the gap: its ends on opposite sides of the face's centre line.
      const across = Math.abs(a[0]) < Math.abs(a[2]) ? 0 : 2;
      expect(Math.sign(a[across]) * Math.sign(b[across])).toBe(-1);
    }
  });

  it("frames the belts as PL-VII draws them: chord plates, posts on the tower-axis grids, X'd ties", async () => {
    const got = await cookWith([
      "legHorizontals4RotDone",
      "legBelt11Chords4RotDone",
      "legBelt5Posts",
      "legBelt5BarsUp",
      "legBelt5BarsDown",
      "legBelt5Gussets",
      "legBelt11Posts",
      "legBelt11BarsUp",
      "legBelt11BarsDown",
      "legBelt11Gussets",
      "tieTopChord",
      "tieAChord",
      "tieBChord",
      "tieABarsA",
      "tieABarsB",
      "legBand10Up",
    ]);
    const slope = (lo: string, hi: string, key: "outer" | "inner" = "outer") =>
      (node(lo)[key] - node(hi)[key]) / (node(hi).y - node(lo).y);
    // Panel 11: "450 x 8" plates on the node lines replace the XVIII and
    // XVII horizontals; their axes 0.225 in the plane inside the lines. No
    // horizontal at XXVIII either: the ties' top chord plate is the only one.
    const hs = polylines(got.legHorizontals4RotDone!).map(([a]) => a![1]);
    for (const y of [node("XXVIII").y, node("XVIII").y, node("XVII").y]) {
      expect(hs.filter((v) => Math.abs(v - y) < 1e-3)).toHaveLength(0);
    }
    const F11 = Math.hypot(1, slope("XVIII", "XVII"));
    const chordYs = polylines(got.legBelt11Chords4RotDone!).map(([a, b]) => (a![1] + b![1]) / 2);
    expect(chordYs.filter((y) => Math.abs(y - (node("XVIII").y + 0.225 / F11)) < 1e-3)).toHaveLength(16);
    expect(chordYs.filter((y) => Math.abs(y - (node("XVII").y - 0.225 / F11)) < 1e-3)).toHaveLength(16);
    // Posts square to the chords (one coordinate constant along each) on
    // the grids from the tower's axis: 3.36268 in panel 11 (three to an
    // outer face), 3.8825 in panel 5 (four).
    const onFace0 = (p: Vec3, tol = 1e-3) => Math.abs(p[2] - profileAt(p[1]).outer) < tol;
    const onGrid = (lines: Vec3[][], pitch: number, count: number) => {
      for (const [a, b] of lines) expect(Math.abs(a![0] - b![0]) < 1e-6 || Math.abs(a![2] - b![2]) < 1e-6).toBe(true);
      // The leg is built in the +x+z quadrant: a post on face 0 (z = outer) keeps x.
      const face0 = lines.filter(([a, b]) => Math.abs(a![0] - b![0]) < 1e-6 && onFace0(a!));
      expect(face0).toHaveLength(count);
      for (const [a] of face0) expect(Math.abs(a![0] / pitch - Math.round(a![0] / pitch))).toBeLessThan(1e-4);
    };
    onGrid(polylines(got.legBelt11Posts!), 3.36268, 3);
    onGrid(polylines(got.legBelt5Posts!), 3.8825, 4);
    // Panel 11's lattice is an X in every bay AND the diamond: at the
    // belt's mid-depth the bars cross at every post and every bay centre.
    // The two families stand 5 mm either side of the face plane.
    const mid11 = (node("XVIII").y + node("XVII").y) / 2;
    const bars11 = [...polylines(got.legBelt11BarsUp!), ...polylines(got.legBelt11BarsDown!)].filter(
      ([a, b]) => onFace0(a!, 0.01) && onFace0(b!, 0.01),
    );
    const xs = bars11.map(([a, b]) => a![0] + ((b![0] - a![0]) * (mid11 - a![1])) / (b![1] - a![1]));
    for (const k of [2, 2.5, 3, 3.5, 4]) {
      expect(xs.filter((x) => Math.abs(x - k * 3.36268) < 3e-3), `bars at ${k} pitches`).toHaveLength(2);
    }
    // Their working lines run node line to node line: in the plane, the
    // panel's height over one pitch (panel 11, "55°49′49″") or two (panel
    // 5, 44 degrees).
    const riseOverRun = ([a, b]: Vec3[]) => Math.hypot(b![1] - a![1], b![2] - a![2]) / Math.abs(b![0] - a![0]);
    for (const [lo, hi, run, ids] of [
      ["XVIII", "XVII", 3.36268, ["legBelt11BarsUp", "legBelt11BarsDown"]],
      ["XXIV", "XXIII", 2 * 3.8825, ["legBelt5BarsUp", "legBelt5BarsDown"]],
    ] as const) {
      const H = (node(hi).y - node(lo).y) * Math.hypot(1, slope(lo, hi));
      const face0 = ids.flatMap((id) => polylines(got[id]!)).filter(([a, b]) => onFace0(a!, 0.01) && onFace0(b!, 0.01));
      expect(face0.length).toBeGreaterThan(4);
      for (const l of face0) expect(riseOverRun(l)).toBeCloseTo(H / run, 3);
    }
    // A gusset plate either side of the lattice at the mid-height of every
    // post (each reaches it), as tall as drawn.
    for (const [id, posts, lo, hi, height] of [
      ["legBelt5Gussets", "legBelt5Posts", "XXIV", "XXIII", 0.88],
      ["legBelt11Gussets", "legBelt11Posts", "XVIII", "XVII", 1.01],
    ] as const) {
      const gs = polylines(got[id]!);
      expect(gs).toHaveLength(2 * polylines(got[posts]!).length);
      const F = Math.hypot(1, slope(lo, hi));
      for (const [a, b] of gs) {
        expect(Math.hypot(b![0] - a![0], b![1] - a![1], b![2] - a![2])).toBeCloseTo(height, 4);
        expect(((a![1] + b![1]) / 2 - (node(lo).y + node(hi).y) / 2) * F).toBeCloseTo(0, 1);
      }
    }
    // The base ties' bottom chords: "2,987" below XXVIII in the plane (A)
    // and "2,765" over the support line (B) [PL-VII Figs 1, 5]; the top
    // chord, on all four faces, 0.29 above XXVIII.
    const F1 = Math.hypot(1, slope("XXVIII", "XXVII"));
    for (const [id, y, count] of [
      ["tieAChord", node("XXVIII").y - 2.987 / F1, 2],
      ["tieBChord", 2.5 + 2.765 / F1, 2],
      ["tieTopChord", node("XXVIII").y + 0.29 / F1, 4],
    ] as const) {
      const lines = polylines(got[id]!);
      expect(lines).toHaveLength(count);
      for (const [a, b] of lines) {
        expect(a![1]).toBeCloseTo(y, 3);
        expect(b![1]).toBeCloseTo(y, 3);
      }
    }
    // Tie A: an X in every bay but the one across the central post, whose
    // joints flank it 0.55 either side; so as many rising bars as falling
    // ones, and six X'd bays to a face (two of 3.05 each side of the post,
    // and the short end bays). No bar up a joint.
    const rising = polylines(got.tieABarsA!);
    const falling = polylines(got.tieABarsB!);
    expect(rising).toHaveLength(falling.length);
    expect(rising).toHaveLength(2 * 6);
    for (const [a, b] of [...rising, ...falling]) {
      const hi = a![1] > b![1] ? a! : b!;
      const p = profileAt(hi[1]);
      // On face 0 (z = outer) a station keeps x; on face 3 (x = outer), z.
      const u = Math.abs(hi[2] - p.outer) < 1e-3 ? hi[0] : hi[2];
      // Its upper joint: 0.55 + k 3.05 off the centre line, or an upright.
      const fromCentre = Math.abs(u - (p.outer + p.inner) / 2);
      const k = (fromCentre - 0.55) / 3.05;
      const onUpright = Math.abs(u - p.inner) < 1e-3 || Math.abs(u - p.outer) < 1e-3;
      expect(onUpright || Math.abs(k - Math.round(k)) < 1e-3, `joint ${fromCentre.toFixed(3)} off the centre`).toBe(true);
    }
    // Panel 10's band: flats every 1.59 along the chords, from the XIX
    // horizontal's top edge.
    const F10 = Math.hypot(1, slope("XIX", "XVIII"));
    const up = polylines(got.legBand10Up!).map(([a, b]) => (a![1] < b![1] ? a! : b!));
    const low = Math.min(...up.map((p) => p[1]));
    // (The flats stand 5 mm off the face plane, 1 mm higher.) They run from
    // the XIX horizontal's axis.
    expect((low - node("XIX").y) * F10).toBeCloseTo(0, 2);
    // On face 0 (z = outer), the flats' lower ends, on the chord.
    const face0 = up.filter((p) => p[2] > profileAt(p[1]).outer - 1e-3);
    const low0 = Math.min(...face0.map((p) => p[1]));
    const starts = face0.filter((p) => Math.abs(p[1] - low0) < 1e-4).map((p) => p[0]);
    for (const x of starts) expect(Math.abs(x / 1.59 - Math.round(x / 1.59))).toBeLessThan(1e-3);
    expect(starts.length).toBeGreaterThan(4);
  });

  it("laces the legs' 500s in panels 12-17 at the plate's steps, the shaft's at 0.68", async () => {
    const g = buildEiffel(1889, { lacedWeb: true });
    const probes = ["legBracingSamples", "shaftBracingSamples", "legGapBracingSamples", "legEntretoiseSamples", "legEntretoiseChords"];
    for (const id of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    // A strut's samples are its lacing stations: every step, bar the last.
    const steps = (id: string) =>
      polylines(firstGeometry(outputs[`probe:${id}`]!)!).map((l) => {
        const mid = l[1]!;
        const prev = l[0]!;
        return { y: (l[0]![1] + l[l.length - 1]![1]) / 2, step: Math.hypot(mid[0] - prev[0], mid[1] - prev[1], mid[2] - prev[2]) };
      });
    const leg = steps("legBracingSamples");
    for (const [lo, hi, step] of LEG_LACING_500) {
      const inPanel = leg.filter((s) => s.y > node(lo).y && s.y < node(hi).y);
      expect(inPanel, `panel ${lo}-${hi}`).toHaveLength(16);
      for (const s of inPanel) expect(s.step).toBeCloseTo(step, 4);
    }
    for (const s of leg.filter((x) => x.y < node("XIX").y)) expect(s.step).toBeCloseTo(1.0, 4);
    for (const s of steps("shaftBracingSamples")) expect(s.step).toBeCloseTo(0.68, 4);
    // The gap X's, panels 12-16, laced as openly as the legs' own 500s
    // (PL-VII: 0.70-1.13 read), not at the shaft's 0.68: two arms of four
    // tower faces' X's a panel.
    const gap = steps("legGapBracingSamples");
    for (const [lo, hi, step] of LEG_GAP_LACING_500) {
      const inPanel = gap.filter((s) => s.y > node(lo).y && s.y < node(hi).y);
      expect(inPanel, `gap panel ${lo}-${hi}`).toHaveLength(8);
      for (const s of inPanel) expect(s.step).toBeCloseTo(step, 4);
    }
    // The entretoises: laced at 0.79 (Fig. 8's 0.556 over cos 45), a
    // 1.20 x 0.7156 section ("600" +
    // "600", "715.6"): their chords 0.555 either side of the girder's
    // vertical plane and 0.3128 above and below its node (inside 0.045).
    for (const s of steps("legEntretoiseSamples")) expect(s.step).toBeCloseTo(ENTRETOISE.step, 4);
    const chords = polylines(firstGeometry(outputs["probe:legEntretoiseChords"]!)!);
    expect(chords.length).toBeGreaterThan(0);
    for (const l of chords) {
      const [a, b] = [l[0]!, l[l.length - 1]!];
      const n = NODES.find((m) => Math.abs(Math.abs(a[1] - m.y) - 0.3128) < 1e-3);
      expect(n && (ENTRETOISE.nodes as readonly string[]).includes(n.name), `chord at y ${a[1].toFixed(3)}`).toBe(true);
      // Off the leg's d-b line (x + z = inner + outer in the +x+z leg, and
      // its copies): the other legs are the same line turned, so measure
      // across the member in plan from the chord's own direction.
      const t = [b[0] - a[0], b[2] - a[2]];
      const L = Math.hypot(t[0]!, t[1]!);
      const across = Math.abs((a[0] * t[1]! - a[2] * t[0]!) / L);
      // The d-b line passes (outer, inner) and (inner, outer): its distance
      // from the tower's axis is (inner + outer) / sqrt 2.
      expect(Math.abs(across - (n!.inner + n!.outer) / Math.SQRT2)).toBeCloseTo(0.555, 3);
    }
  });

  it("braces the tower in plan at every node from XVI up, and each leg across its diagonal below", async () => {
    const { planBracingChordPaths, legEntretoises4 } = await cookWith([
      "planBracingChordPaths",
      "legEntretoises4",
    ]);
    const chords = polylines(planBracingChordPaths!);
    const from = NODES.findIndex((n) => n.name === PLAN_BRACING.from);
    // Members by pattern (PL-VIII Figs 13-22): A, then 8 girders + H' + the
    // K bracket's stub and two struts up to XII; the lozenge + H' + H + K's
    // two struts at XI and X; the lozenge + E, F, H at VIII-VI; the lozenge
    // + E, H at V-II; E, two G's and H at I and top28; nothing at IX.
    const expected: Record<string, number> = { hash: 13, lozengeH: 9, lozengeEF: 8, lozengeE: 7, corner: 5 };
    for (const n of NODES.slice(from)) {
      const w = n.inner > 0.5 ? n.inner : 0;
      const lines = planBracingLines(n.name, n.outer, w, 0.25);
      const pattern = planPattern(n.name);
      if (pattern === undefined) {
        // IX: the plancher intermédiaire, no plan bracing [PL-VIII Fig. 17].
        expect(lines, `node ${n.name}`).toHaveLength(0);
        expect(chords.filter(([a]) => Math.abs(a![1] - n.y) < 1), `node ${n.name}`).toHaveLength(0);
        continue;
      }
      expect(lines, `node ${n.name}`).toHaveLength(expected[pattern]!);
      const onLine = ([x, , z]: Vec3, [p, q]: (typeof lines)[number]) =>
        Math.abs((q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0])) / Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-3;
      // A is "1.000" deep, the rest "599.3" [PL-VIII Figs 16, 17, 24]: each
      // girder (or stretch of one) has its top chord right above its bottom
      // one, at its own depth, and lies on one of the node's lines of that depth.
      for (const d of [PLAN_BRACING.depthA, PLAN_BRACING.depth]) {
        const at = chords.filter(([a]) => Math.abs(a![1] - (n.y - d / 2)) < 1e-3);
        expect(chords.filter(([a]) => Math.abs(a![1] - (n.y + d / 2)) < 1e-3), `node ${n.name}`).toHaveLength(at.length);
        const ofDepth = lines.filter((l) => l[4] === d);
        for (const [a, b] of at) expect(ofDepth.some((l) => onLine(a!, l) && onLine(b!, l)), `node ${n.name}`).toBe(true);
        // Every line keeps at least one stretch.
        for (const l of ofDepth) expect(at.some(([a, b]) => onLine(a!, l) && onLine(b!, l)), `${n.name} ${l[5]}`).toBe(true);
        // Every girder in the tower's section.
        for (const [a, b] of at) for (const p of [a!, b!]) expect(Math.max(Math.abs(p[0]), Math.abs(p[2]))).toBeLessThanOrEqual(n.outer);
      }
      // A runs corner to corner along x = z, cut in two by the Edoux's
      // central guide post, which it frames into from both sides.
      const a1 = chords.filter(([a, b]) => Math.abs(a![1] - (n.y - 0.5)) < 1e-3 && Math.abs(a![0] - a![2]) < 1e-4 && Math.abs(b![0] - b![2]) < 1e-4);
      expect(a1, `node ${n.name}`).toHaveLength(2);
      const reach = Math.max(...a1.flatMap(([a, b]) => [Math.abs(a![0]), Math.abs(b![0])]));
      expect(n.outer - reach, `A short of c at ${n.name}`).toBeLessThan(0.45);
      expect(n.outer - reach).toBeGreaterThan(0.25);
    }
    // No chord enters the Edoux: its posts, its columns or its cars' runs.
    for (const [a, b] of chords) {
      for (let i = 0; i <= 50; i++) {
        const x = a![0] + ((b![0] - a![0]) * i) / 50;
        const y = a![1];
        const z = a![2] + ((b![2] - a![2]) * i) / 50;
        const [s, t] = [(x - z) / Math.SQRT2, (x + z) / Math.SQRT2];
        for (const o of EDOUX_PLAN) {
          if (y < o.y[0] || y > o.y[1]) continue;
          const gap = Math.max(o.s[0] - s, s - o.s[1], o.t[0] - t, t - o.t[1]);
          expect(gap, `${o.what} at y ${y.toFixed(2)}`).toBeGreaterThan(PLAN_BRACING.chord);
        }
      }
    }
    // Nothing below XVI.
    expect(chords.filter(([a]) => a![1] < node(PLAN_BRACING.from).y - 1)).toHaveLength(0);
    // The entretoises: d to b of every leg at the tops of panels 1-3, 6, 7;
    // where something of the lifts crosses their line, two, each from its
    // upright to `openHalf` short of the leg's diagonal: at XXVII-XXV and
    // XXI in the two Otis legs, where their car crosses it. Whole in the
    // Roux legs.
    const ent = polylines(legEntretoises4!);
    const halves = new Map<string, number>();
    const wholes = new Map<string, number>();
    for (const [a, b] of ent as [Vec3, Vec3][]) {
      const n = NODES.find((m) => Math.abs(m.y - a[1]) < 1e-4);
      expect(n && (ENTRETOISE.nodes as readonly string[]).includes(n.name)).toBe(true);
      expect(b[1]).toBeCloseTo(a[1], 6);
      const full = (n!.outer - n!.inner) * Math.SQRT2;
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (Math.abs(L - full) < 1e-3) {
        wholes.set(n!.name, (wholes.get(n!.name) ?? 0) + 1);
      } else {
        expect(L).toBeCloseTo(full / 2 - ENTRETOISE.openHalf, 3);
        // The free end stands openHalf off the leg's diagonal (|x| = |z|).
        const off = (p: Vec3) => Math.abs(Math.abs(p[0]) - Math.abs(p[2])) / Math.SQRT2;
        expect(Math.min(off(a), off(b))).toBeCloseTo(ENTRETOISE.openHalf, 3);
        halves.set(n!.name, (halves.get(n!.name) ?? 0) + 1);
      }
    }
    for (const name of ENTRETOISE.nodes) {
      const open = (ENTRETOISE.openAt as readonly string[]).includes(name);
      expect([wholes.get(name) ?? 0, halves.get(name) ?? 0], name).toEqual(open ? [2, 4] : [4, 0]);
    }
  });

  it("bands the plan bracing's corner bays at XVI-XII in the planes of its chords", async () => {
    const { planBracingBandPaths } = await cookWith(["planBracingBandPaths"]);
    const bands = polylines(planBracingBandPaths!);
    const d = PLAN_BRACING.depth;
    let total = 0;
    for (const n of NODES) {
      const w = n.inner > 0.5 ? n.inner : 0;
      const lines = planBracingBandLines(n.name, n.outer, w);
      const here = bands.filter(([a]) => Math.abs(a![1] - n.y) < d);
      // Top and bottom: one member per line in each chord plane.
      expect(here, `node ${n.name}`).toHaveLength(2 * lines.length);
      if (planPattern(n.name) !== "hash") {
        expect(lines, `node ${n.name}`).toHaveLength(0);
        continue;
      }
      // PL-VIII Figs 13-15: a sparse net at XVI, a grid at XIV, dense at XIII.
      expect(lines.length, `node ${n.name}`).toBeGreaterThan(0);
      total += here.length;
      for (const [a, b] of here as [Vec3, Vec3][]) {
        // Level, in a chord plane, parallel to a tower face.
        expect(a[1]).toBeCloseTo(b[1], 6);
        expect(Math.abs(Math.abs(a[1] - n.y) - d / 2)).toBeLessThan(1e-4);
        expect(Math.min(Math.abs(a[0] - b[0]), Math.abs(a[2] - b[2]))).toBeLessThan(1e-6);
        // Inside its leg's band: between the corner girder (|x| + |z| =
        // W + w) and the long girder (W - w), and within |x - z| <= W - w.
        for (const [x, , z] of [a, b]) {
          const [u, v] = [Math.abs(x), Math.abs(z)];
          expect(u + v).toBeGreaterThan(n.outer - w - 1e-6);
          expect(u + v).toBeLessThan(n.outer + w + 1e-6);
          expect(Math.abs(u - v)).toBeLessThan(n.outer - w + 1e-6);
        }
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it("lights its flat bars: unit normals, out of every box, the way its triangles wind", async () => {
    const ids = [
      "legMasque0Lit",
      "legMasque1Lit",
      "legMasque8Lit",
      "legBelt5ChordsLit",
      "legBelt11ChordsLit",
      "legBelt5PostsLit",
      "legBelt11BarsUpLit",
      "legBelt5GussetsLit",
      "tieTopChordLit",
      "tieAChordLit",
      "legBand10UpLit",
      "legEntretoiseLit",
    ];
    const got = await cookWith(ids);
    for (const id of ids) {
      const geo = got[id]!;
      const P = geo.attrs.point.get("P")!.data;
      const Nn = geo.attrs.point.get("normal")?.data;
      expect(Nn, `${id} carries no normal`).toBeDefined();
      let checked = 0;
      for (let p = 0; p < geo.primitiveCount; p++) {
        const s = geo.primVertexStart[p] as number;
        const ids3 = [0, 1, 2].map((k) => geo.vertexToPoint[s + k] as number);
        const v = ids3.map((i) => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
        const e1 = [v[1]![0]! - v[0]![0]!, v[1]![1]! - v[0]![1]!, v[1]![2]! - v[0]![2]!];
        const e2 = [v[2]![0]! - v[0]![0]!, v[2]![1]! - v[0]![1]!, v[2]![2]! - v[0]![2]!];
        const c = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
        const cl = Math.hypot(c[0]!, c[1]!, c[2]!);
        if (cl < 1e-12) continue;
        for (const i of ids3) {
          const n = [Nn![3 * i]!, Nn![3 * i + 1]!, Nn![3 * i + 2]!];
          expect(Math.hypot(n[0]!, n[1]!, n[2]!)).toBeCloseTo(1, 4);
          expect((n[0]! * c[0]! + n[1]! * c[1]! + n[2]! * c[2]!) / cl).toBeGreaterThan(0.999);
        }
        checked++;
      }
      expect(checked, id).toBeGreaterThan(0);
    }
  });

  it("plates every crossing the rules put one at: the post's landings, the panels' X's, the gap X, the shaft", async () => {
    // Laced, because that is where the plates are: the plain depth's
    // members are solid boxes that interpenetrate, so there is no daylight
    // at a crossing to cover and the whole `gussets` class is absent.
    const plain = await cook(buildEiffel());
    expect(plain.outputs.gussets).toBeUndefined();
    expect(Object.keys(plain.outputs).filter((k) => k.includes("crossings"))).toEqual([]);

    const rule = platesOf(legCrossings(), false);
    const shaft = platesOf(shaftCrossings(), false);
    // The sets are split by SECTION, not by family: `flatBars` takes one
    // width for a whole set, and an 800's plate on a 500 would be 0.80 wide.
    const bySet = new Map<string, Plate[]>();
    for (const p of rule) bySet.set(p.key, [...(bySet.get(p.key) ?? []), p]);
    expect([...bySet.keys()].sort()).toEqual(["500", "600", "800"]);
    // A post landing on each of the 12 levels a leg face's post meets a
    // member square to the face, on 4 faces: 11 of them 800s (7 node
    // horizontals and the 4 mid-panel ones of panels 1-4) and one — panel
    // 10's band top chord — a 600. Then panels 6-9's 16 X's, panel 10's 8
    // above its band, panels 12-17's 12 and the gap's 5. A pair of plates
    // at each, one either side of the lattice.
    const count = (key: string, family: Crossing["family"]) =>
      (bySet.get(key) ?? []).filter((p) => p.c.family === family).length;
    expect(count("800", "post")).toBe(2 * 44);
    expect(count("800", "legX")).toBe(2 * 16);
    expect(count("600", "post")).toBe(2 * 4);
    expect(count("600", "p10")).toBe(2 * 8);
    expect(count("500", "legX")).toBe(2 * 12);
    expect(count("500", "gap")).toBe(2 * 5);
    expect(shaft).toHaveLength(2 * 88);

    const g = buildEiffel(1889, { lacedWeb: true });
    const ids = [
      "legCrossPlates800",
      "legCrossPlates600",
      "legCrossPlates500",
      "shaftCrossMembers500",
      "legCrossPlates800Lit",
      "legCrossPlates600Lit",
      "legCrossPlates500Lit",
      "shaftCrossPlates500Lit",
    ];
    for (const id of ids) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    const geo = (id: string) => firstGeometry(outputs[`probe:${id}`]!)!;
    const ends = (l: readonly Vec3[]): [Vec3, Vec3] => [l[0]!, l[l.length - 1]!];

    // The member lists are built in the +x+z quadrant and copied four times
    // (the shaft is built WHOLE, with no copy), so each is matched against
    // one leg's rules and each plate is a DISTINCT member: nothing doubled.
    const gussets = flatBoxes(firstGeometry(outputs.gussets!)!);
    let litBoxes = 0;
    const centres: Vec3[] = [];
    for (const [id, list, legs] of [
      ["legCrossPlates800", bySet.get("800")!, true],
      ["legCrossPlates600", bySet.get("600")!, true],
      ["legCrossPlates500", bySet.get("500")!, true],
      ["shaftCrossMembers500", shaft, false],
    ] as const) {
      const lines = polylines(geo(id));
      const ns = faceNormals(geo(id));
      expect(lines, id).toHaveLength(list.length);
      const taken = new Set<number>();
      for (const p of list) {
        let best = Infinity;
        let bi = -1;
        lines.forEach((l, i) => {
          const [a, b] = ends(l);
          const d = len3(sub3(mul3(add3(a, b), 0.5), p.o));
          if (d < best) {
            best = d;
            bi = i;
          }
        });
        expect(best, `${id} plate at y=${p.o[1].toFixed(3)}`).toBeLessThan(1e-4);
        taken.add(bi);
        const [a, b] = ends(lines[bi]!);
        expect(len3(sub3(b, a)) / 2, `${id} half at y=${p.o[1].toFixed(3)}`).toBeCloseTo(p.half, 4);
        expect(Math.abs(dot3(unit3(sub3(b, a)), p.D))).toBeCloseTo(1, 6);
        // Its OWN outward normal: the pair cannot share one, or the inner
        // plate's rivets would point into the lattice.
        expect(dot3(ns[bi]!, p.n), `${id} normal at y=${p.o[1].toFixed(3)}`).toBeCloseTo(1, 5);
      }
      expect(taken.size, id).toBe(list.length);
      // The boxes the flat bars make of them, one per plate per leg, sized
      // by the rule: `2 half` along, `2 across` wide, `thick` through.
      const lit = flatBoxes(geo(`${id.replace("CrossMembers", "CrossPlates")}Lit`));
      expect(lit.length, id).toBe(list.length * (legs ? 4 : 1));
      litBoxes += lit.length;
      for (const p of (legs ? [0, 1, 2, 3] : [0]).flatMap((k) =>
        list.map((q) => ({
          o: legs ? onLeg(q.o, k) : q.o,
          D: legs ? onLeg(q.D, k) : q.D,
          n: legs ? onLeg(q.n, k) : q.n,
          B: legs ? onLeg(q.B, k) : q.B,
          half: q.half,
          across: q.across,
        })),
      )) {
        centres.push(p.o);
        let best = Infinity;
        let bi = -1;
        lit.forEach((b, i) => {
          const d = len3(sub3(b.centre, p.o));
          if (d < best) {
            best = d;
            bi = i;
          }
        });
        expect(best).toBeLessThan(5e-5);
        const box = lit[bi]!;
        for (const [axis, half, what] of [
          [p.D, p.half, "along"],
          [p.B, p.across, "across"],
          [p.n, CROSS.thick / 2, "through"],
        ] as const) {
          const got = Math.max(...box.points.map((q) => Math.abs(dot3(sub3(q, box.centre), axis))));
          // (5e-5, not the micron the 800s hold: the 500 set rides up to
          // 174 m, where an f32 ULP is 15 microns and a box corner carries
          // three of them.)
          expect(Math.abs(got - half), `${id} ${what}`).toBeLessThan(5e-5);
        }
        // And it is IN the class, within the jitter every class carries.
        let placed = Infinity;
        for (const b of gussets) placed = Math.min(placed, len3(sub3(b.centre, p.o)));
        expect(placed).toBeLessThan(SETTLE);
      }
    }
    // 888 plates: 178 a leg and 176 up the shaft.
    expect(litBoxes).toBe(4 * (120 + 24 + 34) + 176);
    expect(centres).toHaveLength(litBoxes);

    // AND THE LEVELS THAT ARE NOT PLATED, though a post does end on each.
    // The ties' two chords and the belts' chord plates at XXIV, XXIII and
    // XVIII are flats lying IN the face plane, a third of a metre below
    // where a plate set under the POST's corner angles would sit, so a
    // plate there plates nothing — and panels 5 and 11 carry no central
    // post, so it would have had no steel of any kind under it. A plate on
    // a flat needs a rule of its own.
    const tieY = (f: number) => node("XXVIII").y - tieDepth(f);
    for (const [name, y] of [
      ["tie A's bottom chord", tieY(0)],
      ["tie B's bottom chord", tieY(1)],
      ["the ties' top chord", tieTop()],
      ["XXIV's belt chord", node("XXIV").y],
      ["XXIII's belt chord", node("XXIII").y],
      ["XVIII's belt chord", node("XVIII").y],
    ] as const) {
      for (let f = 0; f < 4; f++) {
        const at = legFaceCentre(f, y);
        let near = Infinity;
        for (const c of centres) near = Math.min(near, len3(sub3(c, at)));
        expect(near, `${name} is plated`).toBeGreaterThan(1);
      }
    }
  });

  it("sets every crossing plate the depth its section asks under the angles, and bounds what the bisector costs", async () => {
    const { chords, plates } = await crossingProbe({ lacedWeb: true });
    // The plate's own strut: the one whose crossing it plates. A post
    // landing's is the post, an X's the diagonals that make it.
    const own: Record<Crossing["family"], string> = {
      post: "legPost",
      legX: "legBracing",
      p10: "legBracing",
      gap: "legGapBracing",
      shaft: "shaftBracing",
    };
    let flat = 0;
    let flatAt = "";
    let faces = 0;
    const kink = new Map<string, number>();
    const rule = new Map<string, number>();
    for (const p of plates) {
      // Every face of the strut that stands over the plate, clipped to its
      // footprint — the depth test and the flatness test at once.
      const hits = overPlate(chords[own[p.c.family]]!, p);
      expect(hits.length, `no steel over the plate at y=${p.o[1].toFixed(3)}`).toBeGreaterThan(0);
      if (p.c.residual > 1e-4) {
        rule.set(p.c.label ?? "", Math.max(rule.get(p.c.label ?? "") ?? 0, p.c.residual));
      }
      faces += hits.length;
      for (const h of hits) {
        const err = Math.abs(h - p.set);
        if (p.c.residual > 1e-4) {
          kink.set(p.c.label ?? "", Math.max(kink.get(p.c.label ?? "") ?? 0, err));
        } else if (err > flat) {
          flat = err;
          flatAt = `${p.c.family}${p.c.label === undefined ? "" : `:${p.c.label}`} y=${p.o[1].toFixed(3)}`;
        }
      }
    }
    // WHERE THE LEG RUNS STRAIGHT the plate holds the depth to the f32
    // noise: measured 0.02 mm over the 28,007 chord faces clipped to the
    // 888 plates' footprints — every X crossing in the tower, and the eight
    // post landings that are not at a turn.
    expect(faces).toBeGreaterThan(20000);
    expect(flat, `depth under the angles, worst at ${flatAt}`).toBeLessThan(1e-4);
    // The depth is `set * w / 0.4`: both knobs are quoted at an 800 and
    // scale with the section, so a 500 goes SHALLOWER, never deeper.
    const set = (key: string) => plates.find((p) => p.key === key)!.set;
    expect(set("800")).toBeCloseTo(0.015, 9);
    expect(set("600")).toBeCloseTo(0.01125, 9);
    expect(set("500")).toBeCloseTo(0.009375, 9);

    // AND WHAT THE BISECTOR COSTS. A post landing is ONE plate, square to
    // the post's direction read ACROSS the crossing, so where the leg turns
    // it lies on the bisector of the two stretches and one flat rectangle
    // cannot lie on both planes: its ends stand off the steel, and the two
    // plates of a pair tip OPPOSITE ways. The rule's figure is
    // `half sin(kink / 2)`; measured it is a little under, because the
    // steel does not quite reach the plate's ends.
    expect([...kink.keys()].sort()).toEqual(["XIX", "XX", "XXI", "XXII"]);
    for (const [name, mm] of [
      ["XXII", 14.34],
      ["XXI", 7.4],
      ["XX", 5.94],
      ["XIX", 1.2],
    ] as const) {
      expect(1000 * (kink.get(name) as number), `the bisector at ${name}`).toBeCloseTo(mm, 1);
    }
    // It tracks the rule, at 83-93% of it, and never exceeds it: the two
    // faces of a leg turn by slightly different angles, so each level's
    // worst plate is read against that level's widest turn.
    for (const [name, got] of kink) {
      const want = rule.get(name) as number;
      expect(got, `the bisector at ${name}`).toBeLessThan(want);
      expect(got, `the bisector at ${name}`).toBeGreaterThan(0.8 * want);
    }
    // THE HORIZONTAL A POST LANDS ON is a different member with its own
    // plane. Where the leg runs straight it is the same plane and the plate
    // holds the depth on it to 0.013 mm; where the leg turns the bisector
    // splits the error between the two, and the horizontal — which takes
    // the plane of the panel ABOVE it — carries 10.07 mm of it at XXII.
    let straight = 0;
    let turned = 0;
    for (const p of plates) {
      if (p.c.family !== "post") continue;
      for (const h of overPlate(chords.legHorizontal!, p)) {
        const err = Math.abs(h - p.set);
        if (p.c.residual > 1e-4) turned = Math.max(turned, err);
        else straight = Math.max(straight, err);
      }
    }
    expect(straight, "the horizontal under a straight post landing").toBeLessThan(2e-5);
    expect(1000 * turned, "the horizontal under a kinked post landing").toBeCloseTo(10.07, 1);
  });

  it("keeps every crossing plate's inner face outside the lacing it covers, and counts the ones it does not", async () => {
    const { chords, lacing, laceFaces, plates } = await crossingProbe({ lacedWeb: true });
    // The post landings where the column turns enough to spend the depth.
    const TURNS = ["XX", "XXI", "XXII"];
    // The bound the DEPTH is chosen against, re-measured from the cooked
    // lacing rather than from CHORD - LACE: a lacing bar's swept square is
    // mitred at the zigzag's vertices, so MID-SPAN its outer surface stands
    // 0.0174 inside the angles' outer face and not the 0.0225 the section
    // table implies. At `set` 0.02 the plate sat 2.6 mm behind it.
    const behind: string[] = [];
    const through: string[] = [];
    const seenBehind: string[] = [];
    const seenThrough: string[] = [];
    let clean = Infinity;
    let cleanAtTurn = Infinity;
    let worst = -Infinity;
    let seenWorst = -Infinity;
    let seenClean = Infinity;
    for (const p of plates) {
      // Read two ways, because neither alone sees all of it: the mitred
      // VERTICES, which are the lacing's peaks but stand a whole lacing
      // step apart, and the flat outer FACES clipped to the footprint,
      // which run the length of every bar and so cover the plates no vertex
      // falls under.
      let top = -Infinity;
      let seen = -Infinity;
      const hidden = inAngle(chords, p);
      for (const c of WEB_CLASSES) {
        top = Math.max(top, laceOverPlate(lacing[c]!, p), ...overPlate(laceFaces[c]!, p, 0.3));
        for (const s of laceSamples(lacing[c]!, laceFaces[c]!, p)) if (s.h > seen && !hidden(s)) seen = s.h;
      }
      expect(Number.isFinite(top), `no lacing under the plate at y=${p.o[1].toFixed(3)}`).toBe(true);
      worst = Math.max(worst, top);
      seenWorst = Math.max(seenWorst, seen);
      if (top <= 0 && TURNS.includes(p.c.label ?? "")) cleanAtTurn = Math.min(cleanAtTurn, -top);
      else if (top <= 0) clean = Math.min(clean, -top);
      else {
        behind.push(p.c.label ?? "");
        if (top > CROSS.thick) through.push(p.c.label ?? "");
      }
      if (seen <= 0) seenClean = Math.min(seenClean, -seen);
      else {
        seenBehind.push(p.c.label ?? "");
        if (seen > CROSS.thick) seenThrough.push(p.c.label ?? "");
      }
    }
    // WHERE IT HOLDS — every X crossing in the tower and every post landing
    // clear of a turn, 816 of the 888 plates — the tightest clearance
    // anywhere is 1.57 mm.
    expect(behind.length + through.length).toBeGreaterThan(0);
    expect(clean, "the tightest clean clearance").toBeGreaterThan(0.0015);
    // At a turn a plate the lacing happens to clear is clean by luck, not
    // by the depth: four at XXII by 0.11 mm. (They had lacing behind them
    // until the joints were fitted to the built-up uprights, builtup.ts:
    // every trimmed strut starts where its clearance says, which moved
    // each one's lacing along it, so the peaks under these plates moved.)
    expect(cleanAtTurn).toBeGreaterThan(0.0001);
    // WHERE IT DOES NOT, READ RAW. Only at the four kinked post landings:
    // the bisector's tilt (above) spends the clearance the depth was chosen
    // for, and a strut's lacing blows out past its mitre in the last rings
    // before a CUT end, reaching 2.6 mm inside the angles' outer face where
    // mid-span it is 17.4. Counted and bounded rather than asserted to zero.
    const tally = (v: string[]) => [...new Set(v)].sort().map((k) => `${k}=${v.filter((x) => x === k).length}`);
    expect(tally(behind)).toEqual(["XX=8", "XXI=32", "XXII=28"]);
    expect(tally(through)).toEqual(["XXI=8"]);
    expect(behind).toHaveLength(68);
    expect(through).toHaveLength(8);
    expect(1000 * worst, "the deepest the lacing reaches").toBeCloseTo(18.09, 1);
    // BUT MOST OF THAT IS INSIDE AN ANGLE ALREADY. The lacing runs from
    // chord axis to chord axis, so its ends are inside the corner angles'
    // 90 mm by construction, and so is every point the raw count blames on
    // XXI and XX — the blow-out included: the 8 plates "through" at XXI are
    // lacing 2.6 mm under the post's OWN angle's outer face, which no plate
    // lets through because the angle encloses it. Discounting what an angle
    // already encloses, 20 plates remain, all at XXII, each with the
    // lacing inside the plate's own 10 mm (6.17 mm at worst, 3.8 short of
    // its front face) — so nothing shows through any plate in the tower.
    // A plate PLANE cannot take these 16 out either: solved per plate
    // against the cooked steel and lacing, the best flat plane at XXII
    // still leaves the lacing within 0.57 mm of needing a proud plate, i.e.
    // it buys them back only at 11 mm proud and 1 mm of daylight
    // (legs.ts, postCrossings).
    // (16 before the joints were fitted to the built-up uprights; the four
    // more are the lacing peaks that moved, see above.)
    expect(tally(seenBehind)).toEqual(["XXII=20"]);
    expect(seenThrough).toHaveLength(0);
    expect(1000 * seenWorst, "the deepest the lacing reaches outside an angle").toBeCloseTo(6.17, 1);
    // And where it is clean, at the turns too: 0.38 mm at the tightest.
    expect(seenClean).toBeGreaterThan(0.0001);
  });

  it("covers the post's cut cap with the plate over it, at every node landing", async () => {
    const { legCrossPlates8004RotDone, legCrossPlates6004RotDone, legPosts4RotDone } = await cookWith(
      ["legCrossPlates8004RotDone", "legCrossPlates6004RotDone", "legPosts4RotDone"],
      { lacedWeb: true },
    );
    const built = [legCrossPlates8004RotDone!, legCrossPlates6004RotDone!].flatMap((geo) => {
      const ns = faceNormals(geo);
      return polylines(geo).map((l, i) => {
        const [a, b] = [l[0]!, l[l.length - 1]!];
        const D = unit3(sub3(b, a));
        return { o: mul3(add3(a, b), 0.5), D, n: ns[i]!, B: cross3(ns[i]!, D), half: len3(sub3(b, a)) / 2 };
      });
    });
    const posts = polylines(legPosts4RotDone!);
    const postN = faceNormals(legPosts4RotDone!);
    let caps = 0;
    let leastAlong = Infinity;
    for (const p of platesOf(legCrossings(), true)) {
      // Only a node landing has a cut end under it: at a mid-panel
      // horizontal, and on panel 10's band chord, the post runs on through.
      if (!p.c.atNode) continue;
      let best = Infinity;
      let bi = -1;
      built.forEach((q, i) => {
        const d = len3(sub3(q.o, p.o));
        if (d < best) {
          best = d;
          bi = i;
        }
      });
      expect(best).toBeLessThan(1e-4);
      const q = built[bi]!;
      posts.forEach((l, j) => {
        const [c, d] = [l[0]!, l[l.length - 1]!];
        const T = unit3(sub3(d, c));
        // A swept profile has one cut, square to the post, so the cap is a
        // w square on the post's own section axes: N, its face normal
        // squared to its axis, and N x T.
        const N = unit3(sub3(postN[j]!, mul3(T, dot3(postN[j]!, T))));
        const Bp = cross3(N, T);
        for (const e of [c, d]) {
          const r = sub3(e, q.o);
          // The end under THIS plate: on its axis and within its footprint
          // along the post.
          if (Math.abs(dot3(r, q.B)) > 0.02) continue;
          if (Math.abs(dot3(r, q.n) + p.c.w - p.set + CROSS.thick / 2) > 0.02) continue;
          if (Math.abs(dot3(r, q.D)) > q.half) continue;
          caps++;
          const w = tableAt(MEMBERS.web, e[1]);
          for (const sn of [1, -1]) {
            for (const sb of [1, -1]) {
              const corner = add3(add3(e, mul3(N, sn * w)), mul3(Bp, sb * w));
              leastAlong = Math.min(leastAlong, q.half - Math.abs(dot3(sub3(corner, q.o), q.D)));
            }
          }
        }
      });
    }
    // 13 cut ends up each face — two at each of XXVII, XXVI, XXV, XXII,
    // XXI and XX, where the post stops and starts again, and one at XIX,
    // where the post above starts on panel 10's band instead — each covered
    // by the pair of plates over it, on 4 faces of 4 legs.
    expect(caps).toBe(13 * 2 * 4 * 4);
    // ALONG THE POST the plate reaches past every corner of every cap, by
    // 89 mm at the worst of them: the margin it takes past the cap, plus
    // what measuring the reach across U rather than along the post buys.
    expect(leastAlong).toBeGreaterThan(0.05);
  });

  it("rivets every crossing plate round its own edges: on the outer face, inside the outline, pointing out", async () => {
    const g = buildEiffel(1889, { rivets: true });
    const probes = [
      ["800", "legCrossPlates8004RotDone", "rivets.leg.crossings.800", 16512],
      ["600", "legCrossPlates6004RotDone", "rivets.leg.crossings.600", 2368],
      ["500", "legCrossPlates5004RotDone", "rivets.leg.crossings.500", 2720],
      ["500", "shaftCrossMembers500", "rivets.shaft.crossings.500", 3520],
    ] as const;
    for (const [, id] of probes) g.output({ id } as NodeHandle, "out", `probe:${id}`);
    const { outputs } = await cook(g);
    const rule = [...platesOf(legCrossings(), true), ...platesOf(shaftCrossings(), false)];
    // The samples a spacing resample lays on a row of length L at pitch p.
    const heads = (L: number) => {
      const whole = Math.floor(L / CROSS.pitch + 1e-6);
      return whole + 1 + (L - whole * CROSS.pitch > 1e-4 ? 1 : 0);
    };
    let total = 0;
    for (const [key, id, name, want0] of probes) {
      const geo = firstGeometry(outputs[`probe:${id}`]!)!;
      const ns = faceNormals(geo);
      const shaft = id.startsWith("shaft");
      const plates = polylines(geo).map((l, i) => {
        const [a, b] = [l[0]!, l[l.length - 1]!];
        const D = unit3(sub3(b, a));
        const mine = rule.find(
          (p) =>
            p.key === key &&
            (p.c.family === "shaft") === shaft &&
            len3(sub3(p.o, mul3(add3(a, b), 0.5))) < 1e-4,
        );
        expect(mine, `no rule for the plate at ${id}`).toBeDefined();
        return { o: mul3(add3(a, b), 0.5), D, n: ns[i]!, B: cross3(ns[i]!, D), half: len3(sub3(b, a)) / 2, across: mine!.across };
      });
      const item = outputs[name]![0]!;
      expect(item.kind, name).toBe("instances");
      if (item.kind !== "instances") return;
      expect(item.batches.map((b) => b.assetId)).toEqual(["rivet"]);
      // Four rows round the edge: the two long ones `inset` in from the
      // ends, and the two short ones, which stop a pitch clear of those so
      // no two heads coincide.
      const want = plates.reduce(
        (n, p) =>
          n +
          2 * heads(2 * (p.half - CROSS.inset)) +
          2 * heads(2 * (p.across - CROSS.inset - CROSS.pitch)),
        0,
      );
      expect(want, name).toBe(want0);
      const got = item.batches.reduce((n, b) => n + b.count, 0);
      expect(got, name).toBe(want);
      total += got;
      const per = new Map<number, number>();
      const axes = rivetAxes(item);
      rivetBases(item).forEach((r, k) => {
        let best = Infinity;
        let bi = -1;
        plates.forEach((q, i) => {
          const v = sub3(r, q.o);
          const off = (t: number, lim: number) => Math.max(0, Math.abs(t) - lim);
          const d = Math.hypot(
            dot3(v, q.n) - CROSS.thick / 2,
            off(dot3(v, q.D), q.half - CROSS.inset),
            off(dot3(v, q.B), q.across - CROSS.inset),
          );
          if (d < best) {
            best = d;
            bi = i;
          }
        });
        // How far off its own plate's rows the head lies: the jitter, and
        // nothing else. (Matched on the OUTLINE, not the centre: at a
        // crossing two plates stand `2 (w - set)` apart across the lattice
        // and a head near an end is no nearer one centre than the other.)
        expect(best, name).toBeLessThan(SETTLE);
        per.set(bi, (per.get(bi) ?? 0) + 1);
        const q = plates[bi]!;
        const d = sub3(r, q.o);
        // On the OUTER face — the rows are drawn on the plate's mid-plane
        // and the heads stand half its thickness off it — and inside the
        // outline, a rivet's own diameter in from the edge. Every head is
        // jittered (`rivetSpawn`), which is what SETTLE covers.
        expect(Math.abs(dot3(d, q.n) - CROSS.thick / 2), name).toBeLessThan(SETTLE);
        expect(Math.abs(dot3(d, q.D)) - (q.half - CROSS.inset), name).toBeLessThan(SETTLE);
        expect(Math.abs(dot3(d, q.B)) - (q.across - CROSS.inset), name).toBeLessThan(SETTLE);
        // And standing OUT of the lattice, along its own plate's normal:
        // the two plates of a pair cannot share one, or the inner plate's
        // heads would sink into the steel it covers.
        expect(dot3(axes[k]!, q.n), name).toBeCloseTo(1, 5);
      });
      expect(per.size, name).toBe(plates.length);
    }
    // 25,120 heads over the 888 plates: 32 on an 800's square X plate and
    // 36 on its longer post-landing one, 24 to 26 on a 600, 20 on a 500.
    expect(total).toBe(16512 + 2368 + 2720 + 3520);
  });

  it("round-trips through its serialized form to the same geometry", async () => {
    const g = buildEiffel();
    const again = deserializeGraph(JSON.parse(JSON.stringify(serializeGraph(g))));
    const [a, b] = await Promise.all([cook(g), cook(again)]);
    for (const name of Object.keys(a.outputs)) {
      // The 1st floor's fittings and the Roux chains are instances at every
      // depth: compare their matrices, as bytes, batch by batch.
      if (name.startsWith("fittings.") || name.startsWith("chain.")) {
        const mats = (out: typeof a) =>
          (out.outputs[name]! as unknown as { batches: { transforms: Float32Array }[] }[]).flatMap((it) =>
            it.batches.map((bt) => Buffer.from(bt.transforms.buffer, bt.transforms.byteOffset, bt.transforms.byteLength)),
          );
        const [ma, mb] = [mats(a), mats(b)];
        expect(ma.length, name).toBeGreaterThan(0);
        expect(mb.length, name).toBe(ma.length);
        ma.forEach((m, i) => expect(mb[i]!.equals(m), name).toBe(true));
        continue;
      }
      const ga = firstGeometry(a.outputs[name]!)!;
      const gb = firstGeometry(b.outputs[name]!)!;
      const attrA = ga.attrs.point.get("P")!;
      const attrB = gb.attrs.point.get("P")!;
      // Capacity is not content: a column allocated at exactly its count and
      // one grown by doubling can hold the same elements, so compare only
      // the logical range, not whatever slack follows it.
      // `slice` and not `subarray`, because a column's read view does not
      // hand out its buffer and `Buffer.from` needs one. The copy is free
      // of consequence here — this compares bytes and keeps neither side.
      const pa = attrA.data.slice(0, ga.attrs.point.count * attrA.tupleSize);
      const pb = attrB.data.slice(0, gb.attrs.point.count * attrB.tupleSize);
      expect(Buffer.from(pb.buffer, pb.byteOffset, pb.byteLength).equals(Buffer.from(pa.buffer, pa.byteOffset, pa.byteLength)), name).toBe(true);
    }
  });
});
