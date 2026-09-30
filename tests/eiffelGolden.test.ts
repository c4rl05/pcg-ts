/**
 * The eiffel demo's cooked output against a committed golden
 * (tests/eiffel.golden.json): every output `buildEiffel` declares, at each
 * depth below, as its counts and one hash over all its bytes
 * (tests/support/eiffelGolden.ts says exactly what the hash covers).
 *
 * WHAT IT IS FOR. Refactors of demos/eiffel/ — moving a TypeScript rule
 * into graph nodes, splitting a module, reordering how a part is merged —
 * are meant to leave the tower as it was. This is how such a change proves
 * it: the test passes only if every output is byte-identical, and when it
 * is not, the failure names each output that moved and whether its counts
 * changed or only its bytes. Nothing else pins the lift geometry, the cars,
 * the cloth or the works.
 *
 * REGENERATING. When a change to the tower is MEANT, rewrite the golden and
 * commit it with the change:
 *
 *     EIFFEL_GOLDEN=update env -u NODE_ENV npx vitest run tests/eiffelGolden.test.ts
 *
 * In update mode each depth's entry is rewritten from the cook and the test
 * passes. Read the JSON diff before committing it: the outputs it touches
 * should be exactly the ones the change was meant to touch.
 *
 * DEPTHS are the page's, each cooked from its query string exactly as
 * demos/eiffel/main.ts maps it to a `Detail` (`pageDetail` in the support
 * file): `skeleton` (no query: solid web members), `laced` (`?laced`: the
 * gussets appear), `riveted` (`?rivets`, which implies `?laced`: about
 * 1.21 M rivet instances), `rivetsFull` (`?rivets=full`: the built-up
 * uprights' rows as well) and `build` (`?build`: the skeleton plus the
 * erection's `works.*` and the cranes). Each test logs its output count
 * and its cook-plus-hash time; all five stay in however slow the riveted
 * ones are, because a depth left out is a depth a refactor can move
 * unseen. `?bands` and `region` build a different graph, cut per cell,
 * with its own exactness test (tests/eiffelBands.test.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DataCollection } from "pcg-ts";
import { COUNT_FIELDS, type OutputDigest, PAGE_DEPTHS, digestOutput, eiffelDigests, pageDetail } from "./support/eiffelGolden.js";

const GOLDEN_PATH = fileURLToPath(new URL("./eiffel.golden.json", import.meta.url));
const REGENERATE = "EIFFEL_GOLDEN=update env -u NODE_ENV npx vitest run tests/eiffelGolden.test.ts";
const UPDATE = process.env.EIFFEL_GOLDEN === "update";

interface Golden {
  readonly regenerate: string;
  readonly depths: Record<string, Record<string, OutputDigest>>;
}

/** Generous: the riveted depths cook and hash about 1.3 M instances. */
const TIMEOUT = 600_000;

function readGolden(): Golden {
  try {
    return JSON.parse(readFileSync(GOLDEN_PATH, "utf8")) as Golden;
  } catch {
    return { regenerate: REGENERATE, depths: {} };
  }
}

/** Every difference between a recorded depth and a cooked one, one line per output. */
function differences(want: Record<string, OutputDigest>, got: Record<string, OutputDigest>): string[] {
  const lines: string[] = [];
  const names = [...new Set([...Object.keys(want), ...Object.keys(got)])].sort();
  for (const name of names) {
    const w = want[name];
    const g = got[name];
    if (w === undefined) {
      lines.push(`  ${name}: NEW output (not in the golden)`);
      continue;
    }
    if (g === undefined) {
      lines.push(`  ${name}: MISSING (in the golden, not in the cook)`);
      continue;
    }
    const counts = COUNT_FIELDS.filter((f) => w[f] !== g[f]).map((f) => `${f} ${w[f]} -> ${g[f]}`);
    if (counts.length > 0) lines.push(`  ${name}: counts changed (${counts.join(", ")})`);
    else if (w.hash !== g.hash) lines.push(`  ${name}: bytes changed, counts identical (hash ${w.hash} -> ${g.hash})`);
  }
  return lines;
}

