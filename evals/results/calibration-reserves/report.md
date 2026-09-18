# Eval report: calibration-reserves

Generated 2026-09-18T10:04:32.971Z. Model `claude-sonnet-5`, Claude Code 2.1.273.
Progress: 2/2 slots.

> n = 2 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| forest-clearing | 1/1 (21%–100%) | 1/1 |
| spiral-stair | 1/1 (21%–100%) | 1/1 |
| **all** | **2/2** 100% (34%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 2 | 30.5 / 30.5 | 29.5 | 0.0 | n/a | 0.0 | 24594.5 | 5.1 | 100% / 100% / 0% / 100% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 2 | 31 [28–33] | 30 [27–32] | 5.1 [1.7–8.5] | 24595 [9532–39657] | 0 [0–0] | n/a | 0 [0–0] | 100% / 100% / 0% / 100% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| forest-clearing | 33/120 |
| spiral-stair | 28/45 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## No gate

`calibration-reserves` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
