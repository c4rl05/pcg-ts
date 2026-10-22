/**
 * Box names are notation, and this holds them to that over what actually
 * ships, the way `tests/letCorpus.test.ts` holds `let`: every field
 * expression in the corpus that reads a box is rewritten with each
 * subexpression that IS a box name replaced by `{fn: "box", name}`, and the
 * rewrite must build the same `Field.key`, evaluate to the same bytes on
 * the CPU, and compile to the same WGSL text under the same kernel key.
 *
 * Two rewrites per expression. One replaces matches where they stand, so
 * a box name lands inside a `let` binding the author wrote. The other
 * first expands every `let` (a `var` replaced by its binding) and then
 * replaces, which is what reaches the brick house: it binds `lo` and reads
 * `component(lo, 0)`, so a box expression only becomes visible once the
 * bindings are gone.
 *
 * The match is against the expressions as an author spells them here,
 * written out below in the text form — not read from the table the
 * library lowers, which would make the comparison circular.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createPointCloud } from "../src/data/index.js";
import { type EvalContext, evaluateField } from "../src/fields/index.js";
import { GRAPHS_DIR, loadGraphs } from "../src/docs/graphIndex.js";
import { compileFieldSpec } from "../src/gpu/compile.js";
import type { FieldKernelLayout } from "../src/gpu/types.js";
import { type FieldSpec, fieldFromJson, parseFieldText, printFieldSpec } from "../src/nodes/index.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

type Json = Record<string, unknown>;

const isSpec = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v) && typeof (v as { fn?: unknown }).fn === "string";

// ---------------------------------------------------------------------------
// The box names, as an author writes them by hand.

const LO = 'attribute("boundsMin", 3)';
const HI = 'attribute("boundsMax", 3)';
const C = (of: string, k: number): string => `component(${of}, ${k})`;
const BY_HAND: ReadonlyArray<readonly [string, string]> = [
  ["lo", LO],
  ["hi", HI],
  ["size", `${HI} - ${LO}`],
  ["center", `0.5 * (${LO} + ${HI})`],
  ...[0, 1, 2].flatMap((k) => {
    const a = "xyz"[k] as string;
    return [
      [`${a}0`, C(LO, k)],
      [`${a}1`, C(HI, k)],
      [`s${a}`, `${C(HI, k)} - ${C(LO, k)}`],
      [`c${a}`, `0.5 * (${C(LO, k)} + ${C(HI, k)})`],
    ] as [string, string][];
  }),
];

/** Key-order-free canonical JSON, so `{fn, name, tupleSize}` matches in any order. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (typeof v === "object" && v !== null) {
    const o = v as Json;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

const MATCH = new Map(BY_HAND.map(([name, text]) => [canon(parseFieldText(text)), name]));

// ---------------------------------------------------------------------------
// The corpus.

function specsIn(value: unknown, out: FieldSpec[] = []): FieldSpec[] {
  if (isSpec(value)) {
    out.push(value as FieldSpec);
    return out;
  }
  if (Array.isArray(value)) for (const v of value) specsIn(v, out);
  else if (typeof value === "object" && value !== null) for (const v of Object.values(value)) specsIn(v, out);
  return out;
}

interface GraphNode {
  readonly params?: Record<string, unknown>;
  readonly subgraph?: { readonly graph?: { readonly nodes?: GraphNode[] } };
}

function collect(nodes: readonly GraphNode[] | undefined, out: FieldSpec[]): void {
  for (const node of nodes ?? []) {
    specsIn(node.params, out);
    collect(node.subgraph?.graph?.nodes, out);
  }
}

const corpus: FieldSpec[] = [];
for (const entry of loadGraphs(ROOT)) {
  const json = JSON.parse(readFileSync(`${ROOT}${entry.path}`, "utf8")) as { nodes?: GraphNode[] };
  collect(json.nodes, corpus);
}

/** Every child position a subexpression can stand in (not `opts.seed`). */
function mapChildren(node: Json, f: (child: unknown) => unknown): Json {
  const out: Json = { ...node };
  if (Array.isArray(node.args)) out.args = node.args.map(f);
  if (isSpec((node.opts as Json | undefined)?.position)) {
    out.opts = { ...(node.opts as Json), position: f((node.opts as Json).position) };
  }
  if (typeof node.cases === "object" && node.cases !== null) {
    out.cases = Object.fromEntries(Object.entries(node.cases as Json).map(([k, v]) => [k, f(v)]));
  }
  if (node.default !== undefined) out.default = f(node.default);
  if (node.fn === "let" && typeof node.bind === "object" && node.bind !== null) {
    out.bind = Object.fromEntries(Object.entries(node.bind as Json).map(([k, v]) => [k, f(v)]));
  }
  return out;
}

