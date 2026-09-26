/**
 * THE GROUND AND WHAT IS UNDER IT: the machine room in pile 3's basement,
 * its flue and chimney (SOURCES.md §31).
 *
 * THE DATUM. The model's ground is one flat plane at the tower centre's
 * « Sol au centre de la Tour (33.50) », y 0 [sourced PL-I]. The Champ de
 * Mars round the piles stood higher — pile 2's walls are « arasés à la cote
 * +35, niveau du sol définitif du Champ-de-Mars », pile 3's are printed at
 * « (35.08) », the piles' floor, y 1.58 [sourced E1900-TXT p. 87, PL-V] —
 * and the model does not raise it (the
 * pedestals stand on its y 0, SOURCES.md §31). So everything here is
 * placed at its printed cote, y = cote − 33.50, and whatever the plates
 * carry up to that higher ground is cut off just under the model's:
 * `CAP` below y 0, where the page's ground plane hides it until its
 * section view opens the ground (main.ts).
 *
 * THE MACHINE ROOM (E1900-TXT pp. 88, 193, 199-202, 207; PL-III Figs 2, 4,
 * PL-IV Figs 13-22, PL-V Figs 5-6, PL-XX Fig. 4, PL-XXI's pile 3 inset):
 * pile 3's interior was left hollow as the « salle des machines » under a
 * glazed floor at ground level, the four massifs in its corners and the
 * Otis foundation along its A-C diagonal. The room's walls, floors, the
 * boilers' brick settings and flue chamber go to the `foundations` class;
 * the plant, as simple massing placed where PL-III Fig. 4 draws it, to
 * `machinery`. Positions are read at 1:200 on PL-III Fig. 4 (±0.3-0.5 m)
 * and sizes not printed are [estimated]; each constant says which.
 *
 * THE FLUE AND THE CHIMNEY: a vaulted culvert 116.23 m from the room's +z
 * wall along the pile 3 - pile 4 centre line, round pile 4's corner, to a
 * round brick chimney « à droite de la pile 4 », 17.23 m over its footing
 * [sourced p. 202, PL-IV Fig. 15; route measured PL-III Fig. 2].
 *
 * Everything is built in world coordinates (pile 3 is the +x −z leg,
 * `PILES` in spec.ts), as one set of convex prisms per class.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { attribute, extrudePolygon, mergePrimitives, pointGrid, pointsToPath, setAttribute, vec } from "pcg-ts";
import { type Vec3, indexTable } from "./lattice.js";
import type { Parts } from "./parts.js";
import { yOfCote } from "./spec.js";

// ---------------------------------------------------------------------------
// Vectors and solids

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const dot3 = (p: Vec3, q: Vec3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross3 = (p: Vec3, q: Vec3): Vec3 => [
  p[1] * q[2] - p[2] * q[1],
  p[2] * q[0] - p[0] * q[2],
  p[0] * q[1] - p[1] * q[0],
];
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / Math.hypot(p[0], p[1], p[2]));

const UP: Vec3 = [0, 1, 0];
const X: Vec3 = [1, 0, 0];
const Z: Vec3 = [0, 0, 1];

/**
 * A closed, planar, CONVEX outline extruded `depth` along its own normal
 * (right-hand rule): a cap is a fan from its first point.
 */
export interface Prism {
  readonly outline: readonly Vec3[];
  readonly depth: number;
}

/** Wound so a planar outline's normal (Newell's) points along `into`: it then extrudes that way. */
function towards(outline: readonly Vec3[], into: Vec3): Vec3[] {
  const n = [0, 0, 0];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0, z0] = outline[i] as Vec3;
    const [x1, y1, z1] = outline[(i + 1) % outline.length] as Vec3;
    n[0] += (y0 - y1) * (z0 + z1);
    n[1] += (z0 - z1) * (x0 + x1);
    n[2] += (x0 - x1) * (y0 + y1);
  }
  const along = n[0]! * into[0] + n[1]! * into[1] + n[2]! * into[2] > 0;
  return along ? [...outline] : [...outline].reverse();
}

/**
 * A box by its frame: centre, the unit directions of its local x and y
 * (perpendicular; z is x × y), and its size along each.
 */
export interface Block {
  readonly at: Vec3;
  readonly x: Vec3;
  readonly y: Vec3;
  readonly size: Vec3;
}

/** A block as a prism: its face on its own −z, extruded along its +z. */
export function blockPrism(b: Block): Prism {
  const z = cross3(b.x, b.y);
  const [sx, sy, sz] = b.size;
  const back = sub3(b.at, mul3(z, sz / 2));
  const c = (u: number, v: number): Vec3 => add3(back, add3(mul3(b.x, (u * sx) / 2), mul3(b.y, (v * sy) / 2)));
  return { outline: towards([c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)], z), depth: sz };
}

/** An axis-aligned block from its ranges. */
export function aabb(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Block {
  return {
    at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    x: X,
    y: UP,
    size: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)],
  };
}

/** A plan rectangle [x0, x1, z0, z1]. */
export type Rect = readonly [number, number, number, number];

/**
 * A plan rectangle less some holes, as rectangles: cut into strips at every
 * hole's x edges, each strip less the holes that cross it.
 */
