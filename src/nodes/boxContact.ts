/**
 * `boxContact`: the CONTEXT QUERY of a split grammar, as one node. For
 * every box in one set (the queries), does it overlap, touch, contain or
 * sit inside any box of another set (the targets)? The answer is written
 * onto the query points as attributes, and nothing else changes.
 *
 * WHAT IT REPLACES. The brick house asks "is anything standing in front of
 * this window?" with four nodes: a probe point moved half a stud out of the
 * wall, a direction attribute for the fan, a `pathCoverage` ray fan with
 * near = far = 0 (rays of no length, so a fan of containment tests), and an
 * occluder cloud whose P had to be moved to each box's centre because the
 * ray test reads boxes as P plus a size. The fan needed a ray per stud of
 * the widest opening, and `rayCount` takes no field, so it was sized for
 * the param's MAXIMUM. Those four are one box-against-boxes question, and
 * this node asks it directly: the bay's own box, its outward face pushed
 * half a stud out and the rest pulled in to the opening (`marginMin` /
 * `marginMax`, one face each), against the occluders' own boxes. Measured
 * on the house (graph 102 -> 99 nodes): with "touch" and those two margins
 * built from the old probe's own expression, 0 of 924 bays over 20 seeds
 * change, and the bricks, studs and pots are identical. The bay's whole
 * box grown symmetrically is NOT that query (it spans the storey, so a
 * lower roof under the sill blocks it: 44 of 924 bays change). The
 * chimney's "shadow" box stays: it is a keep-out volume on the TARGET side,
 * reaching below the stack, which no margin on the query can express.
 * "touch" is right for a zero-thickness probe; for a solid query box,
 * "overlap", or a box stacked on the one below touches it.
 *
 * THE TESTS ARE EXACT, rotated boxes included: the overlap and touch modes
 * are the separating-axis test on all fifteen axes of two oriented boxes,
 * and the containment modes are the support-extent test along the outer
 * box's three axes, which is exact for a box in a box. Two
 * approximations exist on the ORIENTED path only, each stated where it
 * lives: near-parallel edge axes (`PARALLEL_EPS`) and the boundary band
 * that reads a contact as a contact through rounding (`BOUNDARY_REL`).
 *
 * ACCELERATION is a uniform grid per size class of target (`buildLevels`),
 * so a mix of sizes stays near linear. It is this file's own `CellIndex`
 * rather than `src/spatial`'s `UniformGrid`: that one keys its cells by
 * STRING, and at 160k boxes its lookups were 68% of the cook and grew
 * faster than the count (measured: x2.5 to x3 per doubling); numeric keys
 * in an open-addressed table with the members laid out per cell do not.
 * KNOWN COST: a query whose reach is far beyond a level's cell (sized from
 * the MEDIAN query) and which lands inside that level's occupied range
 * reads every target of the level, so many giant queries among many small
 * targets are O(giant queries x targets). Over empty space they cost
 * nothing: the walk is clamped to the occupied cells' range.
 * The grids change what an answer COSTS and never what it is — the
 * prefilter is a bounding-sphere inequality, sound by the triangle
 * inequality, with a slack that only ever admits more candidates.
 *
 * DETERMINISM. Nothing is drawn and nothing is accumulated in floating
 * point. A query's count is the number of distinct targets that pass, and
 * its nearest target is the lowest index among the hits within a tie band
 * of the least centre distance (`NEAREST_TIE_REL`), so neither depends on
 * the order the grids hand candidates over.
 *
 * THE PAIRS. `targetAttr` names ONE target per query, so a floor plan
 * cannot ask "which wall do these two rooms share" of it. The `pairs` pin
 * (on demand: built only when wired or declared, see `PinDef.onDemand`)
 * is the whole relation, one point per (query, target) hit, sorted by
 * query and then target index so the grids' order never shows. In the
 * world frame each pair's box is the intersection of the two boxes as
 * tested, and under "touch" a contact across exactly one face carries
 * that face's frame in shellSplit's vocabulary, so placeBox's "face"
 * frame puts a door on every shared wall (`writePairs`). The local frame
 * writes no region: two oriented boxes intersect in a convex polytope,
 * which a box would misstate. `out` is computed before and apart from
 * any of this, so it is the same bytes whether `pairs` is read or not.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { type Attribute, type Geometry, createPointCloud } from "../data/index.js";
import { STANDARD_POINT_ATTRS } from "../data/points.js";
import { deriveGeometry } from "../data/derive.js";
import { makeGeometryItem } from "../graph/index.js";
import { hashCombine } from "../random/index.js";
import type {
  BoxContactInputs,
  BoxContactOutputs,
  BoxContactParams,
} from "./params.generated.js";
import { standardNode } from "./registry.js";
import {
  CANCEL_STRIDE,
  readComp,
  requireFinitePlainParam,
  requireGeometry,
  requireReportSlot,
  requireVec3Column,
  resolveOn,
  rotateVec,
} from "./util.js";

// Generated from the param schemas below; see params.generated.ts.
export type { BoxContactParams } from "./params.generated.js";

const NODE = "boxContact";

const MODES = ["overlap", "touch", "contain", "inside"] as const;
const FRAMES = ["world", "local"] as const;

/** Mode codes, decided once from the `mode` string. */
const OVERLAP = 0;
const TOUCH = 1;
const CONTAIN = 2;
const INSIDE = 3;
type ModeCode = 0 | 1 | 2 | 3;

/**
 * THE FIRST APPROXIMATION. A cross axis `A_a x B_b` of the separating-axis
 * test has length sin(angle) between the two edges; when the edges are
 * parallel it is the zero vector and is no axis at all, so it is skipped.
 * It is skipped from 1 - cos^2 < 1e-12, i.e. edges within 1e-6 rad of
 * parallel, because below that the axis is rounding noise. Skipping a
 * genuine axis can only turn "apart" into "meet", and only where two
 * near-parallel edges are the sole thing separating the boxes: the gap such
 * an axis could prove is at most about 1e-6 of the boxes' size.
 */
const PARALLEL_EPS = 1e-12;

/** Relative slack on the bounding-sphere prefilter: admits, never drops. */
const SPHERE_SLACK = 1e-9;

/**
 * THE BOUNDARY TOLERANCE of the ORIENTED path, relative to the pair's
 * scale (the larger centre coordinate plus both boxes' half-extents). Two
 * boxes with one P and one rot that share a face share it EXACTLY in the
 * reals, but each centre is rotated on its own and picks up ~1e-16 of
 * rounding, so without this a face contact was "overlap" at about a third
 * of random rotations and missed by "touch" at about half (measured by the
 * independent verification of this node). Within this band a comparison
 * is read as EQUALITY — contact, not overlap; contained, boundary
 * included. In both directions, so it is the SECOND approximation: a real
 * gap inside the band is a touch, and a real overlap inside it is not an
 * overlap. On an edge-edge axis both sides of the comparison are distances
 * times that axis' length, sin of the angle between the edges, so the band
 * is scaled by it too; unscaled it widened to band / sin, up to ~1e-6 of the
 * pair's size near parallel. The axis-aligned path uses no band: it
 * compares the corners' own arithmetic directly.
 */
const BOUNDARY_REL = 1e-12;

/**
 * NEAREST-TARGET TIES. Two targets at the same true distance from a rotated
 * query come out of the rotation ~1e-16 apart, so "ties go to the lowest
 * index" needs a band, and the band is scaled like the error it absorbs. A
 * centre coordinate of magnitude C carries a rounding error d ~ eps * C, so
 * a squared distance D = |delta|^2 is off by about 2 * sqrt(D) * d + d^2.
 * The band is therefore REL * (D + 2 * C * sqrt(D)) + (REL * C)^2, with
 * D the least squared distance, C the largest coordinate of the query's
 * centre, and REL = 1e-12, some 4500 times eps. Squared distances inside it
 * count as equal, and the lowest index among them wins. A band of
 * REL * (D + C^2) was too wide: it grew with C^2 rather than C * sqrt(D),
 * so at C = 1000 a target 50% farther, a tenth of a millimetre out, tied
 * with the nearer one and could win.
 */
const NEAREST_TIE_REL = 1e-12;

/** Cell coordinates past this are folded by widening the cell (cost only). */
const CELL_COORD_LIMIT = 2 ** 29;

/**
 * The ceiling on the `pairs` output, segmentCrossings' own for its
 * one-point-per-pair cloud. A pair point is ~112 bytes (the standard
 * columns plus the six this node adds), so this is ~120 MB; past it the
 * query is almost certainly every box against every box — a margin on the
 * scale of the layout — rather than a relation anyone will read.
 */
const MAX_PAIRS = 1_048_576;

/** The `pairs` columns' default names; the frame four are shellSplit's. */
const PAIR_DEFAULT_NAMES = {
  pairQueryAttr: "queryIndex",
  pairTargetAttr: "targetIndex",
  pairOutwardAttr: "outward",
  pairOutAxisAttr: "outAxis",
  pairAlongAxisAttr: "alongAxis",
  pairAlongSignAttr: "alongSign",
} as const;

/** A growable i32 column for the pair list (SoA, never per-pair objects). */
class PairBuffer {
  q = new Int32Array(1024);
  t = new Int32Array(1024);
  count = 0;

  /** Append query `i`'s hits, SORTED by target index: the grids' order never shows. */
  push(i: number, hits: readonly number[]): void {
    const c = hits.length;
    const need = this.count + c;
    if (need > this.q.length) {
      let cap = this.q.length;
      while (cap < need) cap *= 2;
      const q = new Int32Array(cap);
      const t = new Int32Array(cap);
      q.set(this.q.subarray(0, this.count));
      t.set(this.t.subarray(0, this.count));
      this.q = q;
      this.t = t;
    }
    for (let k = 0; k < c; k++) this.t[this.count + k] = hits[k];
    this.t.subarray(this.count, need).sort();
    this.q.fill(i, this.count, need);
    this.count = need;
  }
}

/**
 * A uniform grid over a fixed set of points with NUMERIC cell keys: each
 * point's cell (floor(coordinate / cell) per axis) goes into an
 * open-addressed hash table of the occupied cells, and the points are laid
 * out cell by cell (counting sort), so a lookup is a few integer probes and
 * a contiguous run. `queryUnordered` returns every point within `radius` of
 * a position (boundary included), each once, in no particular order — the
 * caller's answer must not depend on the order, and boxContact's does not.
 * Built once per cook and never mutated.
 */
class CellIndex {
  private readonly inv: number;
  private readonly cell: number;
  private readonly pos: Float64Array;
  private readonly count: number;
  /** Hash table: slot -> cell id + 1 (0 = empty). */
  private readonly table: Int32Array;
  private readonly mask: number;
  /** Per cell id: its integer coordinates, and its run in `items`. */
  private readonly cx: Int32Array;
  private readonly cy: Int32Array;
  private readonly cz: Int32Array;
  private readonly start: Int32Array;
  private readonly items: Int32Array;
  private readonly cells: number;
  /** The occupied cells' range per axis: a query block is clamped to it. */
  private readonly lo: Int32Array;
  private readonly hi: Int32Array;

  constructor(pos: Float64Array, count: number, cell: number) {
    let maxAbs = 0;
    for (let k = 0; k < count * 3; k++) maxAbs = Math.max(maxAbs, Math.abs(pos[k]));
    // Keep every cell coordinate inside Int32 by widening the cell when the
    // spread demands it; a wider cell only costs candidates.
    if (maxAbs / cell > CELL_COORD_LIMIT) cell = maxAbs / CELL_COORD_LIMIT;
    this.cell = cell;
    this.inv = 1 / cell;
    this.pos = pos;
    this.count = count;
    let size = 16;
    while (size < count * 2) size *= 2;
    this.table = new Int32Array(size);
    this.mask = size - 1;
    const cx = new Int32Array(count);
    const cy = new Int32Array(count);
    const cz = new Int32Array(count);
    const cellOf = new Int32Array(count);
    let cells = 0;
    for (let k = 0; k < count; k++) {
      const x = Math.floor(pos[k * 3] * this.inv);
      const y = Math.floor(pos[k * 3 + 1] * this.inv);
      const z = Math.floor(pos[k * 3 + 2] * this.inv);
      let slot = cellHash(x, y, z) & this.mask;
      for (;;) {
        const id = this.table[slot] - 1;
        if (id < 0) {
          cx[cells] = x;
          cy[cells] = y;
          cz[cells] = z;
          this.table[slot] = ++cells;
          cellOf[k] = cells - 1;
          break;
        }
        if (cx[id] === x && cy[id] === y && cz[id] === z) {
          cellOf[k] = id;
          break;
        }
        slot = (slot + 1) & this.mask;
      }
    }
    this.cells = cells;
    const lo = new Int32Array(3).fill(2 ** 31 - 1);
    const hi = new Int32Array(3).fill(-(2 ** 31));
    for (let c = 0; c < cells; c++) {
      lo[0] = Math.min(lo[0], cx[c]);
      hi[0] = Math.max(hi[0], cx[c]);
      lo[1] = Math.min(lo[1], cy[c]);
      hi[1] = Math.max(hi[1], cy[c]);
      lo[2] = Math.min(lo[2], cz[c]);
      hi[2] = Math.max(hi[2], cz[c]);
    }
    this.lo = lo;
    this.hi = hi;
    this.cx = cx.slice(0, cells);
    this.cy = cy.slice(0, cells);
    this.cz = cz.slice(0, cells);
    const start = new Int32Array(cells + 1);
    for (let k = 0; k < count; k++) start[cellOf[k] + 1]++;
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    const fill = start.slice(0, cells);
    const items = new Int32Array(count);
    for (let k = 0; k < count; k++) items[fill[cellOf[k]]++] = k;
    this.start = start;
    this.items = items;
  }

  /** Every point within `radius` of (x, y, z), boundary included, each once. */
  queryUnordered(x: number, y: number, z: number, radius: number, out: number[]): number[] {
    out.length = 0;
    if (!(radius >= 0) || this.count === 0) return out;
    const r2 = radius * radius;
    const pos = this.pos;
    // The cells the query sphere's bounding box overlaps — not a symmetric
    // ring around the query's cell, which reads 5 cells an axis as soon as
    // the radius passes the cell size by a hair — CLAMPED to the occupied
    // range, so a giant query over empty space costs nothing, and every
    // coordinate walked is one a point was binned at (inside Int32).
    const lo = this.lo;
    const hi = this.hi;
    const x0 = Math.max(lo[0], Math.floor((x - radius) * this.inv));
    const x1 = Math.min(hi[0], Math.floor((x + radius) * this.inv));
    const y0 = Math.max(lo[1], Math.floor((y - radius) * this.inv));
    const y1 = Math.min(hi[1], Math.floor((y + radius) * this.inv));
    const z0 = Math.max(lo[2], Math.floor((z - radius) * this.inv));
    const z1 = Math.min(hi[2], Math.floor((z + radius) * this.inv));
    if (!(x0 <= x1 && y0 <= y1 && z0 <= z1)) return out;
    const block = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
    // A block larger than the occupied cells reads every point instead: the
    // same set, by a different route. That is the one cost this index does
    // not bound: a query far larger than the level's cells that lands
    // INSIDE the occupied range (a lot-sized box over a sparse town of
    // bricks) reads the whole level, O(queries of that kind x targets).
    if (!(block <= this.cells)) {
      for (let k = 0; k < this.count; k++) {
        const dx = pos[k * 3] - x;
        const dy = pos[k * 3 + 1] - y;
        const dz = pos[k * 3 + 2] - z;
        if (dx * dx + dy * dy + dz * dz <= r2) out.push(k);
      }
      return out;
    }
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        for (let iz = z0; iz <= z1; iz++) {
          let slot = cellHash(ix, iy, iz) & this.mask;
          let id = -1;
          for (;;) {
            const t = this.table[slot] - 1;
            if (t < 0) break;
            if (this.cx[t] === ix && this.cy[t] === iy && this.cz[t] === iz) {
              id = t;
              break;
            }
            slot = (slot + 1) & this.mask;
          }
          if (id < 0) continue;
          for (let q = this.start[id]; q < this.start[id + 1]; q++) {
            const k = this.items[q];
            const dx = pos[k * 3] - x;
            const dy = pos[k * 3 + 1] - y;
            const dz = pos[k * 3 + 2] - z;
            if (dx * dx + dy * dy + dz * dz <= r2) out.push(k);
          }
        }
      }
    }
    return out;
  }
}

/** A 32-bit mix of three integer cell coordinates. */
function cellHash(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 0x8da6b343) ^ Math.imul(y | 0, 0xd8163841) ^ Math.imul(z | 0, 0xcb1ab31f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** One level of the target index: a grid over targets of similar size. */
interface Level {
  /** Grid over this level's target centres. */
  readonly grid: CellIndex;
  /** Grid point index -> target index. */
  readonly members: Uint32Array;
  /** The largest bounding-sphere radius in the level. */
  readonly radius: number;
}

/**
 * THE TARGET INDEX: one uniform grid PER SIZE CLASS, the classes doubling
 * in bounding-sphere radius from the smallest positive one. A query asks
 * each level for the centres within (its own radius + the level's largest),
 * which is sound by the triangle inequality: two boxes meet only if their
 * centres are within the sum of their radii. Within a level the radii
 * differ by at most 2x, so the search radius stays tight for every target
 * in it, and a mix of sizes costs one grid per size class rather than a
 * linear scan of everything above the median (the first version's second
 * tier, which made two brick sizes quadratic). Each level's cell is its
 * largest radius plus the median query radius, so a typical query reads a
 * 3x3x3 block of cells per level. The levels change the COST of an answer,
 * never the answer.
 */
function buildLevels(T: BoxTable, tRad: Float64Array, qRad: Float64Array, absSlack: number): Level[] {
  const m = T.count;
  if (m === 0) return [];
  let r0 = Infinity;
  for (let j = 0; j < m; j++) if (tRad[j] > 0 && tRad[j] < r0) r0 = tRad[j];
  const byLevel = new Map<number, number[]>();
  for (let j = 0; j < m; j++) {
    const r = tRad[j];
    const lv = r > r0 ? Math.ceil(Math.log2(r / r0)) : 0;
    let list = byLevel.get(lv);
    if (list === undefined) {
      list = [];
      byLevel.set(lv, list);
    }
    list.push(j);
  }
  const qSorted = Float64Array.from(qRad).sort();
  const qMedian = qSorted.length > 0 ? qSorted[(qSorted.length - 1) >> 1] : 0;
  const levels: Level[] = [];
  const order = Array.from(byLevel.keys()).sort((a, b) => a - b);
  for (const lv of order) {
    const list = byLevel.get(lv)!;
    let radius = 0;
    for (const j of list) if (tRad[j] > radius) radius = tRad[j];
    const members = Uint32Array.from(list);
    const positions = new Float64Array(members.length * 3);
    for (let k = 0; k < members.length; k++) {
      positions[k * 3] = T.centre[members[k] * 3];
      positions[k * 3 + 1] = T.centre[members[k] * 3 + 1];
      positions[k * 3 + 2] = T.centre[members[k] * 3 + 2];
    }
    // The cell is the median query's REACH, slack included and a hair over, so
    // that query reads 3x3x3 cells: sized at the bare radius sum, the slack
    // tipped every median query into a 5x5x5 block.
    const base = radius + qMedian;
    let cell = (base * (1 + SPHERE_SLACK) + absSlack) * (1 + 1e-6);
    if (!(base > 0) || !Number.isFinite(cell)) {
      // Point-sized boxes: size the cell from the spread of the centres.
      let ext = 0;
      for (let k = 0; k < 3; k++) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let q = 0; q < members.length; q++) {
          const v = positions[q * 3 + k];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        ext = Math.max(ext, hi - lo);
      }
      cell = ext > 0 ? ext / Math.cbrt(members.length) : 1;
    }
    const grid = new CellIndex(positions, members.length, cell);
    levels.push({ grid, members, radius });
  }
  return levels;
}

