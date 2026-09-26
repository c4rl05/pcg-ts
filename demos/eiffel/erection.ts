/**
 * The temporary works of the erection, 1887–88: the timber pylons the
 * legs were landed on past 28 m, with their sand boxes and the iron shoes
 * riveted under the uprights, and the four 41 m scaffolds the 1st floor's
 * girders were built on, with the centring the arches' crowns were set on
 * later (PL-XXV; text pp. 103–108, 115–117; SOURCES.md §32.7).
 *
 * None of this is the tower. It is built only when the page asks for the
 * erection (`Detail.build`, `?build`), each kind its own output
 * (`works.<kind>`), and `chronology.ts` gives each piece the day it went up
 * and each kind the day it came down (`WORKS`). Everything is laid out in
 * TypeScript as blocks and prisms (ground.ts' vocabulary) in ONE frame —
 * the pylons of pile 4, the +x+z leg, and the scaffold of the +z face —
 * and copied to the other three by the quadrant turns, as the tower's own
 * legs and faces are.
 */
import type { Graph } from "pcg-ts";
import { SAG } from "./chord.js";
import { type Block, type Prism, blockPrism, cylinder, flatsSides, prisms } from "./ground.js";
import { type Vec3, copyToQuadrants } from "./lattice.js";
import type { Parts } from "./parts.js";
import { ARCH, ENTRETOISE, NODES, UPRIGHT_BOX, node, profileAt, yOfCote } from "./spec.js";

const add3 = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const mul3 = (p: Vec3, s: number): Vec3 => [p[0] * s, p[1] * s, p[2] * s];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => mul3(p, 1 / len3(p));
const cross3 = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const UP: Vec3 = [0, 1, 0];

/**
 * A timber (or iron) member from `a` to `b`, `w` wide and `h` deep, its
 * width square to both its axis and `side` (a hint: the member's width
 * lies across `side`'s plane... see below). `side` is the direction the
 * member's width is measured along after squaring to the axis; for a post
 * or a strut in a face, the face's in-plane horizontal.
 */
export function beam(a: Vec3, b: Vec3, w: number, h: number, side: Vec3): Block {
  const x = unit3(sub3(b, a));
  let y = sub3(side, mul3(x, side[0] * x[0] + side[1] * x[1] + side[2] * x[2]));
  if (len3(y) < 1e-6) y = cross3(x, UP);
  if (len3(y) < 1e-6) y = [1, 0, 0];
  return { at: mul3(add3(a, b), 0.5), x, y: unit3(y), size: [len3(sub3(b, a)), w, h] };
}

// ------------------------------------------------------------------ //
// The pylons.
// ------------------------------------------------------------------ //

/**
 * THE PYLONS (« pylônes de butée »), PL-XXV Figs 1–3, 13–14 and text
 * pp. 103–104. Four to a leg: « quatre pylônes pyramidaux semblables ...
 * dont deux accolés étaient placés sous l'arête médiane, et deux séparés
 * placés sous les deux autres arêtes » — a double under the inner upright
 * a, a single under each of b and d, 16 pylons standing as 12 structures
 * [sourced]. Each « en forme de pyramide quadrangulaire avec deux faces
 * verticales. Sa base était de 8,50 m de côté et sa hauteur de 27,40 m »,
 * its posts « poutres équarries de 0,27 m », « 7 rangées de moises de
 * 0,25 × 0,12 m », crosses of « bois de 0,22 × 0,22 m » [sourced p. 104];
 * the plate prints the base 8.463 and the posts 4.2315 apart, axis to
 * axis, the double 17.456 = 2 × 8.463 + 0.530, each pyramid's top about
 * 1.10 square, the double's cap planking 5.800 × 1.100 on outriggers
 * from its last tier, and the top at (60.91), y 27.41 [sourced PL-XXV
 * Figs 1, 13, 14]. The tiers are Fig. 13's, from a first row 0.49 up:
 * 7.095, 6.40 to a doubled « Joint » (13.985 and 14.60), 4.50, 4.15, 4.16
 * to the top, summing to 27.41 [sourced, read to ±0.05].
 *
 * Eight posts to a pylon, on its eight piles (« 8 par pylône », p. 103):
 * a 3 × 3 grid at the foot less its middle, converging on the top's own
 * 3 × 3 grid, so the two faces through the corner under the upright stand
 * vertical and the other two lean in [derived]. Each post is spliced at
 * the joint, as the plate draws it. The piles themselves, 6 m or 9 m in
 * the ground, are not drawn.
 */