export function rectMinus(r: Rect, holes: readonly Rect[]): Rect[] {
  const [x0, x1, z0, z1] = r;
  const xs = [x0, x1, ...holes.flatMap((h) => [h[0], h[1]])].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i]!;
    const b = xs[i + 1]!;
    if (b - a < 1e-6) continue;
    const m = (a + b) / 2;
    const cuts = holes
      .filter((h) => h[0] < m && h[1] > m)
      .map((h): [number, number] => [Math.max(z0, h[2]), Math.min(z1, h[3])])
      .filter(([c0, c1]) => c1 > c0)
      .sort((p, q) => p[0] - q[0]);
    let z = z0;
    for (const [c0, c1] of cuts) {
      if (c0 - z > 1e-6) out.push([a, b, z, c0]);
      z = Math.max(z, c1);
    }
    if (z1 - z > 1e-6) out.push([a, b, z, z1]);
  }
  return out;
}

/** A level block centred on (x, z), `along` on the horizontal unit `dir`, `across` beside it, from y0 to y1. */
export function levelBlock(x: number, z: number, dir: Vec3, along: number, across: number, y0: number, y1: number): Block {
  return { at: [x, (y0 + y1) / 2, z], x: dir, y: UP, size: [along, y1 - y0, across] };
}

/**
 * A round solid, a regular `sides`-gon across its flats `d`, from `a` to
 * `b` along its axis (a taper is `roundWall`'s).
 */
export function cylinder(a: Vec3, b: Vec3, d: number, sides = 16): Prism {
  const axis = sub3(b, a);
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  const t = unit3(axis);
  const hint = Math.abs(t[1]) < 0.9 ? UP : X;
  const u = unit3(cross3(t, hint));
  const v = cross3(t, u);
  const r = d / 2 / Math.cos(Math.PI / sides);
  const ring: Vec3[] = [];
  for (let i = 0; i < sides; i++) {
    const a0 = ((i + 0.5) * 2 * Math.PI) / sides;
    ring.push(add3(a, add3(mul3(u, r * Math.cos(a0)), mul3(v, r * Math.sin(a0)))));
  }
  return { outline: towards(ring, t), depth: len };
}

/**
 * A hollow round wall, `sides` flat staves, from y0 to y1 about the
 * vertical through (x, z): outer diameter d0 at the foot and d1 at the
 * head, `wall` thick, each stave a planar trapezoid on the outer surface
 * extruded inward. Where `skip` says so a stave is left out (a crenel).
 */
export function roundWall(
  x: number,
  z: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  wall: number,
  sides = 16,
  skip: (i: number) => boolean = () => false,
): Prism[] {
  const out: Prism[] = [];
  const k = 1 / Math.cos(Math.PI / sides);
  const at = (a: number, r: number, y: number): Vec3 => [x + r * k * Math.cos(a), y, z + r * k * Math.sin(a)];
  for (let i = 0; i < sides; i++) {
    if (skip(i)) continue;
    const a0 = (i * 2 * Math.PI) / sides;
    const a1 = ((i + 1) * 2 * Math.PI) / sides;
    const am = (a0 + a1) / 2;
    const quad = [at(a0, d0 / 2, y0), at(a1, d0 / 2, y0), at(a1, d1 / 2, y1), at(a0, d1 / 2, y1)];
    const inward: Vec3 = [-Math.cos(am), 0, -Math.sin(am)];
    out.push({ outline: towards(quad, inward), depth: wall });
  }
  return out;
}

/**
 * Points per run of `prisms`: an index table is a ramp, whose lookup scans
 * its stops, so a table's cost grows with the square of its length (the
 * same trade as `platforms.ts`' PRISM_RUN).
 */
const PRISM_RUN = 1024;

/**
 * Many convex prisms as one mesh, each extruded along its own outline's
 * normal by its depth; every wall and cap gets its own points and a flat
 * `normal`. A prism with no volume is a slip, refused by its index.
 */
export function prisms(g: Graph, id: string, list: readonly Prism[]): NodeHandle {
  list.forEach((p, i) => {
    if (!(p.depth > 1e-6) || p.outline.length < 3) {
      throw new Error(`ground.ts prisms("${id}"): prism ${i} at [${p.outline[0]?.join(", ")}] has depth ${p.depth} and ${p.outline.length} points; it needs a positive depth and three points`);
    }
  });
  const runs: Prism[][] = [[]];
  let count = 0;
  for (const p of list) {
    if (count + p.outline.length > PRISM_RUN && (runs[runs.length - 1] as Prism[]).length > 0) {
      runs.push([]);
      count = 0;
    }
    (runs[runs.length - 1] as Prism[]).push(p);
    count += p.outline.length;
  }
  if (runs.length === 1) return prismRun(g, id, list);
  const out = g.add(mergePrimitives, {}, id);
  runs.forEach((run, i) => g.connect(prismRun(g, `${id}Run${i}`, run), "out", out, "in"));
  return out;
}

function prismRun(g: Graph, id: string, list: readonly Prism[]): NodeHandle {
  const pts = list.flatMap((p) => p.outline);
  const which = list.flatMap((p, i) => p.outline.map(() => i));
  const depth = list.flatMap((p) => p.outline.map(() => p.depth));
  const slots = g.add(
    pointGrid,
    { countX: pts.length, countY: 1, countZ: 1, spacing: [1, 1, 1], origin: [0, 0, 0] },
    `${id}Slots`,
  );
  const place = g.add(
    setAttribute,
    {
      name: "P",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(pts.map((p) => p[0])),
        indexTable(pts.map((p) => p[1])),
        indexTable(pts.map((p) => p[2])),
      ),
    },
    `${id}Place`,
  );
  const key = g.add(setAttribute, { name: "prism", type: "i32", value: indexTable(which) }, `${id}Key`);
  const len = g.add(setAttribute, { name: "depth", type: "f32", value: indexTable(depth) }, `${id}Depth`);
  const paths = g.add(pointsToPath, { groupAttr: "prism", closed: true }, `${id}Paths`);
  const solid = g.add(
    extrudePolygon,
    { direction: "polygonNormal", distance: attribute("depth"), caps: "both" },
    id,
  );
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", len, "in");
  g.connect(len, "out", paths, "in");
  g.connect(paths, "out", solid, "in");
  return solid;
}

