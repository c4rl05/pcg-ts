/**
 * The girders between the legs, and the decorative arches under them.
 *
 * Everything here lies in a tower FACE PLANE, or in its twin 15.00 m
 * inboard, and is built once, on the +z face, then copied onto the other
 * three. On that face the two legs' side uprights b and d stand at
 * x = ±inner(y), z = outer(y), straight within each panel, so a point of
 * the face is (x, y, outer(y)) with inner and outer read off the node
 * table.
 *
 * TWO PLANES PER FACE. The arch, its arcade, the decorative girder and the
 * grande poutre each stand twice: once in the face plane, through b and d
 * ("faces 1 and 2" of PL-XI), and once in the plane of the legs' inner
 * uprights a, 15.00 inboard ("faces 3 and 4") [sourced PL-XI Fig. 1 Nota
 * and Fig. 2: "les poutres des deux arcs", braced "entre les faces 2 et
 * 3", the two arch lines drawn 15.00 apart beside arbalétriers b and a].
 * In panels 1-5 the legs are 15.00 squares, so the inner plane is the
 * outer one moved 15.00 toward the tower's axis, with the same spans
 * [derived]. Only the outward sides are decorated: face 1 of the outer
 * arch and face 4 of the inner, toward the tower's centre [sourced PL-XI
 * Nota]. The inner grande poutre is what the first-floor deck's cross
 * girders (platforms.ts) rest their inner ends on.
 *
 * THE ARCH ("arc décoratif", non-structural), in the face plane. In-plane
 * coordinates (x, t), t up the plane from the centre of the intrados,
 * which sits R 36.4064 below the crown's 39.40 clear height, at y 6.87
 * [sourced PL-I, PL-VII; derived]. From the crown down:
 * - the BAND: intrados R 36.4064 and extrados R 40.32373, concentric, to
 *   the members' outer faces, so 3.9173 deep at the crown [sourced PL-VII,
 *   printed on the axis]. Both chords 600 wide ("600 x 7") [sourced].
 * - radial MONTANTS 1-14 per half, numbered from the crown, 2.5488 apart
 *   along the intrados [sourced PL-VII: "2,5488" twice, tick to tick on
 *   the intrados; PL-XI Fig. 1 numbers them]. They are what places the
 *   arcade: montants 1-8 run on to the axis of the decorative girder's
 *   bottom chord, and the plate's post spacings along that chord (2.8577,
 *   2.8955 ... 3.5505) are those radial lines' crossings at y 43.40, six
 *   of the seven within 0.5 mm [derived; the first prints 9 mm short,
 *   measured off the axis post's face perhaps]. That fixes the centre, the
 *   crown's 39.40 and the chord's 43.40 together. Montants 9-11 run on to
 *   upright b's face, and 12-14 close the band where the extrados has met
 *   it. 400 wide [sourced].
 * - the extrados ends where it meets b; the intrados runs on alone. At the
 *   point where the circle runs parallel to b it is 1.00 from b's axis
 *   [sourced PL-XI Fig. 10, section AB] and changes to R 44.5258, tangent,
 *   whose centre lies on that normal [sourced: "R-36.4064 / R=44.5258" at
 *   B]. That arc turns vertical 37.119 off the axis at y 3.90 — the
 *   pedestals' inner faces, the 74.238 clear span of PL-I [derived; the
 *   closure is to 0.2 mm, which is how the junction is placed at the
 *   parallel point rather than lower]. The member stops on a small pier
 *   at y 5.10 [estimated from PL-VII Fig. 1 and the PL-XI trace] standing
 *   at the pedestal's inner edge.
 * - a small bracket ties the lower arch to b: ties at the panel's mid
 *   horizontal (11.9) and 9.4, an X between them and a strut down to the
 *   arch at 7.1 [sourced PL-VII Fig. 1 drawing; heights estimated].
 * - FANS: the ornament in each band panel, a half-disc of radiating bars
 *   on the intrados [sourced drawing PL-VII, PL-XI; reduced to a rim and
 *   three spokes], on the decorated side.
 *
 * THE ARCADE between the band and the decorative girder: plates on the
 * decorated side, "découpées en arc de cercle ou laissées pleines au
 * sommet des arcs" [sourced PL-XI Nota]. Solid between montants 1 and 4,
 * where the band all but touches the chord (0.19 in the plane at the
 * crown [derived]); round-headed openings between montants 4|5 ... 7|8
 * under the chord and 8|9 ... 10|11 under upright b, seven per half
 * [sourced PL-XI Fig. 1, PL-VII]. Each head is the circle tangent to its
 * two montants and to the chord (or b's face) above [estimated rule; it
 * gives the radii PL-VII prints, 1.2362 / 1.272 / 1.317 under the chord,
 * 9-10 mm over, and 1.2506 / 1.196 beside the leg, 19 mm over]; every
 * head springs clear of the extrados, which the build checks.
 *
 * THE DECORATIVE GIRDER ("poutre de l'arc"): y 43.40 -> 50.40, bottom
 * 45.287, top 38.25 [sourced], in panel 4. Its bottom chord is the
 * arcade's "membrure", 749 deep [sourced PL-VII], on the 43.40 line; its
 * top chord is 330 deep ("330 x 8") just under the grande poutre's
 * [sourced]. Posts every 3.8825 from the axis [sourced], eleven: the
 * outer pair at 19.4125 is short, rising from the membrure to b, which
 * leaves the "3,2313" end bay PL-VII prints [derived: 22.6438 - 19.4125].
 * An X in every bay [sourced drawing]; the top corner at b is rounded
 * [sourced drawing; radius estimated].
 *
 * THE GRANDE POUTRE DU 1er ÉTAGE: panel 5, between b and d. Its chords are
 * 800 plates [sourced PL-VII "800 x 12"] whose outer faces lie on the node
 * lines — "entre semelles 7,5309", the node-to-node depth in the plane
 * [sourced] — so the top is 0.23 under the floor [sourced PL-XVI]. Posts
 * 168 wide [sourced] every 3.8825 from the axis, nine, which leaves the
 * 3.595 end bays at the bottom [derived]. The web is not an X per bay: a
 * 360 diagonal per bay falling toward the axis, and a second set the
 * other way crossing each post at its mid-height gusset [sourced PL-VII,
 * 360 both].
 *
 * BETWEEN THE TWO PLANES: entretoises ABCD at montant 1 and AEFD at
 * montants 8, from the intrados to the membrure, and GHIJ across the
 * decorative girders at their posts 0, ±7.765, ±15.53 ("1' ... 5'"), with
 * horizontal X bracing between the GHIJ frames at the girders' top and
 * bottom [sourced PL-XI Nota; the frames' members estimated from Fig. 2:
 * latticed cross members, light diagonals].
 *
 * THE 2nd FLOOR between the legs, in the face plane only [sourced PL-VII
 * Fig. 2, PL-I]: at the bottom of panel 10 (node XIX) a lintel band
 * "3,6071" deep in the plane, a diamond lattice of 300 x 5 flats under a
 * 600 chord [sourced; bar spacing estimated]; above it to node XVIII an X
 * each side of a post on the axis, all 600 [sourced]; and panel 11, posts
 * "3,36268" apart from the axis (a fifth of the face's 16.8134) with a
 * diamond lattice of 80 x 80 angles crossing at the posts' mid-heights,
 * under 450 chords [sourced]. The same bands run on across the legs'
 * faces; those belong to the legs.
 *
 * Every member is an explicit two-point member squared to the plane it
 * lies in: each carries that plane's normal (`FACE_NORMAL`), is copied
 * onto the other faces with `copyMembersToQuadrants`, which turns the
 * normal with it, and is skinned from it afterwards (`faceSkin`), so a
 * member in a leaning face lies flat in it. Curves are chains of short
 * members. The arcade's plates are closed outlines, copied and then
 * extruded along their own normals.
 *
 * DETAIL, as for the legs. With `lacedWeb` the girders' diagonals and the
 * 2nd floor's 600 web become laced struts (`webMembers`); with `rivets`
 * those struts carry their lacing rivets, and every chord, post and
 * montant carries seam rows along its corner angles.
 */
