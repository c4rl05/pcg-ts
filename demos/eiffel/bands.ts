/**
 * DETAIL BY DISTANCE: the tower's two finer depths streamed around the
 * camera by the library's runtime, rather than cooked for the whole tower.
 *
 * The page's own cook is the whole tower, always present. Above it this
 * file stands a `World` of up to two cube-celled levels, either of which
 * the page may leave out ({@link BandsSpec}):
 *
 * - `laced`: every web member as four angles laced in X, with the gussets
 *   and the as-built uprights (`Detail.lacedWeb`), in {@link BANDS}.laced
 *   cells, cooked for the cells whose centre lies within its radius. The
 *   page's cook under it is the plain tower, cut away where a cell has
 *   arrived (bandsView.ts);
 * - `rivets`: every head (`Detail.rivets`), in the finer cells of
 *   {@link BANDS}.rivets, nearer still. Under a laced level a rivet cell
 *   cooks only once the laced cell holding it has (the World's parent
 *   rule), so heads never stand on a solid bar; alone, it is the top level,
 *   and the page's cook under it is already the laced tower whole, so it
 *   has nothing to wait on and the page nothing to cut.
 *
 * Each level cooks ONE regional graph (`region.ts`): the whole tower's
 * graph at that depth, node for node and seed for seed, whose gates the
 * level's `bind` moves onto the cell. So a cell is exactly the whole
 * cook inside it — `tests/eiffelBands.test.ts` holds every cell of both
 * levels to that, byte for byte — and what a cell costs is its own
 * members, not the tower's. The graph holds its latest cell's
 * intermediates and the tower-wide work above the gates (the members
 * and their resamples, which the gates must follow; region.ts), and
 * nothing else: an evicted cell's cook is gone with the next one.
 *
 * What a cell PUTS OUT: a laced cell the six classes the laced depth
 * changes ({@link LACED_CLASSES}), each as the primitives whose bounding
 * box meets the cell (region.ts `gateMesh`: so a member crossing a seam
 * comes out of both cells, whole, and one passing through a cell with no
 * vertex in it still comes out of it; the page clips at the seam); a
 * rivet cell every rivet set, each head in exactly one cell (its seat,
 * half-open).
 *
 * Two level options the library grew for this (src/runtime/types.ts):
 * `cellFilter`, because most cubes round a viewpoint are sky and each
 * would be a full pass of a graph that puts out nothing ({@link
 * inEnvelope}); and `keepOutputs: false`, because the page turns a cell
 * into its own buffers the moment it arrives, and the World keeping the
 * outputs too held every resident cell twice.
 *
 * No three.js here: the World runs off the page's thread (bandsWorker.ts),
 * and the tests drive this same file in Node.
 */
import { type CellContext, type Graph, type LevelDef, World, type WorldOptions } from "pcg-ts";
import { buildEiffel } from "./graph.js";
import type { CrossPlate, PartClass } from "./parts.js";
import { setRegion } from "./region.js";
import { profileAt } from "./spec.js";

/**
 * The classes whose geometry the laced depth changes; every other class is
 * the same at every depth (measured: identical triangle counts plain,
 * laced and riveted), so the page's plain cook draws it everywhere.
 */
export const LACED_CLASSES: readonly PartClass[] = ["uprights", "bracing", "horizontals", "girders", "arches", "gussets"];

/** One level's cube and how far out it is cooked, in metres. */
export interface BandSpec {
  readonly cell: number;
  readonly radius: number;
}

/**
 * The levels a bands World streams: a level left out is not streamed and
 * its graph is never built. At least one is present ({@link bandsLevels}
 * throws otherwise).
 */
export interface BandsSpec {
  readonly laced?: BandSpec;
  readonly rivets?: BandSpec;
}

/** Which levels to stream. */
export interface BandsWhich {
  readonly laced: boolean;
  readonly rivets: boolean;
}

/**
 * The defaults, from what a pixel holds [derived for the page's 42°
 * camera at 1080 rows: 0.71 mm a pixel per metre of distance]: a 45 mm
 * lacing bar is a pixel at 63 m and still reads as hatching well past it,
 * a 19 mm head is a pixel at 27 m. The laced radius sits past that, at
 * 180 m, so the lacing has arrived before the eye looks for it rather than
 * as it does. The cells are the World's cubes, laced twice the rivets' (a
 * level's cell must be finer than the one above it).
 */
export const BANDS: Required<BandsSpec> = {
  laced: { cell: 32, radius: 180 },
  rivets: { cell: 16, radius: 40 },
};

const BOTH: BandsWhich = { laced: true, rivets: true };

/**
 * Read `?bands=<laced radius>,<rivets radius>` over the defaults, keeping
 * only the levels in `which`. The radii are read by position whichever
 * levels are kept, so `?bands=,30` sets the rivets' alone.
 */
