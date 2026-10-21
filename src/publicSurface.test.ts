/**
 * Pins the public surface of `pcg-ts` — the root import.
 * See publicSurface.testsupport.ts for why this exists and how to respond
 * when it fails. The gpu and three entry points are pinned by their own
 * files, next to the code they cover.
 *
 * Nine names left this list in one deliberate withdrawal — a breaking
 * change, taken while the package is pre-alpha:
 * `ATTR_CTORS`, `FIELD_BRAND`, `MAX_INSTANCES`,
 * `getSubgraphPlumbing`, `isDeviceInstanceBatch`,
 * `makeDeviceInstancesItem`, `nextRev`, `paramSchemaError` and
 * `paramValueError`. Each was reached by an `export *` through a barrel
 * rather than by anyone deciding to publish it, none had a caller outside
 * `src/`, and every one of them fails a different way when a consumer
 * takes it up. All nine are still exported from their own modules, which
 * is where the internal callers and the tests reach them; the barrels
 * carry the reason each was withdrawn. Do not re-add one here without
 * re-adding it to a barrel on purpose.
 *
 * TWO TYPES WENT WITH THEM AND THIS FILE CANNOT SEE EITHER, which is
 * worth stating here because the gap is silent. `surfaceOf` reads the
 * module's RUNTIME keys, and a `type` export has none — so
 * `AnyInstanceBatch` and `SubgraphPlumbing`, each of which was the sole
 * parameter or return type of one of the nine above, stayed published
 * after their only producer left and no assertion here moved. Nothing
 * public could make or take either: a reader met a name in the typings,
 * went looking for how to obtain it, and found nothing. They were removed
 * by hand once someone read the barrels.
 *
 * So this list is a pin on the VALUE surface and not on the API. The
 * type surface has no equivalent gate, and the way to find an orphan like
 * that today is to notice that the thing which produced it is gone.
 */
import { describe, expect, it } from "vitest";

import * as root from "./index.js";
import { surfaceDiff, surfaceOf } from "./publicSurface.testsupport.js";

