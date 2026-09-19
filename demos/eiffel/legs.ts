/**
 * The four legs, supports to node XI where they merge into one shaft.
 *
 * One leg is built in the +x+z quadrant and copied onto the other three.
 * Its section is the square [inner, outer]^2 at every node, with the four
 * uprights in ring order c (outer corner), b, a (inner corner), d:
 *
 *   station 0  c  (outer, outer)
 *   station 1  b  (inner, outer)   in the +z tower face
 *   station 2  a  (inner, inner)   facing the tower's axis
 *   station 3  d  (outer, inner)   in the +x tower face
 *
 * so face f runs from station f to f + 1: faces 0 (c-b) and 3 (d-c) are
 * the leg's outer faces, 1 (b-a) and 2 (a-d) its inner ones.
 *
 * What changes with height is not the construction but which rules apply,
 * and those come straight off Plates VII, IX and XXXI:
 * - panels 1-4: one St Andrew's cross per face, crossing on a mid-height
 *   horizontal (the legs are parallel prisms there, so the faces are
 *   parallelograms and the diagonals bisect each other exactly at mid-height);
 * - panels 6-9: one cross per face;
 * - panels 1-4 and 6-9, and through the base ties: a CENTRAL POST on every
 *   face, a laced 800 strut parallel to the uprights through the crossing
 *   (PL-IX Fig. 8 prints "800" on it; PL-VII Figs 1-2);
 * - panel 5 (below the 1st floor) and panel 11 (below the 2nd): lattice
 *   girder belts instead of a cross, framed by solid chord plates ("500 x
 *   10", "450 x 8") whose outer edges lie on the node lines, with posts
 *   square to them on grids measured from the tower's axis (3.8825,
 *   3.36268) and a double lattice between (PL-VII Figs 1-2);
 * - over panel 4 of the faces in the tower's faces, the "Masque" (PL-VII
 *   Fig. 6), a screen that carries the decorative girder's band across;
 * - panel 10: a band "3,6071" deep at its base, "300 x 5" flats every
 *   1.59, then two X's per face either side of the post, all 600 (PL-VII
 *   Fig. 2);
 * - above the 2nd floor (node XVII) the inner upright a stops, and panels
 *   12-17 are braced on the two outer faces, their 500s laced by panel
 *   (`LEG_LACING_500`); the gap between adjacent legs (b of one, d of the
 *   next) is braced too, an X per panel in 12-16 and a horizontal across
 *   it at every node, until b and d close on XI (PL-VII Figs 2-3);
 * - inside the leg, the "entretoise diagonale" from d to b at the tops of
 *   panels 1-3, 6 and 7 (PL-VIII Figs 1, 8);
 * - below panel 1, the base ties ("entretoises inférieures"), X-braced: A
 *   on the outer faces, its bottom chord 2.987 below XXVIII in the plane,
 *   B on the inner faces, 1.600 (PL-VII Figs 1, 5).
 *
 * The uprights change section at XVII (0.87 -> 0.50) as a STEP, so each is
 * two chains, split there, each skinned and riveted from its own table.
 */
import {
  type Field,
  type Graph,
  type NodeHandle,
  attribute,
  component,
  copyToPoints,
  dot,
  filterByExpression,
  ge,
  lt,
  meshPrimitive,
  mul,
  normalize,
  orientAlongVector,
  pathResample,
  position,
  promoteAttribute,
  ramp,
  removeAttribute,
  setAttribute,
  sub,
  transformPoints,
  vec,
} from "pcg-ts";
import {
  END_SINE,
  END_SINE_MIN,
  FACE_NORMAL,
  type Lattice,
  type Level,
  type SegmentMember,
  type Vec3,
  chains,
  copyMembersToQuadrants,
  copyToQuadrants,
  edges,
  indexTable,
  merge,
  placedLattice,
  rotateByQuat,
  segmentMembers,
  skin,
  squareRing,
  stationLattice,
} from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import {
  ENTRETOISE,
  LEG_BELTS,
  LEG_LACING_500,
  MASQUE,
  MEMBERS,
  NODES,
  type NodeLevel,
  node,
  profileAt,
} from "./spec.js";
import {
  JOINT_ENDS,
  JOINT_REACH,
  LACING_STEP,
  UPRIGHT_SEAMS,
  faceSkin,
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

/** Stations b and a (c is 0, d is 3). */
const B = 1;
const A = 2;

/** The four uprights' ring: c, b, a, d. */
const LEG_RING = squareRing(1);

/** A leg's section at one node: the square [inner, outer]^2. */
export function legLevel(n: { y: number; outer: number; inner: number }): Level {
  return { y: n.y, x0: n.inner, x1: n.outer, z0: n.inner, z1: n.outer };
}

/** Faces that touch the inner upright a. */
const touchesA = (face: number) => face === B || face === A;

/** The leg's profile at any height, as a level (exact: uprights are straight within a panel). */
function levelAt(y: number, name = `y${y.toFixed(3)}`): NodeLevel {
  return { name, y, ...profileAt(y) };
}

/**
 * The face slopes of the panel containing y, horizontal per vertical: the
 * outer faces lean with `outer`, the inner ones with `inner`. A depth
 * printed in a rabattement (in the face plane) is sqrt(1 + s^2) times the
 * vertical one.
 */
function faceSlopes(y: number): { outer: number; inner: number } {
  const lo = profileAt(y - 0.01);
  const hi = profileAt(y + 0.01);
  return { outer: (lo.outer - hi.outer) / 0.02, inner: (lo.inner - hi.inner) / 0.02 };
}
const vertical = (inPlane: number, slope: number) => inPlane / Math.sqrt(1 + slope * slope);

/**
 * The leg's levels: every node from the supports to XI, plus the midpoint
 * of each of panels 1-4, where the cross meets its horizontal. A midpoint
 * is exact because the uprights are straight within a panel.
 */
function legLevels(): NodeLevel[] {
  const levels: NodeLevel[] = [];
  const upTo = NODES.findIndex((n) => n.name === "XI");
  for (let i = 0; i <= upTo; i++) {
    const n = NODES[i] as NodeLevel;
    levels.push(n);
    if (["XXVIII", "XXVII", "XXVI", "XXV"].includes(n.name)) {
      const m = NODES[i + 1] as NodeLevel;
      levels.push({
        name: `mid-${n.name}`,
        y: (n.y + m.y) / 2,
        outer: (n.outer + m.outer) / 2,
        inner: (n.inner + m.inner) / 2,
      });
    }
  }
  return levels;
}

/**
 * The uprights' own levels. A swept chain puts ONE ring at each vertex, in
 * the plane bisecting the two segments there and rolled by the up hint
 * against that bisector; the segments' own frames roll differently, so
 * between two kinked nodes the skin was a twisted blend of two rolls and
 * the seam rows, laid out in each segment's frame, sat up to 11 mm off it.
 * A ring KINK above and below every node where the column turns takes the
 * segment's own frame (its bisector IS the segment), so every panel's box
 * is untwisted and exact, and the turn happens within 2 x KINK of the
 * node, where no seam row is laid (`seamKeep`). The column runs straight
 * from the supports through XXV, so those nodes need none.
 */
const KINK = 0.01;
/** The rings' offset either side of a kinked node, for tests [estimated: small against a panel]. */
export const UPRIGHT_KINK = KINK;
/**
 * The nodes inside a chain where the column turns: the profile's slope
 * changes there [derived from Plate XXXI's table]. XXIV-XVIII and XV-XIII;
 * not XXVIII-XXV (panels 1-4 are one prism), XVI or XII (panels 12-13 and
 * 16-17 are collinear to 1e-5), nor XVII, where both chains end.
 */
const UPRIGHT_KINKS: readonly string[] = (() => {
  const upTo = NODES.findIndex((n) => n.name === "XI");
  const slope = (p: NodeLevel, q: NodeLevel, k: "outer" | "inner") => (q[k] - p[k]) / (q.y - p.y);
  const out: string[] = [];
  for (let i = 1; i < upTo; i++) {
    const [a, b, c] = [NODES[i - 1]!, NODES[i]!, NODES[i + 1]!];
    const turn = Math.max(
      Math.abs(slope(a, b, "outer") - slope(b, c, "outer")),
      Math.abs(slope(a, b, "inner") - slope(b, c, "inner")),
    );
    if (turn > 1e-4 && b.name !== "XVII") out.push(b.name);
  }
  return out;
})();

function uprightLevels(): NodeLevel[] {
  const upTo = NODES.findIndex((n) => n.name === "XI");
  const out: NodeLevel[] = [];
  for (let i = 0; i <= upTo; i++) {
    const n = NODES[i] as NodeLevel;
    const kink = UPRIGHT_KINKS.includes(n.name);
    if (kink) out.push(levelAt(n.y - KINK, `${n.name}-`));
    out.push(n);
    if (kink) out.push(levelAt(n.y + KINK, `${n.name}+`));
  }
  return out;
}

/** Seam rows everywhere but within the turn at a kinked node. */
function seamKeep(): Field {
  const stops: Array<readonly [number, number]> = [[-1, 1]];
  for (const name of UPRIGHT_KINKS) {
    const y = node(name).y;
    stops.push(
      [y - KINK - 0.003, 1],
      [y - KINK - 0.002, 0],
      [y + KINK + 0.002, 0],
      [y + KINK + 0.003, 1],
    );
  }
  stops.push([400, 1]);
  return ge(ramp(component(position(), 1), stops), 0.999);
}

/** The leg's corners c, b, a, d as ring coordinates. */
const CORNER_UV = LEG_RING;

/**
 * An open ring along consecutive faces of the leg (`faces` in ring order):
 * on each face a station at every fraction `ts` of the way from its first
 * corner to its second (0 included, 1 not), ending on the last face's far
 * corner. A station at a fraction lies at that fraction of the face's
 * width at every level, so on a face that leans in its own plane (panels
 * 1-4) a column of stations leans with the uprights.
 */
function faceRing(faces: readonly number[], ts: readonly number[]): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (const f of faces) {
    const [u0, v0] = CORNER_UV[f]!;
    const [u1, v1] = CORNER_UV[(f + 1) % 4]!;
    for (const t of ts) out.push([u0 + (u1 - u0) * t, v0 + (v1 - v0) * t]);
  }
  const last = faces[faces.length - 1]!;
  out.push(CORNER_UV[(last + 1) % 4]!);
  return out;
}

/**
 * A base tie under panel 1 on the given faces (PL-VII Figs 1, 5), from its
 * bottom chord up to node XXVIII, whose horizontal is its top chord: joints
 * on both chords every `pitch` from the face's centre line, the central
 * post's line, and an X in every bay between them and in the two short end
 * bays against the uprights. The stations are fractions of the face, so
 * the bays lean with the leg and the X's read skewed, as drawn.
 */
function tie(
  g: Graph,
  id: string,
  faces: readonly number[],
  pitch: number,
  depth: number,
  /**
   * Also a bar up every joint, parallel to the uprights (tie A: PL-VII
   * Fig. 1 draws its steep bars as V's, each joint's post and the next
   * bay's steep diagonal; tie B's steep bars are all parallel, no posts).
   */
  posts = false,
): NodeHandle {
  const top = node("XXVIII");
  const width = top.outer - top.inner;
  // Joints at least 0.3 m clear of the uprights' axes.
  const ts = [0];
  for (let k = -20; k <= 20; k++) {
    const t = 0.5 + (k * pitch) / width;
    if (t > 0.3 / width && t < 1 - 0.3 / width) ts.push(t);
  }
  ts.sort((a, b) => a - b);
  const lat = stationLattice(g, {
    id,
    ring: faceRing(faces, ts),
    closed: false,
    levels: [legLevel(levelAt(top.y - depth)), legLevel(top)],
  });
  // Joints are every station but the corners (the uprights) and the face's
  // centre line, where the central post runs through.
  const perFace = ts.length;
  const joint = (s: number) => s % perFace !== 0 && Math.abs((ts[s % perFace] ?? 0) - 0.5) > 1e-9;
  return merge(g, `${id}All`, [
    edges(lat, "BarsA", 1, 1),
    edges(lat, "BarsB", -1, 1),
    edges(lat, "Chord", 1, 0, (_s, k) => k === 0),
    ...(posts ? [edges(lat, "Posts", 0, 1, (s, k) => k === 0 && joint(s))] : []),
  ]);
}

/** A point in a face's own coordinates: (u, v). */
type UV = readonly [number, number];

/**
 * A leg face's plane over part of one panel, [y0, y1], in its own
 * coordinates: u the distance from the tower's axis along the face's
 * horizontal (world x on faces 0 and 2, z on 1 and 3), which is the chords'
 * direction and a true length in the plane; v up the plane from y0. The
 * uprights bound the face at u = inner(y) and u = outer(y), both straight
 * within a panel, so a clip against them is exact.
 */
