/**
 * THE GROUND AND WHAT IS UNDER IT (SOURCES.md §31): the machine room in
 * pile 3's basement, its flue and chimney; the uprights' supports, their
 * stones, shoes and anchors (`SUPPORT`, §31.3); the massifs, the caissons,
 * the walls and the earthing (`MASSIF`, `CAISSON`, §31.4).
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
 * THE SUPPORTS AND THE FOUNDATIONS stand under the model's uprights,
 * which run down to the sommiers' centre, so they sit 1.10 down each
 * upright's axis from their printed cotes (`SUPPORT.stack`); the walls,
 * the machine room and the flue are at theirs.
 *
 * Everything is built in world coordinates (pile 3 is the +x −z leg,
 * `PILES` in spec.ts), as convex prisms, one mesh per class.
 */
import type { Graph, NodeHandle } from "pcg-ts";
import { attribute, extrudePolygon, mergePrimitives, pointGrid, pointsToPath, setAttribute, vec } from "pcg-ts";
import { CREASE, SAG, type SegmentLimits, arcSegments, circleSegments, smoothed } from "./chord.js";
import { type Vec3, indexTable } from "./lattice.js";
import type { Parts } from "./parts.js";
import { LEG_UPRIGHTS, type UprightName, segmentAxis } from "./builtup.js";
import { NODES, PEDESTAL, PILES, yOfCote } from "./spec.js";

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
 * Sides for a regular polygon cut round a circle of diameter `d` with its
 * flats on the circle, the way `cylinder` and `roundWall` cut one, so its
 * corners stand at most `sag` proud of the circle. A corner of an n-gon on
 * radius r stands r (sec(π/n) − 1) proud: `chord.ts`' chord sagitta
 * r (1 − cos(π/n)) over cos(π/n), so asking it for `sag` × cos(π/12) bounds
 * the corner for any n from its floor of 12 up.
 */
export function flatsSides(d: number, sag: number = SAG.eye, limits: Omit<SegmentLimits, "min"> = {}): number {
  return circleSegments(d / 2, sag * Math.cos(Math.PI / 12), limits);
}

/**
 * A round solid, a regular `sides`-gon across its flats `d`, from `a` to
 * `b` along its axis (a taper is `roundWall`'s). Its sides by default
 * keep the corners within `SAG.eye` of the circle ({@link flatsSides}):
 * the plant stands where a visitor walks.
 */
