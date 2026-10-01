/**
 * The wash: colour laid under the drawing's lines, the way an illustrator
 * fills a pen drawing with pencil and watercolour (drawing.ts says what
 * the look is after).
 *
 * The scene is lit as usual, by the rig's lights and shadow, but every
 * painted material is TAUGHT three changes, all behind one shared switch
 * (`washOn`) so the same programs draw the lit look untouched when it is
 * off:
 *
 * - its paint is replaced by the drawing's palette (`washAlbedo`, one per
 *   material), generated from one main colour (`washColor`);
 * - the sun's light on a face is CEL-SHADED: the cosine that lights it is
 *   stepped into a few flat bands with softened edges, the way a wash is
 *   laid in a few tones rather than a gradient (`washRamp`);
 * - nothing shines. Metal, specular and reflection are all off: a wash has
 *   no highlights but the paper.
 *
 * Teaching is lazy and per material, on the first frame the wash sees it,
 * so materials made later (a detail rebuild, a stage of the build) are
 * taught as they appear. Each costs one recompile, once.
 */
import {
  Color,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Scene,
  ShaderChunk,
  SRGBColorSpace,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
} from "three";

/** Everything the wash's shading can be asked to change. */
export interface WashShading {
  /** Step the sun's light into bands; off is the plain cosine. */
  readonly cel: boolean;
  /** Tones the lit side is laid in, counting the unlit one: 2 is lit-or-not. */
  readonly bands: number;
  /** How far each step's edge is softened, 0 (a hard edge) to 1 (no steps left). */
  readonly softness: number;
  /**
   * The sun's own strength (its colour's luminance times its intensity):
   * what a fully lit face's light is measured against to say how lit it is.
   */
  readonly sun: number;
  /**
   * LIGHT AS A HUE, not only a value: a face is drawn toward `litTint` as
   * far as `litLift` where the sun reaches it in full, toward `shadeTint`
   * as far as `shadeLift` where it does not, and between the two by how
   * lit it is. sRGB hex.
   */
  readonly litTint: number;
  readonly shadeTint: number;
  readonly litLift: number;
  readonly shadeLift: number;
}

/**
 * What a material is, to the palette generator (`washColor`), set on its
 * `userData.washRole` by the host. Unset is paint: it keeps its relation to
 * the reference.
 */
export type WashRole = "paint" | "stone" | "glass" | "warm";

export interface Wash {
  /** Teach and colour every painted material in the scene. Every frame, before the wash renders. */
  prepare(scene: Scene): void;
  /** Turn the taught programs to the wash (true) or back to the lit look. */
  set(on: boolean): void;
  shade(spec: WashShading): void;
  /** The colour the palette is generated from. */
  paint(main: number): void;
}

/**
 * The colour the wash's palette is anchored at: the page's uprights'
 * paint. Every other paint keeps its relation to this one (`washColor`).
 */
export const WASH_REFERENCE = 0x6b4d3b;

const TAUGHT = "eiffelWash";

/**
 * A material's wash colour: its own paint, moved by however far the main
 * colour sits from the reference. Hue turns by the same angle; saturation
 * and lightness are re-anchored, each scaled toward 0 below the
 * reference's and toward 1 above it, so a paint a step lighter than the
 * iron stays a step lighter than the main colour, a pale stone stays pale,
 * and nothing is pushed past white. So the palette keeps every
 * relationship the lit look's was tuned for — the brown family's steps,
 * the stone against the iron, the glass a cool complement to it, the gilt
 * a warmer one — and one colour moves all of it.
 *
 * A ROLE overrides the relation where it would carry the wrong thing:
 * stone is a near-grey of the main colour, never its red; glass a pale
 * cool grey-blue whatever the main is; `warm` a pale cream-yellow a little
 * (22 degrees) round from it, the lit interior's colour of the illustrated cutaway.
 */
export function washColor(
  base: Color,
  main: Color,
  reference: Color,
  out = new Color(),
  role: WashRole = "paint",
): Color {
  // In sRGB, where the palette was chosen and where a step reads as one.
  const b = base.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const m = main.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const r = reference.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const turn = (d: number): number => (((m.h + d) % 1) + 1) % 1;
  if (role === "stone") return out.setHSL(turn(-0.02), 0.07, reanchor(b.l, r.l, m.l), SRGBColorSpace);
  if (role === "glass") return out.setHSL(0.56, 0.2, 0.74, SRGBColorSpace);
  if (role === "warm") return out.setHSL(turn(0.06), 0.6, 0.8, SRGBColorSpace);
  const h = (((m.h + b.h - r.h) % 1) + 1) % 1;
  return out.setHSL(h, reanchor(b.s, r.s, m.s), reanchor(b.l, r.l, m.l), SRGBColorSpace);
}

/** `v`'s place against `from`, carried to the same place against `to`, in [0, 1]. */
function reanchor(v: number, from: number, to: number): number {
  if (v <= from) return from <= 0 ? to : (to * v) / from;
  return from >= 1 ? to : to + ((v - from) / (1 - from)) * (1 - to);
}

/** Shared by every taught program: one write moves them all. */
const uniforms = {
  washOn: { value: 0 },
  washCel: { value: 1 },
  washBands: { value: 3 },
  washSoft: { value: 0.3 },
  washSun: { value: 1 },
  washLitTint: { value: new Color() },
  washShadeTint: { value: new Color() },
  washLitLift: { value: 0 },
  washShadeLift: { value: 0 },
};

