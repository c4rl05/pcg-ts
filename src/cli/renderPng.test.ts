/**
 * PNG frames end to end: what the report says was drawn, the promise that
 * the bytes are the same on every run and platform (a pinned hash of a
 * hostile scene, the same bytes from two processes a locale and a timezone
 * apart), that one changed float moves the hash, and a ceiling on the
 * heaviest mesh in the corpus.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import {
  cook,
  createPointCloud,
  createTriangleMesh,
  deserializeGraph,
  makeGeometryItem,
  makeInstancesItem,
} from "../index.js";
import * as cliSurface from "./index.js";
import { HOSTILE_OUTPUTS, hostileScene } from "./raster/hostileScene.testsupport.js";
import { renderPng } from "./renderPng.js";

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

/** The pinned render: a small sheet, so the hash covers all four views. */
function pinnedRender(nudge = 0): ReturnType<typeof renderPng> {
  return renderPng(hostileScene(nudge), { width: 320, height: 240, outputs: [...HOSTILE_OUTPUTS] });
}

/**
 * Taken on Windows, Node 22. The bytes depend only on IEEE `+ − × ÷ sqrt`
 * and exact operations (see the allowlist scan in `raster/arithmetic.test.ts`),
 * so the same digest must come out of the Linux CI matrix; if it does not,
 * that is a platform dependency to find, not a digest to re-pin.
 *
 * Re-pinned deliberately once, after review: tile labels, apex crosses,
 * colours dealt in declared order, and the grid moved under the true floor
 * and behind everything. The frame was looked at before the digest was
 * taken.
 */
const PINNED_PNG_SHA256 = "276293b76ccdd7669f6015d173ac5291ad9a1226e84a4172743946d692d33c4e";
const PINNED_PIXEL_HASH = "7165da8d78f5145c";

