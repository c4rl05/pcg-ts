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
  type MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
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
import { bandsFrom } from "./bands.js";
import { type Bands, startBands } from "./bandsView.js";
import { isoOf } from "./chronology.js";
import { flatMaterial, flatShaderProblem, teachFlat, unlitMaterial } from "./flat.js";
import { attachKeyMove } from "./keyMove.js";
import { type Depth, DEPTHS, cookedDetail, depthParams, pageDepth, streamed } from "./depth.js";
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
import { FITTING_SEGMENTS } from "./fittingSegments.js";
import { INK_DEFAULT, type InkSpec } from "./ink.js";
import {
  DRAWING_DEFAULT,
  type DrawingSpec,
  drawingComposite,
  drawingHaze,
  drawingInk,
  drawingLook,
  drawingShading,
} from "./drawing.js";
import { WASH_REFERENCE, type WashRole, washColor } from "./wash.js";
import { NEUTRAL, createRig } from "./rig.js";
import { attachSection } from "./section.js";
import { attachWalk } from "./walkView.js";
import { rivetClass } from "./spec.js";
import { HEAD_DRIVE_ATTR, driveHead, driveMatrix } from "./heads.js";
import {
  PACKED_BYTES,
  RIVET_ASSET,
  type RivetBatch,
  type RivetFallback,
  isFallback,
  isPackedRivets,
  packRivets,
  packedRivetMaterial,
  packedRivetMesh,
  packedShaderProblem,
  packedUnlitProblem,
} from "./rivetPack.js";
import { BufferAttribute, Color, DataTexture, NearestFilter, SRGBColorSpace } from "three";
import { FLAG_BANDS, FLAG_GRID, FLAG_POINTS, flagNormals, flagPose, flagWave } from "./flag.js";
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
  // The stairs were the fit-out's until they were a class of their own
  // (parts.ts), and keep its paint: the class is there so a stair can be
  // judged and highlighted apart, not so it reads differently.
  stairs: { color: 0x7d5e48, roughness: 0.7, metalness: 0.1 },
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
  // The ground's iron was the machinery's until it was a class of its own
  // (parts.ts), and keeps its paint, as the stairs keep the platforms'.
  groundIron: { color: 0x4f3a2e, roughness: 0.5, metalness: 0.3 },
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
 * What the drawing's palette generator makes of each class whose relation
 * to the iron would carry the wrong thing (wash.ts `WashRole`): the stone
 * is a near-grey, never the iron's red; the glass a pale cool grey-blue;
 * and the floors' fit-out the warm cream of a lit interior, which is what
 * sets the floors apart from the lattice in an illustrated cutaway.
 */
const WASH_ROLES: Partial<Record<PartClass, WashRole>> = {
  masonry: "stone",
  foundations: "stone",
  glass: "glass",
  platforms: "warm",
};
for (const [cls, role] of Object.entries(WASH_ROLES)) MATERIALS[cls as PartClass].userData.washRole = role;

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

/**
 * THE HIGHLIGHTS: the stairs, the lifts and the rivets, each in one flat
 * primary — unlit, unfogged, and carried past the occlusion, the vignette
 * and the tone map untouched (flat.ts) — so where each runs reads at a
 * glance against the iron's browns, from any distance. Each has its own
 * checkbox, and `?hl=stairs,lifts,rivets` opens with them on, the way
 * "copy view" writes it; off puts back the material each mesh had. A
 * highlight changes no mesh's shadow, so the shadow map is not redrawn.
 *
 * - stairs: the "stairs" class, all of it (parts.ts says what it holds:
 *   the climb, not the 1st floor's entrance flights).
 * - lifts: the cars themselves and nothing that drives them: every
 *   `car.*` output that is a car (the leg cars' panes among them, and the
 *   Edoux car that moves with the other), not the machinery (`isMachine`:
 *   carriages, counterweights, pistons, pulleys, cables), not the Roux
 *   chains, not the machinery that stands still (the "machinery" class),
 *   nor the tracks and guide posts, which are girders.
 * - rivets: every rivet output, packed or drawn as matrices, and at
 *   streamed rivets every rivet cell as it streams in.
 */
const HIGHLIGHTS = ["stairs", "lifts", "rivets"] as const;
type Highlight = (typeof HIGHLIGHTS)[number];
const HIGHLIGHT_PAINT: Record<Highlight, number> = { stairs: 0xff0000, lifts: 0x00ff00, rivets: 0x0000ff };
/** Each highlight's paint, plain and for packed heads (whose edit clones, so it goes first). */
const FLAT = Object.fromEntries(
  HIGHLIGHTS.map((h) => [
    h,
    {
      plain: flatMaterial(HIGHLIGHT_PAINT[h]),
      packed: teachFlat(packedRivetMaterial(unlitMaterial(HIGHLIGHT_PAINT[h]))),
    },
  ]),
) as Record<Highlight, { plain: MeshBasicMaterial; packed: MeshBasicMaterial }>;
/** Whether this three's shaders take the flat paint and its packed kind, asked once (flat.ts, rivetPack.ts); if not, no highlight. */
const FLAT_PROBLEM = flatShaderProblem() ?? packedUnlitProblem();
/** Which highlights are on: read from `?hl` once, then the checkboxes'. */
const lit: Record<Highlight, boolean> = (() => {
  const asked = new Set((new URLSearchParams(location.search).get("hl") ?? "").split(","));
  return Object.fromEntries(HIGHLIGHTS.map((h) => [h, FLAT_PROBLEM === undefined && asked.has(h)])) as Record<
    Highlight,
    boolean
  >;
})();
/**
 * The userData keys a highlightable mesh carries: the paint of the
 * highlight it answers to (the `FLAT` entry itself, so a toggle finds its
 * meshes by identity), and the material it was drawn in.
 */
const HL = { paint: "highlightPaint", own: "ownMaterial" } as const;

/** The flat paint `mesh` takes under `paint`: the packed kind for a packed head. */
function flatFor(mesh: Mesh, paint: (typeof FLAT)[Highlight]): Material {
  return isPackedRivets(mesh) ? paint.packed : paint.plain;
}

/**
 * Make `mesh` answer to highlight `h`, keeping the material it was drawn
 * in, and paint it now if `h` is on. Called once per mesh, when it is
 * drawn or streams in.
 */
function highlightable(mesh: Mesh, h: Highlight): void {
  mesh.userData[HL.paint] = FLAT[h];
  mesh.userData[HL.own] = mesh.material;
  if (lit[h]) mesh.material = flatFor(mesh, FLAT[h]);
}

