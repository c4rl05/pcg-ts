/**
 * Panel 29, the 3rd floor, and the 1889 campanile above it.
 *
 * Bottom to top, every level chained from the 3rd floor (PL-VII Fig. 4,
 * PL-XIX Figs 3-13 and Plate I; tags as in `spec.ts`; the readings are in
 * SOURCES.md, "The campanile re-read"):
 *
 * 1. PANEL 29 [sourced]: a prismatic box 10.00 m axis to axis, 11.23 m
 *    tall, from the top of panel 28 (y 264.90) to the 3rd floor (276.13),
 *    4 bays of 2.50 m per face. Its rows are a lattice BAND 3.173 at the
 *    base, then 8.057 in three X rows [sourced PL-VII; the rows' split is
 *    estimated even]. On `squareRing(4)` the four corners are the uprights
 *    that continue the shaft's c; the other twelve columns (the merged b/d
 *    among them) are POSTS, 0.50 m wide ["500" printed three times]. The
 *    web is flat bars about 0.09 wide [estimated, drawn as double lines]:
 *    one X per cell in the rows, a PAIR of parallel bars each way in the
 *    band. Horizontals: 0.60 m plate girders ("600 x 6", "600 x 7")
 *    hang from the band's top node and under the floor's 0.25 build-up
 *    ("850" = 0.25 + 0.60) [sourced PL-VII]; the base is the shaft's own
 *    0.60 horizontal at its top node; the two rows between carry light
 *    angles [estimated]. The corner uprights and the b/d posts run on up
 *    through the glazed gallery to the apartment's floor [PL-VII Fig. 4].
 * 2. THE GALLERY: a glazed octagon ("paroi vitrée") 16.56 m across the
 *    flats with 10.90 m straight sides and 45-degree chamfers [sourced
 *    PL-XIX Fig. 9], 2.58 m tall [sourced PL-XIX Fig. 3: 309.63 to the
 *    apartment floor at 312.21]: a 1.20 lattice parapet ("treillis
 *    40 x 40 x 4") and glazing above it, built as its frame — sills,
 *    mullions, the parapet's X — with the panes left open. Its roof is
 *    Eiffel's BALCONY, 17.6 m across [estimated: PL-VII draws it about
 *    0.5 proud of the glass], with a 1.00 railing [sourced PL-VII].
 * 3. THE APARTMENT: a box 10.68 m square [sourced PL-XIX Fig. 5, "Toiture
 *    du logement de Monsieur Eiffel"] and 2.27 m tall [sourced PL-XIX
 *    Fig. 3], standing on the core. 2.58 + 2.27 closes on the chain's
 *    printed 4.850 to y 280.98 [derived].
 * 4. THE LATTICE BOX ("cylindre"): 4.500 tall [sourced] to y 285.48. Its
 *    corner columns stand where the dome's ribs spring: 7.435 out on the
 *    diagonals [sourced PL-XIX Fig. 5], so 10.515 m axis to axis
 *    [derived], 0.55 m wide [estimated], which leaves PL-VII's printed
 *    10.00 clear between them. Its faces are a diamond mesh of flat bars
 *    [estimated: about 0.09 wide, 0.75 m apart, 58 degrees], between a
 *    plate at the foot and one at the head, with posts at the 2.50 m bays.
 * 5. THE DOME: four half-arches along the diagonals, two full SEMICIRCLES
 *    crossing over the axis: 7.435 m out in plan on each half-diagonal
 *    ("14.870" across) and 7.435 m high [sourced PL-XIX Fig. 5, PL-VII:
 *    "11,935" = 4.500 + 7.435], so the extrados is a semicircle of radius
 *    7.435 about the box's top, crown at y 292.915 [derived]. Each rib is
 *    a box girder 1.13 m broad, 0.77 between its chords [sourced PL-XIX
 *    Figs 5, 8], and 1.20 m deep
 *    [estimated, PL-VII]: four chords laced on all four faces, 12 arc
 *    segments [estimated].
 * 6. THE LANTERN TERRACE, floor at 293.215 [sourced]; the chain's 0.250
 *    would put it at 293.165, the 0.05 m the spec leaves open, so the
 *    deck runs from the crown and is 0.300 thick. A square 4.615 m with
 *    0.776 chamfers [derived: PL-XIX Fig. 13 prints "5.750" across the
 *    DIAGONAL, chamfer to chamfer, and "776" on a chamfer; PL-VII draws the
 *    deck 4.6 wide], railed 1.00 [sourced].
 * 7. THE LANTERN ("phare"), DECAGONAL in plan [sourced PL-XIX Figs 12,
 *    13]: a 3.980 base ("soubassement") 2.60 across the flats [sourced
 *    Fig. 13], carrying at +3.08 a balcony ("balcon de la lanterne")
 *    3.60 across [sourced Fig. 12] on 0.775 consoles, with a 0.900
 *    parapet [sourced]; the 1.140 glazed lantern and the 2.055 cupola
 *    [sourced heights], the cupola bulbous [PL-VII, PL-XIX] to the 0.125
 *    top deck, 1.80 wide [estimated], at the printed top terrace 300.515.
 *    On it the lightning conductor's cage ("soutien du paratonnerre"),
 *    1.70 wide and 3.05 tall [sourced PL-VII, PL-XIX Fig. 4], straight for
 *    1.80 [estimated] and then closing on the pole.
 * 8. THE FLAGPOLE: 11.760 above the top terrace, to y 312.275 [sourced];
 *    its diameter, 0.24 tapering to 0.12, is [estimated].
 *
 * Panel 29 is sorted like the shaft (uprights, bracing, horizontals);
 * everything from the gallery up is the "summit" class.
 *
 * DETAIL, as for the legs and the shaft (`Detail`). With `lacedWeb` panel
 * 29's posts and the box's posts and plates become laced struts
 * (`webMembers`), the box's with gusset plates at the corner columns. The
 * flat bars stay flat bars. With `rivets`: seam rows on the corner uprights
 * and the box's corner columns (the uprights' pitch and inset, strut.ts);
 * the laced members' lacing and joint rivets; two rivets through each end
 * of every flat bar of panel 29, just clear of the post or girder it lands
 * on; two rows along each face of panel 29's band plate girder, between
 * the posts; and on the dome, seam rows along every chord and one rivet on
 * each OUTER face of a chord at every node its lacing meets [estimated].
 * Every rivet set is its own output, `rivets.summit.<part>`. The defaults
 * build solid members and no rivets.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  attribute,
  component,
  mergePoints,
  mul,
  orientAlongVector,
  pathResample,
  pointsToPath,
  position,
  ramp,
  setAttribute,
  spawnInstances,
  sweepProfile,
  transformPoints,
  vec,
} from "pcg-ts";
import {
  FACE_NORMAL,
  type Lattice,
  type StationMask,
  type Vec3,
  box,
  chains,
  edges,
  indexTable,
  merge,
  placedLattice,
  skin,
  squareRing,
  stationLattice,
  stationRows,
} from "./lattice.js";
import { type Detail, type Parts, RIVET_ASSET, joinParts } from "./parts.js";
import { FLOORS, MEMBERS, PANEL29 } from "./spec.js";
import {
  UPRIGHT_SEAMS,
  type WebMembers,
  faceSkin,
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

/** Panel 29's base band, in-plane = vertical (the panel is prismatic) [sourced PL-VII "3,173"]. */
const PANEL29_BAND = 3.173;
/** The X rows above the band, dividing PL-VII's printed 8.057 [estimated even]. */
const PANEL29_ROWS = 3;
/** Panel 29's members, as half-widths. */
const P29 = {
  /** The posts: "500" [sourced PL-VII Fig. 4]. */
  post: 0.25,
  /** The flat bars of the X and the band [estimated: drawn 0.08-0.11]. */
  bar: 0.045,
  /** The light horizontals of the two middle rows [estimated]. */
  light: 0.05,
  /** The band's paired bars sit this far either side of the node line, along the face [estimated: 0.30 apart, drawn]. */
  pair: 0.15,
  /** The plate girders, "600 x 6" and "600 x 7": depth [sourced]; half-thickness with flange angles [estimated]. */
  plateDepth: 0.6,
  plateHalf: 0.1,
  /** The floor's structure under its level, "850" [sourced PL-VII, PL-XIX Fig. 3]. */
  floorDepth: 0.85,
} as const;

