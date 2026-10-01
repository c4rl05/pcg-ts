/**
 * The drawing's look, as one value: what the Look box's drawing controls
 * set, and what each turns into for the pen (ink.ts), the wash (wash.ts)
 * and the lights (rig.ts).
 *
 * WHAT IT IS AFTER. A cutaway illustration in the manner of the
 * illustrated architecture books — a pen drawing filled with washed,
 * pale pencil-and-watercolour colour: a few flat tones per face rather
 * than a gradient, a light that models the form without darkening it,
 * soft dark-brown lines rather than black ones, and the dark gathered
 * where members meet. No paper grain: the colour, the edges, the light
 * and the occlusion are the look, each a toggle over the plain pen.
 */
import { type Haze, INK_DEFAULT, type InkSpec, type WashComposite } from "./ink.js";
import type { Look } from "./look.js";
import type { WashShading } from "./wash.js";
import { Color, SRGBColorSpace } from "three";

export interface DrawingSpec {
  /** Colour under the lines. Off is the plain pen: lines on paper. */
  readonly colour: boolean;
  /** The colour the palette is generated from (wash.ts `washColor`): the iron's. */
  readonly main: number;
  readonly paper: number;
  /** The sun's light stepped into bands (wash.ts `washRamp`). */
  readonly cel: boolean;
  readonly bands: number;
  /** Each band's edge, 0 hard to 1 gone. */
  readonly bandSoftness: number;
  /** Washed: the colour paled toward the paper and calmed. */
  readonly washed: boolean;
  /** How far toward the paper, 0 to 1. */
  readonly lift: number;
  /**
   * Light as a hue (wash.ts `WashShading`): how far a lit face goes toward
   * a cream, and a face in shade toward a rose-grey, both generated from
   * the main colour. 0 and 0 is light as a value only.
   */
  readonly litTint: number;
  readonly shadeTint: number;
  /** 1 keeps the colour's saturation, 0 is grey. */
  readonly saturation: number;
  /** Soft lines: a dark of the main colour, spread wider and laid lighter. */
  readonly softEdges: boolean;
  /** What is left of a line far off (ink.ts `fadeFloor`): 1 keeps it whole. */
  readonly farLines: number;
  /** Inner contours and creases against the silhouette's weight (ink.ts `inner`, `crease`). */
  readonly innerLines: number;
  /** Line weight in device pixels, over the `?ink=` weight (ink.ts `width`). */
  readonly lineWidth: number;
  /** Line darkness, 0 to 1 (ink.ts `strength`). */
  readonly lineStrength: number;
  /** How far behind the focus is paled toward the paper (ink.ts `Haze`), 0 to 1. */
  readonly depth: number;
  readonly ao: boolean;
  /** 0 to 1, how much of the occlusion is laid over the colour. */
  readonly aoStrength: number;
  /** Metres the occlusion gathers over. */
  readonly aoRadius: number;
  /** Degrees above the horizon. */
  readonly sunElevation: number;
  /** Degrees round from the camera's opening view, as `SunAngle.azimuth`. */
  readonly sunAzimuth: number;
  /** The lit face's light as a fraction of its paint (before the shade adds to it). */
  readonly sun: number;
  /** The light every face gets, the shade's floor, as a fraction of its paint. */
  readonly shade: number;
  readonly shadows: boolean;
}

export const DRAWING_DEFAULT: DrawingSpec = {
  colour: true,
  main: 0xc3967f,
  paper: 0xfffcf5,
  cel: true,
  bands: 2,
  bandSoftness: 0.3,
  washed: true,
  lift: 0.2,
  litTint: 0.45,
  shadeTint: 0.55,
  saturation: 0.85,
  softEdges: true,
  farLines: 0.95,
  innerLines: 0.55,
  lineWidth: 1.5,
  lineStrength: 1,
  depth: 0.35,
  ao: true,
  aoStrength: 0.3,
  aoRadius: 1.2,
  sunElevation: 38,
  sunAzimuth: -42,
  sun: 0.55,
  shade: 0.92,
  shadows: true,
};

