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
 *   3.36268), a double lattice between and a gusset at each post's
 *   mid-height, all flats as wide as drawn (PL-VII Figs 1-2);
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
 *   panels 1-3, 6 and 7, 1.20 wide and 0.7156 deep (PL-VIII Figs 1, 8),
 *   opened where the lifts cross its line;
 * - below panel 1, the base ties ("entretoises inférieures"), X-braced: A
 *   on the outer faces, its bottom chord 2.987 below XXVIII in the plane,
 *   B on the inner faces, 1.600; their chords are 0.22 plates, the top one
 *   just above XXVIII, where no horizontal is (PL-VII Figs 1, 5).
 *
 * The uprights change section at XVII (0.87 -> 0.50) as a STEP, so each is
 * two chains, split there, each skinned and riveted from its own table.
 */
import {
  type Field,
  type Graph,
  type NodeHandle,
  component,
  filterByExpression,
  ge,
  index,
  lt,
  mod,
  mul,
  position,
  ramp,
} from "pcg-ts";
import {
  END_SINE,
  END_SINE_MIN,
  type Lattice,
  type Level,
  type SegmentMember,
  type Vec3,
  chains,
  copyMembersToQuadrants,
  copyToQuadrants,
  edges,
  merge,
  placedLattice,
  segmentMembers,
  skin,
  squareRing,
  stationLattice,
} from "./lattice.js";
import { CROSS_PLATE, type CrossPlate, type Detail, type Parts } from "./parts.js";
import {
  CROSS_RIVETS,
  CROSS_THICK,
  type Crossing,
  crossFootprints,
  crossPlateSets,
  latticeCrossings,
  turnFootprints,
} from "./crossing.js";
import {
  ENTRETOISE,
  LEG_BELTS,
  LEG_GAP_LACING_500,
  LEG_LACING_500,
  MASQUE,
  MEMBERS,
  NODES,
  type NodeLevel,
  node,
  profileAt,
  tableAt,
} from "./spec.js";
import {
  JOINT_ENDS,
  JOINT_PITCH,
  JOINT_REACH,
  LACING_STEP,
  UPRIGHT_SEAMS,
  faceSkin,
  flatBars,
  gussetMeshes,
  lineRivets,
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
 * A base tie under panel 1 on the given faces (PL-VII Figs 1, 5): X-braced
 * bays between its bottom chord, `depth` below node XXVIII, and its top
 * chord, whose axis stands `LEG_BELTS.tieTopChordAxis` above XXVIII in the
 * plane (both chords are plates: `tieChords`). Joints on both chords every
 * `pitch` from the face's centre line, or, with a `phase`, `phase` either
 * side of it and every `pitch` beyond (tie A's flank the central post, and
 * the bay across the post carries no X); an X in every other bay and in
 * the two short end bays against the uprights. The stations are fractions
 * of the face, so the bays lean with the leg and the X's read skewed, as
 * drawn. No bar up a joint: PL-VII draws none.
 */
function tie(
  g: Graph,
  id: string,
  faces: readonly number[],
  pitch: number,
  depth: number,
  phase = 0,
): NodeHandle {
  const top = node("XXVIII");
  const width = top.outer - top.inner;
  const offsets: number[] = [];
  for (let k = -20; k <= 20; k++) {
    if (phase <= 0) offsets.push(k * pitch);
    else if (k >= 0) offsets.push(phase + k * pitch, -(phase + k * pitch));
  }
  // Joints at least 0.3 m clear of the uprights' axes.
  const ts = [0];
  for (const o of offsets) {
    const t = 0.5 + o / width;
    if (t > 0.3 / width && t < 1 - 0.3 / width) ts.push(t);
  }
  ts.sort((a, b) => a - b);
  const lat = stationLattice(g, {
    id,
    ring: faceRing(faces, ts),
    closed: false,
    levels: [legLevel(levelAt(top.y - depth)), legLevel(levelAt(tieTop()))],
  });
  // The bay across the face's centre line, when the joints flank it: rule
  // A's bar leaves its left joint, rule B's its right one.
  const perFace = ts.length;
  const left = phase > 0 ? ts.findIndex((t) => Math.abs(t - (0.5 - phase / width)) < 1e-9) : -2;
  return merge(g, `${id}All`, [
    edges(lat, "BarsA", 1, 1, (s) => s % perFace !== left),
    edges(lat, "BarsB", -1, 1, (s) => s % perFace !== left + 1),
  ]);
}

/** The ties' top chord's axis: `tieTopChordAxis` above XXVIII in the plane. */
function tieTop(): number {
  const y = node("XXVIII").y;
  return y + vertical(LEG_BELTS.tieTopChordAxis, faceSlopes(y - 1).outer);
}

/**
 * The ties' chords, as plates in the face planes butting against the
 * uprights' faces (PL-VII Figs 1, 5): the top chord on all four faces (A's
 * and B's are the same plate, "200 x 8" / "200 x 9" with an angle), and
 * each tie's bottom chord on its own two faces, A's 2.987 and B's 1.600
 * below XXVIII in the plane.
 */
function tieChords(): { top: SegmentMember[]; a: SegmentMember[]; b: SegmentMember[] } {
  const xxviii = node("XXVIII").y;
  const s1 = faceSlopes(xxviii - 1);
  const yA = xxviii - vertical(LEG_BELTS.tieOuterDepth, s1.outer);
  const yB = xxviii - vertical(LEG_BELTS.tieInnerDepth, s1.inner);
  const yT = tieTop();
  const at = (faces: readonly number[], y0: number, bottom: boolean): SegmentMember[] => {
    const out: SegmentMember[] = [];
    for (const f of faces) {
      const pl = facePlane(f, y0, yT);
      const v = bottom ? 0 : pl.H;
      const seg = pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, tableAt(MEMBERS.upright, xxviii));
      if (seg !== undefined) out.push({ a: pl.world(seg[0]), b: pl.world(seg[1]), n: pl.n });
    }
    return out;
  };
  return { top: at([0, 1, 2, 3], yA, false), a: at([3, 0], yA, true), b: at([1, 2], yB, true) };
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
 * How far each of a belt's two bar families stands off the face plane, one
 * each way, so that no two crossing flats share a plane [estimated].
 */
const BAR_LAYER = 0.005;
/** A belt gusset's clearance past an upright's face, where it is slid clear [estimated]. */
const GUSSET_CLEAR = 0.02;

/** A girder belt's members: posts, the two bar families, chords, gussets (both sides). */
interface GirderBelt {
  readonly posts: SegmentMember[];
  readonly up: SegmentMember[];
  readonly down: SegmentMember[];
  readonly chords: SegmentMember[];
  readonly gussets: SegmentMember[];
}

/**
 * A girder belt filling a panel between two chord plates `chord` wide whose
 * outer edges lie on the panel's node lines: posts square to the chords
 * every `pitch` from the tower's axis, running over the bottom chord's web
 * to its edge angle's toe and stopping on the top chord's inner edge
 * ({@link beltPostsOf}); a double lattice whose bars start every `barPitch` and each run
 * `span` along the chords, their working lines node line to node line
 * (PL-VII prints panel 11's angle "55°49′49″", atan(4.95368 / 3.36268)),
 * the bars themselves ending on the chords' axes, the rivet lines; and at
 * each post's mid-height a gusset plate `gusset` (width, height) either
 * side of the lattice, slid along the chords clear of an upright it would
 * reach. Everything is clipped short of the uprights; a post shorter than
 * half the depth is dropped, and a post that does not reach mid-height
 * takes no gusset. The two bar families stand `BAR_LAYER` off the plane,
 * one each way; the posts in it.
 */
function girderBelt(
  y0: number,
  y1: number,
  chord: number,
  pitch: number,
  barPitch: number,
  span: number,
  gusset: readonly [number, number],
): GirderBelt {
  const r = uprightHalf(y0, y1);
  const margin = r + POST_CLEAR;
  const postsOf = (pl: FacePlane) => beltPostsOf(pl, chord, pitch, margin);
  const posts = onFaces(y0, y1, postsOf);
  const bars = (dir: 1 | -1) =>
    onFaces(
      y0,
      y1,
      (pl) =>
        family(barPitch, dir > 0 ? 0 : pl.H, [span, dir * pl.H]).map((l) =>
          pl.clip(l.p, l.d, chord / 2, pl.H - chord / 2, margin),
        ),
      dir * BAR_LAYER,
    );
  // The chords butt against the uprights' faces.
  const chords = onFaces(y0, y1, (pl) =>
    [chord / 2, pl.H - chord / 2].map((v) => pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, r)),
  );
  const [gw, gh] = gusset;
  const gussetOff = LEG_BELTS.beltFlatThickness / 2 + BAR_LAYER + LEG_BELTS.beltGussetThickness / 2 + 0.001;
  const gussets = (side: 1 | -1) =>
    onFaces(
      y0,
      y1,
      (pl) => {
        const mid = pl.H / 2;
        return postsOf(pl).map((post) => {
          if (post === undefined || post[0][1] > mid || post[1][1] < mid) return undefined;
          const u = post[0][0];
          // How far the plate must slide off each upright: its edge
          // GUSSET_CLEAR past the upright's face at both its ends.
          let away = 0;
          let back = 0;
          for (const v of [mid - gh / 2, mid + gh / 2]) {
            const across = pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, 0);
            if (across === undefined) continue;
            away = Math.max(away, gw / 2 + r + GUSSET_CLEAR - (u - across[0][0]));
            back = Math.max(back, gw / 2 + r + GUSSET_CLEAR - (across[1][0] - u));
          }
          const c = u + away - back;
          return [
            [c, mid - gh / 2],
            [c, mid + gh / 2],
          ] as [UV, UV];
        });
      },
      side * gussetOff,
    );
  return { posts, up: bars(1), down: bars(-1), chords, gussets: [...gussets(1), ...gussets(-1)] };
}

