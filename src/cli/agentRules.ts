/**
 * The agent entry point: the managed instruction block `pcg agents` writes
 * into a consumer's `AGENTS.md`, and the two `llms.txt` indexes the docs
 * chain generates from the same data.
 *
 * WHY A BLOCK IN AGENTS.md AND NOT ONLY DOCS. A coding agent in a consumer
 * project has never seen this library and has no reason to look inside
 * `node_modules` for it. Measured elsewhere (PLAN-agent-readiness.md,
 * "Evidence"): an always-loaded ~8 KB index in AGENTS.md beat skills and
 * docs the agent had to choose to fetch, and context files help through
 * INSTRUCTIONS, not overviews. So the block is imperative lines, the places
 * to read and the commands to look things up with, the skills' triggers, and
 * a bare name index — nothing that explains the library.
 *
 * Every path the block names is the literal `node_modules/pcg-ts/<rel>`:
 * never absolute and never relative to the working directory, so the block
 * is the same bytes on every machine and from every directory, and
 * `pcg agents --check` gives one answer everywhere. (`CliIo.packagePath` is
 * used only to READ the shipped skills, never to spell a path in the block.)
 *
 * Pure: no I/O. The CLI and `scripts/gen-llms-index.mjs` gather the data —
 * the live registries plus the skills' frontmatter read through a callback —
 * and these functions only render and merge text. Re-exported from
 * `src/docs` for the generator.
 */
import { listFieldFns, listNodeTypes, listSubgraphs } from "../index.js";

/** The line that opens the managed block. */
export const AGENT_BLOCK_BEGIN = "<!-- BEGIN:pcg-ts-agent-rules -->";
/** The line that closes it. */
export const AGENT_BLOCK_END = "<!-- END:pcg-ts-agent-rules -->";

/** Where the package sits in a consumer project; the prefix of every path in the block. */
export const PACKAGE_PREFIX = "node_modules/pcg-ts/";

/** The hard ceiling on the block, in UTF-8 bytes. */
export const AGENT_BLOCK_MAX_BYTES = 8192;

/** The line `--claude` ensures a CLAUDE.md carries, for a target file named `name`. */
export function claudeImportLine(name: string): string {
  return `@${name}`;
}

/**
 * The shipped skills, package-relative. A test holds this list to the
 * `skills/` directory, so a skill cannot ship without the block naming it.
 */
export const SKILL_FILES = [
  "skills/graph-authoring/SKILL.md",
  "skills/determinism/SKILL.md",
  "skills/performance-and-budgets/SKILL.md",
] as const;

/** One shipped skill as the block names it. */
export interface AgentSkill {
  /** Package-relative path, e.g. `skills/determinism/SKILL.md`. */
  readonly path: string;
  /** The frontmatter `description`, verbatim. */
  readonly description: string;
}

/** Everything the block and the indexes are rendered from. */
export interface AgentRulesData {
  readonly version: string;
  /** Every registered node type with its category, in registry order. */
  readonly nodeTypes: readonly { readonly type: string; readonly category: string }[];
  /** Every field fn name, in registry order. */
  readonly fieldFns: readonly string[];
  /** Every registered primitive name (`family/name`), in registry order. */
  readonly primitives: readonly string[];
  readonly skills: readonly AgentSkill[];
  /**
   * The CLI's command names. The block renders a lookup line only for a
   * command that is in this list, so it cannot advertise one that does not
   * exist in the build that printed it.
   */
  readonly commands: readonly string[];
}

/**
 * The frontmatter `description` of a SKILL.md, or a thrown error naming the
 * file. The value is either a double-quoted string (read as JSON, which the
 * shipped skills' quoting is a subset of) or a bare one-line scalar.
 */
export function skillDescription(file: string, text: string): string {
  const normalized = text.replaceAll("\r\n", "\n");
  const front = /^---\n([\s\S]*?)\n---\n/.exec(normalized);
  if (front === null) {
    throw new Error(`${file}: no YAML frontmatter (--- ... ---) at the top of the file; a skill needs a description`);
  }
  const line = (front[1] as string).split("\n").find((l) => l.startsWith("description:"));
  if (line === undefined) {
    throw new Error(`${file}: the frontmatter has no description: line`);
  }
  const raw = line.slice("description:".length).trim();
  if (raw.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "string" && parsed.trim() !== "") return parsed;
    } catch {
      // fall through to the refusal below
    }
    throw new Error(`${file}: the frontmatter description is not one double-quoted string on one line`);
  }
  if (raw === "") throw new Error(`${file}: the frontmatter description is empty`);
  return raw;
}

