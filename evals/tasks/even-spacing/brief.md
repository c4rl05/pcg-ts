# Even spacing

A square patch of flat, open ground is being marked out for planting. Put
markers across it so they are spread evenly: no two markers close together, no
clumps, and no big empty gaps.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare this output, with exactly this name:

- `markers` (instances): the markers.

Units are metres, and y is up. The ground is a square 100 m on a side, centred
on the origin and lying flat at y = 0, so it runs from -50 m to +50 m along both
x and z. Every marker stands on that ground and inside that square. A marker's
instance origin is its foot, the point where it meets the ground, so every
marker's origin has y = 0 and x and z between -50 and +50.

There should be about 400 markers: anywhere from 340 to 460 is fine. No two
markers may stand closer than 4 m to each other, measured across the ground.

No big empty gaps: cut the square into a 10 by 10 grid of 10 m squares (edges on
multiples of 10 m), and every one of those hundred squares holds at least one
marker.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
