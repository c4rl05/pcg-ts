import { type Field, elementCount, evaluateField, makeField } from "../fields/index.js";
import type { WithheldReason } from "../fields/spec.js";
import { hashFloat } from "../random/hash.js";
import {
  NOISE_RAW_RANGES,
  type NoiseOpts,
  type NoiseSpecInfo,
  attachNoiseSpec,
  hash5,
  makeNoiseField,
  noisePlumbing,
} from "./util.js";

/**
 * How {@link worleyFeature}'s sampler answers: by WRITING three lanes,
 * rather than returning one number the way every scalar noise does. An
 * out-parameter and not a returned triple, because this runs once per
 * sampled element and a fresh array each time would allocate per point in
 * the one place this library never does.
 */
type VecSampler = (
  x: number,
  y: number,
  z: number,
  out: Float32Array,
  at: number,
) => void;

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
  // WHICH output, decided ONCE here rather than per sampled element. THE
  // CANONICAL NOTE ON WHY A PARAM STRING MUST NOT BE COMPARED INSIDE A
  // PER-ELEMENT LOOP — nine other sites in the library point here.
  //
  // The sampler below runs once per point. Asking it `output === "cell"`
  // each time put a string comparison in a per-element loop, and V8
  // miscompiled it: in a warm process one sample took the WRONG branch,
  // so the `cell` output returned that point's f2-f1. It turned on the
  // string's REPRESENTATION rather than its value — a source literal
  // never failed, a `JSON.parse`d one usually did — which is what makes
  // it an optimizer fault and not a logic error.
  //
  // It is a JIT fault, so the rate is a property of the machine and its
  // load, not of the code. Two harnesses that showed it on Node 22.20.0,
  // for whoever has to reproduce it next: cook the corpus graphs that
  // precede `graphs/basics-worley-cells.json`, then parse and cook that
  // one (about one wrong f32 in 22500, first cook only, most runs); and
  // `tests/graphs.test.ts`, which now compares the first cook. Neither
  // ever showed it in a cold process. Treat any count as evidence that it
  // happens, not as a rate.
  //
  // Three booleans and a flat comparison are what the closure sees
  // instead. The out-of-union case keeps its old meaning: all three are
  // false, so the tail returns f2 - f1 exactly as the chained ternary
  // did. The grammar re-interns the parsed string as well
  // (`src/fields/fieldJson.ts`), which is an independent second half —
  // neither fix relies on the other.
  const isCell = output === "cell";
  const isF1 = output === "f1";
  const isF2 = output === "f2";
  // Which distance has to settle before the ring bound proves the answer.
  // Named positively rather than as `!== "f1"` so that a later output
  // defaults to the f1 bound instead of silently demanding f2: `cell`
  // needs only the WINNER settled, and f2 settling is a strictly stronger
  // (so slower) condition.
  const needsF2 = isF2 || output === "f2-f1";
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
      // `needsF2` is decided once at construction (see above), not here.
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
    if (isCell) {
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
    return isF1 ? f1 : isF2 ? f2 : f2 - f1;
  }, spec);
}

/** Options for {@link worleyFeature}. */
export interface WorleyFeatureOpts extends Omit<NoiseOpts, "normalized"> {
  /**
   * Search every cell that could hold the nearest feature rather than the
   * 3x3x3 block around the query. Defaults to TRUE here, and for the same
   * reason `output: "cell"` does: the approximate walk's error changes
   * KIND when the answer is not a distance. A missed feature costs a
   * distance about 0.016 and costs this a wholly different POINT, several
   * cells away — so the cheap walk is not a defensible default for an
   * answer that is discrete. Set it false only if you have measured that
   * the occasional jump does not show.
   */
  exact?: boolean;
}

/**
 * WHERE the nearest feature point is, as a world-space `Field<3>`.
 *
 * `worleyNoise` answers questions ABOUT the nearest feature — how far
 * (`f1`), how much nearer than the runner-up (`f2-f1`), which cell won
 * (`cell`). All of those are measurements, and a measurement cannot tell
 * you where to put anything. This returns the point itself, which is what
 * makes a worley partition PLACEABLE: subtract `position()` from it for a
 * vector pointing at the cell's own centre — the thing that orients
 * scales, shingles, cracked plates and petal veins — or write it onto a
 * point to snap a cloud onto one anchor per cell.
 *
 * IT COMES BACK IN THE SAMPLED SPACE, which is WORLD SPACE by default and
 * is the only noise output that has a space at all. Every other one is a
 * number that does not care where it came from; this is a position, and a
 * position in the noise's internal space (where `frequency` and `offset`
 * have already been applied) would be useless to the caller. So the
 * forward transform is undone before the value is stored, and
 * `worleyFeature() - position()` is a vector in the units the graph is
 * written in.
 *
 * "By default" is load-bearing, and two things follow. `frequency: 0` is
 * REFUSED here though `worleyNoise` takes it happily: it maps all of
 * space to one noise point, so the map is not injective and there is no
 * position to hand back. And the substitution the `frequency` refusal
 * recommends elsewhere — scale the POSITION instead of the frequency,
 * which samples the same point — does NOT preserve this output. The
 * inverse undoes `frequency` and `offset` and cannot undo an arbitrary
 * position expression, so a point sampled through `mul(position(), 3)`
 * comes back in THAT space, three times too far out.
 *
 * It has no `normalized` option, because a position has no range to
 * normalize into: it tracks the query, so it is unbounded in exactly the
 * way `f1` is not. It is not a NOISE BASE either — `fbm` sums octaves of
 * a measurement and summing positions means nothing — which is why this
 * is a separate function rather than a fifth `output` on `worleyNoise`.
 *
 * It does not lower to WGSL, for the reason `output: "cell"` does not:
 * picking a winner is a COMPARE, and `docs/authoring.md` warns that a
 * branchy op may flip at knife-edge inputs whose operands differ within
 * tolerance. A flipped compare moves the answer to another cell, which no
 * ULP budget can express. The compiler refuses it by name and the CPU
 * resolves it instead, which is byte-identical rather than an
 * approximation.
 */
