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
  /**
   * Mono: every colour the palette generates, the light's tints with them,
   * takes the main colour's hue and saturation and keeps only its own
   * lightness — one colour in steps of value. A grey main colour makes a
   * grey drawing.
   */
  readonly mono: boolean;
  /**
   * The platforms' tone: the floors' fit-out (the `warm` role, wash.ts
   * `washColor`) as a lightness, 0 black to 1 the paper's white.
   */
  readonly platformShade: number;
  /**
   * The floors' undersides' tone: the 1st and 2nd floors' decks seen from
   * below (the `under` role, wash.ts `washColor`) as a lightness, 0 black
   * to 1 the paper's white.
   */
  readonly undersideShade: number;
  /**
   * The temporary works' tone: the erection's timber scaffolds, pylons and
   * decks (the `timber` role, wash.ts `washColor`) as a lightness, 0 black
   * to 1 the paper's white.
   */
  readonly timberShade: number;
  /**
   * The names' tone: the gilded names on the frieze (the `gilt` role, wash.ts
   * `washColor`) as a lightness, 0 black to 1 the paper's white; past 1,
   * brighter than white, so its shaded faces stay light too.
   */
  readonly namesShade: number;
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
  /** The flag's wash (wash.ts `ownWash`): 0 its own colours untouched, 1 the paper. */
  readonly flagWash: number;
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
  /** Metres from the camera where the lines start fading, and where they reach `farLines` (ink.ts `fadeNear`, `fadeFar`). */
  readonly lineFadeNear: number;
  readonly lineFadeFar: number;
  /** The line fade's curve (ink.ts `fadeCurve`): 0 straight, higher arrives later and faster coming in. */
  readonly lineFadeCurve: number;
  /** How much darker the colour goes where the lines have faded (ink.ts `farFill`): 0 none. */
  readonly farFill: number;
  /** Inner contours and creases against the silhouette's weight (ink.ts `inner`, `crease`). */
  readonly innerLines: number;
  /** Line weight in device pixels, over the `?ink=` weight (ink.ts `width`). */
  readonly lineWidth: number;
  /** Line darkness (ink.ts `strength`): past 1 a soft or faint line inks fuller, up to the pen's own colour. */
  readonly lineStrength: number;
  /**
   * Depth fade (ink.ts `Haze`), 0 to 1: how far the tower's farthest point
   * is paled toward the paper, over the depth its bounding box spans from
   * the camera — none at the box's nearest point, wherever the camera is.
   */
  readonly depth: number;
  /** How the fade gathers toward the far end (ink.ts `Haze.falloff`): 0 even, higher keeps more of the near untouched. */
  readonly depthFalloff: number;
  /**
   * Levels over the finished drawing (ink.ts `blackPoint` .. `contrast`):
   * the black and white points, a gamma past 1 lighter in the middle, a
   * contrast past 1 steeper about the middle grey. 0, 1, 1, 1 is none.
   */
  readonly blackPoint: number;
  readonly whitePoint: number;
  readonly gamma: number;
  readonly contrast: number;
  readonly ao: boolean;
  /** 0 to 1, how much of the occlusion is laid over the colour. */
  readonly aoStrength: number;
  /** Metres the occlusion gathers over. */
  readonly aoRadius: number;
  /** A second occlusion over the first, its own strength and radius: one for the joints, one for the depth (rig.ts `ao2`). */
  readonly ao2: boolean;
  readonly ao2Strength: number;
  readonly ao2Radius: number;
  /** Degrees above the horizon. */
  readonly sunElevation: number;
  /** Degrees round from the camera's opening view, as `SunAngle.azimuth`. */
  readonly sunAzimuth: number;
  /** The lit face's light as a fraction of its paint (before the shade adds to it). */
  readonly sun: number;
  /**
   * A second light, shining straight up (`LIGHT2_ANGLE`) and weighed like
   * the sun (rig.ts's fill: it casts no shadow). Its light is cel-stepped
   * and tinted as the sun's is, measured against the sun's strength.
   */
  readonly light2: boolean;
  readonly light2Strength: number;
  /**
   * A third light, level and a quarter turn round from the sun, so square
   * to it, its own strength (rig.ts's rim: it casts no shadow), stepped and
   * tinted as the second light is.
   */
  readonly light3: boolean;
  readonly light3Strength: number;
  /**
   * A fourth light, straight against the sun (rig.ts's bounce: it casts no
   * shadow), its own strength: what the sun leaves in shade, lit from the
   * other side. Stepped and tinted as the second light is.
   */
  readonly light4: boolean;
  readonly light4Strength: number;
  /** The light every face gets, the shade's floor, as a fraction of its paint. */
  readonly shade: number;
  readonly shadows: boolean;
  /** The tower's shadow on the ground, laid on the paper in `shadowColour` (rig.ts `setGroundShadow`). */
  readonly groundShadow: boolean;
  readonly shadowColour: number;
}

/** The second light's aim: from straight below, shining up, as the ground throws the sun back. */
const LIGHT2_ANGLE = { elevation: -90, azimuth: 0 };

