# riverbank — calibration

Measured 2026-09-15 with `evals/harness/score.mjs` against the U0 baseline
tarball `baseline-0.17.0-0ad6998.tgz`, installed into a temp project. Seeds
`[20260816, 1, 2]` — the reference graph's own seed plus two others. Every
number below is a check's `value` from those runs, per seed in that order.

## History: why the brief states numbers

The first version kept the original brief's words and let thresholds follow
the reference: four equal-area distance bands, "far/near >= 1.25". An
independent verification agent broke it both ways:

- driftwood at 1.1-1.9 m from the centre line — inside the stated 4 m-wide
  water — scored `solved`, because the bank band started at 1.0 m;
- plainly reasonable graphs failed on magnitudes the brief never stated
  (thinning only over the last 7.5 m: far/near 1.14; trees half size at the
  water and full size by 12 m: 1.09; trees planted in a disc on the square
  ground: 1.04, because the band area counted empty corners);
- a bare 15 m strip failed as intended, but 6-10 stray trees in it flipped
  the verdict to `solved`.

So every threshold is now a number in the brief's contract, measured on the
ground plane from the `river` polyline, with areas counted only over ground
that has a tree within 10 m (bare margins and unplanted corners drop out).

A second verifier then broke that version in five places, all fixed:

- course coverage binned the river by arc across ALL of it, so two river
  pieces in one order failed (4 of 10 stretches) and in the other order
  solved, and a river looping 45 m off the ground failed (6-8 of 10). Now
  only length inside the ground's bounds counts, joined in order: both 10/10.
- a ground delivered as two banks with no ground under the water scored span
  0 and course 0. River measures now use the ground's bounds, not its
  triangles: solved.
- a ring river whose last point sat on its first, as a separate point, read
  as open: solved. Closure is now also geometric (within 2 m): fails.
- driftwood 20 m up in the air: solved. driftwood-on-bank now also requires
  the origin within 0.5 m of the ground: fails.
- the lib's `PolylineIndex` kept zero-length segments (side 0 on a repeated
  vertex) and `segmentsCross` could answer differently with its arguments
  swapped inside the eps band; both fixed in `evals/lib` with tests.

A third, delta verifier found the bounds fix had over-reached: on a diamond or
L-shaped ground the river crossing an empty corner still counted as "course",
so correct driftwood reached only 6 of 10 stretches (a disc exactly 8). The
course now counts river length that has ground surface within 4 m of it (the
water gap between two banks is 4 m wide), or the bounds when the ground has
no surface: diamond 10, L through the notch 9-10, disc 10. It also noted that a
stray 1.5 m river fragment read as closed with 3 vertices and open with 2;
closure is now the brief's rule for every line, index or within 2 m.

The variant graphs from all three verifiers are kept as calibration alternatives
below (`alt:`); they are not registered negatives. They live in the session
scratchpad, not the repo; their verdicts are recorded here.

## Reference

`reference.graph.json` is `graphs/examples-riverbank.json` with its long
description dropped and ONE edit: `driftThin` also keeps only river samples
with |x| <= 73. The river runs 3 m past the 150 m ground, and the original laid
3-6% of its driftwood over nothing there (on-ground share 0.961, 0.942, 0.966
before the edit, which squeezed the one-stretch negative to 0.914 against the
0.9 bar). The river is
shaped by noises with LITERAL seeds, so it does not move with the graph seed —
the trees, their thinning and the driftwood do. The graph measures tree
distance to 1.2 m spline samples; the checks measure to the output polyline
(48 points); the gap is small next to every threshold.

## Checks

### river-runs-through (hard) — open lines, span >= 0.8 inside the ground's bounds

| graph | span | closed lines |
|---|---|---|
| reference | 0.996, 0.996, 0.996 | 0 |
| neg short-river (44 m mid-ground) | 0.293 x3 | 0 |
| alt river-cuts-corner (enters west, leaves south) | 0.476 x3 | 0 |
| alt river-closed (the same path closed) | 0.996 x3 | 1 — fails |
| alt ring r=55, last point a separate copy of the first | 0.733 x3 | 1 — fails |
| alt ring r=64, the same | 0.853 x3 | 1 — fails (solved before the 2 m rule) |
| alt river-dense-polyline (path over 1.2 m samples) | 0.998 x3 | 0 — passes |
| alt two pieces, either order | 1.0 x3 | 0 — passes |
| alt banks without the water strip | 0.996 x3 | 0 — passes |

A river output that is points without path topology (alt river-dense-spline)
fails every check with "the river output holds no path": the contract asks for
a path.

### trees-thin-by-the-water (hard) — >= 100 trees; near/far density in [0.10, 0.60]

Near = 2-12 m from the line, far = beyond 30 m; per 100 m² of ground within
10 m of a tree.

| graph | near/far |
|---|---|
| reference | 0.356, 0.370, 0.327 |
| alt ground-as-points (must pass) | 0.323, 0.337, 0.298 |
| alt round-planting (disc of trees, square ground; must pass) | 0.407, 0.428, 0.378 |
| neg uniform-trees (one keep probability past a 4.5 m strip) | 0.874, 0.862, 0.913 |
| alt short-thinning-zone (keep 0.05 at 2.5 m to 1.0 by 10 m) | 0.863, 0.870, 0.863 |
| alt hard-strip-15m-stragglers (bare 15 m strip plus 6-10 strays) | 0.037, 0.043, 0.031 |
| alt hard-strip-15m (bare) | 0 |