/** Turn highlight `h` on or off, on every mesh in `root` that answers to it. */
function setHighlight(root: Object3D, h: Highlight, on: boolean): void {
  lit[h] = on;
  const paint = FLAT[h];
  root.traverse((o) => {
    if (o.userData[HL.paint] !== paint) return;
    const mesh = o as Mesh;
    mesh.material = on ? flatFor(mesh, paint) : (mesh.userData[HL.own] as Material);
  });
}

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
    geometry: dome(CABOCHON_RISE, FITTING_SEGMENTS.cabochon.around, FITTING_SEGMENTS.cabochon.rings),
    material: new MeshStandardMaterial({ color: 0xd9a51f, roughness: 0.22, metalness: 0 }),
  },
  // The gas globes, « en verre dépoli »: a unit sphere about its centre.
  [FITTING_ASSETS.globe]: {
    geometry: new SphereGeometry(1, FITTING_SEGMENTS.globe.around, FITTING_SEGMENTS.globe.rings),
    material: new MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.55, metalness: 0 }),
  },
  // The gallery's balusters « en grès verni », turned from their profile at
  // true size; the glaze's colour is not recorded, so a glazed buff.
  [FITTING_ASSETS.baluster]: {
    geometry: new LatheGeometry(
      BALUSTER.profile.map(([h, r]) => new Vector2(r, h)),
      FITTING_SEGMENTS.baluster.around,
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
  let instancedTris = 0;
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
          highlightable(mesh, "rivets");
          out.push(mesh);
          rivetPath.packed += packed.count;
          rivetPath.packedBytes += packed.count * PACKED_BYTES;
          instances += packed.count;
          instancedTris += packed.count * trianglesOf(ASSETS.rivet!.geometry);
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
          highlightable(mesh, "rivets");
          out.push(mesh);
          instances += mesh.count;
          instancedTris += mesh.count * triangles(mesh);
          rivetPath.cpu += mesh.count;
        }
        driveHeads(drawn);
      } catch (err) {
        problems.push(`${name}: ${message(err)}`);
      }
    }
  }
  rivetPath.ms += performance.now() - t0;
  return { meshes: out, triangles: 0, instances, instancedTriangles: instancedTris };
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

/**
 * The run a car output rides: its own, or, for a leg car's panes
 * (`car.<name>.glass`, lifts.ts), its car's — the same rigid body, drawn
 * in the glass.
 */
function carRun(name: string): CarRun | undefined {
  return LIFT_CARS.find((r) => `car.${r.name}` === name || `car.${r.name}.glass` === name);
}

/** Is this a car's glass: `car.<name>.glass` for a car with a run? */
function isCarGlass(name: string): boolean {
  return name.endsWith(".glass") && carRun(name) !== undefined;
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
// `?fov=` the lens, in degrees, beside it: what "copy view" writes when a
// capture probe has changed the page's own 42.
const FOV = Number(new URLSearchParams(location.search).get("fov"));
if (FOV > 0 && FOV < 180) {
  camera.fov = FOV;
  camera.updateProjectionMatrix();
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
  title: "The Eiffel Tower",
  info: "Drag to orbit, right-drag to pan, scroll to zoom. WASD and QE move, Shift faster.",
  foldStats: true,
});

/**
 * A key as the panel shows it, in sentence case. The key itself stays as it
 * is wherever it is a key: in the URL (`?show=`, `?hl=`), in the output
 * names and in every comparison, so only what is displayed goes through here.
 */
