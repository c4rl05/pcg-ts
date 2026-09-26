/**
 * eiffel — the procedural Eiffel Tower skeleton, set out to be judged by eye.
 *
 * The graph (`graph.ts`) is the whole of the tower: Eiffel's 29 panels
 * from Plate XXXI and the rules that brace and lace them. This page cooks
 * it once and stands the result in daylight. Nothing here generates or
 * corrects anything — what is on screen is what the graph settled.
 *
 * ONE THING MOVES, AND IT IS THE PAGE'S: the lifts. The cars ride their
 * runs, slowly, at about a metre a second: four up and down the legs'
 * inclined tracks, station to station, tipping as the rail bends under
 * them, and the Edoux pair counterweighted against each other
 * in the shaft so one climbs toward the 3rd floor as the other drops
 * toward the 2nd. Their machinery moves with them: the Roux chains round
 * their wheels, the Otis carriages and counterweight trucks, the Edoux
 * pistons, pulleys and cables. The graph settles where each CAN be —
 * each car and each moving part is its own `car.<name>` output, each chain
 * its own `chain.<name>` instances, and `lifts.ts` publishes how they move
 * (`LIFT_CARS`, `LIFT_FOLLOWERS`, `LIFT_CHAINS`) — and this page owns the
 * clock, which is the same division the lanterns demo draws. `?still`
 * parks them all where the graph built them, which is what every scripted
 * capture of this page asks for.
 *
 * AND THE FLAG, on the rod: the graph builds it flat (`cloth.flag`) and the
 * page flies it, every point every frame, from a pose that is a pure
 * function of time (`flag.ts`), so `?still` shows it as it flies at t = 0.
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
 * makes the cook put out `rivets*` outputs of instance batches — about 1.2 M
 * of them — and the page draws each batch as one instanced unit-size dome,
 * each head packed as its seat, rotation and two scales (24 bytes, not a
 * 64-byte matrix; rivetPack.ts) and rebuilt in the vertex shader, the
 * hand's drive (heads.ts) folded in. `?cpuRivets` draws them as matrices
 * instead, the way they were drawn before. They receive the
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
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  DoubleSide,
  FrontSide,
  type InstancedBufferGeometry,
  type InstancedMesh,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createFpsMeter } from "../../shared/fps.js";
import { attachGraphPanel } from "../../shared/graph/panel.js";
import { createOverlay } from "../../shared/overlay.js";
import { attachWordmark } from "../../shared/wordmark.js";
import { buildEiffel } from "./graph.js";
import {
  CHAIN_ASSETS,
  CHAIN_PIECES,
  type CarRun,
  type ChainRun,
  type Follower,
  LIFT_CARS,
  LIFT_CHAINS,
  LIFT_FOLLOWERS,
  carPose,
  chainShift,
  placeChain,
} from "./lifts.js";
import { LOOK } from "./look.js";
import { PART_CLASSES, type PartClass } from "./parts.js";
import { type PlateOverlay, loadPlateTool } from "./plateTool.js";
import { BALUSTER, CABOCHON_RISE, FITTING_ASSETS } from "./platforms.js";
import { NEUTRAL, createRig } from "./rig.js";
import { attachSection } from "./section.js";
import { rivetClass } from "./spec.js";
import { HEAD_DRIVE_ATTR, driveHead, driveMatrix } from "./heads.js";
import {
  PACKED_BYTES,
  type RivetBatch,
  type RivetFallback,
  isFallback,
  packRivets,
  packedRivetMaterial,
  packedRivetMesh,
  packedShaderProblem,
} from "./rivetPack.js";
import { BufferAttribute, DataTexture, NearestFilter, SRGBColorSpace } from "three";
import { FLAG_BANDS, FLAG_GRID, FLAG_POINTS, flagNormals, flagPose } from "./flag.js";
import { TIMBER, attachScrubber, buildDayParam, isWorks, isWorksIron, stageErection } from "./scrub.js";

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
  // What is under the ground: rubble, concrete and brick, a darker and
  // warmer stone than the pedestals' cast facing.
  foundations: { color: 0x9a8a76, roughness: 0.96, metalness: 0 },
  summit: { color: 0x72533f, roughness: 0.62, metalness: 0.15 },
  gussets: { color: 0x684a39, roughness: 0.6, metalness: 0.15 },
  // The names were gilded; the only thing on the tower that is not iron
  // paint or stone.
  names: { color: 0xc9a14a, roughness: 0.32, metalness: 0.85 },
  // The lifts' machinery: bare iron, oiled and worn rather than painted —
  // the family's darkest step, and a touch more metal.
  machinery: { color: 0x4f3a2e, roughness: 0.5, metalness: 0.3 },
  // Clear glass, faintly green as plate glass is, near-mirror smooth; the
  // see-through rest of it is set on the material below (`GLASS`).
  glass: { color: 0xb9ccc8, roughness: 0.06, metalness: 0 },
  // The arcade crescents' silvered, tinted cast glass « donnant l'aspect de
  // plaques dorées »: a mirror behind a warm tint, read as gilt; a shade
  // paler than the names' leaf. (Smoother, it mirrored the dark lattice
  // and read olive.)
  silvered: { color: 0xcfa84e, roughness: 0.3, metalness: 0.85 },
};

const MATERIALS = Object.fromEntries(
  PART_CLASSES.map((cls) => [
    cls,
    new MeshStandardMaterial({ ...PALETTE[cls], side: DoubleSide }),
  ]),
) as Record<PartClass, MeshStandardMaterial>;

/**
 * THE GLASS IS SEEN THROUGH, and that is the whole of its job: a pane
 * that hid the lattice behind it would undo the one thing the page is
 * for. So it is blended rather than transmitted — a transmission material
 * renders the opaque scene a second time into a texture every frame,
 * which at `?laced` is millions of triangles for the refraction of a few
 * hundred windows — at a low opacity, and it writes no depth, so panes
 * behind panes all show and the order they draw in cannot matter (the
 * same colour blended over itself commutes). Each pane is a thin solid,
 * so it is drawn FRONT faces only: the near face of the sheet and never
 * both, which would double every pane's tint. It casts no shadow (a depth
 * map knows no opacity, and every pane would print as a solid black
 * plate, dark on the restaurants and the gallery floor) but receives the
 * lattice's, which is how a window reads as standing in the sun; and the
 * occlusion pass leaves it out (`gtao.ts`), so the members behind the
 * glass keep their own.
 */