/**
 * A box cloud in the one form the pair tests want: SoA world centres, the
 * box's own axes as orthonormal rows, and world half-extents along them.
 */
interface BoxTable {
  readonly count: number;
  /** World centre, 3 per box. */
  readonly centre: Float64Array;
  /**
   * Where the box's local +X, +Y, +Z land, 9 per box (rows): the rotated
   * axes, each turned round where its scale is negative.
   */
  readonly axes: Float64Array;
  /** World half-extents along those axes, 3 per box. */
  readonly half: Float64Array;
  /** 1 where the axes are exactly the world axes (the fast, exact path). */
  readonly aligned: Uint8Array;
}

function isF32Tuple(attr: Attribute | undefined, size: number): boolean {
  return attr !== undefined && attr.type === "f32" && attr.tupleSize === size;
}

/**
 * Build the box table of one input. `local` decides the frame ONCE for the
 * whole cloud: false reads boundsMin/boundsMax as world corners (P, rot and
 * scale are not read), true maps them through P, rot and scale.
 */
function buildBoxes(geo: Geometry, local: boolean, pin: string, frameParam: string): BoxTable {
  const pts = geo.attrs.point;
  const n = pts.count;
  const centre = new Float64Array(n * 3);
  const axes = new Float64Array(n * 9);
  const half = new Float64Array(n * 3);
  const aligned = new Uint8Array(n);
  if (n === 0) return { count: 0, centre, axes, half, aligned };

  const loAttr = pts.get("boundsMin");
  const hiAttr = pts.get("boundsMax");
  for (const [name, attr] of [
    ["boundsMin", loAttr],
    ["boundsMax", hiAttr],
  ] as const) {
    if (!isF32Tuple(attr, 3)) {
      throw new Error(
        `${NODE}: the input on pin "${pin}" ${attr === undefined ? `has no "${name}" point attribute (it has: ${pts.names().join(", ") || "none"})` : `has "${name}" as ${attr.type} tupleSize ${attr.tupleSize}`}; a box is the standard f32 tuple-3 pair boundsMin/boundsMax. Give the points their boxes with setBounds first.`,
      );
    }
  }
  const lo = loAttr!.data as Float32Array;
  const hi = hiAttr!.data as Float32Array;

  let P: ArrayLike<number> | undefined;
  let pStride = 3;
  let rot: ArrayLike<number> | undefined;
  let scale: ArrayLike<number> | undefined;
  if (local) {
    const pAttr = pts.get("P");
    if (pAttr === undefined || pAttr.type !== "f32" || pAttr.tupleSize < 3) {
      throw new Error(
        `${NODE}: param "${frameParam}" is "local", which places each box by its point's transform, but the input on pin "${pin}" has ${pAttr === undefined ? "no P attribute" : `P as ${pAttr.type} tupleSize ${pAttr.tupleSize}`}. Give the points positions, or set "${frameParam}" to "world" if boundsMin/boundsMax already hold world corners.`,
      );
    }
    P = pAttr.data;
    pStride = pAttr.tupleSize;
    const rAttr = pts.get("rot");
    if (rAttr !== undefined && !isF32Tuple(rAttr, 4)) {
      throw new Error(
        `${NODE}: the standard point attribute "rot" on pin "${pin}" is ${rAttr.type} tupleSize ${rAttr.tupleSize}, but a rotation is an f32 tuple-4 quaternion (x, y, z, w). Rename that column, or set "${frameParam}" to "world".`,
      );
    }
    rot = rAttr?.data;
    const sAttr = pts.get("scale");
    if (sAttr !== undefined && !isF32Tuple(sAttr, 3)) {
      throw new Error(
        `${NODE}: the standard point attribute "scale" on pin "${pin}" is ${sAttr.type} tupleSize ${sAttr.tupleSize}, but a scale is f32 tuple 3. Rename that column, or set "${frameParam}" to "world".`,
      );
    }
    scale = sAttr?.data;
  }

  const v: number[] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    for (let k = 0; k < 3; k++) {
      const a = lo[o + k];
      const b = hi[o + k];
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has a box that is not finite along ${"xyz"[k]} — boundsMin ${a}, boundsMax ${b}. Fix the setBounds that made it, or filter the point out first.`,
        );
      }
      if (a > b) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has an inside-out box along ${"xyz"[k]} — boundsMin ${a} is above boundsMax ${b}. A box has min <= max on every axis; fix the setBounds that made it (a zero-size box, min = max, is fine).`,
        );
      }
    }
    if (!local) {
      for (let k = 0; k < 3; k++) {
        centre[o + k] = 0.5 * (lo[o + k] + hi[o + k]);
        half[o + k] = 0.5 * (hi[o + k] - lo[o + k]);
      }
      axes[i * 9] = 1;
      axes[i * 9 + 4] = 1;
      axes[i * 9 + 8] = 1;
      aligned[i] = 1;
      continue;
    }
    // Local: the box [lo, hi] lives in the point's own frame, scaled, then
    // rotated, then moved to P — the matrix spawnInstances builds.
    let qx = 0;
    let qy = 0;
    let qz = 0;
    let qw = 1;
    if (rot !== undefined) {
      qx = rot[i * 4];
      qy = rot[i * 4 + 1];
      qz = rot[i * 4 + 2];
      qw = rot[i * 4 + 3];
      const len = Math.hypot(qx, qy, qz, qw);
      if (!Number.isFinite(len)) {
        throw new Error(
          `${NODE}: point ${i} on pin "${pin}" has a non-finite "rot" (${qx}, ${qy}, ${qz}, ${qw}). Fix whatever wrote it, or filter the point out first.`,
        );
      }
      // A zero quaternion reads as identity; any other is normalized, so a
      // slightly non-unit rotation cannot skew the frame the tests need.
      if (len > 0) {
        qx /= len;
        qy /= len;
        qz /= len;
        qw /= len;
      } else {
        qx = qy = qz = 0;
        qw = 1;
      }
    }
    const sx = scale !== undefined ? scale[o] : 1;
    const sy = scale !== undefined ? scale[o + 1] : 1;
    const sz = scale !== undefined ? scale[o + 2] : 1;
    const p0 = P![i * pStride];
    const p1 = P![i * pStride + 1];
    const p2 = P![i * pStride + 2];
    if (![sx, sy, sz, p0, p1, p2].every(Number.isFinite)) {
      throw new Error(
        `${NODE}: point ${i} on pin "${pin}" has a non-finite P (${p0}, ${p1}, ${p2}) or scale (${sx}, ${sy}, ${sz}). Fix whatever wrote it, or filter the point out first.`,
      );
    }
    // Each row is where the box's local +k lands in the world: the rotated
    // axis, turned round by a negative scale. So "the min side along k" is
    // always the side the boundsMin corner is on, which is what the
    // one-sided margins grow; the tests read the axes through abs and do
    // not care about the frame's handedness.
    const sgn = [sx < 0 ? -1 : 1, sy < 0 ? -1 : 1, sz < 0 ? -1 : 1];
    for (let k = 0; k < 3; k++) {
      rotateVec(v, qx, qy, qz, qw, k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0);
      axes[i * 9 + k * 3] = sgn[k] * v[0];
      axes[i * 9 + k * 3 + 1] = sgn[k] * v[1];
      axes[i * 9 + k * 3 + 2] = sgn[k] * v[2];
    }
    const mx = 0.5 * (lo[o] + hi[o]) * sx;
    const my = 0.5 * (lo[o + 1] + hi[o + 1]) * sy;
    const mz = 0.5 * (lo[o + 2] + hi[o + 2]) * sz;
    rotateVec(v, qx, qy, qz, qw, mx, my, mz);
    centre[o] = p0 + v[0];
    centre[o + 1] = p1 + v[1];
    centre[o + 2] = p2 + v[2];
    // A negative scale mirrors the box; the mirrored box is the same set.
    half[o] = Math.abs(0.5 * (hi[o] - lo[o]) * sx);
    half[o + 1] = Math.abs(0.5 * (hi[o + 1] - lo[o + 1]) * sy);
    half[o + 2] = Math.abs(0.5 * (hi[o + 2] - lo[o + 2]) * sz);
    const ax = axes;
    const b = i * 9;
    // Aligned: every row is a world axis, either way round (a mirror only).
    aligned[i] =
      Math.abs(ax[b]) === 1 && ax[b + 1] === 0 && ax[b + 2] === 0 &&
      ax[b + 3] === 0 && Math.abs(ax[b + 4]) === 1 && ax[b + 5] === 0 &&
      ax[b + 6] === 0 && ax[b + 7] === 0 && Math.abs(ax[b + 8]) === 1
        ? 1
        : 0;
  }
  return { count: n, centre, axes, half, aligned };
}

