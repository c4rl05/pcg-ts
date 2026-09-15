/**
 * The poses: the extent ladder, the focal constant, the eye standing ON the
 * surface under it rather than on the bounding box's floor, the orientation
 * of the orthographic views. (The arithmetic allowlist that keeps the
 * frames' bytes platform-independent is `arithmetic.test.ts`.)
 */
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { type DataCollection, createPointCloud, createTriangleMesh, makeGeometryItem } from "../../index.js";
import { renderPng } from "../renderPng.js";
import {
  EXTENT_LADDER,
  FOCAL,
  frameBounds,
  posesFor,
  quantizeExtent,
  snapToExtent,
} from "./views.js";

describe("quantizeExtent", () => {
  it("rounds up the ladder within every decade, exactly on a rung", () => {
    for (const decade of [0.001, 0.01, 0.1, 1, 10, 100, 1000, 1e6]) {
      for (const step of EXTENT_LADDER) {
        const rung = step * decade;
        expect(quantizeExtent(rung)).toBe(rung === 10 * decade ? 10 * decade : rung);
      }
    }
    expect(quantizeExtent(1.3)).toBe(1.6);
    expect(quantizeExtent(110)).toBe(125);
    expect(quantizeExtent(10.000001)).toBe(12.5);
    expect(quantizeExtent(999.9999999)).toBe(1000);
    expect(quantizeExtent(0.0011)).toBe(0.00125);
  });

  it("answers 1 for what is not a positive finite extent", () => {
    for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(quantizeExtent(v)).toBe(1);
  });
});

describe("FOCAL", () => {
  it("is 1 / tan(25°) — a 50° vertical field of view — to the last bit this platform computes", () => {
    expect(FOCAL).toBe(1 / Math.tan((25 * Math.PI) / 180));
  });
});

describe("frameBounds", () => {
  it("snaps centre and ground to extent/128, so a hair of movement holds the pose", () => {
    const a = frameBounds({ min: [-10, -2, -10], max: [10, 3, 10] });
    const b = frameBounds({ min: [-10.01, -2.02, -9.99], max: [10.01, 3, 10] });
    expect(a).toEqual(b);
    expect(a.extent).toBe(25);
    expect(a.groundY).toBe(snapToExtent(-2, 25));
    expect(a.pinned).toBe(false);
    const pinned = frameBounds({ min: [-10, -2, -10], max: [10, 3, 10] }, { extent: 12, eye: 3 });
    expect(pinned).toMatchObject({ extent: 12, pinned: true, autoExtent: 25, eye: 3 });
  });
});

/** A radial hill: 30 at the centre, falling to -20 at the corners of ±50. */
function hillY(x: number, z: number): number {
  return 30 - 0.01 * (x * x + z * z);
}

function hill(n: number): DataCollection {
  const positions: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = -50 + (100 * i) / n;
      const z = -50 + (100 * j) / n;
      positions.push(x, hillY(x, z), z);
    }
  }
  const tris: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      tris.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
    }
  }
  return [makeGeometryItem(createTriangleMesh(Float32Array.from(positions), Uint32Array.from(tris)))];
}

describe("the ground pose on relief", () => {
  it("stands the eye above the surface under it, not above the bounding box's floor", () => {
    const result = renderPng(hill(40), { view: "ground", width: 160, height: 120 });
    const ground = result.views.find((v) => v.name === "ground");
    expect(ground).toBeDefined();
    const [x, y, z] = (ground as NonNullable<typeof ground>).position;
    const surface = hillY(x, z);
    const eye = result.framing.eye;
    // The floor of the box is 50 units below the ground here: the old rule
    // would have put the camera deep inside the hill.
    expect(result.framing.groundY + eye).toBeLessThan(surface - 40);
    // A triangulated hill sits a little under the true one between samples.
    expect(y).toBeGreaterThan(surface);
    expect(y - surface).toBeLessThan(eye * 1.2);
    expect(y - surface).toBeGreaterThan(eye * 0.8);
  });

  it("sees the hill in front of it and sky above the horizon, not sky through the back of the terrain", () => {
    const result = renderPng(hill(40), { view: "ground", width: 160, height: 120 });
    const rgb = decodeRgb(result.png, 160, 120);
    const background = [0xf4, 0xf6, 0xf9];
    const at = (px: number, py: number): number[] => [...rgb.subarray((py * 160 + px) * 3, (py * 160 + px) * 3 + 3)];
    // Top right: the top left carries the tile label.
    expect(at(150, 2)).toEqual(background);
    expect(at(80, 117)).not.toEqual(background);
  });
});

