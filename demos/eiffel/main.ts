/**
 * eiffel — the procedural Eiffel Tower skeleton, set out to be judged by eye.
 *
 * The graph (`graph.ts`) is the whole of the tower: Eiffel's 29 panels
 * from Plate XXXI and the rules that brace and lace them. This page cooks
 * it once and stands the result in daylight. Nothing here generates or
 * corrects anything — what is on screen is what the graph settled.
 *
 * ONE THING MOVES, AND IT IS THE PAGE'S. The six lift cars ride their
 * runs, slowly, at about a metre a second: four up and down the legs'
 * inclined tracks, and the Edoux pair counterweighted against each other
 * in the shaft so one climbs toward the 3rd floor as the other drops
 * toward the 2nd. The graph settles where a car CAN be — each car is its
 * own `car.<name>` output, and `lifts.ts` publishes the run it rides as
 * `LIFT_CARS` — and this page owns the clock, which is the same division
 * the lanterns demo draws. `?still` parks them all where the graph built
 * them, which is what every scripted capture of this page asks for.
 *
 * DAYLIGHT, WITH SHADOWS, because that is how the lattice reads. A braced
 * panel seen flat-lit is a hatched silhouette; the same panel under a low
 * sun throws its web onto the members behind it and onto the ground, and
 * the depth of the lattice becomes legible. So the sun casts, the shadow
 * camera is fitted to what was actually built (and to where its shadow
 * lands), and the map is only re-rendered when the scene changes: the
 * light and the geometry are both fixed, so orbiting costs no shadow pass.
 *
 * AND WITH OCCLUSION, which is the half of the read the sun cannot do. A
 * structure that is mostly holes is described by where its members meet,
 * and those corners are exactly what a single sun leaves flat. The dark
 * that collects in them is ambient occlusion, and it costs three more
 * full-scene passes (a normal prepass, the occlusion, a denoise) on top
 * of the draw.
 *
 * THE LOOK IS ONE OBJECT, not a scatter of statements. `look.ts` holds it
 * — environment, five lights, fog, exposure, occlusion, vignette —
 * `rig.ts` turns it into a scene, and `env.ts`, `gtao.ts` and
 * `vignette.ts` are what those two stand on. A new look is a new object
 * and nothing else.
 *
 * ONE MATERIAL PER CLASS, all in one family. The iron is painted one
 * colour on the real tower, and a render that gave every class its own hue
 * would read as a diagram, not a structure. The classes are nudged apart
 * just enough to tell them apart up close. The stone leaves the family
 * because it is a different material, the decks take its lightest paint,
 * and the names are gilded.
 *
 * THE RIVETS ARE INSTANCES, not mesh. `?rivets` (which implies `?laced`)
 * makes the cook put out `rivets*` outputs of instance batches — about 885,000
 * of them — and the page draws each batch as one instanced unit-size dome
 * whose instance matrix carries the rivet's true size. They receive the
 * sun's shadow but do not cast it: a head 13 mm high throws nothing a
 * 4096 map over the fitted 180 x 342 m frustum (4-8 cm a texel) could
 * resolve, and casting would put
 * all of those instances into every shadow pass.
 *
 * TWO KNOBS, and only two. `?plateSet=` and `?plateEdge=` are the crossing
 * plates' depth under the corner angles and their half-width across the
 * member, in metres, defaulting to 0.015 and 0.4. They exist because those
 * two dimensions are settled by eye rather than read off a plate, and a
 * reload is a shorter loop than an edit and a rebuild. Nothing else on this
 * page is tunable, and nothing else should be: every other number in the
 * tower is either sourced or derived from one that is.
 *
 * Offline quality first: this page does not try to be fast yet.
 */