export const PYLON = {
  top: yOfCote(60.91),
  base: 8.463,
  cap: 1.1,
  doubleCap: 5.8,
  gap: 0.53,
  post: 0.27,
  moise: { deep: 0.25, thick: 0.12 },
  cross: 0.22,
  levels: [0.49, 7.585, 13.985, 14.6, 19.1, 23.25] as readonly number[],
  /** Where each post is spliced: between the joint's two rows. */
  splice: 14.29,
} as const;

/**
 * THE BEARING ON A PYLON'S TOP, from the pylon up (PL-XXV Figs 3–12, text
 * p. 104): the sand box, « cylindres en tôle de 0,50 m de hauteur et de
 * 0,40 m de diamètre » with its « tampon de chêne fortement fretté »
 * (two on the double, « Boîte à sable (deux) »); then the temporary shoe.
 * Under a, « une table inférieure horizontale de 14 mm d'épaisseur ... de
 * 1,65 m sur 1,03 m ... maintenue par six fortes consoles ... de 1,33 m de
 * hauteur » [sourced]; the upright climbs 1.41 m for every metre along
 * the diagonal (it leans at 54° in the diagonal plane), so the table's
 * SHORT side lies along the slope, a rise of 1.45, which is what the
 * consoles' 1.33 fills (the long side would need 2.3), the consoles in the
 * diagonal's vertical planes [derived]. Under b and d, PL-XXV Fig. 9 draws
 * a table 0.920 × 0.908, its sides along the upright's faces, on four
 * consoles against those faces (the text's « 0,877 m sur 0,908 m ... 3
 * consoles » reads the upright's own 0.877 face) [sourced Fig. 9, as the
 * verification read it]; here the four stand in the faces' vertical planes
 * 0.20 either side of the table's centre. Every console runs from the
 * table to 5 mm under the upright, capped at 1.33.
 */
export const BEARING = {
  box: { d: 0.4, h: 0.5 },
  table: 0.014,
  median: { long: 1.03, across: 1.65, consoles: 6 },
  lateral: { long: 0.92, across: 0.908, consoles: 4 },
  console: { high: 1.33, t: 0.02 },
} as const;

/** The legs' lean in panels 1–4, plan metres per metre of height (0.50269) [derived from NODES]. */
const LEAN = (NODES[1]!.outer - NODES[5]!.outer) / (NODES[5]!.y - NODES[1]!.y);

/** The table's top: the pylon's top, the sand box, the table. */
const TABLE_TOP = PYLON.top + BEARING.box.h + BEARING.table;

/**
 * Where on its upright a pylon props: the height of the upright's AXIS
 * over the table's centre. The upright is a square of 0.877 in plan
 * (`UPRIGHT_BOX`), leaning inward along the leg's diagonal, so over a
 * point `t` inward along the diagonal and `v` across it its underside
 * stands at y_c + ((t + |v|)/√2 - h)/lean [derived]. Under a, the table's
 * outer edge (t = -long/2, v = 0) is where it comes nearest, so the axis
 * is set where that edge just clears: y_c = table top + (long/(2√2) +
 * h)/lean, 29.52. Under b and d the table must also stand clear of the
 * leg's side faces, whose entretoise (1.20 wide, spec.ts `ENTRETOISE`)
 * and bracing meet at node XXVI (28.40): its edge 3 cm inside the
 * entretoise's, so y_c = 28.40 + (0.46 + 0.60 + 0.03)/lean = 30.57
 * [derived]; PL-XXV Fig. 1 puts the singles' corners about a metre inside
 * the node's position, which this is [measured by the verification,
 * ±0.6].
 */