/** The glazed gallery [sourced PL-XIX Figs 3, 9]: half across the flats, half its straight side, height. */
const GALLERY = { flat: 8.28, straight: 5.45, height: 2.58, parapet: 1.2 } as const;
/** Its bays: per straight side, per chamfer [estimated from PL-XIX Fig. 3's mullions, about 1.35]. */
const GALLERY_BAYS = { straight: 8, chamfer: 3 } as const;
/** Its frame, as half-widths [estimated]: mullions and sills, the parapet's 40 x 40 lattice. */
const GALLERY_MEMBERS = { frame: 0.05, lattice: 0.02 } as const;
/** Eiffel's balcony: its deck overhangs the glass [estimated], its railing [sourced PL-VII "1.000"]. */
const BALCONY = { overhang: 0.52, deck: 0.2, railing: 1.0, member: 0.03 } as const;

/** The apartment [sourced PL-XIX: 10.680 square roof, 2.270 tall]. */
const APARTMENT = { side: 10.68, height: 2.27 } as const;

/**
 * The lattice box above the apartment: height [sourced]; its corner
 * columns on the dome's springing, 7.435 out on the diagonals [derived].
 */
const CAGE = { height: 4.5, half: 7.435 / Math.SQRT2 } as const;
/** The box's members, as half-widths [estimated]. */
const CAGE_MEMBERS = { corner: 0.275, horizontal: 0.15, post: 0.1, bar: 0.045 } as const;
/** Its diamond mesh [estimated from PL-XIX Fig. 3]: bars this far apart along the face, at this angle to the horizontal. */
const CAGE_MESH = { spacing: 0.75, angle: (58 * Math.PI) / 180 } as const;

/**
 * The dome: the extrados radius, which is also the rise and the plan's
 * half-diagonal [sourced]; the chord axes' spacing radially and across the
 * rib, the chords' and lacing's half-widths, and the arc's segments
 * [estimated; the rib's breadth sourced: 0.95 + 2 x 0.09 = 1.130 overall
 * and 0.95 - 2 x 0.09 = 0.770 between the chords].
 */
const DOME = { radius: 7.435, depth: 1.02, breadth: 0.95, chord: 0.09, lacing: 0.03, segments: 12 } as const;

/** The lantern stack [sourced heights; widths as in the header]. */
const LANTERN = {
  /** The terrace: square side, chamfer [derived], deck railing [sourced]. */
  terrace: 4.615,
  chamfer: 0.776,
  railing: 1.0,
  /** The soubassement: height, and across the decagon's flats. */
  baseHeight: 3.98,
  baseFlats: 2.6,
  /** The balcony: its floor above the terrace (2.305 + 0.775), the consoles' depth, parapet, across the flats. */
  balconyAt: 3.08,
  console: 0.775,
  parapet: 0.9,
  balconyFlats: 3.6,
  /** The glazed lantern and the cupola: heights. */
  lanternHeight: 1.14,
  cupolaHeight: 2.055,
  /** The cupola's straight sides before it rounds [estimated], and the top deck. */
  cupolaStraight: 0.9,
  topDeck: 0.125,
  topDeckWidth: 1.8,
  /** The lightning conductor's cage: width, height [sourced], straight part [estimated]. */
  finialWidth: 1.7,
  finialHeight: 3.05,
  finialStraight: 1.8,
} as const;

/** The flagpole's radius at its foot and head [estimated]. */
const FLAG_RADIUS = { foot: 0.12, head: 0.06 } as const;

/**
 * A rivet head's radius: strut.ts's (38 mm across for a 22 mm rivet
 * [estimated]), which that module does not export.
 */
const RIVET_HEAD = 0.019;

/**
 * How far short of a whole number of pitches a seam run stops. A resample
 * by spacing always lands on its path's end, so a run whole to the float
 * could end on a hairline last step, two heads on top of each other; a
 * millimetre short, its last step is a millimetre shy of the pitch.
 */
const RUN_SHORT = 0.001;

/** How far a flat bar's end rivet keeps clear of the member it lands on, head included [estimated]. */
const END_CLEAR = 0.05 + RIVET_HEAD;
/** The two rivets through a flat bar's end, this far apart along it [estimated]. */
const END_PITCH = 0.08;

/** A named rivet spawner, as `Parts.rivets` holds them. */
type RivetSet = { name: string; spawn: NodeHandle };

/** A (height, half-width) table holding one value at every height. */
function flat(w: number): ReadonlyArray<readonly [number, number]> {
  return [
    [0, w],
    [FLOORS.flagTop, w],
  ];
}

/** Whether the web is built as laced struts: `rivets` implies the lacing. */
const isLaced = (detail: Detail) => detail.lacedWeb === true || detail.rivets === true;

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * One of the tower's four faces, for members laid out in the face's own
 * coordinates: `u` along it (t) and `y` up, the face plane `half` out
 * along n. Face order is +z, +x, -z, -x, each turned 90 degrees from the
 * last, so `u` runs the same way round every face.
 */
interface Face {
  readonly n: Vec3;
  readonly t: Vec3;
}
const FACES: readonly Face[] = [
  { n: [0, 0, 1], t: [1, 0, 0] },
  { n: [1, 0, 0], t: [0, 0, -1] },
  { n: [0, 0, -1], t: [-1, 0, 0] },
  { n: [-1, 0, 0], t: [0, 0, 1] },
];
/** A point in a face's coordinates, `off` out of the face plane. */
function onFace(f: Face, half: number, u: number, y: number, off = 0): Vec3 {
  return [f.n[0] * (half + off) + f.t[0] * u, y, f.n[2] * (half + off) + f.t[2] * u];
}

