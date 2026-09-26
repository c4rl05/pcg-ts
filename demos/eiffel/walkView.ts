/**
 * THE WALK, on the page: first person up the 1,710 steps (`?walk`, or the
 * panel's "walk" toggle; `?walk=<step>` opens at a step).
 *
 * The path is `walk.ts`'s, built from the stairs themselves; this module
 * only rides it. The camera stands at the path's eye, looks along the way
 * the path runs over the next metre and more (eased, so a helix turns the
 * head rather than jerking it), a little up a flight and up a ladder's
 * rungs, and the viewer's own look is added on top: drag on the canvas, or
 * double-click for pointer lock (Escape leaves it). The orbit controls are
 * off for as long as the walk is on, and the orbit's pose comes back after.
 *
 * Keys, while walking: Space plays and pauses; ↑/W and ↓/S take one step
 * up or down; PageUp/PageDown the next or last flight; Home and End the
 * ground and the top; R squares the look back to the path.
 *
 * THE SHADOW. The key light's shadow map is fitted to the whole tower and
 * its shadow on the ground: at 4096 texels, one every 9-10 cm (measured,
 * the default look), so at eye level a hand rail's or a lacing bar's
 * shadow is soft. The panel's "near shadow" fits it round the walker
 * instead (`Rig.fitShadowNear`): a box 60 m across and 40 m tall,
 * refitted once the walker has gone `REFIT` from its centre, a texel of
 * 2.2 cm for one extra shadow pass every few metres. It is OFF by default
 * because it costs more than it shows: at the plain depth the steel's
 * shadows read the same at either texel (frames 12 and 13 of the walk's
 * report), and everything outside the box loses its shadow, the tower's
 * on the ground first, which is in view from every flight. Both at once
 * needs two maps (a cascade), which the rig's one key light does not have.
 */
