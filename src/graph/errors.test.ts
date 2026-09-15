import { describe, expect, it } from "vitest";

import { type Diagnostic, diagnosticsOf } from "../diagnostics/index.js";
import { FieldJsonError } from "../fields/fieldJson.js";
import { GraphSerializationError } from "../nodes/serialize.js";
import {
  CookCancelledError,
  GraphCycleError,
  GraphError,
  GraphValidationError,
  NodeExecutionError,
} from "./errors.js";

const rec = (code: Diagnostic["code"], message: string): Diagnostic => ({
  code,
  severity: "error",
  message,
});

describe("error classes carry diagnostics", () => {
  it("default to one record with the class's coarse code and the message verbatim", () => {
    expect(new GraphError("g").diagnostics).toEqual([rec("error", "g")]);
    expect(new GraphValidationError("v").diagnostics).toEqual([rec("error", "v")]);
    expect(new GraphCycleError("c").diagnostics).toEqual([rec("cycle", "c")]);
    expect(new CookCancelledError().diagnostics).toEqual([rec("cook-cancelled", "cook cancelled")]);
    expect(new GraphSerializationError("s").diagnostics).toEqual([rec("error", "s")]);
    expect(new FieldJsonError("f").diagnostics).toEqual([rec("invalid-field-spec", "f")]);
  });

  it("leave the message, name and cause exactly as before", () => {
    const cause = new Error("root");
    const v = new GraphValidationError('node "a" has no output pin "nope"', { cause });
    expect(v.message).toBe('node "a" has no output pin "nope"');
    expect(v.name).toBe("GraphValidationError");
    expect(v.cause).toBe(cause);
    expect(new CookCancelledError().message).toBe("cook cancelled");
    expect("cause" in new CookCancelledError()).toBe(false);
    expect(new GraphSerializationError("s").name).toBe("GraphSerializationError");
    expect(new FieldJsonError("f").name).toBe("FieldJsonError");
  });

  it("take an explicit code as the trailing argument", () => {
    expect(new GraphError("g", undefined, "unknown-node").diagnostics).toEqual([
      rec("unknown-node", "g"),
    ]);
    expect(new GraphValidationError("v", undefined, "unknown-pin").diagnostics).toEqual([
      rec("unknown-pin", "v"),
    ]);
    expect(new GraphCycleError("c", undefined, "subgraph-cycle").diagnostics).toEqual([
      rec("subgraph-cycle", "c"),
    ]);
    expect(new CookCancelledError("stop", "error").diagnostics).toEqual([rec("error", "stop")]);
    expect(new GraphSerializationError("s", "unknown-node-type").diagnostics).toEqual([
      rec("unknown-node-type", "s"),
    ]);
    expect(new FieldJsonError("f", "unknown-field-fn").diagnostics).toEqual([
      rec("unknown-field-fn", "f"),
    ]);
  });

  it("take a full list, and treat an empty one as absent", () => {
    const list: Diagnostic[] = [
      { code: "unknown-param", severity: "error", message: "one", nodeId: "n", param: "cout" },
      { code: "unknown-node", severity: "error", message: "two", path: "/connections/0/0" },
    ];
    expect(new GraphSerializationError("one\ntwo", list).diagnostics).toEqual(list);
    expect(new GraphCycleError("c", undefined, []).diagnostics).toEqual([rec("cycle", "c")]);
  });

  it("freeze what they carry", () => {
    const err = new GraphValidationError("v");
    expect(Object.isFrozen(err.diagnostics)).toBe(true);
    expect(Object.isFrozen(err.diagnostics[0])).toBe(true);
  });

  it("are what diagnosticsOf returns for them", () => {
    const errs = [
      new GraphError("g"),
      new GraphValidationError("v", undefined, "unknown-pin"),
      new GraphCycleError("c"),
      new CookCancelledError(),
      new NodeExecutionError("a", new Error("x")),
      new GraphSerializationError("s", "invalid-section"),
      new FieldJsonError("f"),
    ];
    for (const err of errs) expect(diagnosticsOf(err)).toBe(err.diagnostics);
  });
});