/**
 * Panel 5's belt (PL-VII Fig. 1): "500 x 10" chord plates on the node lines
 * XXIV and XXIII, posts square to them on the grande poutre's 3.8825 grid,
 * and bars from a post's foot through the next post's mid-height to the
 * top of the one after (so crossing at the posts' mid-heights and at the
 * quarter depths between). The chords take the place of the node
 * horizontals at XXIV and XXIII.
 */
function belt1(): GirderBelt {
  const P = LEG_BELTS.belt1PostPitch;
  return girderBelt(node("XXIV").y, node("XXIII").y, LEG_BELTS.belt1Chord, P, P, 2 * P, LEG_BELTS.belt1Gusset);
}

/**
 * Panel 11's belt (PL-VII Fig. 2): "450 x 8" chord plates on the node lines
 * XVIII and XVII, posts square to them every 3.36268 from the tower's axis,
 * and bars every half pitch, each spanning one pitch: post foot to the next
 * post's top (an X in every bay) and mid-bay to mid-bay through the posts'
 * mid-heights (the diamond). The chords take the place of the node
 * horizontals at XVIII and XVII.
 */
function belt2(): GirderBelt {
  const P = LEG_BELTS.belt2PostPitch;
  return girderBelt(node("XVIII").y, node("XVII").y, LEG_BELTS.belt2Chord, P, P / 2, P, LEG_BELTS.belt2Gusset);
}

/**
 * A belt's posts on one face, square to the chords every `pitch` from the
 * tower's axis. At the BOTTOM chord a post runs on over the web to the
 * edge angle's toe, `toe` in from the chord's outer edge, as PL-X Figs 14,
 * 17 and PL-XII Fig. 1 draw it ("Corn: 80x80x8" riveted on the "Ame de
 * 500x10", 2 lines of 4), rather than butting on the web's inner edge. At
 * the TOP chord it still stops on the inner edge: both top chords lie in a
 * floor deck ({@link TOP_CHORD_IN_DECK}), and running the post on there
 * put 48 of panel 5's 64 and all 48 of panel 11's into the slabs
 * [measured]. One shorter than half the clear depth is dropped as before.
 */
function beltPostsOf(pl: FacePlane, chord: number, pitch: number, margin: number): Array<[UV, UV] | undefined> {
  const D = pl.H - 2 * chord;
  const toe = beltJoints(chord).toe;
  return family(pitch, toe, [0, 1]).map((l) => pl.clip(l.p, l.d, toe, pl.H - chord, margin, D / 2));
}

/**
 * The belts' and ties' chord rivets [sourced PL-X Figs 2, 7, 14-17; PL-XII
 * Figs 1, 4]. NO PLATE: every lattice member of the ties and of panels 5
 * and 11 rivets straight onto its chord's web ("Attache sur âme"), and the
 * only gussets these girders carry are the posts' mid-height plates and
 * the upright's own at a chord's end. So what a chord lacks is rivets:
 *
 *   - its EDGE ROW, one line through the edge angle along the chord's
 *     outer edge, `inset` in, every `pitch`, on both faces, stopping
 *     `endClear` short of the uprights' faces;
 *   - a LAP GROUP where each member lands: two lines of rivets `gauge`
 *     either side of the member's axis, the first `endClear` off the web's
 *     inner edge, then every `pitch` toward the outer edge, `count` a line
 *     at most and never nearer the member's own end than `onMember`; heads
 *     on the member's two faces.
 *
 * A chord whose outer edge lies inside a floor deck (panel 5's at XXIII,
 * panel 11's at XVII) takes none: its rows would sit in the slab.
 *
 * Every spacing is read off the drawings at 1:50 (0.2365 scan px per mm,
 * checked on Fig. 17's printed "3,8825", the "500" web and PL-XII's
 * "1,681.3"). A bar's drawn group runs on toward the angle's toe, past the
 * chord's axis where the model's bars end, so a bar takes as many of its
 * drawn heads as fit between the web's inner edge and the axis: 3 of
 * panel 5's 4-5 and 3 of panel 11's 5 (running the bars on is not built:
 * at the toe they close on the post's own group at the V).
 */
export interface BeltJoints {
  /** The edge angle's toe, in from the chord's outer edge; a post runs on to it. */
  readonly toe: number;
  readonly edge: { readonly pitch: number; readonly inset: number; readonly endClear: number };
  readonly post: { readonly gauge: number; readonly pitch: number; readonly count: number };
  readonly bar: { readonly gauge: number; readonly pitch: number; readonly count: number };
}
/** Lap groups' shared margins [estimated; the first head 30-40 mm off the inner edge, measured]. */
export const LAP_ROWS = { endClear: 0.035, onMember: 0.03 } as const;
/**
 * Panel 5 (PL-X Figs 14, 17) [measured]: the toe 108-118 in; the edge row
 * 51-65 in and 31 heads over the 3,8825 bay (0.129; local 131-139); posts
 * 2 lines of 4, the lines 91-96 apart, pitch 92-107; bars 2 lines of 4-5,
 * 100-108 apart, pitch 105-117 along the bar.
 */
export const BELT5_JOINTS: BeltJoints = {
  toe: 0.113,
  edge: { pitch: 0.129, inset: 0.06, endClear: 0.12 },
  post: { gauge: 0.047, pitch: 0.1, count: 4 },
  bar: { gauge: 0.052, pitch: 0.11, count: 5 },
};
/**
 * Panel 11 (PL-XII Fig. 1) [measured]: the toe about 100 in; the edge row
 * 48-51 in, pitch 128 on the BOTTOM chord over 13 pitches (the top chord,
 * not riveted here, reads 146 over 20); posts 2 lines of 4, 93 apart,
 * pitch 68-108 (irregular; 0.08 taken); bars 2 lines of 5, 92-95 apart,
 * pitch about 75.
 */
export const BELT11_JOINTS: BeltJoints = {
  toe: 0.1,
  edge: { pitch: 0.128, inset: 0.05, endClear: 0.12 },
  post: { gauge: 0.046, pitch: 0.08, count: 4 },
  bar: { gauge: 0.047, pitch: 0.075, count: 5 },
};
/** A belt's joint spacings, by its chord's width (the two belts' chords differ). */
const beltJoints = (chord: number): BeltJoints => (chord === LEG_BELTS.belt1Chord ? BELT5_JOINTS : BELT11_JOINTS);
/**
 * The ties (PL-X Figs 2, 7 at 1:10, calibrated on the printed "200")
 * [measured]: the edge row 38-39 in, pitch 130-133.
 */
