/**
 * A {@link Look}, made into a scene.
 *
 * This is the only file that knows about three. It owns five lights, the
 * environment textures, the fog, the exposure, the render path, the
 * occlusion and the vignette, and it knows nothing at all about the
 * Eiffel Tower — it is
 * handed a scene, a camera, a bounding box and a table of materials by
 * class name. That is deliberate: it was tuned away from this page and
 * landed here unchanged, and anything tower-shaped in it would have had
 * to be unpicked first.
 *
 * FIVE LIGHTS, and each has a job:
 *
 *   key      the sun. The only one that casts, because a second caster
 *            doubles the shadow pass over a 3.3M-triangle tower for a
 *            shadow nobody can point at in the image.
 *   fill     the opposite quarter of the sky, cool, shadowless. It is what
 *            stops the unlit faces going to the ambient's flat value.
 *   rim      low and behind, to put a line on the silhouette. On a lattice
 *            this does more than it does on a solid: it catches the near
 *            edge of every member and the web separates.
 *   bounce   from underneath, warm, the ground throwing the sun back up
 *            under the arches and the first floor.
 *   ambient  a hemisphere, sky over ground. The floor under everything.
 *
 * A light whose `angle` is null FOLLOWS THE ENVIRONMENT'S SUN, so moving
 * the sky moves the key, the reflections and the shadow together. A sun
 * that moves while its shadow stays put is the single most confusing
 * thing a rig like this can do.
 */
