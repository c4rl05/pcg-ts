/**
 * A 5×7 bitmap font, built in, for the frames' tile labels.
 *
 * No font file and no text shaping: every glyph is seven rows of five bits,
 * written out below, so a label's pixels are as fixed as the rest of the
 * frame. The set is what the labels need — upper case, the few lower-case
 * letters the axis hints use, digits, a little punctuation and four
 * arrows — and anything outside it draws as `?` rather than as nothing.
 */

/** Rows top to bottom, `#` lit. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "→": [".....", "..#..", "...#.", "#####", "...#.", "..#..", "....."],
  "←": [".....", "..#..", ".#...", "#####", ".#...", "..#..", "....."],
  "↑": ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#..", "..#.."],
  "↓": ["..#..", "..#..", "..#..", "..#..", "#.#.#", ".###.", "..#.."],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Advance per character: the glyph plus one column of space. */
const ADVANCE = GLYPH_WIDTH + 1;

/** Characters the font draws; everything else draws as `?`. */
export const FONT_CHARACTERS: readonly string[] = Object.keys(GLYPHS);

/** Width in pixels of `text` drawn at `scale`, without padding. */
export function textWidth(text: string, scale: number): number {
  const n = [...text].length;
  return n === 0 ? 0 : (n * ADVANCE - 1) * scale;
}

/**
 * Draw a label onto an RGB image: a filled box `pad` pixels around the text,
 * then the text, each font pixel a `scale × scale` square. Everything is
 * clipped to the rectangle `clip` (x, y, width, height), so a label never
 * spills into a neighbouring tile.
 */
export function drawLabel(
  image: Uint8Array,
  imageWidth: number,
  text: string,
  x: number,
  y: number,
  scale: number,
  pad: number,
  clip: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  textRgb: number,
  boxRgb: number,
): void {
  const fill = (px: number, py: number, rgb: number): void => {
    if (px < clip.x || py < clip.y || px >= clip.x + clip.width || py >= clip.y + clip.height) return;
    const o = (py * imageWidth + px) * 3;
    image[o] = (rgb >> 16) & 255;
    image[o + 1] = (rgb >> 8) & 255;
    image[o + 2] = rgb & 255;
  };
  const boxW = textWidth(text, scale) + 2 * pad;
  const boxH = GLYPH_HEIGHT * scale + 2 * pad;
  for (let py = y; py < y + boxH; py++) for (let px = x; px < x + boxW; px++) fill(px, py, boxRgb);
  let cursor = x + pad;
  for (const ch of text) {
    const rows = GLYPHS[ch] ?? GLYPHS["?"];
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      for (let col = 0; col < GLYPH_WIDTH; col++) {
        if (rows[row][col] !== "#") continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) fill(cursor + col * scale + sx, y + pad + row * scale + sy, textRgb);
        }
      }
    }
    cursor += ADVANCE * scale;
  }
}
