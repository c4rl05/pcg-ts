/**
 * PNG frames of a cooked collection, with no browser: the `pcg render
 * --out frame.png` path.
 *
 * The frames answer PLACEMENT and SHAPE — where things stand, how big, which
 * way up, whether the camera at eye height sees a bald patch — with unlit
 * proxies over flat-shaded surfaces. The look (materials, light, shadows,
 * the assets themselves) stays with the host and with `npm run preview`.
 *
 * Deterministic to the byte, on every platform: the poses, the rasterizer,
 * the scene and the encoder use only arithmetic IEEE 754 rounds the same
 * everywhere (see `raster/views.ts`), and the PNG carries no timestamp.
 *
 * Internal in v1: the command is the surface. Not re-exported from
 * `pcg-ts/cli`, so its options can still move.
 */
import type { DataCollection } from "../index.js";
import { CliError } from "./errors.js";
import { drawLabel } from "./raster/font.js";
import { encodePng, pixelHash } from "./raster/png.js";
import { type Camera, Raster, makeCamera } from "./raster/raster.js";
import {
  type LegendEntry,
  type SceneCounts,
  buildScene,
  drawScene,
  gridHeight,
  surfaceYAt,
} from "./raster/scene.js";
import {
  type Pose,
  type Vec3,
  type ViewName,
  FOV_Y_DEGREES,
  VIEW_NAMES,
  frameBounds,
  posesFor,
} from "./raster/views.js";
import type { ColorDomain } from "./render.js";

/** A single view, or all four tiled. */
export type PngView = ViewName | "sheet";

/** Every value `view` accepts, in the order help text lists them. */
export const PNG_VIEWS: readonly PngView[] = [...VIEW_NAMES, "sheet"];

/** Default image sizes: a sheet of four tiles, or one view. */
export const SHEET_SIZE = { width: 1280, height: 960 } as const;
export const SINGLE_SIZE = { width: 960, height: 720 } as const;
/** Longest edge a sheet may have; a single view may have up to {@link MAX_SINGLE_EDGE}. */
export const MAX_SHEET_EDGE = 1280;
export const MAX_SINGLE_EDGE = 4096;
/** Smallest edge of one tile. */
export const MIN_EDGE = 16;

/** Background of every view; perspective fog fades to it. */
const BACKGROUND = 0xf4f6f9;
/** The line between sheet tiles. */
const SEPARATOR = 0x9aa3ad;
/** Sheet order, row-major: what reads as a place first, then the plans. */
const SHEET: readonly ViewName[] = ["hero", "ground", "top", "side"];
/** Views that mark instance apexes, and views that draw the ground grid. */
const MARKER_VIEWS: readonly ViewName[] = ["top", "side", "hero"];
const GRID_VIEWS: readonly ViewName[] = ["hero", "ground"];
/** Tile labels: white on a dark box. */
const LABEL_TEXT = 0xffffff;
const LABEL_BOX = 0x2b3440;

/** The drawing conventions, in the words every report uses. */
export const INSTANCE_DRAWING =
  "instances are upright square-pyramid proxies (base 0.4, height 1) through each instance's 4x4, not the assets; top, side and hero also mark each apex with a cross";
export const POINT_DRAWING = "points are small squares, drawn only for geometry whose faces or lines drew nothing unless --points";
export const GRID_DRAWING =
  "hero and ground add a ground grid just under the content's lowest point, drawn only where nothing else is";
export const LABEL_DRAWING = "each tile carries a corner label naming its view and axis directions";