/** `spec` with every subexpression that is a box name replaced by it, outermost first. */
function boxify(v: unknown): unknown {
  if (!isSpec(v)) return v;
  const name = MATCH.get(canon(v));
  if (name !== undefined) return { fn: "box", name };
  return mapChildren(v, boxify);
}

/** `spec` with every `let` expanded: each `var` replaced by what it names. */
function inlineLets(v: unknown, scope: ReadonlyMap<string, unknown> = new Map()): unknown {
  if (!isSpec(v)) return v;
  if (v.fn === "var" && typeof v.name === "string" && scope.has(v.name)) return scope.get(v.name);
  if (v.fn === "let" && typeof v.bind === "object" && v.bind !== null && Array.isArray(v.args)) {
    const inner = new Map(scope);
    for (const [k, b] of Object.entries(v.bind as Json)) inner.set(k, inlineLets(b, inner));
    return inlineLets(v.args[0], inner);
  }
  return mapChildren(v, (c) => inlineLets(c, scope));
}

function countBoxes(v: unknown): number {
  if (!isSpec(v)) return 0;
  let n = v.fn === "box" ? 1 : 0;
  mapChildren(v, (c) => {
    n += countBoxes(c);
    return c;
  });
  return n;
}

// ---------------------------------------------------------------------------
// A domain whose boxes genuinely differ, and every attribute a spec reads.

function attributesOf(spec: unknown, out = new Map<string, { tupleSize: number; strings?: string[] }>()) {
  if (!isSpec(spec)) return out;
  if (typeof spec.name === "string") {
    if (spec.fn === "attribute") {
      out.set(spec.name, { tupleSize: typeof spec.tupleSize === "number" ? spec.tupleSize : 1 });
    } else if (spec.fn === "attributeIs" && typeof spec.value === "string") {
      out.set(spec.name, { tupleSize: 1, strings: [spec.value, "other"] });
    } else if (spec.fn === "byAttribute" && typeof spec.cases === "object" && spec.cases !== null) {
      out.set(spec.name, { tupleSize: 1, strings: [...Object.keys(spec.cases), "other"] });
    }
  }
  mapChildren(spec, (c) => {
    attributesOf(c, out);
    return c;
  });
  return out;
}

const COUNT = 97;

function ctxFor(spec: FieldSpec): { ctx: EvalContext; layout: FieldKernelLayout } {
  const geo = createPointCloud(COUNT);
  const points = geo.attrs.point;
  const P = points.require("P");
  const lo = points.require("boundsMin");
  const hi = points.require("boundsMax");
  for (let i = 0; i < COUNT; i++) {
    P.setTuple(i, [i * 0.37 - 1, i * -0.11 + 2, i * 0.53]);
    const a = [Math.sin(i * 1.3) * 9, Math.cos(i * 0.7) * 5, i * 0.21 - 4];
    lo.setTuple(i, a);
    hi.setTuple(i, a.map((v, k) => v + 0.3 + Math.abs(Math.sin(i * 2.1 + k)) * (2 + k)));
  }
  for (const [name, shape] of attributesOf(spec)) {
    if (points.has(name)) continue;
    if (shape.strings !== undefined) {
      const a = points.add(name, "string", 1);
      for (let i = 0; i < COUNT; i++) a.setString(i, shape.strings[i % shape.strings.length] as string);
    } else {
      const a = points.add(name, "f32", shape.tupleSize);
      for (let i = 0; i < COUNT; i++) {
        a.setTuple(i, Array.from({ length: shape.tupleSize }, (_v, k) => Math.sin(i * 1.7 + k) * 3));
      }
    }
  }
  const attributes: Record<string, { type: "f32" | "i32" | "u32" | "bool" | "string"; tupleSize: number }> = {};
  for (const name of points.names()) {
    const a = points.require(name);
    attributes[name] = { type: a.type, tupleSize: a.tupleSize };
  }
  return { ctx: { geo, domain: "point", seed: 0x5eed }, layout: { attributes } };
}