import {
  type Graph,
  type NodeHandle,
  attribute,
  extrudePolygon,
  index,
  mul,
  pointGrid,
  pointsToPath,
  removeAttribute,
  setAttribute,
  vec,
} from "pcg-ts";
import {
  FACE_NORMAL,
  box,
  copyMembersToQuadrants,
  copyToQuadrants,
  indexTable,
  merge,
  type Vec3,
} from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { ARCH, FIRST_FLOOR, MEMBERS, PEDESTAL, node, profileAt } from "./spec.js";
import { UPRIGHT_SEAMS, faceSkin, rivetOutputs, seamRivets, webMembers } from "./strut.js";

/** A point in a face plane: x across it, t up it from the arch centre. */
type InPlane = readonly [number, number];

/** One straight member and the normal of the plane it lies in. */
interface Member {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly n: Vec3;
}

// ---------------------------------------------------------------- numbers

/** The girders' post spacing [sourced PL-XI, PL-VII]. */
const BAY = 3.8825;
/** The inner plane's offset toward the axis: the legs' 15.00 side [sourced]. */
const INNER_OFFSET = node("XXIV").outer - node("XXIV").inner;

/** Intrados radius, to the members' inner faces [sourced PL-VII, PL-XI]. */
const R_IN = ARCH.radius;
/** Extrados radius, concentric, to the outer faces [sourced PL-VII]. */
const R_OUT = 40.32373;
/** The intrados below the junction with b [sourced PL-XI Fig. 10]. */
const R_FOOT = 44.5258;
/** Montant pitch along the intrados [sourced PL-VII "2,5488"]. */
const PITCH = 2.5488;
/** Montants per half, numbered from the crown [sourced PL-XI Fig. 1]. */
const MONTANTS = 14;
/** Montants 1..8 reach the decorative girder's bottom chord [sourced PL-VII]. */
const TO_MEMBRURE = 8;
/** Openings between montants k and k + 1 [sourced PL-XI Fig. 1, PL-VII]. */
const OPEN_FROM = 4;
const OPEN_TO = 10;

/** Half the band chords' 600 [sourced "600 x 7"]. */
const ARCH_CHORD = 0.3;
/** Half the montants' 400 [sourced PL-VII "400"]. */
const MONTANT = 0.2;
/** Half the arcade chord's 749 [sourced PL-VII "749"]. */
const MEMBRURE = 0.3745;
/** Half the decorative girder's 330 top chord [sourced PL-VII "330 x 8"]. */
const DECO_TOP = 0.165;
/** Half the grande poutre's 800 chords [sourced PL-VII "800 x 12"]. */
const MAIN_CHORD = 0.4;
/** Half the girders' 168 posts [sourced PL-VII "168"]. */
const POST = 0.084;
/** Half the 500 end posts: the grande poutre's at 15.53, the short ones at 19.41 [sourced PL-VII "500"]. */
const END_POST = 0.25;
/** The girders' 360 diagonals, as a web table [sourced PL-VII "360"]. */
const GIRDER_WEB = [
  [0, 0.18],
  [300, 0.18],
] as const;
/**
 * The openings' edges: the plates' cut edge with its 50 x 50 x 6 edging
 * angle [sourced PL-VII "C: 50 x 50 x 6"], as a square member [estimated].
 */
const HEAD_EDGE = 0.04;
/** The fans' bars [estimated: drawn about 0.05 wide at 1:200]. */
const FAN_BAR = 0.025;
/** The rounded top corner of the decorative girder: radius, bar [estimated]. */
const FILLET_R = 1.5;
const FILLET_BAR = 0.12;
/** The lower arch's bracket to b: 80 x 80 x 8 angles [sourced], squared [estimated]. */
const BRACKET_BAR = 0.06;
/** Heights of the bracket's ties and of its strut's foot [estimated, PL-VII Fig. 1]. */
const BRACKET_TIES = [(node("XXVIII").y + node("XXVII").y) / 2, 9.4] as const;
const BRACKET_FOOT = 7.1;
/** Entretoises: latticed cross members and light diagonals [estimated, PL-XI Fig. 2]. */
const ENTRETOISE_WEB = [
  [0, 0.2],
  [300, 0.2],
] as const;
const ENTRETOISE_BAR = 0.05;
/** The GHIJ frames' posts on the decorative girders [sourced PL-XI "1' ... 5'"]. */
const GHIJ = [-2 * BAY * 2, -2 * BAY, 0, 2 * BAY, 2 * BAY * 2] as const;
/**
 * The arch's pier: its top, where the arch stops [estimated: PL-VII Fig.
 * 1's capital, and PL-XI's trace ending at 5.1], and its side [estimated,
 * 1.3 on PL-VII]. It stands from the ground at the pedestal's inner edge.
 */
const PIER_TOP = 5.1;
const PIER_SIDE = 1.3;
/**
 * The arcade plates: 3 mm [sourced PL-VII "3m/m"], drawn 10 mm so they
 * render, on the decorated side against the montants' faces.
 */
