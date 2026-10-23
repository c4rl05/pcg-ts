# Eval report: estate-cal-B

Generated 2026-10-23T11:55:26.349Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 1/1 slots.

> n = 1 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | B | pooled |
|---|---|---|
| estate-division | 1/1 (21%–100%) | 1/1 |
| **all** | **1/1** 100% (21%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| B | 1 | 62.0 / 62.0 | 61.0 | 3.0 | 33% | 0.0 | 66765.0 | 13.7 | 100% / 100% / 100% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B | 1 | 62 [62–62] | 61 [61–61] | 13.7 [13.7–13.7] | 66765 [66765–66765] | 3 [3–3] | 33% | 0 [0–0] | 100% / 100% / 100% / 0% | – | 100% |

### turns per task (median)

| task | B |
|---|---|
| estate-division | 62/200 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## No gate

`estate-cal-B` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
