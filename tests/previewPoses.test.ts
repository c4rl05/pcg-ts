/**
 * The preview page and `pcg render --out frame.png` stand their cameras in
 * the same place. They cannot share one module — the CLI's is reachable
 * only through `pcg-ts/cli`, which imports `node:fs` and breaks the browser
 * build — so this holds the two copies together.
 *
 * EXACT, with one stated exception. Every pose number is compared with
 * `Object.is`: both copies compute them with the same `+ − × ÷ sqrt round`
 * in the same order. The exception is the extent ladder below a THOUSANDTH:
 * the preview finds the decade with `Math.pow(10, Math.floor(Math.log10(v)))`,
 * the CLI by walking `÷10`, and V8's `pow` is not correctly rounded for
 * those negative exponents (`Math.pow(10, -4) !== 1e-4`), so a rung there
 * differs in its last bit or two — measured on 502 sweep values, 475
 * differed, by at most a relative 3.4e-16. No content reaches that range:
 * both copies floor the span at 1e-3 before asking the ladder, and a pinned
 * `--extent` bypasses the ladder. So from 1e-3 up the ladder is compared
 * bit for bit, and below it within a relative 1e-15 — with a check that the
 * gap really exists, so the tolerance cannot silently become decoration.
 */
import { describe, expect, it } from "vitest";
import * as preview from "../preview/poses.js";
import * as cli from "../src/cli/raster/views.js";

/** Deterministic floats in [0, 1). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Extents from 1e-9 to 1e15: rungs, near-rungs and arbitrary values. */
function extentSweep(): number[] {
  const rand = lcg(31337);
  const out: number[] = [];
  for (let decade = -9; decade <= 15; decade++) {
    const d = Number(`1e${decade}`);
    for (const step of cli.EXTENT_LADDER) {
      out.push(step * d, step * d * (1 + 1e-12), step * d * (1 - 1e-12), step * d * 1.0000001);
    }
    for (let k = 0; k < 40; k++) out.push(d * (1 + 9 * rand()));
  }
  return out;
}

describe("preview poses and CLI poses", () => {
  it("quantize every reachable extent (1e-3 and up) bit for bit, and the unreachable rest within a few ulps", () => {
    let unreachable = 0;
    let unreachableNotBitEqual = 0;
    let exact = 0;
    for (const v of extentSweep()) {
      const a = preview.quantizeExtent(v);
      const b = cli.quantizeExtent(v);
      if (v >= 1e-3) {
        expect(Object.is(a, b), `quantizeExtent(${v}): preview ${a}, cli ${b}`).toBe(true);
        exact++;
      } else {
        expect(Math.abs(a - b) / a, `quantizeExtent(${v}): preview ${a}, cli ${b}`).toBeLessThanOrEqual(1e-15);
        unreachable++;
        if (!Object.is(a, b)) unreachableNotBitEqual++;
      }
    }
    expect(exact).toBeGreaterThan(1000);
    expect(unreachable).toBeGreaterThan(400);
    // The gap is real: without it this branch would need no tolerance.
    expect(unreachableNotBitEqual).toBeGreaterThan(0);
  });

  it("can tell two different poses apart, so a passing comparison means something", () => {
    const surface = (): number => 0;
    const a = preview.viewsFor(0, 0, 0, 100, 1.7, surface)[0];
    const b = cli.perspectivePoses(0, 0, 0, 100.00000000000001, 1.7, surface).hero;
    expect(Object.is(a.position[0], b.position[0])).toBe(false);
  });

  it("snap, hero, ground and the top position agree bit for bit over a sweep of extents and centres", () => {
    const rand = lcg(4242);
    let compared = 0;
    for (const extent of extentSweep().map((v) => cli.quantizeExtent(v)).filter((v) => v >= 1)) {
      for (let k = 0; k < 3; k++) {
        const raw = [(rand() - 0.5) * extent * 3, (rand() - 0.5) * extent, (rand() - 0.5) * extent * 3];
        for (const v of raw) {
          expect(Object.is(preview.snapToExtent(v, extent), cli.snapToExtent(v, extent))).toBe(true);
        }
        const cx = cli.snapToExtent(raw[0], extent);
        const groundY = cli.snapToExtent(raw[1], extent);
        const cz = cli.snapToExtent(raw[2], extent);
        const eye = 0.5 + rand() * 3;
        // A sloped surface, so the ground pose's two casts differ.
        const surface = (x: number, z: number): number => groundY + 0.37 * (x - cx) - 0.11 * (z - cz);
        const [pHero, pGround, pTop] = preview.viewsFor(cx, cz, groundY, extent, eye, surface);
        const { hero, ground } = cli.perspectivePoses(cx, cz, groundY, extent, eye, surface);
        const framing: cli.Framing = {
          extent,
          pinned: true,
          autoExtent: extent,
          eye,
          groundY,
          centre: [cx, 0, cz],
        };
        const top = cli.posesFor(framing, surface).top;
        const same = (label: string, x: readonly number[], y: readonly number[]): void => {
          expect(x.length).toBe(y.length);
          x.forEach((value, i) =>
            expect(Object.is(value, y[i]), `${label}[${i}] at extent ${extent}: preview ${value}, cli ${y[i]}`).toBe(
              true,
            ),
          );
        };
        same("hero.position", pHero.position, hero.position);
        same("hero.target", pHero.target, hero.target);
        same("hero.up", pHero.up, hero.up);
        same("hero.fog", pHero.fog, hero.fog ?? []);
        same("ground.position", pGround.position, ground.position);
        same("ground.target", pGround.target, ground.target);
        same("ground.up", pGround.up, ground.up);
        same("ground.fog", pGround.fog, ground.fog ?? []);
        same("top.position", pTop.position, top.position);
        same("top.target", pTop.target, top.target);
        same("top.up", pTop.up, top.up);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });

  it("frame a box the way the preview page does: extent from the largest span times 1.1, snapped centre and floor", () => {
    const rand = lcg(99);
    for (let k = 0; k < 200; k++) {
      const scale = Number(`1e${(k % 6) - 1}`);
      const min = [rand() * scale, rand() * scale, rand() * scale] as const;
      const max = [min[0] + rand() * scale * 4, min[1] + rand() * scale, min[2] + rand() * scale * 4] as const;
      const framing = cli.frameBounds({ min, max });
      // preview/main.ts, verbatim in order: size from Box3, max over x, z, y.
      const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
      const extent = preview.quantizeExtent(Math.max(size[0], size[2], size[1], 1e-3) * 1.1);
      if (extent >= 1) expect(Object.is(framing.extent, extent)).toBe(true);
      else expect(Math.abs(framing.extent - extent) / extent).toBeLessThanOrEqual(1e-15);
      // Box3.getCenter is (min + max) * 0.5; the CLI divides by 2 — the same double.
      const centre = [(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, (min[2] + max[2]) * 0.5];
      if (extent >= 1) {
        expect(Object.is(framing.centre[0], preview.snapToExtent(centre[0], extent))).toBe(true);
        expect(Object.is(framing.centre[2], preview.snapToExtent(centre[2], extent))).toBe(true);
        expect(Object.is(framing.groundY, preview.snapToExtent(min[1], extent))).toBe(true);
      }
    }
  });
});
