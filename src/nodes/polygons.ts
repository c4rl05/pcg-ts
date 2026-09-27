/**
 * Planar polygon nodes: booleans of closed polylines and cutting them
 * along lines.
 *
 * {@link polygonBoolean} computes the union, intersection or difference
 * of two SETS of closed polylines (the `in` pin and the `clip` pin), per
 * group when `groupAttr` names one. {@link splitPolygons} cuts every
 * polygon of `in` along the polylines of `cutters`, removing a strip
 * `kerf` wide around each cut — glass lights between mullion bars, a
 * floor plate less its stair wells, a facade less its openings. Both put
 * out closed polylines ready for `extrudePolygon`: OUTER loops plus HOLE
 * loops, a hole naming its outer through the primitive attribute
 * {@link HOLE_OF_ATTR} (`holeOf`, i32: -1 on an outer, the output
 * primitive index of the outer on a hole). Both also READ that attribute
 * on their inputs, so an output feeds straight back in.
 *
 * ── THE ALGORITHM, AND WHY THIS ONE ─────────────────────────────────────
 *
 * Robustness was the brief, speed second, so this is NOT Greiner-Hormann
 * (whose published form assumes no vertex lies on the other polygon's
 * edge and needs perturbation to survive shared vertices and collinear
 * edges — exactly the cases a building produces on purpose) and not a
 * Martinez-Rueda or Vatti sweep (correct, but their degeneracy handling
 * lives in event-ordering rules that are easy to get subtly wrong and
 * hard to test). It is the textbook OVERLAY: build the planar arrangement
 * of every edge, label each face of it with the winding number of each
 * operand, and keep the edges whose two sides disagree about the result.
 * Degeneracies stop being special cases, because none of the steps looks
 * at two polygons at once:
 *
 * 1. SNAP. Every vertex goes through one pool that welds any point within
 *    `snapDistance` of an existing vertex onto it (a grid hash, the lowest
 *    index winning a tie), so near-coincident corners are ONE vertex.
 * 2. SPLIT, to a fixed point. Every edge is split at every vertex lying
 *    within `snapDistance` of its interior and at every proper crossing
 *    (the crossing point itself snapped through the pool), and duplicate
 *    edges merge — their per-operand COUNTS add, which is what makes a
 *    collinear overlap, a shared edge between touching polygons, and a
 *    slit whose two sides cancel all the same case. Repeated until a pass
 *    splits nothing (snapping can move an edge by up to `snapDistance`,
 *    which can expose a new crossing; the pass count is capped and the cap
 *    is an error, never a silent answer).
 * 3. FACES. The arrangement's half-edges are sorted around each vertex by
 *    an exact angle comparator (half-plane then cross-product sign — no
 *    atan2, whose last bit is not specified across platforms) and walked
 *    into face cycles.
 * 4. WINDING, combinatorially. Crossing a half-edge changes each
 *    operand's winding number by that edge's integer count, so within one
 *    connected piece of the arrangement every face's winding follows from
 *    ONE face's by integers — no ray cast per face, so no face can
 *    disagree with its neighbour through rounding. The one value per piece
 *    comes from a single winding-number test at the piece's lowest vertex
 *    against the OTHER pieces' edges (a piece never contributes to its own
 *    unbounded face). A labelling that fails to close is refused as a
 *    numerical failure rather than emitted.
 * 5. SELECT and TRACE. A face is IN the result when the operation says so
 *    of its (A inside, B inside) pair, "inside" being winding > 0 after
 *    every input outer loop has been oriented counter-clockwise and every
 *    input hole clockwise. The kept half-edges (result on the left) are
 *    traced with the first kept edge clockwise from the arrival direction,
 *    split at any vertex a loop visits twice, and classified by signed
 *    area: positive is an outer, negative a hole. A hole is given the
 *    smallest outer containing the midpoint of its longest edge (an outer
 *    running that same edge the other way lies inside the hole and is
 *    skipped — the ring and the island a zero-width closed cut makes).
 *
 * The cost is quadratic in the edges of a group in the worst case (the
 * split pass is pruned by a sweep over x, and one winding test per
 * arrangement piece is linear), which is the trade this file makes on
 * purpose: a facade or a floor plate is hundreds of edges, not millions.
 *
 * ── DETERMINISM ─────────────────────────────────────────────────────────
 *
 * Every tie is broken by an index or a coordinate, never by hash-map
 * iteration order, and nothing here draws a random number. The output
 * order is canonical: within a group (or a split polygon) the outers are
 * sorted by their lexicographically smallest vertex (u, then v, in the
 * plane's own coordinates), every loop starts at that vertex, and each
 * outer is followed immediately by its holes, sorted the same way.
 */
import { type Attribute, type AttrDefault, Geometry, PRIMTYPE_ATTR, setPolylineTopology } from "../data/index.js";
import { canonicalOneOf } from "../diagnostics/canonical.js";
import { isField } from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { standardNode } from "./registry.js";
import { copyElements, optionalGeometry, readComp, requireGeometry, resolveOn } from "./util.js";
import type {
  PolygonBooleanInputs,
  PolygonBooleanOutputs,
  PolygonBooleanParams,
  SplitPolygonsInputs,
  SplitPolygonsOutputs,
  SplitPolygonsParams,
} from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { PolygonBooleanParams, SplitPolygonsParams } from "./params.generated.js";

/**
 * The primitive attribute linking a HOLE loop to its OUTER loop: i32, -1
 * on an outer, and on a hole the primitive index (in the same geometry)
 * of the outer it cuts. Written by {@link polygonBoolean} and
 * {@link splitPolygons}, read by both on their inputs.
 */
const HOLE_OF_ATTR = "holeOf";

/** The planes the polygons are read in, `extrudePolygon`'s '+y' first. */
const POLYGON_PLANES = ["xz", "xy", "yz"] as const;

/** The three set operations {@link polygonBoolean} offers. */
const POLYGON_OPERATIONS = ["union", "intersection", "difference"] as const;

/**
 * An operation decided ONCE from its param string. A branded number, not
 * the string, is what reaches the per-face loop (see CLAUDE.md on param
 * strings compared per element).
 */
type OpCode = number & { readonly __polygonOp: unique symbol };
const OP_UNION = 0 as OpCode;
const OP_INTERSECTION = 1 as OpCode;
const OP_DIFFERENCE = 2 as OpCode;

/**
 * How the plane maps 3D to the 2D (u, v) the overlay runs in: u is
 * component `iu`, v is `sv` times component `iv`, and component `ih` is
 * the height off the plane. Chosen so that (u, v, normal) is RIGHT-HANDED
 * with the normal pointing along the plane's positive axis — for 'xz',
 * u = x and v = -z, so a counter-clockwise loop in (u, v) is
 * counter-clockwise seen from +y, the side `extrudePolygon` '+y' builds
 * toward.
 */
interface PlaneAxes {
  readonly iu: number;
  readonly iv: number;
  readonly sv: number;
  readonly ih: number;
}

function planeAxes(nodeType: string, value: string): PlaneAxes {
  const plane = canonicalOneOf(POLYGON_PLANES, value);
  if (plane === undefined) {
    throw new Error(
      `${nodeType}: param "plane" must be one of ${POLYGON_PLANES.join(", ")}; got ${JSON.stringify(value)}`,
    );
  }
  // Compared once, here, where the params are read; the axes are what
  // travel into the loops.
  if (plane === "xz") return { iu: 0, iv: 2, sv: -1, ih: 1 };
  if (plane === "xy") return { iu: 0, iv: 1, sv: 1, ih: 2 };
  return { iu: 1, iv: 2, sv: 1, ih: 0 };
}

