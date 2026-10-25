// node --test --test-concurrency=1 "evals/harness/*.test.mjs"
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  BillingEnvError,
  billingEnvViolations,
  buildArgs,
  buildEnv,
  TEMP_ENV_VARS,
  claudeConfigDir,
  classifyOutsidePath,
  extractCommandPaths,
  extractNetworkAttempts,
  heredocName,
  jailOf,
  launch,
  parseTranscript,
  shellClauses,
  clauseRedirects,
} from "./agents/claude-code.mjs";

const HERE = new URL(".", import.meta.url);

test("API-key guard: refuses, names every offending variable, strips nothing", async () => {
  assert.deepEqual(billingEnvViolations({ PATH: "x" }), []);
  assert.deepEqual(billingEnvViolations({ ANTHROPIC_API_KEY: "" }), [], "an empty variable bills nothing");
  const env = { PATH: "x", ANTHROPIC_API_KEY: "sk-ant-1", CLAUDE_CODE_USE_BEDROCK: "1", ANTHROPIC_AUTH_TOKEN: "t" };
  assert.deepEqual(billingEnvViolations(env).sort(), ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK"]);
  assert.throws(() => buildEnv(env), (err) => err instanceof BillingEnvError && /ANTHROPIC_API_KEY/.test(err.message) && /will not strip/.test(err.message));
  assert.equal(env.ANTHROPIC_API_KEY, "sk-ant-1", "the caller's env is untouched");
  // launch refuses before spawning anything
  await assert.rejects(
    launch({ cwd: tmpdir(), prompt: "x", model: "m", transcriptPath: join(tmpdir(), "never.jsonl"), env, command: "definitely-not-a-binary" }),
    (err) => err.name === "BillingEnvError",
  );
});

test("child env drops the parent session's plumbing and records what it dropped", () => {
  const { env, removed } = buildEnv({ PATH: "p", CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "s", CLAUDE_CODE_MESSAGING_TOKEN: "t", CLAUDE_CODE_GIT_BASH_PATH: "g" });
  assert.deepEqual(removed.sort(), ["CLAUDECODE", "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_SESSION_ID"]);
  assert.equal(env.CLAUDE_CODE_GIT_BASH_PATH, "g", "user configuration the CLI needs is kept");
  assert.equal(env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1");
  assert.equal(buildEnv({ PATH: "p" }, { isolation: false }).env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, undefined);
});

test("the session's temp directory is the run's own, under every name", () => {
  const tmpDir = join("C:\\pcg-eval\\sandboxes", "pcg-eval-Q1w2E3", "tmp");
  const base = { PATH: "p", TMPDIR: "/shared/tmp", TEMP: "C:\\Users\\x\\AppData\\Local\\Temp", TMP: "C:\\Users\\x\\AppData\\Local\\Temp" };
  const { env } = buildEnv(base, { tmpDir });
  for (const name of TEMP_ENV_VARS) assert.equal(env[name], tmpDir, name);
  // Windows env lookup is case-insensitive, so a stray `Temp` beside `TEMP`
  // would let the machine's value win.
  const mixed = buildEnv({ PATH: "p", Temp: "C:\\Users\\x\\AppData\\Local\\Temp", Tmp: "C:\\old" }, { tmpDir }).env;
  assert.deepEqual(
    Object.keys(mixed).filter((k) => ["TMPDIR", "TEMP", "TMP"].includes(k.toUpperCase())).sort(),
    ["TEMP", "TMP", "TMPDIR"],
    "exactly one spelling of each survives",
  );
  for (const k of Object.keys(mixed)) if (["TEMP", "TMP", "TMPDIR"].includes(k.toUpperCase())) assert.equal(mixed[k], tmpDir, k);
  // Without a tmpDir the environment is left alone (the isolation probe).
  assert.equal(buildEnv(base).env.TMPDIR, "/shared/tmp");
  // Anything under the jail is benign, so a scratch write there is not a
  // finding at all — which is the point of putting it there.
  const cwd = join("C:\\pcg-eval\\sandboxes", "pcg-eval-Q1w2E3", "project");
  assert.deepEqual(jailOf(cwd), [join("C:\\pcg-eval\\sandboxes", "pcg-eval-Q1w2E3")]);
  const p = parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command: "npx pcg render graph.json --out ../tmp/a.svg && cat ../tmp/a.svg" } }]), {
    cwd,
    tmpEntriesAtStart: null,
    benignRoots: jailOf(cwd),
  });
  assert.deepEqual(p.readPaths.contaminating, [], "the run's own temp dir is inside the jail");
});

test("isolated args carry every isolation flag; the control run carries none", () => {
  const a = buildArgs({ model: "claude-sonnet-5", budgets: { turns: 40 }, mcpConfigPath: "/e.json" });
  for (const flag of ["-p", "--safe-mode", "--restricted", "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence", "--no-chrome"]) assert.ok(a.includes(flag), flag);
  assert.equal(a[a.indexOf("--setting-sources") + 1], "");
  assert.equal(a[a.indexOf("--max-turns") + 1], "40");
  assert.equal(a[a.indexOf("--model") + 1], "claude-sonnet-5");
  assert.equal(a[a.indexOf("--tools") + 1], "Bash,Read,Write,Edit,Glob,Grep");
  assert.equal(a[a.indexOf("--permission-mode") + 1], "dontAsk");
  assert.ok(!a.some((x) => /web/i.test(x)), "no web tools");
  const c = buildArgs({ model: "m", isolation: false, tools: [] });
  for (const flag of ["--safe-mode", "--restricted", "--strict-mcp-config", "--setting-sources", "--disable-slash-commands"]) assert.ok(!c.includes(flag), flag);
  assert.equal(c[c.indexOf("--tools") + 1], "");
  assert.throws(() => buildArgs({ model: "m" }), /mcpConfigPath/);
});

test("shell command path extraction: absolute, msys, home, dot-dot, package-relative", () => {
  const cwd = join(tmpdir(), "pcg-eval-X", "project");
  const paths = (cmd) => extractCommandPaths(cmd, cwd);
  assert.ok(paths("ls ..").includes(join(tmpdir(), "pcg-eval-X")), "bare .. survives punctuation trimming");
  assert.ok(paths("cat ../../secret.txt").includes(join(tmpdir(), "secret.txt")));
  assert.ok(paths("cat node_modules/pcg-ts/llms.txt | head").includes(join(cwd, "node_modules", "pcg-ts", "llms.txt")));
  assert.ok(paths("type D:\\Projects\\JS\\pcg-ts\\CLAUDE.md").includes("D:\\Projects\\JS\\pcg-ts\\CLAUDE.md"));
  assert.ok(paths("cat ~/.claude/CLAUDE.md").includes(join(homedir(), ".claude", "CLAUDE.md")));
  if (process.platform === "win32") assert.ok(paths("ls /d/Projects/JS").includes("D:\\Projects\\JS"));
  assert.deepEqual(paths("node node_modules/pcg-ts/bin/pcg.mjs --version"), [join(cwd, "node_modules", "pcg-ts", "bin", "pcg.mjs")]);
  assert.deepEqual(paths("curl https://example.com/a/b"), [], "URLs are not paths");
});

test("path extraction catches what the first heuristic missed (review repros)", () => {
  const cwd = join(tmpdir(), "pcg-eval-X", "project");
  const outside = (cmd) => extractCommandPaths(cmd, cwd).filter((p) => p.startsWith("msys:") || !p.toLowerCase().startsWith(cwd.toLowerCase()));
  assert.ok(outside("cat src/../../../other/CLAUDE.md").includes(join(tmpdir(), "other", "CLAUDE.md")), "mid-token ..");
  assert.ok(outside("ls node_modules/.bin/../../../..").length === 1);
  assert.ok(outside("cat ./../../other").includes(join(tmpdir(), "other")));
  if (process.env.LOCALAPPDATA) assert.ok(outside("ls $LOCALAPPDATA/npm-cache").includes(join(process.env.LOCALAPPDATA, "npm-cache")));
  assert.ok(outside("ls $TEMP/pcg-eval-other/project").includes(join(tmpdir(), "pcg-eval-other", "project")));
  assert.ok(outside("cat ${USERPROFILE}/x").includes(join(homedir(), "x")));
  assert.ok(outside('node -e "require(\'fs\').readFileSync(\'../../secret\')"').includes(join(tmpdir(), "secret")), "paths inside code strings");
  assert.equal(outside("find / -name CLAUDE.md").length, 1, "the filesystem root");
  // no false home reads from ~ inside a token
  assert.deepEqual(outside("git log HEAD~1"), []);
  assert.deepEqual(outside('node -e "console.log(~~3.5)"'), []);
  // a quoted path with spaces stays whole
  if (process.platform === "win32") assert.deepEqual(outside('cat "/c/Program Files/Git/etc/profile"'), ["C:\\Program Files\\Git\\etc\\profile"]);
});

test("review 2 repros: scripts, regexes, Temp-root recursion, bare cd, redirections", () => {
  const cwd = join(tmpdir(), "pcg-eval-X", "project");
  const opts = { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) };
  const bash = (cmd) => parseTranscript([{ type: "assistant", message: { id: "m", content: [{ type: "tool_use", id: "t", name: "Bash", input: { command: cmd } }] } }], opts).readPaths.contaminating;
  const write = (file, content) => parseTranscript([{ type: "assistant", message: { id: "m", content: [{ type: "tool_use", id: "t", name: "Write", input: { file_path: join(cwd, file), content } }] } }], opts).readPaths;
  // no false contamination from ordinary scripts and commands
  assert.deepEqual(write("build.mjs", "// make graph\nconst r = /nodes/g;\nconst h = a / b;\ns.split('/');\n").outsideSandbox, []);
  assert.deepEqual(write("run.sh", "#!/bin/bash\n# // comment\nnpx pcg validate graph.json\n").contaminating, []);
  for (const cmd of ["awk '/nodes/' graph.json", "echo $((a / b))", "ls ..", "ls ../..", "npm install 2>&1 | tail -3", "npm install > log.txt", "npm ci\nls", "npm exec pcg -- validate graph.json"]) {
    assert.deepEqual(bash(cmd), [], cmd);
  }
  // but a script's string literal leaving the sandbox, and recursive reads of Temp, do count
  assert.ok(write("look.mjs", "fs.readFileSync('../../claude/notes.md')").contaminating.length === 1);
  for (const cmd of ["grep -r X ../..", "find ../.. -name graph.json", "ls -R ../..", "cd ../.. && cat claude/x", "cd; cat .claude/CLAUDE.md", "find / -name CLAUDE.md"]) {
    assert.equal(bash(cmd).length, 1, cmd);
  }
  const grep = parseTranscript([{ type: "assistant", message: { id: "m", content: [{ type: "tool_use", id: "t", name: "Grep", input: { path: "../..", pattern: "x" } }] } }], opts).readPaths;
  assert.equal(grep.contaminating.length, 1, "the Grep tool reads contents");
  const { commands } = extractNetworkAttempts("npx -y other && npx.cmd thing && npx pcg-foo");
  assert.equal(commands.length, 3);
  // review 3 repros
  for (const cmd of ['node -e "console.log(4 / 2)"', "expr 4 / 2", "node -e \"p.split('/')\"", "cat <<EOF > a.mjs\nconst half = n / 2;\nEOF", "cd node_modules/pcg-ts && ls"]) {
    assert.deepEqual(bash(cmd), [], cmd);
  }
  for (const cmd of ["ls /", "cat ../../*", "grep x ../../*", "ls --recursive ../..", "node -e \"readdirSync('../..',{recursive:true})\"", "npx pcg-ts@latest nodes", "npm exec pcg-ts@latest -- nodes", "npx -p pcg-ts@latest pcg"]) {
    assert.equal(bash(cmd).length, 1, cmd);
  }
});

