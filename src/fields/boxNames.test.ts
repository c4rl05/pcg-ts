/**
 * Box names — `{ fn: "box", name }` — are notation over the standard
 * `boundsMin`/`boundsMax` pair. Every expectation here is the expression
 * a graph author would have written by hand, spelled out in the TEXT form
 * the corpus uses, never read back out of `BOX_EXPANSIONS`: a test that
 * compared the table with itself could not fail.
 */
import { describe, expect, it } from "vitest";
import { AttributeNotFoundError, Geometry, createPointCloud } from "../data/index.js";
import { type EvalContext, evaluateField } from "./index.js";
import { FieldJsonError, type FieldSpec, fieldFromJson, fieldToJson } from "./fieldJson.js";
import { parseFieldText, printFieldSpec } from "./fieldText.js";
import { BOX_EXPANSIONS, BOX_NAMES } from "./boxNames.js";
import { MAX_SPEC_DEPTH } from "./spec.js";
import { hashCombine, hashFloat } from "../random/index.js";

const LO = 'attribute("boundsMin", 3)';
const HI = 'attribute("boundsMax", 3)';

/** What each name means, as an author writes it today. */
const BY_HAND: Readonly<Record<string, string>> = {
  lo: LO,
  hi: HI,
  size: `${HI} - ${LO}`,
  center: `0.5 * (${LO} + ${HI})`,
  x0: `component(${LO}, 0)`,
  y0: `component(${LO}, 1)`,
  z0: `component(${LO}, 2)`,
  x1: `component(${HI}, 0)`,
  y1: `component(${HI}, 1)`,
  z1: `component(${HI}, 2)`,
  sx: `component(${HI}, 0) - component(${LO}, 0)`,
  sy: `component(${HI}, 1) - component(${LO}, 1)`,
  sz: `component(${HI}, 2) - component(${LO}, 2)`,
  cx: `0.5 * (component(${LO}, 0) + component(${HI}, 0))`,
  cy: `0.5 * (component(${LO}, 1) + component(${HI}, 1))`,
  cz: `0.5 * (component(${LO}, 2) + component(${HI}, 2))`,
};

const COUNT = 61;

/** Points with genuinely different, uneven boxes (and some negative). */
function boxes(): Geometry {
  const geo = createPointCloud(COUNT);
  const pts = geo.attrs.point;
  const lo = pts.require("boundsMin");
  const hi = pts.require("boundsMax");
  for (let i = 0; i < COUNT; i++) {
    const a = [0, 1, 2].map((k) => (hashFloat(hashCombine(11, i, k)) - 0.5) * 40);
    lo.setTuple(i, a);
    hi.setTuple(i, a.map((v, k) => v + 0.1 + hashFloat(hashCombine(12, i, k)) * (3 + k)));
  }
  return geo;
}