export function cylinder(a: Vec3, b: Vec3, d: number, sides: number = flatsSides(d)): Prism {
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
  sides: number = flatsSides(Math.max(d0, d1)),
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
 * normal by its depth; every wall and cap gets its own points and a
 * `normal`, flat, then smoothed across any edge under `chord.ts`' crease
 * angle (`crease`, degrees) — a cylinder or a round wall's staves shade
 * round, a box keeps its edges. A prism with no volume is a slip, refused
 * by its index.
 */
export function prisms(g: Graph, id: string, list: readonly Prism[], crease = CREASE): NodeHandle {
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
  // Smoothed by the crease angle (`chord.ts`) after the runs are merged,
  // so a round part cut across two runs still welds.
  let out: NodeHandle;
  if (runs.length === 1) out = prismRun(g, `${id}Flat`, list);
  else {
    out = g.add(mergePrimitives, {}, `${id}Flat`);
    runs.forEach((run, i) => g.connect(prismRun(g, `${id}Run${i}`, run), "out", out, "in"));
  }
  return smoothed(g, id, out, crease);
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
    { x: [57.4, 60.2] as const, z: [-40.4, -38.1] as const },
  ],
  /**
   * « Soute à charbon (30.00) » in the W corner [sourced p. 202; measured
   * x 57.4-60.7, z −41.3 to −38.1], taken to the wall's 1.50 at 60.2 and
   * off the corner of the massif beside it at −40.4; the heap 1.20 high
   * [estimated].
   */
  coal: { x: [57.4, 60.2] as const, z: [-40.4, -38.1] as const, heap: 1.2 },
  /**
   * Decauville track from the store to the boiler fronts along z −42.7,
   * 0.60 gauge [sourced track p. 202; route and gauge estimated], between
   * the two massifs whose front faces stand either end of it.
   */
  track: { z: -42.7, x: [47.6, 56.0] as const, gauge: 0.6 },
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
    out.push(cylinder(add3(hub, mul3(across, -0.15)), add3(hub, mul3(across, 0.15)), PLANT.flywheel));
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
    out.push(cylinder(add3(pc, mul3(T3, -0.12)), add3(pc, mul3(T3, 0.12)), 1.5));
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

/**
 * The chimney's staves, one count from footing to parapet so the lifts
 * meet stave on stave: the fewest that keep every corner within `SAG.eye`
 * of the widest circle (the footing's), rounded up to a whole number per
 * crown slot so each merlon and crenel is a run of whole staves on the
 * slot it always had. The merlon count is the crown's own; this is
 * smoothness only.
 */
export const CHIMNEY_STAVES = flatsSides(
  Math.max(CHIMNEY.footing.d, CHIMNEY.a.d, CHIMNEY.crown.d),
  SAG.eye,
  { multiple: CHIMNEY.crown.merlons },
);

/** The chimney as prisms, above and below the model's ground. */
function chimney(): { above: Prism[]; below: Prism[] } {
  const [x, z] = CHIMNEY.at;
  const C = CHIMNEY;
  const below: Prism[] = [];
  const above: Prism[] = [];
  const g = 0;
  const n = CHIMNEY_STAVES;
  // Staves per crown slot: a merlon, then a crenel, round the parapet.
  const per = n / C.crown.merlons;
  const aFoot = g - C.a.high;
  below.push(cylinder([x, aFoot - C.footing.t, z], [x, aFoot, z], C.footing.d, n));
  below.push(...roundWall(x, z, aFoot, g, C.a.d, C.a.d, C.a.wall, n));
  let y = g;
  for (const b of C.b) {
    // Each lift in two, so the wall thins as it rises.
    const ym = y + b.high / 2;
    const dm = (b.d0 + b.d1) / 2;
    above.push(...roundWall(x, z, y, ym, b.d0, dm, b.wall0, n));
    above.push(...roundWall(x, z, ym, y + b.high, dm, b.d1, b.wall1, n));
    y += b.high;
  }
  // The crown: corbels flaring out, the bands, the crenellated parapet.
  const K = C.crown;
  const top = C.b[C.b.length - 1]!.d1;
  above.push(...roundWall(x, z, y, y + K.corbel, top, K.d, 0.5, n));
  y += K.corbel;
  above.push(...roundWall(x, z, y, y + K.band, K.d, K.d, 0.6, n));
  y += K.band;
  above.push(...roundWall(x, z, y, y + K.parapet / 2, K.d, K.d, K.wall, n));
  above.push(...roundWall(x, z, y + K.parapet / 2, y + K.parapet, K.d, K.d, K.wall, n, (i) => Math.floor(i / per) % 2 === 1));
  return { above, below };
}

// ---------------------------------------------------------------------------
// The supports: the stones, the shoes, the anchors (PL-VI, PL-IV Figs 7-8)

/**
 * Each upright's support (« appui ») [sourced E1900-TXT pp. 87, 94-95,
 * 101-102; PL-VI Figs 1, 7-19; PL-IV Figs 7-8], stacked along the
 * upright's axis T and laid out square to it, in the lean line U (out
 * along the tower's diagonal, the bolts' line) and across it, E:
 *
 * - two courses of Château-Landon stone (« pierres d'appui »), each 0.50
 *   thick [sourced PL-IV Figs 7-8, PL-VI Fig. 1 « 0,50 » twice, and p. 87
 *   on its image, « 0,50 m », where the OCR reads 0,30; 9.88 m³ against the
 *   printed « 9,845 m³ »], both irregular octagons square to the axis,
 *   not the text's « hexagonales » [sourced PL-IV Fig. 8]: the lower 4.10
 *   along U × 4.00 across, its faces square to U 0.97 long and along it
 *   1.63; the upper 3.00 × 3.15, 0.75 and 1.036 [sourced PL-IV Fig. 8],
 *   the oblique faces joining them [derived]. The upper's top centre is
 *   the « Centre des sommiers » [sourced PL-XXXI; PL-IV Fig. 7's massif
 *   plus 1.00 of stone closes on 36.00, derived];
 * - the cast-iron « sabot inférieur » B, 5,782 kg: 1.800 square across its
 *   flats with its corners rounded (the diagonals « 2,150 », « 2,160 »
 *   give r 0.47), 0.915 high, square to the axis, its sides square to the
 *   tower's faces seen along the axis and its bolt diagonal on U [sourced
 *   PL-VI Figs 1, 7-10, p. 102]; built as a 0.20 base flange at the full
 *   square and a body 1.50 across [estimated, from Fig. 1's section]. Its
 *   pocket (« vide pour le passage du vérin », 0.783) and the jack's
 *   0.650 × 0.485 opening are inside it and not drawn;
 * - the iron shims, 0.050 [sourced « en supposant des cales de 50 mm »],
 *   1.10 across [estimated];
 * - the cast-steel « contre-sabot » A, 2,551 kg: its ledge, 0.125 and a
 *   0.010 step, a rounded rhombus 1.200 along U × 1.375 across [sourced
 *   PL-VI Fig. 12], drawn 1.5 % larger so the built-up box's end, fins and
 *   all, lies wholly on it (the fins' outer corners overhang the printed
 *   rhombus by 4-5 mm) [estimated]; its spigot into B and its head inside
 *   the upright's end are hidden and not drawn.
 *
 * So the upright's dressed end stands « 1,100 » up the axis from the
 * stone's top centre [sourced PL-VI Fig. 8's chain, 200 + 715 + 50 + 125 +
 * 10]. THE MODEL'S UPRIGHTS run down to
 * the sommiers' centre itself — PL-XXXI's line, the supports' node at y
 * 2.50 — where the iron really ended 1.10 higher, at about 36.90. The
 * stack is built under the model's upright, so its end and the ledge meet
 * exactly: everything under the upright stands 1.10 down its axis (0.90
 * lower, 0.64 further out) from the plates' cotes [derived; SOURCES.md
 * §31.3]. One offset, `SUPPORT.stack`, carries it.
 *
 * - THE ANCHORS: two bolts an upright, 32 in all [sourced p. 87, p. 97
 *   « Pose des tirants 8 » a pile], Ø 0.10, 7.80 long, parallel to the
 *   axis on U « 1,47 » apart [sourced PL-VI « 0,599 » in plan, PL-IV],
 *   through holes at B's corners, anchored 6.20 down the axis at
 *   « (30,947) » under cast-iron shoes 0.625 × 0.35 × 0.30 on a pair of
 *   double-T bars « Longueur 3m00 » [sourced PL-VI Fig. 1, p. 97], each in
 *   a cast-iron sleeve of bore 0.20 [sourced « Tuyau en fonte »], drawn
 *   0.30 outside. Their tops, 1.60 up the axis from the stone (6.20 +
 *   1.60 = 7.80), through the forged stirrup's seat, the « sabot
 *   supérieur » 0.10 high and a nut 0.20 × 0.22 across its flats, the rod
 *   0.16 over it and 0.46 over the stirrup, where PL-VI Figs 1 and 13 draw
 *   0.50-0.56 [sourced Figs 13-16; the 7.80 governs]; the stirrup's V, the
 *   « Gousset de 500 × 8 » it is riveted to on the upright and the lower
 *   nuts are not drawn [estimated: the seat alone, 0.34 × 0.30 × 0.02].
 * - THE JACKS: two of 800 t for sixteen supports, slid in « par une
 *   ouverture », their pump « sur un chariot pour la rendre transportable »
 *   [sourced p. 102], the load settled at last on the shims (« régler
 *   définitivement les cales », p. 117): none stood in a pocket once the
 *   tower was up [derived], and none is built.
 */
export const SUPPORT = {
  /** From the upper stone's top centre to the upright's end, along its axis. */
  stack: 1.1,
  stones: {
    lower: { u: 4.1, e: 4.0, uFace: 0.97, eFace: 1.63, t: 0.5 },
    upper: { u: 3.0, e: 3.15, uFace: 0.75, eFace: 1.036, t: 0.5 },
  },
  sabot: { flats: 1.8, radius: 0.47, high: 0.915, flange: 0.2, body: 1.5, bodyRadius: 0.32 },
  shims: { t: 0.05, flats: 1.1, radius: 0.15 },
  ledge: { t: 0.135, u: 1.2 * 1.015, e: 1.375 * 1.015, round: 0.1 },
  bolts: { apart: 1.47, d: 0.1, down: 6.2, up: 1.6, sleeve: 0.3 },
  anchor: { shoe: { u: 0.35, e: 0.625, t: 0.3 }, bar: { length: 3.0, deep: 0.2, apart: 0.24 } },
  seat: { u: 0.34, e: 0.3, t: 0.02 },
  /** The « sabot supérieur » under the nut. */
  washer: { d: 0.22, t: 0.1 },
  nut: { flats: 0.22, t: 0.2 },
} as const;

/** A support's frame: the upright's foot (where its end meets the stack), its axis and the lean line and across. */
export interface SupportFrame {
  readonly pile: 1 | 2 | 3 | 4;
  readonly upright: UprightName;
  /** The upright's axis at the supports' node, y 2.50: its end's centre. */
  readonly foot: Vec3;
  readonly T: Vec3;
  readonly U: Vec3;
  readonly E: Vec3;
  /** The upper stone's top centre, `SUPPORT.stack` down the axis. */
  readonly seat: Vec3;
}

/** Turn a +x +z leg's vector onto quadrant target k (k quarter turns about +y, +z onto +x). */
export function onQuadrant(k: number, p: Vec3): Vec3 {
  if (k === 0) return p;
  if (k === 1) return [p[2], p[1], -p[0]];
  if (k === 2) return [-p[0], p[1], -p[2]];
  return [-p[2], p[1], p[0]];
}

const squareTo3 = (v: Vec3, t: Vec3): Vec3 => sub3(v, mul3(t, dot3(v, t)));

/** The sixteen supports' frames, pile by pile (PILES' order), c b a d in each. */
export function supportFrames(): SupportFrame[] {
  const out: SupportFrame[] = [];
  const d = unit3([1, 0, 1]);
  for (const pile of PILES) {
    for (const [name, xs, zs] of LEG_UPRIGHTS) {
      const s = NODES[0]!;
      const T0 = segmentAxis(name, 0).T;
      const U0 = unit3(squareTo3(d, T0));
      const E0 = unit3(cross3(T0, U0));
      const foot0: Vec3 = [s[xs], s.y, s[zs]];
      const k = pile.quadrant;
      const foot = onQuadrant(k, foot0);
      const T = onQuadrant(k, T0);
      out.push({
        pile: pile.n,
        upright: name,
        foot,
        T,
        U: onQuadrant(k, U0),
        E: onQuadrant(k, E0),
        seat: sub3(foot, mul3(T, SUPPORT.stack)),
      });
    }
  }
  return out;
}

/** A point of a support's frame: u along the lean line, e across, t up the axis, from its seat. */
const at = (f: SupportFrame, u: number, e: number, t: number): Vec3 =>
  add3(f.seat, add3(mul3(f.U, u), add3(mul3(f.E, e), mul3(f.T, t))));

/** An outline in a support's frame (u, e pairs) at t, extruded `depth` up the axis. */
function slab(f: SupportFrame, ring: ReadonlyArray<readonly [number, number]>, t: number, depth: number): Prism {
  return { outline: towards(ring.map(([u, e]) => at(f, u, e, t)), f.T), depth };
}

/**
 * A square `flats` across with its corners rounded to r, its sides at 45
 * degrees to U and E, as (u, e); each corner `per` chords, by default the
 * fewest within `SAG.eye` of the arc (the shoes stand at a visitor's feet).
 */
function roundedDiamond(flats: number, r: number, per: number = arcSegments(r, Math.PI / 2, SAG.eye)): Array<readonly [number, number]> {
  const h = flats / 2;
  const out: Array<readonly [number, number]> = [];
  // In the square's own axes (a, b) = ((u + e), (u − e)) / √2, then turned back.
  for (const [ca, cb, a0] of [
    [1, 1, 0],
    [-1, 1, 90],
    [-1, -1, 180],
    [1, -1, 270],
  ] as const) {
    const cx = ca * (h - r);
    const cy = cb * (h - r);
    for (let k = 0; k <= per; k++) {
      const ang = ((a0 + (90 * k) / per) * Math.PI) / 180;
      const a = cx + r * Math.cos(ang);
      const b = cy + r * Math.sin(ang);
      out.push([(a + b) / Math.SQRT2, (a - b) / Math.SQRT2]);
    }
  }
  return out;
}

/**
 * A rhombus whose diagonals, measured over its blunted tips, are `du`
 * along U and `de` across: each vertex cut back `c` along its edges, the
 * vertices set out so the cuts land on the printed diagonals.
 */
function cutRhombus(du: number, de: number, c: number): Array<readonly [number, number]> {
  const edge = Math.hypot(du / 2, de / 2);
  const [pu, pe] = [du / 2 + (c * (du / 2)) / edge, de / 2 + (c * (de / 2)) / edge];
  const v: Array<readonly [number, number]> = [
    [pu, 0],
    [0, pe],
    [-pu, 0],
    [0, -pe],
  ];
  const out: Array<readonly [number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const p = v[i]!;
    const prev = v[(i + 3) % 4]!;
    const next = v[(i + 1) % 4]!;
    const toward = (q: readonly [number, number]): readonly [number, number] => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [p[0] + ((q[0] - p[0]) * c) / l, p[1] + ((q[1] - p[1]) * c) / l];
    };
    out.push(toward(prev), toward(next));
  }
  return out;
}

