import { describe, expect, it } from "vitest";
import {
  Geometry,
  createPointCloud,
  createPolyline,
  createTriangleMesh,
  primitiveTypeCounts,
  setPolylineTopology,
} from "../data/index.js";
import {
  add,
  attribute,
  component,
  constant,
  evaluateField,
  position,
  randomField,
  vec,
} from "../fields/index.js";
import { Graph, cook, makeGeometryItem } from "../graph/index.js";
import {
  copyToPoints,
  type CopyToPointsParams,
  deserializeGraph,
  extrudePolygon,
  fieldFromJson,
  getNodeType,
  jitterPoints,
  mergePoints,
  mergePrimitives,
  orientAlongVector,
  pointGrid,
  pointScatterInBounds,
  serializeGraph,
  setBounds,
  splitBox,
  surfaceSample,
  transformPoints,
} from "./index.js";
import { quatFromEulerDeg, rotateVec } from "./util.js";
import {
  firstGeo,
  permutePoints,
  positionsOf,
  runNode,
  shuffledOrder,
  snapshotGeometry,
} from "./nodes.testsupport.js";
import { hashCombine, hashFloat } from "../random/index.js";

function cloudAt(positions: number[][]): ReturnType<typeof createPointCloud> {
  const geo = createPointCloud(positions.length);
  const P = geo.attrs.point.require("P");
  positions.forEach((p, i) => P.setTuple(i, p));
  return geo;
}

/** `cloudAt` plus a genuine per-point `seed` — half of a point's identity. */
function seededCloudAt(positions: number[][]): ReturnType<typeof createPointCloud> {
  const geo = cloudAt(positions);
  const seed = geo.attrs.point.require("seed");
  for (let i = 0; i < positions.length; i++) seed.set(i, hashCombine(0x5eed, i));
  return geo;
}

