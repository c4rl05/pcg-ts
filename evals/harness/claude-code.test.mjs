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
