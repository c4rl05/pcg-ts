/**
 * The CLI's whole contact with the outside world. Everything else in
 * `src/cli` is pure: it takes an argv and a `CliIo` and returns an exit
 * code, which is what makes the commands testable in-process without
 * spawning a shell or touching the disk.
 */
export interface CliIo {
  /** Write to standard output. Newlines are the caller's business. */
  out(text: string): void;
  /** Write to standard error. */
  err(text: string): void;
  /** Read a UTF-8 text file; throws when it cannot be read. */
  readFile(path: string): string;
  /** Write a UTF-8 text file, creating parent directories. */
  writeFile(path: string, data: string): void;
  /**
   * Write a binary file, creating parent directories. Optional so an io
   * written before binary output existed still type-checks; a command that
   * needs it (`render --out frame.png`) refuses with a named error when it
   * is missing rather than mangling the bytes through `writeFile`.
   */
  writeBytes?(path: string, data: Uint8Array): void;
  /**
   * Where a file the package SHIPS lives — `rel` is package-relative, e.g.
   * `docs/graphs.json` or `graphs/basics-scatter-in-bounds.json` — as a
   * path {@link readFile} can open and a person can paste into the next
   * `pcg` command run from the same directory.
   *
   * The Node binding answers relative to the working directory when the
   * package sits inside it (`graphs/x.json` in this repository,
   * `node_modules/pcg-ts/graphs/x.json` from a consumer's project root) and
   * absolute otherwise, always with `/` separators, so the same install
   * prints the same text on every platform. It does NOT check that the file
   * exists: reading it is the caller's move, and a failed read is the
   * caller's to explain.
   *
   * Optional, like {@link writeBytes}, so an io written before shipped
   * files were read still type-checks. `undefined` — the member missing, or
   * returning it because the package root could not be found — means "not
   * available here", and every caller degrades to a note instead of failing
   * the command.
   */
  packagePath?(rel: string): string | undefined;
}
