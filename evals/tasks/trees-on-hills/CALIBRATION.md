# trees-on-hills — calibration

Measured 2026-09-15 against the installed 0.17.0 baseline, through
`evals/harness/score.mjs` (seeds 20260915, 1, 2) plus a direct cook for the
unrounded residuals. The terrain in every graph below is a 200 m plane at 64x64
subdivisions displaced by the shipped noise-displacement primitive; its noise
carries a literal seed, so the terrain is the SAME at all three seeds and only
the tree scatter changes. That is intended: the checks must hold for whatever
the scatter does.

## Graphs measured

| graph | what it is | role |
|---|---|---|
| reference | amount 30, frequency 0.02; 5000 surface candidates; keep slope (1 - normal.y) <= 0.1254 (= 1 - cos 29 deg) | reference |
| negatives/no-slope-filter | reference terrain, 3400 candidates, no slope test | fails `trees-on-gentle-ground` |
| negatives/floating | reference with every tree lifted 3 m | fails `trees-on-surface` |
| negatives/flat-terrain | reference with amount 3 | fails `terrain-hilly` |
| negatives/handful | reference with 40 candidates (23-27 trees survive) | fails `gentle-ground-planted` |
| alt-plantable-30deg | vegetation primitive, maxSlope 0.134 (exactly 30 deg), 3000 candidates | alternative, solved |
| alt-plantable-default45 | vegetation primitive at its default maxSlope 0.3 (about 45 deg) | alternative |
| alt-sparse-400 / -700 / -1200 | reference with 400 / 700 / 1200 candidates | alternatives |
| alt-displaced-scatter | flat XZ scatter displaced by the SAME noise as the terrain, never snapped to the mesh | alternative |
| alt-amount-20 | reference with amount 20 | alternative |
| alt-forest-terrain | reference with frequency 0.03 (the corpus forest graph's terrain) | alternative |

The alternatives live in the author's scratch directory, not in this task.

## terrain-hilly

Values identical at all three seeds (the terrain does not read the seed).

REVISED after the final verification (see "Revision 2" below): extent and
holes are now measured on the footprint's convex hull, and relief and steep
share on the UPPER surface only. For every graph below the numbers are
unchanged from the first version because each terrain is an axis-aligned,
open, single-layer plane.

| graph | triangles (upper) | hull narrow / wide m | cover (in hull) | height range m | steep (> 30 deg) fraction | pass |
|---|---|---|---|---|---|---|
| reference | 8192 (8192) | 200 / 282.84 | 1.0 | 22.958 | 0.2653 | yes |
| flat-terrain | 8192 (8192) | 200 / 282.84 | 1.0 | 2.296 | 0.0000 | no |
| toh-rotated (verifier: reference turned 30 deg about Y) | 8192 (8192) | 200 / 282.84 | 1.0 | 22.958 | 0.2653 | yes (failed before revision 2: bbox 273 x 273, cover 0.536) |
| alt-slab (closed 2 m slab, top = reference surface) | 16896 (8192) | 200 / 282.84 | 1.0 | 22.958 | 0.2653 | yes |
| alt-holed (two 90 m halves, 20 m gap) | 7424 (7424) | 200 / 282.84 | 0.9067 | 23.175 | 0.2761 | no (holes) |
| alt-amount-20 | 8192 | 200 / 282.84 | 1.0 | 15.306 | 0.0375 | no (steep) |
| alt-forest-terrain | 8192 | 200 / 282.84 | 1.0 | 23.649 | 0.5308 | no (steep) |

Terrain probe (same plane, subdivisions 64) for the slope distribution —
normalized fBm is bell-shaped, so the steep share moves fast with amount:

| amount / frequency | > 15 deg | > 20 | > 25 | > 30 | > 35 | > 40 | > 50 | range m |
|---|---|---|---|---|---|---|---|---|
| 30 / 0.03 | 0.874 | 0.779 | 0.665 | 0.531 | 0.387 | 0.253 | 0.056 | 23.6 |
| 30 / 0.02 (reference) | 0.760 | 0.598 | 0.431 | 0.265 | 0.133 | 0.049 | 0.001 | 23.0 |
| 40 / 0.015 | 0.766 | 0.615 | 0.444 | 0.281 | 0.138 | 0.052 | 0.001 | 27.3 |
| 20 / 0.02 | 0.537 | 0.308 | 0.133 | 0.038 | 0.005 | 0.000 | 0 | 15.3 |
| 3 / 0.02 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2.3 |

Thresholds (all stated in the brief):

- Hull narrowest width 150-250 m: reference 200, margin 50 each way. Hull
  widest width <= 360 m: reference 282.8 (margin 77); a 250 m square turned
  any way is 353.6 and still passes.
- Cover >= 0.95 of hull grid points under a triangle (spacing narrowest/150,
  about 1.33 m here): reference 1.0; a 20 m gap across a 200 m square reads
  0.907 and fails. A convex outline passes regardless of shape (square, disc,
  hexagon); a strongly concave outline (an L) reads as a hole — stated in the
  brief ("the tightest convex outline").
- Triangles >= 2: reference 8192. A degenerate-input floor only. It was 200
  until the independent verifier built a 9x9 plane displaced by 55 (162
  triangles, steep 30.25%, range 35.8 m) that meets every number the brief
  states and failed on the triangle count alone — a rule the brief never
  stated. Cover and the steep band already reject a mesh too coarse to be hills.
- Height range >= 10 m: reference 22.96 (margin 12.96); flat 2.30 (margin 7.70).
- Steep fraction 0.10-0.50: reference 0.265 (margins 0.165 below, 0.235 above);
  flat 0.000 (0.10 below the floor). The floor is what makes the
  no-slope-filter negative meaningful: any terrain that passes has at least 10%
  steep ground, so planting without a slope test puts at most ~90% of trees on
  gentle ground, below the 95% bar. The ceiling says "rolling hills", not
  cliffs. NOTE: the corpus forest graph's own terrain (frequency 0.03) measures
  0.531 and fails the ceiling by 3.1 points — an agent that copies it without
  measuring fails this check, by design, but the margin on that side is small.

## trees-on-surface

Threshold (revision 3): EVERY tree over the mesh with |tree Y - mesh Y| <=
0.25 m — strict, as the brief says. It was >= 99% until revision 3; the
31-seed sweep below shows no correct variant ever needs the slack.

| graph | seed 20260915 | seed 1 | seed 2 |
|---|---|---|---|
| reference rooted fraction (max gap) | 1.0 (2.16e-6 m) | 1.0 (2.22e-6 m) | 1.0 (2.27e-6 m) |
| floating | 0.0 (gap 3.0) | 0.0 | 0.0 |
| alt-displaced-scatter | 0.7912 (median 0.128, max 0.83) | 0.7909 (max 0.85) | 0.7935 (max 0.92) |

Margins: reference gap ~2e-6 m against 0.25 m; floating 3 m against 0.25 m.
Surface sampling places trees ON the triangles, so the reference residual is
float32 rounding only.

PITFALL (alt-displaced-scatter): scattering flat and displacing the points by
the same noise as the terrain does NOT root them on the mesh, because the mesh
is linear between vertices 3.125 m apart while the noise is not — 21% of trees
end up more than 0.25 m off the delivered surface (up to 0.9 m sunk or
floating). The brief defines the ground as the mesh surface, so this fails on
purpose. The same alternative also fails `trees-on-gentle-ground` (0.74) since
it has no slope test.

## trees-on-gentle-ground

Threshold: >= 95% of trees stand over triangles with slope <= 30 deg (+ 1e-6;
revision 2 — it was `< 30`, stricter than the brief's "steeper than 30", which
counted a tree on an exactly 30 deg face against it; the steep share uses the
complementary `> 30 + 1e-6`). Since revision 3 the brief STATES the
allowance ("at least 95 in every 100 trees"); the 5% slack absorbs a tree sampled on a shared
triangle edge that the lib attributes to the neighbouring triangle, and an
agent whose slope comes from smoothed (vertex-averaged) normals.

| graph | seed 20260915 | seed 1 | seed 2 |
|---|---|---|---|
| reference | 1.0 (steepest under a tree 28.99 deg) | 1.0 (29.00) | 1.0 (29.00) |
| alt-plantable-30deg | 1.0 | 1.0 | 1.0 |
| no-slope-filter | 0.7100 | 0.7129 | 0.7085 |
| alt-plantable-default45 | 0.7332 | 0.7094 | 0.6966 |

Margins: reference 0.05 above; no-slope-filter 0.24 below. The default
vegetation limit (0.3 on the 1 - cos scale, about 45 deg) fails by ~0.23 — the
slope-scale trap the docs warn about.

## gentle-ground-planted

Grid (revision 2): world-aligned 10 m squares with edges at multiples of 10 m,
covering the terrain's bounds (21 x 21 here; the outer row and column lie off
the mesh and are never gentle). A square is "gentle" when >= 19 of the 25
points of a 5 x 5 grid at its 2 m sub-square centres lie over terrain at most
30 deg steep — both numbers now in the brief (the first version said "three
quarters" and kept the 5 x 5 grid to itself). 228 gentle squares on the
reference terrain, exactly as before; the rotated reference has 210, the slab
227. Threshold: >= 2/3 of gentle squares hold a tree.

| graph | trees (per seed) | planted fraction (per seed) |
|---|---|---|
| reference | 3418 / 3348 / 3373 | 1.0 / 1.0 / 1.0 |
| alt-sparse-1200 | 788 / 833 / 789 | 0.895 / 0.934 / 0.912 |
| alt-sparse-700 | 461 / 499 / 478 | 0.768 / 0.785 / 0.776 |
| alt-sparse-400 | 275 / 287 / 263 | 0.583 / 0.601 / 0.561 |
| handful | 23 / 24 / 27 | 0.075 / 0.061 / 0.075 |

The threshold was first set at 0.8; ~480 trees measured 0.77-0.79, a coin flip
across seeds for a moderate forest, so it was lowered to 2/3 and the brief
states "two in three". Margins: reference 0.333 above; handful 0.59 below;
~480 trees pass by ~0.10; ~275 trees fail by ~0.07.

## Other negatives' passing checks (the "fails exactly one" record)

- no-slope-filter: hilly as reference; rooted 1.0; planted 1.0.
- floating: hilly as reference; gentle 1.0; planted 1.0 (the check bins by XZ).
- flat-terrain: rooted 1.0; gentle 1.0; planted 1.0 (400 of 400 squares gentle).
- handful: hilly as reference; rooted 1.0; gentle 1.0.

All five graphs validate, cook, and are deterministic and partition-safe at
every seed.

## Revision 2 (final verification, 2026-09-15)

The final verifier found `terrain-hilly` measured on the axis-aligned bounding
box: the reference turned 30 deg about Y failed with "extent 273.2 x 273.2 m"
and "covers 53.6%", and the 0.9 cover bar was not in the brief. Also: gentle
used `< 30` against the brief's "steeper than 30"; the 5 x 5 square sampling
was not in the brief; `instancesOf` was unguarded (a device-resident trees
output threw and failed every check, `terrain-hilly` included); and a closed
terrain's underside double-counted projected area. Changes:

- Extent: convex hull of every vertex in XZ; narrowest width 150-250 m,
  widest <= 360 m.
- Holes: grid points (spacing narrowest / 150) inside the hull, >= 95% under a
  triangle.
- Upper surface: a triangle counts for relief and steep share only where it is
  the highest over its own centroid (`Surface.sample(...).triangle === t`), so
  a slab's underside and near-vertical walls drop out and exact duplicates
  count once.
- Boundary: gentle is `<= 30 + 1e-6`, steep is `> 30 + 1e-6`.
- Squares: world-aligned at multiples of 10 m, 19 of 25 points; all stated.
- Reads guarded: an unreadable terrain fails every check with the read error;
  unreadable trees fail the three tree checks with the read error while
  `terrain-hilly` is still measured (probed with a fake device-resident batch
  and a null geometry: no throw).

Re-scored after the change (all at seeds 20260915, 1, 2):

| graph | validates | cooks | det | part | solved | failing hard checks |
|---|---|---|---|---|---|---|
| reference | true | true | true | true | true | - |
| negatives/flat-terrain | true | true | true | true | false | terrain-hilly |
| negatives/floating | true | true | true | true | false | trees-on-surface |
| negatives/handful | true | true | true | true | false | gentle-ground-planted |
| negatives/no-slope-filter | true | true | true | true | false | trees-on-gentle-ground |
| verifier toh-rotated | true | true | true | true | true | - |
| verifier toh-30deg | true | true | true | true | true | - |
| verifier toh-lifted | true | true | true | true | true | - |
| alt-slab | true | true | true | true | true | - |
| alt-holed | true | true | true | true | false | terrain-hilly (cover 0.907) |
| alt-sparse-400 | true | true | true | true | false | gentle-ground-planted |
| alt-sparse-700 | true | true | true | true | true | - |
| alt-forest-terrain | true | true | true | true | false | terrain-hilly (steep 0.531) |

Every negative's measured values are identical to the first version.

## Tier

Corpus-adjacent: `graphs/examples-forest.json` (shipped in the package) is a
displaced hillside planted with a slope filter, and `place/plantable` /
`place/on-surface` package the scatter-plus-slope recipe. What the task adds is
a stated angle (which needs the 1 - cos conversion), a measured terrain band
(the forest's own terrain is too steep for it), and coverage.

## Budget

70 turns / 35 minutes. Smaller than riverbank's 90/45 (four outputs, a curve
and distance bands) but not by much: the agent must discover the graph format
blind, find the surface scatter and the slope scale, and — the expensive part —
MEASURE its terrain's steep share and height range (a per-triangle slope
statistic it has to compute itself), so it will likely write a probe against
the package or iterate on amount/frequency. The stair task, pure arithmetic, is budgeted 45/25.