const PLATE = 0.01;
const PLATE_OFFSET = MONTANT;

/** Segments per round head, per fan, per fillet [estimated: drawing resolution]. */
const HEAD_SEGMENTS = 12;
const FAN_SEGMENTS = 8;
const FILLET_SEGMENTS = 6;

/** 2nd floor: panel 10's lintel band depth, in the plane [sourced PL-VII "3,6071"]. */
const BAND10_DEPTH = 3.6071;
/** Its lattice bars' spacing along the chord [estimated, PL-VII Fig. 2: about 1.21]. */
const BAND10_PITCH = 1.21;
/** Its 300 x 5 flats [sourced], squared to 0.2 [estimated]. */
const BAND10_BAR = 0.1;
/** Its chords: the 600 top [sourced], the bottom alike [estimated]. */
const BAND10_CHORD = 0.3;
/** Panel 10's X and post above the band: 600 [sourced], a web table. */
const PANEL10_WEB = [
  [0, 0.3],
  [300, 0.3],
] as const;
/** Panel 11: posts from the axis [sourced "3,36268"], chords 450 [sourced "450 x 8"]. */
const PANEL11_POST = 3.36268;
const PANEL11_CHORD = 0.225;
/** Panel 11's posts and lattice angles [estimated: 80 x 80 angles, squared]. */
const PANEL11_POST_BAR = 0.1;
const PANEL11_BAR = 0.05;

/** Seam rows along chords, posts and montants: the uprights' rhythm [estimated]. */
const SEAMS = UPRIGHT_SEAMS;

// --------------------------------------------------------------- the face

/** A face's lean, horizontal per vertical, over the panels from node a to b. */
function slopeOf(a: string, b: string): number {
  return (node(a).outer - node(b).outer) / (node(b).y - node(a).y);
}
/** The unit normal of a face plane z = outer(y) leaning by `slope`. */
function normalOf(slope: number): Vec3 {
  const l = Math.hypot(1, slope);
  return [0, slope / l, 1 / l];
}

/**
 * The face's lean in panels 1-4 (0.50269) [derived]: the arch, the arcade
 * and the decorative girder lie in this stretch of the face.
 */
const SLOPE = slopeOf("XXVIII", "XXIV");
/** In-plane height to vertical height (0.89346), and the lean's sine [derived]. */
const COS = 1 / Math.hypot(1, SLOPE);
const SIN = SLOPE * COS;
const N4 = normalOf(SLOPE);
const N5 = normalOf(slopeOf("XXIV", "XXIII"));
const N10 = normalOf(slopeOf("XIX", "XVIII"));
const N11 = normalOf(slopeOf("XVIII", "XVII"));
/** The arch centre's height (6.87) [derived]. */
const CENTRE_Y = ARCH.crownY - R_IN * COS;
/**
 * b's inner face, horizontally from its axis across the face: the 0.41
 * half-width is square to the member [sourced PL-XXXI], which leans along
 * the leg's diagonal (slope SLOPE in both x and z), so its box face lies
 * 0.41 / sqrt(1 - SLOPE^2 / (1 + 2 SLOPE^2)) = 0.4495 out [derived].
 */
const UPRIGHT_FACE =
  MEMBERS.upright[0][1] / Math.sqrt(1 - (SLOPE * SLOPE) / (1 + 2 * SLOPE * SLOPE));

/** A point on the +z face at (x, y), `dz` inboard of it. */
function onFace(x: number, y: number, dz = 0): Vec3 {
  return [x, y, profileAt(y).outer - dz];
}
/** The in-plane height of a world height. */
function planeT(y: number): number {
  return (y - CENTRE_Y) / COS;
}
/** An in-plane point of the arch's frame, `dz` inboard. */
function fromPlane([x, t]: InPlane, dz = 0): Vec3 {
  return onFace(x, CENTRE_Y + t * COS, dz);
}
/** The in-plane point at radius r along direction phi (from +t toward +x). */
function polar(r: number, phi: number): InPlane {
  return [r * Math.sin(phi), r * Math.cos(phi)];
}
const mirror = ([x, t]: InPlane): InPlane => [-x, t];

// b's axis in the plane is the line x + SIN t = X_B0: its normal points
// along PHI_H, where the circle runs parallel to it.
const X_B0 = profileAt(CENTRE_Y).inner;
const B_NORM = Math.hypot(1, SIN);
/** The direction, from the arch centre, of the foot of the normal on b (65.81 deg) [derived]. */
const PHI_H = Math.atan2(1, SIN);
/** b's axis from the arch centre (37.407: R_IN + 1.00) [derived]. */
const D_B = X_B0 / B_NORM;
/** b's inner face from the arch centre [derived]. */
const D_BF = (X_B0 - UPRIGHT_FACE) / B_NORM;
/** Along direction phi, the distance to a line whose normal is PHI_H at distance d. */
function toB(phi: number, d = D_BF): number {
  return d / Math.cos(phi - PHI_H);
}
/** The montants' angular pitch. */
const THETA = PITCH / R_IN;
/** The arcade chord's axis, in the plane (40.887). */
const T_M = planeT(FIRST_FLOOR.decorativeBottomY);
/** The lower arc's centre, on the normal through the junction. */
const C2: InPlane = polar(R_IN - R_FOOT, PHI_H);
/** Where the extrados chord's axis meets b's face. */
const PHI_E = PHI_H - Math.acos(D_BF / (R_OUT - ARCH_CHORD));

if (Math.abs(D_B - R_IN - 1) > 0.01) {
  throw new Error(
    `firstFloor: the arch's intrados passes ${(D_B - R_IN).toFixed(3)} from b's axis at its closest; PL-XI Fig. 10 prints 1.00 — the node table or ARCH.radius has moved`,
  );
}

// ------------------------------------------------------------- the arch

/** Angles 0, step, 2 step ... below `end`, then `end`. */
function angles(end: number, step: number, from = 0): number[] {
  const out: number[] = [];
  for (let a = from; a < end - 1e-9; a += step) out.push(a);
  out.push(end);
  return out;
}

/** The intrados member's axis, crown to pier: the circle, then the lower arc. */
function intradosAxis(): InPlane[] {
  const r = R_IN + ARCH_CHORD;
  const upper = angles(PHI_H, THETA / 2).map((phi) => polar(r, phi));
  const r2 = R_FOOT + ARCH_CHORD;
  const tPier = planeT(PIER_TOP);
  if (tPier < C2[1]) {
    throw new Error(
      `firstFloor: the arch's pier top (y ${PIER_TOP}) is below the point where the lower arc turns vertical; raise PIER_TOP`,
    );
  }
  const psiEnd = Math.acos((tPier - C2[1]) / r2);
  const step = 1.3 / r2;
  const lower = angles(psiEnd, step, PHI_H + step).map((psi): InPlane => {
    const [dx, dt] = polar(r2, psi);
    return [C2[0] + dx, C2[1] + dt];
  });
  return [...upper, ...lower];
}