describe("NodeExecutionError diagnostics", () => {
  it("is node-execution-failed for an unclassified cause, with the node id and a one-entry path", () => {
    const err = new NodeExecutionError("scatter", new Error("boom"));
    expect(err.message).toBe('node "scatter" failed: boom');
    expect(err.diagnostics).toEqual([
      {
        code: "node-execution-failed",
        severity: "error",
        message: 'node "scatter" failed: boom',
        nodeId: "scatter",
        nodePath: ["scatter"],
      },
    ]);
  });

  it("treats a GraphError with the fallback code, a string and undefined as unclassified", () => {
    for (const cause of [new GraphValidationError("v"), "text", undefined]) {
      expect(new NodeExecutionError("n", cause).diagnostics[0]?.code).toBe("node-execution-failed");
    }
  });

  it("does not inherit cook-cancelled: a cancellation that reaches the wrapper is a failure", () => {
    // The scheduler rethrows a genuine cancellation unwrapped, checking the
    // signal aborted; only a CookCancelledError with no abort behind it is
    // ever wrapped, and reporting that as a benign cancel would hide it.
    const [d] = new NodeExecutionError("n", new CookCancelledError()).diagnostics;
    expect(d?.code).toBe("node-execution-failed");
    expect(d?.nodePath).toEqual(["n"]);
  });

  it("takes the cause's code, and its other fields, when the cause is classified", () => {
    expect(new NodeExecutionError("n", new FieldJsonError("f")).diagnostics[0]?.code).toBe(
      "invalid-field-spec",
    );
    const cause = new FieldJsonError("unknown key", [
      {
        code: "unknown-field-key",
        severity: "error",
        message: "unknown key",
        key: "freq",
        valid: ["frequency"],
        didYouMean: ["frequency"],
      },
    ]);
    const err = new NodeExecutionError("noise", cause);
    expect(err.diagnostics).toEqual([
      {
        code: "unknown-field-key",
        severity: "error",
        message: 'node "noise" failed: unknown key',
        key: "freq",
        valid: ["frequency"],
        didYouMean: ["frequency"],
        nodeId: "noise",
        nodePath: ["noise"],
      },
    ]);
  });

  it("builds nodePath from nested executions, outermost first", () => {
    const inner = new NodeExecutionError("leaf", new Error("x"));
    const mid = new NodeExecutionError("body", inner);
    const outer = new NodeExecutionError("wrapper", mid);
    const [d] = outer.diagnostics;
    expect(d?.code).toBe("node-execution-failed");
    expect(d?.nodeId).toBe("wrapper");
    expect(d?.nodePath).toEqual(["wrapper", "body", "leaf"]);
    expect(d?.message).toBe(outer.message);
    expect(outer.message).toBe('node "wrapper" failed: node "body" failed: node "leaf" failed: x');
  });

  it("carries a classified code up through every nesting level", () => {
    const leaf = new NodeExecutionError("leaf", new FieldJsonError("f", "unknown-field-fn"));
    const outer = new NodeExecutionError("wrapper", leaf);
    expect(outer.diagnostics[0]?.code).toBe("unknown-field-fn");
    expect(outer.diagnostics[0]?.nodePath).toEqual(["wrapper", "leaf"]);
  });

  it("does not take a nodePath from a cause that is not a node execution", () => {
    const cause = new GraphValidationError("v", undefined, [
      { code: "unknown-node", severity: "error", message: "v", nodeId: "other", nodePath: ["x", "other"] },
    ]);
    const [d] = new NodeExecutionError("n", cause).diagnostics;
    expect(d?.code).toBe("unknown-node");
    expect(d?.nodeId).toBe("n");
    expect(d?.nodePath).toEqual(["n"]);
  });

  it("takes an explicit code or list as the trailing argument", () => {
    expect(new NodeExecutionError("n", undefined, "msg", "attribute-not-found").diagnostics).toEqual([
      { code: "attribute-not-found", severity: "error", message: "msg", nodeId: "n", nodePath: ["n"] },
    ]);
    const list: Diagnostic[] = [
      { code: "cook-cancelled", severity: "error", message: "msg", nodeId: "n", nodePath: ["n", "m"] },
    ];
    expect(new NodeExecutionError("n", undefined, "msg", list).diagnostics).toEqual(list);
  });

  it("falls back to the cause-derived record on an untyped bad trailing argument", () => {
    const Untyped = NodeExecutionError as unknown as new (
      id: string,
      cause: unknown,
      message?: string,
      diagnostics?: unknown,
    ) => NodeExecutionError;
    for (const bad of [null, "made-up", [{ code: "nope" }], 7]) {
      expect(new Untyped("n", new Error("x"), undefined, bad).diagnostics).toEqual([
        {
          code: "node-execution-failed",
          severity: "error",
          message: 'node "n" failed: x',
          nodeId: "n",
          nodePath: ["n"],
        },
      ]);
    }
  });
});
