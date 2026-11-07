#!/usr/bin/env node
/**
 * Regenerate the frames the landing page shows, into `docs/landing/`.
 *
 *   npm run capture:landing                        # everything
 *   npm run capture:landing -- --only=galaxy,road  # shots whose id starts so
 *   npm run capture:landing -- --only=film         # just the film poster
 *
 * WHY THIS EXISTS, BESIDE `npm run capture`. `docs/thumbs/` and
 * `docs/manual-assets/` photograph each page as it opens, control panel and
 * all, because the manual is about the panel. The landing page is about the
 * RESULT, and a panel over a third of the frame is a third of the frame not
 * showing it. So this hides the chrome, picks a pose chosen for someone who
 * has never heard of procedural generation, and writes WebP on a size budget.
 * Run this rather than `npm run capture` when only these frames are wanted:
 * that one overwrites the README's and the manual's images.
 *
 * THE POSES ARE DATA, in SHOTS below. Change one and rerun; never retouch an
 * output. How a pose is held differs per page, because each exposes a
 * different hook, and each entry's comment says which one it uses and why.
 *
 * ALWAYS A FRESH BUILD. Every run does `npm run build` and then a production
 * vite build of the pages into its own directory, and there is deliberately no
 * flag to skip either: the pages import `pcg-ts` from `dist/`, so a stale
 * bundle photographs stale geometry and nothing about the frame says so.
 *
 * WHAT IT WAITS FOR: the three gates `scripts/capture-demos.mjs` explains at
 * length, from the shared `scripts/lib/capture.mjs` — the tab is painting,
 * the page's own readouts say the cook is done, the picture has stopped
 * moving. Two more, specific to a frame with no chrome in it:
 *   - THE CHROME REALLY IS GONE. A stylesheet hides what HIDE names, and then
 *     the page is asked for any element still showing text. A renamed class
 *     would otherwise put a panel back into the frames with nobody told.
 *   - IT IS NOT BLANK. The same luma guard as the JPEG encoder, plus each
 *     shot's budget: quality steps down until the file fits, and a shot that
 *     cannot fit at quality 0.5 fails by name rather than shipping oversized.
 *
 * THE FILM POSTER is cut from render footage that lives in the private repo,
 * not here, so the step is skipped with a message when that path is absent;
 * the committed `docs/landing/film-poster.webp` stays as it was. It is a frame
 * of `footage/2.3.mp4`, which is silent. Never cut one from `previs/output`:
 * those files carry a licensed music track. No mp4 is ever copied into this
 * repository; ffmpeg writes one PNG to the build directory and that is what
 * gets encoded. To redo it by hand:
 *
 *   ffmpeg -ss <POSTER.at> -i <POSTER.source> -frames:v 1 -update 1 poster.png
 *
 * Headed browser and deviceScaleFactor 2, for the reasons capture-demos records.
 * Ports: nothing listens on a fixed one. `serveDir` binds a free loopback port
 * inside this process and closes it on exit, so nothing is left running.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCaptureSite,
  frameCounterScript,
  launchCaptureBrowser,
  serveDir,
  sleep,
  waitForStableFrame,
} from "./lib/capture.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Its own build directory: each build empties its output, so sharing one would
// let another capture script delete this site from under a run.
const SITE_DIR = join(ROOT, "node_modules", ".cache", "pcg-capture-landing");
const OUT_DIR = join(ROOT, "docs", "landing");
const DEBUG = process.argv.includes("--debug");

/** A tile: shown up to about 590 CSS px wide, so 1280 covers a 2x screen. */
const TILE = { css: [1280, 720], out: [1280, 720], maxKB: 120 };

/** Everything on a demo page that is not the scene. */
const HIDE = [
  ".pcg-overlay", // the control panel, its readouts and the graph thumbnail
  ".pcg-wordmark",
  ".pcg-graph-panel",
  ".pcg07-card", // galaxy's selected-star card
  ".pcg09-hud", // gpu-world's what-is-happening strip
].join(", ");

