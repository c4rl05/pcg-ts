# Eval report: estate-cal-A

Generated 2026-10-23T11:34:55.945Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 1/1 slots.

> n = 1 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| estate-division | 1/1 (21%–100%) | 1/1 |
| **all** | **1/1** 100% (21%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 74.0 / 74.0 | 73.0 | 3.0 | 33% | 0.0 | 81719.0 | 16.4 | 0% / 100% / 100% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 74 [74–74] | 73 [73–73] | 16.4 [16.4–16.4] | 81719 [81719–81719] | 3 [3–3] | 33% | 0 [0–0] | 0% / 100% / 100% / 0% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| estate-division | 74/200 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## No gate

`estate-cal-A` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
