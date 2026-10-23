# Eval report: brick-ab-A-extra

Generated 2026-10-23T04:59:51.063Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 1/1 slots.

> n = 1 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| brick-house-seeded | 1/1 (21%–100%) | 1/1 |
| **all** | **1/1** 100% (21%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 139.0 / 139.0 | 138.0 | 11.0 | 9% | 0.0 | 195352.0 | 41.5 | 0% / 100% / 100% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 139 [139–139] | 138 [138–138] | 41.5 [41.5–41.5] | 195352 [195352–195352] | 11 [11–11] | 9% | 0 [0–0] | 0% / 100% / 100% / 0% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| brick-house-seeded | 139/200 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## No gate

`brick-ab-A-extra` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
