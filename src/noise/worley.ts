import type { Field } from "../fields/index.js";
import type { WithheldReason } from "../fields/spec.js";
import { hashFloat } from "../random/hash.js";
import { NOISE_RAW_RANGES, type NoiseOpts, type NoiseSpecInfo, hash5, makeNoiseField } from "./util.js";

/**
 * The `output` values the JSON grammar accepts (TS-only union at the call
 * site). Re-exported by `bases.ts` and read by the grammar's parser, so
 * the values this factory derives a spec for and the values the parser
 * accepts are one list.
 */
export const WORLEY_OUTPUTS: readonly string[] = ["f1", "f2", "f2-f1", "cell"];

/** Kind salt decorrelating worley noise from other noise types ("worl"). */
export const WORLEY_SALT = 0x776f726c;

/** Options for {@link worleyNoise}. */
export interface WorleyNoiseOpts extends NoiseOpts {
  /**
   * Which distance to output: nearest feature point (`f1`), second
   * nearest (`f2`), or their difference (`f2-f1`). Default `f1`.
   *
   * `cell` outputs something different in kind: not a distance but a
   * hash of the WINNING cell's integer coords, in [0, 1), constant
   * across every query that resolves to the same cell. That makes the
   * Voronoi partition itself addressable — per-cell colour, per-cell
   * seed, per-cell anything — where the three distances only ever
   * describe a query's position within it. It is a VALUE, not an
   * identity: distinct cells can collide (~2^-24, `hashFloat`'s
   * resolution), so it may not be used as a key. See
   * {@link WorleyNoiseOpts.exact}, whose default this output changes.
   */
  output?: "f1" | "f2" | "f2-f1" | "cell";
  /**
   * When true, widen the cell search until provably correct instead of
   * stopping at the standard 3x3x3 neighborhood: Chebyshev rings are
   * added while the needed distance (f1, or f2 for the f2/f2-f1
   * outputs) still exceeds the ring bound — every feature in a cell at
   * Chebyshev radius r+1 or beyond is at least distance r from the
   * query, so once the needed distance is <= r no unsearched feature
   * can change it. Terminates by r = 3 (f1 <= √3, f2 <= √6). Default
   * false (the approximate 3x3x3 search, bit-identical to before this
   * option existed) — EXCEPT for `output: "cell"`, which defaults it
   * true.
   *
   * That exception is the difference between a continuous output and a
   * discrete one. When the 3x3x3 search misses a nearer feature it
   * returns an f1 wrong by ~0.016, which reads as a faint distortion;
   * the same miss returns a wholly unrelated `cell` value, because the
   * hash of the runner-up cell has nothing to do with the hash of the
   * winner. One is a small error in the right answer, the other is a
   * different answer, so the approximate search is not a defensible
   * default for a value that names a cell. Pass `exact: false`
   * explicitly to take the cheaper search anyway.
   */
  exact?: boolean;
}

/**
 * Worley (cellular) noise: Euclidean distance to hashed feature points,
 * one per unit cell, searched over the 3x3x3 neighborhood (the standard
 * approximation) or exhaustively with `exact: true`. Raw ranges
 * (documented in `NOISE_RAW_RANGES.worleyNoise`, valid for both search
 * modes): F1 ∈ [0, √3] (a feature always lies in the query's own unit
 * cell), F2 ∈ [0, √6] (a second feature always lies in a face-adjacent
 * cell), and `f2-f1` ∈ [0, √6]. Deterministic from `seed`.
 *
 * The 3x3x3 search can miss a closer feature just outside the searched
 * block: measured over corner-adjacent queries, ~7e-5 return a wrong F1
 * and ~7e-4 a wrong F2, with error magnitudes around 0.016. `exact:
 * true` removes that error at the cost of a wider search when the
 * nearest features are distant; both modes sample the same feature
 * points.
 *
 * `output: "cell"` returns the Voronoi PARTITION rather than a distance
 * — a per-cell constant hash — which is what makes cellular subjects
 * (cracked mud, leaf cells, plots, a per-cell seed) expressible without
 * a topology node. Because the site set is one feature per unit cell
 * and the search is a fixed neighbourhood, its reach is bounded by
 * construction: it is partition-invariant under a `World` at any cell
 * size and needs no halo, which arbitrary-point-set Voronoi cannot
 * promise. That output defaults `exact` to true (see the option) and
 * does not lower to WGSL — see the note in `src/gpu/compile.ts`, which
 * refuses it with a `GpuCompileError` so the resolver falls back to the
 * CPU and counts a `compile-error` rather than lowering a distance in
 * its place.
 */