/** A stone course's octagon (`SUPPORT.stones`), as (u, e). */
function stoneOctagon(s: { u: number; e: number; uFace: number; eFace: number }): Array<readonly [number, number]> {
  const [U, E, a, b] = [s.u / 2, s.e / 2, s.uFace / 2, s.eFace / 2];
  return [
    [U, -a],
    [U, a],
    [b, E],
    [-b, E],
    [-U, a],
    [-U, -a],
    [-b, -E],
    [b, -E],
  ];
}

/** A regular n-gon about (u, e), as (u, e). */
function ngon(u: number, e: number, flats: number, n: number): Array<readonly [number, number]> {
  const r = flats / 2 / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i): readonly [number, number] => {
    const a = ((i + 0.5) * 2 * Math.PI) / n;
    return [u + r * Math.cos(a), e + r * Math.sin(a)];
  });
}

/** One support's pieces, by class: the iron over the stone, the stones, and what is buried. */
export function supportPieces(f: SupportFrame): { iron: Prism[]; stone: Prism[]; buried: Prism[] } {
  const S = SUPPORT;
  const iron: Prism[] = [];
  const stone: Prism[] = [];
  const buried: Prism[] = [];
  // The stones, upper on lower, under the seat.
  const { lower, upper } = S.stones;
  stone.push(slab(f, stoneOctagon(upper), -upper.t, upper.t));
  stone.push(slab(f, stoneOctagon(lower), -upper.t - lower.t, lower.t));
  // B: flange and body; the shims; A's ledge up to the upright's end.
  const B = S.sabot;
  iron.push(slab(f, roundedDiamond(B.flats, B.radius), 0, B.flange));
  iron.push(slab(f, roundedDiamond(B.body, B.bodyRadius), B.flange, B.high - B.flange));
  iron.push(slab(f, roundedDiamond(S.shims.flats, S.shims.radius), B.high, S.shims.t));
  iron.push(slab(f, cutRhombus(S.ledge.u, S.ledge.e, S.ledge.round), S.stack - S.ledge.t, S.ledge.t));
  // The bolts: buried from the anchorage to the stone, iron above it.
  const bolt = S.bolts;
  for (const side of [-1, 1]) {
    const u = (side * bolt.apart) / 2;
    const down = -bolt.down;
    buried.push(cylinder(at(f, u, 0, down), at(f, u, 0, 0), bolt.d, 12));
    buried.push(cylinder(at(f, u, 0, down + S.anchor.shoe.t), at(f, u, 0, -upper.t - lower.t), bolt.sleeve, 12));
    iron.push(cylinder(at(f, u, 0, 0), at(f, u, 0, bolt.up), bolt.d, 12));
    // The anchorage: its shoe on the bars.
    const sh = S.anchor.shoe;
    buried.push(
      slab(
        f,
        [
          [u - sh.u / 2, -sh.e / 2],
          [u + sh.u / 2, -sh.e / 2],
          [u + sh.u / 2, sh.e / 2],
          [u - sh.u / 2, sh.e / 2],
        ],
        down,
        sh.t,
      ),
    );
    // The top: the stirrup's seat, the « sabot supérieur » and the nut, over the upright's end.
    const top = S.stack + 0.02;
    iron.push(
      slab(
        f,
        [
          [u - S.seat.u / 2, -S.seat.e / 2],
          [u + S.seat.u / 2, -S.seat.e / 2],
          [u + S.seat.u / 2, S.seat.e / 2],
          [u - S.seat.u / 2, S.seat.e / 2],
        ],
        top,
        S.seat.t,
      ),
    );
    iron.push(slab(f, ngon(u, 0, S.washer.d, 12), top + S.seat.t, S.washer.t));
    iron.push(slab(f, ngon(u, 0, S.nut.flats, 6), top + S.seat.t + S.washer.t, S.nut.t));
  }
  // The bars under both shoes, along U, side by side across.
  const bar = S.anchor.bar;
  for (const k of [-1, 1]) {
    const e = (k * bar.apart) / 2;
    const w = (bar.apart - 0.04) / 2;
    buried.push(
      slab(
        f,
        [
          [-bar.length / 2, e - w / 2],
          [bar.length / 2, e - w / 2],
          [bar.length / 2, e + w / 2],
          [-bar.length / 2, e + w / 2],
        ],
        -S.bolts.down - bar.deep,
        bar.deep,
      ),
    );
  }
  return { iron, stone, buried };
}