export function propY(long: number): number {
  return TABLE_TOP + (long / (2 * Math.SQRT2) + UPRIGHT_BOX.planHalf) / LEAN + 0.005;
}

/** The lateral props' height (see {@link propY}). */
export const LATERAL_PROP_Y = node("XXVI").y + (BEARING.lateral.long / 2 + ENTRETOISE.width / 2 + 0.03) / LEAN;

/** The underside of an upright whose axis is over (xc, zc) at height yc, over the plan point (x, z). */
export function undersideAt(xc: number, zc: number, yc: number, x: number, z: number): number {
  return yc + (Math.max(xc - x, zc - z) - UPRIGHT_BOX.planHalf) / LEAN;
}

/**
 * One pyramid of the pylon family, in plan frame (o, u, v): `o` its corner
 * under the upright's side at the top's outer corner, `u` and `v` the two
 * unit plan directions its foot runs off along (each a vertical face at
 * u = 0, v = 0), the foot `bu` × `bv`, the top `tu` × `tv`, post axis to
 * post axis.
 */
function pyramid(o: Vec3, u: Vec3, v: Vec3, bu: number, bv: number, tu: number, tv: number, cap = true): Block[] {
  const out: Block[] = [];
  const H = PYLON.top;
  // A post's axis at height y: its foot's grid point moving to its top's.
  const at = (i: number, j: number, y: number): Vec3 => {
    const s = y / H;
    const du = (i / 2) * (bu + (tu - bu) * s);
    const dv = (j / 2) * (bv + (tv - bv) * s);
    return add3([o[0], y, o[2]], add3(mul3(u, du), mul3(v, dv)));
  };
  const post = PYLON.post;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue;
      // From 7 cm up, so a raking post's square-cut foot stays out of the
      // ground; spliced at the joint.
      out.push(beam(at(i, j, 0.07), at(i, j, PYLON.splice), post, post, u));
      out.push(beam(at(i, j, PYLON.splice), at(i, j, H - 0.25), post, post, u));
    }
  }
  // The moises: a pair at every level, one either side of each line of
  // posts; those along v a board's depth under those along u, so the two
  // never share a band. The vertical faces stand hard under the leg, so on
  // their lines only the inner board is drawn.
  // A raking post drifts 0.27 m a metre across its lean, so over a board's
  // depth it moves 7 cm: the boards stand 5 cm off the posts' mid-depth
  // faces, their bolts' packing, so no board cuts its post [estimated].
  const m = PYLON.moise;
  const off = post / 2 + m.thick / 2 + 0.05;
  for (const y of [...PYLON.levels, H - 0.25]) {
    for (let k = 0; k < 3; k++) {
      // Along u, the line j = k; along v, the line i = k, lower.
      const lines: Array<[Vec3, Vec3, Vec3, boolean]> = [
        [at(0, k, y - m.deep / 2), at(2, k, y - m.deep / 2), v, k === 0],
        [at(k, 0, y - (3 * m.deep) / 2), at(k, 2, y - (3 * m.deep) / 2), u, k === 0],
      ];
      for (const [a, b, across, onVertical] of lines) {
        const ext = unit3(sub3(b, a));
        const a2 = sub3(a, mul3(ext, onVertical ? 0 : post / 2 + 0.1));
        const b2 = add3(b, mul3(ext, post / 2 + 0.1));
        for (const sgn of onVertical ? [1] : [-1, 1]) {
          const d = mul3(across, sgn * off);
          out.push(beam(add3(a2, d), add3(b2, d), m.thick, m.deep, across));
        }
      }
    }
  }
  // The crosses, one X a bay on the four faces, outside the moises (inside
  // on the vertical faces), in every tier tall enough to take one; each
  // stops 0.45 short of its posts, so two faces' crosses never meet at a
  // corner.
  const tiers = [...PYLON.levels, H - 0.25];
  const cr = PYLON.cross;
  const out2 = post / 2 + m.thick + 0.05 + cr / 2 + 0.005;
  for (let t = 0; t + 1 < tiers.length; t++) {
    const y0 = tiers[t]! + 0.05;
    const y1 = tiers[t + 1]! - 2 * m.deep;
    if (y1 - y0 < 1.5) continue;
    // (The two vertical faces' crosses both stand inside, so where they
    // meet, at the corner under the upright, each stops further short.)
    const faces: Array<[(k: number, y: number) => Vec3, Vec3, boolean]> = [
      [(k, y) => at(k, 0, y), v, true],
      [(k, y) => at(k, 2, y), v, false],
      [(k, y) => at(0, k, y), u, true],
      [(k, y) => at(2, k, y), u, false],
    ];
    for (const [edge, outward, vertical] of faces) {
      for (let k = 0; k < 2; k++) {
        const p00 = edge(k, y0);
        const p10 = edge(k + 1, y0);
        const p01 = edge(k, y1);
        const p11 = edge(k + 1, y1);
        if (len3(sub3(p10, p00)) < 1.2 || len3(sub3(p11, p01)) < 0.9) continue;
        const along = unit3(sub3(p10, p00));
        const pair: Array<[Vec3, Vec3]> = [
          [p00, p11],
          [p10, p01],
        ];
        pair.forEach(([a, b], n) => {
          const dir = unit3(sub3(b, a));
          const d = mul3(outward, out2 + n * (cr + 0.005));
          // The end at post 0 of a vertical face: the corner.
          const cut = (atPost0: boolean) => (vertical && k === 0 && atPost0 ? 1.7 : 1.1);
          const p0 = add3(add3(a, mul3(dir, cut(n === 0))), d);
          const p1 = add3(sub3(b, mul3(dir, cut(n === 1))), d);
          // A stub too short to brace anything is left out.
          if (len3(sub3(p1, p0)) >= 2) out.push(beam(p0, p1, cr, cr, along));
        });
      }
    }
  }
  // The cap: a plank floor over the top's posts.
  if (cap) {
    const c0 = at(0, 0, H);
    const centre = add3(c0, mul3(add3(mul3(u, tu), mul3(v, tv)), 0.5));
    out.push({ at: [centre[0], H - 0.125, centre[2]], x: u, y: UP, size: [tu + post, 0.25, tv + post] });
  }
  return out;
}

