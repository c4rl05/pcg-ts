# Agent readiness — a library no model was trained on

Opened 2026-09-15, at `main` @ `4228032`, npm `latest` 0.17.0. Not started.

This follows `PLAN-agent-authoring.md`, the 2026-08-17 blind-authoring
friction log. That log fixed what one agent tripped over. This plan starts
from the other end: what published practice and measurement say a library
has to give an agent that has never seen it, checked against what PCG-TS
ships today.

**The short version.** PCG-TS already has most of the substance: complete
registry metadata, a CLI that covers validate → cook → inspect → render,
strict load-time validation, 95 described graphs, and llms.txt plus three
skills inside the npm package. What is missing is the first minute and the
last one. Nothing tells an agent in a consumer project that this library
is new and where in `node_modules` to read, and nothing lets it see what it
made. Between the two, errors are prose, stop at the first fault, and the
types drop the registry's docs.

**The rule for this plan: measure before and after.** Units U1–U6 are
ranked by argument. U7 turns that into measurement, and U0 — capturing
today's tarball — is the one step that cannot be done later.

---

## Evidence this plan leans on

Each item was checked against its primary source on 2026-09-15.

- **An always-loaded pointer beats docs the agent must choose to fetch.**
  Vercel's eval on Next.js 16 APIs absent from training data: no docs 53%,
  a skill 53% (never invoked in 56% of cases), a skill plus an explicit
  instruction 79%, an ~8 KB docs index in AGENTS.md 100%.
  <https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals>
  Next.js 16.2 ships its docs as Markdown in `node_modules/next/dist/docs/`,
  and from 16.3 `next dev` maintains a marker-bounded AGENTS.md block that
  says training data is stale and where to read.
  <https://nextjs.org/blog/next-16-3-ai-improvements>
- **Claude Code reads CLAUDE.md, not AGENTS.md.** The documented pattern is
  a CLAUDE.md that imports `@AGENTS.md`.
  <https://code.claude.com/docs/en/memory>
- **Examples carry documentation.** API docs in context improved results on
  less-common libraries by 83–220%, and example code contributed the most,
  more than descriptions or parameter lists. Models also copy mismatched
  examples. <https://arxiv.org/abs/2503.15231> Usage examples raised
  accuracy on complex tool parameters from 72% to 90%.
  <https://www.anthropic.com/engineering/advanced-tool-use>
- **Context files help with instructions, not overviews.** No general gain
  in task success, over 20% more cost; instructions were followed,
  repository overviews did not help. <https://arxiv.org/abs/2602.11988>
- **Skills belong in the package, with a staleness gate.** TanStack Intent
  ships skills with npm packages and fails CI when one drifts from its
  sources. <https://tanstack.com/blog/from-docs-to-agents>
- **llms.txt is only useful when linked.** 97% of ~38,000 domains with a
  valid file got no requests for it in May 2026.
  <https://ahrefs.com/blog/llmstxt-study/>
- **Agent-facing CLI conventions** (cited, not re-checked at source): JSON
  errors with a code and a fix, distinct exit codes, a schema command, hard
  failure on unknown input with a suggested correction, bounded output,
  additive-only JSON contracts.
  <https://blog.arcjet.com/designing-a-cli-for-ai-agents/>,
  <https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/>,
  <https://clig.dev/>

Nothing in the evidence argues for revisiting the CLI-instead-of-MCP
decision.

---

## Starting point, measured

Measured by running the built CLI, `npm pack --dry-run` and scripts over
`dist/` and `src/`; the facts marked † were re-derived by a second agent
that was given the questions, not the answers.

| Surface | Today |
|---|---|
| Entry point | No AGENTS.md in repo or tarball †. `llms.txt` is 223,660 bytes with no short index †; 404 at the Pages root, which serves `docs/` †. Skills ship in `skills/`; only README (206) and `llms.txt` (2497–2518) point at them, and nothing an agent loads automatically does |
| Examples | `docs/nodes.md` has no link into `graphs/`; `pcg nodes <type>` shows no example; `docs/graphs.json` already records `nodeTypes` per graph. `pcg run <name> --help` is static and omits the primitive's params |
| Errors | `validate` stops at the first error †. `--json` failures print text on stderr, stdout empty, exit 1 †. No did-you-mean on the JSON path †; one exists in `src/fields/fieldText.ts` (269–295). Only `NodeExecutionError.nodeId` is structured; the worker protocol carries name, message and `nodeId` (`src/worker/protocol.ts:329–337`) |
| Validation | An unconnected required pin passes `validate` and fails at cook †. `PinDef` is `{ name, kind, multi? }`. No unreachable-node warning. A field's missing attribute reads `attribute "x" not found`, no domain, param or list (`src/data/attribute.ts:316–318`) |
| Types | `dist/index.d.ts`: 56 `*Params` interfaces, 285 fields, 2 with JSDoc †. (`src/` has 57 — the extra is `PortalParams`; the U3a gate replaces these numbers.) 56 enum params typed `string`. `Graph.connect` pins are `string`; `.connect(` appears 846 times |
| Schema | No JSON Schema; the format lives in prose, TS types and the closed-key validator in `deserializeGraph` |
| Seeing | `pcg render` is a top-down SVG only †, meshes as outline wireframe; PNG from three poses only via `scripts/preview.mjs` (browser). `cook --json` differs between identical runs in `elapsedMs` only †. `inspect` has min/max/mean/non-finite, no spread or grouping |
| Measurement | One blind-authoring log; no scored, repeatable eval |

---

## U0 — Capture the baseline tarball (S, do first)

`npm run build`, then `npm pack` at the commit before any unit below lands,
stored with a manifest `{ sha256, version, gitSha, dirty }`. Rebuilding an
old commit later is not assumed to reproduce the same bytes, and once U1–U6
land their effect can never be measured without this file.

Store it under `evals/tarballs/` (git-ignored) and copy it to the private
repo, so a clean checkout does not lose it.

**Consequence for every later unit:** the eval runs arms built from this
tarball, so U7's scorer may use only what 0.17.0 already exports — no
`--fingerprint`, no PNG render, no diagnostics. See U7.

---

## U1 — Agent entry point (M)

An agent in a consumer repo always has a short, current set
of instructions: its training data is wrong for this library, and here is
where the installed version's docs, CLI lookups and skills are.

**Design**

