/**
 * The contract between the tower's modules and the graph that assembles
 * them: every module builds its members into finished MESH nodes and hands
 * them back sorted by class. The graph merges each class into one output,
 * so a render colours by class and an inspection counts by class.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { filterPrimitivesByAttribute, jitterPoints, mergePrimitives, removeAttribute, setAttribute } from "pcg-ts";
import { gateMesh } from "./region.js";

export const PART_CLASSES = [
  /** The corner uprights ("arbalétriers") of the legs and the shaft. */
  "uprights",
  /** The web: every diagonal of every braced panel. */
  "bracing",
  /** Horizontal struts at the panel nodes (and mid-panel in panels 1-4). */
  "horizontals",
  /** Lattice girders: the belts at the floors and the girders between legs. */
  "girders",
  /** The four decorative arches and their arcade. */
  "arches",
  /** Floor platforms and the landing. */
  "platforms",
  /**
   * Every stair of the tower's climb: the 1,710 steps of 1889 run by run
   * with their stringers, landings, ladders and hand rails (`stairs.ts`,
   * placed by `lifts.ts`). Painted as the platforms are; a class of its
   * own so a stair can be isolated and highlighted without the floor it
   * serves. The 1st floor's entrance flights on the Français and the Russe
   * are the pavilions' dress, not the climb, and stay in "platforms".
   */
  "stairs",
  /** The masonry pedestals. */
  "masonry",
  /**
   * What is under the ground, and what stood on the site's higher ground
   * round the piles (ground.ts): the machine room's walls and floors and
   * the flue (its chimney is modelled, not drawn: ground.ts' header says
   * why). The ground plane hides what is under it; the
   * page's section view opens it.
   */
  "foundations",
  /** Everything above the 3rd floor, and the 3rd-floor room. */
  "summit",
  /**
   * Gusset plates: where web members meet the uprights, and over every
   * crossing of two laced struts in the legs, the shaft and the first
   * floor, and the summit girders' "2 Goussets 1.130 x 10". All are
   * laced-depth-and-up, so this class is empty at the plain depth.
   */
  "gussets",
  /** The 72 names on the first-floor skirt, gilded. */
  "names",
  /**
   * The lifts' machinery that stands still: the Roux chain ducts and
   * wheels, the Otis cylinder, beams, pulleys and counterweight track, the
   * Edoux heads and top pulleys. What of it moves comes out as cars and
   * chains (see `Parts`).
   */
  "machinery",
  /**
   * The iron under and round the piles' feet (ground.ts): the caissons'
   * and the supports' iron, and the machine room's plant. In the
   * machinery's paint, and jittered with it (`JITTERED_WITH`); a class of
   * its own so the lifts' machinery can be shown alone, without it.
   */
  "groundIron",
  /**
   * Clear glass: the pavilions' doors, screens and tympana on the 1st
   * floor, the 3rd-floor gallery's croisées and Eiffel's pavilion's
   * windows. The page draws it see-through and lets it cast no shadow.
   */
  "glass",
  /**
   * The arcade crescents' « verres coulés étamés et teintés »: glass
   * silvered and tinted to read as gilt plate, so opaque and metallic.
   */
  "silvered",
] as const;

export type PartClass = (typeof PART_CLASSES)[number];

/**
 * The crossing plates' two dimensions that are settled BY EYE rather than
 * derived, in metres. They are the only numbers in the tower that are, so
 * they are the only ones the page can override: `?plateSet=` and
 * `?plateEdge=` reach them through {@link Detail}, and a reload is the
 * whole loop. Everything else about a plate follows from the members it
 * covers.
 */
export interface CrossPlate {
  /**
   * How far UNDER a strut's corner angles' outer face a plate is set.
   *
   * It has to stay OUTSIDE the lacing or the zigzag shows through it, and
   * the lacing is not where the section table suggests: its swept square
   * is mitred at the zigzag's vertices, so on two of a strut's four sides
   * it stands 0.0276 off the chord axis rather than `LACE` (0.0225), which
   * puts its outer surface **0.0174** inside the angles' outer face, not
   * 0.0225 [measured three ways: on the cooked lacing member by member
   * (0.017406 for an 800, 0.019402 for a 600, 0.018727 for a 500), under
   * the plates themselves, and in closed form — the zigzag turns through
   * `2 atan(2 (outer - CHORD) / step)` at a vertex, so the mitred square
   * reaches `LACE / cos` of half that, agreeing to 1e-5]. So an 800's
   * window is 0 to 0.0174, and the default takes 2.40 mm of it as margin.
   *
   * A first pass set this to 0.02 against the 0.0225 the table implies,
   * which put the plate 2.6 mm BEHIND the lacing at every one of the
   * plates. The 0.0174 is a MID-SPAN figure: at the penultimate ring
   * before a member's cut end the sweep blows out past its mitre to
   * 1.6 mm, which no usable `set` stays outside of. The end cap itself is
   * the safest place on a member, at the full 0.0225, having no bisector
   * to mitre.
   */
  readonly set: number;
  /**
   * A plate's half-width across its member, at an 800 strut; a narrower
   * strut takes a proportionally narrower plate. At the default it is
   * exactly the strut's own half-width, so the plate's long edges land on
   * the strut's sides.
   */
  readonly edge: number;
}

