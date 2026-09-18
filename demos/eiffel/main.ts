/**
 * eiffel — the procedural Eiffel Tower skeleton, set out to be judged by eye.
 *
 * The graph (`graph.ts`) is the whole of the tower: Eiffel's 29 panels
 * from Plate XXXI and the rules that brace and lace them. This page cooks
 * it once and stands the result in daylight. Nothing here generates or
 * corrects anything — what is on screen is what the graph settled.
 *
 * DAYLIGHT, WITH SHADOWS, because that is how the lattice reads. A braced
 * panel seen flat-lit is a hatched silhouette; the same panel under a low
 * sun throws its web onto the members behind it and onto the ground, and
 * the depth of the lattice becomes legible. So the sun casts, the shadow
 * camera is fitted to what was actually built (and to where its shadow
 * lands), and the map is only re-rendered when the scene changes: the
 * light and the geometry are both fixed, so orbiting costs no shadow pass.
 *
 * ONE MATERIAL PER CLASS, all in one family. The iron is painted one
 * colour on the real tower, and a render that gave every class its own hue
 * would read as a diagram, not a structure. The classes are nudged apart
 * just enough to tell them apart up close; the stone and the decks step
 * out of the family because they are different materials.
 *
 * Offline quality first: this page does not try to be fast yet.
 */
import { type DataCollection, cook } from "pcg-ts";
import { toBufferGeometry } from "pcg-ts/three";
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createFpsMeter } from "../../shared/fps.js";
import { attachGraphPanel } from "../../shared/graph/panel.js";
import { createOverlay } from "../../shared/overlay.js";
import { attachWordmark } from "../../shared/wordmark.js";
import { buildEiffel } from "./graph.js";
import { PART_CLASSES, type PartClass } from "./parts.js";

// ------------------------------------------------------------------ //
// The look.
// ------------------------------------------------------------------ //

/** Sky, clear colour and fog, as one value so the horizon has no seam. */
const SKY = 0xc4d0da;

/**
 * The palette. The iron is the tower's brown family throughout, each class
 * a step lighter or darker than its neighbours; the decks are darker still
 * (they are seen edge-on and in their own shade), and the pedestals are
 * pale stone.
 */
const LOOK: Record<PartClass, { color: number; roughness: number; metalness: number }> = {
  uprights: { color: 0x6b4d3b, roughness: 0.62, metalness: 0.15 },
  bracing: { color: 0x7b5b45, roughness: 0.66, metalness: 0.12 },
  horizontals: { color: 0x735441, roughness: 0.64, metalness: 0.12 },
  girders: { color: 0x654736, roughness: 0.62, metalness: 0.15 },
  arches: { color: 0x846550, roughness: 0.6, metalness: 0.12 },
  platforms: { color: 0x4a3a2f, roughness: 0.8, metalness: 0.05 },
  masonry: { color: 0xcdc3ae, roughness: 0.93, metalness: 0 },
  summit: { color: 0x72533f, roughness: 0.62, metalness: 0.15 },
};

const MATERIALS = Object.fromEntries(
  PART_CLASSES.map((cls) => [
    cls,
    new MeshStandardMaterial({ ...LOOK[cls], side: DoubleSide }),
  ]),
) as Record<PartClass, MeshStandardMaterial>;

/**
 * The tower's nominal envelope — Plate XXXI's base square with some room,
 * to the top of the campanile. The shadow camera is fitted to what the
 * cook actually built; this is only the fallback when it built nothing.
 */
const NOMINAL = new Box3(new Vector3(-90, 0, -90), new Vector3(90, 320, 90));

/**
 * Where the sun is, as a direction TOWARD it. From behind the camera's
 * left shoulder and about 48 degrees up: the faces toward the camera split
 * into a lit side and a shaded one, and the tower's shadow falls back and
 * to the right, onto ground the opening view can see.
 */
const SUN_DIR = new Vector3(-0.45, 0.78, 0.5).normalize();

