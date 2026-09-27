/**
 * Nothing in the Eiffel demo stands on air.
 *
 * The user's report: « in some places some beams end up in the air, with
 * no support, which looks weird » — on the 1st floor, the entrance
 * flights' balustrade had its back run's rails stopping in mid-air on the
 * newel's line, with no post under their end. This suite finds that kind
 * of thing tower-wide, in what the graph COOKS at the plain depth, with
 * the detector in tests/support/eiffelFloating.ts:
 *
 * - FLOATING: a cluster of faces that touch each other (within 8 mm) but
 *   nothing that reaches the ground;
 * - LOOSE ENDS: a linear member (a closed run of one mesh's triangles, at
 *   least 0.3 m long and 4 times its section) with an end that touches no
 *   other member — both ends for a lying or raking one, the foot for a
 *   standing one.
 *
 * What is flagged and meant to be (a lift car the page moves, a cable, a
 * part under the ground the section view opens...) is pinned in `ALLOW`,
 * each entry with the region, the exact count and the reason; everything
 * else must read zero, and an allow-list entry that no longer matches its
 * count fails too, so it cannot go stale.
 *
 * It measures the tower AS DESIGNED: the cook runs with every jitter
 * node's amount set to zero (see `unjittered`), because the question is
 * whether the construction connects, and the demo's 1 mm jitter is a
 * rendering device whose draw may churn. Measured with it, a verdict near
 * a threshold was the draw's: of ten jitter seeds, only the demo's own
 * passed the exact counts below. So the geometry measured is also shown
 * not to depend on the seed at all.
 *
 * The detector is first shown to say "floating" and "loose" on a scene
 * built to have them, so a detector that cannot find anything cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Graph, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { type FloatingReport, type Soup, findFloating } from "./support/eiffelFloating.js";

type Box = readonly [number, number, number, number, number, number];

interface Allowed {
  readonly kind: "floating" | "loose";
  /** A class, or a prefix ending in "." (e.g. "car."). */
  readonly cls: string;
  /** Where: a floating cluster matches by its box's centre, a loose end by its free end. */
  readonly box: Box;
  readonly count: number;
  readonly reason: string;
}