// ---------------------------------------------------------------------------
// The datum

/**
 * How far under the model's ground (y 0) anything that stood up to the
 * site's higher ground is cut off: clear of the ground plane's depth, so
 * the two never fight, and under the millimetre `JITTER` (parts.ts) by far.
 */
export const CAP = -0.03;

// ---------------------------------------------------------------------------
// The machine room (pile 3, Sud)

/** Pile 3's centre at the supports, (x, z) [derived: `profileAt(2.5)`, 50.704 on each axis]. */
const P3: readonly [number, number] = [50.704, -50.704];
/** Pile 3's diagonal, outward toward massif C (+x −z), and across it toward D (+x +z). */
const T3: Vec3 = unit3([1, 0, -1]);
const N3: Vec3 = unit3([1, 0, 1]);
/** A point of pile 3's plan by its diagonal frame: t outward, n toward the coal corner. */
const onP3 = (t: number, n: number): readonly [number, number] => [
  P3[0] + (t + n) / Math.SQRT2,
  P3[1] + (n - t) / Math.SQRT2,
];

/**
 * The room's walls (« murs de pourtour »), one box round the pile: faces
 * at x 35.62 / 61.70 and z −61.70 / −35.62, 26.08 square outside [sourced
 * PL-III Fig. 4, PL-V Fig. 5; placed by PL-III Fig. 3's « 0.75 + 2.75 »
 * outside the sommiers' lines and « 6.83 + 0.75 » inside them, drawn for
 * pile 2 and the same here by Fig. 4's Nota, derived]; 1.50 thick at the
 * base, 1.10, 0.75 at the top, on a 1.80 footing from 27.10 to 29.00, in
 * lifts of « 2.63 », « 2.30 » and « 1.15 » under the top: 1.50 to 31.63,
 * 1.10 to 33.93 [sourced PL-V « Coupe PQ », Figs 5-6; p. 88 « 1,50 m à la
 * base et 0,75 m au sommet », read on the page image], the steps taken
 * inside the room. Their top, 35.08 [sourced], is over the model's
 * ground: they stop 0.25 under it, under the pedestal's skirt that stands
 * on them, so the 0.75 lift is not built.
 */
export const ROOM = {
  x: [35.62, 61.7] as const,
  z: [-61.7, -35.62] as const,
  footing: { y0: yOfCote(27.1), y1: yOfCote(29.0), width: 1.8 },
  /** Thickness bands, from the footing's top: [top of band, thickness]. */
  bands: [
    [yOfCote(31.63), 1.5],
    // Their top under the pedestal's skirt, whose battered faces the model
    // extrudes 0.16 down into its ground [measured on the cooked skirt].
    [-0.25, 1.1],
  ] as ReadonlyArray<readonly [number, number]>,
  /** « Sol général des Machines (30.50) » [sourced PL-III Fig. 4, PL-V, PL-XX, PL-XXI]. */
  floor: yOfCote(30.5),
  /** The chaufferie and the coal store, « (30.00) » [sourced PL-III Fig. 4, PL-V Fig. 6, PL-XXI]. */
  stokehold: yOfCote(30.0),
  /** Floor slabs' thickness [estimated]. */
  slab: 0.25,
} as const;

/**
 * The flue's mouth in the room's +z wall: 1.30 wide on x 51.1 [sourced
 * width; measured place PL-III Fig. 4, PL-V Fig. 5, PL-XXI]. Its sill is
 * 31.63, y −1.87 [derived: 35.08 − 1.15 − 2.30, PL-V], and the invert just
 * outside « (32.253) » [sourced PL-IV Fig. 14]; the model runs the whole culvert level at
 * `FLUE.invert`, so its vault stays under the model's ground.
 */
const FLUE_MOUTH = { x: 51.1, width: 1.3 } as const;

/** The room's walls, footing and thickness bands, less the flue's mouth. */
function roomWalls(): Block[] {
  const [x0, x1] = ROOM.x;
  const [z0, z1] = ROOM.z;
  const out: Block[] = [];
  const { y0: fy0, y1: fy1, width: fw } = ROOM.footing;
  // Each side as a band from x/z a to b at the wall's outer face `o`,
  // `inward` its thickness toward the room. The ±x sides run the full
  // length, the ±z sides between them, so the corners do not overlap.
  const side = (axis: "x" | "z", at: number, dir: 1 | -1, y0: number, y1: number, t: number, a: number, b: number) =>
    axis === "x"
      ? aabb(at, at + dir * t, y0, y1, a, b)
      : aabb(a, b, y0, y1, at, at + dir * t);
  // The footing, centred under the base band's 1.50.
  const fo = (fw - 1.5) / 2;
  out.push(
    side("x", x0 - fo, 1, fy0, fy1, fw, z0 - fo, z1 + fo),
    side("x", x1 + fo, -1, fy0, fy1, fw, z0 - fo, z1 + fo),
    side("z", z0 - fo, 1, fy0, fy1, fw, x0 - fo + fw, x1 + fo - fw),
    side("z", z1 + fo, -1, fy0, fy1, fw, x0 - fo + fw, x1 + fo - fw),
  );
  let from = fy1;
  for (const [top, t] of ROOM.bands) {
    out.push(
      side("x", x0, 1, from, top, t, z0, z1),
      side("x", x1, -1, from, top, t, z0, z1),
      side("z", z0, 1, from, top, t, x0 + t, x1 - t),
    );
    // The +z wall, less the flue's mouth where it rises through this band.
    const m0 = FLUE_MOUTH.x - FLUE_MOUTH.width / 2;
    const m1 = FLUE_MOUTH.x + FLUE_MOUTH.width / 2;
    if (top <= FLUE.invert) {
      out.push(side("z", z1, -1, from, top, t, x0 + t, x1 - t));
    } else {
      const cut = Math.max(from, FLUE.invert);
      if (cut > from) out.push(side("z", z1, -1, from, cut, t, x0 + t, x1 - t));
      out.push(side("z", z1, -1, cut, top, t, x0 + t, m0), side("z", z1, -1, cut, top, t, m1, x1 - t));
    }
    from = top;
  }
  return out;
}