export const TIE_EDGE_ROW = { pitch: 0.13, inset: 0.04 } as const;
/**
 * A tie bar's two rivets sit at fixed DEPTHS in the web, whatever the
 * bar's angle: Fig. 2 prints "42" below the working line where a joint's
 * two bars meet ("70" from the outer edge) and "58" beyond that, the
 * second "30" off the web's inner edge; Fig. 7 prints "112" to the first
 * line and draws the second at 166-172 [sourced]. The pitch ALONG the bar
 * follows: Fig. 2's "64,5" (measured 68-69) on its steep bars, Fig. 7's
 * "100" on its shallow one, both 58 / sin of the bar's angle.
 *
 * The model's working line is the chord's AXIS, 110 in on its 0.22, not
 * 70: its bars meet there. Taken from the outer edge (112, 170) the first
 * heads of a joint's two bars then sat 12-30 mm apart, a head being 38
 * [measured: 320 pairs]. So the depths are taken as drawn FROM THE WORKING
 * LINE: the first `fromApex` past it, the second `pitch` beyond but no
 * nearer the inner edge than `innerClear` — 152 and 190 in, the second
 * held 20 mm short of the drawn 58 by the model's narrower web below its
 * axis (110 against 130). On a steep bar that leaves the two heads
 * under `minPitch` apart along it (a head is 38 across; measured: 9
 * pairs), so the second is pushed on to it; the drawn pitch is never less
 * than 64.5.
 */
export const TIE_LAP = { fromApex: 0.042, pitch: 0.058, innerClear: 0.03, minPitch: 0.042 } as const;

/** One rivet row in a face's (u, v): `n` heads from `from` along `dir`, `off` along the face normal. */
interface RivetRow {
  readonly from: UV;
  readonly dir: UV;
  readonly n: number;
  readonly off: number;
}

/** Rows as the two-point lines `lineRivets` resamples at `pitch`, each head's axis out of its own face. */
function rowMembers(pl: FacePlane, rows: readonly RivetRow[], pitch: number): SegmentMember[] {
  return rows.map((r) => {
    // 0.1 mm short of (n - 1) pitches, so spacing mode lands n samples and no
    // remainder: a relative shortfall below f32's epsilon lands an n + 1-th
    // head on top of the last one (measured: 96 of them).
    const L = (r.n - 1) * pitch - 1e-4;
    const l = Math.hypot(r.dir[0], r.dir[1]);
    const b: UV = [r.from[0] + (r.dir[0] / l) * L, r.from[1] + (r.dir[1] / l) * L];
    return { a: pl.world(r.from, r.off), b: pl.world(b, r.off), n: r.off >= 0 ? pl.n : scale3(pl.n, -1) };
  });
}

/** Both faces of a member lying `layer` off the plane, `thick` thick. */
const faces2 = (layer: number, thick: number): [number, number] => [layer + thick / 2, layer - thick / 2];

/**
 * A girder belt's chord rivets (see {@link BeltJoints}): its members
 * rebuilt exactly as {@link girderBelt} builds them, each landing read in
 * the chord's own face frame.
 */
function beltRivets(
  y0: number,
  y1: number,
  chord: number,
  chordThick: number,
  pitch: number,
  barPitch: number,
  span: number,
  topInDeck: boolean,
): { edge: SegmentMember[]; posts: SegmentMember[]; bars: SegmentMember[] } {
  const J = beltJoints(chord);
  const r = uprightHalf(y0, y1);
  const margin = r + POST_CLEAR;
  const T = LEG_BELTS.beltFlatThickness;
  const edge: SegmentMember[] = [];
  const posts: SegmentMember[] = [];
  const bars: SegmentMember[] = [];
  for (let f = 0; f < 4; f++) {
    const pl = facePlane(f, y0, y1);
    // The chords riveted: (axis v, outer-edge v, the sign pointing into the belt).
    const chords: Array<{ axis: number; outer: number; s: 1 | -1 }> = [{ axis: chord / 2, outer: 0, s: 1 }];
    if (!topInDeck) chords.push({ axis: pl.H - chord / 2, outer: pl.H, s: -1 });
    const eRows: RivetRow[] = [];
    const pRows: RivetRow[] = [];
    const bRows: RivetRow[] = [];
    for (const c of chords) {
      const v = c.outer + c.s * J.edge.inset;
      // Inside both the chord (clipped at its axis) and the uprights' faces at the row's own height.
      const seg = pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, r);
      const own = pl.clip([0, c.axis], [1, 0], c.axis - 1e-6, c.axis + 1e-6, r);
      if (seg !== undefined && own !== undefined) {
        // endClear, not inset, off the uprights: the ADJACENT face's joint
        // gusset at the corner reaches 0.45 along this face (measured: 16
        // heads through it at 0.06).
        const u0 = Math.max(seg[0][0], own[0][0]) + J.edge.endClear;
        const u1 = Math.min(seg[1][0], own[1][0]) - J.edge.endClear;
        const n = Math.floor((u1 - u0) / J.edge.pitch) + 1;
        for (const off of faces2(0, chordThick)) eRows.push({ from: [u0, v], dir: [1, 0], n, off });
      }
      // A landing: a member's end on this chord, the member running into
      // the belt along D, riveted with `k`'s lines into `rows`.
      const land = (end: UV, D: UV, layer: number, k: BeltJoints["post"], rows: RivetRow[]) => {
        const P: UV = [-D[1], D[0]];
        for (const g of [-k.gauge, k.gauge]) {
          // Along the member from its end: the first head `endClear` short
          // of the web's inner edge, then back toward the end.
          const inner = c.axis + (c.s * chord) / 2 - c.s * LAP_ROWS.endClear;
          const base: UV = [end[0] + g * P[0], end[1] + g * P[1]];
          const tTop = (inner - base[1]) / D[1];
          const n = Math.min(k.count, Math.floor((tTop - LAP_ROWS.onMember) / k.pitch + 1e-9) + 1);
          if (n < 2) continue;
          const from: UV = [base[0] + tTop * D[0], base[1] + tTop * D[1]];
          for (const off of faces2(layer, T)) rows.push({ from, dir: [-D[0], -D[1]], n, off });
        }
      };
      const on = (p: UV, at: number) => Math.abs(p[1] - at) < 1e-6;
      // A post ends at the bottom chord's toe (beltPostsOf).
      const postEnd = c.s > 0 ? J.toe : pl.H - chord;
      for (const post of beltPostsOf(pl, chord, pitch, margin)) {
        if (post === undefined) continue;
        for (const [end, other] of [[post[0], post[1]], [post[1], post[0]]] as const) {
          if (on(end, postEnd)) land(end, unitUV([other[0] - end[0], other[1] - end[1]]), 0, J.post, pRows);
        }
      }
      for (const dir of [1, -1] as const) {
        for (const l of family(barPitch, dir > 0 ? 0 : pl.H, [span, dir * pl.H])) {
          const bar = pl.clip(l.p, l.d, chord / 2, pl.H - chord / 2, margin);
          if (bar === undefined) continue;
          for (const [end, other] of [[bar[0], bar[1]], [bar[1], bar[0]]] as const) {
            if (on(end, c.axis)) land(end, unitUV([other[0] - end[0], other[1] - end[1]]), dir * BAR_LAYER, J.bar, bRows);
          }
        }
      }
    }
    edge.push(...rowMembers(pl, eRows, J.edge.pitch));
    posts.push(...rowMembers(pl, pRows, J.post.pitch));
    bars.push(...rowMembers(pl, bRows, J.bar.pitch));
  }
  return { edge, posts, bars };
}

/**
 * The tie laps' rows are each exactly their two heads, so they are spawned
 * at a spacing longer than any of them (at most 0.07 m): a resample in
 * spacing mode lands the start and the true endpoint and nothing between.
 */
const TIE_LAP_SPAWN = 1;

const pointUV = (p: UV, d: UV, t: number): UV => [p[0] + t * d[0], p[1] + t * d[1]];

const unitUV = (d: UV): UV => {
  const l = Math.hypot(d[0], d[1]);
  return [d[0] / l, d[1] / l];
};

/**
 * The base ties' chord rivets: each tie bar ("70 x 70 x 8") laps onto its
 * chord's web with TWO rivets on its axis (PL-X Figs 2, 7, "Barres de
 * treillis — Attache sur âme"), and each chord carries its edge row
 * through the "Corn 80x80x10" along its outer edge. The bars are rebuilt
 * exactly as {@link tie} places them. Nothing is put where the central
 * post stands: it crosses both chords there, and a head at the web would
 * sit inside its box.
 */
