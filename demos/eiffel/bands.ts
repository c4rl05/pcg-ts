/**
 * DETAIL BY DISTANCE: the tower's two finer depths streamed around the
 * camera by the library's runtime, rather than cooked for the whole tower.
 *
 * The page's own cook is the plain tower, whole and always present. Above
 * it this file stands a `World` of two cube-celled levels:
 *
 * - `laced`: every web member as four angles laced in X, with the gussets
 *   and the as-built uprights (`Detail.lacedWeb`), in {@link BANDS}.laced
 *   cells, cooked for the cells whose centre lies within its radius;
 * - `rivets`: every head (`Detail.rivets`), in the finer cells of
 *   {@link BANDS}.rivets, nearer still. A rivet cell cooks only once the
 *   laced cell holding it has (the World's parent rule), so heads never
 *   stand on a solid bar.
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

/** The cells and how far out each depth is cooked, in metres. */
export interface BandsSpec {
  readonly laced: { readonly cell: number; readonly radius: number };
  readonly rivets: { readonly cell: number; readonly radius: number };
}

/**
 * The defaults, from what a pixel holds [derived for the page's 42°
 * camera at 1080 rows: 0.71 mm a pixel per metre of distance]: a 45 mm
 * lacing bar is a pixel at 63 m and still reads as hatching well past it,
 * a 19 mm head is a pixel at 27 m. The cells are the World's cubes, laced
 * twice the rivets' (a level's cell must be finer than the one above it).
 */
export const BANDS: BandsSpec = {
  laced: { cell: 32, radius: 120 },
  rivets: { cell: 16, radius: 40 },
};

/** Read `?bands=<laced radius>,<rivets radius>` over the defaults. */
export function bandsFrom(param: string | null): BandsSpec {
  const [l, r] = (param ?? "").split(",").map(Number);
  const pick = (v: number | undefined, d: number): number => (v !== undefined && Number.isFinite(v) && v > 0 ? v : d);
  return {
    laced: { ...BANDS.laced, radius: pick(l, BANDS.laced.radius) },
    rivets: { ...BANDS.rivets, radius: pick(r, BANDS.rivets.radius) },
  };
}

/** The two regional graphs a bands World cooks, and what each level puts out. */
export interface BandsGraphs {
  readonly laced: Graph;
  readonly rivets: Graph;
  readonly lacedOutputs: readonly string[];
  readonly rivetOutputs: readonly string[];
}

/** Build the two regional graphs, at the page's by-eye plate dimensions. */
export function bandsGraphs(seed = 1889, crossPlate?: Partial<CrossPlate>): BandsGraphs {
  const plate = crossPlate === undefined ? {} : { crossPlate };
  const laced = buildEiffel(seed, { lacedWeb: true, region: true, ...plate });
  const rivets = buildEiffel(seed, { rivets: true, region: true, ...plate });
  const declared = (g: Graph): string[] => g.describe().outputs.map((o) => o.name);
  return {
    laced,
    rivets,
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

/** The two levels, over the graphs {@link bandsGraphs} built. */
export function bandsLevels(graphs: BandsGraphs, spec: BandsSpec = BANDS): LevelDef[] {
  return [
    {
      name: "laced",
      cellSize: spec.laced.cell,
      cellMode: "xyz",
      generationRadius: spec.laced.radius,
      graph: graphs.laced,
      cookOutputs: graphs.lacedOutputs,
      cellFilter: inEnvelope,
      keepOutputs: false,
      bind: bindCell,
    },
    {
      name: "rivets",
      cellSize: spec.rivets.cell,
      cellMode: "xyz",
      generationRadius: spec.rivets.radius,
      graph: graphs.rivets,
      cookOutputs: graphs.rivetOutputs,
      cellFilter: inEnvelope,
      keepOutputs: false,
      bind: bindCell,
    },
  ];
}

/** A bands World: {@link bandsLevels} over fresh {@link bandsGraphs}. */
export function bandsWorld(
  opts: Omit<WorldOptions, "seed" | "levels"> & { spec?: BandsSpec; crossPlate?: Partial<CrossPlate>; seed?: number } = {},
): { world: World; graphs: BandsGraphs } {
  const { spec, crossPlate, seed, ...rest } = opts;
  const graphs = bandsGraphs(seed ?? 1889, crossPlate);
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
