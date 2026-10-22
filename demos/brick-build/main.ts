/**
 * brick build — the corpus brick house, played back course by course.
 *
 * WHAT NEEDS A HOST HERE IS A CLOCK. `brickConnectivity` gives every brick
 * of the house a build STEP: the order you could build it in, bottom up,
 * each brick attached to something already standing when it is placed
 * (-1 for a brick no order can attach). The corpus graph shows the build
 * after step t by filtering on that number, and that is all a graph can
 * do with it: the field grammar has no time input, so a graph that played
 * the build would be cooked once per frame. This page cooks the house
 * ONCE, lets the step out of the graph as a per-instance channel, and
 * plays it back in the vertex shader against a time the page owns. Play,
 * scrub and speed never cook; only a new seed or a new lot does.
 *
 * THE PATTERN IS THE LANTERNS', with lighting kept. `lanterns` binds a
 * `ShaderMaterial` to an integer channel and derives everything from it;
 * a house wants a sun and shadows, so here the stock standard material
 * is kept and the same integer read is spliced into its vertex stage
 * (`onBeforeCompile`), and into the depth material its shadow is drawn
 * with, so a brick that has not arrived casts nothing either.
 *
 * THE RULE THE SHADER RUNS is the corpus graph's own filter, moved onto
 * a clock. Build time `t` counts steps; a brick of step s is hidden until
 * t passes s and falls into place over the next step, landing at s + 1 as
 * the next course starts, so every brick of one step lands together. At
 * t = k + 1 the picture is exactly the graph cooked at `buildStep: k`:
 * the bricks with step <= k, and the studs standing on one of them that
 * the brick resting on them has not yet covered. A step -1 brick is
 * treated as arriving after the last step: no partial build shows it
 * hanging, and the finished house — the graph's whole build — has it.
 */
import { type DataCollection, type InstanceBatch, cook, isDeviceResidentInstances } from "pcg-ts";
import { type AssetMap, materialListOf, ownsGeometry, ownsMaterial, toInstancedMeshes } from "pcg-ts/three";
import {
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  type InstancedMesh,
  type Material,
  MeshDepthMaterial,
  MeshStandardMaterial,
  Mesh,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  RGBADepthPacking,
  Scene,
  Vector3,
  ACESFilmicToneMapping,
  WebGLRenderer,
  type WebGLProgramParametersWithUniforms,
  Group,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { collectSuppliedMeshes, createGraphAssetCache } from "../../shared/assets.js";
import { createFpsMeter } from "../../shared/fps.js";
import { frameCamera, measureDrawn } from "../../shared/frame.js";
import { attachGraphPanel, type GraphPanelHandle } from "../../shared/graph/panel.js";
import { createOverlay } from "../../shared/overlay.js";
import { makeRecooker } from "../../shared/recook.js";
import { attachWordmark } from "../../shared/wordmark.js";
import {
  CHANNELS,
  DEFAULT_SEED,
  HOUSE_OUTPUTS,
  HOUSE_PARAMS,
  OUTPUTS,
  buildHouseGraph,
} from "./graph.js";

// ------------------------------------------------------------------ //
// The playback rule, in the shader.
// ------------------------------------------------------------------ //

/** World units a brick falls from. A brick is 1.2 tall, so two courses' worth. */
const DROP = 2.4;

/**
 * The uniforms every brick, stud and pot material shares. ONE record, so
 * the loop writes the clock once: `onBeforeCompile` hands each program
 * these same objects rather than copies.
 */
const PLAYBACK = {
  /** Build time, in steps. */
  uT: { value: 0 },
  uDrop: { value: DROP },
  /** When a step -1 brick arrives: after the last step, with the whole build. */
  uNever: { value: 0 },
};

/**
 * The channels are renamed on the geometry before they reach the shader,
 * because `step` is a GLSL built-in function and a vertex input of that
 * name would hide it. The graph's names are the graph's; the shader's are
 * this page's, and the mapping lives here, on the host side.
 */
const SHADER_NAMES: Readonly<Record<string, string>> = {
  [CHANNELS.step]: "aStep",
  [CHANNELS.stepAbove]: "aStepAbove",
  [CHANNELS.brickAbove]: "aBrickAbove",
};

const DECLARE = /* glsl */ `
uniform float uT, uDrop, uNever;
in int aStep;
#ifdef STUD_COVER
in int aStepAbove;
in int aBrickAbove;
#endif
`;

/**
 * After `begin_vertex`, so `transformed` is the model-space vertex and the
 * instance matrix has not been applied: the drop is divided by the
 * instance's y scale to come out in world units, which works because a
 * brick only ever turns about y. A hidden instance collapses onto its own
 * origin — zero-area triangles draw and cast nothing.
 */
const PLACE = /* glsl */ `
{
  float arrive = aStep < 0 ? uNever : float(aStep);
  float shown = uT > arrive ? 1.0 : 0.0;
#ifdef STUD_COVER
  // Covered once the brick resting on it has landed. No brick above:
  // never covered. One above that is never attached: covered in the
  // whole build only, which is what the corpus graph's filter says.
  float cover = aBrickAbove < 0 ? 1e9 : (aStepAbove < 0 ? uNever : float(aStepAbove));
  if (uT >= cover + 1.0) shown = 0.0;
#endif
  float fall = 1.0 - clamp(uT - arrive, 0.0, 1.0);
  float sy = 1.0;
#ifdef USE_INSTANCING
  sy = max(length(instanceMatrix[1].xyz), 1e-4);
#endif
  transformed.y += uDrop * fall * fall / sy;
  transformed *= shown;
}
`;

function animate(shader: WebGLProgramParametersWithUniforms): void {
  Object.assign(shader.uniforms, PLAYBACK);
  const common = "#include <common>";
  const begin = "#include <begin_vertex>";
  if (!shader.vertexShader.includes(common) || !shader.vertexShader.includes(begin)) {
    throw new Error(
      "brick-build: the material's vertex shader has no <common> or <begin_vertex> chunk to splice the playback into",
    );
  }
  shader.vertexShader = shader.vertexShader
    .replace(common, `${common}\n${DECLARE}`)
    .replace(begin, `${begin}\n${PLACE}`);
}

/** What one batch is drawn with: the lit material and the shadow's. */
function makeMaterials(stud: boolean): { lit: MeshStandardMaterial; depth: MeshDepthMaterial } {
  const lit = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0 });
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  if (stud) {
    lit.defines = { ...lit.defines, STUD_COVER: "" };
    depth.defines = { ...depth.defines, STUD_COVER: "" };
  }
  lit.onBeforeCompile = animate;
  depth.onBeforeCompile = animate;
  return { lit, depth };
}

// ------------------------------------------------------------------ //
// The cook.
// ------------------------------------------------------------------ //

/** One cook of the house, measured for the panel and the clock. */
interface House {
  readonly graph: ReturnType<typeof buildHouseGraph>;
  /** Every output of the cook, the asset meshes among them. */
  readonly outputs: Readonly<Record<string, DataCollection>>;
  readonly bricks: readonly InstanceBatch[];
  readonly studs: readonly InstanceBatch[];
  readonly pots: readonly InstanceBatch[];
  /** `brickConnectivity`'s stepCount: steps 0 to stepCount - 1. */
  readonly stepCount: number;
  /** Bricks with step -1. */
  readonly unattached: number;
  /** placedBy[k]: bricks arrived once step k (stepCount for the -1s) has. */
  readonly placedBy: readonly number[];
  readonly brickCount: number;
  readonly cookMs: number;
}

function batchesOf(out: Readonly<Record<string, DataCollection>>, name: string): InstanceBatch[] {
  const batches: InstanceBatch[] = [];
  for (const item of out[name] ?? []) {
    if (item.kind !== "instances") continue;
    if (isDeviceResidentInstances(item)) {
      throw new Error(`brick-build: output "${name}" is device-resident; this page reads its channels on the CPU`);
    }
    batches.push(...item.batches);
  }
  return batches;
}

