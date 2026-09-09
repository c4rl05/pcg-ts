import { describe, expect, it } from "vitest";
import { createPointCloud, type Geometry } from "../data/index.js";
import {
  add,
  attribute,
  component,
  constant,
  cos,
  fraction,
  length,
  mul,
  position,
  sub,
  type FieldLike,
} from "../fields/index.js";
import { fieldFromJson } from "../fields/fieldJson.js";
import { makeGeometryItem } from "../graph/index.js";
import { meshFromField } from "./index.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";

/** Run the node with the given params. */
async function mesh(params: Record<string, unknown>): Promise<Geometry> {
  return firstGeo((await runNode(meshFromField, params, {})).out);
}

/** A sphere of radius `r` centred at the origin, as a signed distance. */
const sphere = (r: number): FieldLike => sub(length(position()), constant(r));

interface Tri {
  readonly v: Array<[number, number, number]>;
  readonly n: Array<[number, number, number]>;
}

/** Every triangle of `geo`, positions and normals. */
function triangles(geo: Geometry): Tri[] {
  const P = geo.attrs.point.require("P");
  const N = geo.attrs.point.require("normal");
  const out: Tri[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p] as number;
    expect(geo.primVertexCount[p]).toBe(3);
    const v: Array<[number, number, number]> = [];
    const n: Array<[number, number, number]> = [];
    for (let k = 0; k < 3; k++) {
      const pt = geo.vertexToPoint[s + k] as number;
      v.push([P.get(pt, 0), P.get(pt, 1), P.get(pt, 2)]);
      n.push([N.get(pt, 0), N.get(pt, 1), N.get(pt, 2)]);
    }
    out.push({ v, n });
  }
  return out;
}

/** A vertex position as an exact key — no rounding, so a crack shows. */
const vkey = (v: readonly number[]): string => `${v[0]},${v[1]},${v[2]}`;

