# Eval report: v2

Generated 2026-09-19T00:20:55.419Z. Model `claude-sonnet-5`, Claude Code 2.1.273 (versions seen: 2.1.273, 2.1.276, 2.1.277).
Progress: 96/96 slots.


## Reclassified

**These records were RE-DERIVED from their transcripts on 2026-09-19T00:20:55.316Z**, against harness commit `6f0b7cc` (dirty), adapter sha256 `dd54191d7448`. They are therefore NOT what the run log recorded at the time: 108 of 108 records changed and 10 contamination verdict(s) moved. Only what the classifier derives from a transcript was rewritten (contaminated, outsideContaminating, outsideBenign, outsideWrites, readCounts, readPaths, listedPaths, networkAttempts, solved); score, final, wallMs, turns, toolCalls, usage, capsHit are the scorer's and the runner's output and are untouched.

| slot | attempt | before | after | paths that no longer count |
|---|---|---|---|---|
| r1.twin-quarters.candidate-U1 | 1 | clean | contaminated | – |
| r1.quarry-terraces.A | 2 | contaminated | clean | `msys:/` |
| r1.canopy-gaps.stripped-all | 1 | contaminated | clean | `msys:/` |
| r1.contour-vines.candidate-U1 | 2 | clean | contaminated | – |
| r2.crater-debris.A | 1 | contaminated | clean | `msys:/` |
| r2.quarry-terraces.stripped-all | 1 | contaminated | clean | `msys:/` |
| r2.quarry-terraces.stripped-all | 2 | clean | contaminated | – |
| r2.quarry-terraces.candidate-U1 | 1 | contaminated | clean | `msys:/` |
| r2.quarry-terraces.A | 1 | contaminated | clean | `msys:/` |
| r2.quarry-terraces.A | 2 | contaminated | clean | `msys:/` |

The msys:/ cluster was one bug: a heredoc piped to node -/python3 - was scanned as shell, so a division and a regex literal read as filesystem roots. The two find / runs are real and stay contaminated.

**Which attempt counts has NOT changed.** The campaign's rule is latest-wins and it stays that way: choosing a selection rule once the outcome is visible is choosing the answer. 5 slot(s) now have an earlier attempt that is clean, listed here so the alternative is visible rather than applied. Every turns figure elsewhere in this report is the COUNTING attempt's.

| slot | arm | counting attempt | its turns | superseded attempt | its turns |
|---|---|---|---|---|---|
| r1.canopy-gaps.stripped-all | stripped-all | a2 (counts) | 24 | a1 | 31 |
| r2.crater-debris.A | A | a2 (counts) | 23 | a1 | 30 |
| r2.quarry-terraces.stripped-all | stripped-all | a2 (counts) | 47 | a1 | 39 |
| r2.quarry-terraces.candidate-U1 | candidate-U1 | a2 (counts) | 42 | a1 | 49 |
| r2.quarry-terraces.A | A | a2 (counts) | 42 | a1 | 39 |

### Selection rule: latest-wins (in force) vs first-clean-attempt (counterfactual)

| figure (turns) | latest-wins | first-clean |
|---|---|---|
| A solved | 23/24 | 23/24 |
| A-prime solved | 24/24 | 24/24 |
| candidate-U1 solved | 21/21 | 22/22 |
| stripped-all solved | 22/22 | 22/23 |
| A median | 30 | 30.5 |
| A-prime median | 30.5 | 30.5 |
| candidate-U1 median | 27 | 28 |
| stripped-all median | 23 | 31 |
| **A/A gap** | **2.9%** | **5.5%** |
| stripped-all vs candidate-U1 | -3.2% | -4.6% |

**The A/A gap on turns DIFFERS between the rules (2.9% vs 5.5%).** The pre-registered thresholds rest on it, so this needs a decision rather than a footnote.

> n = 24 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | A-prime | candidate-U1 | stripped-all | pooled |
|---|---|---|---|---|---|
| canopy-gaps | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 12/12 |
| cavern-lamps | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 12/12 |
| contour-vines | 3/3 (44%–100%) | 3/3 (44%–100%) | 2/2 (34%–100%) | 3/3 (44%–100%) | 11/11 |
| crater-debris | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 12/12 |
| facade-windows | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 2/2 (34%–100%) | 11/11 |
| quarry-terraces | 2/3 (21%–94%) | 3/3 (44%–100%) | 2/2 (34%–100%) | 2/2 (34%–100%) | 9/10 |
| quay-cranes | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 12/12 |
| twin-quarters | 3/3 (44%–100%) | 3/3 (44%–100%) | 2/2 (34%–100%) | 3/3 (44%–100%) | 11/11 |
| **all** | **23/24** 96% (80%–99%) | **24/24** 100% (86%–100%) | **21/21** 100% (85%–100%) | **22/22** 100% (85%–100%) | |

## Paired by task

