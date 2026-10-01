/**
 * The drawing's wash (demos/eiffel/wash.ts): the palette generator keeps
 * every paint's relation to the reference, and the shader edits still find
 * their anchors in the three this repo runs (an upgrade that moves one
 * must fail here, not as a blank page).
 */
import { describe, expect, it } from "vitest";
import { Color, SRGBColorSpace, ShaderLib } from "three";
import { WASH_REFERENCE, washColor, washFragmentShader } from "../demos/eiffel/wash.js";

const hsl = (c: Color) => c.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
const ref = new Color(WASH_REFERENCE);

describe("washColor", () => {
  it("is the identity when the main colour is the reference", () => {
    for (const hex of [0x6b4d3b, 0xcdc3ae, 0xb9ccc8, 0xc9a14a, 0x4f3a2e]) {
      const out = washColor(new Color(hex), ref, ref);
      // Within about one 8-bit step per channel.
      const a = new Color(hex);
      expect(Math.abs(out.r - a.r)).toBeLessThan(0.01);
      expect(Math.abs(out.g - a.g)).toBeLessThan(0.01);
      expect(Math.abs(out.b - a.b)).toBeLessThan(0.01);
    }
  });

  it("maps the reference itself onto the main colour", () => {
    const main = new Color(0xb87a66);
    const out = washColor(ref, main, ref);
    expect(Math.abs(out.r - main.r)).toBeLessThan(0.01);
    expect(Math.abs(out.g - main.g)).toBeLessThan(0.01);
    expect(Math.abs(out.b - main.b)).toBeLessThan(0.01);
  });

  it("keeps a lighter paint lighter and a darker one darker, inside [0, 1]", () => {
    const main = new Color(0xe0c0b0);
    const m = hsl(main);
    const light = hsl(washColor(new Color(0xcdc3ae), main, ref));
    const dark = hsl(washColor(new Color(0x4f3a2e), main, ref));
    expect(light.l).toBeGreaterThan(m.l);
    expect(light.l).toBeLessThanOrEqual(1);
    expect(dark.l).toBeLessThan(m.l);
    expect(dark.l).toBeGreaterThanOrEqual(0);
    // Control: a paint equal to the reference does not move off the main.
    expect(hsl(washColor(ref, main, ref)).l).toBeCloseTo(m.l, 2);
  });

  it("turns hue by the main colour's offset", () => {
    const main = new Color().setHSL(0.6, 0.4, 0.5, SRGBColorSpace);
    const base = new Color(0xb9ccc8);
    const turned = hsl(washColor(base, main, ref)).h;
    const expected = (((hsl(main).h + hsl(base).h - hsl(ref).h) % 1) + 1) % 1;
    expect(turned).toBeCloseTo(expected, 2);
  });

  it("holds stone near grey whatever the main colour", () => {
    const stone = hsl(washColor(new Color(0x9a8a76), new Color(0xd02020), ref, new Color(), "stone"));
    expect(stone.s).toBeLessThan(0.1);
    // Control: the same paint as plain paint takes the main's red.
    const paint = hsl(washColor(new Color(0x9a8a76), new Color(0xd02020), ref));
    expect(paint.s).toBeGreaterThan(0.1);
  });
});

describe("washFragmentShader", () => {
  it("finds every anchor in this three's physical fragment shader, once", () => {
    const out = washFragmentShader(ShaderLib.physical.fragmentShader);
    expect(out).toContain("washRamp(dotNL)");
    expect(out).toContain("diffuseColor.rgb = washAlbedo");
    expect(out).toContain("metalnessFactor = 0.0");
    expect(out).toContain("reflectedLight.directSpecular = vec3(0.0)");
    expect(out).toContain("mix(washShadeTint, washLitTint, washK)");
  });

  it("refuses a shader that lacks an anchor", () => {
    expect(() => washFragmentShader("void main() {}")).toThrow(/wash\.ts/);
  });
});