/**
 * The exact pair test: does query box `i` (centre, axes from `q`, half
 * extents `qh`, already grown by its margin and never negative) meet
 * target box `j` under `mode`? The mode is a CODE decided once in execute;
 * no string reaches this function.
 *
 * - OVERLAP: no separating axis with a gap >= 0 (strict: shared faces,
 *   edges and corners do not count).
 * - TOUCH: no separating axis with a gap > 0 (closed: they do).
 * - CONTAIN: the target lies in the query — its extent along each query
 *   axis, |d . A_a| + sum_b hb_b |A_a . B_b|, is <= the query's.
 * - INSIDE: the query lies in the target, the same test the other way.
 */
function boxesMeet(
  mode: ModeCode,
  q: BoxTable,
  qh: Float64Array,
  i: number,
  t: BoxTable,
  j: number,
): boolean {
  const qc = q.centre;
  const tc = t.centre;
  const th = t.half;
  const i3 = i * 3;
  const j3 = j * 3;
  const dx = tc[j3] - qc[i3];
  const dy = tc[j3 + 1] - qc[i3 + 1];
  const dz = tc[j3 + 2] - qc[i3 + 2];
  const ha0 = qh[i3];
  const ha1 = qh[i3 + 1];
  const ha2 = qh[i3 + 2];
  const hb0 = th[j3];
  const hb1 = th[j3 + 1];
  const hb2 = th[j3 + 2];

  if (q.aligned[i] === 1 && t.aligned[j] === 1) {
    const ex = Math.abs(dx);
    const ey = Math.abs(dy);
    const ez = Math.abs(dz);
    switch (mode) {
      case OVERLAP:
        return ex < ha0 + hb0 && ey < ha1 + hb1 && ez < ha2 + hb2;
      case TOUCH:
        return ex <= ha0 + hb0 && ey <= ha1 + hb1 && ez <= ha2 + hb2;
      case CONTAIN:
        return ex + hb0 <= ha0 && ey + hb1 <= ha1 && ez + hb2 <= ha2;
      default:
        return ex + ha0 <= hb0 && ey + ha1 <= hb1 && ez + ha2 <= hb2;
    }
  }

  // General: the oriented-box tests in the query's frame. R[a][b] = A_a . B_b.
  const A = q.axes;
  const B = t.axes;
  const ia = i * 9;
  const jb = j * 9;
  const R = SCRATCH_R;
  const AR = SCRATCH_AR;
  for (let a = 0; a < 3; a++) {
    const ax = A[ia + a * 3];
    const ay = A[ia + a * 3 + 1];
    const az = A[ia + a * 3 + 2];
    for (let b = 0; b < 3; b++) {
      const r = ax * B[jb + b * 3] + ay * B[jb + b * 3 + 1] + az * B[jb + b * 3 + 2];
      R[a * 3 + b] = r;
      AR[a * 3 + b] = Math.abs(r);
    }
  }
  const tA0 = dx * A[ia] + dy * A[ia + 1] + dz * A[ia + 2];
  const tA1 = dx * A[ia + 3] + dy * A[ia + 4] + dz * A[ia + 5];
  const tA2 = dx * A[ia + 6] + dy * A[ia + 7] + dz * A[ia + 8];
  const tB0 = dx * B[jb] + dy * B[jb + 1] + dz * B[jb + 2];
  const tB1 = dx * B[jb + 3] + dy * B[jb + 4] + dz * B[jb + 5];
  const tB2 = dx * B[jb + 6] + dy * B[jb + 7] + dz * B[jb + 8];
  const ha = SCRATCH_HA;
  const hb = SCRATCH_HB;
  const tA = SCRATCH_TA;
  ha[0] = ha0;
  ha[1] = ha1;
  ha[2] = ha2;
  hb[0] = hb0;
  hb[1] = hb1;
  hb[2] = hb2;
  tA[0] = tA0;
  tA[1] = tA1;
  tA[2] = tA2;
  const tB = SCRATCH_TB;
  tB[0] = tB0;
  tB[1] = tB1;
  tB[2] = tB2;

  const tol =
    BOUNDARY_REL *
    (Math.max(Math.abs(qc[i3]), Math.abs(qc[i3 + 1]), Math.abs(qc[i3 + 2]), Math.abs(tc[j3]), Math.abs(tc[j3 + 1]), Math.abs(tc[j3 + 2])) +
      ha0 + ha1 + ha2 + hb0 + hb1 + hb2);

  if (mode === CONTAIN) {
    for (let a = 0; a < 3; a++) {
      const ext = Math.abs(tA[a]) + hb0 * AR[a * 3] + hb1 * AR[a * 3 + 1] + hb2 * AR[a * 3 + 2];
      if (!(ext <= ha[a] + tol)) return false;
    }
    return true;
  }
  if (mode === INSIDE) {
    for (let b = 0; b < 3; b++) {
      const ext = Math.abs(tB[b]) + ha0 * AR[b] + ha1 * AR[3 + b] + ha2 * AR[6 + b];
      if (!(ext <= hb[b] + tol)) return false;
    }
    return true;
  }

  // Separating axes. `strict` (overlap) calls a zero gap a separation, so
  // boxes that only touch are apart; touch calls it contact. "Zero" is
  // within `tol` here (see BOUNDARY_REL).
  const strict = mode === OVERLAP;
  // The query's face normals.
  for (let a = 0; a < 3; a++) {
    const lhs = Math.abs(tA[a]);
    const rhs = ha[a] + hb0 * AR[a * 3] + hb1 * AR[a * 3 + 1] + hb2 * AR[a * 3 + 2];
    if (strict ? lhs >= rhs - tol : lhs > rhs + tol) return false;
  }
  // The target's face normals.
  for (let b = 0; b < 3; b++) {
    const lhs = Math.abs(tB[b]);
    const rhs = ha0 * AR[b] + ha1 * AR[3 + b] + ha2 * AR[6 + b] + hb[b];
    if (strict ? lhs >= rhs - tol : lhs > rhs + tol) return false;
  }
  // The nine edge-edge axes A_a x B_b, in the query's frame.
  for (let a = 0; a < 3; a++) {
    const a1 = (a + 1) % 3;
    const a2 = (a + 2) % 3;
    for (let b = 0; b < 3; b++) {
      const rab = R[a * 3 + b];
      const sin2 = 1 - rab * rab;
      if (sin2 < PARALLEL_EPS) continue;
      const b1 = (b + 1) % 3;
      const b2 = (b + 2) % 3;
      // Both sides are projections onto A_a x B_b, which has length sin of
      // the angle between the edges, so they are distances times that
      // length. The band is a distance, and is scaled the same way; unscaled
      // it would widen to tol / sin, ~1e6 times the stated band near parallel.
      const band = tol * Math.sqrt(sin2);
      const lhs = Math.abs(tA[a2] * R[a1 * 3 + b] - tA[a1] * R[a2 * 3 + b]);
      const rhs =
        ha[a1] * AR[a2 * 3 + b] + ha[a2] * AR[a1 * 3 + b] + hb[b1] * AR[a * 3 + b2] + hb[b2] * AR[a * 3 + b1];
      if (strict ? lhs >= rhs - band : lhs > rhs + band) return false;
    }
  }
  return true;
}

// Scratch for the general pair test: allocated once per module, so the
// per-pair path allocates nothing.
const SCRATCH_R = new Float64Array(9);
const SCRATCH_AR = new Float64Array(9);
const SCRATCH_HA = new Float64Array(3);
const SCRATCH_HB = new Float64Array(3);
const SCRATCH_TA = new Float64Array(3);
const SCRATCH_TB = new Float64Array(3);

/**
 * Per-element keys for the exclusion attribute, comparable ACROSS the two
 * inputs: numbers compare by value (any numeric type against any other),
 * strings by their text, mapped through the query's table once per table
 * entry rather than once per pair. A NaN key is never equal to anything,
 * and a target string the query side never holds gets a key no query has.
 */
function exclusionKeys(
  qAttr: Attribute,
  tAttr: Attribute,
  qCount: number,
  tCount: number,
): { q: Float64Array; t: Float64Array } {
  const q = new Float64Array(qCount);
  const t = new Float64Array(tCount);
  if (qAttr.type !== "string") {
    for (let i = 0; i < qCount; i++) q[i] = qAttr.data[i];
    for (let j = 0; j < tCount; j++) t[j] = tAttr.data[j];
    return { q, t };
  }
  // The query table's strings to a canonical key: the first index holding
  // that text. A code past the table reads as "" (getString's rule).
  const canon = new Map<string, number>();
  const qTable = qAttr.stringTable;
  for (let k = 0; k < qTable.length; k++) if (!canon.has(qTable[k])) canon.set(qTable[k], k);
  if (!canon.has("")) canon.set("", qTable.length);
  const qKeyOf = Float64Array.from(qTable, (s) => canon.get(s)!);
  const qEmpty = canon.get("")!;
  for (let i = 0; i < qCount; i++) {
    const code = qAttr.data[i];
    q[i] = code < qKeyOf.length ? qKeyOf[code] : qEmpty;
  }
  const tTable = tAttr.stringTable;
  const tKeyOf = Float64Array.from(tTable, (s) => canon.get(s) ?? -1);
  const tEmpty = qEmpty;
  for (let j = 0; j < tCount; j++) {
    const code = tAttr.data[j];
    t[j] = code < tKeyOf.length ? tKeyOf[code] : tEmpty;
  }
  return { q, t };
}

