/**
 * The environment the iron reflects — generated, never loaded.
 *
 * Nothing here ships a byte. The repo has no rendering assets and should
 * not gain any for this: a captured HDRI is somebody's photograph with
 * somebody's licence, it is megabytes, and it pins the look to one place
 * and hour. Everything below is a few hundred lines of shader that a
 * slider moves, which is what tuning a look actually wants.
 *
 * Each environment is built ONCE into two textures, because they are asked
 * two different questions:
 *
 *   - `environment` is what the PBR materials sample for their specular
 *     reflections and their diffuse irradiance. It wants to be prefiltered
 *     per roughness, so it goes through three's `PMREMGenerator`, and it
 *     is blurred by construction.
 *   - `background` is what the camera sees past the silhouette. It wants
 *     to be sharp — a sun disc smeared into a pale wash reads as haze —
 *     so it is a plain cube render at full resolution.
 *
 * Both come off the same little scene, so they can never disagree about
 * where the sun is. Rebuilding is ~10 ms and only happens when a dial that
 * changes the sky moves, never per frame.
 */
import {
  BackSide,
  BoxGeometry,
  Color,
  CubeCamera,
  type CubeTexture,
  LinearFilter,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  type Texture,
  Vector3,
  WebGLCubeRenderTarget,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Sky } from "three/addons/objects/Sky.js";

/**
 * Where the sun is, said the way a person says it: degrees above the horizon and
 * degrees round from +z toward +x. Every light in `rig.ts` that follows
 * the sun reads the same two numbers, so the reflections and the shadows
 * can never point different ways.
 */
export interface SunAngle {
  /** Degrees above the horizon. Negative is below it. */
  readonly elevation: number;
  /** Degrees clockwise from +z, looking down. */
  readonly azimuth: number;
}

/** A physical-ish daylight sky. The sun's height does the seasons. */
export interface SkyEnv {
  readonly kind: "sky";
  readonly sun: SunAngle;
  /** Haze. 2 is an alpine morning, 10 a city afternoon, 20 a dust storm. */
  readonly turbidity: number;
  /** How blue the blue is: the short-wavelength scattering. */
  readonly rayleigh: number;
  /** Aerosol density — the halo around the sun. */
  readonly mieCoefficient: number;
  /** How tightly that halo hugs the sun, 0..1. */
  readonly mieDirectionalG: number;
  /** What the ground bounces back up. Paris pavement is not black. */
  readonly ground: number;
  /** Multiplies the whole environment's contribution. */
  readonly intensity: number;
}

/** Three bands: zenith, horizon, ground. An overcast day, or a cyclorama. */
export interface GradientEnv {
  readonly kind: "gradient";
  readonly zenith: number;
  readonly horizon: number;
  readonly ground: number;
  /** How tightly the bands meet at the horizon; 1 is a soft dome. */
  readonly sharpness: number;
  readonly intensity: number;
}

/** three's white room: soft boxes and strip lights. A neutral studio light. */
export interface StudioEnv {
  readonly kind: "studio";
  readonly intensity: number;
}

export type EnvSpec = SkyEnv | GradientEnv | StudioEnv;

/** What `buildEnv` hands back. Call `dispose` before replacing it. */
export interface BuiltEnv {
  /** Prefiltered, for the materials' reflections. */
  readonly environment: Texture;
  /** Sharp, for what the camera sees past the tower. */
  readonly background: CubeTexture;
  /**
   * The average colour at the horizon, which the fog and the page's clear
   * colour take so the tower dissolves into its own sky rather than into
   * a colour somebody typed.
   */
  readonly horizon: Color;
  dispose(): void;
}

