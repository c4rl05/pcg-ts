/**
 * Corpus CI. Every example under `graphs/` must deserialize,
 * cook inside a time budget, and still produce what the golden records —
 * and must produce it identically twice.
 *
 * WHAT THE GOLDEN PINS, AND WHY IT IS NOT A FLOAT DUMP. It holds element
 * counts per domain, attribute presence (name, type, tuple size),
 * instance batch shape, each batch's per-instance channels (name, type,
 * item size, and per-component statistics), the bounds of `P`, and
 * per-batch instance transform statistics — the numeric ones compared
 * within a tolerance. A
 * float-exact corpus fights every legitimate change — a faster spatial
 * grid, a reassociated sum, a rounding difference in a transform — and a
 * suite that fails on improvements is a suite that gets relaxed until it
 * catches nothing. Counts, attribute shape and reduced statistics survive
 * an unrelated numerical improvement while still catching what actually
 * breaks: a filter that stopped filtering, a node that stopped writing its
 * attribute, a cloud that landed somewhere else, a whole class of
 * instances that quietly changed size or orientation.
 *
 * THE TRANSFORM STATISTICS ARE HERE BECAUSE COUNTS ARE NOT ENOUGH. An
 * instances output contributes no per-domain count and no `P` bounds, so
 * before they existed a graph could change the size, position and
 * orientation of every instance it spawns and this file would pass
 * without moving one byte — which is exactly how a silent fall-through in
 * `examples-rig.json` survived three rewrites in a row.
 *
 * Float-exactness belongs in the last two tests instead, which cook each
 * graph more than once and compare the raw bytes. Those compare a run
 * against itself rather than against a stored constant, so they test
 * determinism — the hard invariant — and no intended change can make them
 * stale. They differ only in what they vary between the cooks: nothing
 * (same options twice), and the cook budget (straight through vs. fully
 * partitioned).
 *
 * THE FIRST OF THOSE COOKS IS THE GOLDEN TEST'S, AND EVERY COOK PARSES
 * ITS OWN JSON. A first cook that disagrees with every later one used to
 * pass this whole file, because the golden compares statistics within a
 * tolerance and the determinism test compared two WARM cooks to each
 * other. That is the exact shape a JIT miscompile takes, and one lived in
 * `src/noise/worley.ts` until it was found by hand. Two things had to
 * change for this file to see it: the golden test now records its cook's
 * fingerprint and the determinism test compares against that, and every
 * cook takes a fresh `JSON.parse` the way a host does rather than sharing
 * one parsed object (see `freshJson`). With the fault put back in on Node
 * 22.20.0, this file never caught it before those two changes and caught
 * it in most runs after — a JIT fault has no fixed rate, so read that as
 * the difference between a gate that can see it and one that cannot,
 * never as a percentage. The determinism test's own comment says what it
 * still does not cover.
 *
 * If the golden test fails on a change you meant to make, re-derive it
 * and read the diff: `npm run build && npm run graphs:golden`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOMAINS, type DataCollection, cook, deserializeGraph, listNodeTypes } from "../src/index.js";
import {
  GRAPHS_TIME_LIMIT_MS,
  type GraphsGolden,
  TOLERANCE_ABS,
  TOLERANCE_REL,
  cookGraph,
  graphFingerprint,
  graphStats,
  diffGraphStats,
} from "../src/docs/graphGolden.js";
import { type GraphFile, describeExample, loadGraphs } from "../src/docs/graphIndex.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GOLDEN_PATH = fileURLToPath(new URL("./graphs.golden.json", import.meta.url));

/**
 * Node types allowed to appear in no corpus graph, each with the property
 * of the NODE that makes a corpus graph impossible. Nothing else earns a
 * place here — a type that is merely awkward to demonstrate is a graph
 * waiting to be written, not an exemption.
 */
const COVERAGE_EXEMPT = new Map<string, string>([
  [
    "dataInput",
    "its items are injected at runtime and carry nothing through serialization, " +
      "so a corpus graph using it would cook to nothing — the test above forbids it here outright",
  ],
]);

