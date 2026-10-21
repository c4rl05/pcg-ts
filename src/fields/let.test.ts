/**
 * `let` / `var`: the grammar's named subexpressions. The claims under test
 * are the ones the registration makes — notation only (the field IS the
 * inline expression, key included), a binding evaluated once per
 * context, lexical scope that stops at a spliced field — and every
 * refusal naming its spec path and the fix.
 */
import { describe, expect, it } from "vitest";
import { createPointCloud } from "../data/index.js";
import { FieldJsonError, fieldFromJson, fieldToJson, paramNamesOf } from "./fieldJson.js";
import { parseFieldText, printFieldSpec } from "./fieldText.js";
import { foldDomainConstants } from "./fold.js";
import { type EvalContext, add, evaluateField, makeField } from "./index.js";
import { type FieldSpec, peekFieldSpec, specChildEntries } from "./spec.js";

const v = (name: string): FieldSpec => ({ fn: "var", name });
const attr = (name: string, tupleSize?: number): FieldSpec =>
  tupleSize === undefined ? { fn: "attribute", name } : { fn: "attribute", name, tupleSize };

/** The design's own example: `let({ lo: attribute("lo", 3), x: component(lo, 0) }, x * 2)`. */
const EXAMPLE: FieldSpec = {
  fn: "let",
  bind: { lo: attr("lo", 3), x: { fn: "component", args: [v("lo")], index: 0 } },
  args: [{ fn: "mul", args: [v("x"), 2] }],
};
const EXAMPLE_INLINE: FieldSpec = {
  fn: "mul",
  args: [{ fn: "component", args: [attr("lo", 3)], index: 0 }, 2],
};

function ctxWith(count: number): EvalContext {
  const geo = createPointCloud(count);
  const P = geo.attrs.point.require("P");
  const lo = geo.attrs.point.add("lo", "f32", 3);
  for (let i = 0; i < count; i++) {
    P.setTuple(i, [i * 0.37 - 1, i * -0.11 + 2, i * 0.53]);
    lo.setTuple(i, [i * 1.5, -i, 0.25 * i]);
  }
  return { geo, domain: "point", seed: 7 };
}

/** The refusal `fieldFromJson(spec)` raises, as message and first record. */
function refusal(spec: unknown, bindings?: Parameters<typeof fieldFromJson>[1]) {
  try {
    fieldFromJson(spec as FieldSpec, bindings);
  } catch (err) {
    expect(err).toBeInstanceOf(FieldJsonError);
    const e = err as FieldJsonError;
    return { message: e.message, record: e.diagnostics[0] };
  }
  throw new Error("expected fieldFromJson to refuse");
}

