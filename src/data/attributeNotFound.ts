/**
 * The missing-attribute fault, as a typed error with a diagnostic record.
 *
 * One class for every reader that looks an attribute up by name on one
 * domain — the three field readers (`attribute`, `attributeIs`,
 * `byAttribute`) and the nodes that take an attribute name as a param —
 * so an agent gets the same facts in the same shape whichever of them it
 * tripped: what was asked for, on which domain, what that domain does
 * carry, what was probably meant, and where else in the geometry the name
 * already lives.
 *
 * The root import publishes the class only. {@link requireAttributeOn}
 * and {@link attributeNotFound} are library plumbing, imported by path.
 */
import { type Diagnostic, closestNames, errorDiagnostics } from "../diagnostics/index.js";
import type { Attribute } from "./attribute.js";
import type { Geometry } from "./geometry.js";
import { DOMAINS, type Domain } from "./types.js";

/**
 * What the "it exists on another domain" clause tells the author to do.
 *
 * - `"promote"` (the default): the reader reads ONE domain it cannot be
 *   pointed elsewhere, so the fix is to move the column —
 *   `promoteAttribute (name, from, to)`. Every field reads the domain it
 *   lands on, which is why this is the default.
 * - `{ domainParam }`: the reader has a param choosing the domain, so the
 *   fix is to set it (`attributeReduce`'s `domain`, say).
 * - `"none"`: no clause; the caller supplies its own through `suffix`.
 */
export type OtherDomainHint = "promote" | "none" | { readonly domainParam: string };

/** How {@link attributeNotFound} words and records one fault. */
export interface AttributeNotFoundOptions {
  /** Text the message opens with, verbatim — `"pathScan: "`, say. */
  readonly prefix?: string;
  /** The param the missing name came from; set on the record. */
  readonly param?: string;
  /**
   * Who is reading, for the promote clause's "… cannot read a detail
   * attribute". Defaults to `a <domain> field`.
   */
  readonly reader?: string;
  /** Where the lookup happened, inserted after "not found" (`"the source geometry"`). */
  readonly on?: string;
  /** See {@link OtherDomainHint}. */
  readonly otherDomain?: OtherDomainHint;
  /** Text appended to the message verbatim, after every other clause. */
  readonly suffix?: string;
  /** The input pin carrying the geometry that was searched; set on the record. */
  readonly pin?: string;
  /**
   * False when a `fix` would not be safe for this reader even where the
   * facts alone suggest one — a param naming SEVERAL attributes, say,
   * where moving the domain for one breaks another. Defaults to true.
   */
  readonly fixable?: boolean;
}

/** The facts and wording an {@link AttributeNotFoundError} is built from. */
interface AttributeNotFoundInit extends AttributeNotFoundOptions {
  readonly attribute: string;
  readonly domain: Domain;
  readonly available: readonly string[];
  readonly foundOn: readonly Domain[];
  readonly didYouMean: readonly string[];
  /** The column on the first `foundOn` domain is a string column. */
  readonly stringColumn?: boolean;
}

function quoted(names: readonly string[]): string {
  const q = names.map((n) => JSON.stringify(n));
  return q.length <= 1 ? (q[0] ?? "") : `${q.slice(0, -1).join(", ")} or ${q[q.length - 1]}`;
}

function spelledDomains(domains: readonly string[]): string {
  return domains.length <= 1
    ? (domains[0] ?? "")
    : `${domains.slice(0, -1).join(", ")} and ${domains[domains.length - 1]}`;
}

/**
 * The promote that moves the column. Mode "first" is named whenever it is
 * the only right one to name: a STRING column accepts no other (the node's
 * default, "average", throws on it), and a DETAIL column broadcasts the
 * same one value under every mode, so "first" costs nothing there and
 * keeps the call valid whatever the column's type.
 */
function promoteCall(init: AttributeNotFoundInit, from: Domain): string {
  const mode = from === "detail" || init.stringColumn === true ? `, mode "first"` : "";
  return (
    `promoteAttribute (name ${JSON.stringify(init.attribute)}, from "${from}", ` +
    `to "${init.domain}"${mode})`
  );
}