/** The x of the lower arch member's axis at height y. */
function lowerArchX(y: number): number {
  const r2 = R_FOOT + ARCH_CHORD;
  const dt = planeT(y) - C2[1];
  return C2[0] + Math.sqrt(r2 * r2 - dt * dt);
}

/** The extrados member's axis, crown to where it meets b. */
function extradosAxis(): InPlane[] {
  return angles(PHI_E, THETA / 2).map((phi) => polar(R_OUT - ARCH_CHORD, phi));
}

/** Montant k's angle from the crown (k from 1). */
const phiOf = (k: number) => (k - 1) * THETA;

/** Montant k: from the intrados member's axis to the chord's axis or b's face. */
function montant(k: number): [InPlane, InPlane] {
  const phi = phiOf(k);
  const toChord = T_M / Math.cos(phi);
  const toFace = toB(phi);
  if ((k <= TO_MEMBRURE) !== toChord < toFace) {
    throw new Error(
      `firstFloor: montant ${k} reaches ${toChord < toFace ? "the arcade chord" : "upright b"} first, but the plate runs montants 1-${TO_MEMBRURE} to the chord and the rest to b`,
    );
  }
  return [polar(R_IN + ARCH_CHORD, phi), polar(k <= TO_MEMBRURE ? toChord : toFace, phi)];
}

/**
 * Montant k as the pieces that show: in the band between the chords'
 * faces, and above the extrados up to the chord or b. Radial pieces meet
 * the concentric chords square; where one meets the straight chord or b
 * at an angle it runs on until its near corner is home, so no notch shows.
 * Split so, no seam rivet is buried in the member it runs into.
 */
function montantPieces(k: number): InPlane[][] {
  montant(k);
  const phi = phiOf(k);
  const lo = R_IN + 2 * ARCH_CHORD;
  const pieces: InPlane[][] = [];
  const reach = (r0: number, r1: number) => {
    if (r1 - r0 > 0.1) pieces.push([polar(r0, phi), polar(r1, phi)]);
  };
  if (phi <= PHI_E) {
    reach(lo, R_OUT - 2 * ARCH_CHORD);
    const end =
      k <= TO_MEMBRURE
        ? (T_M - MEMBRURE) / Math.cos(phi) + MONTANT * Math.tan(phi)
        : toB(phi) + MONTANT * Math.abs(Math.tan(phi - PHI_H));
    reach(R_OUT, end);
  } else {
    reach(lo, toB(phi) + MONTANT * Math.abs(Math.tan(phi - PHI_H)));
  }
  return pieces;
}

/** The ornament of band panel k|k+1: a rim and three spokes. */
function fan(k: number): InPlane[][] {
  const phi = (k - 0.5) * THETA;
  const ri = R_IN + 2 * ARCH_CHORD;
  const ro = Math.min(R_OUT - 2 * ARCH_CHORD, toB(phi));
  const halfGap = ri * Math.sin(THETA / 2) - MONTANT;
  const rho = 0.9 * Math.min(halfGap, ro - ri);
  const c = polar(ri, phi);
  const er: InPlane = [Math.sin(phi), Math.cos(phi)];
  const ep: InPlane = [Math.cos(phi), -Math.sin(phi)];
  const at = (a: number): InPlane => [
    c[0] + rho * (Math.cos(a) * ep[0] + Math.sin(a) * er[0]),
    c[1] + rho * (Math.cos(a) * ep[1] + Math.sin(a) * er[1]),
  ];
  const rim = Array.from({ length: FAN_SEGMENTS + 1 }, (_, i) => at((Math.PI * i) / FAN_SEGMENTS));
  return [rim, ...[0.25, 0.5, 0.75].map((f) => [c, at(Math.PI * f)])];
}

/** A line n . p = d in the plane, n a unit normal pointing into the region it bounds. */
interface Line {
  readonly n: InPlane;
  readonly d: number;
}
/** Where two lines meet. */
function meet(p: Line, q: Line): InPlane {
  const det = p.n[0] * q.n[1] - p.n[1] * q.n[0];
  return [(p.d * q.n[1] - p.n[1] * q.d) / det, (p.n[0] * q.d - p.d * q.n[0]) / det];
}
/** The circle tangent to three lines, inside all three. */
function incircle(l: readonly [Line, Line, Line]): { c: InPlane; r: number } {
  // n_i . c - r = d_i, three equations in (cx, ct, r), by Cramer.
  const m = l.map((x) => [x.n[0], x.n[1], -1] as const);
  const d = l.map((x) => x.d);
  const det3 = (a: ReadonlyArray<readonly [number, number, number]>) =>
    a[0]![0] * (a[1]![1] * a[2]![2] - a[1]![2] * a[2]![1]) -
    a[0]![1] * (a[1]![0] * a[2]![2] - a[1]![2] * a[2]![0]) +
    a[0]![2] * (a[1]![0] * a[2]![1] - a[1]![1] * a[2]![0]);
  const D = det3(m);
  const col = (j: number) =>
    m.map((row, i) => row.map((v, jj) => (jj === j ? d[i]! : v)) as unknown as readonly [
      number,
      number,
      number,
    ]);
  return { c: [det3(col(0)) / D, det3(col(1)) / D], r: det3(col(2)) / D };
}

/** One arcade opening: its head's edge, the plates beside its head, and its radius. */
interface Opening {
  readonly head: InPlane[];
  readonly plates: InPlane[][];
  readonly radius: number;
}

/**
 * The opening between montants k and k + 1: its head is the circle tangent
 * to both montants' faces and to what is above (the arcade chord's
 * underside, or b's face). Each spandrel beside it is the region between a
 * montant, that line and the circle; seen from the corner where the two
 * lines meet, the circle shows exactly the arc between their tangent
 * points, so a fan of triangles from the corner over that arc fills the
 * spandrel and nothing of the opening.
 */