describe("renderPng", () => {
  it("reports what it drew: counts, device-resident instances, legend, framing and poses", () => {
    const result = pinnedRender();
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.view).toBe("sheet");
    expect(result.views.map((v) => v.name)).toEqual(["hero", "ground", "top", "side"]);
    expect(result.views.map((v) => v.tile)).toEqual([
      { x: 0, y: 0, width: 160, height: 120 },
      { x: 160, y: 0, width: 160, height: 120 },
      { x: 0, y: 120, width: 160, height: 120 },
      { x: 160, y: 120, width: 160, height: 120 },
    ]);
    const c = result.counts;
    // ground 2 + rock: the concave hexagon fans to 4, the apex face 1, the
    // NaN face 0 + blob (untagged quad) 2.
    expect(c.triangles).toBe(9);
    expect(c.skipped).toBeGreaterThanOrEqual(2); // the NaN face, the infinite instance
    expect(c.segments).toBe(3);
    expect(c.points).toBe(40);
    expect(c.instancesTotal).toBe(5);
    expect(c.instances).toBe(4);
    expect(c.deviceInstances).toBe(12);
    expect(c.pointsSuppressed).toBe(4);
    // Slot order: geometry outputs as declared, then asset ids sorted.
    expect(result.legend.map((l) => `${l.kind}:${l.name}`)).toEqual([
      "output:ground",
      "output:rock",
      "output:blob",
      "output:road",
      "output:dots",
      "asset:fir",
      "asset:oak",
    ]);
    expect(new Set(result.legend.map((l) => l.color)).size).toBe(7);
    expect(result.views.map((v) => v.label)).toEqual(["HERO", "GROUND eye 1.7", "TOP x→ z↓", "SIDE x→ y↑"]);
    expect(result.drawing.markerViews).toEqual(["top", "side", "hero"]);
    expect(result.drawing.grid.views).toEqual(["hero", "ground"]);
    expect(result.drawing.instances).toMatch(/pyramid proxies .* cross/);
    expect(result.groundView).toBeDefined();
    expect(result.framing.pinned).toBe(false);
    expect(result.framing.extent).toBe(result.framing.autoExtent);
    expect(result.pixelHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("never takes its default colours from the `color` attribute", () => {
    // The rock's points carry color = white. Drawing it white on a near-white
    // background would be an invisible picture; the default is by output.
    const scene = hostileScene();
    const once = renderPng(scene, { width: 64, height: 48, outputs: [...HOSTILE_OUTPUTS] });
    const rock = scene[1];
    if (rock.kind !== "geometry") throw new Error("fixture changed");
    rock.geo.attrs.point.require("color").setTuple(0, [0, 0, 0, 1]);
    const again = renderPng(scene, { width: 64, height: 48, outputs: [...HOSTILE_OUTPUTS] });
    expect(again.pixelHash).toBe(once.pixelHash);
  });

  it("produces the pinned bytes for the hostile scene", () => {
    const result = pinnedRender();
    expect(sha256(result.png)).toBe(PINNED_PNG_SHA256);
    expect(result.pixelHash).toBe(PINNED_PIXEL_HASH);
  });

  it("moves the hash when one input float changes", () => {
    const base = pinnedRender();
    const moved = pinnedRender(0.25);
    expect(moved.pixelHash).not.toBe(base.pixelHash);
    expect(sha256(moved.png)).not.toBe(sha256(base.png));
    // And holds it when nothing changed: a fresh scene is the same picture.
    expect(sha256(pinnedRender().png)).toBe(sha256(base.png));
  });

  it("colors by an attribute through the SVG's colorizer, and says where the colors came from", () => {
    const geo = createPointCloud(3);
    const P = geo.attrs.point.require("P");
    const h = geo.attrs.point.add("h", "f32", 1);
    for (let i = 0; i < 3; i++) {
      P.setTuple(i, [i, 0, 0]);
      h.set(i, i);
    }
    const result = renderPng([makeGeometryItem(geo)], { view: "top", width: 64, height: 64, attr: "h" });
    expect(result.colorAttr).toBe("h");
    expect(result.colorDomains).toEqual(["point"]);
    expect(() => renderPng([makeGeometryItem(geo)], { attr: "nope" })).toThrow(/no attribute "nope"/);
  });

  it("refuses option values that would draw a corrupt or oversized image, naming them", () => {
    const empty = [makeGeometryItem(createPointCloud(0))];
    expect(() => renderPng(empty, { width: 2000 })).toThrow(/"width" must be an integer from 32 to 1280/);
    expect(() => renderPng(empty, { view: "top", width: 5000 })).toThrow(/"width" must be an integer from 16 to 4096/);
    expect(() => renderPng(empty, { extent: 0 })).toThrow(/"extent" must be a finite number > 0/);
    expect(() => renderPng(empty, { view: "front" as never })).toThrow(/one of top, side, hero, ground, sheet/);
    expect(() => renderPng(empty, { attrDomain: "point" })).toThrow(/pass "attr" as well/);
  });

  it("deals distinct colours to distinct outputs in declared order, 24 before any repeat", () => {
    const one = (x: number): ReturnType<typeof makeGeometryItem> => {
      const geo = createPointCloud(1);
      geo.attrs.point.require("P").setTuple(0, [x, 0, 0]);
      return makeGeometryItem(geo);
    };
    const collection = Array.from({ length: 24 }, (_, i) => one(i));
    const outputs = Array.from({ length: 24 }, (_, i) => `out${String(i).padStart(2, "0")}`);
    const result = renderPng(collection, { view: "top", width: 64, height: 64, outputs });
    expect(result.legend.map((l) => l.name)).toEqual(outputs);
    expect(new Set(result.legend.map((l) => l.color)).size).toBe(24);
    // Ten outputs — the count that collided under the old name hash on a
    // corpus graph — are ten colours, and the first eight are the palette.
    const ten = renderPng(collection.slice(0, 10), { view: "top", width: 64, height: 64, outputs: outputs.slice(0, 10) });
    expect(new Set(ten.legend.map((l) => l.color)).size).toBe(10);
    expect(ten.legend[0].color).toBe("#4e79a7");
    // Assets come after the outputs, so an asset never takes an output's colour.
    const trees = makeInstancesItem([{ assetId: "tree", count: 1, transforms: Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) }]);
    const mixed = renderPng([one(0), trees], { view: "top", width: 64, height: 64, outputs: ["cloud", "trees"] });
    expect(mixed.legend).toEqual([
      { kind: "output", name: "cloud", color: "#4e79a7" },
      { kind: "asset", name: "tree", color: "#f28e2b" },
    ]);
  });

  it("says when the ground view is standing against a wall rather than looking at the scene", () => {
    const ground = createTriangleMesh(
      Float32Array.of(-50, 0, -50, 50, 0, -50, 50, 0, 50, -50, 0, 50),
      Uint32Array.of(0, 1, 2, 0, 2, 3),
    );
    const open = renderPng([makeGeometryItem(ground)], { view: "ground", width: 160, height: 120 });
    expect(open.groundView?.occluded).toBe(false);
    // extent 125: the ground eye stands at z = 27.5 looking toward -z; a wall
    // two units in front of it fills the frame.
    const wall = createTriangleMesh(
      Float32Array.of(-50, 0, 25.5, 50, 0, 25.5, 50, 40, 25.5, -50, 40, 25.5),
      Uint32Array.of(0, 1, 2, 0, 2, 3),
    );
    const blocked = renderPng([makeGeometryItem(ground), makeGeometryItem(wall)], {
      view: "ground",
      width: 160,
      height: 120,
    });
    expect(blocked.framing.extent).toBe(125);
    expect(blocked.groundView).toMatchObject({ occluded: true });
    expect(blocked.groundView?.nearFraction).toBeGreaterThan(0.9);
    expect(blocked.groundView?.medianDepth).toBeLessThan(3);
    // Only the ground view is measured.
    expect(renderPng([makeGeometryItem(ground)], { view: "top", width: 64, height: 64 }).groundView).toBeUndefined();
  });

  it("draws an empty collection as a valid background image", () => {
    const result = renderPng([], { view: "hero", width: 32, height: 24 });
    expect(result.framing.bounds).toBeUndefined();
    expect(result.png.length).toBeGreaterThan(50);
  });

  it("is not part of the pcg-ts/cli surface in v1", () => {
    expect(Object.keys(cliSurface)).not.toContain("renderPng");
    expect(Object.keys(cliSurface)).toContain("renderSvg");
  });
});

describe("renderPng performance", () => {
  /**
   * The heaviest mesh in the corpus by triangle count (measured over every
   * graph on 2026-09-15: `examples-rig`, 100466 triangles, 899 instances,
   * 129 segments), drawn as the default sheet. Measured at 240-360 ms on the
   * machine this was written on; the ceiling is ~20x that, for a loaded CI
   * runner, and exists to catch an accidental quadratic, not a slow day.
   */
  it("renders a sheet of the corpus' heaviest mesh under the ceiling", async () => {
    const text = readFileSync(new URL("../../graphs/examples-rig.json", import.meta.url), "utf8");
    const graph = deserializeGraph(JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text));
    const cooked = await cook(graph);
    const outputs: string[] = [];
    const collection = graph.describe().outputs.flatMap((o) =>
      (cooked.outputs[o.name] ?? []).map((item) => {
        outputs.push(o.name);
        return item;
      }),
    );
    const t0 = performance.now();
    const result = renderPng(collection, { outputs });
    const ms = performance.now() - t0;
    expect(result.counts.triangles).toBeGreaterThan(90000);
    expect(ms).toBeLessThan(6000);
  }, 60000);
});

