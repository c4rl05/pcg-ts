// `ctx.lib` for task checks: the scorer's own measurement code. A check
// (public or held-out) reaches everything through this object and imports
// nothing by relative path, so a task directory can live in another repo.

export * from "./geometry.mjs";
export * from "./items.mjs";
export { digestOutputs, feedItem } from "./digest.mjs";

/** A check result: `{ pass, value?, detail? }`. */
export function result(pass, value, detail) {
  const r = { pass: Boolean(pass) };
  if (value !== undefined) r.value = value;
  if (detail !== undefined) r.detail = detail;
  return r;
}

/** Round for reporting, so a result line does not carry 17 digits. */
export function round(x, digits = 4) {
  if (typeof x !== "number" || !Number.isFinite(x)) return x;
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}