const GLASS = { opacity: 0.2 } as const;
Object.assign(MATERIALS.glass, {
  transparent: true,
  opacity: GLASS.opacity,
  depthWrite: false,
  side: FrontSide,
});

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
 * 16 around and 3 rings is 80 triangles, and there are about 1.2 M of these.
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
 * SHOP AND SITE RIVETS. Most of the tower's rivets were driven at
 * Levallois-Perret; the 1,050,846 the book counts were driven on the
 * Champ de Mars, hot, by gangs of four, and the paint went on over both
 * (spec.ts `COUNTS`; SOURCES.md §27.6). Which
 * output is which is spec.ts' `rivetClass`, one class per output, so the
 * tag is the batch: a site output draws in its own material and needs no
 * per-instance channel. By default the site heads are a step lighter and
 * rougher than the shop's — hand-closed and painted on the tower, in the
 * same paint — which reads up close and not from the ground [estimated];
 * the "site rivets" checkbox (or `?site`) lights them instead.
 */
const RIVET_TONE = {
  shop: { color: 0x5c4232, roughness: 0.58 },
  site: { color: 0x684a37, roughness: 0.68 },
  lit: { color: 0xe0782a, roughness: 0.5 },
} as const;
const RIVET_SHOP = new MeshStandardMaterial({ ...RIVET_TONE.shop, metalness: 0.18 });
const RIVET_SITE = new MeshStandardMaterial({ ...RIVET_TONE.site, metalness: 0.18 });
/** The same two, for packed heads (rivetPack.ts). */
const PACKED_SHOP = packedRivetMaterial(RIVET_SHOP);
const PACKED_SITE = packedRivetMaterial(RIVET_SITE);

/** Show the site rivets in their own tone, or lit up against the shop's. */
function lightSiteRivets(on: boolean): void {
  const tone = on ? RIVET_TONE.lit : RIVET_TONE.site;
  for (const m of [RIVET_SITE, PACKED_SITE]) {
    m.color.set(tone.color);
    m.roughness = tone.roughness;
  }
}

/**
 * What the cook's instance batches resolve against. The rivets are the
 * iron's family a step darker than any class: they sit proud of the plate
 * and read as its shaded dots. (A site rivet output is redrawn in
 * {@link RIVET_SITE} once drawn.)
 */
const ASSETS: AssetMap = {
  rivet: {
    geometry: rivetHead(),
    material: RIVET_SHOP,
  },
  // The 1st floor's fittings (platforms.ts): each a unit shape whose true
  // size the instance matrix carries, in the one material that is not
  // iron paint about it. Opaque: glazing is a later pass, not these.
  // The yellow glass cabochons in the arcades' crescents, « en verre jaune ».
  [FITTING_ASSETS.cabochon]: {
    geometry: dome(CABOCHON_RISE, 12, 3),
    material: new MeshStandardMaterial({ color: 0xd9a51f, roughness: 0.22, metalness: 0 }),
  },
  // The gas globes, « en verre dépoli »: a unit sphere about its centre.
  [FITTING_ASSETS.globe]: {
    geometry: new SphereGeometry(1, 16, 12),
    material: new MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.55, metalness: 0 }),
  },
  // The gallery's balusters « en grès verni », turned from their profile at
  // true size; the glaze's colour is not recorded, so a glazed buff.
  [FITTING_ASSETS.baluster]: {
    geometry: new LatheGeometry(
      BALUSTER.profile.map(([h, r]) => new Vector2(r, h)),
      12,
    ),
    material: new MeshStandardMaterial({ color: 0xb58d5c, roughness: 0.32, metalness: 0 }),
  },
  // The Roux chains' pieces (lifts.ts), at true size, their axles along z.
  ...chainAssets(),
};

/**
 * The Roux chain's three pieces at true size from `CHAIN_PIECES`, each with
 * its axle along local z: the axle with its two rollers, the bar (a metre
 * along x, which each instance scales to its length), and the lead-filled
 * box of a counterweight piston. Bare, oiled iron like the machinery.
 */