export function worleyFeature(opts: WorleyFeatureOpts = {}): Field<3> {
  const exact = opts.exact ?? true;
  const kind = `worleyFeature${exact ? ":exact" : ""}`;
  // Read here as well as inside the plumbing, because the INVERSE of the
  // forward transform is this function's own business: the sampler works
  // in noise space, and undoing `p * frequency + offset` in f64 before
  // the f32 store is what keeps the returned point at the precision the
  // caller's own coordinates have.
  const frequency = opts.frequency ?? 1;
  // REFUSED, and it is the one option `worleyNoise` takes that this one
  // cannot. A frequency of 0 maps all of space to a single noise point,
  // which is a perfectly good thing to ask a DISTANCE (worleyNoise
  // answers a constant) and an unanswerable thing to ask a POSITION: the
  // forward map is not injective, so it has no inverse, and undoing it
  // arithmetically hands back an infinity per lane. Said here rather than
  // shipped as GIGO because the caller is asking for coordinates and
  // would get three infinities with nothing naming the cause.
  if (frequency === 0) {
    throw new Error(
      "worleyFeature: frequency 0 has no inverse — it maps every position to the same noise " +
        "point, so there is no world position to report back. Use a small non-zero frequency " +
        "for one enormous cell, or worleyNoise if a constant distance is what you wanted.",
    );
  }
  const [ox = 0, oy = 0, oz = 0] = opts.offset ?? [0, 0, 0];
  const plumbing = noisePlumbing<VecSampler>(
    kind,
    WORLEY_SALT,
    opts,
    (seed) => (x, y, z, out, at) => {
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      const cz = Math.floor(z);
      let f1 = Infinity;
      // The winning feature point itself, in noise space. Tracked instead
      // of the cell coords `worleyNoise` keeps, because the jitter is the
      // half that makes it a POINT rather than a lattice site — and it is
      // already computed on the way to the distance, so this draws no
      // extra hash.
      let wpx = 0;
      let wpy = 0;
      let wpz = 0;
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
              f1 = d;
              wpx = px;
              wpy = py;
              wpz = pz;
            }
          }
        }
      }
      if (exact) {
        // The ring bound `worleyNoise` documents, on the f1 branch only:
        // this output needs the WINNER settled and never the runner-up,
        // which is the weaker and therefore cheaper condition.
        let r = 1;
        while (r < 3 && f1 > r) {
          r++;
          for (let dz = -r; dz <= r; dz++) {
            const az = dz < 0 ? -dz : dz;
            for (let dy = -r; dy <= r; dy++) {
              const ay = dy < 0 ? -dy : dy;
              for (let dx = -r; dx <= r; dx++) {
                const ax = dx < 0 ? -dx : dx;
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
                  f1 = d;
                  wpx = px;
                  wpy = py;
                  wpz = pz;
                }
              }
            }
          }
        }
      }
      // The same GIGO guard the `cell` output carries. A non-finite query
      // makes every candidate distance NaN, which never beats the initial
      // Infinity, so nothing ever won and wpx/wpy/wpz are still zeros —
      // and reporting the origin as "the nearest feature" is a plausible
      // answer to an unanswerable question.
      if (!Number.isFinite(f1)) {
        out[at] = Number.NaN;
        out[at + 1] = Number.NaN;
        out[at + 2] = Number.NaN;
        return;
      }
      // Divided, not multiplied by a precomputed reciprocal. `1 / f` is
      // itself rounded, so the product misses the correctly-rounded
      // quotient by an ulp on about 0.04% of coordinates at some
      // frequencies — deterministic either way, but this IS the inverse
      // rather than something within an ulp of it, and three divides sit
      // under a 27-cell hash walk.
      out[at] = (wpx - ox) / frequency;
      out[at + 1] = (wpy - oy) / frequency;
      out[at + 2] = (wpz - oz) / frequency;
    },
  );
  const { key, pos } = plumbing;
  const field = makeField<3>(key, 3, (ctx) => {
    const sample = plumbing.samplerFor(ctx.seed);
    const posCol = evaluateField(pos, ctx);
    if (posCol.tupleSize !== 3) {
      throw new Error(
        `worleyFeature: position field must have tupleSize 3, got ${posCol.tupleSize}`,
      );
    }
    const n = elementCount(ctx);
    const p = posCol.data;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      sample(
        p[i * 3] * frequency + ox,
        p[i * 3 + 1] * frequency + oy,
        p[i * 3 + 2] * frequency + oz,
        out,
        i * 3,
      );
    }
    return { data: out, tupleSize: 3 };
  });
  attachNoiseSpec(field, plumbing, opts, { fn: "worleyFeature", extraOpts: { exact } });
  return field;
}
