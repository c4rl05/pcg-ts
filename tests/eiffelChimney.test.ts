/**
 * The chimney by pile 4 as the page would draw it (ground.ts `chimneySkin`;
 * it is modelled but no longer drawn, see ground.ts' header): one closed
 * skin, not 544 stave prisms.
 *
 * Drawn as prisms, each stave's corners were its own points with their own
 * seeds, so the class's jitter (parts.ts `JITTER`) opened every seam by up
 * to 2.8 mm, and each stave's side walls, square to its own face, ran from
 * the seam into its neighbour (inward-extruded staves overlap in a wedge):
 * bright specks up every seam and round every course.
 * This suite holds the skin to what ends them:
 *
 * - CLOSED: every edge of every face is met by exactly one other face,
 *   running the other way, so there is no crack and no inner wall, and the
 *   skin faces out: its volume is the courses' own, worked here from
 *   `CHIMNEY` as n-gon frusta, and positive;
 * - WELDED UNDER THE JITTER: cooked and jittered, every set of points that
 *   coincide still coincides — and the old staves, cooked the same way, do
 *   not, so the check can fail;
 * - SHADED AS ONE: the shaft's faces point out, and the points at a seam
 *   carry one normal.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { type DataCollection, type Geometry, Graph, cook, firstGeometry } from "pcg-ts";
import { CHIMNEY, CHIMNEY_STAVES, type Prism, chimneySkin, machineRoomPrisms, prisms, skin } from "../demos/eiffel/ground.js";
import { jitter } from "../demos/eiffel/parts.js";

type Vec3 = readonly [number, number, number];

const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;

/** Directed edges met by no face running the other way, and edges used more than once. */
function openEdges(faces: readonly (readonly Vec3[])[]): number {
  const count = new Map<string, number>();
  for (const f of faces) {
    for (let i = 0; i < f.length; i++) {
      const e = `${key(f[i]!)}>${key(f[(i + 1) % f.length]!)}`;
      count.set(e, (count.get(e) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const [e, c] of count) {
    const [a, b] = e.split(">");
    if (c !== 1 || count.get(`${b}>${a}`) !== 1) bad++;
  }
  return bad;
}

/** Signed volume inside a closed surface of faces wound with their normals INTO it (a prism outline's winding), fanned. */
function volume(faces: readonly (readonly Vec3[])[]): number {
  let v = 0;
  for (const f of faces) {
    const o = f[0]!;
    for (let i = 1; i + 1 < f.length; i++) {
      const a = f[i]!;
      const b = f[i + 1]!;
      v += (o[0] * (a[1] * b[2] - a[2] * b[1]) - o[1] * (a[0] * b[2] - a[2] * b[0]) + o[2] * (a[0] * b[1] - a[1] * b[0])) / 6;
    }
  }
  // Wound into the solid, so the outward-positive volume is the negative.
  return -v;
}

/**
 * The chimney's brickwork worked from `CHIMNEY` alone, course by course, as
 * `CHIMNEY_STAVES`-gon frusta across their flats: what a closed skin of the
 * courses must enclose, to rounding.
 */
function courseVolume(): number {
  const n = CHIMNEY_STAVES;
  const polygon = (r: number) => n * r * r * Math.tan(Math.PI / n);
  const frustum = (r0: number, r1: number, h: number) => {
    const a0 = polygon(r0);
    const a1 = polygon(r1);
    return (h / 3) * (a0 + a1 + Math.sqrt(a0 * a1));
  };
  const wall = (d0: number, d1: number, t: number, h: number) => frustum(d0 / 2, d1 / 2, h) - frustum(d0 / 2 - t, d1 / 2 - t, h);
  const C = CHIMNEY;
  const K = C.crown;
  let v = frustum(C.footing.d / 2, C.footing.d / 2, C.footing.t) + wall(C.a.d, C.a.d, C.a.wall, C.a.high);
  for (const b of C.b) {
    const dm = (b.d0 + b.d1) / 2;
    v += wall(b.d0, dm, b.wall0, b.high / 2) + wall(dm, b.d1, b.wall1, b.high / 2);
  }
  v += wall(C.b[C.b.length - 1]!.d1, K.d, 0.5, K.corbel) + wall(K.d, K.d, 0.6, K.band);
  // The parapet: whole below, every other slot above.
  return v + wall(K.d, K.d, K.wall, K.parapet / 2) * 1.5;
}

const [cx, cz] = CHIMNEY.at;
const faces = chimneySkin();
/** The same courses as the stave prisms the page used to draw, wholly within the footing's corners. */
const staves: Prism[] = machineRoomPrisms().foundations.filter((p) =>
  p.outline.every(([x, , z]) => Math.hypot(x - cx, z - cz) < CHIMNEY.footing.d / 2 + 0.01),
);

/** Cook a mesh builder and its jittered copy (as `assemble` jitters a class). */
async function cookJittered(build: (g: Graph) => ReturnType<typeof skin>): Promise<{ flat: Geometry; moved: Geometry }> {
  const g = new Graph(1889);
  const mesh = build(g);
  g.output(mesh, "out", "flat");
  g.output(jitter(g, "chimneyJitter", mesh), "out", "moved");
  const { outputs } = await cook(g);
  return {
    flat: firstGeometry(outputs.flat as DataCollection)!,
    moved: firstGeometry(outputs.moved as DataCollection)!,
  };
}

/** Of the points that coincide before the jitter, how many groups have come apart after it, and by how much at most. */
function parted({ flat, moved }: { flat: Geometry; moved: Geometry }): { groups: number; parted: number; worst: number } {
  const P = flat.attrs.point.get("P")!.data;
  const J = moved.attrs.point.get("P")!.data;
  const at = new Map<string, number[]>();
  for (let i = 0; i < flat.pointCount; i++) {
    const k = key([P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!]);
    (at.get(k) ?? at.set(k, []).get(k)!).push(i);
  }
  let groups = 0;
  let n = 0;
  let worst = 0;
  for (const idx of at.values()) {
    if (idx.length < 2) continue;
    groups++;
    const a = idx[0]!;
    let m = 0;
    for (const b of idx) m = Math.max(m, Math.hypot(J[3 * a]! - J[3 * b]!, J[3 * a + 1]! - J[3 * b + 1]!, J[3 * a + 2]! - J[3 * b + 2]!));
    if (m > 0) n++;
    worst = Math.max(worst, m);
  }
  return { groups, parted: n, worst };
}

describe("eiffel chimney: one closed skin", () => {
  it("is closed: every edge met once, the other way round (and a missing face is caught)", () => {
    expect(faces.length).toBeGreaterThan(1000);
    for (const f of faces) expect(f.length).toBeGreaterThanOrEqual(3);
    expect(openEdges(faces)).toBe(0);
    // Control: one face less opens its edges.
    expect(openEdges(faces.slice(1))).toBeGreaterThan(0);
  });

  it("faces out, enclosing exactly the courses' brickwork", () => {
    const skinVolume = volume(faces);
    expect(skinVolume).toBeGreaterThan(0);
    expect(skinVolume / courseVolume()).toBeCloseTo(1, 9);
    // Control: turned inside out it reads negative.
    expect(volume(faces.map((f) => [...f].reverse()))).toBeLessThan(0);
  });

  describe("cooked and jittered", () => {
    let drawn: { flat: Geometry; moved: Geometry };
    let old: { flat: Geometry; moved: Geometry };
    beforeAll(async () => {
      drawn = await cookJittered((g) => skin(g, "chimney", faces, 20));
      old = await cookJittered((g) => prisms(g, "chimneyStaves", staves, 20));
    }, 120000);

    it("keeps every seam closed, where the old staves opened theirs", () => {
      const skinSeams = parted(drawn);
      expect(skinSeams.groups).toBeGreaterThan(1000);
      expect(skinSeams).toMatchObject({ parted: 0, worst: 0 });
      // Control: the same courses as 544 stave prisms part at their seams.
      const staveSeams = parted(old);
      expect(staveSeams.parted).toBeGreaterThan(100);
      expect(staveSeams.worst).toBeGreaterThan(0.001);
    });

    it("shades the shaft as one surface facing out, in fewer triangles than the staves", () => {
      const { flat } = drawn;
      const P = flat.attrs.point.get("P")!.data;
      const N = flat.attrs.point.get("normal")!.data;
      const r0 = CHIMNEY.b[0]!.d0 / 2;
      const normals = new Map<string, Vec3>();
      let shaft = 0;
      for (let i = 0; i < flat.pointCount; i++) {
        const [x, y, z] = [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!];
        const r = Math.hypot(x - cx, z - cz);
        // The first lift's outer face where its two halves meet.
        if (Math.abs(y - CHIMNEY.b[0]!.high / 2) > 0.01 || r < r0 - 0.1) continue;
        shaft++;
        const n: Vec3 = [N[3 * i]!, N[3 * i + 1]!, N[3 * i + 2]!];
        expect((n[0] * (x - cx) + n[2] * (z - cz)) / r).toBeGreaterThan(0.99);
        const k = key([x, y, z]);
        const seen = normals.get(k);
        if (seen === undefined) normals.set(k, n);
        else expect(Math.hypot(seen[0] - n[0], seen[1] - n[1], seen[2] - n[2])).toBeLessThan(1e-6);
      }
      expect(shaft).toBeGreaterThan(0);
      expect(flat.primitiveCount).toBeLessThan(old.flat.primitiveCount);
    });
  });
});