import { type DataCollection, cook } from "pcg-ts";
import { type AssetMap, toBufferGeometry, toInstancedMeshes } from "pcg-ts/three";
import {
  ACESFilmicToneMapping,
  Box3,
  type BufferGeometry,
  DoubleSide,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
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
import { type CarRun, LIFT_CARS } from "./lifts.js";
import { LOOK } from "./look.js";
import { PART_CLASSES, type PartClass } from "./parts.js";
import { NEUTRAL, createRig } from "./rig.js";

// ------------------------------------------------------------------ //
// The look.
// ------------------------------------------------------------------ //

/**
 * The palette. The iron is the tower's brown family throughout, each class
 * a step lighter or darker than its neighbours; the floors' fit-out takes
 * the family's lighter end, the names are gilded, and the pedestals are
 * pale stone.
 */
const PALETTE: Record<PartClass, { color: number; roughness: number; metalness: number }> = {
  uprights: { color: 0x6b4d3b, roughness: 0.62, metalness: 0.15 },
  bracing: { color: 0x7b5b45, roughness: 0.66, metalness: 0.12 },
  horizontals: { color: 0x735441, roughness: 0.64, metalness: 0.12 },
  girders: { color: 0x654736, roughness: 0.62, metalness: 0.15 },
  arches: { color: 0x846550, roughness: 0.6, metalness: 0.12 },
  // The floors' fit-out — arcades, pavilions, skirts, railings — is the
  // same painted iron as the lattice, so it takes the family's lighter end:
  // it sits in its own shade, and a darker paint read as solid black.
  platforms: { color: 0x7d5e48, roughness: 0.7, metalness: 0.1 },
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
    new MeshStandardMaterial({ ...PALETTE[cls], side: DoubleSide }),
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
 * 16 around and 3 rings is 80 triangles, and there are about 885,000 of these.
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
 * Does this output carry a lift car? The cook names them `car.<name>`,
 * one output per car, because each is a body this page moves along its
 * own run and a merged class would weld all six together.
 */
function isCar(name: string): boolean {
  return name.startsWith("car.");
}

/**
 * The tower's nominal envelope — Plate XXXI's base square with some room,
 * to the top of the campanile. The shadow camera is fitted to what the
 * cook actually built; this is only the fallback when it built nothing.
 */
const NOMINAL = new Box3(new Vector3(-90, 0, -90), new Vector3(90, 320, 90));

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
// The exposure is the look's, set by the rig; the operator is fixed here.
renderer.shadowMap.enabled = true;
// PCF, not PCF-soft: the soft variant is deprecated in this three and
// falls back to this one with a warning. The look's shadow `radius` does
// the softening.
renderer.shadowMap.type = PCFShadowMap;
// Both the light and the geometry are fixed, so the shadow map is drawn
// when the scene changes and never on account of the camera.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
document.body.appendChild(renderer.domElement);

const scene = new Scene();
// Until the rig is applied, a few lines down. Everything about the sky,
// the fog and the ground is the look's from then on.
scene.background = NEUTRAL;

// 3/4 view from about 600 m out, a little above the first floor: the
// whole 312 m fits with room over the lantern, and the base square is
// seen on its diagonal so all four legs are in view.
const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(360, 140, 470);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 110, 0);
/**
 * `?still` parks every lift car where the graph built it.
 *
 * A scripted capture waits for two byte-identical frames, which a page
 * with something moving in it never gives it, so every shot this repo
 * takes of the tower asks for the still page (`scripts/capture-guides.mjs`,
 * `scripts/capture-demos.mjs`). It is also the honest frame for a figure
 * about STRUCTURE: parked, each car stands at the sourced moment
 * `lifts.ts` places it at. The panel's "lifts" checkbox is the same
 * switch, and opens set to this.
 */
/**
 * Read a set of numeric query params into a partial record, leaving out
 * any that were absent or not a finite number — so a typo falls back to
 * the built-in value rather than to NaN, and an untouched knob stays
 * absent instead of restating its own default.
 */
function tuned<K extends string>(
  params: URLSearchParams,
  keys: Record<K, string>,
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const [key, param] of Object.entries(keys) as Array<[K, string]>) {
    const raw = params.get(param);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

const STILL = new URLSearchParams(location.search).has("still");

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

/**
 * The look, made into a scene.
 *
 * Five lights, the environment, the fog, the exposure, the render path
 * and the occlusion all come from one `Look` object (`look.ts`), applied
 * by a rig that knows nothing tower-shaped (`rig.ts`). What this page
 * still owns is the palette — the colour each part class is painted —
 * which it hands the rig so a look can state its differences from it.
 */
const rig = createRig(renderer, scene, camera, MATERIALS, {
  width: window.innerWidth * renderer.getPixelRatio(),
  height: window.innerHeight * renderer.getPixelRatio(),
});
rig.apply(LOOK);
rig.fitShadow(NOMINAL);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // The composer's buffers are in device pixels, which is what the
  // renderer's own size is multiplied by and the window's is not.
  const r = renderer.getPixelRatio();
  rig.setSize(window.innerWidth * r, window.innerHeight * r);
});

