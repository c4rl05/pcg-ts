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
 * [estimated].
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
 *   partant du rez-de-chaussée ». PL-XXVIII Fig. 5 draws one panel of it,
 *   11.00 high, from the landing P4 at a node: two flights T3 of « 23
 *   marches » of 0.250 inward, « 5.750 » each, with the landing Pm 1.00
 *   between, the landing Pa 1.300, then T4, « 19 marches », back out to the
 *   next P4; risers « 0.15933 » [sourced]. Each panel's P4 stands 7.820 in
 *   from the one below, the leg's own lean, « pente de 1m407 pour 1m00 »,
 *   its outer end 2.05 in from c [sourced Fig. 1]. T3 and T4 run in two
 *   lanes side by side straddling the diagonal, over the car's path (Fig.
 *   1 bis); one flight starts it from the ground (see `groundToFirst`).
 * - 1st → 2nd floor: « Escalier tournant de 1m60 de diamètre … il y en a
 *   quatre semblables, un dans chaque pile ». One helix per panel near the
 *   outer corner c, one through panels 10 and 11 (PL-XX Figs 3–4), joined
 *   by straight flights of 11 risers of 0.207 and treads of 0.255; treads
 *   0.64 wide, risers 0.178 [sourced text]. Their plan position in the leg
 *   [estimated].
 * - 2nd → 3rd floor (service only): e2 « escalier tournant conduisant du 2e
 *   étage à l'étage intermédiaire », Ø 1.600, and e3 from the landing to
 *   the 3rd, Ø 1.680 [sourced PL-XX Fig. 2]. PL-XX's section projects both
 *   onto the car line; the plans place them beside it, on the Ouest side
 *   (PL-XIX Figs 7, 9, 14): e2 under the upper car's berth, stopping 3.83
 *   below the landing and coming up by two straight flights through an
 *   opening off the car's plan; e3 on the landing beside the lower car's
 *   well, shifted toward the axis at an « escalier de raccord » in panels
 *   26-27 where the shaft grows too narrow for it (see `shaftStairs`).
 *
 * Everything here is boxes except the helices' hand rails, which are paths
 * copied BEFORE they are skinned. The boxes carry their local face normals
 * as `normal`, which `rotateAttrs` turns at every copyToPoints on the way
 * (the block's own turn, then a quadrant's, where one follows). Tracks and
 * the Edoux guides go in "girders"; cars, the Edoux cars and the stairs in
 * "platforms".
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
import { FLOORS, NODES, PILES, profileAt } from "./spec.js";

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
 * 2nd floor, each ±0.5 or so; the « Vo » line below the 1st floor reads
 * 4.67-4.78 (PL-XX Fig. 4). Below the 1st floor the girders set the least
 * of it: one whose web is 1.9 off the diagonal and whose foot sits 1.30
 * down the track's normal reaches the inner faces' plane unless the rail
 * stands about 4.35 out from a [derived: 1.9 + 0.085 flange + 1.30 sin
 * 54.6°, plus the face's lean over the girder's 0.75 drop, plus 0.55 √2 so
 * the faces' 0.80 struts clear by 0.15: 4.35]. So the table takes the
 * larger of the two at every node.
 */
const RAIL_OFFSET: ReadonlyArray<readonly [number, number]> = [
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
 * slope, both decks dip alike.
 */
const ROUX_CAR: CarSpec = { deck: [3.9, 2.1, 3.27], gauge: ROUX.gauge, top: ROUX.top, step: 2.5 };

/**
 * How far a deck's floor dips at its inner end below the rail line, square
 * to the track, into the girders' trough: 1.1 [measured, PL-XXII ter Fig.
 * 1 made track-horizontal: both Otis decks' inner walls, parallel to the
 * track, 1.07-1.16 below the girders' top; the Roux taken the same
 * (estimated)]. It clears the ties and the lateral bracing at 1.13-1.15.
 */
const TROUGH = 1.1;

/**
 * A car as ONE RIGID BODY, in the +x+z leg's frame, built the way it was
 * drawn: on a straight rail at the slope its floors are level on (`level`,
 * see {@link carLevel}), the axle midpoint at the origin. Two level decks,
 * the upper one `step` higher and `setback` further in, on a chassis along
 * the rails, with a hanger under the lower deck's outer end.
 *
 * Nothing here reads the leg. Where the car stands and how far it tips are
 * the run's business ({@link carPose}): the graph turns this body onto its
 * pose once, and the page turns it on from there, frame by frame.
 */
interface CarBody {
  /** The boxes, about the axle midpoint on the rail. */
  readonly blocks: readonly Block[];
  /** The slope, in radians, on which the floors are level. */
  readonly level: number;
  /** Axle to axle along the rails: the chassis' length. */
  readonly wheelbase: number;
  /** The lower floor's centre, from the axle midpoint. */
  readonly floor: Vec3;
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
  const raw: Block[] = [
    levelBox(onDiag(r1, high / 2), len, high, wide),
    levelBox(onDiag(r2, spec.step + high / 2), len, high, wide),
  ];
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
  // Between the rails (0.10 wide on the webs), 0.05 clear of them.
  const chassis = member(pLow, pHigh, 0.3, n);
  raw.push({ ...chassis, size: [chassis.size[0], 0.3, spec.gauge - 0.2] });
  // The hanger: from the chassis up to the lower floor, at its outer end or
  // at the chassis' end, whichever is further in.
  const rHang = Math.min(r1 + len / 2 - 0.1, rOf(yLow));
  const yHang = yRail + (r1 - rHang) * slope;
  const hang = -yHang;
  if (hang > 0.3) raw.push(levelBox(onDiag(rHang, yHang + hang / 2), 0.2, hang, wide));
  // The axles stand under the chassis' ends, on the rail: their midpoint
  // is the body's origin.
  const yMid = (yLow + yHigh) / 2;
  const mid = onDiag(rOf(yMid), yMid);
  return {
    blocks: raw.map((b) => ({ ...b, at: sub3(b.at, mid) })),
    level,
    wheelbase: (yHigh - yLow) / Math.sin(level),
    floor: sub3(onDiag(r1, 0), mid),
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

/**
 * The unit box's outward face normals, point by point: meshPrimitive's box
 * lays its faces out as blocks of 4 points (one quad each at the default
 * subdivisions) in the order +x, -x, +y, -y, +z, -z (as `legs.ts` reads it).
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
 * Many boxes as one mesh: a unit box copied onto one target per block,
 * each carrying its size as `scale` and its turn as `rot` (copyToPoints
 * scales, then turns, then places). The unit box carries its local face
 * normals as `normal`; `rotateAttrs` turns them by that same `rot` (a box
 * scaled along its own axes keeps its face normals, so rotation alone is
 * exact). A caller that copies these boxes on again (`copyToQuadrants`)
 * names `normal` in its own `rotateAttrs` to carry the turn through.
 */
function blocks(g: Graph, id: string, list: readonly Block[]): NodeHandle {
  const bare = box(g, `${id}Bare`, [0, 0, 0], [1, 1, 1]);
  const unit = g.add(
    setAttribute,
    {
      name: "normal",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(BOX_NORMALS.map((n) => n[0])),
        indexTable(BOX_NORMALS.map((n) => n[1])),
        indexTable(BOX_NORMALS.map((n) => n[2])),
      ),
    },
    `${id}Unit`,
  );
  g.connect(bare, "out", unit, "in");
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
  const out = g.add(copyToPoints, { topology: "keep", rotateAttrs: ["normal"] }, id);
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
 * A straight flight from `p0` (the foot of its first riser, on its centre
 * line) to `p1` (its top): `steps` treads, each at its riser's top, the
 * last level with `p1`, and two stringers.
 */
function run(p0: Vec3, p1: Vec3, width: number, steps: number): Block[] {
  const h: Vec3 = [p1[0] - p0[0], 0, p1[2] - p0[2]];
  const x = unit3(h);
  const across = cross3(x, UP);
  const going = Math.hypot(h[0], h[2]) / steps;
  const out: Block[] = [];
  for (let i = 1; i <= steps; i++) {
    const c = add3(p0, mul3(h, (i - 0.5) / steps));
    const y = p0[1] + ((p1[1] - p0[1]) * i) / steps;
    out.push({ at: [c[0], y - TREAD / 2, c[2]], x, y: UP, size: [going + 0.03, TREAD, width] });
  }
  // A stringer is a flat bar 0.25 deep [estimated]: widen the square member.
  for (const side of [-1, 1]) {
    const off = add3(mul3(across, (side * width) / 2), [0, -0.1, 0]);
    const s = member(add3(p0, off), add3(p1, off), 0.06, UP);
    out.push({ ...s, size: [s.size[0], 0.25, 0.06] });
  }
  return out;
}

/** A straight flight from (r0, y0) to (r1, y1) along the diagonal, `l` across it. */
function flight(r0: number, y0: number, r1: number, y1: number, l: number, width: number, steps: number): Block[] {
  return run(onDiag(r0, y0, l), onDiag(r1, y1, l), width, steps);
}

/** A landing: its top at `at`, `along` on the horizontal `x`, `across` beside it. */
function pad(at: Vec3, x: Vec3, along: number, across: number): Block {
  return { at: [at[0], at[1] - LANDING / 2, at[2]], x, y: UP, size: [along, LANDING, across] };
}

/**
 * A spiral stair round a vertical axis: treads of `tread` width radially,
 * risers of about `riser`, from y0 to y1, turning `turns` times from the
 * angle `start` (0 = along `frameX`, a quarter turn = along `frameZ`), a
 * newel, and the outer hand rail's points.
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
  riser = 0.178,
): { blocks: Block[]; rail: Vec3[] } {
  const steps = Math.max(1, Math.round((y1 - y0) / riser));
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

/**
 * The turns of a helix of `steps` risers, about 15 to the turn, that starts
 * at the angle `start` and must end at the angle `end`.
 */
function turnsBetween(steps: number, start: number, end: number): number {
  const frac = ((((end - start) / (2 * Math.PI)) % 1) + 1) % 1;
  return Math.max(frac === 0 ? 1 : frac, Math.round(steps / 15 - frac) + frac);
}

/** e1's joining flights: 11 risers of 0.207, treads 0.255 [sourced E1900-TXT p. 81]. */
const E1_FLIGHT = { risers: 11, riser: 0.207, tread: 0.255 } as const;
/**
 * e1's last helix runs through panels 10 and 11 to about 112.3 (PL-XX Fig.
 * 3), and a straight flight takes it on inward to the 2nd floor, drawn
 * 3.2-3.4 high and about 5 long at 81.5 px/m [measured]: 19 of the
 * helices' 0.178 risers, 3.38, on the joining flights' 0.255 treads, 4.85.
 */
const E1_TOP_RISERS = 19;

/**
 * The 1st → 2nd floor stair in one leg (e1, the same in all four): a helix
 * of Ø 1.60 per panel 6-9 and one through panels 10-11 (PL-XX Fig. 3), set
 * in from the outer corner c by 2.4 along the diagonal where the leg is
 * narrowest, at the top of the helix's panel [estimated], each at least
 * 3.0 inside the one below it. Straight flights of 11 risers join them,
 * inward along the diagonal, with treads of 0.255 [sourced counts]: where
 * two axes are nearer than the flight's run plus a diameter, it leaves the
 * lower helix and meets the upper one off the diagonal, at the angle that
 * makes its run 2.805 [derived].
 */
function firstToSecond(): { blocks: Block[]; rails: Vec3[][] } {
  const ys = NODES.map((n) => n.y).filter((y) => y >= 57.4 && y <= 100.6 + 1e-6);
  const RISE = E1_FLIGHT.risers * E1_FLIGHT.riser;
  const RUN = E1_FLIGHT.risers * E1_FLIGHT.tread;
  const top = FLOORS.second - E1_TOP_RISERS * 0.178;
  const OUTER = 0.8;
  // Each helix's rise, and the height where the leg is narrowest for it.
  const spans: Array<readonly [number, number, number]> = [];
  for (let k = 0; k + 1 < ys.length; k++) {
    const y0 = k === 0 ? FLOORS.first : (ys[k] as number) + RISE / 2;
    spans.push([y0, (ys[k + 1] as number) - RISE / 2, ys[k + 1] as number]);
  }
  spans.push([(ys[ys.length - 1] as number) + RISE / 2, top, top]);
  const axes: number[] = [];
  for (let k = 0; k < spans.length; k++) {
    const want = cornerC((spans[k] as readonly [number, number, number])[2]) - 2.4;
    axes.push(k === 0 ? want : Math.min(want, (axes[k - 1] as number) - 3.0));
  }
  // The angle off the diagonal at which each joining flight leaves and
  // meets the helices: 0 when the axes are far enough apart.
  const beta = axes.slice(1).map((r, k) => {
    const gap = (axes[k] as number) - r;
    return Math.acos(Math.min(1, Math.max(0, (gap - RUN) / (2 * OUTER))));
  });
  const out: Block[] = [];
  const rails: Vec3[][] = [];
  const last = axes.length - 1;
  for (let k = 0; k <= last; k++) {
    const r = axes[k] as number;
    const [y0, y1] = spans[k] as readonly [number, number, number];
    const start = k === 0 ? 0 : (beta[k - 1] as number);
    const end = k === last ? Math.PI : Math.PI - (beta[k] as number);
    const steps = Math.max(1, Math.round((y1 - y0) / 0.178));
    const h = helix((y) => onDiag(r, y), U, E, y0, y1, 1.6, 0.64, turnsBetween(steps, start, end), start);
    out.push(...h.blocks);
    rails.push(h.rail);
    if (k < last) {
      const b = beta[k] as number;
      const rNext = axes[k + 1] as number;
      const l = OUTER * Math.sin(b);
      out.push(
        ...flight(r - OUTER * Math.cos(b), y1, rNext + OUTER * Math.cos(b), y1 + RISE, l, 0.64, E1_FLIGHT.risers),
      );
    }
  }
  // Off the last helix's inner side, straight on to the 2nd floor.
  const rTop = (axes[last] as number) - OUTER;
  out.push(...flight(rTop, top, rTop - E1_TOP_RISERS * E1_FLIGHT.tread, FLOORS.second, 0, 0.64, E1_TOP_RISERS));
  return { blocks: out, rails };
}

/**
 * The ground → 1st floor stair of piles 2 and 4, PL-XXVIII [sourced unless
 * noted]. Each 11.00 panel of the leg, node to node, holds one repeat of
 * Fig. 5: the landing P4 at the node, 1.300; T3, « 23 marches » of 0.250
 * inward, its run « 6.020 » with the nosing and its rise « 3.8366 »; the
 * landing Pm, 1.00; T3 again; the landing Pa, 1.300; then T4, « 19
 * marches », back out « 5.220 » and up « 3.3268 » to the next node's P4,
 * 7.820 further in (Fig. 1). Risers « 0.15933 »: 24, 24 and 21 of them
 * fill the panel [derived]. The running part is « comprise entre … (39.90)
 * et … (83.90) », nodes XXVIII to XXIV; above it a T3 to a Pm and one
 * flight on inward to the 1st floor (Fig. 2's 45-degree turns are not
 * built).
 *
 * WHERE IN THE LEG. Along the diagonal each P4's outer end stands « 2.05 »
 * in from c's axis (Fig. 1, Fig. 5 « 2.050 »; « 12.642 » closes on it).
 * Across it the lanes straddle the diagonal (Fig. 1 bis, the section RS at
 * 1:200, 77.9 px/m on its « 3.927 »): T3's axis 1.05 to one side, T4's
 * 0.92 to the other, 1.00 wide each, over the car's path [measured]. Which
 * side is which follows the section read as a plan from above with c to
 * the left, pile 2 Est: T3 toward pile 3 Sud, T4 toward pile 1 Nord
 * [estimated hand]; pile 4 takes the same, turned (the Nota: « la
 * disposition dans la pile 4 est la même, le départ au Rez-de-Ch.
 * excepté », sending pile 4's start to PL-XVIII Fig. 5, not read here: its
 * start is pile 2's [estimated]). The innermost landing Pa then
 * stands 3.8 above the rail line, square to it (3.71 under its plate), and
 * the car (see `ROUX_CAR`, `TROUGH`) reaches 3.30.
 *
 * THE START (Fig. 1): ONE straight flight from « Sol du Rez-de-Chaussée
 * (35.08) » up to the first P4, at « (39.90) », rise « 4.82 » [sourced],
 * coming up outward to it: 30 risers of 0.1607. The elevation along the
 * diagonal draws its run about 5.0-5.3 [measured, 78.6 px/m], where 29 or
 * 30 of the stair's 0.250 treads need 7.25-7.5: so in plan it runs at 45°
 * to the diagonal, parallel to a face, 7.5 long and 5.30 in the elevation
 * [derived]. It lands on P4's inner edge in T4's lane, from the T4 side
 * [estimated side]. The masonry pedestal of `platforms.ts` covers its
 * foot: the plate starts it at 1.58, under the pedestal's top.
 */
function groundToFirst(): Block[] {
  const S = {
    p4: 1.3,
    pm: 1.0,
    pa: 1.3,
    t3: { risers: 24, rise: 3.8366, run: 6.02 },
    t4: { risers: 21, rise: 3.3268, run: 5.22 },
    fromC: 2.05,
    laneT3: -1.05,
    laneT4: 0.92,
    width: 1.0,
    ground: 1.58,
    start: { risers: 30, going: 0.25 },
  } as const;
  const l0 = Math.min(S.laneT3, S.laneT4) - S.width / 2;
  const l1 = Math.max(S.laneT3, S.laneT4) + S.width / 2;
  const out: Block[] = [];
  // A landing from rOut inward by `along`, over both lanes or T3's alone.
  // Near c the leg's faces close in at 45°, and at a node their horizontal
  // struts with them: 0.80 square on the faces' planes, leaning with the
  // face, they reach 0.44 in from the plane at a landing's top. A landing
  // keeps 0.50 clear of those planes (in plan, square to them), so a P4
  // loses the two corners the faces take, 0.08 of T4's lane and 0.21 of
  // T3's at its outer end [derived]; the plate's P4 hangs from its own
  // « Poutre P4 » there.
  const FACE = 0.5 * SQ2;
  const box2 = (rIn: number, rOut: number, y: number, lo: number, hi: number) => {
    if (rOut - rIn > 1e-6 && hi - lo > 1e-6) {
      out.push(pad(onDiag((rIn + rOut) / 2, y, (lo + hi) / 2), U, rOut - rIn, hi - lo));
    }
  };
  const landing = (rOut: number, y: number, along: number, both: boolean) => {
    const lo = both ? l0 : S.laneT3 - S.width / 2;
    const hi = both ? l1 : S.laneT3 + S.width / 2;
    const c = cornerC(y);
    // The half-width the faces leave at a distance d in from c.
    const room = (r: number) => c - r - FACE;
    const rIn = rOut - along;
    const w = room(rOut);
    box2(rIn, rOut, y, Math.max(lo, -w), Math.min(hi, w));
    if (lo < -w) box2(rIn, Math.min(rOut, c - FACE + lo), y, lo, -w);
    if (hi > w) box2(rIn, Math.min(rOut, c - FACE - hi), y, w, hi);
  };
  const t3 = (rFrom: number, y: number) =>
    flight(rFrom, y, rFrom - S.t3.run, y + S.t3.rise, S.laneT3, S.width, S.t3.risers);
  const t4 = (rFrom: number, y: number) =>
    flight(rFrom, y, rFrom + S.t4.run, y + S.t4.rise, S.laneT4, S.width, S.t4.risers);
  const nodes = NODES.map((n) => n.y).filter((y) => y >= 6.4 - 1e-6 && y <= 50.4 + 1e-6);
  const first = nodes[0] as number;
  // The start: one flight at 45° in plan, up and out onto the first P4's
  // inner edge in T4's lane.
  const rLand = cornerC(first) - S.fromC - S.p4;
  const reach = (S.start.risers * S.start.going) / SQ2;
  const lSide = Math.sign(S.laneT4);
  out.push(
    ...run(
      onDiag(rLand - reach, S.ground, S.laneT4 + lSide * reach),
      onDiag(rLand, first, S.laneT4),
      S.width,
      S.start.risers,
    ),
  );
  // The running part: one repeat per panel.
  for (let k = 0; k < nodes.length; k++) {
    const y = nodes[k] as number;
    const r0 = cornerC(y) - S.fromC;
    landing(r0, y, S.p4, true);
    if (k === nodes.length - 1) break;
    const rPm = r0 - S.p4 - S.t3.run;
    out.push(...t3(r0 - S.p4, y));
    landing(rPm, y + S.t3.rise, S.pm, false);
    out.push(...t3(rPm - S.pm, y + S.t3.rise));
    const rPa = rPm - S.pm - S.t3.run;
    landing(rPa, y + 2 * S.t3.rise, S.pa, true);
    out.push(...t4(rPa, y + 2 * S.t3.rise));
  }
  // The arrival: a T3 to a Pm, then straight on to the 1st floor.
  const yTop = nodes[nodes.length - 1] as number;
  const rTop = cornerC(yTop) - S.fromC - S.p4;
  out.push(...t3(rTop, yTop));
  const rPm = rTop - S.t3.run;
  landing(rPm, yTop + S.t3.rise, S.pm, false);
  const lastRisers = Math.round((FLOORS.first - yTop - S.t3.rise) / 0.15933);
  const rEnd = rPm - S.pm - lastRisers * 0.25;
  out.push(...flight(rPm - S.pm, yTop + S.t3.rise, rEnd, FLOORS.first, S.laneT3, S.width, lastRisers));
  landing(rEnd, FLOORS.first, S.p4, false);
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

/**
 * The two Edoux cars, each named, because each is its own mesh: they are
 * counterweighted against one another and so are the one pair in the
 * tower that must move in opposite directions.
 */
function edouxCars(): Array<{ name: string; block: Block }> {
  const [along, high, across] = EDOUX.car;
  // Counterweights: when the upper car is `travel` above the landing, the
  // lower one is as far below it [sourced mechanism].
  const up = FLOORS.landing + EDOUX.travel;
  const down = FLOORS.landing - EDOUX.travel;
  return [
    {
      name: "edoux.nord",
      block: { at: inShaft(-EDOUX.carAxis, up + high / 2), x: S_HAT, y: UP, size: [along, high, across] },
    },
    {
      name: "edoux.sud",
      block: { at: inShaft(EDOUX.carAxis, down + high / 2), x: S_HAT, y: UP, size: [along, high, across] },
    },
  ];
}

/**
 * The service stairs in the shaft, placed from the plans (PL-XIX Fig. 14,
 * the landing, 1:200 at 81.3 px/m on its printed 11.337; Fig. 7, the 2nd
 * floor; Fig. 9, the 3rd floor at 79 px/m on its 16.560), as (s, t): s
 * toward pile 3 Sud, t toward pile 4 Ouest.
 */
const SHAFT_STAIRS = {
  /**
   * e2, Ø 1.600 with 0.600 treads [sourced PL-XX Figs 2-3], at (-2.8, 1.3):
   * under the upper car's berth, between its cylinders, the same on three
   * plans within 0.3 [measured]. Its helix stops at (225.60), 3.83 under
   * the landing, where « 16 marches 2.92 » and « 5 marches 0.91 » take over
   * [sourced PL-XX Fig. 2]. PL-XX draws the first flight end-on, so it runs
   * across the car line, Ouest; Fig. 14 has the landing open there, « 2.62 »
   * × « 2.45 », at s -2.73 … -0.11, t 3.40 … 5.85, labelled « Escalier de
   * l'étage intermédiaire au 2e étage » [sourced; measured]. So the 16 run
   * Ouest under the floor, turn on a landing by the edge girder, and the 5
   * come back up into that opening [the dog-leg and its 0.184 and 0.2
   * treads estimated].
   */
  e2: { s: -2.8, t: 1.3, diameter: 1.6, tread: 0.6, top: FLOORS.landing - 3.83 },
  e2Flights: { up: 16, upRise: 2.92, upGoing: 0.184, back: 5, backGoing: 0.2, turn: 0.9, width: 0.6 },
  /**
   * e3, Ø 1.680 [sourced PL-XX Figs 1-2], at (3.0, 3.3) on the landing,
   * beside the lower car's well and 0.36 clear of it [measured, Fig. 14;
   * PL-XX's section draws it over the car only because it projects onto the
   * car line]. Built at t 3.2, inside the reading's ±0.1: at node III the
   * plan bracing's diamond side stands at t 4.175, and 3.3 would put its
   * hand rail on the chord [derived]. « 314 marches sur une hauteur de
   * 54m88 » to the « escalier de raccord (Panneau 26-27) », « 13 marches »,
   * « 2.327 » [sourced PL-XX Figs 1-2], which shifts it toward the axis:
   * to u 1.3 on PL-XX Fig. 1,
   * and on the 3rd floor's plan the helix stands at (1.36, 1.29)
   * [measured; Fig. 9 labels that helix for the stair on up to the
   * apartment, and the model takes e3's upper helix to stand under it].
   */
  e3: { s: 3.0, t: 3.2, diameter: 1.68, tread: 0.64, steps: 314, rise: 54.88 },
  e3Raccord: { risers: 13, rise: 2.327 },
  e3Upper: { s: 1.36, t: 1.29 },
} as const;

/** e2 and e3: the service helices in the shaft, and their straight flights. */
function shaftStairs(): { blocks: Block[]; rails: Vec3[][] } {
  const out: Block[] = [];
  const rails: Vec3[][] = [];
  // Angle a in the shaft's frame: 0 toward +s, a quarter turn toward +t.
  const dirAt = (a: number): Vec3 => add3(mul3(S_HAT, Math.cos(a)), mul3(T_HAT, Math.sin(a)));

  // e2: up from the 2nd floor, leaving its helix going Ouest (+t) from
  // the helix's +s side.
  const { e2, e2Flights: f } = SHAFT_STAIRS;
  const e2Steps = Math.round((e2.top - FLOORS.second) / 0.178);
  const e2Start = Math.PI / 2;
  const e2Helix = helix(
    (y) => inShaft(e2.s, y, e2.t),
    S_HAT,
    T_HAT,
    FLOORS.second,
    e2.top,
    e2.diameter,
    e2.tread,
    turnsBetween(e2Steps, e2Start, 0),
    e2Start,
  );
  out.push(...e2Helix.blocks);
  rails.push(e2Helix.rail);
  const walk = e2.diameter / 2 - e2.tread / 2;
  const laneUp = e2.s + walk;
  const laneBack = laneUp + f.width;
  const tFoot = e2.t + 0.15;
  const tTurn = tFoot + f.up * f.upGoing;
  const yTurn = e2.top + f.upRise;
  out.push(...run(inShaft(laneUp, e2.top, tFoot), inShaft(laneUp, yTurn, tTurn), f.width, f.up));
  out.push(pad(inShaft((laneUp + laneBack) / 2, yTurn, tTurn + f.turn / 2), T_HAT, f.turn, 2 * f.width));
  out.push(
    ...run(
      inShaft(laneBack, yTurn, tTurn),
      inShaft(laneBack, FLOORS.landing, tTurn - f.back * f.backGoing),
      f.width,
      f.back,
    ),
  );

  // e3: up from the landing, entering on its -s side, to the raccord; the
  // raccord runs straight along the line of the two axes, tangent to both
  // helices on their walking line; the upper helix goes on to the 3rd.
  const { e3, e3Raccord: rc, e3Upper } = SHAFT_STAIRS;
  const riser = e3.rise / e3.steps;
  const yRaccord = FLOORS.landing + e3.rise;
  const yUpper = yRaccord + rc.rise;
  const ds = e3Upper.s - e3.s;
  const dt = e3Upper.t - e3.t;
  // Walking counter-clockwise, the tangent at angle a is (-sin a, cos a):
  // the angle whose tangent runs from the lower axis toward the upper.
  const toward = Math.atan2(-ds, dt);
  const e3Start = Math.PI;
  const lower = helix(
    (y) => inShaft(e3.s, y, e3.t),
    S_HAT,
    T_HAT,
    FLOORS.landing,
    yRaccord,
    e3.diameter,
    e3.tread,
    turnsBetween(e3.steps, e3Start, toward),
    e3Start,
    riser,
  );
  const upperSteps = Math.round((FLOORS.third - yUpper) / riser);
  const upper = helix(
    (y) => inShaft(e3Upper.s, y, e3Upper.t),
    S_HAT,
    T_HAT,
    yUpper,
    FLOORS.third,
    e3.diameter,
    e3.tread,
    Math.max(1, Math.round(upperSteps / 15)),
    toward,
    riser,
  );
  out.push(...lower.blocks, ...upper.blocks);
  rails.push(lower.rail, upper.rail);
  const mid = e3.diameter / 2 - e3.tread / 2;
  const side = mul3(dirAt(toward), mid);
  out.push(
    ...run(
      add3(inShaft(e3.s, yRaccord, e3.t), side),
      add3(inShaft(e3Upper.s, yUpper, e3Upper.t), side),
      e3.tread,
      rc.risers,
    ),
  );
  return { blocks: out, rails };
}

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
}

/**
 * One lift car's run, for the host that moves it.
 *
 * The graph settles WHERE a car can be; the clock is the page's. A car is
 * a rigid body, built at the arc length `at`: to put it at `s`, read both
 * poses with {@link carPose} and turn the built mesh by the difference in
 * angle about `axis`, about the built pose's point, onto the new one. On a
 * leg the line is the rail line the tracks are built on, station for
 * station, so the car rides the rail exactly; in the shaft it is vertical.
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
 * Where a car on `line` stands at arc length `s`: `out` gets the point
 * midway between its axles (x, y, z, world) and the chord's slope above
 * the horizontal, in radians. Writes into `out` and allocates nothing.
 */
export function carPose(line: RunLine, s: number, out: Float64Array): void {
  const h = line.wheelbase / 2;
  if (h > 0) {
    pathPoint(line, s - h, AXLES, 0);
    pathPoint(line, s + h, AXLES, 3);
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
function lineThrough(points: readonly Vec3[], wheelbase: number): RunLine {
  const arc = [0];
  for (let i = 1; i < points.length; i++) {
    const d = sub3(points[i] as Vec3, points[i - 1] as Vec3);
    arc.push((arc[i - 1] as number) + Math.hypot(d[0], d[1], d[2]));
  }
  return { path: points, arc, wheelbase };
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
  return lineThrough([at(s0), ...inner, at(s1)], line.wheelbase);
}

/**
 * A leg car and its run: the body turned onto quadrant target k's rail
 * line, the stations found on it, the line cut to what the wheels use.
 *
 * The rail line is `railLine`, the one `track` builds the girders on,
 * carried onto the leg as `copyToQuadrants` carries the track: the same
 * stations, so the car's axles are ON the built rail at every moment. A
 * station is where the lower floor's centre stands at the station's
 * height, found by bisection along the line (the floor rises with the arc
 * length, the tipping included, on every run here). The run begins half a
 * wheelbase below the lowest station and ends half a wheelbase above the
 * highest, so both axles are on it throughout; that both ends are still on
 * the built rail is checked here, not assumed.
 */
function legRun(k: number): { run: CarRun; blocks: Block[] } {
  const system = PILES[k]?.lift === "roux" ? "roux" : "otis";
  const spec = system === "roux" ? ROUX_CAR : OTIS_CAR;
  const body = carBody(spec);
  const axis = onLeg(k, E);
  const rail = lineThrough(
    railLine(spec.top).map(([r, y]) => onLeg(k, onDiag(r, y))),
    body.wheelbase,
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
  const s0 = first - h;
  const line = cutLine(rail, s0, last + h);
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
  const placed = body.blocks.map((b) => ({ at: add3(mid, turn(b.at)), x: turn(b.x), y: turn(b.y), size: b.size }));
  return { run, blocks: placed };
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
 * leave the landing together and reach their far ends together, which is
 * why they share a phase and why both runs start at the landing (195.93)
 * where the passengers changed cars. The upper runs up to the 3rd floor,
 * the lower down to the 2nd, each 80.2 m — the pistons' stroke.
 */
export const LIFT_CARS: readonly CarRun[] = [
  ...LEG_CARS.map((c) => c.run),
  // The upper car: landing -> 3rd floor, built `travel` above the landing.
  edouxRun("edoux.nord", -EDOUX.carAxis, FLOORS.landing, FLOORS.third, EDOUX.travel, 0, FLOORS.third - FLOORS.landing),
  // The lower car: its line runs 2nd floor -> landing, and its run from the
  // landing (the line's top) down to the 2nd, built `travel` below the landing.
  edouxRun(
    "edoux.sud",
    EDOUX.carAxis,
    FLOORS.second,
    FLOORS.landing,
    FLOORS.landing - FLOORS.second - EDOUX.travel,
    FLOORS.landing - FLOORS.second,
    0,
  ),
];

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

  // Cars stand at a different moment in each leg, so they are laid out per
  // leg here rather than copied — and each is its own MESH, because the
  // page moves them one at a time along the runs LIFT_CARS publishes. One
  // merged node would be one rigid body and the six would have to travel
  // together, which is the one thing a lift never does.
  const cars = [
    ...CAR_NAME.map((name, k) => ({
      name,
      mesh: blocks(g, carId(name), (LEG_CARS[k] as { blocks: Block[] }).blocks),
    })),
    ...edouxCars().map(({ name, block }) => ({ name, mesh: blocks(g, carId(name), [block]) })),
  ];

  const e1 = firstToSecond();
  const shaft = shaftStairs();
  const stairs = merge(g, "liftStairs", [
    copyToQuadrants(g, "liftStairE1", blocks(g, "liftStairE1Leg", e1.blocks), quads, ["normal"]),
    copyToQuadrants(g, "liftStairGround", blocks(g, "liftStairGroundLeg", groundToFirst()), even, ["normal"]),
    blocks(g, "liftStairShaft", shaft.blocks),
  ]);
  // Hand rails: paths copied before they are skinned.
  const rails = merge(g, "liftRails", [
    copyToQuadrants(g, "liftRailsE1", polylines(g, "liftRailsE1Leg", e1.rails), quads),
    polylines(g, "liftRailsShaft", shaft.rails),
  ]);
  return {
    girders: [tracks, guides],
    platforms: [stairs, skin(g, "liftRailSkin", rails, 0.025)],
    cars,
  };
}
