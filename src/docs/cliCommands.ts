/**
 * The `pcg` command names, for the generators that render text naming CLI
 * commands (`scripts/gen-llms-index.mjs`). Read from `COMMANDS` itself, so an
 * index cannot advertise a command the build does not have.
 */
import { COMMANDS } from "../cli/commands.js";

/** Every `pcg` subcommand name, in help order. */
export function cliCommandNames(): string[] {
  return COMMANDS.map((c) => c.spec.name);
}
