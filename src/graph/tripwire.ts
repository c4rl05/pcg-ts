/**
 * The tripwire: a cook fails if any node's output moved after that node
 * finished producing it.
 *
 * WHY THIS EXISTS. A node's inputs and its cooked outputs are immutable
 * BY CONTRACT (see `NodeExecuteArgs.inputs`) and by nothing else. A node
 * that writes into a column it was handed — instead of cloning first —
 * corrupts the cache of the node UPSTREAM of it. The corruption is
 * silent, because the cached bytes and the bytes the cook goes on to use
 * are the same bytes: a second cook reads the corrupted cache, a
 * partitioned cook corrupts it the same way at the same point, and the
 * golden file stores counts and statistics rather than the bytes. So
 * every gate this repository has can be green while a node quietly
 * rewrites its neighbour's output. That is not hypothetical arithmetic:
 * it is the exact failure a copy-on-write attribute column makes
 * reachable, because sharing a column between a node's input and its
 * output turns "wrote where it should have cloned" from a wasted
 * allocation into a wrong answer.
 *
 * WHAT IT DOES. When armed, the executor hands every finished node's
 * outputs to {@link Tripwire.record}, which deep-copies every byte
 * reachable from them — attribute columns, string tables, the three
 * topology arrays, instance transforms and channels — along with the
 * shape around those bytes (item kinds, tags, revs, counts, attribute
 * names, types, tuple sizes, default values). {@link Tripwire.sweep}
 * then compares the live bytes against the copy and throws a
 * {@link TripwireError} naming the node, the output pin, the item, the
 * domain, the attribute and the first element that differs.
 *
 * WHY A COPY RATHER THAN A HASH. A hash says a column changed; it cannot
 * say WHICH point moved, or what the value was before. The whole purpose
 * of this is to start a debugging session from the failure message, so it
 * keeps the bytes and pays for them. The price is that an armed cook
 * holds roughly twice the memory of an unarmed one — which is why it is
 * off by default and not a thing to leave on.
 *
 * WHAT IT CANNOT SEE. Read this before reading anything into a green run:
 * several of these are STRUCTURAL, not edge cases, and one of them
 * (fusion) silently removes the guard from most of a chain.
 *
 *   - FUSED DEVICE-RESIDENT RUNS. A fused run caches ONLY its terminal —
 *     interior members hold no cache entry by design — so only the
 *     terminal's output is watched. Measured on a five-node chain: two of
 *     the five nodes watched. A device-resident spawn terminal snapshots
 *     0 bytes where the same graph on the CPU path snapshots 528 KB. So
 *     fusing a chain takes the guard off every node but its last, and a
 *     cook with a GPU resolver is watched far less than the same cook
 *     without one. Run the CPU path when the tripwire is the point.
 *   - `World` AND STREAMING. `World` cooks each cell with its own options
 *     and does not pass this one along, so a cell is never armed by a
 *     caller. Under `PCG_TRIPWIRE` each cell then opens its OWN session
 *     and sweeps at its own end — which means a cell's output being
 *     written by a LATER cell, the cross-cell case, is invisible.
 *   - BROWSER WORKERS. The env var is read off `process`, which does not
 *     exist in a browser worker, so `PCG_TRIPWIRE` can never arm one. A
 *     cook inside a worker has to be armed through the option.
 *   - MUTATION BETWEEN COOKS. The snapshot starts when a node finishes,
 *     so damage done to a cached output after the previous cook returned
 *     and before this one started is already in the "before" bytes. What
 *     this catches is a change DURING a cook.
 *   - A REPLACED REFERENCE rather than a rewritten buffer. The probes pin
 *     the objects the node handed over, so `item.geo = otherGeometry`, or
 *     `outputs.out[0] = otherItem`, is unseen: the tripwire goes on
 *     watching the geometry that was there. Both need a cast past
 *     `readonly` to write at all, which is why this is a gap and not a
 *     hole.
 *   - Mutation of anything it does not copy: params, the graph itself,
 *     a Field's closure state, host objects a node captured.
 *   - Device-resident instances. Their transforms live in GPU memory and
 *     reading them throws, so only the asset ids and counts are watched.
 *   - A node that mutates its own output BEFORE it returns. That is legal
 *     — the output is not yet anyone's cache — and it is invisible here
 *     by construction, since the snapshot is taken at the moment the node
 *     hands the outputs over.
 *   - A mutation that is put back before the next sweep. In `"cook"` mode
 *     the sweep happens once, at the end; a node that scribbles and
 *     restores is not caught. `"node"` mode narrows that window to one
 *     node.
 *   - Capacity beyond `count`. Bytes past the used prefix of a column are
 *     allocation slack, not data, and a resize legitimately rewrites them.
 *   - An instance batch whose channels cannot be read at all (a hand-built
 *     one carrying both spellings of colour). Its transforms are still
 *     watched, its channels are not, and the report says which batch —
 *     see {@link Tripwire.blindSpots}.
 *
 * WHAT IT RETAINS, AND WHY THERE IS A BUDGET. Every probe closes over the
 * object the node handed over, so nothing a watched cook produced can be
 * collected until the outermost cook ends — including a loop body's
 * outputs for EVERY iteration, which is deliberate: `forEach` accumulates
 * its iterations' items into its own output, so iteration 1's geometry is
 * still writable while iteration 7 runs. The cost is that retention grows
 * with iterations rather than with the body, and a small synthetic loop
 * reached 268.6 MB over 402 watched outputs. {@link TripwireSettings} caps
 * it, so a runaway ends in a message naming the limit instead of an
 * out-of-memory abort on the graph someone armed this for.
 *
 * HOW TO ARM IT. `cook(graph, { tripwire: true })`. `PCG_TRIPWIRE=1` arms
 * every cook that does not say otherwise, which is how a whole test run is
 * put under it without editing a call site; `PCG_TRIPWIRE_BUDGET_MB` moves
 * the memory ceiling the same way. Both are read at the START OF EACH
 * COOK, so a test may set or delete them at runtime.
 *
 * `PCG_TRIPWIRE=node` IS NOT THE SUITE VERSION OF THAT. `"node"` mode is
 * for isolating one culprit on one graph; over a whole suite it measured
 * ~300x slower and produced 47 timeouts against bounds tuned for an
 * unarmed cook, none of them a real fault. Use `=1` for a suite or a
 * corpus, and `"node"` on the single graph `"cook"` pointed at.
 *
 * A TEST THAT MUTATES ON PURPOSE OPTS OUT with `tripwire: false`, per
 * cook, which declines the environment's default — see
 * `src/nodes/topologyAliasing.test.ts`, whose controls plant a vandal and
 * then ask whether their OWN comparator sees it. Pass it on every cook
 * such a test makes: the sweep happens at the end of the cook that is
 * armed, not the one that did the writing.
 *
 * NESTED COOKS. The handle threads through `NodeExecuteArgs.tripwire`, and
 * the three wrapper node types (`subgraph`, `forEach`, `repeatUntil`)
 * forward it into their inner cooks the way they already forward `signal`,
 * `budgetMs` and `gpu`. Inner nodes are recorded under `outer/inner` paths
 * and swept by the OUTERMOST cook, so a body's output stays watched after
 * the body's own cook has returned. A composite node from outside the
 * library that does not forward it still gets covered under `PCG_TRIPWIRE`,
 * because its inner cook then arms a session of its own — narrower (it
 * sweeps at the inner cook's end) but not nothing.
 *
 * COST WHEN OFF, AND WHAT THAT MEASUREMENT IS WORTH. `resolveTripwire`
 * returns `undefined` and every hook in the executor is `tripwire?.…`
 * against it: four undefined checks per node, none inside a node's own
 * loops, and no allocation. Measured against HEAD without the hooks at
 * all — four interleaved rounds, each round repeating its own measurement
 * three times so the repeats bound what the round is worth (Node 22,
 * 2026-09-20): corpus round medians 1860 / 2305 / 2005 / 2030 ms with the
 * hooks against 1953 / 1985 / 1903 / 2845 ms without; Eiffel 293 / 334 /
 * 308 / 294 ms against 308 / 302 / 298 / 463 ms. The hooked build came out
 * faster in some rounds and slower in others, the fastest run of all was a
 * hooked one, and the spread WITHIN a single round ran 4% to 13% — several
 * times any gap between the arms. So: below this machine's floor, which is
 * the honest claim, and stronger than a number that pretends otherwise.
 *
 * COST WHEN ON, MEASURED the way that survives a noisy box: unarmed,
 * unarmed again, then armed, all in one process, so the two unarmed runs'
 * own disagreement is the control.
 *   - The corpus (95 graphs): unarmed 2428/2040/1978/2187 ms, the control
 *     arm 2190/1889/2000/2203 ms, armed 2061/2042/2885/2136 ms. The armed
 *     arm sits INSIDE the two unarmed arms' disagreement — the snapshot of
 *     41 MB peak across 356 watched node outputs does not show against two
 *     seconds of cooking.
 *   - Eiffel: unarmed 351/334/331/335/363/318 ms, control
 *     339/328/314/317/324/296 ms — the two agree within 5%, so the harness
 *     is steady here — and armed 540/577/521/519/531/476 ms. About 1.6x,
 *     holding 273 MB across 1608 watched node outputs (the `forEach`
 *     bodies' included).
 *   - `"node"` mode: 5.5-6.4 s on the corpus, 73-82 s on Eiffel. That is
 *     what quadratic costs here, and why it is a debugging mode.
 */
