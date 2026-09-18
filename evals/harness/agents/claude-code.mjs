/**
 * Agent adapter: headless Claude Code as a blind consumer of the package.
 *
 *   launch({ cwd, prompt, model, budgets }) → {
 *     exitCode, transcriptPath, usage, turns, toolCalls, limitHit: { hit, resetAt? },
 *     capsHit, readPaths: { docs, graphs, skills, llms, pkg, outsideSandbox, contaminating }, ...
 *   }
 *
 * ISOLATION (the hard part). The session must see the sandbox and nothing of
 * this machine's configuration, yet still authenticate with the owner's
 * subscription login. The mechanisms, from the CLI reference for 2.1.272:
 *
 * - `--safe-mode`: "CLAUDE.md, skills, plugins, hooks, MCP servers, custom
 *   commands and agents, output styles, workflows, ... and auto memory do
 *   not load. Authentication, model selection, built-in tools, and
 *   permissions work normally". This is the switch that keeps OAuth, which
 *   `--bare` does not (bare reads only ANTHROPIC_API_KEY / apiKeyHelper).
 * - `--setting-sources ""`: loads no user/project/local settings files, so the
 *   owner's default model, effort, permission rules and auto-mode text stay out.
 * - `--strict-mcp-config --mcp-config <empty>`: no MCP servers from anywhere.
 * - `--disable-slash-commands`: no skills, belt and braces over safe mode.
 * - `--restricted`: confines the built-in file tools to the working
 *   directory, and loads only managed settings and --settings.
 * - `--no-chrome`, `--no-session-persistence`: no browser bridge; no session
 *   written into the owner's resume history.
 * - env `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`,
 *   `DISABLE_AUTOUPDATER=1`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`.
 * - The parent session's plumbing variables (CLAUDECODE, CLAUDE_CODE_SESSION_ID,
 *   the messaging socket/token, ...) are removed from the child env and the
 *   removed NAMES are returned in the result, so it is recorded, not silent.
 *
 * None of this is trusted on its word: `selftest.mjs` runs an isolation probe
 * through this adapter and requires it to come back clean, and requires the
 * same probe with `isolation: false` from inside the repo to detect a leak.
 *
 * BILLING. The adapter refuses to launch when an API-key or third-party
 * provider variable is present in the environment it would pass: any of
 * them silently moves the eval off the subscription allowance. It strips
 * none of them; it refuses and names them.
 *
 * OBSERVED on 2.1.272 (one real session, 2026-09-15): with the flags above
 * the init event reported mcp_servers [], plugins [], slash_commands [],
 * skills [], output_style "default", apiKeySource "none" (subscription
 * login), and no session directory appeared under ~/.claude/projects.
 * `--restricted` does NOT confine the shell: `ls ..` ran and listed Temp.
 * That is why the sandbox sits one level inside a harness-owned jail
 * directory and why transcripts are parsed for outside paths.
 *
 * TOOLS. File and shell only: Bash, Read, Write, Edit, Glob, Grep.
 * No web tools, no subagents. Permissions: `dontAsk` with those tools in
 * `--allowedTools`, so nothing ever waits for a human; anything that would
 * prompt is denied and shows up in the result's `permission_denials`.
 */
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { classifySession } from "../limits.mjs";
import { SANDBOX_PREFIX, claudeConfigDir, isInside, sha256, sha256File } from "../sandbox.mjs";

export { claudeConfigDir };

export const id = "claude-code";
export const ADAPTER_FILE = fileURLToPath(import.meta.url);

/**
 * File and shell tools. Observed on 2.1.272 / Windows: the session's init
 * reports exactly ["Bash","Edit","Glob","Grep","Read","Write"] for this list
 * (Bash is Git Bash there). PowerShell is left out: it is not enabled by
 * default, and a tool that exists on one machine and not another is drift.
 */
export const DEFAULT_TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep"];

/** Environment variables that would bill per token or route to another provider. */
export const BILLING_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "ANTHROPIC_VERTEX_BASE_URL",
  "ANTHROPIC_VERTEX_PROJECT_ID",
  "ANTHROPIC_FOUNDRY_API_KEY",
  "ANTHROPIC_FOUNDRY_BASE_URL",
  "ANTHROPIC_FOUNDRY_RESOURCE",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY",
  "AWS_BEARER_TOKEN_BEDROCK",
  "CLAUDE_CODE_API_KEY_HELPER_TTL_MS",
];

/** Plumbing a parent Claude Code session exports to its children. */
export const SESSION_ENV_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_BRIDGE_SESSION_ID",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_SSE_PORT",
  "CLAUDE_CODE_SAFE_MODE",
  "CLAUDE_CODE_SIMPLE",
  "CLAUDE_PID",
  "CLAUDE_EFFORT",
  "CLAUDE_SETTINGS_SOURCES",
  "AI_AGENT",
];

/** Every name a tool might read the temp directory from. */
export const TEMP_ENV_VARS = ["TMPDIR", "TEMP", "TMP"];

export const ISOLATION_ENV = {
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DISABLE_AUTOUPDATER: "1",
  ENABLE_CLAUDEAI_MCP_SERVERS: "false",
};

/** Names of billing variables set (non-empty) in `env`. */
export function billingEnvViolations(env = process.env) {
  const keys = Object.keys(env);
  const present = (name) => keys.find((k) => (process.platform === "win32" ? k.toUpperCase() === name : k === name));
  return BILLING_ENV_VARS.map(present).filter((k) => k && String(env[k]).trim() !== "");
}

export class BillingEnvError extends Error {
  constructor(vars) {
    super(
      `refusing to launch: ${vars.join(", ")} ${vars.length === 1 ? "is" : "are"} set. ` +
        `An API key or provider variable moves the eval from the subscription allowance to per-token billing ` +
        `(or to another provider). Unset ${vars.length === 1 ? "it" : "them"} in the shell that starts the runner; the harness will not strip ${vars.length === 1 ? "it" : "them"} for you.`,
    );
    this.name = "BillingEnvError";
    this.vars = vars;
  }
}

/** Installed Claude Code version string, e.g. "2.1.272". */
export function cliVersion(command = "claude") {
  const r = spawnSync(command, ["--version"], { encoding: "utf8", windowsHide: true, shell: false });
  if (r.status !== 0) throw new Error(`cannot run \`${command} --version\`: ${r.error?.message ?? r.stderr}`);
  return (/(\d+\.\d+\.\d+)/.exec(r.stdout) ?? [null, r.stdout.trim()])[1];
}

export function adapterHash() {
  return sha256File(ADAPTER_FILE);
}

/**
 * What the isolation probe actually validates: the arguments and environment
 * a session is launched with, and the launcher itself — not the transcript
 * parser, which changes far more often and cannot affect what a session
 * loads. The probe cache is keyed on this, so a classifier fix does not cost
 * two probe sessions.
 */
export function isolationFingerprint() {
  return sha256(
    JSON.stringify({
      isolated: buildArgs({ model: "<model>", budgets: { turns: 1, wallMinutes: 1, outputTokens: 1 }, mcpConfigPath: "<mcp>" }),
      control: buildArgs({ model: "<model>", budgets: { turns: 1 }, isolation: false, tools: [] }),
      isolationEnv: ISOLATION_ENV,
      sessionEnvVars: SESSION_ENV_VARS,
      billingEnvVars: BILLING_ENV_VARS,
      tempEnvVars: TEMP_ENV_VARS,
      tools: DEFAULT_TOOLS,
      code: [buildArgs, buildEnv, launch].map((f) => f.toString()),
    }),
  );
}

/** Build the child env: copy, remove session plumbing, add isolation vars. */
export function buildEnv(baseEnv = process.env, { isolation = true, tmpDir = null } = {}) {
  const violations = billingEnvViolations(baseEnv);
  if (violations.length) throw new BillingEnvError(violations);
  const env = {};
  const removed = [];
  const upperSession = new Set(SESSION_ENV_VARS);
  for (const [k, v] of Object.entries(baseEnv)) {
    const key = process.platform === "win32" ? k.toUpperCase() : k;
    if (upperSession.has(key)) {
      removed.push(k);
      continue;
    }
    env[k] = v;
  }
  if (isolation) Object.assign(env, ISOLATION_ENV);
  // Point the session's temp directory at the run's own. All three names,
  // because which one a tool consults varies: POSIX code reads TMPDIR,
  // Windows reads TEMP and TMP, and Git Bash's `/tmp` follows TMP. Without
  // this a scratch write (`pcg render --out /tmp/a.svg`, observed in
  // calibration) lands in the shared OS temp directory, where it is
  // indistinguishable from the orchestrator's files and where the NEXT run
  // could read it. Existing spellings are deleted first: Windows env lookup
  // is case-insensitive, so leaving a stray `Temp` beside `TEMP` would let
  // the old value win.
  if (tmpDir) {
    for (const name of TEMP_ENV_VARS) {
      for (const k of Object.keys(env)) if (k.toUpperCase() === name) delete env[k];
      env[name] = tmpDir;
    }
  }
  return { env, removed };
}

/** CLI arguments for one session. The prompt goes on stdin. */
export function buildArgs({ model, budgets = {}, isolation = true, tools = DEFAULT_TOOLS, mcpConfigPath, effort }) {
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--no-chrome"];
  if (model) args.push("--model", model);
  if (effort) args.push("--effort", effort);
  if (budgets.turns) args.push("--max-turns", String(budgets.turns));
  args.push("--tools", tools.join(","));
  args.push("--permission-mode", "dontAsk");
  if (tools.length) args.push("--allowedTools", tools.join(","));
  if (isolation) {
    if (!mcpConfigPath) throw new Error("buildArgs: isolation needs an empty mcpConfigPath");
    args.push(
      "--safe-mode",
      "--restricted",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--mcp-config",
      mcpConfigPath,
      "--disable-slash-commands",
    );
  }
  return args;
}

/** Kill a process tree (Windows needs taskkill /T to reach the tool children). */
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

// ---------------------------------------------------------------------------
// Transcript parsing
// ---------------------------------------------------------------------------

const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`|;&<>()]+/gi;

/**
 * Commands that fetch from outside the machine or read the npm cache. Each
 * can put material into the session that the arm does not ship (the
 * published package, the web docs, the cached unstripped tarball), so a
 * match is CONTAMINATING, not just logged. A plain `npm install` with no
 * package argument reinstalls `file:../pcg-ts.tgz` and is not a fetch.
 */
const PKG_ARG = String.raw`(?:[ \t]+-\S+)*[ \t]+`;
/** A package-like argument: not a flag, a redirection, a comment or a command separator. */
const PKG = String.raw`(?![0-9]*[<>]|#)[^-\s;&|<>#]\S*`;
const NOT_PCG = String.raw`(?!(?:pcg|pcg-ts)(?=[ \t]|$))`;
const NET_CMD = new RegExp(
  [
    String.raw`\b(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Start-BitsTransfer)\b`,
    String.raw`\bgit[ \t]+(?:clone|fetch|pull|ls-remote)\b`,
    String.raw`\bnpm(?:\.cmd)?[ \t]+(?:view|v|info|show|search|s|pack|cache|docs|repo|home|bugs|outdated|dist-tag)\b`,
    String.raw`\bnpm(?:\.cmd)?[ \t]+config[ \t]+(?:get|list|ls)\b`,
    String.raw`\bnpm(?:\.cmd)?[ \t]+(?:install|i|add|ci|update|up)` + PKG_ARG + PKG,
    String.raw`\bnpm(?:\.cmd)?[ \t]+exec` + PKG_ARG + NOT_PCG + PKG,
    String.raw`\bnpx(?:\.cmd)?` + PKG_ARG + NOT_PCG + PKG,
    String.raw`\b(?:pip|pip3)[ \t]+install\b`,
    String.raw`\b(?:yarn|pnpm)[ \t]+(?:add|dlx|info|view)\b`,
  ].join("|"),
  "gi",
);

/** Root directories a POSIX-style token may name; anything else starting with "/" is a regex, a comment or an operator. */
const POSIX_ROOTS = /^\/(?:tmp|home|Users|usr|etc|var|opt|root|mnt|proc|dev|bin|sbin|lib|lib64|mingw32|mingw64|clang64|ucrt64|cmd|private|Volumes|cygdrive|srv|sys|run|media|snap|boot|workspace|workspaces)(?:\/|$)/;

/** Environment variables a path may start with, and what they name. */
function envValue(name, cwd) {
  const n = name.toUpperCase();
  if (n === "PWD") return cwd;
  if (n === "HOME" || n === "USERPROFILE") return homedir();
  if (n === "TEMP" || n === "TMP" || n === "TMPDIR") return tmpdir();
  if (n === "NPM_CONFIG_CACHE") return process.env.npm_config_cache || join(process.env.LOCALAPPDATA || homedir(), "npm-cache");
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === n);
  return key ? process.env[key] : null;
}

/** Git Bash `/c/Users/x` → `C:\Users\x` on Windows. */
function msysToWin(p) {
  const m = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(p);
  return m ? `${m[1].toUpperCase()}:\\${(m[2] ?? "").replace(/\//g, "\\")}` : p;
}

/**
 * Shell-ish tokens of a command, two ways: quote-aware (so "C:/Program Files/x"
 * stays one path) and fine-grained (split on quotes and code punctuation, so
 * paths inside `node -e "...readFileSync('../../x')..."` surface too).
 */
