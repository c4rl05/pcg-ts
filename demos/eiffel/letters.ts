/**
 * Capital letters as generated outlines: a grotesque (sans-serif) alphabet
 * built from strokes and elliptical rings, and a line setter that fits a
 * word into a given width. No font is read or embedded: every glyph is
 * constructed here, the way the logo's glyphs are generated rather than
 * drawn from a typeface.
 *
 * WHY A GROTESQUE. The frieze's letters are plain capitals of even weight,
 * with no serifs and no contrast worth the name: a round C and O, a flat
 * apex on the A, an R with a straight leg [observed on photographs of the
 * frieze as restored in 1986-87: the south-east face's panorama and the
 * Cauchy close-up on Commons, the north-east and south-west faces'; the
 * 1889 photographs are too coarse to read a letterform]. The weights and
 * widths below are this module's own [estimated], set to those photographs:
 * the stem about a seventh of the cap height, the O three quarters of it.
 *
 * THE UNITS. A glyph is drawn with its cap height 1, its baseline at y = 0,
 * and its ink starting at x = 0; its advance is its ink's width, and the
 * spacing between letters is the setter's (`setLine`), so a name can be
 * tracked tighter or condensed to fit without a glyph knowing.
 *
 * THE PIECES. A glyph is a list of CONVEX polygons, each counter-clockwise
 * (x right, y up), which may overlap: a stem, a bar, a stroke with
 * horizontal ends, or one segment of a ring. Each extrudes to a closed
 * solid on its own; their union is the letter, so pieces may overlap and a
 * letter with a counter (O, B, R) has no hole to cut. One outline per
 * letter would need that union computed first (polygonBoolean, where the
 * frieze is built).
 *
 * Only the characters the tower's names use are needed, but the alphabet is
 * whole — A to Z, the hyphen and the space — so the module can serve any
 * capital text. The tower's inscriptions carry no accents (HAUY, THENARD,
 * AMPERE, LAME: see `savants.ts`), so there are no accented glyphs; a
 * character outside the alphabet is refused by name.
 *
 * Pure geometry; deterministic, no randomness and nothing read at runtime.
 * Demo-local on purpose: a library node (text to outlines on a domain)
 * would want kerning, more than one weight and a param schema, which the
 * frieze does not need, and nothing outside this demo sets text yet.
 */

/** A point in a glyph's plane. */
export type Pt2 = readonly [number, number];
/** A convex polygon, counter-clockwise. */
export type Piece = readonly Pt2[];

/** A glyph: its pieces and its advance (its ink's width), in cap heights. */
export interface Glyph {
  readonly pieces: readonly Piece[];
  readonly advance: number;
}

/** Stem (vertical stroke) width [estimated, set to the photographs]. */
const STEM = 0.14;
/** Horizontal bar thickness: a grotesque's bars run a little lighter than its stems [estimated]. */
const BAR = 0.12;
/** A diagonal stroke's width, measured square to the stroke [estimated]. */
const DIAG = 0.13;
/** A ring's thickness at its sides and at its top and bottom [estimated]. */
const RING_X = 0.15;
const RING_Y = 0.12;
/** The largest angle one ring segment spans: 18 degrees, so a full O is 20 quads. */
const RING_STEP = Math.PI / 10;

/** The rectangle [x0, x1] x [y0, y1]. */
function rect(x0: number, y0: number, x1: number, y1: number): Piece {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/**
 * A straight stroke `w` wide (square to its axis) whose centre line runs
 * from (x0, y0) to (x1, y1), its ends cut horizontally at those heights: a
 * parallelogram, so a diagonal sits flat on the baseline and the cap line.
 */
function stroke(x0: number, y0: number, x1: number, y1: number, w = DIAG): Piece {
  if (y1 < y0) return stroke(x1, y1, x0, y0, w);
  const h = ((w / 2) * Math.hypot(x1 - x0, y1 - y0)) / (y1 - y0);
  return [
    [x0 - h, y0],
    [x0 + h, y0],
    [x1 + h, y1],
    [x1 - h, y1],
  ];
}

/**
 * An elliptical ring's arc from angle a0 to a1 (radians, counter-clockwise
 * from +x), centred on (cx, cy): outer radii (rx, ry), thickness (tx, ty),
 * so the inner radii are (rx - tx, ry - ty). As quads no wider than
 * RING_STEP, each convex and counter-clockwise.
 */
function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  tx = RING_X,
  ty = RING_Y,
): Piece[] {
  const n = Math.max(1, Math.ceil((a1 - a0) / RING_STEP - 1e-9));
  const at = (t: number, sx: number, sy: number): Pt2 => [cx + sx * Math.cos(t), cy + sy * Math.sin(t)];
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    out.push([at(t0, rx, ry), at(t1, rx, ry), at(t1, rx - tx, ry - ty), at(t0, rx - tx, ry - ty)]);
  }
  return out;
}

