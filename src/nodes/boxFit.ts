/**
 * The `fit` vocabulary of the box nodes — `splitBox`, `shellSplit`,
 * `placeBox`, `offsetBox` — with ONE meaning per word across all four, so
 * a value learned on one node means the same on the next. Internal: not
 * re-exported from `src/nodes/index.ts`.
 *
 * Each node accepts the words that mean something for it and refuses the
 * rest, naming its own list:
 *
 * | word  | meaning                                                       | splitBox | shellSplit | placeBox | offsetBox |
 * |-------|---------------------------------------------------------------|----------|------------|----------|-----------|
 * | error | refuse the cook, naming the cell and the numbers              | yes      | yes        | yes      | yes       |
 * | allow | write the result as computed                                  |          |            | yes      | yes       |
 * | scale | rescale what does not fit, in proportion, until it fits       | yes      | yes        |          | yes       |
 * | clamp | slide the box back inside, keeping its size; one larger than the limit is cut to it |          |            | yes      |           |
 * | clip  | cut away what passes the limit; nothing moves or rescales     | yes      | yes        | yes      |           |
 *
 * "clip" on splitBox and shellSplit is the same cut as on placeBox: the
 * pieces are laid in order from their start (splitBox's segments from the
 * `direction` end, shellSplit's min-side face before its max-side face),
 * and whatever passes the limit — the box's far end, or the face laid
 * before it — is cut there. That the earlier piece keeps its size is the
 * order the pieces are laid in, not a second meaning of the word.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";

/** Every `fit` word, in glossary order. */
export const FIT_WORDS = ["error", "allow", "scale", "clamp", "clip"] as const;
export type FitWord = (typeof FIT_WORDS)[number];

const MEANING: Record<FitWord, string> = {
  error: '"error" refuses the cook, naming the cell and the numbers',
  allow: '"allow" writes the result as computed',
  scale: '"scale" rescales what does not fit, in proportion, until it fits exactly',
  clamp: '"clamp" slides the box back inside, keeping its size, and cuts a box larger than its limit to the limit',
  clip: '"clip" cuts away what passes the limit and keeps the rest, nothing moved or rescaled',
};

/**
 * The glossary sentence a node's description carries: every word's one
 * meaning, then which of them this node takes.
 */
export function fitGlossary(accepted: readonly FitWord[]): string {
  return `FIT GLOSSARY, one meaning per word across splitBox, shellSplit, placeBox and offsetBox: ${FIT_WORDS.map((w) => MEANING[w]).join("; ")}. This node takes ${accepted.map((w) => `"${w}"`).join(", ")}.`;
}

/**
 * A `fit` value this node refused: the message names the node's own list
 * and, for a glossary word it does not take, why not.
 */
export function fitRefusal(node: string, value: unknown, accepted: readonly FitWord[], why: Partial<Record<FitWord, string>>): string {
  const word = canonicalOneOf(FIT_WORDS, value) as FitWord | undefined;
  const because = word === undefined ? undefined : why[word];
  const reason = word === undefined || because === undefined ? "" : ` On the other box nodes ${MEANING[word]}; here ${because}.`;
  return `${node}: param "fit" is ${JSON.stringify(value)}; valid: ${accepted.join(", ")}.${reason}`;
}