test("network and npm-cache commands are named; a plain reinstall and the local CLI are not", () => {
  const cmds = (c) => extractNetworkAttempts(c).commands;
  assert.deepEqual(cmds("curl -s https://example.com/x && npm view pcg-ts"), ["curl", "npm view"]);
  assert.equal(cmds("cat $(npm config get cache)/_cacache/index").length, 1);
  assert.equal(cmds("npm install pcg-ts@latest").length, 1);
  assert.equal(cmds("npm i -D pcg-ts").length, 1);
  assert.equal(cmds("npm pack pcg-ts").length, 1);
  assert.equal(cmds("npx some-tool --help").length, 1);
  assert.deepEqual(cmds("npm install"), []);
  assert.deepEqual(cmds("npm install --offline"), []);
  assert.deepEqual(cmds("npx pcg validate graph.json && npx --no-install pcg cook g.json"), []);
  assert.deepEqual(extractNetworkAttempts("echo see https://example.com").urls, ["https://example.com"]);
});

test("outside paths: harness jail and self-made Temp entries are benign; the rest contaminates", () => {
  const jail = join(tmpdir(), "pcg-eval-X");
  const atStart = new Set(["claude", "pcg-eval-x", "other-project"]);
  const opts = { tmpEntriesAtStart: atStart, benign: [jail] };
  assert.equal(classifyOutsidePath(jail, opts), "benign");
  assert.equal(classifyOutsidePath(tmpdir(), opts), "contaminating", "a foreign directory's listing, unless it is this sandbox's own root");
  assert.equal(classifyOutsidePath(tmpdir(), { ...opts, sandbox: join(jail, "project") }), "benign", "the sandbox root listed: names of sandboxes only");
  assert.equal(classifyOutsidePath(join(tmpdir(), "my-scratch-made-during-run", "a.json"), opts), "benign");
  assert.equal(classifyOutsidePath(join(tmpdir(), "claude", "x", "notes.md"), opts), "contaminating");
  assert.equal(classifyOutsidePath(join(homedir(), ".claude", "CLAUDE.md"), opts), "contaminating");
  assert.equal(classifyOutsidePath("D:\\Projects\\JS\\pcg-ts\\llms.txt", opts), "contaminating");
  assert.equal(classifyOutsidePath("/dev/null", opts), "benign");
  assert.deepEqual(jailOf(join(jail, "project")), [jail]);
  assert.deepEqual(jailOf(join(tmpdir(), "elsewhere", "project")), []);
});

/** A transcript of just these tool calls, as a session in `cwd` with `sessionId` would have produced. */
function syntheticTranscript(cwd, sessionId, toolUses) {
  return [
    { type: "system", subtype: "init", cwd, session_id: sessionId },
    ...toolUses.map((u, i) => ({ type: "assistant", message: { id: `m${i}`, content: [{ type: "tool_use", id: `t${i}`, name: u.name, input: u.input }] } })),
  ];
}

test("REAL pilot-aborted-1 excerpts: only the disk-wide find stays contaminated", () => {
  const fixture = JSON.parse(readFileSync(new URL("fixtures/transcripts/pilot-aborted-1-excerpts.json", HERE), "utf8"));
  const fill = (v) =>
    JSON.parse(
      JSON.stringify(v)
        .replaceAll("{{CLAUDE}}", JSON.stringify(join(homedir(), ".claude")).slice(1, -1))
        .replaceAll("{{TEMP}}", JSON.stringify(tmpdir()).slice(1, -1))
        .replaceAll("{{HOME}}", JSON.stringify(homedir()).slice(1, -1)),
    );
  const verdicts = {};
  const saved = process.env.CLAUDE_CONFIG_DIR;
  delete process.env.CLAUDE_CONFIG_DIR;
  try {
    for (const raw of fixture.cases) {
      const c = fill(raw);
      assert.ok(c.toolUses.length > 0, `${c.attempt} has tool calls`);
      // The runs' Temp snapshots were not recorded: every Temp entry counts as pre-existing (strict).
      const p = parseTranscript(syntheticTranscript(c.cwd, c.sessionId, c.toolUses), { cwd: c.cwd, tmpEntriesAtStart: null, benignRoots: jailOf(c.cwd) });
      verdicts[c.attempt] = p.readPaths.contaminating.length ? "contaminated" : "clean";
      assert.equal(verdicts[c.attempt], c.expect, `${c.attempt}: ${JSON.stringify(p.readPaths.contaminating)}`);
      if (c.attempt.endsWith("stripped-a2")) assert.ok(p.outsideWrites.some((w) => w.endsWith("nodes.json")), "the agent's own /tmp write is recorded as an outside write");
    }
  } finally {
    if (saved !== undefined) process.env.CLAUDE_CONFIG_DIR = saved;
  }
  assert.deepEqual(verdicts, {
    "r0.trees-on-hills.A-prime-a1": "contaminated",
    "r0.trees-on-hills.A-prime-a2": "clean",
    "r0.trees-on-hills.stripped-a1": "clean",
    "r0.trees-on-hills.stripped-a2": "clean",
    "r0.trees-on-hills.A-a1": "clean",
  });
});

test("new layout: dedicated sandbox root; Temp scratchpad, foreign dirs, other sandboxes, repo files and another session's results contaminate", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const sid = "11111111-2222-3333-4444-555555555555";
  const bashCwd = process.platform === "win32" ? "/c/pcg-eval/sandboxes/pcg-eval-Q1w2E3/project" : cwd;
  const verdict = (uses) => parseTranscript(syntheticTranscript(cwd, sid, uses), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) }).readPaths.contaminating;
  const bash = (command) => verdict([{ name: "Bash", input: { command } }]);
  // benign
  assert.deepEqual(bash(`cd ${bashCwd} && node node_modules/pcg-ts/bin/pcg.mjs nodes`), []);
  assert.deepEqual(bash("ls .."), [], "the jail");
  assert.deepEqual(bash("ls ../.."), [], "the sandbox root: sandbox names only");
  assert.deepEqual(bash("cd ../.. && echo hi"), [], "a cd to an ancestor that reads nothing");
  const toolResults = join(claudeConfigDir(), "projects", cwd.replace(/[^A-Za-z0-9]/g, "-"), sid, "tool-results", "b1.txt");
  assert.deepEqual(verdict([{ name: "Read", input: { file_path: toolResults } }]), [], "this session's own offloaded tool output");
  assert.deepEqual(bash("node x.mjs > /tmp/out.json; cat /tmp/out.json"), [], "reading back the agent's own outside write");
  assert.deepEqual(verdict([{ name: "Write", input: { file_path: join(tmpdir(), "mine.mjs"), content: "x" } }, { name: "Read", input: { file_path: join(tmpdir(), "mine.mjs") } }]), []);
  // contaminating
  assert.equal(verdict([{ name: "Read", input: { file_path: toolResults.replace(sid, "99999999-2222-3333-4444-555555555555") } }]).length, 1, "another session's tool output");
  assert.equal(bash("cat /tmp/claude/D--Projects/plan.md").length, 1, "the orchestrator's scratchpad under Temp");
  assert.equal(bash("ls /tmp").length, 1, "a foreign directory listed");
  assert.equal(bash("ls ../../pcg-eval-Other9/project").length, 1, "another sandbox");
  assert.equal(bash("grep -r pcg ../..").length, 1, "the sandbox root searched");
  assert.equal(bash("find / -name CLAUDE.md").length, 1);
  assert.equal(bash("cat /d/Projects/JS/pcg-ts/CLAUDE.md").length, process.platform === "win32" ? 1 : 0);
  assert.equal(bash("cd /d/Projects/JS/pcg-ts && git log --oneline").length, process.platform === "win32" ? 1 : 0, "a command run from a foreign directory");
  assert.equal(bash("cd ~ && cat .claude/CLAUDE.md").length, 1);
  assert.equal(verdict([{ name: "Edit", input: { file_path: "D:\\Projects\\JS\\pcg-ts\\README.md", old_string: "a", new_string: "b" } }]).length, process.platform === "win32" ? 1 : 0, "an Edit reads the file it changes");
});