// ---------------------------------------------------------------------------
// ITEM 29 BEGIN: the foundations (PL-II to PL-V)

/**
 * The massifs, one under each upright, 16 [sourced E1900-TXT pp. 86-93;
 * PL-III Figs 3-6, PL-IV Figs 1, 5-7, 25-27]: Souppes rubble in cement
 * mortar, a truncated pyramid on the tower's diagonal, extending out from
 * its stones. In the vertical plane of the diagonal, s out along it from
 * the support point and the height as a cote: a vertical front face 1.22
 * inside the support point (1.255 at piles 1 and 4) up to « 4,91 » over
 * its base, 33.91; the top face square to the upright, carrying the
 * stones, up to its peak « 7,46 » over the base (36.46; 36.50 and
 * « 8.500 » at piles 1 and 4); the rear face parallel to the leg down to
 * the base, « 8,90 » long there (« 9.610 » at piles 1 and 4) [sourced
 * Figs 7, 27; derived]; the base at 29.00 on piles 2 and 3, 28.00 on piles 1 and
 * 4, which start a metre lower on their caissons [sourced pp. 87, 92].
 * Across the diagonal 5.00 to 31.00, 4.60 to 33.00 and 4.00 above, its
 * « redans » [sourced Figs 5, 6, 25]. The courses — level low, fanning to
 * square to the pressure line higher up — are not drawn.
 *
 * Under piles 2 and 3 each stands on a cement-concrete footing « 10 m sur
 * 6 », 2.00 deep on the gravel [sourced p. 86], 0.20 before the front face
 * and 0.90 past the rear toe [sourced Fig. 7], its bottom 27.09-27.33
 * [sourced PL-II Figs 4, 7], taken at 27.25.
 *
 * The lift massif A, the inner one under upright a [sourced p. 87, « Massif
 * A » on PL-IV], was built round the lift's cage and pit (pile 2's on a
 * footing « 14 m sur 7,40 » with a 5.20 pit, PL-IV Fig. 4; piles 1 and 4
 * kept at 6.00 on T-irons and brick vaults) [sourced pp. 86, 92-93]: here
 * it takes the rule like the other three, the 10 × 6 footing too under
 * piles 2 and 3, and its pit, cage walls, enlargement and the added
 * masonry (« 194 m³ », p. 96) are not built [estimated]; the lifts' tracks
 * and pits, which the model runs down to 4.4 under the ground, stand clear
 * of it.
 *
 * Like the stones they carry, the massifs stand 1.10 down the upright's
 * axis from their printed cotes (`SUPPORT.stack`): a massif's cote c is
 * drawn at the seat's height plus c − 36.00.
 */