function tieRivets(): { edge: SegmentMember[]; lap: SegmentMember[] } {
  const top = node("XXVIII");
  const width = top.outer - top.inner;
  const s1 = faceSlopes(top.y - 1);
  const yT = tieTop();
  const yA = top.y - vertical(LEG_BELTS.tieOuterDepth, s1.outer);
  const r = tableAt(MEMBERS.upright, top.y);
  const half = LEG_BELTS.tieChord / 2;
  const thick = LEG_BELTS.tieChordThickness;
  const bar = MEMBERS.beltBar;
  const postHalf = tableAt(MEMBERS.web, top.y) + 0.02;
  const edge: SegmentMember[] = [];
  const lap: SegmentMember[] = [];
  const station = (uv: readonly [number, number], y: number): Vec3 => {
    const p = profileAt(y);
    return [p.inner + (p.outer - p.inner) * uv[0], y, p.inner + (p.outer - p.inner) * uv[1]];
  };
  const specs = [
    { faces: [3, 0], pitch: LEG_BELTS.tieOuterPitch, depth: vertical(LEG_BELTS.tieOuterDepth, s1.outer), phase: LEG_BELTS.tieOuterPhase },
    { faces: [1, 2], pitch: LEG_BELTS.tieInnerPitch, depth: vertical(LEG_BELTS.tieInnerDepth, s1.inner), phase: 0 },
  ];
  for (const sp of specs) {
    const offsets: number[] = [];
    for (let k = -20; k <= 20; k++) {
      if (sp.phase <= 0) offsets.push(k * sp.pitch);
      else if (k >= 0) offsets.push(sp.phase + k * sp.pitch, -(sp.phase + k * sp.pitch));
    }
    const ts = [0];
    for (const o of offsets) {
      const t = 0.5 + o / width;
      if (t > 0.3 / width && t < 1 - 0.3 / width) ts.push(t);
    }
    ts.sort((a, b) => a - b);
    const ring = faceRing(sp.faces, ts);
    const perFace = ts.length;
    const left = sp.phase > 0 ? ts.findIndex((t) => Math.abs(t - (0.5 - sp.phase / width)) < 1e-9) : -2;
    const yB = top.y - sp.depth;
    // The bars, as (face, bottom end, top end).
    const bars: Array<{ f: number; lo: Vec3; hi: Vec3 }> = [];
    for (let s = 0; s + 1 < ring.length; s++) {
      if (s % perFace !== left) bars.push({ f: sp.faces[Math.floor(s / perFace)]!, lo: station(ring[s]!, yB), hi: station(ring[s + 1]!, yT) });
    }
    for (let s = 1; s < ring.length; s++) {
      if (s % perFace !== left + 1) bars.push({ f: sp.faces[Math.floor((s - 1) / perFace)]!, lo: station(ring[s]!, yB), hi: station(ring[s - 1]!, yT) });
    }
    for (const f of sp.faces) {
      // Two planes: the bottom chord's, and the top chord's (built from A's depth on every face).
      const planes = [
        { pl: facePlane(f, yB, yT), y0: yB, axisAtTop: false },
        { pl: facePlane(f, yA, yT), y0: yA, axisAtTop: true },
      ];
      for (const { pl, y0, axisAtTop } of planes) {
        const F = pl.H / (yT - y0);
        const toUV = (p: Vec3): UV => [f === 0 || f === 2 ? p[0] : p[2], (p[1] - y0) * F];
        const axis = axisAtTop ? pl.H : 0;
        const sgn = axisAtTop ? -1 : 1; // into the tie
        const centre = toUV(faceCentre(f, y0 + axis / F))[0];
        const span = pl.clip([0, axis], [1, 0], axis - 1e-6, axis + 1e-6, r);
        if (span === undefined) continue;
        // Clear of both uprights' faces AT the head's own height (the leg
        // leans, so the chord's ends move out below its axis), and of the post.
        const clear = (u: number, v: number) => {
          const at = pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, r + 0.03);
          const lo = Math.max(span[0][0], at === undefined ? Infinity : at[0][0]) + 0.02;
          const hi = Math.min(span[1][0], at === undefined ? -Infinity : at[1][0]) - 0.02;
          return u > lo && u < hi && Math.abs(u - centre) > postHalf;
        };
        const eRows: RivetRow[] = [];
        // The edge row, broken where the post stands.
        const v = axis - sgn * (half - TIE_EDGE_ROW.inset);
        const row = pl.clip([0, v], [1, 0], v - 1e-6, v + 1e-6, r);
        if (row === undefined) continue;
        const u0 = row[0][0] + TIE_EDGE_ROW.inset;
        const u1 = row[1][0] - TIE_EDGE_ROW.inset;
        const us: number[] = [];
        for (let u = u0; u <= u1 + 1e-9; u += TIE_EDGE_ROW.pitch) if (clear(u, v)) us.push(u);
        // Consecutive runs become rows.
        let run: number[] = [];
        const flush = () => {
          if (run.length >= 2) for (const off of [thick / 2, -thick / 2]) eRows.push({ from: [run[0]!, v], dir: [1, 0], n: run.length, off });
          run = [];
        };
        for (const u of us) {
          if (run.length > 0 && u - run[run.length - 1]! > TIE_EDGE_ROW.pitch * 1.5) flush();
          run.push(u);
        }
        flush();
        // The bars landing on this chord: two heads at TIE_LAP's depths past
        // the working line, which is the chord's axis, where each bar ends.
        const d1 = TIE_LAP.fromApex;
        const d2 = Math.min(d1 + TIE_LAP.pitch, half - TIE_LAP.innerClear);
        for (const b of bars) {
          if (b.f !== f) continue;
          const [end, other] = axisAtTop ? [toUV(b.hi), toUV(b.lo)] : [toUV(b.lo), toUV(b.hi)];
          const D = unitUV([other[0] - end[0], other[1] - end[1]]);
          const t1 = d1 / Math.abs(D[1]);
          const from = pointUV(end, D, t1);
          const last = pointUV(end, D, Math.max(d2 / Math.abs(D[1]), t1 + TIE_LAP.minPitch));
          // At an upright the bar lands on the chord-end plate (PL-X Fig. 6),
          // under the post inside its box: neither is this rule's.
          if (!clear(from[0], from[1]) || !clear(last[0], last[1])) continue;
          for (const off of [bar, -bar]) {
            const n = off >= 0 ? pl.n : scale3(pl.n, -1);
            lap.push({ a: pl.world(from, off), b: pl.world(last, off), n });
          }
        }
        edge.push(...rowMembers(pl, eRows, TIE_EDGE_ROW.pitch));
      }
    }
  }
  return { edge, lap };
}

/**
 * Both belts' TOP chords lie mostly inside a floor deck: panel 5's at XXIII
 * (y 56.94-57.40) in the 1st floor's 0.60 slab (57.03-57.63), panel 11's
 * at XVII (115.06-115.50) in the 2nd's (115.13-115.73) [measured: all 16
 * of each intersect the platforms class]. Their edge rows and laps would
 * sit in the slab, so they take none.
 */
const TOP_CHORD_IN_DECK = true;

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

/**
 * How far below XXVIII the base tie's bottom chord lies on face `f`: A's
 * two faces are the outer pair and deeper than B's (PL-VII Figs 1, 5).
 */
const tieDepth = (f: number) => {
  const s = faceSlopes(node("XXVIII").y - 1);
  return f === 0 || f === 3
    ? vertical(LEG_BELTS.tieOuterDepth, s.outer)
    : vertical(LEG_BELTS.tieInnerDepth, s.inner);
};

/** A post's clearance past the member it stands on [estimated, as the joints']. */
const POST_CLEAR = 0.05;

/**
 * The member a central post stands on at node `name` reaches this far past
 * the node line: a node horizontal is centred on it, but the belts' chord
 * plates only touch it (their outer edges lie ON XXIV and XXIII, XVIII and
 * XVII, their bodies inside panels 5 and 11), so those four are 0.
 *
 * Over {@link POST_NODES} — and only over it — zero is therefore also the
 * test for "no horizontal here". It is NOT that test in general: XXVIII
 * carries no horizontal either (PL-VII Figs 1, 5 draw the "877" post
 * continuous through it, and the ties' top chord takes its place), yet
 * this returns 0.4 for it. XXVIII is kept out of the crossing plates by
 * being absent from that list, because a post does not END there; adding
 * it would invent a plate at a crossing that does not exist.
 */
const postSeat = (name: string): number =>
  ["XXIV", "XXIII", "XVIII", "XVII"].includes(name) ? 0 : tableAt(MEMBERS.horizontal, node(name).y);