function chainAssets(): AssetMap {
  const { bar, axle, roller, weight } = CHAIN_PIECES;
  const material = new MeshStandardMaterial({ color: 0x3f2f26, roughness: 0.45, metalness: 0.35 });
  const alongZ = (g: BufferGeometry): BufferGeometry => g.rotateX(Math.PI / 2);
  const rollers = [-1, 1].map((side) =>
    alongZ(new CylinderGeometry(roller.diameter / 2, roller.diameter / 2, roller.width, 12)).translate(
      0,
      0,
      (side * roller.apart) / 2,
    ),
  );
  const pin = alongZ(new CylinderGeometry(axle.diameter / 2, axle.diameter / 2, axle.length, 8, 1, true));
  return {
    [CHAIN_ASSETS.axle]: { geometry: mergeGeometries([pin, ...rollers]), material },
    [CHAIN_ASSETS.bar]: {
      geometry: new CylinderGeometry(bar / 2, bar / 2, 1, 6, 1, true).rotateZ(Math.PI / 2),
      material,
    },
    [CHAIN_ASSETS.weight]: { geometry: new BoxGeometry(weight.length, weight.side, weight.side), material },
  };
}

/**
 * A spherical cap of base radius 1 seated on y = 0, rising `rise` along
 * +y, open at the base: the rivet's shape at another rise.
 */
function dome(rise: number, around: number, rings: number): BufferGeometry {
  const r = (1 + rise * rise) / (2 * rise);
  return new SphereGeometry(r, around, rings, 0, Math.PI * 2, 0, Math.acos((r - rise) / r)).translate(0, rise - r, 0);
}

/** Does this output carry rivets? The cook names them `rivets`, `rivets.<class>`, ... */
function isRivets(name: string): boolean {
  return name.startsWith("rivets");
}

/**
 * Drive every head of a rivet output as its own draw says (heads.ts):
 * each instance matrix right-multiplied by the head's transform in the
 * unit head's frame, once, at load. The graph's transforms are the rule's
 * seats; this is the hand that closed each head. A batch without the
 * channel is left as the rule set it.
 */
function driveHeads(list: readonly Mesh[]): void {
  for (const mesh of list) {
    const inst = mesh as InstancedMesh;
    const draws = inst.geometry.getAttribute(HEAD_DRIVE_ATTR);
    if (draws === undefined) continue;
    const m = inst.instanceMatrix.array;
    const a = new Array<number>(16);
    for (let i = 0; i < inst.count; i++) {
      const d = driveMatrix(driveHead(draws.getX(i)));
      const o = 16 * i;
      for (let k = 0; k < 16; k++) a[k] = m[o + k]!;
      // m = a · d, column-major.
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++)
          m[o + 4 * c + r] = a[r]! * d[4 * c]! + a[4 + r]! * d[4 * c + 1]! + a[8 + r]! * d[4 * c + 2]! + a[12 + r]! * d[4 * c + 3]!;
    }
    inst.instanceMatrix.needsUpdate = true;
    // Its work is done: the shader never reads it, so it is not uploaded.
    inst.geometry.deleteAttribute(HEAD_DRIVE_ATTR);
  }
}

/**
 * `?cpuRivets` draws every rivet the old way — a 4x4 matrix a head, driven
 * on the CPU — instead of packed (rivetPack.ts): the comparison, and the
 * way out if a three upgrade breaks the packed shader.
 */
const CPU_RIVETS = new URLSearchParams(location.search).has("cpuRivets");

/** Whether this three's shaders take the packed edit, asked once (rivetPack.ts). */
const SHADER_PROBLEM = packedShaderProblem();

/** How the rivets were drawn: heads packed, heads on the CPU path and why, and the time it took. */
const rivetPath = { packed: 0, packedBytes: 0, cpu: 0, ms: 0, fallbacks: [] as Array<RivetFallback & { output: string }> };

/**
 * One rivet output, drawn: each batch packed (24 bytes a head, driven,
 * expanded in the vertex shader) where it can be, else as instanced
 * matrices driven by {@link driveHeads}, the reason recorded. A site
 * output (`rivetClass`: any share of it driven on site) draws in the site
 * material either way; every other in the shop's.
 */
function drawRivets(name: string, collection: DataCollection, problems: string[]): Drawn {
  const t0 = performance.now();
  const site = rivetClass(name).share > 0;
  const out: Mesh[] = [];
  let instances = 0;
  for (const item of collection) {
    if (item.kind !== "instances") continue;
    if (item.deviceBatches !== undefined) {
      problems.push(`${name}: device-resident instances; this page draws CPU batches only`);
      continue;
    }
    for (const batch of item.batches) {
      const packed: ReturnType<typeof packRivets> = CPU_RIVETS
        ? { reason: "cpu-requested", detail: "?cpuRivets" }
        : SHADER_PROBLEM !== undefined
          ? { reason: "shader-anchor-missing", detail: SHADER_PROBLEM }
          : packRivets(batch as RivetBatch);
      try {
        if (!isFallback(packed)) {
          const mesh = packedRivetMesh(packed, ASSETS.rivet!.geometry, site ? PACKED_SITE : PACKED_SHOP);
          mesh.name = name;
          out.push(mesh);
          rivetPath.packed += packed.count;
          rivetPath.packedBytes += packed.count * PACKED_BYTES;
          instances += packed.count;
          continue;
        }
        if (packed.reason !== "cpu-requested") {
          rivetPath.fallbacks.push({ output: name, ...packed });
          console.info(`rivets: ${name} drawn on the CPU path`, { output: name, ...packed });
        }
        const drawn = toInstancedMeshes([batch], ASSETS);
        for (const mesh of drawn) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.name = name;
          if (site) mesh.material = RIVET_SITE;
          out.push(mesh);
          instances += mesh.count;
          rivetPath.cpu += mesh.count;
        }
        driveHeads(drawn);
      } catch (err) {
        problems.push(`${name}: ${message(err)}`);
      }
    }
  }
  rivetPath.ms += performance.now() - t0;
  return { meshes: out, triangles: 0, instances };
}