interface FacePlane {
  /** The plane's height, in the plane. */
  readonly H: number;
  /** Its unit normal (out of the leg on faces 0 and 3). */
  readonly n: Vec3;
  /** A face point, `off` out along the normal. */
  world(p: UV, off?: number): Vec3;
  /**
   * The line p + t d clipped to vlo <= v <= vhi and to `margin` inside both
   * uprights' axes; undefined when less than `min` of it is left.
   */
  clip(p: UV, d: UV, vlo: number, vhi: number, margin: number, min?: number): [UV, UV] | undefined;
}

function facePlane(f: number, y0: number, y1: number): FacePlane {
  const key = f === 0 || f === 3 ? "outer" : "inner";
  const p0 = profileAt(y0);
  const p1 = profileAt(y1);
  const s = (p0[key] - p1[key]) / (y1 - y0);
  const F = Math.hypot(1, s);
  const H = (y1 - y0) * F;
  const n: Vec3 = f === 0 || f === 2 ? [0, s / F, 1 / F] : [1 / F, s / F, 0];
  // The uprights' axes as u = u0 + k v.
  const ki = (p1.inner - p0.inner) / H;
  const ko = (p1.outer - p0.outer) / H;
  return {
    H,
    n,
    world: ([u, v], off = 0) => {
      const y = y0 + v / F;
      const w = profileAt(y)[key];
      const p: Vec3 = f === 0 || f === 2 ? [u, y, w] : [w, y, u];
      return add3(p, scale3(n, off));
    },
    clip: (p, d, vlo, vhi, margin, min = 0.3) => {
      let t0 = -Infinity;
      let t1 = Infinity;
      // Keep a + t b >= 0.
      const keep = (a: number, b: number) => {
        if (Math.abs(b) < 1e-12) {
          if (a < 0) t0 = Infinity;
        } else if (b > 0) t0 = Math.max(t0, -a / b);
        else t1 = Math.min(t1, -a / b);
      };
      keep(p[1] - vlo, d[1]);
      keep(vhi - p[1], -d[1]);
      keep(p[0] - p0.inner - ki * p[1] - margin, d[0] - ki * d[1]);
      keep(p0.outer + ko * p[1] - margin - p[0], ko * d[1] - d[0]);
      if (!(t1 - t0 > min / Math.hypot(d[0], d[1]))) return undefined;
      return [
        [p[0] + t0 * d[0], p[1] + t0 * d[1]],
        [p[0] + t1 * d[0], p[1] + t1 * d[1]],
      ];
    },
  };
}

/** Members on all four faces of the leg, each face's segments from `build`, `off` out of the plane. */
function onFaces(
  y0: number,
  y1: number,
  build: (pl: FacePlane) => ReadonlyArray<[UV, UV] | undefined>,
  off = 0,
): SegmentMember[] {
  const out: SegmentMember[] = [];
  for (let f = 0; f < 4; f++) {
    const pl = facePlane(f, y0, y1);
    for (const seg of build(pl)) {
      if (seg !== undefined) out.push({ a: pl.world(seg[0], off), b: pl.world(seg[1], off), n: pl.n });
    }
  }
  return out;
}

/** Lines through (k * pitch, v0) along d, for every k whose line can reach a leg face. */
function family(pitch: number, v0: number, d: UV): Array<{ p: UV; d: UV }> {
  const reach = Math.abs(d[0]) + 1;
  const k0 = Math.floor(-reach / pitch) - 1;
  const k1 = Math.ceil((NODES[0]!.outer + reach) / pitch) + 1;
  return Array.from({ length: k1 - k0 + 1 }, (_, i) => ({ p: [(k0 + i) * pitch, v0] as UV, d }));
}

/** The uprights' half-width across a band [y0, y1] (its widest). */
const uprightHalf = (y0: number, y1: number) =>
  Math.max(tableAt(MEMBERS.upright, y0 + 0.01), tableAt(MEMBERS.upright, y1 - 0.01));

/**
 * A girder belt filling a panel between two chord plates `chord` wide whose
 * outer edges lie on the panel's node lines: posts square to the chords
 * every `pitch` from the tower's axis, standing between the chords' inner
 * edges, and a double lattice whose bars start every `barPitch` along the
 * chords and each run `span` along them from one chord's axis to the
 * other's. Everything is clipped short of the uprights; a post shorter
 * than half the depth is dropped.
 */
function girderBelt(
  y0: number,
  y1: number,
  chord: number,
  pitch: number,
  barPitch: number,
  span: number,
): { posts: SegmentMember[]; bars: SegmentMember[]; chords: SegmentMember[] } {
  const r = uprightHalf(y0, y1);
  const margin = r + POST_CLEAR;
  const inside = (pl: FacePlane) => ({ lo: chord, hi: pl.H - chord, D: pl.H - 2 * chord });
  const posts = onFaces(y0, y1, (pl) => {
    const { lo, hi, D } = inside(pl);
    return family(pitch, lo, [0, 1]).map((l) => pl.clip(l.p, l.d, lo, hi, margin, D / 2));
  });
  // The bars run to the chords' axes, the rivet lines they are fastened on:
  // panel 11's then meet the chords at 53.5 degrees ("53°49′43″" printed),
  // panel 5's at 42.
  const bars = onFaces(y0, y1, (pl) => {
    const lo = chord / 2;
    const hi = pl.H - chord / 2;
    const D = hi - lo;
    return [
      ...family(barPitch, lo, [span, D]).map((l) => pl.clip(l.p, l.d, lo, hi, margin)),
      ...family(barPitch, hi, [span, -D]).map((l) => pl.clip(l.p, l.d, lo, hi, margin)),
    ];
  });
  // The chords butt against the uprights' faces.
  const chords = onFaces(y0, y1, (pl) =>
    [chord / 2, pl.H - chord / 2].map((v) => pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, r)),
  );
  return { posts, bars, chords };
}

/**
 * Panel 5's belt (PL-VII Fig. 1): "500 x 10" chord plates on the node lines
 * XXIV and XXIII, posts square to them on the grande poutre's 3.8825 grid,
 * and bars from a post's foot through the next post's mid-height to the
 * top of the one after (so crossing at the posts' mid-heights and at the
 * quarter depths between). The chords take the place of the node
 * horizontals at XXIV and XXIII.
 */
function belt1(): ReturnType<typeof girderBelt> {
  const P = LEG_BELTS.belt1PostPitch;
  return girderBelt(node("XXIV").y, node("XXIII").y, LEG_BELTS.belt1Chord, P, P, 2 * P);
}

