# Species mix

A round grove stands on flat ground. It is planted with three kinds of tree,
oak, birch and pine, mixed through each other rather than grouped into separate
stands: walking through any part of the grove you meet all three, in roughly the
same proportions as everywhere else. Oak dominates, birch is common, pine is the
rare one.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare this output, with exactly this name:

- `grove` (instances): the trees, one instance per tree. Each tree's asset id
  names its kind, and the only asset ids allowed are exactly `oak`, `birch` and
  `pine`, all three of them.

Units are metres, and y is up. The grove is a circle of radius 50 m centred on
the origin, across the ground (x and z). A tree's instance origin is where its
trunk stands, and every tree stands inside that circle.

The numbers the grove has to meet:

- About 1500 trees: anywhere from 1300 to 1700 is fine.
- The trees fill the whole circle, not a smaller patch of it. At least 44% of
  the trees stand more than 35 m from the centre (51% of the circle's area lies
  out there). And cut the ground into 10 m squares with edges on multiples of
  10 m: every square that lies wholly inside the circle holds at least one tree.
- The mix is 60% oak, 30% birch and 10% pine. Each kind's share of the grove
  must be within 5 percentage points of its target.
- Mixed through each other: take every pair of trees standing within 5 m of
  each other. The percentage of those pairs that are the same kind may be at
  most 4 percentage points above what chance gives for the grove's own mix,
  which is the sum of each kind's squared share (46% for an exact 60/30/10 mix).
  A grove where a tree's kind has nothing to do with where it stands sits near
  0 points above chance; same-kind patches or halves sit far above it.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