/** Instances a drawn rivet mesh carries, packed or not. */
function headsIn(mesh: Mesh): number {
  return (mesh as InstancedMesh).isInstancedMesh === true
    ? (mesh as InstancedMesh).count
    : (mesh.geometry as InstancedBufferGeometry).instanceCount;
}

/** Does this output carry fittings (globes, cabochons, balusters)? The cook names them `fittings.<name>`. */
function isFitting(name: string): boolean {
  return name.startsWith("fittings.");
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
 * Does this output carry a Roux chain's links? The cook names them
 * `chain.<name>`, instances the page re-places as the car they push moves.
 */
function isChain(name: string): boolean {
  return name.startsWith("chain.");
}

/** Does this `car.<name>` output move WITH a car (`LIFT_FOLLOWERS`) rather than ride a run of its own? */
function isFollower(name: string): boolean {
  return LIFT_FOLLOWERS.some((f) => `car.${f.name}` === name);
}

/** Is it machinery that moves with a car (a wheel, a truck, a piston), rather than a car? */
function isMachine(name: string): boolean {
  return LIFT_FOLLOWERS.some((f) => `car.${f.name}` === name && f.car !== true);
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
    "graph, one material per part class. The lifts are what moves: the cars " +
    "ride their runs at about a metre a second, the Edoux pair counterweighted against each " +
    "other, their chains, trucks, pistons and pulleys moving with them; and the tricolour " +
    "flies from the rod. Orbit to judge it; the " +
    "shadows are how the lattice reads.",
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

// THE ERECTION, 1887-89 (`?build`, or `?build=1887-10-10` to open on a
// day): the tower shown as it stood on a day, with a date scrubber
// (scrub.ts), and the temporary works it stood in (erection.ts). The
// toggle reloads, keeping the view and the depth, because the works are
// cooked and the staging is done once at load.
const BUILD = new URLSearchParams(location.search).has("build");
overlay.addCheckbox("build", BUILD, (on) => {
  const q = new URLSearchParams(location.search);
  if (on) q.set("build", "");
  else q.delete("build");
  const p = camera.position;
  const t = controls.target;
  q.set("cam", [p.x, p.y, p.z, t.x, t.y, t.z].map((v) => v.toFixed(2)).join(","));
  location.search = q.toString().replace(/build=(&|$)/, "build$1");
});
/** Claimed here, under the toggles; filled once the cook is drawn. */
const buildSlot = overlay.addSlot();
/** The scrubber, once `?build` has staged the tower; the loop plays it. */
let scrubber: ReturnType<typeof attachScrubber> | undefined;

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
    const query = [d.key, STILL ? "still" : "", BUILD ? "build" : "", `cam=${cam}`].filter(Boolean).join("&");
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

// THE PLATE OVERLAY, an audit tool on the dev server only (`?plate=<id>`,
// e.g. `?plate=I-1&opacity=0.5`): one of Eiffel's figures, the camera on its
// projection and the scan over the model. The published page has none of
// it — the build drops the whole tool (plateTool.ts).
let plates: PlateOverlay | undefined;
void loadPlateTool({
  renderer,
  scene,
  controls,
  slot: () => overlay.addSlot(),
  report: (p) => report([p]),
})?.then((p) => {
  plates = p;
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
  // `?rivets` sets rivets on them as instances, and so implies `?laced`;
  // `?rivets=full` adds the built-up uprights' rows as built (about 120,000
  // heads more, `Detail.fullRivets`).
  const params = new URLSearchParams(location.search);
  const rivets = params.has("rivets");
  const fullRivets = params.get("rivets") === "full";
  const laced = params.has("laced") || rivets;
  // `?plateSet=` and `?plateEdge=` are the crossing plates' two by-eye
  // dimensions (`CrossPlate` in parts.ts), in metres, while they are being
  // settled: the plate's depth under the corner angles and its half-width
  // across its member. They are the only numbers on this page that can be
  // changed from outside, because they are the only ones nothing derives.
  const crossPlate = tuned(params, { set: "plateSet", edge: "plateEdge" });
  const graph = buildEiffel(1889, { lacedWeb: laced, rivets, fullRivets, crossPlate, build: BUILD });
  // Shown before the cook, so a graph that fails to cook can still be read.
  attachGraphPanel([{ name: "eiffel skeleton", graph }], { into: graphSlot, title: "graph" });

  const t0 = performance.now();
  const { outputs } = await cook(graph);
  statCook(`${(performance.now() - t0).toFixed(0)} ms`);

  const box = new Box3();
  let total = 0;
  let riveted = 0;
  let fitted = 0;
  let linked = 0;
  /** Drawn outputs the "show" select can isolate one at a time (not rivets). */
  const present: string[] = [];
  const keep = (name: string, drawn: Drawn): void => {
    for (const mesh of drawn.meshes) scene.add(mesh);
    meshes.set(name, drawn.meshes);
    total += drawn.triangles;
    if (isFitting(name)) fitted += drawn.instances;
    else if (isChain(name)) linked += drawn.instances;
    else riveted += drawn.instances;
  };
  for (const cls of PART_CLASSES) {
    const collection = outputs[cls];
    if (collection === undefined) {
      classStats[cls]("absent");
      continue;
    }
    // The foundations reach 50 m past the pedestals (the chimney) and 12 m
    // under the ground, where the sun's shadow has nothing to fall on: they
    // stay out of the box the shadow is fitted to.
    const drawn = draw(cls, collection, MATERIALS[cls], cls === "foundations" ? new Box3() : box, problems);
    if (drawn.meshes.length === 0) {
      classStats[cls]("no mesh");
      continue;
    }
    // Glass casts nothing (see `GLASS`).
    if (cls === "glass") for (const mesh of drawn.meshes) mesh.castShadow = false;
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
    if (isWorks(name)) {
      // The erection's temporary works (erection.ts, cranes.ts): timber,
      // and the iron (the pylons' sand boxes and shoes, the cranes) in the
      // machinery's paint.
      const drawn = draw(name, collection, isWorksIron(name) ? MATERIALS.machinery : TIMBER, box, problems);
      keep(name, drawn);
      if (!name.startsWith("works.crane.")) overlay.addStat(name)(drawn.triangles.toLocaleString());
      continue;
    }
    if (isCloth(name)) {
      // The flag: the page moves it, so it is kept apart (`hang`).
      const drawn = draw(name, collection, FLAG_MATERIAL, box, problems);
      keep(name, drawn);
      hang(name, drawn.meshes, problems);
      continue;
    }
    const named = isRivets(name) || isCar(name) || isFitting(name) || isChain(name);
    // A car is the lifts' own fit-out, so it wears the platforms' paint;
    // what moves with it is machinery and wears that; only a genuinely
    // unclassed output gets the grey.
    const material = !isCar(name) ? UNCLASSED : isMachine(name) ? MATERIALS.machinery : MATERIALS.platforms;
    const drawn = isRivets(name) ? drawRivets(name, collection, problems) : draw(name, collection, material, box, problems);
    if (!named) {
      overlay.addStat(`${name} (unclassed)`)(
        drawn.meshes.length === 0 ? "no mesh" : drawn.triangles.toLocaleString(),
      );
    }
    if (drawn.meshes.length === 0) continue;
    keep(name, drawn);
    if (!named) present.push(name);
    if (isChain(name)) {
      const chain = LIFT_CHAINS.findIndex((c) => `chain.${c.name}` === name);
      if (chain < 0) problems.push(`${name}: the graph declared this chain but published no circuit for it`);
      else links.push(linksOn(chain, drawn.meshes, problems));
    }
    if (isCar(name) && isFollower(name)) {
      carTriangles += drawn.triangles;
      const f = LIFT_FOLLOWERS.find((x) => `car.${x.name}` === name) as Follower;
      for (const mesh of drawn.meshes) {
        mesh.castShadow = false;
        const on = followerOn(mesh, f);
        if (on === undefined) problems.push(`${name}: moves with "${f.lead}", which publishes no run`);
        else followers.push(on);
      }
    } else if (isCar(name)) {
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
        cars.push(carOn(mesh, run));
      }
    }
  }
  if (cars.length > 0) {
    overlay.addStat("lift cars")(
      `${cars.length}${STILL ? " parked" : " running"}, ${carTriangles.toLocaleString()} tri`,
    );
  }
  statTotal(total.toLocaleString());
  // Staged by date here, before anything below can swap a mesh's geometry
  // (the section's cut): scrub.ts.
  const erection = BUILD ? stageErection(meshes) : undefined;
  if (rivets || riveted > 0) {
    overlay.addStat("rivets")(riveted > 0 ? riveted.toLocaleString() : "absent");
  }
  if (riveted > 0) {
    let site = 0;
    for (const [name, list] of meshes) {
      if (isRivets(name) && rivetClass(name).share > 0) for (const m of list) site += headsIn(m);
    }
    overlay.addStat("site-driven")(`${site.toLocaleString()} (${((100 * site) / riveted).toFixed(0)} %)`);
    // How the heads went to the GPU device: packed (24 bytes a head,
    // rivetPack.ts), or as matrices (64) where a batch could not pack.
    const mb = (b: number): string => (b / 1048576).toFixed(1);
    const why = [...new Set(rivetPath.fallbacks.map((f) => f.reason))].join(", ");
    const how =
      rivetPath.cpu === 0
        ? `packed, ${mb(rivetPath.packedBytes)} MB`
        : rivetPath.packed === 0
          ? `matrices, ${mb(64 * rivetPath.cpu)} MB${why === "" ? "" : ` (${why})`}`
          : `${rivetPath.fallbacks.length} batch(es) as matrices: ${why}`;
    overlay.addStat("rivet path")(`${how}, ${rivetPath.ms.toFixed(0)} ms`);
    lightSiteRivets(params.has("site"));
    overlay.addCheckbox("site rivets", params.has("site"), lightSiteRivets);
  }
  // The foundations in section (`?section`, section.ts): the ground opened
  // and what is under it cut on PL-XX's plane through piles 1 and 3.
  const section = attachSection({
    scene,
    meshes,
    controls,
    changed: () => {
      renderer.shadowMap.needsUpdate = true;
    },
  });
  if (params.has("section")) section(true);
  overlay.addCheckbox("section", params.has("section"), section);
  if (fitted > 0) overlay.addStat("fittings")(fitted.toLocaleString());
  if (linked > 0) overlay.addStat("chain pieces")(linked.toLocaleString());
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
          (isCar(name) && !isMachine(name) && v === "platforms") ||
          // What moves with a car is machinery, and rides with that class.
          ((isChain(name) || isMachine(name)) && v === "machinery") ||
          // The flag flies from the rod, which is the summit's.
          (isCloth(name) && v === "summit");
        for (const m of list) m.visible = on;
      }
      renderer.shadowMap.needsUpdate = true;
    });
  }

  if (erection !== undefined) {
    const raw = params.get("build");
    scrubber = attachScrubber(buildSlot, buildDayParam(raw), !STILL && (raw === null || raw === ""), (day) => {
      erection.setDay(day);
      renderer.shadowMap.needsUpdate = true;
    });
    const { ms, bytes } = erection.stats;
    overlay.addStat("dated")(`${ms.toFixed(0)} ms, ${(bytes / 1024).toFixed(0)} KB`);
    window.pcgEiffelBuild = { setDay: (iso) => scrubber?.set(buildDayParam(iso)) };
  }

  report(problems);
}

