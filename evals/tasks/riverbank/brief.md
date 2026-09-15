# Riverbank

A river runs through open ground. Trees grow on the ground but thin out as they
approach the water, and the ones nearest the river are smaller. Driftwood lies
along the bank itself, following the river's course.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare these outputs, with exactly these names:

- `trees` (instances): the trees.
- `driftwood` (instances): the driftwood.
- `river` (geometry): the river's centre line, as a path running down the
  middle of the water.
- `ground` (geometry): the open ground.

Units are metres. The ground is roughly 150 m across, and the water is 4 m
wide, centred on the `river` line.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