/** What is flagged on purpose (see the file comment). */
const ALLOW: readonly Allowed[] = [
  {
    kind: "loose",
    cls: "platforms",
    box: [-16.9, 67.05, -0.75, -16.7, 67.25, 1.35],
    count: 2,
    reason:
      "G111: the Russe finial's weathervane arrow (DRESSING.russe.finial.vane), whose tip and tail are free in the air by nature; its middle passes through the wheel on the mast",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-19.1, 101.3, -19.1, 19.1, 102.9, 19.1],
    count: 24,
    reason:
      "G57-G59: panel 10's lintel lattice bars are clipped to upright b's axis (firstFloor.ts secondFloor, 'clipped to b's axis'), their ends buried in b's box; SOURCES.md 24.5 lists the 2nd floor's bands as run to b's axis by convention",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [45.323, -4.364, -62.151, 62.15, -2.697, -45.323],
    count: 8,
    reason:
      "G18: the anchor bolts' double-T bars under the shoes, underground (seen only in ?section): their lower ends lie in the massif's rubble; their upper ends stop 0.11-0.14 m under the shoe, short of anything [follow-up: the bolt rod between is not modelled]",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [45.322, -4.365, 45.323, 62.15, -2.698, 62.15],
    count: 14,
    reason:
      "G18: the anchor bolts' double-T bars under the shoes, underground (seen only in ?section): their lower ends lie in the massif's rubble; their upper ends stop 0.11-0.14 m under the shoe, short of anything [follow-up: the bolt rod between is not modelled]",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [-62.149, -4.365, 45.322, -45.321, -2.697, 62.151],
    count: 14,
    reason:
      "G18: the anchor bolts' double-T bars under the shoes, underground (seen only in ?section): their lower ends lie in the massif's rubble; their upper ends stop 0.11-0.14 m under the shoe, short of anything [follow-up: the bolt rod between is not modelled]",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [-62.149, -4.365, -62.15, -45.322, -2.698, -45.322],
    count: 14,
    reason:
      "G18: the anchor bolts' double-T bars under the shoes, underground (seen only in ?section): their lower ends lie in the massif's rubble; their upper ends stop 0.11-0.14 m under the shoe, short of anything [follow-up: the bolt rod between is not modelled]",
  },
  {
    kind: "loose",
    cls: "machinery",
    box: [42, 2.4, 42, 59, 3.35, 59],
    count: 8,
    reason:
      "G23: the anchor bolts' threaded tops standing 0.16 over their nuts, as sourced (SUPPORT.bolts, PL-VI Figs 13-16: the rod 0.16 over the nut); a bolt's tail, not a member",
  },
  {
    kind: "loose",
    cls: "machinery",
    box: [42, 2.4, -59, 59, 3.35, -42],
    count: 8,
    reason:
      "G23: the anchor bolts' threaded tops standing 0.16 over their nuts, as sourced (SUPPORT.bolts, PL-VI Figs 13-16: the rod 0.16 over the nut); a bolt's tail, not a member",
  },
  {
    kind: "loose",
    cls: "machinery",
    box: [-59, 2.4, 42, -42, 3.35, 59],
    count: 8,
    reason:
      "G23: the anchor bolts' threaded tops standing 0.16 over their nuts, as sourced (SUPPORT.bolts, PL-VI Figs 13-16: the rod 0.16 over the nut); a bolt's tail, not a member",
  },
  {
    kind: "loose",
    cls: "machinery",
    box: [-59, 2.4, -59, -42, 3.35, -42],
    count: 8,
    reason:
      "G23: the anchor bolts' threaded tops standing 0.16 over their nuts, as sourced (SUPPORT.bolts, PL-VI Figs 13-16: the rod 0.16 over the nut); a bolt's tail, not a member",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [41.918, 4.969, -56.953, 56.941, 5.038, -41.913],
    count: 2,
    reason:
      "G62: tie B's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 0.78 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-56.942, 4.97, -56.953, -41.918, 5.037, -41.914],
    count: 2,
    reason:
      "G62: tie B's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 0.78 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [41.918, 4.97, 41.914, 56.941, 5.036, 56.953],
    count: 2,
    reason:
      "G62: tie B's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 0.78 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-56.941, 4.969, 41.914, -41.917, 5.036, 56.953],
    count: 2,
    reason:
      "G62: tie B's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 0.78 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [42.545, 3.745, 42.545, 57.593, 3.81, 57.591],
    count: 2,
    reason:
      "G63: tie A's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 1.49 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-57.593, 3.745, 42.546, -42.545, 3.809, 57.591],
    count: 2,
    reason:
      "G63: tie A's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 1.49 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [42.546, 3.745, -57.592, 57.593, 3.809, -42.546],
    count: 2,
    reason:
      "G63: tie A's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 1.49 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-57.593, 3.745, -57.591, -42.545, 3.808, -42.546],
    count: 2,
    reason:
      "G63: tie A's end-bay bar runs, as every edge-rule bar does, to the upright's axis: it enters the hollow built-up box through its web (visibly joined) and ends inside it, hidden; the axis first meets a plate 1.49 m in, so no surface is near the end",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [45.585, -7.53, -52.623, 59.846, -7.47, -52.562],
    count: 2,
    reason:
      "G85: the earthing pipes' buried far ends: cast-iron pipes laid in the soil 3 m under the platform to lose atmospheric electricity into it (p. 86); the soil that carries them is not modelled (seen only in ?section)",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [-59.845, -7.53, -52.623, -45.585, -7.47, -52.563],
    count: 2,
    reason:
      "G85: the earthing pipes' buried far ends: cast-iron pipes laid in the soil 3 m under the platform to lose atmospheric electricity into it (p. 86); the soil that carries them is not modelled (seen only in ?section)",
  },
  {
    kind: "loose",
    cls: "horizontals",
    box: [16.158, 79.37, -19.634, 19.642, 79.43, -16.165],
    count: 2,
    reason:
      "G88: entretoise diagonale at XXI in the Otis legs: the model's Otis car passes through the girder's line there (its roof 1.17 over the underside), so it is two halves ending free either side of the car's way; PL-VIII draws it whole and no source shows how it was carried round the car (open decision)",
  },
  {
    kind: "loose",
    cls: "horizontals",
    box: [-19.642, 79.37, 16.166, -16.157, 79.43, 19.635],
    count: 2,
    reason:
      "G88: entretoise diagonale at XXI in the Otis legs: the model's Otis car passes through the girder's line there (its roof 1.17 over the underside), so it is two halves ending free either side of the car's way; PL-VIII draws it whole and no source shows how it was carried round the car (open decision)",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [35.965, -4.929, 46.14, 36.025, -4.869, 46.2],
    count: 1,
    reason:
      "G106: a perimeter wall pier founded at cote 28.00 as sourced (piles 1, 4); it stands on the gravel, which is not modelled (seen only in ?section)",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [-36.025, -4.929, 46.14, -35.965, -4.869, 46.2],
    count: 1,
    reason:
      "G106: a perimeter wall pier founded at cote 28.00 as sourced (piles 1, 4); it stands on the gravel, which is not modelled (seen only in ?section)",
  },
  {
    kind: "loose",
    cls: "foundations",
    box: [98.95, -4.37, 48.95, 99.05, -4.27, 49.05],
    count: 1,
    reason:
      "the chimney by pile 4, drawn as one closed skin (ground.ts chimneySkin), reads as one 18 m member; its foot is its concrete footing 5.88 under the model's ground, bedded in the soil, which is not modelled (seen only in ?section)",
  },
  {
    kind: "loose",
    cls: "machinery",
    box: [-3.341, 114.159, 0.407, -0.407, 114.22, 3.341],
    count: 2,
    reason:
      "G107: Edoux cylinders hang from their cast-steel caps on the landing's cross beams and E girders (E1900-TXT p. 172, PL-XXIII ter Figs 19, 30): carried at the top, their foot ends free where the book's 81.06 puts it (z 114.00), 1.73 under the 2nd floor, through the deck's (pending) hole",
  },
  {
    kind: "loose",
    cls: "car.otis.nord.truck",
    box: [-25.237, 41.124, 25.524, -25.177, 41.184, 25.584],
    count: 1,
    reason:
      "G129: the counterweight equalizer rod T's inner end, 2 cm off the grande poulie's hub inside the truck 41 m up in the leg: the equalizer lever it is pinned to is not modelled, and a lug there would cut the poulie's spokes",
  },
  {
    kind: "loose",
    cls: "car.otis.sud.truck",
    box: [28.528, 34.457, -28.936, 28.588, 34.517, -28.876],
    count: 1,
    reason:
      "G130: the counterweight equalizer rod T's inner end, 2 cm off the grande poulie's hub inside the truck 34 m up in the leg: the equalizer lever it is pinned to is not modelled, and a lug there would cut the poulie's spokes",
  },
  {
    kind: "floating",
    cls: "girders",
    box: [-37.772, 44.192, 36.045, -36.045, 44.253, 37.772],
    count: 2,
    reason:
      "G45: the Masque's UpA corner stub (one 1.6 m flat at the screen's lower corner) crosses no post; it laps onto the 750 chord 12-14 mm behind it (the flats' layer offset), so floats by that; closing it would put it in the chord's plane",
  },
  {
    kind: "floating",
    cls: "girders",
    box: [36.045, 44.192, 36.045, 37.772, 44.252, 37.772],
    count: 2,
    reason:
      "G45: the Masque's UpA corner stub (one 1.6 m flat at the screen's lower corner) crosses no post; it laps onto the 750 chord 12-14 mm behind it (the flats' layer offset), so floats by that; closing it would put it in the chord's plane",
  },
  {
    kind: "floating",
    cls: "girders",
    box: [-37.772, 44.192, -37.772, -36.045, 44.253, -36.045],
    count: 2,
    reason:
      "G45: the Masque's UpA corner stub (one 1.6 m flat at the screen's lower corner) crosses no post; it laps onto the 750 chord 12-14 mm behind it (the flats' layer offset), so floats by that; closing it would put it in the chord's plane",
  },
  {
    kind: "floating",
    cls: "girders",
    box: [36.045, 44.192, -37.772, 37.772, 44.253, -36.045],
    count: 2,
    reason:
      "G45: the Masque's UpA corner stub (one 1.6 m flat at the screen's lower corner) crosses no post; it laps onto the 750 chord 12-14 mm behind it (the flats' layer offset), so floats by that; closing it would put it in the chord's plane",
  },
  // The four Masque entries read 62 each, as a screen repeated on four
  // faces must. They read 60, 62, 62 and 60 while the suite measured the
  // jittered mesh with a 4 mm weld: the 630 chord is a flat 4.0 mm thick,
  // so whether its thin side welded shut (splitting the bar into pieces
  // that held each other up and hid its ends) was the jitter's draw, and
  // the counts moved with every seed. Measured as designed, with a 0.5 mm
  // weld, all sixteen of the chord's ends read loose, every quadrant alike.
  {
    kind: "loose",
    cls: "girders",
    box: [20.847, 40.268, 20.852, 39.769, 50.039, 39.768],
    count: 62,
    reason:
      "Masque (PL-VII Fig. 6), groups G09,G20,G22,G27,G31,G32,G33,G34,G35,G36,G60,G61: the screen's flats are stacked 12 mm apart so no two crossing flats share a plane (legs.ts masque layers), so a flat one or two layers behind the chord plate it laps onto ends 1.2-2.6 cm behind it, hidden by the plate; and the flats', fillet bands' and the 630 chord's ends at the screen's sides stop 0.45 off the uprights' axes (clear of the fin on the web, and at XXV of the node's gussets), 1 cm beside the box and 5-8 cm in front of its web (the 4-8 cm gaps). The screen bears on the uprights through the 750's packing (MASQUE_BEARING), so none of these ends is unsupported; closing each would need a packing per flat end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [20.847, 40.268, -39.768, 39.768, 50.039, -20.852],
    count: 62,
    reason:
      "Masque (PL-VII Fig. 6), groups G09,G20,G22,G27,G31,G32,G33,G34,G35,G36,G60,G61: the screen's flats are stacked 12 mm apart so no two crossing flats share a plane (legs.ts masque layers), so a flat one or two layers behind the chord plate it laps onto ends 1.2-2.6 cm behind it, hidden by the plate; and the flats', fillet bands' and the 630 chord's ends at the screen's sides stop 0.45 off the uprights' axes (clear of the fin on the web, and at XXV of the node's gussets), 1 cm beside the box and 5-8 cm in front of its web (the 4-8 cm gaps). The screen bears on the uprights through the 750's packing (MASQUE_BEARING), so none of these ends is unsupported; closing each would need a packing per flat end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-39.768, 40.268, -39.768, -20.846, 50.04, -20.852],
    count: 62,
    reason:
      "Masque (PL-VII Fig. 6), groups G09,G20,G22,G27,G31,G32,G33,G34,G35,G36,G60,G61: the screen's flats are stacked 12 mm apart so no two crossing flats share a plane (legs.ts masque layers), so a flat one or two layers behind the chord plate it laps onto ends 1.2-2.6 cm behind it, hidden by the plate; and the flats', fillet bands' and the 630 chord's ends at the screen's sides stop 0.45 off the uprights' axes (clear of the fin on the web, and at XXV of the node's gussets), 1 cm beside the box and 5-8 cm in front of its web (the 4-8 cm gaps). The screen bears on the uprights through the 750's packing (MASQUE_BEARING), so none of these ends is unsupported; closing each would need a packing per flat end",
  },
  {
    kind: "loose",
    cls: "girders",
    box: [-39.768, 40.268, 20.852, -20.847, 50.039, 39.768],
    count: 62,
    reason:
      "Masque (PL-VII Fig. 6), groups G09,G20,G22,G27,G31,G32,G33,G34,G35,G36,G60,G61: the screen's flats are stacked 12 mm apart so no two crossing flats share a plane (legs.ts masque layers), so a flat one or two layers behind the chord plate it laps onto ends 1.2-2.6 cm behind it, hidden by the plate; and the flats', fillet bands' and the 630 chord's ends at the screen's sides stop 0.45 off the uprights' axes (clear of the fin on the web, and at XXV of the node's gussets), 1 cm beside the box and 5-8 cm in front of its web (the 4-8 cm gaps). The screen bears on the uprights through the 750's packing (MASQUE_BEARING), so none of these ends is unsupported; closing each would need a packing per flat end",
  },
];