export const MASSIF = {
  /** Piles 2 and 3 (and the profile's printed cotes), then 1 and 4. */
  byPile: {
    open: { base: 29.0, front: -1.22, frontTop: 33.91, peak: 36.46, run: 3.6, rearToe: 7.68 },
    caisson: { base: 28.0, front: -1.255, frontTop: 33.91, peak: 36.5, run: 3.64, rearToe: 8.355 },
  },
  /** Widths across the diagonal, each up to a cote. */
  widths: [
    [31.0, 5.0],
    [33.0, 4.6],
    [Infinity, 4.0],
  ] as ReadonlyArray<readonly [number, number]>,
  footing: { bottom: 27.25, before: 0.2, past: 0.9, wide: 6.0 },
  /** The cote of the upper stone's top centre, which the seat stands for. */
  sommier: 36.0,
} as const;

/**
 * The compressed-air caissons, under piles 1 (Nord) and 4 (Ouest) only
 * [sourced pp. 88-93; PL-II Figs 10, 12; PL-IV Figs 23, 27, 31], one under
 * each massif, their long axis on the diagonal: 15.24 × 6.00 « avec coins
 * arrondis », the first built, pile 4's N°1, 14.24 [sourced p. 90]; the
 * corners' radius 1.0 from the printed « Surface du Caisson 90,60 m q »
 * (15.24 × 6.00 − (4 − π) = 90.58; 84.60 for the short one; the tables'
 * 90.40 a misprint: their concrete ÷ depth gives 90.60) [derived]. The
 * inner end 0.20 before the massif's front face, toward the tower's centre
 * [sourced Fig. 27 « 200 »]. The cutting edge where each was sunk, the
 * « fond définitif » 0.20 over it [sourced tables pp. 92-93, read on the
 * page images; Figs 27, 31]; the concrete from the fond to the « arasé à
 * la cote + 28 » [sourced]. In 1889 each was solid concrete, its working
 * chamber filled too [sourced p. 92, « Caisson rempli de béton »], inside
 * an iron shell from the edge up 3.00 of wall and two « hausses » of 1.00
 * [sourced pp. 91-92], drawn 0.03 thick (6 mm plate); the shafts and
 * airlocks were taken away and are not built [estimated].
 *
 * Which caisson under which massif, by the cotes the plans print under
 * each [sourced PL-II Figs 10, 12, PL-IV Fig. 23, drawn x right, z down as
 * `PILES` lays them out]: pile 4 A N°3, B N°4, C N°2, D N°1 (the short
 * one, « 14.00 », « (23.58) »); pile 1 A N°3, B N°4, C N°2, D N°1.
 */
export const CAISSON = {
  length: 15.24,
  wide: 6.0,
  radius: 1.0,
  short: { length: 14.24 },
  /** The « fond définitif » over the cutting edge [sourced tables pp. 92-93]. */
  fond: 0.2,
  before: 0.2,
  top: 28.0,
  shell: { high: 5.0, t: 0.03 },
  /** The cutting edge's cote under each massif [sourced pp. 92-93]. */
  edge: {
    4: { a: 22.34, b: 21.72, c: 21.81, d: 23.38 },
    1: { a: 22.22, b: 21.99, c: 21.55, d: 21.8 },
  } as Readonly<Record<1 | 4, Readonly<Record<UprightName, number>>>>,
} as const;

/**
 * The perimeter walls of piles 1, 2 and 4 (pile 3's are the machine
 * room's, `ROOM`): the same 26.08 box, 0.75 thick, carried on piers « 1.20 »
 * wide between arches of « 5.55 » springing at 33.28 [sourced PL-V, PL-III
 * Fig. 3; p. 87]. The arches spring above the model's ground, so only the
 * piers are built, from 29.00 (pile 2) or 28.00 (piles 1, 4) [sourced].
 * The plates print the arcaded faces' run « 4.40 | 5.55 | 1.20 | 5.55 |
 * 2.70 | 4.98 | 1.70 » (26.08) [sourced PL-V]: its piers, the 1.20 and
 * the 2.70, are built on every face, from the face's corner at the tower's
 * centre outward [estimated: which end the run starts from]; where the
 * face is carried by a massif instead (its « 7.22 » arches and « 2.30 »
 * piers, PL-V) a pier that would run into a massif is left out.
 */
export const WALLS = {
  thick: 0.75,
  /** The printed run along a face, from its inner end: [length, pier?]. */
  run: [
    [4.4, false],
    [5.55, false],
    [1.2, true],
    [5.55, false],
    [2.7, true],
    [4.98, false],
    [1.7, false],
  ] as ReadonlyArray<readonly [number, boolean]>,
} as const;