/**
 * The plant's layout (plan centres in world x, z), from PL-III Fig. 4 at
 * 1:200 [measured ±0.3-0.5 m], checked against PL-XXI's inset; beds are
 * the printed cotes of the machines' foundations [sourced].
 */
export const PLANT = {
  /**
   * The four Collet-Niclausse boilers « groupées deux par deux avec leur
   * maçonnerie enveloppe » [sourced p. 202], along the +z wall, fronts to
   * −z, a sheet-iron door between the pairs [sourced]: pairs on x 46.5-50.5
   * and 51.4-55.7, fronts at z −41.2, backs −38.6 [measured]; their brick
   * settings 2.40 high [estimated], each carrying its upper drum « 900 mm
   * × 2 m » lying along the wall at the front [sourced size].
   */
  boilers: { pairs: [[46.5, 50.5], [51.4, 55.7]] as ReadonlyArray<readonly [number, number]>, front: -41.2, back: -38.6, setting: 2.4, drum: { d: 0.9, length: 2.0 } },
  /** The rear flue chamber behind both pairs, 1.5 deep [measured PL-III Fig. 4, PL-XXI « Caniveau »]; 2.00 high [estimated]. */
  chamber: { x: [46.5, 55.7] as const, z: [-38.6, -37.1] as const, high: 2.0 },
  /**
   * The wall between the machines and the chaufferie, z −44.8, x 41.7-55.7,
   * 0.45 thick, its door x 50.8-52.3 and « 1.87 » high [measured; sourced
   * PL-IV Fig. 14 « Mur de séparation », « 1.87 »].
   */
  parting: { z: -44.8, x: [41.7, 55.7] as const, t: 0.45, door: [50.8, 52.3] as const, doorHigh: 1.87 },
  /**
   * The stokehold's lower floor (30.00): the chaufferie between the parting
   * wall and the boilers, and the coal store [measured].
   */
  lowFloor: [
    { x: [41.7, 57.4] as const, z: [-44.8, -37.1] as const },
    { x: [57.4, 60.2] as const, z: [-41.3, -38.1] as const },
  ],
  /** « Soute à charbon (30.00) » in the W corner [sourced p. 202; measured x 57.4-60.7, z −41.3 to −38.1, taken to the wall's 1.50 at 60.2]; the heap 1.20 high [estimated]. */
  coal: { x: [57.4, 60.2] as const, z: [-41.3, -38.1] as const, heap: 1.2 },
  /** Decauville track from the store to the boiler fronts along z −42.7, 0.60 gauge [sourced track p. 202; route and gauge estimated]. */
  track: { z: -42.7, x: [46.2, 57.7] as const, gauge: 0.6 },
  /**
   * The two Quillacq pump-engines (Wheelock engine and Girard pump in
   * tandem, p. 199-200), axes along the pile's diagonal: E1 from its pump
   * at (42.4, −51.9) to its flywheel at (48.5, −58.0); E2 head to tail,
   * pump (47.0, −52.6), flywheel (40.7, −46.3) [measured PL-III Fig. 4,
   * PL-XXI], here taken 0.6 up its axis, to (41.1, −46.7), so that its pit
   * clears the chaufferie's parting wall [estimated]. Steam cylinder bore
   * 0.650 [sourced], drawn 1.00 over its jacket; plunger 0.290 [sourced],
   * its casing 0.60; beds 30.76-30.98 [sourced]. The flywheels 3.20 across,
   * their feet in the « Fosse pour le volant » PL-III Fig. 4 draws under
   * each [sourced pit; its floor, 28.50 like the condenser's pit, and the
   * wheel's size estimated: the pit reads about 4.5 long, which the
   * model's room, capped at its ground 1.44 under the real ceiling,
   * cannot hold].
   */
  engines: [
    { pump: [42.4, -51.9] as const, wheel: [48.5, -58.0] as const },
    { pump: [47.0, -52.6] as const, wheel: [41.1, -46.7] as const },
  ],
  engineBed: yOfCote(30.8),
  flywheel: 3.2,
  /**
   * The Otis's pits, where its steel goes through the machine floor: the
   * motor girders' feet on two bed blocks « Ascens. améric. Otis (30.38) »
   * at (54.0, −54.0) [sourced cote, measured place PL-III Fig. 4], where
   * `lifts.ts` stands them (their foot's axis at y −3.3), and the car
   * track's girders, which `lifts.ts` runs on to y −3.5 and whose flanges
   * reach 4.4 down, in the « Cage de l'Ascenseur américain Otis » along the
   * A-C diagonal [sourced label]. Each pit is open over the girders as the
   * model builds them [measured on the cooked lifts: x 46.46-50.82 and
   * 52.35-55.27], 0.3 clear, its floor under their lowest point.
   */
  otisPits: [
    { rect: [46.0, 51.3, -51.3, -46.0] as const, floor: -4.7 },
    { rect: [52.0, 55.7, -55.7, -52.0] as const, floor: -4.0 },
  ],
  /** The flywheels' pits' floor, 28.50 as the « Fosse du Condenseur (28.50) » [estimated]. */
  pitFloor: yOfCote(28.5),
  /** The two Worthington pumps (Edoux), long axes along n [measured « Pompe Worthington (30.74) »]; 3.4 × 1.9 [estimated]. */
  worthingtons: [[56.8, -50.8], [53.3, -47.2]] as ReadonlyArray<readonly [number, number]>,
  /** Their condensers « (30.74) » [measured]; Ø 1.0 × 1.5 [estimated]. */
  condensers: [[56.6, -48.4], [55.4, -47.2]] as ReadonlyArray<readonly [number, number]>,
  /** The two Gramme dynamos side by side on one bed « (30.63) » [measured]; armature Ø 0.65 [sourced p. 193], the machine about 1.2 across its fields [estimated]. */
  dynamos: [[55.4, -57.0], [56.8, -55.7]] as ReadonlyArray<readonly [number, number]>,
  /**
   * The two compound « moteurs pilon » flanking them « (30.88) » [measured
   * (52.8, −59.1) and (58.8, −53.1); the first taken 0.2 in, off the
   * walls' 1.50]; 1.8 × 1.6, 2.6 high [estimated]; cylinders 260 and 380
   * [sourced p. 193].
   */
  lightEngines: [[52.9, -58.9], [58.8, -53.1]] as ReadonlyArray<readonly [number, number]>,
  /** The Weyher condenser of the lighting engines (50.8, −56.0) [measured, labelled PL-XXI]. */
  weyher: [50.8, -56.0] as const,
  /** The 4 hp gas engine and its draught fan, 1889 only [sourced p. 202, 207; measured (43.2, −39.0), (45.7, −38.0)]. */
  gasEngine: [43.2, -39.0] as const,
  fan: [45.7, -38.0] as const,
  /** Darnay's condensate tank « 2,50 × 0,80 × 1 » [sourced p. 207]; no plate places it, so beside the feed pumps [estimated]. */
  tank: { at: [44.0, -40.2] as const, size: [2.5, 1.0, 0.8] as const },
  /**
   * Reservoir Ré1, the lifts' discharge, in the E corner under chequer
   * plate at 30.50: « Fond (28,150) », x 36.4-43.7, z −60.8 to −45.7
   * [sourced cotes; measured outline, which steps round massif B], here
   * inside the walls' 1.50 and stopped at z −48.4, short of the second
   * engine's flywheel pit [estimated].
   */
  reservoir: { x: [37.12, 43.7] as const, z: [-60.2, -48.4] as const, bottom: yOfCote(28.15) },
} as const;