- **A-prime − A**: mean per-task delta 4.2 pts; better on 1, worse on 0, tied on 7 tasks (sign test p = 1.000)
- **candidate-U1 − A**: mean per-task delta 4.2 pts; better on 1, worse on 0, tied on 7 tasks (sign test p = 1.000)
- **stripped-all − A**: mean per-task delta 4.2 pts; better on 1, worse on 0, tied on 7 tasks (sign test p = 1.000)
- **stripped-all − candidate-U1**: mean per-task delta 0.0 pts; better on 0, worse on 0, tied on 8 tasks (sign test p = 1.000)

## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 24 | 34.2 / 30.0 | 33.2 | 2.2 | 15% | 0.0 | 31033.5 | 7.0 | 79% / 54% / 17% / 58% | – |
| A-prime | 24 | 33.2 / 30.5 | 32.2 | 1.5 | 5% | 0.0 | 31785.0 | 6.7 | 79% / 58% / 0% / 42% | – |
| candidate-U1 | 21 | 33.0 / 27.0 | 31.9 | 2.3 | 10% | 0.0 | 32199.0 | 7.2 | 43% / 90% / 19% / 62% | – |
| stripped-all | 22 | 34.7 / 23.0 | 33.6 | 2.0 | 4% | 0.0 | 31243.2 | 6.8 | 18% / 5% / 0% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 24 | 30 [23–43] | 29 [22–42] | 5.7 [4.1–7.6] | 21715 [17771–37100] | 2 [1–3] | 15% | 0 [0–0] | 79% / 54% / 17% / 58% | – | 100% |
| A-prime | 24 | 31 [23–40] | 30 [22–39] | 6.1 [4.1–8.0] | 23386 [16626–38627] | 1 [1–2] | 5% | 0 [0–0] | 79% / 58% / 0% / 42% | – | 100% |
| candidate-U1 | 21 | 27 [24–41] | 26 [23–40] | 5.9 [3.5–7.5] | 21185 [17167–42876] | 2 [1–3] | 10% | 0 [0–0] | 43% / 90% / 19% / 62% | – | 100% |
| stripped-all | 22 | 23 [17–46] | 22 [16–45] | 5.2 [3.2–8.8] | 20629 [12878–41630] | 2 [1–3] | 4% | 0 [0–0] | 18% / 5% / 0% / 0% | – | 100% |

### turns per task (median)

| task | A | A-prime | candidate-U1 | stripped-all |
|---|---|---|---|---|
| canopy-gaps | 31/100 | 28/100 | 27/100 | 24/100 |
| cavern-lamps | 20/120 | 24/120 | 29/120 | 22/120 |
| contour-vines | 27/100 | 22/100 | 25/100 | 14/100 |
| crater-debris | 23/120 | 31/120 | 24/120 | 19/120 |
| facade-windows | 32/120 | 30/120 | 41/120 | 40/120 |
| quarry-terraces | 42/130 | 44/130 | 64/130 | 74/130 |
| quay-cranes | 29/100 | 29/100 | 24/100 | 17/100 |
| twin-quarters | 43/120 | 33/120 | 22/120 | 41/120 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## Effort paired by task

> Effort is summarised as the MEDIAN over runs, not the mean: one run that hits its turn cap would otherwise move an arm on its own. Each comparison is PAIRED BY TASK — per task, the difference of the two arms' medians, and that difference as a fraction of the REFERENCE arm's median, since a task's turn count is set by the task. The stripped arm's reference is the tarball it was cut from, not the baseline: against a build from another commit, losing the docs and changing the library would be one effect. The aggregate is the mean of those per-task values, with a 95% percentile bootstrap over TASKS (2000 resamples, seeded per arm/reference/metric — so the same runs.jsonl always prints the same interval, and the metric rows are independent draws rather than one draw repeated) and an exact two-sided sign test on the per-task signs. The bootstrap treats the tasks as the sample: it answers 'would another set of tasks like these show the same difference', which is the question a campaign of a handful of tasks can ask. The A/A pair is the noise floor: whatever separates the same tarball under two labels is what run-to-run wobble looks like here, and an effect smaller than that is not an effect.

