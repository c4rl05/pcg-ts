# spiral-stair — calibration

Measured 2026-09-15 against the installed 0.17.0 baseline, through
`evals/harness/score.mjs` (seeds 20260916, 1, 2) plus a direct cook for the
unrounded residuals. No graph here reads the seed, so every value is identical
at all three seeds; the table shows one column for that reason.

All graphs share one shape: a 24-point (or 25) line whose index drives
P = (r cos(i*s), i*rise, r sin(i*s)) and a yaw quaternion
rot = (0, -sin(i*s/2), 0, cos(i*s/2)) — yaw -i*s about +Y takes local +X to
(cos(i*s), 0, sin(i*s)), the outward direction — into an instance spawner. The
generator is `gen-stair.mjs` in the author's scratch directory.

## Graphs measured

| graph | change from the reference | role |
|---|---|---|
| reference | 24 steps, 15 deg, rise 0.2 m, radius 3 m, +X outward, level | reference |
| negatives/one-too-many | 25 steps (both ends of the turn occupied) | fails `step-count` |
| negatives/wobbling-radius | radius alternates 3.2 / 2.8 m (mean still 3.0) | fails `constant-radius` |
| negatives/tall-risers | rise 0.24 m | fails `fixed-rise` |
| negatives/closed-turn | 360/23 = 15.652 deg per step (last lands over the first) | fails `fixed-turn` |
| negatives/facing-travel | yaw +90 deg: +X along the travel direction | fails `treads-point-outward` |
| negatives/ramp-tilted | pitched 14 deg about local +X (tilted with the climb) | fails `treads-level` |
| alt-fencepost-rise | rise 4.8/23 = 0.2087 m | alternative |
| alt-inward | yaw +180 deg: +X points at the axis | alternative |
| alt-counterturn | -15 deg per step | alternative (must pass) |
| alt-tilt-3deg | pitched 3 deg | alternative |
| alt-radius-2p5 | radius 2.5 m | alternative |
| alt-yaw-5deg | yaw +5 deg | alternative |

## Measured values (identical at every seed)

| graph | count | mean r / spread m | worst rise error m | turn deg / worst error | outward worst deg | level worst deg | solved / failing |
|---|---|---|---|---|---|---|---|
| reference | 24 | 3.0 / 0 | 2.9e-7 | 15 / 2.5e-5 | 4.8e-6 | 0 | solved |
| one-too-many | 25 | 3.0 / 0 | ~0 | 15 / ~0 | ~0 | 0 | step-count |
| wobbling-radius | 24 | 3.0 / 0.4 | ~0 | 15 / ~0 | ~0 | 0 | constant-radius |
| tall-risers | 24 | 3.0 / 0 | 0.04 | 15 / ~0 | ~0 | 0 | fixed-rise |
| closed-turn | 24 | 3.0 / 0 | ~0 | 15.652 / 0.652 | ~0 | 0 | fixed-turn |
| facing-travel | 24 | 3.0 / 0 | ~0 | 15 / ~0 | 90 | 0 | treads-point-outward |
| ramp-tilted | 24 | 3.0 / 0 | ~0 | 15 / ~0 | ~0 | 14 | treads-level |
| alt-fencepost-rise | 24 | 3.0 / 0 | 0.0087 | 15 / ~0 | ~0 | 0 | fixed-rise |
| alt-inward | 24 | 3.0 / 0 | ~0 | 15 / ~0 | 180 | 0 | treads-point-outward |
| alt-counterturn | 24 | 3.0 / 0 | ~0 | -15 / ~0 | ~0 | 0 | solved |
| alt-tilt-3deg | 24 | 3.0 / 0 | ~0 | 15 / ~0 | ~0 | 3.0000x | treads-level (on the line) |
| alt-radius-2p5 | 24 | 2.5 / 0 | ~0 | 15 / ~0 | ~0 | 0 | constant-radius |
| alt-yaw-5deg | 24 | 3.0 / 0 | ~0 | 15 / ~0 | 5 | 0 | treads-point-outward |

("~0" = rounds to 0 at 4-5 decimals: float32 residue.)

## Thresholds and margins

- `step-count`: exactly 24. Reference 24; one-too-many 25.
- `constant-radius`: mean within 3 +/- 0.1 m AND max - min <= 0.05 m.
  Reference: radius error 1.7e-7, spread 0. Wobbling: spread 0.4 (8x the bar)
  with a mean of exactly 3.0, so it fails on the spread alone. radius 2.5 fails
  the mean by 0.4.
- `fixed-rise`: every consecutive gap (sorted by height) 0.2 +/- 0.005 m.
  Reference worst 2.9e-7. tall-risers 0.04 (8x). The tolerance is deliberately
  tighter than 0.0087 so the fencepost rise (a 4.8 m flight divided over 23
  gaps) fails — by 0.0037, the tightest margin in this task; that graph is an
  alternative, not a registered negative.
- `fixed-turn`: every consecutive turn (sorted by height, wrapped to
  (-180, 180]) 15 +/- 0.25 deg, all one sign. Reference worst 2.5e-5 deg.
  closed-turn 0.652 off (margin 0.40 beyond the bar) — the plausible fencepost
  of "24 treads spanning 360 degrees". Either direction passes (counterturn
  measured). The one-sign clause catches a flight that reverses; with the
  magnitude clause alone a zig-zag of +15/-15 would pass.
- `treads-point-outward`: local +X projected onto XZ within 3 deg of the
  outward radial. Reference 4.8e-6 deg. facing-travel 90, inward 180, a 5 deg
  yaw error fails by 2. Projected (not full 3D) so that a tread tilted about
  its own +X still reads as outward and fails only `treads-level`.
- `treads-level`: local +Y within 3 deg of world up. Reference 0.
  ramp-tilted 14 (the helix tangent at r = 3 m climbs 0.2 over 0.785 m of arc,
  about 14.3 deg — the "orient to the 3D tangent" mistake the corpus stair's
  description warns about). A 3 deg tilt sits on the line and fails on float
  rounding: tilts must stay clearly under 3 deg.

Both orientation checks read the instance's local axes from the transform's
normalized columns (`lib.instanceFrame`), so tread scale does not affect them.

## Brief wording pitfall

"Makes exactly one full turn" reads naturally as 360 degrees from bottom tread
to top, which is the closed-turn negative (360/23 per step). The brief now says
the 24 treads SHARE OUT one full turn and that the top one stops 15 degrees
short of standing over the bottom one, so the stated 15 degrees and the prose
cannot disagree. The verifier also solved a correct variant built differently
(clockwise, reversed point order, 40 deg start, lowest tread at 1 m, scaled
treads), so the checks do not depend on the reference's construction.

## Tier

Corpus-adjacent: `graphs/basics-spiral-stair.json`, shipped in the package,
computes a helix of treads from the point index with the same yaw quaternion
(its description derives the -angle sign). The task changes count, turn,
radius and rise and asks for bare instances rather than copied box geometry.
`reserve: true`: held back from the default run.

## Budget

45 turns / 25 minutes. One output, no measurement of noise, no seed
sensitivity: the work is finding the format, the index-driven position and the
quaternion convention, and the risks are the fencepost (24 vs 25, 360/24 vs
360/23) and the yaw sign. The corpus near-solution shortens discovery. Kept
below trees-on-hills (70/35), which needs a terrain measurement loop.
