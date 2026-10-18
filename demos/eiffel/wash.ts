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
export type WashRole = "paint" | "stone" | "glass" | "warm" | "under" | "gilt" | "own";

export interface Wash {
  /** Teach and colour every painted material in the scene. Every frame, before the wash renders. */
  prepare(scene: Scene): void;
  /** Turn the taught programs to the wash (true) or back to the lit look. */
  set(on: boolean): void;
  shade(spec: WashShading): void;
  /**
   * The colour the palette is generated from, whether it is all at that
   * colour's hue, and the floors', the names' and the floors' undersides'
   * lightness (`washColor`'s `warm`, `gilt` and `under`).
   */
  paint(main: number, mono?: boolean, warm?: number, gilt?: number, under?: number): void;
  /**
   * How far a material that keeps its own paint (role `own`: the flag) is
   * washed: 0 its own colours, untouched by the light's tints; 1 the paper,
   * tinted like the rest. Between, its paint goes that far toward `paper`
   * and takes that much of the tints.
   */
  ownWash(amount: number, paper: number): void;
}

/**
 * The colour the wash's palette is anchored at: the page's uprights'
 * paint. Every other paint keeps its relation to this one (`washColor`).
 */
export const WASH_REFERENCE = 0x6b4d3b;

const TAUGHT = "eiffelWash";

/**
 * A taught material's own uniforms. Kept here rather than on the
 * material, so a clone of a taught material (which copies its userData
 * but not its patch) is simply untaught, and is taught in its turn.
 */
interface Taught {
  readonly albedo: { value: Color };
  /** -1 keeps the material's own opacity. */
  readonly opacity: { value: number };
  /** 1 keeps the material's own paint (role `own`). */
  readonly own: { value: number };
}
const taught = new WeakMap<Material, Taught>();

/** The glass's opacity in the wash. */
const GLASS_OPACITY = 0.55;

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
 * (16 degrees) round from it, the lit interior's colour of the illustrated
 * cutaway; `under` the same hue as `warm` at a low saturation and its own
 * lightness, the floors' undersides, dark where the fit-out above is
 * light; `gilt` keeps the paint's relation in hue and saturation but
 * is set near the paper in lightness, so the gilded lettering reads as a
 * light band on the iron rather than another step of it;
 * `own` keeps the material's own paint and map (a flag's colours are its
 * own, not the tower's), shaded and tinted like the rest.
 *
 * A `gilt` past 1 is brighter than white: the colour at lightness 1, its
 * linear light scaled by `gilt`, so the names' faces the sun reaches only
 * in part still come out at or near the paper.
 *
 * MONO gives every generated colour the main colour's hue AND saturation,
 * keeping only its own lightness: the palette becomes one colour in steps
 * of value, so a grey main colour makes a grey palette. `own` is not
 * generated, and stays its own.
 */
export function washColor(
  base: Color,
  main: Color,
  reference: Color,
  out = new Color(),
  role: WashRole = "paint",
  mono = false,
  warm = WARM_LIGHTNESS,
  gilt = GILT_LIGHTNESS,
  under = UNDER_LIGHTNESS,
): Color {
  // In sRGB, where the palette was chosen and where a step reads as one.
  const b = base.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const m = main.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const r = reference.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  if (role === "gilt" && gilt > 1) {
    return washColor(base, main, reference, out, role, mono, warm, 1, under).multiplyScalar(gilt);
  }
  if (mono && role !== "own") {
    const l =
      role === "glass"
        ? 0.78
        : role === "warm"
          ? warm
          : role === "under"
            ? under
            : role === "gilt"
              ? gilt
              : reanchor(b.l, r.l, m.l);
    return out.setHSL(m.h, m.s, l, SRGBColorSpace);
  }
  const turn = (d: number): number => (((m.h + d) % 1) + 1) % 1;
  if (role === "stone") return out.setHSL(turn(-0.02), 0.07, reanchor(b.l, r.l, m.l), SRGBColorSpace);
  if (role === "own") return out.copy(base);
  if (role === "glass") return out.setHSL(0.56, 0.2, 0.78, SRGBColorSpace);
  if (role === "warm") return out.setHSL(turn(0.045), 0.5, warm, SRGBColorSpace);
  if (role === "under") return out.setHSL(turn(0.045), 0.15, under, SRGBColorSpace);
  const h = turn(b.h - r.h);
  const l = role === "gilt" ? gilt : reanchor(b.l, r.l, m.l);
  return out.setHSL(h, reanchor(b.s, r.s, m.s), l, SRGBColorSpace);
}

/**
 * The `warm` role's lightness (sRGB HSL): the floors' fit-out. A step
 * under the paper rather than at it, so a floor reads as a lit interior
 * and not as a gap in the drawing. The default of `washColor`'s `warm`,
 * which the drawing's Platform shade sets.
 */
export const WARM_LIGHTNESS = 0xc6 / 0xff; // #c6c6c6 under a grey main colour