function opening(k: number): Opening {
  const p0 = phiOf(k);
  const p1 = phiOf(k + 1);
  const left: Line = { n: [Math.cos(p0), -Math.sin(p0)], d: MONTANT };
  const right: Line = { n: [-Math.cos(p1), Math.sin(p1)], d: MONTANT };
  const top: Line =
    k < TO_MEMBRURE
      ? { n: [0, -1], d: -(T_M - MEMBRURE) }
      : { n: [-Math.sin(PHI_H), -Math.cos(PHI_H)], d: -D_BF };
  const { c, r } = incircle([left, right, top]);
  const ang = (l: Line) => Math.atan2(-l.n[1], -l.n[0]);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const a0 = ang(left);
  const a1 = a0 + wrap(ang(top) - a0);
  const a2 = a1 + wrap(ang(right) - a1);
  const at = (a: number): InPlane => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  // The heads spring clear of the band; a head the extrados cut would need
  // the plate down to it, which this does not build.
  for (const a of [a0, a2]) {
    if (Math.hypot(...at(a)) < R_OUT) {
      throw new Error(
        `firstFloor: opening ${k}|${k + 1}'s head springs inside the extrados; a head cut by the band is not built — check the montant pitch or the arcade chord's height`,
      );
    }
  }
  const half = HEAD_SEGMENTS / 2;
  const arc = (from: number, to: number) =>
    Array.from({ length: half + 1 }, (_, i) => at(from + ((to - from) * i) / half));
  const toTop = arc(a0, a1);
  const fromTop = arc(a1, a2);
  const fan = (corner: InPlane, pts: InPlane[]) =>
    pts.slice(1).map((q, i) => [corner, pts[i]!, q]);
  return {
    head: [...toTop, ...fromTop.slice(1)],
    plates: [...fan(meet(left, top), toTop), ...fan(meet(right, top), fromTop)],
    radius: r,
  };
}

/** The solid plates at the crown, between montants k and k + 1 for k < OPEN_FROM. */
function crownPlates(): InPlane[][] {
  const topAt = (phi: number) => polar((T_M - MEMBRURE) / Math.cos(phi), phi);
  const out: InPlane[][] = [];
  for (let k = 1; k < OPEN_FROM; k++) {
    const p0 = phiOf(k);
    const p1 = phiOf(k + 1);
    out.push([polar(R_OUT, p0), polar(R_OUT, p1), topAt(p1), topAt(p0)]);
  }
  // Past the last opening, the sliver between montant 11, the extrados and b.
  const last = phiOf(OPEN_TO + 1);
  const meetsB = PHI_H - Math.acos(D_BF / R_OUT);
  out.push([polar(R_OUT, last), polar(toB(last), last), polar(R_OUT, meetsB)]);
  return out;
}

/** Every opening's head radius, for the checks. */
export function arcadeOpenings(): Array<{ k: number; radius: number }> {
  const out: Array<{ k: number; radius: number }> = [];
  for (let k = OPEN_FROM; k <= OPEN_TO; k++) out.push({ k, radius: opening(k).radius });
  return out;
}

/** The arch's parts in one plane, right half and mirror, as in-plane paths. */
function archHalves(): {
  chords: InPlane[][];
  montants: InPlane[][];
  heads: InPlane[][];
  fans: InPlane[][];
  plates: InPlane[][];
} {
  const both = (paths: InPlane[][]) => [...paths, ...paths.map((p) => p.map(mirror))];
  const opens = Array.from({ length: OPEN_TO - OPEN_FROM + 1 }, (_, i) => opening(OPEN_FROM + i));
  const fans = Array.from({ length: MONTANTS - 1 }, (_, i) => fan(i + 1)).flat();
  const right = Array.from({ length: MONTANTS - 1 }, (_, i) => montantPieces(i + 2)).flat();
  return {
    chords: both([intradosAxis(), extradosAxis()]),
    // Montant 1 stands on the axis, once.
    montants: [...montantPieces(1), ...both(right)],
    heads: both(opens.map((o) => o.head)),
    fans: both(fans),
    plates: both([...crownPlates(), ...opens.flatMap((o) => o.plates)]),
  };
}

// ----------------------------------------------------------- the members

/** Members along each path's segments, all in one plane. */
function along(paths: ReadonlyArray<ReadonlyArray<Vec3>>, n: Vec3): Member[] {
  return paths.flatMap((p) => p.slice(1).map((b, i) => ({ a: p[i]!, b, n })));
}

/**
 * Explicit two-point members as paths, each carrying its plane's normal as
 * the primitive `FACE_NORMAL` every edge rule writes, so the toolkit's
 * copy, skin, strut and rivet rules run on them unchanged.
 */
function members(g: Graph, id: string, list: readonly Member[]): NodeHandle {
  if (list.length === 0) throw new Error(`firstFloor: member set "${id}" is empty`);
  const pts = list.flatMap((m) => [m.a, m.b]);
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
  // Points 2i and 2i + 1 are member i: an i32 truncates index / 2.
  const key = g.add(setAttribute, { name: "member", type: "i32", value: mul(index(), 0.5) }, `${id}Key`);
  const paths = g.add(pointsToPath, { groupAttr: "member" }, `${id}Paths`);
  const faces = g.add(
    setAttribute,
    {
      name: FACE_NORMAL,
      domain: "primitive",
      type: "f32",
      tupleSize: 3,
      value: vec(
        indexTable(list.map((m) => m.n[0])),
        indexTable(list.map((m) => m.n[1])),
        indexTable(list.map((m) => m.n[2])),
      ),
    },
    `${id}Faces`,
  );
  const done = g.add(removeAttribute, { names: ["member"], domain: "point" }, id);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", paths, "in");
  g.connect(paths, "out", faces, "in");
  g.connect(faces, "out", done, "in");
  return done;
}

/** Closed outlines, copied onto the four faces, then extruded into plates. */
function plates(g: Graph, id: string, outlines: readonly Vec3[][], quads: NodeHandle): NodeHandle {
  // Drop repeated corners (a head tangent to the line above meets it in a point).
  const clean = outlines
    .map((o) => o.filter((p, i) => i === 0 || Math.hypot(p[0] - o[i - 1]![0], p[1] - o[i - 1]![1], p[2] - o[i - 1]![2]) > 1e-4))
    .map((o) => {
      const f = o[0]!;
      const l = o[o.length - 1]!;
      return Math.hypot(f[0] - l[0], f[1] - l[1], f[2] - l[2]) > 1e-4 ? o : o.slice(0, -1);
    })
    .filter((o) => o.length >= 3);
  const pts = clean.flat();
  const which = clean.flatMap((o, i) => o.map(() => i));
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
  const key = g.add(setAttribute, { name: "plate", type: "i32", value: indexTable(which) }, `${id}Key`);
  const paths = g.add(pointsToPath, { groupAttr: "plate", closed: true }, `${id}Paths`);
  const bare = g.add(removeAttribute, { names: ["plate"], domain: "point" }, `${id}Bare`);
  g.connect(slots, "out", place, "in");
  g.connect(place, "out", key, "in");
  g.connect(key, "out", paths, "in");
  g.connect(paths, "out", bare, "in");
  const four = copyToQuadrants(g, `${id}4`, bare, quads);
  const solid = g.add(
    extrudePolygon,
    { direction: "polygonNormal", distance: PLATE, caps: "both" },
    `${id}Solid`,
  );
  // As for the platforms' prisms: the extrusion's reporting normal goes.
  const out = g.add(removeAttribute, { names: ["normal"], domain: "point" }, id);
  g.connect(four, "out", solid, "in");
  g.connect(solid, "out", out, "in");
  return out;
}