/** The room's floors, walls inside it and brick settings (`foundations`). */
function roomMasonry(): Block[] {
  const [x0, x1] = ROOM.x;
  const [z0, z1] = ROOM.z;
  // The floors meet the walls' lowest band.
  const inset = ROOM.bands[0]![1];
  const f = ROOM.floor;
  const s = ROOM.stokehold;
  const out: Block[] = [];
  // The machine floor, less the stokehold's lower floor, the coal store
  // and the flywheels' pits.
  const pits = flywheelPits();
  const holes: Rect[] = [
    ...PLANT.lowFloor.map((l): Rect => [l.x[0], l.x[1], l.z[0], l.z[1]]),
    ...pits.map((p): Rect => [p.x - p.half, p.x + p.half, p.z - p.half, p.z + p.half]),
    ...PLANT.otisPits.map((p) => p.rect),
  ];
  for (const [a0, a1, b0, b1] of rectMinus([x0 + inset, x1 - inset, z0 + inset, z1 - inset], holes)) {
    out.push(aabb(a0, a1, f - ROOM.slab, f, b0, b1));
  }
  // Each pit a floor and four walls: the flywheels' « Fosse pour le
  // volant » [sourced PL-III Fig. 4] and the Otis's.
  for (const p of pits) out.push(...pit([p.x - p.half, p.x + p.half, p.z - p.half, p.z + p.half], PLANT.pitFloor, f));
  for (const p of PLANT.otisPits) out.push(...pit(p.rect, p.floor, f));
  for (const l of PLANT.lowFloor) out.push(aabb(l.x[0], l.x[1], s - ROOM.slab, s, l.z[0], Math.min(l.z[1], z1 - inset)));
  // The boilers' brick settings, each pair one block, and the flue chamber behind.
  const B = PLANT.boilers;
  for (const [a, b] of B.pairs) out.push(aabb(a, b, s, s + B.setting, B.front, B.back));
  const C = PLANT.chamber;
  out.push(aabb(C.x[0], C.x[1], s, s + C.high, C.z[0], C.z[1]));
  // The parting wall, less its door.
  const P = PLANT.parting;
  out.push(
    aabb(P.x[0], P.door[0], s, CAP, P.z - P.t / 2, P.z + P.t / 2),
    aabb(P.door[1], P.x[1], s, CAP, P.z - P.t / 2, P.z + P.t / 2),
    aabb(P.door[0], P.door[1], s + P.doorHigh, CAP, P.z - P.t / 2, P.z + P.t / 2),
  );
  // Reservoir Ré1: its floor and four walls under the machine floor.
  const R = PLANT.reservoir;
  const w = 0.3;
  const top = f - ROOM.slab;
  out.push(
    aabb(R.x[0], R.x[1], R.bottom - w, R.bottom, R.z[0], R.z[1]),
    aabb(R.x[0], R.x[0] + w, R.bottom, top, R.z[0], R.z[1]),
    aabb(R.x[1] - w, R.x[1], R.bottom, top, R.z[0], R.z[1]),
    aabb(R.x[0] + w, R.x[1] - w, R.bottom, top, R.z[0], R.z[0] + w),
    aabb(R.x[0] + w, R.x[1] - w, R.bottom, top, R.z[1] - w, R.z[1]),
  );
  return [...roomWalls(), ...out];
}

