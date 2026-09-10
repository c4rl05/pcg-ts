/**
 * The cave's one level, kept renderer-free so a test can build it.
 *
 * WHAT IS DIFFERENT ABOUT THIS LEVEL, and it is the reason the demo
 * exists. Every other level in this repo streams INSTANCES: a graph
 * scatters points, a spawner turns them into batches, and the binding
 * draws one instanced mesh per asset. This one streams a SURFACE. The
 * graph is a single node with no inputs at all — `meshFromField` walks a
 * lattice, asks a noise for a value at every corner, and emits the
 * triangles where that value crosses a threshold — and the cell's whole
 * output is one geometry item.
 *
 * IT IS ALSO THE FIRST `cellMode: "xyz"` LEVEL IN THE REPO. Every other
 * one partitions the XZ plane and leaves Y unbounded, which is right for
 * ground cover and wrong for a volume: a cave has as much above and below
 * as it has around, so the cells are cubes and a coordinate is
 * `[cx, cy, cz]`. `xzCell` cannot narrow one of those — its `min` and
 * `max` are 3-tuples rather than 2 — so `bind` narrows on the
 * discriminant itself.
 *
 * NO HALO, and that is a claim rather than an omission. A tetrahedron's
 * triangles come from its cube's eight corner samples and nothing else,
 * and the lattice is anchored to the WORLD rather than to the bounds it
 * was handed, so cube `(i, j, k)` is the same cube with the same corners
 * at the same positions in every cell that reaches it. There is no
 * neighbour to consult, so there is nothing for a halo to widen.
 */
import {
  Graph,
  fbm,
  meshFromField,
  simplexNoise,
  type Field,
  type LevelDef,
  type MeshFromFieldParams,
  type NodeHandle,
} from "pcg-ts";

/** How the cave is shaped; every one of these is on the panel. */
export interface CaveOptions {
  /** World units per cube cell — the unit of streaming. */
  readonly cellSize: number;
  /** Cells generate when their centre comes within this of the camera. */
  readonly generationRadius: number;
  /** Lattice cube edge, in world units. Detail against cost. */
  readonly lattice: number;
  /** Where the surface sits in the noise: more means more rock. */
  readonly threshold: number;
  /** Noise frequency — the size of the caverns. */
  readonly frequency: number;
  /** World seed, so the panel's seed box moves the rock. */
  readonly seed: number;
}

/**
 * The shape of the cave, as a field.
 *
 * Exported because the page uses it TWICE and it matters that it is the
 * same object both times: once as the thing `meshFromField` contours into
 * the walls you see, and once as the thing the camera asks "is there rock
 * that way" before it steers. A field is a function you can evaluate
 * anywhere, not a baked artifact, so the flight and the geometry cannot
 * drift apart — there is nothing for them to disagree about.
 */
export function caveField(opts: Pick<CaveOptions, "frequency" | "seed">): Field<1> {
  return fbm(simplexNoise, {
    octaves: 4,
    frequency: opts.frequency,
    normalized: true,
    seed: opts.seed,
  });
}

/** Handles the demo needs to re-bind without rebuilding the graph. */
export interface CaveLevel {
  readonly level: LevelDef;
  readonly graph: Graph;
  /** The same field the graph contours, for the camera to probe. */
  readonly field: Field<1>;
}

export function makeCaveLevel(opts: CaveOptions): CaveLevel {
  const graph = new Graph();
  const field = caveField(opts);
  // Four octaves, normalized, so `threshold` reads as a fraction rather
  // than as a number whose useful range you have to know. The field is
  // built with the COMBINATOR api and still carries a spec, which is what
  // lets `meshFromField` screen it for position-purity — a field that
  // read `fraction` or `index` would sample a different shape in every
  // cell, and the node refuses one rather than letting the seams tell you.
  const rock: NodeHandle<MeshFromFieldParams> = graph.add(
    meshFromField,
    {
      isoValue: opts.threshold,
      cellSize: opts.lattice,
      // `below` is solid, so the normals point away from the rock and
      // into the space the camera is flying through.
      inside: "below",
      field,
    },
    "rock",
  );
  graph.output(rock, "out", "rock");

  return {
    graph,
    field,
    level: {
      name: "cave",
      cellMode: "xyz",
      cellSize: opts.cellSize,
      generationRadius: opts.generationRadius,
      graph,
      bind(g, ctx) {
        // Narrowed on the discriminant, not through `xzCell`: an xyz
        // context's `min`/`max` are 3-tuples, and reading one through the
        // 2-tuple branch is a bug this repo has made before.
        if (ctx.cellMode !== "xyz") {
          throw new Error(`cave: expected an xyz cell context, got "${ctx.cellMode}"`);
        }
        // THE ONLY THING THAT VARIES PER CELL. Not the seed — the field
        // is anchored to the world, so a cell asks about its own cube of
        // a shape that was already there. That is what makes two cells
        // agree at the seam without either knowing the other exists.
        g.setParam(rock, "boundsMin", [ctx.min[0], ctx.min[1], ctx.min[2]]);
        g.setParam(rock, "boundsMax", [ctx.max[0], ctx.max[1], ctx.max[2]]);
      },
    },
  };
}