// ------------------------------------------------------------------ //
// The lifts.
// ------------------------------------------------------------------ //

/**
 * A car's mesh, the run it rides, and the pose the graph built it at: the
 * axis it pitches about, the point midway between its axles, and the
 * chord's slope there. Every later pose is a turn and a move FROM that one.
 */
interface Car {
  readonly mesh: Mesh;
  readonly run: CarRun;
  /** The run's index in `LIFT_CARS`: where `RUN_S` keeps its arc length. */
  readonly index: number;
  readonly axis: Vector3;
  readonly home: Vector3;
  readonly homeSlope: number;
}

const cars: Car[] = [];

/** One pose, `carPose`'s output: x, y, z midway between the axles, then the chord's slope. */
const POSE = new Float64Array(4);
/** The built pose's point turned by the current turn: scratch, so a frame allocates nothing. */
const TURNED = new Vector3();

function carOn(mesh: Mesh, run: CarRun): Car {
  carPose(run, run.at, POSE);
  return {
    mesh,
    run,
    index: LIFT_CARS.indexOf(run),
    axis: new Vector3(run.axis[0], run.axis[1], run.axis[2]),
    home: new Vector3(POSE[0], POSE[1], POSE[2]),
    homeSlope: POSE[3] as number,
  };
}

/**
 * Every run's arc length at the clock, by its index in `LIFT_CARS`, and
 * every chain's shift along its loop, by its index in `LIFT_CHAINS`: what
 * the machinery that moves with a car reads. Written once a frame, for
 * every run whether or not its car was drawn, so a chain or a truck never
 * depends on its car's mesh.
 */
