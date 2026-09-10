/**
 * A cave with no edges: fly forward and the rock keeps arriving.
 *
 * WHAT THIS PAGE IS FOR. `meshFromField` claims that a cube of a
 * partitioned world can be contoured on its own and still agree with its
 * neighbours — the lattice is anchored to the WORLD, so cube `(i, j, k)`
 * has the same corners at the same positions whichever cell asks about
 * it, and a tetrahedron reads its own cube's eight samples and nothing
 * else. Up to now that was measured only in a unit test, by contouring
 * the same field over two boxes and comparing the overlap. This is the
 * claim running: sixty-odd cubes of world, cooked independently, several
 * arriving every second, and no seam between any two of them.
 *
 * IT IS THE FIRST 3D-CELLED WORLD IN THE REPO. Every other level here
 * partitions the XZ plane and leaves Y unbounded, which is exactly right
 * for ground cover and exactly wrong for a volume: there is as much cave
 * above and below you as there is around. So `cellMode: "xyz"`, cube
 * cells, and a coordinate with three numbers in it.
 *
 * THE COST IS THE INTERESTING PART, and it is why the panel exposes what
 * it does. A 3D world grows with the CUBE of its radius, so doubling the
 * generation radius is eight times the cells; and each cell's cost grows
 * with the cube of its size over the lattice. Both dials are on the
 * panel, both are labelled with what they multiply, and the stats show
 * what they cost — because the honest thing to show about streaming a
 * volume is that it is expensive, not to hide it behind a small world.
 *
 * NOTHING HERE COLLIDES. The camera flies through rock as happily as
 * through air, and the material is double-sided so that passing inside a
 * mass reads as a tunnel rather than as the world vanishing. A cave demo
 * that fought the camera out of the rock would be a demo about collision.
 */
import { DoubleSide, Group, MeshStandardMaterial, PointLight } from "three";
import { World } from "pcg-ts";
import { WorldThreeBinding } from "pcg-ts/three";
import { createScene } from "../../shared/scene.js";
import { createOverlay } from "../../shared/overlay.js";
import { attachGraphPanel } from "../../shared/graph/panel.js";
import { attachWordmark } from "../../shared/wordmark.js";
import { makeCaveLevel, type CaveOptions } from "./levels.js";

/**
 * Per-frame cook budget, in ms. Seven is what the other streaming pages
 * use and it is the number that keeps a frame under sixteen; a cell of
 * this world costs more than one budget, so a cell takes a few frames to
 * arrive and the world fills in visibly rather than in one hitch.
 */
const BUDGET_MS = 7;
/** A larger first bite, so the opening view is not empty. */
const FIRST_BUDGET_MS = 40;
/** Cap on cells per update, so one update cannot run away with the frame. */
const MAX_COOKS_PER_UPDATE = 3;

/**
 * SIZED BY THE TRIANGLE BUDGET, which is the constraint a volume world
 * has and a flat one does not. A cell's triangles grow with the SQUARE of
 * its size over the lattice (it is a surface), and the cell COUNT grows
 * with the cube of the radius over the cell size — so the two dials pull
 * against each other and the honest thing is to say what they cost.
 * Measured on this field: a 32 u cell at a 1 u lattice is about 62 000
 * triangles, which at a useful radius is several million in the scene.
 * These numbers land near a million, which a laptop renders.
 */
const defaults: CaveOptions = {
  cellSize: 40,
  generationRadius: 44,
  lattice: 1.8,
  threshold: 0.45,
  frequency: 0.028,
  seed: 20260910,
};

const scene = createScene({
  cameraPosition: [0, 0, 0],
  orbit: false,
  // The fog is doing real work rather than decorating: it hides the open
  // shells at the outer edge of the generated region, which are not a
  // defect — the node emits the surface it found and never invents a lid
  // — but which would otherwise read as one.
  fog: { near: 18, far: 78 },
  far: 400,
});
const { camera } = scene;