export function bandsFrom(param: string | null, which: BandsWhich = BOTH): BandsSpec {
  if (!which.laced && !which.rivets) {
    throw new Error("eiffel bands: bandsFrom was asked for neither level; ask for laced, rivets or both");
  }
  const [l, r] = (param ?? "").split(",").map(Number);
  const pick = (v: number | undefined, d: number): number => (v !== undefined && Number.isFinite(v) && v > 0 ? v : d);
  // No key at all for a level left out: the spec crosses to the worker by
  // structured clone, and `in` or `Object.keys` should not see a ghost.
  return {
    ...(which.laced ? { laced: { ...BANDS.laced, radius: pick(l, BANDS.laced.radius) } } : {}),
    ...(which.rivets ? { rivets: { ...BANDS.rivets, radius: pick(r, BANDS.rivets.radius) } } : {}),
  };
}

/** The levels `spec` streams; throws when it streams none. */
function levelsOf(spec: BandsSpec): BandsWhich {
  const which = { laced: spec.laced !== undefined, rivets: spec.rivets !== undefined };
  if (!which.laced && !which.rivets) throw new Error("eiffel bands: the spec streams neither level; give it laced, rivets or both");
  return which;
}

/** The finest cell `spec` streams, metres. */
export function finestCell(spec: BandsSpec): number {
  levelsOf(spec);
  return Math.min(spec.laced?.cell ?? Number.POSITIVE_INFINITY, spec.rivets?.cell ?? Number.POSITIVE_INFINITY);
}

/** The regional graphs a bands World cooks, and what each level puts out. A level not built is absent. */
export interface BandsGraphs {
  readonly laced?: Graph;
  readonly rivets?: Graph;
  /** Empty when `laced` is absent. */
  readonly lacedOutputs: readonly string[];
  /** Empty when `rivets` is absent. */
  readonly rivetOutputs: readonly string[];
}

/**
 * Build the regional graphs `which` asks for, at the page's by-eye plate
 * dimensions. Only those: each is the whole tower's graph construction,
 * paid for nothing when its level is not streamed.
 */
export function bandsGraphs(seed = 1889, crossPlate?: Partial<CrossPlate>, which: BandsWhich = BOTH): BandsGraphs {
  const plate = crossPlate === undefined ? {} : { crossPlate };
  const laced = which.laced ? buildEiffel(seed, { lacedWeb: true, region: true, ...plate }) : undefined;
  const rivets = which.rivets ? buildEiffel(seed, { rivets: true, region: true, ...plate }) : undefined;
  const declared = (g: Graph | undefined): string[] => g?.describe().outputs.map((o) => o.name) ?? [];
  return {
    ...(laced === undefined ? {} : { laced }),
    ...(rivets === undefined ? {} : { rivets }),
    lacedOutputs: declared(laced).filter((n) => (LACED_CLASSES as readonly string[]).includes(n)),
    rivetOutputs: declared(rivets).filter((n) => n.startsWith("rivets.")),
  };
}

/**
 * THE TOWER'S ENVELOPE, as the levels' `cellFilter`: most cubes round a
 * viewpoint are sky, and each one cooked would be a pass of the level's
 * graph that puts out nothing. A cube is kept when it reaches into the
 * square frustum the uprights' outer line bounds (`profileAt`, Plate XXXI)
 * widened by {@link ENVELOPE}.margin — which holds the 1st floor's
 * gallery 4 m past the line, the 2nd's 3 m — no narrower than the summit's
 * half-width, between the ground under the supports and the flag.
 * `tests/eiffelBands.test.ts` holds it to every element of the whole
 * cooks: one outside it would be dropped with no error.
 */
export const ENVELOPE = { margin: 6, summitHalf: 10, bottom: -10, top: 320 } as const;

/** Whether the cube `min`-`max` reaches into the tower's {@link ENVELOPE}. */
export function inEnvelope(cell: { readonly min: readonly number[]; readonly max: readonly number[] }): boolean {
  const [x0, y0, z0] = cell.min as [number, number, number];
  const [x1, y1, z1] = cell.max as [number, number, number];
  if (y1 <= ENVELOPE.bottom || y0 >= ENVELOPE.top) return false;
  // The line only narrows going up, so the widest the cube can meet is at its foot.
  const w = Math.max(profileAt(Math.max(y0, ENVELOPE.bottom)).outer, ENVELOPE.summitHalf) + ENVELOPE.margin;
  return x0 < w && x1 > -w && z0 < w && z1 > -w;
}

/** Move a level's graph onto the cell a World hands its bind. */
function bindCell(graph: Graph, ctx: CellContext): void {
  if (ctx.cellMode !== "xyz") throw new Error(`eiffel bands: level "${ctx.levelName}" is not a cube level`);
  setRegion(graph, { min: ctx.min, max: ctx.max });
}

