/**
 * `pcg nodes <type>` states whether each input pin is required, in both
 * renderings. Its own file so the catalog suite in `cli.test.ts` is not
 * edited for one field.
 */
import { describe, expect, it } from "vitest";
import { EXIT_OK, runCli } from "./index.js";
import type { CliIo } from "./io.js";

function capture(): { io: CliIo; stdout: () => string } {
  const out: string[] = [];
  return {
    stdout: () => out.join(""),
    io: {
      out: (text) => void out.push(text),
      err: () => undefined,
      readFile: () => {
        throw new Error("no files in this suite");
      },
      writeFile: () => undefined,
    },
  };
}

describe("pcg nodes — required pins", () => {
  it("text spells out required or optional on every input, and neither on outputs", async () => {
    const required = capture();
    expect(await runCli(["nodes", "transformPoints"], required.io)).toBe(EXIT_OK);
    expect(required.stdout()).toContain("inputs:  in (geometry, required)");
    expect(required.stdout()).toContain("outputs: out (geometry)\n");

    const optional = capture();
    expect(await runCli(["nodes", "mergePoints"], optional.io)).toBe(EXIT_OK);
    expect(optional.stdout()).toContain("inputs:  in (geometry, multi, optional)");
  });

  it("--json carries required on every pin", async () => {
    const c = capture();
    expect(await runCli(["nodes", "volumeSample", "--json"], c.io)).toBe(EXIT_OK);
    const info = JSON.parse(c.stdout());
    expect(info.inputs).toEqual([{ name: "in", kind: "geometry", multi: false, required: false }]);
    expect(info.outputs).toEqual([{ name: "out", kind: "geometry", multi: false, required: false }]);

    const t = capture();
    expect(await runCli(["nodes", "transformPoints", "--json"], t.io)).toBe(EXIT_OK);
    expect(JSON.parse(t.stdout()).inputs).toEqual([
      { name: "in", kind: "geometry", multi: false, required: true },
    ]);
  });
});