import { DOMAINS, type Attribute, type Domain } from "../data/index.js";
import type {
  DataCollection,
  DataItem,
  DataValue,
  InstanceAttributes,
  InstanceBatch,
} from "./data.js";
import { instanceAttributesOf, isDeviceResidentInstances } from "./data.js";

/**
 * How often the tripwire compares.
 *
 * - `"cook"` sweeps once, when the outermost cook finishes. Linear in the
 *   bytes the cook produced, and the mode to leave armed: over 904 tests
 *   it had no measurable cost at all.
 * - `"node"` sweeps after every node at every depth, so the report also
 *   names the node that was cooking when the change appeared. Quadratic
 *   in the bytes the cook produced.
 *
 * `"node"` IS FOR ISOLATING ONE CULPRIT ON ONE GRAPH, NOT FOR RUNNING A
 * SUITE. Reach for it after `"cook"` has told you something moved and you
 * want to know who moved it — on the one graph that moved. It measured
 * about 300x slower on a whole-suite run, which is not a number any
 * existing timeout survives: that run produced 47 vitest timeouts and one
 * budget failure, none of them a real fault, purely because every bound in
 * the suite is tuned for an unarmed cook. A CI run, a corpus run, or
 * anything with a clock on it wants `"cook"`.
 */
export type TripwireMode = "cook" | "node";

/**
 * The knobs, when a bare mode is not enough.
 *
 * `cook(g, { tripwire: { mode: "node", budgetBytes: 2 ** 31 } })`.
 */
