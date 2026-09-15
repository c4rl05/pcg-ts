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
  claudeConfigDir,
  classifyOutsidePath,
  extractCommandPaths,
  extractNetworkAttempts,
  jailOf,
  launch,
  parseTranscript,
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
    "echo $HOME",
    "echo ~",
    'node -e "console.log(a /b)"',
    "mkdir -p scratch/deep && cd scratch/deep && cat > s.mjs <<'EOF'\nimport g from '../../graph.json' with { type: 'json' };\nEOF",
  ]) {
    assert.deepEqual(bash(cmd), [], cmd);
  }
  assert.deepEqual(verdict([{ name: "Write", input: { file_path: join(cwd, "scratch", "deep", "s.mjs"), content: "const g = readFileSync('../../graph.json'); import('../../node_modules/pcg-ts/dist/index.js');" } }]), []);
  assert.deepEqual(verdict([{ name: "Write", input: { file_path: join(cwd, "scratch", "deep", "s.sh"), content: "npx pcg validate ../../graph.json" } }]), []);
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
