# Eval report: pilot

Generated 2026-09-18T10:49:51.627Z. Model `claude-sonnet-5`, Claude Code 2.1.272 (versions seen: 2.1.272, 2.1.273).
Progress: 54/54 slots.


## Reclassified

**These records were RE-DERIVED from their transcripts on 2026-09-18T10:49:51.563Z**, against harness commit `e3d644e`, adapter sha256 `1b87e89193fe`. They are therefore NOT what the run log recorded at the time: 58 of 58 records changed and 4 contamination verdict(s) moved. Only what the classifier derives from a transcript was rewritten (contaminated, outsideContaminating, outsideBenign, outsideWrites, readCounts, readPaths, listedPaths, networkAttempts, solved); score, final, wallMs, turns, toolCalls, usage, capsHit are the scorer's and the runner's output and are untouched.

| slot | attempt | before | after | paths that no longer count |
|---|---|---|---|---|
| r1.trees-on-hills.stripped | 1 | contaminated | clean | `msys:/` |
| r1.trees-on-hills.A | 1 | contaminated | clean | `C:\pcg-eval\sandboxes\node_modules\pcg-ts\graphs\examples-forest.json` |
| r2.trees-on-hills.stripped | 1 | contaminated | clean | `C:\pcg-eval\sandboxes\graph.json` |
| r2.even-spacing.A | 1 | contaminated | clean | `C:\Users\c4rl05\AppData\Local\Temp\out1.json` |

All four pilot discards were classifier artifacts: two cross-call cwd, one output-flag write, one a JS arrow read as a redirect.

**Which attempt counts has NOT changed.** The campaign's rule is latest-wins and it stays that way: choosing a selection rule once the outcome is visible is choosing the answer. 4 slot(s) now have an earlier attempt that is clean, listed here so the alternative is visible rather than applied. Every turns figure elsewhere in this report is the COUNTING attempt's.

| slot | arm | counting attempt | its turns | superseded attempt | its turns |
|---|---|---|---|---|---|
| r1.trees-on-hills.stripped | stripped | a2 (counts) | 70 | a1 | 38 |
| r1.trees-on-hills.A | A | a2 (counts) | 60 | a1 | 59 |
| r2.trees-on-hills.stripped | stripped | a2 (counts) | 68 | a1 | 52 |
| r2.even-spacing.A | A | a2 (counts) | 28 | a1 | 30 |

### Selection rule: latest-wins (in force) vs first-clean-attempt (counterfactual)

| figure (turns) | latest-wins | first-clean |
|---|---|---|
| A solved | 18/18 | 18/18 |
| A-prime solved | 18/18 | 18/18 |
| stripped solved | 18/18 | 18/18 |
| A median | 34 | 34 |
| A-prime median | 34 | 34 |
| stripped median | 33.5 | 33.5 |
| **A/A gap** | **4.4%** | **4.4%** |
| stripped vs A | 6.3% | 1.8% |

The A/A gap on turns — what the gate's effort limb is measured against — is the SAME under both rules, so the selection question does not touch the pre-registered thresholds.

> n = 18 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | A-prime | stripped | pooled |
|---|---|---|---|---|
| even-spacing | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| riverbank | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| road-props | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| settlement-roads | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| species-mix | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| trees-on-hills | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| **all** | **18/18** 100% (82%–100%) | **18/18** 100% (82%–100%) | **18/18** 100% (82%–100%) | |

## Paired by task

- **A-prime − A**: mean per-task delta 0.0 pts; better on 0, worse on 0, tied on 6 tasks (sign test p = 1.000)
- **stripped − A**: mean per-task delta 0.0 pts; better on 0, worse on 0, tied on 6 tasks (sign test p = 1.000)

## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 18 | 37.4 / 34.0 | 36.4 | 1.3 | 0% | 0.0 | 24577.9 | 4.8 | 94% / 56% / 6% / 83% | turns:1 |
| A-prime | 18 | 37.4 / 34.0 | 36.4 | 1.1 | 0% | 0.0 | 26321.6 | 5.4 | 94% / 78% / 6% / 83% | turns:1 |
| stripped | 18 | 38.6 / 33.5 | 37.6 | 1.7 | 3% | 0.0 | 23135.1 | 4.8 | 33% / 28% / 0% / 78% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 18 | 34 [28–46] | 33 [27–45] | 4.2 [3.2–5.0] | 22427 [16206–26726] | 1 [1–2] | 0% | 0 [0–0] | 94% / 56% / 6% / 83% | turns:1 | 100% |
| A-prime | 18 | 34 [29–48] | 33 [28–47] | 3.7 [3.3–6.8] | 21538 [18160–32168] | 1 [0–2] | 0% | 0 [0–0] | 94% / 78% / 6% / 83% | turns:1 | 100% |
| stripped | 18 | 34 [24–51] | 33 [23–50] | 3.5 [2.9–6.7] | 19426 [13038–32245] | 2 [1–2] | 3% | 0 [0–0] | 33% / 28% / 0% / 78% | – | 100% |

