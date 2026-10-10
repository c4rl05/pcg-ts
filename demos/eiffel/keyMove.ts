/**
 * KEYBOARD MOVEMENT for the orbit: W/S fly along the view, A/D strafe, Q/E
 * sink and rise, Shift four times faster.
 *
 * It moves the camera AND the orbit's target by the same step, so the
 * orbit is never broken: a drag after a move turns about a point the same
 * distance ahead as before, at the same angle. The speed follows that distance for the same
 * reason — zoomed in on a rivet row the keys creep, zoomed out on the whole
 * tower they cross it in a few seconds — so how fast is chosen by how close,
 * with nothing new to set.
 *
 * Keys are read by `code`, the key's place on the board rather than its
 * letter, so the four sit under the same fingers on any layout. They are
 * ignored while a control that takes typing has focus (a checkbox or a
 * slider just clicked does not, so the keys work straight after it), and
 * while the page says the
 * orbit is not the camera's (the walk has its own keys; a driven capture
 * owns the pose).
 */
import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

/** Metres a second per metre between the camera and its target. */
const RATE = 0.6;
/** And the slowest and fastest that may give, in metres a second. */
const SLOWEST = 0.5;
const FASTEST = 250;
/** Shift's multiplier. */
const FAST = 4;
/** The camera's lowest eye height: under the ground plane it is a lid. */
export const FLOOR = 0.3;

const MOVES = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"]);

export interface KeyMove {
  /** Apply the held keys for `seconds`; call once a frame, before the orbit's `update`. */
  tick(seconds: number): void;
}

export function attachKeyMove(opts: {
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  /** Whether the orbit is the camera's now; the keys do nothing otherwise. */
  readonly enabled: () => boolean;
  /** Called when a move ends, for whatever reads the pose once it settles. */
  readonly moved?: () => void;
}): KeyMove {
  const { camera, controls } = opts;
  const held = new Set<string>();
  let fast = false;

  /** Inputs a letter key does nothing in, and so may pass on. */
  const KEYLESS = new Set(["checkbox", "radio", "range", "button", "submit", "reset", "color", "file"]);
  const typing = (e: KeyboardEvent): boolean => {
    const t = e.target as HTMLElement | null;
    if (t === null) return false;
    if (t instanceof HTMLInputElement) return !KEYLESS.has(t.type);
    return t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable;
  };
  window.addEventListener("keydown", (e) => {
    fast = e.shiftKey;
    // Not a repeat: autorepeat would re-add a key the tick dropped.
    if (!MOVES.has(e.code) || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    held.add(e.code);
  });
  window.addEventListener("keyup", (e) => {
    fast = e.shiftKey;
    if (held.delete(e.code) && held.size === 0) opts.moved?.();
  });
  // A key released while the window is not focused never sends its keyup.
  window.addEventListener("blur", () => {
    if (held.size === 0) return;
    held.clear();
    opts.moved?.();
  });

  const forward = new Vector3();
  const right = new Vector3();
  const step = new Vector3();
  const UP = new Vector3(0, 1, 0);

  return {
    tick(seconds) {
      if (held.size === 0) return;
      // Held through a walk or a driven shot, a key would fly the orbit the
      // moment it came back: it has to be pressed again.
      if (!opts.enabled()) {
        held.clear();
        return;
      }
      const axis = (plus: string, minus: string): number => (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);
      const ahead = axis("KeyW", "KeyS");
      const side = axis("KeyD", "KeyA");
      const rise = axis("KeyE", "KeyQ");
      if (ahead === 0 && side === 0 && rise === 0) return;
      forward.subVectors(controls.target, camera.position);
      const reach = forward.length();
      forward.normalize();
      // Strafing stays level whatever the pitch, and so does rising.
      right.crossVectors(forward, UP).normalize();
      const speed = Math.min(FASTEST, Math.max(SLOWEST, reach * RATE)) * (fast ? FAST : 1);
      step
        .copy(forward)
        .multiplyScalar(ahead)
        .addScaledVector(right, side)
        .addScaledVector(UP, rise)
        .normalize()
        .multiplyScalar(speed * seconds);
      // Never through the ground: take off whatever would sink the eye under it.
      const low = camera.position.y + step.y - FLOOR;
      if (low < 0) step.y -= low;
      camera.position.add(step);
      controls.target.add(step);
    },
  };
}