describe("transformPoints", () => {
  it("translates, rotates (XYZ degrees), and scales positions", async () => {
    const input = cloudAt([[1, 0, 0]]);
    const translated = firstGeo(
      (
        await runNode(transformPoints, { translate: [1, 2, 3] }, { in: [makeGeometryItem(input)] })
      ).out,
    );
    expect(positionsOf(translated)).toEqual([[2, 2, 3]]);

    const rotated = firstGeo(
      (
        await runNode(transformPoints, { rotateEuler: [0, 90, 0] }, { in: [makeGeometryItem(input)] })
      ).out,
    );
    const [x, y, z] = positionsOf(rotated)[0];
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(-1, 5);

    const scaled = firstGeo(
      (await runNode(transformPoints, { scale: [2, 1, 1] }, { in: [makeGeometryItem(input)] })).out,
    );
    expect(positionsOf(scaled)).toEqual([[2, 0, 0]]);
  });

  it("composes with existing rot and scale attributes", async () => {
    const input = cloudAt([[1, 1, 0]]);
    const geo = firstGeo(
      (
        await runNode(
          transformPoints,
          { rotateEuler: [0, 0, 90], scale: [2, 1, 1] },
          { in: [makeGeometryItem(input)] },
        )
      ).out,
    );
    // P: scale -> [2,1,0], rotate Rz90 -> [-1,2,0].
    const [x, y, z] = positionsOf(geo)[0];
    expect(x).toBeCloseTo(-1, 5);
    expect(y).toBeCloseTo(2, 5);
    expect(z).toBeCloseTo(0, 5);
    // scale attr multiplied componentwise; rot attr becomes Rz(90).
    expect(geo.attrs.point.require("scale").getTuple(0)).toEqual([2, 1, 1]);
    const rot = geo.attrs.point.require("rot").getTuple(0);
    expect(rot[0]).toBeCloseTo(0, 5);
    expect(rot[1]).toBeCloseTo(0, 5);
    expect(rot[2]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(rot[3]).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("accepts field params resolved per point", async () => {
    const input = cloudAt([
      [0, 1, 0],
      [0, 2, 0],
    ]);
    // translate = (y, 0, 0): each point moves in x by its own height.
    const translate = vec(component(position(), 1), constant(0), constant(0));
    const geo = firstGeo(
      (await runNode(transformPoints, { translate }, { in: [makeGeometryItem(input)] })).out,
    );
    expect(positionsOf(geo)).toEqual([
      [1, 1, 0],
      [2, 2, 0],
    ]);
  });

  it("documents rotateEuler as extrinsic XYZ (intrinsic ZYX / three.js 'ZYX')", () => {
    // The math builds R = Rz * Ry * Rx — extrinsic XYZ. The metadata must
    // say so precisely; the three.js interop phase depends on it.
    const info = getNodeType("transformPoints").info;
    expect(info.params.rotateEuler.description).toMatch(/extrinsic/);
    expect(info.params.rotateEuler.description).toMatch(/ZYX/);
    expect(info.description).toMatch(/extrinsic XYZ/);
  });

  it("does not mutate its input (purity)", async () => {
    const input = cloudAt([[1, 0, 0]]);
    const before = snapshotGeometry(input);
    await runNode(transformPoints, { translate: [5, 5, 5] }, { in: [makeGeometryItem(input)] });
    expect(snapshotGeometry(input)).toEqual(before);
  });
});

describe("jitterPoints", () => {
  it("moves each point at most amount per axis, deterministically", async () => {
    const grid = firstGeo((await runNode(pointGrid, { countX: 5, countY: 1, countZ: 5 })).out);
    const run = (seedParam: number) =>
      runNode(jitterPoints, { amount: [0.4, 0, 0.4], seed: seedParam }, { in: [makeGeometryItem(grid)] }, 2);
    const a = firstGeo((await run(0)).out);
    const b = firstGeo((await run(0)).out);
    const c = firstGeo((await run(1)).out);
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
    expect(snapshotGeometry(a)).not.toEqual(snapshotGeometry(c));
    const base = positionsOf(grid);
    const moved = positionsOf(a);
    for (let i = 0; i < base.length; i++) {
      expect(Math.abs(moved[i][0] - base[i][0])).toBeLessThanOrEqual(0.4);
      expect(moved[i][1]).toBe(base[i][1]);
      expect(Math.abs(moved[i][2] - base[i][2])).toBeLessThanOrEqual(0.4);
    }
  });

  it("is permutation-equivariant: the offset travels with the point", async () => {
    // The offset is keyed on the point's IDENTITY (its pre-jitter position
    // bits plus its seed), so reordering the input reorders the output and
    // moves nothing. Against index keying every point lands somewhere else.
    const cloud = seededCloudAt(
      Array.from({ length: 120 }, (_, i) => [
        hashFloat(hashCombine(31, i, 0)) * 8,
        hashFloat(hashCombine(31, i, 1)) * 8,
        hashFloat(hashCombine(31, i, 2)) * 8,
      ]),
    );
    const order = shuffledOrder(120, 6);
    const run = (geo: ReturnType<typeof createPointCloud>) =>
      runNode(jitterPoints, { amount: [0.4, 0.4, 0.4] }, { in: [makeGeometryItem(geo)] }, 2);
    const straight = firstGeo((await run(cloud)).out);
    const shuffled = firstGeo((await run(permutePoints(cloud, order))).out);
    // Jitter actually moved things — an amount of 0 would pass trivially.
    expect(positionsOf(straight)).not.toEqual(positionsOf(cloud));
    expect(snapshotGeometry(shuffled)).toEqual(snapshotGeometry(permutePoints(straight, order)));
  });

  it("re-rolls when only the seed attribute changes", async () => {
    // Position bits are not the whole identity: two clouds at the same
    // places with different per-point seeds jitter differently.
    const positions = Array.from({ length: 32 }, (_, i) => [i * 0.5, 0, 0]);
    const run = (geo: ReturnType<typeof createPointCloud>) =>
      runNode(jitterPoints, { amount: [0.4, 0.4, 0.4] }, { in: [makeGeometryItem(geo)] }, 2);
    const seeded = firstGeo((await run(seededCloudAt(positions))).out);
    const unseeded = firstGeo((await run(cloudAt(positions))).out);
    expect(positionsOf(seeded)).not.toEqual(positionsOf(unseeded));
  });
});

describe("copyToPoints", () => {
  it("copies source onto each target, composing transforms", async () => {
    const source = cloudAt([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    const target = cloudAt([
      [10, 0, 0],
      [0, 10, 0],
    ]);
    target.attrs.point.require("scale").setTuple(0, [2, 2, 2]);
    target.attrs.point.require("rot").setTuple(1, [0, 0, Math.SQRT1_2, Math.SQRT1_2]); // Rz(90)
    const geo = firstGeo(
      (
        await runNode(copyToPoints, {}, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    expect(geo.pointCount).toBe(4); // n_src * n_tgt
    const p = positionsOf(geo);
    expect(p[0]).toEqual([12, 0, 0]); // t0 + 2 * (1,0,0)
    expect(p[1]).toEqual([10, 2, 0]); // t0 + 2 * (0,1,0)
    expect(p[2][0]).toBeCloseTo(0, 4); // t1 + Rz90 * (1,0,0) = (0,11,0)
    expect(p[2][1]).toBeCloseTo(11, 4);
    expect(p[3][0]).toBeCloseTo(-1, 4); // t1 + Rz90 * (0,1,0) = (-1,10,0)
    expect(p[3][1]).toBeCloseTo(10, 4);
    // Copied scale composes componentwise.
    expect(geo.attrs.point.require("scale").getTuple(0)).toEqual([2, 2, 2]);
    // Copied rot on the rotated target is Rz(90) (source rot identity).
    const rot = geo.attrs.point.require("rot").getTuple(2);
    expect(rot[2]).toBeCloseTo(Math.SQRT1_2, 5);
    expect(rot[3]).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("carries source attributes and hashes target seeds into copies", async () => {
    const source = cloudAt([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    source.attrs.point.add("kind", "string", 1, "").setString(0, "oak");
    source.attrs.point.require("kind").setString(1, "fir");
    source.attrs.point.require("seed").set(0, 100);
    source.attrs.point.require("seed").set(1, 200);
    const target = cloudAt([
      [0, 0, 0],
      [5, 0, 0],
    ]);
    target.attrs.point.require("seed").set(0, 1);
    target.attrs.point.require("seed").set(1, 2);
    const geo = firstGeo(
      (
        await runNode(copyToPoints, {}, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    const kind = geo.attrs.point.require("kind");
    expect([0, 1, 2, 3].map((i) => kind.getString(i))).toEqual(["oak", "fir", "oak", "fir"]);
    const seeds = geo.attrs.point.require("seed");
    const values = [0, 1, 2, 3].map((i) => seeds.get(i));
    expect(new Set(values).size).toBe(4); // all distinct: hash(srcSeed, tgtSeed)
  });

  const SRC_SEEDS = [100, 200];
  const TGT_SEEDS = [1, 2, 3];

  /** Two source points and three targets: blocks of 2, one per target. */
  function carryCase(): { source: Geometry; target: Geometry } {
    const source = cloudAt([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    const target = cloudAt([
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
    ]);
    SRC_SEEDS.forEach((s, i) => source.attrs.point.require("seed").set(i, s));
    TGT_SEEDS.forEach((s, i) => target.attrs.point.require("seed").set(i, s));
    const set = target.attrs.point;
    const species = set.add("species", "string", 1, "");
    species.setString(0, "oak");
    species.setString(1, "fir");
    species.setString(2, "oak");
    const age = set.add("age", "u32", 1, 0);
    [7, 8, 9].forEach((v, i) => age.set(i, v));
    const tint = set.add("tint", "f32", 3, [1, 1, 1]);
    [
      [0.25, 0.5, 0.75],
      [1, 0, 0],
      [0, 1, 0],
    ].forEach((v, i) => tint.setTuple(i, v));
    return { source, target };
  }

  it("carries named target attributes onto every copy of that target", async () => {
    const { source, target } = carryCase();
    const geo = firstGeo(
      (
        await runNode(copyToPoints, { targetNames: ["age", "species", "tint"] }, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    expect(geo.pointCount).toBe(6);
    const age = geo.attrs.point.require("age");
    // Blocks of nS = 2, in target order: each copy reads ITS OWN target.
    expect([0, 1, 2, 3, 4, 5].map((i) => age.get(i))).toEqual([7, 7, 8, 8, 9, 9]);
    // Strings cross the geometry boundary BY VALUE — the target's table
    // index means nothing here, so assert the words, not the numbers.
    const species = geo.attrs.point.require("species");
    expect([0, 1, 2, 3, 4, 5].map((i) => species.getString(i))).toEqual([
      "oak",
      "oak",
      "fir",
      "fir",
      "oak",
      "oak",
    ]);
    const tint = geo.attrs.point.require("tint");
    expect(tint.getTuple(0)).toEqual([0.25, 0.5, 0.75]);
    expect(tint.getTuple(1)).toEqual([0.25, 0.5, 0.75]);
    expect(tint.getTuple(4)).toEqual([0, 1, 0]);
  });

  it("carried columns keep the target's type, tuple size and default", async () => {
    const { source, target } = carryCase();
    const geo = firstGeo(
      (
        await runNode(copyToPoints, { targetNames: ["age", "species", "tint"] }, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    for (const name of ["age", "species", "tint"]) {
      const src = target.attrs.point.require(name);
      const dst = geo.attrs.point.require(name);
      expect([dst.type, dst.tupleSize, dst.defaultValue], name).toEqual([
        src.type,
        src.tupleSize,
        src.defaultValue,
      ]);
    }
  });

  it("refuses the composed transform attributes, a source collision, a repeat and a missing name", async () => {
    const run = async (targetNames: string[], source?: Geometry, target?: Geometry) => {
      const c = carryCase();
      await runNode(copyToPoints, { targetNames }, {
        source: [makeGeometryItem(source ?? c.source)],
        target: [makeGeometryItem(target ?? c.target)],
      });
    };
    for (const name of ["P", "rot", "scale", "seed"]) {
      await expect(run([name])).rejects.toThrow(
        new RegExp(`copyToPoints: param "targetNames" cannot carry "${name}" — P, rot`),
      );
    }
    const clash = carryCase();
    clash.source.attrs.point.add("age", "u32", 1, 0);
    await expect(run(["age"], clash.source, clash.target)).rejects.toThrow(
      /cannot carry "age" — the source carries a point attribute of that name too/,
    );
    await expect(run(["age", "age"])).rejects.toThrow(/lists "age" twice/);
    await expect(run(["height"])).rejects.toThrow(
      /names "height", which the target has no point attribute for; available: .*, species, age, tint\./,
    );
  });

  it("carries nothing by default, and repeats byte for byte", async () => {
    const { source, target } = carryCase();
    const call = (targetNames?: string[]) =>
      runNode(copyToPoints, targetNames ? { targetNames } : {}, {
        source: [makeGeometryItem(source)],
        target: [makeGeometryItem(target)],
      });
    const bare = firstGeo((await call()).out);
    const standard = bare.attrs.point.names();
    expect(standard).toEqual(source.attrs.point.names());
    // An explicit empty list is the default path, not a second one.
    expect(snapshotGeometry(firstGeo((await call([])).out))).toEqual(snapshotGeometry(bare));
    // Carrying appends columns in the order given and disturbs nothing
    // else — including the seed chain, hashCombine(sourceSeed, targetSeed).
    const carried = firstGeo((await call(["age", "species"])).out);
    expect(carried.attrs.point.names()).toEqual([...standard, "age", "species"]);
    expect(positionsOf(carried)).toEqual(positionsOf(bare));
    const seeds = carried.attrs.point.require("seed");
    expect([0, 1, 2, 3, 4, 5].map((i) => seeds.get(i))).toEqual(
      [0, 1, 2, 3, 4, 5].map((i) => hashCombine(SRC_SEEDS[i % 2], TGT_SEEDS[Math.floor(i / 2)])),
    );
    expect(snapshotGeometry(firstGeo((await call(["age", "species"])).out))).toEqual(
      snapshotGeometry(carried),
    );
  });

  it("writes the target index, one value per block", async () => {
    const { source, target } = carryCase();
    const geo = firstGeo(
      (
        await runNode(copyToPoints, { targetIndexAttr: "anchorId" }, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    const anchor = geo.attrs.point.require("anchorId");
    expect([anchor.type, anchor.tupleSize, anchor.defaultValue]).toEqual(["i32", 1, [-1]]);
    // Blocks of nS = 2, in target order — the same `i = t * nS + s` the
    // transforms use, which is the point of not restating it upstream.
    expect([0, 1, 2, 3, 4, 5].map((i) => anchor.get(i))).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("is the setAttribute-plus-carry idiom it replaces, byte for byte", async () => {
    const { source, target } = carryCase();
    // What the graphs wrote before this param existed: an index column on
    // the TARGET, carried across. The two must agree on every byte,
    // because that is the edit an existing graph makes to adopt it.
    const carriedTarget = carryCase().target;
    const idx = carriedTarget.attrs.point.add("anchorId", "i32", 1, -1);
    for (let t = 0; t < carriedTarget.pointCount; t++) idx.set(t, t);
    const viaCarry = firstGeo(
      (
        await runNode(copyToPoints, { targetNames: ["anchorId"] }, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(carriedTarget)],
        })
      ).out,
    );
    const viaParam = firstGeo(
      (
        await runNode(copyToPoints, { targetIndexAttr: "anchorId" }, {
          source: [makeGeometryItem(source)],
          target: [makeGeometryItem(target)],
        })
      ).out,
    );
    expect(snapshotGeometry(viaParam)).toEqual(snapshotGeometry(viaCarry));
  });

  it("refuses a composed standard, a source collision and a name targetNames carries", async () => {
    const run = async (targetIndexAttr: string, targetNames: string[] = [], source?: Geometry) => {
      const c = carryCase();
      await runNode(copyToPoints, { targetIndexAttr, targetNames }, {
        source: [makeGeometryItem(source ?? c.source)],
        target: [makeGeometryItem(c.target)],
      });
    };
    for (const name of ["P", "rot", "scale", "seed"]) {
      await expect(run(name)).rejects.toThrow(
        new RegExp(`copyToPoints: param "targetIndexAttr" cannot write "${name}" — P, rot`),
      );
    }
    await expect(run("age", ["age"])).rejects.toThrow(
      /writes "age", which param "targetNames" is already carrying/,
    );
    const clash = carryCase();
    clash.source.attrs.point.add("anchorId", "i32", 1, 0);
    await expect(run("anchorId", [], clash.source)).rejects.toThrow(
      /cannot write "anchorId" — the source carries a point attribute of that name too/,
    );
    // A name the TARGET happens to carry is not a collision: an uncarried
    // target column never reaches the output.
    await expect(run("species")).resolves.toBeUndefined();
  });

  it("writes nothing by default", async () => {
    const { source, target } = carryCase();
    const call = (targetIndexAttr: string) =>
      runNode(copyToPoints, { targetIndexAttr }, {
        source: [makeGeometryItem(source)],
        target: [makeGeometryItem(target)],
      });
    const bare = firstGeo((await call("")).out);
    expect(bare.attrs.point.names()).toEqual(source.attrs.point.names());
    expect(snapshotGeometry(firstGeo((await call("")).out))).toEqual(snapshotGeometry(bare));
  });

  describe("rotateAttrs", () => {
    const H = Math.SQRT1_2;
    /** 90 degrees about +z: (x, y, z) -> (-y, x, z). */
    const RZ90 = [0, 0, H, H];
    /** 90 degrees about +y: (x, y, z) -> (z, y, -x). */
    const RY90 = [0, H, 0, H];
    const turnZ = ([x, y, z]: number[]) => [-y, x, z];
    const turnY = ([x, y, z]: number[]) => [z, y, -x];

    interface RotateParams {
      rotateAttrs?: string[];
      topology?: CopyToPointsParams["topology"];
      targetNames?: string[];
      sourceGroupAttr?: string;
      targetGroupAttr?: string;
    }

    const SOURCE_P = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const VDIR = [
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ];
    const PDIR = [1, 2, 3];

    /**
     * One 3-point polyline carrying a direction on each copied domain:
     * `dir` on the points (equal to P, so a turned copy can be checked
     * against its own turned position), `vdir` on the vertices, `pdir` on
     * the primitive, and a `tint` decoy of the same shape nobody names.
     */
    function directedSource(): Geometry {
      const geo = seededCloudAt(SOURCE_P);
      setPolylineTopology(geo, [0, 1, 2], [0], [3]);
      const dir = geo.attrs.point.add("dir", "f32", 3, [0, 0, 0]);
      SOURCE_P.forEach((p, i) => dir.setTuple(i, p));
      const tint = geo.attrs.point.add("tint", "f32", 3, [0, 0, 0]);
      SOURCE_P.forEach((p, i) => tint.setTuple(i, p));
      const vdir = geo.attrs.vertex.add("vdir", "f32", 3, [0, 0, 0]);
      VDIR.forEach((d, i) => vdir.setTuple(i, d));
      geo.attrs.primitive.add("pdir", "f32", 3, [0, 0, 0]).setTuple(0, PDIR);
      return geo;
    }

    /** Two targets: the first unturned, the second turned 90 degrees about +z and moved. */
    function turnedTargets(): Geometry {
      const target = seededCloudAt([
        [0, 0, 0],
        [5, 0, 0],
      ]);
      target.attrs.point.require("rot").setTuple(1, RZ90);
      return target;
    }

    async function copy(
      params: RotateParams,
      source: Geometry = directedSource(),
      target: Geometry = turnedTargets(),
    ): Promise<Geometry> {
      return firstGeo(
        (
          await runNode(copyToPoints, params, {
            source: [makeGeometryItem(source)],
            target: [makeGeometryItem(target)],
          })
        ).out,
      );
    }

    const tuples = (geo: Geometry, domain: "point" | "vertex" | "primitive", name: string) => {
      const attr = geo.attrs[domain].require(name);
      return Array.from({ length: geo.attrs[domain].count }, (_, i) => attr.getTuple(i));
    };

    function expectClose(actual: number[][], expected: number[][]): void {
      expect(actual.length).toBe(expected.length);
      actual.forEach((a, i) =>
        a.forEach((c, k) => expect(c, `element ${i} component ${k}`).toBeCloseTo(expected[i][k], 6)),
      );
    }

    it("turns a point direction by its copy's target rotation, in step with P", async () => {
      const source = directedSource();
      // The SOURCE point's own rot is not applied — source P is not turned
      // by it either — so giving one a rot must change nothing here.
      source.attrs.point.require("rot").setTuple(1, RY90);
      const geo = await copy({ rotateAttrs: ["dir"] }, source);
      const dir = tuples(geo, "point", "dir");
      // The unturned target's block is the source's bytes exactly.
      expect(dir.slice(0, 3)).toEqual(SOURCE_P);
      expectClose(dir.slice(3), SOURCE_P.map(turnZ));
      // `dir` was P on the source, so on every copy it is P minus its
      // target's position: the direction and the positions turned together.
      const P = positionsOf(geo);
      expectClose(dir, P.map((p, i) => (i < 3 ? p : [p[0] - 5, p[1], p[2]])));
      // A column of the same shape nobody named is carried untouched.
      expect(tuples(geo, "point", "tint")).toEqual([...SOURCE_P, ...SOURCE_P]);
    });

    it('turns vertex and primitive directions per target block under topology "keep"', async () => {
      const geo = await copy({ topology: "keep", rotateAttrs: ["vdir", "pdir"] });
      expect(geo.vertexCount).toBe(6);
      expect(geo.primitiveCount).toBe(2);
      const vdir = tuples(geo, "vertex", "vdir");
      expect(vdir.slice(0, 3)).toEqual(VDIR);
      expectClose(vdir.slice(3), VDIR.map(turnZ));
      const pdir = tuples(geo, "primitive", "pdir");
      expect(pdir[0]).toEqual(PDIR);
      expectClose([pdir[1]], [turnZ(PDIR)]);
      // Naming vertex and primitive columns leaves the point domain alone.
      expect(tuples(geo, "point", "dir")).toEqual([...SOURCE_P, ...SOURCE_P]);
    });

    it("turns one name on every domain that carries it, and only the point domain under drop", async () => {
      const source = directedSource();
      source.attrs.primitive.add("dir", "f32", 3, [0, 0, 0]).setTuple(0, PDIR);
      const kept = await copy({ topology: "keep", rotateAttrs: ["dir"] }, source);
      expectClose(tuples(kept, "point", "dir").slice(3), SOURCE_P.map(turnZ));
      expectClose(tuples(kept, "primitive", "dir"), [PDIR, turnZ(PDIR)]);
      // Under "drop" the primitive column is gone anyway; the point one
      // still turns and nothing complains.
      const dropped = await copy({ rotateAttrs: ["dir"] }, source);
      expect(dropped.primitiveCount).toBe(0);
      expectClose(tuples(dropped, "point", "dir").slice(3), SOURCE_P.map(turnZ));
    });

    it("rotates only: the target's scale is not applied and the length is kept", async () => {
      const target = turnedTargets();
      target.attrs.point.require("scale").setTuple(1, [2, 3, 4]);
      const geo = await copy({ rotateAttrs: ["dir"] }, directedSource(), target);
      expectClose(tuples(geo, "point", "dir").slice(3), SOURCE_P.map(turnZ));
    });

    it("turns each copy by ITS target under per-target selection", async () => {
      // Two polylines keyed 0 (points 0-1) and 1 (points 2-4); three
      // targets asking 1, 0, 1 under three different rotations, so the
      // blocks differ in size on every domain and a stride would misplace
      // them.
      const source = seededCloudAt([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 0],
        [0, 1, 1],
      ]);
      setPolylineTopology(source, [0, 1, 2, 3, 4], [0, 2], [2, 3]);
      const key = source.attrs.point.add("key", "i32", 1, 0);
      [0, 0, 1, 1, 1].forEach((k, i) => key.set(i, k));
      const vdirs = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 2, 3],
        [3, 2, 1],
      ];
      const vdir = source.attrs.vertex.add("vdir", "f32", 3, [0, 0, 0]);
      vdirs.forEach((d, i) => vdir.setTuple(i, d));
      const pdirs = [
        [1, 0, 0],
        [0, 0, 1],
      ];
      const pdir = source.attrs.primitive.add("pdir", "f32", 3, [0, 0, 0]);
      pdirs.forEach((d, i) => pdir.setTuple(i, d));
      const target = seededCloudAt([
        [0, 0, 0],
        [10, 0, 0],
        [20, 0, 0],
      ]);
      const want = target.attrs.point.add("want", "i32", 1, 0);
      [1, 0, 1].forEach((k, i) => want.set(i, k));
      target.attrs.point.require("rot").setTuple(1, RZ90);
      target.attrs.point.require("rot").setTuple(2, RY90);
      const geo = await copy(
        {
          topology: "keep",
          rotateAttrs: ["vdir", "pdir"],
          sourceGroupAttr: "key",
          targetGroupAttr: "want",
        },
        source,
        target,
      );
      // Blocks in target order: primitive 1 unturned, primitive 0 about z,
      // primitive 1 about y.
      expectClose(tuples(geo, "vertex", "vdir"), [
        ...vdirs.slice(2),
        ...vdirs.slice(0, 2).map(turnZ),
        ...vdirs.slice(2).map(turnY),
      ]);
      expectClose(tuples(geo, "primitive", "pdir"), [pdirs[1], turnZ(pdirs[0]), turnY(pdirs[1])]);
    });

    it("an empty list is the default path, byte for byte", async () => {
      for (const topology of ["drop", "keep"] as const) {
        const bare = snapshotGeometry(await copy({ topology }));
        expect(snapshotGeometry(await copy({ topology, rotateAttrs: [] }))).toEqual(bare);
        // THE CONTROL: the same comparison must be able to say "different".
        expect(snapshotGeometry(await copy({ topology, rotateAttrs: ["dir"] }))).not.toEqual(bare);
      }
      // A target with no `rot` column at all turns nothing, byte for byte.
      const unrotated = seededCloudAt([
        [0, 0, 0],
        [5, 0, 0],
      ]);
      unrotated.attrs.point.remove("rot");
      const params = { topology: "keep" as const, rotateAttrs: ["dir", "vdir", "pdir"] };
      expect(snapshotGeometry(await copy(params, directedSource(), unrotated))).toEqual(
        snapshotGeometry(await copy({ topology: "keep" }, directedSource(), unrotated)),
      );
    });

    it("refuses composed standards, repeats, missing names, wrong shapes and dropped domains", async () => {
      // The standard bounds are f32 tuple-3 too, and refused, so the list
      // does not offer them.
      const listed = "point: dir, tint; vertex: vdir; primitive: pdir";
      const run = (params: RotateParams, source?: Geometry, target?: Geometry) =>
        copy(params, source, target);
      for (const name of ["P", "rot", "scale", "seed"]) {
        await expect(run({ rotateAttrs: [name] })).rejects.toThrow(
          `copyToPoints: param "rotateAttrs" cannot rotate "${name}" — P, rot, scale and seed are composed per copy`,
        );
      }
      for (const name of ["boundsMin", "boundsMax"]) {
        await expect(run({ rotateAttrs: [name] })).rejects.toThrow(
          `copyToPoints: param "rotateAttrs" cannot rotate "${name}" — boundsMin and boundsMax are extents in the point's OWN frame`,
        );
      }
      await expect(run({ rotateAttrs: ["P"] })).rejects.toThrow(`attributes are ${listed}.`);
      await expect(run({ rotateAttrs: ["dir", "dir"] })).rejects.toThrow(
        'copyToPoints: param "rotateAttrs" lists "dir" twice',
      );
      // Each composed standard is refused for its own reason.
      await expect(run({ rotateAttrs: ["rot"] })).rejects.toThrow("would apply it twice");
      await expect(run({ rotateAttrs: ["scale"] })).rejects.toThrow("scale is a per-axis size");
      await expect(run({ rotateAttrs: ["seed"] })).rejects.toThrow("seed is an identity");
      await expect(run({ rotateAttrs: ["height"] })).rejects.toThrow(
        `copyToPoints: param "rotateAttrs" names "height", which the source's point domain does not carry (under topology "drop" only the point domain is searched); the source's f32 tuple-3 attributes are ${listed}.`,
      );
      await expect(run({ topology: "keep", rotateAttrs: ["height"] })).rejects.toThrow(
        "which the source carries on none of its point, vertex and primitive domains",
      );
      // Wrong shape, on the point domain and on a kept primitive domain.
      const shaped = directedSource();
      shaped.attrs.point.add("uv", "f32", 2, [0, 0]);
      shaped.attrs.primitive.add("ids", "i32", 3, [0, 0, 0]);
      await expect(run({ rotateAttrs: ["uv"] }, shaped)).rejects.toThrow(
        'copyToPoints: param "rotateAttrs" names point attribute "uv", which is f32 with tupleSize 2; only an f32 tuple-3 DIRECTION',
      );
      await expect(run({ topology: "keep", rotateAttrs: ["ids"] }, shaped)).rejects.toThrow(
        'names primitive attribute "ids", which is i32 with tupleSize 3',
      );
      // A name only a dropped domain carries is refused, and says why.
      await expect(run({ rotateAttrs: ["pdir"] })).rejects.toThrow(
        'names "pdir", which the source carries only on its primitive domain, and topology "drop" (the default) discards those domains',
      );
      await expect(run({ rotateAttrs: ["vdir"] })).rejects.toThrow(
        `Set topology "keep" to carry the source's primitives and their attributes onto the copies, or remove "vdir" from rotateAttrs. The source's f32 tuple-3 attributes are ${listed}.`,
      );
      // ...but not when "keep" would only fail next, on the column's shape.
      await expect(run({ rotateAttrs: ["ids"] }, shaped)).rejects.toThrow(
        'names primitive attribute "ids", which is i32 with tupleSize 3',
      );
      // A TARGET column carried across is not a source column.
      const target = turnedTargets();
      target.attrs.point.add("aim", "f32", 3, [0, 0, 1]);
      await expect(
        run({ targetNames: ["aim"], rotateAttrs: ["aim"] }, directedSource(), target),
      ).rejects.toThrow(/names "aim", which the source's point domain does not carry.*"targetNames" is the target's own value/);
    });

    it("a mesh's normal, copied and turned, matches the mesh built in place", async () => {
      // A square footprint extruded along its own normal, so the extrusion
      // is defined by the footprint alone and turns with it.
      const footprint = () => createPolyline([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1], { closed: true });
      const place = { translate: [3, -1, 2], rotateEuler: [30, 50, 70] };
      const extrude = async (geo: Geometry) =>
        firstGeo(
          (
            await runNode(extrudePolygon, { direction: "polygonNormal", distance: 2 }, {
              in: [makeGeometryItem(geo)],
            })
          ).out,
        );
      const transform = async (geo: Geometry) =>
        firstGeo((await runNode(transformPoints, place, { in: [makeGeometryItem(geo)] })).out);

      // Built in place: turn the footprint, then extrude it there.
      const inPlace = await extrude(await transform(footprint()));
      // Built at the origin and copied onto a target carrying the same turn.
      const target = await transform(cloudAt([[0, 0, 0]]));
      const origin = await extrude(footprint());
      const copied = async (rotateAttrs: string[]) =>
        copy({ topology: "keep", rotateAttrs }, origin, target);
      const turned = await copied(["normal"]);

      expect(turned.pointCount).toBe(inPlace.pointCount);
      expect(Array.from(turned.vertexToPoint)).toEqual(Array.from(inPlace.vertexToPoint));
      expectClose(positionsOf(turned), positionsOf(inPlace));
      expectClose(tuples(turned, "point", "normal"), tuples(inPlace, "point", "normal"));
      // THE CONTROL: without the param the copy's normals point the
      // origin mesh's way, and the same comparison must see it.
      const unturned = tuples(await copied([]), "point", "normal");
      const worst = Math.max(
        ...unturned.flatMap((n, i) => n.map((c, k) => Math.abs(c - tuples(inPlace, "point", "normal")[i][k]))),
      );
      expect(worst).toBeGreaterThan(0.5);
    });

    it("serializes and round-trips through graph JSON", () => {
      const g = new Graph(5);
      const n = g.add(copyToPoints, { topology: "keep", rotateAttrs: ["normal", "faceN"] }, "copy");
      g.output(n, "out", "result");
      const json = serializeGraph(g);
      const rebuilt = deserializeGraph(JSON.parse(JSON.stringify(json)));
      expect(serializeGraph(rebuilt)).toEqual(json);
      const node = json.nodes.find((entry) => entry.id === "copy");
      expect(node?.params.rotateAttrs).toEqual(["normal", "faceN"]);
    });
  });

  describe("topology", () => {
    interface TopologyParams {
      topology?: CopyToPointsParams["topology"];
      targetNames?: string[];
      targetIndexAttr?: string;
    }

    /**
     * Five points wired into TWO polylines whose vertex order is NOT the
     * identity — 0-2-4 and 3-1. A source whose `vertexToPoint` reads
     * [0, 1, 2, ...] looks correctly shifted under almost any arithmetic,
     * so it cannot tell a re-emission from a coincidence.
     */
    function forkedSource(): Geometry {
      const geo = seededCloudAt([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [4, 0, 0],
      ]);
      setPolylineTopology(geo, [0, 2, 4, 3, 1], [0, 3], [3, 2]);
      return geo;
    }

    const THREE_TARGETS = [
      [0, 0, 0],
      [0, 10, 0],
      [0, 20, 0],
    ];

    async function copy(
      source: Geometry,
      params: TopologyParams = {},
      target: Geometry = seededCloudAt(THREE_TARGETS),
    ): Promise<Geometry> {
      return firstGeo(
        (
          await runNode(copyToPoints, params, {
            source: [makeGeometryItem(source)],
            target: [makeGeometryItem(target)],
          })
        ).out,
      );
    }

    it("drops the source's topology by default — the measurement gap 6 opened with", async () => {
      const geo = await copy(createPolyline([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0]));
      // A 5-point polyline (1 primitive) onto 3 targets: 15 points, 0
      // primitives. The paths are gone and nothing said so.
      expect(geo.pointCount).toBe(15);
      expect(geo.vertexCount).toBe(0);
      expect(geo.primitiveCount).toBe(0);
    });

    it('"drop" is the path that shipped, byte for byte', async () => {
      const shipped = snapshotGeometry(await copy(forkedSource()));
      expect(snapshotGeometry(await copy(forkedSource(), { topology: "drop" }))).toEqual(shipped);
      // THE CONTROL. The equality above is worth nothing unless the same
      // comparison can report "different" — so the other setting, over the
      // same source and targets, must not match it.
      expect(snapshotGeometry(await copy(forkedSource(), { topology: "keep" }))).not.toEqual(
        shipped,
      );
    });

    it('"keep" re-emits every source primitive once per target, shifted onto its block', async () => {
      const geo = await copy(forkedSource(), { topology: "keep" });
      expect(geo.pointCount).toBe(15);
      expect(geo.vertexCount).toBe(15);
      expect(geo.primitiveCount).toBe(6); // nT * nSourcePrimitives
      // Each block walks the SOURCE's vertex order, t * nS further on.
      expect(Array.from(geo.vertexToPoint)).toEqual([
        0, 2, 4, 3, 1, 5, 7, 9, 8, 6, 10, 12, 14, 13, 11,
      ]);
      expect(Array.from(geo.primVertexStart)).toEqual([0, 3, 5, 8, 10, 13]);
      expect(Array.from(geo.primVertexCount)).toEqual([3, 2, 3, 2, 3, 2]);
      expect(primitiveTypeCounts(geo)).toEqual({ polyline: 6 });
      // And the primitives describe the copies they were emitted for: the
      // last block sits on the third target, ten units up from the second.
      expect(positionsOf(geo)[12]).toEqual([2, 20, 0]);
    });

    it("carries the source's vertex and primitive attributes onto every copy", async () => {
      const source = forkedSource();
      const width = source.attrs.primitive.add("width", "f32", 1, 0);
      width.set(0, 1.5);
      width.set(1, 2.5);
      const uv = source.attrs.vertex.add("uv", "f32", 2, [9, 9]);
      [
        [0, 0],
        [0.5, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].forEach((v, i) => uv.setTuple(i, v));
      const geo = await copy(source, { topology: "keep" });
      const outWidth = geo.attrs.primitive.require("width");
      expect([0, 1, 2, 3, 4, 5].map((i) => outWidth.get(i))).toEqual([1.5, 2.5, 1.5, 2.5, 1.5, 2.5]);
      const outUv = geo.attrs.vertex.require("uv");
      // Vertex values travel with the vertex, not the point: block 1's
      // vertices repeat block 0's, in the same order.
      expect([0, 1, 2, 3, 4].map((i) => outUv.getTuple(i))).toEqual([
        [0, 0],
        [0.5, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]);
      expect(outUv.getTuple(5)).toEqual([0, 0]);
      expect(outUv.getTuple(9)).toEqual([1, 1]);
      // Type, tuple size and default come across with the values.
      expect([outUv.type, outUv.tupleSize, outUv.defaultValue]).toEqual(["f32", 2, [9, 9]]);
      expect([outWidth.type, outWidth.tupleSize, outWidth.defaultValue]).toEqual(["f32", 1, [0]]);
    });

    it("is byte-identical under both settings for a source with no primitives", async () => {
      // The common case: a cloud onto a cloud. "keep" still routes through
      // setTopology (what the output IS must depend on the graph, not the
      // data), and an empty topology is what "drop" already emits.
      const cloudSource = (): Geometry =>
        seededCloudAt([
          [0, 0, 0],
          [1, 0, 0],
        ]);
      const dropped = snapshotGeometry(await copy(cloudSource()));
      expect(snapshotGeometry(await copy(cloudSource(), { topology: "keep" }))).toEqual(dropped);
      const kept = await copy(cloudSource(), { topology: "keep" });
      expect([kept.vertexCount, kept.primitiveCount]).toEqual([0, 0]);
      // THE CONTROL for the equality above: with primitives in the source
      // the same two calls diverge, so the snapshot is comparing topology.
      expect(snapshotGeometry(await copy(forkedSource(), { topology: "keep" }))).not.toEqual(
        snapshotGeometry(await copy(forkedSource())),
      );
    });

    it("emits the same POINT domain either way, targetNames and targetIndexAttr included", async () => {
      const source = forkedSource();
      const target = seededCloudAt(THREE_TARGETS);
      const age = target.attrs.point.add("age", "u32", 1, 0);
      [7, 8, 9].forEach((v, i) => age.set(i, v));
      const params: TopologyParams = { targetNames: ["age"], targetIndexAttr: "anchorId" };
      const dropped = await copy(source, { ...params, topology: "drop" }, target);
      const kept = await copy(source, { ...params, topology: "keep" }, target);
      // The param only ever ADDS: nothing reading a point can tell which
      // was set, so the two point columns this node writes itself survive
      // the re-emission untouched.
      expect(snapshotGeometry(kept).point).toEqual(snapshotGeometry(dropped).point);
      // THE CONTROL: as whole geometries they differ, so the equality
      // above is a statement about the point domain and not a tautology.
      expect(snapshotGeometry(kept)).not.toEqual(snapshotGeometry(dropped));
      const anchor = kept.attrs.point.require("anchorId");
      expect([...Array(15).keys()].map((i) => anchor.get(i))).toEqual([
        0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2,
      ]);
      expect(kept.attrs.point.require("age").get(7)).toBe(8);
    });

    it("gives every copy of a primitive its own identity", async () => {
      const draws = (geo: Geometry): number[] =>
        Array.from(evaluateField(randomField("copy"), { geo, domain: "primitive", seed: 9 }).data);
      // A primitive is named by the fold of its own points' identities, and
      // BOTH halves of a point's identity are composed per copy here — P by
      // the target's transform, seed by hashCombine(sourceSeed, targetSeed).
      // So six copies are six primitives and each draws its own value.
      const distinct = draws(await copy(forkedSource(), { topology: "keep" }));
      expect(distinct.length).toBe(6);
      expect(new Set(distinct).size).toBe(6);
      // The documented exception, and the reason this is worth measuring:
      // `cloudAt` seeds every target 0, so targets 0 and 2 sitting at the
      // same position make copies that ARE the same points — one primitive
      // to every identity-keyed decision, exactly the hazard
      // mergePrimitives records. Give coincident targets distinct seeds.
      const coincident = draws(
        await copy(
          forkedSource(),
          { topology: "keep" },
          cloudAt([
            [0, 0, 0],
            [0, 10, 0],
            [0, 0, 0],
          ]),
        ),
      );
      expect(coincident.slice(4)).toEqual(coincident.slice(0, 2));
      expect(new Set(coincident).size).toBe(4);
    });

    it("refuses a misspelled value, and a source resized behind its own topology", async () => {
      // @ts-expect-error — the types refuse it too; the runtime refusal is the point
      await expect(copy(forkedSource(), { topology: "Keep" })).rejects.toThrow(
        /copyToPoints: topology must be "drop" or "keep", got "Keep"; "drop" copies/,
      );
      const desynced = forkedSource();
      desynced.attrs.vertex.resize(9);
      await expect(copy(desynced, { topology: "keep" })).rejects.toThrow(
        /copyToPoints: the source on pin "source" has 9 vertex attribute elements but 5 vertex references/,
      );
      // "drop" never reads the topology, so it is unaffected — the guard
      // belongs to the opt-in path and not to the node.
      await expect(copy(desynced)).resolves.toBeDefined();
    });

    it("registers topology as an enum defaulting to drop", () => {
      const info = getNodeType("copyToPoints").info;
      expect(info.params.topology.type).toBe("enum");
      expect(info.params.topology.default).toBe("drop");
      expect(info.params.topology.enum).toEqual(["drop", "keep"]);
      expect(info.params.topology.description).toMatch(/t \* nSource \+ s/);
      expect(info.params.topology.description).toMatch(/DETAIL domain is carried under NEITHER/);
    });
  });

  /**
   * PER-TARGET SOURCE SELECTION — `sourceGroupAttr` / `targetGroupAttr`.
   *
   * The measured gap these close: with one source cloud stamped on every
   * target, a vocabulary in which each target wants a DIFFERENT subset has
   * to stamp everything and filter the wrong copies away. The tests below
   * check the two things that makes true — the right copies survive, and
   * the ones that survive are IDENTICAL to the ones the broadcast would
   * have produced.
   */
  describe("per-target source selection", () => {
    /**
     * Five source points in two groups, INTERLEAVED — 7, 9, 7, 9, 7. A
     * library whose groups were contiguous would look correct under an
     * implementation that copied one range per target, so it cannot tell
     * a selection from a slice.
     */
    function library(): Geometry {
      const geo = seededCloudAt([
        [1, 0, 0],
        [0, 1, 0],
        [2, 0, 0],
        [0, 2, 0],
        [3, 0, 0],
      ]);
      const pose = geo.attrs.point.add("poseId", "i32", 1, -1);
      [7, 9, 7, 9, 7].forEach((v, i) => pose.set(i, v));
      return geo;
    }

    /** One target per key, ten units apart along +Z. */
    function asking(keys: number[]): Geometry {
      const geo = seededCloudAt(keys.map((_, i) => [0, 0, i * 10]));
      const want = geo.attrs.point.add("wantPose", "i32", 1, -1);
      keys.forEach((v, i) => want.set(i, v));
      return geo;
    }

    const SELECT = { sourceGroupAttr: "poseId", targetGroupAttr: "wantPose" };

    async function select(
      source: Geometry,
      target: Geometry,
      params: Record<string, unknown> = {},
    ): Promise<Geometry> {
      return firstGeo(
        (
          await runNode(copyToPoints, { ...SELECT, ...params }, {
            source: [makeGeometryItem(source)],
            target: [makeGeometryItem(target)],
          })
        ).out,
      );
    }

    it("gives each target only the source points its key asks for", async () => {
      const geo = await select(library(), asking([9, 7, 9]));
      // 2 + 3 + 2, not 5 * 3: the count is the sum of the blocks.
      expect(geo.pointCount).toBe(7);
      expect(positionsOf(geo)).toEqual([
        // Target 0 wants 9: source points 1 and 3, in SOURCE order.
        [0, 1, 0],
        [0, 2, 0],
        // Target 1 wants 7: source points 0, 2 and 4.
        [1, 0, 10],
        [2, 0, 10],
        [3, 0, 10],
        // Target 2 wants 9 again — the same block, on its own target.
        [0, 1, 20],
        [0, 2, 20],
      ]);
      // The key column is an ordinary source attribute and rides along.
      const pose = geo.attrs.point.require("poseId");
      expect([0, 1, 2, 3, 4, 5, 6].map((i) => pose.get(i))).toEqual([9, 9, 7, 7, 7, 9, 9]);
    });

    it("emits exactly the copies the broadcast-and-filter produced, seeds included", async () => {
      // THE EQUIVALENCE THE FEATURE CLAIMS. Selection must not perturb a
      // copy that would have existed anyway: same position bits, same
      // seed — the two halves of a point's identity.
      const all = firstGeo(
        (
          await runNode(copyToPoints, {}, {
            source: [makeGeometryItem(library())],
            target: [makeGeometryItem(asking([9, 7, 9]))],
          })
        ).out,
      );
      const picked = await select(library(), asking([9, 7, 9]));
      const wanted = [9, 7, 9];
      const keys = [7, 9, 7, 9, 7];
      const expectedRows: number[] = [];
      for (let t = 0; t < wanted.length; t++) {
        for (let s = 0; s < keys.length; s++) {
          if (keys[s] === wanted[t]) expectedRows.push(t * keys.length + s);
        }
      }
      expect(expectedRows.length).toBe(picked.pointCount);
      const allP = positionsOf(all);
      const pickedP = positionsOf(picked);
      const allSeed = all.attrs.point.require("seed");
      const pickedSeed = picked.attrs.point.require("seed");
      expectedRows.forEach((row, i) => {
        expect(pickedP[i]).toEqual(allP[row]);
        expect(pickedSeed.get(i)).toBe(allSeed.get(row));
      });
      // THE CONTROL. The equality above is worth nothing unless the
      // comparison can report "different": selection did drop copies.
      expect(picked.pointCount).toBeLessThan(all.pointCount);
    });

    it("gives a target that matches no source group an empty block, not an error", async () => {
      const geo = await select(library(), asking([9, 4, 7]), {
        targetIndexAttr: "anchor",
      });
      expect(geo.pointCount).toBe(5); // 2 + 0 + 3
      // Target 1 asked for a pose the library does not carry. It
      // contributes nothing and the targets around it are untouched —
      // same copies, same order, as if it had never been in the input.
      const anchor = geo.attrs.point.require("anchor");
      const anchors = [0, 1, 2, 3, 4].map((i) => anchor.get(i));
      // Target 1's index is MISSING from the column rather than present
      // with an empty block — the thing selection changes about it.
      expect(anchors).toEqual([0, 0, 2, 2, 2]);
      // -1 is still the value no copy holds, which is what makes it mean
      // "belongs to no target" for anything appended later.
      expect(anchors).not.toContain(-1);
      expect(positionsOf(geo)).toEqual([
        [0, 1, 0],
        [0, 2, 0],
        [1, 0, 20],
        [2, 0, 20],
        [3, 0, 20],
      ]);
    });

    it("selects on STRING keys by value, across two string tables", async () => {
      const source = seededCloudAt([
        [1, 0, 0],
        [0, 1, 0],
        [2, 0, 0],
      ]);
      const kit = source.attrs.point.add("kit", "string", 1, "");
      ["arch", "pillar", "arch"].forEach((v, i) => kit.setString(i, v));
      const target = seededCloudAt([
        [0, 0, 0],
        [0, 0, 10],
      ]);
      // Interned in the OPPOSITE order, so a table index means the other
      // word on this side: matching by index would pick the wrong block.
      const want = target.attrs.point.add("wantKit", "string", 1, "");
      want.setString(0, "pillar");
      want.setString(1, "arch");
      const geo = await select(source, target, {
        sourceGroupAttr: "kit",
        targetGroupAttr: "wantKit",
      });
      expect(positionsOf(geo)).toEqual([
        [0, 1, 0],
        [1, 0, 10],
        [2, 0, 10],
      ]);
      const outKit = geo.attrs.point.require("kit");
      expect([0, 1, 2].map((i) => outKit.getString(i))).toEqual(["pillar", "arch", "arch"]);
    });

    it("carries targetNames and targetIndexAttr onto the selected copies", async () => {
      const target = asking([7, 9]);
      const tint = target.attrs.point.add("tint", "f32", 3, [1, 1, 1]);
      tint.setTuple(0, [0.25, 0.5, 0.75]);
      tint.setTuple(1, [1, 0, 0]);
      const geo = await select(library(), target, {
        targetNames: ["tint", "wantPose"],
        targetIndexAttr: "anchor",
      });
      expect(geo.pointCount).toBe(5); // 3 + 2
      const anchor = geo.attrs.point.require("anchor");
      expect([0, 1, 2, 3, 4].map((i) => anchor.get(i))).toEqual([0, 0, 0, 1, 1]);
      const outTint = geo.attrs.point.require("tint");
      expect(outTint.getTuple(0)).toEqual([0.25, 0.5, 0.75]);
      expect(outTint.getTuple(2)).toEqual([0.25, 0.5, 0.75]);
      expect(outTint.getTuple(3)).toEqual([1, 0, 0]);
      // The TARGET's key carried alongside the SOURCE's, which is how a
      // graph checks the selection did what it was asked.
      const asked = geo.attrs.point.require("wantPose");
      const has = geo.attrs.point.require("poseId");
      for (let i = 0; i < geo.pointCount; i++) expect(asked.get(i)).toBe(has.get(i));
    });

    it("is deterministic — the same inputs cook to the same output", async () => {
      const once = snapshotGeometry(await select(library(), asking([9, 7, 9, 4])));
      const twice = snapshotGeometry(await select(library(), asking([9, 7, 9, 4])));
      expect(twice).toEqual(once);
      // THE CONTROL: the same comparison must be able to say "different".
      expect(snapshotGeometry(await select(library(), asking([7, 7, 9, 4])))).not.toEqual(once);
    });

    it("leaves the broadcast alone when both params are empty", async () => {
      // WHAT THIS TEST DOES AND DOES NOT PROVE. Both spellings below take
      // the same branch, so this pins the DEFAULTS — that an omitted param
      // means "" and not "match nothing" — and it pins the broadcast's
      // concrete shape. It is NOT the guard against a default-path
      // regression: that job belongs to the tests above this describe
      // block, which assert the shipped values directly and were not
      // touched when selection landed.
      async function stamp(params: Record<string, unknown>): Promise<Record<string, unknown>> {
        return snapshotGeometry(
          firstGeo(
            (
              await runNode(copyToPoints, params, {
                source: [makeGeometryItem(library())],
                target: [makeGeometryItem(asking([9, 7, 9]))],
              })
            ).out,
          ),
        );
      }
      const shipped = await stamp({ targetIndexAttr: "anchor" });
      expect(shipped.point).toMatchObject({ count: 15 }); // 5 * 3, the whole product
      expect(
        await stamp({ targetIndexAttr: "anchor", sourceGroupAttr: "", targetGroupAttr: "" }),
      ).toEqual(shipped);
      // THE CONTROL: the comparison can report "different".
      expect(
        snapshotGeometry(
          await select(library(), asking([9, 7, 9]), { targetIndexAttr: "anchor" }),
        ),
      ).not.toEqual(shipped);
    });

    it("cooks an empty source and an empty target without special-casing either", async () => {
      // A count that is zero on one side is the case where "the sum of the
      // blocks" and "the product" agree, and where an off-by-one in the
      // prefix sum would show as a throw rather than a wrong number.
      const emptySource = seededCloudAt([]);
      emptySource.attrs.point.add("poseId", "i32", 1, -1);
      const bare = await select(emptySource, asking([7, 9]));
      expect(bare.pointCount).toBe(0);
      expect(bare.attrs.point.has("poseId")).toBe(true);
      const noTargets = seededCloudAt([]);
      noTargets.attrs.point.add("wantPose", "i32", 1, -1);
      expect((await select(library(), noTargets)).pointCount).toBe(0);
      // And the same two on the broadcast path, which must not have
      // learned to throw either.
      const both = firstGeo(
        (
          await runNode(copyToPoints, {}, {
            source: [makeGeometryItem(emptySource)],
            target: [makeGeometryItem(asking([7]))],
          })
        ).out,
      );
      expect(both.pointCount).toBe(0);
    });

    it("refuses one param without the other, naming both and the fix", async () => {
      await expect(select(library(), asking([7]), { targetGroupAttr: "" })).rejects.toThrow(
        /copyToPoints: params "sourceGroupAttr" and "targetGroupAttr" work only as a PAIR — "sourceGroupAttr" is set and "targetGroupAttr" is empty/,
      );
      await expect(select(library(), asking([7]), { sourceGroupAttr: "" })).rejects.toThrow(
        /copyToPoints: params "sourceGroupAttr" and "targetGroupAttr" work only as a PAIR — "targetGroupAttr" is set and "sourceGroupAttr" is empty/,
      );
    });

    it("refuses a fractional key on either side, naming the point", async () => {
      const source = library();
      const loose = source.attrs.point.add("poseF", "f32", 1, 0);
      [7, 9, 7.5, 9, 7].forEach((v, i) => loose.set(i, v));
      await expect(select(source, asking([7]), { sourceGroupAttr: "poseF" })).rejects.toThrow(
        /copyToPoints: source point 2 has poseF = 7\.5, which is not a whole number; a selection key is an IDENTITY/,
      );
      const target = asking([7, 9]);
      const wantF = target.attrs.point.add("wantF", "f32", 1, 0);
      wantF.set(0, 7);
      wantF.set(1, 9.25);
      await expect(
        select(source, target, { sourceGroupAttr: "poseId", targetGroupAttr: "wantF" }),
      ).rejects.toThrow(/copyToPoints: target point 1 has wantF = 9\.25, which is not a whole number/);
    });

    it("names WHICH side is missing the key attribute", async () => {
      await expect(select(library(), asking([7]), { sourceGroupAttr: "nope" })).rejects.toThrow(
        /param "sourceGroupAttr" names point attribute "nope", which the source on pin "source" has no point attribute for/,
      );
      await expect(select(library(), asking([7]), { targetGroupAttr: "nope" })).rejects.toThrow(
        /param "targetGroupAttr" names point attribute "nope", which the target on pin "target" has no point attribute for/,
      );
    });

    it("refuses a non-scalar key and a string key matched against a number", async () => {
      await expect(select(library(), asking([7]), { sourceGroupAttr: "P" })).rejects.toThrow(
        /param "sourceGroupAttr" names source on pin "source" attribute "P" with tupleSize 3; a selection key must be scalar/,
      );
      const target = asking([7]);
      const named = target.attrs.point.add("wantName", "string", 1, "");
      named.setString(0, "7");
      await expect(select(library(), target, { targetGroupAttr: "wantName" })).rejects.toThrow(
        /param "targetGroupAttr" names a string attribute and "sourceGroupAttr" names a numeric one \(i32\); a string key can never equal a number/,
      );
    });

    describe('with topology "keep"', () => {
      /**
       * Two polylines, each wholly inside one group, plus a third that
       * STRADDLES them — the case only the survival rule answers.
       */
      function pathLibrary(withStraddler: boolean): Geometry {
        const geo = seededCloudAt([
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
          [0, 5, 0],
          [1, 5, 0],
        ]);
        const kit = geo.attrs.point.add("kit", "string", 1, "");
        ["arch", "arch", "arch", "bar", "bar"].forEach((v, i) => kit.setString(i, v));
        if (withStraddler) {
          setPolylineTopology(geo, [0, 1, 2, 3, 4, 2, 3], [0, 3, 5], [3, 2, 2]);
        } else {
          setPolylineTopology(geo, [0, 1, 2, 3, 4], [0, 3], [3, 2]);
        }
        const width = geo.attrs.primitive.add("width", "f32", 1, 0);
        [0.5, 1.5, 2.5].slice(0, withStraddler ? 3 : 2).forEach((v, i) => width.set(i, v));
        // A per-VERTEX column, valued by its own source index, so a
        // re-emitted primitive whose vertices moved can be told from one
        // whose vertices were copied at the offset they arrived at.
        const uv = geo.attrs.vertex.add("uv", "f32", 1, 0);
        for (let v = 0; v < geo.vertexCount; v++) uv.set(v, 100 + v);
        return geo;
      }

      function kitTargets(keys: string[]): Geometry {
        const geo = seededCloudAt(keys.map((_, i) => [0, 0, i * 10]));
        const want = geo.attrs.point.add("wantKit", "string", 1, "");
        keys.forEach((v, i) => want.setString(i, v));
        return geo;
      }

      async function keep(source: Geometry, target: Geometry): Promise<Geometry> {
        return firstGeo(
          (
            await runNode(
              copyToPoints,
              { sourceGroupAttr: "kit", targetGroupAttr: "wantKit", topology: "keep" },
              {
                source: [makeGeometryItem(source)],
                target: [makeGeometryItem(target)],
              },
            )
          ).out,
        );
      }

      it("re-emits only the primitives whose points the block holds", async () => {
        const geo = await keep(pathLibrary(false), kitTargets(["bar", "arch"]));
        expect(geo.pointCount).toBe(5); // 2 + 3
        expect(geo.primitiveCount).toBe(2); // NOT nTarget * nSourcePrimitives
        expect(geo.vertexCount).toBe(5);
        // Block 0 is the "bar" path on target 0 (points 0-1), block 1 the
        // "arch" path on target 1 (points 2-4).
        expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2, 3, 4]);
        expect(Array.from(geo.primVertexStart)).toEqual([0, 2]);
        expect(Array.from(geo.primVertexCount)).toEqual([2, 3]);
        expect(primitiveTypeCounts(geo)).toEqual({ polyline: 2 });
        // And each re-emitted primitive carries its ORIGINAL's columns —
        // the bar's width first, because the bar's target came first.
        const width = geo.attrs.primitive.require("width");
        expect([0, 1].map((i) => width.get(i))).toEqual([1.5, 0.5]);
        // The VERTEX columns follow the primitives that own them, not the
        // slots they arrived in: the bar's two vertices were 3 and 4 in
        // the source and come out first, ahead of the arch's 0, 1 and 2.
        const uv = geo.attrs.vertex.require("uv");
        expect([0, 1, 2, 3, 4].map((i) => uv.get(i))).toEqual([103, 104, 100, 101, 102]);
        expect(positionsOf(geo)).toEqual([
          [0, 5, 0],
          [1, 5, 0],
          [0, 0, 10],
          [1, 0, 10],
          [2, 0, 10],
        ]);
      });

      it("re-emits a primitive that straddles two keys for NEITHER block", async () => {
        const geo = await keep(pathLibrary(true), kitTargets(["bar", "arch"]));
        // The straddler walks points 2 ("arch") and 3 ("bar"), so neither
        // block holds all of its points and neither re-emits it. Its two
        // vertices go with it: the source had 7 and the output has 5, in
        // the surviving primitives' own order.
        expect(geo.pointCount).toBe(5);
        expect(geo.primitiveCount).toBe(2);
        expect(geo.vertexCount).toBe(5);
        expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2, 3, 4]);
        expect(Array.from(geo.primVertexStart)).toEqual([0, 2]);
        expect(Array.from(geo.primVertexCount)).toEqual([2, 3]);
        const width = geo.attrs.primitive.require("width");
        expect([0, 1].map((i) => width.get(i))).toEqual([1.5, 0.5]);
        const uv = geo.attrs.vertex.require("uv");
        expect([0, 1, 2, 3, 4].map((i) => uv.get(i))).toEqual([103, 104, 100, 101, 102]);
      });

      it("gives a target that matched nothing no primitives either", async () => {
        const geo = await keep(pathLibrary(false), kitTargets(["gate", "arch"]));
        expect(geo.pointCount).toBe(3);
        expect(geo.primitiveCount).toBe(1);
        expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2]);
        expect(Array.from(geo.primVertexStart)).toEqual([0]);
      });

      /**
       * A source whose vertex array does NOT tile: the two polylines'
       * ranges arrive out of order and a seventh vertex belongs to no
       * primitive at all. This is the one input on which the selected and
       * unselected blocks genuinely differ, which the `topology`
       * description promises and nothing else here exercises.
       */
      function untiledSource(): Geometry {
        const geo = seededCloudAt([
          [0, 0, 0],
          [1, 0, 0],
          [0, 5, 0],
          [1, 5, 0],
        ]);
        const kit = geo.attrs.point.add("kit", "string", 1, "");
        ["arch", "arch", "bar", "bar"].forEach((v, i) => kit.setString(i, v));
        // vertices:      0     1     2     3     4  (4 is referenced by
        // nothing) and the BAR's range comes first.
        setPolylineTopology(geo, [2, 3, 0, 1, 1], [0, 2], [2, 2]);
        const uv = geo.attrs.vertex.add("uv", "f32", 1, 0);
        for (let v = 0; v < geo.vertexCount; v++) uv.set(v, 100 + v);
        return geo;
      }

      it("copies an untiled vertex layout verbatim, and compacts it under selection", async () => {
        // WITHOUT selection: verbatim, gaps and all. Two targets, so 10
        // vertices for 4 primitives — the unreferenced vertex is copied
        // into both blocks because the block IS the source's array.
        const plain = firstGeo(
          (
            await runNode(copyToPoints, { topology: "keep" }, {
              source: [makeGeometryItem(untiledSource())],
              target: [makeGeometryItem(kitTargets(["bar", "arch"]))],
            })
          ).out,
        );
        expect(plain.vertexCount).toBe(10);
        expect(Array.from(plain.vertexToPoint)).toEqual([2, 3, 0, 1, 1, 6, 7, 4, 5, 5]);
        expect(Array.from(plain.primVertexStart)).toEqual([0, 2, 5, 7]);
        const plainUv = plain.attrs.vertex.require("uv");
        expect(Array.from({ length: 10 }, (_, i) => plainUv.get(i))).toEqual([
          100, 101, 102, 103, 104, 100, 101, 102, 103, 104,
        ]);

        // WITH selection: each block is the surviving primitives' own
        // vertices, in primitive order. The unreferenced vertex 4 is gone
        // from both blocks, and the bar's range no longer sits second.
        const picked = await keep(untiledSource(), kitTargets(["bar", "arch"]));
        expect(picked.pointCount).toBe(4); // 2 + 2
        expect(picked.vertexCount).toBe(4);
        expect(picked.primitiveCount).toBe(2);
        expect(Array.from(picked.vertexToPoint)).toEqual([0, 1, 2, 3]);
        expect(Array.from(picked.primVertexStart)).toEqual([0, 2]);
        const uv = picked.attrs.vertex.require("uv");
        expect([0, 1, 2, 3].map((i) => uv.get(i))).toEqual([100, 101, 102, 103]);
      });

      it("refuses a source whose vertices reference points it does not have", async () => {
        const broken = untiledSource();
        // Shrink the point domain BEHIND the topology, which is the only
        // way to build a vertex reference past the cloud.
        broken.attrs.point.resize(3);
        await expect(keep(broken, kitTargets(["bar"]))).rejects.toThrow(
          /copyToPoints: the source on pin "source" has vertex 1 referencing point 3, but the source has only 3 points; rebuild its topology with setTopology/,
        );
      });
    });

    it("registers both selection params as strings defaulting to empty", () => {
      const info = getNodeType("copyToPoints").info;
      for (const name of ["sourceGroupAttr", "targetGroupAttr"]) {
        expect(info.params[name].type).toBe("string");
        expect(info.params[name].default).toBe("");
      }
      expect(info.params.sourceGroupAttr.description).toMatch(
        /two values a ULP apart would be two groups/,
      );
      expect(info.params.targetGroupAttr.description).toMatch(
        /takes zero copies and that is legal/,
      );
      expect(info.params.topology.description).toMatch(
        /ALL of its points are in that target's block/,
      );
    });
  });
});

describe("mergePoints", () => {
  it("concatenates inputs and unions attributes with defaults", async () => {
    const a = cloudAt([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    const fooA = a.attrs.point.add("foo", "f32", 1, 7);
    fooA.set(0, 1);
    fooA.set(1, 2);
    const b = cloudAt([
      [2, 0, 0],
      [3, 0, 0],
      [4, 0, 0],
    ]);
    const geo = firstGeo(
      (
        await runNode(mergePoints, {}, {
          in: [makeGeometryItem(a, ["treeA"]), makeGeometryItem(b, ["treeB"])],
        })
      ).out,
    );
    expect(geo.pointCount).toBe(5);
    expect(positionsOf(geo).map((p) => p[0])).toEqual([0, 1, 2, 3, 4]);
    // b lacks foo: its range fills with foo's default (7).
    const foo = geo.attrs.point.require("foo");
    expect([0, 1, 2, 3, 4].map((i) => foo.get(i))).toEqual([1, 2, 7, 7, 7]);
  });

  it("rejects conflicting attribute shapes, naming the attribute", async () => {
    const a = cloudAt([[0, 0, 0]]);
    a.attrs.point.add("bar", "f32", 1, 0);
    const b = cloudAt([[1, 0, 0]]);
    b.attrs.point.add("bar", "i32", 1, 0);
    await expect(
      runNode(mergePoints, {}, { in: [makeGeometryItem(a), makeGeometryItem(b)] }),
    ).rejects.toThrow(/attribute "bar" has conflicting shapes/);
  });

  it("merges zero inputs into an empty cloud", async () => {
    const geo = firstGeo((await runNode(mergePoints, {}, {})).out);
    expect(geo.pointCount).toBe(0);
  });
});

describe("merges: a column an input lacks, in a result sized without a fill", () => {
  // Both merges size their result WITHOUT the default fill and write each
  // input's block themselves, so these pin what that fill used to supply:
  // a non-zero, non-uniform default over the block of every input that
  // lacks the column — first, middle and last. Fresh storage reads 0
  // there, which is what lets each expectation fail.
  const TINT = [0.25, 0.5, 0.75, 1];

  function tinted(positions: number[][], tints: number[][], labels: string[]) {
    const geo = cloudAt(positions);
    const tint = geo.attrs.point.add("tint", "f32", 4, TINT);
    const label = geo.attrs.point.add("label", "string", 1, "none");
    tints.forEach((t, i) => tint.setTuple(i, t));
    labels.forEach((s, i) => label.setString(i, s));
    return geo;
  }

  it("mergePoints: every lacking block reads the default, and the result is exactly its count", async () => {
    const lackFirst = cloudAt([[0, 0, 0]]);
    const a = tinted([[1, 0, 0], [2, 0, 0]], [[1, 0, 0, 1], [0, 1, 0, 1]], ["x", "y"]);
    const lackMid = cloudAt([[3, 0, 0], [4, 0, 0]]);
    const b = tinted([[5, 0, 0]], [[0, 0, 1, 1]], ["x"]);
    const lackLast = cloudAt([[6, 0, 0]]);
    const geo = firstGeo(
      (
        await runNode(mergePoints, {}, {
          in: [lackFirst, a, lackMid, b, lackLast].map((g) => makeGeometryItem(g)),
        })
      ).out,
    );
    expect(geo.pointCount).toBe(7);
    const tint = geo.attrs.point.require("tint");
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => tint.getTuple(i))).toEqual([
      TINT,
      [1, 0, 0, 1],
      [0, 1, 0, 1],
      TINT,
      TINT,
      [0, 0, 1, 1],
      TINT,
    ]);
    const label = geo.attrs.point.require("label");
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => label.getString(i))).toEqual([
      "none", "x", "y", "none", "none", "x", "none",
    ]);
    // The table a whole-result fill built: the default in slot 0, then
    // each word in the order the copies met it.
    expect(label.stringTable).toEqual(["none", "x", "y"]);
    // The standard columns every input carries, copied whole.
    expect(positionsOf(geo).map((p) => p[0])).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const attr of geo.attrs.point) expect(attr.capacity).toBe(7);
  });

  it("mergePrimitives: the same, on the vertex and primitive domains", async () => {
    const UV = [0.5, 0.25];
    const withUv = (x: number, weight: number | undefined) => {
      const mesh = createTriangleMesh([x, 0, 0, x + 1, 0, 0, x, 0, 1], [0, 1, 2]);
      const uv = mesh.attrs.vertex.add("uv", "f32", 2, UV);
      for (let v = 0; v < 3; v++) uv.setTuple(v, [x + v, 5 - v]);
      if (weight !== undefined) mesh.attrs.primitive.add("weight", "f32", 1, 3).set(0, weight);
      return mesh;
    };
    const plain = () => createPolyline([9, 0, 0, 9, 1, 0]);
    const geo = firstGeo(
      (
        await runNode(mergePrimitives, {}, {
          in: [plain(), withUv(0, 7), plain(), withUv(10, undefined), plain()].map((g) =>
            makeGeometryItem(g),
          ),
        })
      ).out,
    );
    expect(geo.vertexCount).toBe(2 + 3 + 2 + 3 + 2);
    expect(geo.primitiveCount).toBe(5);
    const uv = geo.attrs.vertex.require("uv");
    const uvs = Array.from({ length: geo.vertexCount }, (_, v) => uv.getTuple(v));
    expect(uvs).toEqual([
      UV, UV,
      [0, 5], [1, 4], [2, 3],
      UV, UV,
      [10, 5], [11, 4], [12, 3],
      UV, UV,
    ]);
    const weight = geo.attrs.primitive.require("weight");
    expect([0, 1, 2, 3, 4].map((p) => weight.get(p))).toEqual([3, 7, 3, 3, 3]);
    const primtype = geo.attrs.primitive.require("primtype");
    expect([0, 1, 2, 3, 4].map((p) => primtype.getString(p))).toEqual([
      "polyline", "poly", "polyline", "poly", "polyline",
    ]);
    expect(geo.attrs.point.capacity).toBe(geo.pointCount);
    expect(geo.attrs.vertex.capacity).toBe(geo.vertexCount);
    expect(geo.attrs.primitive.capacity).toBe(geo.primitiveCount);
  });
});

describe("mergePrimitives", () => {
  /**
   * A triangle whose topology came from bare `setTopology`, so it carries
   * NO `primtype` column — the case the union rule mislabels if `primtype`
   * is treated as an ordinary attribute. `createTriangleMesh` stamps one,
   * which is exactly why it cannot be used to build this.
   */
  function untaggedTriangle(offsetX = 0): Geometry {
    const geo = new Geometry();
    const P = geo.attrs.point.add("P", "f32", 3);
    geo.attrs.point.resize(3);
    P.writable().set([offsetX, 0, 0, offsetX + 1, 0, 0, offsetX, 0, 1]);
    geo.setTopology(Uint32Array.of(0, 1, 2), Uint32Array.of(0), Uint32Array.of(3));
    return geo;
  }

  /** A seeded cloud wired into `n - 1` consecutive 2-vertex polylines. */
  function chain(positions: number[][]): Geometry {
    const geo = seededCloudAt(positions);
    const idx: number[] = [];
    const start: number[] = [];
    const count: number[] = [];
    for (let i = 0; i + 1 < positions.length; i++) {
      start.push(idx.length);
      count.push(2);
      idx.push(i, i + 1);
    }
    setPolylineTopology(geo, idx, start, count);
    return geo;
  }

  async function merge(...geos: Geometry[]): Promise<Geometry> {
    return firstGeo(
      (await runNode(mergePrimitives, {}, { in: geos.map((g) => makeGeometryItem(g)) })).out,
    );
  }

  it("keeps both inputs' topology, renumbered onto one geometry", async () => {
    const mesh = createTriangleMesh([0, 0, 0, 1, 0, 0, 0, 0, 1], [0, 1, 2]);
    const net = createPolyline([5, 0, 0, 6, 0, 0, 7, 0, 0]);
    const geo = await merge(mesh, net);
    expect(geo.pointCount).toBe(6);
    expect(geo.vertexCount).toBe(6);
    expect(geo.primitiveCount).toBe(2);
    // The network's polyline still walks its own points, three points on.
    expect(Array.from(geo.primVertexStart)).toEqual([0, 3]);
    expect(Array.from(geo.primVertexCount)).toEqual([3, 3]);
    expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(positionsOf(geo).map((p) => p[0])).toEqual([0, 1, 0, 5, 6, 7]);
    expect(primitiveTypeCounts(geo)).toEqual({ poly: 1, polyline: 1 });
  });

  it("does not stamp an untagged mesh with another input's primtype", async () => {
    // THE HAZARD. `primtype` is a type tag, not a value, so the union
    // rule's default fill would relabel an untagged triangle as whichever
    // kind the first tagged input established — after which surfaceSample
    // skips it and a line renderer draws it. Both orders, because the
    // default fill mislabels from either side.
    const net = createPolyline([5, 0, 0, 6, 0, 0]);
    const netFirst = await merge(net, untaggedTriangle());
    const tags = netFirst.attrs.primitive.require("primtype");
    expect(tags.getString(0)).toBe("polyline");
    expect(tags.getString(1)).toBe("");
    expect(primitiveTypeCounts(netFirst)).toEqual({ polyline: 1, "": 1 });

    const meshFirst = await merge(untaggedTriangle(), net);
    const flipped = meshFirst.attrs.primitive.require("primtype");
    expect(flipped.getString(0)).toBe("");
    expect(flipped.getString(1)).toBe("polyline");
    expect(primitiveTypeCounts(meshFirst)).toEqual({ "": 1, polyline: 1 });
  });

  it("invents no primtype column when no input carries one", async () => {
    const geo = await merge(untaggedTriangle(), untaggedTriangle(4));
    expect(geo.attrs.primitive.has("primtype")).toBe(false);
    expect(primitiveTypeCounts(geo)).toEqual({});
  });

  it("keeps a tagged mesh samplable with a network merged in", async () => {
    // A quad at y = 0 and a polyline at y = 5: every sample landing at
    // y = 0 is the proof surfaceSample found the mesh's triangles and only
    // those, whatever else the geometry now holds.
    const mesh = createTriangleMesh(
      [0, 0, 0, 4, 0, 0, 4, 0, 4, 0, 0, 4],
      [0, 1, 2, 0, 2, 3],
    );
    const net = createPolyline([0, 5, 0, 4, 5, 0, 4, 5, 4]);
    const geo = await merge(mesh, net);
    expect(primitiveTypeCounts(geo)).toEqual({ poly: 2, polyline: 1 });
    const sampled = firstGeo(
      (await runNode(surfaceSample, { count: 64 }, { in: [makeGeometryItem(geo)] })).out,
    );
    expect(sampled.pointCount).toBe(64);
    for (const [x, y, z] of positionsOf(sampled)) {
      expect(y).toBe(0);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(4);
      expect(z).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThanOrEqual(4);
    }
  });

  it("takes an input with no topology as points only", async () => {
    const cloud = cloudAt([
      [9, 0, 0],
      [9, 0, 1],
    ]);
    const net = createPolyline([0, 0, 0, 1, 0, 0]);
    const geo = await merge(cloud, net);
    expect(geo.pointCount).toBe(4);
    expect(geo.primitiveCount).toBe(1);
    // The polyline's two vertices moved past the cloud's points.
    expect(Array.from(geo.vertexToPoint)).toEqual([2, 3]);
    expect(positionsOf(geo).map((p) => p[0])).toEqual([9, 9, 0, 1]);
  });

  it("rejects conflicting attribute shapes, naming the attribute and the domain", async () => {
    const a = createPolyline([0, 0, 0, 1, 0, 0]);
    a.attrs.primitive.add("width", "f32", 1, 0);
    const b = createPolyline([2, 0, 0, 3, 0, 0]);
    b.attrs.primitive.add("width", "i32", 1, 0);
    await expect(
      runNode(mergePrimitives, {}, { in: [makeGeometryItem(a), makeGeometryItem(b)] }),
    ).rejects.toThrow(/attribute "width" has conflicting shapes across inputs on the primitive domain/);
  });

  it("merges zero inputs into an empty cloud", async () => {
    const geo = firstGeo((await runNode(mergePrimitives, {}, {})).out);
    expect(geo.pointCount).toBe(0);
    expect(geo.primitiveCount).toBe(0);
  });

  it("copies a single input rather than passing it through", async () => {
    const net = createPolyline([0, 0, 0, 1, 0, 0, 2, 0, 0]);
    const geo = await merge(net);
    expect(geo).not.toBe(net);
    expect(geo.pointCount).toBe(3);
    expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2]);
    // Writing to the copy must not reach back into the input.
    geo.attrs.point.require("P").set(0, 99);
    expect(net.attrs.point.require("P").get(0)).toBe(0);
  });

  it("unions vertex and primitive attributes with defaults over the other input's range", async () => {
    const a = createPolyline([0, 0, 0, 1, 0, 0]);
    const w = a.attrs.primitive.add("width", "f32", 1, 3);
    w.set(0, 1.5);
    const uv = a.attrs.vertex.add("uv", "f32", 2, [7, 7]);
    uv.setTuple(0, [0, 0]);
    uv.setTuple(1, [1, 0]);
    const b = createPolyline([2, 0, 0, 3, 0, 0]);
    const geo = await merge(a, b);
    const width = geo.attrs.primitive.require("width");
    expect([width.get(0), width.get(1)]).toEqual([1.5, 3]);
    const merged = geo.attrs.vertex.require("uv");
    expect([0, 1, 2, 3].map((i) => merged.getTuple(i))).toEqual([
      [0, 0],
      [1, 0],
      [7, 7],
      [7, 7],
    ]);
  });

  it("keeps each primitive's randomField draw, whichever side it came from", async () => {
    // Primitive identity is the fold of its own points' identities, and a
    // union moves neither a position nor a seed — so a primitive keeps its
    // draw across the merge, and keeps it when the inputs swap places.
    const a = chain([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ]);
    const b = chain([
      [10, 0, 0],
      [11, 0, 0],
    ]);
    const draws = (geo: Geometry): number[] =>
      Array.from(evaluateField(randomField("edge"), { geo, domain: "primitive", seed: 9 }).data);
    const alone = draws(a);
    expect(alone.length).toBe(2);
    expect(new Set(alone).size).toBe(2);
    expect(draws(await merge(a, b))).toEqual([...alone, ...draws(b)]);
    expect(draws(await merge(b, a))).toEqual([...draws(b), ...alone]);
  });
});

describe("setBounds", () => {
  it("stamps boundsMin/boundsMax on every point", async () => {
    const input = cloudAt([
      [0, 0, 0],
      [1, 1, 1],
    ]);
    const geo = firstGeo(
      (
        await runNode(setBounds, { boundsMin: [-1, -2, -3], boundsMax: [4, 5, 6] }, {
          in: [makeGeometryItem(input)],
        })
      ).out,
    );
    for (let i = 0; i < 2; i++) {
      expect(geo.attrs.point.require("boundsMin").getTuple(i)).toEqual([-1, -2, -3]);
      expect(geo.attrs.point.require("boundsMax").getTuple(i)).toEqual([4, 5, 6]);
    }
  });

  it("takes a per-point corner as a field, which one constant cannot say", async () => {
    // Each point gets the box IT asks for: the corner is read from the
    // point's own position, so the two points end up with different
    // extents in a single cook.
    const input = cloudAt([
      [0, 0, 0],
      [2, 0, 0],
    ]);
    const geo = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: vec(0, 0, 0), boundsMax: vec(component(position(), 0), 1, 1) },
          { in: [makeGeometryItem(input)] },
        )
      ).out,
    );
    expect(geo.attrs.point.require("boundsMax").getTuple(0)).toEqual([0, 1, 1]);
    expect(geo.attrs.point.require("boundsMax").getTuple(1)).toEqual([2, 1, 1]);
  });

  it("a constant field equals the plain corner, with a control that differs", async () => {
    // f32-exact values on purpose: a field resolves into an f32 column,
    // so an inexact literal would differ for a real reason and this test
    // would be asserting the wrong thing.
    const input = cloudAt([[0, 0, 0], [1, 1, 1]]);
    const run = async (min: unknown, max: unknown) =>
      firstGeo(
        (
          await runNode(setBounds, { boundsMin: min, boundsMax: max } as never, {
            in: [makeGeometryItem(input)],
          })
        ).out,
      ).attrs.point.require("boundsMax").getTuple(1);
    expect(await run([0, 0, 0], constant([2.5, 0.25, 4]))).toEqual(await run([0, 0, 0], [2.5, 0.25, 4]));
    // CONTROL: the comparison must be able to report a difference.
    expect(await run([0, 0, 0], [2.5, 0.25, 4])).not.toEqual(await run([0, 0, 0], [2.5, 0.25, 8]));
  });

  it("refuses a scalar corner rather than broadcasting it to a cube", async () => {
    await expect(
      runNode(setBounds, { boundsMax: constant(3) } as never, {
        in: [makeGeometryItem(cloudAt([[0, 0, 0]]))] ,
      }),
    ).rejects.toThrow(/must evaluate to THREE numbers per point/);
  });

  it("resolves both corners against the INPUT, in either direction", async () => {
    // Each corner is asked to read the OTHER one. Both must see the
    // geometry this cook was HANDED. The node used to resolve inside the
    // write loop, so `boundsMin` was already stamped by the time
    // `boundsMax` resolved and read it back -- while the reverse
    // direction, resolving before anything was written, was correct. One
    // param order right and the other wrong is the tell: nothing in the
    // docs makes these two writes ordered, so neither may observe the
    // other. (Same aliasing setAttribute snapshots against.)
    const seed = (): ReturnType<typeof cloudAt> => {
      const c = cloudAt([[0, 0, 0], [1, 1, 1]]);
      const lo = c.attrs.point.require("boundsMin");
      const hi = c.attrs.point.require("boundsMax");
      for (let i = 0; i < 2; i++) {
        lo.setTuple(i, [7, 8, 9]);
        hi.setTuple(i, [3, 4, 5]);
      }
      return c;
    };
    const maxReadsMin = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: [-1, -1, -1], boundsMax: attribute("boundsMin", 3) },
          { in: [makeGeometryItem(seed())] },
        )
      ).out,
    );
    expect(maxReadsMin.attrs.point.require("boundsMin").getTuple(0)).toEqual([-1, -1, -1]);
    expect(maxReadsMin.attrs.point.require("boundsMax").getTuple(0)).toEqual([7, 8, 9]);
    expect(maxReadsMin.attrs.point.require("boundsMax").getTuple(1)).toEqual([7, 8, 9]);

    const minReadsMax = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: attribute("boundsMax", 3), boundsMax: [-1, -1, -1] },
          { in: [makeGeometryItem(seed())] },
        )
      ).out,
    );
    expect(minReadsMax.attrs.point.require("boundsMax").getTuple(0)).toEqual([-1, -1, -1]);
    expect(minReadsMax.attrs.point.require("boundsMin").getTuple(0)).toEqual([3, 4, 5]);
  });

  it("a corner that reads ITSELF keeps the input's value", async () => {
    // Documentation, not a guard: the old write loop copied element by
    // element out of the very column it was writing, at the same index,
    // so a self-read was an identity no-op and passed before the fix too.
    // The two tests above are the ones that discriminate.
    const input = cloudAt([[0, 0, 0]]);
    input.attrs.point.require("boundsMax").setTuple(0, [2, 3, 4]);
    const geo = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMax: attribute("boundsMax", 3) },
          { in: [makeGeometryItem(input)] },
        )
      ).out,
    );
    expect(geo.attrs.point.require("boundsMax").getTuple(0)).toEqual([2, 3, 4]);
  });

  it("a DERIVED read of the other corner is what snapshotting alone cannot fix", async () => {
    // `add(...)` allocates its own column, so nothing here aliases either
    // target and the snapshot guard never fires. Only resolving before the
    // write phase gets this right. A later "fix" that guarded inside
    // boundsCorner and left the ordering alone would pass every other test
    // in this block and fail this one.
    const c = cloudAt([[0, 0, 0]]);
    c.attrs.point.require("boundsMin").setTuple(0, [7, 8, 9]);
    const geo = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: [-1, -1, -1], boundsMax: add(attribute("boundsMin", 3), vec(1, 1, 1)) },
          { in: [makeGeometryItem(c)] },
        )
      ).out,
    );
    expect(geo.attrs.point.require("boundsMax").getTuple(0)).toEqual([8, 9, 10]);
  });

  it("a mutual swap reads the input on both sides", async () => {
    // The exact statement of what the two params now promise: neither may
    // observe the other's write, whichever order the node writes in.
    const c = cloudAt([[0, 0, 0]]);
    c.attrs.point.require("boundsMin").setTuple(0, [7, 8, 9]);
    c.attrs.point.require("boundsMax").setTuple(0, [3, 4, 5]);
    const geo = firstGeo(
      (
        await runNode(
          setBounds,
          { boundsMin: attribute("boundsMax", 3), boundsMax: attribute("boundsMin", 3) },
          { in: [makeGeometryItem(c)] },
        )
      ).out,
    );
    expect(geo.attrs.point.require("boundsMin").getTuple(0)).toEqual([3, 4, 5]);
    expect(geo.attrs.point.require("boundsMax").getTuple(0)).toEqual([7, 8, 9]);
  });
});

