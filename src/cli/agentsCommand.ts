/**
 * `pcg agents` — the managed agent-rules block for a consumer project's
 * AGENTS.md. Prints it by default; `--write` merges it into the file,
 * `--check` fails when it is missing or stale. Nothing is ever written
 * without `--write`, and there is no postinstall that would do it behind a
 * consumer's back.
 *
 * The block and the merge are pure (`agentRules.ts`); this module is the
 * command line around them. It is built by a factory that takes the command
 * names, because the block lists only commands that exist and `COMMANDS`
 * (in `commands.ts`) is the array this command is itself an element of.
 */
import { VERSION } from "../index.js";
import {
  type AgentRulesData,
  ManagedBlockError,
  PACKAGE_PREFIX,
  agentRulesData,
  applyManagedBlock,
  claudeImportLine,
  ensureImportLine,
  findManagedBlock,
  hasImportLine,
  renderAgentBlock,
  utf8Bytes,
} from "./agentRules.js";
import { CliUsageError, boolFlag, stringFlag } from "./args.js";
import type { Command, CommandOutcome } from "./commands.js";
import { CliError } from "./errors.js";
import type { CliIo } from "./io.js";

/** The file `--write` and `--check` act on when `--file` is not given. */
export const DEFAULT_AGENTS_FILE = "AGENTS.md";

/** Is this thrown value a missing file, as Node's fs reports one? */
function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ENOENT";
}

/**
 * A file's text; `""` when it does not exist. Any other read failure — a
 * permission error, a directory — is refused, so a file that could not be
 * read is never overwritten as if it were empty.
 */
function readOrEmpty(io: CliIo, path: string): { text: string; exists: boolean } {
  try {
    return { text: io.readFile(path), exists: true };
  } catch (err) {
    if (isNotFound(err)) return { text: "", exists: false };
    const reason = err instanceof Error ? err.message : String(err);
    throw new CliError(`agents: cannot read ${path}: ${reason}. Nothing was written; make ${path} a readable file, or pass --file`, {
      code: "file-unreadable",
      path,
    });
  }
}

/** The directory part of a path as given, with its trailing separator; `""` for a bare name. */
function directoryOf(path: string): string {
  const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return at === -1 ? "" : path.slice(0, at + 1);
}

function baseName(path: string): string {
  const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return at === -1 ? path : path.slice(at + 1);
}

/**
 * Read one shipped file for the block's data. Located through
 * `io.packagePath` (which finds the installed package from the CLI's own
 * module), falling back to `node_modules/pcg-ts/<rel>` from the working
 * directory for an io without it.
 *
 * THE FAILURE MESSAGE IS THE POINT OF THIS FUNCTION, and it used to end
 * "reinstall pcg-ts" — advice that named nothing. A reader told to
 * reinstall a package it cannot see goes LOOKING for it: one eval agent
 * answered this message by running `find /` across the whole machine,
 * which in a sandboxed harness is an escape that got the run thrown out
 * and re-run.
 *
 * WHAT THE CONDITION ACTUALLY IS, which decides the wording: `packagePath`
 * resolves from the CLI's OWN module (`nodeIo.ts` walks up from
 * `import.meta.url` to the nearest package.json named pcg-ts), so this
 * reads `skills/` out of the very package the running CLI is part of. That
 * rules out the obvious guess — the copy cannot be a different, older
 * pcg-ts than this one, because it IS this one, and every pcg-ts that
 * renders these rules ships the files they quote. What is left is a copy
 * that arrived incomplete: a pruned image layer, a vendored subset, a
 * partial extract. So the message says THAT, and names the directory.
 *
 * It is careful about two things it would be easy to overstate. There IS a
 * fallback path (the `??` below, for an io with no `packagePath`), so it
 * says "does not retry anywhere else" rather than claiming there is no
 * fallback. And the remedy points at the printed location rather than at
 * "this project", because `displayPackagePath` prints an ABSOLUTE path
 * when the package is outside the working directory — a global or `npx`
 * install, where installing into the project would fix nothing.
 *
 * `npm explain pcg-ts`, not `npm ls`: `ls` prints the version, `explain`
 * prints the location and who required it, which is the question a reader
 * standing in front of a path actually has. Neither leaves the project.
 */
function readShipped(io: CliIo, rel: string): string {
  const path = io.packagePath?.(rel) ?? `${PACKAGE_PREFIX}${rel}`;
  try {
    return io.readFile(path);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new CliError(
      `agents: cannot read the shipped ${rel} (looked at ${path}): ${reason}. ` +
        "The block quotes each skill's frontmatter description, so this command reads the " +
        "SKILL.md files out of the pcg-ts package the running CLI is itself part of. That " +
        "path above is where it looked; it does not retry anywhere else, so there is nothing " +
        `to search the filesystem for. Every pcg-ts that renders these rules ships skills/ ` +
        `beside its dist/, and this CLI is pcg-ts ${VERSION} — so that copy is not an older ` +
        "pcg-ts, it is an incomplete one (a pruned image layer, a vendored subset, a partial " +
        "extract), unless the error above is a permission or file-type error rather than a " +
        "missing file. Install pcg-ts again at the location the path names — " +
        "`npm explain pcg-ts` prints which copy resolves here and what required it. (Under " +
        "Yarn PnP, run the CLI through the PnP runtime, e.g. `yarn pcg agents`; a bare " +
        "node_modules path cannot exist there.)",
      { code: "file-unreadable", path },
    );
  }
}