export interface TripwireSettings {
  /** See {@link TripwireMode}. Default `"cook"`. */
  readonly mode?: TripwireMode;
  /**
   * How many bytes of snapshot the cook may hold before it fails rather
   * than grows. Default {@link DEFAULT_BUDGET_BYTES}.
   *
   * There is a default at all because the alternative is an out-of-memory
   * abort on the very graph someone armed this for, with no message and
   * no culprit — the worst outcome a debugging aid can have. The snapshot
   * is a byte-for-byte copy of every watched output, so an armed cook
   * holds roughly twice what it produces, and a loop body's per-iteration
   * outputs are ALL retained (see the retention note in the header).
   */
  readonly budgetBytes?: number;
}

/**
 * The handle an armed cook carries: `CookOptions.tripwireSession`, handed
 * to every node as `NodeExecuteArgs.tripwire`, and forwarded by composite
 * nodes into their inner cooks so a body's outputs are watched by the
 * outermost cook.
 *
 * This is NOT how a caller arms a cook — `CookOptions.tripwire` is, and it
 * takes a flag rather than a handle so that the two jobs cannot be
 * confused. A node never calls anything on this but {@link scope}; the
 * rest is executor plumbing.
 */
export interface Tripwire {
  /** See {@link TripwireMode}. */
  readonly mode: TripwireMode;
  /**
   * 0 for the session the outermost cook created, one more for each
   * wrapper node it passed through. The executor sweeps at the end of a
   * cook only at depth 0 — an inner cook's outputs stay watched until the
   * outer cook is done with them.
   */
  readonly depth: number;
  /** How many node outputs are currently watched. */
  readonly watched: number;
  /** How many bytes the snapshots hold. What arming this costs in memory. */
  readonly heldBytes: number;
  /** The ceiling {@link heldBytes} may not cross. See {@link TripwireSettings.budgetBytes}. */
  readonly budgetBytes: number;
  /**
   * What the snapshot could not read and therefore is not watching, one
   * line each. Empty on every cook this library produces; a host that
   * hand-builds instance batches can put an unreadable one here.
   */
  readonly blindSpots: readonly string[];
  /**
   * The handle to give a nested cook run from inside node `nodeId`; inner
   * nodes are then reported as `nodeId/innerId`.
   */
  scope(nodeId: string): Tripwire;
  /** Snapshot a node's finished outputs. Called by the executor. */
  record(nodeId: string, nodeType: string, outputs: Record<string, DataCollection>): void;
  /**
   * Compare every snapshot against the live bytes and throw on the first
   * node that moved. `cookingNow` is the node that had just finished when
   * the sweep was taken, for the report; `undefined` at the end of a cook.
   */
  sweep(cookingNow: string | undefined): void;
}

/**
 * A node's output changed after the node finished producing it.
 *
 * Deliberately NOT in `DIAGNOSTIC_CODES`: that table is the additive-only
 * catalogue of what can be wrong with a GRAPH, and it is rendered into
 * `docs/errors.md` for people writing graphs. This is never a fault in a
 * graph. It is a fault in a node's implementation — in this library or in
 * one somebody wrote against it — and it can only be seen by a developer
 * who armed the tripwire on purpose.
 */
export class TripwireError extends Error {
  /** Each node whose output moved, in the order the sweep found them. */
  readonly violations: readonly TripwireViolation[];
  /**
   * The sweep stopped at its report cap and there may be more. One
   * offender usually damages several of its neighbours, so this is the
   * common case rather than the alarming one.
   */
  readonly truncated: boolean;
  /** See {@link Tripwire.blindSpots}: what this cook was not watching. */
  readonly blindSpots: readonly string[];

  constructor(
    violations: readonly TripwireViolation[],
    truncated = false,
    blindSpots: readonly string[] = [],
  ) {
    super(renderViolations(violations, truncated, blindSpots));
    this.name = "TripwireError";
    this.violations = violations;
    this.truncated = truncated;
    this.blindSpots = blindSpots;
  }
}

/**
 * The tripwire's own snapshot outgrew its budget.
 *
 * A separate class from {@link TripwireError} because it is a different
 * event: nothing is wrong with the graph or with any node — the DEBUG AID
 * ran out of room. Conflating the two would make "your node corrupted a
 * cache" and "turn the budget up" the same failure.
 */
export class TripwireBudgetError extends Error {
  /** The ceiling that was crossed. */
  readonly budgetBytes: number;
  /** What the snapshot held when it stopped. */
  readonly heldBytes: number;
  /** The node whose output took it over. */
  readonly node: string;

  constructor(budgetBytes: number, heldBytes: number, node: string, watched: number) {
    super(
      `tripwire: ran out of budget. Snapshotting node "${node}" took the copy to ` +
        `${mib(heldBytes)} across ${watched} watched node outputs, past the ` +
        `${mib(budgetBytes)} limit.\n` +
        "  The tripwire keeps a byte-for-byte copy of every node's output so it can name\n" +
        "  the element that moved, so an armed cook holds about twice what it produces —\n" +
        "  and a loop body's outputs are kept for every iteration, because an accumulated\n" +
        "  one can still be written after its iteration ends.\n" +
        "  Raise it with `cook(g, { tripwire: { budgetBytes: " +
        `${budgetBytes * 2} } })\`, or set PCG_TRIPWIRE_BUDGET_MB=${Math.ceil(
          (budgetBytes * 2) / (1024 * 1024),
        )}, ` +
        "or narrow\n  the cook with `CookOptions.outputs` and arm the part you suspect.",
    );
    this.name = "TripwireBudgetError";
    this.budgetBytes = budgetBytes;
    this.heldBytes = heldBytes;
    this.node = node;
  }
}