function bytes(col: { data: ArrayLike<number> }): string {
  const d = col.data as unknown as { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
  return Buffer.from(d.buffer, d.byteOffset, d.byteLength).toString("hex");
}

function ctx(geo: Geometry): EvalContext {
  return { geo, domain: "point", seed: 7 };
}

describe("box names are the expressions they stand for", () => {
  it("names every name the docs promise, and nothing else", () => {
    expect([...BOX_NAMES].sort()).toEqual(Object.keys(BY_HAND).sort());
  });

  for (const name of BOX_NAMES) {
    it(`${name}: same key, tuple size and bytes as ${BY_HAND[name]}`, () => {
      const box = fieldFromJson({ fn: "box", name });
      const hand = fieldFromJson(parseFieldText(BY_HAND[name] as string));
      expect(box.key).toBe(hand.key);
      expect(box.tupleSize).toBe(hand.tupleSize);
      // The table the compiler lowers is the same expression too.
      expect(fieldFromJson(BOX_EXPANSIONS[name]).key).toBe(hand.key);
      const geo = boxes();
      // Separate contexts, so neither is read out of the other's memo.
      const a = evaluateField(box, ctx(geo));
      const b = evaluateField(hand, ctx(geo));
      expect(a.tupleSize).toBe(b.tupleSize);
      expect(bytes(a)).toBe(bytes(b));
    });
  }

  it("a deliberately wrong expansion is reported as different (control)", () => {
    // The checks above must be able to fail: x1 - x0 written backwards,
    // and the y axis read for x, both differ in key AND in bytes.
    const geo = boxes();
    const sx = fieldFromJson({ fn: "box", name: "sx" });
    for (const wrong of [`component(${LO}, 0) - component(${HI}, 0)`, `component(${HI}, 1) - component(${LO}, 1)`]) {
      const w = fieldFromJson(parseFieldText(wrong));
      expect(w.key).not.toBe(sx.key);
      expect(bytes(evaluateField(w, ctx(geo)))).not.toBe(bytes(evaluateField(sx, ctx(geo))));
    }
    // And `lo` without the tuple size is a different KEY for the same
    // bytes: the names are defined WITH it, as the corpus writes them.
    expect(fieldFromJson(parseFieldText('attribute("boundsMin")')).key).not.toBe(
      fieldFromJson({ fn: "box", name: "lo" }).key,
    );
  });

  it("composes inside any expression with the same key as the inline form", () => {
    const text = 'vec(box("sx") * 0.5, box("y0") + 1, box("cz"))';
    const inline = text
      .replace('box("sx")', `(${BY_HAND.sx})`)
      .replace('box("y0")', BY_HAND.y0 as string)
      .replace('box("cz")', BY_HAND.cz as string);
    const a = fieldFromJson(parseFieldText(text));
    const b = fieldFromJson(parseFieldText(inline));
    expect(a.key).toBe(b.key);
    const geo = boxes();
    expect(bytes(evaluateField(a, ctx(geo)))).toBe(bytes(evaluateField(b, ctx(geo))));
  });

  it("nests exactly as deep as the expression it stands for", () => {
    // The depth bound must accept a box name exactly where it accepts the
    // written-out form: `cx` is four levels (mul, add, component,
    // attribute), so a wrapper that leaves room for one level fewer
    // refuses both.
    const wrap = (inner: FieldSpec, n: number): FieldSpec => {
      let s = inner;
      for (let i = 0; i < n; i++) s = { fn: "abs", args: [s] };
      return s;
    };
    const hand = parseFieldText(BY_HAND.cx as string);
    for (const n of [MAX_SPEC_DEPTH - 5, MAX_SPEC_DEPTH - 4, MAX_SPEC_DEPTH - 3, MAX_SPEC_DEPTH - 1]) {
      const ok = (s: FieldSpec): boolean => {
        try {
          fieldFromJson(s);
          return true;
        } catch {
          return false;
        }
      };
      expect(ok(wrap({ fn: "box", name: "cx" }, n)), `${n} wrappers`).toBe(ok(wrap(hand, n)));
    }
    expect(() => fieldFromJson(wrap({ fn: "box", name: "cx" }, MAX_SPEC_DEPTH - 3))).toThrow(
      /box\("cx"\) expanded/,
    );
  });

  it("serializes back as written, in JSON and in text", () => {
    const spec: FieldSpec = { fn: "add", args: [{ fn: "box", name: "x0" }, 1] };
    expect(fieldToJson(fieldFromJson(spec))).toEqual(spec);
    expect(printFieldSpec({ fn: "box", name: "x0" })).toBe('box("x0")');
    expect(parseFieldText('box("x0") + 1')).toEqual(spec);
  });

  it("reads the default box every point already has", () => {
    // `createPointCloud` adds both corners, zero at the origin, so a point
    // nothing has boxed reads a zero box rather than refusing.
    const geo = createPointCloud(3);
    const col = evaluateField(fieldFromJson({ fn: "box", name: "size" }), ctx(geo));
    expect(Array.from(col.data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("box names and let", () => {
  it("are a namespace of their own: a let may bind x0 and still read box(\"x0\")", () => {
    const geo = boxes();
    const spec = parseFieldText('let({ x0: 7 }, x0 + box("x0"))');
    expect(spec).toEqual({
      fn: "let",
      bind: { x0: 7 },
      args: [{ fn: "add", args: [{ fn: "var", name: "x0" }, { fn: "box", name: "x0" }] }],
    });
    const col = evaluateField(fieldFromJson(spec), ctx(geo));
    const lo = geo.attrs.point.require("boundsMin");
    for (let i = 0; i < COUNT; i++) expect(col.data[i]).toBe(Math.fround(7 + (lo.data[i * 3] as number)));
  });

  it("a let binding a box name to the box name reads the same field", () => {
    const a = fieldFromJson(parseFieldText('let({ sx: box("sx") }, sx * sx)'));
    const b = fieldFromJson(parseFieldText('box("sx") * box("sx")'));
    expect(a.key).toBe(b.key);
  });

  it("refuses a binding named box, which is a fn", () => {
    expect(() => fieldFromJson(parseFieldText("let({ box: 1 }, box + 1)"))).toThrow(/"box" is a field/);
    expect(() =>
      fieldFromJson({ fn: "let", bind: { box: 1 }, args: [{ fn: "var", name: "box" }] } as FieldSpec),
    ).toThrow(/"box" is a field fn/);
  });

  it("tells a var reading a box name where the box names are", () => {
    expect(() => fieldFromJson({ fn: "var", name: "sx" } as FieldSpec)).toThrow(
      /"sx" is a BOX NAME: the element's own box is \{"fn": "box", "name": "sx"\}/,
    );
  });

  it("tells a bare box name in the text form what to write", () => {
    expect(() => parseFieldText("sx * 2")).toThrow(/did you mean box\("sx"\)/);
  });
});

describe("box name refusals", () => {
  it("names the valid names and the nearest one", () => {
    let err: unknown;
    try {
      fieldFromJson({ fn: "box", name: "sX" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(FieldJsonError);
    const e = err as FieldJsonError;
    expect(e.message).toMatch(/box name "sX" is not one/);
    expect(e.message).toContain("lo, hi, size, center, x0");
    const record = e.diagnostics[0];
    expect(record?.valid).toEqual([...BOX_NAMES]);
    expect(record?.didYouMean).toContain("sx");
    expect(() => fieldFromJson({ fn: "box" } as FieldSpec)).toThrow(/box requires a "name"/);
    expect(() => fieldFromJson({ fn: "box", name: 3 } as unknown as FieldSpec)).toThrow(/box requires a "name"/);
    expect(() => fieldFromJson({ fn: "box", name: "x0", tupleSize: 3 } as FieldSpec)).toThrow(/unknown key "tupleSize"/);
  });

  it("refuses a point domain whose box column was removed, naming setBounds", () => {
    const geo = createPointCloud(2);
    geo.attrs.point.remove("boundsMax");
    const field = fieldFromJson({ fn: "box", name: "sx" });
    let err: unknown;
    try {
      evaluateField(field, ctx(geo));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AttributeNotFoundError);
    const e = err as AttributeNotFoundError;
    expect(e.message).toMatch(/^box\("sx"\): point attribute "boundsMax" not found/);
    expect(e.message).toContain("setBounds");
    expect(e.attribute).toBe("boundsMax");
    // A name reading only the other corner is unaffected.
    expect(() => evaluateField(fieldFromJson({ fn: "box", name: "x0" }), ctx(geo))).not.toThrow();
  });

  it("refuses a domain with no box at all, naming where boxes live", () => {
    const geo = new Geometry();
    geo.attrs.primitive.resize(2);
    expect(() =>
      evaluateField(fieldFromJson({ fn: "box", name: "lo" }), { geo, domain: "primitive", seed: 0 }),
    ).toThrow(/box\("lo"\): primitive attribute "boundsMin" not found.*setBounds writes boxes on POINTS/);
  });
});