function requireSnapDistance(nodeType: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${nodeType}: param "snapDistance" must be a finite number greater than 0 (world units; the default 0.0001 welds corners closer than a tenth of a millimetre at metre scale); got ${value}`,
    );
  }
  return value;
}

/** Past this many split passes the arrangement is refused, not guessed. */
const MAX_SPLIT_PASSES = 64;

// ---------------------------------------------------------------------------
// The overlay engine (2D, f64). Nothing below knows about geometries.

/** One input loop in the plane. `hole` loops are oriented clockwise. */
interface Ring2 {
  readonly u: Float64Array;
  readonly v: Float64Array;
  /** 0 = operand A (the subject), 1 = operand B (the clip). */
  readonly operand: 0 | 1;
  readonly hole: boolean;
}

/** An open chain the result is cut along with no width (kerf 0). */
interface Chain2 {
  readonly u: Float64Array;
  readonly v: Float64Array;
}

/** One output loop in the plane, starting at its canonical vertex. */
interface Loop2 {
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly area: number;
}

/** An outer loop and the holes that cut it. */
interface Region2 {
  readonly outer: Loop2;
  readonly holes: Loop2[];
}

function signedArea(u: ArrayLike<number>, v: ArrayLike<number>): number {
  const n = u.length;
  let s = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) s += u[j] * v[i] - u[i] * v[j];
  return s / 2;
}

/**
 * The vertex pool: every point the overlay handles goes through `add`,
 * which returns an existing vertex within `eps` (the nearest, the lowest
 * index on a tie) or makes a new one. Cells are `eps` wide, so a 3x3
 * neighbourhood holds every candidate. Keys are strings built from whole
 * cell indices, and a lookup never depends on the map's iteration order.
 */
class VertexPool {
  readonly xs: number[] = [];
  readonly ys: number[] = [];
  private readonly cells = new Map<string, number[]>();
  private readonly eps: number;
  private readonly eps2: number;

  constructor(eps: number) {
    this.eps = eps;
    this.eps2 = eps * eps;
  }

  add(x: number, y: number): number {
    const cx = Math.floor(x / this.eps);
    const cy = Math.floor(y / this.eps);
    let best = -1;
    let bestD = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = this.cells.get(`${cx + dx},${cy + dy}`);
        if (bucket === undefined) continue;
        for (const id of bucket) {
          const ex = this.xs[id] - x;
          const ey = this.ys[id] - y;
          const d = ex * ex + ey * ey;
          if (d <= this.eps2 && (d < bestD || (d === bestD && id < best))) {
            best = id;
            bestD = d;
          }
        }
      }
    }
    if (best >= 0) return best;
    const id = this.xs.length;
    this.xs.push(x);
    this.ys.push(y);
    const key = `${cx},${cy}`;
    const bucket = this.cells.get(key);
    if (bucket === undefined) this.cells.set(key, [id]);
    else bucket.push(id);
    return id;
  }
}

/**
 * The edge list: undirected edges stored a -> b with per-operand signed
 * counts (how many times the input loops walk a -> b, net of b -> a) and
 * a flag for zero-width cut chains.
 */
interface Edges {
  a: number[];
  b: number[];
  cA: number[];
  cB: number[];
  cut: number[];
}

function emptyEdges(): Edges {
  return { a: [], b: [], cA: [], cB: [], cut: [] };
}

function pushEdge(e: Edges, a: number, b: number, cA: number, cB: number, cut: number): void {
  e.a.push(a);
  e.b.push(b);
  e.cA.push(cA);
  e.cB.push(cB);
  e.cut.push(cut);
}

/**
 * Canonicalize (lower vertex index first, counts negated with the flip),
 * drop degenerate edges, merge duplicates by ADDING their counts, and drop
 * what then carries nothing. First-occurrence order, so the result is a
 * function of the input order alone.
 */
function mergeEdges(e: Edges, vertexCount: number): Edges {
  const out = emptyEdges();
  const at = new Map<number, number>();
  for (let i = 0; i < e.a.length; i++) {
    const a = e.a[i];
    const b = e.b[i];
    if (a === b) continue;
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    const s = a < b ? 1 : -1;
    const key = lo * vertexCount + hi;
    const k = at.get(key);
    if (k === undefined) {
      at.set(key, out.a.length);
      pushEdge(out, lo, hi, s * e.cA[i], s * e.cB[i], e.cut[i]);
    } else {
      out.cA[k] += s * e.cA[i];
      out.cB[k] += s * e.cB[i];
      out.cut[k] |= e.cut[i];
    }
  }
  const kept = emptyEdges();
  for (let i = 0; i < out.a.length; i++) {
    if (out.cA[i] !== 0 || out.cB[i] !== 0 || out.cut[i] !== 0) {
      pushEdge(kept, out.a[i], out.b[i], out.cA[i], out.cB[i], out.cut[i]);
    }
  }
  return kept;
}

/**
 * Split every edge at the vertices on it and at the proper crossings, to
 * a fixed point. Returns the merged, non-crossing edge set.
 */
function buildArrangement(pool: VertexPool, input: Edges, eps: number, nodeType: string): Edges {
  const xs = pool.xs;
  const ys = pool.ys;
  const eps2 = eps * eps;
  let edges = mergeEdges(input, Math.max(1, xs.length));

  /** Is vertex p within eps of the OPEN segment a-b? */
  const onInterior = (p: number, a: number, b: number): boolean => {
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    const px = xs[p] - xs[a];
    const py = ys[p] - ys[a];
    const t = (px * dx + py * dy) / len2;
    if (!(t > 0 && t < 1)) return false;
    const cross = px * dy - py * dx;
    return (cross * cross) / len2 <= eps2;
  };
  const orient = (a: number, b: number, c: number): number =>
    (xs[b] - xs[a]) * (ys[c] - ys[a]) - (ys[b] - ys[a]) * (xs[c] - xs[a]);

  for (let pass = 0; ; pass++) {
    if (pass >= MAX_SPLIT_PASSES) {
      throw new Error(
        `${nodeType}: the edge arrangement did not settle after ${MAX_SPLIT_PASSES} split passes — snapping kept exposing new crossings, which happens when many edges run nearly parallel within a few "snapDistance" of each other. Raise "snapDistance" (so near-coincident edges weld into one) or clean the input polygons upstream.`,
      );
    }
    const n = edges.a.length;
    const minX = new Float64Array(n);
    const maxX = new Float64Array(n);
    const minY = new Float64Array(n);
    const maxY = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = edges.a[i];
      const b = edges.b[i];
      minX[i] = Math.min(xs[a], xs[b]);
      maxX[i] = Math.max(xs[a], xs[b]);
      minY[i] = Math.min(ys[a], ys[b]);
      maxY[i] = Math.max(ys[a], ys[b]);
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => minX[i] - minX[j] || i - j);
    const splits: (number[] | undefined)[] = new Array<number[] | undefined>(n);
    let any = false;
    const addSplit = (i: number, p: number): void => {
      const list = splits[i];
      if (list === undefined) splits[i] = [p];
      else list.push(p);
      any = true;
    };
    for (let k = 0; k < n; k++) {
      const i = order[k];
      const a = edges.a[i];
      const b = edges.b[i];
      for (let m = k + 1; m < n; m++) {
        const j = order[m];
        if (minX[j] > maxX[i] + eps) break;
        if (minY[j] > maxY[i] + eps || maxY[j] < minY[i] - eps) continue;
        const c = edges.a[j];
        const d = edges.b[j];
        let touched = false;
        if (c !== a && c !== b && onInterior(c, a, b)) {
          addSplit(i, c);
          touched = true;
        }
        if (d !== a && d !== b && onInterior(d, a, b)) {
          addSplit(i, d);
          touched = true;
        }
        if (a !== c && a !== d && onInterior(a, c, d)) {
          addSplit(j, a);
          touched = true;
        }
        if (b !== c && b !== d && onInterior(b, c, d)) {
          addSplit(j, b);
          touched = true;
        }
        if (touched || a === c || a === d || b === c || b === d) continue;
        const o1 = orient(a, b, c);
        const o2 = orient(a, b, d);
        const o3 = orient(c, d, a);
        const o4 = orient(c, d, b);
        if (!(((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))) {
          continue;
        }
        // Proper crossing: the parameter along a-b is o3 / (o3 - o4),
        // the ratio of c-d's side tests at a and b.
        const t = o3 / (o3 - o4);
        const x = xs[a] + t * (xs[b] - xs[a]);
        const y = ys[a] + t * (ys[b] - ys[a]);
        const p = pool.add(x, y);
        if (p !== a && p !== b) addSplit(i, p);
        if (p !== c && p !== d) addSplit(j, p);
      }
    }
    if (!any) return edges;
    const next = emptyEdges();
    for (let i = 0; i < n; i++) {
      const a = edges.a[i];
      const b = edges.b[i];
      const list = splits[i];
      if (list === undefined) {
        pushEdge(next, a, b, edges.cA[i], edges.cB[i], edges.cut[i]);
        continue;
      }
      const dx = xs[b] - xs[a];
      const dy = ys[b] - ys[a];
      const tOf = (p: number): number => (xs[p] - xs[a]) * dx + (ys[p] - ys[a]) * dy;
      const sorted = [...new Set(list)].filter((p) => p !== a && p !== b).sort((p, q) => tOf(p) - tOf(q) || p - q);
      let prev = a;
      for (const p of sorted) {
        pushEdge(next, prev, p, edges.cA[i], edges.cB[i], edges.cut[i]);
        prev = p;
      }
      pushEdge(next, prev, b, edges.cA[i], edges.cB[i], edges.cut[i]);
    }
    edges = mergeEdges(next, xs.length);
  }
}

/** 0 for directions in [0, pi), 1 for [pi, 2 pi): the exact half-plane. */
function half(dx: number, dy: number): number {
  return dy > 0 || (dy === 0 && dx > 0) ? 0 : 1;
}

/**
 * The overlay proper: rings of two operands and optional zero-width cut
 * chains in, the regions of `op(A, B)` out. See the file comment for the
 * five steps.
 */
function overlay(
  rings: readonly Ring2[],
  chains: readonly Chain2[],
  op: OpCode,
  eps: number,
  nodeType: string,
): Region2[] {
  const pool = new VertexPool(eps);
  const input = emptyEdges();
  const eps2 = eps * eps;

  for (const ring of rings) {
    const n = ring.u.length;
    const area = signedArea(ring.u, ring.v);
    // A loop enclosing no area contributes nothing to either operand.
    if (!(Math.abs(area) > eps2)) continue;
    // Outer loops count counter-clockwise, holes clockwise, whichever way
    // the input wound them.
    const want = ring.hole ? -1 : 1;
    const sign = Math.sign(area) === want ? 1 : -1;
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      const id = pool.add(ring.u[i], ring.v[i]);
      if (ids.length === 0 || ids[ids.length - 1] !== id) ids.push(id);
    }
    while (ids.length > 1 && ids[ids.length - 1] === ids[0]) ids.pop();
    if (ids.length < 3) continue;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % ids.length];
      pushEdge(input, a, b, ring.operand === 0 ? sign : 0, ring.operand === 1 ? sign : 0, 0);
    }
  }
  for (const chain of chains) {
    let prev = -1;
    for (let i = 0; i < chain.u.length; i++) {
      const id = pool.add(chain.u[i], chain.v[i]);
      if (prev >= 0 && prev !== id) pushEdge(input, prev, id, 0, 0, 1);
      prev = id;
    }
  }

  const edges = buildArrangement(pool, input, eps, nodeType);
  const xs = pool.xs;
  const ys = pool.ys;
  const nE = edges.a.length;
  if (nE === 0) return [];
  const nH = nE * 2;
  const origin = (h: number): number => ((h & 1) === 0 ? edges.a[h >> 1] : edges.b[h >> 1]);
  const dest = (h: number): number => ((h & 1) === 0 ? edges.b[h >> 1] : edges.a[h >> 1]);

  // ── Rotation system: outgoing half-edges per vertex, counter-clockwise
  // from +u by an exact comparator.
  const nV = xs.length;
  const deg = new Int32Array(nV + 1);
  for (let h = 0; h < nH; h++) deg[origin(h) + 1]++;
  for (let v = 0; v < nV; v++) deg[v + 1] += deg[v];
  const vStart = deg; // CSR offsets
  const fill = new Int32Array(nV);
  const vList = new Int32Array(nH);
  for (let h = 0; h < nH; h++) {
    const o = origin(h);
    vList[vStart[o] + fill[o]++] = h;
  }
  const dirX = (h: number): number => xs[dest(h)] - xs[origin(h)];
  const dirY = (h: number): number => ys[dest(h)] - ys[origin(h)];
  const posInOrigin = new Int32Array(nH);
  for (let v = 0; v < nV; v++) {
    const s = vStart[v];
    const e = vStart[v + 1];
    if (e - s > 1) {
      const sub = Array.from(vList.subarray(s, e));
      sub.sort((h1, h2) => {
        const x1 = dirX(h1);
        const y1 = dirY(h1);
        const x2 = dirX(h2);
        const y2 = dirY(h2);
        const d = half(x1, y1) - half(x2, y2);
        if (d !== 0) return d;
        const cr = x1 * y2 - y1 * x2;
        if (cr > 0) return -1;
        if (cr < 0) return 1;
        return h1 - h2;
      });
      vList.set(sub, s);
    }
    for (let k = s; k < e; k++) posInOrigin[vList[k]] = k - s;
  }
  /** Next half-edge of the face on the left: first clockwise from the twin. */
  const nextOnFace = (h: number): number => {
    const t = h ^ 1;
    const v = origin(t);
    const s = vStart[v];
    const d = vStart[v + 1] - s;
    return vList[s + ((posInOrigin[t] - 1 + d) % d)];
  };

  // ── Faces.
  const faceOf = new Int32Array(nH).fill(-1);
  const faceStart: number[] = [];
  const faceHalf: number[] = [];
  for (let h0 = 0; h0 < nH; h0++) {
    if (faceOf[h0] >= 0) continue;
    const f = faceStart.length;
    faceStart.push(faceHalf.length);
    let h = h0;
    do {
      faceOf[h] = f;
      faceHalf.push(h);
      h = nextOnFace(h);
    } while (h !== h0);
  }
  const nF = faceStart.length;
  faceStart.push(faceHalf.length);

  // ── Connected pieces of the arrangement (union-find on vertices).
  const parent = new Int32Array(nV);
  for (let v = 0; v < nV; v++) parent[v] = v;
  const find = (v: number): number => {
    while (parent[v] !== v) {
      parent[v] = parent[parent[v]];
      v = parent[v];
    }
    return v;
  };
  for (let e = 0; e < nE; e++) {
    const ra = find(edges.a[e]);
    const rb = find(edges.b[e]);
    if (ra !== rb) {
      if (ra < rb) parent[rb] = ra;
      else parent[ra] = rb;
    }
  }
  const pieceOfEdge = new Int32Array(nE);
  for (let e = 0; e < nE; e++) pieceOfEdge[e] = find(edges.a[e]);
  // Lowest vertex (u, then v) of each piece.
  const lowest = new Map<number, number>();
  for (let e = 0; e < nE; e++) {
    const root = pieceOfEdge[e];
    for (const v of [edges.a[e], edges.b[e]]) {
      const cur = lowest.get(root);
      if (cur === undefined || xs[v] < xs[cur] || (xs[v] === xs[cur] && ys[v] < ys[cur])) lowest.set(root, v);
    }
  }
  const roots = [...lowest.keys()].sort((r, s) => r - s);

  // ── Winding per face, combinatorially from one value per piece.
  const wA = new Int32Array(nF);
  const wB = new Int32Array(nF);
  const seen = new Uint8Array(nF);
  for (const root of roots) {
    const v0 = lowest.get(root) as number;
    // The face on the left of the LAST outgoing half-edge in [0, pi) —
    // or of the last one of all when every edge leaves downward — is the
    // one containing direction pi, the piece's outside at its lowest vertex.
    const s = vStart[v0];
    const e = vStart[v0 + 1];
    let pick = vList[e - 1];
    for (let k = s; k < e; k++) {
      const h = vList[k];
      if (half(dirX(h), dirY(h)) === 0) pick = h;
    }
    const outside = faceOf[pick];
    // Winding at v0 from every OTHER piece (Sunday's crossing rule; this
    // piece contributes nothing to its own outside).
    const px = xs[v0];
    const py = ys[v0];
    let a0 = 0;
    let b0 = 0;
    for (let k = 0; k < nE; k++) {
      if (pieceOfEdge[k] === root) continue;
      const a = edges.a[k];
      const b = edges.b[k];
      const ay = ys[a];
      const by = ys[b];
      const cr = (xs[b] - xs[a]) * (py - ay) - (by - ay) * (px - xs[a]);
      if (ay <= py) {
        if (by > py && cr > 0) {
          a0 += edges.cA[k];
          b0 += edges.cB[k];
        }
      } else if (by <= py && cr < 0) {
        a0 -= edges.cA[k];
        b0 -= edges.cB[k];
      }
    }
    wA[outside] = a0;
    wB[outside] = b0;
    seen[outside] = 1;
    const queue = [outside];
    for (let qi = 0; qi < queue.length; qi++) {
      const f = queue[qi];
      for (let k = faceStart[f]; k < faceStart[f + 1]; k++) {
        const h = faceHalf[k];
        const g = faceOf[h ^ 1];
        const sgn = (h & 1) === 0 ? 1 : -1;
        const ga = wA[f] - sgn * edges.cA[h >> 1];
        const gb = wB[f] - sgn * edges.cB[h >> 1];
        if (seen[g] === 0) {
          seen[g] = 1;
          wA[g] = ga;
          wB[g] = gb;
          queue.push(g);
        } else if (wA[g] !== ga || wB[g] !== gb) {
          throw new Error(
            `${nodeType}: the face labelling of the edge arrangement did not close (a numerical failure near (${xs[origin(h)]}, ${ys[origin(h)]}) in the plane); raise "snapDistance" so the nearly coincident geometry there welds, or clean the input upstream.`,
          );
        }
      }
    }
  }

  // ── Select.
  const inResult = new Uint8Array(nF);
  for (let f = 0; f < nF; f++) {
    const ia = wA[f] > 0;
    const ib = wB[f] > 0;
    const r = op === OP_UNION ? ia || ib : op === OP_INTERSECTION ? ia && ib : ia && !ib;
    inResult[f] = r ? 1 : 0;
  }
  const keep = new Uint8Array(nH);
  for (let h = 0; h < nH; h++) {
    const f = faceOf[h];
    const g = faceOf[h ^ 1];
    if (inResult[f] === 0) continue;
    if (inResult[g] === 0 || (edges.cut[h >> 1] !== 0 && f !== g)) keep[h] = 1;
  }

  // ── Trace the kept half-edges into loops (result on the left).
  const used = new Uint8Array(nH);
  const traced: number[][] = [];
  for (let h0 = 0; h0 < nH; h0++) {
    if (keep[h0] === 0 || used[h0] !== 0) continue;
    const loop: number[] = [];
    let h = h0;
    do {
      used[h] = 1;
      loop.push(origin(h));
      const t = h ^ 1;
      const v = origin(t);
      const s = vStart[v];
      const d = vStart[v + 1] - s;
      const p = posInOrigin[t];
      let nh = -1;
      for (let step = 1; step <= d; step++) {
        const cand = vList[s + ((p - step + d * 2) % d)];
        if (keep[cand] !== 0) {
          nh = cand;
          break;
        }
      }
      if (nh < 0 || (used[nh] !== 0 && nh !== h0)) {
        throw new Error(
          `${nodeType}: the result boundary could not be traced near (${xs[v]}, ${ys[v]}) in the plane (a numerical failure); raise "snapDistance" so the nearly coincident geometry there welds, or clean the input upstream.`,
        );
      }
      h = nh;
    } while (h !== h0);
    traced.push(loop);
  }

  // ── Split loops at repeated vertices, drop collinear vertices and
  // empty loops, classify by signed area.
  const collinearTol = eps * 1e-3;
  const outers: Loop2[] = [];
  // Every undirected ARRANGEMENT edge each outer uses, by vertex pair.
  const outerEdges = new Map<Loop2, Set<number>>();
  const holes: { loop: Loop2; probeX: number; probeY: number; probeKey: number }[] = [];
  const edgeKey = (a: number, b: number): number => (a < b ? a * nV + b : b * nV + a);
  for (const loop of traced) {
    for (const simple of splitAtRepeats(loop)) {
      const ids = dropCollinear(simple, xs, ys, collinearTol);
      if (ids.length < 3) continue;
      const u = new Float64Array(ids.length);
      const v = new Float64Array(ids.length);
      ids.forEach((id, k) => {
        u[k] = xs[id];
        v[k] = ys[id];
      });
      const area = signedArea(u, v);
      if (!(Math.abs(area) > eps2)) continue;
      const canon = canonicalLoop(u, v, area);
      if (area > 0) {
        const set = new Set<number>();
        for (let k = 0; k < simple.length; k++) set.add(edgeKey(simple[k], simple[(k + 1) % simple.length]));
        outers.push(canon);
        outerEdges.set(canon, set);
        continue;
      }
      // The hole's PROBE: the midpoint of its longest arrangement edge,
      // read before collinear vertices were dropped, so it lies on that
      // edge and on no other loop's — except an outer running the same
      // edge the other way, which is INSIDE the hole (a zero-width cut
      // around it) and is skipped by that edge's key below.
      let best = 0;
      let bestLen = -1;
      for (let k = 0; k < simple.length; k++) {
        const a = simple[k];
        const b = simple[(k + 1) % simple.length];
        const len = (xs[b] - xs[a]) ** 2 + (ys[b] - ys[a]) ** 2;
        if (len > bestLen) {
          bestLen = len;
          best = k;
        }
      }
      const pa = simple[best];
      const pb = simple[(best + 1) % simple.length];
      holes.push({
        loop: canon,
        probeX: (xs[pa] + xs[pb]) / 2,
        probeY: (ys[pa] + ys[pb]) / 2,
        probeKey: edgeKey(pa, pb),
      });
    }
  }
  outers.sort(compareLoops);
  const regions: Region2[] = outers.map((outer) => ({ outer, holes: [] }));
  for (const hole of holes) {
    let best = -1;
    for (let k = 0; k < regions.length; k++) {
      const o = regions[k].outer;
      if ((outerEdges.get(o) as Set<number>).has(hole.probeKey)) continue;
      if (windingOf(o.u, o.v, hole.probeX, hole.probeY) === 0) continue;
      if (best < 0 || o.area < regions[best].outer.area) best = k;
    }
    // A hole no outer contains cannot occur on a consistent labelling; it
    // is dropped rather than attached to a guess.
    if (best >= 0) regions[best].holes.push(hole.loop);
  }
  for (const r of regions) r.holes.sort(compareLoops);
  return regions;
}

/**
 * Split a closed vertex cycle at every vertex it visits twice, into
 * simple cycles: a hole pinched against its outer at one point comes out
 * as the outer and the hole, not one weakly simple loop.
 */
function splitAtRepeats(loop: readonly number[]): number[][] {
  const out: number[][] = [];
  const stack: number[] = [];
  const pos = new Map<number, number>();
  for (const id of loop) {
    const at = pos.get(id);
    if (at !== undefined) {
      const sub = stack.splice(at);
      for (const x of sub) pos.delete(x);
      out.push(sub);
    }
    pos.set(id, stack.length);
    stack.push(id);
  }
  if (stack.length > 0) out.push(stack);
  return out;
}

/**
 * Remove every vertex lying within `tol` of the straight segment joining
 * its neighbours, and going FORWARD along it — the split points the
 * arrangement introduced where another edge touched this one and the
 * result does not turn there. Repeated until stable.
 */
function dropCollinear(ids: readonly number[], xs: number[], ys: number[], tol: number): number[] {
  let cur = [...ids];
  for (;;) {
    const n = cur.length;
    if (n < 3) return cur;
    const next: number[] = [];
    let removed = false;
    for (let i = 0; i < n; i++) {
      const a = next.length > 0 ? next[next.length - 1] : cur[(i - 1 + n) % n];
      const b = cur[i];
      const c = cur[(i + 1) % n];
      const abx = xs[b] - xs[a];
      const aby = ys[b] - ys[a];
      const bcx = xs[c] - xs[b];
      const bcy = ys[c] - ys[b];
      const acx = xs[c] - xs[a];
      const acy = ys[c] - ys[a];
      const len = Math.sqrt(acx * acx + acy * acy);
      const cross = abx * acy - aby * acx;
      if (len > 0 && Math.abs(cross) <= tol * len && abx * bcx + aby * bcy > 0) {
        removed = true;
        continue;
      }
      next.push(b);
    }
    if (!removed) return cur;
    cur = next;
  }
}

/** Rotate a loop to start at its lexicographically smallest vertex. */
function canonicalLoop(u: Float64Array, v: Float64Array, area: number): Loop2 {
  const n = u.length;
  let best = 0;
  for (let i = 1; i < n; i++) {
    if (compareRotations(u, v, i, best) < 0) best = i;
  }
  const ou = new Float64Array(n);
  const ov = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    ou[k] = u[(best + k) % n];
    ov[k] = v[(best + k) % n];
  }
  return { u: ou, v: ov, area: Math.abs(area) };
}

function compareRotations(u: Float64Array, v: Float64Array, i: number, j: number): number {
  const n = u.length;
  for (let k = 0; k < n; k++) {
    const a = (i + k) % n;
    const b = (j + k) % n;
    if (u[a] !== u[b]) return u[a] - u[b];
    if (v[a] !== v[b]) return v[a] - v[b];
  }
  return i - j;
}

function compareLoops(p: Loop2, q: Loop2): number {
  const n = Math.min(p.u.length, q.u.length);
  for (let k = 0; k < n; k++) {
    if (p.u[k] !== q.u[k]) return p.u[k] - q.u[k];
    if (p.v[k] !== q.v[k]) return p.v[k] - q.v[k];
  }
  return p.u.length - q.u.length;
}

/** Winding number of a closed loop around (px, py), Sunday's rule. */
function windingOf(u: Float64Array, v: Float64Array, px: number, py: number): number {
  const n = u.length;
  let w = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cr = (u[j] - u[i]) * (py - v[i]) - (v[j] - v[i]) * (px - u[i]);
    if (v[i] <= py) {
      if (v[j] > py && cr > 0) w++;
    } else if (v[j] <= py && cr < 0) w--;
  }
  return w;
}

// ---------------------------------------------------------------------------
// Reading geometries.

/** One closed loop of an input geometry, by primitive. */
interface InputLoop {
  readonly prim: number;
  /** Point indices around the loop, the closing repeat removed. */
  readonly points: Uint32Array;
  readonly hole: boolean;
  /** The primitive this one is a hole of, or -1. */
  readonly holeOf: number;
}

/**
 * Every closed loop of `geo`: closed 'polyline' primitives (last vertex
 * back on the first point), 'poly' faces (closed by definition), and on a
 * geometry with no `primtype` column any primitive of 3+ vertices, closed
 * whether or not it repeats its first point. An OPEN polyline is refused
 * by name — a boolean is not defined on a curve with no inside.
 */
function readLoops(geo: Geometry, nodeType: string, pin: string): InputLoop[] {
  const v2p = geo.vertexToPoint;
  const starts = geo.primVertexStart;
  const counts = geo.primVertexCount;
  const primType = geo.attrs.primitive.get(PRIMTYPE_ATTR);
  const holeAttr = geo.attrs.primitive.get(HOLE_OF_ATTR);
  if (holeAttr !== undefined && (holeAttr.type === "string" || holeAttr.tupleSize !== 1)) {
    throw new Error(
      `${nodeType}: the geometry on pin "${pin}" carries primitive attribute "${HOLE_OF_ATTR}" as ${holeAttr.type} with tupleSize ${holeAttr.tupleSize}; "${HOLE_OF_ATTR}" is read as the i32 link from a hole loop to its outer (-1 on an outer). Rename that attribute upstream, or rewrite it as i32.`,
    );
  }
  const nPrim = geo.primitiveCount;
  const open: number[] = [];
  const loops: InputLoop[] = [];
  for (let p = 0; p < nPrim; p++) {
    const n = counts[p];
    const s = starts[p];
    const isPolyline = primType !== undefined && primType.getString(p) === "polyline";
    const closedByRepeat = n >= 2 && v2p[s] === v2p[s + n - 1];
    if (isPolyline && !closedByRepeat) {
      open.push(p);
      continue;
    }
    const m = closedByRepeat ? n - 1 : n;
    if (m < 3) continue;
    const points = new Uint32Array(m);
    for (let k = 0; k < m; k++) points[k] = v2p[s + k];
    let holeOf = -1;
    if (holeAttr !== undefined) {
      const raw = holeAttr.get(p);
      if (raw >= 0) {
        if (!Number.isInteger(raw) || raw >= nPrim || raw === p) {
          throw new Error(
            `${nodeType}: primitive ${p} on pin "${pin}" has ${HOLE_OF_ATTR} = ${raw}, which names no other primitive of the ${nPrim} there; ${HOLE_OF_ATTR} is -1 on an outer loop and the primitive index of its outer on a hole.`,
          );
        }
        holeOf = raw;
      }
    }
    loops.push({ prim: p, points, hole: holeOf >= 0, holeOf });
  }
  if (open.length > 0) {
    throw new Error(
      `${nodeType}: primitive(s) ${open.slice(0, 8).join(", ")}${open.length > 8 ? ", ..." : ""} on pin "${pin}" are OPEN polylines, and a polygon boolean is not defined on an open curve — there is no inside. Close them with pointsToPath and \`closed: true\` (a closed polyline's last vertex references its own first point)${nodeType === "splitPolygons" && pin === "in" ? ', or connect them to the "cutters" pin if they are the cuts' : ""}.`,
    );
  }
  return loops;
}

