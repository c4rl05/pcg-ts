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
import { SANDBOX_PREFIX, isInside, sha256File } from "../sandbox.mjs";

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

/** Build the child env: copy, remove session plumbing, add isolation vars. */
export function buildEnv(baseEnv = process.env, { isolation = true } = {}) {
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
  const fine = text.split(/[\s"'`;&|()<>{}\[\],=]+|\$\(/).filter(Boolean);
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
  const glob = t.search(/[*?]/);
  if (glob === 0) return null;
  if (glob > 0) t = t.slice(0, glob).replace(/[^\\/]*$/, "") || ".";
  const env = /^(?:\$\{(\w+)\}|\$env:(\w+)|%(\w+)%|\$(\w+))(.*)$/i.exec(t);
  if (env) {
    const value = envValue(env[1] ?? env[2] ?? env[3] ?? env[4], cwd);
    if (!value) return null;
    t = value + env[5];
  }
  const win = process.platform === "win32";
  if (t === "~" || /^~[\\/]/.test(t)) return resolve(homedir(), t.slice(2) || ".");
  if (/^[A-Za-z]:[\\/]/.test(t)) return resolve(t);
  if (t.startsWith("/")) {
    if (t.startsWith("//")) return null; // a comment or a URL remnant, never a path here
    if (t === "/") return bareRoot ? (win ? "msys:/" : "/") : null;
    if (win && /^\/[a-zA-Z](?:\/|$)/.test(t)) return resolve(msysToWin(t));
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
  const out = new Set();
  const { fine, coarse } = commandTokens(command);
  for (const t of [...coarse, ...fine]) {
    const p = tokenPath(t, cwd, { bareRoot });
    if (p) out.add(p);
  }
  return [...out];
}

/** Shell segments: a command line split at separators, so each clause is judged on its own. */
export function commandSegments(command) {
  return String(command).split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Clauses that read a directory's CONTENTS rather than list its names, or
 * that move the shell somewhere (after a `cd`, relative paths name things
 * the parser cannot see). A bare listing of the Temp root is benign; one of
 * these aimed at it is not.
 */
const RECURSIVE_SEGMENT = /^(?:\S*[\\/])?(?:cd|pushd|Set-Location|sl|find|tree|du|rg|ag|fd|fdfind)\b|^(?:\S*[\\/])?(?:e|f)?grep\b[^\n]*\s-[a-zA-Z]*[rRd]|^(?:\S*[\\/])?ls\b[^\n]*\s-[a-zA-Z]*R|Get-ChildItem\b[^\n]*-Recurse|^dir\b[^\n]*\/s\b|\bcp\b[^\n]*\s-[a-zA-Z]*[rR]|\btar\b|\bzip\b|\b7z\b/i;

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

const BENIGN_PREFIXES_WIN = ["C:\\Windows\\", "C:\\Program Files\\Git\\", "C:\\Program Files\\nodejs\\"];
const BENIGN_EXACT = new Set(["/dev/null", "/dev/stdin", "/dev/stdout", "/dev/stderr", "NUL"]);

/**
 * Classify an outside-sandbox path. Contaminating paths are the ones that can
 * carry information the arm does not have: this machine's repositories and
 * home directory, the npm cache (which holds unstripped copies of the
 * package), other sandboxes, the Temp directory's pre-existing entries.
 * Benign: devices, OS and toolchain install dirs, the node binary's own
 * directory, Temp entries the session itself created, and a bare listing of
 * the Temp root (names only).
 */
export function classifyOutsidePath(p, { tmpEntriesAtStart = null, benign = [], recursive = false } = {}) {
  if (BENIGN_EXACT.has(p) || /^msys:\/dev\//.test(p)) return "benign";
  if (p.startsWith("msys:")) return /^msys:\/(?:usr|bin|etc\/profile|mingw64)/.test(p) ? "benign" : "contaminating";
  const nodeDir = dirname(process.execPath);
  const benignRoots = [nodeDir, ...benign, ...(process.platform === "win32" ? BENIGN_PREFIXES_WIN : ["/usr/bin/", "/usr/lib/", "/bin/", "/lib/", "/proc/self/"])];
  if (benignRoots.some((b) => isInside(p, b.replace(/[\\/]$/, "")))) return "benign";
  const tmp = tmpdir();
  if (isInside(p, tmp)) {
    const rel = relative(tmp, p);
    if (rel === "") return recursive ? "contaminating" : "benign";
    const first = rel.split(/[\\/]/)[0];
    if (tmpEntriesAtStart && !tmpEntriesAtStart.has(first.toLowerCase())) return "benign";
    return "contaminating";
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
  const messageIds = new Set();
  const usageById = new Map();
  const toolUses = new Map();
  const toolCallsByName = {};
  const readSets = { docs: new Set(), graphs: new Set(), skills: new Set(), llms: new Set(), pkg: new Set() };
  const outside = new Set();
  const contaminating = new Set();
  const network = [];
  const writes = new Set();
  const pcgCommands = {};
  const pcgCommandResults = [];
  const rateLimitEvents = [];
  let finalText = "";

  const touch = (p, { write = false, recursive = false } = {}) => {
    if (!p || typeof p !== "string") return;
    const abs = p.startsWith("msys:") ? p : (tokenPath(p, sandbox) ?? resolve(sandbox, p));
    if (abs.startsWith("msys:") || !isInside(abs, sandbox)) {
      outside.add(abs);
      if (classifyOutsidePath(abs, { tmpEntriesAtStart, benign: benignRoots, recursive }) === "contaminating") contaminating.add(abs);
      return;
    }
    if (isInside(abs, pcgDir)) {
      const rel = relative(pcgDir, abs);
      readSets[packageArea(rel)].add(rel.replace(/\\/g, "/") || ".");
    } else if (write) {
      writes.add(relative(sandbox, abs).replace(/\\/g, "/"));
    }
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
          touch(file, { write: true });
          // A script the agent writes and then runs reads what it names.
          if (typeof file === "string" && SCRIPT_EXT.test(file)) {
            const body = [input.content, input.new_string, ...(input.edits ?? []).map((x) => x?.new_string)].filter((x) => typeof x === "string").join("\n");
            const { text, bareRoot } = scriptPathText(file, body);
            // A script can do anything to what it names, so its outside paths count as recursive reads.
            for (const p of extractCommandPaths(text, sandbox, { bareRoot })) touch(p, { recursive: true });
            const net = extractNetworkAttempts(body);
            network.push(...net.commands);
            for (const c of net.commands) contaminating.add(`net:${c}`);
          }
          break;
        }
        case "Glob":
        case "Grep":
        case "LS":
          touch(input.path ?? ".", { recursive: block.name === "Grep" || (block.name === "Glob" && String(input.pattern ?? "").includes("**")) });
          if (block.name === "Glob" && typeof input.pattern === "string") {
            const prefix = input.pattern.split(/[*?{[]/)[0].replace(/[^\\/]*$/, "");
            if (prefix) touch(input.path ? join(tokenPath(input.path, sandbox) ?? resolve(sandbox, input.path), prefix) : prefix, { recursive: String(input.pattern).includes("**") });
          }
          break;
        case "Bash":
        case "PowerShell": {
          const cmd = String(input.command ?? "");
          for (const seg of commandSegments(cmd)) {
            // A glob over an outside dir reads everything under it, like a recursive listing.
            const recursive = RECURSIVE_SEGMENT.test(seg) || /\.\.[\\/]\S*[*?]|--recursive|\brecursive\s*:\s*true/.test(seg);
            // A bare `/` is the root only as an argument of a filesystem command; elsewhere it divides or splits.
            const bareRoot = /^(?:sudo\s+)?(?:\S*[\\/])?(?:find|ls|dir|tree|du|rg|ag|fd|e?grep|fgrep|cd|pushd|Get-ChildItem|gci|cat|cp|tar|zip|stat)\b/i.test(seg);
            for (const p of extractCommandPaths(seg, sandbox, { bareRoot })) touch(p, { recursive });
            // A bare `cd` goes home.
            if (/^(?:cd|pushd|Set-Location|sl)\s*$/i.test(seg)) touch(homedir(), { recursive: true });
          }
          const net = extractNetworkAttempts(cmd);
          network.push(...net.commands, ...net.urls);
          for (const c of net.commands) contaminating.add(`net:${c}`);
          for (const m of cmd.matchAll(PCG_CMD)) {
            const sub = m[1].replace(/^-+/, "");
            pcgCommands[sub] = (pcgCommands[sub] ?? 0) + 1;
            pcgCommandResults.push({ toolUseId: block.id, sub });
          }
          const redirect = /(?:^|[^>0-9&])>{1,2}\s*("?)([^\s"|;&]+)\1/g;
          for (const r of cmd.matchAll(redirect)) if (!/^&|^\/dev\/null$|^NUL$|^\$null$/i.test(r[2])) touch(r[2], { write: true });
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
    writes: sorted(writes),
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
}) {
  if (!cwd || !existsSync(cwd)) throw new Error(`launch: cwd does not exist: ${cwd}`);
  if (!transcriptPath) throw new Error("launch: transcriptPath is required");
  const { env, removed } = buildEnv(baseEnv, { isolation }); // throws BillingEnvError
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
    writes: parsed.writes,
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
