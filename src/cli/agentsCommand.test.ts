/**
 * `pcg agents` through `runCli`, against an in-memory filesystem: print,
 * `--write` (byte preservation, idempotence, CLAUDE.md), `--check`, malformed
 * markers, unreadable files, and the `--json` shapes and failure envelope.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VERSION } from "../index.js";
import { AGENT_BLOCK_BEGIN, AGENT_BLOCK_END, AGENT_BLOCK_MAX_BYTES } from "./agentRules.js";
import { EXIT_FAILURE, EXIT_OK, EXIT_USAGE, runCli } from "./index.js";
import type { CliIo } from "./io.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Fs {
  readonly files: Map<string, string>;
  readonly writes: string[];
}

function errno(code: string, path: string): Error {
  return Object.assign(new Error(`${code}: cannot open '${path}'`), { code });
}

/**
 * `unreadable` is EACCES (there, but refused) and `missing` is ENOENT (not
 * there). The two are separate injectors because the command treats them
 * differently: ENOENT on the AGENTS.md file means "create it", while ENOENT
 * on a SHIPPED file — which is what an install without `skills/` looks
 * like — is a hard failure with its own message.
 */
async function run(
  argv: readonly string[],
  start: Record<string, string> = {},
  unreadable: readonly string[] = [],
  missing: readonly string[] = [],
) {
  const fs: Fs = { files: new Map(Object.entries(start)), writes: [] };
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    out: (t) => void out.push(t),
    err: (t) => void err.push(t),
    readFile: (p) => {
      // Both injectors are consulted BEFORE the `pkg:` branch, so a test can
      // also take away a SHIPPED file — the case that produces the "cannot
      // read the shipped ..." message.
      if (missing.includes(p)) throw errno("ENOENT", p);
      if (unreadable.includes(p)) throw errno("EACCES", p);
      if (p.startsWith("pkg:")) return readFileSync(join(ROOT, p.slice(4)), "utf8");
      const text = fs.files.get(p);
      if (text === undefined) throw errno("ENOENT", p);
      return text;
    },
    writeFile: (p, d) => {
      fs.writes.push(p);
      fs.files.set(p, d);
    },
    packagePath: (rel) => `pkg:${rel}`,
  };
  const code = await runCli(argv, io);
  return { code, out: out.join(""), err: err.join(""), fs };
}

