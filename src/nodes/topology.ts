/**
 * Topology nodes: build EDGES over a point cloud.
 *
 * There is no edge domain in this library and there does not need to be —
 * the primitive domain already is one. A 2-vertex `polyline` over shared
 * points IS an edge: `setPolylineTopology` lets one point appear in many
 * primitives, so a point with degree 5 is expressible today. Per-edge
 * values then come from nodes that already ship: `promoteAttribute`
 * point -> primitive (`min` for a road's width, `first` for its kind),
 * `setAttribute` on `domain: "primitive"`, and the return trip
 * primitive -> point (`max`) for a junction's size.
 *
 * That is also why {@link connectPoints} emits its edges over the SAME
 * input points rather than through a separate edges-to-polylines sink: no
 * edge payload ever crosses a pin, a junction is genuinely the same point
 * on every road that meets there, and the adjacency index is built and
 * consumed inside one node body — the staleness argument in
 * `src/spatial/adjacency.ts` is satisfied structurally rather than
 * defended.
 *
 * Topology is fragile downstream, and the rule is REMOVING POINTS, not the
 * node's category: filterByDensity, filterByBounds, filterByAttribute,
 * filterByExpression, selfPrune, partitionByAttribute and mergePoints all
 * rebuild the point domain and drop topology with it, so a network routed
 * through one arrives as a plain cloud. Only cloneGeometry preserves it,
 * which is what this node uses. Joining two networks is `mergePrimitives`
 * (`pointOps.ts`), the union that renumbers topology instead of discarding
 * it — `mergePoints` is the points-only twin and stays that way.
 *
 * The nodes that CUT a network down without destroying it are
 * `filterPrimitivesByBounds` and `filterPrimitivesByAttribute`
 * (`filtering.ts`), which filter the PRIMITIVE domain instead — the first
 * is what turns the partitioning recipe below from a procedure a caller
 * performs in TypeScript into a graph that serializes, and the second is
 * how a per-edge value this node wrote (`lengthAttr`) thins the network
 * while it is still a network.
 */
import { PRIMTYPE_ATTR, setPolylineTopology } from "../data/index.js";
import { canonicalPointRanks } from "../data/identity.js";
import { cloneGeometry, makeGeometryItem } from "../graph/index.js";
import { adjacencyFor, type Adjacency } from "../spatial/index.js";
import { standardNode } from "./registry.js";
import {
  positionView,
  requireGeometry,
  requireReportSlot,
  requireScalarColumn,
  resolveOn,
  type FieldParam,
} from "./util.js";

/**
 * Ceiling on the edges one {@link connectPoints} may build. The radius is
 * a number the author typed, but the edge count it implies is not: pairs
 * grow with the SQUARE of the point count, so a radius that looks
 * reasonable on a sparse cloud allocates gigabytes on a dense one. Bounded
 * for the same reason and in the same shape as `MAX_RESAMPLE_POINTS` in
 * `paths.ts`, and enforced DURING the neighbour scan, so a runaway fails
 * before it allocates rather than after.
 */
const MAX_EDGES = 1_048_576;

/**
 * Stand-ins for the edge buffers on the paths that build no edges (no
 * points, or radius 0). Never written: the scan replaces them before it
 * emits anything, and every reader is bounded by the edge count, which is
 * 0 here.
 */
const EMPTY_U32 = new Uint32Array(0);
const EMPTY_F64 = new Float64Array(0);

/** How to get under {@link MAX_EDGES}, appended to the overflow message. */
const MAX_EDGES_HINT =
  "Lower `radius` (the pair count grows with radius^2 over a surface and radius^3 through a volume), " +
  "thin the cloud upstream with selfPrune or filterByDensity, or cook the region in cells. " +
  "Switching mode to 'relativeNeighborhood' or 'gabriel' does NOT help: they keep fewer edges, but " +
  "they SELECT them from the same radius neighbourhood, which is what this limit measures.";

/** Params of {@link connectPoints}. */
export interface ConnectPointsParams {
  mode: string;
  radius: FieldParam;
  degreeAttr: string;
  lengthAttr: string;
}