1. `src/cli/agentRules.ts`, pure, no I/O:
   `renderAgentBlock(data)`, `renderLlmsIndex(data, base: "package" | "site")`,
   `applyManagedBlock(existing, block) → { text, changed }`. `src/docs`
   re-exports it for the generators. Block content, in order:
   1. header: version, and "managed — `npx pcg agents --write` regenerates;
      edits inside the markers are overwritten";
   2. three or four imperative lines: pre-alpha, APIs change per release,
      training data is likely wrong, read the installed docs before writing
      code or graph JSON, never guess a node, param or pin name;
   3. read first: `docs/llms-full.txt`, `docs/authoring.md`;
   4. look up one entry at a time: `pcg nodes <type>`, `pcg fields <fn>`,
      `pcg run <name> --help`, and `pcg graphs --node <type>` once U2 lands;
   5. the loop line, taken from the top-level help;
   6. each skill's path with its frontmatter `description` as the trigger;
   7. a compact name index of node types by category, field fns, and
      primitives by family (~2.5 KB).
   Estimated 5–6 KB; a test holds it to 8,192 bytes. Every path in the
   block is the literal `node_modules/pcg-ts/<rel>`, never absolute and
   never cwd-relative, so `--check` gives the same answer on every machine
   and from every directory; `packagePath` (below) is used only to READ
   shipped files.
2. `pcg agents`: prints the block by default. `--write` updates the block
   between `<!-- BEGIN:pcg-ts-agent-rules -->` / `<!-- END:… -->` in
   `AGENTS.md` (or `--file`), leaving every byte outside the markers alone,
   CRLF included. `--check` exits 1 when the block is missing or stale, for
   consumers' own CI, and its message names `npx pcg agents --write`.
   `--claude` with `--write` also ensures `CLAUDE.md` contains `@AGENTS.md`;
   without it, an existing CLAUDE.md lacking the import gets a one-line
   hint. Malformed markers exit 1 naming the line. ENOENT counts as empty;
   any other read error is re-thrown, never overwritten. **No postinstall.**
3. `CliIo.packagePath?(rel)`, optional so outside `CliIo` implementers do
   not break. `makeNodeIo` walks up from `import.meta.url` to the
   `package.json` whose `name` is `pcg-ts`, which survives tsup moving the
   module into a chunk. Fallback text: `node_modules/pcg-ts/<rel>`; `--help`
   says that is wrong under Yarn PnP. U2 uses the same helper.
4. llms split, to the llmstxt.org convention: `git mv llms.txt
   docs/llms-full.txt` (content unchanged, now served on Pages); generate
   root `llms.txt` (package-relative links) and `docs/llms.txt` (site URLs
   for `docs/*`, raw GitHub URLs for `skills/` and `graphs/`, which Pages
   does not serve) with `scripts/gen-llms-index.mjs` in the `npm run docs`
   chain. About 15 references move: `src/docs/llms.ts` (`LLMS_TXT`),
   `llms.test.ts`, `COUNT_CLAIMS` in `site.ts`, `documentedGraphs.test.ts`,
   `handAuthored.test.ts`, `site.test.ts`, README, `docs/manual.html`,
   `docs/index.html`, both skills, `package.json` `files`.
5. `docs/index.html` links the index and carries
   `<link rel="alternate" type="text/plain" href="llms.txt">`.
6. **CI gate widening.** `git diff --exit-code -- docs` misses untracked
   files and anything outside `docs/`. Check
   `git status --porcelain -- docs llms.txt` is empty instead.

**Gates.** Block applied twice is byte-identical; outside-marker bytes
preserved; malformed markers refused; `--check` 0/1; size ≤ 8,192 bytes,
measured on the live registry, with the failure listing the largest
sections; committed `llms.txt` and `docs/llms.txt` match a fresh render;
every path the block names exists and is covered by `files`
(`tests/packaging.test.ts`); every `pcg <cmd>` it names is in `COMMANDS`;
`scripts/smoke-dist.mjs` runs `agents` from `dist/` in a fresh process.

**Risks.** Size creep as node types grow — the test forces the call.
Upgrades make `--check` fail, which is intended. The instruction text
shapes behaviour, so it is reviewed as carefully as code.

---

## U2 — Examples one step from every node (M)

From any node type or primitive, a corpus graph that uses
it is one command or one link away, and `pcg run <name> --help` shows what
can be set.

**Design**

1. `src/cli/corpus.ts`, pure: `rankExamples(entries, pred)` — `basics-`
   first, then fewest distinct node types, then file name (deterministic;
   keeps a 61-graph type like `setAttribute` from pointing at the densest
   graph). `readCorpusIndex(io)` reads `docs/graphs.json` through
   `packagePath`, so paths always match the installed version.
2. `pcg nodes <type>`: an `examples (N)` section with up to five
   `path — title` lines and `all N: pcg graphs --node <type>`, plus
   `usage (from <top example>)` — the node's own JSON object from that
   graph, cut at ~20 lines. JSON gains `examples` and `usage`. A missing
   index prints one line and still exits 0.
3. `pcg graphs [--node t] [--primitive p] [--tag x]`, AND-combined. An
   unknown node type gets the registry error; an unknown tag lists the
   valid tags.
4. `Command.help?(args, io)` hook in `runCli`; `run` uses it to append the
   primitive's exposed params (same `paramRow` as `pcg nodes`), its pins,
   graphs that reference it, and an example `--param k=<default>` line.
5. `docs/nodes.md` and `docs/primitives.md` get an Examples line per entry;
   `nodes.json` stays pure registry data.

**Gates.** `pcg graphs --node pathShift` returns exactly the index's set;
`run <primitive> --help` shows every exposed param; coverage test — every
registered node type except `dataInput` (items never serialize) appears in
at least one corpus graph, true today. Primitives are not gated: 19 of 37
have no corpus graph and already carry a `pcg run` line.

**Risks.** `nodes.md` grows ~25 KB, and graph edits now make it stale —
which CI's docs diff catches. `nodes <type> --json` changes shape.

---

## U3 — Types carry the registry's docs (L, two commits)

A hover in an editor, or an agent reading the d.ts in
`node_modules`, gets each param's description, default, range and field
capability. The registry schema stays the only authored copy.

**U3a — generated param interfaces, types unchanged (M).**
`src/docs/paramTypes.ts` renders `src/nodes/params.generated.ts`: one
`export interface <Pascal>Params` per registered type WITH params, from the
mapping the schemas already follow (string → `string`, enum → `string`,
f32/vec3 with a field →
`FieldParam`, vec3 → `readonly number[]`, integers and f32 → `number`, bool
→ `boolean`, stringList → `readonly string[]` — the one widening, on 6
fields — numberList → `readonly number[]`, items → `readonly DataItem[]`).
Each field's JSDoc: full description, `@defaultValue`, range, enum values,
"Accepts a field." `*/` and a leading `@` are escaped. Zero-param types
generate `type XParams = Record<string, never>` aliases, and only for names
that exist today (`MergePointsParams`, `MergePrimitivesParams`): an EMPTY
INTERFACE would accept anything, and new `SubgraphParams` / `ForEachParams`
names would grow the root surface for nothing. `PortalParams` stays as it
is. Hand-written interfaces are deleted; node modules `import type` and
re-export, so root names are unchanged (`publicTypeSurface.test.ts` proves
it) apart from the new `RepeatUntilParams`. U3a does not touch
`src/nodes/serialize.ts`; if an import there must change, U3a lands before
U4's class work starts.

