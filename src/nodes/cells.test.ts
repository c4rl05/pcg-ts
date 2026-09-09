import { describe, expect, it } from "vitest";
import { createPointCloud, type Geometry } from "../data/index.js";
import { attribute, type FieldLike } from "../fields/index.js";
import { Graph, cook, makeGeometryItem } from "../graph/index.js";
import { dataInput } from "../runtime/index.js";
import { deserializeGraph, serializeGraph, voronoiCells } from "./index.js";
import { firstGeo, permutePoints, runNode, shuffledOrder } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Fixtures and readers

/**
 * A cloud at the given positions. Seeds are derived from the POSITION, not
 * from the array index, so a reordered cloud is the same set of points and
 * a cell can be named by the seed of the site it belongs to — which is
 * what the permutation and partition cases below key on.
 */
function cloud(points: readonly (readonly number[])[]): Geometry {
  const geo = createPointCloud(points.length);
  const P = geo.attrs.point.require("P");
  const seed = geo.attrs.point.require("seed");
  points.forEach((p, i) => {
    P.setTuple(i, [p[0] as number, p[1] as number, p[2] as number]);
    seed.set(
      i,
      ((Math.imul((p[0] as number) * 1000 + 7, 2654435761) ^ ((p[2] as number) * 1000 + 13)) >>>
        0) %
        65521,
    );
  });
  return geo;
}

/** Deterministic PRNG (never Math.random). */
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The `span` x `span` integer lattice, scaled by `step`. */
function lattice(span: number, step = 1): Geometry {
  const pts: number[][] = [];
  for (let x = 0; x < span; x++) for (let z = 0; z < span; z++) pts.push([x * step, 0, z * step]);
  return cloud(pts);
}

/** A jittered lattice, so knife-edge distances are common but not the rule. */
function jittered(span: number, seed: number, amount = 0.3): Geometry {
  const rnd = lcg(seed);
  const pts: number[][] = [];
  for (let x = 0; x < span; x++)
    for (let z = 0; z < span; z++)
      pts.push([x + (rnd() - 0.5) * amount, 0, z + (rnd() - 0.5) * amount]);
  return cloud(pts);
}

interface Cell {
  /** Seed of the site this ring belongs to — its name, not its index. */
  readonly site: number;
  /** Ring corners as `x,z` to 4 decimals, in the order they were emitted. */
  readonly corners: string[];
  /** Y of every corner, which must be the site's own. */
  readonly y: number;
}

/** Every cell of `geo`, in primitive order, keyed by its site's seed. */
function cells(geo: Geometry): Cell[] {
  const P = geo.attrs.point.require("P");
  const seed = geo.attrs.point.require("seed");
  const out: Cell[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p] as number;
    const n = geo.primVertexCount[p] as number;
    // A ring closes by repeating its first point index as the last vertex.
    expect(geo.vertexToPoint[s + n - 1]).toBe(geo.vertexToPoint[s]);
    const corners: string[] = [];
    for (let v = 0; v < n - 1; v++) {
      const pt = geo.vertexToPoint[s + v] as number;
      corners.push(`${P.data[pt * P.tupleSize]},${P.data[pt * P.tupleSize + 2]}`);
    }
    const first = geo.vertexToPoint[s] as number;
    out.push({
      site: seed.data[first] as number,
      corners,
      y: P.data[first * P.tupleSize + 1] as number,
    });
  }
  return out;
}

/** A cell's corners as a SET, for comparing against a differently-rooted ring. */
const cornerSet = (c: Cell): string[] => [...c.corners].sort();

/** Run the node over `geo`. */
async function voronoi(
  geo: Geometry,
  params: Record<string, unknown> = {},
): Promise<Geometry> {
  const out = await runNode(voronoiCells, params, { in: [makeGeometryItem(geo)] });
  return firstGeo(out.out);
}

/**
 * The cell of site `i` computed from EVERY other site, with no radius
 * bound at all — the answer the node's certificate claims to reproduce.
 * Returns undefined when the cell reaches the far box, which is how an
 * unbounded cell shows up here.
 */
