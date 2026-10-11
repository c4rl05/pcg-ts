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
  Plane,
  PlaneGeometry,
  type Scene,
  ShadowMaterial,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Pass } from "three/addons/postprocessing/Pass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import type { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { type BuiltEnv, type EnvSpec, buildEnv, sunDirection } from "./env.js";
import { passFlat } from "./flat.js";
import { applyAo, createGtao, shareGBuffer } from "./gtao.js";
import { type Ink, createInk } from "./ink.js";
import type { LightSpec, Look, MaterialSpec } from "./look.js";
import { VIGNETTE_DEFAULT, applyVignette, createVignette, sizeVignette } from "./vignette.js";
import { type Wash, createWash } from "./wash.js";

export interface Rig {
  /** Push a whole look. Rebuilds the environment only if its spec changed. */
  apply(look: Look): void;
  /** Re-aim the shadow camera at what was actually built. */
  fitShadow(box: Box3): void;
  /**
   * Fit the shadow camera to a box round a viewer instead (the walk's), or
   * with null, back to what was built. Returns the texel's size across the
   * light, in metres.
   */
  fitShadowNear(box: Box3 | null): number;
  /** The shadow map's texel across the light as fitted now, in metres. */
  shadowTexel(): number;
  setSize(width: number, height: number): void;
  /** Draw. Replaces `renderer.render(scene, camera)`. */
  render(): void;
  /**
   * Draw the pen elevation (ink.ts) instead of the lit image, or with
   * false, go back; `colour` lays the wash (wash.ts) under its lines. The
   * look is untouched either way: a coloured drawing's lights are a look
   * of their own (drawing.ts), which the host applies.
   */
  setInk(on: boolean, colour?: boolean): void;
  /**
   * The tower's shadow on the ground under a coloured drawing, laid on the
   * paper in `colour`; null for none. Only a coloured drawing has it: the
   * shadow is caught in the colour pass, which the plain pen does not run.
   */
  setGroundShadow(colour: number | null): void;
  /** The drawing, for its dials. */
  readonly ink: Ink;
  /** The colour under a coloured drawing's lines, for its dials. */
  readonly wash: Wash;
  /**
   * Whether the drawing shows what is under the ground. The lit look's
   * ground plane hides it; the drawing has no ground plane, so it cuts
   * there instead, unless the host has opened the ground (a section).
   */
  showUnderground(on: boolean): void;
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