const ROOT_SURFACE = [
  "Attribute", "AttributeSet", "CookCancelledError", "DOMAINS",
  // Every failure as records with a stable code: the code table (the
  // single source the docs render from, additive-only) and the reader
  // that recovers records from any thrown value. See src/diagnostics.
  "DIAGNOSTIC_CODES", "diagnosticsOf",
  // The structural checks that produce those records for a live graph:
  // unconnected required pins, unreachable nodes, no outputs, stranded
  // graph-param values. Runs beside the loader, never inside it.
  "diagnoseGraph",
  // The load and those checks in one call that returns records instead of
  // throwing: { graph?, errors, warnings }. What `pcg validate` runs.
  "checkSerializedGraph",
  // A field read an attribute its domain does not carry. A class, not only
  // a code, so a caller can branch with instanceof and read the typed facts
  // (domain, available names, the domains that DO carry it) without parsing.
  "AttributeNotFoundError",
  "FieldJsonError", "GRAPH_META_KEYS", "Geometry", "Graph",
  "GraphCycleError", "GraphError", "GraphSerializationError", "GraphValidationError",
  "NOISE_RAW_RANGES", "NodeExecutionError", "PRIMTYPE_ATTR", "Pcg32",
  // The one reserved per-instance channel name, "color". A host reading a
  // spawner batch's channels needs the literal to tell instance colour
  // (which a renderer binds structurally) from a generic channel, and a
  // graph author needs it to know which name spawnInstances' instanceAttrs
  // refuses. Published rather than left as a magic string in two adapters.
  "INSTANCE_COLOR_CHANNEL",
  "STANDARD_POINT_ATTRS", "TRANSFER_AREA_EPS", "TRANSFER_BARY_EPS", "TRANSFER_BOX_PAD_REL",
  "TRANSFER_DET_EPS", "VERSION", "World", "WorldValidationError", "abs", "acos", "add",
  "applyGraphParamTargets", "applyParamPatches", "asin", "atan", "atan2", "attribute", "attributeIs", "attributeReduce",
  "attributeRemap", "buildInstanceBatches", "byAttribute", "capture", "captureAsync", "choose", "clamp",
  "cloneGeometry", "component", "composeTRS", "connectByIndex", "connectPoints",
  "constant", "cook",
  "copyToPoints", "cos", "createGpuCookStats", "createPointCloud", "createPolyline", "cross",
  "createTriangleMesh", "dataInput", "defineNode", "describeGraphAssets", "describeGraphParams",
  // Graph-supplied asset meshes: a top-level output declared role "asset"
  // is the mesh for asset id = its name. The static half (which ids the
  // graph supplies) and the cook-result half (the meshes, with the
  // refusals every host would otherwise restate) — see src/spawn/meshAssets.ts.
  "collectGraphAssets", "describeSuppliedAssets", "isAssetOutput",
  // The three halves of the per-instance ABI a HOST needs and the library
  // cannot use on its behalf: the CPU and device normalizers that read a
  // batch's named channels as one record (colour included, so an adapter
  // never serves two spellings of it), and the layout rule that says what
  // a device channel's buffer must hold — the vec3 16-byte stride and the
  // bool-as-u32 rule are WGSL's, not ours, and a host composing its own
  // buffers has to obey both. The matching CONSTRUCTORS are deliberately
  // absent: see src/fields/index.ts and src/graph/index.ts.
  "deviceInstanceAttributeLayout", "deviceInstanceAttributesOf", "instanceAttributesOf",
  "describeSubgraphParams",
  "describeSubgraphPins", "deserializeGraph", "distance",
  "div", "dot", "elementCount", "eq",
  "evaluateField", "exp", "exp2",
  "extrudePolygon", "fbm", "fieldFromJson", "fieldToJson", "filterByAttribute",
  // Strips of quads between two paths, point i to point i: shoulders,
  // ribbons, annuli, loft bands.
  "bridgePaths",
  "filterByBounds", "filterByDensity", "filterByExpression", "filterByTag",
  "filterPrimitivesByAttribute", "filterPrimitivesByBounds", "firstGeometry", "floor", "forEachNode", "fract",
  "fraction",
  // Interpolates a path's point attributes onto an INDEPENDENT cloud at
  // arbitrary arc positions — N stations against an M-point path, which
  // pathPointAt cannot answer because its output carries the path's own
  // count and topology.
  "transferAlongPath",
  "pathShift",
  "transferByIndex",
  "ge",
  "getFieldSpec",
  "getNodeType", "getRegisteredSubgraph", "graphParamBindings", "getSubgraphSpec", "gt",
  // The serialized format's JSON Schema, generated from the registries; the
  // published copy is docs/graph.schema.json.
  "graphJsonSchema",
  "hasNodeType", "hasRegisteredSubgraph", "hashCombine", "hashFloat", "hashString",
  "index",
  // Which wrapper a registered recipe was written for, read off its
  // reserved exposed-pin names. Public because building a node around a
  // registered recipe is something outside code does, and the recipe
  // deliberately does not record the answer.
  "inferWrapperKind",
  "inlineParamMetaOf", "inlineParamSchema", "inlineParamValuesOf", "isDeviceResidentInstances", "isField", "jitterPoints",
  "keyNum", "keyRef", "le", "length", "lerp", "liveParamValueError", "listFieldFnInfos", "listFieldFns",
  "listNodeTypes", "listSubgraphs", "log", "log2", "lookup",
  "lt", "makeField",
  "makeGeometryItem", "makeInstancesItem", "makeValueItem", "max", "mergePoints", "mergePrimitives",
  "meshFromField", "meshPrimitive", "min", "mod",
  "mul", "ne", "nodeSeed", "noiseOutputRange", "normalize",
  // Drops points whose oriented box blocks a line of sight from a moving
  // eye, pushing them clear first and dropping only what cannot be moved.
  "occlusionCull",
  // Emits a repeated piece over each of a set of arc ranges on a path —
  // one range's tiles all drawn from one upstream choice, so a tunnel is
  // the same rib repeated rather than a fresh draw per rib.
  "arcTile",
  // Cuts every polyline where a field changes sign and keeps the pieces
  // where it is >= 0, the cut placed by a root search on the field.
  "pathClip",
  // One point per interior crossing among a geometry's 2-vertex
  // primitives, with both primitive ids and the crossing's bisector.
  "segmentCrossings",
  // Planar boolean (union / intersection / difference) of closed polylines,
  // and cutting them along polylines with a kerf; both write `holeOf`.
  "polygonBoolean",
  "splitPolygons",
  // Groups a path's points into runs by an along-arc gap and least-squares
  // fits an attribute against arc within each, per run.
  "runFit",
  // Names the minimum set of points that must change category for every
  // category's share of the population to land inside a stated band.
  "quotaRebalance",
  // Packs boxes on a stud lattice into catalogue bricks, plus the studs
  // left showing.
  "packBricks",
  // Which clutch-connected piece each brick is in, and the step at which
  // a bottom-up build can place it.
  "brickConnectivity",
  "orientAlongVector", "paramNamesOf", "parseFieldText",
  "partitionByAttribute",
  // Writes, per path point, whether a fan of rays cast from it is blocked
  // by the box cloud — "is this stretch under cover", in world space
  // rather than by projecting bounds onto the path, which cannot tell
  // "above the road here" from "near the road twice".
  "pathCoverage",
  "pathPointAt", "pathResample", "pathRuns", "pathScan", "pathSegments", "perlinNoise", "pointGrid", "pointList", "pointLine", "pointNeighborhood",
  "pointScatterInBounds", "pointScatterInWorld", "pointScatterOnPath", "pointsToPath", "position", "pow",
  "primitiveTypeCounts", "printFieldSpec", "projectToPlane", "promote", "promoteAttribute", "ramp",
  "randomField",
  // A uniform keyed on a VALUE the graph computes rather than on where
  // the element is, so a draw survives the element being moved.
  "randomFrom",
  "registerSubgraph", "rem", "remap", "removeAttribute", "repeatPoints",
  // Wraps an inner graph and re-cooks it, feeding its "carry" output back
  // into its own input, until a detail-domain scalar reads zero — the
  // bounded fixed point a DAG cannot wire as a cycle.
  "repeatUntilNode",
  "resolveExposedParam",
  "resolveField", "sampleNearestPoint", "select", "selfPrune", "serializeGraph",
  "setAttribute", "setBounds", "setPolylineTopology", "sign",
  "simplexNoise", "sin",
  "smoothNormals", "smoothstep",
  "spawnInstances", "specChildEntries", "splineSample", "sqrt", "standardNode", "step",
  "strandedGraphParamValues", "sub",
  "subgraphContentHash",
  "subgraphNode", "surfaceSample", "sweepProfile", "tan", "transferAttribute", "transferNearest",
  "transferRaycast", "transferUv", "transformPoints", "trunc", "validateGraphMeta", "valueConstant",
  "valueNoise", "vec", "volumeSample", "voronoiCells", "withInlineParamValue",
  "worleyFeature", "worleyNoise",
  "writeCurveFrame",
  // Narrows a CellContext to its "xz" form. Public because every `bind`
  // on a square-cell level wants the cell rectangle and only a
  // world-space context has one — `cellMode: "path"` carries an arc range
  // and no min/max, deliberately, so a 2D bind handed one fails to
  // compile. That leaves every such bind needing the same narrowing; the
  // three shipped demo levels and the runtime's own test support all
  // wrote it before this existed.
  "writeTangents", "xzCell",
] as const;

describe("public surface: pcg-ts", () => {
  it("exports exactly the reviewed set", () => {
    const drift = surfaceDiff(surfaceOf(root), ROOT_SURFACE);
    expect(drift, drift).toBe("");
  });

  it("does not publish the internal anonymous-attribute marker", () => {
    // The concrete leak that motivated these tests. Its own case so a
    // regression names itself instead of hiding inside a 169-name diff.
    expect(Object.keys(root)).not.toContain("ANON_ATTR_PREFIX");
  });
});