async function cookHouse(seed: number, params: Record<string, number>): Promise<House> {
  const t0 = performance.now();
  const graph = buildHouseGraph({ seed, params });
  const out = (await cook(graph)).outputs;
  const bricks = batchesOf(out, OUTPUTS.bricks);
  const studs = batchesOf(out, OUTPUTS.studs);
  const pots = batchesOf(out, OUTPUTS.pots);

  // The step count is the largest step plus one, which is what
  // `brickConnectivity` writes as its `stepCount` detail; a detail does
  // not ride an instance batch, so it is read back off the channel.
  let maxStep = -1;
  let unattached = 0;
  let brickCount = 0;
  for (const b of bricks) {
    const step = b.attributes?.[CHANNELS.step];
    if (!step) throw new Error(`brick-build: the "${OUTPUTS.bricks}" batch carries no "${CHANNELS.step}" channel`);
    brickCount += b.count;
    for (let i = 0; i < b.count; i++) {
      const s = step[i]!;
      if (s < 0) unattached++;
      else if (s > maxStep) maxStep = s;
    }
  }
  const stepCount = maxStep + 1;
  const hist = new Array<number>(stepCount + 1).fill(0);
  for (const b of bricks) {
    const step = b.attributes![CHANNELS.step]!;
    for (let i = 0; i < b.count; i++) hist[step[i]! < 0 ? stepCount : step[i]!]!++;
  }
  const placedBy: number[] = [];
  let run = 0;
  for (const n of hist) placedBy.push((run += n));
  return {
    graph,
    outputs: out,
    bricks,
    studs,
    pots,
    stepCount,
    unattached,
    placedBy,
    brickCount,
    cookMs: performance.now() - t0,
  };
}

// ------------------------------------------------------------------ //
// The page.
// ------------------------------------------------------------------ //

const BACKGROUND = 0x1b2027;
const GROUND = 0x323942;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(BACKGROUND, 1);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(BACKGROUND);
scene.fog = new Fog(BACKGROUND, 100, 400);
{
  // A little studio light in the plastic, so a face turned from the sun
  // still reads as a face. Built once; it never changes.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();
}

const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(40, 30, 40);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotateSpeed = 0.5;

scene.add(new HemisphereLight(0xe6edff, 0x3a332b, 0.9));

/**
 * The sun, from the side: the camera looks in from +x +z, the sun comes
 * from -x +z, so the front faces split into a lit side and a shaded side
 * and the house's shadow falls across the frame rather than behind it.
 */
const SUN_DIR = new Vector3(-0.75, 1.05, 0.55).normalize();
const sun = new DirectionalLight(0xfff0dc, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/**
 * The shadow camera fitted to the finished house and the ground its
 * shadow lands on — demos/eiffel's fit: every corner of the box, and
 * where that corner's shadow falls, measured in the light's own frame.
 * The finished house, not what has been placed so far, so the fit does
 * not move while the build plays.
 */
function fitShadow(box: Box3): void {
  const centre = box.getCenter(new Vector3());
  const reach = box.getSize(new Vector3()).length();
  sun.target.position.copy(centre);
  sun.target.updateMatrixWorld();
  sun.position.copy(centre).addScaledVector(SUN_DIR, reach);
  sun.updateMatrixWorld();
  const cam = sun.shadow.camera;
  cam.position.copy(sun.position);
  cam.lookAt(sun.target.position);
  cam.updateMatrixWorld(true);
  const toLight = cam.matrixWorld.clone().invert();
  const lo = new Vector3(Infinity, Infinity, Infinity);
  const hi = new Vector3(-Infinity, -Infinity, -Infinity);
  const corner = new Vector3();
  const onGround = new Vector3();
  const p = new Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y + DROP : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    );
    onGround.copy(corner).addScaledVector(SUN_DIR, -Math.max(corner.y, 0) / SUN_DIR.y);
    for (const q of [corner, onGround]) {
      p.copy(q).applyMatrix4(toLight);
      lo.min(p);
      hi.max(p);
    }
  }
  const margin = reach * 0.02;
  cam.left = lo.x - margin;
  cam.right = hi.x + margin;
  cam.bottom = lo.y - margin;
  cam.top = hi.y + margin;
  cam.near = Math.max(0.1, -hi.z - margin);
  cam.far = -lo.z + margin;
  cam.updateProjectionMatrix();
}