/** A pit under a floor at `top`: its floor, `bottom` on top, and four walls 0.25 thick inside `r`. */
function pit(r: Rect, bottom: number, top: number): Block[] {
  const w = 0.25;
  const [x0, x1, z0, z1] = r;
  return [
    aabb(x0, x1, bottom - w, bottom, z0, z1),
    aabb(x0, x0 + w, bottom, top, z0, z1),
    aabb(x1 - w, x1, bottom, top, z0, z1),
    aabb(x0 + w, x1 - w, bottom, top, z0, z0 + w),
    aabb(x0 + w, x1 - w, bottom, top, z1 - w, z1),
  ];
}

/** The pump-engines' axes: pump end, flywheel end, unit direction, length. */
function engineAxes(): Array<{ p: Vec3; q: Vec3; d: Vec3; len: number }> {
  return PLANT.engines.map((E) => {
    const p: Vec3 = [E.pump[0], 0, E.pump[1]];
    const q: Vec3 = [E.wheel[0], 0, E.wheel[1]];
    return { p, q, d: unit3(sub3(q, p)), len: Math.hypot(q[0] - p[0], q[2] - p[2]) };
  });
}

/** Each flywheel's pit, square in plan round the wheel's footprint (it lies on the diagonal), 0.10 clear inside its 0.25 walls. */
function flywheelPits(): Array<{ x: number; z: number; half: number }> {
  const r = PLANT.flywheel / 2;
  return engineAxes().map(({ q }) => ({ x: q[0], z: q[2], half: (r + 0.15) / Math.SQRT2 + 0.1 + 0.25 }));
}

/** The plant as massing (`machinery`). */
function roomPlant(): Prism[] {
  const out: Prism[] = [];
  const f = ROOM.floor;
  const s = ROOM.stokehold;
  const B = PLANT.boilers;
  // Each boiler's drum, along the wall at the front of its setting, and its fire door.
  for (const [a, b] of B.pairs) {
    const half = (b - a) / 2;
    for (const c of [a + half / 2, b - half / 2]) {
      const zc = B.front + 0.6;
      const yc = s + B.setting + B.drum.d / 2;
      out.push(cylinder([c - B.drum.length / 2, yc, zc], [c + B.drum.length / 2, yc, zc], B.drum.d));
      out.push(blockPrism(aabb(c - 0.35, c + 0.35, s + 0.5, s + 1.2, B.front - 0.04, B.front)));
    }
  }
  // Coal heap and the Decauville track's rails.
  const C = PLANT.coal;
  out.push(blockPrism(aabb(C.x[0] + 0.2, C.x[1] - 0.2, s, s + C.heap, C.z[0] + 0.2, C.z[1] - 0.2)));
  const T = PLANT.track;
  for (const k of [-1, 1]) {
    const z = T.z + (k * T.gauge) / 2;
    out.push(blockPrism(aabb(T.x[0], T.x[1], s, s + 0.08, z - 0.025, z + 0.025)));
  }
  // The pump-engines: bed, pump casing and air vessel at the pump end,
  // steam cylinder, guides, and the flywheel at the other end, in its plane.
  for (const { p, d, len } of engineAxes()) {
    const along = (s0: number, y: number): Vec3 => [p[0] + d[0] * s0, y, p[2] + d[2] * s0];
    const bed = PLANT.engineBed;
    // The bed stops short of the flywheel's pit.
    const mid = along((len - 1.5) / 2, 0);
    out.push(blockPrism(levelBlock(mid[0], mid[2], d, len - 0.5, 1.6, f, bed)));
    const axisY = bed + 0.5;
    // The pump's casing on the bed, the cylinder's jacket on it too.
    out.push(cylinder(along(-0.5, bed + 0.3), along(2.0, bed + 0.3), 0.6));
    out.push(cylinder(along(1.0, bed), along(1.0, bed + 1.6), 0.9));
    out.push(cylinder(along(2.8, axisY), along(4.6, axisY), 1.0));
    out.push(blockPrism(levelBlock(...xz(along(5.6, 0)), d, 2.0, 0.5, axisY - 0.25, axisY + 0.25)));
    // The flywheel: a disc in the vertical plane of the axis, its foot in the pit.
    const hub = along(len, axisY);
    const across = cross3(d, UP);
    out.push(cylinder(add3(hub, mul3(across, -0.15)), add3(hub, mul3(across, 0.15)), PLANT.flywheel, 24));
  }
  // The Worthington pumps (long axes along n) and their condensers.
  for (const [x, z] of PLANT.worthingtons) {
    out.push(blockPrism(levelBlock(x, z, N3, 3.4, 1.9, f, yOfCote(30.74))));
    for (const k of [-0.45, 0.45]) {
      const c: Vec3 = [x + T3[0] * k, yOfCote(30.74) + 0.225, z + T3[2] * k];
      out.push(cylinder(add3(c, mul3(N3, -1.6)), add3(c, mul3(N3, 1.6)), 0.45));
    }
  }
  for (const [x, z] of PLANT.condensers) out.push(cylinder([x, f, z], [x, f + 1.5, z], 1.0));
  // The dynamos on one bed, shafts along t, and the lighting engines.
  const [da, db] = PLANT.dynamos;
  const dm: readonly [number, number] = [(da![0] + db![0]) / 2, (da![1] + db![1]) / 2];
  out.push(blockPrism(levelBlock(dm[0], dm[1], N3, 4.0, 2.2, f, yOfCote(30.63))));
  for (const [x, z] of PLANT.dynamos) {
    const c: Vec3 = [x, yOfCote(30.63) + 0.6, z];
    out.push(cylinder(add3(c, mul3(T3, -0.5)), add3(c, mul3(T3, 0.5)), 1.2));
  }
  for (const [x, z] of PLANT.lightEngines) {
    const bed = yOfCote(30.88);
    out.push(blockPrism(levelBlock(x, z, T3, 1.8, 1.6, f, bed)));
    out.push(blockPrism(levelBlock(x, z, T3, 1.2, 1.0, bed, bed + 1.3)));
    for (const [k, dd] of [[-0.35, 0.45], [0.35, 0.6]] as const) {
      const c = add3([x, 0, z], mul3(T3, k));
      out.push(cylinder([c[0], bed + 1.3, c[2]], [c[0], bed + 2.3, c[2]], dd));
    }
    // Its belt pulley toward the dynamos.
    const toward = unit3(sub3([dm[0], 0, dm[1]], [x, 0, z]));
    const pc: Vec3 = [x + toward[0] * 1.1, bed + 0.9, z + toward[2] * 1.1];
    out.push(cylinder(add3(pc, mul3(T3, -0.12)), add3(pc, mul3(T3, 0.12)), 1.5, 20));
    // Its outboard bearing, a pedestal from the floor to the shaft.
    const bp = add3(pc, mul3(T3, 0.3));
    out.push(blockPrism(levelBlock(bp[0], bp[2], T3, 0.25, 0.3, f, pc[1] + 0.1)));
  }
  out.push(cylinder([PLANT.weyher[0], f, PLANT.weyher[1]], [PLANT.weyher[0], f + 1.8, PLANT.weyher[1]], 1.2));
  // The gas engine and its fan (1889), the condensate tank.
  out.push(blockPrism(levelBlock(PLANT.gasEngine[0], PLANT.gasEngine[1], X, 2.0, 1.2, s, s + 1.3)));
  out.push(cylinder([PLANT.fan[0] - 0.4, s + 0.6, PLANT.fan[1]], [PLANT.fan[0] + 0.4, s + 0.6, PLANT.fan[1]], 1.1));
  const K = PLANT.tank;
  out.push(blockPrism(levelBlock(K.at[0], K.at[1], X, K.size[0], K.size[2], s, s + K.size[1])));
  return out;
}

