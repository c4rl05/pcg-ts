// Named rather than `export *`: types.ts also exports ATTR_CTORS, the
// AttrType -> typed-array-constructor table `Attribute` allocates from.
// It is an implementation table with two call sites in one file (the GPU
// path declared its own rather than importing it), and `export *`
// published it as API, where a consumer could come to depend on the
// mapping and freeze it. See publicSurface.test.ts.
export {
  type AttrData,
  type AttrDefault,
  type AttrType,
  type AttrTypeMap,
  DOMAINS,
  type Domain,
  type AttrBufferId,
  type ReadonlyAttrData,
  type ReadonlyTopology,
} from "./types.js";
export * from "./attribute.js";
// The class only, so a caller can `instanceof` the fault and read its
// facts. The helpers that build and throw it (`attributeNotFound`,
// `requireAttributeOn`) and its wording options are the library's own
// plumbing, imported by path.
export { AttributeNotFoundError } from "./attributeNotFound.js";
export * from "./geometry.js";
export * from "./points.js";
export * from "./promote.js";
export * from "./transfer.js";
export * from "./transferMapping.js";