/**
 * Panel 11's belt (PL-VII Fig. 2): "450 x 8" chord plates on the node lines
 * XVIII and XVII, posts square to them every 3.36268 from the tower's axis,
 * and bars every half pitch, each spanning one pitch: post foot to the next
 * post's top (an X in every bay) and mid-bay to mid-bay through the posts'
 * mid-heights (the diamond). The chords take the place of the node
 * horizontals at XVIII and XVII.
 */
function belt2(): ReturnType<typeof girderBelt> {
  const P = LEG_BELTS.belt2PostPitch;
  return girderBelt(node("XVIII").y, node("XVII").y, LEG_BELTS.belt2Chord, P, P / 2, P);
}

/** The top of panel 10's base band [derived: its printed depth over the outer faces' slope]. */
function band10Top(): number {
  const y = node("XIX").y;
  return y + vertical(LEG_BELTS.band10Depth, faceSlopes(y + 1).outer);
}

/**
 * Panel 10's base band (PL-VII Fig. 2): "300 x 5" flats from the XIX
 * horizontal's axis to the band's 600 top chord's, their rivet lines, a
 * family each way every 1.59 from the tower's axis, V's at both chords,
 * each flat spanning two pitches over the band's 3.6071, 48 degrees
 * (drawn 49-51). No posts. The two families lie in two layers, `off`
 * either side of the face plane, so no two crossing flats share one.
 */
function band10(): { up: SegmentMember[]; down: SegmentMember[] } {
  const y0 = node("XIX").y;
  const y1 = band10Top();
  const lo = 0;
  const hi = 0;
  const p = LEG_BELTS.band10Pitch;
  const margin = uprightHalf(y0, y1) + POST_CLEAR;
  const off = LEG_BELTS.band10FlatThickness;
  const side = (dir: 1 | -1) =>
    onFaces(
      y0,
      y1,
      (pl) => {
        const D = pl.H - hi - lo;
        return family(p, dir > 0 ? lo : pl.H - hi, [2 * p, dir * D]).map((l) =>
          pl.clip(l.p, l.d, lo, pl.H - hi, margin),
        );
      },
      dir * off,
    );
  return { up: side(1), down: side(-1) };
}

