/**
 * The contract between the tower's modules and the graph that assembles
 * them: every module builds its members into finished MESH nodes and hands
 * them back sorted by class. The graph merges each class into one output,
 * so a render colours by class and an inspection counts by class.
 */
import { type Graph, type NodeHandle, mergePrimitives } from "pcg-ts";

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
}

/** What a module returns: its finished mesh nodes, by class. */
export type Parts = Partial<Record<PartClass, NodeHandle[]>>;

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
}

/** Fold several modules' parts into one. */
export function joinParts(...all: Parts[]): Parts {
  const out: Parts = {};
  for (const parts of all) {
    for (const cls of PART_CLASSES) {
      const list = parts[cls];
      if (list !== undefined && list.length > 0) (out[cls] ??= []).push(...list);
    }
  }
  return out;
}