const RUN_S = new Float64Array(LIFT_CARS.length);
const CHAIN_SHIFT = new Float64Array(LIFT_CHAINS.length);
/** Each chain's car, by the chain's index. */
const CHAIN_LEAD = LIFT_CHAINS.map((c) => LIFT_CARS.findIndex((r) => r.name === c.lead));

/**
 * A Roux chain's instanced pieces: which chain, and the instance matrices
 * of its three kinds of piece, which `placeChain` rewrites in place.
 */
interface Links {
  readonly chain: number;
  readonly meshes: readonly InstancedMesh[];
  readonly axles: Float32Array;
  readonly bars: Float32Array;
  readonly weights: Float32Array;
}

const links: Links[] = [];

/** A zero-length stand-in for a kind of piece a chain has none of. */
const NO_PIECES = new Float32Array(0);

/**
 * Pair a chain output's instanced meshes with its circuit: each mesh is
 * one kind of piece, told apart by the asset geometry it was built on.
 */
function linksOn(chain: number, drawn: readonly Mesh[], problems: string[]): Links {
  const run = LIFT_CHAINS[chain] as ChainRun;
  const kind = (id: string): InstancedMesh | undefined =>
    drawn.find((m): m is InstancedMesh => "isInstancedMesh" in m && m.geometry === ASSETS[id]?.geometry);
  const axles = kind(CHAIN_ASSETS.axle);
  const bars = kind(CHAIN_ASSETS.bar);
  const weights = kind(CHAIN_ASSETS.weight);
  if (axles?.count !== run.joints.length || bars?.count !== run.joints.length) {
    problems.push(`chain.${run.name}: the cooked pieces do not match the ${run.joints.length} joints it publishes`);
  }
  const matrices = (m: InstancedMesh | undefined) => (m?.instanceMatrix.array as Float32Array | undefined) ?? NO_PIECES;
  // The pieces move round the whole loop, so the bounding sphere the mesh
  // was given as built (the counterweights' cluster, say) is not where they
  // will be: never cull them on it.
  for (const m of [axles, bars, weights]) if (m !== undefined) m.frustumCulled = false;
  return {
    chain,
    meshes: [axles, bars, weights].filter((m): m is InstancedMesh => m !== undefined),
    axles: matrices(axles),
    bars: matrices(bars),
    weights: matrices(weights),
  };
}