/**
 * The earthing (« pour faciliter la déperdition de l'électricité
 * atmosphérique dans le sol »): two cast-iron pipes a pile, about 20 m, Ø
 * 0.30, laid 3 m under the platform, 1 m under the Seine's level, between
 * the massifs, one end turned up to the ground and wired to the iron
 * [sourced p. 86]: at cote 26.00, 29.00 less 3 [derived]. In two
 * trenches about 14 apart, « 18.00 » long, running from the leg's middle
 * toward the +z face, about 13 degrees off square to it [sourced PL-II
 * Fig. 7, pile 3; measured]; pile 2's as pile 3's mirrored across the
 * tower's axis, its trenches toward its own +z face [measured PL-II Fig.
 * 4]. Piles 1 and 4 draw none: their test wells served [sourced pp.
 * 89-90]. Each turned up just outside the wall, clear of the flue
 * [estimated].
 */
export const EARTHING = {
  cote: 26.0,
  d: 0.3,
  run: 18.0,
  off: 13,
  /** Pile 3's two risers, (x, z), just outside its +z wall [estimated]; each run comes 18.00 to it from the leg. */
  risers: [
    [41.6, -35.2],
    [55.8, -35.2],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

/** Clip a convex polygon in (s, cote) to cote in [lo, hi]. */
function band(poly: ReadonlyArray<readonly [number, number]>, lo: number, hi: number): Array<readonly [number, number]> {
  const clip = (pts: ReadonlyArray<readonly [number, number]>, keep: (y: number) => boolean, at: number) => {
    const out: Array<readonly [number, number]> = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % pts.length]!;
      if (keep(p[1])) out.push(p);
      if (keep(p[1]) !== keep(q[1])) {
        const t = (at - p[1]) / (q[1] - p[1]);
        out.push([p[0] + (q[0] - p[0]) * t, at]);
      }
    }
    return out;
  };
  return clip(clip(poly, (y) => y >= lo, lo), (y) => y <= hi, hi);
}

/** A support's diagonal frame for its massif: a point from (s along the diagonal, cote, e across). */
function massifAt(f: SupportFrame): (s: number, cote: number, e: number) => Vec3 {
  const d = unit3([f.U[0], 0, f.U[2]]);
  return (s, cote, e) => [
    f.seat[0] + d[0] * s + f.E[0] * e,
    f.seat[1] + cote - MASSIF.sommier,
    f.seat[2] + d[2] * s + f.E[2] * e,
  ];
}

/** One massif as its solids, band by band across its redans, and its footing where it has one. */
export function massifSolids(f: SupportFrame): Prism[] {
  const caisson = PILES.find((p) => p.n === f.pile)?.caissons === true;
  const M = caisson ? MASSIF.byPile.caisson : MASSIF.byPile.open;
  const peakS = M.front + M.run;
  // The top face is the lower stone's underside, 1.00 of stone down the
  // axis from the seat, square to the axis: the printed « 4,91 » and
  // « 7,46 » close on it to 0.035 [derived], and the model takes the
  // plane, so the stones sit flush on it.
  const d = unit3([f.U[0], 0, f.U[2]]);
  const onTop = (sv: number) =>
    MASSIF.sommier + (-(SUPPORT.stones.lower.t + SUPPORT.stones.upper.t) - sv * dot3(d, f.T)) / f.T[1];
  const profile: Array<readonly [number, number]> = [
    [M.front, M.base],
    [M.front, onTop(M.front)],
    [peakS, onTop(peakS)],
    [M.rearToe, M.base],
  ];
  const at = massifAt(f);
  const out: Prism[] = [];
  let lo: number = M.base;
  const peak = onTop(peakS);
  for (const [top, w] of MASSIF.widths) {
    const hi = Math.min(top, peak);
    if (hi <= lo) continue;
    const poly = band(profile, lo, hi);
    if (poly.length >= 3) out.push({ outline: towards(poly.map(([s, c]) => at(s, c, -w / 2)), f.E), depth: w });
    lo = hi;
  }
  if (!caisson) {
    const F = MASSIF.footing;
    const [s0, s1] = [M.front - F.before, M.rearToe + F.past];
    out.push({
      outline: towards(
        [
          at(s0, F.bottom, -F.wide / 2),
          at(s1, F.bottom, -F.wide / 2),
          at(s1, M.base, -F.wide / 2),
          at(s0, M.base, -F.wide / 2),
        ],
        f.E,
      ),
      depth: F.wide,
    });
  }
  return out;
}

/**
 * The half-spaces a massif is drawn inside: the pedestal's outer faces'
 * inner surfaces. The model's plinth stands on its own ground, 1.58 lower
 * than the real one (§31.2), so a massif's peak, at its printed height,
 * would come out through the skirt's battered block; it is cut back to
 * 0.03 inside it [derived]. In pile 4's frame x + 0.8115 y ≤ 62.453 −
 * 0.258 − 0.03, the block's batter (`PEDESTAL.tiers[0]`) less the skirt's
 * 0.20 measured square to it, and the same in z; turned onto each pile.
 */
export function skirtPlanes(pile: 1 | 2 | 3 | 4): Array<{ n: Vec3; c: number }> {
  const t = PEDESTAL.tiers[0]!;
  const slope = (t.outer[0] - t.outer[1]) / (t.y1 - t.y0);
  const c = t.outer[0] - 0.2 * Math.hypot(1, slope) - 0.03;
  const k = PILES.find((p) => p.n === pile)!.quadrant;
  return [
    { n: onQuadrant(k, [1, slope, 0]), c },
    { n: onQuadrant(k, [0, slope, 1]), c },
  ];
}

/** A convex prism's faces, each a polygon. */
function prismFaces(p: Prism): Vec3[][] {
  const o = p.outline;
  const nn: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < o.length; i++) {
    const [x0, y0, z0] = o[i]!;
    const [x1, y1, z1] = o[(i + 1) % o.length]!;
    nn[0] += (y0 - y1) * (z0 + z1);
    nn[1] += (z0 - z1) * (x0 + x1);
    nn[2] += (x0 - x1) * (y0 + y1);
  }
  const n = unit3(nn);
  const top = o.map((q) => add3(q, mul3(n, p.depth)));
  const faces: Vec3[][] = [[...o], [...top]];
  for (let i = 0; i < o.length; i++) {
    const j = (i + 1) % o.length;
    faces.push([o[i]!, o[j]!, top[j]!, top[i]!]);
  }
  return faces;
}