/** Build an edge network over a point cloud. */
export const connectPoints = standardNode<ConnectPointsParams>({
  type: "connectPoints",
  category: "point op",
  description:
    "Connects a point cloud into a NETWORK: one 2-vertex `polyline` primitive per edge, built over the SAME points that arrived, so every point attribute survives and a junction is genuinely one point shared by every edge that meets there. This is how you get roads between district centres, a trail net between camps, or a triangulated-looking scaffold to displace. There is no edge domain and none is needed — per-edge values come from promoteAttribute point->primitive (`min` for a width, `first` for a kind) and setAttribute on domain 'primitive', and per-junction values from promoteAttribute primitive->point (`max`). mode 'radius' connects every pair closer than `radius`. mode 'relativeNeighborhood' keeps such a pair ONLY when no third point is closer to BOTH of its endpoints than they are to each other (the lune test): that thins a dense blob into a road-like net that still CONTAINS a minimum spanning tree — so the network stays connected wherever the radius does — while leaving the cycles a road layout wants and a tree does not have. mode 'gabriel' applies the other classical test — no third point inside the SPHERE on the pair as diameter — which disqualifies strictly fewer pairs, so relativeNeighborhood is a SUBSET of gabriel and gabriel is a subset of the Delaunay edges. It is the mode for a CELLULAR subject rather than a road one: it keeps the short cross-links that close small polygons, so a scatter comes out as plots, cracked ground or leaf venation instead of a branching net. It contains a minimum spanning tree for the same reason relativeNeighborhood does. Distances are 3D over P and the test is STRICT (d < radius), which is what makes this node's answer independent of how the cloud was windowed: a pair at exactly `radius` is not an edge. Edges come out in a canonical order fixed by the POINTS (identity, then position bits, then seed) and never by the order they arrived in, and each edge's FIRST vertex is its lower-keyed endpoint — reorder the input and you get the same network, permuted. PARTITIONING: an edge reads two stored positions and no third point, so a cell that also holds every point within `radius` of its own rectangle decides its edges exactly; emit an edge from the cell that owns its FIRST vertex under the half-open rule (filterByBounds' 'halfOpen'), and the cells tile the network with no duplicate and no gap. The wiring is three NODES, so a partitioned network cook is a serializable graph and needs no host code: widen the cell's rectangle by `radius` — or, when `radius` is a field, by the GLOBAL MAXIMUM it can return anywhere in the world — and clip the cloud to it with filterByBounds ('halfOpen'), run this node, then run filterPrimitivesByBounds on the UNWIDENED rectangle with vertex 'first' and the same 'halfOpen' boundary — that node keeps the primitives whose FIRST vertex lies back inside the cell, and it is one of the two filters in the library that trim topology instead of dropping it. The relativeNeighborhood witness lies inside the pair's own neighbourhood, so it needs no wider halo, and neither does the gabriel witness: a point inside the sphere on the pair as diameter is at most `d(i,j)` from either endpoint, which the radius already bounds. Any existing topology on the input is REPLACED, and its vertex and primitive attributes drop with it. Downstream, any node that can REMOVE points drops topology — filterByDensity, filterByBounds, filterByAttribute, filterByExpression, selfPrune, partitionByAttribute — and so does mergePoints, so a network that passes through one stops being a network — use mergePrimitives to combine this node's output with another network, an authored path or a mesh, which concatenates points, vertices AND primitives and renumbers the references; category is not the rule, since projectToPlane is categorised `filter` and PRESERVES topology, and so do filterPrimitivesByBounds and filterPrimitivesByAttribute, which filter the PRIMITIVE domain and are the nodes to reach for when a network has to be cut down rather than a cloud — the second tests a primitive attribute, so a network thinned by its own `lengthAttr` (or by a promoted or setAttribute-authored per-edge value) stays a network, and the thinning happens before anything downstream pays for the edges it removes. degreeAttr and lengthAttr are reporting slots whose shape this node picks, so pointing either at an existing attribute of a DIFFERENT shape is refused rather than silently deleting it.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    mode: {
      type: "enum",
      default: "radius",
      enum: ["radius", "relativeNeighborhood", "gabriel"],
      description:
        "Which pairs become edges. 'radius' connects every pair closer than `radius` — dense, and the count grows with the square of the point count. 'relativeNeighborhood' additionally requires that no third point is closer to BOTH endpoints than they are to each other (the lune test), which keeps a sparse, road-like net (it contains a minimum spanning tree, so it does not disconnect what the radius reached, and it keeps cycles, so it is a network rather than a tree). 'gabriel' requires instead that no third point lies inside the SPHERE having the pair as its diameter, which is a strictly weaker condition than the lune: every relativeNeighborhood edge is also a gabriel edge, so gabriel sits BETWEEN the two other modes in density and likewise contains a minimum spanning tree. Reach for it when relativeNeighborhood thins a layout too far — it keeps the short cross-links that close small cells, which is what makes it read as cracked ground, leaf venation or plot boundaries rather than as a road net. All three modes read the same radius neighbourhood and are bounded by the same edge limit, so neither test costs a wider search than 'radius'.",
    },
    radius: {
      type: "f32",
      default: 1,
      min: 0,
      acceptsField: true,
      description:
        "Largest distance that can become an edge, in world units, tested STRICTLY: a pair at exactly `radius` is NOT connected. That strictness is deliberate and is what makes a partitioned cook exact — a neighbour lying exactly on a cell's far face is excluded from the cell by the half-open ownership rule, and under a strict test it is not an edge of anything that cell owns either, so the two conventions cannot disagree. 0 builds no edges. As a FIELD it is a PER-POINT REACH, and a pair becomes an edge when it is closer than the LARGER of the two reaches — the same rule selfPrune's minDistance uses, and for the same reason: the SMALLER would let a big point be crowded by a small one, and the SUM would double the spacing of an evenly-sized cloud, so neither agrees with the same number passed plainly. That rule is what keeps the relation SYMMETRIC. Without one a per-point radius makes 'A is near B' and 'B is near A' two different tests and an edge depends on which endpoint asked, which is why a field here needs a stated pair rule and not merely a column. A per-point reach of 0 or less connects that point to nothing, though a bigger neighbour can still reach IT. A NON-FINITE reach is REFUSED rather than read as nothing: this param takes the guarded resolver, so a NaN or an Infinity stops the cook naming the offending element, unlike pointNeighborhood's radius, where both are documented values. The distinction is which mistake is likelier — a reach is arithmetic an author writes, and a NaN there is a broken expression rather than a request for no edges. TWO COSTS travel with a field, both cost and neither correctness. The candidate scan runs at the WIDEST reach in the cloud, since either endpoint may be the larger, so the edge ceiling is measured on those candidates rather than on the edges that survive. And under a partitioned cook the halo is no longer `radius` but the GLOBAL MAXIMUM this field can return anywhere in the world — a bound to be derived rather than measured, because the cloud a cell sees has already been clipped by the halo being sized. Take a constant times the range of whatever drives it (a noise is in [-1, 1], so `2 + 3 * noise` maxes at 5) and widen by that; underestimating does not throw, it drops the long edges at the seams only.",
    },
    degreeAttr: {
      type: "string",
      default: "",
      description:
        "Name of a u32 point attribute receiving each point's DEGREE — how many emitted edges touch it (0 for an isolated point). Empty (the default) writes none. Use it to size junctions, or to find the dead ends of a network with filterByAttribute. The shape is this node's to pick (u32, tuple 1), so a name the input already holds under a DIFFERENT shape is REFUSED, not overwritten: writing it would delete that column outright and the cook would still look fine (degreeAttr \"P\" would leave a cloud with no positions). A same-shape column IS reused and reset, so re-running this node over its own output is fine.",
    },
    lengthAttr: {
      type: "string",
      default: "",
      description:
        "Name of an f32 PRIMITIVE attribute receiving each edge's length in world units. Empty (the default) writes none. Handy as a width or cost driver, and as a filter key once the network is promoted. The shape is this node's to pick (f32, tuple 1), so a name already present on the output's primitive domain under a different shape is REFUSED — which in practice means `primtype`, the string attribute that marks these primitives as polylines and without which nothing downstream would recognise them. Note that the input's own primitive attributes are dropped by the topology replacement before this is written.",
    },
  },
  execute({ inputs, params, checkCancelled, seed: nodeSeed }) {
    // Params before geometry: a bad mode reported as a geometry problem
    // sends the author to debug the wrong thing entirely.
    const mode = params.mode;
    if (mode !== "radius" && mode !== "relativeNeighborhood" && mode !== "gabriel") {
      throw new Error(
        `connectPoints: unknown mode "${mode}"; valid modes: radius, relativeNeighborhood, gabriel`,
      );
    }
    const uniformRadius = typeof params.radius === "number" ? params.radius : undefined;
    if (
      uniformRadius !== undefined &&
      (!(uniformRadius >= 0) || !Number.isFinite(uniformRadius))
    ) {
      throw new Error(
        `connectPoints: radius must be a finite number >= 0, got ${uniformRadius}; 0 builds no edges, and an unbounded radius would connect every pair`,
      );
    }
    const src = requireGeometry(inputs, "in", "connectPoints");
    // Reporting slots are checked before any work: a refusal must cost
    // nothing. degreeAttr lands on the point domain, which survives the
    // clone untouched, so the input's own columns are the ones at risk.
    if (params.degreeAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.point,
        nodeType: "connectPoints",
        param: "degreeAttr",
        name: params.degreeAttr,
        type: "u32",
        tupleSize: 1,
        domain: "point",
        suggestion: "degree",
      });
    }
    // lengthAttr lands on the primitive domain, which this node REBUILDS —
    // so the only column it can collide with is the one the rebuild itself
    // creates. Named here rather than after the build for the same
    // "refusal costs nothing" reason; the general check runs again below,
    // where the primitive set actually exists.
    if (params.lengthAttr === PRIMTYPE_ATTR) {
      throw new Error(
        `connectPoints: lengthAttr "${PRIMTYPE_ATTR}" is the string attribute that marks these primitives as polylines; writing an f32 length there would delete it and leave primitives nothing downstream recognises. Name the length something else (e.g. "edgeLength").`,
      );
    }

    // Read from the INPUT, write into a clone. The input's `P` buffer is
    // the upstream node's cached output, so it survives between cooks and
    // the adjacency cache can actually hit — a clone's buffer is new every
    // time, which would make every lookup a miss. Nothing here writes
    // through `src`, which is what makes reading it safe.
    const n = src.pointCount;
    const view = positionView(src, "connectPoints", "in");
    const pd = view.data;
    const ps = view.stride;
    const wantLength = params.lengthAttr !== "";

    // A FIELD radius is a per-point REACH, and a pair is an edge when it
    // is closer than the LARGER of the two — the rule selfPrune already
    // uses, and for its reason: the smaller would let a big point be
    // crowded by a small one, and the sum would double the spacing of an
    // evenly-sized cloud, so neither agrees with the same number passed
    // plainly. That rule is what makes the relation symmetric again;
    // without one, "A is near B" and "B is near A" are two tests and an
    // edge would depend on which endpoint asked.
    const radii =
      uniformRadius === undefined
        ? requireScalarColumn(
            resolveOn(src, "point", params.radius, nodeSeed, "connectPoints", "radius"),
            "connectPoints",
            "radius",
            "point",
            "a radius",
          )
        : undefined;
    // The candidate scan runs at the WIDEST reach, because a pair is
    // decided by the larger of its two radii and either endpoint may be
    // the larger. Cost is what that costs — MAX_EDGES is measured on the
    // candidates — and correctness is not, since every candidate is then
    // tested against its own pair's limit.
    //
    // NOT `cellSizeFromClaims`, which the two selfPrune/pointNeighborhood
    // loops share and which this deliberately resembles: this max INCLUDES
    // an infinite radius (an unbounded reach must widen the query, not be
    // skipped as uninformative) and has no "else 1" fallback, because an
    // all-zero set here means "build no edges at all" rather than "pick
    // some cell size". It is a query reach, not a cell size.
    let widest = 0;
    if (radii !== undefined) {
      for (let i = 0; i < n; i++) {
        const v = radii.data[i];
        if (v > widest) widest = v; // 0, negative and NaN reach nothing
      }
    }
    const radius = uniformRadius ?? widest;

    // Built once and used twice: to pick each edge's `A`, and to order the
    // edges. Both must be the SAME order, or the first vertex of an edge
    // would stop agreeing with the key the edges were sorted by. The one
    // thing the order's index fallback can move is which end of a
    // ZERO-LENGTH edge between two indistinguishable points is written
    // first — see `canonicalPointRanks` for why nothing else can.
    const ranks = n > 0 && radius > 0 ? canonicalPointRanks(src, "connectPoints") : undefined;
    // Endpoints and squared lengths of the emitted edges, written through a
    // counter into storage sized up front rather than pushed onto arrays
    // that grow to as many as MAX_EDGES entries. `neighbors.length >>> 1` is
    // the EXACT edge count in 'radius' mode — the relation is symmetric, so
    // each pair occupies two CSR entries and exactly one of the two visits
    // emits it — and a tight ceiling in 'relativeNeighborhood' and
    // 'gabriel', which each keep a subset of the same pairs.
    let edgeA = EMPTY_U32;
    let edgeB = EMPTY_U32;
    let edgeD2 = EMPTY_F64;
    let count = 0;
    if (ranks !== undefined) {
      const adj = adjacencyFor(view, radius, {
        who: "connectPoints",
        maxEdges: MAX_EDGES,
        hint: MAX_EDGES_HINT,
        checkCancelled,
      });
      const { offsets, neighbors } = adj;
      const cap = neighbors.length >>> 1;
      edgeA = new Uint32Array(cap);
      edgeB = new Uint32Array(cap);
      // Only lengthAttr reads the distances, and it is not the default.
      if (wantLength) edgeD2 = new Float64Array(cap);
      // Each pair's limit is ONE of its two endpoint radii, so squaring is
      // done once per POINT here rather than once per candidate PAIR — the
      // same f64 product either way, which is what keeps the test below
      // bit-identical to the multiply it replaces.
      //
      // Deliberately NOT clamped to 0 for negative and NaN radii, which
      // would look like the tidier table and would MOVE edges: `limit *
      // limit` was taken of whichever radius won `ri > rj`, so two negative
      // radii squared to a positive limit and connected, and a NaN in the
      // `rj` slot squared to NaN and connected nothing. Both survive here
      // because the square is stored raw and the winner is still chosen by
      // the same comparison.
      const rd = radii?.data;
      let reach2: Float64Array | undefined;
      if (rd !== undefined) {
        reach2 = new Float64Array(n);
        // CLAMPED, and the clamp is the correctness half rather than a
        // tidy-up. Squaring a raw reach loses its sign: two points that
        // both asked for -1 would compare against max(-1, -2)^2 = 1 and
        // CONNECT, which is the opposite of what this param documents
        // ("0, negative or NaN connects that point to nothing"). Mapping
        // every non-positive reach to 0 first makes the promise true —
        // `d2 < 0` is false for every distance, and NaN fails `> 0` so it
        // lands on 0 too. It also makes max-of-squares equal
        // square-of-max, which is what lets the pair test below compare
        // the squares directly.
        for (let i = 0; i < n; i++) reach2[i] = rd[i] > 0 ? rd[i] * rd[i] : 0;
      }
      for (let i = 0; i < n; i++) {
        // Polled tighter than the usual 1023: one point costs O(degree)
        // pairs here, and O(degree^2) in relativeNeighborhood and gabriel,
        // which both scan row `i` again per candidate pair.
        if ((i & 63) === 0) checkCancelled();
        const oi = i * ps;
        const ax = pd[oi];
        const ay = pd[oi + 1];
        const az = pd[oi + 2];
        // This endpoint's own SQUARED reach, invariant across its whole
        // candidate walk below.
        const r2i = reach2 === undefined ? 0 : reach2[i];
        const end = offsets[i + 1];
        for (let k = offsets[i]; k < end; k++) {
          const j = neighbors[k];
          // Each unordered pair is visited from BOTH endpoints (the
          // relation is symmetric); it is emitted once, from the
          // lower-keyed end, which is also the end a partitioned cook
          // assigns ownership by.
          if (ranks[i] > ranks[j]) continue;
          const oj = j * ps;
          const dx = pd[oj] - ax;
          const dy = pd[oj + 1] - ay;
          const dz = pd[oj + 2] - az;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (reach2 !== undefined) {
            // The candidates came back at the widest reach; this is the
            // test that belongs to THIS pair. Strict, and negated so a
            // NaN limit connects nothing, exactly as the scalar path's
            // membership test in `src/spatial/adjacency.ts` is. The pair's
            // limit is the LARGER radius, squared — picked here, squared
            // above.
            const r2j = reach2[j];
            if (!(d2 < (r2i > r2j ? r2i : r2j))) continue;
          }
          if (mode === "relativeNeighborhood" && hasLuneWitness(adj, pd, ps, i, j, d2)) {
            continue;
          }
          if (mode === "gabriel" && hasGabrielWitness(adj, pd, ps, i, j, d2)) {
            continue;
          }
          edgeA[count] = i;
          edgeB[count] = j;
          if (wantLength) edgeD2[count] = d2;
          count++;
        }
      }
    }

    // Canonical edge ORDER: by the endpoints' keys, never by the order the
    // scan happened to reach them in. (rank[A], rank[B]) is unique per
    // pair, so this is a strict total order and the primitive index of an
    // edge is a property of the points.
    const order = new Uint32Array(count);
    for (let e = 0; e < count; e++) order[e] = e;
    if (count > 0 && ranks !== undefined) {
      order.sort((a, b) => ranks[edgeA[a]] - ranks[edgeA[b]] || ranks[edgeB[a]] - ranks[edgeB[b]]);
    }

    // cloneGeometry is the only helper that preserves topology, and it is
    // what keeps this node pure: the input is a cached upstream object.
    // Cloned only now, so a refusal above costs nothing.
    const geo = cloneGeometry(src);
    const pointIndices = new Uint32Array(count * 2);
    const primVertexStart = new Uint32Array(count);
    const primVertexCount = new Uint32Array(count);
    // The degree column IS the tally, so nothing stages it first: `replace`
    // zero-fills, it lands on the CLONE and never on `src`, and
    // setPolylineTopology below rebuilds the vertex and primitive domains
    // while leaving point attributes untouched.
    const degrees =
      params.degreeAttr !== ""
        ? geo.attrs.point.replace(params.degreeAttr, "u32", 1, 0).data
        : undefined;
    for (let e = 0; e < count; e++) {
      const s = order[e];
      const a = edgeA[s];
      const b = edgeB[s];
      pointIndices[e * 2] = a;
      pointIndices[e * 2 + 1] = b;
      primVertexStart[e] = e * 2;
      primVertexCount[e] = 2;
      if (degrees) {
        degrees[a]++;
        degrees[b]++;
      }
    }
    setPolylineTopology(geo, pointIndices, primVertexStart, primVertexCount);

    if (wantLength) {
      // The primitive domain exists only now, and holds exactly the
      // primtype column setPolylineTopology just stamped — so this is an
      // OUTPUT-side collision, and the message must not tell an author to
      // remove the attribute "from the input" where it never was.
      //
      // Unreachable today: the only column here is `primtype`, and the
      // guard above catches that name first with a message of its own.
      // Marked anyway, because the guard above is what makes it
      // unreachable, and a later edit that relaxes it would otherwise turn
      // this into a refusal that names the wrong geometry.
      requireReportSlot({
        attrs: geo.attrs.primitive,
        on: "output",
        nodeType: "connectPoints",
        param: "lengthAttr",
        name: params.lengthAttr,
        type: "f32",
        tupleSize: 1,
        domain: "primitive",
        suggestion: "edgeLength",
      });
      const attr = geo.attrs.primitive.replace(params.lengthAttr, "f32", 1, 0);
      const data = attr.data;
      // Straight into the column, in edge order: the same sqrt of the same
      // d2, rounded to f32 once instead of buffered through an f64 array
      // first, so every stored value is bit-identical.
      for (let e = 0; e < count; e++) data[e] = Math.sqrt(edgeD2[order[e]]);
    }
    return { out: [makeGeometryItem(geo)] };
  },
});

