# Agent eval

Whether a fresh agent, given only the installed package, can author graphs
that meet an outcome brief, measured so that a before/after comparison of
the package means something. The plan is `PLAN-agent-readiness.md`, unit U7.
Nothing here is in the npm package or in vitest, and nothing runs in CI: it
is nondeterministic and it spends the owner's Claude subscription allowance.

## Layout

| Path | What | In git |
|---|---|---|
| `evals/eval.config.json` | model, arms, tasks, caps, gate thresholds, campaigns | yes |
| `evals/harness/pack.mjs` | build + pack a tarball with a manifest; derive a stripped arm (`docs` and/or `graphs`) | yes |
| `evals/harness/sandbox.mjs` | a temp consumer project per run (plus shared helpers) | yes |
| `evals/harness/agents/claude-code.mjs` | headless Claude Code adapter: isolation, caps, transcript parsing | yes |
| `evals/harness/limits.mjs` | usage-limit vs failure classification, reset parsing, backoff | yes |
| `evals/harness/selftest.mjs` | task validation, reference/negative scoring, brief lint, isolation probe | yes |
| `evals/harness/run.mjs` | the resumable campaign runner | yes |
| `evals/harness/report.mjs` | Wilson intervals, paired deltas, effort metrics and their bootstrap, the gate, the calibration table | yes |
| `evals/harness/score.mjs`, `evals/lib/` | the scorer (separate unit; contract below) | yes |
| `evals/harness/fixtures/` | a trivial task, a stub scorer, a stub agent, a real transcript | yes |
| `evals/tasks/<id>/` | corpus-adjacent tasks | yes |
| `D:/Projects/JS/pcg-ts-private/evals/tasks/<id>/` | held-out tasks (briefs in a public repo end up in training data) | private repo |
| `evals/results/<campaign>/` | `manifest.json`, `runs.jsonl`, `discarded.jsonl`, `STATUS.json`, `selftest.json`, `report.{json,md}`, `calibration.md` (calibration campaigns only) | yes |
| `evals/tarballs/` | the tarballs themselves, referenced by absolute path from the config | **no** |
| `evals/runs/<campaign>/<slot>-a<attempt>/` | transcripts, the agent's graph and workspace | **no** |

## Commands

```sh
node evals/harness/pack.mjs --from-repo --label candidate-u1     # build + pack the current tree
node evals/harness/pack.mjs --strip-docs evals/tarballs/baseline-0.17.0-0ad6998.tgz
node evals/harness/pack.mjs --strip-graphs evals/tarballs/baseline-0.17.0-0ad6998.tgz
node evals/harness/pack.mjs --strip-docs --strip-graphs \
  --from evals/tarballs/candidate-U1-0.17.0-9284b1f.tgz          # -> stripped-all-0.17.0-9284b1f.tgz
node evals/harness/pack.mjs --verify evals/tarballs/<t>.tgz      # install it and run its CLI
node evals/harness/selftest.mjs --campaign pilot                 # exit 0 pass, 1 fail, 2 config
node evals/harness/run.mjs --campaign calibration                # one run per task, one arm, no gate
node evals/harness/run.mjs --campaign calibration-reserves       # the same, for the two reserve tasks
node evals/harness/run.mjs --campaign v2                         # exit 0 done, 10 wake owner, 2 config, 1 crash
node evals/harness/run.mjs --campaign v2 --dry-run               # print the schedule, spend nothing
node evals/harness/report.mjs --campaign v2
node --test --test-concurrency=1 "evals/harness/*.test.mjs"      # the harness' own tests (~5 min)
```

Run the tests with `NODE_ENV` unset (`env -u NODE_ENV node --test ...`): this
machine's shell exports `NODE_ENV=production`, which other suites in this
repository read.

`npm run eval`, `npm run eval:selftest` and `npm run eval:pack` are the same
three entry points. To exercise the runner end to end without spending
allowance:

```sh
STUB_AGENT_SCRIPT=<script.json> node evals/harness/run.mjs --campaign fixture \
  --agent evals/harness/fixtures/stub-agent.mjs --scorer evals/harness/fixtures/stub-score.mjs
```

(`run.test.mjs` shows the script format.)

## Contract with the scorer and the tasks

- A task dir holds `brief.md`, `task.json`, `reference.graph.json`,
  `check.mjs`, and `negatives/<name>.graph.json` each with
  `negatives/<name>.expect.json` = `{ "failsCheck": "<checkId>" }`.
- `task.json` = `{ id, tier: "corpus-adjacent"|"held-out", title, outputs: [{ name, kind }], seeds: number[], budgets: { turns, wallMinutes }, checks: [{ id, hard, description }], reserve?, campaign? }`.
  `id` must equal the directory name. `reserve: true` tasks are not in a
  `"non-reserve"` selection; the gate swaps them in for floor/ceiling tasks.
  `campaign: "<name>"` is how a campaign takes a set of tasks without naming
  them one by one: `"tasks": { "campaign": "v2" }` in the config selects every
  task file carrying that value, across both task dirs, reserve or not. An
  explicit `tasks.include` wins over `tasks.campaign`, because `run.mjs` finds
  the reserve pool by re-selecting the same object with `include: "reserve"`.
  Pair it with `expectTaskCount` so a task that did not land is a loud config
  error rather than a smaller campaign. A task that names a campaign is NOT in
  the default `"non-reserve"` pool, the way a reserve task is not — it belongs
  to the campaign that claimed it. Without that, authoring v2's eight tasks
  would have quietly enlarged the pilot's six.
- `node evals/harness/score.mjs --task <taskDir> --graph <graph.json> --pcg <sandbox>/node_modules/pcg-ts`
  prints ONE JSON object `{ graphProduced, validates, cooks, deterministic, partitionSafe, checks: { [id]: { pass, perSeed } }, solved, score, error? }`
  and exits 0 whenever it produced it. The harness always runs it in a new
  process, after the agent session has ended, against the arm's own install.
