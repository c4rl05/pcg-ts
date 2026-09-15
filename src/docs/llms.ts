/**
 * Drift checks for `docs/llms-full.txt`, the hand-written agent-facing
 * guide. (The root `llms.txt` is its generated index: see `agentRules.ts`.)
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A GENERATOR. Every other catalog
 * under `docs/` is rendered from the registry by `npm run docs`, so it
 * cannot go stale without CI noticing. `llms-full.txt` is the exception: it is
 * prose about mechanisms, and the one-line-per-node text is an
 * independent hand compression, not the registry `description` reworded.
 * `spawnInstances` runs over a thousand words here against the registry's
 * two hundred and states facts no description carries. Nothing can
 * generate that, and a generator that tried would delete the part worth
 * reading.
 *
 * What CAN be derived is the SET OF NAMES the prose is written about, and
 * that set is exactly what rots — a node ships, its bullet is never
 * written, and the agent-facing docs quietly describe a smaller library
 * than the one installed. Measured when this module was added
 * (2026-09-08): 17 of 59 node types, 3 of 37 primitives and 1 of 63 field
 * functions had no entry, and fourteen sentences quoted a count that the
 * registry had moved past — the field-capable param sweep was off by
 * more than half. The names had been missing for one coherent wave of
 * work (the path/network nodes), which is the shape this catches: not
 * scattered rot, but a whole feature invisible to an agent reading the
 * docs we point agents at.
 *
 * So: coverage is asserted, prose is not. A missing name fails with the
 * name; the sentence about it stays a person's job.
 *
 * Numbers are checked elsewhere. `COUNT_CLAIMS` in site.ts already reads
 * repo-relative pages (`page` is relative to the repository root for
 * exactly this reason) and the llms-full.txt count claims live there, beside
 * the site's, so there is one table and one failure style for "a
 * sentence states a number that moved".
 *
 * Pure functions, no I/O: the test reads the file and supplies the live
 * registry, the same split every module under `src/docs` uses.
 */

/** Repo-relative path of the guide, as `COUNT_CLAIMS.page` spells it. */
export const LLMS_TXT = "docs/llms-full.txt";

/**
 * The body of one `## ` section, from its heading to the next one.
 *
 * Located by a PREFIX rather than the full heading, because every
 * heading this module needs carries a parenthetical that names the
 * generated catalog beside it ("full schemas: docs/nodes.md, ...") and
 * that parenthetical is prose which may be re-worded without the section
 * having moved. Returns `undefined` when the heading is gone, which
 * every caller must treat as a failure: a section that cannot be found
 * checks nothing, forever.
 */
export function sectionOf(text: string, headingPrefix: string): string | undefined {
  const start = text.indexOf(`\n## ${headingPrefix}`);
  if (start < 0) return undefined;
  const body = text.slice(start + 1);
  const next = body.indexOf("\n## ");
  return next < 0 ? body : body.slice(0, next);
}

/** A name as the guide lists it, with the line it is on. */
export interface ListedName {
  readonly name: string;
  /** 1-based line within the whole file, for quoting back in a failure. */
  readonly line: number;
}

/** Heading prefix of the section each extractor reads. */
export const NODE_SECTION = "Node types";
export const PRIMITIVE_SECTION = "Primitive library";
export const GRAMMAR_SECTION = "Field-expression JSON grammar";

/**
 * Every node type the guide has a bullet for.
 *
 * The section is a flat `- name — prose` list, one node per PHYSICAL
 * line however long the prose runs, so the anchor is the line start and
 * the em-dash. Deliberately strict: a bullet that wraps its name onto a
 * continuation line would not be found, and should not be — the format
 * is what makes the list readable as a list.
 */
export function extractNodeNames(text: string): ListedName[] | undefined {
  const section = sectionOf(text, NODE_SECTION);
  if (section === undefined) return undefined;
  return listedNames(text, section, [/^- ([A-Za-z][A-Za-z0-9]*) — /gm]);
}

/**
 * Every field function the grammar section documents, read permissively.
 *
 * The section spells a function three ways, and all three count, because
 * all three tell an agent the name exists: as the spec that calls it
 * (`{ fn: "constant", ... }`, sometimes a union — `"valueNoise" |
 * "perlinNoise" | "simplexNoise"` — which is one sentence documenting
 * three); as a run of bare names under an arity heading (`2 args: `add
 * sub mul div ...``); and, in the 3-arg group, as one name followed by
 * its signature (``clamp` (x, lo, hi)`).
 *
 * Permissive is right for the coverage direction and wrong for the other
 * one, which is why {@link specFieldFns} exists: a lone backticked
 * identifier in this section is as likely to be `args` or `value` as a
 * function, so this set must never be asked what does NOT belong.
 */
