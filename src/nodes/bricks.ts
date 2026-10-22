/**
 * Bricks: a set of boxes on a stud lattice, turned into the bricks that
 * would build it.
 *
 * One node, {@link packBricks}. The question behind it is a PACKING and not
 * a sampling: the boxes upstream say which lattice cells are solid and what
 * each one is made of, and the answer is a list of bricks — whole-number
 * footprints from a stated catalogue — that fills exactly those cells, no
 * brick crossing a change of material and no vertical seam continuing from
 * one course into the next where a different brick would have broken it.
 *
 * THE ALGORITHM IS A SCANLINE GREEDY, and the scan is what makes it
 * complete. Cells are visited course by course from the bottom, and within
 * a course in z then x. The first unfilled cell of a scan has every cell
 * before it filled, so any brick that covers it and has not been placed yet
 * has its minimum corner exactly there — the anchor is never a guess, and
 * the only choice is WHICH brick. Height first — the tallest entry that
 * fits is the course — and then footprint, less a cost for every stud of
 * joint that would sit on a seam in the course below where a bigger brick
 * could have bridged it. A placement that joins separate pieces of
 * the build (as clutch holds them) into one is rewarded on top. Ahead of
 * the score, within the height, comes what holds: each placement is
 * charged the loose bricks it commits the build to — one if it has nothing
 * under it and nothing over it (it is loose whatever else is laid), plus
 * one for every cell beside it that it strands, leaving no held placement
 * to cover it — and the fewest wins, then a held placement over one held
 * by nothing, then the score. A brick that does not fit anywhere is refused
 * naming the cell, which is the case of a catalogue with no 1x1 plate.
 *
 * WHERE THE GREEDY STILL LAYS A BRICK HELD BY NOTHING, A SEARCH TAKES OVER.
 * One placement ahead cannot see a trap set two or more back — an early
 * plate that took the grip a later cell needed. So a course that comes out
 * with such a brick is laid again, the region around the brick (its
 * material's cells of the course, joined side to side) packed by an exact
 * search for a packing that holds every brick: the held placements only, a
 * cover count per cell so a placement that strands any cell of the region
 * is dropped at once, conflict-directed backjumping so a failure returns
 * to the placement to blame rather than the last one, in scan order first
 * (the greedy's own choices wherever they hold) and then from the cell the
 * fewest placements cover. Where that runs out, `settle` asks two things
 * the search is blind to: a parity count that proves no held packing
 * exists, and a packing by straight cuts into held rectangles. All of it
 * is budgeted in counted steps (`brickHoldBudget.ts`), never in time, and
 * what none of it settled is laid by the greedy as before. The course is
 * laid again only from the first cell of its new regions, and after that
 * cell the earlier laying's brick is kept wherever nothing the greedy
 * reads can have changed, so the cost is the region's, not the course's.
 * A course with nothing held by nothing is never searched, so walls and
 * every build the greedy already held are packed byte for byte as without
 * it.
 *
 * A BRICK CAN BE HELD AND STILL HANG FROM NOTHING. Every course the search
 * finishes holds each of its bricks, but a group of bricks can hold each
 * other across two or more courses — a floor's edge row under a roof's edge
 * column — with none of them standing on anything that reaches the table,
 * and no look at one course sees that. So the finished build is asked what
 * brickConnectivity asks: the pieces stud clutch makes, and whether each
 * holds a brick of the bottom course. A FLOATING piece is repaired by taking
 * the build back to one of its courses, lowest first, and laying it again
 * from there with the regions round the piece's bricks packed by the same
 * search under one more demand: a brick over a cell of the piece must also
 * stand on a brick of a piece that reaches the table. A repair is kept only
 * if the build it makes, asked again, floats fewer bricks; otherwise the
 * build is put back exactly as it was. It is budgeted in cells laid again,
 * and a build with nothing floating never gets past the question, so it is
 * packed byte for byte as without it.
 *
 * It is whole-input for the reason every packing is: a brick spans cells,
 * so cooked over half the boxes it would cut bricks at the half. No seed and
 * no randomness — the scan order and the catalogue order decide everything,
 * and which box owns a cell where two overlap is decided by point identity.
 */