function bytes(col: { data: ArrayLike<number> }): string {
  const d = col.data as unknown as { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
  return Buffer.from(d.buffer, d.byteOffset, d.byteLength).toString("hex");
}

interface Verdict {
  readonly key: boolean;
  readonly cpu: boolean | undefined;
  readonly wgsl: boolean | undefined;
}

/** Compare `rewritten` against `original` on every axis the suite checks. */
function compare(original: FieldSpec, rewritten: FieldSpec): Verdict {
  const a = fieldFromJson(original);
  const b = fieldFromJson(rewritten);
  const { ctx, layout } = ctxFor(original);
  let cpu: boolean | undefined;
  let column;
  try {
    column = evaluateField(a, ctx);
  } catch {
    column = undefined;
  }
  if (column !== undefined) {
    // A fresh context, so the rewrite is evaluated rather than read back
    // out of the original's memo.
    const other = evaluateField(b, { ...ctx });
    cpu = other.tupleSize === column.tupleSize && bytes(other) === bytes(column);
  }
  let wgsl: boolean | undefined;
  let kernel;
  try {
    kernel = compileFieldSpec(original, layout);
  } catch {
    kernel = undefined;
  }
  if (kernel !== undefined) {
    const k2 = compileFieldSpec(rewritten, layout);
    wgsl = k2.wgsl === kernel.wgsl && k2.key === kernel.key;
  }
  return { key: a.key === b.key && a.tupleSize === b.tupleSize, cpu, wgsl };
}

// ---------------------------------------------------------------------------

describe("each box name, alone and at the root", () => {
  for (const [name, text] of BY_HAND) {
    it(`${name} is ${text}: key, CPU bytes, WGSL and kernel key`, () => {
      const v = compare(parseFieldText(text), { fn: "box", name });
      expect(v).toEqual({ key: true, cpu: true, wgsl: true });
    });
  }
});

describe("a deliberately wrong expansion is reported as different (control)", () => {
  // The comparator must be able to say "different" on every axis, or a
  // pass above proves nothing. Each control is a box name standing where
  // a DIFFERENT expression stood.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["sx", `${C(LO, 0)} - ${C(HI, 0)}`], // backwards
    ["x0", C(LO, 1)], // the wrong axis
    ["cx", `0.5 * (${C(LO, 0)} + ${C(LO, 0)})`], // one corner twice
  ];
  for (const [name, text] of cases) {
    it(`box("${name}") in place of ${text}`, () => {
      const v = compare(parseFieldText(text), { fn: "box", name });
      expect(v.key).toBe(false);
      expect(v.cpu).toBe(false);
      expect(v.wgsl).toBe(false);
    });
  }
});

describe(`field expressions across ${GRAPHS_DIR}/, rewritten with box names, are unchanged`, () => {
  let rewritten = 0;
  let names = 0;
  let evaluated = 0;
  let compiled = 0;

  it("found expressions to rewrite", () => {
    expect(corpus.length).toBeGreaterThan(100);
  });

  for (const [i, spec] of corpus.entries()) {
    for (const [how, rewrite] of [
      ["in place", (s: FieldSpec) => boxify(s)],
      ["lets expanded", (s: FieldSpec) => boxify(inlineLets(s))],
    ] as const) {
      const out = rewrite(spec) as FieldSpec;
      const n = countBoxes(out);
      if (n === 0) continue;
      it(`[${i}] ${how}: ${JSON.stringify(spec).slice(0, 60)}`, () => {
        try {
          fieldFromJson(spec);
        } catch {
          return; // does not stand alone (an unbound param); not this suite's subject
        }
        // The text view round-trips the rewritten tree.
        expect(parseFieldText(printFieldSpec(out))).toStrictEqual(out);
        const v = compare(spec, out);
        expect(v.key, "Field.key").toBe(true);
        if (v.cpu !== undefined) {
          expect(v.cpu, "CPU bytes").toBe(true);
          evaluated++;
        }
        if (v.wgsl !== undefined) {
          expect(v.wgsl, "WGSL text and kernel key").toBe(true);
          compiled++;
        }
        rewritten++;
        names += n;
      });
    }
  }

  it("rewrote, evaluated and compiled enough of them to mean something", () => {
    // Vacuity guard, set under what the corpus gave on 2026-10-22 (126
    // rewrites holding 594 box names; 88 evaluated, 126 compiled): every
    // check above is skippable by a spec that does not stand alone or
    // does not evaluate on this fixture, so the counts must show the
    // sweep did its job. The CPU count is the lower one because the
    // fixture cannot serve every expression's reads (a name read both as
    // a string and as a number gets one column, which serves only one).
    expect(rewritten).toBeGreaterThan(100);
    expect(names).toBeGreaterThan(400);
    expect(evaluated).toBeGreaterThan(60);
    expect(compiled).toBeGreaterThan(100);
  });
});
