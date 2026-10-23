# Eval report: estate-ab-A

Generated 2026-10-23T15:59:49.181Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 6/6 slots.

> n = 6 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| estate-division | 6/6 (61%–100%) | 6/6 |
| **all** | **6/6** 100% (61%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 6 | 79.7 / 75.0 | 78.3 | 3.0 | 0% | 0.0 | 86189.3 | 17.7 | 50% / 100% / 83% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 6 | 75 [65–93] | 74 [64–92] | 16.3 [15.7–19.4] | 79689 [75229–92528] | 4 [2–4] | 0% | 0 [0–0] | 50% / 100% / 83% / 0% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| estate-division | 75/115 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## none (one arm of a two-campaign A/B; pass rate primary; compared by hand): **STOP**

- gate arms not in the campaign: , stripped; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm
