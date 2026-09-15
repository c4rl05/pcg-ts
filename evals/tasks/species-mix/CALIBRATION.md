# species-mix — calibration

Every threshold in `check.mjs` was placed between measured values. Package under
test: pcg-ts 0.17.0 (the U0 baseline install). Seeds scored: `[20260916, 1, 2]`
(the reference graph's own seed, then 1 and 2). "Sweep" rows cook the same graph
at every seed in the range and run `check.mjs` on each.

## Graphs measured

| graph | what it is |
| --- | --- |
| reference | the round scatter (radius 50, 1910 candidates, ~78.5% kept), a string attribute from `["oak","birch","pine"]` with weights 6/3/1 chosen by a per-point random, spawned by that attribute |
| neg `equal-thirds` | the reference without weights |
| neg `square-patch` | a plain 100 m box scatter of exactly 1500 points with the reference's species |
| neg `split-by-side` | all oak where x < 0; where x ≥ 0, oak 20% / birch 60% / pine 20% — grove-wide 60/30/10 |
| neg `fallback-id` | weights 54/27/9 plus an empty fourth entry at 10, so 10% of trees fall back to the spawner's default id `tree` |
| neg `candidates-as-count` | the reference asking the round scatter for 1500 candidates, taking the candidate count for the tree count |
| neg `diameter-as-radius` | the reference at radius 25 m (50 m read as the circle's width), same candidates, so the same count |
| alt `sm-small` | the final verifier's 15 m grove (`verify-final/a/sm-small.graph.json`) |
| alt `r45` | the reference at radius 45 m |
| alt `half` | the reference with twice the candidates, keeping only x >= 0 (a half circle of about 1500 trees) |
| alt `box-filter` | a box scatter filtered to the circle, species by index into a ten-entry list (6 oak, 3 birch, 1 pine) — a correct solution |
| alt `noise-stands` | species by thresholds on a node-seeded noise at frequency 0.03 (stands ~30 m across) |
| alt `noise-stands-fine` | the same at frequency 0.1 (patches ~10 m across) |

## Why these numbers

- **Radius 50 m, about 1500 trees.** A per-tree random draw at N = 1500 has a
  share standard deviation of 1.26 points for oak (p = 0.6), 1.18 for birch and
  0.77 for pine, so the ±5-point band sits at 3.96 σ on the noisiest kind. The
  suggested 40 m radius at this count would be a nursery (0.3 trees/m²); 50 m
  gives about 0.19 trees/m², roughly 2.3 m between trees.
- **60 / 30 / 10, not 50 / 30 / 20.** The multi-asset primitive spreads over
  exactly four entries. Its nearest four-entry mix to 50/30/20 is 50/25/25, which
  lands exactly on the ±5 edge and would pass or fail by coin flip. Against
  60/30/10 every four-entry mix fails clearly (50/25/25 is 10 and 15 points off;
  75/25/0 drops pine). An agent has to find weights, a longer list, or a quota.

## tree-count — 1300 ≤ count ≤ 1700 (hard)

| graph | 20260916 | 1 | 2 | sweep |
| --- | --- | --- | --- | --- |
| reference | 1483 | 1511 | 1501 | seeds 1–1500: 1447–1551 |
| neg candidates-as-count | 1161 | 1186 | 1181 | seeds 1–100: 1135–1224 |
| neg square-patch | 1500 | 1500 | 1500 | exact |
| alt box-filter | 1479 | 1498 | 1476 | |

Reference margin: 147 above the floor, 149 below the ceiling (sweep extremes).
Candidates-as-count: 76 below the floor at its sweep maximum.

## species-ids — exactly {oak, birch, pine} (hard)

Reference: oak/birch/pine only at every seed. `fallback-id` adds `tree` at
143 / 145 / 159 instances (fails at all 100 swept seeds). Every other graph
passes at every swept seed.

## species-shares — each named kind within ±5 points of 60 / 30 / 10 (hard)

The shares are taken over the oak, birch and pine instances only, so an extra id
fails `species-ids` without also failing this check (and a missing kind still
fails here, at 0%).

| graph | worst deviation, points: 20260916 / 1 / 2 | sweep |
| --- | --- | --- |
| reference | 0.49 / 1.17 / 1.04 | seeds 1–1500: max 4.46, p99 3.48, never fails |
| neg equal-thirds | 24.46 / 27.11 / 27.55 | seeds 1–100: min 23.59 |
| neg fallback-id | 0.82 / 1.58 / 0.55 | seeds 1–100: max 3.43 |
| neg split-by-side | 0.47 / 3.02 / 0.86 | seeds 1–100: max 3.22 |
| neg candidates-as-count | 0.63 / 0.94 / 1.57 | seeds 1–100: max 4.19 |
| neg square-patch | 2.40 / 0.60 / 1.20 | seeds 1–100: max 3.27 |
| alt box-filter | 0.78 / 0.39 / 1.80 | |
| alt noise-stands | 9.49 / 9.02 / 2.06 | |

The ±5 band was set by the task design; the measurement is that a correct random
draw at this count never left it in 1500 seeds (worst 4.46, a 0.54-point margin
at the extreme and 1.5 at p99). Zero failures in 1500 seeds bounds the per-seed
rate below 0.2% (95%), so a correct random-draw graph scored at three seeds
fails spuriously less than 1% of the time. Equal thirds is 18.6
points past the band at its closest.

## inside-grove — every tree within 50 + 0.01 m of the origin, planar (hard)

| graph | farthest, m: 20260916 / 1 / 2 | outside | sweep |
| --- | --- | --- | --- |
| reference | 49.9871 / 49.9593 / 49.9878 | 0 | seeds 1–100: max 50.000 |
| neg square-patch | 68.98 / 69.62 / 70.64 | 337 / 306 / 323 | seeds 1–100: min 67.44 |
| alt box-filter | 49.995 / 49.981 / 49.989 | 0 | |

The round scatter reaches the rim exactly, so the 1 cm tolerance absorbs only
rounding. The square's corners stand 17 m or more past it.

## mixed-through — same-kind pairs within 5 m at most 4 points above chance (hard)

Over every pair of trees within 5 m of each other (about 10,500 pairs in the
reference), the percentage of same-kind pairs minus Σ share² of the grove's own
ids. The chance term uses the grove's own shares, so the check is independent of
whether the shares are right (equal thirds sits at chance 33%, not 46%).

| graph | excess, points: 20260916 / 1 / 2 | sweep |
| --- | --- | --- |
| reference | 0.28 / 0.01 / −0.59 | seeds 1–1500: −1.57 to 1.63, p99 1.09 |
| neg split-by-side | 22.74 / 25.21 / 23.33 | seeds 1–100: 21.49–27.59 |
| neg equal-thirds | −0.71 / −0.14 / −0.73 | seeds 1–100: max 1.09 |
| neg fallback-id | 0.28 / 0.08 / −0.90 | seeds 1–100: max 1.35 |
| neg candidates-as-count | 0.36 / −0.37 / −0.58 | seeds 1–100: max 1.89 |
| neg square-patch | 0.70 / 0.39 / 0.09 | seeds 1–100: max 1.64 |
| alt box-filter | −0.08 / −0.04 / 1.61 | |
| alt noise-stands (30 m) | 36.44 / 31.10 / 34.67 | |
| alt noise-stands-fine (10 m) | 9.25 / 9.61 / 8.58 | seeds 1–200: 5.71–13.19 |

Threshold 4 points: 2.37 above the worst correct draw in 1500 seeds, 1.71 below
the least-clumped 10 m patch grove in 200 seeds (about midway, 3.67).

## fills-grove — ≥ 44% of trees beyond 35 m, and every wholly-inside 10 m square occupied (hard)

Added in the final-verification round: `inside-grove` bounds the radius only from
above, so the verifier's 15 m grove was solved at score 1.0 although the brief
says the grove IS the 50 m circle. Two parts, both stated in the brief:

- **Outer share.** 1 − (35/50)² = 51% of the circle's area lies beyond 35 m, so a
  uniform fill puts about 51% of its trees there (binomial SD about 1.3 points).
- **Coverage.** The 60 squares of the 10 m grid (edges on multiples of 10 m)
  whose farthest corner is within 50 m. At about 0.19 trees/m² each square
  expects about 19 trees, so an empty one means a missing part of the circle —
  a half circle has the right outer share but leaves 30 squares empty.

| graph | beyond 35 m, %: 20260916 / 1 / 2 | empty squares | sweep |
| --- | --- | --- | --- |
| reference | 51.92 / 51.36 / 48.77 | 0 / 0 / 0 | seeds 1–1500: 46.61–55.28, never an empty square |
| neg diameter-as-radius (25 m) | 0 / 0 / 0 | 28 / 28 / 28 | seeds 1–100: 0%, 28–29 empty |
| neg candidates-as-count | 52.71 / 51.52 / 48.09 | 0 | seeds 1–100: 47.65–54.81, never empty |
| neg square-patch | 62.60 / 60.67 / 64.00 | 0 | seeds 1–100: 58.6–64.07, never empty |
| alt sm-small (15 m) | 0 / 0 / 0 | 46 / 44 / 45 | |
| alt r45 | 40.05 / 39.84 / 38.44 | 0 | seeds 1–100: 37.09–43.07 |
| alt half circle | 51.39 / 51.30 / 49.93 | 30 / 30 / 30 | |
| alt box-filter | 50.30 / 50.07 / 47.70 | 0 | |

Equal-thirds, fallback-id and split-by-side use the reference's round scatter
unchanged (same node id and params), so their positions — and this check — are
the reference's at every seed.

Threshold 44%: 2.61 points below the lowest correct fill in 1500 seeds, 0.93
above the highest 45 m grove in 100 seeds. It sits nearer the too-small side on
purpose: a 45 m grove is only a mild miss, while a correct fill must never fail.
A grove kept 2 m in from the rim "to be safe" (48 m, 46.8% expected) still
passes.

## Float slack (final-verification round)

The verifier found exactly 65% oak rejected: `|975/1500 - 0.6|` evaluates to
0.050000000000000044 > 0.05, though the brief's "within 5 points" includes 5.
Every inclusive comparison now carries `EPS = 1e-9` (shares, radius, pair
excess, outer share). No measured value in any table moved.

## Negatives, one hard check each

Every negative was swept over seeds 1–100 as well as scored at the three task
seeds: each fails its named check at every one of those seeds and passes every
other hard check at every one (fills-grove for the five earlier negatives: the
three that share the reference's scatter inherit its 1500-seed pass, the other
two were swept above).

| negative | fails | passes |
| --- | --- | --- |
| equal-thirds | species-shares | tree-count, species-ids, inside-grove, mixed-through, fills-grove |
| square-patch | inside-grove | tree-count, species-ids, species-shares, mixed-through, fills-grove |
| split-by-side | mixed-through | tree-count, species-ids, species-shares, inside-grove, fills-grove |
| fallback-id | species-ids | tree-count, species-shares, inside-grove, mixed-through, fills-grove |
| candidates-as-count | tree-count | species-ids, species-shares, inside-grove, mixed-through, fills-grove |
| diameter-as-radius | fills-grove | tree-count, species-ids, species-shares, inside-grove, mixed-through |

diameter-as-radius over seeds 1–100: count 1457–1545, worst share deviation
3.84, farthest 25.0 m, pair excess −0.84 to 0.64 — every other check passes at
every seed.

## Budget — 50 turns, 25 minutes

Three nodes (a round scatter, a string attribute, a spawner reading it), but more
to discover than even-spacing: that the spawner can take its asset id from a
per-point attribute, how a string attribute is chosen per point, that 60/30/10
needs weights or a longer list (the four-entry primitive cannot express it),
and that the round scatter's count is a candidate count. Checking the result
means inspecting the per-id batch counts, not just a total. Around 20 productive
tool calls; 50 turns leaves room for one wrong proportion mechanism and a count
fix. Well under riverbank's 90 / 45 (four outputs, six checks); above
even-spacing's 40 / 20.

## Tier

Corpus-adjacent: `graphs/basics-spawn-by-species.json` (per-point string
attribute feeding the spawner) and `graphs/basics-quota-rebalance.json` (a
population held to a stated mix) ship in the installed package, as do the
shape/disc and write/instances-by-species primitives; together they are a
near-solution. Not reserve.

## Pitfalls hit

- **The first mixing check measured regions against the TARGET shares**, which
  made equal-thirds fail mixing as well as shares. Regions were then compared
  with the grove's own shares.
- **Quarter-and-halves regions were then too coarse and too noisy.** With the
  four quarters plus inner and outer halves at a ±10-point band, the reference
  failed at 1 seed of 300 (seed 10: oak 70.9% in one quarter against 59.9%
  overall, 10.97 points) — and a grove planted in ~30 m noise stands scored only
  14–19 points, because a quarter averages over several stands. No band was safe
  for a correct draw and strict for clumps at once. The neighbour-pair measure
  replaced it: the side split and the 30 m stands sit 20+ points above the worst
  correct draw, even 10 m patches sit 4 points above it, and there is no region
  boundary to place.
- **The tail of the quarter-share z-scores is slightly heavy.** Over 1500 seeds ×
  8 quarter-share statistics of the reference (independent draws should give
  z ~ N(0, 1)): variance 1.02, kurtosis 3.06, 37 beyond 3 σ (32 expected), 4
  beyond 4 σ (0.76 expected), 1 beyond 5 σ. Not conclusive and not claimed as a
  library defect; recorded because it is why the per-region band would have
  needed to be so wide.
- The species-shares denominator is the named kinds only, so an extra id and a
  proportion error are separable. A capitalised id (`Oak`) would fail both
  species-ids and species-shares; that was not used as a negative for that
  reason.