export function commandTokens(command) {
  const text = String(command)
    .replace(URL_RE, " ")
    .replace(/\$\(\([^()]*\)\)/g, " ") // shell arithmetic: `$((a / b))` divides, it names no root
    .replace(/\$\{(\w+)\}/g, (_, name) => `$${name}`);
  const quoted = [];
  for (const m of text.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) quoted.push(m[1] ?? m[2]);
  const fine = text.split(/[\s"'`;&|()<>,=]+|\$\(/).filter(Boolean);
  const coarse = quoted.filter((q) => /\s/.test(q) && !/[\n;|&]/.test(q));
  return { fine: fine.filter((t) => !coarse.some((q) => q.startsWith(`${t} `) && q !== t)), coarse };
}

/**
 * Resolve one token to a path if it is path-shaped: absolute (Windows, Git
 * Bash `/c/`, POSIX), home (`~` at token start only), an environment variable
 * at token start, a `..` segment anywhere, or a reference into node_modules.
 * Returns null for anything else. On Windows, POSIX roots other than `/tmp`
 * and `/c/` come back as `msys:<path>`.
 */
export function tokenPath(token, cwd, { bareRoot = true } = {}) {
  let t = token.replace(/[,;:]+$/, "");
  if (!t || t.startsWith("-") || /^\d+$/.test(t)) return null;
  const glob = t.search(/[*?[{]/);
  if (glob === 0) return null;
  if (glob > 0) t = t.slice(0, glob).replace(/[^\\/]*$/, "") || ".";
  const env = /^(?:\$\{(\w+)\}|\$env:(\w+)|%(\w+)%|\$(\w+))(.*)$/i.exec(t);
  if (env) {
    const value = envValue(env[1] ?? env[2] ?? env[3] ?? env[4], cwd);
    if (!value) return null;
    t = value + env[5];
  }
  const win = process.platform === "win32";
  // A BARE `~` is the home directory only as an argument of a filesystem
  // command, exactly as a bare `/` is just below. Otherwise it is punctuation:
  // `awk '$0 ~ /^## /'` matches a regex, and quote stripping in
  // `commandTokens` leaves the awk PROGRAM as bare tokens — which read as
  // "this run opened the home directory" and cost two re-runs in calibration.
  // `~/...` is unambiguous and stays unconditional; `cd ~` is handled by the
  // `cd` branch in scanShell, and `echo ~` by its own exemption there.
  if (t === "~") return bareRoot ? homedir() : null;
  if (/^~[\\/]/.test(t)) return resolve(homedir(), t.slice(2) || ".");
  if (/^[A-Za-z]:[\\/]/.test(t)) return resolve(t);
  if (t.startsWith("/")) {
    if (t.startsWith("//")) return null; // a comment or a URL remnant, never a path here
    if (t === "/") return bareRoot ? (win ? "msys:/" : "/") : null;
    if (win && /^\/[a-zA-Z]\//.test(t)) return resolve(msysToWin(t));
    if (win && /^\/[a-zA-Z]$/.test(t)) return bareRoot ? resolve(msysToWin(t)) : null; // `sed '/x/,/y/p'` ends in `/p`
    if (!POSIX_ROOTS.test(t)) return null;
    if (!win) return resolve(t);
    if (t === "/tmp" || t.startsWith("/tmp/")) return resolve(tmpdir(), t.slice(5) || ".");
    return `msys:${t}`;
  }
  if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(t) || /(?:^|[\\/])node_modules(?:[\\/]|$)/.test(t)) return resolve(cwd, t);
  return null;
}

/**
 * Path-like tokens a shell command (or a script the agent wrote) references,
 * resolved against `cwd`. A heuristic: it cannot follow a `cd` into a
 * relative path, but the `cd` target itself is caught.
 */
export function extractCommandPaths(command, cwd, { bareRoot = true } = {}) {
  return [...new Set(extractCommandPathEntries(command, cwd, { bareRoot }).map((e) => e.path))];
}

/** Like extractCommandPaths, with `glob: true` for a path cut back at a wildcard (it reads what lies under the cut). */
export function extractCommandPathEntries(command, cwd, { bareRoot = true } = {}) {
  const out = new Map();
  const { fine, coarse } = commandTokens(command);
  for (const t of [...coarse, ...fine]) {
    const p = tokenPath(t, cwd, { bareRoot });
    if (!p) continue;
    const glob = /[*?[{]/.test(t);
    out.set(p, { path: p, token: t, glob: glob || out.get(p)?.glob === true });
  }
  return [...out.values()];
}

/** A token that names a file or directory relative to wherever the shell is: has a separator, starts with a dot, or has an extension. */
function pathLike(token) {
  const t = String(token);
  if (!t || t.startsWith("-") || /^\d+(?:\.\d+)?$/.test(t) || /^[=:]+$/.test(t)) return false;
  return /[\\/]/.test(t) || /^\.[\w.-]/.test(t) || /^[\w@+-][\w.@+-]*\.[A-Za-z][A-Za-z0-9]{0,7}$/.test(t);
}

/** Shell segments: a command line split at separators, so each clause is judged on its own. */
export function commandSegments(command) {
  return String(command).split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Commit a shell's end state to the session after one tool call.
 *
 * The Bash tool keeps ONE shell, so its working directory survives between
 * calls: `cd node_modules/pcg-ts` in one call and `cat ../../graph.json` in
 * the next names the sandbox's own graph. Resetting to the sandbox each call
 * put that read two levels too high and discarded three pilot runs.
 *
 * When the call reported an error we cannot tell how far the command got, so
 * we take whichever reading leaves the shell INSIDE the sandbox. A wrong
 * guess that moves it out turns every later relative path into a false
 * contamination, and a re-run costs more than a run's worth of doubt.
 */
export function commitShellState(before, after, errored, sandbox) {
  if (!errored) return after;
  if (isInside(after.cwd, sandbox)) return after;
  if (isInside(before.cwd, sandbox)) return before;
  return after;
}

/**
 * Clauses that read a directory's CONTENTS rather than list its names. A bare
 * listing of the sandbox root is benign; one of these aimed at it is not.
 */
const RECURSIVE_SEGMENT = /^(?:\S*[\\/])?(?:find|tree|du|rg|ag|fd|fdfind)\b|^(?:\S*[\\/])?(?:e|f)?grep\b[^\n]*\s-[a-zA-Z]*[rRd]|^(?:\S*[\\/])?ls\b[^\n]*\s-[a-zA-Z]*R|Get-ChildItem\b[^\n]*-Recurse|^dir\b[^\n]*\/s\b|\bcp\b[^\n]*\s-[a-zA-Z]*[rR]|\btar\b|\bzip\b|\b7z\b|^(?:\S*[\\/])?(?:ln|rsync|robocopy|xcopy)\b|\bcp\b[^\n]*\s-[a-zA-Z]*a|^\s*\w+=\S/i;

/** Commands whose arguments are files or directories they read (patterns first where noted). */
const READ_VERBS = new Set(["cat", "head", "tail", "less", "more", "type", "ls", "dir", "grep", "egrep", "fgrep", "rg", "find", "tree", "sed", "awk", "wc", "file", "stat", "cp", "du", "od", "xxd", "strings", "jq", "get-content", "gc", "get-childitem", "gci", "tar", "node"]);
const PATTERN_FIRST = new Set(["grep", "egrep", "fgrep", "rg", "sed", "awk", "jq"]);
const RECURSIVE_VERBS = new Set(["find", "tree", "du", "rg"]);

/** The body of a script the agent wrote, reduced to what can name a path. */
export function scriptPathText(file, body) {
  if (/\.(?:js|mjs|cjs|ts|mts|cts|py)$/i.test(file)) {
    // Code: only string literals can name a path; regexes, comments and operators cannot.
    const literals = [...String(body).matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
    return { text: literals.join("\n"), bareRoot: false };
  }
  // Shell-like: drop comment lines.
  const lines = String(body).split(/\r?\n/).filter((l) => !/^\s*(?:#|rem\b|::)/i.test(l));
  return { text: lines.join("\n"), bareRoot: true };
}

/** Network-shaped and cache-reading commands (contaminating), plus bare URLs (logged). */
export function extractNetworkAttempts(command) {
  const commands = [...String(command).matchAll(NET_CMD)].map((m) => m[0].trim().replace(/\s+/g, " "));
  const urls = [...String(command).matchAll(URL_RE)].map((m) => m[0]);
  return { commands, urls };
}

/** File extensions whose written content is scanned like a shell command. */
const SCRIPT_EXT = /\.(?:sh|bash|zsh|ps1|psm1|bat|cmd|js|mjs|cjs|ts|mts|py)$/i;

/**
 * Heredocs out of a shell command: the command without their bodies, and each
 * body with the file it was redirected into (a heredoc body is a script the
 * agent wrote, not a sequence of shell clauses).
 */
export function splitHeredocs(command) {
  const heredocs = [];
  const lines = String(command).split("\n");
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /(?<!<)<<(?!<)-?\s*(['"]?)([A-Za-z_][\w-]*)\1/.exec(line);
    if (!m) {
      kept.push(line);
      continue;
    }
    const redir = /(?:^|[^<>&0-9])(>>?)\s*("[^"]*"|'[^']*'|[^\s;&|<>]+)/.exec(line.replace(m[0], " "));
    const target = redir?.[2];
    const shell = /^\s*(?:\S*[\\/])?(?:bash|sh|zsh|dash|ksh|pwsh|powershell)(?:\.exe)?\b/i.test(line);
    const body = [];
    let j = i + 1;
    for (; j < lines.length && lines[j].trim() !== m[2]; j++) body.push(lines[j]);
    heredocs.push({ target: target ? unquote(target) : null, append: redir?.[1] === ">>", shell, body: body.join("\n") });
    kept.push(line.replace(m[0], ` __PCGHEREDOC${heredocs.length - 1}__ `));
    i = j;
  }
  return { command: kept.join("\n"), heredocs };
}

function unquote(s) {
  const t = String(s).trim();
  return /^(["']).*\1$/.test(t) ? t.slice(1, -1) : t;
}

/** Quote-aware words of one clause. */
function shellWords(clause) {
  return (String(clause).match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? []).map(unquote);
}

/** A clause's output redirections: the clause without them, and their targets. */
export function stripRedirects(clause) {
  const targets = [];
  const appends = [];
  const text = String(clause).replace(/(?:^|(?<=[^<>&0-9]))(\d?>>?|&>>?)\s*("[^"]*"|'[^']*'|[^\s;&|<>]+)/g, (_, op, target) => {
    const t = unquote(target);
    if (!/^&\d*$|^\/dev\/null$|^NUL$|^\$null$/i.test(t)) (op.endsWith(">>") ? appends : targets).push(t);
    return " ";
  });
  return { text, targets, appends };
}

const BENIGN_PREFIXES_WIN = ["C:\\Windows\\", "C:\\Program Files\\Git\\", "C:\\Program Files\\nodejs\\"];
const BENIGN_EXACT = new Set(["/dev/null", "/dev/stdin", "/dev/stdout", "/dev/stderr", "NUL"]);

/** Claude Code's config dir, where it offloads a session's large tool results. */

/** The harness jail around a sandbox project (`<root>/pcg-eval-XXXX`), or null. */
function jailDir(sandbox) {
  const parent = dirname(resolve(sandbox));
  return basename(parent).startsWith(SANDBOX_PREFIX) ? parent : null;
}

/**
 * Classify an outside-sandbox path.
 *
 * Benign: devices; OS, toolchain and node install dirs; the harness jail
 * around this sandbox (it holds only the neutral tarball); a file or dir the
 * agent itself created during this session (`created`); this session's own
 * Claude Code directory (`sessionId`: large tool results are offloaded to
 * `<claude config>/projects/<slug>/<session>/tool-results/` and read back);
 * a `cd` to an ancestor of the sandbox, which reads nothing by itself; a
 * non-recursive listing of the dedicated sandbox root (names only); a
 * `node_modules` path under an ancestor of the sandbox (module resolution,
 * or a relative command run after such a `cd`); a Temp entry that did not
 * exist when the session started.
 *
 * Contaminating: everything else — repositories, the home directory, the
 * npm cache (unstripped copies of the package), other sandboxes, pre-existing
 * Temp entries such as the orchestrator's scratchpad, foreign directories
 * listed or searched, the filesystem root.
 */
export function classifyOutsidePath(p, { sandbox = null, tmpEntriesAtStart = null, benign = [], recursive = false, cd = false, created = [], createdDirs = [], sessionId = null, nodeEntry = false } = {}) {
  if (BENIGN_EXACT.has(p) || /^msys:\/dev\//.test(p)) return "benign";
  // A `cd` by itself reads nothing; what runs after it is judged in that directory.
  if (cd) return "benign";
  if (p.startsWith("msys:")) return /^msys:\/(?:usr|bin|etc\/profile|mingw64)(?:\/|$)/.test(p) ? "benign" : "contaminating";
  // Only what the agent itself created, exactly: a file it wrote, or a listing of a directory it made.
  const same = (a, b) => isInside(a, b) && isInside(b, a);
  // A created FILE is the agent's own however it is read (inline code counts as recursive; a file has no subtree).
  if (created.some((c) => same(p, c))) return "benign";
  if (!recursive && createdDirs.some((c) => same(p, c))) return "benign";
  if (sessionId) {
    const projects = join(claudeConfigDir(), "projects");
    if (isInside(p, projects)) {
      const parts = relative(projects, p).split(/[\\/]/);
      if (parts.length >= 2 && parts[1] === sessionId) return "benign";
    }
  }
  const nodeDir = dirname(process.execPath);
  const benignRoots = [nodeDir, ...benign, ...(process.platform === "win32" ? BENIGN_PREFIXES_WIN : ["/usr/bin/", "/usr/lib/", "/bin/", "/lib/", "/proc/self/"])];
  if (benignRoots.some((b) => isInside(p, b.replace(/[\\/]$/, "")))) return "benign";
  if (sandbox) {
    const jail = jailDir(sandbox);
    if (jail && isInside(p, jail)) return "benign";
    const ancestor = isInside(sandbox, p);
    if (ancestor && !recursive && jail && isInside(p, dirname(jail)) && isInside(dirname(jail), p)) return "benign";
    // The agent's own package reached from an ancestor (a relative `node node_modules/pcg-ts/...` after a `cd` up).
    const segs = resolve(p).split(/[\\/]/);
    const nm = segs.findIndex((s) => s.toLowerCase() === "node_modules");
    if (nodeEntry && !recursive && nm > 0 && segs[nm + 1]?.toLowerCase() === "pcg-ts" && isInside(sandbox, segs.slice(0, nm).join(sep) + (nm === 1 ? sep : ""))) return "benign";
  }
  const tmp = tmpdir();
  if (isInside(p, tmp) && resolve(p) !== resolve(tmp)) {
    const first = relative(tmp, p).split(/[\\/]/)[0];
    if (tmpEntriesAtStart && !/[*?[{]/.test(first) && !tmpEntriesAtStart.has(first.toLowerCase())) return "benign";
  }
  return "contaminating";
}

function packageArea(rel) {
  const r = rel.replace(/\\/g, "/");
  if (r === "llms.txt" || r.startsWith("llms")) return "llms";
  if (r === "docs" || r.startsWith("docs/")) return "docs";
  if (r === "graphs" || r.startsWith("graphs/")) return "graphs";
  if (r === "skills" || r.startsWith("skills/")) return "skills";
  return "pkg";
}

/**
 * Verbs that read the CONTENT of what they are given, as opposed to its name.
 * `ls`, `find`, `tree`, `du` and `stat` list; these open. The distinction is
 * what separates "the agent read the docs" from "the agent saw that a docs
 * directory exists" — counting the second as the first is how the calibration
 * report claimed skills were read in 38% of runs when one run of eight opened
 * a skill file.
 */
const CONTENT_VERBS = new Set([
  "cat", "head", "tail", "less", "more", "type", "grep", "egrep", "fgrep", "rg", "ag",
  "sed", "awk", "jq", "wc", "strings", "od", "xxd", "get-content", "gc", "select-string", "sls",
  "node", "deno", "bun", "python", "python3", "py", "perl", "ruby", "php", "diff", "cmp", "md5sum", "sha256sum",
]);

/**
 * Paths a piece of CODE writes: the first argument of an fs write call.
 * A path the script CREATED is its own however it reads it back, so this is
 * what keeps `node -e "...writeFileSync('/tmp/x')..."` from reading as a
 * reach into Temp. Found in the pilot as the last unrecorded write shape.
 */
export function scriptWrites(text) {
  const out = new Set();
  for (const m of String(text).matchAll(/\b(?:fs\.)?(?:writeFileSync|appendFileSync|createWriteStream|writeFile|appendFile|mkdirSync|copyFileSync|renameSync)\s*\(\s*(['"`])([^'"`\n]+)\1/g)) {
    out.add(m[2]);
  }
  return out;
}

/** Does this package-relative path name a file rather than a directory? */
function namesFile(rel) {
  const last = rel.replace(/\\/g, "/").split("/").pop() ?? "";
  return /\.[A-Za-z0-9]{1,8}$/.test(last);
}

const PCG_CMD = /(?:^|[\s;&|(])(?:npx\s+(?:--no-install\s+)?pcg|(?:\.[\\/])?node_modules[\\/]\.bin[\\/]pcg(?:\.cmd)?|node\s+\S*pcg-ts[\\/]bin[\\/]pcg\.mjs|pcg)\s+(nodes|fields|validate|assets|cook|run|inspect|render|--help|-h|--version)\b/g;

/**
 * Parse stream-json events into the run record's process metrics.
 * `events` are parsed objects (non-JSON lines as `{ type: "raw", line }`).
 */
export function parseTranscript(events, { cwd, tmpEntriesAtStart = null, benignRoots = [] } = {}) {
  const sandbox = resolve(cwd);
  const pcgDir = join(sandbox, "node_modules", "pcg-ts");
  const init = events.find((e) => e?.type === "system" && e?.subtype === "init") ?? null;
  const result = [...events].reverse().find((e) => e?.type === "result") ?? null;
  const sessionId = init?.session_id ?? null;
  const messageIds = new Set();
  const usageById = new Map();
  const toolUses = new Map();
  const toolCallsByName = {};
  const readSets = { docs: new Set(), graphs: new Set(), skills: new Set(), llms: new Set(), pkg: new Set() };
  // Touched but not opened: a directory the agent listed. Kept as evidence,
  // never counted as a read.
  const listSets = { docs: new Set(), graphs: new Set(), skills: new Set(), llms: new Set(), pkg: new Set() };
  const outside = new Set();
  const outsideWrites = new Set();
  const created = [];
  const createdDirs = [];
  const contaminating = new Set();
  const network = [];
  const writes = new Set();
  const pcgCommands = {};
  const pcgCommandResults = [];
  const rateLimitEvents = [];
  let finalText = "";

  // The Bash tool keeps ONE shell for the whole session: its working
  // directory, its `cd -` target and its pushd stack all survive between tool
  // calls. Initialised here, so a reset means a reset per session — which is
  // what a fresh sandbox gets.
  let shell = { cwd: sandbox, prev: sandbox, stack: [] };

  const toolErrors = new Map();
  for (const e of events) {
    if (e?.type !== "user" || !e.message) continue;
    for (const b of e.message.content ?? []) if (b?.type === "tool_result") toolErrors.set(b.tool_use_id, b.is_error === true);
  }

  const resolveArg = (arg, base) => {
    const a = unquote(arg);
    return tokenPath(a, base) ?? resolve(base, a);
  };

  /** Record a path the agent read (or, with `write`, wrote). */
  /**
   * `write`: false (a read), "create" (a truncating create: that exact file is
   * then the agent's own), "mkdir" (that exact directory may then be listed),
   * "append" (recorded, grants nothing: the file may have held anything).
   */
  const touch = (p, { write = false, recursive = false, cd = false, base = sandbox, nodeEntry = false, content = false } = {}) => {
    if (!p || typeof p !== "string") return;
    const abs = p.startsWith("msys:") ? p : resolveArg(p, base);
    if (abs.startsWith("msys:") || !isInside(abs, sandbox)) {
      if (write && !abs.startsWith("msys:")) {
        // Writing outside is recorded, not contamination.
        outsideWrites.add(abs);
        if (write === "create" && !/[*?]/.test(abs)) created.push(abs);
        // `mkdir -p` succeeds on a directory that already existed, so it grants nothing.
        return;
      }
      outside.add(abs);
      if (classifyOutsidePath(abs, { sandbox, tmpEntriesAtStart, benign: benignRoots, recursive, cd, created, createdDirs, sessionId, nodeEntry }) === "contaminating") contaminating.add(abs);
      return;
    }
    if (isInside(abs, pcgDir)) {
      const rel = relative(pcgDir, abs);
      const key = rel.replace(/\\/g, "/") || ".";
      // "Read the docs" has to mean a file was opened. A bare `ls docs` names
      // what is there and reads none of it; a recursive CONTENT verb
      // (`grep -r x docs/`) opens every file under it and does count.
      (namesFile(key) || (content && recursive) ? readSets : listSets)[packageArea(rel)].add(key);
    } else if (write) {
      writes.add(relative(sandbox, abs).replace(/\\/g, "/"));
    }
  };

  /** Scan a script body the agent wrote (a Write tool call, a heredoc). */
  const scanScript = (file, body, cwd = sandbox) => {
    const { text, bareRoot } = scriptPathText(file, body);
    const scriptDir = typeof file === "string" ? dirname(resolveArg(file, cwd)) : cwd;
    // A script can do anything to what it names, so its outside paths count as recursive reads.
    // A relative path may be meant against the script's folder (imports, URLs) or the cwd (fs calls):
    // it counts as outside only when both readings are.
    const written = scriptWrites(text);
    const inCwd = new Map(extractCommandPathEntries(text, cwd, { bareRoot }).map((e) => [e.token, e.path]));
    for (const e of extractCommandPathEntries(text, scriptDir, { bareRoot })) {
      const other = inCwd.get(e.token);
      const inside = [e.path, other].find((x) => x && !String(x).startsWith("msys:") && isInside(x, sandbox));
      const target = inside ?? other ?? e.path;
      // A created file is the script's own however it is read back; a
      // directory it made grants only a listing, so `mkdir` stays a create.
      if (written.has(e.token)) touch(target, { write: "create" });
      else touch(target, { recursive: true });
    }
    const net = extractNetworkAttempts(body);
    network.push(...net.commands);
    for (const c of net.commands) contaminating.add(`net:${c}`);
  };

  /** One shell tool call, clause by clause, following `cd`. */
  /**
   * One shell tool call. Takes and returns the shell's STATE, because the
   * Bash tool keeps one shell whose working directory survives between calls.
   * A nested call (a subshell, a heredoc fed to bash) is handed a copy and
   * its result is discarded: that is what makes `( cd x )` local.
   */
  const scanShell = (raw, depth = 0, startState = { cwd: sandbox, prev: sandbox, stack: [] }) => {
    const split = splitHeredocs(raw);
    const heredocs = split.heredocs;
    // `eval '...'` runs its string in THIS shell (a `cd` inside it moves the shell); `bash -c '...'`
    // runs it in a subshell. Both are lifted out whole before the command is split at separators,
    // which would otherwise cut through their quotes.
    const subshells = [];
    const command = split.command
      .replace(/\beval\s+(?:'([^']*)'|"((?:[^"\\]|\\.)*)")/g, (_, a, b) => a ?? b)
      .replace(/\b(?:bash|sh|zsh|dash)(?:\.exe)?\s+-c\s+(?:'([^']*)'|"((?:[^"\\]|\\.)*)")/g, (_, a, b) => {
        subshells.push(a ?? b);
        return ` __PCGSUBSHELL${subshells.length - 1}__ `;
      })
      // `( cd x && ... )` runs in a CHILD shell: the parent never moves. Only
      // groups that actually change directory are lifted, so a parenthesis in
      // ordinary code (`node -e "console.log(1)"`) is left alone. `$(` is
      // excluded — command substitution is the tokeniser's business.
      .replace(/(?<![$\w])\(([^()]*)\)/g, (whole, body) => {
        if (!/(?:^|[\s;&|])(?:cd|pushd|popd)(?:[\s;&|]|$)/.test(body)) return whole;
        subshells.push(body);
        return ` __PCGSUBSHELL${subshells.length - 1}__ `;
      });
    let vcwd = startState.cwd;
    let prevCwd = startState.prev;
    // A `pushd` inside a subshell must not survive it, so the stack is copied.
    const dirStack = [...(startState.stack ?? [])];
    for (const rawSeg of commandSegments(command)) {
      const markers = [...rawSeg.matchAll(/__PCGHEREDOC(\d+)__/g)].map((m) => heredocs[Number(m[1])]).filter(Boolean);
      for (const m of rawSeg.matchAll(/__PCGSUBSHELL(\d+)__/g)) if (depth < 3) scanShell(subshells[Number(m[1])] ?? "", depth + 1, { cwd: vcwd, prev: prevCwd, stack: dirStack });
      const seg = rawSeg.replace(/__PCGHEREDOC\d+__|__PCGSUBSHELL\d+__/g, " ");
      const { text, targets, appends } = stripRedirects(seg);
      const words = shellWords(text);
      const verb = (words[0] ?? "").replace(/^.*[\\/]/, "").replace(/\.exe$/i, "").toLowerCase();
      if (["cd", "pushd", "popd", "chdir", "set-location", "sl", "push-location", "pop-location"].includes(verb)) {
        // `-` is `cd`'s ARGUMENT, not a flag: skipping it the way a flag is
        // skipped turns `cd -` into bare `cd`, which goes home.
        const arg = words.slice(1).find((w) => w === "-" || !w.startsWith("-"));
        let target;
        if (verb === "popd" || verb === "pop-location") {
          // An empty stack leaves the shell where it is, as a real shell does.
          target = dirStack.length ? dirStack.pop() : vcwd;
        } else {
          if (verb === "pushd" || verb === "push-location") dirStack.push(vcwd);
          // Bare `cd` goes home; `cd -` returns to where the shell was before
          // its last move, which is not the same as staying put.
          target = !arg || arg === "~" ? homedir() : arg === "-" ? prevCwd : resolveArg(arg, vcwd);
        }
        touch(target, { cd: true });
        prevCwd = vcwd;
        vcwd = target;
        continue;
      }
      for (const h of markers) {
        if (h.target) touch(h.target, { write: h.append ? "append" : "create", base: vcwd });
        // A body fed to a shell is a script of shell clauses, cd and all; any other body is a file's content.
        if (h.shell && !h.target && depth < 3) scanShell(h.body, depth + 1, { cwd: vcwd, prev: prevCwd, stack: dirStack });
        else scanScript(h.target ?? "heredoc.sh", h.body, vcwd);
      }
      const flagless = words.slice(1).filter((x) => !x.startsWith("-"));
      for (const t of targets) touch(t, { write: "create", base: vcwd });
      for (const t of appends) touch(t, { write: "append", base: vcwd });
      if (["mkdir", "md", "new-item", "ni"].includes(verb)) for (const w of flagless) touch(w, { write: "mkdir", base: vcwd });
      if (verb === "touch") for (const w of flagless) touch(w, { write: "append", base: vcwd });
      // An output FLAG names a file the command CREATES. Without this,
      // `pcg render graph.json --out /tmp/a.svg` read as a READ of
      // /tmp/a.svg: the run was judged on whether that path looked
      // pre-existing rather than on the fact that this command made it.
      // Long forms only — `-o` is "only-matching" to grep and friends, and
      // guessing wrong there would invent writes that never happened.
      for (const [i, w] of words.entries()) {
        const m = /^--(?:out|output|outfile|out-file|out-dir|output-dir)(?:=(.*))?$/i.exec(w);
        if (!m) continue;
        const target = m[1] ?? words[i + 1];
        if (target && !target.startsWith("-")) touch(unquote(target), { write: "create", base: vcwd });
      }
      if (verb === "tee") for (const w of flagless) touch(w, { write: words.some((x) => /^-(?:a|-append)$/.test(x)) ? "append" : "create", base: vcwd });
      const tflag = words.findIndex((w) => w === "-t" || w.startsWith("--target-directory"));
      const targetDir = tflag < 0 ? null : words[tflag].includes("=") ? words[tflag].split("=")[1] : words[tflag + 1];
      const copyArgs = tflag < 0 ? flagless : words.slice(1).filter((x, i) => !x.startsWith("-") && i + 1 !== tflag + 1);
      if (["cp", "mv", "copy", "move", "copy-item", "move-item"].includes(verb) && (targetDir ? copyArgs.length >= 1 : copyArgs.length >= 2)) {
        const dest = targetDir ? `${targetDir}/` : copyArgs[copyArgs.length - 1];
        const sources = targetDir ? copyArgs.filter((x) => x !== targetDir) : copyArgs.slice(0, -1);
        const intoDir = /[\\/]$/.test(dest) || sources.length > 1 || !/\.[A-Za-z0-9]{1,8}$/.test(dest);
        for (const src of sources) touch(intoDir ? join(resolveArg(dest, vcwd), basename(unquote(src))) : dest, { write: "create", base: vcwd });
      }
      // A glob over an outside dir reads everything under it, like a recursive listing.
      // Inline code (`node -e`, `python -c`) can chdir and build paths: its outside paths read like a script's.
      const inlineCode = /^(?:node|deno|bun|python3?|py|perl|ruby|php)$/.test(verb) && words.some((w) => /^-(?:e|c|p|-eval|-print)$/.test(w));
      const recursive = inlineCode || RECURSIVE_SEGMENT.test(text) || /\.\.[\\/]\S*[*?[{]|--recursive|\brecursive\s*:\s*true/.test(text);
      // A bare `/` is the root only as an argument of a filesystem command; elsewhere it divides or splits.
      const bareRoot = /^(?:sudo\s+)?(?:\S*[\\/])?(?:find|ls|dir|tree|du|rg|ag|fd|e?grep|fgrep|Get-ChildItem|gci|cat|cp|tar|zip|stat)\b/i.test(text);
      // Only a truncating redirect hides its target from the clause's reads; `2>> F` beside `grep x F` still reads F.
      const writtenHere = new Set(targets.map((t) => resolveArg(t, vcwd).toLowerCase()));
      const destHere = ["cp", "mv", "copy", "move", "copy-item", "move-item", "mkdir", "md", "touch", "tee"].includes(verb) ? new Set((verb === "cp" || verb === "mv" || verb.startsWith("co") || verb.startsWith("mo") ? (targetDir ? [targetDir] : flagless.slice(-1)) : flagless).map((w) => resolveArg(w, vcwd).toLowerCase())) : new Set();
      // Inline code (`node -e`, `python -c`) writes through fs calls, not
      // through the shell, so its writes are invisible to stripRedirects.
      const codeWrites = scriptWrites(text);
      for (const { path, token, glob } of extractCommandPathEntries(text, vcwd, { bareRoot })) {
        const key = String(path).toLowerCase();
        // `echo $HOME`, `echo ~` print a name; they read nothing.
        if (["echo", "printf"].includes(verb) && /^(?:~|\$\{?\w+\}?|%\w+%|\$env:\w+)$/i.test(token)) continue;
        if (writtenHere.has(key) || destHere.has(key)) continue;
        // Inline code (`node -e`, `python -c`) writes through fs calls, not
        // through the shell, so its writes are invisible to stripRedirects.
        if (codeWrites.has(token)) touch(path, { write: "create", base: vcwd });
        else touch(path, { recursive: recursive || glob, content: CONTENT_VERBS.has(verb), nodeEntry: verb === "node" && token === flagless[0] });
      }
      if (!isInside(vcwd, sandbox)) {
        // Outside the sandbox, anything that names a file relative to where the shell is names it THERE,
        // whatever the command (xargs, python, diff, base64, a `$(cat ...)` inside echo).
        for (const t of commandTokens(text).fine.slice(1)) {
          if (!pathLike(t) || tokenPath(t, vcwd) || (verb === "node" && t === flagless[0])) continue;
          const key = resolveArg(t, vcwd).toLowerCase();
          if (writtenHere.has(key) || destHere.has(key)) continue;
          touch(t, { recursive: recursive || /[*?]/.test(t), base: vcwd });
        }
        if (READ_VERBS.has(verb)) {
          let args = words.slice(1).filter((w) => !w.startsWith("-") && !/^\d+$/.test(w));
          if (verb === "find") args = words.slice(1, (words.slice(1).findIndex((w) => /^[-(!]/.test(w)) + 1 || words.length));
          if (PATTERN_FIRST.has(verb)) args = args.slice(1);
          if (verb === "node") args = args.slice(0, 1);
          if (verb === "cp") args = args.slice(0, -1);
          if (!args.length && verb !== "node") touch(vcwd, { recursive: RECURSIVE_VERBS.has(verb) || recursive });
          for (const a of args) touch(a, { recursive: RECURSIVE_VERBS.has(verb) || recursive || /[*?[{]/.test(a), base: vcwd, nodeEntry: verb === "node" });
        } else if (!isInside(sandbox, vcwd) && verb && !["echo", "printf", "true", "false", "exit", "pwd", "export", "set"].includes(verb)) {
          // Any other command run from a foreign directory (git, npm, a script) may read it.
          touch(vcwd, { recursive: true });
        }
      }
    }
    return { cwd: vcwd, prev: prevCwd, stack: dirStack };
  };

  for (const e of events) {
    if (e?.type === "rate_limit_event") rateLimitEvents.push(e.rate_limit_info ?? e);
    if (e?.type !== "assistant" || !e.message) continue;
    const msg = e.message;
    if (msg.model === "<synthetic>") continue;
    if (msg.id) {
      messageIds.add(msg.id);
      if (msg.usage) usageById.set(msg.id, msg.usage);
    }
    for (const block of msg.content ?? []) {
      if (block?.type === "text" && block.text) finalText = block.text;
      if (block?.type !== "tool_use") continue;
      toolUses.set(block.id, block);
      toolCallsByName[block.name] = (toolCallsByName[block.name] ?? 0) + 1;
      const input = block.input ?? {};
      switch (block.name) {
        case "Read":
        case "NotebookRead":
          touch(input.file_path ?? input.notebook_path);
          break;
        case "Write":
        case "Edit":
        case "MultiEdit":
        case "NotebookEdit": {
          const file = input.file_path ?? input.notebook_path;
          // An Edit reads the file it changes; only a Write can create one.
          if (block.name !== "Write") touch(file);
          touch(file, { write: block.name === "Write" && !toolErrors.get(block.id) ? "create" : "append" });
          if (typeof file === "string" && SCRIPT_EXT.test(file)) {
            const body = [input.content, input.new_string, ...(input.edits ?? []).map((x) => x?.new_string)].filter((x) => typeof x === "string").join("\n");
            scanScript(file, body);
          }
          break;
        }
        case "Glob":
        case "Grep":
        case "LS":
          {
            // A Glob whose pattern descends (a separator after a wildcard, or **) reads the tree under its base.
            const pattern = String(input.pattern ?? "");
            const wild = pattern.search(/[*?{[]/);
            const descends = pattern.includes("**") || (wild >= 0 && /[\\/]/.test(pattern.slice(wild)));
            // Grep opens every file it searches, so a Grep over a directory is
            // a content read of that directory — the tool form of `grep -r`.
            // Glob and LS match NAMES and read nothing.
            touch(input.path ?? ".", { recursive: block.name === "Grep" || (block.name === "Glob" && descends), content: block.name === "Grep" });
            if (block.name === "Glob" && pattern) {
              const prefix = (wild >= 0 ? pattern.slice(0, wild) : pattern).replace(/[^\\/]*$/, "");
              if (prefix) touch(input.path ? join(tokenPath(input.path, sandbox) ?? resolve(sandbox, input.path), prefix) : prefix, { recursive: descends || wild >= 0 });
            }
          }
          break;
        case "Bash":
        case "PowerShell": {
          const cmd = String(input.command ?? "");
          // The shell persists across tool calls, so its state carries over.
          shell = commitShellState(shell, scanShell(cmd, 0, shell), toolErrors.get(block.id) === true, sandbox);
          const net = extractNetworkAttempts(cmd);
          network.push(...net.commands, ...net.urls);
          for (const c of net.commands) contaminating.add(`net:${c}`);
          for (const m of cmd.matchAll(PCG_CMD)) {
            const sub = m[1].replace(/^-+/, "");
            pcgCommands[sub] = (pcgCommands[sub] ?? 0) + 1;
            pcgCommandResults.push({ toolUseId: block.id, sub });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // Pair pcg command tool_uses with their results for failure counts.
  const errorsByToolUse = new Map();
  for (const e of events) {
    if (e?.type !== "user" || !e.message) continue;
    for (const block of e.message.content ?? []) {
      if (block?.type === "tool_result") errorsByToolUse.set(block.tool_use_id, block.is_error === true);
    }
  }
  const pcgFailures = {};
  for (const { toolUseId, sub } of pcgCommandResults) {
    if (errorsByToolUse.get(toolUseId)) pcgFailures[sub] = (pcgFailures[sub] ?? 0) + 1;
  }

  const summed = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  for (const u of usageById.values()) for (const k of Object.keys(summed)) summed[k] += Number(u[k] ?? 0);
  const usage = result?.usage ? { ...result.usage } : summed;
  if (result && typeof result.total_cost_usd === "number") usage.total_cost_usd_equivalent = result.total_cost_usd;
  if (result?.modelUsage) usage.modelUsage = result.modelUsage;

  const sorted = (s) => [...s].sort();
  return {
    init: init
      ? {
          model: init.model,
          cwd: init.cwd,
          tools: init.tools,
          mcp_servers: init.mcp_servers,
          plugins: init.plugins,
          slash_commands: init.slash_commands,
          skills: init.skills,
          agents: init.agents,
          output_style: init.output_style,
          permissionMode: init.permissionMode,
          apiKeySource: init.apiKeySource,
          claude_code_version: init.claude_code_version,
          memory_paths: init.memory_paths,
        }
      : null,
    turns: typeof result?.num_turns === "number" ? result.num_turns : messageIds.size,
    assistantMessages: messageIds.size,
    toolCalls: toolUses.size,
    toolCallsByName,
    usage,
    finalText: typeof result?.result === "string" && result.result ? result.result : finalText,
    resultSubtype: result?.subtype ?? null,
    isError: result?.is_error ?? null,
    permissionDenials: result?.permission_denials ?? [],
    readPaths: {
      docs: sorted(readSets.docs),
      graphs: sorted(readSets.graphs),
      skills: sorted(readSets.skills),
      llms: sorted(readSets.llms),
      pkg: sorted(readSets.pkg),
      outsideSandbox: sorted(outside),
      contaminating: sorted(contaminating),
    },
    // Directories the agent listed without opening a file in them.
    listedPaths: {
      docs: sorted(listSets.docs),
      graphs: sorted(listSets.graphs),
      skills: sorted(listSets.skills),
      llms: sorted(listSets.llms),
      pkg: sorted(listSets.pkg),
    },
    writes: sorted(writes),
    outsideWrites: sorted(outsideWrites),
    networkAttempts: [...new Set(network)],
    pcgCommands,
    pcgFailures,
    rateLimitEvents,
  };
}

/** Parse a stream-json transcript file. */
export function readTranscript(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { type: "raw", line };
      }
    });
}

/** The harness-owned jail around a sandbox project, as a benign root list. */
export function jailOf(cwd) {
  const parent = dirname(resolve(cwd));
  return basename(parent).startsWith(SANDBOX_PREFIX) ? [parent] : [];
}

function tmpEntries() {
  try {
    return new Set(readdirSync(tmpdir()).map((n) => n.toLowerCase()));
  } catch {
    return null;
  }
}

/**
 * Launch one headless session and wait for it.
 *
 * @param {object} o
 * @param {string} o.cwd                 sandbox directory
 * @param {string} o.prompt
 * @param {string} o.model               e.g. "claude-sonnet-5"
 * @param {{turns?:number, wallMinutes?:number, outputTokens?:number}} o.budgets
 * @param {string} o.transcriptPath      where the raw stream-json goes
 * @param {boolean} [o.isolation=true]   false only for the selftest's negative control
 * @param {string[]} [o.tools]
 * @param {string} [o.tmpDir]            the run's own temp dir; TMPDIR/TEMP/TMP point at it
 * @param {object} [o.env]               base env (default process.env)
 * @param {string} [o.command="claude"]
 * @param {string} [o.effort]
 * @param {(pid:number)=>void} [o.onSpawn]  receives the child pid, so a restarted runner can kill a stale session
 */
export async function launch({
  cwd,
  prompt,
  model,
  budgets = {},
  transcriptPath,
  isolation = true,
  tools = DEFAULT_TOOLS,
  env: baseEnv = process.env,
  command = "claude",
  effort,
  onSpawn,
  tmpDir,
}) {
  if (!cwd || !existsSync(cwd)) throw new Error(`launch: cwd does not exist: ${cwd}`);
  if (!transcriptPath) throw new Error("launch: transcriptPath is required");
  const { env, removed } = buildEnv(baseEnv, { isolation, tmpDir }); // throws BillingEnvError
  mkdirSync(dirname(transcriptPath), { recursive: true });
  let mcpConfigPath;
  if (isolation) {
    mcpConfigPath = join(dirname(transcriptPath), "empty-mcp.json");
    writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers: {} }));
  }
  const args = buildArgs({ model, budgets, isolation, tools, mcpConfigPath, effort });
  const tmpAtStart = tmpEntries();
  const started = Date.now();
  const out = createWriteStream(transcriptPath);
  const events = [];
  const capsHit = [];
  let stderr = "";
  let outputTokens = 0;
  const seenUsage = new Map();

  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
  child.stdin.end(prompt);
  if (onSpawn && child.pid) onSpawn(child.pid);

  const wallMs = budgets.wallMinutes ? budgets.wallMinutes * 60_000 : null;
  const wallTimer = wallMs
    ? setTimeout(() => {
        capsHit.push("wall");
        killTree(child);
      }, wallMs)
    : null;

  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    out.write(chunk);
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        ev = { type: "raw", line };
      }
      events.push(ev);
      if (budgets.outputTokens && ev?.type === "assistant" && ev.message?.id && ev.message.usage) {
        seenUsage.set(ev.message.id, Number(ev.message.usage.output_tokens ?? 0));
        outputTokens = [...seenUsage.values()].reduce((a, b) => a + b, 0);
        if (outputTokens > budgets.outputTokens && !capsHit.includes("tokens")) {
          capsHit.push("tokens");
          killTree(child);
        }
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (c) => {
    stderr = (stderr + c).slice(-20_000);
  });

  const exitCode = await new Promise((res) => {
    child.on("error", (err) => {
      stderr += `\nspawn error: ${err.message}`;
      res(-1);
    });
    child.on("close", (code) => res(code));
    // `close` waits for every inherited pipe; a grandchild the agent left
    // running can hold one open forever. After the process itself exits (or
    // a cap kill), give the pipes 30 s and move on.
    const settle = () => setTimeout(() => res(child.exitCode ?? null), 30_000).unref();
    child.on("exit", settle);
    if (wallMs) setTimeout(() => res(null), wallMs + 90_000).unref(); // a kill that did not take
  });
  if (wallTimer) clearTimeout(wallTimer);
  if (buf.trim()) {
    try {
      events.push(JSON.parse(buf.trim()));
    } catch {
      events.push({ type: "raw", line: buf.trim() });
    }
  }
  await new Promise((r) => out.end(r));
  if (stderr) writeFileSync(`${transcriptPath}.stderr.txt`, stderr);

  const parsed = parseTranscript(events, { cwd, tmpEntriesAtStart: tmpAtStart, benignRoots: jailOf(cwd) });
  const classification = classifySession({ exitCode, stderr, events, capsHit });
  if (classification.kind === "cap-turns" && !capsHit.includes("turns")) capsHit.push("turns");
  return {
    exitCode,
    wallMs: Date.now() - started,
    transcriptPath,
    usage: parsed.usage,
    turns: parsed.turns,
    toolCalls: parsed.toolCalls,
    toolCallsByName: parsed.toolCallsByName,
    limitHit: { hit: classification.kind === "usage-limit", resetAt: classification.resetAt ?? undefined },
    classification,
    capsHit,
    readPaths: parsed.readPaths,
    listedPaths: parsed.listedPaths,
    writes: parsed.writes,
    outsideWrites: parsed.outsideWrites,
    networkAttempts: parsed.networkAttempts,
    pcgCommands: parsed.pcgCommands,
    pcgFailures: parsed.pcgFailures,
    permissionDenials: parsed.permissionDenials,
    rateLimitEvents: parsed.rateLimitEvents,
    finalText: parsed.finalText,
    init: parsed.init,
    launch: { command, args, removedEnv: removed, isolation, isolationEnv: isolation ? Object.keys(ISOLATION_ENV) : [] },
  };
}
