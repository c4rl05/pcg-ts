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
  mergePoints,
  mod,
  mul,
  normalize,
  orientAlongVector,
  pathResample,
  position,
  ramp,
  setAttribute,
  spawnInstances,
  sub,
  transformPoints,
  vec,
} from "pcg-ts";
import { FACE_NORMAL, merge, skin } from "./lattice.js";
import { type Detail, RIVET_ASSET } from "./parts.js";

/** A corner angle's half-width: 80-100 mm angles (Plate XXXI) [derived]. */
const CHORD = 0.045;
/** A lacing bar's half-width: 45 x 45 x 5 angles (Plate VII) [derived]. */
const LACE = 0.02;
/**
 * A rivet head's radius. The rivets ran 14-25 mm (a secondary source
 * quoting Eiffel's price lists); a round head is about 1.7 shank
 * diameters, so 38 mm across for a 22 mm rivet [estimated].
 */
const RIVET_HEAD = 0.019;

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

/** Web members at some detail: their meshes, and their rivets when asked. */
export interface WebMembers {
  readonly meshes: NodeHandle[];
  readonly rivets?: NodeHandle;
}

/**
 * Web members at the requested detail: solid square members of the given
 * outer half-width, or laced struts whose chords sit just inside it, with
 * their rivets as a spawner when `detail.rivets` asks (which implies the
 * lacing: a rivet is where a lacing bar meets a chord).
 */
export function webMembers(
  g: Graph,
  id: string,
  paths: NodeHandle,
  outer: ReadonlyArray<readonly [number, number]>,
  detail: Detail,
): WebMembers {
  const riveted = detail.rivets === true;
  if (detail.lacedWeb !== true && !riveted) return { meshes: [faceSkin(g, id, paths, outer)] };
  const struts = latticeStruts(g, id, paths, {
    halfWidth: outer.map(([y, w]) => [y, w - CHORD] as const),
    chord: CHORD,
    lacing: LACE,
    pitch: 1,
    rivets: riveted,
  });
  return {
    meshes: [struts.chords, struts.lacing],
    ...(struts.rivets === undefined ? {} : { rivets: struts.rivets }),
  };
}

/** Name the rivet spawners of several web-member sets, skipping the rivetless. */
export function rivetOutputs(
  sets: Record<string, WebMembers>,
): Array<{ name: string; spawn: NodeHandle }> {
  const out: Array<{ name: string; spawn: NodeHandle }> = [];
  for (const [name, set] of Object.entries(sets)) {
    if (set.rivets !== undefined) out.push({ name, spawn: set.rivets });
  }
  return out;
}

/**
 * The uprights' seam rows: a rivet every 0.10 m [estimated — no source
 * found gives a pitch; about 4.5 diameters of a 22 mm rivet, a common
 * 19th-century spacing], 55 mm in from the corner, the middle of a
 * 100 mm angle's leg [derived from the 100 x 100 corner angles].
 */
export const UPRIGHT_SEAMS = { pitch: 0.1, inset: 0.055 } as const;

/**
 * Seam rivets along closed box members — the uprights, which are plate
 * boxes with an angle in each corner (Plate XXXI's section tables). Each
 * corner angle is riveted to the two plates it joins: a row on each face,
 * `inset` in from the corner, every `pitch` along the member. The rows
 * follow the member's own square section, which the skin squares to the
 * projection of `up` (so a face normal is N = up made perpendicular to the
 * member, and B = T x N): rivets and plates cannot disagree.
 */
export function seamRivets(
  g: Graph,
  id: string,
  paths: NodeHandle,
  halfWidth: ReadonlyArray<readonly [number, number]>,
  up: readonly [number, number, number],
  opts: { readonly pitch: number; readonly inset: number },
): NodeHandle {
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: opts.pitch },
    `${id}SeamSamples`,
  );
  g.connect(paths, "out", samples, "in");
  const r = ramp(component(position(), 1), halfWidth);
  const T = attribute("tangent", 3);
  const U = vec(up[0], up[1], up[2]);
  const N = normalize(sub(U, mul(T, dot(U, T))));
  const B = cross(T, N);
  const rows = CORNERS.flatMap(([sn, sb], c) =>
    (
      [
        // On the N face: out along sn N, in from the corner along B.
        ["N", mul(N, sn), mul(B, sb)],
        // On the B face: out along sb B, in from the corner along N.
        ["B", mul(B, sb), mul(N, sn)],
      ] as const
    ).map(([side, out, along]) => {
      const at = g.add(
        transformPoints,
        { translate: add(mul(out, r), mul(along, sub(r, opts.inset))) },
        `${id}Seam${c}${side}`,
      );
      const aim = g.add(
        orientAlongVector,
        { direction: out, up: T, axis: "+y" },
        `${id}Seam${c}${side}Aim`,
      );
      g.connect(samples, "out", at, "in");
      g.connect(at, "out", aim, "in");
      return aim;
    }),
  );
  return rivetSpawn(g, `${id}Seam`, rows);
}

/** Merge rivet point sets, size them, and spawn them. */
function rivetSpawn(g: Graph, id: string, sets: readonly NodeHandle[]): NodeHandle {
  const all = g.add(mergePoints, {}, `${id}Rivets`);
  for (const h of sets) g.connect(h, "out", all, "in");
  const sized = g.add(
    setAttribute,
    { name: "scale", type: "f32", tupleSize: 3, value: RIVET_HEAD },
    `${id}RivetSize`,
  );
  const spawn = g.add(spawnInstances, { assetId: RIVET_ASSET }, `${id}RivetSpawn`);
  g.connect(all, "out", sized, "in");
  g.connect(sized, "out", spawn, "in");
  return spawn;
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
  /** Also spawn a rivet wherever a lacing bar meets a chord. */
  readonly rivets?: boolean;
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
): { chords: NodeHandle; lacing: NodeHandle; rivets?: NodeHandle } {
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
  // The chords and lacing are squared to the strut's face too (they carry
  // its normal from the resample): with the default +y hint a chord box
  // rolls up to 40 degrees off the face its rivets sit on.
  const meshes = {
    chords: skin(g, `${id}ChordSkin`, merge(g, `${id}Chords`, chords), o.chord, F),
    lacing: skin(g, `${id}LaceSkin`, merge(g, `${id}Lacing`, lacing), o.lacing, F),
  };
  if (o.rivets !== true) return meshes;

  // RIVETS. At every sample each face's two zigzags meet the face's two
  // chords, one each, so every chord takes a lacing end from each of the
  // two faces it borders: two rivets per chord per sample, eight per
  // strut section. Each head sits on its chord's outer face on that side,
  // its axis along the face's outward normal.
  const heads = CORNERS.flatMap(([sn, sb], c) =>
    (
      [
        ["N", mul(N, sn)],
        ["B", mul(B, sb)],
      ] as const
    ).map(([side, out]) => {
      const at = g.add(
        transformPoints,
        { translate: add(corner(c), mul(out, o.chord)) },
        `${id}Rivet${c}${side}`,
      );
      const aim = g.add(
        orientAlongVector,
        { direction: out, up: T, axis: "+y" },
        `${id}Rivet${c}${side}Aim`,
      );
      g.connect(samples, "out", at, "in");
      g.connect(at, "out", aim, "in");
      return aim;
    }),
  );
  const spawn = rivetSpawn(g, id, heads);
  return { ...meshes, rivets: spawn };
}
