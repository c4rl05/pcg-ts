/**
 * Flat paint: a colour that reaches the screen exactly as it was given;
 * and the keep mark (`teachKeep`), which the page's highlights wear.
 *
 * WHY IT TAKES TWO EDITS. An unlit material is not enough on this page.
 * Everything the scene draws lands in the composer's linear buffer, and
 * three applies neither a material's `toneMapped` nor its own tone map
 * there: the rig's `OutputPass` tone maps the whole frame at once, and
 * ACES mixes the channels before it compresses them, so a linear (1, 0, 0)
 * comes out an orange-red with green in it, darker or lighter with the
 * look's exposure. Upstream of that the occlusion multiplies every pixel
 * by its AO and the vignette by its falloff. So a flat surface MARKS its
 * pixels — alpha -1, which nothing else in the frame writes (the scene is
 * opaque at alpha 1, the glass blends toward it, and every pass between
 * carries alpha through: the AO blend multiplies it by its denoised 1, the
 * vignette copies it) — and the output pass, reading a marked pixel,
 * skips the tone map and writes its colour back at full value.
 *
 * WHAT "FULL VALUE" COSTS. The AO and the vignette are multiplies, so a
 * marked pixel arrives as its colour times some k in (0, 1]; the pass
 * divides by the brightest channel. That restores a colour whose
 * brightest channel is 1 exactly, and no other: flat paint is a hue at
 * full value, which is what a marker colour is. (A pixel seen through a
 * see-through pane is the pane blended over the paint, and comes out the
 * blend brightened, which is honest: there is glass in front of it.)
 *
 * Like the page's other shader edits, each anchor is asserted: a three
 * that rewords one is caught at load ({@link flatShaderProblem}) and the
 * page offers no highlight, rather than tone mapping the paint quietly.
 */
import {
  DoubleSide,
  type Material,
  MeshBasicMaterial,
  ShaderLib,
  type WebGLProgramParametersWithUniforms,
  type WebGLRenderer,
} from "three";
import type { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OutputShader } from "three/addons/shaders/OutputShader.js";

/** Marks a flat material's program. */
const FLAT_KEY = "flatPaint";
/** Marks a kept material's program (see {@link teachKeep}). */
const KEEP_KEY = "keepMark";

/** The mark: after everything the fragment shader does, the alpha the output pass looks for. */
const MARK: readonly [string, string] = ["#include <dithering_fragment>", "#include <dithering_fragment>\n\tgl_FragColor.a = -1.0;"];

/** Replace `anchor`, which must appear exactly once, or say which shader lost it (throws). */
function replaceOnce(src: string, anchor: string, to: string, what: string): string {
  const at = src.indexOf(anchor);
  if (at < 0 || src.indexOf(anchor, at + anchor.length) >= 0) {
    throw new Error(
      `flat paint: ${what} has ${at < 0 ? "no" : "more than one"} "${anchor}"; re-read three's ` +
        `shaders and update demos/eiffel/flat.ts.`,
    );
  }
  return src.slice(0, at) + to + src.slice(at + anchor.length);
}

/** A fragment shader taught to mark its pixels flat. */
export function flatFragmentShader(src: string): string {
  return replaceOnce(src, MARK[0], MARK[1], "the material's fragment shader");
}

/**
 * Teach `m` the mark, on top of whatever edit it already carries (the
 * packed rivets' vertex shader, rivetPack.ts), so one material can be
 * both.
 */
export function teachFlat<M extends Material>(m: M): M {
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before.call(m, shader, renderer);
    shader.fragmentShader = flatFragmentShader(shader.fragmentShader);
  };
  m.customProgramCacheKey = () => `${key()}|${FLAT_KEY}`;
  m.needsUpdate = true;
  return m;
}

/**
 * THE KEEP MARK: alpha -2, a pixel that is to be KEPT whole under the
 * drawing's ghost (ink.ts) but is otherwise any lit pixel — tone mapped as
 * usual, its colour left alone. A highlight wears it in the drawing, where
 * the rest of the tower fades and it does not. Taught on top of whatever
 * edit `m` already carries, behind a switch, `on.value` 1 or 0, so a
 * material wears it only while its highlight is on: the mark is the
 * fragment's alpha, which a blended material blends with, so it is never
 * on while `m` is `transparent`.
 */
export function teachKeep<M extends Material>(m: M, on: { value: number }): M {
  const before = m.onBeforeCompile;
  const key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before.call(m, shader, renderer);
    shader.uniforms.keepMark = on;
    shader.fragmentShader = `uniform float keepMark;
${keepFragmentShader(shader.fragmentShader)}`;
  };
  m.customProgramCacheKey = () => `${key()}|${KEEP_KEY}`;
  m.needsUpdate = true;
  return m;
}

/** A fragment shader taught the keep mark, behind its `keepMark` switch. */
function keepFragmentShader(src: string): string {
  return replaceOnce(src, MARK[0], `${MARK[0]}
	if ( keepMark > 0.5 ) gl_FragColor.a = -2.0;`, "the material's fragment shader");
}

/**
 * Unlit paint in `color`, both faces, no fog, not yet marked: what
 * {@link teachFlat} marks, after any other edit it takes first (a clone
 * does not carry an edit over, so an edit that clones goes first).
 */
export function unlitMaterial(color: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ color, side: DoubleSide, fog: false, toneMapped: false });
}

/**
 * Unlit paint in `color`, marked flat. Its colour's brightest channel
 * should be 1 (see the file's note).
 */
export function flatMaterial(color: number): MeshBasicMaterial {
  return teachFlat(unlitMaterial(color));
}

/** The output pass's three edits: where a marked pixel is caught (a kept one let through), and the tone map it skips. */
const OUTPUT_EDITS: ReadonlyArray<readonly [string, string]> = [
  [
    "gl_FragColor = texture2D( tDiffuse, vUv );",
    `gl_FragColor = texture2D( tDiffuse, vUv );
			// The keep mark (-2) is lit paint: drop it and draw as usual.
			if ( gl_FragColor.a < -1.5 ) gl_FragColor.a = 1.0;
			bool flatPaint = gl_FragColor.a < 0.0;
			if ( flatPaint ) gl_FragColor = vec4( gl_FragColor.rgb / max( max( gl_FragColor.r, gl_FragColor.g ), max( gl_FragColor.b, 1e-6 ) ), 1.0 );`,
  ],
  ["// tone mapping", "if ( !flatPaint ) {"],
  ["// color space", "}"],
];

function outputShader(src: string): string {
  let out = src;
  for (const [anchor, to] of OUTPUT_EDITS) out = replaceOnce(out, anchor, to, "three's OutputShader");
  return out;
}

/**
 * Whether this three's shaders take the edits — the basic material's mark,
 * the standard material's keep mark and the output pass's catch — asked once at load the way rivetPack.ts'
 * `packedShaderProblem` asks of its own: `undefined` when they do, else
 * why not, and the page offers no highlight rather than failing to draw.
 */
export function flatShaderProblem(): string | undefined {
  try {
    flatFragmentShader(ShaderLib.basic.fragmentShader);
    keepFragmentShader(ShaderLib.standard.fragmentShader);
    outputShader(OutputShader.fragmentShader);
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Teach the rig's output pass to pass flat paint through: a pixel with
 * no mark takes exactly the path it took before, so a frame with no flat
 * paint in it is the frame the stock pass drew. Where this three's shaders
 * would not take the edits ({@link flatShaderProblem}) the pass is left
 * stock: the page must still draw, and it offers no highlight then.
 */
export function passFlat(pass: OutputPass): void {
  if (flatShaderProblem() !== undefined) return;
  const material = pass.material as { fragmentShader: string; needsUpdate: boolean };
  material.fragmentShader = outputShader(material.fragmentShader);
  material.needsUpdate = true;
}
