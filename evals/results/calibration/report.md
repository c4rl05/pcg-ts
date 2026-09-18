# Eval report: calibration

Generated 2026-09-18T10:49:57.418Z. Model `claude-sonnet-5`, Claude Code 2.1.273.
Progress: 8/8 slots.


## Reclassified

**These records were RE-DERIVED from their transcripts on 2026-09-18T10:49:57.367Z**, against harness commit `e3d644e`, adapter sha256 `1b87e89193fe`. They are therefore NOT what the run log recorded at the time: 10 of 10 records changed and 2 contamination verdict(s) moved. Only what the classifier derives from a transcript was rewritten (contaminated, outsideContaminating, outsideBenign, outsideWrites, readCounts, readPaths, listedPaths, networkAttempts, solved); score, final, wallMs, turns, toolCalls, usage, capsHit are the scorer's and the runner's output and are untouched.

| slot | attempt | before | after | paths that no longer count |
|---|---|---|---|---|
| r0.twin-quarters.A | 1 | contaminated | clean | `C:\Users\c4rl05` |
| r0.cavern-lamps.A | 1 | contaminated | clean | `C:\Users\c4rl05` |

Both calibration discards were classifier artifacts: awk's match operator read as the home directory.

**Which attempt counts has NOT changed.** The campaign's rule is latest-wins and it stays that way: choosing a selection rule once the outcome is visible is choosing the answer. 2 slot(s) now have an earlier attempt that is clean, listed here so the alternative is visible rather than applied. Every turns figure elsewhere in this report is the COUNTING attempt's.

| slot | arm | counting attempt | its turns | superseded attempt | its turns |
|---|---|---|---|---|---|
| r0.twin-quarters.A | A | a2 (counts) | 31 | a1 | 23 |
| r0.cavern-lamps.A | A | a2 (counts) | 57 | a1 | 41 |

### Selection rule: latest-wins (in force) vs first-clean-attempt (counterfactual)

| figure (turns) | latest-wins | first-clean |
|---|---|---|
| A solved | 8/8 | 8/8 |
| A median | 45 | 39 |
| **A/A gap** | **n/a** | **n/a** |
| stripped vs A | n/a | n/a |

This campaign has no A/A pair, so there is no gap to compare; the turns median would differ under the other rule (A 45 vs 39).

> n = 8 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| canopy-gaps | 1/1 (21%–100%) | 1/1 |
| cavern-lamps | 1/1 (21%–100%) | 1/1 |
| contour-vines | 1/1 (21%–100%) | 1/1 |
| crater-debris | 1/1 (21%–100%) | 1/1 |
| facade-windows | 1/1 (21%–100%) | 1/1 |
| quarry-terraces | 1/1 (21%–100%) | 1/1 |
| quay-cranes | 1/1 (21%–100%) | 1/1 |
| twin-quarters | 1/1 (21%–100%) | 1/1 |
| **all** | **8/8** 100% (68%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 8 | 47.4 / 45.0 | 46.4 | 0.9 | 0% | 0.0 | 55492.1 | 10.2 | 100% / 88% / 13% / 75% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 8 | 45 [31–56] | 44 [30–55] | 7.9 [5.4–11.3] | 43243 [32329–62090] | 1 [0–1] | 0% | 0 [0–0] | 100% / 88% / 13% / 75% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| canopy-gaps | 31/100 |
| cavern-lamps | 57/120 |
| contour-vines | 31/100 |
| crater-debris | 53/120 |
| facade-windows | 56/120 |
| quarry-terraces | 83/100 |
| quay-cranes | 37/100 |
| twin-quarters | 31/120 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## No gate

`calibration` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
