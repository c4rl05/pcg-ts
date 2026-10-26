/**
 * The two ways a graph can still mix a point's box with its position after
 * bounds became an extent in the point's OWN frame (world =
 * P + rot * (scale * x); see `docs/authoring.md`, "the one meaning of a
 * point's box"), refused by structure rather than cooked wrong.
 *
 * Before that change a box was a WORLD box and the box nodes ignored P, so
 * two idioms were right and are now silently wrong:
 *
 * - A box whose CORNERS both track P — `boundsMin = position() - size / 2`,
 *   `boundsMax = position() + size / 2` — was the way to put a box at a
 *   point. Now the point's transform adds P to the corners a second time,
 *   and the box lands at twice P. Refused as `box-corner-counts-position`.
 * - P set FROM a box position — `P = box("center")`, or `translate =
 *   box("center") - position()` — was the cell-to-instance hand-off. Now a
 *   box position is an offset FROM P, so P receives an offset as if it were
 *   a place. Refused as `position-from-local-box`; `pivotBox` is the
 *   hand-off.
 *
 * WHAT IS MEASURED. Each expression is read as an AFFINE function of two
 * hidden vectors, per output component: P (`position()`, `attribute("P")`)
 * and O, the translation every box POSITION carries (`attribute("boundsMin")`
 * and `"boundsMax"`, and so `lo`, `hi`, `center`, `x0` … `cz`, which are
 * built on them; `size` and `sx` … `sz` are differences, so O cancels out
 * of them, which is what makes a size frame-free). Only what is exactly
 * affine is judged — sums, differences, products and quotients by a
 * literal, `vec`, `component`, `let`, `remap` with literal ranges, and the
 * branches of `select`, `min`, `max`, `clamp`, `lerp`, `choose` and
 * `byAttribute` when every branch agrees. Anything else holding P or O
 * (a noise sampled AT position(), a `floor`, a product of two attributes)
 * is unknown and never refused: `noise(position())` driving a box SIZE is
 * a legitimate box, and the refusal must not reach it. A comparison, a
 * hash and an index are flat in P (they do not move with it), so P read
 * only to DECIDE something counts for nothing.
 *
 * ATTRIBUTES THAT MAY HOLD A PLACE. An attribute other than P and the
 * corners can carry a world position (a rest P, an anchor transferred in),
 * and `attribute("rest", 3) - position()` is then a perfectly good local
 * vector. So a VECTOR attribute — read with a tupleSize above 1, indexed
 * with `component`, or broadcast against a vector — taints every component
 * it reaches, and a tainted component is never judged. A SCALAR attribute
 * (a width, a storey count: tupleSize 1, or no tupleSize where the
 * expression is a scalar) is taken to be a quantity rather than a copy of
 * a coordinate. That is the one judgement the analysis makes.
 *
 * THE RULES, per output axis i, only where the reading is exact and
 * untainted. The line drawn: a pattern is refused only when it is right
 * for no input but by a coincidence of the data (P = 0 there, P zeroed
 * later); a pattern that is right for every input is never refused.
 * - setBounds "corners" whose BOTH corners have P_i coefficient exactly 1:
 *   the box's size on that axis does not depend on P and its place moves
 *   with P — the old world box at P — so it lands at twice P. ONE corner
 *   tracking P is not refused: min.y = -P.y with max.y = P.y is a box
 *   centred on P that reaches down to world y = 0, right for every P. That
 *   is also why a setAttribute "boundsMin"/"boundsMax" is not judged ON
 *   ITS OWN: one corner alone cannot say which of the two it is. The
 *   validate-time pairing ({@link pairedCornerFaults}) finds the write of
 *   the other corner along the same chain and applies this same rule to
 *   the two together. -1 and 0.5 are not refused either (reaching a
 *   plane; a size that grows with height);
 * - a new P_i with no P term at all (coefficient 0 on every P component)
 *   that still carries O is a box position used as a world position. A
 *   SIZE written into P (`index() * box("sx")`) carries no O and is not
 *   refused: a length is the same in every frame.
 *
 * EVER CORRECT? A box translating rigidly with P is right only when the
 * graph zeroes P afterwards, baking P into the box; nothing in the library
 * needs that and it is refused all the same. A P set from a box position
 * is right only where P is already 0 on that axis with the transform the
 * identity there, and the box is overwritten after it — the old instance
 * tail's exact conditions, a ground-plane scatter's y among them — and
 * there `position() + box(...)` is the same number, while `pivotBox` does
 * the job with none of the conditions.
 *
 * ONE ANALYSIS, THREE CALLERS: each node's `execute` (and its resident
 * `eligible` gate, so a fused device run cannot skip the refusal), and
 * `diagnoseGraph`, so `pcg validate` reports it before a cook does. All of
 * them read the field's own spec (`peekFieldSpec`), never a string match.
 * The one refusal that spans two nodes, a corner pair split across two
 * setAttribute writes, is VALIDATE-ONLY: a cook runs one node at a time
 * and never sees the other corner's expression, so only `diagnoseGraph`
 * reports it.
 */
