/**
 * Panel 29, the 3rd floor, and the 1889 campanile above it.
 *
 * Bottom to top, every level chained from the 3rd floor (PL-VII Fig. 4 and
 * Plate I; tags as in `spec.ts`):
 *
 * 1. PANEL 29 [sourced]: a prismatic box 10.00 m axis to axis, 11.23 m
 *    tall, from the top of panel 28 (y 264.90) to the 3rd floor (276.13),
 *    4 bays of 2.50 m per face. The rows are not printed: 4 rows of
 *    2.8075 m, so every cell is near-square [estimated]. A station lattice
 *    on `squareRing(4)`: the four corners are the uprights that continue
 *    the shaft's c, the other twelve columns (the merged b/d among them)
 *    are posts, and every cell carries an X. Its bottom ring is the
 *    shaft's top ring, horizontals included, so panel 29 starts its own
 *    horizontals one row up rather than drawing that ring twice. The web is
 *    lighter than the shaft's 0.50 m bars, because the bays are 2.50 m
 *    rather than 8-10 m [estimated].
 * 2. THE ROOM: the enclosed 3rd-floor room, 16.56 m wide at floor level
 *    [sourced, PL-VII "16,560"; PL-XXXI prints 16.500] and 4.850 up to the
 *    balcony and apartment level [sourced], at y 280.98 [derived].
 * 3. THE LATTICE BOX ("cylindre"): 4.500 tall [sourced] to y 285.48
 *    [derived]. Its plan is not printed; it continues panel 29's 10 m
 *    [estimated], in two rows of the same 2.50 m bays [estimated], built
 *    like panel 29: corner columns, posts, an X in every cell.
 * 4. THE DOME: "four metal semicircular arches met above the 3rd floor to
 *    carry a small platform topped by the lighthouse lantern" [sourced,
 *    operator's history page], labelled "grandes poutres diagonales" on
 *    PL-VII: four lattice half-arches along the box's DIAGONALS, springing
 *    from its corners and meeting over the axis. A semicircle across the
 *    14.142 m diagonal rises 7.071 m, short of the printed 7.435 [sourced],
 *    so the arch is stilted: a vertical 0.364 m [derived] at the springing,
 *    then the quarter circle. The crown of the extrados is at y 292.915
 *    [derived]. Each rib is two chords 0.80 m apart with X lacing, 12 arc
 *    segments [estimated].
 * 5. THE LANTERN TERRACE, whose floor is printed at 293.215 [sourced].
 *    The chain prints 0.250 from the dome to it, which would put it at
 *    293.165: the 0.05 m discrepancy the spec leaves open. The printed
 *    floor wins, so the terrace deck runs from the crown to 293.215 and is
 *    0.300 thick. (The alternative reading of the dome's rise, 7.485, would
 *    close the chain exactly.) Its width 5.750 is printed on PL-VII; that
 *    it belongs to the terrace is [estimated].
 * 6. THE LANTERN ("phare"): 3.980 base ("soubassement"), 1.140 glazed
 *    lantern, 2.055 cupola, 0.125 top terrace deck [sourced heights], which
 *    close on the printed top terrace at 300.515 to the millimetre
 *    [derived]. The widths 2.686 and 1.700 are printed; which part each
 *    belongs to is [estimated]: a 2.686 square base, a 2.686 glazed drum, a
 *    cupola narrowing to 1.700, and a 2.686 top deck. PL-VII's 1.200
 *    finial is left out.
 * 7. THE FLAGPOLE: 11.760 above the top terrace, to y 312.275 [sourced];
 *    its diameter, 0.24 tapering to 0.12, is [estimated].
 *
 * Panel 29 is sorted like the shaft (uprights, bracing, horizontals);
 * everything from the room up is the "summit" class.
 *
 * DETAIL, as for the legs and the shaft (`Detail`). With `lacedWeb` the web
 * of panel 29 and of the lattice box — posts, X bars and horizontals —
 * becomes laced struts (`webMembers`), and the X bars and horizontals take
 * gusset plates where they end on a node. Those nodes are corner uprights
 * or posts: panel 29's corners are the shaft's uprights continued, 0.25
 * [sourced, `MEMBERS.upright` up here], the box's are its own corner
 * columns, and a post is lighter than either, so every joint starts clear
 * of an upright-sized node [estimated]. With `rivets` the struts carry their
 * lacing and joint rivets, the corner columns of both boxes carry seam rows
 * (the uprights' pitch and inset, strut.ts), and the dome's ribs, which are
 * already lattice girders, carry rivets of their own: seam rows along both
 * chords, and one rivet on each side face of a chord at every node its
 * lacing meets — the struts' rule of one rivet per chord face per lacing
 * node [estimated]. Every rivet set is its own output,
 * `rivets.summit.<part>`. The defaults build what this module always did.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  attribute,
  component,
  filterByExpression,
  ge,
  le,
  mergePoints,
  mul,
  normalize,
  orientAlongVector,
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
  gussetMeshes,
  rivetOutputs,
  seamRivets,
  webMembers,
} from "./strut.js";

/** Panel 29's rows of cells [estimated]. */
const PANEL29_ROWS = 4;
/** Panel 29's web (posts and X), a half-width [estimated]. */
const PANEL29_WEB = MEMBERS.girderBar;