/** {@link CrossPlate} as the tower is built without an override. */
export const CROSS_PLATE: CrossPlate = { set: 0.015, edge: 0.4 };

/** The strut `CrossPlate.edge` is quoted at: an 800 (`MEMBERS.web` below XIX). */
export const CROSS_PLATE_AT = 0.4;

/** How much of the tower's self-similar depth to build. */
export interface Detail {
  /**
   * Override either of the crossing plates' by-eye dimensions; the rest of
   * {@link CROSS_PLATE} stands. The page fills this from its query string.
   */
  readonly crossPlate?: Partial<CrossPlate>;
  /**
   * Build the web bars and horizontal struts as laced lattice struts
   * (four corner angles and X lacing) instead of solid square members.
   * About 2.9M triangles more (0.41M to 3.30M).
   */
  readonly lacedWeb?: boolean;
  /**
   * Rivets as instances (asset id {@link RIVET_ASSET}): one wherever a
   * lacing bar meets a chord or crosses another, along the box members'
   * seams, and over the gusset plates. Implies `lacedWeb`. About 1,208,000
   * instances.
   */
  readonly rivets?: boolean;
  /**
   * With `rivets`, also every row the built-up uprights' faces carry as
   * PL-IX draws them besides the corner angles' (the C.J.s', the fins' and
   * the channels' flats: builtup.ts, `lowerBuiltRows`). About 120,000 heads more.
   */
  readonly fullRivets?: boolean;
  /**
   * The erection's temporary works as well (`erection.ts`): the timber
   * pylons with their sand boxes and shoes, the girders' scaffolds and
   * their decks, as `works.<kind>` outputs. The page asks for it with
   * `?build`; nothing of the tower changes.
   */
  readonly build?: boolean;
  /**
   * Build the tower to be cooked a region at a time (`region.ts`): the
   * same graph, node for node, plus gates and clips whose box
   * `setRegion` moves, so one cell's output is exactly the whole cook's
   * inside that cell. The page streams the laced and riveted depths
   * this way (`bands.ts`, `depth.ts`).
   */
  readonly region?: boolean;
}

/**
 * The asset id every rivet spawns. A rivet's instance matrix carries its
 * true size, so the host's asset is a UNIT round head: a dome of base
 * radius 1 on local y = 0, rising along +y, the rivet's axis, out of the
 * plate.
 */
export const RIVET_ASSET = "rivet";

/**
 * One millimetre: the most any built position moves, per axis (plus one
 * f32 ULP, which the store adds and which matters at 300 m, where the ULP
 * is 15 µm — see the bound in `tests/eiffelSkeleton.test.ts`).
 *
 * The tower is drawn from ONE set of dimensions, so faces meet exactly —
 * a gusset lies on the upright it plates, a member's end face lies on the
 * horizontal it lands on, and the arch's foot lies 0.2 mm inside the
 * pedestal's box face (SOURCES.md §17.2). Coplanar is the one thing a
 * depth buffer cannot resolve, and the page's logarithmic buffer only
 * moves where it fails, not whether. Its resolution is set by `far`
 * ALONE — that is what log depth buys, and `near` does not enter it: the
 * depth written is log2(1 + w) / log2(1 + far), so one step of a 24-bit
 * buffer is (1 + w) ln(1 + far) / 2^24. With `far` 2000 that is 0.27 mm
 * at the 608 m the page opens on and 0.68 mm at the 1500 m it lets the
 * camera back out to, so faces that agree to the millimetre flicker
 * against each other as the camera turns — which is what the tower's own
 * dimensions make of every joint. (24 bits is what a desktop browser
 * gives; three.js asks only for `depth: true`. On a 16-bit buffer that
 * step is 70 mm at 600 m and nothing this file can do would help.)
 *
 * WHAT A MILLIMETRE ACTUALLY BUYS, measured rather than asserted: of the
 * 13,716 gusset points that lay exactly in an upright's face plane at the
 * laced depth, none still does, and about three quarters end up more than
 * one depth step clear at the opening pose. The rest still fight, but
 * over part of a face and differently across it rather than the whole
 * face at once. Raising the figure would not fix the tail and would widen
 * the cracks below.
 *
 * WHAT IT COSTS. {@link jitter} is keyed on POINT IDENTITY — the position
 * bits together with the point's `seed` — not on the array slot, so this
 * is a property of the built tower rather than of a cook order. Two
 * points that coincide AND share a seed move together and stay welded;
 * two that coincide with DIFFERENT seeds part company, and about two
 * fifths of the coincident pairs inside a single class are of that kind,
 * opening cracks of a millimetre or so (3 mm at the worst) where one
 * member lands on another. That is a fifth of a pixel at the poses this
 * page opens on and about a pixel at the guide's closest figure; it is
 * ~20 px if the camera is driven all the way in to `minDistance`, 0.2 m,
 * which is the one place this trade is visible.
 */