export function documentedFieldFns(text: string): ListedName[] | undefined {
  const section = sectionOf(text, GRAMMAR_SECTION);
  if (section === undefined) return undefined;
  return listedNames(text, section, [SPEC_FN, NAME_RUN, LONE_NAME]);
}

/**
 * The subset of {@link documentedFieldFns} written in a form that can
 * only be a function name: the `fn:` position of a spec, and the runs of
 * bare names under an arity heading.
 *
 * This is the set to check for names the grammar would refuse. A run
 * cannot pick up an incidental word — it takes two or more bare
 * identifiers separated by single spaces, so any span carrying an
 * operator, a dot or a paren falls out — and the `fn:` position is the
 * name by definition.
 */
export function specFieldFns(text: string): ListedName[] | undefined {
  const section = sectionOf(text, GRAMMAR_SECTION);
  if (section === undefined) return undefined;
  return listedNames(text, section, [SPEC_FN, NAME_RUN]);
}

/** `{ fn: "a" }` and `{ fn: "a" | "b" | "c" }`, captured whole. */
const SPEC_FN = /"?\bfn"?:\s*((?:"[A-Za-z][A-Za-z0-9_]*"\s*\|?\s*)+)/g;
/** An arity heading's run: two or more bare names in one code span. */
const NAME_RUN = /`([a-z][A-Za-z0-9_]*(?: [a-z][A-Za-z0-9_]*)+)`/g;
/** One backticked bare name, which may or may not be a function. */
const LONE_NAME = /`([a-z][A-Za-z0-9_]*)`/g;

/**
 * The primitives the guide does not mention, given the live set.
 *
 * Coverage only, and one direction only. The primitive section groups
 * names into family bullets and writes them as running prose ("ring,
 * spiral, disc, and the two that carry polyline topology"), so there is
 * no list to parse — but "is this name written down anywhere in the
 * section" is still exactly the question, and a whole-word search
 * answers it. The other direction (a name here that no longer exists) is
 * covered by the per-family counts, which are count claims.
 *
 * Takes full `family/short-name` ids and looks for the short name, since
 * that is how the section spells them under their family heading.
 */
export function missingPrimitives(text: string, registered: readonly string[]): string[] {
  const section = sectionOf(text, PRIMITIVE_SECTION);
  if (section === undefined) return [...registered];
  return registered.filter((id) => {
    const short = id.slice(id.indexOf("/") + 1);
    return !new RegExp(`(^|[^A-Za-z0-9-])${escapeRegExp(short)}([^A-Za-z0-9-]|$)`).test(section);
  });
}

/**
 * Names out of alphabetical order, each paired with the name it should
 * follow.
 *
 * The node list is alphabetical and has to stay that way to be usable:
 * an agent looking for a node it half-remembers scans for where the name
 * would be. A name appended at the end is present, findable by search,
 * and invisible to a reader — which is the failure mode this catches
 * that a coverage check cannot.
 */
export function outOfOrder(names: readonly ListedName[]): { readonly after: string; readonly name: string }[] {
  const wrong: { after: string; name: string }[] = [];
  for (let i = 1; i < names.length; i++) {
    const previous = names[i - 1] as ListedName;
    const current = names[i] as ListedName;
    if (current.name.localeCompare(previous.name, "en") < 0) {
      wrong.push({ after: previous.name, name: current.name });
    }
  }
  return wrong;
}

/**
 * Matches of every `pattern` in `section`, deduplicated, with lines
 * resolved against the whole `text` so a failure can quote `file:line`.
 *
 * Each capture may hold several names — a `fn:` union, or a run of bare
 * ones — so the capture is split on anything an identifier cannot
 * contain. First mention wins the line number: that is the one a reader
 * should be sent to.
 */
function listedNames(text: string, section: string, patterns: readonly RegExp[]): ListedName[] {
  const offset = text.indexOf(section);
  const seen = new Set<string>();
  const found: ListedName[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (let m = re.exec(section); m !== null; m = re.exec(section)) {
      for (const name of (m[1] as string).split(/[^A-Za-z0-9_]+/).filter((n) => n.length > 0)) {
        if (seen.has(name)) continue;
        seen.add(name);
        found.push({ name, line: lineAt(text, offset + m.index) });
      }
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return found;
}

/** 1-based line number of a character offset. */
function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
