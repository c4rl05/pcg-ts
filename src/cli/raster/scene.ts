/**
 * A cooked collection turned into what the rasterizer draws: flat lit
 * triangles, line segments and points, in world space, plus the counts the
 * report owes the reader.
 *
 * - `poly` primitives are fan-triangulated from their first vertex exactly
 *   as `src/three/convert.ts` does, so a concave face draws the way a host
 *   would draw it rather than the way it ought to look. Untagged topology
 *   is inferred the same way too: three or more vertices is a face, and
 *   only a geometry with no such primitive is read as lines.
 * - Faces are flat and two-sided: Lambert on |n·l| from a fixed light, over
 *   an ambient floor, so a face seen from behind is not black.
 * - `polyline` primitives are segments. Points draw only for a geometry
 *   whose topology drew nothing, unless `points` asks for them — a cloud
 *   over the mesh it belongs to buries the surface.
 * - Instances are upright square pyramids (base 0.4, height 1) pushed
 *   through their full 4×4, coloured by asset id: orientation and scale
 *   are visible, the asset's look deliberately is not. At true scale a
 *   tree is a pixel from 200 m up, so every view but `ground` also marks
 *   each instance's apex with a small plus sign — a different shape from a
 *   point's square — because placement is what those views are for, and
 *   `ground` is the one where true size is the point. Device-resident
 *   batches have no CPU transforms; they are counted and reported.
 * - Default colours are categorical and never read from a `color`
 *   attribute, which is minted white on every cloud and so carries no
 *   intent. They are dealt out IN ORDER — geometry outputs as they first
 *   appear, then asset ids sorted — through the palette, then through a
 *   darker and a lighter pass of it, so up to 24 distinct names in one
 *   picture never share a colour. (A hash of the name kept colours stable
 *   across edits but put ten outputs on eight colours with collisions.)
 *   `attr` colours through the SVG's own colorizer.
 * - The ground grid in the perspective views lies just under the content's
 *   TRUE lowest point and is drawn last, only on samples nothing else wrote,
 *   so it frames the content without ever drawing over it.
 *
 * Arithmetic is restricted as in `raster.ts`; the same scan covers this file.
 */
import type { Attribute, DataCollection, Geometry } from "../../index.js";
import {
  COLOR_DOMAINS,
  type ColorDomain,
  PALETTE_RGB,
  columnColorizer,
  hexOf,
  resolveColorColumns,
  scalarRange,
  strideFor,
} from "../render.js";
import { type Camera, type Raster, channels } from "./raster.js";
import type { Bounds3, Framing } from "./views.js";

/** Light direction (toward the light), unit length, and the ambient floor. */
const LIGHT = ((): readonly [number, number, number] => {
  const x = 0.45;
  const y = 0.8;
  const z = 0.35;
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
})();
const AMBIENT = 0.38;
/** Lines are drawn unlit, a shade darker than the faces of the same output. */
const LINE_SHADE = 0.72;
/** Half the side of a point splat, in supersampled pixels. */
const POINT_HALF = 2;
/** Arm length of an instance's apex cross, in supersampled pixels. */
const MARKER_ARM = 5;
/** The ground grid's colour, and its cell count across twice the extent. */
const GRID_COLOR = 0xc3ccd6;
const GRID_CELLS = 40;

/** Square-pyramid proxy: base corners then apex, in the instance's local space. */
const PROXY = [
  -0.2, 0, -0.2,
  0.2, 0, -0.2,
  0.2, 0, 0.2,
  -0.2, 0, 0.2,
  0, 1, 0,
] as const;
/** Proxy faces: four sides and a two-triangle base. */
const PROXY_FACES = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 0, 2, 1, 0, 3, 2] as const;

/** What {@link buildScene} needs beyond the collection. */
export interface SceneOptions {
  /** The declared output each item came from, in collection order. */
  readonly outputs?: readonly string[];
  /** Draw points even for geometry whose topology drew. */
  readonly points?: boolean;
  readonly attr?: string;
  readonly attrDomain?: ColorDomain;
  /** Cap on drawn points plus instances across the collection. */
  readonly maxPoints: number;
  /** Cap on drawn primitives across the collection. */
  readonly maxPrimitives: number;
}