/**
 * One stretch of a central post, on face f from height y0 to y1, standing
 * on members hw0 deep (below) and hw1 (above) — both lying along the face
 * at those heights, squared to it. Its ends, with the corner beyond it
 * placed at the same heights, so the edge rule reads the face it lies in.
 *
 * WHERE AN END GOES. U is the face's in-plane normal to the horizontal, D
 * the post and B the post's in-plane normal. The leg drifts sideways as it
 * rises, so within the face the post leans away from U — U.D is 0.91 in
 * panel 1, 0.98 in panel 9 — and it therefore meets the horizontal
 * obliquely. Its cap is cut square to D (a swept profile has no other
 * cut), so the cap's two in-plane corners are 2 w |U.B| apart across U:
 * an end placed where the WHOLE cap clears the member leaves the near
 * corner at the clearance and the far one 2 w |U.B| beyond it — 0.38 m of
 * daylight in panel 1, read as a post that stops short. So the end goes
 * where the FAR corner clears, at (hw + clear - w |U.B|) / (U.D), and the
 * near corner buries in the member: the same cut the first floor's outer
 * posts take against b's face, "so no notch shows". The pull-back is
 * capped at hw, so a member with nothing under the node line to bury into
 * — hw = 0, the belts' chord plates, whose faces lie ON it and whose
 * bodies stand inside panels 5 and 11 — keeps the end it always had.
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
  const half = w * Math.abs(dot3(U, Bp));
  const along = (hw: number) => (hw + POST_CLEAR + half - 2 * Math.min(half, hw)) / dot3(U, D);
  return { lo: add3(c0, scale3(D, along(hw0))), hi: sub3(c1, scale3(D, along(hw1))) };
}

/**
 * The central posts: one laced strut up the middle of every leg face,
 * parallel to the uprights, through the base tie, panels 1-4 and 6-9, and
 * panel 10 above its band [sourced PL-IX Fig. 8, PL-VII Figs 1, 2, 5]. Each
 * stretch stops ON the horizontal (or the tie's bottom chord, or the
 * band's top chord) at either end, taking no joint: on the plates those
 * crossings are rosettes, not joints to an upright. A placed lattice of eight stations
 * (corners even, face centres odd), two rows per stretch.
 */