The writer is a vitest file snapshot
(`toMatchFileSnapshot("../nodes/params.generated.ts")`, updated by
`npm run docs:types` = `vitest run src/docs/paramTypes.test.ts -u`), not a
dist-reading script like the other generators: once a schema gains a
param, `tsc` — and so tsup's d.ts build — fails until the file is
regenerated, and vitest runs from source without type checking. CI does
not write snapshots, so drift fails.

**But CI runs build → check → test**, so drift that breaks types fails
first in tsup's d.ts step, with no hint. Fix: a `prebuild` script that runs
only `vitest run src/docs/paramTypes.test.ts`, so the first failure anyone
sees — locally or in CI — is the snapshot mismatch, and its message names
`npm run docs:types`.

Generated TypeScript under `src/` is new for this repo: say so in the file
header and in CLAUDE.md's Layout.

**U3b — stricter types (M/L), a separate commit.** Enum params become
literal unions. `PinDef<N>`, `NodeDef<P, I, O>`, `NodeSpec`, `standardNode`
and `NodeHandle` gain pin-name type parameters defaulting to `string`;
`connect`, `disconnect` and `output` take `OutPin<A>` / `InPin<B>` derived
through a conditional type — not `NoInfer`, so consumers below TypeScript
5.4 still compile, and not plain inference, which widens to a union and
accepts typos. Generated `XInputs` / `XOutputs` stay internal. Third-party
defs, subgraph defs and deserialized handles keep `string`.

**Gates.** Snapshot drift; every registered param is a field with non-empty
JSDoc (replaces the "2 of 285" number); `npm run check` compiles every call
site; a tsc-checked type test with `@ts-expect-error` on a misspelled pin
and a bad enum literal, and an untyped handle still accepting `string`;
`smoke-dist.mjs` greps a known description in `dist/*.d.ts`.

**Risks.** d.ts grows ~250 KB with full descriptions (165 KB today). U3b
will surface real mismatches across the editor and demos, and conditional
pin types can give poor error text for unions of handles — measure on the
editor before committing.

---

## U4 — Structured, complete errors (L)

Every failure reaches an agent as a list of records with a
stable code, a location and machine-readable alternatives, and every
load-time fault arrives in one run. Text output still names the node, pin
or param and the fix.

**Design**

1. **`src/diagnostics/`**, a core leaf module that imports nothing, added to
   CLAUDE.md's Layout. Its types and `DIAGNOSTIC_CODES` are root exports
   (D10); the suggester stays internal.
   - `Diagnostic { code; severity: "error" | "warning"; message; path?
     (RFC 6901 pointer into the document); nodeId?; nodePath?; pin?;
     param?; key?; got?; valid?; expected?; didYouMean?; fix? }`.
   - `DIAGNOSTIC_CODES`: code → one-line description, the single source for
     the docs, additive-only — codes are never renamed or removed. First
     cut covers document shape, keys, nodes, fields, subgraphs, graph
     params, connections and outputs, the new checks
     (`required-pin-unconnected`, `node-unreachable`, `no-outputs`,
     `stranded-graph-param-value`), cook (`node-execution-failed`,
     `attribute-not-found`, `cook-cancelled`) and CLI (`usage`,
     `unknown-command`, `file-unreadable`, `unknown-output`).
   - `suggest.ts`: `editDistance` and `closestNames(name, candidates, 3)`
     extracted from `fieldText.ts:285`, with ties broken by code-unit order
     instead of `localeCompare`, so suggestions are deterministic.
   - `diagnosticsOf(err)` for any thrown value.
2. **Error classes** gain `readonly diagnostics`. `NodeExecutionError` takes
   the cause's code when classified and builds `nodePath` from nested
   executions. `src/worker/protocol.ts` carries name, message and `nodeId`
   today (329–337); `encodeError` / `decodeError` must also carry
   `diagnostics`.
3. **Collect-all in `src/nodes/serialize.ts`** — the L item, exclusive
   owner. `deserializeGraphRec` throws on the first of ~95 `fail()` sites
   today. `fail(message)` becomes `fail(record)`; each unit (graph param,
   node, individual param, connection, output, target) is wrapped. Fatal
   only when the document shape blocks everything (not an object, bad
   `formatVersion`, `nodes` not an array). A node with bad params is added
   with them dropped, so connections to it are still checked; a node that
   cannot be built is poisoned, and anything naming it is skipped silently.
   Inside one field expression it stays first-error (`fieldJson.ts` has
   ~67 `fail` calls and 11 `throw`s of its own). **Order is phase order,
   then document order** — so the first record is the fault today's loader
   throws on, and its message is today's apart from the inserted
   did-you-mean clause. Capped at 100
   records plus a `truncated` record. `deserializeGraph` keeps its
   signature and throws one `GraphSerializationError` whose message joins
   all records; new `checkSerializedGraph(json) → { graph?, errors,
   warnings }` runs the load and, if clean, `diagnoseGraph`.
4. **Did you mean**, suggestion only, the input is still refused: node
   types, params, pins, node ids, keys, field fns and keys, subgraph names,
   enum values, attribute names, CLI commands and flags. The suggestion
   goes before the long valid list. `fix` is set only when mechanical.
5. **Required pins and reachability.** `PinDef.optional?: boolean`; 59
   input pins exist across 61 types, all geometry, and exactly 4 are
   genuinely optional (`meshFromField.in`, `volumeSample.in`,
   `mergePoints.in`, `mergePrimitives.in`). `PinInfo.required` is always
   present, copied through `subgraph.ts:896`, `forEach.ts:191` and
   `repeatUntil.ts:415`, and shown by `pcg nodes`. **Wrapper pins need an
   explicit rule, not a blind copy:** `forEach.ts:191` rebuilds the
   iterated pin, and an unconnected iterated pin cooks today to empty
   outputs (`planIterations([])` does not throw) — so it is `optional`, and
   a subgraph's exposed pin is required only when leaving it unconnected
   throws at cook. The registry cross-check below covers the three wrapper
   types, so the rule is measured rather than asserted. New
   `src/nodes/diagnose.ts` `diagnoseGraph(graph)` — a reverse walk from
   declared outputs: an unconnected required pin on a reachable node is an
   error; an unreachable node is a warning; no outputs at all is one
   warning; recurses into inline subgraph bodies (portal connections count
   as satisfied), not `ref` recipes; folds `strandedGraphParamValues` in as
   warnings. It runs **outside** `deserializeGraph`, because the editor
   loads half-built graphs. The corpus has zero violations of either check
   today — 95 graphs and 152 bodies, of which 9 are inline and the rest
   primitive bodies reached through `ref` — so both start strict.
   `diagnoseGraph` recurses only into inline bodies; primitive bodies are
   held by the gate that loads all 37 primitives clean.