/**
 * The shots. Per shot:
 *   id          the file name
 *   path        the page and its query; a query is the first choice of hook
 *   ready       the page's own readouts, as in capture-demos.mjs: `s` is label
 *               -> value lower-cased, `has` is false for a value not yet written
 *   setup       steps run before `ready`: stop what moves, set the page's own
 *               sliders
 *   pose        steps run after `ready`, for gestures that want a cooked page;
 *               `ready` is asked again afterwards, since a move can start a stream
 *   clip        [x, y, w, h] in CSS px, for a page with no camera hook whose
 *               framing has dead sky in it. Captured at 2x, so this is a crop
 *               with detail to spare and not an upscale
 *   dpr         deviceScaleFactor if not 2
 *   animated    never pixel-stable, so settle on its counters plateauing
 *   chrome      keep the page's UI
 *   settleClip  the region compared for stability, if not the whole viewport
 *   settleMs    wait this long instead of comparing frames, for a picture that
 *               is still but never pixel-identical
 *   quality     where the budget search starts
 * plus the size fields of TILE.
 *
 * A step is a milliseconds number, {page: fn} (run in the page and awaited),
 * {until: fn} (poll in the page), {wheel, at, n}, {drag: [x0, y0, x1, y1],
 * button}, {key, ms} or {move: [x, y]}. Viewports are set before navigation, so
 * a gesture's coordinates mean the same thing on every run.
 *
 * WHAT A GESTURE OR A HOLD DOES NOT PROMISE. `?cam=` and `seek()` are exact. A
 * key held for 1500 ms and a flight stopped after 16 s are only as repeatable as
 * the frame clock, so galaxy and cave land near their pose rather than on it:
 * look at those two after a rerun.
 */
