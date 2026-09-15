/**
 * `docs/errors.md` is a fresh render of `DIAGNOSTIC_CODES`, so a code added
 * without regenerating the page fails here, naming the command.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_CODES } from "../index.js";
import { renderErrorCodes } from "./errors.js";

const PAGE = fileURLToPath(new URL("../../docs/errors.md", import.meta.url));

describe("docs/errors.md", () => {
  it("is the committed render of DIAGNOSTIC_CODES (run `npm run build && npm run docs:errors`)", () => {
    expect(readFileSync(PAGE, "utf8").replaceAll("\r\n", "\n")).toBe(renderErrorCodes(DIAGNOSTIC_CODES));
  });

  it("lists every code once, in declaration order", () => {
    const text = renderErrorCodes(DIAGNOSTIC_CODES);
    const rows = [...text.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
    expect(rows).toEqual(Object.keys(DIAGNOSTIC_CODES));
    expect(text).toContain(`${Object.keys(DIAGNOSTIC_CODES).length} codes:`);
  });

  it("keeps a pipe inside a description from ending its cell", () => {
    expect(renderErrorCodes({ "x-y": "a | b" })).toContain("| `x-y` | a \\| b |");
  });
});