/**
 * Gather the data from the live registries and the shipped skills.
 * `readShipped(rel)` returns a package-relative file's text (the CLI passes
 * its io; the generator reads the repository). The registries must already
 * hold the shipped primitives: import `pcg-ts/primitives` first.
 */
export function agentRulesData(opts: {
  readonly version: string;
  readonly commands: readonly string[];
  readonly readShipped: (rel: string) => string;
}): AgentRulesData {
  return {
    version: opts.version,
    nodeTypes: listNodeTypes().map((t) => ({ type: t.type, category: t.category ?? "uncategorized" })),
    fieldFns: listFieldFns(),
    primitives: listSubgraphs().map((s) => s.name),
    skills: SKILL_FILES.map((path) => ({ path, description: skillDescription(path, opts.readShipped(path)) })),
    commands: opts.commands,
  };
}

/**
 * The part of a skill description the block quotes: everything before its
 * "Covers ..." sentence. The skills are written as "Doctrine for X. Use
 * when ... Covers ...": the first two sentences are the trigger, the third
 * is a table of contents the agent reads once it opens the file.
 */
export function skillTrigger(description: string): string {
  const at = description.indexOf(" Covers ");
  return at === -1 ? description : description.slice(0, at);
}

/** Category order in the name index: the order a graph reads, source to terminal. */
const CATEGORY_ORDER = [
  "source",
  "sampler",
  "surface",
  "point op",
  "attribute",
  "filter",
  "value",
  "spawn",
  "composite",
  "io",
];

function byCategory(nodeTypes: AgentRulesData["nodeTypes"]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const { type, category } of nodeTypes) {
    const list = groups.get(category) ?? [];
    list.push(type);
    groups.set(category, list);
  }
  const rank = (c: string): number => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || (a[0] < b[0] ? -1 : 1));
}

function byFamily(primitives: readonly string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const name of primitives) {
    const slash = name.indexOf("/");
    const family = slash === -1 ? "" : name.slice(0, slash);
    const list = groups.get(family) ?? [];
    list.push(slash === -1 ? name : name.slice(slash + 1));
    groups.set(family, list);
  }
  return [...groups.entries()];
}

/** One named section of the block, kept apart so the size test can rank them. */
export interface AgentBlockSection {
  readonly name: string;
  readonly lines: readonly string[];
}

/**
 * The block's sections, in order, without the markers. {@link renderAgentBlock}
 * joins them; the size gate reports the largest when the whole is over.
 */