describe("eiffel cooked output against the golden", () => {
  it("pageDetail is still main.ts's query -> Detail mapping", () => {
    // main.ts cannot be imported (it builds a page as it loads). The depth
    // is read by depth.ts, which both import; the lines around it are
    // checked here, and fail when the page stops reading it that way.
    const main = readFileSync(fileURLToPath(new URL("../demos/eiffel/main.ts", import.meta.url)), "utf8");
    for (const line of [
      'const BUILD = new URLSearchParams(location.search).has("build");',
      "const DEPTH = pageDepth(location.search);",
      "const { lacedWeb: laced, rivets, fullRivets } = cookedDetail(DEPTH);",
      'const crossPlate = tuned(params, { set: "plateSet", edge: "plateEdge" });',
      "const graph = buildEiffel(1889, { lacedWeb: laced, rivets, fullRivets, crossPlate, build: BUILD });",
    ]) {
      expect(main.includes(line), `demos/eiffel/main.ts no longer reads: ${line}`).toBe(true);
    }
    expect(pageDetail("?rivets")).toEqual({ lacedWeb: true, rivets: true, fullRivets: false, crossPlate: {}, build: false });
    expect(pageDetail("?rivets=full")).toMatchObject({ lacedWeb: true, rivets: true, fullRivets: true });
    expect(pageDetail("?build")).toMatchObject({ lacedWeb: false, rivets: false, build: true });
    // A streamed axis cooks the depth below it whole.
    expect(pageDetail("?bands")).toMatchObject({ lacedWeb: false, rivets: false });
    expect(pageDetail("?laced&rivets=streamed")).toMatchObject({ lacedWeb: true, rivets: false });
  });

  it("hashes a typed array's type, not only its bits: f32 and u32 with equal bytes differ", () => {
    const f32 = new Float32Array([1, 2.5, -3]);
    const u32 = new Uint32Array(f32.buffer.slice(0));
    const item = (channel: Float32Array | Uint32Array) =>
      [{ kind: "instances", tags: new Set<string>(), batches: [{ assetId: "a", count: 3, transforms: new Float32Array(48), attributes: { c: channel } }] }] as unknown as DataCollection;
    expect(digestOutput(item(f32)).hash).toBe(digestOutput(item(new Float32Array(f32))).hash);
    expect(digestOutput(item(u32)).hash).not.toBe(digestOutput(item(f32)).hash);
  });

  for (const depth of PAGE_DEPTHS) {
    it(
      `${depth.name} (${depth.query === "" ? "no query" : depth.query}): every output byte-identical to tests/eiffel.golden.json`,
      async () => {
        const t0 = performance.now();
        const got = await eiffelDigests(pageDetail(depth.query));
        const ms = performance.now() - t0;
        console.info(`eiffelGolden ${depth.name} (${depth.query}): ${Object.keys(got).length} outputs, cook + hash ${(ms / 1000).toFixed(1)} s`);
        expect(Object.keys(got).length).toBeGreaterThan(0);
        if (UPDATE) {
          // Re-read at write time: another depth may have written already.
          const golden = readGolden();
          const depths = { ...golden.depths, [depth.name]: got };
          const sorted: Golden["depths"] = {};
          for (const k of Object.keys(depths).sort()) sorted[k] = depths[k] as Record<string, OutputDigest>;
          writeFileSync(GOLDEN_PATH, `${JSON.stringify({ regenerate: REGENERATE, depths: sorted }, null, 2)}\n`);
          return;
        }
        const want = readGolden().depths[depth.name];
        if (want === undefined) {
          throw new Error(`tests/eiffel.golden.json has no "${depth.name}" depth; regenerate it with: ${REGENERATE}`);
        }
        const lines = differences(want, got);
        if (lines.length > 0) {
          throw new Error(
            `eiffel ${depth.name}: ${lines.length} output(s) differ from tests/eiffel.golden.json:\n${lines.join("\n")}\n` +
              `If the change is meant, regenerate the golden and commit it with the change: ${REGENERATE}`,
          );
        }
      },
      TIMEOUT,
    );
  }
});
