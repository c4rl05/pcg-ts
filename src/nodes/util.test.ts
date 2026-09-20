/**
 * Input-plumbing diagnostics shared by the standard node library.
 *
 * The case that matters here is silent truncation: a pin carries a
 * COLLECTION, and one upstream connection can put many geometries on it
 * (partitionByAttribute emits one per distinct value). A node that
 * processes one geometry used to take item[0] and discard the rest with
 * no error and no warning, which turns a truncated result into something
 * that looks like a successful cook. These tests pin the diagnostic.
 */
import { describe, expect, it } from "vitest";
import { AttributeSet, createPointCloud } from "../data/index.js";
import { makeGeometryItem, makeValueItem, type GeometryItem } from "../graph/index.js";
import { spawnInstances } from "../spawn/index.js";
import {
  filterByDensity,
  partitionByAttribute,
  transformPoints,
  volumeSample,
} from "./index.js";
import { firstGeo, runNode } from "./nodes.testsupport.js";
import {
  ORIENT_AXES,
  ORIENT_AXIS_PZ,
  copyElements,
  orientAxisCode,
  orientQuat,
  requireReportSlot,
  rotateVec,
  type ReportSlot,
} from "./util.js";

function cloudAt(positions: number[][]): ReturnType<typeof createPointCloud> {
  const geo = createPointCloud(positions.length);
  const P = geo.attrs.point.require("P");
  positions.forEach((p, i) => P.setTuple(i, p));
  return geo;
}

/** Four distinct groups, exactly as a per-district graph would produce. */
async function fourGroups(): Promise<GeometryItem[]> {
  const cloud = cloudAt([
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
    [3, 0, 0],
    [4, 0, 0],
    [5, 0, 0],
  ]);
  const district = cloud.attrs.point.add("district", "i32", 1, 0);
  [10, 20, 30, 40, 10, 20].forEach((v, i) => district.set(i, v));
  const out = (
    await runNode(partitionByAttribute, { name: "district" }, { in: [makeGeometryItem(cloud)] })
  ).out as GeometryItem[];
  expect(out).toHaveLength(4);
  return out;
}