// ---------------------------------------------------------------------------
// Cross-process byte identity
// ---------------------------------------------------------------------------

/** Node strips TypeScript without a flag from 22.18; see `render.test.ts`. */
const NODE_STRIPS_TYPES = ((): boolean => {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 18);
})();

const REPO = new URL("../../", import.meta.url);

const LOADER = `
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export function resolve(specifier, context, next) {
  if (/^\\.{1,2}\\//.test(specifier) && specifier.endsWith(".js") && context.parentURL !== undefined) {
    if (!existsSync(fileURLToPath(new URL(specifier, context.parentURL)))) {
      const ts = new URL(specifier.slice(0, -3) + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(ts))) return next(ts.href, context);
    }
  }
  return next(specifier, context);
}
`;

const REGISTER = `
import { register } from "node:module";
register("./loader.mjs", import.meta.url);
`;

const CHILD = (repo: string): string => `
const { renderPng } = await import(${JSON.stringify(`${repo}src/cli/renderPng.ts`)});
const { hostileScene, HOSTILE_OUTPUTS } = await import(${JSON.stringify(`${repo}src/cli/raster/hostileScene.testsupport.ts`)});
const result = renderPng(hostileScene(), { width: 320, height: 240, outputs: [...HOSTILE_OUTPUTS] });
process.stdout.write(Buffer.from(result.png).toString("base64"));
`;

describe.runIf(NODE_STRIPS_TYPES)("renderPng across processes", () => {
  it("writes the same PNG bytes in two node processes, locale and timezone apart, and in this one", () => {
    const dir = mkdtempSync(join(tmpdir(), "pcg-png-"));
    try {
      writeFileSync(join(dir, "loader.mjs"), LOADER);
      writeFileSync(join(dir, "register.mjs"), REGISTER);
      writeFileSync(join(dir, "child.mjs"), CHILD(REPO.href));
      const run = (env: NodeJS.ProcessEnv): string =>
        execFileSync(
          process.execPath,
          ["--import", pathToFileURL(join(dir, "register.mjs")).href, join(dir, "child.mjs")],
          { encoding: "utf8", env: { ...process.env, ...env }, cwd: fileURLToPath(REPO), maxBuffer: 64 * 1024 * 1024 },
        );
      const a = run({});
      const b = run({ TZ: "Asia/Kolkata", LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" });
      expect(a.length).toBeGreaterThan(1000);
      expect(b).toBe(a);
      expect(a).toBe(Buffer.from(pinnedRender().png).toString("base64"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});
