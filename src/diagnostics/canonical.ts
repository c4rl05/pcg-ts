/**
 * The list's OWN copy of a name a caller spelled.
 *
 * The twin of `suggestNames` next door, over the same thing — a fixed
 * list of valid names and a value that claims to be one of them. That one
 * answers "which did you mean" when the value is not in the list; this
 * one answers "give me your string" when it is.
 *
 * It lives in `src/diagnostics` for the reason the suggester does: this
 * is a leaf that imports nothing from the rest of the library, and the
 * two callers are in different layers that cannot import each other — the
 * fields grammar (`src/fields/fieldJson.ts`, a noise option) and the
 * graph layer (`src/graph/params.ts`, an enum param schema).
 *
 * Internal, and deliberately not in the barrel.
 */

/**
 * @internal The member of `valid` equal to `value`, or `undefined` when
 * `value` is not a string or is not in the list.
 *
 * WHY IDENTITY, WHEN EQUALITY IS ALREADY TRUE. `"cell" === "cell"` holds
 * whatever the two strings are made of, so this changes no value and no
 * comparison result. What it changes is the string OBJECT the caller goes
 * on to hold. A name that arrives from `JSON.parse`, a concatenation or a
 * host's computation is a freshly allocated string, and a fresh string
 * compared against a source literal inside a per-element loop is the
 * shape V8 miscompiled — see the note in `src/noise/worley.ts`.
 * Handing back the list's own string means that shape cannot form.
 *
 * Returning `undefined` rather than the value is the point of the
 * signature: a caller that must refuse an unknown name gets a test it
 * cannot accidentally pass, and a caller that must accept one writes the
 * fallback itself. Neither gets a silent `undefined` in place of a name.
 *
 * One `indexOf` over a list of at most a handful of names, at the seam
 * where a value arrives — never per element.
 */
export function canonicalOneOf(valid: readonly string[], value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const at = valid.indexOf(value);
  return at < 0 ? undefined : valid[at];
}
