/**
 * The ground view's two judgements about itself: where the eye stands when
 * there are no faces to stand on, and whether the frame is occluded.
 *
 * Both were wrong in ways a verifier found at large extents:
 * - With no faces, the eye's height fell back to groundY, which is snapped
 *   to extent/128 — at extent 1000 that is 7.8 units — so lines at y 3.8..10
 *   put the eye at 1.7, BELOW both the content and the grid (at 2.8).
 * - "Near" floors at 5% of the extent (160 m at extent 3200), so a flat plane
 *   already had 48% of its samples "near" and 5 m hills a 600 m wavelength
 *   apart were called "occluded at 58 m" over a clean, open horizon.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../../primitives/index.js";
import {
  type DataCollection,
  cook,
  createPolyline,
  createTriangleMesh,
  deserializeGraph,
  makeGeometryItem,
} from "../../index.js";
import { renderPng } from "../renderPng.js";

/** Triangle-wave hills along z: `amp` up and down, one period per `wave`. */
function hills(half: number, amp: number, wave: number, phase: number): DataCollection {
  const n = 97;
  const positions: number[] = [];
  const tris: number[] = [];
  const tri = (t: number): number => {
    const u = ((t % 1) + 1) % 1;
    return u < 0.5 ? 4 * u - 1 : 3 - 4 * u;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -half + (2 * half * i) / (n - 1);
      const z = -half + (2 * half * j) / (n - 1);
      positions.push(x, amp * tri(z / wave + phase), z);
    }
  }
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      tris.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  return [makeGeometryItem(createTriangleMesh(Float32Array.from(positions), Uint32Array.from(tris)))];
}

function flat(half: number): DataCollection {
  return [
    makeGeometryItem(
      createTriangleMesh(
        Float32Array.of(-half, 0, -half, half, 0, -half, half, 0, half, -half, 0, half),
        Uint32Array.of(0, 1, 2, 0, 2, 3),
      ),
    ),
  ];
}

async function corpus(name: string): Promise<{ collection: DataCollection; outputs: string[] }> {
  const text = readFileSync(new URL(`../../../graphs/${name}.json`, import.meta.url), "utf8");
  const graph = deserializeGraph(JSON.parse(text));
  const cooked = await cook(graph);
  const outputs: string[] = [];
  const collection = graph.describe().outputs.flatMap((o) =>
    (cooked.outputs[o.name] ?? []).map((item) => {
      outputs.push(o.name);
      return item;
    }),
  );
  return { collection, outputs };
}

const ground = (collection: DataCollection, outputs?: string[]): ReturnType<typeof renderPng> =>
  renderPng(collection, { view: "ground", width: 320, height: 240, ...(outputs !== undefined ? { outputs } : {}) });

describe("ground view occlusion", () => {
  it("never fires on a flat plane, even at an extent where most of the frame is within the near distance", () => {
    for (const half of [145, 1450, 14500]) {
      const r = ground(flat(half));
      expect(r.groundView?.occluded, `half ${half}`).toBe(false);
      expect(r.groundView?.blockedFraction, `half ${half}`).toBe(0);
    }
    // The case that made the old rule fragile: nearly half the frame is
    // "near" by distance alone, and none of it blocks anything.
    expect(ground(flat(1450)).groundView?.nearFraction).toBeGreaterThan(0.45);
  });

  it("never fires on gentle hills, whatever phase the eye stands at", () => {
    for (const [half, amp, wave] of [
      [1450, 5, 600],
      [145, 1, 60],
    ] as const) {
      for (const phase of [0, 0.25, 0.5, 0.75]) {
        const r = ground(hills(half, amp, wave, phase));
        expect(r.groundView?.occluded, `hills ${half}/${amp}/${wave} phase ${phase}: ${JSON.stringify(r.groundView)}`).toBe(
          false,
        );
      }
    }
  });

  it("still fires on a wall in front of the eye, on pipeline-5-roads' ridge, and inside basics-mesh-from-field", async () => {
    const wall = [
      ...flat(50),
      makeGeometryItem(
        createTriangleMesh(
          Float32Array.of(-50, 0, 25.5, 50, 0, 25.5, 50, 40, 25.5, -50, 40, 25.5),
          Uint32Array.of(0, 1, 2, 0, 2, 3),
        ),
      ),
    ];
    expect(ground(wall).groundView?.occluded).toBe(true);
    for (const name of ["pipeline-5-roads", "basics-mesh-from-field"]) {
      const { collection, outputs } = await corpus(name);
      const r = ground(collection, outputs);
      expect(r.groundView?.occluded, `${name}: ${JSON.stringify(r.groundView)}`).toBe(true);
    }
  });

  it("does not fire on the corpus' open terrain", async () => {
    for (const name of ["examples-forest", "examples-riverbank"]) {
      const { collection, outputs } = await corpus(name);
      expect(ground(collection, outputs).groundView?.occluded, name).toBe(false);
    }
  });
});

describe("ground eye without faces", () => {
  it("stands above the content's true floor, not the snapped groundY, and above the grid", () => {
    // Lines only, y 3.8..10, 900 across: extent 1000, groundY snaps to 0.
    const lines = createPolyline(
      Float32Array.of(-450, 3.8, -450, 450, 10, -450, 450, 3.8, 450, -450, 10, 450, -450, 3.8, -450),
    );
    const r = ground([makeGeometryItem(lines)], ["road"]);
    const eye = r.views[0].position[1];
    const floor = r.framing.bounds?.min[1] ?? Number.NaN;
    expect(floor).toBeCloseTo(3.8, 5);
    expect(r.framing.groundY).toBe(0); // the snapped value the old fallback used
    expect(eye).toBeCloseTo(floor + r.framing.eye, 5);
    expect(r.drawing.grid.y).toBeLessThan(floor);
    expect(eye).toBeGreaterThan(r.drawing.grid.y);
    expect(r.views[0].target[1]).toBeGreaterThan(floor);
  });
});