/**
 * The relative-neighbourhood (lune) test: is there a third point strictly
 * closer to BOTH `i` and `j` than they are to each other?
 *
 * Every such witness satisfies `d(C, i) < d(i, j) < radius`, so it is
 * necessarily inside `i`'s OWN radius neighbourhood — which is why this
 * mode needs no wider halo than the radius mode, and why the candidate
 * scan can read row `i` of the adjacency rather than a second query.
 *
 * Distances are computed from the two points' stored coordinates with the
 * same expression in every direction — `(a - b)` squares identically to
 * `(b - a)`, and the three squares are always summed x, y, z — so the same
 * triple gives the same verdict whichever endpoint the scan reached first.
 */
function hasLuneWitness(
  adj: Adjacency,
  pd: ArrayLike<number>,
  ps: number,
  i: number,
  j: number,
  d2: number,
): boolean {
  const oi = i * ps;
  const oj = j * ps;
  const ix = pd[oi];
  const iy = pd[oi + 1];
  const iz = pd[oi + 2];
  const jx = pd[oj];
  const jy = pd[oj + 1];
  const jz = pd[oj + 2];
  const end = adj.offsets[i + 1];
  for (let k = adj.offsets[i]; k < end; k++) {
    const c = adj.neighbors[k];
    if (c === j) continue; // rows never contain `i` itself
    const oc = c * ps;
    const cx = pd[oc];
    const cy = pd[oc + 1];
    const cz = pd[oc + 2];
    let dx = cx - ix;
    let dy = cy - iy;
    let dz = cz - iz;
    // Negated so a NaN distance can never witness anything away.
    if (!(dx * dx + dy * dy + dz * dz < d2)) continue;
    dx = cx - jx;
    dy = cy - jy;
    dz = cz - jz;
    if (dx * dx + dy * dy + dz * dz < d2) return true;
  }
  return false;
}

