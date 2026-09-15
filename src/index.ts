export const VERSION = "0.17.0";

export * from "./data/index.js";
export * from "./random/index.js";
export * from "./fields/index.js";
export * from "./noise/index.js";
// src/spatial is deliberately NOT re-exported: it is the shared index the
// spatial nodes are built on, not a promise to callers. Exporting it later
// costs nothing; un-exporting it would be a breaking change, so it stays
// internal until something outside the library actually needs it.
export * from "./graph/index.js";
export * from "./nodes/index.js";
export * from "./spawn/index.js";
export * from "./runtime/index.js";
// Named rather than starred: the diagnostics barrel also carries the
// suggester and the record validators, which are the library's plumbing
// and not a promise to callers.
export {
  DIAGNOSTIC_CODES,
  type Diagnostic,
  type DiagnosticCode,
  diagnosticsOf,
} from "./diagnostics/index.js";
// The structural checks that produce those records for a live graph. Named
// here, beside the record types, rather than starred through
// `./nodes/index.ts`: it is the graph-level half of the same promise.
export { diagnoseGraph } from "./nodes/diagnose.js";
// The load and those checks as one call that reports instead of throwing:
// what `pcg validate` runs, and the question an agent asks of a file.
export { type CheckedGraph, checkSerializedGraph } from "./nodes/checkGraph.js";
// Named rather than starred through `./nodes/index.js`, because it is the
// one node-layer module that reads BOTH sides of the spawner seam: the graph
// walk lives with the other graph reports, and the question it answers is a
// spawn question. The names are the whole module, so a star would say the
// same thing with one less place to notice it.
export {
  type AssetIdOrigin,
  type DescribedSpawner,
  // Named even though `DescribedSpawner` is the entry point: `open`'s
  // element type is what a consumer branches on, and a field whose type
  // cannot be written down is a field that gets copied into a local
  // interface instead of read.
  type OpenAssetSet,
  describeGraphAssets,
} from "./nodes/graphAssets.js";
// Named rather than re-exported by `./nodes/index.ts`: the module also
// carries the field-key table its completeness test reads, which describes
// how the schema is made and is no promise to a consumer.
export { type GraphJsonSchemaOptions, graphJsonSchema } from "./nodes/graphSchema.js";
// `repeatUntil`'s params, generated with every other node's from the registry
// schemas. The only one named here rather than re-exported by its node's module:
// the node registers in `serialize.ts`, where the same shape is still spelled
// inline, and `./nodes/index.ts` publishes only the loop's factory.
export type { RepeatUntilParams } from "./nodes/params.generated.js";
