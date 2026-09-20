/**
 * Ground-truth ambient occlusion, taught to read a LOGARITHMIC depth buffer.
 *
 * WHY THIS FILE EXISTS. three's `GTAOPass` reconstructs view-space position
 * from the depth texture with `perspectiveDepthToViewZ(depth, near, far)` —
 * it assumes the ordinary non-linear perspective depth. The eiffel page runs
 * `logarithmicDepthBuffer: true`, and that is a RENDERER capability, not a
 * material one: three injects the log-depth chunk into every program it
 * compiles, including the `MeshNormalMaterial` the pass uses for its own
 * G-buffer prepass. So the pass writes log depth and reads it as perspective
 * depth, and the AO that comes out is garbage — dark where nothing touches
 * and flat where things do.
 *
 * Turning log depth off is not the fix. The page spans a 19 mm rivet head
 * seen from half a metre and a 312 m tower seen from two kilometres. With a
 * 24-bit buffer and near/far fitted per frame, linear depth resolves 0.027 mm
 * at the opening pose — better than log's 0.27 mm — but 5.4 mm on the far
 * lattice in a rivet close-up, where log resolves 0.14 mm. The close-up is
 * the case log depth was turned on for, and 5.4 mm would undo the 1 mm
 * jitter the graph applies to keep coplanar faces apart.
 *
 * So the pass is taught the other mapping instead. three writes
 *
 *     gl_FragDepth = log2(1 + w) * (2 / log2(1 + far)) * 0.5
 *                  = log2(1 + w) / log2(1 + far)
 *
 * with `w` the clip w, which for a perspective camera is exactly `-viewZ`.
 * Inverting is one line, and the ray through the pixel comes from the same
 * inverse projection the stock shader already has:
 *
 *     viewZ = -(exp2(d * log2(1 + far)) - 1)
 *
 * IT FAILS LOUDLY. Both replacements assert that the source they are
 * replacing was actually found. A three upgrade that rewords either helper
 * throws here rather than silently going back to wrong AO, which is a bug
 * nobody would catch by looking — wrong AO still looks like AO.
 */
import type { WebGLRenderer } from "three";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import type { Camera, Scene } from "three";

/** What `GTAOPass` ships, verbatim. Both must match or we throw. */
const STOCK_VIEW_POSITION = `		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}`;

const STOCK_VIEW_Z = `		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}`;

/**
 * The same two helpers over a logarithmic buffer.
 *
 * `getViewPosition` cannot unproject the stored value any more — it is not
 * an NDC z — so it takes the ray through the pixel from the inverse
 * projection (a point on the near plane, whose view z is -near) and pushes
 * it out until its z is the depth we recovered. That is one divide more
 * than the stock path and exact for any perspective frustum.
 */
const LOG_VIEW_POSITION = `		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			float logViewZ = -( exp2( depth * log2( cameraFar + 1.0 ) ) - 1.0 );
			vec4 clipRay = vec4( screenPosition * 2.0 - 1.0, -1.0, 1.0 );
			vec4 viewRay = cameraProjectionMatrixInverse * clipRay;
			vec3 onNear = viewRay.xyz / viewRay.w;
			return onNear * ( logViewZ / onNear.z );
		}`;

const LOG_VIEW_Z = `		float getViewZ(const in float depth) {
			return -( exp2( depth * log2( cameraFar + 1.0 ) ) - 1.0 );
		}`;

/** Everything a `Look` says about the occlusion. */
export interface AoSpec {
  readonly on: boolean;
  /**
   * World-space radius the occlusion is gathered over, in metres. The
   * tower's members are 0.1-0.9 across and its panels several metres, so
   * this is the dial that decides whether the AO reads as grime in the
   * joints or as depth in the lattice.
   */
  readonly radius: number;
  /** How fast occlusion falls off with distance within the radius. */
  readonly distanceExponent: number;
  /** How solid a surface is assumed to be behind its silhouette. */
  readonly thickness: number;
  /** Occlusion strength before it is blended over the beauty pass. */
  readonly scale: number;
  /** Directions and steps per direction; the cost knob. */
  readonly samples: number;
  /**
   * Take the radius in SCREEN space instead of world space. Off for this
   * page: a screen-space radius makes the AO change as you fly in, which
   * is exactly what this must not do.
   */
  readonly screenSpaceRadius: boolean;
  /** 0 = no AO in the image, 1 = full. */
  readonly blend: number;
}

export const AO_DEFAULT: AoSpec = {
  on: true,
  radius: 0.5,
  distanceExponent: 1,
  thickness: 1,
  scale: 1,
  samples: 16,
  screenSpaceRadius: false,
  blend: 1,
};

/**
 * Build the pass, patched for log depth, sized to the renderer's drawing
 * buffer. `width`/`height` are DEVICE pixels, not CSS pixels: the AO is
 * computed at the resolution it is composited at.
 */
export function createGtao(
  scene: Scene,
  camera: Camera,
  width: number,
  height: number,
  renderer: WebGLRenderer,
): GTAOPass {
  const pass = new GTAOPass(scene, camera, width, height);
  if (renderer.capabilities.logarithmicDepthBuffer) patchForLogDepth(pass);
  return pass;
}

function patchForLogDepth(pass: GTAOPass): void {
  const material = pass.gtaoMaterial as { fragmentShader: string; needsUpdate: boolean };
  let src = material.fragmentShader;
  src = replaceOnce(src, STOCK_VIEW_POSITION, LOG_VIEW_POSITION, "getViewPosition");
  src = replaceOnce(src, STOCK_VIEW_Z, LOG_VIEW_Z, "getViewZ");
  material.fragmentShader = src;
  material.needsUpdate = true;
}

function replaceOnce(src: string, from: string, to: string, what: string): string {
  const at = src.indexOf(from);
  if (at < 0) {
    throw new Error(
      `GTAO log-depth patch: this three's GTAOShader no longer contains the ${what} ` +
        `this file replaces. Re-read node_modules/three/examples/jsm/shaders/GTAOShader.js ` +
        `and update gtao.ts. Do NOT drop the patch: without it the AO silently reads ` +
        `logarithmic depth as perspective depth, and wrong AO still looks like AO.`,
    );
  }
  if (src.indexOf(from, at + from.length) >= 0) {
    throw new Error(`GTAO log-depth patch: ${what} appears more than once; the patch is ambiguous.`);
  }
  return src.slice(0, at) + to + src.slice(at + from.length);
}

/** Push a spec onto the pass. Safe to call every frame; it only sets fields. */
export function applyAo(pass: GTAOPass, ao: AoSpec): void {
  pass.enabled = ao.on;
  pass.updateGtaoMaterial({
    radius: ao.radius,
    distanceExponent: ao.distanceExponent,
    thickness: ao.thickness,
    scale: ao.scale,
    samples: ao.samples,
    screenSpaceRadius: ao.screenSpaceRadius,
  });
  pass.blendIntensity = ao.blend;
}