export function agentBlockSections(data: AgentRulesData): AgentBlockSection[] {
  const has = (command: string): boolean => data.commands.includes(command);
  const p = (rel: string): string => `\`${PACKAGE_PREFIX}${rel}\``;

  const header: AgentBlockSection = {
    name: "header",
    lines: [
      `## pcg-ts ${data.version}: rules for coding agents`,
      "",
      "Managed: `npx pcg agents --write` regenerates this block; edits inside the markers are overwritten.",
    ],
  };

  // Each rule after the first two answers something agents given only the
  // installed tarball were measured doing (the U7 pilot transcripts; see
  // PLAN-agent-readiness.md): reading dist/ and .d.ts files to learn the API,
  // dumping whole catalogs, generating graph JSON from TypeScript and handing
  // `{ "fn" }` specs to TS params, shipping a noise with a literal seed that
  // ignored the graph seed, and losing calls to /tmp and `require`.
  const rules: AgentBlockSection = {
    name: "rules",
    lines: [
      "",
      "- pcg-ts is pre-alpha and its API and graph JSON change between releases. Your training data about it is likely wrong or missing: do not write pcg-ts code or graph JSON from memory.",
      `- Everything for the installed version is in ${p("")} and the \`npx pcg\` CLI, run from the project root. Read the docs below before writing anything. Do not search the disk or the web, and do not read \`dist/*.js\` or \`*.d.ts\` to learn the API.`,
      "- Never guess a node type, param, pin, field fn or primitive name: look up one entry at a time with the commands below. Do not cat or grep a whole catalog (nodes.md, nodes.json): each runs to hundreds of KB. An unknown name is refused with a did-you-mean, never corrected silently.",
      `- Write the graph as JSON${
        has("graphs") ? ", starting from the closest shipped graph that cooks" : ""
      }. Do not generate it with \`new Graph()\` and \`serializeGraph\`: \`{ "fn": ... }\` field specs are graph JSON, not TypeScript param values.`,
      '- Give every noise `"seed": { "from": "node", "variant": N }` in its opts. A literal or omitted seed gives the same shape at every graph seed.',
      '- Keep scratch files in the project directory, not /tmp: pcg-ts only resolves from the project, and on Windows bash and node disagree about /tmp. Scripts are ESM (`import`, never `require`) and must `import "pcg-ts/primitives"` before loading a graph that uses primitives.',
    ],
  };

  const read: AgentBlockSection = {
    name: "read first",
    lines: [
      "",
      "Read first:",
      `- ${p("docs/llms-full.txt")}: the full guide (mental model, graph JSON format, invariants, CLI)`,
      `- ${p("docs/authoring.md")}: recipes and worked graphs`,
    ],
  };

  const lookups: [string, string][] = [
    ["nodes", "`npx pcg nodes <type>`: one node type's pins, params and an example graph"],
    ["fields", "`npx pcg fields <fn>`: one field fn's arguments"],
    ["run", "`npx pcg run <name> --help`: one primitive's params and pins"],
    ["graphs", "`npx pcg graphs --node <type>`: shipped graphs that use it; copy the closest graph, then modify"],
    ["schema", "`npx pcg schema`: the graph JSON Schema; `npx pcg schema diagnostic` lists every error code"],
  ];
  const lookup: AgentBlockSection = {
    name: "lookups",
    lines: ["", "Look up one entry at a time:", ...lookups.filter(([c]) => has(c)).map(([, text]) => `- ${text}`)],
  };

  const loopSteps = [
    has("validate") ? "`npx pcg validate g.json`" : undefined,
    has("cook") ? "`npx pcg cook g.json --stats`" : undefined,
    has("inspect") ? "`npx pcg inspect g.json --node <id>`" : undefined,
  ].filter((s): s is string => s !== undefined);
  const loop: AgentBlockSection = {
    name: "loop",
    lines: [
      "",
      `The loop, after every edit: ${loopSteps.join(" → ")}${
        has("render") ? ", then `npx pcg render g.json --out g.png` and look at the image" : ""
      }. A graph that cooks without error can still be wrong.`,
      ...(has("inspect")
        ? [
            "Measure with the CLI, not scripts: `npx pcg inspect g.json --node <id> --dist <attr>` (or `--bands <attr>=e0,e1`, `--group-by <attr>`). For a derived quantity, write it as an attribute first (setAttribute, or a write/ primitive), then inspect it.",
          ]
        : []),
      ...(has("cook")
        ? [
            "Determinism: `npx pcg cook g.json --no-timings --fingerprint` must print the same fingerprint twice and with `--budget 0`. A changed fingerprint under another `--seed` does not prove a noise follows the seed; compare that noise's attribute with `inspect --dist` at two seeds.",
          ]
        : []),
      "Exit codes: 0 ok, 1 a name on the command line does not exist or the run failed, 2 bad command line, 3 invalid graph (including a wrong node type, param or field fn in the file; a wrong attribute name surfaces at cook, as 1). `--json` prints one object on stdout, failures included.",
    ],
  };

  const skills: AgentBlockSection = {
    name: "skills",
    lines: [
      "",
      "Skills: read the one whose trigger matches the task.",
      ...data.skills.map((s) => `- ${p(s.path)}: ${skillTrigger(s.description)}`),
    ],
  };

  const names: AgentBlockSection = {
    name: "name index",
    lines: [
      "",
      "Names that exist (look each one up before use):",
      "Node types, by category:",
      ...byCategory(data.nodeTypes).map(([category, types]) => `- ${category}: ${types.join(" ")}`),
      `Field fns: ${data.fieldFns.join(" ")}`,
      "Primitives, by family:",
      ...byFamily(data.primitives).map(([family, list]) => `- ${family}/: ${list.join(" ")}`),
    ],
  };

  return [header, rules, read, lookup, loop, skills, names];
}

/**
 * The managed block: markers, then the sections, LF line endings, no
 * trailing newline (the merge supplies line endings to match its file).
 */
export function renderAgentBlock(data: AgentRulesData): string {
  const body = agentBlockSections(data).flatMap((s) => s.lines);
  return [AGENT_BLOCK_BEGIN, ...body, AGENT_BLOCK_END].join("\n");
}

/** UTF-8 byte length, without depending on `Buffer` (this module also runs in the docs build). */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/* ------------------------------------------------------------------ *
 * llms.txt indexes (llmstxt.org convention)
 * ------------------------------------------------------------------ */

/** A shipped document the indexes link, package-relative. */
interface IndexedDoc {
  readonly rel: string;
  readonly title: string;
  readonly what: string;
  /** The machine-readable twin, package-relative, linked after the description. */
  readonly twin?: string;
}

/** The docs the indexes list, in reading order. */
export const INDEXED_DOCS: readonly IndexedDoc[] = [
  {
    rel: "docs/llms-full.txt",
    title: "Full agent guide",
    what: "the mental model, the graph JSON format, every node, field fn and primitive in one line each, invariants, CLI and API; read this first",
  },
  { rel: "docs/authoring.md", title: "Authoring guide", what: "recipes and worked graphs, field expressions, GPU parity table" },
  { rel: "docs/nodes.md", title: "Node reference", what: "every node type: pins, params, defaults", twin: "docs/nodes.json" },
  {
    rel: "docs/primitives.md",
    title: "Primitive reference",
    what: "every shipped primitive: params, pins, family",
    twin: "docs/primitives.json",
  },
  {
    rel: "docs/graphs.md",
    title: "Graph corpus",
    what: "the shipped example graphs, each described, with the node types it uses",
    twin: "docs/graphs.json",
  },
  { rel: "docs/graph.schema.json", title: "Graph JSON Schema", what: "draft 2020-12 schema of the serialized graph format" },
  { rel: "docs/errors.md", title: "Error codes", what: "every diagnostic code a failure can carry, with its meaning" },
];

/** Linked last, under "Optional": useful, but not needed to write a graph. */
export const OPTIONAL_DOCS: readonly IndexedDoc[] = [
  { rel: "docs/design.md", title: "Design notes", what: "why the data model, fields and runtime are shaped the way they are" },
];

/** Where the published site serves `docs/`. */
export const SITE_URL = "https://c4rl05.github.io/pcg-ts/";
/** Where files the site does not serve (skills/, graphs/) are read from. */
export const RAW_URL = "https://raw.githubusercontent.com/C4RL05/pcg-ts/main/";

/** Where a directory the site does not serve is browsed (raw URLs have no listings). */
export const TREE_URL = "https://github.com/C4RL05/pcg-ts/tree/main/";

function link(rel: string, base: "package" | "site"): string {
  if (base === "package") return rel;
  if (rel.startsWith("docs/")) return `${SITE_URL}${rel.slice("docs/".length)}`;
  return rel.endsWith("/") ? `${TREE_URL}${rel}` : `${RAW_URL}${rel}`;
}

/**
 * An llms.txt index. `package` links are package-relative (the root
 * `llms.txt`, beside `package.json` in the tarball); `site` links are the
 * published site's URLs for `docs/*` and raw repository URLs for `skills/`
 * and `graphs/`, which the site does not serve (`docs/llms.txt`). LF, with a
 * trailing newline.
 */
export function renderLlmsIndex(data: AgentRulesData, base: "package" | "site"): string {
  const has = (command: string): boolean => data.commands.includes(command);
  const entry = (d: IndexedDoc): string => {
    const twin = d.twin === undefined ? "" : ` (JSON: [${d.twin.slice(d.twin.lastIndexOf("/") + 1)}](${link(d.twin, base)}))`;
    return `- [${d.title}](${link(d.rel, base)}): ${d.what}${twin}`;
  };
  const lines = [
    "# pcg-ts",
    "",
    "> Deterministic procedural content generation for TypeScript: attributes on point, vertex, primitive and detail domains, node graphs that serialize to JSON, deferred fields, hierarchical streaming, optional GPU cooking and three.js interop.",
    "",
    `Version ${data.version}. Pre-alpha: the API and the graph JSON format change between releases, so training data about this library is likely wrong. Read the guide for the installed version before writing code or graph JSON, and look every node, param, pin and field fn name up rather than guessing it.`,
    "",
    "In a project that depends on pcg-ts, `npx pcg agents --write` puts a short, versioned pointer block into AGENTS.md (`--claude` also imports it from CLAUDE.md).",
    "",
    "## Docs",
    "",
    ...INDEXED_DOCS.map(entry),
    "",
    "## Skills",
    "",
    ...data.skills.map((s) => `- [${s.path.split("/")[1]}](${link(s.path, base)}): ${skillTrigger(s.description)}`),
    "",
    "## CLI lookups",
    "",
    ...[
      has("nodes") ? "- `npx pcg nodes <type>`: one node type's pins, params and an example graph" : undefined,
      has("fields") ? "- `npx pcg fields <fn>`: one field fn's arguments" : undefined,
      has("run") ? "- `npx pcg run <name> --help`: one primitive's params and pins" : undefined,
      has("graphs") ? "- `npx pcg graphs --node <type>`: shipped graphs that use a node type" : undefined,
      has("schema") ? "- `npx pcg schema`: the graph JSON Schema" : undefined,
      has("render")
        ? "- The loop: `npx pcg validate g.json`, `npx pcg cook g.json --stats`, `npx pcg inspect g.json --node <id>`, `npx pcg render g.json --out g.png`"
        : undefined,
    ].filter((l): l is string => l !== undefined),
    "",
    "## Optional",
    "",
    ...OPTIONAL_DOCS.map(entry),
    `- [Example graphs](${link("graphs/", base)}): the corpus files themselves, each cooks as-is`,
    "",
  ];
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * Merging the block into a file
 * ------------------------------------------------------------------ */

/** The markers in a file are not one BEGIN line followed by one END line. */
export class ManagedBlockError extends Error {
  /** 1-based line of the marker at fault. */
  readonly line: number;
  constructor(message: string, line: number) {
    super(message);
    this.name = "ManagedBlockError";
    this.line = line;
  }
}

/** Where the block sits in a file: character offsets of the BEGIN line's start and the END line's end. */
export interface ManagedBlockLocation {
  /** Offset of the first character of the BEGIN line. */
  readonly start: number;
  /** Offset just past the END marker's line content (before its line ending). */
  readonly end: number;
  /** The text between those offsets, verbatim. */
  readonly text: string;
  /** 1-based line of the BEGIN marker. */
  readonly line: number;
}

/**
 * Find the managed block in `existing`: `undefined` when neither marker
 * occurs, the location when exactly one BEGIN line precedes exactly one END
 * line, and a {@link ManagedBlockError} naming the line otherwise. A marker
 * counts wherever it occurs, and must be alone on its line (surrounding
 * whitespace allowed) — a marker quoted inside other text is refused rather
 * than guessed about.
 */
export function findManagedBlock(existing: string, fileName = "AGENTS.md"): ManagedBlockLocation | undefined {
  const fix = `delete the stray marker, or delete both markers and everything between them, then re-run \`npx pcg agents --write\``;
  const markers: { kind: "begin" | "end"; line: number; start: number; end: number }[] = [];
  let offset = 0;
  const lines = existing.split("\n");
  for (const [i, raw] of lines.entries()) {
    const content = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    for (const [kind, marker] of [
      ["begin", AGENT_BLOCK_BEGIN],
      ["end", AGENT_BLOCK_END],
    ] as const) {
      if (!content.includes(marker)) continue;
      if (content.trim() !== marker) {
        throw new ManagedBlockError(
          `${fileName}:${i + 1}: the marker ${marker} shares its line with other text; it must be alone on its line. Fix: ${fix}`,
          i + 1,
        );
      }
      markers.push({ kind, line: i + 1, start: offset, end: offset + content.length });
    }
    offset += raw.length + 1;
  }
  if (markers.length === 0) return undefined;
  const begins = markers.filter((m) => m.kind === "begin");
  const ends = markers.filter((m) => m.kind === "end");
  if (begins.length > 1) {
    throw new ManagedBlockError(
      `${fileName}:${(begins[1] as (typeof markers)[number]).line}: a second ${AGENT_BLOCK_BEGIN} (the first is on line ${(begins[0] as (typeof markers)[number]).line}). Fix: ${fix}`,
      (begins[1] as (typeof markers)[number]).line,
    );
  }
  if (ends.length > 1) {
    throw new ManagedBlockError(
      `${fileName}:${(ends[1] as (typeof markers)[number]).line}: a second ${AGENT_BLOCK_END} (the first is on line ${(ends[0] as (typeof markers)[number]).line}). Fix: ${fix}`,
      (ends[1] as (typeof markers)[number]).line,
    );
  }
  const begin = begins[0];
  const end = ends[0];
  if (begin === undefined || end === undefined) {
    const only = (begin ?? end) as (typeof markers)[number];
    const missing = begin === undefined ? AGENT_BLOCK_BEGIN : AGENT_BLOCK_END;
    throw new ManagedBlockError(
      `${fileName}:${only.line}: ${begin === undefined ? AGENT_BLOCK_END : AGENT_BLOCK_BEGIN} has no matching ${missing}. Fix: ${fix}`,
      only.line,
    );
  }
  if (end.line < begin.line) {
    throw new ManagedBlockError(
      `${fileName}:${end.line}: ${AGENT_BLOCK_END} comes before ${AGENT_BLOCK_BEGIN} (line ${begin.line}). Fix: ${fix}`,
      end.line,
    );
  }
  return { start: begin.start, end: end.end, text: existing.slice(begin.start, end.end), line: begin.line };
}

/** The line ending a file already uses: CRLF when its first line break is one, else LF. */
export function lineEnding(text: string): "\n" | "\r\n" {
  const at = text.indexOf("\n");
  return at > 0 && text[at - 1] === "\r" ? "\r\n" : "\n";
}

/**
 * Put `block` (as {@link renderAgentBlock} returns it, LF, markers
 * included) into `existing`. Every byte outside the markers is kept: the
 * block replaces the text from the BEGIN line to the END marker, or — when
 * the file has no block — is appended after one blank line (a missing final
 * line break is supplied first). The block's own lines take the file's line
 * ending, so a CRLF file stays CRLF and a second application is a no-op.
 * Throws {@link ManagedBlockError} on malformed markers.
 */
export function applyManagedBlock(
  existing: string,
  block: string,
  fileName = "AGENTS.md",
): { text: string; changed: boolean } {
  const eol = lineEnding(existing);
  const rendered = block.replaceAll("\r\n", "\n").split("\n").join(eol);
  const found = findManagedBlock(existing, fileName);
  let text: string;
  if (found !== undefined) {
    text = existing.slice(0, found.start) + rendered + existing.slice(found.end);
    // A block that was the file's last line with no break after it keeps
    // that shape; nothing outside the markers is added.
  } else if (existing === "") {
    text = rendered + eol;
  } else {
    const terminated = existing.endsWith("\n") ? existing : existing + eol;
    text = `${terminated}${eol}${rendered}${eol}`;
  }
  return { text, changed: text !== existing };
}

/**
 * Ensure `existing` (a CLAUDE.md) imports `importLine` (see
 * {@link hasImportLine}). Appended on a line of its own at the end when
 * absent, in the file's line ending; nothing else changes.
 */
export function ensureImportLine(existing: string, importLine: string): { text: string; changed: boolean } {
  if (hasImportLine(existing, importLine)) return { text: existing, changed: false };
  const eol = lineEnding(existing);
  const text =
    existing === "" ? `${importLine}${eol}` : `${existing.endsWith("\n") ? existing : existing + eol}${importLine}${eol}`;
  return { text, changed: true };
}

/**
 * Does `existing` import `importLine` (`@AGENTS.md`) the way Claude Code
 * reads an import: the `@path` token anywhere in running text — on its own
 * line or inline ("see @AGENTS.md") — but not inside a code span or a fenced
 * code block, where it is not evaluated.
 */
export function hasImportLine(existing: string, importLine: string): boolean {
  const token = new RegExp(`(^|\\s)${importLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`);
  let fenced = false;
  for (const raw of existing.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (token.test(line.replace(/`[^`]*`/g, " "))) return true;
  }
  return false;
}