// ------------------------------------------------------------------ //
// The scene.
// ------------------------------------------------------------------ //

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
// PCF, not PCF-soft: the soft variant is deprecated in this three and
// falls back to this one with a warning. `radius` below does the softening.
renderer.shadowMap.type = PCFShadowMap;
// Both the light and the geometry are fixed, so the shadow map is drawn
// when the scene changes and never on account of the camera.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(SKY);
scene.fog = new Fog(SKY, 900, 1950);

// 3/4 view from about 600 m out, a little above the first floor: the
// whole 312 m fits with room over the lantern, and the base square is
// seen on its diagonal so all four legs are in view.
const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 2000);
camera.position.set(360, 140, 470);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 110, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 1500;
// Never under the ground plane: from below it the ground is a lid.
controls.maxPolarAngle = Math.PI / 2 - 0.01;
controls.autoRotateSpeed = 0.35;
controls.update();

scene.add(new HemisphereLight(0xdfe8f2, 0x8c7f6c, 1.1));

const sun = new DirectionalLight(0xfff2e0, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
// Members are tens of centimetres thick and double-sided, which is the
// worst case for acne; the normal offset (in metres) does most of the work.
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.12;
sun.shadow.radius = 1.5;
scene.add(sun, sun.target);

const ground = new Mesh(
  new PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2),
  new MeshStandardMaterial({ color: 0xa29c8f, roughness: 1, metalness: 0 }),
);
ground.receiveShadow = true;
scene.add(ground);

/**
 * Fit the sun and its shadow camera to a box.
 *
 * The shadow camera has to hold two things: the tower, and the ground its
 * shadow falls on — which, at this elevation, reaches some 280 m past the
 * foot. Every point of that shadow lies on a ray from a point of the
 * tower away from the sun, so the frustum is the light-space bounds of the
 * box's eight corners plus where each corner's ray meets the ground.
 */