describe("setBounds: a size box about each point's P (anchor)", () => {
  // Every expectation is f32-exact and written out by hand from the size
  // and the anchor's rule, never recorded from a run. The box is an extent
  // in the point's own frame (world = P + rot * (scale * x)), so P never
  // enters the corners: lo = -f * size, hi = (1 - f) * size.
  const box = (geo: ReturnType<typeof cloudAt>, i: number): [number[], number[]] => [
    geo.attrs.point.require("boundsMin").getTuple(i),
    geo.attrs.point.require("boundsMax").getTuple(i),
  ];
  const run = async (input: ReturnType<typeof cloudAt>, params: Record<string, unknown>) =>
    firstGeo((await runNode(setBounds, params as never, { in: [makeGeometryItem(input)] })).out);
  const two = (): ReturnType<typeof cloudAt> => cloudAt([[5, 7, 9], [-2.5, 0, 1]]);

  it.each([
    // anchor, every point's box -- size [4, 2, 6] throughout
    ["center", [[-2, -1, -3], [2, 1, 3]]],
    ["baseCenter", [[-2, 0, -3], [2, 2, 3]]],
    ["min", [[0, 0, 0], [4, 2, 6]]],
  ] as const)("anchor %s sizes the box about P by its rule, the same box whatever P", async (anchor, b) => {
    const geo = await run(two(), { anchor, size: [4, 2, 6] });
    expect(box(geo, 0)).toEqual(b);
    expect(box(geo, 1)).toEqual(b);
    // Only the box changes: P is neither read nor moved.
    expect(positionsOf(geo)).toEqual([[5, 7, 9], [-2.5, 0, 1]]);
  });

  it.each([
    ["baseCenter", [4, 2, 6]],
    ["min", [4, 2, 6]],
    // A size of -0 is a length >= 0, accepted; (1 - f) * -0 is -0, which
    // only the trailing + 0 keeps out of the bytes.
    ["baseCenter", [-0, -0, -0]],
    ["min", [-0, -0, -0]],
  ] as const)("anchor %s with size %j writes no -0", async (anchor, size) => {
    const geo = await run(two(), { anchor, size });
    const corners = [
      ...geo.attrs.point.require("boundsMin").data.slice(0, 6),
      ...geo.attrs.point.require("boundsMax").data.slice(0, 6),
    ];
    expect(corners.length).toBe(12);
    for (const v of corners) expect(Object.is(v, -0)).toBe(false);
    // CONTROL: the check can see a -0 when an f32 column holds one.
    expect(Object.is(new Float32Array([-0 * 4])[0], -0)).toBe(true);
  });

  it("the default anchor is still the two corners, P unread", async () => {
    const geo = await run(two(), { boundsMin: [-1, -2, -3], boundsMax: [4, 5, 6] });
    expect(box(geo, 0)).toEqual([[-1, -2, -3], [4, 5, 6]]);
    expect(box(geo, 1)).toEqual([[-1, -2, -3], [4, 5, 6]]);
    expect(setBounds.defaultParams).toMatchObject({ anchor: "corners", size: [1, 1, 1] });
  });

  it("a size of 0 on an axis is a box of no volume there, kept", async () => {
    const geo = await run(two(), { anchor: "baseCenter", size: [4, 0, 6] });
    expect(box(geo, 0)).toEqual([[-2, 0, -3], [2, 0, 3]]);
    expect(geo.pointCount).toBe(2);
  });

  it("is a LOCAL extent: a rotated, scaled point gets the plain point's box, and P, rot and scale ride through", async () => {
    // The box is in the point's own frame, so the point's transform turns
    // and scales it in the world; the stored corners are the same bytes an
    // unturned, unscaled point gets.
    const plain = cloudAt([[5, 7, 9]]);
    const turned = cloudAt([[5, 7, 9]]);
    turned.attrs.point.require("rot").setTuple(0, quatFromEulerDeg([0, 0, 0, 1], 0, 45, 0));
    turned.attrs.point.require("scale").setTuple(0, [2, 3, 4]);
    const a = await run(plain, { anchor: "center", size: [4, 2, 6] });
    const b = await run(turned, { anchor: "center", size: [4, 2, 6] });
    expect(box(b, 0)).toEqual([[-2, -1, -3], [2, 1, 3]]);
    expect(box(b, 0)).toEqual(box(a, 0));
    // P, rot and scale ride through untouched.
    expect(positionsOf(b)).toEqual([[5, 7, 9]]);
    expect(b.attrs.point.require("scale").getTuple(0)).toEqual([2, 3, 4]);
    expect(b.attrs.point.require("rot").getTuple(0)).toEqual(turned.attrs.point.require("rot").getTuple(0));
    // Another P gives the same box too: P is not read.
    const moved = await run(cloudAt([[6, 7, 9]]), { anchor: "center", size: [4, 2, 6] });
    expect(box(moved, 0)).toEqual(box(a, 0));
    // CONTROL: the comparison can report a difference -- another size changes the box.
    const wider = await run(plain, { anchor: "center", size: [4, 2, 8] });
    expect(box(wider, 0)).not.toEqual(box(a, 0));
  });

  it("takes a per-point size as a field, and a scalar field as a cube", async () => {
    // Each point's x extent is its own P.x: one cook, two sizes. The size
    // field still reads P; only the anchor no longer adds it.
    const input = cloudAt([[1, 0, 0], [3, 0, 0]]);
    const geo = await run(input, { anchor: "min", size: vec(component(position(), 0), 1, 2) });
    expect(box(geo, 0)).toEqual([[0, 0, 0], [1, 1, 2]]);
    expect(box(geo, 1)).toEqual([[0, 0, 0], [3, 1, 2]]);
    const cube = await run(input, { anchor: "center", size: constant(2) });
    expect(box(cube, 0)).toEqual([[-1, -1, -1], [1, 1, 1]]);
  });

  it("a constant field size writes the plain size's bytes, f32-INEXACT sizes included", async () => {
    // A field resolves into an f32 column, so the plain size is rounded to
    // f32 before the arithmetic too; the two paths must agree byte for byte
    // on sizes f32 cannot hold exactly, which f32-exact sizes cannot show,
    // hence these values.
    const scatter = firstGeo(
      (await runNode(pointScatterInBounds, { count: 16, boundsMin: [-7, -7, -7], boundsMax: [7, 7, 7] })).out,
    );
    const both = async (size: unknown) => {
      const g = await run(scatter, { anchor: "center", size });
      return [Array.from(g.attrs.point.require("boundsMin").data), Array.from(g.attrs.point.require("boundsMax").data)];
    };
    expect(await both(constant([0.1, 0.7, 1.3]))).toEqual(await both([0.1, 0.7, 1.3]));
    // CONTROL: a different size must compare different.
    expect(await both([0.1, 0.7, 1.3])).not.toEqual(await both([0.1, 0.7, 1.4]));
  });

  it("a plain single number is a cube, as a scalar field is", async () => {
    const plain = await run(two(), { anchor: "min", size: 2 });
    expect(box(plain, 0)).toEqual([[0, 0, 0], [2, 2, 2]]);
    expect(box(plain, 0)).toEqual(box(await run(two(), { anchor: "min", size: constant(2) }), 0));
    await expect(run(two(), { anchor: "min", size: -2 })).rejects.toThrow(/setBounds: param "size" is -2 — a box size/);
  });

  it("a size field reads the box the point was HANDED, before either corner is written", async () => {
    const input = cloudAt([[10, 0, 0]]);
    input.attrs.point.require("boundsMax").setTuple(0, [2, 3, 4]);
    const geo = await run(input, { anchor: "min", size: attribute("boundsMax", 3) });
    expect(box(geo, 0)).toEqual([[0, 0, 0], [2, 3, 4]]);
  });

  it("refuses a negative size, plain or per point, naming the param and the point", async () => {
    await expect(run(two(), { anchor: "center", size: [4, -1, 6] })).rejects.toThrow(
      /setBounds: param "size" component 1 \(y\) is -1 — a box size is a length >= 0/,
    );
    // Point 1 is the one whose x is negative.
    await expect(
      run(two(), { anchor: "center", size: vec(component(position(), 0), 1, 1) }),
    ).rejects.toThrow(/setBounds: param "size" is \[-2\.5, 1, 1\] at point 1, with anchor "center"/);
    await expect(run(two(), { anchor: "center", size: [4, Number.NaN, 6] })).rejects.toThrow(
      /setBounds: param "size" \(component 1\) is NaN/,
    );
  });

  it("refuses a param the chosen way does not read, rather than ignoring it", async () => {
    await expect(run(two(), { anchor: "baseCenter", boundsMax: [8, 12, 6] })).rejects.toThrow(
      /setBounds: param "boundsMax" is set \(\[8,12,6\]\), but "anchor" is "baseCenter".*give the box's extent as "size"/,
    );
    await expect(run(two(), { anchor: "min", boundsMin: position() })).rejects.toThrow(
      /param "boundsMin" is set \(a field\), but "anchor" is "min"/,
    );
    await expect(run(two(), { size: [8, 12, 6] })).rejects.toThrow(
      /param "size" is set \(\[8,12,6\]\), but "anchor" is "corners".*"center", "baseCenter" \(min y at P\) or "min"/,
    );
    // The defaults spelled out are not "set": an editor that writes every
    // param explicitly still cooks.
    const geo = await run(two(), { anchor: "min", size: [1, 2, 3], boundsMin: [0, 0, 0], boundsMax: [1, 1, 1] });
    expect(box(geo, 0)).toEqual([[0, 0, 0], [1, 2, 3]]);
  });

  it("refuses an unknown anchor, listing the valid ones", async () => {
    await expect(run(two(), { anchor: "centre" })).rejects.toThrow(
      /setBounds: param "anchor" is "centre"; valid: corners, center, baseCenter, min/,
    );
  });

  it("scatter -> setBounds baseCenter -> splitBox gives every scattered point its own block, cut in place", async () => {
    // The chain the anchor exists for. Without it every scattered point
    // carries the zero box AT its P, and all five blocks would be cut from a
    // box of no volume. With it each piece carries a box local to its
    // scattered point's P, so its world box is P + the local corners.
    const build = (): Graph => {
      const g = new Graph(11);
      const scatter = g.add(
        pointScatterInBounds,
        { count: 5, boundsMin: [-50, 0, -50], boundsMax: [50, 0, 50] },
        "scatter",
      );
      const lot = g.add(setBounds, { anchor: "baseCenter", size: [8, 12, 6] }, "lot");
      const floors = g.add(
        splitBox,
        { axis: "y", labels: ["floor"], sizes: [3], units: ["repeat"] },
        "floors",
      );
      g.connect(scatter, "out", lot, "in");
      g.connect(lot, "out", floors, "in");
      g.output(scatter, "out", "points");
      g.output(floors, "out", "pieces");
      return g;
    };
    const { outputs } = await cook(build());
    const points = positionsOf(firstGeo(outputs.points));
    const pieces = firstGeo(outputs.pieces);
    expect(points.length).toBe(5);
    // Five distinct points, none at the origin: the test can fail.
    expect(new Set(points.map((p) => p.join())).size).toBe(5);
    expect(pieces.pointCount).toBe(5 * 4);
    const piecesP = positionsOf(pieces);
    for (let c = 0; c < 5; c++) {
      for (let k = 0; k < 4; k++) {
        const [lo, hi] = box(pieces, c * 4 + k);
        expect(lo).toEqual([-4, 3 * k, -3]);
        expect(hi).toEqual([4, 3 * (k + 1), 3]);
        // Each piece keeps its scattered point's P, bit for bit.
        const q = piecesP[c * 4 + k];
        for (let a = 0; a < 3; a++) expect(Object.is(q[a], points[c][a])).toBe(true);
        expect(pieces.attrs.point.require("piece").getString(c * 4 + k)).toBe("floor");
      }
    }
    // Through JSON (a parsed anchor string) the chain cooks the same bytes.
    const text = JSON.stringify(serializeGraph(build()));
    expect(text).toContain('"anchor":"baseCenter"');
    const back = await cook(deserializeGraph(JSON.parse(text)));
    expect(snapshotGeometry(firstGeo(back.outputs.pieces))).toEqual(snapshotGeometry(pieces));
  });
});

