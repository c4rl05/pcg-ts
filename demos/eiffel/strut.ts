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
 * The strut's section is squared to the face it lies in: every edge rule
 * writes its face's normal (`FACE_NORMAL`, see lattice.ts), and the
 * section axes are that normal made perpendicular to the member, N, and
 * B = N x T. An up hint of +y would square it to the vertical instead,
 * which in panel 1, where the faces lean 26.7 degrees, is up to 30 degrees
 * off.
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
  dot,
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
import { FACE_NORMAL, merge, skin } from "./lattice.js";
import type { Detail } from "./parts.js";

/** A corner angle's half-width: 80-100 mm angles (Plate XXXI) [derived]. */
const CHORD = 0.045;
/** A lacing bar's half-width: 45 x 45 x 5 angles (Plate VII) [derived]. */
const LACE = 0.02;

/**
 * Solid square members squared to their faces. The members of an edge rule
 * share their end points, and a sweep's up hint resolves per POINT, so each
 * member is first resampled onto points of its own (2 samples: its two
 * ends), which carry its primitive face normal down to them.
 */
export function faceSkin(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
): NodeHandle {
  const own = g.add(pathResample, { mode: "count", count: 2 }, `${id}Ends`);
  g.connect(paths, "out", own, "in");
  return skin(g, `${id}Skin`, own, halfWidth, attribute(FACE_NORMAL, 3));
}

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
  if (detail.lacedWeb !== true) return [faceSkin(g, id, paths, outer)];
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
  const F = attribute(FACE_NORMAL, 3);
  const N = normalize(sub(F, mul(T, dot(F, T))));
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
