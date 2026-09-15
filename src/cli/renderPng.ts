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
import { encodePng, pixelHash } from "./raster/png.js";
import { Raster, makeCamera } from "./raster/raster.js";
import { type LegendEntry, type SceneCounts, buildScene, drawScene, surfaceYAt } from "./raster/scene.js";
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
}

/** One drawn view, as the report states it. */
export interface PngViewReport {
  readonly name: ViewName;
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
  /** 16 hex over the pixels and size — equal hashes, equal pictures. */
  readonly pixelHash: string;
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
  const poses = posesFor(framing, (x, z) => surfaceYAt(scene, x, z, framing.groundY));

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
  for (const tile of tiles) {
    const pose: Pose = poses[tile.name];
    const raster = new Raster(tile.w * 2, tile.h * 2, BACKGROUND);
    const camera = makeCamera(pose, raster.width, raster.height, framing.extent);
    drawScene(raster, camera, scene, framing, {
      grid: pose.projection === "perspective",
      markers: pose.name !== "ground",
    });
    const pixels = raster.downsample();
    for (let y = 0; y < tile.h; y++) {
      image.set(pixels.subarray(y * tile.w * 3, (y + 1) * tile.w * 3), ((tile.y + y) * width + tile.x) * 3);
    }
    reports.push({
      name: pose.name,
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
    pixelHash: pixelHash(image, width, height),
  };
}
