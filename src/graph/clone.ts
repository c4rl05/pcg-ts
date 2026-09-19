// NOTE: this helper lives in src/graph for now to keep module ownership
// clean during parallel development; it may move to src/data later.
import { DOMAINS, Geometry, type Domain } from "../data/index.js";
import { addForOverwrite, resizeForOverwrite } from "../data/overwrite.js";

// ONE PASS PER COLUMN. `to` is a fresh geometry's set and holds no
// columns yet — the point set is empty, and the topology install and the
// constructor only SIZE the vertex, primitive and detail sets — so it is
// sized first, at exactly `from.count`, while that is still just a number.
// Each column is then created uninitialized and written whole by one
// `copyFrom` over `[0, from.count)`: the default fill this used to run
// first was overwritten element for element before anything read it.
function copyDomain(src: Geometry, dst: Geometry, domain: Domain): void {
  const from = src.attrs[domain];
  const to = dst.attrs[domain];
  const n = from.count;
  resizeForOverwrite(to, n);
  for (const attr of from) {
    addForOverwrite(to, attr.name, attr.type, attr.tupleSize, attr.defaultValue).copyFrom(
      attr,
      0,
      0,
      n,
    );
  }
}

/**
 * Deep-copy a geometry: every attribute of every domain (including string
 * tables and defaults) plus the topology arrays. Nodes use this to honor
 * the purity contract — transform a clone, never a cached input.
 *
 * The copy holds the same elements and nothing else: each domain's
 * `capacity` is exactly its `count`, where the source's may carry the
 * slack of growth by doubling. Appending to the copy grows it as usual.
 */
export function cloneGeometry(src: Geometry): Geometry {
  const dst = new Geometry();
  // Points first so topology validation sees the right point count;
  // setTopology copies the arrays defensively and sizes the vertex and
  // primitive domains.
  copyDomain(src, dst, "point");
  dst.setTopology(src.vertexToPoint, src.primVertexStart, src.primVertexCount);
  for (const domain of DOMAINS) {
    if (domain !== "point") copyDomain(src, dst, domain);
  }
  return dst;
}