/** The enclosed 3rd-floor room [sourced]. */
const ROOM = { side: 16.56, height: 4.85 } as const;

/** The lattice box above the room: height [sourced], plan and rows [estimated]. */
const CAGE = { height: 4.5, half: PANEL29.half, rows: 2 } as const;
/** The cage's members, as half-widths [estimated]. */
const CAGE_MEMBERS = { corner: 0.2, horizontal: 0.15, web: 0.1 } as const;

/** The dome: rise [sourced]; rib depth, arc segments and members [estimated]. */
const DOME = { rise: 7.435, depth: 0.8, segments: 12, chord: 0.15, lacing: 0.08 } as const;

/** The lantern stack [sourced heights and widths; assignment estimated]. */
const LANTERN = {
  terraceWidth: 5.75,
  baseHeight: 3.98,
  lanternHeight: 1.14,
  cupolaHeight: 2.055,
  topDeck: 0.125,
  wide: 2.686,
  narrow: 1.7,
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
 * millimetre short, its last step is 0.099 instead.
 */
const RUN_SHORT = 0.001;

/** A named rivet spawner, as `Parts.rivets` holds them. */
type RivetSet = { name: string; spawn: NodeHandle };

/** A (height, half-width) table holding one value at every height. */
function flat(w: number): ReadonlyArray<readonly [number, number]> {
  return [
    [0, w],
    [FLOORS.flagTop, w],
  ];
}

/** A (height, value) stop table read at y, as a skin's ramp reads it. */
function stopAt(stops: ReadonlyArray<readonly [number, number]>, y: number): number {
  const first = stops[0]!;
  if (y <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const [y0, v0] = stops[i - 1]!;
    const [y1, v1] = stops[i]!;
    if (y <= y1) return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return stops[stops.length - 1]![1];
}

/** Whether the web is built as laced struts: `rivets` implies the lacing. */
const isLaced = (detail: Detail) => detail.lacedWeb === true || detail.rivets === true;

/** A square box lattice of half-width `half` between two heights. */
function boxLattice(g: Graph, id: string, half: number, y0: number, y1: number, rows: number) {
  const levels = Array.from({ length: rows + 1 }, (_, k) => ({
    y: y0 + ((y1 - y0) * k) / rows,
    x0: -half,
    x1: half,
    z0: -half,
    z1: half,
  }));
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

/**
 * Seam runs over pieces of members' axes: each piece [a, b] cut to a whole
 * number of seam pitches, centred on it, so its rows keep at least half a
 * pitch clear of either end. `seamRivets` takes these in place of the
 * members' own paths, which would put a row ON each end: on the shaft's
 * last row where panel 29 continues its uprights, half into the room and
 * the cage standing on it, and — on a curved rib — astride a kink, where
 * the mitred skin's concave faces meet a centimetre short of the node, so
 * a row squared to one segment sinks into the next. With `faces`, each run
 * carries its piece's face normal (`FACE_NORMAL`).
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
  const lat = placedLattice(g, id, [runs.map((r) => r[0]), runs.map((r) => r[1])]);
  const paths = chains(lat, "Runs");
  return faces === undefined ? paths : withFaces(g, `${id}Faces`, paths, faces);
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

/**
 * A box lattice's posts: one member up the whole lattice, solid or laced
 * [estimated: the laced post runs through the nodes, as the solid one
 * does]. A chain carries no face normal, which a laced strut squares
 * itself to, so each post is given its face's: the ring segment from its
 * station crossed with the vertical. A post meets no upright, so it has no
 * joint.
 */
function posts(g: Graph, lat: Lattice, id: string, half: number, detail: Detail): WebMembers {
  const keep: StationMask = (s) => !isCorner(s);
  const paths = chains(lat, "Posts", keep);
  if (!isLaced(detail)) return { meshes: [skin(g, `${id}Skin`, paths, half, [1, 0, 0])] };
  const ring = lat.positions[0]!;
  const normals = ring.flatMap((a, s): Vec3[] => {
    if (!keep(s, 0)) return [];
    const b = ring[(s + 1) % ring.length]!;
    // (b - a) x +y: the segment is level.
    const x = a[2] - b[2];
    const z = b[0] - a[0];
    const l = Math.hypot(x, z);
    return [[x / l, 0, z / l]];
  });
  return webMembers(g, id, withFaces(g, `${id}Faces`, paths, normals), flat(half), detail);
}

/**
 * Seam rows on a box lattice's corner columns, squared to the tower's faces
 * like the uprights, when `detail.rivets` asks.
 */
function cornerSeams(
  g: Graph,
  lat: Lattice,
  id: string,
  name: string,
  halfWidth: ReadonlyArray<readonly [number, number]> | number,
  detail: Detail,
): RivetSet[] {
  if (detail.rivets !== true) return [];
  const runs = seamRuns(g, `${id}Seam`, columns(lat, isCorner));
  return [{ name, spawn: seamRivets(g, id, runs, halfWidth, [1, 0, 0], UPRIGHT_SEAMS) }];
}

/** Panel 29: the shaft's last panel, a braced 10 m box. */
function panel29(g: Graph, detail: Detail): Parts {
  const lat = boxLattice(g, "p29", PANEL29.half, PANEL29.bottom, PANEL29.top, PANEL29_ROWS);
  const corners = chains(lat, "Corners", (s) => isCorner(s));
  // A web member ends on a corner, the shaft's upright continued, or on a
  // post; the joint keeps an upright's clearance at both (see the header).
  const joints = { upright: MEMBERS.upright };
  const postWeb = posts(g, lat, "p29Post", PANEL29_WEB, detail);
  const crosses = merge(g, "p29Crosses", [edges(lat, "CrossA", 1, 1), edges(lat, "CrossB", -1, 1)]);
  const bracing = webMembers(g, "p29Bracing", crosses, flat(PANEL29_WEB), detail, joints);
  // k = 0 is the shaft's top ring, whose horizontals the shaft already draws.
  const horizontals = webMembers(
    g,
    "p29Horizontal",
    edges(lat, "Horizontals", 1, 0, (_s, k) => k > 0),
    flat(stopAt(MEMBERS.horizontal, PANEL29.top)),
    detail,
    joints,
  );
  return {
    uprights: [skin(g, "p29UprightSkin", corners, MEMBERS.upright, [1, 0, 0])],
    bracing: [...postWeb.meshes, ...bracing.meshes],
    horizontals: horizontals.meshes,
    gussets: gussetMeshes([bracing, horizontals]),
    rivets: [
      ...cornerSeams(g, lat, "p29Upright", "summit.p29.uprights", MEMBERS.upright, detail),
      ...rivetOutputs({
        "summit.p29.posts": postWeb,
        "summit.p29.bracing": bracing,
        "summit.p29.horizontals": horizontals,
      }),
    ],
  };
}

/** The lattice box above the room; its meshes are all "summit". */
function cage(g: Graph, y0: number, detail: Detail): Parts {
  const lat = boxLattice(g, "cage", CAGE.half, y0, y0 + CAGE.height, CAGE.rows);
  const joints = { upright: flat(CAGE_MEMBERS.corner) };
  const postWeb = posts(g, lat, "cagePost", CAGE_MEMBERS.web, detail);
  const crosses = merge(g, "cageCrosses", [
    edges(lat, "CrossA", 1, 1),
    edges(lat, "CrossB", -1, 1),
  ]);
  const bracing = webMembers(g, "cageBracing", crosses, flat(CAGE_MEMBERS.web), detail, joints);
  const horizontals = webMembers(
    g,
    "cageHorizontal",
    edges(lat, "Horizontals", 1, 0),
    flat(CAGE_MEMBERS.horizontal),
    detail,
    joints,
  );
  const corners = chains(lat, "Corners", (s) => isCorner(s));
  return {
    summit: [
      skin(g, "cageCornerSkin", corners, CAGE_MEMBERS.corner, [1, 0, 0]),
      ...horizontals.meshes,
      ...postWeb.meshes,
      ...bracing.meshes,
    ],
    gussets: gussetMeshes([bracing, horizontals]),
    rivets: [
      ...cornerSeams(g, lat, "cageCorner", "summit.cage.corners", CAGE_MEMBERS.corner, detail),
      ...rivetOutputs({
        "summit.cage.posts": postWeb,
        "summit.cage.bracing": bracing,
        "summit.cage.horizontals": horizontals,
      }),
    ],
  };
}

/**
 * The dome's four half-arches as one lattice: station 2a is arch a's
 * intrados, 2a + 1 its extrados, and level k runs from the springing
 * (k = 0) through the top of the stilt (k = 1) round the quarter circle to
 * the crown on the axis. Returns the skinned ribs, the crown's height, and
 * the ribs' rivets when `detail.rivets` asks.
 */
function dome(
  g: Graph,
  springY: number,
  detail: Detail,
): { mesh: NodeHandle; crownY: number; rivets: RivetSet[] } {
  const span = CAGE.half * Math.SQRT2; // the springing's radius: a box corner
  const stilt = DOME.rise - span;
  const centreY = springY + stilt;
  const n = DOME.segments;
  const rows = stationRows(8, n + 2, (s, k) => {
    const a = Math.floor(s / 2);
    const rho = s % 2 === 1 ? span : span - DOME.depth;
    // Arch a runs along the diagonal (+-1, +-1), turning 90 degrees per arch.
    const dx = [1, -1, -1, 1][a] as number;
    const dz = [1, 1, -1, -1][a] as number;
    let r: number;
    let y: number;
    if (k === 0) {
      r = rho;
      y = springY;
    } else if (k === n + 1) {
      r = 0;
      y = centreY + rho;
    } else {
      const theta = ((k - 1) / n) * (Math.PI / 2);
      r = rho * Math.cos(theta);
      y = centreY + rho * Math.sin(theta);
    }
    return [(r * dx) / Math.SQRT2, y, (r * dz) / Math.SQRT2];
  });
  const lat = placedLattice(g, "dome", rows);
  const isIntrados = (s: number) => s % 2 === 0;
  const chords = chains(lat, "Chords");
  const lacing = merge(g, "domeLacing", [
    edges(lat, "Rungs", 1, 0, (s) => isIntrados(s)),
    edges(lat, "LaceA", 1, 1, (s) => isIntrados(s)),
    edges(lat, "LaceB", -1, 1, (s) => !isIntrados(s)),
  ]);
  // Square sections rolled square to each arch's own plane: (-z, 0, x) is
  // that plane's normal. On the axis it vanishes and sweepProfile falls
  // back to [0, 0, 1], which a horizontal diagonal tangent turns into the
  // same normal, so the crown's rings are rolled right too.
  const archNormal = vec(mul(component(position(), 2), -1), 0, component(position(), 0));
  const rib = (id: string, paths: NodeHandle, radius: number) => {
    const node = g.add(
      sweepProfile,
      { profile: "square", radius, frame: "upHint", up: archNormal },
      id,
    );
    g.connect(paths, "out", node, "in");
    return node;
  };
  const mesh = merge(g, "domeRibs", [
    rib("domeChordSkin", chords, DOME.chord),
    rib("domeLacingSkin", lacing, DOME.lacing),
  ]);
  const crownY = centreY + span;
  if (detail.rivets !== true) return { mesh, crownY, rivets: [] };

  // Both kinds stop at the last node below the crown (level n): the crown's
  // own segment is where the four arches run into one another, and there
  // the arch's normal vanishes.
  //
  // SEAMS: a chord is a box member like an upright, so it takes the
  // uprights' seam rows [estimated], one run per segment between nodes —
  // squared, like its skin, to the arch's plane.
  // The runs carry the arch's normal as their face normal rather than the
  // rows reading `archNormal`: a row is aimed where it lands, off the rib's
  // plane, and a normal that is a field of position turns there.
  const pieces: Array<readonly [Vec3, Vec3]> = [];
  const faces: Vec3[] = [];
  for (let s = 0; s < 8; s++) {
    for (let k = 0; k < n; k++) {
      const a = rows[k]![s]!;
      const l = Math.hypot(a[0], a[2]);
      pieces.push([a, rows[k + 1]![s]!]);
      faces.push([-a[2] / l, 0, a[0] / l]);
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
  // LACING: at every node of a chord its lacing bars meet it, and a rivet
  // takes them through each side face, on the chord's centre line, midway
  // between that face's two seam rows. The springing's node (k = 0) is left
  // out: it stands on the lattice box, and its rivet would sit on the
  // chord's cut end.
  const level = attribute("k");
  const nodes = g.add(
    filterByExpression,
    { predicate: mul(ge(level, 1), le(level, n)) },
    "domeNodes",
  );
  g.connect(lat.stations, "out", nodes, "in");
  // Aimed on the node, then moved: read off the rib's plane, the arch's
  // normal would turn.
  const side = normalize(archNormal);
  const heads = [1, -1].map((sign) => {
    const name = `domeNode${sign > 0 ? "Out" : "In"}`;
    const out = mul(side, sign);
    const aim = g.add(
      orientAlongVector,
      { direction: out, up: [0, 1, 0], axis: "+y" },
      `${name}Aim`,
    );
    const at = g.add(transformPoints, { translate: mul(out, DOME.chord) }, name);
    g.connect(nodes, "out", aim, "in");
    g.connect(aim, "out", at, "in");
    return at;
  });
  return {
    mesh,
    crownY,
    rivets: [
      { name: "summit.dome.chords", spawn: seams },
      { name: "summit.dome.lacing", spawn: rivetSpawn(g, "domeNode", heads) },
    ],
  };
}

/** A box standing on `y0`, `side` square in plan and `height` tall. */
function slab(g: Graph, id: string, side: number, y0: number, height: number): NodeHandle {
  return box(g, id, [0, y0 + height / 2, 0], [side, height, side]);
}

/**
 * The round parts on the axis: the glazed lantern, the cupola and the
 * flagpole, three 2-point paths swept as circles. One radius field serves
 * all three because their heights do not overlap: it is keyed on height,
 * and the lantern's top and the cupola's foot share both height and radius.
 */
function roundParts(
  g: Graph,
  lanternY: number,
  cupolaY: number,
  cupolaTop: number,
  flagY: number,
): NodeHandle {
  const spans: ReadonlyArray<readonly [number, number]> = [
    [lanternY, cupolaY],
    [cupolaY, cupolaTop],
    [flagY, FLOORS.flagTop],
  ];
  const lat = placedLattice(g, "round", stationRows(spans.length, 2, (s, k) => [
    0,
    (spans[s] as readonly [number, number])[k] as number,
    0,
  ]));
  const radius = ramp(component(position(), 1), [
    [lanternY, LANTERN.wide / 2],
    [cupolaY, LANTERN.wide / 2],
    [cupolaTop, LANTERN.narrow / 2],
    [flagY, FLAG_RADIUS.foot],
    [FLOORS.flagTop, FLAG_RADIUS.head],
  ]);
  const node = g.add(sweepProfile, { profile: "circle", sides: 16, radius, caps: true }, "roundSkin");
  g.connect(chains(lat, "Axis"), "out", node, "in");
  return node;
}

/** Build panel 29, the 3rd-floor room and the campanile, at the given detail. */
export function buildSummit(g: Graph, detail: Detail = {}): Parts {
  const roomTop = FLOORS.third + ROOM.height;
  const cageTop = roomTop + CAGE.height;
  const { mesh: ribs, crownY, rivets: ribRivets } = dome(g, cageTop, detail);
  const cageParts = cage(g, roomTop, detail);

  // The lantern stack, from the printed lantern terrace up; it closes on
  // the printed top terrace (FLOORS.topTerrace) exactly.
  const baseY = FLOORS.lanternTerrace;
  const lanternY = baseY + LANTERN.baseHeight;
  const cupolaY = lanternY + LANTERN.lanternHeight;
  const cupolaTop = cupolaY + LANTERN.cupolaHeight;
  const flagY = FLOORS.topTerrace;

  const summit: NodeHandle[] = [
    slab(g, "room", ROOM.side, FLOORS.third, ROOM.height),
    ...(cageParts.summit ?? []),
    ribs,
    slab(g, "lanternTerrace", LANTERN.terraceWidth, crownY, FLOORS.lanternTerrace - crownY),
    slab(g, "lanternBase", LANTERN.wide, baseY, LANTERN.baseHeight),
    roundParts(g, lanternY, cupolaY, cupolaTop, flagY),
    slab(g, "topTerrace", LANTERN.wide, flagY - LANTERN.topDeck, LANTERN.topDeck),
  ];
  return joinParts(panel29(g, detail), {
    summit,
    gussets: cageParts.gussets ?? [],
    rivets: [...(cageParts.rivets ?? []), ...ribRivets],
  });
}