/** An upright's plan position at height y, in the +x+z leg: [x, z] off the node table. */
function uprightAt(name: "a" | "b" | "d", y: number): [number, number] {
  const p = profileAt(y);
  if (name === "a") return [p.inner, p.inner];
  if (name === "b") return [p.inner, p.outer];
  return [p.outer, p.inner];
}

/** The unit plan directions of pile 4's leg: inward along its diagonal, and across it. */
const IN: Vec3 = [-Math.SQRT1_2, 0, -Math.SQRT1_2];
const ACROSS: Vec3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];

/** One leg's pylons (pile 4, the +x+z leg): the timber. */
export function pylonBlocks(): Block[] {
  const out: Block[] = [];
  const cap = PYLON.cap;
  // The singles, under b and d: the top centred under the prop, the foot
  // running in on both plan axes.
  for (const name of ["b", "d"] as const) {
    const [x, z] = uprightAt(name, LATERAL_PROP_Y);
    out.push(...pyramid([x + cap / 2, 0, z + cap / 2], [-1, 0, 0], [0, 0, -1], PYLON.base, PYLON.base, cap, cap));
  }
  // The double, under a: two pyramids back to back across the diagonal,
  // PYLON.gap apart, each converging to its own 1.10 top, and the 5.80 ×
  // 1.10 cap planking over both, centred under a's prop. The planking
  // stands on outriggers from the last tier (PL-XXV Fig. 13), so the
  // pyramids' end faces stand 0.65 in from under it: without that the
  // double's outer feet would stand on the singles', which the plate draws
  // apart [estimated].
  const [x, z] = uprightAt("a", propY(BEARING.median.long));
  const end: Vec3 = add3([x, 0, z], mul3(IN, -cap / 2 + 0.65));
  for (const s of [1, -1]) {
    const side = mul3(ACROSS, s);
    out.push(...pyramid(add3(end, mul3(side, PYLON.gap / 2)), IN, side, PYLON.base, PYLON.base, cap, cap, false));
  }
  const c = add3([x, PYLON.top - 0.125, z], [0, 0, 0]);
  out.push({ at: c, x: IN, y: UP, size: [cap + PYLON.post, 0.25, PYLON.doubleCap] });
  return out;
}