test("laundering review repros: writes whitelist only what they created; globs, relative reads and heredoc shells after cd are judged", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const verdict = (uses) => parseTranscript(syntheticTranscript(cwd, "sid", uses), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) }).readPaths.contaminating;
  const bash = (command) => verdict([{ name: "Bash", input: { command } }]);
  const win = process.platform === "win32";
  // 1. a write grants nothing it did not create, and never a subtree
  assert.equal(bash("mkdir -p ~/.claude && cat ~/.claude/CLAUDE.md").length, 1);
  if (win) {
    assert.equal(bash("touch /d/Projects/JS/pcg-ts/CLAUDE.md; cat /d/Projects/JS/pcg-ts/CLAUDE.md").length, 1);
    assert.equal(bash("echo x >> /d/Projects/JS/pcg-ts/README.md; cat /d/Projects/JS/pcg-ts/README.md").length, 1);
    assert.equal(bash("echo x | tee -a /d/Projects/JS/pcg-ts/README.md; cat /d/Projects/JS/pcg-ts/README.md").length, 1);
    assert.equal(verdict([{ name: "Bash", input: { command: "mkdir -p /d/Projects/JS/pcg-ts" } }, { name: "Bash", input: { command: "grep -r seed /d/Projects/JS/pcg-ts" } }]).length, 1);
    assert.equal(bash("cp brief.md /c/ && find /c/Users -name CLAUDE.md").length, 1);
  }
  assert.equal(bash("cp graph.json /tmp/ && ls /tmp/claude").length, 1);
  assert.equal(bash("cp graph.json ~/ && cat ~/.claude/CLAUDE.md").length, 1);
  assert.deepEqual(bash("cp graph.json /tmp/ && cat /tmp/graph.json"), [], "the copy itself is the agent's own");
  assert.deepEqual(bash("mkdir -p /tmp/work && ls /tmp/work"), [], "listing a directory it made");
  // 2. an absolute glob into the sandbox root reads under it
  if (win) assert.equal(bash("cat /c/pcg-eval/sandboxes/pcg-eval-*/project/graph.json").length, 1);
  assert.equal(verdict([{ name: "Glob", input: { pattern: `${root.replace(/\\/g, "/")}/*/project/*.json` } }]).length, 1);
  assert.equal(verdict([{ name: "Glob", input: { path: "../..", pattern: "*/project/graph.json" } }]).length, 1);
  assert.deepEqual(verdict([{ name: "Glob", input: { path: "../..", pattern: "*" } }]), [], "a flat listing of the sandbox root");
  // 3. relative globs in Temp after cd
  assert.equal(bash("cd /tmp && cat */*/*/scratchpad/*.md").length > 0, true);
  assert.equal(bash("cd /tmp && cat cl?ude/D--Projects-JS-pcg-ts/x/scratchpad/plan.md").length > 0, true);
  // 4. any verb's path-like arguments after cd to an ancestor
  if (win) {
    assert.ok(bash("cd /c && echo Users/someone/.claude/CLAUDE.md | xargs cat").length > 0);
    assert.ok(bash("cd /c && python -c \"print(open('Users/someone/.claude/CLAUDE.md').read())\"").length > 0);
    assert.ok(bash("cd /c && diff Users/someone/.claude/CLAUDE.md /dev/null").length > 0);
    // 5. command substitution in echo/printf/export from a foreign directory
    assert.ok(bash('cd /d/Projects/JS/pcg-ts && echo "$(cat README.md)"').length > 0);
    assert.ok(bash('cd /d/Projects/JS/pcg-ts && printf %s "$(<CLAUDE.md)"').length > 0);
    assert.ok(bash("cd /d/Projects/JS/pcg-ts && export X=$(cat CLAUDE.md) && echo $X").length > 0);
  }
  // 6. a heredoc fed to a shell follows cd; a here-string is not a heredoc
  assert.ok(bash("bash <<'EOF'\ncd ../..\ncat pcg-eval-Other/project/graph.json\nEOF").length > 0);
  assert.ok(bash('cat <<<"EOF"\ncat /tmp/claude/x/plan.md').length > 0, "the line after a here-string is still a command");
  // 7. ancestor node_modules is only the agent's own package, never a listing
  if (win) {
    assert.equal(bash("ls /c/pcg-eval/node_modules").length, 1);
    assert.equal(bash("cat C:/node_modules/x/index.js").length, 1);
  }
});

test("an output FLAG names a file the command creates, not one it reads", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const parse = (command) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) });
  // The real calibration command (r0.quarry-terraces.A-a1). Before this, the
  // four files read as READS of paths that looked pre-existing, so the run's
  // verdict depended on a Temp snapshot the record never kept — which is why
  // the live classifier called it clean and the reclassifier called it
  // contaminated. Now the transcript itself says the agent made them.
  const render = parse("npx pcg render graph.json --out /tmp/a.svg --seed 1 2>&1 | tail -20 && npx pcg render graph.json --out /tmp/b.svg --seed 1 2>&1 | tail -5 && cmp /tmp/a.svg /tmp/b.svg && echo IDENTICAL");
  assert.deepEqual(render.readPaths.contaminating, [], "reading back its own output is not contamination");
  assert.equal(render.outsideWrites.length, 2, "and both writes are RECORDED");
  assert.ok(render.outsideWrites.every((p) => /[ab]\.svg$/.test(p)), render.outsideWrites.join(", "));
  // The same verdict under the permissive reading: the transcript settles it,
  // so the two entry points cannot disagree any more.
  const permissive = parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command: "npx pcg render graph.json --out /tmp/a.svg && cmp /tmp/a.svg /tmp/a.svg" } }]), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
  assert.deepEqual(permissive.readPaths.contaminating, []);
  // `--out=X`, and a directory form.
  assert.equal(parse("npx pcg cook graph.json --output=/tmp/c1.json").outsideWrites.length, 1);
  // A path INSIDE the sandbox is a normal write, not an outside one.
  const inside = parse("npx pcg render graph.json --out out.svg");
  assert.deepEqual(inside.outsideWrites, []);
  assert.ok(inside.writes.includes("out.svg"));
  // `-o` is NOT treated as an output flag: to grep it means only-matching,
  // and inventing a write there would be worse than missing one.
  assert.deepEqual(parse("grep -o scatter node_modules/pcg-ts/docs/nodes.md").outsideWrites, []);
  // Inline code that WRITES a file has created it, not read it. This shape
  // (pilot r1.settlement-roads.A-a1) was the last unrecorded outside write:
  // the script made /tmp/attribute.ts and the run was then judged as having
  // reached into Temp for it.
  const inline = parse(`node -e "const fs=require('fs'); fs.writeFileSync('/tmp/attribute.ts', 'x'); console.log(fs.readFileSync('/tmp/attribute.ts','utf8'))"`);
  assert.deepEqual(inline.readPaths.contaminating, [], "a script reading back what it just wrote is not contamination");
  assert.equal(inline.outsideWrites.length, 1);
  assert.ok(/attribute\.ts$/.test(inline.outsideWrites[0]), inline.outsideWrites[0]);
  // ...but merely READING an outside path from inline code still counts.
  assert.equal(parse(`node -e "console.log(require('fs').readFileSync('/tmp/someone-elses.json','utf8'))"`).readPaths.contaminating.length, 1);
});

test("a heredoc is read the way its INTERPRETER reads it, not as shell", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const bash = (command) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).readPaths.contaminating;

  // The v2 shapes. A heredoc fed to an interpreter was named `heredoc.sh`
  // whatever ate it, so JS and Python were scanned as SHELL — and every
  // division and every regex literal became a bare `/`, the filesystem root.
  // (r1.quarry-terraces.A-a1 divided; r1.quarry-terraces.A-a2 used regexes.)
  assert.deepEqual(bash("python3 - <<'PY'\ni = Math.floor((x + 60) / CELL)\nj = (z + 60) / CELL\nPY"), [], "division");
  assert.deepEqual(bash("node - <<'EOF'\nconst t = 2 * Math.PI / sw.lambda;\nEOF"), [], "division in JS");
  assert.deepEqual(bash("node - <<'EOF'\ns = s.replace(/sine: process\\.env\\.SINE/, 'x');\nEOF"), [], "regex literal");
  assert.deepEqual(bash("node - <<'EOF'\nconst re = /warp: JSON\\.parse\\(.*\\),/g;\nEOF"), []);
  for (const interp of ["node", "deno", "bun", "python", "python3", "perl", "ruby", "php"]) {
    assert.deepEqual(bash(`${interp} - <<'EOF'\nz = (a + b) / c\nEOF`), [], interp);
  }

  // A real path INSIDE that code is still caught, because code is scanned for
  // its string literals. Narrowing how the body is read must not blind it.
  assert.equal(bash("node - <<'EOF'\nrequire('fs').readFileSync('../../secret.txt');\nEOF").length, 1);
  assert.equal(bash("python3 - <<'PY'\nopen('/etc/passwd').read()\nPY").length, 1);
  // ...and a heredoc fed to a SHELL is still shell, `cd` and all.
  assert.equal(bash("bash <<'EOF'\ncd ../..\ncat notes.md\nEOF").length, 1);
  assert.deepEqual(heredocName({ interpreter: "node" }), "heredoc.mjs");
  assert.deepEqual(heredocName({ interpreter: null }), "heredoc.sh");
  assert.deepEqual(heredocName({ interpreter: "node", target: "out.txt" }), "out.txt", "a redirect names it");
});

test("a genuine disk-wide search is still contamination", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const bash = (command) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).readPaths.contaminating;
  // Two of the four v2 flags were REAL: the agent searched the whole
  // filesystem for its own tarball. `msys:/` is how that reads on Windows,
  // so refusing to treat it as a path would have hidden a true escape.
  assert.equal(bash(`find / -maxdepth 3 -iname "pcg-ts.tgz" 2>/dev/null`).length, 1);
  assert.equal(bash(`find / -iname "*.json" -path "*primitives*" 2>/dev/null | head -20`).length, 1);
  assert.equal(bash("ls /").length, 1);
});

test("a JS arrow is not a shell redirect, so a regex literal is not a path", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const bash = (command) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).readPaths.contaminating;

  // The pilot shape (r1.trees-on-hills.stripped-a1): `k=>/[Pp]rimitive|...`
  // read as a redirect to `/[Pp]rimitive`, truncated at the glob to a bare
  // `/`, and reported as the filesystem root. One run discarded over a regex.
  assert.deepEqual(bash(`node -e "console.log(Object.keys(m).filter(k=>/[Pp]rimitive|[Ss]ubgraph|[Rr]egist/.test(k)))"`), []);
  // Regex literals are ordinary in the code these agents write.
  for (const re of ["/^## /", "/\\d+/", "/\\s*,\\s*/", "/[a-z]+/gi", "/^(?:a|b)$/"]) {
    assert.deepEqual(bash(`node -e "const f = (s) => ${re}.test(s); console.log(f('x'))"`), [], re);
  }
  assert.deepEqual(bash(`node -e "const parts = s.split(/\\s*,\\s*/); console.log(parts)"`), []);
  assert.deepEqual(bash(`node -e "if (a >= b) console.log(1)"`), [], ">= is a comparison");

  // ...and every real redirect still redirects.
  const red = (c) => clauseRedirects(shellClauses(c)[0]);
  assert.deepEqual(red("echo x > out.txt").targets, ["out.txt"]);
  assert.deepEqual(red("npx pcg cook g.json --json > cook.json").targets, ["cook.json"]);
  assert.deepEqual(red("a >> log.txt").appends, ["log.txt"]);
  assert.deepEqual(red("cmd 2>&1").targets, [], "a dup is not a file");
  assert.deepEqual(red("tail -f x 2> /dev/null").targets, [], "/dev/null is not a read");
  // A redirect OUT of the sandbox is still recorded as a write.
  assert.equal(parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command: "node -e \"console.log(1)\" > /tmp/scratch.txt" } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).outsideWrites.length, 1);
});

