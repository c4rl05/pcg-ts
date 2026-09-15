import { describe, expect, it } from "vitest";

import { diagnosticsOf, errorDiagnostics, isDiagnostic, isDiagnosticList } from "./record.js";
import type { Diagnostic } from "./types.js";

// Structural stand-ins only: this directory is a leaf, its tests included,
// so the real error classes are exercised beside their definitions
// (src/graph/errors.test.ts).

describe("isDiagnostic", () => {
  const minimal: Diagnostic = { code: "unknown-param", severity: "error", message: "m" };

  it("accepts a minimal and a fully-populated record", () => {
    expect(isDiagnostic(minimal)).toBe(true);
    const full: Diagnostic = {
      ...minimal,
      path: "/nodes/0/params/cout",
      nodeId: "scatter",
      nodePath: ["outer", "scatter"],
      pin: "in",
      param: "cout",
      key: "cout",
      got: { nested: [1, "two", null, true] },
      valid: ["count", "seed"],
      expected: "a known param",
      didYouMean: ["count"],
      fix: 'rename "cout" to "count"',
    };
    expect(isDiagnostic(full)).toBe(true);
  });

  it("refuses unknown codes, bad severities and mistyped fields", () => {
    expect(isDiagnostic({ ...minimal, code: "made-up" })).toBe(false);
    expect(isDiagnostic({ ...minimal, severity: "info" })).toBe(false);
    expect(isDiagnostic({ ...minimal, message: 3 })).toBe(false);
    expect(isDiagnostic({ ...minimal, nodeId: 3 })).toBe(false);
    expect(isDiagnostic({ ...minimal, nodePath: ["a", 1] })).toBe(false);
    expect(isDiagnostic({ ...minimal, valid: "count" })).toBe(false);
    expect(isDiagnostic({ ...minimal, got: new Date(0) })).toBe(false);
    expect(isDiagnostic({ ...minimal, got: () => 1 })).toBe(false);
    expect(isDiagnostic(null)).toBe(false);
    expect(isDiagnostic([minimal])).toBe(false);
  });

  it("refuses a cyclic `got` instead of recursing forever", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;
    expect(isDiagnostic({ ...minimal, got: cyclic })).toBe(false);
  });

  it("a list must be non-empty and every entry well-formed", () => {
    expect(isDiagnosticList([minimal])).toBe(true);
    expect(isDiagnosticList([])).toBe(false);
    expect(isDiagnosticList([minimal, { code: "nope" }])).toBe(false);
    const hostile = [
      Object.defineProperty({}, "code", {
        get() {
          throw new Error("no");
        },
      }),
    ];
    expect(isDiagnosticList(hostile)).toBe(false);
  });
});

describe("errorDiagnostics", () => {
  it("defaults to one record with the fallback code and the message", () => {
    expect(errorDiagnostics("boom", undefined, "cycle")).toEqual([
      { code: "cycle", severity: "error", message: "boom" },
    ]);
  });

  it("takes a code, or a list, and treats an empty list as absent", () => {
    expect(errorDiagnostics("boom", "unknown-node", "error")).toEqual([
      { code: "unknown-node", severity: "error", message: "boom" },
    ]);
    const list: Diagnostic[] = [
      { code: "unknown-pin", severity: "error", message: "a", pin: "x" },
      { code: "node-unreachable", severity: "warning", message: "b", nodeId: "n" },
    ];
    expect(errorDiagnostics("boom", list, "error")).toEqual(list);
    expect(errorDiagnostics("boom", [], "cycle")).toEqual([
      { code: "cycle", severity: "error", message: "boom" },
    ]);
  });

  it("falls back to the default record, rather than throwing, on input that does not validate", () => {
    const untyped = errorDiagnostics as (m: string, g: unknown, f: "cycle") => readonly Diagnostic[];
    const fallback = [{ code: "cycle", severity: "error", message: "boom" }];
    expect(untyped("boom", "made-up", "cycle")).toEqual(fallback);
    expect(untyped("boom", [{ code: "nope" }], "cycle")).toEqual(fallback);
    expect(untyped("boom", 42, "cycle")).toEqual(fallback);
  });

  it("deep-copies `got`, so a later edit to the caller's object cannot reach the record", () => {
    const got: Record<string, unknown> = { a: [1, 2] };
    const out = errorDiagnostics("m", [{ code: "error", severity: "error", message: "m", got: got as { a: number[] } }], "error");
    got["fn"] = () => 1;
    (got["a"] as number[]).push(3);
    expect(out[0]?.got).toEqual({ a: [1, 2] });
    expect(Object.isFrozen(out[0]?.got)).toBe(true);
    expect(() => structuredClone(out)).not.toThrow();
  });

  it("copies and freezes, so the caller's list cannot edit the error's", () => {
    const nodePath = ["a", "b"];
    const list: Diagnostic[] = [{ code: "error", severity: "error", message: "m", nodePath }];
    const out = errorDiagnostics("m", list, "error");
    nodePath.push("c");
    expect(out[0]?.nodePath).toEqual(["a", "b"]);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out[0])).toBe(true);
    expect(Object.isFrozen(out[0]?.nodePath)).toBe(true);
  });
});

