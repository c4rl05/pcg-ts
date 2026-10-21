/**
 * Graph-supplied asset meshes in the CLI: an output declared
 * `role: "asset"` is the mesh for the asset id of its name, so `render`
 * draws that id's instances AS the mesh (in their per-instance colours)
 * and never draws the asset output itself at the origin, `--output <it>`
 * draws the mesh alone, `cook` reports the meshes, `assets` marks the ids
 * the graph supplies, and `validate` shows the role. A graph with no such
 * output keeps every report it had: those keys and columns are absent.
 */
import { describe, expect, it } from "vitest";
import "../primitives/index.js";
import { type DataCollection, collectGraphAssets, cook, deserializeGraph } from "../index.js";
import { EXIT_FAILURE, EXIT_OK, runCli } from "./index.js";
import type { CliIo } from "./io.js";
import { buildScene, localMesh, surfaceYAt } from "./raster/scene.js";
import { renderPng } from "./renderPng.js";

/**
 * Two instances of "box" at x = 10 and x = 20, scale [2, 1, 3], tinted
 * red, and the box itself: a unit cube centred on its pivot.
 */
function fixture(opts: { role?: boolean; colors?: boolean; extra?: unknown[]; extraOutputs?: { id: string; pin: string; name: string; role?: string }[] } = {}) {
  const role = opts.role !== false;
  return {
    formatVersion: 1,
    seed: 7,
    nodes: [
      { id: "pts", type: "pointList", params: { positions: [10, 0, 0, 20, 0, 0] } },
      {
        id: "sc",
        type: "setAttribute",
        params: { name: "scale", domain: "point", type: "f32", tupleSize: 3, value: { fn: "vec", args: [2, 1, 3] } },
      },
      {
        id: "tint",
        type: "setAttribute",
        params: { name: "tint", domain: "point", type: "f32", tupleSize: 3, value: { fn: "vec", args: [1, 0, 0] } },
      },
      {
        id: "spawn",
        type: "spawnInstances",
        params: { assetId: "box", ...(opts.colors === false ? {} : { colorAttr: "tint" }) },
      },
      { id: "boxMesh", type: "meshPrimitive", params: { shape: "box", size: [1, 1, 1], center: [0, 0, 0] } },
      ...(opts.extra ?? []),
    ],
    connections: [
      { from: ["pts", "out"], to: ["sc", "in"] },
      { from: ["sc", "out"], to: ["tint", "in"] },
      { from: ["tint", "out"], to: ["spawn", "in"] },
    ],
    outputs: [
      { id: "spawn", pin: "instances", name: "inst" },
      { id: "boxMesh", pin: "out", name: "box", ...(role ? { role: "asset" } : {}) },
      ...(opts.extraOutputs ?? []),
    ],
  };
}

const PATH = "/g/box.json";

function fakeIo(graph: unknown): { io: CliIo; stdout(): string; stderr(): string; bytes: Record<string, Uint8Array> } {
  const out: string[] = [];
  const err: string[] = [];
  const bytes: Record<string, Uint8Array> = {};
  const text = JSON.stringify(graph);
  const io: CliIo = {
    out: (t) => void out.push(t),
    err: (t) => void err.push(t),
    readFile: (path) => {
      if (path === PATH) return text;
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    },
    writeFile: () => undefined,
    writeBytes: (path, data) => void (bytes[path] = data),
  };
  return { io, stdout: () => out.join(""), stderr: () => err.join(""), bytes };
}

async function json(graph: unknown, argv: readonly string[]): Promise<Record<string, any>> {
  const f = fakeIo(graph);
  const code = await runCli([...argv, "--json"], f.io);
  expect(f.stderr()).toBe("");
  expect(code).toBe(EXIT_OK);
  return JSON.parse(f.stdout());
}

async function text(graph: unknown, argv: readonly string[]): Promise<string> {
  const f = fakeIo(graph);
  expect(await runCli(argv, f.io)).toBe(EXIT_OK);
  return f.stdout();
}

