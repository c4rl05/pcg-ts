/**
 * The editor keeps a graph's `role: "asset"` outputs as asset outputs.
 *
 * The controller rebuilds its live graph by hand on import rather than
 * through `deserializeGraph`, and its declared outputs come from one
 * place — `reconcileOutputs` — so a role the import dropped would vanish
 * twice, silently: the page would draw the mesh as a box at the origin,
 * and the export would hand back a graph that no longer supplies it.
 *
 * Lives in `tests/` for the reason `editorKnobs.test.ts` gives: the
 * browser pages sit outside vitest's `src/**` include.
 */
import { describe, expect, it } from "vitest";
import type { DataItem, SerializedGraph } from "pcg-ts";
import { EditorController, type RenderInfo } from "../editor/controller.js";

/** A box mesh supplied as asset "brick", and a grid spawning "brick". */
function graphText(): string {
  return JSON.stringify({
    formatVersion: 1,
    seed: 3,
    nodes: [
      { id: "grid", type: "pointGrid", params: { countX: 2, countZ: 2 } },
      { id: "spawn", type: "spawnInstances", params: { assetId: "brick" } },
      { id: "brickMesh", type: "meshPrimitive", params: { shape: "box" } },
    ],
    connections: [{ from: ["grid", "out"], to: ["spawn", "in"] }],
    outputs: [
      { id: "spawn", pin: "instances", name: "bricks" },
      { id: "brickMesh", pin: "out", name: "brick", role: "asset" },
    ],
  });
}

/** A controller whose next render resolves the returned promise. */
function withRender(): {
  c: EditorController;
  next: () => Promise<{ items: readonly DataItem[]; info: RenderInfo }>;
} {
  let resolve: ((r: { items: readonly DataItem[]; info: RenderInfo }) => void) | undefined;
  const c = new EditorController({
    render: (items, info) => resolve?.({ items, info }),
    status: () => {},
  });
  return {
    c,
    next: () =>
      new Promise((r) => {
        resolve = r;
      }),
  };
}

describe("asset outputs in the editor controller", () => {
  it("keep their role through import, reconcile and export", () => {
    const { c } = withRender();
    expect(c.importText(graphText())).not.toHaveProperty("error");
    const out = JSON.parse(c.exportText()) as SerializedGraph;
    const brick = out.outputs?.find((o) => o.name === "brick");
    expect(brick).toEqual({ id: "brickMesh", pin: "out", name: "brick", role: "asset" });
    // A scene output stays role-free, so an export without assets is unchanged.
    expect(out.outputs?.find((o) => o.name === "bricks")).not.toHaveProperty("role");
  });

  it("keep their role across a structural edit, which re-runs reconcile", () => {
    const { c } = withRender();
    expect(c.importText(graphText())).not.toHaveProperty("error");
    // Adding a node declares its unconnected pins by the auto policy and
    // must leave the file's asset declaration alone.
    expect(c.addNode("extra", "pointGrid")).not.toHaveProperty("error");
    expect(c.deleteNode("extra")).toBeNull();
    const out = JSON.parse(c.exportText()) as SerializedGraph;
    expect(out.outputs?.find((o) => o.name === "brick")?.role).toBe("asset");
  });

  it("names the asset outputs in RenderInfo, with their items still delivered", async () => {
    const { c, next } = withRender();
    const rendered = next();
    expect(c.importText(graphText())).not.toHaveProperty("error");
    const { items, info } = await rendered;
    expect([...info.assetOutputs]).toEqual(["brick"]);
    // The full declaration rides along, so a refusal can name node and pin.
    expect(info.assetDecls).toEqual([{ name: "brick", id: "brickMesh", pin: "out", role: "asset" }]);
    // The mesh item arrives tagged with its owner, so a host can split it off.
    const owners = new Set(info.outputs);
    expect(owners.has("brick")).toBe(true);
    expect(owners.has("bricks")).toBe(true);
    const meshIndex = info.outputs.indexOf("brick");
    expect(items[meshIndex].kind).toBe("geometry");
  });

  it("reports no asset outputs for a graph that declares none", async () => {
    const { c, next } = withRender();
    const rendered = next();
    const plain = JSON.parse(graphText()) as { outputs: { role?: string }[] };
    for (const o of plain.outputs) delete o.role;
    expect(c.importText(JSON.stringify(plain))).not.toHaveProperty("error");
    const { info } = await rendered;
    expect(info.assetOutputs.size).toBe(0);
    expect(JSON.stringify(JSON.parse(c.exportText()).outputs)).not.toContain("role");
  });
});

describe("reconcile keeps every declaration the file made", () => {
  it("keeps an asset output whose name is another pin's auto-policy name", () => {
    const g = JSON.parse(graphText()) as {
      nodes: unknown[];
      outputs: { id: string; pin: string; name: string; role?: string }[];
    };
    // `other.out` is unconnected, so the auto policy wants the name
    // "other.out" for it — the very name the file gave the brick mesh.
    g.nodes.push({ id: "other", type: "pointGrid", params: { countX: 2, countZ: 2 } });
    g.outputs = g.outputs.map((o) => (o.name === "brick" ? { ...o, name: "other.out" } : o));
    const c = new EditorController({ render: () => {}, status: () => {} });
    expect(c.importText(JSON.stringify(g))).not.toHaveProperty("error");
    const out = (JSON.parse(c.exportText()) as SerializedGraph).outputs ?? [];
    expect(out.find((o) => o.name === "other.out")).toEqual({
      id: "brickMesh",
      pin: "out",
      name: "other.out",
      role: "asset",
    });
  });

  it("keeps two declarations of one pin, an asset and a scene output", () => {
    const g = JSON.parse(graphText()) as { outputs: { id: string; pin: string; name: string }[] };
    g.outputs.push({ id: "brickMesh", pin: "out", name: "brickShown" });
    const c = new EditorController({ render: () => {}, status: () => {} });
    expect(c.importText(JSON.stringify(g))).not.toHaveProperty("error");
    const out = (JSON.parse(c.exportText()) as SerializedGraph).outputs ?? [];
    expect(out.find((o) => o.name === "brick")?.role).toBe("asset");
    expect(out.find((o) => o.name === "brickShown")).toEqual({
      id: "brickMesh",
      pin: "out",
      name: "brickShown",
    });
  });
});
