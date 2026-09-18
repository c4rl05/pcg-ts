# Eval report: calibration

Generated 2026-09-18T07:53:05.540Z. Model `claude-sonnet-5`, Claude Code 2.1.273.
Progress: 8/8 slots.

> n = 8 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | pooled |
|---|---|---|
| canopy-gaps | 1/1 (21%–100%) | 1/1 |
| cavern-lamps | 1/1 (21%–100%) | 1/1 |
| contour-vines | 1/1 (21%–100%) | 1/1 |
| crater-debris | 1/1 (21%–100%) | 1/1 |
| facade-windows | 1/1 (21%–100%) | 1/1 |
| quarry-terraces | 1/1 (21%–100%) | 1/1 |
| quay-cranes | 1/1 (21%–100%) | 1/1 |
| twin-quarters | 1/1 (21%–100%) | 1/1 |
| **all** | **8/8** 100% (68%–100%) | |

## Paired by task


## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 8 | 47.4 / 45.0 | 46.4 | 0.9 | 0% | 0.0 | 55492.1 | 10.2 | 100% / 88% / 38% / 88% | – |

## Effort per arm — median [p25–p75]

| arm | runs | turns | tool calls | wall min | out tokens | validate calls | validate fail rate | probe graphs | read llms / docs / skills / graphs | caps hit | graph produced |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 8 | 45 [31–56] | 44 [30–55] | 7.9 [5.4–11.3] | 43243 [32329–62090] | 1 [0–1] | 0% | 0 [0–0] | 100% / 88% / 38% / 88% | – | 100% |

### turns per task (median)

| task | A |
|---|---|
| canopy-gaps | 31 |
| cavern-lamps | 57 |
| contour-vines | 31 |
| crater-debris | 53 |
| facade-windows | 56 |
| quarry-terraces | 83 |
| quay-cranes | 37 |
| twin-quarters | 31 |

report.json carries every metric per task, not just turns.

## No gate

`calibration` is a calibration campaign: one arm, one run per task. It is measured, never gated — see calibration.md for the per-task table.
