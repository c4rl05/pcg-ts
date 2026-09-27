/**
 * `pathClip`: cut every polyline where a field changes sign and keep the
 * pieces where it is >= 0.
 *
 * Expectations are hand-computed on paths small enough to read — a row of
 * points along x one unit apart, a 4x4 square — and on fields LINEAR along
 * each crossing segment wherever the claim is exactness, because that is
 * the case the root search promises to settle exactly.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud, setPolylineTopology } from "../data/index.js";
import {
  abs,
  add,
  attribute,
  component,
  constant,
  evaluateField,
  fraction,
  index,
  length,
  position,
  randomField,
  sub,
} from "../fields/index.js";
import { makeGeometryItem } from "../graph/index.js";
import { pathClip } from "./paths.js";
import { firstGeo, runNode, snapshotGeometry } from "./nodes.testsupport.js";

/** A geometry holding the given polylines over one shared point list. */
function paths(
  points: readonly (readonly [number, number, number])[],
  polylines: readonly { readonly pts: readonly number[]; readonly closed?: boolean }[],
): Geometry {
  const geo = createPointCloud(points.length);
  const P = geo.attrs.point.require("P").writable();
  points.forEach((p, i) => P.set(p, i * 3));
  const idx: number[] = [];
  const start: number[] = [];
  const count: number[] = [];
  for (const line of polylines) {
    start.push(idx.length);
    idx.push(...line.pts);
    if (line.closed === true) idx.push(line.pts[0]);
    count.push(line.pts.length + (line.closed === true ? 1 : 0));
  }
  setPolylineTopology(geo, idx, start, count);
  return geo;
}

/** Points 0..n-1 at x = 0..n-1, one open polyline through them. */
function row(n: number): Geometry {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([i, 0, 0]);
  return paths(pts, [{ pts: pts.map((_, i) => i) }]);
}

const X = component(position(), 0);
const Y = component(position(), 1);

async function clip(geo: Geometry, params: Record<string, unknown>): Promise<Geometry> {
  return firstGeo((await runNode(pathClip, params, { in: [makeGeometryItem(geo)] })).out);
}

async function rejection(run: Promise<unknown>): Promise<string> {
  const err: unknown = await run.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(err instanceof Error)) throw new Error("expected the node to throw an Error");
  return err.message;
}