| arm | vs | metric | tasks | median Δ | mean Δ | Δ relative | 95% bootstrap (relative) | higher / lower / tied | sign p |
|---|---|---|---|---|---|---|---|---|---|
| A-prime | A | turns | 8 | -1.0 | -0.8 | 0% | -12% to 14% | 3 / 4 / 1 | 1.000 |
| A-prime | A | tool calls | 8 | -1.0 | -0.8 | 0% | -12% to 14% | 3 / 4 / 1 | 1.000 |
| A-prime | A | wall min | 8 | -0.9 | -0.8 | -4% | -24% to 21% | 2 / 6 / 0 | 0.289 |
| A-prime | A | out tokens | 8 | 1496.0 | 1849.4 | 9% | 0% to 22% | 6 / 2 / 0 | 0.289 |
| A-prime | A | validate calls | 8 | -0.5 | -0.5 | 1% | -50% to 66% | 2 / 4 / 2 | 0.688 |
| A-prime | A | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 8 | 1.000 |
| candidate-U1 | A | turns | 8 | -0.5 | 1.1 | 5% | -18% to 27% | 4 / 4 / 0 | 1.000 |
| candidate-U1 | A | tool calls | 8 | -0.5 | 1.1 | 6% | -18% to 28% | 4 / 4 / 0 | 1.000 |
| candidate-U1 | A | wall min | 8 | 0.1 | 0.8 | 8% | -14% to 30% | 4 / 4 / 0 | 1.000 |
| candidate-U1 | A | out tokens | 8 | 2473.0 | 6515.6 | 20% | -7% to 55% | 5 / 3 / 0 | 0.727 |
| candidate-U1 | A | validate calls | 8 | -0.3 | 0.0 | 36% | -25% to 125% | 3 / 4 / 1 | 1.000 |
| candidate-U1 | A | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 8 | 1.000 |
| stripped-all | A | turns | 8 | -3.0 | 0.5 | -3% | -27% to 25% | 3 / 5 / 0 | 0.727 |
| stripped-all | A | tool calls | 8 | -3.0 | 0.5 | -3% | -27% to 26% | 3 / 5 / 0 | 0.727 |
| stripped-all | A | wall min | 8 | 0.2 | -0.5 | -11% | -32% to 8% | 4 / 4 / 0 | 1.000 |
| stripped-all | A | out tokens | 8 | -1342.5 | 2616.6 | 4% | -22% to 30% | 3 / 5 / 0 | 0.727 |
| stripped-all | A | validate calls | 8 | 0.0 | -0.2 | 20% | -29% to 84% | 2 / 3 / 3 | 1.000 |
| stripped-all | A | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 8 | 1.000 |
| stripped-all | candidate-U1 | turns | 8 | -4.0 | -0.6 | -3% | -25% to 27% | 2 / 6 / 0 | 0.289 |
| stripped-all | candidate-U1 | tool calls | 8 | -4.0 | -0.6 | -3% | -26% to 27% | 2 / 6 / 0 | 0.289 |
| stripped-all | candidate-U1 | wall min | 8 | -1.6 | -1.3 | -15% | -31% to 6% | 1 / 7 / 0 | 0.070 |
| stripped-all | candidate-U1 | out tokens | 8 | -4220.8 | -3898.9 | -12% | -27% to 5% | 2 / 6 / 0 | 0.289 |
| stripped-all | candidate-U1 | validate calls | 8 | 0.0 | -0.2 | 20% | -33% to 83% | 4 / 4 / 0 | 1.000 |
| stripped-all | candidate-U1 | probe graphs | 0 | 0.0 | 0.0 | n/a | n/a | 0 / 0 / 8 | 1.000 |

"higher" means the arm spent MORE than the reference on that metric, which for effort is the arm doing worse. An interval spanning zero is a difference this campaign cannot tell from noise.

Contaminated after retry (excluded from rates): r1.twin-quarters.candidate-U1, r1.contour-vines.candidate-U1, r2.quarry-terraces.stripped-all, r2.quarry-terraces.candidate-U1, r2.facade-windows.stripped-all

## v2 gate: **STOP**

- (a) the stripped-all arm is worse than its reference `candidate-U1` on solved rate OR on effort: FAIL
  - solved: FAIL — reference candidate-U1 100%, stripped-all 100%, A/A gap 4%, required margin 17%
  - effort (turns): FAIL — needs ≥ 25% more than its reference, above the A/A effort gap 3%, interval clear of zero
    - vs candidate-U1: -3% (95% -25% to 27%) over 8 tasks, higher on 2, lower on 6, sign p = 0.289 — margin short, above A/A no, interval spans zero
- (b) A/A gap within 28% on solved and 15% on effort: pass — solved gap 4%, effort gap 3%
- (c) every task can discriminate on solved: FAIL — canopy-gaps, cavern-lamps, contour-vines, crater-debris, facade-windows, quay-cranes, twin-quarters
  - worth replacing from the reserve (not all of these block): canopy-gaps (ceiling, 12/12), cavern-lamps (ceiling, 12/12), contour-vines (ceiling, 11/11), crater-debris (ceiling, 12/12), facade-windows (ceiling, 11/11), quay-cranes (ceiling, 12/12), twin-quarters (ceiling, 11/11)
- (a) stripped arm 100.0% is not below its reference candidate-U1 (100.0%) by more than the A/A gap 4.2% and at least 17.0%: the eval may not see documentation
- (a) nor does it cost more: turns paired by task is -3.2% vs candidate-U1 (95% -25.2%–27.3%), needing 25.0% and more than the A/A effort gap 2.9% with the interval clear of zero
- (c) 7 of 8 task(s) at floor or ceiling on solved, replace from reserve: canopy-gaps, cavern-lamps, contour-vines, crater-debris, facade-windows, quay-cranes, twin-quarters
- fix: make the stripped-all arm cost something — harder tasks (limb (c) names the saturated ones), or a stronger strip set — because neither solved rate nor effort separated it from the baselines; replace the floor/ceiling task(s) from the reserve and re-run
- proposed replacement: drop canopy-gaps, cavern-lamps, contour-vines, crater-debris, facade-windows, quay-cranes, twin-quarters; add forest-clearing, spiral-stair; 5 short of reserve tasks
