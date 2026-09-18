/**
 * The lifts and the stairs, as they ran in 1889.
 *
 * Eiffel's album gives the lifts their own plates (SOURCES.md §11): Plate
 * XX is a vertical section along the diagonal from pile 1 (Nord) to pile 3
 * (Sud), Plate XXI the general plan, XXII ter the Otis track and car, XXIII
 * the Roux, Combaluzier et Lepape machine, XXIII ter the Edoux lift at the
 * 2nd floor and the intermediate landing, XXVIII the stair from the ground
 * to the 1st floor.
 *
 * WHICH LIFT IN WHICH LEG [sourced PL-XX, PL-XXI]:
 * - piles 1 (Nord) and 3 (Sud): Otis, « du rez-de-chaussée (35.08) au 2e
 *   étage (149.23), soit à 114m15 avec arrêt facultatif au 1er étage »;
 * - piles 2 (Est) and 4 (Ouest): Roux, Combaluzier et Lepape (articulated
 *   pistons), ground to the 1st floor (91.13);
 * - the Edoux, « ascenseur vertical … établi au centre de la Tour », 2nd
 *   floor to 3rd, in two stages of 80.20 with the change of car at the
 *   intermediate landing (229.43, y 195.93).
 * The model has no compass of its own; it follows `platforms.ts`, which
 * lays Plate XVIII out as the render's top view: pile 4 Ouest is the +x+z
 * leg (quadrant target 0), then 3 Sud (1), 2 Est (2), 1 Nord (3). So the
 * Otis legs are the ODD quadrant targets and the Roux legs the EVEN ones.
 *
 * THE INCLINED TRACKS. Plate XXI draws every track on its pile's diagonal
 * (Plate XXII ter labels the beam's centre line "Diagonale de la Tour"), so
 * a track lies in the vertical plane through the tower's axis and the leg's
 * diagonal, between the inner corner a and the leg's centre. Each is two
 * plate girders 1.300 deep, 3.800 apart axis to axis, 0.235 top flanges,
 * the rails on top [sourced PL-XXII ter, "Coupe verticale CD"]; the car
 * rolls on their upper side, which faces up and OUT, away from the axis.
 * The Otis base slope is the leg's: « composante … suivant l'inclinaison de
 * la voie … 0.815 » = sin 54.6° [sourced PL-XXI], the leg's diagonal lean
 * (§2.5). Above the 1st floor the track curves with the leg. Where it runs
 * in the leg is only drawn, not dimensioned: measured on Plate XX at
 * 1:200 the rail line stands about 3.3 m out from a (along the diagonal)
 * below the 1st floor, 4.6 m at nodes XXI-XX, 4.0 m at the 2nd floor
 * [estimated, ±0.5]. Below the 1st floor that reading puts the girders'
 * feet through the inner faces, so there the rail stands 4.2 out, the
 * least that clears them (see `RAIL_OFFSET`). The table is read at every
 * node, so the track bends where the leg bends. The Otis beam runs on
 * about 9.9 m above the 2nd floor to its pulleys [estimated, PL-XX Fig. 3],
 * past the line of b and d into the open middle, where a has ended and the
 * leg's inner faces carry no members;
 * the Roux circuit's top pulleys stand at the top of panel 6, node XXII
 * [sourced label, PL-XXIII Fig. 2]. The Roux track's gauge is not printed:
 * its two chain casings are about 2.8 apart on PL-XXIII Fig. 11
 * [estimated].
 *
 * THE CARS. Both systems ran double-deck cars: Otis 50 passengers, Roux
 * 100 [sourced PL-XX, PL-XXI]. Otis decks 4.670 long [sourced PL-XXII ter
 * Fig. 1], 3.169 inside across [sourced Fig. 2], on a 3.800 frame; heights
 * and the Roux decks [estimated]. The floors are level and the upper deck
 * sits back up the slope, the stepped car of PL-XX, and the car rides
 * BETWEEN its girders, dipping into the trough they make above the ties
 * [estimated]. Where each car stands is a chosen moment [estimated].
 *
 * THE EDOUX [sourced PL-XX, PL-XXIII ter]. Two cars counterbalanced by four
 * cables over pulleys at the top: the upper car, lifted by two pistons 80.20
 * long from two cylinders standing between the 2nd floor and the landing,
 * runs landing → 3rd floor; the lower car, its counterweight, runs 2nd
 * floor → landing. « Les deux cabines arrivent simultanément au niveau du
 * plancher intermédiaire », so they run SIDE BY SIDE: on the plan at the
 * landing their axes are 5.300 apart, 2.650 each side of the tower's axis;
 * each car 3.570 × 3.900; the pistons (upper car) and the guides (lower
 * car) 4.064 apart on the cars' centre line, 0.247 beyond each end. Plate
 * XX's section along the N–S diagonal shows them side by side, so they line
 * up on that diagonal: the upper car (and its cylinders) on the NORD side,
 * the lower car on the SUD side; between them the central guide post
 * "890 × 600" on the axis (first digit [estimated]), and a "500 × 600"
 * guide post outboard of each car. Seen face-on, as Plate I draws it,
 * this is the dense strip up the middle between the converging legs: a
 * central column about 0.8 wide and one each side, 3.6 off the axis and
 * about 1.0 wide, from the 2nd floor up [estimated, measured on Plate I];
 * the outboard posts are placed from that reading.
 *
 * THE STAIRS [sourced PL-XX legend, PL-XXVIII, E1900-TXT]:
 * - ground → 1st floor: « Un escalier de 1m00 de large … Il y en a un dans
 *   la pile 2 et un dans la pile 4; les piles 1 et 3 n'ont pas d'escalier
 *   partant du rez-de-chaussée ». Straight flights and landings, drawn "en
 *   diagonale" on PL-XXVIII Fig. 1: landings 1.300, a pattern repeating
 *   every 7.8555 of height and climbing the leg's own lean, « pente de 1m407
 *   pour 1m00 », so it shifts 5.583 inward per repeat [derived]. Two flights
 *   rise inward, the third comes back, « ménager le passage de la cabine »
 *   (E1900-TXT). Here that is three flights of 15 risers per repeat, treads
 *   0.25 [sourced text], the return flight in a second lane beside the
 *   first, both lanes clear of the car beside the diagonal [estimated].
 * - 1st → 2nd floor: « Escalier tournant de 1m60 de diamètre … il y en a
 *   quatre semblables, un dans chaque pile ». One helix per panel near the
 *   outer corner c (PL-XX Figs 3–4), joined by straight flights of 11
 *   risers of 0.207; treads 0.64 wide, risers 0.178 [sourced text]. Their
 *   plan position in the leg [estimated].
 * - 2nd → 3rd floor (service only): e2 « escalier tournant conduisant du 2e
 *   étage à l'étage intermédiaire », Ø 1.600, and e3 from the landing to
 *   the 3rd, Ø 1.680 [sourced PL-XX Fig. 2, reading]. They take the halves
 *   of the shaft the cars leave free: e2 under the upper car's run, e3 over
 *   the lower car's. e3 is modelled to the 3rd floor; the plate stops it at
 *   an « escalier de raccord » in panels 26–27, not built.
 *
 * Everything here is boxes (no `normal`, so copying the meshes onto the
 * quadrant targets is safe) except the helices' hand rails, which are paths
 * copied BEFORE they are skinned. Tracks and the Edoux guides go in
 * "girders"; cars, the Edoux cars and the stairs in "platforms".
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  copyToPoints,
  filterByExpression,
  ge,
  index,
  lt,
  mod,
  pointGrid,
  pointsToPath,
  setAttribute,
  vec,
} from "pcg-ts";
import { type Vec3, box, copyToQuadrants, indexTable, merge, skin } from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { FLOORS, NODES, profileAt } from "./spec.js";

type Quat = readonly [number, number, number, number];

/**
 * A box by its frame: centre, the directions of its local x and y (unit,
 * perpendicular; z is x × y), and its size along each.
 */
