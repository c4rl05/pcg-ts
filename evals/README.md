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
| `evals/harness/pack.mjs` | build + pack a tarball with a manifest; derive the stripped arm | yes |
| `evals/harness/sandbox.mjs` | a temp consumer project per run (plus shared helpers) | yes |
| `evals/harness/agents/claude-code.mjs` | headless Claude Code adapter: isolation, caps, transcript parsing | yes |
| `evals/harness/limits.mjs` | usage-limit vs failure classification, reset parsing, backoff | yes |
| `evals/harness/selftest.mjs` | task validation, reference/negative scoring, brief lint, isolation probe | yes |
| `evals/harness/run.mjs` | the resumable campaign runner | yes |
| `evals/harness/report.mjs` | Wilson intervals, paired deltas, process metrics, the pilot gate | yes |
| `evals/harness/score.mjs`, `evals/lib/` | the scorer (separate unit; contract below) | yes |
| `evals/harness/fixtures/` | a trivial task, a stub scorer, a stub agent, a real transcript | yes |
| `evals/tasks/<id>/` | corpus-adjacent tasks | yes |
| `D:/Projects/JS/pcg-ts-private/evals/tasks/<id>/` | held-out tasks (briefs in a public repo end up in training data) | private repo |
| `evals/results/<campaign>/` | `manifest.json`, `runs.jsonl`, `discarded.jsonl`, `STATUS.json`, `selftest.json`, `report.{json,md}` | yes |
| `evals/tarballs/` | the tarballs themselves, referenced by absolute path from the config | **no** |
| `evals/runs/<campaign>/<slot>-a<attempt>/` | transcripts, the agent's graph and workspace | **no** |

## Commands

```sh
node evals/harness/pack.mjs --from-repo --label candidate-u1     # build + pack the current tree
node evals/harness/pack.mjs --strip-docs evals/tarballs/baseline-0.17.0-0ad6998.tgz
node evals/harness/selftest.mjs --campaign pilot                 # exit 0 pass, 1 fail, 2 config
node evals/harness/run.mjs --campaign pilot                      # exit 0 done, 10 wake owner, 2 config, 1 crash
node evals/harness/run.mjs --campaign pilot --dry-run            # print the schedule, spend nothing
node evals/harness/report.mjs --campaign pilot
node --test --test-concurrency=1 "evals/harness/*.test.mjs"      # the harness' own tests (~90 s)
```

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
- `task.json` = `{ id, tier: "corpus-adjacent"|"held-out", title, outputs: [{ name, kind }], seeds: number[], budgets: { turns, wallMinutes }, checks: [{ id, hard, description }], reserve? }`.
  `id` must equal the directory name. `reserve: true` tasks are not in a
  `"non-reserve"` selection; the gate swaps them in for floor/ceiling tasks.
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

1. `sandbox.mjs` makes `<os temp>/pcg-eval-XXXX/project/`, refuses if any
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
2. The adapter launches `claude -p` with the campaign prompt on stdin (the
   prompt is in the config, hashed into the manifest, and names neither
   docs nor the CLI).
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

The probe's clean session runs in a sandbox with the first arm's package
installed, as a real run does (the recorded evidence above predates that
and ran in an empty jail; the adapter changed since, so the pilot's first
start re-probes). It re-runs whenever the CLI version, the adapter file, the
probe prompt, the model, or this machine's own configuration (user
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
script the agent writes (`.sh .ps1 .js .mjs .cjs .ts .py ...`) is resolved.
Tokens are taken quote-aware (so `"C:/Program Files/x"` stays whole) and
fine-grained (so `readFileSync('../../x')` inside `node -e "..."` surfaces).
Path-shaped means: absolute (Windows, Git Bash `/c/`, POSIX, the root `/`),
`~` at the start of a token, an environment variable at the start of a token
(`$HOME`, `${USERPROFILE}`, `$LOCALAPPDATA`, `%APPDATA%`, `$env:TEMP`, ...),
a `..` segment anywhere, or a reference into `node_modules`. Paths outside
the project are classified: benign (devices, OS and toolchain dirs, the node
binary's dir, the harness jail, Temp entries the session created itself, a
bare listing of the Temp root) or contaminating (everything else:
repositories, the home directory, the npm cache that holds unstripped copies
of the package, other sandboxes). Commands that fetch from outside the machine
or read the npm cache are contaminating too: `curl`/`wget`/`Invoke-WebRequest`,
`git clone/fetch`, `npm view/info/pack/cache/config get`, `npm install <pkg>`,
`npx <anything but pcg>`, and so on; a bare `npm install` (which reinstalls
`file:../pcg-ts.tgz`) is not. Shell commands are judged clause by clause (split at `&&`, `||`, `;`, `|`,
newlines). A listing of the Temp root is benign; a clause that reads contents
or moves the shell (`grep -r`, `find`, `ls -R`, `rg`, `tree`, `cd`, the Grep
tool, a Glob with `**`, any path a written script names) aimed at it is not,
and a bare `cd` counts as reaching the home directory. In code files
(`.js .mjs .cjs .ts .py`) only string literals are scanned, so comments,
regex literals and division are not paths; in shell scripts comment lines are
dropped. A token starting with `/` is a path only when it names a known root
(`/tmp`, `/usr`, `/home`, `/c/`, ...) or is the root itself, never `//`. A
contaminating run is recorded `contaminated: true, final: false` and the slot
re-runs once. The heuristic
cannot follow a `cd` into a relative path (the `cd` target itself is caught),
nor a path assembled at runtime from pieces.

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
  infrastructure failing > 12 h (added: an outage the plan's list did not
  cover, which would otherwise burn the schedule or loop forever), and pilot
  gate failed twice after task replacement (a campaign whose config names
  the failed one as `retryOf`). The rest is logged and the queue moves on.

## The schedule

Rounds by run index (every task gets run 0 before any gets run 1, so drift
over a long campaign lands on every task alike); task order shuffled per
round; arm order shuffled within each (task, run) block. mulberry32 seeded
by `scheduleSeed`; the whole schedule is written into the manifest.

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
- A process the agent started in the background and detached from the
  session's tree can outlive the session on Windows; the launcher stops
  waiting for its pipes 30 s after the session exits.
- A sandbox install that fails during the START-UP selftest wakes the owner
  as a selftest failure (arms install offline from a local file, so this has
  not been seen); the same failure during a slot is retried as infrastructure.
- Off Windows, a stale agent process from a crashed runner is killed by pid
  without the start-time check.
