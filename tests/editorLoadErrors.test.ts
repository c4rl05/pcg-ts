/**
 * The editor's load-error toast: a refused graph document reads as one line
 * per fault, located by its JSON pointer and capped, instead of the loader's
 * whole joined message on one run-on line.
 *
 * Lives in `tests/` because the editor is outside vitest's `src/**` include.
 */
import { describe, expect, it } from "vitest";
import { deserializeGraph } from "pcg-ts";
import { EditorController } from "../editor/controller.js";
import { loadErrorLines } from "../editor/loadErrors.js";

/** What `deserializeGraph` threw for `doc`; fails the test if it loaded. */
function refusal(doc: unknown): unknown {
  try {
    deserializeGraph(doc);
  } catch (err) {
    return err;
  }
  throw new Error("expected deserializeGraph to refuse the document");
}

const scatter = (id: string, params: Record<string, unknown> = {}) => ({
  id,
  type: "pointScatterInBounds",
  params,
});

describe("loadErrorLines", () => {
  it("gives one line per fault, in phase order, led by its pointer", () => {
    // Written connections-first so document order and phase order disagree.
    const err = refusal({
      formatVersion: 1,
      seed: 1,
      connections: [{ from: ["ghost", "out"], to: ["a", "in"] }],
      nodes: [
        scatter("a", { counts: 10 }),
        { id: "b", type: "warpDrive", params: {} },
      ],
      outputs: [],
    });
    const lines = loadErrorLines(err);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^\/nodes\/0\/params\/counts: .*unknown param "counts"/);
    expect(lines[1]).toMatch(/^\/nodes\/1\/type: .*unknown node type "warpDrive"/);
    expect(lines[2]).toMatch(/^\/connections\/0\/from\/0: .*"ghost"/);
    for (const line of lines) expect(line).not.toContain("\n");
  });

  it("caps at max and counts what it folded", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({
      id: `n${i}`,
      type: `noSuchType${i}`,
      params: {},
    }));
    const err = refusal({ formatVersion: 1, seed: 1, nodes, connections: [], outputs: [] });
    const lines = loadErrorLines(err, 5);
    expect(lines).toHaveLength(6);
    expect(lines.slice(0, 5).map((l) => l.split(":")[0])).toEqual([
      "/nodes/0/type",
      "/nodes/1/type",
      "/nodes/2/type",
      "/nodes/3/type",
      "/nodes/4/type",
    ]);
    expect(lines[5]).toBe("And 3 more");
  });

  it("does not fold when the records fit exactly", () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, type: `nope${i}`, params: {} }));
    const err = refusal({ formatVersion: 1, seed: 1, nodes, connections: [], outputs: [] });
    expect(loadErrorLines(err, 5)).toHaveLength(5);
  });

  it("is the message alone for a foreign Error", () => {
    expect(loadErrorLines(new Error("boom"))).toEqual(["boom"]);
  });

  it("is one line for a thrown non-Error", () => {
    expect(loadErrorLines("bad text")).toEqual(["bad text"]);
    expect(loadErrorLines(42)).toEqual(["42"]);
  });

  it("is what the controller's import hands the toast, newline-joined", () => {
    const c = new EditorController({ render: () => {}, status: () => {} });
    const doc = {
      formatVersion: 1,
      seed: 1,
      nodes: [scatter("a", { counts: 10 }), { id: "b", type: "warpDrive", params: {} }],
      connections: [],
      outputs: [],
    };
    const res = c.importText(JSON.stringify(doc));
    expect(res).toHaveProperty("error");
    const error = (res as { error: string }).error;
    expect(error.split("\n")).toEqual(loadErrorLines(refusal(doc)));
    expect(error.split("\n")).toHaveLength(2);
  });

  it("reads a JSON.parse failure as one line", () => {
    let err: unknown;
    try {
      JSON.parse("{ nope");
    } catch (e) {
      err = e;
    }
    const lines = loadErrorLines(err);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe((err as Error).message);
  });
});