/**
 * One console: a plate in the vertical plane through `from` along `dir`,
 * `len` long, from the table up to 5 mm under the upright, capped at 1.33;
 * cut into straight-topped pieces so each is convex.
 */
function console(from: Vec3, dir: Vec3, side: Vec3, len: number, under: (x: number, z: number) => number): Prism[] {
  const b = BEARING;
  const top = (t: number): number => {
    const p = add3(from, mul3(dir, t));
    return Math.min(TABLE_TOP + b.console.high, under(p[0], p[2]) - 0.005);
  };
  const out: Prism[] = [];
  const n = 8;
  for (let k = 0; k < n; k++) {
    const t0 = (len * k) / n;
    const t1 = (len * (k + 1)) / n;
    const h0 = top(t0);
    const h1 = top(t1);
    if (Math.min(h0, h1) - TABLE_TOP < 0.03) continue;
    const at = (t: number, y: number): Vec3 => {
      const p = add3(add3(from, mul3(dir, t)), mul3(side, -b.console.t / 2));
      return [p[0], y, p[2]];
    };
    out.push({ outline: [at(t0, TABLE_TOP), at(t1, TABLE_TOP), at(t1, Math.min(h0, h1)), at(t0, Math.min(h0, h1))], depth: b.console.t });
  }
  return out;
}

/**
 * One leg's sand boxes and shoes (pile 4): iron. The median table lies
 * along the leg's diagonal, its consoles in the diagonal's vertical
 * planes; the laterals' tables along the upright's faces, their consoles
 * in the faces' planes (see {@link BEARING}).
 */
export function pylonBearings(): Prism[] {
  const out: Prism[] = [];
  const b = BEARING;
  const box = (p: Vec3): void => {
    // Seen from the ground under the scaffold: `SAG.near`.
    out.push(cylinder([p[0], PYLON.top, p[2]], [p[0], PYLON.top + b.box.h, p[2]], b.box.d, flatsSides(b.box.d, SAG.near)));
  };
  // Under a.
  {
    const shoe = b.median;
    const yc = propY(shoe.long);
    const [xc, zc] = uprightAt("a", yc);
    const c: Vec3 = [xc, 0, zc];
    for (const v of [-0.3, 0.3]) box(add3(c, mul3(ACROSS, v)));
    out.push(blockPrism({ at: [xc, TABLE_TOP - b.table / 2, zc], x: IN, y: UP, size: [shoe.long, b.table, shoe.across] }));
    for (let k = 0; k < shoe.consoles; k++) {
      const v = -shoe.across / 2 + 0.06 + ((shoe.across - 0.12) * k) / (shoe.consoles - 1);
      out.push(...console(add3(c, add3(mul3(IN, -shoe.long / 2), mul3(ACROSS, v))), IN, ACROSS, shoe.long, (x, z) => undersideAt(xc, zc, yc, x, z)));
    }
  }
  // Under b and d.
  for (const name of ["b", "d"] as const) {
    const shoe = b.lateral;
    const yc = LATERAL_PROP_Y;
    const [xc, zc] = uprightAt(name, yc);
    box([xc, 0, zc]);
    out.push(blockPrism({ at: [xc, TABLE_TOP - b.table / 2, zc], x: [1, 0, 0], y: UP, size: [shoe.long, b.table, shoe.across] }));
    const under = (x: number, z: number) => undersideAt(xc, zc, yc, x, z);
    // Over the table's inner three quarters: its outer corner lies under
    // the bracing that springs from node XXVI [derived from the model].
    for (const s of [-0.2, 0.2]) {
      out.push(...console([xc - shoe.long / 2, 0, zc + s], [1, 0, 0], [0, 0, 1], shoe.long / 2 + 0.2, under));
      out.push(...console([xc + s, 0, zc - shoe.across / 2], [0, 0, 1], [1, 0, 0], shoe.across / 2 + 0.2, under));
    }
  }
  return out;
}