function capital(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const statFps = overlay.addStat("FPS");
const statCook = overlay.addStat("Cook");
const statSize = overlay.addStat("Extent (x × z × y)");
// Mesh triangles are the cooked geometry's own; instanced ones are each
// instance's asset triangles (a rivet head's 80, a globe's 960), which at
// `?rivets` outnumber the meshes about 25 to 1.
const statMesh = overlay.addStat("Mesh triangles");
const statInstanced = overlay.addStat("Instanced triangles");
const statTotal = overlay.addStat("Total triangles");
const classStats = Object.fromEntries(
  PART_CLASSES.map((cls) => [cls, overlay.addStat(capital(cls))]),
) as Record<PartClass, (value: string | number) => void>;

/**
 * A framed box of the panel's, with its own heading, in a top slot: the
 * Detail box's frame, which the View and Look boxes share. Top slots stack
 * in the order they are claimed.
 */
function framedBox(id: string, title: string): HTMLElement {
  const slot = overlay.addSlot("top");
  const box = document.createElement("section");
  box.setAttribute("aria-labelledby", `${id}-heading`);
  box.style.cssText = "border:1px solid var(--ed-edge);padding:8px 10px 10px";
  const heading = document.createElement("h2");
  heading.id = `${id}-heading`;
  heading.textContent = title;
  heading.style.cssText = "margin:0 0 2px;font-size:13px;font-weight:600;color:var(--ed-ink-hi)";
  box.append(heading);
  slot.append(box);
  return box;
}

/**
 * One way of looking in the View box: its toggle's row, and under it the
 * controls that only mean something while it is on (`sub`, indented and
 * hidden while off). The row is made by the overlay, which puts it with
 * the loose toggles, and moved in here.
 */
interface ViewGroup {
  readonly sub: HTMLDivElement;
  /** Move an overlay row (a toggle's, or a slider's) into the group. */
  take(row: HTMLElement, into?: "head" | "sub"): void;
  /** Show or hide the controls under the toggle. */
  open(on: boolean): void;
}
/** The rows under a toggle sit 12 px in, inside the box's frame: a narrower label column. */
const VIEW_SUB_CSS = ".pcg-overlay .eiffel-view-sub .pcg-row > label { flex-basis: 72px; }";
{
  const style = document.createElement("style");
  style.textContent = VIEW_SUB_CSS;
  document.head.append(style);
}
function viewGroup(box: HTMLElement): ViewGroup {
  const group = document.createElement("div");
  const head = document.createElement("div");
  const sub = document.createElement("div");
  sub.className = "eiffel-view-sub";
  sub.style.cssText = "margin:0 0 4px 12px";
  sub.hidden = true;
  group.append(head, sub);
  box.append(group);
  return {
    sub,
    take(row, into = "head") {
      // The box is narrower than the panel; the sub rows' labels are
      // narrowed by VIEW_SUB_CSS, which reaches the walk's own rows too.
      const label = row.querySelector(":scope > label") as HTMLElement | null;
      if (label !== null && into === "head") label.style.flexBasis = "84px";
      (into === "head" ? head : sub).append(row);
    },
    open(on) {
      sub.hidden = !on;
    },
  };
}

// THE VIEW BOX: the ways of looking at the tower, each toggle with the
// controls it brings unfolded under it — rotate's speed, the walk's path
// and play, build's day and play, the section's cut. Claimed after the
// Detail box, which is moved above it once it exists.
const viewBox = framedBox("view", "View");
const rotateGroup = viewGroup(viewBox);
const walkGroup = viewGroup(viewBox);
const buildGroup = viewGroup(viewBox);
const sectionGroup = viewGroup(viewBox);
// THE LOOK BOX, on the dev server only: settings for the look that is not
// settled yet, which the published page will not offer (`import.meta.hot`
// is the dev server's hallmark, plateTool.ts says why not `env.DEV`). A
// `?ink` link still opens the drawing anywhere.
const lookBox = import.meta.hot !== undefined ? framedBox("look", "Look") : undefined;

// ROTATE, WALK AND BUILD are three ways of looking at the tower, and they
// do not combine: turning rotate or walk on turns the other off, and under
// build — a reload away — both are off and offered only once it is.
const rotateBox = overlay.addCheckbox("Rotate", false, (on) => {
  controls.autoRotate = on;
  rotateGroup.open(on);
  if (on && walk.active) {
    walk.set(false);
    walkBox.checked = false;
  }
});
rotateGroup.take(rotateBox.parentElement as HTMLElement);
rotateGroup.take(
  overlay.addSlider(
    "Speed",
    { min: 0.05, max: 2, step: 0.05, value: controls.autoRotateSpeed, format: (v) => v.toFixed(2) },
    (v) => {
      controls.autoRotateSpeed = v;
    },
  ),
  "sub",
);

// THE DRAWING (`?ink`, or `?ink=2` for a heavier line in device pixels):
// the tower as a pen drawing (ink.ts), by default filled with a washed,
// cel-shaded colour under soft lines (drawing.ts, wash.ts); with Colour off
// it is the plain pen, black on white. A second way to draw the same scene:
// the lit look's palette, sun and occlusion are left as they were and come
// back with it.
let inked = new URLSearchParams(location.search).has("ink");
let drawing: DrawingSpec = DRAWING_DEFAULT;
let inkBase: InkSpec = INK_DEFAULT;
{
  const weight = Number(new URLSearchParams(location.search).get("ink"));
  if (Number.isFinite(weight) && weight > 0) inkBase = { ...INK_DEFAULT, width: weight };
}
function applyDrawing(): void {
  rig.ink.apply(drawingInk(drawing, inkBase));
  rig.ink.composite(drawingComposite(drawing));
  rig.ink.haze(drawingHaze(drawing));
  rig.wash.shade(drawingShading(drawing));
  rig.wash.paint(drawing.main);
  const colour = inked && drawing.colour;
  rig.setInk(inked, colour);
  rig.apply(colour ? drawingLook(LOOK, drawing) : LOOK);
}
/** Puts a console or script change (`__drawing`) into the Look box's controls; set once they exist. */
let syncDrawingControls = (): void => {};
// For tuning from the console or a capture script: any subset of the pen's
// spec, or of the drawing's, over what is set now.
(window as unknown as { __ink: (spec: Partial<InkSpec>) => void }).__ink = (spec) => {
  inkBase = { ...inkBase, ...spec };
  applyDrawing();
};
(window as unknown as { __drawing: (spec?: Partial<DrawingSpec>) => DrawingSpec }).__drawing = (spec = {}) => {
  drawing = { ...drawing, ...spec };
  applyDrawing();
  syncDrawingControls();
  return drawing;
};
applyDrawing();
if (lookBox !== undefined) {
  const set = (patch: Partial<DrawingSpec>): void => {
    drawing = { ...drawing, ...patch };
    applyDrawing();
  };
  // A group inside another's controls: its toggle takes the narrower label
  // the controls it sits among have (VIEW_SUB_CSS), not a head's.
  const nestedHead = (group: ViewGroup, row: HTMLElement): void => {
    group.take(row);
    const label = row.querySelector(":scope > label") as HTMLElement | null;
    if (label !== null) label.style.flexBasis = "";
  };
  const drawingGroup = viewGroup(lookBox);
  const drawingBox = overlay.addCheckbox("Drawing", inked, (on) => {
    inked = on;
    drawingGroup.open(on);
    applyDrawing();
  });
  drawingGroup.take(drawingBox.parentElement as HTMLElement);
  drawingGroup.open(inked);

  // Colour, with the main colour beside it and the palette it generates
  // under it, then everything that only means something over a colour.
  const colourGroup = viewGroup(drawingGroup.sub);
  const colourBox = overlay.addCheckbox("Colour", drawing.colour, (on) => {
    colourGroup.open(on);
    set({ colour: on });
  });
  const colourRow = colourBox.parentElement as HTMLElement;
  const picker = document.createElement("input");
  picker.type = "color";
  picker.title = "The main colour, the iron's: the rest of the palette is generated from it";
  picker.style.cssText =
    "width:28px;height:18px;padding:0;border:1px solid var(--ed-edge);background:none;margin-left:auto";
  const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;
  picker.value = hex(drawing.main);
  picker.addEventListener("input", () => {
    set({ main: Number.parseInt(picker.value.slice(1), 16) });
    paintSwatches();
  });
  colourRow.append(picker);
  nestedHead(colourGroup, colourRow);
  const swatches = document.createElement("div");
  swatches.style.cssText = "display:flex;gap:2px;margin:2px 0 4px";
  swatches.title = "The palette, generated from the main colour";
  const SHOWN: readonly PartClass[] = [
    "uprights",
    "bracing",
    "arches",
    "platforms",
    "machinery",
    "masonry",
    "foundations",
    "glass",
    "names",
  ];
  const chips = SHOWN.map((cls) => {
    const chip = document.createElement("span");
    chip.title = cls;
    chip.style.cssText = "flex:1;height:10px;border:1px solid var(--ed-edge)";
    swatches.append(chip);
    return chip;
  });
  const paintSwatches = (): void => {
    const main = new Color(drawing.main);
    const reference = new Color(WASH_REFERENCE);
    SHOWN.forEach((cls, i) => {
      const c = washColor(new Color(PALETTE[cls].color), main, reference, new Color(), WASH_ROLES[cls]);
      (chips[i] as HTMLElement).style.background = `#${c.getHexString()}`;
    });
  };
  paintSwatches();
  colourGroup.sub.prepend(swatches);
  colourGroup.open(drawing.colour);

  type Field = keyof DrawingSpec;
  type Slider = readonly [label: string, field: Field, min: number, max: number, step: number, format: (v: number) => string];
  const sliders = new Map<Field, { input: HTMLInputElement; slider: Slider }>();
  const boxes = new Map<Field, { box: HTMLInputElement; group: ViewGroup }>();
  const slider = (into: ViewGroup, s: Slider): void => {
    const [label, field, min, max, step, format] = s;
    const row = overlay.addSlider(label, { min, max, step, value: drawing[field] as number, format }, (v) =>
      set({ [field]: v }),
    );
    into.take(row, "sub");
    sliders.set(field, { input: row.querySelector("input") as HTMLInputElement, slider: s });
  };
  // A toggle and the sliders that only mean something while it is on.
  const toggle = (into: HTMLElement, label: string, field: Field, under: readonly Slider[] = []): void => {
    const group = viewGroup(into);
    const box = overlay.addCheckbox(label, drawing[field] as boolean, (on) => {
      group.open(on);
      set({ [field]: on });
    });
    nestedHead(group, box.parentElement as HTMLElement);
    boxes.set(field, { box, group });
    for (const s of under) slider(group, s);
    group.open(drawing[field] as boolean);
  };
  const f2 = (v: number): string => v.toFixed(2);
  const deg = (v: number): string => `${v.toFixed(0)}°`;
  toggle(colourGroup.sub, "Cel", "cel", [
    ["Bands", "bands", 2, 6, 1, (v) => v.toFixed(0)],
    ["Band edge", "bandSoftness", 0, 1, 0.01, f2],
  ]);
  toggle(colourGroup.sub, "Washed", "washed", [
    ["Lift", "lift", 0, 0.8, 0.01, f2],
    ["Light tint", "litTint", 0, 1, 0.01, f2],
    ["Shade tint", "shadeTint", 0, 1, 0.01, f2],
    ["Saturation", "saturation", 0, 1.5, 0.01, f2],
    ["Depth", "depth", 0, 1, 0.01, f2],
  ]);
  toggle(colourGroup.sub, "AO", "ao", [
    ["Strength", "aoStrength", 0, 1, 0.01, f2],
    ["Radius", "aoRadius", 0.1, 3, 0.05, (v) => `${v.toFixed(2)} m`],
  ]);
  toggle(colourGroup.sub, "Shadows", "shadows");
  const light: readonly Slider[] = [
    ["Sun height", "sunElevation", 5, 85, 1, deg],
    ["Sun turn", "sunAzimuth", -180, 180, 1, deg],
    ["Sun", "sun", 0, 1.5, 0.01, f2],
    ["Shade", "shade", 0, 1.5, 0.01, f2],
  ];
  for (const s of light) slider(colourGroup, s);
  toggle(drawingGroup.sub, "Soft edges", "softEdges");
  slider(drawingGroup, ["Far lines", "farLines", 0, 1, 0.01, f2]);
  slider(drawingGroup, ["Inner lines", "innerLines", 0, 1, 0.01, f2]);
  slider(drawingGroup, ["Line width", "lineWidth", 1, 3, 0.5, (v) => `${v.toFixed(1)} px`]);
  slider(drawingGroup, ["Line dark", "lineStrength", 0, 1, 0.01, f2]);

  syncDrawingControls = () => {
    drawingBox.checked = inked;
    drawingGroup.open(inked);
    colourBox.checked = drawing.colour;
    colourGroup.open(drawing.colour);
    picker.value = hex(drawing.main);
    paintSwatches();
    for (const [field, { box, group }] of boxes) {
      box.checked = drawing[field] as boolean;
      group.open(box.checked);
    }
    // The bar, its fill and its readout, but not its input event: that
    // would set the spec again from the bar, rounded to the bar's step.
    for (const [field, { input, slider: [, , min, max, , format] }] of sliders) {
      const v = drawing[field] as number;
      input.value = String(v);
      input.style.setProperty("--p", `${Math.min(1, Math.max(0, (v - min) / (max - min))) * 100}%`);
      const readout = input.nextElementSibling;
      if (readout !== null) readout.textContent = format(v);
    }
  };
}

// The lifts run unless `?still` parked them. Off leaves every car exactly
// where it stands, which is how a car is looked at rather than watched.
let liftsRunning = !STILL;
overlay.addCheckbox("Lifts", !STILL, (on) => {
  liftsRunning = on;
});

// THE FLAG flies as a simulated cloth (flag.ts) unless `?wave` asks for the
// closed-form wave it used to be. Both are pure in the wind's clock, so
// switching lands the other one on the same moment rather than restarting.
let clothSim = !new URLSearchParams(location.search).has("wave");
overlay.addCheckbox("Cloth sim", clothSim, (on) => {
  clothSim = on;
  waveFlags(windClock);
});

// THE ERECTION, 1887-89 (`?build`, or `?build=1887-10-10` to open on a
// day): the tower shown as it stood on a day, with a date scrubber
// (scrub.ts), and the temporary works it stood in (erection.ts). The
// toggle reloads, because the works are cooked and the staging is done
// once at load. It keeps the depth; turning build on opens on the page's
// own framing, the whole site, wherever the camera had gone, and turning
// it off keeps the view.
const BUILD = new URLSearchParams(location.search).has("build");
const buildBox = overlay.addCheckbox("Build", BUILD, (on) => {
  const q = new URLSearchParams(location.search);
  if (on) {
    q.set("build", "");
    // The walk is not reopened under build (see ROTATE, WALK AND BUILD).
    for (const k of ["walk", "walkAt", "walkNear"]) q.delete(k);
    q.delete("cam");
  } else {
    q.delete("build");
    const p = camera.position;
    const t = controls.target;
    q.set("cam", [p.x, p.y, p.z, t.x, t.y, t.z].map((v) => v.toFixed(2)).join(","));
  }
  location.search = q.toString().replace(/build=(&|$)/, "build$1");
});
buildGroup.take(buildBox.parentElement as HTMLElement);
buildGroup.open(BUILD);
/** Under the toggle in the View box; filled once the cook is drawn. */
const buildSlot = buildGroup.sub;
/** The scrubber, once `?build` has staged the tower; the loop plays it. */
let scrubber: ReturnType<typeof attachScrubber> | undefined;

// THE DEPTH (depth.ts): how far the lacing and the rivets go, each off,
// streamed or whole. A streamed axis is cooked round the camera by the
// runtime's World, off the page's thread, a cube at a time (bands.ts,
// bandsView.ts), over the tower cooked whole at the depth below it.
const DEPTH = pageDepth(location.search);
/** The levels streamed, if any; undefined when everything is cooked whole. */
const STREAMED = streamed(DEPTH);
/** The streamed depths, once the plain tower is drawn; the loop ticks them. */
let bands: Bands | undefined;

// THE DEPTH, at the top of the panel: one row per axis, a choice staged
// here and "apply" to open the page at it. The page reads its depth once,
// at load, so a change is a new URL — which can be bookmarked or sent — and
// that URL carries the current camera pose in `cam`, so the view survives
// the reload: the point of changing depth is to compare the same spot.
const DEPTH_TITLES: Record<"laced" | "rivets", Record<Depth, string>> = {
  laced: {
    off: "The web members as solid bars",
    streamed: "Every web member as four angles laced in X, round the camera, cooked as it moves",
    whole: "Every web member as four angles laced in X, the whole tower at once",
  },
  rivets: {
    off: "No rivets",
    streamed: "Every rivet as an instance, round the camera, cooked as it moves",
    whole: "Every rivet on the tower as an instance, at once",
  },
};
/** What the Detail box calls each depth: "whole" reads as "Full" on the panel; the URL keeps `whole`. */
const DEPTH_LABELS: Record<Depth, string> = { off: "Off", streamed: "Streamed", whole: "Full" };
const staged: Record<"laced" | "rivets", Depth> = { laced: DEPTH.laced, rivets: DEPTH.rivets };
const depthRadios: Record<"laced" | "rivets", HTMLInputElement[]> = { laced: [], rivets: [] };
// A framed section with its own heading, so it reads apart from the
// caption above and the live controls below, and so its button reads as
// belonging to it: nothing here takes effect until that button reloads.
const depthSection = framedBox("depth", "Detail");
// Claimed after the View and Look boxes, shown above them.
viewBox.parentElement?.before(depthSection.parentElement as HTMLElement);
for (const ax of ["laced", "rivets"] as const) {
  const row = document.createElement("div");
  row.className = "pcg-row";
  const name = document.createElement("label");
  name.textContent = capital(ax);
  // Narrower than the panel's 96px label column, so the three choices
  // hold one line inside the section's frame.
  name.style.flexBasis = "46px";
  const group = document.createElement("div");
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", capital(ax));
  group.style.cssText = "display:flex;gap:0.9em;white-space:nowrap";
  for (const d of DEPTHS) {
    const option = document.createElement("label");
    option.style.cssText = "display:inline-flex;gap:0.3em;align-items:center;cursor:pointer";
    option.title = DEPTH_TITLES[ax][d];
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `depth-${ax}`;
    radio.value = d;
    radio.style.cssText = "margin:0;accent-color:var(--ed-accent)";
    // Nothing streams under `?build` (depth.ts), so it is not offered.
    if (BUILD && d === "streamed") {
      radio.disabled = true;
      option.title = "Not with build: the staging dates the whole cook";
      option.style.opacity = "0.4";
      option.style.cursor = "default";
    }
    radio.addEventListener("change", () => stageDepth(ax, d));
    option.append(radio, DEPTH_LABELS[d]);
    group.append(option);
    depthRadios[ax].push(radio);
  }
  row.append(name, group);
  depthSection.append(row);
}
const applyButton = document.createElement("button");
applyButton.type = "button";
applyButton.textContent = "Apply";
applyButton.style.cssText =
  "cursor:pointer;background:none;border:1px solid currentColor;border-radius:4px;color:inherit;opacity:0.8;padding:0.15em 0.7em";
applyButton.addEventListener("click", applyDepth);
// A whole axis is the whole tower cooked on this page's thread at load.
// Numbers from the guide's table (Node, performance cores) and the page's
// own measurements; a browser cooks slower, hence "or more".
const depthWarning = document.createElement("p");
depthWarning.setAttribute("role", "status");
depthWarning.style.cssText =
  "margin:8px 0 0;padding:6px 8px;background:var(--ed-alert-bg);border-left:2px solid var(--ed-edge-warn);" +
  "color:var(--ed-ink);font-size:12px";
applyButton.style.marginTop = "4px";
depthSection.append(applyButton, depthWarning);

function stageDepth(ax: "laced" | "rivets", d: Depth): void {
  staged[ax] = d;
  // The rivets never go further than the lacing they sit on (depth.ts).
  const at = (x: Depth): number => DEPTHS.indexOf(x);
  if (ax === "laced" && at(staged.rivets) > at(d)) staged.rivets = d;
  if (ax === "rivets" && at(staged.laced) < at(d)) staged.laced = d;
  paintDepth();
}

function paintDepth(): void {
  for (const ax of ["laced", "rivets"] as const) {
    for (const radio of depthRadios[ax]) radio.checked = radio.value === staged[ax];
  }
  const changed = staged.laced !== DEPTH.laced || staged.rivets !== DEPTH.rivets;
  applyButton.disabled = !changed;
  applyButton.style.opacity = changed ? "1" : "0.35";
  applyButton.style.cursor = changed ? "pointer" : "default";
  applyButton.title = changed
    ? "Reopen the page at this detail, from this view"
    : "Pick a different detail above to apply it";
  const warning =
    staged.rivets === "whole"
      ? "Full rivets: 1.2 million rivet heads, about 100 million triangles with the 4 million of the " +
        "meshes. The cook takes 10 s or more and several gigabytes, and the page stalls while it runs."
      : staged.laced === "whole"
        ? "Full lacing: 4 million triangles. The cook takes several seconds, and the page stalls while it runs."
        : "";
  depthWarning.textContent = warning;
  depthWarning.hidden = warning === "";
}
paintDepth();

function applyDepth(): void {
  const p = camera.position;
  const t = controls.target;
  const cam = [p.x, p.y, p.z, t.x, t.y, t.z].map((v) => v.toFixed(2)).join(",");
  // The radii ride along while anything still streams. `still` rides along
  // with the pose: a scripted capture that moves between depths would
  // never settle on a page that started its lifts again.
  const radii = new URLSearchParams(location.search).get("bands");
  const streaming = staged.laced === "streamed" || staged.rivets === "streamed";
  const query = [
    ...depthParams(staged.laced, staged.rivets, DEPTH.fullRivets),
    streaming && radii ? `bands=${radii}` : "",
    STILL ? "still" : "",
    BUILD ? "build" : "",
    `cam=${cam}`,
  ].filter(Boolean);
  location.href = `?${query.join("&")}`;
}

// THE HIGHLIGHTS (see `HIGHLIGHTS`), a row of their own: each
// checkbox tinted its paint. Cooked meshes that arrive later take the
// paint as they are drawn, so the row works before the cook is done.
const highlightSlot = overlay.addSlot("controls");
const highlightRow = document.createElement("div");
highlightRow.style.cssText = "display:flex;gap:0.9em;align-items:baseline;flex-wrap:wrap";
const highlightLabel = document.createElement("span");
highlightLabel.textContent = "Highlight";
highlightLabel.style.opacity = "0.7";
highlightRow.append(highlightLabel);
for (const h of HIGHLIGHTS) {
  const label = document.createElement("label");
  label.style.cssText = "display:inline-flex;gap:0.3em;align-items:baseline;cursor:pointer";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = lit[h];
  box.disabled = FLAT_PROBLEM !== undefined;
  box.style.accentColor = `#${HIGHLIGHT_PAINT[h].toString(16).padStart(6, "0")}`;
  box.addEventListener("change", () => setHighlight(scene, h, box.checked));
  label.append(box, capital(h));
  highlightRow.append(label);
}
if (FLAT_PROBLEM !== undefined) highlightRow.title = FLAT_PROBLEM;
highlightSlot.append(highlightRow);

// COPY VIEW: everything it takes to open this page on the frame it shows
// now, as one line of URL and one of JSON, for pasting into an issue or a
// session and for naming a shot. The URL is the repro — the depth and every
// other query param as they are, plus the pose, the lens, the isolated
// class, the section, the highlights, the build's day, the walk's pose and
// both clocks, with `still` so the frame holds (the lifts' and the flag's
// clocks are restored by `t`, and would move on from it). The JSON restates
// it with what a URL cannot carry: the viewport, the pixel ratio, whether
// the lifts were running and whether a capture probe was driving the camera.

/** The options the "show" section has on, comma-separated; `all` when every one is. */
let showing = "all";
/** Whether the tower is in section. */
let sectioned = false;
/** Where the section's plane stands, in metres along its normal (section.ts). */
let sectionAt = 0;
/** The open section's per-frame upkeep (section.ts `tick`); unset until the cook attaches it. */
let sectionTick: (() => void) | undefined;
/** Whether the site rivets are lit against the shop's. */
let siteLit = false;

/** Params "copy view" writes itself; every other one is carried as it is. */
const VIEW_PARAMS = new Set([
  "cam",
  "drive",
  "fov",
  "t",
  "show",
  "section",
  "site",
  "hl",
  "ink",
  "build",
  "walk",
  "walkAt",
  "walkNear",
  "still",
  "wave",
]);

function copyableView(): string {
  const r = (v: number, digits = 3): number => Number(v.toFixed(digits));
  const p = camera.position;
  const t = controls.target;
  const eye = [r(p.x), r(p.y), r(p.z)];
  const target = [r(t.x), r(t.y), r(t.z)];
  const params = new URLSearchParams(location.search);
  const query: string[] = [];
  for (const [k, v] of params) {
    if (!VIEW_PARAMS.has(k)) query.push(v === "" ? k : `${k}=${encodeURIComponent(v).replace(/%2C/g, ",")}`);
  }
  const walked = walk.active ? walk.state() : null;
  query.push("still");
  // Walking, the camera and the lens are the walk's, which `walkAt` gives
  // back; a `cam` beside it would become the orbit the walk returns to.
  if (walked === null) {
    query.push(`cam=${[...eye, ...target].join(",")}`);
    if (camera.fov !== 42) query.push(`fov=${r(camera.fov, 2)}`);
    // A probed pose may sit outside the orbit's limits (under the polar
    // clamp, inside the minimum distance), which reopening it through the
    // orbit would clamp back: `drive` reopens it the way `pose` put it.
    if (driven) query.push("drive");
  }
  if (showing !== "all") query.push(`show=${showing.split(",").map(encodeURIComponent).join(",")}`);
  if (sectioned) query.push(sectionAt !== 0 ? `section=${sectionAt}` : "section");
  if (siteLit) query.push("site");
  if (!clothSim) query.push("wave");
  const highlighted = HIGHLIGHTS.filter((h) => lit[h]);
  if (highlighted.length > 0) query.push(`hl=${highlighted.join(",")}`);
  if (inked) {
    const weight = new URLSearchParams(location.search).get("ink");
    query.push(weight !== null && weight !== "" ? `ink=${encodeURIComponent(weight)}` : "ink");
  }
  // The day the scrubber shows; before the cook has staged it, the day asked for.
  const day = BUILD ? isoOf(scrubber?.day ?? buildDayParam(params.get("build"))) : null;
  if (day !== null) query.push(`build=${day}`);
  if (walked !== null) {
    query.push(`walk=${walked.step}`, `walkAt=${r(walked.dist)},${r(walked.yaw, 2)},${r(walked.pitch, 2)}`);
    if (walked.nearShadow) query.push("walkNear");
  }
  // Six places: at a millisecond a pulley's vertices land 0.3 m apart.
  query.push(`t=${carsParked ? "" : r(clock, 6)},${r(windClock, 6)}`);
  const url = `${location.origin}${location.pathname}?${query.join("&")}`;
  const state = {
    eye,
    target,
    fov: r(camera.fov, 2),
    viewport: [window.innerWidth, window.innerHeight],
    dpr: r(renderer.getPixelRatio(), 2),
    detail: { laced: DEPTH.laced, rivets: DEPTH.rivets },
    show: showing,
    section: sectioned,
    sectionAt,
    site: siteLit,
    highlight: highlighted,
    build: day,
    walk:
      walked === null
        ? null
        : {
            step: walked.step,
            flight: walked.flight,
            dist: r(walked.dist),
            yaw: r(walked.yaw, 2),
            pitch: r(walked.pitch, 2),
            nearShadow: walked.nearShadow,
          },
    lifts: { t: carsParked ? null : r(clock, 6), running: liftsRunning },
    wind: { t: r(windClock, 6), running: windRunning },
    driven,
  };
  return `eiffel view ${url}\n${JSON.stringify(state)}`;
}

/** Clipboard, or the old select-and-copy where the async API is refused. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

const copySlot = overlay.addSlot();
const copyButton = document.createElement("button");
copyButton.type = "button";
copyButton.textContent = "Copy view";
copyButton.title = "Copy a URL that reopens this exact frame (parked at this moment), and its state as JSON";
copyButton.style.cssText =
  "cursor:pointer;background:none;border:1px solid currentColor;border-radius:4px;color:inherit;opacity:0.8;padding:0.15em 0.7em";
let copyReset: ReturnType<typeof setTimeout> | undefined;
copyButton.addEventListener("click", () => {
  const text = copyableView();
  // Logged as well, so a view can be read back where the clipboard cannot.
  console.info(text);
  void copyText(text).then((ok) => {
    copyButton.textContent = ok ? "Copied" : "Copy failed: see console";
    clearTimeout(copyReset);
    copyReset = setTimeout(() => {
      copyButton.textContent = "Copy view";
    }, 1500);
  });
});
copySlot.append(copyButton);

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

// THE WALK (`?walk`, or `?walk=<step>` to open on a step; walkView.ts):
// first person up the 1,710 steps of 1889, on the path walk.ts builds from
// the stairs themselves. The orbit is off while it is on, and comes back
// as it was.
const walk = attachWalk({
  camera,
  controls,
  canvas: renderer.domElement,
  // Under the toggle in the View box; the walk shows and hides it itself.
  slot: walkGroup.sub,
  shadow: { near: (box) => rig.fitShadowNear(box), texel: () => rig.shadowTexel() },
  // `?walkNear`: the walk's near shadow on, the way "copy view" writes it.
  nearShadow: new URLSearchParams(location.search).has("walkNear"),
});
const WALK = BUILD ? null : new URLSearchParams(location.search).get("walk");
const walkBox = overlay.addCheckbox("Walk", WALK !== null, (on) => {
  if (on && controls.autoRotate) {
    controls.autoRotate = false;
    rotateBox.checked = false;
    rotateGroup.open(false);
  }
  walk.set(on);
});
walkGroup.take(walkBox.parentElement as HTMLElement);
if (BUILD) {
  for (const box of [rotateBox, walkBox]) {
    box.disabled = true;
    const row = box.parentElement as HTMLElement;
    row.style.opacity = "0.4";
    row.title = "Not with build: turn build off first";
  }
}
// `?walk=` is a step; `?walkAt=<m>,<yaw>,<pitch>` is the exact pose "copy
// view" writes — metres along the path and the look's turn off it, in
// degrees — and wins when both are given.
const WALK_AT = new URLSearchParams(location.search).get("walkAt")?.split(",").map(Number);
if (!BUILD && WALK_AT !== undefined && WALK_AT.length === 3 && WALK_AT.every(Number.isFinite)) {
  walk.goDist(WALK_AT[0]!, WALK_AT[1], WALK_AT[2]);
} else if (WALK !== null) walk.go(Number(WALK) || 0);

// W/A/S/D and Q/E move the orbit, camera and target together (keyMove.ts);
// the walk has keys of its own, and a driven camera is not the orbit's.
const keyMove = attachKeyMove({
  camera,
  controls,
  enabled: () => !walk.active && !driven && plates?.active !== true,
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
  overlay.addCollapsible(`Problems (${problems.length})`, true).textContent = problems.join("\n\n");
  for (const p of problems) console.error(`eiffel: ${p}`);
}

function triangles(mesh: Mesh): number {
  return trianglesOf(mesh.geometry);
}

function trianglesOf(g: BufferGeometry): number {
  return (g.index ? g.index.count : g.getAttribute("position").count) / 3;
}

/** One output, drawn. */
interface Drawn {
  readonly meshes: Mesh[];
  /** Triangles in the output's own meshes (instances not counted). */
  readonly triangles: number;
  /** Instances across its instance batches. */
  readonly instances: number;
  /** Triangles its instances draw: each instance's asset triangles. */
  readonly instancedTriangles: number;
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
  let instancedTris = 0;
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
          instancedTris += mesh.count * triangles(mesh);
        }
      }
    } catch (err) {
      problems.push(`${name}: ${message(err)}`);
    }
  }
  return { meshes: out, triangles: tris, instances, instancedTriangles: instancedTris };
}