describe("orientation of the orthographic views", () => {
  /**
   * One-point clouds told apart by their output name's colour. The third
   * mark is +z for `top` and +y for `side`: in each view the other one would
   * stand exactly in front of the centre and hide it.
   */
  function markers(view: "top" | "side"): { collection: DataCollection; outputs: string[] } {
    const one = (x: number, y: number, z: number): ReturnType<typeof makeGeometryItem> => {
      const geo = createPointCloud(1);
      geo.attrs.point.require("P").setTuple(0, [x, y, z]);
      return makeGeometryItem(geo);
    };
    return view === "top"
      ? { collection: [one(0, 0, 0), one(4, 0, 0), one(0, 0, 4)], outputs: ["centre", "east", "south"] }
      : { collection: [one(0, 0, 0), one(4, 0, 0), one(0, 4, 0)], outputs: ["centre", "east", "up"] };
  }

  /** Centroid of the pixels in one colour. */
  function find(rgb: Uint8Array, w: number, h: number, hex: string): [number, number] {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 3;
        if (rgb[o] === r && rgb[o + 1] === g && rgb[o + 2] === b) {
          sx += x;
          sy += y;
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(0);
    return [sx / n, sy / n];
  }

  it("top: +x is right and +z is down, as in the SVG; side: +x is right and +y is up", () => {
    for (const view of ["top", "side"] as const) {
      const { collection, outputs } = markers(view);
      const result = renderPng(collection, { view, width: 200, height: 200, outputs });
      const colors = new Map(result.legend.map((l) => [l.name, l.color]));
      // The names must land on different palette entries, or this test
      // would be finding one mark several times.
      expect(new Set(colors.values()).size).toBe(3);
      const rgb = decodeRgb(result.png, 200, 200);
      const origin = find(rgb, 200, 200, colors.get("centre") as string);
      const plusX = find(rgb, 200, 200, colors.get("east") as string);
      expect(plusX[0]).toBeGreaterThan(origin[0] + 10);
      expect(Math.abs(plusX[1] - origin[1])).toBeLessThan(2);
      if (view === "top") {
        const plusZ = find(rgb, 200, 200, colors.get("south") as string);
        expect(plusZ[1]).toBeGreaterThan(origin[1] + 10);
        expect(Math.abs(plusZ[0] - origin[0])).toBeLessThan(2);
      } else {
        const plusY = find(rgb, 200, 200, colors.get("up") as string);
        expect(plusY[1]).toBeLessThan(origin[1] - 10);
        expect(Math.abs(plusY[0] - origin[0])).toBeLessThan(2);
      }
    }
  });
});

/** Decode the frames' own PNGs: one IDAT, Sub filter on every row. */
function decodeRgb(png: Uint8Array, w: number, h: number): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  const parts: Uint8Array[] = [];
  while (at < png.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    if (type === "IDAT") parts.push(png.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = w * 3;
  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? rgb[y * stride + x - 3] : 0;
      rgb[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + left) & 255;
    }
  }
  return rgb;
}

describe("posesFor", () => {
  it("puts top above the content looking down with up -z, and side in front of it on +z", () => {
    const framing = frameBounds({ min: [-3, -1, -7], max: [9, 2, 4] });
    const poses = posesFor(framing, () => framing.groundY);
    expect(poses.top).toMatchObject({ projection: "orthographic", up: [0, 0, -1] });
    expect(poses.top.position[1]).toBeGreaterThan(2);
    expect(poses.side).toMatchObject({ projection: "orthographic", up: [0, 1, 0] });
    expect(poses.side.position[2]).toBeGreaterThan(4);
    expect(poses.hero.projection).toBe("perspective");
    expect(poses.ground.projection).toBe("perspective");
  });
});
