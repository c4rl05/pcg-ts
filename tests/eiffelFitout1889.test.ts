/**
 * The Eiffel demo's 1889 fit-out on the 1st floor (`platforms.ts`): the
 * four pavilions' frame and dressing, the arcade's crest, cabochons and
 * gas globes, and the gallery balustrade's stoneware balusters.
 *
 * - the arcades: a crest, 12 cabochons and a gas globe on each of the 36,
 *   9 a face on all four; the palmette's top, the crest standing on the
 *   gable's face and on the crescent's inner rib, every cabochon inside
 *   its crescent, one to a cell, facing out; the globes over the gallery;
 * - the balusters: five in each of the gallery balustrade's 144 intervals,
 *   720 — the plates' rule and the ledger's count, not the text's 560 —
 *   evenly between the base blocks, on the rail's plinth, and nothing else
 *   inside their turned envelope;
 *
 * Held against what the graph COOKS and against the plates' numbers,
 * restated rather than imported, so a change to the module has to be a
 * change here too:
 *
 * - the pavilions: one rule on all four faces, identical under the quarter
 *   turns; the timber screen on the three « en bois apparent » and not on
 *   the Français; each dressing on the face `FACES` names for it, and on
 *   no other; the frame's transom, sill and posts, the terraces'
 *   balustrade and pinnacles, the Russe's clock and finial, the
 *   Français' crest at the plates' heights; nothing in front of the inner
 *   arcade's plane;
 * - the cooked meshes are exactly the solids `fitOutSolids` draws, each
 *   drawing placed on its faces and stations by the plates' own symmetry
 *   (tests/support/eiffelFitout.ts), not by the module's copies;
 * - no other part of the tower reaches inside any of them;
 * - two cooks agree to the bit.
 *
 * Every check that should read zero is first shown to read non-zero on a
 * deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { SAG, circleSegments } from "../demos/eiffel/chord.js";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { BALUSTER, fitOutSolids } from "../demos/eiffel/platforms.js";
import { worldSolids } from "./support/eiffelFitout.js";
import { FACES, FLOORS } from "../demos/eiffel/spec.js";

type V = readonly [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V): V => sc(a, 1 / len(a));

// ------------------------------------------------------------ the numbers

/** Column axis, half PL-I's 70.695 [sourced]. */
const EDGE = 70.695 / 2;
/** The restaurant floor (the platform's) [sourced PL-I]. */
const FLOOR = FLOORS.first;
/** The model's wall head: the arcade's valley gutter, 56.40 + 6.05 [sourced; sum derived]. */
const WALL_HEAD = 56.4 + 6.05;
/** Half a bay, one « entraxe » [sourced]. */
const HALF_BAY = 3.8825;
/** A pavilion: 23.295 along, its gallery front 4.2865 inside the column axis, 14.9975 deep, a 3.35 annex [sourced PL-XXX]. */
const PAV_HALF = 23.295 / 2;
const FRONT = EDGE - 4.2865;
const BACK = FRONT - 14.9975;
const ANNEX = BACK + 3.35;
/** The terraces at 2.95 [sourced text], their balustrade 1.00 [sourced PL-XXIX Fig. 9]. */
const TERRACE_Y = FLOOR + 2.95;
const TERRACE_RAIL = 1.0;
/** The screen: transom at 2.700 [sourced PL-XXX Fig. 5], its beam "200" [sourced], sill 0.60 [sourced PL-XXIX Fig. 11], posts 0.150 [sourced]. */
const TRANSOM = 2.7;
const BEAM = 0.2;
const SILL = 0.6;
const POST = 0.15;
/** The pinnacles' caps top out 6.70 over the floor [measured PL-XXIX Figs 1, 9]. */
const PINNACLE_TOP = 6.7;
/** The lanterns' ridge: eave 7.537 [sourced PL-XXX] + 0.700 rise [sourced PL-XXX Fig. 6]. */
const RIDGE = FLOOR + 7.537 + 0.7;
/** The Russe's finial, 2.60 [sourced PL-XXIX Fig. 9]; its clock 1.25 across [sourced], centred 5.45 up [measured]. */
const FINIAL = 2.6;
const CLOCK_D = 1.25;
const CLOCK_Y = FLOOR + 5.45;
/** The Français' 1889 crest, 8.46 over the floor [measured PL-XXIX Fig. 1], and its ball 0.25 [estimated]. */
const CREST_TOP = FLOOR + 8.46;
/** The inner arcade's plane: the pilasters' inboard face 4.1875 inside the column axis [sourced PL-XIII Fig. 21]. */
const INNER_PLANE = EDGE - 4.1875;

/** The gallery floor, altitude 89.90 [sourced PL-XIX] less the ground's 33.50. */
const GALLERY_Y = 89.9 - 33.5;
/** 9 arcades a face on the 7.765 module [sourced], 36 in all [sourced ledger]. */
const BAY = 7.765;
const ARCADES = 36;
/** 12 cabochons an arcade, one to each cell between the crescent's rays [counted PL-XIX Fig. 1]. */
const CABOCHONS_PER_ARCADE = 12;
/** The palmette's top, 9.97 over the gallery floor [measured PL-XIX Fig. 1 at 60 px/m]. */
const PALMETTE_TOP = 9.97;
/** A cabochon's ring, 0.38 across [measured PL-XIX Fig. 1: 0.40]; the crescent's rays 0.10 wide [platforms.ts GABLE.ray]. */
const RING_R = 0.19;
const RAY_HALF = 0.05;
/**
 * The crescent: the vault's half-ellipse 3.5175 x 2.65 over the 6.05
 * springing [estimated fit; sourced crown 8.70], its outer rib 0.25 deep
 * [estimated]; the inner arc R 3.3675 crowned 6.95 [sourced], its rib 0.20
 * [estimated].
 */