/** What the scene holds, drawn and total. */
export interface SceneCounts {
  readonly points: number;
  readonly pointsTotal: number;
  readonly primitives: number;
  readonly primitivesTotal: number;
  /** Geometry triangles drawn; instance proxies are not counted here. */
  readonly triangles: number;
  readonly segments: number;
  readonly instances: number;
  readonly instancesTotal: number;
  readonly deviceInstances: number;
  /** Elements dropped because a position or transform was not finite. */
  readonly skipped: number;
  /** Geometries whose points were not drawn because their topology was. */
  readonly pointsSuppressed: number;
}

/** One colour in the picture and what it stands for. */
export interface LegendEntry {
  readonly kind: "output" | "asset";
  readonly name: string;
  readonly color: string;
}

/** Everything the rasterizer draws, flat. */
export interface Scene {
  /** 9 numbers per triangle. */
  readonly faces: Float64Array;
  /** 3 lit channels (0..255) per triangle. */
  readonly faceColors: Float64Array;
  readonly faceCount: number;
  /** Faces `[0, surfaceFaces)` are geometry; the rest are instance proxies. */
  readonly surfaceFaces: number;
  /** 6 numbers per segment. */
  readonly lines: Float64Array;
  readonly lineColors: Float64Array;
  readonly lineCount: number;
  /** 3 numbers per point. */
  readonly points: Float64Array;
  readonly pointColors: Float64Array;
  readonly pointCount: number;
  /** 3 numbers per drawn instance: its proxy's apex. */
  readonly markers: Float64Array;
  readonly markerColors: Float64Array;
  readonly markerCount: number;
  /** Box over everything that would draw, caps aside; absent for an empty scene. */
  readonly bounds?: Bounds3;
  readonly counts: SceneCounts;
  readonly legend: readonly LegendEntry[];
  readonly colorAttr?: string;
  readonly colorDomains?: readonly ColorDomain[];
}

/** A growable float column. */
class Column {
  data = new Float64Array(1024);
  length = 0;
  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) {
      const next = new Float64Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }
  append(other: Column): void {
    for (let i = 0; i < other.length; i += 3) this.push3(other.data[i], other.data[i + 1], other.data[i + 2]);
  }
  view(): Float64Array {
    return this.data.subarray(0, this.length);
  }
}

/**
 * The `slot`-th categorical colour: the palette, then a darker pass of it,
 * then a lighter one, then round again. 24 distinct colours before any
 * repeats — three times the palette, so two passes' worth of names are
 * always told apart even if a later pass is ever dropped.
 */
export function categoricalColor(slot: number): number {
  const n = PALETTE_RGB.length;
  const pass = Math.floor(slot / n) % 3;
  const [r, g, b] = channels(PALETTE_RGB[slot % n]);
  const tone = (c: number): number =>
    pass === 0 ? c : pass === 1 ? Math.round(c * 0.58) : Math.round(c + (255 - c) * 0.5);
  return (tone(r) << 16) | (tone(g) << 8) | tone(b);
}

