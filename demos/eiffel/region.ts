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
 *   primitive whose BOUNDING BOX meets the cell, and those with a vertex
 *   within 2 m of it ({@link gateMesh}); each rivet set after its jitter
 *   keeps the heads SEATED in the cell (half-open, so abutting cells own a
 *   head exactly once). What a cell puts out is therefore defined as a
 *   subset of the whole cook's output. A mesh is kept by its box, not by
 *   "a vertex in the cell", because the page cuts the plain tower away
 *   inside a laced cell fragment by fragment (bandsView.ts): every triangle
 *   that passes THROUGH the cell must come out of it, and a long one (a
 *   belt girder's flat, up to 160 m) can cross a cube with no vertex in it
 *   — 2,375 of them did at 32 m, and each showed as a gap.
 * - The GATES, upstream, which make a cell cost a cell. Each drops the
 *   members (or points) further than its halo from the cell, so what lies
 *   below it is cooked for the region and not for the tower. A gate may
 *   only ever drop what cannot reach the cell's output: its halo is how
 *   far a member's output can stand from the gate's points (a gusset plate
 *   from its member's end, a head from its sample), and the seam test
 *   (`tests/eiffelBands.test.ts`) holds every cell to the whole cook, so a
 *   halo too small shows as a missing element, not as a look.
 *
 * WHERE A GATE MAY STAND. Every source that writes a point's `seed` from
 * its ARRAY INDEX (`pathResample`, `pathSegments`, `pointGrid`, and a
 * `copyToPoints` from such targets) must run on the whole tower, and a
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
import {
  type Graph,
  type NodeHandle,
  add,
  attribute,
  component,
  filterByBounds,
  filterPrimitivesByAttribute,
  filterPrimitivesByBounds,
  max,
  mergePrimitives,
  position,
  promoteAttribute,
  removeAttribute,
  setAttribute,
  sub,
  vec,
} from "pcg-ts";

/** A box, [min, max) per axis. */
export interface Region {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

/** No bounds: what a regional graph cooks before {@link setRegion}, the whole tower. */
const WHOLE = 1e7;

interface Gate {
  readonly node: NodeHandle;
  /** How far outside the cell the gate still keeps, in metres (0 for a clip). */
  readonly halo: number;
  /** A box test on points or vertices, or the bounding-box overlap of {@link gateMesh}. */
  readonly kind: "box" | "overlap";
}

interface Regional {
  readonly gates: Gate[];
  /** Every node the regional build added to the whole graph's. */
  readonly added: Set<string>;
}

const GATES = new WeakMap<Graph, Regional>();

/** Make `g` a regional graph: its gates and clips are built, and {@link setRegion} moves them. */
export function makeRegional(g: Graph): void {
  if (!GATES.has(g)) GATES.set(g, { gates: [], added: new Set() });
}

/** Whether `g` was built regional. */
export function isRegional(g: Graph): boolean {
  return GATES.has(g);
}

function track(g: Graph, node: NodeHandle, halo: number, kind: Gate["kind"] = "box"): NodeHandle {
  const r = GATES.get(g) as Regional;
  r.gates.push({ node, halo, kind });
  r.added.add(node.id);
  return node;
}

function added<H extends NodeHandle>(g: Graph, node: H): H {
  (GATES.get(g) as Regional).added.add(node.id);
  return node;
}

/** The per-primitive columns {@link gateMesh} measures a primitive by. */
const LO = "regionLo";
const HI = "regionHi";
const V0 = "regionV0";
const REACH = "regionReach";

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
  g.connect(from, "out", node, "in");
  return track(g, node, halo);
}

/** Keep the points within `halo` of the cell (a point cloud; topology dropped). */
export function gatePoints(g: Graph, id: string, from: NodeHandle, halo: number): NodeHandle {
  if (!isRegional(g)) return from;
  const node = g.add(filterByBounds, { ...whole, mode: "inside", boundary: "halfOpen" }, id);
  g.connect(from, "out", node, "in");
  return track(g, node, halo);
}

/**
 * Measure each primitive onto itself: its bounding box (`LO`, `HI`) and its
 * first vertex (`V0`), as primitive columns, the point copies removed.
 */
function measure(g: Graph, id: string, from: NodeHandle, withFirst: boolean): NodeHandle {
  let at = from;
  const step = <H extends NodeHandle>(node: H): H => {
    g.connect(at, "out", node, "in");
    at = added(g, node);
    return node;
  };
  const cols = withFirst ? ([[LO, "min"], [HI, "max"], [V0, "first"]] as const) : ([[LO, "min"], [HI, "max"]] as const);
  for (const [name, mode] of cols) {
    step(g.add(setAttribute, { name, type: "f32", tupleSize: 3, value: position() }, `${id}${name}`));
    step(g.add(promoteAttribute, { name, from: "point", to: "primitive", mode }, `${id}${name}Lift`));
  }
  step(g.add(removeAttribute, { names: cols.map(([n]) => n), domain: "point" }, `${id}Measured`));
  return at;
}

/**
 * The widest a primitive may be and still be gated by its vertices (see
 * {@link gateMesh}), metres.
 */
const SHORT = 2;

/**
 * THE SEAM FOR A MESH: keep every primitive whose BOUNDING BOX meets the
 * cell widened by `halo` — every triangle that can pass through it, with
 * or without a vertex in it — and, beside them, the primitives with a
 * vertex within {@link SHORT} of the cell. Two tests, so that no cell pays
 * a pass per primitive of the tower:
 *
 * - NEAR, a plain box test on the vertices widened by SHORT + `halo`. A
 *   primitive no wider than SHORT along each axis whose box meets the cell
 *   has every vertex within SHORT of it on each axis, so this keeps it.
 * - LONG, the primitives wider than SHORT (the uprights' and girders' long
 *   flats: a few thousand in the tower) that NEAR did not keep, tested by
 *   their box: each is measured onto itself (bounding box and first vertex
 *   v0), and kept when v0 lies in the cell's box moved out by its own reach
 *   from v0 — v0 >= min - (hi - v0) is hi >= min, and v0 < max + (v0 - lo)
 *   is lo < max — the overlap test `filterPrimitivesByBounds` asks with
 *   vertex "first" and a box per primitive. The long set is measured on
 *   the whole part, which on a part no gate upstream reaches is cooked once
 *   and served from the cache to every cell.
 *
 * The two are disjoint, and every column the measuring added is removed,
 * so what comes out is the input's primitives, byte for byte. The page
 * cuts at the cell's faces (bandsView.ts), so what a cell carries past
 * them is never drawn; what it must carry is every triangle that crosses
 * it, and a clip by "a vertex in the cell" lost 2,375 of those at 32 m.
 */
export function gateMesh(g: Graph, id: string, from: NodeHandle, halo: number): NodeHandle {
  if (!isRegional(g)) return from;
  const near = g.add(
    filterPrimitivesByBounds,
    { ...whole, vertex: "any", mode: "inside", boundary: "halfOpen", unreferencedPoints: "drop" },
    id,
  );
  g.connect(from, "out", near, "in");
  track(g, near, halo + SHORT);
  const far = g.add(
    filterPrimitivesByBounds,
    { ...whole, vertex: "any", mode: "outside", boundary: "halfOpen", unreferencedPoints: "drop" },
    `${id}Far`,
  );
  g.connect(longOnes(g, `${id}Long`, from), "out", far, "in");
  track(g, far, halo + SHORT);
  const crossing = g.add(
    filterPrimitivesByBounds,
    { ...whole, vertex: "first", mode: "inside", boundary: "halfOpen", unreferencedPoints: "drop" },
    `${id}Crossing`,
  );
  g.connect(measure(g, `${id}CrossingBox`, far, true), "out", crossing, "in");
  track(g, crossing, halo, "overlap");
  const crossed = added(g, g.add(removeAttribute, { names: [LO, HI, V0], domain: "primitive" }, `${id}CrossingDone`));
  g.connect(crossing, "out", crossed, "in");
  const both = added(g, g.add(mergePrimitives, {}, `${id}Both`));
  g.connect(near, "out", both, "in");
  g.connect(crossed, "out", both, "in");
  return both;
}

/** The primitives of `from` wider than {@link SHORT} along their widest axis. */
function longOnes(g: Graph, id: string, from: NodeHandle): NodeHandle {
  const extent = sub(attribute(HI, 3), attribute(LO, 3));
  const reach = added(
    g,
    g.add(
      setAttribute,
      {
        name: REACH,
        domain: "primitive",
        type: "f32",
        value: max(max(component(extent, 0), component(extent, 1)), component(extent, 2)),
      },
      `${id}Reach`,
    ),
  );
  g.connect(measure(g, `${id}Box`, from, false), "out", reach, "in");
  const kept = added(
    g,
    g.add(filterPrimitivesByAttribute, { attribute: REACH, comparison: "gt", value: SHORT, unreferencedPoints: "drop" }, id),
  );
  g.connect(reach, "out", kept, "in");
  const done = added(g, g.add(removeAttribute, { names: [LO, HI, REACH], domain: "primitive" }, `${id}Done`));
  g.connect(kept, "out", done, "in");
  return done;
}

/** The seam for rivets: the heads seated in the cell itself, each owned by exactly one cell. */
export function clipHeads(g: Graph, id: string, from: NodeHandle): NodeHandle {
  return gatePoints(g, id, from, 0);
}

/** Move every gate of a regional graph onto `region` (each widened by its own halo). */
export function setRegion(g: Graph, region: Region): void {
  const r = GATES.get(g);
  if (r === undefined) throw new Error("eiffel region: setRegion on a graph not built with Detail.region");
  for (const { node, halo, kind } of r.gates) {
    const min = region.min.map((v) => v - halo) as [number, number, number];
    const max = region.max.map((v) => v + halo) as [number, number, number];
    if (kind === "box") {
      const box = node as NodeHandle<{ boundsMin: number[]; boundsMax: number[] }>;
      g.setParam(box, "boundsMin", min);
      g.setParam(box, "boundsMax", max);
    } else {
      // Per primitive: the cell moved out by the primitive's reach from its
      // first vertex (see gateMesh).
      const box = node as NodeHandle<{ boundsMin: unknown; boundsMax: unknown }>;
      const v0 = attribute(V0, 3);
      g.setParam(box, "boundsMin", sub(vec(...min), sub(attribute(HI, 3), v0)));
      g.setParam(box, "boundsMax", add(vec(...max), sub(v0, attribute(LO, 3))));
    }
  }
}

/** How many gates and clips `g` carries (0 for a whole-tower graph). */
export function gateCount(g: Graph): number {
  return GATES.get(g)?.gates.length ?? 0;
}

/** The ids of every node the regional build added to the whole graph's. */
export function regionNodes(g: Graph): ReadonlySet<string> {
  return GATES.get(g)?.added ?? new Set();
}