function mib(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

/**
 * Is this the tripwire's own failure rather than the graph's?
 *
 * Every layer that wraps a failing cook — the executor's
 * `NodeExecutionError`, `forEach`'s "which iteration" Error,
 * `repeatUntil`'s "which round" — asks this and rethrows verbatim, for the
 * reason each already rethrows a cancellation: wrapping loses the class
 * (`World` rethrows verbatim and the worker protocol reconstructs by
 * `error.name`) and prints the multi-line report a second time inside the
 * wrapper's own message. A predicate rather than three `instanceof` pairs,
 * so a third failure mode added here cannot be forgotten at two of the
 * three sites.
 */
export function isTripwireFailure(err: unknown): boolean {
  return err instanceof TripwireError || err instanceof TripwireBudgetError;
}

/** One node's output, and the first place it differs from its snapshot. */
export interface TripwireViolation {
  /** The node's id, prefixed by the wrapper nodes it cooked inside. */
  readonly node: string;
  /** The node type that produced it. */
  readonly type: string;
  /** Output pin, item, domain, attribute — where inside the output. */
  readonly at: string;
  /** What differs, in the report's words. */
  readonly detail: string;
  /** The node that had just finished when this was noticed, in `"node"` mode. */
  readonly noticedAfter?: string;
}

// ---------------------------------------------------------------------------
// Arming
// ---------------------------------------------------------------------------

/**
 * The default ceiling on the snapshot: 4 GiB.
 *
 * SET FROM WHAT THIS REPOSITORY ACTUALLY COOKS, not from a round number
 * that felt safe. Measured: the corpus peaks at 41 MB on its largest
 * graph, the Eiffel skeleton at its plain depth holds 273 MB, and the
 * heaviest cook here — the same skeleton at `?rivets` depth, 860,000
 * instances — peaks between 2.1 and 2.5 GiB. A 512 MiB default was tried
 * first and it failed 17 of this repository's own tests under
 * `PCG_TRIPWIRE=1`, which is a default that makes the whole-suite run
 * useless rather than one that protects anybody.
 *
 * So this is a RUNAWAY guard, not a diet. What it is really for is the
 * loop whose retention grows with its iterations (see the header): that
 * shape climbs without bound and reaches any ceiling, so a ceiling turns
 * it into a message naming the node and the limit instead of an
 * out-of-memory abort with neither.
 *
 * On a memory-constrained machine, LOWER it — `PCG_TRIPWIRE_BUDGET_MB`, or
 * {@link TripwireSettings.budgetBytes} — because an armed cook holds this
 * on top of what the cook itself needs, and a 4 GiB snapshot on a 4 GB box
 * dies before this ever fires.
 */
export const DEFAULT_BUDGET_BYTES = 4 * 1024 * 1024 * 1024;

/**
 * `PCG_TRIPWIRE` as a mode. `1`/`true`/`on`/`cook` arm `"cook"`, `node`
 * arms `"node"`, anything else (including an absent `process`, which is
 * the browser and every worker) leaves it off.
 *
 * READ AT THE START OF EVERY COOK rather than once at module load. A
 * module-load read is the shape where `process.env.PCG_TRIPWIRE = "1"` in
 * a test setup file does nothing at all if this module was imported first,
 * and where `delete process.env.PCG_TRIPWIRE` cannot disarm — both silent.
 * It is one property lookup per cook, not per node.
 */
function readEnvMode(): TripwireMode | undefined {
  const raw = env("PCG_TRIPWIRE");
  if (raw === undefined) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "node") return "node";
  if (value === "1" || value === "true" || value === "cook" || value === "on") return "cook";
  return undefined;
}

/** `PCG_TRIPWIRE_BUDGET_MB`, or the default. Ignored when it is not a positive number. */
function readEnvBudget(): number {
  const raw = env("PCG_TRIPWIRE_BUDGET_MB");
  if (raw === undefined) return DEFAULT_BUDGET_BYTES;
  const mb = Number(raw.trim());
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : DEFAULT_BUDGET_BYTES;
}