/** The ground shadow's default on dark paper and on light: a dark grey on black, a light grey on white. */
export const SHADOW_ON_DARK = 0x333333;
export const SHADOW_ON_LIGHT = 0xd4d4d4;

/** Whether `paper` is light (its sRGB luma past half): which of the two shadow defaults goes with it. */
export function lightPaper(paper: number): boolean {
  const r = (paper >> 16) & 0xff;
  const g = (paper >> 8) & 0xff;
  const b = paper & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 127.5;
}

export const DRAWING_DEFAULT: DrawingSpec = {
  colour: true,
  main: 0xcccccc,
  mono: true,
  platformShade: 1,
  undersideShade: 0.4,
  timberShade: 0.97,
  namesShade: 3,
  paper: 0xffffff,
  cel: false,
  bands: 4,
  bandSoftness: 0.3,
  washed: false,
  lift: 0.2,
  flagWash: 0.3,
  litTint: 0.67,
  shadeTint: 0,
  saturation: 0.85,
  softEdges: false,
  farLines: 0,
  lineFadeNear: 50,
  lineFadeFar: 200,
  lineFadeCurve: 4,
  farFill: 0.12,
  innerLines: 1,
  lineWidth: 1,
  lineStrength: 0.5,
  depth: 1,
  depthFalloff: 4,
  blackPoint: 0.1,
  whitePoint: 0.9,
  gamma: 0.8,
  contrast: 1,
  ao: true,
  aoStrength: 1,
  aoRadius: 3,
  ao2: false,
  ao2Strength: 1,
  ao2Radius: 0.5,
  sunElevation: 57,
  sunAzimuth: -15,
  sun: 1,
  light2: false,
  light2Strength: 0.05,
  light3: false,
  light3Strength: 0.05,
  light4: true,
  light4Strength: 0.25,
  shade: 0.15,
  shadows: true,
  groundShadow: true,
  shadowColour: SHADOW_ON_LIGHT,
};

/** The pen for a drawing: the plain one, or a soft one in a dark of the main colour. */
export function drawingInk(spec: DrawingSpec, base: InkSpec = INK_DEFAULT): InkSpec {
  const lines = {
    paper: spec.paper,
    width: base.width * spec.lineWidth,
    strength: base.strength * spec.lineStrength,
    // Past a storey's framing, where a lattice seen whole starts to close up.
    fadeNear: spec.lineFadeNear,
    fadeFar: Math.max(spec.lineFadeFar, spec.lineFadeNear + 1),
    fadeFloor: spec.farLines,
    fadeCurve: spec.lineFadeCurve,
    farTint: 0.6,
    farFill: spec.farFill,
    gap: 6,
    inner: spec.innerLines,
    crease: 0.75 * spec.innerLines,
    blackPoint: spec.blackPoint,
    whitePoint: Math.max(spec.whitePoint, spec.blackPoint + 0.01),
    gamma: spec.gamma,
    contrast: spec.contrast,
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
    spec.mono
      ? new Color().setHSL(hsl.h, hsl.s, l, SRGBColorSpace).getHex(SRGBColorSpace)
      : new Color().setHSL((((hsl.h + dh) % 1) + 1) % 1, s, l, SRGBColorSpace).getHex(SRGBColorSpace);
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
 * shadow and occlusion settings it does not name carry over). One sun,
 * optional shadowless second, third and fourth lights and a white hemisphere, all stated as a fraction of the paint they light
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
    fill: {
      on: spec.light2,
      color: 0xffffff,
      intensity: spec.light2Strength * Math.PI,
      angle: LIGHT2_ANGLE,
    },
    rim: {
      on: spec.light3,
      color: 0xffffff,
      intensity: spec.light3Strength * Math.PI,
      // Level, a quarter turn round: square to the sun at any height.
      angle: { elevation: 0, azimuth: spec.sunAzimuth + 90 },
    },
    bounce: {
      on: spec.light4,
      color: 0xffffff,
      intensity: spec.light4Strength * Math.PI,
      // Straight against the sun: as far below the horizon, half a turn round.
      angle: { elevation: -spec.sunElevation, azimuth: spec.sunAzimuth + 180 },
    },
    ambient: { intensity: spec.shade * Math.PI, sky: 0xffffff, ground: 0xffffff },
    envIntensity: 0,
    vignette: { on: false, amount: 0, start: 0.4 },
    ao: { ...look.ao, on: spec.ao, blend: spec.aoStrength, radius: spec.aoRadius },
    ao2: { ...look.ao, on: spec.ao2, blend: spec.ao2Strength, radius: spec.ao2Radius },
  };
}

/** The depth fade, over the colour or the plain pen alike. */
export function drawingHaze(spec: DrawingSpec): Haze | null {
  return spec.depth > 0 ? { amount: spec.depth, falloff: spec.depthFalloff } : null;
}

/** What ink.ts does to the wash on the way to the paper; null is no wash. */
export function drawingComposite(spec: DrawingSpec): WashComposite | null {
  if (!spec.colour) return null;
  return spec.washed ? { lift: spec.lift, saturation: spec.saturation } : { lift: 0, saturation: 1 };
}