describe("diagnosticsOf", () => {
  it("wraps a plain Error as one `error` record carrying its message", () => {
    expect(diagnosticsOf(new Error("plain"))).toEqual([
      { code: "error", severity: "error", message: "plain" },
    ]);
  });

  it("wraps a string, null and undefined", () => {
    expect(diagnosticsOf("just text")).toEqual([
      { code: "error", severity: "error", message: "just text" },
    ]);
    expect(diagnosticsOf(null)).toEqual([{ code: "error", severity: "error", message: "null" }]);
    expect(diagnosticsOf(undefined)).toEqual([
      { code: "error", severity: "error", message: "undefined" },
    ]);
  });

  it("returns a list this module built as itself", () => {
    const built = errorDiagnostics("t", "unknown-node-type", "error");
    expect(diagnosticsOf({ diagnostics: built })).toBe(built);
  });

  it("returns a foreign well-formed list as a frozen copy of its declared fields", () => {
    const diagnostics = [
      {
        code: "unknown-node-type",
        severity: "error",
        message: "t",
        didYouMean: ["pointGrid"],
        extra: () => "not data",
      },
    ];
    const err = Object.assign(new Error("t"), { diagnostics });
    const out = diagnosticsOf(err);
    expect(out).not.toBe(diagnostics);
    expect(out).toEqual([
      { code: "unknown-node-type", severity: "error", message: "t", didYouMean: ["pointGrid"] },
    ]);
    expect(Object.isFrozen(out)).toBe(true);
    // Clone-safe: the function-valued stray key did not ride along.
    expect(() => structuredClone(out)).not.toThrow();
  });

  it("refuses non-finite numbers in `got`, which JSON cannot carry", () => {
    const base = { code: "invalid-param-value", severity: "error", message: "m" } as const;
    expect(isDiagnostic({ ...base, got: 1.5 })).toBe(true);
    expect(isDiagnostic({ ...base, got: Number.NaN })).toBe(false);
    expect(isDiagnostic({ ...base, got: [1, Number.POSITIVE_INFINITY] })).toBe(false);
  });

  it("ignores a malformed carried list and classifies by name instead", () => {
    const err = Object.assign(new Error("bad spec"), {
      name: "FieldJsonError",
      diagnostics: [{ code: "nope", severity: "error", message: "x" }],
    });
    expect(diagnosticsOf(err)).toEqual([
      { code: "invalid-field-spec", severity: "error", message: "bad spec" },
    ]);
  });

  it("classifies a structurally-similar object by name and shape, not instanceof", () => {
    expect(diagnosticsOf({ name: "NodeExecutionError", message: "node \"a\" failed: x", nodeId: "a" }))
      .toEqual([
        {
          code: "node-execution-failed",
          severity: "error",
          message: 'node "a" failed: x',
          nodeId: "a",
          nodePath: ["a"],
        },
      ]);
    expect(diagnosticsOf({ name: "GraphCycleError", message: "c" })[0]?.code).toBe("cycle");
    expect(diagnosticsOf({ name: "CookCancelledError", message: "c" })[0]?.code).toBe("cook-cancelled");
    expect(diagnosticsOf({ name: "CliUsageError", message: "c" })[0]?.code).toBe("usage");
    expect(diagnosticsOf({ name: "GraphValidationError", message: "v" })[0]?.code).toBe("error");
    // An inherited name does not classify.
    expect(diagnosticsOf({ name: "toString", message: "m" })[0]?.code).toBe("error");
  });

  it("never throws, whatever it is handed", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("trap");
        },
      },
    );
    expect(diagnosticsOf(hostile)).toHaveLength(1);
    expect(diagnosticsOf(Object.create(null))).toEqual([
      { code: "error", severity: "error", message: "unknown error" },
    ]);
    expect(diagnosticsOf(Symbol("s"))[0]?.message).toBe("Symbol(s)");
    expect(diagnosticsOf({ message: "shaped" })[0]?.message).toBe("shaped");
  });
});
