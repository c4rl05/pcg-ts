/**
 * Pins the TYPE surface of `pcg-ts/gpu` — the device entry's interfaces
 * and type aliases, which `publicSurface.test.ts` beside it cannot see.
 *
 * THE LAST ENTRY POINT WITHOUT ONE, and the one where the gap cost most.
 * The root and `pcg-ts/three` have carried this pin for a while; this
 * subpath carried only the value pin, so twenty-two of its twenty-four
 * published names were unguarded — every assertion beside it passes
 * whether or not they exist.
 *
 * WHAT THEY ARE MATTERS HERE MORE THAN ELSEWHERE. Fourteen of them are
 * the `*Like` STRUCTURAL SHAPES this module is typed against instead of
 * depending on `@webgpu/types`: `GpuDeviceLike`, `GpuQueueLike`,
 * `GpuBufferLike` and the rest. That decision is why `pcg-ts/gpu` needs
 * no WebGPU type dependency, and it means those names are not incidental
 * — they ARE the contract a host satisfies when it hands this module a
 * device. Narrowing one silently is how a host that used to compile stops
 * compiling, with nothing in the value pin moving. The others are the
 * compiler's own output shape (`CompiledFieldKernel`, `FieldKernelLayout`,
 * `FieldKernelAttr`, `KernelInput`, `AttrIsSlot`, `GpuScalarType`), which
 * a caller of `compileFieldSpec` reads the moment it stores the result,
 * plus the evaluator's options and stats.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";

import * as gpu from "./index.js";
import { surfaceDiff, surfaceOf } from "../publicSurface.testsupport.js";
import { entryPointSurface } from "../publicTypeSurface.testsupport.js";

/**
 * Every interface and type alias `pcg-ts/gpu` publishes.
 *
 * Sorted, and generated FROM the checker rather than typed by hand —
 * re-generate with the same call the test makes rather than editing an
 * entry in place, so the list cannot drift into a shape the checker never
 * produces.
 *
 * Adding a name here is the same decision as adding one to GPU_SURFACE:
 * say why in the barrel that exports it, not only here.
 */
const GPU_TYPE_SURFACE = [
  "AttrIsSlot", "CompiledFieldKernel", "DetachedBuffer", "FieldKernelAttr", "FieldKernelLayout",
  "GpuAdapterInfoLike", "GpuBindGroupLayoutLike", "GpuBindGroupLike", "GpuBufferLike",
  "GpuCommandBufferLike", "GpuCommandEncoderLike", "GpuCompilationInfoLike",
  "GpuCompilationMessageLike", "GpuCompileError", "GpuComputePassLike",
  "GpuComputePipelineLike", "GpuDeviceLike", "GpuFieldEvaluator", "GpuFieldEvaluatorOptions",
  "GpuPoolStats", "GpuQueueLike", "GpuScalarType", "GpuShaderModuleLike", "KernelInput",
] as const;

/**
 * What this entry exports as a type AND a value: its two classes.
 *
 * A subset of the list above rather than a third surface, and pinned for
 * locality. Demoting either to an interface removes `new GpuCompileError`
 * or `new GpuFieldEvaluator` — the only way a host obtains one — and the
 * value pin next door would catch that too. Saying so where the names are
 * beats inferring it from a name that quietly left another list.
 */
const DUAL_SURFACE = ["GpuCompileError", "GpuFieldEvaluator"] as const;

/** Building a program is seconds, not milliseconds. */
const PROGRAM_MS = 120_000;

/**
 * ONE program build for the three assertions, which is the reason this
 * file could be written at all.
 *
 * `PLAN.md` deferred this pin on cost: the root and `three` files each
 * call `entryPointSurface` once per `it`, so a third of them was three
 * more TypeScript program builds on every run. Memoizing makes it one,
 * and the whole file then measures 2.1 s including vitest's own startup —
 * against a suite that runs for over two minutes. The deferral was
 * costing twenty-four unguarded public names to save something smaller
 * than it sounded.
 */
let cached: ReturnType<typeof entryPointSurface> | undefined;
const surface = (): ReturnType<typeof entryPointSurface> => {
  cached ??= entryPointSurface(
    path.join(process.cwd(), "src/gpu/index.ts"),
    path.join(process.cwd(), "tsconfig.json"),
  );
  return cached;
};

describe("public type surface: pcg-ts/gpu", () => {
  it(
    "publishes exactly the types this list names",
    () => {
      const diff = surfaceDiff([...surface().types], GPU_TYPE_SURFACE);
      expect(diff, diff).toBe("");
    },
    PROGRAM_MS,
  );

  /**
   * THE CROSS-CHECK, and the reason this file pins one list rather than
   * two. The checker and `Object.keys` are two independent readings of
   * the same entry point, so if they disagree about the VALUES then one
   * of them is wrong about the types too and neither pin can be trusted.
   * Asserting the equivalence live — rather than pinning a second copy of
   * the value list here — keeps exactly ONE list of value names per entry
   * point.
   */
  it(
    "agrees with Object.keys about which names are values",
    () => {
      expect(
        [...surface().values],
        "the checker and the module object disagree about the value surface, so one of them " +
          "is also wrong about the types and neither pin means anything until it is resolved",
      ).toEqual(surfaceOf(gpu));
    },
    PROGRAM_MS,
  );

  it(
    "names exactly the exports that are both a type and a value",
    () => {
      const both = surface().types.filter((n) => surface().values.includes(n));
      const diff = surfaceDiff(both, DUAL_SURFACE);
      expect(diff, diff).toBe("");
    },
    PROGRAM_MS,
  );
});
