/**
 * Test-only builders for the `applyRules` suites: rule bodies and outer
 * graphs written as graph JSON, so the same fixture cooks, round-trips and
 * validates against the schema. Imported by `applyRules.test.ts` and by
 * `tests/applyRulesInterface.test.ts`; never by anything a build entry
 * reaches.
 */

export type Json = Record<string, unknown>;

/** A connection in graph JSON. */
export function wire(from: string, to: string, fromPin = "out", toPin = "in"): Json {
  return { from: [from, fromPin], to: [to, toPin] };
}

/** setAttribute writing one constant string label to `piece`. */
export function relabel(id: string, label: string, attr = "piece"): Json {
  return { id, type: "setAttribute", params: { name: attr, domain: "point", type: "string", stringValue: label } };
}

/** setAttribute picking a label from `values` by an INDEX field. */
export function choose(id: string, values: string[], index: unknown, attr = "piece"): Json {
  return { id, type: "setAttribute", params: { name: attr, domain: "point", type: "string", values, value: index } };
}

/** setAttribute writing an f32 column from a field. */
export function setF32(id: string, name: string, value: unknown): Json {
  return { id, type: "setAttribute", params: { name, domain: "point", type: "f32", value } };
}

/** splitBox cutting `axis` into equal relative pieces with these labels. */
export function cut(id: string, labels: string[], axis = "x"): Json {
  return {
    id,
    type: "splitBox",
    params: { axis, labels, sizes: labels.map(() => 1), units: labels.map(() => "relative") },
  };
}

export const attr = (name: string): Json => ({ fn: "attribute", name });
export const lt = (a: unknown, b: unknown): Json => ({ fn: "lt", args: [a, b] });

/** One rule: a chain of nodes, the first exposed as input X, the last as output X. */
export interface RuleSpec {
  readonly name: string;
  readonly nodes: readonly Json[];
}

/**
 * An inline applyRules body. Each rule's nodes are chained `out -> in` in
 * order; `extra` adds nodes, connections and broadcast inputs the chains do
 * not cover.
 */
export function rulesBody(
  rules: readonly RuleSpec[],
  extra: {
    nodes?: readonly Json[];
    connections?: readonly Json[];
    broadcasts?: readonly { name: string; node: string; pin: string }[];
    outputOrder?: readonly string[];
  } = {},
): Json {
  const nodes: Json[] = [];
  const connections: Json[] = [];
  const inputs: Json[] = [];
  const outputs: Json[] = [];
  for (const r of rules) {
    const ids = r.nodes.map((n) => n.id as string);
    nodes.push(...r.nodes);
    for (let i = 1; i < ids.length; i++) connections.push(wire(ids[i - 1] as string, ids[i] as string));
    inputs.push({ name: r.name, node: ids[0], pin: "in" });
    outputs.push({ name: r.name, node: ids[ids.length - 1], pin: "out" });
  }
  nodes.push(...(extra.nodes ?? []));
  connections.push(...(extra.connections ?? []));
  for (const b of extra.broadcasts ?? []) inputs.push(b);
  const order = extra.outputOrder;
  const orderedOutputs =
    order === undefined ? outputs : order.map((n) => outputs.find((o) => o.name === n) as Json);
  return {
    graph: { formatVersion: 1, seed: 0, nodes, connections, outputs: [] },
    inputs,
    outputs: orderedOutputs,
  };
}

/** An axiom cell: an x interval of a unit-high box, and the label it starts with. */
export interface AxiomCell {
  readonly x0: number;
  readonly x1: number;
  readonly label: string;
}

/**
 * The outer graph: a pointList of boxes, labelled by index, into an
 * applyRules node "rules", whose three pins are the graph's outputs.
 */
export function rulesDoc(
  cells: readonly AxiomCell[],
  body: Json,
  params: Json = {},
  opts: { seed?: number; labelAttr?: string } = {},
): Json {
  const positions: number[] = [];
  const lo: number[] = [];
  const hi: number[] = [];
  for (const c of cells) {
    positions.push(c.x0, 0, 0);
    lo.push(c.x0, 0, 0);
    hi.push(c.x1, 1, 1);
  }
  const labels = cells.map((c) => c.label);
  return {
    formatVersion: 1,
    seed: opts.seed ?? 3,
    nodes: [
      {
        id: "cells",
        type: "pointList",
        params: {
          positions,
          columnNames: ["boundsMin", "boundsMax"],
          columnTypes: ["vec3", "vec3"],
          columnValues: [...lo, ...hi],
        },
      },
      choose("axiom", labels, { fn: "index" }, opts.labelAttr ?? "piece"),
      { id: "rules", type: "applyRules", params, subgraph: body },
    ],
    connections: [wire("cells", "axiom"), wire("axiom", "rules")],
    outputs: [
      { id: "rules", pin: "out", name: "out" },
      { id: "rules", pin: "rounds", name: "rounds" },
      { id: "rules", pin: "converged", name: "converged" },
    ],
  };
}

/**
 * THE SCOPE GRAMMAR, the suite's workhorse. Every branch is elementwise.
 *
 *   A  -> split x into B | B
 *   B  -> split x into two, labelled B while ruleDepth < 2 and E after,
 *         and copy B's roll into `bRoll`
 *   E  -> relabel D            (an unscoped rule between B and D)
 *   D  -> relabel "end"        (terminal)
 *
 * An A cell 8 wide ends as eight 1-wide `end` cells after five rounds. An
 * end cell's nearest ancestor fed to B is the round-2 B cell, 2 wide, so a
 * roll scoped to B is shared by PAIRS (x0 div 2); the round-1 B ancestor,
 * 4 wide, would give quads.
 */
export function scopeGrammar(outputOrder?: readonly string[]): Json {
  return rulesBody(
    [
      { name: "A", nodes: [cut("aSplit", ["B", "B"])] },
      {
        name: "B",
        nodes: [
          cut("bSplit", ["B", "B"]),
          choose("bLabel", ["E", "B"], lt(attr("ruleDepth"), 2)),
          setF32("bRoll", "bRoll", attr("ruleRoll")),
        ],
      },
      { name: "E", nodes: [relabel("eToD", "D")] },
      { name: "D", nodes: [relabel("dEnd", "end")] },
    ],
    outputOrder === undefined ? {} : { outputOrder },
  );
}

/** Two 8-wide A cells, far apart. */
export const TWO_A: readonly AxiomCell[] = [
  { x0: 0, x1: 8, label: "A" },
  { x0: 100, x1: 108, label: "A" },
];