function referenceCell(geo: Geometry, i: number, box = 1000): string[] | undefined {
  const P = geo.attrs.point.require("P");
  const ts = P.tupleSize;
  const sx = P.data[i * ts] as number;
  const sz = P.data[i * ts + 2] as number;
  let poly: Array<[number, number]> = [
    [-box, -box],
    [-box, box],
    [box, box],
    [box, -box],
  ];
  for (let j = 0; j < geo.pointCount; j++) {
    if (j === i) continue;
    const dx = (P.data[j * ts] as number) - sx;
    const dz = (P.data[j * ts + 2] as number) - sz;
    const d2 = dx * dx + dz * dz;
    if (d2 === 0) continue;
    const next: Array<[number, number]> = [];
    for (let a = 0; a < poly.length; a++) {
      const A = poly[a] as [number, number];
      const B = poly[(a + 1) % poly.length] as [number, number];
      const fa = 2 * (A[0] * dx + A[1] * dz) - d2;
      const fb = 2 * (B[0] * dx + B[1] * dz) - d2;
      if (fa <= 0) next.push(A);
      // The STRICT sign change, matching the node. `fa <= 0 !== fb <= 0`
      // interpolates at t = 0 when a corner lies exactly on the bisector
      // and emits that corner twice, which is every right angle — so the
      // loose form would make this reference unusable on a lattice, which
      // is the one cloud worth pointing it at.
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
        const t = fa / (fa - fb);
        next.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      }
    }
    poly = next;
    if (poly.length < 3) return undefined;
  }
  // Touching the far box means the true cell is unbounded.
  if (poly.some(([x, z]) => Math.abs(x) > box - 1 || Math.abs(z) > box - 1)) return undefined;
  // f32, because that is what the node's own corners were rounded to on
  // their way into `P` — comparing an f64 reference against them would
  // fail on every cell for a reason that is not about Voronoi.
  return poly.map(([x, z]) => `${Math.fround(sx + x)},${Math.fround(sz + z)}`).sort();
}

// ---------------------------------------------------------------------------