const SHOTS = [
  {
    // No camera hook, and the page's camera tilts down from 26 u with the top
    // sixth of the frame black, so the crop takes that off. The largest gen
    // radius is what puts rocks on the horizon rather than stopping short of it.
    ...TILE,
    id: "infinite-world",
    path: "demos/infinite-world/",
    clip: [120, 100, 1040, 585],
    setup: [
      { until: () => !!window.__capRow("speed") },
      {
        page: () => {
          window.setRangeByLabel("speed", 0);
          window.setRangeByLabel("gen radius", 240);
        },
      },
      3000,
    ],
    ready: (s, has) =>
      has(s["adapter"]) &&
      !/requesting/i.test(s["adapter"]) &&
      s["pending"] === "0" &&
      has(s["instances"]) &&
      s["instances"] !== "0",
  },
  {
    // The cruise sits inside the disc, where the arms are too close to read as
    // arms. W stops the cruise, E rises until the whole spiral is in frame, and
    // the drag re-centres the core. Gen radius 640 streams stars out to the rim
    // and brightness 2.2 is what keeps them from going to dust in a tile.
    ...TILE,
    id: "galaxy",
    path: "demos/galaxy/",
    animated: true,
    setup: [
      { until: () => !!window.__capRow("brightness") },
      { key: "KeyW", ms: 50 },
      {
        page: () => {
          window.setRangeByLabel("brightness", 2.2);
          window.setRangeByLabel("gen radius", 640);
        },
      },
    ],
    ready: (s, has) => s["pending"] === "0" && has(s["stars"]) && s["stars"] !== "0",
    pose: [500, { key: "KeyE", ms: 1500 }, { drag: [640, 300, 640, 370] }, 3000],
  },
  {
    // Same camera problem as infinite-world, same answer. 240 per cell, not the
    // slider's 600: at 600 the spires merge into a carpet and stop being things.
    ...TILE,
    id: "gpu-world",
    path: "demos/gpu-world/",
    clip: [176, 198, 928, 522],
    setup: [
      { until: () => !!window.__capRow("autopilot") },
      {
        page: () => {
          window.setCheckboxByLabel("autopilot", false);
          window.setRangeByLabel("speed", 0);
          window.setRangeByLabel("gen radius", 260);
          window.setRangeByLabel("per cell", 240);
        },
      },
      3000,
    ],
    ready: (s, has) =>
      !!window.pcgWorld &&
      window.pcgWorld.probe().meshes > 0 &&
      has(s["status"]) &&
      !/initialising/i.test(s["status"]),
  },
  {
    // Station 2900 (world units) is a straight with the placement rules' big
    // silhouettes on both skylines, the one stretch of the lap where the driven
    // view reads as a road through a place. The map overlay is off: over this
    // page's translucent fill it is a second picture fighting the first.
    ...TILE,
    id: "racetrack",
    path: "demos/racetrack/",
    setup: [
      { until: () => !!window.pcgRacetrack },
      {
        page: () => {
          window.pcgRacetrack.pause(true);
          window.setCheckboxByLabel("map overlay", false);
        },
      },
    ],
    ready: (s, has) =>
      has(s["dressing"]) &&
      has(s["enclosure"]) &&
      has(s["corner language"]) &&
      !/cooking the lap/i.test(s["dressing"]) &&
      !/cooking the lap/i.test(s["enclosure"]),
    pose: [{ page: () => window.pcgRacetrack.seek(2900) }],
  },
  {
    // The map overlay stays ON here: the page draws one-pixel lines on black, and
    // the whole lap ringing the driven view is what gives the frame a subject.
    // dpr 1 because 2x resampled to 1x takes those lines to half brightness.
    ...TILE,
    id: "road",
    path: "demos/road/",
    dpr: 1,
    setup: [
      { until: () => !!window.pcgRoad },
      {
        page: () => {
          window.pcgRoad.seek(250);
          window.pcgRoad.pause(true);
        },
      },
    ],
    ready: (s, has) => has(s["dressing"]) && has(s["lap length"]),
  },
  {
    // The probe only pauses, so the pose is how far the flight got: 16 s from
    // the start lands in an enclosed chamber with a recess behind it. A radius
    // of 72 and lattice of 0.7 fill in the black beyond the default's reach and
    // smooth the facets that make the default read as crumpled paper.
    ...TILE,
    id: "cave",
    path: "demos/cave/",
    setup: [
      { until: () => !!window.pcgCave && !!window.__capRow("radius") },
      {
        page: () => {
          window.setRangeByLabel("radius", 72);
          window.setRangeByLabel("lattice", 0.7);
        },
      },
      16000,
      { page: () => window.pcgCave.pause(true) },
    ],
    ready: (s, has) => s["pending"] === "0" && has(s["triangles"]) && s["triangles"] !== "0",
  },
  {
    // The default 6,000, wheeled in until the hills fill the frame; the clip takes
    // off the sky above them. More lanterns reads better and cannot ship: this
    // many saturated edges is the worst case for a lossy codec, and 12,000 is
    // 154 KB at quality 0.5 against a budget of 120.
    ...TILE,
    id: "lanterns",
    path: "demos/lanterns/",
    clip: [80, 90, 1120, 630],
    setup: [{ until: () => !!window.__capRow("pause") }, { page: () => window.setCheckboxByLabel("pause", true) }],
    ready: (s, has) => has(s["cook"]),
    pose: [{ wheel: -240, n: 7 }],
  },
  {
    // Step 24 of the build: hollow walls, a chimney, the roof still to come, so
    // it reads as being built. `?still` stops the clock and the orbit; the wheel
    // and the pan bring the house up to fill the frame.
    ...TILE,
    id: "brick-build",
    path: "demos/brick-build/?still&step=24",
    ready: (s, has) => document.body.dataset.ready === "1" && has(s["bricks"]),
    pose: [{ wheel: -240, n: 3 }, 500, { drag: [640, 420, 640, 300], button: "right" }],
  },
  {
    // The riveted depth, close enough that the legs and both floors fill the
    // height, which costs the top of the tower; shot whole, the tower is a thin
    // upright in a wide frame and two thirds of the tile is paper. The sun is
    // side-on, so the shadow falls to the right of frame. Default look.
    ...TILE,
    id: "eiffel",
    path: "demos/eiffel/?still&rivets&cam=125,45,135,0,45,0&fov=50",
    ready: (s, has) =>
      document.body.dataset.ready === "failed" ||
      (document.body.dataset.ready === "1" && has(s["total triangles"]) && s["total triangles"] !== "0"),
    failed: () => document.body.dataset.ready === "failed",
  },
  {
    // The editor as it is used: scene and graph up together, the graph's curated
    // knobs in the panel. `fit` lays this graph's 34 boxes straight across the
    // islands, so the two layers are pulled apart. A gesture on empty canvas
    // reaches the SCENE (zoom in, lift it to the upper right); one that lands on a
    // node reaches the GRAPH (zoom a notch, drop it below the islands). The layout
    // is 1600x900 CSS resampled UP to 1920, which is 1.2x on all the text.
    id: "editor",
    path: "editor/?graph=examples-archipelago",
    css: [1600, 900],
    out: [1920, 1080],
    maxKB: 250,
    chrome: true,
    // After the camera moves, frames 600 ms apart stay 109 dB apart indefinitely:
    // still to the eye, never identical, so a hash comparison cannot pass. `ready`
    // has already seen the cook finish.
    settleMs: 3000,
    ready: () => {
      const status = document.querySelector(".toolbar .status");
      return !!status && /hash [0-9a-f]{8}/i.test(status.textContent || "") && !document.querySelector(".toast");
    },
    pose: [
      800,
      { wheel: -187, at: [800, 850], n: 3 },
      300,
      { drag: [800, 850, 880, 680], button: "right" },
      500,
      { wheel: -187, at: [848, 500], n: 1 },
      500,
      { drag: [848, 500, 800, 760], button: "right" },
      { move: [1590, 90] },
      500,
    ],
  },
];