Cap 0.60: 0.23 above the reference's worst, 0.26 below uniform-trees' best.
short-thinning-zone fails, and under the stated number that is the right
verdict: its keep probability ramps, but a spacing prune downstream saturates
the density almost at once, so the ground by the water is 86% as dense — an
agent can measure that and does not need to guess. Floor 0.10: a first draft
used 0.05, which left the straggler hack only 0.007-0.019 below the line; at
0.10 it is 0.057 below and the reference 0.227 above.

### trees-smaller-by-the-water (hard) — near/far mean size <= 0.70

| graph | near/far |
|---|---|
| reference | 0.383, 0.377, 0.378 |
| neg constant-scale (0.8-1.2 everywhere) | 0.998, 0.993, 0.999 |
| alt near-only-scale (half size at the water, full by 12 m) | 0.802, 0.789, 0.790 |
| alt mild-scale-ramp (0.8 at 4.5 m to 1.0 at 40 m) | 0.831, 0.827, 0.832 |

A first draft used 0.80, which put near-only-scale ON the line (fail, pass,
pass across the three seeds) — a verdict decided by the draw. 0.70 is 0.09
under that graph's best and 0.32 over the reference's worst.

### tree-clearance (hard) — nearest tree >= 2.0 m

| graph | nearest tree (m) |
|---|---|
| reference | 4.522, 4.530, 4.680 |
| alt short-thinning-zone (must pass) | 2.753, 2.505, 2.561 |
| neg trees-in-water (reference plus 1 in 10 candidates kept within 2 m) | 0.076, 0.236, 0.013 |

### trees-on-ground (hard) — >= 99% within 0.5 m of the ground under them

| graph | share within 0.5 m | worst gap (m) |
|---|---|---|
| reference | 1, 1, 1 | 0 |
| neg floating-trees (reference raised 5 m at the end) | 0, 0, 0 | 5 |

Added after the verifier's trees-lifted-y5 variant scored `solved`: "trees grow
on the ground" was not measured at all.

### driftwood-on-bank (hard) — >= 10 pieces, >= 90% within 2-8 m AND within 0.5 m of the ground

Measured on the final reference (driftwood clipped to the ground); the `alt`
rows were measured on the unclipped reference, whose own share was
0.961/0.942/0.966, so their absolute shares carry that 3-6% offset.

| graph | count | share on the bank |
|---|---|---|
| reference | 71, 81, 85 | 1, 1, 1 |
| neg driftwood-inland (12-18 m) | 71, 81, 85 | 0.014, 0.012, 0.071 |
| neg driftwood-one-stretch (must pass) | 15, 32, 23 | 1, 1, 1 |
| alt driftwood-in-water (1.1-1.9 m) | 77, 86, 89 | 0, 0, 0 |
| alt driftwood at exactly 2.0 m (inside of bends dips under 2 m) | 77, 87, 90 | 0.429, 0.368, 0.433 |
| alt driftwood at 2.2 m (must pass) | 77, 87, 90 | 0.961, 0.931, 0.933 |
| alt driftwood-wide-bank (6-10 m) | 77, 86, 89 | fails |
| alt driftwood 20 m in the air | 77, 86, 89 | 0, 0, 0 |

2 m is the stated water's edge; 8 m is "close to it" as the brief states it.
The reference lays driftwood 3.2-5.8 m out.

### driftwood-follows-course (hard) — >= 8 of 10 stretches

The river's parts inside the ground's bounds are sampled every 0.5 m and
joined in order by in-bounds arc only; each log within 25 m maps to its
nearest sample's stretch. Reading every nearby log, not only on-bank ones, is
what keeps driftwood-inland from failing this too.

| graph | stretches reached |
|---|---|
| reference | 10, 10, 10 |
| neg driftwood-inland (must pass) | 10, 10, 10 |
| neg driftwood-one-stretch (first 30% only) | 3, 3, 3 |
| alt two pieces east-first / west-first | 10 / 10 (was 4 / 10) |
| alt river loops 45 m off the ground | 10 (was 6-8) |
| alt banks without the water strip | 10 (was 0) |

## Negatives

Each validates, cooks, is deterministic and partition-safe, fails exactly its
named hard check at all three seeds and passes the other six:
`uniform-trees`, `constant-scale`, `trees-in-water`, `floating-trees`,
`driftwood-inland`, `driftwood-one-stretch`, `short-river`. Each is the
reference with one node's params edited or one node inserted; its
`meta.description` says what.

Verdicts of the second verifier's plausible-correct alternatives on the final
check: disc ground, rolling ground (+-7 m), a 6300-tree forest, non-uniform
scale, a diagonal river, a river leaving the ground briefly — all solved.
"Only height shrinks by the water" fails trees-smaller-by-the-water (0.77),
which is right by the brief's stated size metric (mean of the three axes).

## Budget — 90 turns, 45 minutes

The 2026-08-17 blind run (repo CLI only) records eight probes on the file
format, `pcg nodes`/`pcg fields` reads for the fields it wrote, four scratch
graphs to verify the outcome numerically, and a clean cook on its second
write; the log does not count its turns. A Sonnet-class agent in a clean
sandbox can read the shipped docs instead of bisecting the format, but this
task has four outputs, three field-driven decisions, a curve offset (the
perpendicular to the river), and seven stated numbers it has to measure its
own graph against. 90 turns is an estimate for the pilot's turn counts to
correct, not a measurement: a cap hit is a failure class the report shows.
45 minutes allows ~30 s per turn; cooks themselves are ~50 ms.

## Tier

Corpus-adjacent and public regardless: the brief is quoted in
`PLAN-agent-authoring.md` and the solution ships in the package as
`graphs/examples-riverbank.json`. This task measures continuity with the
original log, not generalization.