### turns per task (median)

| task | A | A-prime | stripped |
|---|---|---|---|
| even-spacing | 28/40 | 26/40 | 24/40 |
| riverbank | 27/90 | 29/90 | 34/90 |
| road-props | 33/90 | 41/90 | 51/90 |
| settlement-roads | 35/60 | 31/60 | 33/60 |
| species-mix | 36/50 | 32/50 | 23/50 |
| trees-on-hills | 60/70 | 50/70 | 68/70 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## Effort paired by task

> Effort is summarised as the MEDIAN over runs, not the mean: one run that hits its turn cap would otherwise move an arm on its own. Each comparison is PAIRED BY TASK — per task, the difference of the two arms' medians, and that difference as a fraction of the REFERENCE arm's median, since a task's turn count is set by the task. The stripped arm's reference is the tarball it was cut from, not the baseline: against a build from another commit, losing the docs and changing the library would be one effect. The aggregate is the mean of those per-task values, with a 95% percentile bootstrap over TASKS (2000 resamples, seeded per arm/reference/metric — so the same runs.jsonl always prints the same interval, and the metric rows are independent draws rather than one draw repeated) and an exact two-sided sign test on the per-task signs. The bootstrap treats the tasks as the sample: it answers 'would another set of tasks like these show the same difference', which is the question a campaign of a handful of tasks can ask. The A/A pair is the noise floor: whatever separates the same tarball under two labels is what run-to-run wobble looks like here, and an effect smaller than that is not an effect.

| arm | vs | metric | tasks | median Δ | mean Δ | Δ relative | 95% bootstrap (relative) | higher / lower / tied | sign p |
|---|---|---|---|---|---|---|---|---|---|
| A-prime | A | turns | 6 | -3.0 | -1.7 | -2% | -12% to 10% | 2 / 4 / 0 | 0.688 |
| A-prime | A | tool calls | 6 | -3.0 | -1.7 | -2% | -13% to 10% | 2 / 4 / 0 | 0.688 |
| A-prime | A | wall min | 6 | 0.0 | 0.2 | 10% | -7% to 28% | 3 / 3 / 0 | 1.000 |
| A-prime | A | out tokens | 6 | 1465.0 | 98.0 | 4% | -10% to 19% | 4 / 2 / 0 | 0.688 |
| A-prime | A | validate calls | 6 | 0.0 | -0.2 | -17% | -67% to 33% | 1 / 2 / 3 | 1.000 |
| A-prime | A | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 6 | 1.000 |
| stripped | A | turns | 6 | 2.5 | 2.3 | 6% | -17% to 30% | 3 / 3 / 0 | 1.000 |
| stripped | A | tool calls | 6 | 2.5 | 2.3 | 6% | -16% to 31% | 3 / 3 / 0 | 1.000 |
| stripped | A | wall min | 6 | -0.8 | -0.3 | -3% | -31% to 24% | 2 / 4 / 0 | 0.688 |
| stripped | A | out tokens | 6 | -3348.0 | -1554.5 | -5% | -26% to 19% | 2 / 4 / 0 | 0.688 |
| stripped | A | validate calls | 6 | 0.5 | 0.3 | 42% | -8% to 83% | 3 / 1 / 2 | 0.625 |
| stripped | A | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 6 | 1.000 |

"higher" means the arm spent MORE than the reference on that metric, which for effort is the arm doing worse. An interval spanning zero is a difference this campaign cannot tell from noise.

## Pilot gate: **STOP**

- (a) the stripped arm is worse than both baselines: FAIL
  - solved: FAIL — references A 100%, A-prime 100%, stripped 100%, A/A gap 0%, required margin 17%
- (b) A/A gap within 28%: pass — solved gap 0%
- (c) every task can discriminate on solved: FAIL — even-spacing, riverbank, road-props, settlement-roads, species-mix, trees-on-hills
  - worth replacing from the reserve (not all of these block): even-spacing (ceiling, 9/9), riverbank (ceiling, 9/9), road-props (ceiling, 9/9), settlement-roads (ceiling, 9/9), species-mix (ceiling, 9/9), trees-on-hills (ceiling, 9/9)
- (a) stripped arm 100.0% is not below both references (100.0%, 100.0%) by more than the A/A gap 0.0% and at least 17.0%: the eval may not see documentation
- (c) 6 of 6 task(s) at floor or ceiling on solved, replace from reserve: even-spacing, riverbank, road-props, settlement-roads, species-mix, trees-on-hills
- fix: make the stripped arm cost something — harder tasks (limb (c) names the saturated ones), or a stronger strip set — because the arms did not separate; replace the floor/ceiling task(s) from the reserve and re-run
- proposed replacement: drop even-spacing, riverbank, road-props, settlement-roads, species-mix, trees-on-hills; add forest-clearing, spiral-stair; 4 short of reserve tasks