// ------------------------------------------------------------------ //
// The girders' scaffolds.
// ------------------------------------------------------------------ //

/**
 * THE SCAFFOLDS (« échafaudages des poutres »), PL-XXV Figs 1, 15–18 and
 * text pp. 107–108: « quatre échafaudages semblables, un dans chaque face
 * de la Tour. Ils avaient 41 m de hauteur et se composaient de neuf
 * montants verticaux de 25 × 25, espacés de 7,50 m dans un sens et de
 * 7,75 m dans l'autre ... contreventés dans tous les sens par des croix de
 * Saint-André formées par des bois de 0,22 m × 0,11 m et reliés
 * horizontalement par sept cours de moises de 0,25 m × 0,12 m. Des
 * contrefiches disposées à leur partie supérieure permettaient de donner à
 * la plate-forme de montage 28,50 m de longueur sur 22,40 m de largeur.
 * Enfin une autre série de contrefiches ... soutenaient un cintre, qui
 * servit plus tard à mettre en place la partie centrale des arcs
 * décoratifs » [sourced]. The plate stands them on the ground at (35.10),
 * y 1.60, with tiers of 7.20 and a doubled joint 22.10 up [sourced
 * Figs 17–18]; the model's ground is one plane at y 0, so the sills sit
 * on it and the posts stand 1.60 taller below the plate's first row
 * [derived]. The rows: 0.50 over the plate's ground, then 7.20, 7.20, 7.20
 * to the joint (22.10, doubled 0.50 over), 7.20, 6.40 [sourced Figs
 * 17–18], each post spliced at the joint. In plan the posts run 22.10 to
 * 37.10 from the tower's axis and ±7.75 along the face [measured PL-XXV
 * Fig. 1, ±0.5], the deck ±14.25 along it and, across, 4.90 inside the
 * inner row and 2.50 outside the outer, 17.20 to 39.60 [measured Fig. 18;
 * Fig. 1's « 19.30 » would put its inner edge at 17.80].
 */
export const SCAFFOLD = {
  n: [22.1, 29.6, 37.1] as readonly number[],
  s: [-7.75, 0, 7.75] as readonly number[],
  post: 0.25,
  moise: { deep: 0.25, thick: 0.12 },
  cross: { w: 0.22, t: 0.11 },
  /** The moises' levels: the plate's ground (1.60) and every 7.20, the joint doubled [sourced Figs 17–18]. */
  levels: [2.1, 9.3, 16.5, 23.7, 24.2, 31.4, 37.8] as readonly number[],
  /** The posts' splice, between the joint's two rows. */
  splice: 23.95,
  deck: { y: yOfCote(35.1) + 41.0, n: [17.2, 39.6] as readonly number[], s: 14.25, joist: 0.25, plank: 0.06 },
  /** How far below the arch's intrados the centring's rib stands [estimated]. */
  ribClear: 0.05,
  rib: 0.25,
  /** The centring's span along the face: the middle of the arch, between the struts' reach [measured Fig. 17]. */
  ribSpan: 10.5,
} as const;

/** The arch's intrados on the +z face at `x` along it: its height (firstFloor.ts' circle, in the leaning face plane). */
export function intradosY(x: number): number {
  const cos = 1 / Math.hypot(1, LEAN);
  const centre = ARCH.crownY - ARCH.radius * cos;
  return centre + cos * Math.sqrt(ARCH.radius * ARCH.radius - x * x);
}

