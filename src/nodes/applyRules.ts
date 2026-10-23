/**
 * `applyRules`: a rewriting grammar over labelled cells, cooked one ROUND
 * at a time — the recursion of a split grammar, in a graph that cannot
 * express a cycle.
 *
 * THE BODY IS ONE INLINE GRAPH, AND A RULE IS A PIN PAIR. An exposed input
 * and an exposed output with the SAME name form a rule, and that name is
 * the LABEL it rewrites: each round, input X receives every frontier cell
 * whose `labelAttr` is X, and output X's cells are that rule's products,
 * whatever labels they carry. A label with no rule is TERMINAL: a cell
 * carrying one leaves the loop on `out`. An exposed input with no
 * same-named output is a BROADCAST, fed whole to every round. The
 * recursion is a label going round the loop — a `panel` rule whose
 * products are labelled `panel` again — so no body references itself and
 * the graph stays acyclic, exactly as `repeatUntil`'s carry does.
 *
 * ONE COOK PER ROUND, OVER THE FED RULES ONLY. The body is cooked with
 * `CookOptions.outputs` naming only the rules that received cells this
 * round, so an unfed rule's branch is not visited at all — not cooked on an
 * empty input, where any field reading a column that later rounds create
 * would throw. That is why branches must be ISOLATED (checked when the
 * node is built): output X may not depend on any rule input but X's own,
 * or cooking X would cook an unfed portal too. Nodes that read only
 * broadcasts may be shared, and are memo hits after their first cook.
 *
 * THE WRAPPER DECIDES NOTHING ABOUT A CELL. It evaluates no field over the
 * frontier: a weighted variant is a RELABEL inside the branch (setAttribute
 * string with `values` and an index field), and stopping is a branch
 * relabelling to a terminal label. Both then resolve on that branch's own
 * cells, where the columns they read exist. The wrapper's only random
 * contribution is the ROLL column — one f32 per fed cell, hashed from the
 * node seed, the rule's label and a SCOPE identity — and its only
 * bookkeeping is lineage.
 *
 * LINEAGE IS HELD HERE, NOT CARRIED. Every fed cell gets one u32 column,
 * `__ruleSrc` = its index + 1 in this round's fed list; every other fact
 * about it (its scope identities, which rule it was fed to) stays in
 * wrapper-side arrays indexed by that number. A product whose `__ruleSrc`
 * is 0, out of range, or names a cell fed to ANOTHER rule was not derived
 * from a cell this rule was fed — the `mergePoints` default fill of a cell
 * built from scratch, or a broadcast cell merged in — and is refused by
 * name rather than silently linked to the wrong parent.
 *
 * NESTING IS TRANSPARENT. A cell reaching `out` gets back the `__ruleSrc`
 * its axiom cell carried on `in`, or the column is removed when `in` had
 * none — the way splitBox carries every column from parent to piece. So an
 * `applyRules` inside another's rule branch (directly or inside a
 * `subgraph`) hands its products back still naming the outer cell they
 * came from, and the outer node links them. One fixed column name, saved
 * and restored, rather than a name per instance: a per-instance name would
 * leave one stale lineage column per nesting level on every cell, and the
 * outer node would have to know the inner node's name to check anything.
 *
 * THE BODY SEED IS CONSTANT ACROSS ROUNDS, for lineage rather than for a
 * fixed point: `splitBox` already re-seeds each piece from its parent, so a
 * cell's draws follow its path from the axiom, and the round IS the depth,
 * which is a function of lineage. Rotating it per round would add no
 * information and would evict every inner memo each round. THE CAVEAT: that
 * holds only for rules that RE-SEED their products. A relabel (setAttribute)
 * keeps the cell's identity, so a `randomField` in a relabel-only recursion
 * draws the parent's number again every round — "stay a panel while
 * randomField < 0.5" stops at once or never. A per-round chance reads
 * `ruleRoll`, whose unscoped key folds in the round.
 *
 * NON-TERMINATION IS REPORTED, NOT THROWN. At `maxDepth` the cells still
 * carrying a rule's label go to `out` unchanged, `converged` is 0, and the
 * detail attribute `rulesCutOff` on `out` counts them per rule, beside
 * `rulesCutOffRules` naming the rule behind each component — so the rule
 * that would not stop is named. `repeatUntil`'s cap is the precedent.
 */
// Imported from the graph modules directly, as `repeatUntil.ts` does: the
// wrapper machinery is `@internal` and must not ride out through
// `../graph/index.js` into the package surface.
import { STANDARD_POINT_ATTRS } from "../data/index.js";
import type { Geometry } from "../data/geometry.js";
import { pointIdentities } from "../data/identity.js";
import { suggestNames } from "../diagnostics/didYouMean.js";
import type { DataCollection } from "../graph/data.js";
import { makeGeometryItem, makeValueItem } from "../graph/data.js";
import { CookCancelledError, GraphValidationError } from "../graph/errors.js";
import { cook, withExclusiveGraph } from "../graph/execute.js";
import type { Graph } from "../graph/graph.js";
import { type NodeDef, type PinDef, defineNode } from "../graph/node.js";
import type { ParamSchema } from "../graph/params.js";
import {
  CARRIED_PIN_NAMES,
  type ExposedParam,
  type ExposedPin,
  ITERATED_PIN_NAMES,
  checkExposedValues,
  prepareWrapper,
  recordWrapperSpec,
  transitiveVersionKey,
  withExposedParams,
} from "../graph/subgraph.js";
import { isTripwireFailure } from "../graph/tripwire.js";
import { hashCombine, hashFinalize, hashFloat, hashMix, hashSeed, hashString } from "../random/hash.js";
import { concatPointClouds } from "./pointUnion.js";
import { gatherPoints, requireGeometryItem } from "./util.js";

const NODE = "applyRules";

/** The wrapper's own outer pins, which no body declares. */
export const APPLY_RULES_OUTER_INPUT = "in";
export const APPLY_RULES_OUTER_OUTPUT = "out";

/**
 * Names a rule or a broadcast may not take: the wrapper's own pins (and
 * `trail`, reserved for the derivation-tree output a later version adds).
 * A rule named `out` would read as the wrapper's pin in every listing.
 */