interface Block {
  readonly at: Vec3;
  readonly x: Vec3;
  readonly y: Vec3;
  readonly size: Vec3;
}

const SQ2 = Math.SQRT2;
const UP: Vec3 = [0, 1, 0];
/** Out along the +x+z leg's diagonal, horizontal. */
const U: Vec3 = [1 / SQ2, 0, 1 / SQ2];
/** Across that diagonal, horizontal. */
const E: Vec3 = [1 / SQ2, 0, -1 / SQ2];

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / Math.hypot(p[0], p[1], p[2]));

/** A point of the +x+z leg: r out along its diagonal, y up, l across it. */
function onDiag(r: number, y: number, l = 0): Vec3 {
  return [(r + l) / SQ2, y, (r - l) / SQ2];
}

/** A vector in the leg's diagonal plane: dr along it, dy up. */
const inPlane = (dr: number, dy: number): Vec3 => [dr / SQ2, dy, dr / SQ2];

/** The outer corner c and the inner corner a, as distances along the diagonal. */
const cornerC = (y: number): number => SQ2 * profileAt(y).outer;
const cornerA = (y: number): number => SQ2 * profileAt(y).inner;

/** Linear read of a (key, value) table, clamped at its ends. */
function readTable(table: ReadonlyArray<readonly [number, number]>, t: number): number {
  const first = table[0] as readonly [number, number];
  if (t <= first[0]) return first[1];
  for (let i = 1; i < table.length; i++) {
    const [t1, v1] = table[i] as readonly [number, number];
    if (t <= t1) {
      const [t0, v0] = table[i - 1] as readonly [number, number];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return (table[table.length - 1] as readonly [number, number])[1];
}

/**
 * The rail line's distance OUT from the inner corner a, along the diagonal,
 * by height [estimated]. Measured on Plate XX at 1:200 it reads about 3.3
 * below the 1st floor, 3.9 at node XXII, 4.6-4.75 at XXI-XX, 4.0 at the
 * 2nd floor, each ±0.5 or so. Below the 1st floor that cannot be the whole
 * story: a girder 1.9 off the diagonal whose foot sits 1.30 down the
 * track's normal reaches the inner faces' plane unless the rail stands
 * about 4.2 out from a [derived: 1.9 + 0.12 flange + 1.30 sin 54.6°, plus
 * the face's lean over the girder's 0.75 drop, plus 0.4 √2 so the face's
 * struts clear by 0.4: 4.18]. So the table takes the larger of the two at
 * every node.
 */
const RAIL_OFFSET: ReadonlyArray<readonly [number, number]> = [
  [0, 4.2],
  [50.4, 4.2],
  [57.4, 4.3],
  [68.4, 4.4],
  [79.4, 4.7],
  [90.4, 4.6],
  [100.6, 4.4],
  [110.6, 4.2],
  [115.5, 4.1],
];

/** The lift girders [sourced PL-XXII ter "Coupe verticale CD"]. */
const GIRDER = { depth: 1.3, flange: 0.235 } as const;

interface TrackSpec {
  /** Rail axis to rail axis. */
  readonly gauge: number;
  /** Where the beam ends, up top. */
  readonly top: number;
}

/** Otis: 3.800 [sourced]; the beam ends ~9.9 above the 2nd floor [estimated]. */
const OTIS: TrackSpec = { gauge: 3.8, top: FLOORS.second + 9.9 };
/** Roux: ~2.8 [estimated]; the circuit tops out at node XXII [sourced label]. */
const ROUX: TrackSpec = { gauge: 2.8, top: 68.4 };

/** The rail line's stations, (r, y), at every node from the ground to `top`. */
function railLine(top: number): Array<readonly [number, number]> {
  const railR = (y: number) => cornerA(y) + readTable(RAIL_OFFSET, y);
  const at: Array<readonly [number, number]> = [[railR(0), 0]];
  for (const n of NODES) {
    if (n.y > 2.5 && n.y < top && n.y <= 115.5) at.push([railR(n.y), n.y]);
  }
  if (top <= 115.5) {
    at.push([railR(top), top]);
  } else {
    // Above the 2nd floor a has ended; the beam runs on along its last
    // panel's line to its pulleys.
    const r1 = railR(115.5);
    const r0 = railR(110.6);
    at.push([r1 + ((r1 - r0) * (top - 115.5)) / 4.9, top]);
  }
  return at;
}

/** A segment's unit tangent (up the track) and upward normal (up and out). */
function segFrame(p: readonly [number, number], q: readonly [number, number]): { t: Vec3; n: Vec3; len: number } {
  const dr = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dr, dy);
  return { t: inPlane(dr / len, dy / len), n: inPlane(dy / len, -dr / len), len };
}

/** The rail line read at height y: its r, and the frame of its segment there. */
function railAt(line: ReadonlyArray<readonly [number, number]>, y: number): { r: number; t: Vec3; n: Vec3; tan: number } {
  let i = 0;
  while (i < line.length - 2 && (line[i + 1] as readonly [number, number])[1] < y) i++;
  const p = line[i] as readonly [number, number];
  const q = line[i + 1] as readonly [number, number];
  const s = (y - p[1]) / (q[1] - p[1]);
  const { t, n } = segFrame(p, q);
  return { r: p[0] + (q[0] - p[0]) * s, t, n, tan: (q[1] - p[1]) / (p[0] - q[0]) };
}

/** A straight member of square section `w` from p to q; `hint` rolls it. */
function member(p: Vec3, q: Vec3, w: number, hint: Vec3 = UP): Block {
  const d = sub3(q, p);
  const x = unit3(d);
  let y = sub3(hint, mul3(x, dot3(hint, x)));
  if (Math.hypot(y[0], y[1], y[2]) < 1e-6) y = sub3(E, mul3(x, dot3(E, x)));
  return { at: mul3(add3(p, q), 0.5), x, y: unit3(y), size: [Math.hypot(d[0], d[1], d[2]), w, w] };
}

/** A box square to the leg's diagonal: `along` on U, `high` on y, `across` on E. */
function levelBox(at: Vec3, along: number, high: number, across: number): Block {
  return { at, x: U, y: UP, size: [along, high, across] };
}

/** One track: two plate girders with their rails, and the ties between them. */
function track(spec: TrackSpec): Block[] {
  const line = railLine(spec.top);
  const half = spec.gauge / 2;
  const out: Block[] = [];
  const normals: Vec3[] = [];
  for (let k = 0; k + 1 < line.length; k++) {
    const p = line[k] as readonly [number, number];
    const q = line[k + 1] as readonly [number, number];
    const { t, n, len } = segFrame(p, q);
    normals.push(n);
    for (const side of [-1, 1]) {
      const mid = onDiag((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, side * half);
      // Each girder overlaps its neighbour by 0.15 at a node, where the
      // line turns by a few degrees.
      out.push({ at: sub3(mid, mul3(n, GIRDER.depth / 2)), x: t, y: n, size: [len + 0.3, GIRDER.depth, GIRDER.flange] });
      out.push({ at: add3(mid, mul3(n, 0.075)), x: t, y: n, size: [len + 0.3, 0.15, 0.1] });
    }
    // Lateral bracing in the plane of the girders' bottoms: an X per
    // segment [the form estimated; PL-XXII ter Fig. 26 draws one].
    const low = GIRDER.depth - 0.1;
    const corner = (s: readonly [number, number], side: number) =>
      sub3(onDiag(s[0], s[1], side * half), mul3(n, low));
    out.push(member(corner(p, -1), corner(q, 1), 0.1, n));
    out.push(member(corner(p, 1), corner(q, -1), 0.1, n));
  }
  // A tie across the gauge at every station.
  for (let k = 0; k < line.length; k++) {
    const s = line[k] as readonly [number, number];
    const n = unit3(add3(normals[Math.max(0, k - 1)] as Vec3, normals[Math.min(normals.length - 1, k)] as Vec3));
    out.push({ at: sub3(onDiag(s[0], s[1]), mul3(n, GIRDER.depth - 0.1)), x: E, y: n, size: [spec.gauge, 0.14, 0.14] });
  }
  return out;
}

interface CarSpec {
  /** Deck length along the diagonal, height, width across. */
  readonly deck: Vec3;
  readonly gauge: number;
  readonly top: number;
}

/** Otis decks 4.670 [sourced], 2.40 high and 3.40 wide [estimated]. */
const OTIS_CAR: CarSpec = { deck: [4.67, 2.4, 3.4], gauge: OTIS.gauge, top: OTIS.top };
/** Roux decks for 50 a deck, inside its narrower gauge [estimated]. */
const ROUX_CAR: CarSpec = { deck: [5.8, 2.4, 2.4], gauge: ROUX.gauge, top: ROUX.top };

/** How far the car may dip below its rails, into the girders' trough [estimated]. */
const TROUGH = 1.1;

/**
 * A stepped double-deck car whose lower floor is at `floorY`: two level
 * decks, the upper one set back up the slope by a deck's height, on a
 * chassis along the rails, with a hanger under the lower deck's outer end.
 */
function car(spec: CarSpec, floorY: number): Block[] {
  const line = railLine(spec.top);
  const [len, high, wide] = spec.deck;
  const slope = railAt(line, floorY).tan;
  // Level floors on a slope: the deck's inner end dips below the rails,
  // at most TROUGH, which sets the floor's centre above the rail line.
  const lift = Math.max(0.3, (len / 2) * slope - TROUGH);
  const r1 = railAt(line, floorY - lift).r;
  const step = high + 0.15;
  const floor2 = floorY + step;
  const r2 = r1 - step / slope;
  const out: Block[] = [
    levelBox(onDiag(r1, floorY + high / 2), len, high, wide),
    levelBox(onDiag(r2, floor2 + high / 2), len, high, wide),
  ];
  // The chassis: along the rails from under the lower deck's outer end to
  // under the upper deck's inner end.
  const yLow = floorY - lift - (len / 2) * slope;
  const yHigh = floor2 - lift + (len / 2) * slope;
  const low = railAt(line, yLow);
  const high2 = railAt(line, yHigh);
  const pLow = add3(onDiag(low.r, yLow), mul3(low.n, 0.2));
  const pHigh = add3(onDiag(high2.r, yHigh), mul3(high2.n, 0.2));
  const chassis = member(pLow, pHigh, 0.3, low.n);
  out.push({ ...chassis, size: [chassis.size[0], 0.3, spec.gauge] });
  // The hanger: from the chassis up to the lower floor at its outer end.
  const hang = floorY - yLow;
  if (hang > 0.3) out.push(levelBox(onDiag(r1 + len / 2 - 0.1, yLow + hang / 2), 0.2, hang, wide));
  return out;
}

/** A frame to a quaternion [x, y, z, w]; z is x × y. */
function frameQuat(x: Vec3, y: Vec3): Quat {
  const z = cross3(x, y);
  // Columns x, y, z; mRC is row R, column C.
  const m00 = x[0], m10 = x[1], m20 = x[2];
  const m01 = y[0], m11 = y[1], m21 = y[2];
  const m02 = z[0], m12 = z[1], m22 = z[2];
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1);
    return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
  }
  if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  }
  if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
  return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}

