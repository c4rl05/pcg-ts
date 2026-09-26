/**
 * The Eiffel demo's 72 names on the first-floor frieze (`savants.ts`,
 * `letters.ts`, `namesLettering` in `platforms.ts`).
 *
 * Held here against the plate's reading and against what the graph COOKS,
 * restated rather than imported where a number is the claim:
 *
 * - the text: PL-XIX Fig. 1's four lists, as the research read them (with
 *   the plate's accents and its « Couchy »), turned into what the tower
 *   carries by two stated rules — capitals without accents, and CAUCHY for
 *   the plate's slip — and nothing else; 18 a face, on the face FACES
 *   gives each compass point, left to right seen from outside;
 * - the fit: every letter on its own plaque, within 0.06 of its ends and
 *   inside its height, seated 0.005 into it and standing 0.025 proud,
 *   capitals 0.60 tall; no name condensed below 0.70;
 * - the solids: every piece a closed convex outline wound to extrude out
 *   of the plaque; the cooked letters are exactly the listed solids, the
 *   cooked plaques are in the platforms class, and nothing else the tower
 *   cooks stands in the letters' layer over any plaque;
 * - two cooks agree to the bit.
 *
 * Every check that should read zero is first shown to read non-zero on a
 * deliberately displaced input, so a comparator that cannot say
 * "different" cannot pass.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type Geometry, type NodeHandle, cook, firstGeometry } from "pcg-ts";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { ALPHABET, glyph, setLine } from "../demos/eiffel/letters.js";
import { PART_CLASSES } from "../demos/eiffel/parts.js";
import { type NamePanel, namesLettering } from "../demos/eiffel/platforms.js";
import { SAVANTS } from "../demos/eiffel/savants.js";
import { FACES } from "../demos/eiffel/spec.js";

type V = readonly [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sc = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V): V => sc(a, 1 / len(a));

/**
 * PL-XIX Fig. 1, « Noms des savants inscrits sur les faces de la Tour », as
 * the research read it (eiffel-research.md §5.3), by the plate's face
 * headers, each list in the plate's order.
 */