test("the shell keeps its working directory ACROSS tool calls", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const verdict = (uses, opts = {}) =>
    parseTranscript(syntheticTranscript(cwd, "sid", uses), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd), ...opts }).readPaths.contaminating;
  const bash = (...commands) => verdict(commands.map((command) => ({ name: "Bash", input: { command } })));

  // The pilot shape (r1.trees-on-hills.A-a1, r2.trees-on-hills.stripped-a1):
  // cd in one call, a relative path in the NEXT. Resetting to the sandbox on
  // every call put `../../graph.json` two levels above it and discarded the run.
  assert.deepEqual(bash("cd node_modules/pcg-ts", "cat ../../graph.json"), [], "the shell is still in the package");
  assert.deepEqual(bash("cd node_modules/pcg-ts/graphs", "cat ../../../graph.json"), []);
  // ...and a path that really IS outside is still caught from wherever the
  // shell actually is. Narrowing must not blind it.
  assert.equal(bash("cd node_modules/pcg-ts", "cat ../../../../secret.txt").length, 1);
  // A cd OUT is tracked too: the later command runs THERE, not in the sandbox.
  // (A bare listing of the sandbox root is benign by design, so this uses a
  // directory that is foreign under any reading.)
  assert.equal(bash("cd ~", "ls").length, 1);
  assert.equal(bash("cd ../..", "cat notes.md").length, 1, "a file in the sandbox root is not the agent's");

  // `cd -` returns to the previous directory, which is not "stay put".
  assert.deepEqual(bash("cd node_modules/pcg-ts", "cd -", "cat graph.json"), []);
  // pushd/popd are a stack. The relative read has to be one whose meaning
  // DIFFERS between "popd returned" and "popd did nothing", or the assertion
  // proves nothing: from the project `../../notes.md` is the sandbox root's,
  // from node_modules it is the jail's own and benign.
  assert.equal(bash("pushd node_modules", "popd", "cat ../../notes.md").length, 1, "popd came back to the project");
  assert.deepEqual(bash("pushd node_modules/pcg-ts/graphs", "popd", "cat node_modules/pcg-ts/llms.txt"), []);
  assert.deepEqual(bash("pushd node_modules", "pushd pcg-ts/graphs", "popd", "cat pcg-ts/llms.txt"), [], "popd returns to node_modules");

  // A subshell's cd is local: the parent shell never moved. Again the read
  // must distinguish the two readings — `cd ../..` inside the group, so a
  // leaked cwd would put the later read in the sandbox root.
  assert.equal(bash("( cd ../.. && ls )", "cat notes.md").length, 0, "the parent is still in the project");
  assert.equal(bash("bash -c 'cd ../.. && ls'", "cat notes.md").length, 0);
  // ...including a group that is one balanced segment, where there is no
  // opening clause to notice.
  assert.equal(bash("( cd ../.. )", "cat notes.md").length, 0);
  // And INSIDE the group the cd still applies to the clauses after it: the
  // group is a child shell, not a dead zone. Without lifting it, `(` became
  // the verb, the cd was never seen, and this read was judged from the
  // project — two levels too high.
  assert.deepEqual(bash("( cd node_modules/pcg-ts && cat ../../graph.json )"), []);
  // A pushd inside a subshell does not survive it either.
  assert.equal(bash("( pushd ../.. )", "cat notes.md").length, 0);
  // The control: the SAME read after a cd that really did move the shell.
  assert.equal(bash("cd ../..", "cat notes.md").length, 1);

  // Each session starts at its own sandbox: state never leaks between runs.
  assert.deepEqual(bash("cat graph.json"), [], "a fresh transcript starts in the sandbox");
});

test("a failed cd does not move the shell where that would invent contamination", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const use = (id, name, input) => ({ type: "assistant", message: { id: `m${id}`, content: [{ type: "tool_use", id: `t${id}`, name, input }], usage: { output_tokens: 1 } } });
  const res = (id, isError) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: `t${id}`, is_error: isError, content: "" }] } });
  const run = (events) => parseTranscript([{ type: "system", subtype: "init", cwd, session_id: "sid" }, ...events], { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) }).readPaths.contaminating;

  // The transcript says the call FAILED but not how far it got. Treating the
  // cd as having succeeded would put every later relative path outside the
  // sandbox — a false contamination, which costs a re-run. The reading that
  // does not flag wins: the shell is left where it was.
  const failedOut = run([use(1, "Bash", { command: "cd ../../elsewhere" }), res(1, true), use(2, "Bash", { command: "cat notes.md" }), res(2, false)]);
  assert.deepEqual(failedOut, [], "a cd that may not have happened does not move the shell out");
  // A cd that SUCCEEDED is honoured, outside or not.
  assert.equal(run([use(1, "Bash", { command: "cd ../../elsewhere" }), res(1, false), use(2, "Bash", { command: "cat notes.md" }), res(2, false)]).length, 1);
  // An errored call whose cd stays INSIDE the sandbox is honoured either way,
  // because both readings agree about what the later paths name.
  assert.deepEqual(run([use(1, "Bash", { command: "cd node_modules/pcg-ts && false" }), res(1, true), use(2, "Bash", { command: "cat ../../graph.json" }), res(2, false)]), []);
});

test("the CLI's 'Shell cwd was reset' line moves the tracked shell back, AFTER the call that printed it", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-y0YyXA", "project");
  // facade-ab-A r1: every `cd /tmp && ...` result ENDS with this line (CLI
  // 2.1.x), in the tool_result content; the event's tool_use_result.stderr
  // carries it as "\nShell cwd was reset to <dir>".
  const resetLine = `Shell cwd was reset to ${cwd}`;
  const run = (calls, tmpEntriesAtStart = new Set(["claude", "notes.md"])) => {
    const events = [{ type: "system", subtype: "init", cwd, session_id: "sid" }];
    calls.forEach(([command, output = "", isError = false], i) => {
      events.push({ type: "assistant", message: { id: `m${i}`, content: [{ type: "tool_use", id: `t${i}`, name: "Bash", input: { command } }] } });
      events.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: `t${i}`, is_error: isError, content: output }] } });
    });
    return parseTranscript(events, { cwd, tmpEntriesAtStart, benignRoots: jailOf(cwd) });
  };
  const tmpPath = (name) => (process.platform === "win32" ? join(tmpdir(), name) : join("/tmp", name));

  // The run's own calls after the reset (A r1 #21, #24, #34, verbatim).
  const after = [
    ["node_modules/.bin/pcg nodes connectPoints 2>&1 | head -5; node_modules/.bin/pcg nodes transformPoints 2>&1 | head -30"],
    ["node build-graph.js"],
    ["node_modules/.bin/pcg render graph.json --out ./render.png --seed 1 2>&1 | tail -5"],
  ];
  // A r1's shape on one line: its own write to /tmp, read back from there.
  // (A r1 wrote the code over several lines; see the next block for why that matters.)
  const write = ["node_modules/.bin/pcg schema 2>&1 > /tmp/schema.json"];
  const cdTmp = "cd /tmp && node -e \"console.log(Object.keys(require('./schema.json').properties))\"";
  const output = "[ 'formatVersion', 'nodes', 'outputs', 'params', 'seed' ]";

  const reset = run([write, [cdTmp, `${output}\n${resetLine}`], ...after]);
  assert.deepEqual(reset.readPaths.contaminating, [], "after the reset the relative calls run in the project");
  assert.deepEqual(reset.outsideWrites, [tmpPath("schema.json")], "render.png was written in the project, not in Temp");
  // NEGATIVE CONTROL: the same calls with no reset line. The shell stays in
  // /tmp, so `head` and `pcg` run from Temp and render.png lands there.
  const stays = run([write, [cdTmp, output], ...after]);
  assert.ok(stays.readPaths.contaminating.length > 0, "a cd to /tmp with no reset line still moves the shell out");
  assert.ok(stays.outsideWrites.includes(tmpPath("render.png")));
  // Only the LAST line is the CLI's: the same words mid-output are the command's own text.
  assert.ok(run([write, [cdTmp, `${resetLine}\n${output}`], ...after]).readPaths.contaminating.length > 0, "a reset line that is not last moves nothing");
  // Content as text blocks carries it the same way.
  assert.deepEqual(run([write, [cdTmp, [{ type: "text", text: `${output}\n${resetLine}` }]], ...after]).readPaths.contaminating, []);
  // Where the event records stderr apart (real transcripts do), only stderr counts: the CLI writes the
  // line there, and a file whose last line is those words (`cat log.txt`) reaches stdout.
  const withStreams = (stdout, stderr) => {
    const events = [{ type: "system", subtype: "init", cwd, session_id: "sid" }];
    [write, [cdTmp, `${stdout}${stderr}`], ...after].forEach(([command, out = ""], i) => {
      events.push({ type: "assistant", message: { id: `m${i}`, content: [{ type: "tool_use", id: `t${i}`, name: "Bash", input: { command } }] } });
      events.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: `t${i}`, is_error: false, content: out }] }, ...(i === 1 ? { tool_use_result: { stdout, stderr } } : {}) });
    });
    return parseTranscript(events, { cwd, tmpEntriesAtStart: new Set(["claude", "notes.md"]), benignRoots: jailOf(cwd) }).readPaths.contaminating;
  };
  assert.deepEqual(withStreams(output, `\n${resetLine}`), [], "the real shape: the line in stderr");
  assert.ok(withStreams(`${output}\n${resetLine}`, "").length > 0, "the same words on stdout move nothing");
  // The reset applies AFTER its call: the call that carries it ran where the
  // shell was, and a pre-existing Temp file it read is still caught.
  assert.deepEqual(run([["cd /tmp"], ["cat notes.md", `x\n${resetLine}`], ...after]).readPaths.contaminating, [tmpPath("notes.md")]);

  // REAL A r1 excerpt (#15, #16 verbatim, then #21, #24, #34). The reset
  // call itself still flags Temp under the current splitter — its code spans
  // several lines and each line is judged as a clause run from /tmp — but
  // nothing AFTER it may add to that. Strict snapshot, as reclassify judges.
  const real = [
    ["node_modules/.bin/pcg schema 2>&1 > /tmp/schema.json; wc -l /tmp/schema.json; node -e \"\nconst s=require('/tmp/schema.json');\nconsole.log(Object.keys(s));\nconsole.log(JSON.stringify(s.properties ? s.properties : s, null, 2).slice(0,3000));\n\"\n", "", true],
    ["cd /tmp && node -e \"\nconst s=require('./schema.json');\nconsole.log(Object.keys(s.properties));\nconsole.log(JSON.stringify(s.properties.outputs,null,2));\nconsole.log(JSON.stringify(s.properties.nodes,null,2).slice(0,2000));\n\"\n", `{\n  "items": {\n    "$ref": "#/$defs/node"\n  },\n  "type": "array"\n}\n${resetLine}`],
  ];
  const own = run(real, null).readPaths.contaminating;
  const realReset = run([...real, ...after], null);
  assert.deepEqual(realReset.readPaths.contaminating, own, "the calls after the reset add nothing");
  assert.ok(!realReset.outsideWrites.includes(tmpPath("render.png")));
  const realStays = run([...real.map(([c, o, e]) => [c, o.replace(`\n${resetLine}`, ""), e]), ...after], null);
  assert.ok(realStays.readPaths.contaminating.length > own.length, "without the line, the later calls are judged in Temp");
  assert.ok(realStays.outsideWrites.includes(tmpPath("render.png")));
});