/**
 * Turn a leg-frame vector onto quadrant target k, as the targets turn:
 * k quarter turns about +y, taking +z to +x.
 */
function onLeg(k: number, p: Vec3): Vec3 {
  if (k === 0) return p;
  if (k === 1) return [p[2], p[1], -p[0]];
  if (k === 2) return [-p[0], p[1], -p[2]];
  return [-p[2], p[1], p[0]];
}

function blockOnLeg(k: number, b: Block): Block {
  return { at: onLeg(k, b.at), x: onLeg(k, b.x), y: onLeg(k, b.y), size: b.size };
}

/**
 * Many boxes as one mesh: a unit box copied onto one target per block,
 * each carrying its size as `scale` and its turn as `rot` (copyToPoints
 * scales, then turns, then places).
 */
function blocks(g: Graph, id: string, list: readonly Block[]): NodeHandle {
  const unit = box(g, `${id}Unit`, [0, 0, 0], [1, 1, 1]);
  const slots = g.add(
    pointGrid,
    { countX: list.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
  );
  const col = (pick: (b: Block) => number) => indexTable(list.map(pick));
  const quats = list.map((b) => frameQuat(b.x, b.y));
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(col((b) => b.at[0]), col((b) => b.at[1]), col((b) => b.at[2])),
    },
    `${id}Place`,
  );
  const size = g.add(
    setAttribute,
    {
      name: "scale",
      type: "f32",
      tupleSize: 3,
      value: vec(col((b) => b.size[0]), col((b) => b.size[1]), col((b) => b.size[2])),
    },
    `${id}Size`,
  );
  const q = (i: number) => indexTable(quats.map((r) => r[i] as number));
  const rot = g.add(
    setAttribute,
    { name: "rot", type: "f32", tupleSize: 4, value: vec(q(0), q(1), q(2), q(3)) },
    `${id}Turn`,
  );
  const out = g.add(copyToPoints, { topology: "keep" }, id);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", size, "in");
  g.connect(size, "out", rot, "in");
  g.connect(unit, "out", out, "source");
  g.connect(rot, "out", out, "target");
  return out;
}

/** Polylines as paths, one per list, in order. */
function polylines(g: Graph, id: string, lines: ReadonlyArray<readonly Vec3[]>): NodeHandle {
  const pts = lines.flat();
  const which = lines.flatMap((l, i) => l.map(() => i));
  const slots = g.add(
    pointGrid,
    { countX: pts.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
  );
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(pts.map((p) => p[0])),
        indexTable(pts.map((p) => p[1])),
        indexTable(pts.map((p) => p[2])),
      ),
    },
    `${id}Place`,
  );
  const key = g.add(setAttribute, { name: "line", type: "i32", value: indexTable(which) }, `${id}Key`);
  const paths = g.add(pointsToPath, { groupAttr: "line" }, id);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", paths, "in");
  return paths;
}

// ---------------------------------------------------------------------------
// Stairs

/** A tread's thickness and a landing's [estimated]. */
const TREAD = 0.05;
const LANDING = 0.1;

/**
 * A straight flight from (r0, y0) to (r1, y1) along the diagonal, `l`
 * across it: `steps` treads, each at its riser's top, and two stringers.
 */
function flight(r0: number, y0: number, r1: number, y1: number, l: number, width: number, steps: number): Block[] {
  const out: Block[] = [];
  const run = Math.abs(r1 - r0) / steps;
  for (let i = 1; i <= steps; i++) {
    const r = r0 + ((r1 - r0) * (i - 0.5)) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    out.push(levelBox(onDiag(r, y - TREAD / 2, l), run + 0.03, TREAD, width));
  }
  for (const side of [-1, 1]) {
    const lat = l + (side * width) / 2;
    out.push(member(onDiag(r0, y0 - 0.1, lat), onDiag(r1, y1 - 0.1, lat), 0.06, UP));
  }
  // A stringer is a flat bar 0.25 deep [estimated]: widen the square member.
  for (let i = out.length - 2; i < out.length; i++) {
    const s = out[i] as Block;
    out[i] = { ...s, size: [s.size[0], 0.25, 0.06] };
  }
  return out;
}

/**
 * A spiral stair round a vertical axis: `steps` treads of `tread` width
 * radially, from y0 to y1, turning `turns` times from the angle `start`
 * (0 = out along the diagonal), a newel, and the outer hand rail's points.
 */
function helix(
  axis: (y: number) => Vec3,
  frameX: Vec3,
  frameZ: Vec3,
  y0: number,
  y1: number,
  diameter: number,
  tread: number,
  turns: number,
  start: number,
): { blocks: Block[]; rail: Vec3[] } {
  const steps = Math.max(1, Math.round((y1 - y0) / 0.178));
  const rise = (y1 - y0) / steps;
  const outer = diameter / 2;
  const dPhi = (turns * 2 * Math.PI) / steps;
  const dir = (phi: number): Vec3 => add3(mul3(frameX, Math.cos(phi)), mul3(frameZ, Math.sin(phi)));
  const mid = outer - tread / 2;
  const out: Block[] = [];
  for (let i = 1; i <= steps; i++) {
    const phi = start + (i - 0.5) * dPhi;
    const y = y0 + i * rise;
    // Wedge treads as boxes, a little wider than the wedge at mid-radius so
    // they overlap [estimated].
    out.push({
      at: add3(axis(y - TREAD / 2), mul3(dir(phi), mid)),
      x: dir(phi),
      y: UP,
      size: [tread, TREAD, Math.max(0.2, mid * dPhi * 1.4)],
    });
  }
  // The newel: the core tube, about 1.60 − 2 × 0.64 = 0.32 [derived].
  const core = Math.max(0.16, diameter - 2 * tread);
  const a0 = axis(y0);
  out.push({ at: [a0[0], (y0 + y1 + 1) / 2, a0[2]], x: frameX, y: UP, size: [core * 0.7, y1 - y0 + 1, core * 0.7] });
  const rail: Vec3[] = [];
  const per = 12;
  const n = Math.max(2, Math.round(turns * per));
  for (let j = 0; j <= n; j++) {
    const phi = start + (turns * 2 * Math.PI * j) / n;
    const y = y0 + ((y1 - y0) * j) / n + 0.9;
    rail.push(add3(axis(y), mul3(dir(phi), outer)));
  }
  return { blocks: out, rail };
}

/** Whole turns plus a half: a helix entered on its outer side leaves on its inner. */
function halfTurns(rise: number): number {
  return Math.max(0.5, Math.round(rise / 0.178 / 15 - 0.5) + 0.5);
}

/**
 * The 1st → 2nd floor stair in one leg (e1, the same in all four): a helix
 * of Ø 1.60 per panel, set in from the outer corner c by 2.4 along the
 * diagonal at the panel's TOP node, where the leg is narrowest [estimated],
 * each at least 2.4 inside the one below it; straight flights of 11
 * risers join them, inward along the diagonal [sourced counts].
 */
function firstToSecond(): { blocks: Block[]; rails: Vec3[][] } {
  const ys = NODES.map((n) => n.y).filter((y) => y >= 57.4 && y <= 115.5);
  const RISE = 11 * 0.207;
  const axes: number[] = [];
  for (let k = 0; k + 1 < ys.length; k++) {
    const want = cornerC(ys[k + 1] as number) - 2.4;
    axes.push(k === 0 ? want : Math.min(want, (axes[k - 1] as number) - 2.4));
  }
  const out: Block[] = [];
  const rails: Vec3[][] = [];
  const last = axes.length - 1;
  for (let k = 0; k <= last; k++) {
    const r = axes[k] as number;
    const y0 = k === 0 ? FLOORS.first : (ys[k] as number) + RISE / 2;
    const y1 = k === last ? FLOORS.second : (ys[k + 1] as number) - RISE / 2;
    const h = helix((y) => onDiag(r, y), U, E, y0, y1, 1.6, 0.64, halfTurns(y1 - y0), 0);
    out.push(...h.blocks);
    rails.push(h.rail);
    if (k < last) {
      const rNext = axes[k + 1] as number;
      out.push(...flight(r - 0.8, y1, rNext + 0.8, y1 + RISE, 0, 0.64, 11));
    }
  }
  return { blocks: out, rails };
}

/**
 * The ground → 1st floor stair in piles 2 and 4 (PL-XXVIII Fig. 1): every
 * 7.8555 of height a landing, two flights inward with a middle landing, a
 * far landing, and one flight back in a second lane. Lanes 1.00 wide
 * [sourced], centred 2.3 and 3.3 across the diagonal, clear of the car
 * [estimated]; the outer landing 4.7 in from c along the diagonal, so the
 * far lane's corner stays 0.9 inside the leg's outer faces [derived].
 */
