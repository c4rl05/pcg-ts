/**
 * "Did you mean", as a loader states it: the nearest names, the clause a
 * message carries them in, and the mechanical fix when there is exactly
 * one.
 *
 * Internal and deliberately NOT in the barrel: the fields grammar, the
 * graph layer and the serialized-graph loader all refuse names, and all
 * three need the same wording and the same rule for when a fix is safe —
 * but how a suggestion is phrased is ours to change, and nothing outside
 * the library should come to depend on it.
 */
import { closestNames, editDistance } from "./suggest.js";

/** A refused name's suggestions, ready to spread into a record and a message. */
export interface NameSuggestion {
  /** The nearest names, nearest first; empty when none is close enough. */
  readonly names: readonly string[];
  /**
   * The clause a message inserts BEFORE its list of valid names, with a
   * trailing space — `did you mean "count"? ` — or `""` when there is no
   * suggestion, so a message with none reads exactly as it did before
   * suggestions existed.
   */
  readonly clause: string;
  /**
   * The one name a mechanical fix would write: set only when there is
   * exactly one suggestion and it is at most one edit away, where
   * substituting it cannot plausibly mean something the author did not.
   */
  readonly only?: string;
}

/**
 * The suggestions for `name` among `candidates`.
 *
 * `closestNames` ranks up to three within its distance limit; only the
 * NEAREST tier is kept, so a one-letter slip is not diluted by two names
 * that merely share a prefix (`pointScatterInBound` suggests
 * `pointScatterInBounds` alone, not also `pointScatterInWorld`). Ties inside
 * the tier stay in `closestNames`' code-unit order, so the list is the same
 * on every platform and in every locale.
 */
export function suggestNames(name: string, candidates: Iterable<string>): NameSuggestion {
  const ranked = closestNames(name, candidates, 3);
  if (ranked.length === 0) return { names: [], clause: "" };
  const lower = name.toLowerCase();
  const distance = (c: string): number => editDistance(lower, c.toLowerCase());
  const best = distance(ranked[0] as string);
  const names = ranked.filter((c) => distance(c) === best);
  const quoted = names.map((n) => JSON.stringify(n));
  const listed =
    quoted.length === 1
      ? (quoted[0] as string)
      : `${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1] as string}`;
  return {
    names,
    clause: `did you mean ${listed}? `,
    ...(names.length === 1 && best <= 1 ? { only: names[0] as string } : {}),
  };
}