import { mount } from "svelte";
import { Box3, type PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import WalkPanel from "./WalkPanel.svelte";
import { type WalkRoute, distOfStep, poseAt, walkRoute } from "./walk.js";
import { GROUND_ALTITUDE } from "./spec.js";

/** A walker's pace along the path, in metres a second: about a step and a half a second on a stair [estimated]. */
const PACE = 0.5;
/** The walk's field of view, wider than the orbit's 42° as an eye's is [estimated]. */
const FOV = 70;
/** How long the view takes to follow a turn of the path, in seconds. */
const EASE = 0.35;
/** The shadow box round the walker: half its width and height, and how far the walker goes before it is refitted. */
const NEAR_BOX = { half: 30, halfY: 20 } as const;
const REFIT = 6;

/** The runs, as a walker would name them. */
const RUN_LABEL: Record<string, string> = {
  ground: "ground → 1st floor",
  e1: "1st → 2nd floor",
  e2: "2nd floor → landing",
  e3: "landing → 3rd floor",
  summit: "3rd floor → top",
};

declare global {
  interface Window {
    /** The walk, for a scripted capture: stand at a step, and read the pose back. */
    pcgEiffelWalk?: Pick<Walk, "go" | "goDist" | "state" | "set">;
  }
}

export interface WalkOptions {
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly canvas: HTMLElement;
  /** Where the walk's control goes in the panel. */
  readonly slot: HTMLElement;
  /** The rig's shadow fitting (`Rig.fitShadowNear`, `Rig.shadowTexel`). */
  readonly shadow: { near(box: Box3 | null): number; texel(): number };
  /** Called with the walk's state when it is switched, for the page's toggle. */
  readonly toggled?: (on: boolean) => void;
}

export interface Walk {
  readonly active: boolean;
  set(on: boolean): void;
  /** Advance and pose the camera; call once a frame while `active`. */
  tick(): void;
  /** Stand at step `n` (and optionally turn the look, in degrees off the path's), paused. */
  go(n: number, yaw?: number, pitch?: number): void;
  /** The same, at `d` metres along the path. */
  goDist(d: number, yaw?: number, pitch?: number): void;
  /** The pose as it stands: for a capture's sidecar. */
  state(): { step: number; dist: number; flight: string; eye: [number, number, number]; texel: number };
}

/** What the Svelte control exposes (see `WalkPanel.svelte`). */
interface PanelApi {
  update(s: { dist: number; step: number; label: string; cote: number; playing: boolean; texel: number }): void;
}

export function attachWalk(opts: WalkOptions): Walk {
  const { camera, controls, canvas } = opts;
  let route: WalkRoute | undefined;
  const need = (): WalkRoute => (route ??= walkRoute());

  let active = false;
  let playing = false;
  let speed = 1;
  let dist = 0;
  let yawOff = 0;
  let pitchOff = 0;
  let yaw = Number.NaN;
  let pitch = 0;
  let last = performance.now();
  let nearShadow = false;
  let fitAt: Vector3 | undefined;
  let texel = 0;
  let saved: { pos: Vector3; target: Vector3; fov: number } | undefined;
  let panel: PanelApi | undefined;

  const host = document.createElement("div");
  host.style.display = "none";
  opts.slot.append(host);

  function ensurePanel(): void {
    if (panel !== undefined) return;
    const r = need();
    panel = mount(WalkPanel, {
      target: host,
      props: {
        length: r.length,
        steps: r.steps,
        speed,
        nearShadow,
        onPlay: (on: boolean) => {
          playing = on;
        },
        onSpeed: (v: number) => {
          speed = v;
        },
        onScrub: (d: number) => {
          playing = false;
          dist = d;
          yaw = Number.NaN;
        },
        onStep: (by: number) => stepBy(by),
        onFlight: (by: number) => flightBy(by),
        onNearShadow: (on: boolean) => {
          nearShadow = on;
          fitAt = undefined;
          if (!on) texel = opts.shadow.near(null);
        },
        onLevel: () => {
          yawOff = 0;
          pitchOff = 0;
        },
      },
    }) as unknown as PanelApi;
  }

  function stepBy(by: number): void {
    const r = need();
    playing = false;
    const here = poseAt(r, dist).step;
    const reached = distOfStep(r, here);
    if (by > 0) dist = distOfStep(r, Math.min(r.steps, here + 1));
    // Down: back to where this step was reached, or from there to the one before.
    else dist = dist > reached + 1e-6 ? reached : here <= 1 ? 0 : distOfStep(r, here - 1);
  }

  function flightBy(by: number): void {
    const r = need();
    playing = false;
    const i = poseAt(r, dist).index;
    const starts = r.flights.map((f) => (r.points[f.first] as { dist: number }).dist);
    let k = starts.findIndex((s, j) => s <= dist + 1e-6 && (starts[j + 1] ?? Infinity) > dist + 1e-6);
    if (k < 0) k = i === 0 ? -1 : starts.length - 1;
    const atStart = k >= 0 && Math.abs((starts[k] as number) - dist) < 1e-6;
    const next = by > 0 ? k + 1 : atStart ? k - 1 : k;
    dist = next < 0 ? 0 : next >= starts.length ? r.length : (starts[next] as number);
    yaw = Number.NaN;
  }

  // ---------------------------------------------------------------- input

  let dragging = false;
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || e.button !== 0) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  });
  const look = (dx: number, dy: number): void => {
    yawOff -= dx * 0.0035;
    pitchOff = Math.max(-1.45, Math.min(1.45, pitchOff - dy * 0.0035));
  };
  canvas.addEventListener("pointermove", (e) => {
    if (!active) return;
    if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
    else if (dragging) look(e.movementX, e.movementY);
  });
  canvas.addEventListener("dblclick", () => {
    if (active && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  window.addEventListener("keydown", (e) => {
    if (!active || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t !== null && (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(t.tagName) || t.isContentEditable)) return;
    const r = need();
    switch (e.key) {
      case " ":
        playing = !playing;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        stepBy(1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        stepBy(-1);
        break;
      case "PageUp":
        flightBy(1);
        break;
      case "PageDown":
        flightBy(-1);
        break;
      case "Home":
        playing = false;
        dist = 0;
        yaw = Number.NaN;
        break;
      case "End":
        playing = false;
        dist = r.length;
        yaw = Number.NaN;
        break;
      case "r":
      case "R":
        yawOff = 0;
        pitchOff = 0;
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // ---------------------------------------------------------------- the pose

  let kinds: Map<string, string> | undefined;
  /**
   * Where a walker looks, up or down: a little up a straight flight (its
   * treads are ahead and below anyway), down on a spiral, whose treads turn
   * out of sight within a pace unless looked for, up a ladder's rungs, level
   * on a floor.
   */
  function pitchFor(r: WalkRoute, p: ReturnType<typeof poseAt>): number {
    kinds ??= new Map(r.flights.map((f) => [f.name, f.kind]));
    const v = r.points[p.index];
    if (v?.look !== undefined) return 0.45;
    if (v?.kind === "stair" && kinds.get(p.flight) === "spiral") return -0.35;
    return Math.max(-0.25, Math.min(0.35, Math.atan(p.slope) * 0.5));
  }

  const eye = new Vector3();
  const aim = new Vector3();

  function tick(): void {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!active) return;
    const r = need();
    if (playing) {
      dist += dt * PACE * speed;
      if (dist >= r.length) {
        dist = r.length;
        playing = false;
      }
    }
    const p = poseAt(r, dist);
    const want = Math.atan2(p.heading[0], p.heading[2]);
    if (Number.isNaN(yaw)) yaw = want;
    else {
      let d = want - yaw;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      yaw += d * (1 - Math.exp(-dt / EASE));
    }
    pitch += (pitchFor(r, p) - pitch) * (1 - Math.exp(-dt / EASE));
    const a = yaw + yawOff;
    const b = Math.max(-1.5, Math.min(1.5, pitch + pitchOff));
    eye.set(p.eye[0], p.eye[1], p.eye[2]);
    camera.position.copy(eye);
    aim.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)).add(eye);
    camera.lookAt(aim);
    camera.updateMatrixWorld();
    if (nearShadow && (fitAt === undefined || fitAt.distanceTo(eye) > REFIT)) {
      fitAt = eye.clone();
      const h = new Vector3(NEAR_BOX.half, NEAR_BOX.halfY, NEAR_BOX.half);
      texel = opts.shadow.near(new Box3(eye.clone().sub(h), eye.clone().add(h)));
    }
    const v = r.points[p.index];
    panel?.update({
      dist,
      step: p.step,
      label: `${RUN_LABEL[v?.run ?? ""] ?? ""} · ${p.flight}`,
      cote: p.at[1] + GROUND_ALTITUDE,
      playing,
      texel,
    });
  }

  function set(on: boolean): void {
    if (on === active) return;
    active = on;
    if (on) {
      ensurePanel();
      host.style.display = "";
      saved = { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov };
      controls.enabled = false;
      camera.fov = FOV;
      camera.updateProjectionMatrix();
      yaw = Number.NaN;
      fitAt = undefined;
      texel = opts.shadow.texel();
      last = performance.now();
    } else {
      host.style.display = "none";
      playing = false;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      texel = opts.shadow.near(null);
      fitAt = undefined;
      if (saved !== undefined) {
        camera.position.copy(saved.pos);
        controls.target.copy(saved.target);
        camera.fov = saved.fov;
        camera.updateProjectionMatrix();
      }
      controls.enabled = true;
      controls.update();
    }
    opts.toggled?.(on);
  }

  const walk: Walk = {
    get active() {
      return active;
    },
    set,
    tick,
    go(n, yawDeg, pitchDeg) {
      walk.goDist(distOfStep(need(), n), yawDeg, pitchDeg);
    },
    goDist(d, yawDeg, pitchDeg) {
      const r = need();
      if (!active) set(true);
      playing = false;
      dist = Math.max(0, Math.min(r.length, d));
      yaw = Number.NaN;
      pitch = 0;
      yawOff = ((yawDeg ?? 0) * Math.PI) / 180;
      pitchOff = ((pitchDeg ?? 0) * Math.PI) / 180;
      // Settle the eased pitch at once: a capture wants the pose, not the ease.
      pitch = pitchFor(r, poseAt(r, dist));
    },
    state() {
      const r = need();
      const p = poseAt(r, dist);
      return { step: p.step, dist, flight: p.flight, eye: [p.eye[0], p.eye[1], p.eye[2]], texel };
    },
  };
  window.pcgEiffelWalk = { go: walk.go, goDist: walk.goDist, state: walk.state, set: walk.set };
  return walk;
}
