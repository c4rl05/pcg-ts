/**
 * An EMPTY geometry — no points, no primitives — handed to a path node.
 *
 * A partitioned cook produces one whenever a cell holds none of the paths
 * a node walks: the filter upstream kept nothing, and was right to. The
 * nodes that opt in (`polylineArcTables(..., "emptyInput")`) answer with
 * their output with nothing in it, rather than with the refusal a cloud
 * that should have been a path gets (`noPolylines` in util.ts), which they
 * still give any input that HAS points. Opting in is a claim about the
 * node's empty output, so each node that makes it is listed here.
 */
import { describe, expect, it } from "vitest";
import { Geometry, createPointCloud } from "../data/index.js";
import { makeGeometryItem, type DataCollection } from "../graph/index.js";
import type { NodeDef } from "../graph/index.js";
import { runNode } from "./nodes.testsupport.js";
import { pathResample, pathSegments } from "./paths.js";
import { sweepProfile } from "./surfaces.js";

const empty = (): DataCollection => [makeGeometryItem(createPointCloud(0))];

/** Points with no path over them: still the mistake the refusal names. */
const cloud = (): DataCollection => [makeGeometryItem(createPointCloud(2))];

// biome-ignore lint/suspicious/noExplicitAny: a table of heterogeneous node defs
const EMPTY_IN_EMPTY_OUT: Array<[string, NodeDef<any>, Record<string, unknown>]> = [
  ["pathResample", pathResample, { mode: "count", count: 2 }],
  ["pathResample", pathResample, { mode: "spacing", spacing: 0.5 }],
  ["pathSegments", pathSegments, {}],
  ["sweepProfile", sweepProfile, {}],
];

/** Every point and primitive any output of `out` carries, and how many geometry items. */
function contents(out: Record<string, DataCollection>): { points: number; prims: number; items: number } {
  let points = 0;
  let prims = 0;
  let items = 0;
  for (const list of Object.values(out))
    for (const item of list)
      if (item.kind === "geometry") {
        items++;
        points += (item.geo as Geometry).pointCount;
        prims += (item.geo as Geometry).primitiveCount;
      }
  return { points, prims, items };
}

describe("a path node that opts in puts out nothing for an empty geometry", () => {
  for (const [name, def, params] of EMPTY_IN_EMPTY_OUT) {
    it(`${name} ${JSON.stringify(params)}`, async () => {
      const out = await runNode(def, params, { in: empty() });
      // Still a geometry on the output, so what reads it downstream finds
      // an input to read, just nothing in it.
      expect(contents(out)).toEqual({ points: 0, prims: 0, items: 1 });
    });
  }

  it("a cloud with points and no path is still refused, naming the node", async () => {
    await expect(runNode(pathResample, {}, { in: cloud() })).rejects.toThrow(/pathResample: input has no polyline primitives/);
    await expect(runNode(pathSegments, {}, { in: cloud() })).rejects.toThrow(/pathSegments: input has no polyline primitives/);
    await expect(runNode(sweepProfile, {}, { in: cloud() })).rejects.toThrow(/sweepProfile: input has no polyline primitives/);
  });
});