export const APPLY_RULES_RESERVED_NAMES: ReadonlySet<string> = new Set([
  "in",
  "out",
  "trail",
  "rounds",
  "converged",
]);

/** The `scopeOf` entry meaning "the axiom: the cell on `in` this one descends from". */
export const ROOT_SCOPE = "root";

/** The lineage column; see the file header. Stripped from `out`. */
export const RULE_SRC_ATTR = "__ruleSrc";

/** The detail attribute on `out` counting, per rule, the cells left unexpanded at the cap. */
export const RULES_CUT_OFF_ATTR = "rulesCutOff";

/** Its companion: a string tuple naming the rule behind each component. */
export const RULES_CUT_OFF_NAMES_ATTR = "rulesCutOffRules";

/**
 * `concatPointClouds`, with a shape conflict restated to name this node and
 * what was being joined — the union's own message names only the column.
 */
function concatAttributed(geos: readonly Geometry[], what: string): Geometry {
  try {
    return concatPointClouds(NODE, geos);
  } catch (err) {
    throw new GraphValidationError(
      `${NODE}: ${what} disagree on a column's shape — ${err instanceof Error ? err.message : String(err)} ` +
        "Two rules writing one name must write it as the same type and tuple size.",
    );
  }
}

/** Rounds a fresh instance runs at most; see {@link APPLY_RULES_PARAM_SCHEMAS}. */
export const DEFAULT_MAX_DEPTH = 32;

/** Ceiling on `maxDepth` — `repeatUntil`'s, for `repeatUntil`'s reason. */
export const MAX_DEPTH_CEILING = 1024;

/**
 * Ceiling on frontier plus `out`, in points: `splitBox`'s and
 * `repeatPoints`' cap. A grammar that doubles every round reaches it in
 * twenty-two rounds, so a runaway split is refused here, naming the round
 * and the rule, long before it is cut off by `maxDepth`.
 */
const MAX_RULE_POINTS = 1 << 22;

/**
 * This node's OWN params, which no body exposes. Here rather than in
 * `serialize.ts` so the factory (as `defaultParams`), the registry entry
 * and the reader/writer share one definition — `repeatUntil`'s reason.
 */
export const APPLY_RULES_PARAM_SCHEMAS: Readonly<Record<string, ParamSchema>> = Object.freeze({
  maxDepth: Object.freeze({
    type: "u32",
    default: DEFAULT_MAX_DEPTH,
    min: 1,
    max: MAX_DEPTH_CEILING,
    description:
      "The most ROUNDS the grammar runs: the body cooks at most this many times, and a cell is expanded at " +
      "lineage depth maxDepth - 1 at the deepest. EVERY RELABEL COSTS A ROUND — a rule that only picks a " +
      "variant (window -> arched | square) or marks a cell finished (panel -> leaf) is one round of depth for " +
      "the cells it relabels — so count the relabels when sizing it: a facade split into floors, floors into " +
      "panels, panels halved until small and then given a styled window is easily fifteen rounds deep. " +
      "Reaching the cap is NOT an error and is not silent: the cells still carrying a rule's label go to " +
      '"out" unexpanded, "converged" reports 0 and the detail attribute "rulesCutOff" on "out" counts them ' +
      'per rule, with "rulesCutOffRules" naming the rule behind each component, so the rule that would not ' +
      "stop is named. A grammar that GROWS every round is stopped " +
      "sooner, by the 4194304-point cap, which is refused naming the round and the rule.",
  }),
  labelAttr: Object.freeze({
    type: "string",
    default: "piece",
    description:
      "The STRING point attribute (tuple 1) the frontier is dispatched on: a cell whose label equals a rule's " +
      "name is fed to that rule, any other label is terminal and goes to \"out\". splitBox's labelAttr " +
      'default, so a split\'s labels ARE the rules\' names. Required on "in" and on every rule\'s products; a ' +
      "missing or non-string column is refused naming the rule that dropped it.",
  }),
  depthAttr: Object.freeze({
    type: "string",
    default: "ruleDepth",
    description:
      "The i32 point attribute (tuple 1) written on every cell as it is classified: the ROUND, which is the " +
      "cell's lineage depth (an \"in\" cell is 0, its products 1, ...). A rule reads it as iteration metadata " +
      '— lt(attribute("ruleDepth"), 3) caps a recursion at a fixed depth. On "out" it is the depth the cell ' +
      'settled at (maxDepth on a cell the cap cut off). Empty writes none. Not a standard attribute, and not ' +
      "the same name as labelAttr or rollAttr.",
  }),
  rollAttr: Object.freeze({
    type: "string",
    default: "ruleRoll",
    description:
      "The f32 point attribute (tuple 1) written on every FED cell: a number in [0, 1) hashed from this " +
      "node's seed, the rule's label and the cell's SCOPE identity (see \"scoped\"); an UNSCOPED roll also " +
      "folds in the round, so a rule that keeps a cell's label and identity (a relabel-only recursion: " +
      '"stay a panel while the roll is under 0.7") draws afresh every round. The branch picks a ' +
      'variant with it — setAttribute string, values ["arched", "square"], value lt(attribute("ruleRoll"), ' +
      "0.5) — so the weights sit in the branch, resolved on that rule's cells only. Different rules roll " +
      "independently even under one scope. On \"out\" a cell carries the roll of the rule application that " +
      "produced it (0 on a cell that arrived terminal). Empty writes none, and is refused when \"scoped\" " +
      "lists anything, since the scope would then reach no column.",
  }),
  scoped: Object.freeze({
    type: "stringList",
    default: [],
    description:
      'Rules whose ROLL is SHARED by a scope, parallel to "scopeOf": rule scoped[i] rolls on the identity of ' +
      "its NEAREST ANCESTOR fed to rule scopeOf[i], so every such cell under one ancestor rolls the same " +
      'number — one window style per facade is scoped ["window"], scopeOf ["facade"]. A rule not listed ' +
      "rolls on its own cell's identity, so every cell differs. The roll is shared; the DECISION is shared " +
      "only if the branch's selector reads nothing per cell besides the roll. A RECURSIVE rule scoped to an " +
      "ancestor rolls the same number at every depth and so decides the same at every depth, which is " +
      "usually a mistake. Each entry must name a rule (did-you-mean otherwise), once.",
  }),
  scopeOf: Object.freeze({
    type: "stringList",
    default: [],
    description:
      'The scope of each "scoped" entry, same length: the name of a RULE (the nearest ancestor that was fed ' +
      'to it), or "root" — the cell on "in" the scoped cell descends from, which every cell has. A rule ' +
      "scoped to ITSELF is refused: its nearest ancestor-or-self fed to it is the cell itself, which is " +
      "exactly what not listing it does. A cell with NO ancestor fed to its scope rule — it arrived on \"in\" " +
      "already carrying the scoped label, or came down a branch that never passed through the scope rule — " +
      'is REFUSED, naming the rule, the round and the scope, rather than rolled on some other identity: ' +
      'scope it to "root", or route every such cell through the scope rule.',
  }),
});

