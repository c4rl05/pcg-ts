/**
 * The girders between the legs, and the four decorative arches.
 *
 * Everything here lies in a tower FACE PLANE — the inclined plane through
 * the side uprights b and d of the two legs that share the face — and is
 * built once, on the +z face, then copied onto the other three. On that
 * face the two legs' side uprights stand at x = ±inner(y), z = outer(y),
 * straight within each panel, so every point below is (x, y, outer(y))
 * with inner and outer read off the node table. From the ground up:
 *
 * - THE ARCH ("arc décoratif"), non-structural: a circle in the face
 *   plane, radius 36.4064, intrados crown 39.40 above the ground, band
 *   2.5488 deep in the plane [sourced PL-I, PL-VII, PL-XI]. The plate
 *   prints two more radii, 40.32 and 44.53, but which segment each
 *   governs is only estimated, so this is the single-circle
 *   simplification [estimated]. An in-plane height t maps to a height
 *   y = y_c + t cos(a), a being the face's lean in panels 1-4, which puts
 *   the centre at y_c = 39.40 - 36.4064 cos(a) = 6.87 [derived]. The
 *   circle never quite reaches b's axis: the horizontal gap between them
 *   is least, 1.10 m, where the circle runs PARALLEL to b, at
 *   tan(phi) = 1 / sin(a), phi = 65.8 deg, y = 20.2 [derived] — so the
 *   band straddles the upright there, which is the plate's "assemblage de
 *   l'arc avec l'arbalétrier". That tangent point is the haunch. Below it
 *   each arch leg runs straight down beside b, parallel to it and so
 *   continuing the circle without a kink, to the pedestal top at y = 4
 *   [estimated: an estimated reading gives this stretch to the plate's
 *   44.53 radius, which this straight run stands in for]. Intrados and
 *   extrados are two chains; a Warren zigzag laces them, pitch about one
 *   band depth [estimated], with a tie across each foot.
 * - THE ARCADE, 14 small round-headed openings [sourced count, PL-XI]
 *   between the arch and the girder above: 15 posts evenly spaced along
 *   that girder's bottom chord, each rising from the extrados to the
 *   springing of a semicircular head whose crown touches the chord
 *   [estimated layout].
 * - THE DECORATIVE GIRDER ("poutre de l'arc"): y 43.40 -> 50.40, bottom
 *   45.287, top 38.25 [sourced], in panel 4, the same bay rhythm as the
 *   girder above it [sourced]: the same 9 verticals, so its end bays run
 *   7.11 at the bottom to 3.595 at the top [derived]. It shares that
 *   girder's bottom chord.
 * - THE GRANDE POUTRE DU 1er ÉTAGE: panel 5 deep, node XXIV (y 50.4, span
 *   38.25) to node XXIII (57.4, span 32.6952) [sourced]. Its verticals
 *   stand 3.8825 apart [sourced], 9 of them centred on the face and square
 *   to the chords [estimated], which leaves the 3.595 end bays at the
 *   bottom chord the plate prints [derived: 2 x 3.595 + 8 x 3.8825 =
 *   38.25] and narrows them to 0.82 at the top, where the uprights have
 *   leaned in [derived]. Verticals with X diagonals [sourced drawing], in
 *   every bay, end bays included [estimated]. The legs' own uprights
 *   close each end, so the girder draws no end verticals.
 * - THE 2nd-FLOOR GIRDER between the legs, panel 11: node XVIII (y 110.6)
 *   to node XVII (115.5). [estimated] The spec gives panel 11's girder
 *   belt and its depth but never states explicitly that a girder spans
 *   the face between the legs; this assumes one, laced like the first
 *   floor's, with 4 bays of equal share of the span [estimated].
 *
 *
 * Every girder member is squared to its face. The chords and the web bars
 * are all edge-rule members, so each carries its face's normal
 * (`FACE_NORMAL`); they are copied onto the other faces with
 * `copyMembersToQuadrants`, which turns that normal with them, and skinned
 * from it afterwards. (Skinning before the copy would not do: the copy
 * turns positions, not a sweep's `normal`.) The chord at node XXIV, where
 * the face kinks, is the grande poutre's bottom chord and squares to its
 * face, panel 5's. The chords are plate boxes — the belts' "500 x 10"
 * chord plates [sourced PL-VII], carried over to these girders
 * [estimated] — and the web bars struts that fit inside them (`GIRDER_WEB`).
 *
 * DETAIL, as for the legs. With `lacedWeb` the web bars become laced
 * struts (`webMembers`); with `rivets` those struts carry their lacing
 * rivets, and every chord carries seam rows along its corner angles.
 *
 * A lattice whose stations fall on no regular section — posts at fixed x
 * between uprights that lean, points along a circle — is placed here from
 * explicit positions (`placedLattice`), and the toolkit's edge and chain
 * rules then run on it unchanged.
 */