/**
 * A convex prism cut by half-spaces n·x ≤ c: unchanged if it lies inside
 * them all, else its cut faces and the new caps, each drawn as a plate 0.02
 * thick into the solid (the way the pedestal's skirt is built).
 */
function clipPrism(p: Prism, planes: ReadonlyArray<{ n: Vec3; c: number }>): Prism[] {
  let faces = prismFaces(p);
  const all = faces.flat();
  if (planes.every(({ n, c }) => all.every((q) => dot3(n, q) <= c))) return [p];
  for (const { n, c } of planes) {
    const cut: Vec3[] = [];
    const next: Vec3[][] = [];
    for (const f of faces) {
      const out: Vec3[] = [];
      for (let i = 0; i < f.length; i++) {
        const a = f[i]!;
        const b = f[(i + 1) % f.length]!;
        const da = dot3(n, a) - c;
        const db = dot3(n, b) - c;
        if (da <= 0) out.push(a);
        if (da <= 0 !== db <= 0) {
          const q = add3(a, mul3(sub3(b, a), da / (da - db)));
          out.push(q);
          cut.push(q);
        }
      }
      if (out.length >= 3) next.push(out);
    }
    if (cut.length >= 3) {
      // The new cap: the cut points in order round their centre, in the plane.
      const m = mul3(cut.reduce<Vec3>((s, q) => add3(s, q), [0, 0, 0]), 1 / cut.length);
      const u = unit3(sub3(cut[0]!, m));
      const v = cross3(unit3(n), u);
      const ring = [...cut].sort((a, b) => Math.atan2(dot3(sub3(a, m), v), dot3(sub3(a, m), u)) - Math.atan2(dot3(sub3(b, m), v), dot3(sub3(b, m), u)));
      const cap: Vec3[] = [];
      for (const q of ring) if (cap.length === 0 || Math.hypot(...sub3(q, cap[cap.length - 1]!)) > 1e-6) cap.push(q);
      if (cap.length >= 3) next.push(cap);
    }
    faces = next;
  }
  const pts = faces.flat();
  const centre = mul3(pts.reduce<Vec3>((s, q) => add3(s, q), [0, 0, 0]), 1 / pts.length);
  return faces
    .filter((f) => f.length >= 3)
    .map((f) => {
      const m = mul3(f.reduce<Vec3>((s, q) => add3(s, q), [0, 0, 0]), 1 / f.length);
      return { outline: towards(f, sub3(centre, m)), depth: 0.02 };
    });
}

/** One massif as drawn: its solids, cut back inside the pedestal's skirt where they would come out of it. */
export function massifPrisms(f: SupportFrame): Prism[] {
  const planes = skirtPlanes(f.pile);
  return massifSolids(f).flatMap((p) => clipPrism(p, planes));
}

/**
 * Chords per quarter round a caisson's corner: the fewest that keep the
 * shell's outer face (radius + plate) within `SAG.far` of its arc — the
 * caissons are only ever seen through the ground, from well away. The
 * concrete and both faces of the shell take the same count, so each plate
 * pairs an inner chord with its outer one.
 */
export const CAISSON_CORNER_CHORDS = arcSegments(CAISSON.radius + CAISSON.shell.t, Math.PI / 2, SAG.far);

/** A rounded rectangle in a massif's frame (s from s0 to s1, e ±w/2, corners r), at cote c. */
function roundedRect(f: SupportFrame, s0: number, s1: number, w: number, r: number, cote: number, grow = 0): Vec3[] {
  const at = massifAt(f);
  const pts: Vec3[] = [];
  const corners: Array<[number, number, number]> = [
    [s1 - r, w / 2 - r, 0],
    [s0 + r, w / 2 - r, 90],
    [s0 + r, -w / 2 + r, 180],
    [s1 - r, -w / 2 + r, 270],
  ];
  for (const [cs, ce, a0] of corners) {
    for (let k = 0; k <= CAISSON_CORNER_CHORDS; k++) {
      const a = ((a0 + (90 * k) / CAISSON_CORNER_CHORDS) * Math.PI) / 180;
      pts.push(at(cs + (r + grow) * Math.cos(a), cote, ce + (r + grow) * Math.sin(a)));
    }
  }
  return pts;
}

/** One caisson under a massif of pile 1 or 4: its concrete, and its iron shell (by class). */
export function caissonPrisms(f: SupportFrame): { concrete: Prism[]; iron: Prism[] } {
  const edges = CAISSON.edge[f.pile as 1 | 4];
  if (edges === undefined) return { concrete: [], iron: [] };
  const short = f.pile === 4 && f.upright === "d";
  const len = short ? CAISSON.short.length : CAISSON.length;
  const r = CAISSON.radius;
  const s0 = MASSIF.byPile.caisson.front - CAISSON.before;
  const s1 = s0 + len;
  const edge = edges[f.upright];
  const up: Vec3 = [0, 1, 0];
  const fond = edge + CAISSON.fond;
  const concrete: Prism = {
    outline: towards(roundedRect(f, s0, s1, CAISSON.wide, r, fond), up),
    depth: CAISSON.top - fond,
  };
  const shellTop = Math.min(edge + CAISSON.shell.high, CAISSON.top);
  // The shell: a ring of plates round the concrete, each face of the
  // rounded outline its own plate standing `t` proud of it.
  const inner = roundedRect(f, s0, s1, CAISSON.wide, r, edge);
  const outer = roundedRect(f, s0, s1, CAISSON.wide, r, edge, CAISSON.shell.t);
  const iron: Prism[] = [];
  for (let i = 0; i < inner.length; i++) {
    const j = (i + 1) % inner.length;
    const piece = [inner[i]!, inner[j]!, outer[j]!, outer[i]!];
    if (Math.hypot(inner[i]![0] - inner[j]![0], inner[i]![2] - inner[j]![2]) < 1e-6) continue;
    iron.push({ outline: towards(piece, up), depth: shellTop - edge });
  }
  return { concrete: [concrete], iron };
}

