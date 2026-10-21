/**
 * `let` / `var` on the WGSL path: the kernel a let compiles to is the
 * inline expression's kernel, character for character and key for key —
 * which is what makes it bit-identical on the device as well as on the
 * CPU, and what lets the two forms share one pipeline.
 */
import { describe, expect, it } from "vitest";
import { type FieldSpec, fieldFromJson } from "../fields/fieldJson.js";
import { peekFieldSpec } from "../fields/spec.js";
import { compileFieldSpec } from "./index.js";
import { PARITY_LAYOUT } from "./parity.testsupport.js";

const v = (name: string): FieldSpec => ({ fn: "var", name });
const P: FieldSpec = { fn: "position" };
const PX: FieldSpec = { fn: "component", args: [P], index: 0 };
const PY: FieldSpec = { fn: "component", args: [P], index: 1 };

function same(letSpec: FieldSpec, inline: FieldSpec): string {
  const a = compileFieldSpec(letSpec, PARITY_LAYOUT);
  const b = compileFieldSpec(inline, PARITY_LAYOUT);
  expect(a.wgsl).toBe(b.wgsl);
  expect(a.key).toBe(b.key);
  expect(a.outType).toBe(b.outType);
  expect(a.inputs).toEqual(b.inputs);
  return a.wgsl;
}

describe("let compiles to the inline expression's kernel", () => {
  it("emits a binding at its FIRST reference, not at its definition", () => {
    // Inline, `cos(y)` is compiled before `sin(x)`; a let that compiled
    // `a` where it is written would emit them the other way round.
    const sinX: FieldSpec = { fn: "sin", args: [PX] };
    const wgsl = same(
      { fn: "let", bind: { a: sinX }, args: [{ fn: "add", args: [{ fn: "cos", args: [PY] }, { fn: "mul", args: [v("a"), v("a")] }] }] },
      { fn: "add", args: [{ fn: "cos", args: [PY] }, { fn: "mul", args: [sinX, sinX] }] },
    );
    // One `sin`, however many times it is read.
    expect(wgsl.match(/sin\(/g)?.length).toBe(1);
  });

  it("holds through sequential bindings, nesting, a noise position and a byAttribute case", () => {
    const q: FieldSpec = { fn: "mul", args: [P, 0.5] };
    const s: FieldSpec = { fn: "add", args: [{ fn: "component", args: [q], index: 2 }, { fn: "attribute", name: "density" }] };
    const noiseAt = (pos: FieldSpec): FieldSpec => ({ fn: "perlinNoise", opts: { position: pos, seed: 3 } });
    const cased = (val: FieldSpec): FieldSpec => ({ fn: "byAttribute", name: "species", cases: { pine: val, oak: 2 }, default: 0 });
    same(
      {
        fn: "let",
        bind: { q, s: { fn: "add", args: [{ fn: "component", args: [v("q")], index: 2 }, { fn: "attribute", name: "density" }] } },
        args: [
          {
            fn: "add",
            args: [
              noiseAt(v("q")),
              { fn: "let", bind: { t: { fn: "mul", args: [v("s"), v("s")] } }, args: [cased(v("t"))] },
            ],
          },
        ],
      },
      { fn: "add", args: [noiseAt(q), cased({ fn: "mul", args: [s, s] })] },
    );
  });

  it("stores a root let in the column type of what it stands for", () => {
    // The root special cases turn on the fn the expression IS: a bare i32
    // attribute is copied raw, a bare index stores u32.
    const material: FieldSpec = { fn: "attribute", name: "material" };
    same({ fn: "let", bind: { m: material }, args: [v("m")] }, material);
    expect(compileFieldSpec({ fn: "let", bind: { m: material }, args: [v("m")] }, PARITY_LAYOUT).outType).toBe("i32");
    same({ fn: "let", bind: { i: { fn: "index" } }, args: [{ fn: "let", bind: { j: v("i") }, args: [v("j")] }] }, { fn: "index" });
  });

  it("compiles a spliced let in its own scope", () => {
    // The spliced field reuses the outer name `a`; the GPU must read ITS
    // `a` inside the splice and the outer one outside it.
    const spliced = fieldFromJson({ fn: "let", bind: { a: PY }, args: [{ fn: "mul", args: [v("a"), 3] }] });
    const field = fieldFromJson(
      { fn: "let", bind: { a: PX }, args: [{ fn: "add", args: [v("a"), { fn: "param", name: "f" }] }] },
      { f: spliced },
    );
    const kernel = compileFieldSpec(peekFieldSpec(field) as FieldSpec, PARITY_LAYOUT);
    const inline = compileFieldSpec({ fn: "add", args: [PX, { fn: "mul", args: [PY, 3] }] }, PARITY_LAYOUT);
    expect(kernel.wgsl).toBe(inline.wgsl);
  });

  it("binds an attribute read only inside a binding", () => {
    const k = compileFieldSpec(
      { fn: "let", bind: { u: { fn: "attribute", name: "uv", tupleSize: 2 } }, args: [{ fn: "length", args: [v("u")] }] },
      PARITY_LAYOUT,
    );
    expect(k.inputs.map((i) => i.name)).toEqual(["uv"]);
  });
});
