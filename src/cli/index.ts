/**
 * `pcg` — the graph CLI: the authoring feedback loop an agent (or a
 * human, or CI) runs against a graph JSON file without writing a bespoke
 * script. Catalogs (`nodes`, `fields`, `schema`), then validate → cook →
 * inspect → render; `agents` writes the pointer block a consumer project's
 * AGENTS.md carries.
 *
 * Exit codes: 0 success; 1 a named thing that does not exist or a run that
 * failed (unreadable file, unknown node or output, a cook that threw); 2 a
 * misuse of the command line; 3 an invalid graph document (not JSON,
 * refused by the loader, or failing the structural checks on the part the
 * command cooks). With `--json`, every failure prints ONE JSON object on
 * stdout — `{ ok: false, command, exitCode, errors, warnings }`, the records
 * being `Diagnostic`s — while stderr carries the same failure as text.
 * Library errors are printed verbatim — naming the offending node, pin or
 * param is the library's job, and the CLI must not paraphrase it.
 */
// Side-effect import: REGISTERS the shipped vocabulary. Names are
// resolved inside `deserializeGraph`, which reads a global registry
// populated by importing the module that declares the primitives — so
// without this line `pcg run` reports that no subgraphs exist and `pcg
// validate` rejects every graph referencing one, while the primitives sit
// unreachable in the same package. It is imported here, at the single CLI
// entry, rather than per command, so no command can be added that forgets.
import "../primitives/index.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { type Diagnostic, VERSION, diagnosticsOf } from "../index.js";
import {
  type CommandSpec,
  CliUsageError,
  type ParsedArgs,
  boolFlag,
  commandHelp,
  parseArgs,
  usageLine,
} from "./args.js";
import { COMMANDS, type Command } from "./commands.js";
import { CliError, EXIT_FAILURE, EXIT_INVALID_GRAPH, EXIT_OK, EXIT_USAGE } from "./errors.js";
import type { CliIo } from "./io.js";
import { type FailureReport, type RunContext, diagnosticLine } from "./report.js";

export { type CliIo } from "./io.js";
export { makeNodeIo } from "./nodeIo.js";
export { CliUsageError } from "./args.js";
export { CliError } from "./errors.js";
export type { FailureReport } from "./report.js";
export { renderSvg, type ColorDomain, type RenderOptions, type RenderResult } from "./render.js";
export {
  type AttrStats,
  type GeometrySummary,
  type ItemSummary,
  attributeStats,
  geometrySummary,
  summarizeItem,
} from "./summary.js";
/**
 * Exit codes the CLI returns: {@link EXIT_OK} 0, {@link EXIT_FAILURE} 1 (a
 * named thing does not exist, or the run failed), {@link EXIT_USAGE} 2 (the
 * command line is wrong), {@link EXIT_INVALID_GRAPH} 3 (the graph document
 * is invalid). Defined in `./errors.js`, beside the errors that carry them.
 */
export { EXIT_FAILURE, EXIT_INVALID_GRAPH, EXIT_OK, EXIT_USAGE } from "./errors.js";

function commandNames(): string[] {
  return COMMANDS.map((c) => c.spec.name);
}

function topLevelHelp(): string {
  const width = Math.max(...COMMANDS.map((c) => c.spec.name.length));
  const lines = [
    "pcg — deterministic procedural content generation, from the command line",
    "",
    "usage: pcg <command> [args] [flags]",
    "",
    "Commands:",
    ...COMMANDS.map((c) => `  ${c.spec.name.padEnd(width)}  ${c.spec.summary.split(". ")[0]}.`),
    "",
    "Flags:",
    "  --json       print the machine-readable report instead of text",
    "  --help, -h   print usage (per command: pcg <command> --help)",
    "  --version    print the library version",
    "",
    "Exit codes:",
    "  0  the command did what it was asked",
    "  1  a named thing does not exist, or the run failed: a node type, field fn,",
    "     node id, output or primitive named ON THE COMMAND LINE; unreadable file;",
    "     a cook that threw (a wrong node type, param or field fn inside the graph",
    "     file is a 3; a wrong attribute name surfaces at cook, as a 1)",
    "  2  the command line itself is wrong: unknown command, unknown flag, or a",
    "     flag value of the wrong shape or out of range",
    "  3  the graph is invalid: the file is not JSON, the loader refuses it, or the part",
    "     of the graph the command cooks fails the checks (an unconnected required pin",
    "     — which includes pcg run on a primitive whose geometry input it cannot bind);",
    "     with validate --strict, any warning as well",
    "",
    "Failures: stderr carries the text. With --json, stdout carries exactly one object,",
    '  { "ok": false, "command", "exitCode", "errors": [...], "warnings": [...] },',
    "  whose records carry a stable code, a JSON pointer path and the node, pin or param",
    "  at fault (pcg schema diagnostic prints their JSON Schema and every code).",
    "",
    "The loop: pcg validate g.json && pcg cook g.json --stats && pcg inspect g.json --node <id>",
    "Look at it: pcg render g.json --out g.png draws hero, ground, top and side views.",
    "Start from an example: pcg graphs --node <type> lists corpus graphs that cook as printed.",
    "For coding agents: npx pcg agents --write puts this version's rules into AGENTS.md.",
    "",
    ...COMMANDS.map((c) => `  ${usageLine(c.spec)}`),
    "",
  ];
  return lines.join("\n");
}

/**
 * Did the caller ask for help on a line whose only fault is its missing
 * positional arguments? Re-parses against the same spec with the
 * positionals made optional, so every other rule — unknown flags, missing
 * flag values, repeats — still decides, and only the arity is forgiven.
 * Returns the relaxed parse when it did, so the command's own help hook
 * sees the same arguments it would on a complete line.
 */
function helpWithoutArguments(rest: readonly string[], spec: CommandSpec): ParsedArgs | undefined {
  try {
    const relaxed: CommandSpec = {
      ...spec,
      positionals: spec.positionals.map((p) => ({ ...p, required: false })),
    };
    const args = parseArgs(rest, relaxed);
    return boolFlag(args, "help") ? args : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Did a line that could NOT be parsed ask for JSON? Read from the raw
 * tokens, up to the end-of-flags marker, because a failed parse has no
 * flags map to ask — and "print one JSON object on every failure" has to
 * include the failure to parse.
 */
function wantsJson(tokens: readonly string[]): boolean {
  let json = false;
  for (const token of tokens) {
    if (token === "--") break;
    if (token === "--json" || token === "--json=true") json = true;
    else if (token === "--json=false") json = false;
  }
  return json;
}

/** `--json`, `--json=true` or `--json=false`. */
const JSON_TOKEN = /^--json(=true|=false)?$/;

/** Does the line spell the json flag at all, before the end-of-flags marker? */
function mentionsJson(tokens: readonly string[]): boolean {
  for (const token of tokens) {
    if (token === "--") return false;
    if (token === "--json" || token.startsWith("--json=")) return true;
  }
  return false;
}

/** The unknown-command refusal, with the nearest command named first. */
function unknownCommand(name: string): CliUsageError {
  const names = commandNames();
  const near = suggestNames(name, names);
  return new CliUsageError(`unknown command "${name}"; ${near.clause}commands: ${names.join(", ")}`, {
    code: "unknown-command",
    got: name,
    valid: names,
    ...(near.names.length > 0 ? { didYouMean: near.names } : {}),
  });
}

/** The records and exit code for any thrown value. */
function classify(err: unknown): { exitCode: number; errors: readonly Diagnostic[]; warnings: readonly Diagnostic[] } {
  if (err instanceof CliUsageError) return { exitCode: EXIT_USAGE, errors: err.diagnostics, warnings: [] };
  if (err instanceof CliError) return { exitCode: err.exitCode, errors: err.diagnostics, warnings: err.warnings };
  const errors = diagnosticsOf(err);
  // The loader's own class, reaching here unwrapped, is a document the CLI
  // handed it — refused like any other invalid graph.
  const name = typeof err === "object" && err !== null ? (err as { name?: unknown }).name : undefined;
  return { exitCode: name === "GraphSerializationError" ? EXIT_INVALID_GRAPH : EXIT_FAILURE, errors, warnings: [] };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Report one failure: the text on stderr, and — under `--json` — the one
 * {@link FailureReport} on stdout. Returns the exit code.
 */
function fail(
  io: CliIo,
  json: boolean,
  command: string | null,
  err: unknown,
  text: string,
  collected: readonly Diagnostic[] = [],
): number {
  const { exitCode, errors, warnings: carried } = classify(err);
  // Warnings a command reported before it failed ride along, unless the
  // error already carries the checks' own list (and printed it).
  const warnings = carried.length > 0 ? carried : collected;
  io.err(text.endsWith("\n") ? text : `${text}\n`);
  if (carried.length === 0) {
    for (const w of collected) io.err(`${diagnosticLine(w)}\n`);
  }
  if (json) {
    const report: FailureReport = { ok: false, command, exitCode, errors, warnings };
    io.out(JSON.stringify(report, null, 2) + "\n");
  }
  return exitCode;
}

/** `json` with `warnings` added, when it is a plain object that does not already carry them. */
function withWarnings(json: unknown, warnings: readonly Diagnostic[]): unknown {
  if (warnings.length === 0) return json;
  if (typeof json !== "object" || json === null || Array.isArray(json)) return json;
  if (Object.hasOwn(json, "warnings")) return json;
  return { ...json, warnings };
}

/**
 * Run one CLI invocation and return its exit code. Everything the CLI
 * touches goes through `io`, so this is fully testable in-process.
 */
export async function runCli(argv: readonly string[], io: CliIo): Promise<number> {
  // `pcg --json cook g.json` means what `pcg cook g.json --json` does: the
  // flag is global in the help, so a caller who puts it first is not wrong.
  // A spelling of the flag after the command wins over one before it.
  let line = argv;
  let leading: string | undefined;
  while (line[0] !== undefined && JSON_TOKEN.test(line[0])) {
    leading = line[0];
    line = line.slice(1);
  }
  const [first, ...given] = line;
  const leadingJson = leading !== undefined && wantsJson([leading]);
  const rest = leading !== undefined && !mentionsJson(given) ? [leading, ...given] : given;

  if (first === undefined || first === "--help" || first === "-h" || first === "help") {
    const wanted = first === "help" ? rest.find((t) => !t.startsWith("-")) : undefined;
    if (wanted !== undefined) {
      const command = COMMANDS.find((c) => c.spec.name === wanted);
      if (command === undefined) {
        const err = unknownCommand(wanted);
        return fail(io, wantsJson(rest), null, err, err.message);
      }
      io.out(commandHelp(command.spec));
      return EXIT_OK;
    }
    if (first === undefined) {
      if (leadingJson) {
        const err = new CliUsageError(`no command given; commands: ${commandNames().join(", ")}`);
        return fail(io, true, null, err, topLevelHelp());
      }
      io.err(topLevelHelp());
      return EXIT_USAGE;
    }
    io.out(topLevelHelp());
    return EXIT_OK;
  }

  if (first === "--version" || first === "-v") {
    io.out(`${VERSION}\n`);
    return EXIT_OK;
  }

  const command: Command | undefined = COMMANDS.find((c) => c.spec.name === first);
  if (command === undefined) {
    const err = unknownCommand(first);
    return fail(io, wantsJson(rest), null, err, `${err.message}\nrun "pcg --help" for usage`);
  }

  const warnings: Diagnostic[] = [];
  const ctx: RunContext = { warn: (records) => void warnings.push(...records) };
  let args: ParsedArgs | undefined;
  try {
    args = parseArgs(rest, command.spec);
    // Honoured only once the line has parsed, so a help token sitting in a
    // value position (`--out --help`) is the misuse it is rather than a
    // command line that silently succeeds without running anything.
    if (boolFlag(args, "help")) {
      io.out(command.help?.(args, io) ?? commandHelp(command.spec));
      return EXIT_OK;
    }
    const outcome = await command.run(args, io, ctx);
    const json = boolFlag(args, "json");
    for (const w of warnings) io.err(`${diagnosticLine(w)}\n`);
    io.out(json ? JSON.stringify(withWarnings(outcome.json, warnings), null, 2) + "\n" : outcome.text);
    return EXIT_OK;
  } catch (err) {
    const json = args !== undefined ? boolFlag(args, "json") : wantsJson(rest);
    const name = command.spec.name;
    if (err instanceof CliUsageError && args === undefined) {
      // `pcg inspect --help` is exactly what someone types when they do
      // not know which arguments it wants, so a line that is well-formed
      // except for its missing positionals still gets its help.
      const relaxed = helpWithoutArguments(rest, command.spec);
      if (relaxed !== undefined) {
        try {
          io.out(command.help?.(relaxed, io) ?? commandHelp(command.spec));
          return EXIT_OK;
        } catch (helpErr) {
          // A help hook fails the way `run` does — an unknown name is
          // exit 1 — and its message reaches the user unchanged.
          return fail(io, boolFlag(relaxed, "json"), name, helpErr, messageOf(helpErr));
        }
      }
    }
    if (err instanceof CliUsageError) {
      return fail(io, json, name, err, `${err.message}\nrun "pcg ${name} --help" for usage`, warnings);
    }
    // CliErrors and library errors alike reach the user unchanged, message and all.
    return fail(io, json, name, err, messageOf(err), warnings);
  }
}
