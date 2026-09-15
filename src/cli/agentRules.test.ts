/**
 * The agent-rules block and the llms.txt indexes, rendered from the live
 * registries: the size ceiling, the merge's byte guarantees, the committed
 * indexes, and that everything the block names exists.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { VERSION, listFieldFns, listNodeTypes, listSubgraphs } from "../index.js";
import {
  AGENT_BLOCK_BEGIN,
  AGENT_BLOCK_END,
  AGENT_BLOCK_MAX_BYTES,
  INDEXED_DOCS,
  ManagedBlockError,
  OPTIONAL_DOCS,
  PACKAGE_PREFIX,
  SKILL_FILES,
  agentBlockSections,
  agentRulesData,
  applyManagedBlock,
  ensureImportLine,
  findManagedBlock,
  renderAgentBlock,
  renderLlmsIndex,
  skillDescription,
  utf8Bytes,
} from "./agentRules.js";
import { COMMANDS } from "./commands.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

/**
 * Read once, at load: a sibling suite may register a throwaway node type or
 * primitive into the same process, and the committed indexes describe the
 * shipped registries only.
 */
const DATA = agentRulesData({
  version: VERSION,
  commands: COMMANDS.map((c) => c.spec.name),
  readShipped: read,
});
const BLOCK = renderAgentBlock(DATA);

describe("the agent-rules block", () => {
  it(`is at most ${AGENT_BLOCK_MAX_BYTES} bytes on the live registry`, () => {
    const bytes = utf8Bytes(BLOCK);
    const ranked = agentBlockSections(DATA)
      .map((s) => ({ name: s.name, bytes: utf8Bytes(s.lines.join("\n")) }))
      .sort((a, b) => b.bytes - a.bytes)
      .map((s) => `${s.name} ${s.bytes}`)
      .join(", ");
    expect(
      bytes,
      `the block is ${bytes} bytes, over the ${AGENT_BLOCK_MAX_BYTES}-byte ceiling (largest sections: ${ranked}). ` +
        "It is loaded into every agent session in a consumer project, so the fix is to cut, not to raise the " +
        "ceiling: shorten a skill description's trigger, or drop a section to a pointer.",
    ).toBeLessThanOrEqual(AGENT_BLOCK_MAX_BYTES);
  });

  it("opens and closes with the markers and states its version and how it is regenerated", () => {
    const lines = BLOCK.split("\n");
    expect(lines[0]).toBe(AGENT_BLOCK_BEGIN);
    expect(lines.at(-1)).toBe(AGENT_BLOCK_END);
    expect(lines[1]).toContain(`pcg-ts ${VERSION}`);
    expect(BLOCK).toContain("`npx pcg agents --write` regenerates this block");
    expect(BLOCK).toContain("edits inside the markers are overwritten");
  });

  it("spells every path as node_modules/pcg-ts/<rel>, never absolute or cwd-relative", () => {
    // A backticked token with a slash and no glob or space is a path the
    // reader is meant to open; `dist/*.js` is a pattern it is told NOT to.
    const paths = [...BLOCK.matchAll(/`([^`\s*"]*\/[^`\s*"]*)`/g)].map((m) => m[1] as string);
    expect(paths.length).toBeGreaterThan(4);
    for (const path of paths) {
      expect(path, `a path in the block that is not package-prefixed: ${path}`).toMatch(/^node_modules\/pcg-ts\//);
    }
    expect(BLOCK).not.toMatch(/[A-Za-z]:[\\/]|\\Users\\|\/home\//);
  });

  it("names every path it points at from the shipped files, and each exists", () => {
    const named = [...BLOCK.matchAll(/node_modules\/pcg-ts\/([^`\s:]+)/g)].map((m) => m[1] as string);
    expect(named).toContain("docs/llms-full.txt");
    expect(named).toContain("docs/authoring.md");
    for (const rel of SKILL_FILES) expect(named).toContain(rel);
    for (const rel of named) {
      expect(() => read(rel), `the block names node_modules/pcg-ts/${rel}, which does not exist`).not.toThrow();
    }
  });

  it("names only pcg commands that exist", () => {
    const names = new Set(COMMANDS.map((c) => c.spec.name));
    const used = [...BLOCK.matchAll(/\bpcg ([a-z][a-z-]*)/g)].map((m) => m[1] as string);
    expect(used.length).toBeGreaterThan(5);
    for (const cmd of used) expect(names.has(cmd), `the block names "pcg ${cmd}", which is not a command`).toBe(true);
  });

  it("drops the lookup line of a command the build does not have", () => {
    const without = renderAgentBlock({ ...DATA, commands: DATA.commands.filter((c) => c !== "graphs") });
    expect(without).not.toContain("pcg graphs");
    expect(BLOCK).toContain("npx pcg graphs --node <type>");
  });

  it("carries the loop, the exit codes and each skill's trigger", () => {
    expect(BLOCK).toContain("npx pcg validate g.json");
    expect(BLOCK).toContain("npx pcg render g.json --out g.png");
    expect(BLOCK).toMatch(/Exit codes: 0 ok, 1 .*, 2 .*, 3 invalid graph/);
    for (const skill of DATA.skills) {
      const firstSentence = skill.description.split(". ")[0] as string;
      expect(BLOCK).toContain(`${PACKAGE_PREFIX}${skill.path}\`: ${firstSentence}`);
    }
  });

  it("indexes every node type, field fn and primitive", () => {
    const words = new Set(BLOCK.split(/[\s:]+/));
    for (const t of listNodeTypes()) expect(words.has(t.type), t.type).toBe(true);
    for (const fn of listFieldFns()) expect(words.has(fn), fn).toBe(true);
    for (const s of listSubgraphs()) {
      const [family, name] = s.name.split("/") as [string, string];
      expect(BLOCK).toMatch(new RegExp(`^- ${family}/: (.* )?${name.replaceAll("-", "\\-")}( |$)`, "m"));
    }
  });

  it("is a pure function of its data", () => {
    expect(renderAgentBlock(DATA)).toBe(BLOCK);
  });
});

describe("the shipped skills", () => {
  it("SKILL_FILES is exactly the skills/ directory", () => {
    const dirs = readdirSync(join(ROOT, "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `skills/${d.name}/SKILL.md`)
      .sort();
    expect([...SKILL_FILES].sort()).toEqual(dirs);
  });

  it("reads a quoted and a bare description, and refuses a file without one", () => {
    expect(skillDescription("a", '---\nname: a\ndescription: "Use \\"this\\"."\n---\n# A')).toBe('Use "this".');
    expect(skillDescription("b", "---\r\nname: b\r\ndescription: Use it.\r\n---\r\nbody")).toBe("Use it.");
    expect(() => skillDescription("c/SKILL.md", "# no frontmatter")).toThrow(/c\/SKILL\.md: no YAML frontmatter/);
    expect(() => skillDescription("d", "---\nname: d\n---\n")).toThrow(/no description/);
  });
});

describe("applyManagedBlock", () => {
  const block = [AGENT_BLOCK_BEGIN, "rules v2", "", "- line", AGENT_BLOCK_END].join("\n");
  const old = [AGENT_BLOCK_BEGIN, "rules v1", AGENT_BLOCK_END].join("\n");

  it("writes the block into an empty or missing file", () => {
    const { text, changed } = applyManagedBlock("", block);
    expect(changed).toBe(true);
    expect(text).toBe(`${block}\n`);
  });

  it("is byte-identical when applied twice", () => {
    for (const start of ["", "# Mine\n\nkeep me\n", "# Mine\r\n\r\nkeep me", "no newline at end"]) {
      const once = applyManagedBlock(start, block).text;
      const twice = applyManagedBlock(once, block);
      expect(twice.changed).toBe(false);
      expect(twice.text).toBe(once);
    }
  });

  it("appends after the existing text, keeping every byte of it", () => {
    const mine = "# Project rules\n\nUse tabs.\n";
    const { text } = applyManagedBlock(mine, block);
    expect(text.startsWith(mine)).toBe(true);
    expect(text).toBe(`${mine}\n${block}\n`);
  });

  it("replaces only the text between the markers, CRLF and all", () => {
    const before = "# Rules\r\n\r\nFirst.\r\n";
    const after = "\r\n## After\r\nTrailing text, no final newline";
    const existing = `${before}${old.split("\n").join("\r\n")}${after}`;
    const { text, changed } = applyManagedBlock(existing, block);
    expect(changed).toBe(true);
    expect(text.startsWith(before)).toBe(true);
    expect(text.endsWith(after)).toBe(true);
    const middle = text.slice(before.length, text.length - after.length);
    expect(middle).toBe(block.split("\n").join("\r\n"));
    expect(middle.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("leaves a file whose block is current unchanged", () => {
    const existing = `intro\n\n${block}\n\noutro\n`;
    expect(applyManagedBlock(existing, block)).toEqual({ text: existing, changed: false });
  });

  it("refuses malformed markers, naming the line", () => {
    const cases: [string, number, RegExp][] = [
      [`a\n${AGENT_BLOCK_BEGIN}\nb\n`, 2, /has no matching <!-- END/],
      [`a\nb\n${AGENT_BLOCK_END}\n`, 3, /has no matching <!-- BEGIN/],
      [`${AGENT_BLOCK_END}\n${AGENT_BLOCK_BEGIN}\n`, 1, /comes before/],
      [`${AGENT_BLOCK_BEGIN}\n${AGENT_BLOCK_END}\n${AGENT_BLOCK_BEGIN}\n${AGENT_BLOCK_END}\n`, 3, /a second <!-- BEGIN/],
      [`x ${AGENT_BLOCK_BEGIN}\n${AGENT_BLOCK_END}\n`, 1, /shares its line/],
    ];
    for (const [existing, line, message] of cases) {
      let thrown: unknown;
      try {
        applyManagedBlock(existing, block, "AGENTS.md");
      } catch (err) {
        thrown = err;
      }
      expect(thrown, existing).toBeInstanceOf(ManagedBlockError);
      expect((thrown as ManagedBlockError).line, existing).toBe(line);
      expect((thrown as Error).message).toMatch(message);
      expect((thrown as Error).message).toContain(`AGENTS.md:${line}:`);
      expect((thrown as Error).message).toContain("npx pcg agents --write");
    }
  });

  it("finds nothing in a file with no markers", () => {
    expect(findManagedBlock("# nothing here\n")).toBeUndefined();
  });
});

describe("ensureImportLine", () => {
  it("appends the import once, in the file's line ending, and keeps the rest", () => {
    expect(ensureImportLine("", "@AGENTS.md")).toEqual({ text: "@AGENTS.md\n", changed: true });
    expect(ensureImportLine("# Mine\r\nx", "@AGENTS.md")).toEqual({ text: "# Mine\r\nx\r\n@AGENTS.md\r\n", changed: true });
    const has = "# Mine\n  @AGENTS.md  \nmore\n";
    expect(ensureImportLine(has, "@AGENTS.md")).toEqual({ text: has, changed: false });
    // Claude Code evaluates an inline import too, so it counts...
    expect(ensureImportLine("see @AGENTS.md for more\n", "@AGENTS.md").changed).toBe(false);
    // ...but not one inside a code span or a fence, and not a longer name.
    expect(ensureImportLine("run `@AGENTS.md` here\n", "@AGENTS.md").changed).toBe(true);
    expect(ensureImportLine("```\n@AGENTS.md\n```\n", "@AGENTS.md").changed).toBe(true);
    expect(ensureImportLine("@AGENTS.md.bak\n", "@AGENTS.md").changed).toBe(true);
  });
});

describe("the llms.txt indexes", () => {
  it("the committed root llms.txt is a fresh render (run `npm run docs:llms` after `npm run build`)", () => {
    expect(read("llms.txt").replaceAll("\r\n", "\n")).toBe(renderLlmsIndex(DATA, "package"));
  });

  it("the committed docs/llms.txt is a fresh render (run `npm run docs:llms` after `npm run build`)", () => {
    expect(read("docs/llms.txt").replaceAll("\r\n", "\n")).toBe(renderLlmsIndex(DATA, "site"));
  });

  it("links docs by package-relative path in the package index and exist", () => {
    const text = renderLlmsIndex(DATA, "package");
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] as string);
    for (const doc of [...INDEXED_DOCS, ...OPTIONAL_DOCS]) expect(links).toContain(doc.rel);
    for (const rel of links) {
      expect(rel, `not package-relative: ${rel}`).not.toMatch(/^(https?:|\/|node_modules)/);
      expect(existsSync(join(ROOT, rel)), `${rel} does not exist`).toBe(true);
    }
  });

  it("links the site for docs/ and raw GitHub for everything else in the site index", () => {
    const links = [...renderLlmsIndex(DATA, "site").matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] as string);
    expect(links).toContain("https://c4rl05.github.io/pcg-ts/llms-full.txt");
    expect(links).toContain("https://raw.githubusercontent.com/C4RL05/pcg-ts/main/skills/graph-authoring/SKILL.md");
    for (const url of links) {
      expect(url).toMatch(
        /^https:\/\/(c4rl05\.github\.io\/pcg-ts\/|raw\.githubusercontent\.com\/C4RL05\/pcg-ts\/main\/[^/].*[^/]$|github\.com\/C4RL05\/pcg-ts\/tree\/main\/.*\/$)/,
      );
      expect(url).not.toContain("github.io/pcg-ts/docs/");
    }
  });
});
