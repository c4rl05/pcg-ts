/**
 * THE SECTION VIEW: the ground opened, and what is under it cut on a
 * vertical plane, so the foundations (ground.ts, SOURCES.md §31.4) can be
 * seen where they stand. The graph builds them whole; the page owns the
 * cut.
 *
 * THE PLANE is the one PL-XX draws its section on, « suivant la diagonale
 * de la pile 1 (Nord) à la pile 3 (Sud) »: x + z = 0 in the render, through
 * both piles' centres. Pile 4's half (x + z > 0) is kept — its caissons,
 * the flue and the chimney whole — and piles 1 and 3 are cut down their
 * diagonals: pile 1's caissons and massifs in half, pile 3's machine room
 * through the middle. Pile 2's half is taken away with the ground over it,
 * so the camera looks from there into the cut.
 *
 * THE CUT IS GEOMETRY, made once on the CPU when the view is first opened
 * and swapped in and out after that. A clipping plane would be simpler,
 * but the occlusion pass draws its own normal-and-depth prepass with one
 * override material, which knows nothing of a material's clipping planes:
 * the opened ground would still be in the prepass and shade everything
 * under it. Cut triangles are split on the plane, so a massif's section
 * shows as its cut outline; being a surface, the cut face itself is open.
 *
 * What is cut: the `foundations` class whole (the chimney stands on the
 * kept side), the ground plane, and of the `machinery` and `masonry`
 * classes only what is under the ground (the machine room's plant, the
 * caissons' shells, the supports' lower stones), so nothing of the tower
 * above the ground is touched.
 */
import { BufferAttribute, BufferGeometry, Mesh, Plane, Vector3, type Object3D } from "three";

/** PL-XX's section plane, as the half-space kept: x + z ≥ 0. */
export const SECTION_PLANE = new Plane(new Vector3(1, 0, 1).normalize(), 0);

/** Under the ground: a triangle lower than this everywhere is cut with the foundations. */
const UNDER = 0.05;

/**
 * `geo` less what lies on the negative side of `plane`, its triangles
 * split on it; with `under`, only triangles wholly under that height are
 * cut and the rest kept as they are. Positions and normals are carried;
 * the result is unindexed.
 */
export function cutGeometry(geo: BufferGeometry, plane: Plane, under?: number): BufferGeometry {
  const src = geo.index !== null ? geo.toNonIndexed() : geo;
  const P = src.getAttribute("position");
  const N = src.getAttribute("normal");
  const pos: number[] = [];
  const nor: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const push = (p: Vector3, n: Vector3 | undefined) => {
    pos.push(p.x, p.y, p.z);
    if (n !== undefined) nor.push(n.x, n.y, n.z);
  };
  for (let t = 0; t < P.count; t += 3) {
    const v = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(P, t + k));
    const n = N === undefined ? undefined : [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(N, t + k));
    const d = v.map((p) => plane.distanceToPoint(p));
    const high = Math.max(v[0]!.y, v[1]!.y, v[2]!.y);
    if ((under !== undefined && high >= under) || d.every((x) => x >= 0)) {
      for (let k = 0; k < 3; k++) push(v[k]!, n?.[k]);
      continue;
    }
    if (d.every((x) => x < 0)) continue;
    // The kept part of the triangle, in order round it.
    const ring: Array<{ p: Vector3; n: Vector3 | undefined }> = [];
    for (let k = 0; k < 3; k++) {
      const j = (k + 1) % 3;
      if (d[k]! >= 0) ring.push({ p: v[k]!, n: n?.[k] });
      if (d[k]! >= 0 !== d[j]! >= 0) {
        const s = d[k]! / (d[k]! - d[j]!);
        a.copy(v[k]!).lerp(v[j]!, s);
        const nn = n === undefined ? undefined : b.copy(n[k]!).lerp(n[j]!, s).normalize().clone();
        ring.push({ p: a.clone(), n: nn });
      }
    }
    for (let k = 1; k + 1 < ring.length; k++) {
      for (const q of [ring[0]!, ring[k]!, ring[k + 1]!]) push(q.p, q.n);
    }
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  if (N !== undefined) out.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** What the section needs from the page. */
export interface SectionHost {
  /** The scene, to find the rig's ground plane in (the one `PlaneGeometry` it holds). */
  readonly scene: Object3D;
  /** The drawn meshes by output name, as the page keeps them. */
  readonly meshes: ReadonlyMap<string, readonly Mesh[]>;
  /** The orbit controls, whose floor the view lowers so the camera can look into the cut. */
  readonly controls: { maxPolarAngle: number };
  /** Called after every switch: the page redraws its shadow map. */
  readonly changed: () => void;
}

/**
 * Prepare the section view and return its switch. Nothing is cut until it
 * is first switched on.
 */
export function attachSection(host: SectionHost): (on: boolean) => void {
  const floor = host.controls.maxPolarAngle;
  const swaps: Array<{ mesh: Mesh; whole: BufferGeometry; cut?: BufferGeometry; under?: number }> = [];
  for (const mesh of host.meshes.get("foundations") ?? []) swaps.push({ mesh, whole: mesh.geometry });
  for (const cls of ["machinery", "masonry"]) {
    for (const mesh of host.meshes.get(cls) ?? []) swaps.push({ mesh, whole: mesh.geometry, under: UNDER });
  }
  let ground: Mesh | undefined;
  host.scene.traverse((o) => {
    if (ground === undefined && o instanceof Mesh && (o.geometry as BufferGeometry).type === "PlaneGeometry") ground = o;
  });
  if (ground !== undefined) swaps.push({ mesh: ground, whole: ground.geometry });
  return (on: boolean) => {
    for (const s of swaps) {
      if (on && s.cut === undefined) s.cut = cutGeometry(s.whole, SECTION_PLANE, s.under);
      s.mesh.geometry = on ? (s.cut as BufferGeometry) : s.whole;
    }
    // Low enough to look up under the kept ground from the opened side.
    host.controls.maxPolarAngle = on ? Math.PI * 0.62 : floor;
    host.changed();
  };
}