const PNG = ["render", PATH, "--out", "/o.png", "--size", "320x240"];

/** The cooked fixture's instance collection and supplied meshes, for the scene-level checks. */
async function cooked(opts: Parameters<typeof fixture>[0] = {}): Promise<{
  collection: DataCollection;
  meshes: ReturnType<typeof collectGraphAssets>;
}> {
  const graph = deserializeGraph(fixture(opts));
  const result = await cook(graph);
  return {
    collection: result.outputs.inst,
    meshes: collectGraphAssets(graph.describe().outputs, result.outputs),
  };
}

describe("render --out x.png with a graph-supplied mesh", () => {
  it("draws the instances as the mesh, through scale, and leaves the asset output out of the picture", async () => {
    const r = await json(fixture(), PNG);
    // Two boxes 2 x 1 x 3 about x = 10 and x = 20. No unit box at the
    // origin: the asset output is the mesh, not content.
    expect(r.framing.bounds).toEqual({ min: [9, -0.5, -1.5], max: [21, 0.5, 1.5] });
    expect(r.target).toBe('output "inst"');
    expect(r.counts).toMatchObject({
      triangles: 0,
      instances: 2,
      instancesTotal: 2,
      meshInstances: 2,
      meshInstancesTotal: 2,
      meshTriangles: 24,
      meshTrianglesTotal: 24,
    });
    expect(r.meshAssets).toEqual([
      { id: "box", triangles: 12, instancesTotal: 2, instances: 2, colors: "per-instance" },
    ]);
    expect(r.legend).toEqual([{ kind: "asset", name: "box", color: expect.any(String), perInstanceColors: true }]);
    expect(r.drawing.instances).toMatch(/asset id "box", whose mesh the graph supplies/);
  });

  it("says so in the text report", async () => {
    const t = await text(fixture(), PNG);
    expect(t).toContain("2 of 2 instances: 2 of 2 as graph-supplied meshes (24 triangles), 0 of 0 as pyramid proxies");
    expect(t).toContain("graph-supplied meshes: box (12 triangles, 2 of 2 instances, per-instance colours)");
    expect(t).toContain('asset "box" #4e79a7 (instances in their own colours)');
  });

  it("is byte-identical run to run, and the role is what changes the picture", async () => {
    const a = await json(fixture(), PNG);
    const b = await json(fixture(), PNG);
    expect(b.pixelHash).toBe(a.pixelHash);
    const plain = await json(fixture({ role: false }), PNG);
    expect(plain.pixelHash).not.toBe(a.pixelHash);
    // Without the role: pyramids, plus the box drawn as content at the origin.
    expect(plain.meshAssets).toBeUndefined();
    expect(plain.counts.meshInstances).toBeUndefined();
    expect(plain.counts.triangles).toBe(12);
    expect(plain.framing.bounds.min[0]).toBe(-0.5);
    expect(plain.drawing.instances).toMatch(/^instances are upright square-pyramid proxies/);
    expect(plain.legend.some((l: { perInstanceColors?: boolean }) => l.perInstanceColors !== undefined)).toBe(false);
  });

  it("--output <the asset> draws the mesh itself, as content", async () => {
    const r = await json(fixture(), [...PNG, "--output", "box"]);
    expect(r.target).toBe('output "box"');
    expect(r.counts.triangles).toBe(12);
    expect(r.counts.instancesTotal).toBe(0);
    expect(r.meshAssets).toBeUndefined();
    expect(r.framing.bounds).toEqual({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] });
  });

  it("--output <a scene output> and --node both cook the meshes alongside", async () => {
    const byOutput = await json(fixture(), [...PNG, "--output", "inst"]);
    const byNode = await json(fixture(), [...PNG, "--node", "spawn"]);
    const whole = await json(fixture(), PNG);
    for (const r of [byOutput, byNode]) {
      expect(r.meshAssets).toEqual(whole.meshAssets);
      expect(r.framing.bounds).toEqual(whole.framing.bounds);
    }
    expect(byOutput.pixelHash).toBe(whole.pixelHash);
  });

  it("a graph whose every output is an asset draws them as content", async () => {
    const g = fixture();
    g.outputs = g.outputs.filter((o) => o.name === "box");
    // The spawner now feeds nothing declared, which is a warning on stderr.
    const f = fakeIo(g);
    expect(await runCli([...PNG, "--json"], f.io)).toBe(EXIT_OK);
    const r = JSON.parse(f.stdout());
    expect(r.counts.triangles).toBe(12);
    expect(r.meshAssets).toBeUndefined();
  });

  it("refuses a malformed asset output with its record", async () => {
    const g = fixture({
      extra: [{ id: "dots", type: "pointList", params: { positions: [0, 0, 0, 1, 0, 0] } }],
      extraOutputs: [{ id: "dots", pin: "out", name: "dots", role: "asset" }],
    });
    const f = fakeIo(g);
    expect(await runCli([...PNG, "--json"], f.io)).toBe(EXIT_FAILURE);
    const report = JSON.parse(f.stdout());
    expect(report.errors[0]).toMatchObject({ code: "invalid-asset-output", nodeId: "dots", pin: "out" });
    expect(report.errors[0].message).toMatch(/asset output "dots" .* carries 0 faces/);
  });

  it("keeps the SVG free of the asset output too", async () => {
    const r = await json(fixture(), ["render", PATH, "--out", "/o.svg"]);
    expect(r.primitivesTotal).toBe(0);
    expect(r.instancesTotal).toBe(2);
  });
});

