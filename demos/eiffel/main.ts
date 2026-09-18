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
 * THE RIVETS ARE INSTANCES, not mesh. `?rivets` (which implies `?laced`)
 * makes the cook put out `rivets*` outputs of instance batches — millions
 * of them — and the page draws each batch as one instanced unit-size dome
 * whose instance matrix carries the rivet's true size. They receive the
 * sun's shadow but do not cast it: a head a few centimetres high throws
 * nothing a 4096 map over 600 m could resolve, and casting would put
 * millions of instances into every shadow pass.
 *
 * Offline quality first: this page does not try to be fast yet.
 */
import { type DataCollection, cook } from "pcg-ts";
import { type AssetMap, toBufferGeometry, toInstancedMeshes } from "pcg-ts/three";
import {
  ACESFilmicToneMapping,
  Box3,
  type BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  HemisphereLight,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
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
  gussets: { color: 0x684a39, roughness: 0.6, metalness: 0.15 },
  // The names were gilded; the only thing on the tower that is not iron
  // paint or stone.
  names: { color: 0xc9a14a, roughness: 0.32, metalness: 0.85 },
};

const MATERIALS = Object.fromEntries(
  PART_CLASSES.map((cls) => [
    cls,
    new MeshStandardMaterial({ ...LOOK[cls], side: DoubleSide }),
  ]),
) as Record<PartClass, MeshStandardMaterial>;

/**
 * An output no class names — a module under construction declaring its
 * own. Drawn rather than dropped, in a grey outside the iron family, so it
 * is seen and seen to be unclassed.
 */
const UNCLASSED = new MeshStandardMaterial({
  color: 0x8c8c8c,
  roughness: 0.7,
  metalness: 0.1,
  side: DoubleSide,
});

/**
 * The rivet head, at UNIT size: a spherical cap of base radius 1 seated on
 * y = 0 and rising 0.7 along +y, the rivet's axis out of the plate. Each
 * instance matrix carries the rivet's true size, so this is the shape
 * only. Open at the base, which lies against the plate and is never seen;
 * 16 around and 3 rings is 80 triangles, and there are millions of these.
 */
function rivetHead(): BufferGeometry {
  const base = 1;
  const rise = 0.7;
  // The radius of the sphere the cap is cut from, and the polar angle at
  // which it meets the base circle.
  const r = (base * base + rise * rise) / (2 * rise);
  return new SphereGeometry(r, 16, 3, 0, Math.PI * 2, 0, Math.acos((r - rise) / r)).translate(
    0,
    rise - r,
    0,
  );
}

/**
 * What the cook's instance batches resolve against. The rivets are the
 * iron's family a step darker than any class: they sit proud of the plate
 * and read as its shaded dots.
 */
const ASSETS: AssetMap = {
  rivet: {
    geometry: rivetHead(),
    material: new MeshStandardMaterial({ color: 0x5c4232, roughness: 0.58, metalness: 0.18 }),
  },
};

/** Does this output carry rivets? The cook names them `rivets`, `rivets.<class>`, ... */
function isRivets(name: string): boolean {
  return name.startsWith("rivets");
}

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

// A logarithmic depth buffer, because the page spans a rivet's head (a few
// centimetres, from half a metre away) and the whole 312 m tower from 2 km:
// a linear buffer over near 0.05 and far 2000 z-fights the far members.
const renderer = new WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
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
const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(360, 140, 470);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 110, 0);
// `?cam=x,y,z,tx,ty,tz` opens on a given eye and target instead: a way back
// to a close look, and what a scripted capture poses the page with.
const pose = new URLSearchParams(location.search).get("cam")?.split(",").map(Number);
if (pose !== undefined && pose.length === 6 && pose.every(Number.isFinite)) {
  const [x, y, z, tx, ty, tz] = pose as [number, number, number, number, number, number];
  camera.position.set(x, y, z);
  controls.target.set(tx, ty, tz);
}
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.2;
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

/** Every drawn output's meshes, by output name, once built. */
const meshes = new Map<string, Mesh[]>();

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Say what went wrong on the panel, where the person judging will see it. */
function report(problems: readonly string[]): void {
  if (problems.length === 0) return;
  overlay.addCollapsible(`problems (${problems.length})`, true).textContent = problems.join("\n\n");
  for (const p of problems) console.error(`eiffel: ${p}`);
}

function triangles(mesh: Mesh): number {
  const g = mesh.geometry;
  return (g.index ? g.index.count : g.getAttribute("position").count) / 3;
}

/** One output, drawn. */
interface Drawn {
  readonly meshes: Mesh[];
  /** Triangles in the output's own meshes (instances not counted). */
  readonly triangles: number;
  /** Instances across its instance batches. */
  readonly instances: number;
}

/**
 * One output, as meshes. A collection may carry several items; each
 * geometry item becomes its own mesh in `material` (and grows `box`), and
 * each instances item becomes one instanced mesh per batch against
 * {@link ASSETS}. Anything that fails to convert (a stray polyline output
 * from a module under construction, an asset id nobody modelled) is
 * reported rather than drawn.
 */