test("find with -maxdepth 0 and no action names its starting point and reads nothing", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-xzPyjN", "project");
  const parse = (...commands) => parseTranscript(syntheticTranscript(cwd, "sid", commands.map((command) => ({ name: "Bash", input: { command } }))), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
  const bash = (...commands) => parse(...commands).readPaths.contaminating;
  const rootPath = process.platform === "win32" ? "msys:/" : "/";

  // facade-ab-B r2's first call, verbatim. At depth 0 find prints `/` itself.
  const real = parse("find / -maxdepth 0 2>/dev/null; npm ls pcg-ts --all 2>&1 | head -20");
  assert.deepEqual(real.readPaths.contaminating, []);
  assert.ok(real.readPaths.outsideSandbox.includes(rootPath), "still recorded, as a benign outside path");
  assert.deepEqual(bash("find / -maxdepth 0"), []);
  assert.deepEqual(bash("find -L / -maxdepth 0 -type d -print"), []);

  // NEGATIVE CONTROLS: any descent, any action, or a starting point the shell expands.
  assert.deepEqual(bash("find / -maxdepth 1 2>/dev/null; npm ls pcg-ts --all 2>&1 | head -20"), [rootPath], "-maxdepth 1 lists the root");
  assert.deepEqual(bash("find / -maxdepth 0 -delete 2>/dev/null"), [rootPath], "-delete is an action");
  assert.deepEqual(bash("find / -maxdepth 1"), [rootPath]);
  assert.deepEqual(bash("find / -maxdepth 0 -delete"), [rootPath]);
  assert.deepEqual(bash("find / -maxdepth 0 -exec ls {} +"), [rootPath]);
  assert.deepEqual(bash("find / -maxdepth 0 -fprint out.txt"), [rootPath]);
  assert.deepEqual(bash("find / -maxdepth 0 -maxdepth 2"), [rootPath], "every depth must be 0");
  assert.deepEqual(bash("find / -iname pcg-ts.tgz"), [rootPath], "no depth limit at all");
  assert.equal(bash("find /etc/* -maxdepth 0").length, 1, "the shell lists /etc to expand the glob");
  // Another path in the same clause is judged as before.
  assert.equal(bash("find / -maxdepth 0 -newer /etc/passwd").length, 1);
  // Review repros: each named an outside file's contents with no flag in the first cut of this rule.
  assert.equal(bash("find <(cat /etc/passwd >&2) -maxdepth 0").length, 1, "process substitution is the shell reading");
  assert.equal(bash("find /etc/passwd -maxdepth 0 | xargs cat").length, 1, "piped names get opened downstream");
  assert.equal(bash("find /etc/passwd -maxdepth 0 -print0 | xargs -0 cat").length, 1);
  assert.equal(bash("find /etc/passwd -maxdepth 0 > list.txt; xargs cat < list.txt").length, 1, "saved names get opened later");
  const home = homedir().replace(/\\/g, "/");
  assert.deepEqual(bash(`find ${home} -maxdepth 0`), [], "a starting point other than the root");
  assert.equal(bash(`find ${home} -maxdepth 0 -newer ${home}/*`).length, 1, "a glob elsewhere in the clause lists the directory");
  assert.equal(bash("find /etc -maxdepth 0 -empty").length, 1, "-empty reads the directory's entries");
  assert.equal(bash("C:/Windows/System32/find.exe secret /etc/passwd -maxdepth 0").length, 1, "Windows find.exe is a text search");
  // `||` is not a pipe: the B r2 shape with a fallback stays clean.
  assert.deepEqual(bash("find / -maxdepth 0 2>/dev/null || true"), []);
  // From a foreign directory the bare form names only that directory; any depth lists it.
  assert.deepEqual(bash("cd ~", "find -maxdepth 0"), []);
  assert.equal(bash("cd ~", "find . -maxdepth 1").length, 1);
});

test("QUOTE-AWARE clauses: the shell splits only outside quotes, substitutions and comments", () => {
  const texts = (c) => shellClauses(c).map((x) => x.text);
  assert.deepEqual(texts(`echo 'a; b' && echo "c | d"; echo e`), ["echo 'a; b'", 'echo "c | d"', "echo e"]);
  assert.deepEqual(texts('echo "a \\" ; b"; ls'), ['echo "a \\" ; b"', "ls"], "an escaped quote does not close the string");
  assert.deepEqual(texts("echo $'it\\'s; x' ; ls"), ["echo $'it\\'s; x'", "ls"], "$'...' takes backslash escapes");
  assert.deepEqual(texts("echo 'a\\'; ls"), ["echo 'a\\'", "ls"], "single quotes take none");
  assert.deepEqual(texts("echo a\\;b; ls"), ["echo a\\;b", "ls"], "an escaped separator is literal");
  assert.deepEqual(texts("# don't split; here\nls"), ["ls"], "a quote in a comment opens nothing");
  assert.deepEqual(texts("x=$(cd /etc; cat passwd); ls"), ["x=$(cd /etc; cat passwd)", "ls"]);
  assert.deepEqual(shellClauses("x=$(cd /etc; cat passwd)")[0].subs, ["cd /etc; cat passwd"]);
  assert.deepEqual(shellClauses('echo "`cd ~; ls`"')[0].subs, ["cd ~; ls"], "a substitution inside double quotes runs");
  assert.deepEqual(shellClauses("echo '$(cat x)'")[0].subs, [], "...inside single quotes it is text");
  assert.deepEqual(shellClauses("echo $(( 6 / 2 ))")[0].subs, [], "arithmetic runs nothing");
  assert.deepEqual(shellClauses("a | b || c").map((c) => c.piped), [true, false, false]);
  // A line that does not parse falls back to the first splitter, never to fewer clauses.
  assert.deepEqual(texts('echo "unterminated; cat /etc/passwd'), ['echo "unterminated', "cat /etc/passwd"]);
  // Review repros. A `#` starts a comment only where bash starts a WORD.
  assert.deepEqual(texts("echo $(pwd)#; cat /etc/passwd"), ["echo $(pwd)#", "cat /etc/passwd"]);
  assert.deepEqual(texts("ls foo\\ #; cat /etc/passwd"), ["ls foo\\ #", "cat /etc/passwd"]);
  assert.deepEqual(texts("echo a\\\n#; cat /etc/passwd"), ["echo a#", "cat /etc/passwd"], "a backslash-newline joins the word");
  // `$$` is a parameter: the quote after it is a plain one, closed by the next `'`.
  assert.deepEqual(texts("echo $$'x\\'; cat /etc/passwd #'"), ["echo $$'x\\'", "cat /etc/passwd"]);
  // A substitution inside arithmetic still runs.
  assert.deepEqual(shellClauses("echo $(( 1 + $(cd ~; cat .bashrc | wc -l) ))")[0].subs, ["cd ~; cat .bashrc | wc -l"]);
  // A line nested past the stack falls back instead of throwing.
  assert.ok(Array.isArray(shellClauses("echo " + '"$('.repeat(20000))));
  assert.ok(Array.isArray(shellClauses("echo " + '"$('.repeat(20000) + "x" + ')"'.repeat(20000))));
});