import type { Attribute, Geometry } from "../data/index.js";
import { attributeNotFound } from "../data/attributeNotFound.js";
// Directly, not through `../data/index.js`: identity is internal to the
// library (see that module's header), and every identity-keyed node in the
// standard library reaches it the same way.
import { canonicalPointRanks } from "../data/identity.js";
import { deriveGeometry } from "../data/derive.js";
import { makeGeometryItem } from "../graph/index.js";
import { holdBudget, holdRelay } from "./brickHoldBudget.js";
import { standardNode } from "./registry.js";
import { CANCEL_STRIDE, gatherPoints, optionalGeometry, requireGeometry, requireReportSlot } from "./util.js";
import type {
  BrickConnectivityInputs,
  BrickConnectivityOutputs,
  BrickConnectivityParams,
  PackBricksInputs,
  PackBricksOutputs,
  PackBricksParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { BrickConnectivityParams, PackBricksParams } from "./params.generated.js";

/** Named once; every message in this file leads with it. */
const NODE = "packBricks";

/**
 * How far a corner may sit from a lattice plane, in CELLS, and still be
 * read as on it. The boxes arrive in world units through f32 columns, and a
 * plate of 0.4 times 37 is 14.8000002 in f32 — a corner the author put on
 * the lattice exactly. A ten-thousandth of a cell is far above that
 * rounding and far below any offset somebody meant.
 */
const SNAP = 1e-4;

/**
 * The most lattice cells the occupancy grid may span: 16.7 million, 64 MB
 * of the two Int32 columns it carries. The grid is DENSE over the boxes'
 * joint extent, so two small boxes far apart cost the whole span between
 * them; that is refused by size rather than allowed to exhaust memory.
 */
const MAX_CELLS = 1 << 24;

/** Column names this node writes on both outputs. */
const BRICK_ATTR = "brick";
const BRICK_INDEX_ATTR = "brickIndex";
/** On `studs` only: the brick (an index into `out`) a stud stands on, and
 * the one resting on it, -1 for none. */
const STUD_ON_ATTR = "brickId";
const STUD_UNDER_ATTR = "brickAbove";
/** On `out`, DETAIL, only where the hold search ran: what it found. */
const HOLD_ATTR = "holdSearch";
/** On `out`, DETAIL, only where a floating piece was found: what the ground repair did. */
const GROUND_ATTR = "groundRepair";

/**
 * The default catalogue as flat [w, d, h] triples: w studs along x, d studs
 * along z, h plates tall, in the brick's own frame. Full-height bricks are
 * three plates, and a 1x1 plate closes the list so any occupancy can be
 * covered. The plates run to 2x16 because a floor laid over an empty room
 * is held only by the plates that reach a wall: with 2x8 the longest, a
 * house's upper floors came out with loose plates in the middle.
 */
const DEFAULT_BRICKS: readonly number[] = [
  2, 8, 3, 2, 6, 3, 2, 4, 3, 2, 3, 3, 2, 2, 3, 1, 8, 3, 1, 6, 3, 1, 4, 3, 1, 3, 3, 1, 2, 3, 1, 1, 3,
  2, 16, 1, 2, 12, 1, 2, 10, 1, 2, 8, 1, 2, 6, 1, 2, 4, 1, 2, 3, 1, 2, 2, 1, 1, 12, 1, 1, 10, 1, 1, 8, 1,
  1, 6, 1, 1, 4, 1, 1, 3, 1, 1, 2, 1, 1, 1, 1,
];

/**
 * How many times one course may be laid again: once for the regions its
 * first laying left a brick held by nothing in, and again only for a region
 * a relaying newly left one in (a solved region changes the pieces the
 * greedy weighs elsewhere in the course).
 */
const HOLD_ROUNDS = 3;
/** A region's state in the hold search. */
const PENDING = 0;
const SOLVED = 1;
const NONE = 2;
const LEFT = 3;
/**
 * The most rectangles the cut tiling of `settle` memoises, a byte each: a
 * region whose bounding box is w x d has w^2 d^2 of them, so this admits a
 * box of 2048 cells, 45 x 45 or 32 x 64. A larger one is not asked.
 */
const CUT_MEMO = 1 << 22;

/** The cells of one course the hold search packs as one problem. */
interface Region {
  /** Cell indices z * nx + x in the course, ascending: scan order. */
  readonly cells: Int32Array;
  /** The material, and the height of the brick the greedy left loose. */
  readonly g: number;
  readonly h: number;
  state: number;
  /**
   * Whether the region holds a cell of a floating piece the GROUND repair
   * is attaching: a placement over such a cell must also stand on a brick
   * of a piece that reaches the table (see "attaching floating pieces").
   */
  readonly ground: boolean;
}

/**
 * Whether a placement over [ax, bx) x [az, bz) of a course stands firm for
 * the ground repair: it covers no cell of the floating piece, or it covers a
 * cell standing on a brick of a piece that reaches the table.
 */
type Firm = (ax: number, az: number, bx: number, bz: number) => boolean;

/** One way of placing a catalogue entry: as listed, or a quarter turn. */
interface Candidate {
  /** Index of the entry in `bricks`. */
  readonly index: number;
  /** Footprint along x and z on the lattice, after the turn. */
  readonly fx: number;
  readonly fz: number;
  readonly h: number;
  /** Footprint in studs: what the seam cost is weighed against. */
  readonly area: number;
  readonly turned: boolean;
}

/**
 * Turns a catalogue of boxes on a stud lattice into the bricks that build
 * them, plus the studs left showing on top.
 */
export const packBricks = standardNode<PackBricksParams, PackBricksInputs, PackBricksOutputs>({
  type: NODE,
  category: "point op",
  description:
    "Reads axis-aligned BOXES on a stud lattice — one per point, its corners in two point attributes — and writes the BRICKS that build them: one point per brick, from a stated catalogue of footprints, that together fill exactly the lattice cells the boxes cover. The lattice is `pitch` in world units per cell (a stud is 1 across, a plate 0.4 tall, by default), anchored at `origin`; x and z count studs and y counts plates. Every corner must land on the lattice, and one that does not is refused naming the point and the corner, because a box half a stud off is a box the graph upstream built on a different lattice. Boxes may overlap: their cells are unioned, and a cell two boxes claim belongs to the one with the lower point IDENTITY (stored position bits plus `seed`), never the lower array index, so shuffling the input changes nothing — unless two overlapping boxes share both P and `seed`, which identity cannot tell apart, and then the earlier one in the input wins. WHAT A BRICK MAY NOT CROSS is `groupBy`: cells whose boxes differ in any listed attribute are different material and never share a brick, so a wall's colour changes exactly where its boxes' colour does. Each brick carries every point attribute of the box that owns its anchor cell. THE PACKING IS A SCANLINE GREEDY, course by course from the bottom and within a course in z then x. The first unfilled cell of a scan is always the minimum corner of the brick that covers it, so the scan is complete without backtracking; the choice there is WHICH catalogue entry, either way round. HEIGHT COMES FIRST: the tallest entry that fits is the course, so a wall is laid in full bricks and plates appear only where the space is shorter than a brick. Among footprints of that height the score is the footprint in studs less `stagger` for every stud of joint in the brick's bottom course that sits directly on a seam in the course below, counted only on the joints the placement decides — where the cell across is the same material and not yet filled — a running bond, the reason real walls hold together, charged only where a different brick could have avoided it — PLUS `bond` for every two separate pieces the placement joins into one, which is what keeps a floor or a roof laid over an empty room from coming out as loose plates (pieces as stud clutch holds them; see `islandsAttr`). AHEAD OF THAT SCORE, WITHIN THE HEIGHT, COMES WHAT HOLDS. A brick is gripped only through its top and bottom faces, so a placement with no brick under its footprint and no cell to be filled over it — a plate in the middle of a one-plate floor, over an empty room and under another — is loose in every build order. A placement that would leave a cell beside it with no HELD placement left to cover it STRANDS the cell: whatever brick covered it would be loose too. So each placement is charged the loose bricks it commits the build to — one if it is held by nothing, plus one for every cell it strands — and the fewest wins, then a held placement over one held by nothing, then the score. Both charges only ever decide where a course has cells with nothing under or over them; a wall, or anything standing on what is below it, packs by the score alone. Ties go to the larger footprint, then the earlier catalogue entry, then the entry as listed rather than turned. If nothing fits — a catalogue with no 1x1 plate meeting a one-plate gap — the cell is refused by name rather than left empty, so the output always covers the input exactly. THE HOLD SEARCH answers what that one-placement look cannot see: a trap set two or more placements back, an early brick that took the grip a later cell needed. Wherever a course comes out with a brick held by nothing, that course is laid again with each REGION around such a brick — the course's cells of that material that were unfilled when the course began, joined side to side — packed by an EXACT search for a packing in which every brick is held: depth first over the held placements alone, first in scan order and then from the cell the fewest of them cover, each cell's placements tried by the same score, a placement dropped the moment it leaves a cell of the region with no held placement over it, and a failure going straight back to the latest placement to blame for it. Its first answer is the greedy's own choice wherever that choice holds. It is bounded in STEPS of work, never in time, so the result is the same on every machine and under any load: " + String(holdBudget.region) + " per region and " + String(holdBudget.cook) + " per cook, a few milliseconds for the regions a generated house has and some 30 ms at the bound. Where it runs out, two more answers are asked, each exact and each bounded in steps of its own (" + String(holdBudget.parity) + " and " + String(holdBudget.cuts) + " per region, " + String(holdBudget.settle) + " per cook): a PARITY proof — if no set of held placements covers every cell of the region an odd number of times, no packing holds every brick, which is what rules out a one-plate floor walled round whose middle every plate reaches only by an even length, a 21 x 21 slab among them — and a packing by STRAIGHT CUTS — the region's bounding box cut across, again and again, into rectangles each empty or one held catalogue entry — which finds the baseplate-and-strips packings of a big walled slab that a search laying one brick at a time from a corner does not reach. A region proven to have no held packing (a cell no held brick can reach is the usual proof, the parity count the next most common), one nothing answered within its budget, and one that mixes brick heights are laid by the greedy as before — byte for byte in a course where no region was solved; where one was, its bricks can join pieces the greedy weighs elsewhere in the course. The course is laid again only from the first cell of its new regions, every brick before it kept, and a brick after it is weighed again only where something the greedy reads there — the course's cells round it, the pieces under it — can differ from the laying before; everywhere else the earlier choice stands, so the course comes out brick for brick as laying all of it again would. A course with no brick held by nothing is never searched, so it packs exactly as the greedy alone does. Where the search ran on a course as laid (the regions the ground repair below asks for are its own, and counted there), `out` carries a DETAIL u32 `holdSearch` of four counts — regions searched, solved, proven to have no held packing, and left to the greedy unproven (budget spent, or heights mixed) — and where it never ran there is no such attribute. A BRICK CAN BE HELD AND STILL HANG FROM NOTHING: bricks that hold each other across two or more courses — a floor's edge row under a roof's edge column — with none of them standing on anything that reaches the bottom course, which no look at one course sees. So the finished build is asked what brickConnectivity asks for step -1: the pieces stud clutch makes, and whether each holds a brick of the bottom course. A piece that does not is FLOATING, and is repaired course by course, its lowest first: the build is taken back to that course and laid again from it, with the regions round the piece's bricks there packed by the hold search under one more demand — a brick over a cell of the piece must also cover a cell standing on a brick of a piece that already reaches the bottom course — and every course above laid on that as usual. A repair is kept only if the build it makes, asked again, floats fewer bricks; otherwise the build is put back exactly as it was. A course where a brick of the piece lies in a region the hold search came back from without a held packing is not asked (a firm packing is a held one). Each course asked costs every cell from it up, against a budget of " + String(holdBudget.ground) + " cells per cook, never time. Where something floated, `out` carries a DETAIL u32 `groundRepair` of six counts — floating pieces and their bricks before the repair, the same after it (as asked of the finished build, never assumed), courses asked, and repairs kept — and where nothing floated there is no such attribute and the build is packed exactly as without the repair. OUTPUT `out`: one point per brick in scan order. P is the brick's centre, `rot` a quarter turn about y when the entry was placed turned (identity otherwise), and `scale` its full extents in its OWN frame — w and d studs and h plates as listed, in world units — so a unit box copied onto these points draws every brick in place. `boundsMin`/`boundsMax` are its world corners, the same convention it reads. `brick` (string) is the entry as `WxDxH`, ready to be spawnInstances' `assetAttr`, and `brickIndex` (i32) is its position in the catalogue — `bricks` followed by `extraBricks`. OUTPUT `studs`: one point per stud left SHOWING — on a brick's top where the lattice cell above is empty — at the stud's base centre on the brick's top face, carrying the brick's attributes and its `brick`/`brickIndex`, plus `brickId` and `brickAbove` (the indices in `out` of the brick it stands on and the brick resting on it, -1 for none; see `studMode`, which can ask for every stud instead), with identity `rot` and unit `scale`, so a stud mesh modelled at world size with its base at the origin spawns straight onto it; the bounds columns are reset to zero. `islandsAttr` optionally writes a DETAIL u32 on `out` counting the pieces the build falls into when only stud CLUTCH holds it — a brick is joined to the bricks sitting on its top face where their footprints overlap, and side contact does not count, so a value above 1 is a build that comes apart when lifted. HALO: none. A brick spans cells, so cooked over part of the boxes it cuts bricks at the part's edge; this belongs on an unbounded level or before a split. Not GPU-eligible: the packing is sequential by construction. The occupancy grid is dense over the boxes' joint extent and refused past 16.7 million cells.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [
    { name: "out", kind: "geometry" },
    { name: "studs", kind: "geometry" },
  ],
  params: {
    minAttr: {
      type: "string",
      default: "boundsMin",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each box's minimum corner in WORLD units — the absolute corner, not an offset from P, which is what setBounds writes. Converted to lattice cells through `pitch` and `origin` and refused, naming the point, unless every component lands on a lattice plane.",
    },
    maxAttr: {
      type: "string",
      default: "boundsMax",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each box's maximum corner in world units, on the same terms as `minAttr`. A box with a maximum below its minimum on any axis is refused; one with zero extent on an axis covers no cells and is skipped.",
    },
    pitch: {
      type: "vec3",
      default: [1, 0.4, 1],
      description:
        "World size of one lattice cell: [stud, plate, stud]. The default is the proportion of the familiar toy brick, a plate being 0.4 of a stud's width and a full brick three plates. x and z must be EQUAL, because a stud is square and a brick turned a quarter turn has to land on the same lattice it left; every component must be positive.",
    },
    origin: {
      type: "vec3",
      default: [0, 0, 0],
      description:
        "World position of a lattice corner. Corners are read as origin + k * pitch for whole k on each axis, so a set of boxes built on integer studs but shifted by half a stud is packed by moving this, not the boxes.",
    },
    bricks: {
      type: "numberList",
      default: DEFAULT_BRICKS,
      description:
        "The CATALOGUE, as a flat list of [w, d, h] triples: w studs along x, d studs along z, h plates tall, all whole numbers of at least 1, in the brick's own frame. Each entry may also be placed a quarter turn about y (d along x, w along z), so [1, 4, 3] and [4, 1, 3] are the same brick and listing both is refused. The ORDER is the last tie-break: two entries of equal height, footprint and seam cost go to the earlier one. The default holds the common full-height bricks (h 3) from 1x1 to 2x8, and plates (h 1) from 1x1 to 2x16. Without [1, 1, 1] some occupancies cannot be covered at all — a gap one plate tall and one stud wide — and the cook is refused at the first such cell rather than leaving it empty. To ADD to this list rather than replace it, leave it alone and use `extraBricks`.",
    },
    extraBricks: {
      type: "numberList",
      default: [],
      description:
        "More catalogue entries, APPENDED to `bricks` — the default list or a given one — in the same flat [w, d, h] form and on the same terms: whole numbers of at least 1, either way round. This is how a graph asks for the default catalogue plus one baseplate, [32, 32, 1], without copying the 81 numbers of the default. Appended entries come AFTER every `bricks` entry, so they lose the last tie-break to it, and their `brickIndex` continues the count: the first is entry bricks.length / 3. AN ENTRY ALREADY IN THE CATALOGUE IS REFUSED, not skipped — one in `bricks` (either way round) or earlier in `extraBricks` — naming both entries, because a brick listed twice is a list that did not say what its author thought it said, and skipping it would move every later `brickIndex` silently. Empty (the default) adds nothing.",
    },
    groupBy: {
      type: "stringList",
      default: [],
      description:
        "POINT attributes whose values a brick may not cross: two cells whose owning boxes differ in ANY listed attribute (any type, every component compared exactly; strings by value) never share a brick. Typically the colour and the kind — a window's glass is not one brick with the wall around it. Empty (the default) packs every cell as one material. A name the input does not carry is refused, listing what it does carry.",
    },
    stagger: {
      type: "f32",
      default: 3,
      min: 0,
      description:
        "The cost, in studs of footprint, of one stud of JOINT in a placement's bottom course that sits directly on a seam in the course below — a joint edge where the two cells beneath it belong to different bricks. Only the joints the placement DECIDES count — where the cell across is the SAME material and not yet filled, so a different brick could still have bridged it: a joint against another colour, empty space or a brick already standing is one every candidate shares, and charging for it would only favour short bricks. Height is not traded against it — the tallest entry that fits is chosen first — so this decides among footprints of one height. At the default of 3 a 1x8 whose end continues a seam scores 8 - 3 = 5 and loses to an unbroken 1x6 at 6, and a 2x8 with both studs of its end on a seam scores 10 against a 2x6's 12; a 1x2 on a seam (-1) loses to a 1x1 (1). 0 packs largest-first and lets seams run straight up a wall.",
    },
    bond: {
      type: "f32",
      default: 16,
      min: 0,
      description:
        "The reward, in studs of footprint, for every two separate PIECES a placement joins into one — pieces as stud clutch alone holds them, every piece already standing on the bottom course counting as one (the table holds those together). A plate laid over an empty room touches nothing below and starts a piece of its own; it is held only if something in a course above bridges it to the rest, and this is what makes the packer choose that bridge. Height is still chosen first and the join is weighed against `stagger` within it, so a wall, where everything below is already standing, packs exactly as with 0. The default of 16 is a 2x8 plate's worth: measured over forty generated houses, 0 left 378 bricks that no build order could attach and 5 houses in one piece; with the longer default plates 220 and 11; adding a bond of 16 brought that to 24 bricks and 34 houses, and no value above it did better than 22. 0 ignores what holds together.",
    },
    studMode: {
      type: "enum",
      enum: ["exposed", "all"],
      default: "exposed",
      description:
        "Which studs the `studs` output carries. 'exposed' (the default) is the finished build: only studs with nothing resting on them. 'all' is every stud of every brick's top face, whether or not a brick sits on it — what a PARTIAL build shows, since a stud is covered only once the brick above it is placed. Either way each stud carries `brickId`, the index in `out` of the brick it stands on, and `brickAbove`, the index of the brick resting on it or -1; wire this pin into brickConnectivity's `studs` input and it writes both steps onto each stud — `step`, of the brick it stands on, and `stepAbove`, of the brick resting on it (-1 for none or for one never attached) — so 'stud is showing after step t' is `step` >= 0 and `step` <= t and (`stepAbove` < 0 or `stepAbove` > t).",
    },
    islandsAttr: {
      type: "string",
      default: "",
      description:
        "Optional DETAIL attribute (u32) on `out` receiving how many separate pieces the bricks form when only stud clutch holds them together: a brick joins every brick sitting directly on its top face with an overlapping footprint, and side-by-side contact does not join. 1 is a build that lifts as one piece. Empty (the default) writes nothing.",
    },
  },
  execute({ inputs, params, checkCancelled }) {
    // Params before geometry, the house order: a bad param reported
    // against the data sends an author to debug the wrong thing.
    const { minAttr, maxAttr, groupBy, islandsAttr } = params;
    // Decided once: the enum never reaches the stud loop as a string.
    const allStuds = params.studMode === "all";
    const { pitch, origin } = readLattice(NODE, params);
    const stagger = params.stagger;
    if (!Number.isFinite(stagger) || stagger < 0) {
      throw new Error(`${NODE}: param "stagger" is ${stagger}; it is a cost and must be finite and at least 0 (0 lets seams run)`);
    }
    const bond = params.bond;
    if (!Number.isFinite(bond) || bond < 0) {
      throw new Error(`${NODE}: param "bond" is ${bond}; it is a reward and must be finite and at least 0 (0 ignores what holds together)`);
    }
    const catalogue = readCatalogue(params.bricks, params.extraBricks);
    const seenGroup = new Set<string>();
    for (const name of groupBy) {
      if (name === "") {
        throw new Error(`${NODE}: param "groupBy" holds an empty name; list point attribute names, e.g. ["color"]`);
      }
      if (seenGroup.has(name)) {
        throw new Error(`${NODE}: param "groupBy" names "${name}" twice; each attribute is compared once`);
      }
      seenGroup.add(name);
    }

    const src = requireGeometry(inputs, "in", NODE);
    const pts = src.attrs.point;
    for (const [name, type] of [
      [BRICK_ATTR, "string"],
      [BRICK_INDEX_ATTR, "i32"],
      [STUD_ON_ATTR, "i32"],
      [STUD_UNDER_ATTR, "i32"],
    ] as const) {
      const existing = pts.get(name);
      if (existing !== undefined && (existing.type !== type || existing.tupleSize !== 1)) {
        throw new Error(
          `${NODE}: the input carries a point attribute "${name}" (${existing.type}, tuple size ${existing.tupleSize}), and this node writes "${name}" as ${type} with tuple size 1; remove it upstream with removeAttribute, or carry it under another name`,
        );
      }
    }
    const n = pts.count;
    const loCol = cornerColumn(NODE, src, minAttr, "minAttr");
    const hiCol = cornerColumn(NODE, src, maxAttr, "maxAttr");
    const groupCols = groupBy.map((name) => {
      const col = pts.get(name);
      if (col === undefined) {
        throw attributeNotFound(src, "point", name, { prefix: `${NODE}: `, param: "groupBy" });
      }
      return col;
    });

    // ---- boxes to lattice cells ---------------------------------------
    const cellLo = new Int32Array(n * 3);
    const cellHi = new Int32Array(n * 3);
    const solid = new Uint8Array(n);
    const gMin = [Infinity, Infinity, Infinity];
    const gMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      let empty = false;
      for (let c = 0; c < 3; c++) {
        const a = toCell(NODE, loCol.get(i, c), c, i, minAttr, pitch, origin);
        const b = toCell(NODE, hiCol.get(i, c), c, i, maxAttr, pitch, origin);
        if (b < a) {
          throw new Error(
            `${NODE}: point ${i} has ${maxAttr}.${"xyz"[c]} below ${minAttr}.${"xyz"[c]} (${hiCol.get(i, c)} < ${loCol.get(i, c)}); a box's maximum corner must not be under its minimum — check which column is which`,
          );
        }
        if (b === a) empty = true;
        cellLo[i * 3 + c] = a;
        cellHi[i * 3 + c] = b;
      }
      if (empty) continue;
      solid[i] = 1;
      for (let c = 0; c < 3; c++) {
        gMin[c] = Math.min(gMin[c] as number, cellLo[i * 3 + c] as number);
        gMax[c] = Math.max(gMax[c] as number, cellHi[i * 3 + c] as number);
      }
    }

    const owners: number[] = [];
    for (let i = 0; i < n; i++) if (solid[i] === 1) owners.push(i);
    if (owners.length === 0) {
      return emptyOutputs(src, islandsAttr);
    }
    const x0 = gMin[0] as number;
    const y0 = gMin[1] as number;
    const z0 = gMin[2] as number;
    const nx = (gMax[0] as number) - x0;
    const ny = (gMax[1] as number) - y0;
    const nz = (gMax[2] as number) - z0;
    const total = nx * ny * nz;
    if (total > MAX_CELLS) {
      throw new Error(
        `${NODE}: the boxes span ${nx} x ${ny} x ${nz} = ${total} lattice cells, above the limit of ${MAX_CELLS}; the occupancy grid is dense over their joint extent, so pack separate builds separately (partitionByAttribute) or check "pitch" — a pitch ten times too small is a grid a thousand times too large`,
      );
    }

    // ---- groups: one small integer per distinct material -------------
    const group = new Int32Array(n);
    if (groupCols.length > 0) {
      const isString = groupCols.map((col) => col.type === "string");
      const keys = new Map<string, number>();
      for (const i of owners) {
        const parts: (string | number)[] = [];
        for (let g = 0; g < groupCols.length; g++) {
          const col = groupCols[g] as Attribute;
          for (let c = 0; c < col.tupleSize; c++) {
            parts.push(isString[g] === true ? col.getString(i, c) : col.get(i, c));
          }
        }
        const key = JSON.stringify(parts);
        let id = keys.get(key);
        if (id === undefined) {
          id = keys.size;
          keys.set(key, id);
        }
        group[i] = id;
      }
    }

    // ---- occupancy: the lowest identity claims a shared cell ---------
    const rank = canonicalPointRanks(src, NODE);
    owners.sort((a, b) => (rank[a] as number) - (rank[b] as number));
    const owner = new Int32Array(total).fill(-1);
    const sxz = nx * nz;
    const at = (x: number, y: number, z: number): number => y * sxz + z * nx + x;
    let work = 0;
    for (const i of owners) {
      if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const ax = (cellLo[i * 3] as number) - x0;
      const ay = (cellLo[i * 3 + 1] as number) - y0;
      const az = (cellLo[i * 3 + 2] as number) - z0;
      const bx = (cellHi[i * 3] as number) - x0;
      const by = (cellHi[i * 3 + 1] as number) - y0;
      const bz = (cellHi[i * 3 + 2] as number) - z0;
      for (let y = ay; y < by; y++) {
        for (let z = az; z < bz; z++) {
          for (let x = ax; x < bx; x++) {
            const k = at(x, y, z);
            if (owner[k] === -1) owner[k] = i;
          }
        }
      }
    }
    const cellGroup = new Int32Array(total).fill(-1);
    for (let k = 0; k < total; k++) {
      const o = owner[k] as number;
      if (o >= 0) cellGroup[k] = group[o] as number;
    }

    // ---- the scan ----------------------------------------------------
    const brickOf = new Int32Array(total).fill(-1);
    const bx: number[] = [];
    const by: number[] = [];
    const bz: number[] = [];
    const bCand: Candidate[] = [];
    const bOwner: number[] = [];
    // The pieces placed bricks form so far, for `bond`: a union-find over
    // brick ids whose roots know whether the piece reaches the table (the
    // bottom course). Bricks join the bricks they sit on as they are placed,
    // so a piece is only ever as connected as what lies BELOW the scan.
    const up: number[] = [];
    const grounded: number[] = [];
    // Off while the hold search lays bricks it may lift again: a union it
    // undoes would leave compressed paths pointing at the wrong root. A
    // piece's root is its lowest brick id either way (unions keep the lower
    // root), so the answer does not depend on it.
    let compress = true;
    const pieceOf = (i: number): number => {
      let r = i;
      while ((up[r] as number) !== r) r = up[r] as number;
      if (!compress) return r;
      while ((up[i] as number) !== r) {
        const next = up[i] as number;
        up[i] = r;
        i = next;
      }
      return r;
    };
    const roots: number[] = [];
    // How many pieces resting under a placement it would join into one,
    // counting every piece already on the table as one piece (the table
    // holds them together), less one: 0 for a brick on a single piece or on
    // nothing, 1 for a brick bridging two, and so on. Fills `roots`.
    const joins = (x: number, y: number, z: number, cand: Candidate): number => {
      roots.length = 0;
      if (y === 0) return 0;
      let table = false;
      for (let zz = z; zz < z + cand.fz; zz++) {
        for (let xx = x; xx < x + cand.fx; xx++) {
          const b = brickOf[at(xx, y - 1, zz)] as number;
          if (b < 0) continue;
          const r = pieceOf(b);
          if (grounded[r] === 1) table = true;
          else if (!roots.includes(r)) roots.push(r);
        }
      }
      return Math.max(0, roots.length + (table ? 1 : 0) - 1);
    };
    // Below the bottom course every cell is "not a seam": nothing is there.
    const seamBelow = (y: number, ax: number, az: number, cx: number, cz: number): boolean => {
      if (y === 0) return false;
      const a = brickOf[at(ax, y - 1, az)] as number;
      const b = brickOf[at(cx, y - 1, cz)] as number;
      return a >= 0 && b >= 0 && a !== b;
    };
    const fits = (x: number, y: number, z: number, cand: Candidate, g: number): boolean => {
      if (x + cand.fx > nx || z + cand.fz > nz || y + cand.h > ny) return false;
      for (let yy = y; yy < y + cand.h; yy++) {
        for (let zz = z; zz < z + cand.fz; zz++) {
          for (let xx = x; xx < x + cand.fx; xx++) {
            const k = at(xx, yy, zz);
            if (cellGroup[k] !== g || (brickOf[k] as number) >= 0) return false;
          }
        }
      }
      return true;
    };
    // The joints a placement DECIDES: faces of its bottom course whose
    // outside cell is the same material AND not yet filled, so a different
    // brick could still have bridged it — charged when the two cells below
    // belong to different bricks. A face against a brick already standing
    // (one placed earlier in this course, or a taller one rising from
    // below) is a joint every candidate has; so is one against another
    // material or empty space. Charging those penalised long and deep
    // bricks by the stud: against a party wall of another colour the
    // shortest brick always won, and charging the scan's already-filled
    // side cost 9% more bricks over forty houses for a WORSE bond (22% of
    // head joints running straight against 15%).
    // HELD: whether a placement can ever be gripped by anything. Clutch is
    // vertical only, so a brick with no brick under its footprint and no
    // cell to be filled over it is a piece of its own whatever else is
    // laid, and no build order can attach it. A floor over an empty room
    // is where that bites: the room below is empty, the room above is
    // empty, and a plate in the middle reaches neither wall.
    const held = (x: number, y: number, z: number, cand: Candidate): boolean => {
      if (y === 0) return true;
      const top = y + cand.h;
      for (let zz = z; zz < z + cand.fz; zz++) {
        for (let xx = x; xx < x + cand.fx; xx++) {
          if ((brickOf[at(xx, y - 1, zz)] as number) >= 0) return true;
          if (top < ny && (owner[at(xx, top, zz)] as number) >= 0) return true;
        }
      }
      return false;
    };
    // A cell of this course that only a brick reaching past it can hold:
    // unfilled, of the material g, nothing standing under it and nothing
    // to come over it at height h.
    const needy = (xx: number, y: number, zz: number, h: number, g: number): boolean => {
      if (y === 0 || xx < 0 || zz < 0 || xx >= nx || zz >= nz) return false;
      const k = at(xx, y, zz);
      if (cellGroup[k] !== g || (brickOf[k] as number) >= 0) return false;
      if ((brickOf[at(xx, y - 1, zz)] as number) >= 0) return false;
      return !(y + h < ny && (owner[at(xx, y + h, zz)] as number) >= 0);
    };
    // Where course y's bricks of height h can be gripped — a brick under
    // the cell or a cell to be filled over it — as a prefix sum over x and
    // z, so a window is asked "any grip in here?" at once. Built when a
    // course first asks, and only then.
    const gripSum = new Int32Array((nx + 1) * (nz + 1));
    let gripY = -1;
    let gripH = -1;
    const grips = (y: number, h: number): void => {
      if (gripY === y && gripH === h) return;
      gripY = y;
      gripH = h;
      for (let zz = 0; zz < nz; zz++) {
        let run = 0;
        for (let xx = 0; xx < nx; xx++) {
          if ((brickOf[at(xx, y - 1, zz)] as number) >= 0 || (y + h < ny && (owner[at(xx, y + h, zz)] as number) >= 0)) run++;
          gripSum[(zz + 1) * (nx + 1) + xx + 1] = (gripSum[zz * (nx + 1) + xx + 1] as number) + run;
        }
      }
    };
    const anyGrip = (ax: number, az: number, bx: number, bz: number): boolean => {
      const a = Math.max(0, ax);
      const c = Math.max(0, az);
      const b = Math.min(nx, bx);
      const d = Math.min(nz, bz);
      if (b <= a || d <= c) return false;
      const w = nx + 1;
      return (gripSum[d * w + b] as number) - (gripSum[c * w + b] as number) - (gripSum[d * w + a] as number) + (gripSum[c * w + a] as number) > 0;
    };
    // Whether some HELD placement of height h still fits over the cell.
    // If none does, whatever brick covers it will be held by nothing.
    const holdable = (cx: number, y: number, cz: number, h: number, g: number): boolean => {
      grips(y, h);
      for (const cc of catalogue) {
        if (cc.h !== h) continue;
        // Every placement of this entry over the cell lies in this window;
        // with no grip anywhere in it, none of them is held.
        if (!anyGrip(cx - cc.fx + 1, cz - cc.fz + 1, cx + cc.fx, cz + cc.fz)) continue;
        for (let oz = 0; oz < cc.fz && cz - oz >= 0; oz++) {
          for (let ox = 0; ox < cc.fx && cx - ox >= 0; ox++) {
            if (fits(cx - ox, y, cz - oz, cc, g) && held(cx - ox, y, cz - oz, cc)) return true;
          }
        }
      }
      return false;
    };
    // Per anchor: whether each needy cell was holdable before any candidate,
    // keyed by height and cell. Per course: the cells found NOT holdable,
    // which stay that way — filling cells only ever takes placements away,
    // and nothing below the course or over it changes while it is laid.
    const holdableBefore = new Map<number, boolean>();
    const deadCourse = new Int32Array(sxz).fill(-1);
    const deadHeight = new Int32Array(sxz);
    const fill = (x: number, y: number, z: number, cand: Candidate, id: number): void => {
      for (let yy = y; yy < y + cand.h; yy++) {
        for (let zz = z; zz < z + cand.fz; zz++) {
          for (let xx = x; xx < x + cand.fx; xx++) brickOf[at(xx, yy, zz)] = id;
        }
      }
    };
    const watch: number[] = [];
    // STRANDS: how many needy cells just outside the placement it would
    // leave with no held placement to cover them, counting only cells that
    // had one before it. A stranded cell is a brick held by nothing, laid
    // later: the scan only fills cells, so its options never come back.
    const strands = (x: number, y: number, z: number, cand: Candidate, g: number): number => {
      if (y === 0) return 0;
      watch.length = 0;
      const consider = (cx: number, cz: number): void => {
        if (!needy(cx, y, cz, cand.h, g)) return;
        const c = cz * nx + cx;
        if (deadCourse[c] === y && deadHeight[c] === cand.h) return;
        const key = cand.h * sxz + c;
        let was = holdableBefore.get(key);
        if (was === undefined) {
          was = holdable(cx, y, cz, cand.h, g);
          holdableBefore.set(key, was);
          if (!was) {
            deadCourse[c] = y;
            deadHeight[c] = cand.h;
          }
        }
        if (was) watch.push(cx, cz);
      };
      for (let zz = z; zz < z + cand.fz; zz++) {
        consider(x - 1, zz);
        consider(x + cand.fx, zz);
      }
      for (let xx = x; xx < x + cand.fx; xx++) {
        consider(xx, z - 1);
        consider(xx, z + cand.fz);
      }
      if (watch.length === 0) return 0;
      // Laid for the question only, under the id it would take, and lifted.
      fill(x, y, z, cand, bCand.length);
      let count = 0;
      for (let i = 0; i < watch.length; i += 2) {
        if (!holdable(watch[i] as number, y, watch[i + 1] as number, cand.h, g)) count++;
      }
      fill(x, y, z, cand, -1);
      return count;
    };
    const open = (k: number, g: number): boolean => cellGroup[k] === g && (brickOf[k] as number) < 0;
    const alignedSeams = (x: number, y: number, z: number, cand: Candidate, g: number): number => {
      if (y === 0) return 0;
      let count = 0;
      const x1 = x + cand.fx - 1;
      const z1 = z + cand.fz - 1;
      for (let zz = z; zz <= z1; zz++) {
        if (x > 0 && open(at(x - 1, y, zz), g) && seamBelow(y, x, zz, x - 1, zz)) count++;
        if (x1 + 1 < nx && open(at(x1 + 1, y, zz), g) && seamBelow(y, x1, zz, x1 + 1, zz)) count++;
      }
      for (let xx = x; xx <= x1; xx++) {
        if (z > 0 && open(at(xx, y, z - 1), g) && seamBelow(y, xx, z, xx, z - 1)) count++;
        if (z1 + 1 < nz && open(at(xx, y, z1 + 1), g) && seamBelow(y, xx, z1, xx, z1 + 1)) count++;
      }
      return count;
    };

    // ---- laying bricks -------------------------------------------------
    // Per brick, whether laying it joined two pieces or more — what a
    // relaid course needs to know of the course it replaces (see `relay`).
    const bMerged: number[] = [];
    // Per brick, whether the greedy laid it in a region the hold search came
    // back from without a held packing — proven to have none, or left — which
    // the ground repair does not ask of again.
    const bUnsolved: number[] = [];
    // Per brick id, read at a piece's root: whether the piece may be joined
    // differently in a relaid course than in the course it replaces.
    const taint: number[] = [];
    // Joins brick `id` to the pieces it stands on; true when it joined any.
    const joinBelow = (id: number): boolean => {
      const x = bx[id] as number;
      const y = by[id] as number;
      const z = bz[id] as number;
      const cand = bCand[id] as Candidate;
      if (y === 0) return false;
      let merged = false;
      for (let zz = z; zz < z + cand.fz; zz++) {
        for (let xx = x; xx < x + cand.fx; xx++) {
          const b = brickOf[at(xx, y - 1, zz)] as number;
          if (b < 0) continue;
          const ra = pieceOf(id);
          const rb = pieceOf(b);
          if (ra === rb) continue;
          const r = Math.min(ra, rb);
          up[Math.max(ra, rb)] = r;
          grounded[r] = (grounded[ra] as number) | (grounded[rb] as number);
          taint[r] = (taint[ra] as number) | (taint[rb] as number);
          merged = true;
        }
      }
      return merged;
    };
    const lay = (x: number, y: number, z: number, cand: Candidate, o: number): number => {
      const id = bCand.length;
      fill(x, y, z, cand, id);
      bx.push(x);
      by.push(y);
      bz.push(z);
      bCand.push(cand);
      bOwner.push(o);
      up.push(id);
      grounded.push(y === 0 ? 1 : 0);
      taint.push(0);
      bMerged.push(joinBelow(id) ? 1 : 0);
      bUnsolved.push(0);
      return id;
    };
    // Lifts every brick from id `start` on — the last ones laid, all of
    // course y or above: course y's while it is relaid, every course from y
    // up when the ground repair lays them again — and rebuilds the pieces
    // of the rest. A piece's root is its lowest id, so the same unions
    // rebuild exactly the pieces there were; the strand cache is the
    // courses' and is forgotten with them.
    const unlay = (start: number, y: number): void => {
      for (let id = bCand.length - 1; id >= start; id--) {
        fill(bx[id] as number, by[id] as number, bz[id] as number, bCand[id] as Candidate, -1);
      }
      for (const list of [bx, by, bz, bCand, bOwner, up, grounded, taint, bMerged, bUnsolved] as unknown[][]) list.length = start;
      for (let id = 0; id < start; id++) {
        up[id] = id;
        grounded[id] = by[id] === 0 ? 1 : 0;
        taint[id] = 0;
      }
      for (let id = 0; id < start; id++) joinBelow(id);
      for (let c = 0; c < sxz; c++) if ((deadCourse[c] as number) >= y) deadCourse[c] = -1;
    };

    // ---- the hold search ---------------------------------------------
    // The greedy looks one placement ahead. A trap set two or more
    // placements back — a plate that took the grip a later cell needed —
    // it cannot see, and there it lays a brick held by nothing. Where it
    // does, and only there, the course is laid again (see "relaying a
    // course") with each REGION around such a brick — the cells of the
    // course of that material, unfilled when the course began, joined side
    // to side —
    // solved by an exact search for a packing in which every brick is held:
    // depth first over the held placements alone, trying the placements
    // over a cell by the greedy's own score, and dropping one the moment it
    // leaves any cell of the region with no held placement left to cover
    // it. It runs in scan order first, so the packing it finds is the
    // greedy's own choice at every anchor where that choice holds, and
    // then, if that has not finished, from the cell the fewest placements
    // cover. The search is bounded in STEPS, never in time, so the answer
    // is the same on every machine: past the budget it goes to `settle`,
    // and where the region has no held packing at all (a cell no held brick
    // can reach is the common proof), or nothing settled it, the region is
    // laid by the greedy as before.
    // Per cell of a course: its region, the catalogue entry the search
    // planned with its corner there, and its index within a region being
    // searched. Allocated the first time a course needs them, so a cook the
    // search never touches pays nothing for them.
    let regionOf = new Int32Array(0);
    let planOf = new Int32Array(0);
    let localOf = new Int32Array(0);
    const searchCells = (): void => {
      if (regionOf.length === sxz) return;
      regionOf = new Int32Array(sxz).fill(-1);
      planOf = new Int32Array(sxz).fill(-1);
      localOf = new Int32Array(sxz).fill(-1);
    };
    const touched: number[] = [];
    const regions: Region[] = [];
    /** Regions searched, solved, proven to have no held packing, and left to the greedy unproven. */
    const holdStats = [0, 0, 0, 0];
    let holdSpent = 0;
    // The ground repair's demand on one course (see "attaching floating
    // pieces"): the course, and per cell of it whether it is a cell of the
    // floating piece being attached, which only a placement standing on a
    // brick of a piece that reaches the table may cover. -1: no demand.
    let groundY = -1;
    let groundQ = new Uint8Array(0);
    // FIRM, for a course the repair asks of: a placement over a cell of the
    // floating piece must also cover a cell standing on a brick of a piece
    // that reaches the table. Pieces only ever grow upward as the scan lays
    // bricks, so a piece that reaches the table now reaches it in the
    // finished build, and so does every brick laid on it.
    const firmness = (y: number): Firm => {
      const w = nx + 1;
      const q = new Int32Array(w * (nz + 1));
      const f = new Int32Array(w * (nz + 1));
      for (let zz = 0; zz < nz; zz++) {
        let rq = 0;
        let rf = 0;
        for (let xx = 0; xx < nx; xx++) {
          if (groundQ[zz * nx + xx] === 1) rq++;
          const b = y > 0 ? (brickOf[at(xx, y - 1, zz)] as number) : -1;
          if (b >= 0 && grounded[pieceOf(b)] === 1) rf++;
          q[(zz + 1) * w + xx + 1] = (q[zz * w + xx + 1] as number) + rq;
          f[(zz + 1) * w + xx + 1] = (f[zz * w + xx + 1] as number) + rf;
        }
      }
      const sum = (t: Int32Array, ax: number, az: number, bx: number, bz: number): number =>
        (t[bz * w + bx] as number) - (t[az * w + bx] as number) - (t[bz * w + ax] as number) + (t[az * w + ax] as number);
      return (ax, az, bx, bz) => sum(q, ax, az, bx, bz) === 0 || sum(f, ax, az, bx, bz) > 0;
    };
    // Read once, so a cook runs on one set of budgets throughout.
    const budgets = { ...holdBudget };
    const partial = holdRelay.partial;
    // A region: the 4-connected cells of course y of the material of cell
    // c0, unfilled when the course began, around c0 — opened while the
    // course is still laid, so "unfilled then" is no brick or one of the
    // course's own, an id from `start` on.
    const openRegion = (c0: number, h: number, y: number, start: number): void => {
      const cx0 = c0 % nx;
      const g = cellGroup[at(cx0, y, (c0 - cx0) / nx)] as number;
      const rid = regions.length;
      const list = [c0];
      regionOf[c0] = rid;
      touched.push(c0);
      const admit = (cx: number, cz: number): void => {
        const c = cz * nx + cx;
        if ((regionOf[c] as number) >= 0) return;
        const kk = at(cx, y, cz);
        const b = brickOf[kk] as number;
        if (cellGroup[kk] !== g || (b >= 0 && b < start)) return;
        regionOf[c] = rid;
        touched.push(c);
        list.push(c);
      };
      for (let i = 0; i < list.length; i++) {
        const c = list[i] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        if (cx > 0) admit(cx - 1, cz);
        if (cx + 1 < nx) admit(cx + 1, cz);
        if (cz > 0) admit(cx, cz - 1);
        if (cz + 1 < nz) admit(cx, cz + 1);
      }
      list.sort((a, b) => a - b);
      let ground = false;
      if (groundY === y) for (const c of list) if (groundQ[c] === 1) ground = true;
      regions.push({ cells: Int32Array.from(list), g, h, state: PENDING, ground });
    };
    // ---- when the search runs out --------------------------------------
    // The search is exact but blind to two things a big one-height region
    // turns on: a COUNT that rules every packing out at once, and a packing
    // assembled from big rectangles that a depth-first search, laying one
    // brick at a time from a corner, reaches only after trying everything
    // a wrong first plate allows. Where it runs out (or never ran, the
    // cook's budget spent), `settle` asks both, each answer exact and each
    // budgeted in its own counted steps, never in time.
    //
    // PARITY. A held packing is a set of held placements covering every
    // cell once, so over GF(2) — counting modulo 2 — the placements' cell
    // sets sum to the whole region. If no set of held placements sums to
    // the region modulo 2, no packing holds every brick. That is decided by
    // elimination over bit rows: the placements, smallest first, kept as a
    // basis by lowest cell, and the whole region reduced against it. It is
    // the proof a slab one stud too wide for its plates has: a 21-stud
    // floor walled round, whose middle every plate reaches only by an even
    // length from the wall, leaves an odd block in the middle that plates
    // of even overlap cannot cover.
    //
    // CUTS. A rectangle of the region is packed if it is one held entry of
    // the catalogue, empty, or cut by a straight line across into two
    // rectangles that are packed — the guillotine packings, which every
    // pattern of strips and big plates the search fails to reach in a
    // walled slab is. Every rectangle of the region's bounding box is asked
    // at most once, the answer memoised, the cuts tried from the low side;
    // the first packing found is the plan. A packing it finds is exact (it
    // is checked by construction: entries of the catalogue, each held,
    // covering the region once); one it does not find may still exist, and
    // the region is then left to the greedy as before.
    let settleSpent = 0;
    const settle = (
      region: Region,
      y: number,
      pAt: number[],
      pCand: number[],
      first: number,
      last: number,
      firm: Firm | undefined,
    ): number => {
      const { cells, h } = region;
      const K = cells.length;
      const P = pAt.length;
      if (settleSpent >= budgets.settle) return LEFT;
      // PARITY, bit rows of K cells.
      let ops = 0;
      const limit = Math.min(budgets.parity, budgets.settle - settleSpent);
      const W = (K + 31) >>> 5;
      // Basis rows by their lowest cell, each with its highest nonzero word,
      // so a row is XORed only over the words it has: a placement's cells
      // lie within a few rows of the region, and so do the rows it meets.
      const basis: (Uint32Array | undefined)[] = new Array<Uint32Array | undefined>(K);
      const basisTop = new Int32Array(K);
      const v = new Uint32Array(W);
      let vTop = 0;
      // Reduces v from word `lo` on: the lowest cell with no basis row, -1
      // when v reduces to nothing, -2 past the budget.
      const reduce = (lo: number): number => {
        for (let w = lo; w <= vTop; w++) {
          while ((v[w] as number) !== 0) {
            const bit = (w << 5) + 31 - Math.clz32((v[w] as number) & -(v[w] as number));
            const row = basis[bit];
            if (row === undefined) return bit;
            const top = basisTop[bit] as number;
            for (let k = w; k <= top; k++) v[k] = (v[k] as number) ^ (row[k] as number);
            if (top > vTop) vTop = top;
            ops += top - w + 1;
            if (ops > limit) return -2;
          }
        }
        return -1;
      };
      // Smallest first: they reduce in a few words, and a region's grip
      // cells, each a held 1x1, come first and settle most of the basis.
      const order = Array.from({ length: P }, (_, p) => p);
      order.sort((a, b) => (catalogue[pCand[a] as number] as Candidate).area - (catalogue[pCand[b] as number] as Candidate).area || a - b);
      let rank = 0;
      let proof = 0;
      for (const p of order) {
        if (ops > limit) {
          proof = -1;
          break;
        }
        const c = cells[pAt[p] as number] as number;
        const px = c % nx;
        const pz = (c - px) / nx;
        const cc = catalogue[pCand[p] as number] as Candidate;
        let lo = W;
        vTop = 0;
        for (let zz = pz; zz < pz + cc.fz; zz++) {
          for (let xx = px; xx < px + cc.fx; xx++) {
            const li = localOf[zz * nx + xx] as number;
            v[li >>> 5] = (v[li >>> 5] as number) | (1 << (li & 31));
            lo = Math.min(lo, li >>> 5);
            vTop = Math.max(vTop, li >>> 5);
          }
        }
        ops += cc.area;
        const pivot = reduce(lo);
        if (pivot === -2) {
          proof = -1;
          break;
        }
        if (pivot >= 0) {
          let top = vTop;
          while (top > lo && (v[top] as number) === 0) top--;
          basis[pivot] = v.slice(0, top + 1);
          basisTop[pivot] = top;
          ops += top - lo + 1;
          v.fill(0, lo, vTop + 1);
          // Every cell its own sum: the region is in the span.
          if (++rank === K) break;
        }
      }
      if (proof === 0 && rank < K) {
        v.fill(0);
        for (let i = 0; i < K; i++) v[i >>> 5] = (v[i >>> 5] as number) | (1 << (i & 31));
        vTop = W - 1;
        const r = reduce(0);
        if (r === -2) proof = -1;
        else if (r >= 0) proof = 1;
      }
      settleSpent += ops;
      if (proof === 1) return NONE;
      // CUTS, over the bounding box [X0, X0 + w) x [Z0, Z0 + d).
      if (settleSpent >= budgets.settle) return LEFT;
      let X0 = nx;
      let X1 = 0;
      let Z0 = nz;
      let Z1 = 0;
      for (let i = 0; i < K; i++) {
        const c = cells[i] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        X0 = Math.min(X0, cx);
        X1 = Math.max(X1, cx + 1);
        Z0 = Math.min(Z0, cz);
        Z1 = Math.max(Z1, cz + 1);
      }
      const w = X1 - X0;
      const d = Z1 - Z0;
      // Memo by rectangle: one byte for each of w^2 d^2, so a box past 2048
      // cells is not asked.
      if (w * w * d * d > CUT_MEMO) return LEFT;
      const w1 = w + 1;
      const inside = new Int32Array(w1 * (d + 1));
      const gripped = new Int32Array(w1 * (d + 1));
      grips(y, h);
      for (let i = 0; i < K; i++) {
        const c = cells[i] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        const k = (cz - Z0 + 1) * w1 + cx - X0 + 1;
        inside[k] = 1;
        if (anyGrip(cx, cz, cx + 1, cz + 1)) gripped[k] = 1;
      }
      for (let zz = 1; zz <= d; zz++) {
        for (let xx = 1; xx <= w; xx++) {
          const k = zz * w1 + xx;
          inside[k] = (inside[k] as number) + (inside[k - 1] as number) + (inside[k - w1] as number) - (inside[k - w1 - 1] as number);
          gripped[k] = (gripped[k] as number) + (gripped[k - 1] as number) + (gripped[k - w1] as number) - (gripped[k - w1 - 1] as number);
        }
      }
      const sum = (t: Int32Array, ax: number, az: number, bx: number, bz: number): number =>
        (t[bz * w1 + bx] as number) - (t[az * w1 + bx] as number) - (t[bz * w1 + ax] as number) + (t[az * w1 + ax] as number);
      // The entry of the height with each footprint, -1 for none, and the
      // largest footprint of the height within each w x d.
      const entry = new Int32Array(w1 * (d + 1)).fill(-1);
      const most = new Int32Array(w1 * (d + 1));
      for (let ci = first; ci < last; ci++) {
        const cc = catalogue[ci] as Candidate;
        if (cc.fx <= w && cc.fz <= d) {
          entry[cc.fz * w1 + cc.fx] = ci;
          most[cc.fz * w1 + cc.fx] = cc.area;
        }
      }
      for (let zz = 1; zz <= d; zz++) {
        for (let xx = 1; xx <= w; xx++) {
          const k = zz * w1 + xx;
          most[k] = Math.max(most[k] as number, most[k - 1] as number, most[k - w1] as number);
        }
      }
      const memo = new Uint8Array(w * w * d * d);
      const key = (ax: number, az: number, bx: number, bz: number): number => ((ax * w + bx - 1) * d + az) * d + bz - 1;
      const climit = Math.min(budgets.cuts, budgets.settle - settleSpent);
      let cops = 0;
      // Whether [ax, bx) x [az, bz) is packed; false also past the budget,
      // which the caller reads from cops.
      const packed = (ax: number, az: number, bx: number, bz: number): boolean => {
        const k = key(ax, az, bx, bz);
        const m = memo[k] as number;
        if (m !== 0) return m === 1;
        if (++cops > climit) return false;
        const n = sum(inside, ax, az, bx, bz);
        let ok = n === 0;
        // Each brick of a packing of it is held through a grip cell of its
        // own, so it has no more bricks than grips, none larger than fits.
        if (!ok && n <= sum(gripped, ax, az, bx, bz) * (most[(bz - az) * w1 + bx - ax] as number)) {
          ok = n === (bx - ax) * (bz - az) && (entry[(bz - az) * w1 + bx - ax] as number) >= 0;
          if (ok && firm !== undefined) ok = firm(X0 + ax, Z0 + az, X0 + bx, Z0 + bz);
          for (let cx = ax + 1; !ok && cx < bx && cops <= climit; cx++) {
            cops++;
            ok = packed(ax, az, cx, bz) && packed(cx, az, bx, bz);
          }
          for (let cz = az + 1; !ok && cz < bz && cops <= climit; cz++) {
            cops++;
            ok = packed(ax, az, bx, cz) && packed(ax, cz, bx, bz);
          }
        }
        if (cops > climit) return false;
        memo[k] = ok ? 1 : 2;
        return ok;
      };
      const found = packed(0, 0, w, d);
      settleSpent += cops;
      if (!found) return LEFT;
      // The plan, by the first way each rectangle was found packed: a held
      // entry, or the first cut whose two sides both were.
      const plan = (ax: number, az: number, bx: number, bz: number): void => {
        const n = sum(inside, ax, az, bx, bz);
        if (n === 0) return;
        if (
          n === (bx - ax) * (bz - az) &&
          (entry[(bz - az) * w1 + bx - ax] as number) >= 0 &&
          (firm === undefined || firm(X0 + ax, Z0 + az, X0 + bx, Z0 + bz))
        ) {
          planOf[(Z0 + az) * nx + X0 + ax] = entry[(bz - az) * w1 + bx - ax] as number;
          return;
        }
        for (let cx = ax + 1; cx < bx; cx++) {
          if (memo[key(ax, az, cx, bz)] === 1 && memo[key(cx, az, bx, bz)] === 1) {
            plan(ax, az, cx, bz);
            plan(cx, az, bx, bz);
            return;
          }
        }
        for (let cz = az + 1; cz < bz; cz++) {
          if (memo[key(ax, az, bx, cz)] === 1 && memo[key(ax, cz, bx, bz)] === 1) {
            plan(ax, az, bx, cz);
            plan(ax, cz, bx, bz);
            return;
          }
        }
      };
      plan(0, 0, w, d);
      return SOLVED;
    };
    // What a cell laid only for the question holds while it is asked.
    const TEMP = 0x7fffffff;
    const solve = (region: Region, y: number): void => {
      region.state = LEFT;
      // A region the ground repair asks for is the repair's, not the hold
      // search's, and goes uncounted: what the repair did is `groundRepair`
      // (see "attaching floating pieces").
      const stats = region.ground ? [0, 0, 0, 0] : holdStats;
      stats[0]++;
      const { cells, g, h } = region;
      const K = cells.length;
      // With the cook's search budget spent, the search does not run, and
      // the region goes straight to `settle`, which has its own.
      const spent = holdSpent >= budgets.cook;
      // ONE HEIGHT: the search lays bricks of the height the greedy did,
      // which is exact only where that is the height at every anchor in
      // every state — a 1x1 of it exists, every column takes it, and no
      // column takes the next height up. A floor slab is such a region; one
      // mixing heights is left to the greedy.
      let nextH = Infinity;
      let first = -1;
      let last = -1;
      let unit = false;
      for (let i = 0; i < catalogue.length; i++) {
        const cc = catalogue[i] as Candidate;
        if (cc.h > h) nextH = Math.min(nextH, cc.h);
        if (cc.h === h) {
          if (first < 0) first = i;
          last = i + 1;
          if (cc.fx === 1 && cc.fz === 1) unit = true;
        }
      }
      if (!unit) {
        stats[3]++;
        return;
      }
      const reach = Math.min(nextH, ny - y);
      for (let i = 0; i < K; i++) {
        const c = cells[i] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        let free = 0;
        while (free < reach) {
          const kk = at(cx, y + free, cz);
          if (cellGroup[kk] !== g || (brickOf[kk] as number) >= 0) break;
          free++;
        }
        if (free < h || free >= nextH) {
          stats[3]++;
          return;
        }
      }
      for (let i = 0; i < K; i++) localOf[cells[i] as number] = i;
      const forget = (): void => {
        for (let i = 0; i < K; i++) localOf[cells[i] as number] = -1;
      };
      // Every HELD placement of the height in the region, by anchor in scan
      // order and at each anchor in catalogue order — and in a region the
      // ground repair asks for, only those that stand FIRM where they cover
      // a cell of the floating piece.
      const firm = region.ground ? firmness(y) : undefined;
      grips(y, h);
      const pAt: number[] = [];
      const pCand: number[] = [];
      let steps = 0;
      for (let i = 0; i < K; i++) {
        const c = cells[i] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        for (let ci = first; ci < last; ci++) {
          const cc = catalogue[ci] as Candidate;
          steps++;
          if (cx + cc.fx > nx || cz + cc.fz > nz) continue;
          if (!anyGrip(cx, cz, cx + cc.fx, cz + cc.fz)) continue;
          if (!fits(cx, y, cz, cc, g)) continue;
          if (firm !== undefined && !firm(cx, cz, cx + cc.fx, cz + cc.fz)) continue;
          pAt.push(i);
          pCand.push(ci);
        }
      }
      const P = pAt.length;
      // Which placements cover each cell, and how many of them still fit.
      const coverStart = new Int32Array(K + 1);
      for (let p = 0; p < P; p++) {
        const c = cells[pAt[p] as number] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        const cc = catalogue[pCand[p] as number] as Candidate;
        for (let zz = cz; zz < cz + cc.fz; zz++) {
          for (let xx = cx; xx < cx + cc.fx; xx++) {
            const li = (localOf[zz * nx + xx] as number) + 1;
            coverStart[li] = (coverStart[li] as number) + 1;
          }
        }
      }
      const cover = new Int32Array(K);
      for (let i = 0; i < K; i++) {
        cover[i] = coverStart[i + 1] as number;
        coverStart[i + 1] = (coverStart[i + 1] as number) + (coverStart[i] as number);
      }
      for (let i = 0; i < K; i++) {
        if (cover[i] === 0) {
          // A cell no held brick can reach: no packing holds every brick.
          forget();
          if (!spent) holdSpent += steps;
          stats[2]++;
          region.state = NONE;
          return;
        }
      }
      const coverList = new Int32Array(coverStart[K] as number);
      const slot = coverStart.slice(0, K);
      for (let p = 0; p < P; p++) {
        const c = cells[pAt[p] as number] as number;
        const cx = c % nx;
        const cz = (c - cx) / nx;
        const cc = catalogue[pCand[p] as number] as Candidate;
        for (let zz = cz; zz < cz + cc.fz; zz++) {
          for (let xx = cx; xx < cx + cc.fx; xx++) {
            const li = localOf[zz * nx + xx] as number;
            coverList[slot[li] as number] = p;
            slot[li] = (slot[li] as number) + 1;
          }
        }
      }
      const filled = new Uint8Array(K);
      const alive = new Uint8Array(P).fill(1);
      const killed = new Int32Array(P);
      // The frame whose brick retired each placement, while it is retired.
      const killer = new Int32Array(P);
      let nKilled = 0;
      // Undo log of the pieces' unions, for `joins`: [index, old value]
      // pairs, an index of -1 - i meaning grounded[i].
      const undo: number[] = [];
      const pieceRoots: number[] = [];
      // Lays placement p for the question as frame d's brick: fills its
      // cells, retires every placement it overlaps, and returns a cell of
      // the region that left with no held placement to cover it, or -1.
      const place = (p: number, d: number): number => {
        const c = cells[pAt[p] as number] as number;
        const px = c % nx;
        const pz = (c - px) / nx;
        const cc = catalogue[pCand[p] as number] as Candidate;
        fill(px, y, pz, cc, TEMP);
        for (let zz = pz; zz < pz + cc.fz; zz++) {
          for (let xx = px; xx < px + cc.fx; xx++) filled[localOf[zz * nx + xx] as number] = 1;
        }
        let dead = -1;
        for (let zz = pz; zz < pz + cc.fz; zz++) {
          for (let xx = px; xx < px + cc.fx; xx++) {
            const li = localOf[zz * nx + xx] as number;
            for (let k = coverStart[li] as number; k < (coverStart[li + 1] as number); k++) {
              const q = coverList[k] as number;
              if (alive[q] === 0) continue;
              alive[q] = 0;
              killer[q] = d;
              killed[nKilled++] = q;
              const qc = cells[pAt[q] as number] as number;
              const qx = qc % nx;
              const qz = (qc - qx) / nx;
              const qq = catalogue[pCand[q] as number] as Candidate;
              steps += qq.area;
              for (let z2 = qz; z2 < qz + qq.fz; z2++) {
                for (let x2 = qx; x2 < qx + qq.fx; x2++) {
                  const t = localOf[z2 * nx + x2] as number;
                  cover[t] = (cover[t] as number) - 1;
                  if (cover[t] === 0 && filled[t] === 0 && dead < 0) dead = t;
                }
              }
            }
          }
        }
        // The pieces it stands on become one, as laying it would make them.
        if (bond > 0) {
          pieceRoots.length = 0;
          for (let zz = pz; zz < pz + cc.fz; zz++) {
            for (let xx = px; xx < px + cc.fx; xx++) {
              const b = brickOf[at(xx, y - 1, zz)] as number;
              if (b < 0) continue;
              const r = pieceOf(b);
              if (!pieceRoots.includes(r)) pieceRoots.push(r);
            }
          }
          if (pieceRoots.length > 1) {
            let r = pieceRoots[0] as number;
            for (const q of pieceRoots) r = Math.min(r, q);
            for (const q of pieceRoots) {
              if (q === r) continue;
              undo.push(q, up[q] as number, -1 - r, grounded[r] as number);
              up[q] = r;
              grounded[r] = (grounded[r] as number) | (grounded[q] as number);
            }
          }
        }
        return dead;
      };
      // Undoes `place(p)`, given the logs' lengths before it.
      const lift = (p: number, killedFrom: number, undoFrom: number): void => {
        while (undo.length > undoFrom) {
          const v = undo.pop() as number;
          const i = undo.pop() as number;
          if (i >= 0) up[i] = v;
          else grounded[-1 - i] = v;
        }
        while (nKilled > killedFrom) {
          const q = killed[--nKilled] as number;
          alive[q] = 1;
          const qc = cells[pAt[q] as number] as number;
          const qx = qc % nx;
          const qz = (qc - qx) / nx;
          const qq = catalogue[pCand[q] as number] as Candidate;
          for (let z2 = qz; z2 < qz + qq.fz; z2++) {
            for (let x2 = qx; x2 < qx + qq.fx; x2++) {
              const t = localOf[z2 * nx + x2] as number;
              cover[t] = (cover[t] as number) + 1;
            }
          }
        }
        const c = cells[pAt[p] as number] as number;
        const px = c % nx;
        const pz = (c - px) / nx;
        const cc = catalogue[pCand[p] as number] as Candidate;
        fill(px, y, pz, cc, -1);
        for (let zz = pz; zz < pz + cc.fz; zz++) {
          for (let xx = px; xx < px + cc.fx; xx++) filled[localOf[zz * nx + xx] as number] = 0;
        }
      };
      // The frames of the search, one per brick laid: the cell it covers,
      // its moves (a slice of `moves`, best score first), the next to try,
      // the one laid, and the logs' lengths before it.
      const moves: number[] = [];
      const moveScore: number[] = [];
      const fCell = new Int32Array(K + 1);
      const fStart = new Int32Array(K + 1);
      const fNext = new Int32Array(K + 1);
      const fEnd = new Int32Array(K + 1);
      const fPlaced = new Int32Array(K + 1).fill(-1);
      const fKilled = new Int32Array(K + 1);
      const fUndo = new Int32Array(K + 1);
      let top = 0;
      // Opens frame d on the cell it must cover; false when every cell is
      // covered, which is the region packed. In SCAN order that is the
      // first unfilled cell from `from`, where every placement still open
      // over it has its corner there — the greedy's own question. FEWEST
      // FIRST, it is the unfilled cell the fewest open placements cover,
      // the earliest of those: the cell most likely to fail, asked first.
      const openFrame = (d: number, from: number, fewest: boolean): boolean => {
        let a = -1;
        if (fewest) {
          let least = Infinity;
          for (let i = 0; i < K; i++) {
            if (filled[i] === 0 && (cover[i] as number) < least) {
              least = cover[i] as number;
              a = i;
            }
          }
          steps += K >> 4;
        } else {
          a = from;
          while (a < K && filled[a] === 1) a++;
          if (a === K) a = -1;
        }
        if (a < 0) return false;
        fCell[d] = a;
        fStart[d] = top;
        fNext[d] = top;
        fPlaced[d] = -1;
        for (let k = coverStart[a] as number; k < (coverStart[a + 1] as number); k++) {
          const p = coverList[k] as number;
          if (alive[p] === 0) continue;
          const c = cells[pAt[p] as number] as number;
          const px = c % nx;
          const pz = (c - px) / nx;
          const cc = catalogue[pCand[p] as number] as Candidate;
          steps += 1 + cc.fx + cc.fz;
          let score = cc.area - stagger * alignedSeams(px, y, pz, cc, g);
          if (bond > 0) score += bond * joins(px, y, pz, cc);
          // Best score first; ties keep catalogue order, as the greedy's
          // strict > does (the cover list is in placement order).
          let i = top++;
          while (i > (fStart[d] as number) && (moveScore[i - 1] as number) < score) {
            moves[i] = moves[i - 1] as number;
            moveScore[i] = moveScore[i - 1] as number;
            i--;
          }
          moves[i] = p;
          moveScore[i] = score;
        }
        fEnd[d] = top;
        return true;
      };
      // CONFLICT-DIRECTED BACKJUMPING. Each frame keeps the frames whose
      // bricks are to blame for its failures so far: a cell left with no
      // held placement blames the frames that retired every placement
      // over it, and a frame whose every placement failed blames what each
      // of them blamed plus the frames that retired the ones never tried.
      // The search then goes straight back to the LATEST frame to blame,
      // past every frame between, which had nothing to do with it: retrying
      // those only lays the same failure again. Nothing is skipped that
      // could have held — the blamed frames' bricks alone rule the cell out
      // — so the search stays exact, and a failure blaming no frame is a
      // proof that no packing of the region holds every brick.
      const blame: number[][] = [];
      const blameCell = (into: number[], t: number, d: number): void => {
        for (let k = coverStart[t] as number; k < (coverStart[t + 1] as number); k++) {
          const q = coverList[k] as number;
          if (alive[q] === 0 && (killer[q] as number) < d && !into.includes(killer[q] as number)) into.push(killer[q] as number);
        }
      };
      let depth = 0;
      // One search, to SOLVED (the plan is written), NONE, or LEFT when the
      // budget runs out; either way every brick it laid is lifted again.
      const search = (fewest: boolean, budget: number): number => {
        let outcome = LEFT;
        depth = 0;
        top = 0;
        blame[0] = [];
        if (!openFrame(0, 0, fewest)) outcome = SOLVED;
        while (outcome === LEFT) {
          if (steps > budget) break;
          if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
          const d = depth;
          if ((fPlaced[d] as number) >= 0) {
            lift(fPlaced[d] as number, fKilled[d] as number, fUndo[d] as number);
            fPlaced[d] = -1;
          }
          if (fNext[d] === fEnd[d]) {
            const why = blame[d] as number[];
            blameCell(why, fCell[d] as number, d);
            let j = -1;
            for (const k of why) if (k > j) j = k;
            if (j < 0) {
              // Every held placement over the cell is ruled out by nothing
              // laid: no packing of the region holds every brick.
              outcome = NONE;
              break;
            }
            for (let k = d - 1; k > j; k--) {
              if ((fPlaced[k] as number) >= 0) {
                lift(fPlaced[k] as number, fKilled[k] as number, fUndo[k] as number);
                fPlaced[k] = -1;
              }
            }
            top = fEnd[j] as number;
            const into = blame[j] as number[];
            for (const k of why) if (k !== j && !into.includes(k)) into.push(k);
            depth = j;
            continue;
          }
          const p = moves[fNext[d] as number] as number;
          fNext[d] = (fNext[d] as number) + 1;
          fKilled[d] = nKilled;
          fUndo[d] = undo.length;
          fPlaced[d] = p;
          const t = place(p, d);
          if (t >= 0) {
            blameCell(blame[d] as number[], t, d);
            continue;
          }
          depth = d + 1;
          if (!openFrame(depth, fCell[d] as number, fewest)) {
            outcome = SOLVED;
            break;
          }
          const fresh = blame[depth];
          if (fresh === undefined) blame[depth] = [];
          else fresh.length = 0;
        }
        if (outcome === SOLVED) {
          for (let d = 0; d < depth; d++) {
            const p = fPlaced[d] as number;
            planOf[cells[pAt[p] as number] as number] = pCand[p] as number;
          }
        }
        for (let d = Math.min(depth, K); d >= 0; d--) {
          if ((fPlaced[d] as number) >= 0) {
            lift(fPlaced[d] as number, fKilled[d] as number, fUndo[d] as number);
            fPlaced[d] = -1;
          }
        }
        return outcome;
      };
      // In scan order first, so the packing found is the greedy's own
      // wherever the greedy's choice holds; fewest first with what is left
      // when that runs out — a floor whose last rows fail by the widths
      // left over can take a scan millions of steps to give up, and fewest
      // first lays the long plates the middle of a room needs before the
      // short ones that would take their grip.
      let outcome = LEFT;
      if (!spent) {
        const budget = Math.min(budgets.region, budgets.cook - holdSpent);
        compress = false;
        outcome = search(false, Math.min(budget, budgets.scan));
        if (outcome === LEFT) outcome = search(true, budget);
        compress = true;
      }
      if (outcome === LEFT) outcome = settle(region, y, pAt, pCand, first, last, firm);
      forget();
      if (!spent) holdSpent += steps;
      region.state = outcome;
      if (outcome === SOLVED) stats[1]++;
      else if (outcome === NONE) stats[2]++;
      else stats[3]++;
    };

    // ---- relaying a course --------------------------------------------
    // A course the search touched is laid again only FROM the first cell of
    // the regions it opened: before that cell the relaying makes exactly the
    // choices the last laying made, so those bricks stay. From it on, the
    // last laying is the REFERENCE, and its brick at an anchor is laid again
    // without being weighed wherever nothing the greedy would read there can
    // differ from what it read then, which makes it the choice the greedy
    // would make. What the greedy reads is the course's cells (filled or
    // not) in a window round the anchor, and the pieces under the
    // placements that fit there. So the relaying keeps two exact records
    // against the reference: DIRTY, the cells whose filled state at this
    // point of the scan differs from the reference's at the same point, and
    // TAINT, set on a piece that a brick laid differently in either laying
    // joined. A piece no tainted piece reaches was joined in both layings by
    // the same bricks, so it is the same piece. Every other anchor is weighed
    // afresh, and the course comes out brick for brick as laying all of it
    // again would.
    // Per course cell: the reference brick anchored there (-1 for none), the
    // anchor of the reference brick covering it, and whether it is dirty;
    // and dirty cells counted per block of 8 x 8, so most windows are
    // answered without visiting a cell.
    let refAt = new Int32Array(0);
    let refCover = new Int32Array(0);
    let dirty = new Uint8Array(0);
    let dirtyBlock = new Int32Array(0);
    const bw = (nx + 7) >> 3;
    let dirtyCount = 0;
    let tainted = false;
    const refCand: Candidate[] = [];
    const refMerged: number[] = [];
    const relayCells = (): void => {
      if (refAt.length === sxz) return;
      refAt = new Int32Array(sxz).fill(-1);
      refCover = new Int32Array(sxz).fill(-1);
      dirty = new Uint8Array(sxz);
      dirtyBlock = new Int32Array(bw * ((nz + 7) >> 3));
    };
    // How far from its anchor the greedy reads the course: every placement
    // it tries lies within the largest footprint of the catalogue, the
    // joints it weighs one cell beyond, and the cells it asks could still be
    // held another largest footprint beyond those.
    let reachX = 1;
    let reachZ = 1;
    for (const cc of catalogue) {
      reachX = Math.max(reachX, cc.fx);
      reachZ = Math.max(reachZ, cc.fz);
    }
    const setDirty = (c: number, on: number): void => {
      if (dirty[c] === on) return;
      dirty[c] = on;
      const d = on === 1 ? 1 : -1;
      dirtyCount += d;
      const cx = c % nx;
      const b = (((c - cx) / nx) >> 3) * bw + (cx >> 3);
      dirtyBlock[b] = (dirtyBlock[b] as number) + d;
    };
    // Whether any cell of [ax, bx) x [az, bz) of the course is dirty.
    const dirtyIn = (ax: number, az: number, bx: number, bz: number): boolean => {
      const a = Math.max(0, ax);
      const c = Math.max(0, az);
      const b = Math.min(nx, bx);
      const d = Math.min(nz, bz);
      for (let qz = c >> 3; qz <= (d - 1) >> 3; qz++) {
        for (let qx = a >> 3; qx <= (b - 1) >> 3; qx++) {
          if ((dirtyBlock[qz * bw + qx] as number) === 0) continue;
          for (let zz = Math.max(c, qz << 3); zz < Math.min(d, (qz + 1) << 3); zz++) {
            for (let xx = Math.max(a, qx << 3); xx < Math.min(b, (qx + 1) << 3); xx++) if (dirty[zz * nx + xx] === 1) return true;
          }
        }
      }
      return false;
    };
    // Whether a tainted piece stands under any cell of [ax, bx) x [az, bz).
    const taintedUnder = (ax: number, az: number, bx: number, bz: number, y: number): boolean => {
      let last = -1;
      for (let zz = az; zz < bz; zz++) {
        for (let xx = ax; xx < bx; xx++) {
          const b = brickOf[at(xx, y - 1, zz)] as number;
          if (b < 0 || b === last) continue;
          last = b;
          if ((taint[pieceOf(b)] as number) === 1) return true;
        }
      }
      return false;
    };
    // Whether the reference's brick at anchor (x, z) is the greedy's choice
    // here too: nothing dirty in the window the greedy reads, and no tainted
    // piece under a placement that fits. A placement that fits covers the
    // run of open cells from the anchor along x and the run along z, so it
    // lies in the box those two runs span.
    const unchanged = (x: number, y: number, z: number, g: number): boolean => {
      if (dirtyCount > 0 && dirtyIn(x - reachX, z, x + 2 * reachX, z + 2 * reachZ)) return false;
      if (!tainted || y === 0 || bond === 0) return true;
      let ex = x + 1;
      while (ex < nx && ex < x + reachX && open(at(ex, y, z), g)) ex++;
      let ez = z + 1;
      while (ez < nz && ez < z + reachZ && open(at(x, y, ez), g)) ez++;
      return !taintedUnder(x, z, ex, ez, y);
    };
    // The reference: the course as laid, from brick id `start` on.
    const takeReference = (start: number): void => {
      refAt.fill(-1);
      refCand.length = 0;
      refMerged.length = 0;
      for (let id = start; id < bCand.length; id++) {
        const cand = bCand[id] as Candidate;
        const c = (bz[id] as number) * nx + (bx[id] as number);
        refAt[c] = refCand.length;
        refCand.push(cand);
        refMerged.push(bMerged[id] as number);
        for (let zz = bz[id] as number; zz < (bz[id] as number) + cand.fz; zz++) {
          for (let xx = bx[id] as number; xx < (bx[id] as number) + cand.fx; xx++) refCover[zz * nx + xx] = c;
        }
      }
      if (dirtyCount > 0) {
        dirty.fill(0);
        dirtyBlock.fill(0);
        dirtyCount = 0;
      }
      tainted = false;
    };
    // After the relaying lays brick `id` at anchor c: a brick unlike the
    // reference's there that joined pieces taints them, and each cell it
    // fills is dirty while the reference fills it at a later anchor, and
    // clean again where the reference filled it at an earlier one.
    const relaid = (id: number, c: number): void => {
      const x = bx[id] as number;
      const z = bz[id] as number;
      const cand = bCand[id] as Candidate;
      const r = refAt[c] as number;
      if ((r < 0 || refCand[r] !== cand) && (bMerged[id] as number) === 1) {
        taint[pieceOf(id)] = 1;
        tainted = true;
      }
      for (let zz = z; zz < z + cand.fz; zz++) {
        for (let xx = x; xx < x + cand.fx; xx++) {
          const q = zz * nx + xx;
          const pa = refCover[q] as number;
          if (pa !== c) setDirty(q, pa > c ? 1 : 0);
        }
      }
    };
    // At cell c of the scan, past the choice there: the reference's brick
    // anchored at c fills its cells now, each clean again where the
    // relaying filled it already (dirty since) and dirty where it has yet
    // to. One the relaying did not lay again at c, if it joined pieces,
    // taints the pieces it stood on.
    const referenced = (c: number, y: number): void => {
      const r = refAt[c] as number;
      const cand = refCand[r] as Candidate;
      const x = c % nx;
      const z = (c - x) / nx;
      const b = brickOf[y * sxz + c] as number;
      if (b >= 0 && (bx[b] as number) === x && (bz[b] as number) === z && bCand[b] === cand) return;
      if ((refMerged[r] as number) === 1) {
        for (let zz = z; zz < z + cand.fz; zz++) {
          for (let xx = x; xx < x + cand.fx; xx++) {
            const under = brickOf[at(xx, y - 1, zz)] as number;
            if (under >= 0) taint[pieceOf(under)] = 1;
          }
        }
        tainted = true;
      }
      for (let zz = z; zz < z + cand.fz; zz++) {
        for (let xx = x; xx < x + cand.fx; xx++) {
          const q = zz * nx + xx;
          const rb = brickOf[y * sxz + q] as number;
          if (rb >= 0 && (bz[rb] as number) * nx + (bx[rb] as number) === c) continue;
          setDirty(q, rb >= 0 ? 0 : 1);
        }
      }
    };

    // ---- the courses -------------------------------------------------
    // Anchors of the course whose brick was held by nothing: cell, height.
    const unheldAt: number[] = [];
    // Lays course y in scan order from cell `from`, every cell before it
    // filled already; `relay` when a reference is taken (see above).
    const layCourse = (y: number, searching: boolean, from: number, relay: boolean): void => {
      const zFrom = Math.floor(from / nx);
      for (let z = zFrom; z < nz; z++) {
        for (let x = z === zFrom ? from - zFrom * nx : 0; x < nx; x++) {
          const k = at(x, y, z);
          const c = z * nx + x;
          const o = owner[k] as number;
          if (o >= 0 && (brickOf[k] as number) < 0) layAt(x, y, z, c, o, searching, relay);
          if (relay && (refAt[c] as number) >= 0) referenced(c, y);
        }
      }
    };
    // Chooses and lays the brick anchored at cell c = (x, z) of course y.
    const layAt = (x: number, y: number, z: number, c: number, o: number, searching: boolean, relay: boolean): void => {
      if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      const g = cellGroup[at(x, y, z)] as number;
      let best: Candidate | undefined;
      let bestHeld = false;
      let unsolved = false;
      if (searching) {
        const r = regionOf[c] as number;
        if (r >= 0) {
          const region = regions[r] as Region;
          if (region.state === PENDING) solve(region, y);
          unsolved = region.state === NONE || region.state === LEFT;
          const p = planOf[c] as number;
          if (p >= 0) {
            best = catalogue[p] as Candidate;
            bestHeld = true;
          }
        }
      }
      if (best === undefined && relay) {
        const r = refAt[c] as number;
        if (r >= 0 && unchanged(x, y, z, g)) {
          best = refCand[r] as Candidate;
          bestHeld = held(x, y, z, best);
        }
      }
      if (best === undefined) {
        let bestScore = -Infinity;
        // Candidates are pre-sorted tallest first, then by footprint, then
        // catalogue order, then as listed before turned, so a strict >
        // keeps the tie-break. HEIGHT IS NOT TRADED against seams: the
        // first height that fits is the course, and the seam cost only
        // chooses among footprints of it. Scored on volume instead, a 1x1
        // plate beat any full brick whose end met a seam, and the plate
        // then knocked every course above it off the brick rhythm — a
        // house's walls came out three quarters plates.
        //
        // Within that height, WHAT HOLDS comes before the score. Each
        // placement is charged the loose bricks it commits the build to:
        // one if it is held by nothing (see `held`), plus one for every
        // cell beside it that it strands (see `strands`). The fewest wins,
        // then a held placement over one held by nothing, and only then
        // the score — no score buys back a brick that is loose in every
        // build order. Charging a stranded cell like a loose brick is what
        // keeps the rule from trading one loose brick for two: a held
        // placement that strands two cells loses to the loose one that
        // strands none. Both charges are zero wherever every cell of the
        // course has something under or over it, so a wall, a solid block
        // or anything standing on what is below packs by the score alone.
        let bestLoose = Infinity;
        holdableBefore.clear();
        for (const cand of catalogue) {
          // Once a held placement stranding nothing is the best, only the
          // score can be beaten, and no placement scores above its
          // footprint plus a join for every stud but one: past that bound
          // nothing smaller can win.
          const settled = bestLoose === 0;
          if (best !== undefined && (cand.h < best.h || (settled && cand.area + bond * (cand.area - 1) <= bestScore))) break;
          if (!fits(x, y, z, cand, g)) continue;
          const isHeld = held(x, y, z, cand);
          let score = cand.area - stagger * alignedSeams(x, y, z, cand, g);
          if (bond > 0) score += bond * joins(x, y, z, cand);
          if (settled && (!isHeld || score <= bestScore)) continue;
          const loose = (isHeld ? 0 : 1) + strands(x, y, z, cand, g);
          if (loose > bestLoose) continue;
          if (loose < bestLoose || (isHeld && !bestHeld) || (isHeld === bestHeld && score > bestScore)) {
            bestScore = score;
            best = cand;
            bestLoose = loose;
            bestHeld = isHeld;
          }
        }
        if (best === undefined) {
          throw new Error(
            `${NODE}: no entry in the catalogue ("bricks" plus "extraBricks") fits at lattice cell (${x + x0}, ${y + y0}, ${z + z0}) — world (${origin[0] + (x + x0) * pitch[0]}, ${origin[1] + (y + y0) * pitch[1]}, ${origin[2] + (z + z0) * pitch[2]}), in the box of point ${o}. The space left there is narrower or shorter than every brick in the catalogue; add [1, 1, 1] (a 1x1 plate) to "bricks" or "extraBricks" so any occupancy can be covered`,
          );
        }
      }
      if (!bestHeld) unheldAt.push(c, best.h);
      const id = lay(x, y, z, best, o);
      if (unsolved) bUnsolved[id] = 1;
      if (relay) relaid(id, c);
    };

    // Per course: the first brick id laid in it, and the hold search's
    // counts as it began — where the ground repair takes a build back to.
    const courseStart = new Int32Array(ny);
    const courseStats = new Int32Array(ny * 4);
    // The anchors of the floating piece's bricks in the course the repair
    // asks of, with their heights: where its regions are opened.
    const groundAt: number[] = [];
    // Lays every course from y0 up. False when the course the ground repair
    // asks of (`groundY`) left a region it asked for unsolved: the courses
    // above it are then not laid, and the caller puts the build back.
    const layCourses = (y0: number): boolean => {
      for (let y = y0; y < ny; y++) {
        const start = bCand.length;
        courseStart[y] = start;
        for (let c = 0; c < 4; c++) courseStats[y * 4 + c] = holdStats[c] as number;
        unheldAt.length = 0;
        layCourse(y, false, 0, false);
        // Only a course that laid a brick held by nothing is searched; every
        // other course is exactly the greedy's — unless the ground repair
        // asks of it, and then its first round opens the regions round the
        // floating piece as well.
        const demanded = y === groundY;
        for (let round = 0; round < HOLD_ROUNDS && (unheldAt.length > 0 || (demanded && round === 0)); round++) {
          const fresh: number[] = [];
          searchCells();
          for (let i = 0; i < unheldAt.length; i += 2) {
            if ((regionOf[unheldAt[i] as number] as number) < 0) fresh.push(unheldAt[i] as number, unheldAt[i + 1] as number);
          }
          if (demanded && round === 0) {
            for (let i = 0; i < groundAt.length; i += 2) {
              if ((regionOf[groundAt[i] as number] as number) < 0) fresh.push(groundAt[i] as number, groundAt[i + 1] as number);
            }
          }
          if (fresh.length === 0) break;
          // The new regions, and the first cell of any of them: where this
          // laying can first differ from the last.
          let from = sxz;
          for (let i = 0; i < fresh.length; i += 2) {
            if ((regionOf[fresh[i] as number] as number) >= 0) continue;
            openRegion(fresh[i] as number, fresh[i + 1] as number, y, start);
            from = Math.min(from, (regions[regions.length - 1] as Region).cells[0] as number);
          }
          if (!partial) from = 0;
          relayCells();
          takeReference(start);
          // Bricks are in scan order of their anchors, and so is `unheldAt`:
          // what lies before `from` stays, bricks and loose anchors alike.
          let keep = start;
          while (keep < bCand.length && (bz[keep] as number) * nx + (bx[keep] as number) < from) keep++;
          let kept = 0;
          while (kept < unheldAt.length && (unheldAt[kept] as number) < from) kept += 2;
          unheldAt.length = kept;
          unlay(keep, y);
          layCourse(y, true, from, partial);
        }
        // Asked of, the course stands only if every region the repair asked
        // for was packed firm.
        let firmLaid = true;
        if (demanded) for (const region of regions) if (region.ground && region.state !== SOLVED) firmLaid = false;
        if (touched.length > 0) {
          for (const c of touched) {
            regionOf[c] = -1;
            planOf[c] = -1;
          }
          touched.length = 0;
          regions.length = 0;
        }
        if (!firmLaid) return false;
      }
      return true;
    };
    layCourses(0);

    // ---- attaching floating pieces -------------------------------------
    // Every course the hold search finishes holds each of its bricks, but a
    // brick can be held and still hang from nothing: a group of bricks
    // holding each other across two or more courses — a floor strip under
    // a roof strip — with no brick of the group standing on anything that
    // reaches the table. No look at one course sees it. So the finished
    // build is asked what brickConnectivity asks: the pieces stud clutch
    // makes, and whether each holds a brick of the bottom course. A piece
    // that does not is FLOATING, and is repaired course by course, its
    // lowest first: the build is taken back to that course and laid again
    // from it, with the regions round the piece's bricks there packed by
    // the hold search under one more demand — a placement over a cell of
    // the piece must also cover a cell standing on a brick of a piece that
    // reaches the table (FIRM). Laid that way, the piece's bricks of that
    // course reach the table, and every course above is laid on them as
    // usual. A repair is kept only if the build it makes, asked again, has
    // fewer floating bricks than before; otherwise the build is put back
    // exactly as it was. A course where a brick of the piece sits in a
    // region the hold search came back from without a held packing is not
    // asked: a firm packing is a held one, so where the search proved there
    // is none there is no firm one either, and where it ran out on those
    // very cells (left) asking again under a stricter demand would only
    // spend the same budget twice. Each course asked costs the cells
    // laid again, counted against `holdBudget.ground`, never time. A build
    // with no floating piece never gets past the first question, so it is
    // packed byte for byte as without it.
    const floating = (): { pieces: number[][]; bricks: number } => {
      const byRoot = new Map<number, number[]>();
      let bricks = 0;
      for (let id = 0; id < bCand.length; id++) {
        const r = pieceOf(id);
        if ((grounded[r] as number) === 1) continue;
        let list = byRoot.get(r);
        if (list === undefined) byRoot.set(r, (list = []));
        list.push(id);
        bricks++;
      }
      // A root is its piece's lowest id, so these are in order of it.
      return { pieces: [...byRoot.values()], bricks };
    };
    let found = floating();
    let groundRec: number[] | undefined;
    if (found.bricks > 0) {
      const before = [found.pieces.length, found.bricks];
      let spent = 0;
      let asked = 0;
      let kept = 0;
      // Pieces, by lowest id, and courses asked since the build last changed.
      const tried = new Set<number>();
      for (;;) {
        let piece: number[] | undefined;
        let yAsk = -1;
        for (const p of found.pieces) {
          const courses = [...new Set(p.map((id) => by[id] as number))].sort((a, b) => a - b);
          for (const y of courses) {
            const key = (p[0] as number) * ny + y;
            if (tried.has(key)) continue;
            tried.add(key);
            if (p.some((id) => by[id] === y && bUnsolved[id] === 1)) continue;
            piece = p;
            yAsk = y;
            break;
          }
          if (piece !== undefined) break;
        }
        if (piece === undefined) break;
        const cost = (ny - yAsk) * sxz;
        if (spent + cost > budgets.ground) break;
        spent += cost;
        asked++;
        // The demand: the piece's cells of the course, and its anchors there.
        if (groundQ.length !== sxz) groundQ = new Uint8Array(sxz);
        else groundQ.fill(0);
        groundAt.length = 0;
        for (const id of piece) {
          if (by[id] !== yAsk) continue;
          const cand = bCand[id] as Candidate;
          const ax = bx[id] as number;
          const az = bz[id] as number;
          groundAt.push(az * nx + ax, cand.h);
          for (let zz = az; zz < az + cand.fz; zz++) for (let xx = ax; xx < ax + cand.fx; xx++) groundQ[zz * nx + xx] = 1;
        }
        // Everything laying from yAsk up can change, to put it back.
        const lists = [bx, by, bz, bCand, bOwner, up, grounded, taint, bMerged, bUnsolved] as unknown[][];
        const saved = lists.map((list) => list.slice());
        const savedCells = brickOf.slice(yAsk * sxz);
        const savedStats = holdStats.slice();
        const savedStart = courseStart.slice();
        const savedCourseStats = courseStats.slice();
        unlay(courseStart[yAsk] as number, yAsk);
        gripY = -1;
        for (let c = 0; c < 4; c++) holdStats[c] = courseStats[yAsk * 4 + c] as number;
        groundY = yAsk;
        const laid = layCourses(yAsk);
        groundY = -1;
        if (laid) {
          const now = floating();
          if (now.bricks < found.bricks) {
            found = now;
            kept++;
            tried.clear();
            continue;
          }
        }
        lists.forEach((list, i) => {
          const from = saved[i] as unknown[];
          list.length = 0;
          for (const v of from) list.push(v);
        });
        brickOf.set(savedCells, yAsk * sxz);
        for (let c = 0; c < 4; c++) holdStats[c] = savedStats[c] as number;
        courseStart.set(savedStart);
        courseStats.set(savedCourseStats);
        gripY = -1;
      }
      groundRec = [before[0] as number, before[1] as number, found.pieces.length, found.bricks, asked, kept];
    }

    // ---- studs and clutch --------------------------------------------
    const count = bCand.length;
    const parent = new Int32Array(count);
    for (let i = 0; i < count; i++) parent[i] = i;
    const find = (i: number): number => {
      let r = i;
      while ((parent[r] as number) !== r) r = parent[r] as number;
      while ((parent[i] as number) !== r) {
        const next = parent[i] as number;
        parent[i] = r;
        i = next;
      }
      return r;
    };
    const studX: number[] = [];
    const studY: number[] = [];
    const studZ: number[] = [];
    const studBrick: number[] = [];
    const studAbove: number[] = [];
    for (let id = 0; id < count; id++) {
      const cand = bCand[id] as Candidate;
      const top = (by[id] as number) + cand.h;
      for (let zz = bz[id] as number; zz < (bz[id] as number) + cand.fz; zz++) {
        for (let xx = bx[id] as number; xx < (bx[id] as number) + cand.fx; xx++) {
          const above = top < ny ? (brickOf[at(xx, top, zz)] as number) : -1;
          if (above < 0 || allStuds) {
            studX.push(xx);
            studY.push(top);
            studZ.push(zz);
            studBrick.push(id);
            studAbove.push(above);
          }
          if (above >= 0) {
            const ra = find(id);
            const rb = find(above);
            if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
          }
        }
      }
    }
    let islands = 0;
    for (let i = 0; i < count; i++) if (find(i) === i) islands++;

    // ---- outputs ------------------------------------------------------
    const bricksGeo = gatherPoints(src, bOwner);
    const S = Math.SQRT1_2;
    {
      const bp = bricksGeo.attrs.point;
      const P = bp.replace("P", "f32", 3, [0, 0, 0]).writable();
      const rot = bp.replace("rot", "f32", 4, [0, 0, 0, 1]).writable();
      const scale = bp.replace("scale", "f32", 3, [1, 1, 1]).writable();
      const bMin = bp.replace("boundsMin", "f32", 3, [0, 0, 0]).writable();
      const bMax = bp.replace("boundsMax", "f32", 3, [0, 0, 0]).writable();
      const label = bp.replace(BRICK_ATTR, "string", 1, "");
      const index = bp.replace(BRICK_INDEX_ATTR, "i32", 1, 0).writable();
      for (let id = 0; id < count; id++) {
        const cand = bCand[id] as Candidate;
        const lo = [(bx[id] as number) + x0, (by[id] as number) + y0, (bz[id] as number) + z0];
        const ext = [cand.fx, cand.h, cand.fz];
        for (let c = 0; c < 3; c++) {
          const a = origin[c] + (lo[c] as number) * pitch[c];
          const b = origin[c] + ((lo[c] as number) + (ext[c] as number)) * pitch[c];
          bMin[id * 3 + c] = a;
          bMax[id * 3 + c] = b;
          P[id * 3 + c] = 0.5 * (a + b);
        }
        // Own-frame extents: as listed, whichever way it was placed.
        const w = cand.turned ? cand.fz : cand.fx;
        const d = cand.turned ? cand.fx : cand.fz;
        scale[id * 3] = w * pitch[0];
        scale[id * 3 + 1] = cand.h * pitch[1];
        scale[id * 3 + 2] = d * pitch[2];
        if (cand.turned) {
          rot[id * 4 + 1] = S;
          rot[id * 4 + 3] = S;
        }
        label.setString(id, `${w}x${d}x${cand.h}`);
        index[id] = cand.index;
      }
      if (islandsAttr !== "") bricksGeo.attrs.detail.replace(islandsAttr, "u32", 1, 0).set(0, islands);
      // Written only where the hold search ran, so a build it never
      // touched is byte for byte what it was.
      if ((holdStats[0] as number) > 0) {
        const rec = bricksGeo.attrs.detail.replace(HOLD_ATTR, "u32", 4, [0, 0, 0, 0]);
        for (let c = 0; c < 4; c++) rec.set(0, holdStats[c] as number, c);
      }
      // Likewise only where a floating piece was found.
      if (groundRec !== undefined) {
        const rec = bricksGeo.attrs.detail.replace(GROUND_ATTR, "u32", 6, [0, 0, 0, 0, 0, 0]);
        for (let c = 0; c < 6; c++) rec.set(0, groundRec[c] as number, c);
      }
    }

    const studOwners = studBrick.map((id) => bOwner[id] as number);
    const studsGeo = gatherPoints(src, studOwners);
    {
      const sp = studsGeo.attrs.point;
      const P = sp.replace("P", "f32", 3, [0, 0, 0]).writable();
      sp.replace("rot", "f32", 4, [0, 0, 0, 1]);
      sp.replace("scale", "f32", 3, [1, 1, 1]);
      sp.replace("boundsMin", "f32", 3, [0, 0, 0]);
      sp.replace("boundsMax", "f32", 3, [0, 0, 0]);
      const label = sp.replace(BRICK_ATTR, "string", 1, "");
      const index = sp.replace(BRICK_INDEX_ATTR, "i32", 1, 0).writable();
      const on = sp.replace(STUD_ON_ATTR, "i32", 1, -1).writable();
      const under = sp.replace(STUD_UNDER_ATTR, "i32", 1, -1).writable();
      const bLabel = bricksGeo.attrs.point.require(BRICK_ATTR);
      for (let s = 0; s < studBrick.length; s++) {
        const id = studBrick[s] as number;
        P[s * 3] = origin[0] + ((studX[s] as number) + x0 + 0.5) * pitch[0];
        P[s * 3 + 1] = origin[1] + ((studY[s] as number) + y0) * pitch[1];
        P[s * 3 + 2] = origin[2] + ((studZ[s] as number) + z0 + 0.5) * pitch[2];
        label.setString(s, bLabel.getString(id));
        index[s] = (bCand[id] as Candidate).index;
        on[s] = id;
        under[s] = studAbove[s] as number;
      }
    }

    return { out: [makeGeometryItem(bricksGeo)], studs: [makeGeometryItem(studsGeo)] };
  },
});