const xz = (p: Vec3): [number, number] => [p[0], p[2]];

// ---------------------------------------------------------------------------
// The flue and the chimney

/**
 * The flue (« conduite de fumée »): a vaulted culvert 1.30 wide × 1.70 to
 * the crown, walls and vault 0.35, invert slab 0.15 [sourced p. 202,
 * PL-IV Figs 16-20], built as a box culvert (the vault flattened). Its
 * route, in world (x, z) [measured PL-III Fig. 2 at 1:1000, 11.83 px/m]:
 * out of the room's +z wall on x 51.1, along the pile 3 - pile 4 centre
 * line, round pile 4's corner and WSW to the chimney. The polyline is
 * 117.0 m, 116.7 to the chimney's outer face, against the printed
 * « 116m23 » counted from the wall's outer face [sourced PL-IV Fig. 15].
 * Level at `invert` (y −2.15, cote 31.35): the sill is 31.63 and the flue
 * climbs about a metre over its
 * last 8 m into a mound the model does not build, and its vault would
 * stand through the model's flat ground if it were carried at its printed
 * levels [derived]. Two manholes (« regards »), side chambers 1.00 × 1.50
 * × 1.80 [sourced Figs 16-17]: one near the boilers, one halfway [measured
 * Fig. 15; PL-III Fig. 2's box at 22 m is taken as something else].
 */