- **Selftest strictness, stated because it binds the task author:** a
  negative must fail EXACTLY its named hard check. The named check fails,
  every other hard check passes, the gate fields (`validates`, `cooks`,
  `deterministic`, `partitionSafe`) are true, and the graph is not solved. A
  negative that also fails something else proves nothing about the check it
  names. `failsCheck` may also name a gate field, in which case only that
  field has to be false.
- **Brief lint:** a brief may not name a registered node type, field fn or
  primitive, taken per arm from `pcg nodes --json`, `pcg fields --json` and
  `docs/primitives.json` (a stripped arm's primitives come from the tarball it
  was derived from). Identifier-shaped names (`pointScatterInBounds`,
  `atan2`, `fill/scatter-even`, `scatter-even`) are flagged anywhere, in any
  letter case. Plain lowercase words that happen to be names (`distance`,
  `step`, `ring`) are flagged only when written as code: in backticks, in
  straight or curly quotes, or followed by `(`. This is deliberately looser
  than "no registered name anywhere": a brief in world terms has to be able
  to say "distance to the road".

## A run

1. `sandbox.mjs` makes `<sandboxRoot>/pcg-eval-XXXX/project/`, refuses if any
   ancestor is a git repo or holds a `CLAUDE.md`/`AGENTS.md`, copies the arm's
   tarball into the jail as `pcg-ts.tgz`, runs `npm init -y` and
   `npm install ../pcg-ts.tgz --no-audit --no-fund` (offline first, online if
   that fails; recorded per run as `installedOffline`), and copies in
   `brief.md` and nothing else. The project sits one level inside the jail so
   the agent's first `ls ..` lands somewhere nearly empty. The neutral name
   matters: installing the arm's tarball by its own path wrote
   `file:D:/.../stripped-0.17.0-0ad6998.tgz` into package.json and the
   lockfile (observed), which named the arm to the agent and the repository's
   location. The sandbox now refuses to start if any npm metadata file holds
   the tarball's name or directory.

   **The sandbox root** (`sandboxRoot`, default `C:/pcg-eval/sandboxes` on
   Windows, `/var/tmp/pcg-eval/sandboxes` elsewhere) is a directory that holds
   nothing but sandboxes. The first pilot put them in the OS temp dir, which
   also holds the orchestrator's scratchpad — plans and task reports that name
   held-out tasks — one `ls ../..` away. The runner refuses a root inside the
   temp dir, the home directory or a repository; the sandbox refuses a root
   holding anything but `pcg-eval-*` entries and removes sandboxes older than
   six hours that a crash left behind. `C:/pcg-eval` is short (MAX_PATH),
   outside every profile and repo, and has one Git Bash spelling
   (`/c/pcg-eval/sandboxes`), which the classifier maps. Cleanup also removes
   the per-project directory Claude Code leaves under
   `<claude config>/projects/` for the sandbox (offloaded tool results persist
   even without session persistence), and only a directory named for a sandbox.
2. The adapter launches `claude -p` with the campaign prompt on stdin. The
   prompt is in the config and hashed into the manifest; it names neither docs
   nor the CLI, and it states the absolute working directory in both spellings
   (`{{cwd}}` and `{{cwdBash}}`, filled per run): an agent that did not know
   where it was typed `cd /tmp` in the first pilot.
3. The transcript is parsed and the session classified (`limits.mjs`).
4. The graph and the agent's files are copied to `evals/runs/`, the scorer
   runs in its own process, one line is appended to `runs.jsonl`, and the
   sandbox is removed. A scorer that times out or dies on the agent's graph
   records `scorerError` and the run counts as unsolved: excluding it would
   favour the arm whose agents write pathological graphs.

## Isolation, and the evidence it holds

The agent must see the sandbox and none of this machine's configuration,
while still authenticating with the owner's subscription login. `--bare`
cannot do that (it reads only `ANTHROPIC_API_KEY`/`apiKeyHelper`). What the
adapter passes, from the CLI reference for 2.1.272:

- `--safe-mode`: CLAUDE.md, skills, plugins, hooks, MCP servers, custom
  agents, output styles and auto memory do not load; authentication, model
  selection, built-in tools and permissions work normally.
- `--setting-sources ""`: no user, project or local settings files (the
  owner's default model, effort, permission rules and auto-mode text).
- `--strict-mcp-config --mcp-config <empty>`, `--disable-slash-commands`,
  `--restricted` (file tools confined to the working directory),
  `--no-chrome`, `--no-session-persistence`.
- `--tools Bash,Read,Write,Edit,Glob,Grep` (no web tools, no subagents) with
  `--permission-mode dontAsk` and the same list in `--allowedTools`: nothing
  waits for a human, anything that would prompt is denied and counted.
- env `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`,
  `DISABLE_AUTOUPDATER=1`, `ENABLE_CLAUDEAI_MCP_SERVERS=false`; the parent
  session's plumbing variables (`CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, the
  messaging socket and token, ...) are removed and their names recorded.

Observed on 2.1.272 (2026-09-15), three real sessions:

- A smoke session with those flags: `init` reported `mcp_servers []`,
  `plugins []`, `skills []`, `slash_commands []`, `output_style "default"`,
  `apiKeySource "none"`, tools exactly `Bash, Edit, Glob, Grep, Read, Write`;
  no session directory appeared under `~/.claude/projects`. `--restricted`
  does not confine the shell: `ls ..` listed the Temp directory, which is why
  the jail exists and why transcripts are parsed for outside paths.
- The isolation probe, clean: the session answered NONE under every heading.
  It did mention one thing the flags do not remove: the account's e-mail
  address arrives as a system reminder. That identifies the account and says
  nothing about the library, so it is recorded here rather than treated as a
  leak.
- The isolation probe, control (isolation disabled, cwd the repo root): 53
  canary hits — five MCP servers, five plugins, 23 skills, a non-default
  output style in `init`, and the repo CLAUDE.md headings quoted in the reply.
  The check can fail.

