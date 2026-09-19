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

/** The shortest stub that may stand in for a longer name. */
const MIN_PREFIX = 2;
/** How much longer the full name may be than the stub, as a multiple. */
const MAX_GROWTH = 3;

/**
 * Is one of these names a whole prefix of the other, close enough in length
 * that the shorter reads as a stand-in for the longer?
 *
 * The case Levenshtein cannot see. `--out` typed as `--output` is a SUFFIX
 * SLIP — the writer remembered a longer word for the same thing — and edit
 * distance scores it 3, which for a six-letter name is the same budget two
 * unrelated names get. Measured: `closestNames("output", ["out", …])` kept
 * nothing at all, so `pcg cook --output x.json` named the valid flags and
 * suggested none of them, and four eval runs guessed `--output`/`--outputs`
 * without ever being pointed at `--out`.
 *
 * THE LENGTH CAP IS WHAT KEEPS THIS HONEST, and a bare character floor did
 * not. A prefix on its own makes `"exp"` a suggestion for `"expression"` —
 * an author who writes "expression" means an expression, not the
 * exponential — and `"attributeRemap"` a suggestion for `"att"`, eleven
 * edits away and presented as a did-you-mean. Requiring the full name to be
 * at most {@link MAX_GROWTH}x the stub drops both while keeping every case
 * this rule exists for: out/output, in/input, max/maximum, min/minimum,
 * mul/multiply, sub/subtract, abs/absolute, exp/exponent,
 * perlinNoise/perlin. Two characters is then a safe floor, because a
 * two-letter stub can only reach a six-letter name — `in` finds `input`,
 * and cannot reach `inbound`.
 */
function prefixSlip(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return (
    short.length >= MIN_PREFIX &&
    short.length < long.length &&
    long.length <= short.length * MAX_GROWTH &&
    long.startsWith(short)
  );
}

/**
 * The candidates closest to `name`, nearest first, at most `max`.
 *
 * Distance is measured case-insensitively, so a candidate that differs
 * only in case is at distance zero and always leads. A candidate is kept
 * when its distance is at most a third of `name`'s length, and never less
 * than 2 — a short name still gets a suggestion for a two-letter slip —
 * or when it is a {@link prefixSlip} of it, which is the near miss edit
 * distance is blind to.
 *
 * A prefix slip keeps its REAL distance for ranking, so it never displaces
 * an ordinary one-letter typo, and it stays far enough away that
 * `suggestNames` will not offer it as a mechanical fix.
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
    const other = candidate.toLowerCase();
    const d = editDistance(lower, other);
    if (d <= limit || prefixSlip(lower, other)) scored.push({ candidate, d });
  }
  return scored
    .sort((a, b) => a.d - b.d || codeUnitCompare(a.candidate, b.candidate))
    .slice(0, Math.max(0, max))
    .map((s) => s.candidate);
}