const PLATE: Record<"NW" | "SW" | "SE" | "NE", string[]> = {
  NW: "Seguin Lalande Tresca Poncelet Bresse Lagrange Bélanger Cuvier Laplace Dulong Chasles Lavoisier Ampère Chevreul Flachat Navier Legendre Chaptal".split(" "),
  SW: "Jamin Gay-Lussac Fizeau Schneider Le_Chatelier Berthier Barral De_Dion Goüin Jousselin Broca Becquerel Coriolis Cail Triger Giffard Perrier Sturm".split(" "),
  SE: "Couchy Belgrand Regnault Fresnel De_Prony Vicat Ebelmen Coulomb Poinsot Foucault Delaunay Morin Haüy Combes Thénard Arago Poisson Monge".split(" "),
  NE: "Petiet Daguerre Wurtz Le_Verrier Perdonnet Delambre Malus Breguet Polonceau Dumas Clapeyron Borda Fourier Bichat Sauvage Pelouze Carnot Lamé".split(" "),
};
/** What the tower casts: capitals, no accents, and CAUCHY for the plate's « Couchy ». */
const onTower = (plate: string) =>
  (plate === "Couchy" ? "Cauchy" : plate)
    .replaceAll("_", " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/** The plates' and the model's numbers (tags as in `platforms.ts`). */
const EDGE = 70.695 / 2;
const PITCH = 3.8825;
const PLAQUE_W = PITCH - 0.6;
const PLAQUE_T = 0.03;
const CAP = 0.6;
const RELIEF = 0.025;
const EMBED = 0.005;
const MARGIN = 0.06;

/** A plaque's frame: centre of its back face, along, up the plate, out; its width and height. */
interface Frame {
  readonly c: V;
  readonly ea: V;
  readonly up: V;
  readonly n: V;
  readonly w: number;
  readonly h: number;
}
function frameOf(p: NamePanel): Frame {
  const o = p.plaque.outline as readonly V[];
  const ea = unit(sub(o[1]!, o[0]!));
  const up = unit(sub(o[3]!, o[0]!));
  const c = sc(o.reduce((s, q) => add(s, q), [0, 0, 0] as V), 1 / o.length);
  return { c, ea, up, n: cross(ea, up), w: len(sub(o[1]!, o[0]!)), h: len(sub(o[3]!, o[0]!)) };
}
const local = (f: Frame, p: V): V => {
  const d = sub(p, f.c);
  return [dot(d, f.ea), dot(d, f.up), dot(d, f.n)];
};
/** Newell's normal of a planar outline (its length twice the area). */
function newell(o: readonly V[]): V {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < o.length; i++) {
    const a = o[i]!;
    const b = o[(i + 1) % o.length]!;
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}
/** Every corner of a prism: its outline and the outline moved `depth` along its normal. */
const corners = (p: { outline: readonly V[]; depth: number }): V[] => {
  const n = unit(newell(p.outline));
  return [...p.outline, ...p.outline.map((q) => add(q, sc(n, p.depth)))];
};

function triangles(geo: Geometry): number {
  let t = 0;
  for (let p = 0; p < geo.primVertexCount.length; p++) t += geo.primVertexCount[p]! - 2;
  return t;
}

let panels: NamePanel[];
let geo: Record<string, Geometry>;

async function cookProbed(): Promise<Record<string, Geometry>> {
  const g = buildEiffel(1889);
  for (const id of ["namesLetters", "fitOut"]) g.output({ id } as NodeHandle, "out", `probe:${id}`);
  const { outputs } = await cook(g);
  const out: Record<string, Geometry> = {};
  for (const [k, v] of Object.entries(outputs)) {
    const gg = firstGeometry(v as never);
    if (gg !== undefined && gg !== null) out[k] = gg;
  }
  return out;
}

beforeAll(async () => {
  panels = namesLettering();
  geo = await cookProbed();
}, 180_000);

describe("eiffel names: the text", () => {
  it("carries PL-XIX's four lists as the tower casts them, 18 a face", () => {
    for (const compass of ["NW", "SW", "SE", "NE"] as const) {
      expect(SAVANTS[compass].length, compass).toBe(18);
      expect([...SAVANTS[compass]], compass).toEqual(PLATE[compass].map(onTower));
    }
    const all = Object.values(SAVANTS).flat();
    expect(new Set(all).size).toBe(72);
    // The rules change exactly what they say: the plate's Couchy, and its accents.
    const changed = Object.values(PLATE)
      .flat()
      .filter((n) => onTower(n) !== n.replaceAll("_", " ").toUpperCase());
    expect(changed.sort()).toEqual(["Ampère", "Bélanger", "Couchy", "Goüin", "Haüy", "Lamé", "Thénard"]);
    // Control: the plate's own spelling would not pass.
    expect(PLATE.SE.map((n) => n.toUpperCase())).not.toEqual([...SAVANTS.SE]);
  });

  it("sets each face's list on the face FACES gives its compass point, left to right from outside", () => {
    expect(panels.length).toBe(72);
    for (const face of FACES) {
      const row = panels.filter((p) => p.compass === face.compass);
      expect(row.length, face.compass).toBe(18);
      expect(row.map((p) => p.text)).toEqual([...SAVANTS[face.compass]]);
      // A viewer outside the face, looking in, has +right = (nz, -nx).
      const right = (q: V) => q[0] * face.normal[1] - q[2] * face.normal[0];
      const out = (q: V) => q[0] * face.normal[0] + q[2] * face.normal[1];
      const centres = row.map((p) => frameOf(p).c);
      for (const c of centres) {
        // On this face's skirt, not another's.
        expect(out(c)).toBeGreaterThan(EDGE - 1);
        expect(out(c)).toBeLessThan(EDGE + 0.1);
        for (const other of FACES) {
          if (other !== face) expect(c[0] * other.normal[0] + c[2] * other.normal[1]).toBeLessThan(EDGE - 0.3);
        }
      }
      centres.forEach((c, i) => expect(Math.abs(right(c) - (i - 8.5) * PITCH)).toBeLessThan(1e-6));
      // Each name reads left to right: its first letter's piece left of its last.
      for (const p of row) {
        const first = p.letters[0]!.outline as readonly V[];
        const last = p.letters[p.letters.length - 1]!.outline as readonly V[];
        const mid = (o: readonly V[]) => o.reduce((s, q) => s + right(q), 0) / o.length;
        expect(mid(first), p.text).toBeLessThan(mid(last));
      }
    }
  });

  it("draws only what the alphabet has, and refuses the rest by name", () => {
    for (const n of Object.values(SAVANTS).flat()) for (const ch of n) expect(ALPHABET).toContain(ch);
    expect(() => glyph("É")).toThrow(/no glyph for "É".*alphabet/);
    const fit = { height: CAP, width: PLAQUE_W - 2 * MARGIN, tracking: 0.2, minTracking: 0.08, minCondense: 0.7 };
    expect(() => setLine("SAINTE-CLAIRE DEVILLE", fit)).toThrow(/SAINTE-CLAIRE DEVILLE.*minCondense 0\.7/);
    expect(() => setLine("", fit)).toThrow(/empty/);
  });
});

describe("eiffel names: the fit", () => {
  it("keeps every letter on its plaque, 0.60 tall, 0.025 proud, within 0.06 of its ends", () => {
    let pieces = 0;
    for (const p of panels) {
      const f = frameOf(p);
      expect(Math.abs(f.w - PLAQUE_W), p.text).toBeLessThan(1e-9);
      let lo = Infinity;
      let hi = -Infinity;
      let s0 = Infinity;
      let s1 = -Infinity;
      for (const piece of p.letters) {
        pieces++;
        expect(Math.abs(piece.depth - (RELIEF + EMBED))).toBeLessThan(1e-12);
        const n = unit(newell(piece.outline as readonly V[]));
        // Wound to extrude straight out of the plaque.
        expect(dot(n, f.n), p.text).toBeGreaterThan(1 - 1e-9);
        for (const q of piece.outline as readonly V[]) {
          const [s, t, w] = local(f, q);
          expect(Math.abs(w - (PLAQUE_T - EMBED)), p.text).toBeLessThan(1e-9);
          lo = Math.min(lo, t);
          hi = Math.max(hi, t);
          s0 = Math.min(s0, s);
          s1 = Math.max(s1, s);
        }
      }
      expect(s0, p.text).toBeGreaterThanOrEqual(-PLAQUE_W / 2 + MARGIN - 1e-9);
      expect(s1, p.text).toBeLessThanOrEqual(PLAQUE_W / 2 - MARGIN + 1e-9);
      // Centred on the plaque.
      expect(Math.abs(s0 + s1), p.text).toBeLessThan(1e-6);
      expect(Math.abs(hi - CAP / 2), p.text).toBeLessThan(1e-9);
      // Only the Q's tail goes below the baseline.
      if (p.text.includes("Q")) expect(lo).toBeGreaterThan(-CAP / 2 - 0.035);
      else expect(Math.abs(lo + CAP / 2), p.text).toBeLessThan(1e-9);
      expect(hi - lo).toBeLessThan(f.h);
      expect(p.condense, p.text).toBeGreaterThanOrEqual(0.7);
    }
    expect(pieces).toBeGreaterThan(0);
    // The long names are condensed, the short ones never.
    const byText = new Map(panels.map((p) => [p.text, p]));
    expect(byText.get("LE CHATELIER")!.condense).toBeLessThan(0.8);
    expect(byText.get("CAIL")!.condense).toBe(1);
    expect(byText.get("CAIL")!.tracking).toBe(0.2);
    // Control: a letter moved 0.1 along falls off the margin of an edge-to-edge name.
    const wide = byText.get("LE CHATELIER")!;
    const f = frameOf(wide);
    const moved = (wide.letters.at(-1)!.outline as readonly V[]).map((q) => local(f, add(q, sc(f.ea, 0.1)))[0]);
    expect(Math.max(...moved)).toBeGreaterThan(PLAQUE_W / 2 - MARGIN);
  });

  it("builds every piece as a closed convex outline", () => {
    for (const p of panels) {
      for (const piece of p.letters) {
        const o = piece.outline as readonly V[];
        expect(o.length).toBeGreaterThanOrEqual(3);
        const n = unit(newell(o));
        for (let i = 0; i < o.length; i++) {
          const a = o[i]!;
          const b = o[(i + 1) % o.length]!;
          const c = o[(i + 2) % o.length]!;
          // Every turn the same way round, and no edge of zero length.
          expect(dot(cross(sub(b, a), sub(c, b)), n), p.text).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("eiffel names: the cook", () => {
  it("cooks exactly the listed letters, as the names class, and the plaques with the platforms", () => {
    const letters = geo["probe:namesLetters"]!;
    const listed = panels.flatMap((p) => p.letters);
    // A convex n-gon extruded with both caps: n quads of wall and two fans.
    const want = listed.reduce((s, q) => s + 2 * q.outline.length + 2 * (q.outline.length - 2), 0);
    expect(triangles(letters)).toBe(want);
    expect(triangles(geo.names!)).toBe(want);
    const key = (p: V) => p.map((v) => Math.round(v * 1e4)).join(",");
    const near = (set: Set<string>, p: V) => {
      const [x, y, z] = key(p).split(",").map(Number) as [number, number, number];
      for (const dx of [-1, 0, 1])
        for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (set.has(`${x + dx},${y + dy},${z + dz}`)) return true;
      return false;
    };
    const pointsOf = (g: Geometry) => {
      const P = g.attrs.point.get("P")!.data;
      const out: V[] = [];
      for (let i = 0; i < P.length; i += 3) out.push([P[i]!, P[i + 1]!, P[i + 2]!]);
      return out;
    };
    const listedKeys = new Set(listed.flatMap((q) => corners(q as never)).map(key));
    const cooked = pointsOf(letters);
    const cookedKeys = new Set(cooked.map(key));
    expect(cooked.filter((p) => !near(listedKeys, p)).length).toBe(0);
    expect(listed.flatMap((q) => corners(q as never)).filter((p) => !near(cookedKeys, p)).length).toBe(0);
    // Control: the list one name short leaves that name's corners unlisted.
    const less = new Set(panels.slice(1).flatMap((p) => p.letters.flatMap((q) => corners(q as never))).map(key));
    expect(cooked.filter((p) => !near(less, p)).length).toBeGreaterThan(0);
    // The plaques cook with the skirt's ornament, in the platforms class.
    const fit = new Set(pointsOf(geo["probe:fitOut"]!).map(key));
    for (const p of panels) for (const q of corners(p.plaque as never)) expect(near(fit, q), p.text).toBe(true);
    // Control: a plaque moved 0.05 out is not there.
    const f = frameOf(panels[0]!);
    expect(corners(panels[0]!.plaque as never).some((q) => !near(fit, add(q, sc(f.n, 0.05))))).toBe(true);
  });

  it("leaves the letters' layer over every plaque to the letters", () => {
    // Every polygon any other class cooks (1 mm jittered) near the frieze,
    // sampled every 0.02 over its corners, edges and faces, against the
    // layer the letters stand in: over a plaque, 3 mm inside its edges, and
    // from 3 mm off its face to the letters' faces.
    const frames = panels.map(frameOf);
    const y0 = frames[0]!.c[1];
    const polys: V[][] = [];
    for (const [k, g] of Object.entries(geo)) {
      if (k === "names" || k.startsWith("probe:")) continue;
      if (!(PART_CLASSES as readonly string[]).includes(k) && !k.startsWith("car.")) continue;
      const P = g.attrs.point.get("P")!.data;
      for (let p = 0; p < g.primVertexStart.length; p++) {
        const s = g.primVertexStart[p]!;
        const poly: V[] = [];
        for (let j = 0; j < g.primVertexCount[p]!; j++) {
          const v = g.vertexToPoint[s + j]!;
          poly.push([P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!]);
        }
        const ys = poly.map((q) => q[1]);
        if (Math.max(...ys) > y0 - 1 && Math.min(...ys) < y0 + 1) polys.push(poly);
      }
    }
    expect(polys.length).toBeGreaterThan(0);
    const inLayer = (f: Frame, q: V) => {
      const [s, t, w] = local(f, q);
      return (
        Math.abs(s) < PLAQUE_W / 2 - 0.003 &&
        Math.abs(t) < f.h / 2 - 0.003 &&
        w > PLAQUE_T + 0.003 &&
        w < PLAQUE_T + RELIEF + 0.003
      );
    };
    /** A frame's world box: its plaque and the layer over it. */
    const boxOf = (f: Frame) => {
      const pts: V[] = [];
      for (const s of [-0.5, 0.5])
        for (const u of [-0.5, 0.5])
          for (const w of [0, PLAQUE_T + RELIEF + 0.01]) pts.push(add(f.c, add(sc(f.ea, s * f.w), add(sc(f.up, u * f.h), sc(f.n, w)))));
      return {
        lo: [0, 1, 2].map((k) => Math.min(...pts.map((q) => q[k]!))),
        hi: [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k]!))),
      };
    };
    const step = 0.02;
    const count = (fs: readonly Frame[]) => {
      let n = 0;
      for (const poly of polys) {
        // Only the plaques whose box this polygon's box meets.
        const lo = [0, 1, 2].map((k) => Math.min(...poly.map((q) => q[k]!)));
        const hi = [0, 1, 2].map((k) => Math.max(...poly.map((q) => q[k]!)));
        const near = fs.filter((f) => {
          const box = boxOf(f);
          return [0, 1, 2].every((k) => lo[k]! <= box.hi[k]! && hi[k]! >= box.lo[k]!);
        });
        if (near.length === 0) continue;
        const hit = (q: V) => near.some((f) => inLayer(f, q));
        for (let i = 1; i + 1 < poly.length; i++) {
          const a = poly[0]!;
          const b = poly[i]!;
          const c = poly[i + 1]!;
          const m = Math.min(300, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a)), len(sub(c, b))) / step));
          for (let u = 0; u <= m; u++) {
            for (let v = 0; u + v <= m; v++) {
              const q = add(a, add(sc(sub(b, a), u / m), sc(sub(c, a), v / m)));
              if (hit(q)) n++;
            }
          }
        }
      }
      return n;
    };
    expect(count(frames)).toBe(0);
    // Control: the layer slid half a bay along, onto a pilaster.
    const slid = frames.map((f) => ({ ...f, c: add(f.c, sc(f.ea, PITCH / 2)) }));
    expect(count(slid)).toBeGreaterThan(0);
  }, 180_000);

  it("cooks the same bits twice", async () => {
    const again = await cookProbed();
    const a = geo["probe:namesLetters"]!.attrs.point.get("P")!.data;
    const b = again["probe:namesLetters"]!.attrs.point.get("P")!.data;
    expect(b.length).toBe(a.length);
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    expect(diff).toBe(0);
    // Control: the comparator sees a one-ulp change.
    const c = Float32Array.from(b);
    c[7] = Math.fround(c[7]! * (1 + 2 ** -20));
    let d2 = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) d2++;
    expect(d2).toBe(1);
  }, 180_000);
});