const DEG = Math.PI / 180;

/**
 * The glyphs' constructions, each with its nominal width W (in cap
 * heights; the advance is the ink's measured width, which the strokes'
 * cut ends can widen by a hair).
 */
const BUILD: Record<string, { width: number; draw: (W: number) => Piece[] }> = {
  A: {
    width: 0.64,
    draw: (W) => {
      const foot = 0.085;
      const xl = (y: number) => foot + (W / 2 - foot) * y;
      return [stroke(foot, 0, W / 2, 1), stroke(W - foot, 0, W / 2, 1), rect(xl(0.28), 0.22, W - xl(0.28), 0.34)];
    },
  },
  B: {
    width: 0.54,
    draw: (W) => {
      const cu = W - 0.04 - 0.23;
      const cl = W - 0.26;
      return [
        rect(0, 0, STEM, 1),
        rect(0, 1 - RING_Y, cu, 1),
        rect(0, 0.46, cl, 0.46 + RING_Y),
        rect(0, 0, cl, RING_Y),
        ...ring(cu, 0.73, 0.23, 0.27, -90 * DEG, 90 * DEG),
        ...ring(cl, 0.29, 0.26, 0.29, -90 * DEG, 90 * DEG),
      ];
    },
  },
  C: { width: 0.58, draw: (W) => ring(W / 2, 0.5, W / 2, 0.5, 42 * DEG, 318 * DEG) },
  D: {
    width: 0.6,
    draw: (W) => {
      const rx = 0.36;
      const cx = W - rx;
      return [
        rect(0, 0, STEM, 1),
        rect(0, 1 - RING_Y, cx, 1),
        rect(0, 0, cx, RING_Y),
        ...ring(cx, 0.5, rx, 0.5, -90 * DEG, 90 * DEG),
      ];
    },
  },
  E: {
    width: 0.5,
    draw: (W) => [
      rect(0, 0, STEM, 1),
      rect(0, 1 - BAR, W, 1),
      rect(0, 0.44, W - 0.04, 0.44 + BAR),
      rect(0, 0, W, BAR),
    ],
  },
  F: {
    width: 0.48,
    draw: (W) => [rect(0, 0, STEM, 1), rect(0, 1 - BAR, W, 1), rect(0, 0.42, W - 0.05, 0.42 + BAR)],
  },
  G: {
    width: 0.62,
    draw: (W) => [
      ...ring(W / 2, 0.5, W / 2, 0.5, 40 * DEG, 360 * DEG),
      rect(W * 0.52, 0.4, W, 0.4 + BAR),
      rect(W - RING_X, 0.12, W, 0.4 + BAR),
    ],
  },
  H: {
    width: 0.58,
    draw: (W) => [rect(0, 0, STEM, 1), rect(W - STEM, 0, W, 1), rect(0, 0.44, W, 0.44 + BAR)],
  },
  I: { width: STEM, draw: () => [rect(0, 0, STEM, 1)] },
  J: {
    width: 0.46,
    draw: (W) => [rect(W - STEM, 0.3, W, 1), ...ring(W / 2, 0.3, W / 2, 0.3, 200 * DEG, 360 * DEG, STEM)],
  },
  K: {
    width: 0.58,
    draw: (W) => [rect(0, 0, STEM, 1), stroke(STEM, 0.3, W - 0.09, 1), stroke(W - 0.09, 0, 0.3, 0.56)],
  },
  L: { width: 0.46, draw: (W) => [rect(0, 0, STEM, 1), rect(0, 0, W, BAR)] },
  M: {
    width: 0.72,
    draw: (W) => [
      rect(0, 0, STEM, 1),
      rect(W - STEM, 0, W, 1),
      stroke(W / 2, 0, 0.1, 1, 0.12),
      stroke(W / 2, 0, W - 0.1, 1, 0.12),
    ],
  },
  N: {
    width: 0.6,
    draw: (W) => [rect(0, 0, STEM, 1), rect(W - STEM, 0, W, 1), stroke(W - 0.09, 0, 0.09, 1)],
  },
  O: { width: 0.66, draw: (W) => ring(W / 2, 0.5, W / 2, 0.5, 0, 360 * DEG) },
  P: {
    width: 0.54,
    draw: (W) => {
      const cx = W - 0.26;
      return [
        rect(0, 0, STEM, 1),
        rect(0, 1 - RING_Y, cx, 1),
        rect(0, 0.42, cx, 0.42 + RING_Y),
        ...ring(cx, 0.71, 0.26, 0.29, -90 * DEG, 90 * DEG),
      ];
    },
  },
  Q: {
    width: 0.66,
    draw: (W) => [...ring(W / 2, 0.5, W / 2, 0.5, 0, 360 * DEG), stroke(W * 0.94, -0.05, W * 0.6, 0.26, 0.12)],
  },
  R: {
    width: 0.56,
    draw: (W) => {
      const cx = W - 0.05 - 0.25;
      return [
        rect(0, 0, STEM, 1),
        rect(0, 1 - RING_Y, cx, 1),
        rect(0, 0.43, cx, 0.43 + RING_Y),
        ...ring(cx, 0.715, 0.25, 0.285, -90 * DEG, 90 * DEG),
        stroke(W - 0.08, 0, cx + 0.06, 0.46, STEM),
      ];
    },
  },
  S: {
    width: 0.52,
    draw: (W) => [
      // The upper bowl, from its terminal over the top and down the left to
      // the spine; the lower from the spine down the right and under to its
      // terminal. The two meet on one 0.47-0.59 band, the spine.
      ...ring(W / 2, 0.735, W / 2 - 0.02, 0.265, 25 * DEG, 270 * DEG),
      ...ring(W / 2, 0.295, W / 2, 0.295, -155 * DEG, 90 * DEG),
    ],
  },
  T: { width: 0.56, draw: (W) => [rect(0, 1 - BAR, W, 1), rect((W - STEM) / 2, 0, (W + STEM) / 2, 1 - BAR / 2)] },
  U: {
    width: 0.58,
    draw: (W) => [
      rect(0, 0.32, STEM, 1),
      rect(W - STEM, 0.32, W, 1),
      ...ring(W / 2, 0.32, W / 2, 0.32, 180 * DEG, 360 * DEG, STEM),
    ],
  },
  V: { width: 0.62, draw: (W) => [stroke(W / 2, 0, 0.085, 1), stroke(W / 2, 0, W - 0.085, 1)] },
  W: {
    width: 0.88,
    draw: (W) => [
      stroke(W * 0.25, 0, 0.07, 1, 0.12),
      stroke(W * 0.25, 0, W / 2, 1, 0.12),
      stroke(W * 0.75, 0, W / 2, 1, 0.12),
      stroke(W * 0.75, 0, W - 0.07, 1, 0.12),
    ],
  },
  X: { width: 0.6, draw: (W) => [stroke(0.085, 0, W - 0.085, 1), stroke(W - 0.085, 0, 0.085, 1)] },
  Y: {
    width: 0.62,
    draw: (W) => [
      stroke(W / 2, 0.44, 0.085, 1),
      stroke(W / 2, 0.44, W - 0.085, 1),
      rect((W - STEM) / 2, 0, (W + STEM) / 2, 0.48),
    ],
  },
  Z: {
    width: 0.52,
    draw: (W) => [rect(0, 1 - BAR, W, 1), rect(0, 0, W, BAR), stroke(0.09, BAR / 2, W - 0.09, 1 - BAR / 2)],
  },
  "-": { width: 0.34, draw: (W) => [rect(0, 0.4, W, 0.4 + BAR)] },
  " ": { width: 0.28, draw: () => [] },
};

