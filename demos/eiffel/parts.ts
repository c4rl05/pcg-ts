/**
 * The contract between the tower's modules and the graph that assembles
 * them: every module builds its members into finished MESH nodes and hands
 * them back sorted by class. The graph merges each class into one output,
 * so a render colours by class and an inspection counts by class.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { mergePrimitives } from "pcg-ts";

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
   * About 1.5M triangles more.
   */
  readonly lacedWeb?: boolean;
  /**
   * Rivets as instances (asset id {@link RIVET_ASSET}): one wherever a
   * lacing bar meets a chord. Implies `lacedWeb`. Around 1.5M instances.
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
 * What a module returns: its finished mesh nodes, by class, and any rivet
 * spawners, each named (a spawn call is capped at about a million
 * instances, so rivets come out as several outputs, `rivets.<name>`).
 */
export type Parts = Partial<Record<PartClass, NodeHandle[]>> & {
  rivets?: Array<{ name: string; spawn: NodeHandle }>;
};

/** Declare one graph output per class that has parts, named for the class. */
export function assemble(g: Graph, parts: Parts): void {
  for (const cls of PART_CLASSES) {
    const list = parts[cls];
    if (list === undefined || list.length === 0) continue;
    let out = list[0] as NodeHandle;
    if (list.length > 1) {
      out = g.add(mergePrimitives, {}, `${cls}Out`);
      for (const p of list) g.connect(p, "out", out, "in");
    }
    g.output(out, "out", cls);
  }
  for (const { name, spawn } of parts.rivets ?? []) g.output(spawn, "instances", `rivets.${name}`);
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
  }
  return out;
}
