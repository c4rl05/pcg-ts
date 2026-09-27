/**
 * The tower cooked a region at a time: the gates `bands.ts` streams by.
 *
 * A graph built with `Detail.region` is the same graph as the whole
 * tower's at that depth — every node the whole build has, under the SAME
 * id, in a graph of the SAME seed — plus a few filter nodes, the gates,
 * whose box is set per cell ({@link setRegion}). Nothing else changes, so
 * every node's seed, and so every jitter and every head's draw, is the
 * whole build's.
 *
 * TWO KINDS OF GATE, and only one of them is about correctness:
 *
 * - The SEAMS: each class part before its class merge keeps every
 *   primitive whose BOUNDING BOX meets the cell ({@link gateMesh}); each
 *   rivet set after its jitter keeps the heads SEATED in the cell
 *   (half-open, so abutting cells own a head exactly once). What a cell
 *   puts out is therefore defined as a subset of the whole cook's output.
 *   A mesh is kept by its box, not by "a vertex in the cell", because the
 *   page cuts the plain tower away inside a laced cell fragment by
 *   fragment (bandsView.ts): every triangle that passes THROUGH the cell
 *   must come out of it, and a long one (a belt girder's flat, up to
 *   160 m) can cross a cube with no vertex in it — 2,375 of them did at
 *   32 m, and each showed as a gap.
 * - The GATES, upstream, which make a cell cost a cell. Each drops the
 *   members (or points) further than its halo from the cell, so what lies
 *   below it is cooked for the region and not for the tower. A gate may
 *   only ever drop what cannot reach the cell's output: its halo is how
 *   far a member's output can stand from the gate's points (a gusset plate
 *   from its member's end, a head from its sample), and the seam test
 *   (`tests/eiffelBands.test.ts`) holds every cell to the whole cook, so a
 *   halo too small shows as a missing element, not as a look.
 *
 * Both kinds are one box filter each, so the gates are the only nodes a
 * regional build adds, and moving onto a cell is setting each one's box.
 *
 * WHERE A GATE MAY STAND. Every source that writes a point's `seed` from
 * its ARRAY INDEX (`pathResample`, `pathSegments`, `pointGrid`,
 * `pointList`, and a `copyToPoints` from such targets) must run on the
 * whole tower, and a
 * gate stands after it: filtering members before a resample renumbers
 * every sample after the first one dropped, which moves its jitter and
 * redraws its head. The filters themselves carry seeds unchanged. So a
 * gate goes after each resample, never before one.
 *
 * ONE INDEX-KEYED RULE STANDS AFTER A GATE, and is exact only by symmetry:
 * `latticeStruts` phases its two zigzags by `mod(index(), 2)` over the
 * gated samples, so a cell can swap a member's LaceA and LaceB (measured:
 * a fifth of the members in a cell). The two are the same point sequence
 * with the ends exchanged, merge into one class and jitter by position and
 * seed, so the bytes are the same set either way. Should the two zigzags
 * ever differ in anything but which is which, that rule must key on the
 * member instead (its own sample ordinal), or the seam test will say so.
 */
import { type Graph, type NodeHandle, filterByBounds, filterPrimitivesByBounds } from "pcg-ts";

/** A box, [min, max) per axis. */
export interface Region {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

/** No bounds: what a regional graph cooks before {@link setRegion}, the whole tower. */
const WHOLE = 1e7;

/** A box filter and how far outside the cell it still keeps, in metres (0 for a clip). */
interface Gate {
  readonly node: NodeHandle<{ boundsMin: number[]; boundsMax: number[] }>;
  readonly halo: number;
}

/** Each regional graph's gates: every node the regional build added to the whole graph's. */
const GATES = new WeakMap<Graph, Gate[]>();

/** Make `g` a regional graph: its gates and clips are built, and {@link setRegion} moves them. */
export function makeRegional(g: Graph): void {
  if (!GATES.has(g)) GATES.set(g, []);
}

/** Whether `g` was built regional. */
export function isRegional(g: Graph): boolean {
  return GATES.has(g);
}

function track(g: Graph, from: NodeHandle, node: NodeHandle, halo: number): NodeHandle {
  g.connect(from, "out", node, "in");
  (GATES.get(g) as Gate[]).push({ node: node as Gate["node"], halo });
  return node;
}

const whole = { boundsMin: [-WHOLE, -WHOLE, -WHOLE], boundsMax: [WHOLE, WHOLE, WHOLE] } as const;

/**
 * Keep the paths (or mesh primitives) with any vertex within `halo` of the
 * cell. Topology is kept and unreferenced points dropped, so what comes out
 * is still paths, each whole: a member is never cut. On a graph that is not
 * regional, `from` itself.
 */
export function gatePaths(g: Graph, id: string, from: NodeHandle, halo: number): NodeHandle {
  if (!isRegional(g)) return from;
  const node = g.add(
    filterPrimitivesByBounds,
    { ...whole, vertex: "any", mode: "inside", boundary: "halfOpen", unreferencedPoints: "drop" },
    id,
  );
  return track(g, from, node, halo);
}

/** Keep the points within `halo` of the cell (a point cloud; topology dropped). */
export function gatePoints(g: Graph, id: string, from: NodeHandle, halo: number): NodeHandle {
  if (!isRegional(g)) return from;
  const node = g.add(filterByBounds, { ...whole, mode: "inside", boundary: "halfOpen" }, id);
  return track(g, from, node, halo);
}

/**
 * THE SEAM FOR A MESH: keep every primitive whose BOUNDING BOX meets the
 * cell widened by `halo` — every triangle that can pass through it, with
 * or without a vertex in it (`filterPrimitivesByBounds` vertex
 * "boundingBox": the primitive's box closed, the cell's half-open, so
 * lo < max and hi >= min on every axis). The page cuts at the cell's faces
 * (bandsView.ts), so what a cell carries past them is never drawn; what it
 * must carry is every triangle that crosses it, and a clip by "a vertex in
 * the cell" lost 2,375 of those at 32 m. What comes out is the input's
 * primitives, byte for byte. On a graph that is not regional, `from`
 * itself.
 */
export function gateMesh(g: Graph, id: string, from: NodeHandle, halo: number): NodeHandle {
  if (!isRegional(g)) return from;
  const node = g.add(
    filterPrimitivesByBounds,
    { ...whole, vertex: "boundingBox", mode: "inside", boundary: "halfOpen", unreferencedPoints: "drop" },
    id,
  );
  return track(g, from, node, halo);
}

/** The seam for rivets: the heads seated in the cell itself, each owned by exactly one cell. */
export function clipHeads(g: Graph, id: string, from: NodeHandle): NodeHandle {
  return gatePoints(g, id, from, 0);
}

/** Move every gate of a regional graph onto `region` (each widened by its own halo). */
export function setRegion(g: Graph, region: Region): void {
  const gates = GATES.get(g);
  if (gates === undefined) throw new Error("eiffel region: setRegion on a graph not built with Detail.region");
  for (const { node, halo } of gates) {
    g.setParam(node, "boundsMin", region.min.map((v) => v - halo));
    g.setParam(node, "boundsMax", region.max.map((v) => v + halo));
  }
}

/** How many gates and clips `g` carries (0 for a whole-tower graph). */
export function gateCount(g: Graph): number {
  return GATES.get(g)?.length ?? 0;
}

/** The ids of every node the regional build added to the whole graph's: its gates, and nothing else. */
export function regionNodes(g: Graph): ReadonlySet<string> {
  return new Set((GATES.get(g) ?? []).map((gate) => gate.node.id));
}