describe("meshFromField", () => {
  /** Worst distance from a vertex to the sphere of radius `r`. */
  const radialError = (geo: Geometry, r: number): number => {
    let worst = 0;
    for (const t of triangles(geo)) {
      for (const v of t.v) worst = Math.max(worst, Math.abs(Math.hypot(...v) - r));
    }
    return worst;
  };

  it("puts every vertex on the isosurface, to second order in the cell size", async () => {
    // The claim the whole node rests on, and the right way to state it is
    // a RATE rather than a constant. A vertex sits where linear
    // interpolation says the field crosses, so it misses a curved surface
    // by the field's curvature across one cell — order h^2 / r, which
    // means halving the cell size QUARTERS the error. A magic tolerance
    // would pass just as well on a node that placed vertices at edge
    // midpoints; this would not.
    const box = { field: sphere(5) as unknown as number, boundsMin: [-7, -7, -7], boundsMax: [7, 7, 7] };
    const coarse = await mesh({ ...box, cellSize: 0.8 });
    const fine = await mesh({ ...box, cellSize: 0.4 });
    expect(coarse.primitiveCount).toBeGreaterThan(500);
    expect(coarse.attrs.primitive.require("primtype").getString(0)).toBe("poly");
    const eC = radialError(coarse, 5);
    const eF = radialError(fine, 5);
    expect(eC).toBeLessThan(0.4 * (0.8 * 0.8) / 5);
    // Second order: the ratio is near 4, and certainly above 3.
    expect(eC / eF).toBeGreaterThan(3);
  });

  it("is watertight on a DIRECTED edge audit, at cell sizes that divide the radius", async () => {
    // Rewritten after an audit found the first version green by luck. An
    // undirected count of 2 per edge fails harmlessly whenever the radius
    // is a whole number of cells — the surface passes exactly through
    // lattice corners there, so crossings collapse and coincident
    // triangles appear — and that is a MEASUREMENT problem rather than a
    // crack. A closed, consistently wound mesh has every directed edge
    // matched by its reverse, which is the property that actually says
    // "no hole", and it holds at every cell size rather than at one.
    for (const [r, h] of [
      [4, 0.7],
      [4, 0.8],
      [4, 0.5],
      [4, 1],
      [3, 0.75],
      [3, 1],
    ] as const) {
      const geo = await mesh({
        field: sphere(r) as unknown as number,
        cellSize: h,
        boundsMin: [-r - 2, -r - 2, -r - 2],
        boundsMax: [r + 2, r + 2, r + 2],
      });
      const directed = new Map<string, number>();
      let zeroArea = 0;
      for (const t of triangles(geo)) {
        const k = t.v.map(vkey);
        if (k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) zeroArea++;
        for (let i = 0; i < 3; i++) {
          const e = `${k[i]}>${k[(i + 1) % 3]}`;
          directed.set(e, (directed.get(e) ?? 0) + 1);
        }
      }
      let unmatched = 0;
      for (const [e, n] of directed) {
        const [a, b] = e.split(">") as [string, string];
        if ((directed.get(`${b}>${a}`) ?? 0) !== n) unmatched++;
      }
      expect(unmatched, `r=${r} h=${h} unmatched directed edges`).toBe(0);
      // And no zero-area triangle ships: a repeated corner has no
      // orientation, so anything downstream that recomputes a normal
      // from the geometry would get a NaN.
      expect(zeroArea, `r=${r} h=${h} zero-area triangles`).toBe(0);
      expect(directed.size).toBeGreaterThan(500);
    }
  });

  it("tiles abutting cells without doubling the seam", async () => {
    // The half-open rule, which is what a partitioned world needs and
    // what the first version did not have: `floor(max / h) + 1` walks one
    // cube PAST a boundary, so two cells whose rectangles meet on a cell
    // multiple both emit the seam column. Measured at 344 doubled
    // triangles before the range read `ceil`.
    const common = { field: sphere(3) as unknown as number, cellSize: 0.5 };
    const whole = await mesh({ ...common, boundsMin: [-4, -4, -4], boundsMax: [4, 4, 4] });
    const left = await mesh({ ...common, boundsMin: [-4, -4, -4], boundsMax: [0, 4, 4] });
    const right = await mesh({ ...common, boundsMin: [0, -4, -4], boundsMax: [4, 4, 4] });
    const key = (t: Tri): string => t.v.map(vkey).join(" ");
    const union = [...triangles(left).map(key), ...triangles(right).map(key)].sort();
    const all = triangles(whole).map(key).sort();
    expect(all.length).toBeGreaterThan(500);
    // Exactly the whole surface: no triangle lost at the seam, and none
    // emitted twice.
    expect(union).toEqual(all);
  });

  it("looks through a param binding when screening the field", async () => {
    // A `param` carries its bound spec BESIDE the node rather than inside
    // it, so the walk that reads a node's own keys cannot see through
    // one. An audit smuggled `fraction` past the screen this way and
    // measured two windows disagreeing in their overlap, which is the
    // exact failure the screen exists to stop.
    const impure = fieldFromJson(
      { fn: "sub", args: [{ fn: "length", args: [{ fn: "position" }] }, { fn: "param", name: "r" }] },
      { r: fieldFromJson({ fn: "mul", args: [{ fn: "constant", value: 8 }, { fn: "fraction" }] }) },
    );
    await expect(
      mesh({ field: impure as unknown as number, cellSize: 1, boundsMin: [-4, -4, -4], boundsMax: [4, 4, 4] }),
    ).rejects.toThrow(/param "r".*uses "fraction"/s);
    // The control: the same shape with a plain number bound to the param
    // is pure and contours normally.
    const pure = fieldFromJson(
      { fn: "sub", args: [{ fn: "length", args: [{ fn: "position" }] }, { fn: "param", name: "r" }] },
      { r: 3 },
    );
    const geo = await mesh({
      field: pure as unknown as number,
      cellSize: 0.6,
      boundsMin: [-5, -5, -5],
      boundsMax: [5, 5, 5],
    });
    expect(geo.primitiveCount).toBeGreaterThan(100);
  });

  it("ships a real normal where the central difference aliases to zero", async () => {
    // The case the first version got wrong twice over. `cos(pi * x)`
    // sampled at whole-unit spacing has a central difference of exactly
    // zero everywhere, although the true gradient is at its MAXIMUM on
    // the surface — so a "the field is flat here" fallback is both wrong
    // about the field and useless as an orientation. The fallback is the
    // triangle's own geometric normal instead, which the surface really
    // does have.
    const geo = await mesh({
      field: cos(mul(component(position(), 0), Math.PI)) as unknown as number,
      isoValue: 0,
      cellSize: 1,
      boundsMin: [-3, -1, -1],
      boundsMax: [3, 1, 1],
    });
    expect(geo.primitiveCount).toBeGreaterThan(10);
    for (const t of triangles(geo)) {
      for (const n of t.n) {
        expect(Math.hypot(...n)).toBeCloseTo(1, 5);
        // The surface is a set of planes normal to X, so a normal that
        // fell back to +Y would be perpendicular to the truth.
        expect(Math.abs(n[0] as number)).toBeCloseTo(1, 5);
      }
    }
  });

  it("anchors the lattice to the WORLD, so two windows agree in their overlap", async () => {
    // The precondition that makes this partitionable, measured rather
    // than argued. Two boxes with DIFFERENT origins and different extents
    // contour the same sphere; every triangle whose vertices fall in the
    // shared region must be bit-identical, because cube (i, j, k) is the
    // same cube in both.
    const field = sphere(3) as unknown as number;
    const common = { field, cellSize: 0.5 };
    const wide = await mesh({ ...common, boundsMin: [-5, -5, -5], boundsMax: [5, 5, 5] });
    const narrow = await mesh({ ...common, boundsMin: [-1.2, -5, -5], boundsMax: [5, 5, 5] });
    const inBox = (t: Tri): boolean => t.v.every((v) => (v[0] as number) >= 0);
    const key = (t: Tri): string => t.v.map(vkey).join(" ");
    const a = triangles(wide).filter(inBox).map(key).sort();
    const b = triangles(narrow).filter(inBox).map(key).sort();
    expect(a.length).toBeGreaterThan(100);
    // Bit-identical, not merely close: the same expression on the same
    // operands, because the corners are at the same world positions.
    expect(b).toEqual(a);
  });

  it("faces outward, and `inside` turns it inside out without moving it", async () => {
    const common = {
      field: sphere(4) as unknown as number,
      cellSize: 0.9,
      boundsMin: [-6, -6, -6],
      boundsMax: [6, 6, 6],
    };
    const below = await mesh({ ...common, inside: "below" });
    const above = await mesh({ ...common, inside: "above" });
    // Below: the solid is inside the sphere, so the normal points out.
    for (const t of triangles(below)) {
      for (let k = 0; k < 3; k++) {
        const v = t.v[k] as [number, number, number];
        const n = t.n[k] as [number, number, number];
        expect(v[0] * n[0] + v[1] * n[1] + v[2] * n[2]).toBeGreaterThan(0);
      }
    }
    // Above: the same surface, every normal reversed.
    for (const t of triangles(above)) {
      for (let k = 0; k < 3; k++) {
        const v = t.v[k] as [number, number, number];
        const n = t.n[k] as [number, number, number];
        expect(v[0] * n[0] + v[1] * n[1] + v[2] * n[2]).toBeLessThan(0);
      }
    }
    // The point SET is the same; only the facing changed.
    const pts = (g: Geometry): string[] => triangles(g).flatMap((t) => t.v.map(vkey)).sort();
    expect(pts(above)).toEqual(pts(below));
  });

  it("winds each triangle to agree with the normals it carries", async () => {
    // Winding is derived from the field's gradient rather than tabulated
    // per sign case, so this asserts the derivation. On a BLOB rather
    // than a sphere: a convex surface passes this trivially, and the
    // cases worth catching are the saddles.
    const geo = await mesh({
      field: add(
        sub(length(position()), constant(4)),
        mul(
          fieldFromJson({
            fn: "fbm",
            base: "simplexNoise",
            opts: { frequency: 0.14, octaves: 3, seed: 7, normalized: true },
          }),
          constant(3),
        ),
      ) as unknown as number,
      cellSize: 0.45,
      boundsMin: [-8, -8, -8],
      boundsMax: [8, 8, 8],
    });
    expect(geo.primitiveCount).toBeGreaterThan(2000);
    for (const t of triangles(geo)) {
      const a = t.v[0] as [number, number, number];
      const b = t.v[1] as [number, number, number];
      const c = t.v[2] as [number, number, number];
      const ux = (b[0] as number) - (a[0] as number);
      const uy = (b[1] as number) - (a[1] as number);
      const uz = (b[2] as number) - (a[2] as number);
      const vx = (c[0] as number) - (a[0] as number);
      const vy = (c[1] as number) - (a[1] as number);
      const vz = (c[2] as number) - (a[2] as number);
      const gx = uy * vz - uz * vy;
      const gy = uz * vx - ux * vz;
      const gz = ux * vy - uy * vx;
      // The SUM of the three vertex normals, not vertex 0's alone: the
      // node chooses the winding by that sum, so that is the invariant.
      // A single vertex can disagree on a saddle and does, which an
      // audit measured at about 0.5% of the triangles of an fbm blob.
      const nx = (t.n[0]?.[0] ?? 0) + (t.n[1]?.[0] ?? 0) + (t.n[2]?.[0] ?? 0);
      const ny = (t.n[0]?.[1] ?? 0) + (t.n[1]?.[1] ?? 0) + (t.n[2]?.[1] ?? 0);
      const nz = (t.n[0]?.[2] ?? 0) + (t.n[1]?.[2] ?? 0) + (t.n[2]?.[2] ?? 0);
      // A degenerate triangle has no orientation to check.
      if (Math.hypot(gx, gy, gz) < 1e-12) continue;
      expect(gx * nx + gy * ny + gz * nz).toBeGreaterThanOrEqual(0);
    }
  });

  it("moves the surface with isoValue rather than re-cutting it", async () => {
    const common = {
      field: sphere(0) as unknown as number,
      cellSize: 0.6,
      boundsMin: [-8, -8, -8],
      boundsMax: [8, 8, 8],
    };
    for (const r of [2, 4, 6]) {
      const geo = await mesh({ ...common, isoValue: r });
      // Same h^2 / r bound as above: the surface really moved rather than
      // being re-cut, so a bigger radius is a FLATTER surface per cell
      // and the error falls as the radius rises.
      expect(radialError(geo, r), `radius ${r}`).toBeLessThan((0.4 * (0.6 * 0.6)) / r);
    }
  });

  it("emits nothing when the field never crosses, and keeps its shape", async () => {
    const geo = await mesh({
      field: constant(1) as unknown as number,
      isoValue: 0,
      cellSize: 1,
      boundsMin: [-3, -3, -3],
      boundsMax: [3, 3, 3],
    });
    expect(geo.primitiveCount).toBe(0);
    expect(geo.pointCount).toBe(0);
    expect(geo.attrs.point.names()).toContain("normal");
    // The COLUMN is there with nothing in it: a primitive domain of zero
    // elements has no element 0 to read, so what an empty result owes
    // downstream is the shape, not a value.
    expect(geo.attrs.primitive.names()).toContain("primtype");
  });

  it("refuses a field that is not a function of position, naming where", async () => {
    await expect(
      mesh({ field: fraction() as unknown as number, cellSize: 1, boundsMin: [-1, -1, -1], boundsMax: [1, 1, 1] }),
    ).rejects.toThrow(/uses "fraction", which is not a function of POSITION/);
    // Nested, so the walk has to find it rather than only check the root.
    await expect(
      mesh({
        field: mul(length(position()), fraction()) as unknown as number,
        cellSize: 1,
        boundsMin: [-1, -1, -1],
        boundsMax: [1, 1, 1],
      }),
    ).rejects.toThrow(/field expression at field\.args\[1\] uses "fraction"/);
    await expect(
      mesh({ field: attribute("density") as unknown as number, cellSize: 1, boundsMin: [-1, -1, -1], boundsMax: [1, 1, 1] }),
    ).rejects.toThrow(/uses "attribute".*no input geometry to read one from/s);
  });

  it("names the param when a size or a bound is impossible", async () => {
    const ok = { field: sphere(1) as unknown as number, boundsMin: [-2, -2, -2], boundsMax: [2, 2, 2] };
    await expect(mesh({ ...ok, cellSize: 0 })).rejects.toThrow(
      /cellSize must be a finite number > 0, got 0/,
    );
    await expect(mesh({ ...ok, cellSize: 1, isoValue: Number.NaN })).rejects.toThrow(
      /isoValue must be finite/,
    );
    await expect(mesh({ ...ok, cellSize: 1, inside: "outside" })).rejects.toThrow(
      /unknown inside "outside"; valid values: below, above/,
    );
    await expect(
      mesh({ field: sphere(1) as unknown as number, cellSize: 1, boundsMin: [-2, Number.NaN, -2], boundsMax: [2, 2, 2] }),
    ).rejects.toThrow(/boundsMin and boundsMax must be finite/);
  });

  it("refuses a lattice too fine to sample before it allocates it", async () => {
    await expect(
      mesh({
        field: sphere(1) as unknown as number,
        cellSize: 0.001,
        boundsMin: [-50, -50, -50],
        boundsMax: [50, 50, 50],
      }),
    ).rejects.toThrow(/would need \d+ field samples \(max \d+\).*grows with the CUBE/s);
  });

  it("takes its region from a connected geometry without moving the lattice", async () => {
    // The distinction volumeSample does not draw. A connected cloud says
    // WHICH part of the world to contour; the cubes are still the world's
    // cubes, so the triangles in the overlap are the same floats as when
    // the region came from params.
    const cloud = createPointCloud(2);
    const P = cloud.attrs.point.require("P");
    P.setTuple(0, [-1.3, -4.4, -4.4]);
    P.setTuple(1, [4.4, 4.4, 4.4]);
    const field = sphere(3) as unknown as number;
    const fromInput = firstGeo(
      (await runNode(meshFromField, { field, cellSize: 0.5 }, { in: [makeGeometryItem(cloud)] })).out,
    );
    const fromParams = await mesh({ field, cellSize: 0.5, boundsMin: [-5, -5, -5], boundsMax: [5, 5, 5] });
    const inBox = (t: Tri): boolean => t.v.every((v) => (v[0] as number) >= 0);
    const key = (t: Tri): string => t.v.map(vkey).join(" ");
    const a = triangles(fromParams).filter(inBox).map(key).sort();
    const b = triangles(fromInput).filter(inBox).map(key).sort();
    expect(a.length).toBeGreaterThan(100);
    expect(b).toEqual(a);
    await expect(
      runNode(meshFromField, { field, cellSize: 1 }, { in: [makeGeometryItem(createPointCloud(0))] }),
    ).rejects.toThrow(/connected input needs points with a "P" attribute/);
  });

  it("gives the same surface however the corners are split into chunks", async () => {
    // The field is sampled in chunks so a budgeted cook can cancel inside
    // the resolve, and a chunk boundary falls wherever the corner count
    // puts it. These two boxes have different extents, so their lattices
    // are different sizes and their chunks land in different places —
    // and the overlap has to be bit-identical anyway, because a
    // position-pure field cannot tell one split from another. That is
    // the property the purity screen buys, stated as a test rather than
    // as a comment.
    const field = sphere(5) as unknown as number;
    const common = { field, cellSize: 0.35 };
    // Both lattices are well over one chunk (65,536 corners): 55^3 and
    // 61^3 of them, so neither is the single-chunk path.
    const wide = await mesh({ ...common, boundsMin: [-9, -9, -9], boundsMax: [9, 9, 9] });
    const tall = await mesh({ ...common, boundsMin: [-8, -9, -10], boundsMax: [9, 10, 9] });
    const inBox = (t: Tri): boolean => t.v.every((v) => (v[0] as number) >= 0);
    const key = (t: Tri): string => t.v.map(vkey).join(" ");
    const a = triangles(wide).filter(inBox).map(key).sort();
    const b = triangles(tall).filter(inBox).map(key).sort();
    expect(a.length).toBeGreaterThan(1000);
    expect(b).toEqual(a);
  });

  it("can be cancelled inside the resolve, not only around it", async () => {
    // The reason for chunking at all. A partitioned world cooks under a
    // deadline and cancels between checks, so one resolve over the whole
    // lattice was a single uninterruptible call however small the budget
    // — the check before it could only ever fire before any work. Counted
    // rather than asserted in prose: a multi-chunk lattice has to check
    // several times, and a single-chunk one is allowed not to.
    let checks = 0;
    const run = async (cellSize: number): Promise<number> => {
      checks = 0;
      await meshFromField.execute({
        inputs: { in: [] },
        params: {
          ...meshFromField.defaultParams,
          field: sphere(5) as unknown as number,
          cellSize,
          boundsMin: [-9, -9, -9],
          boundsMax: [9, 9, 9],
        },
        seed: 1,
        checkCancelled() {
          checks++;
        },
      });
      return checks;
    };
    // 55^3 = 166,375 corners, three chunks of 65,536.
    const many = await run(0.35);
    // 8^3 = 512 corners, one chunk.
    const few = await run(3);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(3);

    // And a cancellation raised inside the resolve really does stop the
    // cook, rather than being swallowed until the meshing loop.
    // Synchronously, because this node's execute is: `resolveOn` is the
    // CPU resolver and returns a column rather than a promise, which is
    // itself the reason the fifth precondition holds for free — there is
    // no GPU path for two cells to disagree across.
    let n = 0;
    expect(() =>
      meshFromField.execute({
        inputs: { in: [] },
        params: {
          ...meshFromField.defaultParams,
          field: sphere(5) as unknown as number,
          cellSize: 0.35,
          boundsMin: [-9, -9, -9],
          boundsMax: [9, 9, 9],
        },
        seed: 1,
        checkCancelled() {
          if (++n === 2) throw new Error("budget spent");
        },
      }),
    ).toThrow("budget spent");
    // Stopped at the SECOND check, which is inside the resolve loop: a
    // whole-lattice resolve would have run to completion after the one
    // check that preceded it.
    expect(n).toBe(2);
  });

  it("cooks byte-identically twice", async () => {
    const params = {
      field: sphere(3) as unknown as number,
      cellSize: 0.7,
      boundsMin: [-5, -5, -5],
      boundsMax: [5, 5, 5],
    };
    const a = triangles(await mesh(params)).map((t) => t.v.map(vkey).join(" "));
    const b = triangles(await mesh(params)).map((t) => t.v.map(vkey).join(" "));
    expect(b).toEqual(a);
    expect(a.length).toBeGreaterThan(100);
  });
});