/** A straight member in a face's coordinates. */
interface FaceBar {
  readonly f: Face;
  readonly u0: number;
  readonly y0: number;
  readonly u1: number;
  readonly y1: number;
}

/** A rectangle in a face's coordinates: something a rivet has to keep off. */
interface Rect {
  readonly u0: number;
  readonly u1: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * Write one face normal per path onto paths that came out of `chains`: one
 * per kept station, in ascending station order (pointsToPath emits its
 * groups by ascending key), so `normals[i]` is the i-th kept station's. A
 * strut or a seam row then squares itself to it as to an edge rule's.
 */
function withFaces(g: Graph, id: string, paths: NodeHandle, normals: readonly Vec3[]): NodeHandle {
  const faces = g.add(
    setAttribute,
    {
      name: FACE_NORMAL,
      domain: "primitive",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(normals.map((n) => n[0])),
        indexTable(normals.map((n) => n[1])),
        indexTable(normals.map((n) => n[2])),
      ),
    },
    id,
  );
  g.connect(paths, "out", faces, "in");
  return faces;
}

/** Explicit two-point members, one path each, carrying a face normal apiece when given. */
function members(
  g: Graph,
  id: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  faces?: readonly Vec3[],
): NodeHandle {
  const lat = placedLattice(g, id, [pieces.map((p) => p[0]), pieces.map((p) => p[1])]);
  const paths = chains(lat, "Paths");
  return faces === undefined ? paths : withFaces(g, `${id}Faces`, paths, faces);
}

/** Closed rings through explicit points, all rings with the same point count. */
function loops(g: Graph, id: string, rings: ReadonlyArray<ReadonlyArray<Vec3>>): NodeHandle {
  const n = rings[0]?.length ?? 0;
  const lat = placedLattice(
    g,
    id,
    Array.from({ length: n }, (_, k) => rings.map((r) => r[k]!)),
  );
  const paths = g.add(pointsToPath, { groupAttr: "s", closed: true }, `${id}Loops`);
  g.connect(lat.stations, "out", paths, "in");
  return paths;
}

/** Square members of half-width `half` along face bars, squared to their faces. */
function faceBars(g: Graph, id: string, half: number, bars: readonly FaceBar[], planeHalf: number): NodeHandle {
  return faceSkin(
    g,
    id,
    members(
      g,
      `${id}Paths`,
      bars.map((b) => [onFace(b.f, planeHalf, b.u0, b.y0), onFace(b.f, planeHalf, b.u1, b.y1)] as const),
      bars.map((b) => b.f.n),
    ),
    half,
  );
}

/** Rivets at explicit points, each aimed (its +y) along its own direction. */
function aimedPoints(g: Graph, id: string, at: readonly Vec3[], dirs: readonly Vec3[]): NodeHandle {
  const lat = placedLattice(g, id, [at]);
  const dir = g.add(
    setAttribute,
    {
      name: "rivetDir",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(dirs.map((d) => d[0])),
        indexTable(dirs.map((d) => d[1])),
        indexTable(dirs.map((d) => d[2])),
      ),
    },
    `${id}Dir`,
  );
  const aim = g.add(
    orientAlongVector,
    { direction: attribute("rivetDir", 3), up: [0, 1, 0], axis: "+y" },
    `${id}Aim`,
  );
  g.connect(lat.stations, "out", dir, "in");
  g.connect(dir, "out", aim, "in");
  return aim;
}

/**
 * Seam runs over pieces of members' axes: each piece [a, b] cut to a whole
 * number of seam pitches, centred on it, so its rows keep at least half a
 * pitch clear of either end — off a floor the member passes through, off
 * the kink of a curved rib, where the mitred skin's concave faces meet a
 * centimetre short of the node. With `faces`, each run carries its piece's
 * face normal (`FACE_NORMAL`).
 */
function seamRuns(
  g: Graph,
  id: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  faces?: readonly Vec3[],
): NodeHandle {
  const pitch = UPRIGHT_SEAMS.pitch;
  const runs = pieces.map(([a, b], i) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const steps = Math.floor((len - pitch) / pitch);
    if (steps < 1) {
      throw new Error(
        `eiffel summit "${id}": piece ${i} is ${len.toFixed(3)} m long, too short for a seam run ` +
          `of pitch ${pitch} with half a pitch clear at each end; a piece needs at least ${2 * pitch} m`,
      );
    }
    const at = (d: number): Vec3 => {
      const t = d / len;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    };
    const from = (len - steps * pitch) / 2;
    return [at(from), at(from + steps * pitch - RUN_SHORT)] as const;
  });
  return members(g, id, runs, faces);
}

/** Merge rivet point sets, size them, and spawn them (strut.ts's, not exported). */
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

/** A point's distance outside a rectangle (0 inside). */
function outside(u: number, y: number, r: Rect): number {
  const du = Math.max(r.u0 - u, 0, u - r.u1);
  const dy = Math.max(r.y0 - y, 0, y - r.y1);
  return Math.hypot(du, dy);
}

/**
 * The rivets through the ends of flat bars: at each end, the first point
 * along the bar at least END_CLEAR outside every rectangle it could hide
 * in (the post, upright or girder the end lands on), and one END_PITCH
 * further; a head on each face of the bar, aimed out of it.
 */
function barEndRivets(
  g: Graph,
  id: string,
  bars: readonly FaceBar[],
  planeHalf: number,
  barHalf: number,
  keepOff: readonly Rect[],
): NodeHandle | undefined {
  const at: Vec3[] = [];
  const dirs: Vec3[] = [];
  for (const b of bars) {
    const len = Math.hypot(b.u1 - b.u0, b.y1 - b.y0);
    const du = (b.u1 - b.u0) / len;
    const dy = (b.y1 - b.y0) / len;
    for (const [u0, y0, s] of [
      [b.u0, b.y0, 1],
      [b.u1, b.y1, -1],
    ] as const) {
      const clear = (a: number) =>
        keepOff.every((r) => outside(u0 + s * du * a, y0 + s * dy * a, r) >= END_CLEAR);
      let a = 0;
      while (a < len / 2 && !clear(a)) a += 0.005;
      for (const d of [a, a + END_PITCH]) {
        if (d + RIVET_HEAD > len / 2 || !clear(d)) continue;
        for (const side of [1, -1]) {
          at.push(onFace(b.f, planeHalf, u0 + s * du * d, y0 + s * dy * d, side * barHalf));
          dirs.push([b.f.n[0] * side, 0, b.f.n[2] * side]);
        }
      }
    }
  }
  return at.length === 0 ? undefined : aimedPoints(g, id, at, dirs);
}

/**
 * One row of rivets along each run, on a plate's face: the runs already
 * sit on the face and carry its outward normal (`FACE_NORMAL`), which the
 * heads are aimed along.
 */