/** The film poster: one frame of silent render footage. See the file header. */
const POSTER = {
  id: "film-poster",
  source: "D:/Projects/JS/pcg-ts-private/video/eiffel-film/footage/2.3.mp4",
  // The same moment as the film's YouTube thumbnail, 0:28.61 of the cut, without
  // the title card and overlays, which are burned in over the footage: the first
  // floor's arch, close enough to read the rivets and the names on the frieze.
  at: 3.41,
  out: [1920, 1080],
  // Every rivet costs bytes: 266 KB at quality 0.5, and that quality smears them.
  maxKB: 400,
};

/** Installed before the page's scripts; reads the page's own instrumentation. */
function pageInstrumentation() {
  const text = (el) => (el && el.textContent ? el.textContent.trim() : "");
  window.__capStats = () => {
    const out = {};
    for (const row of document.querySelectorAll(".pcg-overlay .pcg-stat")) {
      const spans = row.querySelectorAll("span");
      if (spans.length >= 2) out[text(spans[0]).toLowerCase()] = text(spans[1]);
    }
    return out;
  };
  window.__capRow = (label) => {
    for (const row of document.querySelectorAll(".pcg-overlay .pcg-row")) {
      const l = row.querySelector("label");
      if (l && text(l).toLowerCase().startsWith(label.toLowerCase())) return row;
    }
    return null;
  };
  window.setRangeByLabel = (label, value) => {
    const input = window.__capRow(label)?.querySelector('input[type="range"]');
    if (!input) throw new Error(`no range control labelled "${label}"`);
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  window.setCheckboxByLabel = (label, checked) => {
    const input = window.__capRow(label)?.querySelector('input[type="checkbox"]');
    if (!input) throw new Error(`no checkbox labelled "${label}"`);
    if (input.checked !== checked) input.click();
    return true;
  };
}

/** Injected on a new document, so it has to wait for one to exist. */
function hideChrome(selectors) {
  const add = () => {
    const style = document.createElement("style");
    style.textContent = `${selectors} { display: none !important; }`;
    (document.head ?? document.documentElement).appendChild(style);
  };
  if (document.head ?? document.documentElement) add();
  else document.addEventListener("DOMContentLoaded", add, { once: true });
}

/**
 * Anything still showing text after the stylesheet: an element with a text
 * node of its own and a nonzero box. Nothing on a chrome-free frame should have
 * one, so a hit means a class was renamed or a page grew a new readout.
 */
function visibleText() {
  const hits = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.opacity === "0") continue;
    hits.push(`${el.tagName.toLowerCase()}.${el.className}: ${el.textContent.trim().slice(0, 40)}`);
  }
  return hits;
}

/** Poll a predicate in the page; it is shipped as source and rebuilt there. */
function waitFor(page, predicate, timeout) {
  return page.waitForFunction(
    (src) => {
      const fn = new Function(`return (${src})`)();
      const has = (v) => !!v && v !== "–" && v !== "-";
      try {
        return !!fn(window.__capStats(), has);
      } catch {
        return false;
      }
    },
    { timeout, polling: 250 },
    predicate.toString(),
  );
}

/**
 * Resample to `out`, guard against a blank frame, and step the WebP quality
 * down until it fits. Runs in a parked page, as encodeJpeg does.
 */
