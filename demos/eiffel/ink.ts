/**
 * The drawing: the tower as a pen elevation, black lines on white paper,
 * no light and no shade (`?ink`).
 *
 * HOW. One prepass draws every visible surface's VIEW-SPACE NORMAL into a
 * colour target, with its depth kept in a depth texture beside it. A
 * full-screen pass then inks a pixel where either buffer breaks:
 *
 * - a CONTOUR where the depth jumps: this pixel is nearer than the line
 *   through its two neighbours on some axis. Measured in INVERSE depth,
 *   which is affine across a plane in screen space, so a plane seen at a
 *   grazing angle has no second difference at all and never inks, however
 *   steeply its depth runs. And one-sided: only the NEAR side of a jump
 *   inks, so a silhouette is one line, on the member, not two astride it.
 *   A member thinner than the kernel is near on both sides and inks whole,
 *   which is what a pen does with it too.
 * - a CREASE where the normal turns: this pixel's normal and a forward
 *   neighbour's differ by more than the threshold angle. Forward only (+x,
 *   +y, one diagonal), so a crease is one line, not one each side of it.
 *
 * EDGES ARE RESOLVED, not stepped. Both buffers and the edge mask are
 * drawn SUPERSAMPLED (up to `supersample` times the canvas each way, inside
 * a pixel budget), and the mask comes down to the canvas through a small
 * Gaussian (`soften`, its sigma in canvas pixels) read with bilinear taps.
 * The first is the antialiasing — a line's coverage of a canvas pixel is
 * measured, not guessed — and the second is the pen: a line that fades at
 * its edges instead of stopping at a pixel's.
 *
 * COLOUR, when the host hands one over (`render(color)`: the lit scene in
 * the wash's palette, wash.ts), is laid under the lines rather than the
 * paper: paled toward the paper and calmed (`WashComposite`), and only
 * where the prepass drew something, so the background, the sky and the
 * glass seen against it all stay paper. That coverage is the mask's second
 * channel, resolved through the same Gaussian as the line, so a member's
 * colour ends exactly where its line does.
 *
 * Paper is where nothing was drawn. Nothing see-through is drawn — a pane
 * would stand in for the members behind it, exactly as in the occlusion's
 * prepass (gtao.ts) — and neither is anything the host asks to hide (the
 * ground: an elevation stands on the paper, not on a plane receding to a
 * horizon).
 *
 * DEPTH. The page runs a logarithmic depth buffer; gtao.ts says why and
 * derives the inverse used here, `viewZ = -(exp2(d * log2(1 + far)) - 1)`.
 */