export const FLUE = {
  route: [
    [51.1, -35.62],
    [50.8, -13.3],
    [49.3, -7.0],
    [48.8, 5.7],
    [50.6, 18.4],
    [57.4, 26.8],
    [65.0, 35.3],
    [75.1, 42.9],
    [85.3, 48.8],
    [92.0, 53.0],
    [94.6, 53.9],
    [98.2, 49.9],
  ] as ReadonlyArray<readonly [number, number]>,
  invert: -2.15,
  clear: { width: 1.3, high: 1.7 },
  wall: 0.35,
  sill: 0.15,
  manholes: [
    [51.0, -30.5],
    [53.0, 22.0],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

/** One straight run of the culvert, a to b in plan, as its invert slab, walls and vault. */
function flueRun(a: readonly [number, number], b: readonly [number, number], lap: number): Block[] {
  const d = unit3([b[0] - a[0], 0, b[1] - a[1]]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + lap;
  const m: readonly [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const across = cross3(d, UP);
  const { width, high } = FLUE.clear;
  const w = FLUE.wall;
  const y0 = FLUE.invert;
  const at = (off: number): readonly [number, number] => [m[0] + across[0] * off, m[1] + across[2] * off];
  const out: Block[] = [
    levelBlock(m[0], m[1], d, len, width + 2 * w, y0 - FLUE.sill, y0),
    levelBlock(m[0], m[1], d, len, width + 2 * w, y0 + high, y0 + high + w),
  ];
  for (const k of [-1, 1]) {
    const [x, z] = at(k * (width / 2 + w / 2));
    out.push(levelBlock(x, z, d, len, w, y0, y0 + high));
  }
  return out;
}

/** The whole culvert and its manholes (`foundations`). */
function flue(): Block[] {
  const out: Block[] = [];
  const r = FLUE.route;
  for (let i = 0; i + 1 < r.length; i++) {
    // Each run laps over the next by the culvert's half-width, so the
    // bends close without a gap.
    out.push(...flueRun(r[i]!, r[i + 1]!, i + 2 < r.length ? FLUE.clear.width + 2 * FLUE.wall : 0));
  }
  for (const [x, z] of FLUE.manholes) {
    out.push(aabb(x - 0.85, x + 0.85, FLUE.invert - FLUE.sill, CAP, z - 1.1, z + 1.1));
  }
  return out;
}

/**
 * The chimney « dissimulée à droite de la pile 4 », round brick [sourced
 * p. 202], centred at (99.0, 49.0) ± 1.5 [measured PL-III Fig. 2]. As in
 * 1889, 17.23 over its footing [sourced p. 202; PL-IV Fig. 15 « 5.08 »,
 * « 6.05 », « 6.10 »]: a base shaft A 5.08 (outer 3.02, flue 1.62, walls
 * 0.70), then B in two lifts of 6.05 and 6.10 battered « 0,04 p.m. » to
 * 2.30 under the crown, walls 0.70 down to 0.34 [sourced PL-IV Figs 15,
 * 19, 21]; the outlet 1.60 (the printed 2.01 m² is a 1.60 circle; the
 * text's « 1,69 » is not) [derived]; a corbelled, crenellated crown
 * « 2.36 » high (corbels 0.88, bands 0.22 + 0.37, parapet 0.89) [sourced
 * PL-IV Fig. 21], 2.98 across (2.30 + 2 × 0.34) [derived]; on a concrete
 * footing 0.80 × 3.09 [sourced]. A's top, « G », is the ground at the
 * chimney [sourced Fig. 15], taken as the model's y 0: the mound it stood
 * in, 2-3 m of planted rockwork on the plate, and its raise of 1.50 by
 * 1900, when the draught fan went (« 5,00 / 6,13 / 7,60 », 18.73), are left out
 * [estimated; SOURCES.md §31.1].
 */
export const CHIMNEY = {
  at: [99.0, 49.0] as const,
  footing: { d: 3.09, t: 0.8 },
  a: { high: 5.08, d: 3.02, wall: 0.7 },
  b: [
    { high: 6.05, d0: 2.95, d1: 2.7, wall0: 0.55, wall1: 0.45 },
    // The upper lift's 6.10 ends at the outlet, crown and all (Fig. 15's
    // « 12.15 » clear is 6.05 + 6.10), so its shaft is 6.10 less the
    // crown's « 2.36 », 0.88 + 0.22 + 0.37 + 0.89 [derived].
    { high: 3.74, d0: 2.7, d1: 2.3, wall0: 0.45, wall1: 0.34 },
  ],
  crown: { corbel: 0.88, band: 0.59, parapet: 0.89, d: 2.98, wall: 0.3, merlons: 16 },
} as const;

/** The chimney as prisms, above and below the model's ground. */
function chimney(): { above: Prism[]; below: Prism[] } {
  const [x, z] = CHIMNEY.at;
  const C = CHIMNEY;
  const below: Prism[] = [];
  const above: Prism[] = [];
  const g = 0;
  const aFoot = g - C.a.high;
  below.push(cylinder([x, aFoot - C.footing.t, z], [x, aFoot, z], C.footing.d, 24));
  below.push(...roundWall(x, z, aFoot, g, C.a.d, C.a.d, C.a.wall, 24));
  let y = g;
  for (const b of C.b) {
    // Each lift in two, so the wall thins as it rises.
    const ym = y + b.high / 2;
    const dm = (b.d0 + b.d1) / 2;
    above.push(...roundWall(x, z, y, ym, b.d0, dm, b.wall0, 24));
    above.push(...roundWall(x, z, ym, y + b.high, dm, b.d1, b.wall1, 24));
    y += b.high;
  }
  // The crown: corbels flaring out, the bands, the crenellated parapet.
  const K = C.crown;
  const top = C.b[C.b.length - 1]!.d1;
  above.push(...roundWall(x, z, y, y + K.corbel, top, K.d, 0.5, 24));
  y += K.corbel;
  above.push(...roundWall(x, z, y, y + K.band, K.d, K.d, 0.6, 24));
  y += K.band;
  above.push(...roundWall(x, z, y, y + K.parapet / 2, K.d, K.d, K.wall, 24));
  above.push(...roundWall(x, z, y + K.parapet / 2, y + K.parapet, K.d, K.d, K.wall, K.merlons, (i) => i % 2 === 1));
  return { above, below };
}

// ---------------------------------------------------------------------------
// The build

/** Everything this module builds, as prism lists by class. */
export function groundPrisms(): { foundations: Prism[]; machinery: Prism[] } {
  const ch = chimney();
  return {
    foundations: [...roomMasonry(), ...flue()].map(blockPrism).concat(ch.below, ch.above),
    machinery: roomPlant(),
  };
}

/** Build the ground's parts: the machine room, the flue and the chimney. */
export function buildGround(g: Graph): Parts {
  const p = groundPrisms();
  return {
    foundations: [prisms(g, "groundFoundations", p.foundations)],
    machinery: [prisms(g, "groundPlant", p.machinery)],
  };
}

/** Pile 3's diagonal frame, for tests that read the plant in it. */
export const PILE3 = { centre: P3, t: T3, n: N3, at: onP3 } as const;
