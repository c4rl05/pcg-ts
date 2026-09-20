/**
 * `pcg inspect --dist / --group-by / --bands`: the distribution of a
 * column, optionally split into groups, over one cooked item.
 *
 * It answers the question an author asks once a cook is clean: not "did
 * it run" but "is the outcome what the brief said" — trees thinning toward
 * the water, scale rising with distance. Before this, that took a scratch
 * copy of the graph per band with a filter appended, and a count read back
 * from each.
 *
 * THE POPULATION is one item. A geometry item contributes the elements of
 * the `--domain` being inspected; a CPU instance item contributes its
 * instances, pooled across batches, with three pseudo-attributes read off
 * the transforms and the batch — `@translate`, `@scale`, `@asset` — plus
 * the per-instance channels under their own names.
 *
 * GROUPS PARTITION IT. Every element is in exactly one group, so group
 * counts always sum to the population: `--bands` adds a group below the
 * first edge, one at or above the last, and one for non-finite values,
 * even when they are empty. Within one item, every group's histogram of a
 * column uses the same bin edges, taken from the whole population, so
 * bins line up across groups and can be compared count for count.
 */
import {
  type Attribute,
  type AttrType,
  type DataItem,
  DOMAINS,
  type Domain,
  type Geometry,
  type InstancesItem,
  instanceAttributesOf,
  isDeviceResidentInstances,
} from "../index.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import { CliUsageError, parseNumberValue } from "./args.js";
import { CliError } from "./errors.js";
import { plural, table } from "./format.js";
import { type DistributionStats, PERCENTILES, channelType, distributionStats } from "./summary.js";

/** The most groups `--group-by` will report. */
export const MAX_GROUPS = 64;

/** The default `--bins`. */
export const DEFAULT_BINS = 10;

/** The pseudo-attributes an instance item exposes, in the order errors list them. */
export const INSTANCE_PSEUDO_ATTRIBUTES = ["@translate", "@scale", "@asset"] as const;

/** A parsed `--bands attr=e0,e1,…`. */
export interface BandsSpec {
  readonly attr: string;
  readonly edges: readonly number[];
}

/** What `inspect` was asked to describe. */
export interface DistributionRequest {
  readonly dist: readonly string[];
  readonly bins: number;
  readonly groupBy?: string;
  readonly bands?: BandsSpec;
}

/**
 * Parse `--bands`. Everything about its SHAPE is checked here, before the
 * cook, so a mistyped edge list costs nothing to hear about: the `=`, each
 * edge spelling a finite number, and the edges strictly increasing — a
 * repeated edge would be an empty band that can never hold anything, and
 * an out-of-order one a band whose bounds contradict each other.
 */
export function parseBands(raw: string): BandsSpec {
  const eq = raw.lastIndexOf("=");
  const example = "--bands riverDist=5,15,25";
  if (eq <= 0 || eq === raw.length - 1) {
    throw new CliUsageError(
      `inspect: flag "--bands" expects <attr>=<e0>,<e1>,… (ascending edges), got "${raw}"; for example ${example}`,
    );
  }
  const attr = raw.slice(0, eq);
  const edges: number[] = [];
  for (const token of raw.slice(eq + 1).split(",")) {
    const value = parseNumberValue(token.trim());
    if (value === undefined) {
      throw new CliUsageError(
        `inspect: flag "--bands" edge "${token}" in "${raw}" is not a finite number; write plain decimals separated by commas, for example ${example}`,
      );
    }
    if (edges.length > 0 && !(value > edges[edges.length - 1])) {
      throw new CliUsageError(
        `inspect: flag "--bands" edges must be strictly increasing, but ${value} follows ${edges[edges.length - 1]} in "${raw}"`,
      );
    }
    edges.push(value);
  }
  return { attr, edges };
}

// ---------------------------------------------------------------------------
// Columns: what a name resolves to inside one item.
// ---------------------------------------------------------------------------

/** One column of the population, addressed by element and component. */
interface Column {
  readonly name: string;
  readonly type: AttrType;
  readonly tupleSize: number;
  numeric(element: number, component: number): number;
  text(element: number, component: number): string;
}

/** One item's population: its elements, and the columns over them. */
interface Population {
  /** `point`, `primitive`, … for geometry; `instances` for an instance item. */
  readonly source: Domain | "instances";
  readonly count: number;
  lookup(name: string): Column | undefined;
  /** What a missing name was, told to the reader: the names that do exist, and where. */
  missing(name: string): MissingName;
}

