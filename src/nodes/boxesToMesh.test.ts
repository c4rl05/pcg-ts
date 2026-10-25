/**
 * `boxesToMesh`: every cell's box as mesh faces.
 *
 * Expectations are derived BY HAND from the description — meshPrimitive's
 * box layout (a face normal to axis a spanned by u = (a + 1) % 3 and
 * v = (a + 2) % 3, u fastest, triangles (a, b, c), (b, d, c) on a max side
 * and reversed on a min side) laid on the stored corners — or checked as
 * geometric properties (outward winding, closed solid), never recorded from
 * a run. Coordinates are dyadic wherever a result is compared exactly.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { Graph, type NodeHandle, cook, makeGeometryItem } from "../graph/index.js";
import {
  deserializeGraph,
  fieldFromJson,
  meshPrimitive,
  parseFieldText,
  pointGrid,
  serializeGraph,
  setAttribute,
  setBounds,
} from "./index.js";
import "../spawn/index.js";
import { boxesToMesh } from "./boxesToMesh.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

// ---------------------------------------------------------------------------
// Harness

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

async function mesh(geo: Geometry, params: Record<string, unknown> = {}, seed = 1): Promise<Geometry> {
  const outputs = await runNode(boxesToMesh, params, { in: [makeGeometryItem(geo)] }, seed);
  return firstGeo(outputs.out);
}

const f = (text: string) => fieldFromJson(parseFieldText(text));

function col(geo: Geometry, name: string, domain: "point" | "detail" = "point"): number[] {
  const set = geo.attrs[domain];
  const a = set.require(name);
  return Array.from(a.data.slice(0, set.count * a.tupleSize));
}

function tuples(geo: Geometry, name: string, size: number): number[][] {
  const c = col(geo, name);
  return Array.from({ length: c.length / size }, (_, i) => c.slice(i * size, i * size + size));
}

function tris(geo: Geometry): number[][] {
  const v = Array.from(geo.vertexToPoint);
  return Array.from({ length: v.length / 3 }, (_, t) => v.slice(t * 3, t * 3 + 3));
}

type Box = [number[], number[]];

/** Cells with the given boxes, seeds 100, 101, ... and an i32 `cell` index. */
function cells(list: Box[]): Geometry {
  const geo = createPointCloud(list.length);
  const pts = geo.attrs.point;
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  const seed = pts.require("seed");
  const cell = pts.add("cellId", "i32", 1, -1);
  list.forEach(([a, b], i) => {
    lo.setTuple(i, a);
    hi.setTuple(i, b);
    seed.set(i, 100 + i);
    cell.set(i, i);
  });
  return geo;
}

const sub = (a: number[], b: number[]) => a.map((x, k) => x - b[k]);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Each triangle's (unnormalized) geometric normal, from its winding. */
function faceNormals(geo: Geometry): number[][] {
  const P = tuples(geo, "P", 3);
  return tris(geo).map(([a, b, c]) => cross(sub(P[b], P[a]), sub(P[c], P[a])));
}

/** shellSplit's codes: the outward axis of each side. */
const OUTWARD: Record<number, number[]> = {
  0: [0, -1, 0],
  1: [0, 0, -1],
  2: [0, 0, 1],
  3: [-1, 0, 0],
  4: [1, 0, 0],
  5: [0, 1, 0],
};

// ---------------------------------------------------------------------------

