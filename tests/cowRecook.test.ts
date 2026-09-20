/**
 * Copy-on-write, put in front of the failure it was built to allow: a
 * SECOND cook.
 *
 * WHY AN ORDINARY TEST CANNOT SEE THIS. Since `deriveGeometry` replaced
 * `cloneGeometry` at every node, a node's output SHARES its input's
 * unchanged columns, and the only thing keeping a write off a cached
 * upstream column is that every write goes through `Attribute.writable()`.
 * A node that reaches around that route edits its producer's cache in
 * place. Cooking a graph from cold hides it completely — every node is
 * recomputed in dependency order, so a corrupted upstream value is
 * overwritten before anything reads it. It surfaces only when the upstream
 * node is SERVED FROM ITS CACHE, which is the second cook, which is what
 * an editor, a streaming world and the worker pool all do.
 *
 * THE PROTOCOL. Per graph: cook (O1), change one param, cook (O2), then
 * build the same graph from scratch, apply the same change and cook it
 * cold (O2fresh). O2 must equal O2fresh — the warm cook served caches the
 * cold one recomputed, so any disagreement is a cache that was edited
 * behind its owner's back. Then put the param back and cook again (O3):
 * O3 must equal O1, which asks the same question of the second cook that
 * the first pair asked of the first. `deriveGeometry`'s own suite
 * (`src/data/derive.test.ts`) proves the fork at every write route; this
 * file proves the graph never finds a route that suite does not know
 * about.
 *
 * ONE GRAPH OBJECT CARRIES ALL OF ITS EDIT POINTS, in sequence, rather
 * than starting fresh per edit. What that buys is NOT accumulating damage:
 * every round reverts its param and asserts O3 == O1 byte for byte, so the
 * data state at the top of round n+1 is provably the state at the top of
 * round 1. What does carry over is the copy-on-write bookkeeping — which
 * columns are still flagged shared, and which have already forked — and
 * that is the state the fork decision actually reads. A column on its
 * ninth cook is being asked a different question than the same column on
 * its first, which a fresh graph per edit would never ask at all.
 *
 * WHAT IS SNAPSHOTTED. Raw bytes, copied: every attribute column over its
 * LIVE range (`count * tupleSize`, never the allocation — capacity beyond
 * the count is not data), every string table, the three topology arrays,
 * every instance batch's transforms and every channel. The copy is
 * load-bearing: a snapshot holding a live view of a shared column would
 * MOVE WITH the corruption it is supposed to catch and compare equal
 * forever.
 *
 * WHAT IS NOT SNAPSHOTTED: `DataItem.rev`. It is an allocation counter
 * off a module-global, so two cooks of one graph legitimately disagree on
 * it and hashing it would make every comparison here fail for a reason
 * that is not about data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DOMAINS,
  Graph,
  cook,
  deserializeGraph,
  forEachNode,
  instanceAttributesOf,
  jitterPoints,
  pointGrid,
  setAttribute,
  subgraphNode,
  transformPoints,
  type DataCollection,
  type Geometry,
  type InstancesItem,
  type NodeHandle,
} from "../src/index.js";
import { canonicalJson } from "../src/cli/fingerprint.js";
// Corpus graphs name primitives, and the names resolve inside
// `deserializeGraph` against a registry the import populates as a side
// effect. Without it every primitive-bearing graph here fails to load.
import "../src/primitives/index.js";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const BUDGET_MS = 8;
const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// The snapshot: a keyed pile of raw bytes.
// ---------------------------------------------------------------------------

/**
 * One cook reduced to `path -> bytes`. Bytes rather than hashes, because
 * the point of failing is saying WHERE: a hash tells you a column moved,
 * the bytes tell you which element of it did.
 */
type Snapshot = Map<string, Uint8Array>;

/** A byte range of a typed array, COPIED. See the header on why the copy. */
function bytesOf(
  view: { readonly buffer: ArrayBufferLike; readonly byteOffset: number; readonly BYTES_PER_ELEMENT: number },
  elements: number,
): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, elements * view.BYTES_PER_ELEMENT).slice();
}

function text(value: string): Uint8Array {
  return encoder.encode(value);
}