/** The perimeter walls' piers of piles 1, 2 and 4, in world coordinates, clear of the massifs. */
export function wallPiers(): Prism[] {
  const out: Prism[] = [];
  const [a, b] = [ROOM.x[0], ROOM.x[1]];
  const W = WALLS;
  const frames = supportFrames();
  for (const pile of PILES) {
    if (pile.n === 3) continue;
    const base = pile.caissons ? MASSIF.byPile.caisson.base : MASSIF.byPile.open.base;
    const y0 = yOfCote(base);
    const y1 = -0.25;
    const massifs = frames.filter((f) => f.pile === pile.n).flatMap(massifSolids);
    // In pile 4's frame (the +x +z box, x and z from a to b), each face's
    // run from its inner end (a) outward.
    let along = a;
    for (const [len, pier] of W.run) {
      if (pier) {
        const m = along + len / 2;
        for (const [x, z, alongX] of [
          [m, a + W.thick / 2, true],
          [m, b - W.thick / 2, true],
          [a + W.thick / 2, m, false],
          [b - W.thick / 2, m, false],
        ] as const) {
          const [sx, sz] = alongX ? [len, W.thick] : [W.thick, len];
          const c = onQuadrant(pile.quadrant, [x, 0, z]);
          const e = onQuadrant(pile.quadrant, [sx, 0, sz]);
          const [hx, hz] = [Math.abs(e[0]) / 2, Math.abs(e[2]) / 2];
          const block = blockPrism(aabb(c[0] - hx, c[0] + hx, y0, y1, c[2] - hz, c[2] + hz));
          if (!overlapsAny(block, massifs)) out.push(block);
        }
      }
      along += len;
    }
  }
  return out;
}

/** A convex prism's corners, both caps. */
function prismCorners(p: Prism): Vec3[] {
  return prismFaces(p).slice(0, 2).flat();
}

/**
 * Whether two convex prisms overlap by more than a few millimetres: no
 * separating axis among their face normals (enough for the boxes and the
 * massifs' bands this is used on, all of whose edges are face normals' or
 * the vertical).
 */
function overlaps(p: Prism, q: Prism): boolean {
  const pc = prismCorners(p);
  const qc = prismCorners(q);
  const axes: Vec3[] = [];
  for (const r of [p, q]) {
    for (const f of prismFaces(r)) {
      const n = cross3(sub3(f[1]!, f[0]!), sub3(f[2]!, f[1]!));
      if (Math.hypot(n[0], n[1], n[2]) > 1e-9) axes.push(unit3(n));
    }
  }
  for (const n of axes) {
    const a = pc.map((v) => dot3(n, v));
    const b = qc.map((v) => dot3(n, v));
    if (Math.max(...a) < Math.min(...b) + 0.005 || Math.max(...b) < Math.min(...a) + 0.005) return false;
  }
  return true;
}

function overlapsAny(p: Prism, list: readonly Prism[]): boolean {
  return list.some((q) => overlaps(p, q));
}

/** The earthing pipes of piles 2 and 3: a level run and its riser, each. */
export function earthingPipes(): Prism[] {
  const out: Prism[] = [];
  const E = EARTHING;
  const y = yOfCote(E.cote);
  const off = (E.off * Math.PI) / 180;
  for (const mirror of [1, -1]) {
    for (const [rx, rz] of E.risers) {
      // Pile 3's (mirror 1) and pile 2's (x mirrored).
      const end: Vec3 = [mirror * rx, y, rz];
      const start: Vec3 = [mirror * (rx + E.run * Math.sin(off)), y, rz - E.run * Math.cos(off)];
      out.push(cylinder(start, end, E.d), cylinder(end, [end[0], CAP, end[2]], E.d));
    }
  }
  return out;
}

/** Everything of item 29 by class. */
export function foundationsPrisms(): { foundations: Prism[]; machinery: Prism[] } {
  const frames = supportFrames();
  const caissons = frames.map(caissonPrisms);
  return {
    foundations: [
      ...frames.flatMap(massifPrisms),
      ...caissons.flatMap((c) => c.concrete),
      ...wallPiers(),
      ...earthingPipes(),
    ],
    machinery: caissons.flatMap((c) => c.iron),
  };
}

// ITEM 29 END

// ---------------------------------------------------------------------------
// The build

/** Everything this module builds, as prism lists by class. */
export function groundPrisms(): { foundations: Prism[]; machinery: Prism[]; masonry: Prism[] } {
  const room = machineRoomPrisms();
  const supports = supportFrames().map(supportPieces);
  const found = foundationsPrisms();
  return {
    foundations: [...room.foundations, ...supports.flatMap((s) => s.buried), ...found.foundations],
    machinery: [...room.plant, ...supports.flatMap((s) => s.iron), ...found.machinery],
    masonry: supports.flatMap((s) => s.stone),
  };
}

/** The machine room, its flue and its chimney: their masonry and their plant. */
export function machineRoomPrisms(): { foundations: Prism[]; plant: Prism[] } {
  const ch = chimney();
  return {
    foundations: [...roomMasonry(), ...flue()].map(blockPrism).concat(ch.below, ch.above),
    plant: roomPlant(),
  };
}

/** The crease angle, degrees, for the foundations class (see `buildGround`). */
const FOUNDATION_CREASE = 20;

/** Build the ground's parts: the machine room, the flue, the chimney and the supports. */
export function buildGround(g: Graph): Parts {
  const p = groundPrisms();
  return {
    // A tighter crease for the masonry: the chimney's 64 staves (5.6
    // degrees apart) and the caissons' corners (18) shade round, and the
    // chimney's corbel (21 degrees off its shaft and its band) keeps the
    // two breaks that make it a corbel rather than a swelling.
    foundations: [prisms(g, "groundFoundations", p.foundations, FOUNDATION_CREASE)],
    machinery: [prisms(g, "groundIron", p.machinery)],
    masonry: [prisms(g, "groundStones", p.masonry)],
  };
}

/** Pile 3's diagonal frame, for tests that read the plant in it. */
export const PILE3 = { centre: P3, t: T3, n: N3, at: onP3 } as const;