import { canonicalOneOf } from "../diagnostics/canonical.js";
import type { Diagnostic } from "../diagnostics/index.js";
import { BOX_EXPANSIONS, BOX_MAX_ATTR, BOX_MIN_ATTR, type BoxName } from "../fields/boxNames.js";
import { isField } from "../fields/index.js";
import {
  type FieldSpec,
  opaqueParam,
  paramSpecOf,
  paramValue,
  peekFieldSpec,
  specChildEntries,
} from "../fields/spec.js";

/** One output component: its coefficients on P and on O, and its literal value when it is one. */
interface Row {
  readonly p: readonly [number, number, number];
  readonly o: readonly [number, number, number];
  /** The component's value when the expression is a literal there. */
  readonly k?: number;
  /** A vector attribute reaches it, which may hold a place; never judged. */
  readonly foreign?: true;
}

/**
 * What an expression is, as far as the analysis can say: its components
 * (null where one is not exactly affine), or null when it cannot be read
 * at all. `assumed` marks a reading whose width rests on taking a width
 * the spec does not state (an attribute read without a tupleSize, a
 * comparison) as 1. Every such part is flat — all its components are
 * zero in P and O — so the assumption cannot change a coefficient, only
 * which slot of a `vec` a later part lands in; a reading that rests on it
 * is judged only at width 3 (or 1, which broadcasts), where a wrong guess would have made the
 * value wider than the node accepts, so that node refuses it anyway.
 */
type Reading = {
  readonly rows: readonly (Row | null)[];
  readonly assumed?: true;
  /**
   * An attribute read with no tupleSize (or a value built only on one):
   * a scalar where it stays width 1, a VECTOR — so its components are
   * foreign — wherever it is indexed or broadcast against one.
   */
  readonly vectorish?: true;
} | null;

const Z3 = [0, 0, 0] as const;
const ZERO: Row = { p: Z3, o: Z3 };
const AXES = ["x", "y", "z"] as const;

function lit(k: number): Row {
  return { p: Z3, o: Z3, k };
}

function unit(axis: number): [number, number, number] {
  const e: [number, number, number] = [0, 0, 0];
  e[axis] = 1;
  return e;
}

function flat(r: Row): boolean {
  return r.p.every((c) => c === 0) && r.o.every((c) => c === 0);
}

/** Every component known, untainted and flat. */
function flatReading(v: Reading): boolean {
  return v !== null && v.rows.every((r) => r !== null && r.foreign !== true && flat(r));
}

function tainted(r: Row): Row {
  return r.foreign === true ? r : { ...r, foreign: true };
}

const WILD_ZERO: Reading = { rows: [ZERO], assumed: true };
/** A value that cannot be read exactly, of a width taken as 1. */
const UNKNOWN_ONE: Reading = { rows: [null], assumed: true };

function same(a: Row, b: Row): boolean {
  return a.p.every((c, i) => c === b.p[i]) && a.o.every((c, i) => c === b.o[i]);
}

function lin(
  a: Row,
  b: Row,
  fa: number,
  fb: number,
): Row {
  const p: [number, number, number] = [0, 0, 0];
  const o: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    p[i] = fa * a.p[i]! + fb * b.p[i]!;
    o[i] = fa * a.o[i]! + fb * b.o[i]!;
  }
  const foreign = (fa !== 0 && a.foreign === true) || (fb !== 0 && b.foreign === true);
  const k = a.k !== undefined && b.k !== undefined ? fa * a.k + fb * b.k : undefined;
  return { p, o, ...(k !== undefined ? { k } : {}), ...(foreign ? { foreign: true as const } : {}) };
}

/** A flat, non-literal row, tainted when any of `from` is. */
function zeroFrom(...from: readonly Row[]): Row {
  return from.some((r) => r.foreign === true) ? { p: Z3, o: Z3, foreign: true } : ZERO;
}

function scaled(a: Row, f: number): Row {
  return lin(a, ZERO, f, 0);
}

/** The width two broadcastable readings combine to, or undefined when they cannot. */
function joinWidth(widths: readonly number[]): number | undefined {
  let w = 1;
  for (const n of widths) {
    if (n === 1 || n === w) continue;
    if (w !== 1) return undefined;
    w = n;
  }
  return w;
}