/**
 * A mesh that moves with a car (`LIFT_FOLLOWERS`): what drives it, by
 * index — a run's arc length less its `at`, or a chain's shift — and how.
 */
interface Moving {
  readonly mesh: Mesh;
  readonly f: Follower;
  /** The lead run's index in `LIFT_CARS`, and its `at`. */
  readonly run: number;
  readonly at: number;
  /** The chain's index in `LIFT_CHAINS`, or -1: driven by the run. */
  readonly chain: number;
  readonly axis: Vector3;
}

const followers: Moving[] = [];

function followerOn(mesh: Mesh, f: Follower): Moving | undefined {
  const run = LIFT_CARS.findIndex((r) => r.name === f.lead);
  if (run < 0) return undefined;
  const chain = f.chain === undefined ? -1 : LIFT_CHAINS.findIndex((c) => c.name === f.chain);
  const a = f.spin?.axis ?? [0, 1, 0];
  // A stretched body is placed by its whole matrix, written each frame.
  if (f.stretch !== undefined) mesh.matrixAutoUpdate = false;
  return { mesh, f, run, at: (LIFT_CARS[run] as CarRun).at, chain, axis: new Vector3(a[0], a[1], a[2]) };
}

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
 * Put every car where its run has it at `t` seconds, and everything that
 * moves with a car where the car has it. A car is a rigid body, so this is
 * a turn and a move and never a rebuild: the run's line gives the point
 * between its axles and the chord's slope at the arc length the clock has
 * reached (`carPose`, a binary search), and the mesh — built at the run's
 * `at` — is turned about the run's axis by how far that slope has moved
 * from the built one, about the built point, and carried onto the new
 * point. On a leg the chord turns where the rail bends, so the car tips
 * there as the real one did; in the shaft it never turns.
 *
 * Then the machinery, from the same arc lengths: each Roux chain shifted
 * along its loop by as much as its cabin's joint has moved (`chainShift`),
 * every piece re-placed in its instance matrices (`placeChain`); and each
 * follower slid, turned or stretched by its lead's travel. Nothing here
 * allocates: the matrices are written where the meshes keep them.
 */
function moveCars(t: number): void {
  for (let i = 0; i < LIFT_CARS.length; i++) {
    const run = LIFT_CARS[i] as CarRun;
    RUN_S[i] = run.from + (run.to - run.from) * carPhase(run, t);
  }
  for (let c = 0; c < cars.length; c++) {
    const { mesh, run, index, axis, home, homeSlope } = cars[c] as Car;
    carPose(run, RUN_S[index] as number, POSE);
    mesh.quaternion.setFromAxisAngle(axis, (POSE[3] as number) - homeSlope);
    TURNED.copy(home).applyQuaternion(mesh.quaternion);
    mesh.position.set((POSE[0] as number) - TURNED.x, (POSE[1] as number) - TURNED.y, (POSE[2] as number) - TURNED.z);
  }
  for (let c = 0; c < LIFT_CHAINS.length; c++) {
    CHAIN_SHIFT[c] = chainShift(LIFT_CHAINS[c] as ChainRun, RUN_S[CHAIN_LEAD[c] as number] as number);
  }
  for (let i = 0; i < links.length; i++) {
    const l = links[i] as Links;
    placeChain(LIFT_CHAINS[l.chain] as ChainRun, CHAIN_SHIFT[l.chain] as number, l.axles, l.bars, l.weights);
    for (let j = 0; j < l.meshes.length; j++) (l.meshes[j] as InstancedMesh).instanceMatrix.needsUpdate = true;
  }
  for (let i = 0; i < followers.length; i++) {
    const m = followers[i] as Moving;
    const travel = m.chain >= 0 ? (CHAIN_SHIFT[m.chain] as number) : (RUN_S[m.run] as number) - m.at;
    const { slide, spin, stretch } = m.f;
    if (slide !== undefined) {
      m.mesh.position.set(slide[0] * travel, slide[1] * travel, slide[2] * travel);
    } else if (spin !== undefined) {
      // Turned about the axle through the centre: q, then c - q c.
      m.mesh.quaternion.setFromAxisAngle(m.axis, spin.rate * travel);
      TURNED.set(spin.centre[0], spin.centre[1], spin.centre[2]).applyQuaternion(m.mesh.quaternion);
      m.mesh.position.set(spin.centre[0] - TURNED.x, spin.centre[1] - TURNED.y, spin.centre[2] - TURNED.z);
    } else if (stretch !== undefined) {
      // Scaled by k along the unit d about the anchor a: I + (k - 1) d dᵀ,
      // and the anchor held, so the move is -(k - 1)(d · a) d.
      const k = (stretch.length + stretch.rate * travel) / stretch.length - 1;
      const dx = stretch.along[0];
      const dy = stretch.along[1];
      const dz = stretch.along[2];
      const da = -k * (dx * stretch.anchor[0] + dy * stretch.anchor[1] + dz * stretch.anchor[2]);
      m.mesh.matrix.set(
        1 + k * dx * dx, k * dx * dy, k * dx * dz, da * dx,
        k * dy * dx, 1 + k * dy * dy, k * dy * dz, da * dy,
        k * dz * dx, k * dz * dy, 1 + k * dz * dz, da * dz,
        0, 0, 0, 1,
      );
      m.mesh.matrixWorldNeedsUpdate = true;
    }
  }
}