/**
 * Timeout for the two tests that cook a graph MORE THAN ONCE.
 *
 * `GRAPHS_TIME_LIMIT_MS` is the budget this file actually enforces, and it
 * is enforced per cook — so a test performing several cooks cannot live
 * under vitest's 5 s default, which is shorter than the budget it is
 * supposed to be checking against. That mismatch stayed invisible while
 * the heaviest corpus graph cooked in well under a second; it stops being
 * invisible the moment one of them gets meaningfully heavier, and then it
 * fails as a timeout with nothing to read rather than as a budget
 * violation naming the graph. The budget test above is what catches a real
 * regression; this constant only keeps that signal from being pre-empted by
 * a timeout that was never a deliberate budget. Partition safety cooks with
 * `budgetMs: 0`, which yields after every node, so it is the slower of the
 * two — hence the multiple rather than a doubling.
 */
const MULTI_COOK_TIMEOUT_MS = GRAPHS_TIME_LIMIT_MS * 4;

const corpus = loadGraphs(ROOT);
const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as GraphsGolden;

/** Where two rendered structures first differ, as one line each. */
function firstDifference(left: string, right: string, leftLabel: string, rightLabel: string): string {
  const a = left.split("\n");
  const b = right.split("\n");
  const width = Math.max(leftLabel.length, rightLabel.length);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return [
        `first difference at line ${i + 1}:`,
        `  ${(leftLabel + ":").padEnd(width + 1)}  ${a[i] === undefined ? "<end>" : a[i]}`,
        `  ${(rightLabel + ":").padEnd(width + 1)}  ${b[i] === undefined ? "<end>" : b[i]}`,
      ].join("\n");
    }
  }
  return "structures differ only in trailing bytes";
}

/**
 * Float-exact comparison of two cooks, and the only one in this file:
 * both determinism tests go through it so they can never drift into two
 * subtly different notions of "identical". `graphFingerprint` hashes
 * every attribute column, the topology arrays and every instance
 * transform, so a single flipped bit shows up here. Returns `undefined`
 * when the two agree, or a rendered first difference when they do not.
 */
function fingerprintDifference(
  left: Record<string, DataCollection>,
  right: Record<string, DataCollection>,
  leftLabel: string,
  rightLabel: string,
): string | undefined {
  const a = fingerprintText(left);
  const b = fingerprintText(right);
  return a === b ? undefined : firstDifference(a, b, leftLabel, rightLabel);
}

/** One cook's float-exact fingerprint, rendered for comparison. */
function fingerprintText(outputs: Record<string, DataCollection>): string {
  return JSON.stringify(graphFingerprint(outputs), null, 1);
}

/**
 * THE PROCESS'S FIRST COOK of each corpus graph, recorded by the golden
 * test (which performs it) and compared by the determinism test (which
 * does not).
 *
 * The determinism test cooks twice and compares those two to each other.
 * That left the first cook of the process outside every float-exact
 * comparison in this file, because the golden test cooks each graph
 * before it and the golden pins only counts, names, bounds and reduced
 * statistics within a tolerance. A first cook that differs from every
 * later one by a handful of floats therefore passed the whole suite —
 * and that is exactly the shape a JIT miscompile has: `src/noise/worley.ts`
 * compared a param string inside its per-sample closure, and in a warm
 * process one sample took the wrong branch, on the FIRST cook only.
 *
 * Recorded rather than cooked again here because the first cook is by
 * definition unrepeatable: cooking a fourth time would only produce
 * another warm cook. The OUTPUTS ride along with the fingerprint, so a
 * failure can name the element that moved and not just the column — one
 * entry at a time, dropped by the determinism test that reads it, so the
 * peak is one extra cook's worth of memory and not the whole corpus.
 */
interface FirstCook {
  readonly text: string;
  readonly outputs: Record<string, DataCollection>;
}
const firstCook = new Map<string, FirstCook>();

/**
 * How many golden tests have run. The determinism test uses it to tell
 * "the golden test was filtered out" (0, so its own first cook is the
 * process's) from "the golden test ran but not before me" (> 0 with no
 * entry recorded), which is what turning on shuffle or concurrency would
 * do — silently degrading this file back to comparing two warm cooks.
 */
let goldenCooks = 0;