6. **Missing attributes.** `AttributeNotFoundError` in `src/data`
   `{ name, domain, available, foundOn, didYouMean }`, thrown from a helper
   used at `src/fields/inputs.ts:77,165,309`. `resolveOn`
   (`src/nodes/util.ts:234`) already receives the node type and param and
   prefixes them; `resolveOnAllowingNonFinite` (292) gains the same
   optional arguments — ~33 call sites between them. Target message:
   `point attribute "height" not found; available point attributes: P,
   seed; "height" exists on the detail domain — a point field cannot read
   a detail attribute; promote it first with promoteAttribute`. The GPU
   path declines on a missing attribute and the CPU path throws, so the
   CPU seam is the one place to fix. The ~9 hand-rolled node messages may
   move onto the same helper.
7. **CLI envelope** (`src/cli/index.ts`, `graphSource.ts`, `commands.ts`,
   `errors.ts`). With `--json`, every failure prints
   `{ ok: false, command, exitCode, errors, warnings }` on stdout —
   including parse failures, detected from raw argv. stderr stays text, but
   it is NOT unchanged: messages gain did-you-mean clauses, multi-error
   loads print several lines, and an invalid document exits 3 where help
   documents 1 today (D7) — the help text changes with it.
   `validate --json` gains `warnings` and
   `--strict`. `cook`, `inspect` and `render` run the checks on the part of
   the graph they will cook and fail fast; nothing that cooks today is
   newly refused.

**Gates.** A table of producers, one per code, asserting the code, that
`path` resolves in the input and that node/param/pin are set where they
apply — and every code in `DIAGNOSTIC_CODES` has a producer. Three
independent faults give three records in phase order, deep-equal across
runs, the first being the fault today's loader stops at. Nothing follows a
poisoned node. A registry cross-check cooks each type — `subgraph`,
`forEach` and `repeatUntil` included — with only one input unconnected:
required pins must throw naming the pin, optional ones must not. Corpus
and all 37 primitives load with zero errors and zero warnings. Worker round
trip keeps `diagnostics`. CPU/GPU parity tests (`residentRuns.test.ts`)
still pass. CLI stdout parses as JSON on every failure class.

**Breaks, named — and each lands in the commit that causes it**, because
CI diffs `docs` and runs the transcript tests on every commit. About 30
assertions quote list fragments (`registered types:`, `; valid fns`) and
change with did-you-mean. `ERROR_TRANSCRIPTS` in `site.ts` feeds real
mistakes to the live library and compares the whole message
(`site.test.ts:1176`) — its unknown type `"pointScatterInBox"` will gain a
suggestion — so the transcripts and `docs/manual.html` chapter 11 move in
the same commit as the did-you-mean change, and `docs/nodes.*` regenerate
in the same commit that adds `PinInfo.required`. Multi-error messages become multi-line; the editor shows them
verbatim (`editor/controller.ts:740`) and needs a look. Required-by-default
pins turn missing flags on third-party nodes into validate errors (lint
only). `docs/nodes.*` regenerate with `required`. New root exports go into
`publicSurface.test.ts`.

**Sequencing inside U4.** Suggester, then record/codes/classes (this fixes
the interface). Then in parallel over disjoint files: required pins +
`diagnoseGraph`; missing attribute; U5's generator. Then collect-all in
`serialize.ts`. Then the CLI envelope.

---

## U5 — JSON Schema, `pcg schema`, `$schema` (M)

An agent or editor can validate and autocomplete a graph
file without running the loader. The schema comes from the registries, so
it cannot drift, and the loader stays the authority.

**Design**

1. `src/nodes/graphSchema.ts` `graphJsonSchema({ descriptions?, nodeType? })`,
   draft 2020-12, keys sorted for deterministic bytes. Closed graph object;
   `node.type` enum of registered types with one `if/then` per type
   selecting a closed `params` object; param types from the **same mapping
   table U3a uses**, which therefore lives in `src/nodes` (docs may import
   nodes, not the reverse); `acceptsField` params become
   `anyOf: [literal, fieldSpec]`. Connections, outputs, graph params, meta
   closed.
   **Wrapper nodes are the hard case.** `subgraph` and `forEach` register
   zero params, yet 113 corpus nodes carry params on them (110
   `subgraph` + `ref`, 2 inline `subgraph`, 1 `forEach`) — a closed object
   per registered type would reject the corpus. Wrappers take exactly one
   of `subgraph` or `ref`; a `ref` node gets one `if/then` per registered
   primitive name, closing `params` over that primitive's exposed params
   (the same derivation `pcg run --help` uses in U2); an inline body's
   params stay open, since they are declared inside the payload the schema
   cannot cross-reference; `repeatUntil`'s own two params are typed.
2. Field grammar: `fieldSpec` requires `fn` (enum of 64) with one closed
   object per fn; fixed arity as `minItems = maxItems`, `vec` variadic.
   Types of the 14 non-`args` keys come from a table with a completeness
   test over `listFieldFnInfos()`. Out of scope, stated in `$comment`:
   finiteness, the −0 refusal, nesting depth, broadcast rules, bindings,
   id and pin cross-references.
3. `pcg schema [graph|field|diagnostic] [--node <type>] [--compact]`;
   `diagnostic` prints the record schema and `DIAGNOSTIC_CODES`.
4. `$schema` accepted at the top level only, a string; refused in nested
   payloads with a message saying where it belongs. The loader ignores it,
   `serializeGraph` never writes it, so hashes, goldens and round trips are
   untouched. Corpus files do not gain it in this unit.
5. `scripts/gen-graph-schema.mjs` writes `docs/graph.schema.json` in the
   docs chain and `files`, `$id`
   `https://c4rl05.github.io/pcg-ts/graph.schema.json`.

**Gates.** Valid against the 2020-12 meta-schema; all corpus graphs pass,
the 113 wrapper nodes included; a misspelled param on a `ref` node is
rejected by both schema and loader;
an agreement table where the schema and `deserializeGraph` both reject
unknown type, unknown param, bad enum, unknown fn, extra key, wrong arity,
bad vec length, and both accept every type at default params — so the
schema is never stricter than the loader; byte-identical generation;
drift gate; `$schema` accept/refuse with the content hash unchanged.

---

## U6 — Let an agent see what it made (L overall)

This matters more here than for most libraries: the parked
forest demo passed its numeric checks and failed at eye level.

### U6a — PNG frames from the shipped CLI (L)

`scripts/preview.mjs` is a repo script because three.js needs a real
browser, and a published bin would carry Chromium or throw for everyone
else. A small software rasterizer has neither problem. The split stays:
the CLI frame answers placement and shape with unlit proxies; the look is
the host's and `npm run preview`'s.