async function encodeWebp(encPage, png, shot) {
  const r = await encPage.evaluate(
    async (b64, [w, h], maxBytes, start) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bin], { type: "image/png" }));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();

      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      const tones = new Set();
      for (let i = 0; i < data.length; i += 4 * 13) {
        const l = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        sum += l;
        sumSq += l * l;
        n++;
        tones.add(Math.round(l));
      }
      const sd = Math.sqrt(Math.max(0, sumSq / n - (sum / n) ** 2));

      let quality = start;
      let blob = await canvas.convertToBlob({ type: "image/webp", quality });
      while (blob.size > maxBytes && quality > 0.5) {
        quality = Math.round((quality - 0.04) * 100) / 100;
        blob = await canvas.convertToBlob({ type: "image/webp", quality });
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return { webp: btoa(s), type: blob.type, size: blob.size, quality, sd, tones: tones.size };
    },
    png.toString("base64"),
    shot.out,
    shot.maxKB * 1000,
    shot.quality ?? 0.86,
  );
  if (r.type !== "image/webp") throw new Error(`${shot.id}: this browser encoded ${r.type}, not WebP`);
  if (r.sd < 3 || r.tones < 40) {
    throw new Error(`${shot.id}: render looks blank (luma sd ${r.sd.toFixed(1)}, ${r.tones} tones)`);
  }
  if (r.size > shot.maxKB * 1000) {
    throw new Error(`${shot.id}: ${(r.size / 1000).toFixed(0)} KB at quality ${r.quality}, over its ${shot.maxKB} KB budget`);
  }
  return { buffer: Buffer.from(r.webp, "base64"), quality: r.quality };
}

/** Play a shot's `setup` or `pose`. See the comment on SHOTS for the vocabulary. */
async function runSteps(page, steps = [], shot) {
  for (const step of steps) {
    if (typeof step === "number") {
      await sleep(step);
    } else if (step.page) {
      await page.evaluate(step.page);
    } else if (step.until) {
      await waitFor(page, step.until, 60_000);
    } else if (step.key) {
      await page.keyboard.down(step.key);
      await sleep(step.ms ?? 50);
      await page.keyboard.up(step.key);
    } else if (step.move) {
      await page.mouse.move(...step.move);
    } else if (step.wheel) {
      await page.mouse.move(...(step.at ?? [shot.css[0] / 2, shot.css[1] / 2]));
      for (let i = 0; i < (step.n ?? 1); i++) {
        await page.mouse.wheel({ deltaY: step.wheel });
        await sleep(60);
      }
    } else if (step.drag) {
      const [x0, y0, x1, y1] = step.drag;
      const button = step.button ?? "left";
      await page.mouse.move(x0, y0);
      await page.mouse.down({ button });
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
        await sleep(30);
      }
      await page.mouse.up({ button });
    } else {
      throw new Error(`${shot.id}: unknown step ${JSON.stringify(step)}`);
    }
  }
}

async function captureShot(browser, encPage, origin, shot, log) {
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
    if (!shot.chrome) await page.evaluateOnNewDocument(hideChrome, HIDE);
    // Set BEFORE the navigation: a page places its camera once, against the
    // viewport in effect when it loads.
    const [w, h] = shot.css;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: shot.dpr ?? 2 });
    await page.bringToFront();
    await page.goto(`${origin}/${shot.path}`, { waitUntil: "load" });

    await page.waitForFunction(() => window.__capFrames > 3, { timeout: 20_000 });
    await runSteps(page, shot.setup, shot);
    await waitFor(page, shot.ready, 180_000);
    if (shot.failed && (await page.evaluate(shot.failed))) {
      throw new Error(`the page reports that its cook failed. Open ${shot.path} and read its problems section.`);
    }
    if (shot.pose) {
      await runSteps(page, shot.pose, shot);
      await waitFor(page, shot.ready, 180_000);
    }

    if (!shot.chrome) {
      const left = await page.evaluate(visibleText);
      if (left.length) {
        throw new Error(`text still showing, so HIDE has gone stale: ${left.slice(0, 4).join(" | ")}`);
      }
    }

    const signal = async () => {
      const stats = await page.evaluate(() => window.__capStats());
      for (const k of ["fps", "cook", "position", "last update", "churn per second", "device dispatches"]) delete stats[k];
      return JSON.stringify(stats);
    };
    const clip = shot.settleClip ?? { x: 0, y: 0, width: w, height: h };
    let stability;
    if (shot.settleMs) {
      await sleep(shot.settleMs);
      stability = { criterion: `a ${shot.settleMs} ms wait` };
    } else {
      stability = await waitForStableFrame(page, {
        clip,
        // A page with no overlay has no counters: a constant signal would read
        // as a plateau over a picture still moving, so it settles on pixels alone.
        signal: shot.chrome ? undefined : signal,
        acceptPixels: shot.animated !== true,
        debug: DEBUG,
        log,
      });
    }

    const png = await page.screenshot({
      type: "png",
      ...(shot.clip
        ? { clip: { x: shot.clip[0], y: shot.clip[1], width: shot.clip[2], height: shot.clip[3] } }
        : {}),
    });
    if (errors.length) throw new Error(`page reported ${errors.length} error(s): ${errors.slice(0, 3).join(" | ")}`);
    await page.close();

    const webp = await encodeWebp(encPage, Buffer.from(png), shot);
    await writeFile(join(OUT_DIR, `${shot.id}.webp`), webp.buffer);
    return { ...webp, stability };
  } finally {
    if (!page.isClosed()) await page.close().catch(() => {});
  }
}