/** The two planes: the face (the outer arch and girders) and 15.00 inboard. */
const PLANES = [
  { dz: 0, decorated: 1 },
  { dz: INNER_OFFSET, decorated: -1 },
] as const;

/** The arch in both planes, as member lists and plate outlines. */
function arches(): {
  chords: Member[];
  montants: Member[];
  heads: Member[];
  fans: Member[];
  bracket: Member[];
  plates: Vec3[][];
  piers: Vec3[];
} {
  const h = archHalves();
  const out = {
    chords: [] as Member[],
    montants: [] as Member[],
    heads: [] as Member[],
    fans: [] as Member[],
    bracket: [] as Member[],
    plates: [] as Vec3[][],
    piers: [] as Vec3[],
  };
  for (const { dz, decorated } of PLANES) {
    const at = (p: InPlane) => fromPlane(p, dz);
    // The decorated side: plates and fans lie against the montants' faces.
    const off = (p: InPlane): Vec3 => {
      const q = at(p);
      const o = decorated * PLATE_OFFSET;
      return [q[0] + o * N4[0], q[1] + o * N4[1], q[2] + o * N4[2]];
    };
    out.chords.push(...along(h.chords.map((p) => p.map(at)), N4));
    out.montants.push(...along(h.montants.map((p) => p.map(at)), N4));
    out.heads.push(...along(h.heads.map((p) => p.map(off)), N4));
    out.fans.push(...along(h.fans.map((p) => p.map(off)), N4));
    // Wound so each plate's own normal points away from the montants: the
    // extrusion then thickens it outward from their faces, never into them.
    const area = (p: InPlane[]) =>
      p.reduce((s, q, i) => {
        const n = p[(i + 1) % p.length]!;
        return s + q[0] * n[1] - n[0] * q[1];
      }, 0);
    out.plates.push(
      ...h.plates.map((p) => (area(p) > 0 === decorated > 0 ? p : [...p].reverse()).map(off)),
    );
    for (const side of [1, -1]) {
      const b = (y: number) => onFace(side * profileAt(y).inner, y, dz);
      const arch = (y: number) => onFace(side * lowerArchX(y), y, dz);
      const [hi, lo] = BRACKET_TIES;
      out.bracket.push(
        { a: arch(hi), b: b(hi), n: N4 },
        { a: arch(lo), b: b(lo), n: N4 },
        { a: arch(hi), b: b(lo), n: N4 },
        { a: b(hi), b: arch(lo), n: N4 },
        { a: b(lo), b: arch(BRACKET_FOOT), n: N4 },
      );
      // Centred under the arch's landing: the pier is upright, the face leans.
      const foot = onFace(side * lowerArchX(PIER_TOP), PIER_TOP, dz);
      out.piers.push([foot[0], PIER_TOP / 2, foot[2]]);
    }
  }
  return out;
}

// ------------------------------------------------------------ the girders

/** The grande poutre and the decorative girder, in both planes. */
function girders(): {
  mainChords: Member[];
  membrure: Member[];
  decoTop: Member[];
  posts: Member[];
  endPosts: Member[];
  bars: Member[];
  fillets: Member[];
} {
  const out = {
    mainChords: [] as Member[],
    membrure: [] as Member[],
    decoTop: [] as Member[],
    posts: [] as Member[],
    endPosts: [] as Member[],
    bars: [] as Member[],
    fillets: [] as Member[],
  };
  const inner = (y: number) => profileAt(y).inner;
  // The grande poutre's chords hang inside the node lines.
  const cos5 = 1 / Math.hypot(1, N5[1] / N5[2]);
  const top = node("XXIII").y - MAIN_CHORD * cos5;
  const bot = node("XXIV").y + MAIN_CHORD * cos5;
  const posts = Array.from({ length: 9 }, (_, i) => (i - 4) * BAY);
  const lastPost = posts[8]!;
  // The decorative girder: the membrure's axis on 43.40, the top chord under 50.40.
  const dBot = FIRST_FLOOR.decorativeBottomY;
  const dTop = node("XXIV").y - DECO_TOP * COS;
  const decoPosts = Array.from({ length: 11 }, (_, i) => (i - 5) * BAY);
  // The outer posts stop at b's face: the diagonals where their axis meets
  // it, the post itself where its inner corner does, so no notch shows.
  const outerPost = decoPosts[10]!;
  const bFaceAt = (x: number) => node("XXIV").y - (x + UPRIGHT_FACE - node("XXIV").inner) / SLOPE;
  const yShort = bFaceAt(outerPost);
  const yShortPost = bFaceAt(outerPost - END_POST);
  // Posts run between the chords' faces, so none of their seams is buried.
  const postBot = bot + MAIN_CHORD * cos5;
  const postTop = top - MAIN_CHORD * cos5;
  const decoBot = dBot + MEMBRURE * COS;
  const decoTop = dTop - DECO_TOP * COS;
  for (const { dz } of PLANES) {
    const p = (x: number, y: number) => onFace(x, y, dz);
    const chord = (y: number) => ({ a: p(-inner(y), y), b: p(inner(y), y) });
    out.mainChords.push({ ...chord(top), n: N5 }, { ...chord(bot), n: N5 });
    for (const x of posts) {
      const list = Math.abs(x) === lastPost ? out.endPosts : out.posts;
      list.push({ a: p(x, postBot), b: p(x, postTop), n: N5 });
    }
    for (const s of [1, -1]) {
      // A diagonal per bay falling toward the axis.
      const xs = [0, ...posts.filter((x) => x > 0)].map((x) => s * x);
      for (let i = 0; i + 1 < xs.length; i++) {
        out.bars.push({ a: p(xs[i + 1]!, top), b: p(xs[i]!, bot), n: N5 });
      }
      // The end bay's leaves b a third of the way down [estimated, PL-VII].
      const yb = top - (top - bot) / 3;
      out.bars.push({ a: p(s * inner(yb), yb), b: p(s * lastPost, bot), n: N5 });
      // The second set crosses each post at mid-height, rising toward the axis.
      for (const x of posts.filter((x) => x > 0)) {
        const at = s * x;
        out.bars.push({ a: p(at + (s * BAY) / 2, bot), b: p(at - (s * BAY) / 2, top), n: N5 });
      }
    }
    // On the axis post the two sets make an X.
    out.bars.push(
      { a: p(BAY / 2, bot), b: p(-BAY / 2, top), n: N5 },
      { a: p(-BAY / 2, bot), b: p(BAY / 2, top), n: N5 },
    );

    // The decorative girder.
    out.membrure.push({ ...chord(dBot), n: N4 });
    out.decoTop.push({ ...chord(dTop), n: N4 });
    for (const x of decoPosts) {
      if (Math.abs(x) === outerPost) {
        out.endPosts.push({ a: p(x, decoBot), b: p(x, yShortPost), n: N4 });
      } else {
        out.posts.push({ a: p(x, decoBot), b: p(x, decoTop), n: N4 });
      }
    }
    for (let i = 0; i + 1 < decoPosts.length; i++) {
      const x0 = decoPosts[i]!;
      const x1 = decoPosts[i + 1]!;
      const t0 = Math.abs(x0) === outerPost ? yShort : dTop;
      const t1 = Math.abs(x1) === outerPost ? yShort : dTop;
      out.bars.push({ a: p(x0, dBot), b: p(x1, t1), n: N4 }, { a: p(x0, t0), b: p(x1, dBot), n: N4 });
    }
    // The rounded top corner at b: tangent to the top chord and to b's face.
    const tTop = planeT(dTop);
    const ct = tTop - FILLET_R;
    const cx = (D_BF - FILLET_R - Math.cos(PHI_H) * ct) / Math.sin(PHI_H);
    const a0 = Math.PI / 2;
    const a1 = Math.PI / 2 - PHI_H;
    const arc = Array.from({ length: FILLET_SEGMENTS + 1 }, (_, i): InPlane => {
      const a = a0 + ((a1 - a0) * i) / FILLET_SEGMENTS;
      return [cx + FILLET_R * Math.cos(a), ct + FILLET_R * Math.sin(a)];
    });
    for (const path of [arc, arc.map(mirror)]) {
      out.fillets.push(...along([path.map((q) => fromPlane(q, dz))], N4));
    }
  }
  return out;
}

