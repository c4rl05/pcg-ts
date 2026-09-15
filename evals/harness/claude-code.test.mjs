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
  assert.equal(classifyOutsidePath(tmpdir(), opts), "benign", "a bare Temp listing shows names only");
  assert.equal(classifyOutsidePath(join(tmpdir(), "my-scratch-made-during-run", "a.json"), opts), "benign");
  assert.equal(classifyOutsidePath(join(tmpdir(), "claude", "x", "notes.md"), opts), "contaminating");
  assert.equal(classifyOutsidePath(join(homedir(), ".claude", "CLAUDE.md"), opts), "contaminating");
  assert.equal(classifyOutsidePath("D:\\Projects\\JS\\pcg-ts\\llms.txt", opts), "contaminating");
  assert.equal(classifyOutsidePath("/dev/null", opts), "benign");
  assert.deepEqual(jailOf(join(jail, "project")), [jail]);
  assert.deepEqual(jailOf(join(tmpdir(), "elsewhere", "project")), []);
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