function faceRows(g: Graph, id: string, runs: NodeHandle): NodeHandle {
  const samples = g.add(
    pathResample,
    { mode: "spacing", spacing: UPRIGHT_SEAMS.pitch },
    `${id}Samples`,
  );
  const aim = g.add(
    orientAlongVector,
    { direction: attribute(FACE_NORMAL, 3), up: [0, 1, 0], axis: "+y" },
    `${id}Aim`,
  );
  g.connect(runs, "out", samples, "in");
  g.connect(samples, "out", aim, "in");
  return aim;
}

/** A square box lattice of half-width `half` over the given levels. */
function boxLattice(g: Graph, id: string, half: number, ys: readonly number[]): Lattice {
  const levels = ys.map((y) => ({ y, x0: -half, x1: half, z0: -half, z1: half }));
  return stationLattice(g, { id, ring: squareRing(4), closed: true, levels });
}

/** The square ring's corners: squareRing(4) puts one at every 4th station. */
const isCorner = (s: number) => s % 4 === 0;

/** Each kept station's column, bottom to top, as one piece of axis. */
function columns(lat: Lattice, keep: (s: number) => boolean): Array<readonly [Vec3, Vec3]> {
  const P = lat.positions;
  const top = P[P.length - 1]!;
  return P[0]!.flatMap((p, s) => (keep(s) ? [[p, top[s]!] as const] : []));
}

/**
 * Posts: one member up a lattice's non-corner columns (over the levels
 * `keep` allows), solid or laced [estimated: the laced post runs through
 * the nodes, as the solid one does]. A chain carries no face normal, which
 * a laced strut squares itself to, so each post is given its face's: the
 * ring segment from its station crossed with the vertical. A post meets
 * no upright, so it has no joint.
 */
function posts(
  g: Graph,
  lat: Lattice,
  id: string,
  half: number,
  detail: Detail,
  keep: StationMask = (s) => !isCorner(s),
): WebMembers {
  const paths = chains(lat, "Posts", keep);
  if (!isLaced(detail)) return { meshes: [skin(g, `${id}Skin`, paths, half, [1, 0, 0])] };
  const ring = lat.positions[0]!;
  const normals = ring.flatMap((a, s): Vec3[] => {
    if (isCorner(s)) return [];
    const b = ring[(s + 1) % ring.length]!;
    // (b - a) x +y: the segment is level.
    const x = a[2] - b[2];
    const z = b[0] - a[0];
    const l = Math.hypot(x, z);
    return [[x / l, 0, z / l]];
  });
  return webMembers(g, id, withFaces(g, `${id}Faces`, paths, normals), flat(half), detail);
}

/** Seam rows on the given pieces of corner columns, squared to the tower's faces like the uprights. */
function cornerSeams(
  g: Graph,
  id: string,
  name: string,
  pieces: ReadonlyArray<readonly [Vec3, Vec3]>,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  detail: Detail,
): RivetSet[] {
  if (detail.rivets !== true) return [];
  const runs = seamRuns(g, `${id}Seam`, pieces);
  return [{ name, spawn: seamRivets(g, id, runs, halfWidth, [1, 0, 0], UPRIGHT_SEAMS) }];
}

/** The gallery's height: from the floor to the apartment's floor. */
const galleryTop = FLOORS.third + GALLERY.height;

/** Panel 29: the shaft's last panel, a braced 10 m box, and its core carried up through the gallery. */
function panel29(g: Graph, detail: Detail): Parts {
  const { half, bottom, top } = PANEL29;
  const bandTop = bottom + PANEL29_BAND;
  const rowH = (top - bandTop) / PANEL29_ROWS;
  const ys = [bottom, bandTop, ...Array.from({ length: PANEL29_ROWS }, (_, i) => bandTop + rowH * (i + 1))];
  const riveted = detail.rivets === true;

  // The core's columns, three levels: the panel, then on up through the
  // gallery. The corners are the uprights; the posts at the face centres
  // (the merged b/d) go up with them, the others stop at the floor.
  const core = boxLattice(g, "p29", half, [bottom, top, galleryTop]);
  const isMid = (s: number) => s % 4 === 2;
  const corners = chains(core, "Corners", (s) => isCorner(s));
  const postWeb = posts(g, core, "p29Post", P29.post, detail, (s, k) => !isCorner(s) && (isMid(s) || k < 2));

  // The web, face by face in the face's own coordinates: node columns at
  // u = -5, -2.5, 0, 2.5, 5.
  const bays = [-half, -half / 2, 0, half / 2, half];
  const crosses: FaceBar[] = [];
  const band: FaceBar[] = [];
  const lights: FaceBar[] = [];
  for (const f of FACES) {
    for (let b = 0; b < 4; b++) {
      const ua = bays[b]!;
      const ub = bays[b + 1]!;
      for (const p of [-P29.pair, P29.pair]) {
        band.push({ f, u0: ua + p, y0: bottom, u1: ub + p, y1: bandTop });
        band.push({ f, u0: ub + p, y0: bottom, u1: ua + p, y1: bandTop });
      }
      for (let r = 1; r <= PANEL29_ROWS; r++) {
        crosses.push({ f, u0: ua, y0: ys[r]!, u1: ub, y1: ys[r + 1]! });
        crosses.push({ f, u0: ub, y0: ys[r]!, u1: ua, y1: ys[r + 1]! });
      }
      for (let r = 2; r <= PANEL29_ROWS; r++) lights.push({ f, u0: ua, y0: ys[r]!, u1: ub, y1: ys[r]! });
    }
  }
  const bracing = merge(g, "p29Bracing", [
    faceBars(g, "p29Cross", P29.bar, crosses, half),
    faceBars(g, "p29Band", P29.bar, band, half),
  ]);
  const lightSkin = faceBars(g, "p29Light", P29.light, lights, half);

  // The plate girders: hanging from the band's top node, and under the
  // floor's 0.25 build-up ("850" = 0.25 + "600 x 7") [PL-VII Fig. 4]. The
  // base's is the shaft's own top horizontal.
  const plates: Array<readonly [number, number]> = [
    [bandTop - P29.plateDepth, bandTop],
    [top - P29.floorDepth, top - P29.floorDepth + P29.plateDepth],
  ];
  const plateBoxes = plates.flatMap(([y0, y1], i) =>
    FACES.map((f, j) => {
      const c = onFace(f, half, 0, (y0 + y1) / 2);
      const along = 2 * half;
      const thick = 2 * P29.plateHalf;
      const size: Vec3 = f.n[0] !== 0 ? [thick, y1 - y0, along] : [along, y1 - y0, thick];
      return box(g, `p29Plate${i}${j}`, c, size);
    }),
  );

  const rivets: RivetSet[] = [];
  if (riveted) {
    // What a flat bar's end rivet keeps off: the node columns, the plate
    // girders, the shaft's 0.60 horizontal at the base, the light angles.
    const heavy: Rect[] = [
      ...bays.map((u) => ({ u0: u - P29.post, u1: u + P29.post, y0: bottom - 1, y1: galleryTop })),
      ...plates.map(([y0, y1]) => ({ u0: -half, u1: half, y0, y1 })),
      { u0: -half, u1: half, y0: bottom - MEMBERS.horizontal[3]![1], y1: bottom + MEMBERS.horizontal[3]![1] },
    ];
    const lightRects: Rect[] = lights.map((b) => ({
      u0: -half,
      u1: half,
      y0: b.y0 - P29.light,
      y1: b.y0 + P29.light,
    }));
    const barRivets = [
      barEndRivets(g, "p29CrossEnds", crosses, half, P29.bar, [...heavy, ...lightRects]),
      barEndRivets(g, "p29BandEnds", band, half, P29.bar, heavy),
    ].filter((h): h is NodeHandle => h !== undefined);
    rivets.push({ name: "summit.p29.bracing", spawn: rivetSpawn(g, "p29Bar", barRivets) });
    const lightRivets = barEndRivets(g, "p29LightEnds", lights, half, P29.light, heavy);
    if (lightRivets !== undefined) {
      rivets.push({ name: "summit.p29.horizontals", spawn: rivetSpawn(g, "p29LightR", [lightRivets]) });
    }
    // The band's plate girder (the floor's is inside the floor): two rows
    // on each face, between the posts, clear of them.
    const clear = P29.post + END_CLEAR;
    const spans = [0, 1, 2, 3].map((b) => [bays[b]! + clear, bays[b + 1]! - clear] as const);
    const [py0, py1] = plates[0]!;
    const pieces: Array<readonly [Vec3, Vec3]> = [];
    const normals: Vec3[] = [];
    for (const f of FACES) {
      for (const side of [1, -1]) {
        for (const y of [py0 + 0.06, py1 - 0.06]) {
          for (const [ua, ub] of spans) {
            pieces.push([
              onFace(f, half, ua, y, side * P29.plateHalf),
              onFace(f, half, ub, y, side * P29.plateHalf),
            ]);
            normals.push([f.n[0] * side, 0, f.n[2] * side]);
          }
        }
      }
    }
    rivets.push({
      name: "summit.p29.girders",
      spawn: rivetSpawn(g, "p29Plate", [faceRows(g, "p29PlateRow", seamRuns(g, "p29PlateSeam", pieces, normals))]),
    });
  }

  // The uprights' seams, off the floor they pass through (the deck from
  // platforms.ts) and off the balcony deck they end in.
  const cornerAt = (y: number) =>
    [0, 4, 8, 12].map((s) => core.positions[0]![s]!).map((p) => [p[0], y, p[2]] as Vec3);
  // platforms.ts's deck is 0.60 thick under the floor level.
  const floorUnder = top - 0.6;
  const uprightPieces = [
    ...cornerAt(bottom).map((p, i) => [p, cornerAt(floorUnder)[i]!] as const),
    ...cornerAt(top).map((p, i) => [p, cornerAt(galleryTop - BALCONY.deck)[i]!] as const),
  ];

  return {
    uprights: [skin(g, "p29UprightSkin", corners, MEMBERS.upright, [1, 0, 0])],
    bracing: [...postWeb.meshes, bracing],
    horizontals: [lightSkin, ...plateBoxes],
    rivets: [
      ...cornerSeams(g, "p29Upright", "summit.p29.uprights", uprightPieces, MEMBERS.upright, detail),
      ...rivetOutputs({ "summit.p29.posts": postWeb }),
      ...rivets,
    ],
  };
}