/** Named once for the second node; its messages lead with it. */
const CONNECT = "brickConnectivity";

/**
 * What `step` and `island` hold for a brick that can never be attached, and
 * what a stud's `stepAbove` holds when no brick will ever cover it: none
 * rests on it, or the one that does is itself never attached.
 */
const NEVER = -1;

/**
 * Reads bricks on a stud lattice and writes which clutch-connected piece
 * each belongs to and the build step at which it can be placed.
 */
export const brickConnectivity = standardNode<
  BrickConnectivityParams,
  BrickConnectivityInputs,
  BrickConnectivityOutputs
>({
  type: CONNECT,
  category: "attribute",
  description:
    "Reads BRICKS on a stud lattice — one per point, its world corners in two point attributes, as packBricks writes them — and says how they hold together: which clutch-connected piece each brick belongs to, and the build STEP at which it can be placed. Two bricks are joined when one sits directly on the other's top face with overlapping footprints, which is what a stud gripping the brick above does; side-by-side contact joins nothing. `island` numbers the pieces 0, 1, 2…, ordered by their lowest point IDENTITY (stored position bits plus `seed`), so it does not move when the input is shuffled. `step` is an ORDER YOU COULD BUILD IN, bottom up: the steps are the distinct bottom courses of the build in rising order, and at each one a brick is placed if it stands on the build's lowest course (the table) or clutches a brick already placed. A brick that hangs UNDER something — a plate held only by the floor laid on top of it — cannot be placed in its own course, because nothing is there to grip yet; it is placed in the step of the first brick above it that is, along with anything hanging under it in turn. So every brick, when it is placed, is attached to something already standing. A brick no order can attach — in a piece with no brick on the lowest course, which is a piece held by nothing — gets `step` -1, and its `island` is still numbered: the count of -1 steps is how many bricks a build would drop. Bricks must not overlap (two bricks claiming one cell are refused, naming both points) and every corner must land on the lattice, exactly as packBricks requires; a zero-volume box is not a brick and gets -1 for both. OUTPUT `out` is the input with two i32 point attributes added, `islandAttr` and `stepAttr`, the number of steps as a DETAIL u32 (`stepCountAttr`, the range a build-step slider runs over: steps 0 to stepCount - 1), and optionally the island count as a DETAIL u32; no point is moved, added or reordered, so a filterByExpression on `step` downstream shows the build as it stood after any step. INPUT `studs` (optional) takes packBricks' `studs` output — best with `studMode: 'all'` — whose `brickId` and `brickAbove` columns are indices into the bricks on `in`, so `in` must be that same packBricks' `out` with nothing dropped or reordered (an index past the end is refused, naming the stud). Wired, OUTPUT `studs` is those studs with two i32 point attributes added: `stepAttr`, the step of the brick the stud stands on (-1 when that brick is never attached), and `stepAboveAttr`, the step of the brick resting on it — -1 when there is none OR when that brick is never attached, both of which mean no partial build ever covers the stud — plus the same `stepCountAttr`. So 'stud is showing after step t' is `step` >= 0 and `step` <= t and (`stepAbove` < 0 or `stepAbove` > t), with no join downstream. Unwired, `studs` is an empty collection and `out` is unaffected. HALO: none — a piece is a fact about the whole build. Not GPU-eligible.",
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "studs", kind: "geometry", optional: true },
  ],
  outputs: [
    { name: "out", kind: "geometry" },
    { name: "studs", kind: "geometry" },
  ],
  params: {
    minAttr: {
      type: "string",
      default: "boundsMin",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each brick's minimum corner in WORLD units, as packBricks writes it. Refused, naming the point, unless every component lands on the lattice.",
    },
    maxAttr: {
      type: "string",
      default: "boundsMax",
      description:
        "POINT attribute (f32 or i32, tuple size 3) holding each brick's maximum corner in world units, on the same terms as `minAttr`.",
    },
    pitch: {
      type: "vec3",
      default: [1, 0.4, 1],
      description:
        "World size of one lattice cell: [stud, plate, stud], the same lattice the bricks were packed on. x and z must be equal and every component positive.",
    },
    origin: {
      type: "vec3",
      default: [0, 0, 0],
      description: "World position of a lattice corner, as for packBricks.",
    },
    islandAttr: {
      type: "string",
      default: "island",
      description:
        "POINT attribute (i32) receiving each brick's piece: 0 for the piece holding the lowest point identity, then 1, 2… in the same order. -1 on a zero-volume box. May not be empty. An existing column of another shape under this name is refused rather than replaced.",
    },
    stepAttr: {
      type: "string",
      default: "step",
      description:
        "POINT attribute (i32) receiving each brick's build step: the index of the bottom course at which it is placed, counting only courses at which some brick is placed, so steps run 0, 1, 2… with no gaps. -1 for a brick no order can attach (its piece never reaches the lowest course) and for a zero-volume box. May not be empty, and may not equal `islandAttr`. With `studs` wired, the same name is written on each stud: the step of the brick it stands on.",
    },
    stepAboveAttr: {
      type: "string",
      default: "stepAbove",
      description:
        "With `studs` wired, the POINT attribute (i32) receiving each stud's COVER step: the step of the brick resting on it (its `brickAbove`), so the stud stops showing once that step is built. -1 when no brick rests on it (`brickAbove` below 0) and when the one that does is never attached (step -1) — either way no partial build ever covers the stud, so `stepAbove` < 0 reads as 'never covered'. Must not be empty, equal `stepAttr`, or name `brickId` or `brickAbove`, the index columns it is read through. Ignored when `studs` is not wired.",
    },
    stepCountAttr: {
      type: "string",
      default: "stepCount",
      description:
        "DETAIL attribute (u32) receiving the number of build steps — the highest step plus 1, or 0 when there are no bricks (an empty input, or only zero-volume boxes; a brick on the lowest course is always placed, at step 0) — on `out`, and on `studs` when it is wired. It is the range a host's build-step slider runs over: every step from 0 to stepCount - 1 places at least one brick. Empty writes nothing; may not equal `islandsAttr`.",
    },
    islandsAttr: {
      type: "string",
      default: "",
      description:
        "Optional DETAIL attribute (u32) receiving the number of pieces; 1 is a build that lifts as one. Empty (the default) writes nothing. The same count packBricks' own `islandsAttr` gives for the bricks it packed.",
    },
  },
  execute({ inputs, params, checkCancelled }) {
    const { minAttr, maxAttr, islandAttr, stepAttr, islandsAttr, stepAboveAttr, stepCountAttr } = params;
    const { pitch, origin } = readLattice(CONNECT, params);
    if (islandAttr === "" || stepAttr === "") {
      throw new Error(
        `${CONNECT}: params "islandAttr" and "stepAttr" must both name a point attribute (the defaults are "island" and "step"); they are the two columns this node exists to write`,
      );
    }
    if (islandAttr === stepAttr) {
      throw new Error(
        `${CONNECT}: params "islandAttr" and "stepAttr" are both "${islandAttr}"; a brick's piece and its step are two facts and need two names`,
      );
    }
    if (stepCountAttr !== "" && stepCountAttr === islandsAttr) {
      throw new Error(
        `${CONNECT}: params "stepCountAttr" and "islandsAttr" are both "${stepCountAttr}"; the number of steps and the number of pieces are two counts and need two detail names (the default for "stepCountAttr" is "stepCount")`,
      );
    }
    // Whether the studs pin is wired decides which params matter: unwired,
    // `stepAboveAttr` is never read, and the node cooks exactly as it did
    // before the pin existed.
    const studSrc = optionalGeometry(inputs, "studs", CONNECT);
    if (studSrc !== undefined) {
      if (stepAboveAttr === "") {
        throw new Error(
          `${CONNECT}: param "stepAboveAttr" is empty, but pin "studs" is wired; name the stud column that receives the step of the brick resting on each stud (the default is "stepAbove"), or disconnect "studs"`,
        );
      }
      if (stepAboveAttr === stepAttr) {
        throw new Error(
          `${CONNECT}: params "stepAttr" and "stepAboveAttr" are both "${stepAttr}"; on a stud they are two facts — the step of the brick it stands on and of the brick resting on it — and need two names`,
        );
      }
      for (const [param, name] of [
        ["stepAttr", stepAttr],
        ["stepAboveAttr", stepAboveAttr],
      ] as const) {
        if (name === STUD_ON_ATTR || name === STUD_UNDER_ATTR) {
          throw new Error(
            `${CONNECT}: param "${param}" is "${name}", one of the two index columns ("${STUD_ON_ATTR}", "${STUD_UNDER_ATTR}") the studs are read through; writing a step over it would lose the index — pick another name, e.g. "${param === "stepAttr" ? "step" : "stepAbove"}"`,
          );
        }
      }
    }
    const src = requireGeometry(inputs, "in", CONNECT);
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: CONNECT,
      param: "islandAttr",
      name: islandAttr,
      type: "i32",
      tupleSize: 1,
      domain: "point",
      suggestion: "island",
    });
    requireReportSlot({
      attrs: src.attrs.point,
      nodeType: CONNECT,
      param: "stepAttr",
      name: stepAttr,
      type: "i32",
      tupleSize: 1,
      domain: "point",
      suggestion: "step",
    });
    if (islandsAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.detail,
        nodeType: CONNECT,
        param: "islandsAttr",
        name: islandsAttr,
        type: "u32",
        tupleSize: 1,
        domain: "detail",
        suggestion: "islands",
      });
    }
    if (stepCountAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.detail,
        nodeType: CONNECT,
        param: "stepCountAttr",
        name: stepCountAttr,
        type: "u32",
        tupleSize: 1,
        domain: "detail",
        suggestion: "stepCount",
      });
    }
    const loCol = cornerColumn(CONNECT, src, minAttr, "minAttr");
    const hiCol = cornerColumn(CONNECT, src, maxAttr, "maxAttr");
    const n = src.attrs.point.count;
    const studs =
      studSrc === undefined ? undefined : readStudIndices(studSrc, n, { stepAttr, stepAboveAttr, stepCountAttr });

    // ---- bricks to lattice cells --------------------------------------
    const lo = new Int32Array(n * 3);
    const hi = new Int32Array(n * 3);
    const solid = new Uint8Array(n);
    const gMin = [Infinity, Infinity, Infinity];
    const gMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      let empty = false;
      for (let c = 0; c < 3; c++) {
        const a = toCell(CONNECT, loCol.get(i, c), c, i, minAttr, pitch, origin);
        const b = toCell(CONNECT, hiCol.get(i, c), c, i, maxAttr, pitch, origin);
        if (b < a) {
          throw new Error(
            `${CONNECT}: point ${i} has ${maxAttr}.${"xyz"[c]} below ${minAttr}.${"xyz"[c]} (${hiCol.get(i, c)} < ${loCol.get(i, c)}); a brick's maximum corner must not be under its minimum — check which column is which`,
          );
        }
        if (b === a) empty = true;
        lo[i * 3 + c] = a;
        hi[i * 3 + c] = b;
      }
      if (empty) continue;
      solid[i] = 1;
      for (let c = 0; c < 3; c++) {
        gMin[c] = Math.min(gMin[c] as number, lo[i * 3 + c] as number);
        gMax[c] = Math.max(gMax[c] as number, hi[i * 3 + c] as number);
      }
    }

    const geo = deriveGeometry(src);
    const island = geo.attrs.point.replace(islandAttr, "i32", 1, NEVER).writable();
    const step = geo.attrs.point.replace(stepAttr, "i32", 1, NEVER).writable();
    const solids: number[] = [];
    for (let i = 0; i < n; i++) if (solid[i] === 1) solids.push(i);
    let work = 0;
    // Decided here, once: the closure below carries booleans, not names.
    const writeIslands = islandsAttr !== "";
    const writeStepCount = stepCountAttr !== "";
    // Both pins, once every brick's step is known. The detail counts go on
    // `out` in a fixed order — islands, then steps — and the studs read
    // their two steps straight out of the column just written.
    const finish = (steps: number, islands: number) => {
      if (writeIslands) geo.attrs.detail.replace(islandsAttr, "u32", 1, 0).set(0, islands);
      if (writeStepCount) geo.attrs.detail.replace(stepCountAttr, "u32", 1, 0).set(0, steps);
      if (studSrc === undefined || studs === undefined) return { out: [makeGeometryItem(geo)], studs: [] };
      const studGeo = deriveGeometry(studSrc);
      const sp = studGeo.attrs.point;
      const own = sp.replace(stepAttr, "i32", 1, NEVER).writable();
      const over = sp.replace(stepAboveAttr, "i32", 1, NEVER).writable();
      for (let k = 0; k < studs.on.length; k++) {
        if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
        own[k] = step[studs.on[k] as number] as number;
        const a = studs.above[k] as number;
        over[k] = a < 0 ? NEVER : (step[a] as number);
      }
      if (writeStepCount) studGeo.attrs.detail.replace(stepCountAttr, "u32", 1, 0).set(0, steps);
      return { out: [makeGeometryItem(geo)], studs: [makeGeometryItem(studGeo)] };
    };
    if (solids.length === 0) return finish(0, 0);
    const x0 = gMin[0] as number;
    const y0 = gMin[1] as number;
    const z0 = gMin[2] as number;
    const nx = (gMax[0] as number) - x0;
    const ny = (gMax[1] as number) - y0;
    const nz = (gMax[2] as number) - z0;
    const total = nx * ny * nz;
    if (total > MAX_CELLS) {
      throw new Error(
        `${CONNECT}: the bricks span ${nx} x ${ny} x ${nz} = ${total} lattice cells, above the limit of ${MAX_CELLS}; the grid is dense over their joint extent, so check "pitch" — a pitch ten times too small is a grid a thousand times too large — or split separate builds first (partitionByAttribute)`,
      );
    }
    const sxz = nx * nz;
    const at = (x: number, y: number, z: number): number => (y - y0) * sxz + (z - z0) * nx + (x - x0);

    // ---- occupancy: one brick per cell --------------------------------
    const brickAt = new Int32Array(total).fill(-1);
    for (const i of solids) {
      if ((++work & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      for (let y = lo[i * 3 + 1] as number; y < (hi[i * 3 + 1] as number); y++) {
        for (let z = lo[i * 3 + 2] as number; z < (hi[i * 3 + 2] as number); z++) {
          for (let x = lo[i * 3] as number; x < (hi[i * 3] as number); x++) {
            const k = at(x, y, z);
            const other = brickAt[k] as number;
            if (other >= 0) {
              throw new Error(
                `${CONNECT}: points ${other} and ${i} both cover lattice cell (${x}, ${y}, ${z}); bricks are solid and cannot overlap, so this is not one build — pack the boxes with packBricks first, or remove the duplicate`,
              );
            }
            brickAt[k] = i;
          }
        }
      }
    }

    // ---- clutch: a brick joins the bricks on its top face --------------
    // Recorded both ways and deduplicated per brick with a marker, since a
    // 2x4 under a 2x4 meets it at eight studs.
    const adj: number[][] = Array.from({ length: n }, () => []);
    const mark = new Int32Array(n).fill(-1);
    for (const i of solids) {
      const top = hi[i * 3 + 1] as number;
      if (top >= y0 + ny) continue;
      for (let z = lo[i * 3 + 2] as number; z < (hi[i * 3 + 2] as number); z++) {
        for (let x = lo[i * 3] as number; x < (hi[i * 3] as number); x++) {
          const j = brickAt[at(x, top, z)] as number;
          if (j < 0 || mark[j] === i) continue;
          mark[j] = i;
          (adj[i] as number[]).push(j);
          (adj[j] as number[]).push(i);
        }
      }
    }

    // ---- islands, numbered by their lowest identity -------------------
    const rank = canonicalPointRanks(src, CONNECT);
    const root = new Int32Array(n).fill(-1);
    const firstRank: number[] = [];
    const queue: number[] = [];
    for (const i of solids) {
      if (root[i] !== -1) continue;
      const r = firstRank.length;
      let best = rank[i] as number;
      root[i] = r;
      queue.length = 0;
      queue.push(i);
      for (let q = 0; q < queue.length; q++) {
        const b = queue[q] as number;
        best = Math.min(best, rank[b] as number);
        for (const nb of adj[b] as number[]) {
          if (root[nb] !== -1) continue;
          root[nb] = r;
          queue.push(nb);
        }
      }
      firstRank.push(best);
    }
    const order = firstRank.map((_, r) => r).sort((a, b) => (firstRank[a] as number) - (firstRank[b] as number));
    const islandId = new Int32Array(firstRank.length);
    order.forEach((r, id) => (islandId[r] = id));
    for (const i of solids) island[i] = islandId[root[i] as number] as number;

    // ---- steps: course by course, hanging bricks with what holds them --
    const byCourse = new Map<number, number[]>();
    for (const i of solids) {
      const c = lo[i * 3 + 1] as number;
      let list = byCourse.get(c);
      if (list === undefined) byCourse.set(c, (list = []));
      list.push(i);
    }
    const courses = [...byCourse.keys()].sort((a, b) => a - b);
    // A step is a course at which something is PLACED. A course whose only
    // bricks hang under a brick above places nothing itself — they go in
    // with what holds them — and numbering by course index left that step
    // empty, a gap in what the description promises runs 0, 1, 2…
    let s = 0;
    for (const course of courses) {
      checkCancelled();
      queue.length = 0;
      for (const i of byCourse.get(course) as number[]) {
        if (step[i] !== NEVER) continue;
        if (course === y0 || (adj[i] as number[]).some((nb) => step[nb] !== NEVER)) {
          step[i] = s;
          queue.push(i);
        }
      }
      // A brick placed now holds whatever hangs under it, and a brick of
      // this course resting on one of those is placed with them; one whose
      // course is still to come waits for it.
      for (let q = 0; q < queue.length; q++) {
        for (const nb of adj[queue[q] as number] as number[]) {
          if (step[nb] !== NEVER || (lo[nb * 3 + 1] as number) > course) continue;
          step[nb] = s;
          queue.push(nb);
        }
      }
      if (queue.length > 0) s++;
    }

    // `s` is the number of steps that placed something, which is the
    // highest step plus one: the lowest course always places something,
    // so with any solid brick it is at least 1.
    return finish(s, firstRank.length);
  },
});