## Revision 3 (delta verification, 2026-09-15)

Two findings:
- The checks allowed 1% unrooted and 5% steep trees while the brief said
  "every tree" and "no tree". Repro `verify-delta/a/graphs/toh-overlap-tiles`
  (two overlapping merged tiles) solved with 0.7% of trees up to 0.67 m under
  the higher tile.
- The brief said a closed terrain's walls are ignored, but an outward-leaning
  wall is the highest surface and counted. Repro `toh-frustum-out1.22` (80 m
  box whose base is 1.22x wider) failed `terrain-hilly` on steep share 0.506.

Decision by measurement: a 31-seed sweep (graph seed + seeds 1-30) of
`sweep.mjs` over the reference, my correct variants and every verifier
variant, reading the min fraction per graph:

| graph | min rooted | seeds rooted < 1 | min gentle | seeds gentle < 1 | hilly / planted |
|---|---|---|---|---|---|
| reference | 1 | 0 | 0.9997 | 1 (one tree) | pass / pass |
| alt-plantable-30deg | 1 | 0 | 1 | 0 | pass / pass |
| alt-sparse-1200 | 1 | 0 | 1 | 0 | pass / pass (min 0.860) |
| alt-slab | 1 | 0 | 1 | 0 | pass / pass |
| toh-rotated | 1 | 0 | 0.9997 | 1 | pass / pass |
| toh-30deg | 1 | 0 | 0.9997 | 1 | pass / pass |
| toh-lifted | 1 | 0 | 1 | 0 | pass / pass |
| toh-250, toh-250-rot30, toh-box, toh-disc, toh-frustum-in, toh-frustum-out, toh-frustum-out1.22, toh-L20, toh-pieces-merged, toh-rot45 | 1 | 0 | 1 | 0 | pass / pass |
| toh-vskirt | 1 | 0 | 0.9997 | 1 | pass / pass |
| toh-L100 (concave L) | 1 | 0 | 1 | 0 | FAIL (cover 0.856, stated) / pass |
| toh-overlap-tiles | 0.9892 | 31 | 0.9862 | 31 | pass / pass |