describe("buildScene with meshes", () => {
  it("puts the mesh's world corners where T·R·S puts them, in the instance's colour, off the surface", async () => {
    const { collection, meshes } = await cooked();
    const scene = buildScene(collection, { maxPoints: 1000, maxPrimitives: 1000, meshes });
    expect(scene.surfaceFaces).toBe(0);
    expect(scene.faceCount).toBe(24);
    // surfaceYAt ignores them: standing on a brick is not eye level.
    expect(surfaceYAt(scene, 10, 0, -7)).toBe(-7);
    const corners = new Set<string>();
    for (let t = 0; t < 12; t++) {
      for (let v = 0; v < 3; v++) {
        const o = t * 9 + v * 3;
        corners.add(`${scene.faces[o]},${scene.faces[o + 1]},${scene.faces[o + 2]}`);
      }
    }
    const expected = new Set<string>();
    for (const x of [9, 11]) for (const y of [-0.5, 0.5]) for (const z of [-1.5, 1.5]) expected.add(`${x},${y},${z}`);
    expect(corners).toEqual(expected);
    // Red tint: every face shaded from (255, 0, 0).
    for (let t = 0; t < scene.faceCount; t++) {
      expect(scene.faceColors[t * 3]).toBeGreaterThan(0);
      expect(scene.faceColors[t * 3 + 1]).toBe(0);
      expect(scene.faceColors[t * 3 + 2]).toBe(0);
    }
    // One marker per instance, at its 4x4 times (0, local top, 0).
    expect([...scene.markers]).toEqual([10, 0.5, 0, 20, 0.5, 0]);
  });

  it("falls back to the id's legend colour when the batch carries none", async () => {
    const { collection, meshes } = await cooked({ colors: false });
    const scene = buildScene(collection, { maxPoints: 1000, maxPrimitives: 1000, meshes });
    expect(scene.meshAssets?.[0].colors).toBe("categorical");
    expect(scene.legend[0].perInstanceColors).toBeUndefined();
    expect(scene.faceColors[1]).toBeGreaterThan(0);
  });

  it("budgets mesh triangles by their own stride, while bounds still cover every instance", async () => {
    const { collection, meshes } = await cooked();
    const scene = buildScene(collection, { maxPoints: 1000, maxPrimitives: 12, meshes });
    expect(scene.counts.meshInstances).toBe(1);
    expect(scene.counts.meshTriangles).toBe(12);
    expect(scene.counts.meshTrianglesTotal).toBe(24);
    expect(scene.bounds).toEqual({ min: [9, -0.5, -1.5], max: [21, 0.5, 1.5] });
    // The pyramid budget is untouched by mesh instances.
    const capped = buildScene(collection, { maxPoints: 1, maxPrimitives: 1000, meshes });
    expect(capped.counts.meshInstances).toBe(2);
  });

  it("leaves a scene without meshes exactly as it was", async () => {
    const { collection } = await cooked();
    const a = renderPng(collection, { width: 160, height: 120 });
    const b = renderPng(collection, { width: 160, height: 120, meshes: new Map() });
    expect(b.pixelHash).toBe(a.pixelHash);
    expect(b.counts).toEqual(a.counts);
    expect(Object.keys(b.counts)).not.toContain("meshTriangles");
    expect(b.meshAssets).toBeUndefined();
  });

  it("reads a mesh into its local triangles once", async () => {
    const { meshes } = await cooked();
    const box = localMesh(meshes.get("box")!);
    expect(box.triangleCount).toBe(12);
    // meshPrimitive's box splits its points per face, for flat normals.
    expect(box.pointCount).toBe(24);
    expect(box.top).toBe(0.5);
    expect(box.bounds).toEqual({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] });
  });
});