/** Component `i` of a broadcastable reading. */
function rowAt(v: { readonly rows: readonly (Row | null)[] }, i: number): Row | null {
  return v.rows.length === 1 ? v.rows[0]! : (v.rows[i] ?? null);
}

/** Combine readings component by component; `f` sees one row from each (none null). */
function elementwise(args: readonly Reading[], f: (rows: readonly Row[]) => Row | null): Reading {
  if (args.some((a) => a === null)) return null;
  const known = args as readonly NonNullable<Reading>[];
  const w = joinWidth(known.map((a) => a.rows.length));
  if (w === undefined) return null;
  const rows: (Row | null)[] = [];
  for (let i = 0; i < w; i++) {
    // A width-1 attribute read broadcast against a vector may BE a vector.
    const at = known.map((a) => {
      const r = rowAt(a, i);
      return r !== null && w > 1 && a.vectorish === true ? tainted(r) : r;
    });
    rows.push(at.some((r) => r === null) ? null : f(at as Row[]));
  }
  return {
    rows,
    ...(known.some((a) => a.assumed === true) ? { assumed: true as const } : {}),
    ...(w === 1 && known.some((a) => a.vectorish === true) ? { vectorish: true as const } : {}),
  };
}

/** A selector takes part in the width (it broadcasts) but not in the value. */
function widthOnly(v: Reading): Reading {
  if (v === null) return null;
  return { ...v, rows: v.rows.map(() => ZERO) };
}

/** Branches that agree on every coefficient keep it; any disagreement is unknown. */
function agree(rows: readonly Row[]): Row | null {
  const first = rows[0]!;
  if (!rows.every((r) => same(r, first))) return null;
  const foreign = rows.some((r) => r.foreign === true);
  const k = rows.every((r) => r.k === first.k) ? first.k : undefined;
  return { p: first.p, o: first.o, ...(k !== undefined ? { k } : {}), ...(foreign ? { foreign: true as const } : {}) };
}

/** Fns whose value does not move with P or O: a comparison, a hash, an index. */
const FLAT_FNS = new Set([
  "lt",
  "le",
  "gt",
  "ge",
  "eq",
  "ne",
  "step",
  "sign",
  "attributeIs",
  "randomField",
  "randomFrom",
  "index",
  "fraction",
  "nodeSeed",
]);

/** The noise samplers, which read position() themselves unless `opts.position` says where. */
const NOISE_FNS = new Set(["valueNoise", "perlinNoise", "simplexNoise", "worleyNoise", "worleyFeature", "fbm"]);

type Scope = ReadonlyMap<string, Reading>;

function literalReading(v: unknown): Reading {
  if (typeof v === "number") return { rows: [lit(v)] };
  if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "number")) {
    return { rows: (v as number[]).map(lit) };
  }
  return null;
}

function readArgs(node: Record<string, unknown>, scope: Scope): Reading[] {
  const args = node.args;
  return Array.isArray(args) ? args.map((a) => read(a, scope)) : [];
}

