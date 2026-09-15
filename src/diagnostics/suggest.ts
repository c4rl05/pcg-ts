/**
 * "Did you mean": the nearest accepted names to one that was refused.
 *
 * Internal — deliberately not a root export. The suggestions a caller
 * sees are the `didYouMean` of a diagnostic; how they are ranked is ours
 * to change.
 */

/** Levenshtein distance between two strings, in UTF-16 code units. */
export function editDistance(a: string, b: string): number {
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sub = (prev[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, sub);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j] as number;
  }
  return prev[b.length] as number;
}

/** Code-unit order: the same on every platform and in every locale. */
function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The candidates closest to `name`, nearest first, at most `max`.
 *
 * Distance is measured case-insensitively, so a candidate that differs
 * only in case is at distance zero and always leads. A candidate is kept
 * when its distance is at most a third of `name`'s length, and never less
 * than 2 — a short name still gets a suggestion for a two-letter slip.
 *
 * Ties break by code-unit order, NOT `localeCompare`: collation depends on
 * the host's locale data, and a suggestion list that reorders between two
 * machines breaks the byte-identical promise for every message that
 * quotes it. Duplicate candidates are kept as given.
 */
export function closestNames(name: string, candidates: Iterable<string>, max = 3): string[] {
  const lower = name.toLowerCase();
  const limit = Math.max(2, Math.floor(name.length / 3));
  const scored: { readonly candidate: string; readonly d: number }[] = [];
  for (const candidate of candidates) {
    const d = editDistance(lower, candidate.toLowerCase());
    if (d <= limit) scored.push({ candidate, d });
  }
  return scored
    .sort((a, b) => a.d - b.d || codeUnitCompare(a.candidate, b.candidate))
    .slice(0, Math.max(0, max))
    .map((s) => s.candidate);
}
