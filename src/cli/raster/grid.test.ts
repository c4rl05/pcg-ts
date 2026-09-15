/**
 * The ground grid is a floor AROUND the content, never a pattern drawn over
 * it. Two ways it used to fail, both reproduced here against a frame drawn
 * without the grid: every pixel the content covers must be byte-identical
 * with the grid on.
 *
 * (A) Ground below the snapped floor: a quad at y = -1.2 with extent 320
 *     snaps groundY to 0 (steps of 2.5), so a grid placed relative to
 *     groundY floated 0.88 above the mesh.
 * (B) Ground exactly at the floor: the grid 0.32 below it still showed
 *     through as dots in the hero view, because a line splat tested its
 *     centre depth against all four samples and at grazing angles the
 *     ground's depth changes by more than the offset between samples.
 */
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { type DataCollection, createTriangleMesh, makeGeometryItem } from "../../index.js";
import { renderPng } from "../renderPng.js";

function quadAt(y: number, half: number): DataCollection {
  const quad = createTriangleMesh(
    Float32Array.of(-half, y, -half, half, y, -half, half, y, half, -half, y, half),
    Uint32Array.of(0, 1, 2, 0, 2, 3),
  );
  return [makeGeometryItem(quad)];
}

function decode(png: Uint8Array, w: number, h: number): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  const parts: Uint8Array[] = [];
  while (at < png.length) {
    const len = view.getUint32(at);
    if (String.fromCharCode(...png.subarray(at + 4, at + 8)) === "IDAT") parts.push(png.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = w * 3;
  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < stride; x++) {
      rgb[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + (x >= 3 ? rgb[y * stride + x - 3] : 0)) & 255;
    }
  }
  return rgb;
}

/** Pixels whose colour differs between the frame with the grid and without it, inside what the content covers. */
function gridOverContent(collection: DataCollection, view: "hero" | "ground"): { over: number; content: number; grid: number } {
  const w = 320;
  const h = 240;
  const opts = { view, width: w, height: h, outputs: ["ground"] } as const;
  const withGrid = decode(renderPng(collection, opts).png, w, h);
  const without = decode(renderPng(collection, { ...opts, grid: false }).png, w, h);
  const bare = decode(renderPng([], { ...opts, grid: false }).png, w, h);
  const coveredAt = (x: number, y: number): boolean => {
    const o = (y * w + x) * 3;
    return without[o] !== bare[o] || without[o + 1] !== bare[o + 1] || without[o + 2] !== bare[o + 2];
  };
  let over = 0;
  let content = 0;
  let grid = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = (y * w + x) * 3;
      // Interior of the content only: a pixel on the quad's silhouette is
      // partly background after the 2×2 box filter, and the grid may
      // rightly fill those background samples.
      let covered = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) covered = covered && coveredAt(x + dx, y + dy);
      const differs =
        withGrid[o] !== without[o] || withGrid[o + 1] !== without[o + 1] || withGrid[o + 2] !== without[o + 2];
      if (covered) content++;
      if (differs) grid++;
      if (covered && differs) over++;
    }
  }
  return { over, content, grid };
}

describe("ground grid", () => {
  for (const y of [-1.2, 0, -0.1]) {
    for (const view of ["hero", "ground"] as const) {
      it(`never draws over a flat ground at y = ${y} in the ${view} view`, () => {
        const { over, content, grid } = gridOverContent(quadAt(y, 145), view);
        expect(content).toBeGreaterThan(1000);
        // The grid is drawn at all (around the quad, or beyond its edge)...
        if (view === "hero") expect(grid).toBeGreaterThan(100);
        // ...and not one covered pixel changed because of it.
        expect(over).toBe(0);
      });
    }
  }
});