describe("voronoiCells", () => {
  it("gives every interior site of a unit lattice its unit square", async () => {
    const geo = await voronoi(lattice(6), { radius: 3, areaAttr: "cellArea" });
    const got = cells(geo);
    // The 4x4 interior certifies; the 20 border sites have unbounded true
    // cells and no radius certifies one of those.
    expect(got.length).toBe(16);
    expect(geo.attrs.primitive.require("primtype").getString(0)).toBe("polyline");
    const area = geo.attrs.primitive.require("cellArea");
    for (let p = 0; p < geo.primitiveCount; p++) expect(area.data[p]).toBeCloseTo(1, 5);
    for (const c of got) expect(c.corners.length).toBe(4);
  });

  it("reports the sites it could not certify", async () => {
    const geo = await voronoi(lattice(6), { radius: 3, uncertifiedAttr: "missed" });
    expect(geo.attrs.detail.require("missed").data[0]).toBe(36 - 16);
  });

  it("certifies more sites as the radius grows, and never changes a certified one", async () => {
    // The radius is a GATHER: widening it can only turn a cell that could
    // not be proved into one that can, never move a cell that already was.
    const src = jittered(9, 7, 0.9);
    const narrow = cells(await voronoi(src, { radius: 1.6 }));
    const wide = cells(await voronoi(src, { radius: 5 }));
    expect(narrow.length).toBeGreaterThan(5);
    expect(wide.length).toBeGreaterThan(narrow.length);
    const bySite = new Map(wide.map((c) => [c.site, cornerSet(c)]));
    for (const c of narrow) expect(bySite.get(c.site)).toEqual(cornerSet(c));
  });

  it("matches a cell computed from the whole cloud, which is the certificate's claim", async () => {
    const src = jittered(9, 11);
    const got = cells(await voronoi(src, { radius: 3 }));
    expect(got.length).toBeGreaterThan(20);
    const seed = src.attrs.point.require("seed");
    const bySite = new Map<number, number>();
    for (let i = 0; i < src.pointCount; i++) bySite.set(seed.data[i] as number, i);
    for (const c of got) {
      const i = bySite.get(c.site);
      expect(i).toBeDefined();
      const want = referenceCell(src, i as number);
      expect(want).toBeDefined();
      expect(cornerSet(c)).toEqual(want);
    }
  });

  it("emits every cell that fits inside the certificate, and only those", async () => {
    // The certificate is stricter than boundedness and deliberately so: a
    // site just inside the hull has a bounded cell that still reaches
    // further than radius/2, and no gather at that radius can prove it.
    // What the node owes is that the test is exactly the stated one.
    const src = jittered(7, 3);
    const got = cells(await voronoi(src, { radius: 4 }));
    const emitted = new Set(got.map((c) => c.site));
    const seed = src.attrs.point.require("seed");
    const P = src.attrs.point.require("P");
    let mustHave = 0;
    let unbounded = 0;
    for (let i = 0; i < src.pointCount; i++) {
      const ref = referenceCell(src, i);
      const name = seed.data[i] as number;
      if (ref === undefined) {
        unbounded++;
        expect(emitted.has(name)).toBe(false);
        continue;
      }
      const sx = P.data[i * P.tupleSize] as number;
      const sz = P.data[i * P.tupleSize + 2] as number;
      let reach = 0;
      for (const c of ref) {
        const [x, z] = c.split(",").map(Number) as [number, number];
        reach = Math.max(reach, Math.hypot(x - sx, z - sz));
      }
      if (reach < 4 / 2) {
        mustHave++;
        expect(emitted.has(name)).toBe(true);
      }
    }
    expect(mustHave).toBeGreaterThan(15);
    expect(unbounded).toBeGreaterThan(0);
    expect(got.length).toBeGreaterThanOrEqual(mustHave);
    expect(new Set(got.map((c) => c.site)).size).toBe(got.length);
  });

  it("puts every ring at its own site's Y and carries the site's attributes", async () => {
    const pts: number[][] = [];
    for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) pts.push([x, x * 0.5 + z * 0.25, z]);
    const src = cloud(pts);
    const geo = await voronoi(src, { radius: 3 });
    const got = cells(geo);
    expect(got.length).toBe(9);
    const P = src.attrs.point.require("P");
    const seed = src.attrs.point.require("seed");
    const yBySite = new Map<number, number>();
    for (let i = 0; i < src.pointCount; i++)
      yBySite.set(seed.data[i] as number, P.data[i * P.tupleSize + 1] as number);
    for (const c of got) expect(c.y).toBeCloseTo(yBySite.get(c.site) as number, 5);
    // The whole point of carrying them: a per-site value reaches the ring.
    expect(geo.attrs.point.names()).toEqual(src.attrs.point.names());
  });

  it("is equivariant under a permutation of the input", async () => {
    const src = jittered(8, 21);
    const a = cells(await voronoi(src, { radius: 3 }));
    const permuted = permutePoints(src, shuffledOrder(src.pointCount, 99));
    const b = cells(await voronoi(permuted, { radius: 3 }));
    // The SEQUENCE, not merely the set: cell order is a property of the
    // points, so a shuffled input emits the same cells in the same places.
    expect(b.map((c) => c.site)).toEqual(a.map((c) => c.site));
    expect(b.map(cornerSet)).toEqual(a.map(cornerSet));
    // Non-vacuity: the shuffle really did move the points around.
    const pOf = (g: Geometry): number[] => [...g.attrs.point.require("seed").data];
    expect(pOf(permuted)).not.toEqual(pOf(src));
  });

  it("is halo-exact at haloWidth == radius", async () => {
    // A window that holds every point within `radius` of its own rectangle
    // decides its cells exactly. The certificate is what makes that
    // checkable rather than merely asserted.
    const src = jittered(11, 5);
    const whole = cells(await voronoi(src, { radius: 3 }));
    const P = src.attrs.point.require("P");
    const keep: number[] = [];
    for (let i = 0; i < src.pointCount; i++) if ((P.data[i * P.tupleSize] as number) < 5 + 3) keep.push(i);
    const windowed = cells(
      await voronoi(permutePoints(src, Uint32Array.from(keep)), { radius: 3 }),
    );
    const bySite = new Map(windowed.map((c) => [c.site, c.corners]));
    let owned = 0;
    const seed = src.attrs.point.require("seed");
    for (const c of whole) {
      const i = [...seed.data].indexOf(c.site);
      if (!((P.data[i * P.tupleSize] as number) < 5)) continue;
      owned++;
      // Bit-identical, not merely close: the corners are the same floats.
      expect(bySite.get(c.site)).toEqual(c.corners);
    }
    expect(owned).toBeGreaterThan(20);
  });

  it("certifies the RADIUS and not the cloud: a missing site inside it is silent", async () => {
    // THE ONE THING THE CERTIFICATE DOES NOT BUY, pinned because the
    // opposite was published first. The proof says: if every corner is
    // within radius/2 AND every site within `radius` was gathered, the
    // cell is global. A partitioned cook whose halo is NARROWER than
    // `radius` breaks the second premise, and the check cannot see it —
    // the node has no way to know a site was withheld from it.
    //
    // Sixty sites on a circle of radius 0.99 give the site at the origin a
    // 60-gon reaching 0.4957 — inside the 0.5 that radius 1 proves, so it
    // certifies. Drop ONE of them, as a halo of 0.9 would, and the cell
    // grows a sliver where that bisector was: 59 corners now, reaching
    // 0.4977, which is STILL inside 0.5. So it certifies again, and it is
    // a different polygon. Not dropped. Wrong.
    const ring: number[][] = [[0, 0, 0]];
    for (let k = 0; k < 60; k++) {
      const a = (k * 2 * Math.PI) / 60;
      ring.push([0.99 * Math.cos(a), 0, 0.99 * Math.sin(a)]);
    }
    const whole = cells(await voronoi(cloud(ring), { radius: 1 }));
    // Only the middle site has a bounded cell; the ring is the hull.
    expect(whole.length).toBe(1);
    expect((whole[0] as Cell).corners.length).toBe(60);

    const short = cells(await voronoi(cloud(ring.filter((_, i) => i !== 1)), { radius: 1 }));
    expect(short.length).toBe(1);
    expect((short[0] as Cell).corners.length).toBe(59);
    // Certified in both cooks, and not the same answer.
    expect(cornerSet(short[0] as Cell)).not.toEqual(cornerSet(whole[0] as Cell));

    // The halo therefore has to be at least `radius`; it is not a knob
    // that trades cells for speed. Widening it is what is free.
    const wider = cells(await voronoi(cloud(ring), { radius: 2 }));
    expect(cornerSet(wider[0] as Cell)).toEqual(cornerSet(whole[0] as Cell));
  });

  it("refuses an uncertified cell by name when asked to", async () => {
    await expect(voronoi(lattice(6), { radius: 3, onUncertified: "refuse" })).rejects.toThrow(
      /voronoiCells: the cell of the site at \(.*\) is not certified.*Raise radius above/s,
    );
  });

  it("certifies every cell of a cloud with no boundary sites left out", async () => {
    // 'refuse' is usable precisely when the cook must produce every cell:
    // drop the border first, then nothing is left to refuse.
    const src = jittered(9, 13);
    const P = src.attrs.point.require("P");
    const keep: number[] = [];
    for (let i = 0; i < src.pointCount; i++) {
      const x = P.data[i * P.tupleSize] as number;
      const z = P.data[i * P.tupleSize + 2] as number;
      if (x > 1.5 && x < 6.5 && z > 1.5 && z < 6.5) keep.push(i);
    }
    // Those interior sites all certify inside the FULL cloud...
    const got = cells(await voronoi(src, { radius: 3 }));
    for (const i of keep) expect(got.some((c) => c.site === src.attrs.point.require("seed").data[i])).toBe(true);
    // ...but on their own they become the boundary, which is the lesson.
    await expect(
      voronoi(permutePoints(src, Uint32Array.from(keep)), { radius: 3, onUncertified: "refuse" }),
    ).rejects.toThrow(/not certified/);
  });

  it("gives coincident sites the cell each would have had alone", async () => {
    const src = cloud([
      [2, 0, 2],
      [2, 0, 2],
      [0, 0, 2],
      [4, 0, 2],
      [2, 0, 0],
      [2, 0, 4],
      [0, 0, 0],
      [4, 0, 4],
      [0, 0, 4],
      [4, 0, 0],
    ]);
    const got = cells(await voronoi(src, { radius: 4 }));
    // Both copies certify, and they are the same polygon: a site at zero
    // distance is this site, not a competitor, so it names no bisector.
    const middle = got.filter((c) => c.corners.length > 0);
    expect(middle.length).toBe(2);
    expect(cornerSet(middle[0] as Cell)).toEqual(cornerSet(middle[1] as Cell));
  });

  it("takes a per-site radius as a field, gathered and certified per site", async () => {
    const src = jittered(9, 17);
    const P = src.attrs.point.require("P");
    // Half the cloud reaches, half reaches nothing — a per-site reach is
    // decided by ONE site, so there is no pair rule to disagree about.
    const reach = src.attrs.point.replace("reach", "f32", 1, 0);
    for (let i = 0; i < src.pointCount; i++)
      reach.set(i, (P.data[i * P.tupleSize] as number) < 4 ? 3 : 0);
    const uniform = cells(await voronoi(src, { radius: 3 }));
    const field = cells(await voronoi(src, { radius: attribute("reach") as FieldLike }));
    expect(field.length).toBeGreaterThan(5);
    expect(field.length).toBeLessThan(uniform.length);
    // A site that reached is unaffected by the ones that did not.
    const bySite = new Map(uniform.map((c) => [c.site, cornerSet(c)]));
    for (const c of field) expect(bySite.get(c.site)).toEqual(cornerSet(c));
  });

  it("builds nothing at radius 0, and says so rather than reporting none missed", async () => {
    const geo = await voronoi(lattice(4), { radius: 0, uncertifiedAttr: "missed" });
    expect(geo.primitiveCount).toBe(0);
    expect(geo.pointCount).toBe(0);
    // 16, not 0. A count of 0 beside 0 cells is the reading that would
    // tell an author their radius is fine; this path built nothing, so
    // every site is a site that got no cell.
    expect(geo.attrs.detail.require("missed").data[0]).toBe(16);
  });

  it("counts a field that reaches nowhere the same way", async () => {
    const src = lattice(4);
    src.attrs.point.replace("reach", "f32", 1, 0);
    const geo = await voronoi(src, {
      radius: attribute("reach") as FieldLike,
      uncertifiedAttr: "missed",
    });
    expect(geo.primitiveCount).toBe(0);
    expect(geo.attrs.detail.require("missed").data[0]).toBe(16);
  });

  it("names the param when a radius or a policy is impossible", async () => {
    await expect(voronoi(lattice(4), { radius: -1 })).rejects.toThrow(
      /voronoiCells: radius must be a finite number >= 0, got -1/,
    );
    await expect(voronoi(lattice(4), { onUncertified: "clip" })).rejects.toThrow(
      /unknown onUncertified "clip"; valid values: drop, refuse/,
    );
  });

  it("refuses a report slot that would delete something", async () => {
    await expect(voronoi(lattice(4), { radius: 3, areaAttr: "primtype" })).rejects.toThrow(
      /areaAttr "primtype" is the string attribute that marks these primitives as polylines/,
    );
    const src = lattice(4);
    src.attrs.detail.add("missed", "f32", 3, 0);
    await expect(voronoi(src, { radius: 3, uncertifiedAttr: "missed" })).rejects.toThrow(
      /uncertifiedAttr/,
    );
  });

  it("cooks byte-identically twice and survives a serialization round trip", async () => {
    const src = jittered(8, 29);
    const build = (): Graph => {
      const graph = new Graph(4242);
      const input = graph.add(dataInput, { items: [makeGeometryItem(src)] }, "in");
      const cellsNode = graph.add(voronoiCells, { radius: 3, areaAttr: "cellArea" }, "cells");
      graph.connect(input, "out", cellsNode, "in");
      graph.output(cellsNode, "out", "plots");
      return graph;
    };
    const a = await cook(build());
    const b = await cook(build());
    expect(cells(firstGeo(b.outputs.plots))).toEqual(cells(firstGeo(a.outputs.plots)));
    const round = deserializeGraph(serializeGraph(build()));
    expect(serializeGraph(round).nodes[1]?.params).toMatchObject({
      radius: 3,
      areaAttr: "cellArea",
    });
  });
});