/**
 * Record one entry, refusing a key that has already been written. A silent
 * overwrite would drop a whole item from the comparison and read as a
 * pass, which is the one failure mode a comparator must not have.
 */
function put(into: Snapshot, key: string, bytes: Uint8Array): void {
  if (into.has(key)) throw new Error(`snapshot key written twice: ${key}`);
  into.set(key, bytes);
}

function snapshotGeometry(into: Snapshot, prefix: string, geo: Geometry): void {
  put(into, `${prefix}|topo:vertexToPoint`, bytesOf(geo.vertexToPoint, geo.vertexToPoint.length));
  put(into, `${prefix}|topo:primVertexStart`, bytesOf(geo.primVertexStart, geo.primVertexStart.length));
  put(into, `${prefix}|topo:primVertexCount`, bytesOf(geo.primVertexCount, geo.primVertexCount.length));
  for (const domain of DOMAINS) {
    const set = geo.attrs[domain];
    put(into, `${prefix}|${domain}:count`, text(String(set.count)));
    put(into, `${prefix}|${domain}:names`, text(set.names().join("\u0000")));
    for (const attr of set) {
      const key = `${prefix}|${domain}.${attr.name}`;
      put(into, key, bytesOf(attr.data, set.count * attr.tupleSize));
      // Indices alone say nothing: two cooks agree on index 3 while
      // disagreeing on what index 3 spells.
      put(into, `${key}:table`, text(attr.stringTable.join("\u0000")));
      put(into, `${key}:shape`, text(`${attr.type}x${attr.tupleSize}`));
    }
  }
}

function snapshotInstances(into: Snapshot, prefix: string, item: InstancesItem): void {
  // The corpus never cooks against a GPU, so this counts device batches
  // rather than reading them — a device handle's transforms live in GPU
  // memory and reading them throws. A non-zero count shows up as a
  // difference instead of as silence.
  put(into, `${prefix}|deviceBatches`, text(String(item.deviceBatches?.length ?? 0)));
  put(into, `${prefix}|batches`, text(String(item.batches.length)));
  item.batches.forEach((batch, i) => {
    const key = `${prefix}|batch${i}`;
    put(into, `${key}:asset`, text(batch.assetId));
    put(into, `${key}:count`, text(String(batch.count)));
    put(into, `${key}:transforms`, bytesOf(batch.transforms, batch.transforms.length));
    // Read through the normalizer, so a batch spelling its colour as the
    // plain `colors` field compares against one spelling it as the
    // reserved channel rather than against nothing at all.
    const columns = instanceAttributesOf(batch);
    const names = Object.keys(columns).sort();
    put(into, `${key}:channels`, text(names.join("\u0000")));
    for (const name of names) {
      const column = columns[name]!;
      put(into, `${key}:ch.${name}`, bytesOf(column, column.length));
    }
  });
}

function snapshotCollection(into: Snapshot, prefix: string, coll: DataCollection): void {
  put(into, `${prefix}|items`, text(String(coll.length)));
  coll.forEach((item, i) => {
    const key = `${prefix}|${i}`;
    put(into, `${key}|kind`, text(item.kind));
    put(into, `${key}|tags`, text([...item.tags].sort().join("\u0000")));
    if (item.kind === "geometry") snapshotGeometry(into, key, item.geo);
    else if (item.kind === "value")
      put(into, `${key}|value`, text(item.value === undefined ? "undefined" : canonicalJson(item.value)));
    else snapshotInstances(into, key, item);
  });
}

/**
 * The private per-node state the graph keeps, reached by name through one
 * cast. `_nodes` and `NodeCache` are `@internal`, and nothing public hands
 * back a node's memoized output.
 *
 * THE REACH EARNS ITS KEEP because the terminals are the wrong place to
 * look. A corrupted cache belongs to an UPSTREAM node, and whether its
 * damage survives to a declared output depends on what the nodes between
 * happen to overwrite — a filter that drops the touched points, a node
 * that rewrites the whole column, and the terminal reads clean while the
 * cache is wrong and the next edit downstream of it cooks from garbage.
 * Comparing every node's cache asks the question where the answer is.
 */