describe("orientAlongVector", () => {
  const AXES: ReadonlyArray<[string, [number, number, number]]> = [
    ["+x", [1, 0, 0]],
    ["-x", [-1, 0, 0]],
    ["+y", [0, 1, 0]],
    ["-y", [0, -1, 0]],
    ["+z", [0, 0, 1]],
    ["-z", [0, 0, -1]],
  ];

  async function orient(
    positions: number[][],
    params: Record<string, unknown>,
  ): Promise<number[][]> {
    const input = cloudAt(positions);
    const geo = firstGeo(
      (await runNode(orientAlongVector, params, { in: [makeGeometryItem(input)] })).out,
    );
    const rot = geo.attrs.point.require("rot");
    return positions.map((_, i) => rot.getTuple(i));
  }

  function rotate(q: number[], v: [number, number, number]): number[] {
    return rotateVec([0, 0, 0], q[0], q[1], q[2], q[3], v[0], v[1], v[2]);
  }

  function normalized(v: number[]): number[] {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  describe("field-capable up", () => {
    it("gives a plain up and the same up as a constant field identical bytes", async () => {
      // The whole reason the plain path was left untouched: a field
      // resolves through constant(), which stores f32, where the plain
      // path normalizes in f64 over the raw param. For an f32-exact up
      // the two MUST agree, and this is what says so.
      const positions = [
        [1, 0, 0],
        [0, 0, 1],
        [0.3, 0.5, -0.8],
      ];
      const plain = await orient(positions, { direction: position(), up: [0, 1, 0] });
      const field = await orient(positions, { direction: position(), up: constant([0, 1, 0]) });
      expect(field).toEqual(plain);
    });

    it("rolls per point when up is a field", async () => {
      // Same direction everywhere, two different ups: the roll has to
      // differ, which a constant up could never express.
      const positions = [
        [0, 0, 1],
        [0, 0, 1],
      ];
      const input = cloudAt(positions);
      const upAttr = input.attrs.point.add("myUp", "f32", 3, [0, 1, 0]);
      upAttr.setTuple(0, [0, 1, 0]);
      upAttr.setTuple(1, [1, 0, 0]);
      const geo = firstGeo(
        (
          await runNode(
            orientAlongVector,
            { direction: [0, 0, 1], up: attribute("myUp", 3), axis: "+z" },
            { in: [makeGeometryItem(input)] },
          )
        ).out,
      );
      const rot = geo.attrs.point.require("rot");
      const q0 = rot.getTuple(0);
      const q1 = rot.getTuple(1);
      expect(q0).not.toEqual(q1);
      // Both still put +z on the direction; only the roll moved.
      for (const q of [q0, q1]) {
        const f = rotate(q, [0, 0, 1]);
        expect(f[0]).toBeCloseTo(0, 6);
        expect(f[1]).toBeCloseTo(0, 6);
        expect(f[2]).toBeCloseTo(1, 6);
      }
      // With up = +y the local +Y lands on +y; with up = +x it lands on +x.
      expect(rotate(q0, [0, 1, 0])[1]).toBeCloseTo(1, 6);
      expect(rotate(q1, [0, 1, 0])[0]).toBeCloseTo(1, 6);
    });

    it("a zero-length field up falls back exactly as a zero plain up does", async () => {
      const positions = [[0, 0, 1]];
      const plain = await orient(positions, { direction: position(), up: [0, 0, 0] });
      const field = await orient(positions, { direction: position(), up: constant([0, 0, 0]) });
      expect(field).toEqual(plain);
    });

    it("declares itself ineligible for the device when up is a field", () => {
      // Without this gate the apply kernel would bake the DEFAULT up in
      // and quietly produce different bytes on the device path — the one
      // failure this library refuses to have.
      const resident = getNodeType("orientAlongVector").def.resident;
      expect(resident?.eligible).toBeDefined();
      expect(resident?.eligible?.({ direction: [0, 0, 1], up: [0, 1, 0], axis: "+z" })).toBe(true);
      const verdict = resident?.eligible?.({
        direction: [0, 0, 1],
        up: attribute("curveNormal", 3),
        axis: "+z",
      });
      expect(typeof verdict).toBe("string");
      expect(verdict).toContain("up is a field");
    });
  });

  it("maps every axis option onto the direction with a unit quaternion", async () => {
    const dirs: Array<[number, number, number]> = [
      [1, 2, 3],
      [-1, 0.5, 2],
      [0.25, -4, 0.75],
      [5, 0, 0],
    ];
    for (const [axis, axisVec] of AXES) {
      for (const dir of dirs) {
        const [q] = await orient([[0, 0, 0]], { direction: dir, axis });
        expect(Math.hypot(q[0], q[1], q[2], q[3]), `axis ${axis} unit`).toBeCloseTo(1, 5);
        const rotated = rotate(q, axisVec);
        const expected = normalized(dir);
        for (let k = 0; k < 3; k++) {
          expect(rotated[k], `axis ${axis} dir ${dir.join(",")} comp ${k}`).toBeCloseTo(
            expected[k],
            5,
          );
        }
      }
    }
  });

  it("default +z matches the spline-fence tangent yaw convention", async () => {
    // The spline-fence example writes rot = [0, sin(yaw/2), 0, cos(yaw/2)]
    // with yaw = atan2(tangent.x, tangent.z): the asset's +Z faces the
    // tangent. orientAlongVector with defaults must reproduce it.
    const tangents: Array<[number, number, number]> = [
      [1, 0, 1],
      [-0.6, 0, 0.8],
      [0, 0, 1],
      [3, 0, -1],
    ];
    for (const t of tangents) {
      const [q] = await orient([[0, 0, 0]], { direction: t });
      const yaw = Math.atan2(t[0], t[2]);
      const expected = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
      // q and -q encode the same rotation; align signs before comparing.
      const dotQE = q[0] * expected[0] + q[1] * expected[1] + q[2] * expected[2] + q[3] * expected[3];
      const sign = dotQE < 0 ? -1 : 1;
      for (let k = 0; k < 4; k++) {
        expect(sign * q[k], `tangent ${t.join(",")} comp ${k}`).toBeCloseTo(expected[k], 5);
      }
    }
  });

  it("turns the up-following axis toward the up hint", async () => {
    const dir: [number, number, number] = [1, 0.3, -2];
    const up = [0, 1, 0];
    // Expected up-image: the component of up orthogonal to the direction.
    const f = normalized(dir);
    const dotUpF = up[0] * f[0] + up[1] * f[1] + up[2] * f[2];
    const expectedUp = normalized([
      up[0] - dotUpF * f[0],
      up[1] - dotUpF * f[1],
      up[2] - dotUpF * f[2],
    ]);
    for (const axis of ["+x", "-x", "+z", "-z"] as const) {
      const [q] = await orient([[0, 0, 0]], { direction: dir, axis, up });
      const rotY = rotate(q, [0, 1, 0]);
      for (let k = 0; k < 3; k++) {
        expect(rotY[k], `axis ${axis} comp ${k}`).toBeCloseTo(expectedUp[k], 5);
      }
    }
    // For ±y the up-like slot is taken by the direction; +Z follows up.
    for (const axis of ["+y", "-y"] as const) {
      const [q] = await orient([[0, 0, 0]], { direction: dir, axis, up });
      const rotZ = rotate(q, [0, 0, 1]);
      for (let k = 0; k < 3; k++) {
        expect(rotZ[k], `axis ${axis} comp ${k}`).toBeCloseTo(expectedUp[k], 5);
      }
    }
  });

  it("keeps the prior rot for zero-length directions (identity when newly created)", async () => {
    // Per-point directions via an attribute: point 0 zero, point 1 set.
    const input = cloudAt([
      [0, 0, 0],
      [1, 0, 0],
    ]);
    input.attrs.point.add("dir", "f32", 3, [0, 0, 0]);
    input.attrs.point.require("dir").setTuple(1, [1, 0, 0]);
    const custom = [0.5, 0.5, 0.5, 0.5];
    input.attrs.point.require("rot").setTuple(0, custom);
    input.attrs.point.require("rot").setTuple(1, custom);
    const geo = firstGeo(
      (
        await runNode(orientAlongVector, { direction: attribute("dir", 3) }, {
          in: [makeGeometryItem(input)],
        })
      ).out,
    );
    const rot = geo.attrs.point.require("rot");
    expect(rot.getTuple(0)).toEqual(custom); // untouched
    expect(rot.getTuple(1)).not.toEqual(custom); // oriented
    // A geometry without a rot attribute gets identity for zero dirs.
    const bare = new Geometry();
    bare.attrs.point.add("P", "f32", 3, [0, 0, 0]);
    bare.attrs.point.resize(1);
    const out = firstGeo(
      (await runNode(orientAlongVector, { direction: [0, 0, 0] }, { in: [makeGeometryItem(bare)] }))
        .out,
    );
    expect(out.attrs.point.require("rot").getTuple(0)).toEqual([0, 0, 0, 1]);
  });

  it("falls back deterministically when direction is (anti)parallel to up", async () => {
    // Documented fallback chain: up -> [0, 0, 1] -> [1, 0, 0]. For
    // direction +Y with default up, the frame becomes X=(-1,0,0),
    // Y=(0,0,1), Z=(0,1,0); antiparallel flips the direction image.
    const round = (v: number[]): number[] => v.map((x) => Math.round(x * 1e6) / 1e6);
    const [qPar] = await orient([[0, 0, 0]], { direction: [0, 2, 0] });
    expect(round(rotate(qPar, [0, 0, 1]))).toEqual([0, 1, 0]);
    expect(round(rotate(qPar, [0, 1, 0]))).toEqual([0, 0, 1]);
    expect(round(rotate(qPar, [1, 0, 0]))).toEqual([-1, 0, 0]);
    const [qAnti] = await orient([[0, 0, 0]], { direction: [0, -2, 0] });
    expect(round(rotate(qAnti, [0, 0, 1]))).toEqual([0, -1, 0]);
    expect(round(rotate(qAnti, [0, 1, 0]))).toEqual([0, 0, 1]);
    // Up parallel to Z falls through to the [1, 0, 0] fallback.
    const [qz] = await orient([[0, 0, 0]], { direction: [0, 0, 3], up: [0, 0, 1] });
    expect(rotate(qz, [0, 0, 1])[2]).toBeCloseTo(1, 5);
    // Determinism: identical runs produce identical quaternions.
    const [qAgain] = await orient([[0, 0, 0]], { direction: [0, 2, 0] });
    expect(qAgain).toEqual(qPar);
  });

  it("resolves a field direction per point", async () => {
    const input = cloudAt([
      [0, 0, 0],
      [0, 0, 0],
    ]);
    input.attrs.point.add("tangent", "f32", 3, [0, 0, 1]);
    input.attrs.point.require("tangent").setTuple(0, [1, 0, 0]);
    input.attrs.point.require("tangent").setTuple(1, [0, 0, -1]);
    const geo = firstGeo(
      (
        await runNode(orientAlongVector, { direction: attribute("tangent", 3) }, {
          in: [makeGeometryItem(input)],
        })
      ).out,
    );
    const rot = geo.attrs.point.require("rot");
    expect(rotate(rot.getTuple(0), [0, 0, 1])[0]).toBeCloseTo(1, 5);
    expect(rotate(rot.getTuple(1), [0, 0, 1])[2]).toBeCloseTo(-1, 5);
  });

  it("does not mutate its input (purity)", async () => {
    const input = cloudAt([[1, 2, 3]]);
    const before = snapshotGeometry(input);
    await runNode(orientAlongVector, { direction: [1, 1, 0] }, { in: [makeGeometryItem(input)] });
    expect(snapshotGeometry(input)).toEqual(before);
  });

  it("rejects a bad axis or up actionably", async () => {
    const input = cloudAt([[0, 0, 0]]);
    await expect(
      // @ts-expect-error — the types refuse it too; the runtime refusal is the point
      runNode(orientAlongVector, { axis: "z" }, { in: [makeGeometryItem(input)] }),
    ).rejects.toThrow(/"axis" must be one of \+x, -x, \+y, -y, \+z, -z/);
    await expect(
      runNode(orientAlongVector, { up: [0, 1] }, { in: [makeGeometryItem(input)] }),
    ).rejects.toThrow(/"up" must be an array of 3 finite numbers/);
  });

  it("registers complete metadata documenting the conventions and degenerate cases", () => {
    const info = getNodeType("orientAlongVector").info;
    expect(info.description).toMatch(/right-handed/);
    expect(info.description).toMatch(/Matrix4\.compose/);
    expect(info.params.direction.acceptsField).toBe(true);
    expect(info.params.direction.default).toEqual([0, 0, 1]);
    expect(info.params.direction.description).toMatch(/Zero-length/);
    expect(info.params.up.default).toEqual([0, 1, 0]);
    expect(info.params.up.description).toMatch(/\[0, 0, 1\], then \[1, 0, 0\]/);
    expect(info.params.axis.enum).toEqual(["+x", "-x", "+y", "-y", "+z", "-z"]);
    expect(info.params.axis.default).toBe("+z");
  });

  it("serializes and round-trips through graph JSON with a field direction", () => {
    const g = new Graph(5);
    const n = g.add(
      orientAlongVector,
      {
        direction: fieldFromJson({ fn: "attribute", name: "tangent", tupleSize: 3 }),
        up: [0, 0, 1],
        axis: "+x",
      },
      "orient",
    );
    g.output(n, "out", "result");
    const json = serializeGraph(g);
    const rebuilt = deserializeGraph(JSON.parse(JSON.stringify(json)));
    expect(serializeGraph(rebuilt)).toEqual(json);
    const node = json.nodes.find((entry) => entry.id === "orient");
    expect(node?.params.axis).toBe("+x");
    expect(node?.params.up).toEqual([0, 0, 1]);
    expect(node?.params.direction).toEqual({ fn: "attribute", name: "tangent", tupleSize: 3 });
  });
});
