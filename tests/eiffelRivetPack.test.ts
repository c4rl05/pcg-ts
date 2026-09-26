/**
 * Packed rivets (demos/eiffel/rivetPack.ts): every head of the riveted
 * tower drawn from 24 bytes — its seat, its rotation, its width and rise —
 * instead of a 64-byte matrix, the hand's drive (heads.ts) folded in.
 *
 * What this holds: on every rivet batch of the deepest cook
 * (`?rivets=full`), every head packs, and the head the vertex shader
 * rebuilds from it (`unpackMatrix`, the shader's arithmetic in f32) lands
 * where the CPU path's matrix — the rule's transform times the drive —
 * puts it: every point of the head within 0.1 mm, its axis and its turn
 * within 0.01°. With a control: packing without the drive fails the same
 * tolerance, so the check can say "different". And each way a batch can
 * refuse to pack names its reason; the shader edit finds its anchors in
 * this three's shaders or throws; the packed arrays go once uploaded.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { cook } from "pcg-ts";
import { ShaderLib, SphereGeometry, MeshStandardMaterial } from "three";
import { buildEiffel } from "../demos/eiffel/graph.js";
import { HEAD_DRIVE_ATTR, driveHead, driveMatrix } from "../demos/eiffel/heads.js";
import {
  PACKED_BYTES,
  PACKED_PREPASS,
  RIVET_SIZE_MAX,
  type RivetBatch,
  isFallback,
  packRivets,
  packedRivetMaterial,
  packedRivetMesh,
  packedShaderProblem,
  packedVertexShader,
  unpackMatrix,
  type PackedRivets,
} from "../demos/eiffel/rivetPack.js";

type M4 = ArrayLike<number>;

/** a · b, column-major 4x4, in f64. */
function mul(a: M4, b: M4): number[] {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[4 * k + r]! * b[4 * c + k]!;
      out[4 * c + r] = s;
    }
  return out;
}
const apply = (m: M4, v: readonly number[]): number[] =>
  [0, 1, 2].map((i) => m[i]! * v[0]! + m[4 + i]! * v[1]! + m[8 + i]! * v[2]! + m[12 + i]!);
const col = (m: M4, j: number): number[] => [m[4 * j]!, m[4 * j + 1]!, m[4 * j + 2]!];
const angle = (p: number[], q: number[]): number => {
  const d = (p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!) / (Math.hypot(...p) * Math.hypot(...q));
  return Math.acos(Math.min(1, Math.max(-1, d)));
};

/** The unit head's rim at its four quarters, and its crown. */
const RIM = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 0.7, 0]] as const;

const TOL_M = 1e-4;
const TOL_RAD = (0.01 * Math.PI) / 180;

/**
 * The worst a packed head departs from the CPU path's matrix, over every
 * point of the unit head (|x|, |z| ≤ 1, 0 ≤ y ≤ 0.7): bounded above by
 * the seat's difference plus each column's, weighted by that reach.
 */
function departure(cpu: M4, gpu: M4): { m: number; rad: number } {
  const d = (j: number) => Math.hypot(cpu[4 * j]! - gpu[4 * j]!, cpu[4 * j + 1]! - gpu[4 * j + 1]!, cpu[4 * j + 2]! - gpu[4 * j + 2]!);
  const m = d(3) + d(0) + 0.7 * d(1) + d(2);
  const rad = Math.max(angle(col(cpu, 1), col(gpu, 1)), angle(col(cpu, 0), col(gpu, 0)));
  return { m, rad };
}

let batches: Array<{ name: string; batch: RivetBatch }> = [];

beforeAll(async () => {
  const { outputs } = await cook(buildEiffel(1889, { rivets: true, fullRivets: true }));
  batches = [];
  for (const [name, coll] of Object.entries(outputs)) {
    if (!name.startsWith("rivets")) continue;
    for (const item of coll as unknown as Array<{ kind: string; batches?: RivetBatch[] }>) {
      if (item.kind !== "instances") continue;
      for (const batch of item.batches ?? []) batches.push({ name, batch });
    }
  }
}, 600_000);