- `src/cli/raster/views.ts`, pure: `top` (orthographic, same orientation as
  the SVG), `side` (orthographic, x right, y up), `hero` and `ground`
  (perspective, the preview's poses: extent ladder, snapping to extent/128,
  fov 50 as a literal focal constant). `ground` finds eye height by casting
  down onto faces — **the preview once stood its ground camera underground
  on relief because eye height came from the bounding-box minimum; the test
  is a terrain with relief.** `preview/main.ts` CANNOT import these through
  `pcg-ts/cli`: that entry re-exports `makeNodeIo`, which imports `node:fs`
  at top level, and the browser build breaks. Instead extract the
  preview's pose math into a pure `preview/poses.ts` and gate the two with
  a parity test over a sweep of extents and centres.
  `quantizeExtent` and `snap` use `Math.log10`, `pow`, `floor` and `round`
  today; the CLI copy walks the extent ladder with `×10` / `÷10` instead,
  which IEEE correctly rounds on every platform.
- `src/cli/raster/raster.ts`: 2× supersampled RGB + depth, box-filtered;
  edge-function triangles with a top-left rule, near-plane clipping, DDA
  lines, square point splats, linear fog and a ground grid in the
  perspective views. Arithmetic is `+ − × ÷` and `sqrt` plus the exact
  operations `floor`, `ceil`, `round`, `trunc`, `abs`, `min`, `max`,
  `fround`; a test scans `views.ts`, `raster.ts` and `scene.ts` against
  that allowlist (no `sin`, `cos`, `tan`, `pow`, `exp`, `log*`, `atan*`,
  `hypot`), so the bytes are platform-independent.
- `src/cli/raster/scene.ts`: `poly` fan-triangulated exactly as
  `src/three/convert.ts` does (a concave face draws as a host would draw
  it), flat two-sided Lambert; `polyline` as lines; points only for
  geometry without topology unless `--points`; instances as upright
  pyramid proxies through their full 4×4, coloured by asset id; device
  batches counted, not drawn. Colours are categorical by output name —
  never read from `color`. `--attr` reuses the SVG colorizer, refactored
  to return RGB with the SVG bytes unchanged.
- `src/cli/raster/deflate.ts` (fixed-Huffman, greedy LZ77, adler32) and
  `png.ts` (IHDR, one IDAT, IEND, CRC32, Sub filter, no tEXt or tIME).
  Not `node:zlib`: its output is tied to the bundled zlib build, which is
  not specified stable across versions (inference; a pinned-hash test on
  the Node 20/22 matrix would settle it), and it would make the module
  Node-only.
- `pcg render`: the format follows the `--out` extension, `.svg` or `.png`;
  anything else exits 2. PNG to stdout is refused. `--view
  top|side|hero|ground|sheet` (default `sheet`, all four tiled, ≤ 1280 px on
  the long edge; SVG accepts only `top` and says why), `--size`, `--extent`,
  `--eye`, `--points`. The report carries poses and framing, and flags when
  framing moved against a pinned `--extent`. `CliIo.writeBytes?` is
  optional; its absence is a named CliError. `renderPng` is not exported
  in v1.

**Gates.** Deflate round-trips through `zlib.inflateSync` on random,
constant, run and incompressible buffers; PNG CRCs and decoded pixels;
shared edges cover each pixel once; nearer surface wins regardless of draw
order; near-plane crossing clips, not flips; orientation in `top` and
`side` matches the SVG; PNG bytes identical across two processes with
different locale and TZ; a pinned hash of a small hostile scene across
Windows and the Linux CI matrix, **and a one-float change moves it**; the
banned-`Math` scan; SVG bytes unchanged; the heaviest corpus mesh renders
a sheet under a ceiling measured first, then set.

### U6b — Stable cook reports (S)

`--no-timings` on cook, run and inspect omits every `elapsedMs` (JSON at
`src/cli/commands.ts` 702, 708, 880, 1171, 1177; text at 715, 728, 1184,
1205) rather than zeroing it — a zero looks like a measurement. `--fingerprint` on cook and run adds a
16-hex digest overall and per output: FNV over `graphFingerprint`, moved
from `src/docs/graphGolden.ts` to `src/cli/fingerprint.ts` and re-exported,
so the golden is unchanged. Opt-in. Gates: two cooks with both flags are
byte-identical, **and differ without `--no-timings`**; a seed change or one
mutated value moves the fingerprint.

### U6c — Distributions in `pcg inspect` (M)

`stddev` joins `AttrStats` in JSON (the text table is positionally
greppable and stays). `--dist <attr>` gives nearest-rank percentiles
(p0 p5 p25 p50 p75 p95 p100 — every value a real data point) and a
histogram, `--bins` 1..100. `--group-by <attr>` for strings and integers,
capped at 64 groups; a float attribute exits 2 pointing at `--bands`.
`--bands attr=e0,e1,…` is half-open with `<e0`, `>=eN` and `non-finite`
groups, so counts always sum to the total; groups share bin edges. Instances expose
`@translate`, `@scale`, `@asset`. Gate: one command reproduces the
riverbank log's §8 tree count per distance band, which took four scratch
graphs.

---

## U7 — A repeatable agent eval (L)

Whether a fresh agent, given only the installed package,
can author graphs that meet an outcome brief — with noise, drift and
contamination controlled so before/after comparisons mean something.

