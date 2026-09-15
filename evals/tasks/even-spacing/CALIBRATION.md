# even-spacing — calibration

Every threshold in `check.mjs` was placed between measured values. Package under
test: pcg-ts 0.17.0 (the U0 baseline install). Seeds scored: `[20260915, 1, 2]`
(the reference graph's own seed, then 1 and 2). "Sweep" rows cook the same graph
at every seed in the range and run `check.mjs` on each.

## Graphs measured

| graph | what it is |
| --- | --- |
| reference | the even-fill primitive over [-50, 50]² at y = 0, spacing 4 m, 16000 candidates, spawned as `marker` |
| neg `jittered-grid` | a 20 × 20 grid at 5 m, each point jittered up to ±2.4 m in x and z, no spacing rule |
| neg `over-pruned` | the reference with spacing 5 m ("for safety") |
| neg `oversized-square` | the fill over [-52, 52]² with 10000 candidates: right count, markers up to 2 m past the edge |
| neg `bare-strip` | the fill over x in [-50, 40]: a bare 10 m strip along one edge (the final verifier's `es-strip`, re-authored) |
| alt `default-count` | the reference with the primitive's default 4000 candidates (a correct solution) |
| alt `3000` | the reference with 3000 candidates (a correct solution at the count floor) |
| alt `uniform-scatter` | a plain box scatter of exactly 400 points (was a negative; retired, see below) |
| alt `off-centre` | the fill over [0, 100]² (was a negative; retired, see below) |
| alt `relaxed` | 400 scattered points relaxed three times (strength 0.5, radius 5) instead of pruned |
| alt `1000` / `64000` / `250000` | the reference at other candidate counts, to find the count's ceiling |

## marker-count — 340 ≤ count ≤ 460 (hard)

| graph | 20260915 | 1 | 2 | sweep |
| --- | --- | --- | --- | --- |
| reference | 413 | 413 | 412 | seeds 1–300: 397–426 |
| alt default-count (4000) | 370 | 361 | 372 | seeds 1–300: 351–390 |
| alt 3000 candidates | 353 | 353 | 355 | seeds 1–300: 340–369 |
| neg over-pruned (5 m) | 270 | 277 | 270 | seeds 1–100: 264–282 |
| neg jittered-grid | 400 | 400 | 400 | exact |
| neg oversized-square | 434 | 427 | 433 | seeds 1–100: 419–439 |
| neg bare-strip | 374 | 374 | 368 | seeds 1–100: 362–383 |
| 1000 candidates (node id `even`) | 281 | 290 | 282 | |
| 64000 candidates (node id `even`) | 424 | 431 | 431 | |
| 250000 candidates (node id `even`) | 438 | 438 | 444 | |

The kept count of a greedy prune is emergent and climbs toward a ceiling near
0.7 × area / spacing² = 437.5 (the edges add a few: 444 measured at 250k
candidates), so a 4 m prune stays under 460 at any candidate count measured. A
regular lattice at 4 m would hold about 650 and fail the count; at 5 m (441) it
passes, which is fine — the brief asks for an outcome, not a random look. The
band is "about 400", ±15%.

- Reference margin: 57 above the floor (sweep minimum 397), 34 below the ceiling
  (sweep maximum 426).
- Over-pruned: 58 below the floor at its sweep maximum (282).
- The primitive's DEFAULT candidate count is a correct solution and passes at
  every seed of 300 with its lowest count 351, 11 above the floor. That is the
  tightest margin in the task, and deliberate: an agent is not failed for not
  raising a knob the brief never mentions. 3000 candidates touches the floor
  exactly (340, inclusive) at its worst seed; 1000 candidates (281–290) is the
  under-scattered mistake and fails.

## inside-square — |x|, |z| ≤ 50 and |y| ≤ 0, tolerance 0.01 m + 1e-9 (hard)

The brief states that a marker's instance origin is its foot on the ground, so
the transform translation is what is read.

| graph | farthest abs x/z at 20260915 / 1 / 2 | outside | sweep |
| --- | --- | --- | --- |
| reference | 49.9901 / 49.9805 / 49.993 | 0 | seeds 1–300: max 50.000, all pass |
| neg oversized-square | 51.980 / 51.980 / 51.989 | 48 / 52 / 53 | seeds 1–100: 51.889–52.000, all fail |
| alt off-centre | 99.958 / 99.952 / 99.972 | 311 / 301 / 306 | |
| alt relaxed | 53.18 / 54.25 / 53.96 | 13 / 28 / 24 | |

y is exactly 0 in every graph measured. The scatter reaches the edge exactly
(50.000 in the sweep), so the 0.01 m tolerance only absorbs float rounding; the
oversized square is 1.88 m past it at its closest.

## min-spacing — closest pair ≥ 4 − 0.001 − 1e-9 m, planar (hard)

| graph | 20260915 | 1 | 2 | sweep |
| --- | --- | --- | --- | --- |
| reference | 4.0007 | 4.001 | 4.0002 | seeds 1–300: 4.000–4.010, all pass |
| neg jittered-grid | 0.5609 | 0.4852 | 0.7403 | seeds 1–100: 0.298–1.383 |
| neg over-pruned | 5.0014 | 5.0002 | 5.0001 | |
| neg oversized-square | 4.0011 | 4.0011 | 4.0036 | seeds 1–100: all pass |
| neg bare-strip | 4.0011 | 4.0007 | 4.0012 | seeds 1–100: all pass |
| alt uniform-scatter | 0.0426 | 0.0965 | 0.2258 | seeds 1–100: 0.01–0.43 |
| alt relaxed | 0.1817 | 0.0929 | 0.0852 | |

The prune's spacing is exact (the closest pair lands at 4 m plus rounding), so
the 1 mm tolerance only keeps a correct prune from failing on rounding. Jitter on
a grid, a uniform scatter and relaxation all leave pairs well under 4 m.

## no-holes — every 10 m cell holds a marker (hard)

The brief states the grid: a 10 × 10 grid of 10 m squares, edges on multiples of
10 m, every one holding a marker. A marker within the square's 0.01 m tolerance
counts in the edge cell.

| graph | empty cells at 20260915 / 1 / 2 | fewest in a cell | sweep |
| --- | --- | --- | --- |
| reference | 0 / 0 / 0 | 2 / 2 / 2 | seeds 1–300: never empty, fewest 1–3 |
| alt default-count (4000) | 0 / 0 / 0 | 1 / 2 / 1 | seeds 1–300: never empty; the same fill under node id `even`, seeds 1–1000: never empty |
| alt 3000 candidates | 0 / 0 / 0 | 1 / 1 / 1 | seeds 1–300: never empty |
| neg over-pruned (5 m) | 0 / 0 / 0 | 1 / 2 / 1 | seeds 1–100: never empty |
| neg oversized-square | 0 / 0 / 0 | 1 / 2 / 2 | seeds 1–100: never empty |
| neg jittered-grid | 0 / 0 / 0 | 4 / 4 / 4 | every cell holds exactly its 4 jittered grid points by construction |
| neg bare-strip | 10 / 10 / 10 | 0 | seeds 1–100: always 10 |
| alt uniform-scatter | 1 / 1 / 2 | 0 | seeds 1–100: 0–8, no empty cell at only 10 seeds |
| alt off-centre | 75 / 75 / 75 | 0 | |

**Soft, then hard (final-verification round).** This started soft, because a
uniform scatter only USUALLY leaves an empty cell. The delta verifier pointed out
that the brief states it as a requirement, so a graph that fills 90% of the
square was solved. Measured: no correct fill has ever left a 10 m cell empty —
0 of 1000 seeds at the primitive's default count, 0 of 300 at 3000 candidates
(a fill already at the count floor), 0 of 300 for the reference, 0 of 100 at a
5 m spacing. The reason is geometric: once the fill is near saturation, every
point of the square is within about 4 m of a marker, and a cell's centre is 5 m
from its edges, so the marker that covers the centre lies inside the cell. It is
now hard. The pass condition stays at zero empty cells; the margin on the
correct side is "fewest in a cell" never below 1 in 1900 correct-fill seeds, and
a partial fill leaves whole rows of cells empty (10 for a 10 m strip).

Making it hard retired two negatives that would now fail two hard checks each:
`uniform-scatter` (spacing, plus an empty cell at 90% of seeds) became
`jittered-grid`, which fills every cell by construction and fails only the
spacing. `off-centre` (bounds, plus 75 empty cells) became `oversized-square`,
which still covers the whole square. `bare-strip` is the new negative for this
check.

## Negatives, one hard check each

Each negative was scored at the three task seeds and swept over seeds 1–100. At
every one of those seeds it fails its named check and passes every other hard
check.

| negative | fails | passes |
| --- | --- | --- |
| jittered-grid | min-spacing | marker-count, inside-square, no-holes |
| over-pruned | marker-count | inside-square, min-spacing, no-holes |
| oversized-square | inside-square | marker-count, min-spacing, no-holes |
| bare-strip | no-holes | marker-count, inside-square, min-spacing |

## Float slack and brief conventions (final-verification round)

- Every inclusive comparison carries `EPS = 1e-9` on top of its stated tolerance
  (`<= 50 + 0.01 + 1e-9`, `<= 0.01 + 1e-9`, `>= 4 - 0.001 - 1e-9`), so a value
  exactly on a stated limit is never rejected by rounding. No measured value
  moved.
- min-spacing fails (instead of passing on Infinity) when the positions are not
  finite, and is not measured above 50,000 markers.

## Budget — 40 turns, 20 minutes

One output and a two-node solution: a spaced fill and a spawner. A blind agent
still has to discover the graph format (read the skill/authoring doc, list node
types or primitives, find how a primitive is referenced), then validate, cook,
and inspect the count, and probably adjust the candidate count or the bounds
once. Around 15 productive tool calls; 40 turns leaves room for format errors
and a wrong first approach (relaxation, jitter, or a bare scatter). Riverbank,
with four outputs and six checks including curve-relative banding, is budgeted
90 / 45; this is well under half its surface. 20 minutes covers the cooks, which
take milliseconds here.

## Tier

Corpus-adjacent: `graphs/basics-even-spacing.json` ships in the installed package
and is the solution with a different square, spacing and candidate count; the
fill/scatter-even primitive is the same thing as one node. Not reserve.

## Pitfalls hit

- The kept count depends on the node id as well as the seed (the node's seed is
  derived from it): the same graph with the fill node named `even` instead of
  `spread` keeps 410 instead of 413 at the reference seed. Counts in this file
  are for the graphs as committed unless a row says otherwise.
- The default `boundsMin` of the even-fill primitive is the origin, not a centred
  box, so "a square not centred on the origin" is a live mistake — but it also
  leaves 75 cells of the square empty, so once no-holes is hard it cannot be a
  single-check negative.