export const JITTER = 0.001;

/**
 * Move every point of `geo` off its plane by at most {@link JITTER}.
 *
 * Each jitter node carries its own seed (the graph's, folded with the
 * node's id), so two faces that coincide in DIFFERENT classes — a gusset
 * on an upright — always part company. Within one class it depends on the
 * points' seeds: identical seeds stay welded, different ones part. See
 * {@link JITTER} for what that costs.
 */
export function jitter(g: Graph, id: string, geo: NodeHandle): NodeHandle {
  const node = g.add(jitterPoints, { amount: [JITTER, JITTER, JITTER] }, id);
  g.connect(geo, "out", node, "in");
  return node;
}

/**
 * What a module returns: its finished mesh nodes, by class, and any rivet
 * spawners, each named. Every rivet set builds its own spawner, so rivets
 * come out as several outputs, `rivets.<name>` (45 at full detail); one
 * spawn is also capped at MAX_INSTANCES, 1,048,576.
 *
 * `cars` is the one thing here the graph does NOT settle in place: a lift
 * car is a body the host moves, so each comes out as its own output,
 * `car.<name>`, rather than merged into a class where it would be welded
 * to the floor it passes. `lifts.ts` publishes the run each one rides
 * (`LIFT_CARS`); the graph owns where a car CAN be and the page owns when.
 */
export type Parts = Partial<Record<PartClass, NodeHandle[]>> & {
  rivets?: Array<{ name: string; spawn: NodeHandle }>;
  /**
   * Instanced dressings that are not rivets — the 1st floor's gas globes,
   * glass cabochons and stoneware balusters — each spawned against its own
   * asset id and put out as `fittings.<name>`, so the host draws each from
   * its asset map in its own material, and counts them apart.
   */
  fittings?: Array<{ name: string; spawn: NodeHandle }>;
  cars?: Array<{ name: string; mesh: NodeHandle }>;
  /**
   * The Roux lifts' articulated chains: every link an instance, each chain
   * spawned against the chain assets and put out as `chain.<name>`, so the
   * host can re-place its links as the car it pushes moves (`lifts.ts`
   * publishes each circuit as `LIFT_CHAINS`).
   */
  chains?: Array<{ name: string; spawn: NodeHandle }>;
  /**
   * Cloth the host moves point by point — the tricolour on the rod
   * (`flag.ts`) — each put out as `cloth.<name>`, NOT jittered: every one
   * of its points is re-placed each frame, so a jitter would only be
   * overwritten.
   */
  cloth?: Array<{ name: string; mesh: NodeHandle }>;
  /**
   * The erection's temporary works (`erection.ts`), each kind put out as
   * `works.<name>`, not jittered: they meet the tower's faces nowhere, and
   * the page shows each only between the days it stood (`chronology.ts`
   * `WORKS`).
   */
  works?: Array<{ name: string; mesh: NodeHandle }>;
};

/**
 * A class that is jittered WITH another and parted from it afterwards,
 * rather than jittered on its own: the stairs, which were platforms until
 * they were a class of their own. A jitter's seed is its node's, so a
 * `stairsJitter` would have moved every stair point somewhere new within
 * {@link JITTER} — invisible, but not the tower the platforms' jitter
 * built, and the page's default look was kept to the bit when the class
 * was split out. Merged into the platforms, jittered with them, and taken
 * back out by a primitive tag, every point lands where it did. The cost
 * is the one the jitter exists to avoid, kept as it was: a stair face that
 * coincides with a platform's (a newel's foot on its deck) is not parted
 * from it, which is a tie between two faces of one paint.
 */
