/**
 * The page's net for normals the graph did not write, shared by the page
 * (main.ts) and the bands worker (bandsWorker.ts), which builds a streamed
 * cell's meshes off the page's thread.
 */
import { type BufferGeometry, Vector3 } from "three";

/**
 * Give every vertex that arrived with a ZERO normal its triangle's face
 * normal. A mesh source that writes no `normal` (meshPrimitive's boxes),
 * merged into a class with one that does, has its normals zero-filled by
 * the merge, and a lit material shades (0, 0, 0) black — see PLAN.md's
 * backlog. The modules write their own normals where they can; this is
 * the page's net for what slips through, and it leaves every real normal
 * as the graph wrote it.
 */
export function repairZeroNormals(geometry: BufferGeometry): void {
  const normal = geometry.getAttribute("normal");
  const position = geometry.getAttribute("position");
  if (normal === undefined || position === undefined) return;
  const index = geometry.index;
  const vertexOf = (corner: number): number => (index === null ? corner : index.getX(corner));
  const corners = index === null ? position.count : index.count;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  let repaired = 0;
  for (let t = 0; t + 2 < corners; t += 3) {
    const v = [vertexOf(t), vertexOf(t + 1), vertexOf(t + 2)] as const;
    const zero = v.filter(
      (i) => normal.getX(i) === 0 && normal.getY(i) === 0 && normal.getZ(i) === 0,
    );
    if (zero.length === 0) continue;
    a.fromBufferAttribute(position, v[0]);
    b.fromBufferAttribute(position, v[1]);
    c.fromBufferAttribute(position, v[2]);
    const n = c.sub(b).cross(a.sub(b)).normalize();
    for (const i of zero) normal.setXYZ(i, n.x, n.y, n.z);
    repaired += zero.length;
  }
  if (repaired > 0) normal.needsUpdate = true;
}
