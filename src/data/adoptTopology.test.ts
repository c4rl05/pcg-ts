import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as root from "../index.js";
import { adoptTopology, checkTopology } from "./adoptTopology.js";
import { Geometry } from "./geometry.js";

/** A geometry with `n` points, a vertex column and a primitive column. */
function withPoints(n: number): Geometry {
  const geo = new Geometry();
  geo.attrs.point.resize(n);
  geo.attrs.vertex.add("uv", "f32", 2);
  geo.attrs.primitive.add("width", "f32", 1);
  return geo;
}

type Arrays = [Uint32Array, Uint32Array, Uint32Array];

/** Each malformed topology `setTopology` refuses, over a 3-point geometry. */
const INVALID: [string, () => Arrays][] = [
  ["primitive arrays of different lengths", () => [Uint32Array.of(0, 1), Uint32Array.of(0), Uint32Array.of(2, 0)]],
  ["a vertex naming a point past the cloud", () => [Uint32Array.of(0, 3), Uint32Array.of(0), Uint32Array.of(2)]],
  ["a primitive range past the vertices", () => [Uint32Array.of(0, 1, 2), Uint32Array.of(1), Uint32Array.of(3)]],
];

function thrown(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    return (err as Error).message;
  }
  return "<did not throw>";
}

describe("adoptTopology", () => {
  it("keeps the caller's arrays by reference and sizes vertex and primitive sets", () => {
    const geo = withPoints(4);
    const v2p = Uint32Array.of(0, 1, 2, 2, 3);
    const start = Uint32Array.of(0, 3);
    const count = Uint32Array.of(3, 2);
    adoptTopology(geo, v2p, start, count);
    expect(geo.vertexToPoint).toBe(v2p);
    expect(geo.primVertexStart).toBe(start);
    expect(geo.primVertexCount).toBe(count);
    expect(geo.vertexCount).toBe(5);
    expect(geo.primitiveCount).toBe(2);
    expect(geo.attrs.vertex.require("uv").data.length).toBeGreaterThanOrEqual(10);
    expect(geo.pointCount).toBe(4);
  });

  it("ends in exactly the state setTopology does", () => {
    const a = withPoints(4);
    const b = withPoints(4);
    const arrays = (): Arrays => [Uint32Array.of(3, 1, 0, 2), Uint32Array.of(0, 2), Uint32Array.of(2, 2)];
    a.setTopology(...arrays());
    adoptTopology(b, ...arrays());
    for (const key of ["vertexToPoint", "primVertexStart", "primVertexCount"] as const) {
      expect(Array.from(b[key])).toEqual(Array.from(a[key]));
    }
    for (const domain of ["point", "vertex", "primitive", "detail"] as const) {
      expect(b.attrs[domain].count).toBe(a.attrs[domain].count);
      expect([...b.attrs[domain].names()]).toEqual([...a.attrs[domain].names()]);
    }
  });

  describe.each(INVALID)("refuses %s exactly as setTopology does", (_label, make) => {
    it("throws the same message and leaves the geometry untouched", () => {
      const viaSet = withPoints(3);
      const viaAdopt = withPoints(3);
      const before = viaAdopt.vertexToPoint;
      const expected = thrown(() => viaSet.setTopology(...make()));
      expect(expected).toMatch(/^setTopology: /);
      expect(thrown(() => adoptTopology(viaAdopt, ...make()))).toBe(expected);
      // Validation runs before anything is installed or resized.
      expect(viaAdopt.vertexToPoint).toBe(before);
      expect(viaAdopt.vertexCount).toBe(0);
      expect(viaAdopt.primitiveCount).toBe(0);
      // And the shared check is the whole of it: it throws the same thing on
      // its own, given the point count.
      expect(thrown(() => checkTopology(3, ...make()))).toBe(expected);
    });
  });
});

describe("Geometry.setTopology keeps its defensive copy", () => {
  it("installs arrays that are not the caller's", () => {
    const geo = withPoints(3);
    const v2p = Uint32Array.of(0, 1, 2);
    const start = Uint32Array.of(0);
    const count = Uint32Array.of(3);
    geo.setTopology(v2p, start, count);
    expect(geo.vertexToPoint).not.toBe(v2p);
    expect(geo.primVertexStart).not.toBe(start);
    expect(geo.primVertexCount).not.toBe(count);
    expect(geo.vertexToPoint.buffer).not.toBe(v2p.buffer);
    // Writes on either side stay on that side.
    v2p[0] = 2;
    count[0] = 1;
    expect(Array.from(geo.vertexToPoint)).toEqual([0, 1, 2]);
    expect(Array.from(geo.primVertexCount)).toEqual([3]);
    // The other direction. The cast is what it takes to write an
    // installed topology array at all now, which is the point of the
    // read view — and it is the only way to ask this question, since the
    // copy is exactly what makes the two sides independent.
    (geo.vertexToPoint as unknown as Uint32Array)[1] = 0;
    expect(Array.from(v2p)).toEqual([2, 1, 2]);
    expect(Array.from(geo.vertexToPoint)).toEqual([0, 0, 2]);
  });
});

describe("adoptTopology is not public", () => {
  const INTERNAL = ["adoptTopology", "checkTopology", "installTopology"];

  it("is absent from the root import", () => {
    for (const name of INTERNAL) expect(name in root).toBe(false);
  });

  it("is re-exported by no module under src/", () => {
    // A name reaches an entry point only through a re-export, and this
    // module defines all three. So the invariant is: no `export ... from`
    // names the module, and no `export { ... }` list names the functions.
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) files.push(path);
      }
    };
    walk(srcDir);
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(srcDir, file).replace(/\\/g, "/");
      if (rel === "data/adoptTopology.ts") continue;
      const text = readFileSync(file, "utf8");
      const reExport =
        /^\s*export\s+(type\s+)?(\*(\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["'][^"']*\/adoptTopology(\.js)?["']/m;
      if (reExport.test(text)) offenders.push(`${rel}: re-exports the module`);
      for (const block of text.match(/export\s*(type\s*)?\{[^}]*\}/g) ?? []) {
        for (const name of INTERNAL) {
          if (new RegExp(`\\b${name}\\b`).test(block)) offenders.push(`${rel}: exports ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