const SPRING = GALLERY_Y + 6.05;
const VAULT_HALF = 3.5175;
const VAULT_RISE = 2.65;
const OUTER_RIB = 0.25;
const INNER_R = 3.3675;
const INNER_CROWN = GALLERY_Y + 6.95;
const INNER_RIB = 0.2;
/** The globes: 1.30 in from the column axis, centred 5.90 up, 0.60 across [estimated]. */
const GLOBE_IN = 1.3;
const GLOBE_Y = GALLERY_Y + 5.9;
const GLOBE_R = 0.3;

/**
 * The balusters: « 5 balustres … dans chaque intervalle de 1.74125 »
 * [sourced PL-XIII Fig. 11], in every interval of every bay [counted
 * PL-XIX Fig. 1]; « Pose des balustres » 720 [sourced ledger p. 217]. The
 * text's « au nombre de 560 » [sourced p. 213] is not the count built.
 * Between base blocks 0.250 (column) and 0.220 (pilaster), 1.50625 clear
 * [sourced]; on the 0.150 plinth, 0.890 tall [sourced]; 0.11 at the bulb
 * [measured PL-XIX].
 */
const PER_INTERVAL = 5;
const LEDGER_SET = 720;
const RAIL_PITCH = 1.74125;
const PIER = BAY / 2 - 0.8 / 2;
const SOCLE = 0.25;
const PILASTER_BASE = 0.22;
const CLEAR = 1.50625;
const PLINTH = 0.15;
const BALUSTER_TALL = 0.89;
const BULB = 0.11;

/** Which face each pavilion is on, by name (never by index). */
const faceOf = (name: (typeof FACES)[number]["pavilion"]) => FACES.find((f) => f.pavilion === name)!;
const FLAMAND = faceOf("Restaurant flamand");
const ANGLO = faceOf("Bar anglo-américain");
const FRANCAIS = faceOf("Restaurant français");
const RUSSE = faceOf("Restaurant russe");

/** A world point in a face's frame: a along the face, y up, r out along its normal. */
function toFace(p: V, f: (typeof FACES)[number]): V {
  const [nx, nz] = f.normal;
  return [p[0] * nz - p[2] * nx, p[1], p[0] * nx + p[2] * nz];
}

// ------------------------------------------------------------ solids

interface Solid {
  readonly pts: readonly V[];
  readonly n: V;
  readonly depth: number;
  readonly inward: readonly V[];
  readonly lo: V;
  readonly hi: V;
}

/** An outline extruded `depth` along its right-hand normal, as a convex solid. */
function solid(outline: readonly V[], depth: number): Solid {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const n = unit([nx, ny, nz]);
  const inward = outline.map((a, i) => unit(cross(n, sub(outline[(i + 1) % outline.length]!, a))));
  const all = [...outline, ...outline.map((p) => add(p, sc(n, depth)))];
  const lo: V = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]!))) as unknown as V;
  const hi: V = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k]!))) as unknown as V;
  return { pts: outline, n, depth, inward, lo, hi };
}

/** All of a solid's corners. */
const corners = (s: Solid): V[] => [...s.pts, ...s.pts.map((p) => add(p, sc(s.n, s.depth)))];

/** Strictly inside, by more than `m` from every face. */
function inside(x: V, s: Solid, m: number): boolean {
  for (let k = 0; k < 3; k++) if (x[k]! < s.lo[k]! + m || x[k]! > s.hi[k]! - m) return false;
  const h = dot(sub(x, s.pts[0]!), s.n);
  if (h <= m || h >= s.depth - m) return false;
  for (let i = 0; i < s.pts.length; i++) if (dot(sub(x, s.pts[i]!), s.inward[i]!) <= m) return false;
  return true;
}

const moved = (s: Solid, d: V): Solid =>
  solid(
    s.pts.map((p) => add(p, d)),
    s.depth,
  );

/** A mesh's polygons, as point lists. */
function polygons(geo: Geometry): V[][] {
  const P = geo.attrs.point.get("P")!.data;
  const out: V[][] = [];
  for (let p = 0; p < geo.primVertexStart.length; p++) {
    const s = geo.primVertexStart[p]!;
    const poly: V[] = [];
    for (let k = 0; k < geo.primVertexCount[p]!; k++) {
      const j = geo.vertexToPoint[s + k]!;
      poly.push([P[3 * j]!, P[3 * j + 1]!, P[3 * j + 2]!]);
    }
    out.push(poly);
  }
  return out;
}

/** Points over a polygon: its corners, along its edges, and over it (a fan), about `step` apart. */
function samples(poly: readonly V[], step: number): V[] {
  const out: V[] = [...poly];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.min(400, Math.ceil(len(sub(b, a)) / step));
    for (let k = 1; k < n; k++) out.push(add(a, sc(sub(b, a), k / n)));
  }
  for (let i = 1; i + 1 < poly.length; i++) {
    const a = poly[0]!;
    const b = poly[i]!;
    const c = poly[i + 1]!;
    const n = Math.min(60, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a))) / step));
    for (let u = 1; u < n; u++) {
      for (let v = 1; u + v < n; v++) out.push(add(a, add(sc(sub(b, a), u / n), sc(sub(c, a), v / n))));
    }
  }
  return out;
}

/** How many of `foreign`'s polygons have a sample inside any of `solids`, by more than `m`; and the first few. */
function intrusions(solids: readonly Solid[], foreign: readonly V[][], m: number): { count: number; first: string[] } {
  const lo: V = [0, 1, 2].map((k) => Math.min(...solids.map((s) => s.lo[k]!))) as unknown as V;
  const hi: V = [0, 1, 2].map((k) => Math.max(...solids.map((s) => s.hi[k]!))) as unknown as V;
  let count = 0;
  const first: string[] = [];
  for (const poly of foreign) {
    const plo = [0, 1, 2].map((k) => Math.min(...poly.map((p) => p[k]!)));
    const phi = [0, 1, 2].map((k) => Math.max(...poly.map((p) => p[k]!)));
    if ([0, 1, 2].some((k) => phi[k]! < lo[k]! || plo[k]! > hi[k]!)) continue;
    const near = solids.filter((s) => [0, 1, 2].every((k) => phi[k]! >= s.lo[k]! && plo[k]! <= s.hi[k]!));
    if (near.length === 0) continue;
    for (const x of samples(poly, 0.05)) {
      if (near.some((s) => inside(x, s, m))) {
        count++;
        if (first.length < 5) first.push(x.map((v) => v.toFixed(3)).join(", "));
        break;
      }
    }
  }
  return { count, first };
}

