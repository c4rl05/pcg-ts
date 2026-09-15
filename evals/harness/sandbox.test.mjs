// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { claudeProjectDirFor, createSandbox, defaultSandboxRoot, prepareSandboxRoot, removeClaudeProjectDir, toBashPath } from "./sandbox.mjs";

const BASELINE = "D:/Projects/JS/pcg-ts/evals/tarballs/baseline-0.17.0-0ad6998.tgz";

test("the default sandbox root is a dedicated directory outside Temp and the home directory", () => {
  const root = defaultSandboxRoot();
  assert.ok(!root.toLowerCase().startsWith(tmpdir().toLowerCase().replace(/\\/g, "/")));
  if (process.platform === "win32") {
    assert.equal(root, "C:/pcg-eval/sandboxes");
    assert.equal(toBashPath("C:\\pcg-eval\\sandboxes\\pcg-eval-X\\project"), "/c/pcg-eval/sandboxes/pcg-eval-X/project");
  }
});

test("the sandbox root refuses foreign entries and sweeps stale sandboxes", () => {
  const root = mkdtempSync(join(tmpdir(), "pcg-root-"));
  try {
    mkdirSync(join(root, "pcg-eval-fresh"));
    mkdirSync(join(root, "pcg-eval-stale"));
    const old = new Date(Date.now() - 10 * 3_600_000);
    utimesSync(join(root, "pcg-eval-stale"), old, old);
    prepareSandboxRoot(root, { staleHours: 6 });
    assert.ok(existsSync(join(root, "pcg-eval-fresh")));
    assert.ok(!existsSync(join(root, "pcg-eval-stale")), "a sandbox a crashed run left behind is removed");
    writeFileSync(join(root, "plan.md"), "held-out task names");
    assert.throws(() => prepareSandboxRoot(root), /must hold only pcg-eval-\* directories; it also holds plan\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cleanup removes the Claude Code project dir a sandbox session left, and only such a dir", () => {
  const fakeConfig = mkdtempSync(join(tmpdir(), "pcg-claudecfg-"));
  const saved = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = fakeConfig;
  try {
    const sandboxDir = "C:/pcg-eval/sandboxes/pcg-eval-Zz9/project";
    const p = claudeProjectDirFor(sandboxDir);
    mkdirSync(join(p, "sess", "tool-results"), { recursive: true });
    assert.ok(p.includes("pcg-eval-Zz9"));
    removeClaudeProjectDir(sandboxDir);
    assert.ok(!existsSync(p));
    const other = claudeProjectDirFor("D:/Projects/JS/pcg-ts");
    mkdirSync(other, { recursive: true });
    assert.equal(removeClaudeProjectDir("D:/Projects/JS/pcg-ts"), false, "never a directory not named for a sandbox");
    assert.ok(existsSync(other));
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = saved;
    rmSync(fakeConfig, { recursive: true, force: true });
  }
});

test("a sandbox under a dedicated root installs, names no tarball path, and cleans up", { skip: !existsSync(BASELINE) && "baseline tarball not on this machine", timeout: 120_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), "pcg-root-"));
  try {
    const sb = createSandbox({ tarball: BASELINE, copyBrief: false, baseDir: root });
    assert.ok(sb.dir.startsWith(root));
    assert.equal(JSON.parse(readFileSync(join(sb.dir, "package.json"), "utf8")).dependencies["pcg-ts"], "file:../pcg-ts.tgz");
    sb.cleanup();
    assert.ok(!existsSync(sb.jail));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