(`toh-pieces` does not deserialize — an input pin connected twice — so it was
skipped.)

- Rooted is now STRICT (every tree). No correct variant drops below 1.0 at
  any of 31 seeds; overlap-tiles (0.989-0.993) now fails `trees-on-surface`,
  which is what the brief's "every tree" means.
- Gentle is NOT made strict: the reference itself (filter at 29 deg) reads one
  steep tree at 1 of 31 seeds — a tree on a triangle seam, which the lib's
  highest-triangle pick attributes to the steeper neighbour — and so do three
  correct variants. The 95% allowance stays and the brief now states it: "at
  least 95 in every 100 trees", with the seam as the stated reason. Margins:
  reference min 0.9997 (0.05 above); no-slope-filter 0.71 (0.24 below).
- Walls: a triangle steeper than 75 deg is a wall (brief and `WALL_DEG = 75`).
  Walls are left out of the ground measures (outline, relief, steep share);
  the outline is now the hull of GROUND vertices only. A tree over a wall still
  reads that wall as its surface and counts as steep. Margins: the steepest
  reference ground triangle is 51.8 deg (23 deg below the wall angle), the
  steepest non-wall variant terrain 59.5 deg (toh-lifted); the frustum walls
  measure 82-86 deg. frustum-out1.22 now passes (steep 0.414: its
  noise-bumped wall triangles below 75 deg still count as steep ground, per
  the stated definition).

Re-scored after revision 3 (seeds 20260915, 1, 2):

| graph | validates | cooks | det | part | solved | failing hard checks |
|---|---|---|---|---|---|---|
| reference | true | true | true | true | true | - |
| negatives/flat-terrain | true | true | true | true | false | terrain-hilly |
| negatives/floating | true | true | true | true | false | trees-on-surface |
| negatives/handful | true | true | true | true | false | gentle-ground-planted |
| negatives/no-slope-filter | true | true | true | true | false | trees-on-gentle-ground |
| toh-overlap-tiles | true | true | true | true | false | trees-on-surface (rooted 0.9905-0.9929) |
| toh-frustum-out1.22 | true | true | true | true | true | - (steep 0.4143, 1965 wall triangles) |
| toh-rotated | true | true | true | true | true | - |
| alt-slab | true | true | true | true | true | - |
| alt-holed | true | true | true | true | false | terrain-hilly (cover 0.907) |