// ------------------------------------------------------------ the cook

/** The probe nodes `buildPlatforms` cooks the fit-out into, and the solids' name prefixes each holds. */
const PROBES = {
  pavilionDress: ["pavilion.", "francais.", "russe.", "anglo.", "flamand."],
  pavilionDressCurved: ["pavilion.", "francais.", "russe.", "anglo.", "flamand."],
  arcadeDress: ["arcade."],
  arcadeDressCurved: ["arcade."],
} as const;
type Probe = keyof typeof PROBES;
const MINE = Object.keys(PROBES) as Probe[];

let geo: Record<string, Geometry>;
let fittings: Record<string, Instance[]>;

/** One instance: its translation and its matrix's three axes (scaled). */
interface Instance {
  readonly at: V;
  readonly x: V;
  readonly y: V;
  readonly z: V;
}

/** The `fittings.<name>` outputs' instances, from their batches' matrices (column-major). */
function instancesOf(item: unknown): Instance[] {
  const it = item as { kind: string; batches: { count: number; transforms: Float32Array }[] } | undefined;
  if (it === undefined || it.kind !== "instances") throw new Error("not an instance output");
  const out: Instance[] = [];
  for (const b of it.batches) {
    for (let k = 0; k < b.count; k++) {
      const m = (i: number) => b.transforms[16 * k + i]!;
      out.push({
        x: [m(0), m(1), m(2)],
        y: [m(4), m(5), m(6)],
        z: [m(8), m(9), m(10)],
        at: [m(12), m(13), m(14)],
      });
    }
  }
  return out;
}
let foreign: V[][];
let solids: Record<string, Solid[]>;
const byPrefix = (...prefixes: string[]): Solid[] =>
  Object.entries(solids)
    .filter(([k]) => prefixes.some((p) => k.startsWith(p)))
    .flatMap(([, v]) => v);
const centre = (s: Solid): V => sc(add(s.lo, s.hi), 0.5);
/** The face a solid stands on: the one whose normal its centre lies furthest along. */
const faceAt = (s: Solid) => {
  const c = centre(s);
  return FACES.reduce((best, f) =>
    f.normal[0] * c[0] + f.normal[1] * c[2] > best.normal[0] * c[0] + best.normal[1] * c[2] ? f : best,
  );
};

async function cookProbed(): Promise<{
  geo: Record<string, Geometry>;
  fit: Record<string, Instance[]>;
}> {
  const g = buildEiffel(1889);
  for (const id of MINE) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  const fit: Record<string, Instance[]> = {};
  for (const [k, v] of Object.entries(outputs)) {
    if (k.startsWith("fittings.")) {
      fit[k.slice("fittings.".length)] = (v as unknown[]).flatMap(instancesOf);
      continue;
    }
    const gg = firstGeometry(v as never);
    if (gg !== undefined && gg !== null) out[k] = gg;
  }
  return { geo: out, fit };
}

beforeAll(async () => {
  ({ geo, fit: fittings } = await cookProbed());
  solids = Object.fromEntries(
    Object.entries(worldSolids(fitOutSolids())).map(([k, list]) => [k, list.map((p) => solid(p.outline, p.depth))]),
  );
  // Everything else the tower cooks: every class output and every car,
  // less the fit-out's own points (the classes are jittered by 1 mm).
  const mine = new Set<string>();
  const key = (x: number, y: number, z: number) =>
    `${Math.round(x * 200)},${Math.round(y * 200)},${Math.round(z * 200)}`;
  for (const id of MINE) {
    const P = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
    for (let i = 0; i < P.length; i += 3) {
      for (const dx of [-1, 0, 1])
        for (const dy of [-1, 0, 1])
          for (const dz of [-1, 0, 1]) mine.add(key(P[i]! + dx / 200, P[i + 1]! + dy / 200, P[i + 2]! + dz / 200));
    }
  }
  foreign = [];
  for (const [k, g] of Object.entries(geo)) {
    if (k.startsWith("probe:")) continue;
    if (!(PART_CLASSES as readonly string[]).includes(k) && !k.startsWith("car.")) continue;
    for (const poly of polygons(g)) if (!poly.every((p) => mine.has(key(p[0], p[1], p[2])))) foreign.push(poly);
  }
}, 240_000);