import { type Graph, type NodeHandle, attribute } from "pcg-ts";
import {
  FACE_NORMAL,
  type Lattice,
  chains,
  copyMembersToQuadrants,
  copyToQuadrants,
  edges,
  type Vec3,
  merge,
  placedLattice,
  skin,
  stationLattice,
} from "./lattice.js";
import type { Detail, Parts } from "./parts.js";
import { ARCH, FIRST_FLOOR, MEMBERS, PEDESTAL, node, profileAt } from "./spec.js";
import { UPRIGHT_SEAMS, faceSkin, rivetOutputs, seamRivets, webMembers } from "./strut.js";

/** A point in the face plane: x across it, t up it from the arch centre. */
type InPlane = readonly [number, number];

/** The girders' vertical spacing [sourced PL-XI]. */
const BAY = 3.8825;
/** Half-width of the arch's intrados and extrados members [estimated]. */
const ARCH_BAND_HALF = 0.3;
/** Spacing of the arch's zigzag along the intrados, about one band depth [estimated]. */
const ARCH_PITCH = ARCH.band;
/** Segments per round head of the arcade [estimated: drawing resolution]. */
const HEAD_SEGMENTS = 8;

/**
 * The girders' web bars, as outer half-width by height: 480 mm struts, the
 * room between the two 10 mm plates of a 500 mm chord that the bars are
 * riveted inside [estimated: SOURCES gives the belts' "500 x 10" chord
 * plates and no web section for any first-floor girder]. Laced, that is
 * the legs' 90 mm corner angles on 390 mm centres.
 */
const GIRDER_WEB = [
  [0, 0.24],
  [300, 0.24],
] as const;

/**
 * The chords' seam rows: the uprights' rhythm, a rivet every 0.10 m 55 mm
 * in from each corner (strut.ts) [estimated: no source gives the chords'].
 */
const CHORD_SEAMS = UPRIGHT_SEAMS;

/**
 * A rivet head's radius: strut.ts's (38 mm across for a 22 mm rivet
 * [estimated]), which that module does not export.
 */
const RIVET_HEAD = 0.019;

/**
 * The face's lean in panels 1-4, horizontal per vertical, from the node
 * table's own ends (0.50269) [derived]. The arch, the arcade and the
 * decorative girder all lie in this stretch of the face.
 */
const SLOPE = (node("XXVIII").outer - node("XXIV").outer) / (node("XXIV").y - node("XXVIII").y);
/** cos and sin of that lean: in-plane height to vertical height is cos (0.89346) [derived]. */
const COS = 1 / Math.hypot(1, SLOPE);
const SIN = SLOPE * COS;
/** The arch circle's centre height (6.87) [derived]. */
const CENTRE_Y = ARCH.crownY - ARCH.radius * COS;

/** A point on the +z face at (x, y). */
function onFace(x: number, y: number): Vec3 {
  return [x, y, profileAt(y).outer];
}

/** An in-plane point of the arch's frame on the +z face. */
function fromPlane([x, t]: InPlane): Vec3 {
  return onFace(x, CENTRE_Y + t * COS);
}

/** The in-plane height of a world height. */
function planeT(y: number): number {
  return (y - CENTRE_Y) / COS;
}

/** A girder level: its height and the face-plane numbers there. */
interface GirderLevel {
  readonly y: number;
  readonly inner: number;
  readonly outer: number;
}

/**
 * The two chords of a first-floor girder as station rows: each upright's
 * axis, and the 9 verticals BAY apart between them.
 */
function girderRows(bottom: GirderLevel, top: GirderLevel): Vec3[][] {
  const count = FIRST_FLOOR.mainBays - 1;
  const posts = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * BAY);
  const row = (l: GirderLevel): Vec3[] =>
    [-l.inner, ...posts, l.inner].map((x): Vec3 => [x, l.y, l.outer]);
  return [row(bottom), row(top)];
}

