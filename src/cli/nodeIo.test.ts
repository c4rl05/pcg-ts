/**
 * `makeNodeIo().packagePath`: finding the package root by walking up from
 * the module's own URL, and printing a shipped file's path relative to the
 * working directory when the package is inside it.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { displayPackagePath, findPackageRoot, makeNodeIo } from "./nodeIo.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");

describe("findPackageRoot", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pcg-nodeio-"));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("finds this repository's root from src/cli", () => {
    expect(findPackageRoot(fileURLToPath(new URL(".", import.meta.url)))).toBe(ROOT);
  });

  it("walks past a package.json with another name, and stops at the one named pcg-ts", () => {
    const pkg = join(scratch, "consumer", "node_modules", "pcg-ts");
    const deep = join(pkg, "dist", "chunks");
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(scratch, "consumer", "package.json"), JSON.stringify({ name: "consumer" }));
    writeFileSync(join(pkg, "package.json"), JSON.stringify({ name: "pcg-ts" }));
    writeFileSync(join(pkg, "dist", "package.json"), "{ not json");
    expect(findPackageRoot(deep)).toBe(pkg);
  });

  it("answers undefined when no ancestor is the package", () => {
    const lone = join(scratch, "lone", "a");
    mkdirSync(lone, { recursive: true });
    writeFileSync(join(scratch, "lone", "package.json"), JSON.stringify({ name: "other" }));
    // The temp dir's ancestors are the OS's, none of them named pcg-ts.
    expect(findPackageRoot(lone)).toBeUndefined();
  });
});

describe("displayPackagePath", () => {
  it("is relative to the working directory when the package is inside it", () => {
    const project = join(tmpdir(), "proj");
    const pkg = join(project, "node_modules", "pcg-ts");
    expect(displayPackagePath(pkg, "graphs/x.json", project)).toBe("node_modules/pcg-ts/graphs/x.json");
    expect(displayPackagePath(pkg, "graphs/x.json", pkg)).toBe("graphs/x.json");
  });

  it("is absolute, with / separators, when reaching it would climb out of the working directory", () => {
    const pkg = join(tmpdir(), "proj", "node_modules", "pcg-ts");
    const elsewhere = join(tmpdir(), "somewhere-else");
    const printed = displayPackagePath(pkg, "graphs/x.json", elsewhere);
    expect(printed).toBe(join(pkg, "graphs", "x.json").split(/[\\/]/).join("/"));
    expect(printed).not.toContain("\\");
  });
});

describe("makeNodeIo().packagePath", () => {
  it("names the shipped corpus index as a path readFile opens", () => {
    const io = makeNodeIo();
    const path = io.packagePath?.("docs/graphs.json");
    expect(path).toBeDefined();
    expect(existsSync(path as string)).toBe(true);
    expect(JSON.parse(io.readFile(path as string))).toBeInstanceOf(Array);
  });
});