interface CachedNodeState {
  readonly cache?: { readonly outputs: Record<string, DataCollection> } | undefined;
}
interface GraphCaches {
  readonly _nodes: ReadonlyMap<string, CachedNodeState>;
}

/** The one place this file leaves the public surface. */
function nodeCaches(graph: Graph): ReadonlyMap<string, CachedNodeState> {
  return (graph as unknown as GraphCaches)._nodes;
}

function snapshotCaches(into: Snapshot, graph: Graph, prefix: string): void {
  const nodes = nodeCaches(graph);
  const cached = [...nodes.keys()].sort().filter((id) => nodes.get(id)?.cache !== undefined);
  // The set itself is part of the comparison: a warm graph holding a cache
  // the cold one does not (or the reverse) is worth reading, not smoothing
  // over.
  put(into, `${prefix}|nodes`, text(cached.join("\u0000")));
  for (const id of cached) {
    const outputs = nodes.get(id)!.cache!.outputs;
    for (const pin of Object.keys(outputs).sort()) {
      snapshotCollection(into, `${prefix}:${id}|${pin}`, outputs[pin]!);
    }
  }
}

/**
 * A graph to cook, and the graph whose params get edited. They are one
 * object for a corpus graph; for a wrapped body they are not, and that
 * second graph has caches of its own.
 */
interface Built {
  readonly cook: Graph;
  readonly edit: Graph;
}

const solo = (graph: Graph): Built => ({ cook: graph, edit: graph });

/** One cook: the bytes, and enough of the stats to prove it was warm. */
interface Cooked {
  readonly snap: Snapshot;
  /** Nodes served from a memo entry instead of executed. */
  readonly cached: number;
  readonly cooked: number;
}

/** Cook every declared output and reduce the whole result, caches included. */
async function cookSnapshot(built: Built): Promise<Cooked> {
  const { outputs, stats } = await cook(built.cook, { budgetMs: BUDGET_MS });
  const snap: Snapshot = new Map();
  for (const name of Object.keys(outputs).sort()) {
    snapshotCollection(snap, `out:${name}`, outputs[name]!);
  }
  snapshotCaches(snap, built.cook, "cache");
  // A WRAPPED BODY KEEPS ITS OWN CACHES, and the outer graph's `_nodes`
  // cannot see them: a subgraph persists the inner graph's per-node
  // entries across outer cooks, so a body node that writes a shared column
  // corrupts a cache that lives one level down. Without this the body is
  // covered only where the damage happens to survive the wrapper's output
  // pin — which is the exact hole the reach into `_nodes` exists to close,
  // reopened one level lower.
  if (built.edit !== built.cook) snapshotCaches(snap, built.edit, "body");
  return { snap, cached: stats.cached, cooked: stats.cooked };
}

// ---------------------------------------------------------------------------
// The comparator, and its report.
// ---------------------------------------------------------------------------

/**
 * Where two snapshots first disagree, or `undefined` when they do not.
 * Keys are walked in sorted order so the report is the same on every run,
 * and the first differing BYTE is named — a cook that moved one element of
 * one column should say so, not say "outputs differ".
 */
function firstDifference(a: Snapshot, b: Snapshot, labelA: string, labelB: string): string | undefined {
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  for (const key of keys) {
    const left = a.get(key);
    const right = b.get(key);
    if (left === undefined) return `${key}: absent in ${labelA}, ${right!.length} bytes in ${labelB}`;
    if (right === undefined) return `${key}: ${left.length} bytes in ${labelA}, absent in ${labelB}`;
    const shared = Math.min(left.length, right.length);
    for (let i = 0; i < shared; i++) {
      if (left[i] !== right[i]) {
        return `${key}: first differing byte at ${i} — ${labelA}=${left[i]} ${labelB}=${right[i]}`;
      }
    }
    if (left.length !== right.length) {
      return `${key}: ${left.length} bytes in ${labelA}, ${right.length} in ${labelB}`;
    }
  }
  return undefined;
}

function expectSame(a: Snapshot, b: Snapshot, labelA: string, labelB: string, where: string): void {
  const diff = firstDifference(a, b, labelA, labelB);
  expect(diff === undefined ? "same" : `${where}\n  ${diff}`).toBe("same");
}