/** The pair columns' resolved names; "" writes none (the frame four only). */
interface PairNames {
  readonly query: string;
  readonly target: string;
  readonly outward: string;
  readonly outAxis: string;
  readonly alongAxis: string;
  readonly alongSign: string;
}

/**
 * The `pairs` cloud: one point per (query, target) hit, in the buffer's
 * order (query index, then target index). Two decisions arrive as
 * booleans, made once in execute: `region` (both frames "world": every
 * box is axis-aligned, so the intersection of two is a box) and `frame`
 * (region under "touch": a contact across one face has a face frame).
 *
 * THE REGION is the intersection of the query box AS TESTED (margins
 * applied) and the target box, per axis [max of the mins, min of the
 * maxes]. An axis is FLUSH when the test's own comparison sat at equality
 * there, |d| = ha + hb with ha + hb > 0 (the same numbers the aligned test
 * compared, so the region and the answer cannot disagree): the boxes meet
 * on a plane, and the region is put ON the TARGET's face, read from its
 * stored f32 corner (the target has no margin), so it is flat however
 * the query's margins rounded. The flush DECISION is the test's rounded
 * arithmetic, so where the test itself misreads an exact contact (bounds
 * ~29 bits of magnitude apart on one axis) the frame follows the test and
 * not the reals. Two flat boxes in one plane (ha + hb = 0)
 * are not flush there: neither lies beside the other. Rounding a margin
 * cannot invert a region by more than an ulp, and such an axis collapses
 * to its midpoint rather than being written inside out.
 *
 * THE FACE FRAME exists exactly when ONE axis is flush, the query's face
 * on that side touching the target across it: outward = the query's face
 * normal toward the target, and along as shellSplit gives the wall facing
 * that way (x for the z walls, the floor and the ceiling; z for the x
 * walls; signed so along x up = outward), so placeBox's "face" frame reads
 * it as it reads a shellSplit wall. Two or three flush axes are an edge or
 * a corner, and none is boxes that cross: [0, 0, 0], -1, -1, 0, as
 * shellSplit writes on a cell with no face.
 */