/**
 * The two index columns of packBricks' `studs`, checked against the bricks
 * on `in`, plus the report slots brickConnectivity writes on the studs.
 * Every index is checked HERE, before the cook, so the write loop reads
 * them unguarded.
 */
function readStudIndices(
  studSrc: Geometry,
  brickCount: number,
  names: { readonly stepAttr: string; readonly stepAboveAttr: string; readonly stepCountAttr: string },
): { on: Int32Array; above: Int32Array } {
  const sp = studSrc.attrs.point;
  for (const [param, name, suggestion] of [
    ["stepAttr", names.stepAttr, "step"],
    ["stepAboveAttr", names.stepAboveAttr, "stepAbove"],
  ] as const) {
    requireReportSlot({ attrs: sp, nodeType: CONNECT, param, name, type: "i32", tupleSize: 1, domain: "point", suggestion });
  }
  if (names.stepCountAttr !== "") {
    requireReportSlot({
      attrs: studSrc.attrs.detail,
      nodeType: CONNECT,
      param: "stepCountAttr",
      name: names.stepCountAttr,
      type: "u32",
      tupleSize: 1,
      domain: "detail",
      suggestion: "stepCount",
    });
  }
  const read = (name: string): Int32Array => {
    const col = sp.get(name);
    if (col === undefined) {
      throw attributeNotFound(studSrc, "point", name, {
        prefix: `${CONNECT}: `,
        pin: "studs",
        on: 'the geometry on pin "studs"',
        suffix: ` — pin "studs" takes packBricks' "studs" output, which carries "${STUD_ON_ATTR}" and "${STUD_UNDER_ATTR}"`,
      });
    }
    if (col.type !== "i32" || col.tupleSize !== 1) {
      throw new Error(
        `${CONNECT}: pin "studs" carries "${name}" as ${col.type} with tuple size ${col.tupleSize}; it is an index into the bricks on pin "in", i32 with tuple size 1, as packBricks writes it — connect packBricks' "studs" output unchanged`,
      );
    }
    const out = new Int32Array(sp.count);
    for (let k = 0; k < sp.count; k++) out[k] = col.get(k);
    return out;
  };
  const on = read(STUD_ON_ATTR);
  const above = read(STUD_UNDER_ATTR);
  const range = `pin "in" carries ${brickCount} brick${brickCount === 1 ? "" : "s"}${brickCount > 0 ? ` (indices 0 to ${brickCount - 1})` : ""}`;
  const fix = `"studs" must be the studs output of the SAME packBricks whose "out" feeds "in", with nothing between them that drops or reorders bricks`;
  for (let k = 0; k < on.length; k++) {
    const b = on[k] as number;
    const a = above[k] as number;
    if (b < 0 || b >= brickCount) {
      throw new Error(`${CONNECT}: stud ${k} on pin "studs" has ${STUD_ON_ATTR} ${b}, but ${range}; ${fix}`);
    }
    if (a >= brickCount) {
      throw new Error(
        `${CONNECT}: stud ${k} on pin "studs" has ${STUD_UNDER_ATTR} ${a}, but ${range}, and below 0 means none; ${fix}`,
      );
    }
  }
  return { on, above };
}