function env(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

/**
 * The session an armed cook uses, or `undefined` when it is not armed.
 *
 * `inherited` wins outright: a nested cook continues the outer session
 * whatever the flag or the environment say, which is what keeps a body's
 * outputs watched by the cook that owns them. Otherwise `false` declines
 * even when the environment arms everything else, and `undefined` falls
 * through to `PCG_TRIPWIRE`.
 */
export function resolveTripwire(
  flag: boolean | TripwireMode | TripwireSettings | undefined,
  inherited?: Tripwire,
): Tripwire | undefined {
  if (inherited !== undefined) return inherited;
  if (flag === false) return undefined;
  if (flag === undefined) {
    const mode = readEnvMode();
    return mode === undefined ? undefined : new Session(mode, readEnvBudget());
  }
  if (flag === true) return new Session("cook", readEnvBudget());
  if (flag === "cook" || flag === "node") return new Session(flag, readEnvBudget());
  // A `Tripwire` satisfies `TripwireSettings` STRUCTURALLY — it has a
  // `mode` and a `budgetBytes` — and an excess-property check only fires
  // on an object literal, so `cook(g, { tripwire: handle })` typechecks
  // and would quietly open a SECOND session that sweeps its own empty
  // list. That is the exact confusion splitting the option was meant to
  // end, so it is refused in words rather than allowed to look like it
  // worked.
  if (typeof (flag as { scope?: unknown }).scope === "function") {
    throw new TypeError(
      "CookOptions.tripwire takes a flag (true, \"cook\", \"node\", or { mode, budgetBytes }), " +
        "not a Tripwire handle. To continue an outer cook's session inside a composite node, " +
        "pass the handle as `tripwireSession` instead: " +
        "cook(inner, { signal, budgetMs, gpu, tripwireSession: tripwire }).",
    );
  }
  return new Session(flag.mode ?? "cook", flag.budgetBytes ?? readEnvBudget());
}

// ---------------------------------------------------------------------------
// Probes: what a snapshot holds
// ---------------------------------------------------------------------------

/**
 * A typed-array constructor, recovered from an instance so a byte offset
 * can be decoded back into a value for the report.
 */
interface TypedArrayCtor {
  readonly BYTES_PER_ELEMENT: number;
  readonly name: string;
  new (buffer: ArrayBufferLike, byteOffset: number, length: number): ArrayLike<number>;
}

/** One watched buffer: the bytes as they were, and how to read them now. */
interface ByteProbe {
  /** Where this buffer sits inside the node's outputs, in the report's words. */
  readonly at: string;
  /** The element type, for turning a byte offset back into a value. */
  readonly ctor: TypedArrayCtor;
  /** Components per element, so a flat index becomes "point 417, component 1". */
  readonly tupleSize: number;
  /** What one index counts: `point`, `vertex`, `primitive`, `instance`, `entry`. */
  readonly unit: string;
  /** The bytes at the moment the node handed the output over. */
  readonly before: Uint8Array;
  /** The live bytes now; `undefined` when the buffer the snapshot watched is gone. */
  read(): Uint8Array | undefined;
}

/** One watched piece of shape: names, counts, types, tags, a string table. */
interface TextProbe {
  readonly at: string;
  readonly before: string;
  read(): string;
}

/** One node's outputs, as watched. */
interface Watched {
  readonly node: string;
  readonly type: string;
  readonly bytes: ByteProbe[];
  readonly text: TextProbe[];
}

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

class Session implements Tripwire {
  readonly mode: TripwireMode;
  readonly budgetBytes: number;
  readonly depth = 0;
  /**
   * Every node output recorded so far, at every depth. Shared with the
   * scopes handed to nested cooks, so the outermost sweep sees a
   * `forEach` body's nodes as well as its own.
   */
  readonly list: Watched[] = [];
  /** Deduped: one line per distinct thing this cook could not read. */
  readonly blind = new Set<string>();
  private bytes = 0;

  constructor(mode: TripwireMode, budgetBytes: number) {
    this.mode = mode;
    this.budgetBytes = budgetBytes;
  }

  get watched(): number {
    return this.list.length;
  }

  get heldBytes(): number {
    return this.bytes;
  }

  get blindSpots(): readonly string[] {
    return [...this.blind];
  }

  scope(nodeId: string): Tripwire {
    return new Scope(this, nodeId, 1);
  }

  record(nodeId: string, nodeType: string, outputs: Record<string, DataCollection>): void {
    const entry = snapshot(nodeId, nodeType, outputs, this.blind);
    for (const probe of entry.bytes) this.bytes += probe.before.byteLength;
    this.list.push(entry);
    // Checked AFTER the copy rather than predicted before it: one node's
    // output is bounded by what the node produced, so the overshoot is
    // bounded too, and stopping here means the message can name the node
    // that went over.
    if (this.bytes > this.budgetBytes) {
      throw new TripwireBudgetError(this.budgetBytes, this.bytes, nodeId, this.list.length);
    }
  }

  sweep(cookingNow: string | undefined): void {
    sweepList(this.list, cookingNow, this.blindSpots);
  }
}

/**
 * The same session, seen from inside a wrapper node's body.
 *
 * The three fields are assigned in the body rather than declared as
 * constructor PARAMETER PROPERTIES, which is not a style choice:
 * `src/cli/renderPng.test.ts` runs this library through Node's own
 * strip-only TypeScript loader, and that loader refuses a parameter
 * property outright (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`) because erasing
 * one would have to EMIT an assignment rather than delete a type. Anything
 * reachable from a cook has to stay inside what stripping can do.
 */
class Scope implements Tripwire {
  private readonly root: Session;
  private readonly prefix: string;
  readonly depth: number;

  constructor(root: Session, prefix: string, depth: number) {
    this.root = root;
    this.prefix = prefix;
    this.depth = depth;
  }

  get mode(): TripwireMode {
    return this.root.mode;
  }

  get watched(): number {
    return this.root.watched;
  }

  get heldBytes(): number {
    return this.root.heldBytes;
  }

  get budgetBytes(): number {
    return this.root.budgetBytes;
  }

  get blindSpots(): readonly string[] {
    return this.root.blindSpots;
  }

  scope(nodeId: string): Tripwire {
    return new Scope(this.root, `${this.prefix}/${nodeId}`, this.depth + 1);
  }

  record(nodeId: string, nodeType: string, outputs: Record<string, DataCollection>): void {
    this.root.record(`${this.prefix}/${nodeId}`, nodeType, outputs);
  }

  sweep(cookingNow: string | undefined): void {
    this.root.sweep(cookingNow);
  }
}

// ---------------------------------------------------------------------------
// Taking a snapshot
// ---------------------------------------------------------------------------

function snapshot(
  node: string,
  type: string,
  outputs: Record<string, DataCollection>,
  blind: Set<string>,
): Watched {
  const bytes: ByteProbe[] = [];
  const text: TextProbe[] = [];

  // The pin set and each pin's item count: an item appended to or dropped
  // from a cached collection is a mutation like any other.
  const pins = Object.keys(outputs).sort();
  text.push({
    at: "the output pins",
    before: shapeOfOutputs(outputs, pins),
    read: () => shapeOfOutputs(outputs, Object.keys(outputs).sort()),
  });

  for (const pin of pins) {
    const items = outputs[pin] ?? [];
    for (let i = 0; i < items.length; i++) {
      watchItem(`output "${pin}", item ${i}`, items[i]!, bytes, text, blind, node);
    }
  }
  return { node, type, bytes, text };
}

function shapeOfOutputs(outputs: Record<string, DataCollection>, pins: readonly string[]): string {
  return pins.map((pin) => `${pin}:${(outputs[pin] ?? []).length}`).join(" ");
}

function watchItem(
  at: string,
  item: DataItem,
  bytes: ByteProbe[],
  text: TextProbe[],
  blind: Set<string>,
  node: string,
): void {
  text.push({
    at: `${at} — its kind, tags and rev`,
    before: itemShape(item),
    read: () => itemShape(item),
  });

  if (item.kind === "geometry") {
    const geo = item.geo;
    text.push({
      at: `${at} (geometry) — its element counts`,
      before: countsOf(geo),
      read: () => countsOf(geo),
    });
    for (const domain of DOMAINS) {
      const set = geo.attrs[domain];
      text.push({
        at: `${at} (geometry), ${domain} domain — its attribute names`,
        before: set.names().join(","),
        read: () => set.names().join(","),
      });
      for (const attr of set) {
        watchAttribute(`${at} (geometry), ${domain} attribute "${attr.name}"`, set, attr, domain, bytes, text);
      }
    }
    watchTopology(at, geo, bytes);
    return;
  }

  if (item.kind === "value") {
    text.push({
      at: `${at} (value)`,
      before: valueText(item.value),
      read: () => valueText(item.value),
    });
    return;
  }

  // Device-resident batches live in GPU memory and reading their
  // transforms throws, so the ids and counts are all there is to watch.
  if (isDeviceResidentInstances(item)) {
    const device = item.deviceBatches ?? [];
    const shape = (): string =>
      device.map((b) => `${b.assetId}:${b.count}`).join(" ");
    text.push({ at: `${at} (device instances)`, before: shape(), read: shape });
    return;
  }

  const batches = item.batches;
  text.push({
    at: `${at} (instances) — its batch shape`,
    before: batchShape(batches),
    read: () => batchShape(item.batches),
  });
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]!;
    const where = `${at} (instances), batch ${b} ("${batch.assetId}")`;
    watchBuffer(`${where} transforms`, batch.transforms, 16, "instance", bytes, () => batch.transforms);
    // ARMING MUST NOT CHANGE WHETHER A COOK SUCCEEDS. `instanceAttributesOf`
    // THROWS on a hand-built batch carrying both spellings of colour — a
    // real thing for a host to hold, and hosts that hand-build batches are
    // exactly who would arm this. Unarmed, such a cook is fine; armed, it
    // used to die on a plain Error that never mentioned the tripwire. So:
    // watch the transforms, skip the channels, and say so in the report.
    const columns = readChannels(batch);
    if (columns === undefined) {
      blind.add(
        `node "${node}", ${where}: its channels could not be read, so only its ` +
          "transforms were watched",
      );
      continue;
    }
    for (const name of Object.keys(columns).sort()) {
      const column = columns[name]!;
      watchBuffer(
        `${where} channel "${name}"`,
        column,
        itemSizeOf(batch, column),
        "instance",
        bytes,
        () => readChannels(batch)?.[name],
      );
    }
  }
}

/** A channel's components per instance, from its length against the count. */
function itemSizeOf(batch: InstanceBatch, column: ArrayLike<number>): number {
  return batch.count > 0 ? Math.max(1, Math.round(column.length / batch.count)) : 1;
}

function watchAttribute(
  at: string,
  set: { count: number; get(name: string): Attribute | undefined },
  attr: Attribute,
  domain: Domain,
  bytes: ByteProbe[],
  text: TextProbe[],
): void {
  const name = attr.name;
  // The attribute is looked up fresh on every read rather than captured:
  // `Attribute.data` is REALLOCATED on growth, and an attribute can be
  // removed and re-added under the same name. A captured reference would
  // go on reporting the bytes of an object the geometry no longer holds.
  const live = (): Attribute | undefined => set.get(name);
  text.push({
    at: `${at} — its type, tuple size and default`,
    before: attrShape(attr),
    read: () => {
      const a = live();
      return a === undefined ? "<removed>" : attrShape(a);
    },
  });
  if (attr.type === "string") {
    text.push({
      at: `${at} — its string table`,
      // JSON, never a NUL-joined line. A probe's text lands verbatim in the
      // failure message, and a stray control byte makes ripgrep skip a
      // whole file SILENTLY — this repository has lost time to exactly
      // that. JSON also keeps apart two tables a join would flatten.
      before: JSON.stringify(attr.stringTable),
      read: () => {
        const a = live();
        return a === undefined ? "<removed>" : JSON.stringify(a.stringTable);
      },
    });
  }
  const usedNow = (a: Attribute | undefined): Uint8Array | undefined => {
    if (a === undefined) return undefined;
    // Capacity past `count` is slack, not data — and `slice` is how the
    // used prefix is taken, not `subarray` over `data.buffer`. A column's
    // read view does not hand out its buffer, because a byte view laid
    // over it is a writable alias of storage a node cache holds, which is
    // the one escape from `Attribute`'s read view that needs no cast. So
    // this COPIES, on both sides of the comparison.
    //
    // It costs nothing this snapshot was not already paying: `before` was
    // copied anyway (a live view would move with the very write this is
    // built to catch), and `read()` runs once per probe per check, where
    // the comparison that follows walks the same bytes.
    const copy = a.data.slice(0, set.count * a.tupleSize);
    return new Uint8Array(copy.buffer, copy.byteOffset, copy.byteLength);
  };
  const before = usedNow(attr);
  if (before === undefined) return;
  bytes.push({
    at,
    ctor: ctorOf(attr.data),
    tupleSize: attr.tupleSize,
    unit: unitOf(domain),
    before,
    read: () => usedNow(live()),
  });
}

function watchTopology(at: string, geo: {
  vertexToPoint: Uint32Array;
  primVertexStart: Uint32Array;
  primVertexCount: Uint32Array;
}, bytes: ByteProbe[]): void {
  watchBuffer(`${at} (geometry), topology vertexToPoint`, geo.vertexToPoint, 1, "vertex", bytes, () => geo.vertexToPoint);
  watchBuffer(`${at} (geometry), topology primVertexStart`, geo.primVertexStart, 1, "primitive", bytes, () => geo.primVertexStart);
  watchBuffer(`${at} (geometry), topology primVertexCount`, geo.primVertexCount, 1, "primitive", bytes, () => geo.primVertexCount);
}

/** Watch a whole typed array (no capacity slack to exclude). */
function watchBuffer(
  at: string,
  array: { buffer: ArrayBufferLike; byteOffset: number; byteLength: number; BYTES_PER_ELEMENT: number },
  tupleSize: number,
  unit: string,
  bytes: ByteProbe[],
  live: () => { buffer: ArrayBufferLike; byteOffset: number; byteLength: number } | undefined,
): void {
  bytes.push({
    at,
    ctor: ctorOf(array),
    tupleSize,
    unit,
    before: copyOf(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)),
    read: () => {
      const now = live();
      return now === undefined
        ? undefined
        : new Uint8Array(now.buffer, now.byteOffset, now.byteLength);
    },
  });
}

function copyOf(view: Uint8Array): Uint8Array {
  const out = new Uint8Array(view.byteLength);
  out.set(view);
  return out;
}

function ctorOf(array: object): TypedArrayCtor {
  return array.constructor as unknown as TypedArrayCtor;
}

function unitOf(domain: Domain): string {
  return domain;
}

function itemShape(item: DataItem): string {
  const tags = [...item.tags].sort().join(",");
  return `${item.kind} tags=[${tags}] rev=${item.rev}`;
}

function countsOf(geo: {
  pointCount: number;
  vertexCount: number;
  primitiveCount: number;
}): string {
  return `point=${geo.pointCount} vertex=${geo.vertexCount} primitive=${geo.primitiveCount}`;
}

function attrShape(attr: Attribute): string {
  const def = attr.defaultValue;
  const text = typeof def === "string" ? JSON.stringify(def) : `[${def.join(",")}]`;
  return `${attr.type} x${attr.tupleSize} default=${text}`;
}

/**
 * A batch's channels, or `undefined` when reading them throws. See the
 * note at the call site: an unreadable batch is a fact about the batch and
 * never a reason for an armed cook to fail where an unarmed one would not.
 */
function readChannels(batch: InstanceBatch): InstanceAttributes | undefined {
  try {
    return instanceAttributesOf(batch);
  } catch {
    return undefined;
  }
}

function batchShape(batches: readonly InstanceBatch[]): string {
  return batches
    .map((b) => {
      const columns = readChannels(b);
      const names = columns === undefined ? "<unreadable>" : Object.keys(columns).sort().join(",");
      return `${b.assetId}:${b.count}:{${names}}`;
    })
    .join(" ");
}

/** A `DataValue` as text. Small and closed, so no general serializer is needed. */
function valueText(value: DataValue): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return numberText(value);
  return `[${value.map(numberText).join(",")}]`;
}

function numberText(n: number): string {
  return Object.is(n, -0) ? "-0" : String(n);
}

// ---------------------------------------------------------------------------
// Sweeping
// ---------------------------------------------------------------------------

/**
 * How many violating nodes one error reports. One node writing where it
 * should have cloned usually shows up on several of its neighbours at
 * once, and four of those tell the same story as forty; the message says
 * when it stopped early rather than implying it found them all.
 */
const MAX_REPORTED = 4;

function sweepList(
  list: readonly Watched[],
  cookingNow: string | undefined,
  blindSpots: readonly string[],
): void {
  const violations: TripwireViolation[] = [];
  let stoppedEarly = false;
  for (const entry of list) {
    const found = checkEntry(entry);
    if (found === undefined) continue;
    violations.push(
      cookingNow === undefined
        ? { node: entry.node, type: entry.type, ...found }
        : { node: entry.node, type: entry.type, ...found, noticedAfter: cookingNow },
    );
    if (violations.length >= MAX_REPORTED) {
      stoppedEarly = true;
      break;
    }
  }
  if (violations.length > 0) throw new TripwireError(violations, stoppedEarly, blindSpots);
}

function checkEntry(entry: Watched): { at: string; detail: string } | undefined {
  for (const probe of entry.text) {
    const now = probe.read();
    if (now === probe.before) continue;
    return { at: probe.at, detail: `was ${quote(probe.before)}, now ${quote(now)}` };
  }
  for (const probe of entry.bytes) {
    const now = probe.read();
    if (now === undefined) {
      return { at: probe.at, detail: "the buffer it watched is gone" };
    }
    if (now.byteLength !== probe.before.byteLength) {
      return {
        at: probe.at,
        detail: `its length went from ${probe.before.byteLength} bytes to ${now.byteLength}`,
      };
    }
    const at = firstDifferingByte(probe.before, now);
    if (at < 0) continue;
    return { at: probe.at, detail: describeByteDiff(probe, now, at) };
  }
  return undefined;
}

/**
 * A probe's text for the report. Quoted, so an empty or space-padded value
 * is visible — except when it is already a JSON array (a string table),
 * where a second pair of quotes only makes it harder to read.
 */
function quote(text: string): string {
  if (text === "") return "(empty)";
  return text.startsWith("[") ? text : `"${text}"`;
}

/**
 * The first byte at which two equal-length views differ, or -1. Four bytes
 * at a time while both views are word-aligned, which every column of a
 * 4-byte element type is; a `u8` column at an odd offset takes the byte
 * loop.
 */
function firstDifferingByte(a: Uint8Array, b: Uint8Array): number {
  const n = a.byteLength;
  let i = 0;
  if ((a.byteOffset & 3) === 0 && (b.byteOffset & 3) === 0) {
    const words = n >>> 2;
    const wa = new Uint32Array(a.buffer, a.byteOffset, words);
    const wb = new Uint32Array(b.buffer, b.byteOffset, words);
    let w = 0;
    while (w < words && wa[w] === wb[w]) w++;
    i = w << 2;
  }
  for (; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}

function describeByteDiff(probe: ByteProbe, now: Uint8Array, byteAt: number): string {
  const size = probe.ctor.BYTES_PER_ELEMENT;
  const flat = Math.floor(byteAt / size);
  const index = Math.floor(flat / probe.tupleSize);
  const component = flat % probe.tupleSize;
  const was = decode(probe.before, probe.ctor, flat);
  const is = decode(now, probe.ctor, flat);
  const where =
    probe.tupleSize === 1
      ? `${probe.unit} ${index}`
      : `${probe.unit} ${index}, component ${component}`;
  const values =
    was === undefined || is === undefined
      ? `byte ${byteAt} changed`
      : `was ${numberText(was)}, now ${numberText(is)}`;
  const rest = countDiffering(probe.before, now);
  const more =
    rest.count > 1 ? ` (${rest.partial ? "at least " : ""}${rest.count} bytes differ here)` : "";
  return `${where} (${probe.ctor.name}, byte ${byteAt}): ${values}${more}`;
}

function decode(view: Uint8Array, ctor: TypedArrayCtor, flat: number): number | undefined {
  const size = ctor.BYTES_PER_ELEMENT;
  if ((view.byteOffset % size) !== 0) return undefined;
  const length = Math.floor(view.byteLength / size);
  if (flat >= length) return undefined;
  try {
    return new ctor(view.buffer, view.byteOffset, length)[flat];
  } catch {
    return undefined;
  }
}

/**
 * How many bytes differ. Capped twice — at a thousand differences and at a
 * mebibyte scanned — so that a wholly rewritten 200 MB column is cheap to
 * report; `partial` says a cap was hit, because "1000 bytes differ" and
 * "at least 1000 bytes differ" are different claims.
 */
function countDiffering(a: Uint8Array, b: Uint8Array): { count: number; partial: boolean } {
  let n = 0;
  const scanned = Math.min(a.byteLength, 1 << 20);
  for (let i = 0; i < scanned; i++) {
    if (a[i] !== b[i]) {
      n++;
      if (n >= 1000) return { count: n, partial: true };
    }
  }
  return { count: n, partial: scanned < a.byteLength };
}

function renderViolations(
  violations: readonly TripwireViolation[],
  truncated: boolean,
  blindSpots: readonly string[],
): string {
  const count = truncated
    ? `the first ${violations.length} of them`
    : `${violations.length} nodes`;
  const lines: string[] = [
    violations.length === 1 && !truncated
      ? "tripwire: a node's output changed after the node finished producing it."
      : `tripwire: ${count} had their output changed after they finished producing it.`,
  ];
  for (const v of violations) {
    lines.push(`  node "${v.node}" (${v.type})`);
    lines.push(`    where: ${v.at}`);
    lines.push(`    what:  ${v.detail}`);
    if (v.noticedAfter !== undefined) {
      lines.push(`    seen:  right after node "${v.noticedAfter}" finished`);
    }
  }
  lines.push(
    "  A node's inputs and its cooked outputs are immutable: the same objects are",
    "  an upstream node's cache. Clone before writing (`cloneGeometry`), or build a",
    "  fresh geometry.",
  );
  // Only worth saying in "cook" mode. In "node" mode every violation
  // already carries the answer, and telling someone to turn on what they
  // have turned on is how a good message loses its credit.
  if (violations.every((v) => v.noticedAfter === undefined)) {
    lines.push(
      '  Re-run with `tripwire: "node"` to learn which node was cooking when the',
      "  change appeared (quadratic in the cook's bytes — see CookOptions.tripwire).",
    );
  }
  // Said whether or not it is related to the violation above, because the
  // thing this report must never do is let a reader conclude "nothing else
  // moved" from a sweep that was not looking everywhere.
  if (blindSpots.length > 0) {
    lines.push("  Not everything was watched on this cook:");
    for (const spot of blindSpots) lines.push(`    - ${spot}`);
  }
  return lines.join("\n");
}