/** The exposed interface, split into rules and broadcasts and checked. */
interface RuleSet {
  /** Rule names, in the body's exposed-OUTPUT order — the concatenation order. */
  readonly rules: readonly string[];
  /** Exposed inputs with no same-named output, in exposure order. */
  readonly broadcasts: readonly string[];
}

/** Every node `start` depends on, itself included, walking the live connections. */
function upstreamOf(inner: Graph, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    for (const c of inner._inTo.get(id) ?? []) {
      if (!seen.has(c.from)) {
        seen.add(c.from);
        stack.push(c.from);
      }
    }
  }
  return seen;
}

/**
 * Split the exposed pins into rules and broadcasts, refusing every shape
 * the round loop cannot cook: reserved names, an output with no rule
 * input, a broadcast nothing reads, and a branch that depends on another
 * rule's input. Runs BEFORE `prepareWrapper` injects plumbing, so a
 * refusal leaves the inner graph untouched.
 */
function resolveRules(
  inner: Graph,
  exposedInputs: readonly ExposedPin[],
  exposedOutputs: readonly ExposedPin[],
): RuleSet {
  for (const [side, pins] of [
    ["input", exposedInputs],
    ["output", exposedOutputs],
  ] as const) {
    for (const exp of pins) {
      if (exp.name === "") {
        throw new GraphValidationError(
          `${NODE}: an exposed ${side} has an empty name; a rule's name is the label it rewrites and a ` +
            'broadcast\'s is its outer pin, and "" is splitBox\'s GAP label, which no cell ever carries. Name it.',
        );
      }
      if (ITERATED_PIN_NAMES.has(exp.name) || CARRIED_PIN_NAMES.has(exp.name)) {
        throw new GraphValidationError(
          `${NODE}: exposed ${side} "${exp.name}" — that name is reserved for the pin a ` +
            `"${CARRIED_PIN_NAMES.has(exp.name) ? "repeatUntil" : "forEach"}" loops over, and this body is a ` +
            "rule set, fed by label each round. Rename the pin (and the label, if it is a rule), or wrap the " +
            `body with ${CARRIED_PIN_NAMES.has(exp.name) ? "repeatUntil" : "forEach"} if that loop is the one meant.`,
        );
      }
      if (APPLY_RULES_RESERVED_NAMES.has(exp.name)) {
        throw new GraphValidationError(
          `${NODE}: exposed ${side} "${exp.name}" uses a name reserved for this node's own pins ` +
            `(${[...APPLY_RULES_RESERVED_NAMES].map((n) => `"${n}"`).join(", ")}): the outer "in" takes the ` +
            'axiom cells, "out" emits the terminal ones and "rounds"/"converged" report the loop. A rule or ' +
            "broadcast of that name would read as the wrapper's pin everywhere it is listed. Rename it (a rule's " +
            "label with it).",
        );
      }
    }
  }
  const inputNames = new Set(exposedInputs.map((e) => e.name));
  const outputNames = new Set(exposedOutputs.map((e) => e.name));
  const unpairedInputs = exposedInputs.filter((e) => !outputNames.has(e.name)).map((e) => e.name);
  for (const exp of exposedOutputs) {
    if (inputNames.has(exp.name)) continue;
    const near = suggestNames(exp.name, unpairedInputs);
    throw new GraphValidationError(
      `${NODE}: exposed output "${exp.name}" has no same-named exposed input, so it is not a rule. A rule is ` +
        `a PAIR — input X takes the cells labelled X each round, output X returns what they became — and ` +
        `this version has no side outputs (terminal cells leave on "out"). ${near.clause}` +
        `Exposed inputs with no output of their name: ${unpairedInputs.map((n) => `"${n}"`).join(", ") || "(none)"}. ` +
        `Rename one side so the pair matches, or remove the output.`,
    );
  }
  const rules = exposedOutputs.map((e) => e.name);
  if (rules.length === 0) {
    throw new GraphValidationError(
      `${NODE}: the body declares no rule. A rule is an exposed input and an exposed output with the SAME ` +
        "name — the label it rewrites — and every exposed input here has no output of its name, so it would " +
        "be a broadcast with nothing to feed. Expose the rule's first node as input X and its last as output X.",
    );
  }
  if (inputNames.has(ROOT_SCOPE) && outputNames.has(ROOT_SCOPE)) {
    throw new GraphValidationError(
      `${NODE}: a rule is named "${ROOT_SCOPE}", which is reserved: in "scopeOf" it means the axiom cell on ` +
        '"in", so a rule of that name could never be named as a scope. Rename the rule (and its label).',
    );
  }
  // Branch isolation. Cooking output X cooks everything it depends on, so a
  // rule input other than X upstream of it would be cooked EMPTY whenever X
  // is fed and that rule is not — and an empty geometry is refused by every
  // node that reads one. Broadcast-only nodes may be shared.
  const entry = new Map(exposedInputs.map((e) => [e.name, e.node.id]));
  const up = new Map<string, Set<string>>();
  for (const exp of exposedOutputs) up.set(exp.name, upstreamOf(inner, exp.node.id));
  for (const x of rules) {
    const reach = up.get(x) as Set<string>;
    const own = entry.get(x) as string;
    if (!reach.has(own)) {
      throw new GraphValidationError(
        `${NODE}: rule "${x}"'s input (inner node "${own}") does not reach its output (inner node ` +
          `"${(exposedOutputs.find((e) => e.name === x) as ExposedPin).node.id}"), so the cells fed to it could ` +
          "never become its products. Wire the rule's input through to its output — a rule that drops its " +
          "cells is a branch ending in a filter that keeps none, not a broken wire.",
      );
    }
    for (const y of rules) {
      if (y === x) continue;
      const other = entry.get(y) as string;
      if (reach.has(other)) {
        throw new GraphValidationError(
          `${NODE}: rule "${x}"'s output depends on inner node "${other}", which rule "${y}"'s input feeds. ` +
            `Each round cooks only the rules that received cells, so whenever "${x}" is fed and "${y}" is not, ` +
            `"${other}" would cook on an empty input. Duplicate the node per rule, or move it upstream of a ` +
            "broadcast input — a node that reads only broadcasts may be shared by every rule.",
        );
      }
    }
  }
  for (const b of unpairedInputs) {
    const node = entry.get(b) as string;
    if (rules.some((x) => (up.get(x) as Set<string>).has(node))) continue;
    throw new GraphValidationError(
      `${NODE}: exposed input "${b}" has no same-named output, which makes it a BROADCAST, but no rule's ` +
        `output depends on its inner node "${node}", so nothing would ever read it. If it was meant as a rule, ` +
        `expose its branch's last node as output "${b}"; otherwise remove it.`,
    );
  }
  return { rules, broadcasts: unpairedInputs };
}