/** Each corpus file's raw text, read on first use; see {@link freshJson}. */
const graphText = new Map<string, string>();

/**
 * A FRESH PARSE of one corpus graph, and every cook below takes one.
 *
 * `loadGraphs` parses each file once and every test used to hand that one
 * parsed object to every cook. That is not what a host does — the CLI, the
 * editor and each demo parse a graph's text on every load — and the
 * difference is not cosmetic. `JSON.parse` allocates a fresh string per
 * call, and the strings a graph's params are made of are what a node
 * compares against its literals. Reusing one parsed object hands every
 * cook the same string objects, which is the case V8 optimizes cleanly;
 * parsing afresh is the case it got wrong.
 *
 * Measured on Node 22.20.0 against the unfixed `src/noise/worley.ts`, by
 * cooking `basics-worley-cells.json` three times in a warm process: with
 * one shared parsed object the first cook agreed with the second in every
 * run, and with a fresh parse per cook it disagreed in every run, by one
 * f32. Being a JIT fault the rate is a property of the machine, so read
 * that as a difference in KIND and not as two percentages. The suite
 * could not see the bug because it was not loading graphs the way
 * anything else does.
 */
function freshJson(entry: GraphFile): unknown {
  let text = graphText.get(entry.file);
  if (text === undefined) {
    text = readFileSync(entry.absolutePath, "utf8");
    graphText.set(entry.file, text);
  }
  return JSON.parse(text);
}

/**
 * WHERE two cooks first differ, as an element and a lane rather than a
 * column hash — the line a fingerprint difference cannot give you, and
 * the one whoever reads the failure actually wants.
 *
 * Walks outputs, items and attribute columns in the order
 * `graphFingerprint` hashes them, so the element it names belongs to the
 * column the fingerprint difference named. Compares by BITS, so a NaN
 * that moved is a difference and -0 against 0 is one too. Returns
 * `undefined` when it finds nothing an attribute column explains — the
 * caller still has the fingerprint difference, which covers topology,
 * instance transforms and item shape.
 */
function firstDifferingElement(
  left: Record<string, DataCollection>,
  right: Record<string, DataCollection>,
): string | undefined {
  for (const name of Object.keys(left).sort()) {
    const a = left[name] ?? [];
    const b = right[name] ?? [];
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const ia = a[i];
      const ib = b[i];
      if (ia?.kind !== "geometry" || ib?.kind !== "geometry") continue;
      for (const domain of DOMAINS) {
        const setA = ia.geo.attrs[domain];
        const setB = ib.geo.attrs[domain];
        for (const attr of setA) {
          const other = setB.get(attr.name);
          if (!other || other.tupleSize !== attr.tupleSize) continue;
          const ts = attr.tupleSize;
          const used = Math.min(setA.count, setB.count) * ts;
          const ua = new Uint8Array(attr.data.buffer, attr.data.byteOffset, used * attr.data.BYTES_PER_ELEMENT);
          const ub = new Uint8Array(other.data.buffer, other.data.byteOffset, used * other.data.BYTES_PER_ELEMENT);
          for (let k = 0; k < ua.length; k++) {
            if (ua[k] === ub[k]) continue;
            const lane = Math.floor(k / attr.data.BYTES_PER_ELEMENT);
            return (
              `output "${name}" item ${i} ${domain} attribute "${attr.name}" ` +
              `element ${Math.floor(lane / ts)} lane ${lane % ts}: ` +
              `${String(attr.data[lane])} vs ${String(other.data[lane])}`
            );
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Cook every declared output of a corpus graph at one specific budget.
 *
 * `cookGraph` pins its own budget (it is shared with the golden
 * generator, which must never record under different options than the
 * test checks), so the partition-safety test below — the one test whose
 * whole subject IS the budget — needs to set it directly. Everything
 * else about the cook matches `cookGraph`: a fresh
 * deserialization, no output selection, no GPU.
 *
 * `budgetMs: undefined` never yields; `budgetMs: 0` yields after every
 * node. Both are real settings, not "off" — see the note on the
 * partition-safety test.
 */
async function cookAtBudget(
  json: unknown,
  budgetMs: number | undefined,
): Promise<Record<string, DataCollection>> {
  const graph = deserializeGraph(json);
  const { outputs } = await cook(graph, budgetMs === undefined ? {} : { budgetMs });
  return outputs;
}

describe("example corpus", () => {
  it("finds examples at all", () => {
    // Guards every per-file assertion below: an empty corpus generates a
    // green suite that tests nothing.
    expect(corpus.length).toBeGreaterThan(0);
  });

  it("the golden covers exactly the corpus on disk", () => {
    const onDisk = corpus.map((c) => c.file).sort();
    const recorded = Object.keys(golden.examples).sort();
    const missing = onDisk.filter((f) => !recorded.includes(f));
    const stale = recorded.filter((f) => !onDisk.includes(f));
    if (missing.length > 0 || stale.length > 0) {
      throw new Error(
        [
          "tests/graphs.golden.json no longer describes the corpus:",
          ...missing.map((f) => `  ${f}: on disk, not in the golden (added without regenerating?)`),
          ...stale.map((f) => `  ${f}: in the golden, not on disk (removed or renamed?)`),
          "",
          "  npm run build && npm run graphs:golden",
        ].join("\n"),
      );
    }
  });

  it("declares the schema and tolerance this build compares under", () => {
    // The two header fields are DOCUMENTATION until something reads them,
    // and documentation that nothing checks is how a file starts lying.
    // The comparison uses the compiled-in constants, so a golden carrying a
    // different tolerance was recorded by a different build — which is
    // exactly the case where its numbers cannot be trusted, and exactly the
    // case a silent header would hide.
    const problems: string[] = [];
    if (golden.formatVersion !== 3) {
      problems.push(
        `  formatVersion ${JSON.stringify(golden.formatVersion)}; this build writes and reads 3 ` +
          "(version 2 added per-batch instance transform statistics; version 3 added their " +
          "per-instance channels)",
      );
    }
    if (golden.tolerance?.absolute !== TOLERANCE_ABS || golden.tolerance?.relative !== TOLERANCE_REL) {
      problems.push(
        `  tolerance ${JSON.stringify(golden.tolerance)}; this build compares within ` +
          `{ absolute: ${TOLERANCE_ABS}, relative: ${TOLERANCE_REL} }`,
      );
    }
    if (problems.length > 0) {
      throw new Error(
        [
          "tests/graphs.golden.json was recorded by a different build:",
          ...problems,
          "",
          "  npm run build && npm run graphs:golden",
        ].join("\n"),
      );
    }
  });

  it("cooks from JSON alone — no dataInput anywhere", () => {
    // `dataInput` items are runtime-injected and a saved graph carries
    // none, so an example using one would deserialize, cook to nothing,
    // and teach a reader an idiom that cannot work from a file.
    const offenders = corpus
      .map(describeExample)
      .filter((e) => e.nodeTypes.includes("dataInput"))
      .map((e) => e.path);
    if (offenders.length > 0) {
      throw new Error(
        [
          "these corpus examples use `dataInput`, which carries nothing through",
          "serialization — use `meshPrimitive` for geometry a saved graph can cook:",
          ...offenders.map((p) => `  ${p}`),
        ].join("\n"),
      );
    }
  });

  it("every registered node type appears in at least one corpus graph", () => {
    // The corpus is documentation as much as it is a fixture: a node type
    // no graph demonstrates is a node type whose reason to exist can only
    // be read off a param table. `pathScan` sat in exactly that state for a
    // release — its own doc says it is the operation a field cannot
    // express, which is precisely the part a signature cannot show — so
    // this is the check that stops the gap reopening quietly.
    //
    // Coverage is DIRECT USE ONLY. `describeExample` does not look inside a
    // primitive referenced by name, so a type reachable only through some
    // `ref` does not count, and that is the intent: the point is a graph a
    // reader can open and see the node in.
    const used = new Set(corpus.flatMap((entry) => describeExample(entry).nodeTypes));
    const registered = listNodeTypes().map((info) => info.type);

    const missing = registered.filter((type) => !used.has(type) && !COVERAGE_EXEMPT.has(type));
    if (missing.length > 0) {
      throw new Error(
        [
          `${missing.length} registered node type(s) appear in no corpus graph:`,
          "",
          ...missing.map((type) => `  ${type}`),
          "",
          "Add a graph under graphs/ that uses the node for something worth",
          "teaching — not a graph that merely mentions it — then run:",
          "",
          "  npm run build && npm run graphs:golden && npm run docs",
          "",
          "If the type genuinely CANNOT appear in a serialized corpus graph, add",
          "it to COVERAGE_EXEMPT with the property of the node that makes it",
          "impossible. 'nobody got round to it' is not that property.",
        ].join("\n"),
      );
    }

    // An exemption is a claim, and a claim that has stopped being true is
    // worse than no claim: it would hide a type that later lost its excuse.
    const stale = [...COVERAGE_EXEMPT.keys()].filter((type) => used.has(type));
    if (stale.length > 0) {
      throw new Error(
        [
          "these types are exempt from corpus coverage but a graph now uses one:",
          "",
          ...stale.map((type) => `  ${type} — exempt because ${COVERAGE_EXEMPT.get(type)}`),
          "",
          "Either the exemption's reason no longer holds and the entry should go,",
          "or the graph is doing something the exemption says cannot work.",
        ].join("\n"),
      );
    }

    const unknown = [...COVERAGE_EXEMPT.keys()].filter((type) => !registered.includes(type));
    if (unknown.length > 0) {
      throw new Error(
        `COVERAGE_EXEMPT names ${unknown.join(", ")}, which no longer exists in the registry — drop the entry.`,
      );
    }
  });

  for (const entry of corpus) {
    describe(entry.file, () => {
      it("deserializes", () => {
        expect(() => deserializeGraph(freshJson(entry))).not.toThrow();
      });

      it("cooks within the time budget and matches the golden", async () => {
        const cooked = await cookGraph(freshJson(entry));
        // Taken before any assertion below can throw: this is the
        // process's first cook of this graph and there is no second
        // chance at it. See `firstCook`.
        firstCook.set(entry.file, {
          text: fingerprintText(cooked.outputs),
          outputs: cooked.outputs,
        });
        goldenCooks++;
        expect(cooked.cooked).toBeGreaterThan(0);
        if (cooked.elapsedMs > GRAPHS_TIME_LIMIT_MS) {
          throw new Error(
            `${entry.path}: took ${cooked.elapsedMs.toFixed(1)} ms to load and cook, over the ` +
              `${GRAPHS_TIME_LIMIT_MS} ms corpus budget. The corpus is authored small on purpose, ` +
              "so this is an order-of-magnitude regression, not a slow machine.",
          );
        }

        const expected = golden.examples[entry.file];
        if (expected === undefined) {
          throw new Error(
            `${entry.path}: no golden entry. Run \`npm run build && npm run graphs:golden\`.`,
          );
        }
        const diffs = diffGraphStats(graphStats(cooked.outputs), expected);
        if (diffs.length > 0) {
          throw new Error(
            [
              `${entry.path} no longer matches the golden (${diffs.length} difference(s)):`,
              "",
              ...diffs.map((d) => `  ${d}`),
              "",
              "The golden pins element counts, attribute names and types, instance",
              "batches and their per-instance channels, and bounds plus instance transform",
              "statistics within a tolerance —",
              "never raw floats — so an unrelated numerical improvement should not have",
              "moved it. If this change is intended, re-derive the golden and read the",
              "diff before committing:",
              "",
              "  npm run build && npm run graphs:golden",
            ].join("\n"),
          );
        }
      });

      it("cooks byte-identically every time, the first cook included (determinism)", async () => {
        // Separate deserializations, so each cook re-derives everything
        // instead of serving one warm memo cache.
        //
        // THE FIRST COOK IS THE ONE THAT MATTERS and it is not performed
        // here — the golden test above already did it, and recorded it.
        // Comparing only the cooks this test performs compares two WARM
        // cooks against each other, which is the one pairing a
        // first-cook-only fault cannot show up in. See `firstCook` for
        // the fault that hid there.
        //
        // WHAT THIS GATE DOES NOT COVER, so nobody reads it as a proof:
        // it is probabilistic, because the fault it was built for is a
        // JIT one that does not fire on every run — on the injected fault
        // it caught it in most runs, not all, so a green run is weaker
        // evidence than a red one is. And it can only exercise the param
        // values the corpus actually contains: at the time of writing no
        // corpus graph sets `transferByIndex`/`pathShift` `outOfRange` to
        // "wrap" or "clamp", `filterPrimitivesByBounds` `vertex`, or
        // `meshFromField` `inside: "above"`, so four of the ten sites
        // whose per-element string comparisons were hoisted have no
        // coverage here at all. Adding a graph that uses them is how that
        // changes; nothing about this test can.
        const runs: [string, string][] = [];
        const outs: Record<string, DataCollection>[] = [];
        const first = firstCook.get(entry.file);
        firstCook.delete(entry.file);
        if (first !== undefined) {
          runs.push(["cook 1 (the process's first)", first.text]);
          outs.push(first.outputs);
        } else if (goldenCooks > 0) {
          throw new Error(
            [
              `${entry.path}: the golden test has run for ${goldenCooks} graph(s) but recorded`,
              "nothing for this one, so this file's tests are no longer running in",
              "declaration order. This test compares the golden test's cook — the",
              "process's FIRST cook of this graph — against two of its own, and without",
              "it the comparison silently weakens to two warm cooks, which is the one",
              "pairing that cannot see a first-cook-only fault. Turn off shuffle or",
              "concurrency for this file, or make each test perform its own first cook.",
            ].join("\n"),
          );
        }
        for (let k = 0; k < 2; k++) {
          const { outputs } = await cookGraph(freshJson(entry));
          runs.push([`cook ${runs.length + 1}`, fingerprintText(outputs)]);
          outs.push(outputs);
        }
        for (let i = 1; i < runs.length; i++) {
          if (runs[0][1] === runs[i][1]) continue;
          const left = outs[0];
          const right = outs[i];
          const element =
            left !== undefined && right !== undefined
              ? firstDifferingElement(left, right)
              : undefined;
          throw new Error(
            [
              `${entry.path}: two cooks of the same graph produced different bytes.`,
              "Determinism is a hard invariant — same seed, same output, whatever the",
              "cook order — so this is a bug in a node, not a golden to update.",
              "",
              firstDifference(runs[0][1], runs[i][1], runs[0][0], runs[i][0]),
              ...(element !== undefined ? ["", `first differing element: ${element}`] : []),
            ].join("\n"),
          );
        }
      }, MULTI_COOK_TIMEOUT_MS);

      it("cooks identically fully partitioned as straight through (partition safety)", async () => {
        // THE OTHER HALF OF "WHATEVER THE COOK ORDER". The test above
        // varies nothing between the two cooks; this one varies the only
        // thing the runtime lets a graph observe about how its work was
        // sliced. A budgeted cook yields to the event loop and resumes,
        // so a node that accumulates across calls, reads a shared
        // mutable, or depends on wall-clock time can see a different
        // slice of the world per partition and produce different bytes.
        //
        // `budgetMs: 0` is maximum partitioning, not "no budget": the
        // scheduler's guard is `budgetMs !== undefined && elapsed >
        // budgetMs` (src/graph/execute.ts), so 0 yields after every
        // single node rather than disabling the check. It forwards into
        // subgraph nodes' inner cooks the same way. This is exactly the
        // check `skills/performance-and-budgets/SKILL.md` asks graph
        // authors to run on their own graphs, so the corpus runs it too.
        const whole = await cookAtBudget(freshJson(entry), undefined);
        const partitioned = await cookAtBudget(freshJson(entry), 0);
        const diff = fingerprintDifference(whole, partitioned, "unbudgeted", "budgetMs: 0");
        if (diff !== undefined) {
          throw new Error(
            [
              `${entry.path}: cooking fully partitioned produced different bytes than`,
              "cooking straight through. Some node in this graph depends on how the",
              "cook was sliced — accumulated state that survives a yield, a read of",
              "shared mutable state, or wall-clock time. Determinism is a hard",
              "invariant and the budget is not allowed to change the result, so this",
              "is a bug in a node, not a golden to update.",
              "",
              diff,
            ].join("\n"),
          );
        }
      }, MULTI_COOK_TIMEOUT_MS);
    });
  }
});
