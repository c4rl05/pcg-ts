/**
 * NO TWO GEOMETRIES SHARE A TOPOLOGY ARRAY — and the guard that keeps the
 * compile-time half of that from being emptied.
 *
 * The library installs topology BY REFERENCE (`adoptTopology`), so a
 * node's cached geometry holds the very arrays its execute allocated.
 * That is safe exactly as long as no SECOND geometry holds them too, and
 * as long as nothing writes them in place afterwards.
 *
 * `src/nodes/topologyAliasing.test.ts` hunts the second half through a
 * real cook, with vandals planted. This file pins the first half where it
 * is decided — in the two functions that build a geometry from another —
 * and then checks that the type-level refusal is still written down.
 *
 * Lending the arrays instead of copying them was built and measured on
 * 2026-09-20 and withdrawn: 0.12% to 0.39% of what an eiffel cook
 * retains. See PLAN.md, "lending a geometry's topology". The read view
 * these tests sit beside is what that attempt left behind, and it is the
 * part that pays.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { adoptTopology } from "../src/data/adoptTopology.js";
import { deriveGeometry } from "../src/data/derive.js";
import { cloneGeometry, createTriangleMesh, Geometry } from "../src/index.js";

const REPO = fileURLToPath(new URL("../", import.meta.url));

/** Two triangles over four points: four vertices' worth of topology. */
function mesh(): Geometry {
  return createTriangleMesh([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1], [0, 1, 2, 0, 2, 3]);
}

describe("a geometry built from another gets its own topology arrays", () => {
  for (const [name, build] of [
    ["deriveGeometry", deriveGeometry],
    ["cloneGeometry", cloneGeometry],
  ] as const) {
    it(`${name} copies all three`, () => {
      const src = mesh();
      const out = build(src);
      expect(Array.from(out.vertexToPoint)).toEqual(Array.from(src.vertexToPoint));
      expect(Array.from(out.primVertexStart)).toEqual(Array.from(src.primVertexStart));
      expect(Array.from(out.primVertexCount)).toEqual(Array.from(src.primVertexCount));
      expect(out.vertexToPoint).not.toBe(src.vertexToPoint);
      expect(out.primVertexStart).not.toBe(src.primVertexStart);
      expect(out.primVertexCount).not.toBe(src.primVertexCount);
      // The buffer too, not just the view: a `subarray` would compare
      // unequal as an object while still aliasing the bytes.
      expect(out.vertexToPoint.buffer).not.toBe(src.vertexToPoint.buffer);
    });
  }

  it("two consumers of one producer cannot see each other's topology writes", () => {
    // The case the copy exists for: one geometry, two derived from it,
    // each writing. The writes go through a cast, because a geometry
    // hands its topology out read-only — which is the whole point, and
    // is why this is the only way left to ask the question.
    const src = mesh();
    const before = Array.from(src.vertexToPoint);
    const a = deriveGeometry(src);
    const b = deriveGeometry(src);
    (a.vertexToPoint as unknown as Uint32Array)[0] = 3;
    (b.vertexToPoint as unknown as Uint32Array)[0] = 1;
    expect(a.vertexToPoint[0]).toBe(3);
    expect(b.vertexToPoint[0]).toBe(1);
    expect(Array.from(src.vertexToPoint)).toEqual(before);
  });

  it("CONTROL: two geometries CAN share an array, and this comparison sees it", () => {
    // Without this, "not the same array" above could be a fact about
    // typed arrays rather than about what derive and clone do.
    // `adoptTopology` installs by reference, so handing one geometry's
    // array to a second really does make them one — and the write then
    // shows through both.
    const src = mesh();
    const other = new Geometry();
    other.attrs.point.resize(src.pointCount);
    adoptTopology(
      other,
      src.vertexToPoint as unknown as Uint32Array,
      src.primVertexStart as unknown as Uint32Array,
      src.primVertexCount as unknown as Uint32Array,
    );
    expect(other.vertexToPoint).toBe(src.vertexToPoint);
    (other.vertexToPoint as unknown as Uint32Array)[0] = 3;
    expect(src.vertexToPoint[0]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// The negative type test is still there.
// ---------------------------------------------------------------------------

describe("the compile-level guard", () => {
  const NEGATIVE = "tests/topologyWriteRoute.negative.ts";
  const text = (): string => readFileSync(join(REPO, NEGATIVE), "utf8");

  it("still carries a directive for every refusal it names", () => {
    // WHAT THIS CAN AND CANNOT SEE. It reads the negative file as TEXT,
    // so it catches the one failure `tsc` cannot — the file being
    // emptied, since `tsc` says nothing about cases that are not there —
    // and it catches NOTHING ELSE. Loosen `ReadonlyTopology` back to
    // `Uint32Array` and these six tests still pass while every directive
    // in that file goes unused. The claim itself is checked by
    // `npm run check`, never by `npm test`.
    //
    // The count is a floor, not an equality, so adding cases is free. It
    // counts the directives the compiler sees, not the ones the file's
    // own prose mentions, which is why the match demands a newline after.
    const source = text();
    const directives = source.match(/@ts-expect-error [^\n]*\n/g) ?? [];
    expect(directives.length).toBeGreaterThanOrEqual(20);
    for (const fn of [
      "indexedStore",
      "bulkWrites",
      "replacingOneArray",
      "throughSubarray",
      "throughSlice",
      "assignmentToMutable",
      "passingToMutableParameter",
      "reachingTheBuffer",
      "setTopologyTakesEither",
      "buildingTheReplacementStillWorks",
      "knownHoles",
      "publishedChecks",
    ]) {
      expect(source, `${NEGATIVE} lost ${fn}`).toContain(`export function ${fn}(`);
    }
    for (const op of ["set(", "fill(", "copyWithin(", "sort(", "reverse(", "subarray(", "buffer"]) {
      expect(source, `${NEGATIVE} stopped covering ${op}`).toContain(op);
    }
    // Each of the three arrays is named, not just the first.
    for (const field of ["vertexToPoint", "primVertexStart", "primVertexCount"]) {
      expect(source, `${NEGATIVE} stopped covering ${field}`).toContain(`geo.${field}`);
    }
  });

  it("is reached by the type checker, and by both routes", () => {
    // It has to be INSIDE the program `npm run check` builds, or the
    // directives are never evaluated and the whole guard is inert. It is
    // under `tests/`, which tsconfig includes, and it pins the source
    // types and the published ones separately — the second is the one
    // that would catch a d.ts bundler widening `vertexToPoint` back.
    const config = JSON.parse(
      readFileSync(join(REPO, "tsconfig.json"), "utf8").replace(/\/\/.*$/gm, ""),
    ) as { include?: string[] };
    expect(config.include ?? []).toEqual(expect.arrayContaining(["tests"]));
    const source = text();
    expect(source).toContain('from "../src/data/index.js"');
    expect(source).toContain('import("pcg-ts").Geometry');
  });
});
