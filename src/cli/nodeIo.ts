/**
 * The Node binding of {@link CliIo} — the only place in `src/cli` that
 * touches the filesystem or the process streams. Kept in its own module
 * so the commands stay pure and testable.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { CliIo } from "./io.js";

function ensureParent(path: string): void {
  const dir = dirname(path);
  if (dir !== "" && dir !== ".") mkdirSync(dir, { recursive: true });
}

/** The package's own name, which is what marks its root on the way up. */
const PACKAGE_NAME = "pcg-ts";

/**
 * The directory holding the `package.json` named {@link PACKAGE_NAME},
 * found by walking up from `from`; `undefined` when no ancestor has one.
 *
 * Walking up, rather than resolving a fixed `../..` from this module, is
 * what survives the bundler: tsup moves this code into `dist/cli/index.js`
 * today and could move it into a `dist/chunk-*.js` tomorrow, and under
 * vitest it runs from `src/cli/`. Each sits at a different depth; every one
 * of them has the package root as an ancestor. The NAME check is what stops
 * the walk at a consumer's own `package.json` — or a workspace root's —
 * that happens to sit higher up the same path.
 */
export function findPackageRoot(from: string): string | undefined {
  let dir = from;
  for (;;) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown };
        if (parsed.name === PACKAGE_NAME) return dir;
      } catch {
        // An unreadable or malformed manifest is not ours; keep walking.
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * A shipped file's path as {@link CliIo.packagePath} promises it: relative
 * to `cwd` when `root` is inside it, absolute otherwise, `/`-separated.
 * Exported for its test; the policy is the io's, not a command's.
 */
export function displayPackagePath(root: string, rel: string, cwd: string): string {
  const absolute = join(root, rel);
  const fromCwd = relative(cwd, absolute);
  // `..` first means the file is outside the working directory, and a path
  // that climbs out is harder to read than the absolute one; an absolute
  // result means another drive on Windows, where no relative path exists.
  const climbs = fromCwd === ".." || fromCwd.startsWith(`..${sep}`);
  const inside = fromCwd !== "" && !climbs && !isAbsolute(fromCwd);
  return (inside ? fromCwd : absolute).split(sep).join("/");
}

/** Real stdout/stderr and real files. */
export function makeNodeIo(): CliIo {
  // Resolved once, lazily: most commands never read a shipped file, and
  // the ones that do read several.
  let root: string | null | undefined;
  const packageRoot = (): string | undefined => {
    if (root === undefined) {
      try {
        root = findPackageRoot(dirname(fileURLToPath(import.meta.url))) ?? null;
      } catch {
        // `import.meta.url` that is not a file URL (a bundle loaded from
        // memory, a virtual filesystem): no root, and callers degrade.
        root = null;
      }
    }
    return root ?? undefined;
  };
  return {
    out: (text) => void process.stdout.write(text),
    err: (text) => void process.stderr.write(text),
    readFile: (path) => readFileSync(path, "utf8"),
    writeFile: (path, data) => {
      ensureParent(path);
      writeFileSync(path, data);
    },
    writeBytes: (path, data) => {
      ensureParent(path);
      writeFileSync(path, data);
    },
    packagePath: (rel) => {
      const found = packageRoot();
      return found === undefined ? undefined : displayPackagePath(found, rel, process.cwd());
    },
  };
}
