# Eval report: estate-ab-B

Generated 2026-10-23T16:18:35.871Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 6/6 slots.

> n = 6 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | B | pooled |
|---|---|---|
| estate-division | 6/6 (61%–100%) | 6/6 |
| **all** | **6/6** 100% (61%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| B | 6 | 63.7 / 67.5 | 62.7 | 1.8 | 0% | 0.0 | 61218.0 | 12.7 | 83% / 100% / 100% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B | 6 | 68 [57–70] | 67 [56–69] | 12.9 [11.3–13.9] | 62492 [55073–65949] | 2 [2–2] | 0% | 0 [0–0] | 83% / 100% / 100% / 0% | – | 100% |

### turns per task (median)

| task | B |
|---|---|
| estate-division | 68/115 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## none (one arm of a two-campaign A/B; pass rate primary; compared by hand): **STOP**

- gate arms not in the campaign: , stripped; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm
