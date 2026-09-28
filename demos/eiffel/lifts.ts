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
 * plate girders 1.300 deep, 3.800 apart axis to axis, top chord plates
 * « 285 × 8 » reaching 85 outboard of the web and 200 inboard, the rails on
 * top [sourced PL-XXII ter, "Coupe verticale CD"]; the car
 * rolls on their upper side, which faces up and OUT, away from the axis.
 * The Otis base slope is the leg's: « composante … suivant l'inclinaison de
 * la voie … 0.815 » = sin 54.6° [sourced PL-XXI], the leg's diagonal lean
 * (§2.5). Above it the track curves with the leg: the book takes « 0,976
 * et 0,815 comme sinus des angles faits avec l'horizontale du chemin de
 * roulement de la cabine en haut et en bas de sa course », 77°30' and
 * 54°35', and 68°10' at 1.50 above the 1st floor [sourced E1900-TXT pp.
 * 144, 153]; the rail line below, read at every node, stands at 54.6°,
 * 60.7° under the 1st floor, 70.4° in panel 6, 75.5-77.1° in panels 7-10
 * and 74.1° in panel 11 (SOURCES.md §11.3). Where it runs
 * in the leg is only drawn, not dimensioned: measured on Plate XX at
 * 1:200 the rail line stands about 3.3 m out from a (along the diagonal)
 * below the 1st floor, 4.6 m at nodes XXI-XX, 4.0 m at the 2nd floor
 * [estimated, ±0.5]. Below the 1st floor that reading puts the girders'
 * feet through the inner faces, so there the rail stands 4.35 out, the
 * least that clears the faces' struts (see `RAIL_OFFSET`). The table is read at every
 * node, so the track bends where the leg bends. The Otis beam runs on
 * about 9.9 m above the 2nd floor to its pulleys [estimated, PL-XX Fig. 3],
 * past the line of b and d into the open middle, where a has ended and the
 * leg's inner faces carry no members;
 * the Roux circuit's top pulleys stand at the top of panel 6, node XXII
 * [sourced label, PL-XXIII Fig. 2]. The Roux track's gauge is not printed:
 * its running wheels are 3.57 apart axis to axis on PL-XXIII Fig. 4, the
 * transverse section [measured at 309.8 px/m on its printed 4.080; the
 * plan, Fig. 11, reads 3.70].
 *
 * THE CARS. Both systems ran double-deck cars: Otis 50 passengers, Roux
 * 100 [sourced PL-XX, PL-XXI]. Otis (PL-XXII ter Figs 1-2): decks 4.670
 * long [sourced], 3.169 across [sourced], 2.13 floor to roof top [sourced
 * chain 205 + 275 + 1.00 + 0.65], floor to floor 2.376 [measured, Fig. 1
 * at 315.7 px/m] and the upper floor « 1,080 » further in [sourced], so
 * the decks stack on 65.6°, the slope the plate draws the car level on;
 * wheelbase « 8m109 » [sourced]. Roux (PL-XXIII): 3.27 across, decks about
 * 2.1 high (Fig. 4), 3.9 long (Fig. 11's dotted cabin) [measured]. The
 * floors are level on the slope the car was drawn on and the upper deck
 * sits further up it, the stepped car of PL-XX, and the car rides BETWEEN
 * its girders, each deck's inner end 1.1 into the trough they make above
 * the ties [measured on the Otis]. Each car is one rigid body on two axles
 * and rides its whole run, station to station, tipping where the rail
 * bends: the Otis by its chord's slope less 65.6°, 11° back on the 54.6°
 * run and as far forward high in the leg, as E1900-TXT p. 135 says it did;
 * the Roux level on the straight run (see `carLevel`, `LIFT_CARS`). Where
 * each car stands when the graph builds it is a chosen moment
 * [estimated]. Each deck is a cabin of plate, posts, frieze and roof with
 * its doors, glass and bench (`cabin`, SOURCES.md §34: the Otis bands,
 * doors and « Com. » and the Roux's three windows read from the plates,
 * the rest invented and tagged so), its panes the car's own glass output.
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
 * THE STAIRS are `stairs.ts`'s, all 1,710 steps of 1889 from the ground
 * to the summit (E1900-TXT p. 304): the ground stair in piles 2 and 4
 * (PL-XXVIII), e1 in every leg, e2 and e3 in the shaft, and the little
 * stair, the campanile's spiral and the ladders above the 3rd floor. This
 * module only places them: the leg runs copied onto their legs, the others
 * as built, each run's treads as their own node.
 *
 * THE MACHINERY [sourced PL-XX to PL-XXIII quater, E1900-TXT pp. 127-192;
 * see each section]: the Roux chains, every piece placed on its circuit,
 * with their wheels and ducts; the Otis motor (cylinder, girders,
 * carriage, fixed pulleys), its counterweight truck on its own track and
 * the cables' strands; the Edoux pistons, cylinders, columns, pulleys,
 * cables, tanks and the gear under the landing. What moves does so with a
 * car, and the page moves it from the car's travel (`LIFT_FOLLOWERS`,
 * `LIFT_CHAINS`).
 *
 * Everything here is boxes except the stairs' hand rails, which are paths
 * copied BEFORE they are skinned, and the round machinery (cylinders,
 * shafts, pistons, tanks), which is swept tubes. The boxes carry their
 * local face normals as `normal`, which `rotateAttrs` turns at every
 * copyToPoints on the way (the block's own turn, then a quadrant's, where
 * one follows). Tracks and the Edoux guide posts go in "girders"; cars and
 * the stairs in "platforms"; the machinery that stands still in
 * "machinery"; everything that moves is its own `car.<name>` mesh, and each
 * Roux chain its own instances output, `chain.<name>`.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import {
  copyToPoints,
  filterByExpression,
  ge,
  index,
  lt,
  meshPrimitive,
  mod,
  pointsToPath,
  setAttribute,
  spawnInstances,
  sweepProfile,
} from "pcg-ts";
import { SAG, circleSegments } from "./chord.js";
import { flatsSides } from "./ground.js";
import { type Vec3, copyToQuadrants, indexTable, merge, pointTable, skin } from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { GLAZING } from "./platforms.js";
import { FLOORS, NODES, PILES, profileAt } from "./spec.js";
import { stairRuns } from "./stairs.js";
import { SUPPORT } from "./ground.js";

type Quat = readonly [number, number, number, number];

/**
 * The rim chords every wheel had until 2026-09-26, kept as a floor under
 * `wheelRimChords`. Up here because wheels are built at load.
 */
export const RIM_CHORDS_MIN = 36;

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

/**
 * Where a spoked wheel stands: its centre, its axle (unit), the direction
 * its first spoke lies toward, and its make ({@link wheelBlocks}). The
 * graph builds each make once and copies it onto every wheel of it
 * ({@link gear}).
 */
interface Wheel {
  readonly centre: Vec3;
  readonly axis: Vec3;
  readonly ref: Vec3;
  readonly spec: WheelSpec;
}

/** A part as the graph takes it: its boxes, and its wheels ({@link gear}). */
interface Gear {
  readonly blocks: readonly Block[];
  readonly wheels: readonly Wheel[];
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
 * 2nd floor, each ±0.5 or so; the « Vo » line below the 1st floor reads
 * 4.67-4.78 (PL-XX Fig. 4). Below the 1st floor the girders set the least
 * of it: one whose web is 1.9 off the diagonal and whose foot sits 1.30
 * down the track's normal reaches the inner faces' plane unless the rail
 * stands about 4.35 out from a [derived: 1.9 + 0.085 flange + 1.30 sin
 * 54.6°, plus the face's lean over the girder's 0.75 drop, plus 0.55 √2 so
 * the faces' 0.80 struts clear by 0.15: 4.35]. So the table takes the
 * larger of the two at every node.
 */
export const RAIL_OFFSET: ReadonlyArray<readonly [number, number]> = [
  [0, 4.35],
  [50.4, 4.35],
  [57.4, 4.35],
  [68.4, 4.4],
  [79.4, 4.7],
  [90.4, 4.6],
  [100.6, 4.4],
  [110.6, 4.2],
  [115.5, 4.1],
];

/** The lift girders' depth [sourced PL-XXII ter "Coupe verticale CD", PL-XXIII Fig. 14]. */
const GIRDER = { depth: 1.3 } as const;

interface TrackSpec {
  /** Rail axis to rail axis (the girders' webs). */
  readonly gauge: number;
  /** Where the beam ends, up top. */
  readonly top: number;
  /** The top flange's reach outboard of the web and inboard of it. */
  readonly flange: { readonly out: number; readonly in: number };
}

/**
 * Otis: 3.800 [sourced]; its top chord plate « 285 × 8 », « 85 » outboard
 * of the web and « 200 » inboard [sourced Coupe CD, Fig. 24]; the beam ends
 * ~9.9 above the 2nd floor [estimated].
 */
const OTIS: TrackSpec = { gauge: 3.8, top: FLOORS.second + 9.9, flange: { out: 0.085, in: 0.2 } };
/**
 * Roux: 3.57, the running wheels axis to axis on PL-XXIII Fig. 4 [measured;
 * the plan, Fig. 11, reads 3.70]; the circuit tops out at node XXII
 * [sourced label]; flanges 0.235 about the web [estimated], leaving the
 * 3.27 car 0.03 either side.
 */
const ROUX: TrackSpec = { gauge: 3.57, top: 68.4, flange: { out: 0.1175, in: 0.1175 } };

/**
 * Where the tracks begin, below the ground: the machine basement's floor,
 * « Sous-sol des machines » (30.50), z -3.0 [sourced PL-XX Fig. 4]. A car
 * whose lower floor stands at the rez-de-chaussée (z 1.58) reaches further
 * down its track than that floor does — the Roux car's lower axle 4.6 m
 * lower along the rail, the Otis car's chassis 3.3 m under its rail — so
 * its track runs on into the basement, where both systems had their
 * machinery (the Otis cylinder, the Roux driving wheels). The line carries
 * panel 1's lean on down; the ground hides it.
 */
const TRACK_FOOT = -3.5;

/** The rail line's stations, (r, y), at every node from the basement to `top`. */
function railLine(top: number): Array<readonly [number, number]> {
  const railR = (y: number) => cornerA(y) + readTable(RAIL_OFFSET, y);
  const at: Array<readonly [number, number]> = [[railR(TRACK_FOOT), TRACK_FOOT]];
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
    const { out: fo, in: fi } = spec.flange;
    for (const side of [-1, 1]) {
      const mid = onDiag((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, side * half);
      // The girder as one slab the flange's width, off-centre on its web.
      const slab = onDiag((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, side * (half + (fo - fi) / 2));
      // Each girder overlaps its neighbour by 0.15 at a node, where the
      // line turns by a few degrees.
      out.push({ at: sub3(slab, mul3(n, GIRDER.depth / 2)), x: t, y: n, size: [len + 0.3, GIRDER.depth, fo + fi] });
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
  /** Deck length along the diagonal, height (floor to roof top), width across. */
  readonly deck: Vec3;
  readonly gauge: number;
  readonly top: number;
  /** Lower floor to upper floor. */
  readonly step: number;
  /**
   * How much further in (up the slope) the upper deck stands, horizontally.
   * Absent: along the slope, so both decks sit the same height over the rail.
   */
  readonly setback?: number;
  /** The chassis' length along the rails. Absent: from deck end to deck end. */
  readonly chassis?: number;
  /** Running wheels on the rails, one at each end of each axle: their diameter and width. Absent: none built. */
  readonly running?: { readonly diameter: number; readonly width: number };
  /** Each deck's cabin: its walls, openings and fittings ({@link cabin}). */
  readonly cabin: CabinSpec;
}

/**
 * A bay of a cabin's long side, between two posts: a window, or (`door`)
 * a doorway from the floor to the roof. `clear` is its width between the
 * posts; a window without one shares what its side has left equally.
 */
interface Bay {
  readonly door?: true;
  readonly clear?: number;
}

/**
 * A leg car's cabin, one per deck, in heights above the deck's floor line
 * (the deck's underside, which the stations are measured to). Walls of
 * plate to the sill, window posts to the head, a frieze from the head to
 * the roof, the roof over all; the inner (uphill) end blind, since it
 * stands in the girders' trough; the outer end glazed in `endBays`.
 */
interface CabinSpec {
  /** The floor's top. */
  readonly floor: number;
  /** The plate's top: the windows' foot. */
  readonly sill: number;
  /** The windows' head: the frieze's foot. */
  readonly head: number;
  /** The roof's underside, and the doorways' head. */
  readonly roof: number;
  /** Plate walls' thickness; posts' square section. */
  readonly wall: number;
  readonly post: number;
  /** The long sides' bays, inner end to outer: the side toward -E, then +E. */
  readonly sides: readonly [readonly Bay[], readonly Bay[]];
  /** The outer end's windows. */
  readonly endBays: number;
  /** A door leaf's panel, to this height over the floor line, the light over it. */
  readonly doorPanel: number;
  /** A sliding door's track inside over the doorway and the wall it rolls along. */
  readonly track: boolean;
  /** The bench against the inner end: its depth and its seat's height over the floor. */
  readonly bench: { readonly depth: number; readonly seat: number };
  /** Grab rails along the long sides, at this height over the floor line. Absent: none. */
  readonly grab?: number;
  /**
   * The conductor's compartment, the lower deck's outermost side bay, closed
   * from the passengers by a glazed partition with a doorway this wide.
   * Absent: none.
   */
  readonly com?: { readonly doorway: number };
}

/**
 * Otis (PL-XXII ter): decks 4.670 long [sourced Fig. 1], 3.169 across
 * [sourced Fig. 2], 2.13 floor to roof top [sourced chain "205", "275",
 * "1.00", "0.65", Fig. 1]; floor to floor 2.376 [measured, Fig. 1 at 315.7
 * px/m on its printed 4.670]; the upper floor's outer end « 1,080 » further
 * in than the lower's [sourced Fig. 1: the dimension runs from one floor's
 * outer end to the other's, and the inner ends and inner walls agree to
 * 0.02], so the decks stack on atan(2.376 / 1.08) = 65.6°, the slope the
 * plate draws the car level on (its track 64.75° under the level floors);
 * the wheelbase « D'axe en axe des Roues = 8m109 » [sourced Fig. 2].
 */
const OTIS_CAR: CarSpec = {
  deck: [4.67, 2.13, 3.169],
  gauge: OTIS.gauge,
  top: OTIS.top,
  step: 2.376,
  setback: 1.08,
  chassis: 8.109,
  // The cabin [SOURCES.md §34]. The chain « 205 », « 275 », « 1.00 »,
  // « 0.65 » read as the wall's bands from the floor up [estimated
  // reading]: plate to a sill at 0.48, windows 1.00 to 1.48, and 0.65 of
  // frieze and roof above. « Porte roulante 2.02 » [sourced Fig. 1] read as
  // the doors' height over the floor line [estimated reading], so they rise
  // through the frieze to the roof's underside, 0.11 under its top. The
  // doors on the long sides, one each side of each deck, in its outer half
  // [estimated: both stations' wells leave about 1.0 beside the car there,
  // and the 2nd floor's neck 0.30 beside its inner half; the upper deck's
  // outer end stands over the lower deck's roof, so no passerelle meets
  // it]. Their width, 0.90, and every other bay, the floor's 0.10 and the
  // plates' and posts' sections [estimated: invented]. The conductor's
  // compartment « Com. » at the lower end [sourced Fig. 1], 0.90 deep
  // [estimated]; « un banc à l'arrière et des barres d'appui » [sourced
  // E1900-TXT p. 135], the bench against the inner end and the rails along
  // the sides [estimated: where].
  cabin: {
    floor: 0.1,
    sill: 0.48,
    head: 1.48,
    roof: 2.02,
    wall: 0.04,
    post: 0.06,
    sides: [
      [{}, {}, {}, { door: true, clear: 0.9 }, { clear: 0.81 }],
      [{}, {}, {}, { door: true, clear: 0.9 }, { clear: 0.81 }],
    ],
    endBays: 3,
    doorPanel: 1.0,
    track: true,
    bench: { depth: 0.45, seat: 0.45 },
    grab: 0.95,
    com: { doorway: 0.6 },
  },
};
/**
 * Roux (PL-XXIII Fig. 4, 1:50): 3.27 across and about 2.1 floor to roof,
 * the decks about 2.5 apart [measured, at 309.8 px/m; the heights near
 * the plate's gutter]. 3.9 long: Fig. 11, the plan at 1:50, draws the
 * cabin « au bas de sa course » dotted, 3.94 × 3.21 at 313 px/m on its
 * printed 5.200 and 2.850 [measured; read as one deck, the width being the
 * car's 3.27 — whether the outline is a deck or the car's whole plan is not
 * settled, and Fig. 3's elevation hides the car's inner end behind the
 * girders]. A second reading closes the outline further out, 4.4-4.5; at
 * that length the car would reach 3.75 above the rail line, into the
 * plate's own stair (its landings Pa 3.71 above it), so PL-XXVIII bounds
 * the deck under 4.4 and the shorter reading stands. Stacked along the
 * slope, both decks dip alike. « La cabine est portée sur la voie de
 * roulement par l'intermédiaire de deux essieux munis de galets à double
 * boudin de 600 mm de diamètre » [sourced E1900-TXT p. 160]: the running
 * wheels, their width the rail head's 0.09 [estimated].
 */
const ROUX_CAR: CarSpec = {
  deck: [3.9, 2.1, 3.27],
  gauge: ROUX.gauge,
  top: ROUX.top,
  step: 2.5,
  running: { diameter: 0.6, width: 0.09 },
  // The cabin [SOURCES.md §34]. PL-XXIII Fig. 3 draws the upper cabin's
  // side with three windows [sourced drawing], taken here as the +E side of
  // both decks; which side the figure faces is not recorded. Each deck is
  // entered « par des escaliers terminés par des paliers » [sourced
  // E1900-TXT p. 160], which at the 1st floor's well can only stand beside
  // the car (the upper deck's outer end is over the lower's roof, its inner
  // end in the trough), so the doorway is in the other long side, the -E,
  // between two windows [estimated]. The bands, the doorway's 0.90, the
  // plain doors and the benches [estimated: invented].
  cabin: {
    floor: 0.1,
    sill: 0.9,
    head: 1.75,
    roof: 1.98,
    wall: 0.04,
    post: 0.06,
    sides: [
      [{}, { door: true, clear: 0.9 }, {}],
      [{}, {}, {}],
    ],
    endBays: 3,
    doorPanel: 1.2,
    track: false,
    bench: { depth: 0.45, seat: 0.45 },
  },
};

/**
 * How far a deck's floor dips at its inner end below the rail line, square
 * to the track, into the girders' trough: 1.1 [measured, PL-XXII ter Fig.
 * 1 made track-horizontal: both Otis decks' inner walls, parallel to the
 * track, 1.07-1.16 below the girders' top; the Roux taken the same
 * (estimated)]. It clears the ties and the lateral bracing at 1.13-1.15.
 */
const TROUGH = 1.1;

/**
 * One deck's cabin as boxes, in the +x+z leg's frame: the deck's floor
 * line's centre at (r, y) on the diagonal, the deck `len` long along it
 * (its outer end +U), `wide` across and `high` from its floor line to the
 * roof's top. Everything stays inside that box — the deck's envelope, the
 * one the clearance and well tests sweep — so a cabin can never reach
 * where the solid deck it replaced did not. The panes come back apart,
 * for the car's glass output: `GLAZING.pane` thick on the plates' middle
 * plane, lapping `GLAZING.rebate` into the frame round them as the
 * platforms' do.
 *
 * `frame[0]` is the floor, whose underside is the floor line
 * (`tests/eiffelLifts.test.ts` reads the lower floor there).
 */
function cabin(
  spec: CarSpec,
  r: number,
  y: number,
  lower: boolean,
): { frame: Block[]; glass: Block[] } {
  const C = spec.cabin;
  const [len, high, wide] = spec.deck;
  const A = len / 2;
  const W = wide / 2;
  const { wall: w, post: p } = C;
  const { pane, rebate } = GLAZING;
  const frame: Block[] = [];
  const glass: Block[] = [];
  type Range = readonly [number, number];
  // A box by its extents: `a` along the deck from its centre, `h` over its
  // floor line, `c` across it (+E).
  const box = (a: Range, h: Range, c: Range): Block =>
    levelBox(onDiag(r + (a[0] + a[1]) / 2, y + (h[0] + h[1]) / 2, (c[0] + c[1]) / 2), a[1] - a[0], h[1] - h[0], c[1] - c[0]);
  // Across, measured inward from side s's outer face (s = -1 or +1).
  const inward = (s: number, u: Range): Range => {
    const c0 = s * (W - u[0]);
    const c1 = s * (W - u[1]);
    return c0 < c1 ? [c0, c1] : [c1, c0];
  };
  // A pane's layer in a wall: the wall's middle plane.
  const layer: Range = [w / 2 - pane / 2, w / 2 + pane / 2];

  frame.push(box([-A, A], [0, C.floor], [-W, W]));
  frame.push(box([-A, A], [C.roof, high], [-W, W]));
  // The inner end, blind, between the long sides' plates.
  frame.push(box([-A, -A + w], [C.floor, C.roof], [-W + w, W - w]));
  // The outer end: plate to the sill, frieze from the head, the windows
  // between the corner posts (the long sides') and `endBays - 1` more.
  const endA: Range = [A - w, A];
  frame.push(box(endA, [C.floor, C.sill], [-W + w, W - w]));
  frame.push(box(endA, [C.head, C.roof], [-W + w, W - w]));
  const across = Array.from({ length: C.endBays + 1 }, (_, i) => -W + p / 2 + ((2 * W - p) * i) / C.endBays);
  for (let i = 1; i < C.endBays; i++) {
    const c = across[i] as number;
    frame.push(box([A - p, A], [C.sill, C.head], [c - p / 2, c + p / 2]));
  }
  for (let i = 0; i < C.endBays; i++) {
    glass.push(
      box(
        [A - layer[1], A - layer[0]],
        [C.sill - rebate, C.head + rebate],
        [(across[i] as number) + p / 2 - rebate, (across[i + 1] as number) - p / 2 + rebate],
      ),
    );
  }

  // The long sides: posts at the bays' ends, the first (the inner corner)
  // standing against the blind end and so not built as one; a window between two
  // posts, a doorway between two jambs that run from the floor to the roof,
  // the plate and the frieze broken for it.
  let partition: number | undefined;
  C.sides.forEach((bays, k) => {
    const s = k === 0 ? -1 : 1;
    const fixed = bays.reduce((t, b) => t + (b.clear ?? 0), 0);
    const shared = bays.filter((b) => b.clear === undefined).length;
    const share = shared > 0 ? (2 * A - p * (bays.length + 1) - fixed) / shared : 0;
    if (share < 0 || (shared === 0 && Math.abs(2 * A - p * (bays.length + 1) - fixed) > 1e-9)) {
      throw new Error(`lifts.ts cabin: a long side's bays (${fixed.toFixed(3)} fixed, ${bays.length} bays) do not fill the deck's ${len} between its posts; give the windows no width, or widths that close.`);
    }
    const posts = [-A + p / 2];
    for (const b of bays) posts.push((posts[posts.length - 1] as number) + p + (b.clear ?? share));
    const jamb = (i: number): boolean => bays[i - 1]?.door === true || bays[i]?.door === true;
    // At the blind end the corner is the plates' own square, carried up
    // between the plate and the frieze.
    frame.push(box([-A, -A + w], [C.sill, C.head], inward(s, [0, w])));
    for (let i = 1; i < posts.length; i++) {
      const a = posts[i] as number;
      frame.push(box([a - p / 2, a + p / 2], jamb(i) ? [C.floor, C.roof] : [C.sill, C.head], inward(s, [0, p])));
    }
    // Plate and frieze, from end to end but for the doorways.
    let from = -A;
    const run = (to: number): void => {
      frame.push(box([from, to], [C.floor, C.sill], inward(s, [0, w])));
      frame.push(box([from, to], [C.head, C.roof], inward(s, [0, w])));
    };
    bays.forEach((b, i) => {
      const a0 = (posts[i] as number) + p / 2;
      const a1 = (posts[i + 1] as number) - p / 2;
      if (b.door !== true) {
        glass.push(box([i === 0 ? -A + w - rebate : a0 - rebate, a1 + rebate], [C.sill - rebate, C.head + rebate], inward(s, layer)));
        return;
      }
      run(a0 - p);
      from = a1 + p;
      // The leaf, shut: a panel set 12 mm in, standing higher than the
      // windows' sill so the doorway reads as one, a light over it, a rail
      // at the head.
      const rail = C.roof - 0.06;
      frame.push(box([a0, a1], [C.floor, C.doorPanel], inward(s, [0.012, w])));
      frame.push(box([a0, a1], [rail, C.roof], inward(s, [0, w])));
      glass.push(box([a0 - rebate, a1 + rebate], [C.doorPanel - rebate, rail + rebate], inward(s, layer)));
      // A rolling door's track, inside under the roof, over the doorway and
      // the leaf's width of wall it rolls back along (inward).
      if (C.track) frame.push(box([Math.max(-A + w, a0 - (a1 - a0) - p), a1 + p / 2], [C.roof - 0.08, C.roof], inward(s, [w, w + 0.04])));
      // Grab rails, on the posts' inner faces from the blind end to the
      // first doorway's jamb.
      if (C.grab !== undefined && bays.slice(0, i).every((x) => x.door !== true)) {
        frame.push(box([-A + w, posts[i] as number], [C.grab, C.grab + 0.035], inward(s, [p, p + 0.035])));
      }
    });
    run(A);
    if (lower && C.com !== undefined) partition = posts[posts.length - 2] as number;
  });

  // The conductor's compartment: a partition across the deck on the post
  // before the outermost bay, plate to the sill and glazed over it either
  // side of an open doorway, a band from the head to the roof.
  if (partition !== undefined && C.com !== undefined) {
    const at: Range = [partition - w / 2, partition + w / 2];
    const d = C.com.doorway / 2;
    for (const s of [-1, 1]) {
      const edge: Range = inward(s, [w, W - d - p]);
      frame.push(box([partition - p / 2, partition + p / 2], [C.floor, C.roof], inward(s, [W - d - p, W - d])));
      frame.push(box(at, [C.floor, C.sill], edge));
      frame.push(box(at, [C.head, C.roof], edge));
      glass.push(box([partition - pane / 2, partition + pane / 2], [C.sill - rebate, C.head + rebate], inward(s, [p - rebate, W - d - p + rebate])));
    }
  }

  // The bench against the inner end, between the long sides' posts.
  frame.push(box([-A + w, -A + w + C.bench.depth], [C.floor, C.bench.seat + C.floor], [-W + p, W - p]));
  return { frame, glass };
}

/**
 * A car as ONE RIGID BODY, in the +x+z leg's frame, built the way it was
 * drawn: on a straight rail at the slope its floors are level on (`level`,
 * see {@link carLevel}), the axle midpoint at the origin. Two level decks,
 * the upper one `step` higher and `setback` further in, each a cabin
 * ({@link cabin}), on a chassis of two longerons along the rails, with a
 * hanger under the lower deck's outer end. The panes come back apart
 * (`glass`), for an output of their own.
 *
 * Nothing here reads the leg. Where the car stands and how far it tips are
 * the run's business ({@link carPose}): the graph turns this body onto its
 * pose once, and the page turns it on from there, frame by frame.
 */
interface CarBody {
  /** The boxes, about the axle midpoint on the rail. */
  readonly blocks: readonly Block[];
  /** The cabins' panes, about the same point: the car's glass output. */
  readonly glass: readonly Block[];
  /** The running wheels (the Roux's), about the same point. */
  readonly wheels: readonly Wheel[];
  /** The slope, in radians, on which the floors are level. */
  readonly level: number;
  /** Axle to axle along the rails: the chassis' length. */
  readonly wheelbase: number;
  /** The lower floor's centre, from the axle midpoint. */
  readonly floor: Vec3;
  /**
   * How far over the rail line, square to it, the line the car's pose
   * rides stands: 0 (its axles' points on the rail line), or with running
   * wheels their centres' height, so the pose keeps each wheel's circle
   * tangent to the rail head it is on, the bends included.
   */
  readonly ride: number;
}

/**
 * The slope a car's floors are level on, in radians.
 *
 * OTIS: its decks stack on atan(2.376 / 1.080) = 65.6°, the slope PL-XXII
 * ter Fig. 1 draws the car level on [derived, see `OTIS_CAR`], and Eiffel's
 * text says why it is not 54.6°: « Comme elles sont invariablement reliées
 * au truck qui les supporte, elles prennent pendant leur course toutes les
 * inclinaisons du chemin de roulement … L'attache de la caisse des cabines
 * au châssis a été disposée de telle sorte que dans leur position moyenne,
 * c'est-à-dire à la station du premier étage, leur plancher soit
 * sensiblement horizontal, afin de partager par moitié l'inclinaison
 * qu'elles prennent en sens inverse aux deux extrémités du trajet, laquelle
 * est environ de 0,20 m par mètre » [sourced E1900-TXT p. 135]. Half
 * of 54°35' to 77°30' is 66.0°, and 0.20 m a metre is 11.3°: the plate's
 * 65.6° is that split, to 0.4°.
 *
 * ROUX: the base run's own slope, 54.6°. The book's Roux car is « portée
 * sur la voie de roulement par l'intermédiaire de deux essieux » [sourced
 * E1900-TXT p. 160], so as rigid as the Otis, and every force in its
 * calculation is taken at sin 0.815 [sourced pp. 163-170]: the book puts the
 * car on the straight run and nothing tips it there. The model's rail bends
 * at XXIV, 7 m under the 1st floor, where the leg does, and the car's 9.8
 * wheelbase reaches past it for the last 14 m of the run, tipping it as a
 * rigid body must (see {@link LIFT_CARS}).
 */
function carLevel(spec: CarSpec): number {
  if (spec.setback !== undefined) return Math.atan2(spec.step, spec.setback);
  const line = railLine(spec.top);
  const p = line[0] as readonly [number, number];
  const q = line[1] as readonly [number, number];
  return Math.atan2(q[1] - p[1], p[0] - q[0]);
}

function carBody(spec: CarSpec): CarBody {
  const level = carLevel(spec);
  const [len, high, wide] = spec.deck;
  const slope = Math.tan(level);
  // The straight rail the car was drawn on, through the origin: r = -y /
  // slope, its tangent up the track and its normal up and out.
  const rOf = (y: number) => -y / slope;
  const n = inPlane(Math.sin(level), Math.cos(level));
  // Level floors on a slope: the lower deck's inner end dips TROUGH below
  // the rail line, square to the track (TROUGH √(1 + slope²) vertically),
  // which sets the floor's centre above the rail line. Built with the
  // floor at 0, then moved onto the axle midpoint.
  const lift = Math.max(0.3, (len / 2) * slope - TROUGH * Math.hypot(1, slope));
  const yRail = -lift;
  const r1 = rOf(yRail);
  const back = spec.setback ?? spec.step / slope;
  const r2 = r1 - back;
  // The two cabins, each inside its deck's box: the lower's floor first.
  const lowerCab = cabin(spec, r1, 0, true);
  const upperCab = cabin(spec, r2, spec.step, false);
  const raw: Block[] = [...lowerCab.frame, ...upperCab.frame];
  const panes = [...lowerCab.glass, ...upperCab.glass];
  // Where the decks overlap along the diagonal, the upper floor's bearers
  // stand on the lower roof, the step between them closed [estimated].
  const lapIn = Math.max(r1, r2) - len / 2;
  const lapOut = Math.min(r1, r2) + len / 2;
  if (spec.step > high && lapOut > lapIn) {
    raw.push(levelBox(onDiag((lapIn + lapOut) / 2, (high + spec.step) / 2), lapOut - lapIn, spec.step - high, wide));
  }
  // The chassis, along the rails: from under the lower deck's outer end to
  // under the upper deck's inner end, or `chassis` long about their middle.
  const yOuter = yRail - (len / 2) * slope;
  const yInner = yRail + (back + len / 2) * slope;
  let yLow = yOuter;
  let yHigh = yInner;
  if (spec.chassis !== undefined) {
    const rise = (spec.chassis / 2) * Math.sin(level);
    yLow = (yOuter + yInner) / 2 - rise;
    yHigh = (yOuter + yInner) / 2 + rise;
  }
  const pLow = add3(onDiag(rOf(yLow), yLow), mul3(n, 0.2));
  const pHigh = add3(onDiag(rOf(yHigh), yHigh), mul3(n, 0.2));
  // Between the rails (0.10 wide on the webs), 0.05 clear of them. The
  // rail line crosses both decks on the diagonal (their inner ends dip
  // TROUGH under it), so the chassis cannot be one frame across the gauge,
  // which would run through the cabins: it is two longerons, one each side,
  // from the cabins' walls out to 0.05 short of the rails, their inner faces
  // on the walls' outer faces [estimated form]. Otis 0.22 wide, Roux (its
  // car 3.27 in a 3.57 gauge) 0.05, a web.
  const chassis = member(pLow, pHigh, 0.3, n);
  const beam = (spec.gauge - 0.2) / 2 - wide / 2;
  for (const side of [-1, 1]) {
    raw.push({ ...chassis, at: add3(chassis.at, mul3(E, side * (wide / 2 + beam / 2))), size: [chassis.size[0], 0.3, beam] });
  }
  // The Otis « Poutre transv.le du châssis, long.r 3.800 » [sourced PL-XXII
  // ter Fig. 1], rail to rail: one at the chassis' lower end, under the lower
  // floor, the only place across the gauge that is not a cabin [where
  // estimated]; drawn between the longerons, which make up its ends.
  if (spec.chassis !== undefined) {
    raw.push({ ...chassis, at: add3(pLow, mul3(chassis.x, 0.15)), size: [0.3, 0.3, wide] });
  }
  // The hanger: from the chassis up to the lower floor, at its outer end or
  // at the chassis' end, whichever is further in.
  const rHang = Math.min(r1 + len / 2 - 0.1, rOf(yLow));
  const yHang = yRail + (r1 - rHang) * slope;
  const hang = -yHang;
  if (hang > 0.3) raw.push(levelBox(onDiag(rHang, yHang + hang / 2), 0.2, hang, wide));
  // The Otis safety gear [PL-XXII ter Figs 3-7]: « le système, qui est
  // symétrique », one on each rail, between the chassis' transverse beams
  // P″ and P′ toward its lower end [sourced]: the stack of cast-iron masses
  // M, M1, M2 straddling the rail head, from 0.4 to 1.7 up the rail from the
  // lower axle, between P′ at 0.5 and P″ at 2.3 [measured Fig. 6 at 1:20],
  // « 286 » across and « 184 » deep [sourced parts]; drawn as one block over
  // the rail's head, clear of the girder's flange where the rail bends.
  if (spec.setback !== undefined) {
    const t = inPlane(-Math.cos(level), Math.sin(level));
    const at = add3(add3(onDiag(rOf(yLow), yLow), mul3(t, 1.05)), mul3(n, 0.152));
    for (const side of [-1, 1]) {
      raw.push({ at: add3(at, mul3(E, (side * spec.gauge) / 2)), x: t, y: n, size: [1.3, 0.184, 0.286] });
    }
  }
  // The running gear (the Roux's): at each end of the chassis an axle across
  // the gauge 0.45 over the rail line, its wheels on the rails' heads (0.15
  // over it, `track`) with a rim chord square under each centre, and two
  // axle boxes from the chassis' top up round it [the axle's section and
  // the boxes estimated]. Two things keep every wheel ON its head, never in
  // it, however the car tips [derived]. Its centre is on the line the pose
  // rides (`ride`, the wheels' centres' line), the axles standing on it a
  // chord `wheelbase` apart (`RunLine.chordSpan`): so where the rail bends
  // under the wheelbase each wheel's circle stays tangent to its head, the
  // mitred join included. And the rim is drawn INSIDE that circle: its
  // chords' corners on it, their flats 0.9 mm in, so as the car tips
  // against the rail (11.7° at the top station) a corner comes down onto
  // the head at most, never through it. Built, a corner points straight
  // down, so on the straight every wheel stands on its head.
  let ride = 0;
  const wheels: Wheel[] = [];
  if (spec.running !== undefined) {
    const { diameter, width } = spec.running;
    const t = inPlane(-Math.cos(level), Math.sin(level));
    ride = 0.15 + diameter / 2;
    const sag = 0.001;
    const chords = wheelRimChords(diameter, sag);
    // `wheelBlocks` stands each chord's outer face tangent to the circle it
    // is given, its corners out by this factor: given this diameter, the
    // corners are on the wheel's own.
    const drawn = diameter / Math.hypot(1, Math.sin(Math.PI / chords));
    if (wheelRimChords(drawn, sag) !== chords) {
      throw new Error(`lifts.ts carBody: the running wheel's rim, drawn at ${drawn} to keep its corners on its ${diameter} circle, would be cut in ${wheelRimChords(drawn, sag)} chords, not the ${chords} that diameter assumes; solve the two together.`);
    }
    // The first spoke toward the head: the corner between the last chord
    // and the first points down.
    const ref = mul3(n, -1);
    for (const y of [yLow, yHigh]) {
      const c = add3(onDiag(rOf(y), y), mul3(n, ride));
      const ends = [-1, 1].map((side) => add3(c, mul3(E, (side * spec.gauge) / 2)));
      for (const w of ends) {
        wheels.push({ centre: w, axis: E, ref, spec: { diameter: drawn, rim: 0.06, width, spokes: 6, spoke: 0.05, hub: 0.16, sag } });
      }
      raw.push(member(ends[0] as Vec3, ends[1] as Vec3, 0.12, n));
      // The chassis' top stands 0.35 over the rail line; the axle's 0.51.
      for (const side of [-1, 1]) {
        const at = add3(add3(onDiag(rOf(y), y), mul3(n, (0.35 + ride + 0.06) / 2)), mul3(E, side * (spec.gauge / 2 - 0.185)));
        raw.push({ at, x: t, y: n, size: [0.25, ride + 0.06 - 0.35, 0.14] });
      }
    }
  }
  // The axles stand under the chassis' ends, on the rail: their midpoint,
  // `ride` over it, is the body's origin.
  const yMid = (yLow + yHigh) / 2;
  const mid = add3(onDiag(rOf(yMid), yMid), mul3(n, ride));
  return {
    blocks: raw.map((b) => ({ ...b, at: sub3(b.at, mid) })),
    glass: panes.map((b) => ({ ...b, at: sub3(b.at, mid) })),
    wheels: wheels.map((w) => ({ ...w, centre: sub3(w.centre, mid) })),
    level,
    wheelbase: (yHigh - yLow) / Math.sin(level),
    floor: sub3(onDiag(r1, 0), mid),
    ride,
  };
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

/** A leg-frame axis (a tube's ends) onto quadrant target k. */
const onLegs = (k: number, axis: readonly [Vec3, Vec3]): readonly [Vec3, Vec3] => [onLeg(k, axis[0]), onLeg(k, axis[1])];

/**
 * Many boxes as one mesh: a unit box copied onto one target per block,
 * each carrying its size as `scale` and its turn as `rot` (copyToPoints
 * scales, then turns, then places). The unit box carries its outward face
 * normals as `normal` (meshPrimitive's `normals`); `rotateAttrs` turns them
 * by that same `rot` (a box scaled along its own axes keeps its face
 * normals, so rotation alone is exact). A caller that copies these boxes on
 * again (`copyToQuadrants`) names `normal` in its own `rotateAttrs` to carry
 * the turn through.
 */
function blocks(g: Graph, id: string, list: readonly Block[]): NodeHandle {
  const unit = g.add(meshPrimitive, { shape: "box", size: [1, 1, 1], normals: true }, `${id}Unit`);
  return onFrames(g, id, unit, list, list.map((b) => b.size));
}

/**
 * A mesh copied onto frames, one copy each: a target per frame carrying
 * its centre as P, its turn as `rot` and (given `sizes`) its size as
 * `scale`; the mesh's `normal` turns with it.
 */
function onFrames(
  g: Graph,
  id: string,
  source: NodeHandle,
  list: ReadonlyArray<Pick<Block, "at" | "x" | "y">>,
  sizes?: readonly Vec3[],
): NodeHandle {
  const targets = pointTable(g, `${id}Slots`, list.map((b) => b.at), {
    ...(sizes === undefined ? {} : { scale: ["vec3", sizes] }),
    rot: ["vec4", list.map((b) => frameQuat(b.x, b.y))],
  });
  const out = g.add(copyToPoints, { topology: "keep", rotateAttrs: ["normal"] }, id);
  g.connect(source, "out", out, "source");
  g.connect(targets, "out", out, "target");
  return out;
}

/** Each graph's wheel makes, built once each ({@link wheelTemplate}). */
const WHEEL_TEMPLATES = new WeakMap<Graph, Map<string, NodeHandle>>();

/**
 * A wheel make as one mesh about the origin, its axle +z and its first
 * spoke +x: built the first time a graph asks for it, then shared by
 * every wheel of that make.
 */
function wheelTemplate(g: Graph, spec: WheelSpec): NodeHandle {
  let made = WHEEL_TEMPLATES.get(g);
  if (made === undefined) WHEEL_TEMPLATES.set(g, (made = new Map()));
  const key = JSON.stringify(spec);
  let node = made.get(key);
  if (node === undefined) {
    node = blocks(g, `liftWheel${made.size}`, wheelBlocks(spec));
    made.set(key, node);
  }
  return node;
}

/**
 * A part as one mesh: its boxes, and each of its wheels its make's
 * template turned onto the wheel's frame, the frame {@link wheelBlocks}
 * builds about (the first spoke's direction x, then the axle × x, so
 * the template's +z lands on the axle).
 */
function gear(g: Graph, id: string, part: Gear): NodeHandle {
  const makes = new Map<string, Wheel[]>();
  for (const w of part.wheels) {
    const key = JSON.stringify(w.spec);
    makes.set(key, [...(makes.get(key) ?? []), w]);
  }
  const build: Array<(id: string) => NodeHandle> = [];
  if (part.blocks.length > 0) build.push((to) => blocks(g, to, part.blocks));
  for (const list of makes.values()) {
    const frames = list.map((w) => {
      const x = unit3(sub3(w.ref, mul3(w.axis, dot3(w.ref, w.axis))));
      return { at: w.centre, x, y: cross3(w.axis, x) };
    });
    build.push((to) => onFrames(g, to, wheelTemplate(g, (list[0] as Wheel).spec), frames));
  }
  if (build.length === 1) return (build[0] as (id: string) => NodeHandle)(id);
  return merge(g, id, build.map((b, i) => b(`${id}${i}`)));
}

/**
 * Straight round members of one diameter, each from `a` to `b`, as tubes
 * with their ends capped (the paths are swept after they are placed, so
 * nothing downstream turns them). Their sides by default keep each chord
 * within `sag` of the circle (`chord.ts`), never fewer than the 16 every
 * tube had before, however thin.
 */
function tubes(
  g: Graph,
  id: string,
  list: ReadonlyArray<readonly [Vec3, Vec3]>,
  diameter: number,
  sag: number = SAG.near,
  sides: number = tubeSides(diameter, sag),
): NodeHandle {
  const node = g.add(
    sweepProfile,
    { profile: "circle", sides, radius: diameter / 2, caps: true, frame: "upHint", up: [1, 0, 0] },
    id,
  );
  g.connect(polylines(g, `${id}Axes`, list), "out", node, "in");
  return node;
}

/** A tube's sides: its chords within `sag` of its circle, never fewer than 16. */
export function tubeSides(diameter: number, sag: number): number {
  return circleSegments(diameter / 2, sag, { min: 16 });
}

/** Polylines as paths, one per list, in order. */
function polylines(g: Graph, id: string, lines: ReadonlyArray<readonly Vec3[]>): NodeHandle {
  const pts = lines.flat();
  const which = lines.flatMap((l, i) => l.map(() => i));
  const slots = pointTable(g, `${id}Slots`, pts, { line: ["i32", which] });
  const paths = g.add(pointsToPath, { groupAttr: "line" }, id);
  g.connect(slots, "out", paths, "in");
  return paths;
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
  /** Car plan: along the N–S diagonal, across it [sourced 3.570 × 3.900]. */
  car: { along: 3.57, across: 3.9 },
  /** Pistons (upper car) and brake columns (lower car), each side of a car's axis [sourced 4.064 / 2]. */
  guide: 2.032,
  /** The outboard guide posts' axes, out along the diagonal [estimated, Plate I]. */
  outboard: 5.15,
  /** How far each car stands from the landing when the graph builds it: mid-run [estimated moment]. */
  travel: 40.1,
} as const;

/**
 * An Edoux car's body, about its floor's centre, in heights above the
 * floor [sourced PL-XXIII quater Fig 2 and ter Fig 17: « 2.685 » overall
 * and « 2.250 » inside, the text's « 2,20 m »; measured on the same
 * figures at 236 px/m, the overall from the floor frame's underside 0.20
 * below the floor to the roof 2.49 above it]. « Tôle pleine jusqu'à 1,10 m
 * au-dessus du plancher », glazing and a wire grille above [sourced E1900-
 * TXT p. 173], five bays to a long side [measured]; « Un garde-corps
 * entoure le dessus de la Cabine » [sourced quater Fig 1, ter Fig 20], its
 * height [estimated 1.0]. Plate and post sections [estimated].
 */
const EDOUX_BODY = {
  under: 0.2,
  sill: 1.1,
  head: 2.25,
  roof: 2.49,
  wall: 0.04,
  post: 0.06,
  bays: { long: 5, end: 3 },
  railing: 1.0,
} as const;

/**
 * The Edoux machinery [sourced PL-XXIII ter, quater; E1900-TXT pp. 171-192;
 * readings in the machinery notes, SOURCES.md §11.5]. Heights are z.
 * - PISTONS: Ø 0.320, 80.960 long, the top 0.875 under the upper car's
 *   floor [derived: « 308,755 » at the top of the stroke, the 3rd floor at
 *   309.63]; a steel head 0.3 above it to the palonnier's pin, 0.58 under
 *   the floor [measured quater Fig 2].
 * - CYLINDERS: bore 0.360 in 10 mm plate, Ø 0.380 [sourced ter Fig 19],
 *   81.06 long [sourced p. 172] up to « 228,56 », z 195.06 [sourced p. 191],
 *   so from z 114.00; a gland Ø 0.54 [measured] on the top, and the
 *   cast-steel cap « 916 × 580 », « 190 » high [sourced ter Fig 30] with
 *   its flange at z 194.5 [measured], on two cross beams « 0,718 » apart
 *   [sourced p. 172], 0.43 deep [measured], between two « poutres E » 1.20
 *   deep [sourced p. 172] either side of the car line (t ±0.55 [measured
 *   ±0.15]) from the landing's Nord edge to the central post.
 * - GUIDE COLUMNS: Co1, the pistons' hollow cast-iron columns from the
 *   landing to the 3rd floor, slotted toward the car [sourced legend],
 *   bore 0.380 [sourced quater Fig 2], outside 0.44 [measured], 0.42 in
 *   the model, where the inner one's axis, 0.218 off the central post's
 *   face, leaves no more (« boulonnées sur les poteaux-guides »); Co2, the
 *   lower car's brake columns « avec dents hélicoïdales à l'intérieur »,
 *   Ø 0.43 [derived: « Entre les colonnes 3m632 » on axes 4.064], slotted
 *   toward the car too, from the pit « sous l'Ascenseur Edoux », 3.3 under
 *   the 2nd floor [measured], to the landing.
 * - PALONNIERS: the upper car's under its floor, a bowed beam 4.30 to its
 *   pins' blocks on the pistons' axes (« 240 » wide, sourced; 4.45 measured
 *   over the yokes), 0.45 to 0.90 under the floor at its middle and to 0.71
 *   at its ends [measured]; the lower car's on its roof, its pins about
 *   4.00 apart and 4.1 overall, its pivot 2.83 over its floor [measured ter
 *   Fig 17; the text's 2.83]; widths [estimated: B's lozenge, 0.75 at the
 *   middle, measured ter Fig 18], their ends 0.16 through the columns'
 *   slots. The upper car's roof frame, 4.28 long at 2.34-2.53 [measured],
 *   with the tensioner rods of cables c and d at its ends up to 3.51 above
 *   the floor [derived from p. 174's reckoning]. Under the lower car the
 *   brake frame, 0.40 to 1.91 under its floor [measured; « 1.565 » is its
 *   foot under the floor beams], arms out to the spindles in the columns,
 *   and « Passerelle du Parachute, 500 de large » 2.1 below [sourced width;
 *   measured]; its floor beams run out to cables a and b's tensioners,
 *   0.8 up at 2.062 from its axis [measured ter Fig 17].
 * - PULLEYS: six « Poulies de renvoi en acier » between the continuous
 *   diagonal girder's webs (`summit.ts`), in pairs on s = -4.064, 0, +4.064
 *   [sourced « 8,128 »]: grooves Ø 1.326 over Ø 1.206, flanges Ø 1.370 and
 *   1.250, 0.235 wide, four spokes, axle Ø 0.180 [sourced quater Figs 3-4];
 *   the outer pairs' axles at z 284.73 and 283.33, the middle pair's at
 *   283.03 and 281.63 [sourced p. 175's heights, 8.60 / 7.20 / 6.90 / 5.50
 *   over the 3rd floor (309.63); the girder's windows fall on them].
 * - CABLES: four flat cables, 0.200 across and 0.032 thick [sourced], all
 *   in the cars' plane (t = 0): a over the outer upper pulleys, c the outer
 *   lower, d the middle upper, b the middle lower, dropping at s ±4.712,
 *   ±4.652, ±0.648, ±0.588 [derived: the printed « 9.424 » and « 9.304 »
 *   between the two strands, measured to ±0.03]. On the upper car a and b
 *   end at the palonnier's end pins, c and d at its roof frame's
 *   tensioners; on the lower car c and d at its roof palonnier, a and b at
 *   tensioners 0.8 above its floor [measured ter Fig 17].
 * - SUD CABLE GUIDES above the landing, « Poteau-guide des câbles 390 ×
 *   580 » at s +4.682 [sourced PL-XX Figs 1-2; 390 along s, measured], and
 *   a light one beside the central post at s +0.618 [measured; section
 *   estimated], up to the girder's underside (z 280.98, `summit.ts`).
 * - TANKS: the return tank on the landing, Ø 3.00 × 3.80 [sourced quater
 *   Fig 17], at s 0, t -5.8, z 196.21-200.00 on a console of the Est
 *   girder [measured ter Figs 19-20]; the supply tank, the same, hung
 *   under the 3rd floor at s +1.7, t -1.8, z 270.83-274.63 [measured quater
 *   Fig 1, PL-XIX Fig 9]. The book's « 5,00 m … 50 m³ » is the OCR's 3 read
 *   as 5; its other passages and the plates give 3.00.
 * - UNDER THE LANDING: « Plancher des Machinistes (227.17) », z 193.67
 *   [sourced], over the Nord-Est quarter, s -5.67 to the central post,
 *   t -0.6 to -5.67 [derived]; the two distributors « 890 » apart at
 *   s -4.68 and -3.79, t -2.3 [measured], Ø 0.35 [sourced « 350 »].
 */
const EDOUX_GEAR = {
  piston: { diameter: 0.32, length: 80.96, below: 0.875, head: 0.295 },
  cylinder: { diameter: 0.38, foot: 114.0, top: 195.06, gland: 0.54, glandInner: 0.43, glandHigh: 0.3 },
  cap: { along: 0.916, across: 0.58, high: 0.19, at: 194.5 },
  cross: { apart: 0.718, depth: 0.43, top: 194.51, width: 0.15, post: 0.992 },
  girderE: { depth: 1.2, bottom: 193.74, t: 0.55, flange: 0.2, from: -5.54 },
  co1: { outside: 0.42, wall: 0.03, staves: 12, slot: 2 },
  co2: { outside: 0.43, wall: 0.03, staves: 12, slot: 2, foot: 112.4 },
  palonnierA: { length: 4.3, top: 0.45, middle: 0.9, end: 0.71, width: 0.5, endWidth: 0.16 },
  roofFrameA: { length: 4.28, bottom: 2.34, top: 2.53, width: 0.3, endWidth: 0.16, rod: 0.06, rodTop: 3.51 },
  palonnierB: { length: 4.1, bottom: 2.68, top: 2.98, width: 0.5, endWidth: 0.16 },
  brakeFrame: { top: 0.4, bottom: 1.91, post: 0.1, half: 1.7, spindle: [0.58, 1.72] as readonly [number, number] },
  /** The lower car's floor beams run out to its tensioners, over the columns' axes [measured]. */
  tensionerB: { reach: 2.12, at: 0.8 },
  walkway: { along: 3.6, wide: 0.5, at: 2.1, thick: 0.04 },
  pulley: {
    groove: [1.326, 1.206] as readonly [number, number],
    flange: [1.37, 1.25] as readonly [number, number],
    width: 0.235,
    axle: 0.18,
    hub: 0.26,
    /** Axle heights (z) of the upper and lower pulley of each pair, outer pairs then the middle one. */
    outer: [284.73, 283.33] as readonly [number, number],
    middle: [283.03, 281.63] as readonly [number, number],
    at: 4.064,
    /** Between the girder's webs, 0.770 apart: the axle spans them. */
    webs: 0.77,
    /**
     * The axle runs through the web's window (`summit.ts` GIRDER_AT, 0.500
     * wide) and turns in a bearing bolted over it on the web plate's outer
     * face [the form estimated]: 0.56 along s, 0.03 onto the plate either
     * side of the window, and 0.70 high, stopped at the chords, the girder's
     * foot 280.98 and top 285.48 less their « Âme 400 » [sourced, `summit.ts`
     * GIRDER]. The web plate 0.03 [estimated there], so the bearing stands
     * from 0.40 off the axis out to the axle's end.
     */
    bearing: { along: 0.56, high: 0.7, webPlate: 0.03, chords: [281.38, 285.08] as readonly [number, number] },
  },
  cable: { across: 0.2, thick: 0.032, a: 4.712, c: 4.652, d: 0.648, b: 0.588 },
  cableGuide: { s: 4.682, along: 0.39, across: 0.58, light: { s: 0.618, side: 0.26 }, top: 280.98, wall: 0.012, slot: 0.2 },
  tanks: [
    { s: 0, t: -5.8, bottom: 196.21, top: 200.0 },
    { s: 1.7, t: -1.8, bottom: 270.83, top: 274.63 },
  ],
  tank: { diameter: 3.0 },
  /**
   * What carries the tanks [the form estimated]. The return tank's console
   * off the Est girder: three bearers square to it, 0.20 wide, from the
   * landing's deck (195.93) up to the tank's bottom, running out over the
   * deck's edge (t -5.67, the girder under it) under the tank's outboard
   * half, each as long as the tank's circle leaves room for; under each,
   * the console's strut, 0.10 square, from the Est girder's lattice out
   * and up to the bearer's end, 0.12 in from it. The girder's members'
   * outer face stands at t -5.729 [measured on the cooked landing]: its
   * verticals at s ±1.133, 193.53-195.59, carry the outer bearers' struts
   * at 194.20, and its diagonal between them, whose axis crosses s 0 at
   * 194.56, the middle one's. The supply
   * tank's four hangers, 0.08 square on a 1.50 square, from its top up to
   * the underside of the 3rd floor's 0.86 deck (275.27, `platforms.ts`).
   */
  tankSupports: {
    bearers: [-1.133, 0, 1.133] as readonly number[],
    bearer: 0.2,
    /** `foot`: where each bearer's strut meets the girder, by bearer; the middle one's inner corner lands on the diagonal's axis. */
    strut: { width: 0.1, web: -5.729, foot: [194.2, 194.53, 194.2] as readonly number[], fromEnd: 0.12 },
    hanger: 0.08,
    hangerAt: 0.75,
    underside: 275.27,
  },
  machinists: { y: 193.67, s: [-5.54, -1.54] as readonly [number, number], t: [-5.54, -2.2] as readonly [number, number], thick: 0.06 },
  distributors: { s: [-4.68, -3.79] as readonly number[], t: -2.3, diameter: 0.35 },
} as const;

/** A post of the shaft, square to the N–S diagonal. */
function shaftPost(s: number, y0: number, y1: number, alongS: number, acrossS: number, t = 0): Block {
  return { at: inShaft(s, (y0 + y1) / 2, t), x: S_HAT, y: UP, size: [alongS, y1 - y0, acrossS] };
}

/** A box in the shaft frame, from its extents in s, y and t. */
function shaftBox(s: readonly [number, number], y: readonly [number, number], t: readonly [number, number]): Block {
  return {
    at: inShaft((s[0] + s[1]) / 2, (y[0] + y[1]) / 2, (t[0] + t[1]) / 2),
    x: S_HAT,
    y: UP,
    size: [s[1] - s[0], y[1] - y[0], t[1] - t[0]],
  };
}

/** The guide posts that stay in "girders": the central and outboard ones. */
function edouxGuides(): Block[] {
  const { second, landing, third } = FLOORS;
  return [
    // The central guide post, « Poteau-guide central 800 × 600 » [sourced
    // PL-XXIII quater Fig 2, ter Fig 19; PL-XX's "890" is the 8 misread].
    shaftPost(0, second, third, 0.8, 0.6),
    // A "500 × 600" guide post outboard of each car. Plate I's face-on
    // elevation draws them as two vertical lines 3.64 either side of the
    // axis from the 2nd floor up [estimated: measured at 15.80 px/m], so
    // 3.64 √2 = 5.15 out along the diagonal [derived].
    // The Nord one stops under the landing's machinery and starts again at
    // its floor: the outer cylinder's cap and cross beams (see
    // `EDOUX_GEAR`), 0.458 and 0.359 outboard of its axis at s -4.682,
    // reach under it, and PL-XXIII ter Fig. 20 draws no post there within
    // 1.2 of the piston [measured]; so here it frames into the E girders'
    // level [estimated].
    shaftPost(-EDOUX.outboard, second, EDOUX_GEAR.girderE.bottom, 0.5, 0.6),
    shaftPost(-EDOUX.outboard, landing, third, 0.5, 0.6),
    shaftPost(EDOUX.outboard, second, third, 0.5, 0.6),
  ];
}

/** A vertical tube in the shaft frame. */
interface Tube {
  readonly s: number;
  readonly t: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * The Edoux machinery that stands still: cylinders and their heads, the
 * cross beams and E girders under them, the columns Co1 and Co2, the
 * Sud cable guides, the tanks, the machinists' floor and distributors,
 * the pulleys' axles. Boxes here; the round members are {@link edouxTubes}.
 */
function edouxGear(): Block[] {
  const G = EDOUX_GEAR;
  const n = -EDOUX.carAxis;
  const pistons = [n - EDOUX.guide, n + EDOUX.guide];
  const out: Block[] = [];
  const { along, across, high, at } = G.cap;
  const w = G.cross.width / 2;
  const beam = (c: number) =>
    shaftBox([c - w, c + w], [G.cross.top - G.cross.depth, G.cross.top], [-G.girderE.t, G.girderE.t]);
  // The outer cylinder's cap on its two cross beams « 0,718 » apart.
  const outer = pistons[0] as number;
  out.push(shaftBox([outer - along / 2, outer + along / 2], [at - high / 2, at + high / 2], [-across / 2, across / 2]));
  out.push(beam(outer - G.cross.apart / 2), beam(outer + G.cross.apart / 2));
  // The inner one stands 0.218 off the central post's face, too close for a
  // cap 0.916 along s: « une troisième entretoise … à 0,992 » of the post
  // carries it [sourced p. 172, read from the post's axis], the post the
  // other side, so its cap spans the two the other way, 0.580 along s and
  // 0.916 across [derived].
  const post = 0.4;
  out.push(beam(-G.cross.post));
  out.push(shaftBox([-post - across, -post], [at - high / 2, at + high / 2], [-along / 2, along / 2]));
  // The two E girders, from the landing's Nord edge to the central post.
  const E = G.girderE;
  for (const side of [-1, 1]) {
    const t = side * E.t;
    out.push(shaftBox([E.from, -0.4], [E.bottom, E.bottom + E.depth], [t - E.flange / 2, t + E.flange / 2]));
  }
  // Co1, the pistons' columns from the landing to the 3rd floor, and Co2,
  // the lower car's brake columns from its pit to the landing: slotted
  // rings of staves, the slot toward the car's axis.
  for (const p of pistons) out.push(...slotted(p, n, FLOORS.landing, FLOORS.third, G.co1));
  const sud = EDOUX.carAxis;
  for (const p of [sud - EDOUX.guide, sud + EDOUX.guide]) out.push(...slotted(p, sud, G.co2.foot, FLOORS.landing, G.co2));
  // The Sud cable guides above the landing: « léger caisson en tôle et
  // cornières » [sourced p. 172], hollow, the cables in them and a slot on
  // the car's side the lower car's roof palonnier rides up into as it
  // arrives, as the upper car's does in its columns [the slot estimated].
  const CG = G.cableGuide;
  const s0 = EDOUX.carAxis;
  for (const [cs, along, across] of [
    [CG.s, CG.along, CG.across],
    [CG.light.s, CG.light.side, CG.light.side],
  ] as const) {
    const y: readonly [number, number] = [FLOORS.landing, CG.top];
    const w = CG.wall;
    const toCar = Math.sign(s0 - cs);
    const near = cs + (toCar * along) / 2;
    const far = cs - (toCar * along) / 2;
    out.push(shaftBox([Math.min(far, far + toCar * w), Math.max(far, far + toCar * w)], y, [-across / 2, across / 2]));
    for (const t of [-across / 2, across / 2 - w]) out.push(shaftBox([cs - along / 2, cs + along / 2], y, [t, t + w]));
    const face: readonly [number, number] = [Math.min(near, near - toCar * w), Math.max(near, near - toCar * w)];
    for (const [t0, t1] of [
      [-across / 2, -CG.slot / 2],
      [CG.slot / 2, across / 2],
    ] as const) {
      out.push(shaftBox(face, y, [t0, t1]));
    }
  }
  // The machinists' floor.
  const M = G.machinists;
  out.push(shaftBox(M.s, [M.y - M.thick, M.y], M.t));
  // The tanks' supports: the return tank's bearers on the landing, the
  // supply tank's hangers from the 3rd floor.
  const TS = G.tankSupports;
  const [ret, supply] = G.tanks;
  const rTank = G.tank.diameter / 2 - 0.05;
  for (const [i, bs] of TS.bearers.entries()) {
    const reach = Math.sqrt(rTank ** 2 - (Math.abs(bs) + TS.bearer / 2) ** 2);
    out.push(shaftBox([ret.s + bs - TS.bearer / 2, ret.s + bs + TS.bearer / 2], [FLOORS.landing, ret.bottom], [ret.t - reach, ret.t + reach]));
    // Its strut, in the bearer's plane: its ends square to it, so the foot
    // stands off the web by as much as its section leans, its inner corner
    // on the web's face, and the head's lower corner 0.01 into the bearer.
    const S = TS.strut;
    const foot = S.foot[i] as number;
    const tTop = ret.t - reach + S.fromEnd;
    let tFoot = S.web;
    let yTop = FLOORS.landing;
    for (let k = 0; k < 3; k++) {
      const L = Math.hypot(tTop - tFoot, yTop - foot);
      tFoot = S.web - ((S.width / 2) * (yTop - foot)) / L;
      yTop = FLOORS.landing + 0.01 + ((S.width / 2) * (tFoot - tTop)) / L;
    }
    out.push(member(inShaft(ret.s + bs, foot, tFoot), inShaft(ret.s + bs, yTop, tTop), S.width, S_HAT));
  }
  const hh = TS.hanger / 2;
  for (const ds of [-TS.hangerAt, TS.hangerAt]) {
    for (const dt of [-TS.hangerAt, TS.hangerAt]) {
      const at = [supply.s + ds, supply.t + dt] as const;
      out.push(shaftBox([at[0] - hh, at[0] + hh], [supply.top, TS.underside], [at[1] - hh, at[1] + hh]));
    }
  }
  // The pulleys' axles, across the girder's webs.
  const P = G.pulley;
  for (const [s, ys] of [
    [-P.at, P.outer],
    [0, P.middle],
    [P.at, P.outer],
  ] as const) {
    for (const y of ys) {
      out.push({ at: inShaft(s, y), x: T_HAT, y: UP, size: [P.webs + 0.2, P.axle, P.axle] });
      // Its bearings, one on each web's outer face over the window.
      const B = P.bearing;
      const face = P.webs / 2 + B.webPlate / 2;
      const end = (P.webs + 0.2) / 2;
      const yb: readonly [number, number] = [Math.max(B.chords[0], y - B.high / 2), Math.min(B.chords[1], y + B.high / 2)];
      for (const t of [
        [face, end],
        [-end, -face],
      ] as const) {
        out.push(shaftBox([s - B.along / 2, s + B.along / 2], yb, t));
      }
    }
  }
  return out;
}

/**
 * A slotted column on the N–S diagonal at `s`, from y0 to y1: a ring of
 * staves, less the `slot` of them facing the car whose axis is at `car`.
 */
function slotted(
  s: number,
  car: number,
  y0: number,
  y1: number,
  o: { readonly outside: number; readonly wall: number; readonly staves: number; readonly slot: number },
): Block[] {
  const r = o.outside / 2 - o.wall / 2;
  const stave = 2 * r * Math.sin(Math.PI / o.staves) + o.wall * Math.tan(Math.PI / o.staves);
  const toCar = Math.sign(car - s);
  const out: Block[] = [];
  for (let i = 0; i < o.staves; i++) {
    // Stave i at angle a from +s; the slot is the `slot` staves about the
    // direction of the car.
    const a = ((i + 0.5) * 2 * Math.PI) / o.staves;
    const off = Math.abs(Math.atan2(Math.sin(a), Math.cos(a) * toCar));
    if (off < (o.slot * Math.PI) / o.staves) continue;
    const d = add3(mul3(S_HAT, Math.cos(a)), mul3(T_HAT, Math.sin(a)));
    out.push({
      at: inShaft(s + Math.cos(a) * r, (y0 + y1) / 2, Math.sin(a) * r),
      x: cross3(UP, d),
      y: UP,
      size: [stave, y1 - y0, o.wall],
    });
  }
  return out;
}

/** The Edoux's round members that stand still, as vertical tubes by diameter. */
function edouxTubes(): Array<{ id: string; diameter: number; tubes: Tube[] }> {
  const G = EDOUX_GEAR;
  const n = -EDOUX.carAxis;
  const pistons = [n - EDOUX.guide, n + EDOUX.guide];
  const s = EDOUX.carAxis;
  const C = G.cylinder;
  return [
    { id: "Cylinders", diameter: C.diameter, tubes: pistons.map((p) => ({ s: p, t: 0, y0: C.foot, y1: C.top - C.glandHigh })) },
    // The glands Ø 0.54 [measured]; the inner one, whose axis stands 0.218
    // off the central post's face, drawn 0.43.
    { id: "Glands", diameter: C.gland, tubes: [{ s: pistons[0] as number, t: 0, y0: C.top - C.glandHigh, y1: C.top }] },
    { id: "GlandInner", diameter: C.glandInner, tubes: [{ s: pistons[1] as number, t: 0, y0: C.top - C.glandHigh, y1: C.top }] },
    {
      id: "Tanks",
      diameter: G.tank.diameter,
      tubes: G.tanks.map((k) => ({ s: k.s, t: k.t, y0: k.bottom, y1: k.top })),
    },
    {
      id: "Distributors",
      diameter: G.distributors.diameter,
      tubes: G.distributors.s.map((d) => ({ s: d, t: G.distributors.t, y0: G.machinists.y, y1: FLOORS.landing - 0.25 })),
    },
  ];
}

/**
 * An Edoux car's body, about its floor's centre on the car's axis `s`, at
 * floor height `floor`, in the shaft frame: the floor frame, the plate to
 * the sill, the window posts, the frieze to the roof, the roof and the
 * railing round it.
 */
function edouxBody(s: number, floor: number): Block[] {
  const B = EDOUX_BODY;
  const along = EDOUX.car.along / 2;
  const across = EDOUX.car.across / 2;
  const box = (ds: readonly [number, number], y: readonly [number, number], t: readonly [number, number]) =>
    shaftBox([s + ds[0], s + ds[1]], [floor + y[0], floor + y[1]], t);
  const w = B.wall;
  const out: Block[] = [box([-along, along], [-B.under, 0], [-across, across])];
  // Plate to the sill and frieze from the window heads to the roof, round
  // all four sides.
  for (const [y0, y1] of [
    [0, B.sill],
    [B.head, B.roof],
  ] as const) {
    out.push(box([-along, along], [y0, y1], [-across, -across + w]));
    out.push(box([-along, along], [y0, y1], [across - w, across]));
    out.push(box([-along, -along + w], [y0, y1], [-across + w, across - w]));
    out.push(box([along - w, along], [y0, y1], [-across + w, across - w]));
  }
  // The window posts: bays on the long sides (along s) and the ends.
  const p = B.post / 2;
  for (let i = 0; i <= B.bays.long; i++) {
    const ds = -along + p + ((2 * along - 2 * p) * i) / B.bays.long;
    for (const t of [-across + p, across - p]) out.push(box([ds - p, ds + p], [B.sill, B.head], [t - p, t + p]));
  }
  for (let i = 1; i < B.bays.end; i++) {
    const t = -across + p + ((2 * across - 2 * p) * i) / B.bays.end;
    for (const ds of [-along + p, along - p]) out.push(box([ds - p, ds + p], [B.sill, B.head], [t - p, t + p]));
  }
  // The roof, and the railing round it: corner and mid posts, a top rail.
  out.push(box([-along, along], [B.roof - 0.05, B.roof], [-across, across]));
  const top = B.roof + B.railing;
  for (const ds of [-along + p, 0, along - p]) {
    for (const t of [-across + p, across - p]) out.push(box([ds - p, ds + p], [B.roof, top], [t - p, t + p]));
  }
  for (const t of [-across + p, 0, across - p]) {
    if (t === 0) continue;
    for (const ds of [-along + p, along - p]) out.push(box([ds - p, ds + p], [B.roof, top], [t - p, t + p]));
  }
  out.push(box([-along, along], [top - p, top + p], [-across, -across + 2 * p]));
  out.push(box([-along, along], [top - p, top + p], [across - 2 * p, across]));
  out.push(box([-along, -along + 2 * p], [top - p, top + p], [-across, across]));
  out.push(box([along - 2 * p, along], [top - p, top + p], [-across, across]));
  return out;
}

/**
 * The upper car, A, « cabine motrice », at floor height `floor`: its body,
 * the palonnier under it, the roof frame and the tensioner rods of cables
 * c and d.
 */
function edouxCarA(floor: number): Block[] {
  const s = -EDOUX.carAxis;
  const G = EDOUX_GEAR;
  const P = G.palonnierA;
  const R = G.roofFrameA;
  const box = (ds: readonly [number, number], y: readonly [number, number], t: number) =>
    shaftBox([s + ds[0], s + ds[1]], [floor + y[0], floor + y[1]], [-t / 2, t / 2]);
  const half = P.length / 2;
  const mid = 1.0;
  const out = edouxBody(s, floor);
  // The palonnier: deep in the middle, shallower at its ends, where it
  // passes through the columns' slots to the pistons' pins.
  out.push(box([-mid, mid], [-P.middle, -P.top], P.width));
  out.push(box([-half, -mid], [-P.end, -P.top], P.endWidth));
  out.push(box([mid, half], [-P.end, -P.top], P.endWidth));
  // The roof frame, its ends narrow through the columns' slots, and a
  // tensioner rod at each end.
  const car = EDOUX.car.along / 2;
  out.push(box([-car, car], [R.bottom, R.top], R.width));
  out.push(box([-R.length / 2, -car], [R.bottom, R.top], R.endWidth));
  out.push(box([car, R.length / 2], [R.bottom, R.top], R.endWidth));
  // c drops at s -4.652 and d at -0.648: 2.002 either side of the car's axis.
  const rodAt = [-(G.cable.c - EDOUX.carAxis), EDOUX.carAxis - G.cable.d];
  for (const ds of rodAt) out.push(box([ds - R.rod / 2, ds + R.rod / 2], [R.top, R.rodTop], R.rod));
  return out;
}

/**
 * The lower car, B, « cabine contrepoids », at floor height `floor`: its
 * body, its palonnier on the roof, the brake frame under it and the
 * walkway under that.
 */
function edouxCarB(floor: number): Block[] {
  const s = EDOUX.carAxis;
  const G = EDOUX_GEAR;
  const box = (ds: readonly [number, number], y: readonly [number, number], t: readonly [number, number]) =>
    shaftBox([s + ds[0], s + ds[1]], [floor + y[0], floor + y[1]], t);
  const out = edouxBody(s, floor);
  // The palonnier on its roof, its pins about 4.00 apart and 4.1 overall
  // [measured ter Fig. 17]: broad in the middle, its ends narrow enough for
  // the slots of the columns and cable guides they ride in.
  const P = G.palonnierB;
  const mid = 1.0;
  out.push(box([-mid, mid], [P.bottom, P.top], [-P.width / 2, P.width / 2]));
  for (const side of [-1, 1]) {
    const ds: readonly [number, number] = side < 0 ? [-P.length / 2, -mid] : [mid, P.length / 2];
    out.push(box(ds, [P.bottom, P.top], [-P.endWidth / 2, P.endWidth / 2]));
  }
  // The brake frame, « Bâti du parachute », X-braced between its posts,
  // 0.40 to 1.91 under the floor [measured PL-XXIII ter Fig. 17; « 1.565 »
  // is its foot under the floor beams], its arms out through the columns'
  // slots to the spindles « concentriques à la colonne » (4.072 apart,
  // sourced), each about 1.1 long [measured].
  const F = G.brakeFrame;
  const h = F.half;
  const q = F.post / 2;
  const tb = 0.6;
  // Its posts carried on up to the floor frame's underside, 0.20 under the
  // floor, which the frame hangs from [derived: the frame's top 0.40 under
  // the floor, the floor frame 0.20 deep]; and at each end a cross member
  // at the frame's top and foot tying its two sides, which the arms run
  // out from and the walkway's hangers hang from [the form estimated].
  for (const ds of [-h, h]) {
    for (const t of [-tb, tb]) out.push(box([ds - q, ds + q], [-F.bottom, -EDOUX_BODY.under], [t - q, t + q]));
    for (const y of [F.top, F.bottom]) out.push(box([ds - q, ds + q], [-y - q, -y + q], [-tb, tb]));
  }
  for (const t of [-tb, tb]) {
    out.push(box([-h, h], [-F.bottom - q, -F.bottom + q], [t - q, t + q]));
    out.push(member(inShaft(s - h, floor - F.bottom, t), inShaft(s + h, floor - F.top, t), 0.06, T_HAT));
    out.push(member(inShaft(s - h, floor - F.top, t), inShaft(s + h, floor - F.bottom, t), 0.06, T_HAT));
  }
  for (const side of [-1, 1]) {
    for (const y of [F.top, F.bottom]) {
      out.push(box(side < 0 ? [-EDOUX.guide, -h] : [h, EDOUX.guide], [-y - q, -y + q], [-0.06, 0.06]));
    }
    const at = side * EDOUX.guide;
    out.push(box([at - 0.07, at + 0.07], [-F.spindle[1], -F.spindle[0]], [-0.07, 0.07]));
    // The spindle's journals, on up and down into the arms' ends, which
    // carry it [derived: the arms at 0.40 and 1.91, the spindle 0.58-1.72].
    for (const [y0, y1] of [
      [-F.bottom, -F.spindle[1]],
      [-F.spindle[0], -F.top],
    ] as const) {
      out.push(box([at - 0.04, at + 0.04], [y0, y1], [-0.04, 0.04]));
    }
  }
  // The walkway, hung from the frame's foot.
  const W = G.walkway;
  out.push(box([-W.along / 2, W.along / 2], [-W.at - W.thick, -W.at], [-W.wide / 2, W.wide / 2]));
  for (const ds of [-W.along / 2 + 0.1, W.along / 2 - 0.1]) {
    for (const t of [-W.wide / 2, W.wide / 2]) out.push(box([ds - 0.015, ds + 0.015], [-W.at, -F.bottom], [t - 0.015, t + 0.015]));
  }
  // The floor beams out to cables a and b's tensioners, 0.8 up [measured
  // ter Fig. 17], at 2.062 either side of the car's axis, in the columns.
  const T = G.tensionerB;
  const along = EDOUX.car.along / 2;
  for (const side of [-1, 1]) {
    out.push(box(side < 0 ? [-T.reach, -along] : [along, T.reach], [-EDOUX_BODY.under, 0], [-0.06, 0.06]));
    const at = side * (G.cable.a - EDOUX.carAxis);
    out.push(box([at - 0.03, at + 0.03], [0, T.at + 0.05], [-0.03, 0.03]));
  }
  return out;
}

/** The two cars' floors where the graph builds them: the upper `travel` above the landing, the lower as far below. */
const EDOUX_FLOOR = { a: FLOORS.landing + EDOUX.travel, b: FLOORS.landing - EDOUX.travel } as const;

/** One flat cable's straight run, as a block from p to q (0.200 across the plane, 0.032 in it). */
function cableRun(p: Vec3, q: Vec3): Block {
  const C = EDOUX_GEAR.cable;
  const x = unit3(sub3(q, p));
  return { at: mul3(add3(p, q), 0.5), x, y: T_HAT, size: [Math.hypot(...sub3(q, p)), C.across, C.thick] };
}

/** A cable wrapped over a pulley's top at radius `rho`, from angle a0 to a1 (0 = +s, π/2 = up), in `n` chords. */
function cableWrap(s: number, y: number, rho: number, a0: number, a1: number, n: number): Block[] {
  const pt = (a: number): Vec3 => inShaft(s + rho * Math.cos(a), y + rho * Math.sin(a));
  const out: Block[] = [];
  for (let i = 0; i < n; i++) out.push(cableRun(pt(a0 + ((a1 - a0) * i) / n), pt(a0 + ((a1 - a0) * (i + 1)) / n)));
  return out;
}

/**
 * The cables where they do not move in length: over the girder, a and c
 * from one outer pulley to the other, each wrapped a quarter turn at
 * either end, b and d half a turn over the middle pulleys. The drops are
 * {@link EDOUX_DROPS}.
 */
function edouxCableTops(): Block[] {
  const P = EDOUX_GEAR.pulley;
  const C = EDOUX_GEAR.cable;
  const out: Block[] = [];
  for (const [rho, y] of [
    [C.a - P.at, P.outer[0]],
    [C.c - P.at, P.outer[1]],
  ] as const) {
    out.push(cableRun(inShaft(-P.at, y + rho), inShaft(P.at, y + rho)));
    out.push(...cableWrap(-P.at, y, rho, Math.PI / 2, Math.PI, 6));
    out.push(...cableWrap(P.at, y, rho, 0, Math.PI / 2, 6));
  }
  for (const [rho, y] of [
    [C.d, P.middle[0]],
    [C.b, P.middle[1]],
  ] as const) {
    out.push(...cableWrap(0, y, rho, 0, Math.PI, 12));
  }
  return out;
}

/**
 * Each cable's two drops, from its pulley's axle height down to the car
 * it holds, as built: Nord to the upper car, Sud to the lower. On the
 * upper car a and b end at the palonnier's pins, 0.58 under its floor,
 * and c and d at the roof frame's tensioners, 3.51 over it; on the lower
 * car a and b at tensioners 0.8 over its floor, c and d at its roof
 * palonnier's ends, 2.77 over it [measured and derived, see `EDOUX_GEAR`].
 * As the upper car rises by h, each Nord drop shortens by h and each Sud
 * drop lengthens by as much: one length of cable, one of each car's
 * counterweight.
 */
const EDOUX_DROPS = (() => {
  const P = EDOUX_GEAR.pulley;
  const C = EDOUX_GEAR.cable;
  const cables = [
    { k: "a", s: C.a, top: P.outer[0], onA: -0.58, onB: EDOUX_GEAR.tensionerB.at },
    { k: "c", s: C.c, top: P.outer[1], onA: EDOUX_GEAR.roofFrameA.rodTop, onB: 2.83 },
    { k: "d", s: C.d, top: P.middle[0], onA: EDOUX_GEAR.roofFrameA.rodTop, onB: 2.83 },
    { k: "b", s: C.b, top: P.middle[1], onA: -0.58, onB: EDOUX_GEAR.tensionerB.at },
  ] as const;
  return cables.flatMap(({ k, s, top, onA, onB }) => [
    { name: `edoux.cable.${k}.nord`, s: -s, top, bottom: EDOUX_FLOOR.a + onA, rate: -1 },
    { name: `edoux.cable.${k}.sud`, s, top, bottom: EDOUX_FLOOR.b + onB, rate: 1 },
  ]);
})();

/** The pistons as built, with their steel heads: rigid with the upper car. */
function edouxPistons(): { tubes: Tube[]; heads: Block[] } {
  const P = EDOUX_GEAR.piston;
  const n = -EDOUX.carAxis;
  const top = EDOUX_FLOOR.a - P.below;
  const at = [n - EDOUX.guide, n + EDOUX.guide];
  return {
    tubes: at.map((s) => ({ s, t: 0, y0: top - P.length, y1: top })),
    heads: at.map((s) => shaftPost(s, top, top + P.head, 0.2, 0.2)),
  };
}

/** The six pulleys: name, centre, groove and flange diameters. */
const EDOUX_PULLEYS = (() => {
  const P = EDOUX_GEAR.pulley;
  const C = EDOUX_GEAR.cable;
  // Each cable's centre line wraps its pulley at the radius its two strands
  // stand apart, less the groove's depth: « 9.424 » and « 9.304 » less the
  // pairs' « 8.128 », so 0.648 on the upper and 0.588 on the lower.
  const wrap = [C.a - P.at, C.c - P.at];
  const out: Array<{ name: string; centre: Vec3; groove: number; flange: number; cable: number }> = [];
  for (const [where, s, ys] of [
    ["nord", -P.at, P.outer],
    ["middle", 0, P.middle],
    ["sud", P.at, P.outer],
  ] as const) {
    ys.forEach((y, i) =>
      out.push({
        name: `edoux.pulley.${where}.${i === 0 ? "upper" : "lower"}`,
        centre: inShaft(s, y),
        groove: P.groove[i] as number,
        flange: P.flange[i] as number,
        cable: wrap[i] as number,
      }),
    );
  }
  return out;
})();

/**
 * What of the Edoux moves with the upper car, for the page: the lower car
 * (slid down as far as the upper goes up — the counterweight, exact by
 * construction), the pistons (up with it), each pulley (turned by the
 * cables at a radian per metre over the radius the cable wraps it at; seen
 * from pile 4 the cables go Nord to Sud over the tops as the upper car
 * rises), and each cable drop (stretched about its pulley's axle).
 */
const EDOUX_FOLLOWERS: readonly Follower[] = [
  { name: "edoux.sud", lead: "edoux.nord", car: true, slide: [0, -1, 0] },
  { name: "edoux.pistons", lead: "edoux.nord", slide: [0, 1, 0] },
  ...EDOUX_PULLEYS.map(
    (p): Follower => ({
      name: p.name,
      lead: "edoux.nord",
      spin: { centre: p.centre, axis: mul3(T_HAT, -1), rate: 1 / p.cable },
    }),
  ),
  ...EDOUX_DROPS.map(
    (d): Follower => ({
      name: d.name,
      lead: "edoux.nord",
      stretch: { anchor: inShaft(d.s, d.top), along: [0, -1, 0], length: d.top - d.bottom, rate: d.rate },
    }),
  ),
];

// ---------------------------------------------------------------------------

/**
 * Where each car stands when the graph builds it: its lower floor's
 * height, per quadrant target [estimated moment]. Target 0 is pile 4
 * (Ouest, Roux), 1 pile 3 (Sud, Otis), 2 pile 2 (Est, Roux), 3 pile 1
 * (Nord, Otis). All four stand on the straight 54.6° run below node XXIV,
 * where the Otis car is tipped 11° back from level (see {@link carLevel})
 * and the Roux car is level.
 *
 * This is where the page leaves a car when nothing is driving it
 * ({@link LIFT_CARS}).
 */
const CAR_AT = [30, 42, 12, 22] as const;

/**
 * The stations, as the height of the car's LOWER floor. The rez-de-chaussée
 * is printed at the altitude 35.08, z 1.58 [sourced PL-XX, PL-XXI; §11.2];
 * the floors are `FLOORS`'. Which deck stands level with the station is not
 * printed: the book serves each deck at each station, the Otis « par une
 * petite passerelle », the Roux « par des escaliers terminés par des
 * paliers » [sourced E1900-TXT pp. 135, 160], so a station is two levels,
 * and the model takes the lower one at the floor [estimated].
 */
const STATION = { ground: 1.58, first: FLOORS.first, second: FLOORS.second } as const;

/**
 * Where each system stops, bottom to top [sourced PL-XX, PL-XXI]: the Roux
 * from the ground to the 1st floor; the Otis from the ground to the 2nd
 * « avec arrêt facultatif au 1er étage ». The page's round runs end to end
 * and does not take the optional stop; it is published so a host can.
 */
const STOPS = {
  roux: [STATION.ground, STATION.first],
  otis: [STATION.ground, STATION.first, STATION.second],
} as const;

/**
 * Which system and which pile, per quadrant target, read off `PILES`:
 * `roux.ouest`, `otis.sud`, `roux.est`, `otis.nord`. Names the output.
 */
const CAR_NAME = PILES.map((p) => `${p.lift}.${p.name.toLowerCase()}`);

/** A car's node id, from its name: `roux.ouest` -> `liftCarRouxOuest`. */
const carId = (name: string): string =>
  `liftCar${name
    .split(".")
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join("")}`;

/**
 * Where each leg car starts in its own cycle, 0..1. Nothing but taste:
 * four cars leaving the ground together would read as one mechanism.
 */
const CAR_PHASE = [0, 0.31, 0.62, 0.83] as const;

/**
 * A car's wait at each end of its run, in seconds; the trip itself is the
 * run's length at a metre a second (see {@link legRun}), and the Edoux'
 * 80.2 m stroke in 80 s is the same.
 *
 * A metre a second is a walking pace and it is meant to be: the tower is
 * 312 m tall, so a car at 1 m/s takes the better part of a minute to cross
 * a tenth of the frame. The book gives the Roux 60 s for its ascent
 * [sourced E1900-TXT p. 162], about 1.1 m/s over its 66.60, and the Otis a
 * design speed of 2.00 m/s it did not reach [sourced p. 142]; this is
 * chosen to read as a lift and not as a lift shown in fast-forward.
 */
const LEG_DWELL = 6;
const EDOUX_TRIP = { trip: 80, dwell: 10 } as const;

/**
 * The line a car's wheels ride, arc-length parameterised: its vertices in
 * world metres, bottom to top, and the arc length at each, 0 at the first.
 */
interface RunLine {
  readonly path: readonly Vec3[];
  readonly arc: readonly number[];
  /**
   * Axle to axle along the line. The car's two axles stand on the line
   * `wheelbase / 2` either side of the arc length it is at, and the body
   * lies along the chord between them — which is how a rigid car on two
   * axles rides a rail that bends, and why it tips smoothly through a
   * node rather than snapping there. 0: the car is a point on the line
   * (the Edoux, whose line is straight).
   */
  readonly wheelbase: number;
  /**
   * How the axles are spaced. Absent or false: an arc length `wheelbase`
   * apart, `wheelbase / 2` either side of the car's arc length. True: a
   * CHORD `wheelbase` apart, pushed out equally in arc either side of it —
   * which is what the rigid body's axles are, so where the line bends
   * between them both still stand ON it (across a bend the chord is
   * shorter than the arc, and axles an arc length apart would stand the
   * body's own a centimetre or two past their points, off the line). The
   * Roux, whose wheels ride the line, needs it; the two agree wherever
   * both axles are on one straight.
   */
  readonly chordSpan?: boolean;
}

/**
 * One lift car's run, for the host that moves it.
 *
 * The graph settles WHERE a car can be; the clock is the page's. A car is
 * a rigid body, built at the arc length `at`: to put it at `s`, read both
 * poses with {@link carPose} and turn the built mesh by the difference in
 * angle about `axis`, about the built pose's point, onto the new one. On a
 * leg the line is the rail line the tracks are built on, station for
 * station, so the car rides the rail exactly (the Roux's is its wheels'
 * centres' line, 0.45 over it, `chordSpan`); in the shaft it is vertical.
 */
export interface CarRun extends RunLine {
  /** The graph declares this car as the output `car.<name>`. */
  readonly name: string;
  /** The horizontal axis, across the line, that the car pitches about (unit, world). */
  readonly axis: Vec3;
  /**
   * The chord slope, in radians, on which the car's floors are level:
   * where the chord between its axles is steeper, the car tips forward by
   * the difference, and back where it is shallower.
   */
  readonly level: number;
  /** The arc length where the car is BUILT: the page's zero. */
  readonly at: number;
  /** Every station, as an arc length, in the order the car rises through them. */
  readonly stops: readonly number[];
  /** The ends of the run, as arc lengths: the round goes `from` -> `to` and back. */
  readonly from: number;
  readonly to: number;
  /** Seconds from end to end, and the wait at each end. */
  readonly trip: number;
  readonly dwell: number;
  /** Where in its own cycle the car stands at t = 0, 0..1. */
  readonly phase: number;
}

/**
 * A line's point at arc length `s`, written to `out[o..o+2]`, clamped at
 * the ends; returns the segment it fell on. A binary search over the
 * cumulative arc length, so it is cheap enough for every car every frame.
 */
function pathPoint(line: RunLine, s: number, out: Float64Array, o: number): number {
  const { path, arc } = line;
  let lo = 0;
  let hi = arc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((arc[mid] as number) <= s) lo = mid;
    else hi = mid;
  }
  const a0 = arc[lo] as number;
  const a1 = arc[hi] as number;
  const u = Math.min(1, Math.max(0, (s - a0) / (a1 - a0)));
  const p = path[lo] as Vec3;
  const q = path[hi] as Vec3;
  out[o] = p[0] + (q[0] - p[0]) * u;
  out[o + 1] = p[1] + (q[1] - p[1]) * u;
  out[o + 2] = p[2] + (q[2] - p[2]) * u;
  return lo;
}

/** The two axles' points, `carPose`'s scratch: it allocates nothing. */
const AXLES = new Float64Array(6);

/**
 * Stands the two axles of a car at arc length `s` on `line` in `AXLES` and
 * returns how far past `s ± wheelbase / 2` each stands, in arc: 0 unless
 * the line spaces them by the chord (`chordSpan`), when it is found by
 * fixed-point steps, each closing half the chord's shortfall on the
 * wheelbase (the chord grows at nearly twice the step, the bends being a
 * few degrees; eight steps are far more than a 1e-12 fit takes). On a
 * straight the shortfall is rounding and the answer is 0, as it was.
 */
function standAxles(line: RunLine, s: number): number {
  const h = line.wheelbase / 2;
  let e = 0;
  for (let i = 0; ; i++) {
    pathPoint(line, s - h - e, AXLES, 0);
    pathPoint(line, s + h + e, AXLES, 3);
    if (line.chordSpan !== true || i === 8) return e;
    const dx = (AXLES[3] as number) - (AXLES[0] as number);
    const dy = (AXLES[4] as number) - (AXLES[1] as number);
    const dz = (AXLES[5] as number) - (AXLES[2] as number);
    const short = 2 * h - Math.hypot(dx, dy, dz);
    if (short < 1e-12) return e;
    e += short / 2;
  }
}

/**
 * Where a car on `line` stands at arc length `s`: `out` gets the point
 * midway between its axles (x, y, z, world) and the chord's slope above
 * the horizontal, in radians. Writes into `out` and allocates nothing.
 */
export function carPose(line: RunLine, s: number, out: Float64Array): void {
  if (line.wheelbase > 0) {
    standAxles(line, s);
    out[0] = ((AXLES[0] as number) + (AXLES[3] as number)) / 2;
    out[1] = ((AXLES[1] as number) + (AXLES[4] as number)) / 2;
    out[2] = ((AXLES[2] as number) + (AXLES[5] as number)) / 2;
  } else {
    const i = pathPoint(line, s, out, 0);
    const p = line.path[i] as Vec3;
    const q = line.path[i + 1] as Vec3;
    AXLES[0] = p[0];
    AXLES[1] = p[1];
    AXLES[2] = p[2];
    AXLES[3] = q[0];
    AXLES[4] = q[1];
    AXLES[5] = q[2];
  }
  const dx = (AXLES[3] as number) - (AXLES[0] as number);
  const dy = (AXLES[4] as number) - (AXLES[1] as number);
  const dz = (AXLES[5] as number) - (AXLES[2] as number);
  out[3] = Math.atan2(dy, Math.hypot(dx, dz));
}

/** `p` turned about the unit axis `a` by `angle`, right-handed (Rodrigues). */
function rotate3(p: Vec3, a: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = dot3(a, p) * (1 - c);
  const x = cross3(a, p);
  return [p[0] * c + x[0] * s + a[0] * k, p[1] * c + x[1] * s + a[1] * k, p[2] * c + x[2] * s + a[2] * k];
}

/** A line through `points`, arc-length parameterised. */
function lineThrough(points: readonly Vec3[], wheelbase: number, chordSpan = false): RunLine {
  const arc = [0];
  for (let i = 1; i < points.length; i++) {
    const d = sub3(points[i] as Vec3, points[i - 1] as Vec3);
    arc.push((arc[i - 1] as number) + Math.hypot(d[0], d[1], d[2]));
  }
  return chordSpan ? { path: points, arc, wheelbase, chordSpan } : { path: points, arc, wheelbase };
}

/**
 * The part of `line` between arc lengths `s0` and `s1`, re-based so that
 * `s0` is 0: the cut ends become vertices, and every station between them
 * is kept as it was.
 */
function cutLine(line: RunLine, s0: number, s1: number): RunLine {
  const at = (s: number): Vec3 => {
    const o = new Float64Array(3);
    pathPoint(line, s, o, 0);
    return [o[0] as number, o[1] as number, o[2] as number];
  };
  const inner = line.path.filter((_, i) => (line.arc[i] as number) > s0 && (line.arc[i] as number) < s1);
  return lineThrough([at(s0), ...inner, at(s1)], line.wheelbase, line.chordSpan === true);
}

/**
 * A leg car and its run: the body turned onto quadrant target k's rail
 * line, the stations found on it, the line cut to what the wheels use.
 *
 * The rail line is `railLine`, the one `track` builds the girders on,
 * carried onto the leg as `copyToQuadrants` carries the track: the same
 * stations, so the car's axles are ON the built rail at every moment (a
 * car on running wheels, the Roux, rides that line offset to its wheels'
 * centres, `CarBody.ride`, so its wheels are on the rail heads). A
 * station is where the lower floor's centre stands at the station's
 * height, found by bisection along the line (the floor rises with the arc
 * length, the tipping included, on every run here). The run begins half a
 * wheelbase below the lowest station and ends half a wheelbase above the
 * highest (a little more where a chord-spaced car spans a bend there, see
 * `RunLine.chordSpan`), so both axles are on it throughout; that both ends
 * are still on the built rail is checked here, not assumed.
 */
function legRun(k: number): {
  run: CarRun;
  blocks: Block[];
  glass: Block[];
  wheels: Wheel[];
  rail: RunLine;
  railStart: number;
  body: CarBody;
} {
  const system = PILES[k]?.lift === "roux" ? "roux" : "otis";
  const spec = system === "roux" ? ROUX_CAR : OTIS_CAR;
  const body = carBody(spec);
  const axis = onLeg(k, E);
  // A car on running wheels rides their centres' line, the rail line offset
  // `ride` up its normal with mitred joins (see `CarBody`).
  const rides = body.ride > 0 ? offsetLine(railLine(spec.top), () => body.ride) : railLine(spec.top);
  const rail = lineThrough(
    rides.map(([r, y]) => onLeg(k, onDiag(r, y))),
    body.wheelbase,
    body.ride > 0,
  );
  const floor = onLeg(k, body.floor);
  const pose = new Float64Array(4);
  const floorY = (s: number): number => {
    carPose(rail, s, pose);
    return (pose[1] as number) + rotate3(floor, axis, (pose[3] as number) - body.level)[1];
  };
  const h = body.wheelbase / 2;
  const end = (rail.arc[rail.arc.length - 1] as number) - h;
  const solve = (y: number): number => {
    let lo = h;
    let hi = end;
    if (floorY(lo) > y || floorY(hi) < y) {
      throw new Error(
        `lifts.ts: ${CAR_NAME[k]}'s lower floor cannot reach ${y} on its rail: with both axles on the track it ` +
          `spans ${floorY(lo).toFixed(2)} to ${floorY(hi).toFixed(2)}. Lengthen the track or move the station.`,
      );
    }
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2;
      if (floorY(mid) < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const stops = STOPS[system].map(solve);
  const first = stops[0] as number;
  const last = stops[stops.length - 1] as number;
  // Cut where the axles stand at the end stations: half a wheelbase out,
  // and with the chord span (the wheels' line) a little further where the
  // car spans a bend there.
  const s0 = first - h - standAxles(rail, first);
  const s1 = last + h + standAxles(rail, last);
  if (s0 < 0 || s1 > (rail.arc[rail.arc.length - 1] as number)) {
    throw new Error(
      `lifts.ts: ${CAR_NAME[k]}'s axles leave its rail at a station (they need arc ${s0.toFixed(3)} to ` +
        `${s1.toFixed(3)} of 0 to ${(rail.arc[rail.arc.length - 1] as number).toFixed(3)}). Lengthen the track or move the station.`,
    );
  }
  const line = cutLine(rail, s0, s1);
  const run: CarRun = {
    name: CAR_NAME[k] as string,
    ...line,
    axis,
    level: body.level,
    at: solve(CAR_AT[k] as number) - s0,
    stops: stops.map((s) => s - s0),
    from: first - s0,
    to: last - s0,
    trip: Math.round(last - first),
    dwell: LEG_DWELL,
    phase: CAR_PHASE[k] as number,
  };
  carPose(run, run.at, pose);
  const mid: Vec3 = [pose[0] as number, pose[1] as number, pose[2] as number];
  const tip = (pose[3] as number) - body.level;
  const turn = (v: Vec3): Vec3 => rotate3(onLeg(k, v), axis, tip);
  const place = (b: Block): Block => ({ at: add3(mid, turn(b.at)), x: turn(b.x), y: turn(b.y), size: b.size });
  const wheels = body.wheels.map((w) => ({ ...w, centre: add3(mid, turn(w.centre)), axis: turn(w.axis), ref: turn(w.ref) }));
  return { run, blocks: body.blocks.map(place), glass: body.glass.map(place), wheels, rail, railStart: s0, body };
}

/** The four leg cars, per quadrant target: each run and its body where the graph builds it. */
const LEG_CARS = CAR_NAME.map((_, k) => legRun(k));

/**
 * An Edoux car's run: vertical, on the car's axis `s` in the shaft frame,
 * its line from `lo` to `hi` as the floor height.
 */
function edouxRun(name: string, s: number, lo: number, hi: number, at: number, from: number, to: number): CarRun {
  const line = lineThrough([inShaft(s, lo), inShaft(s, hi)], 0);
  return { name, ...line, axis: T_HAT, level: Math.PI / 2, at, stops: [from, to], from, to, ...EDOUX_TRIP, phase: 0.2 };
}

/**
 * Every lift car in the tower and the run it rides — four in the legs and
 * the Edoux pair in the shaft.
 *
 * THE LEG CARS ride their whole runs, bottom station to top, on the rail
 * line as the track builds it: 54.6° to XXIV, then bending with the leg at
 * every node — 60.7° to the 1st floor, 70.4° in panel 6, 75.5-77.1° in
 * panels 7-10, 74.1° in panel 11 (SOURCES.md §11.3 sets these against the
 * book's). Each is one rigid body on two axles, tipping as the chord
 * between them turns:
 * - the OTIS car is level where that chord stands at 65.6° (see
 *   {@link carLevel}), which on this rail is just above the 1st floor
 *   (1.6° back at its station there, the book's « sensiblement
 *   horizontal »); it tips 11.0° back on the 54.6° run and
 *   up to 11.5° forward in panel 10, the book's « 0,20 m par mètre » either
 *   way;
 * - the ROUX car is level on the 54.6° run, which carries all but the last
 *   14 m of its travel. Above XXIV the model's rail follows the leg's inner
 *   corner, which bends there — 60.7°, then 70.4° past the 1st floor — so
 *   at its top station the car's chord stands at 66.3° and it is tipped
 *   11.7° forward. The book reads its car level throughout; the rail is not
 *   straightened to agree, since a straight rail to the 1st floor would
 *   stand 1.05 nearer a than the 4.35 the inner faces' struts need (see
 *   `RAIL_OFFSET`). SOURCES.md §11.8 keeps it open.
 *
 * THE EDOUX two are ONE machine: counterweighted against each other, they
 * leave the landing together and reach their far ends together, where the
 * passengers changed cars (195.93). Only the upper car, the one the
 * pistons lift, has a run here — landing to the 3rd floor, 80.2 m, the
 * pistons' stroke; the lower one is its counterweight and moves with it,
 * a metre down for every metre up (`LIFT_FOLLOWERS`' `edoux.sud`), so the
 * two are in opposition by construction, not by a shared clock.
 */
export const LIFT_CARS: readonly CarRun[] = [
  ...LEG_CARS.map((c) => c.run),
  // The upper car: landing -> 3rd floor, built `travel` above the landing.
  edouxRun("edoux.nord", -EDOUX.carAxis, FLOORS.landing, FLOORS.third, EDOUX.travel, 0, FLOORS.third - FLOORS.landing),
];

// ---------------------------------------------------------------------------
// The machinery that moves with a car

/**
 * A body that moves with a car: a wheel the chain turns, the Otis carriage
 * and counterweight truck, the Edoux pistons. It comes out as its own
 * `car.<name>` output, like a car, and the page moves it from the pose the
 * graph built it at by the TRAVEL of what drives it: the lead car's arc
 * length along its run less the run's `at`, or, with `chain`, that chain's
 * shift along its loop (see {@link chainShift}). Exactly one of `slide`,
 * `spin` and `stretch` says how.
 */
export interface Follower {
  /** The graph declares it as the output `car.<name>`. */
  readonly name: string;
  /** The `LIFT_CARS` run whose travel drives it. */
  readonly lead: string;
  /** Driven by this `LIFT_CHAINS` chain's shift instead of the car's travel. */
  readonly chain?: string;
  /** A car that moves with another (the Edoux counterweight car): painted and shown as a car, not machinery. */
  readonly car?: boolean;
  /** Slid by this (world metres) per metre of travel. */
  readonly slide?: Vec3;
  /** Turned about the unit `axis` through `centre`, `rate` radians per metre of travel, right-handed. */
  readonly spin?: { readonly centre: Vec3; readonly axis: Vec3; readonly rate: number };
  /**
   * Stretched along the unit `along` about `anchor`, which stays put: built
   * `length` long from there, it grows by `rate` metres per metre of travel.
   */
  readonly stretch?: { readonly anchor: Vec3; readonly along: Vec3; readonly length: number; readonly rate: number };
}

/**
 * The asset ids a chain spawns against, one per kind of piece: the axle at
 * every joint with its two rollers, the bar between two joints, and the
 * lead-filled box a counterweight piston carries. The host builds each at
 * its true size from {@link CHAIN_PIECES}, its axle along local z; a bar is
 * one metre along local x, scaled to its length by its instance.
 */
export const CHAIN_ASSETS = { axle: "chainAxle", bar: "chainBar", weight: "chainWeight" } as const;

/**
 * A Roux circuit's pieces, as the book describes them [sourced E1900-TXT
 * p. 156]: « tiges en fer forgé de 45 mm de diamètre », 1.000 axle to
 * axle, on steel axles of 50 mm each carrying two rollers of 140 mm in
 * bronze bushes, running on pairs of rails 145 apart; the counterweight
 * pistons square rods of about 54 mm in cast-iron boxes 810 long packed
 * with lead, about 143 kg [sourced]. The box's section is not printed:
 * 143 kg of lead and cast iron is about 0.014 m³, 0.13 square over its
 * 810 [derived, estimated]. The rollers' width and the axle's length
 * [estimated: 40 mm, and the axle just past the rollers].
 */
export const CHAIN_PIECES = {
  pitch: 1.0,
  bar: 0.045,
  axle: { diameter: 0.05, length: 0.24 },
  roller: { diameter: 0.14, width: 0.04, apart: 0.186 },
  weight: { length: 0.81, side: 0.13 },
} as const;

/**
 * One articulated chain, for the host that drives it. Its pieces ride a
 * closed loop — up one duct, over the top pulley, down the other, round
 * the driving wheel — each a rigid bar whose two axles are ON the loop, a
 * piece's length apart as the crow flies: on a straight that is its length
 * of loop, and round a wheel a little more, the polygon a chain makes on a
 * sprocket. The joint under the cabin's piston is fixed to the car, so it
 * shifts along the loop as the car moves ({@link chainShift}), and
 * {@link placeChain} walks the pieces from it, down the lower strand and
 * round the loop, piece by piece; the two tensioners take up what is left
 * between the last ordinary piece and the cabin's, as their screws did.
 */
export interface ChainRun {
  /** The graph declares it as the instances output `chain.<name>`. */
  readonly name: string;
  /** The `LIFT_CARS` run of the car it is fixed to. */
  readonly lead: string;
  /** The loop, closed: its last vertex is its first. */
  readonly loop: RunLine;
  /**
   * Each joint's arc length along the loop as built: joint 0 is the one
   * under the cabin's piston, and piece i runs from joint i to joint i + 1
   * (the last closing on joint 0).
   */
  readonly joints: readonly number[];
  /** Each piece's length, axle to axle (the tensioners' as built). */
  readonly lengths: readonly number[];
  /** The two tensioners, by piece: they take up the slack, so their length is not fixed. */
  readonly slack: readonly [number, number];
  /** The pieces (joint i to joint i + 1) that carry a counterweight box, ascending. */
  readonly weights: readonly number[];
  /** The axles' axis (unit, world). */
  readonly across: Vec3;
  /**
   * Where the cabin's joint stands on the loop, by the car's arc length on
   * its run: (run arc, loop arc) pairs, read linearly between them.
   */
  readonly drive: ReadonlyArray<readonly [number, number]>;
  /** The car's `at`: the chain's shift is 0 there. */
  readonly at: number;
  /** The drive's loop arc at `at`, read once. */
  readonly base: number;
}

/** How far along its loop `chain` has moved when its car stands at `s` on its run. Allocates nothing. */
export function chainShift(chain: ChainRun, s: number): number {
  return driveAt(chain.drive, s) - chain.base;
}

/** A drive table read linearly at `s` (clamped), by bisection, without destructuring a row. */
function driveAt(table: ReadonlyArray<readonly [number, number]>, s: number): number {
  let lo = 0;
  let hi = table.length - 1;
  const first = table[lo] as readonly [number, number];
  const last = table[hi] as readonly [number, number];
  if (s <= first[0]) return first[1];
  if (s >= last[0]) return last[1];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((table[mid] as readonly [number, number])[0] <= s) lo = mid;
    else hi = mid;
  }
  const a = table[lo] as readonly [number, number];
  const b = table[hi] as readonly [number, number];
  return a[1] + ((b[1] - a[1]) * (s - a[0])) / (b[0] - a[0]);
}

/** Enough joints for any chain here: `placeChain`'s scratch, so it allocates nothing. */
const MAX_JOINTS = 256;
const JOINTS = new Float64Array(3 * MAX_JOINTS);

/** Anything indexable as x, y, z: a Vec3 or a scratch array. */
type Vec3Like = ArrayLike<number>;

/** Write a column-major 4x4 at `o`: columns x, y, z (unit or scaled) and the point p. */
function writeMatrix(
  out: Float32Array | Float64Array,
  o: number,
  x: Vec3Like,
  y: Vec3Like,
  z: Vec3Like,
  p: Vec3Like,
): void {
  out[o] = x[0] as number;
  out[o + 1] = x[1] as number;
  out[o + 2] = x[2] as number;
  out[o + 3] = 0;
  out[o + 4] = y[0] as number;
  out[o + 5] = y[1] as number;
  out[o + 6] = y[2] as number;
  out[o + 7] = 0;
  out[o + 8] = z[0] as number;
  out[o + 9] = z[1] as number;
  out[o + 10] = z[2] as number;
  out[o + 11] = 0;
  out[o + 12] = p[0] as number;
  out[o + 13] = p[1] as number;
  out[o + 14] = p[2] as number;
  out[o + 15] = 1;
}

/** Each joint's loop arc, as `walkChain` last placed it: scratch. */
const ARCS = new Float64Array(MAX_JOINTS);

/** `u` wrapped onto a loop of length L. */
const onLoop = (u: number, L: number): number => ((u % L) + L) % L;

/**
 * The loop arc, from joint arc `u0` (whose point is at `out[o0..]`),
 * `dir` (-1 down the loop, +1 up it), where the next axle stands `len`
 * away as the crow flies; its point written to `out[o..]`. A few
 * fixed-point steps: the chord grows almost one for one with the arc.
 */
function nextJoint(loop: RunLine, L: number, u0: number, out: Float64Array, o0: number, len: number, dir: number, o: number): number {
  let u = u0 + dir * len;
  for (let i = 0; i < 12; i++) {
    pathPoint(loop, onLoop(u, L), out, o);
    const d = Math.hypot(
      (out[o] as number) - (out[o0] as number),
      (out[o + 1] as number) - (out[o0 + 1] as number),
      (out[o + 2] as number) - (out[o0 + 2] as number),
    );
    if (Math.abs(len - d) < 1e-10) break;
    u += dir * (len - d);
  }
  return onLoop(u, L);
}

/**
 * Walk a chain from joint 0 at loop arc `u0`: down the loop piece by
 * piece to the first tensioner, and up from joint 0 by the cabin's
 * piston; the tensioners' middle joint halfway along the loop between.
 * Points to `points` (3 per joint), arcs to `arcs`. Allocates nothing.
 */
function walkChain(chain: Pick<ChainRun, "loop" | "lengths" | "slack">, u0: number, points: Float64Array, arcs: Float64Array): void {
  const { loop, lengths, slack } = chain;
  const L = loop.arc[loop.arc.length - 1] as number;
  const n = lengths.length;
  arcs[0] = onLoop(u0, L);
  pathPoint(loop, arcs[0] as number, points, 0);
  for (let j = 0; j < slack[0]; j++) {
    arcs[j + 1] = nextJoint(loop, L, arcs[j] as number, points, 3 * j, lengths[j] as number, -1, 3 * (j + 1));
  }
  // Up from joint 0 by the last piece, the cabin's, to joint n - 1.
  arcs[n - 1] = nextJoint(loop, L, arcs[0] as number, points, 0, lengths[n - 1] as number, 1, 3 * (n - 1));
  // The tensioners share what is left, the joint between them halfway.
  const a = arcs[slack[0]] as number;
  const b = arcs[n - 1] as number;
  const gap = onLoop(a - b, L);
  arcs[slack[1]] = onLoop(b + gap / 2, L);
  pathPoint(loop, arcs[slack[1]] as number, points, 3 * slack[1]);
}

/** Scratch vectors for `placeChain`. */
const CX = new Float64Array(3);
const CY = new Float64Array(3);
const CP = new Float64Array(3);

/** out = a × b, into a scratch array. */
function crossInto(a: Vec3Like, b: Vec3Like, out: Float64Array): void {
  const a0 = a[0] as number;
  const a1 = a[1] as number;
  const a2 = a[2] as number;
  const b0 = b[0] as number;
  const b1 = b[1] as number;
  const b2 = b[2] as number;
  out[0] = a1 * b2 - a2 * b1;
  out[1] = a2 * b0 - a0 * b2;
  out[2] = a0 * b1 - a1 * b0;
}

/**
 * Place every piece of `chain` shifted `shift` along its loop, as instance
 * matrices (16 floats each, column-major): `axles` one per joint, `bars`
 * one per piece (joint i to i + 1, the last closing on the first), and
 * `weights` one per counterweight piece, in `chain.weights`' order.
 *
 * A piece is rigid, its two axles on the loop: it lies along the chord
 * between them, so on a wheel it cuts the corner the way a link does on a
 * sprocket. The bar's x column is that chord at its full length (the bar
 * asset is a metre long); every other column is unit. Allocates nothing.
 */
export function placeChain(
  chain: ChainRun,
  shift: number,
  axles: Float32Array | Float64Array,
  bars: Float32Array | Float64Array,
  weights: Float32Array | Float64Array,
): void {
  const { loop, joints, across } = chain;
  const n = joints.length;
  walkChain(chain, (joints[0] as number) + shift, JOINTS, ARCS);
  // The axles keep one frame: z along the axle, x the loop's first chord.
  const p0 = loop.path[0] as Vec3;
  const p1 = loop.path[1] as Vec3;
  let dx = p1[0] - p0[0];
  let dy = p1[1] - p0[1];
  let dz = p1[2] - p0[2];
  let len = Math.hypot(dx, dy, dz);
  CX[0] = dx / len;
  CX[1] = dy / len;
  CX[2] = dz / len;
  crossInto(across, CX, CY);
  for (let j = 0; j < n; j++) {
    CP[0] = JOINTS[3 * j] as number;
    CP[1] = JOINTS[3 * j + 1] as number;
    CP[2] = JOINTS[3 * j + 2] as number;
    writeMatrix(axles, 16 * j, CX, CY, across, CP);
  }
  let w = 0;
  for (let j = 0; j < n; j++) {
    const a = 3 * j;
    const b = 3 * ((j + 1) % n);
    dx = (JOINTS[b] as number) - (JOINTS[a] as number);
    dy = (JOINTS[b + 1] as number) - (JOINTS[a + 1] as number);
    dz = (JOINTS[b + 2] as number) - (JOINTS[a + 2] as number);
    len = Math.hypot(dx, dy, dz);
    CP[0] = ((JOINTS[a] as number) + (JOINTS[b] as number)) / 2;
    CP[1] = ((JOINTS[a + 1] as number) + (JOINTS[b + 1] as number)) / 2;
    CP[2] = ((JOINTS[a + 2] as number) + (JOINTS[b + 2] as number)) / 2;
    CX[0] = dx / len;
    CX[1] = dy / len;
    CX[2] = dz / len;
    crossInto(across, CX, CY);
    if (j === chain.weights[w]) {
      writeMatrix(weights, 16 * w, CX, CY, across, CP);
      w++;
    }
    CX[0] = dx;
    CX[1] = dy;
    CX[2] = dz;
    writeMatrix(bars, 16 * j, CX, CY, across, CP);
  }
}

/**
 * A chain's pieces as one instances node, placed as built (shift 0) by
 * {@link placeChain} itself, so the graph and the page agree by
 * construction: axles, then bars, then weights, each against its asset.
 */
function chainSpawn(g: Graph, id: string, chain: ChainRun): NodeHandle {
  const n = chain.joints.length;
  const w = chain.weights.length;
  const axles = new Float64Array(16 * n);
  const bars = new Float64Array(16 * n);
  const weights = new Float64Array(16 * w);
  placeChain(chain, 0, axles, bars, weights);
  const rows: Array<{ m: Float64Array; o: number; asset: number }> = [];
  for (let j = 0; j < n; j++) rows.push({ m: axles, o: 16 * j, asset: 0 });
  for (let j = 0; j < n; j++) rows.push({ m: bars, o: 16 * j, asset: 1 });
  for (let j = 0; j < w; j++) rows.push({ m: weights, o: 16 * j, asset: 2 });
  const col = (i: number, r: { m: Float64Array; o: number }): Vec3 => [
    r.m[r.o + 4 * i] as number,
    r.m[r.o + 4 * i + 1] as number,
    r.m[r.o + 4 * i + 2] as number,
  ];
  const frames = rows.map((r) => {
    const x = col(0, r);
    const y = col(1, r);
    const z = col(2, r);
    const sx = Math.hypot(x[0], x[1], x[2]);
    return {
      at: col(3, r),
      rot: frameQuat(mul3(x, 1 / sx), y),
      scale: [sx, Math.hypot(y[0], y[1], y[2]), Math.hypot(z[0], z[1], z[2])] as Vec3,
      asset: r.asset,
    };
  });
  const slots = pointTable(g, `${id}Slots`, frames.map((r) => r.at), {
    rot: ["vec4", frames.map((r) => r.rot)],
    scale: ["vec3", frames.map((r) => r.scale)],
  });
  // A string column is setAttribute's table, picked by each point's index.
  const kind = g.add(
    setAttribute,
    {
      name: "asset",
      type: "string",
      tupleSize: 1,
      values: [CHAIN_ASSETS.axle, CHAIN_ASSETS.bar, CHAIN_ASSETS.weight],
      value: indexTable(frames.map((r) => r.asset)),
    },
    `${id}Kind`,
  );
  const spawn = g.add(spawnInstances, { assetId: CHAIN_ASSETS.bar, assetAttr: "asset" }, `${id}Spawn`);
  g.connect(slots, "out", kind, "in");
  g.connect(kind, "out", spawn, "in");
  return spawn;
}

/**
 * The rim chords of a wheel `diameter` over its rim: each rim block is a
 * chord standing tangent to the wheel's circle, so its outer corners stand
 * proud of it as a circumscribed polygon's do (`ground.ts`' flatsSides).
 * Never fewer than the {@link RIM_CHORDS_MIN} every rim had before, so a
 * small pulley is not cut coarser than it was.
 */
export function wheelRimChords(diameter: number, sag: number): number {
  return Math.max(RIM_CHORDS_MIN, flatsSides(diameter, sag));
}

/** A spoked wheel's make, as {@link wheelBlocks} takes it. */
interface WheelSpec {
  readonly diameter: number;
  readonly rim: number;
  readonly width: number;
  readonly spokes: number;
  readonly spoke: number;
  readonly hub: number;
  readonly teeth?: Vec3;
  readonly sag?: number;
}

/**
 * A spoked wheel's make as blocks, about the origin, its axle +z and its
 * first spoke +x (each wheel is this turned onto its own frame, `gear`):
 * a rim of chords, `spokes` spokes, a hub, and (with `teeth`, their size
 * along the rim, out, and across) a tooth at every spoke on the rim's
 * outer face. The rim's chords are smoothness, not structure: the fewest
 * whose outer corners stand within `sag` (default `SAG.near`) of the
 * wheel's circle ({@link wheelRimChords}); the spokes are the wheel's own
 * count. The hub is the last block: a wheel's mesh ends in it.
 */
function wheelBlocks(o: WheelSpec): Block[] {
  const Z: Vec3 = [0, 0, 1];
  const r = o.diameter / 2 - o.rim / 2;
  const dir = (a: number): Vec3 => [Math.cos(a), Math.sin(a), 0];
  const out: Block[] = [];
  const segments = wheelRimChords(o.diameter, o.sag ?? SAG.near);
  const chord = 2 * (r + o.rim / 2) * Math.sin(Math.PI / segments);
  for (let i = 0; i < segments; i++) {
    const d = dir(((i + 0.5) * 2 * Math.PI) / segments);
    out.push({ at: mul3(d, r), x: cross3(Z, d), y: d, size: [chord, o.rim, o.width] });
  }
  for (let i = 0; i < o.spokes; i++) {
    const d = dir((i * 2 * Math.PI) / o.spokes);
    const len = r - o.hub / 2;
    out.push({ at: mul3(d, o.hub / 2 + len / 2), x: d, y: Z, size: [len, o.spoke, o.spoke] });
    if (o.teeth !== undefined) {
      const [tl, th, tw] = o.teeth;
      out.push({ at: mul3(d, o.diameter / 2 + th / 2), x: cross3(Z, d), y: d, size: [tl, th, tw] });
    }
  }
  out.push({ at: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], size: [o.hub, o.hub, o.width * 2] });
  return out;
}

// ---------------------------------------------------------------------------
// The Roux chain

/** A point of the (r, y) plane along the leg's diagonal. */
type P2 = readonly [number, number];

/**
 * A polyline of the (r, y) plane, offset by `d(i)` at vertex i to the
 * side of the up-and-out normal, with mitred joins, so each offset
 * segment stays parallel to its own.
 */
function offsetLine(line: readonly P2[], d: (i: number) => number): P2[] {
  const n: P2[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [r0, y0] = line[i] as P2;
    const [r1, y1] = line[i + 1] as P2;
    const len = Math.hypot(r1 - r0, y1 - y0);
    n.push([(y1 - y0) / len, -(r1 - r0) / len]);
  }
  return line.map(([r, y], i) => {
    const a = n[Math.max(0, i - 1)] as P2;
    const b = n[Math.min(n.length - 1, i)] as P2;
    const k = d(i) / (1 + a[0] * b[0] + a[1] * b[1]);
    return [r + (a[0] + b[0]) * k, y + (a[1] + b[1]) * k] as P2;
  });
}

/**
 * The Roux, Combaluzier et Lepape circuit (piles 4 Ouest, 2 Est), from
 * PL-XXIII, PL-XXIII bis and E1900-TXT Fig. 144 (p. 164; readings in the
 * machinery notes). Distances square to the track are along its
 * up-and-out normal from the model's rail line, the girders' top.
 *
 * - TWO CIRCUITS a lift, « une de chaque côté », in the planes of their
 *   driving wheels, « D'axe en axe des roues 4.080 » [sourced PL-XXIII
 *   Fig. 4]: 2.040 either side of the track's centre line, 0.26 outboard
 *   of the model's girder webs.
 * - THE STRANDS lie one over the other square to the track, « juxtaposées »
 *   in one double duct over the car's course [sourced p. 156]: two channels
 *   « 195 » high with a 10 plate between, so 0.205 axle to axle [sourced
 *   Fig. 14]. « Le brin inférieur … est fixé à la cabine » [sourced p.
 *   155]: the lower strand, nearer the girder, carries the car. Measured on
 *   Fig. 14 at 596 px/m [measured, ±0.01]: the lower strand's axis 0.045
 *   over the rail's top and the rail's top 0.198 over the girder's (a 73
 *   rail on a longrine, p. 160), so the lower strand stands 0.243 over the
 *   model's rail line and the upper 0.205 over that, 0.448 [sourced
 *   spacing; measured 0.198]; the duct's outside from 0.13 to 0.63 over
 *   it, 0.29 across [measured].
 * - THE DRIVING WHEEL R, « de 3,864 m de diamètre … douze bras », a tooth
 *   at each arm [sourced p. 158]: 3.864 is 1.000 / sin 15°, the circle
 *   through the axles of twelve one-metre links [derived], « 12m00 par
 *   tour de roue » [sourced PL-XXIII Fig. 3]; its rim, « Diam. de la
 *   couronne 3.616 » [sourced PL-XXIII bis Fig. 35]. Its centre 3.41 under
 *   the Roux ground floor (36.880), altitude 33.47, z -0.03 [sourced Fig.
 *   144], and 1.87 ± 0.1 out of the rail's top [measured Fig. 3]: the
 *   lower strand runs straight down the track and wraps the wheel's
 *   underside, so the model sets the centre its pitch radius off the lower
 *   strand, 2.175 over the rail line [derived].
 * - THE RETURN PULLEY R', smooth, « Diamètre à l'axe de roulement des
 *   galets 3,646 » [sourced PL-XXIII bis Fig. 4]: its centre 11.70 over the
 *   1st floor (91.13), altitude 102.83, z 69.33 [sourced Fig. 144], just
 *   over « Niveau sup.r du Panneau 6 » [sourced PL-XXIII Fig. 2], and 2.0-
 *   2.4 out of the girders [measured]; the model's, its pitch radius off
 *   the lower strand, 2.066 [derived]. Its rim, the chain's rollers rolling
 *   on it, 3.646 less a roller: 3.506 (Fig. 144's « 3.527 ») [derived].
 * - THE WRAPS: the upper strand leaves R over its top « vers l'extérieur »
 *   and curves back into the duct; at R' the two strands' directions differ
 *   by « 38° environ » [sourced p. 164], a wrap of 218°. The model joins
 *   each wrap to the upper strand's duct by one circular arc tangent to
 *   both. At R Fig. 144's schematic tangents read about 235° [measured];
 *   the model takes 250°, the wrap that closes the loop on the book's
 *   pieces with the tensioners inside their range [derived: at 235° the
 *   loop is 180.34 and they would be 1.63, short of their 1.725], and its
 *   fillet comes out 4.2 in radius against R''s 14.4.
 * - THE CENTRES stand « 82m305 » apart [sourced Fig. 144]; on the model's
 *   rail line they come out 82.40, 0.10 over (held in
 *   `tests/eiffelLiftMachinery.test.ts`), the check that the rail line
 *   stands where the plates draw it.
 * - THE PIECES, down the lower strand from the joint under the cabin's
 *   piston [sourced p. 156, read on the page image: the OCR's « 2,t)0 »
 *   and « 180,00 » are 2,90 and 180,90]: a special piston (1.00), 81
 *   ordinary (1.00), 11 counterweight pistons (1.00; Fig. 144 draws « 10
 *   Contrepoids »), 81 ordinary, two tensioners « 1m725 à 2m225 », and the
 *   cabin's piston (2.90; « un spécial de 3 m », p. 163, and Fig. 144's
 *   « 3.00 »), « 180,90 m en moyenne ». The loop the model's wheels make
 *   sets the tensioners' length, and it has to fall in their range.
 */
const ROUX_CIRCUIT = {
  lateral: 2.04,
  lower: 0.243,
  upper: 0.448,
  duct: { from: 0.13, to: 0.63, across: 0.29, plate: 0.012, slot: 0.085, bracket: { every: 2.3, along: 0.1 } },
  wheel: { pitch: 3.864, rim: 3.616, y: -0.03, wrap: (250 * Math.PI) / 180, width: 0.24, spokes: 12 },
  pulley: { pitch: 3.646, rim: 3.506, y: 69.33, wrap: (218 * Math.PI) / 180, width: 0.24, spokes: 8 },
  shaft: { wheel: 0.26, pulley: 0.175 },
  pieces: { special: 1, ordinary: 81, weights: 11, tensioner: [1.725, 2.225] as const, cabin: 2.9, total: 180.9 },
} as const;

/** A 2D frame of the leg's diagonal plane: a point, the unit tangent up a segment and its up-and-out normal. */
interface Frame2 {
  readonly o: P2;
  readonly t: P2;
  readonly n: P2;
}

/** The point `along` the frame's tangent and `out` along its normal. */
const at2f = (f: Frame2, along: number, out: number): P2 => [
  f.o[0] + f.t[0] * along + f.n[0] * out,
  f.o[1] + f.t[1] * along + f.n[1] * out,
];

/** A segment's frame, from its lower station. */
function frame2(p: P2, q: P2): Frame2 {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const t: P2 = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
  return { o: p, t, n: [t[1], -t[0]] };
}

/** An arc about `c` in a frame's (t, n) axes, radius r, from angle a0 to a1, as points every ~0.1. */
function arc2(f: Frame2, c: P2, r: number, a0: number, a1: number): P2[] {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / 0.1));
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([c[0] + r * (Math.cos(a) * f.t[0] + Math.sin(a) * f.n[0]), c[1] + r * (Math.cos(a) * f.t[1] + Math.sin(a) * f.n[1])]);
  }
  return out;
}

/**
 * One Roux circuit in the +x+z leg's diagonal plane, as (r, y): the loop
 * up the lower strand from R's tangent point, round R', down the upper
 * strand and round R; the lower strand alone, for placing the car on it;
 * both wheels' centres and the frames they were set in; and where the
 * double duct runs.
 */
function rouxLoop2(): {
  loop: P2[];
  lower: P2[];
  upper: P2[];
  wheel: { c: P2; f: Frame2; wrap: readonly [number, number] };
  pulley: { c: P2; f: Frame2; wrap: readonly [number, number] };
} {
  const C = ROUX_CIRCUIT;
  const rail = railLine(ROUX.top) as P2[];
  // The last segment runs on past node XXII to the pulley, as the girders did.
  const last = frame2(rail[rail.length - 2] as P2, rail[rail.length - 1] as P2);
  const ext = [...rail.slice(0, -1), at2f(last, Math.hypot(...sub2(rail[rail.length - 1] as P2, last.o)) + 6, 0)];
  const first = frame2(ext[0] as P2, ext[1] as P2);
  const top = frame2(ext[ext.length - 2] as P2, ext[ext.length - 1] as P2);
  const rw = C.wheel.pitch / 2;
  const rp = C.pulley.pitch / 2;
  // Each centre on its segment: its pitch radius off the lower strand, at its height.
  const place = (f: Frame2, r: number, y: number): { c: P2; along: number } => {
    const out = C.lower + r;
    const along = (y - f.o[1] - f.n[1] * out) / f.t[1];
    return { c: at2f(f, along, out), along };
  };
  const R = place(first, rw, C.wheel.y);
  const P = place(top, rp, C.pulley.y);
  // The lower strand: the rail line offset, from R's tangent point to R''s.
  const lowerLine = offsetLine(ext, () => C.lower);
  const tR = at2f(first, R.along, C.lower);
  const tP = at2f(top, P.along, C.lower);
  const cut = (line: readonly P2[], a: P2, b: P2, from: Frame2, to: Frame2): P2[] => {
    const inner = line.filter((p, i) => {
      if (i === 0 || i === line.length - 1) return false;
      const u = (p[0] - a[0]) * from.t[0] + (p[1] - a[1]) * from.t[1];
      const v = (p[0] - b[0]) * to.t[0] + (p[1] - b[1]) * to.t[1];
      return u > 1e-9 && v < -1e-9;
    });
    return [a, ...inner, b];
  };
  const lower = cut(lowerLine, tR, tP, first, top);
  // The fillets into the upper strand's duct: circles tangent to the wheel
  // and to the duct's line, touching the wheel where the wrap ends.
  const fillet = (f: Frame2, c: P2, r: number, angle: number) => {
    // Centre on the normal at `upper + rho`, at `angle` from the wheel's
    // centre, `r + rho` away: solve for rho.
    const cOut = C.lower + r;
    const rho = (cOut + r * Math.sin(angle) - C.upper) / (1 - Math.sin(angle));
    const d = r + rho;
    const fc: P2 = [c[0] + d * (Math.cos(angle) * f.t[0] + Math.sin(angle) * f.n[0]), c[1] + d * (Math.cos(angle) * f.t[1] + Math.sin(angle) * f.n[1])];
    return { fc, rho };
  };
  // R': the lower strand arrives at -90° and the chain wraps up over the
  // top to -90° + 218°; R: the upper strand arrives at 35° (-90° - 235°,
  // mod 360°) and wraps round the bottom to -90°.
  const aP = -Math.PI / 2 + C.pulley.wrap;
  const aR = -Math.PI / 2 - C.wheel.wrap + 2 * Math.PI;
  const fP = fillet(top, P.c, rp, aP);
  const fR = fillet(first, R.c, rw, aR);
  const bottomOf = (f: Frame2, fc: P2, rho: number): P2 => [fc[0] - rho * f.n[0], fc[1] - rho * f.n[1]];
  const upperLine = offsetLine(ext, () => C.upper);
  const bP = bottomOf(top, fP.fc, fP.rho);
  const bR = bottomOf(first, fR.fc, fR.rho);
  const upper = cut(upperLine, bR, bP, first, top);
  const loop: P2[] = [
    ...lower,
    ...arc2(top, P.c, rp, -Math.PI / 2, aP).slice(1),
    ...arc2(top, fP.fc, fP.rho, aP - Math.PI, -Math.PI / 2).slice(1),
    ...[...upper].reverse().slice(1),
    ...arc2(first, fR.fc, fR.rho, -Math.PI / 2, aR - Math.PI).slice(1),
    ...arc2(first, R.c, rw, aR, (3 * Math.PI) / 2).slice(1),
  ];
  return {
    loop,
    lower,
    upper,
    wheel: { c: R.c, f: first, wrap: [aR, 1.5 * Math.PI] },
    pulley: { c: P.c, f: top, wrap: [-Math.PI / 2, aP] },
  };
}

const sub2 = (p: P2, q: P2): [number, number] => [p[0] - q[0], p[1] - q[1]];

/** The circuit in the leg's plane, once: both circuits of both lifts are it, placed. */
const ROUX_LOOP2 = rouxLoop2();

/** The nearest point's arc length on a 2D polyline. */
function projectArc(line: readonly P2[], arc: readonly number[], p: P2): number {
  let best = Infinity;
  let out = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i] as P2;
    const b = line[i + 1] as P2;
    const ab = sub2(b, a);
    const l2 = ab[0] * ab[0] + ab[1] * ab[1];
    const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2));
    const d = Math.hypot(a[0] + ab[0] * u - p[0], a[1] + ab[1] * u - p[1]);
    if (d < best) {
      best = d;
      out = (arc[i] as number) + u * Math.sqrt(l2);
    }
  }
  return out;
}

/** The leg frame's (r, y) of a world point on quadrant target k's diagonal plane. */
function toPlane(k: number, p: Vec3): P2 {
  // Undo onLeg: k quarter turns back.
  const q: Vec3 = k === 0 ? p : k === 1 ? [-p[2], p[1], p[0]] : k === 2 ? [-p[0], p[1], -p[2]] : [p[2], p[1], -p[0]];
  return [(q[0] + q[2]) / SQ2, q[1]];
}

/**
 * One Roux chain: its loop placed on leg k at `side` (+1 toward E), its
 * pieces laid down the lower strand from the cabin's joint, and the drive
 * that keeps the cabin's piston under the car.
 */
function rouxChain(k: number, side: number): ChainRun {
  const C = ROUX_CIRCUIT;
  const leg = LEG_CARS[k] as (typeof LEG_CARS)[number];
  const run = leg.run;
  const lift = (p: P2): Vec3 => onLeg(k, onDiag(p[0], p[1], side * C.lateral));
  const loop = lineThrough(ROUX_LOOP2.loop.map(lift), 0);
  const L = loop.arc[loop.arc.length - 1] as number;
  // The pieces, down the lower strand from the joint under the cabin's piston.
  const P = C.pieces;
  const fixed = P.special + P.ordinary * 2 + P.weights + P.cabin;
  // As built the tensioners take what the loop leaves; walked round the
  // wheels the pieces cut the corners, so they end a little shorter (and
  // `tests/eiffelLiftMachinery.test.ts` holds them in the book's range as
  // the chain runs).
  const tensioner = (L - fixed) / 2;
  const lengths = [
    P.special,
    ...Array<number>(P.ordinary).fill(1),
    ...Array<number>(P.weights).fill(1),
    ...Array<number>(P.ordinary).fill(1),
    tensioner,
    tensioner,
    P.cabin,
  ];
  // The drive: where the car's axle midpoint falls on the lower strand, as
  // loop arc, by the car's arc on its run. The lower strand is the loop's
  // start, so its arc IS loop arc.
  const lower2 = ROUX_LOOP2.lower;
  const arc2d = [0];
  for (let i = 1; i < lower2.length; i++) {
    arc2d.push((arc2d[i - 1] as number) + Math.hypot(...sub2(lower2[i] as P2, lower2[i - 1] as P2)));
  }
  const pose = new Float64Array(4);
  const end = run.arc[run.arc.length - 1] as number;
  const drive: Array<readonly [number, number]> = [];
  for (let i = 0; i <= 400; i++) {
    const s = (end * i) / 400;
    carPose(run, s, pose);
    drive.push([s, projectArc(lower2, arc2d, toPlane(k, [pose[0] as number, pose[1] as number, pose[2] as number]))]);
  }
  // The cabin's piston centred under the car, on the straight: the joint
  // under it a metre down, and the pieces walked on down from there.
  const slack: readonly [number, number] = [lengths.length - 3, lengths.length - 2];
  const arcs = new Float64Array(lengths.length);
  walkChain({ loop, lengths, slack }, readTable(drive, run.at) - P.cabin / 2, new Float64Array(3 * lengths.length), arcs);
  const first = P.special + P.ordinary;
  return {
    name: `${run.name}.${side > 0 ? "right" : "left"}`,
    lead: run.name,
    loop,
    joints: [...arcs],
    lengths,
    slack,
    weights: Array.from({ length: P.weights }, (_, i) => first + i),
    across: onLeg(k, E),
    drive,
    at: run.at,
    base: driveAt(drive, run.at),
  };
}

/** The Roux legs, quadrant targets 0 (pile 4 Ouest) and 2 (pile 2 Est). */
const ROUX_LEGS = PILES.filter((p) => p.lift === "roux").map((p) => p.quadrant);

/** Every Roux chain, with its leg and side: two per lift, one each side of the car. */
const ROUX_PARTS = ROUX_LEGS.flatMap((k) => [-1, 1].map((side) => ({ k, side, chain: rouxChain(k, side) })));

/** The wheels the chains turn, as built, each with how it moves. */
const ROUX_WHEELS = ROUX_PARTS.flatMap(({ k, side, chain }) => rouxWheels(chain, k, side));

/**
 * The wheels each chain turns: R at the foot, toothed, and R' at the top,
 * smooth; each turned by the chain's shift at a radian per pitch radius,
 * in the sense the chain runs round it. Also where the teeth go: between
 * the chain's axles, as the chain was built.
 */
function rouxWheels(chain: ChainRun, k: number, side: number): Array<{ name: string; wheel: Wheel; follower: Follower }> {
  const C = ROUX_CIRCUIT;
  const lift = (p: P2): Vec3 => onLeg(k, onDiag(p[0], p[1], side * C.lateral));
  const out: Array<{ name: string; wheel: Wheel; follower: Follower }> = [];
  for (const [which, w, spec] of [
    ["wheel", ROUX_LOOP2.wheel, C.wheel],
    ["pulley", ROUX_LOOP2.pulley, C.pulley],
  ] as const) {
    const centre = lift(w.c);
    const t3 = unit3(sub3(lift([w.c[0] + w.f.t[0], w.c[1] + w.f.t[1]]), centre));
    const n3 = unit3(sub3(lift([w.c[0] + w.f.n[0], w.c[1] + w.f.n[1]]), centre));
    // The loop runs round both with its angle rising from t toward n.
    const axis = cross3(t3, n3);
    const r = spec.pitch / 2;
    // A joint on the wrap, as built, sets the teeth's phase: one between
    // every two axles.
    let ref = t3;
    if (which === "wheel") {
      const probe = new Float64Array(3);
      for (const u of chain.joints) {
        pathPoint(chain.loop, u, probe, 0);
        const d = sub3([probe[0] as number, probe[1] as number, probe[2] as number], centre);
        if (Math.abs(Math.hypot(...d) - r) < 1e-3) {
          ref = rotate3(unit3(d), axis, Math.PI / C.wheel.spokes);
          break;
        }
      }
    }
    const make: WheelSpec = {
      diameter: spec.rim,
      rim: 0.1,
      width: spec.width,
      spokes: spec.spokes,
      spoke: 0.1,
      hub: which === "wheel" ? 0.6 : 0.4,
      // The driving wheel turns in its pit at the leg's foot, at a visitor's
      // eye; the return pulley is overhead at the 1st floor.
      sag: which === "wheel" ? SAG.eye : SAG.near,
      // The teeth « 445 » long on the rim [sourced PL-XXIII bis Fig. 36],
      // up to the bars' underside midway between two axles.
      ...(which === "wheel" ? { teeth: [0.445, 0.035, 0.12] as Vec3 } : {}),
    };
    out.push({
      name: `${chain.name}.${which}`,
      wheel: { centre, axis, ref, spec: make },
      // A pitch of chain turns it by the angle one piece subtends on it,
      // 2 asin(pitch / 2r): 30° on R, « 12m00 par tour de roue » [sourced
      // PL-XXIII Fig. 3], so the joints ride it without drifting.
      follower: {
        name: `${chain.name}.${which}`,
        lead: chain.lead,
        chain: chain.name,
        spin: { centre, axis, rate: (2 * Math.asin(CHAIN_PIECES.pitch / (2 * r))) / CHAIN_PIECES.pitch },
      },
    });
  }
  return out;
}

/**
 * The still parts of one circuit, in the +x+z leg (`buildLifts` copies
 * them onto the Roux legs): the double duct over the car's course,
 * a bracket every 2.30 [sourced p. ~118], the wheels' shafts and
 * bearings, and the pulley's frame. The duct is three U-irons: its outer
 * plates, its middle plate and its sides, the lower channel's inboard
 * side open on the 85 slot the cabin's piston runs in [sourced p. 156].
 * It stops where the strands part for the wheels, so the chain shows on
 * them: the book's duct wraps both wheels too (« gaine circulaire »),
 * left out here so the chain can be seen.
 */
function rouxDuct(side: number): Block[] {
  const C = ROUX_CIRCUIT;
  const D = C.duct;
  const out: Block[] = [];
  const upper = ROUX_LOOP2.upper;
  // The double duct: where the upper strand runs in it, over the lower.
  const lift = (p: P2, l: number): Vec3 => onDiag(p[0], p[1], side * C.lateral + l);
  const half = D.across / 2;
  // Inboard is toward the track's centre line.
  const inboard = -side;
  for (let i = 0; i + 1 < upper.length; i++) {
    const a = upper[i] as P2;
    const b = upper[i + 1] as P2;
    const f = frame2(a, b);
    const len = Math.hypot(...sub2(b, a));
    const along = mul3(sub3(lift(b, 0), lift(a, 0)), 1 / len);
    // The duct's section about the upper strand's line, which stands at
    // `upper` over the rail line: its plates at their heights over it.
    const at = (out2: number, l: number): Vec3 => {
      const m: P2 = [(a[0] + b[0]) / 2 + f.n[0] * (out2 - C.upper), (a[1] + b[1]) / 2 + f.n[1] * (out2 - C.upper)];
      return lift(m, l);
    };
    const n3 = unit3(sub3(at(1, 0), at(0, 0)));
    const plate = (out2: number) => ({ at: at(out2, 0), x: along, y: n3, size: [len, D.plate, D.across] as Vec3 });
    const mid = (C.lower + C.upper) / 2;
    out.push(plate(D.from), plate(mid), plate(D.to));
    // The sides: the outboard one whole, the inboard one less the slot
    // along the lower channel's middle.
    const sideAt = (l: number, lo: number, hi: number) => ({
      at: at((lo + hi) / 2, l),
      x: along,
      y: n3,
      size: [len, hi - lo, D.plate] as Vec3,
    });
    out.push(sideAt(-inboard * half, D.from, D.to));
    out.push(sideAt(inboard * half, mid, D.to));
    out.push(sideAt(inboard * half, C.lower + D.slot / 2, mid));
    out.push(sideAt(inboard * half, D.from, C.lower - D.slot / 2));
    // The brackets, one every 2.30 or less, each midway in its share of the
    // run, so none falls on a node where the girders overlap: a plate 0.10
    // along the track from the girder's top flange up to the duct's
    // underside, from 0.025 outboard of the rail (0.10 on the web) over the
    // flange's outer 0.04 and out under the duct's whole width [the form
    // estimated; « 2,30 » sourced, see above].
    const n = Math.max(1, Math.ceil(len / D.bracket.every));
    const lIn = side * (ROUX.gauge / 2 + 0.075) - side * C.lateral;
    const lOut = side * half;
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5) / n;
      const top = D.from - D.plate / 2;
      const p: P2 = [a[0] + (b[0] - a[0]) * u + f.n[0] * (top / 2 - C.upper), a[1] + (b[1] - a[1]) * u + f.n[1] * (top / 2 - C.upper)];
      out.push({ at: lift(p, (lIn + lOut) / 2), x: along, y: n3, size: [D.bracket.along, top, Math.abs(lOut - lIn)] });
    }
  }
  return out;
}

/**
 * Each lift's wheel and pulley shafts, one line across both circuits
 * [sourced p. 158: R keyed to a 260 shaft; R' on 175, pp. 163-170], and
 * their bearings: R's on pedestals from the pit's floor, 2.17 under its
 * centre [measured PL-XXIII Fig. 4]; R''s on « deux traverses horizontales
 * » carried by the lift girders [sourced p. ~118], here a traverse under
 * the bearings on two posts down to the girders' top [the form
 * estimated]. Blocks, and the shafts as tube axes, in the +x+z leg as
 * `rouxDuct` is.
 */
function rouxFrames(): { blocks: Block[]; shafts: Array<{ axis: readonly [Vec3, Vec3]; diameter: number }> } {
  const C = ROUX_CIRCUIT;
  const out: Block[] = [];
  const shafts: Array<{ axis: readonly [Vec3, Vec3]; diameter: number }> = [];
  const at = (p: P2, l: number): Vec3 => onDiag(p[0], p[1], l);
  // The bearings stand either side of each wheel's hub (0.48 wide), 0.45
  // off its plane; the shaft runs out past the outer ones [estimated].
  const reach = C.lateral + 0.65;
  const bearing = 0.3;
  const beds = [-C.lateral - 0.45, -C.lateral + 0.45, C.lateral - 0.45, C.lateral + 0.45];
  // R on four bearings; R' on the two inboard ones, its shaft running out
  // through the pulleys' hubs [estimated: anything carrying an outboard
  // bearing would cross the chain's wrap].
  for (const [w, d, on, out2] of [
    [ROUX_LOOP2.wheel, C.shaft.wheel, beds, reach],
    [ROUX_LOOP2.pulley, C.shaft.pulley, [beds[1] as number, beds[2] as number], C.lateral + 0.3],
  ] as const) {
    shafts.push({ axis: [at(w.c, -out2), at(w.c, out2)], diameter: d });
    for (const l of on) out.push({ at: at(w.c, l), x: U, y: UP, size: [bearing, bearing, bearing] });
  }
  // R's pedestals, from the pit's floor to the bearings.
  const R = ROUX_LOOP2.wheel.c;
  const pit = R[1] - 2.17;
  for (const l of beds) {
    const y1 = R[1] - bearing / 2;
    out.push({ at: at([R[0], (pit + y1) / 2], l), x: U, y: UP, size: [0.5, y1 - pit, bearing] });
  }
  // R''s two inboard bearings, each on a post down to the girders' top:
  // « deux traverses horizontales sur lesquelles reposent les paliers de la
  // poulie de renvoi » at 11.25 over the 1st floor [sourced p. ~118] are
  // not drawn, the posts carrying the bearings straight [estimated].
  const P = ROUX_LOOP2.pulley;
  const yT = P.c[1] - bearing / 2 + 0.15;
  // Where the rail line (the girders' top) passes under the pulley's centre.
  const rail = railLine(ROUX.top) as P2[];
  const a = rail[rail.length - 2] as P2;
  const b = rail[rail.length - 1] as P2;
  // The post's foot stands on the rail's top (0.15 over the girders'),
  // where it is highest under the post, at its up-track (inner) face.
  const post = 0.3;
  const rIn = P.c[0] - post / 2;
  const lean = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.abs(b[0] - a[0]);
  const foot = a[1] + ((b[1] - a[1]) * (rIn - a[0])) / (b[0] - a[0]) + 0.15 * lean;
  // Under the inboard bearings, on the flanges' inner wings.
  for (const l of [beds[1] as number, beds[2] as number]) {
    out.push({ at: at([P.c[0], (foot + yT - 0.15) / 2], l), x: U, y: UP, size: [post, yT - 0.15 - foot, post] });
  }
  return { blocks: out, shafts };
}

// ---------------------------------------------------------------------------
// The Otis machinery

/**
 * The Otis machinery (piles 3 Sud, 1 Nord), from PL-XX Fig. 4, PL-XXI,
 * PL-XXII, XXII bis, XXII quater and E1900-TXT pp. 127-143 (readings in
 * the machinery notes). "a + x" is x out along the diagonal from
 * arbalétrier a's axis at the same height; distances square to the track
 * are along its up-and-out normal from the model's rail line.
 *
 * THE MOTOR. « Le cylindre moteur … incliné » lies between two plate
 * girders « de 0,915 m de hauteur … écartées de 2,439 m … de 39,35 m de
 * longueur », at « 61°20′ » [sourced pp. 127-128], in the pile's diagonal
 * plane, « Voie de la Cabine … au-dessous de la voie du chariot mobile de
 * 9 m en moyenne » [sourced PL-XXII Fig. 30]: their foot a + 11.2 at z
 * -3.3 in the machine basement [measured PL-XX Fig. 4, 59.3 px/m, ±0.5].
 * The cylinder, Ø 1.065 outside, 12.674 long [sourced], over their line,
 * 0.35 above its axis, as PL-XX draws it [measured, ±0.1], from z -2.15
 * [measured: its base -2.4, its cap 9.2, over the printed length]. At the
 * girders' head « 5 poulies fixes … dans des plans obliques » and the
 * guide pulley « a » the garant leaves by [sourced p. 133; PL-XXII Fig. 31
 * says six], Ø 1.524, three at z 28.2 and two at 30.65, « 0.485 » apart
 * across, and « a » at 31.1 [measured PL-XX Fig. 4]. Every pulley's axis
 * stands 0.457 over the girders' axis, so its rim clears the cross ties
 * under them [derived]. The carriage, « Cha1 »: six travelling pulleys Ø 1.524
 * in two groups of three « 2.718 » apart, on a frame about 6.05 long on
 * four rollers Ø 0.505 [sourced p. 133, Fig. 32], drawn by the piston's two
 * rods, Ø 0.108 [sourced p. 129]. « La pression d'eau n'est jamais
 * introduite que par le haut du cylindre » [sourced p. 127]: the piston
 * drives the carriage DOWN the girders as the car rises, spreading the
 * « palan à 12 brins », a metre of carriage to twelve of car [sourced PL-XX:
 * 10.83 × 12]. With the car at the 2nd floor its lower group stands at z
 * 12.4 [measured PL-XX Fig. 4, where it is drawn], so at z 21.8 with the
 * car on the ground [derived: the model's course is 128.83 against the
 * book's 129.96, so the carriage runs 10.74 and the truck 42.94].
 *
 * THE COUNTERWEIGHT. « Vo2. Voie du contrepoids établie sur une poutre
 * spéciale sous la grande poutre de l'ascenseur » [sourced PL-XXI]: two
 * girders 0.300 deep, 1.000 apart, their top 1.30 + « 871 » = 2.171 under
 * the rail line [sourced PL-XXII quater Fig. 23], parallel to the 54.6° run,
 * from « les pierres de Château-Landon » at a's foot, z 2.9 [sourced text;
 * measured] to « la partie inférieure du Panneau 5 », node XXIV, z 50.4
 * [sourced Fig. 57]: about 58 m [measured], against the text's « 45 m »,
 * which the truck's own 11.245 and its 43.32 of travel could not fit in.
 * Rails 130 high on chairs, their head about 0.24 over the girders
 * [sourced « 130 », « 242 » read as rail and chair, estimated]. The truck,
 * « Cp1 », « 11m245 » long [sourced], its sides 1.140 apart [sourced], its
 * top 0.52 over the rail head [measured Figs 1-2, 1:20 at 579 px/m], on six
 * wheels « de 500 mm de diamètre moyen » [sourced], three axles: two 2.02
 * apart near the lower end, one 1.6 under the upper [measured; the plate's
 * break lines hide the rest], cast-iron blocks between the sides; on its
 * upper end, lying flat, the « grande poulie » « 1m830 » [sourced Fig. 2;
 * p. 141's reckoning takes 1.85]. « Le contrepoids se déplace du tiers de
 * la course de la cabine, soit 43m32 » [sourced PL-XXII quater Fig. 3]: down
 * as the car rises; with the car on the ground its upper end stands about
 * 54.9 up the track from the track's foot [measured]. Its fixed pulley
 * « Pou7 », Ø 1.161, lies near flat at the track's head, z 51.8 [sourced,
 * measured]; the return pulleys N°1, Ø 0.80, hung in panel 5 near flat at
 * about z 52.5, and N°2, Ø 1.15, 2.401 out from a at the 1st floor [sourced
 * Figs 35-36, 44-52; heights measured]. The cables, two of 29 mm [sourced
 * p. 134], run from the truck up to Pou7, down round the grande poulie and
 * up again to N°1: three strands (see `OTIS_REEVING`), each a metre longer
 * for every three the car rises [derived].
 */
const OTIS_GEAR = {
  motor: {
    foot: { a: 11.2, y: -3.3 },
    angle: (61 + 20 / 60) * (Math.PI / 180),
    length: 39.35,
    depth: 0.915,
    apart: 2.439,
    flange: 0.25,
    tie: 0.38,
    cylinder: { diameter: 1.065, length: 12.674, foot: -2.15, out: 0.35 },
    fixed: [28.2, 30.65],
    guide: 31.1,
    /** The pulleys' axes over the girders' axis: their rims clear the ties under the girders. */
    pulleyOut: 0.457,
    pulley: 1.524,
    across: 0.485,
    carriage: { length: 6.045, groups: 2.718, rollers: 0.505, rod: 0.108, lowerAtTop: 12.4 },
  },
  counter: {
    top: 2.171,
    depth: 0.3,
    apart: 1.0,
    flange: 0.2,
    rail: 0.24,
    foot: 2.9,
    head: 50.4,
    tronçon: 6.748,
    truck: { length: 11.245, sides: 1.14, high: 0.52, beam: 0.3, block: 0.32, wheel: 0.5, axles: [0.36, 2.38, 9.645], upperAtGround: 54.9, poulie: 0.24, poulieIn: 0.22 },
    poulie: 1.83,
    pou7: { diameter: 1.161, y: 51.8, off: 0.419 },
    n1: { diameter: 0.8, y: 52.5 },
    n2: { diameter: 1.15, a: 2.401 },
  },
  /** Every strand of the counterweight cables: 29 mm, two side by side [sourced]. */
  cable: 0.06,
} as const;

/**
 * The Otis legs' frames, in the +x+z leg's diagonal plane: the car
 * track's straight 54.6° run (the rail line's first segment), the motor
 * girders' line, and where on each the machinery stands.
 */
const OTIS_FRAMES = (() => {
  const rail = railLine(OTIS.top) as P2[];
  const run = frame2(rail[0] as P2, rail[1] as P2);
  const M = OTIS_GEAR.motor;
  const foot: P2 = [cornerA(M.foot.y) + M.foot.a, M.foot.y];
  // Up the girders: inward and up at 61°20′.
  const motor: Frame2 = { o: foot, t: [-Math.cos(M.angle), Math.sin(M.angle)], n: [Math.sin(M.angle), Math.cos(M.angle)] };
  // The counterweight track's girders' top line, 2.171 under the rail line.
  const counter: Frame2 = { o: at2f(run, 0, -OTIS_GEAR.counter.top), t: run.t, n: run.n };
  /** Along a frame's tangent to a height. */
  const toY = (f: Frame2, y: number, out = 0): number => (y - f.o[1] - f.n[1] * out) / f.t[1];
  return { run, motor, counter, toY };
})();

/**
 * The counterweight's reeving, flat in one plane square to the track's
 * normal, the grande poulie's [sourced: « 242 » over the girders' top to
 * the rail head, the poulie « 0.24 » over that, measured PL-XXII quater
 * Fig. 1]: its two strands leave it tangent at ±0.915; Pou7 takes the one
 * going up from the side the truck's equalizer's strand comes to, so its
 * centre stands 0.335 off the centre line [derived; PL-XXII quater Fig.
 * 23 prints « 419 »: the pulleys are tilted there, 13° about the track and
 * 6° in plan, measured, which the model's flat reeving leaves out]; N°1
 * takes the other up past the track's head. Each strand runs parallel to
 * the track, so the truck carries its foot exactly.
 */
const OTIS_REEVING = (() => {
  const C = OTIS_GEAR.counter;
  const out = C.rail + C.truck.poulie;
  const g = C.poulie / 2;
  const r7 = C.pou7.diameter / 2;
  const pou7 = -g + r7;
  return { out, strands: { a: g, b: -g, c: pou7 + r7 }, pou7, n1: g - C.n1.diameter / 2 };
})();

/** A 2D (r, y) point and lateral offset, lifted onto leg k. */
const onLegAt = (k: number, p: P2, l = 0): Vec3 => onLeg(k, onDiag(p[0], p[1], l));

/** A box along a 2D frame on leg k: centre at `along`, `out`, lateral `l`; size along, out, across. */
function frameBox(k: number, f: Frame2, along: number, out: number, l: number, size: Vec3): Block {
  const c = onLegAt(k, at2f(f, along, out), l);
  const x = unit3(sub3(onLegAt(k, at2f(f, along + 1, out), l), c));
  const y = unit3(sub3(onLegAt(k, at2f(f, along, out + 1), l), c));
  return { at: c, x, y, size };
}

/** The car run's arc at its ground station and its build `at`, for leg k. */
const otisRun = (k: number): CarRun => (LEG_CARS[k] as (typeof LEG_CARS)[number]).run;

/**
 * The Otis motor that stands still, in the +x+z leg (`buildLifts` copies
 * it onto the Otis legs): the girders and their ties, the cylinder (as a
 * tube axis), the six fixed pulleys.
 */
function otisMotor(): Gear & { blocks: Block[]; cylinder: readonly [Vec3, Vec3] } {
  const k = 0;
  const M = OTIS_GEAR.motor;
  const f = OTIS_FRAMES.motor;
  const out: Block[] = [];
  // The girders: their axis is the frame's line, lateral ±apart/2, the
  // depth about it.
  for (const side of [-1, 1]) {
    out.push(frameBox(k, f, M.length / 2, 0, (side * M.apart) / 2, [M.length, M.depth, M.flange]));
  }
  // Cross girders « de 0,380 » under the girders every 4 m or so [sourced
  // section; spacing estimated], clear of the cylinder.
  for (let along = 1; along < M.length; along += 4.2) {
    out.push(frameBox(k, f, along, -M.depth / 2 - M.tie / 2, 0, [0.2, M.tie, M.apart]));
  }
  // The cylinder rides over the girders' axis, as PL-XX draws it (0.3-0.4
  // over, measured), clear of the ties under them.
  const cOut = M.cylinder.out;
  const cFoot = OTIS_FRAMES.toY(f, M.cylinder.foot, cOut);
  const cylinder = [onLegAt(k, at2f(f, cFoot, cOut)), onLegAt(k, at2f(f, cFoot + M.cylinder.length, cOut))] as const;
  // What it lies in: a cradle across between the girders' webs 0.5 in
  // from each end, from the girders' bottom up to the cylinder's underside
  // and 0.01 into it, so the cylinder bears on the girders and not on
  // nothing (the ties are 0.28 under it) [estimated: PL-XX draws the
  // cylinder between the girders, not how it is seated].
  const cradleTop = cOut - M.cylinder.diameter / 2 + 0.01;
  for (const along of [cFoot + 0.5, cFoot + M.cylinder.length - 0.5]) {
    out.push(frameBox(k, f, along, (cradleTop - M.depth / 2) / 2, 0, [0.3, cradleTop + M.depth / 2, M.apart]));
  }
  const wheels: Wheel[] = [];
  // Three fixed pulleys in the lower group and two in the upper, and the
  // guide pulley « a » over them the garant leaves by: « 5 poulies fixes »
  // and the dead end [sourced p. 133; heights measured PL-XX Fig. 4].
  const [lowY, highY] = M.fixed;
  for (const [y, across] of [
    [lowY, [-M.across, 0, M.across]],
    [highY, [-M.across / 2, M.across / 2]],
    [M.guide, [0]],
  ] as const) {
    const along = OTIS_FRAMES.toY(f, y, M.pulleyOut);
    for (const l of across) {
      wheels.push({ centre: onLegAt(k, at2f(f, along, M.pulleyOut), l), axis: E, ref: UP, spec: pulley(M.pulley) });
    }
    // The shafts [estimated: « poulies fixes » the girders carry]. The
    // upper pair's axis and the guide's are 0.51 apart, inside their rims
    // (0.68), so neither shaft may cross the other's discs. The lower group
    // turns on one shaft through its three hubs, girder to girder; the
    // upper pair on two stubs, each from its hub's inner end out to its
    // girder; each in a bearing on the girder's top flange. The guide « a »
    // turns on a short shaft between two hanger plates in the gaps between
    // its hub and the pair's discs, down to the last cross girder under the
    // girders.
    const hub = pulley(M.pulley).width; // half the hub's length along the shaft
    const reach = (M.apart + M.flange) / 2;
    if (across.length === 1) {
      const plate = 0.05;
      const inner = hub + 0.005;
      const lastTie = 1 + 4.2 * Math.floor((M.length - 1) / 4.2);
      const a0 = Math.min(lastTie - 0.05, along - 0.06);
      const a1 = Math.max(lastTie + 0.05, along + 0.06);
      const top = M.pulleyOut + 0.08;
      out.push(frameBox(k, f, along, M.pulleyOut, 0, [0.12, 0.12, 2 * (inner + plate)]));
      for (const side of [-1, 1]) {
        out.push(frameBox(k, f, (a0 + a1) / 2, (top - M.depth / 2) / 2, side * (inner + plate / 2), [a1 - a0, top + M.depth / 2, plate]));
      }
      continue;
    }
    if (across.length === 3) {
      out.push(frameBox(k, f, along, M.pulleyOut, 0, [0.12, 0.12, 2 * reach]));
    } else {
      const from = M.across / 2 - hub;
      for (const side of [-1, 1]) out.push(frameBox(k, f, along, M.pulleyOut, (side * (from + reach)) / 2, [0.12, 0.12, reach - from]));
    }
    for (const side of [-1, 1]) out.push(frameBox(k, f, along, M.depth / 2 + 0.08, (side * M.apart) / 2, [0.3, 0.16, M.flange]));
  }
  return { blocks: out, cylinder, wheels };
}

/** A plain pulley of diameter d, as `wheelBlocks` takes it. */
const pulley = (d: number) => ({ diameter: d, rim: 0.08, width: 0.12, spokes: 6, spoke: 0.06, hub: 0.2 });

/**
 * The Otis carriage on leg k as built, the car at its `at`: frame, six
 * travelling pulleys, four rollers and the piston's rods; and how it moves.
 */
function otisCarriage(k: number): Gear & { follower: Follower } {
  const M = OTIS_GEAR.motor;
  const C = M.carriage;
  const f = OTIS_FRAMES.motor;
  const run = otisRun(k);
  const name = `${run.name}.carriage`;
  // The lower pulley group's place along the girders, with the car at the
  // 2nd floor, then back up by a twelfth of the car's way down from there.
  const lowTop = OTIS_FRAMES.toY(f, C.lowerAtTop, M.pulleyOut);
  const lower = lowTop + (run.to - run.at) / 12;
  const out: Block[] = [];
  const wheels: Wheel[] = [];
  const mid = lower + C.groups / 2;
  // The frame: two side plates the carriage's length, over the pulleys' hubs.
  for (const side of [-1, 1]) out.push(frameBox(k, f, mid, M.pulleyOut, side * (M.across + 0.2), [C.length, 0.5, 0.06]));
  for (const along of [lower, lower + C.groups]) {
    for (const l of [-M.across, 0, M.across]) {
      wheels.push({ centre: onLegAt(k, at2f(f, along, M.pulleyOut), l), axis: onLeg(k, E), ref: UP, spec: pulley(M.pulley) });
    }
    // The group's shaft, across through its hubs into both side plates
    // [estimated: the frame carries its pulleys].
    out.push(frameBox(k, f, along, M.pulleyOut, 0, [0.1, 0.1, 2 * (M.across + 0.23)]));
  }
  // The rollers, on the girders' top flanges; the rods, from the frame's
  // lower end down into the cylinder.
  for (const along of [mid - C.length / 2 + 0.3, mid + C.length / 2 - 0.3]) {
    for (const side of [-1, 1]) {
      out.push(frameBox(k, f, along, M.depth / 2 + C.rollers / 2, (side * M.apart) / 2, [C.rollers, C.rollers, 0.1]));
    }
    // An axle across, from roller to roller.
    out.push(frameBox(k, f, along, M.depth / 2 + C.rollers / 2, 0, [0.1, 0.1, M.apart]));
  }
  const rodTop = mid - C.length / 2;
  for (const side of [-1, 1]) out.push(frameBox(k, f, rodTop - 7, M.cylinder.out, side * 0.3, [14, C.rod, C.rod]));
  // The crosshead the rods' upper ends are keyed into, across the frame's
  // lower end from side plate to side plate [estimated: the rods « tirent »
  // the carriage, so they end in its frame, not beside it].
  out.push(frameBox(k, f, rodTop, (M.cylinder.out + M.pulleyOut) / 2, 0, [0.2, 0.25, 2 * (M.across + 0.23)]));
  const up = unit3(sub3(onLegAt(k, at2f(f, 1, 0)), onLegAt(k, at2f(f, 0, 0))));
  return { blocks: out, wheels, follower: { name, lead: run.name, slide: mul3(up, -1 / 12) } };
}

/**
 * The counterweight track, in the +x+z leg as `otisMotor` is: its two
 * girders from the foot to XXIV, their rails, a tie at every tronçon's
 * joint; and the fixed pulley Pou7 and the return pulleys N°1 and N°2.
 */
function otisCounterTrack(): Gear & { blocks: Block[] } {
  const k = 0;
  const C = OTIS_GEAR.counter;
  const f = OTIS_FRAMES.counter;
  const foot = OTIS_FRAMES.toY(f, C.foot);
  const head = OTIS_FRAMES.toY(f, C.head);
  const len = head - foot;
  // The girders run on down to the stones they start on: the upper
  // course's top, square to a's axis (which the track runs parallel to
  // below XXIV), `SUPPORT.stack` down that axis from the model's upright's
  // end at the supports' node. The plates' z 2.9 is the stones' place
  // before every support was set 1.10 down a's axis (ground.ts `SUPPORT`,
  // SOURCES.md §31.3), which left the girders' foot 0.61 up the track from
  // them [derived]. The rails and the truck keep the plates' foot.
  const support = NODES[0] as (typeof NODES)[number]; // "supports", y 2.50
  const stone = (cornerA(support.y) - f.o[0]) * f.t[0] + (support.y - f.o[1]) * f.t[1] - SUPPORT.stack;
  const out: Block[] = [];
  for (const side of [-1, 1]) {
    const l = (side * C.apart) / 2;
    out.push(frameBox(k, f, (stone + head) / 2, -C.depth / 2, l, [head - stone, C.depth, C.flange]));
    out.push(frameBox(k, f, (foot + head) / 2, C.rail / 2, l, [len, C.rail, 0.07]));
  }
  for (let along = foot; along <= head + 1e-6; along += C.tronçon) {
    out.push(frameBox(k, f, along, -C.depth / 2, 0, [0.15, 0.27, C.apart]));
  }
  const wheels: Wheel[] = [];
  // Pou7 at the track's head and N°1 past it, lying flat in the reeving's
  // plane (N°1 « à peu près à plat », z 52.5 [measured PL-XX]).
  const n3 = unit3(sub3(onLegAt(k, at2f(f, 0, 1)), onLegAt(k, at2f(f, 0, 0))));
  const t3 = unit3(sub3(onLegAt(k, at2f(f, 1, 0)), onLegAt(k, at2f(f, 0, 0))));
  const R = OTIS_REEVING;
  // Each hangs « sous la grande poutre » [sourced PL-XXI, of the track]: a
  // cross beam under the car track's two girders, flush with their bottom
  // flanges across their whole width, in the frame of the rail's segment
  // above XXIV where both pulleys stand, and a pin along the pulley's axis
  // from its hub up into the beam [estimated: the plates draw no mounting;
  // the leg's steel below them rakes under the pulleys, the car track's
  // girders are flat and 0.3-0.4 over them].
  const rail = railLine(OTIS.top) as P2[];
  const beamDepth = 0.2;
  for (const [y, l, d] of [
    [C.pou7.y, R.pou7, C.pou7.diameter],
    [C.n1.y, R.n1, C.n1.diameter],
  ] as const) {
    const along = OTIS_FRAMES.toY(f, y, R.out);
    const hub = at2f(f, along, R.out);
    wheels.push({ centre: onLegAt(k, hub, l), axis: n3, ref: t3, spec: { ...pulley(d), width: 0.08 } });
    const seg = rail.findIndex((_, i) => i + 1 < rail.length && (rail[i + 1] as P2)[1] > hub[1]);
    const g = frame2(rail[seg] as P2, rail[seg + 1] as P2);
    // The beam's mid-depth, under the girders' bottom, square to g.
    const mid = -GIRDER.depth - beamDepth / 2;
    // Up the pulley's axis (f's normal) from the hub to that plane.
    const rise = (mid - ((hub[0] - g.o[0]) * g.n[0] + (hub[1] - g.o[1]) * g.n[1])) / (f.n[0] * g.n[0] + f.n[1] * g.n[1]);
    const top = at2f(f, along, R.out + rise);
    const s = (top[0] - g.o[0]) * g.t[0] + (top[1] - g.o[1]) * g.t[1];
    out.push(frameBox(k, g, s, mid, 0, [0.15, beamDepth, OTIS.gauge + 2 * OTIS.flange.out]));
    out.push(frameBox(k, f, along, R.out + rise / 2, l, [0.12, rise, 0.12]));
  }
  // N°2 at the 1st floor, 2.401 out from a [sourced PL-XXII quater Fig.
  // 36], turning the cables up the leg in the diagonal plane [orientation
  // estimated], at the floor, z 57.8 [measured].
  const n2: P2 = [cornerA(FLOORS.first) + C.n2.a, 57.8];
  wheels.push({ centre: onLegAt(k, n2), axis: E, ref: UP, spec: pulley(C.n2.diameter) });
  // It hangs in the floor's slot for the cables (open 0.65 either side of
  // it, its edge 0.15-0.2 in from its axis [measured on the model]): its
  // shaft across to a bracket on the floor each side, 0.3 on the deck and
  // reaching out under the shaft [estimated].
  out.push({ at: onLegAt(k, n2), x: onLeg(k, E), y: UP, size: [1.9, 0.1, 0.1] });
  const high = n2[1] + 0.08 - FLOORS.first;
  for (const side of [-1, 1]) {
    out.push({ at: onLegAt(k, [n2[0] - 0.175, FLOORS.first + high / 2], side * 0.85), x: onLeg(k, U), y: UP, size: [0.55, high, 0.2] });
  }
  return { blocks: out, wheels };
}

/**
 * The truck on leg k as built, and its three cable strands up to the
 * track's head; how each moves.
 */
function otisTruck(k: number): { truck: Gear; strands: Array<{ name: string; blocks: Block[]; follower: Follower }>; follower: Follower } {
  const C = OTIS_GEAR.counter;
  const T = C.truck;
  const f = OTIS_FRAMES.counter;
  const run = otisRun(k);
  const foot = OTIS_FRAMES.toY(f, C.foot);
  const ground = run.stops[0] as number;
  // Its upper end, up the track from the foot: 54.9 with the car on the
  // ground, a third of the car's way lower for every metre it is up.
  const upper = foot + T.upperAtGround - (run.at - ground) / 3;
  const lower = upper - T.length;
  const mid = (upper + lower) / 2;
  const head = C.rail;
  const out: Block[] = [];
  // The sides, their top 0.52 over the rail head, straddling the rails.
  for (const side of [-1, 1]) {
    out.push(frameBox(k, f, mid, head + T.high - T.beam / 2, (side * T.sides) / 2, [T.length, T.beam, 0.12]));
  }
  // The cast-iron blocks between them.
  out.push(frameBox(k, f, mid, head + T.high - T.block / 2 - 0.02, 0, [T.length - 0.8, T.block, T.sides - 0.14]));
  // The transom across the sides' upper ends, over the grande poulie's
  // rim and hub, so the frame closes there [estimated: Figs 1-2's break
  // lines hide the end].
  out.push(frameBox(k, f, upper - 0.06, head + T.high - 0.1, 0, [0.12, 0.2, T.sides + 0.12]));
  // Six wheels on their three axles, riding the rail head.
  for (const a of T.axles) {
    const along = lower + a;
    for (const side of [-1, 1]) {
      out.push(frameBox(k, f, along, head + T.wheel / 2, (side * C.apart) / 2, [T.wheel, T.wheel, 0.1]));
    }
    out.push(frameBox(k, f, along, head + T.wheel / 2, 0, [0.09, 0.09, T.sides]));
  }
  // Its safety gear: masses on each rail 3.4-3.8 under the upper end [measured].
  for (const side of [-1, 1]) {
    out.push(frameBox(k, f, upper - 3.6, head + 0.1, (side * C.apart) / 2, [0.4, 0.2, 0.22]));
  }
  // The grande poulie, lying flat inside the frame on its upper end, its
  // centre « 0.22 » in from the end and its rim over it [measured Figs 1-2].
  const n3 = unit3(sub3(onLegAt(k, at2f(f, 0, 1)), onLegAt(k, at2f(f, 0, 0))));
  const t3 = unit3(sub3(onLegAt(k, at2f(f, 1, 0)), onLegAt(k, at2f(f, 0, 0))));
  const R = OTIS_REEVING;
  const gp = upper - T.poulieIn;
  const gpOut = R.out;
  const wheels: Wheel[] = [{ centre: onLegAt(k, at2f(f, gp, gpOut)), axis: n3, ref: t3, spec: { ...pulley(C.poulie), width: 0.08 } }];
  // The equalizer's rod T, out past the poulie's rim to its strand.
  const eq = gp + Math.sqrt((C.poulie / 2) ** 2 - R.strands.c ** 2) + 0.1;
  out.push(frameBox(k, f, (upper + eq) / 2, gpOut, R.strands.c, [eq - upper, 0.06, 0.06]));
  const follower: Follower = { name: `${run.name}.truck`, lead: run.name, slide: mul3(t3, -1 / 3) };
  // The strands, each up the track to the pulley it wraps: a from the
  // poulie's rim to N°1, b from its other rim to Pou7, c from the
  // equalizer to Pou7's other side.
  const strands: Array<{ name: string; blocks: Block[]; follower: Follower }> = [];
  for (const [which, l, from, y] of [
    ["a", R.strands.a, gp, C.n1.y],
    ["b", R.strands.b, gp, C.pou7.y],
    ["c", R.strands.c, eq, C.pou7.y],
  ] as const) {
    const top = OTIS_FRAMES.toY(f, y, gpOut);
    const a = onLegAt(k, at2f(f, from, gpOut), l);
    const b = onLegAt(k, at2f(f, top, gpOut), l);
    const name = `${run.name}.cable.${which}`;
    strands.push({
      name,
      blocks: [{ at: mul3(add3(a, b), 0.5), x: t3, y: n3, size: [top - from, OTIS_GEAR.cable, OTIS_GEAR.cable] }],
      follower: { name, lead: run.name, stretch: { anchor: b, along: mul3(t3, -1), length: top - from, rate: 1 / 3 } },
    });
  }
  return { truck: { blocks: out, wheels }, strands, follower };
}

/** The Otis legs, quadrant targets 1 (pile 3 Sud) and 3 (pile 1 Nord). */
const OTIS_LEGS = PILES.filter((p) => p.lift === "otis").map((p) => p.quadrant);

/** Everything Otis that moves, per leg: the carriage, the truck and its strands. */
const OTIS_MOVING = OTIS_LEGS.map((k) => ({ k, carriage: otisCarriage(k), truck: otisTruck(k) }));

/** What of the Otis moves with its car, for the page. */
const OTIS_FOLLOWERS: readonly Follower[] = OTIS_MOVING.flatMap(({ carriage, truck }) => [
  carriage.follower,
  truck.follower,
  ...truck.strands.map((s) => s.follower),
]);

/** Every Roux chain circuit: two per lift, one each side of the car. */
export const LIFT_CHAINS: readonly ChainRun[] = ROUX_PARTS.map((p) => p.chain);

/** Everything that moves with a car: see {@link Follower}. */
export const LIFT_FOLLOWERS: readonly Follower[] = [
  ...ROUX_WHEELS.map((w) => w.follower),
  ...OTIS_FOLLOWERS,
  ...EDOUX_FOLLOWERS,
];

/**
 * The Edoux's graph: the machinery that stands still, and every body that
 * moves (each its own mesh, `car.<name>`): the two cars, the pistons, the
 * six pulleys and the eight cable drops, as built.
 */
function edouxParts(g: Graph): { machinery: NodeHandle[]; cars: Array<{ name: string; mesh: NodeHandle }> } {
  const tube = (t: Tube): readonly [Vec3, Vec3] => [inShaft(t.s, t.y0, t.t), inShaft(t.s, t.y1, t.t)];
  const machinery = [
    blocks(g, "liftEdouxGear", [...edouxGear(), ...edouxCableTops()]),
    ...edouxTubes().map(({ id, diameter, tubes: list }) =>
      tubes(g, `liftEdoux${id}`, list.map(tube), diameter),
    ),
  ];
  const pistons = edouxPistons();
  const cars = [
    { name: "edoux.nord", mesh: blocks(g, carId("edoux.nord"), edouxCarA(EDOUX_FLOOR.a)) },
    { name: "edoux.sud", mesh: blocks(g, carId("edoux.sud"), edouxCarB(EDOUX_FLOOR.b)) },
    {
      name: "edoux.pistons",
      mesh: merge(g, carId("edoux.pistons"), [
        tubes(g, `${carId("edoux.pistons")}Tubes`, pistons.tubes.map(tube), EDOUX_GEAR.piston.diameter),
        blocks(g, `${carId("edoux.pistons")}Heads`, pistons.heads),
      ]),
    },
    ...EDOUX_PULLEYS.map((p) => ({
      name: p.name,
      mesh: gear(g, carId(p.name), {
        blocks: [],
        wheels: [
          {
            centre: p.centre,
            axis: T_HAT,
            ref: UP,
            spec: { diameter: p.flange, rim: 0.05, width: EDOUX_GEAR.pulley.width, spokes: 4, spoke: 0.16, hub: EDOUX_GEAR.pulley.hub },
          },
        ],
      }),
    })),
    ...EDOUX_DROPS.map((d) => ({
      name: d.name,
      mesh: blocks(g, carId(d.name), [cableRun(inShaft(d.s, d.top), inShaft(d.s, d.bottom))]),
    })),
  ];
  return { machinery, cars };
}

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
    copyToQuadrants(g, "liftOtisTracks", blocks(g, "liftOtisTrack", track(OTIS)), odd, ["normal"]),
    copyToQuadrants(g, "liftRouxTracks", blocks(g, "liftRouxTrack", track(ROUX)), even, ["normal"]),
  ]);
  const guides = blocks(g, "liftEdouxGuides", edouxGuides());
  const edoux = edouxParts(g);

  // Cars stand at a different moment in each leg, so they are laid out per
  // leg here rather than copied — and each is its own MESH, because the
  // page moves them one at a time along the runs LIFT_CARS publishes. One
  // merged node would be one rigid body and the six would have to travel
  // together, which is the one thing a lift never does.
  // A leg car's panes are their own mesh, `car.<name>.glass`, because the
  // page draws glass in its own see-through material (main.ts `GLASS`); it
  // rides its car's run as the car does.
  const cars = [
    ...CAR_NAME.flatMap((name, k) => [
      { name, mesh: gear(g, carId(name), LEG_CARS[k] as Gear) },
      { name: `${name}.glass`, mesh: blocks(g, carId(`${name}.glass`), (LEG_CARS[k] as (typeof LEG_CARS)[number]).glass) },
    ]),
    ...edoux.cars,
    ...ROUX_WHEELS.map((w) => ({ name: w.name, mesh: gear(g, carId(w.name), { blocks: [], wheels: [w.wheel] }) })),
    ...OTIS_MOVING.flatMap(({ carriage, truck }) => [
      { name: carriage.follower.name, mesh: gear(g, carId(carriage.follower.name), carriage) },
      { name: truck.follower.name, mesh: gear(g, carId(truck.follower.name), truck.truck) },
      ...truck.strands.map((x) => ({ name: x.name, mesh: blocks(g, carId(x.name), x.blocks) })),
    ]),
  ];
  // The machinery that stands still is built once, in the +x+z leg, and
  // copied onto its legs as the tracks are. The tubes are not: a tube is
  // swept where it stands (`tubes`), so its facets' roll is set by the
  // world's +x, which a copy would turn with it.
  const motor = otisMotor();
  const counter = otisCounterTrack();
  const otisStill = [
    copyToQuadrants(
      g,
      "liftOtisGear",
      gear(g, "liftOtisGearLeg", { blocks: [...motor.blocks, ...counter.blocks], wheels: [...motor.wheels, ...counter.wheels] }),
      odd,
      ["normal"],
    ),
    // The cylinders lie in the legs' feet, at a visitor's eye.
    tubes(g, "liftOtisCylinders", OTIS_LEGS.map((k) => onLegs(k, motor.cylinder)), OTIS_GEAR.motor.cylinder.diameter, SAG.eye),
  ];
  const roux = rouxFrames();
  const rouxStill = [
    copyToQuadrants(g, "liftRouxGear", blocks(g, "liftRouxGearLeg", [...rouxDuct(-1), ...rouxDuct(1), ...roux.blocks]), even, ["normal"]),
    ...[ROUX_CIRCUIT.shaft.wheel, ROUX_CIRCUIT.shaft.pulley].map((d, i) =>
      tubes(
        g,
        `liftRouxShafts${i}`,
        ROUX_LEGS.flatMap((k) => roux.shafts.filter((x) => x.diameter === d).map((x) => onLegs(k, x.axis))),
        d,
      ),
    ),
  ];

  // The stairs, run by run (`stairs.ts`): the leg runs built in pile 4's
  // leg and copied onto theirs, the others in place. Each run's treads are
  // their own node, so what the graph cooks can be counted.
  const legTargets = { ground: even, e1: quads } as const;
  const stairNodes: NodeHandle[] = [];
  const railNodes: NodeHandle[] = [];
  for (const r of stairRuns()) {
    const name = r.key[0]!.toUpperCase() + r.key.slice(1);
    const treads = blocks(g, `liftStair${name}Treads`, r.parts.treads);
    const frame = blocks(g, `liftStair${name}Frame`, [...r.parts.frame, ...r.parts.landings]);
    const rails = polylines(g, `liftRails${name}`, r.parts.rails);
    if (r.legs === "world") {
      stairNodes.push(treads, frame);
      railNodes.push(rails);
    } else {
      const to = legTargets[r.key as keyof typeof legTargets];
      stairNodes.push(
        copyToQuadrants(g, `liftStair${name}TreadsLegs`, treads, to, ["normal"]),
        copyToQuadrants(g, `liftStair${name}FrameLegs`, frame, to, ["normal"]),
      );
      railNodes.push(copyToQuadrants(g, `liftRails${name}Legs`, rails, to));
    }
  }
  const stairs = merge(g, "liftStairs", stairNodes);
  // Hand rails: paths copied before they are skinned.
  const rails = merge(g, "liftRails", railNodes);
  return {
    girders: [tracks, guides],
    platforms: [stairs, skin(g, "liftRailSkin", rails, 0.025)],
    machinery: [...rouxStill, ...otisStill, ...edoux.machinery],
    cars,
    chains: LIFT_CHAINS.map((c) => ({ name: c.name, spawn: chainSpawn(g, carId(`chain.${c.name}`), c) })),
  };
}

/**
 * The lifts' round parts whose segment counts are smoothness, for the
 * checks: each a wheel's rim (`wheelRimChords`) or a swept tube (`tubes`'
 * default), its diameter, the tolerance it is cut to and the count that
 * gives. Spokes and every other structural count are not here: they are
 * the machines' own.
 */
export const LIFT_ROUNDS: ReadonlyArray<{ what: string; kind: "rim" | "tube"; diameter: number; sag: number; count: number }> = [
  ...([
    ["Roux driving wheel", ROUX_CIRCUIT.wheel.rim, SAG.eye],
    ["Roux return pulley", ROUX_CIRCUIT.pulley.rim, SAG.near],
    ["Otis fixed and travelling pulleys", OTIS_GEAR.motor.pulley, SAG.near],
    ["Otis grande poulie", OTIS_GEAR.counter.poulie, SAG.near],
    ["Otis Pou7", OTIS_GEAR.counter.pou7.diameter, SAG.near],
    ["Otis N°1", OTIS_GEAR.counter.n1.diameter, SAG.near],
    ["Otis N°2", OTIS_GEAR.counter.n2.diameter, SAG.near],
    ...EDOUX_GEAR.pulley.flange.map((d, i) => [`Edoux pulley flange ${i}`, d, SAG.near] as const),
  ] as const).map(([what, diameter, sag]) => ({ what, kind: "rim" as const, diameter, sag, count: wheelRimChords(diameter, sag) })),
  ...([
    ["Edoux tanks", EDOUX_GEAR.tank.diameter, SAG.near],
    ["Edoux cylinders", EDOUX_GEAR.cylinder.diameter, SAG.near],
    ["Edoux glands", EDOUX_GEAR.cylinder.gland, SAG.near],
    ["Otis cylinders", OTIS_GEAR.motor.cylinder.diameter, SAG.eye],
  ] as const).map(([what, diameter, sag]) => ({ what, kind: "tube" as const, diameter, sag, count: tubeSides(diameter, sag) })),
];