test("QUOTE-AWARE inline code is one clause, judged by its literals from where it runs", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-y0YyXA", "project");
  // Strict snapshot (every Temp entry pre-dated the run), as reclassify judges.
  const run = (...commands) => parseTranscript(syntheticTranscript(cwd, "sid", commands.map((command) => ({ name: "Bash", input: { command } }))), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).readPaths.contaminating;
  const tmpRoot = process.platform === "win32" ? tmpdir() : "/tmp";
  const tmpPath = (name) => join(tmpRoot, name);
  const write = "node_modules/.bin/pcg schema 2>&1 > /tmp/schema.json"; // facade-ab-A r1 #15's own write

  // facade-ab-A r1 #16, #19, #20 verbatim. Split at every newline, each line
  // of JavaScript was a command run from /tmp: the Temp root, `...densities`,
  // `Math.floor` and `fieldFn.choose` all read as files there.
  const a16 = "cd /tmp && node -e \"\nconst s=require('./schema.json');\nconsole.log(Object.keys(s.properties));\nconsole.log(JSON.stringify(s.properties.outputs,null,2));\nconsole.log(JSON.stringify(s.properties.nodes,null,2).slice(0,2000));\n\"\n";
  const a19 = "cd /tmp && node -e \"\nfunction rnd(){return Math.random();}\nlet minRatio=Infinity,maxRatio=-Infinity, minSpanOk=true, worstSpanX=Infinity, worstSpanZ=Infinity, worstTotal=Infinity, worstColSpreadRatio=Infinity;\nfor(let trial=0; trial<200000; trial++){\n  const W = 34+rnd()*(46-34);\n  const D = 30+rnd()*(42-30);\n  const c = 7+rnd()*(10-7);\n  const H = 10+rnd()*(14-10);\n  const lengths = [W, D-c, c*Math.SQRT2, W-c, D];\n  // checks\n  const spanX = W; // x range 0..W\n  const spanZ = D;\n  worstSpanX = Math.min(worstSpanX, spanX);\n  worstSpanZ = Math.min(worstSpanZ, spanZ);\n  let total=0;\n  let densities=[];\n  for(const L of lengths){\n    if(L<8){ console.log('WALL TOO SHORT', L, {W,D,c}); }\n    const columns = Math.max(2, Math.floor(L/3+0.5));\n    const winCount = columns*3;\n    total+=winCount;\n    densities.push(columns/L);\n    const marginCol=1.2;\n    const span = L-2*marginCol;\n    const spreadRatio = span/L; // first to last distance / length approx since cols spread across span\n    worstColSpreadRatio = Math.min(worstColSpreadRatio, spreadRatio);\n    if (columns<2) console.log('cols<2');\n  }\n  worstTotal = Math.min(worstTotal, total);\n  const mn = Math.min(...densities), mx = Math.max(...densities);\n  const ratio = mx/mn;\n  minRatio = Math.min(minRatio, ratio);\n  maxRatio = Math.max(maxRatio, ratio);\n}\nconsole.log({minRatio,maxRatio, worstSpanX, worstSpanZ, worstTotal, worstColSpreadRatio});\n\"\n";
  const a20 = "cd /tmp && node -e \"\nconst s=require('./schema.json');\nconsole.log(JSON.stringify(s.\\$defs['fieldFn.choose'],null,2));\nconsole.log(JSON.stringify(s.\\$defs['fieldFn.randomFrom'],null,2));\nconsole.log(JSON.stringify(s.\\$defs['fieldFn.vec'],null,2));\nconsole.log(JSON.stringify(s.\\$defs['fieldFn.component'],null,2));\n\"\n";
  assert.deepEqual(run(write, a16), [], "#16 reads back the run's own /tmp/schema.json");
  assert.deepEqual(run(write, a19), [], "#19 is pure computation");
  assert.deepEqual(run(write, a20), [], "#20: s.$defs['fieldFn.choose'] indexes an object");
  // NEGATIVE CONTROLS: the same code still reads what it names, from /tmp.
  assert.deepEqual(run(a16), [tmpPath("schema.json")], "without the run's own write, ./schema.json was already in Temp");
  // (Code that loads `fs` from a foreign directory may read it by any name, so the directory counts too.)
  assert.deepEqual(run(write, a19.replace("console.log({minRatio", "console.log(require('fs').readFileSync('./notes.md','utf8'));\nconsole.log({minRatio")), [tmpRoot, tmpPath("notes.md")]);

  // One line, `;` inside the quotes: the same split cut it in two.
  assert.deepEqual(run('cd /tmp && node -e "const a=1; console.log(a)"'), []);
  assert.deepEqual(run("cd /tmp && node -e \"const a=require('fs').readFileSync('./notes.md'); console.log(a)\""), [tmpRoot, tmpPath("notes.md")]);
  assert.deepEqual(run("cd /tmp && node -e \"console.log(require('fs').readdirSync('.'))\""), [tmpRoot], "'.' is the directory it runs in");
  assert.deepEqual(run('cd /tmp && node -e "console.log(require(\'fs\').readdirSync(process.cwd()))"'), [tmpRoot], "so is process.cwd()");
  // Code fed to an interpreter by heredoc, from a foreign directory, is judged the same way.
  assert.deepEqual(run("cd /tmp && node - <<'EOF'\nconsole.log(require('fs').readFileSync('./notes.md','utf8'))\nEOF"), [tmpRoot, tmpPath("notes.md")]);
  // A literal module load alone reads only that file.
  assert.deepEqual(run("cd /tmp && node -e \"console.log(require('./notes.md'))\""), [tmpPath("notes.md")]);

  // estate-ab2-A r1 #16 verbatim: the JS line `find(obj[k], path + '/' + k);`
  // was a clause of its own, so it read as `find /`.
  const e16 = "node -e \"\nconst schema = require('./node_modules/pcg-ts/docs/graph.schema.json');\nfunction find(obj, path) {\n  if (typeof obj !== 'object' || obj === null) return;\n  for (const k in obj) {\n    if (k === 'applyRules') console.log(path + '/' + k);\n    find(obj[k], path + '/' + k);\n  }\n}\nfind(schema, '');\n\" 2>&1 | head -50";
  assert.deepEqual(run(e16), [], "a JS function named find is not find(1)");
  const rootPath = process.platform === "win32" ? "msys:/" : "/";
  assert.deepEqual(run(`${e16}; find / -name graph.schema.json 2>/dev/null`), [rootPath], "a real find / beside it still is");

  // NEGATIVE CONTROLS: quoted text handed to a shell is still run as commands.
  assert.ok(run('bash -c "cd /; cat /etc/passwd"').length > 0);
  assert.ok(run("node -e \"require('fs').readFileSync('/etc/passwd')\"").length > 0);
  assert.ok(run("x=$(cat /etc/passwd)").length > 0);
  assert.ok(run("bash <<'EOF'\ncd /etc\ncat passwd\nEOF").length > 0, "a heredoc into bash that cds out and reads");
  // ...and the substitution BODY is now a command too: a cd inside one was
  // invisible when the clause was cut at its `;`.
  // (`~` and `.npmrc` name nothing on their own, so only following the cd
  // inside the substitution can catch these.)
  const npmrc = join(homedir(), ".npmrc");
  assert.deepEqual(run("x=$(cd ~ && cat .npmrc)"), [npmrc]);
  assert.deepEqual(run('echo "`cd ~ && cat .npmrc`"'), [npmrc]);
  assert.deepEqual(run("x=$(cd ~ && cat .npmrc 2>/dev/null; true)"), [npmrc]);

  // Review repros (each one an escape the first cut of this splitter missed).
  // A code flag counts only before the script: after it, the flags are the script's.
  assert.ok(run("cd /tmp && node server.js -p 8080").includes(tmpPath("server.js")));
  assert.ok(run("cd /tmp && node -c secret.js").includes(tmpPath("secret.js")), "node -c checks a FILE");
  // Code that can reach the filesystem, run from a foreign directory, may read it by any name.
  assert.deepEqual(run("cd /tmp && node -e \"console.log(require('fs').readdirSync(__dirname))\""), [tmpRoot]);
  assert.deepEqual(run("cd /tmp && node -e \"console.log(require('fs').readFileSync('notes','utf8'))\""), [tmpRoot, tmpPath("notes")]);
  // ...including from an ANCESTOR of the sandbox, where the other sandboxes are.
  assert.ok(run("cd ../.. && python3 -c \"import os; print(os.listdir('pcg-eval-Other'))\"").includes(join(root, "pcg-eval-Other")));
  // What code hands an IO call or a shell is read or run, wherever the code runs.
  assert.deepEqual(run("node -e \"console.log(require('fs').readdirSync('/'))\""), [rootPath]);
  assert.deepEqual(run("node -e \"require('child_process').execSync('ls /')\""), [rootPath]);
  assert.deepEqual(run("node -e \"require('child_process').execSync('cd ~ && cat .npmrc')\""), [npmrc]);
  assert.deepEqual(run("cd node_modules && node - <<'EOF'\nconsole.log(require('fs').readdirSync(require('os').homedir()))\nEOF"), [homedir()]);
  // A quoted shell program handed to a shell of any spelling is still run as commands.
  assert.deepEqual(run("bash -lc 'ls /'"), [rootPath], "flags before -c");
  assert.ok(run("bash -lc 'echo hi; cd ../..; cat pcg-eval-Other/project/answer.json'").includes(join(root, "pcg-eval-Other", "project", "answer.json")));
  assert.deepEqual(run("ssh localhost 'true; cd ~; cat .npmrc'"), [npmrc]);
  assert.deepEqual(run("echo 'true; cd ~; cat .npmrc' | sh"), [npmrc]);
  assert.deepEqual(run("eval $'true; cd ~; cat .npmrc'"), [npmrc]);
  // `eval` runs in THIS shell: its cd moves the clauses after it.
  assert.deepEqual(run("eval $'cd ~'; cat .npmrc"), [npmrc]);
  // A `<<` inside a quoted string is the code's shift, not a heredoc that swallows the lines after it.
  assert.deepEqual(run('node -e "console.log(1 << bits)"\ncd ~\ncat .npmrc'), [npmrc]);
});

test("QUOTE-AWARE heredoc interpreter is the command in the clause holding the <<", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-q7rPWD", "project");
  const run = (command) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: null, benignRoots: jailOf(cwd) }).readPaths.contaminating;
  // v2 r2.facade-windows.stripped-all a1 #26 verbatim (its cd is to its own
  // sandbox). The line starts with `cd`, so the body was taken for shell and
  // `TAU / N` for the filesystem root.
  const sandboxShell = process.platform === "win32" ? "/c/pcg-eval/sandboxes/pcg-eval-q7rPWD/project" : cwd;
  const v26 = "cd /c/pcg-eval/sandboxes/pcg-eval-q7rPWD/project; node - <<'EOF'\nconst fs=require(\"fs\");let s=fs.readFileSync(\"gen.mjs\",\"utf8\");\nconst a=s.indexOf(\"// polar footprint\"), b=s.indexOf(\"const ringP\");\ns=s.slice(0,a)+`// polar footprint: bearings alternate long and short steps around the ring, the seed sets how far\n// each corner leans, plus a little noise; the radius is drawn from the seed too\nconst sgn = F(\"sub\", 1, F(\"mul\", F(\"mod\", { fn: \"index\" }, 2), 2));\nconst lean = F(\"mul\", sgn, F(\"add\", 0.12, F(\"mul\", rnd(\"lean\"), 0.08)));\nconst noise = F(\"mul\", F(\"sub\", F(\"mul\", rnd(\"noise\"), 2), 1), 0.04);\nconst theta = F(\"mul\", F(\"add\", { fn: \"index\" }, F(\"add\", lean, noise)), TAU / N);\nconst radius = F(\"add\", 21, F(\"mul\", rnd(\"radius\"), 5));\n`+s.slice(b);\ns=s.replace('axis: \"+x\"','axis: \"-x\"');\nfs.writeFileSync(\"gen.mjs\",s);\nEOF\nnode gen.mjs && node check.mjs 1 2 3 42 1000 2>&1 | head".replace("/c/pcg-eval/sandboxes/pcg-eval-q7rPWD/project", sandboxShell);
  assert.deepEqual(run(v26), []);
  // NEGATIVE CONTROL: the same node body reading a real outside file still flags.
  assert.ok(run(v26.replace('let s=fs.readFileSync("gen.mjs","utf8");', 'let s=fs.readFileSync("/etc/passwd","utf8");')).length > 0);
  assert.ok(run(v26.replace("; node - <<'EOF'", "; bash <<'EOF'\ncd /etc && cat passwd")).length > 0, "a heredoc into bash there is still shell");
});

test("a bare listing is not a read: only an opened file counts", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const pkg = "node_modules/pcg-ts";
  const parse = (command) =>
    parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Bash", input: { command } }]), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
  const read = (command, area) => parse(command).readPaths[area];
  const listed = (command, area) => parse(command).listedPaths[area];

  // Seeing that a directory exists is not reading what is in it. The
  // calibration report said skills were read in 38% of runs; one run of eight
  // had opened a skill file, the rest had run `ls`.
  assert.deepEqual(read(`ls ${pkg}/skills`, "skills"), []);
  assert.deepEqual(listed(`ls ${pkg}/skills`, "skills"), ["skills"]);
  assert.deepEqual(read(`ls -la ${pkg}/docs`, "docs"), []);
  assert.deepEqual(read(`find ${pkg}/graphs -name '*.json'`, "graphs"), []);

  // Opening a file is.
  assert.deepEqual(read(`cat ${pkg}/skills/graph-authoring/SKILL.md`, "skills"), ["skills/graph-authoring/SKILL.md"]);
  assert.deepEqual(read(`head -50 ${pkg}/docs/nodes.md`, "docs"), ["docs/nodes.md"]);
  assert.deepEqual(read(`cat ${pkg}/llms.txt`, "llms"), ["llms.txt"]);
  // ...and so is a recursive CONTENT verb, which opens every file under it.
  assert.deepEqual(read(`grep -r scatterPoints ${pkg}/docs/`, "docs"), ["docs"]);
  assert.deepEqual(listed(`grep -r scatterPoints ${pkg}/docs/`, "docs"), []);
  // The Grep TOOL opens every file it searches — the tool form of `grep -r` —
  // while Glob and LS match names. The difference is not cosmetic: a Grep over
  // docs/ is how an agent reads documentation without opening one file by name.
  const tool = (name, input) => parseTranscript(syntheticTranscript(cwd, "sid", [{ name, input }]), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
  assert.deepEqual(tool("Grep", { path: `${pkg}/docs`, pattern: "scatter" }).readPaths.docs, ["docs"]);
  assert.deepEqual(tool("Grep", { path: `${pkg}/docs`, pattern: "scatter" }).listedPaths.docs, []);
  assert.deepEqual(tool("Glob", { pattern: `${pkg}/graphs/*.json` }).readPaths.graphs, []);
  assert.deepEqual(tool("Glob", { pattern: `${pkg}/graphs/*.json` }).listedPaths.graphs, ["graphs"]);
  // The Read tool names a file by definition.
  const viaTool = parseTranscript(syntheticTranscript(cwd, "sid", [{ name: "Read", input: { file_path: join(cwd, "node_modules", "pcg-ts", "docs", "authoring.md") } }]), {
    cwd,
    tmpEntriesAtStart: new Set(["claude"]),
    benignRoots: jailOf(cwd),
  });
  assert.deepEqual(viaTool.readPaths.docs, ["docs/authoring.md"]);
});

