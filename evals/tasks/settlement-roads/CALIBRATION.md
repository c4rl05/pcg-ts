# settlement-roads — calibration

Package under test: pcg-ts 0.17.0 (the U0 baseline install). Every number
below was measured with `evals/harness/score.mjs` (task seeds 51007, 1, 2) or,
for the wider sweeps, by cooking the same graph at seeds 51007, 1, 2 and 3..39
and running this `check.mjs` on the result.

## Tier

corpus-adjacent. `graphs/pipeline-5-roads.json` joins district centres into a
road network with `connectPoints` in `relativeNeighborhood` mode, and
`graphs/basics-gabriel-cells.json` shows all three connection modes side by
side; the `connectPoints` node description itself says the lune-test network
"contains a minimum spanning tree" (connected) and the gabriel description says
it is a subset of the Delaunay edges (planar). The reference is three nodes
(scatter, `selfPrune`, `connectPoints`), so the only real discovery is which
mode is planar and that `radius` must cover the region.

## Planar-network claim, measured

The docs claim the lune-test network is planar and connected. Measured, not
assumed: the reference cooked at 40 seeds (51007, 1, 2, 3..39) gave 0 crossing
pairs and 1 component at every seed (35-48 settlements, 41-59 roads). A
`gabriel` alternative over a `localMaximum` prune also gave 0 crossings at 20
seeds (it failed only the settlement count at 5 of them, since it used more
candidates). The equality check is known to be able to say "different": the
same settlements joined by `radius` 150 give 418-1735 crossing pairs.

## Checks

### settlements (hard)

count 30-50, inside +-200 m (+0.01 m slack), |y| <= 0.5, closest pair >= 25 m
(-0.01 m slack for f32 positions). All four numbers are stated in the brief.

| graph | 51007 | 1 | 2 |
|---|---|---|---|
| reference | 37, closest 25.221 m | 37, 25.497 m | 41, 25.113 m |
| unspaced-settlements (40 scattered, no prune) | 40, closest 7.544 m | 40, 12.778 m | 40, 4.354 m |

Reference count over 40 seeds: 35-48 (margin 5 below, 2 above at the extremes;
37/37/41 at the task seeds, margin >= 7 / 9). The reference scatters over
+-190 m, 10 m inside the square. The spacing margin on the reference side is
structural (a 25 m prune can never produce less than 25 m; the smallest
observed is 25.062 m); on the negative side 40 unpruned points over the square
leave an expected ~9.6 pairs under 25 m, so P(no such pair) is about e^-9.6,
and the worst task-seed value is 12.8 m, 12 m under the threshold.

### roads-are-segments (hard)

every polyline exactly 2 vertices, each end within 0.5 m of a settlement
(brief), the two ends different settlements, at least one polyline.

| graph | 51007 | 1 | 2 |
|---|---|---|---|
| reference | 46 roads, 0 multi-vertex, 0 unmatched ends | 41, 0, 0 | 47, 0, 0 |
| resampled-roads (`pathResample` every 10 m) | 46 roads, 46 multi-vertex, 0 unmatched | 41, 41, 0 | 47, 47, 0 |

The reference's road ends ARE the settlement points (0 m), so the 0.5 m
tolerance only forgives an agent that rebuilt the ends from a copy. The
resampled roads keep their true endpoints, which is why they still pass
`connected` and `no-crossings`.

### no-crossings (hard)

`findCrossings` over every straight piece of every road, after snapping any
vertex within 0.5 m of a settlement onto that settlement (so roads meeting at a
settlement share an exact endpoint), eps 1e-4 (the collinearity scale, about
4e-2 m^2 in orientation units for 400 m pieces). Threshold: 0 crossings.

| graph | 51007 | 1 | 2 |
|---|---|---|---|
| reference | 46 pieces, 0 | 41, 0 | 47, 0 |
| resampled-roads | 286 pieces, 0 | 234, 0 | 252, 0 |
| radius-links (every pair < 150 m) | 224, 801 | 182, 418 | 297, 1735 |

The resampled negative is the check on false positives: consecutive collinear
pieces of one road and many-vertex roads meeting at a settlement report 0.

Everything here, and the settlement spacing, is measured on the ground plane
(X and Z, height ignored); task.json says so since the final verification. The
same road laid twice (both ends shared) counts as an intersection and is now
reported apart from true crossings: the reference network merged with itself
reads 46 / 41 / 47 duplicates and 0 other crossings at the three seeds, with
the message "N roads are laid twice over the same stretch between the same two
settlements" instead of "intersect away from a shared settlement". Harness
table unchanged after the edit (reference solved; each negative fails only its
check, 3/3).

### connected (hard)

one union-find component over the settlements, linking the settlements matched
by each road's first and last vertex.

| graph | 51007 | 1 | 2 |
|---|---|---|---|
| reference | 1 | 1 | 1 |
| divided-network (roads spanning x = 0 removed) | 2 (20 + 17) | 2 (21 + 16) | 2 (21 + 20) |
| short-reach (`radius` 60) | 9 | 8 | 8 |

Over 20 seeds divided-network failed `connected` 20/20 and short-reach 20/20.

### every-settlement-has-a-road (soft)

0 isolated settlements. Soft because for n >= 2 an isolated settlement is also
a second component, so no negative can fail it alone. Reference: 0 at every
seed. short-reach: 4 / 4 / 3 isolated. divided-network: 0 at the task seeds
(at 5 of 20 seeds some settlement's only roads spanned the line, leaving it
isolated).

## Negatives

| negative | fails | plausible because |
|---|---|---|
| resampled-roads | roads-are-segments | an agent that "smooths" or densifies roads, or builds roads as paths through resampled points |
| radius-links | no-crossings | the first `connectPoints` mode, and the default one |
| divided-network | connected | a network built half by half (or per cell) and never stitched |
| short-reach | connected | `radius` left at a local neighbour distance, as the corpus graphs set it (70, 4.5) |
| unspaced-settlements | settlements | a scatter with the spacing rule forgotten |

All five validate, cook, and are deterministic and partition-safe at every task
seed, and fail their named hard check at 3/3 seeds and no other hard check.

## Budget

60 turns / 30 minutes. The riverbank blind run (four outputs, noise-shaped
density and scale bands) is budgeted 90 / 45. This task is three nodes once the
right `connectPoints` mode is found, and the node description names both
properties the brief asks for, but a blind agent still has to discover the graph
format, the output declaration, that `radius` must span the whole 400 m square
(the corpus uses 70 and 4.5, which disconnect this world), and that the prune
must not leave the count outside 30-50. Two-thirds of riverbank's budget.

## Pitfalls hit

- The corpus `radius` values (70 in pipeline-5-roads) disconnect a 400 m world
  of 30-50 settlements: 60 gives 8-9 components. The reference uses 600
  (beyond the 566 m diagonal).
- A `pointScatterInBounds` of 56 candidates over +-190 m pruned (greedy) at
  25 m lands at 35-48; 70 candidates over +-199 m pruned with `localMaximum`
  reached 52-53 at 5 of 20 seeds, so the count band is a real constraint.