describe("let: notation for the inline expression", () => {
  it("builds the inline expression's field, key and columns included", () => {
    const bound = fieldFromJson(EXAMPLE);
    const inline = fieldFromJson(EXAMPLE_INLINE);
    expect(bound.key).toBe(inline.key);
    expect(bound.tupleSize).toBe(1);
    const a = evaluateField(bound, ctxWith(9));
    const b = evaluateField(inline, ctxWith(9));
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    expect(Array.from(a.data)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
  });

  it("round-trips the authored JSON, and a raw-number binding", () => {
    expect(fieldToJson(fieldFromJson(EXAMPLE))).toEqual(EXAMPLE);
    const raw: FieldSpec = { fn: "let", bind: { k: [1, 2, 3] }, args: [{ fn: "add", args: [{ fn: "position" }, v("k")] }] };
    expect(fieldToJson(fieldFromJson(raw))).toEqual(raw);
    expect(fieldFromJson(raw).key).toBe(fieldFromJson({ fn: "add", args: [{ fn: "position" }, [1, 2, 3]] }).key);
  });

  it("is sequential: a binding sees the earlier ones, the body sees all", () => {
    const spec: FieldSpec = {
      fn: "let",
      bind: { a: { fn: "index" }, b: { fn: "mul", args: [v("a"), 10] }, c: { fn: "add", args: [v("b"), v("a")] } },
      args: [{ fn: "sub", args: [v("c"), v("a")] }],
    };
    const inline = fieldFromJson({
      fn: "sub",
      args: [{ fn: "add", args: [{ fn: "mul", args: [{ fn: "index" }, 10] }, { fn: "index" }] }, { fn: "index" }],
    });
    expect(fieldFromJson(spec).key).toBe(inline.key);
    expect(Array.from(evaluateField(fieldFromJson(spec), ctxWith(4)).data)).toEqual([0, 10, 20, 30]);
  });

  it("nests, and sibling lets may reuse a name", () => {
    const inner = (k: number): FieldSpec => ({ fn: "let", bind: { s: k }, args: [{ fn: "mul", args: [v("s"), v("s")] }] });
    const spec: FieldSpec = {
      fn: "let",
      bind: { p: { fn: "index" } },
      args: [{ fn: "add", args: [{ fn: "add", args: [inner(2), inner(3)] }, { fn: "let", bind: { q: v("p") }, args: [v("q")] }] }],
    };
    expect(Array.from(evaluateField(fieldFromJson(spec), ctxWith(3)).data)).toEqual([13, 14, 15]);
  });

  it("evaluates a binding read many times ONCE per context", () => {
    let runs = 0;
    const counted = makeField("test:counted", 1, (ctx) => {
      runs++;
      const n = ctx.geo.attrs.point.count;
      return { data: Float32Array.from({ length: n }, (_x, i) => i), tupleSize: 1 };
    });
    const spec: FieldSpec = {
      fn: "let",
      bind: { a: { fn: "mul", args: [{ fn: "param", name: "f" }, 2] }, b: { fn: "add", args: [v("a"), v("a")] } },
      args: [{ fn: "add", args: [{ fn: "mul", args: [v("b"), v("a")] }, v("a")] }],
    };
    const field = fieldFromJson(spec, { f: counted });
    const ctx = ctxWith(5);
    // (4i)(2i) + 2i
    expect(Array.from(evaluateField(field, ctx).data)).toEqual([0, 10, 36, 78, 136]);
    expect(runs).toBe(1);
    evaluateField(field, ctxWith(5));
    expect(runs).toBe(2); // a fresh context is a fresh evaluation, not a stale hit
  });

  it("lists the params bound inside a binding", () => {
    const spec: FieldSpec = {
      fn: "let",
      bind: { a: { fn: "param", name: "amp", value: 2 } },
      args: [{ fn: "mul", args: [v("a"), v("a")] }],
    };
    expect(paramNamesOf(spec)).toEqual(["amp"]);
    expect(Array.from(evaluateField(fieldFromJson(spec), ctxWith(2)).data)).toEqual([4, 4]);
    expect(Array.from(evaluateField(fieldFromJson(spec, { amp: 3 }), ctxWith(2)).data)).toEqual([9, 9]);
  });

  it("enumerates bindings as child positions, before the body", () => {
    expect(specChildEntries(EXAMPLE as Record<string, unknown>).map((c) => c.path)).toEqual([
      "bind.lo",
      "bind.x",
      "args[0]",
    ]);
  });
});

describe("let: scope stops at a spliced field", () => {
  it("rebuilds a spliced let that reuses an outer name without calling it a shadow", () => {
    // The spliced field was written elsewhere and binds its own `a`. If the
    // outer scope leaked into its rebuild, that `a` would read as shadowing
    // the outer one and the rebuild would refuse.
    const spliced = fieldFromJson({ fn: "let", bind: { a: 3 }, args: [{ fn: "mul", args: [v("a"), { fn: "index" }] }] });
    const outer: FieldSpec = {
      fn: "let",
      bind: { a: 100 },
      args: [{ fn: "add", args: [v("a"), { fn: "param", name: "f" }] }],
    };
    const field = fieldFromJson(outer, { f: spliced });
    expect(Array.from(evaluateField(field, ctxWith(3)).data)).toEqual([100, 103, 106]);
    // The stamped spec carries the splice; rebuilding it is what the fold
    // and the kernel key do, and it must not see the outer `a`.
    const stamped = peekFieldSpec(field) as FieldSpec;
    expect(() => fieldFromJson(stamped)).not.toThrow();
    expect(fieldFromJson(stamped).key).toBe(field.key);
  });
});

describe("let: refusals", () => {
  it("refuses a var no let binds, and one reading a later binding, with the names in scope", () => {
    const outside = refusal({ fn: "var", name: "x" });
    expect(outside.message).toMatch(/^\$\.name: var "x": no let is in scope here/);
    expect(outside.record?.path).toBe("/name");

    const misspelt = refusal({ ...EXAMPLE, args: [{ fn: "mul", args: [v("xx"), 2] }] });
    expect(misspelt.message).toContain('$.args[0].args[0].name: var "xx": no binding of that name is in scope here');
    expect(misspelt.message).toContain('did you mean "x"?');
    expect(misspelt.record?.path).toBe("/args/0/args/0/name");
    expect(misspelt.record?.didYouMean).toEqual(["x"]);
    expect(misspelt.record?.valid).toEqual(["lo", "x"]);

    const later = refusal({ fn: "let", bind: { a: v("b"), b: 1 }, args: [{ fn: "add", args: [v("a"), v("b")] }] });
    expect(later.message).toMatch(
      /^\$\.bind\.a\.name: var "b": the binding "b" is not in scope here — a binding sees only the bindings written BEFORE it/,
    );
    const self = refusal({ fn: "let", bind: { k: 1, a: { fn: "add", args: [v("a"), 1] } }, args: [v("a")] });
    expect(self.message).toContain('the binding "a" is not in scope here');
    expect(self.message).toContain("names in scope: k");
  });

  it("refuses an empty bind, a missing one, and an unread binding", () => {
    expect(refusal({ fn: "let", bind: {}, args: [1] }).message).toMatch(/^\$\.bind: let binds nothing/);
    expect(refusal({ fn: "let", args: [1] }).message).toMatch(/^\$\.bind: let requires a "bind" object/);
    const unread = refusal({ fn: "let", bind: { a: 1, b: 2 }, args: [v("a")] });
    expect(unread.message).toMatch(/^\$\.bind\.b: let binding "b" is never read/);
    expect(unread.record?.path).toBe("/bind/b");
    expect(refusal({ fn: "let", bind: { a: 1 }, args: [v("a"), 2] }).record?.code).toBe("field-arity");
  });

  it("refuses names that are not identifiers, are reserved, or shadow", () => {
    const body = (name: string): FieldSpec => ({ fn: "let", bind: { [name]: 1 }, args: [v(name)] });
    expect(refusal(body("2x")).message).toMatch(/^\$\.bind\["2x"\]: let binding name "2x" is not an identifier/);
    expect(refusal(body("a-b")).message).toContain("is not an identifier");
    expect(refusal(body("position")).message).toMatch(/"position" is a field fn/);
    expect(refusal(body("let")).message).toMatch(/"let" is a field fn/);
    expect(refusal(body("true")).message).toContain("is reserved");
    expect(refusal(JSON.parse('{"fn":"let","bind":{"__proto__":1},"args":[{"fn":"var","name":"__proto__"}]}')).message)
      .toContain("is reserved");
    const shadow = refusal({ fn: "let", bind: { a: 1 }, args: [{ fn: "let", bind: { a: 2 }, args: [v("a")] }] });
    expect(shadow.message).toMatch(/^\$\.args\[0\]\.bind\.a: let binding "a" shadows an enclosing binding/);
  });

  it("refuses an expansion deeper than the nesting cap, or with a key past the key cap", () => {
    // 300 links of `prev + 1`: shallow as written, 300 levels inline.
    const deep: Record<string, FieldSpec | number> = { b0: 1 };
    for (let i = 1; i < 300; i++) deep[`b${i}`] = { fn: "add", args: [v(`b${i - 1}`), 1] };
    expect(refusal({ fn: "let", bind: deep, args: [v("b299")] }).message).toContain(
      "with every let reference expanded, this expression nests deeper than 256 levels",
    );
    // 40 links each reading the previous twice: 2^40 nodes inline, refused
    // before the key that size could be built.
    const wide: Record<string, FieldSpec> = { w0: { fn: "position" } };
    for (let i = 1; i < 40; i++) wide[`w${i}`] = { fn: "add", args: [v(`w${i - 1}`), v(`w${i - 1}`)] };
    expect(refusal({ fn: "let", bind: wide, args: [v("w39")] }).message).toContain(
      "exceeds the budget of 16777216 characters",
    );
    // Counted in key characters, not nodes: a long attribute name doubled
    // fifteen times is a 2^15-node expansion of a ~21 KB spec, and must be
    // refused with a located error before the key that size exists.
    const named: Record<string, FieldSpec> = { b0: attr("a".repeat(20000)) };
    for (let i = 1; i <= 15; i++) named[`b${i}`] = { fn: "add", args: [v(`b${i - 1}`), v(`b${i - 1}`)] };
    const long = refusal({ fn: "let", bind: named, args: [v("b15")] });
    expect(long.message).toContain("exceeds the budget of");
    expect(long.message).toMatch(/^\$\.bind\.b\d+\.args\[1\]: /);
    // ...while a chain under both caps builds.
    const ok: Record<string, FieldSpec | number> = { b0: 1 };
    for (let i = 1; i < 200; i++) ok[`b${i}`] = { fn: "add", args: [v(`b${i - 1}`), 1] };
    expect(Array.from(evaluateField(fieldFromJson({ fn: "let", bind: ok, args: [v("b199")] }), ctxWith(1)).data)).toEqual([200]);
  });
});

describe("let: composing on top respects the expanded depth", () => {
  const nest = (fn: string, n: number, leaf: FieldSpec): FieldSpec => {
    let out = leaf;
    for (let i = 0; i < n; i++) out = { fn, args: [out] };
    return out;
  };
  it("withholds a derived spec that would nest deeper than the parser admits, as the inline form does", () => {
    // 56 levels of body over a 200-level binding: 256 inline, 58 as written.
    const spec: FieldSpec = { fn: "let", bind: { x: nest("abs", 199, { fn: "index" }) }, args: [nest("abs", 56, v("x"))] };
    const inline = nest("abs", 56, nest("abs", 199, { fn: "index" }));
    const built = fieldFromJson(spec);
    expect(built.key).toBe(fieldFromJson(inline).key);
    expect(peekFieldSpec(add(fieldFromJson(inline), 1))).toBeUndefined();
    expect(peekFieldSpec(add(built, 1))).toBeUndefined();
    // One level shallower and the composition derives a spec that parses.
    const shallower: FieldSpec = { fn: "let", bind: { x: nest("abs", 198, { fn: "index" }) }, args: [nest("abs", 56, v("x"))] };
    const composed = peekFieldSpec(add(fieldFromJson(shallower), 1)) as FieldSpec;
    expect(composed).toBeDefined();
    expect(() => fieldFromJson(composed)).not.toThrow();
  });
});

describe("let: text form", () => {
  it("prints bindings and bare references, and parses them back", () => {
    const text = printFieldSpec(EXAMPLE);
    expect(text).toBe('let({ lo: attribute("lo", 3), x: component(lo, 0) }, x * 2)');
    expect(parseFieldText(text)).toStrictEqual(EXAMPLE);
  });

  it("prints a var outside any let as var(...), which parses anywhere", () => {
    const later: FieldSpec = { fn: "let", bind: { a: v("b"), b: 1 }, args: [{ fn: "add", args: [v("a"), v("b")] }] };
    const text = printFieldSpec(later);
    expect(text).toBe('let({ a: var("b"), b: 1 }, a + b)');
    expect(parseFieldText(text)).toStrictEqual(later);
    expect(printFieldSpec(v("x"))).toBe('var("x")');
    expect(parseFieldText('var("x")')).toStrictEqual(v("x"));
    // Accepted inside a let too; it prints back bare.
    expect(parseFieldText('let({ a: 1 }, var("a") + a)')).toStrictEqual({
      fn: "let",
      bind: { a: 1 },
      args: [{ fn: "add", args: [v("a"), v("a")] }],
    });
  });

  it("refuses a bare name nothing binds, naming the names in scope", () => {
    expect(() => parseFieldText("let({ lo: 1 }, low * 2)")).toThrow(
      /1:16: "low" is not a name in scope here; did you mean lo\?/,
    );
    expect(() => parseFieldText("lo * 2")).toThrow(/"lo" is not a value/);
    // Scope ends with the let.
    expect(() => parseFieldText("let({ a: 1 }, a) + a")).toThrow(/1:20: "a" is not a value/);
    expect(() => parseFieldText("let(1, 2)")).toThrow(/let takes its bindings as an object literal first/);
    expect(() => parseFieldText("let({ a: 1 })")).toThrow(/between the let's bindings and its body/);
  });

  it("never reads a bare fn name as a reference, so even a refused binding name round-trips", () => {
    const spec: FieldSpec = {
      fn: "let",
      bind: { perlinNoise: 1 },
      args: [{ fn: "add", args: [{ fn: "fbm", base: "perlinNoise" }, v("perlinNoise")] }],
    };
    const text = printFieldSpec(spec);
    expect(text).toBe('let({ perlinNoise: 1 }, fbm(perlinNoise) + var("perlinNoise"))');
    expect(parseFieldText(text)).toStrictEqual(spec);
  });

  it("prints nested lets with each scope where it belongs", () => {
    const spec: FieldSpec = {
      fn: "let",
      bind: { p: { fn: "index" } },
      args: [{ fn: "add", args: [{ fn: "let", bind: { s: v("p") }, args: [{ fn: "mul", args: [v("s"), v("p")] }] }, v("p")] }],
    };
    const text = printFieldSpec(spec);
    expect(text).toBe("let({ p: index() }, let({ s: p }, s * p) + p)");
    expect(parseFieldText(text)).toStrictEqual(spec);
  });
});

describe("let: the domain-constant fold", () => {
  const INV_2_32 = 2.3283064365386963e-10;

  it("folds inside a binding but never folds the let itself", () => {
    const spec: FieldSpec = {
      fn: "let",
      bind: { s: { fn: "mul", args: [{ fn: "nodeSeed" }, INV_2_32] } },
      args: [{ fn: "add", args: [{ fn: "mul", args: [v("s"), { fn: "index" }] }, v("s")] }],
    };
    const field = fieldFromJson(spec);
    const folded = foldDomainConstants(field, 12345, 1 << 20);
    expect(folded).not.toBe(field);
    const out = fieldToJson(folded);
    expect(out.fn).toBe("let");
    expect((out.bind as Record<string, FieldSpec>).s.fn).toBe("constant");
    expect(out.args).toEqual(spec.args);
    const ctx = (): EvalContext => ({ ...ctxWith(6), seed: 12345 });
    expect(Array.from(evaluateField(folded, ctx()).data)).toEqual(Array.from(evaluateField(field, ctx()).data));
  });

  it("leaves a let whose bindings are all per-element exactly as written", () => {
    const field = fieldFromJson(EXAMPLE);
    expect(foldDomainConstants(field, 1, 1 << 20)).toBe(field);
  });
});
