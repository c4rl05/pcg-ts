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

/**
 * THE GATHER LOOPS THEMSELVES — one body per tuple width, run with the
 * source-index test lifted out of them into a single pass over the index
 * map.
 *
 * Two things can now go wrong that could not before, and both are silent:
 * a width could be wired to the wrong body (three components copied by a
 * two-component loop leaves the third at the zero of fresh storage, and
 * the point count is still right), and the lifted test could stop
 * agreeing with the per-element one it replaced — by missing an offending
 * index, by finding one that is not there, or by naming a different
 * column. So every case below is checked against a REFERENCE gather
 * written the long way here, at the width the column actually has, and
 * every check is followed by a control showing that same comparison
 * reporting a difference when the width is wrong. A test that cannot fail
 * is not evidence.
 */
describe("copyElements: one gather loop per tuple width", () => {
  /** What the gather has to produce, written out per component. */
  function reference(
    data: ArrayLike<number>,
    indices: readonly number[],
    ts: number,
  ): number[] {
    const out: number[] = [];
    for (const s of indices) for (let k = 0; k < ts; k++) out.push(data[s * ts + k]);
    return out;
  }

  /** A source of `n` elements at width `ts`, values `element*100 + component`. */
  function ramp(n: number, ts: number): AttributeSet {
    const set = new AttributeSet();
    const a = set.add("a", "f32", ts, new Array(ts).fill(-1));
    set.resize(n);
    for (let i = 0; i < n; i++) for (let k = 0; k < ts; k++) a.data[i * ts + k] = i * 100 + k;
    return set;
  }

  function gathered(src: AttributeSet, indices: readonly number[]): number[] {
    const to = new AttributeSet();
    copyElements(src, to, indices, indices.length);
    return Array.from(to.require("a").data);
  }

  // Every width the library ships, plus one past the last specialized
  // body so the general loop is exercised too.
  const WIDTHS = [1, 2, 3, 4, 5, 9];
  // The index-map shapes a caller can hand over. `identity` is spelled
  // out as a map rather than left `undefined`, because the two take
  // DIFFERENT paths: `undefined` is one bulk copy per column, and
  // `[0, 1, 2 ...]` is the gather being asked for a permutation that
  // happens to be the identity.
  const MAPS: Array<[string, (n: number) => number[]]> = [
    ["identity map", (n) => Array.from({ length: n }, (_, i) => i)],
    ["contiguous run", (n) => Array.from({ length: n - 2 }, (_, i) => i + 2)],
    ["reversed", (n) => Array.from({ length: n }, (_, i) => n - 1 - i)],
    ["repeated indices", (n) => [1, 1, 1, n - 1, 1, n - 1]],
    ["single element", () => [3]],
    ["empty selection", () => []],
  ];

  for (const ts of WIDTHS) {
    for (const [shape, make] of MAPS) {
      it(`moves every component at tupleSize ${ts}: ${shape}`, () => {
        const n = 12;
        const src = ramp(n, ts);
        const indices = make(n);
        const data = src.require("a").data;
        expect(gathered(src, indices)).toEqual(reference(data, indices, ts));
        // CONTROL: the same comparison AT THE WRONG WIDTH. It has to
        // disagree, or the check above would pass for a body that copied
        // the wrong number of components. Widths of 1 and an empty
        // selection have no wrong width to be read at — one component is
        // one component, and nothing is moved — so they are the two the
        // control cannot speak about.
        if (ts > 1 && indices.length > 0) {
          expect(gathered(src, indices)).not.toEqual(reference(data, indices, ts - 1));
        }
      });
    }
  }

  it("a string column takes the same shapes, re-interned into the destination's own table", () => {
    const src = new AttributeSet();
    const label = src.add("label", "string", 1, "none");
    src.resize(4);
    label.setString(0, "a");
    label.setString(1, "b");
    label.setString(2, "c");
    label.setString(3, "d");
    const to = new AttributeSet();
    copyElements(src, to, [3, 1, 3, 0], 4);
    const out = to.require("label");
    expect([0, 1, 2, 3].map((i) => out.getString(i))).toEqual(["d", "b", "d", "a"]);
    // The destination's table holds its default first and then only the
    // values that landed, in the order they landed — not a copy of the
    // source's table.
    expect(out.stringTable).toEqual(["none", "d", "b", "a"]);
    // CONTROL: the source's table is the other order, so a test that
    // passed by copying the table wholesale would show here.
    expect(label.stringTable).toEqual(["none", "a", "b", "c", "d"]);
  });

  it("creates the columns the destination lacks and refuses a name it already has", () => {
    const src = ramp(4, 3);
    const to = new AttributeSet();
    const mine = to.add("mine", "f32", 1, 5);
    to.resize(2);
    mine.data.set([1, 2]);
    copyElements(src, to, [2, 0, 1], 3);
    expect(to.names()).toEqual(["mine", "a"]);
    // The LOGICAL range: a destination that already held a column grows
    // through `resize`, whose capacity doubles, so there is dead storage
    // past `count * tupleSize` and it is nobody's to read.
    expect(Array.from(to.require("a").data.subarray(0, 9))).toEqual([
      200, 201, 202, 0, 1, 2, 100, 101, 102,
    ]);
    // The column this did not create keeps `resize`'s default over the
    // range it grew into, and its own values below it.
    expect(Array.from(mine.data.subarray(0, 3))).toEqual([1, 2, 5]);
    // A destination that already holds the SOURCE's name is refused
    // rather than overwritten.
    const clash = new AttributeSet();
    clash.add("a", "f32", 3);
    clash.resize(3);
    expect(() => copyElements(src, clash, [0, 1, 2], 3)).toThrow(/attribute "a" already exists/);
  });

  it("raises the copyFrom message for an out-of-range index wherever it sits", () => {
    const src = ramp(4, 3);
    // FIRST slot, LAST slot and the middle: the lifted scan walks the
    // whole map, so none of the three may slip past it.
    for (const indices of [[9, 0, 1], [0, 1, 9], [0, 9, 1], [-1, 0, 1], [0, 1, -1]]) {
      expect(() => copyElements(src, new AttributeSet(), indices, indices.length)).toThrow(
        'attribute "a": copyFrom range out of bounds',
      );
    }
    // CONTROL: the largest index that IS in range copies, so the test
    // above is not passing because every gather throws.
    const ok = new AttributeSet();
    copyElements(src, ok, [3, 0, 3], 3);
    expect(Array.from(ok.require("a").data)).toEqual([300, 301, 302, 0, 1, 2, 300, 301, 302]);
  });

  it("names the FIRST column, which is the one a per-element test reached first", () => {
    const src = new AttributeSet();
    src.add("first", "f32", 3);
    src.add("second", "f32", 1);
    src.resize(2);
    expect(() => copyElements(src, new AttributeSet(), [0, 5], 2)).toThrow(
      'attribute "first": copyFrom range out of bounds',
    );
    // CONTROL: with the columns declared the other way round the message
    // follows, so the name really is read off the column order and is not
    // a constant.
    const other = new AttributeSet();
    other.add("second", "f32", 1);
    other.add("first", "f32", 3);
    other.resize(2);
    expect(() => copyElements(other, new AttributeSet(), [0, 5], 2)).toThrow(
      'attribute "second": copyFrom range out of bounds',
    );
  });

  it("writes nothing into the destination when an index is out of range", () => {
    // THE ONE BEHAVIOUR THAT MOVED when the source-index test came out of
    // the copy loops, pinned so it cannot move back unnoticed. The
    // per-element test threw partway through the FIRST column, leaving
    // slots 0..bad holding gathered values and a string column's table
    // already carrying them. Deciding ahead of the columns means the
    // destination is created and sized but untouched, which every call
    // site now relies on by building a fresh destination and dropping it.
    const src = new AttributeSet();
    const a = src.add("a", "f32", 1, -7);
    const s = src.add("s", "string", 1, "none");
    src.resize(3);
    a.data.set([10, 20, 30]);
    s.setString(0, "zero");
    s.setString(1, "one");
    s.setString(2, "two");
    const to = new AttributeSet();
    // Slot 0 is readable and slot 1 is not, so a per-element test would
    // have copied element 0 of "a" before refusing.
    expect(() => copyElements(src, to, [2, 99], 2)).toThrow(/copyFrom range out of bounds/);
    expect(Array.from(to.require("a").data)).toEqual([0, 0]);
    // And the string table holds only the default it is born with — no
    // value was interned on the way to the throw.
    expect(to.require("s").stringTable).toEqual(["none"]);
    // CONTROL: the same gather with both indices in range DOES write
    // slot 0 and DOES intern, so the two assertions above are reading a
    // destination that would otherwise have been filled.
    const ok = new AttributeSet();
    copyElements(src, ok, [2, 0], 2);
    expect(Array.from(ok.require("a").data)).toEqual([30, 10]);
    expect(ok.require("s").stringTable).toEqual(["none", "two", "zero"]);
  });

  it("raises nothing for a source with no columns, whatever the indices say", () => {
    // Nothing is copied, so a per-element test never ran and the lifted
    // one must not run either. `carryPrimitiveAttributes` returns early
    // on this, but `gatherPrimitives` reaches it with an empty vertex or
    // detail domain on every plain point cloud.
    const empty = new AttributeSet();
    empty.resize(2);
    const to = new AttributeSet();
    expect(() => copyElements(empty, to, [7, 8, 9], 3)).not.toThrow();
    expect(to.count).toBe(3);
  });

  it("reads a fractional index exactly as the per-element test did", () => {
    // An `ArrayLike<number>` can hold one, and a bound of `[0, srcCount)`
    // accepts it. What it reads is the typed array's own answer for a
    // non-integral index — `undefined`, which stores as NaN in an f32
    // column — and that is the behaviour every caller has had. Pinned
    // because lifting the test out of the loop is exactly the change that
    // could have started rejecting it.
    const src = ramp(4, 1);
    const to = new AttributeSet();
    copyElements(src, to, [1.5, 2], 2);
    expect(Array.from(to.require("a").data)).toEqual([NaN, 200]);
    // CONTROL: the same slot with a whole index reads a value, so the NaN
    // above is the fractional index and not an unwritten slot.
    const whole = new AttributeSet();
    copyElements(src, whole, [1, 2], 2);
    expect(Array.from(whole.require("a").data)).toEqual([100, 200]);
  });
});