async function main(): Promise<void> {
  const problems: string[] = [];
  statCook("Cooking…");
  // Whole lacing builds the web bars as laced lattice struts (about 2.9M
  // triangles more): the second of the tower's self-similar scales. Whole
  // rivets set rivets on them as instances, and so imply whole lacing;
  // `?rivets=full` adds the built-up uprights' rows as built (about 120,000
  // heads more, `Detail.fullRivets`). A streamed axis is cooked here at the
  // depth below it, and streamed over that (bands.ts). depth.ts reads the
  // query, and the golden (tests/support/eiffelGolden.ts) reads it the same.
  const params = new URLSearchParams(location.search);
  const { lacedWeb: laced, rivets, fullRivets } = cookedDetail(DEPTH);
  // `?plateSet=` and `?plateEdge=` are the crossing plates' two by-eye
  // dimensions (`CrossPlate` in parts.ts), in metres, while they are being
  // settled: the plate's depth under the corner angles and its half-width
  // across its member. They are the only numbers on this page that can be
  // changed from outside, because they are the only ones nothing derives.
  const crossPlate = tuned(params, { set: "plateSet", edge: "plateEdge" });
  const graph = buildEiffel(1889, { lacedWeb: laced, rivets, fullRivets, crossPlate, build: BUILD });
  // Shown before the cook, so a graph that fails to cook can still be read.
  attachGraphPanel([{ name: "Eiffel skeleton", graph }], { into: graphSlot, title: "Graph" });

  const t0 = performance.now();
  const { outputs } = await cook(graph);
  statCook(`${(performance.now() - t0).toFixed(0)} ms`);

  const box = new Box3();
  let total = 0;
  let instancedTotal = 0;
  let riveted = 0;
  let fitted = 0;
  let linked = 0;
  /** Drawn outputs with a "show" checkbox of their own (rivets have one between them). */
  const present: string[] = [];
  const keep = (name: string, drawn: Drawn): void => {
    for (const mesh of drawn.meshes) scene.add(mesh);
    meshes.set(name, drawn.meshes);
    total += drawn.triangles;
    instancedTotal += drawn.instancedTriangles;
    if (isFitting(name)) fitted += drawn.instances;
    else if (isChain(name)) linked += drawn.instances;
    else riveted += drawn.instances;
  };
  for (const cls of PART_CLASSES) {
    const collection = outputs[cls];
    if (collection === undefined) {
      classStats[cls]("Absent");
      continue;
    }
    // The foundations reach 50 m past the pedestals (the flue) and 12 m
    // under the ground, where the sun's shadow has nothing to fall on: they
    // stay out of the box the shadow is fitted to.
    const drawn = draw(cls, collection, MATERIALS[cls], cls === "foundations" ? new Box3() : box, problems);
    if (drawn.meshes.length === 0) {
      classStats[cls]("No mesh");
      continue;
    }
    // Glass casts nothing (see `GLASS`).
    if (cls === "glass") for (const mesh of drawn.meshes) mesh.castShadow = false;
    if (cls === "stairs") for (const mesh of drawn.meshes) highlightable(mesh, "stairs");
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
    // A car is the lifts' own fit-out, so it wears the platforms' paint,
    // and its panes the glass; what moves with it is machinery and wears
    // that; only a genuinely unclassed output gets the grey.
    const material = !isCar(name)
      ? UNCLASSED
      : isMachine(name)
        ? MATERIALS.machinery
        : isCarGlass(name)
          ? MATERIALS.glass
          : MATERIALS.platforms;
    const drawn = isRivets(name) ? drawRivets(name, collection, problems) : draw(name, collection, material, box, problems);
    if (!named) {
      overlay.addStat(`${name} (unclassed)`)(
        drawn.meshes.length === 0 ? "no mesh" : drawn.triangles.toLocaleString(),
      );
    }
    if (drawn.meshes.length === 0) continue;
    keep(name, drawn);
    if (!named) present.push(name);
    if (isCar(name) && !isMachine(name)) for (const mesh of drawn.meshes) highlightable(mesh, "lifts");
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
      const run = carRun(name);
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
    overlay.addStat("Lift cars")(
      `${cars.filter((c) => !isCarGlass(c.mesh.name)).length}${STILL ? " parked" : " running"}, ${carTriangles.toLocaleString()} tri`,
    );
  }
  statMesh(total.toLocaleString());
  statInstanced(instancedTotal.toLocaleString());
  statTotal((total + instancedTotal).toLocaleString());
  // Staged by date here, before anything below can swap a mesh's
  // geometry: scrub.ts.
  const erection = BUILD ? stageErection(meshes) : undefined;
  if (rivets || riveted > 0) {
    overlay.addStat("Rivets")(riveted > 0 ? riveted.toLocaleString() : "Absent");
  }
  if (riveted > 0) {
    let site = 0;
    for (const [name, list] of meshes) {
      if (isRivets(name) && rivetClass(name).share > 0) for (const m of list) site += headsIn(m);
    }
    overlay.addStat("Site-driven")(`${site.toLocaleString()} (${((100 * site) / riveted).toFixed(0)} %)`);
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
    overlay.addStat("Rivet path")(`${how}, ${rivetPath.ms.toFixed(0)} ms`);
    const lightSite = (on: boolean): void => {
      siteLit = on;
      lightSiteRivets(on);
    };
    lightSite(params.has("site"));
    overlay.addCheckbox("Site rivets", params.has("site"), lightSite);
  }
  // The tower in section (`?section`, or `?section=<m>` for the plane
  // moved off the axis; section.ts): cut on a plane parallel to PL-XX's
  // through piles 1 and 3, the ground opened on the side taken away.
  const section = attachSection({
    scene,
    renderer,
    meshes,
    controls,
    changed: () => {
      renderer.shadowMap.needsUpdate = true;
    },
  });
  sectionTick = () => section.tick();
  // Half a metre past the tower either way, so the ends keep all of it and none.
  const span = Math.ceil(section.reach + 0.5);
  // On the slider's metre steps and inside its span, so the bar, its
  // readout and the plane agree.
  const askedAt = Math.round(Number(params.get("section")));
  sectionAt = Number.isFinite(askedAt) ? Math.min(span, Math.max(-span, askedAt)) : 0;
  section.move(sectionAt);
  const cut = (on: boolean): void => {
    sectioned = on;
    section.set(on);
    rig.showUnderground(on);
    sectionGroup.open(on);
  };
  const sectionBox = overlay.addCheckbox("Section", params.has("section"), cut);
  sectionGroup.take(sectionBox.parentElement as HTMLElement);
  const cutRow = overlay.addSlider(
    "Cut at",
    {
      min: -span,
      max: span,
      step: 1,
      value: sectionAt,
      format: (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} m`,
    },
    (v) => {
      sectionAt = v;
      section.move(v);
    },
  );
  sectionGroup.take(cutRow, "sub");
  cut(params.has("section"));
  if (fitted > 0) overlay.addStat("Fittings")(fitted.toLocaleString());
  if (linked > 0) overlay.addStat("Chain pieces")(linked.toLocaleString());
  // Only when something was overridden: the default page says nothing about
  // a knob nobody turned.
  const turned = Object.entries(crossPlate);
  if (turned.length > 0) {
    overlay.addStat("Plate")(turned.map(([k, v]) => `${k} ${v}`).join(", "));
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

  // SHOW: which classes are drawn, a checkbox each, folded until wanted.
  // Hiding classes is how one is judged on its own; the shadows are redrawn
  // with it, so what is shown shades only itself. Every drawn output rides
  // with one box: every rivet output with "rivets" (they are named for
  // where they sit, `rivets.leg.crossings.500`, not for a class), a car
  // with the fit-out it is painted like and its panes with the glass, what
  // moves with a car with the machinery, the flag with the summit's rod.
  if (meshes.size > 1) {
    const names = [...meshes.keys()];
    const options = [
      ...present,
      ...(hasRivets ? ["rivets"] : []),
      ...(names.some(isFitting) ? ["fittings"] : []),
      ...(names.some(isWorks) ? ["works"] : []),
    ];
    const owner = (name: string): string =>
      isRivets(name)
        ? "rivets"
        : isWorks(name)
          ? "works"
          : isFitting(name)
            ? "fittings"
            : isCar(name) && !isMachine(name)
              ? isCarGlass(name)
                ? "glass"
                : "platforms"
              : isChain(name) || isMachine(name)
                ? "machinery"
                : isCloth(name)
                  ? "summit"
                  : name;
    // `?show=<a>,<b>` opens with only those on, the way "copy view" writes
    // it; `?show=` with nothing named shows nothing, and a list naming no
    // option shows everything rather than an empty ground.
    const asked = params.get("show");
    const listed = (asked ?? "").split(",").filter((o) => options.includes(o));
    const shown = new Set(asked === null || (asked !== "" && listed.length === 0) ? options : listed);

    const showSlot = overlay.addSlot("controls");
    const fold = document.createElement("details");
    fold.style.cssText = "margin:0;padding:0;border:0";
    const summary = document.createElement("summary");
    const count = document.createElement("span");
    count.style.cssText = "margin-left:0.5em;color:var(--ed-ink-faint)";
    summary.append("Show", count);
    const bulk = document.createElement("div");
    bulk.style.cssText = "display:flex;gap:0.9em;margin:6px 0 4px";
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:2px 10px";
    const boxes = new Map<string, HTMLInputElement>();
    for (const o of options) {
      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;gap:0.35em;align-items:center;cursor:pointer;font-size:12px;min-width:0;overflow-wrap:anywhere";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.style.margin = "0";
      box.addEventListener("change", () => {
        if (box.checked) shown.add(o);
        else shown.delete(o);
        apply();
      });
      label.append(box, capital(o));
      grid.append(label);
      boxes.set(o, box);
    }
    for (const [text, all] of [
      ["All", true],
      ["None", false],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.style.cssText =
        "background:none;border:0;padding:0;color:inherit;font:inherit;font-size:12px;cursor:pointer;" +
        "text-decoration:underline;text-underline-offset:3px;opacity:0.8";
      button.addEventListener("click", () => {
        shown.clear();
        if (all) for (const o of options) shown.add(o);
        apply();
      });
      bulk.append(button);
    }
    fold.append(summary, bulk, grid);
    showSlot.append(fold);

    const apply = (): void => {
      const on = options.filter((o) => shown.has(o));
      showing = on.length === options.length ? "all" : on.join(",");
      count.textContent = on.length === options.length ? "all" : `${on.length} of ${options.length}`;
      for (const [o, box] of boxes) box.checked = shown.has(o);
      for (const [name, list] of meshes) {
        const o = owner(name);
        const visible = !options.includes(o) || shown.has(o);
        for (const m of list) m.visible = visible;
      }
      renderer.shadowMap.needsUpdate = true;
    };
    apply();
    // Opened when the page opens with something hidden, so it says why.
    fold.open = showing !== "all";
    // The highlights sit just above it.
    showSlot.before(highlightSlot);
  }

  if (erection !== undefined) {
    const raw = params.get("build");
    scrubber = attachScrubber(buildSlot, buildDayParam(raw), !STILL && (raw === null || raw === ""), (day) => {
      erection.setDay(day);
      renderer.shadowMap.needsUpdate = true;
    });
    const { ms, bytes } = erection.stats;
    overlay.addStat("Dated")(`${ms.toFixed(0)} ms, ${(bytes / 1024).toFixed(0)} KB`);
    window.pcgEiffelBuild = { setDay: (iso) => scrubber?.set(buildDayParam(iso)) };
  }

  // The streamed depths, over the tower just drawn.
  if (STREAMED !== undefined) {
    bands = startBands({
      scene,
      spec: bandsFrom(params.get("bands"), STREAMED),
      crossPlate,
      materials: MATERIALS,
      meshes,
      rivetMaterial: (name) => (rivetClass(name).share > 0 ? PACKED_SITE : PACKED_SHOP),
      rivetHead: ASSETS.rivet!.geometry,
      drawFallback: (name, transforms, drive) => {
        const batch = {
          assetId: RIVET_ASSET,
          count: transforms.length / 16,
          transforms,
          ...(drive === undefined ? {} : { attributes: { [HEAD_DRIVE_ATTR]: drive } }),
        };
        const drawn = toInstancedMeshes([batch], ASSETS);
        for (const mesh of drawn) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          if (rivetClass(name).share > 0) mesh.material = RIVET_SITE;
        }
        driveHeads(drawn);
        return drawn;
      },
      rivetsMade: (made) => {
        for (const mesh of made) highlightable(mesh, "rivets");
      },
      shadowsChanged: () => {
        renderer.shadowMap.needsUpdate = true;
      },
      stat: (label) => overlay.addStat(label),
    });
    window.pcgEiffelBands = bands;
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
  carsParked = false;
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

/**
 * Wool bunting: matte, both sides seen, and a sheen — the fibres' own
 * retroreflection at grazing angles, which is what makes a fold read as
 * cloth rather than painted card.
 */
const FLAG_MATERIAL = new MeshPhysicalMaterial({
  map: flagBands(),
  roughness: 0.88,
  metalness: 0,
  sheen: 1,
  sheenRoughness: 0.55,
  sheenColor: 0xd8d4cc,
  side: DoubleSide,
});
// The flag's colours are its own, in the drawing too (wash.ts `WashRole`).
FLAG_MATERIAL.userData.washRole = "own" satisfies WashRole;

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
/** Where the simulation is kept stepping while the wave is shown; never drawn. */
const FLAG_IDLE = new Float32Array(3 * FLAG_POINTS);

/**
 * THE FLAG'S CLOCK is its own. It runs whenever the page is not `?still`
 * or paused by the capture probe — not with the lifts' checkbox, which
 * parks the cars, not the wind — and `setClock` sets it with the lifts',
 * so a probed frame at t shows the cars AND the flag as any run has them
 * at t: `flagPose` and `flagWave` are both pure in time.
 */
// `?t=<lifts>,<wind>` opens with the two clocks at those seconds, the way
// "copy view" writes them beside `still`: the cars and the flag as they
// were when the view was copied. An empty lifts entry (`t=,<wind>`) is a
// page whose cars never left where the graph built them — which no clock
// reproduces, since the built pose is not the run's pose at 0.
const CLOCKS = new URLSearchParams(location.search).get("t")?.split(",");
const clockAt = (i: number): number | undefined => {
  const raw = CLOCKS?.[i];
  const n = raw === undefined || raw === "" ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? n : undefined;
};
let windClock = clockAt(1) ?? 0;
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

/** Put every cloth where `flagPose` (or, with "cloth sim" off, `flagWave`) has it at `t`. Allocates nothing. */
function waveFlags(t: number): void {
  if (cloths.length === 0) return;
  if (clothSim) flagPose(t, FLAG_AT);
  else flagWave(t, FLAG_AT);
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

let clock = clockAt(0) ?? 0;
/** Whether every car still stands where the graph built it: `moveCars` has never run. */
let carsParked = true;
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
    // The simulation keeps flying while the wave is shown, a step a frame,
    // so checking "cloth sim" again lands on it at once rather than
    // replaying every second it was off.
    if (!clothSim && cloths.length > 0) flagPose(windClock, FLAG_IDLE);
  }
  scrubber?.tick(Math.min((now - lastFrame) / 1000, 0.1));
  const frameSeconds = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  // A driven camera is not an orbited one: `update()` would re-derive the
  // pose from the controls' own spherical and clamp it back inside
  // `maxPolarAngle` and the distance limits, which is exactly what a shot
  // looking up a leg from the ground is outside of.
  // Every frame, walking or not: it is also what drops a key held while
  // the orbit was not the camera's.
  keyMove.tick(frameSeconds);
  if (walk.active) walk.tick();
  else if (!driven) controls.update();
  bands?.tick(camera);
  sectionTick?.();
  // The drawing pales what lies behind what the view is looking at: the
  // orbit's target (which a scripted pose sets too), or a near storey's
  // depth on the walk, which leaves the orbit's target behind.
  rig.ink.focus(walk.active ? 60 : camera.position.distanceTo(controls.target));
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
      /** What the panel's "copy view" button copies: the reopening URL, then the state as JSON. */
      view(): string;
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
    rotateBox.checked = false;
    rotateGroup.open(false);
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
  view: copyableView,
};

// `?drive` with `?cam`: the pose taken the way `pose` takes it, off the
// orbit and its clamps, so a probed shot that "copy view" wrote reopens
// where it was — under the polar limit, or nearer than the orbit allows.
const DRIVE = new URLSearchParams(location.search).has("drive");
if (DRIVE && pose !== undefined && pose.length === 6 && pose.every(Number.isFinite)) {
  const [x, y, z, tx, ty, tz] = pose as [number, number, number, number, number, number];
  window.pcgEiffel.pose([x, y, z], [tx, ty, tz]);
}

main()
  .then(() => {
    // A parked page (`?still`) never moves a car itself, so `?t=` puts
    // them, and the flag, where its clocks say once the cook has built them.
    if (clockAt(0) !== undefined) moveCars(clock);
    if (clockAt(1) !== undefined) waveFlags(windClock);
    // Two frames after the scene is complete — the first draws the shadow
    // map — `data-ready` tells a scripted capture it can shoot.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.body.dataset.ready = "1";
      }),
    );
  })
  .catch((err: unknown) => {
    statCook("Failed");
    report([message(err)]);
    document.body.dataset.ready = "failed";
  });