/** Every character the alphabet draws. */
export const ALPHABET: string = Object.keys(BUILD).join("");

/** The glyphs, built once: each shifted so its ink starts at x = 0. */
const GLYPHS: ReadonlyMap<string, Glyph> = new Map(
  Object.entries(BUILD).map(([ch, { width, draw }]): [string, Glyph] => {
    const pieces = draw(width);
    if (pieces.length === 0) return [ch, { pieces, advance: width }];
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pieces) for (const [x] of p) (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
    return [ch, { pieces: pieces.map((p) => p.map(([x, y]): Pt2 => [x - lo, y])), advance: hi - lo }];
  }),
);

/** One character's glyph; a character outside the alphabet is refused by name. */
export function glyph(ch: string): Glyph {
  const g = GLYPHS.get(ch);
  if (g === undefined) {
    throw new Error(
      `letters.ts: no glyph for ${JSON.stringify(ch)} (U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}); ` +
        `the alphabet is ${JSON.stringify(ALPHABET)}: capitals without accents, the hyphen and the space`,
    );
  }
  return g;
}

/** How `setLine` fits a line: all lengths in cap heights except `height` and `width`. */
export interface LineFit {
  /** Cap height, in the output's units. */
  readonly height: number;
  /** The width the line must not exceed, in the output's units. */
  readonly width: number;
  /** The space between letters when the line fits at it. */
  readonly tracking: number;
  /** The tightest the letters are tracked before they are condensed. */
  readonly minTracking: number;
  /** The narrowest the letters are condensed (a scale across) before the line is refused. */
  readonly minCondense: number;
}