/**
 * A HEADLAMP, and the demo does not read without one.
 *
 * The shared scene lights a subject from outside — a sky dome and a sun,
 * which is right for rocks on a plain and useless in a cave, where
 * everything you can see is an interior surface facing away from both.
 * Parented to the camera so it travels, and the camera is added to the
 * scene because three only walks lights it can reach from the root.
 */
const lamp = new PointLight(0xffe4bd, 150, 110, 1.5);
camera.add(lamp);
scene.scene.add(camera);

/**
 * DOUBLE-SIDED, and supplied rather than left to the binding.
 *
 * Passing through a mass with back faces culled shows nothing at all, so
 * the world would appear to blink out whenever the camera entered rock.
 * Double-sided, the same moment reads as being inside a tunnel. Supplying
 * it also means this page owns it — `WorldThreeBinding` never disposes a
 * material it was handed, for the reason it never disposes one from
 * `materialFor`: it is shared across every live cell.
 */
const rockMaterial = new MeshStandardMaterial({
  color: 0x9aa39b,
  roughness: 0.95,
  metalness: 0,
  side: DoubleSide,
  flatShading: false,
});

const overlay = createOverlay({
  title: "cave",
  info:
    "One node, no inputs: meshFromField contours a noise into triangles. The world is cut into " +
    "CUBE cells — the first 3D-celled level in this repo — and each one contours its own cube " +
    "with no knowledge of its neighbours. The seams you cannot find are the point.",
});

let options: CaveOptions = { ...defaults };
let rig: Rig | undefined;
let updating = false;
let flying = true;
/**
 * Eight, not the fourteen a flat world can fly at, and the difference is
 * the demo. A cell of this world costs about 60 ms to cook and the
 * budget spends 7 of them a frame, so the camera can outrun the
 * streaming — push `speed` up and `pending` stops returning to zero,
 * which is budgeted cooking telling you the truth rather than a stutter.
 */
let speed = 8;

interface Rig {
  readonly world: World;
  readonly group: Group;
  readonly binding: WorldThreeBinding;
  readonly abort: AbortController;
  disposed: boolean;
}

const setCells = overlay.addStat("cells");
const setTris = overlay.addStat("triangles");
const setPending = overlay.addStat("pending");
const setCook = overlay.addStat("last cook");

/** Triangles currently in the scene, summed as cells arrive and leave. */
const cellTriangles = new Map<string, number>();

function refreshCounts(): void {
  let total = 0;
  for (const n of cellTriangles.values()) total += n;
  setCells(cellTriangles.size);
  setTris(total.toLocaleString());
}

function disposeRig(r: Rig): void {
  r.disposed = true;
  r.abort.abort();
  r.binding.dispose();
  scene.scene.remove(r.group);
}

function buildWorld(): void {
  if (rig) disposeRig(rig);
  cellTriangles.clear();
  refreshCounts();

  const group = new Group();
  scene.scene.add(group);
  const binding = new WorldThreeBinding({
    group,
    assets: {},
    // The option this demo was the reason for. Without it a geometry
    // output draws nothing at all — no warning, no error, an empty group
    // per cell — because until this page existed the binding had only
    // ever been handed instances.
    meshes: true,
    meshMaterial: rockMaterial,
  });
  const built = makeCaveLevel(options);
  panel.set([{ name: "cave", graph: built.graph }]);

  const next: Rig = { world: undefined as unknown as World, group, binding, abort: new AbortController(), disposed: false };
  (next as { world: World }).world = new World({
    seed: options.seed,
    levels: [built.level],
    onCellReady: (level, coord, outputs) => {
      if (next.disposed) return;
      binding.cellReady(level, coord, outputs);
      let tris = 0;
      for (const name of Object.keys(outputs)) {
        for (const item of outputs[name] ?? []) {
          if (item.kind === "geometry") tris += item.geo.primitiveCount;
        }
      }
      cellTriangles.set(coord.join(","), tris);
      refreshCounts();
    },
    onCellEvicted: (level, coord) => {
      if (next.disposed) return;
      binding.cellEvicted(level, coord);
      cellTriangles.delete(coord.join(","));
      refreshCounts();
    },
  });
  rig = next;
  void runUpdate(next, FIRST_BUDGET_MS);
}