/** A name the population does not have, as text and as record fields. */
interface MissingName {
  readonly text: string;
  /** Every name the population does answer to. */
  readonly valid: readonly string[];
  /** A fix that is not a spelling: the name lives on another domain. */
  readonly fix?: string;
}

function attributeColumn(attr: Attribute): Column {
  const ts = attr.tupleSize;
  return {
    name: attr.name,
    type: attr.type,
    tupleSize: ts,
    numeric: (i, c) => attr.data[i * ts + c],
    text: (i, c) => attr.getString(i, c),
  };
}

function geometryPopulation(geo: Geometry, domain: Domain): Population {
  const set = geo.attrs[domain];
  return {
    source: domain,
    count: set.count,
    lookup: (name) => {
      const attr = set.get(name);
      return attr === undefined ? undefined : attributeColumn(attr);
    },
    missing: (name) => {
      const here = [...set].map((a) => a.name);
      const elsewhere = DOMAINS.filter((d) => d !== domain && geo.attrs[d].get(name) !== undefined);
      return {
        text:
          `no ${domain} attribute "${name}"; ${domain} attributes: ${here.length === 0 ? "(none)" : here.join(", ")}` +
          (elsewhere.length > 0 ? `; "${name}" is on the ${elsewhere.join(", ")} domain — pass --domain ${elsewhere[0]}` : ""),
        valid: here,
        ...(elsewhere.length > 0 ? { fix: `pass --domain ${elsewhere[0]}` } : {}),
      };
    },
  };
}

function floatColumn(name: string, tupleSize: number, data: Float64Array | Float32Array): Column {
  return {
    name,
    type: "f32",
    tupleSize,
    numeric: (i, c) => data[i * tupleSize + c],
    text: (i, c) => String(data[i * tupleSize + c]),
  };
}

/**
 * A CPU instance item's population. The transforms are column-major 4x4
 * blocks (`InstanceBatch.transforms`): translation at offsets 12-14, and
 * the scale along each local axis is the length of the matrix's first,
 * second and third column — exact for `T * R * S`, where the rotation
 * keeps each column's length. Lengths are taken in f64 as
 * `sqrt(x*x + y*y + z*z)`, which IEEE arithmetic rounds the same way
 * everywhere.
 */
function instancePopulation(item: InstancesItem): Population {
  const batches = item.batches;
  const count = batches.reduce((n, b) => n + b.count, 0);
  const translate = new Float64Array(count * 3);
  const scale = new Float64Array(count * 3);
  const assetIndex = new Int32Array(count);
  const assets: string[] = [];
  let k = 0;
  batches.forEach((b, bi) => {
    assets.push(b.assetId);
    const m = b.transforms;
    for (let j = 0; j < b.count; j++, k++) {
      const o = j * 16;
      for (let c = 0; c < 3; c++) {
        translate[k * 3 + c] = m[o + 12 + c];
        const x = m[o + c * 4];
        const y = m[o + c * 4 + 1];
        const z = m[o + c * 4 + 2];
        scale[k * 3 + c] = Math.sqrt(x * x + y * y + z * z);
      }
      assetIndex[k] = bi;
    }
  });

  // Channels by name. One is offered only when every non-empty batch
  // carries it at one width: a channel some batches lack has no value for
  // their instances, and inventing one would bias every figure.
  const channelNames = new Set<string>();
  for (const b of batches) for (const name of Object.keys(instanceAttributesOf(b))) channelNames.add(name);
  const channels = new Map<string, Column>();
  const inconsistent: string[] = [];
  for (const name of channelNames) {
    let width: number | undefined;
    let type: AttrType | undefined;
    let ok = true;
    for (const b of batches) {
      if (b.count === 0) continue;
      const column = instanceAttributesOf(b)[name];
      const w = column === undefined ? undefined : column.length / b.count;
      if (column === undefined || (width !== undefined && w !== width)) {
        ok = false;
        break;
      }
      width = w;
      type = channelType(column);
    }
    if (!ok || width === undefined || type === undefined) {
      if (!ok) inconsistent.push(name);
      continue;
    }
    const data = new Float64Array(count * width);
    let offset = 0;
    for (const b of batches) {
      if (b.count === 0) continue;
      const column = instanceAttributesOf(b)[name]!;
      for (let i = 0; i < column.length; i++) data[offset + i] = column[i];
      offset += column.length;
    }
    const w = width;
    channels.set(name, {
      name,
      type,
      tupleSize: w,
      numeric: (i, c) => data[i * w + c],
      text: (i, c) => String(data[i * w + c]),
    });
  }

  const pseudo = new Map<string, Column>([
    ["@translate", floatColumn("@translate", 3, translate)],
    ["@scale", floatColumn("@scale", 3, scale)],
    [
      "@asset",
      {
        name: "@asset",
        type: "string",
        tupleSize: 1,
        numeric: () => Number.NaN,
        text: (i) => assets[assetIndex[i]],
      },
    ],
  ]);
  return {
    source: "instances",
    count,
    lookup: (name) => pseudo.get(name) ?? channels.get(name),
    missing: (name) => ({
      text:
        `no instance attribute "${name}"; an instance item exposes ${INSTANCE_PSEUDO_ATTRIBUTES.join(", ")}` +
        (channels.size > 0 ? ` and its channels ${[...channels.keys()].join(", ")}` : " (it carries no channels)") +
        (inconsistent.includes(name)
          ? `; the channel "${name}" exists but not on every batch at one width, so it has no value for every instance`
          : ""),
      valid: [...INSTANCE_PSEUDO_ATTRIBUTES, ...channels.keys()],
    }),
  };
}

/** A name resolved to a column, and which of its components it selects. */
interface Selection {
  readonly column: Column;
  /** The components selected, in order; every one when no `[c]` was written. */
  readonly components: readonly number[];
  /** The component written as `[c]`, when there was one. */
  readonly selector?: number;
}

/**
 * Resolve `name` or `name[c]` against a population. An exact name wins
 * over the selector reading, so an attribute literally called `a[0]`
 * stays reachable. A name that is not there is exit 1 (a named thing does
 * not exist); a component past the tuple is exit 2 (a flag value out of
 * range).
 */
function select(population: Population, ref: string, flag: string, where: string): Selection {
  const exact = population.lookup(ref);
  if (exact !== undefined) {
    return { column: exact, components: Array.from({ length: exact.tupleSize }, (_, c) => c) };
  }
  const match = /^(.+)\[(\d+)\]$/.exec(ref);
  if (match !== null) {
    const column = population.lookup(match[1]);
    if (column !== undefined) {
      const c = Number(match[2]);
      if (c >= column.tupleSize) {
        throw new CliUsageError(
          `inspect: flag "--${flag}" asks for component ${c} of "${column.name}", which has ${plural(column.tupleSize, "component")}; valid: ${Array.from({ length: column.tupleSize }, (_, i) => `${column.name}[${i}]`).join(", ")}`,
        );
      }
      return { column, components: [c], selector: c };
    }
  }
  // The cook's own code for the same fault, so one attribute missing reads
  // the same whether the graph named it or a flag did.
  const name = match?.[1] ?? ref;
  const missing = population.missing(name);
  const near = suggestNames(name, missing.valid);
  const fix = missing.fix ?? (near.only !== undefined ? `replace "${name}" with "${near.only}"` : undefined);
  throw new CliError(`inspect: flag "--${flag}" names "${ref}", but ${where} has ${missing.text}`, {
    code: "attribute-not-found",
    key: `--${flag}`,
    got: name,
    valid: missing.valid,
    ...(near.names.length > 0 ? { didYouMean: near.names } : {}),
    ...(fix !== undefined ? { fix } : {}),
  });
}

/** `scale[0]` for a tuple component, `riverDist` for a scalar. */
function componentLabel(column: Column, component: number): string {
  return column.tupleSize === 1 ? column.name : `${column.name}[${component}]`;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** One group of the partition. */
export interface GroupEntry {
  /** The group's label: the value for `--group-by`, `<5` / `[5,15)` / `>=25` / `non-finite` for `--bands`. */
  readonly key: string;
  readonly count: number;
  /** `--group-by`: the value the group holds, as its column spells it. */
  readonly value?: string | number;
  /** `--bands`: the band's inclusive lower edge, absent below the first edge and for `non-finite`. */
  readonly from?: number;
  /** `--bands`: the band's exclusive upper edge, absent at or above the last edge and for `non-finite`. */
  readonly to?: number;
}

interface Partition {
  readonly groups: GroupEntry[];
  /** `groupOf[element]` is the element's index into `groups`. */
  readonly groupOf: Int32Array;
}

function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function valueRange(population: Population, sel: Selection): string {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const c = sel.components[0];
  for (let i = 0; i < population.count; i++) {
    const v = sel.column.numeric(i, c);
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min > max ? "" : `; its values run ${fmtSig(min)} .. ${fmtSig(max)}`;
}

function singleComponent(sel: Selection, ref: string, flag: string): number {
  if (sel.components.length === 1) return sel.components[0];
  throw new CliUsageError(
    `inspect: flag "--${flag}" needs one component, but "${ref}" has ${sel.column.tupleSize}; name one: ${sel.components.map((c) => `${sel.column.name}[${c}]`).join(", ")}`,
  );
}

function groupByValue(population: Population, ref: string, where: string): Partition {
  const sel = select(population, ref, "group-by", where);
  const { column } = sel;
  if (column.type === "f32") {
    // --bands takes ONE component, so a tuple's hint names the component
    // the quoted range was read from rather than a spelling --bands refuses.
    const bandRef = sel.selector === undefined && column.tupleSize > 1 ? `${column.name}[${sel.components[0]}]` : ref;
    throw new CliUsageError(
      `inspect: flag "--group-by" names "${ref}", an ${column.type} attribute; grouping by exact float values makes a group per value, so band it instead: --bands ${bandRef}=<e0>,<e1>,…${valueRange(population, sel)}. --group-by takes string, i32, u32 and bool attributes`,
    );
  }
  const c = singleComponent(sel, ref, "group-by");
  // WHICH reader, decided before the closure is built rather than inside
  // it — `keyOf` runs once per element; see the
  // note in `src/noise/worley.ts`. The f32 case threw above, so the
  // remaining types split exactly here.
  const isText = column.type === "string";
  const keyOf = (i: number): string | number => (isText ? column.text(i, c) : column.numeric(i, c));
  const index = new Map<string | number, number>();
  const elementKeys: (string | number)[] = new Array(population.count);
  for (let i = 0; i < population.count; i++) {
    const key = keyOf(i);
    elementKeys[i] = key;
    if (!index.has(key)) {
      if (index.size === MAX_GROUPS) {
        throw new CliUsageError(
          `inspect: flag "--group-by" names "${ref}", which has more than ${MAX_GROUPS} distinct values in ${where}; groups are capped at ${MAX_GROUPS}` +
            (column.type === "string"
              ? `, so group by a coarser attribute`
              : `, so band it instead: --bands ${ref}=<e0>,<e1>,…${valueRange(population, sel)}`),
        );
      }
      index.set(key, index.size);
    }
  }
  const keys = [...index.keys()].sort(compareKeys);
  const order = new Map(keys.map((k, g) => [k, g]));
  const counts = new Array<number>(keys.length).fill(0);
  const groupOf = new Int32Array(population.count);
  for (let i = 0; i < population.count; i++) {
    const g = order.get(elementKeys[i])!;
    groupOf[i] = g;
    counts[g]++;
  }
  return {
    groups: keys.map((key, g) => ({ key: String(key), count: counts[g], value: key })),
    groupOf,
  };
}

/** The label of one band, in the half-open notation the help text uses. */
function bandKey(edges: readonly number[], g: number): { key: string; from?: number; to?: number } {
  const n = edges.length;
  if (g === 0) return { key: `<${edges[0]}`, to: edges[0] };
  if (g === n) return { key: `>=${edges[n - 1]}`, from: edges[n - 1] };
  return { key: `[${edges[g - 1]},${edges[g]})`, from: edges[g - 1], to: edges[g] };
}

function groupByBands(population: Population, bands: BandsSpec, where: string): Partition {
  const sel = select(population, bands.attr, "bands", where);
  if (sel.column.type === "string") {
    throw new CliUsageError(
      `inspect: flag "--bands" names "${bands.attr}", a string attribute; bands need numbers — group a string by its values with --group-by ${bands.attr}`,
    );
  }
  const c = singleComponent(sel, bands.attr, "bands");
  const edges = bands.edges;
  const n = edges.length;
  // n + 1 bands (below, between, at-or-above), then non-finite.
  const nonFiniteGroup = n + 1;
  const counts = new Array<number>(n + 2).fill(0);
  const groupOf = new Int32Array(population.count);
  for (let i = 0; i < population.count; i++) {
    const v = sel.column.numeric(i, c);
    let g: number;
    if (!Number.isFinite(v)) g = nonFiniteGroup;
    else if (v < edges[0]) g = 0;
    else {
      // The last edge <= v; its band is the one above it.
      let lo = 0;
      let hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (edges[mid] <= v) lo = mid;
        else hi = mid - 1;
      }
      g = lo + 1;
    }
    groupOf[i] = g;
    counts[g]++;
  }
  const groups: GroupEntry[] = [];
  for (let g = 0; g <= n; g++) groups.push({ ...bandKey(edges, g), count: counts[g] });
  groups.push({ key: "non-finite", count: counts[nonFiniteGroup] });
  return { groups, groupOf };
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

/** One column component's distribution, overall and per group. */
export interface ColumnDistribution {
  /** `scale[0]`, or the bare name for a scalar. */
  readonly name: string;
  readonly attr: string;
  readonly component: number;
  readonly type: AttrType;
  readonly all: DistributionStats;
  /** Aligned with the report's `groups`, and sharing `all.histogram.edges`. */
  readonly groups?: readonly (DistributionStats & { readonly key: string })[];
}

/** Everything `--dist` / `--group-by` / `--bands` report for one item. */
export interface DistributionReport {
  readonly source: Domain | "instances";
  readonly count: number;
  readonly bins: number;
  readonly grouping?:
    | { readonly by: "value"; readonly attr: string }
    | { readonly by: "bands"; readonly attr: string; readonly edges: readonly number[] };
  readonly groups?: readonly GroupEntry[];
  readonly columns: readonly ColumnDistribution[];
}

/**
 * The distribution report for one item, or `undefined` for an item that
 * has no elements to describe (a value). A device-resident instance item
 * is refused by name: its transforms live in GPU memory, and reading them
 * back is not something a report should do behind the caller's back.
 */
export function distributionReport(
  item: DataItem,
  index: number,
  domain: Domain,
  request: DistributionRequest,
): DistributionReport | undefined {
  if (item.kind === "value") return undefined;
  const where = `item ${index}`;
  let population: Population;
  if (item.kind === "geometry") {
    population = geometryPopulation(item.geo, domain);
  } else {
    if (isDeviceResidentInstances(item)) {
      throw new CliError(
        `inspect: item ${index} is a device-resident instance batch — its transforms stay in GPU memory, so --dist, --group-by and --bands cannot read them; cook the graph on the CPU (the CLI's default) to describe its instances`,
      );
    }
    population = instancePopulation(item);
  }

  let partition: Partition | undefined;
  if (request.groupBy !== undefined) partition = groupByValue(population, request.groupBy, where);
  else if (request.bands !== undefined) partition = groupByBands(population, request.bands, where);

  const columns: ColumnDistribution[] = [];
  for (const ref of request.dist) {
    const sel = select(population, ref, "dist", where);
    if (sel.column.type === "string") {
      throw new CliUsageError(
        `inspect: flag "--dist" names "${ref}", a string attribute; a distribution needs numbers — count its values with --group-by ${ref}`,
      );
    }
    for (const c of sel.components) {
      const all = new Float64Array(population.count);
      for (let i = 0; i < population.count; i++) all[i] = sel.column.numeric(i, c);
      const overall = distributionStats(all, { bins: request.bins });
      const edges = overall.histogram.edges;
      let groups: (DistributionStats & { key: string })[] | undefined;
      if (partition !== undefined) {
        const { groups: entries, groupOf } = partition;
        const members = entries.map((g) => new Float64Array(g.count));
        const fill = new Array<number>(entries.length).fill(0);
        for (let i = 0; i < population.count; i++) {
          const g = groupOf[i];
          members[g][fill[g]++] = all[i];
        }
        groups = entries.map((g, gi) => ({
          key: g.key,
          ...distributionStats(members[gi], edges.length > 0 ? { bins: request.bins, edges } : { bins: request.bins }),
        }));
      }
      columns.push({
        name: componentLabel(sel.column, c),
        attr: sel.column.name,
        component: c,
        type: sel.column.type,
        all: overall,
        ...(groups !== undefined ? { groups } : {}),
      });
    }
  }

  return {
    source: population.source,
    count: population.count,
    bins: request.bins,
    ...(request.groupBy !== undefined
      ? { grouping: { by: "value" as const, attr: request.groupBy } }
      : request.bands !== undefined
        ? { grouping: { by: "bands" as const, attr: request.bands.attr, edges: request.bands.edges } }
        : {}),
    ...(partition !== undefined ? { groups: partition.groups } : {}),
    columns,
  };
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const DASH = "-";

/**
 * A distribution figure to `digits` significant digits, integers verbatim.
 * Significant digits and not fixed decimals, which is what `fmtStat` uses
 * for the attribute table: a column spanning 1e-7 printed to six decimals
 * reads as a column of zeros with a histogram of `[0,0)` bins.
 * `toPrecision` is specified to the digit, so the text is the same on
 * every engine; `-0` prints as `0`, as it does everywhere else in the CLI.
 */
function fmtSig(n: number, digits = 7): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n === 0 ? 0 : n);
  const text = String(Number(n.toPrecision(digits)));
  return text === "-0" ? "0" : text;
}

/**
 * Labels for a histogram's edges: seven significant digits, or as many
 * more as it takes for neighbouring edges that differ to print
 * differently. Seventeen always suffice — that many digits tell any two
 * doubles apart — so a narrow column never prints as a run of identical
 * bins.
 */
function edgeLabels(edges: readonly number[]): string[] {
  for (let digits = 7; digits < 17; digits++) {
    const labels = edges.map((e) => fmtSig(e, digits));
    if (labels.every((l, i) => i === 0 || edges[i] === edges[i - 1] || l !== labels[i - 1])) return labels;
  }
  return edges.map((e) => fmtSig(e, 17));
}

function statCells(s: DistributionStats): string[] {
  const opt = (v: number | undefined): string => (v === undefined ? DASH : fmtSig(v));
  return [
    String(s.count),
    String(s.nonFinite),
    opt(s.min),
    opt(s.max),
    opt(s.mean),
    opt(s.stddev),
    ...PERCENTILES.map((p) => opt(s.percentiles?.[`p${p}` as keyof typeof s.percentiles])),
  ];
}

function groupLabel(report: DistributionReport, g: GroupEntry): string {
  return report.grouping?.by === "value" && typeof g.value === "string" ? JSON.stringify(g.value) : g.key;
}

/** One bin's label: `[lo,hi)`, and `[lo,hi]` for the last, closed bin. */
function binLabel(labels: readonly string[], b: number): string {
  const closing = b === labels.length - 2 ? "]" : ")";
  return `[${labels[b]},${labels[b + 1]}${closing}`;
}

/** The text rendering of one item's report, indented under the item line. */
export function distributionText(report: DistributionReport): string[] {
  const lines: string[] = [];
  const unit = report.source === "instances" ? "instance" : `${report.source} element`;
  lines.push(`  distributions over ${plural(report.count, unit)}`);
  const groups = report.groups;
  const labels = groups?.map((g) => groupLabel(report, g)) ?? [];
  if (report.grouping !== undefined && groups !== undefined) {
    const heading =
      report.grouping.by === "bands"
        ? `  groups: ${report.grouping.attr} in bands at ${report.grouping.edges.join(", ")} (counts sum to ${report.count})`
        : `  groups: by value of ${report.grouping.attr} (counts sum to ${report.count})`;
    lines.push(heading);
    lines.push(...table([["group", "count"], ...groups.map((g, i) => [labels[i], String(g.count)])], "    "));
  }
  for (const col of report.columns) {
    lines.push(`  ${col.name} (${col.type}):`);
    lines.push(
      ...table(
        [
          ["group", "count", "non-finite", "min", "max", "mean", "stddev", ...PERCENTILES.map((p) => `p${p}`)],
          ["(all)", ...statCells(col.all)],
          ...(col.groups ?? []).map((g, i) => [labels[i], ...statCells(g)]),
        ],
        "    ",
      ),
    );
    const edges = col.all.histogram.edges;
    if (edges.length < 2) {
      lines.push(`  ${col.name} histogram: no finite values`);
      continue;
    }
    const bins = edges.length - 1;
    const why =
      edges[0] === edges[bins]
        ? " (every finite value is equal)"
        : bins < report.bins
          ? ` (of ${report.bins} asked for: the span is too narrow for more distinct edges)`
          : "";
    lines.push(
      `  ${col.name} histogram, ${plural(bins, "bin")}${why}${col.groups !== undefined ? ", edges shared by every group" : ""}:`,
    );
    const edgeText = edgeLabels(edges);
    lines.push(
      ...table(
        [
          ["bin", "(all)", ...labels],
          ...Array.from({ length: bins }, (_, b) => [
            binLabel(edgeText, b),
            String(col.all.histogram.counts[b]),
            ...(col.groups ?? []).map((g) => String(g.histogram.counts[b] ?? 0)),
          ]),
        ],
        "    ",
      ),
    );
  }
  return lines;
}