describe("orientQuat: one arm per axis, chosen by code and not by name", () => {
  /** A forward with no zero component, so no arm can pass by symmetry. */
  const FL = Math.hypot(1, 2, 3);
  const F: readonly [number, number, number] = [1 / FL, 2 / FL, 3 / FL];
  /** An up hint not parallel to F, and not a world axis either. */
  const UL = Math.hypot(0, 1, 1);
  const UP: readonly [number, number, number] = [0, 1 / UL, 1 / UL];

  /**
   * Where a LOCAL direction lands under the orientation for `axis`. The
   * cast is the point of the signature elsewhere: `orientAxisCode` takes
   * a `string`, and only a test reaches past that to check what the
   * runtime still does with what untyped JS could hand it.
   */
  function turned(axis: unknown, local: readonly [number, number, number]): number[] {
    const code = orientAxisCode(axis as string);
    const q = orientQuat([0, 0, 0, 1], F[0], F[1], F[2], UP[0], UP[1], UP[2], code);
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
    // The constant is checked by READING the list back, not by asking the
    // list for the same index again: if "+z" ever left ORIENT_AXES, both
    // sides of `toBe(indexOf("+z"))` would be -1 and agree.
    expect(ORIENT_AXES[ORIENT_AXIS_PZ]).toBe("+z");
    for (const bad of ["Z", "+Z", "", "0", 0, 4, undefined, null, {}]) {
      expect(orientAxisCode(bad as string)).toBe(-1);
    }
  });

  it("refuses, AT COMPILE TIME, the three numbers that are not axis codes", () => {
    // A bare number is no longer an axis. Each `@ts-expect-error` below
    // FAILS THE BUILD if the call starts compiling — which is the whole
    // guard the old `axis: string` gave by accident and `OrientAxisCode`
    // now gives on purpose. They are exercised by `npm run check`
    // (tsconfig includes `src`), not by this assertion.
    const q: number[] = [0, 0, 0, 1];
    // 1. `lengthComp`, the 0|1|2 naming a scale component, computed a few
    //    lines from the call in both paths.ts and runs.ts.
    const lengthComp: number = 1;
    // @ts-expect-error a plain number is not an OrientAxisCode
    orientQuat(q, 1, 0, 0, 0, 1, 0, lengthComp);
    // 2. A literal out of range.
    // @ts-expect-error 99 is not an OrientAxisCode either
    orientQuat(q, 1, 0, 0, 0, 1, 0, 99);
    // 3. A code fed back through the resolver, which would answer -1 and
    //    silently mean "-z".
    // @ts-expect-error orientAxisCode takes a name, never a code
    orientQuat(q, 1, 0, 0, 0, 1, 0, orientAxisCode(ORIENT_AXIS_PZ));
    // The one spelling that does compile, so the block proves a guard
    // rather than a broken signature.
    expect(orientQuat(q, 1, 0, 0, 0, 1, 0, ORIENT_AXIS_PZ)).toHaveLength(4);
  });

  it("takes the '-z' arm for an unrecognised axis, as the string switch did", () => {
    // Not a policy anybody relies on — every caller validates the name
    // first — but the answer the old `default:` gave for exactly these
    // inputs, kept so the hoist changes no output at all.
    const minusZ = turned("-z", [1, 0, 0]);
    for (const bad of ["Z", "", undefined, null]) expect(turned(bad, [1, 0, 0])).toEqual(minusZ);
  });
});