describe("requireGeometry: multi-item collections", () => {
  it("refuses to silently truncate 4 partitioned groups", async () => {
    const groups = await fourGroups();
    // The bug this guards: transformPoints used to process groups[0] and
    // drop the other three, reporting a clean cook.
    await expect(runNode(transformPoints, {}, { in: groups })).rejects.toThrow(
      /transformPoints: input pin "in" received 4 geometries/,
    );
  });

  it("names the node, the count, and the fix available today", async () => {
    const groups = await fourGroups();
    const err = await runNode(filterByDensity, {}, { in: groups }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    const msg = (err as Error).message;
    // Receiving node and pin.
    expect(msg).toMatch(/^filterByDensity: input pin "in"/);
    // How many arrived, and how many would have been discarded.
    expect(msg).toContain("received 4 geometries");
    expect(msg).toContain("discarding the other 3");
    // This node processes exactly one.
    expect(msg).toMatch(/processes exactly ONE/);
    // Where a collection comes from, so the author can find the split.
    expect(msg).toContain("partitionByAttribute");
    // The fix that exists today, by exact node type.
    expect(msg).toContain("mergePoints");
    // And the node that DOES process each group separately. This assertion
    // read `/no for-each/i` until forEach shipped: the message's whole job
    // is to leave an agent knowing its next move, so the day the answer
    // changed the message had to change with it.
    expect(msg).toMatch(/inside a forEach/);
    expect(msg).toContain("forEachNode");
    // The escape hatch must name only things a package consumer can
    // actually reach: `filterByTag` is exported, and the plain filter
    // needs no import at all. `geometryItems` is internal to the node
    // library, so naming it would send an agent into an import error.
    expect(msg).toContain('item.kind === "geometry"');
    expect(msg).toContain("filterByTag");
  });

  it("still accepts exactly one geometry", async () => {
    const cloud = cloudAt([
      [0, 0, 0],
      [1, 2, 3],
    ]);
    const geo = firstGeo(
      (await runNode(transformPoints, { translate: [1, 0, 0] }, { in: [makeGeometryItem(cloud)] }))
        .out,
    );
    expect(geo.pointCount).toBe(2);
  });

  it("ignores non-geometry items sharing the pin", async () => {
    const cloud = cloudAt([[0, 0, 0]]);
    const geo = firstGeo(
      (
        await runNode(
          transformPoints,
          {},
          { in: [makeValueItem(7), makeGeometryItem(cloud), makeValueItem("tag")] },
        )
      ).out,
    );
    expect(geo.pointCount).toBe(1);
  });

  it("keeps the empty-pin message unchanged", async () => {
    await expect(runNode(transformPoints, {}, { in: [] })).rejects.toThrow(
      'transformPoints: input pin "in" has no geometry connected',
    );
  });
});

describe("optional geometry inputs", () => {
  it("volumeSample refuses a multi-item bounds input", async () => {
    const groups = await fourGroups();
    await expect(runNode(volumeSample, { cellSize: 1 }, { in: groups })).rejects.toThrow(
      /volumeSample: input pin "in" received 4 geometries/,
    );
  });

  it("volumeSample still falls back to params when nothing is connected", async () => {
    const out = await runNode(volumeSample, {
      cellSize: 1,
      boundsMin: [0, 0, 0],
      boundsMax: [2, 0, 0],
    });
    expect(firstGeo(out.out).pointCount).toBeGreaterThan(0);
  });
});

describe("spawnInstances", () => {
  it("refuses to spawn from only the first of several groups", async () => {
    const groups = await fourGroups();
    await expect(runNode(spawnInstances, {}, { in: groups })).rejects.toThrow(
      /spawnInstances: input pin "in" received 4 geometries/,
    );
  });

  it("keeps its empty-pin message unchanged", async () => {
    await expect(runNode(spawnInstances, {}, { in: [] })).rejects.toThrow(
      'spawnInstances: input pin "in" has no geometry connected',
    );
  });
});

/**
 * The refusal has to name the geometry the collision is actually ON.
 *
 * Every caller until `pathSegments.segmentIndexAttr` and `pathResample`'s
 * second run checked a set that arrived on a pin, so "the input's" was
 * true and "remove it from the input" was a real fix. A node that checks a
 * set IT BUILT gets neither: the input's `P` is not the `P` at risk, and
 * removing it clears nothing. `ReportSlot.on` is what separates them, and
 * these two cases pin both sides of it — the input wording because half a
 * dozen suites elsewhere quote it verbatim, the output wording because
 * that is the whole point of the flag.
 */
describe("requireReportSlot: which geometry the collision is on", () => {
  /** The slot every case below varies: i32 landing on the f32x3 `P`. */
  function slotOnP(on?: "input" | "output"): ReportSlot {
    return {
      attrs: createPointCloud(4).attrs.point,
      nodeType: "pathSegments",
      param: "segmentIndexAttr",
      name: "P",
      type: "i32",
      tupleSize: 1,
      domain: "point",
      suggestion: "segmentIndex",
      ...(on === undefined ? {} : { on }),
    };
  }

  it("says the INPUT by default, in the wording other suites pin", () => {
    let msg = "";
    try {
      requireReportSlot(slotOnP());
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain(
      'pathSegments: segmentIndexAttr "P" already exists on the input\'s point domain as f32x3',
    );
    expect(msg).toContain(
      'or remove "P" from the input first with removeAttribute if it is genuinely dead',
    );
    // Passing the default explicitly changes nothing.
    expect(() => requireReportSlot(slotOnP("input"))).toThrow(msg);
  });

  it("says the OUTPUT, and withdraws the fix that is not one, when the node built the set", () => {
    let msg = "";
    try {
      requireReportSlot(slotOnP("output"));
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain(
      'pathSegments: segmentIndexAttr "P" already exists on the output\'s point domain — the ' +
        "geometry pathSegments builds for itself, not the input's — as f32x3",
    );
    // The defect in one assertion: the old message sent an author to
    // removeAttribute a column that is not on the input at all.
    expect(msg).not.toContain("the input's point domain");
    expect(msg).not.toContain('remove "P" from the input first');
    expect(msg).toContain("removeAttribute upstream cannot help here");
    // The half that must NOT vary: the hazard, and the rename that fixes it.
    expect(msg).toContain('writing it would DELETE the "P" column');
    expect(msg).toContain('a name of its own (e.g. "segmentIndex"');
    expect(msg).toContain("A name that already holds i32 is fine");
  });

  it("refuses nothing on either side when the shape already matches", () => {
    const attrs = createPointCloud(4).attrs.point;
    attrs.add("segmentIndex", "i32", 1, 0);
    const same = { ...slotOnP(), attrs, name: "segmentIndex" } as const;
    expect(() => requireReportSlot(same)).not.toThrow();
    expect(() => requireReportSlot({ ...same, on: "output" })).not.toThrow();
  });
});

describe("copyElements", () => {
  // It creates each column UNINITIALIZED, because it writes every one of
  // them whole. These pin that the whole really is written — with
  // non-zero, non-uniform defaults, so a slot left at the zero of fresh
  // storage shows — and that a column the destination already held, which
  // nothing here writes, still gets its default over a new range.
  function source(): AttributeSet {
    const set = new AttributeSet();
    const tint = set.add("tint", "f32", 4, [0.25, 0.5, 0.75, 1]);
    const label = set.add("label", "string", 1, "none");
    set.resize(3);
    tint.setTuple(0, [1, 0, 0, 1]);
    tint.setTuple(2, [0, 0, 1, 1]);
    label.setString(1, "b");
    label.setString(2, "c");
    return set;
  }

  it("gathers into an empty set at exactly the count, every slot written", () => {
    const to = new AttributeSet();
    copyElements(source(), to, [2, 0, 1, 2, 1], 5);
    expect(to.count).toBe(5);
    expect(to.capacity).toBe(5);
    const tint = to.require("tint");
    expect([0, 1, 2, 3, 4].map((i) => tint.getTuple(i))).toEqual([
      [0, 0, 1, 1],
      [1, 0, 0, 1],
      [0.25, 0.5, 0.75, 1],
      [0, 0, 1, 1],
      [0.25, 0.5, 0.75, 1],
    ]);
    const label = to.require("label");
    expect([0, 1, 2, 3, 4].map((i) => label.getString(i))).toEqual(["c", "none", "b", "c", "b"]);
    expect(label.stringTable).toEqual(["none", "c", "b"]);
  });

  it("copies the identity whole", () => {
    const to = new AttributeSet();
    copyElements(source(), to, undefined, 3);
    expect(to.capacity).toBe(3);
    expect(Array.from(to.require("tint").data)).toEqual([
      1, 0, 0, 1, 0.25, 0.5, 0.75, 1, 0, 0, 1, 1,
    ]);
  });

  it("refuses a source index past the last element, though the storage has room", () => {
    // The bound is the source's COUNT. Before it was the source's
    // capacity, which made the answer depend on how the source had been
    // built: a cloud grown by doubling had dead slots to read, an
    // exact-sized clone of it did not.
    const src = new AttributeSet();
    const a = src.add("a", "f32", 1, 9);
    src.resize(3);
    expect(src.capacity).toBe(8); // slots 3..7 are allocated and dead
    a.data.set([1, 2, 3]);
    a.data[3] = 42; // something plausible in one of them
    expect(() => copyElements(src, new AttributeSet(), [0, 3], 2)).toThrow(
      /copyFrom range out of bounds/,
    );
    // The identity copy takes the same bound.
    expect(() => copyElements(src, new AttributeSet(), undefined, 4)).toThrow(
      /copyFrom range out of bounds/,
    );
    // CONTROL: inside the count, the same gather copies what is there.
    const to = new AttributeSet();
    copyElements(src, to, [0, 2], 2);
    expect(Array.from(to.require("a").data)).toEqual([1, 3]);
  });

  it("takes the source count from the caller when the columns come as an array", () => {
    const src = new AttributeSet();
    const a = src.add("a", "f32", 1, 9);
    const b = src.add("b", "f32", 1, 0);
    src.resize(3);
    a.data.set([1, 2, 3]);
    b.data.set([4, 5, 6]);
    // The `carryPrimitiveAttributes` shape: a filtered subset of one set,
    // handed over with the count that set carries.
    const to = new AttributeSet();
    copyElements([a], to, [2, 1], 2, src.count);
    expect(to.names()).toEqual(["a"]);
    expect(Array.from(to.require("a").data)).toEqual([3, 2]);
    expect(() => copyElements([a], new AttributeSet(), [2, 3], 2, src.count)).toThrow(
      /copyFrom range out of bounds/,
    );
  });

  it("gives a column the destination already held its default over the new range", () => {
    const to = new AttributeSet();
    const keep = to.add("keep", "f32", 3, [1, 2, 3]);
    to.resize(2);
    keep.setTuple(0, [7, 7, 7]);
    keep.setTuple(1, [8, 8, 8]);
    copyElements(source(), to, [0, 1, 2, 0], 4);
    expect(to.count).toBe(4);
    expect([0, 1, 2, 3].map((i) => keep.getTuple(i))).toEqual([
      [7, 7, 7],
      [8, 8, 8],
      [1, 2, 3],
      [1, 2, 3],
    ]);
    // CONTROL: the gathered column over the same range holds gathered
    // values, not its default, so the two branches are told apart.
    expect(to.require("tint").getTuple(2)).toEqual([0, 0, 1, 1]);
    expect(to.require("tint").getTuple(3)).toEqual([1, 0, 0, 1]);
  });
});

describe("orientQuat: one arm per axis, chosen by code and not by name", () => {
  /** A forward with no zero component, so no arm can pass by symmetry. */
  const FL = Math.hypot(1, 2, 3);
  const F: readonly [number, number, number] = [1 / FL, 2 / FL, 3 / FL];
  /** An up hint not parallel to F, and not a world axis either. */
  const UL = Math.hypot(0, 1, 1);
  const UP: readonly [number, number, number] = [0, 1 / UL, 1 / UL];

  /** Where a LOCAL direction lands under the orientation for `axis`. */
  function turned(axis: unknown, local: readonly [number, number, number]): number[] {
    const q = orientQuat([0, 0, 0, 1], F[0], F[1], F[2], UP[0], UP[1], UP[2], orientAxisCode(axis));
    return rotateVec([0, 0, 0], q[0], q[1], q[2], q[3], local[0], local[1], local[2]);
  }

  /**
   * The LOCAL direction each axis name promises to put ON the forward —
   * the whole content of the switch, one entry per arm. They are pairwise
   * distinct as directions, so exchanging any two arms makes at least two
   * of the cases below fail; the CONTROL after them is what proves the
   * assertion can fail at all.
   */
  const LOCAL: Record<string, [number, number, number]> = {
    "+x": [1, 0, 0],
    "-x": [-1, 0, 0],
    "+y": [0, 1, 0],
    "-y": [0, -1, 0],
    "+z": [0, 0, 1],
    "-z": [0, 0, -1],
  };

  it.each([...ORIENT_AXES])("puts local %s on the forward direction", (axis) => {
    const got = turned(axis, LOCAL[axis]);
    for (let k = 0; k < 3; k++) expect(got[k]).toBeCloseTo(F[k], 12);
  });

  it("rolls the frame the way each axis family documents", () => {
    // For ±x and ±z the local +Y turns as close to `up` as the direction
    // allows; for ±y the local +Z takes that role. "As close as allowed"
    // is the component of `up` perpendicular to the forward, normalized.
    const d = UP[0] * F[0] + UP[1] * F[1] + UP[2] * F[2];
    const perp = [UP[0] - F[0] * d, UP[1] - F[1] * d, UP[2] - F[2] * d];
    const pl = Math.hypot(perp[0], perp[1], perp[2]);
    for (const axis of ORIENT_AXES) {
      const upLike: [number, number, number] =
        axis === "+y" || axis === "-y" ? [0, 0, 1] : [0, 1, 0];
      const got = turned(axis, upLike);
      for (let k = 0; k < 3; k++) expect(got[k]).toBeCloseTo(perp[k] / pl, 12);
    }
  });

  it("CONTROL: reading an arm as another axis' moves the answer off the forward", () => {
    for (const a of ORIENT_AXES) {
      for (const b of ORIENT_AXES) {
        if (a === b) continue;
        const got = turned(a, LOCAL[b]);
        const apart = Math.hypot(got[0] - F[0], got[1] - F[1], got[2] - F[2]);
        expect(apart).toBeGreaterThan(1e-6);
      }
    }
  });

  it("codes ORIENT_AXES by its own index, and nothing else at all", () => {
    ORIENT_AXES.forEach((axis, i) => expect(orientAxisCode(axis)).toBe(i));
    expect(ORIENT_AXIS_PZ).toBe((ORIENT_AXES as readonly string[]).indexOf("+z"));
    for (const bad of ["Z", "+Z", "", "0", 0, 4, undefined, null, {}]) {
      expect(orientAxisCode(bad)).toBe(-1);
    }
  });

  it("takes the '-z' arm for an unrecognised axis, as the string switch did", () => {
    // Not a policy anybody relies on — every caller validates the name
    // first — but the answer the old `default:` gave for exactly these
    // inputs, kept so the hoist changes no output at all.
    const minusZ = turned("-z", [1, 0, 0]);
    for (const bad of ["Z", "", undefined, null]) expect(turned(bad, [1, 0, 0])).toEqual(minusZ);
  });
});