function centralPosts(g: Graph): NodeHandle {
  const h = postSeat;
  type Stretch = { y0: (f: number) => number; y1: number; hw0: number; hw1: number };
  const between = (a: string, b: string): Stretch => ({
    y0: () => node(a).y,
    y1: node(b).y,
    hw0: h(a),
    hw1: h(b),
  });
  const stretches: Stretch[] = [
    // From the tie's bottom chord straight up through its top chord (a
    // plate, no horizontal at XXVIII: PL-VII Figs 1, 5 draw the "877" post
    // continuous there) to XXVII.
    {
      y0: (f) => node("XXVIII").y - tieDepth(f),
      y1: node("XXVII").y,
      hw0: LEG_BELTS.tieChord / 2,
      hw1: h("XXVII"),
    },
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
 * How far a crossing plate reaches past the post's cut cap, along the post
 * [chosen: the set below, so the plate's two margins read as one figure].
 * Across the post it takes no margin at all — see {@link crossingPlates}.
 */
const CROSS_MARGIN = 0.02;

/**
 * The two dimensions a crossing plate is given rather than derives:
 * {@link CrossPlate}, which the page can override. `set` is chosen
 * against the lacing — a strut's lacing runs between its chords' AXES, so
 * its mitred outer surface stands 0.0174 inside the angles' outer face
 * (measured; see `CrossPlate.set` in parts.ts), and the default 0.015
 * clears it by 2.4 mm, so the plate covers the lacing instead of being
 * read through it. `edge` is the half-width across the member, the default
 * being the strut's own.
 */
const crossPlate = (detail: Detail): CrossPlate => ({ ...CROSS_PLATE, ...detail.crossPlate });

/**
 * The nodes a central post ENDS a stretch at, lowest first, the four that
 * carry no horizontal included so {@link postSeat} can drop them. XXVIII is
 * deliberately absent: the post passes through it without stopping, and
 * `postSeat` does not read as 0 there (see its note).
 */
const POST_NODES = ["XXVII", "XXVI", "XXV", "XXIV", "XXIII", "XXII", "XXI", "XX", "XIX", "XVIII"];

/**
 * THE ROSETTES' PLATES. A central post crosses a horizontal at the middle
 * of every leg face, and in panels 1-4 the panel's two diagonals bisect
 * each other at that same point, so the crossing is an eight-armed
 * rosette. Both kinds get a pair of plates, one either side of the
 * lattice, which is what the tower's own drawings put at a crossing: PL-VII
 * Fig. 2's gap X's "central plate", PL-XIV Fig. 5 bis's "2 Goussets 1.130 x
 * 10" where the summit's two diagonal girders cross.
 *
 * A plate is square to the POST, not to the tower. The leg drifts inward
 * as it rises, so the post leans within the face and meets the horizontal
 * at about 66 degrees ({@link postStretch}); a plate laid out vertically
 * would sit askew on every arm it covers.
 *
 * ACROSS the post it takes no margin at all: it is `2 w`, exactly the
 * strut's own width, so its long edges land on the strut's sides and its
 * rivet rows, 0.04 in from them, fall within 5 mm of the chords' axes —
 * which is where a plate's rivets belong, fastening it to the angles
 * rather than to air. ALONG the post it reaches past the far corner of the
 * post's cut cap: that corner stands `hw + POST_CLEAR` past the node line
 * across U, so along the post it is `(hw + POST_CLEAR) / (U.D)`, plus the
 * margin. In panel 1 the plate is 0.80 by 1.03, against the 1.130 PL-XIV
 * prints for the one crossing plate the plates give a size for.
 *
 * WHY THE PLATES AND NOT A BETTER CUT. The cap is cut square to the post
 * (a swept profile has no other cut) and the horizontal is not, so along
 * the cut the joint is open somewhere however the end is placed: putting
 * the near corner in the member (which is what `postStretch` does) leaves
 * the far one standing off it, and the reverse leaves a notch. A plate
 * over the crossing is how the tower closes it.
 *
 * A plate lies UNDER THE CORNERS, not over them: it is set {@link
 * CrossPlate.set} in from the corner angles' outer face, which puts it just
 * ABOVE the lacing. So the angles of all eight arms run over its edges
 * while the plate itself covers the lacing between them, which is what
 * the photographs show and what a gusset in a box section does. One offset
 * serves every arm because the post and the horizontal are both 800 struts
 * squared to the same plane.
 *
 * It also settles who owns the surface. Laid on TOP of the chords the
 * plate shared a plane with every rivet the members already carried there,
 * and about 1,188 of those domes came through it. Set under the angles it
 * is the outermost thing between them, and its own rows are the only
 * rivets on it.
 *
 * WHAT WAS MEASURED, on the cooked tower, over every family in the legs
 * and the shaft. 888 plates and +10,656 triangles, 0.3% of the laced
 * tower; their rivets over four `rivets.*.crossings.<section>` outputs. An
 * independent sweep of the cooked member axes finds 444 places where two
 * laced struts cross in the legs and the shaft: every one takes exactly
 * one pair, 444 x 2 = 888, and no plate stands anywhere that is not one of
 * them. Nothing is missed and nothing is plated twice — which matters most
 * at panels 1-4's mid-panel levels, where a post landing and a span-2 X
 * cross at the same point and could each have claimed it.
 *
 * WHAT IT DOES NOT DO. Read raw, the lacing stands above the inner face
 * of 72 of the 888 plates, above the FRONT of 8, worst 8.1 mm past it at
 * XXI — every one an 800 at the four kinked leg nodes, near a plate's END
 * (|t| / half 0.74 to 1.00); every X crossing, 600 and 500 is clean, and
 * the tightest clearance among the 816 clean plates is 1.57 mm. But the
 * lacing runs chord axis to chord axis, so its ends are inside the corner
 * angles' 90 mm by construction, and so is every point the raw count
 * blames at XXI and XX: the 8 "through" are lacing 2.6 mm under the POST'S
 * OWN angle's outer face, where it blows out past its mitre at the
 * penultimate ring before the cut end (1.6 mm at worst, against 17.4
 * mid-span; the cap itself is at the full 22.5). An angle encloses that,
 * plate or no plate — in THIS model, whose angle is a closed 90 mm square
 * tube drawn opaque. A real angle is an L, open on its inside, so what the
 * box hides is lacing filling the angle's volume, and at XXII much of it
 * is the post's lacing inside the HORIZONTAL's angle: a clash of two
 * members the solid box keeps out of sight, not clearance. Discounting it,
 * 16 plates remain, all at XXII, the
 * lacing inside the plate's own 10 mm (6.17 at worst, 3.8 short of its
 * front) — nothing shows through any plate [all measured]. The cause at
 * XXII is the tilt above: across a half-length the kink lifts the chords'
 * outer face to 0.414 against the 0.400 the plate assumes. The same 128
 * plates are the only ones whose depth is off the set at all, worst
 * 14.3 mm; the other 760 are exact to f32.
 *
 * NO PLATE CAN TAKE THE 16 OUT, and the plane per kink was measured
 * rather than assumed. The steel under a XXII plate is not one plane
 * within the 7.4 mm between the lacing (17.4) and a flush plate (10): the
 * horizontal lies in the panel ABOVE and covers the plate to within 0.07
 * of both ends, the post below lies in the panel below, and where the
 * post's buried end passes under the horizontal's lower chord the two
 * faces stand 21 mm apart — at one such point the post's lacing is 2.3 mm
 * under the horizontal's chord face, so no plate of ANY shape is flush
 * there and clear of it. Solved per plate (each of a pair its own plane,
 * minimax against the cooked angles and lacing), the best flat plane at
 * XXII leaves a window of -1.5 to 3.6 mm where 10 is needed, and the best
 * plate bent on a line parallel to the horizontal gains 1 mm on that. So
 * clearing the lacing costs 11-12 mm proud and 1-2 mm of daylight at XXII
 * — visible, where the lacing inside the plate is not — and a plane solved
 * from the members' planes rather than the mesh costs 16 and 6. At XXI and
 * XX nothing needs clearing. The bisector stays.
 *
 * The same rule plates the first floor's own laced-strut crossings and the
 * summit's two diagonal girders — whose crossing plate, PL-XIV Fig. 5
 * bis's "2 Goussets 1.130 x 10", is the very thing it is sized against
 * (firstFloor.ts, summit.ts).
 */
function postCrossings(): Crossing[] {
  // Every level a post crosses a horizontal at: the nodes it ends on that
  // carry one, and the mid-panel horizontals of panels 1-4, which it runs
  // straight through (`legLevels`). The mid-panel levels are also where
  // panels 1-4's own diagonals cross, so those four are the eight-armed
  // rosettes and no second plate is built for the X there.
  // A landing: where along the face's centre line the post meets something,
  // and how far past that line the something reaches, which is what the
  // plate has to cover on the far side of the post's cut cap.
  const landings: Array<{ y: (f: number) => number; hw: number }> = [
    // The node horizontals, and the mid-panel horizontals of panels 1-4 —
    // the latter also being where those panels' own X crosses, so they are
    // the eight-armed rosettes and no second plate is built for the X.
    ...POST_NODES.filter((name) => postSeat(name) > 0).map((name) => ({
      y: () => node(name).y,
      hw: postSeat(name),
    })),
    ...legLevels()
      .filter((l) => l.name.startsWith("mid-"))
      .map((l) => ({ y: () => l.y, hw: tableAt(MEMBERS.horizontal, l.y) })),
    // Panel 10's band top chord: a laced post landing on the top chord of
    // the band, with the panel's own X crossing there too.
    { y: () => band10Top(), hw: LEG_BELTS.band10TopChord },
    //
    // NOT the ties' chords or the belts' chord plates at XXIV, XXIII and
    // XVIII, though a post does end on each of them, and not by oversight.
    // They were built once as crossing plates and measured: set under the
    // POST's corner angles, they stood 0.285 to 0.517 m off the flats, which
    // lie in the face plane; 96 in panels 5 and 11 (no central post) had no
    // steel of any kind under them and 64 at XXIII ran through the first
    // floor's deck. And the plates say there is no plate to build: every
    // member of the ties and of panels 5 and 11 rivets straight onto its
    // chord's web ("Barres de treillis — Attache sur âme", PL-X Figs 2, 7;
    // Figs 14-17; PL-XII Fig. 1), the only gussets on those girders being
    // the posts' mid-height plates and the upright's own at a chord's end,
    // and the "877" post crosses the ties' chords at a web SPLICE (PL-X
    // Fig. 9, "C.j. d'âme"), not a gusset. What a chord lacks is its rivets:
    // `beltRivets` and `tieRivets`. Nor could a plate ON the flat reach the
    // post in this model: the post is a hollow box whose corner angles
    // stand 0.31-0.40 m either side of the face plane (0.21-0.30 for panel
    // 10's 600), the flats lie within 40 mm of it, and at XXIV, XXIII and
    // XVIII the post stops POST_CLEAR short of the flat's edge.
  ];
  const out: Crossing[] = [];
  for (const landing of landings) {
    for (let f = 0; f < 4; f++) {
      const y = landing.y(f);
      const hw = landing.hw;
      const w = tableAt(MEMBERS.web, y);
      const at = faceCentre(f, y);
      const H = unit3(sub3(corner(f + 1, y), corner(f, y)));
      // The post's direction either side of the crossing. Within a panel
      // the two are the same line; at a node where the leg turns they are
      // the two stretches meeting there.
      // ONE PLATE, ON THE BISECTOR. Read across a node where the leg turns,
      // the post's direction is the bisector of the two stretches meeting
      // there; within a panel it is just the post.
      //
      // A KINK IS THE ONE THING THIS CANNOT GET RIGHT, and the alternative
      // was built and measured rather than assumed. On the bisector a plate
      // stands off the steel by `half sin(kink / 2)` — 14 mm at XXII, 7 at
      // XXI, 6 at XX, 1 at XIX, nil at the other seven levels — and the two
      // plates of a pair tip OPPOSITE ways, so one sits 8 mm under the
      // angles and its partner 32.
      //
      // Splitting it into a plate per panel, each butting on the node line,
      // cures the post and breaks the horizontal, because a horizontal
      // takes the plane of the panel ABOVE it (`faceNormal` reads k, k + 1):
      // the lower half then stood 19.3 mm off the horizontal at XXII with
      // 5.8 mm of its lacing THROUGH the plate, and the two halves, each
      // square to its own panel, left up to 77.6 mm of daylight at the seam
      // they were meant to butt on [all measured]. The bisector's error is
      // symmetric and smaller, so the bisector stays. A plane solved per
      // plate, and a plate bent parallel to the horizontal, were measured
      // too, and lose to it on what shows (see "NO PLATE CAN TAKE THE 16
      // OUT" above).
      const along = unit3(sub3(faceCentre(f, y + CROSS_STEP), faceCentre(f, y - CROSS_STEP)));
      const n = unit3(cross3(H, along));
      let U = unit3(cross3(n, H));
      if (dot3(U, along) < 0) U = scale3(U, -1);
      out.push({ at, along, n, w, half: (hw + POST_CLEAR) / dot3(U, along) + CROSS_MARGIN });
    }
  }
  return out;
}

/**
 * How far either side of a crossing the post's direction is read. Any
 * distance inside the two panels meeting there gives the same bisector;
 * the shortest leg panel is 5.5 m.
 */
const CROSS_STEP = 0.25;

/**
 * The "entretoises diagonales" of one leg (ENTRETOISE; PL-VIII Figs 1, 8):
 * at each of their nodes a horizontal from d to b, or, at the nodes in
 * `openAt`, two, each from its upright to `openHalf` short of the
 * leg's diagonal, ending free. They carry what an edge rule would write
 * for their joints (the end sines against b's and d's columns) and which
 * of their ends are joints (JOINT_ENDS); their section is squared to the
 * vertical plane through them.
 */
function entretoiseMembers(openAt: readonly string[]): {
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
    if (openAt.includes(name)) {
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

/** The width of each band that fills a Masque corner [estimated: fine against its 1.0 radius]. */
const FILLET_BAND = 0.1;

/**
 * The Masque's rounded top corners (PL-VII Fig. 6), in its face's (u, v):
 * the frame is solid between the top band's lower edge (v = `top`), the
 * screen's side (u = u0 - q v on the inner side, u1 - q v on the outer)
 * and an arc of radius `r` tangent to both. It is filled with concentric
 * bands `band` wide about the arc's centre, the first on the arc, each a
 * polyline of short straight pieces from one edge to the other: the
 * model's flats are boxes, and rings of them follow a curve one plate
 * could not. The corners differ: the uprights lean in the face, so one is
 * acute (about 66 degrees) and the other obtuse.
 */
function masqueFillets(
  u0: number,
  u1: number,
  q: number,
  top: number,
  r: number,
  band: number,
): Array<{ band: number; seg: [UV, UV] }> {
  const out: Array<{ band: number; seg: [UV, UV] }> = [];
  for (const side of [0, 1] as const) {
    const uSide = (v: number) => (side === 0 ? u0 : u1) - q * v;
    const K: UV = [uSide(top), top];
    // Along the top edge into the screen, and down the side.
    const d1: UV = side === 0 ? [1, 0] : [-1, 0];
    const L = Math.hypot(q, 1);
    const d2: UV = [q / L, -1 / L];
    const phi = Math.acos(d1[0] * d2[0] + d1[1] * d2[1]);
    const bl = Math.hypot(d1[0] + d2[0], d1[1] + d2[1]);
    const dK = r / Math.sin(phi / 2);
    const C: UV = [K[0] + ((d1[0] + d2[0]) / bl) * dK, K[1] + ((d1[1] + d2[1]) / bl) * dK];
    const inside = ([u, v]: UV) =>
      v <= top + 1e-9 && (side === 0 ? u >= uSide(v) - 1e-9 : u <= uSide(v) + 1e-9);
    const thK = Math.atan2(K[1] - C[1], K[0] - C[0]);
    for (let k = 0; r + k * band < dK; k++) {
      // The last band stops just short of the corner, so the corner is filled.
      const rho = Math.min(r + (k + 0.5) * band, dK - 0.005);
      const at = (th: number): UV => [C[0] + rho * Math.cos(th), C[1] + rho * Math.sin(th)];
      if (!inside(at(thK))) continue;
      // The run of that circle inside the corner, walked out from the corner's direction.
      const step = 0.002;
      let a = thK;
      let b = thK;
      while (inside(at(a - step)) && thK - a < Math.PI) a -= step;
      while (inside(at(b + step)) && b - thK < Math.PI) b += step;
      // A run too short to hold a flat (the corner's last sliver) is left.
      if (rho * (b - a) < 0.02) continue;
      const n = Math.max(1, Math.ceil((rho * (b - a)) / 0.12));
      for (let i = 0; i < n; i++) {
        out.push({ band: k, seg: [at(a + ((b - a) * i) / n), at(a + ((b - a) * (i + 1)) / n)] });
      }
    }
  }
  return out;
}

/**
 * "Masque placé sur le panneau 4" (PL-VII Fig. 6; numbers in `MASQUE`):
 * on each leg face that lies in a tower face (faces 0 and 3), over the
 * whole of panel 4. Laid out in the face's own coordinates, u along the
 * horizontal (world x on face 0) and v up the plane from panel 4's foot:
 * - a "630" bottom chord just clear of the foot's horizontal, a "750" chord
 *   2.746 clear above it,
 *   a top band under XXIV;
 * - between those two chords a double lattice of flats whose V's meet at
 *   both chords, the 750's on the post grid and the 630's half a pitch
 *   off, each bar spanning 1.5 pitches (45.1 degrees);
 * - above, posts on the decorative girder's 3.8825 rhythm from the tower's
 *   axis, and heavy bars crossing at the posts' mid-heights at 47.5
 *   degrees, each spanning about 1.7 post pitches;
 * - the rounded top corners: the frame filled between the top band, the
 *   screen's side and an arc of `MASQUE.fillet`, as concentric flat bands.
 * Everything is clipped to the face, 0.45 short of the uprights' axes. Flat
 * bars in layers, so that no two crossing plates share a plane; returned
 * as member paths by width.
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
  const slopeUp = Math.tan((M.upperAngle * Math.PI) / 180);
  const upper = (dir: 1 | -1) =>
    ks.map((k) => clip([k * post, (midHi + topLo) / 2], [1, dir * slopeUp], midHi, topLo));
  // The lower lattice's working lines: from a V half a pitch off the grid,
  // `lowerApexBottom` inside the 630 chord (so just short of it), 1.5
  // pitches along to a V on the grid `lowerApexTop` inside the 750.
  const js = Array.from({ length: 30 }, (_, j) => j + 4);
  const rise = M.lowClear + M.lowerApexBottom + M.lowerApexTop;
  const lower = (dir: 1 | -1) =>
    js.map((j) =>
      clip([(j + 0.5) * M.lowerPitch, lowTop - M.lowerApexBottom], [dir * 1.5 * M.lowerPitch, rise], lowTop, midLo),
    );
  const posts = ks.map((k) => clip([k * post, midHi], [0, 1], midHi, topLo));
  const fillets = masqueFillets(foot.inner + margin, foot.outer - margin, q, topLo, M.fillet, FILLET_BAND);
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
    // The corners' bands, just behind the top band (which hides their ends
    // above it) and in front of the bars they end: alternate bands 1 mm
    // apart, so neighbours never share a plane.
    ...[0, 1].map((parity) => ({
      id: `Fillet${parity}`,
      segs: fillets.filter((f) => f.band % 2 === parity).map((f) => f.seg),
      off: layer(3, M.plate) - 0.003 - 0.001 * parity,
      width: FILLET_BAND * 1.02,
      thickness: M.plate,
    })),
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
    // plates of panels 5 and 11 stand there, inside them. Nor at XXVIII,
    // where the ties' top chord, a plate above the node line, is the only
    // horizontal (PL-VII Figs 1, 5).
    (s, k) =>
      k >= at("XXVIII") &&
      k < kMerge &&
      !["XXVIII", "XXIV", "XXIII", "XVIII", "XVII"].includes(levels[k]?.name ?? "") &&
      !(k > kA && touchesA(s)),
  );

  // Inside the leg, the "entretoise diagonale" from d to b at the tops of
  // panels 1-3 and 6-7 (PL-VIII Figs 1, 8), open where the lift runs.
  // Whole in the Roux legs, whose car and stair clear it; open where the
  // Otis car crosses its line, at XXVII-XXV and XXI (ENTRETOISE.openAt).
  // The quadrant targets split as lifts.ts splits them: even = Roux (piles
  // 4, 2), odd = Otis (piles 3, 1).
  const entRoux = entretoiseMembers([]);
  const entOtis = entretoiseMembers(ENTRETOISE.openAt);
  const rouxQuads = g.add(filterByExpression, { predicate: lt(mod(index(), 2), 0.5) }, "legQuadsRoux");
  const otisQuads = g.add(filterByExpression, { predicate: ge(mod(index(), 2), 0.5) }, "legQuadsOtis");
  g.connect(quads, "out", rouxQuads, "in");
  g.connect(quads, "out", otisQuads, "in");
  const entretoises4 = merge(g, "legEntretoises4", [
    copyMembersToQuadrants(
      g,
      "legEntretoisesRoux4",
      segmentMembers(g, "legEntretoiseMembersRoux", entRoux.members, entRoux.extra),
      rouxQuads,
    ),
    copyMembersToQuadrants(
      g,
      "legEntretoisesOtis4",
      segmentMembers(g, "legEntretoiseMembersOtis", entOtis.members, entOtis.extra),
      otisQuads,
    ),
  ]);

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

  // The girder belts: the base ties under panel 1 (bars here, their chord
  // plates below), panels 5 and 11 (posts, bars, chords and gussets, all
  // plates below), and panel 10's base band.
  const s1 = faceSlopes(node("XXVIII").y - 1);
  const panel5 = belt1();
  const panel11 = belt2();
  const band = band10();
  const ties = tieChords();
  const belts = merge(g, "legBelts", [
    tie(
      g,
      "tieA",
      [3, 0],
      LEG_BELTS.tieOuterPitch,
      vertical(LEG_BELTS.tieOuterDepth, s1.outer),
      LEG_BELTS.tieOuterPhase,
    ),
    tie(g, "tieB", [1, 2], LEG_BELTS.tieInnerPitch, vertical(LEG_BELTS.tieInnerDepth, s1.inner)),
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
  // The crossings the plates go over (listed and explained below, where
  // they are built), read here first because the lacing needs them: a
  // plate is set under the corner angles' outer face, so no lacing rivet
  // may stand where one lies (`WebOpts.covers`). Listed in this quadrant;
  // the struts are already copied onto all four, so their covers are too.
  const webAt = (y: number) => tableAt(MEMBERS.web, y);
  const crossList =
    detail.lacedWeb === true || detail.rivets === true
      ? [
          ...postCrossings(),
          ...latticeCrossings(lat, 1, (f, k) => crossOn(f, k, 1), webAt),
          ...latticeCrossings(p10, 1, () => true, webAt),
          ...latticeCrossings(gap, 1, (_s, k) => k <= 4, webAt),
        ]
      : [];
  const covered =
    detail.rivets === true
      ? [0, 1, 2, 3].flatMap((k) => turnFootprints(crossFootprints(crossList, crossPlate(detail)), k))
      : [];
  const laced = { lacingStep: LACING_STEP, covers: covered };
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
  // The entretoises: "600" + "600" wide in plan and "715.6" deep [sourced
  // PL-VIII Figs 1, 8], a rectangular strut: N, its face's normal, is
  // horizontal (across the girder in plan), B vertical. They meet b and d
  // along the leg's diagonal, square to neither face of the box: its corner
  // stands r sqrt 2 out from the axis that way.
  const entretoiseWeb = webMembers(
    g,
    "legEntretoise",
    entretoises4,
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
    {
      lacingStep: [[ENTRETOISE.width / 2, ENTRETOISE.step]],
      halfB: [
        [0, ENTRETOISE.depth / 2],
        [320, ENTRETOISE.depth / 2],
      ],
    },
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
  // default clamp (0.25) would leave its joint rivets inside them. Laced
  // by panel as openly as the legs' own 500s (LEG_GAP_LACING_500).
  const gapBracingWeb = webMembers(
    g,
    "legGapBracing",
    fourMembers("legGapBracing4", gapCrosses),
    MEMBERS.web,
    detail,
    { ...diagonals, minSine: 0.1 },
    {
      ...laced,
      lacingBands: LEG_GAP_LACING_500.map(([lo, hi, step]) => ({ from: node(lo).y, to: node(hi).y, step })),
    },
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
  // EVERY CROSSING IN A LEG, at the laced depth and up (which is where
  // `webMembers` builds its own plates too; the plain depth's members are
  // solid boxes that interpenetrate, so there is no daylight at a crossing
  // to cover, and `gussets` is a class that does not exist there).
  //
  //   - the post on a horizontal, 11 levels a face, the four mid-panel ones
  //     of panels 1-4 being the eight-armed rosettes where the panel's own
  //     X crosses at the same point;
  //   - panels 6-9 and 12-17, where the panel's two diagonals cross on the
  //     face's centre line with no horizontal there (panels 1-4's span-2
  //     X's are the rosettes above, so they are not asked for again);
  //   - panel 10's two X's a face, off the post on the bay midlines;
  //   - the gap X between this leg and the next, panels 12-16, whose
  //     "central plate" PL-VII Fig. 2 draws and this model has never built.
  //
  // The gap's members ride the same quadrant copy as the leg's, so they can
  // share a set; the sets are split by SECTION, not by family, because
  // `flatBars` takes one width for a set.
  const crossSets = crossList.length > 0 ? crossPlateSets(crossList, crossPlate(detail)) : [];
  return {
    uprights: [
      skin(g, "legUprightSkin", lower4, MEMBERS.uprightBelow, [1, 0, 0]),
      skin(g, "legUprightUpperSkin", upper4, MEMBERS.uprightAbove, [1, 0, 0]),
    ],
    horizontals: [...horizontalWeb.meshes, ...entretoiseWeb.meshes, ...gapHorizontalWeb.meshes],
    bracing: [...bracingWeb.meshes, ...postWeb.meshes, ...gapBracingWeb.meshes],
    girders: [
      // The ties' bars, "70 x 70 x 8".
      faceSkin(g, "legBelt", fourMembers("legBelts4", belts), MEMBERS.beltBar),
      // The ties' chords: plates 0.22 deep, the top one on all four faces.
      plates("tieTopChord", ties.top, LEG_BELTS.tieChord, LEG_BELTS.tieChordThickness),
      plates("tieAChord", ties.a, LEG_BELTS.tieChord, LEG_BELTS.tieChordThickness),
      plates("tieBChord", ties.b, LEG_BELTS.tieChord, LEG_BELTS.tieChordThickness),
      // The belts' chord plates: panel 5's "500 x 10", panel 11's "450 x 8".
      plates("legBelt5Chords", panel5.chords, LEG_BELTS.belt1Chord, LEG_BELTS.belt1ChordThickness),
      plates("legBelt11Chords", panel11.chords, LEG_BELTS.belt2Chord, LEG_BELTS.belt2ChordThickness),
      // Their posts and bars, flats as wide as drawn, and the gussets at
      // the posts' mid-heights.
      ...(
        [
          ["legBelt5", panel5, LEG_BELTS.belt1Post, LEG_BELTS.belt1Bar, LEG_BELTS.belt1Gusset[0]],
          ["legBelt11", panel11, LEG_BELTS.belt2Post, LEG_BELTS.belt2Bar, LEG_BELTS.belt2Gusset[0]],
        ] as const
      ).flatMap(([id, belt, post, bar, gusset]) => [
        plates(`${id}Posts`, belt.posts, post, LEG_BELTS.beltFlatThickness),
        plates(`${id}BarsUp`, belt.up, bar, LEG_BELTS.beltFlatThickness),
        plates(`${id}BarsDown`, belt.down, bar, LEG_BELTS.beltFlatThickness),
        plates(`${id}Gussets`, belt.gussets, gusset, LEG_BELTS.beltGussetThickness),
      ]),
      // Panel 10's band: "300 x 5" flats, one layer each way.
      plates("legBand10Up", band.up, LEG_BELTS.band10Flat, LEG_BELTS.band10FlatThickness),
      plates("legBand10Down", band.down, LEG_BELTS.band10Flat, LEG_BELTS.band10FlatThickness),
      // Panel 4's Masque, on the faces that lie in the tower's faces.
      ...masque(g).map(({ paths, width, thickness }, i) =>
        flatBars(g, `legMasque${i}`, fourMembers(`legMasque${i}x4`, paths), width, thickness),
      ),
    ],
    gussets: [
      ...gussetMeshes(webs),
      // The plates over the rosettes, where a post crosses a horizontal —
      // at the laced depth and up, which is where `webMembers` builds its
      // own plates too. The plain depth's members are solid boxes that
      // interpenetrate, so there is no daylight at a crossing to cover,
      // and `gussets` is a class that does not exist there at all.
      ...crossSets.map((set) =>
        plates(`legCrossPlates${set.key}`, set.members, set.width, CROSS_THICK),
      ),
    ],
    rivets: [
      ...seams,
      // The rows round each crossing plate's edge.
      ...(detail.rivets === true
        ? crossSets.map((set) => ({
            name: `leg.crossings.${set.key}`,
            spawn: lineRivets(
              g,
              `legCrossRivets${set.key}`,
              fourMembers(
                `legCrossRivets${set.key}4`,
                segmentMembers(g, `legCrossRivets${set.key}`, set.rivetLines),
              ),
              CROSS_THICK / 2,
              CROSS_RIVETS.pitch,
            ),
          }))
        : []),
      // The chords' rivets: panels 5 and 11 and the base ties ({@link BeltJoints}).
      ...(detail.rivets === true
        ? (() => {
            const P = LEG_BELTS;
            const b5 = beltRivets(node("XXIV").y, node("XXIII").y, P.belt1Chord, P.belt1ChordThickness, P.belt1PostPitch, P.belt1PostPitch, 2 * P.belt1PostPitch, TOP_CHORD_IN_DECK);
            const b11 = beltRivets(node("XVIII").y, node("XVII").y, P.belt2Chord, P.belt2ChordThickness, P.belt2PostPitch, P.belt2PostPitch / 2, P.belt2PostPitch, TOP_CHORD_IN_DECK);
            const tr = tieRivets();
            const sets: Array<[string, SegmentMember[], number]> = [
              ["legBelt5Edge", b5.edge, BELT5_JOINTS.edge.pitch],
              ["legBelt5PostLap", b5.posts, BELT5_JOINTS.post.pitch],
              ["legBelt5BarLap", b5.bars, BELT5_JOINTS.bar.pitch],
              ["legBelt11Edge", b11.edge, BELT11_JOINTS.edge.pitch],
              ["legBelt11PostLap", b11.posts, BELT11_JOINTS.post.pitch],
              ["legBelt11BarLap", b11.bars, BELT11_JOINTS.bar.pitch],
              ["legTieEdge", tr.edge, TIE_EDGE_ROW.pitch],
              ["legTieLap", tr.lap, TIE_LAP_SPAWN],
            ];
            return sets
              .filter(([, list]) => list.length > 0)
              .map(([id, list, pitch]) => ({
                name: `leg.chords.${id}`,
                spawn: lineRivets(g, `${id}Rivets`, fourMembers(`${id}Rivets4`, segmentMembers(g, `${id}Rows`, list)), 0, pitch),
              }));
          })()
        : []),
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