const matches = (a: Allowed, cls: string, p: readonly number[]) =>
  (a.cls.endsWith(".") ? cls.startsWith(a.cls) : cls === a.cls) &&
  [0, 1, 2].every((k) => p[k]! >= a.box[k]! && p[k]! <= a.box[k + 3]!);

const fmt = (p: readonly number[]) => p.map((x) => x.toFixed(2)).join(", ");

/**
 * The graph with every `jitterPoints` node's amount set to zero: the tower
 * as designed. The demo jitters each class (and each lift car) by up to
 * parts.ts `JITTER` an axis, so two coincident points of different draws
 * part by up to 2 * sqrt(3) mm: enough to carry a design gap across the
 * 8 mm `tol`, or two corners of a 4 mm plate across the old 4 mm weld,
 * one way for one seed and the other way for the next. Zeroing the amount
 * rather than rewiring round the node leaves every output where the demo
 * puts it.
 */
function unjittered(g: Graph): Graph {
  const ids = g
    .describe()
    .nodes.filter((n) => n.defType === "jitterPoints")
    .map((n) => n.id);
  // No jitter node found means the demo jitters some other way now, and
  // this suite would be back to measuring a draw: say so, loudly.
  expect(ids.length, "jitterPoints nodes in the eiffel graph").toBeGreaterThan(0);
  for (const id of ids) g.setParam({ id } as NodeHandle<Record<string, unknown>>, "amount", [0, 0, 0]);
  return g;
}