/** A stamp column's name, checked once per cook. */
function checkStampNames(
  labelAttr: string,
  depthAttr: string,
  rollAttr: string,
  scopedCount: number,
): void {
  if (typeof labelAttr !== "string" || labelAttr === "") {
    throw new GraphValidationError(
      `${NODE}: param "labelAttr" is ${JSON.stringify(labelAttr)}; it names the string point attribute the ` +
        'frontier is dispatched on and may not be empty — "piece" is splitBox\'s default.',
    );
  }
  const owned = new Map<string, string>([["labelAttr", labelAttr]]);
  for (const [param, name] of [
    ["depthAttr", depthAttr],
    ["rollAttr", rollAttr],
  ] as const) {
    if (typeof name !== "string") {
      throw new GraphValidationError(`${NODE}: param "${param}" is ${JSON.stringify(name)}; give a name, or "" for none.`);
    }
    if (name === "") continue;
    if (STANDARD_POINT_ATTRS.some((std) => std.name === name) || name === RULE_SRC_ATTR) {
      throw new GraphValidationError(
        `${NODE}: param "${param}" cannot write "${name}" — it is ${name === RULE_SRC_ATTR ? "this node's lineage column" : `a standard point attribute (${STANDARD_POINT_ATTRS.map((s) => s.name).join(", ")})`}, whose meaning other nodes rely on. Name an attribute of your own (e.g. "${param === "depthAttr" ? "ruleDepth" : "ruleRoll"}").`,
      );
    }
    for (const [otherParam, otherName] of owned) {
      if (otherName === name) {
        throw new GraphValidationError(
          `${NODE}: params "${otherParam}" and "${param}" both name "${name}"; each is a column of its own ` +
            "(a string label, an i32 depth, an f32 roll). Give them different names.",
        );
      }
    }
    owned.set(param, name);
  }
  if (rollAttr === "" && scopedCount > 0) {
    throw new GraphValidationError(
      `${NODE}: param "rollAttr" is empty, so no roll is written, but "scoped" lists ${scopedCount} rule(s) — ` +
        "a scope only decides which identity the ROLL is hashed from. Name the roll column, or clear " +
        '"scoped" and "scopeOf".',
    );
  }
}

/**
 * The scope of every rule, decided ONCE per cook: -1 rolls on the cell's
 * own identity, -2 on its root, a rule index on its nearest ancestor fed to
 * that rule. Strings end here; the loop sees integers.
 */
function resolveScopes(rules: readonly string[], scoped: unknown, scopeOf: unknown): Int32Array {
  if (!Array.isArray(scoped) || !Array.isArray(scopeOf)) {
    throw new GraphValidationError(
      `${NODE}: params "scoped" and "scopeOf" must be lists of names, got ${JSON.stringify(scoped)} and ${JSON.stringify(scopeOf)}.`,
    );
  }
  if (scoped.length !== scopeOf.length) {
    throw new GraphValidationError(
      `${NODE}: param "scoped" has ${scoped.length} entr${scoped.length === 1 ? "y" : "ies"} but "scopeOf" has ` +
        `${scopeOf.length}; they are parallel — rule scoped[i] rolls on its nearest ancestor fed to rule ` +
        'scopeOf[i] (or on its root, for "root") — so give one scope per scoped rule.',
    );
  }
  const index = new Map(rules.map((r, i) => [r, i]));
  const out = new Int32Array(rules.length).fill(-1);
  const seen = new Set<string>();
  const ruleList = rules.map((r) => `"${r}"`).join(", ");
  for (let i = 0; i < scoped.length; i++) {
    const name = scoped[i] as unknown;
    const scope = scopeOf[i] as unknown;
    if (typeof name !== "string" || !index.has(name)) {
      const near = typeof name === "string" ? suggestNames(name, rules) : { clause: "" };
      throw new GraphValidationError(
        `${NODE}: param "scoped" entry ${i} is ${JSON.stringify(name)}, which is not a rule of this body; ` +
          `${near.clause}rules: ${ruleList}.`,
      );
    }
    if (seen.has(name)) {
      throw new GraphValidationError(
        `${NODE}: param "scoped" lists rule "${name}" twice; a rule rolls on one scope. Keep one entry.`,
      );
    }
    seen.add(name);
    if (typeof scope !== "string" || (scope !== ROOT_SCOPE && !index.has(scope))) {
      const near = typeof scope === "string" ? suggestNames(scope, [...rules, ROOT_SCOPE]) : { clause: "" };
      throw new GraphValidationError(
        `${NODE}: param "scopeOf" entry ${i} (the scope of rule "${name}") is ${JSON.stringify(scope)}, which ` +
          `is neither a rule of this body nor "${ROOT_SCOPE}"; ${near.clause}valid: ${ruleList}, "${ROOT_SCOPE}".`,
      );
    }
    if (scope === name) {
      throw new GraphValidationError(
        `${NODE}: rule "${name}" is scoped to itself. Its nearest ancestor-or-self fed to "${name}" is the cell ` +
          "itself, so its roll would be its own — exactly what leaving it out of \"scoped\" does. Scope it to " +
          `an ANCESTOR's rule to share one roll among that ancestor's descendants, or to "${ROOT_SCOPE}", or ` +
          "remove the entry.",
      );
    }
    out[index.get(name) as number] = scope === ROOT_SCOPE ? -2 : (index.get(scope) as number);
  }
  return out;
}