/** Linear read of a (y, w) table, clamped: what `ramp` does, before the cook. */
function tableAt(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  if (y <= stops[0]![0]) return stops[0]![1];
  for (let i = 1; i < stops.length; i++) {
    const [y0, v0] = stops[i - 1]!;
    const [y1, v1] = stops[i]!;
    if (y <= y1) return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return stops[stops.length - 1]![1];
}

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const scale3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const unit3 = (p: Vec3): Vec3 => scale3(p, 1 / Math.hypot(p[0], p[1], p[2]));

/** Corner i (c, b, a, d) of the leg at height y. */
function corner(i: number, y: number): Vec3 {
  const { outer, inner } = profileAt(y);
  const [u, v] = CORNER_UV[((i % 4) + 4) % 4]!;
  return [inner + (outer - inner) * u, y, inner + (outer - inner) * v];
}

/** The centre line of face f at height y. */
const faceCentre = (f: number, y: number): Vec3 =>
  scale3(add3(corner(f, y), corner(f + 1, y)), 0.5);

/** A post's clearance past the member it stands on [estimated, as the joints']. */
const POST_CLEAR = 0.05;

/**
 * One stretch of a central post, on face f from height y0 to y1, standing
 * on members hw0 deep (below) and hw1 (above) — both lying along the face
 * at those heights, squared to it. The post ends where its own section,
 * w half-wide, clears them: along the post by (hw + clear + w |U.B|) /
 * (U.D), U the face's in-plane normal to the horizontal, D the post and B
 * the post's in-plane normal. Its ends, with the corner beyond it placed
 * at the same heights, so the edge rule reads the face it lies in.
 */
function postStretch(
  f: number,
  y0: number,
  y1: number,
  hw0: number,
  hw1: number,
): { lo: Vec3; hi: Vec3 } {
  const c0 = faceCentre(f, y0);
  const c1 = faceCentre(f, y1);
  const D = unit3(sub3(c1, c0));
  const H = unit3(sub3(corner(f + 1, y0), corner(f, y0)));
  const F = unit3(cross3(H, D));
  let U = unit3(cross3(F, H));
  if (dot3(U, D) < 0) U = scale3(U, -1);
  const Bp = unit3(cross3(F, D));
  const w = tableAt(MEMBERS.web, (y0 + y1) / 2);
  const along = (hw: number) => (hw + POST_CLEAR + w * Math.abs(dot3(U, Bp))) / dot3(U, D);
  return { lo: add3(c0, scale3(D, along(hw0))), hi: sub3(c1, scale3(D, along(hw1))) };
}

/**
 * The central posts: one laced strut up the middle of every leg face,
 * parallel to the uprights, through the base tie, panels 1-4 and 6-9, and
 * panel 10 above its band [sourced PL-IX Fig. 8, PL-VII Figs 1, 2, 5]. Each
 * stretch stops clear of the horizontal (or the tie's bottom chord, or the
 * band's top chord) at either end: on the plates those crossings are
 * rosettes, not joints to an upright. A placed lattice of eight stations
 * (corners even, face centres odd), two rows per stretch.
 */
function centralPosts(g: Graph): NodeHandle {
  // The member a post stands on reaches this far past the node line: a
  // node horizontal is centred on it, but the belts' chord plates only
  // touch it (their outer edges lie on XXIV and XXIII, XVIII and XVII).
  const h = (name: string) =>
    ["XXIV", "XXIII", "XVIII", "XVII"].includes(name) ? 0 : tableAt(MEMBERS.horizontal, node(name).y);
  const tieDepth = (f: number) => {
    const s = faceSlopes(node("XXVIII").y - 1);
    const outerFace = f === 0 || f === 3;
    return outerFace
      ? vertical(LEG_BELTS.tieOuterDepth, s.outer)
      : vertical(LEG_BELTS.tieInnerDepth, s.inner);
  };
  type Stretch = { y0: (f: number) => number; y1: number; hw0: number; hw1: number };
  const between = (a: string, b: string): Stretch => ({
    y0: () => node(a).y,
    y1: node(b).y,
    hw0: h(a),
    hw1: h(b),
  });
  const stretches: Stretch[] = [
    {
      y0: (f) => node("XXVIII").y - tieDepth(f),
      y1: node("XXVIII").y,
      hw0: MEMBERS.beltBar,
      hw1: h("XXVIII"),
    },
    between("XXVIII", "XXVII"),
    between("XXVII", "XXVI"),
    between("XXVI", "XXV"),
    between("XXV", "XXIV"),
    between("XXIII", "XXII"),
    between("XXII", "XXI"),
    between("XXI", "XX"),
    between("XX", "XIX"),
    { y0: () => band10Top(), y1: node("XVIII").y, hw0: LEG_BELTS.band10TopChord, hw1: h("XVIII") },
  ];
  const rows: Vec3[][] = [];
  for (const st of stretches) {
    const lo: Vec3[] = new Array<Vec3>(8);
    const hi: Vec3[] = new Array<Vec3>(8);
    for (let f = 0; f < 4; f++) {
      const p = postStretch(f, st.y0(f), st.y1, st.hw0, st.hw1);
      lo[2 * f + 1] = p.lo;
      hi[2 * f + 1] = p.hi;
      // The corner after face f, at the post's own heights on this face.
      lo[(2 * f + 2) % 8] = corner(f + 1, p.lo[1]);
      hi[(2 * f + 2) % 8] = corner(f + 1, p.hi[1]);
    }
    rows.push(lo, hi);
  }
  const lat = placedLattice(g, "postLat", rows, true);
  return edges(lat, "Posts", 0, 1, (s, k) => s % 2 === 1 && k % 2 === 0);
}

/**
 * The "entretoises diagonales" of one leg (ENTRETOISE; PL-VIII Figs 1, 8):
 * at each of their nodes a horizontal from d to b, or, where the lift runs
 * through (`openAt`), two, each from its upright to `openHalf` short of the
 * leg's diagonal, ending free. They carry what an edge rule would write
 * for their joints (the end sines against b's and d's columns) and which
 * of their ends are joints (JOINT_ENDS); their section is squared to the
 * vertical plane through them.
 */
function entretoiseMembers(): {
  members: SegmentMember[];
  extra: Array<{ name: string; values: number[][] }>;
} {
  const n: Vec3 = [Math.SQRT1_2, 0, Math.SQRT1_2];
  const members: SegmentMember[] = [];
  const sines: number[][] = [];
  const least: number[][] = [];
  const flags: number[][] = [];
  const sine = (p: Vec3, q: Vec3) => Math.hypot(...cross3(unit3(p), unit3(q)));
  // At upright i and height y, the member's sine against the column's
  // bisector, and the least against the bisector and the two segments.
  const ends = (i: number, y: number, m: Vec3): [number, number] => {
    const below = sub3(corner(i, y), corner(i, y - 1));
    const above = sub3(corner(i, y + 1), corner(i, y));
    const bis = add3(unit3(below), unit3(above));
    const s = sine(bis, m);
    return [s, Math.min(s, sine(below, m), sine(above, m))];
  };
  for (const name of ENTRETOISE.nodes) {
    const y = node(name).y;
    const d = corner(3, y);
    const b = corner(1, y);
    const u = unit3(sub3(b, d));
    const [sd, md] = ends(3, y, u);
    const [sb, mb] = ends(1, y, scale3(u, -1));
    if ((ENTRETOISE.openAt as readonly string[]).includes(name)) {
      const c = scale3(add3(d, b), 0.5);
      members.push({ a: d, b: sub3(c, scale3(u, ENTRETOISE.openHalf)), n });
      sines.push([sd, 1]);
      least.push([md, 1]);
      flags.push([1, 0]);
      members.push({ a: add3(c, scale3(u, ENTRETOISE.openHalf)), b, n });
      sines.push([1, sb]);
      least.push([1, mb]);
      flags.push([0, 1]);
    } else {
      members.push({ a: d, b, n });
      sines.push([sd, sb]);
      least.push([md, mb]);
      flags.push([1, 1]);
    }
  }
  return {
    members,
    extra: [
      { name: END_SINE, values: sines },
      { name: END_SINE_MIN, values: least },
      { name: JOINT_ENDS, values: flags },
    ],
  };
}

/** How far the Masque stands out from the face plane: clear of the uprights' 0.41 faces and their rivet heads (0.429) [estimated]. */
const MASQUE_STANDOFF = 0.44;

/**
 * "Masque placé sur le panneau 4" (PL-VII Fig. 6; numbers in `MASQUE`):
 * on each leg face that lies in a tower face (faces 0 and 3), over the
 * whole of panel 4. Laid out in the face's own coordinates, u along the
 * horizontal (world x on face 0) and v up the plane from panel 4's foot:
 * - a "630" bottom chord just clear of the foot's horizontal, a "750" chord
 *   2.746 clear above it,
 *   a top band under XXIV;
 * - between those two chords a 45-degree double lattice of flats;
 * - above, posts on the decorative girder's 3.8825 rhythm from the tower's
 *   axis, and heavy bars crossing at the posts' mid-heights, each spanning
 *   two post pitches, as panel 5's belt does.
 * Everything is clipped to the face, 0.45 short of the uprights' axes. The
 * rounded top corners are not drawn. Flat bars in four layers, so that no
 * two crossing plates share a plane; returned as member paths by width.
 */
function masque(g: Graph): Array<{ paths: NodeHandle; width: number; thickness: number }> {
  const foot = node("XXV");
  const s = (foot.outer - node("XXIV").outer) / (node("XXIV").y - foot.y);
  const F = Math.hypot(1, s);
  const H = (node("XXIV").y - foot.y) * F;
  const q = s / F; // the uprights' horizontal drift per unit of v
  const margin = 0.45;
  const M = MASQUE;
  const lowTop = M.lowLift + M.lowChord;
  const midLo = lowTop + M.lowClear;
  const midHi = midLo + M.midChord;
  const topLo = H - M.topBand;
  type UV = readonly [number, number];
  // Clip the line p + t d to lo <= v <= hi, between the uprights.
  const clip = (p: UV, d: UV, lo: number, hi: number): [UV, UV] | undefined => {
    let t0 = -1e9;
    let t1 = 1e9;
    const keep = (a: number, b: number) => {
      if (Math.abs(b) < 1e-12) {
        if (a < 0) t0 = Infinity;
      } else if (b > 0) t0 = Math.max(t0, -a / b);
      else t1 = Math.min(t1, -a / b);
    };
    keep(p[1] - lo, d[1]);
    keep(hi - p[1], -d[1]);
    keep(p[0] + q * p[1] - foot.inner - margin, d[0] + q * d[1]);
    keep(foot.outer - q * p[1] - p[0] - margin, -d[0] - q * d[1]);
    if (!(t1 - t0 > 0.3 / Math.hypot(d[0], d[1]))) return undefined;
    return [
      [p[0] + t0 * d[0], p[1] + t0 * d[1]],
      [p[0] + t1 * d[0], p[1] + t1 * d[1]],
    ];
  };
  const horizontal = (v: number) => clip([0, v], [1, 0], v - 1e-6, v + 1e-6);
  const post = M.postPitch;
  const ks = Array.from({ length: 12 }, (_, i) => i + 3);
  const slopeUp = (topLo - midHi) / (2 * post);
  const upper = (dir: 1 | -1) =>
    ks.map((k) => clip([k * post, (midHi + topLo) / 2], [1, dir * slopeUp], midHi, topLo));
  const js = Array.from({ length: 30 }, (_, j) => j + 4);
  const lower = (dir: 1 | -1) =>
    js.map((j) => clip([j * M.lowerPitch, lowTop], [1, dir], lowTop, midLo));
  const posts = ks.map((k) => clip([k * post, midHi], [0, 1], midHi, topLo));
  const n: Vec3 = [0, s / F, 1 / F];
  // Face 0 of the +x+z leg: x = u, the plane z = outer(y), `off` out along n.
  const world = ([u, v]: UV, off: number): Vec3 => {
    const y = foot.y + v / F;
    return add3([u, y, profileAt(y).outer], scale3(n, off));
  };
  const layer = (i: number, t: number) => MASQUE_STANDOFF + 0.012 * i + t / 2;
  const groups: Array<{ id: string; segs: Array<[UV, UV] | undefined>; off: number; width: number; thickness: number }> = [
    { id: "Posts", segs: posts, off: layer(0, M.barThickness), width: M.post, thickness: M.barThickness },
    { id: "LowA", segs: lower(1), off: layer(0, M.barThickness), width: M.lowerBar, thickness: M.barThickness },
    { id: "LowB", segs: lower(-1), off: layer(1, M.barThickness), width: M.lowerBar, thickness: M.barThickness },
    { id: "UpA", segs: upper(1), off: layer(1, M.barThickness), width: M.bar, thickness: M.barThickness },
    { id: "UpB", segs: upper(-1), off: layer(2, M.barThickness), width: M.bar, thickness: M.barThickness },
    { id: "Low", segs: [horizontal(M.lowLift + M.lowChord / 2)], off: layer(3, M.plate), width: M.lowChord, thickness: M.plate },
    { id: "Mid", segs: [horizontal((midLo + midHi) / 2)], off: layer(3, M.plate), width: M.midChord, thickness: M.plate },
    { id: "Top", segs: [horizontal(topLo + M.topBand / 2)], off: layer(3, M.plate), width: M.topBand, thickness: M.plate },
  ];
  return groups.map(({ id, segs, off, width, thickness }) => {
    const rows: Vec3[][] = [];
    for (const face of [0, 3]) {
      // Face 3 (d-c, the plane x = outer) is face 0 mirrored across x = z.
      const put = (p: Vec3): Vec3 => (face === 0 ? p : [p[2], p[1], p[0]]);
      for (const seg of segs) {
        if (seg === undefined) continue;
        const a = world(seg[0], off);
        const b = world(seg[1], off);
        const across = unit3(cross3(n, sub3(b, a)));
        rows.push([put(a), put(add3(a, across))], [put(b), put(add3(b, across))]);
      }
    }
    const lat = placedLattice(g, `masque${id}`, rows);
    // One member per row pair; its face is the pair's own strip, which
    // lies in the screen's plane.
    return { paths: edges(lat, "Bars", 0, 1, (s0, k) => s0 === 0 && k % 2 === 0), width, thickness };
  });
}

/**
 * The unit box's outward face normals, point by point: meshPrimitive's box
 * lays its faces out as blocks of 4 points (one quad each at the default
 * subdivisions) in the order +x, -x, +y, -y, +z, -z.
 */
const BOX_NORMALS: readonly Vec3[] = (
  [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as const
).flatMap((n): Vec3[] => [n, n, n, n]);

/**
 * Flat bars and plates: a box per member, its length along the member,
 * `width` across it in its face and `thickness` along the face's normal.
 *
 * The boxes carry a `normal`: every box's local face normal turned by its
 * copy's `rot` (a box scaled along its own axes keeps its face normals).
 * Without one, a merge with the swept members of the same class (which do
 * carry normals) filled these with zeros, and the Masque rendered black.
 */
function flatBars(g: Graph, id: string, members: NodeHandle, width: number, thickness: number): NodeHandle {
  const tips = g.add(pathResample, { mode: "count", count: 2, lengthAttr: "barLen" }, `${id}Tips`);
  const len = g.add(
    promoteAttribute,
    { name: "barLen", from: "primitive", to: "point", mode: "first" },
    `${id}Len`,
  );
  const first = g.add(filterByExpression, { predicate: lt(attribute("curveU"), 0.5) }, `${id}First`);
  const T = attribute("tangent", 3);
  const Fn = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(Fn, mul(T, dot(Fn, T))));
  const mid = g.add(
    transformPoints,
    { translate: mul(T, mul(attribute("barLen"), 0.5)) },
    `${id}Mid`,
  );
  const aim = g.add(orientAlongVector, { direction: T, up: N, axis: "+x" }, `${id}Aim`);
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: vec(attribute("barLen"), thickness, width) },
    `${id}Size`,
  );
  const unit = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1] }, `${id}Unit`);
  const unitN = g.add(
    setAttribute,
    {
      name: "boxN",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(BOX_NORMALS.map((n) => n[0])),
        indexTable(BOX_NORMALS.map((n) => n[1])),
        indexTable(BOX_NORMALS.map((n) => n[2])),
      ),
    },
    `${id}UnitN`,
  );
  const boxes = g.add(copyToPoints, { topology: "keep" }, `${id}Boxes`);
  const lit = g.add(
    setAttribute,
    {
      name: "normal",
      type: "f32",
      tupleSize: 3,
      value: normalize(rotateByQuat(attribute("rot", 4), attribute("boxN", 3))),
    },
    `${id}Normals`,
  );
  const done = g.add(removeAttribute, { names: ["boxN"], domain: "point" }, `${id}Lit`);
  g.connect(members, "out", tips, "in");
  g.connect(tips, "out", len, "in");
  g.connect(len, "out", first, "in");
  g.connect(first, "out", mid, "in");
  g.connect(mid, "out", aim, "in");
  g.connect(aim, "out", sized, "in");
  g.connect(unit, "out", unitN, "in");
  g.connect(unitN, "out", boxes, "source");
  g.connect(sized, "out", boxes, "target");
  g.connect(boxes, "out", lit, "in");
  g.connect(lit, "out", done, "in");
  return done;
}