/** A unit vector from an elevation/azimuth pair. */
export function sunDirection(sun: SunAngle): Vector3 {
  const phi = (sun.elevation * Math.PI) / 180;
  const theta = (sun.azimuth * Math.PI) / 180;
  return new Vector3(
    Math.cos(phi) * Math.sin(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(theta),
  ).normalize();
}

const CUBE_SIZE = 256;

/**
 * Build both textures for a spec.
 *
 * The small scene is thrown away; only its two renders survive. `renderer`
 * is borrowed for the duration and its state restored by three's own
 * helpers, so this is safe to call mid-session.
 */
export function buildEnv(renderer: WebGLRenderer, spec: EnvSpec): BuiltEnv {
  const horizon = horizonColor(spec);
  const scene = new Scene();
  let extra: { dispose(): void } | undefined;
  /**
   * Repaint whatever is below the horizon. The two renders want different
   * answers there and it is not a detail:
   *
   *   - the PMREM wants the GROUND's real colour, because that is the
   *     light bouncing up into the underside of the arches;
   *   - the background wants the HORIZON's, because the ground plane in
   *     front of it fogs to exactly that, and any other colour shows up as
   *     a band of foreign land between the plane's far edge and the sky.
   *
   * The band is easy to mistake for a fog bug. It is not: the plane is
   * 5 km across, the far clip is 2 km, so the plane never reaches the true
   * horizon and the cubemap behind it is what fills the gap.
   */
  let repaintBelow: (color: Color) => void = () => {};

  if (spec.kind === "sky") {
    const sky = new Sky();
    // Bigger than any far plane it will be rendered with; the cube camera
    // below uses its own, so nothing here has to agree with the page's.
    sky.scale.setScalar(10000);
    const u = sky.material.uniforms;
    u["turbidity"].value = spec.turbidity;
    u["rayleigh"].value = spec.rayleigh;
    u["mieCoefficient"].value = spec.mieCoefficient;
    u["mieDirectionalG"].value = spec.mieDirectionalG;
    u["sunPosition"].value.copy(sunDirection(spec.sun));
    scene.add(sky);
    // The Preetham sky has no ground: below the horizon it keeps going,
    // so a tower lit by it alone is lit from underneath as brightly as
    // from above. A ground hemisphere is what stops that, and it is also
    // the warm bounce that puts light under the arches.
    const dome = groundDome(spec.ground);
    scene.add(dome);
    repaintBelow = (c) => (dome.material as ShaderMaterial).uniforms["uColor"].value.copy(c);
    extra = { dispose: () => sky.material.dispose() };
  } else if (spec.kind === "gradient") {
    const dome = gradientDome(spec);
    scene.add(dome);
    repaintBelow = (c) => (dome.material as ShaderMaterial).uniforms["uGround"].value.copy(c);
  } else {
    scene.add(new RoomEnvironment());
  }

  // Background first, with the ground repainted to where the fog lands.
  repaintBelow(horizon);
  const cubeTarget = new WebGLCubeRenderTarget(CUBE_SIZE, {
    generateMipmaps: true,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
  });
  const cubeCamera = new CubeCamera(0.1, 100, cubeTarget);
  cubeCamera.update(renderer, scene);

  // Then the real ground back, for the light it throws upward.
  repaintBelow(groundColor(spec));
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const envTarget: WebGLRenderTarget = pmrem.fromScene(scene, 0, 0.1, 100);
  pmrem.dispose();

  disposeScene(scene);
  extra?.dispose();

  return {
    environment: envTarget.texture,
    background: cubeTarget.texture,
    horizon,
    dispose() {
      envTarget.dispose();
      cubeTarget.dispose();
    },
  };
}

/** What the spec says is underfoot. The studio's floor is in its own cubemap. */
function groundColor(spec: EnvSpec): Color {
  return new Color(spec.kind === "studio" ? 0xa29c8f : spec.ground);
}

/**
 * The colour the tower fades into. Read off the spec rather than off the
 * render, because a render read means a GPU stall and this is wanted
 * immediately; the two agree to the eye.
 */
function horizonColor(spec: EnvSpec): Color {
  if (spec.kind === "gradient") return new Color(spec.horizon);
  if (spec.kind === "studio") return new Color(0xbfbfbf);
  // Preetham at the horizon: pale, and warmer the lower the sun sits. The
  // fit is by eye against the rendered sky at elevations 2 to 60 and
  // turbidities 2 to 12 — near enough that the silhouette's edge does not
  // show a seam, which is all this is for.
  const low = Math.max(0, 1 - spec.sun.elevation / 25);
  const haze = Math.min(1, spec.turbidity / 12);
  return new Color().setHSL(
    0.58 - 0.5 * low * 0.09,
    0.42 - 0.3 * haze - 0.2 * low,
    0.72 + 0.1 * haze - 0.08 * low,
  );
}

const DOME = new BoxGeometry(2, 2, 2);

/** A hemisphere of one colour under the horizon, and nothing above it. */
function groundDome(color: number): Mesh {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: { uColor: { value: new Color(color) } },
    vertexShader: DOME_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        // A few degrees of softening at the horizon, so the seam between
        // the sky and the ground is not a hard line in the reflections.
        float below = smoothstep(0.04, -0.04, d.y);
        if (below <= 0.001) discard;
        gl_FragColor = vec4(uColor, below);
      }
    `,
    transparent: true,
  });
  const mesh = new Mesh(DOME, material);
  mesh.scale.setScalar(20);
  return mesh;
}

/** Zenith to horizon to ground, as one dome. */
function gradientDome(spec: GradientEnv): Mesh {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new Color(spec.zenith) },
      uHorizon: { value: new Color(spec.horizon) },
      uGround: { value: new Color(spec.ground) },
      uSharpness: { value: spec.sharpness },
    },
    vertexShader: DOME_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      uniform float uSharpness;
      varying vec3 vDir;
      void main() {
        float y = normalize(vDir).y;
        float k = clamp(pow(abs(y), 1.0 / max(uSharpness, 0.05)), 0.0, 1.0);
        vec3 c = y >= 0.0 ? mix(uHorizon, uZenith, k) : mix(uHorizon, uGround, k);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const mesh = new Mesh(DOME, material);
  mesh.scale.setScalar(20);
  return mesh;
}

const DOME_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function disposeScene(scene: Scene): void {
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh !== true) return;
    // DOME is shared between builds and must outlive them.
    if (m.geometry !== DOME) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) for (const x of mat) x.dispose();
    else mat.dispose();
  });
}
