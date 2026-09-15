# Winding staircase

A staircase winds up around a vertical axis, the way a stair climbs a tower.
It has 24 steps that share out one full turn between them: each one is turned
15 degrees around the axis from the one below it, always the same way round,
and stands 0.2 m higher. So the top tread stops 15 degrees short of standing
over the bottom one; a 25th would stand directly above it. All of them sit
equally far out from the axis, and every tread is level, pointing straight out
from the axis like the spoke of a wheel.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare this output, with exactly this name:

- `steps` (instances): the 24 steps and nothing else, one instance per tread.
  Each instance's origin is the centre of its tread.

Units are metres, and Y is up. The conventions the staircase is measured by:

- The axis is vertical and passes through the world origin (x = 0, z = 0).
- The centre of every tread is 3 m from the axis.
- Each tread's local +X axis points straight out from the axis, away from it,
  seen from above, and its local +Y axis points straight up (so the tread is
  level: it does not tilt with the climb).
- Either turning direction is fine, as long as the whole flight keeps to one.
  The height of the lowest tread, and where around the axis the flight
  starts, are up to you.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
