# riverbank — calibration

Measured 2026-09-15 with `evals/harness/score.mjs` against the U0 baseline
tarball `baseline-0.17.0-0ad6998.tgz`, installed into a temp project. Seeds
`[20260816, 1, 2]` — the reference graph's own seed plus two others. Every
number below is a check's `value` from that run, per seed in that order.

## Reference

`reference.graph.json` is `graphs/examples-riverbank.json` with its long
description dropped: the graph the original blind run produced, since fixed
only in spelling. It is public anyway (see `tierReason`).

Two properties of it matter for the checks:

- The river is shaped by noises with LITERAL seeds, so it does not move with
  the graph seed — the trees, their thinning and the driftwood do. Checks that
  hold at all three seeds are therefore holding over three tree/driftwood
  draws against one river.
- The trees' distance is measured by the graph to 1.2 m spline samples; the
  checks measure to the `river` output's own polyline (48 control points).
  The gap is small next to every threshold (minimum tree clearance 4.52 by
  the check against 4.5 in the graph's own predicate).

## Checks

Distances are planar (XZ) to the `river` polyline, exact per segment.

### river-runs-through (hard) — threshold 0.8

Share of the ground's extent (larger axis) crossed by the river inside the
ground's bounds.

| graph | values |
|---|---|
| reference | 0.996, 0.996, 0.996 |
| short-river (44 m of river mid-ground) | 0.293, 0.293, 0.293 |

### tree-density-rises (hard) — far/near >= 1.25, band steps >= 0.85, near band non-empty

Trees per 100 m² over four equal-area distance bands. The area is a 240 x 240
cell estimate over the ground footprint clipped to the trees' bounds, keeping
only cells at least as far from the river as the nearest tree.

| graph | per-100 m² bands (seed 20260816) | far/near | smallest step |
|---|---|---|---|
| reference | 4.77, 7.89, 8.59, 8.82 | 1.850, 1.765, 1.928 | 1.027, 1.017, 1.064 |
| uniform-trees (one keep probability past a 4.5 m strip) | 7.88, 7.67, 7.41, 7.83 | 0.995, 0.989, 0.936 | 0.967, 0.949, 0.963 |
| short-river (must pass) | 6.56, 8.37, 8.99, 8.87 | 1.353, 1.387, 1.370 | 0.987, 1.021, 1.016 |

Why the cut at the nearest tree's distance: without it the same check put
uniform-trees at far/near 1.465, 1.443, 1.370 (the bare 4.5 m strip reads as
"thinning" in the near band) against the reference's 3.485, 3.013, 3.417 —
separable, but a bare strip is what `tree-clearance` judges, and density
should not get credit for it twice.

Threshold 1.25 sits 0.25 above the worst uniform value and 0.52 below the
worst reference value. The step floor 0.85 only rejects a band that drops
sharply; the reference's worst step is 1.017 and uniform-trees' 0.949, so the
step floor is not what fails uniform-trees — far/near is. The short-river
negative's 1.353 is the closest legitimate pass: its trees really do thin
toward the shorter river, over less of the ground.

### tree-scale-rises (hard) — far/near >= 1.3, steps >= 0.95

Mean instance scale (mean of the three transform column lengths) per band.

| graph | means (seed 20260816) | far/near | smallest step |
|---|---|---|---|
| reference | 0.585, 0.908, 1.190, 1.241 | 2.121, 2.200, 2.139 | 1.043, 1.057, 1.066 |
| constant-scale (0.8-1.2 everywhere) | 1.003, 1.001, 0.999, 0.993 | 0.990, 1.013, 0.994 | 0.994, 0.997, 0.983 |

### tree-clearance (hard) — nearest tree >= 2.0 m

2.0 m is the water's half-width, stated in the brief's contract.

| graph | nearest tree (m) |
|---|---|
| reference | 4.522, 4.530, 4.680 |
| uniform-trees (must pass) | 4.496, 4.507, 4.508 |
| trees-in-water (ramp floor 0.12 at the water, no gate) | 0.010, 0.092, 0.037 |

### driftwood-on-bank (hard) — >= 10 pieces, >= 90% within 1-8 m

| graph | count | share within 1-8 m |
|---|---|---|
| reference | 77, 86, 89 | 1.000, 1.000, 1.000 |
| driftwood-inland (12-18 m out) | 77, 86, 89 | 0.013, 0.012, 0.079 |
| driftwood-one-stretch (must pass) | 18, 35, 24 | 1.000 each |

The reference lays driftwood 3.2-5.8 m from the centre line, 1.2-3.8 m past
the stated water's edge; the band is that with a metre or more either side.

### driftwood-follows-course (hard) — >= 8 of 10 equal arc stretches

Driftwood within 25 m of the river, projected to arc length over the stretch
of river inside the ground's bounds. Reading every nearby log rather than
only the on-bank ones is what keeps driftwood-inland from failing this too.

| graph | stretches reached |
|---|---|
| reference | 10, 10, 10 |
| driftwood-inland (must pass) | 10, 10, 10 |
| driftwood-one-stretch (first 30% of the river only) | 3, 3, 3 |

## Negatives

Each validates, cooks, is deterministic and partition-safe, fails exactly its
named hard check at all three seeds and passes the other five:
`uniform-trees`, `constant-scale`, `trees-in-water`, `driftwood-inland`,
`driftwood-one-stretch`, `short-river`. Each is the reference with one node's
params edited; its `meta.description` says what.

## Budget — 90 turns, 45 minutes

The 2026-08-17 blind run (repo CLI only) records eight probes on the file
format, `pcg nodes`/`pcg fields` reads for the fields it wrote, four scratch
graphs to verify the outcome numerically, and a clean cook on its second
write; the log does not count its turns. A Sonnet-class agent in a clean
sandbox can read the shipped docs instead of bisecting the format, but this
task has four outputs, three field-driven decisions and a curve offset (the
perpendicular to the river), and verifying "thins toward the water" needs
banded measurements it has to build itself. 90 turns is an estimate to be
corrected by the pilot's turn counts, not a measurement: the pilot records
turns per run, and a cap hit is a failure class the report shows. 45 minutes
allows ~30 s per turn; cooks themselves are ~50 ms.

## Tier

Corpus-adjacent and public regardless: the brief is quoted in
`PLAN-agent-authoring.md` and the solution ships in the package as
`graphs/examples-riverbank.json`. This task measures continuity with the
original log, not generalization.