/** The tower's meshes, un-jittered, one soup per output (each class, each lift car, the flag). */
async function cookSoups(seed = 1889): Promise<Soup[]> {
  const { outputs } = await cook(unjittered(buildEiffel(seed)));
  const soups: Soup[] = [];
  for (const [cls, v] of Object.entries(outputs)) {
    const g = firstGeometry(v as never);
    if (g === undefined || g === null) continue;
    const P = g.attrs.point.get("P");
    if (P === undefined) continue;
    soups.push({
      cls,
      P: P.data,
      primVertexStart: g.primVertexStart,
      primVertexCount: g.primVertexCount,
      vertexToPoint: g.vertexToPoint,
    });
  }
  return soups;
}

/** A box's twelve triangles as one soup's polygons, appended to `into`. */
function addBox(into: { P: number[]; start: number[]; count: number[]; v2p: number[] }, lo: readonly number[], hi: readonly number[]): void {
  const c = (i: number): [number, number, number] => [i & 1 ? hi[0]! : lo[0]!, i & 2 ? hi[1]! : lo[1]!, i & 4 ? hi[2]! : lo[2]!];
  // Each face its own four points, as the demo's boxes are.
  for (const quad of [
    [0, 2, 3, 1],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 6, 7, 3],
    [0, 4, 6, 2],
    [1, 3, 7, 5],
  ]) {
    const base = into.P.length / 3;
    for (const i of quad) into.P.push(...c(i));
    for (const tri of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      into.start.push(into.v2p.length);
      into.count.push(3);
      for (const k of tri) into.v2p.push(base + k!);
    }
  }
}