/** The message clause and mechanical fix for a name found on other domains. */
function otherDomainClause(init: AttributeNotFoundInit): { clause: string; fix?: string } {
  const { attribute, domain, foundOn } = init;
  const hint = init.otherDomain ?? "promote";
  if (foundOn.length === 0 || hint === "none") return { clause: "" };
  const fixable = init.fixable !== false;
  const where =
    `${JSON.stringify(attribute)} exists on the ${spelledDomains(foundOn)} ` +
    `domain${foundOn.length > 1 ? "s" : ""}`;
  if (hint === "promote") {
    const from = foundOn[0] as Domain;
    const reader = init.reader ?? `a ${domain} field`;
    const kinds = foundOn.length > 1 ? "another domain's attribute" : `a ${from} attribute`;
    const call = promoteCall(init, from);
    const target = init.pin === undefined ? "" : ` on the geometry reaching input pin "${init.pin}"`;
    return {
      clause: `${where} — ${reader} cannot read ${kinds}; promote it first with ${call}`,
      // Only the detail broadcast is safe to apply blind: every element
      // receives the one value, whatever the mode. Any other promote
      // aggregates, which is a choice about the data and not a fix.
      ...(fixable && foundOn.length === 1 && from === "detail"
        ? { fix: `insert ${call}${target} before this read` }
        : {}),
    };
  }
  const values = foundOn.map((d) => `"${d}"`);
  const param = JSON.stringify(hint.domainParam);
  return {
    clause: `${where} — set param ${param} to ${values.length > 1 ? `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}` : values[0]}`,
    ...(fixable && foundOn.length === 1 ? { fix: `set param ${param} to ${values[0]}` } : {}),
  };
}

/**
 * An attribute looked up by name on one domain is not there.
 *
 * Message shape, clauses joined by `"; "`, each omitted when it does not
 * apply:
 *
 * ```text
 * <prefix><domain> attribute "<name>" not found[ on <on>]
 *   ; [did you mean "<a>", "<b>" or "<c>"? ]available <domain> attributes:
 *     <names in insertion order, or (none)>
 *   ; "<name>" exists on the <d1> and <d2> domains — <reader> cannot read
 *     another domain's attribute; promote it first with promoteAttribute
 *     (name "<name>", from "<d1>", to "<domain>"[, mode "first"])
 * <suffix>
 * ```
 *
 * e.g. `point attribute "height" not found; available point attributes:
 * P, seed; "height" exists on the detail domain — a point field cannot
 * read a detail attribute; promote it first with promoteAttribute (name
 * "height", from "detail", to "point", mode "first")`.
 *
 * A reader with a domain param says `set param "domain" to "detail"`
 * instead of naming the promote (see {@link OtherDomainHint}). `foundOn`
 * lists other domains in canonical order (point, vertex, primitive,
 * detail) and the promote clause names the first, with mode "first" when
 * that column is a string or lives on detail (see `promoteCall`).
 *
 * The attribute's name is `attribute`, not `name`: `name` is the error
 * class's own, and the worker protocol and `diagnosticsOf` classify by it.
 *
 * The one `diagnostics` record is code `attribute-not-found` carrying
 * `got` (the missing name), `valid` (= `available`), `didYouMean` when
 * non-empty, `param` and `pin` when the reader knows them, and `fix` only
 * when the remedy is fully determined and safe: a single other domain
 * named by a domain param, or a detail column a promote broadcasts
 * unchanged — and never when the reader opts out (`fixable: false`).
 */
export class AttributeNotFoundError extends Error {
  /** The attribute name that was asked for. */
  readonly attribute: string;
  /** The domain it was looked up on. */
  readonly domain: Domain;
  /** Names that domain does carry, in insertion order. */
  readonly available: readonly string[];
  /** Other domains of the same geometry carrying the name, in canonical order. */
  readonly foundOn: readonly Domain[];
  /** The nearest available names, nearest first; empty when none is close. */
  readonly didYouMean: readonly string[];
  /** The param the name came from, when the reader knows it. */
  readonly param: string | undefined;
  /** This fault as one `attribute-not-found` record. */
  readonly diagnostics: readonly Diagnostic[];
  /** How the message was worded, so {@link withPrefix} can re-word it. */
  readonly #init: AttributeNotFoundInit;

