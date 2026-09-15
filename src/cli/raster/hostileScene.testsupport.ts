/**
 * A small collection built to break a rasterizer, shared by the in-process
 * PNG tests and the child processes that check the bytes do not depend on
 * locale or timezone. Imported by path, so keep it free of anything but
 * the library.
 *
 * What it carries, and why each is here: a ground quad for the eye-level
 * cast; a concave polygon (fan triangulation draws it as a host would);
 * an untagged quad; a face with a non-finite corner; mixed magnitudes and
 * a negative zero; a polyline; a point cloud; instances rotated, scaled,
 * one of them non-finite; a device-resident batch that must be counted
 * and not drawn; and a `color` attribute that must NOT be read.
 */
import {
  type DataCollection,
  createPointCloud,
  createPolyline,
  createTriangleMesh,
  makeGeometryItem,
  makeInstancesItem,
} from "../../index.js";
import { makeDeviceInstancesItem } from "../../graph/data.js";

/** Declared output names, one per item of {@link hostileScene}. */
export const HOSTILE_OUTPUTS = ["ground", "rock", "blob", "road", "dots", "trees", "gpu"] as const;

/**
 * The scene. `nudge` is added to ONE float — the rock's apex height — so a
 * test can show that a single changed input moves the pinned hash.
 */
export function hostileScene(nudge = 0): DataCollection {
  const ground = createTriangleMesh(
    Float32Array.of(-8, 0, -8, 8, 0, -8, 8, 0.5, 8, -8, -0, 8),
    Uint32Array.of(0, 1, 2, 0, 2, 3),
  );

  // A concave "L" polygon plus a tall apex face, with mixed magnitudes.
  const rock = createPointCloud(8);
  const rp = rock.attrs.point.require("P");
  // The "L" floats above the ground quad (whose highest corner is 0.5), so
  // the fan's spill outside the concave corner is visible from above.
  const corners = [
    [-3, 0.8, -3],
    [0, 0.8, -3],
    [0, 0.8, -1],
    [2.5, 0.8, -1],
    [2.5, 0.8, 1e-7],
    [-3, 0.8, 5e-4],
    [-1, 3 + nudge, -1.5],
    [Number.NaN, 1, 0],
  ] as const;
  corners.forEach((c, i) => rp.setTuple(i, c));
  rock.setTopology(
    Uint32Array.of(0, 1, 2, 3, 4, 5, 0, 1, 6, 2, 6, 7),
    Uint32Array.of(0, 6, 9),
    Uint32Array.of(6, 3, 3),
  );
  rock.attrs.primitive.add("primtype", "string", 1, "poly");
  const white = rock.attrs.point.require("color");
  for (let i = 0; i < 8; i++) white.setTuple(i, [1, 1, 1, 1]);

  // Untagged topology: four vertices, so it reads as a face.
  const blob = createPointCloud(4);
  const bp = blob.attrs.point.require("P");
  [
    [3, 1, 3],
    [6, 1.5, 3],
    [6, 2, 6],
    [3, 1.2, 6],
  ].forEach((c, i) => bp.setTuple(i, c as [number, number, number]));
  blob.setTopology(Uint32Array.of(0, 1, 2, 3), Uint32Array.of(0), Uint32Array.of(4));

  const road = createPolyline(Float32Array.of(-7, 0.05, 7, -2, 0.3, 2, 1, 0.2, 6, 7, 0.4, -7));

  const dots = createPointCloud(40);
  const dp = dots.attrs.point.require("P");
  for (let i = 0; i < 40; i++) {
    dp.setTuple(i, [-6 + (i % 8) * 0.9, 0.25 + (i % 3) * 0.125, 3 + ((i * 7) % 5) * 0.7]);
  }

  const m = (x: number, z: number, s: number, turn: boolean): number[] => {
    // 90° about y when `turn`; uniform scale `s`; column-major.
    const c = turn ? 0 : 1;
    const n = turn ? 1 : 0;
    return [c * s, 0, -n * s, 0, 0, s, 0, 0, n * s, 0, c * s, 0, x, 0.1, z, 1];
  };
  const oaks = Float32Array.from([...m(-5, -5, 1.5, false), ...m(4, -4, 2, true), ...m(5, 0, 1, false)]);
  const broken = Float32Array.from(m(0, 0, 1, false));
  broken[13] = Number.POSITIVE_INFINITY;
  const firs = Float32Array.from([...m(-6, 1, 3, true), ...broken]);
  const trees = makeInstancesItem([
    { assetId: "oak", count: 3, transforms: oaks },
    { assetId: "fir", count: 2, transforms: firs },
  ]);

  const gpu = makeDeviceInstancesItem([
    {
      residency: "device",
      assetId: "shard",
      count: 12,
      transforms: {} as never,
    },
  ]);

  return [
    makeGeometryItem(ground),
    makeGeometryItem(rock),
    makeGeometryItem(blob),
    makeGeometryItem(road),
    makeGeometryItem(dots),
    trees,
    gpu,
  ];
}