// ------------------------------------------------------------------ //
// The flag.
// ------------------------------------------------------------------ //

/** Does this output carry cloth the page moves? The cook names it `cloth.<name>`. */
function isCloth(name: string): boolean {
  return name.startsWith("cloth.");
}

/**
 * The tricolour's bands as a three-texel texture, hoist to fly, sampled
 * NEAREST so the bands' edges stay hard where they fall mid-quad: the
 * cloth's `uv` runs 0 at the hoist to 1 at the fly (`flag.ts`).
 */
function flagBands(): DataTexture {
  const data = new Uint8Array(4 * FLAG_BANDS.length);
  FLAG_BANDS.forEach((c, i) => data.set([(c >> 16) & 255, (c >> 8) & 255, c & 255, 255], 4 * i));
  const tex = new DataTexture(data, FLAG_BANDS.length, 1);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Wool bunting: matte, both sides seen. */
const FLAG_MATERIAL = new MeshStandardMaterial({
  map: flagBands(),
  roughness: 0.9,
  metalness: 0,
  side: DoubleSide,
});

/**
 * A cloth mesh and, for each of its vertices, its point of `flagPose`'s
 * grid, found once from its `uv` (the conversion keeps the graph's point
 * order, but the page does not lean on that).
 */
interface Cloth {
  readonly mesh: Mesh;
  readonly slot: Uint16Array;
  readonly position: BufferAttribute;
  readonly normal: BufferAttribute;
}

const cloths: Cloth[] = [];
const FLAG_AT = new Float32Array(3 * FLAG_POINTS);
const FLAG_NORMAL = new Float32Array(3 * FLAG_POINTS);

/**
 * THE FLAG'S CLOCK is its own. It runs whenever the page is not `?still`
 * or paused by the capture probe — not with the lifts' checkbox, which
 * parks the cars, not the wind — and `setClock` sets it with the lifts',
 * so a probed frame at t shows the cars AND the flag as any run has them
 * at t: `flagPose` is pure in time.
 */
let windClock = 0;
let windRunning = !STILL;

/**
 * Take a `cloth.<name>` output's meshes over: map each vertex to its grid
 * point, give it normals the page writes, and fly it at the current time.
 */
function hang(name: string, drawn: readonly Mesh[], problems: string[]): void {
  const { nu, nv } = FLAG_GRID;
  for (const mesh of drawn) {
    const geometry = mesh.geometry;
    const uv = geometry.getAttribute("uv");
    const position = geometry.getAttribute("position");
    if (uv === undefined || !(position instanceof BufferAttribute) || position.count !== FLAG_POINTS) {
      problems.push(`${name}: not the flag's ${FLAG_POINTS}-point grid with a uv; left flat`);
      continue;
    }
    const slot = new Uint16Array(position.count);
    for (let v = 0; v < position.count; v++) {
      slot[v] = Math.round(uv.getY(v) * nv) * (nu + 1) + Math.round(uv.getX(v) * nu);
    }
    const normal = new BufferAttribute(new Float32Array(3 * position.count), 3);
    geometry.setAttribute("normal", normal);
    // The map is drawn once and the cloth never stands still; it takes the
    // tower's shadow but throws none. It moves off its cooked bounds, so
    // it is never culled against them.
    mesh.castShadow = false;
    mesh.frustumCulled = false;
    cloths.push({ mesh, slot, position, normal });
  }
  waveFlags(windClock);
}

/** Put every cloth where `flagPose` has it at `t`. Allocates nothing. */
function waveFlags(t: number): void {
  if (cloths.length === 0) return;
  flagPose(t, FLAG_AT);
  flagNormals(FLAG_AT, FLAG_NORMAL);
  for (let c = 0; c < cloths.length; c++) {
    const { slot, position, normal } = cloths[c] as Cloth;
    const p = position.array as Float32Array;
    const n = normal.array as Float32Array;
    for (let v = 0; v < slot.length; v++) {
      const s = 3 * (slot[v] as number);
      p[3 * v] = FLAG_AT[s] as number;
      p[3 * v + 1] = FLAG_AT[s + 1] as number;
      p[3 * v + 2] = FLAG_AT[s + 2] as number;
      n[3 * v] = FLAG_NORMAL[s] as number;
      n[3 * v + 1] = FLAG_NORMAL[s + 1] as number;
      n[3 * v + 2] = FLAG_NORMAL[s + 2] as number;
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
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
  if (windRunning) {
    windClock += Math.min((now - lastFrame) / 1000, 0.1);
    waveFlags(windClock);
  }
  scrubber?.tick(Math.min((now - lastFrame) / 1000, 0.1));
  lastFrame = now;
  // A driven camera is not an orbited one: `update()` would re-derive the
  // pose from the controls' own spherical and clamp it back inside
  // `maxPolarAngle` and the distance limits, which is exactly what a shot
  // looking up a leg from the ground is outside of.
  if (!driven) controls.update();
  if (plates?.active === true) plates.render();
  else rig.render();
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
       * Stop the page advancing its own lift and wind clocks, so `setClock`
       * is the only thing that moves the cars and the flag.
       */
      pause(on: boolean): void;
      /** Put every car where its run has it, and the flag as the wind has it, at `t` seconds. */
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
    windRunning = !on;
  },
  setClock(t) {
    clock = t;
    moveCars(clock);
    windClock = t;
    waveFlags(windClock);
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