function groundToFirst(): Block[] {
  const PERIOD = 7.8555;
  const SHIFT = PERIOD / 1.407;
  const LAND = 1.3;
  const RISERS = 15;
  const rise = PERIOD / 3;
  const run = RISERS * 0.25;
  const lane1 = 2.3;
  const lane2 = 3.3;
  const out: Block[] = [];
  const landing = (rOut: number, y: number, lanes: 1 | 2) => {
    const l0 = lane1 - 0.5;
    const l1 = lanes === 2 ? lane2 + 0.5 : lane1 + 0.5;
    out.push(levelBox(onDiag(rOut - LAND / 2, y - LANDING / 2, (l0 + l1) / 2), LAND, LANDING, l1 - l0));
  };
  let y = 1.58;
  let r0 = cornerC(y) - 4.7;
  while (y + PERIOD <= FLOORS.first + 1e-6) {
    landing(r0, y, 2);
    out.push(...flight(r0 - LAND, y, r0 - LAND - run, y + rise, lane1, 1, RISERS));
    const rMid = r0 - LAND - run;
    landing(rMid, y + rise, 1);
    out.push(...flight(rMid - LAND, y + rise, rMid - LAND - run, y + 2 * rise, lane1, 1, RISERS));
    const rFar = rMid - LAND - run;
    landing(rFar, y + 2 * rise, 2);
    // Back out in the second lane, to the next repeat's first landing.
    const rNext = r0 - SHIFT;
    out.push(...flight(rFar, y + 2 * rise, rNext - LAND, y + PERIOD, lane2, 1, RISERS));
    y += PERIOD;
    r0 = rNext;
  }
  // The last part: a landing, then a short flight to the 1st floor.
  landing(r0, y, 2);
  const steps = Math.max(1, Math.round((FLOORS.first - y) / (rise / RISERS)));
  const rEnd = r0 - LAND - steps * 0.25;
  out.push(...flight(r0 - LAND, y, rEnd, FLOORS.first, lane1, 1, steps));
  landing(rEnd, FLOORS.first, 1);
  return out;
}

// ---------------------------------------------------------------------------
// The Edoux, in the shaft

/** Along the N–S diagonal, toward pile 3 (Sud) at +x −z. */
const S_HAT: Vec3 = [1 / SQ2, 0, -1 / SQ2];
/** Across it, toward pile 4 (Ouest). */
const T_HAT: Vec3 = [1 / SQ2, 0, 1 / SQ2];
const inShaft = (s: number, y: number, t = 0): Vec3 => add3(add3(mul3(S_HAT, s), mul3(T_HAT, t)), [0, y, 0]);

const EDOUX = {
  /** Each car's axis from the tower's axis [sourced 2.650]. */
  carAxis: 2.65,
  /** Car plan: along the N–S diagonal, across it [sourced]; height [estimated]. */
  car: [3.57, 2.9, 3.9] as Vec3,
  /** Pistons / guides, each side of a car's axis [sourced 4.064 / 2]. */
  guide: 2.032,
  /** The outboard guide posts' axes, out along the diagonal [estimated, Plate I]. */
  outboard: 5.15,
  /** How far each car stands from the landing: mid-run [estimated moment]. */
  travel: 40.1,
} as const;

/** A post of the shaft, square to the N–S diagonal. */
function shaftPost(s: number, y0: number, y1: number, alongS: number, acrossS: number): Block {
  return { at: inShaft(s, (y0 + y1) / 2), x: S_HAT, y: UP, size: [alongS, y1 - y0, acrossS] };
}

function edouxGuides(): Block[] {
  const { second, landing, third } = FLOORS;
  const n = -EDOUX.carAxis;
  const s = EDOUX.carAxis;
  return [
    // The central guide post, "890 × 600", the whole height [sourced label].
    shaftPost(0, second, third, 0.89, 0.6),
    // A "500 × 600" guide post outboard of each car. Plate I's face-on
    // elevation draws them as two vertical lines 3.64 either side of the
    // axis from the 2nd floor up [estimated: measured at 15.80 px/m], so
    // 3.64 √2 = 5.15 out along the diagonal [derived].
    shaftPost(-EDOUX.outboard, second, third, 0.5, 0.6),
    shaftPost(EDOUX.outboard, second, third, 0.5, 0.6),
    // NORD, the upper car: its two cylinders, 2nd floor to the landing,
    // then the cast-iron columns guiding the pistons on to the 3rd
    // (sections [estimated]).
    shaftPost(n - EDOUX.guide, second, landing, 0.4, 0.4),
    shaftPost(n + EDOUX.guide, second, landing, 0.4, 0.4),
    shaftPost(n - EDOUX.guide, landing, third, 0.34, 0.34),
    shaftPost(n + EDOUX.guide, landing, third, 0.34, 0.34),
    // SUD, the lower car: its guide columns, 2nd floor to the landing.
    shaftPost(s - EDOUX.guide, second, landing, 0.34, 0.34),
    shaftPost(s + EDOUX.guide, second, landing, 0.34, 0.34),
  ];
}

