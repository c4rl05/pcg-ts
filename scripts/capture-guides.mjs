#!/usr/bin/env node
/**
 * Regenerate the screenshots the long-form guides under `docs/guides/` embed.
 *
 *   npm run capture:guides                        # every guide, every shot
 *   npm run capture:guides -- --only=eiffel       # one guide
 *   npm run capture:guides -- --only=eiffel/panel # the shots whose id starts "panel"
 *   npm run capture:guides -- --no-build          # reuse the last build
 *
 * Writes `docs/guides/<guide>/<shot id>.jpg`. Run `npm run build` first: the
 * pages import `pcg-ts` from `dist/`, so a stale `dist/` photographs stale
 * geometry.
 *
 * WHY THIS EXISTS. A guide's figures are close-ups at chosen poses and
 * chosen detail levels — a panel of one leg at three depths, the first
 * floor, the summit — not the one opening view `npm run capture` takes per
 * demo. They also go stale whenever a demo's lighting or materials change,
 * which is often, so they have to be a command rather than a session of
 * someone orbiting a camera. The poses are therefore DATA, at the top of
 * this file: change a pose there and rerun, never retouch an output.
 *
 * HOW A POSE IS HELD. The eiffel page reads `?cam=px,py,pz,tx,ty,tz` (eye,
 * then orbit target, in metres; y up, the tower's axis at x = z = 0) and
 * `?laced` / `?rivets` (rivets implies laced), so every shot is one URL and
 * nothing is driven with the mouse. Two limits of that hook shape the list:
 *   - The orbit keeps the eye above the ground (`groundPolar` in
 *     demos/eiffel/main.ts), so a shot may look up as well as down, but
 *     not from under the ground. Older shots predate that and take a "view
 *     up a leg" level from inside the tower.
 *   - Each shot is a fresh page load and therefore a fresh cook (about 1 s
 *     at the skeleton depth, 3-5 s laced or riveted on the capture machine),
 *     because the page exposes no handle to move the camera after loading.
 *
 * WHAT IT WAITS FOR — the same three gates as `scripts/capture-demos.mjs`,
 * whose header explains them at length, from the same shared machinery in
 * `scripts/lib/capture.mjs`:
 *   1. rAF liveness (`window.__capFrames` keeps rising — a backgrounded or
 *      occluded tab stops painting, and that fails loudly instead of
 *      producing a blank file);
 *   2. the page's own cook state: eiffel sets `data-ready="1"` on <body> two
 *      frames after the scene is complete (the first of those draws the
 *      shadow map), or `"failed"` when the cook threw, which ends the wait
 *      and fails the shot by name;
 *   3. a stable frame: consecutive byte-identical screenshots.
 * Then the 2x screenshot is resampled to the shot's `out` size and
 * JPEG-encoded in the browser, behind the shared blank-frame guard.
 *
 * THE CHROME. Guide figures show the scene, not the page, so the control
 * panel (`.pcg-overlay`) and the wordmark (`.pcg-wordmark`) are hidden with
 * an injected stylesheet unless a shot sets `ui: true`. If either class is
 * renamed the stylesheet stops matching and the chrome would silently appear
 * in the figures, so a shot that hides them first checks that both still
 * exist.
 *
 * Headed browser, deviceScaleFactor 2, the built site served from a local
 * static server rather than the vite dev server: all for the reasons
 * `scripts/capture-demos.mjs` records.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCaptureSite,
  encodeJpeg,
  frameCounterScript,
  launchCaptureBrowser,
  serveDir,
  waitForStableFrame,
} from "./lib/capture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Its own build directory, not `npm run capture`'s: each build empties its
// output first, so sharing one would let either script delete the other's
// site out from under a `--no-build` run.
const OUT_DIR = join(ROOT, "node_modules", ".cache", "pcg-capture-guides");
const GUIDES_DIR = join(ROOT, "docs", "guides");
const DEBUG = process.argv.includes("--debug");

/** Default JPEG quality. Shadowed lattice bands badly much below this. */
const QUALITY = 0.8;