/** The lattice params both nodes share, checked in the same words. */
interface LatticeParams {
  readonly minAttr: string;
  readonly maxAttr: string;
  readonly pitch: readonly number[];
  readonly origin: readonly number[];
}

function readLattice(
  who: string,
  params: LatticeParams,
): { pitch: readonly [number, number, number]; origin: readonly [number, number, number] } {
  const { minAttr, maxAttr } = params;
  const pitch = [params.pitch[0], params.pitch[1], params.pitch[2]] as const;
  const origin = [params.origin[0], params.origin[1], params.origin[2]] as const;
  if (minAttr === "" || maxAttr === "") {
    throw new Error(
      `${who}: params "minAttr" and "maxAttr" must both name a point attribute (the defaults are "boundsMin" and "boundsMax"); got "${minAttr}" and "${maxAttr}"`,
    );
  }
  if (minAttr === maxAttr) {
    throw new Error(
      `${who}: params "minAttr" and "maxAttr" are both "${minAttr}"; a box needs two corners from two columns`,
    );
  }
  for (let c = 0; c < 3; c++) {
    const p = pitch[c] as number;
    if (!Number.isFinite(p) || p <= 0) {
      throw new Error(
        `${who}: param "pitch" is [${pitch.join(", ")}]; every component is the world size of one lattice cell and must be positive and finite`,
      );
    }
    if (!Number.isFinite(origin[c] as number)) {
      throw new Error(`${who}: param "origin" is [${origin.join(", ")}]; every component must be finite`);
    }
  }
  if (pitch[0] !== pitch[2]) {
    throw new Error(
      `${who}: param "pitch" is [${pitch.join(", ")}], with x and z different; a stud is square, so a brick turned a quarter turn would leave the lattice — set pitch[0] and pitch[2] equal`,
    );
  }
  return { pitch, origin };
}