function edouxCars(): Block[] {
  const [along, high, across] = EDOUX.car;
  // Counterweights: when the upper car is `travel` above the landing, the
  // lower one is as far below it [sourced mechanism].
  const up = FLOORS.landing + EDOUX.travel;
  const down = FLOORS.landing - EDOUX.travel;
  return [
    { at: inShaft(-EDOUX.carAxis, up + high / 2), x: S_HAT, y: UP, size: [along, high, across] },
    { at: inShaft(EDOUX.carAxis, down + high / 2), x: S_HAT, y: UP, size: [along, high, across] },
  ];
}

/** e2 and e3: the service helices in the halves of the shaft the cars leave free. */
function shaftStairs(): { blocks: Block[]; rails: Vec3[][] } {
  const e2 = helix(
    (y) => inShaft(-EDOUX.carAxis, y),
    S_HAT,
    T_HAT,
    FLOORS.second,
    FLOORS.landing,
    1.6,
    0.64,
    halfTurns(FLOORS.landing - FLOORS.second),
    0,
  );
  const e3 = helix(
    (y) => inShaft(EDOUX.carAxis, y),
    S_HAT,
    T_HAT,
    FLOORS.landing,
    FLOORS.third,
    1.68,
    0.64,
    halfTurns(FLOORS.third - FLOORS.landing),
    Math.PI,
  );
  return { blocks: [...e2.blocks, ...e3.blocks], rails: [e2.rail, e3.rail] };
}

// ---------------------------------------------------------------------------

/**
 * Where each car stands: its lower floor's height, per quadrant target
 * [estimated moment]. Target 0 is pile 4 (Ouest, Roux), 1 pile 3 (Sud,
 * Otis), 2 pile 2 (Est, Roux), 3 pile 1 (Nord, Otis). All on the straight
 * run below node XXIV: above it the rail line steepens to about 70° with
 * the leg, and a rigid car built level for 54.6° no longer sits level
 * there, which the model does not attempt.
 */
const CAR_AT = [30, 42, 12, 22] as const;

/** The lifts and the stairs. `quads` are the four quadrant targets. */
export function buildLifts(g: Graph, quads: NodeHandle, detail: Detail = {}): Parts {
  void detail; // one depth only: nothing here has a laced form
  // The quadrant targets split by system: even = Roux (piles 4, 2), odd =
  // Otis (piles 3, 1).
  const even = g.add(filterByExpression, { predicate: lt(mod(index(), 2), 0.5) }, "liftQuadsRoux");
  const odd = g.add(filterByExpression, { predicate: ge(mod(index(), 2), 0.5) }, "liftQuadsOtis");
  g.connect(quads, "out", even, "in");
  g.connect(quads, "out", odd, "in");

  const tracks = merge(g, "liftTracks", [
    copyToQuadrants(g, "liftOtisTracks", blocks(g, "liftOtisTrack", track(OTIS)), odd),
    copyToQuadrants(g, "liftRouxTracks", blocks(g, "liftRouxTrack", track(ROUX)), even),
  ]);
  const guides = blocks(g, "liftEdouxGuides", edouxGuides());

  // Cars stand at a different moment in each leg, so they are laid out
  // per leg here rather than copied.
  const cars: Block[] = [];
  for (let k = 0; k < 4; k++) {
    const spec = k % 2 === 0 ? ROUX_CAR : OTIS_CAR;
    for (const b of car(spec, CAR_AT[k] as number)) cars.push(blockOnLeg(k, b));
  }
  cars.push(...edouxCars());

  const e1 = firstToSecond();
  const shaft = shaftStairs();
  const stairs = merge(g, "liftStairs", [
    copyToQuadrants(g, "liftStairE1", blocks(g, "liftStairE1Leg", e1.blocks), quads),
    copyToQuadrants(g, "liftStairGround", blocks(g, "liftStairGroundLeg", groundToFirst()), even),
    blocks(g, "liftStairShaft", shaft.blocks),
  ]);
  // Hand rails: paths copied before they are skinned.
  const rails = merge(g, "liftRails", [
    copyToQuadrants(g, "liftRailsE1", polylines(g, "liftRailsE1Leg", e1.rails), quads),
    polylines(g, "liftRailsShaft", shaft.rails),
  ]);
  return {
    girders: [tracks, guides],
    platforms: [blocks(g, "liftCars", cars), stairs, skin(g, "liftRailSkin", rails, 0.025)],
  };
}