// ------------------------------------------------------------------ //
// The panel.
// ------------------------------------------------------------------ //

const overlay = createOverlay({
  title: "eiffel",
  info:
    "Eiffel's 29 panels from Plate XXXI — four legs merging into one shaft — with every " +
    "member below the panel scale placed by rule. Cooked once, drawn as it came out of the " +
    "graph, one material per part class. The six lift cars are the one thing that moves: they " +
    "ride their runs at about a metre a second, the Edoux pair counterweighted against each " +
    "other. Orbit to judge it; the shadows are how the lattice reads.",
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

// The lifts run unless `?still` parked them. Off leaves every car exactly
// where it stands, which is how a car is looked at rather than watched.
let liftsRunning = !STILL;
overlay.addCheckbox("lifts", !STILL, (on) => {
  liftsRunning = on;
});

// THE DETAIL LEVELS, as links rather than a control: each is a plain URL
// (the page reads it once, at load, and cooks at that depth), so a level
// can be bookmarked or sent, and each link carries the current camera pose
// in `cam`, so moving between levels keeps the view — the point of having
// them side by side is to compare the same spot at each depth.
const DETAILS = [
  { key: "", label: "skeleton", title: "solid members: the panels and their rules" },
  { key: "laced", label: "laced", title: "every web member as four angles laced in X" },
  { key: "rivets", label: "rivets", title: "laced, and every rivet as an instance" },
] as const;

function currentDetail(): string {
  const params = new URLSearchParams(location.search);
  return params.has("rivets") ? "rivets" : params.has("laced") ? "laced" : "";
}

const detailSlot = overlay.addSlot();
const detailRow = document.createElement("div");
detailRow.style.cssText = "display:flex;gap:0.9em;align-items:baseline";
const detailLabel = document.createElement("span");
detailLabel.textContent = "detail";
detailLabel.style.opacity = "0.7";
detailRow.append(detailLabel);
const detailLinks = DETAILS.map((d) => {
  const a = document.createElement("a");
  a.textContent = d.label;
  a.title = d.title;
  a.style.cssText = "color:inherit;text-underline-offset:3px";
  detailRow.append(a);
  return { d, a };
});
detailSlot.append(detailRow);

/** Point every level's link at the current view. */
function refreshDetailLinks(): void {
  const p = camera.position;
  const t = controls.target;
  const cam = [p.x, p.y, p.z, t.x, t.y, t.z].map((v) => v.toFixed(2)).join(",");
  const here = currentDetail();
  for (const { d, a } of detailLinks) {
    // `still` rides along with the pose, for the same reason: a scripted
    // capture moves between depths by following these links, and a page
    // that started its lifts again at the next depth would never settle.
    const query = [d.key, STILL ? "still" : "", `cam=${cam}`].filter(Boolean).join("&");
    a.href = `?${query}`;
    const current = d.key === here;
    a.style.fontWeight = current ? "600" : "400";
    a.style.opacity = current ? "1" : "0.75";
    if (current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}
controls.addEventListener("end", refreshDetailLinks);
refreshDetailLinks();

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

/**
 * Give every vertex that arrived with a ZERO normal its triangle's face
 * normal. A mesh source that writes no `normal` (meshPrimitive's boxes),
 * merged into a class with one that does, has its normals zero-filled by
 * the merge, and a lit material shades (0, 0, 0) black — see PLAN.md's
 * backlog. The modules write their own normals where they can; this is
 * the page's net for what slips through, and it leaves every real normal
 * as the graph wrote it.
 */
function repairZeroNormals(geometry: BufferGeometry): void {
  const normal = geometry.getAttribute("normal");
  const position = geometry.getAttribute("position");
  if (normal === undefined || position === undefined) return;
  const index = geometry.index;
  const vertexOf = (corner: number): number => (index === null ? corner : index.getX(corner));
  const corners = index === null ? position.count : index.count;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  let repaired = 0;
  for (let t = 0; t + 2 < corners; t += 3) {
    const v = [vertexOf(t), vertexOf(t + 1), vertexOf(t + 2)] as const;
    const zero = v.filter(
      (i) => normal.getX(i) === 0 && normal.getY(i) === 0 && normal.getZ(i) === 0,
    );
    if (zero.length === 0) continue;
    a.fromBufferAttribute(position, v[0]);
    b.fromBufferAttribute(position, v[1]);
    c.fromBufferAttribute(position, v[2]);
    const n = c.sub(b).cross(a.sub(b)).normalize();
    for (const i of zero) normal.setXYZ(i, n.x, n.y, n.z);
    repaired += zero.length;
  }
  if (repaired > 0) normal.needsUpdate = true;
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
        repairZeroNormals(geometry);
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
  // `?laced` builds the web bars as laced lattice struts (about 2.9M
  // triangles more): the second of the tower's self-similar scales.
  // `?rivets` sets rivets on them as instances, and so implies `?laced`.
  const params = new URLSearchParams(location.search);
  const rivets = params.has("rivets");
  const laced = params.has("laced") || rivets;
  // `?plateSet=` and `?plateEdge=` are the crossing plates' two by-eye
  // dimensions (`CrossPlate` in parts.ts), in metres, while they are being
  // settled: the plate's depth under the corner angles and its half-width
  // across its member. They are the only numbers on this page that can be
  // changed from outside, because they are the only ones nothing derives.
  const crossPlate = tuned(params, { set: "plateSet", edge: "plateEdge" });
  const graph = buildEiffel(1889, { lacedWeb: laced, rivets, crossPlate });
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
  // Everything else the cook put out: the rivets, the lift cars, and any
  // output no class names, which gets a stat line of its own so it cannot
  // pass unseen.
  let carTriangles = 0;
  for (const [name, collection] of Object.entries(outputs)) {
    if ((PART_CLASSES as readonly string[]).includes(name)) continue;
    const named = isRivets(name) || isCar(name);
    // A car is the lifts' own fit-out, so it wears the platforms' paint;
    // only a genuinely unclassed output gets the grey.
    const drawn = draw(name, collection, isCar(name) ? MATERIALS.platforms : UNCLASSED, box, problems);
    if (!named) {
      overlay.addStat(`${name} (unclassed)`)(
        drawn.meshes.length === 0 ? "no mesh" : drawn.triangles.toLocaleString(),
      );
    }
    if (drawn.meshes.length === 0) continue;
    keep(name, drawn);
    if (!named) present.push(name);
    if (isCar(name)) {
      carTriangles += drawn.triangles;
      const run = LIFT_CARS.find((r) => `car.${r.name}` === name);
      if (run === undefined) {
        problems.push(`${name}: the graph declared this car but published no run for it`);
        continue;
      }
      for (const mesh of drawn.meshes) {
        // A moving body cannot cast into a shadow map that is drawn once
        // (`shadowMap.autoUpdate` is off): its shadow would stay where the
        // car was. Redrawing the map every frame means re-rendering the whole
        // tower into 4096² from the sun, which at the riveted depth is
        // millions of triangles a frame for the shadow of a 4 m box.
        mesh.castShadow = false;
        cars.push({ mesh, run });
      }
    }
  }
  if (cars.length > 0) {
    overlay.addStat("lift cars")(
      `${cars.length}${STILL ? " parked" : " running"}, ${carTriangles.toLocaleString()} tri`,
    );
  }
  statTotal(total.toLocaleString());
  if (rivets || riveted > 0) {
    overlay.addStat("rivets")(riveted > 0 ? riveted.toLocaleString() : "absent");
  }
  // Only when something was overridden: the default page says nothing about
  // a knob nobody turned.
  const turned = Object.entries(crossPlate);
  if (turned.length > 0) {
    overlay.addStat("plate")(turned.map(([k, v]) => `${k} ${v}`).join(", "));
  }
  const hasRivets = [...meshes.keys()].some(isRivets);

  if (box.isEmpty()) {
    statSize("—");
    rig.fitShadow(NOMINAL);
  } else {
    const s = box.getSize(new Vector3());
    statSize(`${s.x.toFixed(1)} × ${s.z.toFixed(1)} × ${s.y.toFixed(1)} m`);
    rig.fitShadow(box);
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
          v === "all" ||
          v === name ||
          (isRivets(name) && (v === "rivets" || name === `rivets.${v}`)) ||
          // A car rides with the fit-out it is painted like; it has no
          // entry of its own, the way a class' rivets have none.
          (isCar(name) && v === "platforms");
        for (const m of list) m.visible = on;
      }
      renderer.shadowMap.needsUpdate = true;
    });
  }

  report(problems);
}

// ------------------------------------------------------------------ //
// The lifts.
// ------------------------------------------------------------------ //

/** A car's mesh and the run it rides. */
const cars: Array<{ mesh: Mesh; run: CarRun }> = [];

/**
 * Where a car stands in its cycle at `t` seconds: 0 at its run's `from`,
 * 1 at its `to`.
 *
 * Up, wait, down, wait — a lift's own round. The two travels are eased
 * (3t² − 2t³) rather than linear, so a car leaves and arrives instead of
 * snapping into full speed: at these distances the ends are the only part
 * of the motion a viewer can actually read.
 */
function carPhase(run: CarRun, t: number): number {
  const cycle = 2 * (run.trip + run.dwell);
  const rise = run.trip / cycle;
  const wait = run.dwell / cycle;
  let p = (((t / cycle + run.phase) % 1) + 1) % 1;
  if (p < rise) return ease(p / rise);
  p -= rise;
  if (p < wait) return 1;
  p -= wait;
  if (p < rise) return ease(1 - p / rise);
  return 0;
}

const ease = (x: number): number => x * x * (3 - 2 * x);

/**
 * Put every car where its run has it at `t` seconds. A car is a rigid
 * body over its whole run (`lifts.ts` explains why that holds), so this
 * is one offset along the run's own direction and never a rebuild.
 */
function moveCars(t: number): void {
  for (const { mesh, run } of cars) {
    const d = run.from + (run.to - run.from) * carPhase(run, t) - run.at;
    mesh.position.set(run.step[0] * d, run.step[1] * d, run.step[2] * d);
  }
}

// ------------------------------------------------------------------ //
// The loop.
// ------------------------------------------------------------------ //

const tickFps = createFpsMeter(statFps);

let clock = 0;
let lastFrame = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  // Accumulated from CLAMPED deltas rather than read off the wall clock:
  // rAF stops while the tab is hidden and `performance.now()` does not, so
  // a page left in the background and come back to would otherwise
  // teleport its cars the length of the tower.
  // The clock only runs while the lifts do, so unchecking "lifts" stops
  // the cars where they stand rather than letting them travel unseen and
  // jump on the way back.
  if (liftsRunning) {
    clock += Math.min((now - lastFrame) / 1000, 0.1);
    moveCars(clock);
  }
  lastFrame = now;
  // A driven camera is not an orbited one: `update()` would re-derive the
  // pose from the controls' own spherical and clamp it back inside
  // `maxPolarAngle` and the distance limits, which is exactly what a shot
  // looking up a leg from the ground is outside of.
  if (!driven) controls.update();
  rig.render();
  tickFps();
});