/**
 * An octagon's vertices, from the +x face's -z end: round anticlockwise in
 * the plane's own (x, z) axes, so a side's outward normal is its direction
 * turned by (dx, dz) -> (dz, -dx) (`sideNormal`).
 */
function octagon(flatHalf: number, straightHalf: number, y: number): Vec3[] {
  const F = flatHalf;
  const S = straightHalf;
  return [
    [F, y, -S],
    [F, y, S],
    [S, y, F],
    [-S, y, F],
    [-F, y, S],
    [-F, y, -S],
    [-S, y, -F],
    [S, y, -F],
  ];
}

/** Points round a polygon's sides, `bays[i]` to side i, from each vertex (vertex included). */
function bayPoints(poly: readonly Vec3[], bays: (side: number) => number): Array<{ p: Vec3; side: number }> {
  const out: Array<{ p: Vec3; side: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const n = bays(i);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t], side: i });
    }
  }
  return out;
}

/** A polygon side's outward normal, for a polygon round the same way as `octagon`'s. */
function sideNormal(poly: readonly Vec3[], i: number): Vec3 {
  const a = poly[i]!;
  const b = poly[(i + 1) % poly.length]!;
  return unit([b[2] - a[2], 0, a[0] - b[0]]);
}

/**
 * A solid slab whose plan is an octagon — a square `2 flatHalf` wide with
 * its corners cut at 45 degrees to straight sides of `2 straightHalf`:
 * two crossed boxes, and one box turned onto each chamfer that reaches in
 * past the cross.
 */
function octagonSlab(
  g: Graph,
  id: string,
  flatHalf: number,
  straightHalf: number,
  y0: number,
  height: number,
): NodeHandle {
  const yc = y0 + height / 2;
  const cut = flatHalf + straightHalf; // |x| + |z| on a chamfer
  const depth = (2 * flatHalf - cut) / Math.SQRT2;
  const length = Math.SQRT2 * (flatHalf - straightHalf);
  const parts = [
    box(g, `${id}A`, [0, yc, 0], [2 * flatHalf, height, 2 * straightHalf]),
    box(g, `${id}B`, [0, yc, 0], [2 * straightHalf, height, 2 * flatHalf]),
    ...[-45, 45, 135, -135].map((deg, i) => {
      const b = box(g, `${id}C${i}`, [cut / Math.SQRT2 - depth / 2, yc, 0], [depth, height, length]);
      const turned = g.add(transformPoints, { rotateEuler: [0, deg, 0] }, `${id}C${i}Turn`);
      g.connect(b, "out", turned, "in");
      return turned;
    }),
  ];
  return merge(g, id, parts);
}