/** Lambert intensity of a triangle's face, two-sided. */
function shade(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const vx = cx - ax;
  const vy = cy - ay;
  const vz = cz - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (!(len > 0)) return AMBIENT;
  const d = Math.abs((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len);
  return AMBIENT + (1 - AMBIENT) * d;
}

/** How one geometry's primitives are read, mirroring the three.js exporters. */
function primitiveKinds(geo: Geometry): (p: number) => "face" | "line" | undefined {
  const tag = geo.attrs.primitive.get("primtype");
  if (tag !== undefined && tag.type === "string") {
    return (p) => {
      const kind = tag.getString(p);
      if (kind === "poly") return geo.primVertexCount[p] >= 3 ? "face" : undefined;
      if (kind === "polyline") return geo.primVertexCount[p] >= 2 ? "line" : undefined;
      return undefined;
    };
  }
  // Untagged: faces when any primitive can be one, lines only otherwise —
  // the order `shared/draw.ts` offers the exporters in.
  let anyFace = false;
  for (let p = 0; p < geo.primitiveCount && !anyFace; p++) anyFace = geo.primVertexCount[p] >= 3;
  return anyFace
    ? (p) => (geo.primVertexCount[p] >= 3 ? "face" : undefined)
    : (p) => (geo.primVertexCount[p] >= 2 ? "line" : undefined);
}

/** A usable position column: numeric, at least two components. */
function positions(geo: Geometry): Attribute | undefined {
  const P = geo.attrs.point.get("P");
  return P === undefined || P.type === "string" || P.tupleSize < 2 ? undefined : P;
}

/**
 * Build the scene. Two passes, like the SVG: the caps are a budget over the
 * whole collection, so the stride is chosen before anything is drawn.
 */
export function buildScene(collection: DataCollection, opts: SceneOptions): Scene {
  // Pass 1 — survey.
  let pointsTotal = 0;
  let primitivesTotal = 0;
  let instancesTotal = 0;
  let deviceInstances = 0;
  // Colour slots: geometry outputs in the order they first appear (which is
  // declared-output order), then the asset ids, sorted.
  const outputOrder: string[] = [];
  const assetIds = new Set<string>();
  for (let index = 0; index < collection.length; index++) {
    const item = collection[index];
    if (item.kind === "instances") {
      if (item.deviceBatches !== undefined) {
        for (const batch of item.deviceBatches) deviceInstances += batch.count;
      } else {
        for (const batch of item.batches) {
          instancesTotal += batch.count;
          assetIds.add(batch.assetId);
        }
      }
      continue;
    }
    if (item.kind !== "geometry" || positions(item.geo) === undefined) continue;
    const output = opts.outputs?.[index] ?? "item";
    if (!outputOrder.includes(output)) outputOrder.push(output);
    const geo = item.geo;
    const kind = primitiveKinds(geo);
    let drawsTopology = false;
    for (let p = 0; p < geo.primitiveCount; p++) {
      if (kind(p) !== undefined) {
        primitivesTotal++;
        drawsTopology = true;
      }
    }
    if (!drawsTopology || opts.points === true) pointsTotal += geo.pointCount;
  }
  const markStride = strideFor(pointsTotal + instancesTotal, opts.maxPoints);
  const primStride = strideFor(primitivesTotal, opts.maxPrimitives);
  const rangeDomains = opts.attrDomain === undefined ? COLOR_DOMAINS : [opts.attrDomain];
  const range = opts.attr === undefined ? undefined : scalarRange(collection, opts.attr, rangeDomains);
  const slots = new Map<string, number>();
  outputOrder.forEach((name) => slots.set(`output:${name}`, categoricalColor(slots.size)));
  [...assetIds]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .forEach((id) => slots.set(`asset:${id}`, categoricalColor(slots.size)));
  const colorOf = (key: string): number => slots.get(key) as number;

  const faces = new Column();
  const faceColors = new Column();
  const proxyFaces = new Column();
  const proxyColors = new Column();
  const lines = new Column();
  const lineColors = new Column();
  const points = new Column();
  const pointColors = new Column();
  const markers = new Column();
  const markerColors = new Column();
  let min0 = Number.POSITIVE_INFINITY;
  let min1 = Number.POSITIVE_INFINITY;
  let min2 = Number.POSITIVE_INFINITY;
  let max0 = Number.NEGATIVE_INFINITY;
  let max1 = Number.NEGATIVE_INFINITY;
  let max2 = Number.NEGATIVE_INFINITY;
  const track = (x: number, y: number, z: number): void => {
    if (x < min0) min0 = x;
    if (x > max0) max0 = x;
    if (y < min1) min1 = y;
    if (y > max1) max1 = y;
    if (z < min2) min2 = z;
    if (z > max2) max2 = z;
  };
  let pointsDrawn = 0;
  let primitivesDrawn = 0;
  let instancesDrawn = 0;
  let skipped = 0;
  let pointsSuppressed = 0;
  let markIndex = 0;
  let primIndex = 0;
  let colorAttr: string | undefined;
  const colorDomains = new Set<ColorDomain>();

  // Pass 2 — build.
  for (let index = 0; index < collection.length; index++) {
    const item = collection[index];
    if (item.kind === "instances") {
      if (item.deviceBatches !== undefined) continue;
      for (const batch of item.batches) {
        const rgb = colorOf(`asset:${batch.assetId}`);
        const [r, g, b] = channels(rgb);
        const m = batch.transforms;
        const world = new Float64Array(15);
        for (let i = 0; i < batch.count; i++) {
          const o = i * 16;
          let finite = true;
          for (let k = 0; k < 16; k++) finite = finite && Number.isFinite(m[o + k]);
          if (!finite) {
            markIndex++;
            skipped++;
            continue;
          }
          for (let v = 0; v < 5; v++) {
            const lx = PROXY[v * 3];
            const ly = PROXY[v * 3 + 1];
            const lz = PROXY[v * 3 + 2];
            const wx = m[o] * lx + m[o + 4] * ly + m[o + 8] * lz + m[o + 12];
            const wy = m[o + 1] * lx + m[o + 5] * ly + m[o + 9] * lz + m[o + 13];
            const wz = m[o + 2] * lx + m[o + 6] * ly + m[o + 10] * lz + m[o + 14];
            world[v * 3] = wx;
            world[v * 3 + 1] = wy;
            world[v * 3 + 2] = wz;
            track(wx, wy, wz);
          }
          if (markIndex++ % markStride !== 0) continue;
          for (let f = 0; f < PROXY_FACES.length; f += 3) {
            const a = PROXY_FACES[f] * 3;
            const bb = PROXY_FACES[f + 1] * 3;
            const c = PROXY_FACES[f + 2] * 3;
            proxyFaces.push3(world[a], world[a + 1], world[a + 2]);
            proxyFaces.push3(world[bb], world[bb + 1], world[bb + 2]);
            proxyFaces.push3(world[c], world[c + 1], world[c + 2]);
            const k = shade(
              world[a], world[a + 1], world[a + 2],
              world[bb], world[bb + 1], world[bb + 2],
              world[c], world[c + 1], world[c + 2],
            );
            proxyColors.push3(r * k, g * k, b * k);
          }
          markers.push3(world[12], world[13], world[14]);
          markerColors.push3(r, g, b);
          instancesDrawn++;
        }
      }
      continue;
    }
    if (item.kind !== "geometry") continue;
    const geo = item.geo;
    const P = positions(geo);
    if (P === undefined) continue;
    const ts = P.tupleSize;
    const data = P.data;
    // A two-component P is (x, z) on the ground, as the SVG reads it.
    const px = (i: number): number => data[i * ts];
    const py = (i: number): number => (ts >= 3 ? data[i * ts + 1] : 0);
    const pz = (i: number): number => data[i * ts + (ts >= 3 ? 2 : 1)];
    const finite = (i: number): boolean =>
      Number.isFinite(px(i)) && Number.isFinite(py(i)) && Number.isFinite(pz(i));

    const output = opts.outputs?.[index] ?? "item";
    const baseRgb = colorOf(`output:${output}`);
    let pointRgb: ((i: number) => number) | undefined;
    let primRgb: ((p: number) => number) | undefined;
    if (opts.attr !== undefined) {
      const found = resolveColorColumns(geo, opts.attr, index, opts.attrDomain);
      if (found.point !== undefined) {
        pointRgb = columnColorizer(found.point, range);
        colorAttr = found.point.name;
        colorDomains.add("point");
      }
      if (found.primitive !== undefined) {
        primRgb = columnColorizer(found.primitive, range);
        colorAttr = found.primitive.name;
        colorDomains.add("primitive");
      }
    }
    /** Mean of some points' colours, channel by channel, as floats. */
    const meanOf = (ids: readonly number[]): [number, number, number] => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const id of ids) {
        const [cr, cg, cb] = channels((pointRgb as (i: number) => number)(id));
        r += cr;
        g += cg;
        b += cb;
      }
      return [r / ids.length, g / ids.length, b / ids.length];
    };

    const kind = primitiveKinds(geo);
    let drewTopology = false;
    for (let p = 0; p < geo.primitiveCount; p++) {
      const what = kind(p);
      if (what === undefined) continue;
      drewTopology = true;
      const start = geo.primVertexStart[p];
      const count = geo.primVertexCount[p];
      // Bounds follow every primitive that would draw, caps aside, so a
      // cap never moves the camera.
      for (let v = 0; v < count; v++) {
        const id = geo.vertexToPoint[start + v];
        if (finite(id)) track(px(id), py(id), pz(id));
      }
      if (primIndex++ % primStride !== 0) continue;
      let drew = false;
      if (what === "face") {
        const first = geo.vertexToPoint[start];
        for (let k = 1; k + 1 < count; k++) {
          const b = geo.vertexToPoint[start + k];
          const c = geo.vertexToPoint[start + k + 1];
          if (!finite(first) || !finite(b) || !finite(c)) {
            skipped++;
            continue;
          }
          const lit = shade(px(first), py(first), pz(first), px(b), py(b), pz(b), px(c), py(c), pz(c));
          const [r, g, bl] =
            primRgb !== undefined
              ? channels(primRgb(p))
              : pointRgb !== undefined
                ? meanOf([first, b, c])
                : channels(baseRgb);
          faces.push3(px(first), py(first), pz(first));
          faces.push3(px(b), py(b), pz(b));
          faces.push3(px(c), py(c), pz(c));
          faceColors.push3(r * lit, g * lit, bl * lit);
          drew = true;
        }
      } else {
        for (let k = 0; k + 1 < count; k++) {
          const a = geo.vertexToPoint[start + k];
          const b = geo.vertexToPoint[start + k + 1];
          if (!finite(a) || !finite(b)) {
            skipped++;
            continue;
          }
          const [r, g, bl] =
            primRgb !== undefined
              ? channels(primRgb(p))
              : pointRgb !== undefined
                ? meanOf([a, b])
                : channels(baseRgb);
          lines.push3(px(a), py(a), pz(a));
          lines.push3(px(b), py(b), pz(b));
          lineColors.push3(r * LINE_SHADE, g * LINE_SHADE, bl * LINE_SHADE);
          drew = true;
        }
      }
      if (drew) primitivesDrawn++;
    }

    if (drewTopology && opts.points !== true) {
      if (geo.pointCount > 0) pointsSuppressed++;
      continue;
    }
    const [br, bg, bb] = channels(baseRgb);
    for (let i = 0; i < geo.pointCount; i++) {
      if (markIndex++ % markStride !== 0) {
        if (finite(i)) track(px(i), py(i), pz(i));
        continue;
      }
      if (!finite(i)) {
        skipped++;
        continue;
      }
      track(px(i), py(i), pz(i));
      points.push3(px(i), py(i), pz(i));
      if (pointRgb !== undefined) {
        const [r, g, b] = channels(pointRgb(i));
        pointColors.push3(r, g, b);
      } else {
        pointColors.push3(br, bg, bb);
      }
      pointsDrawn++;
    }
  }

  const surfaceFaces = faces.length / 9;
  faces.append(proxyFaces);
  faceColors.append(proxyColors);
  const bounds: Bounds3 | undefined =
    min0 <= max0 ? { min: [min0, min1, min2], max: [max0, max1, max2] } : undefined;
  // Legend in slot order — outputs as declared, then assets by id — which
  // is also the order the colours were dealt in.
  const legendList: LegendEntry[] = [...slots.entries()].map(([key, rgb]) => {
    const colon = key.indexOf(":");
    return { kind: key.slice(0, colon) as LegendEntry["kind"], name: key.slice(colon + 1), color: hexOf(rgb) };
  });
  return {
    faces: faces.view(),
    faceColors: faceColors.view(),
    faceCount: faces.length / 9,
    surfaceFaces,
    lines: lines.view(),
    lineColors: lineColors.view(),
    lineCount: lines.length / 6,
    points: points.view(),
    pointColors: pointColors.view(),
    pointCount: points.length / 3,
    markers: markers.view(),
    markerColors: markerColors.view(),
    markerCount: markers.length / 3,
    ...(bounds !== undefined ? { bounds } : {}),
    counts: {
      points: pointsDrawn,
      pointsTotal,
      primitives: primitivesDrawn,
      primitivesTotal,
      triangles: surfaceFaces,
      segments: lines.length / 6,
      instances: instancesDrawn,
      instancesTotal,
      deviceInstances,
      skipped,
      pointsSuppressed,
    },
    legend: legendList,
    ...(colorAttr !== undefined
      ? { colorAttr, colorDomains: COLOR_DOMAINS.filter((d) => colorDomains.has(d)) }
      : {}),
  };
}