/** A set line: its pieces, centred across on x = 0 with the baseline at y = 0, and how it was fitted. */
export interface SetLine {
  readonly pieces: readonly Piece[];
  /**
   * The same line as glyphs placed: each character (spaces included) and
   * where its ink starts across, in the output's units. A glyph's pieces
   * scaled by (`condense` x `height`, `height`) and moved there are its
   * share of `pieces`, which is how a caller can build each glyph once and
   * copy it.
   */
  readonly placed: ReadonlyArray<{ readonly ch: string; readonly x: number }>;
  /** The ink's width, as set. */
  readonly width: number;
  /** The tracking used, in cap heights. */
  readonly tracking: number;
  /** The scale across applied to every glyph (1 when none was needed). */
  readonly condense: number;
}

/**
 * Set `text` as one line of capitals under `fit`: at `fit.tracking` if it
 * fits; else tracked tighter, down to `fit.minTracking`; else condensed
 * across (letters and space alike, the tracking held at its minimum) until
 * it fits. A line that would need condensing past `fit.minCondense` is
 * refused, naming the text and what it would need. The fitted line is
 * centred on x = 0, so it sits in the middle of whatever it is set on.
 */
export function setLine(text: string, fit: LineFit): SetLine {
  const chars = [...text];
  if (chars.length === 0) throw new Error("letters.ts setLine: the text is empty; give it at least one character");
  const glyphs = chars.map(glyph);
  const ink = glyphs.reduce((s, g) => s + g.advance, 0);
  const gaps = chars.length - 1;
  const room = fit.width / fit.height;
  let tracking = fit.tracking;
  let condense = 1;
  if (ink + gaps * tracking > room) {
    tracking = gaps > 0 ? Math.max(fit.minTracking, (room - ink) / gaps) : 0;
    if (ink + gaps * tracking > room) {
      tracking = fit.minTracking;
      condense = (room - gaps * tracking) / ink;
      if (!(condense >= fit.minCondense)) {
        throw new Error(
          `letters.ts setLine: ${JSON.stringify(text)} needs condensing to ${condense.toFixed(3)} to fit ` +
            `${fit.width} at cap height ${fit.height}, past minCondense ${fit.minCondense}; ` +
            `widen the line, lower the cap height or allow a narrower condense`,
        );
      }
    }
  }
  const total = condense * ink + gaps * tracking;
  const pieces: Piece[] = [];
  const placed: Array<{ ch: string; x: number }> = [];
  let x = -total / 2;
  glyphs.forEach((g, i) => {
    placed.push({ ch: chars[i] as string, x: x * fit.height });
    for (const p of g.pieces) {
      pieces.push(p.map(([px, py]): Pt2 => [(x + px * condense) * fit.height, py * fit.height]));
    }
    x += g.advance * condense + tracking;
  });
  return { pieces, placed, width: total * fit.height, tracking, condense };
}