const PARS = /* glsl */ `
uniform float washOn;
uniform float washCel;
uniform float washBands;
uniform float washSoft;
uniform vec3 washAlbedo;
uniform float washSun;
uniform vec3 washLitTint;
uniform vec3 washShadeTint;
uniform float washLitLift;
uniform float washShadeLift;

// How lit this fragment is by the sun, 0 to 1, after its bands and its
// shadow: written by the direct light, read once the light is summed.
float washLit = 0.0;

// The sun's cosine, stepped. Levels k / (bands - 1), k = 0 .. bands - 1,
// changing where the cosine crosses (k + 0.5) / (bands - 1), each change
// spread over \`washSoft\` of a step.
float washRamp(float x) {
  if (washOn < 0.5 || washCel < 0.5) return x;
  float steps = max(washBands - 1.0, 1.0);
  float q = x * steps + 0.5;
  float level = floor(q) + smoothstep(1.0 - max(washSoft, 0.001), 1.0, fract(q));
  return clamp(level / steps, 0.0, 1.0);
}
`;

/** The physical lighting chunk with the sun's cosine run through `washRamp`. */
const LIGHTS = (() => {
  const src = ShaderChunk.lights_physical_pars_fragment;
  const from = "vec3 irradiance = dotNL * directLight.color;";
  const at = src.indexOf(from);
  if (at < 0 || src.indexOf(from, at + 1) >= 0) {
    throw new Error(`eiffel wash: this three's lights_physical_pars_fragment has no single "${from}" to step (wash.ts)`);
  }
  return src.replace(
    from,
    `float washStep = washRamp(dotNL);
	washLit = max(washLit, washStep * dot(directLight.color, vec3(0.2126, 0.7152, 0.0722)) / max(washSun, 1e-4));
	vec3 irradiance = washStep * directLight.color;`,
  );
})();

function replaceOnce(src: string, from: string, to: string, what: string): string {
  const at = src.indexOf(from);
  if (at < 0 || src.indexOf(from, at + from.length) >= 0) {
    throw new Error(`eiffel wash: the ${what} has no single "${from}" to patch (wash.ts)`);
  }
  return src.slice(0, at) + to + src.slice(at + from.length);
}

/** The wash's edits to a physical fragment shader, still with its includes unresolved. */
export function washFragmentShader(src: string): string {
  let out = replaceOnce(src, "#include <lights_physical_pars_fragment>", `${PARS}\n${LIGHTS}`, "fragment shader");
  out = replaceOnce(
    out,
    "#include <color_fragment>",
    "#include <color_fragment>\n\tif (washOn > 0.5) diffuseColor.rgb = washAlbedo;",
    "fragment shader",
  );
  out = replaceOnce(
    out,
    "#include <metalnessmap_fragment>",
    "#include <metalnessmap_fragment>\n\tif (washOn > 0.5) { metalnessFactor = 0.0; roughnessFactor = 1.0; }",
    "fragment shader",
  );
  out = replaceOnce(
    out,
    "#include <lights_fragment_end>",
    "#include <lights_fragment_end>\n\tif (washOn > 0.5) { reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0); }",
    "fragment shader",
  );
  out = replaceOnce(
    out,
    "#include <opaque_fragment>",
    `if (washOn > 0.5) {
		float washK = clamp(washLit, 0.0, 1.0);
		outgoingLight = mix(outgoingLight, mix(washShadeTint, washLitTint, washK), mix(washShadeLift, washLitLift, washK));
	}
	#include <opaque_fragment>`,
    "fragment shader",
  );
  return out;
}

function teach(m: MeshStandardMaterial): void {
  const albedo = { value: new Color() };
  m.userData[TAUGHT] = albedo;
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms, { washAlbedo: albedo });
    shader.fragmentShader = washFragmentShader(shader.fragmentShader);
  };
  m.customProgramCacheKey = () => `${key()}|${TAUGHT}`;
  m.needsUpdate = true;
}

export function createWash(): Wash {
  const main = new Color(WASH_REFERENCE);
  const reference = new Color(WASH_REFERENCE);
  /** Each material's paint the last time its wash colour was worked out, and the main colour then. */
  const seen = new Map<Material, { base: number; main: number; role: WashRole }>();

  function colour(m: MeshStandardMaterial): void {
    const albedo = m.userData[TAUGHT] as { value: Color };
    const base = m.color.getHex();
    const role = (m.userData.washRole as WashRole | undefined) ?? "paint";
    const was = seen.get(m);
    if (was !== undefined && was.base === base && was.main === main.getHex() && was.role === role) return;
    seen.set(m, { base, main: main.getHex(), role });
    // A Color holds linear, which is what the shader wants.
    washColor(m.color, main, reference, albedo.value, role);
  }

  function visit(material: Material): void {
    // MeshPhysicalMaterial is one too.
    if (!(material instanceof MeshStandardMaterial)) return;
    if (material.userData[TAUGHT] === undefined) teach(material);
    colour(material);
  }

  return {
    prepare(scene) {
      scene.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh !== true || !mesh.visible) return;
        const own = mesh.material;
        if (Array.isArray(own)) for (const m of own) visit(m);
        else visit(own);
      });
    },
    set(on) {
      uniforms.washOn.value = on ? 1 : 0;
    },
    shade(spec) {
      uniforms.washCel.value = spec.cel ? 1 : 0;
      uniforms.washBands.value = spec.bands;
      uniforms.washSoft.value = spec.softness;
      uniforms.washSun.value = spec.sun;
      uniforms.washLitTint.value.setHex(spec.litTint);
      uniforms.washShadeTint.value.setHex(spec.shadeTint);
      uniforms.washLitLift.value = spec.litLift;
      uniforms.washShadeLift.value = spec.shadeLift;
    },
    paint(hex) {
      main.setHex(hex);
    },
  };
}