/** The pen for a drawing: the plain one, or a soft one in a dark of the main colour. */
export function drawingInk(spec: DrawingSpec, base: InkSpec = INK_DEFAULT): InkSpec {
  const lines = {
    paper: spec.paper,
    width: base.width * spec.lineWidth,
    strength: base.strength * spec.lineStrength,
    // Past a storey's framing, where a lattice seen whole starts to close up.
    fadeNear: 150,
    fadeFar: 450,
    fadeFloor: spec.farLines,
    farTint: 0.6,
    gap: 6,
    inner: spec.innerLines,
    crease: 0.75 * spec.innerLines,
  };
  if (!spec.softEdges) return { ...base, ...lines };
  // A grey-brown pencil rather than a chocolate pen.
  const hsl = new Color(spec.main).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const line = new Color().setHSL(hsl.h, hsl.s * 0.25, 0.28, SRGBColorSpace).getHex(SRGBColorSpace);
  return {
    ...base,
    ...lines,
    soften: Math.max(base.soften, 0.8),
    ink: spec.colour ? line : 0x3a3532,
  };
}

/** The wash's shading. */
export function drawingShading(spec: DrawingSpec): WashShading {
  const hsl = new Color(spec.main).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const tint = (dh: number, s: number, l: number): number =>
    new Color().setHSL((((hsl.h + dh) % 1) + 1) % 1, s, l, SRGBColorSpace).getHex(SRGBColorSpace);
  const washed = spec.washed;
  return {
    cel: spec.cel,
    bands: spec.bands,
    softness: spec.bandSoftness,
    // The key is white, so its luminance is its intensity (drawingLook).
    sun: spec.sun * Math.PI,
    // A cream a little round toward yellow, and a pale rose: light shows as
    // a turn of hue more than as a step in value, the shade staying the
    // paint's own colour, paler.
    litTint: tint(0.08, 0.6, 0.88),
    shadeTint: tint(-0.01, 0.28, 0.82),
    litLift: washed ? spec.litTint : 0,
    shadeLift: washed ? spec.shadeTint : 0,
  };
}

/**
 * The lights for a coloured drawing, over `look` (the lit look's, so the
 * shadow and occlusion settings it does not name carry over). One sun and
 * a white hemisphere, both stated as a fraction of the paint they light
 * (three's lambert is paint x light / pi), no environment in the paint, no
 * fog, no ground and no vignette: the drawing stands on the paper.
 */
export function drawingLook(look: Look, spec: DrawingSpec): Look {
  return {
    ...look,
    name: "drawing",
    description: "The coloured drawing: one sun, a white shade, no sky in the paint.",
    exposure: 1,
    fog: null,
    ground: { on: false, color: 0xffffff, roughness: 1 },
    key: {
      ...look.key,
      on: true,
      color: 0xffffff,
      intensity: spec.sun * Math.PI,
      angle: { elevation: spec.sunElevation, azimuth: spec.sunAzimuth },
      shadow: { ...look.key.shadow, on: spec.shadows },
    },
    fill: { ...look.fill, on: false },
    rim: { ...look.rim, on: false },
    bounce: { ...look.bounce, on: false },
    ambient: { intensity: spec.shade * Math.PI, sky: 0xffffff, ground: 0xffffff },
    envIntensity: 0,
    vignette: { on: false, amount: 0, start: 0.4 },
    ao: { ...look.ao, on: spec.ao, blend: spec.aoStrength, radius: spec.aoRadius },
  };
}

/**
 * The pale behind the focus; none without a washed colour to pale (its
 * dial sits with the wash's).
 */
export function drawingHaze(spec: DrawingSpec): Haze | null {
  return spec.colour && spec.washed && spec.depth > 0 ? { amount: spec.depth, depth: 150 } : null;
}

/** What ink.ts does to the wash on the way to the paper; null is no wash. */
export function drawingComposite(spec: DrawingSpec): WashComposite | null {
  if (!spec.colour) return null;
  return spec.washed ? { lift: spec.lift, saturation: spec.saturation } : { lift: 0, saturation: 1 };
}
