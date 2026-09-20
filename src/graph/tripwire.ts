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
 * WHAT IT CANNOT SEE.
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
 *
 * HOW TO ARM IT. `cook(graph, { tripwire: true })` — or `"node"` for the
 * slower mode that also names the node that was cooking when the change
 * was noticed. `PCG_TRIPWIRE=1` (or `=node`) in the environment arms every
 * cook that does not say otherwise, which is how a whole test run is put
 * under it without editing a call site.
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
import type { DataCollection, DataItem, DataValue, InstanceBatch } from "./data.js";
import { instanceAttributesOf, isDeviceResidentInstances } from "./data.js";

/**
 * How often the tripwire compares.
 *
 * - `"cook"` sweeps once, when the outermost cook finishes. Linear in the
 *   bytes the cook produced, and the mode to leave armed.
 * - `"node"` sweeps after every node at every depth, so the report also
 *   names the node that was cooking when the change appeared. Quadratic
 *   in the bytes the cook produced — the mode to switch to once `"cook"`
 *   has told you something moved and you want to know who moved it.
 */
export type TripwireMode = "cook" | "node";

/** What `CookOptions.tripwire` accepts. */
export type TripwireOption = boolean | TripwireMode | Tripwire;

/**
 * The handle an armed cook carries. Obtained by the executor from
 * `CookOptions.tripwire`, handed to every node as
 * `NodeExecuteArgs.tripwire`, and forwarded by composite nodes into their
 * inner cooks so a body's outputs are watched by the outermost cook.
 *
 * A node never calls anything on it but {@link scope}; the rest is
 * executor plumbing.
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

  constructor(violations: readonly TripwireViolation[], truncated = false) {
    super(renderViolations(violations, truncated));
    this.name = "TripwireError";
    this.violations = violations;
    this.truncated = truncated;
  }
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
 * `PCG_TRIPWIRE`, read once. `1`/`true`/`cook` arms `"cook"` mode, `node`
 * arms `"node"` mode, anything else (including an absent `process`, which
 * is the browser) leaves it off.
 */
const ENV_MODE: TripwireMode | undefined = readEnvMode();

function readEnvMode(): TripwireMode | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const raw = proc?.env?.PCG_TRIPWIRE;
  if (raw === undefined) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "node") return "node";
  if (value === "1" || value === "true" || value === "cook" || value === "on") return "cook";
  return undefined;
}

/**
 * The session an armed cook uses, or `undefined` when it is not armed.
 *
 * An object means a nested cook inheriting the outer session; `false`
 * declines even when the environment arms everything else.
 */
export function resolveTripwire(option: TripwireOption | undefined): Tripwire | undefined {
  if (option === undefined) return ENV_MODE === undefined ? undefined : new Session(ENV_MODE);
  if (option === false) return undefined;
  if (option === true) return new Session("cook");
  if (option === "cook" || option === "node") return new Session(option);
  return option;
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
  readonly depth = 0;
  /**
   * Every node output recorded so far, at every depth. Shared with the
   * scopes handed to nested cooks, so the outermost sweep sees a
   * `forEach` body's nodes as well as its own.
   */
  readonly list: Watched[] = [];
  private bytes = 0;

  constructor(mode: TripwireMode) {
    this.mode = mode;
  }

  get watched(): number {
    return this.list.length;
  }

  get heldBytes(): number {
    return this.bytes;
  }

  scope(nodeId: string): Tripwire {
    return new Scope(this, nodeId, 1);
  }

  record(nodeId: string, nodeType: string, outputs: Record<string, DataCollection>): void {
    const entry = snapshot(nodeId, nodeType, outputs);
    for (const probe of entry.bytes) this.bytes += probe.before.byteLength;
    this.list.push(entry);
  }

  sweep(cookingNow: string | undefined): void {
    sweepList(this.list, cookingNow);
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
      watchItem(`output "${pin}", item ${i}`, items[i]!, bytes, text);
    }
  }
  return { node, type, bytes, text };
}

function shapeOfOutputs(outputs: Record<string, DataCollection>, pins: readonly string[]): string {
  return pins.map((pin) => `${pin}:${(outputs[pin] ?? []).length}`).join(" ");
}

function watchItem(at: string, item: DataItem, bytes: ByteProbe[], text: TextProbe[]): void {
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
    const columns = instanceAttributesOf(batch);
    for (const name of Object.keys(columns).sort()) {
      const column = columns[name]!;
      watchBuffer(
        `${where} channel "${name}"`,
        column,
        itemSizeOf(batch, column),
        "instance",
        bytes,
        () => instanceAttributesOf(batch)[name],
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
      before: attr.stringTable.join("\u0000"),
      read: () => live()?.stringTable.join("\u0000") ?? "<removed>",
    });
  }
  const usedNow = (a: Attribute | undefined): Uint8Array | undefined => {
    if (a === undefined) return undefined;
    const data = a.data;
    const used = set.count * a.tupleSize * data.BYTES_PER_ELEMENT;
    // Capacity past `count` is slack, not data.
    return new Uint8Array(data.buffer, data.byteOffset, Math.min(used, data.byteLength));
  };
  const before = usedNow(attr);
  if (before === undefined) return;
  bytes.push({
    at,
    ctor: ctorOf(attr.data),
    tupleSize: attr.tupleSize,
    unit: unitOf(domain),
    before: copyOf(before),
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

function batchShape(batches: readonly InstanceBatch[]): string {
  return batches
    .map((b) => `${b.assetId}:${b.count}:{${Object.keys(instanceAttributesOf(b)).sort().join(",")}}`)
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

function sweepList(list: readonly Watched[], cookingNow: string | undefined): void {
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
  if (violations.length > 0) throw new TripwireError(violations, stoppedEarly);
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

function quote(text: string): string {
  return text === "" ? "(empty)" : `"${text}"`;
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
      "  change appeared.",
    );
  }
  return lines.join("\n");
}