function draw(
  name: string,
  collection: DataCollection,
  material: Material,
  box: Box3,
  problems: string[],
): Drawn {
  const out: Mesh[] = [];
  let tris = 0;
  let instances = 0;
  for (const item of collection) {
    try {
      if (item.kind === "geometry") {
        const geometry = toBufferGeometry(item.geo);
        geometry.computeBoundingBox();
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = name;
        out.push(mesh);
        tris += triangles(mesh);
        box.union(geometry.boundingBox as Box3);
      } else if (item.kind === "instances") {
        // A device-resident item THROWS on `batches`; this page cooks on
        // the CPU, so one here is a surprise worth naming, not drawing.
        if (item.deviceBatches !== undefined) {
          problems.push(`${name}: device-resident instances; this page draws CPU batches only`);
          continue;
        }
        for (const mesh of toInstancedMeshes(item.batches, ASSETS)) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.name = name;
          out.push(mesh);
          instances += mesh.count;
        }
      }
    } catch (err) {
      problems.push(`${name}: ${message(err)}`);
    }
  }
  return { meshes: out, triangles: tris, instances };
}

async function main(): Promise<void> {
  const problems: string[] = [];
  statCook("cooking…");
  // `?laced` builds the web bars as laced lattice struts (about 1.5M
  // triangles more): the second of the tower's self-similar scales.
  // `?rivets` sets rivets on them as instances, and so implies `?laced`.
  const params = new URLSearchParams(location.search);
  const rivets = params.has("rivets");
  const laced = params.has("laced") || rivets;
  const graph = buildEiffel(1889, { lacedWeb: laced, rivets });
  // Shown before the cook, so a graph that fails to cook can still be read.
  attachGraphPanel([{ name: "eiffel skeleton", graph }], { into: graphSlot, title: "graph" });

  const t0 = performance.now();
  const { outputs } = await cook(graph);
  statCook(`${(performance.now() - t0).toFixed(0)} ms`);

  const box = new Box3();
  let total = 0;
  let riveted = 0;
  /** Drawn outputs the "show" select can isolate one at a time (not rivets). */
  const present: string[] = [];
  const keep = (name: string, drawn: Drawn): void => {
    for (const mesh of drawn.meshes) scene.add(mesh);
    meshes.set(name, drawn.meshes);
    total += drawn.triangles;
    riveted += drawn.instances;
  };
  for (const cls of PART_CLASSES) {
    const collection = outputs[cls];
    if (collection === undefined) {
      classStats[cls]("absent");
      continue;
    }
    const drawn = draw(cls, collection, MATERIALS[cls], box, problems);
    if (drawn.meshes.length === 0) {
      classStats[cls]("no mesh");
      continue;
    }
    keep(cls, drawn);
    present.push(cls);
    classStats[cls](drawn.triangles.toLocaleString());
  }
  // Everything else the cook put out: the rivets, and any output no class
  // names, which gets a stat line of its own so it cannot pass unseen.
  for (const [name, collection] of Object.entries(outputs)) {
    if ((PART_CLASSES as readonly string[]).includes(name)) continue;
    const drawn = draw(name, collection, UNCLASSED, box, problems);
    if (!isRivets(name)) {
      overlay.addStat(`${name} (unclassed)`)(
        drawn.meshes.length === 0 ? "no mesh" : drawn.triangles.toLocaleString(),
      );
    }
    if (drawn.meshes.length === 0) continue;
    keep(name, drawn);
    if (!isRivets(name)) present.push(name);
  }
  statTotal(total.toLocaleString());
  if (rivets || riveted > 0) {
    overlay.addStat("rivets")(riveted > 0 ? riveted.toLocaleString() : "absent");
  }
  const hasRivets = [...meshes.keys()].some(isRivets);

  if (box.isEmpty()) {
    statSize("—");
    fitSun(NOMINAL);
  } else {
    const s = box.getSize(new Vector3());
    statSize(`${s.x.toFixed(1)} × ${s.z.toFixed(1)} × ${s.y.toFixed(1)} m`);
    fitSun(box);
  }

  // Isolating one class is how a class is judged on its own; the shadows
  // are redrawn with it, so an isolated class shades only itself. A class
  // keeps its own rivets (`rivets.<class>`), and "rivets" shows them alone.
  if (meshes.size > 1) {
    const options = [
      { value: "all", label: "all classes" },
      ...present.map((c) => ({ value: c, label: c })),
    ];
    if (hasRivets) options.push({ value: "rivets", label: "rivets" });
    overlay.addSelect("show", options, "all", (v) => {
      for (const [name, list] of meshes) {
        const on =
          v === "all" || v === name || (isRivets(name) && (v === "rivets" || name === `rivets.${v}`));
        for (const m of list) m.visible = on;
      }
      renderer.shadowMap.needsUpdate = true;
    });
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

main()
  .then(() => {
    // Two frames after the scene is complete — the first draws the shadow
    // map — `data-ready` tells a scripted capture it can shoot.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.dataset.ready = "1";
      }),
    );
  })
  .catch((err: unknown) => {
    statCook("failed");
    report([message(err)]);
    document.body.dataset.ready = "failed";
  });
