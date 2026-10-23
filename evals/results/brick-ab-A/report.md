# Eval report: brick-ab-A

Generated 2026-10-23T04:59:50.892Z. Model `claude-sonnet-5`, Claude Code 2.1.307.
Progress: 4/4 slots.

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
| A | 3 | 64.3 / 65.0 | 62.7 | 3.0 | 0% | 0.0 | 157994.7 | 31.2 | 67% / 100% / 100% / 0% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 3 | 65 [35–93] | 63 [33–92] | 33.2 [26.1–34.3] | 169065 [133916–171003] | 3 [2–4] | 0% | 0 [0–0] | 67% / 100% / 100% / 0% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| brick-house-seeded | 65/200 |

report.json carries every metric per task, not just turns. Where a budget applies it is printed after the slash: that is the budget the run ACTUALLY had (a task's own `budgets` replace the campaign caps, and the campaign's `taskBudgets` replace those), which is the only number the figure can be read against.

Contaminated after retry (excluded from rates): r0.brick-house-seeded.A

## none (one arm of a two-campaign A/B; compared by hand): **STOP**

- gate arms not in the campaign: A-prime, stripped; configure gate.baselineArms, gate.strippedArm and gate.strippedRefArm