/** One frame of the footage, or a message and nothing when it is not here. */
async function capturePoster(encPage, log) {
  if (!existsSync(POSTER.source)) {
    log(`${POSTER.id}: SKIPPED, ${POSTER.source} is not on this machine; the committed frame stays as it was`);
    return;
  }
  const png = join(SITE_DIR, `${POSTER.id}.png`);
  const run = spawnSync(
    "ffmpeg",
    ["-y", "-v", "error", "-ss", String(POSTER.at), "-i", POSTER.source, "-frames:v", "1", "-update", "1", png],
    { encoding: "utf8" },
  );
  if (run.error || run.status !== 0) throw new Error(`ffmpeg failed: ${run.error?.message ?? run.stderr}`);
  const webp = await encodeWebp(encPage, await readFile(png), POSTER);
  await writeFile(join(OUT_DIR, `${POSTER.id}.webp`), webp.buffer);
  log(`${POSTER.id}: ok  ${(webp.buffer.length / 1000).toFixed(0)} KB at quality ${webp.quality}  ·  t=${POSTER.at}s of the footage`);
}

/** The library, then the pages. There is no flag for skipping either. */
function buildFresh(log) {
  log("building the library (npm run build)…");
  const lib = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (lib.status !== 0) throw new Error("npm run build failed");
  log("building the pages (vite, production)…");
  return buildCaptureSite({ root: ROOT, outDir: SITE_DIR });
}

async function main() {
  const started = Date.now();
  const log = (m) => process.stdout.write(`${m}\n`);
  const only = process.argv
    .slice(2)
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const picked = (id) => !only || only.some((p) => id.startsWith(p));
  const shots = SHOTS.filter((s) => picked(s.id));
  const poster = picked(POSTER.id);
  if (!shots.length && !poster) {
    throw new Error(`--only=${only.join(",")} matched nothing. Known: ${[...SHOTS, POSTER].map((s) => s.id).join(", ")}`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await buildFresh(log);

  const { server, port } = await serveDir(SITE_DIR);
  const origin = `http://127.0.0.1:${port}`;

  // The window must be at least as large as the emulated viewport, or the part
  // outside it is never painted.
  const widest = Math.max(1280, ...shots.map((s) => s.css[0]));
  const tallest = Math.max(720, ...shots.map((s) => s.css[1]));
  const browser = await launchCaptureBrowser({ width: widest + 100, height: tallest + 180 });
  const encPage = await browser.newPage();
  await encPage.goto("about:blank");

  const failures = [];
  try {
    for (const shot of shots) {
      const t0 = Date.now();
      try {
        const r = await captureShot(browser, encPage, origin, shot, log);
        log(
          `${shot.id}: ok  ${shot.out[0]}x${shot.out[1]} ${(r.buffer.length / 1000).toFixed(0)} KB at quality ${r.quality}` +
            `  ·  stable via ${r.stability.criterion}  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
        );
      } catch (err) {
        failures.push({ id: shot.id, message: err.message });
        log(`${shot.id}: FAILED  ${err.message}`);
      }
    }
    if (poster) {
      try {
        await capturePoster(encPage, log);
      } catch (err) {
        failures.push({ id: POSTER.id, message: err.message });
        log(`${POSTER.id}: FAILED  ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  log(`\nfull run ${((Date.now() - started) / 1000).toFixed(0)}s, output in ${OUT_DIR}`);
  if (failures.length) {
    log(`${failures.length} shot(s) failed:`);
    for (const f of failures) log(`  - ${f.id}: ${f.message}`);
    process.exitCode = 1;
  }
}

await main();