> ### MEASURED OUTCOME, 2026-09-19 — BUILT, RUN, NULL RESULT
>
> Three campaigns ran: a pilot (54 runs), a calibration (8 + 2), and the
> comparison `v2` (96 runs — 8 held-out tasks x 3 runs x 4 arms). Results
> are committed under `evals/results/`. **The gate says STOP, and no arm is
> distinguishable from any other.**
>
> Solved: A 23/24, A-prime 24/24, candidate-U1 21/21, stripped-all 22/22.
> One genuine failure in 96 (`quarry-terraces` missed `benches-wander` on
> A). Turns, paired by task, against an A/A noise floor of +0.2%
> [-11.7, +13.7]:
>
> | contrast | turns | 95% CI | sign p |
> |---|---|---|---|
> | candidate-U1 vs A | +5.3% | [-18.0, +26.8] | 1.00 |
> | stripped-all vs A | -2.9% | [-27.1, +24.9] | 0.73 |
> | stripped-all vs candidate-U1 | -3.2% | [-25.2, +27.3] | 0.29 |
>
> Every contrast is inside the noise, and the two that would have meant
> something point the WRONG WAY: the candidate cost slightly more turns
> than the baseline, and stripping `llms.txt`, `docs/`, `skills/` AND the
> 95-graph corpus cost slightly fewer. Both are zero wearing a sign.
>
> **WHAT THIS DOES NOT SAY.** It is not a refutation of U1-U6. With 8 tasks
> the interval on turns is about +/-25%, so anything short of a large
> effect was never visible, and limb (c) found 7 of 8 tasks at ceiling on
> solved, so that axis could not move at all. This is a null with a known
> detection floor. Do not cite it as "documentation does not matter".
>
> **WHAT IT DOES SAY**, and why a third harder task set is not the obvious
> next move: a docs strip cannot remove the package itself. The transcripts
> settle the mechanism, and it is NOT the one first written here — an
> earlier draft of this entry said `listNodeTypes()` IS the library and the
> registry carried it. The measured orientation ranking says otherwise:
>
> | source | runs that used it |
> |---|---|
> | `llms.txt` (where present) | 94% — and 59% of FIRST actions |
> | `graphs/` corpus | 88% |
> | `dist/` source | 76% |
> | `.d.ts` | 72% |
> | `docs/` | 70% |
> | CLI validate/cook | 55% |
> | `skills/` | 54% |
> | `pcg nodes` | 51% |
> | `listNodeTypes()` | **12%** |
>
> Prose opens the door; the CLI is the working source of truth; `.d.ts` is
> ground truth for output shape but is read REACTIVELY, after a crash. On
> the stripped arm the fallback was README 100% and `dist/` source 64%,
> with the CLI carrying the rest — agents read the shipped SOURCE AND TYPES,
> which no documentation strip removes. So the arm never tested "an agent
> without documentation"; it tested "an agent whose documentation is the
> package". That is why difficulty alone may not rescue this design.
>
> The harness is the durable asset: resumable, allowance-funded, pausing
> and resuming at the usage limit, with a contamination classifier that
> caught a real sandbox escape. Its next use is diagnostic rather than
> comparative — the 96 transcripts record where agents actually struggle,
> which needs no control group. See `evals/README.md`.
>
> ### What the transcripts found, ranked by runs hit (U8 candidates)
>
> Read across all 108 records; full report in the session scratchpad. The
> comparison could not see any of this, because every arm shares it.
>
> 1. **99 runs — the library cannot read back a cooked result.** Every run
>    writes its own measurement harness. `pcg inspect` gives per-attribute
>    min/max; anything relational (is this inside that, how far is each
>    point from its neighbour, does this count scale with that length) is
>    hand-rolled. 78 runs fell back to `Object.keys()`. THIS IS THE FINDING.
> 2. **~25 — the cooked-output shape is undocumented and guessed wrong.**
>    `.topology` (17), `.matrices` vs `.transforms` (10), `GeometryItem` vs
>    `Geometry` (6), `AttributeSet` read as a Map (4), and typed arrays
>    being CAPACITY-padded rather than count-sized (3, silently — one run
>    measured a 300 m wall as 600 m and never noticed).
> 3. **17 — `Geometry` has no `.topology`**, yet the class's own doc
>    comment says "plus topology" three times while the three arrays sit
>    flat. A doc comment causing real failures.
> 4. **12 — `add`/`mul` are binary-only**; six tasks across all four arms
>    independently wrote the same reduce wrapper.
> 5. **10 — shipped primitives unregistered under a plain `import "pcg-ts"`**
>    (`shape/path-loop`, `shape/ring`, `shape/disc` are all real). Two runs
>    rebuilt them from scratch, 25-33% of the run. ALREADY FIXED in
>    `65faedd`; no v2 tarball carried it.
> 6. **8 — `require("pcg-ts")`** fails as `Cannot find module
>    './dist/index.cjs'`, a path that never existed: no `require` condition
>    in `exports`.
> 7. **5, plus 53 pre-emptive workarounds — `graph.seed = n`** throws a bare
>    V8 TypeError that never names `setSeed()`.
> 8. **4 — `pcg cook --output/--outputs`** guessed for `--out`. **4** — an
>    error advising "reinstall pcg-ts" on a stripped tarball, which caused
>    the campaign's only `find /`.
> 9. **3** — `arcTile`/`pathResample` refuse on hairline float overrun.
>    **3** — `examples-facade.json` (810 KB) exceeds the agent Read cap and
>    was never reused.
> 10. **2 — a shared `Field` object resolves to different numbers in two
>    nodes** (node id folds into the seed), silently, costing ~8 turns.
>    **1** — `position()` reads current P, not original.
>
> **Why `quarry-terraces` cost 2x everything else:** with no way to evaluate
> an expression at an OFFSET position, agents hand-unroll a stencil, each
> tap a full copy of the height function, ANDed together with binary `mul`.
> The remaining turns go to blind numeric sweeps, because finding 1 means
> nothing can measure the result.
>
> Measure it by the offending param, not by file size. An earlier draft
> here quoted 233 KB median / 2.9 MB max, which were ON-DISK bytes: indent
> scales with expression depth, and one 2.94 MB graph is 2.70 MB (92%)
> leading whitespace. Only this task reaches depth 96-170, so the inflation
> hit it hardest and flattered the case. Compact, the weight is always in a
> single `filterByExpression.predicate` — 98.5-99.7% of the whole
> expression — at 480,771 / 181,605 / 171,253 / 101,474 bytes across four
> runs in three arms. That is 10-40x a normal predicate, not the ~250x the
> raw file sizes implied. The mechanism and the ranking are unchanged.
>
> The duplication is worse in KIND than in size. Canonicalising conjuncts:
> 66 taps of which 65 are identical; 51/48; 47/44; 25/24. And within a
> single tap the height formula is inlined TWICE — once under `floor`, once
> under `smoothstep(fract(…))` — because there is no way to compute it once
> even locally. Two offset styles appear (`add(position(), vec(dx,0,dz))`
> in one run, the offset folded into five separate `component(position,0)`
> leaves in another), which is why it is easy to miss.
>
> **The alternatives are CLOSED, not merely awkward.** The grammar's only
> reuse construct, `{fn:"param",name}`, is a graph-parameter feature:
> `ParamValue` is `number|boolean|string|number[]|string[]|DataItem[]` and
> never a `Field`, and bindings are wired through `Graph.setGraphParam` in
> TypeScript — so a hand-authored `graph.json` cannot use it at all. And
> `pointNeighborhood` exposes only `count` and `average`, no min/max/
> all-satisfy, so even baking height onto a sample grid could not express
> "every neighbour is within epsilon". The grammar DOES have variadic
> arity, but exactly one function uses it (`vec`, `fieldJson.ts:1781`); it
> was never pointed at the arithmetic or logical operators.
>
> **Design direction (three pieces that compose; each only half-helps):**
> a variadic `all`/`any` to flatten the AND-chain; a `let` or named
> subexpression — the highest-leverage one, since it fixes both cross-tap
> and intra-tap duplication; and `at(expr, offset)`, useful only once `let`
> exists to name what is being shifted. Plus min/max/all/any reducers on
> `pointNeighborhood`.
>
> **The one real failure was a measurement failure.** `benches-wander` on
> `r0.quarry-terraces.A-a1`: the agent's self-written check quantised its
> line fit to 18 fixed angles instead of least-squares, read 1.7% where the
> scorer read 13.6%, and then swept 35 seeds measuring the wrong thing. Its
> final "add more wiggle" edit was CORRECT and it could not tell. Finding 1
> is what cost it the run.

**Layout.** `evals/` in this repo, outside `files` and outside vitest.
`evals/tasks/<id>/` holds `brief.md` (outcome in world terms plus the
output contract), `task.json` (tier, checks, seeds `[graphSeed, 1, 2]`,
turn/wall/token caps), `reference.graph.json` (must pass) and
`negatives/*.graph.json` (each must fail a named check). Held-out briefs
live in `pcg-ts-private` (decision E2).

**Harness** (`evals/harness/`):
- `pack.mjs` — build, pack, store tarball + manifest (U0 uses it).
- `sandbox.mjs` — a temp project under the OS temp dir, never inside the
  repo; `npm install <tgz> --offline`; the brief and nothing else.
- `agents/claude-code.mjs` — `launch({ cwd, prompt, budgets })`: headless,
  pinned model id, turn cap, file and shell tools only, an empty isolated
  config so no user CLAUDE.md, memory, skills, plugins or MCP servers load
  (this machine has several; the exact flags are checked against the CLI's
  docs when built). Other agent CLIs plug into the same interface.
- `score.mjs` — a new process: load; cook twice and compare a digest
  computed in `evals/lib/` from the cooked attribute arrays, for
  determinism; cook with `budgetMs: 0` for partition safety; each check at
  each seed. **Scores only through root exports every arm already has**
  (0.17.0's — `deserializeGraph`, `cook`, the cooked collections), never
  through `inspect --json`, `--fingerprint` or diagnostics: U4 and U6
  change those formats, the U0 tarball has none of them, and
  `graphFingerprint` lives in `src/docs`, which is not in `exports`. The
  digest is the scorer's own. Frames for human review come from whatever
  the arm's own CLI can draw (the SVG for U0; the PNG sheet once U6a is
  in), and the task-9 eye-level frames from `npm run preview` at the
  harness commit.
- `selftest.mjs` — every reference passes, every negative fails its named
  check, and a brief lint rejects any registered node, field fn or
  primitive name. Also an isolation probe that asks the agent to report any
  instructions it holds: clean in the sandbox, **and it must detect a leak
  when deliberately run from inside the repo**. `run.mjs` refuses to start
  if selftest fails.
- `run.mjs` — arms × tasks × runs, arm order shuffled within each
  (task, run) block with the seed recorded. `report.mjs` — per-task solved
  counts with Wilson intervals, paired by task, plus process metrics
  (turns, validate failures, probe graphs written), which vary less than
  pass rate.
- `evals/lib/geometry.mjs` — distance to polyline, nearest-neighbour
  spacing, crossings, components, surface height and slope, eye-level
  occlusion.

**Tasks** — pilot six, then eight to ten: (1) the riverbank brief verbatim,
for continuity; (2) even spacing in a square; (3) props along a winding
road, alternating sides, facing it; (4) trees on hills avoiding steep
ground; (5) a three-species mix in a disc within ±5%; (6) settlement roads
— no crossings, one component; (7) a spiral stair; (8) an extruded L
footprint with a window grid; (9) a forest clearing at eye level — blocked
sight directions from 1.7 m within a band, with frames saved on every run
for a human to look at later. Each is tiered by whether shipped `graphs/` holds a
near-solution; transcripts record reads of `node_modules/pcg-ts/*`.

**Controls.** One model and CLI version per campaign; a fresh sandbox per
run; warm npm cache for every arm. **A/A arm** — the same tarball under two
labels — gives the noise floor. **Stripped arm**, once per harness version
— the baseline with `llms.txt`, `docs/` and `skills/` removed — must score
worse, or the eval cannot see documentation. Human "looks right" review on
a sample of passing runs fixes the rubric, never the docs — and it is
asynchronous: frames accumulate in a gallery, and no run, gate or unit
waits on a review. n is fixed
before running, no early stopping; ~50 runs per arm detects only large
effects, and the report says so. Hitting a cap is a failure class, never
retried silently. A task a doc change quotes is retired.

**Records.** `evals/results/<campaign>/manifest.json` (arms, tarball
manifests, task hashes, harness sha, CLI version, model, schedule seed,
budgets) and `runs.jsonl`, one line per run, both committed. Transcripts
and frames go to git-ignored `evals/runs/`, referenced by hash. Usage per
run is recorded, so the pilot measures what a run draws.

**What a run costs is allowance, not money** (checked 2026-09-15). Headless
`claude -p` sessions draw from the owner's Claude subscription usage
limits, the same allowance interactive sessions and the unattended build
use; they are billed per token only when `ANTHROPIC_API_KEY` is set, which
it is not on this machine.
<https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan>
Anthropic announced these runs would stop counting against subscription
limits and paused that change on 2026-06-15, so re-check before each
campaign. `run.mjs` **refuses to start when `ANTHROPIC_API_KEY` is set**:
a key would silently move the eval onto pay-per-token billing.

**Unattended by design.** Not in CI (nondeterministic, and it spends the
owner's allowance), but no step needs a human to press go:
- **Scheduling.** Runs happen inside a configured window (decision E1:
  around the clock) with concurrency 1. The schedule and every finished run are
  persisted in `runs.jsonl`, so the runner is resumable: killed, rebooted
  or out of window, it restarts at the first unfinished slot.
- **Usage limits.** A session that ends on a usage-limit error is NOT a
  failed run: its slot is discarded unscored and rescheduled, and the
  runner sleeps until the reset time the error reports (or backs off and
  re-probes) before continuing. This is distinct from a run hitting its
  own turn, wall or token cap, which stays a failure class.
- **Triggers.** The pilot starts when the harness selftest passes. Each
  comparison of record starts itself when a unit's candidate tarball is
  packed.
- **Automatic go/stop gate after the pilot.** Go when: the stripped arm
  scores below the baseline arms beyond the A/A gap; the A/A gap is within
  a threshold fixed before the pilot; no task sits at 0% or 100% across
  all arms (such tasks are replaced from the reserve without asking). On
  go, the agent re-ranks U1–U6 from the pilot's friction logs, records the
  ranking and its reasons in the commit, and continues. Stop only on the
  wake-up conditions below.
- **Wake the owner only for:** the gate failing twice after task
  replacement (the eval cannot see documentation, or noise swamps it); the
  isolation probe detecting a leak; an API key present; usage limits
  blocking every window for more than 48 hours; a selftest failure the
  harness cannot attribute to a changed node. Everything else is logged
  and the queue moves on.

Pilot: 6 tasks × 3 runs × 3 arms (A, A′, stripped) = 54 runs; each later
comparison is about 100 (≈50 per arm).

---

## Sequencing and ownership

**Shared files have one owner at a time: the integration owner.** They are
`src/cli/commands.ts` (U1, U2, U4, U5, U6 — and U4's `required` column in
`pcg nodes`), `src/cli/index.ts` and `io.ts`, `src/index.ts` (U3a's
`RepeatUntilParams`, U4's diagnostics exports, `diagnoseGraph`,
`checkSerializedGraph`, `graphJsonSchema`), `src/docs/index.ts` (U1, U2,
U3), `src/docs/site.ts` (U1's `COUNT_CLAIMS` move, U4's
`ERROR_TRANSCRIPTS`), and `package.json` with the lockfile (U1's `files`
and scripts, U3a's `docs:types` and `prebuild`, U5's generator and
`ajv`). Parallel agents deliver modules and tests over disjoint files and
hand their export lines, script entries and command wiring to the
integration owner, who lands them in order. Worktrees wherever two writers
would otherwise share the tree.

**Every commit is green on its own:** a change that alters a generated
catalog, a transcript or a quoted message carries the regenerated file and
the updated assertion in the same commit.

**Wave 0 — now.** U0 baseline tarball. U6b (small, and useful to agents on
its own). U4's suggester extraction.

**Wave 1 — measurement and interfaces.**
- U7 harness, selftest, tasks 1–6, isolation probe; then the **pilot,
  against the U0 tarball**, before U1–U5 land. It validates the harness,
  measures the A/A floor, proves the stripped arm scores worse, finds tasks
  at ceiling or floor, and its friction logs re-rank U1–U6.
- In parallel: U4 `src/diagnostics` record, codes, classes, worker
  protocol. U3a generated param interfaces (disjoint: `src/nodes/*`,
  `src/docs/paramTypes.ts`), which also lands the shared param-type table.

**Wave 2 — the first measured intervention, and parallel internals.**
- U1, CLI owner. It goes first among CLI changes because it has the
  strongest published evidence and is measurable alone. The block renders
  only commands that exist, so it gains the `pcg graphs` line when U2
  lands; a test enforces that. Eval: baseline vs U1, interleaved.
- In parallel: U4 required pins + `diagnoseGraph`; U4 missing attribute;
  U5 generator; U6a `src/cli/raster/*`; U6c in `summary.ts`.

**Wave 3 — serialized CLI integration.** U4 collect-all in `serialize.ts`
(exclusive owner, lands `$schema` acceptance) → U4 CLI envelope and checks
→ U5 `pcg schema` → U6a and U6c flags → U2. Eval: baseline vs wave-3 head.

**Wave 4.** U3b stricter types. Prose that no gate forces into an earlier
commit: the skills' loop line (`render --out g.png`), llms-full sections
for `pcg schema`, `pcg agents`, `pcg graphs`, a docs page of error codes
from `DIAGNOSTIC_CODES`. CLAUDE.md Layout gains `src/diagnostics`,
`params.generated.ts` and `evals/`. PLAN.md lines 21–22 call both
`dist/*.d.ts` and `llms.txt` "generated from the code": the d.ts is, but
`llms.txt` is hand-written by design (`src/docs/llms.ts`). After U1 the
root `llms.txt` index is generated and `docs/llms-full.txt` stays
hand-written — say exactly that.

**Comparison of record** — at measurement time, the saved U0 tarball
interleaved against each candidate, n from the pilot's variance. A baseline
number from months earlier is not comparable: the model and the agent CLI
will have changed.

Each unit follows the unattended protocol: tests green, commit as the
record, and an independent verification agent for every nontrivial unit.

---

## Decisions

**Decided by the owner, 2026-09-15:** E1 — Sonnet 5, around the clock,
pausing at the usage limit and resuming automatically. E2 — held-out
questions locked in `pcg-ts-private`. E3 — practice round (pilot) first.
Run unattended as far as possible, with agents for parallel work and
verification. U0 is captured: `baseline-0.17.0-0ad6998.tgz`, sha256
`ee39df38…24bc`, source as of `a67e9ec`, in `evals/tarballs/` and
`pcg-ts-private/evals/tarballs/`.

**As they were posed:**

- **E1 — model, and when the eval may use the allowance.** Runs cost
  subscription allowance, not money (see U7). Recommended: Sonnet 5 as the
  single model, on a night-shift window with automatic resume, so daytime
  allowance goes to the unattended build. Alternative: around the clock,
  pausing at the limit — faster, but it competes with everything else
  drawing on the same allowance. The pilot is 54 runs; each later
  comparison about 100.
- **E2 — where briefs live.** Recommended: harness and corpus-adjacent tasks
  in public `evals/`, held-out briefs in `pcg-ts-private`. Briefs in a
  public repo end up in future training data.
- **E3 — pilot before U1–U5, or only the U0 tarball.** Recommended: pilot
  first, with the automatic go/stop gate in U7 deciding whether to
  continue, so choosing it adds no human step; U0 is mandatory either way.

**Proceeding with the recommendation unless overridden:**

| # | Decision | Recommended | Alternative |
|---|---|---|---|
| D1 | llms naming | Convention: index `llms.txt`, full `docs/llms-full.txt` | Keep `llms.txt` full, add `llms-index.txt` |
| D2 | `pcg agents` default | Print; `--write` changes files | Write by default |
| D3 | CLAUDE.md import | Only with `--claude`, hint otherwise | Always add it |
| D4 | Name index in the block | Include (~2.5 KB) | Pointers only |
| D5 | JSDoc length | Full descriptions (+~250 KB d.ts) | First sentence + `pcg nodes <type>` |
| D6 | U3b typed pins and enum unions | Yes, separate commit | U3a only |
| D7 | Exit code for an invalid graph document | New `3` | Keep 0/1/2, rely on `code` |
| D8 | Pin requiredness | Required by default, `optional: true` on 4 | Opt-in `required: true` on 55 |
| D9 | Schema tests | `ajv` as a devDependency | Hand-written checks |
| D10 | `graphJsonSchema`, `diagnoseGraph`, `checkSerializedGraph`, `Diagnostic` | Root exports | `pcg-ts/cli` only |
| D11 | PNG surface | Extend `render` by `--out` extension | New subcommand |
| D12 | `--fingerprint` | Opt-in | On by default |
| D13 | Eval network access | None, attempts logged | Allowed |

## Decided against

- **An MCP server.** Already decided; the evidence gives no reason to
  revisit, and the CLI is the documented context-efficient surface.
- **A postinstall that writes into a consumer repo.** `pcg agents --write`
  is explicit.
- **Copying skills into `.claude/skills/`.** Copies go stale and need their
  own managed-copy logic; point at them by path.
- **Auto-correcting near-miss names.** An agent reads a silent correction as
  success; suggest and refuse.
- **A browser-backed render subcommand, or native/WASM rasterizers.** Weight
  or a broken zero-dependency bin.
- **Scoring evals through `inspect --json`.** The formats under test would
  move the scorer.
- **Running the eval in CI.**