/**
 * The gap between two adjacent legs in the tower face, above the 2nd
 * floor: b of this leg at (inner, outer), d of the next at (-inner, outer).
 * An X per panel in panels 12-16 and a horizontal across it at XVI-XII
 * [sourced PL-VII Fig. 2 panels 12-14, Fig. 3 panels 15-16; panel 17 is
 * open: the axes close from 1.863 to 0.50, the boxes to touching].
 */
function gapLattice(g: Graph): Lattice {
  const from = NODES.findIndex((n) => n.name === "XVII");
  const to = NODES.findIndex((n) => n.name === "XI");
  return stationLattice(g, {
    id: "legGap",
    ring: [
      [1, 1],
      [0, 1],
    ],
    closed: false,
    levels: NODES.slice(from, to + 1).map((n) => ({
      y: n.y,
      x0: -n.inner,
      x1: n.inner,
      z0: n.outer,
      z1: n.outer,
    })),
  });
}

/**
 * The legs' horizontal table: MEMBERS.horizontal, with panel 10's band
 * chord (600 [sourced PL-VII Fig. 2]) between XIX and XVIII, where it is
 * the only horizontal; the node horizontals at XIX and XVIII stay 800.
 */
function legHorizontalTable(): ReadonlyArray<readonly [number, number]> {
  const lo = node("XIX").y;
  const hi = node("XVIII").y;
  const band = LEG_BELTS.band10TopChord;
  return [
    ...MEMBERS.horizontal.filter(([y]) => y < lo),
    [lo, tableAt(MEMBERS.horizontal, lo)],
    [lo + 0.01, band],
    [hi - 0.01, band],
    [hi, tableAt(MEMBERS.horizontal, hi)],
    ...MEMBERS.horizontal.filter(([y]) => y > hi),
  ];
}