  /**
   * The drawing's ground: nothing but the shadow on it. Shown only in the
   * colour pass, over a black clear, so a pixel off the tower holds the
   * shadow's strength there (white times the shadow's alpha) and the pen
   * reads it as that (ink.ts `groundShadow`). Just above y = 0, which the
   * drawing cuts at.
   */
  const shadowCatcher = new Mesh(
    new PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2),
    new ShadowMaterial({ color: 0xffffff, opacity: 1, depthWrite: false }),
  );
  shadowCatcher.position.y = 0.02;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.castShadow = false;
  shadowCatcher.visible = false;
  scene.add(shadowCatcher);
  let groundShadow = false;
  const clearWas = new Color();

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
  // A second occlusion over the first (Look `ao2`), reading its prepass.
  const gtao2 = createGtao(scene, camera, size.width, size.height, renderer);
  shareGBuffer(gtao2, gtao);
  gtao2.enabled = false;
  composer.addPass(gtao2);
  // Upstream of the output pass on purpose: the vignette is light the lens
  // did not deliver, so it is multiplied into a linear image and tone
  // mapped along with everything else. `vignette.ts` says why at length.
  const vignette = createVignette(size.width, size.height);
  composer.addPass(vignette);
  // Tone mapping and the sRGB write happen HERE, not in the materials:
  // three only applies `renderer.toneMapping` when it is drawing straight
  // to the canvas, so everything upstream of this pass is linear, which
  // is what the occlusion wants to be multiplying.
  // A flat-painted pixel (flat.ts) passes through it untouched instead,
  // a kept one (the page's highlights) loses its mark; every other pixel
  // takes the stock path.
  const output = new OutputPass();
  passFlat(output);
  composer.addPass(output);

  // The drawing leaves the ground off: an elevation stands on the paper.
  const ink = createInk(renderer, scene, camera, size.width, size.height, () => [ground, shadowCatcher]);
  let inking = false;
  // A COLOURED DRAWING is the composer's own render and occlusion in the
  // wash's palette, handed to the pen instead of going through the
  // vignette and the tone map: the pen lays it on the paper itself
  // (ink.ts). The same composer, so the occlusion pass and its buffers are
  // shared, with its last two passes swapped for the pen's.
  const wash = createWash();
  let colouring = false;
  let underground = false;
  /** The ground's cut: keeps what is above it (three keeps a plane's positive side). */
  const groundCut = new Plane(new Vector3(0, 1, 0), 0);
  /** Draw `draw` with the ground cut added to whatever planes the host set, and those put back. */
  function aboveGround(draw: () => void): void {
    if (underground) return draw();
    const planes = renderer.clippingPlanes;
    renderer.clippingPlanes = [...planes, groundCut];
    try {
      draw();
    } finally {
      renderer.clippingPlanes = planes;
    }
  }
  const inkPass = new (class extends Pass {
    override render(_r: WebGLRenderer, _write: unknown, read: { texture: Texture }): void {
      ink.render(read.texture);
    }
  })();
  inkPass.needsSwap = false;
  inkPass.enabled = false;
  composer.addPass(inkPass);
  function renderColour(): void {
    wash.prepare(scene);
    wash.set(true);
    const vignetteOn = vignette.enabled;
    vignette.enabled = false;
    output.enabled = false;
    inkPass.enabled = true;
    // Off the tower the colour pass holds only the ground's shadow, over black.
    const background = scene.background;
    const clearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clearWas);
    scene.background = null;
    renderer.setClearColor(0x000000, 1);
    shadowCatcher.visible = groundShadow;
    try {
      composer.render();
    } finally {
      shadowCatcher.visible = false;
      scene.background = background;
      renderer.setClearColor(clearWas, clearAlpha);
      inkPass.enabled = false;
      output.enabled = true;
      vignette.enabled = vignetteOn;
      wash.set(false);
    }
  }

  let env: BuiltEnv | undefined;
  let envKey = "";
  let current: Look | undefined;
  let lastBox: Box3 | undefined;
  /** The viewer's box while the shadow is fitted round one (`fitShadowNear`). */
  let nearBox: Box3 | null = null;

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

    // Only when the overrides changed: a look derived from another (the
    // drawing's, whose sliders re-apply it on every move) shares its
    // table, and re-marking every material each time is a stall.
    for (const [name, material] of look.material === current?.material ? [] : Object.entries(materials)) {
      const spec = { ...(base.get(name) ?? {}), ...(look.material[name] ?? {}) };
      if (spec.color !== undefined) material.color.setHex(spec.color);
      if (spec.roughness !== undefined) material.roughness = spec.roughness;
      if (spec.metalness !== undefined) material.metalness = spec.metalness;
      material.envMapIntensity = spec.envMapIntensity ?? 1;
      material.needsUpdate = true;
    }

    applyAo(gtao, look.ao);
    const ao2 = look.ao2;
    if (ao2?.on === true) {
      applyAo(gtao2, ao2);
      // The second reads the first's prepass, so the first runs, unseen, if only the second is wanted.
      if (!look.ao.on) {
        gtao.enabled = true;
        gtao.blendIntensity = 0;
      }
    } else gtao2.enabled = false;
    applyVignette(vignette, look.vignette ?? VIGNETTE_DEFAULT);
    current = look;
    if (nearBox !== null) fitNear(nearBox);
    else if (lastBox !== undefined) fitShadow(lastBox);
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
    if (nearBox !== null) {
      fitNear(nearBox);
      return;
    }
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

  /**
   * The shadow fitted round a viewer: the box's own bounds across the
   * light, so the map's texels are spent where the viewer is (a 60 m box
   * on a 4096 map is a texel of about 2 cm, where the whole tower and its
   * shadow leave one of 9 cm), and along the light all the way back
   * past the tower's top, so everything between the sun and the box still
   * casts into it. Nothing outside the box is shadowed while it holds:
   * the ground's, from high up, is the price.
   */
  function fitNear(box: Box3): void {
    if (current === undefined || box.isEmpty()) return;
    const centre = box.getCenter(new Vector3());
    const dir = key.position.clone().sub(key.target.position);
    if (dir.lengthSq() < 1e-9) dir.set(0, 1, 0);
    dir.normalize();
    // Back far enough that the light stands clear of anything built.
    const built = lastBox !== undefined && !lastBox.isEmpty() ? lastBox.getSize(new Vector3()).length() : 600;
    key.target.position.copy(centre);
    key.target.updateMatrixWorld();
    key.position.copy(centre).addScaledVector(dir, built);
    key.updateMatrixWorld();
    const cam = key.shadow.camera;
    cam.position.copy(key.position);
    cam.lookAt(key.target.position);
    cam.updateMatrixWorld(true);
    const toLight = cam.matrixWorld.clone().invert();
    const lo = new Vector3(Infinity, Infinity, Infinity);
    const hi = new Vector3(-Infinity, -Infinity, -Infinity);
    const p = new Vector3();
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(toLight);
      lo.min(p);
      hi.max(p);
    }
    cam.left = lo.x;
    cam.right = hi.x;
    cam.bottom = lo.y;
    cam.top = hi.y;
    cam.near = 0.5;
    cam.far = -lo.z;
    cam.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  function fitShadowNear(box: Box3 | null): number {
    nearBox = box === null ? null : box.clone();
    if (nearBox !== null) fitNear(nearBox);
    else if (lastBox !== undefined) fitShadow(lastBox);
    return shadowTexel();
  }

  function shadowTexel(): number {
    const cam = key.shadow.camera;
    return Math.max(cam.right - cam.left, cam.top - cam.bottom) / key.shadow.mapSize.x;
  }

  function setSize(width: number, height: number): void {
    composer.setSize(width, height);
    gtao.setSize(width, height);
    gtao2.setSize(width, height);
    sizeVignette(vignette, width, height);
    ink.setSize(width, height);
  }

  return {
    apply,
    fitShadow,
    fitShadowNear,
    shadowTexel,
    setSize,
    render: () =>
      inking ? aboveGround(() => (colouring ? renderColour() : ink.render())) : composer.render(),
    setInk(on: boolean, colour = false) {
      inking = on;
      colouring = colour;
    },
    setGroundShadow(colour) {
      groundShadow = colour !== null;
      ink.groundShadow(colour);
    },
    ink,
    wash,
    showUnderground(on: boolean) {
      underground = on;
    },
    ao: gtao,
    dispose() {
      env?.dispose();
      composer.dispose();
      ink.dispose();
      scene.remove(key, key.target, fill, fill.target, rim, rim.target, bounce, bounce.target, ambient, shadowCatcher);
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