function read(spec: unknown, scope: Scope): Reading {
  if (typeof spec === "number" || Array.isArray(spec)) return literalReading(spec);
  if (typeof spec !== "object" || spec === null) return null;
  const node = spec as Record<string, unknown>;
  switch (node.fn) {
    case "constant":
      return literalReading(node.value);
    case "position":
      return { rows: [0, 1, 2].map((a) => ({ p: unit(a), o: Z3 })) };
    case "attribute": {
      const name = node.name;
      if (name === "P") return read({ fn: "position" }, scope);
      if (name === BOX_MIN_ATTR || name === BOX_MAX_ATTR) {
        return { rows: [0, 1, 2].map((a) => ({ p: Z3, o: unit(a) })) };
      }
      const ts = node.tupleSize;
      if (typeof ts === "number" && Number.isInteger(ts) && ts >= 1) {
        const row: Row = ts === 1 ? ZERO : { p: Z3, o: Z3, foreign: true };
        return { rows: Array.from({ length: ts }, () => row) };
      }
      return { rows: [ZERO], assumed: true, vectorish: true };
    }
    case "box": {
      const expansion = Object.hasOwn(BOX_EXPANSIONS, node.name as string)
        ? BOX_EXPANSIONS[node.name as BoxName]
        : undefined;
      return expansion === undefined ? null : read(expansion, scope);
    }
    case "param": {
      const spliced = paramSpecOf(node as FieldSpec);
      if (spliced !== undefined) return read(spliced, scope);
      // Bound to a field that cannot describe itself: its inline value is
      // not what is evaluated.
      if (opaqueParam(node as FieldSpec)) return UNKNOWN_ONE;
      const bound = paramValue(node as FieldSpec) ?? node.value;
      return literalReading(bound) ?? WILD_ZERO;
    }
    case "let": {
      const inner = new Map(scope);
      const bind = node.bind;
      if (typeof bind === "object" && bind !== null) {
        for (const [name, value] of Object.entries(bind as Record<string, unknown>)) {
          inner.set(name, read(value, inner));
        }
      }
      const args = node.args;
      return Array.isArray(args) && args.length === 1 ? read(args[0], inner) : null;
    }
    case "var":
      return typeof node.name === "string" ? (scope.get(node.name) ?? null) : null;
    case "add":
      return elementwise(readArgs(node, scope), ([a, b]) => (b === undefined ? null : lin(a!, b, 1, 1)));
    case "sub":
      return elementwise(readArgs(node, scope), ([a, b]) => (b === undefined ? null : lin(a!, b, 1, -1)));
    case "mul":
      return elementwise(readArgs(node, scope), ([a, b]) => {
        if (b === undefined) return null;
        if (a!.k !== undefined) return b.k !== undefined ? lit(a!.k * b.k) : scaled(b, a!.k);
        if (b.k !== undefined) return scaled(a!, b.k);
        return flat(a!) && flat(b) ? zeroFrom(a!, b) : null;
      });
    case "div":
      return elementwise(readArgs(node, scope), ([a, b]) => {
        if (b === undefined) return null;
        if (b.k !== undefined && b.k !== 0) {
          return a!.k !== undefined ? lit(a!.k / b.k) : scaled(a!, 1 / b.k);
        }
        return flat(a!) && flat(b) ? zeroFrom(a!, b) : null;
      });
    case "vec": {
      const parts = readArgs(node, scope);
      if (parts.length === 0 || parts.some((p) => p === null)) return null;
      // A part read with no tupleSize is taken as one component here; were
      // it wider, the vec would be wider than 3 and the reading unjudged.
      const rows = parts.flatMap((p) => p!.rows);
      return parts.some((p) => p!.assumed === true) ? { rows, assumed: true } : { rows };
    }
    case "component": {
      const [of] = readArgs(node, scope);
      const index = node.index;
      if (of === null || of === undefined || typeof index !== "number") return null;
      // Which component a slot holds rests on every width before it, so an
      // assumed width is only safe to index when there is nothing to index.
      if (of.assumed === true) {
        if (of.rows.length !== 1) return null;
        // Indexing an attribute says it is a vector, and it may hold a place.
        const r = of.rows[0]!;
        return { rows: [of.vectorish === true && r !== null ? tainted(r) : r], assumed: true };
      }
      return { rows: [rowAt(of, index)] };
    }
    case "select": {
      const [cond, whenTrue, whenFalse] = readArgs(node, scope);
      return elementwise([widthOnly(cond ?? null), whenTrue ?? null, whenFalse ?? null], ([, a, b]) =>
        b === undefined ? null : agree([a!, b]),
      );
    }
    case "min":
    case "max":
    case "clamp":
      return elementwise(readArgs(node, scope), agree);
    case "choose": {
      const [which, ...cases] = readArgs(node, scope);
      return elementwise([widthOnly(which ?? null), ...cases], ([, ...rows]) =>
        rows.length === 0 ? null : agree(rows),
      );
    }
    case "byAttribute": {
      const branches: Reading[] = [];
      const cases = node.cases;
      if (typeof cases === "object" && cases !== null) {
        for (const v of Object.values(cases as Record<string, unknown>)) branches.push(read(v, scope));
      }
      branches.push(read(node.default, scope));
      return elementwise(branches, agree);
    }
    case "lerp":
      return elementwise(readArgs(node, scope), ([a, b, t]) => {
        if (b === undefined || t === undefined) return null;
        if (t.k !== undefined) return lin(a!, b, 1 - t.k, t.k);
        if (!flat(t)) return null;
        // A tainted weight taints the blend: lerp(0, 1, anchorX) IS anchorX.
        const r = agree([a!, b]);
        return r !== null && t.foreign === true ? tainted(r) : r;
      });
    case "remap":
      return elementwise(readArgs(node, scope), ([x, i0, i1, o0, o1]) => {
        if (o1 === undefined) return null;
        const ranges = [i0!, i1!, o0!, o1];
        if (ranges.every((r) => r.k !== undefined) && i1!.k !== i0!.k) {
          const f = (o1.k! - o0!.k!) / (i1!.k! - i0!.k!);
          // o0 + (x - i0) * f, so x's coefficients scale by f.
          return x!.k !== undefined ? lit(o0!.k! + (x!.k - i0!.k!) * f) : scaled(x!, f);
        }
        return flat(x!) && ranges.every(flat) ? zeroFrom(x!, ...ranges) : null;
      });
    default: {
      if (typeof node.fn !== "string") return null;
      if (FLAT_FNS.has(node.fn)) return WILD_ZERO;
      // A noise with no `opts.position` samples AT position(): a function
      // of P, though no child says so.
      const opts = node.opts as Record<string, unknown> | undefined;
      if (NOISE_FNS.has(node.fn) && (typeof opts !== "object" || opts === null || opts.position === undefined)) {
        return UNKNOWN_ONE;
      }
      // Anything else is a function of its children: flat when they all
      // are, unknown otherwise (a noise sampled at position(), a floor).
      // Unknown is still a VALUE, of the width assumed for it, so the other
      // components of a vec around it are judged.
      for (const child of specChildEntries(node)) {
        if (child.kind === "variant") continue;
        if (!flatReading(read(child.value, scope))) return UNKNOWN_ONE;
      }
      return WILD_ZERO;
    }
  }
}

