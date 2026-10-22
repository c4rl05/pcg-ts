/**
 * BOX NAMES: the grammar's names for the box of the element a field is
 * evaluated on — `{ fn: "box", name: "x0" }` — and the expression each one
 * stands for.
 *
 * WHY THEY EXIST. A cell in this library is a point whose box is the
 * standard `boundsMin`/`boundsMax` pair, and a field that rewrites a box
 * (a setBounds corner, a splitBox size) keeps needing that box's corners
 * and sizes. Without names for them an author re-derives them every time:
 * the brick house graph binds the same eleven names in nineteen `let`s,
 * and its generator carries an optimiser just to decide which of them to
 * bind. A `let` names a subexpression of ONE expression; these name the
 * eleven (and five more) that every box expression shares.
 *
 * WHAT THEY ARE: notation. Each name is exactly the expression in
 * {@link BOX_EXPANSIONS} — the same `Field.key`, the same bytes on the CPU,
 * the same WGSL under the same kernel key — so a box name changes nothing a
 * cook can observe except how the graph reads. `tests/boxNames.test.ts`
 * holds them to that over the corpus, the way `tests/letCorpus.test.ts`
 * holds `let`.
 *
 * WHY A FN AND NOT BARE NAMES. `box` is spelled like `attribute`, `var` and
 * `param` — a fn and a `name` — so it lives in the fn namespace and cannot
 * collide with anything an author names: a `let` may bind `x0` and still
 * read `{fn: "box", name: "x0"}` beside it, and an attribute called `sx`
 * stays `attribute("sx")`. Bare names would have had to choose between
 * shadowing (a binding silently changing what `x0` means) and refusing a
 * name the corpus already binds by the dozen.
 *
 * A leaf: imports nothing but the spec type, so the parser (`fieldJson.ts`)
 * and the WGSL compiler (`src/gpu/compile.ts`) read the one table.
 */
import type { FieldSpec } from "./spec.js";

/**
 * Every box name, in the order the catalog prints them: the two corners
 * and the size and centre as vec3s, then each as three scalars.
 */
export const BOX_NAMES = [
  "lo",
  "hi",
  "size",
  "center",
  "x0",
  "y0",
  "z0",
  "x1",
  "y1",
  "z1",
  "sx",
  "sy",
  "sz",
  "cx",
  "cy",
  "cz",
] as const;

/** One box name. */
export type BoxName = (typeof BOX_NAMES)[number];

/** The standard attribute each corner lives in. */
export const BOX_MIN_ATTR = "boundsMin";
export const BOX_MAX_ATTR = "boundsMax";

const LO: FieldSpec = { fn: "attribute", name: BOX_MIN_ATTR, tupleSize: 3 };
const HI: FieldSpec = { fn: "attribute", name: BOX_MAX_ATTR, tupleSize: 3 };
const comp = (of: FieldSpec, index: number): FieldSpec => ({ fn: "component", args: [of], index });
const half = (a: FieldSpec, b: FieldSpec): FieldSpec => ({ fn: "mul", args: [0.5, { fn: "add", args: [a, b] }] });

/**
 * The expression each name stands for, as the grammar spells it. This IS
 * the definition: the parser builds exactly this field (`fieldJson.ts`
 * pins its combinator build to it), and the compiler lowers exactly this
 * spec. The spellings are the ones the corpus already wrote by hand —
 * `x0` is `component(attribute("boundsMin", 3), 0)`, `sx` is `x1 - x0`,
 * `center` is `0.5 * (lo + hi)` — so a graph that switches to the names
 * keeps its keys.
 */
export const BOX_EXPANSIONS: Readonly<Record<BoxName, FieldSpec>> = {
  lo: LO,
  hi: HI,
  size: { fn: "sub", args: [HI, LO] },
  center: half(LO, HI),
  x0: comp(LO, 0),
  y0: comp(LO, 1),
  z0: comp(LO, 2),
  x1: comp(HI, 0),
  y1: comp(HI, 1),
  z1: comp(HI, 2),
  sx: { fn: "sub", args: [comp(HI, 0), comp(LO, 0)] },
  sy: { fn: "sub", args: [comp(HI, 1), comp(LO, 1)] },
  sz: { fn: "sub", args: [comp(HI, 2), comp(LO, 2)] },
  cx: half(comp(LO, 0), comp(HI, 0)),
  cy: half(comp(LO, 1), comp(HI, 1)),
  cz: half(comp(LO, 2), comp(HI, 2)),
};

/** What each name means, for the catalog and the errors. */
export const BOX_NAME_DOCS: Readonly<Record<BoxName, string>> = {
  lo: "the min corner, vec3 (boundsMin)",
  hi: "the max corner, vec3 (boundsMax)",
  size: "hi - lo, vec3",
  center: "0.5 * (lo + hi), vec3",
  x0: "lo's x",
  y0: "lo's y",
  z0: "lo's z",
  x1: "hi's x",
  y1: "hi's y",
  z1: "hi's z",
  sx: "x1 - x0",
  sy: "y1 - y0",
  sz: "z1 - z0",
  cx: "0.5 * (x0 + x1)",
  cy: "0.5 * (y0 + y1)",
  cz: "0.5 * (z0 + z1)",
};

/**
 * Which corners a name reads: the min corner (`lo`, `x0`…), the max corner
 * (`hi`, `x1`…), or both. Decided per NAME, once, where the field is built.
 */
export function boxCornersRead(name: BoxName): { readonly min: boolean; readonly max: boolean } {
  const min = name === "lo" || name === "x0" || name === "y0" || name === "z0";
  const max = name === "hi" || name === "x1" || name === "y1" || name === "z1";
  return min ? { min: true, max: false } : max ? { min: false, max: true } : { min: true, max: true };
}