/** Each output polyline as its list of [x, y, z] points, plus whether it is closed. */
function runsOf(geo: Geometry): { pts: number[][]; closed: boolean }[] {
  const P = geo.attrs.point.require("P").data;
  const out: { pts: number[][]; closed: boolean }[] = [];
  for (let p = 0; p < geo.primitiveCount; p++) {
    const s = geo.primVertexStart[p];
    const n = geo.primVertexCount[p];
    const first = geo.vertexToPoint[s];
    const closed = geo.vertexToPoint[s + n - 1] === first && n > 1;
    const pts: number[][] = [];
    for (let v = 0; v < (closed ? n - 1 : n); v++) {
      const i = geo.vertexToPoint[s + v];
      pts.push([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
    }
    out.push({ pts, closed });
  }
  return out;
}

function pointCol(geo: Geometry, name: string): number[] {
  const a = geo.attrs.point.require(name);
  return Array.from(a.data.slice(0, geo.pointCount * a.tupleSize));
}

function primCol(geo: Geometry, name: string): number[] {
  const a = geo.attrs.primitive.require(name);
  return Array.from(a.data.slice(0, geo.primitiveCount * a.tupleSize));
}

describe("pathClip: the cut", () => {
  it("cuts a path where a linear field crosses zero, exactly", async () => {
    const out = await clip(row(5), { field: sub(constant(2.5), X) });
    expect(runsOf(out)).toEqual([
      {
        pts: [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
          [2.5, 0, 0],
        ],
        closed: false,
      },
    ]);
  });

  it("keeps exactly 0 and does not emit a cut on top of its kept vertex", async () => {
    // |x - 2| <= 1 keeps x in [1, 3]; vertices 1 and 3 sit at exactly 0.
    const out = await clip(row(5), { field: sub(constant(1), abs(sub(X, constant(2)))) });
    expect(runsOf(out).map((r) => r.pts.map((p) => p[0]))).toEqual([[1, 2, 3]]);
  });

  it("emits several runs in walk order, each an open polyline", async () => {
    // Keep |x - 2| >= 0.5: two pieces, [0, 1.5] and [2.5, 4].
    const out = await clip(row(5), {
      field: sub(abs(sub(X, constant(2))), constant(0.5)),
      runIndexAttr: "run",
      lengthAttr: "len",
      arcAttr: "s",
    });
    expect(runsOf(out)).toEqual([
      {
        pts: [
          [0, 0, 0],
          [1, 0, 0],
          [1.5, 0, 0],
        ],
        closed: false,
      },
      {
        pts: [
          [2.5, 0, 0],
          [3, 0, 0],
          [4, 0, 0],
        ],
        closed: false,
      },
    ]);
    expect(primCol(out, "run")).toEqual([0, 1]);
    expect(primCol(out, "len")).toEqual([1.5, 1.5]);
    expect(pointCol(out, "s")).toEqual([0, 1, 1.5, 0, 0.5, 1.5]);
  });

  it("keeps a path whole when every vertex is kept and drops it when none is", async () => {
    const whole = await clip(row(3), { field: constant(1) });
    expect(runsOf(whole)).toEqual([{ pts: [[0, 0, 0], [1, 0, 0], [2, 0, 0]], closed: false }]);
    const none = await clip(row(3), { field: constant(-1) });
    expect(none.primitiveCount).toBe(0);
    expect(none.pointCount).toBe(0);
  });

  it("converges on a field that is NOT linear along the segment", async () => {
    // A ball of radius 1.7 around the origin: the root is irrational in t.
    const out = await clip(row(4), { field: sub(constant(1.7), length(position())) });
    const [run] = runsOf(out);
    expect(run.pts.length).toBe(3);
    expect(run.pts[2][0]).toBeCloseTo(1.7, 6);
  });

  it("reads a field over an attribute at the probe, lerped along the segment", async () => {
    const geo = row(5);
    const u = geo.attrs.point.add("u", "f32", 1, 0).writable();
    for (let i = 0; i < 5; i++) u[i] = 10 * i;
    const out = await clip(geo, { field: sub(constant(25), attribute("u")) });
    const [run] = runsOf(out);
    expect(run.pts.at(-1)).toEqual([2.5, 0, 0]);
    expect(pointCol(out, "u")).toEqual([0, 10, 20, 25]);
  });

  it("puts every emitted point on the kept side", async () => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) pts.push([Math.cos(i * 0.37) * 3, Math.sin(i * 0.53) * 3, i * 0.1]);
    const geo = paths(pts, [{ pts: pts.map((_, i) => i) }]);
    const field = sub(constant(2), length(position()));
    const out = await clip(geo, { field });
    expect(out.primitiveCount).toBeGreaterThan(1);
    const P = out.attrs.point.require("P").data;
    for (let i = 0; i < out.pointCount; i++) {
      const r = Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      expect(Math.fround(2 - Math.fround(r))).toBeGreaterThanOrEqual(-1e-6);
    }
  });
});

describe("pathClip: identity-keyed fields", () => {
  it("keeps every emitted point on the kept side for a field that reads the seed", async () => {
    // randomField keys on position AND the seed column, and a cut point is
    // re-seeded — so the probes must carry the cut's seed, or the search
    // settles on a place whose value changes once the cut takes its seed.
    const pts: [number, number, number][] = [];
    const lines: { pts: number[] }[] = [];
    for (let l = 0; l < 100; l++) {
      lines.push({ pts: [pts.length, pts.length + 1] });
      pts.push([0, l, 0], [10, l, 0]);
    }
    const geo = paths(pts, lines);
    const field = sub(add(randomField(), constant(5)), X);
    const out = await clip(geo, { field });
    expect(out.pointCount).toBe(200);
    // runNode cooks with seed 1; resolve the same field on the output.
    const vals = evaluateField(field, { geo: out, domain: "point", seed: 1 }).data;
    for (let i = 0; i < out.pointCount; i++) expect(vals[i]).toBeGreaterThanOrEqual(0);
  });
});