/**
 * The highest geometry surface under (x, z), by casting straight down onto
 * every face with a plain loop — instance proxies excluded, because standing
 * on top of a tree is not eye level. `fallback` when nothing is under it.
 */
export function surfaceYAt(scene: Scene, x: number, z: number, fallback: number): number {
  const f = scene.faces;
  let best = Number.NEGATIVE_INFINITY;
  for (let t = 0; t < scene.surfaceFaces; t++) {
    const o = t * 9;
    const x0 = f[o];
    const z0 = f[o + 2];
    const ex1 = f[o + 3] - x0;
    const ez1 = f[o + 5] - z0;
    const ex2 = f[o + 6] - x0;
    const ez2 = f[o + 8] - z0;
    const det = ex1 * ez2 - ex2 * ez1;
    if (det === 0) continue;
    const dx = x - x0;
    const dz = z - z0;
    const u = (dx * ez2 - ex2 * dz) / det;
    const v = (ex1 * dz - dx * ez1) / det;
    if (u < 0 || v < 0 || u + v > 1) continue;
    const y = f[o + 1] + u * (f[o + 4] - f[o + 1]) + v * (f[o + 7] - f[o + 1]);
    if (y > best) best = y;
  }
  return best > Number.NEGATIVE_INFINITY ? best : fallback;
}

