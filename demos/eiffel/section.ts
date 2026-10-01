/**
 * THE SECTION VIEW: the whole tower cut on a vertical plane, and the
 * ground opened on the side taken away, so the structure and the
 * foundations under it (ground.ts, SOURCES.md §31.4) can be seen in
 * section. The graph builds everything whole; the page owns the cut.
 *
 * THE PLANE is parallel to the one PL-XX draws its section on, « suivant
 * la diagonale de la pile 1 (Nord) à la pile 3 (Sud) »: x + z = OFFSET·√2
 * in the render. At offset 0 it runs through both piles' centres, and
 * pile 4's half (x + z > 0) is kept — its caissons and the flue whole —
 * while piles 1 and 3 are cut down their diagonals and pile 2's half is
 * taken away with the ground over it, so the camera looks from there into
 * the cut. The page's slider moves the plane along its normal, from
 * keeping everything to keeping nothing.
 *
 * THE CUT IS A CLIPPING PLANE, so moving it costs nothing. It is set in
 * two places, because neither reaches every pass alone:
 *
 * - the renderer's global planes, which every draw of the scene with a
 *   built-in material is clipped by: the lit image, and the passes that
 *   draw the scene through ONE override material — the occlusion's
 *   normal-and-depth prepass, the drawing's normal pass — which know
 *   nothing of a material's own planes. Without them the opened half
 *   would still be in the prepass and shade the cut. A ShaderMaterial is
 *   clipped only with `clipping: true`, so the sky and the full-screen
 *   passes are left alone;
 * - each material's own planes, with `clipShadows`, because the shadow
 *   pass applies no global plane: without them the half taken away would
 *   still throw its shadow into the cut. A custom depth material (the
 *   streamed bands') needs nothing of its own: the shadow pass copies the
 *   mesh material's planes onto it. Meshes arrive after the view is
 *   opened (the streamed detail, the build's days), so the page calls
 *   `tick` every frame while it is open; materials already carrying the
 *   plane are skipped.
 *
 * Being a clip, the cut face is open: a massif shows its cut outline, and
 * a hollow member is seen into.
 */
import { Box3, InstancedMesh, type Material, Mesh, type Object3D, Plane, Vector3 } from "three";

/** The plane's normal: PL-XX's diagonal, pointing into the half that is kept (pile 4's). */
export const SECTION_NORMAL = new Vector3(1, 0, 1).normalize();

/**
 * The half-space kept at `offset` metres along SECTION_NORMAL from the
 * tower's axis: SECTION_NORMAL · p ≥ offset. Written into `target`.
 */
export function sectionPlane(offset: number, target = new Plane()): Plane {
  return target.set(SECTION_NORMAL, -offset);
}

/**
 * How far along SECTION_NORMAL the boxes reach, either way: the slider's
 * span, so its ends keep everything and nothing.
 */
export function sectionReach(boxes: Iterable<Box3>): number {
  let reach = 0;
  const corner = new Vector3();
  for (const box of boxes) {
    if (box.isEmpty()) continue;
    for (let k = 0; k < 8; k++) {
      corner.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z);
      reach = Math.max(reach, Math.abs(corner.dot(SECTION_NORMAL)));
    }
  }
  return reach;
}

/** What the section needs from the page. */
export interface SectionHost {
  /** The scene, every material in which is cut. */
  readonly scene: Object3D;
  /** The renderer, whose global planes cut every pass but the shadows. */
  readonly renderer: { clippingPlanes: Plane[]; localClippingEnabled: boolean };
  /** The drawn meshes by output name, as the page keeps them: what the slider spans. */
  readonly meshes: ReadonlyMap<string, readonly Mesh[]>;
  /** The orbit controls, whose floor the view lowers so the camera can look into the cut. */
  readonly controls: { maxPolarAngle: number };
  /** Called after every change: the page redraws its shadow map. */
  readonly changed: () => void;
}

/** The section view's handle. */
export interface Section {
  /** Open or close the view. */
  set(on: boolean): void;
  /** Move the plane to `offset` metres along SECTION_NORMAL. */
  move(offset: number): void;
  /** Every frame while open: give materials that arrived since the plane. */
  tick(): void;
  /** How far the tower reaches along SECTION_NORMAL, either way. */
  readonly reach: number;
}

/** A material the plane can cut: a ShaderMaterial only if it asked for clipping. */
function clippable(m: Material): boolean {
  const shader = m as Material & { isShaderMaterial?: boolean; clipping?: boolean };
  return shader.isShaderMaterial !== true || shader.clipping === true;
}

/**
 * Prepare the section view and return its handle. Nothing is cut until it
 * is first opened.
 */
export function attachSection(host: SectionHost, offset = 0): Section {
  const floor = host.controls.maxPolarAngle;
  const plane = sectionPlane(offset);
  const planes = [plane];
  const given = new Set<Material>();
  let open = false;

  // Instanced batches (rivets, fittings) sit on the members they dress, and
  // bounding them walks every instance, so they are left out of the span.
  const boxes: Box3[] = [];
  for (const list of host.meshes.values()) {
    for (const mesh of list) if (!(mesh instanceof InstancedMesh)) boxes.push(new Box3().setFromObject(mesh));
  }
  const reach = sectionReach(boxes);

  const give = (m: Material | undefined, on: boolean): void => {
    if (m === undefined || !clippable(m)) return;
    if (on === given.has(m)) return;
    m.clippingPlanes = on ? planes : null;
    m.clipShadows = on;
    if (on) given.add(m);
    else given.delete(m);
  };
  const giveAll = (on: boolean): void => {
    if (!on) {
      for (const m of [...given]) give(m, false);
      return;
    }
    host.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const ms = Array.isArray(o.material) ? (o.material as Material[]) : [o.material as Material];
      for (const m of ms) give(m, true);
    });
  };

  return {
    reach,
    set(on: boolean) {
      if (on === open) return;
      open = on;
      host.renderer.localClippingEnabled = on;
      host.renderer.clippingPlanes = on ? planes : [];
      giveAll(on);
      // Low enough to look up under the kept ground from the opened side.
      host.controls.maxPolarAngle = on ? Math.PI * 0.62 : floor;
      host.changed();
    },
    move(to: number) {
      sectionPlane(to, plane);
      if (open) host.changed();
    },
    tick() {
      if (open) giveAll(true);
    },
  };
}
