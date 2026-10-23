# Eval report: brick-ab-B

Generated 2026-10-23T04:59:50.974Z. Model `claude-sonnet-5`, Claude Code 2.1.309.
Progress: 4/4 slots.

> n = 4 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | B | pooled |
|---|---|---|
| brick-house-seeded | 3/4 (30%–95%) | 3/4 |
| **all** | **3/4** 75% (30%–95%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| B | 4 | 73.8 / 78.0 | 72.8 | 3.5 | 7% | 0.0 | 128655.0 | 26.7 | 50% / 75% / 75% / 25% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B | 4 | 78 [1–89] | 77 [0–88] | 25.1 [0.0–28.1] | 118671 [49–123416] | 4 [0–4] | 7% | 0 [0–0] | 50% / 75% / 75% / 25% | – | 75% |

### turns per task (median)

| task | B |
|---|---|
| brick-house-seeded | 78/200 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

## none (one arm of a two-campaign A/B; compared by hand): **STOP**

- gate arms not in the campaign: , stripped; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm
