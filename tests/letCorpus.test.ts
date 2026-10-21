/**
 * `let` is notation, and this holds it to that over what actually ships:
 * every field expression in the corpus is rewritten with its repeated
 * subexpressions factored into `let` bindings, and the rewrite must build
 * the same `Field.key`, evaluate to the same bytes on the CPU, and compile
 * to the same WGSL text under the same kernel key as the expression it
 * was factored from.
 *
 * The factoring is mechanical (see {@link letify}) rather than written by
 * hand, so it reaches constructs nobody thought to put in a `let` — a
 * binding inside a noise's `opts.position`, a `byAttribute` case, a
 * binding that reads an earlier one. An expression with no repeat still
 * gets a let, around its largest proper subexpression, so every expression
 * the sweep evaluates exercises one.
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

/**
 * The child positions a binding may be factored OUT of. Not
 * `opts.seed.variant`, which admits only a `param` (a var there is
 * refused, and rightly: a seed has no tolerance for an expression).
 */
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
  return out;
}

function eachNode(v: unknown, visit: (node: Json) => void): void {
  if (!isSpec(v)) return;
  visit(v);
  mapChildren(v, (child) => {
    eachNode(child, visit);
    return child;
  });
}

/** The number of spec nodes in a tree. */
function sizeOf(v: unknown): number {
  let n = 0;
  eachNode(v, () => n++);
  return n;
}

/**
 * `spec` with every repeated subexpression (of two nodes or more) bound
 * once in a root `let` and read through `var` — or, when nothing repeats,
 * its largest proper subexpression bound and read once. Bindings are in
 * ascending size, so one that contains another reads it as a `var`: the
 * sequential scope is exercised whenever two repeats nest. Undefined for a
 * single-node expression, which has nothing to bind.
 */
function letify(spec: FieldSpec): FieldSpec | undefined {
  const counts = new Map<string, number>();
  const root = JSON.stringify(spec);
  eachNode(spec, (node) => {
    if (node.fn === "param") return; // a knob, not a subexpression
    const k = JSON.stringify(node);
    if (k !== root && sizeOf(node) >= 2) counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  let chosen = [...counts].filter(([, n]) => n >= 2).map(([k]) => k);
  if (chosen.length === 0) {
    const largest = [...counts.keys()].sort((a, b) => sizeOf(JSON.parse(b)) - sizeOf(JSON.parse(a)))[0];
    if (largest === undefined) return undefined;
    chosen = [largest];
  }
  chosen.sort((a, b) => a.length - b.length);
  const names = new Map(chosen.map((k, i) => [k, `t${i}`]));
  const replace = (v: unknown): unknown => {
    if (!isSpec(v)) return v;
    const name = names.get(JSON.stringify(v));
    if (name !== undefined) return { fn: "var", name };
    return mapChildren(v, replace);
  };
  const bind: Json = {};
  for (const k of chosen) bind[names.get(k) as string] = mapChildren(JSON.parse(k) as Json, replace);
  return { fn: "let", bind, args: [replace(spec)] };
}

/** Every attribute an expression reads, with the shape the sweep gives it. */
function attributesOf(spec: FieldSpec): Map<string, { readonly tupleSize: number; readonly strings?: string[] }> {
  const out = new Map<string, { tupleSize: number; strings?: string[] }>();
  eachNode(spec, (node) => {
    if (typeof node.name !== "string") return;
    if (node.fn === "attribute") {
      out.set(node.name, { tupleSize: typeof node.tupleSize === "number" ? node.tupleSize : 1 });
    } else if (node.fn === "attributeIs" && typeof node.value === "string") {
      out.set(node.name, { tupleSize: 1, strings: [node.value, "other"] });
    } else if (node.fn === "byAttribute" && typeof node.cases === "object" && node.cases !== null) {
      out.set(node.name, { tupleSize: 1, strings: [...Object.keys(node.cases), "other"] });
    }
  });
  return out;
}

const COUNT = 97;

/** A domain whose points and attributes genuinely differ. */
function ctxFor(spec: FieldSpec): { ctx: EvalContext; layout: FieldKernelLayout } {
  const geo = createPointCloud(COUNT);
  const points = geo.attrs.point;
  const P = points.require("P");
  for (let i = 0; i < COUNT; i++) P.setTuple(i, [i * 0.37 - 1, i * -0.11 + 2, i * 0.53]);
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
  const data = col.data as unknown as { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("hex");
}

describe(`field expressions across ${GRAPHS_DIR}/, factored into lets, are unchanged`, () => {
  let evaluated = 0;
  let compiled = 0;
  let withRepeats = 0;

  it("found expressions to factor", () => {
    expect(corpus.length).toBeGreaterThan(100);
  });

  for (const [i, spec] of corpus.entries()) {
    const factored = letify(spec);
    if (factored === undefined) continue;
    it(`[${i}] ${JSON.stringify(spec).slice(0, 70)}`, () => {
      let inline;
      try {
        inline = fieldFromJson(spec);
      } catch {
        return; // does not stand alone (an unbound param); not this suite's subject
      }
      const bound = fieldFromJson(factored);
      // Same key, so the cook's memo and the device kernel cache see one field.
      expect(bound.key).toBe(inline.key);
      expect(bound.tupleSize).toBe(inline.tupleSize);
      // The text view round-trips the factored tree.
      expect(parseFieldText(printFieldSpec(factored))).toStrictEqual(factored);
      if (Object.keys(factored.bind as Json).length > 1) withRepeats++;

      const { ctx, layout } = ctxFor(spec);
      let column;
      try {
        column = evaluateField(inline, ctx);
      } catch {
        column = undefined;
      }
      if (column !== undefined) {
        // A FRESH context, so the let form is evaluated rather than read
        // back out of the inline form's memo.
        const other = evaluateField(bound, { ...ctx });
        expect(other.tupleSize).toBe(column.tupleSize);
        expect(bytes(other)).toBe(bytes(column));
        evaluated++;
      }

      let kernel;
      try {
        kernel = compileFieldSpec(spec, layout);
      } catch {
        kernel = undefined;
      }
      if (kernel !== undefined) {
        const letKernel = compileFieldSpec(factored, layout);
        expect(letKernel.wgsl).toBe(kernel.wgsl);
        expect(letKernel.key).toBe(kernel.key);
        compiled++;
      }
    });
  }

  it("evaluated and compiled enough of them to mean something", () => {
    // Vacuity guard: every check above is skippable by a spec that does
    // not stand alone, so the counts must show the sweep did its job.
    expect(evaluated).toBeGreaterThan(100);
    expect(compiled).toBeGreaterThan(100);
    expect(withRepeats).toBeGreaterThan(10);
  });
});