/** The reading of a param value: its spec when it is a field, its literal otherwise. */
function readParam(value: unknown): Reading {
  if (isField(value)) {
    const spec = peekFieldSpec(value);
    return spec === undefined ? null : read(spec, new Map());
  }
  return literalReading(value);
}

/** Axes 0..2 of a reading whose row satisfies `test`. */
function axesWhere(v: Reading, test: (row: Row, axis: number) => boolean): number[] {
  if (v === null) return [];
  if (v.assumed === true && v.rows.length !== 3 && v.rows.length !== 1) return [];
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const row = rowAt(v, i);
    if (row !== null && test(row, i)) out.push(i);
  }
  return out;
}

/** The axes on which a box corner is exactly P_i plus something P-free on that axis. */
function cornerCountsP(v: Reading): number[] {
  return axesWhere(v, (row, i) => row.foreign !== true && row.p[i] === 1);
}

/**
 * The axes on which BOTH corners are P_i plus something P-free: the box
 * `box-corner-counts-position` refuses. One rule for setBounds' two params
 * and for two setAttribute corner writes paired along a chain.
 */
function cornerPairAxes(min: Reading, max: Reading): number[] {
  // A plain corner reads as a literal, so it never tracks P.
  const lo = cornerCountsP(min);
  if (lo.length === 0) return [];
  const hi = new Set(cornerCountsP(max));
  return lo.filter((a) => hi.has(a));
}

/** The axes on which a new P carries a box position and no P at all. */
function pFromBox(v: Reading, addP: boolean): number[] {
  return axesWhere(v, (row, i) => {
    if (row.foreign === true) return false;
    const p = addP ? lin(row, { p: unit(i), o: Z3 }, 1, 1).p : row.p;
    return p.every((c) => c === 0) && row.o.some((c) => c !== 0);
  });
}