/**
 * The Gabriel test: is there a third point strictly inside the sphere
 * having `ij` as its DIAMETER? A point C is inside exactly when the angle
 * at C is obtuse, which by the law of cosines is
 * `d(C, i)^2 + d(C, j)^2 < d(i, j)^2` — so the test needs no centre, no
 * radius and no square root, only the same three squared distances the
 * lune test already computes.
 *
 * THE SPHERE IS CLOSED, and a candidate COINCIDENT with either endpoint
 * is skipped instead. Both halves of that are load-bearing.
 *
 * Closed is what makes this the Gabriel graph rather than something near
 * it. The equality case is not exotic — it is every right angle, so on a
 * unit lattice the two diagonals of every cell sit EXACTLY on each
 * other's sphere, and an open test keeps them all and returns a
 * cross-hatch. That is both the wrong picture for the cellular subjects
 * this mode exists for and a different graph: the crossing diagonals of a
 * square are not planar, so an open test is not a subgraph of the
 * Delaunay edges the way the Gabriel graph is.
 *
 * The coincidence skip is what a strict test was reaching for and misses.
 * A `C` sharing an endpoint's exact position satisfies the closed test
 * automatically (`d(C, i)^2 + 0 == d(i, j)^2`), so duplicating a point
 * would silently delete the edges at it. But a point at zero distance
 * from an endpoint IS that endpoint, and the scan already skips `j` by
 * INDEX — skipping it by POSITION too is the same exclusion honestly
 * applied, and it costs nothing anywhere else.
 *
 * THE HALO ARGUMENT IS THE LUNE'S, and the skip is what keeps it strict:
 * with `d(C, i)` and `d(C, j)` both nonzero, `d(C, i)^2 < d(i, j)^2`, so
 * `d(C, i) < d(i, j) < radius` and the witness is necessarily inside
 * `i`'s OWN radius neighbourhood. So this mode needs no wider halo than
 * the radius mode either, and reads row `i` of the same adjacency.
 *
 * Distances come from the stored coordinates by the same expression in
 * every direction, so the same triple gives the same verdict whichever
 * endpoint the scan reached first.
 */