describe("pcg agents", () => {
  it("prints the block and writes nothing", async () => {
    const r = await run(["agents"]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out.startsWith(`${AGENT_BLOCK_BEGIN}\n`)).toBe(true);
    expect(r.out.endsWith(`${AGENT_BLOCK_END}\n`)).toBe(true);
    expect(Buffer.byteLength(r.out) - 1).toBeLessThanOrEqual(AGENT_BLOCK_MAX_BYTES);
    expect(r.fs.writes).toEqual([]);
  });

  it("--json prints the block with its size and version", async () => {
    const r = await run(["agents", "--json"]);
    const json = JSON.parse(r.out) as { file: null; changed: boolean; bytes: number; version: string; block: string };
    expect(json.file).toBeNull();
    expect(json.changed).toBe(false);
    expect(json.version).toBe(VERSION);
    expect(json.bytes).toBe(Buffer.byteLength(json.block));
  });

  it("--write creates AGENTS.md, and a second run changes nothing", async () => {
    const first = await run(["agents", "--write", "--json"]);
    expect(first.code).toBe(EXIT_OK);
    const written = first.fs.files.get("AGENTS.md") as string;
    expect(written.startsWith(AGENT_BLOCK_BEGIN)).toBe(true);
    expect(JSON.parse(first.out)).toMatchObject({ file: "AGENTS.md", changed: true, version: VERSION });

    const second = await run(["agents", "--write", "--json"], { "AGENTS.md": written });
    expect(second.fs.writes).toEqual([]);
    expect(JSON.parse(second.out)).toMatchObject({ file: "AGENTS.md", changed: false });
    expect(second.fs.files.get("AGENTS.md")).toBe(written);
  });

  it("--write keeps every byte outside the markers, CRLF included", async () => {
    const before = "# Our rules\r\n\r\nUse tabs.\r\n\r\n";
    const after = "\r\n\r\n## Ours again\r\nno final newline";
    const stale = [AGENT_BLOCK_BEGIN, "## pcg-ts 0.0.1: old", AGENT_BLOCK_END].join("\r\n");
    const r = await run(["agents", "--write", "--file", "docs/AGENTS.md"], { "docs/AGENTS.md": before + stale + after });
    expect(r.code).toBe(EXIT_OK);
    const text = r.fs.files.get("docs/AGENTS.md") as string;
    expect(text.startsWith(before)).toBe(true);
    expect(text.endsWith(after)).toBe(true);
    expect(text).not.toContain("0.0.1");
    expect(text.replaceAll("\r\n", "")).not.toContain("\n");
    expect(r.out).toContain(`docs/AGENTS.md: wrote the pcg-ts ${VERSION} agent rules`);
  });

  it("--check exits 0 when current and 1 when missing or stale, naming the fix", async () => {
    const written = (await run(["agents", "--write"])).fs.files.get("AGENTS.md") as string;
    const ok = await run(["agents", "--check"], { "AGENTS.md": written });
    expect(ok.code).toBe(EXIT_OK);
    expect(ok.fs.writes).toEqual([]);

    const missing = await run(["agents", "--check"]);
    expect(missing.code).toBe(EXIT_FAILURE);
    expect(missing.err).toContain("npx pcg agents --write");

    const noBlock = await run(["agents", "--check", "--json"], { "AGENTS.md": "# ours\n" });
    expect(noBlock.code).toBe(EXIT_FAILURE);
    const envelope = JSON.parse(noBlock.out) as { ok: boolean; command: string; exitCode: number; errors: { code: string }[] };
    expect(envelope).toMatchObject({ ok: false, command: "agents", exitCode: EXIT_FAILURE });
    expect(envelope.errors[0]?.code).toBe("agent-rules-missing");

    const stale = await run(["agents", "--check", "--json"], {
      "AGENTS.md": written.replace(`pcg-ts ${VERSION}`, "pcg-ts 0.0.1"),
    });
    expect(stale.code).toBe(EXIT_FAILURE);
    expect((JSON.parse(stale.out) as { errors: { code: string }[] }).errors[0]?.code).toBe("agent-rules-stale");
    expect(stale.fs.writes).toEqual([]);
  });

  it("refuses malformed markers with the line, and writes nothing", async () => {
    const r = await run(["agents", "--write", "--json"], { "AGENTS.md": `# ours\n\n${AGENT_BLOCK_BEGIN}\nhalf a block\n` });
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain("AGENTS.md:3:");
    expect(r.err).toContain("npx pcg agents --write");
    expect((JSON.parse(r.out) as { errors: { code: string }[] }).errors[0]?.code).toBe("agent-rules-malformed");
    expect(r.fs.writes).toEqual([]);
  });

  it("refuses a file it cannot read rather than overwriting it", async () => {
    const r = await run(["agents", "--write"], {}, ["AGENTS.md"]);
    expect(r.code).toBe(EXIT_FAILURE);
    expect(r.err).toContain("cannot read AGENTS.md");
    expect(r.fs.writes).toEqual([]);
  });

  it("--claude adds the import to CLAUDE.md beside the file, once", async () => {
    const r = await run(["agents", "--write", "--claude", "--json"], { "CLAUDE.md": "# Mine\r\nkeep" });
    expect(r.code).toBe(EXIT_OK);
    expect(r.fs.files.get("CLAUDE.md")).toBe("# Mine\r\nkeep\r\n@AGENTS.md\r\n");
    expect(JSON.parse(r.out)).toMatchObject({ claude: { file: "CLAUDE.md", changed: true } });

    const again = await run(["agents", "--write", "--claude"], Object.fromEntries(r.fs.files));
    expect(again.fs.writes).toEqual([]);
    expect(again.out).toContain("CLAUDE.md: already imports AGENTS.md");

    const nested = await run(["agents", "--write", "--claude", "--file", "sub/RULES.md"]);
    expect(nested.fs.files.get("sub/CLAUDE.md")).toBe("@RULES.md\n");
  });

  it("without --claude, hints when an existing CLAUDE.md lacks the import, and creates none", async () => {
    const r = await run(["agents", "--write"], { "CLAUDE.md": "# Mine\n" });
    expect(r.out).toContain('hint: CLAUDE.md does not import AGENTS.md');
    expect(r.fs.files.get("CLAUDE.md")).toBe("# Mine\n");
    const none = await run(["agents", "--write"]);
    expect(none.out).not.toContain("hint:");
    expect(none.fs.files.has("CLAUDE.md")).toBe(false);
  });

  it("--check --claude fails when CLAUDE.md does not import the file", async () => {
    const written = (await run(["agents", "--write"])).fs.files.get("AGENTS.md") as string;
    const r = await run(["agents", "--check", "--claude", "--json"], { "AGENTS.md": written, "CLAUDE.md": "# Mine\n" });
    expect(r.code).toBe(EXIT_FAILURE);
    expect((JSON.parse(r.out) as { errors: { code: string }[] }).errors[0]?.code).toBe("agent-import-missing");
  });

  it("refuses flag combinations that mean nothing, as usage errors", async () => {
    expect((await run(["agents", "--write", "--check"])).code).toBe(EXIT_USAGE);
    expect((await run(["agents", "--file", "X.md"])).code).toBe(EXIT_USAGE);
    expect((await run(["agents", "--claude"])).code).toBe(EXIT_USAGE);
  });

  describe("a shipped skill file that is not there", () => {
    const SKILL = "pkg:skills/graph-authoring/SKILL.md";
    const fail = () => run(["agents"], {}, [], [SKILL]);

    it("fails naming the file, the one path it looked at, and the version it is", async () => {
      const r = await fail();
      expect(r.code).toBe(EXIT_FAILURE);
      expect(r.err).toContain("agents: cannot read the shipped skills/graph-authoring/SKILL.md");
      expect(r.err).toContain(`(looked at ${SKILL})`);
      expect(r.err).toContain("ENOENT");
      // The version is what distinguishes "this install predates the
      // skills" from "this install is broken", and it is the version the
      // reader is told to install.
      expect(r.err).toContain(`pcg-ts ${VERSION}`);
      // `npm explain`, not `npm ls`: `ls` prints the version, `explain`
      // prints the LOCATION and what required it — the question a reader
      // holding a path actually has. Both stay inside the project.
      expect(r.err).toContain("npm explain pcg-ts");
      expect(r.err).not.toContain("npm ls pcg-ts");
    });

    it("does not blame an older install, which this code path cannot produce", async () => {
      // `packagePath` resolves from the CLI's OWN module (src/cli/nodeIo.ts
      // walks up from import.meta.url to the nearest pcg-ts package.json),
      // so the copy it reads IS the running CLI's own package. It cannot be
      // a different, older pcg-ts. An error that offers a cause the code
      // cannot reach sends the reader to fix something that is not broken.
      const r = await fail();
      expect(r.err).not.toMatch(/older than this CLI|it is older/);
      expect(r.err).toContain("incomplete one");
    });

    it("never tells the reader to reinstall, or to go looking outside the project", async () => {
      // MEASURED, and the reason this test exists: an eval agent answered
      // the old "reinstall pcg-ts" advice by running `find /` over the whole
      // machine — in a sandboxed harness, an escape that invalidated the run.
      // Reinstalling was never the remedy either: the conditions that
      // produce this are an install older than the CLI, a pruned or vendored
      // copy, or no node_modules at all, and a reinstall of the same
      // specifier fixes none of them.
      const r = await fail();
      expect(r.err.toLowerCase()).not.toContain("reinstall");
      // Say outright that there is nowhere else to look, so the reader has
      // no reason to start searching.
      expect(r.err).toContain("nothing to search the filesystem for");
    });
  });
});
