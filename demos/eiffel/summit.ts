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
 *    [estimated], in two rows of the same 2.50 m bays [estimated].
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
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { component, mul, position, ramp, sweepProfile, vec } from "pcg-ts";
import {
  box,
  chains,
  edges,
  merge,
  placedLattice,
  skin,
  squareRing,
  stationLattice,
  stationRows,
} from "./lattice.js";
import type { Parts } from "./parts.js";
import { FLOORS, MEMBERS, PANEL29 } from "./spec.js";

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

/** Panel 29: the shaft's last panel, a braced 10 m box. */
function panel29(g: Graph): Parts {
  const lat = boxLattice(g, "p29", PANEL29.half, PANEL29.bottom, PANEL29.top, PANEL29_ROWS);
  const corners = chains(lat, "Corners", (s) => isCorner(s));
  const posts = chains(lat, "Posts", (s) => !isCorner(s));
  // k = 0 is the shaft's top ring, whose horizontals the shaft already draws.
  const horizontals = edges(lat, "Horizontals", 1, 0, (_s, k) => k > 0);
  const crosses = merge(g, "p29Crosses", [edges(lat, "CrossA", 1, 1), edges(lat, "CrossB", -1, 1)]);
  return {
    uprights: [skin(g, "p29UprightSkin", corners, MEMBERS.upright, [1, 0, 0])],
    bracing: [
      skin(g, "p29PostSkin", posts, PANEL29_WEB, [1, 0, 0]),
      skin(g, "p29CrossSkin", crosses, PANEL29_WEB),
    ],
    horizontals: [skin(g, "p29HorizontalSkin", horizontals, MEMBERS.horizontal)],
  };
}

/** The lattice box above the room. */
function cage(g: Graph, y0: number): NodeHandle[] {
  const lat = boxLattice(g, "cage", CAGE.half, y0, y0 + CAGE.height, CAGE.rows);
  const web = merge(g, "cageWeb", [
    chains(lat, "Posts", (s) => !isCorner(s)),
    edges(lat, "CrossA", 1, 1),
    edges(lat, "CrossB", -1, 1),
  ]);
  return [
    skin(g, "cageCornerSkin", chains(lat, "Corners", (s) => isCorner(s)), CAGE_MEMBERS.corner, [
      1, 0, 0,
    ]),
    skin(g, "cageHorizontalSkin", edges(lat, "Horizontals", 1, 0), CAGE_MEMBERS.horizontal),
    skin(g, "cageWebSkin", web, CAGE_MEMBERS.web),
  ];
}

/**
 * The dome's four half-arches as one lattice: station 2a is arch a's
 * intrados, 2a + 1 its extrados, and level k runs from the springing
 * (k = 0) through the top of the stilt (k = 1) round the quarter circle to
 * the crown on the axis. Returns the skinned ribs and the crown's height.
 */
function dome(g: Graph, springY: number): { mesh: NodeHandle; crownY: number } {
  const span = CAGE.half * Math.SQRT2; // the springing's radius: a box corner
  const stilt = DOME.rise - span;
  const centreY = springY + stilt;
  const n = DOME.segments;
  const lat = placedLattice(g, "dome", stationRows(8, n + 2, (s, k) => {
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
  }));
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
  return { mesh, crownY: centreY + span };
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

/** Build panel 29, the 3rd-floor room and the campanile. */
export function buildSummit(g: Graph): Parts {
  const roomTop = FLOORS.third + ROOM.height;
  const cageTop = roomTop + CAGE.height;
  const { mesh: ribs, crownY } = dome(g, cageTop);

  // The lantern stack, from the printed lantern terrace up; it closes on
  // the printed top terrace (FLOORS.topTerrace) exactly.
  const baseY = FLOORS.lanternTerrace;
  const lanternY = baseY + LANTERN.baseHeight;
  const cupolaY = lanternY + LANTERN.lanternHeight;
  const cupolaTop = cupolaY + LANTERN.cupolaHeight;
  const flagY = FLOORS.topTerrace;

  const summit: NodeHandle[] = [
    slab(g, "room", ROOM.side, FLOORS.third, ROOM.height),
    ...cage(g, roomTop),
    ribs,
    slab(g, "lanternTerrace", LANTERN.terraceWidth, crownY, FLOORS.lanternTerrace - crownY),
    slab(g, "lanternBase", LANTERN.wide, baseY, LANTERN.baseHeight),
    roundParts(g, lanternY, cupolaY, cupolaTop, flagY),
    slab(g, "topTerrace", LANTERN.wide, flagY - LANTERN.topDeck, LANTERN.topDeck),
  ];
  return { ...panel29(g), summit };
}