/** A girder's members, split by section: chords, and verticals with X bars. */
function girderMembers(
  lat: Lattice,
  chordLevels: readonly number[],
): { chords: NodeHandle; bars: NodeHandle } {
  const last = lat.ringSize - 1;
  return {
    // One straight member from upright to upright per chord.
    chords: edges(lat, "Chords", last, 0, (s, k) => s === 0 && chordLevels.includes(k)),
    bars: merge(lat.g, `${lat.id}Bars`, [
      // Verticals, except at the ends, where the legs' uprights already are.
      edges(lat, "Posts", 0, 1, (s) => s !== 0 && s !== last),
      edges(lat, "XA", 1, 1),
      edges(lat, "XB", -1, 1),
    ]),
  };
}

/** A box section's four corners in ring order, as (sN, sB) sign pairs. */
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/**
 * The right half of the arch, crown to foot, as in-plane (intrados,
 * extrados) pairs; the left half is its mirror.
 */
function archHalf(): Array<readonly [InPlane, InPlane]> {
  const r = ARCH.radius;
  const rb = r + ARCH.band;
  // The haunch: where the circle runs parallel to b [derived].
  const phiH = Math.atan(1 / SIN);
  const out: Array<readonly [InPlane, InPlane]> = [];
  const nArc = Math.ceil((r * phiH) / ARCH_PITCH);
  for (let i = 0; i <= nArc; i++) {
    const phi = (phiH * i) / nArc;
    out.push([
      [r * Math.sin(phi), r * Math.cos(phi)],
      [rb * Math.sin(phi), rb * Math.cos(phi)],
    ]);
  }
  // The leg: from the haunch, parallel to b (direction (sin a, -1) in the
  // plane), down to the pedestal top. Its extrados is the band's normal
  // offset, except the last, cut level at the foot.
  const len = Math.hypot(1, SIN);
  const dir: InPlane = [SIN / len, -1 / len];
  const nrm: InPlane = [1 / len, SIN / len];
  const hx = r * Math.sin(phiH);
  const ht = r * Math.cos(phiH);
  const tFoot = planeT(PEDESTAL.height);
  const run = (ht - tFoot) * len;
  const nLeg = Math.ceil(run / ARCH_PITCH);
  for (let i = 1; i <= nLeg; i++) {
    const tau = (run * i) / nLeg;
    const inner: InPlane = [hx + tau * dir[0], ht + tau * dir[1]];
    const outer: InPlane =
      i === nLeg
        ? [inner[0] + ARCH.band * len, inner[1]]
        : [inner[0] + ARCH.band * nrm[0], inner[1] + ARCH.band * nrm[1]];
    out.push([inner, outer]);
  }
  return out;
}

/** The whole arch, foot to foot, as station rows (intrados, extrados). */
function archRows(): Vec3[][] {
  const right = archHalf();
  const mirror = ([x, t]: InPlane): InPlane => [-x, t];
  const left = right
    .slice(1)
    .reverse()
    .map(([i, e]) => [mirror(i), mirror(e)] as const);
  return [...left, ...right].map(([i, e]) => [fromPlane(i), fromPlane(e)]);
}