import {
  type Box3,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  type Scene,
  Vector3,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { type BuiltEnv, type EnvSpec, buildEnv, sunDirection } from "./env.js";
import { applyAo, createGtao } from "./gtao.js";
import type { LightSpec, Look, MaterialSpec } from "./look.js";
import { VIGNETTE_DEFAULT, applyVignette, createVignette, sizeVignette } from "./vignette.js";

export interface Rig {
  /** Push a whole look. Rebuilds the environment only if its spec changed. */
  apply(look: Look): void;
  /** Re-aim the shadow camera at what was actually built. */
  fitShadow(box: Box3): void;
  setSize(width: number, height: number): void;
  /** Draw. Replaces `renderer.render(scene, camera)`. */
  render(): void;
  /** True while the occlusion is in the path; false means it was switched off. */
  readonly ao: GTAOPass;
  dispose(): void;
}

/**
 * @param materials the host's materials by class name. The look's
 *   `material` map is applied ON TOP of whatever these already carry, so
 *   the host keeps ownership of the palette and a look only ever states
 *   its differences from it.
 */
export function createRig(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  materials: Readonly<Record<string, MeshStandardMaterial>>,
  size: { width: number; height: number },
): Rig {
  const key = new DirectionalLight(0xffffff, 0);
  key.castShadow = true;
  const fill = new DirectionalLight(0xffffff, 0);
  const rim = new DirectionalLight(0xffffff, 0);
  const bounce = new DirectionalLight(0xffffff, 0);
  const ambient = new HemisphereLight(0xffffff, 0x808080, 0);
  scene.add(key, key.target, fill, fill.target, rim, rim.target, bounce, bounce.target, ambient);

  /**
   * The ground, owned HERE rather than by the host, for one reason: it is
   * the only surface in the image whose colour has to agree with the
   * environment's, and the environment is built here. A host-side ground
   * is a second place to remember, and the frame where they disagree is a
   * tower standing on a floor of a different world.
   *
   * It receives and never casts. 5 km so the horizon is the fog's, not the
   * plane's edge.
   */
  const groundMaterial = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const ground = new Mesh(new PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), groundMaterial);
  ground.receiveShadow = true;
  ground.castShadow = false;
  scene.add(ground);

  // The base each look's overrides are applied to, captured once so that
  // switching from a look that pushed metalness to one that does not
  // returns the paint to where the host had it, rather than leaving the
  // last look's value behind.
  const base = new Map<string, MaterialSpec>();
  for (const [name, m] of Object.entries(materials)) {
    base.set(name, {
      color: m.color.getHex(),
      roughness: m.roughness,
      metalness: m.metalness,
      envMapIntensity: m.envMapIntensity,
    });
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = createGtao(scene, camera, size.width, size.height, renderer);
  composer.addPass(gtao);
  // Upstream of the output pass on purpose: the vignette is light the lens
  // did not deliver, so it is multiplied into a linear image and tone
  // mapped along with everything else. `vignette.ts` says why at length.
  const vignette = createVignette(size.width, size.height);
  composer.addPass(vignette);
  // Tone mapping and the sRGB write happen HERE, not in the materials:
  // three only applies `renderer.toneMapping` when it is drawing straight
  // to the canvas, so everything upstream of this pass is linear, which
  // is what the occlusion wants to be multiplying.
  composer.addPass(new OutputPass());

  let env: BuiltEnv | undefined;
  let envKey = "";
  let current: Look | undefined;
  let lastBox: Box3 | undefined;

  function apply(look: Look): void {
    const wanted = JSON.stringify(look.env);
    if (wanted !== envKey) {
      env?.dispose();
      env = buildEnv(renderer, look.env);
      envKey = wanted;
    }
    const built = env as BuiltEnv;

    scene.environment = built.environment;
    scene.environmentIntensity = look.envIntensity;
    scene.background = look.background === "env" ? built.background : built.horizon;
    scene.backgroundIntensity = 1;

    scene.fog =
      look.fog === null ? null : new Fog(built.horizon.getHex(), look.fog.near, look.fog.far);

    // The ground stands only when the environment is what you are looking
    // at. A studio look has no outdoors to stand in, and a floor under it
    // would be a floor from nowhere.
    const g = look.ground ?? {
      on: look.background === "env",
      color: envGroundColor(look.env),
      roughness: 1,
    };
    ground.visible = g.on;
    groundMaterial.color.setHex(g.color);
    groundMaterial.roughness = g.roughness;

    renderer.toneMappingExposure = look.exposure;

    const sun = look.env.kind === "sky" ? look.env.sun : null;
    aim(key, look.key, sun);
    aim(fill, look.fill, sun);
    aim(rim, look.rim, sun);
    aim(bounce, look.bounce, sun);
    ambient.intensity = look.ambient.intensity;
    ambient.color.setHex(look.ambient.sky);
    ambient.groundColor.setHex(look.ambient.ground);

    key.castShadow = look.key.shadow.on && look.key.on;
    key.shadow.bias = look.key.shadow.bias;
    key.shadow.normalBias = look.key.shadow.normalBias;
    key.shadow.radius = look.key.shadow.radius;
    if (key.shadow.mapSize.x !== look.key.shadow.mapSize) {
      key.shadow.mapSize.setScalar(look.key.shadow.mapSize);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }

    for (const [name, material] of Object.entries(materials)) {
      const spec = { ...(base.get(name) ?? {}), ...(look.material[name] ?? {}) };
      if (spec.color !== undefined) material.color.setHex(spec.color);
      if (spec.roughness !== undefined) material.roughness = spec.roughness;
      if (spec.metalness !== undefined) material.metalness = spec.metalness;
      material.envMapIntensity = spec.envMapIntensity ?? 1;
      material.needsUpdate = true;
    }

    applyAo(gtao, look.ao);
    applyVignette(vignette, look.vignette ?? VIGNETTE_DEFAULT);
    current = look;
    if (lastBox !== undefined) fitShadow(lastBox);
    renderer.shadowMap.needsUpdate = true;
  }

  /**
   * Fit the key's shadow camera to what was BUILT, and to the ground its
   * shadow falls on.
   *
   * A frustum sized for the geometry alone crops the shadow off at the
   * tower's foot, and one sized for a nominal envelope spends most of its
   * map on empty sky. Every point of the shadow lies on a ray from a point
   * of the box away from the light, so the frustum is the light-space
   * bounds of the box's eight corners TOGETHER WITH where each corner's
   * ray meets y = 0. (The page did this itself before the look became one
   * object; the difference is that the sun can move here, so the reach is
   * capped — at three degrees of elevation the honest answer is four
   * kilometres of frustum, which would leave a texel every two metres.)
   */
  function fitShadow(box: Box3): void {
    lastBox = box;
    if (current === undefined || box.isEmpty()) return;
    const centre = box.getCenter(new Vector3());
    const reach = box.getSize(new Vector3()).length();
    const dir = key.position.clone().sub(key.target.position);
    if (dir.lengthSq() < 1e-9) dir.set(0, 1, 0);
    dir.normalize();

    key.target.position.copy(centre);
    key.target.updateMatrixWorld();
    key.position.copy(centre).addScaledVector(dir, reach);
    key.updateMatrixWorld();

    // What `LightShadow.updateMatrices` does before each shadow pass, done
    // here so the bounds are measured in the frame the pass will use.
    const cam = key.shadow.camera;
    cam.position.copy(key.position);
    cam.lookAt(key.target.position);
    cam.updateMatrixWorld(true);
    const toLight = cam.matrixWorld.clone().invert();

    const lo = new Vector3(Infinity, Infinity, Infinity);
    const hi = new Vector3(-Infinity, -Infinity, -Infinity);
    const p = new Vector3();
    const corner = new Vector3();
    const onGround = new Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      );
      // Where this corner's shadow lands, capped: `dir.y` goes to zero as
      // the sun reaches the horizon and the unclamped distance with it.
      const drop = dir.y > 1e-3 ? Math.max(corner.y, 0) / dir.y : Infinity;
      onGround.copy(corner).addScaledVector(dir, -Math.min(drop, reach * 1.5));
      for (const q of [corner, onGround]) {
        p.copy(q).applyMatrix4(toLight);
        lo.min(p);
        hi.max(p);
      }
    }
    const margin = reach * 0.02;
    cam.left = lo.x - margin;
    cam.right = hi.x + margin;
    cam.bottom = lo.y - margin;
    cam.top = hi.y + margin;
    // Light space looks down -z, so the nearest point has the largest z.
    cam.near = Math.max(0.5, -hi.z - margin);
    cam.far = -lo.z + margin;
    cam.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  function setSize(width: number, height: number): void {
    composer.setSize(width, height);
    gtao.setSize(width, height);
    sizeVignette(vignette, width, height);
  }

  return {
    apply,
    fitShadow,
    setSize,
    render: () => composer.render(),
    ao: gtao,
    dispose() {
      env?.dispose();
      composer.dispose();
      scene.remove(key, key.target, fill, fill.target, rim, rim.target, bounce, bounce.target, ambient);
    },
  };
}

/**
 * Point a light. Position rather than direction, because three aims a
 * directional light from its position at its target; the distance is
 * arbitrary for the lighting and is overwritten for the key by
 * `fitShadow`, which needs a real one.
 */
function aim(
  light: DirectionalLight,
  spec: LightSpec,
  envSun: { elevation: number; azimuth: number } | null,
): void {
  light.visible = spec.on;
  light.intensity = spec.on ? spec.intensity : 0;
  light.color.setHex(spec.color);
  const angle = spec.angle ?? envSun ?? { elevation: 45, azimuth: 0 };
  light.position.copy(sunDirection(angle)).multiplyScalar(500);
  light.target.position.set(0, 0, 0);
  light.target.updateMatrixWorld();
}

/**
 * What the environment says the ground is. Only the studio has none — it
 * is a room, and its floor is already in the cubemap — so it falls back to
 * the pale grey this page's ground plane has always been.
 */
function envGroundColor(env: EnvSpec): number {
  return env.kind === "studio" ? 0xa29c8f : env.ground;
}

/** The colour a host should clear to when it has no look yet. */
export const NEUTRAL = new Color(0xc4d0da);