async function runUpdate(r: Rig, budgetMs: number): Promise<void> {
  updating = true;
  const began = performance.now();
  try {
    const stats = await r.world.update(
      [camera.position.x, camera.position.y, camera.position.z],
      { budgetMs, maxCooksPerUpdate: MAX_COOKS_PER_UPDATE, signal: r.abort.signal },
    );
    if (r.disposed) return;
    setPending(stats.pending);
    if (stats.cooked.length > 0) setCook(`${Math.round(performance.now() - began)} ms`);
  } catch {
    // An aborted update is how a rebuild retires the old world; there is
    // nothing to report and nothing to recover.
  } finally {
    if (!r.disposed) updating = false;
  }
}

// --- panel ------------------------------------------------------------

overlay.addSeed(options.seed, (seed) => {
  options = { ...options, seed };
  buildWorld();
});
overlay.addCheckbox("fly", flying, (on) => {
  flying = on;
});
overlay.addSlider("speed", { min: 0, max: 30, step: 1, value: speed, format: (v) => `${v} u/s` }, (v) => {
  speed = v;
});
overlay.addSlider(
  "cell size",
  { min: 16, max: 64, step: 4, value: options.cellSize, format: (v) => `${v} u` },
  (v) => {
    options = { ...options, cellSize: v };
    buildWorld();
  },
);
overlay.addSlider(
  "radius",
  { min: 32, max: 96, step: 4, value: options.generationRadius, format: (v) => `${v} u` },
  (v) => {
    options = { ...options, generationRadius: v };
    buildWorld();
  },
);
overlay.addSlider(
  "lattice",
  { min: 0.5, max: 2, step: 0.1, value: options.lattice, format: (v) => `${v.toFixed(1)} u` },
  (v) => {
    options = { ...options, lattice: v };
    buildWorld();
  },
);
overlay.addSlider(
  "rock",
  { min: 0.35, max: 0.6, step: 0.01, value: options.threshold, format: (v) => v.toFixed(2) },
  (v) => {
    options = { ...options, threshold: v };
    buildWorld();
  },
);
overlay.addNote(
  "radius is CUBED here: a 3D world doubles its cell count three times over when you double " +
    "the radius, where a flat one doubles it twice. lattice is squared again inside each cell, " +
    "since what it resolves is a surface. Push speed past the streaming and pending stops " +
    "returning to zero — that is the cook budget reporting, not a stutter.",
);
const graphSlot = overlay.addSlot();
const panel = attachGraphPanel([], { into: graphSlot, title: "cave" });
attachWordmark();

// --- flight -----------------------------------------------------------

let heading = 0;
let pitch = 0;
const keys = new Set<string>();
addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

/**
 * A probe the capture script steers by, the convention the other
 * streaming pages use: a screenshot has to be reproducible, and the
 * camera is the one part of this page that is not.
 */
(window as unknown as { pcgCave: { pause(on: boolean): void } }).pcgCave = {
  pause(on: boolean) {
    flying = !on;
  },
};

buildWorld();

scene.start((dt) => {
  const turn = (keys.has("a") || keys.has("arrowleft") ? 1 : 0) - (keys.has("d") || keys.has("arrowright") ? 1 : 0);
  const climb = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  heading += turn * 0.9 * dt;
  pitch = Math.max(-0.5, Math.min(0.5, pitch + climb * 0.6 * dt));
  if (flying) {
    const forward = speed * dt;
    camera.position.x += Math.sin(heading) * Math.cos(pitch) * forward;
    camera.position.z += Math.cos(heading) * Math.cos(pitch) * forward;
    camera.position.y += Math.sin(pitch) * forward;
  }
  camera.lookAt(
    camera.position.x + Math.sin(heading) * Math.cos(pitch) * 60,
    camera.position.y + Math.sin(pitch) * 60,
    camera.position.z + Math.cos(heading) * Math.cos(pitch) * 60,
  );

  const r = rig;
  if (r && !updating) void runUpdate(r, BUDGET_MS);
});
