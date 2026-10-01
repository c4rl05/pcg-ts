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
   * A HIERARCHY of lines, each a fraction of the silhouette's full weight:
   * `inner` for a contour with something drawn on both sides of it (a bar
   * in front of a bar), `crease` for a fold. 1 and 1 is the plain pen,
   * every line alike.
   */
  readonly inner: number;
  readonly crease: number;
  /**
   * How far a far line takes the colour under it rather than the ink's,
   * 0 to 1, by the same distance as the fade: a faded grey line over a
   * rose wash greys the whole lattice, where a darker rose keeps it rose.
   * Only over a colour.
   */
  readonly farTint: number;
}

/**
 * Depth in the colour: how far what lies behind the focus is paled toward
 * the paper, 0 to 1, reaching it `depth` metres past the focus. A drawing
 * pales the planes it sets back, where light would darken them.
 */
export interface Haze {
  readonly amount: number;
  readonly depth: number;
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
  inner: 1,
  crease: 1,
  farTint: 0,
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
  /** Pale what is behind the focus (`Haze`); null for none. */
  haze(spec: Haze | null): void;
  /** The distance in metres to what the view is looking at, every frame the haze is on. */
  focus(distance: number): void;
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
  uniform vec2 texel;
  uniform float width;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float creaseCos;
  uniform float contour;
  uniform vec3 fade;
  uniform float inner;
  uniform float creaseWeight;
  uniform vec2 hazeRange;
  varying vec2 vUv;

  // 1 / (distance along the view axis); 0 where nothing was drawn.
  float invDepth(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    if (d >= 1.0) return 0.0;
    #ifdef LOG_DEPTH
      return 1.0 / (exp2(d * log2(cameraFar + 1.0)) - 1.0);
    #else
      return -1.0 / perspectiveDepthToViewZ(d, cameraNear, cameraFar);
    #endif
  }

  vec3 normalAt(vec2 uv) {
    return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0);
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
  // A silhouette's weight: full near, the inner contours' far off, where
  // the paper seen through a lattice is a field of small holes and each
  // outlined at full weight reads as a dark blot rather than as a gap.
  float silhouette = 1.0;

  float axis(float c, vec2 d) {
    vec2 a = vUv - d;
    vec2 b = vUv + d;
    if (any(lessThan(min(a, b), vec2(0.0))) || any(greaterThan(max(a, b), vec2(1.0)))) return 0.0;
    float ia = invDepth(a);
    float ib = invDepth(b);
    // A silhouette has paper on one side; anything else is an inner contour.
    return dip(c, ia, ib) * (ia > 0.0 && ib > 0.0 ? inner : silhouette);
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
    float far = smoothstep(fade.x, fade.y, dist);
    silhouette = mix(1.0, inner, far);
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
    // Red the line, green the coverage, blue how far behind the focus,
    // alpha how far off for the fade.
    gl_FragColor = vec4(line, 1.0, smoothstep(hazeRange.x, hazeRange.y, dist), far);
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
    if (useColor > 0.5) {
      vec3 c = toSRGB(texture2D(tColor, vUv).rgb);
      c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
      c = mix(c, paper, lift);
      // Blue and alpha are only written where something was drawn, so
      // they are averaged over the coverage, not over the kernel.
      float drawn = max(sum.y, 1e-4);
      c = mix(c, paper, hazeAmount * sum.z / drawn);
      pen = mix(ink, c * 0.62, farTint * sum.w / drawn);
      base = mix(paper, c, sum.y / total);
    }
    gl_FragColor = vec4(mix(base, pen, coverage), 1.0);
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
  const depthTexture = new DepthTexture(width, height, FloatType);
  // 8-bit normals: the finest step is about half a degree, and a crease is
  // tens of degrees.
  const target = new WebGLRenderTarget(width, height, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthTexture,
  });
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
      texel: { value: new Vector2(1 / width, 1 / height) },
      width: { value: 1 },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      creaseCos: { value: 0 },
      contour: { value: 0 },
      fade: { value: new Vector3() },
      inner: { value: 1 },
      creaseWeight: { value: 1 },
      hazeRange: { value: new Vector2(1e9, 2e9) },
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
    edges.setSize(sw, sh);
    (material.uniforms.texel.value as Vector2).set(1 / sw, 1 / sh);
    material.uniforms.width.value = reach;
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
    material.uniforms.inner.value = spec.inner;
    material.uniforms.creaseWeight.value = spec.crease;
    resolveMaterial.uniforms.farTint.value = spec.farTint;
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

  function prepass(): void {
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
      const seeThrough = Array.isArray(own) ? own.some((m) => m.transparent) : own.transparent;
      if (seeThrough) {
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
    renderer.setRenderTarget(target);
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
      prepass();
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
      if (next === null) (material.uniforms.hazeRange.value as Vector2).set(1e9, 2e9);
    },
    focus(distance) {
      if (haze !== null) (material.uniforms.hazeRange.value as Vector2).set(distance, distance + haze.depth);
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
      resolveMaterial.dispose();
      resolveQuad.dispose();
      normals.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}