function writePairs(
  pairs: PairBuffer,
  names: PairNames,
  region: boolean,
  frame: boolean,
  qc: Float64Array,
  qh: Float64Array,
  T: BoxTable,
  targets: Geometry,
  seed: number,
  checkCancelled: () => void,
): Geometry {
  // Read under `region` only, where the targets are "world" boxes and these
  // columns were checked to be f32 tuple 3 by buildBoxes (a non-empty pair
  // list implies a non-empty target cloud).
  const tBoundsLo = (region && T.count > 0 ? targets.attrs.point.require("boundsMin").data : new Float32Array(0)) as Float32Array;
  const tBoundsHi = (region && T.count > 0 ? targets.attrs.point.require("boundsMax").data : new Float32Array(0)) as Float32Array;
  const k = pairs.count;
  const geo = createPointCloud(k);
  const pts = geo.attrs.point;
  const P = pts.require("P").writable() as Float32Array;
  const lo = pts.require("boundsMin").writable() as Float32Array;
  const hi = pts.require("boundsMax").writable() as Float32Array;
  const seeds = pts.require("seed").writable() as Uint32Array;
  const qOut = pts.replace(names.query, "i32", 1, -1).writable() as Int32Array;
  const tOut = pts.replace(names.target, "i32", 1, -1).writable() as Int32Array;
  const outw = frame && names.outward !== "" ? (pts.replace(names.outward, "f32", 3, [0, 0, 0]).writable() as Float32Array) : null;
  const oAxis = frame && names.outAxis !== "" ? (pts.replace(names.outAxis, "i32", 1, -1).writable() as Int32Array) : null;
  const aAxis = frame && names.alongAxis !== "" ? (pts.replace(names.alongAxis, "i32", 1, -1).writable() as Int32Array) : null;
  const aSign = frame && names.alongSign !== "" ? (pts.replace(names.alongSign, "i32", 1, 0).writable() as Int32Array) : null;
  const tc = T.centre;
  const th = T.half;
  for (let w = 0; w < k; w++) {
    if ((w & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
    const i = pairs.q[w];
    const j = pairs.t[w];
    qOut[w] = i;
    tOut[w] = j;
    seeds[w] = hashCombine(seed, i, j);
    const i3 = i * 3;
    const j3 = j * 3;
    if (!region) {
      // Oriented boxes: no region. A zero box at the midpoint of the two
      // centres as tested, so no world-frame reader finds a box elsewhere.
      for (let a = 0; a < 3; a++) {
        const p = Math.fround(0.5 * (qc[i3 + a] + tc[j3 + a]));
        P[w * 3 + a] = p;
        lo[w * 3 + a] = p;
        hi[w * 3 + a] = p;
      }
      continue;
    }
    let flushCount = 0;
    let faceAxis = -1;
    let faceSide = 0;
    for (let a = 0; a < 3; a++) {
      // The aligned test's own numbers: d = tc - qc and ha + hb.
      const d = tc[j3 + a] - qc[i3 + a];
      const ha = qh[i3 + a];
      const hb = th[j3 + a];
      const reach = ha + hb;
      // The target's STORED corners, not tc -/+ hb: lo + hi is not exact in
      // f64 once the two differ by ~29 bits of magnitude, so the rebuilt
      // face could miss the stored one (found by the independent review:
      // x [1e-7, 1000] came back at 9.999996564e-8).
      const tLo = tBoundsLo[j3 + a];
      const tHi = tBoundsHi[j3 + a];
      let l = Math.max(qc[i3 + a] - ha, tLo);
      let h = Math.min(qc[i3 + a] + ha, tHi);
      if (reach > 0 && Math.abs(d) === reach) {
        flushCount++;
        faceAxis = a;
        faceSide = d > 0 ? 1 : -1;
        l = h = d > 0 ? tLo : tHi;
      } else if (h < l) {
        l = h = 0.5 * (l + h);
      }
      const fl = Math.fround(l);
      const fh = Math.fround(h);
      lo[w * 3 + a] = fl;
      hi[w * 3 + a] = fh;
      P[w * 3 + a] = Math.fround(0.5 * (fl + fh));
    }
    if (!frame) continue;
    const face = flushCount === 1;
    if (outw !== null && face) outw[w * 3 + faceAxis] = faceSide;
    if (oAxis !== null) oAxis[w] = face ? faceAxis : -1;
    // shellSplit's along: x for the z walls (sign = the side: south -1,
    // north +1), z for the x walls (west +1, east -1), x for the floor and
    // the ceiling (+1) — along x up = outward on every face.
    if (aAxis !== null) aAxis[w] = face ? (faceAxis === 0 ? 2 : 0) : -1;
    if (aSign !== null) aSign[w] = face ? (faceAxis === 2 ? faceSide : faceAxis === 0 ? -faceSide : 1) : 0;
  }
  return geo;
}

/** Per-query contact with a set of target boxes: hit flag, count, nearest. */
export const boxContact = standardNode<BoxContactParams, BoxContactInputs, BoxContactOutputs>({
  type: NODE,
  category: "point op",
  description:
    "Asks, for every BOX on the `in` pin (the QUERIES), whether it meets any box on the `targets` pin, and writes the answer onto the query points as attributes: `hitAttr` a bool (any target met), `countAttr` an i32 (how many distinct targets), `targetAttr` an i32 (the index of the met target whose centre is nearest the centre of the query box as tested, -1 for none). Nothing else changes — same points, same order, same topology, every attribute carried — so the usual next step is a filter or a relabel on the flag. This is the CONTEXT QUERY of a split grammar (the occlusion query of the shape-grammar literature, and the box form of a point-in-volume or group-by-bounding-object test): is this window blocked by a neighbour or a chimney, does this bay cross any box of another set, is this room inside the lot. A BOX is a point's standard `boundsMin`/`boundsMax`, read in one of two FRAMES, chosen per input by `queryFrame` and `targetFrame`: \"world\" (the default) reads the two corners as WORLD coordinates and does not read P, rot or scale — the convention setBounds, splitBox and packBricks write, so grammar cells need nothing done to them; \"local\" reads them in the point's OWN frame, mapped through P, rot and scale exactly as spawnInstances places a mesh (world = P + rot * (scale * corner)), so a rotated box is tested as the ORIENTED box it is (rot is normalized first, so a non-unit quaternion places the box rigidly where spawnInstances' matrix would also scale it). THE MODE (`mode`) is the question: \"overlap\" — the two boxes CROSS: on every separating direction their extents overlap by more than zero, so boxes that only share a face, an edge or a corner do NOT overlap (two neighbouring grammar cells are not overlapping), while a zero-thickness box passing through a solid one does; \"touch\" — the same test closed, so sharing a face, edge or corner COUNTS (the party-wall neighbour); \"contain\" — the target lies wholly inside the query, boundary included; \"inside\" — the query lies wholly inside the target, boundary included. THE TESTS ARE EXACT for oriented boxes too — the separating-axis test on all fifteen axes for overlap and touch, the support extent along the outer box's three axes for contain and inside — with two stated approximations that apply only where a box is ROTATED: a cross axis of two edges within 1e-6 rad of parallel is skipped as rounding noise, which can only turn \"apart\" into \"meet\", across a gap of at most about 1e-6 of the boxes' size; and a gap or an overlap within 1e-12 of the pair's scale (its largest centre coordinate plus both boxes' half-extents), on any axis, is read as EXACT contact in both directions — \"touch\" accepts it and \"overlap\" rejects it — so two boxes under one P and rot that share a face share it under every rotation rather than as rounding decides. Axis-aligned pairs (every \"world\" box, and \"local\" ones with no rotation) are compared exactly. THE MARGINS move the QUERY box's faces before the test, per query point, in world units along the box's own three axes (scale is not applied to them), and leave the point's own bounds untouched. `margin` GROWS BOTH faces of each axis: margin 0.5 with \"touch\" asks \"is any target within half a unit of this box, measured per axis\" — a box-shaped neighbourhood, not a rounded one; a vec3 gives each axis its own reach, and a scalar field broadcasts to all three. `marginMin` and `marginMax` move ONE face each — the face on the boundsMin side and the face on the boundsMax side — signed, so they reach out of one face only (a wall whose outside is -z: marginMin vec(0, 0, 2) looks two units out of the front and not into the house behind it), shift the box (marginMin -d with marginMax +d moves it d), or carve the query down to a probe of its own: the window test is the bay's box with its outward face pushed half a stud out, its inward face pulled to meet it, and its sides and height pulled in to the opening, all as fields reading the bay's box names and attributes. The three add: the min face moves out by margin + marginMin, the max face by margin + marginMax. A NEGATIVE total shrinks the query, which is how a containment test tolerates a sliver (\"inside\" with margin -0.01), and a query shrunk past nothing on any axis is EMPTY and meets nothing in every mode. EXCLUSION: `excludeAttr` names a tuple-1 attribute present on BOTH inputs, and a target whose value EQUALS the query's is skipped — the bay that must not count its own wall carries its wall's id (write one with setAttribute before the split; splitBox carries every attribute onto its pieces), and siblings or one parent are excluded the same way. Numbers compare by value whatever their numeric type (NaN never equals anything); strings compare by text, so the two inputs' string tables may differ. `excludeSelf` skips target i for query i, for one cloud wired to BOTH pins (\"does this box overlap any OTHER box of its set\"); it is refused when the two inputs have different point counts, since they cannot then be one cloud. STAGING: query against an EARLIER stage — another branch's finished output, or an applyRules `trail` (the consumed ancestors, whose boxes are the blocks and storeys a later stage needs) — never against the frontier still being rewritten. DETERMINISM: nothing is drawn, nothing is accumulated, and the nearest target is the LOWEST INDEX among the hits whose squared centre distance ties with the least, within a band scaled like the rounding a centre carries (1e-12 of the least squared distance plus 2e-12 of it times the query centre's largest coordinate), so the answers do not depend on the order the targets arrive in beyond that index, and a rotation's rounding cannot break a true tie. COST: near linear in the two counts for any mix of sizes — the targets are binned by centre into one uniform grid per SIZE CLASS (radii doubling), and each query reads each class's grid within its own half-diagonal plus that class's largest, a bounding-sphere bound (two boxes can meet only if their centres are within the sum of their half-diagonals) that changes the cost, never the answer. Under a partitioned cook it is exact given every target whose centre lies within the query's half-diagonal (margins included, measured from the moved centre) plus the largest target's half-diagonal. ERRORS name the pin and point: a box that is not finite or is inside out (min above max), a missing bounds pair, a frame of \"local\" on points without P. CPU ONLY, and deliberately not a GPU adopter: the margin is a value that decides a contact, and a device-rounded margin one ulp off flips a touching pair — the same reason filterByExpression keeps its predicate on the CPU. THE PAIRS: `targetAttr` names ONE met target per query, which cannot say WHICH wall two rooms share; the second output `pairs` is the whole relation — ONE POINT PER (query, target) PAIR that met, exactly the pairs `countAttr` counts (so there are as many as its sum), ORDERED by query index and then target index whatever order the grids found them in, each carrying the two indices as i32 (`pairQueryAttr`, `pairTargetAttr`; transferByIndex with either as its `index` reads that box's own attributes onto the pair) and a `seed` hashed from this node's seed and the two indices. With BOTH frames \"world\" the pair's BOX (boundsMin/boundsMax) is the INTERSECTION of the query box as tested (margins applied) and the target box, and its P the centre of that box: under \"overlap\" the shared volume; under \"touch\" the SHARED REGION — the wall two rooms share comes out as that wall, FLAT on the axis they touch along and placed exactly on the target's face, a shared edge as a segment, a shared corner as a point; under \"contain\" the target's box, under \"inside\" the tested query's. Under \"touch\" (world frames) a pair that meets across exactly ONE face — flush on one axis, by the test's own comparison — also carries that face's frame in shellSplit's vocabulary, FROM THE QUERY'S SIDE: `pairOutwardAttr` the query's outward face normal toward the target ([1, 0, 0] when the target lies on the query's +x side), `pairOutAxisAttr` its axis, and `pairAlongAxisAttr` / `pairAlongSignAttr` the along run shellSplit gives a wall facing that way, so placeBox in its \"face\" frame centres a door on every shared wall; an edge or a corner contact, or boxes that cross, carry [0, 0, 0], -1, -1 and 0, as shellSplit writes on a cell with no face. With either frame \"local\" NO REGION is written — two oriented boxes intersect in a convex polytope, not a box — so boundsMin = boundsMax = P, the midpoint of the two boxes' centres as tested, and no face frame. ONE CLOUD ON BOTH PINS (excludeSelf): under \"overlap\" and \"touch\" each unordered pair appears TWICE, as (i, j) and (j, i), each seen from its own query's side, and filterByExpression on lt(attribute(\"queryIndex\"), attribute(\"targetIndex\")) keeps each once — exact in the world frame with no margins, where the test is one comparison mirrored; under \"contain\" and \"inside\" the relation is one-way, (i, j) without (j, i) unless the two boxes are equal, so that filter would drop every pair with i > j and is not the way to dedupe there. `pairs` is built only when something reads it (a connection or a declared output), and `out` is the same bytes either way. More than 1,048,576 pairs is refused, naming the mode and the margins.",
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "targets", kind: "geometry" },
  ],
  outputs: [
    { name: "out", kind: "geometry" },
    { name: "pairs", kind: "geometry", onDemand: true },
  ],
  params: {
    mode: {
      type: "enum",
      enum: [...MODES],
      default: "overlap",
      description:
        'The question asked of each (query, target) pair. "overlap": the boxes CROSS — sharing only a face, an edge or a corner is NOT an overlap, so neighbouring grammar cells that tile a block do not overlap each other. "touch": the closed test — they overlap OR share a face, edge or corner; with a margin, "within that distance along each of the query\'s axes". "contain": the target lies wholly inside the (grown) query, boundary included. "inside": the (grown) query lies wholly inside the target, boundary included. Decided once per cook.',
    },
    margin: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the QUERY box is GROWN on BOTH sides along each of its own three axes before the test, in world units [x, y, z] (scale is not applied; for a \"world\" query the axes are the world's). 0 tests the box as it is. As a FIELD it is resolved per QUERY point — a scalar broadcasts to all three axes — so each query can reach as far as it needs. vec(0, 0, 2) on a wall running along x grows both its faces, the inside one too; to reach out of ONE face, use marginMin or marginMax instead. NEGATIVE shrinks the query: \"inside\" with a small negative margin tolerates a sliver of overhang, and \"overlap\" with one ignores a contact shallower than it. Adds to marginMin and marginMax. A query whose size after all three is below zero on any axis is EMPTY and meets nothing, in every mode. Must be finite.",
    },
    marginMin: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the query box's MIN-SIDE face — the one its boundsMin corner is on, along each of its own axes — moves OUT before the test, in world units [x, y, z], on top of `margin`. Signed: positive reaches out of that face only, negative pulls it in, and with marginMax it can shift the box (marginMin -d, marginMax +d moves it d along the axis) or carve a probe out of it. A wall whose outside is -z looks two units out of its front, and not into the house, with marginMin vec(0, 0, 2). As a FIELD it is resolved per QUERY point and may read the query's box names: the window probe half a stud in front of a south wall, flattened onto the outside, is marginMin vec(0, 0, 0.5) with marginMax vec(0, 0, -0.5 - box(\"sz\")), plus whatever pulls the sides in to the opening. For a \"local\" query the side is the box's own, before its scale's sign. Must be finite.",
    },
    marginMax: {
      type: "vec3",
      default: [0, 0, 0],
      acceptsField: true,
      description:
        "How far the query box's MAX-SIDE face — the one its boundsMax corner is on, along each of its own axes — moves OUT before the test, in world units [x, y, z], on top of `margin`. Signed, with the same readings as marginMin, mirrored: a wall whose outside is +z reaches out of its front with marginMax vec(0, 0, 2). As a FIELD it is resolved per QUERY point. Must be finite.",
    },
    queryFrame: {
      type: "enum",
      enum: [...FRAMES],
      default: "world",
      description:
        'How the QUERY points\' boundsMin/boundsMax are read. "world" (the default): as world coordinates, P, rot and scale not read — the convention of setBounds, splitBox and packBricks, and so of every grammar cell. "local": in the point\'s own frame, placed by P, rot and scale exactly as spawnInstances places a mesh (world = P + rot * (scale * corner)); a rotated point is then tested as an ORIENTED box, exactly. Decided once per cook.',
    },
    targetFrame: {
      type: "enum",
      enum: [...FRAMES],
      default: "world",
      description:
        'How the TARGET points\' boundsMin/boundsMax are read, with the same two choices as `queryFrame`, chosen independently: grammar cells ("world") can be queried against placed, rotated instances ("local"). Decided once per cook.',
    },
    excludeAttr: {
      type: "string",
      default: "",
      description:
        'OPT-IN: the name of a tuple-1 point attribute present on BOTH inputs; a target whose value EQUALS the query\'s is skipped, as if absent. This is how a bay does not count its own wall (give the wall an id before splitting it — splitBox carries every attribute onto its pieces — and give the targets the same column), and how siblings or the children of one parent ignore each other. Numbers compare by value across numeric types (i32, u32, f32, bool), and NaN never equals anything; strings compare by TEXT, so the two inputs\' string tables need not agree. A string on one side and a number on the other is refused. Empty (the default) excludes nothing.',
    },
    excludeSelf: {
      type: "bool",
      default: false,
      description:
        "Skip target i for query i: for ONE cloud wired to both pins, asking whether each box meets any OTHER box of its own set. Refused when the two inputs have different point counts, since they cannot then be one cloud. With two different clouds of equal size it silently pairs them by index, so leave it off there.",
    },
    hitAttr: {
      type: "string",
      default: "contact",
      description:
        "Name of the bool point attribute (tuple 1) receiving whether the query met at least one target. A REPORTING SLOT: an existing bool tuple-1 column of that name is reset and rewritten, one of any other shape is refused rather than destroyed. Empty writes no flag (then countAttr or targetAttr must be set).",
    },
    countAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of the i32 point attribute (tuple 1) receiving how many DISTINCT targets the query met (exclusions not counted). Worth writing when the question is how crowded a box is rather than whether it is clear. A reporting slot on the same terms as hitAttr. Empty (the default) writes none.",
    },
    targetAttr: {
      type: "string",
      default: "",
      description:
        "OPT-IN: name of the i32 point attribute (tuple 1) receiving the INDEX, in the targets input, of the met target whose box centre is nearest the centre of the query box AS TESTED (after its margins), ties — distances equal within a band scaled like the centres' rounding (see the node description), so a rotation's rounding cannot decide one — to the lowest index, or -1 when none was met. Feed it to transferByIndex as `index` to read that target's own attributes — its label, its id, its colour. A reporting slot on the same terms as hitAttr. Empty (the default) writes none.",
    },
    pairQueryAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairQueryAttr,
      description:
        "Name of the i32 point attribute on the `pairs` output receiving each pair's QUERY index — the ordinal of its box on the `in` pin. Required: the two indices are what a pair IS. The pairs are sorted by it first. Feed it to transferByIndex as `index`, with the queries as `source`, to read the query's own attributes (a room's label, its id). It may not be one of the standard point columns the cloud already carries (P, rot, scale, density, boundsMin, boundsMax, color, seed), nor a name another pair param uses.",
    },
    pairTargetAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairTargetAttr,
      description:
        "Name of the i32 point attribute on the `pairs` output receiving each pair's TARGET index — the ordinal of its box on the `targets` pin; within one query the pairs run in increasing target index. Required, and on the same terms as pairQueryAttr. With one cloud on both pins under \"overlap\" or \"touch\", lt(attribute(\"queryIndex\"), attribute(\"targetIndex\")) in a filterByExpression keeps each unordered pair once (\"contain\" and \"inside\" are one-way, so there it would drop pairs).",
    },
    pairOutwardAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairOutwardAttr,
      description:
        "Written under \"touch\" with both frames \"world\" only: name of the f32 tuple-3 point attribute on the `pairs` output receiving the QUERY's outward face normal toward the target when the two meet across exactly one face — one signed axis, [0, 0, 1] when the target lies on the query's +z side — and [0, 0, 0] for an edge or corner contact or boxes that cross. shellSplit's `outwardAttr` default and meaning, so placeBox and offsetBox read it in their \"face\" frame. Empty writes none.",
    },
    pairOutAxisAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairOutAxisAttr,
      description:
        "Written under \"touch\" with both frames \"world\" only: name of the i32 point attribute on the `pairs` output receiving the axis the two boxes touch across, 0 = x, 1 = y, 2 = z — the axis the shared region is flat on — or -1 when they do not meet across exactly one face. shellSplit's `outAxisAttr` default: 1 is a floor or a ceiling, so a filter on ne(attribute(\"outAxis\"), 1) * ge(attribute(\"outAxis\"), 0) keeps the walls. Empty writes none.",
    },
    pairAlongAxisAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairAlongAxisAttr,
      description:
        "Written under \"touch\" with both frames \"world\" only: name of the i32 point attribute on the `pairs` output receiving the shared face's ALONG axis as shellSplit writes it on a face of that orientation — x for a face across z, a floor or a ceiling; z for a face across x — or -1 with no single face. With pairAlongSignAttr and pairOutwardAttr it is the frame placeBox's \"face\" frame reads. Empty writes none.",
    },
    pairAlongSignAttr: {
      type: "string",
      default: PAIR_DEFAULT_NAMES.pairAlongSignAttr,
      description:
        "Written under \"touch\" with both frames \"world\" only: name of the i32 point attribute on the `pairs` output receiving the sign along runs, +1 or -1, as shellSplit writes it so that along x up = the query's outward — left to right as seen from the TARGET's side of the shared face, looking back at the query — or 0 with no single face. Empty writes none.",
    },
  },
  execute({ inputs, params, seed, checkCancelled, readOutputs }) {
    // ---- params, decided ONCE: every string becomes a code here, and no
    // string reaches the pair loop.
    const modeName = canonicalOneOf(MODES, params.mode);
    if (modeName === undefined) {
      throw new Error(`${NODE}: param "mode" is ${JSON.stringify(params.mode)}; valid: ${MODES.join(", ")}.`);
    }
    const mode = MODES.indexOf(modeName as (typeof MODES)[number]) as ModeCode;
    const qFrame = canonicalOneOf(FRAMES, params.queryFrame);
    if (qFrame === undefined) {
      throw new Error(`${NODE}: param "queryFrame" is ${JSON.stringify(params.queryFrame)}; valid: ${FRAMES.join(", ")}.`);
    }
    const tFrame = canonicalOneOf(FRAMES, params.targetFrame);
    if (tFrame === undefined) {
      throw new Error(`${NODE}: param "targetFrame" is ${JSON.stringify(params.targetFrame)}; valid: ${FRAMES.join(", ")}.`);
    }
    const qLocal = qFrame === "local";
    const tLocal = tFrame === "local";
    const excludeSelf = params.excludeSelf === true;
    for (const name of ["margin", "marginMin", "marginMax"] as const) {
      requireFinitePlainParam(
        params[name],
        NODE,
        name,
        "A margin is a finite distance per axis (negative pulls the face in). Write [0, 0, 0] for none.",
      );
    }

    const slots = [
      ["hitAttr", params.hitAttr, "bool", "contactHit"],
      ["countAttr", params.countAttr, "i32", "contactCount"],
      ["targetAttr", params.targetAttr, "i32", "contactTarget"],
    ] as const;
    if (slots.every(([, name]) => name === "")) {
      throw new Error(
        `${NODE}: nothing to write — "hitAttr", "countAttr" and "targetAttr" are all empty. Set hitAttr (a bool: met any target), countAttr (an i32: how many) or targetAttr (an i32: the nearest met target's index), or more than one.`,
      );
    }
    for (let p = 0; p < 3; p++) {
      for (let r = p + 1; r < 3; r++) {
        if (slots[p][1] !== "" && slots[p][1] === slots[r][1]) {
          throw new Error(
            `${NODE}: params "${slots[p][0]}" and "${slots[r][0]}" are both "${slots[p][1]}"; they are different facts and need different attributes, or one would overwrite the other with no complaint. Rename one, or clear it to write nothing.`,
          );
        }
      }
    }

    // ---- the pairs, decided once: absent `readOutputs` (a direct execute
    // call) builds every output, so skipping `pairs` is never the default.
    // The names are checked whether or not the pin is read, so wiring it
    // cannot turn a cooking graph into a refusal.
    const buildPairs = readOutputs === undefined || readOutputs.has("pairs");
    const pairParams = [
      ["pairQueryAttr", params.pairQueryAttr],
      ["pairTargetAttr", params.pairTargetAttr],
      ["pairOutwardAttr", params.pairOutwardAttr],
      ["pairOutAxisAttr", params.pairOutAxisAttr],
      ["pairAlongAxisAttr", params.pairAlongAxisAttr],
      ["pairAlongSignAttr", params.pairAlongSignAttr],
    ] as const;
    for (const [param, name] of pairParams.slice(0, 2)) {
      if (name === "") {
        throw new Error(
          `${NODE}: param "${param}" is empty; the query and target indices are what a pair IS, so both are always written on the "pairs" output — give it a name (the default is "${PAIR_DEFAULT_NAMES[param]}").`,
        );
      }
    }
    for (let p = 0; p < pairParams.length; p++) {
      const [param, name] = pairParams[p];
      if (name !== "" && STANDARD_POINT_ATTRS.some((a) => a.name === name)) {
        throw new Error(
          `${NODE}: param "${param}" is "${name}", one of the standard point columns every "pairs" point already carries (${STANDARD_POINT_ATTRS.map((a) => a.name).join(", ")}) — writing the pair's ${param} there would overwrite what "${name}" means to every node downstream. Give it a name of its own, e.g. "${PAIR_DEFAULT_NAMES[param]}".`,
        );
      }
      for (let r = p + 1; r < pairParams.length; r++) {
        if (name !== "" && name === pairParams[r][1]) {
          throw new Error(
            `${NODE}: params "${param}" and "${pairParams[r][0]}" both name "${name}"; they are different columns of the "pairs" output and one name cannot hold both. Give one of them another name, or clear the optional one to write nothing.`,
          );
        }
      }
    }
    const pairNames: PairNames = {
      query: params.pairQueryAttr,
      target: params.pairTargetAttr,
      outward: params.pairOutwardAttr,
      outAxis: params.pairOutAxisAttr,
      alongAxis: params.pairAlongAxisAttr,
      alongSign: params.pairAlongSignAttr,
    };
    // Both frames "world": every box is axis-aligned, so a pair's
    // intersection is a box. Under "touch" a one-face contact has a frame.
    const pairRegion = !qLocal && !tLocal;
    const pairFrame = pairRegion && mode === TOUCH;

    // ---- geometry
    const src = requireGeometry(inputs, "in", NODE);
    const tgt = requireGeometry(inputs, "targets", NODE);
    const n = src.attrs.point.count;
    const m = tgt.attrs.point.count;
    for (const [param, name, type, suggestion] of slots) {
      if (name === "") continue;
      requireReportSlot({ attrs: src.attrs.point, nodeType: NODE, param, name, type, tupleSize: 1, domain: "point", suggestion });
    }
    if (excludeSelf && n !== m) {
      throw new Error(
        `${NODE}: "excludeSelf" is on, which skips target i for query i and so means ONE cloud wired to both pins, but "in" has ${n} point(s) and "targets" has ${m}. Wire the same geometry to both, or turn excludeSelf off and exclude by an id with "excludeAttr".`,
      );
    }

    let qKey: Float64Array | undefined;
    let tKey: Float64Array | undefined;
    const exName = params.excludeAttr;
    if (exName !== "") {
      const qa = src.attrs.point.get(exName);
      const ta = tgt.attrs.point.get(exName);
      for (const [pin, attr, geo] of [
        ["in", qa, src],
        ["targets", ta, tgt],
      ] as const) {
        if (attr === undefined) {
          throw new Error(
            `${NODE}: "excludeAttr" is "${exName}", but the input on pin "${pin}" has no such point attribute (it has: ${geo.attrs.point.names().join(", ") || "none"}). The attribute must be on BOTH inputs — write it with setAttribute on each, or clear excludeAttr.`,
          );
        }
        if (attr.tupleSize !== 1) {
          throw new Error(
            `${NODE}: "excludeAttr" "${exName}" on pin "${pin}" has tupleSize ${attr.tupleSize}; an exclusion key is ONE value per point (an id, a label). Write a tuple-1 id with setAttribute.`,
          );
        }
      }
      if ((qa!.type === "string") !== (ta!.type === "string")) {
        throw new Error(
          `${NODE}: "excludeAttr" "${exName}" is ${qa!.type} on pin "in" but ${ta!.type} on pin "targets"; a string never equals a number, so nothing would ever be excluded. Make both sides strings or both numbers.`,
        );
      }
      const keys = exclusionKeys(qa!, ta!, n, m);
      qKey = keys.q;
      tKey = keys.t;
    }

    const marginCols = (["margin", "marginMin", "marginMax"] as const).map((name) =>
      requireVec3Column(
        resolveOn(src, "point", params[name], seed, NODE, name),
        NODE,
        name,
        "query point",
        "a margin is a distance per axis of the query box",
      ),
    );
    const [marginCol, minCol, maxCol] = marginCols;

    const Q = buildBoxes(src, qLocal, "in", "queryFrame");
    const T = buildBoxes(tgt, tLocal, "targets", "targetFrame");

    // ---- the queries as TESTED: each face moved out by its margin (the
    // symmetric one plus that side's own), which grows the half-extent by
    // the mean of the two and moves the centre by half their difference,
    // along the axis the box's local +k lands on.
    const qc = new Float64Array(n * 3);
    const qh = new Float64Array(n * 3);
    const qEmpty = new Uint8Array(n);
    const qRad = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let empty = false;
      qc[i * 3] = Q.centre[i * 3];
      qc[i * 3 + 1] = Q.centre[i * 3 + 1];
      qc[i * 3 + 2] = Q.centre[i * 3 + 2];
      for (let k = 0; k < 3; k++) {
        const sym = readComp(marginCol, i, k);
        const a = sym + readComp(minCol, i, k);
        const b = sym + readComp(maxCol, i, k);
        const g = Q.half[i * 3 + k] + 0.5 * (a + b);
        qh[i * 3 + k] = g;
        if (g < 0) empty = true;
        const shift = 0.5 * (b - a);
        if (shift !== 0) {
          qc[i * 3] += shift * Q.axes[i * 9 + k * 3];
          qc[i * 3 + 1] += shift * Q.axes[i * 9 + k * 3 + 1];
          qc[i * 3 + 2] += shift * Q.axes[i * 9 + k * 3 + 2];
        }
      }
      qEmpty[i] = empty ? 1 : 0;
      qRad[i] = empty ? 0 : Math.hypot(qh[i * 3], qh[i * 3 + 1], qh[i * 3 + 2]);
    }
    const G: BoxTable = { count: n, centre: qc, axes: Q.axes, half: qh, aligned: Q.aligned };
    const tRad = new Float64Array(m);
    for (let j = 0; j < m; j++) tRad[j] = Math.hypot(T.half[j * 3], T.half[j * 3 + 1], T.half[j * 3 + 2]);

    // An absolute slack for the prefilter, from the largest coordinate in
    // play: rounding in a centre is relative to IT, not to the radii.
    let maxCoord = 0;
    for (const c of [qc, T.centre]) for (let k = 0; k < c.length; k++) maxCoord = Math.max(maxCoord, Math.abs(c[k]));
    const absSlack = 1e-12 * maxCoord;

    const levels = n > 0 ? buildLevels(T, tRad, qRad, absSlack) : [];

    // ---- the queries
    const hit = new Uint8Array(n);
    const count = new Int32Array(n);
    const nearest = new Int32Array(n).fill(-1);
    const cand: number[] = [];
    const hitJ: number[] = [];
    const hitD: number[] = [];
    const pairs = buildPairs ? new PairBuffer() : null;
    for (let i = 0; i < n; i++) {
      if ((i & (CANCEL_STRIDE - 1)) === 0) checkCancelled();
      if (qEmpty[i] === 1 || m === 0) continue;
      const cx = qc[i * 3];
      const cy = qc[i * 3 + 1];
      const cz = qc[i * 3 + 2];
      hitJ.length = 0;
      hitD.length = 0;
      for (const level of levels) {
        const reach = (qRad[i] + level.radius) * (1 + SPHERE_SLACK) + absSlack;
        level.grid.queryUnordered(cx, cy, cz, reach, cand);
        for (let k = 0; k < cand.length; k++) {
          const j = level.members[cand[k]];
          if (excludeSelf && j === i) continue;
          if (qKey !== undefined && qKey[i] === tKey![j]) continue;
          if (!boxesMeet(mode, G, qh, i, T, j)) continue;
          const dx = T.centre[j * 3] - cx;
          const dy = T.centre[j * 3 + 1] - cy;
          const dz = T.centre[j * 3 + 2] - cz;
          hitJ.push(j);
          hitD.push(dx * dx + dy * dy + dz * dz);
        }
      }
      const c = hitJ.length;
      hit[i] = c > 0 ? 1 : 0;
      count[i] = c;
      if (c === 0) continue;
      if (pairs !== null) {
        if (pairs.count + c > MAX_PAIRS) {
          throw new Error(
            `${NODE}: more than ${MAX_PAIRS} (query, target) pairs on the "pairs" output (${n} queries against ${m} targets, mode "${modeName}"); that is close to every box meeting every box, which a margin on the scale of the layout produces. Lower "margin", "marginMin" or "marginMax" to the reach you mean, narrow the sets with "excludeAttr", or leave "pairs" unwired and read "countAttr" / "targetAttr" instead.`,
          );
        }
        // Copied and sorted inside the buffer: hitJ itself is left in the
        // grids' order, which the nearest pass below reads with hitD.
        pairs.push(i, hitJ);
      }
      // Nearest, in two passes so the answer is a function of the SET of
      // hits and never of the order they were found in: the least distance,
      // then the lowest index among the hits within the tie band of it.
      let dMin = Infinity;
      for (let k = 0; k < c; k++) if (hitD[k] < dMin) dMin = hitD[k];
      const cMax = Math.max(Math.abs(cx), Math.abs(cy), Math.abs(cz));
      const tieAbs = NEAREST_TIE_REL * cMax;
      const within = dMin + NEAREST_TIE_REL * (dMin + 2 * cMax * Math.sqrt(dMin)) + tieAbs * tieAbs;
      let best = -1;
      for (let k = 0; k < c; k++) if (hitD[k] <= within && (best < 0 || hitJ[k] < best)) best = hitJ[k];
      nearest[i] = best;
    }

    // ---- write: every field was resolved above, before any column moved.
    const out = deriveGeometry(src);
    const set = out.attrs.point;
    if (params.hitAttr !== "") (set.replace(params.hitAttr, "bool", 1, 0).writable() as Uint8Array).set(hit);
    if (params.countAttr !== "") (set.replace(params.countAttr, "i32", 1, 0).writable() as Int32Array).set(count);
    if (params.targetAttr !== "") (set.replace(params.targetAttr, "i32", 1, -1).writable() as Int32Array).set(nearest);
    return {
      out: [makeGeometryItem(out)],
      pairs:
        pairs === null
          ? []
          : [makeGeometryItem(writePairs(pairs, pairNames, pairRegion, pairFrame, qc, qh, T, tgt, seed, checkCancelled))],
    };
  },
});