/** The glazed gallery, the balcony on its roof, and the apartment. */
function gallery(g: Graph): NodeHandle[] {
  const y0 = FLOORS.third;
  const deckUnder = galleryTop - BALCONY.deck;
  const glass = octagon(GALLERY.flat, GALLERY.straight, y0);
  const bays = (i: number) => (i % 2 === 0 ? GALLERY_BAYS.straight : GALLERY_BAYS.chamfer);
  const at = bayPoints(glass, bays);
  const frame = GALLERY_MEMBERS.frame;

  // Mullions, floor to the balcony deck, and the sill, parapet and head rails.
  const mullions = faceSkin(
    g,
    "galleryMullion",
    members(
      g,
      "galleryMullionPaths",
      at.map(({ p }) => [p, [p[0], deckUnder, p[2]]] as const),
      at.map(({ side }) => sideNormal(glass, side)),
    ),
    frame,
  );
  const railY = [y0 + frame, y0 + GALLERY.parapet, deckUnder - frame];
  const rails = skin(
    g,
    "galleryRailSkin",
    loops(g, "galleryRails", railY.map((y) => glass.map((p) => [p[0], y, p[2]] as Vec3))),
    frame,
    [0, 1, 0],
  );
  // The parapet's lattice: an X in every bay.
  const lattice: Array<readonly [Vec3, Vec3]> = [];
  const latticeN: Vec3[] = [];
  const ya = y0 + 2 * frame;
  const yb = y0 + GALLERY.parapet - frame;
  for (let i = 0; i < at.length; i++) {
    const a = at[i]!;
    const b = at[(i + 1) % at.length]!;
    const n = sideNormal(glass, a.side);
    lattice.push([[a.p[0], ya, a.p[2]], [b.p[0], yb, b.p[2]]], [[b.p[0], ya, b.p[2]], [a.p[0], yb, a.p[2]]]);
    latticeN.push(n, n);
  }
  const parapet = faceSkin(
    g,
    "galleryLattice",
    members(g, "galleryLatticePaths", lattice, latticeN),
    GALLERY_MEMBERS.lattice,
  );

  // The balcony: the deck overhanging the glass, and its railing.
  const grow = BALCONY.overhang;
  const bFlat = GALLERY.flat + grow;
  const bStraight = GALLERY.straight + grow * Math.tan(Math.PI / 8);
  const deck = octagonSlab(g, "balconyDeck", bFlat, bStraight, deckUnder, BALCONY.deck);
  const inset = BALCONY.member;
  const rail = octagon(bFlat - inset, bStraight - inset * Math.tan(Math.PI / 8), galleryTop);
  const railAt = bayPoints(rail, bays);
  const m = BALCONY.member;
  const railPosts = faceSkin(
    g,
    "balconyPost",
    members(
      g,
      "balconyPostPaths",
      railAt.map(({ p }) => [p, [p[0], galleryTop + BALCONY.railing - m, p[2]]] as const),
      railAt.map(({ side }) => sideNormal(rail, side)),
    ),
    m,
  );
  const railRails = skin(
    g,
    "balconyRailSkin",
    loops(
      g,
      "balconyRails",
      [galleryTop + BALCONY.railing / 2, galleryTop + BALCONY.railing - m].map((y) =>
        rail.map((p) => [p[0], y, p[2]] as Vec3),
      ),
    ),
    m,
    [0, 1, 0],
  );

  const apartment = box(
    g,
    "apartment",
    [0, galleryTop + APARTMENT.height / 2, 0],
    [APARTMENT.side, APARTMENT.height, APARTMENT.side],
  );
  return [mullions, rails, parapet, deck, railPosts, railRails, apartment];
}

/** The lattice box above the apartment; its meshes are all "summit". */
function cage(g: Graph, y0: number, detail: Detail): Parts {
  const y1 = y0 + CAGE.height;
  const half = CAGE.half;
  // The plates lie inside the box's height, the foot's on the apartment's
  // roof and the head's under the springing, so the lattice has a level at
  // each plate's axis between its two ends.
  const h = CAGE_MEMBERS.horizontal;
  const lat = boxLattice(g, "cage", half, [y0, y0 + h, y1 - h, y1]);
  const joints = { upright: flat(CAGE_MEMBERS.corner) };
  const postWeb = posts(g, lat, "cagePost", CAGE_MEMBERS.post, detail);
  const horizontals = webMembers(
    g,
    "cageHorizontal",
    edges(lat, "Horizontals", 1, 0, (_s, k) => k === 1 || k === 2),
    flat(h),
    detail,
    joints,
  );
  const corners = chains(lat, "Corners", (s) => isCorner(s));

  // The diamond mesh: two families of flat bars, each line clipped to the
  // face between the corner columns and the two plates.
  const u0 = -half + CAGE_MEMBERS.corner;
  const u1 = half - CAGE_MEMBERS.corner;
  const ya = y0 + 2 * h;
  const yb = y1 - 2 * h;
  const slope = Math.tan(CAGE_MESH.angle);
  const run = (yb - ya) / slope;
  const mesh: FaceBar[] = [];
  for (const f of FACES) {
    for (const dir of [1, -1]) {
      // The line u = c + dir (y - ya) / slope, over every c that crosses
      // the face, clipped to [u0, u1] x [ya, yb]: u is monotonic in t = y - ya.
      for (let c = u0 - run + CAGE_MESH.spacing / 2; c < u1 + run; c += CAGE_MESH.spacing) {
        const tu0 = ((u0 - c) * slope) / dir;
        const tu1 = ((u1 - c) * slope) / dir;
        const t0 = Math.max(0, Math.min(tu0, tu1));
        const t1 = Math.min(yb - ya, Math.max(tu0, tu1));
        if (t1 - t0 < 0.2) continue;
        const uAt = (t: number) => c + (dir * t) / slope;
        mesh.push({ f, u0: uAt(t0), y0: ya + t0, u1: uAt(t1), y1: ya + t1 });
      }
    }
  }
  return {
    summit: [
      skin(g, "cageCornerSkin", corners, CAGE_MEMBERS.corner, [1, 0, 0]),
      ...horizontals.meshes,
      ...postWeb.meshes,
      faceBars(g, "cageMesh", CAGE_MEMBERS.bar, mesh, half),
    ],
    gussets: gussetMeshes([horizontals]),
    rivets: [
      ...cornerSeams(g, "cageCorner", "summit.cage.corners", columns(lat, isCorner), CAGE_MEMBERS.corner, detail),
      ...rivetOutputs({
        "summit.cage.posts": postWeb,
        "summit.cage.horizontals": horizontals,
      }),
    ],
  };
}

/**
 * The dome's four half-arches as one lattice of box girders: arch a has
 * stations 4a..4a+3, its chords in ring order round the section (intrados
 * and extrados on the -l side, then extrados and intrados on the +l side,
 * l the arch plane's normal), and level k runs from the springing (k = 0)
 * round the quarter circle to the crown over the axis (k = n). Returns the
 * skinned ribs, the crown's height, and the ribs' rivets when
 * `detail.rivets` asks.
 */