/** One face's scaffold (the +z face): posts, moises, crosses and the struts under the deck and the centring. */
export function scaffoldBlocks(): Block[] {
  const out: Block[] = [];
  const S = SCAFFOLD;
  const top = S.deck.y - S.deck.joist - S.deck.plank;
  const X: Vec3 = [1, 0, 0];
  const Z: Vec3 = [0, 0, 1];
  // The posts, to the deck's joists, spliced at the joint.
  for (const n of S.n) {
    for (const s of S.s) {
      out.push(beam([s, 0, n], [s, S.splice, n], S.post, S.post, X));
      out.push(beam([s, S.splice, n], [s, top, n], S.post, S.post, X));
    }
  }
  // The moises, in pairs, along both grid directions at every level.
  const off = S.post / 2 + S.moise.thick / 2;
  for (const y of S.levels) {
    const yc = y - S.moise.deep / 2;
    for (const n of S.n) {
      for (const sg of [-1, 1]) {
        out.push(beam([S.s[0]! - 0.3, yc, n + sg * off], [S.s[2]! + 0.3, yc, n + sg * off], S.moise.thick, S.moise.deep, Z));
      }
    }
    for (const s of S.s) {
      for (const sg of [-1, 1]) {
        out.push(beam([s + sg * off, yc - S.moise.deep, S.n[0]! - 0.3], [s + sg * off, yc - S.moise.deep, S.n[2]! + 0.3], S.moise.thick, S.moise.deep, X));
      }
    }
  }
  // The crosses: an X in every bay of all six planes of posts, every tier
  // between two rows (the joint's pair counts as one), outside the moises.
  const tiers: Array<[number, number]> = [
    [2.1, 9.3],
    [9.3, 16.5],
    [16.5, 23.7],
    [24.2, 31.4],
    [31.4, 37.8],
  ];
  const cw = S.cross.w;
  const ct = S.cross.t;
  const out2 = S.post / 2 + S.moise.thick + ct / 2 + 0.005;
  for (const [lo, hi] of tiers) {
    const y0 = lo + 0.05;
    const y1 = hi - 2 * S.moise.deep - 0.05;
    for (const n of S.n) {
      for (let k = 0; k < 2; k++) {
        const s0 = S.s[k]!;
        const s1 = S.s[k + 1]!;
        const sg = n === S.n[0] ? -1 : 1;
        const z = n + sg * out2;
        // Thin across the plane they brace: 0.11 on z, 0.22 in it.
        out.push(beam([s0, y0, z], [s1, y1, z], ct, cw, Z));
        out.push(beam([s1, y0, z + sg * (ct + 0.005)], [s0, y1, z + sg * (ct + 0.005)], ct, cw, Z));
      }
    }
    for (const s of S.s) {
      for (let k = 0; k < 2; k++) {
        const n0 = S.n[k]!;
        const n1 = S.n[k + 1]!;
        const sg = s < 0 ? -1 : 1;
        const x = s + (s === 0 ? 1 : sg) * out2;
        const d = (s === 0 ? 1 : sg) * (ct + 0.005);
        out.push(beam([x, y0, n0], [x, y1, n1], ct, cw, X));
        out.push(beam([x + d, y0, n1], [x + d, y1, n0], ct, cw, X));
      }
    }
  }
  // The deck's struts (« contrefiches »): from the outer posts' faces over
  // the last row, up and out to the deck's four edges.
  const from = S.levels[6]! + 0.15;
  const under = top - 0.05;
  const face = S.post / 2 + S.post / 2 + 0.01;
  for (const n of S.n) {
    for (const [s, edge] of [
      [S.s[0]!, -S.deck.s],
      [S.s[2]!, S.deck.s],
    ] as const) {
      out.push(beam([s + Math.sign(edge) * face, from, n], [edge - Math.sign(edge) * 0.2, under, n], S.post, S.post, Z));
    }
  }
  for (const s of S.s) {
    out.push(beam([s, from, S.n[0]! - face], [s, under, S.deck.n[0]! + 0.2], S.post, S.post, X));
  }
  // The centring: a rib of straight timbers just under the arch's intrados
  // in the face plane, over the middle of the face, on struts from the
  // outer posts.
  const ribPts: Vec3[] = [];
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const x = -S.ribSpan + (2 * S.ribSpan * i) / segs;
    const y = intradosY(x) - S.ribClear - S.rib / 2;
    ribPts.push([x, y, profileAt(y).outer]);
  }
  for (let i = 0; i < segs; i++) {
    // Each chord is lowered by its sag so it stays under the curve.
    const a = ribPts[i]!;
    const b = ribPts[i + 1]!;
    const mid = (a[0] + b[0]) / 2;
    const sag = (intradosY(mid) - S.ribClear - S.rib / 2) - (a[1] + b[1]) / 2;
    const dy = Math.max(0, sag) + 0.01;
    out.push(beam([a[0], a[1] - dy, a[2]], [b[0], b[1] - dy, b[2]], S.rib, S.rib, Z));
  }
  const outer = S.n[2]!;
  for (const s of S.s) {
    for (const k of [-1, 0, 1]) {
      // Each post carries its own third of the rib, so no two struts cross.
      const target = ribPts[3 * (Math.round(s / 7.75) + 1) + (k + 1)]!;
      // Under the rib, clear of its chords' sag.
      // Each from its own height on the post, 0.30 apart, so the fan does not cross itself.
      out.push(beam([s, from + 0.3 * (k + 1), outer + face], [target[0], target[1] - S.rib / 2 - 0.16, target[2]], 0.22, 0.22, X));
    }
  }
  return out;
}