function axisList(axes: readonly number[]): string {
  const names = axes.map((a) => AXES[a]!);
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const FRAME = "a box is an extent in its point's OWN frame (world = P + rot * (scale * x); [0, 0, 0] is the point)";

const PIVOT_FIX =
  'To move each point into its box, use pivotBox (pivot [0.5, 0.5, 0.5] is the centre, [0.5, 0, 0.5] the base): it moves P there and re-expresses the box about it, so the world box stays where it was. For instances, follow it with setAttribute "scale" = mul(attribute("scale", 3), box("size")) and setBounds [-0.5, -0.5, -0.5]..[0.5, 0.5, 0.5]; a world-space fact about a box is read after pivotBox as position()';

/** A refusal: what the node's `execute` throws and what `diagnoseGraph` reports. */
export interface BoundsFrameFault {
  readonly code: "box-corner-counts-position" | "position-from-local-box";
  readonly param: string;
  /** The sentence after the `<nodeType>: ` prefix. */
  readonly message: string;
  readonly expected: string;
}

function cornerFault(param: string, axes: readonly number[]): BoundsFrameFault {
  const axisWord = axes.length === 1 ? "axis" : "axes";
  return {
    code: "box-corner-counts-position",
    param,
    message:
      `param "${param}" is position() plus an offset on ${axisWord} ${axisList(axes)}, and so is the other corner, so the box ` +
      `keeps its size and moves with P there — the world box at P that corners described before bounds became local — and that ` +
      `counts P twice: ${FRAME}, so the point's transform adds P to both corners again and the box lands at twice P. ` +
      `${SET_BOUNDS_FIX}.`,
    expected: "corners relative to the point, with no position() term",
  };
}

function positionFault(param: string, how: string, axes: readonly number[]): BoundsFrameFault {
  const axisWord = axes.length === 1 ? "axis" : "axes";
  return {
    code: "position-from-local-box",
    param,
    message:
      `param "${param}" ${how} on ${axisWord} ${axisList(axes)}, with no position() term: ${FRAME}, so its corners and centre ` +
      `(box("lo"), box("center"), attribute("boundsMin"), ...) are offsets FROM P, not world positions, and P would land ` +
      `at the offset as if it were a place. ${PIVOT_FIX}.`,
    expected: "pivotBox, or a new P that keeps its position() term",
  };
}

const SET_BOUNDS_FIX =
  'Drop position() and keep the offset (boundsMin [-4, 0, -3] puts the min corner 4 left of, level with and 3 behind each point), or size the box about the point with "anchor" "center", "baseCenter" or "min" and a "size"';

// The one enum value each rule applies under, decided once per call.
const CORNERS = ["corners"] as const;
const POINT = ["point"] as const;
const F32 = ["f32"] as const;

/** The first refusal {@link boundsFrameFaults} finds, or undefined: what a node's execute throws. */
export function boundsFrameFault(
  nodeType: string,
  params: Readonly<Record<string, unknown>>,
): BoundsFrameFault | undefined {
  return boundsFrameFaults(nodeType, params)[0];
}

/**
 * Every refusal `nodeType` with `params` earns, in param order; empty for
 * a sound node. `params` are the node's live values (a field param is a
 * `Field`). Only setBounds (its two corners, together), setAttribute (P on
 * the point domain) and transformPoints (translate, under its default
 * rotation and scale) are judged; every other type, and every other param,
 * earns none. A setBounds refusal names BOTH corners, one record each.
 */
export function boundsFrameFaults(
  nodeType: string,
  params: Readonly<Record<string, unknown>>,
): readonly BoundsFrameFault[] {
  if (nodeType === "setBounds") {
    // Only "corners" writes the corners; the anchors never read them.
    if (canonicalOneOf(CORNERS, params.anchor ?? "corners") === undefined) return [];
    const axes = cornerPairAxes(readParam(params.boundsMin), readParam(params.boundsMax));
    if (axes.length === 0) return [];
    return [cornerFault("boundsMin", axes), cornerFault("boundsMax", axes)];
  }
  const one = singleParamFault(nodeType, params);
  return one === undefined ? [] : [one];
}

function singleParamFault(
  nodeType: string,
  params: Readonly<Record<string, unknown>>,
): BoundsFrameFault | undefined {
  switch (nodeType) {
    case "setAttribute": {
      const name = params.name;
      if (canonicalOneOf(POINT, params.domain ?? "point") === undefined) return undefined;
      if (canonicalOneOf(F32, params.type ?? "f32") === undefined) return undefined;
      if (!isField(params.value)) return undefined;
      // A corner written alone is not judged here: one corner tracking P
      // can be half of a box centred on P that reaches a world plane, and
      // the other corner is in another node. `pairedCornerFaults` pairs the
      // two writes at validate, where the graph is in view.
      if (name === "P") {
        const axes = pFromBox(readParam(params.value), false);
        return axes.length === 0 ? undefined : positionFault("value", 'writes "P" from a box position', axes);
      }
      return undefined;
    }
    case "transformPoints": {
      // P' = R * (scale * P) + translate; judged only where that is
      // P + translate, the shape of the old move-to-the-box idiom.
      if (!isField(params.translate)) return undefined;
      if (!isDefaultVec(params.rotateEuler, 0) || !isDefaultVec(params.scale, 1)) return undefined;
      const axes = pFromBox(readParam(params.translate), true);
      return axes.length === 0
        ? undefined
        : positionFault(
            "translate",
            "subtracts position() and adds a box position, moving P onto that box position",
            axes,
          );
    }
    default:
      return undefined;
  }
}

function isDefaultVec(value: unknown, d: number): boolean {
  if (value === undefined || value === d) return true;
  return Array.isArray(value) && value.length === 3 && value.every((c) => c === d);
}

/** The error a node's `execute` throws for `fault`: its record carries the code. */
export function boundsFrameError(nodeType: string, fault: BoundsFrameFault): Error {
  const message = `${nodeType}: ${fault.message}`;
  const record: Diagnostic = {
    code: fault.code,
    severity: "error",
    message,
    param: fault.param,
    expected: fault.expected,
  };
  return Object.assign(new Error(message), { diagnostics: Object.freeze([Object.freeze(record)]) });
}

/** Throw the refusal `nodeType` with `params` earns, if any. */
export function refuseBoundsFrameFault(nodeType: string, params: Readonly<Record<string, unknown>>): void {
  const fault = boundsFrameFault(nodeType, params);
  if (fault !== undefined) throw boundsFrameError(nodeType, fault);
}

// ---------------------------------------------------------------------------
// The corner pair split across two setAttribute writes. VALIDATE-ONLY: a
// cook runs one node at a time, so the node writing one corner never sees
// the expression that wrote the other; `diagnoseGraph` has the whole level
// in view and reports the pair there, before a cook.

/** One node, as the pairing reads it: its type and live params. */
export interface CornerChainNode {
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/** The slice of a graph level the pairing walks: its nodes, what feeds a pin, and what reads a node. */
export interface CornerChainView {
  readonly node: (id: string) => CornerChainNode | undefined;
  readonly into: (id: string, pin: string) => readonly { readonly from: string; readonly fromPin: string }[];
  /** How many connections and declared outputs read `id`'s outputs. */
  readonly readers: (id: string) => number;
}

/** A paired-corner refusal, attached to one of the two nodes. */
export interface PairedCornerFault extends BoundsFrameFault {
  readonly nodeId: string;
  /** The node that writes the other corner. */
  readonly partner: string;
}

type CornerName = typeof BOX_MIN_ATTR | typeof BOX_MAX_ATTR;

/** P and the two corners: what a node between the two writes must leave alone. */
const FRAME_ATTRS: ReadonlySet<string> = new Set(["P", BOX_MIN_ATTR, BOX_MAX_ATTR]);

/**
 * The corner `node` writes as a whole point-domain f32 vector — the
 * column the box nodes read — or undefined. Decided once per node.
 */
function cornerWritten(node: CornerChainNode): CornerName | undefined {
  if (node.type !== "setAttribute") return undefined;
  const p = node.params;
  const name = p.name;
  if (name !== BOX_MIN_ATTR && name !== BOX_MAX_ATTR) return undefined;
  if (canonicalOneOf(POINT, p.domain ?? "point") === undefined) return undefined;
  if (canonicalOneOf(F32, p.type ?? "f32") === undefined) return undefined;
  if (p.tupleSize !== 3) return undefined;
  return name;
}

/**
 * Whether `node` provably hands every surviving point's P, boundsMin and
 * boundsMax through unchanged. THE STOP SET IS EVERYTHING ELSE: an
 * allowlist rather than a list of known offenders, so a node type added
 * later, a wrapper, a merge, a box node (setBounds, pivotBox, splitBox,
 * transformBox, ...), transformPoints, promoteAttribute and any node not
 * read here all end the walk without a pairing. Allowed:
 * - setAttribute writing some OTHER attribute (any domain) from a value
 *   that does not read the box: it replaces exactly the column it names.
 *   One that reads the box could copy the earlier corner into a scalar
 *   (`hy = box("y1")`), which the later corner would read as a quantity
 *   while it is the P-tracking corner, so it stops the walk;
 * - removeAttribute naming none of the three;
 * - filterByAttribute and filterByExpression: they drop points and keep
 *   each survivor's columns as they were, so the two corners still meet
 *   on the same point with the same P.
 */
function keepsFrame(node: CornerChainNode): boolean {
  const p = node.params;
  switch (node.type) {
    case "setAttribute":
      return typeof p.name === "string" && !FRAME_ATTRS.has(p.name) && !readsBox(p.value) && !readsBox(p.select);
    case "removeAttribute": {
      const names = p.names;
      return Array.isArray(names) && names.every((n) => typeof n === "string" && !FRAME_ATTRS.has(n));
    }
    case "filterByAttribute":
    case "filterByExpression":
      return true;
    default:
      return false;
  }
}

/**
 * The node upstream of `id` that writes `other`, reached through the `in`
 * pins alone and only across {@link keepsFrame} nodes; undefined when the
 * chain is ambiguous (no feed, or a pin fed twice), leaves through any
 * other node, or meets a write of P or of either corner first. `shared`
 * says the partner or a node between them is also read by another branch
 * (a fan-out), where the partner's corner may be meant as it is.
 */
function upstreamPartner(
  view: CornerChainView,
  id: string,
  other: CornerName,
): { readonly partner: string; readonly shared: boolean } | undefined {
  const seen = new Set([id]);
  let at = id;
  let shared = false;
  for (;;) {
    const feeds = view.into(at, "in");
    if (feeds.length !== 1) return undefined;
    const { from, fromPin } = feeds[0]!;
    if (fromPin !== "out" || seen.has(from)) return undefined;
    seen.add(from);
    const up = view.node(from);
    if (up === undefined) return undefined;
    shared ||= view.readers(from) > 1;
    const corner = cornerWritten(up);
    if (corner !== undefined) return corner === other ? { partner: from, shared } : undefined;
    if (!keepsFrame(up)) return undefined;
    at = from;
  }
}

/**
 * Whether a spec reads the point's box anywhere — a box name or a corner
 * attribute, sizes included — or cannot be seen into. The later of two
 * corner writes reads the box the earlier one just WROTE, which is not
 * the box a setBounds corner reads: `box("size")` there is the new max
 * minus the P-tracking min, so a coefficient on P read through it is not
 * the corner's own. Such a write is not paired at all.
 */
function readsBox(spec: unknown): boolean {
  if (Array.isArray(spec)) return spec.some(readsBox);
  if (typeof spec !== "object" || spec === null) return false;
  if (isField(spec)) {
    const inner = peekFieldSpec(spec);
    return inner === undefined || readsBox(inner);
  }
  const node = spec as Record<string, unknown>;
  if (node.fn === "box") return true;
  if (node.fn === "attribute" && (node.name === BOX_MIN_ATTR || node.name === BOX_MAX_ATTR)) return true;
  if (node.fn === "param") {
    const spliced = paramSpecOf(node as FieldSpec);
    if (spliced !== undefined) return readsBox(spliced);
    return opaqueParam(node as FieldSpec);
  }
  return specChildEntries(node).some((c) => readsBox(c.value));
}

const PAIR_FIX =
  'Drop position() from both corners and keep the offsets (boundsMin [-4, 0, -3] puts the min corner 4 left of, level with and 3 behind each point), or replace the two setAttribute nodes with one setBounds that sizes the box about the point with "anchor" "center", "baseCenter" or "min" and a "size"';

/**
 * The fix when the earlier node also feeds another branch: change this
 * chain alone, since editing the shared node would change that branch too.
 */
function sharedFix(earlier: string, later: string): string {
  return (
    `node ${JSON.stringify(earlier)} also feeds another branch, where its corner may be meant as it is, so change this ` +
    `chain alone: replace node ${JSON.stringify(later)} with one setBounds that sizes the box about the point with ` +
    `"anchor" "center", "baseCenter" or "min" and a "size" (it writes both corners, on this chain only), or drop ` +
    `position() from ${JSON.stringify(later)} once its corner is relative to the point`
  );
}

function pairFault(
  nodeId: string,
  own: CornerName,
  partner: string,
  where: "upstream" | "downstream",
  axes: readonly number[],
  fix: string,
): PairedCornerFault {
  const axisWord = axes.length === 1 ? "axis" : "axes";
  const other = own === BOX_MIN_ATTR ? BOX_MAX_ATTR : BOX_MIN_ATTR;
  return {
    code: "box-corner-counts-position",
    param: "value",
    nodeId,
    partner,
    message:
      `param "value" writes "${own}" as position() plus an offset on ${axisWord} ${axisList(axes)}, and node ` +
      `${JSON.stringify(partner)} (setAttribute), ${where} of it on the same chain with nothing between them that rewrites ` +
      `P or either corner, writes "${other}" the same way, so together the two corners keep the box's size and move it ` +
      `with P there — the world box at P that corners described before bounds became local — and that counts P twice: ` +
      `${FRAME}, so the point's transform adds P to both corners again and the box lands at twice P. ${fix}.`,
    expected: "corners relative to the point, with no position() term",
  };
}

/**
 * The `box-corner-counts-position` refusals one graph level earns from a
 * box whose corners two setAttribute nodes write: for each point-domain
 * f32 vector write of one corner among `ids`, the nearest write of the
 * other corner upstream along the same chain (see {@link upstreamPartner}
 * for what the chain may cross), judged by exactly the rule setBounds'
 * own corners are. One record per node, each naming the other, upstream
 * node first; empty for a sound level. Validate-only (see above). A chain
 * min -> max -> min gives the middle node two records, one per partner:
 * each pair is a box some node on the chain hands on.
 */
export function pairedCornerFaults(ids: Iterable<string>, view: CornerChainView): PairedCornerFault[] {
  const out: PairedCornerFault[] = [];
  for (const id of ids) {
    const node = view.node(id);
    if (node === undefined) continue;
    const corner = cornerWritten(node);
    if (corner === undefined) continue;
    const otherName = corner === BOX_MIN_ATTR ? BOX_MAX_ATTR : BOX_MIN_ATTR;
    const found = upstreamPartner(view, id, otherName);
    if (found === undefined) continue;
    const partnerId = found.partner;
    const partner = view.node(partnerId)!;
    // The later write reading the box the earlier one wrote is not judged.
    if (readsBox(node.params.value)) continue;
    const later = readParam(node.params.value);
    const earlier = readParam(partner.params.value);
    const axes =
      corner === BOX_MIN_ATTR ? cornerPairAxes(later, earlier) : cornerPairAxes(earlier, later);
    if (axes.length === 0) continue;
    const fix = found.shared ? sharedFix(partnerId, id) : PAIR_FIX;
    out.push(
      pairFault(partnerId, otherName, id, "downstream", axes, fix),
      pairFault(id, corner, partnerId, "upstream", axes, fix),
    );
  }
  return out;
}
