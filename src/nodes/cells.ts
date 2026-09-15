/**
 * Cell nodes: build FACES over a point cloud.
 *
 * `topology.ts` connects points into EDGES and leaves the regions between
 * them implicit. This file names the regions. {@link voronoiCells} emits
 * one closed polyline per site — the ground that site is nearer to than
 * any other — which is the plot, the plate, the leaf cell and the
 * territory, and which `extrudePolygon` turns into massing or a flat slab
 * without a second idea.
 *
 * WHY A CLOSED POLYLINE AND NOT AN N-GON `poly`. Both would render; a
 * Voronoi cell is convex, so a fan triangulation of it is exact. The
 * polyline wins because it COMPOSES: `extrudePolygon` reads closed
 * polylines and reads nothing else, so `caps: 'bottom'` with `sides:
 * false` is the filled face and `caps: 'both'` is the building, out of
 * the same output. A `poly` would have been the face and only the face.
 *
 * THE PARTITION ARGUMENT, which is the whole reason this node can exist.
 * A Voronoi cell is ZERO-HOP — it reads stored positions and never
 * another site's answer — but its footprint is DATA-DEPENDENT, and no
 * param bounds it: one distant site in an otherwise empty plain owns half
 * the world. That combination is a rung the halo ladder in
 * `docs/authoring.md` does not have, and it is the rung where a
 * CERTIFICATE becomes possible. Gather the sites within `radius` of a
 * site `p` and intersect their half-planes; if every corner of the result
 * lies within `radius / 2` of `p`, that result IS the global cell,
 * because a site further than `radius` from `p` cannot be nearer than `p`
 * to anything that close to `p`. The check is one line and it is
 * MANDATORY: without it a truncated cell is a perfectly plausible convex
 * polygon and nothing downstream can tell it from a real one.
 *
 * A site on the outside of the cloud has an unbounded true cell and NO
 * radius certifies it. That is not a bug to widen out of — it is the
 * honest answer, and it is why the default policy drops such a cell
 * rather than refusing the cook.
 *
 * THE DIAGRAM IS A PLAN. Cells are computed in the XZ plane and each ring
 * lies flat at its own site's Y, because a 3D Voronoi cell is a
 * polyhedron and every subject that wants this node — plots, plates,
 * territories, venation — is planar. The neighbourhood is measured in XZ
 * for the same reason: a 3D gather would collect a SUBSET of the sites
 * the plan diagram depends on, and the certificate would then be
 * measuring a distance the diagram does not use.
 */
import { Geometry, PRIMTYPE_ATTR, setPolylineTopology } from "../data/index.js";
import { canonicalPointRanks } from "../data/identity.js";
import { makeGeometryItem } from "../graph/index.js";
import { adjacencyFor } from "../spatial/index.js";
import { standardNode } from "./registry.js";
import {
  copyElements,
  positionView,
  requireGeometry,
  requireReportSlot,
  requireScalarColumn,
  resolveOn,
} from "./util.js";
import type { VoronoiCellsParams } from "./params.generated.js";

// Generated from the param schemas below; see params.generated.ts.
export type { VoronoiCellsParams } from "./params.generated.js";

/**
 * Ceiling on the ring corners one {@link voronoiCells} may build, matching
 * `MAX_EDGES` in `topology.ts` in size and in reason, and enforced during
 * the scan so a runaway fails before it allocates rather than after.
 */
const MAX_CELL_VERTICES = 1_048_576;

/**
 * Ceiling on the PAIRS the neighbour scan may find — a different quantity
 * from {@link MAX_CELL_VERTICES} and stated separately because it is
 * measured on a different thing. Sharing one constant between the two
 * read as if a corner and a pair were the same unit; they are not, and a
 * cell has at most `4 + k` corners for `k` pairs at that site.
 */
const MAX_SITE_PAIRS = 1_048_576;

