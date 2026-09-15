# Riverbank

A river runs through open ground. Trees grow on the ground but thin out as they
approach the water, and the ones nearest the river are smaller. Driftwood lies
along the bank itself, following the river's course.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare these outputs, with exactly these names:

- `trees` (instances): the trees. Each instance's origin is the base of its
  trunk.
- `driftwood` (instances): the driftwood.
- `river` (geometry): the river's centre line, as an open path running down the
  middle of the water (one or more polylines, none of which ends within 2 m of
  where it started).
- `ground` (geometry): the open ground.

Units are metres, and Y is up. The ground is roughly 150 m across. Every
"metres from the river" below is measured on the ground plane, from the
`river` line itself. What the brief means, in numbers:

- The river runs through: within the ground's extent (its bounding rectangle
  seen from above, whether or not the ground continues under the water), the
  line spans at least 80% of the ground's width or depth.
- The water is the strip within 2 m of the line. No tree stands in it.
- Every tree stands on the ground: at least 99% of trees have their base
  within 0.5 m of the ground directly under them (of the ground's surface; for
  a ground delivered as bare points with no surface, of its nearest point).
- There are at least 100 trees, and they thin out by the water. Count trees per
  square metre, over ground that has a tree within 10 m of it (so bare edges
  nobody planted do not count). The ground 2 m to 12 m from the river line
  holds between 10% and 60% of the tree density of ground more than 30 m from
  it: clearly thinner, but not bare.
- The trees nearest the river are smaller: trees 2 m to 12 m from the line
  average at most 70% of the size of trees more than 30 m from it, where a
  tree's size is the mean of its instance scale along its three axes.
- Driftwood lies on the bank: at least 10 pieces, and at least 90% of them lie
  between 2 m and 8 m from the river line — out of the water, and close to it —
  with their origin within 0.5 m of the ground under them.
- Driftwood follows the river's course: take the parts of the river line that
  have ground within 4 m of them (the ground's surface, or anywhere inside its
  extent when the ground has no surface), joined end to end in order, and cut
  them into 10 equal stretches. Each piece of driftwood within 25 m of those
  parts belongs to the stretch nearest it; at least 8 of the 10 stretches must
  hold some.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
