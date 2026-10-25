/**
 * Every registered node type is one command away from a working example:
 * `pcg nodes <type>` and `docs/nodes.md` point at corpus graphs, and
 * that promise is only as good as the corpus covering the registry. This
 * holds the corpus to it, so registering a node type without a graph that
 * uses it fails here rather than shipping a catalog entry whose examples
 * section reads "(0)".
 *
 * Primitives are deliberately NOT gated: many have no corpus graph and
 * each already carries a `pcg run <name>` line, which cooks it with no
 * graph at all.
 */
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "../src/primitives/index.js";
import { listNodeTypes } from "../src/index.js";
import { describeExample, loadGraphs } from "../src/docs/graphIndex.js";

/**
 * Types no corpus graph CAN use, each with the reason. Keep it that short:
 * an entry here is a node type whose catalog entry has no example.
 */
const CANNOT_APPEAR: Readonly<Record<string, string>> = {
  // Its `items` param holds live DataItems, which never serialize, so a
  // graph file cannot carry one with anything in it; a host sets the items
  // in code (`pcg run --in` synthesizes it for the same reason).
  dataInput: "items never serialize",
  // TEMPORARY, and not a "cannot": boxesToMesh landed while the corpus
  // graphs that hand-build its tail (examples-facade, examples-floorplan,
  // basics-split-box, basics-apply-rules) were being rewritten elsewhere,
  // so this commit could not touch them. The test below fails the moment a
  // graph uses it, which is when this entry goes.
  boxesToMesh: "pending corpus adoption (the cell-to-mesh tails in facade, floorplan, split-box, apply-rules)",
};

const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("corpus covers the node registry", () => {
  const corpus = loadGraphs(ROOT).map(describeExample);
  const used = new Set(corpus.flatMap((e) => e.nodeTypes));

  it("every registered node type except the allowlist appears in at least one corpus graph", () => {
    const missing = listNodeTypes()
      .map((t) => t.type)
      .filter((type) => !used.has(type) && !(type in CANNOT_APPEAR))
      .sort();
    expect(
      missing,
      `node types no graph under graphs/ uses — add a basics- graph that teaches each: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("the allowlist names only registered types that really are absent", () => {
    const registered = new Set(listNodeTypes().map((t) => t.type));
    for (const type of Object.keys(CANNOT_APPEAR)) {
      expect(registered.has(type), `${type} is allowlisted but not registered`).toBe(true);
      expect(used.has(type), `${type} is allowlisted but a corpus graph uses it — drop the entry`).toBe(false);
    }
  });
});
