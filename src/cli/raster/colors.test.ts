/**
 * The categorical colours must stay tellable apart ONCE DRAWN, not only as
 * swatches. Faces are Lambert-shaded — every channel scaled by the same
 * factor between the ambient floor and 1 — and lines by a fixed shade in
 * that range, so a colour that is some other slot's colour times a factor
 * in that range can appear in the picture as that other slot. The first
 * version's darker pass (× 0.58) was exactly that: the "bush" proxy colour
 * #2d4661 was also what a terrain face in the first palette colour shaded
 * to.
 */
import { describe, expect, it } from "vitest";
import { AMBIENT, LINE_SHADE, categoricalColor } from "./scene.js";

const channelsOf = (rgb: number): [number, number, number] => [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];

/** Is `target` what `source` becomes when every channel is scaled by some k in [lo, 1] and rounded? */
function shadesTo(source: number, target: number, lo: number): number | undefined {
  const s = channelsOf(source);
  const t = channelsOf(target);
  // Step finer than one byte for the brightest channel, so no reachable
  // rounding is skipped.
  const steps = 4096;
  for (let i = 0; i <= steps; i++) {
    const k = lo + ((1 - lo) * i) / steps;
    if (Math.round(s[0] * k) === t[0] && Math.round(s[1] * k) === t[1] && Math.round(s[2] * k) === t[2]) return k;
  }
  return undefined;
}

describe("categorical colours", () => {
  const slots = Array.from({ length: 24 }, (_, i) => categoricalColor(i));

  it("gives 24 distinct swatches, the first eight the SVG's palette", () => {
    expect(new Set(slots).size).toBe(24);
    expect(slots[0]).toBe(0x4e79a7);
    expect(slots[7]).toBe(0xff9da7);
  });

  it("never draws one slot's colour as another's: no swatch is another slot's colour shaded", () => {
    expect(LINE_SHADE).toBeGreaterThanOrEqual(AMBIENT);
    const collisions: string[] = [];
    for (let i = 0; i < slots.length; i++) {
      for (let j = 0; j < slots.length; j++) {
        if (i === j) continue;
        const k = shadesTo(slots[j], slots[i], AMBIENT);
        if (k !== undefined) {
          collisions.push(
            `slot ${i} #${slots[i].toString(16).padStart(6, "0")} = slot ${j} #${slots[j].toString(16).padStart(6, "0")} × ${k.toFixed(3)}`,
          );
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  it("can detect a collision, so the empty list above means something", () => {
    const base = 0x4e79a7;
    const darker = (Math.round(0x4e * 0.58) << 16) | (Math.round(0x79 * 0.58) << 8) | Math.round(0xa7 * 0.58);
    expect(shadesTo(base, darker, AMBIENT)).toBeDefined();
  });
});