function soupOf(cls: string, boxes: ReadonlyArray<readonly [readonly number[], readonly number[]]>): Soup {
  const m = { P: [] as number[], start: [] as number[], count: [] as number[], v2p: [] as number[] };
  for (const [lo, hi] of boxes) addBox(m, lo, hi);
  return { cls, P: m.P, primVertexStart: m.start, primVertexCount: m.count, vertexToPoint: m.v2p };
}

describe("the detector can say floating and loose", () => {
  it("finds a block in the air, a rail end with no post, and passes the same rail on two posts", () => {
    const report = findFloating([
      soupOf("probe", [
        // A deck on the ground.
        [
          [-5, 0, -5],
          [5, 0.2, 5],
        ],
        // A post on it, and a rail on the post by one end: its other end is in the air.
        [
          [0, 0.2, 0],
          [0.1, 1.1, 0.1],
        ],
        [
          [0, 1.0, 0],
          [2, 1.1, 0.1],
        ],
        // The same rail on two posts: supported both ends.
        [
          [0, 0.2, 2],
          [0.1, 1.1, 2.1],
        ],
        [
          [1.9, 0.2, 2],
          [2, 1.1, 2.1],
        ],
        [
          [0, 1.0, 2],
          [2, 1.1, 2.1],
        ],
        // A block 5 cm over the deck.
        [
          [3, 0.25, 3],
          [3.5, 0.75, 3.5],
        ],
      ]),
    ]);
    expect(report.floating.length).toBe(1);
    expect(report.floating[0]!.lo[1]).toBeCloseTo(0.25, 6);
    const rails = report.looseEnds.filter((e) => e.end === "end");
    expect(rails.length).toBe(1);
    expect(rails[0]!.at[0]).toBeGreaterThan(1.8);
    expect(rails[0]!.at[2]).toBeLessThan(0.2);
  });

  it("finds the free end of a 3 mm flat bar, which a weld reaching across its thickness hides", () => {
    // The 630 chord's case in miniature: a flat bar on a post by one end.
    // A weld that reaches across the bar's thickness closes its thin sides
    // up, the bar falls apart into pieces that touch each other, and its
    // free end reads as held. The 4 mm weld the jittered mesh needed did
    // that to this bar, and to the chord whenever the draw brought its
    // 4.0 mm under the weld.
    const scene = soupOf("probe", [
      [
        [-5, 0, -5],
        [5, 0.2, 5],
      ],
      [
        [0, 0.2, 0],
        [0.1, 1.1, 0.1],
      ],
      [
        [0, 1.0, 0.05],
        [2, 1.1, 0.053],
      ],
    ]);
    const loose = findFloating([scene]).looseEnds;
    expect(loose.map((e) => e.end)).toEqual(["end"]);
    expect(loose[0]!.at[0]).toBeGreaterThan(1.8);
    expect(findFloating([scene], { weld: 0.004 }).looseEnds, "the old 4 mm weld, for contrast").toEqual([]);
  });
});