import {
  Color,
  DepthTexture,
  DoubleSide,
  FloatType,
  LinearFilter,
  type Material,
  type Mesh,
  MeshNormalMaterial,
  NearestFilter,
  NoBlending,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  ShaderMaterial,
  type Side,
  SRGBColorSpace,
  type Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { seeThrough } from "./gtao.js";

/** Everything the drawing can be asked to change. */
export interface InkSpec {
  /**
   * Line weight, in DEVICE pixels of the canvas: the kernel's reach. It is
   * always a whole number of SUPERSAMPLED pixels — at a half one the
   * nearest-filtered taps land on texel edges and resolve asymmetrically,
   * and the chord test then inks grazing planes — so the scale is chosen to
   * make it one (`fit`).
   */
  readonly width: number;
  /**
   * Most the buffers are enlarged by, each way. Held under `PIXEL_BUDGET`
   * too, so a large high-density canvas gets less than this, never a
   * buffer the device cannot allocate. 1 turns the antialiasing off.
   */
  readonly supersample: number;
  /** The resolve's Gaussian sigma, in canvas pixels. Near 0 is a hard line. */
  readonly soften: number;
  /**
   * Gain on the resolved coverage. Softening spreads a hairline over more
   * pixels at a lower peak; this puts the ink back.
   */
  readonly strength: number;
  /** Angle between neighbouring normals that inks a crease, in degrees. */
  readonly creaseDegrees: number;
  /**
   * Relative dip in inverse depth that inks a contour: 0.02 inks a step of
   * about 2% of the distance to it.
   */
  readonly contour: number;
  readonly ink: number;
  readonly paper: number;
  /**
   * The line lightens with distance, from full at `fadeNear` metres to
   * `fadeFloor` of itself at `fadeFar`: a lattice seen whole is a mass of
   * edges a few pixels apart, and drawn at full weight it reads as a dark
   * shape rather than as a drawing of one. `fadeFloor` 1 is no fade.
   */
  readonly fadeNear: number;
  readonly fadeFar: number;
  readonly fadeFloor: number;
  /**
   * The fade's curve between `fadeNear` and `fadeFar`: what is left of the
   * line at `t` of the way out is `(e^(k (1 - t)) - 1) / (e^k - 1)`, `k`
   * this. So coming in from far the line arrives slowly and then quickly
   * as `fadeNear` nears; 0 is a straight line.
   */
  readonly fadeCurve: number;
  /**
   * A HIERARCHY of lines, each a fraction of the silhouette's full weight:
   * `inner` for a contour with something drawn on both sides of it (a bar
   * in front of a bar), `crease` for a fold. 1 and 1 is the plain pen,
   * every line alike.
   */
  readonly inner: number;
  readonly crease: number;
  /**
   * A gap narrower than this, in canvas pixels, is outlined at the inner
   * contours' weight rather than as a silhouette: the paper glimpsed
   * between the bars of a lattice is a gap in it, and ringed at full
   * weight a dense lattice reads as a perforated sheet. 0 outlines every
   * gap as a silhouette.
   */
  readonly gap: number;
  /**
   * How far a far line takes the colour under it rather than the ink's,
   * 0 to 1, by the same distance as the fade: a faded grey line over a
   * rose wash greys the whole lattice, where a darker rose keeps it rose.
   * Only over a colour.
   */
  readonly farTint: number;
  /**
   * How much darker the colour goes where the lines have faded, 0 to 1,
   * in proportion to how much of the line the fade took (none with
   * `fadeFloor` 1). The lines are a share of a lattice's tone: faded with
   * nothing in their place, the tower pales as the camera backs off, the
   * way fog would, and 0.12 puts back about what a near view's lines carry.
   * Only over a colour.
   */
  readonly farFill: number;
}

/**
 * Depth fade: how far the farthest of what is drawn is paled toward the
 * paper, 0 to 1, lines and colour together. It runs over the depth range
 * the host gives each frame (`Ink.hazeRange`), none at its near end and
 * all of `amount` at its far one, along an exponential: `(e^(k t) - 1) /
 * (e^k - 1)` of the way through the range at `t`, `k` the `falloff`. So the
 * near half barely pales and the far end goes most of the way; 0 is a
 * straight line. A drawing pales the planes it sets back, where light
 * would darken them.
 */
export interface Haze {
  readonly amount: number;
  readonly falloff: number;
}

/** What the composite does to the colour on the way to the paper (see the file's note). */
export interface WashComposite {
  /** How far toward the paper, 0 to 1. */
  readonly lift: number;
  /** 1 keeps the colour's saturation, 0 is grey. */
  readonly saturation: number;
}

export const INK_DEFAULT: InkSpec = {
  width: 1,
  supersample: 2,
  soften: 0.45,
  strength: 1,
  creaseDegrees: 30,
  contour: 0.02,
  ink: 0x111111,
  paper: 0xffffff,
  fadeNear: 150,
  fadeFar: 600,
  fadeFloor: 1,
  fadeCurve: 0,
  inner: 1,
  crease: 1,
  gap: 0,
  farTint: 0,
  farFill: 0,
};

/**
 * Most supersampled pixels the buffers may hold: a 4K canvas at 2x. Twelve
 * bytes each (8-bit normals, float depth, 8-bit mask), so about 430 MB at
 * the cap. Generous on purpose: a line is only exactly `width` wide at a
 * whole ratio to it (see `fit`), so for the default 1 px pen a canvas the
 * budget holds under 2x draws at 1x, with no antialiasing but the resolve's.
 */
const PIXEL_BUDGET = 36_000_000;

export interface Ink {
  /** Draw to the canvas: lines on paper, or over `color` (linear, the canvas' size) when given. */
  render(color?: Texture): void;
  /** How `color` is laid under the lines; null draws on bare paper even when one is given. */
  composite(spec: WashComposite | null): void;
  /** Pale what is far off (`Haze`); null for none. */
  haze(spec: Haze | null): void;
  /** The depths in metres along the view axis the haze runs between, every frame it is on. */
  hazeRange(near: number, far: number): void;
  /**
   * Lay the ground's shadow on the paper in `colour`, null for none. The
   * shadow comes in the colour handed to `render`: off the drawn surfaces
   * it holds the shadow's strength, 0 to 1 (rig.ts' shadow catcher).
   */
  groundShadow(colour: number | null): void;
  /**
   * Under a coloured drawing, everything but the flat-painted and kept
   * pixels (flat.ts' marks, carried in the colour's alpha: the page's
   * highlights wear the keep mark) laid on the paper at `opacity`, lines
   * and colour alike, and the lines over a flat pixel at it too, so a
   * highlight seen through the tower keeps its colour. A kept pixel keeps
   * its lines, which are its own. 1 is none, and the plain pen never has it.
   */
  ghost(opacity: number): void;
  /**
   * The meshes drawn OVER the rest (the page's highlights, which a depth
   * clear puts over the tower), or null for none. The prepass draws them
   * as a layer of their own, read wherever it drew something, so the rest
   * keeps its own depth under them: its lines, its haze and its fade. One
   * prepass with the clear in it would leave the rest no depth at all,
   * which reads as nothing drawn.
   */
  over(test: ((mesh: Mesh) => boolean) | null): void;
  setSize(width: number, height: number): void;
  apply(spec: InkSpec): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  #include <packing>
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform sampler2D tNormalOver;
  uniform sampler2D tDepthOver;
  uniform float useOver;
  uniform vec2 texel;
  uniform float width;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float creaseCos;
  uniform float contour;
  uniform vec3 fade;
  uniform float fadeCurve;
  uniform float inner;
  uniform float creaseWeight;
  uniform vec2 hazeRange;
  uniform float hazeFalloff;
  uniform float gap;
  varying vec2 vUv;

  // The depth of the layer drawn over the rest (\`over\`): 1 where it has nothing.
  float overDepth(vec2 uv) {
    return useOver > 0.5 ? texture2D(tDepthOver, uv).x : 1.0;
  }

  // 1 / (distance along the view axis); 0 where nothing was drawn.
  float invDepth(vec2 uv) {
    float o = overDepth(uv);
    float d = o < 1.0 ? o : texture2D(tDepth, uv).x;
    if (d >= 1.0) return 0.0;
    #ifdef LOG_DEPTH
      return 1.0 / (exp2(d * log2(cameraFar + 1.0)) - 1.0);
    #else
      return -1.0 / perspectiveDepthToViewZ(d, cameraNear, cameraFar);
    #endif
  }

  vec3 normalAt(vec2 uv) {
    vec3 n = overDepth(uv) < 1.0 ? texture2D(tNormalOver, uv).xyz : texture2D(tNormal, uv).xyz;
    return normalize(n * 2.0 - 1.0);
  }

  // How far past the threshold this pixel's depth sits above the chord
  // through a and b (both in inverse depth), 0 when it does not.
  float dip(float c, float a, float b) {
    float e = (2.0 * c - a - b) / c;
    return smoothstep(contour, 2.0 * contour, e);
  }

  // The contour test along one axis. A tap off the frame would clamp to
  // the border texel, which bends the chord and inks a band round the
  // frame; an axis that leaves the frame is simply not asked.
  float axis(float c, vec2 d) {
    vec2 a = vUv - d;
    vec2 b = vUv + d;
    if (any(lessThan(min(a, b), vec2(0.0))) || any(greaterThan(max(a, b), vec2(1.0)))) return 0.0;
    float ia = invDepth(a);
    float ib = invDepth(b);
    // A silhouette has paper on one side; anything else is an inner
    // contour. And paper with something drawn again a gap's width past it
    // is a gap, not an outside.
    if (ia > 0.0 && ib > 0.0) return dip(c, ia, ib) * inner;
    vec2 across = d / width * gap;
    vec2 beyond = ia == 0.0 ? vUv - across : vUv + across;
    bool small = gap > 0.0 && all(greaterThanEqual(beyond, vec2(0.0))) && all(lessThanEqual(beyond, vec2(1.0)))
      && invDepth(beyond) > 0.0;
    return dip(c, ia, ib) * (small ? inner : 1.0);
  }

  float crease(vec3 n, vec2 at, float c) {
    float o = invDepth(at);
    if (o == 0.0) return 0.0;
    // A neighbour across a contour is not a crease of this surface.
    if (abs(o - c) / c > 4.0 * contour) return 0.0;
    float cosine = dot(n, normalAt(at));
    return creaseWeight * (1.0 - smoothstep(creaseCos - 0.15, creaseCos, cosine));
  }

  void main() {
    float c = invDepth(vUv);
    // Nothing drawn: no line, and no coverage (green, 1 below).
    if (c == 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    float dist = 1.0 / c;
    float fadeT = clamp((dist - fade.x) / (fade.y - fade.x), 0.0, 1.0);
    float far = fadeCurve < 1e-3 ? fadeT : 1.0 - (exp(fadeCurve * (1.0 - fadeT)) - 1.0) / (exp(fadeCurve) - 1.0);
    vec2 dx = vec2(texel.x * width, 0.0);
    vec2 dy = vec2(0.0, texel.y * width);
    float line = 0.0;
    line = max(line, axis(c, dx));
    line = max(line, axis(c, dy));
    line = max(line, axis(c, dx + dy));
    line = max(line, axis(c, dx - dy));
    vec3 n = normalAt(vUv);
    line = max(line, crease(n, vUv + dx, c));
    line = max(line, crease(n, vUv + dy, c));
    line = max(line, crease(n, vUv + dx + dy, c));
    line *= mix(1.0, fade.z, far);
    // Red the line, green the coverage, blue how far into the haze's
    // range, alpha how far off for the fade.
    float t = clamp((dist - hazeRange.x) / (hazeRange.y - hazeRange.x), 0.0, 1.0);
    float hazed = hazeFalloff < 1e-3 ? t : (exp(hazeFalloff * t) - 1.0) / (exp(hazeFalloff) - 1.0);
    gl_FragColor = vec4(line, 1.0, hazed, far);
  }
`;

/**
 * The mask down to the canvas: a 5x5 Gaussian whose taps sit 0.75 sigma
 * apart, so it spans 1.5 sigma each way whatever the sigma. Each tap is
 * bilinear over the supersampled mask, so even at sigma near 0 a canvas
 * pixel averages the samples under it.
 */
const RESOLVE = /* glsl */ `
  uniform sampler2D tEdge;
  uniform sampler2D tColor;
  uniform float useColor;
  uniform float lift;
  uniform float saturation;
  uniform float hazeAmount;
  uniform float farTint;
  uniform float farFill;
  uniform float shadowOn;
  uniform vec3 shadowColour;
  uniform float ghost;
  uniform vec2 texel;
  uniform float sigma;
  uniform float strength;
  uniform vec3 ink;
  uniform vec3 paper;
  varying vec2 vUv;

  vec3 toSRGB(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }

  void main() {
    vec4 sum = vec4(0.0);
    float total = 0.0;
    for (int j = -2; j <= 2; j++) {
      for (int i = -2; i <= 2; i++) {
        vec2 k = vec2(float(i), float(j)) * 0.75;
        float w = exp(-0.5 * dot(k, k));
        sum += w * texture2D(tEdge, vUv + k * sigma * texel);
        total += w;
      }
    }
    float coverage = min(1.0, strength * sum.x / total);
    vec3 base = paper;
    vec3 pen = ink;
    float flatPaint = 0.0;
    float keptPaint = 0.0;
    if (useColor > 0.5) {
      vec4 texel4 = texture2D(tColor, vUv);
      vec3 raw = texel4.rgb;
      flatPaint = step(texel4.a, -0.5);
      // Kept (flat.ts' keep mark, -2): lit paint, kept whole under the ghost.
      keptPaint = step(texel4.a, -1.5);
      // A flat pixel at full value, as the lit look's output pass gives it
      // (flat.ts): the occlusion of the iron in front multiplied it down.
      raw = mix(raw, raw / max(max(raw.r, raw.g), max(raw.b, 1e-6)), flatPaint - keptPaint);
      vec3 c = toSRGB(raw);
      c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
      c = mix(c, paper, lift);
      // Blue and alpha are only written where something was drawn, so
      // they are averaged over the coverage, not over the kernel.
      float drawn = max(sum.y, 1e-4);
      float far = sum.w / drawn;
      // The tone the faded lines took with them, put back in the colour.
      c *= 1.0 - farFill * far;
      pen = mix(ink, c * 0.62, farTint * far);
      // Off the drawn surfaces the colour is the ground's shadow strength.
      vec3 ground = mix(paper, shadowColour, shadowOn * clamp(raw.g, 0.0, 1.0));
      base = mix(ground, c, sum.y / total);
    }
    // The haze over the line and the colour together, so the farthest of
    // the drawing goes into the paper rather than leaving its lines on it.
    // Averaged over the coverage too, as above.
    float hazed = hazeAmount * sum.z / max(sum.y, 1e-4);
    // The ghost: a flat pixel keeps its colour under faded lines, a kept
    // one its lines too (they are its own: it is drawn over the tower), the
    // rest of the drawing fades whole. With no ghost (1) all are no change.
    coverage *= mix(1.0, ghost, flatPaint - keptPaint);
    vec3 drawn = mix(mix(base, pen, coverage), paper, hazed);
    gl_FragColor = vec4(mix(mix(paper, drawn, ghost), drawn, flatPaint), 1.0);
  }
`;

/** Written straight to the canvas, so colours go in as the sRGB they are named in. */
function srgb(hex: number): Color {
  const c = new Color();
  c.setHex(hex);
  const out = { r: 0, g: 0, b: 0 };
  c.getRGB(out, SRGBColorSpace);
  return new Color(out.r, out.g, out.b);
}

/** A normals target with its depth as a texture, both read texel for texel. */
function normalsTarget(width: number, height: number): WebGLRenderTarget {
  // 8-bit normals: the finest step is about half a degree, and a crease is
  // tens of degrees.
  return new WebGLRenderTarget(width, height, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthTexture: new DepthTexture(width, height, FloatType),
  });
}

/**
 * @param hidden what the drawing leaves off the paper besides glass,
 *   asked every frame (the host's ground).
 */
export function createInk(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  hidden: () => readonly Object3D[],
): Ink {
  const target = normalsTarget(width, height);
  const depthTexture = target.depthTexture as DepthTexture;
  // The layer over the rest (`over`), made the first time one is drawn.
  let overTarget: WebGLRenderTarget | null = null;
  let overTest: ((mesh: Mesh) => boolean) | null = null;
  // What each layer's prepass leaves off: the over layer's meshes, or all but them.
  const under = (mesh: Mesh): boolean => overTest !== null && overTest(mesh);
  const over = (mesh: Mesh): boolean => overTest !== null && !overTest(mesh);
  // The mask is read BETWEEN its texels on the way down, so it filters.
  const edges = new WebGLRenderTarget(width, height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });

  // Double-sided, as the painted iron is: an open section seen from inside
  // has no front face to draw, and would print as a hole in the paper.
  const normals = new MeshNormalMaterial({ side: DoubleSide });
  normals.blending = NoBlending;

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: renderer.capabilities.logarithmicDepthBuffer ? { LOG_DEPTH: "" } : {},
    uniforms: {
      tNormal: { value: target.texture },
      tDepth: { value: depthTexture },
      // The base layer's own until an over layer is made: never read then.
      tNormalOver: { value: target.texture },
      tDepthOver: { value: depthTexture },
      useOver: { value: 0 },
      texel: { value: new Vector2(1 / width, 1 / height) },
      width: { value: 1 },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      creaseCos: { value: 0 },
      contour: { value: 0 },
      fade: { value: new Vector3() },
      fadeCurve: { value: 0 },
      inner: { value: 1 },
      creaseWeight: { value: 1 },
      hazeRange: { value: new Vector2(1e9, 2e9) },
      hazeFalloff: { value: 0 },
      gap: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
    // All four channels are data (see main()), not a colour to blend.
    blending: NoBlending,
  });
  const quad = new FullScreenQuad(material);

  const resolveMaterial = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: RESOLVE,
    uniforms: {
      tEdge: { value: edges.texture },
      tColor: { value: null },
      useColor: { value: 0 },
      lift: { value: 0 },
      saturation: { value: 1 },
      hazeAmount: { value: 0 },
      farTint: { value: 0 },
      farFill: { value: 0 },
      shadowOn: { value: 0 },
      shadowColour: { value: new Color() },
      ghost: { value: 1 },
      texel: { value: new Vector2(1 / width, 1 / height) },
      sigma: { value: 0 },
      strength: { value: 1 },
      ink: { value: new Color() },
      paper: { value: new Color() },
    },
    depthTest: false,
    depthWrite: false,
  });
  const resolveQuad = new FullScreenQuad(resolveMaterial);

  let spec = INK_DEFAULT;
  let wash: WashComposite | null = null;
  let haze: Haze | null = null;
  let canvas = { width, height };

  /** Size the buffers for the canvas and the spec, and every uniform that follows from the scale. */
  function fit(): void {
    const { width: w, height: h } = canvas;
    // The most the budget and the spec allow, then down to where the line
    // is a whole number of supersampled pixels: the kernel's reach must be
    // whole (see `width`), and rounding the reach instead of the scale
    // swings the line's weight by a third as the canvas is resized.
    const most = Math.max(1, Math.min(spec.supersample, Math.sqrt(PIXEL_BUDGET / (w * h))));
    const reach = Math.max(1, Math.floor(spec.width * most));
    const scale = Math.max(1, Math.min(most, reach / spec.width));
    const sw = Math.round(w * scale);
    const sh = Math.round(h * scale);
    target.setSize(sw, sh);
    overTarget?.setSize(sw, sh);
    edges.setSize(sw, sh);
    (material.uniforms.texel.value as Vector2).set(1 / sw, 1 / sh);
    material.uniforms.width.value = reach;
    // In supersampled texels, which is what `axis` steps in.
    material.uniforms.gap.value = spec.gap * scale;
    (resolveMaterial.uniforms.texel.value as Vector2).set(1 / w, 1 / h);
    // At a small sigma every tap sits at the pixel's centre and one bilinear
    // read covers 2x2 texels: above 2x that is no longer the whole pixel,
    // so the sigma is held wide enough to reach across it.
    resolveMaterial.uniforms.sigma.value = Math.max(0.01, spec.soften, (0.5 * (scale - 2)) / scale);
  }

  function apply(next: InkSpec): void {
    spec = next;
    material.uniforms.creaseCos.value = Math.cos((spec.creaseDegrees * Math.PI) / 180);
    material.uniforms.contour.value = spec.contour;
    (material.uniforms.fade.value as Vector3).set(spec.fadeNear, spec.fadeFar, spec.fadeFloor);
    material.uniforms.fadeCurve.value = spec.fadeCurve;
    material.uniforms.inner.value = spec.inner;
    material.uniforms.creaseWeight.value = spec.crease;
    resolveMaterial.uniforms.farTint.value = spec.farTint;
    // The shader's `far` is how far through the fade, not how much of the
    // line it took: with no fade there is no tone to put back.
    resolveMaterial.uniforms.farFill.value = spec.farFill * (1 - spec.fadeFloor);
    const r = resolveMaterial.uniforms;
    r.strength.value = spec.strength;
    (r.ink.value as Color).copy(srgb(spec.ink));
    (r.paper.value as Color).copy(srgb(spec.paper));
    fit();
  }
  apply(INK_DEFAULT);

  const swapped: Array<[Mesh, Material | Material[]]> = [];
  const hid: Object3D[] = [];
  /** Stand-ins made double-sided for the prepass, with the side each had. */
  const sided = new Map<Material, Side>();
  const clear = new Color();

  /** Draw the prepass into `into`: every mesh but the see-through and what `leave` names. */
  function prepass(into: WebGLRenderTarget, leave: (mesh: Mesh) => boolean): void {
    for (const o of hidden()) {
      if (o.visible) {
        o.visible = false;
        hid.push(o);
      }
    }
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh !== true || !mesh.visible) return;
      const own = mesh.material;
      // `prepassSkip`: a host's marker for what no prepass draws (main.ts' depth clear).
      if (leave(mesh) || mesh.userData.prepassSkip === true || seeThrough(own)) {
        mesh.visible = false;
        hid.push(mesh);
        return;
      }
      swapped.push([mesh, own]);
      // A mesh whose vertex shader a stock material cannot know (the packed
      // rivets, rivetPack.ts) carries its own normal-drawing stand-in.
      // Those stand-ins are the occlusion's, which draws front faces only;
      // the drawing needs both, so each is turned for the prepass and back.
      const standIn = mesh.userData.prepassMaterial as Material | undefined;
      if (standIn !== undefined && !sided.has(standIn)) {
        sided.set(standIn, standIn.side);
        standIn.side = DoubleSide;
        // The side is compiled in (back faces flip their normal), so the
        // program changes with it: a cache hit after the first frame.
        standIn.needsUpdate = true;
      }
      mesh.material = standIn ?? normals;
    });

    const background = scene.background;
    const fog = scene.fog;
    scene.background = null;
    scene.fog = null;
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(into);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clear, alpha);
    scene.background = background;
    scene.fog = fog;

    for (const [mesh, own] of swapped) mesh.material = own;
    swapped.length = 0;
    for (const [m, side] of sided) {
      m.side = side;
      m.needsUpdate = true;
    }
    sided.clear();
    for (const o of hid) o.visible = true;
    hid.length = 0;
  }

  return {
    render(color) {
      prepass(target, under);
      if (overTest !== null) {
        if (overTarget === null) {
          overTarget = normalsTarget(target.width, target.height);
          material.uniforms.tNormalOver.value = overTarget.texture;
          material.uniforms.tDepthOver.value = overTarget.depthTexture;
        }
        prepass(overTarget, over);
      }
      material.uniforms.useOver.value = overTest !== null ? 1 : 0;
      material.uniforms.cameraNear.value = camera.near;
      material.uniforms.cameraFar.value = camera.far;
      renderer.setRenderTarget(edges);
      quad.render(renderer);
      renderer.setRenderTarget(null);
      const r = resolveMaterial.uniforms;
      r.useColor.value = color !== undefined && wash !== null ? 1 : 0;
      r.tColor.value = color ?? null;
      if (wash !== null) {
        r.lift.value = wash.lift;
        r.saturation.value = wash.saturation;
      }
      resolveQuad.render(renderer);
    },
    composite(next) {
      wash = next;
    },
    haze(next) {
      haze = next;
      resolveMaterial.uniforms.hazeAmount.value = next?.amount ?? 0;
      material.uniforms.hazeFalloff.value = next?.falloff ?? 0;
      if (next === null) (material.uniforms.hazeRange.value as Vector2).set(1e9, 2e9);
    },
    groundShadow(colour) {
      resolveMaterial.uniforms.shadowOn.value = colour === null ? 0 : 1;
      if (colour !== null) (resolveMaterial.uniforms.shadowColour.value as Color).copy(srgb(colour));
    },
    ghost(opacity) {
      resolveMaterial.uniforms.ghost.value = opacity;
    },
    over(test) {
      overTest = test;
    },
    hazeRange(near, far) {
      if (haze !== null) (material.uniforms.hazeRange.value as Vector2).set(near, Math.max(far, near + 1e-3));
    },
    setSize(w, h) {
      canvas = { width: w, height: h };
      fit();
    },
    apply,
    dispose() {
      target.dispose();
      edges.dispose();
      depthTexture.dispose();
      overTarget?.dispose();
      overTarget?.depthTexture?.dispose();
      resolveMaterial.dispose();
      resolveQuad.dispose();
      normals.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}
