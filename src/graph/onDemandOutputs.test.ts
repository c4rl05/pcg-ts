/**
 * `PinDef.onDemand`: an output pin the node builds only when the graph's
 * WIRING reads it. What has to hold: the executor tells the node which
 * on-demand pins are read (a connection leaves the pin, or a graph output
 * is declared on it) and nothing else; the answer is in the memo key, so
 * wiring a reader recooks the node; it does NOT depend on the cook's
 * output selection, so a host cooking one declared output per pass never
 * thrashes the key; and a def declaring no on-demand pin is handed no
 * `readOutputs` at all.
 */
import { describe, expect, it } from "vitest";
import { makeValueItem } from "./data.js";
import { cook } from "./execute.js";
import { Graph } from "./graph.js";
import { defineNode } from "./node.js";

/** What each cook of `side` was told, in order. */
const seen: (string[] | "absent")[] = [];

/** `main` always; `extra` (on demand) only when read. */
const side = defineNode<Record<string, never>>({
  type: "__test_onDemandSide",
  inputs: [],
  outputs: [
    { name: "main", kind: "value" },
    { name: "extra", kind: "value", onDemand: true },
  ],
  defaultParams: {},
  execute({ readOutputs }) {
    seen.push(readOutputs === undefined ? "absent" : [...readOutputs]);
    const build = readOutputs === undefined || readOutputs.has("extra");
    return { main: [makeValueItem(1)], extra: build ? [makeValueItem(2)] : [] };
  },
});

/** A plain def: never handed `readOutputs`. */
const plain = defineNode<Record<string, never>>({
  type: "__test_onDemandPlain",
  inputs: [{ name: "in", kind: "value", optional: true }],
  outputs: [{ name: "out", kind: "value" }],
  defaultParams: {},
  execute(args) {
    seen.push("readOutputs" in args ? "absent" : []);
    return { out: args.inputs.in ?? [] };
  },
});

describe("on-demand output pins", () => {
  it("unread: the node is told so, and emits the empty collection", async () => {
    seen.length = 0;
    const g = new Graph(1);
    const n = g.add(side, {}, "n");
    g.output(n, "main", "main");
    const r = await cook(g);
    expect(seen).toEqual([[]]);
    expect(g.require("n").cache?.outputs.extra).toEqual([]);
    expect(r.outputs.main).toHaveLength(1);
  });

  it("a declared output reads it, and declaring one later recooks the node", async () => {
    seen.length = 0;
    const g = new Graph(1);
    const n = g.add(side, {}, "n");
    g.output(n, "main", "main");
    await cook(g);
    g.output(n, "extra", "extra");
    const r = await cook(g);
    expect(r.stats.cooked).toBe(1);
    expect(seen).toEqual([[], ["extra"]]);
    expect(r.outputs.extra).toHaveLength(1);
    // Removing the reader recooks it back down.
    g.removeOutput("extra");
    expect((await cook(g)).stats.cooked).toBe(1);
    expect(seen.at(-1)).toEqual([]);
  });

  it("a connection reads it, wherever it goes", async () => {
    seen.length = 0;
    const g = new Graph(1);
    const n = g.add(side, {}, "n");
    const p = g.add(plain, {}, "p");
    g.connect(n, "extra", p, "in");
    g.output(n, "main", "main");
    // `p` is outside this cook's selection, and still counts: the test is
    // the wiring, not the pass.
    await cook(g, { outputs: ["main"] });
    expect(seen[0]).toEqual(["extra"]);
  });

  it("does not depend on the output selection: per-output passes are cache hits", async () => {
    seen.length = 0;
    const g = new Graph(1);
    const n = g.add(side, {}, "n");
    g.output(n, "main", "main");
    g.output(n, "extra", "extra");
    await cook(g, { outputs: ["main"] });
    const second = await cook(g, { outputs: ["extra"] });
    expect(second.stats.cooked).toBe(0);
    expect(second.outputs.extra).toHaveLength(1);
    expect(seen).toEqual([["extra"]]);
  });

  it("a def with no on-demand pin is handed no readOutputs", async () => {
    seen.length = 0;
    const g = new Graph(1);
    const p = g.add(plain, {}, "p");
    g.output(p, "out", "out");
    await cook(g);
    expect(seen).toEqual([[]]);
  });

  it("a direct execute call passes none, which builds every output", async () => {
    seen.length = 0;
    const out = await side.execute({ inputs: {}, params: {}, seed: 1, checkCancelled() {} });
    expect(seen).toEqual(["absent"]);
    expect(out.extra).toHaveLength(1);
  });
});
