import { describe, expect, it } from "vitest";
import { diagnosticsOf } from "../diagnostics/index.js";
import { AttributeNotFoundError, attributeNotFound, requireAttributeOn } from "./attributeNotFound.js";
import { createPointCloud, type Geometry } from "./index.js";

/** Three points carrying P and seed, plus whatever `extra` adds. */
function cloud(extra: (geo: Geometry) => void = () => {}): Geometry {
  const geo = createPointCloud(3);
  extra(geo);
  return geo;
}

describe("AttributeNotFoundError", () => {
  it("is exported from the data barrel", async () => {
    const barrel = await import("./index.js");
    expect(barrel.AttributeNotFoundError).toBe(AttributeNotFoundError);
    // The helpers are plumbing, imported by path.
    expect("attributeNotFound" in barrel).toBe(false);
    expect("requireAttributeOn" in barrel).toBe(false);
  });

  it("names the domain and lists what it carries", () => {
    const geo = cloud();
    const err = attributeNotFound(geo, "point", "height");
    const names = geo.attrs.point.names();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AttributeNotFoundError");
    expect(err.message).toBe(
      `point attribute "height" not found; available point attributes: ${names.join(", ")}`,
    );
    expect(err.attribute).toBe("height");
    expect(err.domain).toBe("point");
    expect(err.available).toEqual(names);
    expect(err.foundOn).toEqual([]);
    expect(err.didYouMean).toEqual([]);
    expect(err.param).toBeUndefined();
  });

  it("says (none) for an empty domain", () => {
    const err = attributeNotFound(cloud(), "primitive", "width");
    expect(err.message).toBe('primitive attribute "width" not found; available primitive attributes: (none)');
    expect(err.available).toEqual([]);
  });

  it("suggests the near misses", () => {
    const geo = cloud((g) => {
      g.attrs.point.add("height", "f32", 1);
    });
    const err = attributeNotFound(geo, "point", "heigth");
    expect(err.didYouMean).toEqual(["height"]);
    // The suggestion comes BEFORE the list it was drawn from.
    expect(err.message).toMatch(/ not found; did you mean "height"\? available point attributes: [^;]*height$/);
  });

  it("joins several suggestions with commas and a final or", () => {
    const geo = cloud((g) => {
      g.attrs.point.add("ab1", "f32", 1);
      g.attrs.point.add("ab2", "f32", 1);
      g.attrs.point.add("ab3", "f32", 1);
    });
    const err = attributeNotFound(geo, "point", "ab");
    expect(err.didYouMean).toEqual(["ab1", "ab2", "ab3"]);
    expect(err.message).toContain('did you mean "ab1", "ab2" or "ab3"?');
  });

  it("names the domain that does carry it, and the promote that moves it", () => {
    const geo = cloud((g) => {
      g.attrs.detail.add("height", "f32", 1, 4);
    });
    const err = attributeNotFound(geo, "point", "height");
    expect(err.foundOn).toEqual(["detail"]);
    expect(err.message).toBe(
      `point attribute "height" not found; available point attributes: ${geo.attrs.point.names().join(", ")}; ` +
        `"height" exists on the detail domain — a point field cannot read a detail attribute; ` +
        `promote it first with promoteAttribute (name "height", from "detail", to "point", mode "first")`,
    );
    const [record] = err.diagnostics;
    expect(err.diagnostics).toHaveLength(1);
    expect(record).toEqual({
      code: "attribute-not-found",
      severity: "error",
      message: err.message,
      got: "height",
      valid: geo.attrs.point.names(),
      // A detail column broadcasts unchanged, so this one is safe to apply.
      fix: 'insert promoteAttribute (name "height", from "detail", to "point", mode "first") before this read',
    });
    expect(diagnosticsOf(err)).toBe(err.diagnostics);
  });

  it("lists several carrying domains in canonical order and promotes from the first", () => {
    const geo = cloud((g) => {
      g.attrs.detail.add("w", "f32", 1);
      g.attrs.vertex.add("w", "f32", 1);
    });
    const err = attributeNotFound(geo, "primitive", "w");
    expect(err.foundOn).toEqual(["vertex", "detail"]);
    expect(err.message).toContain(
      `"w" exists on the vertex and detail domains — a primitive field cannot read another domain's attribute; ` +
        `promote it first with promoteAttribute (name "w", from "vertex", to "primitive")`,
    );
    // An aggregating promote is not safe to apply blind.
    expect(err.diagnostics[0]?.fix).toBeUndefined();
  });

  it('names mode "first" for a string column, the only mode promote accepts for one', () => {
    const geo = cloud((g) => {
      g.attrs.primitive.add("kind", "string", 1, "road");
    });
    const err = attributeNotFound(geo, "point", "kind");
    expect(err.message).toContain(
      'promote it first with promoteAttribute (name "kind", from "primitive", to "point", mode "first")',
    );
    // Still aggregates across the primitives sharing a point: not a fix.
    expect(err.diagnostics[0]?.fix).toBeUndefined();
    // A numeric column on the same domain leaves the mode to the author.
    const numeric = cloud((g) => {
      g.attrs.primitive.add("width", "f32", 1);
    });
    expect(attributeNotFound(numeric, "point", "width").message).toContain(
      'promoteAttribute (name "width", from "primitive", to "point")',
    );
  });

  it("records the pin and states it in the fix; a reader can opt out of the fix", () => {
    const geo = cloud((g) => {
      g.attrs.detail.add("tone", "f32", 1);
    });
    const pinned = attributeNotFound(geo, "point", "tone", { pin: "source", param: "attribute" });
    expect(pinned.diagnostics[0]).toMatchObject({
      pin: "source",
      param: "attribute",
      fix: 'insert promoteAttribute (name "tone", from "detail", to "point", mode "first") on the geometry reaching input pin "source" before this read',
    });
    expect(attributeNotFound(geo, "point", "tone", { fixable: false }).diagnostics[0]?.fix).toBeUndefined();
    const byParam = attributeNotFound(geo, "point", "tone", {
      otherDomain: { domainParam: "domain" },
      fixable: false,
    });
    expect(byParam.message).toContain('set param "domain" to "detail"');
    expect(byParam.diagnostics[0]?.fix).toBeUndefined();
  });

  it("offers no fix for a single non-detail domain under the promote hint", () => {
    const geo = cloud();
    const err = attributeNotFound(geo, "detail", "seed");
    expect(err.foundOn).toEqual(["point"]);
    expect(err.message).toContain("a detail field cannot read a point attribute");
    expect(err.diagnostics[0]?.fix).toBeUndefined();
  });

  it("points a reader with a domain param at the param instead", () => {
    const geo = cloud((g) => {
      g.attrs.primitive.add("width", "f32", 1);
    });
    const err = attributeNotFound(geo, "point", "width", {
      prefix: "attributeReduce: ",
      param: "name",
      otherDomain: { domainParam: "domain" },
    });
    expect(err.message).toBe(
      `attributeReduce: point attribute "width" not found; available point attributes: ${geo.attrs.point.names().join(", ")}; ` +
        `"width" exists on the primitive domain — set param "domain" to "primitive"`,
    );
    expect(err.diagnostics[0]).toMatchObject({ param: "name", fix: 'set param "domain" to "primitive"' });
  });

  it("takes a reader, a location, no hint and a verbatim suffix", () => {
    const geo = cloud((g) => {
      g.attrs.detail.add("hilly", "f32", 1);
    });
    const worded = attributeNotFound(geo, "point", "hilly", {
      reader: "pathScan",
      on: "the source geometry",
    });
    expect(worded.message).toMatch(/^point attribute "hilly" not found on the source geometry; /);
    expect(worded.message).toContain("— pathScan cannot read a detail attribute;");
    const quiet = attributeNotFound(geo, "point", "hilly", { otherDomain: "none", suffix: " (custom)" });
    expect(quiet.foundOn).toEqual(["detail"]);
    expect(quiet.message).toBe(
      `point attribute "hilly" not found; available point attributes: ${geo.attrs.point.names().join(", ")} (custom)`,
    );
    expect(quiet.diagnostics[0]?.fix).toBeUndefined();
  });

  it("withPrefix re-words the same fault, adds the param and keeps the original as cause", () => {
    const geo = cloud((g) => {
      g.attrs.detail.add("height", "f32", 1);
    });
    const inner = attributeNotFound(geo, "point", "height");
    const outer = inner.withPrefix('setAttribute: param "value": ', "value");
    expect(outer).toBeInstanceOf(AttributeNotFoundError);
    expect(outer.message).toBe(`setAttribute: param "value": ${inner.message}`);
    expect(outer.cause).toBe(inner);
    expect(outer.param).toBe("value");
    expect(outer.foundOn).toEqual(inner.foundOn);
    expect(outer.diagnostics[0]).toEqual({ ...inner.diagnostics[0], message: outer.message, param: "value" });
  });

  it("freezes its lists, so a holder cannot edit what another reads", () => {
    const geo = cloud();
    const err = attributeNotFound(geo, "point", "x");
    expect(Object.isFrozen(err.available)).toBe(true);
    expect(Object.isFrozen(err.foundOn)).toBe(true);
    expect(Object.isFrozen(err.didYouMean)).toBe(true);
    // The error's list is a copy: a later write to the geometry leaves it alone.
    geo.attrs.point.add("x", "f32", 1);
    expect(err.available).not.toContain("x");
  });

  it("requireAttributeOn returns the attribute or throws the error", () => {
    const geo = cloud();
    expect(requireAttributeOn(geo, "point", "P")).toBe(geo.attrs.point.get("P"));
    expect(() => requireAttributeOn(geo, "point", "Q")).toThrow(AttributeNotFoundError);
  });
});