/** The table the house stands on; the baseplate is the house's own. */
const ground = new Mesh(
  new CircleGeometry(1, 96).rotateX(-Math.PI / 2),
  new MeshStandardMaterial({ color: GROUND, roughness: 0.95, metalness: 0 }),
);
ground.position.y = -0.002;
ground.receiveShadow = true;
scene.add(ground);

const house = new Group();
scene.add(house);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------ //
// The build.
// ------------------------------------------------------------------ //

const graphAssets = createGraphAssetCache();
let meshes: InstancedMesh[] = [];

function disposeMeshes(): void {
  for (const mesh of meshes) {
    house.remove(mesh);
    mesh.dispose();
    // `materialFor` minted these and handed them over: the page owns them.
    if (ownsMaterial(mesh)) for (const m of materialListOf(mesh.material)) m.dispose();
    mesh.customDepthMaterial?.dispose();
    // A batch with channels draws a geometry CLONE (the instanced columns
    // live on it); that clone is the mesh's. The cache's source is not.
    if (ownsGeometry(mesh)) mesh.geometry.dispose();
  }
  meshes = [];
}

/** The graph's own meshes for brick, stud and pot, the way the editor resolves them. */
function graphMeshes(outputs: Readonly<Record<string, DataCollection>>): AssetMap {
  const supplied = collectSuppliedMeshes(HOUSE_OUTPUTS, outputs);
  if (supplied.problems.length > 0) throw new Error(`brick-build: ${supplied.problems.join("; ")}`);
  // White: every batch carries its own colour, and three multiplies
  // instance colour by the material's.
  const map = graphAssets.resolve(supplied.meshes, () => ({ color: 0xffffff }));
  for (const id of ["brick", "stud", "pot"]) {
    if (map[id] === undefined) throw new Error(`brick-build: the graph supplied no "${id}" asset mesh`);
  }
  return map;
}

