# Eval report: brick-baseline-seeded

Generated 2026-10-22T21:57:04.661Z. Model `claude-sonnet-5`, Claude Code 2.1.307.
Progress: 3/3 slots.

> n = 3 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| brick-house-seeded | 3/3 (44%–100%) | 3/3 |
| **all** | **3/3** 100% (44%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 3 | 99.7 / 95.0 | 98.7 | 3.3 | 0% | 0.0 | 137061.7 | 27.6 | 33% / 100% / 33% / 100% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 3 | 95 [74–130] | 94 [73–129] | 28.6 [22.2–32.1] | 138334 [113433–159418] | 3 [2–5] | 0% | 0 [0–0] | 33% / 100% / 33% / 100% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| brick-house-seeded | 95/150 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## none (single-arm baseline): **STOP**

- gate arms not in the campaign: A-prime, stripped; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm
