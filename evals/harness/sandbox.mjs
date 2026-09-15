/**
 * A fresh consumer project for one eval run: a temp directory under the OS
 * temp dir, never inside a git repository, with the arm's tarball installed
 * and the task's brief.md copied in. Nothing else from the task goes in: the
 * reference graph, negatives and checks stay where the scorer can reach them
 * and the agent cannot.
 *
 * Also the home of the harness' small shared helpers (npm spawning, file
 * hashing, directory removal), because every other harness module already
 * depends on this one.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
export const EVALS_DIR = dirname(HARNESS_DIR);
export const REPO_ROOT = dirname(EVALS_DIR);

export const SANDBOX_PREFIX = "pcg-eval-";
export const NEUTRAL_TARBALL = "pcg-ts.tgz";

/** Strings in the sandbox's npm metadata that would identify the arm or the machine's repo. */
export function sandboxIdentityLeaks(dir, tarball) {
  const needles = [basename(tarball), dirname(resolve(tarball)), dirname(resolve(tarball)).replace(/\\/g, "/")].filter((s) => s.length > 3);
  const leaks = [];
  for (const f of ["package.json", "package-lock.json", join("node_modules", ".package-lock.json")]) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const n of needles) if (text.includes(n) || text.includes(JSON.stringify(n).slice(1, -1))) leaks.push(`${f}: ${n}`);
  }
  return leaks;
}

/** sha256 hex of a file's bytes. */
export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** sha256 hex of a string or buffer. */
export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

