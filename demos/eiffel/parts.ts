/**
 * The contract between the tower's modules and the graph that assembles
 * them: every module builds its members into finished MESH nodes and hands
 * them back sorted by class. The graph merges each class into one output,
 * so a render colours by class and an inspection counts by class.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { jitterPoints, mergePrimitives } from "pcg-ts";

export const PART_CLASSES = [
  /** The corner uprights ("arbalétriers") of the legs and the shaft. */
  "uprights",
  /** The web: every diagonal of every braced panel. */
  "bracing",
  /** Horizontal struts at the panel nodes (and mid-panel in panels 1-4). */
  "horizontals",
  /** Lattice girders: the belts at the floors and the girders between legs. */
  "girders",
  /** The four decorative arches and their arcade. */
  "arches",
  /** Floor platforms and the landing. */
  "platforms",
  /** The masonry pedestals. */
  "masonry",
  /** Everything above the 3rd floor, and the 3rd-floor room. */
  "summit",
  /** Gusset plates where web members meet the uprights. */
  "gussets",
  /** The 72 names on the first-floor skirt, gilded. */
  "names",
] as const;

export type PartClass = (typeof PART_CLASSES)[number];

/** How much of the tower's self-similar depth to build. */
export interface Detail {
  /**
   * Build the web bars and horizontal struts as laced lattice struts
   * (four corner angles and X lacing) instead of solid square members.
   * About 2.9M triangles more (0.41M to 3.28M).
   */
  readonly lacedWeb?: boolean;
  /**
   * Rivets as instances (asset id {@link RIVET_ASSET}): one wherever a
   * lacing bar meets a chord, along the box members' seams, and over the
   * gusset plates. Implies `lacedWeb`. About 860,000 instances.
   */
  readonly rivets?: boolean;
}

/**
 * The asset id every rivet spawns. A rivet's instance matrix carries its
 * true size, so the host's asset is a UNIT round head: a dome of base
 * radius 1 on local y = 0, rising along +y, the rivet's axis, out of the
 * plate.
 */
export const RIVET_ASSET = "rivet";

/**
 * One millimetre: the most any built position moves, per axis (plus one
 * f32 ULP, which the store adds and which matters at 300 m, where the ULP
 * is 15 µm — see the bound in `tests/eiffelSkeleton.test.ts`).
 *
 * The tower is drawn from ONE set of dimensions, so faces meet exactly —
 * a gusset lies on the upright it plates, a member's end face lies on the
 * horizontal it lands on, and the arch's foot lies 0.2 mm inside the
 * pedestal's box face (SOURCES.md §17.2). Coplanar is the one thing a
 * depth buffer cannot resolve, and the page's logarithmic buffer only
 * moves where it fails, not whether. Its resolution is set by `far`
 * ALONE — that is what log depth buys, and `near` does not enter it: the
 * depth written is log2(1 + w) / log2(1 + far), so one step of a 24-bit
 * buffer is (1 + w) ln(1 + far) / 2^24. With `far` 2000 that is 0.27 mm
 * at the 608 m the page opens on and 0.68 mm at the 1500 m it lets the
 * camera back out to, so faces that agree to the millimetre flicker
 * against each other as the camera turns — which is what the tower's own
 * dimensions make of every joint. (24 bits is what a desktop browser
 * gives; three.js asks only for `depth: true`. On a 16-bit buffer that
 * step is 70 mm at 600 m and nothing this file can do would help.)
 *
 * WHAT A MILLIMETRE ACTUALLY BUYS, measured rather than asserted: of the
 * 13,716 gusset points that lay exactly in an upright's face plane at the
 * laced depth, none still does, and about three quarters end up more than
 * one depth step clear at the opening pose. The rest still fight, but
 * over part of a face and differently across it rather than the whole
 * face at once. Raising the figure would not fix the tail and would widen
 * the cracks below.
 *
 * WHAT IT COSTS. {@link jitter} is keyed on POINT IDENTITY — the position
 * bits together with the point's `seed` — not on the array slot, so this
 * is a property of the built tower rather than of a cook order. Two
 * points that coincide AND share a seed move together and stay welded;
 * two that coincide with DIFFERENT seeds part company, and about two
 * fifths of the coincident pairs inside a single class are of that kind,
 * opening cracks of a millimetre or so (3 mm at the worst) where one
 * member lands on another. That is a fifth of a pixel at the poses this
 * page opens on and about a pixel at the guide's closest figure; it is
 * ~20 px if the camera is driven all the way in to `minDistance`, 0.2 m,
 * which is the one place this trade is visible.
 */
export const JITTER = 0.001;

/**
 * Move every point of `geo` off its plane by at most {@link JITTER}.
 *
 * Each jitter node carries its own seed (the graph's, folded with the
 * node's id), so two faces that coincide in DIFFERENT classes — a gusset
 * on an upright — always part company. Within one class it depends on the
 * points' seeds: identical seeds stay welded, different ones part. See
 * {@link JITTER} for what that costs.
 */
export function jitter(g: Graph, id: string, geo: NodeHandle): NodeHandle {
  const node = g.add(jitterPoints, { amount: [JITTER, JITTER, JITTER] }, id);
  g.connect(geo, "out", node, "in");
  return node;
}

/**
 * What a module returns: its finished mesh nodes, by class, and any rivet
 * spawners, each named. Every rivet set builds its own spawner, so rivets
 * come out as several outputs, `rivets.<name>` (41 at full detail); one
 * spawn is also capped at MAX_INSTANCES, 1,048,576.
 *
 * `cars` is the one thing here the graph does NOT settle in place: a lift
 * car is a body the host moves, so each comes out as its own output,
 * `car.<name>`, rather than merged into a class where it would be welded
 * to the floor it passes. `lifts.ts` publishes the run each one rides
 * (`LIFT_CARS`); the graph owns where a car CAN be and the page owns when.
 */
export type Parts = Partial<Record<PartClass, NodeHandle[]>> & {
  rivets?: Array<{ name: string; spawn: NodeHandle }>;
  cars?: Array<{ name: string; mesh: NodeHandle }>;
};

/**
 * Declare one graph output per class that has parts, named for the class,
 * each {@link jitter}ed off the planes its neighbours share.
 */
export function assemble(g: Graph, parts: Parts): void {
  for (const cls of PART_CLASSES) {
    const list = parts[cls];
    if (list === undefined || list.length === 0) continue;
    let out = list[0] as NodeHandle;
    if (list.length > 1) {
      out = g.add(mergePrimitives, {}, `${cls}Out`);
      for (const p of list) g.connect(p, "out", out, "in");
    }
    g.output(jitter(g, `${cls}Jitter`, out), "out", cls);
  }
  for (const { name, spawn } of parts.rivets ?? []) g.output(spawn, "instances", `rivets.${name}`);
  for (const { name, mesh } of parts.cars ?? []) {
    g.output(jitter(g, `${carId(name)}Jitter`, mesh), "out", `car.${name}`);
  }
}

/** A car's node ids, from its name: `roux.ouest` -> `carRouxOuest`. */
function carId(name: string): string {
  return `car${name
    .split(".")
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join("")}`;
}

/** Fold several modules' parts into one. */
export function joinParts(...all: Parts[]): Parts {
  const out: Parts = {};
  for (const parts of all) {
    for (const cls of PART_CLASSES) {
      const list = parts[cls];
      if (list !== undefined && list.length > 0) (out[cls] ??= []).push(...list);
    }
    if (parts.rivets !== undefined) (out.rivets ??= []).push(...parts.rivets);
    if (parts.cars !== undefined) (out.cars ??= []).push(...parts.cars);
  }
  return out;
}