// ---------------------------------------------------------------------------
// Edit points.
// ---------------------------------------------------------------------------

interface EditPoint {
  readonly node: string;
  readonly param: string;
  readonly from: unknown;
  readonly to: unknown;
  readonly depth: number;
}

/**
 * Replacement values to try, in order, for a param this file is willing to
 * touch: a finite number or a boolean, and nothing else. A string param is
 * an enum more often than not and a vector param is usually a field, so
 * perturbing either invites a schema refusal that teaches nothing.
 *
 * Integers are nudged DOWN where the value allows it. A count nudged up
 * can turn a cheap corpus graph into an expensive one, and a schema
 * minimum simply refuses a value below it, which costs one skip.
 */
function candidateValues(value: unknown): readonly unknown[] {
  if (typeof value === "boolean") return [!value];
  if (typeof value !== "number" || !Number.isFinite(value)) return [];
  if (Number.isInteger(value)) return value >= 2 ? [value - 1, value + 1] : [value + 1];
  return [value * 0.75, value * 1.25, value + 0.125];
}

/**
 * Longest path from a source node, per node id. Insertion order is only a
 * hint at where a node sits in the pipeline — a corpus file may declare a
 * source last — so the spread over "near the source / middle / near a
 * terminal" is taken over real depth rather than over file order.
 */
function nodeDepths(graph: Graph): Map<string, number> {
  const desc = graph.describe();
  const incoming = new Map<string, string[]>();
  for (const node of desc.nodes) incoming.set(node.id, []);
  for (const conn of desc.connections) incoming.get(conn.to[0])?.push(conn.from[0]);
  const memo = new Map<string, number>();
  const visit = (id: string, open: Set<string>): number => {
    const done = memo.get(id);
    if (done !== undefined) return done;
    if (open.has(id)) return 0; // a graph is a DAG; this only keeps a bug finite
    open.add(id);
    const ups = incoming.get(id) ?? [];
    const depth = ups.length === 0 ? 0 : 1 + Math.max(...ups.map((up) => visit(up, open)));
    open.delete(id);
    memo.set(id, depth);
    return depth;
  };
  for (const node of desc.nodes) visit(node.id, new Set());
  return memo;
}

interface Discovered {
  readonly edits: readonly EditPoint[];
  /** Params `setParam` refused, or whose type this file will not touch. */
  readonly skipped: number;
}

/**
 * Every node's first perturbable param, found by trying it on a throwaway
 * graph. A refusal is information — some params are constrained — but a
 * SILENT refusal is not, so refusals are counted and the count is asserted
 * against: a file where every edit was skipped must not pass as green.
 */
function discoverEdits(probe: Graph): Discovered {
  const depths = nodeDepths(probe);
  const edits: EditPoint[] = [];
  let skipped = 0;
  for (const node of probe.describe().nodes) {
    const handle = { id: node.id } as NodeHandle<Record<string, unknown>>;
    const params = probe.getParams(handle);
    let taken = false;
    for (const key of Object.keys(params).sort()) {
      if (taken) continue;
      const from = params[key];
      const candidates = candidateValues(from);
      if (candidates.length === 0) {
        skipped++;
        continue;
      }
      for (const to of candidates) {
        if (taken || Object.is(to, from)) continue;
        try {
          probe.setParam(handle, key, to);
          edits.push({ node: node.id, param: key, from, to, depth: depths.get(node.id) ?? 0 });
          taken = true;
        } catch {
          skipped++;
        }
      }
    }
  }
  return { edits, skipped };
}

/** `want` items spread evenly over `items`, endpoints included. */
function spread<T>(items: readonly T[], want: number): readonly T[] {
  if (items.length <= want) return items;
  const picked: T[] = [];
  for (let i = 0; i < want; i++) {
    picked.push(items[Math.round((i * (items.length - 1)) / (want - 1))]!);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Subjects: what gets cooked, and what gets edited.
// ---------------------------------------------------------------------------

interface Subject {
  readonly name: string;
  /**
   * A fresh pair. `cook` is the graph the protocol cooks; `edit` is the
   * graph whose params it perturbs. They are the same object for a corpus
   * graph, and different ones where the edit has to land INSIDE a wrapped
   * body — the corpus route can only reach a wrapper's own params.
   */
  readonly build: () => Built;
}

function corpusSubject(file: string): Subject {
  const source = readFileSync(join(REPO, "graphs", file), "utf8");
  return {
    name: file,
    build: () => {
      // A fresh parse per build, the way a host loads a file. Sharing one
      // parsed object lets a graph read state the previous cook left in it.
      return solo(deserializeGraph(JSON.parse(source)));
    },
  };
}

/**
 * The body both wrapped subjects run: jitter, add a column, move, jitter
 * again. Four nodes so the edit points inside it spread the way they do in
 * a corpus graph — one at the body's input, one in the middle, one at its
 * output — and three of them carry a plain scalar the perturber will take:
 * two `seed`s and a `tupleSize`. Jitter is here because it makes the
 * body's output depend on a seed, so an edit inside has somewhere visible
 * to land; `setAttribute` because a node that ADDS a column exercises a
 * different derivation path than one that rewrites an existing one.
 */
function innerBody(): {
  graph: Graph;
  head: NodeHandle<unknown, string, string>;
  tail: NodeHandle<unknown, string, string>;
} {
  const graph = new Graph(3);
  const head = graph.add(jitterPoints, { amount: [0.25, 0, 0.25], seed: 1 }, "jitter");
  const mark = graph.add(setAttribute, { name: "w", value: 0.5 }, "mark");
  const move = graph.add(transformPoints, { translate: [0, 1, 0] }, "move");
  const tail = graph.add(jitterPoints, { amount: [0, 0.1, 0], seed: 5 }, "settle");
  graph.connect(head, "out", mark, "in");
  graph.connect(mark, "out", move, "in");
  graph.connect(move, "out", tail, "in");
  return { graph, head, tail };
}

/**
 * Editing a node INSIDE a wrapped body. Mutating the inner graph bumps its
 * version, and a wrapper folds that version into its memo key (see the
 * comment on `Graph.version`), so the wrapping node's cache is invalidated
 * and the outer cook is genuinely warm-on-everything-else. That is the
 * case the corpus cannot reach: a corpus edit changes the WRAPPER's params.
 */
const subgraphSubject: Subject = {
  name: "code: subgraph body",
  build: () => {
    const body = innerBody();
    const def = subgraphNode(
      body.graph,
      [{ name: "in", node: body.head, pin: "in" }],
      [{ name: "out", node: body.tail, pin: "out" }],
    );
    const outer = new Graph(11);
    const grid = outer.add(pointGrid, { countX: 6, countY: 1, countZ: 6 }, "grid");
    const sub = outer.add(def, undefined, "sub");
    outer.connect(grid, "out", sub, "in");
    // The unwrapped source is declared too: it is the node whose cache the
    // wrapped body shares columns with, so it is the one a write through
    // the body would corrupt.
    outer.output(grid, "out", "src");
    outer.output(sub, "out", "wrapped");
    return { cook: outer, edit: body.graph };
  },
};

const forEachSubject: Subject = {
  name: "code: forEach body",
  build: () => {
    const body = innerBody();
    const def = forEachNode(
      body.graph,
      [{ name: "eachPoint", node: body.head, pin: "in" }],
      [{ name: "out", node: body.tail, pin: "out" }],
    );
    const outer = new Graph(13);
    const grid = outer.add(pointGrid, { countX: 4, countY: 1, countZ: 4 }, "grid");
    const loop = outer.add(def, undefined, "loop");
    outer.connect(grid, "out", loop, "eachPoint");
    // `eachPoint` cooks the body once per point, so one outer cook runs
    // sixteen inner ones over the SAME cached source geometry — the shape
    // that makes a stray write show up sixteen times over.
    outer.output(grid, "out", "src");
    outer.output(loop, "out", "looped");
    return { cook: outer, edit: body.graph };
  },
};

/**
 * Seven corpus graphs plus two built in code. The corpus picks cover
 * different machinery on purpose: a `forEach`, two `repeatUntil`s, a
 * `subgraph` with instances and spatial queries behind it, the widest
 * pipeline stage in the corpus (33 nodes, so the spread of edit points is
 * real rather than nominal), an instance-channel graph (the batch ABI is
 * snapshotted too) and an adjacency graph, which is where the topology
 * arrays get their exercise. All are small: cooking each of them a dozen
 * times over is the cost this file pays, so the graphs it pays it on are
 * chosen by what they exercise per point, not by size.
 */
const SUBJECTS: readonly Subject[] = [
  corpusSubject("basics-foreach-per-group.json"), // forEach
  corpusSubject("examples-coral.json"), // repeatUntil
  corpusSubject("basics-sightline-cull.json"), // subgraph + instances + spatial
  corpusSubject("pipeline-3-lots.json"), // 33 nodes: the widest spread of edit points
  corpusSubject("basics-instance-channels.json"), // per-instance channels
  corpusSubject("basics-gabriel-cells.json"), // adjacency: real topology arrays
  corpusSubject("examples-tree.json"), // repeatUntil + meshes
  subgraphSubject,
  forEachSubject,
];

/**
 * What the protocol below actually did, counted as it goes and asserted
 * against at the end of the file. It is deliberately file-scoped state: no
 * single subject can say whether the FILE is doing its job, and the thing
 * worth failing on is the whole file going quiet at once.
 *
 * It does mean the last test reads the others' work, so running one
 * subject alone (`vitest -t`) fails the summary. That is the cost of
 * having a summary at all, and it fails loudly rather than passing
 * vacuously, which is the right way round.
 */
const tally = { edits: 0, skippedParams: 0, cookRejected: 0, moved: 0, servedFromCache: 0 };

// ---------------------------------------------------------------------------
// The protocol.
// ---------------------------------------------------------------------------

describe("a second cook cannot read a cache the first one edited", () => {
  for (const subject of SUBJECTS) {
    it(`survives re-cooking with edits: ${subject.name}`, async () => {
      const discovered = discoverEdits(subject.build().edit);
      tally.skippedParams += discovered.skipped;
      const byDepth = [...discovered.edits].sort((a, b) => a.depth - b.depth);
      const chosen = spread(byDepth, 6);
      expect(chosen.length, `${subject.name}: nothing perturbable`).toBeGreaterThanOrEqual(2);

      const subject1 = subject.build();
      const o1 = (await cookSnapshot(subject1)).snap;

      for (const edit of chosen) {
        const where = `${subject.name} @ ${edit.node}.${edit.param} ${String(edit.from)} -> ${String(edit.to)}`;
        const handle = { id: edit.node } as NodeHandle<Record<string, unknown>>;
        subject1.edit.setParam(handle, edit.param, edit.to);

        let o2: Cooked;
        try {
          o2 = await cookSnapshot(subject1);
        } catch {
          // A param can be legal to SET and still break the cook. That is
          // not a copy-on-write fault, but the recovery is: put the value
          // back, cook, and the graph must read exactly as it did before
          // the failed attempt touched anything.
          tally.cookRejected++;
          subject1.edit.setParam(handle, edit.param, edit.from);
          const back = await cookSnapshot(subject1);
          expectSame(back.snap, o1, "recovered", "O1", `${where} (cook refused)`);
          continue;
        }
        tally.edits++;
        if (firstDifference(o2.snap, o1, "O2", "O1") !== undefined) tally.moved++;
        if (o2.cached > 0) tally.servedFromCache++;
        // THE COOK HAS TO HAVE BEEN WARM, or this file compares two cold
        // cooks and proves nothing at all. An edit at depth 0 can legally
        // invalidate everything, so the per-edit demand is made only where
        // it must hold: a node with an upstream has an upstream that was
        // not dirtied, and that upstream must have been SERVED rather than
        // recomputed. (The aggregate is asserted at the end of the file,
        // which is what would catch caching going away everywhere at once.)
        if (edit.depth > 0) {
          expect(o2.cached, `${where}: nothing was served from cache`).toBeGreaterThan(0);
        }

        // THE CHECK: a cold build of the same graph, at the same param
        // value. Everything the warm cook served from cache, this one
        // recomputed, so a disagreement is a cache that was written
        // through after it was stored.
        const fresh = subject.build();
        fresh.edit.setParam(handle, edit.param, edit.to);
        expectSame(o2.snap, (await cookSnapshot(fresh)).snap, "O2", "O2fresh", where);

        // AND BACK: the second cook must not have corrupted anything
        // either, so the third one has to reproduce the first exactly.
        subject1.edit.setParam(handle, edit.param, edit.from);
        const o3 = await cookSnapshot(subject1);
        expectSame(o3.snap, o1, "O3", "O1", `${where} (reverted)`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Controls. A proof with a comparator that cannot fail is not a proof.
// ---------------------------------------------------------------------------

describe("the comparator", () => {
  const control = corpusSubject("basics-scatter-in-bounds.json");

  it("reports nothing when a cook is compared with itself", async () => {
    const snap = (await cookSnapshot(control.build())).snap;
    expect(firstDifference(snap, snap, "a", "b")).toBeUndefined();
    // And two independent cold cooks of one graph agree: the determinism
    // invariant, and the half of the control that keeps the other half
    // from being satisfied by a comparator that is merely noisy.
    expectSame((await cookSnapshot(control.build())).snap, snap, "again", "first", "same graph twice");
  });

  it("reports one perturbed byte, and names where it is", async () => {
    const snap = (await cookSnapshot(control.build())).snap;
    // The largest entry is a real attribute column, so this perturbs cook
    // output rather than a length written as text.
    let target = "";
    let size = -1;
    for (const [key, bytes] of snap) {
      if (bytes.length > size) {
        size = bytes.length;
        target = key;
      }
    }
    expect(size).toBeGreaterThan(0);
    const bent: Snapshot = new Map(snap);
    const copy = snap.get(target)!.slice();
    const at = copy.length >>> 1;
    copy[at] = (copy[at]! + 1) & 0xff;
    bent.set(target, copy);
    const diff = firstDifference(snap, bent, "clean", "bent");
    expect(diff).toContain(target);
    expect(diff).toContain(`first differing byte at ${at}`);
  });

  it("reports an entry that is present on one side only", async () => {
    const snap = (await cookSnapshot(control.build())).snap;
    const key = [...snap.keys()].sort()[0]!;
    const short: Snapshot = new Map(snap);
    short.delete(key);
    expect(firstDifference(snap, short, "full", "short")).toContain("absent in short");
  });

  it("really reaches the node caches it claims to compare", async () => {
    // The internal reach is the one part of the snapshot that can fail
    // SILENTLY: rename `_nodes` and it throws, but rename `NodeCache`'s
    // `outputs` — or change when a node keeps an entry — and the cache
    // half of every comparison above shrinks to an empty set while every
    // test still passes. So: name the graph's nodes and demand an entry
    // per node, which is what a completed CPU cook leaves behind.
    const graph = corpusSubject("basics-gabriel-cells.json").build().cook;
    const snap = (await cookSnapshot(solo(graph))).snap;
    const ids = graph
      .describe()
      .nodes.map((node) => node.id)
      .sort();
    expect(ids.length).toBeGreaterThan(1);
    const listed = snap.get("cache|nodes");
    expect(listed).toBeDefined();
    expect(new TextDecoder().decode(listed!).split("\u0000")).toEqual(ids);
    const keys = [...snap.keys()];
    for (const id of ids) {
      expect(keys.some((key) => key.startsWith(`cache:${id}|`)), `no cached output for ${id}`).toBe(
        true,
      );
    }
  });

  it("catches an upstream cache that was edited behind its owner's back", async () => {
    // THE CONTROL THE WHOLE FILE RESTS ON. Every subject above passes;
    // this one shows the protocol can fail, by staging the exact fault it
    // hunts. One element of one CACHED column is overwritten — what a node
    // that wrote a shared column without going through
    // `Attribute.writable()` would leave behind — and then a DOWNSTREAM
    // param is changed, so the next cook recomputes from the damaged cache
    // while the cold build recomputes from a clean one. Without the
    // `expect` below, a comparator blind to a corrupted producer would
    // sail through every subject in this file.
    const build = (seed: number): Graph => {
      const g = new Graph(5);
      const grid = g.add(pointGrid, { countX: 6, countY: 1, countZ: 6 }, "grid");
      const jit = g.add(jitterPoints, { amount: [0.2, 0, 0.2], seed }, "jit");
      g.connect(grid, "out", jit, "in");
      g.output(jit, "out", "out");
      return g;
    };
    const onlyOutputs = (snap: Snapshot): Snapshot =>
      new Map([...snap].filter(([key]) => key.startsWith("out:")));

    // First, clean: the same sequence with no corruption must AGREE, or
    // the control proves nothing about the corruption.
    const clean = build(2);
    await cookSnapshot(solo(clean));
    clean.setParam({ id: "jit" } as NodeHandle<Record<string, unknown>>, "seed", 3);
    const warmClean = (await cookSnapshot(solo(clean))).snap;
    expectSame(warmClean, (await cookSnapshot(solo(build(3)))).snap, "warm", "cold", "unperturbed control");

    // Then the same thing with `grid`'s cached P moved by one element.
    const dirty = build(2);
    await cookSnapshot(solo(dirty));
    const cachedGrid = nodeCaches(dirty).get("grid")!.cache!.outputs;
    const item = Object.values(cachedGrid)[0]![0]!;
    expect(item.kind).toBe("geometry");
    if (item.kind !== "geometry") throw new Error("expected the source cache to hold geometry");
    item.geo.attrs.point.require("P").writable()[0] = 999;
    dirty.setParam({ id: "jit" } as NodeHandle<Record<string, unknown>>, "seed", 3);
    const warmDirty = (await cookSnapshot(solo(dirty))).snap;
    const cold = (await cookSnapshot(solo(build(3)))).snap;
    expect(
      firstDifference(onlyOutputs(warmDirty), onlyOutputs(cold), "warm", "cold"),
      "a corrupted producer must reach the terminal",
    ).toBeDefined();
    // AND the cache half fails too, which nothing else in this file
    // demonstrates: `cache:` sorts before `out:`, so the unfiltered
    // comparison has to name the damaged PRODUCER rather than the
    // consumer that read it. Without this the `cache:` entries are
    // carried by every comparison above but proven by none of them.
    expect(
      firstDifference(warmDirty, cold, "warm", "cold"),
      "the cache half must name the corrupted producer",
    ).toContain("cache:grid");
  });

  it("reports a cook at a different seed", async () => {
    const at = async (seed: number): Promise<Snapshot> => {
      const graph = control.build().cook;
      graph.setSeed(seed);
      return (await cookSnapshot(solo(graph))).snap;
    };
    const diff = firstDifference(await at(101), await at(202), "seed101", "seed202");
    expect(diff, "a scatter re-seeded must land somewhere else").toBeDefined();
  });
});

describe("the edits themselves", () => {
  it("ran, in enough places, and actually moved the output", () => {
    // Without these three, a regression in `discoverEdits` — or a schema
    // change that refuses every candidate — turns this whole file into a
    // suite that cooks graphs and asserts nothing about editing them, and
    // it would still be green.
    // Measured on 2026-09-20: 35 edits ran, 23 of them moved the output,
    // 32 re-cooked warm, 3 were refused by the cook and 141 params were
    // skipped or refused by `setParam`. The floors sit below those so a
    // schema that legitimately narrows one param does not fail the file,
    // and far enough above zero that a collapse cannot hide.
    expect(tally.edits, "edits that ran the full protocol").toBeGreaterThanOrEqual(24);
    expect(tally.moved, "edits whose change reached the output").toBeGreaterThanOrEqual(14);
    expect(tally.skippedParams, "params skipped or refused").toBeGreaterThan(0);
    // THE ONE THAT KEEPS THE FILE HONEST. Every comparison above rests on
    // the second cook being WARM. If caching regressed to always-miss,
    // every O2 would be a cold cook compared against another cold cook —
    // all green, all meaningless. This counts the edits whose re-cook
    // actually served a node from its memo entry: 32 of the 35 did,
    // the other 3 being edits on a source node with nothing above it.
    expect(
      tally.servedFromCache,
      "re-cooks that served at least one node from cache",
    ).toBeGreaterThanOrEqual(18);
  });
});