/**
 * The rule index of every entry of a label column's string table, decided
 * once per round: -1 for a terminal label. The per-cell work is then an
 * integer lookup — no string is compared per element.
 */
function classifyTable(table: readonly string[], ruleIndex: ReadonlyMap<string, number>): Int32Array {
  const out = new Int32Array(table.length);
  for (let e = 0; e < table.length; e++) out[e] = ruleIndex.get(table[e] as string) ?? -1;
  return out;
}

/** Add (or reuse, when the shape matches) a stamp column, refusing a clobber. */
function stampColumn(geo: Geometry, name: string, type: "i32" | "f32" | "u32", param: string) {
  const set = geo.attrs.point;
  const existing = set.get(name);
  if (existing !== undefined) {
    if (existing.type === type && existing.tupleSize === 1) return existing;
    if (name === RULE_SRC_ATTR) {
      throw new GraphValidationError(
        `${NODE}: the frontier carries "${RULE_SRC_ATTR}" as ${existing.type} tuple ${existing.tupleSize}, but ` +
          `that name is this node's reserved lineage column (u32 tuple 1) and is not configurable. Remove it ` +
          `upstream (removeAttribute, names ["${RULE_SRC_ATTR}"]) or rename it with a setAttribute of your own; ` +
          "an enclosing applyRules writes it as u32 and gets it back unchanged.",
      );
    }
    throw new GraphValidationError(
      `${NODE}: ${param} "${name}" already exists on the frontier as ${existing.type} tuple ` +
        `${existing.tupleSize}, but this node writes it as ${type} tuple 1 — writing it would delete the ` +
        `column. Give ${param} a name of its own, or remove "${name}" upstream if it is dead.`,
    );
  }
  return set.add(name, type, 1, 0);
}

/**
 * Wrap an inner graph as a rewriting grammar; see the file header.
 *
 * Same construction as the other wrappers — exposed inputs become portals,
 * exposed outputs become inner output declarations, exposed params become
 * the node's own knobs — except that the RULE pairs are interior: fed and
 * drained by the round loop, never by a connection, and recorded so
 * `describeSubgraphPins` reports the node's real pins (`in` plus the
 * broadcasts in; `out`, `rounds`, `converged` out).
 */