/** The arch, its lattice, and the arcade over it. */
function buildArch(g: Graph): { band: NodeHandle; web: NodeHandle } {
  const lat = placedLattice(g, "ffArch", archRows());
  const K = lat.levelCount;
  const band = chains(lat, "Band");
  const lacing = [
    edges(lat, "Zig", 1, 1, (_s, k) => k % 2 === 0),
    edges(lat, "Zag", -1, 1, (_s, k) => k % 2 === 1),
    edges(lat, "Ties", 1, 0, (_s, k) => k === 0 || k === K - 1),
  ];

  // The arcade, under the decorative girder's bottom chord.
  const chordY = FIRST_FLOOR.decorativeBottomY;
  const half = profileAt(chordY).inner;
  const openings = FIRST_FLOOR.arcadeOpenings;
  const pitch = (2 * half) / openings;
  const headR = pitch / 2;
  const springT = planeT(chordY) - headR;
  const rb = ARCH.radius + ARCH.band;
  const reach = rb * Math.sin(Math.atan(1 / SIN));
  const xs = Array.from({ length: openings + 1 }, (_, j) => -half + j * pitch);
  const feet = xs.map((x): Vec3 => {
    if (Math.abs(x) > reach) {
      throw new Error(
        `firstFloor: arcade post at x = ${x.toFixed(3)} lands past the arch's haunch (|x| <= ${reach.toFixed(3)}); fewer or narrower openings would keep it on the circle`,
      );
    }
    return fromPlane([x, Math.sqrt(rb * rb - x * x)]);
  });
  if (feet.some((p) => p[1] >= CENTRE_Y + springT * COS)) {
    throw new Error("firstFloor: an arcade post's foot is above its springing; shrink the heads");
  }
  const posts = placedLattice(g, "ffArcadePosts", [
    feet,
    xs.map((x) => fromPlane([x, springT])),
  ]);
  const heads = placedLattice(
    g,
    "ffArcadeHeads",
    Array.from({ length: HEAD_SEGMENTS + 1 }, (_, k) => {
      const theta = Math.PI * (1 - k / HEAD_SEGMENTS);
      return Array.from({ length: openings }, (_, j) =>
        fromPlane([
          -half + (j + 0.5) * pitch + headR * Math.cos(theta),
          springT + headR * Math.sin(theta),
        ]),
      );
    }),
  );
  return {
    band,
    web: merge(g, "ffArchWeb", [
      ...lacing,
      edges(posts, "Posts", 0, 1),
      chains(heads, "Heads"),
    ]),
  };
}

/** Build the between-leg girders and the arches on all four faces. */
export function buildFirstFloor(g: Graph, quads: NodeHandle, detail: Detail = {}): Parts {
  // The grande poutre, panel 5.
  const main = girderMembers(
    placedLattice(g, "ffMain", girderRows(node("XXIV"), node("XXIII"))),
    [0, 1],
  );
  // The decorative girder below it, sharing its bottom chord.
  const decoBottom: GirderLevel = {
    y: FIRST_FLOOR.decorativeBottomY,
    ...profileAt(FIRST_FLOOR.decorativeBottomY),
  };
  const deco = girderMembers(
    placedLattice(g, "ffDeco", girderRows(decoBottom, node("XXIV"))),
    [0],
  );
  // The 2nd-floor girder, panel 11 [estimated: see the header].
  const secondLevels = [node("XVIII"), node("XVII")].map((n) => ({
    y: n.y,
    x0: -n.inner,
    x1: n.inner,
    z0: n.outer,
    z1: n.outer,
  }));
  const second = girderMembers(
    stationLattice(g, {
      id: "ffSecond",
      ring: Array.from({ length: 5 }, (_, i) => [i / 4, 0] as const),
      closed: false,
      levels: secondLevels,
    }),
    [0, 1],
  );
  const arch = buildArch(g);

  const four = (id: string, h: NodeHandle) => copyToQuadrants(g, id, h, quads);
  // Edge-rule members carry their faces' normals, which the copy must turn.
  const fourMembers = (id: string, h: NodeHandle) => copyMembersToQuadrants(g, id, h, quads);
  const chords = fourMembers(
    "ffChords4",
    merge(g, "ffChords", [main.chords, deco.chords, second.chords]),
  );
  const web = webMembers(
    g,
    "ffWeb",
    fourMembers("ffBars4", merge(g, "ffBars", [main.bars, deco.bars, second.bars])),
    GIRDER_WEB,
    detail,
  );
  const rivets = rivetOutputs({ "ff.girders.web": web });
  if (detail.rivets === true) {
    rivets.push({
      name: "ff.girders.seams",
      spawn: seamRivets(
        g,
        "ffChord",
        chords,
        MEMBERS.girderChord,
        attribute(FACE_NORMAL, 3),
        CHORD_SEAMS,
      ),
    });
  }
  return {
    girders: [
      faceSkin(g, "ffChord", chords, MEMBERS.girderChord),
      ...web.meshes,
    ],
    arches: [
      skin(g, "ffArchBandSkin", four("ffArchBand4", arch.band), ARCH_BAND_HALF),
      skin(g, "ffArchWebSkin", four("ffArchWeb4", arch.web), MEMBERS.girderBar),
    ],
    rivets,
  };
}
