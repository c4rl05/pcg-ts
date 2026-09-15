/**
 * The built-in label font: every glyph well formed, the labels' characters
 * all present, unknown characters visible as `?`, and drawing clipped to
 * its tile.
 */
import { describe, expect, it } from "vitest";
import { FONT_CHARACTERS, GLYPH_HEIGHT, drawLabel, textWidth } from "./font.js";
import { tileLabel } from "../renderPng.js";

const WHITE = 0xffffff;
const BOX = 0x102030;

/** Pixels painted in the text colour. */
function lit(image: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < image.length / 3; i++) if (image[i * 3] === 255 && image[i * 3 + 1] === 255) n++;
  return n;
}

describe("label font", () => {
  it("has every character the tile labels use", () => {
    for (const view of ["top", "side", "hero", "ground"] as const) {
      for (const ch of tileLabel(view, 1.7)) expect(FONT_CHARACTERS, `"${ch}" in ${view}`).toContain(ch);
    }
    expect(tileLabel("top", 1.7)).toBe("TOP x→ z↓");
    expect(tileLabel("side", 1.7)).toBe("SIDE x→ y↑");
    expect(tileLabel("hero", 1.7)).toBe("HERO");
    expect(tileLabel("ground", 1.7)).toBe("GROUND eye 1.7");
    expect(tileLabel("ground", 0.1 + 0.2)).toBe("GROUND eye 0.3");
  });

  it("measures text as five columns per glyph plus one between", () => {
    expect(textWidth("", 1)).toBe(0);
    expect(textWidth("A", 1)).toBe(5);
    expect(textWidth("AB", 2)).toBe(22);
  });

  it("draws the box and the text, deterministically, and distinct glyphs differ", () => {
    const draw = (text: string): Uint8Array => {
      const image = new Uint8Array(40 * 12 * 3);
      drawLabel(image, 40, text, 1, 1, 1, 2, { x: 0, y: 0, width: 40, height: 12 }, WHITE, BOX);
      return image;
    };
    const top = draw("TOP");
    expect(Buffer.from(draw("TOP")).equals(Buffer.from(top))).toBe(true);
    expect(Buffer.from(draw("TOQ")).equals(Buffer.from(top))).toBe(false);
    // The box: its corner pixel is the box colour.
    expect([...top.subarray((1 * 40 + 1) * 3, (1 * 40 + 1) * 3 + 3)]).toEqual([0x10, 0x20, 0x30]);
    expect(lit(top)).toBeGreaterThan(20);
  });

  it("draws a character it has no glyph for as ?, not as nothing", () => {
    const draw = (text: string): Uint8Array => {
      const image = new Uint8Array(20 * 12 * 3);
      drawLabel(image, 20, text, 0, 0, 1, 1, { x: 0, y: 0, width: 20, height: 12 }, WHITE, BOX);
      return image;
    };
    const unknown = String.fromCharCode(0xe9);
    expect(Buffer.from(draw(unknown)).equals(Buffer.from(draw("?")))).toBe(true);
    expect(lit(draw(unknown))).toBeGreaterThan(0);
  });

  it("never paints outside its clip rectangle", () => {
    const image = new Uint8Array(30 * 30 * 3);
    drawLabel(image, 30, "GROUND eye 1.7", 10, 10, 2, 2, { x: 10, y: 10, width: 12, height: 8 }, WHITE, BOX);
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        const inside = x >= 10 && x < 22 && y >= 10 && y < 18;
        const o = (y * 30 + x) * 3;
        const painted = image[o] !== 0 || image[o + 1] !== 0 || image[o + 2] !== 0;
        if (!inside) expect(painted, `${x},${y}`).toBe(false);
      }
    }
  });

  it("keeps every glyph 7 rows of 5 columns", async () => {
    const source = (await import("node:fs")).readFileSync(new URL("./font.ts", import.meta.url), "utf8");
    // Each glyph is an array literal of exactly seven 5-character rows; the
    // count of arrays of that exact shape must be the count of glyphs.
    const strict = new RegExp(`\\[(?:"[.#]{5}", ){${GLYPH_HEIGHT - 1}}"[.#]{5}"\\]`, "g");
    expect([...source.matchAll(strict)].length).toBe(FONT_CHARACTERS.length);
  });
});