/** Build `pcg agents` for a CLI whose command names `commandNames()` returns. */
export function makeAgentsCommand(commandNames: () => readonly string[]): Command {
  const data = (io: CliIo): AgentRulesData =>
    agentRulesData({ version: VERSION, commands: commandNames(), readShipped: (rel) => readShipped(io, rel) });

  return {
    spec: {
      name: "agents",
      summary:
        "Print the rules block for coding agents: this version's instructions, where the installed docs are (node_modules/pcg-ts/...), the lookup commands, the skills and a name index. --write merges it into AGENTS.md between <!-- BEGIN:pcg-ts-agent-rules --> and <!-- END:pcg-ts-agent-rules -->, leaving every other byte of the file alone; --check exits 1 when it is missing or stale (for CI; an upgrade makes it fail on purpose). The paths are spelled node_modules/pcg-ts/..., which is wrong under Yarn PnP.",
      positionals: [],
      flags: {
        write: { kind: "boolean", description: "merge the block into the file (created when absent); a no-op when current" },
        check: {
          kind: "boolean",
          description: "exit 0 when the file carries the current block, 1 when it is missing or stale; writes nothing",
        },
        file: { kind: "string", value: "path", description: `the file --write and --check act on (default ${DEFAULT_AGENTS_FILE})` },
        claude: {
          kind: "boolean",
          description:
            "with --write, also make CLAUDE.md (beside the file) import it with an @AGENTS.md line, which is how Claude Code reads AGENTS.md; with --check, also fail when that line is missing",
        },
      },
    },
    run(args, io): Promise<CommandOutcome> {
      const write = boolFlag(args, "write");
      const check = boolFlag(args, "check");
      const claude = boolFlag(args, "claude");
      const given = stringFlag(args, "file");
      if (write && check) {
        throw new CliUsageError("agents: --write and --check are exclusive; --check reports, --write fixes");
      }
      if (!write && !check && (given !== undefined || claude)) {
        throw new CliUsageError(
          `agents: ${given !== undefined ? "--file" : "--claude"} applies only with --write or --check; run "pcg agents --write${given !== undefined ? ` --file ${given}` : ""}${claude ? " --claude" : ""}"`,
        );
      }

      const block = renderAgentBlock(data(io));
      const bytes = utf8Bytes(block);

      if (!write && !check) {
        return Promise.resolve({
          text: `${block}\n`,
          json: { file: null, changed: false, bytes, version: VERSION, block },
        });
      }

      const file = given ?? DEFAULT_AGENTS_FILE;
      const name = baseName(file);
      const claudeFile = `${directoryOf(file)}CLAUDE.md`;
      const importLine = claudeImportLine(name);
      const target = readOrEmpty(io, file);

      let merged: { text: string; changed: boolean };
      try {
        merged = applyManagedBlock(target.text, block, file);
      } catch (err) {
        if (err instanceof ManagedBlockError) {
          throw new CliError(`agents: ${err.message}`, { code: "agent-rules-malformed", path: file });
        }
        throw err;
      }

      if (check) {
        if (merged.changed) {
          const present = target.exists && findManagedBlock(target.text, file) !== undefined;
          throw new CliError(
            present
              ? `agents: ${file} carries a pcg-ts agent-rules block that differs from the one pcg-ts ${VERSION} renders (an upgrade, or an edit inside the markers); run "npx pcg agents --write" and commit the result`
              : `agents: ${file} ${target.exists ? "has no" : "does not exist, so it has no"} pcg-ts agent-rules block; run "npx pcg agents --write" and commit the result`,
            { code: present ? "agent-rules-stale" : "agent-rules-missing", path: file },
          );
        }
        if (claude) {
          const md = readOrEmpty(io, claudeFile);
          if (!hasImportLine(md.text, importLine)) {
            throw new CliError(
              `agents: ${claudeFile} ${md.exists ? "does not import" : "does not exist, so nothing imports"} ${name}, so Claude Code never reads the block; run "npx pcg agents --write --claude" (it adds the line ${importLine})`,
              { code: "agent-import-missing", path: claudeFile },
            );
          }
        }
        return Promise.resolve({
          text: `${file}: the pcg-ts ${VERSION} agent rules are current\n`,
          json: { file, changed: false, bytes, version: VERSION },
        });
      }

      if (merged.changed) io.writeFile(file, merged.text);
      const lines = [
        merged.changed
          ? `${file}: wrote the pcg-ts ${VERSION} agent rules (${bytes} bytes)`
          : `${file}: the pcg-ts ${VERSION} agent rules are already current`,
      ];
      const json: Record<string, unknown> = { file, changed: merged.changed, bytes, version: VERSION };

      const md = readOrEmpty(io, claudeFile);
      if (claude) {
        const imported = ensureImportLine(md.text, importLine);
        if (imported.changed) io.writeFile(claudeFile, imported.text);
        lines.push(
          imported.changed
            ? `${claudeFile}: added ${importLine}, so Claude Code reads ${name}`
            : `${claudeFile}: already imports ${name}`,
        );
        json["claude"] = { file: claudeFile, changed: imported.changed };
      } else if (md.exists && !hasImportLine(md.text, importLine)) {
        const hint = `hint: ${claudeFile} does not import ${name}, so Claude Code will not read the block; run "npx pcg agents --write --claude" or add the line ${importLine}`;
        lines.push(hint);
        json["hint"] = hint;
      }
      return Promise.resolve({ text: `${lines.join("\n")}\n`, json });
    },
  };
}