test("review round 5: normal work stays clean; the remaining plausible escapes are caught", () => {
  const root = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
  const cwd = join(root, "pcg-eval-Q1w2E3", "project");
  const win = process.platform === "win32";
  const parse = (uses) => parseTranscript(syntheticTranscript(cwd, "sid", uses), { cwd, tmpEntriesAtStart: new Set(["claude"]), benignRoots: jailOf(cwd) });
  const verdict = (uses) => parse(uses).readPaths.contaminating;
  const bash = (command) => verdict([{ name: "Bash", input: { command } }]);
  // false positives from normal work
  for (const cmd of [
    "sed -n '/^## scatter/,/^## /p' node_modules/pcg-ts/docs/nodes.md",
    `sed -n '/"id": "a"/,/}/p' graph.json`,
    // REAL commands from the calibration campaign, verbatim. Both were
    // flagged and cost a re-run: `commandTokens` strips quotes, so the awk
    // PROGRAM's match operator `$0 ~ /^## /` left a bare `~` token, which
    // resolved to the home directory. awk is not a filesystem verb, so it
    // never grants a bare root. (r0.twin-quarters.A-a1, r0.cavern-lamps.A-a1)
    "awk '/^## mergePoints/,/^## /{if(seen && $0 ~ /^## /) exit} /^## mergePoints/{seen=1} seen' docs/nodes.md | head -40",
    'cd /c/pcg-eval/sandboxes/pcg-eval-Q1w2E3/project/node_modules/pcg-ts/docs\nfor n in pointGrid setAttribute spawnInstances; do\necho "=== $n ==="\nawk -v n="$n" \'BEGIN{p=0} $0 ~ "^## "n"$" {p=1} p && $0 ~ "^## " && $0 !~ ("^## "n"$") {if(p==1 && $0 !~ ("^## "n"$")) {p=0}} p\' nodes.md | sed -n \'1,60p\'\ndone',
    `jq -r '.nodes[] | select(.type ~ "point")' graph.json`,
    "echo $HOME",
    "echo ~",
    'node -e "console.log(a /b)"',
    "mkdir -p scratch/deep && cd scratch/deep && cat > s.mjs <<'EOF'\nimport g from '../../graph.json' with { type: 'json' };\nEOF",
  ]) {
    assert.deepEqual(bash(cmd), [], cmd);
  }
  assert.deepEqual(verdict([{ name: "Write", input: { file_path: join(cwd, "scratch", "deep", "s.mjs"), content: "const g = readFileSync('../../graph.json'); import('../../node_modules/pcg-ts/dist/index.js');" } }]), []);
  assert.deepEqual(verdict([{ name: "Write", input: { file_path: join(cwd, "scratch", "deep", "s.sh"), content: "npx pcg validate ../../graph.json" } }]), []);
  // ...but a bare `~` as the argument of a filesystem command is still the
  // home directory, and so is every `~/...`. Narrowing the awk case must not
  // narrow these.
  for (const cmd of ["ls ~", "find ~ -name '*.md'", "grep -r pcg ~", "cat ~/.npmrc", "cd ~ && ls", "tar -cf x.tar ~"]) {
    assert.deepEqual(bash(cmd), [homedir()].map((h) => (cmd.includes("~/.npmrc") ? join(h, ".npmrc") : h)), cmd);
  }
  // escapes
  assert.equal(bash("mkdir -p /tmp/claude/D--Projects-JS-pcg-ts && ls /tmp/claude/D--Projects-JS-pcg-ts").length, 1, "mkdir -p on an existing dir grants nothing");
  if (win) {
    const failedWrite = [
      { type: "system", subtype: "init", cwd, session_id: "sid" },
      { type: "assistant", message: { id: "m1", content: [{ type: "tool_use", id: "w1", name: "Write", input: { file_path: "D:/Projects/JS/pcg-ts/CLAUDE.md", content: "x" } }] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "w1", is_error: true, content: "File has not been read yet" }] } },
      { type: "assistant", message: { id: "m2", content: [{ type: "tool_use", id: "b1", name: "Bash", input: { command: "cat /d/Projects/JS/pcg-ts/CLAUDE.md" } }] } },
    ];
    assert.equal(parseTranscript(failedWrite, { cwd, tmpEntriesAtStart: new Set(), benignRoots: jailOf(cwd) }).readPaths.contaminating.length, 1, "a failed Write created nothing");
    assert.equal(bash("grep -n seed /d/Projects/JS/pcg-ts/CLAUDE.md 2>>/d/Projects/JS/pcg-ts/CLAUDE.md").length, 1);
    assert.equal(bash("cp -t scratch /d/Projects/JS/pcg-ts/CLAUDE.md").length, 1, "cp -t: the source is read");
    assert.equal(bash("cat /c/pcg-eval/sandboxes/[p]cg-eval-Other/project/graph.json").length, 1);
    assert.equal(bash("cat /c/node_modules/pcg-ts/docs/x.md").length, 1, "an ancestor's node_modules/pcg-ts read, not run");
  }
  assert.equal(bash("cat ../../[p]cg-eval-Other/project/graph.json").length, 1);
  assert.equal(bash("cat ../../{pcg-eval-Other,zz}/project/graph.json").length, 1);
  assert.equal(bash("cat /tmp/cl[a]ude/proj/sess/scratchpad/plan.md").length, 1);
  assert.equal(bash("ln -s ../.. up && cat up/pcg-eval-Other/project/graph.json").length, 1);
  assert.equal(bash("cp -a ../../ copy").length, 1);
  assert.equal(bash("D=../..; cat $D/pcg-eval-Other/project/graph.json").length, 1);
  assert.equal(bash("node -e \"process.chdir('../..'); console.log(require('fs').readdirSync('.'))\"").length, 1);
  assert.equal(bash("bash -c 'cd ../.. && cat pcg-eval-Other/project/graph.json'").length > 0, true);
  assert.equal(bash("eval 'cd ../..'; cat pcg-eval-Other/project/graph.json").length > 0, true);
});

// The four helpers below each parsed quotes their own way before `shellClauses`
// emitted words. Every test runs its NEGATIVE CONTROLS first (they flag both
// before and after), then the assertion the old parsing got wrong.
const WORDS_ROOT = process.platform === "win32" ? "C:\\pcg-eval\\sandboxes" : "/var/tmp/pcg-eval/sandboxes";
const WORDS_CWD = join(WORDS_ROOT, "pcg-eval-W0rdsX", "project");
const wordsParse = (...commands) => parseTranscript(syntheticTranscript(WORDS_CWD, "sid", commands.map((command) => ({ name: "Bash", input: { command } }))), { cwd: WORDS_CWD, tmpEntriesAtStart: null, benignRoots: jailOf(WORDS_CWD) });
const wordsRun = (...commands) => wordsParse(...commands).readPaths.contaminating;
const WORDS_FS_ROOT = process.platform === "win32" ? "msys:/" : "/";
const WORDS_TMP = process.platform === "win32" ? tmpdir() : "/tmp";

test("WORDS: an output flag's value is the shell's word, quotes and spaces included", () => {
  const made = join(WORDS_TMP, "my file.png");
  // Controls: an unquoted outside --out is recorded as an outside write, and a
  // read of an outside file the run did NOT make still flags.
  assert.ok(wordsParse("npx pcg render graph.json --out=/tmp/x.png").outsideWrites.includes(join(WORDS_TMP, "x.png")));
  assert.ok(wordsRun('npx pcg render graph.json --out="/tmp/my file.png"', 'cat "/tmp/other file.png"').includes(join(WORDS_TMP, "other file.png")));
  // The bug: a regex split `--out="/tmp/my file.png"` into `--out="/tmp/my`
  // and `file.png"`, so the write landed nowhere and reading it back read as
  // a reach into Temp.
  const p = wordsParse('npx pcg render graph.json --out="/tmp/my file.png"', 'cat "/tmp/my file.png"');
  assert.ok(p.outsideWrites.includes(made), JSON.stringify(p.outsideWrites));
  assert.deepEqual(p.readPaths.contaminating, [], "reading back its own output");
  assert.deepEqual(wordsParse('npx pcg render graph.json --out="my file.png"').writes, ["my file.png"]);
  assert.deepEqual(wordsParse("npx pcg render graph.json --out 'a'\"b\".png").writes, ["ab.png"], "one word from two quotings");
  // A command that only prints its arguments creates nothing, so it cannot launder a later read.
  assert.deepEqual(wordsRun('echo --out="/tmp/my file.png"', 'cat "/tmp/my file.png"'), [made]);
  assert.deepEqual(wordsRun("echo --out=/tmp/x.png", "cat /tmp/x.png"), [join(WORDS_TMP, "x.png")]);
});

test("WORDS: a > inside quoted code is the code's, not a redirect", () => {
  // Controls: real redirects around quoted code are still redirects, and code
  // reading an outside file still flags.
  const red = (c) => clauseRedirects(shellClauses(c)[0]);
  assert.deepEqual(red('node -e "a; b" > out.txt 2>&1').targets, ["out.txt"]);
  assert.deepEqual(red("echo x 2>err.log >>log.txt").targets, ["err.log"]);
  assert.deepEqual(red("echo x 2>err.log >>log.txt").appends, ["log.txt"]);
  assert.deepEqual(red("x &>both.log").targets, ["both.log"]);
  assert.ok(wordsParse('node -e "console.log(a > b)" > out.txt').writes.includes("out.txt"));
  assert.ok(wordsRun("node -e \"require('fs').readFileSync('/etc/passwd')\"").length > 0);
  assert.ok(wordsParse('node -e "console.log(1)" > /tmp/scratch.txt').outsideWrites.includes(join(WORDS_TMP, "scratch.txt")));
  // The bug: the redirect finder ran over the raw clause, so `> b)"` was a
  // write, and `1>require(...)...` cut the IO call out of the code judgeCode saw.
  assert.deepEqual(red('node -e "a > b" > out.txt 2>&1').targets, ["out.txt"]);
  assert.deepEqual(wordsParse('node -e "console.log(a > b)"').writes, [], "no file named `b)` was written");
  assert.deepEqual(wordsRun("node -e \"console.log(1>require('fs').readdirSync('/').length)\""), [WORDS_FS_ROOT], "the code lists the root");
});