function dome(
  g: Graph,
  springY: number,
  detail: Detail,
): { mesh: NodeHandle; crownY: number; rivets: RivetSet[] } {
  const n = DOME.segments;
  const exR = DOME.radius - DOME.chord;
  const inR = exR - DOME.depth;
  const side = DOME.breadth / 2;
  // Arch a runs along the diagonal d = (+-1, +-1), turning 90 degrees per
  // arch; l = (-dz, dx) is its plane's normal.
  const diag = (a: number): Vec3 => unit([[1, -1, -1, 1][a]!, 0, [1, 1, -1, -1][a]!]);
  const normalOf = (a: number): Vec3 => {
    const d = diag(a);
    return [-d[2], 0, d[0]];
  };
  const chordOf = (s: number) => {
    const j = s % 4;
    return { a: Math.floor(s / 4), rho: j === 0 || j === 3 ? inR : exR, lam: j < 2 ? -side : side };
  };
  const at = (s: number, k: number): Vec3 => {
    const { a, rho, lam } = chordOf(s);
    const d = diag(a);
    const l = normalOf(a);
    const th = (k / n) * (Math.PI / 2);
    const r = k === n ? 0 : rho * Math.cos(th);
    return [r * d[0] + lam * l[0], springY + rho * Math.sin(th), r * d[2] + lam * l[2]];
  };
  const rows = stationRows(16, n + 1, at);
  const ribs = placedLattice(g, "dome", rows);
  // Each station carries its arch's plane normal, which squares its
  // chord's section: a normal read off the position (the old rib's) turns
  // near the crown, where the chords sit off the arch's plane.
  const perPoint = rows.flatMap((row) => row.map((_, s) => normalOf(Math.floor(s / 4))));
  const planeN = g.add(
    setAttribute,
    {
      name: "archN",
      type: "f32",
      tupleSize: 3,
      value: vec(indexTable(perPoint.map((v) => v[0])), 0, indexTable(perPoint.map((v) => v[2]))),
    },
    "domePlaneN",
  );
  g.connect(ribs.stations, "out", planeN, "in");
  const chordLat: Lattice = { ...ribs, stations: planeN };
  const chords = chains(chordLat, "Chords");
  const chordSkin = g.add(
    sweepProfile,
    { profile: "square", radius: DOME.chord, frame: "upHint", up: attribute("archN", 3) },
    "domeChordSkin",
  );
  g.connect(chords, "out", chordSkin, "in");
  // The lacing on all four faces of each girder: a rung at every node and
  // an X in every panel. Round the section, station j meets j + 1 (the -l
  // side, the extrados, the +l side) and 3 meets 0 (the intrados).
  const j = (s: number) => s % 4;
  const lacing = merge(g, "domeLacing", [
    edges(ribs, "Rungs", 1, 0, (s) => j(s) < 3),
    edges(ribs, "RungsIn", -3, 0, (s) => j(s) === 3),
    edges(ribs, "LaceA", 1, 1, (s) => j(s) < 3),
    edges(ribs, "LaceB", -1, 1, (s) => j(s) > 0),
    edges(ribs, "LaceInA", 3, 1, (s) => j(s) === 0),
    edges(ribs, "LaceInB", -3, 1, (s) => j(s) === 3),
  ]);
  const mesh = merge(g, "domeRibs", [chordSkin, faceSkin(g, "domeLacing", lacing, DOME.lacing)]);
  const crownY = springY + DOME.radius;
  if (detail.rivets !== true) return { mesh, crownY, rivets: [] };

  // Both kinds stop at the last node below the crown (level n - 1): the
  // crown's own segment is where the four arches run into one another.
  //
  // SEAMS: a chord is a box member like an upright, so it takes the
  // uprights' seam rows [estimated], one run per segment between nodes,
  // squared, like its skin, to the arch's plane.
  const pieces: Array<readonly [Vec3, Vec3]> = [];
  const faces: Vec3[] = [];
  for (let s = 0; s < 16; s++) {
    for (let k = 0; k < n - 1; k++) {
      pieces.push([rows[k]![s]!, rows[k + 1]![s]!]);
      faces.push(normalOf(Math.floor(s / 4)));
    }
  }
  const seams = seamRivets(
    g,
    "domeChord",
    seamRuns(g, "domeSeam", pieces, faces),
    DOME.chord,
    attribute(FACE_NORMAL, 3),
    UPRIGHT_SEAMS,
  );
  // LACING: at every node of a chord two lacing planes meet it — its side
  // of the girder and its extrados or intrados face — and a rivet takes
  // each through the chord, on its centre line: a head on the chord's
  // two OUTER faces, the ones on the girder's outside (the inner heads are
  // under the lacing bars themselves). On a node the mitred section is
  // stretched along the bend, radially, by 1 / cos(half the turn).
  const stretch = 1 / Math.cos(Math.PI / (4 * n));
  const nodeAt: Vec3[] = [];
  const nodeDir: Vec3[] = [];
  for (let s = 0; s < 16; s++) {
    const { a, rho, lam } = chordOf(s);
    const d = diag(a);
    const l = normalOf(a);
    for (let k = 1; k < n; k++) {
      const p = rows[k]![s]!;
      const th = (k / n) * (Math.PI / 2);
      const radial: Vec3 = [Math.cos(th) * d[0], Math.sin(th), Math.cos(th) * d[2]];
      const outL = Math.sign(lam);
      const outR = rho === exR ? 1 : -1;
      for (const [dir, off] of [
        [[l[0] * outL, 0, l[2] * outL] as Vec3, DOME.chord],
        [[radial[0] * outR, radial[1] * outR, radial[2] * outR] as Vec3, DOME.chord * stretch],
      ] as const) {
        nodeAt.push([p[0] + dir[0] * off, p[1] + dir[1] * off, p[2] + dir[2] * off]);
        nodeDir.push(dir);
      }
    }
  }
  return {
    mesh,
    crownY,
    rivets: [
      { name: "summit.dome.chords", spawn: seams },
      { name: "summit.dome.lacing", spawn: rivetSpawn(g, "domeNode", [aimedPoints(g, "domeNodes", nodeAt, nodeDir)]) },
    ],
  };
}

/** A regular polygon's vertices, the first on +x, round the same way as `octagon`'s. */
function polygon(sides: number, radius: number, y: number): Vec3[] {
  return Array.from({ length: sides }, (_, i) => {
    const t = (2 * Math.PI * i) / sides;
    return [radius * Math.cos(t), y, radius * Math.sin(t)] as Vec3;
  });
}

/** Circumradius of a regular polygon from its width across the flats. */
const circum = (flats: number, sides: number) => flats / 2 / Math.cos(Math.PI / sides);

/**
 * A prism on the axis: a vertical path swept as a `sides`-gon of
 * circumradius `radius` (a number, or a table over height), capped or
 * open. With an up hint of +x the sweep puts a vertex on +z; the roll
 * turns it back a quarter turn, so a vertex sits on +x, as `polygon`'s
 * first does (for the decagons: flats to +-z, the Seine side of PL-XIX
 * Fig. 12, and corners to +-x).
 */
function prism(
  g: Graph,
  id: string,
  sides: number,
  heights: readonly number[],
  radius: number | ReadonlyArray<readonly [number, number]>,
  caps = true,
): NodeHandle {
  const axis = placedLattice(g, id, heights.map((y) => [[0, y, 0] as Vec3]));
  const node = g.add(
    sweepProfile,
    {
      profile: "circle",
      sides,
      radius: typeof radius === "number" ? radius : ramp(component(position(), 1), radius),
      caps,
      frame: "upHint",
      up: [1, 0, 0],
      roll: 0.25,
    },
    `${id}Skin`,
  );
  g.connect(chains(axis, "Axis"), "out", node, "in");
  return node;
}