function build(h: House): void {
  disposeMeshes();
  const assets = graphMeshes(h.outputs);
  const depthFor = new Map<Material, MeshDepthMaterial>();
  const group = (
    part: string,
    batches: readonly InstanceBatch[],
    channels: readonly string[],
    stud: boolean,
  ): void => {
    const made = toInstancedMeshes(batches, assets, {
      requireChannels: channels,
      materialFor: () => {
        const { lit, depth } = makeMaterials(stud);
        depthFor.set(lit, depth);
        return lit;
      },
    });
    for (const mesh of made) {
      if (!ownsGeometry(mesh)) {
        throw new Error("brick-build: a batch with channels came back on a shared geometry; renaming its channels would reach every mesh");
      }
      for (const name of channels) {
        const attr = mesh.geometry.getAttribute(name);
        mesh.geometry.deleteAttribute(name);
        mesh.geometry.setAttribute(SHADER_NAMES[name]!, attr);
      }
      mesh.customDepthMaterial = depthFor.get(mesh.material as Material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // A falling brick is above its own bounds; the house is always in view.
      mesh.frustumCulled = false;
      mesh.userData.part = part;
      house.add(mesh);
      meshes.push(mesh);
    }
  };
  group(OUTPUTS.bricks, h.bricks, [CHANNELS.step], false);
  group(OUTPUTS.studs, h.studs, [CHANNELS.step, CHANNELS.stepAbove, CHANNELS.brickAbove], true);
  group(OUTPUTS.pots, h.pots, [CHANNELS.step], false);
  PLAYBACK.uNever.value = h.stepCount;
}

/** Frame the finished house, and size the shadow, floor and fog to it. */
function frameHouse(): void {
  // The finished house whatever the clock says: bounds are read off the
  // instance matrices, which the shader never changes.
  const framing = measureDrawn(house);
  if (framing === null) return;
  frameCamera(framing, camera, controls);
  fitShadow(framing.box);
  // The floor's edge is past where the fog has finished from every
  // orbit, so it never draws a horizon: its nearest rim is radius - d
  // from the camera, more than the fog's far.
  const d = camera.position.distanceTo(framing.center);
  ground.scale.setScalar(d * 5);
  (scene.fog as Fog).near = d * 1.3;
  (scene.fog as Fog).far = d * 3;
  controls.minDistance = framing.radius * 0.6;
  controls.maxDistance = d * 2;
}

// ------------------------------------------------------------------ //
// State, and the URL.
// ------------------------------------------------------------------ //

const query = new URLSearchParams(location.search);

/** The lot and storey params the panel exposes, as the graph declares them. */
const LOT = ["lotWidthMin", "lotWidthMax", "lotDepthMin", "lotDepthMax", "minStoreys", "maxStoreys"];
const BIG: Readonly<Record<string, number>> = {
  lotWidthMin: 32,
  lotWidthMax: 32,
  lotDepthMin: 32,
  lotDepthMax: 32,
  minStoreys: 4,
  maxStoreys: 4,
};

const declared = new Map(HOUSE_PARAMS.map((p) => [p.name, p]));
for (const name of LOT) {
  if (!declared.has(name)) throw new Error(`brick-build: the house graph no longer declares "${name}"`);
}

const seedArg = Number.parseInt(query.get("seed") ?? "", 10);
const speedArg = Number.parseFloat(query.get("speed") ?? "");
const state = {
  seed: Number.isFinite(seedArg) ? seedArg >>> 0 : DEFAULT_SEED,
  params: Object.fromEntries(
    LOT.map((n) => [n, query.has("big") ? BIG[n]! : declared.get(n)!.value]),
  ) as Record<string, number>,
  /** Build time in steps; see the file header. */
  t: 0,
  playing: !query.has("still") && !query.has("step"),
  speed: Number.isFinite(speedArg) && speedArg > 0 ? speedArg : 4,
  orbit: !query.has("still"),
};
/** `?step=k` opens paused on step k; `?step=all` on the finished house. */
let pendingStep: number | "all" | undefined = query.has("step")
  ? query.get("step") === "all"
    ? "all"
    : Math.max(0, Number.parseInt(query.get("step") ?? "0", 10) || 0)
  : undefined;

let current: House | undefined;

/** The last slider value: the last step, or one past it when -1 bricks exist. */
const lastStep = (h: House): number => (h.unattached > 0 ? h.stepCount : h.stepCount - 1);
const endTime = (h: House): number => lastStep(h) + 1;
/** The step the clock is on: the last one that has started falling. */
const stepAt = (h: House, t: number): number => Math.min(Math.max(Math.ceil(t) - 1, 0), lastStep(h));
const placedAt = (h: House, t: number): number => {
  const k = Math.ceil(t) - 1;
  return k < 0 ? 0 : h.placedBy[Math.min(k, h.placedBy.length - 1)]!;
};

// ------------------------------------------------------------------ //
// The panel.
// ------------------------------------------------------------------ //

const overlay = createOverlay({
  title: "Brick build",
  info:
    "A split grammar derives the house, packBricks lays it in catalogue bricks, and " +
    "brickConnectivity gives each brick the step at which it can be placed, attached to " +
    "something already standing. Cooked once; the page plays each brick's step on its own " +
    "clock, so scrubbing never cooks again.",
});

const transport = overlay.addSlot("controls");
transport.style.cssText = "display:flex;gap:0.5em;margin:0.2em 0 0.5em";
const BUTTON_CSS =
  "cursor:pointer;background:none;border:1px solid currentColor;border-radius:4px;color:inherit;opacity:0.85;padding:0.2em 0.8em;font:inherit";
function button(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.title = title;
  b.style.cssText = BUTTON_CSS;
  b.addEventListener("click", onClick);
  transport.append(b);
  return b;
}
const playButton = button("Pause", "Play or pause the build", () => {
  if (!current) return;
  if (state.playing) state.playing = false;
  else {
    if (state.t >= endTime(current)) state.t = 0;
    state.playing = true;
  }
  syncTransport();
});
button("New house", "Reseed the graph and cook it once", () => {
  state.seed = (state.seed + 1) >>> 0;
  seedInput.value = String(state.seed);
  restart();
});
button("Big house", "A 32 x 32 stud lot, four storeys", () => {
  for (const name of LOT) {
    state.params[name] = BIG[name]!;
    setSlider(lotSliders.get(name)!, BIG[name]!);
  }
  restart();
});

/** Move a slider without firing it. */
function setSlider(row: HTMLDivElement, v: number, text = String(v)): void {
  const input = row.querySelector("input")!;
  input.value = String(v);
  const min = Number(input.min);
  const max = Number(input.max);
  input.style.setProperty("--p", `${max > min ? ((v - min) / (max - min)) * 100 : 0}%`);
  const val = row.querySelector(".pcg-val");
  if (val) val.textContent = text;
}

const stepLabel = (v: number): string =>
  current && current.unattached > 0 && v >= current.stepCount ? "all" : String(v);
const stepSlider = overlay.addSlider(
  "Step",
  { min: 0, max: 1, step: 1, value: 0, format: stepLabel },
  (v) => {
    // Scrubbing is a pause on that step, landed: t = k + 1 is the graph's
    // `buildStep: k`.
    state.playing = false;
    state.t = v + 1;
    syncTransport();
  },
);
overlay.addSlider(
  "Steps per second",
  { min: 0.5, max: 16, step: 0.5, value: state.speed, format: (v) => `${v}/s` },
  (v) => {
    state.speed = v;
  },
);
overlay.addCheckbox("Orbit", state.orbit, (on) => {
  state.orbit = on;
});
overlay.addSeed(state.seed, (seed) => {
  state.seed = seed;
  restart();
});
const seedInputs = overlay.el.querySelectorAll<HTMLInputElement>('input[type="number"]');
const seedInput = seedInputs[seedInputs.length - 1]!;

const LOT_LABELS: Readonly<Record<string, string>> = {
  lotWidthMin: "Lot width min",
  lotWidthMax: "Lot width max",
  lotDepthMin: "Lot depth min",
  lotDepthMax: "Lot depth max",
  minStoreys: "Storeys min",
  maxStoreys: "Storeys max",
};
const lotSliders = new Map<string, HTMLDivElement>();
for (const name of LOT) {
  const p = declared.get(name)!;
  const row = overlay.addSlider(
    LOT_LABELS[name]!,
    {
      min: p.min ?? 1,
      max: p.max ?? 32,
      // The graph rounds a lot side down to an even number of studs.
      step: name.startsWith("lot") ? 2 : 1,
      value: state.params[name]!,
    },
    (v) => {
      state.params[name] = v;
      restart();
    },
  );
  if (p.description) row.title = p.description;
  lotSliders.set(name, row);
}

const statFps = overlay.addStat("FPS");
const statBricks = overlay.addStat("Bricks");
const statStuds = overlay.addStat("Studs");
const statSteps = overlay.addStat("Steps");
const statUnattached = overlay.addStat("Unattached");
const statCook = overlay.addStat("Cook");

// The graph sits under the readouts, in this page's own panel.
const graphSlot = overlay.addSlot();
let graphPanel: GraphPanelHandle | undefined;

attachWordmark();

function syncTransport(): void {
  playButton.textContent = state.playing ? "Pause" : current && state.t >= endTime(current) ? "Replay" : "Play";
}

// ------------------------------------------------------------------ //
// Cooking.
// ------------------------------------------------------------------ //

let firstCook = true;
const recook = makeRecooker(async () => {
  const next = await cookHouse(state.seed, state.params);
  build(next);
  current = next;
  const studCount = next.studs.reduce((n, b) => n + b.count, 0);
  statStuds(studCount.toLocaleString());
  statSteps(`0–${next.stepCount - 1}`);
  statUnattached(next.unattached.toLocaleString());
  statCook(`${next.cookMs.toFixed(0)} ms`);
  const input = stepSlider.querySelector("input")!;
  input.max = String(lastStep(next));
  frameHouse();
  if (pendingStep !== undefined) {
    state.t = pendingStep === "all" ? endTime(next) : Math.min(pendingStep, lastStep(next)) + 1;
    state.playing = false;
    pendingStep = undefined;
  }
  syncTransport();
  const graphs = [{ name: "Brick house", graph: next.graph }];
  if (graphPanel) graphPanel.set(graphs);
  else graphPanel = attachGraphPanel(graphs, { into: graphSlot, title: "Graph" });
  if (firstCook) {
    firstCook = false;
    // Two frames, so the readiness flag follows a drawn picture.
    requestAnimationFrame(() => requestAnimationFrame(() => (document.body.dataset.ready = "1")));
  }
});

/** A new house: cook it once and build it from the first step. */
function restart(): void {
  state.t = 0;
  state.playing = true;
  syncTransport();
  recook();
}

// ------------------------------------------------------------------ //
// The probe: for the capture script and for checking playback.
// ------------------------------------------------------------------ //

declare global {
  interface Window {
    pcgBrickBuild?: {
      /** Pause on step k landed (`buildStep: k`), or the finished house. */
      seek(step: number | "all"): void;
      /** Pause at build time t, in steps: step k falls over (k, k + 1]. */
      seekTime(t: number): void;
      pause(on: boolean): void;
      probe(): Record<string, unknown>;
    };
  }
}

window.pcgBrickBuild = {
  seek(step) {
    if (!current) return;
    state.playing = false;
    state.t = step === "all" ? endTime(current) : Math.min(Math.max(step, 0), lastStep(current)) + 1;
    syncTransport();
  },
  seekTime(t) {
    if (!current) return;
    state.playing = false;
    state.t = Math.min(Math.max(t, 0), endTime(current));
    syncTransport();
  },
  pause(on) {
    state.playing = !on;
    syncTransport();
  },
  probe() {
    const h = current;
    return {
      seed: state.seed,
      params: { ...state.params },
      t: state.t,
      playing: state.playing,
      stepCount: h?.stepCount,
      lastStep: h ? lastStep(h) : undefined,
      step: h ? stepAt(h, state.t) : undefined,
      bricks: h?.brickCount,
      placed: h ? placedAt(h, state.t) : undefined,
      unattached: h?.unattached,
      meshes: meshes.map((m) => ({
        part: m.userData.part as string,
        count: m.count,
        channels: Object.keys(m.geometry.attributes).filter((a) => a.startsWith("a")),
      })),
    };
  },
};

// ------------------------------------------------------------------ //
// The loop.
// ------------------------------------------------------------------ //

const tickFps = createFpsMeter(statFps);
let last = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  const h = current;
  if (h) {
    if (state.playing) {
      state.t += dt * state.speed;
      if (state.t >= endTime(h)) {
        state.t = endTime(h);
        state.playing = false;
        syncTransport();
      }
    }
    PLAYBACK.uT.value = state.t;
    const k = stepAt(h, state.t);
    setSlider(stepSlider, k, stepLabel(k));
    statBricks(`${placedAt(h, state.t).toLocaleString()} of ${h.brickCount.toLocaleString()}`);
  }
  controls.autoRotate = state.orbit;
  controls.update();
  renderer.render(scene, camera);
  tickFps();
});

recook();