/** The frames and bracing between the two planes. */
function entretoises(): { cross: Member[]; diagonals: Member[] } {
  const cross: Member[] = [];
  const diagonals: Member[] = [];
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  /** A frame joining the planes along a member from `lo` to `hi` (outer plane). */
  const frame = (lo: Vec3, hi: Vec3, bottom = true) => {
    const d: Vec3 = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const n = unit([d[1], -d[0], 0]);
    const inb = (q: Vec3): Vec3 => [q[0], q[1], q[2] - INNER_OFFSET];
    if (bottom) cross.push({ a: lo, b: inb(lo), n });
    cross.push({ a: hi, b: inb(hi), n });
    diagonals.push({ a: lo, b: inb(hi), n }, { a: hi, b: inb(lo), n });
  };
  // ABCD and AEFD, from the intrados member's axis to the arcade chord's.
  const dBot = FIRST_FLOOR.decorativeBottomY;
  const foot1 = fromPlane(polar(R_IN + ARCH_CHORD, 0));
  frame(foot1, onFace(0, dBot));
  for (const s of [1, -1]) {
    const [a, b] = montant(TO_MEMBRURE);
    frame(fromPlane(s > 0 ? a : mirror(a)), fromPlane(s > 0 ? b : mirror(b)));
  }
  // GHIJ across the decorative girders, and the X bracing between them.
  const dTop = node("XXIV").y - DECO_TOP * COS;
  for (const x of GHIJ) frame(onFace(x, dBot), onFace(x, dTop), x !== 0);
  for (let i = 0; i + 1 < GHIJ.length; i++) {
    for (const y of [dBot, dTop]) {
      const a = onFace(GHIJ[i]!, y);
      const b = onFace(GHIJ[i + 1]!, y);
      diagonals.push(
        { a, b: [b[0], b[1], b[2] - INNER_OFFSET], n: [0, 1, 0] },
        { a: [a[0], a[1], a[2] - INNER_OFFSET], b, n: [0, 1, 0] },
      );
    }
  }
  return { cross, diagonals };
}

