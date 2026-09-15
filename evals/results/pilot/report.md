# Eval report: pilot

Generated 2026-09-15T22:24:01.210Z. Model `claude-sonnet-5`, Claude Code 2.1.272 (versions seen: 2.1.272, 2.1.273).
Progress: 54/54 slots.

> n = 18 runs per arm. A Wilson interval this wide detects only large effects; pass rates are not significance tests, and the gate is a go/stop rule, not a hypothesis test.

## Solved, per task and arm (Wilson 95%)

| task | A | A-prime | stripped | pooled |
|---|---|---|---|---|
| even-spacing | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| riverbank | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| road-props | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| settlement-roads | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| species-mix | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| trees-on-hills | 3/3 (44%–100%) | 3/3 (44%–100%) | 3/3 (44%–100%) | 9/9 |
| **all** | **18/18** 100% (82%–100%) | **18/18** 100% (82%–100%) | **18/18** 100% (82%–100%) | |

## Paired by task

- **A-prime − A**: mean per-task delta 0.0 pts; better on 0, worse on 0, tied on 6 tasks (sign test p = 1.000)
- **stripped − A**: mean per-task delta 0.0 pts; better on 0, worse on 0, tied on 6 tasks (sign test p = 1.000)

## Process metrics

| arm | runs | turns mean / median | tool calls | validate calls | validate fail rate | probe graphs | out tokens | wall min | read llms / docs / skills / graphs | caps hit |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 18 | 37.4 / 34.0 | 36.4 | 1.3 | 0% | 0.0 | 24577.9 | 4.8 | 94% / 78% / 11% / 83% | turns:1 |
| A-prime | 18 | 37.4 / 34.0 | 36.4 | 1.1 | 0% | 0.0 | 26321.6 | 5.4 | 94% / 89% / 17% / 89% | turns:1 |
| stripped | 18 | 38.6 / 33.5 | 37.6 | 1.7 | 3% | 0.0 | 23135.1 | 4.8 | 33% / 50% / 11% / 83% | – |

## Pilot gate: **STOP**

- (a) stripped below both baselines by more than the A/A gap: FAIL — baselines A 100%, A-prime 100%, stripped 100%, A/A gap 0%, required margin 17%
- (b) A/A gap within 28%: pass
- (c) no task at floor or ceiling: FAIL — replace even-spacing (ceiling, 9/9), riverbank (ceiling, 9/9), road-props (ceiling, 9/9), settlement-roads (ceiling, 9/9), species-mix (ceiling, 9/9), trees-on-hills (ceiling, 9/9)
- (a) stripped arm 100.0% is not below both baselines (100.0%, 100.0%) by more than the A/A gap 0.0% and at least 17.0%: the eval may not see documentation
- (c) task(s) at floor or ceiling across all arms, replace from reserve: even-spacing (ceiling), riverbank (ceiling), road-props (ceiling), settlement-roads (ceiling), species-mix (ceiling), trees-on-hills (ceiling)
- proposed replacement: drop even-spacing, riverbank, road-props, settlement-roads, species-mix, trees-on-hills; add forest-clearing, spiral-stair; 4 short of reserve tasks