export function worleyNoise(opts: WorleyNoiseOpts = {}): Field<1> {
  const output = opts.output ?? "f1";
  // `cell` defaults to the exact search; the distances default to the
  // approximate one. See WorleyNoiseOpts.exact for why the default turns
  // on the output. Resolved here, so `kind` and the serialized spec both
  // carry the effective value rather than the passed one.
  const exact = opts.exact ?? output === "cell";
  const range = NOISE_RAW_RANGES.worleyNoise[output];
  const kind = `worley:${output}${exact ? ":exact" : ""}`;
  // `output` is a TS-only union here — nothing checks it at runtime, and
  // the grammar does. An out-of-union value derives no spec (it has no
  // documented range either, so the field is already degenerate).
  const spec: NoiseSpecInfo | WithheldReason = WORLEY_OUTPUTS.includes(output)
    ? { fn: "worleyNoise", extraOpts: { output, exact } }
    : {
        kind: "ungrammatical",
        detail: `worleyNoise's \`output\` must be one of ${WORLEY_OUTPUTS.map((o) => `"${o}"`).join(", ")}, got ${JSON.stringify(output)}`,
      };
  return makeNoiseField(kind, WORLEY_SALT, opts, range, (seed) => (x, y, z) => {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const cz = Math.floor(z);
    let f1 = Infinity;
    let f2 = Infinity;
    // Coords of the cell owning the f1 feature, tracked for `cell`.
    // Integer assignments only, drawing no extra hash: the f1/f2 values
    // this loop produces stay bit-identical to before the output existed.
    let wx = 0;
    let wy = 0;
    let wz = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const gx = cx + dx;
          const gy = cy + dy;
          const gz = cz + dz;
          const px = gx + hashFloat(hash5(seed, gx, gy, gz, 0));
          const py = gy + hashFloat(hash5(seed, gx, gy, gz, 1));
          const pz = gz + hashFloat(hash5(seed, gx, gy, gz, 2));
          const ddx = px - x;
          const ddy = py - y;
          const ddz = pz - z;
          const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
          if (d < f1) {
            f2 = f1;
            f1 = d;
            wx = gx;
            wy = gy;
            wz = gz;
          } else if (d < f2) {
            f2 = d;
          }
        }
      }
    }
    if (exact) {
      // Ring expansion with a distance bound. The query lies in cell
      // (cx, cy, cz); a feature in a cell at Chebyshev radius r' >= r+1
      // differs from the query by at least r in some coordinate, so its
      // distance is >= r. After fully searching rings 0..r, if the
      // needed distance D (f1, or f2 when the output uses it) satisfies
      // D <= r, no unsearched feature can be strictly closer than D —
      // and only strictly closer features can change f1 or f2 — so the
      // result is exact. D is bounded (f1 <= √3, f2 <= √6), so the loop
      // ends by r = 3.
      // Which distance has to settle before the ring bound proves the
      // answer. Named positively rather than as `!== "f1"` so that a
      // later output defaults to the f1 bound instead of silently
      // demanding f2: `cell` needs only the WINNER settled, and f2
      // settling is a strictly stronger (so slower) condition.
      const needsF2 = output === "f2" || output === "f2-f1";
      let r = 1; // rings 0..1 (the 3x3x3 block) are already searched
      // The r < 3 cap is unreachable for finite inputs: after the 3x3x3
      // block f1 <= √3 and f2 <= √6 < 3, so the distance condition always
      // exits by r = 3. It exists so non-finite sample positions (NaN/±Inf
      // coordinates make every candidate distance NaN, which never lowers
      // f1/f2) degrade to the same GIGO result as the approximate path
      // (Infinity or NaN out) instead of expanding rings forever.
      while (r < 3 && (needsF2 ? f2 : f1) > r) {
        r++;
        for (let dz = -r; dz <= r; dz++) {
          const az = dz < 0 ? -dz : dz;
          for (let dy = -r; dy <= r; dy++) {
            const ay = dy < 0 ? -dy : dy;
            for (let dx = -r; dx <= r; dx++) {
              const ax = dx < 0 ? -dx : dx;
              // Only the shell at Chebyshev radius exactly r is new.
              if (ax !== r && ay !== r && az !== r) continue;
              const gx = cx + dx;
              const gy = cy + dy;
              const gz = cz + dz;
              const px = gx + hashFloat(hash5(seed, gx, gy, gz, 0));
              const py = gy + hashFloat(hash5(seed, gx, gy, gz, 1));
              const pz = gz + hashFloat(hash5(seed, gx, gy, gz, 2));
              const ddx = px - x;
              const ddy = py - y;
              const ddz = pz - z;
              const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
              if (d < f1) {
                f2 = f1;
                f1 = d;
                wx = gx;
                wy = gy;
                wz = gz;
              } else if (d < f2) {
                f2 = d;
              }
            }
          }
        }
      }
    }
    if (output === "cell") {
      // GIGO guard: a non-finite query makes every candidate distance
      // NaN, which never beats the initial Infinity, so no cell ever
      // won and wx/wy/wz are still their initial zeros. Hashing those
      // would report cell (0,0,0) — a plausible-looking answer to an
      // unanswerable query — so say NaN instead, matching what the
      // distance outputs already return for the same input.
      if (!Number.isFinite(f1)) return Number.NaN;
      // Index 3: 0/1/2 draw the feature point's x/y/z jitter above.
      return hashFloat(hash5(seed, wx, wy, wz, 3));
    }
    return output === "f1" ? f1 : output === "f2" ? f2 : f2 - f1;
  }, spec);
}