  constructor(init: AttributeNotFoundInit, options?: ErrorOptions) {
    const available = Object.freeze([...init.available]);
    const foundOn = Object.freeze([...init.foundOn]);
    const didYouMean = Object.freeze([...init.didYouMean]);
    const frozen: AttributeNotFoundInit = { ...init, available, foundOn, didYouMean };
    const { clause, fix } = otherDomainClause(frozen);
    // The suggestion leads the list it was drawn from, the layout every
    // did-you-mean in the library uses: an agent reads the likely fix before
    // the enumeration, not after it.
    const clauses = [
      `${init.prefix ?? ""}${init.domain} attribute ${JSON.stringify(init.attribute)} not found` +
        (init.on === undefined ? "" : ` on ${init.on}`),
      (didYouMean.length > 0 ? `did you mean ${quoted(didYouMean)}? ` : "") +
        `available ${init.domain} attributes: ${available.join(", ") || "(none)"}`,
    ];
    if (clause !== "") clauses.push(clause);
    const message = clauses.join("; ") + (init.suffix ?? "");
    super(message, options);
    this.name = "AttributeNotFoundError";
    this.attribute = init.attribute;
    this.domain = init.domain;
    this.available = available;
    this.foundOn = foundOn;
    this.didYouMean = didYouMean;
    this.param = init.param;
    this.#init = frozen;
    const record: Diagnostic = {
      code: "attribute-not-found",
      severity: "error",
      message,
      got: init.attribute,
      valid: available,
      ...(init.pin === undefined ? {} : { pin: init.pin }),
      ...(init.param === undefined ? {} : { param: init.param }),
      ...(didYouMean.length > 0 ? { didYouMean } : {}),
      ...(fix === undefined ? {} : { fix }),
    };
    this.diagnostics = errorDiagnostics(message, [record], "attribute-not-found");
  }

  /**
   * The same fault, its message opened by `prefix` (before any prefix it
   * already had) and its record naming `param`. How a node's param
   * resolve names itself on a field reader's error, which knows neither.
   * The original error is the new one's `cause`.
   */
  withPrefix(prefix: string, param?: string): AttributeNotFoundError {
    return new AttributeNotFoundError(
      {
        ...this.#init,
        prefix: prefix + (this.#init.prefix ?? ""),
        ...(param === undefined ? {} : { param }),
      },
      { cause: this },
    );
  }
}

/**
 * The error for `name` missing from `geo`'s `domain`, with the domain's
 * names, the near misses among them and the other domains carrying it all
 * read off the geometry now. The caller throws it.
 */
export function attributeNotFound(
  geo: Geometry,
  domain: Domain,
  name: string,
  options: AttributeNotFoundOptions = {},
): AttributeNotFoundError {
  const available = geo.attrs[domain].names();
  const foundOn = DOMAINS.filter((d) => d !== domain && geo.attrs[d].has(name));
  const first = foundOn[0];
  return new AttributeNotFoundError({
    ...options,
    attribute: name,
    domain,
    available,
    foundOn,
    didYouMean: closestNames(name, available, 3),
    stringColumn: first !== undefined && geo.attrs[first].get(name)?.type === "string",
  });
}

/**
 * `geo.attrs[domain].get(name)`, throwing an {@link AttributeNotFoundError}
 * when it is absent. `AttributeSet.require` stays the terse form for
 * callers holding a set rather than a geometry.
 */
export function requireAttributeOn(
  geo: Geometry,
  domain: Domain,
  name: string,
  options?: AttributeNotFoundOptions,
): Attribute {
  const attr = geo.attrs[domain].get(name);
  if (attr === undefined) throw attributeNotFound(geo, domain, name, options);
  return attr;
}