describe("pathClip: closed paths", () => {
  const square = (): Geometry =>
    paths(
      [
        [0, 0, 0],
        [4, 0, 0],
        [4, 4, 0],
        [0, 4, 0],
      ],
      [{ pts: [0, 1, 2, 3], closed: true }],
    );

  it("keeps a closed path CLOSED when every vertex is kept", async () => {
    const out = await clip(square(), { field: constant(0), lengthAttr: "len" });
    expect(runsOf(out)).toEqual([
      { pts: [[0, 0, 0], [4, 0, 0], [4, 4, 0], [0, 4, 0]], closed: true },
    ]);
    expect(primCol(out, "len")).toEqual([16]);
  });

  it("cuts a run that crosses the seam as ONE open run", async () => {
    // Keep y <= 2: vertices 0 and 1, entered on the closing segment 3 -> 0.
    const out = await clip(square(), { field: sub(constant(2), Y), lengthAttr: "len" });
    expect(runsOf(out)).toEqual([
      {
        pts: [
          [0, 2, 0],
          [0, 0, 0],
          [4, 0, 0],
          [4, 2, 0],
        ],
        closed: false,
      },
    ]);
    expect(primCol(out, "len")).toEqual([8]);
  });

  it("orders a closed path's runs by their first kept vertex", async () => {
    // Keep |y - x| >= 2: vertices 1 and 3 (the off-diagonal corners), each
    // entered half way along the segment before it — vertex 1 after
    // segment 0, vertex 3 after segment 2 — so vertex 1's run comes first.
    const out = await clip(square(), { field: sub(abs(sub(Y, X)), constant(2)) });
    expect(runsOf(out)).toEqual([
      {
        pts: [
          [2, 0, 0],
          [4, 0, 0],
          [4, 2, 0],
        ],
        closed: false,
      },
      {
        pts: [
          [2, 4, 0],
          [0, 4, 0],
          [0, 2, 0],
        ],
        closed: false,
      },
    ]);
  });
});

describe("pathClip: what the points and runs carry", () => {
  it("lerps f32 columns at a cut, takes discrete ones from the kept end, and re-seeds the cut", async () => {
    const geo = row(3);
    const lane = geo.attrs.point.add("lane", "i32", 1, 0).writable();
    lane.set([7, 8, 9]);
    const tag = geo.attrs.point.add("tag", "string", 1, "");
    tag.setString(0, "a");
    tag.setString(1, "b");
    tag.setString(2, "c");
    const w = geo.attrs.point.add("w", "f32", 2, [0, 0]).writable();
    w.set([0, 0, 10, 100, 20, 200]);
    const seeds = geo.attrs.point.require("seed").writable();
    seeds.set([11, 12, 13]);
    const out = await clip(geo, { field: sub(constant(1.25), X) });
    expect(pointCol(out, "w")).toEqual([0, 0, 10, 100, 12.5, 125]);
    expect(pointCol(out, "lane")).toEqual([7, 8, 8]);
    const t = out.attrs.point.require("tag");
    expect([0, 1, 2].map((i) => t.getString(i))).toEqual(["a", "b", "b"]);
    const s = pointCol(out, "seed");
    expect(s.slice(0, 2)).toEqual([11, 12]);
    expect(s[2]).not.toBe(12);
    const again = await clip(geo, { field: sub(constant(1.25), X) });
    expect(pointCol(again, "seed")).toEqual(s);
  });

  it("carries primitive attributes to every run and detail attributes unchanged", async () => {
    const geo = paths(
      [0, 1, 2, 3, 4].map((x) => [x, 0, 0] as [number, number, number]),
      [{ pts: [0, 1, 2] }, { pts: [2, 3, 4] }],
    );
    const road = geo.attrs.primitive.add("road", "i32", 1, 0).writable();
    road.set([5, 6]);
    geo.attrs.detail.add("era", "f32", 1, 0).set(0, 1889);
    // Keep x <= 0.5 or x >= 1.5 — the first polyline splits, the second not.
    const out = await clip(geo, { field: sub(abs(sub(X, constant(1))), constant(0.5)), runIndexAttr: "run" });
    expect(primCol(out, "road")).toEqual([5, 5, 6]);
    expect(primCol(out, "run")).toEqual([0, 1, 0]);
    expect(out.attrs.detail.require("era").data[0]).toBe(1889);
    // Point 2 is on both polylines and is emitted once per run visiting it.
    expect(runsOf(out).map((r) => r.pts.map((p) => p[0]))).toEqual([[0, 0.5], [1.5, 2], [2, 3, 4]]);
  });
});