function fitSun(box: Box3): void {
  const center = box.getCenter(new Vector3());
  const reach = box.getSize(new Vector3()).length();
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(SUN_DIR, reach);
  sun.updateMatrixWorld();
  sun.target.updateMatrixWorld();

  // What `LightShadow.updateMatrices` does before each shadow pass, done
  // here so the bounds are measured in the frame the pass will use.
  const cam = sun.shadow.camera;
  cam.position.copy(sun.position);
  cam.lookAt(sun.target.position);
  cam.updateMatrixWorld(true);
  const toLight = cam.matrixWorld.clone().invert();

  const lo = new Vector3(Infinity, Infinity, Infinity);
  const hi = new Vector3(-Infinity, -Infinity, -Infinity);
  const p = new Vector3();
  for (let i = 0; i < 8; i++) {
    const corner = new Vector3(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    const onGround = corner.clone().addScaledVector(SUN_DIR, -Math.max(corner.y, 0) / SUN_DIR.y);
    for (const q of [corner, onGround]) {
      p.copy(q).applyMatrix4(toLight);
      lo.min(p);
      hi.max(p);
    }
  }
  const margin = 2;
  cam.left = lo.x - margin;
  cam.right = hi.x + margin;
  cam.bottom = lo.y - margin;
  cam.top = hi.y + margin;
  // The camera looks down -z, so depth is -z.
  cam.near = Math.max(0.5, -hi.z - margin);
  cam.far = -lo.z + margin;
  cam.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
}

fitSun(NOMINAL);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------ //
// The panel.
// ------------------------------------------------------------------ //

const overlay = createOverlay({
  title: "eiffel",
  info:
    "Eiffel's 29 panels from Plate XXXI — four legs merging into one shaft — with every " +
    "member below the panel scale placed by rule. Cooked once, drawn as it came out of the " +
    "graph, one material per part class. Orbit to judge it; the shadows are how the lattice reads.",
});

const statFps = overlay.addStat("fps");
const statCook = overlay.addStat("cook");
const statSize = overlay.addStat("extent (x × z × y)");
const statTotal = overlay.addStat("triangles");
const classStats = Object.fromEntries(
  PART_CLASSES.map((cls) => [cls, overlay.addStat(cls)]),
) as Record<PartClass, (value: string | number) => void>;

overlay.addCheckbox("rotate", false, (on) => {
  controls.autoRotate = on;
});

// Claimed here, where the panel is built, so the graph sits under the
// readouts.
const graphSlot = overlay.addSlot();

attachWordmark();

// ------------------------------------------------------------------ //
// The cook.
// ------------------------------------------------------------------ //

/** Every class's meshes, once built. */
const meshes = new Map<PartClass, Mesh[]>();

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Say what went wrong on the panel, where the person judging will see it. */
function report(problems: readonly string[]): void {
  if (problems.length === 0) return;
  overlay.addCollapsible(`problems (${problems.length})`, true).textContent = problems.join("\n\n");
  for (const p of problems) console.error(`eiffel: ${p}`);
}

/**
 * One class's output, as meshes. A collection may carry several geometry
 * items; each becomes its own mesh. Anything that is not a triangle mesh
 * (a stray polyline output from a module under construction) is reported
 * rather than drawn.
 */
function meshesOf(cls: PartClass, collection: DataCollection, problems: string[]): Mesh[] {
  const out: Mesh[] = [];
  for (const item of collection) {
    if (item.kind !== "geometry") continue;
    try {
      const geometry = toBufferGeometry(item.geo);
      geometry.computeBoundingBox();
      const mesh = new Mesh(geometry, MATERIALS[cls]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = cls;
      out.push(mesh);
    } catch (err) {
      problems.push(`${cls}: ${message(err)}`);
    }
  }
  return out;
}

function triangles(mesh: Mesh): number {
  const g = mesh.geometry;
  return (g.index ? g.index.count : g.getAttribute("position").count) / 3;
}

async function main(): Promise<void> {
  const problems: string[] = [];
  statCook("cooking…");
  // `?laced` builds the web bars as laced lattice struts (about 1.5M
  // triangles more): the second of the tower's self-similar scales.
  const laced = new URLSearchParams(location.search).has("laced");
  const graph = buildEiffel(1889, { lacedWeb: laced });
  // Shown before the cook, so a graph that fails to cook can still be read.
  attachGraphPanel([{ name: "eiffel skeleton", graph }], { into: graphSlot, title: "graph" });

  const t0 = performance.now();
  const { outputs } = await cook(graph);
  statCook(`${(performance.now() - t0).toFixed(0)} ms`);

  const box = new Box3();
  let total = 0;
  const present: PartClass[] = [];
  for (const cls of PART_CLASSES) {
    const collection = outputs[cls];
    if (collection === undefined) {
      classStats[cls]("absent");
      continue;
    }
    const built = meshesOf(cls, collection, problems);
    if (built.length === 0) {
      classStats[cls]("no mesh");
      continue;
    }
    let tris = 0;
    for (const mesh of built) {
      tris += triangles(mesh);
      box.union(mesh.geometry.boundingBox as Box3);
      scene.add(mesh);
    }
    meshes.set(cls, built);
    present.push(cls);
    total += tris;
    classStats[cls](tris.toLocaleString());
  }
  statTotal(total.toLocaleString());

  if (box.isEmpty()) {
    statSize("—");
    fitSun(NOMINAL);
  } else {
    const s = box.getSize(new Vector3());
    statSize(`${s.x.toFixed(1)} × ${s.z.toFixed(1)} × ${s.y.toFixed(1)} m`);
    fitSun(box);
  }

  // Isolating one class is how a class is judged on its own; the shadows
  // are redrawn with it, so an isolated class shades only itself.
  if (present.length > 1) {
    overlay.addSelect(
      "show",
      [{ value: "all", label: "all classes" }, ...present.map((c) => ({ value: c, label: c }))],
      "all",
      (v) => {
        for (const [cls, list] of meshes) for (const m of list) m.visible = v === "all" || v === cls;
        renderer.shadowMap.needsUpdate = true;
      },
    );
  }

  report(problems);
}

// ------------------------------------------------------------------ //
// The loop.
// ------------------------------------------------------------------ //

const tickFps = createFpsMeter(statFps);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  tickFps();
});

main().catch((err: unknown) => {
  statCook("failed");
  report([message(err)]);
});
