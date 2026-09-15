# Settlement roads

Settlements are spread over open, level country, and roads link them into one
network. Every road is a single straight stretch that runs from one settlement
to another. Roads never run over or into one another: two roads only ever touch
where they both end at the same settlement. Every settlement has at least one
road, and a traveller can get from any settlement to any other by road.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare these outputs, with exactly these names:

- `settlements` (geometry): one point per settlement, at the settlement's
  centre.
- `roads` (geometry): one path per road. Each road is a path of exactly two
  points: it starts on one settlement's point and ends on a different
  settlement's point (each end within 0.5 m of it).

Units are metres, and Y is up. The country is a square 400 m on a side, centred
on the origin, and level at height 0; every settlement stands inside it. There
are between 30 and 50 settlements, and no two of them are nearer each other than
25 m.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
