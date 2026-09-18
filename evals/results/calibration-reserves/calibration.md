# Calibration: calibration-reserves

Generated 2026-09-18T10:04:32.971Z. Model `claude-sonnet-5`, arm `A`, one run per task.
Progress: 2/2 slots. No gate: one run per task decides nothing, it only says what a task costs.

| task | tier | solved | turns / budget | tool calls | wall min / budget | out tokens | validate | caps hit | contaminated |
|---|---|---|---|---|---|---|---|---|---|
| forest-clearing | held-out | yes | 33/120 | 32 | 8.5/60.0 | 39657 | 0 | – | – |
| spiral-stair | corpus-adjacent | yes | 28/45 | 27 | 1.7/25.0 | 9532 | 0 | – | – |
| **total** | | **2/2** | median 31 | | 10.2 | 49189 | | – | – |

Turns and wall minutes are shown over the budget that run ACTUALLY had. A task's own `budgets` replace the campaign caps, and a campaign's `taskBudgets` replace those again, so the campaign cap is often not the number a run was measured against — 83 is comfortable under 100 and truncated under 80, and the bare figure cannot tell you which.

A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.