/**
 * The capture probe.
 *
 * A scripted capture has to own two things this page otherwise owns
 * itself: WHERE THE CAMERA IS, and WHAT TIME IT IS. `?cam=` answers the
 * first once, at load, which is the right shape for a screenshot and the
 * wrong one for a film — a camera move through this tower is hundreds of
 * poses, and reloading the page for each would recook 3.3M triangles
 * every frame. `?still` answers the second by stopping the clock, which
 * is a shot of parked cars rather than a shot at a chosen moment.
 *
 * So both are pushed in from outside instead, and nothing in here changes
 * what the page does on its own: a page nobody drives never calls any of
 * it.
 */
declare global {
  interface Window {
    pcgEiffel?: {
      /**
       * Put the camera at `eye` looking at `target`, both in metres, and
       * optionally change the lens. The first call takes the camera off
       * the orbit controls for good — damping and auto-rotate are both
       * functions of elapsed time, and a driven camera must land exactly
       * where it was told on the first frame, not ease toward it.
       */
      pose(
        eye: readonly [number, number, number],
        target: readonly [number, number, number],
        fov?: number,
      ): void;
      /**
       * Stop the page advancing its own lift clock, so `setClock` is the
       * only thing that moves the cars.
       */
      pause(on: boolean): void;
      /** Put every car where its run has it at `t` seconds. */
      setClock(t: number): void;
    };
  }
}

/** True once something outside has taken the camera; see `pose`. */
let driven = false;

window.pcgEiffel = {
  pose(eye, target, fov) {
    driven = true;
    controls.enabled = false;
    controls.enableDamping = false;
    controls.autoRotate = false;
    camera.position.set(eye[0], eye[1], eye[2]);
    controls.target.set(target[0], target[1], target[2]);
    if (fov !== undefined && fov !== camera.fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
  },
  pause(on) {
    liftsRunning = !on;
  },
  setClock(t) {
    clock = t;
    moveCars(clock);
  },
};

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