describe("pathClip: dropping", () => {
  it("drops runs shorter than minLength", async () => {
    const field = sub(abs(sub(X, constant(2))), constant(0.5));
    const out = await clip(row(6), { field, minLength: 2, runIndexAttr: "run" });
    // [0, 1.5] is 1.5 long and dropped; [2.5, 5] is 2.5 long and kept, and
    // is numbered 0 because only survivors are counted.
    expect(runsOf(out).map((r) => r.pts.map((p) => p[0]))).toEqual([[2.5, 3, 4, 5]]);
    expect(primCol(out, "run")).toEqual([0]);
  });

  it("drops a run of one point whatever minLength says", async () => {
    // Only vertex 2 is kept, at exactly 0: both cuts land on it.
    const out = await clip(row(5), { field: sub(constant(0), abs(sub(X, constant(2)))) });
    expect(out.primitiveCount).toBe(0);
  });
});

describe("pathClip: empty and malformed input", () => {
  it("cooks an input with no points to an empty output", async () => {
    const out = await clip(createPointCloud(0), { field: X });
    expect(out.pointCount).toBe(0);
    expect(out.primitiveCount).toBe(0);
  });

  it("refuses a cloud with no polyline, as every path node does", async () => {
    const msg = await rejection(clip(createPointCloud(3), { field: X }));
    expect(msg).toContain("pathClip: input has no polyline primitives");
  });

  it("refuses fraction and index by name", async () => {
    expect(await rejection(clip(row(3), { field: sub(fraction(), constant(0.5)) }))).toContain(
      'pathClip: param "field": the expression at field.args[0] uses "fraction"',
    );
    expect(await rejection(clip(row(3), { field: sub(index(), constant(1)) }))).toContain('uses "index"');
  });

  it("refuses a negative minLength and one report name used twice", async () => {
    expect(await rejection(clip(row(3), { field: X, minLength: -1 }))).toContain(
      'pathClip: param "minLength" is -1',
    );
    expect(
      await rejection(clip(row(3), { field: X, runIndexAttr: "r", lengthAttr: "r" })),
    ).toContain('runIndexAttr and lengthAttr both name "r"');
  });

  it("refuses an arcAttr that would delete a carried column of another shape", async () => {
    const msg = await rejection(clip(row(3), { field: X, arcAttr: "P" }));
    expect(msg).toContain('pathClip: arcAttr "P" already exists on the output\'s point domain');
  });
});

describe("pathClip: determinism", () => {
  it("gives a byte-identical output twice", async () => {
    const field = sub(constant(1.7), length(position()));
    const a = await clip(row(6), { field, arcAttr: "s", lengthAttr: "len" });
    const b = await clip(row(6), { field, arcAttr: "s", lengthAttr: "len" });
    expect(snapshotGeometry(a)).toEqual(snapshotGeometry(b));
  });
});
