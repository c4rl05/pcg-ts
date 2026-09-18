# Calibration: calibration

Generated 2026-09-18T10:49:57.418Z. Model `claude-sonnet-5`, arm `A`, one run per task.
Progress: 8/8 slots. No gate: one run per task decides nothing, it only says what a task costs.

| task | tier | solved | turns / budget | tool calls | wall min / budget | out tokens | validate | caps hit | contaminated |
|---|---|---|---|---|---|---|---|---|---|
| canopy-gaps | held-out | yes | 31/100 | 30 | 6.7/50.0 | 32406 | 1 | – | – |
| cavern-lamps | held-out | yes | 57/120 | 56 | 11.3/60.0 | 62090 | 0 | – | – |
| contour-vines | held-out | yes | 31/100 | 30 | 7.0/50.0 | 36321 | 1 | – | – |
| crater-debris | held-out | yes | 53/120 | 52 | 8.8/60.0 | 50165 | 2 | – | – |
| facade-windows | held-out | yes | 56/120 | 55 | 16.2/60.0 | 91838 | 0 | – | – |
| quarry-terraces | held-out | yes | 83/100 | 82 | 21.8/50.0 | 117991 | 2 | – | – |
| quay-cranes | held-out | yes | 37/100 | 36 | 5.4/50.0 | 32329 | 1 | – | – |
| twin-quarters | held-out | yes | 31/120 | 30 | 4.4/60.0 | 20797 | 0 | – | – |
| **total** | | **8/8** | median 45 | | 81.6 | 443937 | | – | – |

Turns and wall minutes are shown over the budget that run ACTUALLY had. A task's own `budgets` replace the campaign caps, and a campaign's `taskBudgets` replace those again, so the campaign cap is often not the number a run was measured against — 83 is comfortable under 100 and truncated under 80, and the bare figure cannot tell you which.

A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.

**Headroom.** quarry-terraces used 83 of 100 — under 50% spare. An arm that legitimately costs more would be truncated rather than measured, so raise the budget (campaign `taskBudgets`) before a comparison run.