describe("eiffel packed rivets", () => {
  it("packs every head of every rivet batch, and draws it where the CPU path's matrix does", () => {
    expect(batches.length).toBeGreaterThan(50);
    let heads = 0;
    let worstM = 0;
    let worstRad = 0;
    let bare = 0;
    let sampled = 0;
    let outside = 0;
    for (const { name, batch } of batches) {
      const p = packRivets(batch);
      if (isFallback(p)) throw new Error(`${name}: ${p.reason}: ${p.detail}`);
      expect(p.count, name).toBe(batch.count);
      const draws = batch.attributes?.[HEAD_DRIVE_ATTR];
      expect(draws, name).toBeDefined();
      for (let i = 0; i < p.count; i++) {
        const rule = batch.transforms.subarray(16 * i, 16 * i + 16);
        const cpu = mul(rule, driveMatrix(driveHead(draws![i]!)));
        const d = departure(cpu, unpackMatrix(p, i));
        if (d.m > worstM) worstM = d.m;
        if (d.rad > worstRad) worstRad = d.rad;
        // The control, on a sample: the rule alone (no drive) is not the
        // driven head — its axes differ by more than the tolerance (the
        // angle is exact, not a bound).
        if (i % 97 === 0) {
          sampled++;
          if (departure(cpu, rule).rad > TOL_RAD) bare++;
        }
        // And the batch's sphere holds the head's rim and crown.
        const b = p.bounds;
        for (const v of RIM) {
          const q = apply(cpu, v);
          if (Math.hypot(q[0]! - b.center.x, q[1]! - b.center.y, q[2]! - b.center.z) > b.radius + 1e-6) outside++;
        }
      }
      heads += p.count;
    }
    console.log(
      `packed ${heads} heads in ${batches.length} batches: worst ${(worstM * 1000).toFixed(4)} mm, ` +
        `${((worstRad * 180) / Math.PI).toFixed(5)}°; ${PACKED_BYTES} B a head against 64`,
    );
    expect(heads).toBeGreaterThan(1_300_000);
    expect(worstM).toBeLessThanOrEqual(TOL_M);
    expect(worstRad).toBeLessThanOrEqual(TOL_RAD);
    // The control: almost every sampled head's drive is visible at the
    // tolerance, so the comparison above can tell a head from its rule.
    expect(bare).toBeGreaterThan(0.99 * sampled);
    expect(outside).toBe(0);
  }, 600_000);

  it("takes 24 bytes a head, and drops them from the CPU once uploaded", () => {
    expect(PACKED_BYTES).toBe(24);
    const { batch } = batches[0]!;
    const p = packRivets(batch) as PackedRivets;
    expect(p.at.byteLength + p.turn.byteLength + p.size.byteLength).toBe(24 * p.count);
    const head = new SphereGeometry(1, 16, 3);
    const mesh = packedRivetMesh(p, head, packedRivetMaterial(new MeshStandardMaterial()));
    const g = mesh.geometry as unknown as { instanceCount: number; boundingSphere: unknown; attributes: Record<string, { array: unknown; normalized: boolean; onUploadCallback(): void }> };
    expect(g.instanceCount).toBe(p.count);
    expect(g.boundingSphere).not.toBeNull();
    expect(g.attributes.rivetTurn!.normalized).toBe(true);
    expect(g.attributes.rivetSize!.normalized).toBe(true);
    expect(g.attributes.rivetAt!.normalized).toBe(false);
    // The head's own attributes are shared, not copied.
    expect(g.attributes.position).toBe(head.attributes.position);
    for (const k of ["rivetAt", "rivetTurn", "rivetSize"]) {
      const a = g.attributes[k]!;
      expect(a.array).not.toBeNull();
      a.onUploadCallback();
      expect(a.array, k).toBeNull();
    }
    // The occlusion pass is handed its stand-in, and neither is overridden.
    expect(mesh.userData.prepassMaterial).toBe(PACKED_PREPASS);
    expect((mesh.material as MeshStandardMaterial).allowOverride).toBe(false);
    expect(PACKED_PREPASS.allowOverride).toBe(false);
  });

  it("refuses what it cannot pack, and says why", () => {
    const one = (m: number[], assetId = "rivet", draw?: number): RivetBatch => ({
      assetId,
      count: 1,
      transforms: new Float32Array(m),
      attributes: draw === undefined ? undefined : { [HEAD_DRIVE_ATTR]: new Float32Array([draw]) },
    });
    const s = 0.019;
    const ok = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1];
    expect(isFallback(packRivets(one(ok, "rivet", 0.3)))).toBe(false);
    expect(isFallback(packRivets(one(ok)))).toBe(false);
    const reason = (b: RivetBatch) => {
      const p = packRivets(b);
      return isFallback(p) ? p.reason : "packed";
    };
    expect(reason(one(ok, "globe"))).toBe("not-the-rivet-asset");
    expect(reason(one([s, 0, 0, 0, 0.3 * s, s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1]))).toBe("not-a-rotation-and-scale");
    expect(reason(one([s, 0, 0, 0, 0, 1.5 * s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1]))).toBe("not-a-rotation-and-scale");
    expect(reason(one([-s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1]))).toBe("not-a-rotation-and-scale");
    expect(reason(one([s, 0, 0, 1, 0, s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1]))).toBe("not-a-rotation-and-scale");
    const big = RIVET_SIZE_MAX * 1.01;
    expect(reason(one([big, 0, 0, 0, 0, big, 0, 0, 0, 0, big, 0, 1, 2, 3, 1]))).toBe("size-out-of-range");
    // The detail names the head.
    const p = packRivets(one([-s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 1, 2, 3, 1]));
    expect(isFallback(p) && p.detail).toMatch(/head 0: a mirror/);
  });

  it("edits this three's vertex shaders at their anchors, and throws where one is gone", () => {
    for (const src of [ShaderLib.physical.vertexShader, ShaderLib.normal.vertexShader]) {
      const out = packedVertexShader(src);
      expect(out).toContain("attribute vec4 rivetTurn;");
      expect(out).toContain("objectNormal = rivetRotate( rivetQ, objectNormal / rivetS );");
      expect(out).toContain("transformed = rivetRotate( rivetQ, transformed * rivetS ) + rivetAt;");
      // The normal is set up before the position, so rivetQ is declared first.
      expect(out.indexOf("vec4 rivetQ")).toBeLessThan(out.indexOf("transformed = rivetRotate"));
    }
    expect(() => packedVertexShader(ShaderLib.physical.vertexShader.replace("#include <begin_vertex>", ""))).toThrow(
      /no "#include <begin_vertex>"/,
    );
    // The page asks once, at load, and on this three the answer is yes.
    expect(packedShaderProblem()).toBeUndefined();
  });
});