test("WORDS: inline code is the word after the flag, every quoting joined", () => {
  // Controls: one quoting, either kind, still reads what it names.
  assert.deepEqual(wordsRun(`node -e 'require("fs").readdirSync("/")'`), [WORDS_FS_ROOT]);
  assert.ok(wordsRun("node -e \"require('fs').readFileSync('/etc/passwd')\"").length > 0);
  assert.deepEqual(wordsRun("python3 -c \"import os; print(os.listdir('/'))\""), [WORDS_FS_ROOT]);
  // The bug: `-e 'a'"b"` was read as `a`. bash hands node `ab`, so the
  // literal '/' below (quoted apart from the rest) is the code's argument.
  assert.deepEqual(wordsRun(`node -e 'require("fs").readdirSync('"'/'"')'`), [WORDS_FS_ROOT]);
  assert.deepEqual(wordsRun(`python3 -c 'import os; print(os.listdir('"'/'"'))'`), [WORDS_FS_ROOT]);
});

test("WORDS: bash -c and eval are lifted from the command position, past wrappers, never from inside a string", () => {
  const npmrc = join(homedir(), ".npmrc");
  // Controls: a shell handed a program, directly or through a wrapper, runs it.
  for (const cmd of ['sudo bash -c "cat /etc/passwd"', "xargs sh -c 'cat /etc/passwd'"]) assert.ok(wordsRun(cmd).length > 0, cmd);
  for (const cmd of [
    "bash -c 'ls /'",
    "sudo bash -c 'ls /'",
    "sudo -u root -E bash -lc 'ls /'",
    "xargs -I{} sh -c 'ls /'",
    "xargs -0 -n 1 sh -c 'ls /'",
    "env FOO=1 nohup nice -n 5 timeout 10 bash -lc 'ls /'",
    "FOO=1 /usr/bin/bash --norc -c 'ls /'",
    "find . -name x -exec sh -c 'ls /' \\;",
    "ssh localhost bash -c 'ls /'",
    `bash -c "bash -c 'ls /'"`,
    "echo x | bash -c 'ls /'",
  ]) {
    assert.deepEqual(wordsRun(cmd), [WORDS_FS_ROOT], cmd);
  }
  assert.deepEqual(wordsRun("sudo bash -c 'cd ~ && cat .npmrc'"), [npmrc]);
  assert.deepEqual(wordsRun("eval 'cd ~'; cat .npmrc"), [npmrc], "eval moves THIS shell");
  assert.deepEqual(wordsRun("echo 'true; cd ~; cat .npmrc' | sh"), [npmrc], "a quoted program piped into a shell");
  // The bug: the lift was a regex over the whole line, so a `bash -c` inside a
  // quoted string was run. It is text there.
  assert.deepEqual(wordsRun(`echo "bash -c 'ls /'"`), []);
  assert.deepEqual(wordsRun(`printf "%s\\n" "bash -c 'ls /'"`), []);
  // Read from words, the lift also sees what the line regex could not: an
  // option with an argument before `-c`, an unquoted program, and `eval`'s
  // words when they are not one quoted string.
  assert.deepEqual(wordsRun("time command bash -o pipefail -c 'ls /'"), [WORDS_FS_ROOT]);
  assert.deepEqual(wordsRun("sudo sh -c ls\\ /"), [WORDS_FS_ROOT]);
  assert.deepEqual(wordsRun("eval cd ~; cat .npmrc"), [npmrc]);
});

test("WORDS review: what a shell is handed through a here-string, a glued quote, eval --, a quoted wrapper or a pipe is still run", () => {
  const npmrc = join(homedir(), ".npmrc");
  const other = join(WORDS_ROOT, "pcg-eval-Other", "project", "graph.json");
  // Each of these lost its flag in the first cut of the word-based lift (an independent review's repros).
  // A here-string fed to a shell is its program.
  assert.deepEqual(wordsRun("bash <<< 'cd ~ && cat .npmrc'"), [npmrc]);
  assert.ok(wordsRun('sudo bash <<< "cd ../..; cat pcg-eval-Other/project/graph.json"').includes(other));
  assert.ok(wordsRun("sh -s <<< $'cd ~\\ncat .npmrc'").includes(npmrc));
  // A quoted program glued to other text in one word: the quoted PIECE is the program.
  assert.deepEqual(wordsRun("x='cd ~ && cat .npmrc'; eval \"$x\""), [npmrc]);
  assert.deepEqual(wordsRun("nodemon --exec='cd ~ && cat .npmrc'"), [npmrc]);
  assert.deepEqual(wordsRun('foo --cmd="cd ~; cat .npmrc"'), [npmrc]);
  // `eval --` ends eval's options.
  assert.deepEqual(wordsRun("eval -- 'cd ~ && cat .npmrc'"), [npmrc]);
  assert.ok(wordsRun('builtin eval -- "cd ../..; cat pcg-eval-Other/project/graph.json"').includes(other));
  // A `bash -c` quoted for a command that runs it, or piped into a shell.
  for (const cmd of [`su -c "bash -c 'ls /'"`, `watch "bash -c 'ls /'"`, `ssh localhost "bash -c 'ls /'"`, `echo "bash -c 'ls /'" | bash`, `git -c alias.x="!bash -c 'ls /'" x`, `awk 'BEGIN{system("bash -c \\"ls /\\"")}'`]) {
    assert.deepEqual(wordsRun(cmd), [WORDS_FS_ROOT], cmd);
  }
  assert.deepEqual(wordsRun("echo ls / | sh"), [WORDS_FS_ROOT], "what echo prints into a shell is its program");
  // Unquoted, `cd C:\Users` reaches Git Bash as `C:Users`, which it takes from the drive's root.
  if (process.platform === "win32") assert.deepEqual(wordsRun("cd C:\\Users; cat c4rl05/.npmrc"), ["C:\\Users\\c4rl05\\.npmrc"]);
  // A thousand nested evals neither overflow the stack nor go quadratic.
  const t0 = Date.now();
  assert.ok(Array.isArray(wordsRun("eval ".repeat(1000) + "'cd ~'; cat .npmrc")));
  assert.ok(Array.isArray(wordsRun("x" + " > /tmp/a".repeat(40000))));
  assert.ok(Date.now() - t0 < 5000, `took ${Date.now() - t0} ms`);
});

test("OBSERVED 2.1.272 transcript parses into turns, tools, usage and reads", () => {
  const sandbox = join(tmpdir(), "pcg-eval-FIXTURE", "project");
  const text = readFileSync(new URL("fixtures/transcripts/smoke-2.1.272.jsonl", HERE), "utf8")
    .replaceAll("{{SANDBOX}}", JSON.stringify(sandbox).slice(1, -1))
    .replaceAll("{{HOME}}", JSON.stringify(homedir()).slice(1, -1));
  const events = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const p = parseTranscript(events, { cwd: sandbox, tmpEntriesAtStart: new Set(), benignRoots: jailOf(sandbox) });
  assert.equal(p.turns, 5);
  assert.equal(p.toolCalls, 4);
  assert.deepEqual(p.toolCallsByName, { Read: 1, Bash: 2, Write: 1 });
  assert.equal(p.usage.output_tokens, 1014);
  assert.equal(p.init.apiKeySource, "none");
  assert.deepEqual(p.init.mcp_servers, []);
  assert.deepEqual(p.init.tools, ["Bash", "Edit", "Glob", "Grep", "Read", "Write"]);
  assert.deepEqual(p.readPaths.pkg, ["bin/pcg.mjs"]);
  assert.deepEqual(p.readPaths.outsideSandbox, [join(tmpdir(), "pcg-eval-FIXTURE")], "the smoke run's `ls ..`");
  assert.deepEqual(p.readPaths.contaminating, []);
  assert.deepEqual(p.writes, ["graph.json"]);
  assert.equal(p.finalText, "SMOKE DONE 0.17.0");
  assert.equal(p.rateLimitEvents[0].status, "allowed");
  assert.deepEqual(p.pcgCommands, { version: 1 });
});

test("transcript parsing: package areas, pcg command failures, contamination through tools", () => {
  const cwd = join(tmpdir(), "pcg-eval-Y", "project");
  const use = (id, name, input) => ({ type: "assistant", message: { id: `m${id}`, content: [{ type: "tool_use", id: `t${id}`, name, input }], usage: { output_tokens: 10 } } });
  const res = (id, isError) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: `t${id}`, is_error: isError, content: "" }] } });
  const events = [
    use(1, "Read", { file_path: join(cwd, "node_modules", "pcg-ts", "llms.txt") }),
    use(2, "Grep", { path: "node_modules/pcg-ts/docs", pattern: "scatter" }),
    use(3, "Glob", { pattern: "node_modules/pcg-ts/graphs/*.json" }),
    use(4, "Bash", { command: "cat node_modules/pcg-ts/skills/graph-authoring/SKILL.md" }),
    use(5, "Bash", { command: "npx pcg validate graph.json" }),
    res(5, true),
    use(6, "Bash", { command: "node node_modules/pcg-ts/bin/pcg.mjs validate graph.json && npx pcg cook graph.json --json > cook.json" }),
    res(6, false),
    use(7, "Read", { file_path: join(homedir(), ".npm", "_cacache", "index") }),
    use(8, "Write", { file_path: "probe.json", content: "{}" }),
  ];
  const tilde = parseTranscript([use(1, "Read", { file_path: "~/.claude/CLAUDE.md" })], { cwd, tmpEntriesAtStart: new Set() });
  assert.deepEqual(tilde.readPaths.contaminating, [join(homedir(), ".claude", "CLAUDE.md")], "the Read tool's ~ is the home dir, not a sandbox subdir");
  const script = parseTranscript(
    [use(1, "Write", { file_path: join(cwd, "look.mjs"), content: "import fs from 'node:fs';\nconsole.log(fs.readdirSync('../../'));\n" }), use(2, "Bash", { command: "npm install pcg-ts@latest" })],
    { cwd, tmpEntriesAtStart: new Set(["other"]), benignRoots: jailOf(cwd) },
  );
  assert.ok(script.readPaths.contaminating.includes(tmpdir()) || script.readPaths.outsideSandbox.includes(tmpdir()), "a written script's paths are scanned");
  assert.ok(script.readPaths.contaminating.includes("net:npm install pcg-ts@latest"));
  const p = parseTranscript(events, { cwd, tmpEntriesAtStart: new Set(), benignRoots: jailOf(cwd) });
  assert.deepEqual(p.readPaths.llms, ["llms.txt"]);
  assert.deepEqual(p.readPaths.docs, ["docs"]);
  assert.deepEqual(p.readPaths.skills, ["skills/graph-authoring/SKILL.md"]);
  assert.deepEqual(p.pcgCommands, { validate: 2, cook: 1 });
  assert.deepEqual(p.pcgFailures, { validate: 1 });
  assert.equal(p.readPaths.contaminating.length, 1);
  assert.ok(p.readPaths.contaminating[0].includes("_cacache"));
  assert.deepEqual(p.writes, ["cook.json", "probe.json"]);
  assert.equal(p.turns, 8, "distinct assistant message ids when no result message");
});