The probe's clean session runs in a sandbox under the sandbox root with the
first arm's package installed, as a real run does (the recorded evidence
above predates that and ran in an empty jail under Temp). It re-runs whenever
the CLI version, the adapter's isolation fingerprint (the launch arguments,
environment and launcher code — not the transcript parser, so a classifier
fix costs no probe sessions), the probe prompt, the model, the sandbox root,
or this machine's own configuration (user
instructions and rules, skills, agents, plugins, MCP servers) changes (cache:
`evals/runs/.isolation-probe-cache.json`), and every real run re-checks its
own `init` for MCP servers, plugins, skills, slash commands, a non-default
output style and a non-`none` API key source. A probe stopped by a usage
limit or an outage waits and asks again; it is not a selftest failure.

**Billing guard.** The adapter refuses to launch when `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, a Bedrock/Vertex/Foundry switch
or key, or similar is set, and strips none of them. `run.mjs` checks before
the selftest, before every slot, and against every session's
`apiKeySource`.

**Contamination.** Every Read/Write/Edit/Glob/Grep path, every path-shaped
token of a shell command, and every path-shaped token in the content of a
script the agent writes (a Write of `.sh .ps1 .js .mjs .cjs .ts .py ...`, or a
heredoc) is resolved. Tokens are taken quote-aware (so `"C:/Program Files/x"`
stays whole) and fine-grained (so `readFileSync('../../x')` inside
`node -e "..."` surfaces). Path-shaped means: absolute (Windows, Git Bash
`/c/`, POSIX, the root `/` as an argument of a filesystem command), `~` at the
start of a token, an environment variable at the start of a token (`$HOME`,
`${USERPROFILE}`, `$LOCALAPPDATA`, `%APPDATA%`, `$env:TEMP`, ...), a `..`
segment anywhere, or a reference into `node_modules`. In code files
(`.js .mjs .cjs .ts .py`) only string literals are scanned, so comments,
regex literals and division are not paths; in shell scripts comment lines are
dropped.

**The Bash tool keeps ONE shell, and its working directory survives between
tool calls.** The classifier tracks it the same way: `cd node_modules/pcg-ts`
in one call and `cat ../../graph.json` in the next names the sandbox's own
graph, not something two levels above it. Resetting to the sandbox on every
call discarded three pilot runs over files that were never outside. The state
is per SESSION — a new sandbox starts at its own project directory, and
nothing carries between runs. Bare `cd` goes home, `cd -` returns to where the
shell was before its last move, `pushd`/`popd` are a stack, and a `cd` inside
`( ... )` or `bash -c '...'` is local to that child shell. Where the transcript
cannot settle it — the tool call reported an error, so there is no telling how
far the command got — the reading that keeps the shell INSIDE the sandbox
wins: a wrong guess that moves it out turns every later relative path into a
false contamination, and a re-run costs more than a run's worth of doubt.

Shell commands are judged clause by clause (split at `&&`, `||`, `;`, `|`,
newlines; heredoc bodies are lifted out first and scanned as the script they
are), and the parser follows `cd`: after `cd X`, a reading command's plain
relative arguments (`cat notes.md`, `ls`, `grep -r x`) name things in X, so
does any path-like token of any other command (`xargs cat a/b`,
`python -c "open('a/b.md')"`, `echo "$(cat README.md)"`), and any other command
run from a directory that is neither inside the sandbox nor one of its
ancestors (`git log`, `npm run`, a script) counts as reading that directory.
A heredoc fed to `bash`/`sh` and a `bash -c '...'` string are scanned as
shell, `cd` and all; `eval '...'` runs in the same shell, so a `cd` inside it
moves the tracked directory. Inline code (`node -e`, `python -c`, ...) can
chdir and build paths, so its outside paths read like a written script's. A
written script's relative path counts as outside only when it is outside both
against the script's own folder and against the working directory. Writes:
a successful truncating create (the Write tool when it did not error, `>`, a
heredoc `>`, `tee`, a `cp`/`mv` destination file, `cp -t` included) makes that
exact file the agent's own to read back; `mkdir` (which succeeds on a
directory that already existed), `>>`, `tee -a`, `touch` and the Edit tool
grant nothing. No write ever whitelists a subtree, and a path cut back at a
wildcard (`*`, `?`, `[...]`, `{...}`; a Glob pattern with a separator after its
wildcard) reads what lies under it. `ln`, `rsync`, `cp -a`/`-r` and a shell
variable assigned a path (`D=../..`) count as recursive.

Outside paths are classified:

- **benign** — devices; OS, toolchain and node install dirs; the harness jail
  around this sandbox (it holds only `pcg-ts.tgz`); anything the agent itself
  created outside the sandbox earlier in the same session, as defined above
  (every outside write is recorded per run as `outsideWrites`, never as
  contamination); this session's own Claude Code
  directory `<claude config>/projects/<slug>/<session_id>/`, where large tool
  output is offloaded and read back (observed in the aborted pilot); a `cd` by
  itself (it reads nothing; what runs after it is judged); a non-recursive
  listing of the sandbox root (sandbox names only); `node_modules/pcg-ts/...`
  under an ancestor of the sandbox as the script a `node` call runs (the
  agent's own package reached through a relative path after a `cd` up; any
  other read of such a path contaminates); a Temp entry that
  did not exist when the session started (a wildcard is never such an entry);
- **contaminating** — everything else: repositories, the home directory, the
  npm cache (unstripped copies of the package), other sandboxes, pre-existing
  Temp entries such as the orchestrator's scratchpad under `Temp\claude`,
  another session's tool results, a foreign directory listed or searched, the
  sandbox root searched recursively, the filesystem root. Commands that fetch
  from outside the machine or read the npm cache are contaminating too:
  `curl`/`wget`/`Invoke-WebRequest`, `git clone/fetch`,
  `npm view/info/pack/cache/config get`, `npm install <pkg>`,
  `npx <anything but pcg>`, and so on; a bare `npm install` (which reinstalls
  `file:../pcg-ts.tgz`) is not.

**A read outside the jail and a write outside it are not the same event, and
they never were.** The threat this eval defends against is the agent SEEING
something it should not — the repository under evaluation, another task's
brief, its own earlier run's work. A scratch file written to Temp gives the
run no information it did not already have, so it is recorded in
`outsideWrites` as a HAZARD and never contaminates the run that made it. What
makes it a hazard is the next run: 96 slots share one machine, and a file left
behind is a file a later run could read. Both halves of that now hold:

- **Each run has its own temp directory**, `<jail>/tmp`, with `TMPDIR`, `TEMP`
  and `TMP` all pointing at it. The jail is already a benign root, so a scratch
  write is not a finding at all; and the jail is removed with the run, so
  nothing survives into the next one. This is why the behaviour disappears
  rather than being punished — the alternative was re-running the most
  expensive task in the campaign twelve times.
- **A write is recognised however it is made.** Shell redirects and copy
  destinations always were; an output FLAG (`pcg render --out /tmp/a.svg`) and
  an fs call inside inline code (`node -e "...writeFileSync('/tmp/x')..."`) now
  are too. Before that, those two shapes read as READS of paths that happened
  to be in Temp, so the verdict turned on whether the name looked pre-existing
  rather than on the command that created it. Measured over the pilot and
  calibration: 38 of 69 runs wrote outside their sandbox, in six distinct
  shapes; `--out` and inline-code writes were the two the record never showed.
  Short `-o` is deliberately NOT treated as an output flag — to `grep` it means
  only-matching, and inventing a write is worse than missing one.

A file the agent created is its own to read back, whichever way it created it.
That rule is not new (a `>` redirect always granted it); it is now applied
consistently, which is what stopped the live classifier and the reclassifier
disagreeing.

A contaminating run is recorded `contaminated: true, final: false` and the
slot re-runs once. If more than half of the last six finished attempts
(`limits.contaminationRateWindow`, `limits.contaminationRateMax`) are
contaminated, the runner stops with wake reason `contamination-rate`: that
pattern means the classifier or the sandbox is wrong, and every re-run spends
allowance. The heuristic cannot see a path assembled at runtime from pieces.

`node evals/harness/reclassify.mjs --results evals/results/<campaign> [--runs evals/runs/<campaign>]`
re-runs the current classifier over a campaign's finished records without
changing them, and prints before/after verdicts, plus how many paths each run
wrote outside its sandbox.

It cannot know the launch-time Temp snapshot — that is not recorded — so it
judges each transcript BOTH ways (strict: every Temp entry pre-dated the run;
permissive: anything in Temp was the agent's own) and marks a run AMBIGUOUS
when they disagree, rather than picking one and calling it the verdict. That
disagreement is what made the same quarry-terraces transcript clean at run
time and contaminated on review. It is now empty on both campaigns: once a
created file is recognised from the command that created it, the verdict is a
property of the TRANSCRIPT rather than of the machine's temp directory, and
the two entry points cannot disagree. On the aborted first pilot
(`pilot-aborted-1`, 5 records, 4 flagged) it keeps exactly one contaminated:
the agent's disk-wide `find /`. The other three were the session's own
offloaded tool output, a file the agent wrote to `/tmp` and read back, and a
mistyped `cd /tmp` followed by a failed relative command. Excerpts of those
transcripts are the fixture `fixtures/transcripts/pilot-aborted-1-excerpts.json`.

Network access is not blocked (the CLI has no such switch on Windows); bare
URLs are logged per run in `networkAttempts`.

## Usage limits

A usage-limit stop is not a failed run: its slot is appended to
`discarded.jsonl` unscored, the runner sleeps (STATUS `sleeping-limit`) and
retries the same slot. With a reset time in the future it sleeps until two
minutes after it; without one (or with one already past) it backs off 15, 30,
60, 120, 120... minutes and sends a one-turn probe session before resuming.
Blocked for more than
`limits.wakeAfterBlockedHours` (48), or told of a reset further away than
that from when the block began (a weekly limit): wake. The blocked-since time
lives in `STATUS.json`, so a restart does not reset the 48 hours.

Infrastructure failures — API overload/5xx/network errors, auth failures (not
logged in, expired token), a session that ended before the agent's first turn
(bad flags, an unknown model, a crash on start), a sandbox that would not
build, an isolation or limit probe that could not launch, a CLI that will not
report its version — are discarded and retried the same way on a 1, 2, 4... 15 minute
backoff, and never finalize a slot. Past `limits.wakeAfterInfraHours` (12) of
nothing else: wake. A limit outranks a cap (a session stuck retrying a 429
until the wall clock killed it was stopped by the limit). A run hitting its
own turn, wall or token cap is a scored failure, never retried; a session in
which the agent worked and the CLI then died is scored too (outcome `other`).

Which formats are real: the `rate_limit_event` stream message was OBSERVED
(`status: "allowed"`, `resetsAt` in epoch seconds, `rateLimitType`,
`unifiedWindows`), in the smoke session. Everything that signals a HIT is
ASSUMED, because nobody can trigger a limit on purpose: `status: "rejected"`
on that event, the older `Claude AI usage limit reached|<epoch>` result
text, and the prose forms (`You've hit your session limit · resets 3pm
(Europe/Madrid)`, `Weekly limit reached · resets Sep 18, 9am`,
`... Your limit will reset at 3pm (America/New_York)`). Each has a test in
`limits.test.mjs`. The classifier reads only CLI-produced text (an errored
result, synthetic assistant messages, stderr), never the agent's own replies.
When the first real limit arrives, add its transcript to
`fixtures/transcripts/` and pin it.

## Unattended operation

- The runner holds `evals/results/<campaign>/.lock.json`; a second runner
  refuses, unless the pid in the lock now belongs to a process that started
  at a different time (a reused pid after a reboot). The lock records the agent session's pid and start time while one
  runs; a restarted runner kills that process only if the pid still belongs
  to a process that started then (Windows reuses pids, and the owner's own
  Claude Code has the same image name).
- Every finished slot is one appended line. Killed, rebooted or out of
  window, `node evals/harness/run.mjs --campaign <name>` resumes at the first
  unfinished slot. Nothing needs a person to press go; a scheduler that
  starts it at logon and again whenever it exits 0 (with `STATUS.json` not
  `done`) or 1 (a crash) is enough. It must not restart on 2 or 10.
- `report.md` is rewritten after every slot, so progress is readable mid-run.
- A crash mid-append leaves a torn last line in `runs.jsonl`; the next start
  moves it aside to `runs.jsonl.torn-<ms>` and resumes. After a real session,
  copying the workspace and hashing the transcript are best effort: a failure
  there is logged and the record is still written.
- A campaign refuses to resume (exit 2) if its identity changed: model,
  arms' tarball hashes, task file hashes, runs per task, schedule seed,
  prompt, caps, or the harness code (harness modules, `evals/lib`, scorer,
  adapter; not `report.mjs` or `pack.mjs`, which decide no record).
  Unrelated commits elsewhere in the repo do not count.
- **Deviation from "one CLI version per campaign":** a change of Claude Code
  version mid-campaign does not stop the runner. The owner's interactive
  sessions update the shared binary, and refusing would strand every
  unattended campaign on the next update. Instead the isolation probe re-runs
  before the next slot, every record carries its `claudeVersion`, and the
  report lists every version seen. A comparison of record should check that
  list is one entry long.
- Exit 10 means wake the owner, with reasons in `STATUS.json`: isolation leak
  detected, API key present, usage limit blocking > 48 h, selftest failure,
  `contamination-rate` (more than half of the last six attempts contaminated),
  infrastructure failing > 12 h (added: an outage the plan's list did not
  cover, which would otherwise burn the schedule or loop forever), and pilot
  gate failed twice after task replacement (a campaign whose config names
  the failed one as `retryOf`). The rest is logged and the queue moves on.

## The schedule

Rounds by run index (every task gets run 0 before any gets run 1, so drift
over a long campaign lands on every task alike); task order shuffled per
round; arm order shuffled within each (task, run) block. mulberry32 seeded
by `scheduleSeed`; the whole schedule is written into the manifest.

## Campaigns and arms

| Campaign | Arms | Tasks | Runs/task | Slots | Gate |
|---|---|---|---|---|---|
| `pilot` | A, A-prime, stripped | non-reserve (6) | 3 | 54 | pilot gate (solved only) |
| `calibration` | A | `campaign: "v2"` (8) | 1 | 8 | none — `calibration.md` instead |
| `calibration-reserves` | A | `forest-clearing`, `spiral-stair` | 1 | 2 | none — prices the reserves |
| `v2` | A, A-prime, candidate-U1, stripped-all | `campaign: "v2"` (8) | 3 | 96 | v2 gate (solved OR effort) |
| `fixture` | A, A-prime, stripped | `fixture-grid` | 1 | 3 | pilot gate |

**Strip sets.** `pack.mjs` derives a sensitivity arm by filtering a tarball's
tar stream block by block — nothing else can change, no re-ordered entries, no
new mtimes, no platform tar differences. Two sets:

| Flag | Removes | Default label |
|---|---|---|
| `--strip-docs` | `llms.txt`, `docs/`, `skills/` | `stripped` |
| `--strip-graphs` | `graphs/`, `docs/graphs.json`, `docs/graphs.md` | `stripped-graphs` |
| both | the union | `stripped-all` |

They combine: `--strip-docs a.tgz --strip-graphs`, `--strip-graphs a.tgz
--strip-docs` and `--strip-docs --strip-graphs --from a.tgz` all name the same
job, and two different source tarballs is an error. The manifest beside the
result records `stripSets`, `strippedPaths`, `derivedFrom: { file, sha256 }`
and every removed entry, and the result is installed into a scratch sandbox
where `pcg --help` and `pcg nodes --json` must run, or the tarball is deleted
and the command fails.

The `graphs` set takes the corpus index with the corpus bodies on purpose:
`docs/graphs.json` carries every graph's title, description, tags and node
types, so leaving it would leave the corpus in prose and point `pcg graphs` at
files that are not there. Removing the bodies is the point — **the pilot's own
finding was that agents read the shipped `graphs/` corpus in 83–89% of runs in
EVERY arm, the docs-stripped one included**, so the prose was never what the
docs-blind arm lost.

**How the CLI degrades without the corpus** (measured 2026-09-18 against
`stripped-all-0.17.0-9284b1f`, recorded per tarball in the manifest's
`degradation`, which probes `pcg graphs`, `pcg nodes <type>` and `pcg agents`):

- `pcg nodes <type>` answers normally and exits 0; only its example list is
  gone. `readCorpusIndex` (`src/cli/corpus.ts`) never throws — a missing
  `docs/graphs.json` comes back as `available: false` with a note, because
  every caller but `pcg graphs` must still answer the question it was asked.
- `pcg graphs`, whose whole answer IS the corpus, exits 1 with a named cause
  and no stack trace. A coded failure, not a crash.
- `pcg agents` exits 1 the same way in a docs-stripped arm (it reads the
  shipped skill).
- `pcg --help`, `pcg nodes --json`, `validate`, `cook`, `inspect` and `render`
  are unaffected. Nothing an agent needs to AUTHOR a graph was removed — only
  what it could read to learn how.

## Calibration

`node evals/harness/run.mjs --campaign calibration` is an ordinary campaign
with one arm and one run per task: the same sandbox, adapter, scorer, resume,
usage-limit and contamination behaviour, the same `runs.jsonl` records. What
it adds is `calibration.md` — one row per task with solved, turns, tool calls,
wall minutes, output tokens, validate calls, caps hit and contamination — and
what it drops is the gate, because one run per task decides nothing about an
arm. A campaign counts as a calibration when its config sets
`"gate": { "mode": "calibration" }`, or simply when it has one arm and one run
per task.

`gate` is MERGED over the config defaults, so a stray `mode` key reaches every
campaign — and used to void the gate on a real one and print a per-task table
claiming to be one run of one arm over data that was three runs of three. The
mode is now honoured only when the campaign really is one arm at one run per
task, and refused as a config error (exit 2) otherwise. `loadConfig` raises it,
so `selftest.mjs` and `run.mjs` both stop before a slot is spent, and
`report.mjs` refuses again rather than print the false claim.

It exists because of how the pilot failed: 54/54 solved in every arm, six
tasks at the ceiling, nothing measured. Calibration answers "what does this
task cost" for each candidate task BEFORE 96 slots are spent on them. Read
turns and caps together with solved: a task solved in a handful of turns, with
no validate call and no probe graph, is one v2 will find saturated; a task
that burns the turn cap without producing a graph is at the floor.

## Effort, and how it is compared

The pilot's solved rate saturated while its process metrics kept varying, so
the report leads with BOTH. Per arm and per task, for turns, tool calls, wall
minutes, output tokens, validate calls and probe graphs:

- the **median** over runs, with p25–p75, not the mean — one run that hits its
  turn cap would otherwise move an arm on its own;
- the rates that are not per-run numbers: validate failure rate, what was read
  (`llms`/`docs`/`skills`/`graphs`), caps hit, graph-produced rate;
- a **paired-by-task** comparison against the first baseline arm: per task, the
  difference of the two arms' medians, and that difference as a fraction of the
  baseline's median (a threshold can be stated in fractions, since a task's turn
  count is set by the task);
- around the mean of those per-task values, a **95% percentile bootstrap over
  TASKS** (2000 resamples, seeded per `(arm, ref, metric, kind)` so re-running
  `report.mjs` on the same `runs.jsonl` prints the same interval AND the six
  metric rows are six independent draws — one shared seed draws the same task
  indices for every row, which makes six rows of one draw look like six views
  of the data) and an exact two-sided **sign test** on the per-task signs.

The tasks quoted beside a relative interval are the tasks that could
contribute one: a task whose reference median is 0 has no relative difference,
so it is in `tasks` but not in `relativeTasks`.

**Every effort figure is printed over the budget that run actually had** —
`83/100`, not `83`. A task's own `budgets` REPLACE the campaign `caps`, and a
campaign's `taskBudgets` replace those again, so the campaign cap is usually
not the number a run was measured against: 83 is comfortable under 100 and
truncated under 80, and the bare figure cannot tell you which. `report.budgets`
carries the per-task effective budget, taken from the records rather than the
config, and flags a task whose runs did not all share one.

`calibration.md` also warns when a task used more than two thirds of its
budget: an arm that legitimately costs more would then be TRUNCATED rather than
measured, and the gate would read the cap instead of the effect. That is why
`quarry-terraces` (83 of 100 in calibration, 20% spare — the only one of the
eight under 50%) is raised to 130 by `v2.taskBudgets`: the gate's own effort
threshold is +25%, which would have put a harder arm at ~104 and over the line.

**"Read" means a file was opened.** A bare `ls node_modules/pcg-ts/skills`
names what is there and reads none of it; it lands in `listedPaths`, not
`readPaths`, and does not count toward the read rate. A recursive CONTENT verb
(`grep -r x docs/`) does count, because it opens every file under the
directory. This mattered: the first calibration report put the skills-read rate
at 38% when one run of ten had opened a skill file and four had only listed the
directory. A statistic quoted as evidence has to mean what it says.

The bootstrap treats the tasks as the sample: it answers "would another set of
tasks like these show the same difference", which is the question a campaign of
a handful of tasks can ask. An interval spanning zero is a difference this
campaign cannot tell from noise. The A/A pair is the noise floor for effort
exactly as it is for solved — whatever separates the same tarball under two
labels is what run-to-run wobble looks like here. Contaminated and
infrastructure runs are excluded from effort exactly as they are from rates.

The report states this method in its own text, so a reader never has to open
the source to know what the interval is.

## The v2 gate, and why these thresholds

Fixed in `eval.config.json` before v2's first run, and printed in the report.
Arms: A and A-prime (the same baseline tarball — the noise floor),
candidate-U1, and stripped-all. Go iff all of:

- **(a)** the `stripped-all` arm is worse than its REFERENCE arm, on EITHER
  limb. The report says which fired (`gate.a.firedBy`).
  - **solved** — below the reference by more than the A/A gap and by at least
    `strippedMinMargin` = **0.17**; or
  - **effort** — needing at least `strippedEffortMinMargin` = **0.25** more
    `effortMetric` = **turns** than the reference (paired by task, as a
    fraction of it), by more than the A/A effort gap, with the bootstrap
    interval clear of zero (`effortCiMustExcludeZero`).
- **(b)** the A/A gap is at most `aaMaxGap` = **0.28** on solved AND at most
  `aaMaxEffortGap` = **0.15** on effort.
- **(c)** every task can DISCRIMINATE in the dimension limb (a) fired on.

**The reference is the tarball the stripped arm was CUT FROM**
(`gate.strippedRefArm`, here `candidate-U1`), not the baseline. `stripped-all`
is derived from candidate-U1 @9284b1f while A and A-prime are @0ad6998, and 19
shared non-doc entries differ byte-for-byte between those two tarballs —
`dist/index.js`, `dist/cli/index.js`, `package.json`, `README.md` and every
chunk. Against a baseline off another commit, limb (a) would measure "lost the
docs and the corpus" and "changed the library" as ONE effect. A strip arm
answers a question about the tarball it was cut from, so that is what it is
measured against; the A/A pair stays the noise floor, which is its job in (b)
and in the "more than the A/A gap" term of (a). Unset, the references are the
baselines — the pilot's rule, which was right there because its stripped arm
WAS cut from its baseline.

Both contrasts are printed in the report body, not only inside the gate:
`candidate-U1 vs A` says whether the U1 work helped, `stripped-all vs
candidate-U1` says whether these tasks can see documentation at all. Both are
already in the schedule, so computing only the first would throw the clean one
away for nothing.

**Limb (c) is dimension-aware.** It asks whether a task can tell the arms
apart in the dimension the verdict actually rests on:

| limb (a) fired on | (c) requires of every task |
|---|---|
| solved | not at floor or ceiling — pooled across all arms, AND across the reference arms on their own |
| effort | the arms differ on `effortMetric` by more than the A/A effort gap |
| nothing fired | the solved rule again — the gate stops anyway, and (c) is only advising |

The solved half checks the reference arms as well as the pool, because pooling
hides the case that matters most: references at 3/3 on every task with only the
stripped arm missing pools to 11/12 and passes — yet the contrast cannot move,
because its reference has no room to fall. Tasks caught that way are listed as
`at: "ceiling-in-reference"` / `"floor-in-reference"`, with the arms counted;
effort-flat ones as `at: "flat-in-effort"`.

The dimension matters because solved saturates. Calibration returned **10
solves in 10 attempts, 5 of them one-shot**, the cheapest at 23 turns — a
solved-only (c) would have failed on essentially every v2 task while the signal
we expect from a docs-stripped arm lives in effort. An 8/8-solved task that
costs the stripped arm 40% more turns is CARRYING the result, not blocking it.
Saturated tasks are still named in `replaceTasks` — they are worth swapping for
reserves later — but `blocking` is the list that actually stopped the gate, and
only tasks uninformative in the live dimension are on it.

When NOTHING fired, (c) deliberately does not ask about effort: the effort
floor is the MEASURED A/A gap, which is 0 whenever the two baselines happen to
share a median — common with small integer turn counts — and a floor of 0 would
call every non-identical task informative, passing (c) on a campaign the old
rule failed. Every task that blocks is also listed in `replaceTasks`, including
one whose effort simply could not be measured (`at: "no-effort-data"`), so the
report never proposes swapping sound tasks while keeping the one that stopped
the gate.

This was a **pre-registration change**, decided from calibration evidence and
committed before v2's first slot with zero v2 data in existence. It changes what
(c) MEANS; it changes no threshold. `gate.$limbCWhy` in the config records that.

**An absent, null or unmeasurable threshold never passes its check.** Two ways
that went wrong once: `strippedMinMargin ?? 0` made a MISSING margin the
easiest one to clear (with a zero A/A gap, one run of difference passed), and
`null + EPS` = 1e-9 made a null `aaMaxGap` pass only an exactly-zero gap —
which the pilot's happened to be. A limb with no threshold now has no opinion
rather than an automatic pass, and a threshold that is configured but cannot be
measured fails.

Why these numbers. `aaMaxGap` and `strippedMinMargin` are the pilot's,
unchanged: n per arm moves only from 18 to 24, so the noise argument below
still holds. The effort thresholds come from the pilot's own A/A pair — the
only measurement of run-to-run wobble there is — quoted in the statistic the
gate actually computes: the LARGER MAGNITUDE of the two directions of the
paired-by-task mean relative difference (larger, because a relative difference
is asymmetric, and the gate must not depend on the order of `baselineArms`):

| metric | what the gate uses (committed) | after the cwd correction |
|---|---|---|
| **turns** (the gate's metric) | **4.4%** | **4.4%** — unchanged |
| tool calls | 4.6% | 4.6% — unchanged |
| output tokens | 4.3% | **14.0%** |
| wall minutes | 9.6% | **13.5%** |

The second column is what those gaps become once the cross-call cwd fix clears
three pilot discards and the cleared attempts count instead of their retries
(see Known gaps). Turns and tool calls do not move at all; output tokens and
wall minutes do, and the widest gap goes from 9.6% to 14.0% against a 15%
bound. The gate's `effortMetric` is turns, so **no threshold is affected
whichever way the pilot records are finally settled** — only the headroom in
this justification. Stated on the metric the gate actually uses,
`aaMaxEffortGap` 0.15 is 3.4x the A/A turns gap and `strippedEffortMinMargin`
0.25 is 5.7x it.

`aaMaxEffortGap` = 0.15 sits above the widest of those and well above turns'
4.4%, so the pilot's own noise would have passed (b).
`strippedEffortMinMargin` = 0.25 is about 2.6x that widest A/A value. For
scale, the pilot's stripped arm came in at **+6.3% on turns paired against A,
95% [−17.1%, +29.7%]** — it would have failed both the margin and the interval
test, which is the right answer for an arm that still solved 18/18.
`effortMetric` is turns because it is what the cap is set on, it is an
integer, it does not move with machine load (wall minutes) or verbosity
(output tokens), and it was the quietest of the four across the A/A pair.

Two sharp edges the rule has to handle, and does. A relative difference is
asymmetric (130 is 30% above 100; 100 is 23% below 130), so the A/A effort gap
is the LARGER magnitude of the two directions — otherwise the order of
`gate.baselineArms` would decide (b). And `aaMaxEffortGap` is checked whenever
it is configured, with or without an effort limb; configured but unmeasurable
FAILS, as limb (a) does, because a check that could not be run has not passed.

On STOP the report says what to change, as the pilot's does: which limb
failed, and a `fix:` line naming the action (make the stripped arm cost
something — harder tasks, or a stronger strip set; shrink the A/A gap; replace
the floor/ceiling tasks from the reserve).

A gate that configures no effort thresholds is the pilot gate, unchanged:
limb (a) is the solved comparison alone and (b) checks the solved gap alone.
That is what `evals/results/pilot/` was measured against and what it still
reads as.

## The pilot gate, and why these thresholds

Pilot: 6 tasks x 3 runs x 3 arms (A, A-prime = the same baseline tarball,
stripped = the baseline without `llms.txt`, `docs/`, `skills/`) = 54 runs,
n = 18 per arm. Go iff all of:

- **(a)** the stripped arm's solved rate is below EACH baseline arm by more
  than the A/A gap, and by at least `gate.strippedMinMargin` = **0.17**
  (3 runs of 18);
- **(b)** the A/A gap is at most `gate.aaMaxGap` = **0.28** (5 runs of 18);
- **(c)** no task is at 0% or 100% solved pooled across all arms, or has
  no countable runs at all; those tasks are listed in the report, with a
  proposed replacement from the reserve tasks (reserve ids in order).

Rates are compared with a 1e-9 tolerance, so a stripped-arm gap exactly
equal to the A/A gap is a tie (not "more than"), which floating point would
otherwise decide at random.

Why. An arm's solved rate over 18 runs has a binomial SD of at most
sqrt(0.25/18) = 0.118, so the difference of two identical arms has an SD of
about 0.167 when every task sits at 50%, and about 0.145 when tasks spread
(0.2/0.5/0.8). 1.96 x 0.145 = 0.28: a healthy harness exceeds `aaMaxGap` by
chance only rarely, so a wider A/A gap points at drift, contamination or a
schedule bug rather than noise. The minimum margin exists because a zero A/A
gap is common at n = 18 and would otherwise let a one-run difference pass (a).

A Monte Carlo of the gate at this n (100-200k campaigns per scenario, seeded,
criterion (c) ignored) gave:

| scenario (per-task rates) | A/A gap > 0.28 | (a) passes |
|---|---|---|
| all 0.5, no docs effect | 6.5% | 4.1% (false go) |
| 0.2/0.5/0.8, no effect | 3.3% | 2.8% (false go) |
| 0.2/0.5/0.8, stripped -0.15 | 3.4% | 20% |
| 0.3/0.6/0.9, stripped -0.30 | 3.0% | 62% |
| all 0.5 vs 0.25 | 6.5% | 44% |
| all 0.6 vs 0.2 | 6.0% | 79% |

Lowering the margin to 0.11 raises the no-effect false-go rate to about 11%
for +10-20 points of power. The thresholds favour not proceeding on an eval
that cannot see documentation, at the price that a modest documentation
effect often reads as STOP; the gate failing twice after task replacement
wakes the owner, which is the right outcome for "the eval cannot see a
modest effect at this n". These are go/stop rules, not significance tests,
and ~50 runs per arm in later comparisons still detects only large effects.

## Records

`runs.jsonl`, one line per finished attempt; the last line per slot counts:
slot, task, tier, arm, attempt, final, tarball sha, model, CLI version,
budgets, outcome class, exit code, turns, tool calls by name, usage (tokens
and the cost-equivalent the CLI reports, which is not billed on a
subscription), caps hit, permission denials, contamination and outside
paths, reads of `llms.txt`/`docs`/`skills`/`graphs`/other package files,
network attempts, `pcg` subcommand counts and failures, files written, probe
graphs written, the score object, and the transcript and graph by path and
sha256. Held-out tasks appear by id only; no brief text or agent reply is
written to a committed file.

`report.json` carries, besides the solved summary and paired deltas:
`processMetrics` (the pilot's per-arm table, kept so old reports and new ones
read alike), `effort` (`byArm` and `cell[task][arm]`, every metric as
n/mean/median/p25/p75, plus the rates), `effortPaired` (one entry per non-
reference arm, every metric with per-task values, mean and median deltas,
relative mean, both bootstrap intervals, and the sign test), `effortRef`,
`effortMethod` (the method as prose), and `calibration` for a calibration
campaign.

## Caps

Per task `budgets.turns` and `budgets.wallMinutes` (config `caps` are the
defaults), plus `caps.outputTokens` = 250,000 output tokens (thinking
included) per session, enforced by killing the session from the stream.
The turn cap is the CLI's own `--max-turns`.

## Known gaps

- The effort level is left to the CLI default (`effort: null`); pin it in the
  config before a comparison of record if the default could move.
- The account e-mail reaches the session as a system reminder (see above).
- Held-out and corpus-adjacent tasks share one id namespace; a duplicate id
  across the two dirs is a config error.
- On a STOP with floor/ceiling tasks, the report PROPOSES the replacement;
  nothing writes the follow-up campaign into the config. Whoever continues
  (the unattended agent) adds it with `retryOf` set, which arms the
  "failed twice" wake.
- A selftest failure always wakes; telling a failure caused by a changed
  node (which the plan would log and move past) from a harness fault is not
  implemented.
- **Three pilot discards were classifier artifacts; two are now fixed and one
  is not.** Re-classified at this commit,
  the pilot has no ambiguous runs and one verdict moves —
  `r2.even-spacing.A a1` clears, having been discarded over its own
  `--out /tmp/out1.json` colliding with a stale same-named file in Temp. Three
  cleared with the cwd fix (`r1.trees-on-hills.A a1`,
  `r2.trees-on-hills.stripped a1`), and ONE stays contaminated:
  `r1.trees-on-hills.stripped a1` on `msys:/`, a JS regex literal inside
  `node -e` read as a filesystem root. That one is a different shape and is
  still open.

  What the two cleared ones cost, and what correcting them changes: three
  slots now count their first attempt instead of its retry — turns 60→59,
  68→52 and 28→30. The pilot's SOLVED conclusion does not move (18/18 in
  every arm, gate STOP, the same six tasks to replace), and neither does the
  turns median in any arm (34 / 34 / 33.5) nor the A/A gap on turns or tool
  calls. Output tokens and wall minutes DO move — see the threshold table
  above, which states both readings, and note that the gate's metric is turns.
- **A classifier fix does not rewrite records that are already written.**
  `readCounts` is computed when the transcript is parsed, so the committed
  calibration records still carry the old "a listing is a read" counts, and
  re-running `report.mjs` over them reprints the old rates (skills 38%). The
  corrected rates — llms 100%, docs 80%, graphs 70%, skills 10% — come from
  re-parsing the transcripts under `evals/runs/`, which are git-ignored and
  local. Likewise `listedPaths` is absent from every record written before
  this change, and the committed `calibration.md` predates the budget column
  and the headroom warning. A campaign's numbers belong to the classifier
  that produced them; to restate them under a new one, re-parse or re-run.
- A fixture that quotes an absolute epoch is a test that turns red on a date.
  Two `limits.test.mjs` cases did, on 2026-09-15, when the clock passed the
  `1789492800` they assert a reset time from: `classifySession` is right that a
  reset already in the past is no reset. They now pin `nowMs` before that
  epoch. Test files are outside the harness identity hash, so fixing one costs
  no campaign.
- The v2 work changed `selftest.mjs`, so the harness code hash changed, so
  `run.mjs --campaign pilot` now refuses to resume the pilot (exit 2,
  "campaign changed since it started"). That is the guard doing its job and
  nothing is stranded: the pilot's 54 slots are all final. Its committed
  records and report are untouched, and `report.mjs` — deliberately outside
  the identity hash — still reads them to the same STOP with the same counts
  (`report.test.mjs` asserts exactly that).
- A process the agent started in the background and detached from the
  session's tree can outlive the session on Windows; the launcher stops
  waiting for its pipes 30 s after the session exits.
- A sandbox install that fails during the START-UP selftest wakes the owner
  as a selftest failure (arms install offline from a local file, so this has
  not been seen); the same failure during a slot is retried as infrastructure.
- Off Windows, a stale agent process from a crashed runner is killed by pid
  without the start-time check.