export function applyRulesNode(
  inner: Graph,
  exposedInputs: readonly ExposedPin[],
  exposedOutputs: readonly ExposedPin[],
  exposedParams: readonly ExposedParam[] = [],
): NodeDef<Record<string, unknown>> {
  // Duplicate names first: `resolveRules` pairs by name, and a duplicate
  // would otherwise be misreported as a branch that does not reach its output.
  for (const [side, pins] of [
    ["input", exposedInputs],
    ["output", exposedOutputs],
  ] as const) {
    const seen = new Set<string>();
    for (const exp of pins) {
      if (seen.has(exp.name)) {
        throw new GraphValidationError(
          `${NODE}: duplicate exposed ${side} "${exp.name}"; a rule is ONE input and ONE output of its label's ` +
            "name, and a broadcast one input. Rename or remove the second.",
        );
      }
      seen.add(exp.name);
    }
  }
  const { rules, broadcasts } = resolveRules(inner, exposedInputs, exposedOutputs);
  for (const exp of exposedParams) {
    if (exp.name in APPLY_RULES_PARAM_SCHEMAS) {
      throw new GraphValidationError(
        `${NODE}: exposed param "${exp.name}" collides with this node's own param of that name ` +
          `(${Object.keys(APPLY_RULES_PARAM_SCHEMAS).join(", ")} are the grammar's own knobs, not the body's). ` +
          "One slot holds one value, so the exposed one would be a dead knob — rename it.",
      );
    }
  }
  const parts = prepareWrapper(inner, exposedInputs, exposedOutputs, exposedParams, "applyRules");
  const { portals, paramList } = parts;
  const ruleSet = new Set(rules);
  const inputPins: PinDef[] = [
    { name: APPLY_RULES_OUTER_INPUT, kind: "geometry" },
    ...parts.inputPins.filter((pin) => !ruleSet.has(pin.name)),
  ];
  const outputPins: PinDef[] = [
    { name: APPLY_RULES_OUTER_OUTPUT, kind: "geometry" },
    { name: "rounds", kind: "value" },
    { name: "converged", kind: "value" },
  ];
  const defaultParams: Record<string, unknown> = { ...parts.defaultParams };
  for (const [name, schema] of Object.entries(APPLY_RULES_PARAM_SCHEMAS)) {
    defaultParams[name] = Array.isArray(schema.default) ? [...schema.default] : schema.default;
  }
  const ruleIndex = new Map(rules.map((r, i) => [r, i]));
  const labelHash = Uint32Array.from(rules, (r) => hashString(r));
  const broadcastSet = new Set(broadcasts);

  const def = defineNode<Record<string, unknown>>({
    type: NODE,
    inputs: inputPins,
    outputs: outputPins,
    defaultParams,
    // As the other wrappers: the resolver is forwarded into every inner
    // cook, so a branch's field params may resolve on the device. The
    // loop, the classification and the lineage are CPU.
    gpu: "always",
    selfMetered: true,
    memoKey: () => transitiveVersionKey(inner, new Set()),
    async execute({ inputs, params, seed, signal, budgetMs, gpu, tripwire, checkCancelled }) {
      const maxDepth = params.maxDepth as number;
      if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_DEPTH_CEILING) {
        throw new GraphValidationError(
          `${NODE}: param "maxDepth" is ${JSON.stringify(maxDepth)}, but the grammar runs at least one round ` +
            `(integer, 1..${MAX_DEPTH_CEILING}).`,
        );
      }
      const labelAttr = params.labelAttr as string;
      const depthAttr = params.depthAttr as string;
      const rollAttr = params.rollAttr as string;
      const scopeRule = resolveScopes(rules, params.scoped, params.scopeOf);
      // Decided ONCE, as booleans: no param string is compared in the loop.
      const writeDepth = depthAttr !== "";
      const writeRoll = rollAttr !== "";
      let scopedCount = 0;
      for (const s of scopeRule) if (s !== -1) scopedCount++;
      checkStampNames(labelAttr, depthAttr, rollAttr, scopedCount);
      const inItem = requireGeometryItem(inputs, APPLY_RULES_OUTER_INPUT, NODE);

      // Scope SLOTS: one per distinct ancestor rule some rule is scoped to.
      // slotOfRule[r] is the slot rule r WRITES (its cells become the scope
      // of their descendants), -1 when no rule is scoped to it.
      const slotOfRule = new Int32Array(rules.length).fill(-1);
      let slotCount = 0;
      for (const s of scopeRule) {
        if (s >= 0 && slotOfRule[s] === -1) slotOfRule[s] = slotCount++;
      }
      const usesRoot = scopeRule.includes(-2);

      return withExclusiveGraph(inner, async () => {
        checkExposedValues(inner, paramList, params);
        const seedBefore = inner.seed;
        try {
          return await withExposedParams(inner, paramList, params, runRounds);
        } finally {
          inner._setSeedQuiet(seedBefore);
          // Release the portals' hold on the last round's cells. The inner
          // nodes' own caches still hold their last outputs, exactly as in
          // the other wrappers; this only stops the portal params from
          // pinning a second reference.
          for (const portal of portals) inner._setParamQuiet(portal.handle, "items", []);
        }

        async function runRounds(): Promise<Record<string, DataCollection>> {
          // ONE body seed for every round; see the file header.
          inner._setSeedQuiet(hashCombine(seed, hashString(NODE)));
          let sliceStart = performance.now();

          let frontier: Geometry = inItem.geo;
          // Wrapper-side lineage, one entry per frontier cell.
          let rootId: Uint32Array = new Uint32Array(0);
          // The `in` cell each frontier cell descends from, so `out` can be
          // handed back the incoming lineage column (see the header).
          let rootIdx: Int32Array = new Int32Array(0);
          let scopeId: Uint32Array[] = [];
          let scopeHas: Uint8Array[] = [];
          const outBlocks: Geometry[] = [];
          const outRoots: Int32Array[] = [];
          let outCount = 0;
          let rounds = 0;
          const cutOff = new Int32Array(rules.length);

          const labelsOf = (geo: Geometry, where: string): Int32Array | undefined => {
            if (geo.pointCount === 0) return undefined;
            const col = geo.attrs.point.get(labelAttr);
            if (col === undefined || col.type !== "string" || col.tupleSize !== 1) {
              throw new GraphValidationError(
                `${NODE}: ${where} ${col === undefined ? "has no" : `has a non-string (${col.type} tuple ${col.tupleSize})`} ` +
                  `point attribute "${labelAttr}" (labelAttr), so its cells cannot be dispatched to rules. ` +
                  `Point attributes there: ${geo.attrs.point.names().join(", ")}. Label the cells with splitBox ` +
                  `(its labelAttr) or setAttribute type "string", or point "labelAttr" at the column that holds ` +
                  "the labels.",
              );
            }
            const codes = classifyTable(col.stringTable, ruleIndex);
            const data = col.data;
            const out = new Int32Array(geo.pointCount);
            for (let i = 0; i < out.length; i++) out[i] = codes[data[i] as number] as number;
            return out;
          };

          const stampDepth = (geo: Geometry, depth: number): void => {
            if (!writeDepth || geo.pointCount === 0) return;
            stampColumn(geo, depthAttr, "i32", "depthAttr").fill(depth, 0, geo.pointCount);
          };

          const emit = (geo: Geometry, cells: Int32Array): void => {
            outCount += geo.pointCount;
            outBlocks.push(geo);
            outRoots.push(Int32Array.from(cells, (i) => rootIdx[i] as number));
          };

          let rule = labelsOf(frontier, `input "${APPLY_RULES_OUTER_INPUT}"`);
          if (frontier.pointCount > 0) {
            const ids = pointIdentities(frontier, NODE);
            rootId = ids;
            rootIdx = Int32Array.from({ length: frontier.pointCount }, (_, i) => i);
            scopeId = Array.from({ length: slotCount }, () => new Uint32Array(frontier.pointCount));
            scopeHas = Array.from({ length: slotCount }, () => new Uint8Array(frontier.pointCount));
          }

          for (let k = 0; rule !== undefined && frontier.pointCount > 0; k++) {
            const n = frontier.pointCount;
            // ---- classify: count per rule, then lay the fed list out
            // rule-major, each rule's cells in frontier order.
            const perRule = new Int32Array(rules.length);
            let terminals = 0;
            for (let i = 0; i < n; i++) {
              const r = rule[i] as number;
              if (r < 0) terminals++;
              else (perRule[r] as number)++;
            }
            const terminalIdx = new Int32Array(terminals);
            const start = new Int32Array(rules.length + 1);
            for (let r = 0; r < rules.length; r++) start[r + 1] = (start[r] as number) + (perRule[r] as number);
            const fedCount = start[rules.length] as number;
            const fedCell = new Int32Array(fedCount);
            const fill = start.slice(0, rules.length);
            for (let i = 0, t = 0; i < n; i++) {
              const r = rule[i] as number;
              if (r < 0) terminalIdx[t++] = i;
              else fedCell[(fill[r] as number)++] = i;
            }
            if (terminals > 0) {
              const done = gatherPoints(frontier, terminalIdx);
              stampDepth(done, k);
              emit(done, terminalIdx);
            }
            if (fedCount === 0) {
              frontier = gatherPoints(frontier, new Int32Array(0));
              break;
            }
            if (k >= maxDepth) {
              // The cap: whatever still carries a rule's label goes out
              // unexpanded and is counted against that rule.
              const left = gatherPoints(frontier, fedCell);
              stampDepth(left, k);
              emit(left, fedCell);
              for (let r = 0; r < rules.length; r++) cutOff[r] = perRule[r] as number;
              break;
            }
            checkCancelled();

            // ---- stamp and gather one geometry per FED rule.
            const ownId = pointIdentities(frontier, NODE);
            const fedGeo: (Geometry | undefined)[] = new Array(rules.length);
            const fedSummary: string[] = [];
            for (let r = 0; r < rules.length; r++) {
              const a = start[r] as number;
              const b = start[r + 1] as number;
              if (b === a) continue;
              fedSummary.push(`${rules[r]}×${b - a}`);
              const geo = gatherPoints(frontier, fedCell.subarray(a, b));
              const src = stampColumn(geo, RULE_SRC_ATTR, "u32", "the lineage column").writable();
              for (let j = 0; j < b - a; j++) src[j] = a + j + 1;
              stampDepth(geo, k);
              if (writeRoll) {
                const roll = stampColumn(geo, rollAttr, "f32", "rollAttr").writable();
                const scope = scopeRule[r] as number;
                const slot = scope >= 0 ? (slotOfRule[scope] as number) : -1;
                const lh = labelHash[r] as number;
                for (let j = 0; j < b - a; j++) {
                  const cell = fedCell[a + j] as number;
                  let key: number;
                  if (scope === -1) key = ownId[cell] as number;
                  else if (scope === -2) key = rootId[cell] as number;
                  else {
                    if ((scopeHas[slot] as Uint8Array)[cell] === 0) {
                      throw new GraphValidationError(
                        `${NODE}: rule "${rules[r]}" is scoped to "${rules[scope]}", but cell ${cell} of round ${k}'s ` +
                          `frontier, fed to "${rules[r]}", has no ancestor that was fed to "${rules[scope]}" — it ` +
                          `arrived on "${APPLY_RULES_OUTER_INPUT}" already labelled, or came down a branch that ` +
                          `never passed through "${rules[scope]}", so there is no scope to share a roll with. ` +
                          `Scope it to "${ROOT_SCOPE}", or route every "${rules[r]}" cell through "${rules[scope]}".`,
                      );
                    }
                    key = (scopeId[slot] as Uint32Array)[cell] as number;
                  }
                  // Inlined hashCombine(seed, labelHash, key[, round]): one per
                  // fed cell. An UNSCOPED roll folds in the round, because a
                  // relabel-only rule (setAttribute) does not change a cell's
                  // identity: without the round, "stay a panel while the roll
                  // is under 0.7" would roll the same number every round and
                  // stop all-or-nothing. A SCOPED roll leaves it out — sharing
                  // one number across depths is what a scope is for.
                  let h = hashSeed(scope === -1 ? 4 : 3);
                  h = hashMix(h, seed);
                  h = hashMix(h, lh);
                  h = hashMix(h, key);
                  if (scope === -1) h = hashMix(h, k);
                  roll[j] = hashFloat(hashFinalize(h));
                }
              }
              fedGeo[r] = geo;
            }

            // ---- cook the body once, over the fed rules' outputs only.
            for (const portal of portals) {
              const r = ruleIndex.get(portal.name);
              let items: DataCollection;
              if (r !== undefined) {
                const geo = fedGeo[r];
                // An unfed rule's portal holds nothing: its branch is not
                // cooked, and the shared graph should not pin last round's
                // cells.
                items = geo === undefined ? [] : [makeGeometryItem(geo, inItem.tags)];
              } else {
                items = broadcastSet.has(portal.name) ? (inputs[portal.name] ?? []) : [];
              }
              inner._setParamQuiet(portal.handle, "items", items);
            }
            const fedRules = rules.filter((_, r) => fedGeo[r] !== undefined);
            let result;
            try {
              result = await cook(inner, {
                outputs: fedRules.map((x) => `__out_${x}`),
                signal,
                budgetMs,
                gpu,
                tripwireSession: tripwire,
              });
            } catch (err) {
              // Cancellation and tripwire failures pass through UNWRAPPED,
              // and first — `repeatUntil.ts` says why.
              if (err instanceof CookCancelledError) throw err;
              if (isTripwireFailure(err)) throw err;
              throw new Error(
                `${NODE}: round ${k} (fed: ${fedSummary.join(", ")}) failed — ${
                  err instanceof Error ? err.message : String(err)
                }`,
                { cause: err },
              );
            }
            rounds++;

            // ---- check and link every product, then concatenate.
            const products: Geometry[] = [];
            const parentOf: Int32Array[] = [];
            let nextCount = 0;
            for (let r = 0; r < rules.length; r++) {
              if (fedGeo[r] === undefined) continue;
              const x = rules[r] as string;
              for (const item of result.outputs[`__out_${x}`] ?? []) {
                if (item.kind !== "geometry") {
                  throw new GraphValidationError(
                    `${NODE}: round ${k}: rule "${x}" emitted a ${item.kind} item; a rule's products are cells — ` +
                      "geometry — and go round the loop again. Emit instances downstream of the node, from \"out\".",
                  );
                }
                const geo = item.geo;
                const m = geo.pointCount;
                if (m === 0) {
                  products.push(geo);
                  parentOf.push(new Int32Array(0));
                  continue;
                }
                labelsOf(geo, `rule "${x}"'s output in round ${k}`);
                const col = geo.attrs.point.get(RULE_SRC_ATTR);
                const parents = new Int32Array(m);
                const a = start[r] as number;
                const b = start[r + 1] as number;
                const srcData = col !== undefined && col.type !== "string" && col.tupleSize === 1 ? col.data : undefined;
                for (let j = 0; j < m; j++) {
                  const v = srcData === undefined ? 0 : (srcData[j] as number);
                  if (!(Number.isInteger(v) && v >= a + 1 && v <= b)) {
                    const what = !Number.isInteger(v)
                      ? `carries ${RULE_SRC_ATTR} ${v}, which is not a whole number — the column was retyped or rewritten`
                      : v === 0
                        ? `carries ${RULE_SRC_ATTR} 0 — the default a merge fills in for a cell that never had one`
                        : v >= 1 && v <= fedCount
                          ? `names a cell fed to another rule`
                          : `carries ${RULE_SRC_ATTR} ${v}, which no cell fed this round has`;
                    throw new GraphValidationError(
                      `${NODE}: round ${k}: product ${j} of rule "${x}" ${what}, so it was not derived from a cell ` +
                        `fed to "${x}" and has no parent to inherit its lineage and scope from. Build a rule's ` +
                        "products FROM ITS INPUT — splitBox, repeatPoints, setBounds and setAttribute carry every " +
                        "column — not from a new source or a broadcast merged in.",
                    );
                  }
                  parents[j] = fedCell[v - 1] as number;
                }
                products.push(geo);
                parentOf.push(parents);
                nextCount += m;
              }
            }
            if (outCount + nextCount > MAX_RULE_POINTS) {
              throw new GraphValidationError(
                `${NODE}: round ${k} (fed: ${fedSummary.join(", ")}) grew the grammar to ${outCount + nextCount} ` +
                  `cells (frontier plus "out"), past the ${MAX_RULE_POINTS}-point cap — a rule whose products ` +
                  "never stop being fed to it. Make the recursion relabel to a terminal label once its cells are " +
                  "small enough, or cap it with a depth test on the depth attribute.",
              );
            }
            frontier =
              products.length === 0
                ? gatherPoints(frontier, new Int32Array(0))
                : concatAttributed(products, `round ${k}'s products (fed: ${fedSummary.join(", ")})`);
            // Lineage for the next frontier, in the same concatenation order.
            const nextRoot = new Uint32Array(nextCount);
            const nextRootIdx = new Int32Array(nextCount);
            const nextScope = Array.from({ length: slotCount }, () => new Uint32Array(nextCount));
            const nextHas = Array.from({ length: slotCount }, () => new Uint8Array(nextCount));
            let o = 0;
            for (const parents of parentOf) {
              for (let j = 0; j < parents.length; j++, o++) {
                const p = parents[j] as number;
                if (usesRoot) nextRoot[o] = rootId[p] as number;
                nextRootIdx[o] = rootIdx[p] as number;
                const pr = rule[p] as number;
                for (let s = 0; s < slotCount; s++) {
                  if (slotOfRule[pr] === s) {
                    (nextScope[s] as Uint32Array)[o] = ownId[p] as number;
                    (nextHas[s] as Uint8Array)[o] = 1;
                  } else {
                    (nextScope[s] as Uint32Array)[o] = (scopeId[s] as Uint32Array)[p] as number;
                    (nextHas[s] as Uint8Array)[o] = (scopeHas[s] as Uint8Array)[p] as number;
                  }
                }
              }
            }
            rootId = nextRoot;
            rootIdx = nextRootIdx;
            scopeId = nextScope;
            scopeHas = nextHas;
            rule = labelsOf(frontier, `round ${k}'s products`);

            if (budgetMs !== undefined && performance.now() - sliceStart > budgetMs) {
              await new Promise((resolve) => setTimeout(resolve, 0));
              checkCancelled();
              sliceStart = performance.now();
            }
          }

          const outGeo =
            outBlocks.length === 0
              ? gatherPoints(inItem.geo, new Int32Array(0))
              : concatAttributed(outBlocks, `the cells settling on "${APPLY_RULES_OUTER_OUTPUT}"`);
          // Hand back the lineage column `in` carried (an enclosing
          // applyRules' links), or none: see the header.
          const inSrc = inItem.geo.attrs.point.get(RULE_SRC_ATTR);
          const outSrc = outGeo.attrs.point.get(RULE_SRC_ATTR);
          if (inSrc === undefined || outSrc === undefined) {
            outGeo.attrs.point.remove(RULE_SRC_ATTR);
          } else {
            const from = inSrc.data;
            const to = outSrc.writable();
            let o = 0;
            for (const roots of outRoots) {
              for (let j = 0; j < roots.length; j++, o++) to[o] = from[roots[j] as number] as number;
            }
          }
          // The axiom's detail attributes ride through, as splitBox carries
          // them, and the cut-off report is added beside them.
          const detailIn = inItem.geo.attrs.detail;
          for (const attr of detailIn) {
            if (attr.name === RULES_CUT_OFF_ATTR || attr.name === RULES_CUT_OFF_NAMES_ATTR) continue;
            const copy = outGeo.attrs.detail.add(attr.name, attr.type, attr.tupleSize, attr.defaultValue as never);
            copy.copyFrom(attr, 0, 0, 1);
          }
          const report = outGeo.attrs.detail.add(RULES_CUT_OFF_ATTR, "i32", rules.length, 0);
          for (let r = 0; r < rules.length; r++) report.set(0, cutOff[r] as number, r);
          // Its companion, so the counts are NAMED without the body in hand:
          // component r of both is rule r.
          const names = outGeo.attrs.detail.replace(RULES_CUT_OFF_NAMES_ATTR, "string", rules.length, "");
          for (let r = 0; r < rules.length; r++) names.setString(0, rules[r] as string, r);
          let total = 0;
          for (const c of cutOff) total += c;
          return {
            [APPLY_RULES_OUTER_OUTPUT]: [makeGeometryItem(outGeo, inItem.tags)],
            rounds: [makeValueItem(rounds)],
            converged: [makeValueItem(total === 0 ? 1 : 0)],
          };
        }
      });
    },
  });
  recordWrapperSpec(def, NODE, inner, exposedInputs, exposedOutputs, paramList, {
    inputs: ruleSet,
    outputs: ruleSet,
  });
  return def;
}
