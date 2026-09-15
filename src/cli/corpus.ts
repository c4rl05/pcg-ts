/**
 * The graph corpus as the CLI sees it: the shipped index
 * (`docs/graphs.json`), which graphs to show first for a node type or a
 * primitive, and the one node object a `usage` snippet quotes.
 *
 * Pure apart from the `CliIo` it is handed. The index is read through
 * {@link CliIo.packagePath}, never from the working directory, so the
 * paths printed are the INSTALLED version's graphs: a consumer on 0.18
 * whose repository happens to hold a 0.17 checkout must not be pointed at
 * the older files.
 *
 * `src/docs` imports {@link CorpusEntry} and {@link rankExamples} too, so
 * `docs/nodes.md` and `pcg nodes <type>` put the same graphs first.
 */
import type { CliIo } from "./io.js";

/** Where the corpus index lives inside the package. */
export const CORPUS_INDEX_PATH = "docs/graphs.json";

/**
 * The fields of one `docs/graphs.json` entry the CLI and the catalogs
 * read — a structural subset, so the generator's full `ExampleEntry`
 * (description, seed, outputs) is one without conversion.
 */
export interface CorpusEntry {
  /** Base name, e.g. `basics-shift-along-a-path.json`. */
  readonly file: string;
  /** Package-relative, e.g. `graphs/basics-shift-along-a-path.json`. */
  readonly path: string;
  readonly title: string;
  readonly tags: readonly string[];
  /** Every node type used at any nesting depth, sorted, deduplicated. */
  readonly nodeTypes: readonly string[];
  /** Every primitive referenced by name, sorted, deduplicated. */
  readonly primitives: readonly string[];
  /** Nodes in the outer graph. */
  readonly nodeCount: number;
}

/** The family prefix a focused, one-idea graph carries. */
const BASICS_PREFIX = "basics-";

/** Code-unit order: identical on every platform and in every locale. */
function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The entries matching `pred`, best example first.
 *
 * Order: `basics-` graphs before every other family; then a graph whose
 * file name spells `subject` in kebab case (`basics-transform-points.json`
 * for `transformPoints`; a primitive by its last path segment); then fewest
 * DISTINCT node types; then fewer outer nodes; then file name.
 *
 * The node-type count is the key that matters most often — `setAttribute`
 * sits in some sixty graphs, and file order alone would lead with whichever
 * dense pipeline sorts first, where the node is one of twenty doing
 * something else. A graph built from few types is one where the type asked
 * about is doing the teaching.
 *
 * The name goes BEFORE it because a graph named for the subject was written
 * to teach exactly that, and one extra type in it (the source that feeds a
 * `spawnInstances`, the inner node of a `subgraph`) does not make it a worse
 * example than a graph that merely happens to use the subject. Without the
 * name, `transformPoints` led with a graph about inline field params and
 * `spawnInstances` with one about props along a path.
 *
 * Deterministic: the comparison ends on the file name, which is unique in
 * the index, so no two entries compare equal and the input order never
 * shows through.
 */
export function rankExamples<E extends CorpusEntry>(
  entries: readonly E[],
  pred: (entry: E) => boolean,
  subject?: string,
): E[] {
  const basics = (e: E): number => (e.file.startsWith(BASICS_PREFIX) ? 0 : 1);
  const spelled = subject === undefined ? undefined : `-${kebab(subject)}-`;
  const named = (e: E): number =>
    spelled !== undefined && `-${e.file.replace(/\.json$/, "")}-`.includes(spelled) ? 0 : 1;
  return entries
    .filter(pred)
    .sort(
      (a, b) =>
        basics(a) - basics(b) ||
        named(a) - named(b) ||
        a.nodeTypes.length - b.nodeTypes.length ||
        a.nodeCount - b.nodeCount ||
        codeUnitCompare(a.file, b.file),
    );
}

/**
 * How a corpus file name spells a node type or a primitive:
 * `filterByAttribute` → `filter-by-attribute`, `fill/scatter-even` →
 * `scatter-even`.
 */
export function kebab(subject: string): string {
  const last = subject.slice(subject.lastIndexOf("/") + 1);
  return last.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** The corpus index, or why it could not be read. */
export type CorpusIndex =
  | {
      readonly available: true;
      readonly entries: readonly CorpusEntry[];
      /** A runnable path for an entry — see {@link CliIo.packagePath}. */
      readonly pathOf: (entry: CorpusEntry) => string;
    }
  | {
      readonly available: false;
      /** One line saying what is missing and why; no trailing newline. */
      readonly note: string;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** The entry projected to {@link CorpusEntry}, or the name of its first bad field. */
function readEntry(value: unknown): CorpusEntry | string {
  if (!isObject(value)) return "(not an object)";
  const { file, path, title, tags, nodeTypes, primitives, nodeCount } = value;
  if (typeof file !== "string") return "file";
  if (typeof path !== "string") return "path";
  if (typeof title !== "string") return "title";
  if (!isStringList(tags)) return "tags";
  if (!isStringList(nodeTypes)) return "nodeTypes";
  if (!isStringList(primitives)) return "primitives";
  if (typeof nodeCount !== "number") return "nodeCount";
  return { file, path, title, tags, nodeTypes, primitives, nodeCount };
}

/**
 * Read the shipped corpus index. Never throws: a missing `packagePath`, a
 * missing file or a malformed one each come back as `available: false`
 * with a one-line note, because every caller but `pcg graphs` treats the
 * examples as an extra and must still answer the question it was asked.
 */
export function readCorpusIndex(io: CliIo): CorpusIndex {
  const locate = io.packagePath?.bind(io);
  const indexPath = locate?.(CORPUS_INDEX_PATH);
  if (locate === undefined || indexPath === undefined) {
    return {
      available: false,
      note: `the pcg-ts package root could not be located from this process, so ${CORPUS_INDEX_PATH} (the example corpus index) is out of reach`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(io.readFile(indexPath));
  } catch (err) {
    return {
      available: false,
      note: `${indexPath} could not be read (${err instanceof Error ? err.message : String(err)})`,
    };
  }
  if (!Array.isArray(parsed)) {
    return { available: false, note: `${indexPath} is not a JSON array of corpus entries` };
  }
  const entries: CorpusEntry[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = readEntry(parsed[i]);
    if (typeof entry === "string") {
      return { available: false, note: `${indexPath} entry [${i}] has no valid "${entry}"` };
    }
    entries.push(entry);
  }
  return {
    available: true,
    entries,
    pathOf: (entry) => locate(entry.path) ?? entry.path,
  };
}

// ---------------------------------------------------------------------------
// usage: one node's own JSON, quoted from a corpus graph
// ---------------------------------------------------------------------------

/**
 * The first node object of `type` in a serialized graph, breadth first —
 * outer nodes before anything nested in a `subgraph` payload, because the
 * outer one is the one a reader can find by scrolling the file. Returned
 * as it appears in the file, every key included.
 */
export function findNodeJson(graph: unknown, type: string): Record<string, unknown> | undefined {
  const queue: unknown[] = [graph];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!isObject(current) || !Array.isArray(current.nodes)) continue;
    for (const node of current.nodes) {
      if (isObject(node) && node.type === type) return node;
    }
    for (const node of current.nodes) {
      if (isObject(node) && isObject(node.subgraph)) queue.push(node.subgraph.graph);
    }
  }
  return undefined;
}

/** A node's JSON as quoted from one corpus graph. */
export interface UsageSnippet {
  /** The graph it was read from, as {@link CorpusIndex} prints paths. */
  readonly path: string;
  /** The node object, whole. */
  readonly node: Record<string, unknown>;
}

/**
 * Quote the first node of `type` from `entry`'s graph; `undefined` when
 * the file cannot be read or holds no such node (an index out of step with
 * its files — the caller simply shows no snippet).
 */
export function readUsage(
  io: CliIo,
  index: Extract<CorpusIndex, { available: true }>,
  entry: CorpusEntry,
  type: string,
): UsageSnippet | undefined {
  const path = index.pathOf(entry);
  let graph: unknown;
  try {
    graph = JSON.parse(io.readFile(path));
  } catch {
    return undefined;
  }
  const node = findNodeJson(graph, type);
  return node === undefined ? undefined : { path, node };
}

/** How many lines of a usage snippet are printed before it is cut (one over is let through). */
export const USAGE_LINES = 20;

/** The column a usage snippet's lines are kept within where a value allows it. */
export const USAGE_WIDTH = 100;

/** One line of JSON with a space after every `:` and `,` — valid, and readable. */
export function inlineJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inlineJson).join(", ")}]`;
  if (isObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    return `{${keys.map((k) => `${JSON.stringify(k)}: ${inlineJson(value[k])}`).join(", ")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * JSON that spends lines on structure, not brackets: any object or array
 * whose one-line form fits within `width` columns — counted from where it
 * starts, and leaving room for the comma that may follow it — stays on
 * that line, and only what does not fit is broken out, two spaces per
 * level. Inside a broken-out array, runs of scalars share lines (`0, 1, 5,
 * 13` is one line, not four). Still valid JSON, still the file's values in
 * the file's key order — only whitespace differs from the file. A node
 * whose params are one nested field expression would otherwise spend the
 * whole twenty-line budget on that expression's brackets and hide the
 * params after it.
 */
export function compactJson(
  value: unknown,
  indent = "",
  column = indent.length,
  width = USAGE_WIDTH,
): string {
  const flat = inlineJson(value);
  if (column + flat.length + 1 <= width) return flat;
  const inner = indent + "  ";
  if (Array.isArray(value) && value.length > 0) {
    const lines: string[] = [];
    let run = "";
    for (const item of value) {
      if (item === null || typeof item !== "object") {
        const text = inlineJson(item);
        if (run !== "" && inner.length + run.length + 2 + text.length + 1 > width) {
          lines.push(inner + run);
          run = "";
        }
        run = run === "" ? text : `${run}, ${text}`;
        continue;
      }
      if (run !== "") lines.push(inner + run);
      run = "";
      lines.push(inner + compactJson(item, inner, inner.length, width));
    }
    if (run !== "") lines.push(inner + run);
    return `[\n${lines.join(",\n")}\n${indent}]`;
  }
  if (isObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (keys.length === 0) return flat;
    const lines = keys.map((k) => {
      const head = `${inner}${JSON.stringify(k)}: `;
      return head + compactJson(value[k], inner, head.length, width);
    });
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return flat;
}

/** The text of a usage snippet: indented JSON, cut at {@link USAGE_LINES}. */
export function usageLines(snippet: UsageSnippet): string[] {
  // Every line is printed two spaces in, so the JSON gets two columns less.
  const json = compactJson(snippet.node, "", 0, USAGE_WIDTH - 2)
    .split("\n")
    .map((l) => `  ${l}`);
  // One line over is printed rather than cut: the note would take the
  // same line and say less than the line it replaced.
  if (json.length <= USAGE_LINES + 1) return json;
  const hidden = json.length - USAGE_LINES;
  return [...json.slice(0, USAGE_LINES), `  … ${hidden} more lines; full graph: ${snippet.path}`];
}

/** How many example lines a catalog entry prints before pointing at `pcg graphs`. */
export const EXAMPLE_LINES = 5;

/**
 * The `examples (N):` section shared by `pcg nodes <type>` and
 * `pcg run <name> --help`: up to {@link EXAMPLE_LINES} `path — title`
 * lines, then the `pcg graphs` line that lists all of them.
 */
export function exampleSection(
  index: CorpusIndex,
  ranked: readonly CorpusEntry[],
  allCommand: string,
  none: string,
): string[] {
  if (!index.available) return [`examples: unavailable — ${index.note}`];
  if (ranked.length === 0) return [`examples (0): ${none}`];
  const lines = [`examples (${ranked.length}):`];
  for (const entry of ranked.slice(0, EXAMPLE_LINES)) {
    lines.push(`  ${index.pathOf(entry)} — ${entry.title}`);
  }
  lines.push(`  all ${ranked.length}: ${allCommand}`);
  return lines;
}
