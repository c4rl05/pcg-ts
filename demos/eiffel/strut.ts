/**
 * The second scale: a member that is itself a lattice.
 *
 * The web bars of every braced panel are not solid: each is a square strut
 * of four corner angles ("cornières", 80-100 mm) laced together on all four
 * faces by light angles ("treillis 45 x 45 x 5") in an X (Plate XXXI's
 * section table; Plate VII's labels). So a member path becomes four chords
 * and eight zigzags — two per face, in opposite phase, which is an X per
 * lacing bay.
 *
 * The strut's section is squared to the tower's faces, not left to a curve
 * frame: for a member with direction T, the section axes are
 * N = normalize(T x up) and B = N x T with up = +y, which puts N on the
 * face normal for every diagonal and horizontal lying in a face plane.
 * (A vertical member would make that degenerate — none is laced: the
 * uprights are closed plate boxes.)
 *
 * Built like the truss in the corpus rig graph: resample, then displace
 * copies of the same paths — each chord or zigzag is one transformPoints
 * whose translate is a field of the sample's frame and index.
 */
import {
  type Field,
  type Graph,
  type NodeHandle,
  add,
  attribute,
  component,
  cross,
  index,
  lerp,
  mod,
  mul,
  normalize,
  pathResample,
  position,
  ramp,
  sub,
  transformPoints,
  vec,
} from "pcg-ts";
import { merge, skin } from "./lattice.js";
import type { Detail } from "./parts.js";

/** A corner angle's half-width: 80-100 mm angles (Plate XXXI) [derived]. */
const CHORD = 0.045;
/** A lacing bar's half-width: 45 x 45 x 5 angles (Plate VII) [derived]. */
const LACE = 0.02;

/**
 * Web members at the requested detail: solid square members of the given
 * outer half-width, or laced struts whose chords sit just inside it.
 */
export function webMembers(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  detail: Detail,
): NodeHandle[] {
  if (detail.lacedWeb !== true) return [skin(g, `${id}Skin`, paths, outer)];
  const struts = latticeStruts(g, id, paths, {
    halfWidth: outer.map(([y, w]) => [y, w - CHORD] as const),
    chord: CHORD,
    lacing: LACE,
    pitch: 1,
  });
  return [struts.chords, struts.lacing];
}

export interface StrutOpts {
  /** Half-width of the strut, to its chords' axes, by height: (y, w) stops. */
  readonly halfWidth: ReadonlyArray<readonly [number, number]>;
  /** Half-width of a chord angle's square section. */
  readonly chord: number;
  /** Half-width of a lacing bar's square section. */
  readonly lacing: number;
  /**
   * Lacing pitch as a multiple of the strut's full width: 1 puts each
   * lacing bar at 45 degrees across its face.
   */
  readonly pitch: number;
}

/** The four section corners in ring order, as (sN, sB) sign pairs. */
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/**
 * Turn member paths into laced struts. Returns the chords' and the
 * lacing's meshes separately (they differ by an order of magnitude in
 * section, so a class may want to hold only one).
 */
export function latticeStruts(
  g: Graph,
  id: string,
  paths: NodeHandle,
  o: StrutOpts,
): { chords: NodeHandle; lacing: NodeHandle } {
  const y = component(position(), 1);
  const w = ramp(y, o.halfWidth);
  // The resample step is uniform per call, so it takes the strut's widest
  // section: 2 * max w * pitch.
  const widest = Math.max(...o.halfWidth.map((s) => s[1]));
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: 2 * widest * o.pitch },
    `${id}Samples`,
  );
  g.connect(paths, "out", samples, "in");

  const T = attribute("tangent", 3);
  const N = normalize(cross(T, vec(0, 1, 0)));
  const B = cross(N, T);
  const corner = (c: number): Field => {
    const [sn, sb] = CORNERS[c % 4]!;
    return mul(w, add(mul(N, sn), mul(B, sb)));
  };
  const shifted = (name: string, offset: Field): NodeHandle => {
    const node = g.add(transformPoints, { translate: offset }, `${id}${name}`);
    g.connect(samples, "out", node, "in");
    return node;
  };

  const chords = CORNERS.map((_, c) => shifted(`Chord${c}`, corner(c)));
  const phase = mod(index(), 2);
  const lacing = CORNERS.flatMap((_, f) => [
    shifted(`LaceA${f}`, lerp(corner(f), corner(f + 1), phase)),
    shifted(`LaceB${f}`, lerp(corner(f), corner(f + 1), sub(1, phase))),
  ]);
  return {
    chords: skin(g, `${id}ChordSkin`, merge(g, `${id}Chords`, chords), o.chord),
    lacing: skin(g, `${id}LaceSkin`, merge(g, `${id}Lacing`, lacing), o.lacing),
  };
}