function requirePositions(geo: Geometry, nodeType: string, pin: string): ArrayLike<number> {
  const P = geo.attrs.point.get("P");
  if (P === undefined || P.type !== "f32" || P.tupleSize !== 3) {
    throw new Error(`${nodeType}: the geometry on pin "${pin}" needs a point attribute "P" (f32, tupleSize 3)`);
  }
  return P.data;
}

function ringOf(
  P: ArrayLike<number>,
  points: ArrayLike<number>,
  axes: PlaneAxes,
  operand: 0 | 1,
  hole: boolean,
): Ring2 {
  const n = points.length;
  const u = new Float64Array(n);
  const v = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const i = points[k] * 3;
    u[k] = P[i + axes.iu];
    v[k] = axes.sv * P[i + axes.iv];
  }
  return { u, v, operand, hole };
}

/**
 * Group keys per primitive, compared BY VALUE: a string key by its text
 * (never its string-table index), a numeric key by its value, which must
 * be a whole number — a key is an identity, and two values a ULP apart
 * would be two groups.
 */
interface GroupReader {
  readonly attr: Attribute;
  readonly isString: boolean;
  key(prim: number): string;
}

function groupReader(geo: Geometry, name: string, nodeType: string, pin: string): GroupReader {
  const attr = geo.attrs.primitive.get(name);
  if (attr === undefined) {
    throw new Error(
      `${nodeType}: param "groupAttr" names primitive attribute "${name}", which the geometry on pin "${pin}" does not carry; its primitive attributes are ${geo.attrs.primitive.names().join(", ") || "(none)"}. Write it with setAttribute (domain "primitive") or promoteAttribute, or leave "groupAttr" empty to treat everything as one group.`,
    );
  }
  if (attr.tupleSize !== 1) {
    throw new Error(
      `${nodeType}: param "groupAttr" names primitive attribute "${name}" on pin "${pin}" with tupleSize ${attr.tupleSize}; a group key is one value per primitive (a string, or a whole number).`,
    );
  }
  const isString = attr.type === "string";
  return {
    attr,
    isString,
    key(prim: number): string {
      if (isString) return `s${attr.getString(prim)}`;
      const value = attr.get(prim);
      if (!Number.isInteger(value)) {
        throw new Error(
          `${nodeType}: primitive ${prim} on pin "${pin}" has ${name} = ${value}, which is not a whole number; a numeric group key is an identity, so write it as i32 with setAttribute (which truncates), or use a string key.`,
        );
      }
      return `n${value}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Writing geometries.

/** One output loop, lifted back into 3D. */
interface OutLoop {
  readonly loop: Loop2;
  readonly height: number;
  /** Index into the output of this loop's outer, or -1 for an outer. */
  readonly holeOf: number;
  /** The input primitive whose attributes this loop carries, or -1. */
  readonly carryFrom: number;
  /** The group this loop belongs to, or -1. */
  readonly group: number;
}

function appendRegions(out: OutLoop[], regions: readonly Region2[], height: number, carryFrom: number, group: number): void {
  for (const r of regions) {
    const at = out.length;
    out.push({ loop: r.outer, height, holeOf: -1, carryFrom, group });
    for (const hole of r.holes) out.push({ loop: hole, height, holeOf: at, carryFrom, group });
  }
}

/** Closed polylines, one fresh run of points per loop. */
function buildOutput(loops: readonly OutLoop[], axes: PlaneAxes): Geometry {
  const out = new Geometry();
  let nPts = 0;
  for (const l of loops) nPts += l.loop.u.length;
  const P = out.attrs.point.add("P", "f32", 3, [0, 0, 0]);
  out.attrs.point.resize(nPts);
  const Pd = P.writable();
  const pointIndices = new Uint32Array(nPts + loops.length);
  const primVertexStart = new Uint32Array(loops.length);
  const primVertexCount = new Uint32Array(loops.length);
  let pt = 0;
  let w = 0;
  loops.forEach((l, k) => {
    const n = l.loop.u.length;
    primVertexStart[k] = w;
    primVertexCount[k] = n + 1;
    const first = pt;
    for (let i = 0; i < n; i++) {
      const o = pt * 3;
      Pd[o + axes.iu] = l.loop.u[i];
      Pd[o + axes.iv] = axes.sv * l.loop.v[i];
      Pd[o + axes.ih] = l.height;
      pointIndices[w++] = pt++;
    }
    pointIndices[w++] = first;
  });
  setPolylineTopology(out, pointIndices, primVertexStart, primVertexCount);
  const holeOf = out.attrs.primitive.add(HOLE_OF_ATTR, "i32", 1, -1);
  const hd = holeOf.writable();
  loops.forEach((l, k) => {
    hd[k] = l.holeOf;
  });
  return out;
}

/**
 * The off-plane coordinate a group's result lies at: the first point of
 * the first loop that fed it.
 */
function heightOf(P: ArrayLike<number>, loop: InputLoop, axes: PlaneAxes): number {
  return P[loop.points[0] * 3 + axes.ih];
}

const PLANE_DESCRIPTION =
  "The plane the polygons are read in. 'xz' (the default) is the ground plane — the plane `extrudePolygon`'s default direction '+y' builds up from; 'xy' and 'yz' are the two walls. Input points are PROJECTED onto it (the off-plane coordinate is ignored while computing), and each result loop is written back at the off-plane coordinate of the first input point that fed it — for a floor plate at y = 3, y = 3. Outer loops come out counter-clockwise seen from the plane's positive axis (+y for 'xz', +z for 'xy', +x for 'yz'), holes clockwise.";

const SNAP_DESCRIPTION =
  "The documented epsilon, in world units: two vertices closer than this are ONE vertex, and a vertex closer than this to an edge splits that edge — so corners that should coincide but differ by f32 rounding weld, a vertex lying on another polygon's edge is treated as ON it, and collinear or shared edges merge. Features smaller than this are not preserved: a result loop whose area is at most snapDistance squared is dropped as degenerate, and a vertex within snapDistance / 1000 of the straight line through its neighbours is removed. The default 0.0001 is a tenth of a millimetre at metre scale, a few f32 steps at a kilometre from the origin. Must be greater than 0.";

const LOOPS_READ =
  "Reads every CLOSED polyline (last vertex back on the first point, as pointsToPath `closed: true` and voronoiCells build them) and every 'poly' face; an OPEN polyline is refused by name. Each loop is a filled region whichever way it winds — except a loop whose `holeOf` primitive attribute is 0 or more, which is a HOLE and subtracts, so this node's own output (and an extrudePolygon-ready outline with holes from anywhere else) reads back as what it is. Overlapping loops of one set simply union; a self-intersecting loop is oriented by its net signed area and read by the nonzero rule.";

const OUTPUT_WRITTEN =
  "Output: closed polylines (one fresh run of points per loop, the last vertex back on the first point), each OUTER loop immediately followed by its HOLES, with an i32 primitive attribute `holeOf` — -1 on an outer, and on a hole the output primitive index of its outer — which is the convention extrudePolygon's hole support reads. Loops start at their lexicographically smallest vertex in the plane and outers are sorted the same way, so the output order depends on the geometry and never on input order. Robust by construction rather than by luck: shared vertices, collinear and overlapping edges, polygons touching along an edge or at a corner, and holes pinched against their outer are all ordinary input (see `snapDistance`).";

/** Planar boolean of two sets of closed polylines, per group. */
export const polygonBoolean = standardNode<PolygonBooleanParams, PolygonBooleanInputs, PolygonBooleanOutputs>({
  type: "polygonBoolean",
  category: "surface",
  description:
    `Planar boolean of closed polylines: the UNION, INTERSECTION or DIFFERENCE of the polygons on \`in\` (the subject) and the polygons on \`clip\`, computed in a plane (\`plane\`, 'xz' by default). This is what turns a floor plate and its stair wells into a floor with holes, a site less its buildings into the open ground, and a pile of overlapping footprints into one outline — geometry that otherwise has to be computed in TypeScript before a graph ever sees it. ${LOOPS_READ} \`clip\` is optional: unconnected it is the EMPTY set, so 'union' and 'difference' dissolve \`in\` into its own outline and 'intersection' is empty. With \`groupAttr\` set, each group is its own boolean — the subject polygons of group k against the clip polygons of group k — and the key is written onto every result loop; without it, everything is one group. Primitive attributes other than the group key are NOT carried (a union of two polygons has no single source to carry from) — group by the attribute you need to keep, or use splitPolygons, which does carry. ${OUTPUT_WRITTEN} The algorithm is a planar overlay (snap, split to a fixed point, label faces by integer winding numbers, keep the boundary) and costs up to quadratic time in the edges of a group; a facade or a floor plan is a few hundred edges.`,
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "clip", kind: "geometry", optional: true },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    operation: {
      type: "enum",
      default: "difference",
      enum: [...POLYGON_OPERATIONS],
      description:
        "'difference' (the default) keeps what is inside `in` and outside `clip` — a floor less its stair wells, a wall less its openings. 'intersection' keeps what is inside both — a footprint clipped to its lot. 'union' keeps what is inside either — overlapping footprints merged into one outline. Inside means winding number > 0 after every input outer loop is turned counter-clockwise and every `holeOf` hole clockwise, so overlapping loops within one set count once.",
    },
    plane: {
      type: "enum",
      default: "xz",
      enum: [...POLYGON_PLANES],
      description: PLANE_DESCRIPTION,
    },
    groupAttr: {
      type: "string",
      default: "",
      description:
        "Name of a scalar PRIMITIVE attribute on both pins that partitions the boolean: each group's subject polygons meet only that group's clip polygons — one floor's stair wells cut only that floor, one window's openings only that wall. Empty (the default) makes everything one group. A string key compares by its text; a numeric key must be a whole number (a key is an identity; write it as i32 with setAttribute). Both pins must carry it with the same kind (string or numeric); a group present on only one pin is still computed (its other set is empty). Every result loop carries the key, in a column of the `in` pin's type, and groups come out in the order their key first appears on `in`, then on `clip`.",
    },
    snapDistance: {
      type: "f32",
      default: 0.0001,
      description: SNAP_DESCRIPTION,
    },
  },
  execute({ inputs, params, checkCancelled }) {
    const nodeType = "polygonBoolean";
    const subject = requireGeometry(inputs, "in", nodeType);
    const clip = optionalGeometry(inputs, "clip", nodeType);
    const axes = planeAxes(nodeType, params.plane);
    const opName = canonicalOneOf(POLYGON_OPERATIONS, params.operation);
    if (opName === undefined) {
      throw new Error(
        `${nodeType}: param "operation" must be one of ${POLYGON_OPERATIONS.join(", ")}; got ${JSON.stringify(params.operation)}`,
      );
    }
    const op = opName === "union" ? OP_UNION : opName === "intersection" ? OP_INTERSECTION : OP_DIFFERENCE;
    const eps = requireSnapDistance(nodeType, params.snapDistance);

    const sLoops = readLoops(subject, nodeType, "in");
    const cLoops = clip === undefined ? [] : readLoops(clip, nodeType, "clip");
    const sP = sLoops.length > 0 ? requirePositions(subject, nodeType, "in") : new Float32Array(0);
    const cP = clip !== undefined && cLoops.length > 0 ? requirePositions(clip, nodeType, "clip") : new Float32Array(0);

    // Groups, in first-appearance order: `in` first, then `clip`.
    const groupName = params.groupAttr;
    const grouped = groupName !== "";
    // A pin with no loops needs no key: an empty clip (or a partitioned
    // cell holding no polygons) is not an authoring error.
    const sReader = grouped && sLoops.length > 0 ? groupReader(subject, groupName, nodeType, "in") : undefined;
    const cReader =
      grouped && clip !== undefined && cLoops.length > 0 ? groupReader(clip, groupName, nodeType, "clip") : undefined;
    if (sReader !== undefined && cReader !== undefined && sReader.isString !== cReader.isString) {
      throw new Error(
        `${nodeType}: param "groupAttr" names "${groupName}", which is a ${sReader.isString ? "string" : "numeric"} attribute on pin "in" and a ${cReader.isString ? "string" : "numeric"} one on pin "clip"; the two can never match. Write it as the same kind on both.`,
      );
    }
    const groupIndex = new Map<string, number>();
    const groupFirst: { pin: 0 | 1; prim: number }[] = [];
    const groupOf = (reader: GroupReader | undefined, prim: number, pin: 0 | 1): number => {
      if (reader === undefined) {
        if (groupFirst.length === 0) groupFirst.push({ pin, prim });
        return 0;
      }
      const key = reader.key(prim);
      let g = groupIndex.get(key);
      if (g === undefined) {
        g = groupFirst.length;
        groupIndex.set(key, g);
        groupFirst.push({ pin, prim });
      }
      return g;
    };
    const perGroup: { subject: InputLoop[]; clip: InputLoop[] }[] = [];
    const bucket = (g: number) => {
      while (perGroup.length <= g) perGroup.push({ subject: [], clip: [] });
      return perGroup[g];
    };
    for (const l of sLoops) bucket(groupOf(sReader, l.prim, 0)).subject.push(l);
    for (const l of cLoops) bucket(groupOf(cReader, l.prim, 1)).clip.push(l);

    const loops: OutLoop[] = [];
    perGroup.forEach((g, gi) => {
      checkCancelled();
      const rings: Ring2[] = [
        ...g.subject.map((l) => ringOf(sP, l.points, axes, 0, l.hole)),
        ...g.clip.map((l) => ringOf(cP, l.points, axes, 1, l.hole)),
      ];
      const height =
        g.subject.length > 0 ? heightOf(sP, g.subject[0], axes) : g.clip.length > 0 ? heightOf(cP, g.clip[0], axes) : 0;
      appendRegions(loops, overlay(rings, [], op, eps, nodeType), height, -1, gi);
    });

    const out = buildOutput(loops, axes);
    const keyReader = sReader ?? cReader;
    if (keyReader !== undefined) {
      const src = keyReader.attr;
      const col = out.attrs.primitive.add(groupName, src.type, 1, src.defaultValue as AttrDefault);
      loops.forEach((l, k) => {
        const first = groupFirst[l.group];
        const reader = first.pin === 0 ? sReader : cReader;
        if (reader === undefined) return;
        if (reader.isString) col.setString(k, reader.attr.getString(first.prim));
        else col.set(k, reader.attr.get(first.prim));
      });
    }
    copyElements(subject.attrs.detail, out.attrs.detail, undefined, subject.attrs.detail.count);
    return { out: [makeGeometryItem(out)] };
  },
});

