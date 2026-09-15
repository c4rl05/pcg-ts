# Eval report: pilot

Generated 2026-09-15T15:35:20.371Z. Model `claude-sonnet-5`, Claude Code 2.1.272.
Progress: 3/54 slots (INCOMPLETE).

> n = 1 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | A-prime | stripped | pooled |
|---|---|---|---|---|
| even-spacing | – | – | – | 0/0 |
| riverbank | – | – | – | 0/0 |
| road-props | – | – | – | 0/0 |
| settlement-roads | – | – | – | 0/0 |
| species-mix | – | – | – | 0/0 |
| trees-on-hills | 1/1 (21%–100%) | – | – | 1/1 |
| **all** | **1/1** 100% (21%–100%) | **0/0** n/a (0%–100%) | **0/0** n/a (0%–100%) | |

## Paired by task

- **A-prime − A**: mean per-task delta n/a; better on 0, worse on 0, tied on 0 tasks (sign test p = 1.000)
- **stripped − A**: mean per-task delta n/a; better on 0, worse on 0, tied on 0 tasks (sign test p = 1.000)

## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 50.0 / 50.0 | 49.0 | 0.0 | n/a | 0.0 | 48255.0 | 10.5 | 100% / 100% / 100% / 100% | – |
| A-prime | 0 | n/a / n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a / n/a / n/a / n/a | – |
| stripped | 0 | n/a / n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a / n/a / n/a / n/a | – |

Contaminated after retry (excluded from rates): r0.trees-on-hills.A-prime, r0.trees-on-hills.stripped

## Pilot gate: **PENDING**

- (a) stripped below both baselines by more than the A/A gap: FAIL — baselines A 100%, A-prime n/a, stripped n/a, A/A gap n/a, required margin 17%
- (b) A/A gap within 28%: FAIL
- (c) no task at floor or ceiling: FAIL — replace even-spacing (no-data, 0/0), riverbank (no-data, 0/0), road-props (no-data, 0/0), settlement-roads (no-data, 0/0), species-mix (no-data, 0/0), trees-on-hills (ceiling, 1/1)
- campaign incomplete: the gate is evaluated only on a finished campaign
- (a) stripped arm n/a is not below both baselines (100.0%, n/a) by more than the A/A gap n/a and at least 17.0%: the eval may not see documentation
- (b) A/A gap n/a exceeds gate.aaMaxGap 28.0%: noise swamps the comparison
- (c) task(s) at floor or ceiling across all arms, replace from reserve: even-spacing (no-data), riverbank (no-data), road-props (no-data), settlement-roads (no-data), species-mix (no-data), trees-on-hills (ceiling)
- proposed replacement: drop even-spacing, riverbank, road-props, settlement-roads, species-mix, trees-on-hills; add forest-clearing, spiral-stair; 4 short of reserve tasks