/** How to get under either ceiling. */
const MAX_CELL_VERTICES_HINT =
  "Lower `radius` (the neighbour count grows with radius^2 over a plan), thin the cloud upstream " +
  "with selfPrune or filterByDensity, or cook the region in cells. A cell has at most 4 + k " +
  "corners for k gathered neighbours, so the two ceilings this node carries — one on the pairs " +
  "the scan finds, one on the corners it writes — move together in practice even though they " +
  "count different things.";

/** Build the Voronoi cell of every point, as a closed polyline. */
export const voronoiCells = standardNode<VoronoiCellsParams>({
  type: "voronoiCells",
  category: "point op",
  description:
    "Turns a point cloud into its VORONOI DIAGRAM: one closed `polyline` primitive per site, bounding the ground that site is nearer to than any other. That is the plot, the plate, the territory and the leaf cell, and it is the node extrudePolygon has been waiting for — `caps: 'bottom'` with `sides: false` fills each cell as a slab, `caps: 'both'` raises it into massing, and a per-site height reaches it because EVERY RING VERTEX CARRIES ITS SITE'S POINT ATTRIBUTES, P excepted, which is the corner. Cells come out in a canonical order fixed by the POINTS (identity, then position bits, then seed), so reordering the input permutes nothing. THE DIAGRAM IS A PLAN: cells are computed in the XZ plane and each ring lies flat at its own site's Y, because every subject that wants this node is planar and a 3D cell is a polyhedron; the neighbourhood is measured in XZ too, since a 3D gather would collect a SUBSET of the sites the plan depends on. THE RADIUS IS A GATHER, NOT A SIZE, AND EVERY CELL IS CERTIFIED. A site's cell is built by intersecting the half-planes of the sites within `radius` of it, and that answer is the GLOBAL cell — the one the whole cloud would have given — exactly when every corner lands within `radius / 2` of the site, because a site further than `radius` away cannot be nearer than the site to anything that close to it. Read the premise as well as the conclusion: the check audits the RADIUS, against the cloud it was handed. It cannot audit the CLOUD, so a cook that withheld a site inside `radius` — a halo set too narrow is the way that happens — gets a certified cell that is wrong. This node checks that for every cell and never emits one that fails, which matters because a truncated cell is a perfectly plausible convex polygon that nothing downstream could tell from a real one. A site on the OUTSIDE of the cloud has an unbounded true cell and no radius certifies it, so the boundary of a scatter loses a ring of cells and that is the honest answer rather than a bug; `onUncertified` picks whether that is a quiet drop or a refusal. PARTITIONING is the reason the certificate exists. A cell reads stored positions and never another cell's answer, but its footprint is data-dependent and no param bounds it, so a cell of a partitioned world is exact when it holds every point within `radius` of its own rectangle, and the certificate then confirms per site that the halo was wide enough. THE HALO IS 1.5 TIMES THE RADIUS AND THAT FACTOR IS NOT SLACK. Widen the rectangle by 1.5 * `radius` — or 1.5 times the GLOBAL MAXIMUM the field can return, when `radius` is a field — clip the cloud with filterByBounds ('halfOpen'), run this node, then run filterPrimitivesByBounds on the UNWIDENED rectangle with vertex 'first' and the same 'halfOpen' boundary. The extra half is there because a cell's points are CORNERS: filterPrimitivesByBounds tests a vertex, so the rule it can express is which window holds the ring's first corner, not which holds the site — and the certificate is exactly what bounds how far apart those two can be, at `radius / 2`. So a window can be handed a cell whose site sits that far outside it, and must have gathered around that site too. One named corner decides, so a tiling can neither double-count nor gap. If the OWNER can be chosen by the site instead — which host code can do and a graph cannot, because no shipped filter tests a point attribute's position — then `radius` alone is the exact halo, and that is the width the certificate is stated in. Input TOPOLOGY IS DROPPED — the output is a new geometry whose points are cell corners, not the sites — and so are the input's primitive and vertex attributes; point and detail attributes survive. Two sites at the same position have no bisector between them, so each gets the cell it would have had alone, which is the degenerate answer stated rather than a crash.",
  inputs: [{ name: "in", kind: "geometry" }],
  outputs: [{ name: "out", kind: "geometry" }],
  params: {
    radius: {
      type: "f32",
      default: 1,
      min: 0,
      acceptsField: true,
      description:
        "How far to look for the sites that bound a cell, in world units, tested STRICTLY: a site at exactly `radius` is not gathered. IT IS NOT A CELL SIZE. It is the reach of the search, and the cell it produces is either the true global cell or nothing at all. Raising it makes more cells CERTIFIABLE, at a cost that grows with its square; it never changes a cell that was already certified, which is what makes this param safe to tune. About three times the mean spacing of the cloud is a useful starting value. 0 builds nothing. As a FIELD it is a PER-SITE reach, and unlike connectPoints' radius it needs no pair rule, because a cell is decided by ONE site rather than by two: site i gathers within its own reach and certifies against half of it. A per-site reach of 0, negative or NaN builds no cell for that site. Under a partitioned cook the halo is 1.5 times this radius — or 1.5 times the GLOBAL MAXIMUM the field can return anywhere in the world, a bound to be derived rather than measured. The half is the gap between the ownership rule a graph can express (which window holds the ring's FIRST CORNER) and the one the certificate is stated in (which holds the SITE); see the node description. THAT IS A FLOOR AND NOT A HINT. Underestimating does not merely cost the seam some cells: the certificate asks whether the cell fits inside `radius / 2` and ASSUMES it was handed every site within `radius`, so a halo that withheld one breaks the premise somewhere the node cannot look, and the cell it then certifies is WRONG rather than absent. The error is bounded by how much was withheld, which makes it small, plausible and silent — the worst of the three.",
    },
    onUncertified: {
      type: "enum",
      default: "drop",
      enum: ["drop", "refuse"],
      description:
        "What to do with a site whose cell cannot be proved global. 'drop' emits no cell for it and carries on, which is the default because a site on the OUTER BOUNDARY of any finite cloud has an unbounded true cell that no radius certifies — refusing there would make the node unusable on a plain scatter. 'refuse' stops the cook naming the site's position, the reach its cell actually needed and the radius that would cover it; reach for it when the cook must produce a cell for every site, such as a partitioned world whose seam cells matter or a plot layout that downstream code will index, so that a missing cell is an error rather than a hole discovered later. Neither setting changes a cell that IS certified: the two differ only in what becomes of the ones that are not.",
    },
    areaAttr: {
      type: "string",
      default: "",
      description:
        "Name of an f32 PRIMITIVE attribute receiving each cell's area in square world units, measured in the XZ plane on the exact corners the certificate accepted. Empty (the default) writes none. It is the natural key for a plot layout — filterPrimitivesByAttribute drops the slivers, and a promoted area drives a per-lot height — and it is the cheapest way to see a diagram going wrong, since a cell far larger than its neighbours is a site whose competitors were out of reach. The shape is this node's to pick (f32, tuple 1), so the only name it can collide with is `primtype`, which is refused by name.",
    },
    uncertifiedAttr: {
      type: "string",
      default: "",
      description:
        "Name of a u32 DETAIL attribute receiving how many sites got no cell — because they failed the certificate, because their reach was not positive, or because the polygon collapsed below three distinct corners. `radius: 0` reports every site rather than none, which is the reading that tells you nothing was built. Empty (the default) writes none. Meaningful under `onUncertified: 'drop'`, where it is the difference between a diagram that lost its outer ring — expected, and roughly the hull of the cloud — and one that lost most of its cells because the radius is too small. Read it against the input's point count rather than alone.",
    },
  },
  execute({ inputs, params, checkCancelled, seed: nodeSeed }) {
    // Params before geometry: a bad policy reported as a geometry problem
    // sends the author to debug the wrong thing entirely.
    const policy = params.onUncertified;
    if (policy !== "drop" && policy !== "refuse") {
      throw new Error(`voronoiCells: unknown onUncertified "${policy}"; valid values: drop, refuse`);
    }
    const uniformRadius = typeof params.radius === "number" ? params.radius : undefined;
    if (uniformRadius !== undefined && (!(uniformRadius >= 0) || !Number.isFinite(uniformRadius))) {
      throw new Error(
        `voronoiCells: radius must be a finite number >= 0, got ${uniformRadius}; 0 builds no cells, and an unbounded radius would gather the whole cloud into every one`,
      );
    }
    const src = requireGeometry(inputs, "in", "voronoiCells");
    // Reporting slots before any work: a refusal must cost nothing. The
    // area lands on a primitive domain this node BUILDS, so the only
    // column it can collide with is the one the build itself creates.
    if (params.areaAttr === PRIMTYPE_ATTR) {
      throw new Error(
        `voronoiCells: areaAttr "${PRIMTYPE_ATTR}" is the string attribute that marks these primitives as polylines; writing an f32 area there would delete it and leave primitives nothing downstream recognises. Name the area something else (e.g. "cellArea").`,
      );
    }
    // The detail domain is CARRIED from the input, so the columns at risk
    // there are the input's own.
    if (params.uncertifiedAttr !== "") {
      requireReportSlot({
        attrs: src.attrs.detail,
        nodeType: "voronoiCells",
        param: "uncertifiedAttr",
        name: params.uncertifiedAttr,
        type: "u32",
        tupleSize: 1,
        domain: "detail",
        suggestion: "uncertifiedCells",
      });
    }

    const n = src.pointCount;
    const view = positionView(src, "voronoiCells", "in");
    const pd = view.data;
    const ps = view.stride;

    const radii =
      uniformRadius === undefined
        ? requireScalarColumn(
            resolveOn(src, "point", params.radius, nodeSeed, "voronoiCells", "radius"),
            "voronoiCells",
            "radius",
            "point",
            "a radius",
          )
        : undefined;
    // The candidate scan runs at the WIDEST reach in the cloud, but every
    // site is then filtered back to ITS OWN — which is not an optimisation,
    // it is the invariance. A site's clip set has to be a function of that
    // site and its own radius alone; letting it keep whatever the widest
    // reach happened to gather would make one cell depend on the rest of
    // the cloud, and a partitioned cook would disagree with a whole one.
    let widest = 0;
    if (radii !== undefined) {
      for (let i = 0; i < n; i++) {
        const v = radii.data[i];
        if (v > widest) widest = v; // 0, negative and NaN reach nothing
      }
    }
    const radius = uniformRadius ?? widest;

    const out = new Geometry();
    const ranks = n > 0 && radius > 0 ? canonicalPointRanks(src, "voronoiCells") : undefined;
    // A site with no cell is a site with no cell however it got there, so
    // the count starts at "all of them" on the paths that build nothing —
    // radius 0, or a field that is zero, negative or NaN everywhere. It
    // read 0 there until an independent check caught it, which is exactly
    // the number that would tell an author their radius is fine.
    let uncertified = ranks === undefined ? n : 0;
    let cellCount = 0;
    let vertexTotal = 0;
    let cellStart = new Uint32Array(0);
    let cellLen = new Uint32Array(0);
    let cellSite = new Uint32Array(0);
    let cellArea = new Float64Array(0);
    let cornerX = new Float64Array(0);
    let cornerZ = new Float64Array(0);

    if (ranks !== undefined) {
      // The neighbourhood is measured in the PLAN. A 3D query would return
      // a SUBSET of the sites whose bisectors cut the plan diagram — two
      // sites five apart in Y are 3D-far and plan-adjacent — so the cell
      // would be missing cuts, and the certificate would be bounding a
      // distance the diagram never used.
      const flat = new Float64Array(n * 3);
      for (let i = 0; i < n; i++) {
        flat[i * 3] = pd[i * ps];
        flat[i * 3 + 2] = pd[i * ps + 2];
      }
      const adj = adjacencyFor({ data: flat, stride: 3, count: n }, radius, {
        who: "voronoiCells",
        maxEdges: MAX_SITE_PAIRS,
        hint: MAX_CELL_VERTICES_HINT,
        checkCancelled,
      });
      const { offsets, neighbors } = adj;

      // An exact upper bound rather than a guess: a cell starts as a
      // square and each of its k clips adds at most one corner, so `4n +
      // neighbors.length` bounds the whole output and nothing here grows
      // an array.
      const capTotal = 4 * n + neighbors.length;
      cornerX = new Float64Array(capTotal);
      cornerZ = new Float64Array(capTotal);
      cellStart = new Uint32Array(n);
      cellLen = new Uint32Array(n);
      cellSite = new Uint32Array(n);
      cellArea = new Float64Array(n);

      // Sites are visited in canonical rank order, so the cells come out
      // in an order that is a property of the POINTS and not of the order
      // they arrived in.
      const order = new Uint32Array(n);
      for (let i = 0; i < n; i++) order[i] = i;
      order.sort((a, b) => ranks[a] - ranks[b]);

      // Scratch, sized for the widest row this cloud can produce.
      let widestRow = 0;
      for (let i = 0; i < n; i++) {
        const k = offsets[i + 1] - offsets[i];
        if (k > widestRow) widestRow = k;
      }
      const cap = 4 + widestRow;
      let ax = new Float64Array(cap);
      let az = new Float64Array(cap);
      let bx = new Float64Array(cap);
      let bz = new Float64Array(cap);
      const fs = new Float64Array(cap);
      const near = new Uint32Array(widestRow);

      for (let oi = 0; oi < n; oi++) {
        if ((oi & 63) === 0) checkCancelled();
        const i = order[oi];
        const r = radii === undefined ? radius : radii.data[i];
        // 0, negative and NaN all reach nothing, and a site that reaches
        // nothing has no cell rather than an infinite one.
        if (!(r > 0)) {
          uncertified++;
          continue;
        }
        const sx = pd[i * ps];
        const sz = pd[i * ps + 2];

        // Filter the row to THIS site's reach, then order it canonically.
        // Both matter: the first makes the clip set a function of the site
        // alone, the second makes the floating-point result of a sequence
        // of clips a function of the point set rather than of the grid's
        // traversal order.
        const r2 = r * r;
        let nk = 0;
        const end = offsets[i + 1];
        for (let k = offsets[i]; k < end; k++) {
          const j = neighbors[k];
          const dx = pd[j * ps] - sx;
          const dz = pd[j * ps + 2] - sz;
          if (dx * dx + dz * dz < r2) near[nk++] = j;
        }
        const clips = near.subarray(0, nk);
        clips.sort((p, q) => ranks[p] - ranks[q]);

        // The polygon is carried RELATIVE to its site, which is what makes
        // the certificate a plain squared length and keeps the half-plane
        // test from differencing two large world coordinates.
        let m = 4;
        ax[0] = -r;
        az[0] = -r;
        ax[1] = -r;
        az[1] = r;
        ax[2] = r;
        az[2] = r;
        ax[3] = r;
        az[3] = -r;

        for (let c = 0; c < nk && m >= 3; c++) {
          const j = clips[c];
          const dx = pd[j * ps] - sx;
          const dz = pd[j * ps + 2] - sz;
          const d2 = dx * dx + dz * dz;
          // A site at zero distance IS this site rather than a competitor:
          // it names no bisector, exactly as connectPoints' gabriel test
          // skips a candidate coincident with an endpoint.
          if (d2 === 0) continue;
          // Keep the half-plane nearer this site. f(v) = 2 v.d - |d|^2 is
          // the perpendicular bisector written without its midpoint, which
          // is one fewer rounding on every corner.
          for (let a = 0; a < m; a++) fs[a] = 2 * (ax[a] * dx + az[a] * dz) - d2;
          let w = 0;
          for (let a = 0; a < m; a++) {
            const b = a + 1 === m ? 0 : a + 1;
            const fa = fs[a];
            const fb = fs[b];
            // Closed, so a corner lying exactly ON the bisector is kept.
            if (fa <= 0) {
              bx[w] = ax[a];
              bz[w] = az[a];
              w++;
            }
            // A crossing needs a STRICT sign change, and that is not
            // pedantry — it is the lattice. The bisector between a site
            // and its diagonal neighbour passes exactly through a corner
            // of the square cell, so `fa <= 0 !== fb <= 0` fires with
            // `fa === 0` and interpolates at t = 0, emitting the corner a
            // second time. Every right angle is that case, as gabriel's
            // open sphere already taught this repo once: a plain unit
            // lattice came out with six corners per square, each cell
            // carrying zero-length edges that extrudePolygon would have
            // swept into degenerate walls.
            if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
              const t = fa / (fa - fb);
              bx[w] = ax[a] + (ax[b] - ax[a]) * t;
              bz[w] = az[a] + (az[b] - az[a]) * t;
              w++;
            }
          }
          const tx = ax;
          const tz = az;
          ax = bx;
          az = bz;
          bx = tx;
          bz = tz;
          m = w;
        }

        // Merge corners the OUTPUT CANNOT TELL APART. A lattice produces
        // them and it is not an exotic case: the bisector with a diagonal
        // neighbour passes through a corner the axis clips already placed,
        // so the same point arrives twice by two different arithmetic
        // routes and the unit square comes out with five corners carrying
        // a zero-length edge — which extrudePolygon would sweep into a
        // degenerate wall. An exact `===` does not catch it, because the
        // two routes agree to about 1e-16 rather than to the last bit.
        //
        // THE TEST IS THE STORE ITSELF, not a tolerance. `Math.fround` of
        // the world coordinate is literally what the write below does,
        // because `P` is an f32 column and this library has no f64
        // attribute type — so two corners that pass this test would be
        // written to the same two floats, and keeping both would record a
        // difference the output cannot hold. That matters more than it
        // sounds: an earlier version used a threshold relative to
        // `radius`, which is wrong because f32 resolution follows the
        // COORDINATE, not the radius, and at radius 1000 it deleted a
        // legitimate corner pair 10^7 ulps apart.
        //
        // The merge is also partition-safe for the ordinary reason: both
        // corners come from the same clip set in the same canonical order,
        // so they are bit-identical in every cook of this site, a windowed
        // one included. And duplicates are inert during the clipping — a
        // zero-length edge has equal endpoint values and so can never
        // change a sign — which is why one pass at the end is enough.
        if (m >= 3) {
          const same = (a: number, b: number): boolean =>
            Math.fround(sx + (ax[a] as number)) === Math.fround(sx + (ax[b] as number)) &&
            Math.fround(sz + (az[a] as number)) === Math.fround(sz + (az[b] as number));
          let k = 0;
          for (let a = 0; a < m; a++) {
            if (k > 0 && same(a, k - 1)) continue;
            ax[k] = ax[a] as number;
            az[k] = az[a] as number;
            k++;
          }
          if (k > 1 && same(k - 1, 0)) k--;
          m = k;
        }

        // THE CERTIFICATE. Every corner within radius/2 of the site means
        // no ungathered site can reach into this cell, so this cell is the
        // one the whole cloud would have given. Negated so a NaN corner
        // fails it rather than passing.
        const half2 = r * r * 0.25;
        let reach2 = 0;
        let ok = m >= 3;
        if (ok) {
          for (let a = 0; a < m; a++) {
            const q = ax[a] * ax[a] + az[a] * az[a];
            if (q > reach2) reach2 = q;
            if (!(q < half2)) ok = false;
          }
        }
        if (!ok) {
          if (policy === "refuse") {
            const reach = Math.sqrt(reach2);
            throw new Error(
              `voronoiCells: the cell of the site at (${sx}, ${pd[i * ps + 1]}, ${sz}) is not certified — its corners reach ${reach} from the site, past the ${r / 2} that radius ${r} proves. Raise radius above ${2 * reach} so the sites that bound it are gathered, or set onUncertified to "drop". A site on the OUTER BOUNDARY of the cloud has an unbounded cell and NO radius certifies it: dropping is the only answer there, and scattering sites around the outside is how you keep the ones you care about.`,
            );
          }
          uncertified++;
          continue;
        }

        if (vertexTotal + m > MAX_CELL_VERTICES) {
          throw new Error(
            `voronoiCells: cell corners exceed the ${MAX_CELL_VERTICES} limit at cell ${cellCount} of at most ${n}. ${MAX_CELL_VERTICES_HINT}`,
          );
        }
        // Shoelace over the site-relative corners, which is the number the
        // absolute ones would give without differencing them first.
        let twice = 0;
        for (let a = 0; a < m; a++) {
          const b = a + 1 === m ? 0 : a + 1;
          twice += ax[a] * az[b] - ax[b] * az[a];
          cornerX[vertexTotal + a] = ax[a];
          cornerZ[vertexTotal + a] = az[a];
        }
        cellArea[cellCount] = Math.abs(twice) * 0.5;
        cellStart[cellCount] = vertexTotal;
        cellLen[cellCount] = m;
        cellSite[cellCount] = i;
        cellCount++;
        vertexTotal += m;
      }
    }

    // Every ring vertex takes its SITE's point attributes, then P is
    // overwritten with the corner — so a per-site colour, seed or height
    // rides the cell into extrudePolygon, which copies input point
    // attributes onto the geometry it builds.
    const siteOf = new Uint32Array(vertexTotal);
    for (let c = 0; c < cellCount; c++) {
      const s = cellStart[c];
      const e = s + cellLen[c];
      for (let v = s; v < e; v++) siteOf[v] = cellSite[c];
    }
    copyElements(src.attrs.point, out.attrs.point, siteOf, vertexTotal);
    if (vertexTotal > 0) {
      const P = out.attrs.point.require("P");
      const Pd = P.data;
      const Pts = P.tupleSize;
      for (let c = 0; c < cellCount; c++) {
        const i = cellSite[c];
        const sx = pd[i * ps];
        const sy = pd[i * ps + 1];
        const sz = pd[i * ps + 2];
        const s = cellStart[c];
        const e = s + cellLen[c];
        for (let v = s; v < e; v++) {
          Pd[v * Pts] = sx + cornerX[v];
          Pd[v * Pts + 1] = sy;
          Pd[v * Pts + 2] = sz + cornerZ[v];
        }
      }
    }

    // Closed the way pathResample closes a ring: the first point index
    // repeated as the last vertex. There is no closed flag in this library
    // and there does not need to be one.
    const pointIndices = new Uint32Array(vertexTotal + cellCount);
    const primVertexStart = new Uint32Array(cellCount);
    const primVertexCount = new Uint32Array(cellCount);
    let w = 0;
    for (let c = 0; c < cellCount; c++) {
      const s = cellStart[c];
      const len = cellLen[c];
      primVertexStart[c] = w;
      for (let v = 0; v < len; v++) pointIndices[w++] = s + v;
      pointIndices[w++] = s;
      primVertexCount[c] = len + 1;
    }
    setPolylineTopology(out, pointIndices, primVertexStart, primVertexCount);

    // After the topology call, which deletes the primitive domain.
    if (params.areaAttr !== "") {
      const area = out.attrs.primitive.replace(params.areaAttr, "f32", 1, 0);
      for (let c = 0; c < cellCount; c++) area.set(c, cellArea[c]);
    }
    copyElements(src.attrs.detail, out.attrs.detail, undefined, src.attrs.detail.count);
    if (params.uncertifiedAttr !== "") {
      out.attrs.detail.replace(params.uncertifiedAttr, "u32", 1, 0).set(0, uncertified);
    }
    return { out: [makeGeometryItem(out)] };
  },
});