/** What {@link drawScene} adds beyond the scene itself. */
export interface DrawOptions {
  /** The ground grid at {@link gridHeight}, twice the extent across. */
  readonly grid: boolean;
  /** A cross on every instance's apex, so placement reads at any scale. */
  readonly markers: boolean;
}

/**
 * Where the ground grid lies: a thousandth of the extent under the content's
 * TRUE lowest point. Not under `framing.groundY`, which is snapped to
 * extent/128 and can sit above the real floor by up to half a step — the
 * grid once floated 0.88 over a ground mesh that way.
 */
export function gridHeight(scene: Scene, framing: Framing): number {
  return (scene.bounds?.min[1] ?? framing.groundY) - framing.extent * 0.001;
}

/** Draw a built scene through one camera. */
export function drawScene(raster: Raster, cam: Camera, scene: Scene, framing: Framing, opts: DrawOptions): void {
  const f = scene.faces;
  const fc = scene.faceColors;
  for (let t = 0; t < scene.faceCount; t++) {
    const o = t * 9;
    const c = t * 3;
    raster.triangle(
      cam,
      f[o], f[o + 1], f[o + 2],
      f[o + 3], f[o + 4], f[o + 5],
      f[o + 6], f[o + 7], f[o + 8],
      fc[c], fc[c + 1], fc[c + 2],
    );
  }
  const l = scene.lines;
  const lc = scene.lineColors;
  for (let s = 0; s < scene.lineCount; s++) {
    const o = s * 6;
    const c = s * 3;
    raster.line(cam, l[o], l[o + 1], l[o + 2], l[o + 3], l[o + 4], l[o + 5], lc[c], lc[c + 1], lc[c + 2]);
  }
  const p = scene.points;
  const pc = scene.pointColors;
  for (let i = 0; i < scene.pointCount; i++) {
    const o = i * 3;
    raster.point(cam, p[o], p[o + 1], p[o + 2], POINT_HALF, pc[o], pc[o + 1], pc[o + 2]);
  }
  if (opts.markers) {
    const m = scene.markers;
    const mc = scene.markerColors;
    for (let i = 0; i < scene.markerCount; i++) {
      const o = i * 3;
      raster.cross(cam, m[o], m[o + 1], m[o + 2], MARKER_ARM, mc[o], mc[o + 1], mc[o + 2]);
    }
  }
  // Last, and only where nothing else drew: the grid can never cover
  // content, whatever the depth buffer's precision at a grazing angle.
  if (opts.grid) {
    const [gr, gg, gb] = channels(GRID_COLOR);
    const [cx, , cz] = framing.centre;
    const half = framing.extent;
    const y = gridHeight(scene, framing);
    for (let i = 0; i <= GRID_CELLS; i++) {
      const s = -half + (2 * half * i) / GRID_CELLS;
      raster.line(cam, cx + s, y, cz - half, cx + s, y, cz + half, gr, gg, gb, "behind");
      raster.line(cam, cx - half, y, cz + s, cx + half, y, cz + s, gr, gg, gb, "behind");
    }
  }
}