/** Cut polygons along polylines, with a kerf. */
export const splitPolygons = standardNode<SplitPolygonsParams, SplitPolygonsInputs, SplitPolygonsOutputs>({
  type: "splitPolygons",
  category: "surface",
  description:
    `Cuts every polygon on \`in\` along the polylines on \`cutters\`, removing a strip \`kerf\` wide around each cut, and puts out the PIECES: the glass lights between a window's mullion bars, the panels of a facade between its joints, a slab cut into bays. ${LOOPS_READ} Each input polygon (an outer loop with the \`holeOf\` holes that name it) is cut ON ITS OWN, so every piece carries its polygon's PRIMITIVE ATTRIBUTES — a window id, a floor level, a material — copied onto every loop it became, and two overlapping input polygons are cut independently rather than merged. Cutters are any polylines, open or closed, and 'poly' faces (their closed boundary): each segment is buffered into a rectangle \`kerf\` wide, extended by kerf / 2 past both ends (square caps), and the union of those rectangles is subtracted, so a polyline's cuts join squarely and a cut ending exactly on the polygon's edge cuts clean through. A \`kerf\` of 0 cuts along the line with no width — the pieces share the cut edge — and a zero-width cut that stops inside a polygon without separating anything leaves it whole. With \`groupAttr\` set, a polygon is cut only by the cutters of its own group. ${OUTPUT_WRITTEN} Pieces come out per input polygon, in input primitive order, each polygon's pieces in canonical order. Points carry P only.`,
  inputs: [
    { name: "in", kind: "geometry" },
    { name: "cutters", kind: "geometry" },
  ],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    kerf: {
      type: "f32",
      default: 0.05,
      acceptsField: true,
      description:
        "Width of the strip removed along each cut, in world units — a mullion bar's width, a joint's gap. 0 cuts along the line with no width. Field-capable on the CUTTERS' PRIMITIVE domain: one width per cutter polyline, so a window's heavy transom and its light glazing bars cut different gaps in one cook (an `attribute('barWidth')` written per cutter, or a byAttribute over a bar kind). Read the domain before writing the expression: the primitive domain carries no P, so `position()` is unavailable there. Must be 0 or more; a negative width is refused naming the cutter.",
    },
    plane: {
      type: "enum",
      default: "xz",
      enum: [...POLYGON_PLANES],
      description: PLANE_DESCRIPTION,
    },
    groupAttr: {
      type: "string",
      default: "",
      description:
        "Name of a scalar PRIMITIVE attribute on both pins: a polygon is cut only by the cutters whose key equals its own — one window's bars cut only that window's glass. Empty (the default) lets every cutter cut every polygon (a cutter far from a polygon costs nothing: cutters are culled by bounding box first). A string key compares by its text; a numeric key must be a whole number. Both pins must carry it with the same kind.",
    },
    snapDistance: {
      type: "f32",
      default: 0.0001,
      description: SNAP_DESCRIPTION,
    },
  },
  execute({ inputs, params, seed, checkCancelled }) {
    const nodeType = "splitPolygons";
    const src = requireGeometry(inputs, "in", nodeType);
    const cutGeo = requireGeometry(inputs, "cutters", nodeType);
    const axes = planeAxes(nodeType, params.plane);
    const eps = requireSnapDistance(nodeType, params.snapDistance);
    if (!isField(params.kerf)) {
      const k = params.kerf as number;
      if (!Number.isFinite(k) || k < 0) {
        throw new Error(
          `${nodeType}: param "kerf" must be a finite number of 0 or more (the width of the strip each cut removes; 0 cuts with no width); got ${k}`,
        );
      }
    }

    const loops = readLoops(src, nodeType, "in");
    const P = loops.length > 0 ? requirePositions(src, nodeType, "in") : new Float32Array(0);

    // Units: an outer loop with the holes that name it.
    const unitOf = new Map<number, InputLoop[]>();
    const units: InputLoop[][] = [];
    for (const l of loops) {
      if (!l.hole) {
        const unit = [l];
        unitOf.set(l.prim, unit);
        units.push(unit);
      }
    }
    for (const l of loops) {
      if (!l.hole) continue;
      const unit = unitOf.get(l.holeOf);
      if (unit === undefined) {
        throw new Error(
          `${nodeType}: primitive ${l.prim} on pin "in" is a hole of primitive ${l.holeOf} (${HOLE_OF_ATTR}), which is not a closed OUTER loop there; a hole names an outer loop whose own ${HOLE_OF_ATTR} is -1.`,
        );
      }
      unit.push(l);
    }

    // Cutters: per primitive, a chain of 2D points and a kerf.
    const nCut = cutGeo.primitiveCount;
    const cutChains: { u: Float64Array; v: Float64Array; kerf: number; box: number[] }[] = [];
    const cutPrim: number[] = [];
    if (nCut > 0) {
      const CP = requirePositions(cutGeo, nodeType, "cutters");
      const kerfCol = resolveOn(cutGeo, "primitive", params.kerf, seed, nodeType, "kerf");
      const primType = cutGeo.attrs.primitive.get(PRIMTYPE_ATTR);
      const v2p = cutGeo.vertexToPoint;
      for (let p = 0; p < nCut; p++) {
        const n = cutGeo.primVertexCount[p];
        if (n < 2) continue;
        const s = cutGeo.primVertexStart[p];
        const k = readComp(kerfCol, p, 0);
        if (!(k >= 0)) {
          throw new Error(
            `${nodeType}: param "kerf" resolved to ${k} on cutter primitive ${p}; a cut's width must be 0 or more. Guard the expression (a max(..., 0)) so every cutter gets a usable width.`,
          );
        }
        // A 'poly' face is its closed boundary.
        const closeFace = primType !== undefined && primType.getString(p) === "poly" && v2p[s] !== v2p[s + n - 1];
        const m = closeFace ? n + 1 : n;
        const u = new Float64Array(m);
        const v = new Float64Array(m);
        for (let q = 0; q < m; q++) {
          const i = v2p[s + (q % n)] * 3;
          u[q] = CP[i + axes.iu];
          v[q] = axes.sv * CP[i + axes.iv];
        }
        const pad = k * 0.75 + eps;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (let q = 0; q < m; q++) {
          x0 = Math.min(x0, u[q]);
          x1 = Math.max(x1, u[q]);
          y0 = Math.min(y0, v[q]);
          y1 = Math.max(y1, v[q]);
        }
        cutChains.push({ u, v, kerf: k, box: [x0 - pad, y0 - pad, x1 + pad, y1 + pad] });
        cutPrim.push(p);
      }
    }

    const grouped = params.groupAttr !== "";
    const sReader = grouped && units.length > 0 ? groupReader(src, params.groupAttr, nodeType, "in") : undefined;
    const cReader =
      grouped && cutPrim.length > 0 ? groupReader(cutGeo, params.groupAttr, nodeType, "cutters") : undefined;
    if (sReader !== undefined && cReader !== undefined && sReader.isString !== cReader.isString) {
      throw new Error(
        `${nodeType}: param "groupAttr" names "${params.groupAttr}", which is a ${sReader.isString ? "string" : "numeric"} attribute on pin "in" and a ${cReader.isString ? "string" : "numeric"} one on pin "cutters"; the two can never match. Write it as the same kind on both.`,
      );
    }
    const cutKeys = cReader === undefined ? undefined : cutPrim.map((p) => cReader.key(p));

    const out: OutLoop[] = [];
    for (const unit of units) {
      checkCancelled();
      const outer = unit[0];
      const rings = unit.map((l) => ringOf(P, l.points, axes, 0, l.hole));
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const r of rings) {
        for (let q = 0; q < r.u.length; q++) {
          x0 = Math.min(x0, r.u[q]);
          x1 = Math.max(x1, r.u[q]);
          y0 = Math.min(y0, r.v[q]);
          y1 = Math.max(y1, r.v[q]);
        }
      }
      const key = sReader === undefined ? undefined : sReader.key(outer.prim);
      const chains: Chain2[] = [];
      cutChains.forEach((c, ci) => {
        if (cutKeys !== undefined && cutKeys[ci] !== key) return;
        if (c.box[0] > x1 || c.box[2] < x0 || c.box[1] > y1 || c.box[3] < y0) return;
        if (c.kerf === 0) {
          chains.push({ u: c.u, v: c.v });
          return;
        }
        const h = c.kerf / 2;
        for (let q = 0; q + 1 < c.u.length; q++) {
          const dx = c.u[q + 1] - c.u[q];
          const dy = c.v[q + 1] - c.v[q];
          const len = Math.sqrt(dx * dx + dy * dy);
          if (!(len > 0)) continue;
          const tx = (dx / len) * h;
          const ty = (dy / len) * h;
          // Start and end pushed out by half the kerf (square caps), then
          // the rectangle counter-clockwise: right side forward, left back.
          const ax = c.u[q] - tx;
          const ay = c.v[q] - ty;
          const bx = c.u[q + 1] + tx;
          const by = c.v[q + 1] + ty;
          rings.push({
            u: Float64Array.of(ax + ty, bx + ty, bx - ty, ax - ty),
            v: Float64Array.of(ay - tx, by - tx, by + tx, ay + tx),
            operand: 1,
            hole: false,
          });
        }
      });
      const regions = overlay(rings, chains, OP_DIFFERENCE, eps, nodeType);
      appendRegions(out, regions, heightOf(P, outer, axes), outer.prim, -1);
    }

    const geo = buildOutput(out, axes);
    const carried: Attribute[] = [];
    for (const attr of src.attrs.primitive) {
      if (attr.name === PRIMTYPE_ATTR || attr.name === HOLE_OF_ATTR) continue;
      carried.push(attr);
    }
    if (carried.length > 0) {
      copyElements(
        carried,
        geo.attrs.primitive,
        out.map((l) => l.carryFrom),
        out.length,
        src.primitiveCount,
      );
    }
    copyElements(src.attrs.detail, geo.attrs.detail, undefined, src.attrs.detail.count);
    return { out: [makeGeometryItem(geo)] };
  },
});