/**
 * The shot lists, keyed by guide. Per guide: the page, how to tell its cook
 * is done, the CSS viewport every shot is laid out at (captured at 2x,
 * then resampled to the shot's `out`), and `always`, a query fragment every
 * shot of that guide carries — this is where a page is told to hold still,
 * since the stability gate below wants two identical frames and a page with
 * something moving in it never gives it two. Per shot: `id` (the file name),
 * `query` (everything after `?`), `out` (the JPEG's pixel size; the guides'
 * article column is 860 CSS px, so full-width figures are 1720 px wide),
 * optional `css` to lay that one shot out at another viewport (keep its
 * aspect equal to `out`'s), optional `ui: true` to keep the page chrome,
 * optional `quality`.
 *
 * Depths are the page's own query (demos/eiffel/depth.ts): the bare path
 * is the skeleton, `?laced` whole lacing and `?rivets` whole rivets.
 */
const GUIDES = {
  eiffel: {
    page: "demos/eiffel/",
    css: [1600, 900],
    // The six lift cars ride their runs on a clock; `?still` parks each one
    // where the graph built it, at the moment `lifts.ts` sources. Without
    // it no two frames of this page are ever the same and every shot below
    // would run out its stability samples.
    always: "still",
    ready: () =>
      document.body.dataset.ready === "failed" ||
      (document.body.dataset.ready === "1" &&
        window.__capStats()["Total triangles"] !== undefined &&
        !["–", "-", "0"].includes(window.__capStats()["Total triangles"])),
    failed: () => document.body.dataset.ready === "failed",
    shots: [
      // The whole tower, laced, three-quarter view from the +x+z quadrant,
      // in a taller 3:2 frame so it can fill about 90% of the height: the
      // flagpole's tip (312.3 m) and the front pedestal's foot each keep
      // about 5% of margin, and the shadow falls in frame to the right.
      // (The sun is the page's own, about 49 degrees up; a guide cannot move
      // it.) The target sits at 141 m, a little under mid-height, because
      // the eye is above it and the base comes nearer the camera than the top.
      {
        id: "hero",
        query: "laced&cam=300,155,394,0,141,0",
        css: [1500, 1000],
        out: [1720, 1146],
      },

      // One panel at the three depths, from ONE pose so the figures compare
      // member for member. The target is the centre of panel 2 (nodes XXVII
      // to XXVI, y 17.4-28.4) on the +z outer face of the +x+z leg — the
      // face the sun lights: x = (outer + inner) / 2 = 40.45 and z = outer =
      // 47.95 at y = 22.9 (spec.ts NODES). The eye is 11 m out along
      // (-0.25, 0.15, 0.96): a little toward the sun and a little above, so
      // the whole panel width — the X of the diagonals, the laced mid-panel
      // horizontal, the gusset plates where it lands on both uprights —
      // is in frame, and a 19 mm rivet head is still several pixels. One
      // quality for all three, so their compression compares too; 0.78
      // keeps the laced and riveted frames under 350 KB.
      { id: "panel-skeleton", query: "cam=37.7,24.55,58.5,40.45,22.9,47.95", out: [1720, 968], quality: 0.78 },
      { id: "panel-laced", query: "laced&cam=37.7,24.55,58.5,40.45,22.9,47.95", out: [1720, 968], quality: 0.78 },
      { id: "panel-rivets", query: "rivets&cam=37.7,24.55,58.5,40.45,22.9,47.95", out: [1720, 968], quality: 0.78 },

      // A node of the same face close up at the riveted depth: where the
      // node XXVII horizontal and the web bars land on the outer corner
      // upright (47, 17.4, 50.71), through one gusset plate, with the
      // upright's seam rivets beside it. Eye 9 m out along (-0.35, 0.2, 0.92).
      { id: "gusset-joint", query: "rivets&cam=43.85,19.2,58.99,47,17.4,50.71", out: [1720, 968] },

      // The rivets as the subject: 3 m from that node's gusset plate
      // (49.6, 17.4, 50.9), along (-0.30, 0.30, 0.91). In frame: the plate's
      // edge and its rows, the corner upright's two seam rows at their 125 mm
      // pitch (about 40 px apart here; a 19 mm-radius head is about 14 px),
      // and on the left the laced horizontal's chord angles with a rivet
      // wherever a lacing bar crosses them.
      { id: "rivets-close", query: "rivets&cam=48.7,18.3,53.6,49.6,17.4,50.9", out: [1720, 968] },

      // The first floor from the lit +z side, oblique from the -x corner:
      // the pavilions' arcade, the skirt with the gilded name plates, the
      // girders under it and the decorative arch between the two legs.
      { id: "first-floor", query: "laced&cam=-45,66,98,0,55,25", out: [1720, 968] },

      // The summit from the lit side (-x, +z): the 3rd-floor gallery, the
      // lantern's four lattice arches, the terraces and the flagpole, whose
      // top (312.3 m) the frame leaves room above.
      { id: "summit", query: "laced&cam=-32.2,300.9,52.1,0,291,0", out: [1720, 968] },

      // Into the +x+z leg from the tower's axis at 14 m, level (no pose can
      // look up; see the header): the leg's two inner faces, its curved
      // corner uprights and the masonry pedestal they stand on.
      { id: "leg-base", query: "laced&cam=5,14,5,40,12,40", out: [1720, 968] },

      // The shaft at the intermediate landing (y 195.93) from outside: the
      // laced shaft faces, and inside them the Edoux lift — the central
      // guide post with the cylinders and guides either side of it, up the
      // middle (lifts.ts) — the spiral stair, and the landing where
      // passengers changed cars.
      { id: "shaft-landing", query: "laced&cam=-20,205,32,0,196,0", out: [1720, 968] },

      // The page as it opens, chrome and all: the control panel's depth
      // choices (laced and rivets: off / streamed / whole), its controls,
      // the folded stats and the graph thumbnail. The opening pose, named so a change to it does not
      // reframe this figure.
      { id: "page-ui", query: "cam=360,140,470,0,110,0", out: [1720, 968], ui: true },
    ],
  },
};

