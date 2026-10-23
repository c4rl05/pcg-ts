# Calibration: brick-ab-A-extra

Generated 2026-10-23T04:59:51.063Z. Model `claude-sonnet-5`, arm `A`, one run per task.
Progress: 1/1 slots. No gate: one run per task decides nothing, it only says what a task costs.

| task | tier | solved | turns / budget | tool calls | wall min / budget | out tokens | validate | caps hit | contaminated |
|---|---|---|---|---|---|---|---|---|---|
| brick-house-seeded | held-out | yes | 139/200 | 138 | 41.5/100.0 | 195352 | 11 | – | – |
| **total** | | **1/1** | median 139 | | 41.5 | 195352 | | – | – |

Turns and wall minutes are shown over the budget that run ACTUALLY had. A task's own `budgets` replace the campaign caps, and a campaign's `taskBudgets` replace those again, so the campaign cap is often not the number a run was measured against — 83 is comfortable under 100 and truncated under 80, and the bare figure cannot tell you which.

A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.

**Headroom.** brick-house-seeded used 139 of 200 — under 50% spare. An arm that legitimately costs more would be truncated rather than measured, so raise the budget (campaign `taskBudgets`) before a comparison run.

