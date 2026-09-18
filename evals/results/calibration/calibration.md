# Calibration: calibration

Generated 2026-09-18T07:53:05.540Z. Model `claude-sonnet-5`, arm `A`, one run per task.
Progress: 8/8 slots. No gate: one run per task decides nothing, it only says what a task costs.

| task | tier | solved | turns | tool calls | wall min | out tokens | validate | caps hit | contaminated |
|---|---|---|---|---|---|---|---|---|---|
| canopy-gaps | held-out | yes | 31 | 30 | 6.7 | 32406 | 1 | – | – |
| cavern-lamps | held-out | yes | 57 | 56 | 11.3 | 62090 | 0 | – | – |
| contour-vines | held-out | yes | 31 | 30 | 7.0 | 36321 | 1 | – | – |
| crater-debris | held-out | yes | 53 | 52 | 8.8 | 50165 | 2 | – | – |
| facade-windows | held-out | yes | 56 | 55 | 16.2 | 91838 | 0 | – | – |
| quarry-terraces | held-out | yes | 83 | 82 | 21.8 | 117991 | 2 | – | – |
| quay-cranes | held-out | yes | 37 | 36 | 5.4 | 32329 | 1 | – | – |
| twin-quarters | held-out | yes | 31 | 30 | 4.4 | 20797 | 0 | – | – |
| **total** | | **8/8** | median 45 | | 81.6 | 443937 | | – | – |

A task that solves in one run tells you it is not at the floor; it does NOT tell you it is not at the ceiling. Read turns and caps hit together with solved: a task solved in a handful of turns, with no validate call and no probe graph, is one the campaign will find saturated.