/** The lantern terrace, the lantern, the cupola, the conductor's cage and the flagpole. */
function lantern(g: Graph, crownY: number): NodeHandle[] {
  const L = LANTERN;
  const deckTop = FLOORS.lanternTerrace;
  const baseTop = deckTop + L.baseHeight;
  const cupolaY = baseTop + L.lanternHeight;
  const cupolaTop = cupolaY + L.cupolaHeight;
  const topY = FLOORS.topTerrace;
  // The normal of the vertical plane through the axis and a point.
  const tangential = vec(mul(component(position(), 2), -1), 0, component(position(), 0));
  const out: NodeHandle[] = [];

  // The terrace: a chamfered square, and its railing just inside the edge.
  const tHalf = L.terrace / 2;
  const tStraight = tHalf - L.chamfer / Math.SQRT2;
  out.push(octagonSlab(g, "lanternTerrace", tHalf, tStraight, crownY, deckTop - crownY));
  const m = 0.025;
  const rail = octagon(tHalf - m, tStraight - m * Math.tan(Math.PI / 8), deckTop);
  const railAt = bayPoints(rail, (i) => (i % 2 === 0 ? 3 : 1));
  out.push(
    faceSkin(
      g,
      "terracePost",
      members(
        g,
        "terracePostPaths",
        railAt.map(({ p }) => [p, [p[0], deckTop + L.railing - m, p[2]]] as const),
        railAt.map(({ side }) => sideNormal(rail, side)),
      ),
      m,
    ),
    skin(
      g,
      "terraceRailSkin",
      loops(
        g,
        "terraceRails",
        [deckTop + L.railing / 2, deckTop + L.railing - m].map((y) => rail.map((p) => [p[0], y, p[2]] as Vec3)),
      ),
      m,
      [0, 1, 0],
    ),
  );

  // The soubassement, and the balcony on its consoles.
  const rBase = circum(L.baseFlats, 10);
  const rBalcony = circum(L.balconyFlats, 10);
  const balconyY = deckTop + L.balconyAt;
  const consoleY = balconyY - L.console;
  out.push(prism(g, "lanternBase", 10, [deckTop, baseTop], rBase));
  out.push(prism(g, "balconyFloor", 10, [balconyY - 0.1, balconyY], rBalcony));
  out.push(prism(g, "balconyParapet", 10, [balconyY, balconyY + L.parapet], rBalcony, false));
  const arcSteps = 8;
  const consoles = placedLattice(
    g,
    "lanternConsoles",
    stationRows(10, arcSteps + 1, (s, k) => {
      const t = (k / arcSteps) * (Math.PI / 2);
      const r = rBase + (rBalcony - rBase) * (1 - Math.cos(t));
      const v = polygon(10, 1, 0)[s]!;
      return [v[0] * r, consoleY + L.console * Math.sin(t), v[2] * r];
    }),
  );
  out.push(skin(g, "lanternConsoleSkin", chains(consoles, "Paths"), 0.04, tangential));

  // The glazed lantern: rings, posts at the corners, and the zigzag of its
  // glazing bars from each foot corner to the head of its side [PL-VII].
  const foot = polygon(10, rBase, baseTop);
  const head = polygon(10, rBase, cupolaY);
  const bars: Array<readonly [Vec3, Vec3]> = [];
  const barN: Vec3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = foot[i]!;
    const b = foot[(i + 1) % 10]!;
    const mid: Vec3 = [(head[i]![0] + head[(i + 1) % 10]![0]) / 2, cupolaY, (head[i]![2] + head[(i + 1) % 10]![2]) / 2];
    const nrm = sideNormal(foot, i);
    bars.push([a, head[i]!], [a, mid], [mid, b]);
    barN.push(nrm, nrm, nrm);
  }
  out.push(
    faceSkin(g, "lanternGlazing", members(g, "lanternGlazingPaths", bars, barN), 0.03),
    skin(g, "lanternRingSkin", loops(g, "lanternRings", [foot, head]), 0.04, [0, 1, 0]),
  );

  // The cupola: straight sides, then a quarter ellipse in to the top deck.
  const rTop = L.topDeckWidth / 2;
  const straightTop = cupolaY + L.cupolaStraight;
  const cupola: Array<readonly [number, number]> = [
    [cupolaY, rBase],
    ...Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * (Math.PI / 2);
      return [straightTop + (cupolaTop - straightTop) * Math.sin(t), rTop + (rBase - rTop) * Math.cos(t)] as const;
    }),
  ];
  out.push(
    prism(
      g,
      "cupola",
      10,
      cupola.map(([y]) => y),
      cupola,
    ),
  );
  out.push(prism(g, "topDeck", 10, [cupolaTop, topY], rTop));

  // The conductor's cage: eight ribs, straight, then closing on the pole,
  // with the top terrace's two rails round the straight part.
  const rCage = L.finialWidth / 2;
  const cageTop = topY + L.finialHeight;
  const bendY = topY + L.finialStraight;
  const poleAt = (y: number) =>
    FLAG_RADIUS.foot + ((FLAG_RADIUS.head - FLAG_RADIUS.foot) * (y - topY)) / (FLOORS.flagTop - topY);
  const rEnd = poleAt(cageTop);
  const ribs = placedLattice(
    g,
    "finial",
    stationRows(8, 10, (s, k) => {
      const v = polygon(8, 1, 0)[s]!;
      let r = rCage;
      let y = topY;
      if (k >= 1) {
        const t = ((k - 1) / 8) * (Math.PI / 2);
        r = rEnd + (rCage - rEnd) * Math.cos(t);
        y = bendY + (cageTop - bendY) * Math.sin(t);
      }
      return [v[0] * r, y, v[2] * r];
    }),
  );
  out.push(skin(g, "finialRibSkin", chains(ribs, "Paths"), 0.03, tangential));
  out.push(
    skin(
      g,
      "finialRailSkin",
      loops(g, "finialRails", [topY + 0.5, topY + 1.0].map((y) => polygon(8, rCage, y))),
      0.025,
      [0, 1, 0],
    ),
  );

  // The flagpole.
  out.push(
    prism(
      g,
      "flagpole",
      12,
      [topY, FLOORS.flagTop],
      [
        [topY, FLAG_RADIUS.foot],
        [FLOORS.flagTop, FLAG_RADIUS.head],
      ],
    ),
  );
  return out;
}

/** Build panel 29, the 3rd-floor gallery and apartment, and the campanile, at the given detail. */
export function buildSummit(g: Graph, detail: Detail = {}): Parts {
  const roomTop = galleryTop + APARTMENT.height;
  const cageTop = roomTop + CAGE.height;
  const { mesh: ribs, crownY, rivets: ribRivets } = dome(g, cageTop, detail);
  const cageParts = cage(g, roomTop, detail);

  const summit: NodeHandle[] = [
    ...gallery(g),
    ...(cageParts.summit ?? []),
    ribs,
    ...lantern(g, crownY),
  ];
  return joinParts(panel29(g, detail), {
    summit,
    gussets: cageParts.gussets ?? [],
    rivets: [...(cageParts.rivets ?? []), ...ribRivets],
  });
}