/** The 2nd floor between the legs, face plane only: panel 10's band and X, panel 11. */
function secondFloor(): {
  chords10: Member[];
  lattice10: Member[];
  web10: Member[];
  chords11: Member[];
  posts11: Member[];
  lattice11: Member[];
} {
  const inner = (y: number) => profileAt(y).inner;
  const p = (x: number, y: number) => onFace(x, y, 0);
  const s10 = N10[1] / N10[2];
  const yA = node("XIX").y;
  const yB = yA + BAND10_DEPTH / Math.hypot(1, s10);
  const yC = node("XVIII").y;
  const yD = node("XVII").y;
  const chord = (y: number, n: Vec3): Member => ({ a: p(-inner(y), y), b: p(inner(y), y), n });

  // The lintel band: bars at 45 degrees in the plane, clipped to b's axis.
  const lattice10: Member[] = [];
  const span = inner(yA) + BAND10_DEPTH;
  const count = Math.ceil(span / BAND10_PITCH);
  for (let j = -count; j <= count; j++) {
    for (const dir of [1, -1]) {
      const c = j * BAND10_PITCH;
      // x(s) = c + dir D s, y(s) = yA + (yB - yA) s; keep |x| <= inner(y).
      const xAt = (s: number) => c + dir * BAND10_DEPTH * s;
      const yAt = (s: number) => yA + (yB - yA) * s;
      let lo = 0;
      let hi = 1;
      // Both limits are linear in s: bisect each crossing.
      const inside = (s: number) => Math.abs(xAt(s)) <= inner(yAt(s));
      const cross = (a: number, b: number) => {
        for (let i = 0; i < 50; i++) {
          const m = (a + b) / 2;
          if (inside(m) === inside(a)) a = m;
          else b = m;
        }
        return (a + b) / 2;
      };
      if (!inside(0) && !inside(1)) continue;
      if (!inside(0)) lo = cross(0, 1);
      if (!inside(1)) hi = cross(0, 1);
      const len = (hi - lo) * Math.hypot(BAND10_DEPTH, yB - yA);
      if (len < 0.3) continue;
      lattice10.push({ a: p(xAt(lo), yAt(lo)), b: p(xAt(hi), yAt(hi)), n: N10 });
    }
  }

  // Above the band: a post on the axis and an X each side.
  const web10: Member[] = [{ a: p(0, yB), b: p(0, yC), n: N10 }];
  for (const s of [1, -1]) {
    web10.push(
      { a: p(s * inner(yB), yB), b: p(0, yC), n: N10 },
      { a: p(0, yB), b: p(s * inner(yC), yC), n: N10 },
    );
  }

  // Panel 11: posts on the axis and at 3.36268, a diamond lattice crossing
  // at the posts' mid-heights and meeting the chords at mid-bay.
  const yM = (yC + yD) / 2;
  const posts11: Member[] = [-PANEL11_POST, 0, PANEL11_POST].map((x) => ({
    a: p(x, yC),
    b: p(x, yD),
    n: N11,
  }));
  const lattice11: Member[] = [];
  const midBays = (y: number) => [
    -(PANEL11_POST + inner(y)) / 2,
    -PANEL11_POST / 2,
    PANEL11_POST / 2,
    (PANEL11_POST + inner(y)) / 2,
  ];
  const [bLo, bHi] = [midBays(yC), midBays(yD)];
  const hubs = [-inner(yM), -PANEL11_POST, 0, PANEL11_POST, inner(yM)];
  hubs.forEach((x, i) => {
    const hub = p(x, yM);
    // Hub i sits between mid-bays i - 1 and i.
    for (const m of [i - 1, i]) {
      if (m < 0 || m > 3) continue;
      lattice11.push(
        { a: p(bLo[m]!, yC), b: hub, n: N11 },
        { a: hub, b: p(bHi[m]!, yD), n: N11 },
      );
    }
  });

  return {
    chords10: [chord(yA, N10), chord(yB, N10)],
    lattice10,
    web10,
    chords11: [chord(yC, N11), chord(yD, N11)],
    posts11,
    lattice11,
  };
}

// ------------------------------------------------------------- assembly

/** Build the between-leg girders, the arches and the 2nd floor's bands on all four faces. */
export function buildFirstFloor(g: Graph, quads: NodeHandle, detail: Detail = {}): Parts {
  const riveted = detail.rivets === true;
  const four = (id: string, list: readonly Member[]) =>
    copyMembersToQuadrants(g, `${id}4`, members(g, id, list), quads);
  const up = attribute(FACE_NORMAL, 3);
  const rivets: Array<{ name: string; spawn: NodeHandle }> = [];
  /** Solid members, with seam rows when riveted. */
  const solid = (id: string, paths: NodeHandle, half: number, seams: string | null) => {
    if (riveted && seams !== null) {
      rivets.push({ name: seams, spawn: seamRivets(g, id, paths, half, up, SEAMS) });
    }
    return faceSkin(g, id, paths, half);
  };

  const gd = girders();
  const ar = arches();
  const en = entretoises();
  const sf = secondFloor();

  const mainChords = four("ffMainChords", gd.mainChords);
  const membrure = four("ffMembrure", gd.membrure);
  const decoTop = four("ffDecoTop", gd.decoTop);
  const posts = four("ffPosts", gd.posts);
  const endPosts = four("ffEndPosts", gd.endPosts);
  const fillets = four("ffFillets", gd.fillets);
  const web = webMembers(g, "ffWeb", four("ffBars", gd.bars), GIRDER_WEB, detail);
  const cross = webMembers(g, "ffEntretoise", four("ffCross", en.cross), ENTRETOISE_WEB, detail);
  const web10 = webMembers(g, "ffPanel10", four("ffWeb10", sf.web10), PANEL10_WEB, detail);

  const girderMeshes = [
    solid("ffMainChord", mainChords, MAIN_CHORD, "ff.girders.main"),
    solid("ffMembrureChord", membrure, MEMBRURE, "ff.girders.membrure"),
    solid("ffDecoTopChord", decoTop, DECO_TOP, "ff.girders.decoTop"),
    solid("ffPost", posts, POST, "ff.girders.posts"),
    solid("ffEndPost", endPosts, END_POST, "ff.girders.endPosts"),
    solid("ffFillet", fillets, FILLET_BAR, null),
    ...web.meshes,
    ...cross.meshes,
    solid("ffEntretoiseBars", four("ffDiagonals", en.diagonals), ENTRETOISE_BAR, null),
    solid("ffBand10Chords", four("ffChords10", sf.chords10), BAND10_CHORD, "ff.second.band"),
    solid("ffBand10Bars", four("ffLattice10", sf.lattice10), BAND10_BAR, null),
    ...web10.meshes,
    solid("ffPanel11Chords", four("ffChords11", sf.chords11), PANEL11_CHORD, "ff.second.chords"),
    solid("ffPanel11Posts", four("ffPosts11", sf.posts11), PANEL11_POST_BAR, null),
    solid("ffPanel11Bars", four("ffLattice11", sf.lattice11), PANEL11_BAR, null),
  ];
  rivets.push(
    ...rivetOutputs({ "ff.girders.web": web, "ff.entretoises": cross, "ff.second.web": web10 }),
  );

  const archMeshes = [
    solid("ffArchChords", four("ffArchChordPaths", ar.chords), ARCH_CHORD, "ff.arches.chords"),
    solid("ffMontants", four("ffMontantPaths", ar.montants), MONTANT, "ff.arches.montants"),
    solid("ffHeads", four("ffHeadPaths", ar.heads), HEAD_EDGE, null),
    solid("ffFans", four("ffFanPaths", ar.fans), FAN_BAR, null),
    solid("ffBracket", four("ffBracketPaths", ar.bracket), BRACKET_BAR, null),
    plates(g, "ffArcadePlates", ar.plates, quads),
  ];

  // The piers, from the ground to the arch, at the pedestals' inner edges.
  if (PEDESTAL.height >= PIER_TOP) {
    throw new Error(
      `firstFloor: the arch's pier top (${PIER_TOP}) must rise above the ${PEDESTAL.height} m pedestal it stands against`,
    );
  }
  const piers = ar.piers.map((c, i) => box(g, `ffPier${i}`, c, [PIER_SIDE, PIER_TOP, PIER_SIDE]));
  const pierFour = copyToQuadrants(g, "ffPiers4", merge(g, "ffPiers", piers), quads);

  return {
    girders: girderMeshes,
    arches: archMeshes,
    masonry: [pierFour],
    rivets,
  };
}
