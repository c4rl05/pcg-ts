/**
 * THE PAGE'S DEPTH, read from its query string: how far the lacing and the
 * rivets go, each on its own axis.
 *
 *   off       not drawn: the skeleton's solid members stand in for them
 *   streamed  cooked round the camera as it moves (bands.ts), over the
 *             skeleton cooked whole
 *   whole     cooked for the entire tower at load
 *
 * The rivets never go further than the lacing they sit on: whole rivets
 * make the lacing whole, streamed rivets make it at least streamed. That is
 * a rule of the page, not only of the panel, so a hand-written URL that
 * asks for more rivets than lacing gets the lacing raised to match.
 *
 * THE URL. `?laced` and `?rivets` with no value are whole, as they always
 * were, and `?rivets=full` is whole plus the built-up uprights' rows as
 * built (`Detail.fullRivets`). `=streamed` streams an axis, `=off` is off. `?bands`, the
 * old spelling of "stream both", still is when it stands alone, and carries
 * the two radii in any company (`?bands=<laced m>,<rivets m>`, bands.ts).
 * Nothing streams under `?build`, whose staging dates the whole cook's
 * meshes: a streamed axis reads as off there.
 *
 * One module rather than a block in main.ts, because the golden
 * (tests/support/eiffelGolden.ts) has to cook exactly what the page cooks,
 * and main.ts cannot be imported — it builds a page as it loads.
 */

/** How far one axis is cooked. */
export type Depth = "off" | "streamed" | "whole";

/** The three, in order: a later one is at least as much as an earlier. */
export const DEPTHS: readonly Depth[] = ["off", "streamed", "whole"];

/** What the page's query asks for. */
export interface PageDepth {
  readonly laced: Depth;
  readonly rivets: Depth;
  /** `?rivets=full`: the built-up uprights' rows too. Only with whole rivets. */
  readonly fullRivets: boolean;
  readonly build: boolean;
}

function axis(params: URLSearchParams, name: string, legacy: boolean): Depth {
  const v = params.get(name);
  if (v === null) return legacy ? "streamed" : "off";
  // Bare, `whole` or `full` is whole: a param named is a param asked for.
  return v === "streamed" ? "streamed" : v === "off" ? "off" : "whole";
}

const more = (a: Depth, b: Depth): Depth => (DEPTHS.indexOf(a) >= DEPTHS.indexOf(b) ? a : b);

/** Read the page's depth from its query string. */
export function pageDepth(search: string | URLSearchParams): PageDepth {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const build = params.has("build");
  // `?bands` alone streams both; beside an axis it only carries the radii.
  const legacy = params.has("bands") && !params.has("laced") && !params.has("rivets");
  let rivets = axis(params, "rivets", legacy);
  let laced = more(axis(params, "laced", legacy), rivets);
  if (build) {
    if (rivets === "streamed") rivets = "off";
    if (laced === "streamed") laced = "off";
  }
  return { laced, rivets, fullRivets: rivets === "whole" && params.get("rivets") === "full", build };
}

/** The whole-tower cook a depth asks for: what `buildEiffel` is handed. */
export function cookedDetail(d: PageDepth): {
  lacedWeb: boolean;
  rivets: boolean;
  fullRivets: boolean;
  build: boolean;
} {
  return { lacedWeb: d.laced === "whole", rivets: d.rivets === "whole", fullRivets: d.fullRivets, build: d.build };
}

/** Whether anything is streamed, and which levels. */
export function streamed(d: PageDepth): { laced: boolean; rivets: boolean } | undefined {
  const laced = d.laced === "streamed";
  const rivets = d.rivets === "streamed";
  return laced || rivets ? { laced, rivets } : undefined;
}

/**
 * The query params that spell a depth, in the page's own vocabulary:
 * `laced`, `rivets` (with `=full` kept when asked), `=streamed` per axis.
 * The inverse of {@link pageDepth} for every depth it can return.
 */
export function depthParams(laced: Depth, rivets: Depth, fullRivets = false): string[] {
  const out: string[] = [];
  // Whole rivets already make the lacing whole, so `laced` is left unsaid.
  if (!(rivets === "whole" && laced === "whole")) {
    if (laced === "whole") out.push("laced");
    else if (laced === "streamed") out.push("laced=streamed");
  }
  if (rivets === "whole") out.push(fullRivets ? "rivets=full" : "rivets");
  else if (rivets === "streamed") out.push("rivets=streamed");
  return out;
}