/**
 * Installed before the page's own scripts. Reads the shared overlay's
 * readouts (`.pcg-stat` = <span>label</span><span>value</span>); a hidden
 * overlay still has its text, so this works with the chrome hidden too.
 */
function pageInstrumentation() {
  window.__capStats = () => {
    const out = {};
    for (const row of document.querySelectorAll(".pcg-overlay .pcg-stat")) {
      const spans = row.querySelectorAll("span");
      if (spans.length >= 2) out[spans[0].textContent.trim()] = spans[1].textContent.trim();
    }
    return out;
  };
}

/**
 * Hide the page chrome before it paints. The document does not exist yet
 * when `evaluateOnNewDocument` runs, hence the wait (see `hideGraphPanel` in
 * capture-demos.mjs, which learned it the hard way).
 */
function hideChrome() {
  const add = () => {
    const style = document.createElement("style");
    style.textContent = ".pcg-overlay, .pcg-wordmark { display: none !important; }";
    (document.head ?? document.documentElement).appendChild(style);
  };
  if (document.head ?? document.documentElement) add();
  else document.addEventListener("DOMContentLoaded", add, { once: true });
}

async function captureShot(browser, encPage, origin, guideId, guide, shot, log) {
  const errors = [];
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(180_000);
    page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error" || /Failed to load resource/i.test(m.text())) return;
      errors.push(`console: ${m.text()}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && !/favicon/i.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`);
    });
    await page.evaluateOnNewDocument(frameCounterScript);
    await page.evaluateOnNewDocument(pageInstrumentation);
    if (!shot.ui) await page.evaluateOnNewDocument(hideChrome);
    const [w, h] = shot.css ?? guide.css;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.bringToFront();
    const query = [guide.always, shot.query].filter(Boolean).join("&");
    await page.goto(`${origin}/${guide.page}?${query}`, { waitUntil: "load" });

    // (1) this tab is painting
    await page.waitForFunction(() => window.__capFrames > 3, { timeout: 20_000 });

    // (2) the page says its cook is done (or that it failed)
    await page.waitForFunction(guide.ready, { timeout: 180_000, polling: 250 });
    if (await page.evaluate(guide.failed)) {
      throw new Error(
        `the page reports that its cook failed. Open ${guide.page}?${query} and read its problems section.`,
      );
    }
    if (!shot.ui) {
      const missing = await page.evaluate(() =>
        [".pcg-overlay", ".pcg-wordmark"].filter((s) => !document.querySelector(s)),
      );
      if (missing.length) {
        throw new Error(
          `no element matches ${missing.join(", ")}: the chrome has been renamed, so the stylesheet ` +
            "that hides it no longer would. Fix the selectors in hideChrome().",
        );
      }
    }

    // (3) a stable frame. With the chrome hidden the whole viewport is the
    // scene; with it shown, the panel on the left (its fps readout ticks
    // every 500 ms) is left out of the comparison.
    const clip = shot.ui ? { x: 340, y: 0, width: w - 340, height: h } : { x: 0, y: 0, width: w, height: h };
    const stability = await waitForStableFrame(page, { clip, debug: DEBUG, log });

    const stats = await page.evaluate(() => window.__capStats());
    const raw = await page.screenshot({ type: "png" });
    if (errors.length) {
      throw new Error(`page reported ${errors.length} error(s): ${errors.slice(0, 3).join(" | ")}`);
    }
    await page.close();

    const jpeg = await encodeJpeg(encPage, raw.toString("base64"), shot.out, shot.quality ?? QUALITY);
    const dir = join(GUIDES_DIR, guideId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${shot.id}.jpg`), jpeg.buffer);
    return { stability, stats, jpeg };
  } finally {
    if (!page.isClosed()) await page.close().catch(() => {});
  }
}

async function main() {
  const args = process.argv.slice(2);
  const only = args
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const noBuild = args.includes("--no-build");

  // A pattern matches `<guide>/<shot id>` or the bare shot id by prefix,
  // so `eiffel`, `eiffel/panel` and `panel` all select something useful.
  const selected = [];
  for (const [guideId, guide] of Object.entries(GUIDES)) {
    for (const shot of guide.shots) {
      const key = `${guideId}/${shot.id}`;
      if (!only || only.some((p) => key.startsWith(p) || shot.id.startsWith(p))) {
        selected.push({ guideId, guide, shot });
      }
    }
  }
  if (!selected.length) {
    const known = Object.entries(GUIDES).flatMap(([g, d]) => d.shots.map((s) => `${g}/${s.id}`));
    throw new Error(`--only=${only?.join(",")} matched no shot. Known shots: ${known.join(", ")}`);
  }

  const log = (m) => process.stdout.write(`${m}\n`);

  if (!noBuild) {
    log("building pages (vite, production)…");
    await buildCaptureSite({ root: ROOT, outDir: OUT_DIR });
  } else if (!existsSync(OUT_DIR)) {
    throw new Error(`--no-build but ${OUT_DIR} does not exist; run once without it`);
  }

  const { server, port } = await serveDir(OUT_DIR);
  const origin = `http://127.0.0.1:${port}`;
  log(`serving ${OUT_DIR} at ${origin}`);

  // The window must be at least as large as the emulated viewport, or the
  // part outside it is never painted.
  const widest = Math.max(...selected.map((s) => (s.shot.css ?? s.guide.css)[0]));
  const tallest = Math.max(...selected.map((s) => (s.shot.css ?? s.guide.css)[1]));
  const browser = await launchCaptureBrowser({ width: widest + 100, height: tallest + 180 });

  // A parked page used only to resample and JPEG-encode.
  const encPage = await browser.newPage();
  await encPage.goto("about:blank");

  const failures = [];
  try {
    for (const { guideId, guide, shot } of selected) {
      const t0 = Date.now();
      const key = `${guideId}/${shot.id}`;
      try {
        const r = await captureShot(browser, encPage, origin, guideId, guide, shot, log);
        const s = r.stats;
        log(
          `${key}: ok  ${shot.out[0]}x${shot.out[1]} ${(r.jpeg.buffer.length / 1024).toFixed(0)} KB` +
            `  ·  triangles ${s["Total triangles"] ?? "?"}${s["Rivets"] ? `, rivets ${s["Rivets"]}` : ""}` +
            `  ·  stable via ${r.stability.criterion} in ${(r.stability.elapsed / 1000).toFixed(1)}s` +
            `  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s total`,
        );
      } catch (err) {
        failures.push({ key, message: err.message });
        log(`${key}: FAILED  ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    log(`\n${failures.length} shot(s) failed:`);
    for (const f of failures) log(`  - ${f.key}: ${f.message}`);
    process.exitCode = 1;
    return;
  }
  log(`\ncaptured ${selected.length} shot(s) into ${GUIDES_DIR}`);
}

await main();