describe("eiffel 1st-floor fit-out, 1889", () => {
  it("cooks exactly the solids it lists", () => {
    const key = (p: V) => p.map((v) => Math.round(v * 1e4)).join(",");
    const cookedKeys = (ids: readonly Probe[]) => {
      const out = new Set<string>();
      for (const id of ids) {
        const P = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
        for (let i = 0; i < P.length; i += 3) out.add(key([P[i]!, P[i + 1]!, P[i + 2]!]));
      }
      return out;
    };
    const listedKeys = (list: readonly Solid[]) => new Set(list.flatMap((s) => corners(s).map(key)));
    // Cooked points are f32: a key matches its neighbours' too, 0.1 mm apart.
    const missing = (a: Set<string>, b: Set<string>) =>
      [...a].filter((k) => {
        const [x, y, z] = k.split(",").map(Number) as [number, number, number];
        for (const dx of [-1, 0, 1])
          for (const dy of [-1, 0, 1])
            for (const dz of [-1, 0, 1]) if (b.has(`${x + dx},${y + dy},${z + dz}`)) return false;
        return true;
      }).length;
    const groups = [...new Set(MINE.map((id) => PROBES[id].join("|")))];
    for (const group of groups) {
      const ids = MINE.filter((id) => PROBES[id].join("|") === group);
      const listed = listedKeys(byPrefix(...group.split("|")));
      const cooked = cookedKeys(ids);
      expect(cooked.size, group).toBeGreaterThan(0);
      expect(missing(cooked, listed), `${group} cooked not listed`).toBe(0);
      expect(missing(listed, cooked), `${group} listed not cooked`).toBe(0);
    }
    // Control: the Russe's clock dropped from the list leaves its corners unlisted.
    const less = listedKeys(byPrefix("pavilion.", "francais.", "anglo.", "flamand.", "russe.g", "russe.v", "russe.f"));
    expect(missing(cookedKeys(["pavilionDress", "pavilionDressCurved"]), less)).toBeGreaterThan(0);
  });

  it("carries one rule on all four pavilions, the same under the quarter turns", () => {
    for (const name of ["pavilion.cornice", "pavilion.sidePost", "pavilion.terrace", "pavilion.pinnacle"]) {
      const list = solids[name]!;
      expect(list.length, name).toBeGreaterThan(0);
      // Each face's solids, in its own frame, as a sorted list of corners.
      const inFrame = (f: (typeof FACES)[number]) =>
        list
          .filter((s) => faceAt(s) === f)
          .flatMap((s) =>
            corners(s).map((p) =>
              toFace(p, f)
                .map((v) => v.toFixed(4))
                .join(","),
            ),
          )
          .sort();
      const ref = inFrame(FACES[0]!);
      expect(ref.length, name).toBe((list.length / 4) * 2 * list[0]!.pts.length);
      for (const f of FACES) expect(inFrame(f), `${name} on ${f.pavilion}`).toEqual(ref);
      // Control: a solid moved 1 cm on one face breaks the match.
      const shifted = list.map((s, i) => (i === 0 ? moved(s, [0.01, 0, 0]) : s));
      const f0 = faceAt(list[0]!);
      const shiftedFrame = shifted
        .filter((s) => faceAt(s) === f0)
        .flatMap((s) =>
          corners(s).map((p) =>
            toFace(p, f0)
              .map((v) => v.toFixed(4))
              .join(","),
          ),
        )
        .sort();
      expect(shiftedFrame).not.toEqual(ref);
    }
    // The terraces' balustrade tops at 2.95 + 1.00; the pinnacles' caps at 6.70.
    const rail = solids["pavilion.terrace"]!;
    expect(Math.max(...rail.map((s) => s.hi[1]))).toBeCloseTo(TERRACE_Y + TERRACE_RAIL, 6);
    expect(Math.min(...rail.map((s) => s.lo[1]))).toBeCloseTo(TERRACE_Y, 6);
    const pins = solids["pavilion.pinnacle"]!;
    expect(pins.length).toBe(4 * 2 * 2);
    expect(Math.max(...pins.map((s) => s.hi[1]))).toBeCloseTo(FLOOR + PINNACLE_TOP, 6);
  });

  it("frames the gallery front of the three timber pavilions, and not the Français'", () => {
    for (const name of ["pavilion.post", "pavilion.beam", "pavilion.sash", "pavilion.board"]) {
      const faces = new Set(solids[name]!.map((s) => faceAt(s).pavilion));
      expect([...faces].sort(), name).toEqual([FLAMAND.pavilion, ANGLO.pavilion, RUSSE.pavilion].sort());
    }
    // Seven posts on each: the 3.8825 lines, the ends inside the side walls.
    const posts = solids["pavilion.post"]!;
    for (const f of [FLAMAND, ANGLO, RUSSE]) {
      const on = posts.filter((s) => faceAt(s) === f).map((s) => toFace(centre(s), f));
      expect(on.length).toBe(7);
      const stations = on.map((c) => c[0]).sort((a, b) => a - b);
      stations.forEach((a, i) => {
        const want = Math.abs(i - 3) === 3 ? Math.sign(i - 3) * (PAV_HALF - POST / 2) : (i - 3) * HALF_BAY;
        expect(Math.abs(a - want)).toBeLessThan(1e-6);
      });
      // Their outer face on the front.
      for (const c of on) expect(Math.abs(c[2] + POST / 2 - FRONT)).toBeLessThan(1e-6);
    }
    // The transom's underside at 2.70, the sill's top at 0.50.
    const beams = solids["pavilion.beam"]!;
    const heights = new Set(beams.map((s) => (s.lo[1] - FLOOR).toFixed(4)));
    expect(heights.has(TRANSOM.toFixed(4))).toBe(true);
    const sills = beams.filter((s) => Math.abs(s.lo[1] - FLOOR) < 1e-6);
    for (const s of sills) expect(s.hi[1] - FLOOR).toBeCloseTo(SILL, 6);
    const transoms = beams.filter((s) => Math.abs(s.lo[1] - FLOOR - TRANSOM) < 1e-6);
    for (const s of transoms) expect(s.hi[1] - s.lo[1]).toBeCloseTo(BEAM, 6);
    // Six half-bays on the Flamand and the Bar; the Russe's centre two open.
    const sillsOn = (f: (typeof FACES)[number]) =>
      sills.filter((s) => faceAt(s) === f).map((s) => toFace(centre(s), f));
    expect(sillsOn(FLAMAND).length).toBe(6);
    expect(sillsOn(ANGLO).length).toBe(6);
    expect(sillsOn(RUSSE).length).toBe(4);
    expect(sillsOn(RUSSE).every((c) => Math.abs(c[0]) > HALF_BAY)).toBe(true);
    // The wall head: every head beam tops out on it.
    expect(Math.max(...beams.map((s) => s.hi[1]))).toBeCloseTo(WALL_HEAD, 6);
  });

  it("dresses each pavilion on the face FACES names for it, and on no other", () => {
    const own: Array<[string, (typeof FACES)[number]]> = [
      ["francais.", FRANCAIS],
      ["russe.", RUSSE],
      ["anglo.", ANGLO],
      ["flamand.", FLAMAND],
    ];
    for (const [prefix, f] of own) {
      const list = byPrefix(prefix);
      expect(list.length, prefix).toBeGreaterThan(0);
      const wrong = list.filter((s) => faceAt(s) !== f);
      expect(wrong.length, `${prefix} off ${f.pavilion}`).toBe(0);
      // Within the pavilion's plan, between its back (and what stands on
      // it) and the inner arcade's plane.
      for (const s of list) {
        for (const p of corners(s)) {
          const [a, , r] = toFace(p, f);
          expect(Math.abs(a), prefix).toBeLessThan(PAV_HALF + 0.01);
          expect(r, prefix).toBeGreaterThan(BACK - 0.5);
          expect(r, prefix).toBeLessThan(INNER_PLANE);
        }
      }
    }
    // Control: the Russe's pieces turned a quarter onto the Bar fail it.
    const turned = byPrefix("russe.").map((s) =>
      solid(
        s.pts.map(([x, y, z]): V => [-z, y, x]),
        s.depth,
      ),
    );
    expect(turned.filter((s) => faceAt(s) !== RUSSE).length).toBeGreaterThan(0);
  });

  it("stands nothing of the dressing in front of the inner arcade's plane", () => {
    const all = byPrefix("pavilion.", "francais.", "russe.", "anglo.", "flamand.");
    const furthest = (list: readonly Solid[]) => {
      let worst = -Infinity;
      for (const s of list) {
        const f = faceAt(s);
        for (const p of corners(s)) worst = Math.max(worst, toFace(p, f)[2]);
      }
      return worst;
    };
    const worst = furthest(all);
    expect(worst).toBeLessThan(INNER_PLANE);
    expect(worst).toBeGreaterThan(FRONT);
    // Control: the Russe's gables moved 0.02 out along their face's normal are found.
    const out = sc([RUSSE.normal[0], 0, RUSSE.normal[1]], 0.02);
    expect(furthest(solids["russe.gable"]!.map((s) => moved(s, out)))).toBeGreaterThan(INNER_PLANE);
  });

  it("keeps the rule's and the dressings' pieces out of each other where they meet", () => {
    // Each solid's own faces, as polygons: its outline, the outline moved
    // `depth`, and the sides between.
    const faces = (list: readonly Solid[]): V[][] =>
      list.flatMap((s) => {
        const top = s.pts.map((p) => add(p, sc(s.n, s.depth)));
        const sides = s.pts.map((p, i) => {
          const j = (i + 1) % s.pts.length;
          return [p, s.pts[j]!, top[j]!, top[i]!];
        });
        return [[...s.pts], top, ...sides];
      });
    const m = 0.002;
    const cornice = solids["pavilion.cornice"]!;
    const pairs: Array<[string, readonly Solid[], readonly Solid[]]> = [
      ["pinnacle × cornice", solids["pavilion.pinnacle"]!, cornice],
      ["clock × cornice", solids["russe.clock"]!, cornice],
      ["gable × valance", solids["russe.gable"]!, solids["russe.valance"]!],
      ["knee × cornice", solids["anglo.knee"]!, cornice],
    ];
    for (const [name, a, b] of pairs) {
      expect(intrusions(a, faces(b), m).count, name).toBe(0);
      expect(intrusions(b, faces(a), m).count, name).toBe(0);
    }
    // Control: a pinnacle slid 0.1 toward the centre annex runs into its cornice.
    const P = solids["pavilion.pinnacle"]!;
    const f = faceAt(P[0]!);
    const along: V = [f.normal[1], 0, -f.normal[0]];
    const a = toFace(centre(P[0]!), f)[0];
    const slid = moved(P[0]!, sc(along, -Math.sign(a) * 0.1));
    expect(intrusions([slid], faces(cornice), m).count + intrusions(cornice, faces([slid]), m).count).toBeGreaterThan(
      0,
    );
  });

  it("sets the Russe's clock and finial and the Français' crest at the plates' heights", () => {
    const clock = solids["russe.clock"]!;
    // The dial: the disc, the clock's one outline of more than four points
    // (the carved arch round it is quads).
    const dial = clock.find((s) => s.pts.length > 4)!;
    expect(clock.filter((s) => s.pts.length > 4).length).toBe(1);
    const c = centre(dial);
    expect(c[1]).toBeCloseTo(CLOCK_Y, 6);
    expect(dial.hi[1] - dial.lo[1]).toBeCloseTo(CLOCK_D, 6);
    // On the back of the centre bay, out of it toward the void.
    const back = toFace(c, RUSSE);
    expect(Math.abs(back[0])).toBeLessThan(1e-6);
    expect(back[2]).toBeLessThan(BACK);
    const finial = solids["russe.finial"]!;
    expect(Math.max(...finial.map((s) => s.hi[1]))).toBeCloseTo(RIDGE + FINIAL, 6);
    const crest = solids["francais.crest"]!;
    const panelTop = Math.max(...crest.filter((s) => s.pts.length > 4).map((s) => s.hi[1]));
    expect(panelTop).toBeCloseTo(CREST_TOP, 6);
    // Control: the Russe's finial is not the Français' crest.
    expect(Math.abs(Math.max(...finial.map((s) => s.hi[1])) - panelTop)).toBeGreaterThan(1);
  });

  it("lets nothing else in the tower inside the pavilions' frame and dressing", () => {
    const m = 0.005;
    const mineSolids = byPrefix("pavilion.", "francais.", "russe.", "anglo.", "flamand.");
    const report = intrusions(mineSolids, foreign, m);
    expect(report, JSON.stringify(report)).toEqual({ count: 0, first: [] });
    // Control: a pinnacle sunk 0.3 into the terrace, and the Français'
    // front cornice pushed 0.3 back into its wall, are each found.
    const pin = solids["pavilion.pinnacle"]![0]!;
    expect(intrusions([moved(pin, [0, -0.3, 0])], foreign, m).count).toBeGreaterThan(0);
    const cornice = solids["pavilion.cornice"]!.filter((s) => faceAt(s) === FRANCAIS).reduce((a, b) =>
      len(sub(b.hi, b.lo)) > len(sub(a.hi, a.lo)) ? b : a,
    );
    const back = sc([FRANCAIS.normal[0], 0, FRANCAIS.normal[1]], -0.3);
    expect(intrusions([moved(cornice, back)], foreign, m).count).toBeGreaterThan(0);
  });

  it("crowns each of the 36 arcades with its crest, 12 cabochons and a gas globe", () => {
    // One arcade drawn once: its crest (2 legs of 2 bars, 2 scrolls, a
    // cartouche, a collar, 7 fronds), 12 rings, and a rod in two hoops of
    // as many bars as keep each within 5 mm of its circle, about 0.33
    // across the bars' outer edges (`chord.ts`).
    const hoopBars = circleSegments(0.3 + 0.02 + 0.01, SAG.near);
    expect(solids["arcade.crest"]!.length).toBe(ARCADES * 15);
    expect(solids["arcade.ring"]!.length).toBe(ARCADES * CABOCHONS_PER_ARCADE);
    expect(solids["arcade.hanger"]!.length).toBe(ARCADES * (1 + 2 * hoopBars));
    const cab = fittings["cabochons"]!;
    const globes = fittings["globes"]!;
    expect(cab.length).toBe(ARCADES * CABOCHONS_PER_ARCADE);
    expect(globes.length).toBe(ARCADES);
    // The crescent's 11 rays, as the gable builds them (platforms.ts
    // `gableRibs`, restated): from the inner rib's outer edge to the outer
    // rib's inner edge, point j of 12 along each, u from the bay's centre.
    const rays: Array<readonly [number, number, number, number]> = [];
    {
      const R = INNER_R + INNER_RIB;
      const cy = INNER_CROWN - INNER_R;
      const psi0 = Math.asin((SPRING - cy) / R);
      for (let j = 1; j < 12; j++) {
        const phi = Math.PI * (1 - j / 12);
        const psi = Math.PI - psi0 - ((Math.PI - 2 * psi0) * j) / 12;
        rays.push([
          R * Math.cos(psi),
          cy + R * Math.sin(psi),
          (VAULT_HALF - OUTER_RIB) * Math.cos(phi),
          SPRING + (VAULT_RISE - OUTER_RIB) * Math.sin(phi),
        ]);
      }
    }
    // Nine a face, on the bays' centres; twelve cabochons to each.
    const bayOf = (p: V, f: (typeof FACES)[number]) => Math.round(toFace(p, f)[0] / BAY) + 0;
    const faceOfPoint = (p: V) =>
      FACES.reduce((best, f) =>
        f.normal[0] * p[0] + f.normal[1] * p[2] > best.normal[0] * p[0] + best.normal[1] * p[2] ? f : best,
      );
    for (const f of FACES) {
      const mine = globes.filter((x) => faceOfPoint(x.at) === f);
      expect(mine.length, f.pavilion).toBe(9);
      const bays = mine.map((x) => bayOf(x.at, f)).sort((a, b) => a - b);
      expect(bays).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
      for (const x of mine) {
        const [a, y, r] = toFace(x.at, f);
        // Jittered by at most a millimetre.
        expect(Math.abs(a - bayOf(x.at, f) * BAY)).toBeLessThan(0.002);
        expect(Math.abs(y - GLOBE_Y)).toBeLessThan(0.002);
        expect(Math.abs(r - (EDGE - GLOBE_IN))).toBeLessThan(0.002);
        expect(len(x.y)).toBeCloseTo(GLOBE_R, 5);
      }
      const cabs = cab.filter((x) => faceOfPoint(x.at) === f);
      expect(cabs.length, f.pavilion).toBe(9 * CABOCHONS_PER_ARCADE);
      for (let k = -4; k <= 4; k++) {
        const inBay = cabs.map((x) => toFace(x.at, f)).filter((p) => Math.round(p[0] / BAY) === k);
        expect(inBay.length).toBe(CABOCHONS_PER_ARCADE);
        // Every one inside its crescent: under the outer rib's inner edge,
        // over the inner rib's outer edge, on the gable's face.
        for (const [a, y, r] of inBay) {
          const u = a - k * BAY;
          const e = (u / (VAULT_HALF - OUTER_RIB)) ** 2 + ((y - SPRING) / (VAULT_RISE - OUTER_RIB)) ** 2;
          const cy = INNER_CROWN - INNER_R;
          expect(e).toBeLessThan(1);
          expect(Math.hypot(u, y - cy)).toBeGreaterThan(INNER_R + INNER_RIB);
          expect(r).toBeGreaterThan(EDGE);
        }
        // One to each of the 12 cells between the 11 rays: a cabochon's
        // cell is how many rays it lies to the right of (+a).
        const cells = inBay
          .map(
            ([a, y]) =>
              rays.filter(([ia, iy, oa, oy]) => (oa - ia) * (y - iy) - (oy - iy) * (a - k * BAY - ia) < 0).length,
          )
          .sort((p, q) => p - q);
        expect(cells).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      }
      // Facing out of the gable, along the face's normal.
      for (const x of cabs) {
        const axis = unit(x.y);
        expect(axis[0] * f.normal[0] + axis[2] * f.normal[1]).toBeCloseTo(1, 5);
      }
    }
    // The palmette's top, the crest on the gable's face.
    const crest = solids["arcade.crest"]!;
    expect(Math.max(...crest.map((s) => s.hi[1]))).toBeCloseTo(GALLERY_Y + PALMETTE_TOP, 6);
    for (const s of crest) {
      const f = faceAt(s);
      const rs = corners(s).map((p) => toFace(p, f)[2]);
      expect(Math.min(...rs)).toBeGreaterThan(EDGE - 1e-6);
    }
    // Control: the "on the face" check sees a crest piece pushed 0.05 back.
    {
      const s0 = crest[0]!;
      const f = faceAt(s0);
      const back = moved(s0, sc([f.normal[0], 0, f.normal[1]], -0.05));
      expect(Math.min(...corners(back).map((p) => toFace(p, f)[2]))).toBeLessThan(EDGE - 1e-6);
    }
    // Every ring clear of the rays and inside the ribs, all round its rim;
    // and no ring inside the crest, nor the crest inside a ring.
    const segDist = (u: number, y: number, [ia, iy, oa, oy]: readonly [number, number, number, number]) => {
      const [dx, dy] = [oa - ia, oy - iy];
      const t = Math.max(0, Math.min(1, ((u - ia) * dx + (y - iy) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(u - ia - t * dx, y - iy - t * dy);
    };
    const clear = (list: readonly V[]) => {
      let bad = 0;
      for (const p of list) {
        const f = faceOfPoint(p);
        const [a, y] = toFace(p, f);
        const k = Math.round(a / BAY);
        const u = a - k * BAY;
        if (rays.some((ray) => segDist(u, y, ray) < RING_R + RAY_HALF)) bad++;
        for (let i = 0; i < 16; i++) {
          const [ru, ry] = [u + RING_R * Math.cos((i * Math.PI) / 8), y + RING_R * Math.sin((i * Math.PI) / 8)];
          const e = (ru / (VAULT_HALF - OUTER_RIB)) ** 2 + ((ry - SPRING) / (VAULT_RISE - OUTER_RIB)) ** 2;
          if (e > 1 || Math.hypot(ru, ry - (INNER_CROWN - INNER_R)) < INNER_R + INNER_RIB) {
            bad++;
            break;
          }
        }
      }
      return bad;
    };
    expect(clear(cab.map((x) => x.at))).toBe(0);
    // Control: every cabochon slid 0.3 along its face is caught.
    expect(
      clear(
        cab.slice(0, 12).map((x) => add(x.at, sc([faceOfPoint(x.at).normal[1], 0, -faceOfPoint(x.at).normal[0]], 0.3))),
      ),
    ).toBeGreaterThan(0);
    const polys = (list: readonly Solid[]): V[][] =>
      list.flatMap((s) => {
        const top = s.pts.map((p) => add(p, sc(s.n, s.depth)));
        return [
          [...s.pts],
          top,
          ...s.pts.map((p, i) => [p, s.pts[(i + 1) % s.pts.length]!, top[(i + 1) % s.pts.length]!, top[i]!]),
        ];
      });
    const rings = solids["arcade.ring"]!;
    expect(intrusions(rings, polys(crest), 0.002).count).toBe(0);
    expect(intrusions(crest, polys(rings), 0.002).count).toBe(0);
    // Control: a ring moved onto the cartouche is found.
    const cart = crest.find((s) => s.pts.length === 8)!;
    const onCart = moved(rings[0]!, sub(centre(cart), centre(rings[0]!)));
    expect(intrusions([cart], polys([onCart]), 0.002).count).toBeGreaterThan(0);
    // Control: a cabochon moved 0.8 up leaves its crescent at the crown.
    const top = cab.map((x) => toFace(x.at, faceOfPoint(x.at))).reduce((a, b) => (b[1] > a[1] ? b : a));
    const u = top[0] - Math.round(top[0] / BAY) * BAY;
    const e = (u / (VAULT_HALF - OUTER_RIB)) ** 2 + ((top[1] + 0.8 - SPRING) / (VAULT_RISE - OUTER_RIB)) ** 2;
    expect(e).toBeGreaterThan(1);
  });

  it("lets nothing else in the tower inside the arcade's dressing", () => {
    const m = 0.005;
    const report = intrusions(byPrefix("arcade."), foreign, m);
    expect(report, JSON.stringify(report)).toEqual({ count: 0, first: [] });
    // Nor inside a globe: no foreign surface within its radius.
    const globes = fittings["globes"]!;
    const within = (list: readonly Instance[], R: number) => {
      let n = 0;
      for (const poly of foreign) {
        const near = list.filter((g) =>
          poly.some((p) => Math.abs(p[1] - g.at[1]) < 5 && Math.hypot(p[0] - g.at[0], p[2] - g.at[2]) < 5),
        );
        if (near.length === 0) continue;
        if (samples(poly, 0.05).some((p) => near.some((g) => len(sub(p, g.at)) < R - m))) n++;
      }
      return n;
    };
    expect(within(globes, GLOBE_R)).toBe(0);
    // Control: the same globe at a radius of 1.5 reaches the arcade (its
    // rod and hoops are its own, not foreign).
    expect(within(globes.slice(0, 1), 1.5)).toBeGreaterThan(0);
    // Control: a cartouche pushed 0.2 back into its gable is found.
    const cartouche = solids["arcade.crest"]!.find((s) => s.pts.length === 8)!;
    const f = faceAt(cartouche);
    expect(intrusions([moved(cartouche, sc([f.normal[0], 0, f.normal[1]], -0.2))], foreign, m).count).toBeGreaterThan(
      0,
    );
  });

  it("sets five stoneware balusters in every interval of the gallery balustrade, 720", () => {
    // The turned profile the host draws: exactly the 0.890 between the
    // rails, no wider than the bulb, closed on its axis at both ends, and
    // swelling from its stem to the bulb (not tapering from the torus).
    const prof = BALUSTER.profile;
    expect(Math.max(...prof.map(([h]) => h))).toBe(BALUSTER_TALL);
    expect(Math.min(...prof.map(([h]) => h))).toBe(0);
    expect(Math.max(...prof.map(([, r]) => r))).toBeLessThanOrEqual(BULB);
    expect(prof[0]![1]).toBe(0);
    expect(prof[prof.length - 1]![1]).toBe(0);
    const rAt = (h: number) => {
      for (let i = 0; i + 1 < prof.length; i++) {
        const [h0, r0] = prof[i]!;
        const [h1, r1] = prof[i + 1]!;
        if (h1 > h0 && h >= h0 && h <= h1) return r0 + ((r1 - r0) * (h - h0)) / (h1 - h0);
      }
      throw new Error(`no profile at ${h}`);
    };
    expect(rAt(0.25)).toBeLessThan(rAt(0.42));
    expect(rAt(0.42)).toBeLessThan(rAt(0.51));
    const all = fittings["balusters"]!;
    expect(all.length).toBe(PER_INTERVAL * 4 * 9 * 4);
    expect(all.length).toBe(LEDGER_SET);
    const faceOfPoint = (p: V) =>
      FACES.reduce((best, f) =>
        f.normal[0] * p[0] + f.normal[1] * p[2] > best.normal[0] * p[0] + best.normal[1] * p[2] ? f : best,
      );
    const pitch = CLEAR / PER_INTERVAL;
    for (const f of FACES) {
      const mine = all.filter((x) => faceOfPoint(x.at) === f);
      expect(mine.length, f.pavilion).toBe(PER_INTERVAL * 4 * 9);
      for (const x of mine) {
        const [, y, r] = toFace(x.at, f);
        // On the column axis, on the plinth rail (jittered by a millimetre at most), upright, true size.
        expect(Math.abs(r - EDGE)).toBeLessThan(0.002);
        expect(Math.abs(y - (GALLERY_Y + PLINTH))).toBeLessThan(0.002);
        expect(x.y[1]).toBeCloseTo(1, 6);
        expect(len(x.x)).toBeCloseTo(1, 6);
      }
      // Five to each interval, evenly between its two base blocks.
      const along = mine.map((x) => toFace(x.at, f)[0]).sort((a, b) => a - b);
      const want: number[] = [];
      for (let k = -4; k <= 4; k++) {
        const c = k * BAY;
        const clears = [
          c - PIER + SOCLE / 2,
          c - RAIL_PITCH + PILASTER_BASE / 2,
          c + SOCLE / 2,
          c + RAIL_PITCH + PILASTER_BASE / 2,
        ];
        for (const a0 of clears) for (let j = 0; j < PER_INTERVAL; j++) want.push(a0 + pitch * (j + 0.5));
      }
      want.sort((a, b) => a - b);
      along.forEach((a, i) => expect(Math.abs(a - want[i]!)).toBeLessThan(0.002));
      // The clears really are 1.50625: from a column's socle to a pilaster's base.
      expect(RAIL_PITCH - SOCLE / 2 - PILASTER_BASE / 2).toBeCloseTo(CLEAR, 9);
      expect(PIER - RAIL_PITCH - SOCLE / 2 - PILASTER_BASE / 2).toBeCloseTo(CLEAR, 9);
    }
    // Nothing else of the tower inside any baluster's turned envelope: a
    // cylinder of the bulb's radius from the plinth to under the channel.
    const m = 0.005;
    const inside = (list: readonly Instance[]) => {
      let count = 0;
      const first: string[] = [];
      const lo = GALLERY_Y + PLINTH;
      const hi = lo + BALUSTER_TALL;
      for (const poly of foreign) {
        const ys = poly.map((p) => p[1]);
        if (Math.max(...ys) < lo + m || Math.min(...ys) > hi - m) continue;
        const rs = poly.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[2])));
        if (Math.max(...rs) < EDGE - 0.2 || Math.min(...rs) > EDGE + 0.2) continue;
        const near = list.filter((x) => poly.some((p) => Math.hypot(p[0] - x.at[0], p[2] - x.at[2]) < 3));
        if (near.length === 0) continue;
        const hit = samples(poly, 0.02).some((p) =>
          near.some(
            (x) =>
              p[1] > x.at[1] + m &&
              p[1] < x.at[1] + BALUSTER_TALL - m &&
              Math.hypot(p[0] - x.at[0], p[2] - x.at[2]) < BULB - m,
          ),
        );
        if (hit) {
          count++;
          if (first.length < 5) first.push(poly[0]!.map((v) => v.toFixed(3)).join(", "));
        }
      }
      return { count, first };
    };
    expect(inside(all), JSON.stringify(inside(all))).toEqual({ count: 0, first: [] });
    // Control: one baluster slid 0.2 along its face, into its column or pilaster, is found.
    const x = all[0]!;
    const f = faceOfPoint(x.at);
    const along: V = [f.normal[1], 0, -f.normal[0]];
    const slid = [-0.2, 0.2].map((d) => inside([{ ...x, at: add(x.at, sc(along, d)) }]).count);
    expect(Math.max(...slid)).toBeGreaterThan(0);
  });

  it("cooks the same bits twice", async () => {
    const { geo: again, fit } = await cookProbed();
    for (const [name, list] of Object.entries(fittings)) {
      const other = fit[name]!;
      expect(other.length, name).toBe(list.length);
      expect(
        other.flatMap((x) => [...x.at, ...x.y]),
        name,
      ).toEqual(list.flatMap((x) => [...x.at, ...x.y]));
    }
    for (const id of MINE) {
      const a = geo[`probe:${id}`]!.attrs.point.get("P")!.data;
      const b = again[`probe:${id}`]!.attrs.point.get("P")!.data;
      expect(b.length).toBe(a.length);
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      expect(diff, id).toBe(0);
    }
    // Control: the comparator sees one coordinate moved.
    const a = geo["probe:pavilionDress"]!.attrs.point.get("P")!.data;
    const c = Float32Array.from(a);
    c[7] = c[7]! + 1e-3;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) diff++;
    expect(diff).toBe(1);
  }, 180_000);
});