export const JITTERED_WITH: Partial<Record<PartClass, PartClass>> = { stairs: "platforms", groundIron: "machinery" };

/** The primitive tag a class jittered with another is taken back out by: its place in `PART_CLASSES`, plus one. */
const PARTED = "partedClass";

/**
 * Declare one graph output per class that has parts, named for the class,
 * each {@link jitter}ed off the planes its neighbours share.
 */
export function assemble(g: Graph, parts: Parts): void {
  for (const cls of PART_CLASSES) {
    if (JITTERED_WITH[cls] !== undefined) continue;
    const own = parts[cls] ?? [];
    // The classes jittered with this one (`JITTERED_WITH`), each part
    // tagged with its class so the jitter's output can be parted again.
    const riders = PART_CLASSES.filter((c) => JITTERED_WITH[c] === cls && (parts[c]?.length ?? 0) > 0);
    const list = [
      ...own,
      ...riders.flatMap((c) =>
        (parts[c] as NodeHandle[]).map((p, k) => {
          const tag = g.add(
            setAttribute,
            { name: PARTED, domain: "primitive", type: "u32", value: PART_CLASSES.indexOf(c) + 1 },
            `${c}Tag${k}`,
          );
          g.connect(p, "out", tag, "in");
          return tag;
        }),
      ),
    ];
    if (list.length === 0) continue;
    // In a regional build (region.ts) each part is cut to its cell before
    // the merge, so a cell merges and jitters its own share of the class
    // and not the tower's; the halo covers the jitter still to come.
    const kept = list.map((p, k) => gateMesh(g, `${cls}Gate${k}`, p, 10 * JITTER));
    let out = kept[0] as NodeHandle;
    if (kept.length > 1) {
      out = g.add(mergePrimitives, {}, `${cls}Out`);
      for (const p of kept) g.connect(p, "out", out, "in");
    }
    const jittered = jitter(g, `${cls}Jitter`, out);
    if (riders.length === 0) {
      g.output(jittered, "out", cls);
      continue;
    }
    // Parted: the merge filled the host's own parts' tag with 0.
    const part = (c: PartClass, value: number): void => {
      const kept = g.add(
        filterPrimitivesByAttribute,
        { attribute: PARTED, comparison: "eq", value, unreferencedPoints: "drop" },
        `${c}Parted`,
      );
      g.connect(jittered, "out", kept, "in");
      const clean = g.add(removeAttribute, { names: [PARTED], domain: "primitive" }, `${c}Untagged`);
      g.connect(kept, "out", clean, "in");
      g.output(clean, "out", c);
    };
    if (own.length > 0) part(cls, 0);
    for (const c of riders) part(c, PART_CLASSES.indexOf(c) + 1);
  }
  for (const { name, spawn } of parts.rivets ?? []) g.output(spawn, "instances", `rivets.${name}`);
  for (const { name, spawn } of parts.fittings ?? []) g.output(spawn, "instances", `fittings.${name}`);
  for (const { name, spawn } of parts.chains ?? []) g.output(spawn, "instances", `chain.${name}`);
  for (const { name, mesh } of parts.cloth ?? []) g.output(mesh, "out", `cloth.${name}`);
  for (const { name, mesh } of parts.works ?? []) g.output(mesh, "out", `works.${name}`);
  for (const { name, mesh } of parts.cars ?? []) {
    g.output(jitter(g, `${carId(name)}Jitter`, mesh), "out", `car.${name}`);
  }
}

/** A car's node ids, from its name: `roux.ouest` -> `carRouxOuest`. */
function carId(name: string): string {
  return `car${name
    .split(".")
    .map((w) => (w[0] as string).toUpperCase() + w.slice(1))
    .join("")}`;
}

/** Fold several modules' parts into one. */
export function joinParts(...all: Parts[]): Parts {
  const out: Parts = {};
  for (const parts of all) {
    for (const cls of PART_CLASSES) {
      const list = parts[cls];
      if (list !== undefined && list.length > 0) (out[cls] ??= []).push(...list);
    }
    if (parts.rivets !== undefined) (out.rivets ??= []).push(...parts.rivets);
    if (parts.fittings !== undefined) (out.fittings ??= []).push(...parts.fittings);
    if (parts.cars !== undefined) (out.cars ??= []).push(...parts.cars);
    if (parts.chains !== undefined) (out.chains ??= []).push(...parts.chains);
    if (parts.cloth !== undefined) (out.cloth ??= []).push(...parts.cloth);
    if (parts.works !== undefined) (out.works ??= []).push(...parts.works);
  }
  return out;
}