describe("the tower at the plain depth", () => {
  let soups: Soup[];
  let report: FloatingReport;
  beforeAll(async () => {
    soups = await cookSoups();
    report = findFloating(soups);
  }, 180_000);

  it("measures geometry no seed moves: another graph seed cooks the same soups to the bit", async () => {
    // What makes the verdicts below seed-independent, checked rather than
    // argued: if anything seeded besides the zeroed jitter ever reaches a
    // mesh, a report could flip with a seed change again, and this names
    // the class it reached.
    const other = await cookSoups(4242);
    expect(other.map((s) => s.cls)).toEqual(soups.map((s) => s.cls));
    const moved: string[] = [];
    soups.forEach((s, k) => {
      const o = other[k]!;
      let same = o.P.length === s.P.length && o.vertexToPoint.length === s.vertexToPoint.length;
      for (let i = 0; same && i < s.P.length; i++) same = Object.is(s.P[i], o.P[i]);
      for (let i = 0; same && i < s.vertexToPoint.length; i++) same = s.vertexToPoint[i] === o.vertexToPoint[i];
      same &&= o.primVertexStart.length === s.primVertexStart.length;
      for (let i = 0; same && i < s.primVertexStart.length; i++)
        same = s.primVertexStart[i] === o.primVertexStart[i] && s.primVertexCount[i] === o.primVertexCount[i];
      if (!same) moved.push(s.cls);
    });
    expect(moved, "classes whose un-jittered mesh depends on the graph seed").toEqual([]);
  }, 60_000);

  const check = (kind: "floating" | "loose") => {
    const items =
      kind === "floating"
        ? report.floating.map((f) => ({
            cls: f.classes.join("+"),
            at: [0, 1, 2].map((k) => (f.lo[k]! + f.hi[k]!) / 2),
            what: `${f.faces} faces, box ${fmt(f.lo)} .. ${fmt(f.hi)}`,
          }))
        : report.looseEnds.map((e) => ({
            cls: e.cls,
            at: [...e.at],
            what: `${e.end} of a ${e.length.toFixed(2)} m member along ${fmt(e.axis)}, box ${fmt(e.lo)} .. ${fmt(e.hi)}`,
          }));
    const entries = ALLOW.filter((a) => a.kind === kind);
    const seen = entries.map(() => 0);
    const stray: string[] = [];
    for (const item of items) {
      const k = entries.findIndex((a) => matches(a, item.cls, item.at));
      if (k < 0) stray.push(`${item.cls} at ${fmt(item.at)}: ${item.what}`);
      else seen[k]!++;
    }
    const stale = entries
      .map((a, k) => ({ a, n: seen[k]! }))
      .filter(({ a, n }) => n !== a.count)
      .map(({ a, n }) => `${a.cls} in ${fmt(a.box)}: ${n}, not ${a.count} (${a.reason})`);
    expect(stray.slice(0, 40), `${stray.length} ${kind} not allowed`).toEqual([]);
    expect(stale, "allow-list entries that no longer match their count").toEqual([]);
  };

  it("has no floating piece but what ALLOW names", () => check("floating"));
  it("has no member with an end in the air but what ALLOW names", () => check("loose"));

  it("ends the entrance flights' back rails on a post (the user's screenshot, face 3 and face 2)", () => {
    // The Russe's flights (face 3, -x) and the Français' (face 2, -z): the
    // flights' square, 2.33 to 3.8825 either side of the face's middle, at
    // the terrace's balustrade height.
    const near = report.looseEnds.filter(
      (e) =>
        e.at[1] > 57.5 &&
        e.at[1] < 59 &&
        Math.max(Math.abs(e.at[0]), Math.abs(e.at[2])) > 31 &&
        Math.max(Math.abs(e.at[0]), Math.abs(e.at[2])) < 34 &&
        Math.min(Math.abs(e.at[0]), Math.abs(e.at[2])) < 4.2,
    );
    expect(near.map((e) => `${e.cls} ${fmt(e.at)}`)).toEqual([]);
  });
});