/** Build the four legs. `quads` are the four quadrant targets. */
export function buildLegs(g: Graph, quads: NodeHandle, detail: Detail = {}): Parts {
  const levels = legLevels();
  const at = (name: string) => levels.findIndex((l) => l.name === name);
  const kA = at("XVII");

  const lat = stationLattice(g, {
    id: "leg",
    ring: LEG_RING,
    closed: true,
    levels: levels.map(legLevel),
  });

  // The uprights, on their own levels (the nodes, and a ring either side of
  // every kink): c, b and d run the full height; a stops at XVII. Each is
  // cut at XVII, where the section steps 0.87 -> 0.50: the lower chains run
  // supports to XVII, the upper (c, b, d) XVII to XI.
  const upLevels = uprightLevels();
  const upr = stationLattice(g, {
    id: "legUpr",
    ring: LEG_RING,
    closed: true,
    levels: upLevels.map(legLevel),
  });
  const kStep = upLevels.findIndex((l) => l.name === "XVII");
  const uprights = chains(upr, "Lower", (_s, k) => k <= kStep);
  const uprightsUpper = chains(upr, "Upper", (s, k) => s !== A && k >= kStep);

  // Horizontal struts at every node and mid-panel above the supports;
  // above XVII the ring is open, with no a to close it. XI's ring is the
  // shaft's (the same line, c to the face centre), so the legs stop below it.
  const kMerge = at("XI");
  const horizontals = edges(
    lat,
    "Horizontals",
    1,
    0,
    // Not at XXIV and XXIII, nor at XVIII and XVII: the belts' chord
    // plates of panels 5 and 11 stand there, inside them.
    (s, k) =>
      k >= at("XXVIII") &&
      k < kMerge &&
      !["XXIV", "XXIII", "XVIII", "XVII"].includes(levels[k]?.name ?? "") &&
      !(k > kA && touchesA(s)),
  );

  // Inside the leg, the "entretoise diagonale" from d to b at the tops of
  // panels 1-3 and 6-7 (PL-VIII Figs 1, 8), open where the lift runs.
  const ent = entretoiseMembers();
  const entretoises = segmentMembers(g, "legEntretoiseMembers", ent.members, ent.extra);

  // Crosses. Rule "A" draws face f's rising diagonal from station f,
  // rule "B" its falling one from station f + 1, so each face gets both.
  const crossSpan = (k: number): number => {
    const name = levels[k]?.name ?? "";
    if (["XXVIII", "XXVII", "XXVI", "XXV"].includes(name)) return 2; // over the mid
    if (["XXIII", "XXII", "XXI", "XX"].includes(name)) return 1; // panels 6-9
    if (k >= kA && k < at("XI")) return 1; // panels 12-17
    return 0; // the supports, mids, panel 10 (its own lattice) and the belts
  };
  const crossOn = (face: number, k: number, span: number) =>
    crossSpan(k) === span && !(k >= kA && touchesA(face));
  const crosses = [2, 1].flatMap((span) => [
    edges(lat, `CrossA${span}`, 1, span, (s, k) => crossOn(s, k, span)),
    edges(lat, `CrossB${span}`, -1, span, (s, k) => crossOn((s + 3) % 4, k, span)),
  ]);

  // Panel 10 above its band: two X's per face, either side of the post, on
  // a ring with the face centres in it; and the band's top chord.
  const p10 = stationLattice(g, {
    id: "leg10",
    ring: squareRing(2),
    closed: true,
    levels: [legLevel(levelAt(band10Top())), legLevel(node("XVIII"))],
  });
  const p10Crosses = merge(g, "leg10Crosses", [
    edges(p10, "CrossA", 1, 1),
    edges(p10, "CrossB", -1, 1),
  ]);
  const p10Chord = edges(p10, "BandChord", 2, 0, (s, k) => k === 0 && s % 2 === 0);

  // The girder belts: the base ties under panel 1, panels 5 and 11 (bars
  // and posts here, their chord plates below), and panel 10's base band.
  const s1 = faceSlopes(node("XXVIII").y - 1);
  const panel5 = belt1();
  const panel11 = belt2();
  const band = band10();
  const belts = merge(g, "legBelts", [
    tie(g, "tieA", [3, 0], LEG_BELTS.tieOuterPitch, vertical(LEG_BELTS.tieOuterDepth, s1.outer), true),
    tie(g, "tieB", [1, 2], LEG_BELTS.tieInnerPitch, vertical(LEG_BELTS.tieInnerDepth, s1.inner)),
    segmentMembers(g, "belt1Lattice", [...panel5.posts, ...panel5.bars]),
    segmentMembers(g, "belt2Lattice", [...panel11.posts, ...panel11.bars]),
  ]);

  // Above the 2nd floor, the gap between this leg and the next.
  const gap = gapLattice(g);
  const gapCrosses = merge(g, "legGapCrosses", [
    edges(gap, "CrossA", 1, 1, (_s, k) => k <= 4),
    edges(gap, "CrossB", -1, 1, (_s, k) => k <= 4),
  ]);
  const gapHorizontals = edges(gap, "Horizontals", 1, 0, (_s, k) => k >= 1 && k <= 5);

  const four = (id: string, h: NodeHandle) => copyToQuadrants(g, id, h, quads);
  // Edge-rule members carry their faces' normals, which the copy must turn.
  const fourMembers = (id: string, h: NodeHandle) => copyMembersToQuadrants(g, id, h, quads);
  const laced = { lacingStep: LACING_STEP };
  const diagonals = { upright: MEMBERS.upright, reach: JOINT_REACH.diagonal, kinks: true };
  const across = { upright: MEMBERS.upright, reach: JOINT_REACH.horizontal, kinks: true };
  const horizontalWeb = webMembers(
    g,
    "legHorizontal",
    fourMembers(
      "legHorizontals4",
      merge(g, "legHorizontalsAll", [horizontals, p10Chord]),
    ),
    legHorizontalTable(),
    detail,
    across,
    laced,
  );
  // The entretoises: "600" [sourced PL-VIII Fig. 1], laced as the 600s.
  // They meet b and d along the leg's diagonal, square to neither face of
  // the box: its corner stands r sqrt 2 out from the axis that way.
  const entretoiseWeb = webMembers(
    g,
    "legEntretoise",
    fourMembers("legEntretoises4", entretoises),
    [
      [0, ENTRETOISE.width / 2],
      [320, ENTRETOISE.width / 2],
    ],
    detail,
    {
      ...across,
      uprightAt: mul(ramp(component(position(), 1), MEMBERS.upright), Math.SQRT2),
      endFlags: true,
    },
    laced,
  );
  // The legs' 500 diagonals in panels 12-17 are laced by panel, more
  // openly than the shaft's (LEG_LACING_500).
  const bracingWeb = webMembers(
    g,
    "legBracing",
    fourMembers("legBracing4", merge(g, "legCrosses", [...crosses, p10Crosses])),
    MEMBERS.web,
    detail,
    diagonals,
    {
      ...laced,
      lacingBands: LEG_LACING_500.map(([lo, hi, step]) => ({ from: node(lo).y, to: node(hi).y, step })),
    },
  );
  const postWeb = webMembers(
    g,
    "legPost",
    fourMembers("legPosts4", centralPosts(g)),
    MEMBERS.web,
    detail,
    undefined,
    laced,
  );
  // The gap X of panel 16 meets b and d at a sine of about 0.17; the
  // default clamp (0.25) would leave its joint rivets inside them.
  const gapBracingWeb = webMembers(
    g,
    "legGapBracing",
    fourMembers("legGapBracing4", gapCrosses),
    MEMBERS.web,
    detail,
    { ...diagonals, minSine: 0.1 },
    laced,
  );
  const gapHorizontalWeb = webMembers(
    g,
    "legGapHorizontal",
    fourMembers("legGapHorizontals4", gapHorizontals),
    MEMBERS.horizontal,
    detail,
    across,
    laced,
  );

  const lower4 = four("legUprights4", uprights);
  const upper4 = four("legUprightsUpper4", uprightsUpper);
  const seams =
    detail.rivets === true
      ? [
          {
            name: "leg.uprights",
            spawn: seamRivets(g, "legUpright", lower4, MEMBERS.uprightBelow, [1, 0, 0], {
              ...UPRIGHT_SEAMS,
              keep: seamKeep(),
            }),
          },
          {
            name: "leg.uprights.upper",
            spawn: seamRivets(g, "legUprightUpper", upper4, MEMBERS.uprightAbove, [1, 0, 0], {
              ...UPRIGHT_SEAMS,
              skipStart: true,
              keep: seamKeep(),
            }),
          },
        ]
      : [];
  const webs = [
    horizontalWeb,
    entretoiseWeb,
    bracingWeb,
    postWeb,
    gapBracingWeb,
    gapHorizontalWeb,
  ];
  const plates = (id: string, list: readonly SegmentMember[], width: number, thickness: number) =>
    flatBars(g, id, fourMembers(`${id}4`, segmentMembers(g, id, list)), width, thickness);
  return {
    uprights: [
      skin(g, "legUprightSkin", lower4, MEMBERS.uprightBelow, [1, 0, 0]),
      skin(g, "legUprightUpperSkin", upper4, MEMBERS.uprightAbove, [1, 0, 0]),
    ],
    horizontals: [...horizontalWeb.meshes, ...entretoiseWeb.meshes, ...gapHorizontalWeb.meshes],
    bracing: [...bracingWeb.meshes, ...postWeb.meshes, ...gapBracingWeb.meshes],
    girders: [
      faceSkin(g, "legBelt", fourMembers("legBelts4", belts), MEMBERS.beltBar),
      // The belts' chord plates: panel 5's "500 x 10", panel 11's "450 x 8".
      plates("legBelt5Chords", panel5.chords, LEG_BELTS.belt1Chord, LEG_BELTS.belt1ChordThickness),
      plates("legBelt11Chords", panel11.chords, LEG_BELTS.belt2Chord, LEG_BELTS.belt2ChordThickness),
      // Panel 10's band: "300 x 5" flats, one layer each way.
      plates("legBand10Up", band.up, LEG_BELTS.band10Flat, LEG_BELTS.band10FlatThickness),
      plates("legBand10Down", band.down, LEG_BELTS.band10Flat, LEG_BELTS.band10FlatThickness),
      // Panel 4's Masque, on the faces that lie in the tower's faces.
      ...masque(g).map(({ paths, width, thickness }, i) =>
        flatBars(g, `legMasque${i}`, fourMembers(`legMasque${i}x4`, paths), width, thickness),
      ),
    ],
    gussets: gussetMeshes(webs),
    rivets: [
      ...seams,
      ...rivetOutputs({
        "leg.horizontals": horizontalWeb,
        "leg.entretoises": entretoiseWeb,
        "leg.bracing": bracingWeb,
        "leg.posts": postWeb,
        "leg.gap.bracing": gapBracingWeb,
        "leg.gap.horizontals": gapHorizontalWeb,
      }),
    ],
  };
}