/** Knobs for {@link renderPng}; every one has a deterministic default. */
export interface RenderPngOptions {
  /** Default `sheet`. */
  readonly view?: PngView;
  /** Image size; defaults to {@link SHEET_SIZE} for a sheet, {@link SINGLE_SIZE} otherwise. */
  readonly width?: number;
  readonly height?: number;
  /** Pin the framing extent instead of deriving it from the content. */
  readonly extent?: number;
  /** Ground-camera eye height above the surface under it (default 1.7). */
  readonly eye?: number;
  /** Draw points even for geometry whose topology drew. */
  readonly points?: boolean;
  /** Colour by this attribute, exactly as the SVG does. */
  readonly attr?: string;
  readonly attrDomain?: ColorDomain;
  /** Cap on drawn points plus instances (default 200000). */
  readonly maxPoints?: number;
  /** Cap on drawn primitives (default 2000000). */
  readonly maxPrimitives?: number;
  /**
   * The declared output each collection item came from, in order. Default
   * colours are categorical by this name; without it every item is "item".
   */
  readonly outputs?: readonly string[];
  /**
   * The ground grid in the perspective views (default true). A switch for
   * tests that compare a frame with and without it; the command line has
   * no flag for it.
   */
  readonly grid?: boolean;
}

/** One drawn view, as the report states it. */
export interface PngViewReport {
  readonly name: ViewName;
  /** The label drawn in the tile's corner. */
  readonly label: string;
  readonly projection: "orthographic" | "perspective";
  readonly position: Vec3;
  readonly target: Vec3;
  readonly up: Vec3;
  /** Perspective: vertical field of view in degrees. */
  readonly fovY?: number;
  /** Orthographic: world units covered by half the shorter tile side. */
  readonly halfSize?: number;
  /** Where the view sits in the image, in pixels. */
  readonly tile: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

/** What a PNG render drew, for the command's report. */
export interface RenderPngResult {
  readonly png: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly view: PngView;
  readonly views: readonly PngViewReport[];
  readonly framing: {
    readonly extent: number;
    readonly pinned: boolean;
    /** The extent the content alone frames at; differs from `extent` only when pinned. */
    readonly autoExtent: number;
    readonly eye: number;
    readonly groundY: number;
    readonly centre: Vec3;
    /** World box of everything drawable; absent for an empty scene. */
    readonly bounds?: { readonly min: Vec3; readonly max: Vec3 };
  };
  readonly counts: SceneCounts;
  readonly legend: readonly LegendEntry[];
  readonly colorAttr?: string;
  readonly colorDomains?: readonly ColorDomain[];
  /**
   * What the marks in the picture ARE, stated rather than left to be
   * guessed from pixels: the frames draw proxies and helpers that are not
   * in the data, and a reader who does not know that reads them as data.
   */
  readonly drawing: {
    readonly instances: string;
    /** Views that mark each instance's apex with a cross. */
    readonly markerViews: readonly ViewName[];
    readonly points: string;
    readonly grid: { readonly views: readonly ViewName[]; readonly y: number; readonly note: string };
    readonly labels: string;
  };
  /** Present when the ground view was drawn. */
  readonly groundView?: GroundViewReport;
  /** 16 hex over the pixels and size — equal hashes, equal pictures. */
  readonly pixelHash: string;
}

/** How much of the ground view is surface close to the eye; see `measureGroundView`. */
export interface GroundViewReport {
  /** The distance "near" means: four eye heights, at least 5% of the framing extent. */
  readonly nearDistance: number;
  /** Fraction of the frame (sampled) covered by something nearer than `nearDistance`, flat ground included. */
  readonly nearFraction: number;
  /**
   * Of the samples flat ground at the eye's feet would leave open past
   * `nearDistance` (plus any within one eye height), the fraction something
   * nearer blocks. 0 for a flat plane at any extent.
   */
  readonly blockedFraction: number;
  /** Median depth over the sampled frame; null when most of it is background. */
  readonly medianDepth: number | null;
  /** `blockedFraction` above 0.2: the frame shows what the eye stands against, not the scene. */
  readonly occluded: boolean;
}

function checkOptions(opts: RenderPngOptions, sheet: boolean): void {
  const bad = (name: string, expected: string, got: unknown): never => {
    throw new CliError(`renderPng: option "${name}" must be ${expected}, got ${String(got)}`);
  };
  if (opts.view !== undefined && !PNG_VIEWS.includes(opts.view)) {
    bad("view", `one of ${PNG_VIEWS.join(", ")}`, opts.view);
  }
  const maxEdge = sheet ? MAX_SHEET_EDGE : MAX_SINGLE_EDGE;
  const minEdge = sheet ? MIN_EDGE * 2 : MIN_EDGE;
  for (const name of ["width", "height"] as const) {
    const v = opts[name];
    if (v !== undefined && !(Number.isInteger(v) && v >= minEdge && v <= maxEdge)) {
      bad(
        name,
        `an integer from ${minEdge} to ${maxEdge} pixels${sheet ? " (a sheet is capped at 1280 on its long edge; render one view for more)" : ""}`,
        v,
      );
    }
  }
  for (const name of ["extent", "eye"] as const) {
    const v = opts[name];
    if (v !== undefined && !(Number.isFinite(v) && v > 0)) bad(name, "a finite number > 0 (world units)", v);
  }
  for (const name of ["maxPoints", "maxPrimitives"] as const) {
    const v = opts[name];
    if (v !== undefined && !(Number.isInteger(v) && v >= 1)) {
      bad(name, 'an integer >= 1 (0 is a cap of zero, not "no cap"; omit the option for the default)', v);
    }
  }
  if (opts.attrDomain !== undefined && opts.attr === undefined) {
    throw new CliError(
      'renderPng: option "attrDomain" narrows which domain "attr" is read from, so on its own it colors nothing — pass "attr" as well, or drop "attrDomain"',
    );
  }
}

/**
 * Draw a cooked collection as PNG frames. See the module header for what
 * the frames are for; {@link RenderPngResult} for what the report carries.
 */
export function renderPng(collection: DataCollection, opts: RenderPngOptions = {}): RenderPngResult {
  const view = opts.view ?? "sheet";
  const sheet = view === "sheet";
  checkOptions(opts, sheet);
  const defaults = sheet ? SHEET_SIZE : SINGLE_SIZE;
  const width = opts.width ?? defaults.width;
  const height = opts.height ?? defaults.height;

  const scene = buildScene(collection, {
    ...(opts.outputs !== undefined ? { outputs: opts.outputs } : {}),
    ...(opts.points === true ? { points: true } : {}),
    ...(opts.attr !== undefined ? { attr: opts.attr } : {}),
    ...(opts.attrDomain !== undefined ? { attrDomain: opts.attrDomain } : {}),
    maxPoints: opts.maxPoints ?? 200000,
    maxPrimitives: opts.maxPrimitives ?? 2000000,
  });
  const framing = frameBounds(scene.bounds, {
    ...(opts.extent !== undefined ? { extent: opts.extent } : {}),
    ...(opts.eye !== undefined ? { eye: opts.eye } : {}),
  });
  // Where no face is under the eye — or there are no faces at all — it
  // stands on the content's TRUE lowest point. Not on groundY: that is
  // snapped to extent/128, and at extent 1000 a snap of 7.8 put the eye of
  // a lines-only scene below both the content and the grid.
  const floorY = scene.bounds?.min[1] ?? framing.groundY;
  const poses = posesFor(framing, (x, z) => surfaceYAt(scene, x, z, floorY));

  const image = new Uint8Array(width * height * 3);
  const tiles: { name: ViewName; x: number; y: number; w: number; h: number }[] = [];
  if (sheet) {
    const leftW = width >> 1;
    const topH = height >> 1;
    const cols = [
      [0, leftW],
      [leftW, width - leftW],
    ] as const;
    const rows = [
      [0, topH],
      [topH, height - topH],
    ] as const;
    SHEET.forEach((name, i) => {
      const [x, w] = cols[i % 2];
      const [y, h] = rows[i >> 1];
      tiles.push({ name, x, y, w, h });
    });
  } else {
    tiles.push({ name: view, x: 0, y: 0, w: width, h: height });
  }

  const reports: PngViewReport[] = [];
  let groundView: GroundViewReport | undefined;
  const gridOn = opts.grid !== false;
  for (const tile of tiles) {
    const pose: Pose = poses[tile.name];
    const raster = new Raster(tile.w * 2, tile.h * 2, BACKGROUND);
    const camera = makeCamera(pose, raster.width, raster.height, framing.extent);
    drawScene(raster, camera, scene, framing, {
      grid: gridOn && GRID_VIEWS.includes(pose.name),
      markers: MARKER_VIEWS.includes(pose.name),
    });
    if (pose.name === "ground") groundView = measureGroundView(raster, camera, framing.extent, framing.eye);
    const pixels = raster.downsample();
    for (let y = 0; y < tile.h; y++) {
      image.set(pixels.subarray(y * tile.w * 3, (y + 1) * tile.w * 3), ((tile.y + y) * width + tile.x) * 3);
    }
    const label = tileLabel(pose.name, framing.eye);
    const scale = tile.h >= 360 && tile.w >= 360 ? 2 : 1;
    drawLabel(image, width, label, tile.x + 2 * scale, tile.y + 2 * scale, scale, 2 * scale, {
      x: tile.x,
      y: tile.y,
      width: tile.w,
      height: tile.h,
    }, LABEL_TEXT, LABEL_BOX);
    reports.push({
      name: pose.name,
      label,
      projection: pose.projection,
      position: pose.position,
      target: pose.target,
      up: pose.up,
      ...(pose.projection === "perspective" ? { fovY: FOV_Y_DEGREES } : {}),
      ...(pose.halfSize !== undefined ? { halfSize: pose.halfSize } : {}),
      tile: { x: tile.x, y: tile.y, width: tile.w, height: tile.h },
    });
  }
  if (sheet) {
    const sr = (SEPARATOR >> 16) & 255;
    const sg = (SEPARATOR >> 8) & 255;
    const sb = SEPARATOR & 255;
    const paint = (x: number, y: number): void => {
      const o = (y * width + x) * 3;
      image[o] = sr;
      image[o + 1] = sg;
      image[o + 2] = sb;
    };
    const splitX = width >> 1;
    const splitY = height >> 1;
    for (let y = 0; y < height; y++) paint(splitX, y);
    for (let x = 0; x < width; x++) paint(x, splitY);
  }

  return {
    png: encodePng(image, width, height),
    width,
    height,
    view,
    views: reports,
    framing: {
      extent: framing.extent,
      pinned: framing.pinned,
      autoExtent: framing.autoExtent,
      eye: framing.eye,
      groundY: framing.groundY,
      centre: framing.centre,
      ...(scene.bounds !== undefined ? { bounds: scene.bounds } : {}),
    },
    counts: scene.counts,
    legend: scene.legend,
    ...(scene.colorAttr !== undefined
      ? { colorAttr: scene.colorAttr, colorDomains: scene.colorDomains ?? [] }
      : {}),
    drawing: {
      instances: INSTANCE_DRAWING,
      markerViews: MARKER_VIEWS.filter((v) => reports.some((r) => r.name === v)),
      points: POINT_DRAWING,
      grid: gridOn
        ? {
            views: GRID_VIEWS.filter((v) => reports.some((r) => r.name === v)),
            y: gridHeight(scene, framing),
            note: GRID_DRAWING,
          }
        : { views: [], y: gridHeight(scene, framing), note: "grid switched off" },
      labels: LABEL_DRAWING,
    },
    ...(groundView !== undefined ? { groundView } : {}),
    pixelHash: pixelHash(image, width, height),
  };
}

/** What each tile's corner label says: the view, and which way its axes run. */
export function tileLabel(view: ViewName, eye: number): string {
  switch (view) {
    case "top":
      return "TOP x→ z↓";
    case "side":
      return "SIDE x→ y↑";
    case "hero":
      return "HERO";
    default:
      return `GROUND eye ${fmtLabelNumber(eye)}`;
  }
}

/** A short, deterministic decimal for a label: at most three decimals, trailing zeros trimmed. */
function fmtLabelNumber(v: number): string {
  const rounded = Math.round(v * 1000) / 1000;
  return String(rounded);
}

/** Blocked fraction above which the ground view is reported occluded. */
const OCCLUDED_ABOVE = 0.2;

/**
 * How much of the ground view is blocked by surface standing close to the
 * eye.
 *
 * Depth is sampled on a fixed grid of every 4th supersample. `nearDistance`
 * is the eye's own neighbourhood — four eye heights, and never less than 5%
 * of the extent, so a small scene's rock the eye stands on counts as near
 * as surely as a large scene's hillside does.
 *
 * NEAR ALONE IS NOT BLOCKED. Every ray below the horizon meets the ground
 * the eye stands on, and at a large extent nearly all of them meet it
 * within `nearDistance`: a perfectly flat plane at extent 3200 has 48% of
 * its samples nearer than 160 m, and gentle hills tipped the old
 * "more than half is near" rule over while the frame showed an open
 * horizon. So each sample is judged against the flat ground at the eye's
 * feet: a sample is BLOCKED when it is near although that flat ground would
 * have left it open (the ray is at or above the horizon, or meets the
 * plane beyond `nearDistance`), or when it is nearer than one eye height,
 * which flat ground never is. `blockedFraction` is blocked samples over the
 * samples that flat ground would leave open or that are that close; above
 * {@link OCCLUDED_ABOVE} the frame shows what the eye stands against — a
 * ridge, a wall, the inside of a mesh — and the report says so.
 *
 * Measured with this rule: flat planes and 5 m / 600 m or 1 m / 60 m hills
 * at any phase 0 .. 0.11; pipeline-5-roads' ridge 0.27; a wall two units
 * ahead and the inside of basics-mesh-from-field 1.
 *
 * `nearFraction` is kept for the record — the raw share of samples nearer
 * than `nearDistance` — and `medianDepth` is the median over the same
 * samples, background counted as infinitely far (null then).
 */
function measureGroundView(raster: Raster, cam: Camera, extent: number, eye: number): GroundViewReport {
  const nearDistance = Math.max(extent * 0.05, eye * 4);
  const depths = new Float64Array(Math.ceil(raster.height / 4) * Math.ceil(raster.width / 4));
  let n = 0;
  let near = 0;
  let open = 0;
  let blocked = 0;
  for (let y = 0; y < raster.height; y += 4) {
    // View-space y of this row at unit depth, and so the world-y rise of
    // the ray per unit of depth.
    const vy = (0.5 - (y + 0.5) / raster.height) * 2 / cam.scaleY;
    for (let x = 0; x < raster.width; x += 4) {
      const vx = ((x + 0.5) / raster.width - 0.5) * 2 / cam.scaleX;
      const rise = cam.forward[1] + cam.up[1] * vy + cam.right[1] * vx;
      const d = raster.depth[y * raster.width + x];
      depths[n++] = d;
      const isNear = d < nearDistance;
      if (isNear) near++;
      // Depth at which this ray meets flat ground one eye height down.
      const flatDepth = rise < 0 ? eye / -rise : Number.POSITIVE_INFINITY;
      const flatLeavesOpen = !(flatDepth < nearDistance);
      const withinReach = d < eye;
      if (flatLeavesOpen || withinReach) {
        open++;
        if (isNear) blocked++;
      }
    }
  }
  // A typed array sorts numerically, +Infinity last.
  depths.sort();
  const median = depths[depths.length >> 1];
  const blockedFraction = open === 0 ? 0 : Math.round((blocked / open) * 1000) / 1000;
  return {
    nearDistance,
    nearFraction: Math.round((near / depths.length) * 1000) / 1000,
    blockedFraction,
    medianDepth: Number.isFinite(median) ? median : null,
    occluded: open > 0 && blocked > open * OCCLUDED_ABOVE,
  };
}
