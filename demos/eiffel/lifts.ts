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
 * (§2.5). Above the 1st floor the track curves with the leg. Where it runs
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
 * floors are level and the upper deck sits further up the slope, the
 * stepped car of PL-XX, and the car rides BETWEEN its girders, each deck's
 * inner end 1.1 into the trough they make above the ties [measured on the
 * Otis]. Where each car stands is a chosen moment [estimated]: on the
 * 54.6° run, where the Otis car's 65.6° stack leaves its upper deck 0.6
 * into the trough, not 1.1.
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
 * A stepped double-deck car whose lower floor is at `floorY`: two level
 * decks, the upper one `step` higher and `setback` further in, on a
 * chassis along the rails, with a hanger under the lower deck's outer end.
 */
function car(spec: CarSpec, floorY: number): Block[] {
  const line = railLine(spec.top);
  const [len, high, wide] = spec.deck;
  const slope = railAt(line, floorY).tan;
  // Level floors on a slope: the lower deck's inner end dips TROUGH below
  // the rail line, square to the track (TROUGH √(1 + slope²) vertically),
  // which sets the floor's centre above the rail line.
  const lift = Math.max(0.3, (len / 2) * slope - TROUGH * Math.hypot(1, slope));
  const yRail = floorY - lift;
  const r1 = railAt(line, yRail).r;
  const back = spec.setback ?? spec.step / slope;
  const r2 = r1 - back;
  const out: Block[] = [
    levelBox(onDiag(r1, floorY + high / 2), len, high, wide),
    levelBox(onDiag(r2, floorY + spec.step + high / 2), len, high, wide),
  ];
  // The chassis, along the rails: from under the lower deck's outer end to
  // under the upper deck's inner end, or `chassis` long about their middle.
  const yOuter = yRail - (len / 2) * slope;
  const yInner = yRail + (back + len / 2) * slope;
  let yLow = yOuter;
  let yHigh = yInner;
  if (spec.chassis !== undefined) {
    const rise = (spec.chassis / 2) * (slope / Math.hypot(1, slope));
    yLow = (yOuter + yInner) / 2 - rise;
    yHigh = (yOuter + yInner) / 2 + rise;
  }
  const low = railAt(line, yLow);
  const high2 = railAt(line, yHigh);
  const pLow = add3(onDiag(low.r, yLow), mul3(low.n, 0.2));
  const pHigh = add3(onDiag(high2.r, yHigh), mul3(high2.n, 0.2));
  // Between the rails (0.10 wide on the webs), 0.05 clear of them.
  const chassis = member(pLow, pHigh, 0.3, low.n);
  out.push({ ...chassis, size: [chassis.size[0], 0.3, spec.gauge - 0.2] });
  // The hanger: from the chassis up to the lower floor, at its outer end or
  // at the chassis' end, whichever is further in.
  const rHang = Math.min(r1 + len / 2 - 0.1, low.r);
  const yHang = yRail + (r1 - rHang) * slope;
  const hang = floorY - yHang;
  if (hang > 0.3) out.push(levelBox(onDiag(rHang, yHang + hang / 2), 0.2, hang, wide));
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
 * Where each car stands: its lower floor's height, per quadrant target
 * [estimated moment]. Target 0 is pile 4 (Ouest, Roux), 1 pile 3 (Sud,
 * Otis), 2 pile 2 (Est, Roux), 3 pile 1 (Nord, Otis). All on the straight
 * 54.6° run below node XXIV, with level floors: above it the rail line
 * steepens to about 70° with the leg, which the model's cars do not ride.
 * The Otis car is drawn level on a ~65° track (PL-XXII ter Fig. 1); a
 * rigid one would tip about 11° on the 54.6° run, which is not modelled.
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
    copyToQuadrants(g, "liftOtisTracks", blocks(g, "liftOtisTrack", track(OTIS)), odd, ["normal"]),
    copyToQuadrants(g, "liftRouxTracks", blocks(g, "liftRouxTrack", track(ROUX)), even, ["normal"]),
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
    platforms: [blocks(g, "liftCars", cars), stairs, skin(g, "liftRailSkin", rails, 0.025)],
  };
}