describe("boxesToMesh: layout", () => {
  it("builds the max-x face by hand: the stored corners, points y fastest then z, wound outward, uv in the face frame", async () => {
    const out = await mesh(cells([[[0, 0, 0], [2, 4, 6]]]), { faces: ["east"] });
    expect(tuples(out, "P", 3)).toEqual([
      [2, 0, 0],
      [2, 4, 0],
      [2, 0, 6],
      [2, 4, 6],
    ]);
    // The east wall's frame: along -z (left to right seen from +x), up +y.
    expect(tuples(out, "uv", 2)).toEqual([
      [1, 0],
      [1, 1],
      [0, 0],
      [0, 1],
    ]);
    expect(tris(out)).toEqual([
      [0, 1, 2],
      [1, 3, 2],
    ]);
    expect(col(out, "boxSide")).toEqual([4, 4, 4, 4]);
    expect(out.primitiveCount).toBe(2);
    expect(Array.from(out.primVertexCount)).toEqual([3, 3]);
  });

  it("builds the floor by hand: u = z, v = x, at min y, the winding reversed so it faces down", async () => {
    const out = await mesh(cells([[[0, 0, 0], [2, 4, 6]]]), { faces: ["floor"] });
    expect(tuples(out, "P", 3)).toEqual([
      [0, 0, 0],
      [0, 0, 6],
      [2, 0, 0],
      [2, 0, 6],
    ]);
    expect(tris(out)).toEqual([
      [0, 2, 1],
      [1, 2, 3],
    ]);
    for (const nrm of faceNormals(out)) expect(nrm).toEqual([0, -12, 0]);
  });

  it("has a unit meshPrimitive box's points, triangles and normals laid on the cell, with the default faces (flip included)", async () => {
    for (const flip of [false, true]) {
      const box = await mesh(cells([[[0, 0, 0], [2, 4, 8]]]), { subdivisions: [2, 4, 8], normals: true, flip });
      const prim = firstGeo(
        (await runNode(meshPrimitive, { shape: "box", size: [2, 4, 8], center: [1, 2, 4], subdivisions: [2, 4, 8], normals: true, flip }, {})).out,
      );
      expect(box.pointCount).toBe(prim.pointCount);
      for (const name of ["P", "normal"]) expect(col(box, name)).toEqual(col(prim, name));
      // The uv is NOT the primitive's: that one is mirrored on three sides.
      expect(col(box, "uv")).not.toEqual(col(prim, "uv"));
      expect(Array.from(box.vertexToPoint)).toEqual(Array.from(prim.vertexToPoint));
      expect(Array.from(box.primVertexStart)).toEqual(Array.from(prim.primVertexStart));
      expect(box.attrs.primitive.require("primtype").getString(0)).toBe("poly");
    }
  });

  it("every triangle faces OUTWARD (inward under flip), and the written normal is its winding's", async () => {
    const box: Box = [[-3, 1, 2], [5, 2.5, 6]];
    for (const flip of [false, true]) {
      const out = await mesh(cells([box]), { normals: true, flip, subdivisions: [3, 2, 1] });
      const side = col(out, "boxSide");
      const N = tuples(out, "normal", 3);
      const sign = flip ? -1 : 1;
      tris(out).forEach((t, k) => {
        const g = faceNormals(out)[k];
        const want = OUTWARD[side[t[0]]].map((x) => x * sign + 0);
        // Parallel to the side's axis and pointing its way.
        expect(cross(g, want).map(Math.abs)).toEqual([0, 0, 0]);
        expect(dot(g, want)).toBeGreaterThan(0);
        for (const v of t) expect(N[v]).toEqual(want);
      });
    }
  });

  it("all six faces make a CLOSED solid: every edge used twice, once each way, once corners are welded", async () => {
    const out = await mesh(cells([[[0, 0, 0], [3, 2, 1]]]), { subdivisions: [3, 2, 2] });
    const P = tuples(out, "P", 3).map((p) => p.join(","));
    const edges = new Map<string, number>();
    for (const [a, b, c] of tris(out)) {
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = `${P[u]}>${P[v]}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of edges) {
      expect(count).toBe(1);
      const [u, v] = key.split(">");
      expect(edges.get(`${v}>${u}`)).toBe(1);
    }
    // Leave the floor out and the four bottom edges' grid segments open.
    const open = await mesh(cells([[[0, 0, 0], [3, 2, 1]]]), { faces: ["east", "west", "ceiling", "north", "south"] });
    const Q = tuples(open, "P", 3).map((p) => p.join(","));
    const dir = new Set<string>();
    for (const [a, b, c] of tris(open)) for (const [u, v] of [[a, b], [b, c], [c, a]]) dir.add(`${Q[u]}>${Q[v]}`);
    const boundary = [...dir].filter((k) => !dir.has(k.split(">").reverse().join(">")));
    expect(boundary.length).toBe(4);
    for (const k of boundary) for (const p of k.split(">")) expect(p.split(",")[1]).toBe("0");
  });

  it("emits cell by cell, faces in the listed order, and counts cells x the listed grids", async () => {
    const out = await mesh(cells([[[0, 0, 0], [1, 1, 1]], [[5, 0, 0], [7, 1, 1]]]), {
      faces: ["ceiling", "south"],
      subdivisions: [2, 1, 3],
      cellAttr: "cell",
    });
    // ceiling (y): u = z (3), v = x (2) -> 4 * 3 points, 12 triangles;
    // south (z): u = x (2), v = y (1) -> 3 * 2 points, 4 triangles.
    expect(out.pointCount).toBe(2 * (12 + 6));
    expect(out.primitiveCount).toBe(2 * (12 + 4));
    expect(col(out, "boxSide")).toEqual([...Array(12).fill(5), ...Array(6).fill(1), ...Array(12).fill(5), ...Array(6).fill(1)]);
    expect(col(out, "cell")).toEqual([...Array(18).fill(0), ...Array(18).fill(1)]);
    // The interior grid lines are in proportion, the ends exact.
    const xs = [...new Set(tuples(out, "P", 3).slice(18).map((p) => p[0]))].sort((a, b) => a - b);
    expect(xs).toEqual([5, 6, 7]);
  });

  it("takes per-cell subdivisions from a field, with the cell's box names", async () => {
    const out = await mesh(cells([[[0, 0, 0], [1, 1, 1]], [[0, 0, 0], [3, 1, 1]]]), {
      faces: ["south"],
      subdivisions: f('vec(box("sx"), 1, 1)'),
    });
    // south: u = x, v = y -> (sx + 1) * 2 points per cell.
    expect(out.pointCount).toBe(4 + 8);
    expect(tuples(out, "P", 3).slice(4).map((p) => p[0])).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });
});

describe("boxesToMesh: grid lines", () => {
  it("a grid line meant to fall on 0 is exactly 0, not a 1e-16 residue, and the ends are the stored corners", async () => {
    // y from -3 to 2 in five: lines at -3, -2, -1, 0, 1, 2.
    const out = await mesh(cells([[[0, -3, -0.003], [1, 2, 0.006]]]), { faces: ["west"], subdivisions: [1, 5, 3] });
    const ys = [...new Set(tuples(out, "P", 3).map((p) => p[1]))].sort((a, b) => a - b);
    expect(ys).toEqual([-3, -2, -1, 0, 1, 2]);
    const zs = [...new Set(tuples(out, "P", 3).map((p) => p[2]))].sort((a, b) => a - b);
    expect(zs).toEqual([Math.fround(-0.003), 0, Math.fround(0.003), Math.fround(0.006)]);
  });

  it("the field examples its descriptions give parse and cook", async () => {
    const out = await mesh(cells([[[0, 0, 0], [2.5, 1.2, 1]]]), {
      faces: ["south"],
      subdivisions: f('vec(max(floor(box("sx")), 1), max(floor(box("sy")), 1), 1)'),
    });
    // 2 columns by 1 row.
    expect(out.pointCount).toBe(6);
  });
});

/**
 * shellSplit's face frame, from its description: [axis, sign] of along and
 * of up per face code (0 floor, 1 south, 2 north, 3 west, 4 east, 5 ceiling).
 */
const FRAME: Record<number, { along: [number, number]; up: [number, number] }> = {
  0: { along: [0, 1], up: [2, 1] },
  1: { along: [0, -1], up: [1, 1] },
  2: { along: [0, 1], up: [1, 1] },
  3: { along: [2, 1], up: [1, 1] },
  4: { along: [2, -1], up: [1, 1] },
  5: { along: [0, 1], up: [2, -1] },
};

describe("boxesToMesh: uv is the face frame", () => {
  it("u runs along and v up, 0..1, on every side, for every point and every subdivision", async () => {
    const box: Box = [[-3, 1, 2], [5, 2.5, 6]];
    const out = await mesh(cells([box]), { subdivisions: [4, 2, 2] });
    const P = tuples(out, "P", 3);
    const uv = tuples(out, "uv", 2);
    const side = col(out, "boxSide");
    const frac = (x: number, [axis, sign]: [number, number]) => {
      const lo = Math.fround(box[0][axis]);
      const hi = Math.fround(box[1][axis]);
      return sign > 0 ? (x - lo) / (hi - lo) : (hi - x) / (hi - lo);
    };
    P.forEach((p, i) => {
      const fr = FRAME[side[i]];
      expect(uv[i][0]).toBeCloseTo(frac(p[fr.along[0]], fr.along), 6);
      expect(uv[i][1]).toBeCloseTo(frac(p[fr.up[0]], fr.up), 6);
    });
    // Every side's corners reach 0 and 1 exactly.
    for (let code = 0; code < 6; code++) {
      const us = uv.filter((_, i) => side[i] === code);
      expect(Math.min(...us.map((t) => t[0]))).toBe(0);
      expect(Math.max(...us.map((t) => t[0]))).toBe(1);
      expect(Math.min(...us.map((t) => t[1]))).toBe(0);
      expect(Math.max(...us.map((t) => t[1]))).toBe(1);
    }
  });

  it("is UNMIRRORED seen from outside: every outward-wound triangle is counter-clockwise in uv too", async () => {
    const out = await mesh(cells([[[0, 0, 0], [3, 2, 1]]]), { subdivisions: [3, 2, 2] });
    const uv = tuples(out, "uv", 2);
    for (const [a, b, c] of tris(out)) {
      const area = (uv[b][0] - uv[a][0]) * (uv[c][1] - uv[a][1]) - (uv[b][1] - uv[a][1]) * (uv[c][0] - uv[a][0]);
      expect(area).toBeGreaterThan(0);
    }
  });
});

describe("boxesToMesh: what it carries", () => {
  it("carries every cell attribute but P, rot and scale onto each point of its mesh, strings and detail included", async () => {
    const geo = cells([[[0, 0, 0], [1, 1, 1]], [[2, 0, 0], [3, 2, 1]]]);
    const pts = geo.attrs.point;
    const piece = pts.add("piece", "string", 1, "");
    piece.setString(0, "wall");
    piece.setString(1, "roof");
    pts.require("color").setTuple(1, [0.5, 0.25, 0.125, 1]);
    pts.require("P").setTuple(1, [9, 9, 9]);
    pts.require("scale").setTuple(1, [3, 3, 3]);
    pts.require("rot").setTuple(1, [0, Math.SQRT1_2, 0, Math.SQRT1_2]);
    geo.attrs.detail.add("lot", "f32", 1, 0).set(0, 7);
    const out = await mesh(geo, { faces: ["north", "west"] });
    const o = out.attrs.point;
    expect(o.get("rot")).toBeUndefined();
    expect(o.get("scale")).toBeUndefined();
    const names = o.names();
    for (const name of ["P", "boundsMin", "boundsMax", "density", "color", "seed", "cellId", "piece", "uv", "boxSide"]) expect(names).toContain(name);
    expect(col(out, "seed")).toEqual([...Array(8).fill(100), ...Array(8).fill(101)]);
    expect(col(out, "cellId")).toEqual([...Array(8).fill(0), ...Array(8).fill(1)]);
    expect(Array.from({ length: 16 }, (_, i) => o.require("piece").getString(i))).toEqual([...Array(8).fill("wall"), ...Array(8).fill("roof")]);
    expect(tuples(out, "color", 4)[15]).toEqual([0.5, 0.25, 0.125, 1]);
    expect(tuples(out, "boundsMax", 3)[15]).toEqual([3, 2, 1]);
    expect(col(out, "lot", "detail")).toEqual([7]);
    // P comes from the box alone: the cell's P, rot and scale are not read.
    expect(tuples(out, "P", 3).slice(8, 12)).toEqual([
      [2, 0, 1],
      [3, 0, 1],
      [2, 2, 1],
      [3, 2, 1],
    ]);
  });

  it("a ROTATED, scaled, moved cell gets exactly the mesh an untransformed one does", async () => {
    const plain = cells([[[1, 2, 3], [4, 6, 8]]]);
    const turned = cells([[[1, 2, 3], [4, 6, 8]]]);
    turned.attrs.point.require("rot").setTuple(0, [0.5, 0.5, 0.5, 0.5]);
    turned.attrs.point.require("scale").setTuple(0, [2, -1, 3]);
    turned.attrs.point.require("P").setTuple(0, [-5, 0, 5]);
    expect(snapshotGeometry(await mesh(turned, { normals: true }))).toEqual(snapshotGeometry(await mesh(plain, { normals: true })));
  });

  it("does not write its input", async () => {
    const geo = cells([[[0, 0, 0], [1, 2, 3]]]);
    const before = snapshotGeometry(geo);
    await mesh(geo, { cellAttr: "c", normals: true });
    expect(snapshotGeometry(geo)).toEqual(before);
  });
});

describe("boxesToMesh: degenerate boxes and empty input", () => {
  it("KEEPS a box of no height: floor and ceiling coincide back to back, the walls are zero-area, the counts unchanged", async () => {
    const out = await mesh(cells([[[0, 1, 0], [2, 1, 2]]]), { normals: true });
    expect(out.pointCount).toBe(24);
    expect(out.primitiveCount).toBe(12);
    const side = col(out, "boxSide");
    const P = tuples(out, "P", 3);
    const gn = faceNormals(out);
    tris(out).forEach((t, k) => {
      const s = side[t[0]];
      if (s === 0 || s === 5) {
        for (const v of t) expect(P[v][1]).toBe(1);
        expect(dot(gn[k], OUTWARD[s])).toBeGreaterThan(0);
      } else {
        expect(gn[k].map(Math.abs)).toEqual([0, 0, 0]);
      }
    });
  });

  it("a box of no volume at all is 24 points on one spot", async () => {
    const out = await mesh(cells([[[1, 1, 1], [1, 1, 1]]]));
    expect(out.pointCount).toBe(24);
    expect(new Set(tuples(out, "P", 3).map((p) => p.join(","))).size).toBe(1);
  });

  it("no cells give an empty mesh, with its columns", async () => {
    const out = await mesh(cells([]), { normals: true, cellAttr: "cell" });
    expect(out.pointCount).toBe(0);
    expect(out.primitiveCount).toBe(0);
    for (const name of ["P", "uv", "normal", "boxSide", "cell", "color"]) expect(out.attrs.point.get(name)).toBeDefined();
  });

  it("writes -0 corners as +0", async () => {
    const out = await mesh(cells([[[-0, -0, -0], [1, 1, 1]]]));
    for (const v of col(out, "P")) expect(Object.is(v, -0)).toBe(false);
  });
});

describe("boxesToMesh: refusals", () => {
  const one = () => cells([[[0, 0, 0], [1, 1, 1]]]);

  it("refuses an unknown, repeated or missing face, naming the valid sides", async () => {
    const unknown = await rejection(mesh(one(), { faces: ["east", "top"] }));
    expect(unknown).toMatch(/boxesToMesh: param "faces" entry 1 is "top"/);
    expect(unknown).toContain('"ceiling" (max y)');
    const near = await rejection(mesh(one(), { faces: ["nort"] }));
    expect(near).toContain('which names no side of a box (did you mean "north"?). Valid: "floor"');
    expect(unknown).toContain('which names no side of a box. Valid: "floor"');
    expect(await rejection(mesh(one(), { faces: ["east", "east"] }))).toMatch(/lists "east" twice/);
    expect(await rejection(mesh(one(), { faces: [] }))).toMatch(/"faces" is empty/);
    expect(await rejection(mesh(one(), { faces: "east" }))).toMatch(/not a list/);
  });

  it("refuses subdivisions that are not whole numbers of at least 1, plain or per cell, naming the cell", async () => {
    expect(await rejection(mesh(one(), { subdivisions: [1, 1.5, 1] }))).toMatch(/"subdivisions" is 1.5 along y on cell 0/);
    expect(await rejection(mesh(one(), { subdivisions: [0, 1, 1] }))).toMatch(/"subdivisions" is 0 along x on cell 0/);
    expect(await rejection(mesh(one(), { subdivisions: [1, Infinity, 1] }))).toMatch(/param "subdivisions" \(component 1\) is Infinity/);
    const two = cells([[[0, 0, 0], [1, 1, 1]], [[0, 0, 0], [0.5, 1, 1]]]);
    expect(await rejection(mesh(two, { subdivisions: f('vec(box("sx"), 1, 1)') }))).toMatch(/is 0.5 along x on cell 1/);
    expect(await rejection(mesh(one(), { subdivisions: f("vec(1, 1)") }))).toMatch(/three components/);
  });

  it("caps the mesh at 4194304 points after the field resolves, and a count past it never wraps", async () => {
    // 2^32 would wrap to 0 in a u32 column; 2^32 + 2 to 2 (it reaches the
    // node as f32, 2^32, as every vec3 param does).
    for (const s of [2 ** 32, 2 ** 32 + 2, 2 ** 33, 2 ** 22 + 1]) {
      expect(await rejection(mesh(one(), { subdivisions: [s, 1, 1], faces: ["floor"] }))).toMatch(
        new RegExp(`param "subdivisions" is ${Math.fround(s)} along x on cell 0, past the 4194304 points`),
      );
    }
    // 3001 * 3001 points on one floor: refused as a total, naming the cell.
    const big = await rejection(mesh(one(), { subdivisions: f("vec(3000, 1, 3000)"), faces: ["floor"] }));
    expect(big).toMatch(/more than 4194304 points from the input's 1 cell\(s\) — cell 0 builds 9006001/);
    // Two cells each under the cap, over it together: the second is named.
    const two = cells([[[0, 0, 0], [1, 1, 1]], [[0, 0, 0], [1, 1, 1]]]);
    expect(await rejection(mesh(two, { subdivisions: [2000, 1, 1100], faces: ["floor"] }))).toMatch(
      /cell 1 builds 2203101 .* the running total reached 4406202/,
    );
  });

  it("refuses a missing or mistyped box, and a box inside out or not finite, naming the cell and the axis", async () => {
    const bare = new Geometry();
    bare.attrs.point.add("P", "f32", 3, [0, 0, 0]);
    bare.attrs.point.resize(1);
    expect(await rejection(mesh(bare))).toMatch(/has no "boundsMin" point attribute/);
    expect(await rejection(mesh(cells([[[0, 2, 0], [1, 1, 1]]])))).toMatch(/cell 0's box is INSIDE OUT along y — boundsMin 2 is above boundsMax 1/);
    expect(await rejection(mesh(cells([[[0, 0, 0], [1, 1, 1]], [[0, 0, NaN], [1, 1, 1]]])))).toMatch(/cell 1's box is not finite along z/);
  });

  it("refuses a written name the cells carry, or two written names that collide", async () => {
    const geo = one();
    geo.attrs.point.add("uv", "f32", 2, 0);
    expect(await rejection(mesh(geo))).toMatch(/the cells carry a "uv" point attribute .*\(removeAttribute\)/);
    const faced = one();
    faced.attrs.point.add("boxSide", "i32", 1, 0);
    expect(await rejection(mesh(faced))).toMatch(/"boxSide" is param "faceAttr"/);
    expect(await rejection(mesh(one(), { faceAttr: "color" }))).toMatch(/cells carry a "color"/);
    expect(await rejection(mesh(one(), { faceAttr: "P" }))).toMatch(/param "faceAttr" is "P"/);
    expect(await rejection(mesh(one(), { cellAttr: "uv" }))).toMatch(/already the face uv/);
    expect(await rejection(mesh(one(), { faceAttr: "k", cellAttr: "k" }))).toMatch(/param "cellAttr" is "k", which is already param "faceAttr"/);
    // Empty names write nothing and collide with nothing.
    const none = await mesh(one(), { faceAttr: "", cellAttr: "" });
    expect(none.attrs.point.get("boxSide")).toBeUndefined();
  });
});

describe("boxesToMesh: determinism and JSON", () => {
  function build(order: "forward" | "reverse"): Graph {
    const g = new Graph(31);
    const add = {
      grid: () => g.add(pointGrid, { countX: 3, countY: 1, countZ: 2, spacing: [10, 10, 10] }, "grid"),
      box: () =>
        g.add(
          setBounds,
          {
            boundsMin: fieldFromJson({ fn: "position" }),
            boundsMax: f('position() + vec(1 + floor(randomField("w") * 4), 6, 4)'),
          },
          "box",
        ),
      tint: () => g.add(setAttribute, { name: "r", type: "f32", value: fieldFromJson({ fn: "randomField", key: "r" }) }, "tint"),
      mesh: () =>
        g.add(boxesToMesh, { subdivisions: f('vec(box("sx"), 2, 1)'), faces: ["floor", "north", "east"], normals: true, cellAttr: "cell" }, "mesh"),
    };
    const ids = order === "forward" ? ["grid", "box", "tint", "mesh"] : ["mesh", "tint", "box", "grid"];
    const h: Record<string, NodeHandle> = {};
    for (const id of ids) h[id] = add[id as keyof typeof add]();
    g.connect(h.grid, "out", h.box, "in");
    g.connect(h.box, "out", h.tint, "in");
    g.connect(h.tint, "out", h.mesh, "in");
    g.output(h.mesh, "out", "mesh");
    return g;
  }

  it("cooks byte-identically across fresh graphs and node insertion orders", async () => {
    const a = firstGeo((await cook(build("forward"))).outputs.mesh);
    const b = firstGeo((await cook(build("forward"))).outputs.mesh);
    const c = firstGeo((await cook(build("reverse"))).outputs.mesh);
    expect(a.pointCount).toBeGreaterThan(6 * 3 * 4);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
    expect(snapshotGeometry(c)).toEqual(snapshotGeometry(a));
  });

  it("round-trips through the serialized format, field params included, and cooks the same", async () => {
    const text = JSON.stringify(serializeGraph(build("forward")));
    const back = deserializeGraph(JSON.parse(text));
    expect(JSON.stringify(serializeGraph(back))).toBe(text);
    const a = firstGeo((await cook(build("forward"))).outputs.mesh);
    const b = firstGeo((await cook(back)).outputs.mesh);
    expect(snapshotGeometry(b)).toEqual(snapshotGeometry(a));
  });
});