/** One face's deck (the +z face): joists and planks, 28.50 × 22.40 at the top. */
export function deckBlocks(): Block[] {
  const S = SCAFFOLD;
  const out: Block[] = [];
  const y = S.deck.y;
  const [n0, n1] = S.deck.n as [number, number];
  // Joists along the face's normal, about every 2.6 m along it (PL-XXV Fig. 17).
  const count = 12;
  for (let i = 0; i < count; i++) {
    const s = -S.deck.s + 0.2 + ((2 * S.deck.s - 0.4) * i) / (count - 1);
    out.push({ at: [s, y - S.deck.plank - S.deck.joist / 2, (n0 + n1) / 2], x: [0, 0, 1], y: UP, size: [n1 - n0, S.deck.joist, S.deck.joist] });
  }
  out.push({ at: [0, y - S.deck.plank / 2, (n0 + n1) / 2], x: [1, 0, 0], y: UP, size: [2 * S.deck.s, S.deck.plank, n1 - n0] });
  return out;
}

/** The same, as prisms for the graph. */
export const pylonTimber = (): Prism[] => pylonBlocks().map(blockPrism);
export const scaffoldTimber = (): Prism[] => scaffoldBlocks().map(blockPrism);
export const scaffoldDeck = (): Prism[] => deckBlocks().map(blockPrism);

/**
 * The temporary works as graph outputs, `works.<kind>`, each copied to the
 * four legs or the four faces: `pylons` and `scaffolds` (the timber), `decks`
 * (the scaffolds' platforms, which came off before the arches' crowns went
 * on), `bearings` (the sand boxes and the shoes, iron).
 */
export function buildErection(g: Graph, quads: Parameters<typeof copyToQuadrants>[3]): Parts {
  return {
    works: [
      { name: "pylons", mesh: copyToQuadrants(g, "worksPylons", prisms(g, "pylon", pylonTimber()), quads, ["normal"]) },
      { name: "bearings", mesh: copyToQuadrants(g, "worksBearings", prisms(g, "bearing", pylonBearings()), quads, ["normal"]) },
      { name: "scaffolds", mesh: copyToQuadrants(g, "worksScaffolds", prisms(g, "scaffold", scaffoldTimber()), quads, ["normal"]) },
      { name: "decks", mesh: copyToQuadrants(g, "worksDecks", prisms(g, "deck", scaffoldDeck()), quads, ["normal"]) },
    ],
  };
}