describe("cook, assets and validate with a graph-supplied mesh", () => {
  it("cook reports the meshes, and a graph without one reports no assets key", async () => {
    const r = await json(fixture(), ["cook", PATH, "--no-timings"]);
    expect(Object.keys(r.outputs)).toEqual(["inst", "box"]);
    expect(r.assets).toEqual([
      {
        id: "box",
        output: "box",
        node: "boxMesh",
        pin: "out",
        points: expect.any(Number),
        triangles: 12,
        bounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
      },
    ]);
    expect(await text(fixture(), ["cook", PATH, "--no-timings"])).toContain("graph-supplied assets: box (12 tris, 1×1×1)");
    const plain = await json(fixture({ role: false }), ["cook", PATH, "--no-timings"]);
    expect("assets" in plain).toBe(false);
  });

  it("assets marks supplied ids, names what the host must provide, and flags a supplied id nothing emits", async () => {
    const g = fixture({
      extra: [{ id: "crateMesh", type: "meshPrimitive", params: { shape: "box", size: [1, 1, 1] } }],
      extraOutputs: [{ id: "crateMesh", pin: "out", name: "crate", role: "asset" }],
    });
    const r = await json(g, ["assets", PATH]);
    expect(r.supplied).toEqual([
      { id: "box", node: "boxMesh", pin: "out" },
      { id: "crate", node: "crateMesh", pin: "out" },
    ]);
    expect(r.hostIds).toEqual([]);
    expect(r.unusedSupplied).toEqual(["crate"]);
    const t = await text(g, ["assets", PATH]);
    expect(t).toMatch(/spawn +box +— +box\*/);
    expect(t).toContain("distinct ids: box*");
    expect(t).toContain("* supplied by the graph itself: box <- boxMesh.out, crate <- crateMesh.out");
    expect(t).toContain("supplied but emitted by no spawner: crate");
    const plain = await json(fixture({ role: false }), ["assets", PATH]);
    expect("supplied" in plain).toBe(false);
    expect("hostIds" in plain).toBe(false);
  });

  it("validate carries the role in JSON and marks it in the text", async () => {
    const r = await json(fixture(), ["validate", PATH]);
    expect(r.outputs).toEqual([
      { name: "inst", node: "spawn", pin: "instances" },
      { name: "box", node: "boxMesh", pin: "out", role: "asset" },
    ]);
    const t = await text(fixture(), ["validate", PATH]);
    expect(t).toMatch(/^ {2}box +<- boxMesh\.out +\(asset\)$/m);
    expect(t).toMatch(/^ {2}inst +<- spawn\.instances$/m);
  });
});