function hasGabrielWitness(
  adj: Adjacency,
  pd: ArrayLike<number>,
  ps: number,
  i: number,
  j: number,
  d2: number,
): boolean {
  const oi = i * ps;
  const oj = j * ps;
  const ix = pd[oi];
  const iy = pd[oi + 1];
  const iz = pd[oi + 2];
  const jx = pd[oj];
  const jy = pd[oj + 1];
  const jz = pd[oj + 2];
  const end = adj.offsets[i + 1];
  for (let k = adj.offsets[i]; k < end; k++) {
    const c = adj.neighbors[k];
    if (c === j) continue; // rows never contain `i` itself
    const oc = c * ps;
    const cx = pd[oc];
    const cy = pd[oc + 1];
    const cz = pd[oc + 2];
    const dix = cx - ix;
    const diy = cy - iy;
    const diz = cz - iz;
    const djx = cx - jx;
    const djy = cy - jy;
    const djz = cz - jz;
    const ci = dix * dix + diy * diy + diz * diz;
    const cj = djx * djx + djy * djy + djz * djz;
    // A candidate sitting exactly on an endpoint is that endpoint, not a
    // third point: skip it as the `c === j` test above skips it by index.
    if (ci === 0 || cj === 0) continue;
    // Negated so a NaN coordinate can never witness an edge away, exactly
    // as the lune test above is negated. Closed (`<=`): see the header.
    if (!(ci + cj <= d2)) continue;
    return true;
  }
  return false;
}

