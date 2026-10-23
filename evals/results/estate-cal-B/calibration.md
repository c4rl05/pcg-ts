# Calibration: estate-cal-B

Generated 2026-10-23T11:55:26.349Z. Model `claude-sonnet-5`, arm `B`, one run per task.
Progress: 1/1 slots. No gate: one run per task decides nothing, it only says what a task costs.

| task | tier | solved | turns / budget | tool calls | wall min / budget | out tokens | validate | caps hit | contaminated |
|---|---|---|---|---|---|---|---|---|---|
| estate-division | held-out | yes | 62/200 | 61 | 13.7/100.0 | 66765 | 3 | – | – |
| **total** | | **1/1** | median 62 | | 13.7 | 66765 | | – | – |

Turns and wall minutes are shown over the budget that run ACTUALLY had. A task's own `budgets` replace the campaign caps, and a campaign's `taskBudgets` replace those again, so the campaign cap is often not the number a run was measured against — 83 is comfortable under 100 and truncated under 80, and the bare figure cannot tell you which.

A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.

