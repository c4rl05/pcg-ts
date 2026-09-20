/**
 * A vignette, applied as light rather than as paint.
 *
 * WHERE IT SITS, which is the only interesting decision here. A real
 * vignette is a lens losing light toward the edge of the frame, so it
 * happens BEFORE the sensor and before anything tone-maps what the sensor
 * read. This pass runs in the composer's linear space, upstream of the
 * `OutputPass`, and is a plain multiply: the ACES curve then rolls the
 * darkened corners off the way it rolls off any other dark value. Put
 * after the tone map instead — on the sRGB image, which is where a
 * vignette is usually bolted on — the same multiply crushes the corners
 * flat, because it is scaling numbers that have already been compressed.
 *
 * The falloff is measured in CORNER RADII, not in pixels or in uv: the
 * distance from the centre is scaled by the aspect so the shape follows
 * the frame, then divided by the distance to the corner, which puts 0 at
 * the centre and exactly 1 in each corner whatever the window is. A
 * vignette specified in uv is a different picture on a phone and on a
 * 21:9 monitor; this one is the same picture.
 */
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/** How much light the corners lose, and where the loss starts. */
export interface VignetteSpec {
  readonly on: boolean;
  /**
   * The fraction of the light the extreme corner loses, in LINEAR terms.
   * It reads as far less than it sounds: the multiply happens before the
   * tone map, so 0.45 — most of a stop — lands as a corner about a fifth
   * darker in the finished image. Measured by eye against a flat sky,
   * which is where a vignette shows first: 0.25 was invisible, 0.45 is
   * seen without being looked for, 0.65 is a vignette you would name.
   */
  readonly amount: number;
  /**
   * Where the falloff begins, as a fraction of the corner radius. 0 darkens
   * from the centre out; 1 would be a hard edge in the corner itself.
   */
  readonly start: number;
}

export const VIGNETTE_DEFAULT: VignetteSpec = { on: false, amount: 0.45, start: 0.4 };

/**
 * The pass. `aspect` is a uniform rather than something read from the
 * buffer because a pass is not told its own size until `setSize`, and the
 * first frame would be drawn with a square frame's vignette.
 */
export function createVignette(width: number, height: number): ShaderPass {
  const pass = new ShaderPass({
    name: "VignetteShader",
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: VIGNETTE_DEFAULT.amount },
      start: { value: VIGNETTE_DEFAULT.start },
      aspect: { value: width / Math.max(height, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float amount;
      uniform float start;
      uniform float aspect;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        // Distance from the centre in frame-shaped units, over the
        // distance to the corner: 0 in the middle, 1 in every corner.
        vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
        float r = length(d) / length(vec2(aspect, 1.0) * 0.5);
        float falloff = amount * smoothstep(start, 1.0, r);
        gl_FragColor = vec4(texel.rgb * (1.0 - falloff), texel.a);
      }
    `,
  });
  return pass;
}

/** Push a spec onto the pass. */
export function applyVignette(pass: ShaderPass, spec: VignetteSpec): void {
  pass.enabled = spec.on && spec.amount > 0;
  pass.uniforms.amount.value = spec.amount;
  pass.uniforms.start.value = spec.start;
}

/** Tell the pass the shape of the frame. */
export function sizeVignette(pass: ShaderPass, width: number, height: number): void {
  pass.uniforms.aspect.value = width / Math.max(height, 1);
}