/**
 * Validates the flat catalogue — `bricks`, then `extraBricks` appended — and
 * expands it into sorted placements. An entry's index runs on across the
 * two lists, so an appended entry's `brickIndex` follows the last of
 * `bricks`.
 */
function readCatalogue(flat: readonly number[], extra: readonly number[]): Candidate[] {
  if (flat.length === 0 || flat.length % 3 !== 0) {
    throw new Error(
      `${NODE}: param "bricks" has ${flat.length} numbers; it is a flat list of [w, d, h] triples, so its length must be a positive multiple of 3, e.g. [2, 4, 3, 1, 1, 1]`,
    );
  }
  if (extra.length % 3 !== 0) {
    throw new Error(
      `${NODE}: param "extraBricks" has ${extra.length} numbers; it is a flat list of [w, d, h] triples appended to "bricks", so its length must be a multiple of 3 (empty, the default, adds nothing), e.g. [32, 32, 1] for a baseplate`,
    );
  }
  const base = flat.length / 3;
  const isDefault = flat.length === DEFAULT_BRICKS.length && flat.every((v, i) => v === DEFAULT_BRICKS[i]);
  /** "bricks" entry 4 / "extraBricks" entry 0, for messages. */
  const where = (e: number): string =>
    e < base ? `"bricks" entry ${e}${isDefault ? " (the default catalogue)" : ""}` : `"extraBricks" entry ${e - base}`;
  const out: Candidate[] = [];
  const seen = new Map<string, number>();
  for (let e = 0; e < base + extra.length / 3; e++) {
    const list = e < base ? flat : extra;
    const param = e < base ? "bricks" : "extraBricks";
    const local = e < base ? e : e - base;
    const w = list[local * 3] as number;
    const d = list[local * 3 + 1] as number;
    const h = list[local * 3 + 2] as number;
    for (const v of [w, d, h]) {
      if (!Number.isInteger(v) || v < 1) {
        throw new Error(
          `${NODE}: param "${param}" entry ${local} is [${w}, ${d}, ${h}]; studs and plates are whole numbers of at least 1`,
        );
      }
    }
    const key = `${Math.min(w, d)}x${Math.max(w, d)}x${h}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      if (e < base) {
        throw new Error(
          `${NODE}: param "bricks" entries ${prior} and ${e} are the same brick (${key}) — every entry is also tried a quarter turn round, so list it once`,
        );
      }
      if (prior >= base) {
        throw new Error(
          `${NODE}: param "extraBricks" entries ${prior - base} and ${local} are the same brick (${key}) — every entry is also tried a quarter turn round, so list it once`,
        );
      }
      throw new Error(
        `${NODE}: param "extraBricks" entry ${local} is [${w}, ${d}, ${h}], the same brick (${key}) as ${where(prior)} — "extraBricks" is APPENDED to "bricks", so the catalogue already has it (either way round); remove it from "extraBricks"`,
      );
    }
    seen.set(key, e);
    out.push({ index: e, fx: w, fz: d, h, area: w * d, turned: false });
    if (w !== d) out.push({ index: e, fx: d, fz: w, h, area: w * d, turned: true });
  }
  // Taller first, then larger footprint, then catalogue order, then as
  // listed before turned.
  out.sort(
    (a, b) => b.h - a.h || b.area - a.area || a.index - b.index || Number(a.turned) - Number(b.turned),
  );
  return out;
}

function cornerColumn(who: string, src: Geometry, name: string, param: string): Attribute {
  const col = src.attrs.point.get(name);
  if (col === undefined) throw attributeNotFound(src, "point", name, { prefix: `${who}: `, param });
  if ((col.type !== "f32" && col.type !== "i32") || col.tupleSize !== 3) {
    throw new Error(
      `${who}: param "${param}" names "${name}", which is ${col.type} with tuple size ${col.tupleSize}; a corner is f32 or i32 with tuple size 3, in world units`,
    );
  }
  return col;
}

/** World coordinate to lattice plane index, refused off the lattice. */
function toCell(
  who: string,
  v: number,
  axis: number,
  point: number,
  attr: string,
  pitch: readonly [number, number, number],
  origin: readonly [number, number, number],
): number {
  const t = (v - origin[axis]) / pitch[axis];
  const k = Math.round(t);
  if (!Number.isFinite(t) || Math.abs(t - k) > SNAP) {
    throw new Error(
      `${who}: point ${point}'s ${attr}.${"xyz"[axis]} is ${v}, which is ${t} cells from "origin" on a pitch of ${pitch[axis]} — not on the lattice. Every corner must be origin + a whole number of cells; set "pitch" and "origin" to the lattice the boxes were built on`,
    );
  }
  return k;
}

/** Both pins, with every column a caller reads, for a build of no cells. */
function emptyOutputs(src: Geometry, islandsAttr: string) {
  const make = (studs: boolean) => {
    const geo = gatherPoints(src, []);
    const p = geo.attrs.point;
    p.replace("P", "f32", 3, [0, 0, 0]);
    p.replace("rot", "f32", 4, [0, 0, 0, 1]);
    p.replace("scale", "f32", 3, [1, 1, 1]);
    p.replace("boundsMin", "f32", 3, [0, 0, 0]);
    p.replace("boundsMax", "f32", 3, [0, 0, 0]);
    p.replace(BRICK_ATTR, "string", 1, "");
    p.replace(BRICK_INDEX_ATTR, "i32", 1, 0);
    if (studs) {
      p.replace(STUD_ON_ATTR, "i32", 1, -1);
      p.replace(STUD_UNDER_ATTR, "i32", 1, -1);
    }
    return geo;
  };
  const bricks = make(false);
  if (islandsAttr !== "") bricks.attrs.detail.replace(islandsAttr, "u32", 1, 0).set(0, 0);
  return { out: [makeGeometryItem(bricks)], studs: [makeGeometryItem(make(true))] };
}