/**
 * The `under` role's lightness (sRGB HSL): the 1st and 2nd floors'
 * undersides, near black, so a floor seen from under the tower reads as
 * the dark mass it is and not as the paper. The default of `washColor`'s
 * `under`, which the drawing's Underside shade sets.
 */
export const UNDER_LIGHTNESS = 0.15;

/** The `gilt` role's lightness (sRGB HSL; past 1, brighter than white): the gilded names. The default of `washColor`'s `gilt`, which the drawing's Names shade sets. */
export const GILT_LIGHTNESS = 0.92;

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
  washOwnWash: { value: 0 },
  washPaper: { value: new Color() },
};

const PARS = /* glsl */ `
uniform float washOn;
uniform float washCel;
uniform float washBands;
uniform float washSoft;
uniform vec3 washAlbedo;
uniform float washOpacity;
uniform float washOwn;
uniform float washSun;
uniform vec3 washLitTint;
uniform vec3 washShadeTint;
uniform float washLitLift;
uniform float washShadeLift;
uniform float washOwnWash;
uniform vec3 washPaper;

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
    "#include <color_fragment>\n\tif (washOn > 0.5) { if (washOwn < 0.5) diffuseColor.rgb = washAlbedo; else diffuseColor.rgb = mix(diffuseColor.rgb, washPaper, washOwnWash); if (washOpacity >= 0.0) diffuseColor.a = washOpacity; }",
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
    "#include <lights_fragment_end>\n\tif (washOn > 0.5) { reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0); }\n\t#ifdef USE_SHEEN\n\tif (washOn > 0.5) { sheenSpecularDirect = vec3(0.0); sheenSpecularIndirect = vec3(0.0); }\n\t#endif\n\t#ifdef USE_CLEARCOAT\n\tif (washOn > 0.5) { clearcoatSpecularDirect = vec3(0.0); clearcoatSpecularIndirect = vec3(0.0); }\n\t#endif",
    "fragment shader",
  );
  out = replaceOnce(
    out,
    "#include <opaque_fragment>",
    `if (washOn > 0.5) {
		float washK = clamp(washLit, 0.0, 1.0);
		// A material that keeps its own paint takes the tints as far as its own wash.
		float washTinted = mix(washShadeLift, washLitLift, washK) * (washOwn > 0.5 ? washOwnWash : 1.0);
		outgoingLight = mix(outgoingLight, mix(washShadeTint, washLitTint, washK), washTinted);
	}
	#include <opaque_fragment>`,
    "fragment shader",
  );
  return out;
}

function teach(m: MeshStandardMaterial): Taught {
  const state: Taught = { albedo: { value: new Color() }, opacity: { value: -1 }, own: { value: 0 } };
  taught.set(m, state);
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms, {
      washAlbedo: state.albedo,
      washOpacity: state.opacity,
      washOwn: state.own,
    });
    shader.fragmentShader = washFragmentShader(shader.fragmentShader);
  };
  m.customProgramCacheKey = () => `${key()}|${TAUGHT}`;
  m.needsUpdate = true;
  return state;
}

export function createWash(): Wash {
  const main = new Color(WASH_REFERENCE);
  const reference = new Color(WASH_REFERENCE);
  /** Each material's paint the last time its wash colour was worked out, and the main colour then. */
  let mono = false;
  let warm = WARM_LIGHTNESS;
  let gilt = GILT_LIGHTNESS;
  let under = UNDER_LIGHTNESS;
  const seen = new Map<
    Material,
    { base: number; main: number; role: WashRole; mono: boolean; warm: number; gilt: number; under: number }
  >();

  function colour(m: MeshStandardMaterial, state: Taught): void {
    const base = m.color.getHex();
    const role = (m.userData.washRole as WashRole | undefined) ?? "paint";
    const was = seen.get(m);
    if (
      was !== undefined &&
      was.base === base &&
      was.main === main.getHex() &&
      was.role === role &&
      was.mono === mono &&
      was.warm === warm &&
      was.gilt === gilt &&
      was.under === under
    )
      return;
    seen.set(m, { base, main: main.getHex(), role, mono, warm, gilt, under });
    // A Color holds linear, which is what the shader wants.
    washColor(m.color, main, reference, state.albedo.value, role, mono, warm, gilt, under);
    // A pane at the lit look's fifth is a pane the wash cannot show; the
    // drawing tints its glass plainly.
    state.opacity.value = role === "glass" ? GLASS_OPACITY : -1;
    state.own.value = role === "own" ? 1 : 0;
  }

  function visit(material: Material): void {
    // MeshPhysicalMaterial is one too.
    if (!(material instanceof MeshStandardMaterial)) return;
    colour(material, taught.get(material) ?? teach(material));
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
    ownWash(amount, paper) {
      uniforms.washOwnWash.value = amount;
      // A Color set from a hex holds linear, which is what the shader wants.
      uniforms.washPaper.value.setHex(paper);
    },
    paint(hex, all = false, floors = WARM_LIGHTNESS, names = GILT_LIGHTNESS, undersides = UNDER_LIGHTNESS) {
      main.setHex(hex);
      mono = all;
      warm = floors;
      gilt = names;
      under = undersides;
    },
  };
}