/** Params of {@link connectByIndex}. */
export interface ConnectByIndexParams {
  index: FieldParam;
  rootValue: number;
  outOfRange: string;
  degreeAttr: string;
  lengthAttr: string;
  missCountAttr: string;
}

/** Build one edge per point from a parent-pointer column. */
export const connectByIndex = standardNode<ConnectByIndexParams>({
  type: "connectByIndex",
  category: "point op",
  description:
    "Builds one 2-vertex `polyline` per point, from that point to the point its `index` names — the edge set a PARENT POINTER describes. Built over the SAME points that arrived, so every point attribute survives and a junction is genuinely one point shared by every edge that meets there. This is the constructor for anything that GREW: a tree's branches, a root system, a river network, a dendrite, a crack. WHY IT IS A NODE AND NOT A RECIPE: `pointsToPath` is the only other path constructor and it PARTITIONS — `groupAttr` is read once per point and that point joins exactly one group — so its groups are vertex-disjoint chains and every point ends with degree at most 2. A star (1 -> 0, 2 -> 0, 3 -> 0) can emit at most two of its three edges under ANY assignment of group keys, because the centre belongs to one chain only. Branching is precisely the case that excludes. THE SHAPE IS NOT THE GAP — `connectPoints` already gives a point three incident edges and more, and this file's own header says a degree-5 point is expressible today. What no shipped node can do is be HANDED the answer: `connectPoints` asks its question in SPACE and decides the pairs itself, and `transferByIndex` IS handed an index but spends it on VALUES and promises it changes no topology. DIRECTION IS THE PAYLOAD, and this is where it differs from `connectPoints` deliberately: vertex 0 of each edge is the point that named the index and vertex 1 is the point it named, so child-to-parent is recoverable from the topology itself rather than needing a separate column. `connectPoints` orders its endpoints by key because a proximity edge has no direction to preserve; a parent pointer has nothing else. Edges come out in POINT ORDER, one per point that names a usable parent. A ROOT names `rootValue` (-1 by default, the sentinel `copyToPoints`' `targetIndexAttr` writes and `quotaRebalance` uses for 'stays') and contributes no edge — that is ordinary data, not a miss, which is why it is a separate param from `outOfRange`: a forest of several trees is a normal input here, and a node that could not say 'this one has no parent' could not describe one. THE INDEX IS AN ORDINAL, NOT AN IDENTITY, and it carries `transferByIndex`'s trap in a sharper form: a filter, a sort, a resample, a partition or a `mergePoints` anywhere between the node that COMPUTED the pointers and this one renumbers every point, and index 7 is then whatever landed seventh. There the damage is a wrong value; here it is a wrong EDGE, and a plausible-looking one. Compute the pointers and spend them with no renumbering step in between. PARTITIONING: an edge reads one stored index and the point it names, and consults no third point, so a cell holding both decides that edge exactly — emit it from the cell owning its FIRST vertex under the half-open rule and the cells tile the network with no duplicate and no gap, exactly as `connectPoints` documents. The halo is whatever bound the PRODUCER of the index column already needed, and is not this node's to invent; that is what separates this from the two things Stretch actually cut — CHAINING degree-2 runs into polylines, which is not partition-invariant at the primitive domain, and `findPath`, for which no finite halo suffices. (`maxDegree` itself is recorded there as halo-exact and merely unbuilt, not refused.) ONE CONDITION, and it is the ordinal again: `connectPoints` pairs by POSITION, which survives a repartition, while this node pairs by ORDINAL, which does not. So the argument holds only while the pointers are produced in the SAME numbering this node reads them in — a partitioned cook must compute its pointers inside the cell that spends them, never across a split. Any existing topology on the input is REPLACED and its vertex and primitive attributes drop with it, and the downstream rule `connectPoints` states applies unchanged: a network routed through any node that REMOVES points arrives as a plain cloud.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    index: {
      type: "f32",
      default: -1,
      acceptsField: true,
      description:
        "Which point each point links to, as an ordinal counting from 0, resolved on the point domain. TRUNCATED TOWARD ZERO before it is read, on `transferByIndex`'s rule and for its reason, so 3.9 and 3.0 both name point 3. AS A FIELD THIS IS THE POINT OF THE NODE: `attribute(\"parent\")` spends a column an earlier stage settled, which is how a growth loop's `targetIndexAttr` or a `sampleNearestPoint` `indexAttr` becomes an edge. As a plain number it is one parent shared by every point — a star, and mostly useful for a test — with one catch worth stating: the point it names then names ITSELF, which the default `outOfRange` refuses, so a plain index wants `outOfRange: \"skip\"` alongside it. Note also that the shipped defaults (`index` -1 against `rootValue` -1) make every point a root, so an unconfigured node emits no primitives at all rather than failing. PRECISION: a field resolves to an f32 column and f32 represents every integer only to 16,777,216, so a pointer computed beyond that lands on a neighbouring integer — the arithmetic that produced it is where the precision went, not this node, and a cloud that large wants an i32 attribute read straight through `attribute()`. NON-FINITE IS REFUSED before this node reads a thing, through two different doors: a FIELD is caught by the shared resolver guard, which names this param and the offending element and says how to guard the expression, while a PLAIN number is caught by the param schema wherever a graph is loaded, patched or exposed. `execute` itself has no check, because neither door can be walked past. NaN and the infinities are what a broken sub-expression produces, and none of them is a pointer under any reading. If a broken pointer should be a root rather than a failed cook, say so — map it to `rootValue` with a select() and it is data again.",
    },
    rootValue: {
      type: "f32",
      default: -1,
      description:
        "The index value meaning THIS POINT HAS NO PARENT: it contributes no edge, and that is not a miss. -1 by default, matching the sentinel `copyToPoints`' `targetIndexAttr` writes and `quotaRebalance` uses for 'stays'. Compared AFTER the same truncation the index takes, so -1.5 and -1 are the same root. A rootValue that lands INSIDE [0, pointCount-1] is legal and silently drops every edge naming THAT POINT, counting no miss, because a root is not a miss — it is a sentinel, and one a real ordinal could equal is an ambiguous sentinel. -1 cannot collide with any ordinal, which is why it is the default. A forest of several trees, a growth loop's seed point, and a network still being built all need to say this, which is why it is separate from `outOfRange`: folding the two together would make 'no parent yet' indistinguishable from 'this pointer is broken', and the first is the ordinary state of the data while the second is a defect worth stopping for.",
    },
    outOfRange: {
      type: "enum",
      default: "error",
      enum: ["error", "skip"],
      description:
        "How a pointer that is neither usable nor `rootValue` is read: one outside [0, pointCount-1], or one naming the point ITSELF, which would be a 2-vertex polyline whose two vertices are the same point and is never what an author meant. 'error' (the default) refuses the cook naming the point and the value, which is right when the pointers were COMPUTED by the graph and a bad one is a defect upstream. 'skip' emits no edge for that point and counts it in `missCountAttr`, which is right when the pointers are DATA the graph does not control — read from a table, carried across a cell boundary, or produced by a stage that legitimately does not resolve every one. THERE IS NO 'clamp' OR 'wrap', and their absence is deliberate: `transferByIndex` can clamp because the nearest VALUE is a defensible answer, but the nearest EDGE is not — clamping would silently wire a whole subtree onto point 0 and the result would look like a real network.",
    },
    degreeAttr: {
      type: "string",
      default: "",
      description:
        "Name of a u32 point attribute receiving each point's DEGREE — how many emitted edges touch it, counting BOTH directions, so a fork with three children and one parent reads 4 and a tip reads 1. Empty (the default) writes none. This is how a grown structure is read back: tips are degree 1, a root with no parent is degree 1 too, and anything above 2 is a fork. The shape is this node's to pick (u32, tuple 1), so a name the input already holds under a DIFFERENT shape is REFUSED rather than overwritten — writing it would delete that column outright and the cook would still look fine. A same-shape column IS reused and reset, so re-running this node over its own output is fine.",
    },
    lengthAttr: {
      type: "string",
      default: "",
      description:
        "Name of an f32 PRIMITIVE attribute receiving each edge's length in world units. Empty (the default) writes none. On a grown structure this is the segment length, which is what a taper or a cost driver wants. The shape is this node's to pick (f32, tuple 1), so a name already present on the output's primitive domain under a different shape is REFUSED — which in practice means `primtype`, the string attribute that marks these primitives as polylines and without which nothing downstream would recognise them.",
    },
    missCountAttr: {
      type: "string",
      default: "",
      description:
        "When non-empty, writes the number of points whose pointer was SKIPPED into a u32 DETAIL attribute of this name. Always 0 under `outOfRange` 'error', which cannot reach this. ROOTS ARE NOT COUNTED — a root is data, not a miss. Empty = don't record. A count is a cook statistic and cannot be filtered on; for WHICH points, read `degreeAttr` and compare against what you expected. This is a reporting slot whose shape this node picks (u32, tuple 1), so a name the detail domain already holds under a different shape is REFUSED rather than deleted and re-added — give it a name of its own (a \"__\" prefix marks it internal) or removeAttribute the clash first.",
    },
  },
  execute({ inputs, params, seed: nodeSeed }) {
    // Params before geometry, on connectPoints' rule: a bad setting
    // reported as a geometry problem sends the author to debug the wrong
    // thing entirely.
    const mode = params.outOfRange;
    if (mode !== "error" && mode !== "skip") {
      throw new Error(
        `connectByIndex: unknown outOfRange "${mode}"; valid settings: error, skip`,
      );
    }
    if (!Number.isFinite(params.rootValue)) {
      throw new Error(
        `connectByIndex: rootValue must be a finite number, got ${params.rootValue}; it is the index value meaning "no parent" and is compared after truncation, so -1 is the usual choice`,
      );
    }
    const root = Math.trunc(params.rootValue);
    const src = requireGeometry(inputs, "in", "connectByIndex");
    // Reporting slots are checked before any work: a refusal must cost
    // nothing. degreeAttr lands on the point domain and missCountAttr on
    // the detail domain, both of which survive the clone untouched, so the
    // input's own columns are the ones at risk.
    if (params.degreeAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.point,
        nodeType: "connectByIndex",
        param: "degreeAttr",
        name: params.degreeAttr,
        type: "u32",
        tupleSize: 1,
        domain: "point",
        suggestion: "degree",
      });
    }
    if (params.missCountAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.detail,
        nodeType: "connectByIndex",
        param: "missCountAttr",
        name: params.missCountAttr,
        type: "u32",
        tupleSize: 1,
        domain: "detail",
        suggestion: "unlinked",
      });
    }
    if (params.lengthAttr === PRIMTYPE_ATTR) {
      throw new Error(
        `connectByIndex: lengthAttr "${PRIMTYPE_ATTR}" is the string attribute that marks these primitives as polylines; writing an f32 length there would delete it and leave primitives nothing downstream recognises. Name the length something else (e.g. "edgeLength").`,
      );
    }

    const n = src.pointCount;
    const view = positionView(src, "connectByIndex", "in");
    const pd = view.data;
    const ps = view.stride;
    // Resolved against the INPUT, before the clone exists and before
    // anything is written: the house rule stated on resolveOn, and the
    // defect fixed in setBounds, quotaRebalance and pathPointAt. Nothing
    // here writes through `src`, which is what makes reading it safe.
    const idx = requireScalarColumn(
      resolveOn(src, "point", params.index, nodeSeed, "connectByIndex", "index"),
      "connectByIndex",
      "index",
      "point",
      "a parent pointer",
    );

    // One pass in point order, so the edge order IS the point order and
    // nothing has to be sorted back into place afterwards.
    const child: number[] = [];
    const parent: number[] = [];
    let missed = 0;
    for (let i = 0; i < n; i++) {
      // Finiteness is already decided: resolveOn refuses a field that
      // evaluates to NaN or an infinity anywhere, with the shared message
      // that names the element and says how to guard the expression. A
      // second check here would be dead code standing where a reader
      // would trust it.
      const k = Math.trunc(idx.data[i]);
      if (k === root) continue; // a root: no parent, no edge, and no miss
      if (k < 0 || k >= n || k === i) {
        if (mode === "error") {
          const why =
            k === i
              ? "names itself, which would be an edge whose two vertices are the same point"
              : `is outside [0, ${n - 1}]`;
          throw new Error(
            `connectByIndex: point ${i} has index ${k}, which ${why}. Set outOfRange "skip" to drop such points and count them instead, or map them to rootValue (${root}) upstream if they are meant to be roots.`,
          );
        }
        missed++;
        continue;
      }
      child.push(i);
      parent.push(k);
    }

    const geo = cloneGeometry(src);
    const count = child.length;
    const pointIndices = new Uint32Array(count * 2);
    const primVertexStart = new Uint32Array(count);
    const primVertexCount = new Uint32Array(count);
    for (let e = 0; e < count; e++) {
      // Vertex 0 is the point that NAMED the index, vertex 1 the point it
      // named, so child-to-parent survives in the topology itself.
      pointIndices[e * 2] = child[e];
      pointIndices[e * 2 + 1] = parent[e];
      primVertexStart[e] = e * 2;
      primVertexCount[e] = 2;
    }
    // Rebuilds the vertex and primitive domains, so anything landing on
    // the primitive domain has to be written after it.
    setPolylineTopology(geo, pointIndices, primVertexStart, primVertexCount);

    if (params.degreeAttr !== "") {
      const deg = geo.attrs.point.replace(params.degreeAttr, "u32", 1, 0).data;
      for (let e = 0; e < count; e++) {
        deg[child[e]]++;
        deg[parent[e]]++;
      }
    }
    if (params.lengthAttr !== "") {
      // The primitive domain exists only now, and holds exactly the
      // primtype column setPolylineTopology stamped, so this is an
      // OUTPUT-side collision. Unreachable today because the guard above
      // catches that one name first with a message of its own; marked
      // anyway, for the reason connectPoints marks its twin.
      requireReportSlot({
        attrs: geo.attrs.primitive,
        on: "output",
        nodeType: "connectByIndex",
        param: "lengthAttr",
        name: params.lengthAttr,
        type: "f32",
        tupleSize: 1,
        domain: "primitive",
        suggestion: "edgeLength",
      });
      const len = geo.attrs.primitive.replace(params.lengthAttr, "f32", 1, 0).data;
      for (let e = 0; e < count; e++) {
        const a = child[e] * ps;
        const b = parent[e] * ps;
        const dx = pd[a] - pd[b];
        const dy = pd[a + 1] - pd[b + 1];
        const dz = pd[a + 2] - pd[b + 2];
        len[e] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
    if (params.missCountAttr !== "") {
      geo.attrs.detail.replace(params.missCountAttr, "u32", 1, 0).set(0, missed);
    }
    return { out: [makeGeometryItem(geo)] };
  },
});