/**
 * The levels `spec` streams, over the graphs {@link bandsGraphs} built:
 * `laced` above `rivets` when both (so a rivet cell waits on its laced
 * parent), else the one alone, as the top level.
 */
export function bandsLevels(graphs: BandsGraphs, spec: BandsSpec = BANDS): LevelDef[] {
  levelsOf(spec);
  const level = (name: BandLevel, band: BandSpec, graph: Graph | undefined, outputs: readonly string[]): LevelDef => {
    if (graph === undefined) {
      throw new Error(`eiffel bands: the spec streams "${name}" but its graph was not built; pass bandsGraphs a \`which\` with ${name}: true`);
    }
    return {
      name,
      cellSize: band.cell,
      cellMode: "xyz",
      generationRadius: band.radius,
      graph,
      cookOutputs: outputs,
      cellFilter: inEnvelope,
      keepOutputs: false,
      bind: bindCell,
    };
  };
  const levels: LevelDef[] = [];
  if (spec.laced !== undefined) levels.push(level("laced", spec.laced, graphs.laced, graphs.lacedOutputs));
  if (spec.rivets !== undefined) levels.push(level("rivets", spec.rivets, graphs.rivets, graphs.rivetOutputs));
  return levels;
}

/** A bands World: {@link bandsLevels} over fresh {@link bandsGraphs}, only the graphs `spec` streams built. */
export function bandsWorld(
  opts: Omit<WorldOptions, "seed" | "levels"> & { spec?: BandsSpec; crossPlate?: Partial<CrossPlate>; seed?: number } = {},
): { world: World; graphs: BandsGraphs } {
  const { spec = BANDS, crossPlate, seed, ...rest } = opts;
  const graphs = bandsGraphs(seed ?? 1889, crossPlate, levelsOf(spec));
  const world = new World({ seed: seed ?? 1889, levels: bandsLevels(graphs, spec), ...rest });
  return { world, graphs };
}

// ------------------------------------------------------------------ //
// Between the page and the worker that runs the World (bandsWorker.ts,
// bandsView.ts). Plain data and typed arrays, so a cell crosses by
// transfer, not by copy.
// ------------------------------------------------------------------ //

/** A cube cell of one level. */
export type BandLevel = "laced" | "rivets";

/** One attribute of a mesh a cell puts out, as `BufferAttribute` takes it. */
export interface AttrPayload {
  readonly name: string;
  readonly array: Float32Array | Uint32Array | Uint16Array | Int16Array | Uint8Array;
  readonly itemSize: number;
  readonly normalized: boolean;
}

/** One class mesh of a laced cell, ready for a `BufferGeometry`. */
export interface MeshPayload {
  readonly cls: PartClass;
  readonly attrs: readonly AttrPayload[];
  readonly index: Uint32Array | Uint16Array | null;
  /** Bounding sphere: x, y, z, radius. */
  readonly sphere: readonly [number, number, number, number];
  readonly triangles: number;
}

/** One rivet batch of a rivet cell: packed (rivetPack.ts), or why not and its matrices. */
export type RivetPayload =
  | {
      readonly name: string;
      readonly count: number;
      readonly at: Float32Array;
      readonly turn: Int16Array;
      readonly size: Uint16Array;
      readonly sphere: readonly [number, number, number, number];
    }
  | {
      readonly name: string;
      readonly count: number;
      readonly fallback: string;
      readonly transforms: Float32Array;
      readonly drive: Float32Array | undefined;
    };

/** Page to worker. */
export type BandsIn =
  | { readonly type: "start"; readonly spec: BandsSpec; readonly crossPlate: Partial<CrossPlate> }
  | { readonly type: "view"; readonly at: readonly [number, number, number] };

/** Worker to page. */
export type BandsOut =
  | {
      readonly type: "cell";
      readonly level: BandLevel;
      readonly coord: readonly [number, number, number];
      readonly meshes: readonly MeshPayload[];
      readonly rivets: readonly RivetPayload[];
      /** Worker milliseconds converting the cell's outputs for the page. */
      readonly convertMs: number;
    }
  | { readonly type: "evict"; readonly level: BandLevel; readonly coord: readonly [number, number, number] }
  | {
      readonly type: "status";
      /** Resident cells per level; 0 for a level the spec leaves out. */
      readonly laced: number;
      readonly rivets: number;
      readonly pending: number;
      readonly cooked: number;
      readonly evicted: number;
      /** The last update's wall time and whether it was cut short by a move. */
      readonly updateMs: number;
      readonly cancelled: number;
      /** The worker's JS heap, MB, where the browser reports one. */
      readonly heapMB: number | undefined;
      readonly buildMs: number;
    }
  | { readonly type: "error"; readonly message: string };