/** Quote one argument for cmd.exe (only used when a shell is unavoidable). */
function quoteWin(arg) {
  if (arg === "") return '""';
  if (!/[\s"&|<>^()%!]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Run npm synchronously. On Windows npm is a .cmd shim, which Node refuses to
 * spawn without a shell, so the arguments are quoted for cmd.exe there.
 */
export function runNpm(args, { cwd, timeoutMs = 10 * 60_000, env = process.env } = {}) {
  const win = process.platform === "win32";
  const r = win
    ? spawnSync(["npm", ...args].map(quoteWin).join(" "), {
        cwd,
        env,
        shell: true,
        encoding: "utf8",
        timeout: timeoutMs,
        windowsHide: true,
      })
    : spawnSync("npm", args, { cwd, env, encoding: "utf8", timeout: timeoutMs });
  return { status: r.status ?? (r.error ? -1 : 0), stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
}

/**
 * Remove a directory tree, retrying through Windows' transient locks. Never
 * throws: a sandbox a stray process still holds open is left behind and
 * reported, rather than crashing an unattended runner.
 */
export function removeDir(dir) {
  if (!dir || !existsSync(dir)) return true;
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    return true;
  } catch (err) {
    process.stderr.write(`sandbox: could not remove ${dir}: ${err.message}\n`);
    return false;
  }
}

/**
 * Walk up from `dir` and return the first ancestor (or `dir` itself) holding
 * a `.git` entry, or null. A sandbox inside a repository would hand the agent
 * that repository's CLAUDE.md, history and files.
 */
export function findEnclosingRepo(dir) {
  let cur = resolve(dir);
  for (;;) {
    if (existsSync(join(cur, ".git"))) return cur;
    const up = dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

/** Instruction files an agent CLI auto-discovers from ancestor directories. */
const ANCESTOR_INSTRUCTION_FILES = ["CLAUDE.md", "CLAUDE.local.md", "AGENTS.md"];

/** Ancestor instruction files above `dir`, which a sandbox must not sit under. */
export function findAncestorInstructionFiles(dir) {
  const found = [];
  let cur = dirname(resolve(dir));
  for (;;) {
    for (const name of ANCESTOR_INSTRUCTION_FILES) {
      if (existsSync(join(cur, name))) found.push(join(cur, name));
    }
    const up = dirname(cur);
    if (up === cur) return found;
    cur = up;
  }
}

/** True when `child` is `parent` or lies inside it (case-insensitive on Windows). */
export function isInside(child, parent) {
  const norm = (p) => {
    const r = resolve(p);
    return process.platform === "win32" ? r.toLowerCase() : r;
  };
  const rel = relative(norm(parent), norm(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Create the sandbox. Returns paths and a cleanup function; throws with a
 * named reason on any failure (the caller records it as an infra failure,
 * never as an agent failure).
 */
export function createSandbox({
  tarball,
  taskDir,
  baseDir = tmpdir(),
  installTimeoutMs = 10 * 60_000,
  copyBrief = true,
} = {}) {
  if (!tarball || !existsSync(tarball)) throw new Error(`sandbox: tarball not found: ${tarball}`);
  if (copyBrief && (!taskDir || !existsSync(join(taskDir, "brief.md")))) {
    throw new Error(`sandbox: ${taskDir}/brief.md not found; a task dir must hold brief.md`);
  }
  mkdirSync(baseDir, { recursive: true });
  // The project sits one level inside a harness-owned jail directory, so the
  // agent's first `ls ..` lands somewhere empty instead of in the OS Temp dir
  // (observed: the shell tool is not confined to the working directory).
  const jail = mkdtempSync(join(baseDir, SANDBOX_PREFIX));
  const dir = join(jail, "project");
  mkdirSync(dir);
  const cleanup = () => removeDir(jail);
  try {
    const repo = findEnclosingRepo(dir);
    if (repo) throw new Error(`sandbox: ${dir} is inside the git repository ${repo}; use a base dir outside any repo`);
    const ancestors = findAncestorInstructionFiles(dir);
    if (ancestors.length) {
      throw new Error(`sandbox: instruction files above ${dir} would be auto-discovered: ${ancestors.join(", ")}`);
    }
    const init = runNpm(["init", "-y"], { cwd: dir, timeoutMs: 120_000 });
    if (init.status !== 0) throw new Error(`sandbox: npm init -y failed (${init.status}): ${init.stderr.slice(-800)}`);
    // Install from a copy with a NEUTRAL name inside the jail. Installing the
    // arm's tarball by its own path wrote `file:D:/.../stripped-0.17.0-....tgz`
    // into package.json and the lockfile (observed), which told the agent
    // which arm it was in and where the repository lives. Every arm now reads
    // `file:../pcg-ts.tgz`, and a re-run of `npm install` still resolves.
    copyFileSync(resolve(tarball), join(jail, NEUTRAL_TARBALL));
    const common = ["install", `../${NEUTRAL_TARBALL}`, "--no-audit", "--no-fund"];
    let inst = runNpm([...common, "--offline"], { cwd: dir, timeoutMs: installTimeoutMs });
    let offline = true;
    if (inst.status !== 0) {
      offline = false;
      inst = runNpm(common, { cwd: dir, timeoutMs: installTimeoutMs });
    }
    if (inst.status !== 0) throw new Error(`sandbox: npm install ${tarball} failed (${inst.status}): ${inst.stderr.slice(-800)}`);
    const pcgDir = join(dir, "node_modules", "pcg-ts");
    if (!existsSync(join(pcgDir, "package.json"))) throw new Error(`sandbox: install produced no ${pcgDir}/package.json`);
    const identity = sandboxIdentityLeaks(dir, tarball);
    if (identity.length) throw new Error(`sandbox: npm metadata names the arm's tarball: ${identity.join("; ")}`);
    const briefPath = join(dir, "brief.md");
    if (copyBrief) copyFileSync(join(taskDir, "brief.md"), briefPath);
    return {
      dir,
      jail,
      pcgDir,
      briefPath,
      graphPath: join(dir, "graph.json"),
      installedOffline: offline,
      cleanup,
    };
  } catch (err) {
    cleanup();
    throw err;
  }
}

/**
 * Files the agent left in the sandbox, excluding node_modules and the files
 * the harness itself put there. Relative POSIX-style paths.
 */
export function listAgentFiles(dir) {
  const skip = new Set(["node_modules", "package.json", "package-lock.json", "brief.md"]);
  const out = [];
  const walk = (d, rel) => {
    for (const name of readdirSync(d)) {
      const r = rel ? `${rel}/${name}` : name;
      if (!rel && skip.has(name)) continue;
      if (name === ".git") continue;
      const full = join(d, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full, r);
      else out.push({ path: r, size: st.size });
    }
  };
  walk(dir, "");
  return out.sort((a, b) => (a.path < b.path ? -1 : 1));
}

/**
 * Copy the agent's files (bounded) into `destDir`, for friction logs and
 * human review. Returns what was copied and what was skipped for size.
 */
export function copyAgentFiles(dir, destDir, { maxTotalBytes = 8 * 1024 * 1024, maxFileBytes = 2 * 1024 * 1024 } = {}) {
  const files = listAgentFiles(dir);
  let total = 0;
  const copied = [];
  const skipped = [];
  for (const f of files) {
    if (f.size > maxFileBytes || total + f.size > maxTotalBytes) {
      skipped.push(f.path);
      continue;
    }
    const to = join(destDir, ...f.path.split("/"));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(join(dir, ...f.path.split("/")), to);
    total += f.size;
    copied.push(f.path);
  }
  return { copied, skipped };
}

/** Read and parse a JSON file with a named error. */
export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`cannot read JSON ${path}: ${err.message}`);
  }
}

/** Write JSON atomically (temp file + rename), so a crash never leaves a torn state file. */
export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  try {
    renameSync(tmp, path);
  } catch {
    // Windows: a reader holding the target open can block the rename; fall back to a plain write.
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
    rmSync(tmp, { force: true });
  }
}

/** Parse a JSON file, or return `fallback` when it is missing or unreadable (e.g. torn by a crash). */
export function readJsonOr(path, fallback) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
  } catch {
    return fallback;
  }
}

/** Git sha of the harness checkout, and whether the evals/ tree is dirty. */
export function harnessGitState(root = REPO_ROOT) {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  const head = git(["rev-parse", "HEAD"]);
  const status = git(["status", "--porcelain", "--", "evals/harness", "evals/eval.config.json"]);
  return {
    sha: head.status === 0 ? head.stdout.trim() : null,
    dirty: status.status === 0 ? status.stdout.trim().length > 0 : null,
  };
}

/** Drive letter / root of a path, for portable display. */
export function rootOf(p) {
  return parse(resolve(p)).root;
}

// CLI: node evals/harness/sandbox.mjs --tarball <tgz> [--task <dir>] [--keep]
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const tarball = get("--tarball");
  const task = get("--task");
  if (!tarball) {
    console.error("usage: node evals/harness/sandbox.mjs --tarball <tgz> [--task <taskDir>] [--keep]");
    process.exit(2);
  }
  const sb = createSandbox({ tarball, taskDir: task, copyBrief: Boolean(task) });
  console.log(JSON.stringify({ dir: sb.dir, pcgDir: sb.pcgDir, briefPath: sb.briefPath, offline: sb.installedOffline }, null, 2));
  if (!args.includes("--keep")) sb.cleanup();
}
