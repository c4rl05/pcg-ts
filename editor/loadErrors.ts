/**
 * A refused graph load, as lines a toast can show.
 *
 * The loader collects every fault of a document into one throw whose
 * `diagnostics` hold a record per fault; its message is those messages
 * joined with newlines. This turns any thrown value into one line per
 * record, capped, so several faults read as a list rather than a run-on.
 *
 * Each line leads with the record's JSON pointer when it has one. The
 * message already names the node, param or pin, but by id — the pointer is
 * what finds the value in the pasted text, and it is the only location a
 * fault outside a node (a graph param, a connection, an output) carries.
 */
import { diagnosticsOf } from "pcg-ts";

/**
 * One line per diagnostic record of `err`, in the order the loader reported
 * them (phase order, then document order): `<path>: <message>`, or the
 * message alone when the record has no path. Past `max` records the rest
 * are folded into a final `and K more`. A value that carries no records —
 * a foreign `Error`, a string — is one line holding its message.
 */
export function loadErrorLines(err: unknown, max = 5): string[] {
  const records = diagnosticsOf(err);
  const cap = Math.max(1, Math.floor(max));
  const lines = records
    .slice(0, cap)
    .map((r) => (r.path !== undefined && r.path !== "" ? `${r.path}: ${r.message}` : r.message));
  if (records.length > cap) lines.push(`and ${records.length - cap} more`);
  return lines;
}
